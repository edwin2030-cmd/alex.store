import React from 'react';
import { Search, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { AlexStoreLogo } from './AlexStoreLogo';

interface HeaderProps {
  currentView: 'catalogo' | 'colecciones';
  onViewChange: (view: 'catalogo' | 'colecciones') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdminLogin?: () => void;
  onToggleFilters?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  setSearchQuery,
  cartCount,
  onOpenCart,
  onOpenAdminLogin,
  onToggleFilters,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EAE5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand - Logo with 5 quick clicks to open admin */}
        <div className="flex items-center gap-3 select-none">
          <AlexStoreLogo size="md" onFiveClicks={onOpenAdminLogin} />
          <div
            onClick={() => onViewChange('catalogo')}
            className="flex flex-col cursor-pointer group"
          >
            <span className="font-extrabold text-2xl tracking-tight leading-none text-[#1A1918]">
              Alex<span className="text-[#C59A4D]">Store</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#7A7368] mt-0.5">
              CATÁLOGO OFICIAL
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9488]" />
            <input
              type="text"
              placeholder="Buscar en AlexStore..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-sm text-[#1A1918] placeholder-[#9C9488] pl-11 pr-8 py-2.5 rounded-full border border-[#E5E0D8] focus:outline-none focus:border-[#C59A4D] focus:ring-1 focus:ring-[#C59A4D]/30 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#9C9488] hover:text-[#1A1918]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Catalogo Tab */}
          <button
            onClick={() => onViewChange('catalogo')}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
              currentView === 'catalogo'
                ? 'bg-white border-2 border-[#1A1918] text-[#1A1918] shadow-sm'
                : 'text-[#6B655C] hover:text-[#1A1918]'
            }`}
          >
            CATÁLOGO
          </button>

          {/* Colecciones Tab */}
          <button
            onClick={() => onViewChange('colecciones')}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
              currentView === 'colecciones'
                ? 'bg-white border-2 border-[#1A1918] text-[#1A1918] shadow-sm'
                : 'text-[#6B655C] hover:text-[#1A1918]'
            }`}
          >
            COLECCIONES
          </button>

          {/* BOLSA Button */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#141312] hover:bg-black text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-md active:scale-95"
            aria-label="Abrir bolsa de pedidos"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#E6C687]" />
            <span>BOLSA</span>
            {cartCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-[#E6C687] text-[#141312] text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Filter icon */}
          {onToggleFilters && (
            <button
              onClick={onToggleFilters}
              className="p-2 rounded-full text-[#6B655C] hover:text-[#1A1918] hover:bg-[#EAE5DC]/60 transition-colors hidden sm:block"
              title="Filtrar catálogo"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9488]" />
          <input
            type="text"
            placeholder="Buscar en AlexStore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-sm text-[#1A1918] placeholder-[#9C9488] pl-11 pr-8 py-2 rounded-full border border-[#E5E0D8] focus:outline-none focus:border-[#C59A4D] shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#9C9488] hover:text-[#1A1918]"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
