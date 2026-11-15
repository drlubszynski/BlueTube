import { useEffect, useState } from 'react';
import {
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  History,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  BIOTECH_KONTACT_DIAMETERS,
  BIOTECH_KONTACT_LENGTHS,
  BIOTECH_MASTERTUBE_OFFSETS,
  BiotechMastertubePreset,
  ComputedGeometry,
  CustomImplantSystem,
  DiagramElementFocus,
  DrillingKit,
  GLOBAL_D_IMPLANT_DIAMETERS,
  GLOBAL_D_IMPLANT_LENGTHS,
  HighlightableParamKey,
  ResettableParamKey,
  SimulationParams,
  clamp,
  getElementHighlightConfig,
  groupImplantModelsByBrand,
  pickOptimalPilotLength,
  roundTo,
  sortImplantModelsByUsage,
  sortKitsByUsage,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

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
  onRestoreKitHistory,
  onResetKitToFactory,
  onDeleteKit,
  onResetAll,
}: ControlSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [implantDrawerOpen, setImplantDrawerOpen] = useState(false);
  const [anatomyDrawerOpen, setAnatomyDrawerOpen] = useState(false);
  const [hardwareDrawerOpen, setHardwareDrawerOpen] = useState(false);
  const [kitMenuOpenId, setKitMenuOpenId] = useState<string | null>(null);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [defaultSavedToastId, setDefaultSavedToastId] = useState<string | null>(null);

  const highlightConfig = getElementHighlightConfig(highlightedElement);
  const isHighlighted = (key: HighlightableParamKey) =>
    Boolean(highlightConfig?.params.includes(key));
  const highlightBox = (key: HighlightableParamKey) =>
    isHighlighted(key)
      ? 'param-highlight-ring rounded-lg border p-2 transition-all'
      : 'rounded-lg border border-transparent p-0.5 transition-all';

  useEffect(() => {
    if (!highlightConfig) return;
    if (highlightConfig.openDrawer === 3) {
      setAnatomyDrawerOpen(true);
    } else if (highlightConfig.openDrawer === 4) {
      setHardwareDrawerOpen(true);
    }
  }, [highlightConfig]);

  const sortedKits = sortKitsByUsage(kits);
  const topThreeKits = sortedKits.slice(0, 3);
  const extraKits = sortedKits.slice(3);

  const activeKit = geometry.activeKit;

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

  const renderKitCard = (kit: DrillingKit) => {
    const isActive = params.mode === 'kit' && kit.id === activeKit.id;
    const isMenuOpen = kitMenuOpenId === kit.id;
    const isHistoryOpen = historyOpenId === kit.id;
    const effectiveHasSleeve = isActive ? params.hasSleeve : kit.userDefaults.hasSleeve;

    return (
      <div
        key={kit.id}
        data-testid={`sidebar-system-${kit.id}`}
        className={`relative rounded-lg border transition-colors ${
          isActive
            ? 'border-sky-500 bg-sky-50/60'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-1.5 p-2">
          <button
            type="button"
            onClick={() => {
              setKitMenuOpenId(null);
              setHistoryOpenId(null);
              onSelectKit(kit.id);
            }}
            className="min-w-0 flex-1 space-y-1 text-left"
          >
            <div className="text-xs font-bold leading-snug text-slate-900">{kit.name}</div>
            <div>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold ${
                  kit.kind === 'pilot'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {kit.kind === 'pilot' ? 'Foret pilote' : 'Forage guidé'}
              </span>
            </div>
            <div className="text-[10.5px] leading-snug text-slate-500">
              {kit.kind === 'pilot'
                ? 'Compatible : Tous implants (Bibliothèque)'
                : kit.implantBrandName && kit.implantModelName
                  ? `Compatible : ${kit.implantBrandName} · ${kit.implantModelName}`
                  : kit.brandLabel}
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setKitMenuOpenId(null);
                setHistoryOpenId(null);
                onEditKit(kit.id);
              }}
              data-testid={`sidebar-edit-${kit.id}`}
              aria-label={`Modifier ${kit.name} au pied à coulisse`}
              title={`Modifier ${kit.name} au pied à coulisse`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-sky-400 hover:text-sky-700"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
            </button>

            {isActive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setKitMenuOpenId((prev) => (prev === kit.id ? null : kit.id));
                  setHistoryOpenId(null);
                }}
                aria-label={`Menu du système ${kit.name}`}
                aria-expanded={isMenuOpen}
                title="Options (Défaut / Historique / Usine)"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Right/Bottom Sub-button: Avec douille | Sans douille for every system */}
        <div className="px-2 pb-2">
          <div
            role="group"
            aria-label={`Douille pour ${kit.name}`}
            className={`grid grid-cols-2 gap-1 rounded-md border bg-slate-100 p-0.5 text-[10.5px] font-semibold ${
              isActive && isHighlighted('sleeve')
                ? 'param-highlight-ring'
                : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setKitMenuOpenId(null);
                onSelectKitSleeve(kit.id, true);
              }}
              data-testid={`sidebar-sleeve-with-${kit.id}`}
              className={`rounded py-0.5 text-center transition-colors ${
                effectiveHasSleeve
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Avec douille
            </button>
            <button
              type="button"
              onClick={() => {
                setKitMenuOpenId(null);
                onSelectKitSleeve(kit.id, false);
              }}
              data-testid={`sidebar-sleeve-without-${kit.id}`}
              className={`rounded py-0.5 text-center transition-colors ${
                !effectiveHasSleeve
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sans douille
            </button>
          </div>
        </div>

        {/* Compact Menu inside Active System Card */}
        {isActive && isMenuOpen && (
          <div
            data-testid="active-kit-menu"
            className="border-t border-sky-200/80 bg-white/95 px-2 py-2 text-xs rounded-b-lg space-y-1"
          >
            <button
              type="button"
              onClick={() => {
                setKitMenuOpenId(null);
                onEditKit(kit.id);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-900"
            >
              <Pencil className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              <span>Modifier au pied à coulisse</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSetKitAsDefault(kit.id);
                setDefaultSavedToastId(kit.id);
                setTimeout(() => setDefaultSavedToastId(null), 2000);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-900"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              <span>
                {defaultSavedToastId === kit.id
                  ? 'Réglages enregistrés par défaut'
                  : 'Définir par défaut'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryOpenId((prev) => (prev === kit.id ? null : kit.id))}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Historique ({kit.history.length})
              </span>
              {isHistoryOpen ? (
                <ChevronUp className="h-3 w-3 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
              )}
            </button>

            {isHistoryOpen && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-1.5">
                {kit.history.length === 0 ? (
                  <div className="px-1 py-1 text-[10.5px] text-slate-500">
                    Aucune modification sauvegardée pour ce système.
                  </div>
                ) : (
                  kit.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-1.5 rounded bg-white px-2 py-1 text-[10.5px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">{entry.label}</div>
                        <div className="font-mono-tabular text-[10px] text-slate-400">
                          Décalage {entry.snapshot.offsetMm.toFixed(1)} · H{' '}
                          {entry.snapshot.guidingHeightMm.toFixed(1)} mm
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreKitHistory(kit.id, entry.id);
                          setHistoryOpenId(null);
                        }}
                        className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50"
                      >
                        Restaurer
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onResetKitToFactory(kit.id);
                setKitMenuOpenId(null);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              Paramètres d&apos;usine
            </button>

            {!kit.isFactory && (
              <button
                type="button"
                onClick={() => {
                  setKitMenuOpenId(null);
                  onDeleteKit(kit.id);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Supprimer ce système
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      aria-label="Configuration du système implantaire et de l'implant"
      className="bsp-panel flex flex-col gap-3 rounded-xl border p-3 shadow-xs"
    >
      {/* DEDICATED TOP SUB-CATEGORY: ASSISTANT PIED À COULISSE — CRÉER MON SYSTÈME IMPLANTAIRE */}
      <div>
        <button
          type="button"
          onClick={onOpenCaliperAssistant}
          data-testid="open-caliper-assistant-btn"
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
            params.mode === 'caliper'
              ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
              : 'border-sky-200 bg-sky-50/70 text-sky-950 hover:bg-sky-100/70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                params.mode === 'caliper'
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-sky-700 border border-sky-200'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">Assistant pied à coulisse</div>
              <div
                className={`truncate text-[10.5px] ${
                  params.mode === 'caliper' ? 'text-sky-100' : 'text-sky-700'
                }`}
              >
                Créer mon système implantaire
              </div>
            </div>
          </div>
          <Ruler className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
        </button>
      </div>

      {/* 1. BIBLIOTHÈQUE DES SYSTÈMES DE FORAGE & PILOTES (TOP 3 + DRAWER) */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bsp-section-header flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold min-w-0">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
            <span className="truncate">
              1. <BilingualTerm fr="Systèmes de forage" en="Drilling & Pilot Kits" />
            </span>
          </h2>
          <span className="shrink-0 text-[10px] font-medium text-slate-500">Pilotes &amp; guidés</span>
        </div>

        <div className="p-2 space-y-1.5">
          <div className="space-y-1.5" data-testid="top-kits-list">
            {topThreeKits.map((kit) => renderKitCard(kit))}
          </div>

          {extraKits.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setDrawerOpen((o) => !o)}
                aria-expanded={drawerOpen}
                data-testid="extra-kits-drawer-toggle"
                className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span>Autres systèmes de forage ({extraKits.length})</span>
                {drawerOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                )}
              </button>
              {drawerOpen && (
                <div className="mt-1.5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-1.5">
                  {extraKits.map((kit) => renderKitCard(kit))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. CHOIX DE L'IMPLANT (CORRELATED TO ACTIVE SYSTEM) */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bsp-section-header flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold min-w-0">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
            <span className="truncate">
              2. <BilingualTerm fr="Choix de l'implant" en="Implant Dimensions" />
            </span>
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

        <div className="p-2.5">
          {(() => {
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

            const renderModelCard = (model: CustomImplantSystem) => {
              const isSelected = activeLibraryModel?.id === model.id;
              return (
                <div
                  key={model.id}
                  data-testid={`implant-model-${model.id}`}
                  className={`flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 transition-colors ${
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
                    <div className="truncate text-[11.5px] font-bold leading-tight text-slate-900">
                      {model.brand}
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-sky-800">
                        {model.model}
                      </span>
                    </div>
                    <div className="font-mono-tabular truncate text-[10px] text-slate-500">
                      Ø {model.diametersMm.map((d) => d.toFixed(1)).join(' · ')} | L{' '}
                      {model.lengthsMm.map((l) => (Number.isInteger(l) ? l.toFixed(0) : l.toFixed(1))).join(' · ')}
                    </div>
                  </button>
                  {!model.isFactory && onDeleteImplantModel && (
                    <button
                      type="button"
                      onClick={() => onDeleteImplantModel(model.id)}
                      aria-label={`Supprimer ${model.brand} ${model.model}`}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            };

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

            return (
              <div className="space-y-2.5">
                {/* Library Mode Header: Pilot gets full Top 3 + drawer; Guided gets compatible implant + Saisie libre */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-800">
                      {activeKit.kind === 'pilot' ? 'Bibliothèque implants' : 'Gamme compatible'}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {activeKit.kind === 'pilot'
                        ? 'Top 3 les plus utilisés'
                        : `${activeKit.implantBrandName ?? 'Biotech'} · ${activeKit.implantModelName ?? 'Kontact'}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenFreeImplantWizard}
                    data-testid="open-free-implant-btn"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-300 bg-sky-50/70 px-2 py-1 text-[10.5px] font-semibold text-sky-800 hover:bg-sky-100"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Saisie libre
                  </button>
                </div>

                {/* Pilot System: Full Implant Library (Top 3 + Drawer organized by Brand/Model) */}
                {activeKit.kind === 'pilot' && (
                  <div className="space-y-1.5" data-testid="pilot-implant-library">
                    <div className="space-y-1">{topThreeImplants.map(renderModelCard)}</div>
                    {extraImplants.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setImplantDrawerOpen((o) => !o)}
                          aria-expanded={implantDrawerOpen}
                          data-testid="extra-implants-drawer-toggle"
                          className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-slate-700 hover:bg-slate-100"
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
                            data-testid="extra-implants-drawer"
                            className="mt-1.5 space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-1.5"
                          >
                            {extraBrandGroups.map((group) => (
                              <div key={group.brand} className="space-y-1">
                                <div className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  {group.brand}
                                </div>
                                {group.models.map(renderModelCard)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Guided System: Compatible implant indicator + quick switch if a custom Saisie libre model is selected */}
                {activeKit.kind === 'guided' && params.implantBrand === 'custom' && activeLibraryModel && (
                  <div className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50/50 px-2 py-1 text-[10.5px]">
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

                {/* Diameters: Preset Buttons of Active Model + Continuous Slider (2.0–8.0 mm) */}
                <div className={highlightBox('implantDiameter')}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <label htmlFor="implant-diameter-slider" className="font-medium text-slate-600 truncate">
                      Diamètre {activeModelLabel} (mm)
                    </label>
                    <span className="font-mono-tabular shrink-0 font-semibold text-slate-900">
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
                    id="implant-diameter-slider"
                    data-testid="implant-diameter-slider"
                    type="range"
                    min={2.0}
                    max={8.0}
                    step={0.1}
                    value={clamp(params.implantDiameter, 2.0, 8.0)}
                    aria-label="Curseur diamètre de l'implant"
                    onChange={(e) =>
                      onSelectImplant({ implantDiameter: parseFloat(e.target.value) })
                    }
                    className="cad-slider mt-1.5 w-full"
                  />
                </div>

                {/* Lengths: Preset Buttons of Active Model + Continuous Slider (4.0–20.0 mm) */}
                <div className={highlightBox('implantLength')}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <label htmlFor="implant-length-slider" className="font-medium text-slate-600 truncate">
                      Longueur {activeModelLabel} (mm)
                    </label>
                    <span className="font-mono-tabular shrink-0 font-semibold text-slate-900">
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
                    id="implant-length-slider"
                    data-testid="implant-length-slider"
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
          })()}

          {/* Automatic drill adaptation indicator */}
          <div
            className={`mt-2.5 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] ${
              isHighlighted('drillUsefulLength') || isHighlighted('offsetCao')
                ? 'param-highlight-ring'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="text-slate-600">Foret adapté :</span>
            <span className="font-mono-tabular font-semibold text-slate-900">
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
        </div>
      </div>

      {/* 3. TIROIR ANATOMIE DU SITE (Moved from right side of 2D Diagram: Mucosa & Subcrestal) */}
      {params.mode === 'kit' && (
        <div
          data-testid="sidebar-drawer-3"
          className={`rounded-lg border overflow-hidden transition-colors ${
            isHighlighted('gingivaThickness') || isHighlighted('subcrestalDepth')
              ? 'border-sky-400'
              : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setAnatomyDrawerOpen((o) => !o)}
            aria-expanded={anatomyDrawerOpen}
            data-testid="sidebar-drawer-3-toggle"
            className="bsp-section-header flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:opacity-95"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold min-w-0">
              {anatomyDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              )}
              <span className="truncate">3. Anatomie du site</span>
            </span>
            <span className="font-mono-tabular shrink-0 rounded border border-slate-300/60 bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {params.gingivaThickness.toFixed(1)} / {params.subcrestalDepth.toFixed(1)} mm
            </span>
          </button>

          {anatomyDrawerOpen && (
            <div className="space-y-2.5 border-t border-slate-200 p-2.5">
              {/* Épaisseur muqueuse */}
              <div className={highlightBox('gingivaThickness')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-gingiva-thickness" className="font-medium text-slate-700">
                    <BilingualTerm fr="Épaisseur muqueuse" en="Mucosa Thickness" />
                  </label>
                  <div className="flex items-center gap-1">
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
                  onChange={(e) =>
                    onChangeParams({ gingivaThickness: parseFloat(e.target.value) })
                  }
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Crête osseuse → Surface gingivale
                </p>
              </div>

              {/* Enfouissement sous-crestal */}
              <div className={highlightBox('subcrestalDepth')}>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="sb-subcrestal-depth" className="font-medium text-slate-700">
                    <BilingualTerm fr="Enfouissement sous-crestal" en="Subcrestal Depth" />
                  </label>
                  <div className="flex items-center gap-1">
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
                  onChange={(e) =>
                    onChangeParams({ subcrestalDepth: parseFloat(e.target.value) })
                  }
                  className="cad-slider mt-1 w-full"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Crête osseuse → Col implantaire
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TIROIR GUIDE CHIRURGICAL & MATÉRIEL (Surgical Guide, Extension, Printing, Handpiece & Sleeve) */}
      {params.mode === 'kit' && (
        <div
          data-testid="sidebar-drawer-4"
          className={`rounded-lg border overflow-hidden transition-colors ${
            isHighlighted('surgicalGuideOffset') ||
            isHighlighted('guideTubeExtension') ||
            isHighlighted('printingClearance') ||
            isHighlighted('handpieceHeadHeight') ||
            isHighlighted('sleeve')
              ? 'border-sky-400'
              : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setHardwareDrawerOpen((o) => !o)}
            aria-expanded={hardwareDrawerOpen}
            data-testid="sidebar-drawer-4-toggle"
            className="bsp-section-header flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:opacity-95"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold min-w-0">
              {hardwareDrawerOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              )}
              <span className="truncate" title="Guide chirurgical & matériel">
                4. Guide &amp; matériel
              </span>
            </span>
            <span className="font-mono-tabular shrink-0 rounded border border-slate-300/60 bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {params.surgicalGuideOffset.toFixed(2)} · CA {params.handpieceHeadHeight.toFixed(1)}
            </span>
          </button>

          {hardwareDrawerOpen && (
            <div className="space-y-2.5 border-t border-slate-200 p-2.5">
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
                  <div className="text-[11px] font-semibold text-slate-800">
                    <BilingualTerm fr="Position de la douille" en="Sleeve Seating Position" />
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
                    onChange={(e) =>
                      onChangeParams({ sleeveLipThickness: parseFloat(e.target.value) })
                    }
                    className="cad-slider w-full"
                  />

                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="sb-sleeve-wall" className="text-slate-600">
                      <BilingualTerm fr="Paroi cylindre" en="Sleeve Wall" />
                    </label>
                    <div className="flex items-center gap-1">
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
                    onChange={(e) =>
                      onChangeParams({ sleeveWallThickness: parseFloat(e.target.value) })
                    }
                    className="cad-slider w-full"
                  />

                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="sb-drill-sleeve-clear" className="text-slate-600">
                      <BilingualTerm fr="Jeu douille / foret" en="Drill-to-Sleeve Clearance" />
                    </label>
                    <div className="flex items-center gap-1">
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
                    onChange={(e) =>
                      onChangeParams({ drillToSleeveClearance: parseFloat(e.target.value) })
                    }
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
                  type="range"
                  min={0.05}
                  max={0.6}
                  step={0.05}
                  value={params.surgicalGuideOffset}
                  onChange={(e) =>
                    onChangeParams({ surgicalGuideOffset: parseFloat(e.target.value) })
                  }
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
                  <ParamResetButton
                    label="l'allongement du tube"
                    onClick={() => onResetParam('guideTubeExtension')}
                  />
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
                  onChange={(e) =>
                    onChangeParams({ printingClearance: parseFloat(e.target.value) })
                  }
                  className="cad-slider mt-1 w-full"
                />
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
                  type="range"
                  min={10.0}
                  max={17.0}
                  step={0.5}
                  value={clamp(params.handpieceHeadHeight, 10.0, 17.0)}
                  onChange={(e) =>
                    onChangeParams({ handpieceHeadHeight: parseFloat(e.target.value) })
                  }
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
