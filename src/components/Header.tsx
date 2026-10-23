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
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EAE5DC] w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand - Logo with 5 quick clicks to open admin */}
        <div className="flex items-center gap-2 sm:gap-3 select-none shrink-0">
          <AlexStoreLogo size="md" onFiveClicks={onOpenAdminLogin} />
          <div
            onClick={() => onViewChange('catalogo')}
            className="flex flex-col cursor-pointer group"
          >
            <span className="font-extrabold text-lg sm:text-2xl tracking-tight leading-none text-[#1A1918]">
              Alex<span className="text-[#C59A4D]">Store</span>
            </span>
            <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-[0.18em] text-[#7A7368] mt-0.5 hidden sm:block">
              CATÁLOGO OFICIAL
            </span>
          </div>
        </div>

        {/* Desktop & Tablet Search Bar */}
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#9C9488] hover:text-[#1A1918] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Catalogo Tab */}
          <button
            onClick={() => onViewChange('catalogo')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              currentView === 'catalogo'
                ? 'bg-white border border-[#1A1918] sm:border-2 text-[#1A1918] shadow-sm'
                : 'text-[#6B655C] hover:text-[#1A1918]'
            }`}
          >
            CATÁLOGO
          </button>

          {/* Colecciones Tab */}
          <button
            onClick={() => onViewChange('colecciones')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              currentView === 'colecciones'
                ? 'bg-white border border-[#1A1918] sm:border-2 text-[#1A1918] shadow-sm'
                : 'text-[#6B655C] hover:text-[#1A1918]'
            }`}
          >
            <span className="hidden sm:inline">COLECCIONES</span>
            <span className="sm:hidden">COLEC.</span>
          </button>

          {/* BOLSA Button */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#141312] hover:bg-black text-white text-[10px] sm:text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            aria-label="Abrir bolsa de pedidos"
          >
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E6C687]" />
            <span>BOLSA</span>
            {cartCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-[#E6C687] text-[#141312] text-[9px] sm:text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Filter icon for desktop */}
          {onToggleFilters && (
            <button
              onClick={onToggleFilters}
              className="p-2 rounded-full text-[#6B655C] hover:text-[#1A1918] hover:bg-[#EAE5DC]/60 transition-colors hidden lg:block cursor-pointer"
              title="Filtrar catálogo"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-3 sm:px-4 pb-2.5 pt-0.5 md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9C9488]" />
          <input
            type="text"
            placeholder="Buscar camiseta, club o jugador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-xs sm:text-sm text-[#1A1918] placeholder-[#9C9488] pl-9 pr-8 py-2 rounded-full border border-[#E5E0D8] focus:outline-none focus:border-[#C59A4D] shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9C9488] hover:text-[#1A1918] p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
