import React, { useState, useMemo } from 'react';
import { Producto, VarianteProducto } from '../types';
import {
  X,
  ShoppingBag,
  MessageCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ProductDetailModalProps {
  producto: Producto | null;
  onClose: () => void;
  onAddToCart: (
    producto: Producto,
    cantidad: number,
    talla?: string,
    opcionesSeleccionadas?: Record<string, string>,
    varianteSeleccionada?: VarianteProducto
  ) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  producto,
  onClose,
  onAddToCart,
}) => {
  if (!producto) return null;

  const images =
    producto.imagenes && producto.imagenes.length > 0
      ? producto.imagenes
      : [
          producto.imagen_url ||
            'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80',
        ];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  // Atributos y opciones disponibles (Tallas y Colores configurados)
  const atributos = useMemo(() => {
    const list: { nombre: string; valores: string[] }[] = [];

    // 1. Tallas configuradas manualmente
    if (producto.tallas && Array.isArray(producto.tallas) && producto.tallas.length > 0) {
      list.push({
        nombre: 'Talla',
        valores: producto.tallas,
      });
    }

    // 2. Colores configurados manualmente
    if (producto.colores && Array.isArray(producto.colores) && producto.colores.length > 0) {
      list.push({
        nombre: 'Color',
        valores: producto.colores,
      });
    }

    // 3. Atributos adicionales de variantes si existen
    if (producto.atributos && producto.atributos.length > 0) {
      producto.atributos.forEach((a) => {
        if (!list.some((existing) => existing.nombre.toLowerCase() === a.nombre.toLowerCase())) {
          list.push(a);
        }
      });
    }

    if (list.length > 0) {
      return list;
    }

    // Si no tiene tallas ni atributos configurados explícitamente, detectar de la descripción o estándar
    const descLower = (producto.descripcion || '').toLowerCase();
    const commonSizes = ['s', 'm', 'l', 'xl', '2xl', '3xl'];
    const detected: string[] = [];
    commonSizes.forEach((sz) => {
      const regex = new RegExp(`\\b${sz}\\b`, 'i');
      if (regex.test(descLower) || descLower.includes(`talla ${sz}`) || descLower.includes(`${sz}:`)) {
        detected.push(sz.toUpperCase());
      }
    });

    const tallasFinales = detected.length > 0 ? detected : ['S', 'M', 'L', 'XL', '2XL'];
    return [
      {
        nombre: 'Talla',
        valores: tallasFinales,
      },
    ];
  }, [producto]);

  // Buscar variante que coincide exactamente con las opciones seleccionadas
  const matchingVariant = useMemo<VarianteProducto | undefined>(() => {
    if (!producto.variantes || producto.variantes.length === 0) return undefined;
    return producto.variantes.find((v) => {
      if (!v.opciones) return false;
      return Object.entries(selectedOptions).every(([attr, val]) => v.opciones[attr] === val);
    });
  }, [producto.variantes, selectedOptions]);

  // Precio final según variante o producto base
  const precioUnitario = matchingVariant?.precio !== undefined && matchingVariant.precio > 0
    ? matchingVariant.precio
    : producto.precio;

  // Stock según variante o producto base
  const stockDisponible = matchingVariant?.stock !== undefined ? matchingVariant.stock : (producto.stock ?? 0);

  const handleSelectOption = (attrName: string, value: string) => {
    setValidationError(null);
    setSelectedOptions((prev) => ({
      ...prev,
      [attrName]: value,
    }));
  };

  const handleAdd = () => {
    // Validar que todas las opciones obligatorias estén seleccionadas
    for (const attr of atributos) {
      if (!selectedOptions[attr.nombre]) {
        setValidationError(`Por favor selecciona tu ${attr.nombre} antes de agregar a la bolsa.`);
        return;
      }
    }

    const tallaValue = selectedOptions['Talla'] || selectedOptions['talla'] || Object.values(selectedOptions)[0];

    onAddToCart(producto, cantidad, tallaValue, selectedOptions, matchingVariant);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  const handleWhatsAppDirect = () => {
    const phone = '50766212802';
    const optText = Object.entries(selectedOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    const variantInfo = optText ? ` (Opciones: ${optText})` : '';
    const imgUrl = producto.imagen_url || (producto.imagenes && producto.imagenes[0]) || '';
    const fotoText = imgUrl ? `\n📸 *Foto del producto:* ${imgUrl}` : '';
    const text = `¡Hola AlexStore! 👋 Estoy interesado en el producto: *${producto.nombre}*${variantInfo} - Precio: $${precioUnitario.toFixed(2)}.${fotoText}\n¿Tienen disponibilidad para entrega inmediata?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm">
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
        <div className="relative w-full max-w-3xl bg-white border border-[#E5DFD5] rounded-3xl shadow-2xl overflow-hidden my-auto animate-fade-in max-h-[90dvh] overflow-y-auto">
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
                      target.src =
                        'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80';
                    }
                  }}
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
                      }
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
                        i === activeImageIndex
                          ? 'border-[#C59A4D] scale-95 shadow-xs'
                          : 'border-[#EAE6DF] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="flex flex-col justify-between space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#C59A4D] font-extrabold tracking-wide uppercase">AlexStore Oficial</span>
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-[#1A1918] leading-snug font-heading">
                  {producto.nombre}
                </h2>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#C59A4D]">
                    ${precioUnitario.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#7A7368] font-semibold">USD</span>
                  {matchingVariant?.sku && (
                    <span className="text-[10px] text-[#7A7368] font-mono ml-auto">
                      SKU: {matchingVariant.sku}
                    </span>
                  )}
                </div>

                {producto.descripcion && (() => {
                  const sanitized = producto.descripcion.replace(/<!--ALEX_TALLAS_STOCK:[\s\S]*?-->/g, '').trim();
                  if (!sanitized) return null;
                  return (
                    <div className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFEAE2] text-xs text-[#5A554D] leading-relaxed max-h-28 overflow-y-auto">
                      {sanitized}
                    </div>
                  );
                })()}

                {/* SELECTORES DE OPCIONES Y VARIANTES */}
                <div className="space-y-3 pt-1">
                  {atributos.map((attr) => {
                    const selectedVal = selectedOptions[attr.nombre];
                    return (
                      <div key={attr.nombre} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-[#1A1918]">
                            Selecciona tu {attr.nombre}:
                          </span>
                          {selectedVal && (
                            <span className="font-black text-[#C59A4D]">{selectedVal}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {attr.valores.map((val) => {
                            const isSelected = selectedVal === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleSelectOption(attr.nombre, val)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#141312] text-[#F5E6BE] border-2 border-[#141312] shadow-sm scale-98'
                                    : 'bg-white text-[#1A1918] border border-[#DDD7CC] hover:border-[#141312]'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alerta de validación si faltan opciones */}
                {validationError && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Cantidad */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-bold text-[#1A1918]">Cantidad a ordenar:</span>
                  <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl px-2 py-1">
                    <button
                      type="button"
                      disabled={cantidad <= 1}
                      onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                      className="w-6 h-6 flex items-center justify-center font-black text-sm text-[#7A7368] hover:text-[#1A1918] disabled:opacity-30 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-black text-xs min-w-5 text-center text-[#1A1918]">
                      {cantidad}
                    </span>
                    <button
                      type="button"
                      disabled={stockDisponible > 0 ? cantidad >= stockDisponible : cantidad >= 50}
                      onClick={() => setCantidad((c) => (stockDisponible > 0 ? Math.min(stockDisponible, c + 1) : Math.min(50, c + 1)))}
                      className="w-6 h-6 flex items-center justify-center font-black text-sm text-[#7A7368] hover:text-[#1A1918] disabled:opacity-30 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Subtotal preview */}
                <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EAE5DC] flex items-center justify-between text-xs">
                  <span className="text-[#7A7368] font-bold">Subtotal de este producto:</span>
                  <span className="font-black text-sm text-[#1A1918]">
                    ${(precioUnitario * cantidad).toFixed(2)} USD
                  </span>
                </div>

                {/* Guarantee badge */}
                <div className="flex items-center gap-2 text-xs text-[#7A7368] pt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Calidad Premium 1:1 verificada • Entrega garantizada</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleAdd}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer ${
                    added
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
                      <span>AGREGAR A LA BOLSA</span>
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
