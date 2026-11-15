import { useState } from 'react';
import { Check, ChevronDown, Copy, RotateCcw } from 'lucide-react';
import {
  ComputedGeometry,
  DiagramElementFocus,
  getElementHighlightConfig,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

interface BlueSkyTubePanelProps {
  geometry: ComputedGeometry;
  theme: 'light' | 'dark';
  highlightedElement?: DiagramElementFocus | null;
  onResetTubeParams: () => void;
}

type CopyFieldKey = 'diameter' | 'height' | 'offset' | 'all';

export function BlueSkyTubePanel({
  geometry,
  theme,
  highlightedElement = null,
  onResetTubeParams,
}: BlueSkyTubePanelProps) {
  const [copiedKey, setCopiedKey] = useState<CopyFieldKey | null>(null);
  const { blueSkyPlan } = geometry;
  const highlightConfig = getElementHighlightConfig(highlightedElement);
  const isPanelHighlighted = Boolean(highlightConfig?.params.includes('bspPanel'));

  const copyText = async (text: string, key: CopyFieldKey) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    }
  };

  const holeStr = blueSkyPlan.guideHoleDiameterMm.toFixed(2);
  const heightStr = blueSkyPlan.sleeveHeightMm.toFixed(2);
  const offsetStr = blueSkyPlan.guideOffsetMm.toFixed(2);

  const handleCopyAll = () => {
    const summary = `Diamètre du trou de guidage: ${holeStr} mm | Hauteur: ${heightStr} mm | Décalage: ${offsetStr} mm`;
    void copyText(summary, 'all');
  };

  const isDark = theme === 'dark';

  return (
    <section
      aria-label="Blue Sky Plan — Tube de guidage de logiciel"
      data-testid="bsp-tube-panel"
      className={`bsp-tube-panel flex flex-col justify-between overflow-hidden rounded-xl border ${
        isPanelHighlighted ? 'param-highlight-ring' : ''
      }`}
    >
      {/* Blue Sky Plan Collapsible-Style Header */}
      <div className="bsp-tube-header flex min-h-[44px] items-center justify-between gap-2 border-b px-3.5 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}
              aria-hidden="true"
            />
            <h2 className="truncate text-xs font-bold tracking-tight">
              <BilingualTerm
                fr="Tube de guidage de logiciel"
                en="Software Guide Tube"
                tone={theme}
              />
            </h2>
          </div>
          <div
            className={`pl-5 text-[10px] font-semibold ${
              isDark ? 'text-sky-200/85' : 'text-sky-800/85'
            }`}
          >
            Blue Sky Plan
          </div>
        </div>
      </div>

      {/* 3 Parameter Rows Matching Blue Sky Plan + 1-Click Copy */}
      <div className="space-y-2.5 p-3.5">
        {/* 1. Diamètre du trou de guidage */}
        <div className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-2">
          <div className="text-[11px] font-semibold leading-tight">
            <BilingualTerm
              fr="Diamètre du trou de guidage"
              en="Guide Hole Diameter"
              tone={theme}
            />
          </div>
          <button
            type="button"
            onClick={() => void copyText(holeStr, 'diameter')}
            title="Cliquer pour copier la valeur (mm)"
            className="bsp-tube-field group flex h-7 items-center justify-between rounded border px-2 text-xs transition-colors hover:border-sky-500"
          >
            <span
              data-testid="bsp-hole-diameter"
              className="font-mono-tabular font-semibold"
            >
              {holeStr.replace('.', ',')} mm
            </span>
            {copiedKey === 'diameter' ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" aria-hidden="true" />
            ) : (
              <Copy
                className="h-3 w-3 opacity-60 group-hover:text-sky-500 group-hover:opacity-100 shrink-0"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* 2. Hauteur */}
        <div className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-2">
          <div className="text-[11px] font-medium">
            <BilingualTerm fr="Hauteur" en="Guide Tube Height" tone={theme} />
          </div>
          <button
            type="button"
            onClick={() => void copyText(heightStr, 'height')}
            title="Cliquer pour copier la valeur (mm)"
            className="bsp-tube-field group flex h-7 items-center justify-between rounded border px-2 text-xs transition-colors hover:border-sky-500"
          >
            <span
              data-testid="bsp-sleeve-height"
              className="font-mono-tabular font-semibold"
            >
              {heightStr.replace('.', ',')} mm
            </span>
            {copiedKey === 'height' ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" aria-hidden="true" />
            ) : (
              <Copy
                className="h-3 w-3 opacity-60 group-hover:text-sky-500 group-hover:opacity-100 shrink-0"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* 3. Décalage */}
        <div className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-2">
          <div className="text-[11px] font-medium">
            <BilingualTerm fr="Décalage" en="Guide Tube Offset" tone={theme} />
          </div>
          <button
            type="button"
            onClick={() => void copyText(offsetStr, 'offset')}
            title="Cliquer pour copier la valeur (mm)"
            className="bsp-tube-field group flex h-7 items-center justify-between rounded border px-2 text-xs transition-colors hover:border-sky-500"
          >
            <span
              data-testid="bsp-guide-offset"
              className={`font-mono-tabular font-bold ${
                isDark ? 'text-sky-300' : 'text-sky-700'
              }`}
            >
              {offsetStr.replace('.', ',')} mm
            </span>
            {copiedKey === 'offset' ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" aria-hidden="true" />
            ) : (
              <Copy
                className="h-3 w-3 opacity-60 group-hover:text-sky-500 group-hover:opacity-100 shrink-0"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* Formula micro-caption + Blue Sky Plan style action bar */}
        <div className="bsp-border border-t pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10.5px]">
            <span className="bsp-text-secondary truncate">
              {blueSkyPlan.hasSleeve
                ? blueSkyPlan.sleeveSeating === 'above'
                  ? `Douille au-dessus (-${blueSkyPlan.sleeveLipThicknessMm.toFixed(1)} mm)`
                  : 'Douille à fleur (0 mm déduit)'
                : 'Sans douille (résine intégrale)'}
            </span>
            {copiedKey && (
              <span
                className={`font-semibold shrink-0 ${
                  isDark ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              >
                {copiedKey === 'all' ? '3 valeurs copiées' : 'Copié !'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleCopyAll}
              data-testid="bsp-copy-all-btn"
              className="inline-flex items-center justify-center gap-1 rounded border border-sky-600 bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-sky-700"
            >
              {copiedKey === 'all' ? (
                <>
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  Copier en 1 clic
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetTubeParams}
              className="bsp-tube-field inline-flex items-center justify-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors hover:border-sky-500"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Réinit.
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
