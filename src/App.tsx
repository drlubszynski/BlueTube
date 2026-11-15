import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Info,
  Moon,
  Printer,
  Sun,
  X,
} from 'lucide-react';
import { BlueSkyTubePanel } from './components/BlueSkyTubePanel';
import { CaliperWizard } from './components/CaliperWizard';
import { ClinicalTelemetryBar } from './components/ClinicalTelemetryBar';
import { ControlSidebar } from './components/ControlSidebar';
import { FreeImplantWizard } from './components/FreeImplantWizard';
import { GlobalDComparator } from './components/GlobalDComparator';
import { LibraryModal } from './components/LibraryModal';
import { OnboardingFlow } from './components/OnboardingFlow';
import { SmoothDrawer } from './components/SmoothDrawer';
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
  buildKitSelectionParamsPatch,
  buildSingleParamSnapshotUpdate,
  buildSleeveToggleParamsPatch,
  computeImplantGeometry,
  getDefaultParamPatch,
  hasModifiedTubeParams,
  isMisMguideKitId,
  loadCustomImplantSystemsFromStorage,
  loadDrillingKitsFromStorage,
  paramsPatchFromSnapshot,
  pickOptimalPilotLength,
  roundTo,
  saveCustomImplantSystemsToStorage,
  saveDrillingKitsToStorage,
  snapshotFromParams,
} from './utils/implantGeometry';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true;
    return new URLSearchParams(window.location.search).get('autostart') !== '1';
  });
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [caliperReturnToOnboarding, setCaliperReturnToOnboarding] = useState(false);
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
    const nextBrand: 'kontact' | 'globald' | 'mis' | 'custom' =
      model.id === 'factory-implant-biotech-kontact'
        ? 'kontact'
        : model.id === 'factory-implant-globald-inkone'
          ? 'globald'
          : model.id === 'factory-implant-mis-mguide'
            ? 'mis'
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
          // Use calibration helper via getDefaultParamPatch for consistent length-adapted offset
          const offsetPatch = getDefaultParamPatch('offsetCao', next, kit);
          if (offsetPatch.offsetOverride !== undefined) {
            next.offsetOverride = offsetPatch.offsetOverride;
          }
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
      const prevKit = kits.find((k) => k.id === prev.activeKitId);
      return {
        ...prev,
        ...buildKitSelectionParamsPatch(prev, target, prevKit),
      };
    });
  };

  const handleSelectKitSleeve = (kitId: string, hasSleeve: boolean) => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const { updatedSnapshot, paramsPatch } = buildSleeveToggleParamsPatch(
      params,
      target,
      hasSleeve,
    );

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
      const nextImplantBrand: 'kontact' | 'globald' | 'mis' | 'custom' =
        target.kind === 'pilot'
          ? prev.implantBrand
          : target.id === 'factory-biotech-kontact'
            ? 'kontact'
            : isMisMguideKitId(target.id)
              ? 'mis'
              : 'custom';
      const nextCustomImplantId =
        target.kind === 'pilot'
          ? prev.customImplantId
          : target.id === 'factory-biotech-kontact'
            ? 'factory-implant-biotech-kontact'
            : isMisMguideKitId(target.id)
              ? 'factory-implant-mis-mguide'
              : prev.customImplantId;
      const nextImplantDiameter =
        target.kind === 'guided' &&
        !target.userDefaults.implantDiametersMm.some((d) => Math.abs(d - prev.implantDiameter) < 0.05)
          ? (target.userDefaults.implantDiametersMm[0] ?? prev.implantDiameter)
          : prev.implantDiameter;
      const nextImplantLength =
        target.kind === 'guided' &&
        !target.userDefaults.implantLengthsMm.some((l) => Math.abs(l - prev.implantLength) < 0.05)
          ? (target.userDefaults.implantLengthsMm[0] ?? prev.implantLength)
          : prev.implantLength;

      return {
        ...prev,
        ...paramsPatch,
        implantBrand: nextImplantBrand,
        customImplantId: nextCustomImplantId,
        customImplantName: nextImplantBrand === 'custom' ? target.name : undefined,
        implantDiameter: nextImplantDiameter,
        implantLength: nextImplantLength,
      };
    });
  };

  const handleOpenCaliperAssistant = () => {
    setCaliperReturnToOnboarding(false);
    setShowOnboarding(false);
    setEditingKitId(null);
    setHighlightedElement(null);
    setParams((prev) => ({
      ...prev,
      mode: prev.mode === 'caliper' ? 'kit' : 'caliper',
    }));
  };

  const handleLaunchCaliperFromOnboarding = () => {
    setCaliperReturnToOnboarding(true);
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
    setCaliperReturnToOnboarding(showOnboarding);
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

  const handleSaveParamDefault = (kitId: string, paramKey: ResettableParamKey | 'sleeveSeating') => {
    const target = kits.find((k) => k.id === kitId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const formattedTime = new Date(nowIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setKits((prev) =>
      prev.map((k) => {
        if (k.id !== kitId) return k;
        const previousSnapshot = { ...k.userDefaults };
        const updatedSnapshot: KitParameterSnapshot =
          paramKey === 'sleeveSeating'
            ? { ...k.userDefaults, sleeveSeating: params.sleeveSeating }
            : buildSingleParamSnapshotUpdate(paramKey, params, geometry.offsetCao, k.userDefaults);
        const historyEntry = {
          id: `hist-${Date.now()}`,
          savedAt: nowIso,
          label: `Réglage précédent (${formattedTime})`,
          snapshot: previousSnapshot,
        };
        return {
          ...k,
          userDefaults: updatedSnapshot,
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
          : [6.0, 8.0, 10.0, 12.0, 14.0, 16.0];
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
        : [6.0, 8.0, 10.0, 12.0, 14.0, 16.0];

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
      setCaliperReturnToOnboarding(false);
      setParams((prev) => {
        const nextBrand: 'kontact' | 'globald' | 'mis' | 'custom' =
          existingTarget.id === 'factory-biotech-kontact'
            ? 'kontact'
            : isMisMguideKitId(existingTarget.id)
              ? 'mis'
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
            kitId: existingTarget.id,
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
    setCaliperReturnToOnboarding(false);
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
      {/* Responsive BlueTube Top Banner */}
      <header className="bsp-topbar border-b">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-6 sm:py-3">
          {/* Left: Luminous Disclaimer CTA */}
          <div className="order-1 flex items-center sm:justify-self-start">
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
              setCaliperReturnToOnboarding(false);
              handleChangeParams({ mode: 'kit' });
            }}
            data-testid="bluetube-logo-btn"
            title="Retour à l'accueil BlueTube"
            className="bluetube-wordmark order-2 text-xl sm:text-[26px] font-extrabold tracking-tight leading-none whitespace-nowrap cursor-pointer sm:justify-self-center"
          >
            BlueTube
          </button>

          {/* Right: Theme -> Printer -> Bibliothèque -> Mode avancé/assisté */}
          <div className="order-3 flex w-full flex-wrap items-center justify-center gap-1.5 sm:w-auto sm:justify-end sm:justify-self-end sm:gap-2">
            {/* Compact Rounded Light / Dark Toggle */}
            <div
              role="group"
              aria-label="Thème Blue Sky Plan"
              className="inline-flex h-8 items-center rounded-full border border-slate-300 bg-slate-100 p-0.5 shrink-0"
            >
              <button
                type="button"
                onClick={() => setBspTheme('light')}
                data-testid="theme-light-btn"
                aria-label="Thème Clair"
                aria-pressed={bspTheme === 'light'}
                title="Thème Clair"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                  bspTheme === 'light'
                    ? 'bg-white text-amber-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setBspTheme('dark')}
                data-testid="theme-dark-btn"
                aria-label="Thème Foncé"
                aria-pressed={bspTheme === 'dark'}
                title="Thème Foncé"
                className={`inline-flex h-7 w-7 -ml-0.5 items-center justify-center rounded-full transition-colors ${
                  bspTheme === 'dark'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>

            {/* Print Sheet Button */}
            <button
              type="button"
              onClick={() => window.print()}
              data-testid="print-sheet-btn"
              aria-label="Imprimer fiche"
              title="Imprimer fiche"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 shrink-0 transition-colors hover:border-sky-400 hover:text-sky-600"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>

            {/* Bibliothèque Button positioned strictly between Printer icon and Mode toggle */}
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              data-testid="header-library-btn"
              title="Ouvrir la bibliothèque des marques, systèmes de forage et implants"
              className="disclaimer-luminous-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold tracking-tight bsp-text whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5 text-sky-500 shrink-0" aria-hidden="true" />
              <span>Bibliothèque</span>
            </button>

            {/* Mode avancé / Mode assisté Button */}
            {showOnboarding ? (
              <button
                type="button"
                onClick={() => {
                  setCaliperReturnToOnboarding(false);
                  setShowOnboarding(false);
                }}
                data-testid="skip-onboarding-btn"
                title="Accéder directement à l'interface complète du simulateur"
                className="disclaimer-luminous-btn inline-flex h-8 items-center justify-center rounded-lg px-2.5 sm:px-3 text-xs font-semibold tracking-tight bsp-text whitespace-nowrap shrink-0"
              >
                <span>Mode avancé</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowOnboarding(true);
                  setEditingKitId(null);
                  setCaliperReturnToOnboarding(false);
                  handleChangeParams({ mode: 'kit' });
                }}
                data-testid="back-to-assisted-btn"
                title="Revenir au Mode assisté étape par étape"
                className="disclaimer-luminous-btn inline-flex h-8 items-center justify-center rounded-lg px-2.5 sm:px-3 text-xs font-semibold tracking-tight bsp-text whitespace-nowrap shrink-0"
              >
                <span>Mode assisté</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="bluetube-header-fade" aria-hidden="true" />

      {/* Main Workspace */}
      <main id="top" className="mx-auto max-w-[1540px] space-y-3 px-3 pb-5 pt-1 sm:px-6">
        {/* Smoothly animated Disclaimer Drawer */}
        <SmoothDrawer open={disclaimerOpen}>
          <div
            data-testid="onboarding-intro-card"
            className="mx-auto mb-2 max-w-4xl rounded-xl border border-sky-300 bg-white p-4 shadow-sm"
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
        </SmoothDrawer>

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
              theme={bspTheme}
              editingKitId={editingKitId}
              editingKitName={kits.find((k) => k.id === editingKitId)?.name ?? ''}
              onChangeParams={handleChangeParams}
              onResetParam={handleResetParam}
              onSaveNewKit={handleSaveNewKit}
              onCancel={() => {
                setEditingKitId(null);
                handleChangeParams({ mode: 'kit' });
                if (caliperReturnToOnboarding) {
                  setShowOnboarding(true);
                  setCaliperReturnToOnboarding(false);
                }
              }}
            />
          </div>
        ) : (
          /* Asymmetric Split Console: Left Control Sidebar + (2D Stage | Autonomous BSP Tube Panel | Telemetry) */
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[348px_minmax(0,1fr)]">
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
              onSaveParamDefault={handleSaveParamDefault}
              onRestoreKitHistory={handleRestoreKitHistory}
              onResetKitToFactory={handleResetKitToFactory}
              onDeleteKit={handleDeleteKit}
              onResetAll={handleResetAll}
            />

            <div className="min-w-0 space-y-3">
              {/* 1. Coupe 2D à l'échelle */}
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

              {/* 2. Autonomous Blue Sky Plan "Tube de guidage logiciel" directly under Coupe 2D */}
              <BlueSkyTubePanel
                geometry={geometry}
                theme={bspTheme}
                highlightedElement={highlightedElement}
                hasModifiedTube={hasModifiedTubeParams(params, geometry, geometry.activeKit)}
                onResetTubeParams={handleResetTubeParams}
              />

              {/* 3. Full Width Clinical Telemetry Drawer */}
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

      <LibraryModal
        open={libraryOpen}
        kits={kits}
        customImplants={customImplants}
        activeKit={geometry.activeKit}
        params={params}
        onClose={() => setLibraryOpen(false)}
        onSelectKit={handleSelectKit}
        onSelectImplantModel={handleSelectImplantModel}
        onEditKit={handleEditKit}
      />

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
