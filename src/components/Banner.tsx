import React from 'react';
import { Sparkles } from 'lucide-react';

export const Banner: React.FC = () => {
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
