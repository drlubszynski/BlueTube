import { useState } from 'react';
import {
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
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
  SimulationParams,
  sortKitsByUsage,
} from '../utils/implantGeometry';

interface DrillingSystemsSectionProps {
  variant: 'assisted' | 'advanced';
  params: SimulationParams;
  kits: DrillingKit[];
  activeKit: DrillingKit;
  isSleeveHighlighted?: boolean;
  onSelectKit: (kitId: string) => void;
  onSelectKitSleeve: (kitId: string, hasSleeve: boolean) => void;
  onEditKit: (kitId: string) => void;
  onOpenCaliperAssistant: () => void;
  onSetKitAsDefault?: (kitId: string) => void;
  onRestoreKitHistory?: (kitId: string, historyId: string) => void;
  onResetKitToFactory?: (kitId: string) => void;
  onDeleteKit?: (kitId: string) => void;
}

export function DrillingSystemsSection({
  variant,
  params,
  kits,
  activeKit,
  isSleeveHighlighted = false,
  onSelectKit,
  onSelectKitSleeve,
  onEditKit,
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

  const isAssisted = variant === 'assisted';
  const sortedKits = sortKitsByUsage(kits);
  const topThreeKits = sortedKits.slice(0, 3);
  const extraKits = sortedKits.slice(3);

  const renderKitCard = (kit: DrillingKit) => {
    const isActive =
      (isAssisted || params.mode === 'kit') && kit.id === activeKit.id;
    const isMenuOpen = !isAssisted && kitMenuOpenId === kit.id;
    const isHistoryOpen = !isAssisted && historyOpenId === kit.id;
    const effectiveHasSleeve =
      kit.id === activeKit.id ? params.hasSleeve : kit.userDefaults.hasSleeve;

    const testPrefix = isAssisted ? 'onb' : 'sidebar';

    return (
      <div
        key={kit.id}
        data-testid={`${testPrefix}-system-${kit.id}`}
        className={`relative rounded-xl border transition-colors ${
          isActive
            ? 'border-sky-600 bg-sky-50/70'
            : 'border-slate-200 bg-white hover:border-sky-400'
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
              setKitMenuOpenId(null);
              setHistoryOpenId(null);
              onSelectKit(kit.id);
            }}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            {isAssisted && (
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  isActive ? 'text-sky-600' : 'text-slate-300'
                }`}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 space-y-1">
              <div
                className={`font-bold leading-snug text-slate-900 ${
                  isAssisted ? 'text-sm' : 'text-xs'
                }`}
              >
                {kit.name}
              </div>
              <div>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold tracking-wide ${
                    isAssisted ? 'text-[10px]' : 'text-[9.5px]'
                  } ${
                    kit.kind === 'pilot'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {kit.kind === 'pilot' ? 'Foret pilote' : 'Forage guidé'}
                </span>
              </div>
              <div
                className={`leading-snug text-slate-500 ${
                  isAssisted ? 'text-[11px]' : 'text-[10.5px]'
                }`}
              >
                {kit.kind === 'pilot'
                  ? 'Compatible : Tous implants (Bibliothèque)'
                  : kit.implantBrandName && kit.implantModelName
                    ? `Compatible : ${kit.implantBrandName} · ${kit.implantModelName}`
                    : kit.brandLabel}
              </div>
            </div>
          </button>

          {/* Actions right cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAssisted && (
              <div
                role="group"
                aria-label={`Douille pour ${kit.name}`}
                className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold"
              >
                <button
                  type="button"
                  onClick={() => onSelectKitSleeve(kit.id, true)}
                  data-testid={`onb-sleeve-with-${kit.id}`}
                  className={`rounded-md px-2.5 py-1 whitespace-nowrap transition-colors ${
                    effectiveHasSleeve
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Avec douille
                </button>
                <button
                  type="button"
                  onClick={() => onSelectKitSleeve(kit.id, false)}
                  data-testid={`onb-sleeve-without-${kit.id}`}
                  className={`rounded-md px-2.5 py-1 whitespace-nowrap transition-colors ${
                    !effectiveHasSleeve
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sans douille
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setKitMenuOpenId(null);
                setHistoryOpenId(null);
                onEditKit(kit.id);
              }}
              data-testid={`${testPrefix}-edit-${kit.id}`}
              aria-label={`Modifier ${kit.name} au pied à coulisse`}
              title={`Modifier ${kit.name} au pied à coulisse`}
              className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-500 hover:text-sky-700 ${
                isAssisted ? 'h-7 gap-1 px-2 text-[11px] font-medium' : 'h-6 w-6'
              }`}
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              {isAssisted && <span className="hidden md:inline">Modifier</span>}
            </button>

            {!isAssisted && isActive && (
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

        {/* Compact Sidebar Sleeve Segmented Switch directly synced with Onboarding */}
        {!isAssisted && (
          <div className="px-2.5 pb-2">
            <div
              role="group"
              aria-label={`Douille pour ${kit.name}`}
              className={`grid grid-cols-2 gap-1 rounded-md border bg-slate-100 p-0.5 text-[10.5px] font-semibold ${
                isActive && isSleeveHighlighted
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
        )}

        {/* Advanced-only System Context Menu (Defaults / History / Factory / Delete) */}
        {!isAssisted && isActive && isMenuOpen && (
          <div
            data-testid="active-kit-menu"
            className="space-y-1 rounded-b-lg border-t border-sky-200/80 bg-white/95 px-2 py-2 text-xs"
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

            {onSetKitAsDefault && (
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
            )}

            {onRestoreKitHistory && (
              <>
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
              </>
            )}

            {onResetKitToFactory && (
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
            )}

            {!kit.isFactory && onDeleteKit && (
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
    <div className="space-y-2">
      {/* Top 3 Most Used Systems */}
      <div
        className="space-y-1.5"
        data-testid={isAssisted ? 'onb-systems-list' : 'top-kits-list'}
      >
        {topThreeKits.map((kit) => renderKitCard(kit))}
      </div>

      {/* Closed Library Drawer (Synchronized structure in both Mode assisté & Mode avancé) */}
      <div>
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          data-testid={isAssisted ? 'onb-more-systems-btn' : 'extra-kits-drawer-toggle'}
          className={`flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 transition-colors hover:border-sky-400 hover:text-slate-900 ${
            isAssisted ? 'px-3.5 py-2 text-xs' : 'px-2.5 py-1.5 text-[11px]'
          }`}
        >
          <span className="truncate">
            Bibliothèque systèmes de forage ({extraKits.length})
          </span>
          {drawerOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          )}
        </button>

        {drawerOpen && (
          <div
            data-testid={isAssisted ? 'onb-extra-systems-drawer' : 'extra-kits-drawer'}
            className="mt-1.5 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2"
          >
            {extraKits.length === 0 ? (
              <p className="px-2 py-1 text-center text-[11px] text-slate-500">
                Tous vos systèmes enregistrés localement figurent déjà dans le Top 3.
              </p>
            ) : (
              extraKits.map((kit) => renderKitCard(kit))
            )}
          </div>
        )}
      </div>

      {/* Assistant pied à coulisse directly underneath the closed library drawer */}
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
