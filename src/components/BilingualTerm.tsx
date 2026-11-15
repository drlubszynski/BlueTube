import { useEffect, useRef, useState } from 'react';

interface BilingualTermProps {
  fr: string;
  en: string;
  className?: string;
  tone?: 'light' | 'dark';
}

export function BilingualTerm({
  fr,
  en,
  className = '',
  tone = 'light',
}: BilingualTermProps) {
  const [showEn, setShowEn] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!showEn) return;
    const handleOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowEn(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowEn(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showEn]);

  return (
    <span ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowEn((prev) => !prev);
        }}
        title={`Cliquer pour afficher le terme anglais : ${en}`}
        aria-expanded={showEn}
        className={`cursor-pointer border-b border-dotted text-left font-inherit transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${
          tone === 'dark'
            ? 'border-slate-400/70 hover:border-sky-300 hover:text-sky-200'
            : 'border-slate-400 hover:border-sky-600 hover:text-sky-800'
        }`}
      >
        {fr}
      </button>
      {showEn && (
        <span
          role="tooltip"
          className="font-mono-tabular pointer-events-none absolute left-0 top-full z-40 mt-1 whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-900 shadow-sm"
        >
          EN : {en}
        </span>
      )}
    </span>
  );
}
