import React from 'react';
import { Sparkles } from 'lucide-react';

export const Banner: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#121110] text-white my-6 mx-4 sm:mx-6 lg:mx-8 p-8 sm:p-12 lg:p-14 shadow-xl border border-black/40">
      {/* Subtle warm glow on background */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#C59A4D]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1C1A17] border border-[#C59A4D]/30 text-[#D4AF37] text-[11px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ALEXSTORE • CATÁLOGO OFICIAL</span>
        </div>

        {/* Headings */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight font-heading">
            Colección Selecta
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#C59A4D] tracking-tight leading-tight font-heading">
            Disponibilidad en Vivo
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-[#C2BAAE] text-sm sm:text-base leading-relaxed max-w-2xl pt-1">
          La mejor calidad 1:1 en tu tienda de confianza. Diseños exclusivos con acabados de máximo nivel y atención directa a tu WhatsApp. ¡Pide el tuyo antes de que se agote!
        </p>
      </div>
    </div>
  );
};
