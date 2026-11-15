import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CustomImplantSystem,
  DrillingKit,
  SimulationParams,
  getKitCompatibilityLabel,
  groupDrillingKitsBySystem,
  isDentsplySironaKit,
  pickOptimalPilotLength,
  sortKitsByUsage,
} from '../utils/implantGeometry';
import { BrandLogo } from './BrandLogo';
import { DentsplyDrillVisualStep } from './DentsplyDrillVisualStep';
import { DrillingSystemsSection } from './DrillingSystemsSection';
import { ImplantSelectionSection } from './ImplantSelectionSection';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Mode, setStep1Mode] = useState<'pick' | 'configure'>('pick');
  const [assistedSelectionRevealed, setAssistedSelectionRevealed] = useState(false);

  const orderedSystems = sortKitsByUsage(kits);
  const activeSystem =
    kits.find((k) => k.id === params.activeKitId) ?? orderedSystems[0];
  const activeGroup =
    groupDrillingKitsBySystem(kits).find((g) =>
      g.kits.some((k) => k.id === activeSystem?.id),
    ) ?? null;

  const handleFinishToSimulator = () => {
    if (activeSystem) {
      onSelectKit(activeSystem.id);
      if (activeSystem.kind === 'pilot') {
        onChangeParams({
          pilotDrillLength: pickOptimalPilotLength(
            params.implantLength,
            activeSystem.userDefaults.availableLengthsMm,
            params.subcrestalDepth,
            params.gingivaThickness,
            activeSystem.userDefaults.guidingHeightMm,
          ),
        });
      }
    }
    onCompleteToSimulator();
  };

  return (
    <section
      data-testid="onboarding-flow"
      aria-label="Mode assisté étape par étape BlueTube"
      className="mx-auto max-w-4xl space-y-3 pt-1 pb-2"
    >
      {/* Hero Purpose Banner */}
      <div
        data-testid="onboarding-purpose-banner"
        className="hero-purpose-card rounded-xl border px-3.5 py-2.5 text-center shadow-xs sm:px-5 sm:py-3"
      >
        <p className="text-xs sm:text-[15px] font-medium leading-snug text-slate-700">
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

      {/* Step-by-Step Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="bsp-section-header border-b px-3.5 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
              Mode assisté
            </span>
            <span className="font-mono-tabular shrink-0 rounded border border-slate-300/70 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {step === 1 && step1Mode === 'configure'
                ? 'Étape 1B / 2 — Configuration'
                : `Étape ${step} / 2`}
            </span>
          </div>
          <h2 className="mt-1.5 text-sm sm:text-[15px] font-bold leading-snug text-slate-900">
            {step === 1
              ? step1Mode === 'pick'
                ? '1. Quel système de forage souhaitez-vous utiliser ?'
                : `Configuration du système — ${activeSystem?.name ?? ''}`
              : '2. Quel implant souhaitez-vous poser ?'}
          </h2>
        </div>

        {/* STEP 1A: PICK SYSTEM */}
        {step === 1 && step1Mode === 'pick' && activeSystem && (
          <div className="space-y-3.5 p-3.5 sm:p-5">
            <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <SlidersHorizontal
                  className="h-3.5 w-3.5 shrink-0 text-sky-600"
                  aria-hidden="true"
                />
                Systèmes de forage (ordre alphabétique)
              </span>
              <span className="text-[11px] text-slate-500">
                Cliquez sur un système pour ouvrir sa configuration dédiée
              </span>
            </div>

            <DrillingSystemsSection
              variant="assisted"
              params={params}
              kits={kits}
              activeKit={activeSystem}
              assistedSelectionRevealed={assistedSelectionRevealed}
              onSelectKit={(kitId) => {
                setAssistedSelectionRevealed(true);
                onSelectKit(kitId);
              }}
              onSelectKitSleeve={onSelectKitSleeve}
              onEditKit={onEditKit}
              onEnterConfigureStep={(kitId) => {
                setAssistedSelectionRevealed(true);
                onSelectKit(kitId);
                setStep1Mode('configure');
              }}
              onOpenCaliperAssistant={onLaunchCaliperWizard}
            />

            <div className="flex items-center justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setAssistedSelectionRevealed(true);
                  onSelectKit(activeSystem.id);
                  setStep1Mode('configure');
                }}
                data-testid="onboarding-next-btn"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
              >
                <span>Configurer ce système</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1B: CONFIGURE SELECTED SYSTEM */}
        {step === 1 && step1Mode === 'configure' && activeSystem && (
          <div data-testid="onb-configure-step" className="space-y-4 p-3.5 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <BrandLogo
                  groupId={activeGroup?.groupId ?? activeSystem.systemGroupId ?? null}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">
                    {activeSystem.name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {activeSystem.kind === 'pilot'
                      ? 'Foret pilote guidé · Compatible tous implants'
                      : `Trousse guidée · Offset usine ${activeSystem.factoryDefaults.offsetMm.toFixed(1)} mm`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep1Mode('pick')}
                data-testid="onb-change-system-btn"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Changer de système
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-xs font-bold text-slate-900">
                1. Mode de guidage (Avec douille / Sans douille)
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onSelectKitSleeve(activeSystem.id, false)}
                  data-testid="onb-config-sleeve-off"
                  aria-pressed={!params.hasSleeve}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    params.hasSleeve
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                      : 'border-sky-600 bg-sky-50/80 text-slate-900'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Sans douille (résine directe)</div>
                    <div className="text-[10.5px] text-slate-500">
                      Guidage direct dans le puits imprimé · Jeu 3D{' '}
                      {params.printingClearance.toFixed(2)} mm
                    </div>
                  </div>
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      params.hasSleeve ? 'text-slate-200' : 'text-sky-600'
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectKitSleeve(activeSystem.id, true)}
                  data-testid="onb-config-sleeve-on"
                  aria-pressed={params.hasSleeve}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    params.hasSleeve
                      ? 'border-sky-600 bg-sky-50/80 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Avec douille métallique</div>
                    <div className="text-[10.5px] text-slate-500">
                      Logement douille + Ø guidant{' '}
                      {activeSystem.userDefaults.guidingDiameterMm.toFixed(2)} mm
                    </div>
                  </div>
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      params.hasSleeve ? 'text-sky-600' : 'text-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {params.hasSleeve && (
                <div className="mt-2 grid grid-cols-1 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onChangeParams({ sleeveSeating: 'above' })}
                    aria-pressed={params.sleeveSeating === 'above'}
                    className={`rounded-md border py-1.5 text-xs font-semibold transition-colors ${
                      params.sleeveSeating === 'above'
                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Douille au-dessus du guide
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeParams({ sleeveSeating: 'flush' })}
                    aria-pressed={params.sleeveSeating === 'flush'}
                    className={`rounded-md border py-1.5 text-xs font-semibold transition-colors ${
                      params.sleeveSeating === 'flush'
                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Douille à fleur du guide
                  </button>
                </div>
              )}
            </div>

            {activeGroup && activeGroup.kits.length > 1 && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-bold text-slate-900">
                  2. Choix de la partie guidante (Standard / Narrow)
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeGroup.kits.map((subKit) => {
                    const isSubSelected = activeSystem.id === subKit.id;
                    return (
                      <button
                        key={subKit.id}
                        type="button"
                        onClick={() => onSelectKit(subKit.id)}
                        data-testid={`onb-config-variant-${subKit.id}`}
                        aria-pressed={isSubSelected}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          isSubSelected
                            ? 'border-sky-600 bg-sky-50/80 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">
                            {subKit.subSystemLabel ?? subKit.name}
                          </div>
                          <div className="font-mono-tabular text-[10.5px] text-slate-500">
                            Ø guidant {subKit.userDefaults.guidingDiameterMm.toFixed(2)} mm · H{' '}
                            {subKit.userDefaults.guidingHeightMm.toFixed(1)} mm
                          </div>
                        </div>
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${
                            isSubSelected ? 'text-sky-600' : 'text-slate-200'
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isDentsplySironaKit(activeSystem) && <DentsplyDrillVisualStep />}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onEditKit(activeSystem.id)}
                data-testid={`onb-edit-${activeSystem.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Ajuster au pied à coulisse
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeSystem) onSelectKit(activeSystem.id);
                  setStep(2);
                }}
                data-testid="onb-validate-system-btn"
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
              >
                Valider et continuer vers l&apos;implant
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: IMPLANT SELECTION */}
        {step === 2 && activeSystem && (
          <div className="space-y-4 p-3.5 sm:p-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-700">
              {activeSystem.kind === 'pilot' ? (
                <span>
                  <strong className="text-slate-900">Foret pilote sélectionné :</strong>{' '}
                  compatible avec n&apos;importe quel implant de votre bibliothèque.
                </span>
              ) : (
                <span>
                  <strong className="text-slate-900">
                    Compatibilité stricte ({activeSystem.name}) :
                  </strong>{' '}
                  seuls les implants et cotes compatibles avec cette trousse guidée sont
                  affichés —{' '}
                  <span className="font-semibold text-sky-800">
                    {getKitCompatibilityLabel(activeSystem, customImplants)}
                  </span>
                  .
                </span>
              )}
            </div>

            <ImplantSelectionSection
              variant="assisted"
              params={params}
              activeKit={activeSystem}
              customImplants={customImplants}
              onSelectImplant={onChangeParams}
              onSelectImplantModel={onSelectImplantModel}
              onDeleteImplantModel={onDeleteImplantModel}
              onOpenFreeImplantWizard={onOpenFreeImplantWizard}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Retour au système de forage
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
