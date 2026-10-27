export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  activa: boolean;
  activo?: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

// ==========================================
// VARIANTES Y OPCIONES DE PRODUCTO
// ==========================================
export interface AtributoOpcion {
  nombre: string; // Ej: "Talla", "Color", "Modelo", "Presentación"
  valores: string[]; // Ej: ["S", "M", "L", "XL"] o ["Negro", "Blanco"]
}

export interface VarianteProducto {
  id: string;
  sku?: string;
  titulo: string; // Ej: "Talla: M / Color: Negro"
  opciones: Record<string, string>; // Ej: { "Talla": "M", "Color": "Negro" }
  precio?: number; // Precio unitario si difiere del precio base
  stock: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  costo?: number;
  categoria_id?: string | null;
  imagen_url?: string | null;
  imagenes?: string[];
  activo: boolean;
  sku?: string;
  stock?: number;
  stock_minimo?: number;
  // Opciones directas: tallas y colores manuales
  tallas?: string[];
  colores?: string[];
  tallas_stock?: Record<string, number>;
  detalles_personalizados?: Record<string, any>;
  // Variantes personalizables
  tiene_variantes?: boolean;
  atributos?: AtributoOpcion[];
  variantes?: VarianteProducto[];
  creado_en?: string;
  actualizado_en?: string;
}

export interface DetallesProducto {
  id?: string;
  producto_id: string;
  tallas: string[];
  colores: string[];
  opciones_personalizadas?: Record<string, any>;
  actualizado_en?: string;
}

export interface InventarioItem {
  id: string;
  producto_id: string;
  cantidad: number;
  stock_minimo: number;
  actualizado_en?: string;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  // Soporte completo para variantes y opciones seleccionadas
  varianteSeleccionada?: VarianteProducto;
  opcionesSeleccionadas?: Record<string, string>;
  precioUnitario: number;
  // Talla y Color elegidos por el cliente
  tallaSeleccionada?: string;
  colorSeleccionado?: string;
}

// ==========================================
// ESTADOS DE PEDIDOS
// ==========================================
export type EstadoPedido =
  | 'recibido' // 1. Pedido recibido
  | 'pendiente' // 2. Pendiente de revisión
  | 'aceptado' // 3. Aceptado
  | 'aprobado' // 4. Aprobado
  | 'preparacion' // 5. En preparación
  | 'listo' // 6. Listo para entregar
  | 'en_camino' // 7. En camino
  | 'entregado' // 8. Entregado
  | 'cancelado' // 9. Cancelado
  | 'rechazado'; // 10. Rechazado

export interface PedidoItem {
  id: string;
  producto_id?: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal?: number;
  variante_id?: string;
  variante_titulo?: string;
  opciones?: Record<string, string>;
  talla?: string;
  color?: string;
  imagen_url?: string;
}

export interface Pedido {
  id?: string;
  codigo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion?: string;
  metodo_pago: 'transferencia' | 'yappy' | 'efectivo' | 'contra_entrega' | 'whatsapp' | string;
  comprobante_url?: string | null;
  comprobante_path?: string | null;
  total: number;
  subtotal?: number;
  descuento?: number;
  costo_envio?: number;
  estado: EstadoPedido;
  estado_pago?: 'pendiente_revision' | 'verificado' | 'rechazado';
  items: PedidoItem[];
  notas?: string | null;
  revisado_por?: string | null;
  revisado_en?: string | null;
  creado_en?: string;
  actualizado_en?: string;
}

export interface VentaManualItem {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  imagen_url?: string;
  talla?: string;
  color?: string;
  variante_titulo?: string;
}

export interface Venta {
  id?: string;
  codigo: string;
  pedido_id?: string | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  metodo_pago: 'efectivo' | 'yappy' | 'transferencia' | 'contra_entrega' | 'abono' | string;
  total: number;
  // Campos para control de abonos (pagos parciales) y contra entrega
  monto_abonado?: number;
  saldo_pendiente?: number;
  estado_pago?: 'completo' | 'abono_pendiente' | 'contra_entrega_pendiente';
  cajero_nombre?: string | null;
  registrado_por?: string | null;
  items: any[];
  tipo: 'web' | 'manual';
  notas?: string | null;
  creado_en?: string;
}

// ==========================================
// CONTROL DE APERTURA Y CIERRE DE CAJA
// ==========================================
export interface RegistroCaja {
  id: string;
  estado: 'abierta' | 'cerrada';
  monto_inicial: number;
  fecha_apertura: string;
  abierto_por: string;
  usuario_id?: string | null;
  monto_esperado?: number;
  monto_final_real?: number;
  diferencia?: number;
  fecha_cierre?: string | null;
  cerrado_por?: string | null;
  notas?: string | null;
  creado_en?: string;
}

export interface Gasto {
  id?: string;
  concepto: string;
  monto: number;
  categoria: string;
  fecha?: string;
  notas?: string | null;
  creado_por?: string | null;
  creado_en?: string;
}

// ==========================================
// ROLES Y PERMISOS DE USUARIOS
// Roles: 'dueno' (dueño con acceso total), 'administrador' (gestor operativo y financiero), 'cajero' (trabajador operativo)
// ==========================================
export type UserRole = 'dueno' | 'cajero' | 'administrador';
export type RolUsuario = UserRole;

export interface UsuarioPanel {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  activo: boolean;
  creado_en: string;
  actualizado_en?: string;
  creado_por?: string | null;
  actualizado_por?: string | null;
  ultimo_acceso?: string | null;
}

export interface ClienteResumen {
  nombre: string;
  telefono: string;
  direccion?: string;
  totalPedidos: number;
  totalGastado: number;
  ultimoPedidoFecha?: string;
}

// ==========================================
// REGISTRO DE MOVIMIENTOS Y AUDITORÍA DE TRABAJADORES
// ==========================================
export interface MovimientoTrabajador {
  id: string;
  usuario_id?: string | null;
  usuario_nombre: string;
  usuario_email: string;
  rol: UserRole | string;
  accion: string; // Ej: 'Inicio de Turno', 'Aprobó Pedido', 'Ajustó Stock', etc.
  modulo?: string | null; // 'auth', 'pedidos', 'inventario', 'productos', 'ventas', 'gastos'
  detalles?: string | null;
  ip_address?: string | null;
  creado_en: string;
}

