import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS_INICIALES } from '../data/initialData';
import { Categoria, Producto, Pedido, Venta } from '../types';

export const SUPABASE_URL = "https://hbfhuwsizuhdqhyojmzk.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZmh1d3NpenVoZHFoeW9qbXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzUyMzIsImV4cCI6MjEwNzY1MTIzMn0.Oa1a4o14nRXnMaLHp_6NKSe9avx8ADwPd6ezlx7I53E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// CATEGORÍAS
// ==========================================
export async function getCategorias(): Promise<Categoria[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');

    if (error || !data || data.length === 0) {
      return CATEGORIAS_INICIALES;
    }

    return data.map((item) => ({
      ...item,
      activa: item.activa ?? item.activo ?? true,
    }));
  } catch (err) {
    console.warn("Fallo cargando categorías de Supabase:", err);
    return CATEGORIAS_INICIALES;
  }
}

export async function crearCategoria(cat: {
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  activa: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert([
        {
          nombre: cat.nombre,
          descripcion: cat.descripcion || null,
          imagen_url: cat.imagen_url || null,
          activa: cat.activa,
          activo: cat.activa,
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al crear categoría' };
  }
}

export async function actualizarCategoria(
  id: string,
  cat: {
    nombre: string;
    descripcion?: string;
    imagen_url?: string;
    activa: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('categorias')
      .update({
        nombre: cat.nombre,
        descripcion: cat.descripcion || null,
        imagen_url: cat.imagen_url || null,
        activa: cat.activa,
        activo: cat.activa,
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarCategoria(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// PRODUCTOS & INVENTARIO
// ==========================================
export async function getProductos(): Promise<Producto[]> {
  try {
    const [prodRes, invRes] = await Promise.all([
      supabase.from('productos').select('*').order('creado_en', { ascending: false }),
      supabase.from('inventario').select('*'),
    ]);

    if (prodRes.error || !prodRes.data) {
      return [];
    }

    const stockMap: Record<string, { cantidad: number; stock_minimo: number }> = {};
    if (invRes.data && Array.isArray(invRes.data)) {
      invRes.data.forEach((inv) => {
        stockMap[inv.producto_id] = {
          cantidad: inv.cantidad,
          stock_minimo: inv.stock_minimo ?? 5,
        };
      });
    }

    return prodRes.data.map((p) => ({
      ...p,
      activo: p.activo ?? true,
      stock: stockMap[p.id]?.cantidad ?? 0,
      stock_minimo: stockMap[p.id]?.stock_minimo ?? 5,
    }));
  } catch (err) {
    console.warn("Fallo cargando productos de Supabase:", err);
    return [];
  }
}

export async function crearProducto(
  producto: {
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria_id?: string;
    imagen_url?: string;
    imagenes?: string[];
    activo: boolean;
  },
  cantidadInicial = 10,
  stockMinimo = 5
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // 1. Insert product
    const { data: prodData, error: prodErr } = await supabase
      .from('productos')
      .insert([
        {
          nombre: producto.nombre,
          descripcion: producto.descripcion || null,
          precio: producto.precio,
          categoria_id: producto.categoria_id || null,
          imagen_url: producto.imagen_url || null,
          imagenes: producto.imagenes || [],
          activo: producto.activo,
        }
      ])
      .select();

    if (prodErr || !prodData || prodData.length === 0) {
      throw prodErr || new Error('No se pudo crear el producto');
    }

    const nuevoProd = prodData[0];

    // 2. Insert initial inventory
    try {
      await supabase.from('inventario').insert([
        {
          producto_id: nuevoProd.id,
          cantidad: cantidadInicial,
          stock_minimo: stockMinimo,
        }
      ]);
    } catch (invErr) {
      console.warn("Aviso al crear inventario asociado:", invErr);
    }

    return { success: true, data: nuevoProd };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al registrar producto' };
  }
}

export async function actualizarProducto(
  id: string,
  producto: {
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria_id?: string;
    imagen_url?: string;
    imagenes?: string[];
    activo: boolean;
  },
  stock?: number,
  stockMinimo?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('productos')
      .update({
        nombre: producto.nombre,
        descripcion: producto.descripcion || null,
        precio: producto.precio,
        categoria_id: producto.categoria_id || null,
        imagen_url: producto.imagen_url || null,
        imagenes: producto.imagenes || [],
        activo: producto.activo,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    if (stock !== undefined) {
      await actualizarStockRapido(id, stock, stockMinimo);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarProducto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // delete inventory row first
    await supabase.from('inventario').delete().eq('producto_id', id);
    // delete product
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarStockRapido(
  productoId: string,
  nuevoStock: number,
  stockMinimo = 5
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from('inventario')
      .select('id')
      .eq('producto_id', productoId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('inventario')
        .update({
          cantidad: Math.max(0, nuevoStock),
          stock_minimo: stockMinimo,
          actualizado_en: new Date().toISOString(),
        })
        .eq('producto_id', productoId);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('inventario').insert([
        {
          producto_id: productoId,
          cantidad: Math.max(0, nuevoStock),
          stock_minimo: stockMinimo,
        }
      ]);
      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// PEDIDOS
// ==========================================
export async function getPedidos(): Promise<Pedido[]> {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function crearPedido(pedido: Pedido): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .insert([
        {
          codigo: pedido.codigo,
          cliente_nombre: pedido.cliente_nombre,
          cliente_telefono: pedido.cliente_telefono,
          cliente_direccion: pedido.cliente_direccion || '',
          metodo_pago: pedido.metodo_pago,
          comprobante_url: pedido.comprobante_url || null,
          total: pedido.total,
          estado: 'pendiente',
          items: pedido.items,
          notas: pedido.notas || '',
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarEstadoPedido(
  id: string,
  nuevoEstado: 'pendiente' | 'aprobado' | 'entregado' | 'cancelado'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarPedido(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// VENTAS & FACTURACIÓN
// ==========================================
export async function getVentas(): Promise<Venta[]> {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function crearVentaManual(venta: {
  cliente_nombre: string;
  cliente_telefono?: string;
  metodo_pago: string;
  total: number;
  items: any[];
  tipo?: 'web' | 'manual';
  notas?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const codigo = `VNT-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase.from('ventas').insert([
      {
        codigo,
        cliente_nombre: venta.cliente_nombre,
        cliente_telefono: venta.cliente_telefono || null,
        metodo_pago: venta.metodo_pago,
        total: venta.total,
        items: venta.items,
        tipo: venta.tipo || 'manual',
        notas: venta.notas || null,
      }
    ]);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// STORAGE: SUBIDA DE FOTOS Y COMPROBANTES
// ==========================================
export async function subirFotoStorage(file: File, bucket = 'productos'): Promise<{ url: string | null; error?: string }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `productos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn("Storage upload error:", uploadError);
      // Fallback to data URL so the user's uploaded photo still works 100%
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string });
        reader.onerror = () => resolve({ url: null, error: uploadError.message });
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl };
  } catch (err: any) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string });
      reader.onerror = () => resolve({ url: null, error: err?.message });
      reader.readAsDataURL(file);
    });
  }
}
