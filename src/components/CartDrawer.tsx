import React from 'react';
import { ItemCarrito } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, Landmark, Smartphone } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  onUpdateCantidad: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
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

  const totalArticulos = items.reduce((acc, curr) => acc + curr.cantidad, 0);
  const total = items.reduce((acc, curr) => acc + curr.producto.precio * curr.cantidad, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-md bg-white flex flex-col justify-between shadow-2xl relative">
          {/* Header */}
          <div className="p-6 border-b border-[#EFEAE2] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-[#1A1918] font-heading leading-tight">
                  Tu Bolsa de Pedido
                </h2>
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#9C9488]">
                  {totalArticulos} {totalArticulos === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-xs text-[#9C9488] hover:text-[#1A1918] font-semibold transition-colors"
                >
                  Vaciar
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors"
                aria-label="Cerrar bolsa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            /* Empty state matching Image 2 */
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-24 h-24 rounded-3xl bg-[#FAF6EE] border border-[#EFE5D3] flex items-center justify-center text-[#C59A4D] shadow-inner">
                <ShoppingBag className="w-12 h-12 stroke-[1.4]" />
              </div>
              <div className="space-y-2 max-w-xs">
                <h3 className="text-xl font-extrabold text-[#1A1918] font-heading">
                  Tu bolsa está vacía
                </h3>
                <p className="text-xs text-[#7A7368] leading-relaxed">
                  Explora los productos de AlexStore y añádelos a tu bolsa para realizar tu compra oficial.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3.5 rounded-full bg-[#141312] hover:bg-black text-[#F5E6BE] font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
              >
                VER CATÁLOGO
              </button>
            </div>
          ) : (
            /* Filled state */
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Items List */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={`${item.producto.id}-${item.tallaSeleccionada || index}`}
                    className="p-3.5 rounded-2xl border border-[#EAE5DC] bg-white flex items-center justify-between gap-3 shadow-xs"
                  >
                    <img
                      src={item.producto.imagen_url || (item.producto.imagenes && item.producto.imagenes[0]) || ''}
                      alt={item.producto.nombre}
                      className="w-16 h-18 object-cover rounded-xl bg-[#F7F5F0] border border-[#EAE5DC] shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#1A1918] truncate">
                        {item.producto.nombre}
                      </h4>
                      {item.tallaSeleccionada && (
                        <span className="text-[11px] text-[#7A7368] font-medium block">
                          Talla: {item.tallaSeleccionada}
                        </span>
                      )}
                      <p className="text-sm font-black text-[#C59A4D] mt-1">
                        $ {item.producto.precio}
                      </p>

                      {/* Quantity counter pill */}
                      <div className="mt-2 inline-flex items-center gap-3 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE5DC]">
                        <button
                          onClick={() => onUpdateCantidad(index, -1)}
                          className="text-[#7A7368] hover:text-[#1A1918] text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-[#1A1918] min-w-3 text-center">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => onUpdateCantidad(index, 1)}
                          className="text-[#7A7368] hover:text-[#1A1918] text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Trash icon */}
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="p-2 text-[#A69F93] hover:text-rose-600 transition-colors"
                      title="Eliminar de la bolsa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Opciones de Pago card (Transferencia y Yappy) */}
              <div className="p-4 rounded-3xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-3">
                <span className="text-xs font-black tracking-wider uppercase text-[#1A1918] block">
                  OPCIONES DE TRANSFERENCIA DIRECTA:
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-2xl border border-[#E5DFD5] text-center space-y-1">
                    <Landmark className="w-5 h-5 mx-auto text-[#C59A4D]" />
                    <p className="text-xs font-extrabold text-[#1A1918] leading-tight">Transferencia</p>
                    <p className="text-[10px] text-[#7A7368]">Banco General / ACH</p>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-[#E5DFD5] text-center space-y-1">
                    <Smartphone className="w-5 h-5 mx-auto text-blue-500" />
                    <p className="text-xs font-extrabold text-[#1A1918] leading-tight">Yappy</p>
                    <p className="text-[10px] text-[#7A7368]">Móvil B. General</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#7A7368] leading-relaxed pt-1">
                  Al confirmar el pago obtendrás tu <strong className="text-[#1A1918]">Recibo Oficial</strong> y podrás enviarlo con el comprobante adjunto directamente a WhatsApp.
                </p>
              </div>

              {/* WhatsApp pedidos phone tag */}
              <div className="text-xs text-[#7A7368] flex items-center gap-1.5 pt-1">
                <span>📞 WhatsApp pedidos:</span>
                <strong className="text-[#1A1918]">66212802</strong>
              </div>
            </div>
          )}

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#EFEAE2] bg-[#FAF8F5] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-[#7A7368]">
                  TOTAL DEL PEDIDO
                </span>
                <span className="text-3xl font-black text-[#1A1918]">
                  $ {total}
                </span>
              </div>

              <button
                onClick={onProceedToCheckout}
                className="w-full py-4 rounded-2xl bg-[#141312] hover:bg-black text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl transition-all active:scale-98"
              >
                <Landmark className="w-4 h-4 text-[#E6C687]" />
                <span>PROCEDER AL PAGO (TRANSFERENCIA • YAPPY)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
