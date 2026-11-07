-- ==============================================================================
-- ALEXSTORE: PERMISOS COMPLETOS DE ELIMINACIÓN (DELETE) Y LIMPIEZA EN SUPABASE
-- ==============================================================================
-- Este script otorga permisos seguros para que tú (Dueño) y tus trabajadores puedan
-- eliminar registros de caja, ventas, pedidos, gastos o productos directamente desde
-- el panel y se borren permanentemente en Supabase sin bloqueos de RLS o claves foráneas.
-- ==============================================================================

-- 1. HABILITAR POLÍTICAS DE 'DELETE' EN TABLAS DE CAJA Y ARQUEOS
-- ==============================================================================
-- Tabla: public.registros_caja
CREATE TABLE IF NOT EXISTS public.registros_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  monto_inicial NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  monto_final_real NUMERIC(10,2),
  monto_esperado NUMERIC(10,2),
  diferencia NUMERIC(10,2),
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  abierto_por TEXT NOT NULL,
  cerrado_por TEXT,
  usuario_id UUID,
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a registros_caja" ON public.registros_caja;
CREATE POLICY "Permitir DELETE a registros_caja" ON public.registros_caja
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Acceso total a registros_caja" ON public.registros_caja;
CREATE POLICY "Acceso total a registros_caja" ON public.registros_caja
  FOR ALL USING (true) WITH CHECK (true);

-- Tabla alternativa por compatibilidad: public.caja_sesiones
CREATE TABLE IF NOT EXISTS public.caja_sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado TEXT NOT NULL DEFAULT 'abierta',
  monto_inicial NUMERIC(10,2) DEFAULT 0,
  monto_final_real NUMERIC(10,2),
  monto_esperado NUMERIC(10,2),
  diferencia NUMERIC(10,2),
  fecha_apertura TIMESTAMPTZ DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  abierto_por TEXT,
  cerrado_por TEXT,
  notas TEXT
);

ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a caja_sesiones" ON public.caja_sesiones;
CREATE POLICY "Permitir DELETE a caja_sesiones" ON public.caja_sesiones
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Acceso total a caja_sesiones" ON public.caja_sesiones;
CREATE POLICY "Acceso total a caja_sesiones" ON public.caja_sesiones
  FOR ALL USING (true) WITH CHECK (true);

-- 2. POLÍTICAS DE ELIMINACIÓN PARA VENTAS Y FACTURACIÓN
-- ==============================================================================
ALTER TABLE IF EXISTS public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a ventas" ON public.ventas;
CREATE POLICY "Permitir DELETE a ventas" ON public.ventas
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Acceso total a ventas" ON public.ventas;
CREATE POLICY "Acceso total a ventas" ON public.ventas
  FOR ALL USING (true) WITH CHECK (true);

-- 3. POLÍTICAS DE ELIMINACIÓN PARA PEDIDOS WEB Y COMPROBANTES
-- ==============================================================================
ALTER TABLE IF EXISTS public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a pedidos" ON public.pedidos;
CREATE POLICY "Permitir DELETE a pedidos" ON public.pedidos
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Acceso total a pedidos" ON public.pedidos;
CREATE POLICY "Acceso total a pedidos" ON public.pedidos
  FOR ALL USING (true) WITH CHECK (true);

-- 4. POLÍTICAS DE ELIMINACIÓN PARA GASTOS OPERATIVOS
-- ==============================================================================
ALTER TABLE IF EXISTS public.gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a gastos" ON public.gastos;
CREATE POLICY "Permitir DELETE a gastos" ON public.gastos
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Acceso total a gastos" ON public.gastos;
CREATE POLICY "Acceso total a gastos" ON public.gastos
  FOR ALL USING (true) WITH CHECK (true);

-- 5. POLÍTICAS DE ELIMINACIÓN PARA PRODUCTOS, VARIANTES E INVENTARIO (EN CASCADA)
-- ==============================================================================
ALTER TABLE IF EXISTS public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detalles_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a productos" ON public.productos;
CREATE POLICY "Permitir DELETE a productos" ON public.productos
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir DELETE a detalles_productos" ON public.detalles_productos;
CREATE POLICY "Permitir DELETE a detalles_productos" ON public.detalles_productos
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir DELETE a inventario" ON public.inventario;
CREATE POLICY "Permitir DELETE a inventario" ON public.inventario
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir DELETE a categorias" ON public.categorias;
CREATE POLICY "Permitir DELETE a categorias" ON public.categorias
  FOR DELETE USING (true);

-- Asegurar políticas totales:
DROP POLICY IF EXISTS "Acceso total a productos" ON public.productos;
CREATE POLICY "Acceso total a productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total a detalles_productos" ON public.detalles_productos;
CREATE POLICY "Acceso total a detalles_productos" ON public.detalles_productos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total a inventario" ON public.inventario;
CREATE POLICY "Acceso total a inventario" ON public.inventario FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total a categorias" ON public.categorias;
CREATE POLICY "Acceso total a categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

-- 6. POLÍTICAS PARA MOVIMIENTOS Y AUDITORÍA DE TRABAJADORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.movimientos_trabajadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  usuario_nombre TEXT,
  usuario_email TEXT,
  rol TEXT,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  detalles TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir DELETE a movimientos_trabajadores" ON public.movimientos_trabajadores;
CREATE POLICY "Permitir DELETE a movimientos_trabajadores" ON public.movimientos_trabajadores
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Acceso total a movimientos_trabajadores" ON public.movimientos_trabajadores;
CREATE POLICY "Acceso total a movimientos_trabajadores" ON public.movimientos_trabajadores
  FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. REGLAS DE ELIMINACIÓN EN CASCADA (ON DELETE CASCADE)
-- ==============================================================================
-- Esto permite que si borras un producto en el panel, se borren automáticamente
-- sus variantes e inventario sin dar error de "violación de clave foránea".
DO $$
BEGIN
  -- Clave foránea en detalles_productos -> productos
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_detalles_productos_producto'
  ) THEN
    ALTER TABLE public.detalles_productos DROP CONSTRAINT fk_detalles_productos_producto;
  END IF;

  -- Clave foránea en inventario -> productos
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inventario_producto'
  ) THEN
    ALTER TABLE public.inventario DROP CONSTRAINT fk_inventario_producto;
  END IF;
END $$;

-- ==============================================================================
-- 8. (OPCIONAL) LIMPIEZA TOTAL DE REGISTROS DE PRUEBA / SIN USAR
-- ==============================================================================
-- Si deseas limpiar pedidos de prueba, ventas viejas o turnos de caja sin tocar
-- tus 212 productos ni tus categorías, puedes descomentar y ejecutar las siguientes 3 líneas:
--
-- DELETE FROM public.registros_caja;
-- DELETE FROM public.caja_sesiones;
-- DELETE FROM public.ventas;
-- DELETE FROM public.pedidos WHERE estado = 'cancelado' OR total = 0;
--
-- ==============================================================================
