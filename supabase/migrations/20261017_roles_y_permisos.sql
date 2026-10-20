-- ==============================================================================
-- MIGRACIÓN OFICIAL: SISTEMA DE AUTENTICACIÓN, ROLES Y PERMISOS - ALEXSTORE
-- Compatible con: Supabase PostgreSQL, Supabase Auth y RLS
-- ==============================================================================

-- 1. Habilitar extensión pgcrypto para cifrado seguro de contraseñas
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Crear tabla pública de usuarios y roles
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('dueño', 'administrador', 'trabajador')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por TEXT,
    actualizado_por TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios(activo);

-- 3. Trigger para auto-confirmar emails en auth.users (evita error 'Email not confirmed')
CREATE OR REPLACE FUNCTION public.auto_confirmar_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_confirmar_usuario ON auth.users;
CREATE TRIGGER tr_auto_confirmar_usuario
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirmar_usuario();

-- Confirmar usuarios existentes pendientes
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 4. Sincronización automática de auth.users con public.usuarios
CREATE OR REPLACE FUNCTION public.sincronizar_auth_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    total_duenos INT;
    rol_asignado TEXT;
    nombre_asignado TEXT;
BEGIN
    -- Contar dueños existentes
    SELECT COUNT(*) INTO total_duenos FROM public.usuarios WHERE rol = 'dueño';

    -- Si no existe ningún dueño registrado en el sistema, el primero se convierte en dueño
    IF total_duenos = 0 THEN
        rol_asignado := 'dueño';
    ELSE
        -- Tomar rol de metadata si fue enviado, por defecto trabajador
        rol_asignado := COALESCE(NEW.raw_user_meta_data->>'rol', 'trabajador');
        -- Seguridad: impedir que un registro anónimo se auto-asigne dueño
        IF rol_asignado NOT IN ('administrador', 'trabajador') THEN
            rol_asignado := 'trabajador';
        END IF;
    END IF;

    nombre_asignado := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));

    INSERT INTO public.usuarios (id, email, nombre, rol, activo, creado_en, actualizado_en)
    VALUES (NEW.id, NEW.email, nombre_asignado, rol_asignado, TRUE, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), public.usuarios.nombre),
        actualizado_en = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sincronizar_auth_usuario ON auth.users;
CREATE TRIGGER tr_sincronizar_auth_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sincronizar_auth_usuario();

-- 5. Funciones auxiliares de verificación de roles
CREATE OR REPLACE FUNCTION public.obtener_rol_actual()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol FROM public.usuarios WHERE id = auth.uid() AND activo = TRUE LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.es_dueno()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol = 'dueño' AND activo = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.es_admin_o_dueno()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol IN ('dueño', 'administrador') AND activo = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.es_usuario_activo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND activo = TRUE
    );
$$;

-- 6. RPC para crear usuarios desde el panel con contraseña cifrada
CREATE OR REPLACE FUNCTION public.crear_usuario_panel(
    p_email TEXT,
    p_password TEXT,
    p_nombre TEXT,
    p_rol TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_rol TEXT;
    caller_email TEXT;
    new_user_id UUID;
    encrypted_pw TEXT;
    res JSONB;
BEGIN
    -- Validar rol del solicitante
    SELECT rol, email INTO caller_rol, caller_email
    FROM public.usuarios
    WHERE id = auth.uid() AND activo = TRUE;

    -- Si aún no hay ningún usuario en la tabla usuarios, permitir bootstrapping
    IF caller_rol IS NULL THEN
        IF (SELECT COUNT(*) FROM public.usuarios) > 0 THEN
            RAISE EXCEPTION 'No autorizado para crear usuarios';
        ELSE
            caller_rol := 'dueño';
            caller_email := 'bootstrap';
        END IF;
    END IF;

    -- Validar que el rol asignado sea válido
    IF p_rol NOT IN ('dueño', 'administrador', 'trabajador') THEN
        RAISE EXCEPTION 'Rol inválido: %', p_rol;
    END IF;

    -- Un administrador NO puede crear dueños ni auto-ascenderse
    IF caller_rol = 'administrador' AND p_rol = 'dueño' THEN
        RAISE EXCEPTION 'Los administradores no tienen permisos para crear cuentas de dueño';
    END IF;

    -- Verificar si el email ya existe en auth.users
    SELECT id INTO new_user_id FROM auth.users WHERE email = LOWER(TRIM(p_email));
    
    IF new_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe un usuario registrado con el correo %', p_email;
    END IF;

    new_user_id := gen_random_uuid();
    encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

    -- Insertar directamente en auth.users con email ya confirmado
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        LOWER(TRIM(p_email)),
        encrypted_pw,
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('nombre', p_nombre, 'rol', p_rol)::jsonb,
        NOW(),
        NOW()
    );

    -- Insertar en public.usuarios
    INSERT INTO public.usuarios (
        id,
        email,
        nombre,
        rol,
        activo,
        creado_por,
        creado_en,
        actualizado_en
    ) VALUES (
        new_user_id,
        LOWER(TRIM(p_email)),
        p_nombre,
        p_rol,
        TRUE,
        caller_email,
        NOW(),
        NOW()
    );

    SELECT to_jsonb(u.*) INTO res FROM public.usuarios u WHERE u.id = new_user_id;
    RETURN res;
END;
$$;

-- 7. Políticas de Seguridad RLS en la tabla 'usuarios'
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de usuarios según rol" ON public.usuarios;
CREATE POLICY "Lectura de usuarios según rol"
ON public.usuarios
FOR SELECT
USING (
    -- Dueño y administrador ven a todos los usuarios
    public.es_admin_o_dueno()
    OR
    -- El trabajador solo puede ver su propio registro
    id = auth.uid()
);

DROP POLICY IF EXISTS "Actualización de usuarios según rol" ON public.usuarios;
CREATE POLICY "Actualización de usuarios según rol"
ON public.usuarios
FOR UPDATE
USING (
    -- El dueño puede actualizar a cualquiera
    public.es_dueno()
    OR
    -- El administrador solo puede modificar a trabajadores (nunca a dueños)
    (public.es_admin_o_dueno() AND rol = 'trabajador')
);

DROP POLICY IF EXISTS "Eliminación de usuarios exclusiva de dueño" ON public.usuarios;
CREATE POLICY "Eliminación de usuarios exclusiva de dueño"
ON public.usuarios
FOR DELETE
USING (
    public.es_dueno() AND id != auth.uid()
);

-- 8. Políticas de Seguridad RLS en la tabla 'ventas' (Protección Financiera)
ALTER TABLE IF EXISTS public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ventas solo visibles para Dueño y Administrador" ON public.ventas;
CREATE POLICY "Ventas solo visibles para Dueño y Administrador"
ON public.ventas
FOR SELECT
USING (
    public.es_admin_o_dueno()
);

DROP POLICY IF EXISTS "Registro de ventas permitido para Dueño y Administrador" ON public.ventas;
CREATE POLICY "Registro de ventas permitido para Dueño y Administrador"
ON public.ventas
FOR INSERT
WITH CHECK (
    public.es_admin_o_dueno()
);

-- 9. Asegurar que la tienda pública y trabajadores sigan funcionando en productos, pedidos y categorías
ALTER TABLE IF EXISTS public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de productos" ON public.productos;
CREATE POLICY "Lectura pública de productos" ON public.productos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de productos por personal activo" ON public.productos;
CREATE POLICY "Gestión de productos por personal activo" ON public.productos
FOR ALL USING (public.es_usuario_activo());

ALTER TABLE IF EXISTS public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de categorias" ON public.categorias;
CREATE POLICY "Lectura pública de categorias" ON public.categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de categorias por personal activo" ON public.categorias;
CREATE POLICY "Gestión de categorias por personal activo" ON public.categorias
FOR ALL USING (public.es_usuario_activo());

ALTER TABLE IF EXISTS public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clientes pueden crear pedidos" ON public.pedidos;
CREATE POLICY "Clientes pueden crear pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Personal activo puede ver y gestionar pedidos" ON public.pedidos;
CREATE POLICY "Personal activo puede ver y gestionar pedidos" ON public.pedidos
FOR ALL USING (public.es_usuario_activo());

-- 10. Bootstrap inicial: Vincular usuario de prueba / admin actual como Dueño
INSERT INTO public.usuarios (id, email, nombre, rol, activo, creado_en, actualizado_en)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'nombre', 'Dueño AlexStore'),
    'dueño',
    TRUE,
    NOW(),
    NOW()
FROM auth.users
WHERE email ILIKE '%admin%' OR email ILIKE '%alex%'
ON CONFLICT (id) DO UPDATE
SET rol = 'dueño', activo = TRUE;
