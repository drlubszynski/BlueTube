import { useState } from 'react';
import { Check, ChevronDown, Copy, RotateCcw } from 'lucide-react';
import {
  ComputedGeometry,
  DiagramElementFocus,
  getElementHighlightConfig,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';
import { SmoothDrawer } from './SmoothDrawer';

interface BlueSkyTubePanelProps {
  geometry: ComputedGeometry;
  theme: 'light' | 'dark';
  highlightedElement?: DiagramElementFocus | null;
  hasModifiedTube?: boolean;
  onResetTubeParams: () => void;
}

type CopyFieldKey = 'diameter' | 'height' | 'offset' | 'all';

export function BlueSkyTubePanel({
  geometry,
  theme,
  highlightedElement = null,
  hasModifiedTube = false,
  onResetTubeParams,
}: BlueSkyTubePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
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
      aria-label="Blue Sky Plan — Tube de guidage logiciel"
      data-testid="bsp-tube-panel"
      className={`bsp-tube-panel w-full overflow-hidden rounded-xl border shadow-xs ${
        isPanelHighlighted ? 'param-highlight-ring' : ''
      }`}
    >
      {/* Autonomous Section Header — entire bar clickable to toggle drawer */}
      <div
        onClick={() => setIsOpen((o) => !o)}
        className={`bsp-tube-header flex flex-wrap items-center justify-between gap-2 pr-3.5 cursor-pointer select-none ${
          isOpen ? 'border-b' : ''
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
          }}
          aria-expanded={isOpen}
          aria-label="Afficher ou masquer le tube de guidage logiciel"
          data-testid="bsp-tube-toggle"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3.5 py-2 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                isDark ? 'text-sky-300' : 'text-sky-700'
              } ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex flex-wrap items-baseline gap-x-2">
              <span
                role="heading"
                aria-level={3}
                className="text-xs font-bold tracking-tight sm:text-sm"
              >
                Tube de guidage logiciel
              </span>
              <span
                className={`text-[10.5px] font-semibold ${
                  isDark ? 'text-sky-200/85' : 'text-sky-800/85'
                }`}
              >
                Blue Sky Plan
              </span>
            </span>
          </span>

          <span className="bsp-text-secondary hidden sm:inline shrink-0 text-[10.5px] font-medium">
            {blueSkyPlan.hasSleeve
              ? blueSkyPlan.sleeveSeating === 'above'
                ? `Douille (-${blueSkyPlan.sleeveLipThicknessMm.toFixed(1)} mm)`
                : 'Douille à fleur'
              : 'Sans douille (résine)'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0 py-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResetTubeParams();
            }}
            disabled={!hasModifiedTube}
            aria-hidden={!hasModifiedTube}
            tabIndex={hasModifiedTube ? 0 : -1}
            data-testid="bsp-reset-tube-btn"
            className={`bsp-tube-field inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-opacity duration-150 ${
              hasModifiedTube
                ? 'opacity-100 hover:border-sky-500'
                : 'invisible opacity-0 pointer-events-none'
            }`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Réinit.
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyAll();
            }}
            data-testid="bsp-copy-all-btn"
            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-sky-600 bg-sky-600 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-sky-700"
          >
            {copiedKey === 'all' ? (
              <>
                <Check className="h-3 w-3" aria-hidden="true" />
                3 copiées
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden="true" />
                Tout copier
              </>
            )}
          </button>
        </div>
      </div>

      {/* Responsive 3-Column Autonomous Blue Sky Plan Values Drawer */}
      <SmoothDrawer open={isOpen}>
        <div className="space-y-2 px-3.5 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* 1. Diamètre du trou de guidage */}
            <div className="flex flex-col gap-1">
              <div className="truncate text-[10.5px] font-semibold">
                Ø trou guidage
              </div>
              <button
                type="button"
                onClick={() => void copyText(holeStr, 'diameter')}
                title="Diamètre du trou de guidage — cliquer pour copier (mm)"
                className="bsp-tube-field group flex h-8 items-center justify-between rounded-lg border px-2.5 text-xs transition-colors hover:border-sky-500"
              >
                <span
                  data-testid="bsp-hole-diameter"
                  className="font-mono-tabular font-semibold"
                >
                  {holeStr.replace('.', ',')} mm
                </span>
                {copiedKey === 'diameter' ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy
                    className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:text-sky-500 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

            {/* 2. Hauteur */}
            <div className="flex flex-col gap-1">
              <div className="truncate text-[10.5px] font-semibold">
                Hauteur
              </div>
              <button
                type="button"
                onClick={() => void copyText(heightStr, 'height')}
                title="Hauteur — cliquer pour copier (mm)"
                className="bsp-tube-field group flex h-8 items-center justify-between rounded-lg border px-2.5 text-xs transition-colors hover:border-sky-500"
              >
                <span
                  data-testid="bsp-sleeve-height"
                  className="font-mono-tabular font-semibold"
                >
                  {heightStr.replace('.', ',')} mm
                </span>
                {copiedKey === 'height' ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy
                    className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:text-sky-500 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

            {/* 3. Décalage */}
            <div className="flex flex-col gap-1">
              <div className="truncate text-[10.5px] font-semibold">
                <BilingualTerm fr="Décalage" en="Guide Tube Offset" tone={theme} />
              </div>
              <button
                type="button"
                onClick={() => void copyText(offsetStr, 'offset')}
                title="Décalage — cliquer pour copier (mm)"
                className="bsp-tube-field group flex h-8 items-center justify-between rounded-lg border px-2.5 text-xs transition-colors hover:border-sky-500"
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
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy
                    className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:text-sky-500 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>

          {copiedKey && (
            <div
              className={`text-right text-[10.5px] font-semibold ${
                isDark ? 'text-emerald-300' : 'text-emerald-700'
              }`}
            >
              {copiedKey === 'all' ? 'Les 3 valeurs ont été copiées.' : 'Valeur copiée !'}
            </div>
          )}
        </div>
      </SmoothDrawer>
    </section>
  );
}
