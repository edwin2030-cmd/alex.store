import React from 'react';
import { ItemCarrito } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, Landmark, Smartphone, Phone, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  onUpdateCantidad: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: (method?: 'transferencia' | 'yappy') => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateCantidad,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const itemPrice = (item: ItemCarrito) =>
    Number(item.precioUnitario) || Number(item.varianteSeleccionada?.precio) || Number(item.producto.precio) || 0;

  const totalArticulos = items.reduce((acc, curr) => acc + curr.cantidad, 0);
  const total = items.reduce((acc, curr) => acc + itemPrice(curr) * curr.cantidad, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-8">
        <div className="w-screen max-w-full sm:max-w-md bg-white flex flex-col justify-between shadow-2xl relative">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#EFEAE2] flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center shadow-md shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-[#1A1918] font-heading leading-tight">
                  Tu Bolsa de Pedido
                </h2>
                <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-[#9C9488]">
                  {totalArticulos} {totalArticulos === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {items.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-xs text-[#9C9488] hover:text-[#1A1918] font-semibold transition-colors cursor-pointer px-1 py-1"
                >
                  Vaciar
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors cursor-pointer"
                aria-label="Cerrar bolsa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            /* Empty state */
            <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5">
              <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-3xl bg-[#FAF6EE] border border-[#EFE5D3] flex items-center justify-center text-[#C59A4D] shadow-inner">
                <ShoppingBag className="w-10 sm:w-12 h-10 sm:h-12 stroke-[1.4]" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#1A1918] font-heading">
                  Tu bolsa está vacía
                </h3>
                <p className="text-xs text-[#7A7368] leading-relaxed">
                  Explora los productos de AlexStore y añádelos a tu bolsa para realizar tu compra oficial.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-7 sm:px-8 py-3 sm:py-3.5 rounded-full bg-[#141312] hover:bg-black text-[#F5E6BE] font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
              >
                VER CATÁLOGO
              </button>
            </div>
          ) : (
            /* Filled state */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Items List */}
              <div className="space-y-2.5 sm:space-y-3">
                {items.map((item, index) => {
                  const price = itemPrice(item);
                  return (
                    <div
                      key={`${item.producto.id}-${index}-${item.varianteSeleccionada?.id || item.tallaSeleccionada || ''}`}
                      className="p-3 sm:p-3.5 rounded-2xl border border-[#EAE5DC] bg-white flex items-center justify-between gap-3 shadow-xs"
                    >
                      <img
                        src={item.producto.imagen_url || (item.producto.imagenes && item.producto.imagenes[0]) || ''}
                        alt={item.producto.nombre}
                        className="w-14 h-16 sm:w-16 sm:h-18 object-cover rounded-xl bg-[#F7F5F0] border border-[#EAE5DC] shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-[#1A1918] truncate">
                          {item.producto.nombre}
                        </h4>

                        {/* Variantes y opciones */}
                        {item.varianteSeleccionada?.titulo ? (
                          <span className="text-[10px] sm:text-[11px] text-[#C59A4D] font-bold block truncate">
                            {item.varianteSeleccionada.titulo}
                          </span>
                        ) : item.opcionesSeleccionadas && Object.keys(item.opcionesSeleccionadas).length > 0 ? (
                          <span className="text-[10px] sm:text-[11px] text-[#7A7368] font-medium block truncate">
                            {Object.entries(item.opcionesSeleccionadas)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' • ')}
                          </span>
                        ) : item.tallaSeleccionada ? (
                          <span className="text-[10px] sm:text-[11px] text-[#7A7368] font-medium block">
                            Talla: {item.tallaSeleccionada}
                          </span>
                        ) : null}

                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xs sm:text-sm font-black text-[#C59A4D]">
                            ${(price * item.cantidad).toFixed(2)}
                          </span>
                          {item.cantidad > 1 && (
                            <span className="text-[10px] text-[#7A7368]">
                              (${price.toFixed(2)} c/u)
                            </span>
                          )}
                        </div>

                        {/* Quantity counter pill */}
                        <div className="mt-1.5 inline-flex items-center gap-2 sm:gap-3 px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FAF8F5] border border-[#EAE5DC]">
                          <button
                            onClick={() => onUpdateCantidad(index, -1)}
                            className="text-[#7A7368] hover:text-[#1A1918] text-xs font-bold p-0.5 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-[#1A1918] min-w-3 text-center">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => onUpdateCantidad(index, 1)}
                            className="text-[#7A7368] hover:text-[#1A1918] text-xs font-bold p-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    {/* Trash icon */}
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="p-1.5 sm:p-2 text-[#A69F93] hover:text-rose-600 transition-colors cursor-pointer"
                      title="Eliminar de la bolsa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              </div>

              {/* Opciones de Transferencia y Yappy interactivas */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2.5">
                <span className="text-[11px] font-black tracking-wider uppercase text-[#1A1918] block">
                  ELIGE TU MÉTODO DE PAGO DIRECTO:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onProceedToCheckout('transferencia')}
                    className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-[#E5DFD5] hover:border-[#C59A4D] hover:bg-[#FFFDF9] space-y-0.5 transition-all cursor-pointer shadow-xs hover:shadow-md text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Landmark className="w-4 sm:w-5 h-4 sm:h-5 text-[#C59A4D]" />
                      <ArrowRight className="w-3 h-3 text-[#A69F93] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] sm:text-xs font-extrabold text-[#1A1918] leading-tight">Transferencia</p>
                    <p className="text-[9px] sm:text-[10px] text-[#7A7368]">Banco General • BAC</p>
                  </button>

                  <button
                    onClick={() => onProceedToCheckout('yappy')}
                    className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-[#E5DFD5] hover:border-[#0284C7] hover:bg-[#F0F8FF] space-y-0.5 transition-all cursor-pointer shadow-xs hover:shadow-md text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Smartphone className="w-4 sm:w-5 h-4 sm:h-5 text-[#0284C7]" />
                      <ArrowRight className="w-3 h-3 text-[#A69F93] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] sm:text-xs font-extrabold text-[#1A1918] leading-tight">Pagar con Yappy</p>
                    <p className="text-[9px] sm:text-[10px] text-[#7A7368]">Directorio Oficial</p>
                  </button>
                </div>

                <p className="text-[10px] sm:text-[11px] text-[#7A7368] leading-relaxed pt-0.5">
                  Al confirmar el pago obtendrás tu <strong className="text-[#1A1918]">Recibo Oficial</strong> y podrás enviarlo con el comprobante adjunto directamente al WhatsApp oficial <strong className="text-[#1A1918]">66212802</strong>.
                </p>
              </div>

              {/* WhatsApp pedidos phone tag */}
              <div className="text-xs text-[#7A7368] flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-[#FAF8F5] border border-[#E5DFD5]">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs">WhatsApp de Pedidos:</span>
                  <strong className="text-[#1A1918] text-xs sm:text-sm">66212802</strong>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Oficial
                </span>
              </div>
            </div>
          )}

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-[#EFEAE2] bg-[#FAF8F5] space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-[#7A7368]">
                  TOTAL DEL PEDIDO
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#1A1918]">
                  ${total.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => onProceedToCheckout()}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-[#141312] hover:bg-black text-white font-extrabold text-[11px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl transition-all active:scale-98 cursor-pointer"
              >
                <Landmark className="w-4 h-4 text-[#E6C687]" />
                <span>FINALIZAR PEDIDO (TRANSFERENCIA / YAPPY)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
