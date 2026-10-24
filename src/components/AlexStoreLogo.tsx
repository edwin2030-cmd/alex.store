import React, { useRef } from 'react';

interface AlexStoreLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onTenClicks?: () => void;
  onFiveClicks?: () => void;
  className?: string;
}

export const AlexStoreLogo: React.FC<AlexStoreLogoProps> = ({
  size = 'md',
  onTenClicks,
  onFiveClicks,
  className = '',
}) => {
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<any>(null);

  const targetCallback = onTenClicks || onFiveClicks;

  const handleClick = (e: React.MouseEvent) => {
    if (!targetCallback) return;
    e.stopPropagation();

    clickCountRef.current += 1;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (window?.navigator?.vibrate) {
      try { window.navigator.vibrate(20); } catch {}
    }

    if (clickCountRef.current >= 10) {
      clickCountRef.current = 0;
      if (window?.navigator?.vibrate) {
        try { window.navigator.vibrate([40, 30, 60]); } catch {}
      }
      targetCallback();
    } else {
      // 2.5 segundos de margen entre clics para permitir alcanzar los 10 toques en celular y PC
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 2500);
    }
  };

  const dim =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'lg'
      ? 'w-16 h-16'
      : size === 'xl'
      ? 'w-20 h-20'
      : 'w-11 h-11';

  return (
    <div
      onClick={handleClick}
      title={targetCallback ? 'AlexStore Oficial (10 clics rápidos para gestión)' : 'AlexStore'}
      className={`relative ${dim} rounded-full bg-black p-[2px] shadow-lg border border-[#C59A4D]/50 shrink-0 flex items-center justify-center select-none cursor-pointer active:scale-90 transition-transform overflow-hidden touch-manipulation ${className}`}
    >
      <img
        src="/images/logo.png"
        alt="AlexStore"
        className="w-full h-full object-cover rounded-full pointer-events-none"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.src.includes('b9d09119')) {
            target.src = '/images/b9d09119-fbbb-4847-9ef7-772399aefb3d.jfif';
          } else if (!target.src.endsWith('logo.svg')) {
            target.src = '/images/logo.svg';
          }
        }}
      />
    </div>
  );
};
