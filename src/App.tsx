import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Info,
  Moon,
  Printer,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { BlueSkyTubePanel } from './components/BlueSkyTubePanel';
import { CaliperWizard } from './components/CaliperWizard';
import { ClinicalTelemetryBar } from './components/ClinicalTelemetryBar';
import { ControlSidebar } from './components/ControlSidebar';
import { FreeImplantWizard } from './components/FreeImplantWizard';
import { GlobalDComparator } from './components/GlobalDComparator';
import { OnboardingFlow } from './components/OnboardingFlow';
import { SurgicalDiagram2D } from './components/SurgicalDiagram2D';
import {
  CustomImplantSystem,
  DEFAULT_SIMULATION_PARAMS,
  DEFAULT_VISIBILITY_FILTERS,
  DiagramElementFocus,
  DrillingKit,
  KitParameterSnapshot,
  ResettableParamKey,
  SimulationParams,
  VisibilityFilters,
  computeImplantGeometry,
  getDefaultParamPatch,
  loadCustomImplantSystemsFromStorage,
  loadDrillingKitsFromStorage,
  paramsPatchFromSnapshot,
  pickOptimalGuidedOffset,
  pickOptimalPilotLength,
  roundTo,
  saveCustomImplantSystemsToStorage,
  saveDrillingKitsToStorage,
  snapshotFromParams,
} from './utils/implantGeometry';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [bspTheme, setBspTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem('orthoguide_bsp_theme_v1');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [kits, setKits] = useState<DrillingKit[]>(() => loadDrillingKitsFromStorage());
  const [customImplants, setCustomImplants] = useState<CustomImplantSystem[]>(() =>
    loadCustomImplantSystemsFromStorage(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem('orthoguide_bsp_theme_v1', bspTheme);
    } catch {
      // Ignore storage errors
    }
  }, [bspTheme]);

  const [params, setParams] = useState<SimulationParams>(() => {
    const initialKits = loadDrillingKitsFromStorage();
    const initialKit = initialKits[0];
    if (!initialKit) return DEFAULT_SIMULATION_PARAMS;
    return {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: initialKit.id,
      ...paramsPatchFromSnapshot(
        initialKit.userDefaults,
        DEFAULT_SIMULATION_PARAMS.implantLength,
        initialKit.kind,
        { calibrationOffsetMm: initialKit.factoryDefaults.offsetMm },
      ),
    };
  });
  const [filters, setFilters] = useState<VisibilityFilters>(DEFAULT_VISIBILITY_FILTERS);
  const [highlightedElement, setHighlightedElement] = useState<DiagramElementFocus | null>(null);
  const [showFreeImplantWizard, setShowFreeImplantWizard] = useState(false);

  useEffect(() => {
    saveDrillingKitsToStorage(kits);
  }, [kits]);

  useEffect(() => {
    saveCustomImplantSystemsToStorage(customImplants);
  }, [customImplants]);

  const geometry = useMemo(() => computeImplantGeometry(params, kits), [params, kits]);

  const handleChangeParams = (patch: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveFreeImplantModel = (entry: CustomImplantSystem) => {
    setCustomImplants((prev) => [entry, ...prev]);
    handleSelectImplantModel(entry, {
      implantDiameter: entry.diameter,
      implantLength: entry.length,
    });
    setShowFreeImplantWizard(false);
  };

  const handleSelectImplantModel = (
    model: CustomImplantSystem,
    overrides?: { implantDiameter?: number; implantLength?: number },
  ) => {
    const nowIso = new Date().toISOString();
    setCustomImplants((prev) =>
      prev.map((m) =>
        m.id === model.id
          ? { ...m, usageCount: (m.usageCount ?? 0) + 1, lastUsedAt: nowIso }
          : m,
      ),
    );
    const nextBrand: 'kontact' | 'globald' | 'custom' =
      model.id === 'factory-implant-biotech-kontact'
        ? 'kontact'
        : model.id === 'factory-implant-globald-inkone'
          ? 'globald'
          : 'custom';
    const nextDiameter =
      overrides?.implantDiameter ??
      (model.diametersMm.some((d) => Math.abs(d - params.implantDiameter) < 0.05)
        ? params.implantDiameter
        : model.diameter);
    const nextLength =
      overrides?.implantLength ??
      (model.lengthsMm.some((l) => Math.abs(l - params.implantLength) < 0.05)
        ? params.implantLength
        : model.length);

    handleSelectImplant({
      implantBrand: nextBrand,
      customImplantId: model.id,
      customImplantName: nextBrand === 'custom' ? model.name : undefined,
      implantDiameter: nextDiameter,
      implantLength: nextLength,
    });
  };

  const handleDeleteImplantModel = (modelId: string) => {
    setCustomImplants((prev) => prev.filter((m) => m.id !== modelId || m.isFactory));
    if (params.customImplantId === modelId) {
      handleSelectImplant({
        implantBrand: 'kontact',
        customImplantId: 'factory-implant-biotech-kontact',
        customImplantName: undefined,
        implantDiameter: 4.2,
        implantLength: 10.0,
      });
    }
  };

  const handleSelectImplant = (patch: Partial<SimulationParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      const kit = kits.find((k) => k.id === next.activeKitId) ?? kits[0];
      if (kit && patch.implantLength !== undefined) {
        if (kit.kind === 'pilot') {
          next.pilotDrillLength = pickOptimalPilotLength(
            patch.implantLength,
            kit.userDefaults.availableLengthsMm,
            next.subcrestalDepth,
            next.gingivaThickness,
            next.guideHeight,
          );
        } else {
          next.offsetOverride = pickOptimalGuidedOffset(
            next.subcrestalDepth,
            next.gingivaThickness,
            next.guideHeight,
            next.hasSleeve,
            kit.id,
            patch.implantLength,
            kit.factoryDefaults.offsetMm,
            kit.userDefaults.availableLengthsMm,
          );
        }
      }
      return next;
    });
  };

  const handleSelectKit = (kitId: string) => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    if (params.activeKitId !== kitId) {
      setKits((prev) =>
        prev.map((k) =>
          k.id === kitId
            ? { ...k, usageCount: k.usageCount + 1, lastUsedAt: nowIso }
            : k,
        ),
      );
    }
    setParams((prev) => {
      const nextImplantBrand =
        target.kind === 'pilot'
          ? prev.implantBrand
          : target.id === 'factory-biotech-kontact'
            ? 'kontact'
            : 'custom';
      const nextCustomImplantId =
        target.kind === 'pilot'
          ? prev.customImplantId
          : target.id === 'factory-biotech-kontact'
            ? 'factory-implant-biotech-kontact'
            : prev.customImplantId;
      const nextImplantDiameter =
        nextImplantBrand === 'custom' &&
        !target.isFactory &&
        !target.userDefaults.implantDiametersMm.some((d) => Math.abs(d - prev.implantDiameter) < 0.05)
          ? (target.userDefaults.implantDiametersMm[0] ?? prev.implantDiameter)
          : prev.implantDiameter;
      const nextImplantLength =
        nextImplantBrand === 'custom' &&
        !target.isFactory &&
        !target.userDefaults.implantLengthsMm.some((l) => Math.abs(l - prev.implantLength) < 0.05)
          ? (target.userDefaults.implantLengthsMm[0] ?? prev.implantLength)
          : prev.implantLength;

      return {
        ...prev,
        mode: 'kit',
        activeKitId: target.id,
        implantBrand: nextImplantBrand,
        customImplantId: nextCustomImplantId,
        customImplantName:
          nextImplantBrand === 'custom'
            ? prev.customImplantName ?? target.name
            : undefined,
        implantDiameter: nextImplantDiameter,
        implantLength: nextImplantLength,
        ...paramsPatchFromSnapshot(target.userDefaults, nextImplantLength, target.kind, {
          subcrestalDepth: prev.subcrestalDepth,
          gingivaThickness: prev.gingivaThickness,
          calibrationOffsetMm: target.factoryDefaults.offsetMm,
        }),
      };
    });
  };

  const handleSelectKitSleeve = (kitId: string, hasSleeve: boolean) => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const nextOptimalOffset =
      target.kind === 'guided'
        ? pickOptimalGuidedOffset(
            params.subcrestalDepth,
            params.gingivaThickness,
            target.userDefaults.guidingHeightMm,
            hasSleeve,
            target.id,
            params.implantLength,
            target.factoryDefaults.offsetMm,
            target.userDefaults.availableLengthsMm,
          )
        : target.userDefaults.offsetMm;
    const updatedSnapshot: KitParameterSnapshot = {
      ...target.userDefaults,
      offsetMm: nextOptimalOffset,
      hasSleeve,
      sleeveLipThicknessMm:
        hasSleeve && target.userDefaults.sleeveLipThicknessMm <= 0
          ? 0.5
          : target.userDefaults.sleeveLipThicknessMm,
      sleeveWallThicknessMm:
        hasSleeve && target.userDefaults.sleeveWallThicknessMm <= 0
          ? 0.35
          : target.userDefaults.sleeveWallThicknessMm,
      drillToSleeveClearanceMm:
        hasSleeve && target.userDefaults.drillToSleeveClearanceMm <= 0
          ? 0.1
          : target.userDefaults.drillToSleeveClearanceMm,
      printingClearanceMm: hasSleeve ? 0.05 : 0.15,
    };

    const isSwitchingKit = params.activeKitId !== kitId;
    setKits((prev) =>
      prev.map((k) =>
        k.id === kitId
          ? {
              ...k,
              usageCount: isSwitchingKit ? k.usageCount + 1 : k.usageCount,
              lastUsedAt: nowIso,
              userDefaults: updatedSnapshot,
            }
          : k,
      ),
    );

    setParams((prev) => {
      const nextImplantBrand =
        target.id === 'factory-biotech-kontact'
          ? 'kontact'
          : target.id === 'factory-globald-pilot'
            ? 'globald'
            : 'custom';
      return {
        ...prev,
        mode: 'kit',
        activeKitId: target.id,
        implantBrand: nextImplantBrand,
        customImplantName: nextImplantBrand === 'custom' ? target.name : undefined,
        ...paramsPatchFromSnapshot(updatedSnapshot, prev.implantLength, target.kind, {
          subcrestalDepth: prev.subcrestalDepth,
          gingivaThickness: prev.gingivaThickness,
          calibrationOffsetMm: target.factoryDefaults.offsetMm,
        }),
      };
    });
  };

  const handleOpenCaliperAssistant = () => {
    setShowOnboarding(false);
    setEditingKitId(null);
    setHighlightedElement(null);
    setParams((prev) => ({
      ...prev,
      mode: prev.mode === 'caliper' ? 'kit' : 'caliper',
    }));
  };

  const handleLaunchCaliperFromOnboarding = () => {
    setShowOnboarding(false);
    setEditingKitId(null);
    setHighlightedElement(null);
    setParams((prev) => ({
      ...prev,
      mode: 'caliper',
    }));
  };

  const handleEditKit = (kitId: string) => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;
    const def = target.userDefaults;
    setEditingKitId(target.id);
    setShowOnboarding(false);
    setHighlightedElement(null);
    setParams((prev) => ({
      ...prev,
      mode: 'caliper',
      activeKitId: target.id,
      wizardKind: target.kind,
      wizardHasSleeve: def.hasSleeve,
      wizardSleeveSeating: def.sleeveSeating,
      wizardSleeveLipThickness: def.sleeveLipThicknessMm,
      wizardSleeveWallThickness: def.sleeveWallThicknessMm,
      wizardDrillToSleeveClearance: def.drillToSleeveClearanceMm,
      wizardPrintingClearance: def.printingClearanceMm,
      wizardSurgicalGuideOffset: def.surgicalGuideOffsetMm,
      wizardDrillStopThickness: def.drillStopThicknessMm,
      wizardGuidingDiameter: def.guidingDiameterMm,
      wizardGuidingHeight: def.guidingHeightMm,
      wizardAvailableLengths: [...def.availableLengthsMm],
      wizardDrillDiameters: [...def.drillDiametersMm],
      wizardImplantDiameters: [...def.implantDiametersMm],
      wizardImplantLengths: [...def.implantLengthsMm],
      wizardImplantToDrillDiameterMap: { ...(def.implantToDrillDiameterMap ?? {}) },
      wizardDefaultOffset: def.offsetMm,
      ...paramsPatchFromSnapshot(def, prev.implantLength, target.kind, {
        calibrationOffsetMm: target.factoryDefaults.offsetMm,
      }),
    }));
  };

  const handleResetParam = (key: ResettableParamKey) => {
    setParams((prev) => ({
      ...prev,
      ...getDefaultParamPatch(key, prev, geometry.activeKit),
    }));
  };

  const handleResetTubeParams = () => {
    const def = geometry.activeKit.userDefaults;
    setParams((prev) => ({
      ...prev,
      offsetOverride: def.offsetMm,
      guideHeight: def.guidingHeightMm,
      guidingDiameter: def.guidingDiameterMm,
      printingClearance: def.printingClearanceMm,
      surgicalGuideOffset: def.surgicalGuideOffsetMm,
      drillToSleeveClearance: def.drillToSleeveClearanceMm,
      sleeveWallThickness: def.sleeveWallThicknessMm,
      sleeveLipThickness: def.sleeveLipThicknessMm,
      sleeveSeating: def.sleeveSeating,
    }));
  };

  const handleToggleFilter = (key: keyof VisibilityFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetKitAsDefault = (kitId: string) => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;
    const nextSnapshot = snapshotFromParams(params, target);
    const nowIso = new Date().toISOString();
    const formattedTime = new Date(nowIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setKits((prev) =>
      prev.map((k) => {
        if (k.id !== kitId) return k;
        const previousSnapshot = { ...k.userDefaults };
        const historyEntry = {
          id: `hist-${Date.now()}`,
          savedAt: nowIso,
          label: `Réglage précédent (${formattedTime})`,
          snapshot: previousSnapshot,
        };
        return {
          ...k,
          userDefaults: nextSnapshot,
          history: [historyEntry, ...k.history].slice(0, 12),
        };
      }),
    );
  };

  const handleRestoreKitHistory = (kitId: string, historyId: string) => {
    const target = kits.find((k) => k.id === kitId);
    const entry = target?.history.find((h) => h.id === historyId);
    if (!target || !entry) return;

    setKits((prev) =>
      prev.map((k) => (k.id === kitId ? { ...k, userDefaults: entry.snapshot } : k)),
    );
    setParams((prev) => ({
      ...prev,
      mode: 'kit',
      activeKitId: target.id,
      ...paramsPatchFromSnapshot(entry.snapshot, prev.implantLength, target.kind, {
        preserveSnapshotOffset: true,
      }),
    }));
  };

  const handleResetKitToFactory = (kitId: string) => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;

    const nowIso = new Date().toISOString();
    const formattedTime = new Date(nowIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const prevSnapshot = { ...target.userDefaults };

    setKits((prev) =>
      prev.map((k) =>
        k.id === kitId
          ? {
              ...k,
              userDefaults: { ...k.factoryDefaults },
              history: [
                {
                  id: `hist-${Date.now()}`,
                  savedAt: nowIso,
                  label: `Avant retour usine (${formattedTime})`,
                  snapshot: prevSnapshot,
                },
                ...k.history,
              ].slice(0, 12),
            }
          : k,
      ),
    );

    setParams((prev) => ({
      ...prev,
      mode: 'kit',
      activeKitId: target.id,
      ...paramsPatchFromSnapshot(target.factoryDefaults, prev.implantLength, target.kind, {
        subcrestalDepth: prev.subcrestalDepth,
        gingivaThickness: prev.gingivaThickness,
        calibrationOffsetMm: target.factoryDefaults.offsetMm,
      }),
    }));
  };

  const handleDeleteKit = (kitId: string) => {
    setKits((prev) => {
      const remaining = prev.filter((k) => k.id !== kitId);
      if (params.activeKitId === kitId && remaining[0]) {
        const nextKit = remaining[0];
        setParams((p) => ({
          ...p,
          activeKitId: nextKit.id,
          ...paramsPatchFromSnapshot(nextKit.userDefaults, p.implantLength, nextKit.kind, {
            calibrationOffsetMm: nextKit.factoryDefaults.offsetMm,
          }),
        }));
      }
      return remaining;
    });
  };

  const handleSaveNewKit = (name: string) => {
    const nowIso = new Date().toISOString();
    const lengths =
      params.wizardAvailableLengths.length > 0
        ? [...params.wizardAvailableLengths].sort((a, b) => a - b)
        : params.wizardKind === 'pilot'
          ? [17.3, 19.0, 20.5, 22.0, 23.5, 25.5]
          : [8.0, 10.0, 12.0];
    const drillDias =
      params.wizardDrillDiameters.length > 0
        ? [...params.wizardDrillDiameters].sort((a, b) => a - b)
        : params.wizardKind === 'pilot'
          ? [2.0]
          : [2.0, 3.0, 3.6, 4.2, 4.8];
    const implantDias =
      params.wizardImplantDiameters.length > 0
        ? [...params.wizardImplantDiameters].sort((a, b) => a - b)
        : [3.0, 3.6, 4.2, 4.8];
    const implantLens =
      params.wizardImplantLengths.length > 0
        ? [...params.wizardImplantLengths].sort((a, b) => a - b)
        : [8.0, 10.0, 12.0];

    const snapshot: KitParameterSnapshot = {
      offsetMm: roundTo(params.wizardDefaultOffset, 2),
      guidingHeightMm: roundTo(params.wizardGuidingHeight, 2),
      guidingDiameterMm: roundTo(params.wizardGuidingDiameter, 2),
      hasSleeve: params.wizardHasSleeve,
      sleeveSeating: params.wizardSleeveSeating,
      sleeveLipThicknessMm: roundTo(params.wizardSleeveLipThickness, 2),
      sleeveWallThicknessMm: roundTo(params.wizardSleeveWallThickness, 2),
      drillToSleeveClearanceMm: roundTo(params.wizardDrillToSleeveClearance, 2),
      printingClearanceMm: roundTo(params.wizardPrintingClearance, 2),
      surgicalGuideOffsetMm: roundTo(params.wizardSurgicalGuideOffset, 2),
      drillStopThicknessMm: roundTo(params.wizardDrillStopThickness, 2),
      availableLengthsMm: lengths,
      drillDiametersMm: drillDias,
      implantDiametersMm: implantDias,
      implantLengthsMm: implantLens,
      implantToDrillDiameterMap: { ...params.wizardImplantToDrillDiameterMap },
    };

    const brandLabel = `${
      params.wizardKind === 'pilot' ? 'Forets pilotes' : 'Forets guidés'
    } · ${
      params.wizardHasSleeve
        ? params.wizardSleeveSeating === 'above'
          ? 'Douille au-dessus'
          : 'Douille à fleur'
        : 'Sans douille'
    }`;

    const existingTarget = editingKitId ? kits.find((k) => k.id === editingKitId) : undefined;
    const firstImplantDia = implantDias[0] ?? params.implantDiameter;
    const firstImplantLen = implantLens[0] ?? params.implantLength;

    if (existingTarget) {
      const formattedTime = new Date(nowIso).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setKits((prev) =>
        prev.map((k) =>
          k.id === existingTarget.id
            ? {
                ...k,
                name,
                brandLabel: k.isFactory ? k.brandLabel : brandLabel,
                kind: params.wizardKind,
                lastUsedAt: nowIso,
                userDefaults: { ...snapshot },
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    savedAt: nowIso,
                    label: `Avant modification (${formattedTime})`,
                    snapshot: { ...k.userDefaults },
                  },
                  ...k.history,
                ].slice(0, 12),
              }
            : k,
        ),
      );

      setEditingKitId(null);
      setParams((prev) => {
        const nextBrand =
          existingTarget.id === 'factory-biotech-kontact'
            ? 'kontact'
            : existingTarget.id === 'factory-globald-pilot'
              ? 'globald'
              : 'custom';
        const compatibleDia = implantDias.some((d) => Math.abs(d - prev.implantDiameter) < 0.05)
          ? prev.implantDiameter
          : firstImplantDia;
        const compatibleLen = implantLens.some((l) => Math.abs(l - prev.implantLength) < 0.05)
          ? prev.implantLength
          : firstImplantLen;

        return {
          ...prev,
          mode: 'kit',
          activeKitId: existingTarget.id,
          implantBrand: nextBrand,
          customImplantName: nextBrand === 'custom' ? name : undefined,
          implantDiameter: compatibleDia,
          implantLength: compatibleLen,
          ...paramsPatchFromSnapshot(snapshot, compatibleLen, params.wizardKind, {
            calibrationOffsetMm: existingTarget.isFactory
              ? existingTarget.factoryDefaults.offsetMm
              : snapshot.offsetMm,
          }),
        };
      });
      return;
    }

    const newKit: DrillingKit = {
      id: `kit-${Date.now()}`,
      name,
      brandLabel,
      isFactory: false,
      kind: params.wizardKind,
      usageCount: 1,
      lastUsedAt: nowIso,
      factoryDefaults: { ...snapshot },
      userDefaults: { ...snapshot },
      history: [],
    };

    setKits((prev) => [...prev, newKit]);
    setEditingKitId(null);
    setParams((prev) => ({
      ...prev,
      mode: 'kit',
      activeKitId: newKit.id,
      implantBrand: 'custom',
      customImplantName: name,
      implantDiameter: firstImplantDia,
      implantLength: firstImplantLen,
      ...paramsPatchFromSnapshot(snapshot, firstImplantLen, newKit.kind, {
        calibrationOffsetMm: newKit.factoryDefaults.offsetMm,
      }),
    }));
  };

  const handleApplySuggestion = (patch: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const handleResetAll = () => {
    const activeKit = kits.find((k) => k.id === params.activeKitId) ?? kits[0];
    setFilters(DEFAULT_VISIBILITY_FILTERS);
    setHighlightedElement(null);
    setParams({
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: activeKit.id,
      ...paramsPatchFromSnapshot(
        activeKit.userDefaults,
        DEFAULT_SIMULATION_PARAMS.implantLength,
        activeKit.kind,
        { calibrationOffsetMm: activeKit.factoryDefaults.offsetMm },
      ),
    });
  };

  return (
    <div data-bsp-theme={bspTheme} className="bsp-shell">
      {/* Reworked Ergonomic BlueTube Top Banner */}
      <header className="bsp-topbar border-b">
        <div className="mx-auto grid max-w-[1540px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          {/* Left: Luminous Disclaimer CTA */}
          <div className="justify-self-start flex items-center">
            <button
              type="button"
              onClick={() => setDisclaimerOpen((o) => !o)}
              aria-expanded={disclaimerOpen}
              data-testid="disclaimer-toggle-btn"
              className="disclaimer-luminous-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold tracking-tight bsp-text whitespace-nowrap shrink-0"
            >
              <Info className="h-3.5 w-3.5 text-sky-500 shrink-0" aria-hidden="true" />
              <span>Disclaimer</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-sky-500 transition-transform duration-200 ${
                  disclaimerOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Center: Stylized BlueTube Wordmark */}
          <button
            type="button"
            onClick={() => {
              setShowOnboarding(true);
              setEditingKitId(null);
              handleChangeParams({ mode: 'kit' });
            }}
            data-testid="bluetube-logo-btn"
            title="Retour à l'accueil BlueTube"
            className="bluetube-wordmark justify-self-center text-xl sm:text-[26px] font-extrabold tracking-tight leading-none whitespace-nowrap cursor-pointer"
          >
            BlueTube
          </button>

          {/* Right: Primary Controls (Theme + Print) stacked cleanly above Mode avancé / Mode assisté */}
          <div className="justify-self-end flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Blue Sky Plan Light / Dark Menu Toggle */}
              <div
                role="group"
                aria-label="Thème Blue Sky Plan"
                className="inline-flex h-8 items-center rounded-lg border border-slate-300/80 bg-slate-100 p-0.5 text-xs font-semibold tracking-tight"
              >
                <button
                  type="button"
                  onClick={() => setBspTheme('light')}
                  data-testid="theme-light-btn"
                  aria-label="Thème Clair"
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 sm:px-2.5 whitespace-nowrap transition-colors ${
                    bspTheme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Clair</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBspTheme('dark')}
                  data-testid="theme-dark-btn"
                  aria-label="Thème Foncé"
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 sm:px-2.5 whitespace-nowrap transition-colors ${
                    bspTheme === 'dark'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Foncé</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Imprimer fiche"
                title="Imprimer fiche"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 sm:px-3 text-xs font-semibold tracking-tight text-white shadow-xs whitespace-nowrap shrink-0 transition-colors hover:bg-sky-700"
              >
                <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Imprimer fiche</span>
              </button>
            </div>

            {/* Secondary Mode Switch directly below Theme & Print buttons */}
            {showOnboarding ? (
              <button
                type="button"
                onClick={() => setShowOnboarding(false)}
                data-testid="skip-onboarding-btn"
                title="Accéder directement à l'interface complète du simulateur"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50/70 px-2.5 sm:px-3 text-[11px] font-semibold tracking-tight text-sky-700 transition-colors hover:border-sky-500 hover:bg-sky-100 whitespace-nowrap"
              >
                <SlidersHorizontal className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Mode avancé</span>
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowOnboarding(true);
                  setEditingKitId(null);
                  handleChangeParams({ mode: 'kit' });
                }}
                data-testid="back-to-assisted-btn"
                title="Revenir au Mode assisté étape par étape"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 text-[11px] font-semibold tracking-tight text-slate-700 transition-colors hover:border-sky-400 hover:text-sky-700 whitespace-nowrap"
              >
                <ArrowLeft className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Mode assisté</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="bluetube-header-fade" aria-hidden="true" />

      {/* Main Workspace */}
      <main id="top" className="mx-auto max-w-[1540px] space-y-3 px-4 pb-4 pt-1 sm:px-6">
        {disclaimerOpen && (
          <div
            data-testid="onboarding-intro-card"
            className="mx-auto max-w-4xl rounded-xl border border-sky-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    Disclaimer — Outil de réflexion, d&apos;aide et de simulation géométrique (BlueTube)
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    BlueTube est exclusivement un{' '}
                    <strong className="text-slate-800">outil de réflexion et d&apos;aide</strong>{' '}
                    conçu pour simuler votre système de forage implantaire à l&apos;échelle (forets
                    pilotes, forages guidés, avec ou sans douille) et anticiper les paramètres du
                    tube de guidage logiciel dans BlueSkyPlan. Les simulations affichées ne
                    constituent{' '}
                    <strong className="text-slate-800">
                      en aucun cas des données cliniques ou scientifiques viables en dehors des
                      mesures officielles du fabricant
                    </strong>
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisclaimerOpen(false)}
                aria-label="Fermer le disclaimer"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
                <div className="text-[11px] font-bold text-emerald-900">
                  Simulation du système de forage &amp; tube BlueSkyPlan
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-slate-700">
                  Visualisez l&apos;impact géométrique de vos réglages (décalage du guide, douille,
                  allongement du tube, jeu d&apos;impression 3D, longueur de foret) avant report
                  dans BlueSkyPlan. Vérifiez systématiquement les notices officielles du fabricant
                  et votre planification CBCT avant impression.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">
                <div className="text-[11px] font-bold text-amber-900">
                  Limites &amp; exclusion de responsabilité légale
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-slate-700">
                  BlueTube ne remplace ni la planification 3D, ni les protocoles cliniques, ni le
                  jugement du chirurgien.{' '}
                  <strong className="text-amber-950">
                    L&apos;éditeur ne saurait être tenu légalement responsable
                  </strong>{' '}
                  des paramètres saisis, des guides chirurgicaux imprimés ou de toute conséquence
                  clinique : la validation finale relève exclusivement du praticien.
                </p>
              </div>
            </div>
          </div>
        )}

        {showOnboarding ? (
          <OnboardingFlow
            params={params}
            kits={kits}
            customImplants={customImplants}
            onChangeParams={handleSelectImplant}
            onSelectImplantModel={handleSelectImplantModel}
            onDeleteImplantModel={handleDeleteImplantModel}
            onOpenFreeImplantWizard={() => setShowFreeImplantWizard(true)}
            onSelectKit={handleSelectKit}
            onSelectKitSleeve={handleSelectKitSleeve}
            onEditKit={handleEditKit}
            onCompleteToSimulator={() => setShowOnboarding(false)}
            onLaunchCaliperWizard={handleLaunchCaliperFromOnboarding}
          />
        ) : params.mode === 'caliper' ? (
          /* Minimalist Focus View during Custom Implant System Creation/Edit */
          <div className="mx-auto max-w-5xl" data-testid="caliper-focus-shell">
            <CaliperWizard
              params={params}
              geometry={geometry}
              filters={filters}
              theme={bspTheme}
              editingKitId={editingKitId}
              editingKitName={kits.find((k) => k.id === editingKitId)?.name ?? ''}
              onChangeParams={handleChangeParams}
              onResetParam={handleResetParam}
              onToggleFilter={handleToggleFilter}
              onSaveNewKit={handleSaveNewKit}
              onCancel={() => {
                setEditingKitId(null);
                handleChangeParams({ mode: 'kit' });
              }}
            />
          </div>
        ) : (
          /* Asymmetric Split Console: Left Control Sidebar + (2D Stage | BSP Tube Panel) + Full-Width Clinical Telemetry */
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[312px_minmax(0,1fr)]">
            <ControlSidebar
              params={params}
              geometry={geometry}
              kits={kits}
              customImplants={customImplants}
              highlightedElement={highlightedElement}
              onSelectImplant={handleSelectImplant}
              onSelectImplantModel={handleSelectImplantModel}
              onDeleteImplantModel={handleDeleteImplantModel}
              onOpenFreeImplantWizard={() => setShowFreeImplantWizard(true)}
              onSelectKit={handleSelectKit}
              onSelectKitSleeve={handleSelectKitSleeve}
              onEditKit={handleEditKit}
              onOpenCaliperAssistant={handleOpenCaliperAssistant}
              onChangeParams={handleChangeParams}
              onResetParam={handleResetParam}
              onSetKitAsDefault={handleSetKitAsDefault}
              onRestoreKitHistory={handleRestoreKitHistory}
              onResetKitToFactory={handleResetKitToFactory}
              onDeleteKit={handleDeleteKit}
              onResetAll={handleResetAll}
            />

            <div className="min-w-0 space-y-3">
              {/* TOP ROW: 2D Scale Cross-Section (Left/Center) + Blue Sky Plan "Tube de guidage de logiciel" Panel (Right) */}
              <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_292px]">
                <SurgicalDiagram2D
                  params={params}
                  geometry={geometry}
                  filters={filters}
                  highlightedElement={highlightedElement}
                  onSelectElement={setHighlightedElement}
                  onChangeParams={handleChangeParams}
                  onResetParam={handleResetParam}
                  onToggleFilter={handleToggleFilter}
                />
                <BlueSkyTubePanel
                  geometry={geometry}
                  theme={bspTheme}
                  highlightedElement={highlightedElement}
                  onResetTubeParams={handleResetTubeParams}
                />
              </div>

              {/* BOTTOM ROW (FULL WIDTH): Clinical Telemetry Drawer */}
              <ClinicalTelemetryBar
                geometry={geometry}
                onApplySuggestion={handleApplySuggestion}
              />

              {geometry.isPilotKit && (
                <GlobalDComparator
                  params={params}
                  kits={kits}
                  onSelectDrillLength={(lengthMm) =>
                    handleChangeParams({ pilotDrillLength: lengthMm })
                  }
                  onSelectImplantAndDrill={(implantLengthMm, drillLengthMm) =>
                    handleChangeParams({
                      implantBrand: 'globald',
                      implantLength: implantLengthMm,
                      pilotDrillLength: drillLengthMm,
                    })
                  }
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showFreeImplantWizard && (
        <FreeImplantWizard
          existingModels={customImplants}
          onSaveModel={handleSaveFreeImplantModel}
          onClose={() => setShowFreeImplantWizard(false)}
        />
      )}
    </div>
  );
}
