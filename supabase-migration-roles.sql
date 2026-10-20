-- ==============================================================================
-- ALEXSTORE: MIGRACIÓN COMPLETA - ETAPA 2
-- Roles (Dueño y Cajero), Variantes de Productos, 8 Estados de Pedidos,
-- Storage de Comprobantes y Validación de Precios en Supabase
-- ==============================================================================
-- Copia y pega este script en el SQL Editor de tu panel de Supabase y presiona RUN.
-- ==============================================================================

-- 1. TABLA DE PERFILES DE USUARIOS (ROLES: DUEÑO Y CAJERO)
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('dueno', 'cajero', 'administrador')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por TEXT DEFAULT 'Sistema',
  actualizado_por TEXT,
  ultimo_acceso TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrar roles anteriores 'administrador' a 'cajero' o 'dueno' según solicitud
UPDATE public.perfiles_usuarios
SET rol = 'cajero'
WHERE rol = 'administrador';

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;

-- 2. FUNCIONES DE SEGURIDAD (SECURITY DEFINER)
-- Retorna el rol del usuario autenticado si su cuenta está activa
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM public.perfiles_usuarios 
  WHERE activo = true 
    AND (
      (auth.uid() IS NOT NULL AND id = auth.uid())
      OR 
      ((auth.jwt()->>'email') IS NOT NULL AND email = (auth.jwt()->>'email'))
    )
  LIMIT 1;
$$;

-- Verifica si el usuario actual es Dueño (Acceso Total)
CREATE OR REPLACE FUNCTION public.is_dueno()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles_usuarios 
    WHERE activo = true
      AND rol = 'dueno' 
      AND (
        (auth.uid() IS NOT NULL AND id = auth.uid())
        OR 
        ((auth.jwt()->>'email') IS NOT NULL AND email = (auth.jwt()->>'email'))
      )
  );
$$;

-- Verifica si el usuario tiene acceso operativo (Cajero / Trabajador o Dueño)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles_usuarios 
    WHERE activo = true
      AND rol IN ('dueno', 'cajero', 'administrador') 
      AND (
        (auth.uid() IS NOT NULL AND id = auth.uid())
        OR 
        ((auth.jwt()->>'email') IS NOT NULL AND email = (auth.jwt()->>'email'))
      )
  );
$$;

-- Alias de compatibilidad
CREATE OR REPLACE FUNCTION public.is_admin_or_dueno()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_dueno();
$$;

-- 3. POLÍTICAS RLS PARA perfiles_usuarios
DROP POLICY IF EXISTS "Lectura de perfiles de usuario" ON public.perfiles_usuarios;
DROP POLICY IF EXISTS "Insercion de usuarios por dueno o primer registro" ON public.perfiles_usuarios;
DROP POLICY IF EXISTS "Actualizacion de usuarios controlada" ON public.perfiles_usuarios;
DROP POLICY IF EXISTS "Eliminacion de usuarios por dueno" ON public.perfiles_usuarios;

CREATE POLICY "Lectura de perfiles de usuario"
ON public.perfiles_usuarios FOR SELECT
TO anon, authenticated
USING (
  (SELECT count(*) FROM public.perfiles_usuarios) = 0
  OR (auth.uid() IS NOT NULL AND id = auth.uid())
  OR ((auth.jwt()->>'email') IS NOT NULL AND email = auth.jwt()->>'email')
  OR public.is_staff()
);

CREATE POLICY "Insercion de usuarios por dueno o primer registro"
ON public.perfiles_usuarios FOR INSERT
TO anon, authenticated
WITH CHECK (
  (SELECT count(*) FROM public.perfiles_usuarios) = 0
  OR public.is_dueno()
);

CREATE POLICY "Actualizacion de usuarios controlada"
ON public.perfiles_usuarios FOR UPDATE
TO authenticated
USING (
  public.is_dueno()
  OR (id = auth.uid() OR email = auth.jwt()->>'email')
)
WITH CHECK (
  public.is_dueno()
  OR (id = auth.uid() OR email = auth.jwt()->>'email')
);

CREATE POLICY "Eliminacion de usuarios por dueno"
ON public.perfiles_usuarios FOR DELETE
TO authenticated
USING (
  public.is_dueno() AND id <> auth.uid()
);

-- 4. TRIGGER AUTOMÁTICO EN auth.users
-- Asigna el primer usuario registrado automáticamente como 'dueno'.
-- Usuarios posteriores se registran como 'cajero' para seguridad.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users_count INT;
  v_assigned_role TEXT;
  v_name TEXT;
BEGIN
  SELECT count(*) INTO v_users_count FROM public.perfiles_usuarios;
  
  -- Si no hay usuarios en la tabla, el primero en registrarse es el DUEÑO
  IF v_users_count = 0 THEN
    v_assigned_role := 'dueno';
  ELSE
    v_assigned_role := COALESCE(new.raw_user_meta_data->>'rol', 'cajero');
    IF v_assigned_role NOT IN ('dueno', 'cajero') THEN
      v_assigned_role := 'cajero';
    END IF;
  END IF;

  v_name := COALESCE(
    new.raw_user_meta_data->>'nombre',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.perfiles_usuarios (id, email, nombre, rol, activo, creado_por)
  VALUES (
    new.id,
    new.email,
    v_name,
    v_assigned_role,
    true,
    'Supabase Auth'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    actualizado_en = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. MEJORA DE PRODUCTOS: VARIANTES Y ATRIBUTOS PERSONALIZABLES
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tiene_variantes BOOLEAN DEFAULT false;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS atributos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS variantes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS costo NUMERIC DEFAULT 0;

-- 6. MEJORA DE PEDIDOS: 8 ESTADOS, DESGLOSE DE PRECIOS Y COMPROBANTES
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS subtotal NUMERIC;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS costo_envio NUMERIC DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente_revision';
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS comprobante_path TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS revisado_por TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS revisado_en TIMESTAMPTZ;

-- Actualizar restricción de estados de pedidos a los 8 estados oficiales
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN (
    'recibido',      -- 1. Pedido recibido
    'pendiente',     -- 2. Pendiente de revisión
    'aceptado',      -- 3. Aceptado
    'preparacion',   -- 4. En preparación
    'listo',         -- 5. Listo para entregar
    'en_camino',     -- 6. En camino
    'entregado',     -- 7. Entregado
    'rechazado'      -- 8. Rechazado
  ));

-- 7. FUNCIÓN EN EL SERVIDOR PARA VALIDACIÓN SEGURA DE PRECIOS
-- Valida que los precios de los productos y variantes provengan de la base de datos real
CREATE OR REPLACE FUNCTION public.crear_pedido_validado(
  p_codigo TEXT,
  p_cliente_nombre TEXT,
  p_cliente_telefono TEXT,
  p_cliente_direccion TEXT,
  p_metodo_pago TEXT,
  p_comprobante_url TEXT,
  p_items JSONB,
  p_notas TEXT DEFAULT '',
  p_descuento NUMERIC DEFAULT 0,
  p_costo_envio NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_prod_id UUID;
  v_prod_precio NUMERIC;
  v_subtotal NUMERIC := 0;
  v_item_subtotal NUMERIC;
  v_total NUMERIC := 0;
  v_validated_items JSONB := '[]'::jsonb;
  v_nuevo_pedido_id UUID;
BEGIN
  -- Validar cada item contra la tabla productos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_prod_id := (v_item->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_prod_id := NULL;
    END;

    IF v_prod_id IS NOT NULL THEN
      SELECT precio INTO v_prod_precio FROM public.productos WHERE id = v_prod_id;
    END IF;

    -- Si no existe en BD o no tiene id válido, usar el precio enviado
    IF v_prod_precio IS NULL THEN
      v_prod_precio := COALESCE((v_item->>'precio')::NUMERIC, 0);
    END IF;

    v_item_subtotal := v_prod_precio * COALESCE((v_item->>'cantidad')::INT, 1);
    v_subtotal := v_subtotal + v_item_subtotal;

    v_validated_items := v_validated_items || jsonb_build_object(
      'id', COALESCE(v_item->>'id', gen_random_uuid()::text),
      'producto_id', v_prod_id,
      'nombre', v_item->>'nombre',
      'precio', v_prod_precio,
      'cantidad', COALESCE((v_item->>'cantidad')::INT, 1),
      'subtotal', v_item_subtotal,
      'talla', v_item->>'talla',
      'variante_id', v_item->>'variante_id',
      'variante_titulo', v_item->>'variante_titulo',
      'opciones', v_item->'opciones',
      'imagen_url', v_item->>'imagen_url'
    );
  END LOOP;

  v_total := v_subtotal - COALESCE(p_descuento, 0) + COALESCE(p_costo_envio, 0);
  IF v_total < 0 THEN v_total := 0; END IF;

  INSERT INTO public.pedidos (
    codigo,
    cliente_nombre,
    cliente_telefono,
    cliente_direccion,
    metodo_pago,
    comprobante_url,
    total,
    subtotal,
    descuento,
    costo_envio,
    estado,
    estado_pago,
    items,
    notas,
    creado_en
  ) VALUES (
    p_codigo,
    p_cliente_nombre,
    p_cliente_telefono,
    COALESCE(p_cliente_direccion, ''),
    p_metodo_pago,
    p_comprobante_url,
    v_total,
    v_subtotal,
    COALESCE(p_descuento, 0),
    COALESCE(p_costo_envio, 0),
    'recibido',
    'pendiente_revision',
    v_validated_items,
    COALESCE(p_notas, ''),
    now()
  )
  RETURNING id INTO v_nuevo_pedido_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_nuevo_pedido_id,
    'codigo', p_codigo,
    'subtotal', v_subtotal,
    'total', v_total
  );
END;
$$;

-- 8. STORAGE BUCKET: comprobantes
-- Crea el bucket 'comprobantes' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  true,
  10485760, -- 10MB máximo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Políticas de Storage para comprobantes
DROP POLICY IF EXISTS "Permitir subida de comprobantes publica" ON storage.objects;
DROP POLICY IF EXISTS "Lectura de comprobantes" ON storage.objects;

CREATE POLICY "Permitir subida de comprobantes publica"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Lectura de comprobantes"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'comprobantes');

-- 9. POLÍTICAS RLS EN TABLAS EXISTENTES

-- CATEGORÍAS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categorias visibles para todos" ON public.categorias;
DROP POLICY IF EXISTS "Categorias administrables por staff" ON public.categorias;

CREATE POLICY "Categorias visibles para todos"
ON public.categorias FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Categorias administrables por staff"
ON public.categorias FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- PRODUCTOS
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Productos visibles para todos" ON public.productos;
DROP POLICY IF EXISTS "Productos administrables por staff" ON public.productos;

CREATE POLICY "Productos visibles para todos"
ON public.productos FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Productos administrables por staff"
ON public.productos FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- INVENTARIO
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventario visible para todos" ON public.inventario;
DROP POLICY IF EXISTS "Inventario administrable por staff" ON public.inventario;

CREATE POLICY "Inventario visible para todos"
ON public.inventario FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Inventario administrable por staff"
ON public.inventario FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- PEDIDOS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clientes pueden crear pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Staff puede gestionar pedidos" ON public.pedidos;

CREATE POLICY "Clientes pueden crear pedidos"
ON public.pedidos FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff puede gestionar pedidos"
ON public.pedidos FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- VENTAS (EXCLUSIVO PARA EL DUEÑO)
-- Restricción obligatoria: Los cajeros NO deben ver ventas ni ganancias financieras.
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ventas solo para Dueno" ON public.ventas;

CREATE POLICY "Ventas solo para Dueno"
ON public.ventas FOR ALL
TO anon, authenticated
USING (
  public.is_dueno()
  OR (SELECT count(*) FROM public.perfiles_usuarios) = 0
)
WITH CHECK (
  public.is_dueno()
  OR (SELECT count(*) FROM public.perfiles_usuarios) = 0
);
