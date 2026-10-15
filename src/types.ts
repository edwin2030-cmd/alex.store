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

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  categoria_id?: string | null;
  imagen_url?: string | null;
  imagenes?: string[];
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  stock?: number;
  stock_minimo?: number;
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
  tallaSeleccionada?: string;
}

export interface Pedido {
  id?: string;
  codigo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion?: string;
  metodo_pago: 'transferencia' | 'yappy' | 'efectivo';
  comprobante_url?: string;
  total: number;
  estado: 'pendiente' | 'aprobado' | 'entregado' | 'cancelado';
  items: Array<{
    id: string;
    nombre: string;
    precio: number;
    cantidad: number;
    talla?: string;
    imagen_url?: string;
  }>;
  notas?: string;
  creado_en?: string;
}

export interface Venta {
  id?: string;
  codigo: string;
  pedido_id?: string | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  metodo_pago: string;
  total: number;
  items: any[];
  tipo: 'web' | 'manual';
  notas?: string | null;
  creado_en?: string;
}
