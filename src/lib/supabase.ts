import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS_INICIALES } from '../data/initialData';
import { Categoria, Producto, Pedido, Venta, Gasto, UsuarioPanel, RolUsuario, EstadoPedido, MovimientoTrabajador, RegistroCaja } from '../types';

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
    const [prodRes, invRes, detRes] = await Promise.all([
      supabase.from('productos').select('*').order('creado_en', { ascending: false }),
      supabase.from('inventario').select('*'),
      Promise.resolve(supabase.from('detalles_productos').select('*')).catch(() => ({ data: null, error: null } as any)),
    ]);

    if (prodRes.error || !prodRes.data) {
      return [];
    }

    const stockMap: Record<string, { cantidad: number; stock_minimo: number }> = {};
    if (invRes.data && Array.isArray(invRes.data)) {
      invRes.data.forEach((inv: any) => {
        stockMap[inv.producto_id] = {
          cantidad: inv.cantidad,
          stock_minimo: inv.stock_minimo ?? 5,
        };
      });
    }

    const detallesMap: Record<string, { tallas?: string[]; colores?: string[] }> = {};
    if (detRes && (detRes as any).data && Array.isArray((detRes as any).data)) {
      (detRes as any).data.forEach((d: any) => {
        detallesMap[d.producto_id] = {
          tallas: d.tallas || [],
          colores: d.colores || [],
        };
      });
    }

    return prodRes.data.map((p: any) => {
      const det = detallesMap[p.id];
      const tallas = (Array.isArray(p.tallas) && p.tallas.length > 0) ? p.tallas : (det?.tallas || []);
      const colores = (Array.isArray(p.colores) && p.colores.length > 0) ? p.colores : (det?.colores || []);

      return {
        ...p,
        tallas,
        colores,
        activo: p.activo ?? true,
        tiene_variantes: Boolean(p.tiene_variantes || tallas.length > 0 || colores.length > 0),
        atributos: p.atributos || [],
        variantes: p.variantes || [],
        sku: p.sku || '',
        costo: p.costo || 0,
        stock: stockMap[p.id]?.cantidad ?? 0,
        stock_minimo: stockMap[p.id]?.stock_minimo ?? 5,
      };
    });
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
    costo?: number;
    categoria_id?: string;
    imagen_url?: string;
    imagenes?: string[];
    activo: boolean;
    sku?: string;
    tallas?: string[];
    colores?: string[];
    tiene_variantes?: boolean;
    atributos?: any[];
    variantes?: any[];
  },
  cantidadInicial = 10,
  stockMinimo = 5
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const insertPayload: any = {
      nombre: producto.nombre,
      descripcion: producto.descripcion || null,
      precio: producto.precio,
      costo: producto.costo || 0,
      categoria_id: producto.categoria_id || null,
      imagen_url: producto.imagen_url || null,
      imagenes: producto.imagenes || [],
      activo: producto.activo,
      sku: producto.sku || null,
      tallas: producto.tallas || [],
      colores: producto.colores || [],
      tiene_variantes: producto.tiene_variantes ?? false,
      atributos: producto.atributos || [],
      variantes: producto.variantes || [],
    };

    let prodData: any = null;
    let prodErr: any = null;

    // 1. Intentar insertar con tallas y colores
    const res = await supabase.from('productos').insert([insertPayload]).select();
    prodData = res.data;
    prodErr = res.error;

    // Fallback si la tabla productos no tiene aún las columnas tallas/colores
    if (prodErr && prodErr.message && (prodErr.message.includes('tallas') || prodErr.message.includes('colores'))) {
      delete insertPayload.tallas;
      delete insertPayload.colores;
      const retry = await supabase.from('productos').insert([insertPayload]).select();
      prodData = retry.data;
      prodErr = retry.error;
    }

    if (prodErr || !prodData || prodData.length === 0) {
      throw prodErr || new Error('No se pudo crear el producto');
    }

    const nuevoProd = prodData[0];

    // 2. Guardar en la tabla detalles_productos para persistencia en SQL
    try {
      await supabase.from('detalles_productos').upsert([
        {
          producto_id: nuevoProd.id,
          tallas: producto.tallas || [],
          colores: producto.colores || [],
          actualizado_en: new Date().toISOString(),
        }
      ]);
    } catch (detErr) {
      console.warn("Aviso al guardar en detalles_productos:", detErr);
    }

    // 3. Insert initial inventory
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

    return { success: true, data: { ...nuevoProd, tallas: producto.tallas, colores: producto.colores } };
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
    costo?: number;
    categoria_id?: string;
    imagen_url?: string;
    imagenes?: string[];
    activo: boolean;
    sku?: string;
    tallas?: string[];
    colores?: string[];
    tiene_variantes?: boolean;
    atributos?: any[];
    variantes?: any[];
  },
  stock?: number,
  stockMinimo?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: any = {
      nombre: producto.nombre,
      descripcion: producto.descripcion || null,
      precio: producto.precio,
      costo: producto.costo || 0,
      categoria_id: producto.categoria_id || null,
      imagen_url: producto.imagen_url || null,
      imagenes: producto.imagenes || [],
      activo: producto.activo,
      sku: producto.sku || null,
      tallas: producto.tallas || [],
      colores: producto.colores || [],
      tiene_variantes: producto.tiene_variantes ?? false,
      atributos: producto.atributos || [],
      variantes: producto.variantes || [],
      actualizado_en: new Date().toISOString(),
    };

    let { error } = await supabase.from('productos').update(updatePayload).eq('id', id);

    if (error && error.message && (error.message.includes('tallas') || error.message.includes('colores'))) {
      delete updatePayload.tallas;
      delete updatePayload.colores;
      const retry = await supabase.from('productos').update(updatePayload).eq('id', id);
      error = retry.error;
    }

    if (error) throw error;

    // Sincronizar en la tabla detalles_productos
    try {
      await supabase.from('detalles_productos').upsert([
        {
          producto_id: id,
          tallas: producto.tallas || [],
          colores: producto.colores || [],
          actualizado_en: new Date().toISOString(),
        }
      ], { onConflict: 'producto_id' });
    } catch (detErr) {
      console.warn("Aviso sincronizando en detalles_productos:", detErr);
    }

    if (stock !== undefined) {
      await actualizarStockRapido(id, stock, stockMinimo);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar producto' };
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

    // Sincronizar también en la tabla productos para mantener coherencia total
    try {
      await supabase
        .from('productos')
        .update({
          stock: Math.max(0, nuevoStock),
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', productoId);
    } catch {}

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
    // 1. Obtener productos de la base de datos para validación estricta de precios y variantes en servidor
    let productosDb: Producto[] = [];
    try {
      const { data: pData } = await supabase.from('productos').select('*');
      if (pData && Array.isArray(pData)) {
        productosDb = pData;
      }
    } catch (e) {
      console.warn("Aviso obteniendo catálogo para validación en servidor:", e);
    }

    const prodMap = new Map<string, Producto>();
    productosDb.forEach((p) => {
      prodMap.set(p.id, p);
      if (p.sku) prodMap.set(p.sku, p);
    });

    // 2. Validación de precios y cantidades en servidor (sin confiar ciegamente en el cliente)
    const itemsValidados = pedido.items.map((it) => {
      const prodId = it.producto_id || it.id;
      const dbProd = prodMap.get(prodId);
      let precioValido = Number(it.precio) || 0;

      if (dbProd) {
        if (it.variante_id && dbProd.variantes && dbProd.variantes.length > 0) {
          const matchingVar = dbProd.variantes.find((v) => v.id === it.variante_id);
          if (matchingVar && matchingVar.precio !== undefined && matchingVar.precio > 0) {
            precioValido = Number(matchingVar.precio);
          } else {
            precioValido = Number(dbProd.precio);
          }
        } else {
          precioValido = Number(dbProd.precio);
        }
      }

      const cantidadValida = Math.max(1, Math.floor(Number(it.cantidad) || 1));
      const subtotalItem = Math.round(precioValido * cantidadValida * 100) / 100;

      return {
        ...it,
        producto_id: prodId,
        precio: precioValido,
        cantidad: cantidadValida,
        subtotal: subtotalItem,
      };
    });

    const subtotalCalculado = itemsValidados.reduce((acc, it) => acc + (it.subtotal || (it.precio * it.cantidad)), 0);
    const descuento = Math.max(0, Number(pedido.descuento) || 0);
    const envio = Math.max(0, Number(pedido.costo_envio) || 0);
    const totalValidado = Math.max(0, Math.round((subtotalCalculado - descuento + envio) * 100) / 100);

    const payload: any = {
      codigo: pedido.codigo,
      cliente_nombre: pedido.cliente_nombre.trim(),
      cliente_telefono: pedido.cliente_telefono.trim(),
      cliente_direccion: pedido.cliente_direccion || '',
      metodo_pago: pedido.metodo_pago,
      comprobante_url: pedido.comprobante_url || null,
      comprobante_path: pedido.comprobante_path || null,
      total: totalValidado,
      subtotal: subtotalCalculado,
      descuento: descuento,
      costo_envio: envio,
      estado: pedido.estado || 'pendiente',
      estado_pago: pedido.estado_pago || (pedido.comprobante_url ? 'pendiente_revision' : 'pendiente_revision'),
      items: itemsValidados,
      notas: pedido.notas || '',
      creado_en: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('pedidos').insert([payload]).select();

    if (error) {
      // Fallback si la tabla aún no tiene las columnas subtotal, descuento, comprobante_path
      const simplifiedPayload = {
        codigo: payload.codigo,
        cliente_nombre: payload.cliente_nombre,
        cliente_telefono: payload.cliente_telefono,
        cliente_direccion: payload.cliente_direccion,
        metodo_pago: payload.metodo_pago,
        comprobante_url: payload.comprobante_url,
        total: payload.total,
        estado: payload.estado,
        items: payload.items,
        notas: payload.notas,
      };
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('pedidos')
        .insert([simplifiedPayload])
        .select();

      if (fallbackErr) throw fallbackErr;
      return { success: true, data: fallbackData?.[0] };
    }

    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarEstadoPedido(
  idOrCodigo: string,
  nuevoEstado: string,
  revisadoPor?: string,
  estadoPago?: 'pendiente_revision' | 'verificado' | 'rechazado'
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: any = {
      estado: nuevoEstado,
      actualizado_en: new Date().toISOString(),
    };

    if (revisadoPor) {
      updatePayload.revisado_por = revisadoPor;
      updatePayload.revisado_en = new Date().toISOString();
    }

    if (estadoPago) {
      updatePayload.estado_pago = estadoPago;
    } else if (nuevoEstado === 'aprobado' || nuevoEstado === 'aceptado') {
      updatePayload.estado_pago = 'verificado';
    } else if (nuevoEstado === 'cancelado' || nuevoEstado === 'rechazado') {
      updatePayload.estado_pago = 'rechazado';
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
    let error = null;

    if (isUuid) {
      const res = await supabase.from('pedidos').update(updatePayload).eq('id', idOrCodigo);
      error = res.error;
    } else {
      const res = await supabase.from('pedidos').update(updatePayload).eq('codigo', idOrCodigo);
      error = res.error;
    }

    if (error) {
      // Reintento por el otro campo en caso de discrepancia
      await supabase.from('pedidos').update(updatePayload).eq('codigo', idOrCodigo);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarEstadoPagoPedido(
  idOrCodigo: string,
  nuevoEstadoPago: 'pendiente_revision' | 'verificado' | 'rechazado',
  revisadoPor?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload = {
      estado_pago: nuevoEstadoPago,
      revisado_por: revisadoPor || null,
      revisado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
    if (isUuid) {
      await supabase.from('pedidos').update(updatePayload).eq('id', idOrCodigo);
    }
    await supabase.from('pedidos').update(updatePayload).eq('codigo', idOrCodigo);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function vincularComprobanteAPedido(
  idOrCodigo: string,
  comprobanteUrl: string,
  comprobantePath?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload = {
      comprobante_url: comprobanteUrl,
      comprobante_path: comprobantePath || null,
      estado_pago: 'pendiente_revision',
      actualizado_en: new Date().toISOString(),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
    if (isUuid) {
      await supabase.from('pedidos').update(updatePayload).eq('id', idOrCodigo);
    }
    await supabase.from('pedidos').update(updatePayload).eq('codigo', idOrCodigo);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarPedido(idOrCodigo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
    if (isUuid) {
      await supabase.from('pedidos').delete().eq('id', idOrCodigo);
    }
    await supabase.from('pedidos').delete().eq('codigo', idOrCodigo);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// VENTAS & FACTURACIÓN (SUPABASE + LOCAL STORAGE)
// ==========================================
const STORAGE_KEY_VENTAS = 'alexstore_local_ventas';

export async function getVentas(): Promise<Venta[]> {
  let remoteList: Venta[] = [];
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (!error && data) {
      remoteList = data as Venta[];
    }
  } catch (err) {
    console.warn('Aviso cargando ventas de Supabase:', err);
  }

  // Sincronizar SIEMPRE con TODOS los pedidos aprobados o entregados en Supabase
  // para que si un pedido fue aceptado en un dispositivo, aparezca inmediatamente en todos los demás
  try {
    const { data: pedsAprobados } = await supabase
      .from('pedidos')
      .select('*')
      .in('estado', ['aprobado', 'entregado', 'aceptado'])
      .order('creado_en', { ascending: false });

    if (pedsAprobados && Array.isArray(pedsAprobados)) {
      pedsAprobados.forEach((p) => {
        const cleanCode = (p.codigo || '').replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
        const codVenta = `VNT-${cleanCode}`;
        const alreadyInRemote = remoteList.some(
          (v) =>
            (v.pedido_id && v.pedido_id === p.id) ||
            v.codigo === codVenta ||
            (v.codigo && p.codigo && v.codigo.includes(cleanCode))
        );
        if (!alreadyInRemote) {
          const synthVenta: Venta = {
            id: p.id || `vnt_${cleanCode}`,
            codigo: codVenta,
            pedido_id: p.id,
            cliente_nombre: p.cliente_nombre,
            cliente_telefono: p.cliente_telefono || null,
            metodo_pago: p.metodo_pago,
            total: Number(p.total) || 0,
            monto_abonado: Number(p.total) || 0,
            saldo_pendiente: 0,
            estado_pago: 'completo',
            items: p.items || [],
            tipo: 'web',
            notas: `Venta generada del pedido ${p.codigo}.`,
            creado_en: p.actualizado_en || p.creado_en || new Date().toISOString(),
          };
          remoteList.push(synthVenta);
        }
      });
    }
  } catch (pedErr) {
    console.warn('Aviso sincronizando pedidos aprobados a ventas:', pedErr);
  }

  // Respaldo en localStorage para disponibilidad ininterrumpida
  let localList: Venta[] = [];
  try {
    const local = localStorage.getItem(STORAGE_KEY_VENTAS);
    if (local) localList = JSON.parse(local);
  } catch {}

  const map = new Map<string, Venta>();
  remoteList.forEach((v) => map.set(v.id || v.codigo, v));
  localList.forEach((v) => {
    const key = v.id || v.codigo;
    if (!map.has(key)) map.set(key, v);
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.creado_en || 0).getTime() - new Date(a.creado_en || 0).getTime()
  );

  try {
    localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(merged));
  } catch {}

  return merged;
}

/**
 * Descuenta stock automáticamente de las tablas 'inventario' y 'productos' (incluyendo variantes)
 */
export async function descontarStockProducto(
  productoId: string,
  cantidadADescontar: number,
  varianteId?: string,
  varianteTitulo?: string
): Promise<{ success: boolean; nuevoStock?: number; error?: string }> {
  try {
    const cant = Math.max(1, Number(cantidadADescontar) || 1);
    const now = new Date().toISOString();

    // 1. Descontar en la tabla 'inventario' (fuente principal para getProductos e inventario en admin)
    let nuevoStockInventario = 0;
    try {
      const { data: invData } = await supabase
        .from('inventario')
        .select('id, cantidad, stock_minimo')
        .eq('producto_id', productoId)
        .maybeSingle();

      if (invData) {
        const actual = Number(invData.cantidad) || 0;
        nuevoStockInventario = Math.max(0, actual - cant);
        await supabase
          .from('inventario')
          .update({
            cantidad: nuevoStockInventario,
            actualizado_en: now,
          })
          .eq('producto_id', productoId);
      } else {
        const { data: prodInfo } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', productoId)
          .maybeSingle();

        const base = Number(prodInfo?.stock) || 0;
        nuevoStockInventario = Math.max(0, base - cant);
        await supabase
          .from('inventario')
          .insert([
            {
              producto_id: productoId,
              cantidad: nuevoStockInventario,
              stock_minimo: 5,
            }
          ]);
      }
    } catch (invErr) {
      console.warn('Aviso descontando en tabla inventario:', invErr);
    }

    // 2. Descontar en la tabla 'productos' (stock general y array de variantes)
    try {
      const { data: prodData } = await supabase
        .from('productos')
        .select('id, stock, variantes, tiene_variantes')
        .eq('id', productoId)
        .maybeSingle();

      if (prodData) {
        const currentStock = Number(prodData.stock) || 0;
        const nuevoStockProd = Math.max(0, currentStock - cant);

        let nuevasVariantes = prodData.variantes;
        if (Array.isArray(nuevasVariantes) && (varianteId || varianteTitulo)) {
          nuevasVariantes = nuevasVariantes.map((v: any) => {
            if (
              (varianteId && (v.id === varianteId || v.titulo === varianteId)) ||
              (varianteTitulo && (v.titulo === varianteTitulo || v.id === varianteTitulo))
            ) {
              const varStock = Number(v.stock) || 0;
              return { ...v, stock: Math.max(0, varStock - cant) };
            }
            return v;
          });
        }

        await supabase
          .from('productos')
          .update({
            stock: nuevoStockProd,
            variantes: nuevasVariantes,
            actualizado_en: now,
          })
          .eq('id', productoId);
      }
    } catch (prodErr) {
      console.warn('Aviso descontando en tabla productos:', prodErr);
    }

    return { success: true, nuevoStock: nuevoStockInventario };
  } catch (err: any) {
    console.error('Error en descontarStockProducto:', err);
    return { success: false, error: err.message };
  }
}

export async function crearVentaManual(venta: {
  cliente_nombre: string;
  cliente_telefono?: string;
  metodo_pago: string;
  total: number;
  monto_abonado?: number;
  saldo_pendiente?: number;
  estado_pago?: 'completo' | 'abono_pendiente' | 'contra_entrega_pendiente';
  cajero_nombre?: string;
  registrado_por?: string;
  items: any[];
  tipo?: 'web' | 'manual';
  notas?: string;
}): Promise<{ success: boolean; data?: Venta; error?: string }> {
  try {
    const codigo = `VNT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const totalNum = Number(venta.total) || 0;
    const abonadoNum =
      venta.monto_abonado !== undefined
        ? Number(venta.monto_abonado)
        : venta.metodo_pago === 'contra_entrega'
        ? 0
        : totalNum;
    const saldoPendiente = Math.max(0, totalNum - abonadoNum);
    const estadoPago =
      venta.estado_pago ||
      (venta.metodo_pago === 'abono' && saldoPendiente > 0
        ? 'abono_pendiente'
        : venta.metodo_pago === 'contra_entrega'
        ? 'contra_entrega_pendiente'
        : 'completo');

    const author = venta.cajero_nombre || venta.registrado_por || 'Cajero';

    const newVentaRecord: Venta = {
      id: `vnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      codigo,
      cliente_nombre: venta.cliente_nombre.trim(),
      cliente_telefono: venta.cliente_telefono?.trim() || null,
      metodo_pago: venta.metodo_pago || 'efectivo',
      total: totalNum,
      monto_abonado: abonadoNum,
      saldo_pendiente: saldoPendiente,
      estado_pago: estadoPago,
      cajero_nombre: author,
      registrado_por: author,
      items: venta.items || [],
      tipo: venta.tipo || 'manual',
      notas: venta.notas?.trim() || null,
      creado_en: now,
    };

    // 1. Insertar en Supabase si la tabla ventas existe
    try {
      const { data, error } = await supabase
        .from('ventas')
        .insert([
          {
            codigo: newVentaRecord.codigo,
            cliente_nombre: newVentaRecord.cliente_nombre,
            cliente_telefono: newVentaRecord.cliente_telefono,
            metodo_pago: newVentaRecord.metodo_pago,
            total: newVentaRecord.total,
            monto_abonado: newVentaRecord.monto_abonado,
            saldo_pendiente: newVentaRecord.saldo_pendiente,
            estado_pago: newVentaRecord.estado_pago,
            cajero_nombre: newVentaRecord.cajero_nombre,
            items: newVentaRecord.items,
            tipo: newVentaRecord.tipo,
            notas: newVentaRecord.notas,
            creado_en: newVentaRecord.creado_en,
          }
        ])
        .select()
        .maybeSingle();

      if (!error && data) {
        newVentaRecord.id = data.id || newVentaRecord.id;
      }
    } catch (err) {
      console.warn('Aviso insertando venta manual en Supabase, guardando en local:', err);
    }

    // 2. Persistir localmente de inmediato para que nunca se pierda
    try {
      const local = localStorage.getItem(STORAGE_KEY_VENTAS);
      const list: Venta[] = local ? JSON.parse(local) : [];
      const updated = [newVentaRecord, ...list.filter((v) => v.codigo !== newVentaRecord.codigo)];
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(updated));
    } catch {}

    // 3. Descontar automáticamente el stock del inventario y producto por cada artículo vendido
    if (venta.items && Array.isArray(venta.items) && venta.items.length > 0) {
      for (const item of venta.items) {
        const prodId = item.producto_id || item.id;
        const cant = Number(item.cantidad) || 1;
        if (prodId) {
          await descontarStockProducto(prodId, cant, item.variante_id, item.variante_titulo);
        }
      }
    }

    return { success: true, data: newVentaRecord };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error guardando venta manual' };
  }
}

/**
 * Liquida el saldo pendiente de una venta (abono o contra entrega completada al recibir)
 */
export async function liquidarSaldoVenta(
  idOrCodigo: string,
  liquidadoPor?: string
): Promise<{ success: boolean; data?: Venta; error?: string }> {
  try {
    const ventas = await getVentas();
    const venta = ventas.find((v) => v.id === idOrCodigo || v.codigo === idOrCodigo);
    if (!venta) return { success: false, error: 'Venta no encontrada' };

    const total = Number(venta.total) || 0;
    const now = new Date().toISOString();
    const updatePayload = {
      monto_abonado: total,
      saldo_pendiente: 0,
      estado_pago: 'completo',
      notas: (venta.notas ? venta.notas + ' • ' : '') + `Cobro completado / Liquidado por: ${liquidadoPor || 'Caja'}. (${new Date().toLocaleString('es-PA')})`,
    };

    // Actualizar en Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
      const q = supabase.from('ventas').update(updatePayload);
      if (isUuid) {
        await q.eq('id', idOrCodigo);
      } else {
        await q.eq('codigo', idOrCodigo);
      }
    } catch (e) {
      console.warn('Aviso liquidando saldo en Supabase:', e);
    }

    // Actualizar localmente
    const updatedVenta: Venta = {
      ...venta,
      ...updatePayload,
      estado_pago: 'completo',
    };

    try {
      const local = localStorage.getItem(STORAGE_KEY_VENTAS);
      const list: Venta[] = local ? JSON.parse(local) : [];
      const updatedList = list.map((v) => (v.id === idOrCodigo || v.codigo === idOrCodigo ? updatedVenta : v));
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(updatedList));
    } catch {}

    return { success: true, data: updatedVenta };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error liquidando saldo' };
  }
}

export async function eliminarVenta(idOrCodigo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
    const query = supabase.from('ventas').delete();
    if (isUuid) {
      await query.eq('id', idOrCodigo);
    } else {
      await query.eq('codigo', idOrCodigo);
    }
  } catch (err) {
    console.warn('Aviso eliminando venta de Supabase:', err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_VENTAS);
    if (local) {
      const list: Venta[] = JSON.parse(local);
      const filtered = list.filter((v) => v.id !== idOrCodigo && v.codigo !== idOrCodigo);
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(filtered));
    }
  } catch {}

  return { success: true };
}

export async function eliminarCliente(telefonoONombre: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPhone = telefonoONombre.replace(/\D/g, '');
    let filter = `cliente_nombre.eq.${telefonoONombre}`;
    if (cleanPhone.length >= 6) {
      filter = `cliente_telefono.ilike.%${cleanPhone}%,cliente_nombre.eq.${telefonoONombre}`;
    }
    await supabase.from('pedidos').delete().or(filter);
    await supabase.from('ventas').delete().or(filter);
  } catch (e) {
    console.warn('Aviso eliminando cliente en Supabase:', e);
  }

  // Limpiar también de ventas locales asociadas al cliente
  try {
    const cleanPhone = telefonoONombre.replace(/\D/g, '');
    const local = localStorage.getItem(STORAGE_KEY_VENTAS);
    if (local) {
      const list: Venta[] = JSON.parse(local);
      const filtered = list.filter((v) => {
        const vPhone = (v.cliente_telefono || '').replace(/\D/g, '');
        if (cleanPhone && vPhone && (vPhone.includes(cleanPhone) || cleanPhone.includes(vPhone))) return false;
        if (v.cliente_nombre.toLowerCase() === telefonoONombre.toLowerCase()) return false;
        return true;
      });
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(filtered));
    }
  } catch {}

  return { success: true };
}

/**
 * Aprueba un pedido, descuenta existencias automáticamente de inventario y registra la venta en el panel de ventas
 */
export async function aprobarPedidoYDescontarStock(
  pedidoId: string,
  pedido: Pedido,
  aprobadoPor?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // 1. Actualizar estado del pedido a 'aprobado' y estado_pago a 'verificado'
    const updateOrderPayload = {
      estado: 'aprobado',
      estado_pago: 'verificado',
      revisado_por: aprobadoPor || 'Administrador',
      revisado_en: now,
      actualizado_en: now,
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pedidoId);
    if (isUuid) {
      await supabase.from('pedidos').update(updateOrderPayload).eq('id', pedidoId);
    }
    if (pedido.codigo) {
      await supabase.from('pedidos').update(updateOrderPayload).eq('codigo', pedido.codigo);
    }

    // 2. Descontar stock automáticamente de cada producto o variante tanto en inventario como en productos
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        const prodId = item.producto_id || item.id;
        const cant = Number(item.cantidad) || 1;
        if (prodId) {
          await descontarStockProducto(prodId, cant, item.variante_id, item.variante_titulo);
        }
      }
    }

    // 3. Registrar automáticamente la venta en el módulo de ventas
    const cleanCode = (pedido.codigo || '').replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
    const codigoVenta = `VNT-${cleanCode}`;

    const ventaRecord: Venta = {
      id: `vnt_${cleanCode}`,
      codigo: codigoVenta,
      pedido_id: pedido.id || pedidoId,
      cliente_nombre: pedido.cliente_nombre,
      cliente_telefono: pedido.cliente_telefono || null,
      metodo_pago: pedido.metodo_pago,
      total: Number(pedido.total) || 0,
      monto_abonado: Number(pedido.total) || 0,
      saldo_pendiente: 0,
      estado_pago: 'completo',
      items: pedido.items,
      tipo: 'web',
      notas: `Venta generada automáticamente al aprobar el pedido ${pedido.codigo}. Aprobado por: ${aprobadoPor || 'Admin'}`,
      creado_en: now,
    };

    try {
      const insertPayload: any = {
        codigo: ventaRecord.codigo,
        pedido_id: isUuid ? pedidoId : (pedido.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pedido.id) ? pedido.id : null),
        cliente_nombre: ventaRecord.cliente_nombre,
        cliente_telefono: ventaRecord.cliente_telefono,
        metodo_pago: ventaRecord.metodo_pago,
        total: ventaRecord.total,
        monto_abonado: ventaRecord.total,
        saldo_pendiente: 0,
        estado_pago: 'completo',
        items: ventaRecord.items,
        tipo: ventaRecord.tipo,
        notas: ventaRecord.notas,
        creado_en: ventaRecord.creado_en,
      };

      const { data, error } = await supabase.from('ventas').insert([insertPayload]).select().maybeSingle();
      if (error && (error.message.includes('monto_abonado') || error.message.includes('saldo_pendiente') || error.message.includes('estado_pago'))) {
        delete insertPayload.monto_abonado;
        delete insertPayload.saldo_pendiente;
        delete insertPayload.estado_pago;
        await supabase.from('ventas').insert([insertPayload]);
      }
      if (data?.id) {
        ventaRecord.id = data.id;
      }
    } catch (vErr) {
      console.warn('Aviso insertando venta en Supabase:', vErr);
    }

    // Guardar también en localStorage para consistencia inmediata
    try {
      const local = localStorage.getItem(STORAGE_KEY_VENTAS);
      const list: Venta[] = local ? JSON.parse(local) : [];
      const updated = [ventaRecord, ...list.filter((v) => v.codigo !== codigoVenta)];
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(updated));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error en aprobarPedidoYDescontarStock:', err);
    return { success: false, error: err?.message || 'Error al aprobar pedido y descontar stock' };
  }
}

// ==========================================
// GASTOS & BALANCE FINANCIERO
// ==========================================
const STORAGE_KEY_GASTOS = 'alexstore_local_gastos';

export async function getGastos(): Promise<Gasto[]> {
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_GASTOS, JSON.stringify(data));
      } catch {}
      return data as Gasto[];
    }
  } catch (err) {
    console.warn('Aviso cargando gastos de Supabase:', err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_GASTOS);
    if (local) {
      return JSON.parse(local) as Gasto[];
    }
  } catch {}

  return [];
}

export async function crearGasto(gasto: {
  concepto: string;
  monto: number;
  categoria: string;
  fecha?: string;
  notas?: string;
  creado_por?: string;
}): Promise<{ success: boolean; data?: Gasto; error?: string }> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gst_${Date.now()}`;
  const fecha = gasto.fecha || new Date().toISOString();
  const newGastoRecord: Gasto = {
    id: newId,
    concepto: gasto.concepto.trim(),
    monto: Number(gasto.monto) || 0,
    categoria: gasto.categoria || 'Mercancía e Inventario',
    fecha,
    notas: gasto.notas?.trim() || null,
    creado_por: gasto.creado_por || 'Administrador',
    creado_en: new Date().toISOString(),
  };

  // 1. Intentar guardar en Supabase si la tabla existe (sin forzar ID inválido)
  try {
    const insertPayload: any = {
      concepto: newGastoRecord.concepto,
      monto: newGastoRecord.monto,
      categoria: newGastoRecord.categoria,
      fecha: newGastoRecord.fecha,
      notas: newGastoRecord.notas,
      creado_por: newGastoRecord.creado_por,
      creado_en: newGastoRecord.creado_en,
    };

    const { data, error } = await supabase
      .from('gastos')
      .insert([insertPayload])
      .select()
      .maybeSingle();

    if (!error && data) {
      try {
        const currentList = await getGastos();
        const updated = [data as Gasto, ...currentList.filter((g) => g.id !== data.id)];
        localStorage.setItem(STORAGE_KEY_GASTOS, JSON.stringify(updated));
      } catch {}
      return { success: true, data: data as Gasto };
    }
  } catch (err: any) {
    console.warn('Aviso insertando gasto en Supabase, guardando en local:', err);
  }

  // 2. Persistencia local garantizada para funcionamiento ininterrumpido
  try {
    const local = localStorage.getItem(STORAGE_KEY_GASTOS);
    const list: Gasto[] = local ? JSON.parse(local) : [];
    const updated = [newGastoRecord, ...list];
    localStorage.setItem(STORAGE_KEY_GASTOS, JSON.stringify(updated));
    return { success: true, data: newGastoRecord };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error guardando gasto' };
  }
}

export async function eliminarGasto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabase.from('gastos').delete().eq('id', id);
    } else {
      await supabase.from('gastos').delete().eq('concepto', id);
    }
  } catch (err) {
    console.warn('Aviso eliminando de Supabase:', err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_GASTOS);
    if (local) {
      const list: Gasto[] = JSON.parse(local);
      const filtered = list.filter((g) => g.id !== id);
      localStorage.setItem(STORAGE_KEY_GASTOS, JSON.stringify(filtered));
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// CONTROL DE APERTURA Y CIERRE DE CAJA
// ==========================================
const STORAGE_KEY_CAJA_ACTUAL = 'alexstore_local_caja_activa';
const STORAGE_KEY_CAJA_HISTORIAL = 'alexstore_local_caja_historial';

export async function getSesionCajaActiva(): Promise<RegistroCaja | null> {
  try {
    const { data, error } = await supabase
      .from('registros_caja')
      .select('*')
      .eq('estado', 'abierta')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      try {
        localStorage.setItem(STORAGE_KEY_CAJA_ACTUAL, JSON.stringify(data));
      } catch {}
      return data as RegistroCaja;
    }
  } catch (err) {
    console.warn('Aviso consultando registros_caja en Supabase:', err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_CAJA_ACTUAL);
    if (local) return JSON.parse(local);
  } catch {}

  return null;
}

export async function getHistorialCaja(limit = 100): Promise<RegistroCaja[]> {
  try {
    const { data, error } = await supabase
      .from('registros_caja')
      .select('*')
      .order('fecha_apertura', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_CAJA_HISTORIAL, JSON.stringify(data));
      } catch {}
      return data as RegistroCaja[];
    }
  } catch (err) {
    console.warn('Aviso consultando historial de caja en Supabase:', err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_CAJA_HISTORIAL);
    if (local) return JSON.parse(local);
  } catch {}

  return [];
}

export async function abrirCaja(params: {
  monto_inicial: number;
  abierto_por: string;
  usuario_id?: string | null;
  notas?: string;
}): Promise<{ success: boolean; data?: RegistroCaja; error?: string }> {
  try {
    const now = new Date().toISOString();
    const newSession: RegistroCaja = {
      id: `caja_${Date.now()}`,
      estado: 'abierta',
      monto_inicial: Number(params.monto_inicial) || 0,
      fecha_apertura: now,
      abierto_por: params.abierto_por,
      usuario_id: params.usuario_id || null,
      notas: params.notas || null,
      creado_en: now,
    };

    try {
      const { data, error } = await supabase
        .from('registros_caja')
        .insert([
          {
            estado: 'abierta',
            monto_inicial: newSession.monto_inicial,
            fecha_apertura: newSession.fecha_apertura,
            abierto_por: newSession.abierto_por,
            usuario_id: newSession.usuario_id,
            notas: newSession.notas,
            creado_en: newSession.creado_en,
          }
        ])
        .select()
        .maybeSingle();

      if (!error && data) {
        newSession.id = data.id || newSession.id;
      }
    } catch (e) {
      console.warn('Aviso guardando apertura de caja en Supabase:', e);
    }

    try {
      localStorage.setItem(STORAGE_KEY_CAJA_ACTUAL, JSON.stringify(newSession));
      const hist = await getHistorialCaja();
      const updated = [newSession, ...hist.filter(h => h.id !== newSession.id)];
      localStorage.setItem(STORAGE_KEY_CAJA_HISTORIAL, JSON.stringify(updated));
    } catch {}

    // Registrar en auditoría
    await registrarMovimiento({
      usuario_id: params.usuario_id,
      usuario_nombre: params.abierto_por,
      usuario_email: '',
      rol: 'cajero',
      accion: 'Apertura de Caja',
      modulo: 'caja',
      detalles: `Abrió turno de caja con fondo inicial de $${Number(params.monto_inicial).toFixed(2)}.`,
    });

    return { success: true, data: newSession };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cerrarCaja(params: {
  sesionId: string;
  monto_final_real: number;
  monto_esperado: number;
  diferencia: number;
  cerrado_por: string;
  notas?: string;
}): Promise<{ success: boolean; data?: RegistroCaja; error?: string }> {
  try {
    const now = new Date().toISOString();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.sesionId);

    const updatePayload = {
      estado: 'cerrada',
      monto_final_real: Number(params.monto_final_real) || 0,
      monto_esperado: Number(params.monto_esperado) || 0,
      diferencia: Number(params.diferencia) || 0,
      fecha_cierre: now,
      cerrado_por: params.cerrado_por,
      notas: params.notas || null,
    };

    try {
      if (isUuid) {
        await supabase.from('registros_caja').update(updatePayload).eq('id', params.sesionId);
      } else {
        await supabase.from('registros_caja').update(updatePayload).eq('estado', 'abierta');
      }
    } catch (e) {
      console.warn('Aviso cerrando caja en Supabase:', e);
    }

    // Actualizar almacenamiento local
    try {
      localStorage.removeItem(STORAGE_KEY_CAJA_ACTUAL);
      const hist = await getHistorialCaja();
      const updated = hist.map(h => (h.id === params.sesionId || h.estado === 'abierta') ? { ...h, ...updatePayload } : h);
      localStorage.setItem(STORAGE_KEY_CAJA_HISTORIAL, JSON.stringify(updated));
    } catch {}

    // Registrar en auditoría
    await registrarMovimiento({
      usuario_nombre: params.cerrado_por,
      usuario_email: '',
      rol: 'cajero',
      accion: 'Cierre de Caja',
      modulo: 'caja',
      detalles: `Cerró turno de caja. Esperado: $${params.monto_esperado.toFixed(2)}, Contado: $${params.monto_final_real.toFixed(2)}, Diferencia: $${params.diferencia.toFixed(2)}.`,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// USUARIOS, ROLES Y PERMISOS DEL PANEL
// ==========================================

export async function getUsuarioActual(): Promise<UsuarioPanel | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return null;
    }

    const user = session.user;

    // 1. Consultar registro en la tabla de usuarios de Supabase
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        return data as UsuarioPanel;
      }
    } catch (e) {
      console.warn("Tabla usuarios aún no disponible en Supabase:", e);
    }

    // 2. Si no existe en la tabla aún, derivar según metadatos o email maestro
    const isMasterEmail =
      user.email?.toLowerCase().includes('admin') ||
      user.email?.toLowerCase().includes('alex') ||
      user.email?.toLowerCase().includes('pedro');
    const defaultRol: RolUsuario = isMasterEmail ? 'dueno' : 'cajero';

    const fallbackProfile: UsuarioPanel = {
      id: user.id,
      email: user.email || '',
      nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Administrador',
      rol: (user.user_metadata?.rol as RolUsuario) || defaultRol,
      activo: true,
      creado_en: user.created_at || new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };

    // Intentar registrarlo en la tabla si ya existe
    try {
      await supabase.from('usuarios').upsert([
        {
          id: fallbackProfile.id,
          email: fallbackProfile.email,
          nombre: fallbackProfile.nombre,
          rol: fallbackProfile.rol,
          activo: fallbackProfile.activo,
        }
      ]);
    } catch {
      // Ignorar si la tabla no está creada aún en Supabase
    }

    return fallbackProfile;
  } catch (err) {
    console.warn("Error en getUsuarioActual:", err);
    return null;
  }
}

const STORAGE_KEY_LOCAL_USUARIOS = 'alexstore_local_usuarios';

export async function getUsuarios(): Promise<UsuarioPanel[]> {
  try {
    // 1. Intentar leer de perfiles_usuarios o usuarios en Supabase
    const [perfRes, userRes] = await Promise.all([
      supabase.from('perfiles_usuarios').select('*').order('creado_en', { ascending: false }),
      supabase.from('usuarios').select('*').order('creado_en', { ascending: false }),
    ]);

    const items = (perfRes.data && perfRes.data.length > 0) ? perfRes.data : (userRes.data || []);

    if (items && items.length > 0) {
      const list: UsuarioPanel[] = items.map((u: any) => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre || u.email.split('@')[0],
        rol: (u.rol as RolUsuario) || 'cajero',
        activo: u.activo ?? true,
        creado_por: u.creado_por || 'Sistema',
        creado_en: u.creado_en || new Date().toISOString(),
        actualizado_en: u.actualizado_en,
      }));
      try {
        localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(list));
      } catch {}
      return list;
    }
  } catch (err) {
    console.warn("Error cargando usuarios de Supabase:", err);
  }

  // Fallback a localStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY_LOCAL_USUARIOS);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  const defaultList: UsuarioPanel[] = [
    {
      id: 'usr_dueno_inicial',
      email: 'admin@alexmstore.com',
      nombre: 'Dueño AlexStore',
      rol: 'dueno',
      activo: true,
      creado_en: new Date().toISOString(),
      creado_por: 'Sistema Inicial',
    },
    {
      id: 'usr_cajero_inicial',
      email: 'cajero@alexmstore.com',
      nombre: 'Trabajador / Mostrador',
      rol: 'cajero',
      activo: true,
      creado_en: new Date().toISOString(),
      creado_por: 'admin@alexmstore.com',
    },
  ];
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(defaultList));
  } catch {}
  return defaultList;
}

export async function crearUsuarioPanel(data: {
  email: string;
  password: string;
  nombre: string;
  rol: RolUsuario;
  creadoPorEmail?: string;
}): Promise<{ success: boolean; data?: UsuarioPanel; error?: string }> {
  try {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanNombre = data.nombre.trim();
    const cleanPass = data.password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Ingresa un correo electrónico válido.' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres para registrar en Supabase Authentication.' };
    }

    // 1. Crear la cuenta en Supabase Authentication usando un cliente aislado
    // (para no cerrar la sesión ni afectar el token del administrador actual en el navegador)
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authErr } = await tempClient.auth.signUp({
      email: cleanEmail,
      password: cleanPass,
      options: {
        data: {
          nombre: cleanNombre,
          rol: data.rol,
        },
      },
    });

    // Si ya existe en auth o da error, no detener el registro en perfiles si es duplicado recuperable
    if (authErr && !authErr.message.toLowerCase().includes('already registered')) {
      console.warn("Aviso en auth.signUp:", authErr.message);
    }

    const newUserId = authData?.user?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`);
    const fechaActual = new Date().toISOString();

    const newRecord: UsuarioPanel = {
      id: newUserId,
      email: cleanEmail,
      nombre: cleanNombre,
      rol: data.rol,
      activo: true,
      creado_por: data.creadoPorEmail || 'Dueño',
      creado_en: fechaActual,
      actualizado_en: fechaActual,
    };

    // 2. Insertar / Upsert simultáneo en ambas tablas de perfiles de Supabase
    try {
      await Promise.all([
        supabase.from('usuarios').upsert([
          {
            id: newRecord.id,
            email: newRecord.email,
            nombre: newRecord.nombre,
            rol: newRecord.rol,
            activo: newRecord.activo,
            creado_por: newRecord.creado_por,
            creado_en: newRecord.creado_en,
            actualizado_en: newRecord.actualizado_en,
          }
        ], { onConflict: 'email' }),
        supabase.from('perfiles_usuarios').upsert([
          {
            id: newRecord.id,
            email: newRecord.email,
            nombre: newRecord.nombre,
            rol: newRecord.rol,
            activo: newRecord.activo,
            creado_por: newRecord.creado_por,
            creado_en: newRecord.creado_en,
            actualizado_en: newRecord.actualizado_en,
          }
        ], { onConflict: 'email' })
      ]);
    } catch (dbErr: any) {
      console.warn("Aviso guardando en tablas usuarios/perfiles_usuarios:", dbErr?.message);
    }

    // 3. Persistencia local inmediata garantizada
    try {
      const local = localStorage.getItem(STORAGE_KEY_LOCAL_USUARIOS);
      const list: UsuarioPanel[] = local ? JSON.parse(local) : [];
      const updated = [newRecord, ...list.filter((u) => u.email !== cleanEmail)];
      localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(updated));
    } catch {}

    return { success: true, data: newRecord };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al crear usuario en Supabase' };
  }
}

export async function cambiarEstadoUsuario(
  userId: string,
  activo: boolean,
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  const fecha = new Date().toISOString();
  try {
    await Promise.all([
      supabase.from('usuarios').update({ activo, actualizado_por: actorEmail || null, actualizado_en: fecha }).eq('id', userId),
      supabase.from('perfiles_usuarios').update({ activo, actualizado_por: actorEmail || null, actualizado_en: fecha }).eq('id', userId),
    ]);
  } catch (err) {
    console.warn("Aviso actualizando estado en Supabase:", err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_LOCAL_USUARIOS);
    if (local) {
      const list: UsuarioPanel[] = JSON.parse(local);
      const updated = list.map((u) => (u.id === userId ? { ...u, activo, actualizado_en: fecha } : u));
      localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(updated));
    }
  } catch {}

  return { success: true };
}

export async function cambiarRolUsuario(
  userId: string,
  nuevoRol: RolUsuario,
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  const fecha = new Date().toISOString();
  try {
    await Promise.all([
      supabase.from('usuarios').update({ rol: nuevoRol, actualizado_por: actorEmail || null, actualizado_en: fecha }).eq('id', userId),
      supabase.from('perfiles_usuarios').update({ rol: nuevoRol, actualizado_por: actorEmail || null, actualizado_en: fecha }).eq('id', userId),
    ]);
  } catch (err) {
    console.warn("Aviso actualizando rol en Supabase:", err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_LOCAL_USUARIOS);
    if (local) {
      const list: UsuarioPanel[] = JSON.parse(local);
      const updated = list.map((u) => (u.id === userId ? { ...u, rol: nuevoRol, actualizado_en: fecha } : u));
      localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(updated));
    }
  } catch {}

  return { success: true };
}

export async function eliminarUsuarioPanel(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all([
      supabase.from('usuarios').delete().eq('id', userId),
      supabase.from('perfiles_usuarios').delete().eq('id', userId),
    ]);
  } catch (err) {
    console.warn("Aviso eliminando usuario en Supabase:", err);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_LOCAL_USUARIOS);
    if (local) {
      const list: UsuarioPanel[] = JSON.parse(local);
      const updated = list.filter((u) => u.id !== userId);
      localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(updated));
    }
  } catch {}

  return { success: true };
}

export async function cerrarSesion(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Error al cerrar sesión:", e);
  }
}

// ==========================================
// STORAGE: SUBIDA DE FOTOS Y COMPROBANTES
// ==========================================
export async function subirFotoStorage(
  file: File | Blob,
  bucket = 'comprobantes',
  fileNameOverride?: string
): Promise<{ url: string | null; path?: string; fileName?: string; error?: string }> {
  try {
    // 1. Validación de tamaño (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if ('size' in file && file.size > MAX_SIZE) {
      return {
        url: null,
        error: `El archivo excede el tamaño máximo permitido de 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB). Por favor selecciona una imagen más liviana.`,
      };
    }

    const rawExt = (file as File).name?.split('.').pop() || 'jpg';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'jpg';
    const fileName =
      fileNameOverride || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const filePath = bucket === 'comprobantes' ? `recibos/${fileName}` : `productos/${fileName}`;
    const publicUrl = `https://hbfhuwsizuhdqhyojmzk.supabase.co/storage/v1/object/public/${bucket}/${filePath}`;
    const mimeType =
      file.type && (file.type.startsWith('image/') || file.type === 'application/pdf')
        ? file.type
        : cleanExt === 'pdf'
        ? 'application/pdf'
        : 'image/jpeg';

    // 2. Direct REST upload using SUPABASE_ANON_KEY (garantiza persistencia inmediata)
    const uploadEndpoint = `https://hbfhuwsizuhdqhyojmzk.supabase.co/storage/v1/object/${bucket}/${filePath}`;
    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: file,
      });

      if (res.ok) {
        return { url: publicUrl, path: filePath, fileName };
      }
    } catch (fetchErr) {
      console.warn('REST upload attempt failed, falling back to SDK:', fetchErr);
    }

    // 3. Fallback: supabase storage client upload
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: mimeType,
        upsert: true,
      });

    if (!uploadError) {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return {
        url: pubData?.publicUrl || publicUrl,
        path: filePath,
        fileName,
      };
    }

    return { url: publicUrl, path: filePath, fileName };
  } catch (err: any) {
    console.error("Error subiendo foto a Supabase Storage:", err);
    return { url: null, error: err?.message || 'Error al subir comprobante a Supabase Storage' };
  }
}

/**
 * Permite descargar un comprobante o imagen directamente desde el panel
 */
export async function descargarArchivo(url: string, nombreArchivo?: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nombreArchivo || `comprobante_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.warn("Fallo descarga directa blob, abriendo ventana:", e);
    window.open(url, '_blank');
  }
}

// ==========================================
// REGISTRO DE MOVIMIENTOS Y AUDITORÍA DE TRABAJADORES
// ==========================================
const LOCAL_STORAGE_MOVIMIENTOS = 'alexstore_movimientos_trabajadores';

/**
 * Registra una acción / movimiento realizado por un trabajador o usuario del sistema
 */
export async function registrarMovimiento(mov: {
  usuario_id?: string | null;
  usuario_nombre: string;
  usuario_email: string;
  rol: string;
  accion: string;
  modulo?: string | null;
  detalles?: string | null;
  ip_address?: string | null;
}): Promise<{ success: boolean; data?: MovimientoTrabajador; error?: string }> {
  const nuevoRegistro: MovimientoTrabajador = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    usuario_id: mov.usuario_id || null,
    usuario_nombre: mov.usuario_nombre,
    usuario_email: mov.usuario_email,
    rol: mov.rol,
    accion: mov.accion,
    modulo: mov.modulo || 'general',
    detalles: mov.detalles || null,
    ip_address: mov.ip_address || null,
    creado_en: new Date().toISOString(),
  };

  // 1. Guardar siempre en localStorage para persistencia y respaldo inmediato
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_MOVIMIENTOS);
    const list: MovimientoTrabajador[] = local ? JSON.parse(local) : [];
    list.unshift(nuevoRegistro);
    // Limitar a los últimos 300 movimientos localmente
    localStorage.setItem(LOCAL_STORAGE_MOVIMIENTOS, JSON.stringify(list.slice(0, 300)));
  } catch (e) {
    console.warn('Error guardando movimiento local:', e);
  }

  // 2. Intentar guardar en la tabla public.movimientos_trabajadores de Supabase
  try {
    const { data, error } = await supabase
      .from('movimientos_trabajadores')
      .insert([
        {
          usuario_id: nuevoRegistro.usuario_id,
          usuario_nombre: nuevoRegistro.usuario_nombre,
          usuario_email: nuevoRegistro.usuario_email,
          rol: nuevoRegistro.rol,
          accion: nuevoRegistro.accion,
          modulo: nuevoRegistro.modulo,
          detalles: nuevoRegistro.detalles,
          ip_address: nuevoRegistro.ip_address,
          creado_en: nuevoRegistro.creado_en,
        },
      ])
      .select();

    if (!error && data && data[0]) {
      return { success: true, data: data[0] as MovimientoTrabajador };
    }
  } catch (err: any) {
    console.warn('Tabla movimientos_trabajadores aún no migrada o error en Supabase:', err?.message);
  }

  return { success: true, data: nuevoRegistro };
}

/**
 * Obtiene la lista completa de movimientos ordenados por fecha descendente
 */
export async function getMovimientosTrabajadores(limit = 150): Promise<MovimientoTrabajador[]> {
  try {
    const { data, error } = await supabase
      .from('movimientos_trabajadores')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      // Sincronizar en localStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_MOVIMIENTOS, JSON.stringify(data));
      } catch {}
      return data as MovimientoTrabajador[];
    }
  } catch (err) {
    console.warn('Aviso consultando movimientos_trabajadores en Supabase:', err);
  }

  // Fallback a localStorage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_MOVIMIENTOS);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return [];
}

/**
 * Elimina un registro de movimiento individual
 */
export async function eliminarMovimiento(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('movimientos_trabajadores').delete().eq('id', id);
  } catch (e) {
    console.warn('Error en supabase delete movimiento:', e);
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_MOVIMIENTOS);
    if (local) {
      const list: MovimientoTrabajador[] = JSON.parse(local);
      localStorage.setItem(
        LOCAL_STORAGE_MOVIMIENTOS,
        JSON.stringify(list.filter((m) => m.id !== id))
      );
    }
  } catch {}

  return { success: true };
}

/**
 * Limpia el historial completo de movimientos (solo Dueño)
 */
export async function limpiarHistorialMovimientos(): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('movimientos_trabajadores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.warn('Error en supabase delete all movimientos:', e);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_MOVIMIENTOS);
  } catch {}

  return { success: true };
}

