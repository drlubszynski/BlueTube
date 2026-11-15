import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, RotateCcw } from 'lucide-react';
import {
  ComputedGeometry,
  DiagramElementFocus,
  clamp,
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

const MIN_WIDTH = 196;
const MAX_WIDTH = 420;
const MIN_HEIGHT = 196;
const MAX_HEIGHT = 380;

type ResizeEdge = 'right' | 'bottom' | 'corner';

export function BlueSkyTubePanel({
  geometry,
  theme,
  highlightedElement = null,
  onResetTubeParams,
}: BlueSkyTubePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedKey, setCopiedKey] = useState<CopyFieldKey | null>(null);
  const [panelSize, setPanelSize] = useState({ width: 222, height: 204 });
  const panelRef = useRef<HTMLElement | null>(null);
  const resizeStateRef = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    maxW: number;
    maxH: number;
  } | null>(null);

  const { blueSkyPlan } = geometry;
  const highlightConfig = getElementHighlightConfig(highlightedElement);
  const isPanelHighlighted = Boolean(highlightConfig?.params.includes('bspPanel'));

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const st = resizeStateRef.current;
      if (!st) return;
      setPanelSize({
        width:
          st.edge === 'right' || st.edge === 'corner'
            ? Math.round(clamp(st.startW + (e.clientX - st.startX), MIN_WIDTH, st.maxW))
            : st.startW,
        height:
          st.edge === 'bottom' || st.edge === 'corner'
            ? Math.round(clamp(st.startH + (e.clientY - st.startY), MIN_HEIGHT, st.maxH))
            : st.startH,
      });
    };
    const handleUp = () => {
      resizeStateRef.current = null;
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  const handleResizePointerDown = (edge: ResizeEdge) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parent = panelRef.current?.parentElement;
    const maxW = parent ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parent.clientWidth - 24)) : MAX_WIDTH;
    const maxH = parent ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, parent.clientHeight - 24)) : MAX_HEIGHT;
    resizeStateRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
      maxW,
      maxH,
    };
  };

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
      ref={panelRef}
      aria-label="Blue Sky Plan — Tube de guidage logiciel"
      data-testid="bsp-tube-panel"
      style={{
        width: `${panelSize.width}px`,
        ...(isOpen ? { height: `${panelSize.height}px` } : {}),
      }}
      className={`bsp-tube-panel absolute top-0 left-0 z-20 flex flex-col overflow-hidden rounded-br-xl border-r border-b shadow-md select-none ${
        isPanelHighlighted ? 'param-highlight-ring' : ''
      }`}
    >
      {/* Compact Blue Sky Plan Header glued to top-left corner (clickable drawer toggle) */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        data-testid="bsp-tube-toggle"
        className={`bsp-tube-header flex h-9 w-full shrink-0 items-center justify-between gap-1.5 px-2.5 py-1 text-left transition-colors hover:opacity-95 ${
          isOpen ? 'border-b' : ''
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {isOpen ? (
              <ChevronUp
                className={`h-3 w-3 shrink-0 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className={`h-3 w-3 shrink-0 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}
                aria-hidden="true"
              />
            )}
            <h3 className="truncate text-[11px] font-bold tracking-tight leading-none">
              Tube de guidage logiciel
            </h3>
          </div>
          <div
            className={`pl-4 text-[9px] font-semibold leading-tight ${
              isDark ? 'text-sky-200/85' : 'text-sky-800/85'
            }`}
          >
            Blue Sky Plan
          </div>
        </div>
      </button>

      {/* 3 Compact Parameter Rows + 1-Click Copy Footer */}
      {isOpen && (
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 px-2.5 py-2">
        <div className="space-y-1.5">
          {/* 1. Diamètre du trou de guidage */}
          <div className="grid grid-cols-[minmax(0,1fr)_86px] items-center gap-1.5">
            <div className="truncate text-[10px] font-semibold leading-tight">
              <BilingualTerm
                fr="Ø trou guidage"
                en="Guide Hole Diameter"
                tone={theme}
              />
            </div>
            <button
              type="button"
              onClick={() => void copyText(holeStr, 'diameter')}
              title="Diamètre du trou de guidage — cliquer pour copier (mm)"
              className="bsp-tube-field group flex h-6 items-center justify-between rounded border px-1.5 text-[11px] transition-colors hover:border-sky-500"
            >
              <span
                data-testid="bsp-hole-diameter"
                className="font-mono-tabular font-semibold"
              >
                {holeStr.replace('.', ',')} mm
              </span>
              {copiedKey === 'diameter' ? (
                <Check className="h-2.5 w-2.5 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy
                  className="h-2.5 w-2.5 shrink-0 opacity-60 group-hover:text-sky-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {/* 2. Hauteur */}
          <div className="grid grid-cols-[minmax(0,1fr)_86px] items-center gap-1.5">
            <div className="truncate text-[10px] font-medium">
              <BilingualTerm fr="Hauteur" en="Guide Tube Height" tone={theme} />
            </div>
            <button
              type="button"
              onClick={() => void copyText(heightStr, 'height')}
              title="Hauteur — cliquer pour copier (mm)"
              className="bsp-tube-field group flex h-6 items-center justify-between rounded border px-1.5 text-[11px] transition-colors hover:border-sky-500"
            >
              <span
                data-testid="bsp-sleeve-height"
                className="font-mono-tabular font-semibold"
              >
                {heightStr.replace('.', ',')} mm
              </span>
              {copiedKey === 'height' ? (
                <Check className="h-2.5 w-2.5 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy
                  className="h-2.5 w-2.5 shrink-0 opacity-60 group-hover:text-sky-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {/* 3. Décalage */}
          <div className="grid grid-cols-[minmax(0,1fr)_86px] items-center gap-1.5">
            <div className="truncate text-[10px] font-medium">
              <BilingualTerm fr="Décalage" en="Guide Tube Offset" tone={theme} />
            </div>
            <button
              type="button"
              onClick={() => void copyText(offsetStr, 'offset')}
              title="Décalage — cliquer pour copier (mm)"
              className="bsp-tube-field group flex h-6 items-center justify-between rounded border px-1.5 text-[11px] transition-colors hover:border-sky-500"
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
                <Check className="h-2.5 w-2.5 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy
                  className="h-2.5 w-2.5 shrink-0 opacity-60 group-hover:text-sky-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* Formula micro-caption + Blue Sky Plan style action bar */}
        <div className="bsp-border mt-auto space-y-1.5 border-t pt-1.5">
          <div className="flex h-3.5 items-center justify-between gap-1.5 text-[9.5px]">
            <span className="bsp-text-secondary truncate">
              {blueSkyPlan.hasSleeve
                ? blueSkyPlan.sleeveSeating === 'above'
                  ? `Douille (-${blueSkyPlan.sleeveLipThicknessMm.toFixed(1)} mm)`
                  : 'Douille à fleur'
                : 'Sans douille (résine)'}
            </span>
            {copiedKey && (
              <span
                className={`shrink-0 whitespace-nowrap font-semibold ${
                  isDark ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              >
                {copiedKey === 'all' ? '3 copiées' : 'Copié !'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleCopyAll}
              data-testid="bsp-copy-all-btn"
              className="inline-flex h-6.5 items-center justify-center gap-1 rounded border border-sky-600 bg-sky-600 px-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-sky-700"
            >
              {copiedKey === 'all' ? (
                <>
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-2.5 w-2.5" aria-hidden="true" />
                  Copier
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetTubeParams}
              className="bsp-tube-field inline-flex h-6.5 items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-medium transition-colors hover:border-sky-500"
            >
              <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
              Réinit.
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Windows-style Invisible Edge & Corner Resize Zones (No visible grip icon; top-left pinned at 0,0) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner la largeur du panneau Tube de guidage logiciel"
        data-testid="bsp-tube-resize-right"
        data-resize-edge="true"
        onPointerDown={handleResizePointerDown('right')}
        className="absolute top-0 right-0 bottom-3 z-30 w-2.5 cursor-ew-resize transition-colors hover:bg-sky-400/25"
      />
      {isOpen && (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Redimensionner la hauteur du panneau Tube de guidage logiciel"
            data-testid="bsp-tube-resize-bottom"
            data-resize-edge="true"
            onPointerDown={handleResizePointerDown('bottom')}
            className="absolute right-3 bottom-0 left-0 z-30 h-2.5 cursor-ns-resize transition-colors hover:bg-sky-400/25"
          />
          <div
            role="separator"
            aria-label="Redimensionner le panneau Tube de guidage logiciel en diagonale"
            data-testid="bsp-tube-resize-corner"
            data-resize-edge="true"
            onPointerDown={handleResizePointerDown('corner')}
            className="absolute right-0 bottom-0 z-40 h-4 w-4 cursor-nwse-resize transition-colors hover:bg-sky-400/35"
          />
        </>
      )}
    </section>
  );
}
