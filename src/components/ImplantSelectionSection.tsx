import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CustomImplantSystem,
  DrillingKit,
  GLOBAL_D_IMPLANT_DIAMETERS,
  GLOBAL_D_IMPLANT_LENGTHS,
  SimulationParams,
  clamp,
  formatMetricMm,
  getCompatibleImplantsForKit,
  groupImplantModelsByBrand,
  pickOptimalPilotLength,
  sortImplantModelsByUsage,
} from '../utils/implantGeometry';
import { SmoothDrawer } from './SmoothDrawer';

interface ImplantSelectionSectionProps {
  variant: 'assisted' | 'advanced';
  params: SimulationParams;
  activeKit: DrillingKit;
  customImplants: CustomImplantSystem[];
  diameterHighlightClass?: string;
  lengthHighlightClass?: string;
  onSelectImplant: (patch: Partial<SimulationParams>) => void;
  onSelectImplantModel: (
    model: CustomImplantSystem,
    overrides?: { implantDiameter?: number; implantLength?: number },
  ) => void;
  onDeleteImplantModel?: (modelId: string) => void;
  onOpenFreeImplantWizard: () => void;
}

export function ImplantSelectionSection({
  variant,
  params,
  activeKit,
  customImplants,
  diameterHighlightClass = '',
  lengthHighlightClass = '',
  onSelectImplant,
  onSelectImplantModel,
  onDeleteImplantModel,
  onOpenFreeImplantWizard,
}: ImplantSelectionSectionProps) {
  const [implantDrawerOpen, setImplantDrawerOpen] = useState(false);

  const isAssisted = variant === 'assisted';
  const isStrictGuided = activeKit.kind === 'guided';

  const compatibleImplants = getCompatibleImplantsForKit(activeKit, customImplants);
  const sortedImplantLibrary = isStrictGuided
    ? compatibleImplants
    : sortImplantModelsByUsage(customImplants);
  const topThreeImplants = sortedImplantLibrary.slice(0, 3);
  const extraImplants = isStrictGuided ? [] : sortedImplantLibrary.slice(3);
  const extraBrandGroups = groupImplantModelsByBrand(extraImplants);

  const activeLibraryModel =
    compatibleImplants.find((m) => m.id === params.customImplantId) ??
    compatibleImplants[0] ??
    customImplants[0];

  const activeDiameters = isStrictGuided
    ? [...activeKit.userDefaults.implantDiametersMm].sort((a, b) => a - b)
    : activeLibraryModel?.diametersMm ?? GLOBAL_D_IMPLANT_DIAMETERS;

  const activeLengths = isStrictGuided
    ? [...activeKit.userDefaults.implantLengthsMm].sort((a, b) => a - b)
    : activeLibraryModel?.lengthsMm ?? GLOBAL_D_IMPLANT_LENGTHS;

  const activeModelLabel = isStrictGuided
    ? activeKit.implantBrandName && activeKit.implantModelName
      ? `${activeKit.implantBrandName} ${activeKit.implantModelName}`
      : activeKit.name
    : activeLibraryModel
      ? `${activeLibraryModel.brand} ${activeLibraryModel.model}`
      : 'Global D In-Kone';

  const handleImplantLengthChange = (nextLen: number) => {
    const patch: Partial<SimulationParams> = { implantLength: nextLen };
    if (activeKit.kind === 'pilot') {
      patch.pilotDrillLength = pickOptimalPilotLength(
        nextLen,
        activeKit.userDefaults.availableLengthsMm,
        params.subcrestalDepth,
        params.gingivaThickness,
        params.guideHeight,
      );
    }
    onSelectImplant(patch);
  };

  const renderModelCard = (model: CustomImplantSystem) => {
    const isSelected = activeLibraryModel?.id === model.id;
    return (
      <div
        key={model.id}
        data-testid={`${isAssisted ? 'onb-' : ''}implant-model-${model.id}`}
        className={`flex items-start justify-between gap-1.5 rounded-lg border transition-colors ${
          isAssisted ? 'p-3' : 'px-2 py-1.5'
        } ${
          isSelected
            ? 'border-sky-600 bg-sky-50/70'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectImplantModel(model)}
          className="min-w-0 flex-1 space-y-0.5 text-left"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span
              className={`truncate font-bold leading-tight text-slate-900 ${
                isAssisted ? 'text-sm' : 'text-[11.5px]'
              }`}
            >
              {model.brand}
            </span>
          </div>
          <div>
            <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-sky-800">
              {model.model}
            </span>
          </div>
          <div className="font-mono-tabular truncate text-[10px] text-slate-500">
            Ø {model.diametersMm.map((d) => formatMetricMm(d)).join(' · ')} | L{' '}
            {model.lengthsMm
              .map((l) => (Number.isInteger(l) ? l.toFixed(0) : l.toFixed(1)))
              .join(' · ')}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!isStrictGuided && !model.isFactory && onDeleteImplantModel && (
            <button
              type="button"
              onClick={() => onDeleteImplantModel(model.id)}
              aria-label={`Supprimer ${model.brand} ${model.model}`}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {isAssisted && (
            <CheckCircle2
              className={`h-4 w-4 ${isSelected ? 'text-sky-600' : 'text-slate-200'}`}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    );
  };

  const [activeSlider, setActiveSlider] = useState<'diameter' | 'length' | null>(null);

  // When strict guided kit: snap slider strictly to compatible indices so incompatible sizes cannot be selected
  const matchedDiaIdx = activeDiameters.findIndex((d) => Math.abs(d - params.implantDiameter) < 0.05);
  const effectiveDiaIdx = matchedDiaIdx !== -1 ? matchedDiaIdx : 0;
  const effectiveDia = isStrictGuided
    ? (activeDiameters[effectiveDiaIdx] ?? params.implantDiameter)
    : clamp(params.implantDiameter, 2.0, 8.0);
  const diaRatio = isStrictGuided
    ? activeDiameters.length > 1
      ? effectiveDiaIdx / (activeDiameters.length - 1)
      : 0.5
    : clamp((effectiveDia - 2.0) / (8.0 - 2.0), 0, 1);

  const matchedLenIdx = activeLengths.findIndex((l) => Math.abs(l - params.implantLength) < 0.05);
  const effectiveLenIdx = matchedLenIdx !== -1 ? matchedLenIdx : 0;
  const effectiveLen = isStrictGuided
    ? (activeLengths[effectiveLenIdx] ?? params.implantLength)
    : clamp(params.implantLength, 4.0, 20.0);
  const lenRatio = isStrictGuided
    ? activeLengths.length > 1
      ? effectiveLenIdx / (activeLengths.length - 1)
      : 0.5
    : clamp((effectiveLen - 4.0) / (20.0 - 4.0), 0, 1);

  return (
    <div className="space-y-2.5">
      {/* Library Mode Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`font-bold text-slate-800 ${
              isAssisted ? 'text-xs' : 'text-[11px]'
            }`}
          >
            {isStrictGuided ? 'Gamme compatible stricte' : 'Bibliothèque implants'}
          </div>
          <div className="truncate text-[10.5px] text-slate-500">
            {isStrictGuided
              ? `${activeKit.implantBrandName ?? activeKit.name} · ${activeKit.implantModelName ?? 'Gamme guidée'}`
              : 'Top 3 les plus utilisés (tous implants compatibles foret pilote)'}
          </div>
        </div>
        {isStrictGuided ? (
          <span
            data-testid="strict-compatibility-badge"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
          >
            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
            Compatible trousse
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpenFreeImplantWizard}
            data-testid={isAssisted ? 'onb-open-free-implant-btn' : 'open-free-implant-btn'}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-300 bg-sky-50/70 px-2.5 py-1 text-[10.5px] font-semibold text-sky-800 hover:bg-sky-100"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Saisie libre
          </button>
        )}
      </div>

      {/* Compatible Implant Cards (strictly filtered for guided kits) */}
      <div
        className="space-y-1.5"
        data-testid={isAssisted ? 'onb-pilot-implant-library' : 'pilot-implant-library'}
      >
        <div
          className={
            isAssisted
              ? topThreeImplants.length === 1
                ? 'grid grid-cols-1 gap-2.5'
                : topThreeImplants.length === 2
                  ? 'grid grid-cols-1 gap-2.5 md:grid-cols-2'
                  : 'grid grid-cols-1 gap-2.5 md:grid-cols-3'
              : 'space-y-1'
          }
        >
          {topThreeImplants.map(renderModelCard)}
        </div>

        {extraImplants.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setImplantDrawerOpen((o) => !o)}
              aria-expanded={implantDrawerOpen}
              data-testid={
                isAssisted ? 'onb-extra-implants-toggle' : 'extra-implants-drawer-toggle'
              }
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span>Autres modèles ({extraImplants.length})</span>
              {implantDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              )}
            </button>
            <SmoothDrawer open={implantDrawerOpen}>
              <div
                data-testid={
                  isAssisted ? 'onb-extra-implants-drawer' : 'extra-implants-drawer'
                }
                className="mt-1.5 space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2"
              >
                {extraBrandGroups.map((group) => (
                  <div key={group.brand} className="space-y-1">
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {group.brand}
                    </div>
                    <div
                      className={
                        isAssisted ? 'grid grid-cols-1 gap-2 md:grid-cols-2' : 'space-y-1'
                      }
                    >
                      {group.models.map(renderModelCard)}
                    </div>
                  </div>
                ))}
              </div>
            </SmoothDrawer>
          </div>
        )}
      </div>

      {/* Diameters & Lengths: Preset Buttons (+ Synced Sliders in Advanced sidebar only) */}
      <div className={isAssisted ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'space-y-2.5'}>
        {/* Diameters */}
        <div className={diameterHighlightClass}>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            {isAssisted ? (
              <span className="truncate font-semibold text-slate-700">
                Diamètre {activeModelLabel} (mm)
              </span>
            ) : (
              <label
                htmlFor="implant-diameter-slider"
                className="truncate font-semibold text-slate-700"
              >
                Diamètre {activeModelLabel} (mm)
              </label>
            )}
            <span className="font-mono-tabular shrink-0 font-bold text-slate-900">
              Ø{formatMetricMm(effectiveDia)} mm
            </span>
          </div>
          <div
            data-testid={isAssisted ? 'onb-diameter-buttons' : 'diameter-buttons'}
            className={`grid ${isAssisted ? 'gap-1.5' : 'gap-1'} ${
              activeDiameters.length <= 3
                ? 'grid-cols-3'
                : activeDiameters.length === 4
                  ? 'grid-cols-4'
                  : 'grid-cols-5'
            }`}
          >
            {activeDiameters.map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => onSelectImplant({ implantDiameter: dia })}
                className={`font-mono-tabular rounded-md border ${
                  isAssisted ? 'py-1.5 text-xs' : 'py-1 text-[11px]'
                } font-semibold transition-colors ${
                  Math.abs(effectiveDia - dia) < 0.05
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Ø{formatMetricMm(dia)}
              </button>
            ))}
          </div>
          {!isAssisted && (
            <div className="mt-1.5">
              {isStrictGuided ? (
                <input
                  id="implant-diameter-slider"
                  data-testid="implant-diameter-slider"
                  type="range"
                  min={0}
                  max={Math.max(0, activeDiameters.length - 1)}
                  step={1}
                  value={effectiveDiaIdx}
                  disabled={activeDiameters.length <= 1}
                  aria-label="Curseur diamètre compatible de l'implant"
                  onPointerDown={() => setActiveSlider('diameter')}
                  onPointerUp={() => setActiveSlider(null)}
                  onPointerCancel={() => setActiveSlider(null)}
                  onFocus={() => setActiveSlider('diameter')}
                  onBlur={() => setActiveSlider(null)}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    const chosen = activeDiameters[idx];
                    if (chosen !== undefined) onSelectImplant({ implantDiameter: chosen });
                  }}
                  className="cad-slider block w-full"
                />
              ) : (
                <input
                  id="implant-diameter-slider"
                  data-testid="implant-diameter-slider"
                  type="range"
                  min={2.0}
                  max={8.0}
                  step={0.1}
                  value={effectiveDia}
                  aria-label="Curseur diamètre de l'implant"
                  title="Double-cliquer pour réinitialiser par défaut"
                  onPointerDown={() => setActiveSlider('diameter')}
                  onPointerUp={() => setActiveSlider(null)}
                  onPointerCancel={() => setActiveSlider(null)}
                  onFocus={() => setActiveSlider('diameter')}
                  onBlur={() => setActiveSlider(null)}
                  onChange={(e) => onSelectImplant({ implantDiameter: parseFloat(e.target.value) })}
                  onDoubleClick={() =>
                    onSelectImplant({
                      implantDiameter: activeDiameters.includes(4.2) ? 4.2 : (activeDiameters[0] ?? 4.2),
                    })
                  }
                  className="cad-slider block w-full"
                />
              )}
              <div className="relative mt-1.5 h-5 w-full" aria-hidden="true">
                <div
                  data-testid="diameter-slider-readout"
                  style={{
                    left: `clamp(26px, calc(${diaRatio * 100}% + ${7 - diaRatio * 14}px), calc(100% - 26px))`,
                  }}
                  className={`font-mono-tabular absolute top-0 -translate-x-1/2 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors ${
                    activeSlider === 'diameter'
                      ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                      : 'border-sky-300 bg-sky-50 text-sky-800'
                  }`}
                >
                  Ø{formatMetricMm(effectiveDia)} mm
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lengths */}
        <div className={lengthHighlightClass}>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            {isAssisted ? (
              <span className="truncate font-semibold text-slate-700">
                Longueur {activeModelLabel} (mm)
              </span>
            ) : (
              <label
                htmlFor="implant-length-slider"
                className="truncate font-semibold text-slate-700"
              >
                Longueur {activeModelLabel} (mm)
              </label>
            )}
            <span className="font-mono-tabular shrink-0 font-bold text-slate-900">
              {effectiveLen.toFixed(1)} mm
            </span>
          </div>
          <div
            data-testid={isAssisted ? 'onb-length-buttons' : 'length-buttons'}
            className={`grid grid-cols-3 ${isAssisted ? 'gap-1.5' : 'gap-1'}`}
          >
            {activeLengths.map((len) => (
              <button
                key={len}
                type="button"
                onClick={() => handleImplantLengthChange(len)}
                className={`font-mono-tabular rounded-md border ${
                  isAssisted ? 'py-1.5' : 'py-1'
                } text-xs font-semibold transition-colors ${
                  Math.abs(effectiveLen - len) < 0.05
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {Number.isInteger(len) ? `${len.toFixed(0)} mm` : `${len.toFixed(1)} mm`}
              </button>
            ))}
          </div>
          {!isAssisted && (
            <div className="mt-1.5">
              {isStrictGuided ? (
                <input
                  id="implant-length-slider"
                  data-testid="implant-length-slider"
                  type="range"
                  min={0}
                  max={Math.max(0, activeLengths.length - 1)}
                  step={1}
                  value={effectiveLenIdx}
                  disabled={activeLengths.length <= 1}
                  aria-label="Curseur longueur compatible de l'implant"
                  onPointerDown={() => setActiveSlider('length')}
                  onPointerUp={() => setActiveSlider(null)}
                  onPointerCancel={() => setActiveSlider(null)}
                  onFocus={() => setActiveSlider('length')}
                  onBlur={() => setActiveSlider(null)}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    const chosen = activeLengths[idx];
                    if (chosen !== undefined) handleImplantLengthChange(chosen);
                  }}
                  className="cad-slider block w-full"
                />
              ) : (
                <input
                  id="implant-length-slider"
                  data-testid="implant-length-slider"
                  type="range"
                  min={4.0}
                  max={20.0}
                  step={0.1}
                  value={effectiveLen}
                  aria-label="Curseur longueur de l'implant"
                  title="Double-cliquer pour réinitialiser par défaut"
                  onPointerDown={() => setActiveSlider('length')}
                  onPointerUp={() => setActiveSlider(null)}
                  onPointerCancel={() => setActiveSlider(null)}
                  onFocus={() => setActiveSlider('length')}
                  onBlur={() => setActiveSlider(null)}
                  onChange={(e) => handleImplantLengthChange(parseFloat(e.target.value))}
                  onDoubleClick={() =>
                    handleImplantLengthChange(
                      activeLengths.includes(10.0) ? 10.0 : (activeLengths[0] ?? 10.0),
                    )
                  }
                  className="cad-slider block w-full"
                />
              )}
              <div className="relative mt-1.5 h-5 w-full" aria-hidden="true">
                <div
                  data-testid="length-slider-readout"
                  style={{
                    left: `clamp(26px, calc(${lenRatio * 100}% + ${7 - lenRatio * 14}px), calc(100% - 26px))`,
                  }}
                  className={`font-mono-tabular absolute top-0 -translate-x-1/2 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors ${
                    activeSlider === 'length'
                      ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                      : 'border-sky-300 bg-sky-50 text-sky-800'
                  }`}
                >
                  {effectiveLen.toFixed(1)} mm
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
