import React from 'react';
import { Categoria } from '../types';

interface CategoryFilterProps {
  categorias: Categoria[];
  categoriaSeleccionada: string | null;
  onSelectCategoria: (id: string | null) => void;
  countsPorCategoria: Record<string, number>;
  fotoPorCategoria?: Record<string, string>;
  totalCount: number;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
  countsPorCategoria,
  fotoPorCategoria = {},
  totalCount,
}) => {
  return (
    <div className="mx-3 sm:mx-6 lg:mx-8 mb-3 sm:mb-5">
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar touch-pan-x -mx-3 px-3 sm:mx-0 sm:px-0 scroll-smooth">
        {/* "TODOS" button */}
        <button
          onClick={() => onSelectCategoria(null)}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 min-h-[38px] rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all shadow-xs cursor-pointer shrink-0 active:scale-95 touch-manipulation ${
            categoriaSeleccionada === null
              ? 'bg-[#141312] text-white shadow-md'
              : 'bg-[#EFEAE2] hover:bg-[#E7E0D6] text-[#2A2724]'
          }`}
        >
          TODOS ({totalCount})
        </button>

        {/* Dynamic categories */}
        {categorias.map((cat) => {
          const isSelected = categoriaSeleccionada === cat.id;
          const count = countsPorCategoria[cat.id] ?? 0;
          const foto = fotoPorCategoria[cat.id];

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategoria(cat.id)}
              className={`${foto ? 'pl-1 sm:pl-1.5' : 'pl-3.5 sm:pl-5'} pr-3.5 sm:pr-5 py-1 sm:py-1.5 min-h-[38px] rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 active:scale-95 touch-manipulation ${
                isSelected
                  ? 'bg-[#141312] text-white shadow-md'
                  : 'bg-[#EFEAE2] hover:bg-[#E7E0D6] text-[#2A2724]'
              }`}
            >
              {foto && (
                <img
                  src={foto}
                  alt=""
                  loading="lazy"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover bg-white shrink-0 ring-1 ring-black/5"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span>{cat.nombre}</span>
              <span
                className={`text-[10px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'text-[#7A7368]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
