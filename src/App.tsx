import { useState, useEffect, useMemo } from 'react';
import { Categoria, Producto, ItemCarrito, UsuarioPanel } from './types';
import { supabase, getCategorias, getProductos } from './lib/supabase';
import { getSavedUserProfile, getPerfilUsuario, cerrarSesion } from './lib/auth';
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
import { LegalModal } from './components/LegalModal';
import { CATEGORIAS_INICIALES } from './data/initialData';
import { Check, X, ArrowUpDown, PackageOpen } from 'lucide-react';
import { isArregloFutbol } from './lib/arregloFutbol';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  // El usuario del panel sale siempre de una sesión real de Supabase (se restaura más abajo),
  // nunca de un perfil guardado en el navegador.
  const [currentUser, setCurrentUser] = useState<UsuarioPanel | null>(null);
  void getSavedUserProfile;

  const [currentView, setCurrentView] = useState<'catalogo' | 'colecciones'>('catalogo');
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_INICIALES);
  // Initialized at 0 as requested ("elimina todos los productos y ponlo desde 0 para que yo los agregue")
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [orden, setOrden] = useState<'categorias' | 'recientes' | 'precio-asc' | 'precio-desc'>('categorias');

  // Drawers & Modals
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'transferencia' | 'yappy' | 'whatsapp'>('transferencia');

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

    // Restaurar sesión de Supabase Auth si existe
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        const perfil = await getPerfilUsuario(session.user.id, session.user.email);
        if (perfil && perfil.activo) {
          setCurrentUser(perfil);
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user?.email) {
        const perfil = await getPerfilUsuario(session.user.id, session.user.email);
        if (perfil && perfil.activo) {
          setCurrentUser(perfil);
        }
      } else if (event === 'SIGNED_OUT') {
        // Al cerrar la sesión de Supabase se cierra el panel para todos los roles.
        setCurrentUser(null);
        setIsAdminMode(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // La tienda solo muestra categorías activas y productos que no estén ocultos en el panel.
  const categoriasVisibles = useMemo(() => categorias.filter((c) => c.activa !== false), [categorias]);
  const productosVisibles = useMemo(() => {
    const inactivas = new Set(categorias.filter((c) => c.activa === false).map((c) => c.id));
    return productos.filter((p) => p.activo !== false && !(p.categoria_id && inactivas.has(p.categoria_id)));
  }, [productos, categorias]);

  // Filtered & Sorted products
  const filteredProductos = useMemo(() => {
    // Posición de cada categoría según el orden elegido en el panel
    const posCategoria: Record<string, number> = {};
    categorias.forEach((c, i) => {
      posCategoria[c.id] = i;
    });
    const pos = (p: Producto) => (p.categoria_id && posCategoria[p.categoria_id] !== undefined ? posCategoria[p.categoria_id] : 9999);

    return productosVisibles
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
        if (orden === 'categorias') return pos(a) - pos(b);
        return 0;
      });
  }, [productosVisibles, categorias, categoriaSeleccionada, searchQuery, orden]);

  // Counts per category
  const countsPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    categorias.forEach((c) => {
      counts[c.id] = 0;
    });

    productosVisibles.forEach((p) => {
      if (p.categoria_id && counts[p.categoria_id] !== undefined) {
        counts[p.categoria_id]++;
      }
    });

    return counts;
  }, [categorias, productosVisibles]);

  // Cart operations con soporte para variantes y opciones
  const handleAddToCart = (
    producto: Producto,
    cantidad = 1,
    talla?: string,
    opcionesSeleccionadas?: Record<string, string>,
    varianteSeleccionada?: any
  ) => {
    if (isArregloFutbol(undefined, producto, categorias)) {
      setToastMessage('Los arreglos y servicios no se piden en la bolsa; se coordinan directamente por WhatsApp.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const unitPrice = Number(varianteSeleccionada?.precio) || Number(producto.precio) || 0;
    const variantLabel =
      varianteSeleccionada?.titulo ||
      (opcionesSeleccionadas ? Object.entries(opcionesSeleccionadas).map(([k, v]) => `${k}: ${v}`).join(' / ') : talla);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => {
        if (item.producto.id !== producto.id) return false;
        if (varianteSeleccionada?.id && item.varianteSeleccionada?.id) {
          return item.varianteSeleccionada.id === varianteSeleccionada.id;
        }
        if (opcionesSeleccionadas && item.opcionesSeleccionadas) {
          return JSON.stringify(item.opcionesSeleccionadas) === JSON.stringify(opcionesSeleccionadas);
        }
        return item.tallaSeleccionada === talla;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].cantidad += cantidad;
        return updated;
      }

      return [
        ...prev,
        {
          producto,
          cantidad,
          tallaSeleccionada: talla || opcionesSeleccionadas?.['Talla'] || opcionesSeleccionadas?.['talla'] || (opcionesSeleccionadas ? Object.values(opcionesSeleccionadas).join(' / ') : undefined),
          colorSeleccionado: opcionesSeleccionadas?.['Color'] || opcionesSeleccionadas?.['color'],
          opcionesSeleccionadas,
          varianteSeleccionada,
          precioUnitario: unitPrice,
        },
      ];
    });

    setToastMessage(`Agregado a la bolsa: ${producto.nombre}${variantLabel ? ` (${variantLabel})` : ''}`);
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

  const handleOpenAdmin = async () => {
    if (currentUser && currentUser.activo) {
      setIsAdminMode(true);
      return;
    }
    // Un perfil guardado en el navegador no basta: se confirma la sesión con Supabase.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const perfil = await getPerfilUsuario(session.user.id, session.user.email);
        if (perfil && perfil.activo) {
          setCurrentUser(perfil);
          setIsAdminMode(true);
          return;
        }
      }
    } catch {
      // Sin sesión válida: se pide iniciar sesión.
    }
    {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = (userProfile: UsuarioPanel) => {
    try {
      localStorage.setItem('alexstore_auth_profile', JSON.stringify(userProfile));
      localStorage.setItem('alexstore_active_role', userProfile.rol);
    } catch {}
    setCurrentUser(userProfile);
    setIsAdminLoginOpen(false);
    setIsAdminMode(true);
  };

  const handleLogout = async () => {
    await cerrarSesion();
    setCurrentUser(null);
    setIsAdminMode(false);
    loadData();
  };

  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.cantidad, 0);

  // If Admin Mode is active, render full AdminPanel with dynamic role protection
  if (isAdminMode) {
    return (
      <AdminPanel
        currentUser={currentUser}
        onExitAdmin={() => {
          setIsAdminMode(false);
          loadData();
        }}
        onLogout={handleLogout}
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
        onOpenAdminLogin={handleOpenAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        {currentView === 'colecciones' ? (
          /* View 2: Colecciones AlexStore (Image 3) */
          <ColeccionesView
            categorias={categoriasVisibles}
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
              categorias={categoriasVisibles}
              categoriaSeleccionada={categoriaSeleccionada}
              onSelectCategoria={setCategoriaSeleccionada}
              countsPorCategoria={countsPorCategoria}
              totalCount={productosVisibles.length}
            />

            {/* Sub-bar: Mostrando X artículos & Ordenar por (Image 1) */}
            <div className="mx-3 sm:mx-6 lg:mx-8 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-[#7A7368] pt-1">
              <div>
                Mostrando <strong className="text-[#1A1918] font-black">{filteredProductos.length}</strong> artículos disponibles
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9C9488]" />
                <span className="text-xs">Ordenar por:</span>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as any)}
                  className="bg-transparent font-extrabold text-xs text-[#1A1918] cursor-pointer focus:outline-none"
                >
                  <option value="categorias">Por categoría</option>
                  <option value="recientes">Más recientes</option>
                  <option value="precio-asc">Menor precio</option>
                  <option value="precio-desc">Mayor precio</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <div className="mx-3 sm:mx-6 lg:mx-8">
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#C59A4D] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#7A7368] font-semibold">Cargando catálogo en vivo...</p>
                </div>
              ) : filteredProductos.length === 0 ? (
                /* Empty state when 0 products exist (from scratch) */
                <div className="py-14 sm:py-20 text-center space-y-4 bg-white rounded-3xl border border-[#EAE5DC] p-5 sm:p-8 shadow-xs">
                  <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-3xl bg-[#FAF8F5] text-[#C59A4D] flex items-center justify-center mx-auto border border-[#EAE5DC]">
                    <PackageOpen className="w-7 sm:w-8 h-7 sm:h-8 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#1A1918]">Catálogo listo para cargar</h3>
                    <p className="text-xs sm:text-sm text-[#7A7368] max-w-md mx-auto leading-relaxed">
                      El catálogo está en 0 para que agregues tus propios productos e inventario.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
                  {filteredProductos.map((producto) => (
                    <ProductCard
                      key={producto.id}
                      producto={producto}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onOpenDetail={setSelectedProduct}
                      categorias={categorias}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          producto={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          categorias={categorias}
        />
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
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
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cartItems}
          onOrderCompleted={handleClearCart}
          initialMethod={checkoutMethod}
        />
      )}

      {/* Admin Login Modal (Triggered by 10 fast clicks on logo) */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

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
      <Footer
        onWhatsAppContact={handleWhatsAppContact}
        onOpenAdminLogin={handleOpenAdmin}
      />

      {/* Términos y Privacidad (se abren con #terminos y #privacidad) */}
      <LegalModal />
    </div>
  );
}
