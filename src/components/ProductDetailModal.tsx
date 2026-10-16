import React, { useState } from 'react';
import { Producto } from '../types';
import { X, ShoppingBag, MessageCircle, Check, ChevronLeft, ChevronRight, PackageCheck, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface ProductDetailModalProps {
  producto: Producto | null;
  onClose: () => void;
  onAddToCart: (producto: Producto, cantidad: number, talla?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  producto,
  onClose,
  onAddToCart,
}) => {
  if (!producto) return null;

  const images = producto.imagenes && producto.imagenes.length > 0
    ? producto.imagenes
    : [producto.imagen_url || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80'];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [selectedTalla, setSelectedTalla] = useState<string>('');
  const [added, setAdded] = useState(false);

  // Extract possible sizes from description if present
  const availableSizes: string[] = [];
  if (producto.descripcion) {
    const descLower = producto.descripcion.toLowerCase();
    const commonSizes = ['s', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];
    commonSizes.forEach((sz) => {
      const regex = new RegExp(`\\b${sz}\\b`, 'i');
      if (regex.test(descLower) || descLower.includes(`talla ${sz}`) || descLower.includes(`${sz}:`)) {
        availableSizes.push(sz.toUpperCase());
      }
    });
  }

  const stock = producto.stock ?? 0;
  const isAgotado = stock <= 0;
  const isStockBajo = stock > 0 && stock < 5;

  const handleAdd = () => {
    if (isAgotado) return;
    onAddToCart(producto, cantidad, selectedTalla || undefined);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  const handleWhatsAppDirect = () => {
    const phone = '50766212802';
    const tallaText = selectedTalla ? ` (Talla: ${selectedTalla})` : '';
    const text = `¡Hola AlexStore! 👋 Estoy interesado en el producto: *${producto.nombre}*${tallaText} - Precio: $${producto.precio}. ¿Tienen disponibilidad para entrega inmediata?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm">
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
        <div className="relative w-full max-w-3xl bg-white border border-[#E5DFD5] rounded-3xl shadow-2xl overflow-hidden my-auto animate-fade-in">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#7A7368] hover:text-[#1A1918] flex items-center justify-center border border-[#E5DFD5] shadow-sm transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 p-4 sm:p-6 md:p-8">
            {/* Gallery Column */}
            <div className="space-y-2.5 sm:space-y-3">
              <div className="relative aspect-[4/5] max-h-[340px] sm:max-h-[440px] w-full bg-[#F7F5F0] rounded-2xl overflow-hidden border border-[#EAE6DF] mx-auto">
                <img
                  src={images[activeImageIndex]}
                  alt={producto.nombre}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('unsplash')) {
                      target.src = 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80';
                    }
                  }}
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black backdrop-blur-sm z-10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black backdrop-blur-sm z-10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative w-14 sm:w-16 h-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        i === activeImageIndex ? 'border-[#C59A4D] scale-95 shadow-xs' : 'border-[#EAE6DF] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="flex flex-col justify-between space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {isAgotado ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      Agotado
                    </span>
                  ) : isStockBajo ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Stock Bajo ({stock} unids.)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Disponible ({stock} unids.)
                    </span>
                  )}
                  <span className="text-xs text-[#7A7368] font-bold">AlexStore Oficial</span>
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-[#1A1918] leading-snug font-heading">
                  {producto.nombre}
                </h2>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#C59A4D]">
                    ${producto.precio.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#7A7368] font-semibold">USD</span>
                </div>

                {producto.descripcion && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#EFEAE2] text-xs text-[#5A554D] leading-relaxed max-h-36 overflow-y-auto">
                    {producto.descripcion}
                  </div>
                )}

                {/* Size Selector (if sizes detected or available) */}
                {availableSizes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-[#1A1918] block">Selecciona tu talla:</span>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedTalla(sz)}
                          className={`w-9 h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            selectedTalla === sz
                              ? 'bg-[#141312] text-white shadow-md'
                              : 'bg-white text-[#1A1918] border border-[#DDD7CC] hover:border-[#141312]'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guarantee badge */}
                <div className="flex items-center gap-2 text-xs text-[#7A7368] pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Calidad Premium 1:1 verificada • Entrega garantizada</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleAdd}
                  disabled={isAgotado}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer ${
                    isAgotado
                      ? 'bg-[#EAE5DC] text-[#9C9488] cursor-not-allowed'
                      : added
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#141312] hover:bg-black text-[#F5E6BE]'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>¡AGREGADO A TU BOLSA!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-[#E6C687]" />
                      <span>{isAgotado ? 'AGOTADO' : 'AGREGAR A LA BOLSA'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleWhatsAppDirect}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>CONSULTAR POR WHATSAPP (66212802)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
