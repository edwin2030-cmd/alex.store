import React from 'react';

// Guirnalda de luces de colores que cuelga debajo del encabezado.
const COLORES = ['#ff3b3b', '#2ee66b', '#ffd23f', '#3fa9ff', '#ff7ad9'];

export const LucesNavidad: React.FC = () => {
  return (
    <div className="luces-navidad" aria-hidden="true">
      {Array.from({ length: 32 }, (_, i) => (
        <span key={i} className={`luz-tramo ${i % 2 === 1 ? 'luz-solo-grande' : ''}`}>
          <span
            className="luz-foco"
            style={{
              ['--luz' as string]: COLORES[i % COLORES.length],
              animationDelay: `${(i % 4) * 0.45}s`,
            } as React.CSSProperties}
          />
        </span>
      ))}
    </div>
  );
};

// Montoncito de nieve al pie de cada foto.
export const NieveEnFoto: React.FC = () => {
  return (
    <div className="nieve-foto" aria-hidden="true">
      <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="nieve-foto-svg">
        <path
          d="M0 14 C 12 6, 22 6, 32 12 S 52 20, 64 11 S 86 3, 98 10 S 118 19, 132 11 S 156 4, 168 11 S 190 17, 200 9 L 200 28 L 0 28 Z"
          fill="#ffffff"
        />
        <path
          d="M0 14 C 12 6, 22 6, 32 12 S 52 20, 64 11 S 86 3, 98 10 S 118 19, 132 11 S 156 4, 168 11 S 190 17, 200 9"
          fill="none"
          stroke="#dbe9f5"
          strokeWidth="1.2"
        />
      </svg>
      <span className="nieve-foto-brillo" style={{ left: '18%' }} />
      <span className="nieve-foto-brillo" style={{ left: '47%', animationDelay: '0.8s' }} />
      <span className="nieve-foto-brillo" style={{ left: '78%', animationDelay: '1.6s' }} />
    </div>
  );
};
