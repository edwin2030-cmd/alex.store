import React from 'react';
import { Categoria } from '../types';
import { ArrowRight, Folder } from 'lucide-react';

interface ColeccionesViewProps {
  categorias: Categoria[];
  countsPorCategoria: Record<string, number>;
  onSelectCollection: (categoriaId: string) => void;
  onGoToCatalogo: () => void;
}

export const ColeccionesView: React.FC<ColeccionesViewProps> = ({
  categorias,
  countsPorCategoria,
  onSelectCollection,
  onGoToCatalogo,
}) => {
  return (
    <div className="mx-3 sm:mx-6 lg:mx-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1A1918] tracking-tight font-heading">
            Colecciones AlexStore
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7368] mt-1">
            Explora las categorías disponibles en nuestro catálogo
          </p>
        </div>

        <button
          onClick={onGoToCatalogo}
          className="text-xs sm:text-sm font-bold text-[#C59A4D] hover:text-[#9A7432] flex items-center gap-1.5 uppercase tracking-wider transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>VER TODO EL CATÁLOGO</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Grid of collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {categorias.map((cat) => {
          const count = countsPorCategoria[cat.id] ?? 0;

          return (
            <div
              key={cat.id}
              onClick={() => onSelectCollection(cat.id)}
              className="group bg-white rounded-2xl sm:rounded-3xl border border-[#EBE7DF] hover:border-[#C59A4D]/60 p-4 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer min-h-[220px] sm:min-h-[280px]"
            >
              {/* Card Top: Count Badge */}
              <div className="flex justify-end">
                <span className="px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full bg-[#1A1918] text-white text-[10px] sm:text-xs font-bold shadow-xs">
                  {count} artículos
                </span>
              </div>

              {/* Card Center: Icon & Tag */}
              <div className="flex flex-col items-center justify-center py-4 sm:py-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#FAF8F5] border border-[#EFEAE2] flex items-center justify-center text-[#C9BFB0] group-hover:text-[#C59A4D] group-hover:scale-105 transition-all">
                  <Folder className="w-6 h-6 sm:w-8 sm:h-8 stroke-[1.5]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#A69F93] mt-2 sm:mt-3">
                  COLECCIÓN
                </span>
              </div>

              {/* Card Bottom: Title & Action */}
              <div className="pt-3 sm:pt-4 border-t border-[#F2ECE1] space-y-2 sm:space-y-3">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#1A1918] group-hover:text-[#C59A4D] transition-colors leading-snug">
                    {cat.nombre}
                  </h3>
                  {cat.descripcion && (
                    <p className="text-xs text-[#7A7368] mt-0.5 line-clamp-1">
                      {cat.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#C59A4D] group-hover:text-[#9A7432] pt-0.5">
                  <span>EXPLORAR ARTÍCULOS</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
