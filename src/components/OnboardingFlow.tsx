import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  BIOTECH_KONTACT_DIAMETERS,
  BIOTECH_KONTACT_LENGTHS,
  CustomImplantSystem,
  DrillingKit,
  SimulationParams,
  groupImplantModelsByBrand,
  pickOptimalPilotLength,
  sortImplantModelsByUsage,
  sortKitsByUsage,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

interface OnboardingFlowProps {
  params: SimulationParams;
  kits: DrillingKit[];
  customImplants: CustomImplantSystem[];
  onChangeParams: (patch: Partial<SimulationParams>) => void;
  onSelectImplantModel: (
    model: CustomImplantSystem,
    overrides?: { implantDiameter?: number; implantLength?: number },
  ) => void;
  onDeleteImplantModel?: (modelId: string) => void;
  onOpenFreeImplantWizard: () => void;
  onSelectKit: (kitId: string) => void;
  onSelectKitSleeve: (kitId: string, hasSleeve: boolean) => void;
  onEditKit: (kitId: string) => void;
  onCompleteToSimulator: () => void;
  onLaunchCaliperWizard: () => void;
}

export function OnboardingFlow({
  params,
  kits,
  customImplants,
  onChangeParams,
  onSelectImplantModel,
  onDeleteImplantModel,
  onOpenFreeImplantWizard,
  onSelectKit,
  onSelectKitSleeve,
  onEditKit,
  onCompleteToSimulator,
  onLaunchCaliperWizard,
}: OnboardingFlowProps) {
  // Step 1: Bibliothèque systèmes de forage & pilotes | Step 2: Bibliothèque & dimensions implant
  const [step, setStep] = useState<1 | 2>(1);
  const [showMoreSystems, setShowMoreSystems] = useState(false);
  const [showMoreImplants, setShowMoreImplants] = useState(false);
  const [chosenKitId, setChosenKitId] = useState<string>(params.activeKitId);

  const orderedSystems = sortKitsByUsage(kits);
  const topThreeSystems = orderedSystems.slice(0, 3);
  const extraSystems = orderedSystems.slice(3);
  const activeSystem = kits.find((k) => k.id === chosenKitId) ?? orderedSystems[0];

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

  const handleContinueStep1 = (kitOverrideId?: string) => {
    const targetId = kitOverrideId ?? activeSystem?.id ?? kits[0]?.id;
    if (targetId) {
      setChosenKitId(targetId);
      onSelectKit(targetId);
    }
    setStep(2);
  };

  const handleFinishToSimulator = () => {
    const activeKit = kits.find((k) => k.id === chosenKitId) ?? orderedSystems[0];
    if (activeKit) {
      onSelectKit(activeKit.id);
      if (activeKit.kind === 'pilot') {
        onChangeParams({
          pilotDrillLength: pickOptimalPilotLength(
            params.implantLength,
            activeKit.userDefaults.availableLengthsMm,
            params.subcrestalDepth,
            params.gingivaThickness,
            activeKit.userDefaults.guidingHeightMm,
          ),
        });
      }
    }
    onCompleteToSimulator();
  };

  const renderSystemRow = (sys: DrillingKit) => {
    const isPicked = chosenKitId === sys.id;
    const currentHasSleeve =
      sys.id === params.activeKitId ? params.hasSleeve : sys.userDefaults.hasSleeve;

    return (
      <div
        key={sys.id}
        data-testid={`onb-system-${sys.id}`}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border p-3 transition-colors ${
          isPicked
            ? 'border-sky-600 bg-sky-50/70'
            : 'border-slate-200 bg-white hover:border-sky-400'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setChosenKitId(sys.id);
            onSelectKit(sys.id);
          }}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
        >
          <CheckCircle2
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              isPicked ? 'text-sky-600' : 'text-slate-300'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-bold leading-snug text-slate-900">{sys.name}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                  sys.kind === 'pilot'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {sys.kind === 'pilot' ? 'Foret pilote' : 'Forage guidé'}
              </span>
            </div>
            <div className="text-[11px] leading-snug text-slate-500">
              {sys.kind === 'pilot'
                ? 'Compatible : Toute la bibliothèque d’implants'
                : sys.implantBrandName && sys.implantModelName
                  ? `Implants compatibles : ${sys.implantBrandName} · Modèle ${sys.implantModelName}`
                  : sys.brandLabel}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label={`Douille pour ${sys.name}`}
            className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold"
          >
            <button
              type="button"
              onClick={() => {
                setChosenKitId(sys.id);
                onSelectKitSleeve(sys.id, true);
              }}
              data-testid={`onb-sleeve-with-${sys.id}`}
              className={`rounded-md px-2.5 py-1 whitespace-nowrap transition-colors ${
                currentHasSleeve
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Avec douille
            </button>
            <button
              type="button"
              onClick={() => {
                setChosenKitId(sys.id);
                onSelectKitSleeve(sys.id, false);
              }}
              data-testid={`onb-sleeve-without-${sys.id}`}
              className={`rounded-md px-2.5 py-1 whitespace-nowrap transition-colors ${
                !currentHasSleeve
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sans douille
            </button>
          </div>

          <button
            type="button"
            onClick={() => onEditKit(sys.id)}
            data-testid={`onb-edit-${sys.id}`}
            title={`Modifier les paramètres de ${sys.name}`}
            aria-label={`Modifier ${sys.name}`}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 transition-colors hover:border-sky-500 hover:text-sky-700"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            <span className="hidden md:inline">Modifier</span>
          </button>
        </div>
      </div>
    );
  };

  const renderImplantModelCard = (model: CustomImplantSystem) => {
    const isSelected = activeLibraryModel?.id === model.id;
    return (
      <div
        key={model.id}
        data-testid={`onb-implant-model-${model.id}`}
        onClick={() => onSelectImplantModel(model)}
        className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
          isSelected
            ? 'border-sky-600 bg-sky-50/60'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-bold leading-tight text-slate-900">{model.brand}</div>
            <div>
              <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-sky-800">
                {model.model}
              </span>
            </div>
            <div className="font-mono-tabular text-[11px] text-slate-500">
              {model.diametersMm.length} Ø · {model.lengthsMm.length} longueurs
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!model.isFactory && onDeleteImplantModel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteImplantModel(model.id);
                }}
                aria-label={`Supprimer ${model.brand} ${model.model}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <CheckCircle2
              className={`h-5 w-5 ${isSelected ? 'text-sky-600' : 'text-slate-200'}`}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="mt-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap gap-1">
            {model.diametersMm.map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => onSelectImplantModel(model, { implantDiameter: dia })}
                className={`font-mono-tabular rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  isSelected && Math.abs(params.implantDiameter - dia) < 0.05
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Ø{dia.toFixed(1)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {model.lengthsMm.map((len) => (
              <button
                key={len}
                type="button"
                onClick={() => onSelectImplantModel(model, { implantLength: len })}
                className={`font-mono-tabular rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  isSelected && Math.abs(params.implantLength - len) < 0.05
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {Number.isInteger(len) ? `${len.toFixed(0)} mm` : `${len.toFixed(1)} mm`}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      data-testid="onboarding-flow"
      aria-label="Bibliothèque des systèmes implantaires BlueTube"
      className="mx-auto max-w-4xl space-y-3 pt-1 pb-2"
    >
      {/* Single-sentence Hero Purpose Strip directly under the BlueTube title banner */}
      <div
        data-testid="onboarding-purpose-banner"
        className="hero-purpose-card rounded-xl border px-5 py-3 text-center shadow-xs"
      >
        <p className="text-sm sm:text-[15.5px] font-medium leading-snug text-slate-700">
          <span className="hero-kw-scale font-bold">
            Simulez votre système de forage implantaire
          </span>{' '}
          à l&apos;échelle pour déterminer les{' '}
          <span className="hero-kw-tube font-extrabold">
            paramètres du tube de guidage
          </span>{' '}
          de <span className="hero-kw-bsp font-extrabold">BlueSkyPlan</span>.
        </p>
      </div>

      {/* 2-Step Guided Mode Card ("Mode assisté") */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bsp-section-header border-b px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
              Mode assisté
            </span>
            <span className="font-mono-tabular shrink-0 rounded border border-slate-300/70 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Étape {step} / 2
            </span>
          </div>
          <h2 className="mt-1.5 text-sm sm:text-[15px] font-bold leading-snug text-slate-900">
            {step === 1 ? (
              <BilingualTerm
                fr="Quel système de forage souhaitez-vous utiliser ?"
                en="Drilling & Pilot Kit Library"
              />
            ) : (
              <BilingualTerm
                fr="Quel implant souhaitez-vous poser ?"
                en="Implant Model & Dimensions"
              />
            )}
          </h2>
        </div>

        {/* STEP 1: DRILLING & PILOT KIT LIBRARY (TOP 3 + DRAWER) */}
        {step === 1 && (
          <div className="space-y-3.5 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />
                Top 3 des trousses de forage &amp; pilotes les plus utilisées
              </span>
              <span className="text-[11px] text-slate-500">
                Guidés (implants compatibles) ou pilotes (tous implants)
              </span>
            </div>

            <div className="space-y-2" data-testid="onb-systems-list">
              {topThreeSystems.map((sys) => renderSystemRow(sys))}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowMoreSystems((v) => !v)}
                aria-expanded={showMoreSystems}
                data-testid="onb-more-systems-btn"
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-sky-400 hover:text-slate-900"
              >
                <span>
                  Autres systèmes de forage &amp; pilotes (bibliothèque locale ·{' '}
                  {extraSystems.length})
                </span>
                {showMoreSystems ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                )}
              </button>

              {showMoreSystems && (
                <div
                  data-testid="onb-extra-systems-drawer"
                  className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                >
                  {extraSystems.length === 0 ? (
                    <p className="px-2 py-1.5 text-center text-[11.5px] text-slate-500">
                      Tous vos systèmes de forage enregistrés localement sont déjà affichés dans le
                      Top 3.
                    </p>
                  ) : (
                    extraSystems.map((sys) => renderSystemRow(sys))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
              <button
                type="button"
                onClick={onLaunchCaliperWizard}
                data-testid="onb-launch-caliper-btn"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500 bg-sky-50/70 px-4 py-2 text-xs font-semibold text-sky-800 whitespace-nowrap transition-colors hover:bg-sky-100/80"
              >
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                Ajouter un système de forage / pilote
              </button>

              <button
                type="button"
                onClick={() => handleContinueStep1()}
                data-testid="onboarding-next-btn"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Continuer vers l’implant
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: COMPATIBLE IMPLANTS (GUIDED) OR FULL BRAND/MODEL LIBRARY TOP 3 + DRAWER (PILOT) */}
        {step === 2 && (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
              <div className="text-xs text-slate-700">
                {activeSystem?.kind === 'pilot' ? (
                  <span>
                    <strong className="text-slate-900">Foret pilote sélectionné :</strong> toute
                    votre bibliothèque d’implants est proposée (Top 3 + tiroir par marque/modèle).
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-900">Système guidé sélectionné :</strong>{' '}
                    implants compatibles avec{' '}
                    <span className="font-semibold text-sky-800">{activeSystem?.name}</span>.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenFreeImplantWizard}
                data-testid="onb-open-free-implant-btn"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                <Plus className="h-3 w-3" aria-hidden="true" />
                Saisie libre d’implant
              </button>
            </div>

            {activeSystem?.kind === 'pilot' ? (
              <div className="space-y-3" data-testid="onb-pilot-implant-library">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Top 3 des modèles d’implants les plus utilisés
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Classés par marque et modèle
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {topThreeImplants.map(renderImplantModelCard)}
                </div>

                {extraImplants.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMoreImplants((o) => !o)}
                      aria-expanded={showMoreImplants}
                      data-testid="onb-extra-implants-toggle"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400"
                    >
                      <span>
                        Autres modèles d’implants dans la bibliothèque ({extraImplants.length})
                      </span>
                      {showMoreImplants ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      )}
                    </button>

                    {showMoreImplants && (
                      <div
                        data-testid="onb-extra-implants-drawer"
                        className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                      >
                        {extraBrandGroups.map((group) => (
                          <div key={group.brand} className="space-y-1.5">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                              Marque : {group.brand}
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                              {group.models.map(renderImplantModelCard)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Guided Kit Step 2: Compatible Implant Range + any selected Saisie libre model */
              <div className="space-y-3">
                <div className="rounded-xl border border-sky-600 bg-sky-50/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {activeSystem?.isFactory
                          ? 'Biotech — Modèle Kontact'
                          : `${activeSystem?.implantBrandName ?? activeSystem?.name} — ${activeSystem?.implantModelName ?? 'Gamme compatible'}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {activeSystem?.isFactory
                          ? 'Implants compatibles avec les forets guidés Biotech Kontact'
                          : `Dimensions configurées pour ${activeSystem?.name}`}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-sky-600" aria-hidden="true" />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-slate-600">
                        Diamètres compatibles (mm)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeSystem?.isFactory
                          ? BIOTECH_KONTACT_DIAMETERS
                          : activeSystem?.userDefaults.implantDiametersMm ??
                            BIOTECH_KONTACT_DIAMETERS
                        ).map((dia) => (
                          <button
                            key={dia}
                            type="button"
                            onClick={() =>
                              onChangeParams({
                                implantBrand: activeSystem?.isFactory ? 'kontact' : 'custom',
                                customImplantId: activeSystem?.isFactory
                                  ? 'factory-implant-biotech-kontact'
                                  : undefined,
                                customImplantName: activeSystem?.isFactory
                                  ? undefined
                                  : activeSystem?.name,
                                implantDiameter: dia,
                              })
                            }
                            className={`font-mono-tabular rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              Math.abs(params.implantDiameter - dia) < 0.05
                                ? 'border-sky-600 bg-sky-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Ø{dia.toFixed(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-slate-600">
                        Longueurs compatibles (mm)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeSystem?.isFactory
                          ? BIOTECH_KONTACT_LENGTHS
                          : activeSystem?.userDefaults.implantLengthsMm ?? BIOTECH_KONTACT_LENGTHS
                        ).map((len) => (
                          <button
                            key={len}
                            type="button"
                            onClick={() =>
                              onChangeParams({
                                implantBrand: activeSystem?.isFactory ? 'kontact' : 'custom',
                                customImplantId: activeSystem?.isFactory
                                  ? 'factory-implant-biotech-kontact'
                                  : undefined,
                                customImplantName: activeSystem?.isFactory
                                  ? undefined
                                  : activeSystem?.name,
                                implantLength: len,
                              })
                            }
                            className={`font-mono-tabular rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              Math.abs(params.implantLength - len) < 0.05
                                ? 'border-sky-600 bg-sky-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {Number.isInteger(len)
                              ? `${len.toFixed(0)} mm`
                              : `${len.toFixed(1)} mm`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Retour aux systèmes de forage
              </button>

              <button
                type="button"
                onClick={handleFinishToSimulator}
                data-testid="onboarding-finish-btn"
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Lancer le simulateur 2D
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
