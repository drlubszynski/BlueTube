import { useEffect, useState } from 'react';
import {
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  BIOTECH_MASTERTUBE_OFFSETS,
  BiotechMastertubePreset,
  ComputedGeometry,
  CustomImplantSystem,
  DEFAULT_SIMULATION_PARAMS,
  DiagramElementFocus,
  DrillingKit,
  DrillingSystemsLayout,
  HighlightableParamKey,
  ResettableParamKey,
  SimulationParams,
  clamp,
  getElementHighlightConfig,
  roundTo,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';
import { DrillingSystemsSection } from './DrillingSystemsSection';
import { ImplantSelectionSection } from './ImplantSelectionSection';

interface ControlSidebarProps {
  params: SimulationParams;
  geometry: ComputedGeometry;
  kits: DrillingKit[];
  drillingLayout: DrillingSystemsLayout | null;
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
  onChangeDrillingLayout: (layout: DrillingSystemsLayout | null) => void;
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
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Réinitialiser ${label}`}
      title={`Réinitialiser ${label}`}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
    >
      <RotateCcw className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function SaveDefaultIconButton({
  paramKey,
  label,
  onClick,
}: {
  paramKey: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`save-default-${paramKey}`}
      onClick={onClick}
      aria-label={`Enregistrer ${label} par défaut`}
      title={`Enregistrer ${label} par défaut`}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-600 text-white shadow-xs transition-colors hover:bg-sky-700"
    >
      <BookmarkCheck className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

export function ControlSidebar({
  params,
  geometry,
  kits,
  drillingLayout,
  customImplants = [],
  highlightedElement = null,
  onSelectImplant,
  onSelectImplantModel,
  onDeleteImplantModel,
  onOpenFreeImplantWizard,
  onSelectKit,
  onSelectKitSleeve,
  onChangeDrillingLayout,
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
  const [extraParamsDrawerOpen, setExtraParamsDrawerOpen] = useState(false);
  const [hardwareDrawerOpen, setHardwareDrawerOpen] = useState(false);

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
      setHardwareDrawerOpen(true);
    } else if (highlightConfig.openDrawer === 4) {
      setExtraParamsDrawerOpen(true);
    }
  }, [highlightConfig, highlightedElement]);

  const activeKit = geometry.activeKit;
  const def = activeKit.userDefaults;
  const defGuideExt = def.guideTubeExtension ?? DEFAULT_SIMULATION_PARAMS.guideTubeExtension;
  const defHandpiece = def.handpieceHeadHeightMm ?? DEFAULT_SIMULATION_PARAMS.handpieceHeadHeight;
  const defSubcrestal = def.subcrestalDepthMm ?? DEFAULT_SIMULATION_PARAMS.subcrestalDepth;
  const defGingiva = def.gingivaThicknessMm ?? DEFAULT_SIMULATION_PARAMS.gingivaThickness;

  const isOffsetModified = Math.abs(geometry.offsetCao - def.offsetMm) >= 0.05;
  const isSubcrestalModified = Math.abs(params.subcrestalDepth - defSubcrestal) >= 0.05;
  const isGuideHeightModified = Math.abs(params.guideHeight - def.guidingHeightMm) >= 0.04;
  const isSleeveSeatingModified = params.sleeveSeating !== def.sleeveSeating;
  const isSleeveLipModified = Math.abs(params.sleeveLipThickness - def.sleeveLipThicknessMm) >= 0.01;
  const isSleeveWallModified = Math.abs(params.sleeveWallThickness - def.sleeveWallThicknessMm) >= 0.01;
  const isDrillSleeveClearModified =
    Math.abs(params.drillToSleeveClearance - def.drillToSleeveClearanceMm) >= 0.005;
  const isSurgicalGuideOffsetModified =
    Math.abs(params.surgicalGuideOffset - def.surgicalGuideOffsetMm) >= 0.005;
  const isGuideTubeExtensionModified = params.guideTubeExtension !== defGuideExt;
  const isPrintingClearanceModified =
    Math.abs(params.printingClearance - def.printingClearanceMm) >= 0.005;
  const isHandpieceModified = Math.abs(params.handpieceHeadHeight - defHandpiece) >= 0.05;
  const isGingivaModified = Math.abs(params.gingivaThickness - defGingiva) >= 0.05;

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
      {/* Top Sidebar Title: Paramètres (No dynamic top banner so drawers never shift vertically) */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
          Paramètres
        </h2>
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          title="Tout réinitialiser aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Réinit.
        </button>
      </div>

      {/* 1. SYSTÈMES DE FORAGE (ORDRE ALPHABÉTIQUE + ASSISTANT PIED À COULISSE) */}
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

        {systemsDrawerOpen && (
          <div className="p-2">
            <DrillingSystemsSection
              variant="advanced"
              params={params}
              kits={kits}
              drillingLayout={drillingLayout}
              activeKit={activeKit}
              isSleeveHighlighted={isHighlighted('sleeve')}
              onSelectKit={onSelectKit}
              onSelectKitSleeve={onSelectKitSleeve}
              onChangeDrillingLayout={onChangeDrillingLayout}
              onEditKit={onEditKit}
              onOpenCaliperAssistant={onOpenCaliperAssistant}
              onSetKitAsDefault={onSetKitAsDefault}
              onRestoreKitHistory={onRestoreKitHistory}
              onResetKitToFactory={onResetKitToFactory}
              onDeleteKit={onDeleteKit}
            />
          </div>
        )}
      </div>

      {/* 2. CHOIX DE L'IMPLANT (SHARED WITH MODE ASSISTÉ + ADVANCED DRILL INDICATOR + SUBCRESTAL) */}
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
            Ø{params.implantDiameter.toFixed(1)} · {params.implantLength.toFixed(1)} mm
          </span>
        </button>

        {implantDrawerOpen && (
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

          {/* Pilot available lengths selector directly after adapted drill */}
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
                  {isOffsetModified && (
                    <SaveDefaultIconButton
                      paramKey="offsetCao"
                      label="le décalage total"
                      onClick={() => onSaveParamDefault(activeKit.id, 'offsetCao')}
                    />
                  )}
                  <span
                    data-testid="sb-offset-cao-value"
                    className="font-mono-tabular font-semibold text-sky-700"
                  >
                    {geometry.offsetCao.toFixed(1)} mm
                  </span>
                  <ParamResetButton
                    label="le décalage total"
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
                  <BilingualTerm fr="Longueur forage" en="Drilling Length" />
                </label>
                <div className="flex items-center gap-1">
                  {isOffsetModified && (
                    <SaveDefaultIconButton
                      paramKey="drillUsefulLength"
                      label="la longueur de forage"
                      onClick={() => onSaveParamDefault(activeKit.id, 'offsetCao')}
                    />
                  )}
                  <span
                    data-testid="sb-drilling-length-value"
                    className="font-mono-tabular font-semibold text-slate-800"
                  >
                    {geometry.drillUsefulLength.toFixed(1)} mm
                  </span>
                  <ParamResetButton
                    label="la longueur de forage"
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

            {/* Enfouissement sous-crestal moved to the end of Part 2: Choix de l'implant */}
            <div className={`border-t border-slate-200 pt-2.5 ${highlightBox('subcrestalDepth')}`}>
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="sb-subcrestal-depth" className="font-medium text-slate-700">
                  <BilingualTerm fr="Enfouissement sous-crestal" en="Subcrestal Depth" />
                </label>
                <div className="flex items-center gap-1">
                  {isSubcrestalModified && (
                    <SaveDefaultIconButton
                      paramKey="subcrestalDepth"
                      label="l'enfouissement sous-crestal"
                      onClick={() => onSaveParamDefault(activeKit.id, 'subcrestalDepth')}
                    />
                  )}
                  <span className="font-mono-tabular font-semibold text-violet-700">
                    {params.subcrestalDepth.toFixed(1)} mm
                  </span>
                  <ParamResetButton
                    label="l'enfouissement sous-crestal"
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
        )}
      </div>

      {/* 3. TIROIR GUIDE CHIRURGICAL & MATÉRIEL (Surgical Guide, Extension, Printing & Sleeve) */}
      {params.mode === 'kit' && (
        <div
          data-testid="sidebar-drawer-3"
          className={`shrink-0 rounded-lg border transition-colors ${
            isHighlighted('surgicalGuideOffset') ||
            isHighlighted('guideTubeExtension') ||
            isHighlighted('printingClearance') ||
            isHighlighted('guideHeight') ||
            isHighlighted('sleeve')
              ? 'border-sky-400'
              : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setHardwareDrawerOpen((o) => !o)}
            aria-expanded={hardwareDrawerOpen}
            data-testid="sidebar-drawer-3-toggle"
            className={`bsp-section-header flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:opacity-95 ${
              hardwareDrawerOpen ? 'rounded-t-lg' : 'rounded-lg'
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold min-w-0">
              {hardwareDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              )}
              <span className="truncate" title="Guide chirurgical & matériel">
                3. Guide &amp; matériel
              </span>
            </span>
            <span className="font-mono-tabular shrink-0 whitespace-nowrap rounded border border-slate-300/60 bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {params.guideHeight.toFixed(1)} · {params.surgicalGuideOffset.toFixed(2)} mm
            </span>
          </button>

          {hardwareDrawerOpen && (
            <div className="space-y-2.5 border-t border-slate-200 p-2.5">
              {/* Integrated Hauteur guidage (Guide Height) */}
              <div className={highlightBox('guideHeight')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-guide-height" className="font-medium text-slate-700">
                    <BilingualTerm fr="Hauteur guidage" en="Guide Height" />
                  </label>
                  <div className="flex items-center gap-1">
                    {isGuideHeightModified && (
                      <SaveDefaultIconButton
                        paramKey="guideHeight"
                        label="la hauteur de guidage"
                        onClick={() => onSaveParamDefault(activeKit.id, 'guideHeight')}
                      />
                    )}
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
                  value={clamp(params.guideHeight, 1.5, 8.0)}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) => onChangeParams({ guideHeight: parseFloat(e.target.value) })}
                  onDoubleClick={() => onResetParam('guideHeight')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">Hauteur du puits de guidage</p>
              </div>

              {/* Mastertube quick presets when Biotech Kontact has sleeve active */}
              {activeKit.id === 'factory-biotech-kontact' && params.hasSleeve && (
                <div className={highlightBox('offsetCao')}>
                  <div className="mb-1 text-[11px] font-medium text-slate-700">
                    Paliers Mastertube Biotech
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['H9', 'H10.5', 'H12'] as BiotechMastertubePreset[]).map((preset) => {
                      const val = BIOTECH_MASTERTUBE_OFFSETS[preset];
                      const active = Math.abs(params.offsetOverride - val) < 0.05;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onChangeParams({ offsetOverride: val })}
                          className={`font-mono-tabular rounded-md border py-1 text-xs font-semibold transition-colors ${
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
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-800">
                    <BilingualTerm fr="Position de la douille" en="Sleeve Seating Position" />
                    {isSleeveSeatingModified && (
                      <SaveDefaultIconButton
                        paramKey="sleeveSeating"
                        label="la position de la douille"
                        onClick={() => onSaveParamDefault(activeKit.id, 'sleeveSeating')}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-200/70 p-0.5">
                    <button
                      type="button"
                      onClick={() => onChangeParams({ sleeveSeating: 'above' })}
                      className={`rounded px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                        params.sleeveSeating === 'above'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Au-dessus du guide
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeParams({ sleeveSeating: 'flush' })}
                      className={`rounded px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                        params.sleeveSeating === 'flush'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      À fleur du guide
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="sb-sleeve-lip" className="text-slate-600">
                      <BilingualTerm fr="Collerette douille" en="Sleeve Lip" />
                    </label>
                    <div className="flex items-center gap-1">
                      {isSleeveLipModified && (
                        <SaveDefaultIconButton
                          paramKey="sleeveLipThickness"
                          label="la collerette"
                          onClick={() => onSaveParamDefault(activeKit.id, 'sleeveLipThickness')}
                        />
                      )}
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {params.sleeveLipThickness.toFixed(2)} mm
                      </span>
                      <ParamResetButton
                        label="la collerette"
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
                    value={params.sleeveLipThickness}
                    title="Double-cliquer pour réinitialiser par défaut"
                    onChange={(e) =>
                      onChangeParams({ sleeveLipThickness: parseFloat(e.target.value) })
                    }
                    onDoubleClick={() => onResetParam('sleeveLipThickness')}
                    className="cad-slider w-full"
                  />

                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="sb-sleeve-wall" className="text-slate-600">
                      <BilingualTerm fr="Paroi cylindre" en="Sleeve Wall" />
                    </label>
                    <div className="flex items-center gap-1">
                      {isSleeveWallModified && (
                        <SaveDefaultIconButton
                          paramKey="sleeveWallThickness"
                          label="l'épaisseur de paroi"
                          onClick={() => onSaveParamDefault(activeKit.id, 'sleeveWallThickness')}
                        />
                      )}
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {params.sleeveWallThickness.toFixed(2)} mm
                      </span>
                      <ParamResetButton
                        label="l'épaisseur de paroi"
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
                    value={params.sleeveWallThickness}
                    title="Double-cliquer pour réinitialiser par défaut"
                    onChange={(e) =>
                      onChangeParams({ sleeveWallThickness: parseFloat(e.target.value) })
                    }
                    onDoubleClick={() => onResetParam('sleeveWallThickness')}
                    className="cad-slider w-full"
                  />

                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="sb-drill-sleeve-clear" className="text-slate-600">
                      <BilingualTerm fr="Jeu douille / foret" en="Drill-to-Sleeve Clearance" />
                    </label>
                    <div className="flex items-center gap-1">
                      {isDrillSleeveClearModified && (
                        <SaveDefaultIconButton
                          paramKey="drillToSleeveClearance"
                          label="le jeu douille/foret"
                          onClick={() =>
                            onSaveParamDefault(activeKit.id, 'drillToSleeveClearance')
                          }
                        />
                      )}
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {params.drillToSleeveClearance.toFixed(2)} mm
                      </span>
                      <ParamResetButton
                        label="le jeu douille/foret"
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
                    value={params.drillToSleeveClearance}
                    title="Double-cliquer pour réinitialiser par défaut"
                    onChange={(e) =>
                      onChangeParams({ drillToSleeveClearance: parseFloat(e.target.value) })
                    }
                    onDoubleClick={() => onResetParam('drillToSleeveClearance')}
                    className="cad-slider w-full"
                  />
                </div>
              )}

              {/* Surgical guide-to-teeth/gingiva offset (0.25 mm default) */}
              <div className={highlightBox('surgicalGuideOffset')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-surgical-guide-offset" className="font-medium text-slate-700">
                    <BilingualTerm
                      fr="Décalage du guide chirurgical"
                      en="Surgical Guide Offset"
                    />
                  </label>
                  <div className="flex items-center gap-1">
                    {isSurgicalGuideOffsetModified && (
                      <SaveDefaultIconButton
                        paramKey="surgicalGuideOffset"
                        label="le décalage du guide chirurgical"
                        onClick={() => onSaveParamDefault(activeKit.id, 'surgicalGuideOffset')}
                      />
                    )}
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {params.surgicalGuideOffset.toFixed(2)} mm
                    </span>
                    <ParamResetButton
                      label="le décalage du guide chirurgical"
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
                  value={params.surgicalGuideOffset}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) =>
                    onChangeParams({ surgicalGuideOffset: parseFloat(e.target.value) })
                  }
                  onDoubleClick={() => onResetParam('surgicalGuideOffset')}
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  Espace entre le guide, les dents et la gencive (0,25 mm par défaut : bon ratio
                  entre friction et facilité de manipulation).
                </p>
              </div>

              {/* Guide tube downward extension (Blue Sky Plan: default to gingiva, option to bone) */}
              <div className={highlightBox('guideTubeExtension')}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700">
                    <BilingualTerm
                      fr="Allongement / prolongement du tube"
                      en="Guide Tube Extension"
                    />
                  </span>
                  <div className="flex items-center gap-1">
                    {isGuideTubeExtensionModified && (
                      <SaveDefaultIconButton
                        paramKey="guideTubeExtension"
                        label="l'allongement du tube"
                        onClick={() => onSaveParamDefault(activeKit.id, 'guideTubeExtension')}
                      />
                    )}
                    <ParamResetButton
                      label="l'allongement du tube"
                      onClick={() => onResetParam('guideTubeExtension')}
                    />
                  </div>
                </div>
                <div
                  className="grid grid-cols-2 gap-1 rounded-md bg-slate-200/70 p-0.5"
                  role="group"
                  aria-label="Prolongement du tube de guidage"
                >
                  <button
                    type="button"
                    data-testid="tube-extend-gingiva-btn"
                    onClick={() => onChangeParams({ guideTubeExtension: 'gingiva' })}
                    className={`rounded px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                      params.guideTubeExtension === 'gingiva'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Jusqu&apos;à la gencive
                  </button>
                  <button
                    type="button"
                    data-testid="tube-extend-bone-btn"
                    onClick={() => onChangeParams({ guideTubeExtension: 'bone' })}
                    className={`rounded px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                      params.guideTubeExtension === 'bone'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Jusqu&apos;à l&apos;os
                  </button>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  {params.guideTubeExtension === 'gingiva'
                    ? 'Par défaut dans Blue Sky Plan : le tube se prolonge jusqu’à la gencive (chirurgie sans lambeau / appui muqueux).'
                    : 'Option BSP pour chirurgie avec lambeau : le puits du guide se prolonge jusqu’à la crête osseuse.'}
                </p>
              </div>

              {/* 3D printing clearance */}
              <div className={highlightBox('printingClearance')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-printing-clear" className="font-medium text-slate-700">
                    <BilingualTerm fr="Jeu d'impression 3D" en="3D Printing Clearance" />
                  </label>
                  <div className="flex items-center gap-1">
                    {isPrintingClearanceModified && (
                      <SaveDefaultIconButton
                        paramKey="printingClearance"
                        label="le jeu d'impression 3D"
                        onClick={() => onSaveParamDefault(activeKit.id, 'printingClearance')}
                      />
                    )}
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {params.printingClearance.toFixed(2)} mm
                    </span>
                    <ParamResetButton
                      label="le jeu d'impression 3D"
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
                  value={params.printingClearance}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) =>
                    onChangeParams({ printingClearance: parseFloat(e.target.value) })
                  }
                  onDoubleClick={() => onResetParam('printingClearance')}
                  className="cad-slider mt-1 w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TIROIR PARAMÈTRES SUPPLÉMENTAIRES (Mucosa Thickness & Contra-angle Head Height) */}
      {params.mode === 'kit' && (
        <div
          data-testid="sidebar-drawer-4"
          className={`shrink-0 rounded-lg border transition-colors ${
            isHighlighted('gingivaThickness') || isHighlighted('handpieceHeadHeight')
              ? 'border-sky-400'
              : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setExtraParamsDrawerOpen((o) => !o)}
            aria-expanded={extraParamsDrawerOpen}
            data-testid="sidebar-drawer-4-toggle"
            className={`bsp-section-header flex w-full items-center justify-between gap-1.5 px-2.5 py-2 text-left transition-colors hover:opacity-95 ${
              extraParamsDrawerOpen ? 'rounded-t-lg' : 'rounded-lg'
            }`}
          >
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold min-w-0">
              {extraParamsDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              )}
              <span className="leading-tight" title="Paramètres supplémentaires">
                4. Paramètres supplémentaires
              </span>
            </span>
            <span className="font-mono-tabular shrink-0 whitespace-nowrap rounded border border-slate-300/60 bg-white/70 px-1 py-0.5 text-[9.5px] font-semibold text-slate-600">
              {params.gingivaThickness.toFixed(1)} · {params.handpieceHeadHeight.toFixed(1)}
            </span>
          </button>

          {extraParamsDrawerOpen && (
            <div className="space-y-2.5 border-t border-slate-200 p-2.5">
              {/* Épaisseur muqueuse */}
              <div className={highlightBox('gingivaThickness')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-gingiva-thickness" className="font-medium text-slate-700">
                    <BilingualTerm fr="Épaisseur muqueuse" en="Mucosa Thickness" />
                  </label>
                  <div className="flex items-center gap-1">
                    {isGingivaModified && (
                      <SaveDefaultIconButton
                        paramKey="gingivaThickness"
                        label="l'épaisseur muqueuse"
                        onClick={() => onSaveParamDefault(activeKit.id, 'gingivaThickness')}
                      />
                    )}
                    <span className="font-mono-tabular font-semibold text-rose-700">
                      {params.gingivaThickness.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="l'épaisseur muqueuse"
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

              {/* Contra-angle head height */}
              <div className={highlightBox('handpieceHeadHeight')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="ca-head-height" className="font-medium text-slate-700">
                    <BilingualTerm
                      fr="Hauteur tête contre-angle"
                      en="Contra-Angle Head Height"
                    />
                  </label>
                  <div className="flex items-center gap-1">
                    {isHandpieceModified && (
                      <SaveDefaultIconButton
                        paramKey="handpieceHeadHeight"
                        label="la hauteur de tête du contre-angle"
                        onClick={() => onSaveParamDefault(activeKit.id, 'handpieceHeadHeight')}
                      />
                    )}
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {params.handpieceHeadHeight.toFixed(1)} mm
                    </span>
                    <ParamResetButton
                      label="la hauteur de tête du contre-angle"
                      onClick={() => onResetParam('handpieceHeadHeight')}
                    />
                  </div>
                </div>
                <input
                  id="ca-head-height"
                  data-testid="sb-handpiece-slider"
                  type="range"
                  min={10.0}
                  max={17.0}
                  step={0.5}
                  value={clamp(params.handpieceHeadHeight, 10.0, 17.0)}
                  title="Double-cliquer pour réinitialiser par défaut"
                  onChange={(e) =>
                    onChangeParams({ handpieceHeadHeight: parseFloat(e.target.value) })
                  }
                  onDoubleClick={() => onResetParam('handpieceHeadHeight')}
                  className="cad-slider mt-1 w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
