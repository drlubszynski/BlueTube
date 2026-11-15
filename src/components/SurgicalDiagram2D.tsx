import React, { useCallback, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ComputedGeometry,
  DiagramElementFocus,
  HighlightableParamKey,
  ResettableParamKey,
  SimulationParams,
  VisibilityFilters,
  clamp,
  getElementHighlightConfig,
  pickOptimalGuidedOffset,
  pickOptimalPilotLength,
  roundTo,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

interface SurgicalDiagram2DProps {
  params: SimulationParams;
  geometry: ComputedGeometry;
  filters: VisibilityFilters;
  highlightedElement?: DiagramElementFocus | null;
  onSelectElement?: (element: DiagramElementFocus | null) => void;
  onChangeParams: (patch: Partial<SimulationParams>) => void;
  onResetParam: (key: ResettableParamKey) => void;
  onToggleFilter: (key: keyof VisibilityFilters) => void;
}

type DragTarget =
  | 'guideTop'
  | 'guideBottom'
  | 'gingivaTop'
  | 'implantPlatform'
  | 'implantApex'
  | null;

const SVG_WIDTH = 680;
const SVG_HEIGHT = 760;
const CX = 340;
const PX_PER_MM = 12.5;
const Y_CREST_PX = 475;

function mmToY(mmFromCrest: number): number {
  return Y_CREST_PX + mmFromCrest * PX_PER_MM;
}

interface DimensionControlProps {
  id: string;
  labelFr: string;
  labelEn: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accentColor: string;
  side: 'left' | 'right';
  warning?: boolean;
  highlighted?: boolean;
  onChange: (val: number) => void;
  onReset: () => void;
}

function DimensionControlCard({
  id,
  labelFr,
  labelEn,
  sublabel,
  value,
  min,
  max,
  step,
  accentColor,
  side,
  warning,
  highlighted,
  onChange,
  onReset,
}: DimensionControlProps) {
  const handleStep = (dir: -1 | 1) => {
    const next = clamp(roundTo(value + dir * step, 2), min, max);
    onChange(next);
  };

  return (
    <div
      className={`relative rounded-lg border p-2 transition-all ${
        highlighted
          ? 'param-highlight-ring'
          : warning
            ? 'border-amber-300 bg-amber-50/70'
            : 'border-slate-200 bg-white/95 hover:border-slate-300'
      }`}
    >
      {/* Connector indicator dot toward SVG dimension */}
      <span
        aria-hidden="true"
        className={`hidden lg:block absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full border border-white shadow-xs ${
          side === 'left' ? '-right-1' : '-left-1'
        }`}
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <label htmlFor={id} className="block truncate text-[11px] font-semibold text-slate-800">
            <BilingualTerm fr={labelFr} en={labelEn} />
          </label>
          {sublabel && <span className="block truncate text-[9.5px] text-slate-500">{sublabel}</span>}
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label={`Réinitialiser ${labelFr}`}
          title={`Réinitialiser ${labelFr}`}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      </div>

      {/* Compact Stepper + Direct Numeric Input */}
      <div className="mt-1 flex items-center">
        <div className="flex w-full items-center justify-between rounded border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            aria-label={`Diminuer ${labelFr}`}
            className="flex h-5 w-5 items-center justify-center rounded-l text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          >
            <Minus className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
          <div className="flex items-baseline justify-center">
            <input
              id={id}
              type="number"
              min={min}
              max={max}
              step={step}
              value={roundTo(value, 2)}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                if (!Number.isNaN(parsed)) {
                  onChange(clamp(roundTo(parsed, 2), min, max));
                }
              }}
              className="no-spin font-mono-tabular w-10 bg-transparent py-0.5 text-right text-[11px] font-semibold text-slate-900 focus:outline-none"
            />
            <span className="font-mono-tabular pl-0.5 pr-1 text-[9.5px] text-slate-400">mm</span>
          </div>
          <button
            type="button"
            onClick={() => handleStep(1)}
            aria-label={`Augmenter ${labelFr}`}
            className="flex h-5 w-5 items-center justify-center rounded-r text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          >
            <Plus className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        aria-label={`Curseur ${labelFr}`}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="cad-slider mt-1.5 w-full"
      />
    </div>
  );
}

export function SurgicalDiagram2D({
  params,
  geometry,
  filters,
  highlightedElement = null,
  onSelectElement,
  onChangeParams,
  onResetParam,
  onToggleFilter,
}: SurgicalDiagram2DProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  const highlightConfig = getElementHighlightConfig(highlightedElement);
  const isHighlighted = (key: HighlightableParamKey) =>
    Boolean(highlightConfig?.params.includes(key));
  const toggleSelect = (el: DiagramElementFocus) => {
    if (!onSelectElement) return;
    onSelectElement(highlightedElement === el ? null : el);
  };

  // Convert vertical planes from mm to SVG pixels
  const yCrest = mmToY(geometry.yBoneCrest);
  const yGingiva = mmToY(geometry.yGingivaTop);
  const yPlatform = mmToY(geometry.yImplantPlatform);
  const yApex = mmToY(geometry.yImplantApex);
  const yGuideTop = mmToY(geometry.yGuideTop);
  const yResinGuideTop = mmToY(geometry.yResinGuideTop);
  const yGuideBottom = mmToY(geometry.yGuideBottom);
  const yDrillTip = mmToY(geometry.yDrillTip);

  // Widths in pixels (implant always visually wider than drill)
  const implantW = params.implantDiameter * PX_PER_MM;
  const wellW = geometry.wellDiameter * PX_PER_MM;
  const canonW = geometry.canonDiameter * PX_PER_MM;
  const activeDrillW = geometry.drillActiveDiameter * PX_PER_MM;
  const prevDrillW = geometry.drillPreviousDiameter * PX_PER_MM;
  const sleeveWallPx = Math.max(4, geometry.blueSkyPlan.sleeveWallThicknessMm * PX_PER_MM);
  const sleeveOuterW = wellW + 2 * sleeveWallPx;

  // Contra-angle geometry above drill shank
  const shankHeightPx = 3.2 * PX_PER_MM;
  const headHeightPx = params.handpieceHeadHeight * PX_PER_MM;
  const yStopTop = yGuideTop - geometry.blueSkyPlan.drillStopThicknessMm * PX_PER_MM;
  const yShankTop = yStopTop - shankHeightPx;
  const yHeadTop = yShankTop - headHeightPx;

  // Deviation cone points
  const yConePivot = (yGuideTop + yGuideBottom) / 2;
  const halfPlayPx = (geometry.diametralClearance / 2) * PX_PER_MM;
  const tanTheta = Math.tan((geometry.deviationAngleDeg * Math.PI) / 180);
  const coneDistToApex = Math.max(20, yDrillTip - yConePivot + 22);
  const coneHalfSpreadBottom = halfPlayPx + coneDistToApex * tanTheta;

  const clientYToMmFromCrest = useCallback((clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.height <= 0) return null;
    const svgY = ((clientY - rect.top) / rect.height) * SVG_HEIGHT;
    return (svgY - Y_CREST_PX) / PX_PER_MM;
  }, []);

  const handlePointerDown = (target: DragTarget) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragTarget(target);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragTarget) return;
    const mmFromCrest = clientYToMmFromCrest(e.clientY);
    if (mmFromCrest === null) return;

    if (dragTarget === 'gingivaTop') {
      const nextGingiva = clamp(roundTo(-mmFromCrest, 1), 0.5, 6.0);
      onChangeParams({ gingivaThickness: nextGingiva });
    } else if (dragTarget === 'implantPlatform') {
      const nextSub = clamp(roundTo(mmFromCrest, 1), 0.0, 3.0);
      onChangeParams({ subcrestalDepth: nextSub });
    } else if (dragTarget === 'implantApex') {
      const nextLen = clamp(roundTo(mmFromCrest - params.subcrestalDepth, 1), 6.0, 16.0);
      if (geometry.isPilotKit) {
        onChangeParams({
          implantLength: nextLen,
          pilotDrillLength: pickOptimalPilotLength(
            nextLen,
            geometry.activeKit.userDefaults.availableLengthsMm,
            params.subcrestalDepth,
            params.gingivaThickness,
            params.guideHeight,
          ),
        });
      } else {
        onChangeParams({
          implantLength: nextLen,
          offsetOverride: pickOptimalGuidedOffset(
            params.subcrestalDepth,
            params.gingivaThickness,
            params.guideHeight,
            params.hasSleeve,
            geometry.activeKit.id,
            nextLen,
            geometry.activeKit.factoryDefaults.offsetMm,
            geometry.activeKit.userDefaults.availableLengthsMm,
          ),
        });
      }
    } else if (dragTarget === 'guideTop') {
      const desiredOffset = clamp(roundTo(params.subcrestalDepth - mmFromCrest, 1), 4.0, 20.0);
      if (geometry.isPilotKit) {
        onChangeParams({
          pilotDrillLength: clamp(roundTo(desiredOffset + params.implantLength, 1), 12.0, 32.0),
        });
      } else {
        onChangeParams({ offsetOverride: desiredOffset });
      }
    } else if (dragTarget === 'guideBottom') {
      const nextH = clamp(roundTo(mmFromCrest - geometry.yGuideTop, 1), 1.5, 8.0);
      onChangeParams({ guideHeight: nextH });
    }
  };

  const handlePointerUp = () => {
    setDragTarget(null);
  };

  const handleOffsetChange = (val: number) => {
    if (geometry.isPilotKit) {
      onChangeParams({
        pilotDrillLength: clamp(roundTo(val + params.implantLength, 1), 12.0, 32.0),
      });
    } else {
      onChangeParams({ offsetOverride: val });
    }
  };

  const handleDrillingLengthChange = (val: number) => {
    if (geometry.isPilotKit) {
      onChangeParams({ pilotDrillLength: val });
    } else {
      const newOffset = clamp(roundTo(val - params.implantLength, 1), 4.0, 20.0);
      onChangeParams({ offsetOverride: newOffset });
    }
  };

  const renderImplantThreads = () => {
    const topY = yPlatform + 6;
    const bottomY = yApex - 6;
    const pitch = 7.5;
    const threads: React.ReactNode[] = [];
    for (let ty = topY; ty < bottomY; ty += pitch) {
      const taperFactor = ty > yApex - 24 ? 0.84 : 1;
      const halfW = (implantW / 2) * taperFactor;
      threads.push(
        <path
          key={ty}
          d={`M ${CX - halfW - 1.5} ${ty} L ${CX - halfW + 2.5} ${ty + 2.5} L ${CX + halfW - 2.5} ${ty + 2.5} L ${CX + halfW + 1.5} ${ty}`}
          fill="none"
          stroke="#475569"
          strokeWidth="1.2"
          opacity="0.7"
        />,
      );
    }
    return threads;
  };

  const renderDrillFlutes = (topY: number, bottomY: number, widthPx: number, strokeColor: string) => {
    const lines: React.ReactNode[] = [];
    const step = 12;
    const halfW = widthPx / 2;
    for (let fy = topY + 6; fy < bottomY - 12; fy += step) {
      lines.push(
        <line
          key={fy}
          x1={CX - halfW + 1}
          y1={fy}
          x2={CX + halfW - 1}
          y2={fy + 9}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.65"
        />,
      );
    }
    return lines;
  };

  const filterList: { key: keyof VisibilityFilters; label: string }[] = [
    { key: 'diagramControls', label: 'Cotes & curseurs sur schéma' },
    { key: 'handpiece', label: 'Tête du contre-angle' },
    { key: 'deviationCone', label: 'Cône de déviation' },
    { key: 'boneAndGingiva', label: 'Os alvéolaire & Gencive' },
    { key: 'adjacentTeeth', label: 'Dents adjacentes' },
    { key: 'surgicalGuide', label: 'Guide chirurgical' },
    { key: 'sleeve', label: 'Douille métallique' },
    { key: 'implant', label: 'Implant' },
    { key: 'drillAndStop', label: 'Foret & Butée' },
  ];

  const dragStatusLabel =
    dragTarget === 'guideTop'
      ? `Décalage total : ${geometry.offsetCao.toFixed(1)} mm`
      : dragTarget === 'guideBottom'
        ? `Hauteur guidage : ${geometry.guideHeight.toFixed(1)} mm`
        : dragTarget === 'gingivaTop'
          ? `Muqueuse : ${params.gingivaThickness.toFixed(1)} mm`
          : dragTarget === 'implantPlatform'
            ? `Enfouissement : ${params.subcrestalDepth.toFixed(1)} mm`
            : dragTarget === 'implantApex'
              ? `Longueur implant : ${params.implantLength.toFixed(1)} mm`
              : null;

  const premolarCejY = yGingiva + 4;
  const molarCejY = yGingiva + 4;

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs ${
        filters.fullscreen ? 'fixed inset-3 z-50 overflow-auto shadow-2xl' : ''
      }`}
    >
      {/* Diagram Toolbar (Fixed height) */}
      <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
              Coupe 2D à l&apos;échelle
            </h2>
            {highlightConfig && (
              <button
                type="button"
                data-testid="active-element-chip"
                onClick={() => onSelectElement?.(null)}
                className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10.5px] font-semibold text-sky-800 hover:bg-sky-100"
                title="Cliquer pour effacer la surbrillance"
              >
                <span>{highlightConfig.label}</span>
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
          {!highlightConfig && (
            <div className="hidden sm:block truncate text-[10.5px] text-slate-500">
              {dragStatusLabel ?? 'Cliquez sur un élément du schéma pour illuminer ses paramètres'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onToggleFilter('diagramControls')}
            aria-pressed={filters.diagramControls}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filters.diagramControls
                ? 'border-sky-200 bg-sky-50 text-sky-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Cotes sur schéma
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFiltersMenu((v) => !v)}
              aria-expanded={showFiltersMenu}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
            >
              {showFiltersMenu ? (
                <EyeOff className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              )}
              Calques
            </button>

            {showFiltersMenu && (
              <div className="absolute right-0 z-30 mt-1.5 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-1.5 px-2 text-[11px] font-semibold text-slate-500">
                  Affichage des calques
                </div>
                <div className="space-y-0.5">
                  {filterList.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={filters[item.key]}
                        onChange={() => onToggleFilter(item.key)}
                        className="h-3.5 w-3.5 accent-sky-600"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleFilter('fullscreen')}
            aria-label={filters.fullscreen ? 'Quitter le mode plein écran' : 'Mode plein écran'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
          >
            {filters.fullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                Réduire
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                Plein écran
              </>
            )}
          </button>
        </div>
      </div>

      {/* LOCKED MAIN STAGE: compact ergonomic slider rails positioned outside left/right dimensions */}
      <div
        className={`grid items-start gap-2.5 p-2.5 sm:p-3 ${
          filters.diagramControls
            ? 'grid-cols-1 lg:grid-cols-[152px_minmax(0,1fr)_152px]'
            : 'grid-cols-1'
        }`}
      >
        {/* Left Ergonomic Dimension Rail (to the LEFT of the left-side CAD dimensions) */}
        {filters.diagramControls && (
          <div className="order-2 flex flex-col gap-2.5 lg:order-1 lg:h-[465px] lg:justify-between">
            <DimensionControlCard
              id="diag-offset-cao"
              labelFr="Décalage total"
              labelEn="Total Offset"
              sublabel="Col → Butée"
              value={geometry.offsetCao}
              min={4.0}
              max={20.0}
              step={0.5}
              accentColor="#0284C7"
              side="left"
              highlighted={isHighlighted('offsetCao')}
              onChange={handleOffsetChange}
              onReset={() => onResetParam('offsetCao')}
            />
            <DimensionControlCard
              id="diag-guide-height"
              labelFr="Hauteur guidage"
              labelEn="Guide Height"
              sublabel="Hauteur du puits"
              value={params.guideHeight}
              min={1.5}
              max={8.0}
              step={0.1}
              accentColor="#0EA5E9"
              side="left"
              warning={params.guideHeight < 3.0}
              highlighted={isHighlighted('guideHeight')}
              onChange={(v) => onChangeParams({ guideHeight: v })}
              onReset={() => onResetParam('guideHeight')}
            />
            <DimensionControlCard
              id="diag-drilling-length"
              labelFr="Longueur forage"
              labelEn="Drilling Length"
              sublabel="Sous butée → Pointe"
              value={geometry.drillUsefulLength}
              min={12.0}
              max={32.0}
              step={0.1}
              accentColor="#334155"
              side="left"
              highlighted={isHighlighted('drillUsefulLength')}
              onChange={handleDrillingLengthChange}
              onReset={() => onResetParam('drillUsefulLength')}
            />
          </div>
        )}

        {/* Central Locked-Height Scaled 2D SVG Cross-Section */}
        <div
          className={`order-1 flex items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 p-1 lg:order-2 ${
            filters.fullscreen ? 'h-[calc(100vh-140px)]' : 'h-[400px] lg:h-[465px]'
          }`}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className={`h-full w-full select-none ${
              dragTarget ? 'cursor-ns-resize' : 'cursor-crosshair'
            }`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            data-testid="surgical-svg"
            role="img"
            aria-label="Schéma 2D interactif de coupe implantaire guidée"
          >
            <defs>
              <pattern id="cadGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path
                  d="M 25 0 L 0 0 0 25"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="0.6"
                />
              </pattern>

              <pattern id="bonePattern" width="18" height="18" patternUnits="userSpaceOnUse">
                <rect width="18" height="18" fill="#F1ECE1" />
                <circle cx="4" cy="5" r="1.4" fill="#DDD3BE" />
                <circle cx="13" cy="11" r="1.8" fill="#E3DAC7" />
                <path d="M 0 14 Q 9 10 18 15" fill="none" stroke="#DFD5C0" strokeWidth="0.8" />
              </pattern>

              <linearGradient id="titaniumGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="30%" stopColor="#CBD5E1" />
                <stop offset="60%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              <linearGradient id="steelShankGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="35%" stopColor="#F1F5F9" />
                <stop offset="70%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>

              <linearGradient id="handpieceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="38%" stopColor="#E2E8F0" />
                <stop offset="80%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>

              <linearGradient id="dlcBlackGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="35%" stopColor="#475569" />
                <stop offset="75%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#090D16" />
              </linearGradient>

              <linearGradient id="enamelGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="55%" stopColor="#F6F2E9" />
                <stop offset="100%" stopColor="#E4DCC7" />
              </linearGradient>

              <linearGradient id="rootGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F2E8D2" />
                <stop offset="65%" stopColor="#E8D9B8" />
                <stop offset="100%" stopColor="#D7C39B" />
              </linearGradient>

              <linearGradient id="deviationConeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.28" />
              </linearGradient>
            </defs>

            <rect
              x="0"
              y="0"
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              fill="url(#cadGrid)"
              onClick={() => onSelectElement?.(null)}
            />

            <line
              x1={CX}
              y1="20"
              x2={CX}
              y2={SVG_HEIGHT - 20}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="6 4"
            />

            {/* 1. ALVEOLAR BONE & GINGIVA */}
            {filters.boneAndGingiva && (
              <g data-testid="layer-bone-gingiva">
                <g
                  data-testid="svg-click-subcrestal"
                  aria-label="Sélectionner l'os alvéolaire et l'enfouissement sous-crestal"
                  className={`svg-clickable-element ${
                    highlightedElement === 'subcrestal' ? 'svg-element-selected' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect('subcrestal');
                  }}
                >
                  <title>Cliquer pour illuminer l&apos;enfouissement sous-crestal</title>
                  <path
                    d={`M 130 ${yCrest} L 550 ${yCrest} L 550 740 L 130 740 Z`}
                    fill="url(#bonePattern)"
                  />
                  <rect
                    x="130"
                    y={yCrest}
                    width="420"
                    height="10"
                    fill="#DFD6C3"
                    stroke={highlightedElement === 'subcrestal' ? '#7C3AED' : '#B8AC93'}
                    strokeWidth={highlightedElement === 'subcrestal' ? '1.8' : '1'}
                  />
                  <rect
                    x={CX - implantW / 2 - 1}
                    y={yCrest}
                    width={implantW + 2}
                    height={Math.max(0, yApex - yCrest)}
                    fill="#FFFFFF"
                    opacity="0.55"
                  />
                </g>
                <g
                  data-testid="svg-click-gingiva"
                  aria-label="Sélectionner la gencive (épaisseur muqueuse)"
                  className={`svg-clickable-element ${
                    highlightedElement === 'gingiva' ? 'svg-element-selected' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect('gingiva');
                  }}
                >
                  <title>Cliquer pour illuminer l&apos;épaisseur muqueuse</title>
                  <path
                    d={`M 130 ${yGingiva}
                        Q 210 ${yGingiva - 4} 260 ${yGingiva + 2}
                        Q 305 ${yGingiva + 4} ${CX - wellW / 2 - 14} ${yGingiva}
                        L ${CX + wellW / 2 + 14} ${yGingiva}
                        Q 375 ${yGingiva + 4} 420 ${yGingiva + 2}
                        Q 470 ${yGingiva - 4} 550 ${yGingiva}
                        L 550 ${yCrest} L 130 ${yCrest} Z`}
                    fill="#F3A6A5"
                    fillOpacity={highlightedElement === 'gingiva' ? '0.82' : '0.62'}
                    stroke={highlightedElement === 'gingiva' ? '#E11D48' : '#D97A78'}
                    strokeWidth={highlightedElement === 'gingiva' ? '2.2' : '1.2'}
                  />
                </g>
              </g>
            )}

            {/* 2. ADJACENT TEETH (Mesial Premolar & Distal Molar) */}
            {filters.adjacentTeeth && (
              <g data-testid="layer-adjacent-teeth" pointerEvents="none">
                <g data-testid="tooth-premolar">
                  <path
                    d={`M 188 ${premolarCejY}
                        C 182 ${premolarCejY - 30}, 178 ${yCrest - 78}, 190 ${yCrest - 98}
                        C 198 ${yCrest - 107}, 205 ${yCrest - 102}, 212 ${yCrest - 94}
                        C 219 ${yCrest - 102}, 228 ${yCrest - 104}, 235 ${yCrest - 94}
                        C 246 ${yCrest - 76}, 244 ${premolarCejY - 28}, 234 ${premolarCejY}
                        C 232 ${yCrest + 42}, 222 ${yCrest + 98}, 210 ${yCrest + 136}
                        C 206 ${yCrest + 140}, 202 ${yCrest + 138}, 199 ${yCrest + 132}
                        C 191 ${yCrest + 92}, 187 ${yCrest + 40}, 188 ${premolarCejY} Z`}
                    fill="url(#rootGrad)"
                    stroke="#B3A387"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M 188 ${premolarCejY}
                        C 182 ${premolarCejY - 30}, 178 ${yCrest - 78}, 190 ${yCrest - 98}
                        C 198 ${yCrest - 107}, 205 ${yCrest - 102}, 212 ${yCrest - 94}
                        C 219 ${yCrest - 102}, 228 ${yCrest - 104}, 235 ${yCrest - 94}
                        C 246 ${yCrest - 76}, 244 ${premolarCejY - 28}, 234 ${premolarCejY}
                        Q 211 ${premolarCejY + 6} 188 ${premolarCejY} Z`}
                    fill="url(#enamelGrad)"
                    stroke="#BFB59E"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M 204 ${yCrest - 94} Q 212 ${yCrest - 88} 220 ${yCrest - 94}`}
                    fill="none"
                    stroke="#CFC4AC"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M 204 ${yCrest - 52}
                        Q 206 ${yCrest - 64} 210 ${yCrest - 56}
                        Q 216 ${yCrest - 62} 218 ${yCrest - 50}
                        C 217 ${yCrest - 22}, 212 ${yCrest + 38}, 206 ${yCrest + 108}
                        C 203 ${yCrest + 38}, 203 ${yCrest - 20}, 204 ${yCrest - 52} Z`}
                    fill="#DF9C99"
                    opacity="0.45"
                  />
                </g>

                <g data-testid="tooth-molar">
                  <path
                    d={`M 438 ${molarCejY}
                        C 430 ${molarCejY - 28}, 429 ${yCrest - 78}, 442 ${yCrest - 98}
                        C 451 ${yCrest - 106}, 461 ${yCrest - 100}, 470 ${yCrest - 93}
                        C 479 ${yCrest - 101}, 489 ${yCrest - 104}, 498 ${yCrest - 95}
                        C 507 ${yCrest - 101}, 516 ${yCrest - 98}, 521 ${yCrest - 86}
                        C 526 ${yCrest - 62}, 522 ${molarCejY - 22}, 513 ${molarCejY}
                        C 517 ${yCrest + 45}, 516 ${yCrest + 96}, 509 ${yCrest + 132}
                        C 506 ${yCrest + 138}, 500 ${yCrest + 136}, 498 ${yCrest + 128}
                        C 492 ${yCrest + 92}, 486 ${yCrest + 52}, 477 ${yCrest + 44}
                        C 468 ${yCrest + 52}, 465 ${yCrest + 92}, 460 ${yCrest + 130}
                        C 458 ${yCrest + 137}, 452 ${yCrest + 137}, 450 ${yCrest + 130}
                        C 443 ${yCrest + 95}, 439 ${yCrest + 46}, 438 ${molarCejY} Z`}
                    fill="url(#rootGrad)"
                    stroke="#B3A387"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M 438 ${molarCejY}
                        C 430 ${molarCejY - 28}, 429 ${yCrest - 78}, 442 ${yCrest - 98}
                        C 451 ${yCrest - 106}, 461 ${yCrest - 100}, 470 ${yCrest - 93}
                        C 479 ${yCrest - 101}, 489 ${yCrest - 104}, 498 ${yCrest - 95}
                        C 507 ${yCrest - 101}, 516 ${yCrest - 98}, 521 ${yCrest - 86}
                        C 526 ${yCrest - 62}, 522 ${molarCejY - 22}, 513 ${molarCejY}
                        Q 476 ${molarCejY + 7} 438 ${molarCejY} Z`}
                    fill="url(#enamelGrad)"
                    stroke="#BFB59E"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M 458 ${yCrest - 92} Q 470 ${yCrest - 86} 482 ${yCrest - 92} M 486 ${yCrest - 92} Q 498 ${yCrest - 86} 508 ${yCrest - 90}`}
                    fill="none"
                    stroke="#CFC4AC"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M 454 ${yCrest - 48}
                        Q 458 ${yCrest - 60} 465 ${yCrest - 52}
                        Q 478 ${yCrest - 56} 492 ${yCrest - 52}
                        Q 498 ${yCrest - 60} 503 ${yCrest - 46}
                        C 504 ${yCrest - 18}, 504 ${yCrest + 44}, 504 ${yCrest + 106}
                        L 499 ${yCrest + 106}
                        C 496 ${yCrest + 52}, 492 ${yCrest + 24}, 477 ${yCrest + 22}
                        C 464 ${yCrest + 24}, 460 ${yCrest + 52}, 457 ${yCrest + 106}
                        L 452 ${yCrest + 106}
                        C 452 ${yCrest + 44}, 452 ${yCrest - 18}, 454 ${yCrest - 48} Z`}
                    fill="#DF9C99"
                    opacity="0.45"
                  />
                </g>
              </g>
            )}

            {/* 3. DEVIATION CONE */}
            {filters.deviationCone && (
              <g data-testid="layer-deviation-cone">
                <polygon
                  points={`
                    ${CX - halfPlayPx},${yConePivot}
                    ${CX + halfPlayPx},${yConePivot}
                    ${CX + coneHalfSpreadBottom},${yConePivot + coneDistToApex}
                    ${CX - coneHalfSpreadBottom},${yConePivot + coneDistToApex}
                  `}
                  fill="url(#deviationConeGrad)"
                  stroke="#F59E0B"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <rect
                  x={CX - 66}
                  y={yConePivot + coneDistToApex + 5}
                  width="132"
                  height="18"
                  rx="4"
                  fill="#FFFBEB"
                  stroke="#FDE68A"
                />
                <text
                  x={CX}
                  y={yConePivot + coneDistToApex + 17}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#B45309"
                  fontFamily="JetBrains Mono, monospace"
                >
                  ±{geometry.apicalDeviationMm.toFixed(2)} mm ({geometry.deviationAngleDeg.toFixed(1)}°)
                </text>
              </g>
            )}

            {/* 4. IMPLANT */}
            {filters.implant && (
              <g
                data-testid="svg-click-implant"
                aria-label="Sélectionner l'implant (diamètre et longueur)"
                opacity="0.88"
                className={`svg-clickable-element ${
                  highlightedElement === 'implant' ? 'svg-element-selected' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect('implant');
                }}
              >
                <title>Cliquer pour illuminer les cotes de l&apos;implant</title>
                <path
                  d={`M ${CX - implantW / 2} ${yPlatform}
                      L ${CX + implantW / 2} ${yPlatform}
                      L ${CX + implantW / 2} ${yApex - 18}
                      Q ${CX + implantW / 2 - 3} ${yApex - 2} ${CX + implantW * 0.3} ${yApex}
                      L ${CX - implantW * 0.3} ${yApex}
                      Q ${CX - implantW / 2 + 3} ${yApex - 2} ${CX - implantW / 2} ${yApex - 18} Z`}
                  fill="#CCFBF1"
                  fillOpacity="0.48"
                  stroke={highlightedElement === 'implant' ? '#0284C7' : '#0F766E'}
                  strokeWidth={highlightedElement === 'implant' ? '2.3' : '1.5'}
                />
                <rect
                  x={CX - implantW / 2 - 1}
                  y={yPlatform}
                  width={implantW + 2}
                  height="5"
                  rx="1"
                  fill="#99F6E4"
                  stroke="#0F766E"
                  strokeWidth="1.1"
                />
                {renderImplantThreads()}
                <polygon
                  points={`${CX - implantW * 0.24},${yPlatform} ${CX + implantW * 0.24},${yPlatform} ${CX + implantW * 0.14},${yPlatform + 18} ${CX - implantW * 0.14},${yPlatform + 18}`}
                  fill="#0F766E"
                  opacity="0.25"
                />
              </g>
            )}

            {/* 5. SURGICAL GUIDE (continuous resin hugging teeth proximally + gingiva + tube extension to gingiva/bone) */}
            {filters.surgicalGuide && (
              <g
                data-testid="svg-click-surgical-guide"
                aria-label="Sélectionner le guide chirurgical"
                className={`svg-clickable-element ${
                  highlightedElement === 'surgical_guide' ? 'svg-element-selected' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect('surgical_guide');
                }}
              >
                <title>Cliquer pour illuminer les paramètres du guide chirurgical</title>
                {(() => {
                  const boreHalf = geometry.showSleeve ? sleeveOuterW / 2 : wellW / 2;
                  const collarWall = geometry.showSleeve ? 7 : 9;
                  const gapPx = clamp(geometry.surgicalGuideOffsetMm * PX_PER_MM, 1.8, 9.0);
                  const safeSkirtBottom = Math.max(yGuideBottom, yGingiva - gapPx);
                  const isBoneExt = geometry.guideTubeExtension === 'bone';
                  const boneCollarBottom = Math.max(safeSkirtBottom, yCrest - 1.5);
                  const tubeOuterL = CX - boreHalf - collarWall;
                  const tubeOuterR = CX + boreHalf + collarWall;

                  // Premolar crown bounds: outer (180..188, CEJ yGingiva+4), occlusal (~yCrest-104), distal proximal (244..234, yGingiva+4)
                  // Molar crown bounds: mesial proximal (430..438, yGingiva+4), occlusal (~yCrest-104), outer (524..513, yGingiva+4)
                  const toothBaseY = yGingiva - 3;

                  return (
                    <>
                      {/* Left continuous guide resin body (premolar + proximal wall + gingiva saddle + left tube collar) */}
                      <path
                        data-testid="guide-shell-left"
                        d={`M ${172 - gapPx} ${toothBaseY}
                            C ${163 - gapPx} ${yCrest - 64}, ${172 - gapPx} ${yCrest - 114 - gapPx}, ${188 - gapPx} ${yCrest - 118 - gapPx}
                            Q 214 ${yCrest - 124 - gapPx} ${245 + gapPx} ${yCrest - 112 - gapPx}
                            C ${266} ${yCrest - 104}, ${tubeOuterL - 12} ${yResinGuideTop + 4}, ${tubeOuterL} ${yResinGuideTop}
                            L ${CX - boreHalf} ${yResinGuideTop}
                            L ${CX - boreHalf} ${safeSkirtBottom}
                            Q ${292} ${yGingiva + 1 - gapPx} ${238 + gapPx} ${yGingiva - gapPx}
                            C ${247 + gapPx} ${yCrest - 46}, ${246 + gapPx} ${yCrest - 78}, ${235 + gapPx} ${yCrest - 97 - gapPx}
                            Q 212 ${yCrest - 107 - gapPx} ${189 - gapPx} ${yCrest - 101 - gapPx}
                            C ${177 - gapPx} ${yCrest - 76}, ${179 - gapPx} ${yCrest - 36}, ${184 - gapPx} ${toothBaseY} Z`}
                        fill="#7DD3FC"
                        fillOpacity="0.46"
                        stroke="#0284C7"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />

                      {/* Right continuous guide resin body (right tube collar + gingiva saddle + proximal wall + molar) */}
                      <path
                        data-testid="guide-shell-right"
                        d={`M ${CX + boreHalf} ${yResinGuideTop}
                            L ${tubeOuterR} ${yResinGuideTop}
                            C ${tubeOuterR + 12} ${yResinGuideTop + 4}, ${418} ${yCrest - 104}, ${438 - gapPx} ${yCrest - 112 - gapPx}
                            Q 480 ${yCrest - 124 - gapPx} ${526 + gapPx} ${yCrest - 106 - gapPx}
                            C ${540 + gapPx} ${yCrest - 86}, ${538 + gapPx} ${yCrest - 44}, ${526 + gapPx} ${toothBaseY}
                            L ${515 + gapPx} ${toothBaseY}
                            C ${523 + gapPx} ${yCrest - 38}, ${525 + gapPx} ${yCrest - 72}, ${518 + gapPx} ${yCrest - 90 - gapPx}
                            Q 480 ${yCrest - 107 - gapPx} ${441 - gapPx} ${yCrest - 100 - gapPx}
                            C ${429 - gapPx} ${yCrest - 78}, ${429 - gapPx} ${yCrest - 46}, ${435 - gapPx} ${yGingiva - gapPx}
                            Q ${394} ${yGingiva + 1 - gapPx} ${CX + boreHalf} ${safeSkirtBottom} Z`}
                        fill="#7DD3FC"
                        fillOpacity="0.46"
                        stroke="#0284C7"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />

                      {/* Calibrated guiding tube boundary markers (yResinGuideTop .. yGuideBottom) */}
                      <line
                        x1={tubeOuterL}
                        y1={yGuideBottom}
                        x2={CX - boreHalf}
                        y2={yGuideBottom}
                        stroke="#0284C7"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                      <line
                        x1={CX + boreHalf}
                        y1={yGuideBottom}
                        x2={tubeOuterR}
                        y2={yGuideBottom}
                        stroke="#0284C7"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />

                      {/* Optional BSP downward extension of the tube down to the alveolar bone crest */}
                      {isBoneExt && (
                        <g data-testid="guide-tube-bone-extension">
                          <rect
                            x={tubeOuterL}
                            y={safeSkirtBottom}
                            width={collarWall}
                            height={Math.max(4, boneCollarBottom - safeSkirtBottom)}
                            fill="#0EA5E9"
                            fillOpacity="0.48"
                            stroke="#0369A1"
                            strokeWidth="1.2"
                          />
                          <rect
                            x={CX + boreHalf}
                            y={safeSkirtBottom}
                            width={collarWall}
                            height={Math.max(4, boneCollarBottom - safeSkirtBottom)}
                            fill="#0EA5E9"
                            fillOpacity="0.48"
                            stroke="#0369A1"
                            strokeWidth="1.2"
                          />
                        </g>
                      )}

                      {/* Guide-to-tooth & gingiva clearance callout (neatly tucked left of premolar neck) */}
                      <line
                        x1="158"
                        y1={yCrest - 38}
                        x2={180 - gapPx * 0.5}
                        y2={yGingiva - 6}
                        stroke="#0284C7"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={180 - gapPx * 0.5}
                        cy={yGingiva - 6}
                        r="2"
                        fill="#0284C7"
                      />
                      <rect
                        x="94"
                        y={yCrest - 46}
                        width="68"
                        height="15"
                        rx="3"
                        fill="#F0F9FF"
                        stroke="#BAE6FD"
                      />
                      <text
                        x="128"
                        y={yCrest - 35.5}
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="700"
                        fill="#0369A1"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Guide {geometry.surgicalGuideOffsetMm.toFixed(2)} mm
                      </text>

                      {/* Tube extension target badge cleanly positioned in the right saddle */}
                      <rect
                        x={tubeOuterR + 4}
                        y={Math.min(yGingiva - 22, (isBoneExt ? boneCollarBottom : safeSkirtBottom) - 18)}
                        width={isBoneExt ? 38 : 52}
                        height="14"
                        rx="3"
                        fill="#F0F9FF"
                        stroke="#BAE6FD"
                      />
                      <text
                        x={tubeOuterR + 4 + (isBoneExt ? 19 : 26)}
                        y={Math.min(yGingiva - 12, (isBoneExt ? boneCollarBottom : safeSkirtBottom) - 8)}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#0369A1"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {isBoneExt ? '→ Os' : '→ Gencive'}
                      </text>
                    </>
                  );
                })()}

                {geometry.freeSpaceUnderGuide < 0 && (
                  <rect
                    x={CX - wellW / 2 - 12}
                    y={yGingiva}
                    width={wellW + 24}
                    height={Math.max(4, yGuideBottom - yGingiva)}
                    fill="#EF4444"
                    fillOpacity="0.28"
                    stroke="#DC2626"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                )}
              </g>
            )}

            {/* 6. METALLIC SLEEVE (Flush vs Above Guide Resin) */}
            {filters.sleeve && geometry.showSleeve && (
              <g
                data-testid="svg-click-sleeve"
                aria-label="Sélectionner la douille métallique"
                className={`svg-clickable-element ${
                  highlightedElement === 'sleeve' ? 'svg-element-selected' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect('sleeve');
                }}
              >
                <title>Cliquer pour illuminer les paramètres de la douille</title>
                <rect
                  x={CX - sleeveOuterW / 2}
                  y={yGuideTop}
                  width={sleeveWallPx}
                  height={Math.max(6, yGuideBottom - yGuideTop)}
                  fill="url(#titaniumGrad)"
                  stroke={highlightedElement === 'sleeve' ? '#0284C7' : '#334155'}
                  strokeWidth={highlightedElement === 'sleeve' ? '2' : '1.1'}
                />
                <rect
                  x={CX + wellW / 2}
                  y={yGuideTop}
                  width={sleeveWallPx}
                  height={Math.max(6, yGuideBottom - yGuideTop)}
                  fill="url(#titaniumGrad)"
                  stroke={highlightedElement === 'sleeve' ? '#0284C7' : '#334155'}
                  strokeWidth={highlightedElement === 'sleeve' ? '2' : '1.1'}
                />
                {geometry.blueSkyPlan.sleeveLipThicknessMm > 0 && (
                  <>
                    <rect
                      x={CX - sleeveOuterW / 2 - 4}
                      y={yGuideTop}
                      width={sleeveWallPx + 4}
                      height={Math.max(4, geometry.blueSkyPlan.sleeveLipThicknessMm * PX_PER_MM)}
                      fill="#CBD5E1"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <rect
                      x={CX + wellW / 2}
                      y={yGuideTop}
                      width={sleeveWallPx + 4}
                      height={Math.max(4, geometry.blueSkyPlan.sleeveLipThicknessMm * PX_PER_MM)}
                      fill="#CBD5E1"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                  </>
                )}
              </g>
            )}

            {/* 7. DRILL & STOP */}
            {filters.drillAndStop && (
              <g
                data-testid="svg-click-drill"
                aria-label="Sélectionner le foret et le décalage"
                className={`svg-clickable-element ${
                  highlightedElement === 'drill' ? 'svg-element-selected' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect('drill');
                }}
              >
                <title>Cliquer pour illuminer les paramètres du foret et décalage</title>
                {geometry.isPilotKit ? (
                  <g>
                    <rect
                      x={CX - 13}
                      y={yShankTop + 10}
                      width="26"
                      height={Math.max(18, yStopTop - (yShankTop + 10))}
                      fill="url(#steelShankGrad)"
                      stroke="#475569"
                      strokeWidth="1.1"
                    />
                    <path
                      d={`M ${CX - 9} ${yShankTop - 4}
                          L ${CX + 9} ${yShankTop - 4}
                          L ${CX + 13} ${yShankTop}
                          L ${CX + 13} ${yShankTop + 4}
                          L ${CX + 4} ${yShankTop + 4}
                          L ${CX + 4} ${yShankTop + 9}
                          L ${CX + 13} ${yShankTop + 9}
                          L ${CX + 13} ${yShankTop + 11}
                          L ${CX - 13} ${yShankTop + 11}
                          L ${CX - 13} ${yShankTop} Z`}
                      fill="url(#steelShankGrad)"
                      stroke="#475569"
                      strokeWidth="1.1"
                    />
                    <text
                      x={CX + 3.5}
                      y={yStopTop - 8}
                      textAnchor="start"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="#1E293B"
                      fontFamily="JetBrains Mono, monospace"
                      transform={`rotate(-90 ${CX + 3.5} ${yStopTop - 8})`}
                    >
                      {geometry.drillMarking}
                    </text>

                    <rect
                      x={CX - Math.max(wellW / 2 + 6, 21)}
                      y={yStopTop}
                      width={Math.max(wellW + 12, 42)}
                      height={yGuideTop - yStopTop}
                      rx="3"
                      fill="url(#dlcBlackGrad)"
                      stroke="#020617"
                      strokeWidth="1.2"
                    />
                    <line
                      x1={CX - Math.max(wellW / 2 + 4, 19)}
                      y1={yStopTop + 2}
                      x2={CX + Math.max(wellW / 2 + 4, 19)}
                      y2={yStopTop + 2}
                      stroke="#64748B"
                      strokeWidth="1"
                      opacity="0.7"
                    />

                    <path
                      d={`M ${CX - activeDrillW / 2} ${yGuideTop}
                          L ${CX + activeDrillW / 2} ${yGuideTop}
                          L ${CX + activeDrillW / 2} ${yDrillTip - 9}
                          L ${CX} ${yDrillTip}
                          L ${CX - activeDrillW / 2} ${yDrillTip - 9} Z`}
                      fill="url(#dlcBlackGrad)"
                      stroke="#020617"
                      strokeWidth="1.1"
                    />
                    {renderDrillFlutes(
                      yGuideTop + (yDrillTip - yGuideTop) * 0.34,
                      yDrillTip,
                      activeDrillW,
                      '#94A3B8',
                    )}
                  </g>
                ) : (
                  <g>
                    <rect
                      x={CX - 14}
                      y={yShankTop}
                      width="28"
                      height={yStopTop - yShankTop}
                      fill="url(#steelShankGrad)"
                      stroke="#475569"
                      strokeWidth="1.1"
                    />
                    <rect x={CX - 14} y={yShankTop + 6} width="6" height="9" fill="#475569" />

                    <rect
                      x={CX - canonW / 2 - 7}
                      y={yStopTop}
                      width={canonW + 14}
                      height={yGuideTop - yStopTop}
                      rx="2"
                      fill="url(#steelShankGrad)"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />

                    {geometry.drillRingColorHex && (
                      <rect
                        x={CX - canonW / 2 - 7}
                        y={yStopTop + 5}
                        width={canonW + 14}
                        height="7"
                        fill={geometry.drillRingColorHex}
                        stroke="#1E293B"
                        strokeWidth="0.6"
                      />
                    )}

                    <rect
                      x={CX - canonW / 2}
                      y={yGuideTop}
                      width={canonW}
                      height={Math.max(12, yGuideBottom - yGuideTop + 10)}
                      fill="url(#steelShankGrad)"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />

                    {(() => {
                      const bodyTop = yGuideBottom + 10;
                      const stepTransitionY = Math.max(bodyTop + 16, yDrillTip - 3.5 * PX_PER_MM);
                      return (
                        <>
                          <path
                            d={`M ${CX - canonW / 2} ${bodyTop}
                                L ${CX - activeDrillW / 2} ${bodyTop + 8}
                                L ${CX - activeDrillW / 2} ${stepTransitionY}
                                L ${CX - prevDrillW / 2} ${stepTransitionY + 5}
                                L ${CX - prevDrillW / 2} ${yDrillTip - 8}
                                L ${CX} ${yDrillTip}
                                L ${CX + prevDrillW / 2} ${yDrillTip - 8}
                                L ${CX + prevDrillW / 2} ${stepTransitionY + 5}
                                L ${CX + activeDrillW / 2} ${stepTransitionY}
                                L ${CX + activeDrillW / 2} ${bodyTop + 8}
                                L ${CX + canonW / 2} ${bodyTop} Z`}
                            fill="url(#steelShankGrad)"
                            stroke="#334155"
                            strokeWidth="1.2"
                          />
                          {renderDrillFlutes(bodyTop + 8, yDrillTip, activeDrillW, '#475569')}
                        </>
                      );
                    })()}
                  </g>
                )}
              </g>
            )}

            {/* 8. ERGONOMIC 20:1 CONTRA-ANGLE HANDPIECE */}
            {filters.handpiece && (
              <g
                data-testid="svg-click-handpiece"
                aria-label="Sélectionner le contre-angle 20:1"
                className={`svg-clickable-element ${
                  highlightedElement === 'handpiece' ? 'svg-element-selected' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect('handpiece');
                }}
              >
                <title>Cliquer pour illuminer la hauteur de tête du contre-angle</title>
                {(() => {
                  const headBottom = yHeadTop + headHeightPx;
                  const headMidY = yHeadTop + headHeightPx * 0.48;
                  return (
                    <>
                      <path
                        d={`M ${CX + 18} ${yHeadTop + 16}
                            C ${CX + 58} ${yHeadTop + 14}, ${CX + 96} ${yHeadTop - 2}, ${CX + 150} ${yHeadTop - 8}
                            L ${SVG_WIDTH - 14} ${yHeadTop - 16}
                            L ${SVG_WIDTH - 14} ${headMidY + 18}
                            L ${CX + 150} ${headMidY + 12}
                            C ${CX + 96} ${headMidY + 16}, ${CX + 58} ${headBottom - 16}, ${CX + 18} ${headBottom - 14} Z`}
                        fill="url(#handpieceGrad)"
                        stroke="#475569"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                      <rect
                        x={CX - 17}
                        y={headBottom - 4}
                        width="34"
                        height="9"
                        rx="2"
                        fill="#CBD5E1"
                        stroke="#475569"
                        strokeWidth="1.1"
                      />
                      <path
                        d={`M ${CX - 23} ${yHeadTop + 10}
                            C ${CX - 23} ${yHeadTop + 2}, ${CX - 16} ${yHeadTop}, ${CX} ${yHeadTop}
                            C ${CX + 16} ${yHeadTop}, ${CX + 23} ${yHeadTop + 2}, ${CX + 23} ${yHeadTop + 10}
                            L ${CX + 21} ${headBottom - 4}
                            C ${CX + 21} ${headBottom}, ${CX + 15} ${headBottom + 2}, ${CX} ${headBottom + 2}
                            C ${CX - 15} ${headBottom + 2}, ${CX - 21} ${headBottom}, ${CX - 21} ${headBottom - 4} Z`}
                        fill="url(#handpieceGrad)"
                        stroke="#475569"
                        strokeWidth="1.4"
                      />
                      <path
                        d={`M ${CX - 15} ${yHeadTop}
                            Q ${CX} ${yHeadTop - 8} ${CX + 15} ${yHeadTop} Z`}
                        fill="#94A3B8"
                        stroke="#475569"
                        strokeWidth="1.1"
                      />
                      <path
                        d={`M ${CX + 82} ${yHeadTop + 7} L ${CX + 88} ${yHeadTop + 6} L ${CX + 88} ${headMidY + 17} L ${CX + 82} ${headMidY + 18} Z`}
                        fill="#0284C7"
                      />
                      <line
                        x1={CX + 148}
                        y1={yHeadTop - 8}
                        x2={CX + 148}
                        y2={headMidY + 12}
                        stroke="#64748B"
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      <text
                        x={CX + 46}
                        y={Math.max(20, yHeadTop - 16)}
                        fontSize="10.5"
                        fontWeight="600"
                        fill="#334155"
                      >
                        Contre-angle 20:1 ({params.handpieceHeadHeight.toFixed(1)} mm)
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {/* 9. CAD DIMENSION BRACKETS (values centered on span) & LIMIT DRAG HANDLES */}
            <g>
              {/* Décalage total (yGuideTop -> yPlatform) — centered vertically */}
              <line x1="92" y1={yGuideTop} x2="92" y2={yPlatform} stroke="#0284C7" strokeWidth="1.6" />
              <line x1="86" y1={yGuideTop} x2="98" y2={yGuideTop} stroke="#0284C7" strokeWidth="1.6" />
              <line x1="86" y1={yPlatform} x2="98" y2={yPlatform} stroke="#0284C7" strokeWidth="1.6" />
              <rect
                x="42"
                y={(yGuideTop + yPlatform) / 2 - 10}
                width="44"
                height="20"
                rx="4"
                fill="#EFF6FF"
                stroke="#BAE6FD"
              />
              <text
                x="64"
                y={(yGuideTop + yPlatform) / 2 + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0369A1"
                fontFamily="JetBrains Mono, monospace"
              >
                {geometry.offsetCao.toFixed(1)}
              </text>

              {/* Hauteur guidage (yGuideTop -> yGuideBottom) — centered vertically */}
              <line x1="130" y1={yGuideTop} x2="130" y2={yGuideBottom} stroke="#0EA5E9" strokeWidth="1.6" />
              <line x1="125" y1={yGuideTop} x2="135" y2={yGuideTop} stroke="#0EA5E9" strokeWidth="1.6" />
              <line x1="125" y1={yGuideBottom} x2="135" y2={yGuideBottom} stroke="#0EA5E9" strokeWidth="1.6" />
              <rect
                x="108"
                y={(yGuideTop + yGuideBottom) / 2 - 9}
                width="44"
                height="18"
                rx="4"
                fill="#F0F9FF"
                stroke="#BAE6FD"
              />
              <text
                x="130"
                y={(yGuideTop + yGuideBottom) / 2 + 3.5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#0284C7"
                fontFamily="JetBrains Mono, monospace"
              >
                H {geometry.guideHeight.toFixed(1)}
              </text>

              {/* Longueur utile de forage (yGuideTop -> yDrillTip) — centered vertically */}
              <line x1="22" y1={yGuideTop} x2="22" y2={yDrillTip} stroke="#334155" strokeWidth="1.6" />
              <line x1="16" y1={yGuideTop} x2="28" y2={yGuideTop} stroke="#334155" strokeWidth="1.6" />
              <line x1="16" y1={yDrillTip} x2="28" y2={yDrillTip} stroke="#334155" strokeWidth="1.6" />
              <rect
                x="2"
                y={(yGuideTop + yDrillTip) / 2 - 9}
                width="40"
                height="18"
                rx="4"
                fill="#F1F5F9"
                stroke="#CBD5E1"
              />
              <text
                x="22"
                y={(yGuideTop + yDrillTip) / 2 + 3.5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#1E293B"
                fontFamily="JetBrains Mono, monospace"
              >
                L {geometry.drillUsefulLength.toFixed(1)}
              </text>

              {/* Épaisseur muqueuse (yGingiva -> yCrest) — centered vertically */}
              <line x1="564" y1={yGingiva} x2="564" y2={yCrest} stroke="#E11D48" strokeWidth="1.6" />
              <line x1="558" y1={yGingiva} x2="570" y2={yGingiva} stroke="#E11D48" strokeWidth="1.6" />
              <line x1="558" y1={yCrest} x2="570" y2={yCrest} stroke="#E11D48" strokeWidth="1.6" />
              <rect
                x="572"
                y={(yGingiva + yCrest) / 2 - 9}
                width="48"
                height="18"
                rx="4"
                fill="#FFF1F2"
                stroke="#FECDD3"
              />
              <text
                x="596"
                y={(yGingiva + yCrest) / 2 + 3.5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#BE123C"
                fontFamily="JetBrains Mono, monospace"
              >
                {params.gingivaThickness.toFixed(1)} mm
              </text>

              {/* Enfouissement sous-crestal (yCrest -> yPlatform) — centered vertically */}
              <line x1="606" y1={yCrest} x2="606" y2={yPlatform} stroke="#7C3AED" strokeWidth="1.6" />
              <line x1="600" y1={yCrest} x2="612" y2={yCrest} stroke="#7C3AED" strokeWidth="1.6" />
              <line x1="600" y1={yPlatform} x2="612" y2={yPlatform} stroke="#7C3AED" strokeWidth="1.6" />
              <rect
                x="616"
                y={(yCrest + yPlatform) / 2 - 9}
                width="34"
                height="18"
                rx="4"
                fill="#F5F3FF"
                stroke="#DDD6FE"
              />
              <text
                x="633"
                y={(yCrest + yPlatform) / 2 + 3.5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#6D28D9"
                fontFamily="JetBrains Mono, monospace"
              >
                {params.subcrestalDepth.toFixed(1)}
              </text>

              {/* Longueur implant (yPlatform -> yApex) — centered vertically */}
              <line x1="564" y1={yPlatform} x2="564" y2={yApex} stroke="#0F766E" strokeWidth="1.6" />
              <line x1="558" y1={yPlatform} x2="570" y2={yPlatform} stroke="#0F766E" strokeWidth="1.6" />
              <line x1="558" y1={yApex} x2="570" y2={yApex} stroke="#0F766E" strokeWidth="1.6" />
              <rect
                x="572"
                y={(yPlatform + yApex) / 2 - 10}
                width="48"
                height="20"
                rx="4"
                fill="#F0FDFA"
                stroke="#99F6E4"
              />
              <text
                x="596"
                y={(yPlatform + yApex) / 2 + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0F766E"
                fontFamily="JetBrains Mono, monospace"
              >
                {params.implantLength.toFixed(1)}
              </text>

              {/* Interactive drag handles anchored strictly on each boundary limit */}
              {[
                { id: 'guideTop' as const, y: yGuideTop, color: '#0284C7', xHandle: 22, lineStart: 12, lineEnd: CX },
                { id: 'guideBottom' as const, y: yGuideBottom, color: '#0EA5E9', xHandle: 130, lineStart: 118, lineEnd: CX },
                { id: 'gingivaTop' as const, y: yGingiva, color: '#E11D48', xHandle: 662, lineStart: CX, lineEnd: 672 },
                { id: 'implantPlatform' as const, y: yPlatform, color: '#7C3AED', xHandle: 662, lineStart: CX, lineEnd: 672 },
                { id: 'implantApex' as const, y: yApex, color: '#0F766E', xHandle: 662, lineStart: CX, lineEnd: 672 },
              ].map((handle) => (
                <g
                  key={handle.id}
                  className="cursor-ns-resize"
                  onPointerDown={handlePointerDown(handle.id)}
                  data-testid={`drag-handle-${handle.id}`}
                >
                  <line
                    x1={handle.lineStart}
                    y1={handle.y}
                    x2={handle.lineEnd}
                    y2={handle.y}
                    stroke={handle.color}
                    strokeWidth={dragTarget === handle.id ? '1.8' : '1'}
                    strokeDasharray="3 3"
                    opacity={dragTarget === handle.id ? 0.95 : 0.4}
                  />
                  <rect
                    x={handle.xHandle - 18}
                    y={handle.y - 10}
                    width="36"
                    height="20"
                    fill="transparent"
                  />
                  <rect
                    x={handle.xHandle - 9}
                    y={handle.y - 6}
                    width="18"
                    height="12"
                    rx="6"
                    fill="#FFFFFF"
                    stroke={handle.color}
                    strokeWidth="1.5"
                  />
                  <line
                    x1={handle.xHandle - 4}
                    y1={handle.y - 1.5}
                    x2={handle.xHandle + 4}
                    y2={handle.y - 1.5}
                    stroke={handle.color}
                    strokeWidth="1.2"
                  />
                  <line
                    x1={handle.xHandle - 4}
                    y1={handle.y + 1.5}
                    x2={handle.xHandle + 4}
                    y2={handle.y + 1.5}
                    stroke={handle.color}
                    strokeWidth="1.2"
                  />
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Right Ergonomic Dimension Rail (positioned directly to the RIGHT of the right-side anatomical dimensions) */}
        {filters.diagramControls && (
          <div className="order-3 flex flex-col gap-2 lg:h-[465px] lg:justify-end">
            <DimensionControlCard
              id="diag-gingiva"
              labelFr="Épaisseur muqueuse"
              labelEn="Mucosa"
              sublabel="Crête → Gencive"
              value={params.gingivaThickness}
              min={0.5}
              max={6.0}
              step={0.1}
              accentColor="#E11D48"
              side="right"
              highlighted={isHighlighted('gingivaThickness')}
              onChange={(v) => onChangeParams({ gingivaThickness: v })}
              onReset={() => onResetParam('gingivaThickness')}
            />
            <DimensionControlCard
              id="diag-subcrestal"
              labelFr="Sous-crestal"
              labelEn="Subcrestal"
              sublabel="Crête → Col"
              value={params.subcrestalDepth}
              min={0.0}
              max={3.0}
              step={0.1}
              accentColor="#7C3AED"
              side="right"
              highlighted={isHighlighted('subcrestalDepth')}
              onChange={(v) => onChangeParams({ subcrestalDepth: v })}
              onReset={() => onResetParam('subcrestalDepth')}
            />
            <DimensionControlCard
              id="diag-implant-len"
              labelFr="Longueur implant"
              labelEn="Implant"
              sublabel={`Ø ${params.implantDiameter.toFixed(1)} · Foret auto`}
              value={params.implantLength}
              min={6.0}
              max={16.0}
              step={0.1}
              accentColor="#0F766E"
              side="right"
              highlighted={isHighlighted('implantLength')}
              onChange={(v) => {
                if (geometry.isPilotKit) {
                  onChangeParams({
                    implantLength: v,
                    pilotDrillLength: pickOptimalPilotLength(
                      v,
                      geometry.activeKit.userDefaults.availableLengthsMm,
                      params.subcrestalDepth,
                      params.gingivaThickness,
                      params.guideHeight,
                    ),
                  });
                } else {
                  onChangeParams({
                    implantLength: v,
                    offsetOverride: pickOptimalGuidedOffset(
                      params.subcrestalDepth,
                      params.gingivaThickness,
                      params.guideHeight,
                      params.hasSleeve,
                      geometry.activeKit.id,
                      v,
                      geometry.activeKit.factoryDefaults.offsetMm,
                      geometry.activeKit.userDefaults.availableLengthsMm,
                    ),
                  });
                }
              }}
              onReset={() => onResetParam('implantLength')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
