import { useEffect, useState } from 'react';
import {
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCcw,
  Save,
  Unlock,
} from 'lucide-react';
import {
  BIOTECH_MASTERTUBE_OFFSETS,
  BiotechMastertubePreset,
  ComputedGeometry,
  CustomImplantSystem,
  DEFAULT_SIMULATION_PARAMS,
  DiagramElementFocus,
  DrillingKit,
  HighlightableParamKey,
  ResettableParamKey,
  SimulationParams,
  clamp,
  formatMetricMm,
  getElementHighlightConfig,
  hasAnyModifiedParam,
  roundTo,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';
import { DrillingSystemsSection } from './DrillingSystemsSection';
import { ImplantSelectionSection } from './ImplantSelectionSection';
import { SmoothDrawer } from './SmoothDrawer';

interface ControlSidebarProps {
  params: SimulationParams;
  geometry: ComputedGeometry;
  kits: DrillingKit[];
  customImplants?: CustomImplantSystem[];
  highlightedElement?: DiagramElementFocus | null;
  onSelectImplant: (patch: Partial<SimulationParams>) => void;
  onSelectImplantModel: (
    model: CustomImplantSystem,
    overrides?: { implantDiameter?: number; implantLength?: number },
  ) => void;
  onDeleteImplantModel?: (modelId: string) => void;
  onOpenFreeImplantWizard: () => void;
  onSelectKit: (kitId: string) => void;
  onSelectKitSleeve: (kitId: string, hasSleeve: boolean) => void;
  onEditKit: (kitId: string) => void;
  onOpenCaliperAssistant: () => void;
  onChangeParams: (patch: Partial<SimulationParams>) => void;
  onResetParam: (key: ResettableParamKey) => void;
  onSetKitAsDefault: (kitId: string) => void;
  onSaveParamDefault: (kitId: string, key: ResettableParamKey | 'sleeveSeating') => void;
  onRestoreKitHistory: (kitId: string, historyId: string) => void;
  onResetKitToFactory: (kitId: string) => void;
  onDeleteKit: (kitId: string) => void;
  onResetAll: () => void;
}

function ParamResetButton({
  label,
  isModified,
  onClick,
}: {
  label: string;
  isModified: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isModified}
      aria-hidden={!isModified}
      tabIndex={isModified ? 0 : -1}
      aria-label={`Réinitialiser ${label}`}
      title={`Réinitialiser ${label}`}
      className={`inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-all hover:bg-slate-200/70 hover:text-slate-700 ${
        isModified ? 'opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
      }`}
    >
      <RotateCcw className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function SaveDefaultIconButton({
  paramKey,
  label,
  isModified,
  onClick,
}: {
  paramKey: string;
  label: string;
  isModified: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`save-default-${paramKey}`}
      onClick={onClick}
      disabled={!isModified}
      aria-hidden={!isModified}
      tabIndex={isModified ? 0 : -1}
      aria-label={`Enregistrer ${label} par défaut`}
      title={`Enregistrer ${label} par défaut`}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-600 text-white shadow-xs transition-all hover:bg-sky-700 ${
        isModified ? 'opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
      }`}
    >
      <BookmarkCheck className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function FactoryPadlockButton({
  paramKey,
  label,
  unlocked,
  onToggle,
}: {
  paramKey: string;
  label: string;
  unlocked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`padlock-${paramKey}`}
      onClick={onToggle}
      aria-pressed={unlocked}
      aria-label={
        unlocked
          ? `Verrouiller et sauvegarder ${label}`
          : `Déverrouiller ${label} pour modification`
      }
      title={
        unlocked
          ? 'Cliquer pour reverrouiller et sauvegarder la nouvelle valeur'
          : 'Paramètre verrouillé — cliquer pour déverrouiller'
      }
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
        unlocked
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-300 bg-slate-100 text-slate-600 hover:border-sky-400 hover:text-sky-700'
      }`}
    >
      {unlocked ? (
        <Unlock className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Lock className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
}

export function ControlSidebar({
  params,
  geometry,
  kits,
  customImplants = [],
  highlightedElement = null,
  onSelectImplant,
  onSelectImplantModel,
  onDeleteImplantModel,
  onOpenFreeImplantWizard,
  onSelectKit,
  onSelectKitSleeve,
  onEditKit,
  onOpenCaliperAssistant,
  onChangeParams,
  onResetParam,
  onSetKitAsDefault,
  onSaveParamDefault,
  onRestoreKitHistory,
  onResetKitToFactory,
  onDeleteKit,
  onResetAll,
}: ControlSidebarProps) {
  const [systemsDrawerOpen, setSystemsDrawerOpen] = useState(false);
  const [implantDrawerOpen, setImplantDrawerOpen] = useState(false);
  const [visualDrawerOpen, setVisualDrawerOpen] = useState(false);
  const [factoryDrawerOpen, setFactoryDrawerOpen] = useState(false);
  const [unlockedFactoryKeys, setUnlockedFactoryKeys] = useState<Record<string, boolean>>({});

  const activeKit = geometry.activeKit;

  // Always reset Category 4 padlocks to locked by default when switching kit
  useEffect(() => {
    setUnlockedFactoryKeys({});
  }, [activeKit.id]);

  const highlightConfig = getElementHighlightConfig(highlightedElement);
  const isHighlighted = (key: HighlightableParamKey) =>
    Boolean(highlightConfig?.params.includes(key));
  const highlightBox = (key: HighlightableParamKey) =>
    isHighlighted(key)
      ? 'param-highlight-ring rounded-lg border p-2 transition-all'
      : 'rounded-lg border border-transparent p-0.5 transition-all';

  useEffect(() => {
    if (!highlightConfig) return;
    if (highlightedElement === 'sleeve') {
      setSystemsDrawerOpen(true);
    }
    if (highlightConfig.openDrawer === 2) {
      setImplantDrawerOpen(true);
    } else if (highlightConfig.openDrawer === 3) {
      setVisualDrawerOpen(true);
    } else if (highlightConfig.openDrawer === 4) {
      setFactoryDrawerOpen(true);
    }
  }, [highlightConfig, highlightedElement]);

  const def = activeKit.userDefaults;
  const defGuideExt = def.guideTubeExtension ?? DEFAULT_SIMULATION_PARAMS.guideTubeExtension;
  const defHandpiece = def.handpieceHeadHeightMm ?? DEFAULT_SIMULATION_PARAMS.handpieceHeadHeight;
  const defSubcrestal = def.subcrestalDepthMm ?? DEFAULT_SIMULATION_PARAMS.subcrestalDepth;
  const defGingiva = def.gingivaThicknessMm ?? DEFAULT_SIMULATION_PARAMS.gingivaThickness;

  const isOffsetModified = Math.abs(geometry.offsetCao - def.offsetMm) >= 0.05;
  const isSubcrestalModified = Math.abs(params.subcrestalDepth - defSubcrestal) >= 0.05;
  const isGuideTubeExtensionModified = params.guideTubeExtension !== defGuideExt;
  const isHandpieceModified = Math.abs(params.handpieceHeadHeight - defHandpiece) >= 0.05;
  const isGingivaModified = Math.abs(params.gingivaThickness - defGingiva) >= 0.05;

  const hasAnyModified = hasAnyModifiedParam(params, geometry, activeKit);

  const toggleFactoryPadlock = (
    padlockKey: string,
    saveKey?: ResettableParamKey | 'sleeveSeating',
  ) => {
    setUnlockedFactoryKeys((prev) => {
      const currentlyUnlocked = Boolean(prev[padlockKey]);
      if (currentlyUnlocked && saveKey) {
        onSaveParamDefault(activeKit.id, saveKey);
      }
      return { ...prev, [padlockKey]: !currentlyUnlocked };
    });
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

  return (
    <aside
      aria-label="Paramètres de simulation"
      data-testid="control-sidebar"
      className="bsp-panel flex flex-col gap-3 rounded-xl border p-3 shadow-xs"
    >
      {/* Top Sidebar Title: Paramètres + Conditional Réinitialiser & Sauvegarder (invisible & disabled when unmodified) */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
          Paramètres
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="sidebar-save-all-btn"
            onClick={() => onSetKitAsDefault(activeKit.id)}
            disabled={!hasAnyModified}
            aria-hidden={!hasAnyModified}
            tabIndex={hasAnyModified ? 0 : -1}
            title="Sauvegarder les réglages modifiés par défaut"
            className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-sky-700 transition-all hover:bg-sky-50 hover:text-sky-900 ${
              hasAnyModified
                ? 'opacity-100 pointer-events-auto'
                : 'invisible opacity-0 pointer-events-none'
            }`}
          >
            <Save className="h-3 w-3" aria-hidden="true" />
            Sauvegarder
          </button>

          <button
            type="button"
            data-testid="sidebar-reset-all-btn"
            onClick={onResetAll}
            disabled={!hasAnyModified}
            aria-hidden={!hasAnyModified}
            tabIndex={hasAnyModified ? 0 : -1}
            title="Tout réinitialiser aux valeurs par défaut"
            className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 ${
              hasAnyModified
                ? 'opacity-100 pointer-events-auto'
                : 'invisible opacity-0 pointer-events-none'
            }`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Réinit.
          </button>
        </div>
      </div>

      {/* 1. SYSTÈMES DE FORAGE */}
      <div
        data-testid="sidebar-drawer-1"
        className={`shrink-0 rounded-lg border transition-colors ${
          isHighlighted('sleeve') ? 'border-sky-400' : 'border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setSystemsDrawerOpen((o) => !o)}
          aria-expanded={systemsDrawerOpen}
          data-testid="sidebar-drawer-1-toggle"
          className={`bsp-section-header flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:opacity-95 ${
            systemsDrawerOpen ? 'rounded-t-lg border-b' : 'rounded-lg'
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs font-bold min-w-0">
            {systemsDrawerOpen ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
            )}
            <span className="truncate">1. Systèmes de forage</span>
          </span>
          <span className="shrink-0 text-[10px] font-medium text-slate-500">Pilotes &amp; guidés</span>
        </button>

        <SmoothDrawer open={systemsDrawerOpen}>
          <div className="p-2">
            <DrillingSystemsSection
              variant="advanced"
              params={params}
              kits={kits}
              activeKit={activeKit}
              isSleeveHighlighted={isHighlighted('sleeve')}
              onSelectKit={onSelectKit}
              onSelectKitSleeve={onSelectKitSleeve}
              onEditKit={onEditKit}
              onOpenCaliperAssistant={onOpenCaliperAssistant}
              onSetKitAsDefault={onSetKitAsDefault}
              onRestoreKitHistory={onRestoreKitHistory}
              onResetKitToFactory={onResetKitToFactory}
              onDeleteKit={onDeleteKit}
            />
          </div>
        </SmoothDrawer>
      </div>

      {/* 2. CHOIX DE L'IMPLANT */}
      <div
        data-testid="sidebar-drawer-2"
        className={`shrink-0 rounded-lg border transition-colors ${
          isHighlighted('implantDiameter') ||
          isHighlighted('implantLength') ||
          isHighlighted('offsetCao') ||
          isHighlighted('drillUsefulLength') ||
          isHighlighted('subcrestalDepth')
            ? 'border-sky-400'
            : 'border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setImplantDrawerOpen((o) => !o)}
          aria-expanded={implantDrawerOpen}
          data-testid="sidebar-drawer-2-toggle"
          className={`bsp-section-header flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:opacity-95 ${
            implantDrawerOpen ? 'rounded-t-lg border-b' : 'rounded-lg'
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs font-bold min-w-0">
            {implantDrawerOpen ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
            )}
            <span className="truncate">2. Choix de l&apos;implant</span>
          </span>
          <span className="font-mono-tabular shrink-0 whitespace-nowrap rounded border border-slate-300/60 bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            Ø{formatMetricMm(params.implantDiameter)} · {params.implantLength.toFixed(1)} mm
          </span>
        </button>

        <SmoothDrawer open={implantDrawerOpen}>
          <div className="p-2.5">
            <ImplantSelectionSection
              variant="advanced"
              params={params}
              activeKit={activeKit}
              customImplants={customImplants}
              diameterHighlightClass={highlightBox('implantDiameter')}
              lengthHighlightClass={highlightBox('implantLength')}
              onSelectImplant={onSelectImplant}
              onSelectImplantModel={onSelectImplantModel}
              onDeleteImplantModel={onDeleteImplantModel}
              onOpenFreeImplantWizard={onOpenFreeImplantWizard}
            />

            {/* Automatic drill adaptation indicator */}
            <div
              className={`mt-2.5 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] ${
                isHighlighted('drillUsefulLength') || isHighlighted('offsetCao')
                  ? 'param-highlight-ring'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className="text-slate-600 whitespace-nowrap">Foret adapté :</span>
              <span className="font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                {geometry.drillMarking}
              </span>
            </div>

            {/* Pilot available lengths selector */}
            {params.mode === 'kit' && activeKit.kind === 'pilot' && (
              <div className={`mt-2 ${highlightBox('drillUsefulLength')}`}>
                <div className="mb-1 text-[11px] font-medium text-slate-700">
                  Longueurs pilotes disponibles
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeKit.userDefaults.availableLengthsMm.map((len) => {
                    const active = Math.abs(params.pilotDrillLength - len) < 0.05;
                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={() => onChangeParams({ pilotDrillLength: len })}
                        className={`font-mono-tabular rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        L{roundTo(len, 1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Integrated Décalage total & Longueur forage sliders */}
            <div className="mt-2.5 space-y-2 border-t border-slate-200 pt-2.5">
              <div className={highlightBox('offsetCao')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-offset-cao" className="font-medium text-slate-700">
                    <BilingualTerm fr="Décalage total" en="Total Offset" />
                  </label>
                  <div className="flex items-center gap-1">
                    <SaveDefaultIconButton
                      paramKey="offsetCao"
                      label="le décalage total"
                      isModified={isOffsetModified}
                      onClick={() => onSaveParamDefault(activeKit.id, 'offsetCao')}
                    />
                    <span
                      data-testid="sb-offset-cao-value"
                      className="font-mono-tabular font-semibold text-sky-700"
                    >
                      {geometry.offsetCao.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="le décalage total"
                      isModified={isOffsetModified}
                      onClick={() => onResetParam('offsetCao')}
                    />
                  </div>
                </div>
                <input
                  id="sb-offset-cao"
                  data-testid="sb-offset-cao-slider"
                  type="range"
                  min={4.0}
                  max={20.0}
                  step={0.5}
                  value={clamp(geometry.offsetCao, 4.0, 20.0)}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) => handleOffsetChange(parseFloat(e.target.value))}
                  onDoubleClick={() => onResetParam('offsetCao')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">Col implantaire → Butée du foret</p>
              </div>

              <div className={highlightBox('drillUsefulLength')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-drilling-length" className="font-medium text-slate-700">
                    Longueur forage
                  </label>
                  <div className="flex items-center gap-1">
                    <SaveDefaultIconButton
                      paramKey="drillUsefulLength"
                      label="la longueur de forage"
                      isModified={isOffsetModified}
                      onClick={() => onSaveParamDefault(activeKit.id, 'offsetCao')}
                    />
                    <span
                      data-testid="sb-drilling-length-value"
                      className="font-mono-tabular font-semibold text-slate-800"
                    >
                      {geometry.drillUsefulLength.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="la longueur de forage"
                      isModified={isOffsetModified}
                      onClick={() => onResetParam('drillUsefulLength')}
                    />
                  </div>
                </div>
                <input
                  id="sb-drilling-length"
                  data-testid="sb-drilling-length-slider"
                  type="range"
                  min={12.0}
                  max={32.0}
                  step={0.1}
                  value={clamp(geometry.drillUsefulLength, 12.0, 32.0)}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) => handleDrillingLengthChange(parseFloat(e.target.value))}
                  onDoubleClick={() => onResetParam('drillUsefulLength')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">Sous butée → Pointe du foret</p>
              </div>

              <div className={`border-t border-slate-200 pt-2.5 ${highlightBox('subcrestalDepth')}`}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-subcrestal-depth" className="font-medium text-slate-700">
                    Enfouissement sous-crestal
                  </label>
                  <div className="flex items-center gap-1">
                    <SaveDefaultIconButton
                      paramKey="subcrestalDepth"
                      label="l'enfouissement sous-crestal"
                      isModified={isSubcrestalModified}
                      onClick={() => onSaveParamDefault(activeKit.id, 'subcrestalDepth')}
                    />
                    <span className="font-mono-tabular font-semibold text-violet-700">
                      {params.subcrestalDepth.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="l'enfouissement sous-crestal"
                      isModified={isSubcrestalModified}
                      onClick={() => onResetParam('subcrestalDepth')}
                    />
                  </div>
                </div>
                <input
                  id="sb-subcrestal-depth"
                  data-testid="sb-subcrestal-slider"
                  type="range"
                  min={0.0}
                  max={3.0}
                  step={0.1}
                  value={params.subcrestalDepth}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) =>
                    onChangeParams({ subcrestalDepth: parseFloat(e.target.value) })
                  }
                  onDoubleClick={() => onResetParam('subcrestalDepth')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Crête osseuse → Col implantaire
                </p>
              </div>
            </div>
          </div>
        </SmoothDrawer>
      </div>

      {/* 3. VISUEL (Exactly 3 items: Épaisseur muqueuse, Hauteur tête contre-angle 0–30 mm, Allongement / prolongement du tube) */}
      {params.mode === 'kit' && (
        <div
          data-testid="sidebar-drawer-3"
          className={`shrink-0 rounded-lg border transition-colors ${
            isHighlighted('gingivaThickness') ||
            isHighlighted('handpieceHeadHeight') ||
            isHighlighted('guideTubeExtension')
              ? 'border-sky-400'
              : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setVisualDrawerOpen((o) => !o)}
            aria-expanded={visualDrawerOpen}
            data-testid="sidebar-drawer-3-toggle"
            className={`bsp-section-header flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:opacity-95 ${
              visualDrawerOpen ? 'rounded-t-lg' : 'rounded-lg'
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold min-w-0">
              {visualDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              )}
              <span className="truncate" title="Paramètres visuels">
                3. Visuel
              </span>
            </span>
            <span className="font-mono-tabular shrink-0 whitespace-nowrap rounded border border-slate-300/60 bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {params.gingivaThickness.toFixed(1)} · {params.handpieceHeadHeight.toFixed(1)} mm
            </span>
          </button>

          <SmoothDrawer open={visualDrawerOpen}>
            <div className="space-y-2.5 border-t border-slate-200 p-2.5">
              {/* Item 1: Épaisseur muqueuse */}
              <div className={highlightBox('gingivaThickness')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-gingiva-thickness" className="font-medium text-slate-700">
                    Épaisseur muqueuse
                  </label>
                  <div className="flex items-center gap-1">
                    <SaveDefaultIconButton
                      paramKey="gingivaThickness"
                      label="l'épaisseur muqueuse"
                      isModified={isGingivaModified}
                      onClick={() => onSaveParamDefault(activeKit.id, 'gingivaThickness')}
                    />
                    <span className="font-mono-tabular font-semibold text-rose-700">
                      {params.gingivaThickness.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="l'épaisseur muqueuse"
                      isModified={isGingivaModified}
                      onClick={() => onResetParam('gingivaThickness')}
                    />
                  </div>
                </div>
                <input
                  id="sb-gingiva-thickness"
                  data-testid="sb-gingiva-slider"
                  type="range"
                  min={0.5}
                  max={6.0}
                  step={0.1}
                  value={params.gingivaThickness}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) =>
                    onChangeParams({ gingivaThickness: parseFloat(e.target.value) })
                  }
                  onDoubleClick={() => onResetParam('gingivaThickness')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Crête osseuse → Surface gingivale
                </p>
              </div>

              {/* Item 2: Hauteur tête contre-angle (0 mm à 30 mm) */}
              <div className={highlightBox('handpieceHeadHeight')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="ca-head-height" className="font-medium text-slate-700">
                    Hauteur tête contre-angle
                  </label>
                  <div className="flex items-center gap-1">
                    <SaveDefaultIconButton
                      paramKey="handpieceHeadHeight"
                      label="la hauteur de tête du contre-angle"
                      isModified={isHandpieceModified}
                      onClick={() => onSaveParamDefault(activeKit.id, 'handpieceHeadHeight')}
                    />
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {params.handpieceHeadHeight.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="la hauteur de tête du contre-angle"
                      isModified={isHandpieceModified}
                      onClick={() => onResetParam('handpieceHeadHeight')}
                    />
                  </div>
                </div>
                <input
                  id="ca-head-height"
                  data-testid="sb-handpiece-slider"
                  type="range"
                  min={0.0}
                  max={30.0}
                  step={0.5}
                  value={clamp(params.handpieceHeadHeight, 0.0, 30.0)}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) =>
                    onChangeParams({ handpieceHeadHeight: parseFloat(e.target.value) })
                  }
                  onDoubleClick={() => onResetParam('handpieceHeadHeight')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">Plage étendue : 0,0 à 30,0 mm</p>
              </div>

              {/* Item 3: Allongement / prolongement du tube */}
              <div className={highlightBox('guideTubeExtension')}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700">
                    Allongement / prolongement du tube
                  </span>
                  <div className="flex items-center gap-1">
                    <SaveDefaultIconButton
                      paramKey="guideTubeExtension"
                      label="l'allongement du tube"
                      isModified={isGuideTubeExtensionModified}
                      onClick={() => onSaveParamDefault(activeKit.id, 'guideTubeExtension')}
                    />
                    <ParamResetButton
                      label="l'allongement du tube"
                      isModified={isGuideTubeExtensionModified}
                      onClick={() => onResetParam('guideTubeExtension')}
                    />
                  </div>
                </div>
                <div
                  className="grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-200/70 p-0.5"
                  role="group"
                  aria-label="Prolongement du tube de guidage"
                >
                  <button
                    type="button"
                    data-testid="tube-extend-gingiva-btn"
                    onClick={() => onChangeParams({ guideTubeExtension: 'gingiva' })}
                    aria-pressed={params.guideTubeExtension === 'gingiva'}
                    className={`rounded border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                      params.guideTubeExtension === 'gingiva'
                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Jusqu&apos;à la gencive
                  </button>
                  <button
                    type="button"
                    data-testid="tube-extend-bone-btn"
                    onClick={() => onChangeParams({ guideTubeExtension: 'bone' })}
                    aria-pressed={params.guideTubeExtension === 'bone'}
                    className={`rounded border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                      params.guideTubeExtension === 'bone'
                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Jusqu&apos;à l&apos;os
                  </button>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  {params.guideTubeExtension === 'gingiva'
                    ? 'Par défaut dans Blue Sky Plan : le tube se prolonge jusqu’à la gencive.'
                    : 'Option BSP pour chirurgie avec lambeau : le puits se prolonge jusqu’à la crête osseuse.'}
                </p>
              </div>
            </div>
          </SmoothDrawer>
        </div>
      )}

      {/* 4. PARAMÈTRES D'USINE (No padlock on category title; padlock right of each item title) */}
      {params.mode === 'kit' && (
        <div
          data-testid="sidebar-drawer-4"
          className={`shrink-0 rounded-lg border transition-colors ${
            isHighlighted('surgicalGuideOffset') ||
            isHighlighted('printingClearance') ||
            isHighlighted('guideHeight') ||
            isHighlighted('sleeve')
              ? 'border-sky-400'
              : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setFactoryDrawerOpen((o) => !o)}
            aria-expanded={factoryDrawerOpen}
            data-testid="sidebar-drawer-4-toggle"
            className={`bsp-section-header flex w-full items-center justify-between gap-1.5 px-2.5 py-2 text-left transition-colors hover:opacity-95 ${
              factoryDrawerOpen ? 'rounded-t-lg' : 'rounded-lg'
            }`}
          >
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold min-w-0">
              {factoryDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              )}
              <span className="leading-tight" title="Paramètres d'usine">
                4. Paramètres d&apos;usine
              </span>
            </span>
            <span className="font-mono-tabular shrink-0 whitespace-nowrap rounded border border-slate-300/60 bg-white/70 px-1 py-0.5 text-[9.5px] font-semibold text-slate-600">
              {params.guideHeight.toFixed(1)} · {params.surgicalGuideOffset.toFixed(2)} mm
            </span>
          </button>

          <SmoothDrawer open={factoryDrawerOpen}>
            <div className="space-y-2.5 border-t border-slate-200 p-2.5">
              {/* Item 1: Hauteur de guidage */}
              {(() => {
                const unlocked = Boolean(unlockedFactoryKeys['guideHeight']);
                const isModified = Math.abs(params.guideHeight - def.guidingHeightMm) >= 0.04;
                return (
                  <div className={highlightBox('guideHeight')}>
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <label htmlFor="sb-guide-height" className="truncate font-medium text-slate-700">
                          Hauteur guidage
                        </label>
                        <FactoryPadlockButton
                          paramKey="guideHeight"
                          label="la hauteur de guidage"
                          unlocked={unlocked}
                          onToggle={() => toggleFactoryPadlock('guideHeight', 'guideHeight')}
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          data-testid="sb-guide-height-value"
                          className={`font-mono-tabular font-semibold ${
                            params.guideHeight < 3.0 ? 'text-amber-700' : 'text-sky-700'
                          }`}
                        >
                          {params.guideHeight.toFixed(1)} mm
                        </span>
                        <ParamResetButton
                          label="la hauteur de guidage"
                          isModified={isModified && unlocked}
                          onClick={() => onResetParam('guideHeight')}
                        />
                      </div>
                    </div>
                    <input
                      id="sb-guide-height"
                      data-testid="sb-guide-height-slider"
                      type="range"
                      min={1.5}
                      max={8.0}
                      step={0.1}
                      disabled={!unlocked}
                      value={clamp(params.guideHeight, 1.5, 8.0)}
                      title={
                        unlocked
                          ? 'Double-cliquer pour réinitialiser par défaut'
                          : 'Cliquer sur le cadenas pour modifier'
                      }
                      onChange={(e) => onChangeParams({ guideHeight: parseFloat(e.target.value) })}
                      onDoubleClick={() => {
                        if (unlocked) onResetParam('guideHeight');
                      }}
                      className="cad-slider mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="mt-0.5 text-[10px] text-slate-500">Hauteur du puits de guidage</p>
                  </div>
                );
              })()}

              {/* Mastertube quick presets when Biotech Kontact has sleeve active */}
              {activeKit.id === 'factory-biotech-kontact' && params.hasSleeve && (
                (() => {
                  const unlocked = Boolean(unlockedFactoryKeys['mastertubePreset']);
                  return (
                    <div className={highlightBox('offsetCao')}>
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                        <span>Paliers Mastertube Biotech</span>
                        <FactoryPadlockButton
                          paramKey="mastertubePreset"
                          label="les paliers Mastertube"
                          unlocked={unlocked}
                          onToggle={() => toggleFactoryPadlock('mastertubePreset', 'offsetCao')}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(['H9', 'H10.5', 'H12'] as BiotechMastertubePreset[]).map((preset) => {
                          const val = BIOTECH_MASTERTUBE_OFFSETS[preset];
                          const active = Math.abs(params.offsetOverride - val) < 0.05;
                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={!unlocked}
                              onClick={() => onChangeParams({ offsetOverride: val })}
                              className={`font-mono-tabular rounded-md border py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                active
                                  ? 'border-sky-600 bg-sky-50 text-sky-800'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Sleeve seating & measurements when sleeve active */}
              {params.hasSleeve && (
                <div
                  className={`space-y-2 rounded-lg border p-2.5 ${
                    isHighlighted('sleeve')
                      ? 'param-highlight-ring'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  {(() => {
                    const unlocked = Boolean(unlockedFactoryKeys['sleeveSeating']);
                    return (
                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                          <span>Position de la douille</span>
                          <FactoryPadlockButton
                            paramKey="sleeveSeating"
                            label="la position de la douille"
                            unlocked={unlocked}
                            onToggle={() => toggleFactoryPadlock('sleeveSeating', 'sleeveSeating')}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-200/70 p-0.5">
                          <button
                            type="button"
                            disabled={!unlocked}
                            onClick={() => onChangeParams({ sleeveSeating: 'above' })}
                            aria-pressed={params.sleeveSeating === 'above'}
                            className={`rounded border px-2 py-1 text-[10.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              params.sleeveSeating === 'above'
                                ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Au-dessus du guide
                          </button>
                          <button
                            type="button"
                            disabled={!unlocked}
                            onClick={() => onChangeParams({ sleeveSeating: 'flush' })}
                            aria-pressed={params.sleeveSeating === 'flush'}
                            className={`rounded border px-2 py-1 text-[10.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              params.sleeveSeating === 'flush'
                                ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            À fleur du guide
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const unlocked = Boolean(unlockedFactoryKeys['sleeveLipThickness']);
                    const isModified =
                      Math.abs(params.sleeveLipThickness - def.sleeveLipThicknessMm) >= 0.01;
                    return (
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <label htmlFor="sb-sleeve-lip" className="truncate text-slate-600">
                              Collerette douille
                            </label>
                            <FactoryPadlockButton
                              paramKey="sleeveLipThickness"
                              label="la collerette"
                              unlocked={unlocked}
                              onToggle={() =>
                                toggleFactoryPadlock('sleeveLipThickness', 'sleeveLipThickness')
                              }
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono-tabular font-semibold text-slate-900">
                              {params.sleeveLipThickness.toFixed(2)} mm
                            </span>
                            <ParamResetButton
                              label="la collerette"
                              isModified={isModified && unlocked}
                              onClick={() => onResetParam('sleeveLipThickness')}
                            />
                          </div>
                        </div>
                        <input
                          id="sb-sleeve-lip"
                          type="range"
                          min={0}
                          max={2.0}
                          step={0.05}
                          disabled={!unlocked}
                          value={params.sleeveLipThickness}
                          onChange={(e) =>
                            onChangeParams({ sleeveLipThickness: parseFloat(e.target.value) })
                          }
                          className="cad-slider mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    );
                  })()}

                  {(() => {
                    const unlocked = Boolean(unlockedFactoryKeys['sleeveWallThickness']);
                    const isModified =
                      Math.abs(params.sleeveWallThickness - def.sleeveWallThicknessMm) >= 0.01;
                    return (
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <label htmlFor="sb-sleeve-wall" className="truncate text-slate-600">
                              Paroi cylindre
                            </label>
                            <FactoryPadlockButton
                              paramKey="sleeveWallThickness"
                              label="l'épaisseur de paroi"
                              unlocked={unlocked}
                              onToggle={() =>
                                toggleFactoryPadlock('sleeveWallThickness', 'sleeveWallThickness')
                              }
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono-tabular font-semibold text-slate-900">
                              {params.sleeveWallThickness.toFixed(2)} mm
                            </span>
                            <ParamResetButton
                              label="l'épaisseur de paroi"
                              isModified={isModified && unlocked}
                              onClick={() => onResetParam('sleeveWallThickness')}
                            />
                          </div>
                        </div>
                        <input
                          id="sb-sleeve-wall"
                          type="range"
                          min={0.15}
                          max={1.0}
                          step={0.05}
                          disabled={!unlocked}
                          value={params.sleeveWallThickness}
                          onChange={(e) =>
                            onChangeParams({ sleeveWallThickness: parseFloat(e.target.value) })
                          }
                          className="cad-slider mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    );
                  })()}

                  {(() => {
                    const unlocked = Boolean(unlockedFactoryKeys['drillToSleeveClearance']);
                    const isModified =
                      Math.abs(params.drillToSleeveClearance - def.drillToSleeveClearanceMm) >=
                      0.005;
                    return (
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <label
                              htmlFor="sb-drill-sleeve-clear"
                              className="truncate text-slate-600"
                            >
                              Jeu douille / foret
                            </label>
                            <FactoryPadlockButton
                              paramKey="drillToSleeveClearance"
                              label="le jeu douille/foret"
                              unlocked={unlocked}
                              onToggle={() =>
                                toggleFactoryPadlock(
                                  'drillToSleeveClearance',
                                  'drillToSleeveClearance',
                                )
                              }
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono-tabular font-semibold text-slate-900">
                              {params.drillToSleeveClearance.toFixed(2)} mm
                            </span>
                            <ParamResetButton
                              label="le jeu douille/foret"
                              isModified={isModified && unlocked}
                              onClick={() => onResetParam('drillToSleeveClearance')}
                            />
                          </div>
                        </div>
                        <input
                          id="sb-drill-sleeve-clear"
                          type="range"
                          min={0.02}
                          max={0.4}
                          step={0.01}
                          disabled={!unlocked}
                          value={params.drillToSleeveClearance}
                          onChange={(e) =>
                            onChangeParams({ drillToSleeveClearance: parseFloat(e.target.value) })
                          }
                          className="cad-slider mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Item 2: Décalage du guide chirurgical */}
              {(() => {
                const unlocked = Boolean(unlockedFactoryKeys['surgicalGuideOffset']);
                const isModified =
                  Math.abs(params.surgicalGuideOffset - def.surgicalGuideOffsetMm) >= 0.005;
                return (
                  <div className={highlightBox('surgicalGuideOffset')}>
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <label
                          htmlFor="sb-surgical-guide-offset"
                          className="truncate font-medium text-slate-700"
                        >
                          <BilingualTerm
                            fr="Décalage du guide chirurgical"
                            en="Surgical Guide Offset"
                          />
                        </label>
                        <FactoryPadlockButton
                          paramKey="surgicalGuideOffset"
                          label="le décalage du guide chirurgical"
                          unlocked={unlocked}
                          onToggle={() =>
                            toggleFactoryPadlock('surgicalGuideOffset', 'surgicalGuideOffset')
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono-tabular font-semibold text-slate-900">
                          {params.surgicalGuideOffset.toFixed(2)} mm
                        </span>
                        <ParamResetButton
                          label="le décalage du guide chirurgical"
                          isModified={isModified && unlocked}
                          onClick={() => onResetParam('surgicalGuideOffset')}
                        />
                      </div>
                    </div>
                    <input
                      id="sb-surgical-guide-offset"
                      data-testid="sb-surgical-guide-offset-slider"
                      type="range"
                      min={0.05}
                      max={0.6}
                      step={0.05}
                      disabled={!unlocked}
                      value={params.surgicalGuideOffset}
                      title={
                        unlocked
                          ? 'Double-cliquer pour réinitialiser par défaut'
                          : 'Cliquer sur le cadenas pour modifier'
                      }
                      onChange={(e) =>
                        onChangeParams({ surgicalGuideOffset: parseFloat(e.target.value) })
                      }
                      onDoubleClick={() => {
                        if (unlocked) onResetParam('surgicalGuideOffset');
                      }}
                      className="cad-slider mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="mt-1 text-[10px] leading-snug text-slate-500">
                      Espace entre le guide, les dents et la gencive (0,25 mm par défaut).
                    </p>
                  </div>
                );
              })()}

              {/* Item 3: Jeu d'impression 3D */}
              {(() => {
                const unlocked = Boolean(unlockedFactoryKeys['printingClearance']);
                const isModified =
                  Math.abs(params.printingClearance - def.printingClearanceMm) >= 0.005;
                return (
                  <div className={highlightBox('printingClearance')}>
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <label
                          htmlFor="sb-printing-clear"
                          className="truncate font-medium text-slate-700"
                        >
                          Jeu d&apos;impression 3D
                        </label>
                        <FactoryPadlockButton
                          paramKey="printingClearance"
                          label="le jeu d'impression 3D"
                          unlocked={unlocked}
                          onToggle={() =>
                            toggleFactoryPadlock('printingClearance', 'printingClearance')
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono-tabular font-semibold text-slate-900">
                          {params.printingClearance.toFixed(2)} mm
                        </span>
                        <ParamResetButton
                          label="le jeu d'impression 3D"
                          isModified={isModified && unlocked}
                          onClick={() => onResetParam('printingClearance')}
                        />
                      </div>
                    </div>
                    <input
                      id="sb-printing-clear"
                      type="range"
                      min={0.0}
                      max={0.4}
                      step={0.01}
                      disabled={!unlocked}
                      value={params.printingClearance}
                      title={
                        unlocked
                          ? 'Double-cliquer pour réinitialiser par défaut'
                          : 'Cliquer sur le cadenas pour modifier'
                      }
                      onChange={(e) =>
                        onChangeParams({ printingClearance: parseFloat(e.target.value) })
                      }
                      onDoubleClick={() => {
                        if (unlocked) onResetParam('printingClearance');
                      }}
                      className="cad-slider mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                );
              })()}
            </div>
          </SmoothDrawer>
        </div>
      )}
    </aside>
  );
}
