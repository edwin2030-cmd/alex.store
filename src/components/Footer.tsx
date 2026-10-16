import React from 'react';
import { AlexStoreLogo } from './AlexStoreLogo';
import { Truck, ShieldCheck, Landmark, MessageCircle } from 'lucide-react';

interface FooterProps {
  onWhatsAppContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onWhatsAppContact }) => {
  return (
    <footer className="mt-20 border-t border-[#EAE5DC] bg-white text-[#7A7368]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3.5 md:col-span-1">
            <div className="flex items-center gap-3">
              <AlexStoreLogo size="sm" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-[#1A1918] leading-tight">
                  Alex<span className="text-[#C59A4D]">Store</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#9C9488]">
                  CATÁLOGO OFICIAL
                </span>
              </div>
            </div>
            <p className="text-xs text-[#7A7368] leading-relaxed">
              Tu tienda especializada en camisetas de fútbol de los mejores clubes del mundo, selecciones y jerseys oficiales de la NBA. Calidad 1:1 garantizada.
            </p>
          </div>

          {/* Envíos */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#C59A4D]" />
              Envíos y Entregas
            </h4>
            <p className="text-xs leading-relaxed">
              • Entregas rápidas y directas en Ciudad de Panamá.
            </p>
            <p className="text-xs leading-relaxed">
              • Envíos al interior por Uno Express o Transporte Ferguson.
            </p>
          </div>

          {/* Métodos de Pago */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-[#C59A4D]" />
              Métodos de Pago
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                Yappy (@GRAPHYCALEXPTY)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                Banco General
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                BAC Credomatic
              </span>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Atención al Cliente
            </h4>
            <p className="text-xs">
              ¿Dudas sobre tallas o disponibilidad de algún dorsal? Escríbenos directamente:
            </p>
            <button
              onClick={onWhatsAppContact}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              Chatear al 66212802
            </button>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#F0EAE1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9C9488]">
          <p>© {new Date().getFullYear()} AlexStore. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Catálogo digital oficial • Conectado a Supabase • WhatsApp 66212802
          </p>
        </div>
      </div>
    </footer>
  );
};
