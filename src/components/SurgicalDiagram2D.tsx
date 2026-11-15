import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ComputedGeometry,
  DiagramElementFocus,
  ResettableParamKey,
  SimulationParams,
  VisibilityFilters,
  clamp,
  computeVerticalSliderValue,
  getElementHighlightConfig,
  isDentsplySironaKit,
  isMisMguideKitId,
  pickOptimalGuidedOffset,
  pickOptimalPilotLength,
  roundTo,
} from '../utils/implantGeometry';

interface SurgicalDiagram2DProps {
  params: SimulationParams;
  geometry: ComputedGeometry;
  filters: VisibilityFilters;
  highlightedElement?: DiagramElementFocus | null;
  onSelectElement?: (element: DiagramElementFocus | null) => void;
  onChangeParams: (patch: Partial<SimulationParams>) => void;
  onResetParam?: (key: ResettableParamKey) => void;
  onToggleFilter: (key: keyof VisibilityFilters) => void;
}

type DimensionSliderId =
  | 'offsetCao'
  | 'guideHeight'
  | 'drillUsefulLength'
  | 'gingivaThickness'
  | 'subcrestalDepth'
  | 'implantLength'
  | 'surgicalGuideOffset'
  | 'handpieceHeadHeight';

interface SliderDragSpec {
  id: DimensionSliderId;
  value: number;
  min: number;
  max: number;
  step: number;
  pxPerMm: number;
  invertDrag?: boolean;
  focusElement: DiagramElementFocus;
  resetKey: ResettableParamKey;
  onChange: (nextVal: number) => void;
}

interface DimensionSpec extends SliderDragSpec {
  side: 'left' | 'right';
  lineX: number;
  y1: number;
  y2: number;
  anchorX1: number;
  anchorX2: number;
  badgeW: number;
  label: string;
  titleLabel: string;
  ariaLabel: string;
  color: string;
  badgeFill: string;
  badgeStroke: string;
  textColor: string;
}

interface ActiveDimDrag {
  id: DimensionSliderId;
  startClientY: number;
  startValue: number;
  moved: boolean;
}

const SVG_WIDTH = 980;
const SVG_HEIGHT = 760;
const CX = 490;
const PX_PER_MM = 12.5;
const Y_CREST_PX = 475;
const BONE_L = CX - 205;
const BONE_R = CX + 205;

function mmToY(mmFromCrest: number): number {
  return Y_CREST_PX + mmFromCrest * PX_PER_MM;
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
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [hoveredDim, setHoveredDim] = useState<DimensionSliderId | null>(null);
  const [activeDimDrag, setActiveDimDrag] = useState<ActiveDimDrag | null>(null);

  const highlightConfig = getElementHighlightConfig(highlightedElement);
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

  // Contra-angle geometry above drill shank (0 to 30 mm)
  const shankHeightPx = 3.2 * PX_PER_MM;
  const clampedHandpieceMm = clamp(params.handpieceHeadHeight, 0.0, 30.0);
  const headHeightPx = clampedHandpieceMm * PX_PER_MM;
  const yStopTop = yGuideTop - geometry.blueSkyPlan.drillStopThicknessMm * PX_PER_MM;
  const yShankTop = yStopTop - shankHeightPx;
  const yHeadTop = yShankTop - headHeightPx;
  const minSvgY = Math.min(15, Math.floor(yHeadTop - 42));
  const isDentsplyVisual = isDentsplySironaKit(geometry.activeKit);

  // Deviation cone points
  const yConePivot = (yGuideTop + yGuideBottom) / 2;
  const halfPlayPx = (geometry.diametralClearance / 2) * PX_PER_MM;
  const tanTheta = Math.tan((geometry.deviationAngleDeg * Math.PI) / 180);
  const coneDistToApex = Math.max(20, yDrillTip - yConePivot + 22);
  const coneHalfSpreadBottom = halfPlayPx + coneDistToApex * tanTheta;

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

  const handleImplantLengthChange = (nextLen: number) => {
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
  };

  const boreLeftX = CX - (geometry.showSleeve ? sleeveOuterW / 2 : wellW / 2);

  const dimensionSpecs: DimensionSpec[] = [
    // LEFT SIDE (Numeric measurement strictly to the LEFT of the vertical dimension line)
    {
      id: 'guideHeight',
      side: 'left',
      lineX: 274,
      y1: yGuideTop,
      y2: yGuideBottom,
      anchorX1: boreLeftX - 4,
      anchorX2: boreLeftX - 4,
      badgeW: 52,
      label: `H ${geometry.guideHeight.toFixed(1)}`,
      titleLabel: 'Hauteur guidage',
      ariaLabel: 'Curseur Hauteur guidage (glisser verticalement)',
      value: params.guideHeight,
      min: 1.5,
      max: 8.0,
      step: 0.1,
      pxPerMm: 20,
      invertDrag: true,
      color: '#0EA5E9',
      badgeFill: '#F0F9FF',
      badgeStroke: '#BAE6FD',
      textColor: '#0284C7',
      focusElement: 'surgical_guide',
      resetKey: 'guideHeight',
      onChange: (v) => onChangeParams({ guideHeight: v }),
    },
    {
      id: 'offsetCao',
      side: 'left',
      lineX: 196,
      y1: yGuideTop,
      y2: yPlatform,
      anchorX1: boreLeftX - 4,
      anchorX2: CX - implantW / 2 - 2,
      badgeW: 54,
      label: `${geometry.offsetCao.toFixed(1)} mm`,
      titleLabel: 'Décalage total',
      ariaLabel: 'Curseur Décalage total (glisser verticalement)',
      value: geometry.offsetCao,
      min: 4.0,
      max: 20.0,
      step: 0.5,
      pxPerMm: 12,
      color: '#0284C7',
      badgeFill: '#EFF6FF',
      badgeStroke: '#BAE6FD',
      textColor: '#0369A1',
      focusElement: 'drill',
      resetKey: 'offsetCao',
      onChange: handleOffsetChange,
    },
    {
      id: 'drillUsefulLength',
      side: 'left',
      lineX: 114,
      y1: yGuideTop,
      y2: yDrillTip,
      anchorX1: boreLeftX - 4,
      anchorX2: CX - 2,
      badgeW: 56,
      label: `L ${geometry.drillUsefulLength.toFixed(1)}`,
      titleLabel: 'Longueur forage',
      ariaLabel: 'Curseur Longueur forage (glisser verticalement)',
      value: geometry.drillUsefulLength,
      min: 12.0,
      max: 32.0,
      step: 0.1,
      pxPerMm: 14,
      color: '#334155',
      badgeFill: '#F1F5F9',
      badgeStroke: '#CBD5E1',
      textColor: '#1E293B',
      focusElement: 'drill',
      resetKey: 'drillUsefulLength',
      onChange: handleDrillingLengthChange,
    },
    // RIGHT SIDE (Numeric measurement strictly to the RIGHT of the vertical dimension line)
    {
      id: 'gingivaThickness',
      side: 'right',
      lineX: 708,
      y1: yGingiva,
      y2: yCrest,
      anchorX1: BONE_R,
      anchorX2: BONE_R,
      badgeW: 54,
      label: `${params.gingivaThickness.toFixed(1)} mm`,
      titleLabel: 'Épaisseur muqueuse',
      ariaLabel: 'Curseur Épaisseur muqueuse (glisser verticalement)',
      value: params.gingivaThickness,
      min: 0.5,
      max: 6.0,
      step: 0.1,
      pxPerMm: 22,
      color: '#E11D48',
      badgeFill: '#FFF1F2',
      badgeStroke: '#FECDD3',
      textColor: '#BE123C',
      focusElement: 'gingiva',
      resetKey: 'gingivaThickness',
      onChange: (v) => onChangeParams({ gingivaThickness: v }),
    },
    {
      id: 'subcrestalDepth',
      side: 'right',
      lineX: 790,
      y1: yCrest,
      y2: yPlatform,
      anchorX1: BONE_R,
      anchorX2: CX + implantW / 2 + 2,
      badgeW: 52,
      label: `${params.subcrestalDepth.toFixed(1)} mm`,
      titleLabel: 'Enfouissement sous-crestal',
      ariaLabel: 'Curseur Enfouissement sous-crestal (glisser verticalement)',
      value: params.subcrestalDepth,
      min: 0.0,
      max: 3.0,
      step: 0.1,
      pxPerMm: 26,
      invertDrag: true,
      color: '#7C3AED',
      badgeFill: '#F5F3FF',
      badgeStroke: '#DDD6FE',
      textColor: '#6D28D9',
      focusElement: 'subcrestal',
      resetKey: 'subcrestalDepth',
      onChange: (v) => onChangeParams({ subcrestalDepth: v }),
    },
    {
      id: 'implantLength',
      side: 'right',
      lineX: 868,
      y1: yPlatform,
      y2: yApex,
      anchorX1: CX + implantW / 2 + 2,
      anchorX2: CX + implantW * 0.3 + 2,
      badgeW: 54,
      label: `${params.implantLength.toFixed(1)} mm`,
      titleLabel: 'Longueur implant',
      ariaLabel: 'Curseur Longueur implant (glisser verticalement)',
      value: params.implantLength,
      min: 6.0,
      max: 16.0,
      step: 0.5,
      pxPerMm: 14,
      invertDrag: true,
      color: '#0F766E',
      badgeFill: '#F0FDFA',
      badgeStroke: '#99F6E4',
      textColor: '#0F766E',
      focusElement: 'implant',
      resetKey: 'implantLength',
      onChange: handleImplantLengthChange,
    },
  ];

  const guideOffsetSliderSpec: SliderDragSpec = {
    id: 'surgicalGuideOffset',
    value: params.surgicalGuideOffset,
    min: 0.05,
    max: 0.6,
    step: 0.05,
    pxPerMm: 110,
    focusElement: 'surgical_guide',
    resetKey: 'surgicalGuideOffset',
    onChange: (v) => onChangeParams({ surgicalGuideOffset: roundTo(v, 2) }),
  };

  const handpieceSliderSpec: SliderDragSpec = {
    id: 'handpieceHeadHeight',
    value: clampedHandpieceMm,
    min: 0.0,
    max: 30.0,
    step: 0.5,
    pxPerMm: 12,
    focusElement: 'handpiece',
    resetKey: 'handpieceHeadHeight',
    onChange: (v) => onChangeParams({ handpieceHeadHeight: roundTo(v, 1) }),
  };

  const specsRef = useRef<SliderDragSpec[]>([]);
  specsRef.current = [...dimensionSpecs, guideOffsetSliderSpec, handpieceSliderSpec];
  const activeDragRef = useRef<ActiveDimDrag | null>(null);
  const selectRef = useRef({ highlightedElement, onSelectElement });
  selectRef.current = { highlightedElement, onSelectElement };

  useEffect(() => {
    const handleWindowMove = (e: PointerEvent) => {
      const current = activeDragRef.current;
      if (!current) return;
      const spec = specsRef.current.find((d) => d.id === current.id);
      if (!spec) return;
      const deltaY = e.clientY - current.startClientY;
      if (!current.moved && Math.abs(deltaY) >= 2) {
        current.moved = true;
        setActiveDimDrag({ ...current });
      }
      const nextVal = computeVerticalSliderValue(
        current.startValue,
        deltaY,
        spec.pxPerMm,
        spec.min,
        spec.max,
        spec.step,
        Boolean(spec.invertDrag),
      );
      spec.onChange(nextVal);
    };

    const handleWindowUp = () => {
      const current = activeDragRef.current;
      if (!current) return;
      activeDragRef.current = null;
      if (!current.moved) {
        const spec = specsRef.current.find((d) => d.id === current.id);
        const { highlightedElement: curEl, onSelectElement: selCb } = selectRef.current;
        if (spec && selCb) {
          selCb(curEl === spec.focusElement ? null : spec.focusElement);
        }
      }
      setActiveDimDrag(null);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, []);

  const handleDimPointerDown = (spec: SliderDragSpec) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dragObj: ActiveDimDrag = {
      id: spec.id,
      startClientY: e.clientY,
      startValue: spec.value,
      moved: false,
    };
    activeDragRef.current = dragObj;
    setActiveDimDrag(dragObj);
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
    { key: 'diagramControls', label: 'Cotes interactives sur schéma' },
    { key: 'handpiece', label: 'Tête du contre-angle' },
    { key: 'deviationCone', label: 'Cône de déviation' },
    { key: 'boneAndGingiva', label: 'Os alvéolaire & Gencive' },
    { key: 'adjacentTeeth', label: 'Dents adjacentes' },
    { key: 'surgicalGuide', label: 'Guide chirurgical' },
    { key: 'sleeve', label: 'Douille métallique' },
    { key: 'implant', label: 'Implant' },
    { key: 'drillAndStop', label: 'Foret & Butée' },
  ];

  const premolarCejY = yGingiva + 4;
  const molarCejY = yGingiva + 4;

  return (
    <div
      data-testid="surgical-diagram-card"
      className="relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs"
    >
      {/* Diagram Toolbar (Responsive height) */}
      <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2
            data-testid="diagram-title"
            className="whitespace-nowrap text-xs font-bold text-slate-900 sm:text-sm"
          >
            Coupe 2D à l&apos;échelle
          </h2>
          {highlightConfig && (
            <button
              type="button"
              data-testid="active-element-chip"
              onClick={() => onSelectElement?.(null)}
              className="inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-sky-300 bg-sky-50 px-2 text-[10.5px] font-semibold text-sky-800 hover:bg-sky-100"
              title="Cliquer pour effacer la surbrillance"
            >
              <span>{highlightConfig.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onToggleFilter('diagramControls')}
            aria-pressed={filters.diagramControls}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
        </div>
      </div>

      {/* FULL-BLEED WHITE GRID SCHEMA STAGE (Tube panel extracted below) */}
      <div
        data-testid="surgical-diagram-stage"
        className="surgical-cad-grid relative h-[340px] w-full overflow-hidden rounded-b-xl sm:h-[470px] lg:h-[520px]"
      >
        <svg
          viewBox={`0 ${minSvgY} ${SVG_WIDTH} ${SVG_HEIGHT - 10 - minSvgY}`}
          preserveAspectRatio="xMidYMid meet"
          className={`block h-full w-full select-none ${
            activeDimDrag ? 'cursor-ns-resize' : 'cursor-default'
          }`}
          data-testid="surgical-svg"
          role="img"
          aria-label="Schéma 2D interactif de coupe implantaire guidée"
        >
          <defs>
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

            <linearGradient id="biotechChromeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7A8494" />
              <stop offset="22%" stopColor="#CBD5E1" />
              <stop offset="56%" stopColor="#FFFFFF" />
              <stop offset="80%" stopColor="#B8C4D4" />
              <stop offset="100%" stopColor="#5B6473" />
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

            <linearGradient id="misSteelShankGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7C8594" />
              <stop offset="28%" stopColor="#CBD5E1" />
              <stop offset="52%" stopColor="#F8FAFC" />
              <stop offset="78%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#5B6472" />
            </linearGradient>

            <linearGradient id="misCylinderLeftGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="65%" stopColor="#7E8999" />
              <stop offset="100%" stopColor="#525D6D" />
            </linearGradient>

            <linearGradient id="misConicalBladeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8590A0" />
              <stop offset="36%" stopColor="#E2E8F0" />
              <stop offset="55%" stopColor="#94A3B8" />
              <stop offset="84%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
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

          {/* Transparent click-to-deselect canvas layer over full-bleed white grid */}
          <rect
            x="0"
            y={minSvgY}
            width={SVG_WIDTH}
            height={SVG_HEIGHT - minSvgY}
            fill="transparent"
            onClick={() => onSelectElement?.(null)}
          />

          <line
            x1={CX}
            y1={minSvgY + 5}
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
                  d={`M ${BONE_L} ${yCrest} L ${BONE_R} ${yCrest} L ${BONE_R} 740 L ${BONE_L} 740 Z`}
                  fill="url(#bonePattern)"
                />
                <rect
                  x={BONE_L}
                  y={yCrest}
                  width={BONE_R - BONE_L}
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
                  d={`M ${BONE_L} ${yGingiva}
                      Q ${CX - 130} ${yGingiva - 4} ${CX - 80} ${yGingiva + 2}
                      Q ${CX - 35} ${yGingiva + 4} ${CX - wellW / 2 - 14} ${yGingiva}
                      L ${CX + wellW / 2 + 14} ${yGingiva}
                      Q ${CX + 35} ${yGingiva + 4} ${CX + 80} ${yGingiva + 2}
                      Q ${CX + 130} ${yGingiva - 4} ${BONE_R} ${yGingiva}
                      L ${BONE_R} ${yCrest} L ${BONE_L} ${yCrest} Z`}
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
                  d={`M ${CX - 152} ${premolarCejY}
                      C ${CX - 158} ${premolarCejY - 30}, ${CX - 162} ${yCrest - 78}, ${CX - 150} ${yCrest - 98}
                      C ${CX - 142} ${yCrest - 107}, ${CX - 135} ${yCrest - 102}, ${CX - 128} ${yCrest - 94}
                      C ${CX - 121} ${yCrest - 102}, ${CX - 112} ${yCrest - 104}, ${CX - 105} ${yCrest - 94}
                      C ${CX - 94} ${yCrest - 76}, ${CX - 96} ${premolarCejY - 28}, ${CX - 106} ${premolarCejY}
                      C ${CX - 108} ${yCrest + 42}, ${CX - 118} ${yCrest + 98}, ${CX - 130} ${yCrest + 136}
                      C ${CX - 134} ${yCrest + 140}, ${CX - 138} ${yCrest + 138}, ${CX - 141} ${yCrest + 132}
                      C ${CX - 149} ${yCrest + 92}, ${CX - 153} ${yCrest + 40}, ${CX - 152} ${premolarCejY} Z`}
                  fill="url(#rootGrad)"
                  stroke="#B3A387"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${CX - 152} ${premolarCejY}
                      C ${CX - 158} ${premolarCejY - 30}, ${CX - 162} ${yCrest - 78}, ${CX - 150} ${yCrest - 98}
                      C ${CX - 142} ${yCrest - 107}, ${CX - 135} ${yCrest - 102}, ${CX - 128} ${yCrest - 94}
                      C ${CX - 121} ${yCrest - 102}, ${CX - 112} ${yCrest - 104}, ${CX - 105} ${yCrest - 94}
                      C ${CX - 94} ${yCrest - 76}, ${CX - 96} ${premolarCejY - 28}, ${CX - 106} ${premolarCejY}
                      Q ${CX - 129} ${premolarCejY + 6} ${CX - 152} ${premolarCejY} Z`}
                  fill="url(#enamelGrad)"
                  stroke="#BFB59E"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${CX - 136} ${yCrest - 94} Q ${CX - 128} ${yCrest - 88} ${CX - 120} ${yCrest - 94}`}
                  fill="none"
                  stroke="#CFC4AC"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${CX - 136} ${yCrest - 52}
                      Q ${CX - 134} ${yCrest - 64} ${CX - 130} ${yCrest - 56}
                      Q ${CX - 124} ${yCrest - 62} ${CX - 122} ${yCrest - 50}
                      C ${CX - 123} ${yCrest - 22}, ${CX - 128} ${yCrest + 38}, ${CX - 134} ${yCrest + 108}
                      C ${CX - 137} ${yCrest + 38}, ${CX - 137} ${yCrest - 20}, ${CX - 136} ${yCrest - 52} Z`}
                  fill="#DF9C99"
                  opacity="0.45"
                />
              </g>

              <g data-testid="tooth-molar">
                <path
                  d={`M ${CX + 98} ${molarCejY}
                      C ${CX + 90} ${molarCejY - 28}, ${CX + 89} ${yCrest - 78}, ${CX + 102} ${yCrest - 98}
                      C ${CX + 111} ${yCrest - 106}, ${CX + 121} ${yCrest - 100}, ${CX + 130} ${yCrest - 93}
                      C ${CX + 139} ${yCrest - 101}, ${CX + 149} ${yCrest - 104}, ${CX + 158} ${yCrest - 95}
                      C ${CX + 167} ${yCrest - 101}, ${CX + 176} ${yCrest - 98}, ${CX + 181} ${yCrest - 86}
                      C ${CX + 186} ${yCrest - 62}, ${CX + 182} ${molarCejY - 22}, ${CX + 173} ${molarCejY}
                      C ${CX + 177} ${yCrest + 45}, ${CX + 176} ${yCrest + 96}, ${CX + 169} ${yCrest + 132}
                      C ${CX + 166} ${yCrest + 138}, ${CX + 160} ${yCrest + 136}, ${CX + 158} ${yCrest + 128}
                      C ${CX + 152} ${yCrest + 92}, ${CX + 146} ${yCrest + 52}, ${CX + 137} ${yCrest + 44}
                      C ${CX + 128} ${yCrest + 52}, ${CX + 125} ${yCrest + 92}, ${CX + 120} ${yCrest + 130}
                      C ${CX + 118} ${yCrest + 137}, ${CX + 112} ${yCrest + 137}, ${CX + 110} ${yCrest + 130}
                      C ${CX + 103} ${yCrest + 95}, ${CX + 99} ${yCrest + 46}, ${CX + 98} ${molarCejY} Z`}
                  fill="url(#rootGrad)"
                  stroke="#B3A387"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${CX + 98} ${molarCejY}
                      C ${CX + 90} ${molarCejY - 28}, ${CX + 89} ${yCrest - 78}, ${CX + 102} ${yCrest - 98}
                      C ${CX + 111} ${yCrest - 106}, ${CX + 121} ${yCrest - 100}, ${CX + 130} ${yCrest - 93}
                      C ${CX + 139} ${yCrest - 101}, ${CX + 149} ${yCrest - 104}, ${CX + 158} ${yCrest - 95}
                      C ${CX + 167} ${yCrest - 101}, ${CX + 176} ${yCrest - 98}, ${CX + 181} ${yCrest - 86}
                      C ${CX + 186} ${yCrest - 62}, ${CX + 182} ${molarCejY - 22}, ${CX + 173} ${molarCejY}
                      Q ${CX + 136} ${molarCejY + 7} ${CX + 98} ${molarCejY} Z`}
                  fill="url(#enamelGrad)"
                  stroke="#BFB59E"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${CX + 118} ${yCrest - 92} Q ${CX + 130} ${yCrest - 86} ${CX + 142} ${yCrest - 92} M ${CX + 146} ${yCrest - 92} Q ${CX + 158} ${yCrest - 86} ${CX + 168} ${yCrest - 90}`}
                  fill="none"
                  stroke="#CFC4AC"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${CX + 114} ${yCrest - 48}
                      Q ${CX + 118} ${yCrest - 60} ${CX + 125} ${yCrest - 52}
                      Q ${CX + 138} ${yCrest - 56} ${CX + 152} ${yCrest - 52}
                      Q ${CX + 158} ${yCrest - 60} ${CX + 163} ${yCrest - 46}
                      C ${CX + 164} ${yCrest - 18}, ${CX + 164} ${yCrest + 44}, ${CX + 164} ${yCrest + 106}
                      L ${CX + 159} ${yCrest + 106}
                      C ${CX + 156} ${yCrest + 52}, ${CX + 152} ${yCrest + 24}, ${CX + 137} ${yCrest + 22}
                      C ${CX + 124} ${yCrest + 24}, ${CX + 120} ${yCrest + 52}, ${CX + 117} ${yCrest + 106}
                      L ${CX + 112} ${yCrest + 106}
                      C ${CX + 112} ${yCrest + 44}, ${CX + 112} ${yCrest - 18}, ${CX + 114} ${yCrest - 48} Z`}
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

          {/* 5. SURGICAL GUIDE */}
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
                const gapPx = clamp(geometry.surgicalGuideOffsetMm * PX_PER_MM * 1.6, 0.8, 12.0);
                const safeSkirtBottom = Math.max(yGuideBottom, yGingiva - gapPx);
                const isBoneExt = geometry.guideTubeExtension === 'bone';
                const boneCollarBottom = Math.max(safeSkirtBottom, yCrest - 1.5);
                const tubeOuterL = CX - boreHalf - collarWall;
                const tubeOuterR = CX + boreHalf + collarWall;
                const toothBaseY = yGingiva - 3;

                return (
                  <>
                    {/* Left continuous guide resin body */}
                    <path
                      data-testid="guide-shell-left"
                      d={`M ${CX - 168 - gapPx} ${toothBaseY}
                          C ${CX - 177 - gapPx} ${yCrest - 64}, ${CX - 168 - gapPx} ${yCrest - 114 - gapPx}, ${CX - 152 - gapPx} ${yCrest - 118 - gapPx}
                          Q ${CX - 126} ${yCrest - 124 - gapPx} ${CX - 95 + gapPx} ${yCrest - 112 - gapPx}
                          C ${CX - 74} ${yCrest - 104}, ${tubeOuterL - 12} ${yResinGuideTop + 4}, ${tubeOuterL} ${yResinGuideTop}
                          L ${CX - boreHalf} ${yResinGuideTop}
                          L ${CX - boreHalf} ${safeSkirtBottom}
                          Q ${CX - 48} ${yGingiva + 1 - gapPx} ${CX - 102 + gapPx} ${yGingiva - gapPx}
                          C ${CX - 93 + gapPx} ${yCrest - 46}, ${CX - 94 + gapPx} ${yCrest - 78}, ${CX - 105 + gapPx} ${yCrest - 97 - gapPx}
                          Q ${CX - 128} ${yCrest - 107 - gapPx} ${CX - 151 - gapPx} ${yCrest - 101 - gapPx}
                          C ${CX - 163 - gapPx} ${yCrest - 76}, ${CX - 161 - gapPx} ${yCrest - 36}, ${CX - 156 - gapPx} ${toothBaseY} Z`}
                      fill="#7DD3FC"
                      fillOpacity="0.46"
                      stroke="#0284C7"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />

                    {/* Right continuous guide resin body */}
                    <path
                      data-testid="guide-shell-right"
                      d={`M ${CX + boreHalf} ${yResinGuideTop}
                          L ${tubeOuterR} ${yResinGuideTop}
                          C ${tubeOuterR + 12} ${yResinGuideTop + 4}, ${CX + 78} ${yCrest - 104}, ${CX + 98 - gapPx} ${yCrest - 112 - gapPx}
                          Q ${CX + 140} ${yCrest - 124 - gapPx} ${CX + 186 + gapPx} ${yCrest - 106 - gapPx}
                          C ${CX + 200 + gapPx} ${yCrest - 86}, ${CX + 198 + gapPx} ${yCrest - 44}, ${CX + 186 + gapPx} ${toothBaseY}
                          L ${CX + 175 + gapPx} ${toothBaseY}
                          C ${CX + 183 + gapPx} ${yCrest - 38}, ${CX + 185 + gapPx} ${yCrest - 72}, ${CX + 178 + gapPx} ${yCrest - 90 - gapPx}
                          Q ${CX + 140} ${yCrest - 107 - gapPx} ${CX + 101 - gapPx} ${yCrest - 100 - gapPx}
                          C ${CX + 89 - gapPx} ${yCrest - 78}, ${CX + 89 - gapPx} ${yCrest - 46}, ${CX + 95 - gapPx} ${yGingiva - gapPx}
                          Q ${CX + 54} ${yGingiva + 1 - gapPx} ${CX + boreHalf} ${safeSkirtBottom} Z`}
                      fill="#7DD3FC"
                      fillOpacity="0.46"
                      stroke="#0284C7"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />

                    {/* Calibrated guiding tube boundary markers */}
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

                    {/* Interactive Guide-to-Tooth Clearance Slider ("Guide 0.25 mm" — drag vertically to adjust gap, double-click to reset) */}
                    {(() => {
                      const guideSliderHot =
                        hoveredDim === 'surgicalGuideOffset' ||
                        activeDimDrag?.id === 'surgicalGuideOffset';
                      return (
                        <g
                          data-testid="svg-dim-surgicalGuideOffset"
                          data-hot={guideSliderHot ? 'true' : 'false'}
                          role="slider"
                          tabIndex={0}
                          aria-label="Curseur Décalage guide chirurgical (glisser verticalement, double-clic pour réinitialiser)"
                          aria-valuemin={0.05}
                          aria-valuemax={0.6}
                          aria-valuenow={params.surgicalGuideOffset}
                          className="cursor-ns-resize outline-none"
                          onPointerEnter={() => setHoveredDim('surgicalGuideOffset')}
                          onPointerLeave={() =>
                            setHoveredDim((prev) =>
                              prev === 'surgicalGuideOffset' ? null : prev,
                            )
                          }
                          onPointerDown={handleDimPointerDown(guideOffsetSliderSpec)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onResetParam?.('surgicalGuideOffset');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                              e.preventDefault();
                              guideOffsetSliderSpec.onChange(
                                clamp(roundTo(params.surgicalGuideOffset + 0.05, 2), 0.05, 0.6),
                              );
                            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                              e.preventDefault();
                              guideOffsetSliderSpec.onChange(
                                clamp(roundTo(params.surgicalGuideOffset - 0.05, 2), 0.05, 0.6),
                              );
                            }
                          }}
                        >
                          <title>
                            Décalage guide chirurgical : {geometry.surgicalGuideOffsetMm.toFixed(2)} mm — Glisser haut/bas pour modifier l&apos;espace guide/dent, double-cliquer pour réinitialiser
                          </title>
                          <line
                            x1={CX - 134}
                            y1={yCrest - 136}
                            x2={CX - 134}
                            y2={yCrest - 120 - gapPx}
                            stroke="#0284C7"
                            strokeWidth={guideSliderHot ? 2.2 : 1.1}
                            strokeDasharray="2 2"
                            pointerEvents="none"
                          />
                          <circle
                            cx={CX - 134}
                            cy={yCrest - 120 - gapPx}
                            r={guideSliderHot ? 3 : 2}
                            fill="#0284C7"
                            pointerEvents="none"
                          />
                          <rect
                            data-testid="svg-dim-badge-surgicalGuideOffset"
                            x={CX - 172}
                            y={yCrest - 151.5}
                            width="76"
                            height="16"
                            rx="3.5"
                            fill={activeDimDrag?.id === 'surgicalGuideOffset' ? '#FFFFFF' : '#F0F9FF'}
                            stroke={guideSliderHot ? '#0284C7' : '#BAE6FD'}
                            strokeWidth={guideSliderHot ? 2 : 1}
                            pointerEvents="none"
                          />
                          <text
                            x={CX - 134}
                            y={yCrest - 140.5}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="700"
                            fill="#0369A1"
                            fontFamily="JetBrains Mono, monospace"
                            pointerEvents="none"
                          >
                            Guide {geometry.surgicalGuideOffsetMm.toFixed(2)} mm
                          </text>
                          {guideSliderHot && (
                            <g fill="#0284C7" opacity="0.95" pointerEvents="none">
                              <polygon
                                points={`${CX - 137},${yCrest - 153.5} ${CX - 131},${yCrest - 153.5} ${CX - 134},${yCrest - 157}`}
                              />
                              <polygon
                                points={`${CX - 137},${yCrest - 133.5} ${CX - 131},${yCrest - 133.5} ${CX - 134},${yCrest - 130}`}
                              />
                            </g>
                          )}
                          <rect
                            data-testid="svg-dim-badge-hit-surgicalGuideOffset"
                            x={CX - 176}
                            y={yCrest - 156}
                            width="84"
                            height="25"
                            fill="transparent"
                          />
                        </g>
                      );
                    })()}

                    {/* Clickable Tube Extension Target Badge (toggles → Gencive / → Os directly on schema) */}
                    <g
                      data-testid="svg-toggle-guide-extension"
                      role="button"
                      tabIndex={0}
                      aria-label="Basculer le prolongement du tube (Gencive ou Os)"
                      className="cursor-pointer outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeParams({
                          guideTubeExtension: isBoneExt ? 'gingiva' : 'bone',
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onChangeParams({
                            guideTubeExtension: isBoneExt ? 'gingiva' : 'bone',
                          });
                        }
                      }}
                    >
                      <title>Cliquer pour basculer entre prolongement gencive et os</title>
                      <rect
                        x={tubeOuterR + 4}
                        y={Math.min(yGingiva - 22, (isBoneExt ? boneCollarBottom : safeSkirtBottom) - 18)}
                        width={isBoneExt ? 42 : 56}
                        height="15"
                        rx="3.5"
                        fill="#F0F9FF"
                        stroke="#7DD3FC"
                        strokeWidth="1.1"
                      />
                      <text
                        x={tubeOuterR + 4 + (isBoneExt ? 21 : 28)}
                        y={Math.min(yGingiva - 11.5, (isBoneExt ? boneCollarBottom : safeSkirtBottom) - 7.5)}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#0369A1"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {isBoneExt ? '→ Os' : '→ Gencive'}
                      </text>
                    </g>
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

          {/* 6. METALLIC SLEEVE */}
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
              ) : isDentsplyVisual ? (
                <g
                  data-testid="dentsply-sirona-drill-visual"
                  data-mis-style={isMisMguideKitId(geometry.activeKit.id) ? 'stainless-conical' : 'stainless-guided'}
                  data-ring-color={geometry.drillRingColorHex ?? 'none'}
                >
                  {(() => {
                    const flangeH = clamp(
                      geometry.blueSkyPlan.drillStopThicknessMm * PX_PER_MM * 0.42,
                      5,
                      10,
                    );
                    const yFlangeTop = yGuideTop - flangeH;
                    const flangeOverhang = 5.5;
                    const shankW = 24;
                    const shankL = CX - shankW / 2;
                    const shankR = CX + shankW / 2;
                    const ringH = 7.5;
                    const ringY = Math.max(yShankTop + 14, yFlangeTop - ringH - 7);
                    const cylinderBottom = Math.max(yGuideBottom + 9, yGuideTop + 16);
                    const reliefDrop = 8;
                    const bodyTop = cylinderBottom + reliefDrop;
                    const isPilotDiameter = geometry.drillActiveDiameter <= 2.55;
                    const apexBaseW = isPilotDiameter
                      ? activeDrillW
                      : Math.max(prevDrillW * 0.88, activeDrillW * 0.68);
                    const apicalStepY = Math.max(bodyTop + 12, yDrillTip - 11);

                    return (
                      <>
                        {/* RA Contra-Angle Stainless Steel Latch Shank */}
                        <path
                          d={`M ${shankL + 2} ${yShankTop - 2}
                              L ${shankR - 2} ${yShankTop - 2}
                              L ${shankR} ${yShankTop}
                              L ${shankR} ${yShankTop + 4}
                              L ${CX + 5} ${yShankTop + 4}
                              L ${CX + 5} ${yShankTop + 9}
                              L ${shankR} ${yShankTop + 9}
                              L ${shankR} ${yShankTop + 15}
                              L ${shankR - 2.5} ${yShankTop + 15}
                              L ${shankR - 2.5} ${yFlangeTop}
                              L ${shankL} ${yFlangeTop}
                              L ${shankL} ${yShankTop} Z`}
                          fill="url(#misSteelShankGrad)"
                          stroke="#475569"
                          strokeWidth="1.1"
                          strokeLinejoin="round"
                        />

                        {/* Anodized Color-Coded Band ON THE SHANK (or plain groove for Pilot Ø2.4) */}
                        {geometry.drillRingColorHex ? (
                          <g>
                            <rect
                              data-testid="mis-shank-color-ring"
                              x={shankL}
                              y={ringY}
                              width={shankW - 2.5}
                              height={ringH}
                              fill={geometry.drillRingColorHex}
                              stroke="#1E293B"
                              strokeWidth="0.7"
                            />
                            <rect
                              x={shankL + 5}
                              y={ringY + 0.6}
                              width="4.5"
                              height={ringH - 1.2}
                              fill="#FFFFFF"
                              opacity="0.26"
                            />
                          </g>
                        ) : (
                          <g>
                            <rect
                              x={shankL}
                              y={ringY}
                              width={shankW - 2.5}
                              height={ringH}
                              fill="#94A3B8"
                              stroke="#475569"
                              strokeWidth="0.7"
                            />
                            <line
                              x1={shankL}
                              y1={ringY + ringH / 2}
                              x2={shankR - 2.5}
                              y2={ringY + ringH / 2}
                              stroke="#475569"
                              strokeWidth="0.7"
                            />
                          </g>
                        )}

                        {/* Slim Precision Mechanical Stopper Flange */}
                        <path
                          d={`M ${CX - canonW / 2 - flangeOverhang} ${yFlangeTop}
                              L ${CX + canonW / 2 + flangeOverhang} ${yFlangeTop}
                              L ${CX + canonW / 2 + flangeOverhang} ${yGuideTop - 1.5}
                              L ${CX + canonW / 2} ${yGuideTop}
                              L ${CX - canonW / 2} ${yGuideTop}
                              L ${CX - canonW / 2 - flangeOverhang} ${yGuideTop - 1.5} Z`}
                          fill="url(#misSteelShankGrad)"
                          stroke="#334155"
                          strokeWidth="1.1"
                          strokeLinejoin="round"
                        />

                        {/* Precision Keyless Guiding Cylinder with Dual-Tone Irrigation Flat Channel */}
                        <rect
                          x={CX - canonW / 2}
                          y={yGuideTop}
                          width={canonW}
                          height={cylinderBottom - yGuideTop}
                          fill="url(#misSteelShankGrad)"
                          stroke="#334155"
                          strokeWidth="1.15"
                        />
                        {/* Left flat vertical irrigation/debris facet */}
                        <rect
                          x={CX - canonW / 2 + 0.8}
                          y={yGuideTop + 0.8}
                          width={canonW * 0.41}
                          height={Math.max(4, cylinderBottom - yGuideTop - 1.2)}
                          fill="url(#misCylinderLeftGrad)"
                          opacity="0.88"
                        />
                        {/* Subtle top circumferential cylinder groove */}
                        <line
                          x1={CX - canonW / 2 + 1}
                          y1={yGuideTop + 6}
                          x2={CX + canonW / 2 - 1}
                          y2={yGuideTop + 6}
                          stroke="#64748B"
                          strokeWidth="0.8"
                          opacity="0.65"
                        />
                        {/* Helical angled relief bevel exiting bottom of guiding cylinder */}
                        <path
                          d={`M ${CX - canonW / 2} ${cylinderBottom}
                              Q ${CX - canonW * 0.25} ${cylinderBottom - 3} ${CX - activeDrillW / 2} ${bodyTop}
                              L ${CX + activeDrillW / 2} ${bodyTop}
                              Q ${CX + canonW * 0.35} ${cylinderBottom + 4} ${CX + canonW / 2} ${cylinderBottom} Z`}
                          fill="url(#misSteelShankGrad)"
                          stroke="#334155"
                          strokeWidth="1.1"
                          strokeLinejoin="round"
                        />

                        {/* Cutting Blade: Conical Tapered Stainless Steel Flutes (or Helical Twist for Ø2.4 Pilot) */}
                        {isPilotDiameter ? (
                          <>
                            <path
                              d={`M ${CX - activeDrillW / 2} ${bodyTop}
                                  L ${CX + activeDrillW / 2} ${bodyTop}
                                  L ${CX + activeDrillW / 2} ${yDrillTip - 8}
                                  L ${CX} ${yDrillTip}
                                  L ${CX - activeDrillW / 2} ${yDrillTip - 8} Z`}
                              fill="url(#misConicalBladeGrad)"
                              stroke="#334155"
                              strokeWidth="1.1"
                            />
                            {renderDrillFlutes(
                              bodyTop + 2,
                              yDrillTip,
                              activeDrillW,
                              '#475569',
                            )}
                          </>
                        ) : (
                          <>
                            <path
                              d={`M ${CX - activeDrillW / 2} ${bodyTop}
                                  L ${CX + activeDrillW / 2} ${bodyTop}
                                  L ${CX + apexBaseW / 2} ${apicalStepY}
                                  L ${CX + apexBaseW * 0.44} ${yDrillTip - 7}
                                  L ${CX} ${yDrillTip}
                                  L ${CX - apexBaseW * 0.44} ${yDrillTip - 7}
                                  L ${CX - apexBaseW / 2} ${apicalStepY} Z`}
                              fill="url(#misConicalBladeGrad)"
                              stroke="#334155"
                              strokeWidth="1.1"
                              strokeLinejoin="round"
                            />
                            {/* Central straight longitudinal flute channel */}
                            <path
                              d={`M ${CX - activeDrillW * 0.14} ${bodyTop + 1}
                                  L ${CX + activeDrillW * 0.14} ${bodyTop + 1}
                                  L ${CX + apexBaseW * 0.12} ${yDrillTip - 7}
                                  L ${CX - apexBaseW * 0.12} ${yDrillTip - 7} Z`}
                              fill="#64748B"
                              opacity="0.45"
                            />
                            {/* Crisp apical chamfer edge */}
                            <line
                              x1={CX - apexBaseW * 0.46}
                              y1={yDrillTip - 7}
                              x2={CX + apexBaseW * 0.46}
                              y2={yDrillTip - 7}
                              stroke="#475569"
                              strokeWidth="0.9"
                              opacity="0.7"
                            />
                          </>
                        )}
                      </>
                    );
                  })()}
                </g>
              ) : (
                <g
                  data-testid="guided-drill-visual"
                  data-biotech-style="chrome-stepped"
                  data-ring-color={geometry.drillRingColorHex ?? 'none'}
                >
                  {(() => {
                    const flangeH = clamp(
                      geometry.blueSkyPlan.drillStopThicknessMm * PX_PER_MM * 0.45,
                      5,
                      7.5,
                    );
                    const yFlangeTop = yGuideTop - flangeH;
                    const flangeOverhang = 5.5;
                    const shankW = 20;
                    const shankL = CX - shankW / 2;
                    const shankR = CX + shankW / 2;
                    const ringH = 7;
                    const ringY = Math.max(yShankTop + 14, yFlangeTop - ringH - 2.5);
                    const barrelBottom = Math.max(yGuideBottom + 8, yGuideTop + 18);
                    const chamferDrop = 6.5;
                    const neckTop = barrelBottom + chamferDrop;
                    const isStepped = geometry.drillActiveDiameter > 2.25;
                    const stepTransitionY = Math.max(neckTop + 18, yDrillTip - 3.6 * PX_PER_MM);

                    return (
                      <>
                        {/* RA Contra-Angle Latch Shank (KATLAFE* Chrome Stainless Steel) */}
                        <path
                          d={`M ${shankL + 2} ${yShankTop - 2}
                              L ${shankR - 2} ${yShankTop - 2}
                              L ${shankR} ${yShankTop}
                              L ${shankR} ${yShankTop + 4}
                              L ${CX + 4.5} ${yShankTop + 4}
                              L ${CX + 4.5} ${yShankTop + 9}
                              L ${shankR} ${yShankTop + 9}
                              L ${shankR} ${yFlangeTop}
                              L ${shankL} ${yFlangeTop}
                              L ${shankL} ${yShankTop + 13}
                              L ${shankL + 2} ${yShankTop + 13}
                              L ${shankL + 2} ${yShankTop + 3}
                              L ${shankL} ${yShankTop + 3}
                              L ${shankL} ${yShankTop} Z`}
                          fill="url(#biotechChromeGrad)"
                          stroke="#475569"
                          strokeWidth="1.05"
                          strokeLinejoin="round"
                        />

                        {/* Subtle vertical laser nominal diameter etching strictly within exposed shank window */}
                        {ringY - yShankTop >= 23 && (
                          <text
                            x={CX + 2.5}
                            y={ringY - 3}
                            textAnchor="start"
                            fontSize="6.5"
                            fontWeight="700"
                            letterSpacing="0.2"
                            fill="#334155"
                            opacity="0.82"
                            fontFamily="JetBrains Mono, monospace"
                            transform={`rotate(-90 ${CX + 2.5} ${ringY - 3})`}
                          >
                            {geometry.drillMarking.split(' ')[0]}
                          </text>
                        )}

                        {/* Anodized Color Ring Directly Above Stopper Flange (omitted for Ø2.0 pure steel KATLAFE20xx) */}
                        {geometry.drillRingColorHex && (
                          <g>
                            <rect
                              data-testid="biotech-shank-color-ring"
                              x={shankL}
                              y={ringY}
                              width={shankW}
                              height={ringH}
                              fill={geometry.drillRingColorHex}
                              stroke="#1E293B"
                              strokeWidth="0.65"
                            />
                            <rect
                              x={CX + 1}
                              y={ringY + 0.5}
                              width="4"
                              height={ringH - 1}
                              fill="#FFFFFF"
                              opacity="0.28"
                            />
                          </g>
                        )}

                        {/* Slim Chamfered Stopper Flange at yGuideTop */}
                        <path
                          d={`M ${CX - canonW / 2 - flangeOverhang} ${yFlangeTop}
                              L ${CX + canonW / 2 + flangeOverhang} ${yFlangeTop}
                              L ${CX + canonW / 2 + flangeOverhang} ${yGuideTop - 1.5}
                              L ${CX + canonW / 2} ${yGuideTop}
                              L ${CX - canonW / 2} ${yGuideTop}
                              L ${CX - canonW / 2 - flangeOverhang} ${yGuideTop - 1.5} Z`}
                          fill="url(#biotechChromeGrad)"
                          stroke="#334155"
                          strokeWidth="1.1"
                          strokeLinejoin="round"
                        />

                        {/* Mirror-Polished Cylindrical Guiding Barrel */}
                        <rect
                          x={CX - canonW / 2}
                          y={yGuideTop}
                          width={canonW}
                          height={barrelBottom - yGuideTop}
                          fill="url(#biotechChromeGrad)"
                          stroke="#334155"
                          strokeWidth="1.15"
                        />
                        {/* Symmetrical 45° Bottom Chamfer Shoulder */}
                        <path
                          d={`M ${CX - canonW / 2} ${barrelBottom}
                              L ${CX + canonW / 2} ${barrelBottom}
                              L ${CX + activeDrillW / 2} ${neckTop}
                              L ${CX - activeDrillW / 2} ${neckTop} Z`}
                          fill="url(#biotechChromeGrad)"
                          stroke="#334155"
                          strokeWidth="1.1"
                          strokeLinejoin="round"
                        />

                        {/* Active Cutting Blade: 2-Stage Stepped Helical (KATLAFE30xx–48xx) or Helical Pilot (KATLAFE20xx) */}
                        {isStepped ? (
                          <>
                            <path
                              d={`M ${CX - activeDrillW / 2} ${neckTop}
                                  L ${CX + activeDrillW / 2} ${neckTop}
                                  L ${CX + activeDrillW / 2} ${stepTransitionY}
                                  L ${CX + prevDrillW / 2} ${stepTransitionY + 4.5}
                                  L ${CX + prevDrillW / 2} ${yDrillTip - 7.5}
                                  L ${CX} ${yDrillTip}
                                  L ${CX - prevDrillW / 2} ${yDrillTip - 7.5}
                                  L ${CX - prevDrillW / 2} ${stepTransitionY + 4.5}
                                  L ${CX - activeDrillW / 2} ${stepTransitionY} Z`}
                              fill="url(#biotechChromeGrad)"
                              stroke="#334155"
                              strokeWidth="1.15"
                              strokeLinejoin="round"
                            />
                            {/* Stepped shoulder chamfer highlight */}
                            <line
                              x1={CX - prevDrillW / 2}
                              y1={stepTransitionY + 4.5}
                              x2={CX + prevDrillW / 2}
                              y2={stepTransitionY + 4.5}
                              stroke="#475569"
                              strokeWidth="0.9"
                              opacity="0.65"
                            />
                            {renderDrillFlutes(
                              neckTop + 4,
                              stepTransitionY + 2,
                              activeDrillW,
                              '#475569',
                            )}
                            {renderDrillFlutes(
                              stepTransitionY + 5,
                              yDrillTip,
                              prevDrillW,
                              '#475569',
                            )}
                          </>
                        ) : (
                          <>
                            <path
                              d={`M ${CX - activeDrillW / 2} ${neckTop}
                                  L ${CX + activeDrillW / 2} ${neckTop}
                                  L ${CX + activeDrillW / 2} ${yDrillTip - 7.5}
                                  L ${CX} ${yDrillTip}
                                  L ${CX - activeDrillW / 2} ${yDrillTip - 7.5} Z`}
                              fill="url(#biotechChromeGrad)"
                              stroke="#334155"
                              strokeWidth="1.15"
                              strokeLinejoin="round"
                            />
                            {renderDrillFlutes(
                              neckTop + 4,
                              yDrillTip,
                              activeDrillW,
                              '#475569',
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </g>
              )}
            </g>
          )}

          {/* 8. ERGONOMIC 20:1 CONTRA-ANGLE HANDPIECE (0 to 30 mm direct vertical slider) */}
          {filters.handpiece && (() => {
            const headBottom = yShankTop;
            const visualTop = Math.min(yHeadTop, headBottom - 10);
            const effectiveVisH = headBottom - visualTop;
            const headMidY = visualTop + effectiveVisH * 0.48;
            const hpHot =
              hoveredDim === 'handpieceHeadHeight' ||
              activeDimDrag?.id === 'handpieceHeadHeight' ||
              highlightedElement === 'handpiece';
            const hpLabelY = visualTop - 16;
            const isLowProfile = headHeightPx < 22;
            return (
              <g
                data-testid="svg-click-handpiece"
                data-hot={hpHot ? 'true' : 'false'}
                role="slider"
                tabIndex={0}
                aria-label="Curseur Contre-angle 20:1 : hauteur de tête (glisser verticalement, double-cliquer pour réinitialiser)"
                aria-valuemin={0.0}
                aria-valuemax={30.0}
                aria-valuenow={clampedHandpieceMm}
                className={`svg-clickable-element cursor-ns-resize outline-none ${
                  highlightedElement === 'handpiece' ? 'svg-element-selected' : ''
                }`}
                onPointerEnter={() => setHoveredDim('handpieceHeadHeight')}
                onPointerLeave={() =>
                  setHoveredDim((prev) =>
                    prev === 'handpieceHeadHeight' ? null : prev,
                  )
                }
                onPointerDown={handleDimPointerDown(handpieceSliderSpec)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onResetParam?.('handpieceHeadHeight');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    handpieceSliderSpec.onChange(
                      clamp(roundTo(handpieceSliderSpec.value + handpieceSliderSpec.step, 1), 0.0, 30.0),
                    );
                  } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handpieceSliderSpec.onChange(
                      clamp(roundTo(handpieceSliderSpec.value - handpieceSliderSpec.step, 1), 0.0, 30.0),
                    );
                  }
                }}
              >
                <title>
                  Contre-angle 20:1 ({clampedHandpieceMm.toFixed(1)} mm) — Glisser haut/bas directement sur le contre-angle pour modifier, double-cliquer pour réinitialiser
                </title>
                {!isLowProfile ? (
                  <>
                    <path
                      d={`M ${CX + 18} ${visualTop + Math.min(16, effectiveVisH * 0.25)}
                          C ${CX + 58} ${visualTop + Math.min(14, effectiveVisH * 0.2)}, ${CX + 96} ${visualTop - 2}, ${CX + 150} ${visualTop - 8}
                          L ${CX + 312} ${visualTop - 16}
                          L ${CX + 312} ${headMidY + 18}
                          L ${CX + 150} ${headMidY + 12}
                          C ${CX + 96} ${headMidY + 16}, ${CX + 58} ${headBottom - Math.min(16, effectiveVisH * 0.25)}, ${CX + 18} ${headBottom - Math.min(14, effectiveVisH * 0.2)} Z`}
                      fill="url(#handpieceGrad)"
                      stroke={hpHot ? '#0284C7' : '#475569'}
                      strokeWidth={hpHot ? '2.1' : '1.3'}
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                    <rect
                      x={CX - 17}
                      y={headBottom - 4}
                      width="34"
                      height="9"
                      rx="2"
                      fill="#CBD5E1"
                      stroke={hpHot ? '#0284C7' : '#475569'}
                      strokeWidth={hpHot ? '1.6' : '1.1'}
                      pointerEvents="none"
                    />
                    <path
                      d={`M ${CX - 23} ${visualTop + Math.min(10, effectiveVisH * 0.2)}
                          C ${CX - 23} ${visualTop + 2}, ${CX - 16} ${visualTop}, ${CX} ${visualTop}
                          C ${CX + 16} ${visualTop}, ${CX + 23} ${visualTop + 2}, ${CX + 23} ${visualTop + Math.min(10, effectiveVisH * 0.2)}
                          L ${CX + 21} ${headBottom - 4}
                          C ${CX + 21} ${headBottom}, ${CX + 15} ${headBottom + 2}, ${CX} ${headBottom + 2}
                          C ${CX - 15} ${headBottom + 2}, ${CX - 21} ${headBottom}, ${CX - 21} ${headBottom - 4} Z`}
                      fill="url(#handpieceGrad)"
                      stroke={hpHot ? '#0284C7' : '#475569'}
                      strokeWidth={hpHot ? '2.2' : '1.4'}
                      pointerEvents="none"
                    />
                    <path
                      d={`M ${CX - 15} ${visualTop}
                          Q ${CX} ${visualTop - 8} ${CX + 15} ${visualTop} Z`}
                      fill="#94A3B8"
                      stroke={hpHot ? '#0284C7' : '#475569'}
                      strokeWidth={hpHot ? '1.6' : '1.1'}
                      pointerEvents="none"
                    />
                    <path
                      d={`M ${CX + 82} ${visualTop + 7} L ${CX + 88} ${visualTop + 6} L ${CX + 88} ${headMidY + 17} L ${CX + 82} ${headMidY + 18} Z`}
                      fill="#0284C7"
                      pointerEvents="none"
                    />
                    <line
                      x1={CX + 148}
                      y1={visualTop - 8}
                      x2={CX + 148}
                      y2={headMidY + 12}
                      stroke="#64748B"
                      strokeWidth="1"
                      opacity="0.6"
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <rect
                    x={CX - 18}
                    y={headBottom - 6}
                    width="36"
                    height="9"
                    rx="2.5"
                    fill="url(#handpieceGrad)"
                    stroke={hpHot ? '#0284C7' : '#475569'}
                    strokeWidth={hpHot ? '1.8' : '1.1'}
                    pointerEvents="none"
                  />
                )}

                {/* Label badge anchored above the contra-angle */}
                <g data-testid="svg-dim-handpieceHeadHeight" data-hot={hpHot ? 'true' : 'false'}>
                  <rect
                    x={CX + 42}
                    y={hpLabelY - 12}
                    width="172"
                    height="17"
                    rx="3.5"
                    fill={hpHot ? '#F0F9FF' : 'transparent'}
                    stroke={hpHot ? '#0284C7' : 'transparent'}
                    strokeWidth="1.2"
                    pointerEvents="none"
                  />
                  <text
                    x={CX + 46}
                    y={hpLabelY}
                    fontSize="10.5"
                    fontWeight="600"
                    fill={hpHot ? '#0369A1' : '#334155'}
                    pointerEvents="none"
                  >
                    Contre-angle 20:1 ({clampedHandpieceMm.toFixed(1)} mm)
                  </text>
                </g>

                {/* Vertical slider arrow cues on hover/drag */}
                {hpHot && (
                  <g fill="#0284C7" opacity="0.92" pointerEvents="none">
                    <polygon points={`${CX - 3},${visualTop - 10} ${CX + 3},${visualTop - 10} ${CX},${visualTop - 15}`} />
                    <polygon points={`${CX - 3},${headBottom + 8} ${CX + 3},${headBottom + 8} ${CX},${headBottom + 13}`} />
                  </g>
                )}

                {/* Generous transparent hit area covering head, body, and label */}
                <rect
                  data-testid="svg-dim-handpiece-hit"
                  x={CX - 28}
                  y={hpLabelY - 16}
                  width="344"
                  height={Math.max(54, headBottom - (hpLabelY - 16) + 12)}
                  fill="transparent"
                />
              </g>
            );
          })()}

          {/* 9. EXTERNAL INTERACTIVE CAD DIMENSION SLIDERS (Thickening on hover, vertical slider drag on line or number) */}
          {filters.diagramControls && (
            <g data-testid="layer-external-dimensions">
              {dimensionSpecs.map((spec) => {
                const isHot = hoveredDim === spec.id || activeDimDrag?.id === spec.id;
                const isDragging = activeDimDrag?.id === spec.id;
                const minY = Math.min(spec.y1, spec.y2);
                const maxY = Math.max(spec.y1, spec.y2);
                const midY = (spec.y1 + spec.y2) / 2;
                const badgeH = 21;
                const badgeY = midY - badgeH / 2;
                const badgeX =
                  spec.side === 'left'
                    ? spec.lineX - 7 - spec.badgeW
                    : spec.lineX + 7;
                const badgeCenterX = badgeX + spec.badgeW / 2;
                const tickHalf = isHot ? 7 : 5;

                return (
                  <g
                    key={spec.id}
                    data-testid={`svg-dim-${spec.id}`}
                    data-hot={isHot ? 'true' : 'false'}
                    role="slider"
                    tabIndex={0}
                    aria-label={spec.ariaLabel}
                    aria-valuemin={spec.min}
                    aria-valuemax={spec.max}
                    aria-valuenow={spec.value}
                    className="cursor-ns-resize outline-none"
                    onPointerEnter={() => setHoveredDim(spec.id)}
                    onPointerLeave={() =>
                      setHoveredDim((prev) => (prev === spec.id ? null : prev))
                    }
                    onPointerDown={handleDimPointerDown(spec)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onResetParam?.(spec.resetKey);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        spec.onChange(clamp(roundTo(spec.value + spec.step, 2), spec.min, spec.max));
                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        spec.onChange(clamp(roundTo(spec.value - spec.step, 2), spec.min, spec.max));
                      }
                    }}
                  >
                    <title>
                      {spec.titleLabel} : {spec.label} — Cliquer et glisser vers le haut/bas pour modifier
                    </title>

                    {/* Dashed witness lines connecting anatomy/drill level to external dimension line */}
                    <line
                      x1={spec.anchorX1}
                      y1={spec.y1}
                      x2={spec.lineX}
                      y2={spec.y1}
                      stroke={spec.color}
                      strokeWidth={isHot ? 1.6 : 0.9}
                      strokeDasharray="3 3"
                      opacity={isHot ? 0.85 : 0.32}
                      pointerEvents="none"
                    />
                    <line
                      x1={spec.anchorX2}
                      y1={spec.y2}
                      x2={spec.lineX}
                      y2={spec.y2}
                      stroke={spec.color}
                      strokeWidth={isHot ? 1.6 : 0.9}
                      strokeDasharray="3 3"
                      opacity={isHot ? 0.85 : 0.32}
                      pointerEvents="none"
                    />

                    {/* Physical dimension line + top/bottom ticks */}
                    <line
                      data-testid={`svg-dim-line-${spec.id}`}
                      x1={spec.lineX}
                      y1={spec.y1}
                      x2={spec.lineX}
                      y2={spec.y2}
                      stroke={spec.color}
                      strokeWidth={isHot ? 3.2 : 1.6}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                    <line
                      x1={spec.lineX - tickHalf}
                      y1={spec.y1}
                      x2={spec.lineX + tickHalf}
                      y2={spec.y1}
                      stroke={spec.color}
                      strokeWidth={isHot ? 3.0 : 1.6}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                    <line
                      x1={spec.lineX - tickHalf}
                      y1={spec.y2}
                      x2={spec.lineX + tickHalf}
                      y2={spec.y2}
                      stroke={spec.color}
                      strokeWidth={isHot ? 3.0 : 1.6}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />

                    {/* Zero-span center dot when y1 == y2 (e.g. subcrestal = 0.0) */}
                    {Math.abs(spec.y2 - spec.y1) < 2 && (
                      <circle cx={spec.lineX} cy={midY} r={isHot ? 3.5 : 2.2} fill={spec.color} pointerEvents="none" />
                    )}

                    {/* Short external connector stem from dimension line to external badge */}
                    <line
                      x1={spec.lineX}
                      y1={midY}
                      x2={spec.side === 'left' ? badgeX + spec.badgeW : badgeX}
                      y2={midY}
                      stroke={spec.color}
                      strokeWidth={isHot ? 2.2 : 1.2}
                      pointerEvents="none"
                    />

                    {/* External Numeric Badge (always strictly outside dimension line) */}
                    <rect
                      data-testid={`svg-dim-badge-${spec.id}`}
                      x={badgeX}
                      y={badgeY}
                      width={spec.badgeW}
                      height={badgeH}
                      rx="4.5"
                      fill={isDragging ? '#FFFFFF' : spec.badgeFill}
                      stroke={isHot ? spec.color : spec.badgeStroke}
                      strokeWidth={isHot ? 2.3 : 1.1}
                      pointerEvents="none"
                    />

                    <text
                      x={badgeCenterX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      fontSize={isHot ? '10' : '9.5'}
                      fontWeight="700"
                      fill={spec.textColor}
                      fontFamily="JetBrains Mono, monospace"
                      pointerEvents="none"
                    >
                      {spec.label}
                    </text>

                    {/* Subtle vertical slider arrow cues on hover/drag */}
                    {isHot && (
                      <g fill={spec.color} opacity="0.9" pointerEvents="none">
                        <polygon
                          points={`${badgeCenterX - 3},${badgeY - 2.5} ${badgeCenterX + 3},${badgeY - 2.5} ${badgeCenterX},${badgeY - 6.5}`}
                        />
                        <polygon
                          points={`${badgeCenterX - 3},${badgeY + badgeH + 2.5} ${badgeCenterX + 3},${badgeY + badgeH + 2.5} ${badgeCenterX},${badgeY + badgeH + 6.5}`}
                        />
                      </g>
                    )}

                    {/* Invisible generous pointer hit target on physical dimension line */}
                    <rect
                      data-testid={`svg-dim-line-hit-${spec.id}`}
                      x={spec.lineX - 11}
                      y={minY - 8}
                      width="22"
                      height={Math.max(20, maxY - minY + 16)}
                      fill="transparent"
                    />

                    {/* Invisible generous pointer hit target on external numeric pill */}
                    <rect
                      data-testid={`svg-dim-badge-hit-${spec.id}`}
                      x={badgeX - 4}
                      y={badgeY - 4}
                      width={spec.badgeW + 8}
                      height={badgeH + 8}
                      fill="transparent"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
