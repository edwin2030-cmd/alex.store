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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white border border-[#E5DFD5] rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-[#F0EAE1] text-[#7A7368] hover:text-[#1A1918] flex items-center justify-center border border-[#E5DFD5] transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Gallery Column */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] bg-[#F7F5F0] rounded-2xl overflow-hidden border border-[#EAE6DF]">
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black backdrop-blur-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activeImageIndex ? 'border-[#C59A4D] scale-95' : 'border-[#EAE6DF] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
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

              <h2 className="text-xl sm:text-2xl font-black text-[#1A1918] leading-tight font-heading">
                {producto.nombre}
              </h2>

              <div className="text-2xl sm:text-3xl font-black text-[#C59A4D]">
                ${producto.precio.toFixed(2)}
              </div>

              {producto.descripcion && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE6DD] text-xs sm:text-sm text-[#4A453E] whitespace-pre-line leading-relaxed">
                  <span className="font-bold text-[#1A1918] block mb-1">Detalles del producto:</span>
                  {producto.descripcion}
                </div>
              )}

              {/* Sizes if detected */}
              {availableSizes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-[#7A7368] uppercase tracking-wider block">
                    Seleccionar Talla:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedTalla(sz)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedTalla === sz
                            ? 'bg-[#141312] text-white border-[#141312]'
                            : 'bg-[#FAF8F5] text-[#1A1918] border-[#E5DFD5] hover:border-[#C59A4D]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-[#7A7368] uppercase tracking-wider">Cantidad:</span>
                <div className="flex items-center rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] overflow-hidden">
                  <button
                    onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1 text-[#7A7368] hover:text-[#1A1918] text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-extrabold text-[#1A1918]">{cantidad}</span>
                  <button
                    onClick={() => setCantidad((prev) => prev + 1)}
                    className="px-3 py-1 text-[#7A7368] hover:text-[#1A1918] text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-4 border-t border-[#F0EAE1]">
              <button
                onClick={handleAdd}
                disabled={isAgotado}
                className={`w-full py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md ${
                  isAgotado
                    ? 'bg-[#EAE5DC] text-[#9C9488] cursor-not-allowed'
                    : added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#141312] hover:bg-black text-[#F5E6BE] active:scale-98'
                }`}
              >
                {isAgotado ? (
                  <span>Producto Agotado</span>
                ) : added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Agregado a la bolsa!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Añadir a la bolsa (${(producto.precio * cantidad).toFixed(2)})</span>
                  </>
                )}
              </button>

              <button
                onClick={handleWhatsAppDirect}
                className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 fill-current" />
                <span>Pedir o Consultar por WhatsApp</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8C8375] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Calidad 1:1 garantizada y entrega oficial AlexStore</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
