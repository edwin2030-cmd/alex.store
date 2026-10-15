import React, { useRef } from 'react';

interface AlexStoreLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onFiveClicks?: () => void;
  className?: string;
}

export const AlexStoreLogo: React.FC<AlexStoreLogoProps> = ({
  size = 'md',
  onFiveClicks,
  className = '',
}) => {
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<any>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!onFiveClicks) return;
    e.stopPropagation();

    clickCountRef.current += 1;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      onFiveClicks();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 1800);
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
      title={onFiveClicks ? 'AlexStore Oficial (5 clics rápidos para gestión)' : 'AlexStore'}
      className={`relative ${dim} rounded-full bg-black p-[2px] shadow-lg border border-[#C59A4D]/50 shrink-0 flex items-center justify-center select-none cursor-pointer active:scale-95 transition-transform overflow-hidden ${className}`}
    >
      <img
        src="/images/logo.png"
        alt="AlexStore"
        className="w-full h-full object-cover rounded-full"
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
