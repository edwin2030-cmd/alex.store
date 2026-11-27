import React, { useMemo } from 'react';

// Copos de nieve suaves que caen sobre la página. No bloquean clics
// y se apagan si el teléfono tiene activado "reducir movimiento".
export const Nieve: React.FC<{ cantidad?: number; color?: string; dentro?: boolean; caida?: number }> = ({ cantidad = 22, color = '#ffffff', dentro = false, caida = 520 }) => {
  const copos = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        size: 4 + Math.round(Math.random() * 6),
        duracion: 9 + Math.random() * 10,
        retraso: -Math.random() * 18,
        deriva: Math.round(Math.random() * 60 - 30),
        opacidad: 0.35 + Math.random() * 0.45,
      })),
    [cantidad]
  );

  return (
    <div
      className={dentro ? 'nieve-capa nieve-dentro' : 'nieve-capa'}
      style={{ ['--caida' as string]: `${caida}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      {copos.map((c) => (
        <span
          key={c.id}
          className="nieve-copo"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: color,
            opacity: c.opacidad,
            animationDuration: `${c.duracion}s`,
            animationDelay: `${c.retraso}s`,
            ['--deriva' as string]: `${c.deriva}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
