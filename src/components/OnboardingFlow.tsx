import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CustomImplantSystem,
  DrillingKit,
  DrillingSystemsLayout,
  SimulationParams,
  getKitCompatibilityLabel,
  pickOptimalPilotLength,
  sortKitsAlphabetically,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';
import { DrillingSystemsSection } from './DrillingSystemsSection';
import { ImplantSelectionSection } from './ImplantSelectionSection';

interface OnboardingFlowProps {
  params: SimulationParams;
  kits: DrillingKit[];
  drillingLayout: DrillingSystemsLayout | null;
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
  onChangeDrillingLayout: (layout: DrillingSystemsLayout | null) => void;
  onEditKit: (kitId: string) => void;
  onCompleteToSimulator: () => void;
  onLaunchCaliperWizard: () => void;
}

export function OnboardingFlow({
  params,
  kits,
  drillingLayout,
  customImplants,
  onChangeParams,
  onSelectImplantModel,
  onDeleteImplantModel,
  onOpenFreeImplantWizard,
  onSelectKit,
  onSelectKitSleeve,
  onChangeDrillingLayout,
  onEditKit,
  onCompleteToSimulator,
  onLaunchCaliperWizard,
}: OnboardingFlowProps) {
  // Step 1: Systèmes de forage | Step 2: Choix de l'implant (100% synced with Mode avancé)
  const [step, setStep] = useState<1 | 2>(1);
  const [hasSelectedSystem, setHasSelectedSystem] = useState(false);

  const orderedSystems = sortKitsAlphabetically(kits);
  const activeSystem = kits.find((k) => k.id === params.activeKitId) ?? orderedSystems[0];

  const handleAssistedSelectKit = (kitId: string) => {
    setHasSelectedSystem(true);
    onSelectKit(kitId);
  };

  const handleContinueStep1 = (kitId?: string) => {
    const targetId = kitId ?? activeSystem?.id;
    if (targetId) {
      onSelectKit(targetId);
    }
    setStep(2);
  };

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
                fr="1. Quel système de forage souhaitez-vous utiliser ?"
                en="Drilling & Pilot Kit Library"
              />
            ) : (
              <BilingualTerm
                fr="2. Quel implant souhaitez-vous poser ?"
                en="Implant Model & Dimensions"
              />
            )}
          </h2>
        </div>

        {/* STEP 1: SHARED DRILLING SYSTEMS SECTION (DRAG REORDER + LIBRARY DRAWER + CALIPER ASSISTANT) */}
        {step === 1 && activeSystem && (
          <div className="space-y-3.5 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />
                Systèmes de forage
              </span>
              <span className="text-[11px] text-slate-500">
                Cliquer-glisser pour classer ou archiver · Alphabétique par défaut
              </span>
            </div>

            <DrillingSystemsSection
              variant="assisted"
              params={params}
              kits={kits}
              drillingLayout={drillingLayout}
              activeKit={activeSystem}
              assistedSelectionRevealed={hasSelectedSystem}
              onSelectKit={handleAssistedSelectKit}
              onSelectKitSleeve={onSelectKitSleeve}
              onChangeDrillingLayout={onChangeDrillingLayout}
              onEditKit={onEditKit}
              onContinueToImplant={handleContinueStep1}
              onOpenCaliperAssistant={onLaunchCaliperWizard}
            />
          </div>
        )}

        {/* STEP 2: SHARED IMPLANT SELECTION SECTION (SYNCHRONIZED WITH MODE AVANCÉ) */}
        {step === 2 && activeSystem && (
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-700">
              {activeSystem.kind === 'pilot' ? (
                <span>
                  <strong className="text-slate-900">Foret pilote sélectionné :</strong> compatible
                  avec n’importe quel implant de votre bibliothèque (Top 3 + tiroir par marque/modèle).
                </span>
              ) : (
                <span>
                  <strong className="text-slate-900">Trousse guidée sélectionnée ({activeSystem.name}) :</strong>{' '}
                  implants compatibles —{' '}
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
