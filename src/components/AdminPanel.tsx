import React, { useState, useEffect, useMemo } from 'react';
import { AlexStoreLogo } from './AlexStoreLogo';
import {
  Categoria,
  Producto,
  Pedido,
  Venta,
  Gasto,
  UsuarioPanel,
  UserRole,
  ClienteResumen,
  MovimientoTrabajador,
  RegistroCaja,
  VentaManualItem,
} from '../types';
import {
  getProductos,
  getCategorias,
  getPedidos,
  getVentas,
  getGastos,
  crearGasto,
  eliminarGasto,
  aprobarPedidoYDescontarStock,
  eliminarProducto,
  eliminarCategoria,
  actualizarStockRapido,
  actualizarEstadoPedido,
  actualizarEstadoPagoPedido,
  vincularComprobanteAPedido,
  descargarArchivo,
  subirFotoStorage,
  crearVentaManual,
  liquidarSaldoVenta,
  eliminarPedido,
  eliminarTodosLosPedidos,
  eliminarVenta,
  eliminarTodasLasVentas,
  eliminarVentasPorIds,
  eliminarCliente,
  getMovimientosTrabajadores,
  registrarMovimiento,
  eliminarMovimiento,
  limpiarHistorialMovimientos,
  crearUsuarioPanel,
  getSesionCajaActiva,
  getHistorialCaja,
  abrirCaja,
  cerrarCaja,
  eliminarTodosLosGastos,
  eliminarGastosPorIds,
  actualizarStockPorTallas,
  supabase,
  CAJA_SYNC_BROADCAST,
} from '../lib/supabase';
import {
  ROLE_PERMISSIONS,
  canAccessSection,
  canModifyUser,
  getUsuariosList,
  actualizarUsuario,
  eliminarUsuario,
  guardarRolUsuarioAuth,
  getSavedUserProfile,
} from '../lib/auth';
import { ModalNuevoProducto } from './ModalNuevoProducto';
import { ModalNuevaCategoria } from './ModalNuevaCategoria';
import { ModalNuevoUsuario } from './ModalNuevoUsuario';
import { ModalEditarRol } from './ModalEditarRol';
import { ModalSqlAuth } from './ModalSqlAuth';
import { ModalStockTallasRapido } from './ModalStockTallasRapido';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Package,
  Layers,
  Boxes,
  Globe,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Phone,
  MessageCircle,
  Minus,
  Database,
  ExternalLink,
  X,
  Users,
  UserCheck,
  UserX,
  Lock,
  UserPlus,
  ShieldAlert,
  Calendar,
  Sparkles,
  Download,
  FileCheck,
  FileX,
  Clock,
  UploadCloud,
  ZoomIn,
  Check,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  KeyRound,
  Activity,
  ClipboardList,
  Menu,
  ChevronRight,
} from 'lucide-react';

interface AdminPanelProps {
  onExitAdmin: () => void;
  currentUser: UsuarioPanel | null;
  onLogout: () => void;
}

export type AdminSection =
  | 'dashboard'
  | 'pedidos'
  | 'ventas'
  | 'caja'
  | 'gastos'
  | 'movimientos'
  | 'productos'
  | 'categorias'
  | 'inventario'
  | 'clientes'
  | 'usuarios';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onExitAdmin,
  currentUser,
  onLogout,
}) => {
  // Mantener el usuario y rol activo blindados contra cualquier refresco de sesión o cambio de pestaña
  const [panelUser, setPanelUser] = useState<UsuarioPanel | null>(() => {
    return currentUser || getSavedUserProfile();
  });

  useEffect(() => {
    if (currentUser) {
      setPanelUser(currentUser);
      try {
        localStorage.setItem('alexstore_auth_profile', JSON.stringify(currentUser));
        localStorage.setItem('alexstore_active_role', currentUser.rol);
      } catch {}
    }
  }, [currentUser]);

  const activeUser = panelUser || currentUser || getSavedUserProfile();
  const savedActiveRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('alexstore_active_role') : null) as UserRole | null;
  const userRole: UserRole = activeUser?.rol || savedActiveRole || 'dueno';

  // El cajero empieza directamente en 'pedidos', el administrador y dueño en 'dashboard'
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    return userRole === 'cajero' ? 'pedidos' : 'dashboard';
  });

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioPanel[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoTrabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isModalProductoOpen, setIsModalProductoOpen] = useState(false);
  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);

  const [isModalCategoriaOpen, setIsModalCategoriaOpen] = useState(false);
  const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);

  const [isModalUsuarioOpen, setIsModalUsuarioOpen] = useState(false);
  const [isModalSqlAuthOpen, setIsModalSqlAuthOpen] = useState(false);
  const [usuarioToEditRole, setUsuarioToEditRole] = useState<UsuarioPanel | null>(null);

  const [isModalGastoOpen, setIsModalGastoOpen] = useState(false);
  const [nuevoGastoConcepto, setNuevoGastoConcepto] = useState('');
  const [nuevoGastoMonto, setNuevoGastoMonto] = useState('');
  const [nuevoGastoCategoria, setNuevoGastoCategoria] = useState('Mercancía e Inventario');
  const [nuevoGastoNotas, setNuevoGastoNotas] = useState('');
  const [submittingGasto, setSubmittingGasto] = useState(false);

  // Control de Apertura y Cierre de Caja
  const [sesionCaja, setSesionCaja] = useState<RegistroCaja | null>(null);
  const [historialCaja, setHistorialCaja] = useState<RegistroCaja[]>([]);
  const [isModalAbrirCajaOpen, setIsModalAbrirCajaOpen] = useState(false);
  const [isModalCerrarCajaOpen, setIsModalCerrarCajaOpen] = useState(false);
  const [montoAperturaCaja, setMontoAperturaCaja] = useState('50.00');
  const [notasAperturaCaja, setNotasAperturaCaja] = useState('');
  const [montoCierreReal, setMontoCierreReal] = useState('');
  const [notasCierreCaja, setNotasCierreCaja] = useState('');
  const [isCajaSubmitting, setIsCajaSubmitting] = useState(false);
  const [cajaMovimientosFiltro, setCajaMovimientosFiltro] = useState<'todos' | 'efectivo' | 'yappy' | 'transferencia' | 'pedidos' | 'gastos'>('todos');
  const [cierreModalFiltro, setCierreModalFiltro] = useState<'todos' | 'efectivo' | 'yappy' | 'transferencia' | 'pedidos' | 'gastos'>('todos');

  // Modal Registrar Venta Manual (con Efectivo, Yappy, Transferencia y Abono / Contra Entrega)
  const [isModalVentaManualOpen, setIsModalVentaManualOpen] = useState(false);
  const [ventaManualCliente, setVentaManualCliente] = useState('');
  const [ventaManualTelefono, setVentaManualTelefono] = useState('');
  const [ventaManualMetodo, setVentaManualMetodo] = useState<'efectivo' | 'yappy' | 'transferencia' | 'abono_contraentrega'>('efectivo');
  const [ventaManualTipoAbono, setVentaManualTipoAbono] = useState<'mitad' | 'personalizado' | 'cero'>('mitad');
  const [ventaManualMontoAbonado, setVentaManualMontoAbonado] = useState('');
  const [ventaManualMonto, setVentaManualMonto] = useState('');
  const [ventaManualProductoId, setVentaManualProductoId] = useState('');
  const [ventaManualCantidad, setVentaManualCantidad] = useState('1');
  const [ventaManualVarianteId, setVentaManualVarianteId] = useState('');
  const [ventaManualTalla, setVentaManualTalla] = useState('');
  const [ventaManualColor, setVentaManualColor] = useState('');
  const [ventaManualItems, setVentaManualItems] = useState<Array<{
    producto_id: string;
    nombre: string;
    precio: number;
    cantidad: number;
    subtotal: number;
    variante_id?: string;
    variante_titulo?: string;
    talla?: string;
    color?: string;
    imagen_url?: string;
  }>>([]);
  const [ventaManualNotas, setVentaManualNotas] = useState('');
  const [submittingVentaManual, setSubmittingVentaManual] = useState(false);
  const [liquidandoVentaId, setLiquidandoVentaId] = useState<string | null>(null);

  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<Pedido | null>(null);
  const [comprobanteToast, setComprobanteToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [uploadingProofOrderId, setUploadingProofOrderId] = useState<string | null>(null);
  const [copiedLinkOrderId, setCopiedLinkOrderId] = useState<string | null>(null);
  const [orderActionLoadingId, setOrderActionLoadingId] = useState<string | null>(null);

  // Filters inside sections
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  const [pedidoFilter, setPedidoFilter] = useState<'todos' | 'pendientes' | 'aprobados' | 'entregados' | 'cancelados'>('todos');
  const [inventarioFilter, setInventarioFilter] = useState<'todos' | 'disponibles' | 'stock-bajo' | 'agotados'>('todos');
  const [gastoFilter, setGastoFilter] = useState('todas');
  const [gastoFechaFilter, setGastoFechaFilter] = useState('');

  // Filtros de Auditoría y Movimientos
  const [movimientosSearch, setMovimientosSearch] = useState('');
  const [movimientosModuloFilter, setMovimientosModuloFilter] = useState('todos');
  const [movimientosRolFilter, setMovimientosRolFilter] = useState('todos');

  // User management filters and feedback
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'todos' | UserRole>('todos');
  const [userStatusFilter, setUserStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Estados para crear usuario en Supabase Authentication o vincular rol
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authNombreInput, setAuthNombreInput] = useState('');
  const [authRolSelected, setAuthRolSelected] = useState<UserRole>('cajero');
  const [savingAuthRole, setSavingAuthRole] = useState(false);
  const [showStorageDetails, setShowStorageDetails] = useState(false);

  // Clientes filter
  const [clienteSearch, setClienteSearch] = useState('');

  // Zoom de fotos de productos
  const [zoomedProductImage, setZoomedProductImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Cliente seleccionado para ver historial de pedidos
  const [clienteSeleccionadoParaPedidos, setClienteSeleccionadoParaPedidos] = useState<ClienteResumen | null>(null);

  // Filtros de fecha y período para Ventas
  const [ventasFiltroPeriodo, setVentasFiltroPeriodo] = useState<'todos' | 'hoy' | 'mes' | 'ano' | 'rango'>('todos');
  const [ventasFechaExacta, setVentasFechaExacta] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [ventasMesExacto, setVentasMesExacto] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [ventasAnoExacto, setVentasAnoExacto] = useState<string>(() => String(new Date().getFullYear()));
  const [ventasFechaDesde, setVentasFechaDesde] = useState<string>('');
  const [ventasFechaHasta, setVentasFechaHasta] = useState<string>('');

  // Filtro de fecha para Movimientos
  const [movimientosFechaFilter, setMovimientosFechaFilter] = useState<string>('');

  // Modal para ajuste rápido de stock por tallas directamente en Inventario
  const [productoAjustarTallas, setProductoAjustarTallas] = useState<Producto | null>(null);

  const reloadAllData = async () => {
    setLoading(true);
    try {
      const [prods, cats, peds, vnts, usrs, gsts, movs, cajaActiva, histCaja] = await Promise.all([
        getProductos(),
        getCategorias(),
        getPedidos(),
        getVentas(),
        getUsuariosList(),
        getGastos(),
        getMovimientosTrabajadores(),
        getSesionCajaActiva(),
        getHistorialCaja(),
      ]);
      setProductos(prods);
      setCategorias(cats);
      setPedidos(peds);
      setVentas(vnts);
      setUsuarios(usrs);
      setGastos(gsts);
      setMovimientos(movs);
      setSesionCaja((prev) => {
        if (cajaActiva) return cajaActiva;
        if (prev?.estado === 'abierta' && prev.fecha_apertura) {
          const age = Date.now() - new Date(prev.fecha_apertura).getTime();
          if (age < 20000) return prev;
        }
        return null;
      });
      setHistorialCaja(histCaja);
    } catch (e) {
      console.error("Error cargando panel admin:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAllData();
  }, []);

  // Sincronización continua en tiempo real del estado de caja entre múltiples navegadores y pestañas
  useEffect(() => {
    // 1. Polling periódico cada 3 segundos para detectar si otro navegador abrió o cerró caja
    const cajaPollInterval = setInterval(async () => {
      try {
        const sesionActualizada = await getSesionCajaActiva();
        setSesionCaja((prev) => {
          if (!prev && !sesionActualizada) return null;
          if (prev?.id === sesionActualizada?.id && prev?.estado === sesionActualizada?.estado) {
            return prev;
          }
          // Si el estado local se abrió hace menos de 15 segundos y la respuesta fue null por latencia, protegerlo
          if (!sesionActualizada && prev?.estado === 'abierta' && prev.fecha_apertura) {
            const diff = Date.now() - new Date(prev.fecha_apertura).getTime();
            if (diff < 15000) return prev;
          }
          return sesionActualizada;
        });
      } catch (err) {
        console.warn('Aviso polling estado caja:', err);
      }
    }, 3000);

    // 2. Al cambiar de pestaña o volver a enfocar la ventana, re-verificar de inmediato
    const handleSyncOnFocus = async () => {
      try {
        const sesionActualizada = await getSesionCajaActiva();
        if (sesionActualizada) {
          setSesionCaja(sesionActualizada);
        } else {
          setSesionCaja((prev) => {
            if (prev?.estado === 'abierta' && prev.fecha_apertura) {
              const diff = Date.now() - new Date(prev.fecha_apertura).getTime();
              if (diff < 15000) return prev;
            }
            return null;
          });
        }
      } catch {}
    };

    window.addEventListener('visibilitychange', handleSyncOnFocus);
    window.addEventListener('focus', handleSyncOnFocus);

    // 3. Sincronización instantánea entre pestañas abiertas
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel(CAJA_SYNC_BROADCAST);
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'CAJA_UPDATED') {
            setSesionCaja(event.data.sesion || null);
          }
        };
      }
    } catch {}

    // 4. Sincronización por eventos locales y de almacenamiento
    const handleCajaCustomEvent = (e: any) => {
      if (e.detail !== undefined) {
        setSesionCaja(e.detail);
      }
    };
    window.addEventListener('caja-status-changed', handleCajaCustomEvent);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'alexstore_local_caja_activa') {
        if (!e.newValue) {
          setSesionCaja(null);
        } else {
          try {
            setSesionCaja(JSON.parse(e.newValue));
          } catch {}
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 5. Suscripción Supabase Realtime a cambios en registros_caja
    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel('caja_sync_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'registros_caja' },
          async () => {
            const sesionActualizada = await getSesionCajaActiva();
            setSesionCaja(sesionActualizada);
          }
        )
        .subscribe();
    } catch {}

    return () => {
      clearInterval(cajaPollInterval);
      window.removeEventListener('visibilitychange', handleSyncOnFocus);
      window.removeEventListener('focus', handleSyncOnFocus);
      window.removeEventListener('caja-status-changed', handleCajaCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      if (broadcastChannel) broadcastChannel.close();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Asegurar que si el rol del usuario cambia, no permanezca en una sección restringida
  useEffect(() => {
    if (!canAccessSection(userRole, activeSection)) {
      setActiveSection(userRole === 'cajero' ? 'pedidos' : 'dashboard');
    }
  }, [userRole, activeSection]);

  // Stats calculation
  const totalProductos = productos.length;
  const activosVisibles = productos.filter((p) => p.activo).length;
  const totalCategorias = categorias.length;
  const stockBajoCount = productos.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).length;
  const agotadosCount = productos.filter((p) => (p.stock ?? 0) <= 0).length;

  const ingresosTotales = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalVentasGanado = useMemo(() => {
    return ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  }, [ventas]);
  const totalGastosMonto = useMemo(() => {
    return gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  }, [gastos]);
  const totalNetoGanancia = useMemo(() => {
    return totalVentasGanado - totalGastosMonto;
  }, [totalVentasGanado, totalGastosMonto]);

  // Métricas de Espacio de Almacenamiento & Base de Datos (Supabase Free Tier Quota)
  const metricasEspacio = useMemo(() => {
    const totalFotosProductos = productos.reduce(
      (acc, p) => acc + (p.imagenes && p.imagenes.length > 0 ? p.imagenes.length : p.imagen_url ? 1 : 0),
      0
    );
    const totalComprobantes = pedidos.filter((p) => p.comprobante_url).length;
    const mbFotosProductos = Math.round(totalFotosProductos * 0.25 * 10) / 10;
    const mbComprobantes = Math.round(totalComprobantes * 0.35 * 10) / 10;
    const mbStorageUsado = Math.round((mbFotosProductos + mbComprobantes) * 10) / 10;
    const mbStorageTotal = 1024; // 1 GB en tier gratuito de Supabase
    const mbStorageLibre = Math.max(0, Math.round((mbStorageTotal - mbStorageUsado) * 10) / 10);
    const porcentajeStorageUsado = Math.min(100, Math.round((mbStorageUsado / mbStorageTotal) * 100));

    // Capacidad restante estimada:
    const fotosRestantesEstimadas = Math.floor(mbStorageLibre / 0.3); // ~300KB por foto
    const productosRestantesEstimados = Math.floor(mbStorageLibre / 0.6); // ~2 fotos por producto

    // Estimación Base de Datos (Tablas): 500 MB en tier gratuito de Supabase
    const totalFilasTablas =
      pedidos.length + ventas.length + gastos.length + productos.length + categorias.length + usuarios.length;
    const mbBaseDatosUsado = Math.round((totalFilasTablas * 0.005 + 1.2) * 10) / 10; // ~1.2MB overhead inicial
    const mbBaseDatosTotal = 500;
    const mbBaseDatosLibre = Math.max(0, Math.round((mbBaseDatosTotal - mbBaseDatosUsado) * 10) / 10);
    const porcentajeBaseDatosUsado = Math.min(100, Math.round((mbBaseDatosUsado / mbBaseDatosTotal) * 100));

    return {
      totalFotosProductos,
      totalComprobantes,
      mbFotosProductos,
      mbComprobantes,
      mbStorageUsado,
      mbStorageTotal,
      mbStorageLibre,
      porcentajeStorageUsado,
      fotosRestantesEstimadas,
      productosRestantesEstimados,
      totalFilasTablas,
      mbBaseDatosUsado,
      mbBaseDatosTotal,
      mbBaseDatosLibre,
      porcentajeBaseDatosUsado,
    };
  }, [productos, pedidos, ventas, gastos, categorias, usuarios]);

  const pedidosPendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
  const pedidosAprobados = pedidos.filter((p) => p.estado === 'aprobado' || p.estado === 'entregado').length;
  const volumenTotalPedidos = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);

  const getDuracionCaja = (fechaInicio?: string, fechaFin?: string) => {
    if (!fechaInicio) return '—';
    const start = new Date(fechaInicio).getTime();
    const end = fechaFin ? new Date(fechaFin).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}m`;
  };

  // Extracción consolidada de clientes basada prioritariamente en el NÚMERO DE TELÉFONO
  const clientesList: ClienteResumen[] = useMemo(() => {
    const map: Record<string, ClienteResumen> = {};

    // 1. Procesar pedidos agrupando por teléfono
    pedidos.forEach((p) => {
      const rawPhone = (p.cliente_telefono || '').trim();
      const cleanDigits = rawPhone.replace(/\D/g, '');
      // La clave primaria obligatoria es el teléfono del cliente
      const phoneKey = cleanDigits.length >= 6 ? cleanDigits : (rawPhone || p.cliente_nombre.toLowerCase().trim());
      if (!phoneKey) return;

      if (!map[phoneKey]) {
        map[phoneKey] = {
          nombre: p.cliente_nombre || 'Cliente',
          telefono: rawPhone || 'Sin teléfono',
          direccion: p.cliente_direccion || undefined,
          totalPedidos: 0,
          totalGastado: 0,
          ultimoPedidoFecha: p.creado_en,
        };
      }

      map[phoneKey].totalPedidos += 1;
      map[phoneKey].totalGastado += Number(p.total) || 0;

      // Mantener el nombre más descriptivo
      if (p.cliente_nombre && map[phoneKey].nombre.toLowerCase().includes('cliente') && !p.cliente_nombre.toLowerCase().includes('cliente')) {
        map[phoneKey].nombre = p.cliente_nombre;
      }
      if (p.cliente_direccion && !map[phoneKey].direccion) {
        map[phoneKey].direccion = p.cliente_direccion;
      }
      if (p.creado_en && (!map[phoneKey].ultimoPedidoFecha || new Date(p.creado_en) > new Date(map[phoneKey].ultimoPedidoFecha!))) {
        map[phoneKey].ultimoPedidoFecha = p.creado_en;
      }
    });

    // 2. Procesar ventas registradas (incluye ventas manuales con teléfono)
    ventas.forEach((v) => {
      const rawPhone = (v.cliente_telefono || '').trim();
      const cleanDigits = rawPhone.replace(/\D/g, '');
      const phoneKey = cleanDigits.length >= 6 ? cleanDigits : (rawPhone || v.cliente_nombre.toLowerCase().trim());
      if (!phoneKey) return;

      if (!map[phoneKey]) {
        map[phoneKey] = {
          nombre: v.cliente_nombre || 'Cliente',
          telefono: rawPhone || 'Sin teléfono',
          direccion: undefined,
          totalPedidos: 0,
          totalGastado: 0,
          ultimoPedidoFecha: v.creado_en,
        };
      }

      // Si la venta no viene de un pedido ya contado
      if (!v.pedido_id) {
        map[phoneKey].totalPedidos += 1;
        map[phoneKey].totalGastado += Number(v.total) || 0;
      }

      if (v.creado_en && (!map[phoneKey].ultimoPedidoFecha || new Date(v.creado_en) > new Date(map[phoneKey].ultimoPedidoFecha!))) {
        map[phoneKey].ultimoPedidoFecha = v.creado_en;
      }
    });

    return Object.values(map);
  }, [pedidos, ventas]);

  // Handlers
  const handleDeleteProducto = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar "${nombre}" de Supabase?`)) {
      await eliminarProducto(id);
      await reloadAllData();
    }
  };

  const handleDeleteCategoria = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?`)) {
      await eliminarCategoria(id);
      await reloadAllData();
    }
  };

  const handleVaciarPedidos = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas ELIMINAR TODOS los pedidos de Supabase? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      await eliminarTodosLosPedidos();
      await reloadAllData();
      setUserFeedback({ type: 'success', msg: '✅ Todos los pedidos han sido eliminados de Supabase.' });
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (e: any) {
      alert('Error eliminando pedidos: ' + e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVaciarVentas = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas ELIMINAR TODAS las ventas registradas de Supabase?')) return;
    setLoading(true);
    try {
      await eliminarTodasLasVentas();
      await reloadAllData();
      setUserFeedback({ type: 'success', msg: '✅ Todas las ventas han sido eliminadas de Supabase.' });
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (e: any) {
      alert('Error eliminando ventas: ' + e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarVentasFiltradas = async (ventasABorrar: Venta[]) => {
    if (ventasABorrar.length === 0) return;
    if (!confirm(`⚠️ ¿Deseas eliminar permanentemente las ${ventasABorrar.length} venta(s) filtradas del período seleccionado de Supabase?`)) return;
    setLoading(true);
    try {
      const ids = ventasABorrar.map((v) => v.id || v.codigo);
      await eliminarVentasPorIds(ids);
      await reloadAllData();
      setUserFeedback({ type: 'success', msg: `✅ Se eliminaron ${ventasABorrar.length} ventas de Supabase.` });
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (e: any) {
      alert('Error eliminando ventas filtradas: ' + e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVaciarGastos = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas ELIMINAR TODOS los gastos registrados de Supabase?')) return;
    setLoading(true);
    try {
      await eliminarTodosLosGastos();
      await reloadAllData();
      setUserFeedback({ type: 'success', msg: '✅ Todos los gastos han sido eliminados de Supabase.' });
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (e: any) {
      alert('Error eliminando gastos: ' + e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarGastosFiltrados = async (gastosABorrar: Gasto[]) => {
    if (gastosABorrar.length === 0) return;
    if (!confirm(`⚠️ ¿Deseas eliminar los ${gastosABorrar.length} gastos filtrados de Supabase?`)) return;
    setLoading(true);
    try {
      const ids = gastosABorrar.map((g) => g.id || '').filter(Boolean);
      await eliminarGastosPorIds(ids);
      await reloadAllData();
      setUserFeedback({ type: 'success', msg: `✅ Se eliminaron ${gastosABorrar.length} gastos de Supabase.` });
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (e: any) {
      alert('Error: ' + e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockDelta = async (prodId: string, currentStock: number, delta: number) => {
    const nextStock = Math.max(0, currentStock + delta);
    const targetProd = productos.find((p) => p.id === prodId);
    await actualizarStockRapido(prodId, nextStock);
    setProductos((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, stock: nextStock } : p))
    );
    registrarMovimiento({
      usuario_id: currentUser?.id,
      usuario_nombre: currentUser?.nombre || 'Usuario',
      usuario_email: currentUser?.email || '',
      rol: currentUser?.rol || 'cajero',
      accion: 'Ajustó Stock',
      modulo: 'inventario',
      detalles: `Ajustó stock de "${targetProd?.nombre || 'Producto'}" a ${nextStock} unidades (${delta > 0 ? '+' : ''}${delta}).`,
    }).then(() => getMovimientosTrabajadores().then(setMovimientos));
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    if (userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta') && (newStatus === 'aprobado' || newStatus === 'entregado')) {
      alert('⚠️ LA CAJA ESTÁ CERRADA: Como trabajador, no puedes aprobar ni entregar pedidos mientras la caja esté cerrada. Pide al Dueño o Administrador que abra el turno de caja.');
      return;
    }
    const targetPed = pedidos.find((p) => p.id === orderId || p.codigo === orderId);
    if (newStatus === 'aprobado' && targetPed && targetPed.estado !== 'aprobado' && targetPed.estado !== 'entregado') {
      await handleAprobarPedido(targetPed);
      return;
    }
    await actualizarEstadoPedido(orderId, newStatus as any);
    setPedidos((prev) =>
      prev.map((p) => (p.id === orderId ? { ...p, estado: newStatus as any } : p))
    );
    registrarMovimiento({
      usuario_id: currentUser?.id,
      usuario_nombre: currentUser?.nombre || 'Usuario',
      usuario_email: currentUser?.email || '',
      rol: currentUser?.rol || 'cajero',
      accion: 'Cambió Estado Pedido',
      modulo: 'pedidos',
      detalles: `Cambió estado del pedido ${targetPed?.codigo || orderId} a "${newStatus.toUpperCase()}".`,
    }).then(() => getMovimientosTrabajadores().then(setMovimientos));
  };

  const handleUpdatePaymentProofStatus = async (
    orderId: string,
    orderCode: string,
    newProofStatus: 'pendiente_revision' | 'verificado' | 'rechazado'
  ) => {
    const res = await actualizarEstadoPagoPedido(
      orderId,
      newProofStatus,
      currentUser?.nombre || currentUser?.email
    );
    if (res.success) {
      setPedidos((prev) =>
        prev.map((p) => (p.id === orderId ? { ...p, estado_pago: newProofStatus } : p))
      );
      if (selectedOrderForProof && (selectedOrderForProof.id === orderId || selectedOrderForProof.codigo === orderCode)) {
        setSelectedOrderForProof((prev) => (prev ? { ...prev, estado_pago: newProofStatus } : null));
      }
      const label =
        newProofStatus === 'verificado'
          ? 'VERIFICADO Y APROBADO'
          : newProofStatus === 'rechazado'
          ? 'RECHAZADO'
          : 'PENDIENTE DE REVISIÓN';
      setComprobanteToast({
        msg: `Comprobante de orden ${orderCode} marcado como: ${label}`,
        type: 'success',
      });
      setTimeout(() => setComprobanteToast(null), 3500);

      registrarMovimiento({
        usuario_id: currentUser?.id,
        usuario_nombre: currentUser?.nombre || 'Usuario',
        usuario_email: currentUser?.email || '',
        rol: currentUser?.rol || 'cajero',
        accion: `Comprobante: ${newProofStatus.toUpperCase()}`,
        modulo: 'pedidos',
        detalles: `Marcó comprobante de pago de la orden ${orderCode} como "${label}".`,
      }).then(() => getMovimientosTrabajadores().then(setMovimientos));
    } else {
      setComprobanteToast({
        msg: res.error || 'Error al actualizar estado del comprobante.',
        type: 'error',
      });
      setTimeout(() => setComprobanteToast(null), 3500);
    }
  };

  const handleAttachReceiptToOrder = async (order: Pedido, file: File) => {
    setUploadingProofOrderId(order.id || order.codigo);
    try {
      const res = await subirFotoStorage(file, 'comprobantes', `recibo_${order.codigo}_${Date.now()}.jpg`);
      if (res.url) {
        await vincularComprobanteAPedido(order.id || '', res.url, res.path);
        setPedidos((prev) =>
          prev.map((p) =>
            (p.id === order.id || p.codigo === order.codigo)
              ? { ...p, comprobante_url: res.url, comprobante_path: res.path, estado_pago: 'pendiente_revision' }
              : p
          )
        );
        setComprobanteToast({
          msg: `Comprobante subido y vinculado exitosamente a la orden ${order.codigo}.`,
          type: 'success',
        });
        setTimeout(() => setComprobanteToast(null), 3500);
      } else {
        alert(res.error || 'No se pudo subir la foto del comprobante.');
      }
    } catch (e: any) {
      alert('Error al subir: ' + e?.message);
    } finally {
      setUploadingProofOrderId(null);
    }
  };

  const handleToggleUserActive = async (targetUser: UsuarioPanel) => {
    if (!currentUser) return;
    setUserFeedback(null);
    const newStatus = !targetUser.activo;
    const res = await actualizarUsuario(targetUser.id, { activo: newStatus }, currentUser.email, currentUser.rol);
    if (res.success) {
      setUserFeedback({
        type: 'success',
        msg: `El usuario "${targetUser.nombre}" ahora está ${newStatus ? 'ACTIVO' : 'INACTIVO'}.`,
      });
      const updated = await getUsuariosList();
      setUsuarios(updated);
    } else {
      setUserFeedback({ type: 'error', msg: res.error || 'Error al actualizar estado.' });
    }
  };

  const handleDeleteUser = async (targetUser: UsuarioPanel) => {
    if (!currentUser) return;
    setUserFeedback(null);
    if (!confirm(`¿Estás seguro de eliminar permanentemente a "${targetUser.nombre}" (${targetUser.email})?`)) {
      return;
    }
    const res = await eliminarUsuario(targetUser.id, currentUser.email, currentUser.rol);
    if (res.success) {
      setUserFeedback({ type: 'success', msg: `Usuario "${targetUser.nombre}" eliminado correctamente.` });
      const updated = await getUsuariosList();
      setUsuarios(updated);
    } else {
      setUserFeedback({ type: 'error', msg: res.error || 'Error al eliminar usuario.' });
    }
  };

  const handleGenerateAuthPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = 'Alex';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generated += '26!';
    setAuthPasswordInput(generated);
    setAuthShowPassword(true);
  };

  const handleGuardarUsuarioAuthDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmailInput.trim().toLowerCase();
    const cleanNombre = authNombreInput.trim() || cleanEmail.split('@')[0];
    const cleanPass = authPasswordInput.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Ingresa un correo electrónico válido.');
      return;
    }

    setSavingAuthRole(true);
    try {
      let res;
      // Si el usuario especificó una contraseña, creamos la cuenta en Supabase Authentication
      if (cleanPass) {
        if (cleanPass.length < 6) {
          alert('La contraseña debe tener un mínimo de 6 caracteres para registrarse en Supabase Authentication.');
          setSavingAuthRole(false);
          return;
        }
        res = await crearUsuarioPanel({
          email: cleanEmail,
          password: cleanPass,
          nombre: cleanNombre,
          rol: authRolSelected,
          creadoPorEmail: currentUser?.email,
        });
      } else {
        // Si no ingresó contraseña, vinculamos rol a una cuenta ya existente en Supabase Authentication
        res = await guardarRolUsuarioAuth(cleanEmail, authRolSelected, cleanNombre);
      }

      if (res.success) {
        setUserFeedback({
          type: 'success',
          msg: `¡Usuario ${cleanEmail} guardado exitosamente en Supabase como ${authRolSelected === 'dueno' ? '👑 DUEÑO' : '💼 TRABAJADOR'}! Ya puede iniciar sesión con su correo y contraseña.`,
        });
        setAuthEmailInput('');
        setAuthNombreInput('');
        setAuthPasswordInput('');

        // Registrar en auditoría
        registrarMovimiento({
          usuario_id: currentUser?.id,
          usuario_nombre: currentUser?.nombre || 'Dueño',
          usuario_email: currentUser?.email || '',
          rol: currentUser?.rol || 'dueno',
          accion: 'Creó Usuario en Supabase',
          modulo: 'usuarios',
          detalles: `Registró usuario "${cleanNombre}" (${cleanEmail}) con rol ${authRolSelected.toUpperCase()} en Supabase.`,
        }).then(() => getMovimientosTrabajadores().then(setMovimientos));

        await reloadAllData();
        setTimeout(() => setUserFeedback(null), 5000);
      } else {
        alert(res.error || 'Error al guardar usuario en Supabase.');
      }
    } finally {
      setSavingAuthRole(false);
    }
  };

  const handleCambiarRolDirecto = async (u: UsuarioPanel, nuevoRol: UserRole) => {
    const res = await guardarRolUsuarioAuth(u.email, nuevoRol, u.nombre);
    if (res.success) {
      setUserFeedback({
        type: 'success',
        msg: `Rol de ${u.email} cambiado exitosamente a ${nuevoRol === 'dueno' ? '👑 DUEÑO' : '💼 TRABAJADOR'}.`,
      });
      await reloadAllData();
      setTimeout(() => setUserFeedback(null), 3500);
    } else {
      alert(res.error || 'Error al cambiar rol.');
    }
  };

  const handleAprobarPedido = async (pedido: Pedido) => {
    if (userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')) {
      alert('⚠️ LA CAJA ESTÁ CERRADA: Como trabajador, no puedes aceptar pedidos mientras la caja esté cerrada. Pide al Dueño o Administrador que abra el turno de caja.');
      return;
    }
    const orderId = pedido.id || pedido.codigo;
    setOrderActionLoadingId(orderId);
    try {
      const reviewer = currentUser?.nombre || currentUser?.email || 'Administrador';
      const res = await aprobarPedidoYDescontarStock(orderId, pedido, reviewer);
      if (res.success) {
        // Descontar inventario localmente en tiempo real para respuesta inmediata en la UI
        if (pedido.items && pedido.items.length > 0) {
          setProductos((prev) =>
            prev.map((prod) => {
              const itemMatch = pedido.items.find(
                (it) => it.producto_id === prod.id || it.id === prod.id
              );
              if (!itemMatch) return prod;

              // Descontar talla específica de tallas_stock
              let nextTallasStock = prod.tallas_stock ? { ...prod.tallas_stock } : undefined;
              if (nextTallasStock && itemMatch.talla) {
                const search = itemMatch.talla.trim().toLowerCase();
                const targetKey = Object.keys(nextTallasStock).find(
                  (k) => k.toLowerCase() === search || search.includes(k.toLowerCase())
                );
                if (targetKey) {
                  const curr = Number(nextTallasStock[targetKey]) || 0;
                  nextTallasStock[targetKey] = Math.max(0, curr - itemMatch.cantidad);
                }
              }

              const nextStock =
                nextTallasStock && Object.keys(nextTallasStock).length > 0
                  ? Object.values(nextTallasStock).reduce((sum, q) => sum + (Number(q) || 0), 0)
                  : Math.max(0, (prod.stock ?? 0) - itemMatch.cantidad);

              let nextVars = prod.variantes;
              if (Array.isArray(nextVars)) {
                nextVars = nextVars.map((v) => {
                  const isMatch =
                    (itemMatch.variante_id && v.id === itemMatch.variante_id) ||
                    (itemMatch.variante_titulo && v.titulo === itemMatch.variante_titulo) ||
                    (itemMatch.talla && (
                      (v.opciones?.Talla && v.opciones.Talla.toLowerCase() === itemMatch.talla.toLowerCase()) ||
                      (v.titulo && v.titulo.toLowerCase().includes(itemMatch.talla.toLowerCase()))
                    ));
                  if (isMatch) {
                    return { ...v, stock: Math.max(0, (v.stock ?? 0) - itemMatch.cantidad) };
                  }
                  return v;
                });
              }
              return { ...prod, stock: nextStock, tallas_stock: nextTallasStock, variantes: nextVars };
            })
          );
        }

        // Marcar pedido como aprobado y verificado
        const now = new Date().toISOString();
        setPedidos((prev) =>
          prev.map((p) =>
            p.id === pedido.id || p.codigo === pedido.codigo
              ? {
                  ...p,
                  estado: 'aprobado',
                  estado_pago: 'verificado',
                  revisado_por: reviewer,
                  revisado_en: now,
                }
              : p
          )
        );

        // Registrar venta en tiempo real en la lista de ventas
        const codigoVenta = `VNT-${(pedido.codigo || '').replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000)}`;
        const nuevaVenta: Venta = {
          codigo: codigoVenta,
          pedido_id: pedido.id || null,
          cliente_nombre: pedido.cliente_nombre,
          cliente_telefono: pedido.cliente_telefono || null,
          metodo_pago: pedido.metodo_pago,
          total: pedido.total,
          items: pedido.items,
          tipo: 'web',
          notas: `Venta generada automáticamente al aprobar pedido ${pedido.codigo}.`,
          creado_en: now,
        };
        setVentas((prev) => [nuevaVenta, ...prev]);

        setComprobanteToast({
          msg: `✅ ¡Pedido ${pedido.codigo} aceptado con éxito! Se descontó del inventario y se registró automáticamente en Ventas.`,
          type: 'success',
        });
        setTimeout(() => setComprobanteToast(null), 5000);

        // Recargar datos para garantizar sincronización exacta con las tablas de Supabase
        reloadAllData();

        registrarMovimiento({
          usuario_id: currentUser?.id,
          usuario_nombre: reviewer,
          usuario_email: currentUser?.email || '',
          rol: currentUser?.rol || 'cajero',
          accion: 'Aprobó Pedido',
          modulo: 'pedidos',
          detalles: `Aprobó pedido ${pedido.codigo} (Cliente: ${pedido.cliente_nombre}) por $${pedido.total.toFixed(2)}, descontó inventario y registró en Ventas.`,
        }).then(() => getMovimientosTrabajadores().then(setMovimientos));
      } else {
        alert(res.error || 'Error al aprobar pedido.');
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleRechazarPedido = async (pedido: Pedido) => {
    if (!confirm(`¿Estás seguro de rechazar el pedido ${pedido.codigo}?`)) return;
    const orderId = pedido.id || pedido.codigo;
    setOrderActionLoadingId(orderId);
    try {
      const reviewer = currentUser?.nombre || currentUser?.email || 'Administrador';
      await actualizarEstadoPedido(orderId, 'rechazado');
      await actualizarEstadoPagoPedido(orderId, 'rechazado', reviewer);
      const now = new Date().toISOString();
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedido.id || p.codigo === pedido.codigo
            ? {
                ...p,
                estado: 'rechazado',
                estado_pago: 'rechazado',
                revisado_por: reviewer,
                revisado_en: now,
              }
            : p
        )
      );
      setComprobanteToast({
        msg: `Pedido ${pedido.codigo} marcado como RECHAZADO.`,
        type: 'error',
      });
      setTimeout(() => setComprobanteToast(null), 4000);

      registrarMovimiento({
        usuario_id: currentUser?.id,
        usuario_nombre: reviewer,
        usuario_email: currentUser?.email || '',
        rol: currentUser?.rol || 'cajero',
        accion: 'Rechazó Pedido',
        modulo: 'pedidos',
        detalles: `Rechazó pedido ${pedido.codigo} (Cliente: ${pedido.cliente_nombre}).`,
      }).then(() => getMovimientosTrabajadores().then(setMovimientos));
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleCrearGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(nuevoGastoMonto);
    if (!nuevoGastoConcepto.trim() || isNaN(montoNum) || montoNum <= 0) {
      alert('Por favor ingresa un concepto válido y un monto mayor a $0.');
      return;
    }
    setSubmittingGasto(true);
    try {
      const res = await crearGasto({
        concepto: nuevoGastoConcepto.trim(),
        monto: montoNum,
        categoria: nuevoGastoCategoria,
        notas: nuevoGastoNotas.trim() || undefined,
        creado_por: currentUser?.nombre || currentUser?.email || 'Admin',
      });
      if (res.success && res.data) {
        const gastoCreado = res.data;
        setGastos((prev) => [gastoCreado, ...prev]);
        setNuevoGastoConcepto('');
        setNuevoGastoMonto('');
        setNuevoGastoNotas('');
        setIsModalGastoOpen(false);
        setUserFeedback({
          type: 'success',
          msg: `Gasto registrado por $${montoNum.toFixed(2)}. Se ha descontado automáticamente de los ingresos brutos reflejando la ganancia neta.`,
        });
        setTimeout(() => setUserFeedback(null), 4500);
      } else {
        alert(res.error || 'Error al registrar el gasto.');
      }
    } finally {
      setSubmittingGasto(false);
    }
  };

  const handleEliminarGasto = async (id: string, concepto: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de gasto "${concepto}"?`)) return;
    const res = await eliminarGasto(id);
    if (res.success) {
      setGastos((prev) => prev.filter((g) => g.id !== id));
      setUserFeedback({
        type: 'success',
        msg: `Gasto "${concepto}" eliminado correctamente.`,
      });
      setTimeout(() => setUserFeedback(null), 3500);
    } else {
      alert(res.error || 'Error al eliminar');
    }
  };

  const handleEliminarVenta = async (idOrCodigo: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de venta ${idOrCodigo}?`)) return;
    const res = await eliminarVenta(idOrCodigo);
    if (res.success) {
      setVentas((prev) => prev.filter((v) => (v.id ? v.id !== idOrCodigo : v.codigo !== idOrCodigo)));
      setUserFeedback({
        type: 'success',
        msg: `Venta ${idOrCodigo} eliminada correctamente.`,
      });
      setTimeout(() => setUserFeedback(null), 3500);
    } else {
      alert(res.error || 'Error al eliminar la venta');
    }
  };

  const handleEliminarPedido = async (id: string, codigo: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente el pedido ${codigo}?`)) return;
    const res = await eliminarPedido(id);
    if (res.success) {
      setPedidos((prev) => prev.filter((p) => p.id !== id && p.codigo !== codigo));
      setUserFeedback({
        type: 'success',
        msg: `Pedido ${codigo} eliminado permanentemente.`,
      });
      setTimeout(() => setUserFeedback(null), 3500);
    } else {
      alert(res.error || 'Error al eliminar el pedido');
    }
  };

  const handleCrearVentaManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')) {
      alert('⚠️ LA CAJA ESTÁ CERRADA: Como trabajador, no puedes registrar ventas manuales mientras la caja esté cerrada. Pide al Dueño o Administrador que abra el turno de caja.');
      return;
    }
    const montoNum = parseFloat(ventaManualMonto);
    if (!ventaManualCliente.trim() || isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa el nombre del cliente y un monto válido mayor a $0.');
      return;
    }

    const cantNum = Math.max(1, parseInt(ventaManualCantidad) || 1);
    setSubmittingVentaManual(true);
    try {
      const cajeroActual = currentUser?.nombre || currentUser?.email?.split('@')[0] || 'Cajero';
      const selectedProd = productos.find((p) => p.id === ventaManualProductoId);
      let selectedVarTitulo = '';
      if (selectedProd && ventaManualVarianteId && Array.isArray(selectedProd.variantes)) {
        const vFound = selectedProd.variantes.find(
          (v: any) => v.id === ventaManualVarianteId || v.titulo === ventaManualVarianteId
        );
        if (vFound) {
          selectedVarTitulo = (vFound as any).titulo || (vFound as any).nombre || '';
        }
      }

      let itemsToSave: any[] = [];
      if (ventaManualItems.length > 0) {
        itemsToSave = ventaManualItems.map((it) => ({
          id: it.producto_id,
          producto_id: it.producto_id,
          nombre: it.nombre,
          precio: it.precio,
          cantidad: it.cantidad,
          variante_id: it.variante_id,
          variante_titulo: it.variante_titulo,
          talla: it.talla,
          color: it.color,
          imagen_url: it.imagen_url,
        }));
      } else if (selectedProd) {
        itemsToSave = [
          {
            id: selectedProd.id,
            producto_id: selectedProd.id,
            nombre: selectedProd.nombre,
            precio: montoNum,
            cantidad: cantNum,
            variante_id: ventaManualVarianteId || undefined,
            variante_titulo: selectedVarTitulo || undefined,
            talla: ventaManualTalla || undefined,
            color: ventaManualColor || undefined,
            imagen_url: selectedProd.imagen_url || (selectedProd.imagenes && selectedProd.imagenes[0]) || undefined,
          },
        ];
      }

      // Cálculo de abono y saldo pendiente
      let montoAbonado = montoNum;
      let metodoReal: string = ventaManualMetodo;
      if (ventaManualMetodo === 'abono_contraentrega') {
        if (ventaManualTipoAbono === 'mitad') {
          montoAbonado = Math.round((montoNum / 2) * 100) / 100;
          metodoReal = 'abono';
        } else if (ventaManualTipoAbono === 'cero') {
          montoAbonado = 0;
          metodoReal = 'contra_entrega';
        } else {
          const customAb = parseFloat(ventaManualMontoAbonado);
          montoAbonado = isNaN(customAb) ? 0 : Math.min(montoNum, Math.max(0, customAb));
          metodoReal = montoAbonado > 0 ? 'abono' : 'contra_entrega';
        }
      }

      const saldoPendiente = Math.max(0, montoNum - montoAbonado);
      const estadoPago =
        saldoPendiente === 0
          ? 'completo'
          : montoAbonado > 0
          ? 'abono_pendiente'
          : 'contra_entrega_pendiente';

      const res = await crearVentaManual({
        cliente_nombre: ventaManualCliente.trim(),
        cliente_telefono: ventaManualTelefono.trim() || undefined,
        metodo_pago: metodoReal,
        total: montoNum,
        monto_abonado: montoAbonado,
        saldo_pendiente: saldoPendiente,
        estado_pago: estadoPago,
        cajero_nombre: cajeroActual,
        registrado_por: cajeroActual,
        items: itemsToSave,
        tipo: 'manual',
        notas:
          ventaManualNotas.trim() ||
          (itemsToSave.length > 0
            ? `${itemsToSave.map((it) => `${it.nombre}${it.variante_titulo ? ` (${it.variante_titulo})` : ''} x${it.cantidad}`).join(', ')}${saldoPendiente > 0 ? ` • Abonó: $${montoAbonado.toFixed(2)}, Saldo al entregar: $${saldoPendiente.toFixed(2)}` : ''}`
            : saldoPendiente > 0 ? `Abonó: $${montoAbonado.toFixed(2)}, Saldo al entregar: $${saldoPendiente.toFixed(2)}` : undefined),
      });

      if (res.success && res.data) {
        const nuevaVenta = res.data;

        // Descontar inmediatamente en el estado local de productos por cada producto vendido
        if (itemsToSave.length > 0) {
          setProductos((prev) =>
            prev.map((prod) => {
              const matchedItems = itemsToSave.filter((it) => (it.producto_id || it.id) === prod.id);
              if (matchedItems.length === 0) return prod;
              const totalCantVendida = matchedItems.reduce((acc, it) => acc + (it.cantidad || 1), 0);

              let nextTallasStock = prod.tallas_stock ? { ...prod.tallas_stock } : undefined;
              const normSize = (s?: string) =>
                (s || '')
                  .toString()
                  .toLowerCase()
                  .replace(/^(talla|talle|size)\s*[:\-]?\s*/i, '')
                  .trim();

              if (nextTallasStock) {
                matchedItems.forEach((it) => {
                  const itemTallaNorm = normSize(it.talla || it.variante_titulo);
                  if (itemTallaNorm) {
                    let targetKey = Object.keys(nextTallasStock!).find(
                      (k) => normSize(k) === itemTallaNorm
                    );
                    if (!targetKey) {
                      targetKey = Object.keys(nextTallasStock!).find((k) => {
                        const nk = normSize(k);
                        if (!nk) return false;
                        const re1 = new RegExp(`(^|[^a-z0-9])${nk}([^a-z0-9]|$)`, 'i');
                        const re2 = new RegExp(`(^|[^a-z0-9])${itemTallaNorm}([^a-z0-9]|$)`, 'i');
                        return re1.test(itemTallaNorm) || re2.test(nk);
                      });
                    }
                    if (targetKey) {
                      const curr = Number(nextTallasStock![targetKey]) || 0;
                      nextTallasStock![targetKey] = Math.max(0, curr - (it.cantidad || 1));
                    }
                  }
                });
              }

              const nextStock =
                nextTallasStock && Object.keys(nextTallasStock).length > 0
                  ? Object.values(nextTallasStock).reduce((sum, q) => sum + (Number(q) || 0), 0)
                  : Math.max(0, (prod.stock ?? 0) - totalCantVendida);

              let nextVars = prod.variantes;
              if (Array.isArray(nextVars)) {
                nextVars = nextVars.map((v: any) => {
                  const vTallaNorm = normSize(v.opciones?.Talla || v.opciones?.talla || v.titulo);
                  const varMatch = matchedItems.find((it) => {
                    const itTallaNorm = normSize(it.talla || it.variante_titulo);
                    return (
                      (it.variante_id && v.id === it.variante_id) ||
                      (it.variante_titulo && v.titulo === it.variante_titulo) ||
                      (itTallaNorm && vTallaNorm && itTallaNorm === vTallaNorm)
                    );
                  });
                  if (varMatch) {
                    return { ...v, stock: Math.max(0, (v.stock ?? 0) - (varMatch.cantidad || 1)) };
                  }
                  return v;
                });
              }
              return { ...prod, stock: nextStock, tallas_stock: nextTallasStock, variantes: nextVars };
            })
          );
        }

        setVentas((prev) => [nuevaVenta, ...prev.filter((v) => v.codigo !== nuevaVenta.codigo)]);
        setIsModalVentaManualOpen(false);
        setVentaManualCliente('');
        setVentaManualTelefono('');
        setVentaManualMonto('');
        setVentaManualMontoAbonado('');
        setVentaManualTipoAbono('mitad');
        setVentaManualProductoId('');
        setVentaManualCantidad('1');
        setVentaManualVarianteId('');
        setVentaManualTalla('');
        setVentaManualColor('');
        setVentaManualItems([]);
        setVentaManualNotas('');
        setVentaManualMetodo('efectivo');

        // Sincronizar en segundo plano con Supabase para actualizar métricas de inventario
        reloadAllData();

        // Registrar auditoría
        registrarMovimiento({
          usuario_id: currentUser?.id,
          usuario_nombre: cajeroActual,
          usuario_email: currentUser?.email || '',
          rol: currentUser?.rol || 'cajero',
          accion: 'Registró Venta Manual',
          modulo: 'ventas',
          detalles: `Venta manual por $${montoNum.toFixed(2)} (${metodoReal.toUpperCase()}) para ${ventaManualCliente.trim()} (Tel: ${ventaManualTelefono.trim() || 'N/A'})${saldoPendiente > 0 ? ` [Abonado: $${montoAbonado.toFixed(2)} | Pendiente: $${saldoPendiente.toFixed(2)}]` : ''}${itemsToSave.length > 0 ? ` - ${itemsToSave.length} producto(s) vendidos` : ''}.`,
        }).then(() => getMovimientosTrabajadores().then(setMovimientos));

        setUserFeedback({
          type: 'success',
          msg: `¡Venta manual ${nuevaVenta.codigo} registrada con éxito! ${saldoPendiente > 0 ? `(Abono: $${montoAbonado.toFixed(2)} - Saldo por cobrar: $${saldoPendiente.toFixed(2)})` : ''} Se descontó automáticamente del inventario.`,
        });
        setTimeout(() => setUserFeedback(null), 4500);
      } else {
        alert(res.error || 'Error al registrar la venta manual.');
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setSubmittingVentaManual(false);
    }
  };

  const handleLiquidarVenta = async (idOrCodigo: string) => {
    if (!confirm('¿Confirmas que el cliente ya recibió el producto y terminó de pagar el saldo pendiente?')) return;
    setLiquidandoVentaId(idOrCodigo);
    try {
      const res = await liquidarSaldoVenta(idOrCodigo, currentUser?.nombre || 'Caja');
      if (res.success && res.data) {
        setVentas((prev) => prev.map((v) => (v.id === idOrCodigo || v.codigo === idOrCodigo ? res.data! : v)));
        setUserFeedback({
          type: 'success',
          msg: `¡Venta ${idOrCodigo} liquidada y completada con éxito! El saldo pendiente ha sido cobrado al entregar el producto.`,
        });
        setTimeout(() => setUserFeedback(null), 4500);
        reloadAllData();
      } else {
        alert(res.error || 'Error al liquidar saldo.');
      }
    } catch (e: any) {
      alert('Error: ' + e?.message);
    } finally {
      setLiquidandoVentaId(null);
    }
  };

  const handleAbrirCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inicial = parseFloat(montoAperturaCaja);
    if (isNaN(inicial) || inicial < 0) {
      alert('Por favor ingresa un monto inicial válido.');
      return;
    }
    setIsCajaSubmitting(true);
    try {
      const res = await abrirCaja({
        monto_inicial: inicial,
        abierto_por: currentUser?.nombre || currentUser?.email || 'Cajero',
        usuario_id: currentUser?.id,
        notas: notasAperturaCaja.trim() || undefined,
      });
      if (res.success && res.data) {
        setSesionCaja(res.data);
        setIsModalAbrirCajaOpen(false);
        setNotasAperturaCaja('');
        setUserFeedback({
          type: 'success',
          msg: `¡Turno de caja abierto correctamente con fondo inicial de $${inicial.toFixed(2)}!`,
        });
        setTimeout(() => setUserFeedback(null), 4500);
        reloadAllData();
      } else {
        alert(res.error || 'Error al abrir caja.');
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setIsCajaSubmitting(false);
    }
  };

  const handleCerrarCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesionCaja) return;
    const real = parseFloat(montoCierreReal);
    if (isNaN(real) || real < 0) {
      alert('Por favor ingresa el dinero en efectivo contado en gaveta.');
      return;
    }
    setIsCajaSubmitting(true);
    try {
      const fechaInicio = sesionCaja.fecha_apertura ? new Date(sesionCaja.fecha_apertura).getTime() : 0;
      const ventasEfectivoTurno = ventas
        .filter(
          (v) =>
            (v.metodo_pago === 'efectivo' || v.metodo_pago === 'abono' || v.metodo_pago === 'contra_entrega') &&
            v.creado_en &&
            new Date(v.creado_en).getTime() >= fechaInicio
        )
        .reduce((acc, v) => acc + (Number(v.monto_abonado !== undefined ? v.monto_abonado : v.total) || 0), 0);

      const gastosEfectivoTurno = gastos
        .filter((g) => g.creado_en && new Date(g.creado_en).getTime() >= fechaInicio)
        .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

      const inicial = Number(sesionCaja.monto_inicial) || 0;
      const esperado = inicial + ventasEfectivoTurno - gastosEfectivoTurno;
      const diferencia = real - esperado;

      const res = await cerrarCaja({
        sesionId: sesionCaja.id,
        monto_final_real: real,
        monto_esperado: esperado,
        diferencia,
        cerrado_por: currentUser?.nombre || currentUser?.email || 'Cajero',
        notas: notasCierreCaja.trim() || undefined,
      });

      if (res.success) {
        setSesionCaja(null);
        setIsModalCerrarCajaOpen(false);
        setMontoCierreReal('');
        setNotasCierreCaja('');
        setUserFeedback({
          type: 'success',
          msg: `¡Turno de caja cerrado y guardado! Contado: $${real.toFixed(2)}, Esperado: $${esperado.toFixed(2)}, Diferencia: $${diferencia.toFixed(2)}.`,
        });
        setTimeout(() => setUserFeedback(null), 5000);
        reloadAllData();
      } else {
        alert(res.error || 'Error al cerrar caja.');
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setIsCajaSubmitting(false);
    }
  };

  const handleEliminarCliente = async (cliente: ClienteResumen) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente al cliente con teléfono "${cliente.telefono}" (${cliente.nombre}) y todos sus registros de compras y ventas de Supabase?`)) return;
    const res = await eliminarCliente(cliente.telefono || cliente.nombre);
    if (res.success) {
      setPedidos((prev) =>
        prev.filter((p) => p.cliente_telefono !== cliente.telefono && p.cliente_nombre !== cliente.nombre)
      );
      setVentas((prev) =>
        prev.filter((v) => v.cliente_telefono !== cliente.telefono && v.cliente_nombre !== cliente.nombre)
      );
      setUserFeedback({
        type: 'success',
        msg: `Cliente con teléfono "${cliente.telefono}" (${cliente.nombre}) eliminado correctamente de Supabase y de la tienda.`,
      });
      setTimeout(() => setUserFeedback(null), 3500);
    } else {
      alert(res.error || 'Error al eliminar el cliente');
    }
  };

  const handleEliminarMovimientoRegistro = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de auditoría?')) return;
    await eliminarMovimiento(id);
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
  };

  const handleLimpiarHistorialMovimientosRegistro = async () => {
    if (!confirm('¿Estás seguro de vaciar todo el historial de movimientos de los trabajadores? Esta acción no se puede deshacer.')) return;
    await limpiarHistorialMovimientos();
    setMovimientos([]);
    setUserFeedback({
      type: 'success',
      msg: 'Historial de movimientos vaciado correctamente.',
    });
    setTimeout(() => setUserFeedback(null), 3500);
  };

  const handleCopyReceiptLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkOrderId(id);
    setTimeout(() => setCopiedLinkOrderId(null), 2500);
  };

  // Definición del menú con validación dinámica de roles (RBAC)
  const allNavItems = [
    { id: 'dashboard' as const, label: 'DASHBOARD', icon: LayoutDashboard, badge: 0 },
    { id: 'pedidos' as const, label: 'PEDIDOS & COMPROBANTES', icon: Receipt, badge: pedidosPendientes },
    { id: 'ventas' as const, label: 'VENTAS & FACTURACIÓN', icon: TrendingUp, badge: 0 },
    { id: 'caja' as const, label: 'CONTROL DE CAJA', icon: Wallet, badge: sesionCaja?.estado === 'abierta' ? 1 : 0 },
    { id: 'gastos' as const, label: 'GASTOS & BALANCE', icon: FileCheck, badge: 0 },
    { id: 'movimientos' as const, label: 'REGISTRO DE MOVIMIENTOS', icon: Activity, badge: 0 },
    { id: 'productos' as const, label: 'PRODUCTOS', icon: Package, badge: 0 },
    { id: 'categorias' as const, label: 'CATEGORÍAS', icon: Layers, badge: 0 },
    { id: 'inventario' as const, label: 'INVENTARIO', icon: Boxes, badge: stockBajoCount + agotadosCount },
    { id: 'clientes' as const, label: 'DIRECTORIO DE CLIENTES', icon: Users, badge: 0 },
    { id: 'usuarios' as const, label: 'USUARIOS & ROLES', icon: Shield, badge: 0 },
  ];

  const allowedNavItems = allNavItems.filter((item) =>
    canAccessSection(userRole, item.id)
  );

  return (
    <div className="min-h-screen bg-[#080706] text-white flex flex-col lg:flex-row font-sans selection:bg-[#C59A4D] selection:text-black">
      {/* Mobile & Tablet Top Header (Optimized for Android & iOS with 3-rayitas Menu button) */}
      <div className="lg:hidden bg-[#0F0E0D] text-white border-b border-[#26221E] sticky top-0 z-30">
        <div className="px-3.5 py-3 flex items-center justify-between gap-2">
          {/* Left side: Botón de 3 rayitas (Menú a la mano izquierda) + Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-xl bg-[#1C1A17] hover:bg-[#2A2621] text-[#E6C687] border border-[#2B2722] transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
              aria-label="Abrir panel de opciones"
              title="Abrir panel de opciones (3 rayitas)"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <AlexStoreLogo size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm text-white leading-none">
                    Alex<span className="text-[#C59A4D]">Store</span>
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                    userRole === 'dueno'
                      ? 'bg-amber-400/20 text-[#E6C687] border border-[#C59A4D]/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {userRole === 'dueno' ? '👑 DUEÑO' : '💼 TRABAJADOR'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                      sesionCaja && sesionCaja.estado === 'abierta'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                        : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                    }`}
                    title={sesionCaja && sesionCaja.estado === 'abierta' ? 'Caja abierta y operativa' : 'Caja actualmente cerrada'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sesionCaja && sesionCaja.estado === 'abierta' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{sesionCaja && sesionCaja.estado === 'abierta' ? '🟢 CAJA ABIERTA' : '🔴 CAJA CERRADA'}</span>
                  </span>
                </div>
                <span className="text-[10px] text-[#A69F93] font-bold block truncate capitalize mt-0.5">
                  {allowedNavItems.find((i) => i.id === activeSection)?.label || activeSection}
                </span>
              </div>
            </div>
          </div>

          {/* Right side quick actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onExitAdmin}
              className="px-2.5 py-1.5 rounded-xl bg-[#1C1A17] text-white hover:text-[#E6C687] text-xs font-bold border border-[#2B2722] flex items-center gap-1 cursor-pointer transition-colors"
              title="Ver Tienda Pública"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Tienda</span>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-xl bg-rose-950/60 text-rose-400 hover:text-white border border-rose-800 transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de Opciones a la Mano Izquierda (Off-canvas Drawer para Móviles & Tablets) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel a la izquierda */}
          <aside className="fixed inset-y-0 left-0 w-[290px] max-w-[85vw] bg-[#0F0E0D] text-white border-r border-[#26221E] shadow-2xl flex flex-col z-50 animate-slide-right">
            {/* Header del Drawer */}
            <div className="p-4 border-b border-[#26221E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlexStoreLogo size="sm" />
                <div>
                  <span className="font-extrabold text-base text-white block leading-none">
                    Alex<span className="text-[#C59A4D]">Store</span>
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#8C8375] block mt-0.5">
                    PANEL DE OPCIONES
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-[#8C8375] hover:text-white hover:bg-[#1C1A17] transition-colors cursor-pointer"
                title="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info del Usuario activo en Drawer */}
            <div className="p-3.5 m-3 rounded-2xl bg-[#171513] border border-[#2B2722] space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  userRole === 'dueno' ? 'bg-[#C59A4D] text-black font-black' : 'bg-emerald-600 text-white'
                }`}>
                  {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-xs text-white block truncate">
                    {currentUser?.nombre || 'Usuario'}
                  </span>
                  <span className="text-[10px] text-[#8C8375] block truncate font-mono">
                    {currentUser?.email || 'admin@alexstore.com'}
                  </span>
                </div>
              </div>
              <div className="pt-1 border-t border-[#26221E] flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                  userRole === 'dueno'
                    ? 'bg-[#C59A4D]/20 text-[#E6C687] border border-[#C59A4D]/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {userRole === 'dueno' ? '👑 DUEÑO (ACCESO TOTAL)' : '💼 TRABAJADOR'}
                </span>
                <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Activo
                </span>
              </div>
            </div>

            {/* Estado de la Caja en el Drawer Móvil */}
            <div className={`mx-3 mb-2 p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
              sesionCaja && sesionCaja.estado === 'abierta'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{sesionCaja && sesionCaja.estado === 'abierta' ? '🟢' : '🔴'}</span>
                <div className="min-w-0">
                  <span className="font-black text-[11px] block leading-tight">
                    {sesionCaja && sesionCaja.estado === 'abierta' ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
                  </span>
                  <span className="text-[9px] text-[#A69F93] block truncate">
                    {sesionCaja && sesionCaja.estado === 'abierta'
                      ? `Turno por: ${sesionCaja.abierto_por || 'Activo'}`
                      : 'Ventas y pedidos bloqueados para staff'}
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                sesionCaja && sesionCaja.estado === 'abierta'
                  ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60'
                  : 'bg-rose-900/60 text-rose-200 border-rose-700/60'
              }`}>
                {sesionCaja && sesionCaja.estado === 'abierta' ? 'Operativa' : 'Cerrada'}
              </span>
            </div>

            {/* Lista Vertical de Opciones (Scrolleable y Cómoda) */}
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 overscroll-contain">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6E685F] px-2 py-1 block">
                MÓDULOS DISPONIBLES:
              </span>
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'bg-[#C59A4D] text-[#141312] shadow-md font-black'
                        : 'text-[#A69F93] hover:text-white hover:bg-[#1A1816]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#141312]' : 'text-[#C59A4D]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isSelected ? 'bg-[#141312] text-[#E6C687]' : 'bg-rose-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'text-black' : 'text-[#6E685F]'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer del Drawer */}
            <div className="p-3 border-t border-[#26221E] space-y-2 bg-[#0A0908]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExitAdmin();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1C1A17] hover:bg-[#25221F] text-[#E6C687] text-xs font-bold border border-[#2D2822] cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Catálogo Público</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 text-xs font-bold border border-rose-900/50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Desktops >= 1024px) */}
      <aside className="hidden lg:flex w-64 bg-[#0F0E0D] text-white flex-col justify-between p-5 border-r border-[#26221E] shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <AlexStoreLogo size="md" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-white tracking-tight leading-none">
                Alex<span className="text-[#C59A4D]">Store</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#8C8375] mt-1">
                GESTIÓN OFICIAL
              </span>
            </div>
          </div>

          {/* User Profile & Role Card */}
          <div className="p-3.5 rounded-2xl bg-[#1A1816] border border-[#2D2822] space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#26221E] text-[#C59A4D] flex items-center justify-center font-black">
                {currentUser?.nombre ? currentUser.nombre.substring(0, 2).toUpperCase() : 'AS'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-xs text-white block truncate">
                  {currentUser?.nombre || 'Usuario'}
                </span>
                <span className="text-[10px] text-[#8C8375] block truncate font-mono">
                  {currentUser?.email || 'admin@alexmstore.com'}
                </span>
              </div>
            </div>

            {/* Badge de Rol con estilo distintivo */}
            <div className="pt-1 border-t border-[#26221E] flex items-center justify-between">
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  ROLE_PERMISSIONS[userRole]?.badgeColor || 'bg-slate-700 text-white'
                }`}
              >
                {userRole === 'dueno' && '👑 DUEÑO'}
                {userRole === 'administrador' && '🛡️ ADMINISTRADOR'}
                {userRole === 'cajero' && '💼 CAJERO / STAFF'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sesión activa" />
            </div>

            {/* Estado de la Caja en Sidebar Escritorio */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              sesionCaja && sesionCaja.estado === 'abierta'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{sesionCaja && sesionCaja.estado === 'abierta' ? '🟢' : '🔴'}</span>
                <div className="min-w-0">
                  <span className="font-black text-[11px] block leading-tight">
                    {sesionCaja && sesionCaja.estado === 'abierta' ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
                  </span>
                  <span className="text-[9px] text-[#A69F93] block truncate">
                    {sesionCaja && sesionCaja.estado === 'abierta'
                      ? `Por: ${sesionCaja.abierto_por || 'Turno activo'}`
                      : 'Ventas y pedidos bloqueados para staff'}
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                sesionCaja && sesionCaja.estado === 'abierta'
                  ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60'
                  : 'bg-rose-900/60 text-rose-200 border-rose-700/60'
              }`}>
                {sesionCaja && sesionCaja.estado === 'abierta' ? 'Operativo' : 'Cerrado'}
              </span>
            </div>
          </div>

          {/* Menu Sections Dinámico según Rol */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6E685F] px-3 block mb-2">
              SECCIONES AUTORIZADAS
            </span>

            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm font-black'
                      : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#C59A4D]" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-[#26221E] space-y-2">
          <button
            onClick={onExitAdmin}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#A69F93] hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Ver Tienda Pública
            </span>
            <span className="text-[10px] bg-[#26221E] px-2 py-0.5 rounded-md font-mono">
              Web
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar header */}
        <header className="bg-[#0F0E0D] border-b border-[#26221E] px-4 sm:px-6 py-3.5 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-heading capitalize leading-tight">
              {activeSection === 'dashboard' && 'Dashboard General'}
              {activeSection === 'pedidos' && 'Gestión de Pedidos & Comprobantes'}
              {activeSection === 'ventas' && 'Módulo de Ventas & Facturación'}
              {activeSection === 'caja' && 'Control de Caja & Arqueos'}
              {activeSection === 'gastos' && 'Control de Gastos & Balance Neto'}
              {activeSection === 'movimientos' && 'Registro de Movimientos & Auditoría'}
              {activeSection === 'productos' && 'Gestión de Productos'}
              {activeSection === 'categorias' && 'Gestión de Categorías'}
              {activeSection === 'inventario' && 'Control de Inventario'}
              {activeSection === 'clientes' && 'Directorio de Clientes'}
              {activeSection === 'usuarios' && 'Gestión de Usuarios, Roles & Permisos'}
            </h1>
            <p className="text-xs text-[#A69F93] mt-0.5">
              {activeSection === 'dashboard' && 'Métricas operativas y financieras generales de AlexStore'}
              {activeSection === 'pedidos' && 'Verifica comprobantes de pago por Yappy y Transferencias, y aprueba compras'}
              {activeSection === 'ventas' && 'Ventas web aprobadas y registro de ventas manuales de mostrador'}
              {activeSection === 'caja' && 'Apertura de turno con fondo inicial, control de efectivo en gaveta y arqueo de cierre guardado'}
              {activeSection === 'gastos' && 'Registra gastos operativos y de mercancía, descontándolos en vivo del total ganado para dar la ganancia neta'}
              {activeSection === 'movimientos' && 'Historial cronológico de turnos, aprobaciones y ajustes de stock'}
              {activeSection === 'productos' && 'Administra catálogo, precios, fotos e inventario en public.productos'}
              {activeSection === 'categorias' && 'Crea y edita categorías en public.categorias'}
              {activeSection === 'inventario' && 'Monitorea existencias, alertas de stock mínimo y reposición en public.inventario'}
              {activeSection === 'clientes' && 'Directorio consolidado de clientes, pedidos acumulados y contacto directo'}
              {activeSection === 'usuarios' && 'Administración de cuentas de Dueño, Administradores y Cajeros con seguridad RLS'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {canAccessSection(userRole, 'usuarios') && (
              <button
                onClick={() => setIsModalSqlAuthOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-[#3A332B] bg-[#1A1816] hover:bg-[#25221E] text-xs font-bold text-[#E6C687] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Ver scripts y esquema SQL para Supabase"
              >
                <Database className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Scripts SQL</span>
              </button>
            )}

            <button
              onClick={onExitAdmin}
              className="px-4 py-2 rounded-xl border border-[#2D2822] bg-[#141210] hover:bg-[#1E1B18] text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C59A4D]" />
              <span>VER CATÁLOGO</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-full overflow-x-hidden">
          {/* Alertas de Feedback */}
          {userFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border animate-fade-in ${
                userFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <span>{userFeedback.msg}</span>
              <button
                onClick={() => setUserFeedback(null)}
                className="text-slate-500 hover:text-black font-black ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* GUARD DE SEGURIDAD ESTRICTO: Bloqueo de secciones no autorizadas */}
          {!canAccessSection(userRole, activeSection) && (
            <div className="bg-[#13110F] rounded-3xl p-8 border border-rose-900/50 text-center space-y-3 animate-fade-in shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-white">Módulo Restringido</h2>
              <p className="text-xs text-[#A69F93] max-w-md mx-auto">
                Tu rol actual (<strong className="text-[#E6C687]">{ROLE_PERMISSIONS[userRole]?.name}</strong>) no tiene autorización para acceder a este módulo financiero o administrativo.
              </p>
              <button
                onClick={() => setActiveSection('pedidos')}
                className="px-5 py-2.5 rounded-2xl bg-[#C59A4D] hover:bg-[#D4A95D] text-black text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95"
              >
                Ir a Pedidos & Comprobantes
              </button>
            </div>
          )}
          {/* ======================================================== */}
          {/* 1. DASHBOARD VIEW (Image 2) */}
          {/* ======================================================== */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Banner Card: Resumen General del Negocio */}
              <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-heading">
                    Resumen General del Negocio
                  </h2>
                  <p className="text-xs text-[#A69F93] mt-0.5">
                    Datos sincronizados en tiempo real con Supabase Database & Storage.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-2xl bg-[#1C1A17] hover:bg-[#25221E] text-white border border-[#2D2822] transition-colors cursor-pointer"
                    title="Actualizar datos"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => {
                      setProductoToEdit(null);
                      setIsModalProductoOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-[#C59A4D] hover:bg-[#B3873B] text-[#141312] text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>NUEVO PRODUCTO</span>
                  </button>
                </div>
              </div>

              {/* 5 Stats Cards (Image 2) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                {/* 1. Total Productos */}
                <div
                  onClick={() => setActiveSection('productos')}
                  className="bg-[#13110F] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#26221E] shadow-md hover:border-[#C59A4D]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#A69F93]">
                      TOTAL PRODUCTOS
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#1C1A17] border border-[#2D2822] flex items-center justify-center text-[#C59A4D]">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-white">{totalProductos}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#E6C687]">Ver catálogo completo →</span>
                </div>

                {/* 2. Activos Visibles */}
                <div className="bg-[#13110F] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#26221E] shadow-md flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#A69F93]">
                      ACTIVOS (VISIBLES)
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-white">{activosVisibles}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400">
                    {totalProductos > 0 ? Math.round((activosVisibles / totalProductos) * 100) : 100}% del total
                  </span>
                </div>

                {/* 3. Categorías */}
                <div
                  onClick={() => setActiveSection('categorias')}
                  className="bg-[#13110F] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#26221E] shadow-md hover:border-[#C59A4D]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#A69F93]">
                      CATEGORÍAS
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-950/50 border border-amber-800/50 flex items-center justify-center text-[#E6C687]">
                      <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-white">{totalCategorias}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#E6C687]">Gestionar categorías →</span>
                </div>

                {/* 4. Stock Bajo */}
                <div
                  onClick={() => {
                    setInventarioFilter('stock-bajo');
                    setActiveSection('inventario');
                  }}
                  className="bg-[#13110F] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#26221E] shadow-md hover:border-amber-400/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#A69F93]">
                      STOCK BAJO
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">{stockBajoCount}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400">Requieren reposición</span>
                </div>

                {/* 5. Agotados */}
                <div
                  onClick={() => {
                    setInventarioFilter('agotados');
                    setActiveSection('inventario');
                  }}
                  className="bg-[#13110F] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#26221E] shadow-md hover:border-rose-400/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#A69F93]">
                      AGOTADOS
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-rose-400">{agotadosCount}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-400">Sin existencias (0)</span>
                </div>
              </div>

              {/* Balance Financiero & Total Neto (Disponible para Dueño y Administrador) */}
              {canAccessSection(userRole, 'gastos') && (
                <div className="bg-gradient-to-br from-[#141312] to-[#201D1A] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-[#3A332B] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#C59A4D] flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5" />
                        BALANCE FINANCIERO DEL NEGOCIO
                      </span>
                      <h3 className="text-lg font-black text-white font-heading mt-0.5">
                        Estado de Ingresos, Gastos y Ganancia Neta
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('gastos')}
                      className="px-4 py-2 rounded-xl bg-[#C59A4D] hover:bg-[#B3873B] text-[#141312] text-xs font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer transition-all shadow-md"
                    >
                      GESTIONAR GASTOS & DETALLES →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#A69F93] block">
                        TOTAL VENTAS (INGRESOS BRUTOS)
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white block my-1.5">
                        ${totalVentasGanado.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        {ventas.length} ventas registradas
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#A69F93] block">
                        TOTAL GASTOS REGISTRADOS
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-rose-400 block my-1.5">
                        ${totalGastosMonto.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {gastos.length} gastos deducidos
                      </span>
                    </div>

                    <div className="bg-gradient-to-br from-[#1C1A17] to-black rounded-2xl p-4 border border-[#C59A4D]/40 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#E6C687] block">
                        TOTAL NETO EN CAJA (GANANCIA REAL)
                      </span>
                      <span className={`text-2xl sm:text-3xl font-black block my-1.5 ${
                        totalNetoGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ${totalNetoGanancia.toFixed(2)} USD
                      </span>
                      <span className="text-[11px] text-white/70 font-medium">
                        Total Ganado menos Gastos descontados
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Espacio de Almacenamiento & Base de Datos (Supabase Quota) */}
              <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-xl space-y-5 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26221E]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#A69F93] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#C59A4D]" />
                      CAPACIDAD & ESPACIO DISPONIBLE (SUPABASE)
                    </span>
                    <h3 className="text-base font-black text-white font-heading mt-0.5">
                      Espacio para Montar Productos, Comprobantes y Tablas
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-xs font-black self-start sm:self-auto">
                    Tier Gratuito Activo (100% Operativo)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Storage: Fotos de Productos y Comprobantes */}
                  <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#2D2822] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/50 text-[#E6C687] flex items-center justify-center font-bold">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white block">Almacenamiento Storage</span>
                          <span className="text-[10px] text-[#A69F93]">Fotos de productos y comprobantes</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white block">{metricasEspacio.mbStorageUsado} MB / {metricasEspacio.mbStorageTotal} MB</span>
                        <span className="text-[10px] text-emerald-400 font-bold">{metricasEspacio.mbStorageLibre} MB libres</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#26221E] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#C59A4D] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, metricasEspacio.porcentajeStorageUsado)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-[#13110F] p-2 rounded-xl border border-[#26221E]">
                        <span className="text-[#A69F93] block text-[10px]">Capacidad restante productos:</span>
                        <strong className="text-emerald-400 font-extrabold block">
                          ~{metricasEspacio.productosRestantesEstimados.toLocaleString()} productos
                        </strong>
                        <span className="text-[9px] text-[#7A7368]">({metricasEspacio.totalFotosProductos} fotos actuales)</span>
                      </div>
                      <div className="bg-[#13110F] p-2 rounded-xl border border-[#26221E]">
                        <span className="text-[#A69F93] block text-[10px]">Capacidad comprobantes:</span>
                        <strong className="text-emerald-400 font-extrabold block">
                          ~{metricasEspacio.fotosRestantesEstimadas.toLocaleString()} comprobantes
                        </strong>
                        <span className="text-[9px] text-[#7A7368]">({metricasEspacio.totalComprobantes} capturas guardadas)</span>
                      </div>
                    </div>
                  </div>

                  {/* Base de Datos: Tablas y Registros */}
                  <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#2D2822] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-950/60 border border-sky-800/50 text-sky-400 flex items-center justify-center font-bold">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white block">Base de Datos PostgreSQL</span>
                          <span className="text-[10px] text-[#A69F93]">Pedidos, ventas, clientes y gastos</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white block">{metricasEspacio.mbBaseDatosUsado} MB / {metricasEspacio.mbBaseDatosTotal} MB</span>
                        <span className="text-[10px] text-emerald-400 font-bold">{metricasEspacio.mbBaseDatosLibre} MB libres</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#26221E] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, metricasEspacio.porcentajeBaseDatosUsado)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-[#13110F] p-2 rounded-xl border border-[#26221E]">
                        <span className="text-[#A69F93] block text-[10px]">Registros en tablas:</span>
                        <strong className="text-sky-400 font-extrabold block">
                          {metricasEspacio.totalFilasTablas} registros
                        </strong>
                        <span className="text-[9px] text-[#7A7368]">Pedidos, ventas, gastos, etc.</span>
                      </div>
                      <div className="bg-[#13110F] p-2 rounded-xl border border-[#26221E]">
                        <span className="text-[#A69F93] block text-[10px]">Espacio restante DB:</span>
                        <strong className="text-emerald-400 font-extrabold block">
                          {(100 - metricasEspacio.porcentajeBaseDatosUsado).toFixed(1)}% disponible
                        </strong>
                        <span className="text-[9px] text-[#7A7368]">Capacidad para +500,000 pedidos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 2 Split Cards: Stock Bajo & Agotados (Image 2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: Productos con Stock Bajo */}
                <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Productos con Stock Bajo ({stockBajoCount})
                    </h3>
                    <button
                      onClick={() => {
                        setInventarioFilter('stock-bajo');
                        setActiveSection('inventario');
                      }}
                      className="text-xs font-bold text-[#E6C687] hover:underline cursor-pointer"
                    >
                      VER INVENTARIO →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {productos.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-[#1A1816] border border-[#2D2822] flex items-center justify-between gap-3 text-white"
                      >
                        <img
                          src={p.imagen_url || (p.imagenes && p.imagenes[0]) || ''}
                          alt=""
                          className="w-12 h-14 object-cover rounded-xl bg-black border border-[#2D2822] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-xs text-white truncate">{p.nombre}</h4>
                          <span className="text-[11px] text-[#A69F93] block">
                            {categorias.find((c) => c.id === p.categoria_id)?.nombre || 'General'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-amber-400">{p.stock} unids.</span>
                          <span className="text-[10px] text-[#A69F93] block">Mín: {p.stock_minimo || 5}</span>
                        </div>
                        <button
                          onClick={() => handleStockDelta(p.id, p.stock ?? 0, 5)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer shadow-sm"
                        >
                          Ajustar
                        </button>
                      </div>
                    ))}
                    {stockBajoCount === 0 && (
                      <p className="text-xs text-[#A69F93] py-8 text-center">No hay productos con stock bajo actualmente.</p>
                    )}
                  </div>
                </div>

                {/* Right Card: Productos Agotados */}
                <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      Productos Agotados ({agotadosCount})
                    </h3>
                    <button
                      onClick={() => {
                        setInventarioFilter('agotados');
                        setActiveSection('inventario');
                      }}
                      className="text-xs font-bold text-[#E6C687] hover:underline cursor-pointer"
                    >
                      VER INVENTARIO →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {productos.filter((p) => (p.stock ?? 0) <= 0).slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-[#1A1816] border border-[#2D2822] flex items-center justify-between gap-3 text-white"
                      >
                        <img
                          src={p.imagen_url || (p.imagenes && p.imagenes[0]) || ''}
                          alt=""
                          className="w-12 h-14 object-cover rounded-xl bg-black border border-[#2D2822] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-xs text-white truncate">{p.nombre}</h4>
                          <span className="text-[11px] text-[#A69F93] block">
                            {categorias.find((c) => c.id === p.categoria_id)?.nombre || 'General'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-rose-400">0 unidades</span>
                        </div>
                        <button
                          onClick={() => handleStockDelta(p.id, 0, 5)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-sm"
                        >
                          Reponer
                        </button>
                      </div>
                    ))}
                    {agotadosCount === 0 && (
                      <p className="text-xs text-[#A69F93] py-8 text-center">¡Genial! No hay productos agotados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. VENTAS & FACTURACIÓN (Image 3) */}
          {/* ======================================================== */}
          {activeSection === 'ventas' && (
            <div className="space-y-6">
              {/* Stat Cards: If Cajero -> Operational counts only (NO MONEY). If Dueño/Admin -> Financial metrics */}
              {userRole === 'cajero' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">PEDIDOS RECIBIDOS</span>
                    <span className="text-2xl sm:text-3xl font-black text-white block my-2">{pedidos.length}</span>
                    <span className="text-[11px] font-bold text-slate-400">Total en sistema</span>
                  </div>

                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">PEDIDOS ACEPTADOS</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 block my-2">
                      {pedidos.filter((p) => p.estado === 'aprobado' || p.estado === 'aceptado').length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400">Listos / Despachados</span>
                  </div>

                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">PEDIDOS PENDIENTES</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 block my-2">
                      {pedidos.filter((p) => p.estado === 'pendiente').length}
                    </span>
                    <span className="text-[11px] font-bold text-amber-400">Por revisar comprobante</span>
                  </div>

                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">VENTAS REALIZADAS</span>
                    <span className="text-2xl sm:text-3xl font-black text-sky-400 block my-2">{ventas.length}</span>
                    <span className="text-[11px] font-bold text-sky-400">Web y mostrador</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">INGRESOS TOTALES</span>
                    <span className="text-2xl sm:text-3xl font-black text-white block my-2">${ingresosTotales.toFixed(2)}</span>
                    <span className="text-[11px] font-bold text-emerald-400">Acumulado histórico</span>
                  </div>

                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">VENTAS ESTE MES</span>
                    <span className="text-2xl sm:text-3xl font-black text-white block my-2">${ingresosTotales.toFixed(2)}</span>
                    <span className="text-[11px] text-[#A69F93]">{ventas.length} transacciones</span>
                  </div>

                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">TOTAL TRANSACCIONES</span>
                    <span className="text-2xl sm:text-3xl font-black text-white block my-2">{ventas.length}</span>
                    <span className="text-[11px] text-[#A69F93]">Web + Manuales</span>
                  </div>

                  <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#A69F93] block">TICKET PROMEDIO</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#E6C687] block my-2">
                      ${ventas.length > 0 ? Math.round(ingresosTotales / ventas.length) : 0}
                    </span>
                    <span className="text-[11px] text-[#A69F93]">Por cada venta</span>
                  </div>
                </div>
              )}

              {/* Filters bar & Period Selector */}
              {(() => {
                const ventasFiltradasPorPeriodo = ventas.filter((v) => {
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const match =
                      v.codigo.toLowerCase().includes(q) ||
                      v.cliente_nombre.toLowerCase().includes(q) ||
                      (v.cliente_telefono && v.cliente_telefono.includes(q)) ||
                      (v.cajero_nombre && v.cajero_nombre.toLowerCase().includes(q));
                    if (!match) return false;
                  }

                  if (!v.creado_en) return true;
                  const dateObj = new Date(v.creado_en);
                  const yyyy = dateObj.getFullYear();
                  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const dd = String(dateObj.getDate()).padStart(2, '0');
                  const yyyyMmDd = `${yyyy}-${mm}-${dd}`;
                  const yyyyMm = `${yyyy}-${mm}`;

                  if (ventasFiltroPeriodo === 'hoy') {
                    return yyyyMmDd === ventasFechaExacta;
                  }
                  if (ventasFiltroPeriodo === 'mes') {
                    return yyyyMm === ventasMesExacto;
                  }
                  if (ventasFiltroPeriodo === 'ano') {
                    return String(yyyy) === ventasAnoExacto;
                  }
                  if (ventasFiltroPeriodo === 'rango') {
                    if (ventasFechaDesde && yyyyMmDd < ventasFechaDesde) return false;
                    if (ventasFechaHasta && yyyyMmDd > ventasFechaHasta) return false;
                    return true;
                  }

                  return true;
                });

                const totalMontoFiltrado = ventasFiltradasPorPeriodo.reduce(
                  (acc, v) => acc + (Number(v.total) || 0),
                  0
                );

                return (
                  <div className="space-y-3">
                    <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69F93]" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar venta, cliente o código..."
                          className="w-full bg-[#1A1816] text-xs text-white px-10 py-2.5 rounded-2xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D] placeholder-[#7A7368]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          onClick={reloadAllData}
                          className="p-2.5 rounded-xl border border-[#2D2822] bg-[#1A1816] hover:bg-[#25221E] text-white transition-colors cursor-pointer"
                          title="Recargar ventas"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')) {
                              alert('⚠️ LA CAJA ESTÁ CERRADA: Como trabajador, no puedes registrar ventas manuales mientras la caja esté cerrada. Pide al Dueño o Administrador que abra el turno de caja.');
                              return;
                            }
                            setVentaManualCliente('');
                            setVentaManualTelefono('');
                            setVentaManualMonto('');
                            setVentaManualMontoAbonado('');
                            setVentaManualTipoAbono('mitad');
                            setVentaManualProductoId('');
                            setVentaManualNotas('');
                            setVentaManualMetodo('efectivo');
                            setIsModalVentaManualOpen(true);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all ${
                            userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')
                              ? 'bg-[#26221E] text-rose-300 border border-rose-800/60 hover:bg-[#2F2924]'
                              : 'bg-[#C59A4D] hover:bg-[#B3873B] text-[#141312]'
                          }`}
                          title={
                            userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')
                              ? 'Caja cerrada: el trabajador no puede ingresar ventas hasta que se abra el turno'
                              : 'Registrar nueva venta manual'
                          }
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>
                            {userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')
                              ? '🔒 CAJA CERRADA'
                              : '+ REGISTRAR VENTA MANUAL'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Alerta de Caja Cerrada para Cajeros en Ventas */}
                    {userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta') && (
                      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3 shadow-md">
                        <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 shrink-0">
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-black text-rose-300 uppercase tracking-wider text-xs block">
                            🔴 CAJA CERRADA - VENTAS MANUALES BLOQUEADAS
                          </span>
                          <p className="text-[11px] text-rose-200/90 leading-relaxed">
                            Como trabajador, <strong>no tienes permitido registrar ventas manuales</strong> mientras el turno de caja esté cerrado. Solicita al <strong>Dueño o Administrador</strong> que realice la apertura de caja para comenzar a facturar.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Barra de Filtro de Período (Día / Mes / Año / Rango) y Botones de Eliminación Masiva */}
                    <div className="bg-[#141210] rounded-2xl p-3.5 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-[#E6C687] tracking-wider">
                          Filtrar Ventas Por:
                        </span>

                        <div className="flex items-center bg-[#1A1816] p-1 rounded-xl border border-[#2D2822] gap-1">
                          {(
                            [
                              { id: 'todos', label: 'Todas' },
                              { id: 'hoy', label: 'Por Día' },
                              { id: 'mes', label: 'Por Mes' },
                              { id: 'ano', label: 'Por Año' },
                              { id: 'rango', label: 'Rango Fechas' },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setVentasFiltroPeriodo(tab.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                ventasFiltroPeriodo === tab.id
                                  ? 'bg-[#C59A4D] text-[#141312] font-black shadow-xs'
                                  : 'text-[#A69F93] hover:text-white'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Controles específicos del período seleccionado */}
                        {ventasFiltroPeriodo === 'hoy' && (
                          <div className="flex items-center gap-1.5 bg-[#1A1816] px-3 py-1.5 rounded-xl border border-[#2D2822]">
                            <span className="text-[10px] text-[#A69F93] font-bold">Fecha:</span>
                            <input
                              type="date"
                              value={ventasFechaExacta}
                              onChange={(e) => setVentasFechaExacta(e.target.value)}
                              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono"
                            />
                          </div>
                        )}

                        {ventasFiltroPeriodo === 'mes' && (
                          <div className="flex items-center gap-1.5 bg-[#1A1816] px-3 py-1.5 rounded-xl border border-[#2D2822]">
                            <span className="text-[10px] text-[#A69F93] font-bold">Mes:</span>
                            <input
                              type="month"
                              value={ventasMesExacto}
                              onChange={(e) => setVentasMesExacto(e.target.value)}
                              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono"
                            />
                          </div>
                        )}

                        {ventasFiltroPeriodo === 'ano' && (
                          <div className="flex items-center gap-1.5 bg-[#1A1816] px-3 py-1.5 rounded-xl border border-[#2D2822]">
                            <span className="text-[10px] text-[#A69F93] font-bold">Año:</span>
                            <input
                              type="number"
                              min="2020"
                              max="2035"
                              value={ventasAnoExacto}
                              onChange={(e) => setVentasAnoExacto(e.target.value)}
                              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono w-20"
                            />
                          </div>
                        )}

                        {ventasFiltroPeriodo === 'rango' && (
                          <div className="flex items-center gap-2 bg-[#1A1816] px-3 py-1.5 rounded-xl border border-[#2D2822] flex-wrap">
                            <span className="text-[10px] text-[#A69F93] font-bold">Desde:</span>
                            <input
                              type="date"
                              value={ventasFechaDesde}
                              onChange={(e) => setVentasFechaDesde(e.target.value)}
                              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono"
                            />
                            <span className="text-[10px] text-[#A69F93] font-bold">Hasta:</span>
                            <input
                              type="date"
                              value={ventasFechaHasta}
                              onChange={(e) => setVentasFechaHasta(e.target.value)}
                              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono"
                            />
                          </div>
                        )}

                        {/* Indicador de ventas filtradas */}
                        <span className="px-2.5 py-1 rounded-xl bg-[#1C1A17] border border-[#332E27] text-[11px] font-bold text-slate-300">
                          {ventasFiltradasPorPeriodo.length} venta(s)
                          {userRole !== 'cajero' && ` • $${totalMontoFiltrado.toFixed(2)} USD`}
                        </span>
                      </div>

                      {/* Botones de Eliminación (Disponibles para Dueño y Admin) */}
                      {(userRole === 'dueno' || userRole === 'administrador') && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {ventasFiltroPeriodo !== 'todos' && ventasFiltradasPorPeriodo.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleEliminarVentasFiltradas(ventasFiltradasPorPeriodo)}
                              className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-[#E6C687] border border-amber-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                              title="Eliminar solo las ventas del período actualmente filtrado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar ({ventasFiltradasPorPeriodo.length}) Filtradas</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleVaciarVentas}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            title="Eliminar absolutamente todas las ventas de la base de datos"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Vaciar Todo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ventas Table or Empty state */}
                    {ventasFiltradasPorPeriodo.length === 0 ? (
                      <div className="bg-[#13110F] rounded-3xl p-8 sm:p-12 border border-[#26221E] text-center space-y-3 shadow-md text-white">
                        <TrendingUp className="w-10 h-10 mx-auto text-[#7A7368]" />
                        <h3 className="font-extrabold text-white">
                          No se encontraron ventas en el período seleccionado
                        </h3>
                        <p className="text-xs text-[#A69F93] max-w-md mx-auto">
                          Prueba cambiando el filtro de fecha o registrando una nueva venta manual.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#13110F] rounded-2xl sm:rounded-3xl border border-[#26221E] overflow-hidden shadow-xl text-white">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[950px] text-left text-xs">
                            <thead className="bg-[#1A1816] border-b border-[#26221E] text-[10px] font-black uppercase text-[#A69F93] tracking-wider">
                              <tr>
                                <th className="py-3.5 px-4">Código</th>
                                <th className="py-3.5 px-4">Prendas / Productos</th>
                                <th className="py-3.5 px-4">Cliente</th>
                                <th className="py-3.5 px-4">Método / Estado</th>
                                <th className="py-3.5 px-4">Registrado Por</th>
                                <th className="py-3.5 px-4">Fecha</th>
                                <th className="py-3.5 px-4 text-right">
                                  {userRole === 'cajero' ? 'Artículos' : 'Total'}
                                </th>
                                <th className="py-3.5 px-4 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#221F1C]">
                              {ventasFiltradasPorPeriodo.map((v) => {
                            const hasSaldo = Boolean(v.saldo_pendiente && v.saldo_pendiente > 0 && v.estado_pago !== 'completo');

                            return (
                              <tr key={v.id || v.codigo} className="hover:bg-[#1A1816] transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-[#E6C687] align-top">
                                  {v.codigo}
                                  <span
                                    className={`block mt-1 px-2 py-0.2 rounded-full text-[9px] font-black uppercase w-fit ${
                                      v.tipo === 'web'
                                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                        : 'bg-[#25221F] text-slate-300 border border-[#332E27]'
                                    }`}
                                  >
                                    {v.tipo || 'web'}
                                  </span>
                                </td>

                                {/* Prendas / Productos con fotos y variantes */}
                                <td className="py-3.5 px-4 align-top max-w-xs">
                                  {v.items && v.items.length > 0 ? (
                                    <div className="space-y-2">
                                      {v.items.map((it, idx) => {
                                        const prodRef = productos.find(
                                          (p) => p.id === (it.producto_id || it.id) || p.nombre === it.nombre
                                        );
                                        const prodImg = it.imagen_url || prodRef?.imagen_url || prodRef?.imagenes?.[0];
                                        const varDesc =
                                          it.variante_titulo ||
                                          (it.talla ? `Talla: ${it.talla}` : null) ||
                                          (it.color ? `Color: ${it.color}` : null) ||
                                          (it.opciones ? Object.entries(it.opciones).map(([k, val]) => `${k}: ${val}`).join(', ') : null);

                                        return (
                                          <div key={idx} className="flex items-center gap-2.5 bg-[#141210] p-1.5 rounded-xl border border-[#26221E]">
                                            {prodImg ? (
                                              <img
                                                src={prodImg}
                                                alt={it.nombre}
                                                onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: varDesc || undefined })}
                                                className="w-10 h-10 object-cover rounded-lg bg-black border border-[#2D2822] shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                title="Click para ampliar foto del producto"
                                              />
                                            ) : (
                                              <div className="w-10 h-10 rounded-lg bg-[#1A1816] border border-[#2D2822] flex items-center justify-center text-[9px] font-bold text-[#7A7368] shrink-0">
                                                Sin foto
                                              </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <span className="font-bold text-white text-[11px] block truncate">
                                                {it.nombre}
                                              </span>
                                              <div className="flex items-center gap-1.5 text-[10px] text-[#A69F93] flex-wrap">
                                                <span className="font-black text-[#E6C687]">x{it.cantidad || 1}</span>
                                                {varDesc && (
                                                  <span className="text-slate-300 font-medium">({varDesc})</span>
                                                )}
                                                {it.precio && (
                                                  <span className="text-[#A69F93]">${Number(it.precio).toFixed(2)} c/u</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-[#7A7368] text-[11px] italic">Sin prendas detalladas</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 align-top">
                                  <strong className="font-extrabold text-white block">{v.cliente_nombre}</strong>
                                  <span className="text-[#A69F93] font-mono text-[11px] block mt-0.5">
                                    📞 {v.cliente_telefono || '—'}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 align-top">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-200 uppercase block text-[11px]">
                                      {v.metodo_pago === 'abono'
                                        ? 'Abono Parcial'
                                        : v.metodo_pago === 'contra_entrega'
                                        ? 'Contra Entrega'
                                        : v.metodo_pago}
                                    </span>
                                    {hasSaldo ? (
                                      userRole === 'cajero' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-800 text-amber-300 font-extrabold text-[9px] inline-block">
                                          ⏳ Saldo pendiente por cobrar
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-800 text-amber-300 font-extrabold text-[9px] inline-block">
                                          ⏳ Debe: ${Number(v.saldo_pendiente || 0).toFixed(2)} USD
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[9px] text-emerald-400 font-bold inline-flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        Completado
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Registrado Por */}
                                <td className="py-3.5 px-4 align-top">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-[#1F1C18] border border-[#332E27] flex items-center justify-center text-[10px]">
                                      {v.tipo === 'web' ? '🌐' : '👤'}
                                    </span>
                                    <div>
                                      <strong className="text-white font-extrabold block text-[11px]">
                                        {v.cajero_nombre || (v.tipo === 'web' ? 'Cliente Web' : 'Cajero / Staff')}
                                      </strong>
                                      <span className="text-[9px] text-[#A69F93]">
                                        {v.tipo === 'web' ? 'Tienda Online' : 'Venta Mostrador'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-[#A69F93] text-[11px] align-top font-mono">
                                  {v.creado_en ? new Date(v.creado_en).toLocaleString('es-PA') : 'Reciente'}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {userRole === 'cajero' ? (
                                    <span className="font-bold text-slate-300">
                                      {v.items?.length || 1} prenda(s)
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="font-black text-sm text-white block">
                                        ${Number(v.total).toFixed(2)}
                                      </span>
                                      {hasSaldo && (
                                        <span className="text-[10px] text-emerald-400 font-bold block">
                                          Abonó: ${Number(v.monto_abonado || 0).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {hasSaldo && (
                                      <button
                                        type="button"
                                        disabled={liquidandoVentaId === (v.id || v.codigo)}
                                        onClick={() => handleLiquidarVenta(v.id || v.codigo)}
                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] sm:text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                        title="Cobrar saldo al entregar el producto"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>
                                          {liquidandoVentaId === (v.id || v.codigo)
                                            ? 'Cobrando...'
                                            : 'COBRAR SALDO'}
                                        </span>
                                      </button>
                                    )}

                                    {(userRole === 'dueno' || userRole === 'administrador') && (
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarVenta(v.id || v.codigo)}
                                        className="px-2 py-1 rounded-lg text-rose-400 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/50 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Eliminar registro de venta permanentemente de Supabase"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Eliminar</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ======================================================== */}
          {/* CONTROL DE APERTURA Y CIERRE DE CAJA */}
          {/* ======================================================== */}
          {activeSection === 'caja' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div
                className={`rounded-3xl p-6 sm:p-7 border shadow-xl transition-all ${
                  sesionCaja && sesionCaja.estado === 'abierta'
                    ? 'bg-[#0B1A12] border-emerald-800/80 text-white'
                    : 'bg-[#13110F] border-[#26221E] text-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        sesionCaja && sesionCaja.estado === 'abierta'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#1C1A17] text-[#A69F93] border border-[#2D2822]'
                      }`}
                    >
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            sesionCaja && sesionCaja.estado === 'abierta'
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#A69F93]">
                          {sesionCaja && sesionCaja.estado === 'abierta'
                            ? 'TURNO DE CAJA ACTIVO'
                            : 'CAJA CERRADA'}
                        </span>
                        {sesionCaja && sesionCaja.estado === 'abierta' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-black inline-flex items-center gap-1">
                            <span>⏱️</span>
                            <span>Abierta hace {getDuracionCaja(sesionCaja.fecha_apertura)}</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black mt-1 text-white">
                        {sesionCaja && sesionCaja.estado === 'abierta'
                          ? `Turno abierto por ${sesionCaja.abierto_por}`
                          : 'No hay turno activo en este momento'}
                      </h2>
                      <p className="text-xs text-[#A69F93] mt-0.5">
                        {sesionCaja && sesionCaja.estado === 'abierta'
                          ? `Iniciado el ${new Date(sesionCaja.fecha_apertura).toLocaleString('es-PA')}. Fondo inicial: $${Number(sesionCaja.monto_inicial).toFixed(2)} USD.`
                          : 'Inicia el turno de caja indicando el fondo inicial en gaveta para registrar cobros y cuadres.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={reloadAllData}
                      className="p-2.5 rounded-2xl bg-[#1C1A17] border border-[#2D2822] hover:bg-[#25221F] text-white transition-colors cursor-pointer shadow-xs"
                      title="Actualizar datos"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Bloqueo estricto para trabajadores / cajeros */}
                    {userRole === 'cajero' ? (
                      <div className="px-4 py-2.5 rounded-2xl bg-[#1A1816] border border-amber-800/60 text-amber-300 text-xs font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Apertura y Cierre exclusivo de Dueño</span>
                      </div>
                    ) : sesionCaja && sesionCaja.estado === 'abierta' ? (
                      <button
                        onClick={() => {
                          setMontoCierreReal('');
                          setNotasCierreCaja('');
                          setIsModalCerrarCajaOpen(true);
                        }}
                        className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <Lock className="w-4 h-4" />
                        <span>CERRAR TURNO / HACER ARQUEO</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setMontoAperturaCaja('50.00');
                          setNotasAperturaCaja('');
                          setIsModalAbrirCajaOpen(true);
                        }}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>ABRIR TURNO DE CAJA</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumen del turno actual si está abierto */}
                {sesionCaja && sesionCaja.estado === 'abierta' && (() => {
                  const fechaInicio = sesionCaja.fecha_apertura ? new Date(sesionCaja.fecha_apertura).getTime() : 0;
                  
                  // 1. Todas las ventas del turno
                  const todasVentasTurno = ventas.filter(
                    (v) => v.creado_en && new Date(v.creado_en).getTime() >= fechaInicio
                  );
                  const ventasEfectivoTurno = todasVentasTurno.filter(
                    (v) => v.metodo_pago === 'efectivo' || v.metodo_pago === 'abono' || v.metodo_pago === 'contra_entrega'
                  );
                  const ventasYappyTurno = todasVentasTurno.filter((v) => v.metodo_pago === 'yappy');
                  const ventasTransfTurno = todasVentasTurno.filter((v) => v.metodo_pago === 'transferencia');

                  // 2. Pedidos web aprobados en este turno
                  const pedidosAprobadosTurno = pedidos.filter(
                    (p) =>
                      (p.estado === 'aprobado' || p.estado === 'entregado') &&
                      ((p.revisado_en && new Date(p.revisado_en).getTime() >= fechaInicio) ||
                        (p.creado_en && new Date(p.creado_en).getTime() >= fechaInicio))
                  );

                  // 3. Gastos del turno
                  const gastosTurno = gastos.filter(
                    (g) => g.creado_en && new Date(g.creado_en).getTime() >= fechaInicio
                  );

                  // Totales monetarios
                  const fondoInicial = Number(sesionCaja.monto_inicial) || 0;
                  const totalVentasEfectivo = ventasEfectivoTurno.reduce(
                    (acc, v) => acc + (Number(v.monto_abonado !== undefined ? v.monto_abonado : v.total) || 0),
                    0
                  );
                  const totalVentasYappy = ventasYappyTurno.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
                  const totalVentasTransf = ventasTransfTurno.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
                  const totalGastos = gastosTurno.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
                  const totalPedidosWeb = pedidosAprobadosTurno.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

                  const esperadoEnGaveta = fondoInicial + totalVentasEfectivo - totalGastos;
                  const totalFacturadoTurno = totalVentasEfectivo + totalVentasYappy + totalVentasTransf;

                  return (
                    <div className="space-y-4 pt-5 mt-5 border-t border-emerald-900/60 text-xs">
                      {userRole !== 'cajero' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          <div className="bg-[#13110F] p-3 rounded-xl border border-emerald-900/60">
                            <span className="text-[#A69F93] font-bold block text-[10px] uppercase">Fondo Inicial Gaveta</span>
                            <strong className="text-base text-white font-black">${fondoInicial.toFixed(2)}</strong>
                          </div>
                          <div className="bg-[#13110F] p-3 rounded-xl border border-emerald-900/60">
                            <span className="text-emerald-400 font-bold block text-[10px] uppercase">
                              (+) Efectivo Gaveta ({ventasEfectivoTurno.length})
                            </span>
                            <strong className="text-base text-emerald-400 font-black">+${totalVentasEfectivo.toFixed(2)}</strong>
                          </div>
                          <div className="bg-[#13110F] p-3 rounded-xl border border-sky-900/60">
                            <span className="text-sky-400 font-bold block text-[10px] uppercase">
                              (+) Yappy ({ventasYappyTurno.length})
                            </span>
                            <strong className="text-base text-sky-400 font-black">+${totalVentasYappy.toFixed(2)}</strong>
                          </div>
                          <div className="bg-[#13110F] p-3 rounded-xl border border-amber-900/60">
                            <span className="text-amber-400 font-bold block text-[10px] uppercase">
                              (+) Transferencias ({ventasTransfTurno.length})
                            </span>
                            <strong className="text-base text-amber-400 font-black">+${totalVentasTransf.toFixed(2)}</strong>
                          </div>
                          <div className="bg-[#181614] p-3 rounded-xl border border-emerald-700/80 shadow-xs col-span-2 sm:col-span-1">
                            <span className="text-emerald-300 font-extrabold block text-[10px] uppercase">Esperado en Gaveta</span>
                            <strong className="text-base text-emerald-300 font-black">${esperadoEnGaveta.toFixed(2)} USD</strong>
                          </div>
                        </div>
                      )}

                      {/* Control y Filtros de Registros dentro de la caja */}
                      <div className="bg-[#13110F] rounded-2xl p-4 border border-[#26221E] space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#26221E]">
                          <div>
                            <span className="font-extrabold text-white text-xs flex items-center gap-2">
                              <span>📋</span>
                              <span>Todos los Registros y Movimientos de la Caja Abierta</span>
                            </span>
                            <p className="text-[11px] text-[#A69F93] mt-0.5">
                              Sin límite de registros: cada venta, pedido web y gasto queda guardado aquí hasta que cierres caja
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setCajaMovimientosFiltro('todos')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                cajaMovimientosFiltro === 'todos'
                                  ? 'bg-[#C59A4D] text-black shadow-xs'
                                  : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#38332B]'
                              }`}
                            >
                              Todos ({todasVentasTurno.length + pedidosAprobadosTurno.length + gastosTurno.length + 1})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCajaMovimientosFiltro('efectivo')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                cajaMovimientosFiltro === 'efectivo'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#38332B]'
                              }`}
                            >
                              💵 Efectivo ({ventasEfectivoTurno.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCajaMovimientosFiltro('yappy')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                cajaMovimientosFiltro === 'yappy'
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#38332B]'
                              }`}
                            >
                              📱 Yappy ({ventasYappyTurno.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCajaMovimientosFiltro('transferencia')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                cajaMovimientosFiltro === 'transferencia'
                                  ? 'bg-amber-500 text-black shadow-xs'
                                  : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#38332B]'
                              }`}
                            >
                              🏦 Transf ({ventasTransfTurno.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCajaMovimientosFiltro('pedidos')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                cajaMovimientosFiltro === 'pedidos'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#38332B]'
                              }`}
                            >
                              📦 Pedidos Web ({pedidosAprobadosTurno.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCajaMovimientosFiltro('gastos')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                cajaMovimientosFiltro === 'gastos'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#38332B]'
                              }`}
                            >
                              🔻 Gastos ({gastosTurno.length})
                            </button>
                          </div>
                        </div>

                        {/* Listado con scroll infinito sin límite de registros */}
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                          {/* Entrada Base (Visible en todos o efectivo) */}
                          {(cajaMovimientosFiltro === 'todos' || cajaMovimientosFiltro === 'efectivo') && (
                            <div className="p-2.5 rounded-xl bg-[#1A1816] border border-[#26221E] flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center font-black text-sm">
                                  💼
                                </span>
                                <div>
                                  <span className="font-black text-white block text-[11px]">Fondo Inicial en Gaveta</span>
                                  <span className="text-[10px] text-[#A69F93]">
                                    Abierto por: <strong className="text-white">{sesionCaja.abierto_por}</strong> • {new Date(sesionCaja.fecha_apertura).toLocaleTimeString('es-PA')}
                                  </span>
                                </div>
                              </div>
                              <span className="font-black text-white text-sm">+${fondoInicial.toFixed(2)}</span>
                            </div>
                          )}

                          {/* Ventas filtradas del turno */}
                          {todasVentasTurno
                            .filter((v) => {
                              if (cajaMovimientosFiltro === 'todos') return true;
                              if (cajaMovimientosFiltro === 'efectivo') return v.metodo_pago === 'efectivo' || v.metodo_pago === 'abono' || v.metodo_pago === 'contra_entrega';
                              if (cajaMovimientosFiltro === 'yappy') return v.metodo_pago === 'yappy';
                              if (cajaMovimientosFiltro === 'transferencia') return v.metodo_pago === 'transferencia';
                              return false;
                            })
                            .map((v) => {
                              const cobro = Number(v.monto_abonado !== undefined ? v.monto_abonado : v.total) || 0;
                              const isEfectivo = v.metodo_pago === 'efectivo' || v.metodo_pago === 'abono' || v.metodo_pago === 'contra_entrega';
                              const isYappy = v.metodo_pago === 'yappy';
                              const icon = isEfectivo ? '💵' : isYappy ? '📱' : '🏦';
                              const tagColor = isEfectivo
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : isYappy
                                ? 'bg-sky-950 text-sky-400 border-sky-800'
                                : 'bg-amber-950 text-amber-400 border-amber-800';

                              return (
                                <div key={v.id || v.codigo} className="p-2.5 rounded-xl bg-[#1A1816] border border-[#26221E] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-[#38332B] transition-colors">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <span className="w-8 h-8 rounded-xl bg-black border border-[#2D2822] flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                                      {icon}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-black text-white text-[11px]">Venta {v.codigo}</span>
                                        <span className="text-[10px] text-[#E6C687] font-bold">({v.cliente_nombre})</span>
                                        <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-mono font-bold ${tagColor}`}>
                                          {v.metodo_pago}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-[#A69F93] block mt-0.5">
                                        Registrado por: <strong className="text-white">{v.cajero_nombre || 'Cajero'}</strong> • {v.creado_en ? new Date(v.creado_en).toLocaleTimeString('es-PA') : ''}
                                        {v.items && v.items.length > 0 && ` • ${v.items.length} prenda(s)`}
                                      </span>

                                      {/* Thumbnails con foto y talla de productos */}
                                      {v.items && v.items.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                          {v.items.map((it, idx) => {
                                            const prodImg = it.imagen_url || productos.find((p) => p.id === (it.producto_id || it.id))?.imagen_url;
                                            return (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-1 bg-[#13110F] px-1.5 py-0.5 rounded-lg border border-[#2D2822]"
                                              >
                                                {prodImg && (
                                                  <img
                                                    src={prodImg}
                                                    alt={it.nombre}
                                                    onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: it.talla ? `Talla: ${it.talla}` : undefined })}
                                                    className="w-5 h-6 object-cover rounded bg-black cursor-pointer hover:opacity-80"
                                                    title="Click para ampliar foto"
                                                  />
                                                )}
                                                <span className="text-[9px] text-white truncate max-w-[90px]">
                                                  {it.nombre}
                                                </span>
                                                {it.talla && (
                                                  <span className="text-[9px] text-[#E6C687] font-bold">
                                                    T:{it.talla}
                                                  </span>
                                                )}
                                                <span className="text-[9px] text-[#A69F93]">
                                                  x{it.cantidad || 1}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-black text-emerald-400 text-sm shrink-0 self-end sm:self-center">
                                    +${cobro.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}

                          {/* Pedidos web aprobados en este turno */}
                          {(cajaMovimientosFiltro === 'todos' || cajaMovimientosFiltro === 'pedidos') &&
                            pedidosAprobadosTurno.map((p) => (
                              <div key={p.id || p.codigo} className="p-2.5 rounded-xl bg-[#15131A] border border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-indigo-800/60 transition-colors">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                                    📦
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-black text-white text-[11px]">Pedido Web {p.codigo}</span>
                                      <span className="text-[10px] text-indigo-300 font-bold">({p.cliente_nombre})</span>
                                      <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 text-[9px] uppercase font-mono font-bold">
                                        {p.metodo_pago}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-[#A69F93] block mt-0.5">
                                      Aceptado por: <strong className="text-[#E6C687]">{p.revisado_por || 'Administrador'}</strong> • {p.revisado_en ? new Date(p.revisado_en).toLocaleTimeString('es-PA') : (p.creado_en ? new Date(p.creado_en).toLocaleTimeString('es-PA') : '')}
                                    </span>

                                    {/* Thumbnails con foto y talla de productos */}
                                    {p.items && p.items.length > 0 && (
                                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                        {p.items.map((it, idx) => {
                                          const prodImg = it.imagen_url || productos.find((prod) => prod.id === (it.producto_id || it.id))?.imagen_url;
                                          return (
                                            <div
                                              key={idx}
                                              className="flex items-center gap-1 bg-[#13110F] px-1.5 py-0.5 rounded-lg border border-[#2D2822]"
                                            >
                                              {prodImg && (
                                                <img
                                                  src={prodImg}
                                                  alt={it.nombre}
                                                  onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: it.talla ? `Talla: ${it.talla}` : undefined })}
                                                  className="w-5 h-6 object-cover rounded bg-black cursor-pointer hover:opacity-80"
                                                  title="Click para ampliar foto"
                                                />
                                              )}
                                              <span className="text-[9px] text-white truncate max-w-[90px]">
                                                {it.nombre}
                                              </span>
                                              {it.talla && (
                                                <span className="text-[9px] text-[#E6C687] font-bold">
                                                  T:{it.talla}
                                                </span>
                                              )}
                                              <span className="text-[9px] text-[#A69F93]">
                                                x{it.cantidad || 1}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className="font-black text-indigo-400 text-sm shrink-0 self-end sm:self-center">
                                  +${Number(p.total).toFixed(2)}
                                </span>
                              </div>
                            ))}

                          {/* Gastos del turno */}
                          {(cajaMovimientosFiltro === 'todos' || cajaMovimientosFiltro === 'gastos') &&
                            gastosTurno.map((g) => (
                              <div key={g.id || g.concepto} className="p-2.5 rounded-xl bg-[#1A1816] border border-[#26221E] flex items-center justify-between gap-3 text-xs hover:border-rose-900/50 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-400 flex items-center justify-center font-black text-sm">
                                    🔻
                                  </span>
                                  <div>
                                    <span className="font-black text-rose-300 block text-[11px]">Gasto: {g.concepto}</span>
                                    <span className="text-[10px] text-[#A69F93] block">
                                      Por: <strong className="text-white">{g.creado_por || 'Admin'}</strong> • {g.fecha ? new Date(g.fecha).toLocaleTimeString('es-PA') : ''}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-black text-rose-400 text-sm">
                                  -${Number(g.monto).toFixed(2)}
                                </span>
                              </div>
                            ))}

                          {todasVentasTurno.length === 0 && pedidosAprobadosTurno.length === 0 && gastosTurno.length === 0 && (
                            <p className="text-[11px] text-[#7A7368] py-4 text-center">
                              No hay registros de ventas, pedidos ni gastos en este turno todavía.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Historial de Turnos de Caja */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-xl space-y-4 p-5 sm:p-6 text-white">
                <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
                  <div>
                    <h3 className="font-black text-sm text-white">Historial de Turnos & Arqueos de Caja</h3>
                    <p className="text-[11px] text-[#A69F93]">Registro persistente de aperturas, cierres, duraciones y diferencias de efectivo</p>
                  </div>
                  <span className="text-xs font-bold text-[#A69F93]">{historialCaja.length} registros</span>
                </div>

                {historialCaja.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#7A7368]">
                    No hay turnos de caja registrados aún. Abre la caja para comenzar el primer turno.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-xs">
                      <thead className="bg-[#1A1816] border-b border-[#26221E] text-[10px] font-black uppercase text-[#A69F93] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4">Apertura</th>
                          <th className="py-3 px-4">Duración</th>
                          <th className="py-3 px-4">Abierto por</th>
                          <th className="py-3 px-4 text-right">Fondo Inicial</th>
                          {userRole !== 'cajero' && (
                            <>
                              <th className="py-3 px-4 text-right">Esperado</th>
                              <th className="py-3 px-4 text-right">Contado (Real)</th>
                              <th className="py-3 px-4 text-right">Diferencia</th>
                            </>
                          )}
                          <th className="py-3 px-4">Cierre</th>
                          <th className="py-3 px-4">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#221F1C]">
                        {historialCaja.map((reg) => (
                          <tr key={reg.id} className="hover:bg-[#1A1816] transition-colors">
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  reg.estado === 'abierta'
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                                    : 'bg-[#25221F] text-slate-300 border border-[#332E27]'
                                }`}
                              >
                                {reg.estado === 'abierta' ? '🟢 Abierta' : 'Cerrada'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#A69F93]">
                              {reg.fecha_apertura ? new Date(reg.fecha_apertura).toLocaleString('es-PA') : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-[#E6C687]">
                              {reg.estado === 'abierta'
                                ? `⏱️ ${getDuracionCaja(reg.fecha_apertura)}`
                                : getDuracionCaja(reg.fecha_apertura, reg.fecha_cierre || undefined)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              {reg.abierto_por}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-200">
                              ${Number(reg.monto_inicial || 0).toFixed(2)}
                            </td>
                            {userRole !== 'cajero' && (
                              <>
                                <td className="py-3.5 px-4 text-right font-medium text-[#A69F93]">
                                  {reg.monto_esperado !== undefined && reg.monto_esperado !== null ? `$${Number(reg.monto_esperado).toFixed(2)}` : '—'}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-white">
                                  {reg.monto_final_real !== undefined && reg.monto_final_real !== null ? `$${Number(reg.monto_final_real).toFixed(2)}` : '—'}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black">
                                  {reg.diferencia !== undefined && reg.diferencia !== null && !isNaN(Number(reg.diferencia)) ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                        Number(reg.diferencia) === 0
                                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                                          : Number(reg.diferencia) > 0
                                          ? 'text-blue-400 bg-blue-950/60 border border-blue-800/60'
                                          : 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                                      }`}
                                    >
                                      {Number(reg.diferencia) > 0 ? `+${Number(reg.diferencia).toFixed(2)}` : `${Number(reg.diferencia).toFixed(2)}`}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </>
                            )}
                            <td className="py-3.5 px-4 text-[#A69F93] text-[11px]">
                              {reg.fecha_cierre ? (
                                <div>
                                  <span>{new Date(reg.fecha_cierre).toLocaleString('es-PA')}</span>
                                  {reg.cerrado_por && (
                                    <span className="block text-[10px] text-[#7A7368]">por {reg.cerrado_por}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-emerald-400 font-bold">En curso...</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[#A69F93] text-[11px] max-w-[200px] truncate">
                              {reg.notas || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* GASTOS & BALANCE FINANCIERO (Solo Dueño y Administrador) */}
          {/* ======================================================== */}
          {activeSection === 'gastos' && (
            <div className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    TOTAL VENTAS (INGRESOS BRUTOS)
                  </span>
                  <span className="text-3xl font-black text-white block my-2">
                    ${totalVentasGanado.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {ventas.length} ventas acumuladas
                  </span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    TOTAL GASTOS REGISTRADOS
                  </span>
                  <span className="text-3xl font-black text-rose-400 block my-2">
                    -${totalGastosMonto.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {gastos.length} gastos operativos / inventario
                  </span>
                </div>

                <div className={`rounded-3xl p-5 border shadow-md ${
                  totalNetoGanancia >= 0
                    ? 'bg-[#0B1A12] border-emerald-800/80 text-emerald-300'
                    : 'bg-[#1F0C0E] border-rose-800/80 text-rose-300'
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-wider block opacity-90 text-[#E6C687]">
                    TOTAL NETO EN CAJA (GANANCIA REAL)
                  </span>
                  <span className="text-3xl font-black text-white block my-2">
                    ${totalNetoGanancia.toFixed(2)} USD
                  </span>
                  <span className={`text-[11px] font-bold ${totalNetoGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Ventas menos Gastos deducidos en tiempo real
                  </span>
                </div>
              </div>

              {/* Action and Filter Bar */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const yesterdayDate = new Date();
                yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

                const gastosFiltrados = gastos.filter((g) => {
                  if (!gastoFechaFilter) return true;
                  if (!g.fecha) return false;
                  try {
                    const d = new Date(g.fecha).toISOString().split('T')[0];
                    return d === gastoFechaFilter;
                  } catch {
                    return false;
                  }
                });

                const totalGastosFiltrados = gastosFiltrados.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

                return (
                  <>
                    <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setIsModalGastoOpen(true)}
                          className="px-5 py-2.5 rounded-2xl bg-[#C59A4D] hover:bg-[#D4A95D] text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>REGISTRAR NUEVO GASTO</span>
                        </button>
                        <button
                          onClick={reloadAllData}
                          className="p-2.5 rounded-xl border border-[#38332B] hover:bg-[#1E1B18] text-[#E6C687] transition-colors cursor-pointer"
                          title="Recargar datos"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Date Filter Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold text-[#A69F93] flex items-center gap-1">
                          📅 Filtrar por día:
                        </span>
                        <input
                          type="date"
                          value={gastoFechaFilter}
                          onChange={(e) => setGastoFechaFilter(e.target.value)}
                          className="bg-[#1A1816] text-white text-xs px-3 py-1.5 rounded-xl border border-[#332E27] focus:outline-none focus:border-[#C59A4D]"
                        />
                        <button
                          type="button"
                          onClick={() => setGastoFechaFilter(todayStr)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                            gastoFechaFilter === todayStr
                              ? 'bg-[#C59A4D] text-[#141312]'
                              : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#2D2822]'
                          }`}
                        >
                          Hoy
                        </button>
                        <button
                          type="button"
                          onClick={() => setGastoFechaFilter(yesterdayStr)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                            gastoFechaFilter === yesterdayStr
                              ? 'bg-[#C59A4D] text-[#141312]'
                              : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#2D2822]'
                          }`}
                        >
                          Ayer
                        </button>
                        {gastoFechaFilter && (
                          <button
                            type="button"
                            onClick={() => setGastoFechaFilter('')}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#26221E] text-rose-300 hover:text-rose-200 cursor-pointer"
                          >
                            ✕ Ver Todos
                          </button>
                        )}

                        {/* Botones de eliminación masiva de Gastos (Dueño / Admin) */}
                        {(userRole === 'dueno' || userRole === 'administrador') && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            {gastoFechaFilter && gastosFiltrados.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleEliminarGastosFiltrados(gastosFiltrados)}
                                className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-[#E6C687] border border-amber-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                                title="Eliminar los gastos del día actualmente filtrado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar ({gastosFiltrados.length}) del Día</span>
                              </button>
                            )}

                            {gastos.length > 0 && (
                              <button
                                type="button"
                                onClick={handleVaciarGastos}
                                className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                                title="Eliminar absolutamente todos los gastos registrados en Supabase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Vaciar Todos los Gastos</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filter Summary Banner if date filter active */}
                    {gastoFechaFilter && (
                      <div className="bg-[#181614] p-3.5 rounded-2xl border border-[#332E27] flex items-center justify-between text-xs text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">🔍 Mostrando gastos del día:</span>
                          <strong className="font-mono text-white text-sm">{gastoFechaFilter}</strong>
                          <span className="text-[#A69F93]">({gastosFiltrados.length} registros encontrados)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#A69F93]">Total de este día:</span>
                          <span className="text-rose-400 font-black text-base">-${totalGastosFiltrados.toFixed(2)} USD</span>
                        </div>
                      </div>
                    )}

                    {/* Expenses Table */}
                    <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                      {gastosFiltrados.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                          <Wallet className="w-10 h-10 mx-auto text-[#6A6358]" />
                          <h3 className="font-extrabold text-white">
                            {gastoFechaFilter ? `No hay gastos registrados el ${gastoFechaFilter}` : 'No hay gastos registrados todavía'}
                          </h3>
                          <p className="text-xs text-[#A69F93] max-w-md mx-auto">
                            {gastoFechaFilter ? 'Prueba seleccionando otra fecha o pulsando "Ver Todos".' : 'Registra compras de mercancía o egresos de la tienda.'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[620px] text-left text-xs">
                            <thead className="bg-[#1A1816] border-b border-[#26221E] text-[10px] font-black uppercase text-[#E6C687] tracking-wider">
                              <tr>
                                <th className="py-3.5 px-4">Concepto / Descripción</th>
                                <th className="py-3.5 px-4">Categoría</th>
                                <th className="py-3.5 px-4">Fecha</th>
                                <th className="py-3.5 px-4">Registrado Por</th>
                                <th className="py-3.5 px-4 text-right">Monto Deducido</th>
                                <th className="py-3.5 px-4 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#221F1C]">
                              {gastosFiltrados.map((g) => (
                                <tr key={g.id || g.concepto} className="hover:bg-[#1A1816]/60 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <span className="font-extrabold text-white block">{g.concepto}</span>
                                    {g.notas && (
                                      <span className="text-[11px] text-[#A69F93] block mt-0.5">{g.notas}</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E1B18] border border-[#38332B] text-[#E6C687]">
                                      {g.categoria}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-[#A69F93] font-mono">
                                    {g.fecha ? new Date(g.fecha).toLocaleString('es-PA') : 'Reciente'}
                                  </td>
                                  <td className="py-3.5 px-4 text-white font-bold">
                                    {g.creado_por || 'Administrador'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-black text-rose-400 text-sm">
                                    -${Number(g.monto).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {g.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarGasto(g.id!, g.concepto)}
                                        className="px-2.5 py-1 rounded-lg text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Eliminar gasto"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Eliminar</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ======================================================== */}
          {/* REGISTRO DE MOVIMIENTOS & AUDITORÍA DE TRABAJADORES */}
          {/* ======================================================== */}
          {activeSection === 'movimientos' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header card */}
              <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-heading flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#C59A4D]" />
                    Registro de Movimientos & Auditoría de Trabajadores
                  </h2>
                  <p className="text-xs text-[#A69F93] mt-0.5">
                    Historial cronológico de cada acción, turno, confirmación de pedidos, cobros y ajustes de inventario realizados por los trabajadores.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={async () => {
                      const m = await getMovimientosTrabajadores();
                      setMovimientos(m);
                    }}
                    className="p-2.5 rounded-2xl bg-[#1E1B18] hover:bg-[#2A2622] text-[#E6C687] border border-[#38332B] transition-colors cursor-pointer"
                    title="Actualizar movimientos en tiempo real"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {userRole === 'dueno' && (
                    <button
                      onClick={handleLimpiarHistorialMovimientosRegistro}
                      className="px-4 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>VACIAR HISTORIAL</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Stat Cards de Auditoría */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    TOTAL MOVIMIENTOS
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white block my-2">
                    {movimientos.length}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Acciones registradas
                  </span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    TURNOS DE TRABAJO
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 block my-2">
                    {movimientos.filter((m) => m.modulo === 'auth' || m.accion.toLowerCase().includes('turno')).length}
                  </span>
                  <span className="text-[11px] text-[#A69F93]">
                    Inicios de sesión
                  </span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    MOVIMIENTOS EN PEDIDOS
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#E6C687] block my-2">
                    {movimientos.filter((m) => m.modulo === 'pedidos').length}
                  </span>
                  <span className="text-[11px] text-[#A69F93]">
                    Aprobados / Rechazados
                  </span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    AJUSTES DE INVENTARIO
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-sky-400 block my-2">
                    {movimientos.filter((m) => m.modulo === 'inventario').length}
                  </span>
                  <span className="text-[11px] text-[#A69F93]">
                    Stock modificado
                  </span>
                </div>
              </div>

              {/* Filtros de Búsqueda y Módulo */}
              <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por trabajador, correo, pedido o acción..."
                    value={movimientosSearch}
                    onChange={(e) => setMovimientosSearch(e.target.value)}
                    className="w-full bg-[#1A1816] text-xs px-10 py-2.5 rounded-2xl border border-[#38332B] text-white placeholder-[#6A6358] focus:outline-none focus:border-[#C59A4D]"
                  />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Filtro por Día */}
                  <div className="flex items-center gap-1.5 bg-[#1A1816] px-3 py-1.5 rounded-2xl border border-[#38332B]">
                    <span className="text-[10px] text-[#A69F93] font-bold">📅 Día:</span>
                    <input
                      type="date"
                      value={movimientosFechaFilter}
                      onChange={(e) => setMovimientosFechaFilter(e.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono"
                    />
                    {movimientosFechaFilter && (
                      <button
                        type="button"
                        onClick={() => setMovimientosFechaFilter('')}
                        className="text-[10px] text-rose-400 hover:text-rose-300 ml-1 font-bold cursor-pointer"
                        title="Ver todos los días"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    value={movimientosModuloFilter}
                    onChange={(e) => setMovimientosModuloFilter(e.target.value)}
                    className="bg-[#1A1816] text-xs font-bold text-[#E6C687] px-3.5 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none"
                  >
                    <option value="todos" className="bg-[#1A1816] text-white">Todos los Módulos</option>
                    <option value="auth" className="bg-[#1A1816] text-white">Turnos / Sesiones</option>
                    <option value="pedidos" className="bg-[#1A1816] text-white">Pedidos & Comprobantes</option>
                    <option value="inventario" className="bg-[#1A1816] text-white">Inventario & Stock</option>
                    <option value="ventas" className="bg-[#1A1816] text-white">Ventas</option>
                    <option value="gastos" className="bg-[#1A1816] text-white">Gastos</option>
                  </select>

                  <select
                    value={movimientosRolFilter}
                    onChange={(e) => setMovimientosRolFilter(e.target.value)}
                    className="bg-[#1A1816] text-xs font-bold text-[#E6C687] px-3.5 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none"
                  >
                    <option value="todos" className="bg-[#1A1816] text-white">Todos los Roles</option>
                    <option value="cajero" className="bg-[#1A1816] text-white">Solo Trabajadores</option>
                    <option value="dueno" className="bg-[#1A1816] text-white">Solo Dueños</option>
                    <option value="administrador" className="bg-[#1A1816] text-white">Solo Administradores</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Movimientos */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead className="bg-[#1A1816] border-b border-[#26221E] text-[10px] font-black uppercase text-[#E6C687] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5">FECHA Y HORA</th>
                        <th className="py-3.5 px-5">TRABAJADOR / USUARIO</th>
                        <th className="py-3.5 px-5">MÓDULO</th>
                        <th className="py-3.5 px-5">ACCIÓN REALIZADA</th>
                        <th className="py-3.5 px-5">DETALLES DEL MOVIMIENTO</th>
                        {userRole === 'dueno' && (
                          <th className="py-3.5 px-5 text-right">ACCIONES</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#221F1C]">
                      {movimientos
                        .filter((m) => {
                          if (movimientosModuloFilter !== 'todos' && m.modulo !== movimientosModuloFilter) return false;
                          if (movimientosRolFilter !== 'todos' && m.rol !== movimientosRolFilter) return false;
                          if (movimientosFechaFilter) {
                            const dStr = m.creado_en ? new Date(m.creado_en).toISOString().slice(0, 10) : '';
                            if (dStr !== movimientosFechaFilter) return false;
                          }
                          if (movimientosSearch.trim()) {
                            const query = movimientosSearch.toLowerCase();
                            const matchesNombre = m.usuario_nombre.toLowerCase().includes(query);
                            const matchesEmail = m.usuario_email.toLowerCase().includes(query);
                            const matchesAccion = m.accion.toLowerCase().includes(query);
                            const matchesDetalles = (m.detalles || '').toLowerCase().includes(query);
                            if (!matchesNombre && !matchesEmail && !matchesAccion && !matchesDetalles) {
                              return false;
                            }
                          }
                          return true;
                        })
                        .map((mov) => {
                          const dateObj = new Date(mov.creado_en);
                          const formattedDate = dateObj.toLocaleDateString('es-PA', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          });
                          const formattedTime = dateObj.toLocaleTimeString('es-PA', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          });

                          const isWorker = mov.rol === 'cajero' || mov.rol === 'trabajador';

                          return (
                            <tr key={mov.id} className="hover:bg-[#1A1816]/60 transition-colors">
                              <td className="py-3.5 px-5 whitespace-nowrap">
                                <span className="font-bold text-white block">{formattedTime}</span>
                                <span className="text-[10px] text-[#A69F93] block">{formattedDate}</span>
                              </td>

                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isWorker ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-[#E6C687] border border-amber-800'
                                  }`}>
                                    {mov.usuario_nombre.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <strong className="text-xs text-white">{mov.usuario_nombre}</strong>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                        isWorker
                                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                          : 'bg-amber-950/80 text-[#E6C687] border border-amber-800'
                                      }`}>
                                        {isWorker ? 'TRABAJADOR' : mov.rol.toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-[#A69F93] block truncate">
                                      {mov.usuario_email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#1E1B18] text-[#E6C687] border border-[#38332B]">
                                  {mov.modulo || 'general'}
                                </span>
                              </td>

                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                                  mov.accion.includes('Aprobó') || mov.accion.includes('Verificado')
                                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                                    : mov.accion.includes('Rechazó')
                                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                                    : mov.accion.includes('Stock')
                                    ? 'bg-sky-950/60 text-sky-300 border border-sky-800/80'
                                    : mov.accion.includes('Turno') || mov.accion.includes('Sesión')
                                    ? 'bg-purple-950/60 text-purple-300 border border-purple-800/80'
                                    : 'bg-amber-950/60 text-[#E6C687] border border-amber-800/80'
                                }`}>
                                  {mov.accion}
                                </span>
                              </td>

                              <td className="py-3.5 px-5 max-w-md">
                                <p className="text-xs text-[#C9BFB0] font-medium leading-relaxed">
                                  {mov.detalles || 'Sin detalles adicionales'}
                                </p>
                              </td>

                              {userRole === 'dueno' && (
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    onClick={() => handleEliminarMovimientoRegistro(mov.id)}
                                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 hover:border-rose-800 border border-transparent transition-colors cursor-pointer"
                                    title="Eliminar este registro de auditoría"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                      {movimientos.length === 0 && (
                        <tr>
                          <td colSpan={userRole === 'dueno' ? 6 : 5} className="py-14 text-center text-[#A69F93]">
                            <Activity className="w-8 h-8 text-[#6A6358] mx-auto mb-2" />
                            <strong className="block text-sm text-white">
                              No hay movimientos registrados todavía
                            </strong>
                            <p className="text-xs text-[#A69F93] mt-1 max-w-sm mx-auto">
                              Cada vez que un trabajador inicie turno, apruebe pedidos o ajuste inventario, se registrará automáticamente en esta tabla.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. PEDIDOS & COMPROBANTES (Image 4) */}
          {/* ======================================================== */}
          {activeSection === 'pedidos' && (
            <div className="space-y-6">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">TOTAL PEDIDOS REGISTRADOS</span>
                  <span className="text-3xl font-black text-white block my-2">{pedidos.length}</span>
                  <span className="text-[11px] text-[#A69F93]">En línea y WhatsApp</span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">PENDIENTES POR VERIFICAR</span>
                  <span className="text-3xl font-black text-amber-400 block my-2">{pedidosPendientes}</span>
                  <span className="text-[11px] text-amber-400">Comprobante por revisar</span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">APROBADOS & ENTREGADOS</span>
                  <span className="text-3xl font-black text-emerald-400 block my-2">{pedidosAprobados}</span>
                  <span className="text-[11px] text-emerald-400">Pasados a ventas</span>
                </div>

                <div className="bg-[#13110F] rounded-3xl p-5 border border-[#26221E] shadow-md">
                  <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                    {userRole === 'cajero' ? 'ARTÍCULOS EN PROCESO' : 'VOLUMEN EN PEDIDOS'}
                  </span>
                  <span className="text-3xl font-black text-white block my-2">
                    {userRole === 'cajero' ? `${pedidos.length} pedidos` : `$${volumenTotalPedidos}`}
                  </span>
                  <span className="text-[11px] text-[#A69F93]">
                    {userRole === 'cajero' ? 'Turno operativo activo' : 'Excluye cancelados'}
                  </span>
                </div>
              </div>

              {/* Search & Status Filters */}
              <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69F93]" />
                  <input
                    type="text"
                    placeholder="Buscar por código, cliente o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1A1816] text-xs text-white px-10 py-2.5 rounded-2xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D] placeholder-[#7A7368]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(['todos', 'pendientes', 'aprobados', 'entregados', 'cancelados'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPedidoFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        pedidoFilter === tab
                          ? 'bg-[#C59A4D] text-[#141312] font-black shadow-sm'
                          : 'bg-[#1A1816] text-white hover:bg-[#25221F] border border-[#2D2822]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                  <button
                    onClick={reloadAllData}
                    className="p-2 rounded-xl border border-[#2D2822] bg-[#1A1816] hover:bg-[#25221F] text-white cursor-pointer"
                    title="Recargar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {(userRole === 'dueno' || userRole === 'administrador') && pedidos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleVaciarPedidos}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      title="Eliminar absolutamente todos los pedidos de la base de datos de Supabase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Vaciar Todos los Pedidos</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Toast de confirmación de comprobante */}
              {comprobanteToast && (
                <div
                  className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-fade-in shadow-md ${
                    comprobanteToast.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{comprobanteToast.msg}</span>
                  </div>
                  <button
                    onClick={() => setComprobanteToast(null)}
                    className="p-1 hover:bg-emerald-900/50 rounded-lg text-emerald-300 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Alerta de Caja Cerrada para Cajeros en Pedidos */}
              {userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta') && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3 shadow-md">
                  <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-black text-rose-300 uppercase tracking-wider text-xs block">
                      🔴 CAJA CERRADA - APROBACIÓN DE PEDIDOS BLOQUEADA
                    </span>
                    <p className="text-[11px] text-rose-200/90 leading-relaxed">
                      Como trabajador, <strong>no tienes permitido aceptar pedidos ni descontar inventario</strong> mientras la caja esté cerrada. Pide al <strong>Dueño o Administrador</strong> que abra el turno de caja para habilitar las aprobaciones.
                    </p>
                  </div>
                </div>
              )}

              {/* Order Cards List */}
              <div className="space-y-4">
                {pedidos
                  .filter((p) => {
                    if (pedidoFilter === 'pendientes' && p.estado !== 'pendiente') return false;
                    if (pedidoFilter === 'aprobados' && p.estado !== 'aprobado' && p.estado !== 'aceptado') return false;
                    if (pedidoFilter === 'entregados' && p.estado !== 'entregado') return false;
                    if (pedidoFilter === 'cancelados' && p.estado !== 'cancelado' && p.estado !== 'rechazado') return false;
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const matchCode = p.codigo.toLowerCase().includes(q);
                      const matchClient = p.cliente_nombre.toLowerCase().includes(q);
                      const matchPhone = p.cliente_telefono.includes(q);
                      return matchCode || matchClient || matchPhone;
                    }
                    return true;
                  })
                  .map((pedido) => (
                    <div
                      key={pedido.id || pedido.codigo}
                      className="bg-[#13110F] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-[#26221E] shadow-xl space-y-4 text-white"
                    >
                      {/* Order Header bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-[#26221E] gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black border border-[#2D2822] text-[#E6C687] flex items-center justify-center font-black text-xs shrink-0">
                            ALX
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-white">{pedido.codigo}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase ${
                                  pedido.estado === 'pendiente'
                                    ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                    : pedido.estado === 'aprobado' || pedido.estado === 'aceptado'
                                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                                    : pedido.estado === 'entregado'
                                    ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                                    : 'bg-rose-950/70 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {pedido.estado}
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-[#A69F93] block">
                              {pedido.creado_en ? new Date(pedido.creado_en).toLocaleString('es-PA') : 'Reciente'}
                            </span>
                          </div>
                        </div>

                        {/* Status selector & Direct Action buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {pedido.estado !== 'aprobado' && pedido.estado !== 'entregado' && (
                            <button
                              type="button"
                              disabled={orderActionLoadingId === (pedido.id || pedido.codigo)}
                              onClick={() => {
                                if (userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')) {
                                  alert('⚠️ LA CAJA ESTÁ CERRADA: Como trabajador, no puedes aceptar pedidos mientras la caja esté cerrada. Pide al Dueño o Administrador que abra el turno de caja.');
                                  return;
                                }
                                handleAprobarPedido(pedido);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                                userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')
                                  ? 'bg-[#26221E] text-rose-300 border border-rose-800/60 hover:bg-[#2F2924]'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              title={
                                userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')
                                  ? 'Caja cerrada: el trabajador no puede aceptar pedidos hasta que se abra el turno'
                                  : 'Aceptar pedido: descuenta stock automáticamente de inventario y registra la venta en Ventas'
                              }
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>
                                {orderActionLoadingId === (pedido.id || pedido.codigo)
                                  ? 'Aceptando...'
                                  : userRole === 'cajero' && (!sesionCaja || sesionCaja.estado !== 'abierta')
                                  ? '🔒 CAJA CERRADA'
                                  : 'ACEPTAR'}
                              </span>
                            </button>
                          )}

                          {pedido.estado === 'pendiente' && (
                            <button
                              type="button"
                              disabled={orderActionLoadingId === (pedido.id || pedido.codigo)}
                              onClick={() => handleRechazarPedido(pedido)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-950 text-rose-300 border border-rose-900 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              title="Rechazar pedido"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rechazar</span>
                            </button>
                          )}

                          <select
                            value={pedido.estado}
                            onChange={(e) =>
                              handleUpdateOrderStatus(pedido.id || '', e.target.value)
                            }
                            className="bg-[#1A1816] text-[11px] sm:text-xs font-bold text-white px-2.5 py-1.5 rounded-xl border border-[#2D2822] focus:outline-none"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleEliminarPedido(pedido.id || pedido.codigo, pedido.codigo)}
                            className="px-2 py-1.5 rounded-xl text-rose-400 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/50 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Eliminar este pedido permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      </div>

                      {/* 3 Columns details */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 text-xs">
                        {/* Col 1: Datos del Cliente */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                            DATOS DEL CLIENTE
                          </span>
                          <strong className="text-sm text-white block">{pedido.cliente_nombre}</strong>
                          <div className="flex items-center gap-2 text-[#A69F93]">
                            <Phone className="w-3.5 h-3.5 text-[#C59A4D]" />
                            <span>{pedido.cliente_telefono}</span>
                            <button
                              onClick={() => {
                                const cleanPhone = pedido.cliente_telefono.replace(/\D/g, '') || '66212802';
                                window.open(
                                  `https://wa.me/507${cleanPhone}?text=${encodeURIComponent(
                                    `Hola ${pedido.cliente_nombre}, te escribimos de AlexStore respecto a tu pedido ${pedido.codigo}.`
                                  )}`,
                                  '_blank'
                                );
                              }}
                              className="p-1 rounded-full bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900 border border-emerald-800 cursor-pointer"
                              title="Chatear por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                          {pedido.cliente_direccion && (
                            <span className="text-[#A69F93] block mt-1">
                              📍 {pedido.cliente_direccion}
                            </span>
                          )}
                          {pedido.notas && (
                            <span className="text-[11px] text-[#A69F93] block italic mt-1 bg-[#1A1816] p-2 rounded-xl border border-[#2D2822]">
                              Nota: {pedido.notas}
                            </span>
                          )}
                        </div>

                        {/* Col 2: Pago & Comprobante (Requisito 4) */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#A69F93]">
                              PAGO & COMPROBANTE
                            </span>
                            <span className="px-2 py-0.5 rounded bg-black border border-[#2D2822] text-[#E6C687] text-[9px] font-black uppercase">
                              {pedido.metodo_pago}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-[#A69F93]">
                              {userRole === 'cajero' ? 'Artículos:' : 'Monto Total:'}
                            </span>
                            {userRole === 'cajero' ? (
                              <span className="text-base font-black text-slate-200">
                                {pedido.items?.reduce((s, it) => s + (it.cantidad || 1), 0) || pedido.items?.length || 1} prenda(s)
                              </span>
                            ) : (
                              <span className="text-xl font-black text-[#E6C687]">${pedido.total}</span>
                            )}
                          </div>

                          {/* Estado de validación del comprobante */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#A69F93] font-bold">Estado del Comprobante:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                pedido.estado_pago === 'verificado'
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                                  : pedido.estado_pago === 'rechazado'
                                  ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950/70 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {pedido.estado_pago === 'verificado'
                                ? '✅ Verificado'
                                : pedido.estado_pago === 'rechazado'
                                ? '❌ Rechazado'
                                : '⏳ Pendiente'}
                            </span>
                          </div>

                          {pedido.comprobante_url ? (
                            <div className="rounded-2xl bg-[#1A1816] border border-[#2D2822] p-2.5 space-y-2.5">
                              {/* Vista previa de imagen + botones Ver y Descargar */}
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={pedido.comprobante_url}
                                  alt="Comprobante de pago"
                                  className="w-14 h-14 object-cover rounded-xl border border-[#332E27] shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    setSelectedOrderForProof(pedido);
                                    setViewingProofUrl(pedido.comprobante_url || null);
                                  }}
                                  title="Click para ver en pantalla completa"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-white block truncate">
                                    Comprobante Adjunto
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOrderForProof(pedido);
                                        setViewingProofUrl(pedido.comprobante_url || null);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-[#C59A4D] text-[#141312] text-[10px] font-black flex items-center gap-1 hover:bg-[#B3873B] transition-colors cursor-pointer"
                                      title="Abrir en tamaño completo"
                                    >
                                      <Eye className="w-3 h-3 text-[#141312]" />
                                      <span>Ver</span>
                                    </button>

                                    <a
                                      href={pedido.comprobante_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 rounded-lg bg-[#141210] border border-[#2D2822] hover:bg-[#1E1B18] text-[#E6C687] text-[10px] font-bold flex items-center gap-1 transition-colors"
                                      title="Abrir comprobante en nueva pestaña"
                                    >
                                      <ExternalLink className="w-3 h-3 text-[#A69F93]" />
                                      <span>Pestaña</span>
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyReceiptLink(pedido.comprobante_url!, pedido.id || pedido.codigo)}
                                      className="px-2 py-1 rounded-lg bg-[#141210] border border-[#2D2822] hover:bg-[#1E1B18] text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Copiar enlace directo del comprobante"
                                    >
                                      <Copy className="w-3 h-3 text-[#A69F93]" />
                                      <span>{copiedLinkOrderId === (pedido.id || pedido.codigo) ? '¡Copiado!' : 'Copiar link'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        descargarArchivo(
                                          pedido.comprobante_url!,
                                          `comprobante_${pedido.codigo}_${pedido.cliente_nombre.replace(/\s+/g, '_')}.jpg`
                                        )
                                      }
                                      className="px-2 py-1 rounded-lg bg-[#141210] border border-[#2D2822] hover:bg-[#1E1B18] text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Descargar comprobante a tu dispositivo con nombre descriptivo"
                                    >
                                      <Download className="w-3 h-3 text-[#A69F93]" />
                                      <span>Descargar</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Selector rápido de validación del comprobante con confirmación visual */}
                              <div className="pt-2 border-t border-[#26221E] flex items-center justify-between gap-1">
                                <span className="text-[10px] text-[#A69F93] font-bold">Cambiar estado:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdatePaymentProofStatus(
                                        pedido.id || pedido.codigo,
                                        pedido.codigo,
                                        'verificado'
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                      pedido.estado_pago === 'verificado'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-950 border border-emerald-800'
                                    }`}
                                    title="Marcar comprobante como verificado"
                                  >
                                    Verificar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdatePaymentProofStatus(
                                        pedido.id || pedido.codigo,
                                        pedido.codigo,
                                        'rechazado'
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                      pedido.estado_pago === 'rechazado'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-rose-950/60 text-rose-400 hover:bg-rose-950 border border-rose-800'
                                    }`}
                                    title="Marcar comprobante como rechazado"
                                  >
                                    Rechazar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdatePaymentProofStatus(
                                        pedido.id || pedido.codigo,
                                        pedido.codigo,
                                        'pendiente_revision'
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                      pedido.estado_pago === 'pendiente_revision'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-amber-950/60 text-amber-400 hover:bg-amber-950 border border-amber-800'
                                    }`}
                                    title="Restablecer comprobante a pendiente"
                                  >
                                    Pendiente
                                  </button>
                                </div>

                                {pedido.revisado_por && (
                                  <div className="pt-2 border-t border-[#26221E] text-[10px] text-[#A69F93] flex items-center justify-between">
                                    <span>Revisado por: <strong className="text-white">{pedido.revisado_por}</strong></span>
                                    {pedido.revisado_en && <span>{new Date(pedido.revisado_en).toLocaleString('es-PA')}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-[#1A1816] border border-dashed border-[#332E27] text-center space-y-2">
                              <span className="text-[11px] text-[#A69F93] font-bold block">
                                ⚠️ Sin comprobante adjunto
                              </span>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13110F] border border-[#2D2822] hover:border-[#C59A4D] text-[#E6C687] text-[10px] font-bold cursor-pointer transition-colors shadow-xs">
                                <UploadCloud className="w-3.5 h-3.5 text-[#C59A4D]" />
                                <span>
                                  {uploadingProofOrderId === (pedido.id || pedido.codigo)
                                    ? 'Subiendo...'
                                    : 'Subir comprobante'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingProofOrderId === (pedido.id || pedido.codigo)}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleAttachReceiptToOrder(pedido, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Col 3: Productos del Pedido (con variantes y opciones) */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-[#A69F93] block">
                            PRODUCTOS DEL PEDIDO ({pedido.items?.length || 0})
                          </span>

                          <div className="space-y-2">
                            {pedido.items?.map((it, idx) => {
                              const varDesc =
                                it.variante_titulo ||
                                (it.opciones
                                  ? Object.entries(it.opciones)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(' • ')
                                  : it.talla
                                  ? `Talla: ${it.talla}`
                                  : null);

                              return (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between gap-2 bg-[#1A1816] p-2 rounded-xl border border-[#2D2822]"
                                >
                                  <div className="flex items-center gap-2.5 truncate min-w-0">
                                    {(() => {
                                      const prodImg = it.imagen_url || productos.find((p) => p.id === (it.producto_id || it.id))?.imagen_url;
                                      return prodImg ? (
                                        <img
                                          src={prodImg}
                                          alt={it.nombre}
                                          onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: varDesc || undefined })}
                                          className="w-12 h-14 object-cover rounded-xl bg-black border border-[#2D2822] shadow-xs shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                          title="Click para ampliar foto del producto"
                                        />
                                      ) : (
                                        <div className="w-12 h-14 rounded-xl bg-black border border-[#2D2822] flex items-center justify-center text-[#7A7368] shrink-0 text-[10px] font-bold">
                                          Sin foto
                                        </div>
                                      );
                                    })()}
                                    <div className="min-w-0">
                                      <span className="font-bold text-white truncate block text-[11px]">
                                        {it.nombre} <span className="text-[#A69F93]">x{it.cantidad}</span>
                                      </span>
                                      {varDesc && (
                                        <span className="text-[10px] text-[#E6C687] font-bold block truncate">
                                          {varDesc}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-[#A69F93] block">
                                        {userRole === 'cajero'
                                          ? `${it.cantidad} unidad(es)`
                                          : `$${(Number(it.precio) || 0).toFixed(2)} c/u`}
                                      </span>
                                    </div>
                                  </div>
                                  {userRole !== 'cajero' && (
                                    <span className="font-black text-white shrink-0 text-xs">
                                      ${((Number(it.precio) || 0) * (Number(it.cantidad) || 1)).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Desglose de Artículos (Oculta dinero a cajero) */}
                          {userRole === 'cajero' ? (
                            <div className="pt-2 border-t border-[#26221E] text-xs font-bold text-slate-300 bg-[#1A1816] p-2.5 rounded-xl flex items-center justify-between">
                              <span className="text-[11px] text-[#A69F93] uppercase tracking-wider font-extrabold">Total Prendas:</span>
                              <span className="font-black text-white text-sm">
                                {pedido.items?.reduce((s, it) => s + (it.cantidad || 1), 0) || pedido.items?.length || 1} prenda(s)
                              </span>
                            </div>
                          ) : (
                            <div className="pt-2.5 border-t border-[#26221E] space-y-1 text-[11px] text-[#A69F93] bg-[#1A1816] p-2 rounded-xl">
                              <div className="flex justify-between">
                                <span>Subtotal Artículos:</span>
                                <span className="font-bold text-white">${(pedido.subtotal || pedido.total).toFixed(2)}</span>
                              </div>
                              {(pedido.descuento ?? 0) > 0 && (
                                <div className="flex justify-between text-emerald-400">
                                  <span>Descuento:</span>
                                  <span className="font-bold">-${Number(pedido.descuento).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Envío:</span>
                                <span className="font-bold text-white">
                                  {(pedido.costo_envio ?? 0) > 0 ? `$${Number(pedido.costo_envio).toFixed(2)}` : '$0.00'}
                                </span>
                              </div>
                              <div className="pt-1.5 border-t border-[#26221E] flex justify-between font-black text-xs text-white">
                                <span>TOTAL FINAL:</span>
                                <span className="text-[#E6C687] text-sm">${Number(pedido.total).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                {pedidos.length === 0 && (
                  <div className="p-12 text-center bg-white rounded-3xl border border-[#E5E9EE] text-[#7A7368]">
                    No hay pedidos registrados todavía.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. GESTIÓN DE PRODUCTOS (Image 5) */}
          {/* ======================================================== */}
          {activeSection === 'productos' && (
            <div className="space-y-5">
              {/* Filter bar */}
              <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#1A1816] text-xs px-10 py-2.5 rounded-2xl border border-[#38332B] text-white placeholder-[#6A6358] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>

                  <select
                    value={categoriaFilter}
                    onChange={(e) => setCategoriaFilter(e.target.value)}
                    className="bg-[#1A1816] text-xs font-bold text-[#E6C687] px-3.5 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none"
                  >
                    <option value="todas" className="bg-[#1A1816] text-white">Todas las categorías</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#1A1816] text-white">
                        {c.nombre}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-xl border border-[#38332B] hover:bg-[#1E1B18] text-[#E6C687] transition-colors cursor-pointer"
                    title="Recargar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setProductoToEdit(null);
                    setIsModalProductoOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-[#C59A4D] hover:bg-[#D4A95D] text-black text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ NUEVO PRODUCTO</span>
                </button>
              </div>

              {/* Table (Image 5) */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-[#1A1816] border-b border-[#26221E] text-[#E6C687] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-4 px-6">PRODUCTO</th>
                        <th className="py-4 px-6">CATEGORÍA</th>
                        <th className="py-4 px-6">PRECIO</th>
                        <th className="py-4 px-6">STOCK</th>
                        <th className="py-4 px-6">ESTADO</th>
                        <th className="py-4 px-6 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#221F1C]">
                      {productos
                        .filter((p) => {
                          if (categoriaFilter !== 'todas' && p.categoria_id !== categoriaFilter) return false;
                          if (searchQuery.trim()) {
                            return p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
                          }
                          return true;
                        })
                        .map((prod) => {
                          const stock = prod.stock ?? 0;
                          const isAgotado = stock <= 0;
                          const isBajo = stock > 0 && stock < 5;

                          return (
                            <tr key={prod.id} className="hover:bg-[#1A1816]/60 transition-colors">
                              <td className="py-3 px-6">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={prod.imagen_url || (prod.imagenes && prod.imagenes[0]) || ''}
                                    alt=""
                                    className="w-12 h-14 object-cover rounded-xl bg-[#1E1B18] border border-[#38332B]"
                                  />
                                  <div>
                                    <span className="font-extrabold text-sm text-white block max-w-xs truncate">
                                      {prod.nombre}
                                    </span>
                                    {prod.imagenes && prod.imagenes.length > 1 && (
                                      <span className="text-[10px] text-[#A69F93]">
                                        +{prod.imagenes.length} fotos galería
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-6 text-[#C9BFB0] font-medium">
                                {categorias.find((c) => c.id === prod.categoria_id)?.nombre || 'General'}
                              </td>

                              <td className="py-3 px-6 font-black text-sm text-white">
                                ${prod.precio}
                              </td>

                              <td className="py-3 px-6">
                                {isAgotado ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-950/60 text-rose-300 font-bold border border-rose-800/80">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Agotado (0)
                                  </span>
                                ) : isBajo ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-950/60 text-[#E6C687] font-bold border border-amber-800/80">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                    Últimas {stock} unidades
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/80">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    Disponible ({stock})
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-6">
                                <span
                                  className={`inline-flex items-center gap-1 font-bold ${
                                    prod.activo ? 'text-emerald-400' : 'text-[#A69F93]'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      prod.activo ? 'bg-emerald-400' : 'bg-[#6A6358]'
                                    }`}
                                  />
                                  {prod.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>

                              <td className="py-3 px-6 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setProductoToEdit(prod);
                                      setIsModalProductoOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-[#A69F93] hover:text-[#E6C687] hover:bg-[#1E1B18] transition-colors cursor-pointer"
                                    title="Editar producto"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProducto(prod.id, prod.nombre)}
                                    className="p-1.5 rounded-lg text-[#A69F93] hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                                    title="Eliminar de Supabase"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {productos.length === 0 && (
                  <div className="py-16 text-center space-y-3">
                    <Package className="w-10 h-10 mx-auto text-[#6A6358]" />
                    <p className="font-extrabold text-white">Catálogo en 0</p>
                    <p className="text-xs text-[#A69F93]">
                      Presiona &quot;+ NUEVO PRODUCTO&quot; arriba para agregar tus primeras camisetas.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. GESTIÓN DE CATEGORÍAS (Image 6) */}
          {/* ======================================================== */}
          {activeSection === 'categorias' && (
            <div className="space-y-5">
              <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-heading">
                    Categorías Registradas ({categorias.length})
                  </h2>
                  <p className="text-xs text-[#A69F93] mt-0.5">
                    Organiza los productos en public.categorias. En el catálogo público solo se verán las categorías activas.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-2xl bg-[#1E1B18] hover:bg-[#2A2622] text-[#E6C687] border border-[#38332B] transition-colors cursor-pointer"
                    title="Actualizar"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setCategoriaToEdit(null);
                      setIsModalCategoriaOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-[#C59A4D] hover:bg-[#D4A95D] text-black text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ NUEVA CATEGORÍA</span>
                  </button>
                </div>
              </div>

              {/* Table (Image 6) */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-xs">
                    <thead className="bg-[#1A1816] border-b border-[#26221E] text-[#E6C687] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-4 px-6">CATEGORÍA</th>
                        <th className="py-4 px-6">DESCRIPCIÓN</th>
                        <th className="py-4 px-6">PRODUCTOS</th>
                        <th className="py-4 px-6">ESTADO</th>
                        <th className="py-4 px-6 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#221F1C]">
                      {categorias.map((cat) => {
                        const prodsCount = productos.filter((p) => p.categoria_id === cat.id).length;

                        return (
                          <tr key={cat.id} className="hover:bg-[#1A1816]/60 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#1E1B18] border border-[#38332B] flex items-center justify-center text-[#E6C687]">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <span className="font-extrabold text-sm text-white">{cat.nombre}</span>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-[#A69F93] italic">
                              {cat.descripcion || 'Sin descripción'}
                            </td>

                            <td className="py-4 px-6 font-bold text-white">
                              {prodsCount} productos
                            </td>

                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                Activa
                              </span>
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setCategoriaToEdit(cat);
                                    setIsModalCategoriaOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-[#A69F93] hover:text-[#E6C687] hover:bg-[#1E1B18] transition-colors cursor-pointer"
                                  title="Editar categoría"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategoria(cat.id, cat.nombre)}
                                  className="p-1.5 rounded-lg text-[#A69F93] hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  title="Eliminar categoría"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. CONTROL DE INVENTARIO (Image 7) */}
          {/* ======================================================== */}
          {activeSection === 'inventario' && (
            <div className="space-y-5">
              {/* Filter bar */}
              <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1A1816] text-xs px-10 py-2.5 rounded-2xl border border-[#38332B] text-white placeholder-[#6A6358] focus:outline-none focus:border-[#C59A4D]"
                  />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {(['todos', 'disponibles', 'stock-bajo', 'agotados'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setInventarioFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        inventarioFilter === tab
                          ? 'bg-[#C59A4D] text-black font-black shadow-sm'
                          : 'bg-[#1E1B18] text-[#A69F93] hover:bg-[#2A2622] hover:text-white border border-[#38332B]'
                      }`}
                    >
                      {tab === 'stock-bajo' ? 'Stock Bajo' : tab}
                    </button>
                  ))}
                  <button
                    onClick={reloadAllData}
                    className="p-2 rounded-xl border border-[#38332B] hover:bg-[#1E1B18] text-[#E6C687] transition-colors cursor-pointer"
                    title="Recargar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table (Image 7) */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-[#1A1816] border-b border-[#26221E] text-[#E6C687] font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-4 px-6">PRODUCTO</th>
                      <th className="py-4 px-6">STOCK ACTUAL</th>
                      <th className="py-4 px-6">STOCK MÍNIMO</th>
                      <th className="py-4 px-6">ESTADO</th>
                      <th className="py-4 px-6 text-center">AJUSTE RÁPIDO</th>
                      <th className="py-4 px-6 text-right">DETALLES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#221F1C]">
                    {productos
                      .filter((p) => {
                        const stock = p.stock ?? 0;
                        if (inventarioFilter === 'disponibles' && stock < 5) return false;
                        if (inventarioFilter === 'stock-bajo' && (stock <= 0 || stock >= 5)) return false;
                        if (inventarioFilter === 'agotados' && stock > 0) return false;
                        if (searchQuery.trim()) {
                          return p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .map((prod) => {
                        const stock = prod.stock ?? 0;
                        const isAgotado = stock <= 0;
                        const isBajo = stock > 0 && stock < 5;

                        return (
                          <tr key={prod.id} className="hover:bg-[#1A1816]/60 transition-colors">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.imagen_url || (prod.imagenes && prod.imagenes[0]) || ''}
                                  alt=""
                                  className="w-12 h-14 object-cover rounded-xl bg-[#1E1B18] border border-[#38332B]"
                                />
                                <div>
                                  <span className="font-extrabold text-sm text-white block max-w-xs truncate">
                                    {prod.nombre}
                                  </span>
                                  <span className="text-[11px] text-[#A69F93]">
                                    {categorias.find((c) => c.id === prod.categoria_id)?.nombre || 'General'}
                                  </span>
                                  {prod.tallas_stock && Object.keys(prod.tallas_stock).length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                      <span className="text-[9px] font-bold text-[#A69F93] uppercase mr-0.5">Tallas:</span>
                                      {Object.entries(prod.tallas_stock).map(([talla, cant]) => (
                                        <span
                                          key={talla}
                                          className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-mono font-bold ${
                                            cant <= 0
                                              ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                                              : cant <= 2
                                              ? 'bg-amber-950/40 text-amber-300 border-amber-900/60'
                                              : 'bg-[#1E1B18] text-[#E6C687] border-[#38332B]'
                                          }`}
                                        >
                                          {talla}: {cant}
                                        </span>
                                      ))}
                                    </div>
                                  ) : prod.tallas && prod.tallas.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                      <span className="text-[9px] font-bold text-[#A69F93] uppercase mr-0.5">Tallas:</span>
                                      {prod.tallas.map((t) => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[#1E1B18] border border-[#38332B] text-[#E6C687] font-mono">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-6 font-black text-sm text-white">
                              {stock} unids.
                            </td>

                            <td className="py-3 px-6 text-[#A69F93]">
                              {prod.stock_minimo || 5} unids.
                            </td>

                            <td className="py-3 px-6">
                              {isAgotado ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-950/60 text-rose-300 font-bold border border-rose-800/80">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Agotado
                                </span>
                              ) : isBajo ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-950/60 text-[#E6C687] font-bold border border-amber-800/80">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  Stock Bajo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/80">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Disponible
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-6 text-center">
                              <div className="inline-flex items-center gap-2 bg-[#1E1B18] border border-[#38332B] rounded-xl px-2 py-1 text-white">
                                <button
                                  onClick={() => handleStockDelta(prod.id, stock, -1)}
                                  className="p-1 hover:text-rose-400 text-[#A69F93] transition-colors cursor-pointer"
                                  title="Restar 1"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-black text-xs min-w-4 text-center text-white">{stock}</span>
                                <button
                                  onClick={() => handleStockDelta(prod.id, stock, 1)}
                                  className="p-1 hover:text-emerald-400 text-[#A69F93] transition-colors cursor-pointer"
                                  title="Sumar 1"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setProductoAjustarTallas(prod)}
                                  className="px-2.5 py-1.5 rounded-xl border border-[#C59A4D]/40 bg-[#C59A4D]/10 hover:bg-[#C59A4D]/25 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer text-[#E6C687]"
                                  title="Ajustar stock por tallas directamente"
                                >
                                  <Layers className="w-3.5 h-3.5 text-[#E6C687]" />
                                  <span>Tallas / Stock</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setProductoToEdit(prod);
                                    setIsModalProductoOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-[#38332B] hover:bg-[#1E1B18] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer text-[#E6C687]"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#C59A4D]" />
                                  <span>Editar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. DIRECTORIO DE CLIENTES */}
          {/* ======================================================== */}
          {activeSection === 'clientes' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header card */}
              <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-heading">
                    Directorio Consolidado de Clientes
                  </h2>
                  <p className="text-xs text-[#A69F93] mt-0.5">
                    Clientes extraídos y sincronizados desde las órdenes de compra registradas.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#1E1B18] border border-[#38332B] text-xs font-bold text-[#E6C687]">
                    Total Clientes: {clientesList.length}
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] shadow-md flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono de cliente..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="w-full bg-[#1A1816] text-xs px-10 py-2.5 rounded-2xl border border-[#38332B] text-white placeholder-[#6A6358] focus:outline-none focus:border-[#C59A4D]"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#26221E] bg-[#1A1816] text-[10px] font-black uppercase tracking-wider text-[#E6C687]">
                      <th className="py-3 px-6">Teléfono (ID Cliente)</th>
                      <th className="py-3 px-6">Nombre del Cliente</th>
                      <th className="py-3 px-6">Dirección Habitual</th>
                      <th className="py-3 px-6">Pedidos Totales</th>
                      <th className="py-3 px-6">Total Comprado</th>
                      <th className="py-3 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#221F1C] text-xs">
                    {clientesList
                      .filter((c) => {
                        if (!clienteSearch.trim()) return true;
                        const q = clienteSearch.toLowerCase().trim();
                        return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q);
                      })
                      .map((cli, idx) => (
                        <tr key={idx} className="hover:bg-[#1A1816]/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-950/60 text-[#E6C687] border border-amber-800/80 flex items-center justify-center shrink-0">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-mono font-black text-sm text-white block">
                                  {cli.telefono || 'Sin teléfono'}
                                </span>
                                <span className="text-[10px] text-[#A69F93]">Registro por Teléfono</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <strong className="font-extrabold text-white block text-sm">
                              {cli.nombre}
                            </strong>
                            <span className="text-[10px] text-[#A69F93]">
                              Cliente AlexStore
                            </span>
                          </td>

                          <td className="py-4 px-6 text-[#A69F93] max-w-xs truncate">
                            {cli.direccion || 'Por coordinar'}
                          </td>

                          <td className="py-4 px-6 font-bold text-white">
                            <span className="px-2.5 py-1 rounded-full bg-[#1E1B18] text-[#E6C687] border border-[#38332B] font-extrabold text-xs">
                              {cli.totalPedidos} {cli.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                            </span>
                          </td>

                          <td className="py-4 px-6 font-black text-sm text-emerald-400">
                            ${(Number(cli.totalGastado) || 0).toFixed(2)} USD
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setClienteSeleccionadoParaPedidos(cli)}
                                className="px-3 py-1.5 rounded-xl bg-[#1E1B18] hover:bg-[#2A2621] text-[#E6C687] border border-[#38332B] font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                title="Ver todas las órdenes y prendas compradas por este cliente"
                              >
                                <Receipt className="w-3.5 h-3.5 text-[#C59A4D]" />
                                <span>Ver Pedidos</span>
                              </button>

                              <button
                                onClick={() => {
                                  const cleanPhone = cli.telefono.replace(/\D/g, '') || '66212802';
                                  window.open(
                                    `https://wa.me/507${cleanPhone}?text=${encodeURIComponent(
                                      `¡Hola ${cli.nombre}! 👋 Te saludamos de AlexStore. ¿Cómo estás?`
                                    )}`,
                                    '_blank'
                                  );
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                onClick={() => handleEliminarCliente(cli)}
                                className="px-2.5 py-1.5 rounded-xl text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Eliminar cliente e historial de pedidos"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {clientesList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#A69F93]">
                          Aún no se han registrado clientes en las órdenes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 8. GESTIÓN DE USUARIOS, ROLES & PERMISOS */}
          {/* ======================================================== */}
          {activeSection === 'usuarios' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header card */}
              <div className="bg-[#13110F] rounded-3xl p-6 border border-[#26221E] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-heading flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#C59A4D]" />
                    Gestión de Usuarios, Roles & Permisos
                  </h2>
                  <p className="text-xs text-[#A69F93] mt-0.5">
                    Control de accesos basado en roles (Dueño, Administrador, Cajero) con autorización segura.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Botón para ver script SQL de Autenticación */}
                  <button
                    onClick={() => setIsModalSqlAuthOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-amber-950/60 hover:bg-amber-900/80 text-[#E6C687] border border-amber-800/80 text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <KeyRound className="w-4 h-4 text-[#C59A4D]" />
                    <span>SQL SUPABASE AUTH</span>
                  </button>

                  {/* Botón para crear usuario (Disponible para Dueño y Admin) */}
                  <button
                    onClick={() => setIsModalUsuarioOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-[#C59A4D] hover:bg-[#D4A95D] text-black text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4 text-black" />
                    <span>REGISTRAR USUARIO</span>
                  </button>
                </div>
              </div>

              {/* 3 Stats de Usuarios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-[#13110F] border border-[#26221E] shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#A69F93] tracking-wider block">
                      DUEÑOS (ACCESO TOTAL)
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {usuarios.filter((u) => u.rol === 'dueno').length}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-950/60 text-[#E6C687] border border-amber-800/80 flex items-center justify-center font-black">
                    👑
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#13110F] border border-[#26221E] shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#A69F93] tracking-wider block">
                      ADMINISTRADORES
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {usuarios.filter((u) => u.rol === 'administrador').length}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-sky-950/60 text-sky-400 border border-sky-800/80 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#13110F] border border-[#26221E] shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#A69F93] tracking-wider block">
                      TRABAJADORES / CAJEROS
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {usuarios.filter((u) => u.rol === 'cajero').length}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Tarjeta Directa para Crear Usuario en Supabase Authentication */}
              <div className="bg-[#141312] text-white rounded-3xl p-6 sm:p-7 border border-[#2B2722] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26221E]">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#C59A4D]" />
                      <span>Crear Usuario Directo en Supabase Authentication</span>
                    </h3>
                    <p className="text-xs text-[#A69F93] mt-1">
                      Crea usuarios directamente desde aquí: se guardan en <strong>Authentication</strong> y en la base de datos con el rol que elijas (<strong>👑 Dueño</strong> o <strong>💼 Trabajador</strong>) para iniciar sesión al instante.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/30 self-start sm:self-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Supabase Auth Activo
                  </span>
                </div>

                <form onSubmit={handleGuardarUsuarioAuthDirecto} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Correo */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-[#A69F93] block">
                      CORREO ELECTRÓNICO (LOGIN):
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ej: trabajador@alexstore.com"
                      value={authEmailInput}
                      onChange={(e) => setAuthEmailInput(e.target.value)}
                      className="w-full bg-[#1C1A17] text-xs text-white placeholder-[#6E685F] px-4 py-2.5 rounded-xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>

                  {/* Nombre */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-[#A69F93] block">
                      NOMBRE DEL COLABORADOR:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Daniel Martínez"
                      value={authNombreInput}
                      onChange={(e) => setAuthNombreInput(e.target.value)}
                      className="w-full bg-[#1C1A17] text-xs text-white placeholder-[#6E685F] px-4 py-2.5 rounded-xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>

                  {/* Contraseña */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#A69F93] block">
                        CONTRASEÑA:
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAuthPassword}
                        className="text-[10px] text-[#C59A4D] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Generar</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={authShowPassword ? 'text' : 'password'}
                        required
                        placeholder="Mín. 6 caracteres"
                        value={authPasswordInput}
                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                        className="w-full bg-[#1C1A17] text-xs text-white placeholder-[#6E685F] pl-3 pr-8 py-2.5 rounded-xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setAuthShowPassword(!authShowPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A69F93] hover:text-white p-0.5 cursor-pointer"
                        title={authShowPassword ? 'Ocultar' : 'Ver'}
                      >
                        {authShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Selector de Rol */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-[#A69F93] block">
                      ROL A ASIGNAR:
                    </label>
                    <select
                      value={authRolSelected}
                      onChange={(e) => setAuthRolSelected(e.target.value as UserRole)}
                      className="w-full bg-[#1C1A17] text-xs font-bold text-[#E6C687] px-3 py-2.5 rounded-xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D]"
                    >
                      <option value="cajero">💼 Trabajador</option>
                      <option value="dueno">👑 Dueño / Admin</option>
                    </select>
                  </div>

                  {/* Botón Guardar / Crear */}
                  <div className="md:col-span-12 pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-[#8C8375]">
                      ¿La cuenta ya existía previamente en Supabase? Deja la contraseña en blanco para solo vincular el rol.
                    </span>
                    <button
                      type="submit"
                      disabled={savingAuthRole}
                      className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#C59A4D] hover:bg-[#D4A95B] text-black font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-black" />
                      <span>{savingAuthRole ? 'CREANDO EN SUPABASE...' : 'CREAR USUARIO EN SUPABASE AUTH'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tarjeta de Capacidad y Espacio en Supabase (Storage & Tablas) */}
              <div className="bg-[#141312] text-white rounded-3xl p-6 sm:p-7 border border-[#2B2722] shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26221E]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#C59A4D] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      ESTADO DE ALMACENAMIENTO & ESPACIO DISPONIBLE (SUPABASE)
                    </span>
                    <h3 className="text-base font-black text-white font-heading mt-0.5">
                      Capacidad Restante en Storage y en Tablas de Base de Datos
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={reloadAllData}
                      className="px-3 py-1.5 rounded-xl bg-[#26221E] hover:bg-[#322C27] text-white text-xs font-bold flex items-center gap-1.5 border border-[#3A332B] transition-colors cursor-pointer"
                      title="Actualizar mediciones"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Actualizar Métricas</span>
                    </button>
                    <button
                      onClick={() => setIsModalSqlAuthOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#E6C687] text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 transition-colors cursor-pointer"
                      title="Ver consultas SQL de tamaño"
                    >
                      <Database className="w-3.5 h-3.5 text-[#C59A4D]" />
                      <span>Ver SQL de Tablas</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Storage de Archivos (Fotos & Comprobantes) */}
                  <div className="p-4 rounded-2xl bg-[#1C1A17] border border-[#2E2822] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#C59A4D]/20 text-[#C59A4D] flex items-center justify-center font-bold">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white block">Storage de Archivos (Fotos y Recibos)</span>
                          <span className="text-[10px] text-[#A69F93]">Límite gratuito Supabase: 1,024 MB (1.00 GB)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white block">{metricasEspacio.mbStorageUsado} MB / {metricasEspacio.mbStorageTotal} MB</span>
                        <span className="text-[10px] text-emerald-400 font-bold">{metricasEspacio.mbStorageLibre} MB libres ({((metricasEspacio.mbStorageLibre / metricasEspacio.mbStorageTotal) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-[#2A251F] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#C59A4D] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, metricasEspacio.porcentajeStorageUsado)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-[#141312] p-2.5 rounded-xl border border-[#26221E]">
                        <span className="text-[#8C8375] block text-[10px]">Fotos de Productos:</span>
                        <strong className="text-white font-extrabold block">{metricasEspacio.totalFotosProductos} fotos</strong>
                        <span className="text-[9px] text-emerald-400">~{metricasEspacio.productosRestantesEstimados.toLocaleString()} fotos más restantes</span>
                      </div>
                      <div className="bg-[#141312] p-2.5 rounded-xl border border-[#26221E]">
                        <span className="text-[#8C8375] block text-[10px]">Comprobantes de Pago:</span>
                        <strong className="text-white font-extrabold block">{metricasEspacio.totalComprobantes} recibos</strong>
                        <span className="text-[9px] text-emerald-400">~{metricasEspacio.fotosRestantesEstimadas.toLocaleString()} comprobantes más</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Base de Datos PostgreSQL (Tablas y Filas) */}
                  <div className="p-4 rounded-2xl bg-[#1C1A17] border border-[#2E2822] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white block">Base de Datos PostgreSQL (Tablas)</span>
                          <span className="text-[10px] text-[#A69F93]">Límite gratuito Supabase: 500 MB</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white block">{metricasEspacio.mbBaseDatosUsado} MB / {metricasEspacio.mbBaseDatosTotal} MB</span>
                        <span className="text-[10px] text-emerald-400 font-bold">{metricasEspacio.mbBaseDatosLibre} MB libres ({((metricasEspacio.mbBaseDatosLibre / metricasEspacio.mbBaseDatosTotal) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-[#2A251F] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, metricasEspacio.porcentajeBaseDatosUsado)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-[#141312] p-2.5 rounded-xl border border-[#26221E]">
                        <span className="text-[#8C8375] block text-[10px]">Filas Totales en Tablas:</span>
                        <strong className="text-sky-400 font-extrabold block">{metricasEspacio.totalFilasTablas} registros</strong>
                        <span className="text-[9px] text-[#A69F93]">Pedidos, ventas, gastos, etc.</span>
                      </div>
                      <div className="bg-[#141312] p-2.5 rounded-xl border border-[#26221E]">
                        <span className="text-[#8C8375] block text-[10px]">Capacidad Restante:</span>
                        <strong className="text-emerald-400 font-extrabold block">{(100 - metricasEspacio.porcentajeBaseDatosUsado).toFixed(1)}% disponible</strong>
                        <span className="text-[9px] text-emerald-300">Capacidad para +500,000 pedidos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desglose de Filas por Tabla */}
                <div className="pt-2 border-t border-[#26221E]">
                  <span className="text-[10px] font-black uppercase text-[#8C8375] tracking-wider block mb-2">
                    CONTEO DE FILAS EN TIEMPO REAL POR TABLA:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">📦 Productos</span>
                      <strong className="text-white font-extrabold">{productos.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">🏷️ Categorías</span>
                      <strong className="text-white font-extrabold">{categorias.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">📋 Pedidos</span>
                      <strong className="text-white font-extrabold">{pedidos.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">💰 Ventas</span>
                      <strong className="text-white font-extrabold">{ventas.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">📉 Gastos</span>
                      <strong className="text-white font-extrabold">{gastos.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">📊 Inventario</span>
                      <strong className="text-white font-extrabold">{productos.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">👥 Usuarios</span>
                      <strong className="text-white font-extrabold">{usuarios.length}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1C1A17] border border-[#2E2822]">
                      <span className="text-[10px] text-[#8C8375] block">🛡️ Auditoría</span>
                      <strong className="text-white font-extrabold">{movimientos.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-[#13110F] rounded-3xl p-4 border border-[#26221E] flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-[#1A1816] text-xs px-10 py-2.5 rounded-2xl border border-[#38332B] text-white placeholder-[#6A6358] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="bg-[#1A1816] text-xs font-bold text-[#E6C687] px-3.5 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none"
                  >
                    <option value="todos" className="bg-[#1A1816] text-white">Todos los roles</option>
                    <option value="dueno" className="bg-[#1A1816] text-white">Dueño</option>
                    <option value="administrador" className="bg-[#1A1816] text-white">Administrador</option>
                    <option value="cajero" className="bg-[#1A1816] text-white">Trabajador / Cajero</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="bg-[#1A1816] text-xs font-bold text-[#E6C687] px-3.5 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none"
                  >
                    <option value="todos" className="bg-[#1A1816] text-white">Todos los estados</option>
                    <option value="activos" className="bg-[#1A1816] text-white">Solo activos</option>
                    <option value="inactivos" className="bg-[#1A1816] text-white">Solo inactivos</option>
                  </select>
                </div>

                <button
                  onClick={reloadAllData}
                  className="p-2.5 rounded-2xl bg-[#1E1B18] hover:bg-[#2A2622] text-[#E6C687] border border-[#38332B] transition-colors cursor-pointer"
                  title="Actualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Table de Usuarios */}
              <div className="bg-[#13110F] rounded-3xl border border-[#26221E] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#26221E] bg-[#1A1816] text-[10px] font-black uppercase tracking-wider text-[#E6C687]">
                      <th className="py-3 px-6">Usuario & Colaborador</th>
                      <th className="py-3 px-6">Nivel de Rol</th>
                      <th className="py-3 px-6">Estado de Acceso</th>
                      <th className="py-3 px-6">Creado por</th>
                      <th className="py-3 px-6">Fecha Registro</th>
                      <th className="py-3 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#221F1C] text-xs">
                    {usuarios
                      .filter((u) => {
                        if (userRoleFilter !== 'todos' && u.rol !== userRoleFilter) return false;
                        if (userStatusFilter === 'activos' && !u.activo) return false;
                        if (userStatusFilter === 'inactivos' && u.activo) return false;
                        if (userSearchQuery.trim()) {
                          const q = userSearchQuery.toLowerCase().trim();
                          return u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map((u) => {
                        const isSelf = currentUser?.email === u.email;
                        const isOwner = u.rol === 'dueno';
                        const canModify = currentUser ? canModifyUser(currentUser.rol, u) : false;
                        const canDelete = currentUser?.rol === 'dueno' && !isSelf;

                        return (
                          <tr key={u.id} className="hover:bg-[#1A1816]/60 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#1E1B18] border border-[#38332B] text-[#E6C687] flex items-center justify-center font-black text-sm shrink-0">
                                  {u.nombre ? u.nombre.substring(0, 2).toUpperCase() : 'US'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <strong className="font-extrabold text-sm text-white">
                                      {u.nombre}
                                    </strong>
                                    {isSelf && (
                                      <span className="text-[9px] bg-[#2A2622] text-[#E6C687] border border-[#38332B] font-black px-1.5 py-0.2 rounded">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#A69F93] font-mono block">
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                  u.rol === 'dueno'
                                    ? 'bg-amber-950/80 text-[#E6C687] border border-amber-800'
                                    : u.rol === 'administrador'
                                    ? 'bg-sky-950/80 text-sky-300 border border-sky-800'
                                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {u.rol === 'dueno' && '👑 Dueño'}
                                {u.rol === 'administrador' && '🛡️ Administrador'}
                                {u.rol === 'cajero' && '💼 Cajero'}
                              </span>
                            </td>

                            <td className="py-4 px-6">
                              {u.activo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/80 text-xs font-bold">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  Desactivado
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-[#A69F93] font-mono text-[11px]">
                              {u.creado_por || 'Sistema'}
                            </td>

                            <td className="py-4 px-6 text-[#A69F93] text-[11px]">
                              {new Date(u.creado_en).toLocaleDateString('es-PA')}
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Botones directos para cambiar a Dueño o Trabajador en 1 clic */}
                                {currentUser?.rol === 'dueno' && u.rol !== 'dueno' && (
                                  <button
                                    onClick={() => handleCambiarRolDirecto(u, 'dueno')}
                                    className="px-2.5 py-1 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-[#E6C687] border border-amber-800/80 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Convertir a Dueño / Admin"
                                  >
                                    <span>👑 Hacer Dueño</span>
                                  </button>
                                )}

                                {currentUser?.rol === 'dueno' && u.rol !== 'cajero' && (
                                  <button
                                    onClick={() => handleCambiarRolDirecto(u, 'cajero')}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Convertir a Trabajador"
                                  >
                                    <span>💼 Hacer Trabajador</span>
                                  </button>
                                )}

                                {/* Botón Modificar Nombre / Detalles */}
                                {canModify && (
                                  <button
                                    onClick={() => setUsuarioToEditRole(u)}
                                    className="p-1.5 rounded-xl border border-[#38332B] text-[#E6C687] hover:bg-[#1E1B18] font-bold transition-colors cursor-pointer"
                                    title="Modificar rol o permisos"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#C59A4D]" />
                                  </button>
                                )}

                                {/* Botón Activar / Desactivar */}
                                {canModify && !(isOwner && isSelf) && (
                                  <button
                                    onClick={() => handleToggleUserActive(u)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-colors cursor-pointer ${
                                      u.activo
                                        ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
                                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60'
                                    }`}
                                    title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                                  >
                                    {u.activo ? 'Desactivar' : 'Activar'}
                                  </button>
                                )}

                                {/* Botón Eliminar (solo Dueño) */}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="px-2.5 py-1 rounded-xl text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Eliminar usuario definitivamente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Eliminar</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#A69F93]">
                          No hay usuarios registrados todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Proof image zoom modal with order context, status change & download */}
      {viewingProofUrl && (
        <div
          onClick={() => {
            setViewingProofUrl(null);
            setSelectedOrderForProof(null);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[#13110F] text-white rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl border border-[#26221E] max-h-[92dvh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">
                    {selectedOrderForProof ? `Comprobante Pedido ${selectedOrderForProof.codigo}` : 'Comprobante de Pago'}
                  </span>
                  {selectedOrderForProof?.estado_pago && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedOrderForProof.estado_pago === 'verificado'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : selectedOrderForProof.estado_pago === 'rechazado'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          : 'bg-amber-950/80 text-[#E6C687] border border-amber-800'
                      }`}
                    >
                      {selectedOrderForProof.estado_pago === 'verificado'
                        ? 'Verificado'
                        : selectedOrderForProof.estado_pago === 'rechazado'
                        ? 'Rechazado'
                        : 'Pendiente'}
                    </span>
                  )}
                </div>
                {selectedOrderForProof && (
                  <span className="text-[11px] text-[#A69F93] block mt-0.5">
                    Cliente: <strong className="text-white">{selectedOrderForProof.cliente_nombre}</strong> • Tel: {selectedOrderForProof.cliente_telefono} • Total: ${selectedOrderForProof.total}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={viewingProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#1E1B18] border border-[#38332B] hover:bg-[#2A2622] text-xs font-bold text-[#E6C687] flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#E6C687]" />
                  <span>Pestaña</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyReceiptLink(viewingProofUrl, selectedOrderForProof?.id || 'modal')}
                  className="px-3 py-1.5 rounded-xl bg-[#1E1B18] border border-[#38332B] hover:bg-[#2A2622] text-xs font-bold text-[#E6C687] flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  title="Copiar enlace directo"
                >
                  <Copy className="w-3.5 h-3.5 text-[#E6C687]" />
                  <span>{copiedLinkOrderId === (selectedOrderForProof?.id || 'modal') ? '¡Copiado!' : 'Copiar enlace'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    descargarArchivo(
                      viewingProofUrl,
                      selectedOrderForProof
                        ? `comprobante_${selectedOrderForProof.codigo}_${selectedOrderForProof.cliente_nombre.replace(/\s+/g, '_')}.jpg`
                        : 'comprobante.jpg'
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#1E1B18] border border-[#38332B] hover:bg-[#2A2622] text-xs font-bold text-[#E6C687] flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  title="Descargar comprobante"
                >
                  <Download className="w-3.5 h-3.5 text-[#E6C687]" />
                  <span>Descargar</span>
                </button>

                <button
                  onClick={() => {
                    setViewingProofUrl(null);
                    setSelectedOrderForProof(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-[#1E1B18] text-[#A69F93] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="bg-black/95 rounded-2xl p-2 flex items-center justify-center max-h-[50vh] overflow-hidden border border-[#26221E]">
              <img
                src={viewingProofUrl}
                alt="Comprobante en alta resolución"
                className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Prendas seleccionadas por el cliente en el pedido con foto y variantes */}
            {selectedOrderForProof && selectedOrderForProof.items && selectedOrderForProof.items.length > 0 && (
              <div className="bg-[#1A1816] rounded-2xl p-3 border border-[#26221E] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#C59A4D]" />
                    Prendas elegidas por el cliente ({selectedOrderForProof.items.length})
                  </span>
                  {userRole !== 'cajero' && (
                    <span className="font-black text-[#E6C687]">
                      Total Pedido: ${Number(selectedOrderForProof.total).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {selectedOrderForProof.items.map((it, idx) => {
                    const prodImg =
                      it.imagen_url ||
                      productos.find((p) => p.id === (it.producto_id || it.id))?.imagen_url;
                    const varDesc =
                      it.variante_titulo ||
                      (it.opciones
                        ? Object.entries(it.opciones)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')
                        : it.talla
                        ? `Talla: ${it.talla}`
                        : null);

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 bg-[#13110F] p-2 rounded-xl border border-[#26221E] shadow-sm"
                      >
                        {prodImg ? (
                          <img
                            src={prodImg}
                            alt={it.nombre}
                            className="w-11 h-13 object-cover rounded-lg border border-[#38332B] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-13 rounded-lg bg-[#1E1B18] border border-[#38332B] flex items-center justify-center text-[#A69F93] shrink-0 text-[10px] font-bold">
                            Sin foto
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-white truncate block">
                            {it.nombre}
                          </span>
                          {varDesc && (
                            <span className="text-[10px] text-[#E6C687] font-bold block truncate">
                              {varDesc}
                            </span>
                          )}
                          <span className="text-[10px] text-[#A69F93] block">
                            {userRole === 'cajero'
                              ? `Cantidad: ${it.cantidad}`
                              : `Cant: ${it.cantidad || 1} • $${(Number(it.precio) || 0).toFixed(2)} c/u`}
                          </span>
                        </div>
                        {userRole !== 'cajero' && (
                          <span className="text-xs font-black text-white shrink-0">
                            ${((Number(it.precio) || 0) * (Number(it.cantidad) || 1)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick status change buttons inside modal */}
            {selectedOrderForProof && (
              <div className="pt-2 border-t border-[#26221E] flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-[#A69F93] font-bold">Cambiar estado de validación:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePaymentProofStatus(
                        selectedOrderForProof.id || selectedOrderForProof.codigo,
                        selectedOrderForProof.codigo,
                        'verificado'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      selectedOrderForProof.estado_pago === 'verificado'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/80'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Verificar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePaymentProofStatus(
                        selectedOrderForProof.id || selectedOrderForProof.codigo,
                        selectedOrderForProof.codigo,
                        'rechazado'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      selectedOrderForProof.estado_pago === 'rechazado'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800/80'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rechazar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePaymentProofStatus(
                        selectedOrderForProof.id || selectedOrderForProof.codigo,
                        selectedOrderForProof.codigo,
                        'pendiente_revision'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      selectedOrderForProof.estado_pago === 'pendiente_revision'
                        ? 'bg-amber-600 text-black font-black shadow-sm'
                        : 'bg-amber-950/60 text-[#E6C687] hover:bg-amber-900/60 border border-amber-800/80'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pendiente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Registrar Gasto */}
      {isModalGastoOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#13110F] text-white rounded-3xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 border border-[#26221E] shadow-2xl animate-fade-in max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-800/80 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Registrar Nuevo Gasto</h3>
                  <p className="text-[11px] text-[#A69F93]">Se deducirá del total ganado para dar la ganancia neta</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalGastoOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#1E1B18] text-[#A69F93] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearGastoSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-[#E6C687] block mb-1">
                  Concepto o Descripción del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compra de 10 camisas para inventario"
                  value={nuevoGastoConcepto}
                  onChange={(e) => setNuevoGastoConcepto(e.target.value)}
                  className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#C59A4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#E6C687] block mb-1">
                    Monto en USD ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={nuevoGastoMonto}
                    onChange={(e) => setNuevoGastoMonto(e.target.value)}
                    className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#C59A4D] font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#E6C687] block mb-1">
                    Categoría
                  </label>
                  <select
                    value={nuevoGastoCategoria}
                    onChange={(e) => setNuevoGastoCategoria(e.target.value)}
                    className="w-full bg-[#1A1816] text-white px-3 py-2.5 rounded-xl border border-[#38332B] focus:outline-none"
                  >
                    <option value="Mercancía e Inventario" className="bg-[#1A1816] text-white">Mercancía e Inventario</option>
                    <option value="Alquiler y Local" className="bg-[#1A1816] text-white">Alquiler y Local</option>
                    <option value="Servicios Básicos" className="bg-[#1A1816] text-white">Servicios Básicos</option>
                    <option value="Transporte y Envíos" className="bg-[#1A1816] text-white">Transporte y Envíos</option>
                    <option value="Publicidad y Marketing" className="bg-[#1A1816] text-white">Publicidad y Marketing</option>
                    <option value="Nómina y Sueldos" className="bg-[#1A1816] text-white">Nómina y Sueldos</option>
                    <option value="Mantenimiento" className="bg-[#1A1816] text-white">Mantenimiento</option>
                    <option value="Otros Gastos" className="bg-[#1A1816] text-white">Otros Gastos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#E6C687] block mb-1">
                  Notas o detalles adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de proveedor, factura o reposición..."
                  value={nuevoGastoNotas}
                  onChange={(e) => setNuevoGastoNotas(e.target.value)}
                  className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalGastoOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-[#A69F93] hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingGasto}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{submittingGasto ? 'Guardando...' : 'GUARDAR Y DEDUCIR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Venta Manual (con opción de Efectivo exclusiva) */}
      {isModalVentaManualOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#13110F] text-white rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-4 sm:space-y-5 border border-[#26221E] shadow-2xl animate-fade-in max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Registrar Venta Manual (Tienda Física / Caja)</h3>
                  <p className="text-[11px] text-[#A69F93]">Opción exclusiva del panel administrativo para cobros directos</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalVentaManualOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#1E1B18] text-[#A69F93] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearVentaManualSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#E6C687] block mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carlos González"
                    value={ventaManualCliente}
                    onChange={(e) => setVentaManualCliente(e.target.value)}
                    className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#C59A4D] font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#E6C687] block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#C59A4D]" />
                    <span>Teléfono (ID del Cliente) *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 6621-2802"
                    value={ventaManualTelefono}
                    onChange={(e) => setVentaManualTelefono(e.target.value)}
                    className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#C59A4D] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Selector de Método de Pago (Efectivo, Yappy, Transferencia, Abono / Contra Entrega) */}
              <div>
                <label className="font-extrabold text-[#E6C687] block mb-1.5">
                  Método de Pago *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setVentaManualMetodo('efectivo')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      ventaManualMetodo === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-500 font-black shadow-md scale-98'
                        : 'bg-[#1A1816] border-[#38332B] text-[#A69F93] hover:text-white hover:border-emerald-500'
                    }`}
                  >
                    <span className="text-base">💵</span>
                    <span className="text-[11px] font-extrabold">Efectivo (Caja)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVentaManualMetodo('yappy')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      ventaManualMetodo === 'yappy'
                        ? 'bg-sky-600 text-white border-sky-500 font-black shadow-md scale-98'
                        : 'bg-[#1A1816] border-[#38332B] text-[#A69F93] hover:text-white hover:border-sky-500'
                    }`}
                  >
                    <span className="text-base">📱</span>
                    <span className="text-[11px] font-extrabold">Yappy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVentaManualMetodo('transferencia')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      ventaManualMetodo === 'transferencia'
                        ? 'bg-[#C59A4D] text-black border-[#C59A4D] font-black shadow-md scale-98'
                        : 'bg-[#1A1816] border-[#38332B] text-[#A69F93] hover:text-white hover:border-[#C59A4D]'
                    }`}
                  >
                    <span className="text-base">🏦</span>
                    <span className="text-[11px] font-extrabold">Transferencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVentaManualMetodo('abono_contraentrega');
                      setVentaManualTipoAbono('mitad');
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      ventaManualMetodo === 'abono_contraentrega'
                        ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md scale-98'
                        : 'bg-[#1A1816] border-[#38332B] text-[#A69F93] hover:text-white hover:border-amber-500'
                    }`}
                  >
                    <span className="text-base">🤝</span>
                    <span className="text-[11px] font-extrabold">Abono / Contra Entrega</span>
                  </button>
                </div>
              </div>

              {/* Opciones de Abono y saldo si se eligió abono_contraentrega */}
              {ventaManualMetodo === 'abono_contraentrega' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1A1816] border border-amber-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#E6C687] flex items-center gap-1.5">
                      <span>🤝</span>
                      <span>Configurar Abono Inicial & Saldo Pendiente</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">
                      Termina de pagar al recibir
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setVentaManualTipoAbono('mitad')}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        ventaManualTipoAbono === 'mitad'
                          ? 'bg-[#C59A4D] text-black shadow-sm'
                          : 'bg-[#13110F] border border-[#38332B] text-[#A69F93] hover:text-white'
                      }`}
                    >
                      50% (La Mitad)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVentaManualTipoAbono('personalizado')}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        ventaManualTipoAbono === 'personalizado'
                          ? 'bg-[#C59A4D] text-black shadow-sm'
                          : 'bg-[#13110F] border border-[#38332B] text-[#A69F93] hover:text-white'
                      }`}
                    >
                      Menos / Otro Monto
                    </button>
                    <button
                      type="button"
                      onClick={() => setVentaManualTipoAbono('cero')}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        ventaManualTipoAbono === 'cero'
                          ? 'bg-[#C59A4D] text-black shadow-sm'
                          : 'bg-[#13110F] border border-[#38332B] text-[#A69F93] hover:text-white'
                      }`}
                    >
                      0% (Contra Entrega Pura)
                    </button>
                  </div>

                  {ventaManualTipoAbono === 'personalizado' && (
                    <div>
                      <label className="text-[11px] font-bold text-[#E6C687] block mb-1">
                        ¿Cuánto abonó el cliente en este momento? ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 15.00"
                        value={ventaManualMontoAbonado}
                        onChange={(e) => setVentaManualMontoAbonado(e.target.value)}
                        className="w-full bg-[#13110F] px-3.5 py-2 rounded-xl border border-[#38332B] text-white focus:outline-none focus:border-[#C59A4D] font-black text-sm"
                      />
                    </div>
                  )}

                  {(() => {
                    const totalNum = parseFloat(ventaManualMonto) || 0;
                    let abonoNum = totalNum;
                    if (ventaManualTipoAbono === 'mitad') abonoNum = Math.round((totalNum / 2) * 100) / 100;
                    else if (ventaManualTipoAbono === 'cero') abonoNum = 0;
                    else abonoNum = Math.min(totalNum, Math.max(0, parseFloat(ventaManualMontoAbonado) || 0));
                    const pendiente = Math.max(0, totalNum - abonoNum);

                    return (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#26221E]">
                        <div>
                          <span className="text-[#A69F93] text-[10px] block font-bold">Abono Inicial recibido:</span>
                          <strong className="text-white font-black text-sm">${abonoNum.toFixed(2)} USD</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[#E6C687] text-[10px] block font-extrabold">Saldo que pagará al entregar:</span>
                          <strong className="text-rose-400 font-black text-base">${pendiente.toFixed(2)} USD</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SELECCIÓN Y AGREGADO DE PRODUCTOS A LA VENTA */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#181614] border border-[#2D2822] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#E6C687] text-xs flex items-center gap-1.5">
                    <span>👗</span>
                    <span>Prendas / Productos a Incluir en la Venta</span>
                  </span>
                  <span className="text-[11px] text-[#A69F93] font-bold">
                    {ventaManualItems.length} agregada(s)
                  </span>
                </div>

                {/* Selector de Producto */}
                <div>
                  <label className="text-[11px] font-bold text-[#A69F93] block mb-1">
                    Seleccionar Producto del Catálogo:
                  </label>
                  <select
                    value={ventaManualProductoId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setVentaManualProductoId(id);
                      setVentaManualVarianteId('');
                      setVentaManualTalla('');
                      setVentaManualColor('');
                      const prod = productos.find((p) => p.id === id);
                      if (prod && ventaManualItems.length === 0) {
                        const qty = Math.max(1, parseInt(ventaManualCantidad) || 1);
                        setVentaManualMonto((prod.precio * qty).toFixed(2));
                      }
                    }}
                    className="w-full bg-[#13110F] text-white px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#C59A4D]"
                  >
                    <option value="" className="bg-[#13110F] text-white">-- Escoger un producto para agregar --</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#13110F] text-white">
                        {p.nombre} (${Number(p.precio).toFixed(2)}) — Stock: {p.stock ?? 0}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Previsualización del Producto Seleccionado con Foto, Talla, Color y Botón Agregar */}
                {(() => {
                  const selectedProd = productos.find((p) => p.id === ventaManualProductoId);
                  if (!selectedProd) return null;

                  const prodImg = selectedProd.imagen_url || selectedProd.imagenes?.[0] || '';
                  const stockActual = selectedProd.stock ?? 0;
                  const hasVariantes = Array.isArray(selectedProd.variantes) && selectedProd.variantes.length > 0;
                  const qty = Math.max(1, parseInt(ventaManualCantidad) || 1);
                  const subtotalItem = selectedProd.precio * qty;

                  const handleAgregarItem = () => {
                    let varTitulo = '';
                    if (ventaManualVarianteId) {
                      const foundV = selectedProd.variantes?.find((v: any) => (v.id || v.titulo) === ventaManualVarianteId);
                      varTitulo = foundV?.titulo || (foundV as any)?.nombre || ventaManualVarianteId;
                    }

                    const newItem: VentaManualItem = {
                      producto_id: selectedProd.id,
                      nombre: selectedProd.nombre,
                      cantidad: qty,
                      precio: selectedProd.precio,
                      subtotal: subtotalItem,
                      imagen_url: prodImg,
                      talla: ventaManualTalla || (hasVariantes ? varTitulo : undefined),
                      color: ventaManualColor || undefined,
                      variante_titulo: varTitulo || undefined,
                    };

                    const updated = [...ventaManualItems, newItem];
                    setVentaManualItems(updated);
                    const newTot = updated.reduce((s, it) => s + it.subtotal, 0);
                    setVentaManualMonto(newTot.toFixed(2));

                    // Reset selection
                    setVentaManualProductoId('');
                    setVentaManualVarianteId('');
                    setVentaManualTalla('');
                    setVentaManualColor('');
                    setVentaManualCantidad('1');
                  };

                  return (
                    <div className="p-3 rounded-xl bg-[#13110F] border border-[#38332B] space-y-3 animate-fade-in">
                      <div className="flex items-center gap-3">
                        {prodImg ? (
                          <img
                            src={prodImg}
                            alt={selectedProd.nombre}
                            className="w-16 h-16 object-cover rounded-xl bg-black border border-[#2D2822] shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-black border border-[#2D2822] flex items-center justify-center text-[10px] text-[#7A7368] shrink-0 font-bold">
                            Sin foto
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm text-white truncate">{selectedProd.nombre}</h4>
                          <span className="text-emerald-400 font-black text-sm block">
                            ${Number(selectedProd.precio).toFixed(2)} USD
                          </span>
                          <span
                            className={`inline-block px-2 py-0.2 rounded-md font-bold text-[10px] mt-0.5 ${
                              stockActual <= 0
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                : stockActual < 5
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            Existencias: {stockActual} unids.
                          </span>
                        </div>
                      </div>

                      {/* Talla, Color y Variantes */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {selectedProd.tallas_stock && Object.keys(selectedProd.tallas_stock).length > 0 ? (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-[#E6C687] block mb-1">
                              👕 Talla a Vender (Existencias de cada talla):
                            </label>
                            <select
                              value={ventaManualTalla}
                              onChange={(e) => setVentaManualTalla(e.target.value)}
                              className="w-full bg-[#1A1816] text-[#E6C687] font-bold px-2.5 py-1.5 rounded-lg border border-[#C59A4D]/50 text-xs focus:outline-none"
                            >
                              <option value="">-- Seleccionar Talla a Descontar --</option>
                              {Object.entries(selectedProd.tallas_stock).map(([t, cant]) => (
                                <option key={t} value={t}>
                                  Talla {t} — ({cant} disponible{cant === 1 ? '' : 's'}{cant <= 0 ? ' • AGOTADA' : ''})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : hasVariantes ? (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-[#A69F93] block mb-1">
                              Variante / Talla:
                            </label>
                            <select
                              value={ventaManualVarianteId}
                              onChange={(e) => {
                                setVentaManualVarianteId(e.target.value);
                                const found = selectedProd.variantes?.find((v: any) => (v.id || v.titulo) === e.target.value);
                                if (found?.opciones?.Talla) {
                                  setVentaManualTalla(found.opciones.Talla);
                                }
                              }}
                              className="w-full bg-[#1A1816] text-white px-2.5 py-1.5 rounded-lg border border-[#38332B] text-xs focus:outline-none"
                            >
                              <option value="">Seleccionar variante</option>
                              {selectedProd.variantes?.map((v: any) => (
                                <option key={v.id || v.titulo} value={v.id || v.titulo}>
                                  {v.titulo || v.nombre} (Stock: {v.stock ?? stockActual})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : selectedProd.tallas && selectedProd.tallas.length > 0 ? (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-[#E6C687] block mb-1">
                              👕 Talla a Vender:
                            </label>
                            <select
                              value={ventaManualTalla}
                              onChange={(e) => setVentaManualTalla(e.target.value)}
                              className="w-full bg-[#1A1816] text-[#E6C687] font-bold px-2.5 py-1.5 rounded-lg border border-[#C59A4D]/50 text-xs focus:outline-none"
                            >
                              <option value="">-- Seleccionar Talla --</option>
                              {selectedProd.tallas.map((t) => (
                                <option key={t} value={t}>
                                  Talla {t}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-bold text-[#A69F93] block mb-1">
                              Talla (ej: S, M, L, XL):
                            </label>
                            <input
                              type="text"
                              placeholder="Talla..."
                              value={ventaManualTalla}
                              onChange={(e) => setVentaManualTalla(e.target.value)}
                              className="w-full bg-[#1A1816] text-white px-2.5 py-1.5 rounded-lg border border-[#38332B] text-xs focus:outline-none"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-[#A69F93] block mb-1">
                            Color:
                          </label>
                          <input
                            type="text"
                            placeholder="Color..."
                            value={ventaManualColor}
                            onChange={(e) => setVentaManualColor(e.target.value)}
                            className="w-full bg-[#1A1816] text-white px-2.5 py-1.5 rounded-lg border border-[#38332B] text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#A69F93] block mb-1">
                            Cantidad:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={ventaManualCantidad}
                            onChange={(e) => setVentaManualCantidad(e.target.value)}
                            className="w-full bg-[#1A1816] text-white px-2.5 py-1.5 rounded-lg border border-[#38332B] text-xs font-black focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-[#A69F93]">
                          Subtotal prenda: <strong className="text-white">${subtotalItem.toFixed(2)}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleAgregarItem}
                          className="px-3.5 py-1.5 rounded-xl bg-[#C59A4D] hover:bg-[#D4A95D] text-black font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>AGREGAR A ESTA VENTA</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Lista de Prendas Agregadas a la Venta */}
                {ventaManualItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#26221E]">
                    <span className="text-[10px] font-black uppercase text-[#E6C687] block tracking-wider">
                      Prendas en esta venta ({ventaManualItems.length}):
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {ventaManualItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-[#13110F] border border-[#2D2822] flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {it.imagen_url ? (
                              <img
                                src={it.imagen_url}
                                alt={it.nombre}
                                className="w-9 h-9 object-cover rounded-lg bg-black border border-[#2D2822] shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-black border border-[#2D2822] flex items-center justify-center text-[8px] text-[#7A7368] shrink-0">
                                Sin foto
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-white block truncate text-[11px]">{it.nombre}</span>
                              <div className="flex items-center gap-1 text-[10px] text-[#A69F93]">
                                {it.talla && <span className="text-[#E6C687]">Talla: {it.talla}</span>}
                                {it.color && <span>• {it.color}</span>}
                                <span>• ${(Number(it.precio) || 0).toFixed(2)} c/u</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Stepper */}
                            <div className="flex items-center border border-[#332E27] rounded-lg overflow-hidden bg-[#1A1816]">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...ventaManualItems];
                                  if (updated[idx].cantidad > 1) {
                                    updated[idx].cantidad -= 1;
                                    updated[idx].subtotal = updated[idx].cantidad * (Number(updated[idx].precio) || 0);
                                    setVentaManualItems(updated);
                                    const sumTot = updated.reduce((s, x) => s + (Number(x.subtotal) || 0), 0);
                                    setVentaManualMonto(sumTot.toFixed(2));
                                  }
                                }}
                                className="px-2 py-0.5 text-xs hover:bg-[#25221E] text-[#A69F93] hover:text-white cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-2 py-0.5 font-black text-xs text-white">
                                {it.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...ventaManualItems];
                                  updated[idx].cantidad += 1;
                                  updated[idx].subtotal = updated[idx].cantidad * (Number(updated[idx].precio) || 0);
                                  setVentaManualItems(updated);
                                  const sumTot = updated.reduce((s, x) => s + (Number(x.subtotal) || 0), 0);
                                  setVentaManualMonto(sumTot.toFixed(2));
                                }}
                                className="px-2 py-0.5 text-xs hover:bg-[#25221E] text-[#A69F93] hover:text-white cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-black text-emerald-400 text-xs w-16 text-right">
                              ${(Number(it.subtotal) || 0).toFixed(2)}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = ventaManualItems.filter((_, i) => i !== idx);
                                setVentaManualItems(updated);
                                const sumTot = updated.reduce((s, x) => s + x.subtotal, 0);
                                setVentaManualMonto(sumTot.toFixed(2));
                              }}
                              className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/60 cursor-pointer"
                              title="Eliminar de esta venta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-extrabold text-[#E6C687] block mb-1">
                  Monto Total de la Venta en USD ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={ventaManualMonto}
                  onChange={(e) => setVentaManualMonto(e.target.value)}
                  className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#C59A4D] font-black text-base"
                />
                {ventaManualItems.length > 0 && (
                  <span className="text-[10px] text-emerald-400 mt-1 block font-bold">
                    ✓ Calculado automáticamente de las {ventaManualItems.length} prenda(s) agregadas.
                  </span>
                )}
              </div>

              <div>
                <label className="font-extrabold text-[#E6C687] block mb-1">
                  Notas o detalles de la venta (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de entrega presencial, cambio entregado, tallas entregadas, etc."
                  value={ventaManualNotas}
                  onChange={(e) => setVentaManualNotas(e.target.value)}
                  className="w-full bg-[#1A1816] text-white placeholder-[#6A6358] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalVentaManualOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-[#A69F93] hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingVentaManual}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{submittingVentaManual ? 'Registrando...' : 'GUARDAR VENTA MANUAL'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abrir Caja */}
      {isModalAbrirCajaOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#13110F] rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-[#26221E] shadow-2xl shadow-black/80 animate-fade-in my-auto text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Apertura de Turno de Caja</h3>
                  <p className="text-[11px] text-[#A69F93]">Inicia el turno indicando el fondo en gaveta</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalAbrirCajaOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#1A1816] text-[#A69F93] hover:text-white transition-colors cursor-pointer border border-transparent hover:border-[#38332B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userRole === 'cajero' ? (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-center space-y-2">
                <span className="text-2xl">🔒</span>
                <h4 className="font-black text-rose-300 text-sm">Acceso Restringido para Cajeros</h4>
                <p className="text-xs text-[#A69F93]">
                  Por políticas de seguridad, solo el <strong>Dueño o Administrador</strong> tiene autorización para abrir la caja e ingresar el fondo de gaveta.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalAbrirCajaOpen(false)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#26221E] hover:bg-[#332E27] text-white text-xs font-bold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleAbrirCajaSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-[#E6C687] block mb-1.5 uppercase tracking-wider text-[11px]">
                    Fondo Inicial en Gaveta (Efectivo Base) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-[#A69F93] text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="50.00"
                      value={montoAperturaCaja}
                      onChange={(e) => setMontoAperturaCaja(e.target.value)}
                      className="w-full bg-[#1A1816] pl-8 pr-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-emerald-500 font-black text-base text-white placeholder-[#787168]"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-[#A69F93] font-bold">Rápido:</span>
                    {['20.00', '50.00', '100.00'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMontoAperturaCaja(val)}
                        className="px-2.5 py-1 rounded-lg bg-[#1A1816] border border-[#26221E] hover:border-[#E6C687] text-[#E6C687] hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-white block mb-1 text-[11px]">
                    Notas u Observaciones de Apertura (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Turno de la mañana, billetes de $5 y $1..."
                    value={notasAperturaCaja}
                    onChange={(e) => setNotasAperturaCaja(e.target.value)}
                    className="w-full bg-[#1A1816] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-emerald-500 resize-none text-white placeholder-[#787168]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalAbrirCajaOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-[#A69F93] hover:text-white font-bold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCajaSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{isCajaSubmitting ? 'Abriendo...' : 'INICIAR TURNO DE CAJA'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja / Arqueo */}
      {isModalCerrarCajaOpen && sesionCaja && (() => {
        const fechaInicio = sesionCaja.fecha_apertura ? new Date(sesionCaja.fecha_apertura).getTime() : 0;
        const ventasTurnoList = ventas.filter(
          (v) => v.creado_en && new Date(v.creado_en).getTime() >= fechaInicio
        );
        const ventasEfectivoTurnoList = ventasTurnoList.filter(
          (v) =>
            v.metodo_pago === 'efectivo' || v.metodo_pago === 'abono' || v.metodo_pago === 'contra_entrega'
        );
        const ventasYappyTurnoList = ventasTurnoList.filter((v) => v.metodo_pago === 'yappy');
        const ventasTransfTurnoList = ventasTurnoList.filter((v) => v.metodo_pago === 'transferencia');

        const totalVentasEfectivo = ventasEfectivoTurnoList.reduce(
          (acc, v) => acc + (Number(v.monto_abonado !== undefined ? v.monto_abonado : v.total) || 0),
          0
        );
        const totalVentasYappy = ventasYappyTurnoList.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
        const totalVentasTransf = ventasTransfTurnoList.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
        const totalGranFacturado = totalVentasEfectivo + totalVentasYappy + totalVentasTransf;

        const gastosTurnoList = gastos.filter(
          (g) => g.creado_en && new Date(g.creado_en).getTime() >= fechaInicio
        );
        const totalGastosEfectivo = gastosTurnoList.reduce(
          (acc, g) => acc + (Number(g.monto) || 0),
          0
        );

        const fondoInicial = Number(sesionCaja.monto_inicial) || 0;
        const esperado = fondoInicial + totalVentasEfectivo - totalGastosEfectivo;
        const real = parseFloat(montoCierreReal);
        const hasReal = !isNaN(real);
        const diferencia = hasReal ? real - esperado : 0;
        const duracionTurno = getDuracionCaja(sesionCaja.fecha_apertura);

        const pedidosAprobadosTurno = pedidos.filter(
          (p) =>
            (p.estado === 'aprobado' || p.estado === 'entregado') &&
            ((p.revisado_en && new Date(p.revisado_en).getTime() >= fechaInicio) ||
              (p.creado_en && new Date(p.creado_en).getTime() >= fechaInicio))
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#13110F] rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-4 border border-[#26221E] shadow-2xl shadow-black/80 animate-fade-in my-auto text-white max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">Cierre de Caja & Arqueo Final</h3>
                    <p className="text-[11px] text-[#A69F93]">Auditoría detallada de todos los movimientos y cobros del turno</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalCerrarCajaOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#1A1816] text-[#A69F93] hover:text-white transition-colors cursor-pointer border border-transparent hover:border-[#38332B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {userRole === 'cajero' ? (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-center space-y-2">
                  <span className="text-2xl">🔒</span>
                  <h4 className="font-black text-rose-300 text-sm">Acceso Restringido para Cajeros</h4>
                  <p className="text-xs text-[#A69F93]">
                    Por políticas de seguridad, solo el <strong>Dueño o Administrador</strong> tiene autorización para realizar el conteo de cierre y arquear la caja.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalCerrarCajaOpen(false)}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#26221E] hover:bg-[#332E27] text-white text-xs font-bold cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <>
                  {/* Badge de Duración y Apertura */}
                  <div className="p-3.5 rounded-2xl bg-[#1A1816] border border-[#2D2822] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-[#A69F93] block font-bold">Turno abierto por:</span>
                      <strong className="text-white font-extrabold text-sm">{sesionCaja.abierto_por}</strong>
                      <span className="text-[10px] text-[#A69F93] block mt-0.5 font-mono">
                        {new Date(sesionCaja.fecha_apertura).toLocaleString('es-PA')}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-black inline-flex items-center gap-1.5 shadow-sm">
                        <span>⏱️</span>
                        <span>Duración activa: {duracionTurno}</span>
                      </span>
                    </div>
                  </div>

                  {/* Resumen de Cobros por Método en este Turno */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#181614] border border-[#26221E]">
                      <span className="text-[10px] text-[#A69F93] block font-bold">Fondo Inicial:</span>
                      <strong className="text-white text-sm font-black">${fondoInicial.toFixed(2)}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
                      <span className="text-[10px] text-emerald-400 block font-bold">💵 Efectivo Gaveta:</span>
                      <strong className="text-emerald-300 text-sm font-black">+${totalVentasEfectivo.toFixed(2)}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/40">
                      <span className="text-[10px] text-blue-400 block font-bold">📱 Yappy:</span>
                      <strong className="text-blue-300 text-sm font-black">+${totalVentasYappy.toFixed(2)}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-900/40">
                      <span className="text-[10px] text-purple-400 block font-bold">🏦 Transferencia:</span>
                      <strong className="text-purple-300 text-sm font-black">+${totalVentasTransf.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Filtros de Auditoría del Turno */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                    {[
                      { id: 'todos', label: 'Todos', count: ventasTurnoList.length + gastosTurnoList.length + pedidosAprobadosTurno.length + 1 },
                      { id: 'efectivo', label: '💵 Efectivo', count: ventasEfectivoTurnoList.length },
                      { id: 'yappy', label: '📱 Yappy', count: ventasYappyTurnoList.length },
                      { id: 'transferencia', label: '🏦 Transf.', count: ventasTransfTurnoList.length },
                      { id: 'pedidos', label: '📦 Pedidos Web', count: pedidosAprobadosTurno.length },
                      { id: 'gastos', label: '🔻 Gastos', count: gastosTurnoList.length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCierreModalFiltro(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                          cierreModalFiltro === tab.id
                            ? 'bg-[#C59A4D] text-black shadow-sm'
                            : 'bg-[#1A1816] text-[#A69F93] hover:text-white border border-[#26221E]'
                        }`}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>

                  {/* Todo lo que pasó dentro de la caja en este turno */}
                  <div className="bg-[#181614] rounded-2xl p-3 sm:p-3.5 border border-[#26221E] space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[#26221E]">
                      <span className="font-extrabold text-[#E6C687] text-xs flex items-center gap-1.5">
                        <span>📋</span>
                        <span>Movimientos Registrados en este Turno</span>
                      </span>
                      <span className="text-[10px] text-[#A69F93]">Sin límite de registros</span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
                      {/* Fondo Inicial */}
                      {(cierreModalFiltro === 'todos' || cierreModalFiltro === 'efectivo') && (
                        <div className="p-2 rounded-xl bg-[#13110F] border border-[#2D2822] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">💼</span>
                            <div>
                              <span className="font-bold text-white block text-[11px]">Fondo Inicial en Gaveta</span>
                              <span className="text-[10px] text-[#A69F93]">
                                Abierto por: <strong className="text-white">{sesionCaja.abierto_por}</strong>
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-white text-xs">+${fondoInicial.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Ventas del Turno */}
                      {ventasTurnoList
                        .filter((v) => {
                          if (cierreModalFiltro === 'todos') return true;
                          if (cierreModalFiltro === 'efectivo') return v.metodo_pago === 'efectivo' || v.metodo_pago === 'abono' || v.metodo_pago === 'contra_entrega';
                          if (cierreModalFiltro === 'yappy') return v.metodo_pago === 'yappy';
                          if (cierreModalFiltro === 'transferencia') return v.metodo_pago === 'transferencia';
                          return false;
                        })
                        .map((v) => {
                          const cobro = Number(v.monto_abonado !== undefined ? v.monto_abonado : v.total) || 0;
                          const icon = v.metodo_pago === 'yappy' ? '📱' : v.metodo_pago === 'transferencia' ? '🏦' : '💵';
                          return (
                            <div key={v.id || v.codigo} className="p-2.5 rounded-xl bg-[#13110F] border border-[#2D2822] space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-xs shrink-0">{icon}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-white text-[11px] truncate">
                                        Venta {v.codigo} — {v.cliente_nombre}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#26221E] text-[#E6C687] border border-[#38332B]">
                                        {v.metodo_pago}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-[#A69F93] block">
                                      Registrado por: <strong className="text-[#E6C687]">{v.cajero_nombre || v.registrado_por || 'Cajero'}</strong> • {v.creado_en ? new Date(v.creado_en).toLocaleTimeString('es-PA') : ''}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-black text-emerald-400 text-xs shrink-0">+${cobro.toFixed(2)}</span>
                              </div>

                              {/* Prendas de la venta con foto y zoom */}
                              {v.items && v.items.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  {v.items.map((it, idx) => {
                                    const prodImg = it.imagen_url || productos.find((prod) => prod.id === (it.producto_id || it.id))?.imagen_url;
                                    return (
                                      <div key={idx} className="flex items-center gap-1 bg-[#1A1816] px-1.5 py-0.5 rounded-lg border border-[#2D2822] text-[10px]">
                                        {prodImg && (
                                          <img
                                            src={prodImg}
                                            alt={it.nombre}
                                            onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: it.talla ? `Talla: ${it.talla}` : undefined })}
                                            className="w-5 h-6 object-cover rounded bg-black cursor-pointer hover:opacity-80"
                                            title="Click para ampliar foto"
                                          />
                                        )}
                                        <span className="text-white truncate max-w-[90px]">{it.nombre}</span>
                                        {it.talla && <span className="text-[#E6C687] font-bold">T:{it.talla}</span>}
                                        <span className="text-[#A69F93]">x{it.cantidad || 1}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* Pedidos Web Aprobados */}
                      {(cierreModalFiltro === 'todos' || cierreModalFiltro === 'pedidos') &&
                        pedidosAprobadosTurno.map((p) => (
                          <div key={p.id || p.codigo} className="p-2.5 rounded-xl bg-[#13110F] border border-[#26221E] space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <span className="text-xs mr-1">📦</span>
                                <span className="font-mono font-black text-white">{p.codigo}</span>
                                <span className="text-[#A69F93] ml-1.5 font-bold">({p.cliente_nombre})</span>
                              </div>
                              <span className="font-black text-emerald-400">${p.total} USD</span>
                            </div>
                            <div className="text-[10px] text-[#A69F93]">
                              Aprobado por: <strong className="text-[#E6C687]">{p.revisado_por || 'Administrador'}</strong> • {p.revisado_en ? new Date(p.revisado_en).toLocaleTimeString('es-PA') : (p.creado_en ? new Date(p.creado_en).toLocaleTimeString('es-PA') : '')}
                            </div>
                            {/* Prendas del pedido con thumbnail */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {p.items?.map((it, idx) => {
                                const prodImg = it.imagen_url || productos.find((prod) => prod.id === (it.producto_id || it.id))?.imagen_url;
                                return (
                                  <div key={idx} className="flex items-center gap-1 bg-[#1A1816] px-1.5 py-0.5 rounded-lg border border-[#2D2822] text-[10px]">
                                    {prodImg && (
                                      <img
                                        src={prodImg}
                                        alt={it.nombre}
                                        onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: it.talla ? `Talla: ${it.talla}` : undefined })}
                                        className="w-5 h-6 object-cover rounded bg-black cursor-pointer hover:opacity-80"
                                        title="Click para ampliar foto"
                                      />
                                    )}
                                    <span className="text-white truncate max-w-[90px]">{it.nombre}</span>
                                    {it.talla && <span className="text-[#E6C687] font-bold">T:{it.talla}</span>}
                                    <span className="text-[#A69F93]">x{it.cantidad || 1}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                      {/* Gastos del Turno */}
                      {(cierreModalFiltro === 'todos' || cierreModalFiltro === 'gastos') &&
                        gastosTurnoList.map((g) => (
                          <div key={g.id || g.concepto} className="p-2 rounded-xl bg-[#13110F] border border-[#2D2822] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs">🔻</span>
                              <div className="min-w-0">
                                <span className="font-bold text-rose-300 block text-[11px] truncate">
                                  Gasto: {g.concepto}
                                </span>
                                <span className="text-[10px] text-[#A69F93] block">
                                  Por: <strong className="text-white">{g.creado_por || 'Admin'}</strong> • {g.fecha ? new Date(g.fecha).toLocaleTimeString('es-PA') : ''}
                                </span>
                              </div>
                            </div>
                            <span className="font-black text-rose-400 text-xs shrink-0">-${Number(g.monto).toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Resumen numérico esperado */}
                  <div className="bg-[#1A1816] p-3.5 rounded-2xl border border-[#26221E] space-y-2 text-xs">
                    <div className="flex justify-between text-[#A69F93]">
                      <span>Fondo Inicial:</span>
                      <strong className="text-white">${fondoInicial.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>(+) Ventas Efectivo Gaveta ({ventasEfectivoTurnoList.length}):</span>
                      <strong>+${totalVentasEfectivo.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>(-) Gastos del Turno ({gastosTurnoList.length}):</span>
                      <strong>-${totalGastosEfectivo.toFixed(2)}</strong>
                    </div>
                    <div className="pt-2 border-t border-[#26221E] flex justify-between font-black text-white">
                      <span>Efectivo Físico Esperado en Gaveta:</span>
                      <span className="text-sm font-black text-[#E6C687]">${esperado.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-blue-300 text-[11px] pt-1">
                      <span>Cobros Digitales (Yappy + Transf.):</span>
                      <span className="font-bold">+${(totalVentasYappy + totalVentasTransf).toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-[#E6C687] text-[11px] font-bold border-t border-[#26221E]/60 pt-1">
                      <span>Total Facturado Global en el Turno:</span>
                      <span className="font-black text-white">${totalGranFacturado.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <form onSubmit={handleCerrarCajaSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="font-extrabold text-[#E6C687] block mb-1.5 uppercase tracking-wider text-[11px]">
                        Dinero Real Contado en Gaveta (Efectivo) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-[#A69F93] text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={montoCierreReal}
                          onChange={(e) => setMontoCierreReal(e.target.value)}
                          className="w-full bg-[#1A1816] pl-8 pr-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-rose-500 font-black text-base text-white placeholder-[#787168]"
                        />
                      </div>

                      {/* Diferencia en tiempo real para Dueño/Admin */}
                      {hasReal && (
                        <div
                          className={`mt-2.5 p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
                            Math.abs(diferencia) < 0.01
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                              : diferencia > 0
                              ? 'bg-blue-950/40 text-blue-300 border-blue-800/60'
                              : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {Math.abs(diferencia) < 0.01
                              ? '✅ Cuadre Exacto'
                              : diferencia > 0
                              ? '🟢 Sobrante en Gaveta'
                              : '🔴 Faltante en Gaveta'}
                          </span>
                          <span className="font-black text-sm">
                            {diferencia >= 0 ? `+$${diferencia.toFixed(2)}` : `-$${Math.abs(diferencia).toFixed(2)}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="font-extrabold text-white block mb-1 text-[11px]">
                        Observaciones o Notas de Cierre (opcional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ej: Justificación de billetes, cambio entregado a dueño..."
                        value={notasCierreCaja}
                        onChange={(e) => setNotasCierreCaja(e.target.value)}
                        className="w-full bg-[#1A1816] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-rose-500 resize-none text-white placeholder-[#787168]"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsModalCerrarCajaOpen(false)}
                        className="px-4 py-2.5 rounded-xl text-[#A69F93] hover:text-white font-bold cursor-pointer transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isCajaSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center gap-1.5 shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isCajaSubmitting ? 'Cerrando...' : 'GUARDAR CIERRE & ARQUEO'}</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modals for creating/editing */}
      <ModalNuevoProducto
        isOpen={isModalProductoOpen}
        onClose={() => setIsModalProductoOpen(false)}
        categorias={categorias}
        productoToEdit={productoToEdit}
        onProductoSaved={reloadAllData}
      />

      <ModalNuevaCategoria
        isOpen={isModalCategoriaOpen}
        onClose={() => setIsModalCategoriaOpen(false)}
        categoriaToEdit={categoriaToEdit}
        onCategoriaSaved={reloadAllData}
      />

      {currentUser && (
        <ModalNuevoUsuario
          isOpen={isModalUsuarioOpen}
          onClose={() => setIsModalUsuarioOpen(false)}
          currentUser={currentUser}
          onUserCreated={reloadAllData}
        />
      )}

      {currentUser && usuarioToEditRole && (
        <ModalEditarRol
          isOpen={!!usuarioToEditRole}
          onClose={() => setUsuarioToEditRole(null)}
          targetUser={usuarioToEditRole}
          currentUser={currentUser}
          onUserUpdated={reloadAllData}
        />
      )}

      <ModalSqlAuth
        isOpen={isModalSqlAuthOpen}
        onClose={() => setIsModalSqlAuthOpen(false)}
      />

      <ModalStockTallasRapido
        isOpen={Boolean(productoAjustarTallas)}
        producto={productoAjustarTallas}
        onClose={() => setProductoAjustarTallas(null)}
        onSaved={reloadAllData}
      />

      {/* Modal Zoom / Lightbox de Foto de Producto */}
      {zoomedProductImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setZoomedProductImage(null)}
        >
          <div
            className="bg-[#13110F] border border-[#2D2822] rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-3 relative text-white my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#26221E]">
              <div className="min-w-0 pr-2">
                <h3 className="font-black text-sm text-white truncate">{zoomedProductImage.title}</h3>
                {zoomedProductImage.subtitle && (
                  <span className="text-xs text-[#E6C687] font-bold block truncate">{zoomedProductImage.subtitle}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomedProductImage(null)}
                className="p-1.5 rounded-full hover:bg-[#1A1816] text-[#A69F93] hover:text-white transition-colors cursor-pointer shrink-0 border border-transparent hover:border-[#332E27]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-[#26221E] max-h-[70vh]">
              <img
                src={zoomedProductImage.url}
                alt={zoomedProductImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-[#A69F93] flex-wrap gap-2">
              <span>Vista de producto en alta resolución</span>
              <a
                href={zoomedProductImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-xl bg-[#1A1816] border border-[#332E27] text-[#E6C687] hover:text-white font-bold transition-colors cursor-pointer"
              >
                Abrir imagen completa ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Pedidos por Cliente */}
      {clienteSeleccionadoParaPedidos && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setClienteSeleccionadoParaPedidos(null)}
        >
          <div
            className="bg-[#13110F] rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-4 border border-[#26221E] shadow-2xl text-white max-h-[90vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26221E]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-950/60 text-[#E6C687] border border-amber-800/80 flex items-center justify-center font-black shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Historial de Pedidos del Cliente</h3>
                  <p className="text-xs text-[#A69F93]">
                    <strong className="text-white">{clienteSeleccionadoParaPedidos.nombre}</strong> • Tel: {clienteSeleccionadoParaPedidos.telefono}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClienteSeleccionadoParaPedidos(null)}
                className="p-1.5 rounded-full hover:bg-[#1A1816] text-[#A69F93] hover:text-white transition-colors cursor-pointer border border-transparent hover:border-[#332E27]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen del cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#181614] border border-[#2D2822]">
                <span className="text-[10px] text-[#A69F93] font-bold uppercase block">Total Pedidos</span>
                <span className="text-lg font-black text-white">{clienteSeleccionadoParaPedidos.totalPedidos}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#181614] border border-[#2D2822]">
                <span className="text-[10px] text-[#A69F93] font-bold uppercase block">Total Comprado</span>
                <span className="text-lg font-black text-emerald-400">${(Number(clienteSeleccionadoParaPedidos.totalGastado) || 0).toFixed(2)} USD</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#181614] border border-[#2D2822]">
                <span className="text-[10px] text-[#A69F93] font-bold uppercase block">Dirección</span>
                <span className="text-xs font-bold text-slate-300 truncate block">{clienteSeleccionadoParaPedidos.direccion || 'Por coordinar'}</span>
              </div>
            </div>

            {/* Lista de Pedidos de este cliente */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-[#E6C687] tracking-wider">
                Órdenes & Compras Registradas ({
                  pedidos.filter((p) => {
                    const cleanPhone = (p.cliente_telefono || '').replace(/\D/g, '');
                    const selPhone = (clienteSeleccionadoParaPedidos.telefono || '').replace(/\D/g, '');
                    return (cleanPhone && selPhone && cleanPhone === selPhone) || p.cliente_nombre.toLowerCase().trim() === clienteSeleccionadoParaPedidos.nombre.toLowerCase().trim();
                  }).length
                })
              </h4>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {pedidos
                  .filter((p) => {
                    const cleanPhone = (p.cliente_telefono || '').replace(/\D/g, '');
                    const selPhone = (clienteSeleccionadoParaPedidos.telefono || '').replace(/\D/g, '');
                    return (cleanPhone && selPhone && cleanPhone === selPhone) || p.cliente_nombre.toLowerCase().trim() === clienteSeleccionadoParaPedidos.nombre.toLowerCase().trim();
                  })
                  .map((p) => (
                    <div key={p.id || p.codigo} className="p-3.5 rounded-2xl bg-[#181614] border border-[#2D2822] space-y-2.5">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-[#26221E]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#E6C687]">{p.codigo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            p.estado === 'pendiente' ? 'bg-amber-950/70 text-amber-300 border border-amber-800' :
                            p.estado === 'aprobado' || p.estado === 'entregado' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800' :
                            'bg-rose-950/70 text-rose-300 border border-rose-800'
                          }`}>
                            {p.estado}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#A69F93] block">
                            {p.creado_en ? new Date(p.creado_en).toLocaleString('es-PA') : 'Reciente'}
                          </span>
                          <span className="font-black text-sm text-emerald-400">${p.total} USD</span>
                        </div>
                      </div>

                      {/* Prendas del pedido con fotos clickeables para zoom */}
                      <div className="space-y-1.5">
                        {p.items?.map((it, idx) => {
                          const prodImg = it.imagen_url || productos.find((prod) => prod.id === (it.producto_id || it.id))?.imagen_url;
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2.5 bg-[#13110F] p-2 rounded-xl border border-[#26221E] text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {prodImg && (
                                  <img
                                    src={prodImg}
                                    alt={it.nombre}
                                    onClick={() => setZoomedProductImage({ url: prodImg, title: it.nombre, subtitle: it.talla ? `Talla: ${it.talla}` : undefined })}
                                    className="w-10 h-12 object-cover rounded-lg bg-black border border-[#2D2822] cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                    title="Click para ampliar foto"
                                  />
                                )}
                                <div className="min-w-0">
                                  <span className="font-bold text-white block truncate">{it.nombre}</span>
                                  <span className="text-[10px] text-[#A69F93]">
                                    {it.talla ? `Talla: ${it.talla} • ` : ''}Cant: {it.cantidad || 1}
                                  </span>
                                </div>
                              </div>
                              <span className="font-black text-white shrink-0">
                                ${((it.precio || 0) * (it.cantidad || 1)).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
