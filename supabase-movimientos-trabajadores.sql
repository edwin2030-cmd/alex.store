-- ==============================================================================
-- ALEXSTORE: CONFIGURACIÓN DE USUARIOS, AUDITORÍA Y RESOLUCIÓN DE ERRORES DE SUPABASE
-- ==============================================================================
-- Este script:
-- 1. Resuelve el error "Failed to delete user: Database error loading user" limpiando
--    registros corruptos de identities previas.
-- 2. Crea la función RPC segura "eliminar_usuario_sistema" para borrar usuarios sin errores.
-- 3. Te permite definir TU PROPIO correo y contraseña para Dueño y Trabajador.
-- 4. Crea la tabla de "movimientos_trabajadores" para registrar cada acción del personal.
--
-- INSTRUCCIONES:
-- 1. Entra a tu proyecto en https://supabase.com/dashboard/project/_/sql
-- 2. Abre el "SQL Editor" -> "New Query"
-- 3. Modifica los correos y contraseñas en la SECCIÓN 4 con los tuyos personales.
-- 4. Pega todo este código y haz clic en "Run".
-- ==============================================================================

-- 1. HABILITAR EXTENSIÓN PARA ENCRIPTACIÓN BCRYPT
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 2. TABLA DE PERFILES DE USUARIOS (ROLES Y PERMISOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('dueno', 'administrador', 'cajero')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por TEXT DEFAULT 'Sistema',
  actualizado_por TEXT,
  ultimo_acceso TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total a perfiles_usuarios" ON public.perfiles_usuarios;
CREATE POLICY "Acceso total a perfiles_usuarios" 
  ON public.perfiles_usuarios FOR ALL 
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- 3. FUNCIÓN RPC PARA ELIMINAR USUARIOS LIMPIAMENTE (SOLUCIÓN AL ERROR DE SUPABASE)
-- ==============================================================================
-- Esta función elimina en cascada identities, auth.users y perfiles sin dejar rastros
CREATE OR REPLACE FUNCTION public.eliminar_usuario_sistema(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.identities WHERE email = LOWER(TRIM(p_email));
  DELETE FROM auth.users WHERE email = LOWER(TRIM(p_email));
  DELETE FROM public.perfiles_usuarios WHERE email = LOWER(TRIM(p_email));
  RETURN jsonb_build_object('success', true, 'mensaje', 'Usuario eliminado correctamente de Authentication y perfiles');
END;
$$;

-- ==============================================================================
-- 4. CREA AQUÍ TUS PROPIOS USUARIOS (DUEÑO Y TRABAJADOR CON TU CONTRASEÑA)
-- ==============================================================================
-- >>> MODIFICA ESTAS VARIABLES CON TUS DATOS PERSONALES <<<
DO $$
DECLARE
  v_dueno_id UUID := gen_random_uuid();
  v_trabajador_id UUID := gen_random_uuid();

  -- ============================================================================
  -- 👑 DATOS DEL DUEÑO (Acceso Total):
  -- Cambia 'mi_correo_dueño@gmail.com' por tu correo real
  -- Cambia 'MiClaveSegura2025!' por la contraseña que quieras
  -- ============================================================================
  v_dueno_email      TEXT := 'admin@alexstore.com';      -- <-- PON AQUÍ TU CORREO DE DUEÑO
  v_dueno_password   TEXT := 'DuenoAlex2025!';          -- <-- PON AQUÍ TU CONTRASEÑA DE DUEÑO
  v_dueno_nombre     TEXT := 'Alexander Dueño';         -- <-- PON AQUÍ TU NOMBRE

  -- ============================================================================
  -- 💼 DATOS DEL TRABAJADOR (Pedidos, Inventario, Clientes, Productos):
  -- Cambia 'mi_correo_trabajador@gmail.com' por el correo del trabajador
  -- Cambia 'ClaveTrabajador2025!' por la contraseña para el trabajador
  -- ============================================================================
  v_trabajador_email    TEXT := 'trabajador@alexstore.com'; -- <-- PON AQUÍ EL CORREO DEL TRABAJADOR
  v_trabajador_password TEXT := 'Trabajador2025!';          -- <-- PON AQUÍ LA CONTRASEÑA DEL TRABAJADOR
  v_trabajador_nombre   TEXT := 'Personal de Turno';        -- <-- NOMBRE POR DEFECTO
  -- ============================================================================

BEGIN
  -- Limpieza previa para evitar colisiones o el error "Database error loading user"
  DELETE FROM auth.identities WHERE email = v_dueno_email OR email = v_trabajador_email;
  DELETE FROM auth.users WHERE email = v_dueno_email OR email = v_trabajador_email;
  DELETE FROM public.perfiles_usuarios WHERE email = v_dueno_email OR email = v_trabajador_email;

  -- 4.1 REGISTRAR DUEÑO EN AUTH.USERS
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_dueno_id,
    'authenticated',
    'authenticated',
    v_dueno_email,
    crypt(v_dueno_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('nombre', v_dueno_nombre, 'rol', 'dueno'),
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Identidad requerida por GoTrue (usando UUID propio para evitar el error de carga de usuario)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_dueno_id,
    jsonb_build_object('sub', v_dueno_id::text, 'email', v_dueno_email),
    'email',
    v_dueno_email,
    now(),
    now(),
    now()
  );

  INSERT INTO public.perfiles_usuarios (id, email, nombre, rol, activo, creado_por)
  VALUES (v_dueno_id, v_dueno_email, v_dueno_nombre, 'dueno', true, 'Script SQL');

  -- 4.2 REGISTRAR TRABAJADOR EN AUTH.USERS
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_trabajador_id,
    'authenticated',
    'authenticated',
    v_trabajador_email,
    crypt(v_trabajador_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('nombre', v_trabajador_nombre, 'rol', 'cajero'),
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_trabajador_id,
    jsonb_build_object('sub', v_trabajador_id::text, 'email', v_trabajador_email),
    'email',
    v_trabajador_email,
    now(),
    now(),
    now()
  );

  INSERT INTO public.perfiles_usuarios (id, email, nombre, rol, activo, creado_por)
  VALUES (v_trabajador_id, v_trabajador_email, v_trabajador_nombre, 'cajero', true, 'Script SQL');

END $$;

-- ==============================================================================
-- 5. TRIGGER AUTOMÁTICO: CUANDO CREAS UN USUARIO MANUAL EN EL DASHBOARD DE SUPABASE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol TEXT;
  v_nombre TEXT;
BEGIN
  v_rol := COALESCE(
    NEW.raw_user_meta_data->>'rol',
    CASE
      WHEN NEW.email ILIKE '%admin%' OR NEW.email ILIKE '%dueno%' OR NEW.email ILIKE '%alex%' THEN 'dueno'
      ELSE 'cajero'
    END
  );

  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.perfiles_usuarios (
    id,
    email,
    nombre,
    rol,
    activo,
    creado_por,
    actualizado_en
  )
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    v_nombre,
    v_rol,
    true,
    'Supabase Auth',
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    rol = CASE WHEN public.perfiles_usuarios.rol IS NULL THEN EXCLUDED.rol ELSE public.perfiles_usuarios.rol END,
    actualizado_en = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 6. TABLA DE REGISTRO DE MOVIMIENTOS Y AUDITORÍA DE TRABAJADORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.movimientos_trabajadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id TEXT,
  usuario_nombre TEXT NOT NULL,
  usuario_email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cajero',
  accion TEXT NOT NULL,
  modulo TEXT DEFAULT 'general',
  detalles TEXT,
  ip_address TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total a movimientos_trabajadores" ON public.movimientos_trabajadores;
CREATE POLICY "Acceso total a movimientos_trabajadores" 
  ON public.movimientos_trabajadores FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_email ON public.movimientos_trabajadores (usuario_email);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en ON public.movimientos_trabajadores (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_modulo ON public.movimientos_trabajadores (modulo);
CREATE INDEX IF NOT EXISTS idx_movimientos_rol ON public.movimientos_trabajadores (rol);

-- ==============================================================================
-- 7. CÓDIGO DE LIMPIEZA RÁPIDA (SI TIENES USUARIOS VIEJOS QUE QUIERES BORRAR)
-- ==============================================================================
-- Para eliminar cualquier usuario que te dé error de carga en el panel de Supabase:
-- SELECT public.eliminar_usuario_sistema('correo_que_quieres_eliminar@ejemplo.com');
