import React from 'react';
import { Sparkles, Gift } from 'lucide-react';
import { esTemporadaNavidad, textoCuentaRegresiva } from '../lib/navidad';
import { Nieve } from './Nieve';

const BannerNavidad: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E2A1F] via-[#123524] to-[#3A0D12] text-white my-3 sm:my-6 mx-3 sm:mx-6 lg:mx-8 p-5 sm:p-10 lg:p-12 shadow-xl border border-[#C59A4D]/30">
      {/* Luces cálidas de fondo */}
      <div className="absolute -top-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[#B3202E]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/3 w-64 sm:w-80 h-64 sm:h-80 bg-[#C59A4D]/15 rounded-full blur-3xl pointer-events-none" />

      <Nieve dentro cantidad={18} />

      {/* Adornos */}
      <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 text-[80px] sm:text-[140px] lg:text-[170px] leading-none select-none pointer-events-none opacity-90 drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]" aria-hidden="true">
        🎄
      </div>
      <div className="absolute right-24 sm:right-48 lg:right-56 top-4 sm:top-8 text-2xl sm:text-4xl select-none pointer-events-none" aria-hidden="true">
        ⭐
      </div>

      <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4 pr-20 sm:pr-40 lg:pr-0">
        {/* Etiquetas */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-black/30 border border-[#C59A4D]/40 text-[#E6C77A] text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>ALEXSTORE • NAVIDAD</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B3202E] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-md">
            <Gift className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{textoCuentaRegresiva()}</span>
          </div>
        </div>

        {/* Títulos */}
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight font-heading break-words">
            Regalos de Navidad
          </h1>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#E6C77A] tracking-tight leading-tight font-heading break-words">
            que sí se van a poner
          </h2>
        </div>

        {/* Subtítulo */}
        <p className="text-[#E9E2D6] text-xs sm:text-base leading-relaxed max-w-2xl pt-0.5 sm:pt-1 font-medium">
          Camisetas de su equipo, retro, taquillos y más con calidad 1:1. Escoge el regalo, pídelo por WhatsApp y asegúralo antes de que se agote. 🎁
        </p>
      </div>
    </div>
  );
};

const BannerNormal: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#121110] text-white my-3 sm:my-6 mx-3 sm:mx-6 lg:mx-8 p-5 sm:p-10 lg:p-12 shadow-xl border border-black/40">
      {/* Subtle warm glow on background */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-[#C59A4D]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-[#1C1A17] border border-[#C59A4D]/30 text-[#D4AF37] text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
          <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span>ALEXSTORE • CATÁLOGO OFICIAL</span>
        </div>

        {/* Headings */}
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight font-heading break-words">
            Colección Selecta
          </h1>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#C59A4D] tracking-tight leading-tight font-heading break-words">
            Disponibilidad en Vivo
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-[#C2BAAE] text-xs sm:text-base leading-relaxed max-w-2xl pt-0.5 sm:pt-1 font-medium">
          La mejor calidad 1:1 en tu tienda de confianza. Diseños exclusivos con acabados de máximo nivel y atención directa a tu WhatsApp. ¡Pide el tuyo antes de que se agote!
        </p>
      </div>
    </div>
  );
};

export const Banner: React.FC = () => {
  return esTemporadaNavidad() ? <BannerNavidad /> : <BannerNormal />;
};
