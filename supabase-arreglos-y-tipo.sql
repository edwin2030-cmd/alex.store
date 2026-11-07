-- ==============================================================================
-- SCRIPT OPCIONAL PARA SUPABASE: COLUMNA 'tipo' EN PRODUCTOS
-- ==============================================================================
-- NOTA IMPORTANTE:
-- NO ES OBLIGATORIO ejecutar este script. El sistema ya está programado con
-- respaldo y persistencia inteligente, por lo que puedes agregar y editar
-- productos y arreglos de inmediato sin errores.
--
-- Si deseas tener la columna nativa en tu tabla 'productos' en Supabase
-- para máxima prolijidad en tu base de datos, simplemente corre este comando:

ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'producto';

-- Comentario descriptivo en Supabase
COMMENT ON COLUMN productos.tipo IS 'Indica si es "producto" (catálogo con precio y venta directa) o "arreglo" (servicio/costura pedido por WhatsApp sin precio)';
