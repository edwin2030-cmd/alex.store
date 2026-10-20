-- ==============================================================================
-- ALEXSTORE: CREACIÓN DE USUARIOS EN SUPABASE AUTHENTICATION (DUEÑO Y CAJERO)
-- ==============================================================================
-- Este script configura la autenticación en Supabase para que el Dueño y el Cajero
-- tengan cada uno su propio correo y contraseña, vinculados a sus roles y permisos.
--
-- INSTRUCCIONES:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/_/sql
-- 2. Abre el "SQL Editor" -> "New Query"
-- 3. Copia y pega este script.
-- 4. Modifica los correos y contraseñas deseados en las secciones 2 y 3.
-- 5. Presiona "Run" (Ejecutar).
-- ==============================================================================

-- 1. EXTENSIÓN PARA ENCRIPTACIÓN DE CONTRASEÑAS (BCRYPT)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABLA DE PERFILES DE USUARIOS (POR SI AÚN NO EXISTE)
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
CREATE POLICY "Acceso total a perfiles_usuarios" ON public.perfiles_usuarios FOR ALL USING (true);

-- 3. TRIGGER AUTOMÁTICO: CUANDO CREAS UN USUARIO DESDE EL PANEL DE SUPABASE AUTHENTICATION
-- (Authentication -> Users -> Add User), SE VINCULA AUTOMÁTICAMENTE A SU PERFIL Y ROL
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
  -- Determinar rol desde metadata o según el correo
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

  -- Insertar o actualizar en perfiles_usuarios
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
-- 4. CREACIÓN DIRECTA DE LOS 2 USUARIOS EN AUTH.USERS (CORREOS Y CONTRASEÑAS)
-- ==============================================================================
-- Cambia aquí los correos y contraseñas que desees usar:
--
-- Usuario 1: DUEÑO (Acceso Total: Dashboard, Pedidos, Gastos, Ventas, Inventario, Clientes, etc.)
-- Correo: dueno@alexstore.com
-- Contraseña: DuenoPassword2025!
--
-- Usuario 2: CAJERO (Acceso Operativo: Solo Productos, Inventario, Pedidos, Clientes, Categorías)
-- Correo: cajero@alexstore.com
-- Contraseña: CajeroPassword2025!
-- ==============================================================================

DO $$
DECLARE
  v_dueno_id UUID;
  v_cajero_id UUID;
  
  -- >>> PUEDES PERSONALIZAR ESTOS DATOS AQUÍ <<<
  v_dueno_email TEXT := 'dueno@alexstore.com';
  v_dueno_password TEXT := 'DuenoPassword2025!';
  v_dueno_nombre TEXT := 'Alexander Dueño Principal';

  v_cajero_email TEXT := 'cajero@alexstore.com';
  v_cajero_password TEXT := 'CajeroPassword2025!';
  v_cajero_nombre TEXT := 'Carlos Cajero de Turno';
BEGIN

  -- ----------------------------------------------------------------------------
  -- A. CREAR O ACTUALIZAR USUARIO DUEÑO EN AUTH.USERS
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_dueno_id FROM auth.users WHERE email = v_dueno_email;
  
  IF v_dueno_id IS NULL THEN
    v_dueno_id := gen_random_uuid();
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
      created_at,
      updated_at
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
      now(),
      now()
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
      v_dueno_id,
      v_dueno_id,
      jsonb_build_object('sub', v_dueno_id, 'email', v_dueno_email),
      'email',
      v_dueno_email,
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Actualizar contraseña del dueño existente si ya estaba creado
    UPDATE auth.users
    SET encrypted_password = crypt(v_dueno_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('nombre', v_dueno_nombre, 'rol', 'dueno'),
        updated_at = now()
    WHERE id = v_dueno_id;
  END IF;

  -- Registrar o asegurar perfil del Dueño en public.perfiles_usuarios
  INSERT INTO public.perfiles_usuarios (id, email, nombre, rol, activo, creado_por)
  VALUES (v_dueno_id, v_dueno_email, v_dueno_nombre, 'dueno', true, 'Script SQL')
  ON CONFLICT (email) DO UPDATE SET
    id = v_dueno_id,
    nombre = EXCLUDED.nombre,
    rol = 'dueno',
    activo = true,
    actualizado_en = now();

  -- ----------------------------------------------------------------------------
  -- B. CREAR O ACTUALIZAR USUARIO CAJERO EN AUTH.USERS
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_cajero_id FROM auth.users WHERE email = v_cajero_email;
  
  IF v_cajero_id IS NULL THEN
    v_cajero_id := gen_random_uuid();
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
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_cajero_id,
      'authenticated',
      'authenticated',
      v_cajero_email,
      crypt(v_cajero_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('nombre', v_cajero_nombre, 'rol', 'cajero'),
      now(),
      now()
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
      v_cajero_id,
      v_cajero_id,
      jsonb_build_object('sub', v_cajero_id, 'email', v_cajero_email),
      'email',
      v_cajero_email,
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Actualizar contraseña del cajero existente si ya estaba creado
    UPDATE auth.users
    SET encrypted_password = crypt(v_cajero_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('nombre', v_cajero_nombre, 'rol', 'cajero'),
        updated_at = now()
    WHERE id = v_cajero_id;
  END IF;

  -- Registrar o asegurar perfil del Cajero en public.perfiles_usuarios
  INSERT INTO public.perfiles_usuarios (id, email, nombre, rol, activo, creado_por)
  VALUES (v_cajero_id, v_cajero_email, v_cajero_nombre, 'cajero', true, 'Script SQL')
  ON CONFLICT (email) DO UPDATE SET
    id = v_cajero_id,
    nombre = EXCLUDED.nombre,
    rol = 'cajero',
    activo = true,
    actualizado_en = now();

END $$;

-- 5. VERIFICACIÓN DE PERFILES CREADOS
SELECT 
  id, 
  email, 
  nombre, 
  rol, 
  activo, 
  creado_en 
FROM public.perfiles_usuarios 
ORDER BY creado_en DESC;
