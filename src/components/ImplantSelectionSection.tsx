import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BIOTECH_KONTACT_DIAMETERS,
  BIOTECH_KONTACT_LENGTHS,
  CustomImplantSystem,
  DrillingKit,
  GLOBAL_D_IMPLANT_DIAMETERS,
  GLOBAL_D_IMPLANT_LENGTHS,
  SimulationParams,
  clamp,
  groupImplantModelsByBrand,
  pickOptimalPilotLength,
  sortImplantModelsByUsage,
} from '../utils/implantGeometry';

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
  const sortedImplantLibrary = sortImplantModelsByUsage(customImplants);
  const topThreeImplants = sortedImplantLibrary.slice(0, 3);
  const extraImplants = sortedImplantLibrary.slice(3);
  const extraBrandGroups = groupImplantModelsByBrand(extraImplants);

  const activeLibraryModel =
    customImplants.find((m) => m.id === params.customImplantId) ??
    (params.implantBrand === 'kontact'
      ? customImplants.find((m) => m.id === 'factory-implant-biotech-kontact')
      : params.implantBrand === 'globald'
        ? customImplants.find((m) => m.id === 'factory-implant-globald-inkone')
        : customImplants.find((m) => m.name === params.customImplantName)) ??
    customImplants[0];

  const activeDiameters =
    activeKit.kind === 'guided' && !activeKit.isFactory
      ? activeKit.userDefaults.implantDiametersMm
      : activeKit.kind === 'guided' && params.implantBrand === 'kontact'
        ? BIOTECH_KONTACT_DIAMETERS
        : activeLibraryModel?.diametersMm ?? GLOBAL_D_IMPLANT_DIAMETERS;

  const activeLengths =
    activeKit.kind === 'guided' && !activeKit.isFactory
      ? activeKit.userDefaults.implantLengthsMm
      : activeKit.kind === 'guided' && params.implantBrand === 'kontact'
        ? BIOTECH_KONTACT_LENGTHS
        : activeLibraryModel?.lengthsMm ?? GLOBAL_D_IMPLANT_LENGTHS;

  const activeModelLabel =
    activeKit.kind === 'guided' && !activeKit.isFactory
      ? activeKit.name
      : activeLibraryModel
        ? `${activeLibraryModel.brand} ${activeLibraryModel.model}`
        : params.implantBrand === 'globald'
          ? 'Global D In-Kone'
          : 'Biotech Kontact';

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
            Ø {model.diametersMm.map((d) => d.toFixed(1)).join(' · ')} | L{' '}
            {model.lengthsMm
              .map((l) => (Number.isInteger(l) ? l.toFixed(0) : l.toFixed(1)))
              .join(' · ')}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!model.isFactory && onDeleteImplantModel && (
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

  return (
    <div className="space-y-2.5">
      {/* Library Mode Header: Synchronized across Mode assisté & Mode avancé */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`font-bold text-slate-800 ${
              isAssisted ? 'text-xs' : 'text-[11px]'
            }`}
          >
            {activeKit.kind === 'pilot' ? 'Bibliothèque implants' : 'Gamme compatible'}
          </div>
          <div className="truncate text-[10.5px] text-slate-500">
            {activeKit.kind === 'pilot'
              ? 'Top 3 les plus utilisés (classés par marque et modèle)'
              : `${activeKit.implantBrandName ?? 'Biotech'} · ${activeKit.implantModelName ?? 'Kontact'}`}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenFreeImplantWizard}
          data-testid={isAssisted ? 'onb-open-free-implant-btn' : 'open-free-implant-btn'}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-300 bg-sky-50/70 px-2.5 py-1 text-[10.5px] font-semibold text-sky-800 hover:bg-sky-100"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Saisie libre
        </button>
      </div>

      {/* Pilot Mode: Full Implant Library (Top 3 + Closed Brand-Grouped Drawer) */}
      {activeKit.kind === 'pilot' && (
        <div
          className="space-y-1.5"
          data-testid={isAssisted ? 'onb-pilot-implant-library' : 'pilot-implant-library'}
        >
          <div
            className={
              isAssisted ? 'grid grid-cols-1 gap-2.5 md:grid-cols-3' : 'space-y-1'
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
              {implantDrawerOpen && (
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
              )}
            </div>
          )}
        </div>
      )}

      {/* Guided System: Quick revert if custom Saisie libre model was temporarily chosen */}
      {activeKit.kind === 'guided' &&
        params.implantBrand === 'custom' &&
        activeLibraryModel && (
          <div className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50/50 px-2.5 py-1.5 text-[10.5px]">
            <span className="truncate font-semibold text-sky-900">
              Saisie libre : {activeLibraryModel.brand} {activeLibraryModel.model}
            </span>
            <button
              type="button"
              onClick={() =>
                onSelectImplant({
                  implantBrand:
                    activeKit.id === 'factory-biotech-kontact' ? 'kontact' : 'custom',
                  customImplantId:
                    activeKit.id === 'factory-biotech-kontact'
                      ? 'factory-implant-biotech-kontact'
                      : undefined,
                  customImplantName:
                    activeKit.id === 'factory-biotech-kontact' ? undefined : activeKit.name,
                  implantDiameter: activeKit.userDefaults.implantDiametersMm[0] ?? 4.2,
                  implantLength: activeKit.userDefaults.implantLengthsMm[0] ?? 10.0,
                })
              }
              className="shrink-0 font-semibold text-sky-700 underline hover:text-sky-900"
            >
              Compatible
            </button>
          </div>
        )}

      {/* Diameters: Preset Buttons + Synced Continuous Slider (2.0–8.0 mm) */}
      <div className={diameterHighlightClass}>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <label
            htmlFor={`${isAssisted ? 'onb-' : ''}implant-diameter-slider`}
            className="truncate font-semibold text-slate-700"
          >
            Diamètre {activeModelLabel} (mm)
          </label>
          <span className="font-mono-tabular shrink-0 font-bold text-slate-900">
            Ø{params.implantDiameter.toFixed(1)} mm
          </span>
        </div>
        <div
          className={`grid gap-1 ${
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
              className={`font-mono-tabular rounded-md border py-1 text-[11px] font-semibold transition-colors ${
                Math.abs(params.implantDiameter - dia) < 0.05
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Ø{dia.toFixed(1)}
            </button>
          ))}
        </div>
        <input
          id={`${isAssisted ? 'onb-' : ''}implant-diameter-slider`}
          data-testid={`${isAssisted ? 'onb-' : ''}implant-diameter-slider`}
          type="range"
          min={2.0}
          max={8.0}
          step={0.1}
          value={clamp(params.implantDiameter, 2.0, 8.0)}
          aria-label="Curseur diamètre de l'implant"
          onChange={(e) => onSelectImplant({ implantDiameter: parseFloat(e.target.value) })}
          className="cad-slider mt-1.5 w-full"
        />
      </div>

      {/* Lengths: Preset Buttons + Synced Continuous Slider (4.0–20.0 mm) */}
      <div className={lengthHighlightClass}>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <label
            htmlFor={`${isAssisted ? 'onb-' : ''}implant-length-slider`}
            className="truncate font-semibold text-slate-700"
          >
            Longueur {activeModelLabel} (mm)
          </label>
          <span className="font-mono-tabular shrink-0 font-bold text-slate-900">
            {params.implantLength.toFixed(1)} mm
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {activeLengths.map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => handleImplantLengthChange(len)}
              className={`font-mono-tabular rounded-md border py-1 text-xs font-semibold transition-colors ${
                Math.abs(params.implantLength - len) < 0.05
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {Number.isInteger(len) ? `${len.toFixed(0)} mm` : `${len.toFixed(1)} mm`}
            </button>
          ))}
        </div>
        <input
          id={`${isAssisted ? 'onb-' : ''}implant-length-slider`}
          data-testid={`${isAssisted ? 'onb-' : ''}implant-length-slider`}
          type="range"
          min={4.0}
          max={20.0}
          step={0.1}
          value={clamp(params.implantLength, 4.0, 20.0)}
          aria-label="Curseur longueur de l'implant"
          onChange={(e) => handleImplantLengthChange(parseFloat(e.target.value))}
          className="cad-slider mt-1.5 w-full"
        />
      </div>
    </div>
  );
}
