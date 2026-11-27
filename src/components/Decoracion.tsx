import React from 'react';

// ---------- Luces: guirnalda cálida con focos inclinados, debajo del encabezado ----------
const COLORES = ['#f6c453', '#d81f3a', '#fff1cc', '#169c57', '#e8b86a'];

export const LucesNavidad: React.FC = () => {
  return (
    <div className="luces-navidad" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => (
        <span key={i} className={`luz-tramo ${i % 2 === 1 ? 'luz-solo-grande' : ''}`}>
          <span
            className={`luz-foco ${i % 2 === 0 ? 'luz-izq' : 'luz-der'}`}
            style={{
              ['--luz' as string]: COLORES[i % COLORES.length],
              animationDelay: `${(i % 5) * 0.55}s`,
            } as React.CSSProperties}
          />
        </span>
      ))}
    </div>
  );
};

// ---------- Copo de nieve dibujado (6 puntas) ----------
export const Copo: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 12, className = '', style }) => (
  <svg width={size} height={size} viewBox="-12 -12 24 24" className={className} style={style} aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((r) => (
        <g key={r} transform={`rotate(${r})`}>
          <path d="M0 -10 V10" />
          <path d="M0 -6 L-3 -9 M0 -6 L3 -9 M0 6 L-3 9 M0 6 L3 9" />
        </g>
      ))}
    </g>
  </svg>
);

// ---------- Nieve acumulada al pie de cada foto ----------
const BRILLOS = [12, 39, 66, 90];
const BORDE =
  'M0 24 C 8 16, 20 15, 28 21 C 34 14, 46 13, 52 20 C 60 25, 70 26, 78 19 C 86 12, 100 13, 106 20 C 114 26, 126 24, 132 18 C 140 12, 152 14, 158 21 C 166 26, 178 25, 186 18 C 192 14, 198 16, 200 18';

export const NieveEnFoto: React.FC = () => {
  return (
    <div className="nieve-foto" aria-hidden="true">
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="nieve-foto-svg">
        <defs>
          <linearGradient id="nieveFrente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f4f8fc" />
            <stop offset="1" stopColor="#dfeaf4" />
          </linearGradient>
        </defs>
        {/* sombrita debajo del borde (en vez de un filtro, más liviano) */}
        <path d={BORDE} transform="translate(0 -2.5)" fill="none" stroke="#9db8d2" strokeOpacity="0.45" strokeWidth="3" />
        {/* capa de atrás, azul hielo */}
        <path
          d="M0 17 C 15 8, 28 10, 40 15 S 62 21, 76 12 S 100 5, 114 13 S 138 21, 152 12 S 178 5, 200 13 L200 40 L0 40 Z"
          fill="#d6e5f2"
        />
        {/* capa del frente, con montoncitos */}
        <path d={`${BORDE} L200 40 L0 40 Z`} fill="url(#nieveFrente)" />
        {/* borde brillante */}
        <path d={BORDE} fill="none" stroke="#ffffff" strokeWidth="1.4" />
      </svg>
      {BRILLOS.map((x, i) => (
        <span
          key={x}
          className="nieve-foto-brillo"
          style={{ left: `${x}%`, bottom: `${14 + ((i * 17) % 30)}%`, animationDelay: `${(i * 0.37) % 2.4}s` }}
        />
      ))}
      <Copo size={11} className="nieve-foto-copo" style={{ left: '24%' }} />
      <Copo size={9} className="nieve-foto-copo" style={{ left: '63%', bottom: '10%' }} />
      <Copo size={10} className="nieve-foto-copo" style={{ left: '86%' }} />
    </div>
  );
};

// ---------- Esferas colgantes (dorado, rojo vino, esmeralda) ----------
const ESFERAS = [
  { right: '6%', largo: 46, tam: 34, c1: '#f7d78a', c2: '#b8862b', retraso: '0s' },
  { right: '17%', largo: 82, tam: 42, c1: '#e0465a', c2: '#7a0a1c', retraso: '0.7s' },
  { right: '29%', largo: 30, tam: 28, c1: '#3fc184', c2: '#0b5232', retraso: '1.3s' },
];

export const EsferasColgantes: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`esferas ${className}`} aria-hidden="true">
    {ESFERAS.map((e, i) => (
      <div key={i} className="esfera" style={{ right: e.right, animationDelay: e.retraso }}>
        <div className="esfera-hilo" style={{ height: e.largo }} />
        <svg width={e.tam} height={e.tam + 6} viewBox="0 0 40 46">
          <defs>
            <radialGradient id={`esf${i}`} cx="35%" cy="40%" r="70%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="0.18" stopColor={e.c1} />
              <stop offset="1" stopColor={e.c2} />
            </radialGradient>
          </defs>
          <rect x="15" y="0" width="10" height="7" rx="1.5" fill="#d9b25c" />
          <circle cx="20" cy="26" r="19" fill={`url(#esf${i})`} />
          <path d="M5 24 Q20 31 35 24" stroke="#fff2c8" strokeOpacity="0.55" strokeWidth="1.2" fill="none" />
        </svg>
      </div>
    ))}
  </div>
);
