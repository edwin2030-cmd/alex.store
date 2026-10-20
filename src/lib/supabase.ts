import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS_INICIALES } from '../data/initialData';
import { Categoria, Producto, Pedido, Venta, Gasto, UsuarioPanel, RolUsuario, EstadoPedido, MovimientoTrabajador } from '../types';

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
      tiene_variantes: Boolean(p.tiene_variantes),
      atributos: p.atributos || [],
      variantes: p.variantes || [],
      sku: p.sku || '',
      costo: p.costo || 0,
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
    costo?: number;
    categoria_id?: string;
    imagen_url?: string;
    imagenes?: string[];
    activo: boolean;
    sku?: string;
    tiene_variantes?: boolean;
    atributos?: any[];
    variantes?: any[];
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
          costo: producto.costo || 0,
          categoria_id: producto.categoria_id || null,
          imagen_url: producto.imagen_url || null,
          imagenes: producto.imagenes || [],
          activo: producto.activo,
          sku: producto.sku || null,
          tiene_variantes: producto.tiene_variantes ?? false,
          atributos: producto.atributos || [],
          variantes: producto.variantes || [],
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
    costo?: number;
    categoria_id?: string;
    imagen_url?: string;
    imagenes?: string[];
    activo: boolean;
    sku?: string;
    tiene_variantes?: boolean;
    atributos?: any[];
    variantes?: any[];
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
        costo: producto.costo || 0,
        categoria_id: producto.categoria_id || null,
        imagen_url: producto.imagen_url || null,
        imagenes: producto.imagenes || [],
        activo: producto.activo,
        sku: producto.sku || null,
        tiene_variantes: producto.tiene_variantes ?? false,
        atributos: producto.atributos || [],
        variantes: producto.variantes || [],
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
  id: string,
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

    const { error } = await supabase
      .from('pedidos')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarEstadoPagoPedido(
  id: string,
  nuevoEstadoPago: 'pendiente_revision' | 'verificado' | 'rechazado',
  revisadoPor?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({
        estado_pago: nuevoEstadoPago,
        revisado_por: revisadoPor || null,
        revisado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function vincularComprobanteAPedido(
  pedidoId: string,
  comprobanteUrl: string,
  comprobantePath?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({
        comprobante_url: comprobanteUrl,
        comprobante_path: comprobantePath || null,
        estado_pago: 'pendiente_revision',
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', pedidoId);

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

export async function eliminarVenta(idOrCodigo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCodigo);
    const query = supabase.from('ventas').delete();
    const { error } = isUuid ? await query.eq('id', idOrCodigo) : await query.eq('codigo', idOrCodigo);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarCliente(telefonoONombre: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPhone = telefonoONombre.replace(/\D/g, '');
    let filter = `cliente_nombre.eq.${telefonoONombre}`;
    if (cleanPhone.length >= 6) {
      filter = `cliente_telefono.ilike.%${cleanPhone}%,cliente_nombre.eq.${telefonoONombre}`;
    }
    const { error } = await supabase.from('pedidos').delete().or(filter);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
    const { error: errorPedido } = await supabase
      .from('pedidos')
      .update({
        estado: 'aprobado',
        estado_pago: 'verificado',
        revisado_por: aprobadoPor || 'Administrador',
        revisado_en: now,
        actualizado_en: now,
      })
      .eq('id', pedidoId);

    if (errorPedido) {
      console.warn('Aviso actualizando pedido en Supabase:', errorPedido);
    }

    // 2. Descontar stock automáticamente de cada producto o variante
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        const prodId = item.producto_id || item.id;
        const cant = Number(item.cantidad) || 1;

        try {
          const { data: prodData } = await supabase
            .from('productos')
            .select('id, stock, variantes, tiene_variantes')
            .eq('id', prodId)
            .maybeSingle();

          if (prodData) {
            const currentStock = Number(prodData.stock) || 0;
            const nuevoStock = Math.max(0, currentStock - cant);

            let nuevasVariantes = prodData.variantes;
            if (Array.isArray(nuevasVariantes) && (item.variante_id || item.variante_titulo)) {
              nuevasVariantes = nuevasVariantes.map((v: any) => {
                if (
                  (item.variante_id && v.id === item.variante_id) ||
                  (item.variante_titulo && v.titulo === item.variante_titulo)
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
                stock: nuevoStock,
                variantes: nuevasVariantes,
                actualizado_en: now,
              })
              .eq('id', prodId);
          }
        } catch (stockErr) {
          console.warn('Error descontando stock para item:', item.nombre, stockErr);
        }
      }
    }

    // 3. Registrar automáticamente la venta en el módulo de ventas
    const cleanCode = (pedido.codigo || '').replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
    const codigoVenta = `VNT-${cleanCode}`;

    await supabase.from('ventas').insert([
      {
        codigo: codigoVenta,
        pedido_id: pedido.id || pedidoId,
        cliente_nombre: pedido.cliente_nombre,
        cliente_telefono: pedido.cliente_telefono || null,
        metodo_pago: pedido.metodo_pago,
        total: Number(pedido.total) || 0,
        items: pedido.items,
        tipo: 'web',
        notas: `Venta generada automáticamente al aprobar el pedido ${pedido.codigo}. Aprobado por: ${aprobadoPor || 'Admin'}`,
        creado_en: now,
      },
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('Error en aprobarPedidoYDescontarStock:', err);
    return { success: false, error: err?.message || 'Error al aprobar pedido y descontar stock' };
  }
}

// ==========================================
// GASTOS & BALANCE FINANCIERO
// ==========================================
export async function getGastos(): Promise<Gasto[]> {
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error || !data) return [];
    return data as Gasto[];
  } catch {
    return [];
  }
}

export async function crearGasto(gasto: {
  concepto: string;
  monto: number;
  categoria: string;
  fecha?: string;
  notas?: string;
  creado_por?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const fecha = gasto.fecha || new Date().toISOString();
    const { data, error } = await supabase
      .from('gastos')
      .insert([
        {
          concepto: gasto.concepto,
          monto: Number(gasto.monto) || 0,
          categoria: gasto.categoria,
          fecha,
          notas: gasto.notas || null,
          creado_por: gasto.creado_por || null,
          creado_en: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarGasto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
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

export async function getUsuarios(): Promise<UsuarioPanel[]> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error || !data) {
      return [];
    }
    return data as UsuarioPanel[];
  } catch (err) {
    console.warn("Error cargando usuarios:", err);
    return [];
  }
}

export async function crearUsuarioPanel(data: {
  email: string;
  password: string;
  nombre: string;
  rol: RolUsuario;
  creadoPorEmail?: string;
}): Promise<{ success: boolean; data?: UsuarioPanel; error?: string }> {
  try {
    // 1. Probar RPC de base de datos si fue creada por la migración SQL
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('crear_usuario_panel', {
        p_email: data.email.trim(),
        p_password: data.password.trim(),
        p_nombre: data.nombre.trim(),
        p_rol: data.rol,
      });

      if (!rpcErr && rpcRes) {
        return { success: true, data: rpcRes };
      }
    } catch (e) {
      console.warn("RPC crear_usuario_panel no disponible, usando fallback Auth:", e);
    }

    // 2. Fallback: creación de cuenta mediante Supabase Auth con cliente aislado
    // (para no sobrescribir la sesión actual del administrador en el navegador)
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authErr } = await tempClient.auth.signUp({
      email: data.email.trim(),
      password: data.password.trim(),
      options: {
        data: {
          nombre: data.nombre.trim(),
          rol: data.rol,
        },
      },
    });

    if (authErr) {
      throw authErr;
    }

    const newUserId = authData.user?.id || `usr_${Date.now()}`;
    const newRecord: UsuarioPanel = {
      id: newUserId,
      email: data.email.trim(),
      nombre: data.nombre.trim(),
      rol: data.rol,
      activo: true,
      creado_por: data.creadoPorEmail || null,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };

    // Guardar en la tabla usuarios de Supabase
    const { error: insErr } = await supabase.from('usuarios').insert([
      {
        id: newRecord.id,
        email: newRecord.email,
        nombre: newRecord.nombre,
        rol: newRecord.rol,
        activo: newRecord.activo,
        creado_por: newRecord.creado_por,
      }
    ]);

    if (insErr) {
      console.warn("Aviso insertando en usuarios:", insErr.message);
    }

    return { success: true, data: newRecord };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al crear usuario' };
  }
}

export async function cambiarEstadoUsuario(
  userId: string,
  activo: boolean,
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({
        activo,
        actualizado_por: actorEmail || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cambiarRolUsuario(
  userId: string,
  nuevoRol: RolUsuario,
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({
        rol: nuevoRol,
        actualizado_por: actorEmail || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarUsuarioPanel(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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

