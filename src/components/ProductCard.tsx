import React, { useState } from 'react';
import { Producto } from '../types';
import { ShoppingBag, Check, ChevronLeft, ChevronRight, Eye, PackageCheck, AlertTriangle, XCircle } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
  onAddToCart: (producto: Producto) => void;
  onOpenDetail: (producto: Producto) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  onAddToCart,
  onOpenDetail,
}) => {
  const images = producto.imagenes && producto.imagenes.length > 0
    ? producto.imagenes
    : [producto.imagen_url || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80'];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const stock = producto.stock ?? 0;
  const isAgotado = stock <= 0;
  const isStockBajo = stock > 0 && stock < 5;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAgotado) return;
    onAddToCart(producto);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      onClick={() => onOpenDetail(producto)}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-[#EAE6DF] hover:border-[#C59A4D]/70 transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-xl cursor-pointer"
    >
      {/* Image container */}
      <div className="relative aspect-[4/5] bg-[#F7F5F0] overflow-hidden">
        <img
          src={images[activeImageIndex]}
          alt={producto.nombre}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('unsplash')) {
              target.src = 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80';
            }
          }}
        />

        {/* Stock Badge - Strict: "Disponible", "Stock Bajo", "Agotado" */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
          {isAgotado ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-600 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Agotado</span>
            </span>
          ) : isStockBajo ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Stock Bajo ({stock})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-600 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <PackageCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Disponible ({stock})</span>
            </span>
          )}
        </div>

        {/* Multi-image carousel controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label="Foto anterior"
              className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={nextImage}
              aria-label="Foto siguiente"
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm z-10">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all ${
                    idx === activeImageIndex ? 'bg-[#F5E6BE] w-2.5 sm:w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick View Button overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1.5 rounded-full bg-white/95 text-[#1A1918] text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <Eye className="w-3.5 h-3.5 text-[#C59A4D]" />
            Ver detalles
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
        <div>
          <h3 className="font-bold text-[#1A1918] text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-[#C59A4D] transition-colors">
            {producto.nombre}
          </h3>

          {producto.descripcion && (
            <p className="text-[11px] sm:text-xs text-[#7A7368] mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed">
              {producto.descripcion}
            </p>
          )}
        </div>

        <div className="pt-2 sm:pt-3 border-t border-[#F2ECE1] flex items-center justify-between gap-1 sm:gap-2">
          <div>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#9C9488] block">Precio</span>
            <span className="text-base sm:text-xl font-black text-[#C59A4D]">
              ${producto.precio.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleAdd}
            disabled={isAgotado}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all uppercase cursor-pointer ${
              isAgotado
                ? 'bg-[#EAE5DC] text-[#9C9488] cursor-not-allowed'
                : justAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-[#141312] hover:bg-black text-white shadow-xs active:scale-95'
            }`}
          >
            {isAgotado ? (
              <span>Agotado</span>
            ) : justAdded ? (
              <>
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">Agregado</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E6C687]" />
                <span>Añadir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
