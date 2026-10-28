import React, { useState, useEffect, useMemo } from 'react';
import { Producto } from '../types';
import { X, Plus, Minus, Trash2, CheckCircle2, Layers, AlertCircle } from 'lucide-react';
import { actualizarStockPorTallas } from '../lib/supabase';

interface ModalStockTallasRapidoProps {
  isOpen: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const ModalStockTallasRapido: React.FC<ModalStockTallasRapidoProps> = ({
  isOpen,
  producto,
  onClose,
  onSaved,
}) => {
  if (!isOpen || !producto) return null;

  // Mapa local de tallas y cantidades
  const [tallasStock, setTallasStock] = useState<Record<string, number>>({});
  const [nuevaTallaInput, setNuevaTallaInput] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  useEffect(() => {
    if (producto) {
      let initial: Record<string, number> = {};
      if (producto.tallas_stock && Object.keys(producto.tallas_stock).length > 0) {
        initial = { ...producto.tallas_stock };
      } else if (producto.variantes && producto.variantes.length > 0) {
        producto.variantes.forEach((v) => {
          const t = v.opciones?.Talla || v.titulo;
          if (t) initial[t] = Number(v.stock) || 0;
        });
      } else if (producto.tallas && producto.tallas.length > 0) {
        const perTalla = Math.max(1, Math.floor((producto.stock ?? 10) / producto.tallas.length));
        producto.tallas.forEach((t) => {
          initial[t] = perTalla;
        });
      } else {
        // Tallas por defecto si el producto no tenía
        initial = { S: 3, M: 5, L: 4, XL: 2 };
      }
      setTallasStock(initial);
      setMensajeExito(false);
    }
  }, [producto]);

  const tallasKeys = Object.keys(tallasStock);

  const totalCalculado = useMemo(() => {
    return Object.values(tallasStock).reduce((sum, q) => sum + (Number(q) || 0), 0);
  }, [tallasStock]);

  const handleDelta = (talla: string, delta: number) => {
    setTallasStock((prev) => {
      const current = Number(prev[talla]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [talla]: next };
    });
  };

  const handleChangeQty = (talla: string, rawVal: string) => {
    const val = parseInt(rawVal, 10);
    setTallasStock((prev) => ({
      ...prev,
      [talla]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  const handleEliminarTalla = (talla: string) => {
    setTallasStock((prev) => {
      const next = { ...prev };
      delete next[talla];
      return next;
    });
  };

  const handleAgregarTalla = (tallaNombre?: string) => {
    const clean = (tallaNombre || nuevaTallaInput).trim().toUpperCase();
    if (!clean) return;
    if (tallasStock[clean] !== undefined) {
      alert(`La talla ${clean} ya existe en este producto.`);
      return;
    }
    setTallasStock((prev) => ({
      ...prev,
      [clean]: 5,
    }));
    setNuevaTallaInput('');
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const res = await actualizarStockPorTallas(
        producto.id,
        tallasStock,
        producto.stock_minimo || 3
      );
      if (res.success) {
        setMensajeExito(true);
        await onSaved();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        alert('Error al guardar stock por tallas: ' + (res.error || ''));
      }
    } catch (err: any) {
      alert('Error inesperado: ' + (err.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#13110F] text-white rounded-3xl border border-[#2D2822] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#26221E] flex items-center justify-between bg-[#1A1816]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B18] border border-[#38332B] flex items-center justify-center text-[#E6C687]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white font-heading">
                Control de Stock por Talla
              </h3>
              <p className="text-[11px] text-[#A69F93]">
                Asigna las cantidades físicas exactas para cada talla
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#26221E] text-[#A69F93] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Producto info pill */}
        <div className="px-5 py-3 bg-[#181614] border-b border-[#26221E] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={producto.imagen_url || (producto.imagenes && producto.imagenes[0]) || ''}
              alt=""
              className="w-10 h-12 object-cover rounded-xl bg-black border border-[#332E27] shrink-0"
            />
            <div className="min-w-0">
              <span className="font-black text-xs text-white block truncate">
                {producto.nombre}
              </span>
              <span className="text-[10px] text-[#A69F93] font-mono">
                SKU: {producto.sku || 'N/A'} • ${producto.precio} USD
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-[#A69F93] uppercase font-bold block">
              Stock Total Calculado
            </span>
            <span className="text-base font-black text-[#E6C687]">
              {totalCalculado} unids.
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Tallas existentes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#E6C687] tracking-wider">
                Tallas Configuradas ({tallasKeys.length})
              </span>
              <span className="text-[11px] text-[#A69F93]">
                La suma de todas las tallas será el stock del producto
              </span>
            </div>

            {tallasKeys.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-[#1A1816] border border-[#2D2822] text-[#A69F93] text-xs">
                No hay tallas asignadas aún. Agrega una talla abajo para comenzar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tallasKeys.map((talla) => {
                  const qty = tallasStock[talla] ?? 0;
                  return (
                    <div
                      key={talla}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#181614] border border-[#2D2822] hover:border-[#3D372E] transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-[#221F1C] border border-[#38332B] flex items-center justify-center font-black text-xs text-[#E6C687] font-mono">
                          {talla}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            Talla {talla}
                          </span>
                          <span className={`text-[10px] font-bold ${qty <= 0 ? 'text-rose-400' : qty < 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {qty <= 0 ? 'Agotado' : qty < 3 ? 'Stock bajo' : 'Disponible'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelta(talla, -1)}
                          className="w-7 h-7 rounded-lg bg-[#221F1C] border border-[#38332B] hover:bg-rose-950/50 hover:text-rose-300 text-[#A69F93] flex items-center justify-center cursor-pointer transition-colors"
                          title="Restar 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => handleChangeQty(talla, e.target.value)}
                          className="w-16 text-center font-black text-sm bg-black border-2 border-[#C59A4D] text-[#E6C687] rounded-xl py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-[#C59A4D] shadow-sm"
                        />

                        <button
                          type="button"
                          onClick={() => handleDelta(talla, 1)}
                          className="w-7 h-7 rounded-lg bg-[#221F1C] border border-[#38332B] hover:bg-emerald-950/50 hover:text-emerald-300 text-[#A69F93] flex items-center justify-center cursor-pointer transition-colors"
                          title="Sumar 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEliminarTalla(talla)}
                          className="w-7 h-7 rounded-lg bg-[#221F1C] border border-[#38332B] hover:bg-rose-900/60 hover:text-rose-200 text-[#7A7368] flex items-center justify-center cursor-pointer transition-colors ml-1"
                          title="Quitar esta talla"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agregar nueva talla */}
          <div className="p-3.5 rounded-2xl bg-[#181614] border border-[#26221E] space-y-2.5">
            <span className="text-[11px] font-black uppercase text-[#A69F93] tracking-wider block">
              + Agregar Nueva Talla al Producto
            </span>

            {/* Botones rápidos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-[#7A7368] mr-1">Rápidos:</span>
              {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '38', '40', '42', 'ÚNICA'].map((t) => {
                const already = tallasStock[t] !== undefined;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={already}
                    onClick={() => handleAgregarTalla(t)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      already
                        ? 'opacity-30 bg-[#221F1C] text-[#666] cursor-not-allowed'
                        : 'bg-[#221F1C] hover:bg-[#C59A4D] hover:text-black text-[#E6C687] border border-[#38332B]'
                    }`}
                  >
                    +{t}
                  </button>
                );
              })}
            </div>

            {/* Input personalizado */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Otra talla personalizada (ej: 44, 34B, 10 US...)"
                value={nuevaTallaInput}
                onChange={(e) => setNuevaTallaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAgregarTalla();
                  }
                }}
                className="flex-1 bg-[#13110F] text-xs px-3 py-2 rounded-xl border border-[#332E27] text-white focus:outline-none focus:border-[#C59A4D]"
              />
              <button
                type="button"
                onClick={() => handleAgregarTalla()}
                className="px-3.5 py-2 rounded-xl bg-[#221F1C] hover:bg-[#2D2822] text-[#E6C687] text-xs font-bold border border-[#38332B] transition-colors cursor-pointer shrink-0"
              >
                + Agregar
              </button>
            </div>
          </div>

          {mensajeExito && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Inventario y tallas actualizados exitosamente en Supabase!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#26221E] bg-[#1A1816]/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#332E27] text-[#A69F93] hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={guardando}
            onClick={handleGuardar}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C59A4D] to-[#E6C687] text-black font-black text-xs hover:brightness-110 transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {guardando ? (
              <span>Guardando en Supabase...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Stock por Talla ({totalCalculado} unids)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
