import { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Lock, Pencil, X } from 'lucide-react';
import {
  CustomImplantSystem,
  DrillingKit,
  SimulationParams,
  formatMetricMm,
  groupLibraryByBrand,
  isImplantModelCompatibleWithKit,
} from '../utils/implantGeometry';
import { BrandLogo } from './BrandLogo';
import { SmoothDrawer } from './SmoothDrawer';

interface LibraryModalProps {
  open: boolean;
  kits: DrillingKit[];
  customImplants: CustomImplantSystem[];
  activeKit: DrillingKit;
  params: SimulationParams;
  onClose: () => void;
  onSelectKit: (kitId: string) => void;
  onSelectImplantModel: (model: CustomImplantSystem) => void;
  onEditKit: (kitId: string) => void;
}

export function LibraryModal({
  open,
  kits,
  customImplants,
  activeKit,
  params,
  onClose,
  onSelectKit,
  onSelectImplantModel,
  onEditKit,
}: LibraryModalProps) {
  const [expandedBrandKey, setExpandedBrandKey] = useState<string | null>(null);
  const [openSubDrawers, setOpenSubDrawers] = useState<
    Record<string, { drilling: boolean; implants: boolean }>
  >({});

  if (!open) return null;

  const brandGroups = groupLibraryByBrand(kits, customImplants);

  const toggleBrand = (brandKey: string) => {
    setExpandedBrandKey((prev) => (prev === brandKey ? null : brandKey));
    setOpenSubDrawers((prev) =>
      prev[brandKey]
        ? prev
        : { ...prev, [brandKey]: { drilling: true, implants: true } },
    );
  };

  const toggleSubDrawer = (brandKey: string, sub: 'drilling' | 'implants') => {
    setOpenSubDrawers((prev) => {
      const cur = prev[brandKey] ?? { drilling: true, implants: true };
      return {
        ...prev,
        [brandKey]: { ...cur, [sub]: !cur[sub] },
      };
    });
  };

  return (
    <div
      data-testid="library-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Bibliothèque des systèmes de forage et implants"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 pt-10 backdrop-blur-xs sm:p-6 sm:pt-14"
      onClick={onClose}
    >
      <div
        data-testid="library-modal"
        onClick={(e) => e.stopPropagation()}
        className="bsp-panel w-full max-w-3xl overflow-hidden rounded-2xl border shadow-2xl"
      >
        {/* Header */}
        <div className="bsp-section-header flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">
                Bibliothèque — Marques, Systèmes de forage &amp; Implants
              </h2>
              <p className="truncate text-[11px] text-slate-500">
                Tri alphabétique par défaut · Tiroir 1 : Systèmes de forage · Tiroir 2 : Implants
                {activeKit.kind === 'guided' ? ` (Compatibilité stricte : ${activeKit.name})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="library-close-btn"
            aria-label="Fermer la bibliothèque"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Alphabetical Brand Buttons List */}
        <div className="max-h-[75vh] space-y-2.5 overflow-y-auto p-4 sm:p-5">
          {brandGroups.map((brand) => {
            const isBrandOpen = expandedBrandKey === brand.brandKey;
            const subState = openSubDrawers[brand.brandKey] ?? {
              drilling: true,
              implants: true,
            };

            const brandActiveKitInside = brand.drillingSystems.some((sys) =>
              sys.kits.some((k) => k.id === activeKit.id),
            );

            // Strict compatibility rule for guided kits: only display/allow compatible implants for active guided kit
            const visibleImplants =
              activeKit.kind === 'guided'
                ? brand.implants.filter((imp) => isImplantModelCompatibleWithKit(imp, activeKit))
                : brand.implants;

            return (
              <div
                key={brand.brandKey}
                data-testid={`library-brand-${brand.brandKey}`}
                className={`rounded-xl border transition-colors ${
                  brandActiveKitInside
                    ? 'border-sky-500 bg-sky-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Brand Button with Logo (Ergonomic Mode assisté style) */}
                <button
                  type="button"
                  onClick={() => toggleBrand(brand.brandKey)}
                  aria-expanded={isBrandOpen}
                  data-testid={`library-brand-btn-${brand.brandKey}`}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-sky-50/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandLogo groupId={brand.logoGroupId} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {brand.brandName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {brand.drillingSystems.length} système
                        {brand.drillingSystems.length > 1 ? 's' : ''} de forage ·{' '}
                        {brand.implants.length} gamme{brand.implants.length > 1 ? 's' : ''} implantaire
                        {brand.implants.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      isBrandOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Main Brand Drawer -> Sub-Drawer 1 (Drilling Systems) + Sub-Drawer 2 (Implants) */}
                <SmoothDrawer
                  open={isBrandOpen}
                  data-testid={`library-brand-drawer-${brand.brandKey}`}
                >
                  <div className="space-y-2.5 border-t border-slate-200 p-3 sm:p-3.5">
                    {/* Sub-Drawer 1: Systèmes de forage */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70">
                      <button
                        type="button"
                        onClick={() => toggleSubDrawer(brand.brandKey, 'drilling')}
                        aria-expanded={subState.drilling}
                        data-testid={`library-subdrawer-drilling-${brand.brandKey}`}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70"
                      >
                        <span className="flex items-center gap-1.5">
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-sky-600 transition-transform duration-200 ${
                              subState.drilling ? 'rotate-90' : ''
                            }`}
                            aria-hidden="true"
                          />
                          Tiroir 1 : Systèmes de forage ({brand.drillingSystems.length})
                        </span>
                      </button>

                      <SmoothDrawer open={subState.drilling}>
                        <div className="space-y-1.5 border-t border-slate-200/80 p-2.5">
                          {brand.drillingSystems.length === 0 ? (
                            <p className="px-2 py-1 text-[11px] text-slate-500">
                              Aucun système de forage pour cette marque.
                            </p>
                          ) : (
                            brand.drillingSystems.map((sysGroup) => {
                              const currentSub =
                                sysGroup.kits.find((k) => k.id === activeKit.id) ??
                                sysGroup.kits[0];
                              const isActiveSys = sysGroup.kits.some((k) => k.id === activeKit.id);
                              return (
                                <div
                                  key={sysGroup.groupId}
                                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 ${
                                    isActiveSys
                                      ? 'border-sky-600 bg-sky-50/80'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectKit(currentSub.id);
                                      onClose();
                                    }}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs font-bold text-slate-900">
                                        {sysGroup.groupName}
                                      </span>
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold ${
                                          sysGroup.kind === 'pilot'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-sky-100 text-sky-800'
                                        }`}
                                      >
                                        {sysGroup.kind === 'pilot' ? 'Foret pilote' : 'Forage guidé'}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 text-[10.5px] text-slate-500">
                                      Offset {currentSub.userDefaults.offsetMm.toFixed(1)} mm · H{' '}
                                      {currentSub.userDefaults.guidingHeightMm.toFixed(1)} mm · Ø
                                      partie guidante {currentSub.userDefaults.guidingDiameterMm.toFixed(2)} mm
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onEditKit(currentSub.id);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
                                    >
                                      <Pencil className="h-3 w-3" aria-hidden="true" />
                                      Mesures
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectKit(currentSub.id);
                                        onClose();
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-[10.5px] font-semibold text-white hover:bg-sky-700"
                                    >
                                      {isActiveSys ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                          Actif
                                        </>
                                      ) : (
                                        'Sélectionner'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </SmoothDrawer>
                    </div>

                    {/* Sub-Drawer 2: Implants */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70">
                      <button
                        type="button"
                        onClick={() => toggleSubDrawer(brand.brandKey, 'implants')}
                        aria-expanded={subState.implants}
                        data-testid={`library-subdrawer-implants-${brand.brandKey}`}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70"
                      >
                        <span className="flex items-center gap-1.5">
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-sky-600 transition-transform duration-200 ${
                              subState.implants ? 'rotate-90' : ''
                            }`}
                            aria-hidden="true"
                          />
                          Tiroir 2 : Implants ({visibleImplants.length})
                        </span>
                      </button>

                      <SmoothDrawer open={subState.implants}>
                        <div className="space-y-1.5 border-t border-slate-200/80 p-2.5">
                          {visibleImplants.length === 0 ? (
                            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-500">
                              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                              <span>
                                Aucun implant de {brand.brandName} n&apos;est compatible avec la trousse guidée active ({activeKit.name}). Sélectionnez d&apos;abord une trousse compatible ci-dessus.
                              </span>
                            </div>
                          ) : (
                            visibleImplants.map((imp) => {
                              const isImpSelected = params.customImplantId === imp.id;
                              const compatibleDias =
                                activeKit.kind === 'guided'
                                  ? imp.diametersMm.filter((d) =>
                                      activeKit.userDefaults.implantDiametersMm.some(
                                        (kd) => Math.abs(kd - d) < 0.05,
                                      ),
                                    )
                                  : imp.diametersMm;
                              const compatibleLens =
                                activeKit.kind === 'guided'
                                  ? imp.lengthsMm.filter((l) =>
                                      activeKit.userDefaults.implantLengthsMm.some(
                                        (kl) => Math.abs(kl - l) < 0.05,
                                      ),
                                    )
                                  : imp.lengthsMm;
                              return (
                                <button
                                  key={imp.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectImplantModel(imp);
                                    onClose();
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                                    isImpSelected
                                      ? 'border-sky-600 bg-sky-50/80'
                                      : 'border-slate-200 bg-white hover:border-sky-400'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900">
                                      {imp.brand} — {imp.model}
                                    </div>
                                    <div className="font-mono-tabular mt-0.5 text-[10.5px] text-slate-500">
                                      Ø {(compatibleDias.length > 0 ? compatibleDias : imp.diametersMm).map((d) => formatMetricMm(d)).join(' · ')} mm | L{' '}
                                      {(compatibleLens.length > 0 ? compatibleLens : imp.lengthsMm)
                                        .map((l) => (Number.isInteger(l) ? l.toFixed(0) : l.toFixed(1)))
                                        .join(' · ')}{' '}
                                      mm
                                    </div>
                                  </div>
                                  <span className="shrink-0 rounded-md bg-sky-600 px-2.5 py-1 text-[10.5px] font-semibold text-white">
                                    {isImpSelected ? 'Actif' : 'Choisir'}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </SmoothDrawer>
                    </div>
                  </div>
                </SmoothDrawer>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
