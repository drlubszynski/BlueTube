import { useRef, useState } from 'react';
import {
  ArrowRight,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  GripVertical,
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
  DrillingSystemsLayout,
  SimulationParams,
  reorderDrillingSystemGroups,
  resolveDrillingSystemsLayout,
} from '../utils/implantGeometry';

interface DrillingSystemsSectionProps {
  variant: 'assisted' | 'advanced';
  params: SimulationParams;
  kits: DrillingKit[];
  drillingLayout?: DrillingSystemsLayout | null;
  activeKit: DrillingKit;
  assistedSelectionRevealed?: boolean;
  isSleeveHighlighted?: boolean;
  onSelectKit: (kitId: string) => void;
  onSelectKitSleeve: (kitId: string, hasSleeve: boolean) => void;
  onChangeDrillingLayout?: (layout: DrillingSystemsLayout | null) => void;
  onEditKit: (kitId: string) => void;
  onContinueToImplant?: (kitId: string) => void;
  onOpenCaliperAssistant: () => void;
  onSetKitAsDefault?: (kitId: string) => void;
  onRestoreKitHistory?: (kitId: string, historyId: string) => void;
  onResetKitToFactory?: (kitId: string) => void;
  onDeleteKit?: (kitId: string) => void;
}

interface ActiveDragState {
  groupId: string;
  groupName: string;
  sourceZone: 'main' | 'library';
  clientX: number;
  clientY: number;
}

interface DropTargetState {
  zone: 'main' | 'library';
  index: number;
  overLibraryButton: boolean;
}

function BrandLogo({ groupId }: { groupId: string }) {
  if (groupId === 'biotech-kontact') {
    return (
      <span
        data-testid="brand-logo-biotech-kontact"
        title="Biotech Dental"
        className="inline-flex shrink-0 items-center gap-1 rounded border border-sky-200/80 bg-sky-50/90 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-tight text-sky-800"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <polygon points="10,1.5 17.5,5.8 17.5,14.2 10,18.5 2.5,14.2 2.5,5.8" fill="#0284c7" />
          <path d="M7.2 6.2h3.4a2 2 0 0 1 0 3.8H7.2zm0 3.8h3.7a2.1 2.1 0 0 1 0 4.1H7.2z" fill="#ffffff" />
        </svg>
        <span>BD</span>
      </span>
    );
  }
  if (groupId === 'globald-pilot') {
    return (
      <span
        data-testid="brand-logo-globald-pilot"
        title="Global D"
        className="inline-flex shrink-0 items-center gap-1 rounded border border-rose-200/80 bg-slate-900 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-tight text-white"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="#0f172a" stroke="#e11d48" strokeWidth="2.2" />
          <path d="M10 4.2a5.8 5.8 0 1 0 5.5 7.6h-4.2v-1.8h6.2" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <span>GD</span>
      </span>
    );
  }
  if (groupId === 'mis-mguide') {
    return (
      <span
        data-testid="brand-logo-mis-mguide"
        title="MIS · Dentsply Sirona"
        className="inline-flex shrink-0 items-center gap-1 rounded border border-sky-200/80 bg-sky-900 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-tight text-white"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <rect x="2" y="2" width="16" height="16" rx="3.5" fill="#0369a1" />
          <path d="M5 13.5V6.8l2.8 3.6 2.8-3.6v6.7M14.5 6.8v6.7" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>MIS</span>
      </span>
    );
  }
  return null;
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
  drillingLayout = null,
  activeKit,
  assistedSelectionRevealed = true,
  isSleeveHighlighted = false,
  onSelectKit,
  onSelectKitSleeve,
  onChangeDrillingLayout,
  onEditKit,
  onContinueToImplant,
  onOpenCaliperAssistant,
  onSetKitAsDefault,
  onRestoreKitHistory,
  onResetKitToFactory,
  onDeleteKit,
}: DrillingSystemsSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kitMenuOpenId, setKitMenuOpenId] = useState<string | null>(null);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [defaultSavedToastId, setDefaultSavedToastId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);

  const mainListRef = useRef<HTMLDivElement | null>(null);
  const libraryBtnRef = useRef<HTMLButtonElement | null>(null);
  const libraryDrawerRef = useRef<HTMLDivElement | null>(null);
  const mainCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const libraryCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const suppressNextClickRef = useRef(false);

  const isAssisted = variant === 'assisted';
  const { mainGroups, libraryGroups } = resolveDrillingSystemsLayout(kits, drillingLayout);

  const computeDropTarget = (
    clientX: number,
    clientY: number,
  ): DropTargetState => {
    const drawerEl = libraryDrawerRef.current;
    if (drawerOpen && drawerEl) {
      const drawerRect = drawerEl.getBoundingClientRect();
      if (
        clientY >= drawerRect.top - 4 &&
        clientY <= drawerRect.bottom + 12 &&
        clientX >= drawerRect.left - 12 &&
        clientX <= drawerRect.right + 12
      ) {
        let index = libraryGroups.length;
        for (let i = 0; i < libraryGroups.length; i++) {
          const card = libraryCardRefs.current.get(libraryGroups[i].groupId);
          if (!card) continue;
          const r = card.getBoundingClientRect();
          if (clientY < r.top + r.height / 2) {
            index = i;
            break;
          }
        }
        return { zone: 'library', index, overLibraryButton: false };
      }
    }

    const btnEl = libraryBtnRef.current;
    if (btnEl) {
      const btnRect = btnEl.getBoundingClientRect();
      if (
        clientY >= btnRect.top - 4 &&
        clientY <= btnRect.bottom + 6 &&
        clientX >= btnRect.left - 12 &&
        clientX <= btnRect.right + 12
      ) {
        return {
          zone: 'library',
          index: libraryGroups.length,
          overLibraryButton: true,
        };
      }
      if (drawerOpen && clientY > btnRect.bottom) {
        return {
          zone: 'library',
          index: libraryGroups.length,
          overLibraryButton: false,
        };
      }
    }

    let mainIndex = mainGroups.length;
    for (let i = 0; i < mainGroups.length; i++) {
      const card = mainCardRefs.current.get(mainGroups[i].groupId);
      if (!card) continue;
      const r = card.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) {
        mainIndex = i;
        break;
      }
    }
    return { zone: 'main', index: mainIndex, overLibraryButton: false };
  };

  const handleCardPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    group: DrillingSystemGroup,
    sourceZone: 'main' | 'library',
  ) => {
    if (e.button !== 0 || !onChangeDrillingLayout) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('[data-no-drag="true"]')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;
    const currentMainIds = mainGroups.map((g) => g.groupId);
    const currentLibraryIds = libraryGroups.map((g) => g.groupId);

    const handleMove = (ev: PointerEvent) => {
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
        started = true;
        suppressNextClickRef.current = true;
        setKitMenuOpenId(null);
        setHistoryOpenId(null);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }
      const nextTarget = computeDropTarget(ev.clientX, ev.clientY);
      setDragState({
        groupId: group.groupId,
        groupName: group.groupName,
        sourceZone,
        clientX: ev.clientX,
        clientY: ev.clientY,
      });
      setDropTarget(nextTarget);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const handleUp = (ev: PointerEvent) => {
      cleanup();
      if (started) {
        const finalTarget = computeDropTarget(ev.clientX, ev.clientY);
        const nextLayout = reorderDrillingSystemGroups(
          currentMainIds,
          currentLibraryIds,
          group.groupId,
          finalTarget.zone,
          finalTarget.index,
        );
        onChangeDrillingLayout(nextLayout);
        setDragState(null);
        setDropTarget(null);
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 80);
      }
    };

    const handleCancel = () => {
      cleanup();
      setDragState(null);
      setDropTarget(null);
      suppressNextClickRef.current = false;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const renderToggleButtons = (
    group: DrillingSystemGroup,
    displayedKit: DrillingKit,
    effectiveHasSleeve: boolean,
    isGroupActive: boolean,
    testPrefix: string,
    compactSidebar: boolean,
  ) => {
    const hasSubSystems = group.kits.length > 1;
    const primarySubKit = group.kits[0];
    const alternateSubKit = group.kits[1];
    const isPrimarySubSelected = displayedKit.id === primarySubKit.id;
    const nextSubKit = isPrimarySubSelected ? alternateSubKit : primarySubKit;

    return (
      <>
        {hasSubSystems && nextSubKit && (
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              setKitMenuOpenId(null);
              setHistoryOpenId(null);
              onSelectKit(nextSubKit.id);
            }}
            data-testid={`${testPrefix}-subsystem-toggle-${group.groupId}`}
            aria-pressed={isPrimarySubSelected}
            title={`Basculer entre ${primarySubKit.subSystemLabel ?? primarySubKit.name} et ${alternateSubKit.subSystemLabel ?? alternateSubKit.name}`}
            className={`rounded-md border font-semibold whitespace-nowrap transition-colors ${
              compactSidebar ? 'flex-1 px-2 py-1 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'
            } ${
              isPrimarySubSelected
                ? 'border-sky-600 bg-sky-600 text-white shadow-xs hover:bg-sky-700'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            {displayedKit.subSystemLabel ?? displayedKit.name}
          </button>
        )}

        <button
          type="button"
          data-no-drag="true"
          onClick={(e) => {
            e.stopPropagation();
            setKitMenuOpenId(null);
            onSelectKitSleeve(displayedKit.id, !effectiveHasSleeve);
          }}
          data-testid={`${testPrefix}-sleeve-toggle-${displayedKit.id}`}
          aria-pressed={effectiveHasSleeve}
          title={
            effectiveHasSleeve
              ? 'Actuellement avec douille — cliquer pour passer sans douille'
              : 'Actuellement sans douille — cliquer pour activer avec douille'
          }
          className={`rounded-md border font-semibold whitespace-nowrap transition-colors ${
            compactSidebar ? 'flex-1 px-2 py-1 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'
          } ${
            effectiveHasSleeve
              ? 'border-sky-600 bg-sky-600 text-white shadow-xs hover:bg-sky-700'
              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
          } ${isGroupActive && isSleeveHighlighted ? 'param-highlight-ring' : ''}`}
        >
          {effectiveHasSleeve ? 'Avec douille' : 'Sans douille'}
        </button>
      </>
    );
  };

  const renderSystemGroupCard = (
    group: DrillingSystemGroup,
    zone: 'main' | 'library',
  ) => {
    const hasSubSystems = group.kits.length > 1;
    const activeSubKit = group.kits.find((k) => k.id === activeKit.id);
    const displayedKit = activeSubKit ?? group.kits[0];

    const isGroupActive = isAssisted
      ? assistedSelectionRevealed && Boolean(activeSubKit)
      : params.mode === 'kit' && Boolean(activeSubKit);
    const isMenuOpen = !isAssisted && kitMenuOpenId === displayedKit.id;
    const isHistoryOpen = !isAssisted && historyOpenId === displayedKit.id;
    const effectiveHasSleeve =
      displayedKit.id === activeKit.id
        ? params.hasSleeve
        : displayedKit.userDefaults.hasSleeve;
    const showSubtitle = !isAssisted || group.kind === 'pilot';
    const isBeingDragged = dragState?.groupId === group.groupId;

    const testPrefix = isAssisted ? 'onb' : 'sidebar';
    const cardRefMap = zone === 'main' ? mainCardRefs.current : libraryCardRefs.current;

    return (
      <div
        key={group.groupId}
        ref={(el) => {
          if (el) cardRefMap.set(group.groupId, el);
          else cardRefMap.delete(group.groupId);
        }}
        onPointerDown={(e) => handleCardPointerDown(e, group, zone)}
        data-testid={`${testPrefix}-system-${displayedKit.id}`}
        data-system-group={group.groupId}
        data-system-zone={zone}
        className={`group/kit relative rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
          isBeingDragged ? 'opacity-45 scale-[0.99] border-sky-400 border-dashed' : ''
        } ${
          isGroupActive
            ? 'border-sky-600 bg-sky-50/70'
            : 'border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50/30'
        }`}
      >
        <div
          className={`flex items-start justify-between gap-2 ${
            isAssisted ? 'flex-col sm:flex-row sm:items-center p-3' : 'p-2.5'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (suppressNextClickRef.current) return;
              setKitMenuOpenId(null);
              setHistoryOpenId(null);
              onSelectKit(displayedKit.id);
            }}
            className="flex min-w-0 flex-1 items-start gap-2 text-left cursor-grab active:cursor-grabbing"
          >
            <GripVertical
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover/kit:text-sky-500"
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`font-bold leading-snug text-slate-900 ${
                    isAssisted ? 'text-sm' : 'text-xs'
                  }`}
                >
                  {group.groupName}
                </span>
                <BrandLogo groupId={group.groupId} />
              </div>
              <div className="flex flex-wrap items-center gap-1">
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
                    {group.kits.length} sous-systèmes
                  </span>
                )}
              </div>
              {showSubtitle && (
                <div
                  className={`leading-snug text-slate-500 ${
                    isAssisted ? 'text-[11px]' : 'text-[10.5px]'
                  }`}
                >
                  {getKitSubtitle(displayedKit, effectiveHasSleeve)}
                </div>
              )}
            </div>
          </button>

          {/* Actions right cluster: revealed on mouse hover (or active/focus) in Mode assisté */}
          <div
            data-no-drag="true"
            data-testid={isAssisted ? `onb-actions-${group.groupId}` : undefined}
            className={
              isAssisted
                ? `flex-wrap items-center gap-1.5 shrink-0 transition-opacity duration-150 ${
                    isGroupActive
                      ? 'flex opacity-100 pointer-events-auto'
                      : 'hidden group-hover/kit:flex group-focus-within/kit:flex sm:flex sm:opacity-0 sm:pointer-events-none sm:group-hover/kit:opacity-100 sm:group-hover/kit:pointer-events-auto sm:group-focus-within/kit:opacity-100 sm:group-focus-within/kit:pointer-events-auto'
                  }`
                : 'flex flex-wrap items-center gap-1.5 shrink-0'
            }
          >
            {isAssisted &&
              renderToggleButtons(
                group,
                displayedKit,
                effectiveHasSleeve,
                isGroupActive,
                testPrefix,
                false,
              )}

            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                setKitMenuOpenId(null);
                setHistoryOpenId(null);
                onEditKit(displayedKit.id);
              }}
              data-testid={`${testPrefix}-edit-${displayedKit.id}`}
              aria-label={`Modifier ${displayedKit.name} au pied à coulisse`}
              title={`Modifier ${displayedKit.name} au pied à coulisse`}
              className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-500 hover:text-sky-700 ${
                isAssisted ? 'h-7 gap-1 px-2 text-[11px] font-medium' : 'h-6 w-6'
              }`}
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              {isAssisted && <span className="hidden md:inline">Modifier</span>}
            </button>

            {isAssisted && onContinueToImplant && (
              <button
                type="button"
                data-no-drag="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setKitMenuOpenId(null);
                  setHistoryOpenId(null);
                  onContinueToImplant(displayedKit.id);
                }}
                data-testid={`onb-continue-${displayedKit.id}`}
                className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-[11px] font-semibold text-white shadow-xs transition-colors hover:bg-sky-700"
              >
                <span>Continuer vers l’implant</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {!isAssisted && isGroupActive && (
              <button
                type="button"
                data-no-drag="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setKitMenuOpenId((prev) =>
                    prev === displayedKit.id ? null : displayedKit.id,
                  );
                  setHistoryOpenId(null);
                }}
                aria-label={`Menu du système ${displayedKit.name}`}
                aria-expanded={isMenuOpen}
                title="Options (Défaut / Historique / Usine)"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Sidebar Row: Sub-system Toggle (Narrow/Standard) + Single Sleeve Toggle (Avec/Sans douille) */}
        {!isAssisted && (
          <div data-no-drag="true" className="flex items-center gap-1.5 px-2.5 pb-2">
            {renderToggleButtons(
              group,
              displayedKit,
              effectiveHasSleeve,
              isGroupActive,
              testPrefix,
              true,
            )}
          </div>
        )}

        {/* Advanced-only System Context Menu (Defaults / History / Factory / Delete) */}
        {!isAssisted && isGroupActive && isMenuOpen && (
          <div
            data-no-drag="true"
            data-testid="active-kit-menu"
            className="space-y-1 rounded-b-lg border-t border-sky-200/80 bg-white/95 px-2 py-2 text-xs"
          >
            <button
              type="button"
              onClick={() => {
                setKitMenuOpenId(null);
                onEditKit(displayedKit.id);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-900"
            >
              <Pencil className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              <span>Modifier au pied à coulisse</span>
            </button>

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
                  {isHistoryOpen ? (
                    <ChevronUp className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  )}
                </button>

                {isHistoryOpen && (
                  <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-1.5">
                    {displayedKit.history.length === 0 ? (
                      <div className="px-1 py-1 text-[10.5px] text-slate-500">
                        Aucune modification sauvegardée pour ce système.
                      </div>
                    ) : (
                      displayedKit.history.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-1.5 rounded bg-white px-2 py-1 text-[10.5px]"
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
                )}
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
        )}
      </div>
    );
  };

  const showMainDropLine = (index: number) =>
    Boolean(dragState && dropTarget?.zone === 'main' && dropTarget.index === index);

  const showLibraryDropLine = (index: number) =>
    Boolean(
      dragState &&
        dropTarget?.zone === 'library' &&
        !dropTarget.overLibraryButton &&
        dropTarget.index === index,
    );

  return (
    <div className="space-y-2">
      {/* Main Regular Drilling Systems (3 shown by default in alphabetical order, draggable to reorder or archive) */}
      <div
        ref={mainListRef}
        className="space-y-1.5"
        data-testid={isAssisted ? 'onb-systems-list' : 'top-kits-list'}
      >
        {mainGroups.length === 0 ? (
          <div
            data-testid={`${isAssisted ? 'onb' : 'sidebar'}-empty-main-dropzone`}
            className={`rounded-xl border-2 border-dashed px-3 py-4 text-center text-[11px] transition-colors ${
              dragState && dropTarget?.zone === 'main'
                ? 'border-sky-500 bg-sky-50/70 text-sky-800 font-semibold'
                : 'border-slate-200 bg-slate-50/50 text-slate-500'
            }`}
          >
            Aucun système affiché ici — glissez un système depuis la bibliothèque ci-dessous.
          </div>
        ) : (
          mainGroups.map((group, idx) => (
            <div key={group.groupId} className="space-y-1.5">
              {showMainDropLine(idx) && (
                <div
                  data-testid="drag-drop-line-main"
                  className="mx-1 h-0.5 rounded-full bg-sky-500 shadow-xs"
                />
              )}
              {renderSystemGroupCard(group, 'main')}
            </div>
          ))
        )}
        {mainGroups.length > 0 && showMainDropLine(mainGroups.length) && (
          <div
            data-testid="drag-drop-line-main-end"
            className="mx-1 h-0.5 rounded-full bg-sky-500 shadow-xs"
          />
        )}
      </div>

      {/* Collapsible Library Drawer ("Bibliothèque de systèmes de forage") + Archive Drop Target */}
      <div>
        <button
          ref={libraryBtnRef}
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          data-testid={isAssisted ? 'onb-more-systems-btn' : 'extra-kits-drawer-toggle'}
          className={`flex w-full items-center justify-between rounded-lg border font-semibold transition-all ${
            isAssisted ? 'px-3.5 py-2 text-xs' : 'px-2.5 py-1.5 text-[11px]'
          } ${
            dragState && dropTarget?.zone === 'library' && dropTarget.overLibraryButton
              ? 'border-sky-500 bg-sky-100/90 text-sky-900 ring-2 ring-sky-400/40'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 hover:text-slate-900'
          }`}
        >
          <span className="truncate">
            {dragState && dropTarget?.zone === 'library' && dropTarget.overLibraryButton
              ? 'Déposer ici pour archiver dans la bibliothèque'
              : `Bibliothèque de systèmes de forage (${libraryGroups.length})`}
          </span>
          {drawerOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          )}
        </button>

        {drawerOpen && (
          <div
            ref={libraryDrawerRef}
            data-testid={isAssisted ? 'onb-extra-systems-drawer' : 'extra-kits-drawer'}
            className={`mt-1.5 space-y-1.5 rounded-xl border p-2 transition-colors ${
              dragState && dropTarget?.zone === 'library'
                ? 'border-sky-400 bg-sky-50/60'
                : 'border-slate-200 bg-slate-50/70'
            }`}
          >
            {libraryGroups.length === 0 ? (
              <p className="px-2 py-2 text-center text-[11px] text-slate-500">
                Aucun système archivé — glissez un système ici pour l’archiver.
              </p>
            ) : (
              libraryGroups.map((group, idx) => (
                <div key={group.groupId} className="space-y-1.5">
                  {showLibraryDropLine(idx) && (
                    <div
                      data-testid="drag-drop-line-library"
                      className="mx-1 h-0.5 rounded-full bg-sky-500 shadow-xs"
                    />
                  )}
                  {renderSystemGroupCard(group, 'library')}
                </div>
              ))
            )}
            {libraryGroups.length > 0 && showLibraryDropLine(libraryGroups.length) && (
              <div
                data-testid="drag-drop-line-library-end"
                className="mx-1 h-0.5 rounded-full bg-sky-500 shadow-xs"
              />
            )}
          </div>
        )}
      </div>

      {/* Assistant pied à coulisse directly underneath the library button */}
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

      {/* Floating Drag Ghost Badge */}
      {dragState && (
        <div
          aria-hidden="true"
          style={{
            left: dragState.clientX + 12,
            top: dragState.clientY + 10,
          }}
          className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-lg border border-sky-500 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-lg"
        >
          <GripVertical className="h-3.5 w-3.5 text-sky-600" />
          <span>{dragState.groupName}</span>
        </div>
      )}
    </div>
  );
}
