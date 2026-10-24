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
  eliminarVenta,
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
} from '../lib/supabase';
import {
  ROLE_PERMISSIONS,
  canAccessSection,
  canModifyUser,
  getUsuariosList,
  actualizarUsuario,
  eliminarUsuario,
  guardarRolUsuarioAuth,
} from '../lib/auth';
import { ModalNuevoProducto } from './ModalNuevoProducto';
import { ModalNuevaCategoria } from './ModalNuevaCategoria';
import { ModalNuevoUsuario } from './ModalNuevoUsuario';
import { ModalEditarRol } from './ModalEditarRol';
import { ModalSqlAuth } from './ModalSqlAuth';
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
  const userRole: UserRole = currentUser?.rol || 'cajero';

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
      setSesionCaja(cajaActiva);
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
              const nextStock = Math.max(0, (prod.stock ?? 0) - itemMatch.cantidad);
              let nextVars = prod.variantes;
              if (Array.isArray(nextVars) && (itemMatch.variante_id || itemMatch.variante_titulo)) {
                nextVars = nextVars.map((v) => {
                  if (
                    (itemMatch.variante_id && v.id === itemMatch.variante_id) ||
                    (itemMatch.variante_titulo && v.titulo === itemMatch.variante_titulo)
                  ) {
                    return { ...v, stock: Math.max(0, (v.stock ?? 0) - itemMatch.cantidad) };
                  }
                  return v;
                });
              }
              return { ...prod, stock: nextStock, variantes: nextVars };
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
    const montoNum = parseFloat(ventaManualMonto);
    if (!ventaManualCliente.trim() || isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa el nombre del cliente y un monto válido mayor a $0.');
      return;
    }

    const cantNum = Math.max(1, parseInt(ventaManualCantidad) || 1);
    setSubmittingVentaManual(true);
    try {
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

      const items = selectedProd
        ? [
            {
              id: selectedProd.id,
              producto_id: selectedProd.id,
              nombre: selectedProd.nombre,
              precio: montoNum,
              cantidad: cantNum,
              variante_id: ventaManualVarianteId || undefined,
              variante_titulo: selectedVarTitulo || undefined,
              imagen_url: selectedProd.imagen_url || (selectedProd.imagenes && selectedProd.imagenes[0]) || undefined,
            },
          ]
        : [];

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
        items,
        tipo: 'manual',
        notas:
          ventaManualNotas.trim() ||
          (selectedProd
            ? `Producto: ${selectedProd.nombre}${selectedVarTitulo ? ` (${selectedVarTitulo})` : ''} x${cantNum}${saldoPendiente > 0 ? ` • Abonó: $${montoAbonado.toFixed(2)}, Saldo al entregar: $${saldoPendiente.toFixed(2)}` : ''}`
            : saldoPendiente > 0 ? `Abonó: $${montoAbonado.toFixed(2)}, Saldo al entregar: $${saldoPendiente.toFixed(2)}` : undefined),
      });

      if (res.success && res.data) {
        const nuevaVenta = res.data;

        // Descontar inmediatamente en el estado local de productos si se asoció un producto
        if (selectedProd) {
          setProductos((prev) =>
            prev.map((prod) => {
              if (prod.id !== selectedProd.id) return prod;
              const nextStock = Math.max(0, (prod.stock ?? 0) - cantNum);
              let nextVars = prod.variantes;
              if (Array.isArray(nextVars) && (ventaManualVarianteId || selectedVarTitulo)) {
                nextVars = nextVars.map((v: any) => {
                  if (
                    (ventaManualVarianteId && (v.id === ventaManualVarianteId || v.titulo === ventaManualVarianteId)) ||
                    (selectedVarTitulo && (v.titulo === selectedVarTitulo || v.id === selectedVarTitulo))
                  ) {
                    return { ...v, stock: Math.max(0, (v.stock ?? 0) - cantNum) };
                  }
                  return v;
                });
              }
              return { ...prod, stock: nextStock, variantes: nextVars };
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
        setVentaManualNotas('');
        setVentaManualMetodo('efectivo');

        // Sincronizar en segundo plano con Supabase para actualizar métricas de inventario
        reloadAllData();

        // Registrar auditoría
        registrarMovimiento({
          usuario_id: currentUser?.id,
          usuario_nombre: currentUser?.nombre || currentUser?.email || 'Admin',
          usuario_email: currentUser?.email || '',
          rol: currentUser?.rol || 'cajero',
          accion: 'Registró Venta Manual',
          modulo: 'ventas',
          detalles: `Venta manual por $${montoNum.toFixed(2)} (${metodoReal.toUpperCase()}) para ${ventaManualCliente.trim()} (Tel: ${ventaManualTelefono.trim() || 'N/A'})${saldoPendiente > 0 ? ` [Abonado: $${montoAbonado.toFixed(2)} | Pendiente: $${saldoPendiente.toFixed(2)}]` : ''}${selectedProd ? ` - Descontó ${cantNum} un. de "${selectedProd.nombre}"` : ''}.`,
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
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
        <header className="bg-white border-b border-[#E5E9EE] px-4 sm:px-6 py-3.5 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1918] font-heading capitalize leading-tight">
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
            <p className="text-xs text-[#7A7368] mt-0.5">
              {activeSection === 'dashboard' && 'Métricas operativas y financieras generales de AlexStore'}
              {activeSection === 'pedidos' && 'Verifica comprobantes de pago por Yappy y Transferencias, y aprueba compras'}
              {activeSection === 'ventas' && 'Ventas web aprobadas y registro de ventas manuales de mostrador'}
              {activeSection === 'caja' && 'Apertura de turno con fondo inicial, control de efectivo en gaveta y arqueo de cierre guardado'}
              {activeSection === 'gastos' && 'Registra gastos operativos y de mercancía, descontándolos en vivo del total ganado para dar la ganancia neta'}
              {activeSection === 'movimientos' && 'Historial cronológico de turnos, aprobaciones y ajustes de stock'}
              {activeSection === 'productos' && 'Administra catálogo, precios, fotos e inventario en public.productos'}
              {activeSection === 'categorias' && 'Crea y edita categorías en public.categorias'}
              {activeSection === 'inventario' && 'Monitorea existencias, alertas de stock mínimo y reposición en public.inventario'}
              {activeSection === 'clientes' && 'Listado consolidado de clientes, pedidos acumulados y contacto directo'}
              {activeSection === 'usuarios' && 'Administración de cuentas de Dueño, Administradores y Cajeros con seguridad RLS'}
            </p>
          </div>

          <button
            onClick={onExitAdmin}
            className="px-4 py-2 rounded-xl border border-[#D5DCE4] hover:bg-[#F4F6F8] text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C59A4D]" />
            <span>VER CATÁLOGO</span>
          </button>
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
            <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-[#1A1918]">Módulo Restringido</h2>
              <p className="text-xs text-[#7A7368] max-w-md mx-auto">
                Tu rol actual (<strong>{ROLE_PERMISSIONS[userRole]?.name}</strong>) no tiene autorización para acceder a este módulo financiero o administrativo.
              </p>
              <button
                onClick={() => setActiveSection('pedidos')}
                className="px-5 py-2.5 rounded-2xl bg-[#141312] text-white text-xs font-black uppercase tracking-wider cursor-pointer"
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
              <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#1A1918] font-heading">
                    Resumen General del Negocio
                  </h2>
                  <p className="text-xs text-[#7A7368] mt-0.5">
                    Datos sincronizados en tiempo real con Supabase Database & Storage.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-2xl bg-[#F4F6F8] hover:bg-[#EAEFF5] text-[#1A1918] transition-colors"
                    title="Actualizar datos"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => {
                      setProductoToEdit(null);
                      setIsModalProductoOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>NUEVO PRODUCTO</span>
                  </button>
                </div>
              </div>

              {/* 5 Stats Cards (Image 2) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                {/* 1. Total Productos */}
                <div
                  onClick={() => setActiveSection('productos')}
                  className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#E5E9EE] shadow-xs hover:border-[#C59A4D]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      TOTAL PRODUCTOS
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-[#1A1918]">{totalProductos}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#C59A4D]">Ver catálogo completo →</span>
                </div>

                {/* 2. Activos Visibles */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#E5E9EE] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      ACTIVOS (VISIBLES)
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-[#1A1918]">{activosVisibles}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600">
                    {totalProductos > 0 ? Math.round((activosVisibles / totalProductos) * 100) : 100}% del total
                  </span>
                </div>

                {/* 3. Categorías */}
                <div
                  onClick={() => setActiveSection('categorias')}
                  className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#E5E9EE] shadow-xs hover:border-[#C59A4D]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      CATEGORÍAS
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#C59A4D]">
                      <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-[#1A1918]">{totalCategorias}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#C59A4D]">Gestionar categorías →</span>
                </div>

                {/* 4. Stock Bajo */}
                <div
                  onClick={() => {
                    setInventarioFilter('stock-bajo');
                    setActiveSection('inventario');
                  }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#E5E9EE] shadow-xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      STOCK BAJO
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-amber-600">{stockBajoCount}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-700">Requieren reposición</span>
                </div>

                {/* 5. Agotados */}
                <div
                  onClick={() => {
                    setInventarioFilter('agotados');
                    setActiveSection('inventario');
                  }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#E5E9EE] shadow-xs hover:border-rose-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      AGOTADOS
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="my-2 sm:my-3">
                    <span className="text-2xl sm:text-3xl font-black text-rose-600">{agotadosCount}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-700">Sin existencias (0)</span>
                </div>
              </div>

              {/* Balance Financiero & Total Neto (Disponible para Dueño y Administrador) */}
              {canAccessSection(userRole, 'gastos') && (
                <div className="bg-gradient-to-br from-[#141312] to-[#24201C] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-[#3A332B] space-y-5">
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
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">
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
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">
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
              <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE1]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8C8375] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#C59A4D]" />
                      CAPACIDAD & ESPACIO DISPONIBLE (SUPABASE)
                    </span>
                    <h3 className="text-base font-black text-[#1A1918] font-heading mt-0.5">
                      Espacio para Montar Productos, Comprobantes y Tablas
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black self-start sm:self-auto">
                    Tier Gratuito Activo (100% Operativo)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Storage: Fotos de Productos y Comprobantes */}
                  <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE5DC] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C59A4D] flex items-center justify-center font-bold">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-[#1A1918] block">Almacenamiento Storage</span>
                          <span className="text-[10px] text-[#7A7368]">Fotos de productos y comprobantes</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#1A1918] block">{metricasEspacio.mbStorageUsado} MB / {metricasEspacio.mbStorageTotal} MB</span>
                        <span className="text-[10px] text-emerald-600 font-bold">{metricasEspacio.mbStorageLibre} MB libres</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#EAE5DC] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#C59A4D] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, metricasEspacio.porcentajeStorageUsado)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-white p-2 rounded-xl border border-[#E5DFD5]">
                        <span className="text-[#7A7368] block text-[10px]">Capacidad restante productos:</span>
                        <strong className="text-emerald-700 font-extrabold block">
                          ~{metricasEspacio.productosRestantesEstimados.toLocaleString()} productos
                        </strong>
                        <span className="text-[9px] text-[#9C9488]">({metricasEspacio.totalFotosProductos} fotos actuales)</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-[#E5DFD5]">
                        <span className="text-[#7A7368] block text-[10px]">Capacidad comprobantes:</span>
                        <strong className="text-emerald-700 font-extrabold block">
                          ~{metricasEspacio.fotosRestantesEstimadas.toLocaleString()} comprobantes
                        </strong>
                        <span className="text-[9px] text-[#9C9488]">({metricasEspacio.totalComprobantes} capturas guardadas)</span>
                      </div>
                    </div>
                  </div>

                  {/* Base de Datos: Tablas y Registros */}
                  <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE5DC] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-[#1A1918] block">Base de Datos PostgreSQL</span>
                          <span className="text-[10px] text-[#7A7368]">Pedidos, ventas, clientes y gastos</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#1A1918] block">{metricasEspacio.mbBaseDatosUsado} MB / {metricasEspacio.mbBaseDatosTotal} MB</span>
                        <span className="text-[10px] text-emerald-600 font-bold">{metricasEspacio.mbBaseDatosLibre} MB libres</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#EAE5DC] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, metricasEspacio.porcentajeBaseDatosUsado)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-white p-2 rounded-xl border border-[#E5DFD5]">
                        <span className="text-[#7A7368] block text-[10px]">Registros en tablas:</span>
                        <strong className="text-sky-800 font-extrabold block">
                          {metricasEspacio.totalFilasTablas} registros
                        </strong>
                        <span className="text-[9px] text-[#9C9488]">Pedidos, ventas, gastos, etc.</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-[#E5DFD5]">
                        <span className="text-[#7A7368] block text-[10px]">Espacio restante DB:</span>
                        <strong className="text-emerald-700 font-extrabold block">
                          {(100 - metricasEspacio.porcentajeBaseDatosUsado).toFixed(1)}% disponible
                        </strong>
                        <span className="text-[9px] text-[#9C9488]">Capacidad para +500,000 pedidos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 2 Split Cards: Stock Bajo & Agotados (Image 2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: Productos con Stock Bajo */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-[#1A1918] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Productos con Stock Bajo ({stockBajoCount})
                    </h3>
                    <button
                      onClick={() => {
                        setInventarioFilter('stock-bajo');
                        setActiveSection('inventario');
                      }}
                      className="text-xs font-bold text-[#C59A4D] hover:underline"
                    >
                      VER INVENTARIO →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {productos.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-[#FCFAF5] border border-[#F0EAE1] flex items-center justify-between gap-3"
                      >
                        <img
                          src={p.imagen_url || (p.imagenes && p.imagenes[0]) || ''}
                          alt=""
                          className="w-12 h-14 object-cover rounded-xl bg-white border border-[#E5DFD5] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-xs text-[#1A1918] truncate">{p.nombre}</h4>
                          <span className="text-[11px] text-[#7A7368] block">
                            {categorias.find((c) => c.id === p.categoria_id)?.nombre || 'General'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-amber-600">{p.stock} unids.</span>
                          <span className="text-[10px] text-[#9C9488] block">Mín: {p.stock_minimo || 5}</span>
                        </div>
                        <button
                          onClick={() => handleStockDelta(p.id, p.stock ?? 0, 5)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                        >
                          Ajustar
                        </button>
                      </div>
                    ))}
                    {stockBajoCount === 0 && (
                      <p className="text-xs text-[#7A7368] py-8 text-center">No hay productos con stock bajo actualmente.</p>
                    )}
                  </div>
                </div>

                {/* Right Card: Productos Agotados */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-[#1A1918] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      Productos Agotados ({agotadosCount})
                    </h3>
                    <button
                      onClick={() => {
                        setInventarioFilter('agotados');
                        setActiveSection('inventario');
                      }}
                      className="text-xs font-bold text-[#C59A4D] hover:underline"
                    >
                      VER INVENTARIO →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {productos.filter((p) => (p.stock ?? 0) <= 0).slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-[#FCFAF5] border border-[#F0EAE1] flex items-center justify-between gap-3"
                      >
                        <img
                          src={p.imagen_url || (p.imagenes && p.imagenes[0]) || ''}
                          alt=""
                          className="w-12 h-14 object-cover rounded-xl bg-white border border-[#E5DFD5] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-xs text-[#1A1918] truncate">{p.nombre}</h4>
                          <span className="text-[11px] text-[#7A7368] block">
                            {categorias.find((c) => c.id === p.categoria_id)?.nombre || 'General'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-rose-600">0 unidades</span>
                        </div>
                        <button
                          onClick={() => handleStockDelta(p.id, 0, 5)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                        >
                          Reponer
                        </button>
                      </div>
                    ))}
                    {agotadosCount === 0 && (
                      <p className="text-xs text-[#7A7368] py-8 text-center">¡Genial! No hay productos agotados.</p>
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
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">PEDIDOS RECIBIDOS</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block my-2">{pedidos.length}</span>
                    <span className="text-[11px] font-bold text-slate-600">Total en sistema</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">PEDIDOS ACEPTADOS</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 block my-2">
                      {pedidos.filter((p) => p.estado === 'aprobado' || p.estado === 'aceptado').length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Listos / Despachados</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">PEDIDOS PENDIENTES</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-600 block my-2">
                      {pedidos.filter((p) => p.estado === 'pendiente').length}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">Por revisar comprobante</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">VENTAS REALIZADAS</span>
                    <span className="text-2xl sm:text-3xl font-black text-sky-600 block my-2">{ventas.length}</span>
                    <span className="text-[11px] font-bold text-sky-700">Web y mostrador</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">INGRESOS TOTALES</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block my-2">${ingresosTotales.toFixed(2)}</span>
                    <span className="text-[11px] font-bold text-emerald-600">Acumulado histórico</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">VENTAS ESTE MES</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block my-2">${ingresosTotales.toFixed(2)}</span>
                    <span className="text-[11px] text-slate-500">{ventas.length} transacciones</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">TOTAL TRANSACCIONES</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block my-2">{ventas.length}</span>
                    <span className="text-[11px] text-slate-500">Web + Manuales</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">TICKET PROMEDIO</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#C59A4D] block my-2">
                      ${ventas.length > 0 ? Math.round(ingresosTotales / ventas.length) : 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Por cada venta</span>
                  </div>
                </div>
              )}

              {/* Filters bar */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar venta, cliente o código..."
                    className="w-full bg-slate-50 text-xs px-10 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                    title="Recargar ventas"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
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
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-[#F5E6BE] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 text-[#C59A4D]" />
                    <span>+ REGISTRAR VENTA MANUAL</span>
                  </button>
                </div>
              </div>

              {/* Ventas Table or Empty state */}
              {ventas.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-3 shadow-sm">
                  <TrendingUp className="w-10 h-10 mx-auto text-slate-300" />
                  <h3 className="font-extrabold text-slate-900">
                    No se encontraron ventas registradas
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Al aceptar y aprobar pedidos web verificados, se registrarán automáticamente aquí descontando del inventario. También puedes pulsar en &quot;Registrar Venta Manual&quot;.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4">Código</th>
                          <th className="py-3.5 px-4">Cliente</th>
                          <th className="py-3.5 px-4">Teléfono</th>
                          <th className="py-3.5 px-4">Método / Estado</th>
                          <th className="py-3.5 px-4">Tipo</th>
                          <th className="py-3.5 px-4">Fecha</th>
                          <th className="py-3.5 px-4 text-right">
                            {userRole === 'cajero' ? 'Artículos' : 'Total'}
                          </th>
                          <th className="py-3.5 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ventas
                          .filter((v) => {
                            if (!searchQuery.trim()) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                              v.codigo.toLowerCase().includes(q) ||
                              v.cliente_nombre.toLowerCase().includes(q) ||
                              (v.cliente_telefono && v.cliente_telefono.includes(q))
                            );
                          })
                          .map((v) => {
                            const hasSaldo = Boolean(v.saldo_pendiente && v.saldo_pendiente > 0 && v.estado_pago !== 'completo');

                            return (
                              <tr key={v.id || v.codigo} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {v.codigo}
                                </td>
                                <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                  {v.cliente_nombre}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                                  {v.cliente_telefono || '—'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-800 uppercase block text-[11px]">
                                      {v.metodo_pago === 'abono'
                                        ? 'Abono Parcial'
                                        : v.metodo_pago === 'contra_entrega'
                                        ? 'Contra Entrega'
                                        : v.metodo_pago}
                                    </span>
                                    {hasSaldo ? (
                                      userRole === 'cajero' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[9px] inline-block">
                                          ⏳ Saldo pendiente por cobrar
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[9px] inline-block">
                                          ⏳ Debe: ${v.saldo_pendiente?.toFixed(2)} USD
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[9px] text-emerald-700 font-bold inline-flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Completado
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      v.tipo === 'web'
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {v.tipo || 'web'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                                  {v.creado_en ? new Date(v.creado_en).toLocaleString('es-PA') : 'Reciente'}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {userRole === 'cajero' ? (
                                    <span className="font-bold text-slate-700">
                                      {v.items?.length || 1} prenda(s)
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="font-black text-sm text-slate-900 block">
                                        ${Number(v.total).toFixed(2)}
                                      </span>
                                      {hasSaldo && (
                                        <span className="text-[10px] text-emerald-700 font-bold block">
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

                                    {canModifyUser(userRole, { rol: 'dueno' } as any) && (
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarVenta(v.id || v.codigo)}
                                        className="px-2 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
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
          )}

          {/* ======================================================== */}
          {/* CONTROL DE APERTURA Y CIERRE DE CAJA */}
          {/* ======================================================== */}
          {activeSection === 'caja' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div
                className={`rounded-3xl p-6 sm:p-7 border shadow-sm transition-all ${
                  sesionCaja && sesionCaja.estado === 'abierta'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        sesionCaja && sesionCaja.estado === 'abierta'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            sesionCaja && sesionCaja.estado === 'abierta'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {sesionCaja && sesionCaja.estado === 'abierta'
                            ? 'TURNO DE CAJA ACTIVO'
                            : 'CAJA CERRADA'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black mt-1">
                        {sesionCaja && sesionCaja.estado === 'abierta'
                          ? `Turno abierto por ${sesionCaja.abierto_por}`
                          : 'No hay turno activo en este momento'}
                      </h2>
                      <p className="text-xs opacity-75 mt-0.5">
                        {sesionCaja && sesionCaja.estado === 'abierta'
                          ? `Iniciado el ${new Date(sesionCaja.fecha_apertura).toLocaleString('es-PA')}. Fondo inicial: $${Number(sesionCaja.monto_inicial).toFixed(2)} USD.`
                          : 'Inicia el turno de caja indicando el fondo inicial en gaveta para registrar cobros y cuadres.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={reloadAllData}
                      className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
                      title="Actualizar datos"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {sesionCaja && sesionCaja.estado === 'abierta' ? (
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
                {sesionCaja && sesionCaja.estado === 'abierta' && userRole !== 'cajero' && (() => {
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

                  const esperado = (Number(sesionCaja.monto_inicial) || 0) + ventasEfectivoTurno - gastosEfectivoTurno;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-emerald-200/80 text-xs">
                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                        <span className="text-slate-500 font-bold block text-[10px] uppercase">Fondo Inicial</span>
                        <strong className="text-base text-slate-900 font-black">${Number(sesionCaja.monto_inicial).toFixed(2)}</strong>
                      </div>
                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                        <span className="text-slate-500 font-bold block text-[10px] uppercase">Efectivo Cobrado</span>
                        <strong className="text-base text-emerald-700 font-black">+${ventasEfectivoTurno.toFixed(2)}</strong>
                      </div>
                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                        <span className="text-slate-500 font-bold block text-[10px] uppercase">Salidas / Gastos</span>
                        <strong className="text-base text-rose-600 font-black">-${gastosEfectivoTurno.toFixed(2)}</strong>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-xs">
                        <span className="text-emerald-800 font-extrabold block text-[10px] uppercase">Esperado en Gaveta</span>
                        <strong className="text-base text-emerald-900 font-black">${esperado.toFixed(2)} USD</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Historial de Turnos de Caja */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Historial de Turnos & Arqueos de Caja</h3>
                    <p className="text-[11px] text-slate-500">Registro persistente de aperturas, cierres y diferencias de efectivo</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{historialCaja.length} registros</span>
                </div>

                {historialCaja.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No hay turnos de caja registrados aún. Abre la caja para comenzar el primer turno.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4">Apertura</th>
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
                      <tbody className="divide-y divide-slate-100">
                        {historialCaja.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  reg.estado === 'abierta'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {reg.estado === 'abierta' ? '🟢 Abierta' : 'Cerrada'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                              {reg.fecha_apertura ? new Date(reg.fecha_apertura).toLocaleString('es-PA') : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {reg.abierto_por}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-800">
                              ${Number(reg.monto_inicial || 0).toFixed(2)}
                            </td>
                            {userRole !== 'cajero' && (
                              <>
                                <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                                  {reg.monto_esperado !== undefined ? `$${Number(reg.monto_esperado).toFixed(2)}` : '—'}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-slate-900">
                                  {reg.monto_final_real !== undefined ? `$${Number(reg.monto_final_real).toFixed(2)}` : '—'}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black">
                                  {reg.diferencia !== undefined ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                        reg.diferencia === 0
                                          ? 'text-emerald-700 bg-emerald-50'
                                          : reg.diferencia > 0
                                          ? 'text-blue-700 bg-blue-50'
                                          : 'text-rose-700 bg-rose-50'
                                      }`}
                                    >
                                      {reg.diferencia > 0 ? `+${reg.diferencia.toFixed(2)}` : `${reg.diferencia.toFixed(2)}`}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </>
                            )}
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                              {reg.fecha_cierre ? (
                                <div>
                                  <span>{new Date(reg.fecha_cierre).toLocaleString('es-PA')}</span>
                                  {reg.cerrado_por && (
                                    <span className="block text-[10px] text-slate-400">por {reg.cerrado_por}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-emerald-600 font-bold">En curso...</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-[200px] truncate">
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
                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">
                    TOTAL VENTAS (INGRESOS BRUTOS)
                  </span>
                  <span className="text-3xl font-black text-[#1A1918] block my-2">
                    ${totalVentasGanado.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {ventas.length} ventas acumuladas
                  </span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">
                    TOTAL GASTOS REGISTRADOS
                  </span>
                  <span className="text-3xl font-black text-rose-600 block my-2">
                    -${totalGastosMonto.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {gastos.length} gastos operativos / inventario
                  </span>
                </div>

                <div className={`rounded-3xl p-5 border shadow-sm ${
                  totalNetoGanancia >= 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">
                    TOTAL NETO EN CAJA (GANANCIA REAL)
                  </span>
                  <span className="text-3xl font-black block my-2">
                    ${totalNetoGanancia.toFixed(2)} USD
                  </span>
                  <span className="text-[11px] font-bold">
                    Ventas menos Gastos deducidos en tiempo real
                  </span>
                </div>
              </div>

              {/* Action and Filter Bar */}
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setIsModalGastoOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>REGISTRAR NUEVO GASTO</span>
                  </button>
                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-xl border border-[#D5DCE4] hover:bg-[#FAF8F5] text-[#1A1918]"
                    title="Recargar datos"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs text-[#7A7368] font-bold">
                  {gastos.length} registros de egresos
                </div>
              </div>

              {/* Expenses Table */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                {gastos.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Wallet className="w-10 h-10 mx-auto text-[#C9BFB0]" />
                    <h3 className="font-extrabold text-[#1A1918]">
                      No hay gastos registrados todavía
                    </h3>
                    <p className="text-xs text-[#7A7368] max-w-md mx-auto">
                      Registra los gastos de compras de mercancía (ej: 10 camisas), alquiler o publicidad para descontarlos del total ganado y ver tu ganancia neta.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="bg-[#FAF8F5] border-b border-[#EAE5DC] text-[10px] font-black uppercase text-[#7A7368] tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4">Concepto / Descripción</th>
                          <th className="py-3.5 px-4">Categoría</th>
                          <th className="py-3.5 px-4">Fecha</th>
                          <th className="py-3.5 px-4">Registrado Por</th>
                          <th className="py-3.5 px-4 text-right">Monto Deducido</th>
                          <th className="py-3.5 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2EDE4]">
                        {gastos.map((g) => (
                          <tr key={g.id || g.concepto} className="hover:bg-[#FCFAF7] transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-[#1A1918] block">{g.concepto}</span>
                              {g.notas && (
                                <span className="text-[11px] text-[#7A7368] block mt-0.5">{g.notas}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#E5DFD5] text-[#5A554D]">
                                {g.categoria}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#7A7368]">
                              {g.fecha ? new Date(g.fecha).toLocaleDateString('es-PA') : 'Reciente'}
                            </td>
                            <td className="py-3.5 px-4 text-[#7A7368]">
                              {g.creado_por || 'Administrador'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-rose-600 text-sm">
                              -${Number(g.monto).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {g.id && (
                                <button
                                  type="button"
                                  onClick={() => handleEliminarGasto(g.id!, g.concepto)}
                                  className="px-2.5 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
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
            </div>
          )}

          {/* ======================================================== */}
          {/* REGISTRO DE MOVIMIENTOS & AUDITORÍA DE TRABAJADORES */}
          {/* ======================================================== */}
          {activeSection === 'movimientos' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header card */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#1A1918] font-heading flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#C59A4D]" />
                    Registro de Movimientos & Auditoría de Trabajadores
                  </h2>
                  <p className="text-xs text-[#7A7368] mt-0.5">
                    Historial cronológico de cada acción, turno, confirmación de pedidos, cobros y ajustes de inventario realizados por los trabajadores.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={async () => {
                      const m = await getMovimientosTrabajadores();
                      setMovimientos(m);
                    }}
                    className="p-2.5 rounded-2xl bg-[#F4F6F8] hover:bg-[#EAEFF5] text-[#1A1918] transition-colors cursor-pointer"
                    title="Actualizar movimientos en tiempo real"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {userRole === 'dueno' && (
                    <button
                      onClick={handleLimpiarHistorialMovimientosRegistro}
                      className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>VACIAR HISTORIAL</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Stat Cards de Auditoría */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">
                    TOTAL MOVIMIENTOS
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1A1918] block my-2">
                    {movimientos.length}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold">
                    Acciones registradas
                  </span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">
                    TURNOS DE TRABAJO
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 block my-2">
                    {movimientos.filter((m) => m.modulo === 'auth' || m.accion.toLowerCase().includes('turno')).length}
                  </span>
                  <span className="text-[11px] text-[#7A7368]">
                    Inicios de sesión
                  </span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">
                    MOVIMIENTOS EN PEDIDOS
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#C59A4D] block my-2">
                    {movimientos.filter((m) => m.modulo === 'pedidos').length}
                  </span>
                  <span className="text-[11px] text-[#7A7368]">
                    Aprobados / Rechazados
                  </span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">
                    AJUSTES DE INVENTARIO
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-sky-600 block my-2">
                    {movimientos.filter((m) => m.modulo === 'inventario').length}
                  </span>
                  <span className="text-[11px] text-[#7A7368]">
                    Stock modificado
                  </span>
                </div>
              </div>

              {/* Filtros de Búsqueda y Módulo */}
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por trabajador, correo, pedido o acción..."
                    value={movimientosSearch}
                    onChange={(e) => setMovimientosSearch(e.target.value)}
                    className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                  />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    value={movimientosModuloFilter}
                    onChange={(e) => setMovimientosModuloFilter(e.target.value)}
                    className="bg-[#FAF8F5] text-xs font-bold text-[#1A1918] px-3.5 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  >
                    <option value="todos">Todos los Módulos</option>
                    <option value="auth">Turnos / Sesiones</option>
                    <option value="pedidos">Pedidos & Comprobantes</option>
                    <option value="inventario">Inventario & Stock</option>
                    <option value="ventas">Ventas</option>
                    <option value="gastos">Gastos</option>
                  </select>

                  <select
                    value={movimientosRolFilter}
                    onChange={(e) => setMovimientosRolFilter(e.target.value)}
                    className="bg-[#FAF8F5] text-xs font-bold text-[#1A1918] px-3.5 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  >
                    <option value="todos">Todos los Roles</option>
                    <option value="cajero">Solo Trabajadores</option>
                    <option value="dueno">Solo Dueños</option>
                    <option value="administrador">Solo Administradores</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Movimientos */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#EAE5DC] text-[10px] font-black uppercase text-[#7A7368] tracking-wider">
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
                    <tbody className="divide-y divide-[#F2EDE4]">
                      {movimientos
                        .filter((m) => {
                          if (movimientosModuloFilter !== 'todos' && m.modulo !== movimientosModuloFilter) return false;
                          if (movimientosRolFilter !== 'todos' && m.rol !== movimientosRolFilter) return false;
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
                            <tr key={mov.id} className="hover:bg-[#FCFAF7] transition-colors">
                              <td className="py-3.5 px-5 whitespace-nowrap">
                                <span className="font-bold text-[#1A1918] block">{formattedTime}</span>
                                <span className="text-[10px] text-[#7A7368] block">{formattedDate}</span>
                              </td>

                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isWorker ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-[#8C6B28]'
                                  }`}>
                                    {mov.usuario_nombre.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <strong className="text-xs text-[#1A1918]">{mov.usuario_nombre}</strong>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                        isWorker
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                          : 'bg-amber-100 text-[#8C6B28] border border-amber-300'
                                      }`}>
                                        {isWorker ? 'TRABAJADOR' : mov.rol.toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-[#7A7368] block truncate">
                                      {mov.usuario_email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                                  {mov.modulo || 'general'}
                                </span>
                              </td>

                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                                  mov.accion.includes('Aprobó') || mov.accion.includes('Verificado')
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : mov.accion.includes('Rechazó')
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : mov.accion.includes('Stock')
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : mov.accion.includes('Turno') || mov.accion.includes('Sesión')
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {mov.accion}
                                </span>
                              </td>

                              <td className="py-3.5 px-5 max-w-md">
                                <p className="text-xs text-[#453F38] font-medium leading-relaxed">
                                  {mov.detalles || 'Sin detalles adicionales'}
                                </p>
                              </td>

                              {userRole === 'dueno' && (
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    onClick={() => handleEliminarMovimientoRegistro(mov.id)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:border-rose-200 border border-transparent transition-colors cursor-pointer"
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
                          <td colSpan={userRole === 'dueno' ? 6 : 5} className="py-14 text-center text-[#7A7368]">
                            <Activity className="w-8 h-8 text-[#CCC5B8] mx-auto mb-2" />
                            <strong className="block text-sm text-[#1A1918]">
                              No hay movimientos registrados todavía
                            </strong>
                            <p className="text-xs text-[#7A7368] mt-1 max-w-sm mx-auto">
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
                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">TOTAL PEDIDOS REGISTRADOS</span>
                  <span className="text-3xl font-black text-[#1A1918] block my-2">{pedidos.length}</span>
                  <span className="text-[11px] text-[#7A7368]">En línea y WhatsApp</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">PENDIENTES POR VERIFICAR</span>
                  <span className="text-3xl font-black text-amber-600 block my-2">{pedidosPendientes}</span>
                  <span className="text-[11px] text-amber-700">Comprobante por revisar</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">APROBADOS & ENTREGADOS</span>
                  <span className="text-3xl font-black text-emerald-600 block my-2">{pedidosAprobados}</span>
                  <span className="text-[11px] text-emerald-700">Pasados a ventas</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">VOLUMEN TOTAL EN PEDIDOS</span>
                  <span className="text-3xl font-black text-[#1A1918] block my-2">${volumenTotalPedidos}</span>
                  <span className="text-[11px] text-[#7A7368]">Excluye cancelados</span>
                </div>
              </div>

              {/* Search & Status Filters */}
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por código, cliente o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(['todos', 'pendientes', 'aprobados', 'entregados', 'cancelados'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPedidoFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        pedidoFilter === tab
                          ? 'bg-[#141312] text-white'
                          : 'bg-[#F4F6F8] text-[#1A1918] hover:bg-[#EAEFF5]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                  <button
                    onClick={reloadAllData}
                    className="p-2 rounded-xl border border-[#D5DCE4] text-[#1A1918]"
                    title="Recargar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Toast de confirmación de comprobante */}
              {comprobanteToast && (
                <div
                  className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-fade-in shadow-sm ${
                    comprobanteToast.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{comprobanteToast.msg}</span>
                  </div>
                  <button
                    onClick={() => setComprobanteToast(null)}
                    className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                      className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-[#E5E9EE] shadow-xs space-y-4"
                    >
                      {/* Order Header bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-[#F0EAE1] gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center font-black text-xs shrink-0">
                            ALX
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-[#1A1918]">{pedido.codigo}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase ${
                                  pedido.estado === 'pendiente'
                                    ? 'bg-amber-100 text-amber-900'
                                    : pedido.estado === 'aprobado' || pedido.estado === 'aceptado'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : pedido.estado === 'entregado'
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-rose-100 text-rose-900'
                                }`}
                              >
                                {pedido.estado}
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-[#7A7368] block">
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
                              onClick={() => handleAprobarPedido(pedido)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                              title="Aceptar pedido: descuenta stock automáticamente de inventario y registra la venta en Ventas"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>
                                {orderActionLoadingId === (pedido.id || pedido.codigo)
                                  ? 'Aceptando...'
                                  : 'ACEPTAR'}
                              </span>
                            </button>
                          )}

                          {pedido.estado === 'pendiente' && (
                            <button
                              type="button"
                              disabled={orderActionLoadingId === (pedido.id || pedido.codigo)}
                              onClick={() => handleRechazarPedido(pedido)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
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
                            className="bg-[#FAF8F5] text-[11px] sm:text-xs font-bold text-[#1A1918] px-2.5 py-1.5 rounded-xl border border-[#E5DFD5] focus:outline-none"
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
                            className="px-2 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-colors cursor-pointer"
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
                          <span className="text-[10px] font-black uppercase text-[#9C9488] block">
                            DATOS DEL CLIENTE
                          </span>
                          <strong className="text-sm text-[#1A1918] block">{pedido.cliente_nombre}</strong>
                          <div className="flex items-center gap-2 text-[#7A7368]">
                            <Phone className="w-3.5 h-3.5 text-[#9C9488]" />
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
                              className="p-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                              title="Chatear por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                          {pedido.cliente_direccion && (
                            <span className="text-[#7A7368] block mt-1">
                              📍 {pedido.cliente_direccion}
                            </span>
                          )}
                          {pedido.notas && (
                            <span className="text-[11px] text-[#7A7368] block italic mt-1 bg-[#FAF8F5] p-2 rounded-xl border border-[#F0EAE1]">
                              Nota: {pedido.notas}
                            </span>
                          )}
                        </div>

                        {/* Col 2: Pago & Comprobante (Requisito 4) */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#9C9488]">
                              PAGO & COMPROBANTE
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#141312] text-white text-[9px] font-black uppercase">
                              {pedido.metodo_pago}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-[#7A7368]">
                              {userRole === 'cajero' ? 'Artículos:' : 'Monto Total:'}
                            </span>
                            {userRole === 'cajero' ? (
                              <span className="text-base font-black text-slate-800">
                                {pedido.items?.reduce((s, it) => s + (it.cantidad || 1), 0) || pedido.items?.length || 1} prenda(s)
                              </span>
                            ) : (
                              <span className="text-xl font-black text-[#1A1918]">${pedido.total}</span>
                            )}
                          </div>

                          {/* Estado de validación del comprobante */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#7A7368] font-bold">Estado del Comprobante:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                pedido.estado_pago === 'verificado'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : pedido.estado_pago === 'rechazado'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
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
                            <div className="rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] p-2.5 space-y-2.5">
                              {/* Vista previa de imagen + botones Ver y Descargar */}
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={pedido.comprobante_url}
                                  alt="Comprobante de pago"
                                  className="w-14 h-14 object-cover rounded-xl border border-[#D5CEC2] shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    setSelectedOrderForProof(pedido);
                                    setViewingProofUrl(pedido.comprobante_url || null);
                                  }}
                                  title="Click para ver en pantalla completa"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-[#1A1918] block truncate">
                                    Comprobante Adjunto
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOrderForProof(pedido);
                                        setViewingProofUrl(pedido.comprobante_url || null);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-[#141312] text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black transition-colors cursor-pointer"
                                      title="Abrir en tamaño completo"
                                    >
                                      <Eye className="w-3 h-3 text-[#E6C687]" />
                                      <span>Ver</span>
                                    </button>

                                    <a
                                      href={pedido.comprobante_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:bg-[#FAF8F5] text-[#1A1918] text-[10px] font-bold flex items-center gap-1 transition-colors"
                                      title="Abrir comprobante en nueva pestaña"
                                    >
                                      <ExternalLink className="w-3 h-3 text-[#7A7368]" />
                                      <span>Pestaña</span>
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyReceiptLink(pedido.comprobante_url!, pedido.id || pedido.codigo)}
                                      className="px-2 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:bg-[#FAF8F5] text-[#1A1918] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Copiar enlace directo del comprobante"
                                    >
                                      <Copy className="w-3 h-3 text-[#7A7368]" />
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
                                      className="px-2 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:bg-[#FAF8F5] text-[#1A1918] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Descargar comprobante a tu dispositivo con nombre descriptivo"
                                    >
                                      <Download className="w-3 h-3 text-[#7A7368]" />
                                      <span>Descargar</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Selector rápido de validación del comprobante con confirmación visual */}
                              <div className="pt-2 border-t border-[#EFE8DD] flex items-center justify-between gap-1">
                                <span className="text-[10px] text-[#7A7368] font-bold">Cambiar estado:</span>
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
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
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
                                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
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
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                    }`}
                                    title="Restablecer comprobante a pendiente"
                                  >
                                    Pendiente
                                  </button>
                                </div>

                                {pedido.revisado_por && (
                                  <div className="pt-2 border-t border-[#EFE8DD] text-[10px] text-[#7A7368] flex items-center justify-between">
                                    <span>Revisado por: <strong className="text-[#1A1918]">{pedido.revisado_por}</strong></span>
                                    {pedido.revisado_en && <span>{new Date(pedido.revisado_en).toLocaleString('es-PA')}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-dashed border-[#DDD7CC] text-center space-y-2">
                              <span className="text-[11px] text-[#9C9488] font-bold block">
                                ⚠️ Sin comprobante adjunto
                              </span>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CC] hover:border-[#141312] text-[#1A1918] text-[10px] font-bold cursor-pointer transition-colors shadow-xs">
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
                          <span className="text-[10px] font-black uppercase text-[#9C9488] block">
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
                                  className="flex items-start justify-between gap-2 bg-[#FCFAF7] p-2 rounded-xl border border-[#F0EAE1]"
                                >
                                  <div className="flex items-center gap-2.5 truncate min-w-0">
                                    {(() => {
                                      const prodImg = it.imagen_url || productos.find((p) => p.id === (it.producto_id || it.id))?.imagen_url;
                                      return prodImg ? (
                                        <img
                                          src={prodImg}
                                          alt={it.nombre}
                                          className="w-12 h-14 object-cover rounded-xl bg-white border border-[#EAE5DC] shadow-xs shrink-0"
                                        />
                                      ) : (
                                        <div className="w-12 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-[10px] font-bold">
                                          Sin foto
                                        </div>
                                      );
                                    })()}
                                    <div className="min-w-0">
                                      <span className="font-bold text-[#1A1918] truncate block text-[11px]">
                                        {it.nombre} <span className="text-[#8C8375]">x{it.cantidad}</span>
                                      </span>
                                      {varDesc && (
                                        <span className="text-[10px] text-[#C59A4D] font-bold block truncate">
                                          {varDesc}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-[#7A7368] block">
                                        {userRole === 'cajero'
                                          ? `${it.cantidad} unidad(es)`
                                          : `$${it.precio.toFixed(2)} c/u`}
                                      </span>
                                    </div>
                                  </div>
                                  {userRole !== 'cajero' && (
                                    <span className="font-black text-[#1A1918] shrink-0 text-xs">
                                      ${(it.precio * it.cantidad).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Desglose de Artículos (Oculta dinero a cajero) */}
                          {userRole === 'cajero' ? (
                            <div className="pt-2 border-t border-[#EAE3D5] text-xs font-bold text-slate-700 bg-[#FAF8F5] p-2.5 rounded-xl flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-extrabold">Total Prendas:</span>
                              <span className="font-black text-slate-900 text-sm">
                                {pedido.items?.reduce((s, it) => s + (it.cantidad || 1), 0) || pedido.items?.length || 1} prenda(s)
                              </span>
                            </div>
                          ) : (
                            <div className="pt-2.5 border-t border-[#EAE3D5] space-y-1 text-[11px] text-[#7A7368] bg-[#FAF8F5] p-2 rounded-xl">
                              <div className="flex justify-between">
                                <span>Subtotal Artículos:</span>
                                <span className="font-bold text-[#1A1918]">${(pedido.subtotal || pedido.total).toFixed(2)}</span>
                              </div>
                              {(pedido.descuento ?? 0) > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>Descuento:</span>
                                  <span className="font-bold">-${Number(pedido.descuento).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Envío:</span>
                                <span className="font-bold text-[#1A1918]">
                                  {(pedido.costo_envio ?? 0) > 0 ? `$${Number(pedido.costo_envio).toFixed(2)}` : '$0.00'}
                                </span>
                              </div>
                              <div className="pt-1.5 border-t border-[#EAE3D5] flex justify-between font-black text-xs text-[#1A1918]">
                                <span>TOTAL FINAL:</span>
                                <span className="text-[#C59A4D] text-sm">${Number(pedido.total).toFixed(2)}</span>
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
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                    />
                  </div>

                  <select
                    value={categoriaFilter}
                    onChange={(e) => setCategoriaFilter(e.target.value)}
                    className="bg-[#FAF8F5] text-xs font-bold text-[#1A1918] px-3.5 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-xl border border-[#D5DCE4] text-[#1A1918]"
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
                  className="px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ NUEVO PRODUCTO</span>
                </button>
              </div>

              {/* Table (Image 5) */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#E5E9EE] text-[#7A7368] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-4 px-6">PRODUCTO</th>
                        <th className="py-4 px-6">CATEGORÍA</th>
                        <th className="py-4 px-6">PRECIO</th>
                        <th className="py-4 px-6">STOCK</th>
                        <th className="py-4 px-6">ESTADO</th>
                        <th className="py-4 px-6 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE1]">
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
                            <tr key={prod.id} className="hover:bg-[#FCFAF7] transition-colors">
                              <td className="py-3 px-6">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={prod.imagen_url || (prod.imagenes && prod.imagenes[0]) || ''}
                                    alt=""
                                    className="w-12 h-14 object-cover rounded-xl bg-[#F7F5F0] border border-[#EAE5DC]"
                                  />
                                  <div>
                                    <span className="font-extrabold text-sm text-[#1A1918] block max-w-xs truncate">
                                      {prod.nombre}
                                    </span>
                                    {prod.imagenes && prod.imagenes.length > 1 && (
                                      <span className="text-[10px] text-[#9C9488]">
                                        +{prod.imagenes.length} fotos galería
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-6 text-[#5A554D] font-medium">
                                {categorias.find((c) => c.id === prod.categoria_id)?.nombre || 'General'}
                              </td>

                              <td className="py-3 px-6 font-black text-sm text-[#1A1918]">
                                ${prod.precio}
                              </td>

                              <td className="py-3 px-6">
                                {isAgotado ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Agotado (0)
                                  </span>
                                ) : isBajo ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    Últimas {stock} unidades
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Disponible ({stock})
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-6">
                                <span
                                  className={`inline-flex items-center gap-1 font-bold ${
                                    prod.activo ? 'text-emerald-600' : 'text-[#9C9488]'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      prod.activo ? 'bg-emerald-500' : 'bg-[#9C9488]'
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
                                    className="p-1.5 rounded-lg text-[#7A7368] hover:text-[#1A1918] hover:bg-slate-100"
                                    title="Editar producto"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProducto(prod.id, prod.nombre)}
                                    className="p-1.5 rounded-lg text-[#9C9488] hover:text-rose-600 hover:bg-rose-50"
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
                    <Package className="w-10 h-10 mx-auto text-[#C9BFB0]" />
                    <p className="font-extrabold text-[#1A1918]">Catálogo en 0</p>
                    <p className="text-xs text-[#7A7368]">
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
              <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#1A1918] font-heading">
                    Categorías Registradas ({categorias.length})
                  </h2>
                  <p className="text-xs text-[#7A7368] mt-0.5">
                    Organiza los productos en public.categorias. En el catálogo público solo se verán las categorías activas.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={reloadAllData}
                    className="p-2.5 rounded-2xl bg-[#F4F6F8] hover:bg-[#EAEFF5] text-[#1A1918]"
                    title="Actualizar"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setCategoriaToEdit(null);
                      setIsModalCategoriaOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ NUEVA CATEGORÍA</span>
                  </button>
                </div>
              </div>

              {/* Table (Image 6) */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#E5E9EE] text-[#7A7368] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-4 px-6">CATEGORÍA</th>
                        <th className="py-4 px-6">DESCRIPCIÓN</th>
                        <th className="py-4 px-6">PRODUCTOS</th>
                        <th className="py-4 px-6">ESTADO</th>
                        <th className="py-4 px-6 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE1]">
                      {categorias.map((cat) => {
                        const prodsCount = productos.filter((p) => p.categoria_id === cat.id).length;

                        return (
                          <tr key={cat.id} className="hover:bg-[#FCFAF7] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EAE5DC] flex items-center justify-center text-[#C59A4D]">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <span className="font-extrabold text-sm text-[#1A1918]">{cat.nombre}</span>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-[#7A7368] italic">
                              {cat.descripcion || 'Sin descripción'}
                            </td>

                            <td className="py-4 px-6 font-bold text-[#1A1918]">
                              {prodsCount} productos
                            </td>

                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
                                  className="p-1.5 rounded-lg text-[#7A7368] hover:text-[#1A1918] hover:bg-slate-100"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategoria(cat.id, cat.nombre)}
                                  className="p-1.5 rounded-lg text-[#9C9488] hover:text-rose-600 hover:bg-rose-50"
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
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {(['todos', 'disponibles', 'stock-bajo', 'agotados'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setInventarioFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        inventarioFilter === tab
                          ? 'bg-[#141312] text-white'
                          : 'bg-[#F4F6F8] text-[#1A1918] hover:bg-[#EAEFF5]'
                      }`}
                    >
                      {tab === 'stock-bajo' ? 'Stock Bajo' : tab}
                    </button>
                  ))}
                  <button
                    onClick={reloadAllData}
                    className="p-2 rounded-xl border border-[#D5DCE4] text-[#1A1918]"
                    title="Recargar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table (Image 7) */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E5E9EE] text-[#7A7368] font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-4 px-6">PRODUCTO</th>
                      <th className="py-4 px-6">STOCK ACTUAL</th>
                      <th className="py-4 px-6">STOCK MÍNIMO</th>
                      <th className="py-4 px-6">ESTADO</th>
                      <th className="py-4 px-6 text-center">AJUSTE RÁPIDO</th>
                      <th className="py-4 px-6 text-right">DETALLES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE1]">
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
                          <tr key={prod.id} className="hover:bg-[#FCFAF7] transition-colors">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.imagen_url || (prod.imagenes && prod.imagenes[0]) || ''}
                                  alt=""
                                  className="w-12 h-14 object-cover rounded-xl bg-[#F7F5F0] border border-[#EAE5DC]"
                                />
                                <div>
                                  <span className="font-extrabold text-sm text-[#1A1918] block max-w-xs truncate">
                                    {prod.nombre}
                                  </span>
                                  <span className="text-[11px] text-[#7A7368]">
                                    {categorias.find((c) => c.id === prod.categoria_id)?.nombre || 'General'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-6 font-black text-sm text-[#1A1918]">
                              {stock} unids.
                            </td>

                            <td className="py-3 px-6 text-[#7A7368]">
                              {prod.stock_minimo || 5} unids.
                            </td>

                            <td className="py-3 px-6">
                              {isAgotado ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Agotado
                                </span>
                              ) : isBajo ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Stock Bajo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Disponible
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-6 text-center">
                              <div className="inline-flex items-center gap-2 bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl px-2 py-1">
                                <button
                                  onClick={() => handleStockDelta(prod.id, stock, -1)}
                                  className="p-1 hover:text-rose-600"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-black text-xs min-w-4 text-center">{stock}</span>
                                <button
                                  onClick={() => handleStockDelta(prod.id, stock, 1)}
                                  className="p-1 hover:text-emerald-600"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-6 text-right">
                              <button
                                onClick={() => {
                                  setProductoToEdit(prod);
                                  setIsModalProductoOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl border border-[#D5DCE4] hover:bg-[#FAF8F5] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#C59A4D]" />
                                <span>Editar</span>
                              </button>
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
              <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#1A1918] font-heading">
                    Directorio Consolidado de Clientes
                  </h2>
                  <p className="text-xs text-[#7A7368] mt-0.5">
                    Clientes extraídos y sincronizados desde las órdenes de compra registradas.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] text-xs font-bold text-[#1A1918]">
                    Total Clientes: {clientesList.length}
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono de cliente..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E9EE] bg-[#FAF8F5] text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      <th className="py-3 px-6">Teléfono (ID Cliente)</th>
                      <th className="py-3 px-6">Nombre del Cliente</th>
                      <th className="py-3 px-6">Dirección Habitual</th>
                      <th className="py-3 px-6">Pedidos Totales</th>
                      <th className="py-3 px-6">Total Comprado</th>
                      <th className="py-3 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE1] text-xs">
                    {clientesList
                      .filter((c) => {
                        if (!clienteSearch.trim()) return true;
                        const q = clienteSearch.toLowerCase().trim();
                        return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q);
                      })
                      .map((cli, idx) => (
                        <tr key={idx} className="hover:bg-[#FCFAF7] transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C59A4D] flex items-center justify-center shrink-0">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-mono font-black text-sm text-[#1A1918] block">
                                  {cli.telefono || 'Sin teléfono'}
                                </span>
                                <span className="text-[10px] text-[#8C8375]">Registro por Teléfono</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <strong className="font-extrabold text-[#1A1918] block text-sm">
                              {cli.nombre}
                            </strong>
                            <span className="text-[10px] text-[#7A7368]">
                              Cliente AlexStore
                            </span>
                          </td>

                          <td className="py-4 px-6 text-[#7A7368] max-w-xs truncate">
                            {cli.direccion || 'Por coordinar'}
                          </td>

                          <td className="py-4 px-6 font-bold text-[#1A1918]">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs">
                              {cli.totalPedidos} {cli.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                            </span>
                          </td>

                          <td className="py-4 px-6 font-black text-sm text-emerald-800">
                            ${cli.totalGastado.toFixed(2)} USD
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
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
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                onClick={() => handleEliminarCliente(cli)}
                                className="px-2.5 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                        <td colSpan={6} className="py-12 text-center text-[#7A7368]">
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
              <div className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#1A1918] font-heading flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#C59A4D]" />
                    Gestión de Usuarios, Roles & Permisos
                  </h2>
                  <p className="text-xs text-[#7A7368] mt-0.5">
                    Control de accesos basado en roles (Dueño, Administrador, Cajero) con autorización segura.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Botón para ver script SQL de Autenticación */}
                  <button
                    onClick={() => setIsModalSqlAuthOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-[#8C6B28] border border-amber-300 text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <KeyRound className="w-4 h-4 text-[#C59A4D]" />
                    <span>SQL SUPABASE AUTH</span>
                  </button>

                  {/* Botón para crear usuario (Disponible para Dueño y Admin) */}
                  <button
                    onClick={() => setIsModalUsuarioOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4 text-[#C59A4D]" />
                    <span>REGISTRAR USUARIO</span>
                  </button>
                </div>
              </div>

              {/* 3 Stats de Usuarios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-[#E5E9EE] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8C8375] tracking-wider block">
                      DUEÑOS (ACCESO TOTAL)
                    </span>
                    <span className="text-2xl font-black text-[#1A1918] mt-1 block">
                      {usuarios.filter((u) => u.rol === 'dueno').length}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#C59A4D] flex items-center justify-center font-black">
                    👑
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#E5E9EE] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8C8375] tracking-wider block">
                      ADMINISTRADORES
                    </span>
                    <span className="text-2xl font-black text-[#1A1918] mt-1 block">
                      {usuarios.filter((u) => u.rol === 'administrador').length}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#E5E9EE] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8C8375] tracking-wider block">
                      TRABAJADORES / CAJEROS
                    </span>
                    <span className="text-2xl font-black text-[#1A1918] mt-1 block">
                      {usuarios.filter((u) => u.rol === 'cajero').length}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="bg-[#FAF8F5] text-xs font-bold text-[#1A1918] px-3.5 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  >
                    <option value="todos">Todos los roles</option>
                    <option value="dueno">Dueño</option>
                    <option value="administrador">Administrador</option>
                    <option value="cajero">Trabajador / Cajero</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="bg-[#FAF8F5] text-xs font-bold text-[#1A1918] px-3.5 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activos">Solo activos</option>
                    <option value="inactivos">Solo inactivos</option>
                  </select>
                </div>

                <button
                  onClick={reloadAllData}
                  className="p-2.5 rounded-2xl bg-[#F4F6F8] hover:bg-[#EAEFF5] text-[#1A1918] transition-colors"
                  title="Actualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Table de Usuarios */}
              <div className="bg-white rounded-3xl border border-[#E5E9EE] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E9EE] bg-[#FAF8F5] text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      <th className="py-3 px-6">Usuario & Colaborador</th>
                      <th className="py-3 px-6">Nivel de Rol</th>
                      <th className="py-3 px-6">Estado de Acceso</th>
                      <th className="py-3 px-6">Creado por</th>
                      <th className="py-3 px-6">Fecha Registro</th>
                      <th className="py-3 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE1] text-xs">
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
                          <tr key={u.id} className="hover:bg-[#FCFAF7] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center font-black text-sm shrink-0">
                                  {u.nombre ? u.nombre.substring(0, 2).toUpperCase() : 'US'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <strong className="font-extrabold text-sm text-[#1A1918]">
                                      {u.nombre}
                                    </strong>
                                    {isSelf && (
                                      <span className="text-[9px] bg-slate-100 text-slate-700 font-black px-1.5 py-0.2 rounded">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#7A7368] font-mono block">
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                  u.rol === 'dueno'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : u.rol === 'administrador'
                                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {u.rol === 'dueno' && '👑 Dueño'}
                                {u.rol === 'administrador' && '🛡️ Administrador'}
                                {u.rol === 'cajero' && '💼 Cajero'}
                              </span>
                            </td>

                            <td className="py-4 px-6">
                              {u.activo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  Desactivado
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-[#7A7368] font-mono text-[11px]">
                              {u.creado_por || 'Sistema'}
                            </td>

                            <td className="py-4 px-6 text-[#7A7368] text-[11px]">
                              {new Date(u.creado_en).toLocaleDateString('es-PA')}
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Botones directos para cambiar a Dueño o Trabajador en 1 clic */}
                                {currentUser?.rol === 'dueno' && u.rol !== 'dueno' && (
                                  <button
                                    onClick={() => handleCambiarRolDirecto(u, 'dueno')}
                                    className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#8C6B28] border border-amber-300 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Convertir a Dueño / Admin"
                                  >
                                    <span>👑 Hacer Dueño</span>
                                  </button>
                                )}

                                {currentUser?.rol === 'dueno' && u.rol !== 'cajero' && (
                                  <button
                                    onClick={() => handleCambiarRolDirecto(u, 'cajero')}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Convertir a Trabajador"
                                  >
                                    <span>💼 Hacer Trabajador</span>
                                  </button>
                                )}

                                {/* Botón Modificar Nombre / Detalles */}
                                {canModify && (
                                  <button
                                    onClick={() => setUsuarioToEditRole(u)}
                                    className="p-1.5 rounded-xl border border-[#E5DFD5] text-[#1A1918] hover:bg-slate-100 font-bold transition-colors cursor-pointer"
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
                                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                                    className="px-2.5 py-1 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                        <td colSpan={6} className="py-12 text-center text-[#7A7368]">
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
            className="relative w-full max-w-2xl bg-white rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl border border-[#E5DFD5] max-h-[92dvh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#1A1918]">
                    {selectedOrderForProof ? `Comprobante Pedido ${selectedOrderForProof.codigo}` : 'Comprobante de Pago'}
                  </span>
                  {selectedOrderForProof?.estado_pago && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedOrderForProof.estado_pago === 'verificado'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : selectedOrderForProof.estado_pago === 'rechazado'
                          ? 'bg-rose-100 text-rose-900 border border-rose-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
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
                  <span className="text-[11px] text-[#7A7368] block mt-0.5">
                    Cliente: {selectedOrderForProof.cliente_nombre} • Tel: {selectedOrderForProof.cliente_telefono} • Total: ${selectedOrderForProof.total}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={viewingProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CC] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1918] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#7A7368]" />
                  <span>Pestaña</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyReceiptLink(viewingProofUrl, selectedOrderForProof?.id || 'modal')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CC] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1918] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Copiar enlace directo"
                >
                  <Copy className="w-3.5 h-3.5 text-[#7A7368]" />
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
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CC] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1918] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Descargar comprobante"
                >
                  <Download className="w-3.5 h-3.5 text-[#7A7368]" />
                  <span>Descargar</span>
                </button>

                <button
                  onClick={() => {
                    setViewingProofUrl(null);
                    setSelectedOrderForProof(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="bg-[#141312] rounded-2xl p-2 flex items-center justify-center max-h-[50vh] overflow-hidden">
              <img
                src={viewingProofUrl}
                alt="Comprobante en alta resolución"
                className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Prendas seleccionadas por el cliente en el pedido con foto y variantes */}
            {selectedOrderForProof && selectedOrderForProof.items && selectedOrderForProof.items.length > 0 && (
              <div className="bg-[#FCFAF7] rounded-2xl p-3 border border-[#EAE5DC] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#1A1918] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#C59A4D]" />
                    Prendas elegidas por el cliente ({selectedOrderForProof.items.length})
                  </span>
                  {userRole !== 'cajero' && (
                    <span className="font-black text-[#C59A4D]">
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
                        className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-[#EAE5DC] shadow-xs"
                      >
                        {prodImg ? (
                          <img
                            src={prodImg}
                            alt={it.nombre}
                            className="w-11 h-13 object-cover rounded-lg border border-[#DDD7CC] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-13 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-[10px] font-bold">
                            Sin foto
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-[#1A1918] truncate block">
                            {it.nombre}
                          </span>
                          {varDesc && (
                            <span className="text-[10px] text-[#C59A4D] font-bold block truncate">
                              {varDesc}
                            </span>
                          )}
                          <span className="text-[10px] text-[#7A7368] block">
                            {userRole === 'cajero'
                              ? `Cantidad: ${it.cantidad}`
                              : `Cant: ${it.cantidad} • $${it.precio.toFixed(2)} c/u`}
                          </span>
                        </div>
                        {userRole !== 'cajero' && (
                          <span className="text-xs font-black text-slate-900 shrink-0">
                            ${(it.precio * it.cantidad).toFixed(2)}
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
              <div className="pt-2 border-t border-[#F0EAE1] flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-[#7A7368] font-bold">Cambiar estado de validación:</span>
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
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                      selectedOrderForProof.estado_pago === 'verificado'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
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
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                      selectedOrderForProof.estado_pago === 'rechazado'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
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
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                      selectedOrderForProof.estado_pago === 'pendiente_revision'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 border border-[#E5DFD5] shadow-2xl animate-fade-in max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1A1918]">Registrar Nuevo Gasto</h3>
                  <p className="text-[11px] text-[#7A7368]">Se deducirá del total ganado para dar la ganancia neta</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalGastoOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#7A7368]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearGastoSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-[#1A1918] block mb-1">
                  Concepto o Descripción del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compra de 10 camisas para inventario"
                  value={nuevoGastoConcepto}
                  onChange={(e) => setNuevoGastoConcepto(e.target.value)}
                  className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#1A1918] block mb-1">
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
                    className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#1A1918] block mb-1">
                    Categoría
                  </label>
                  <select
                    value={nuevoGastoCategoria}
                    onChange={(e) => setNuevoGastoCategoria(e.target.value)}
                    className="w-full bg-[#FAF8F5] px-3 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none"
                  >
                    <option value="Mercancía e Inventario">Mercancía e Inventario</option>
                    <option value="Alquiler y Local">Alquiler y Local</option>
                    <option value="Servicios Básicos">Servicios Básicos</option>
                    <option value="Transporte y Envíos">Transporte y Envíos</option>
                    <option value="Publicidad y Marketing">Publicidad y Marketing</option>
                    <option value="Nómina y Sueldos">Nómina y Sueldos</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Otros Gastos">Otros Gastos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#1A1918] block mb-1">
                  Notas o detalles adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de proveedor, factura o reposición..."
                  value={nuevoGastoNotas}
                  onChange={(e) => setNuevoGastoNotas(e.target.value)}
                  className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalGastoOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-[#7A7368] hover:text-[#1A1918] font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingGasto}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-4 sm:space-y-5 border border-[#E5DFD5] shadow-2xl animate-fade-in max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1A1918]">Registrar Venta Manual (Tienda Física / Caja)</h3>
                  <p className="text-[11px] text-[#7A7368]">Opción exclusiva del panel administrativo para cobros directos</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalVentaManualOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#7A7368] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearVentaManualSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#1A1918] block mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carlos González"
                    value={ventaManualCliente}
                    onChange={(e) => setVentaManualCliente(e.target.value)}
                    className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#1A1918] block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#C59A4D]" />
                    <span>Teléfono (ID del Cliente) *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 6621-2802"
                    value={ventaManualTelefono}
                    onChange={(e) => setVentaManualTelefono(e.target.value)}
                    className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Selector de Método de Pago (Efectivo, Yappy, Transferencia, Abono / Contra Entrega) */}
              <div>
                <label className="font-extrabold text-[#1A1918] block mb-1.5">
                  Método de Pago *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setVentaManualMetodo('efectivo')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      ventaManualMetodo === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-md scale-98'
                        : 'bg-[#FAF8F5] border-[#E5DFD5] text-[#1A1918] hover:border-emerald-500'
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
                        ? 'bg-sky-600 text-white border-sky-600 font-black shadow-md scale-98'
                        : 'bg-[#FAF8F5] border-[#E5DFD5] text-[#1A1918] hover:border-sky-500'
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
                        ? 'bg-[#141312] text-[#E6C687] border-[#141312] font-black shadow-md scale-98'
                        : 'bg-[#FAF8F5] border-[#E5DFD5] text-[#1A1918] hover:border-[#141312]'
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
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-md scale-98'
                        : 'bg-[#FAF8F5] border-[#E5DFD5] text-[#1A1918] hover:border-amber-500'
                    }`}
                  >
                    <span className="text-base">🤝</span>
                    <span className="text-[11px] font-extrabold">Abono / Contra Entrega</span>
                  </button>
                </div>
              </div>

              {/* Opciones de Abono y saldo si se eligió abono_contraentrega */}
              {ventaManualMetodo === 'abono_contraentrega' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                      <span>🤝</span>
                      <span>Configurar Abono Inicial & Saldo Pendiente</span>
                    </span>
                    <span className="text-[10px] text-amber-800 font-bold">
                      Termina de pagar al recibir
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setVentaManualTipoAbono('mitad')}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        ventaManualTipoAbono === 'mitad'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-amber-300 text-slate-700 hover:bg-amber-100/60'
                      }`}
                    >
                      50% (La Mitad)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVentaManualTipoAbono('personalizado')}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        ventaManualTipoAbono === 'personalizado'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-amber-300 text-slate-700 hover:bg-amber-100/60'
                      }`}
                    >
                      Menos / Otro Monto
                    </button>
                    <button
                      type="button"
                      onClick={() => setVentaManualTipoAbono('cero')}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        ventaManualTipoAbono === 'cero'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-amber-300 text-slate-700 hover:bg-amber-100/60'
                      }`}
                    >
                      0% (Contra Entrega Pura)
                    </button>
                  </div>

                  {ventaManualTipoAbono === 'personalizado' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-800 block mb-1">
                        ¿Cuánto abonó el cliente en este momento? ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 15.00"
                        value={ventaManualMontoAbonado}
                        onChange={(e) => setVentaManualMontoAbonado(e.target.value)}
                        className="w-full bg-white px-3.5 py-2 rounded-xl border border-amber-300 focus:outline-none font-black text-sm"
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
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-amber-200">
                        <div>
                          <span className="text-slate-500 text-[10px] block font-bold">Abono Inicial recibido:</span>
                          <strong className="text-slate-900 font-black text-sm">${abonoNum.toFixed(2)} USD</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-900 text-[10px] block font-extrabold">Saldo que pagará al entregar:</span>
                          <strong className="text-rose-700 font-black text-base">${pendiente.toFixed(2)} USD</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Producto Asociado y control de existencias */}
              <div>
                <label className="font-extrabold text-[#1A1918] block mb-1">
                  Producto Asociado (Opcional)
                </label>
                <select
                  value={ventaManualProductoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setVentaManualProductoId(id);
                    setVentaManualVarianteId('');
                    const prod = productos.find((p) => p.id === id);
                    if (prod) {
                      const qty = Math.max(1, parseInt(ventaManualCantidad) || 1);
                      setVentaManualMonto((prod.precio * qty).toFixed(2));
                    }
                  }}
                  className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                >
                  <option value="">Ninguno / Venta libre</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (${p.precio}) - Stock: {p.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              {/* Si hay un producto seleccionado, mostrar detalles de inventario, variantes y cantidad */}
              {(() => {
                const selectedProd = productos.find((p) => p.id === ventaManualProductoId);
                if (!selectedProd) return null;

                const stockActual = selectedProd.stock ?? 0;
                const hasVariantes = Array.isArray(selectedProd.variantes) && selectedProd.variantes.length > 0;

                return (
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1A1918]">Inventario disponible:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                          stockActual <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : stockActual < 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {stockActual} unidades disponibles
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-extrabold text-[#1A1918] block mb-1">
                          Cantidad a vender *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={ventaManualCantidad}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVentaManualCantidad(val);
                            const parsed = parseInt(val) || 1;
                            setVentaManualMonto((selectedProd.precio * Math.max(1, parsed)).toFixed(2));
                          }}
                          className="w-full bg-white px-3 py-2 rounded-xl border border-amber-300 focus:outline-none font-black text-sm"
                        />
                        <span className="text-[10px] text-[#7A7368] mt-0.5 block">
                          Precio unitario: ${selectedProd.precio.toFixed(2)}
                        </span>
                      </div>

                      {hasVariantes && (
                        <div>
                          <label className="font-extrabold text-[#1A1918] block mb-1">
                            Talla / Variante
                          </label>
                          <select
                            value={ventaManualVarianteId}
                            onChange={(e) => setVentaManualVarianteId(e.target.value)}
                            className="w-full bg-white px-3 py-2 rounded-xl border border-amber-300 focus:outline-none text-xs"
                          >
                            <option value="">Estándar / Todas</option>
                            {selectedProd.variantes?.map((v: any) => (
                              <option key={v.id || v.titulo} value={v.id || v.titulo}>
                                {v.titulo || v.nombre} (Stock: {v.stock ?? stockActual})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                      <span>📉</span>
                      <span>Se descontará automáticamente del inventario y del stock del producto al guardar.</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-extrabold text-[#1A1918] block mb-1">
                  Monto Total en USD ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={ventaManualMonto}
                  onChange={(e) => setVentaManualMonto(e.target.value)}
                  className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] font-black text-base"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#1A1918] block mb-1">
                  Notas o detalles de la venta (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de entrega presencial, cambio entregado, tallas entregadas, etc."
                  value={ventaManualNotas}
                  onChange={(e) => setVentaManualNotas(e.target.value)}
                  className="w-full bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalVentaManualOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-[#7A7368] hover:text-[#1A1918] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingVentaManual}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Apertura de Turno de Caja</h3>
                  <p className="text-[11px] text-slate-500">Inicia el turno indicando el fondo en gaveta</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalAbrirCajaOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAbrirCajaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-900 block mb-1.5">
                  Fondo Inicial en Gaveta (Efectivo Base) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="50.00"
                    value={montoAperturaCaja}
                    onChange={(e) => setMontoAperturaCaja(e.target.value)}
                    className="w-full bg-slate-50 pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 font-black text-base text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold">Rápido:</span>
                  {['20.00', '50.00', '100.00'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMontoAperturaCaja(val)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-900 block mb-1">
                  Notas u Observaciones de Apertura (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Turno de la mañana, billetes de $5 y $1..."
                  value={notasAperturaCaja}
                  onChange={(e) => setNotasAperturaCaja(e.target.value)}
                  className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 resize-none text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalAbrirCajaOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCajaSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{isCajaSubmitting ? 'Abriendo...' : 'INICIAR TURNO DE CAJA'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja / Arqueo */}
      {isModalCerrarCajaOpen && sesionCaja && (() => {
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

        const fondoInicial = Number(sesionCaja.monto_inicial) || 0;
        const esperado = fondoInicial + ventasEfectivoTurno - gastosEfectivoTurno;
        const real = parseFloat(montoCierreReal);
        const hasReal = !isNaN(real);
        const diferencia = hasReal ? real - esperado : 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Cierre de Caja & Arqueo</h3>
                    <p className="text-[11px] text-slate-500">Conteo físico de efectivo y cuadre final</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalCerrarCajaOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Resumen esperado del turno */}
              {userRole !== 'cajero' ? (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Fondo Inicial:</span>
                    <strong className="text-slate-900">${fondoInicial.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Ventas Efectivo:</span>
                    <strong>+${ventasEfectivoTurno.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>(-) Gastos del Turno:</span>
                    <strong>-${gastosEfectivoTurno.toFixed(2)}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900">
                    <span>Efectivo Esperado en Gaveta:</span>
                    <span className="text-sm font-black text-emerald-800">${esperado.toFixed(2)} USD</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600">
                  <span>Cuenta el dinero total en efectivo que se encuentra físicamente en la gaveta.</span>
                </div>
              )}

              <form onSubmit={handleCerrarCajaSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-900 block mb-1.5">
                    Dinero Real Contado en Gaveta (Efectivo) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={montoCierreReal}
                      onChange={(e) => setMontoCierreReal(e.target.value)}
                      className="w-full bg-slate-50 pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600 font-black text-base text-slate-900"
                    />
                  </div>

                  {/* Diferencia en tiempo real para Dueño/Admin */}
                  {hasReal && userRole !== 'cajero' && (
                    <div
                      className={`mt-2 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                        Math.abs(diferencia) < 0.01
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : diferencia > 0
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      <span>
                        {Math.abs(diferencia) < 0.01
                          ? '✅ Cuadre Exacto'
                          : diferencia > 0
                          ? '🟢 Sobrante en Gaveta'
                          : '🔴 Faltante en Gaveta'}
                      </span>
                      <span className="font-black">
                        {diferencia >= 0 ? `+$${diferencia.toFixed(2)}` : `-$${Math.abs(diferencia).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-extrabold text-slate-900 block mb-1">
                    Observaciones o Notas de Cierre (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Justificación de billetes, cambio entregado a dueño..."
                    value={notasCierreCaja}
                    onChange={(e) => setNotasCierreCaja(e.target.value)}
                    className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600 resize-none text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalCerrarCajaOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCajaSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isCajaSubmitting ? 'Cerrando...' : 'GUARDAR CIERRE & ARQUEO'}</span>
                  </button>
                </div>
              </form>
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
    </div>
  );
};
