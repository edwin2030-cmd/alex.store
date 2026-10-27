import React, { useState } from 'react';
import { X, Copy, Check, Download, Shield, KeyRound, Database, ExternalLink } from 'lucide-react';

interface ModalSqlAuthProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalSqlAuth: React.FC<ModalSqlAuthProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const sqlCode = `-- ==============================================================================
-- ALEXSTORE: CREACIÓN DE USUARIOS EN SUPABASE AUTHENTICATION (DUEÑO Y CAJERO)
-- ==============================================================================
-- 1. EXTENSIÓN PARA ENCRIPTACIÓN DE CONTRASEÑAS (BCRYPT)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABLA DE PERFILES DE USUARIOS (ROLES: DUEÑO Y CAJERO)
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

-- 3. TRIGGER AUTOMÁTICO PARA NUEVOS USUARIOS DE AUTHENTICATION
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
-- 4. FUNCIÓN PARA ELIMINAR CUALQUIER USUARIO SIN ERRORES EN SUPABASE
-- ==============================================================================
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
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ==============================================================================
-- 5. CREACIÓN DE TUS USUARIOS EN AUTH.USERS (DUEÑO Y TRABAJADOR)
-- ==============================================================================
DO $$
DECLARE
  v_dueno_id UUID := gen_random_uuid();
  v_trabajador_id UUID := gen_random_uuid();
  
  -- >>> ESCRIBE AQUÍ TUS PROPIOS CORREOS Y CONTRASEÑAS <<<
  v_dueno_email         TEXT := 'admin@alexstore.com';      -- Pon tu correo de Dueño
  v_dueno_password      TEXT := 'DuenoAlex2025!';          -- Pon tu contraseña de Dueño
  v_dueno_nombre        TEXT := 'Alexander Dueño';

  v_trabajador_email    TEXT := 'trabajador@alexstore.com'; -- Pon el correo del Trabajador
  v_trabajador_password TEXT := 'Trabajador2025!';          -- Pon la contraseña del Trabajador
  v_trabajador_nombre   TEXT := 'Personal de Turno';
BEGIN

  -- Limpieza previa para prevenir el error "Database error loading user"
  DELETE FROM auth.identities WHERE email = v_dueno_email OR email = v_trabajador_email;
  DELETE FROM auth.users WHERE email = v_dueno_email OR email = v_trabajador_email;
  DELETE FROM public.perfiles_usuarios WHERE email = v_dueno_email OR email = v_trabajador_email;

  -- 1. REGISTRAR DUEÑO
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

  -- 2. REGISTRAR TRABAJADOR
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
-- 5. TABLA DE REGISTRO DE MOVIMIENTOS Y AUDITORÍA DE TRABAJADORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.movimientos_trabajadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id TEXT,
  usuario_nombre TEXT NOT NULL,
  usuario_email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cajero',
  accion TEXT NOT NULL,
  modulo TEXT,
  detalles TEXT,
  ip_address TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total a movimientos_trabajadores" ON public.movimientos_trabajadores;
CREATE POLICY "Acceso total a movimientos_trabajadores" ON public.movimientos_trabajadores FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_email ON public.movimientos_trabajadores (usuario_email);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en ON public.movimientos_trabajadores (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_modulo ON public.movimientos_trabajadores (modulo);

-- ==============================================================================
-- 6. TABLA DE GASTOS Y BALANCE FINANCIERO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'Mercancía e Inventario',
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas TEXT,
  creado_por TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a gastos" ON public.gastos;
CREATE POLICY "Acceso total a gastos" ON public.gastos FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos (fecha DESC);

-- ==============================================================================
-- 7. TABLA DETALLES DE PRODUCTOS (TALLAS, COLORES Y OPCIONES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.detalles_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id TEXT NOT NULL UNIQUE,
  tallas JSONB DEFAULT '[]'::jsonb,
  colores JSONB DEFAULT '[]'::jsonb,
  opciones_personalizadas JSONB DEFAULT '{}'::jsonb,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas tallas y colores directamente en la tabla productos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tallas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS colores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tallas_stock JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS variantes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS costo NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tiene_variantes BOOLEAN DEFAULT false;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS atributos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.detalles_productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a detalles_productos" ON public.detalles_productos;
CREATE POLICY "Acceso total a detalles_productos" ON public.detalles_productos FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 8. TABLA DE VENTAS Y FACTURACIÓN (WEB, MANUALES, ABONOS Y CONTRA ENTREGA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  pedido_id TEXT,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  monto_abonado NUMERIC(10,2) DEFAULT 0,
  saldo_pendiente NUMERIC(10,2) DEFAULT 0,
  estado_pago TEXT DEFAULT 'completo',
  items JSONB DEFAULT '[]'::jsonb,
  tipo TEXT NOT NULL DEFAULT 'manual',
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS monto_abonado NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'completo';

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a ventas" ON public.ventas;
CREATE POLICY "Acceso total a ventas" ON public.ventas FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ventas_creado_en ON public.ventas (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_tel ON public.ventas (cliente_telefono);

-- ==============================================================================
-- 8B. TABLA DE CONTROL DE APERTURAS Y CIERRES DE CAJA (CORTE DE TURNO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.registros_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  monto_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  abierto_por TEXT NOT NULL,
  usuario_id TEXT,
  monto_esperado NUMERIC(10,2) DEFAULT 0,
  monto_final_real NUMERIC(10,2) DEFAULT 0,
  diferencia NUMERIC(10,2) DEFAULT 0,
  fecha_cierre TIMESTAMPTZ,
  cerrado_por TEXT,
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a registros_caja" ON public.registros_caja;
CREATE POLICY "Acceso total a registros_caja" ON public.registros_caja FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_registros_caja_apertura ON public.registros_caja (fecha_apertura DESC);

-- ==============================================================================
-- 9. PERMISOS TOTALES DE ELIMINACIÓN REAL (DELETE) EN SUPABASE
-- ==============================================================================
-- Garantiza que al eliminar un gasto, pedido, venta o cliente, Supabase NO bloquee la eliminación por RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a pedidos" ON public.pedidos;
CREATE POLICY "Acceso total a pedidos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a productos" ON public.productos;
CREATE POLICY "Acceso total a productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a inventario" ON public.inventario;
CREATE POLICY "Acceso total a inventario" ON public.inventario FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a categorias" ON public.categorias;
CREATE POLICY "Acceso total a categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 10. TABLA USUARIOS Y CONSULTA DE ESPACIO EN DISCO (BASE DE DATOS Y STORAGE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cajero',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por TEXT DEFAULT 'Dueño',
  actualizado_por TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total a usuarios" ON public.usuarios;
CREATE POLICY "Acceso total a usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.usuarios TO anon, authenticated;

-- ==============================================================================
-- 11. BUCKETS DE STORAGE Y POLÍTICAS DE ELIMINACIÓN PERMANENTE
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('productos', 'productos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes', 'comprobantes', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Permitir subida storage" ON storage.objects;
CREATE POLICY "Permitir subida storage" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id IN ('productos', 'comprobantes'));

DROP POLICY IF EXISTS "Lectura publica storage" ON storage.objects;
CREATE POLICY "Lectura publica storage" ON storage.objects FOR SELECT TO public USING (bucket_id IN ('productos', 'comprobantes'));

DROP POLICY IF EXISTS "Permitir actualizar storage" ON storage.objects;
CREATE POLICY "Permitir actualizar storage" ON storage.objects FOR UPDATE TO public USING (bucket_id IN ('productos', 'comprobantes'));

DROP POLICY IF EXISTS "Permitir borrar permanente storage" ON storage.objects;
CREATE POLICY "Permitir borrar permanente storage" ON storage.objects FOR DELETE TO public USING (bucket_id IN ('productos', 'comprobantes'));
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlCode], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supabase-usuarios-auth.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 py-8">
        <div className="relative w-full max-w-3xl bg-[#141312] text-white rounded-3xl p-4 sm:p-8 shadow-2xl border border-[#2D2822] space-y-5 sm:space-y-6 my-auto animate-fade-in max-h-[92dvh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#26221E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C59A4D]/20 text-[#C59A4D] flex items-center justify-center border border-[#C59A4D]/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white font-heading">
                  SQL: Autenticación de Dueño y Cajero en Supabase
                </h3>
                <span className="text-xs text-[#A69F93]">
                  Crea usuarios en <code className="text-[#E6C687] font-mono">auth.users</code> con correo, contraseña y roles automáticos
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#26221E] text-[#8C8375] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-[#1C1A17] border border-[#2E2822] space-y-1.5">
              <span className="font-extrabold text-[#C59A4D] flex items-center gap-1.5">
                👑 1. USUARIO DUEÑO (ACCESO TOTAL)
              </span>
              <p className="text-[#A69F93] leading-relaxed">
                Tiene acceso a todo el panel: <strong>Dashboard con Ganancia Neta</strong>, <strong>Gastos</strong>, <strong>Ventas</strong>, <strong>Pedidos</strong>, <strong>Inventario</strong>, <strong>Clientes</strong>, <strong>Categorías</strong> y <strong>Usuarios</strong>.
              </p>
              <div className="text-[11px] font-mono bg-[#11100F] p-2 rounded-xl border border-[#26221E] text-[#E6C687]">
                dueno@alexstore.com / DuenoPassword2025!
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1C1A17] border border-[#2E2822] space-y-1.5">
              <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                💼 2. USUARIO CAJERO (OPERATIVO)
              </span>
              <p className="text-[#A69F93] leading-relaxed">
                Solo puede ver: <strong>Productos</strong>, <strong>Inventario</strong>, <strong>Pedidos</strong>, <strong>Clientes</strong> y <strong>Categorías</strong>. No tiene acceso a gastos ni al dashboard financiero.
              </p>
              <div className="text-[11px] font-mono bg-[#11100F] p-2 rounded-xl border border-[#26221E] text-emerald-300">
                cajero@alexstore.com / CajeroPassword2025!
              </div>
            </div>
          </div>

          {/* Code Viewer Container */}
          <div className="relative">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#A69F93] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#C59A4D]" />
                Script SQL para Supabase SQL Editor
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-[#26221E] hover:bg-[#322C27] text-white text-xs font-bold flex items-center gap-1.5 border border-[#3A332B] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .sql</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#C59A4D] hover:bg-[#D4A95B] text-black'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡COPIADO!' : 'COPIAR SQL'}</span>
                </button>
              </div>
            </div>

            <div className="relative bg-[#0D0C0B] rounded-2xl p-4 border border-[#26221E] max-h-72 overflow-y-auto font-mono text-[11px] text-[#D8D2C4] leading-relaxed select-all">
              <pre className="whitespace-pre">{sqlCode}</pre>
            </div>
          </div>

          {/* Pasos para ejecutar en Supabase */}
          <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#2D2822] space-y-2 text-xs">
            <span className="font-extrabold text-[#E6C687] block">
              ¿Cómo ejecutar este script en tu Supabase?
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[#A69F93] leading-relaxed">
              <li>Abre tu proyecto en <strong>Supabase</strong>.</li>
              <li>En el menú lateral izquierdo, haz clic en <strong>SQL Editor</strong>.</li>
              <li>Haz clic en <strong>New Query</strong>, pega este script y presiona <strong>Run</strong>.</li>
              <li>¡Listo! Ambos usuarios quedarán creados en <strong>Authentication</strong> y sincronizados con sus permisos en la tienda.</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-[#26221E] flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#26221E] hover:bg-[#322C27] text-white text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
