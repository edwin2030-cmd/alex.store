import React from 'react';
import { Categoria } from '../types';

interface CategoryFilterProps {
  categorias: Categoria[];
  categoriaSeleccionada: string | null;
  onSelectCategoria: (id: string | null) => void;
  countsPorCategoria: Record<string, number>;
  totalCount: number;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
  countsPorCategoria,
  totalCount,
}) => {
  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-5">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {/* "TODOS" button */}
        <button
          onClick={() => onSelectCategoria(null)}
          className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all shadow-sm ${
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

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategoria(cat.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#141312] text-white shadow-md'
                  : 'bg-[#EFEAE2] hover:bg-[#E7E0D6] text-[#2A2724]'
              }`}
            >
              <span>{cat.nombre}</span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.2 rounded-full ${
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
