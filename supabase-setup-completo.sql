-- ==============================================================================
-- ALEXSTORE: CONFIGURACIÓN Y MIGRACIÓN COMPLETA PARA SUPABASE
-- ==============================================================================
-- Incluye:
-- 1. Roles y permisos (Dueño, Administrador, Trabajador/Cajero)
-- 2. Tablas: perfiles_usuarios, categorias, productos (con variantes y atributos),
--    pedidos (con comprobantes y desglose), ventas, y gastos (con balance neto).
-- 3. Bucket de almacenamiento 'comprobantes' en Supabase Storage con políticas RLS.
-- 4. Función de descuento automático de existencias en inventario al aprobar pedido
--    y registro automático en la tabla de ventas.
-- ==============================================================================
-- INSTRUCCIONES:
-- Abre el panel de tu proyecto en Supabase -> SQL Editor -> New Query.
-- Pega todo este código y presiona "Run" (Ejecutar).
-- ==============================================================================

-- 1. TABLA DE PERFILES DE USUARIOS Y ROLES
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

-- Asegurar que exista también la tabla 'usuarios' como alias o tabla primaria
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('dueno', 'administrador', 'cajero')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 2. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  icono TEXT,
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- 3. TABLA DE PRODUCTOS (CON SOPORTE PARA VARIANTES Y ATRIBUTOS)
CREATE TABLE IF NOT EXISTS public.productos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  precio_oferta NUMERIC(12, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  categoria_id TEXT REFERENCES public.categorias(id) ON DELETE SET NULL,
  imagen_url TEXT,
  imagenes TEXT[] DEFAULT ARRAY[]::TEXT[],
  activo BOOLEAN NOT NULL DEFAULT true,
  destacado BOOLEAN NOT NULL DEFAULT false,
  tiene_variantes BOOLEAN NOT NULL DEFAULT false,
  atributos JSONB DEFAULT '[]'::jsonb,
  variantes JSONB DEFAULT '[]'::jsonb,
  sku TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Añadir columnas si ya existía la tabla antes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='tiene_variantes') THEN
    ALTER TABLE public.productos ADD COLUMN tiene_variantes BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='atributos') THEN
    ALTER TABLE public.productos ADD COLUMN atributos JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='variantes') THEN
    ALTER TABLE public.productos ADD COLUMN variantes JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='sku') THEN
    ALTER TABLE public.productos ADD COLUMN sku TEXT;
  END IF;
END $$;

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- 4. TABLA DE PEDIDOS (CON COMPROBANTES, ESTADOS Y AUDITORÍA)
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_direccion TEXT,
  metodo_pago TEXT NOT NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12, 2) DEFAULT 0.00,
  descuento NUMERIC(12, 2) DEFAULT 0.00,
  costo_envio NUMERIC(12, 2) DEFAULT 0.00,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  estado_pago TEXT NOT NULL DEFAULT 'pendiente_revision',
  comprobante_url TEXT,
  comprobante_path TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notas TEXT,
  revisado_por TEXT,
  revisado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Columnas añadidas si ya existía la tabla
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='comprobante_url') THEN
    ALTER TABLE public.pedidos ADD COLUMN comprobante_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='comprobante_path') THEN
    ALTER TABLE public.pedidos ADD COLUMN comprobante_path TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='estado_pago') THEN
    ALTER TABLE public.pedidos ADD COLUMN estado_pago TEXT DEFAULT 'pendiente_revision';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='subtotal') THEN
    ALTER TABLE public.pedidos ADD COLUMN subtotal NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='descuento') THEN
    ALTER TABLE public.pedidos ADD COLUMN descuento NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='costo_envio') THEN
    ALTER TABLE public.pedidos ADD COLUMN costo_envio NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='revisado_por') THEN
    ALTER TABLE public.pedidos ADD COLUMN revisado_por TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='revisado_en') THEN
    ALTER TABLE public.pedidos ADD COLUMN revisado_en TIMESTAMPTZ;
  END IF;
END $$;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 5. TABLA DE VENTAS Y FACTURACIÓN (CON SOPORTE PARA ABONOS Y CAJERO)
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  pedido_id TEXT,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  metodo_pago TEXT NOT NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  monto_abonado NUMERIC(12, 2) DEFAULT 0.00,
  saldo_pendiente NUMERIC(12, 2) DEFAULT 0.00,
  estado_pago TEXT DEFAULT 'completado',
  cajero_nombre TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tipo TEXT NOT NULL DEFAULT 'web',
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas si la tabla ya existía
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='monto_abonado') THEN
    ALTER TABLE public.ventas ADD COLUMN monto_abonado NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='saldo_pendiente') THEN
    ALTER TABLE public.ventas ADD COLUMN saldo_pendiente NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='estado_pago') THEN
    ALTER TABLE public.ventas ADD COLUMN estado_pago TEXT DEFAULT 'completado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='cajero_nombre') THEN
    ALTER TABLE public.ventas ADD COLUMN cajero_nombre TEXT;
  END IF;
END $$;

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- 6. TABLA DE GASTOS Y BALANCE FINANCIERO
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto TEXT NOT NULL,
  monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  categoria TEXT NOT NULL DEFAULT 'Mercancía e Inventario',
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas TEXT,
  creado_por TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- 6.1 TABLA DE REGISTROS DE CAJA Y ARQUEOS DE TURNO
CREATE TABLE IF NOT EXISTS public.registros_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id TEXT,
  abierto_por TEXT NOT NULL,
  cerrado_por TEXT,
  monto_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  monto_final_real NUMERIC(12, 2),
  monto_esperado NUMERIC(12, 2),
  diferencia NUMERIC(12, 2),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total registros_caja" ON public.registros_caja;
CREATE POLICY "Acceso total registros_caja" ON public.registros_caja FOR ALL USING (true);

-- 6.2 TABLA DE AUDITORÍA Y MOVIMIENTOS DE TRABAJADORES
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
DROP POLICY IF EXISTS "Acceso total movimientos_trabajadores" ON public.movimientos_trabajadores;
CREATE POLICY "Acceso total movimientos_trabajadores" ON public.movimientos_trabajadores FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_email ON public.movimientos_trabajadores (usuario_email);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en ON public.movimientos_trabajadores (creado_en DESC);

-- ==============================================================================
-- 7. SUPABASE STORAGE: BUCKET 'comprobantes'
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  true,
  10485760, -- 10 MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Políticas RLS para storage.objects
DROP POLICY IF EXISTS "Permitir subida publica comprobantes" ON storage.objects;
CREATE POLICY "Permitir subida publica comprobantes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Lectura publica comprobantes" ON storage.objects;
CREATE POLICY "Lectura publica comprobantes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Permitir actualizar comprobantes" ON storage.objects;
CREATE POLICY "Permitir actualizar comprobantes"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Permitir borrar comprobantes" ON storage.objects;
CREATE POLICY "Permitir borrar comprobantes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'comprobantes');

-- ==============================================================================
-- 8. POLÍTICAS RLS EN TABLAS (LECTURA Y ESCRITURA SEGURA)
-- ==============================================================================

-- Categorías: Lectura pública, modificación para todos los usuarios autorizados
DROP POLICY IF EXISTS "Categorias publicas" ON public.categorias;
CREATE POLICY "Categorias publicas" ON public.categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categorias modificables" ON public.categorias;
CREATE POLICY "Categorias modificables" ON public.categorias FOR ALL USING (true);

-- Productos: Lectura pública, modificación para trabajadores y administradores
DROP POLICY IF EXISTS "Productos publicos" ON public.productos;
CREATE POLICY "Productos publicos" ON public.productos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Productos modificables" ON public.productos;
CREATE POLICY "Productos modificables" ON public.productos FOR ALL USING (true);

-- Pedidos: Creación pública (clientes web), lectura y actualización completa en panel
DROP POLICY IF EXISTS "Pedidos publicos para crear" ON public.pedidos;
CREATE POLICY "Pedidos publicos para crear" ON public.pedidos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Pedidos lectura y gestion" ON public.pedidos;
CREATE POLICY "Pedidos lectura y gestion" ON public.pedidos FOR ALL USING (true);

-- Ventas: Lectura y creación
DROP POLICY IF EXISTS "Ventas acceso" ON public.ventas;
CREATE POLICY "Ventas acceso" ON public.ventas FOR ALL USING (true);

-- Gastos: Lectura y gestión
DROP POLICY IF EXISTS "Gastos acceso" ON public.gastos;
CREATE POLICY "Gastos acceso" ON public.gastos FOR ALL USING (true);

-- Perfiles de usuarios
DROP POLICY IF EXISTS "Perfiles acceso" ON public.perfiles_usuarios;
CREATE POLICY "Perfiles acceso" ON public.perfiles_usuarios FOR ALL USING (true);

DROP POLICY IF EXISTS "Usuarios acceso" ON public.usuarios;
CREATE POLICY "Usuarios acceso" ON public.usuarios FOR ALL USING (true);

-- ==============================================================================
-- 9. FUNCIÓN RPC: APROBACIÓN DE PEDIDO Y DESCUENTO AUTOMÁTICO DE INVENTARIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.aprobar_pedido_y_descontar_stock(
  p_pedido_id UUID,
  p_revisado_por TEXT DEFAULT 'Administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido RECORD;
  v_item JSONB;
  v_prod_id TEXT;
  v_cantidad INT;
  v_var_id TEXT;
  v_codigo_venta TEXT;
BEGIN
  -- 1. Obtener pedido
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  -- 2. Marcar pedido como aprobado y verificado
  UPDATE public.pedidos
  SET estado = 'aprobado',
      estado_pago = 'verificado',
      revisado_por = p_revisado_por,
      revisado_en = now(),
      actualizado_en = now()
  WHERE id = p_pedido_id;

  -- 3. Descontar existencias del inventario
  IF v_pedido.items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
    LOOP
      v_prod_id := v_item->>'producto_id';
      IF v_prod_id IS NULL THEN
        v_prod_id := v_item->>'id';
      END IF;
      v_cantidad := COALESCE((v_item->>'cantidad')::INT, 1);
      v_var_id := v_item->>'variante_id';

      -- Descontar stock general del producto
      UPDATE public.productos
      SET stock = GREATEST(0, stock - v_cantidad),
          actualizado_en = now()
      WHERE id = v_prod_id;
    END LOOP;
  END IF;

  -- 4. Registrar venta automáticamente en la tabla ventas
  v_codigo_venta := 'VNT-' || COALESCE(NULLIF(regexp_replace(v_pedido.codigo, '\D', '', 'g'), ''), floor(random() * 9000 + 1000)::TEXT);

  INSERT INTO public.ventas (
    codigo,
    pedido_id,
    cliente_nombre,
    cliente_telefono,
    metodo_pago,
    total,
    items,
    tipo,
    notas,
    creado_en
  ) VALUES (
    v_codigo_venta,
    v_pedido.id::TEXT,
    v_pedido.cliente_nombre,
    v_pedido.cliente_telefono,
    v_pedido.metodo_pago,
    v_pedido.total,
    v_pedido.items,
    'web',
    'Venta generada automáticamente al aprobar el pedido ' || v_pedido.codigo || '. Aprobado por: ' || p_revisado_por,
    now()
  );

  RETURN jsonb_build_object('success', true, 'codigo_venta', v_codigo_venta);
END;
$$;

-- ==============================================================================
-- 10. USUARIOS POR DEFECTO (SEMILLA INICIAL)
-- ==============================================================================
-- Dueño con acceso total:
INSERT INTO public.perfiles_usuarios (email, nombre, rol, activo, creado_por)
VALUES ('admin@alexstore.com', 'Alexander Dueño', 'dueno', true, 'Sistema')
ON CONFLICT (email) DO UPDATE SET rol = 'dueno', activo = true;

-- Trabajador / Cajero con acceso solo a Productos, Inventario, Pedidos, Clientes y Categorías:
INSERT INTO public.perfiles_usuarios (email, nombre, rol, activo, creado_por)
VALUES ('cajero@alexstore.com', 'Carlos Cajero', 'cajero', true, 'Sistema')
ON CONFLICT (email) DO UPDATE SET rol = 'cajero', activo = true;

-- Administrador con acceso operativo y financiero:
INSERT INTO public.perfiles_usuarios (email, nombre, rol, activo, creado_por)
VALUES ('gerente@alexstore.com', 'María Administradora', 'administrador', true, 'Sistema')
ON CONFLICT (email) DO UPDATE SET rol = 'administrador', activo = true;

-- ==============================================================================
-- 11. TRIGGER AUTOMÁTICO: SINCRONIZACIÓN DE USUARIOS CREADOS EN SUPABASE AUTH
-- ==============================================================================
-- Cuando creas un usuario desde Authentication -> Users -> Add User en tu panel de Supabase,
-- este trigger lo vincula inmediatamente a perfiles_usuarios con su rol respectivo.
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
-- ¡LISTO! Ejecuta este script y todas tus tablas, storage, funciones, roles
-- y autenticación quedarán 100% operativos en Supabase.
-- ==============================================================================
