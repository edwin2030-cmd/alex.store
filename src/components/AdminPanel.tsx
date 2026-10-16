import React, { useState, useEffect } from 'react';
import { AlexStoreLogo } from './AlexStoreLogo';
import { Categoria, Producto, Pedido, Venta } from '../types';
import {
  getProductos,
  getCategorias,
  getPedidos,
  getVentas,
  eliminarProducto,
  eliminarCategoria,
  actualizarStockRapido,
  actualizarEstadoPedido,
  crearVentaManual,
} from '../lib/supabase';
import { ModalNuevoProducto } from './ModalNuevoProducto';
import { ModalNuevaCategoria } from './ModalNuevaCategoria';
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
} from 'lucide-react';

interface AdminPanelProps {
  onExitAdmin: () => void;
  adminEmail: string;
}

type AdminSection =
  | 'dashboard'
  | 'pedidos'
  | 'ventas'
  | 'productos'
  | 'categorias'
  | 'inventario';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onExitAdmin,
  adminEmail,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalProductoOpen, setIsModalProductoOpen] = useState(false);
  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);

  const [isModalCategoriaOpen, setIsModalCategoriaOpen] = useState(false);
  const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);

  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Filters inside sections
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  const [pedidoFilter, setPedidoFilter] = useState<'todos' | 'pendientes' | 'aprobados' | 'entregados' | 'cancelados'>('todos');
  const [inventarioFilter, setInventarioFilter] = useState<'todos' | 'disponibles' | 'stock-bajo' | 'agotados'>('todos');

  const reloadAllData = async () => {
    setLoading(true);
    try {
      const [prods, cats, peds, vnts] = await Promise.all([
        getProductos(),
        getCategorias(),
        getPedidos(),
        getVentas(),
      ]);
      setProductos(prods);
      setCategorias(cats);
      setPedidos(peds);
      setVentas(vnts);
    } catch (e) {
      console.error("Error cargando panel admin:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAllData();
  }, []);

  // Stats calculation
  const totalProductos = productos.length;
  const activosVisibles = productos.filter((p) => p.activo).length;
  const totalCategorias = categorias.length;
  const stockBajoCount = productos.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).length;
  const agotadosCount = productos.filter((p) => (p.stock ?? 0) <= 0).length;

  const ingresosTotales = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
  const pedidosAprobados = pedidos.filter((p) => p.estado === 'aprobado' || p.estado === 'entregado').length;
  const volumenTotalPedidos = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);

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
    await actualizarStockRapido(prodId, nextStock);
    setProductos((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, stock: nextStock } : p))
    );
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: 'pendiente' | 'aprobado' | 'entregado' | 'cancelado'
  ) => {
    await actualizarEstadoPedido(orderId, newStatus);
    setPedidos((prev) =>
      prev.map((p) => (p.id === orderId ? { ...p, estado: newStatus } : p))
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#1A1918] flex flex-col md:flex-row font-sans">
      {/* Mobile Top Navigation (for phones and small tablets) */}
      <div className="md:hidden bg-[#0F0E0D] text-white border-b border-[#26221E] sticky top-0 z-30">
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlexStoreLogo size="sm" />
            <div>
              <span className="font-extrabold text-base text-white leading-none block">
                Alex<span className="text-[#C59A4D]">Store</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#8C8375]">
                PANEL ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={onExitAdmin}
            className="px-3 py-1.5 rounded-xl bg-[#26221E] text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tienda</span>
          </button>
        </div>

        {/* Scrollable menu tabs on mobile */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
            { id: 'pedidos' as const, label: 'Pedidos', icon: Receipt, badge: pedidosPendientes },
            { id: 'ventas' as const, label: 'Ventas', icon: TrendingUp, badge: 0 },
            { id: 'productos' as const, label: 'Productos', icon: Package, badge: 0 },
            { id: 'categorias' as const, label: 'Categorías', icon: Layers, badge: 0 },
            { id: 'inventario' as const, label: 'Inventario', icon: Boxes, badge: 0 },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#C59A4D] text-[#141312] shadow-sm'
                    : 'bg-[#1C1A17] text-[#A69F93] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop/Tablet Sidebar (Left Column - Images 2, 3, 4, 5, 6, 7) */}
      <aside className="hidden md:flex w-64 bg-[#0F0E0D] text-white flex-col justify-between p-5 border-r border-[#26221E] shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <AlexStoreLogo size="md" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-white tracking-tight leading-none">
                Alex<span className="text-[#C59A4D]">Store</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#8C8375] mt-1">
                CATÁLOGO OFICIAL
              </span>
            </div>
          </div>

          {/* Admin Profile Box */}
          <div className="p-3 rounded-2xl bg-[#1A1816] border border-[#2D2822] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#26221E] text-[#C59A4D] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-white block truncate">
                Administrador
              </span>
              <span className="text-[10px] text-[#A69F93] flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ROL: ADMIN
              </span>
            </div>
          </div>

          {/* Menu Sections */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6E685F] px-3 block mb-2">
              MENÚ ALEXSTORE
            </span>

            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm'
                  : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#C59A4D]" />
              <span>DASHBOARD</span>
            </button>

            <button
              onClick={() => setActiveSection('pedidos')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'pedidos'
                  ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm'
                  : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
              }`}
            >
              <Receipt className="w-4 h-4 text-[#C59A4D]" />
              <div className="flex-1 flex items-center justify-between">
                <span>PEDIDOS & COMPROBANTES</span>
                {pedidosPendientes > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    {pedidosPendientes}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveSection('ventas')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'ventas'
                  ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm'
                  : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-[#C59A4D]" />
              <span>VENTAS & FACTURACIÓN</span>
            </button>

            <button
              onClick={() => setActiveSection('productos')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'productos'
                  ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm'
                  : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
              }`}
            >
              <Package className="w-4 h-4 text-[#C59A4D]" />
              <span>PRODUCTOS</span>
            </button>

            <button
              onClick={() => setActiveSection('categorias')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'categorias'
                  ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm'
                  : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
              }`}
            >
              <Layers className="w-4 h-4 text-[#C59A4D]" />
              <span>CATEGORÍAS</span>
            </button>

            <button
              onClick={() => setActiveSection('inventario')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'inventario'
                  ? 'bg-[#1C1A17] text-white border border-[#C59A4D]/40 shadow-sm'
                  : 'text-[#8C8375] hover:text-white hover:bg-[#1A1816]'
              }`}
            >
              <Boxes className="w-4 h-4 text-[#C59A4D]" />
              <span>INVENTARIO</span>
            </button>
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
              Ver Catálogo Público
            </span>
            <span className="text-[10px] bg-[#26221E] px-2 py-0.5 rounded-md font-mono">
              Web
            </span>
          </button>

          <button
            onClick={onExitAdmin}
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
        <header className="bg-white border-b border-[#E5E9EE] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1A1918] font-heading capitalize leading-tight">
              {activeSection === 'dashboard' && 'Dashboard'}
              {activeSection === 'pedidos' && 'Gestión de Pedidos & Comprobantes'}
              {activeSection === 'ventas' && 'Módulo de Ventas & Facturación'}
              {activeSection === 'productos' && 'Gestión de Productos'}
              {activeSection === 'categorias' && 'Gestión de Categorías'}
              {activeSection === 'inventario' && 'Control de Inventario'}
            </h1>
            <p className="text-xs text-[#7A7368] mt-0.5">
              {activeSection === 'dashboard' && 'Control general del catálogo, stock y almacenamiento'}
              {activeSection === 'pedidos' && 'Verifica comprobantes de pago por Yappy y Transferencias, y aprueba compras'}
              {activeSection === 'ventas' && 'Ventas web aprobadas y registro de ventas manuales de mostrador'}
              {activeSection === 'productos' && 'Administra catálogo, precios, fotos e inventario en public.productos'}
              {activeSection === 'categorias' && 'Crea y edita categorías en public.categorias'}
              {activeSection === 'inventario' && 'Monitorea existencias, alertas de stock mínimo y reposición en public.inventario'}
            </p>
          </div>

          <button
            onClick={onExitAdmin}
            className="px-4 py-2 rounded-xl border border-[#D5DCE4] hover:bg-[#F4F6F8] text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C59A4D]" />
            <span>VER CATÁLOGO</span>
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 space-y-6">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Productos */}
                <div
                  onClick={() => setActiveSection('productos')}
                  className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs hover:border-[#C59A4D]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      TOTAL PRODUCTOS
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-3xl font-black text-[#1A1918]">{totalProductos}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#C59A4D]">Ver catálogo completo →</span>
                </div>

                {/* 2. Activos Visibles */}
                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      ACTIVOS (VISIBLES)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-3xl font-black text-[#1A1918]">{activosVisibles}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {totalProductos > 0 ? Math.round((activosVisibles / totalProductos) * 100) : 100}% del total
                  </span>
                </div>

                {/* 3. Categorías */}
                <div
                  onClick={() => setActiveSection('categorias')}
                  className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs hover:border-[#C59A4D]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      CATEGORÍAS
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#C59A4D]">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-3xl font-black text-[#1A1918]">{totalCategorias}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#C59A4D]">Gestionar categorías →</span>
                </div>

                {/* 4. Stock Bajo */}
                <div
                  onClick={() => {
                    setInventarioFilter('stock-bajo');
                    setActiveSection('inventario');
                  }}
                  className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      STOCK BAJO
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-3xl font-black text-amber-600">{stockBajoCount}</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700">Requieren reposición</span>
                </div>

                {/* 5. Agotados */}
                <div
                  onClick={() => {
                    setInventarioFilter('agotados');
                    setActiveSection('inventario');
                  }}
                  className="bg-white rounded-3xl p-5 border border-[#E5E9EE] shadow-xs hover:border-rose-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A7368]">
                      AGOTADOS
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-3xl font-black text-rose-600">{agotadosCount}</span>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700">Sin existencias (0)</span>
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
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">INGRESOS TOTALES</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1A1918] block my-2">${ingresosTotales}</span>
                  <span className="text-[11px] font-bold text-emerald-600">Acumulado histórico</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">VENTAS ESTE MES</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1A1918] block my-2">${ingresosTotales}</span>
                  <span className="text-[11px] text-[#7A7368]">{ventas.length} transacciones</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">TOTAL TRANSACCIONES</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1A1918] block my-2">{ventas.length}</span>
                  <span className="text-[11px] text-[#7A7368]">Web + Manuales</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E5E9EE]">
                  <span className="text-[10px] font-black uppercase text-[#7A7368] block">TICKET PROMEDIO</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#C59A4D] block my-2">
                    ${ventas.length > 0 ? Math.round(ingresosTotales / ventas.length) : 0}
                  </span>
                  <span className="text-[11px] text-[#7A7368]">Por cada venta</span>
                </div>
              </div>

              {/* Filters bar */}
              <div className="bg-white rounded-3xl p-4 border border-[#E5E9EE] flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8375]" />
                  <input
                    type="text"
                    placeholder="Buscar venta, cliente o código..."
                    className="w-full bg-[#FAF8F5] text-xs px-10 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3.5 py-1.5 rounded-xl bg-[#141312] text-white text-xs font-bold">
                    Todas ({ventas.length})
                  </button>
                  <button className="px-3.5 py-1.5 rounded-xl bg-[#F4F6F8] text-[#1A1918] text-xs font-bold">
                    Web Aprobadas
                  </button>
                  <button className="px-3.5 py-1.5 rounded-xl bg-[#F4F6F8] text-[#1A1918] text-xs font-bold">
                    Manuales
                  </button>
                  <button
                    onClick={reloadAllData}
                    className="p-2 rounded-xl border border-[#D5DCE4] text-[#1A1918]"
                    title="Recargar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      const cliente = prompt('Nombre del cliente:');
                      if (!cliente) return;
                      const monto = prompt('Monto total ($):', '50');
                      if (!monto) return;
                      await crearVentaManual({
                        cliente_nombre: cliente,
                        metodo_pago: 'efectivo',
                        total: parseFloat(monto) || 50,
                        items: [],
                        tipo: 'manual',
                      });
                      await reloadAllData();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black uppercase tracking-wider"
                  >
                    + REGISTRAR VENTA MANUAL
                  </button>
                </div>
              </div>

              {/* Empty state or table (Image 3) */}
              <div className="bg-white rounded-3xl p-12 border border-[#E5E9EE] text-center space-y-3">
                <TrendingUp className="w-10 h-10 mx-auto text-[#C9BFB0]" />
                <h3 className="font-extrabold text-[#1A1918]">
                  {ventas.length === 0 ? 'No se encontraron ventas registradas' : `${ventas.length} ventas en registro`}
                </h3>
                <p className="text-xs text-[#7A7368] max-w-md mx-auto">
                  Puedes aprobar pedidos web verificados o pulsar en &quot;Registrar Venta Manual&quot; para añadir ventas directas por mostrador o chat.
                </p>
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

              {/* Order Cards List (Image 4) */}
              <div className="space-y-4">
                {pedidos
                  .filter((p) => {
                    if (pedidoFilter === 'pendientes' && p.estado !== 'pendiente') return false;
                    if (pedidoFilter === 'aprobados' && p.estado !== 'aprobado') return false;
                    if (pedidoFilter === 'entregados' && p.estado !== 'entregado') return false;
                    if (pedidoFilter === 'cancelados' && p.estado !== 'cancelado') return false;
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
                      className="bg-white rounded-3xl p-6 border border-[#E5E9EE] shadow-xs space-y-4"
                    >
                      {/* Order Header bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0EAE1] gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center font-black text-xs">
                            ALX
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-[#1A1918]">{pedido.codigo}</span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  pedido.estado === 'pendiente'
                                    ? 'bg-amber-100 text-amber-900'
                                    : pedido.estado === 'aprobado'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : pedido.estado === 'entregado'
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-rose-100 text-rose-900'
                                }`}
                              >
                                {pedido.estado}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#7A7368]">
                              {pedido.creado_en ? new Date(pedido.creado_en).toLocaleString('es-PA') : 'Reciente'}
                            </span>
                          </div>
                        </div>

                        {/* Status selector */}
                        <div className="flex items-center gap-3">
                          <select
                            value={pedido.estado}
                            onChange={(e) =>
                              handleUpdateOrderStatus(pedido.id || '', e.target.value as any)
                            }
                            className="bg-[#FAF8F5] text-xs font-bold text-[#1A1918] px-3.5 py-2 rounded-xl border border-[#E5DFD5] focus:outline-none"
                          >
                            <option value="pendiente">Estado: Pendiente</option>
                            <option value="aprobado">Estado: Aprobado</option>
                            <option value="entregado">Estado: Entregado</option>
                            <option value="cancelado">Estado: Cancelado</option>
                          </select>
                        </div>
                      </div>

                      {/* 3 Columns details (Image 4) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
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
                              className="p-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
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
                        </div>

                        {/* Col 2: Pago & Comprobante */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#9C9488]">
                              PAGO & COMPROBANTE
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#141312] text-white text-[9px] font-black uppercase">
                              {pedido.metodo_pago}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-[#7A7368]">Monto Total:</span>
                            <span className="text-xl font-black text-[#1A1918]">${pedido.total}</span>
                          </div>

                          {pedido.comprobante_url ? (
                            <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC]">
                              <img
                                src={pedido.comprobante_url}
                                alt="Comprobante"
                                className="w-10 h-10 object-cover rounded-lg border border-[#D5CEC2]"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-[#1A1918] block truncate">Comprobante Adjunto</span>
                                <span className="text-[10px] text-emerald-600 font-semibold">Listo para verificar</span>
                              </div>
                              <button
                                onClick={() => setViewingProofUrl(pedido.comprobante_url || null)}
                                className="px-2.5 py-1 rounded-lg bg-[#141312] text-white text-[10px] font-bold flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ver</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#9C9488] block italic">
                              Sin comprobante adjunto
                            </span>
                          )}
                        </div>

                        {/* Col 3: Productos del Pedido */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-[#9C9488] block">
                            PRODUCTOS DEL PEDIDO ({pedido.items?.length || 0})
                          </span>

                          <div className="space-y-2">
                            {pedido.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 truncate">
                                  {it.imagen_url && (
                                    <img
                                      src={it.imagen_url}
                                      alt=""
                                      className="w-7 h-8 object-cover rounded bg-white border border-[#EAE5DC] shrink-0"
                                    />
                                  )}
                                  <span className="font-semibold text-[#1A1918] truncate">
                                    {it.nombre} <span className="text-[#8C8375]">x{it.cantidad}</span>
                                  </span>
                                </div>
                                <span className="font-bold text-[#1A1918] shrink-0">
                                  ${it.precio * it.cantidad}
                                </span>
                              </div>
                            ))}
                          </div>
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
                  <table className="w-full text-left text-xs">
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
                <table className="w-full text-left text-xs">
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

                <div className="flex items-center gap-2">
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
                <table className="w-full text-left text-xs">
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
                                className="px-3 py-1.5 rounded-xl border border-[#E5DFD5] text-[#1A1918] hover:bg-slate-100 font-bold text-xs inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
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
          )}
        </main>
      </div>

      {/* Proof image zoom modal */}
      {viewingProofUrl && (
        <div
          onClick={() => setViewingProofUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-xl max-h-[90vh] bg-white rounded-3xl p-4 overflow-hidden">
            <button
              onClick={() => setViewingProofUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={viewingProofUrl} alt="Comprobante completo" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

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
    </div>
  );
};
