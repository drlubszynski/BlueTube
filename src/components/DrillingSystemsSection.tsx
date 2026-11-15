import { useState } from 'react';
import {
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  History,
  MoreVertical,
  Pencil,
  RotateCcw,
  Ruler,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  DrillingKit,
  DrillingSystemGroup,
  SimulationParams,
  groupDrillingKitsBySystem,
  isDentsplySironaKit,
} from '../utils/implantGeometry';
import { BrandLogo } from './BrandLogo';
import { DentsplyDrillVisualStep } from './DentsplyDrillVisualStep';
import { SmoothDrawer } from './SmoothDrawer';

interface DrillingSystemsSectionProps {
  variant: 'assisted' | 'advanced';
  params: SimulationParams;
  kits: DrillingKit[];
  activeKit: DrillingKit;
  assistedSelectionRevealed?: boolean;
  isSleeveHighlighted?: boolean;
  onSelectKit: (kitId: string) => void;
  onSelectKitSleeve: (kitId: string, hasSleeve: boolean) => void;
  onEditKit: (kitId: string) => void;
  onEnterConfigureStep?: (kitId: string) => void;
  onOpenCaliperAssistant: () => void;
  onSetKitAsDefault?: (kitId: string) => void;
  onRestoreKitHistory?: (kitId: string, historyId: string) => void;
  onResetKitToFactory?: (kitId: string) => void;
  onDeleteKit?: (kitId: string) => void;
}

function getKitSubtitle(kit: DrillingKit, effectiveHasSleeve: boolean): string {
  if (kit.kind === 'pilot') {
    return 'Compatible : Tous implants (Bibliothèque)';
  }
  if (kit.id === 'factory-biotech-kontact') {
    return effectiveHasSleeve
      ? 'Biotech Dental · Kontact · AtlaSurgery 2 (Mastertube · 6–16 mm)'
      : 'Biotech Dental · Kontact · AtlaSurgery 2 (Tubeless · Offset 12 mm · 6–16 mm)';
  }
  if (kit.id === 'factory-mis-mguide-narrow') {
    return effectiveHasSleeve
      ? 'MIS (Dentsply Sirona) · Narrow · Douille à fleur · Ø5,10 · H 5 · Offset 9,5'
      : 'MIS (Dentsply Sirona) · Narrow · Sans douille · Ø4,10 · H 5 · Offset 9,5';
  }
  if (kit.id === 'factory-mis-mguide') {
    return effectiveHasSleeve
      ? 'MIS (Dentsply Sirona) · Standard · Douille à fleur · Ø6,60 · H 5 · Offset 9,5'
      : 'MIS (Dentsply Sirona) · Standard · Sans douille · Ø5,60 · H 5 · Offset 9,5';
  }
  if (kit.implantBrandName && kit.implantModelName) {
    return `Compatible : ${kit.implantBrandName} · ${kit.implantModelName}`;
  }
  return kit.brandLabel;
}

export function DrillingSystemsSection({
  variant,
  params,
  kits,
  activeKit,
  assistedSelectionRevealed = true,
  isSleeveHighlighted = false,
  onSelectKit,
  onSelectKitSleeve,
  onEditKit,
  onEnterConfigureStep,
  onOpenCaliperAssistant,
  onSetKitAsDefault,
  onRestoreKitHistory,
  onResetKitToFactory,
  onDeleteKit,
}: DrillingSystemsSectionProps) {
  const [expandedAdvancedGroupId, setExpandedAdvancedGroupId] = useState<string | null>(null);
  const [kitMenuOpenId, setKitMenuOpenId] = useState<string | null>(null);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [defaultSavedToastId, setDefaultSavedToastId] = useState<string | null>(null);

  const isAssisted = variant === 'assisted';
  const alphaGroups = groupDrillingKitsBySystem(kits);

  const renderIndependentConfigControls = (
    group: DrillingSystemGroup,
    displayedKit: DrillingKit,
    effectiveHasSleeve: boolean,
    isGroupActive: boolean,
    testPrefix: string,
  ) => {
    const hasSubSystems = group.kits.length > 1;

    return (
      <div className="space-y-2 border-t border-sky-200/70 bg-white/85 px-2.5 py-2.5 text-[11px] rounded-b-xl">
        {/* Independent Douille choice */}
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Douille métallique
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onSelectKitSleeve(displayedKit.id, false)}
              data-testid={`${testPrefix}-sleeve-off-${displayedKit.id}`}
              aria-pressed={!effectiveHasSleeve}
              className={`rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                !effectiveHasSleeve
                  ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
              }`}
            >
              Sans douille
            </button>
            <button
              type="button"
              onClick={() => onSelectKitSleeve(displayedKit.id, true)}
              data-testid={`${testPrefix}-sleeve-on-${displayedKit.id}`}
              aria-pressed={effectiveHasSleeve}
              className={`rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                effectiveHasSleeve
                  ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
              } ${isGroupActive && isSleeveHighlighted ? 'param-highlight-ring' : ''}`}
            >
              Avec douille
            </button>
          </div>
        </div>

        {/* Independent Standard / Narrow choice (never resets Douille) */}
        {hasSubSystems && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Partie guidante / Diamètre
            </div>
            <div className="grid grid-cols-2 gap-1">
              {group.kits.map((subKit) => {
                const isSubSelected = displayedKit.id === subKit.id;
                return (
                  <button
                    key={subKit.id}
                    type="button"
                    onClick={() => onSelectKit(subKit.id)}
                    data-testid={`${testPrefix}-variant-${subKit.id}`}
                    aria-pressed={isSubSelected}
                    className={`rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                      isSubSelected
                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                    }`}
                  >
                    {subKit.subSystemLabel ?? subKit.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dentsply Sirona reference photo & color guide */}
        {isDentsplySironaKit(displayedKit) && <DentsplyDrillVisualStep />}

        {/* Actions row */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onEditKit(displayedKit.id)}
            data-testid={`${testPrefix}-edit-${displayedKit.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Pied à coulisse
          </button>

          <button
            type="button"
            onClick={() => {
              setKitMenuOpenId((prev) => (prev === displayedKit.id ? null : displayedKit.id));
              setHistoryOpenId(null);
            }}
            aria-label={`Options de ${displayedKit.name}`}
            aria-expanded={kitMenuOpenId === displayedKit.id}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            <MoreVertical className="h-3 w-3" aria-hidden="true" />
            Options
          </button>
        </div>

        {/* Context Menu */}
        <SmoothDrawer open={kitMenuOpenId === displayedKit.id}>
          <div
            data-testid="active-kit-menu"
            className="mt-1 space-y-1 rounded-lg border border-slate-200 bg-slate-50/90 p-1.5 text-xs"
          >
            {onSetKitAsDefault && (
              <button
                type="button"
                onClick={() => {
                  onSetKitAsDefault(displayedKit.id);
                  setDefaultSavedToastId(displayedKit.id);
                  setTimeout(() => setDefaultSavedToastId(null), 2000);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-900"
              >
                <BookmarkCheck className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                <span>
                  {defaultSavedToastId === displayedKit.id
                    ? 'Réglages enregistrés par défaut'
                    : 'Définir par défaut'}
                </span>
              </button>
            )}

            {onRestoreKitHistory && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryOpenId((prev) =>
                      prev === displayedKit.id ? null : displayedKit.id,
                    )
                  }
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    Historique ({displayedKit.history.length})
                  </span>
                  {historyOpenId === displayedKit.id ? (
                    <ChevronUp className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  )}
                </button>

                <SmoothDrawer open={historyOpenId === displayedKit.id}>
                  <div className="space-y-1 rounded-md border border-slate-200 bg-white p-1.5">
                    {displayedKit.history.length === 0 ? (
                      <div className="px-1 py-1 text-[10.5px] text-slate-500">
                        Aucune modification sauvegardée pour ce système.
                      </div>
                    ) : (
                      displayedKit.history.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-1.5 rounded bg-slate-50 px-2 py-1 text-[10.5px]"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-800">
                              {entry.label}
                            </div>
                            <div className="font-mono-tabular text-[10px] text-slate-400">
                              Décalage {entry.snapshot.offsetMm.toFixed(1)} · H{' '}
                              {entry.snapshot.guidingHeightMm.toFixed(1)} mm
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreKitHistory(displayedKit.id, entry.id);
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
                </SmoothDrawer>
              </>
            )}

            {onResetKitToFactory && (
              <button
                type="button"
                onClick={() => {
                  onResetKitToFactory(displayedKit.id);
                  setKitMenuOpenId(null);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                Paramètres d&apos;usine
              </button>
            )}

            {!displayedKit.isFactory && onDeleteKit && (
              <button
                type="button"
                onClick={() => {
                  setKitMenuOpenId(null);
                  onDeleteKit(displayedKit.id);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Supprimer ce système
              </button>
            )}
          </div>
        </SmoothDrawer>
      </div>
    );
  };

  const renderSystemGroupCard = (group: DrillingSystemGroup) => {
    const hasSubSystems = group.kits.length > 1;
    const activeSubKit = group.kits.find((k) => k.id === activeKit.id);
    const displayedKit = activeSubKit ?? group.kits[0];

    const isGroupActive = isAssisted
      ? assistedSelectionRevealed && Boolean(activeSubKit)
      : params.mode === 'kit' && Boolean(activeSubKit);
    const effectiveHasSleeve =
      displayedKit.id === activeKit.id
        ? params.hasSleeve
        : displayedKit.userDefaults.hasSleeve;

    const testPrefix = isAssisted ? 'onb' : 'sidebar';
    const isAdvExpanded = !isAssisted && isGroupActive && expandedAdvancedGroupId === group.groupId;

    return (
      <div
        key={group.groupId}
        data-testid={`${testPrefix}-system-${displayedKit.id}`}
        data-system-group={group.groupId}
        className={`relative rounded-xl border transition-all ${
          isGroupActive
            ? 'border-sky-600 bg-sky-50/70'
            : 'border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50/30'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setKitMenuOpenId(null);
            setHistoryOpenId(null);
            onSelectKit(displayedKit.id);
            if (isAssisted) {
              onEnterConfigureStep?.(displayedKit.id);
            } else {
              setExpandedAdvancedGroupId((prev) =>
                prev === group.groupId && isGroupActive ? null : group.groupId,
              );
            }
          }}
          className={`flex w-full items-center justify-between gap-2.5 text-left ${
            isAssisted ? 'p-3.5' : 'p-2.5'
          }`}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="pt-0.5 shrink-0">
              <BrandLogo groupId={group.groupId} size={isAssisted ? 'md' : 'sm'} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`font-bold leading-snug text-slate-900 ${
                    isAssisted ? 'text-sm' : 'text-xs'
                  }`}
                >
                  {group.groupName}
                </span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold tracking-wide ${
                    isAssisted ? 'text-[10px]' : 'text-[9.5px]'
                  } ${
                    group.kind === 'pilot'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {group.kind === 'pilot' ? 'Foret pilote' : 'Forage guidé'}
                </span>
                {hasSubSystems && (
                  <span
                    className={`inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 ${
                      isAssisted ? 'text-[10px]' : 'text-[9.5px]'
                    }`}
                  >
                    {group.kits.length} variantes
                  </span>
                )}
              </div>
              <div
                className={`leading-snug text-slate-500 ${
                  isAssisted ? 'text-[11px]' : 'text-[10.5px]'
                }`}
              >
                {getKitSubtitle(displayedKit, effectiveHasSleeve)}
              </div>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-600">
            {isAssisted ? (
              <>
                <span className="hidden sm:inline">Configurer</span>
                <ChevronRight className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              </>
            ) : (
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                  isAdvExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            )}
          </span>
        </button>

        {/* Advanced Sidebar Step 2 Configuration Drawer (Click-only, no hover reveal) */}
        {!isAssisted && (
          <SmoothDrawer open={isAdvExpanded}>
            {renderIndependentConfigControls(
              group,
              displayedKit,
              effectiveHasSleeve,
              isGroupActive,
              testPrefix,
            )}
          </SmoothDrawer>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Alphabetical Drilling Systems List (No drag-and-drop, no hover reveal) */}
      <div
        className="space-y-1.5"
        data-testid={isAssisted ? 'onb-systems-list' : 'top-kits-list'}
      >
        {alphaGroups.map(renderSystemGroupCard)}
      </div>

      {/* Assistant pied à coulisse directly underneath */}
      <button
        type="button"
        onClick={onOpenCaliperAssistant}
        data-testid={isAssisted ? 'onb-launch-caliper-btn' : 'open-caliper-assistant-btn'}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border text-left transition-colors ${
          !isAssisted && params.mode === 'caliper'
            ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
            : 'border-sky-300 bg-sky-50/70 text-sky-950 hover:bg-sky-100/80'
        } ${isAssisted ? 'px-3.5 py-2.5' : 'px-2.5 py-2'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              !isAssisted && params.mode === 'caliper'
                ? 'bg-white/20 text-white'
                : 'bg-white text-sky-700 border border-sky-200'
            }`}
          >
            <Wrench className="h-3 w-3" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">Assistant pied à coulisse</div>
            <div
              className={`truncate text-[10px] ${
                !isAssisted && params.mode === 'caliper' ? 'text-sky-100' : 'text-sky-700'
              }`}
            >
              Créer mon système implantaire
            </div>
          </div>
        </div>
        <Ruler className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden="true" />
      </button>
    </div>
  );
}
