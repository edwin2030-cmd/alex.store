import { useState, useEffect, useMemo } from 'react';
import { Categoria, Producto, ItemCarrito } from './types';
import { getCategorias, getProductos } from './lib/supabase';
import { Header } from './components/Header';
import { Banner } from './components/Banner';
import { CategoryFilter } from './components/CategoryFilter';
import { ColeccionesView } from './components/ColeccionesView';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanel } from './components/AdminPanel';
import { Footer } from './components/Footer';
import { CATEGORIAS_INICIALES } from './data/initialData';
import { Check, X, ArrowUpDown, PackageOpen, Plus } from 'lucide-react';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@alexmstore.com');

  const [currentView, setCurrentView] = useState<'catalogo' | 'colecciones'>('catalogo');
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_INICIALES);
  // Initialized at 0 as requested ("elimina todos los productos y ponlo desde 0 para que yo los agregue")
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [orden, setOrden] = useState<'recientes' | 'precio-asc' | 'precio-desc'>('recientes');

  // Drawers & Modals
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'transferencia' | 'yappy'>('transferencia');

  // Toast notification (Image 4 bottom)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cart state persisted in localStorage
  const [cartItems, setCartItems] = useState<ItemCarrito[]>(() => {
    try {
      const saved = localStorage.getItem('alexstore_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('alexstore_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn("Error guardando carrito:", e);
    }
  }, [cartItems]);

  // Load categories and products directly from Supabase
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, prods] = await Promise.all([getCategorias(), getProductos()]);
      if (cats && cats.length > 0) setCategorias(cats);
      setProductos(prods || []);
    } catch (err) {
      console.warn("Aviso al consultar Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & Sorted products
  const filteredProductos = useMemo(() => {
    return productos
      .filter((p) => {
        // Category filter
        if (categoriaSeleccionada && p.categoria_id !== categoriaSeleccionada) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchName = p.nombre.toLowerCase().includes(query);
          const matchDesc = p.descripcion?.toLowerCase().includes(query) ?? false;
          if (!matchName && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (orden === 'precio-asc') return a.precio - b.precio;
        if (orden === 'precio-desc') return b.precio - a.precio;
        return 0;
      });
  }, [productos, categoriaSeleccionada, searchQuery, orden]);

  // Counts per category
  const countsPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    categorias.forEach((c) => {
      counts[c.id] = 0;
    });

    productos.forEach((p) => {
      if (p.categoria_id && counts[p.categoria_id] !== undefined) {
        counts[p.categoria_id]++;
      }
    });

    return counts;
  }, [categorias, productos]);

  // Cart operations
  const handleAddToCart = (producto: Producto, cantidad = 1, talla?: string) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.producto.id === producto.id && item.tallaSeleccionada === talla
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].cantidad += cantidad;
        return updated;
      }
      return [...prev, { producto, cantidad, tallaSeleccionada: talla }];
    });

    setToastMessage(`Agregado a la bolsa: ${producto.nombre}`);
    setTimeout(() => {
      setToastMessage((cur) => (cur?.includes(producto.nombre) ? null : cur));
    }, 3500);
  };

  const handleUpdateCantidad = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].cantidad + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].cantidad = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleWhatsAppContact = () => {
    const phone = '50766212802';
    const text = '¡Hola AlexStore! 👋 Estuve viendo su catálogo oficial y me gustaría consultar disponibilidad de camisetas.';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSelectCollection = (catId: string) => {
    setCategoriaSeleccionada(catId);
    setCurrentView('catalogo');
  };

  const handleLoginSuccess = (email: string) => {
    setAdminEmail(email);
    setIsAdminLoginOpen(false);
    setIsAdminMode(true);
  };

  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.cantidad, 0);

  // If Admin Mode is active, render full AdminPanel (Images 2, 3, 4, 5, 6, 7)
  if (isAdminMode) {
    return (
      <AdminPanel
        adminEmail={adminEmail}
        onExitAdmin={() => {
          setIsAdminMode(false);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        currentView={currentView}
        onViewChange={(v) => {
          setCurrentView(v);
          if (v === 'catalogo' && !categoriaSeleccionada) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          if (currentView !== 'catalogo') setCurrentView('catalogo');
        }}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        {currentView === 'colecciones' ? (
          /* View 2: Colecciones AlexStore (Image 3) */
          <ColeccionesView
            categorias={categorias}
            countsPorCategoria={countsPorCategoria}
            onSelectCollection={handleSelectCollection}
            onGoToCatalogo={() => {
              setCategoriaSeleccionada(null);
              setCurrentView('catalogo');
            }}
          />
        ) : (
          /* View 1: Catálogo Principal (Image 1) */
          <>
            {/* Hero Banner */}
            <Banner />

            {/* Category Filter Pills (Image 1) */}
            <CategoryFilter
              categorias={categorias}
              categoriaSeleccionada={categoriaSeleccionada}
              onSelectCategoria={setCategoriaSeleccionada}
              countsPorCategoria={countsPorCategoria}
              totalCount={productos.length}
            />

            {/* Sub-bar: Mostrando X artículos & Ordenar por (Image 1) */}
            <div className="mx-4 sm:mx-6 lg:mx-8 mb-6 flex items-center justify-between text-xs sm:text-sm text-[#7A7368] pt-1">
              <div>
                Mostrando <strong className="text-[#1A1918] font-black">{filteredProductos.length}</strong> artículos disponibles
              </div>

              <div className="flex items-center gap-1.5 cursor-pointer">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9C9488]" />
                <span>Ordenar por:</span>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as any)}
                  className="bg-transparent font-extrabold text-[#1A1918] cursor-pointer focus:outline-none"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="precio-asc">Menor precio</option>
                  <option value="precio-desc">Mayor precio</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <div className="mx-4 sm:mx-6 lg:mx-8">
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#C59A4D] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#7A7368] font-semibold">Cargando catálogo en vivo...</p>
                </div>
              ) : filteredProductos.length === 0 ? (
                /* Empty state when 0 products exist (from scratch) */
                <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-[#EAE5DC] p-8 shadow-xs">
                  <div className="w-16 h-16 rounded-3xl bg-[#FAF8F5] text-[#C59A4D] flex items-center justify-center mx-auto border border-[#EAE5DC]">
                    <PackageOpen className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-[#1A1918]">Catálogo listo para cargar</h3>
                    <p className="text-xs sm:text-sm text-[#7A7368] max-w-md mx-auto leading-relaxed">
                      El catálogo está en 0 para que agregues tus propios productos e inventario.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => setIsAdminLoginOpen(true)}
                      className="px-6 py-3 rounded-full bg-[#141312] hover:bg-black text-[#F5E6BE] font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-[#C59A4D]" />
                      <span>Ingresar al Modo Administrador</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#A69F93]">
                    Tip: También puedes hacer <strong>5 clics rápidos en el logo</strong> de AlexStore para acceder.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-6">
                  {filteredProductos.map((producto) => (
                    <ProductCard
                      key={producto.id}
                      producto={producto}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onOpenDetail={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        producto={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateCantidad={handleUpdateCantidad}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={(method) => {
          if (method) setCheckoutMethod(method);
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderCompleted={handleClearCart}
        initialMethod={checkoutMethod}
      />

      {/* Admin Login Modal (Image 1 - triggered by 5 fast clicks on logo) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Toast Notification (Image 4 bottom) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in max-w-md w-[90%] sm:w-auto">
          <div className="bg-[#0D3826] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <span className="truncate">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer onWhatsAppContact={handleWhatsAppContact} />
    </div>
  );
}
