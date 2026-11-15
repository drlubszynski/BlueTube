export type SimulatorMode = 'kit' | 'caliper';

export type KitDrillKind = 'guided' | 'pilot';
export type SleeveSeating = 'above' | 'flush';
export type GuideTubeExtension = 'gingiva' | 'bone';
export type BiotechMastertubePreset = 'H9' | 'H10.5' | 'H12';

export type DiagramElementFocus =
  | 'implant'
  | 'gingiva'
  | 'subcrestal'
  | 'surgical_guide'
  | 'sleeve'
  | 'drill'
  | 'handpiece';

export type HighlightableParamKey =
  | 'implantDiameter'
  | 'implantLength'
  | 'gingivaThickness'
  | 'subcrestalDepth'
  | 'guideHeight'
  | 'surgicalGuideOffset'
  | 'guideTubeExtension'
  | 'printingClearance'
  | 'sleeve'
  | 'offsetCao'
  | 'drillUsefulLength'
  | 'handpieceHeadHeight'
  | 'bspPanel';

export interface ElementHighlightConfig {
  element: DiagramElementFocus;
  label: string;
  openDrawer: 2 | 3 | 4 | null;
  params: HighlightableParamKey[];
}

export function getElementHighlightConfig(
  element: DiagramElementFocus | null,
): ElementHighlightConfig | null {
  switch (element) {
    case 'implant':
      return {
        element: 'implant',
        label: 'Implant',
        openDrawer: 2,
        params: ['implantDiameter', 'implantLength'],
      };
    case 'gingiva':
      return {
        element: 'gingiva',
        label: 'Gencive (muqueuse)',
        openDrawer: 4,
        params: ['gingivaThickness'],
      };
    case 'subcrestal':
      return {
        element: 'subcrestal',
        label: 'Crête & enfouissement sous-crestal',
        openDrawer: 2,
        params: ['subcrestalDepth'],
      };
    case 'surgical_guide':
      return {
        element: 'surgical_guide',
        label: 'Guide chirurgical & tube',
        openDrawer: 3,
        params: [
          'guideHeight',
          'surgicalGuideOffset',
          'guideTubeExtension',
          'printingClearance',
          'bspPanel',
        ],
      };
    case 'sleeve':
      return {
        element: 'sleeve',
        label: 'Douille métallique',
        openDrawer: 3,
        params: ['sleeve', 'guideHeight', 'bspPanel'],
      };
    case 'drill':
      return {
        element: 'drill',
        label: 'Foret & décalage',
        openDrawer: 2,
        params: ['offsetCao', 'drillUsefulLength', 'bspPanel'],
      };
    case 'handpiece':
      return {
        element: 'handpiece',
        label: 'Contre-angle 20:1',
        openDrawer: 4,
        params: ['handpieceHeadHeight'],
      };
    default:
      return null;
  }
}

export interface BiotechDrillSpec {
  diameter: number;
  previousDiameter: number;
  ringColorHex: string | null;
  ringName: string | null;
}

export interface KitParameterSnapshot {
  offsetMm: number;
  guidingHeightMm: number;
  guidingDiameterMm: number;
  hasSleeve: boolean;
  sleeveSeating: SleeveSeating;
  sleeveLipThicknessMm: number;
  sleeveWallThicknessMm: number;
  drillToSleeveClearanceMm: number;
  printingClearanceMm: number;
  surgicalGuideOffsetMm: number;
  drillStopThicknessMm: number;
  guideTubeExtension?: GuideTubeExtension;
  handpieceHeadHeightMm?: number;
  subcrestalDepthMm?: number;
  gingivaThicknessMm?: number;
  availableLengthsMm: number[];
  drillDiametersMm: number[];
  implantDiametersMm: number[];
  implantLengthsMm: number[];
  implantToDrillDiameterMap?: Record<string, number>;
}

export interface KitHistoryEntry {
  id: string;
  savedAt: string;
  label: string;
  snapshot: KitParameterSnapshot;
}

export interface DrillingKit {
  id: string;
  name: string;
  brandLabel: string;
  systemGroupId?: string;
  systemGroupName?: string;
  subSystemLabel?: string;
  implantBrandName?: string;
  implantModelName?: string;
  isFactory: boolean;
  kind: KitDrillKind;
  usageCount: number;
  lastUsedAt: string;
  factoryDefaults: KitParameterSnapshot;
  userDefaults: KitParameterSnapshot;
  history: KitHistoryEntry[];
}

export interface ImplantPresetBrand {
  id: 'kontact' | 'globald' | 'custom';
  label: string;
  diameters: number[];
  lengths: number[];
}

export const BIOTECH_KONTACT_DIAMETERS = [3.0, 3.6, 4.2, 4.8];
export const BIOTECH_KONTACT_LENGTHS = [6.0, 8.0, 10.0, 12.0, 14.0, 16.0];
export const BIOTECH_GUIDED_DRILL_LENGTHS = [6.0, 8.0, 10.0, 12.0, 14.0, 16.0];

export const GLOBAL_D_PILOT_DRILL_LENGTHS = [17.3, 19.0, 20.5, 22.0, 23.5, 25.5];
export const GLOBAL_D_IMPLANT_LENGTHS = [6.0, 8.5, 10.0, 11.5, 13.0, 15.0];
export const GLOBAL_D_IMPLANT_DIAMETERS = [3.0, 3.5, 4.0, 4.5, 5.0];

export const MIS_MGUIDE_IMPLANT_DIAMETERS = [3.3, 3.8, 4.2, 5.0];
export const MIS_MGUIDE_IMPLANT_LENGTHS = [6.0, 8.0, 10.0, 11.5, 13.0, 16.0];
export const MIS_MGUIDE_DRILL_LENGTHS = [6.0, 8.0, 10.0, 11.5, 13.0, 16.0];
export const MIS_MGUIDE_DRILL_DIAMETERS = [2.4, 3.2, 3.6, 4.1, 4.9];

export const MIS_MGUIDE_NARROW_IMPLANT_DIAMETERS = [3.3];
export const MIS_MGUIDE_NARROW_DRILL_DIAMETERS = [2.4, 2.8, 3.2];

export function isMisMguideKitId(kitId?: string): boolean {
  return kitId === 'factory-mis-mguide' || kitId === 'factory-mis-mguide-narrow';
}

export interface GlobalDChartRow {
  catalogueLabel: string;
  implantLengthMm: number;
  offsetsByDrill: Record<number, number | null>;
}

/**
 * Tableau officiel Global D (forets pilotes Ø 2.0 mm, douille 0.5 mm au-dessus du guide)
 * Indique le décalage Blue Sky Plan recommandé selon la longueur d'implant et de foret.
 */
export const GLOBAL_D_OFFICIAL_CHART: GlobalDChartRow[] = [
  {
    catalogueLabel: 'L6',
    implantLengthMm: 6.0,
    offsetsByDrill: { 17.3: 10.0, 19.0: 11.7, 20.5: 13.2, 22.0: 14.7, 23.5: null, 25.5: null },
  },
  {
    catalogueLabel: 'L8.5',
    implantLengthMm: 8.5,
    offsetsByDrill: { 17.3: 8.3, 19.0: 10.0, 20.5: 11.5, 22.0: 13.0, 23.5: 14.5, 25.5: null },
  },
  {
    catalogueLabel: 'L10',
    implantLengthMm: 10.0,
    offsetsByDrill: { 17.3: 6.8, 19.0: 8.5, 20.5: 10.0, 22.0: 11.5, 23.5: 13.0, 25.5: 15.0 },
  },
  {
    catalogueLabel: 'L11.5',
    implantLengthMm: 11.5,
    offsetsByDrill: { 17.3: null, 19.0: 7.0, 20.5: 8.5, 22.0: 10.0, 23.5: 11.5, 25.5: 13.5 },
  },
  {
    catalogueLabel: 'L13',
    implantLengthMm: 13.0,
    offsetsByDrill: { 17.3: null, 19.0: null, 20.5: 7.0, 22.0: 8.5, 23.5: 10.0, 25.5: 12.0 },
  },
  {
    catalogueLabel: 'L15',
    implantLengthMm: 15.0,
    offsetsByDrill: { 17.3: null, 19.0: null, 20.5: null, 22.0: 6.5, 23.5: 8.0, 25.5: 10.0 },
  },
];

export const BIOTECH_MASTERTUBE_OFFSETS: Record<BiotechMastertubePreset, number> = {
  H9: 9.0,
  'H10.5': 10.5,
  H12: 12.0,
};

export const BIOTECH_DRILL_SPECS: BiotechDrillSpec[] = [
  { diameter: 2.0, previousDiameter: 1.5, ringColorHex: '#94A3B8', ringName: 'Inox' },
  { diameter: 3.0, previousDiameter: 2.0, ringColorHex: '#EAB308', ringName: 'Jaune' },
  { diameter: 3.6, previousDiameter: 3.0, ringColorHex: '#D946EF', ringName: 'Magenta' },
  { diameter: 4.2, previousDiameter: 3.6, ringColorHex: '#2563EB', ringName: 'Bleue' },
  { diameter: 4.8, previousDiameter: 4.2, ringColorHex: '#16A34A', ringName: 'Verte' },
];

export const FACTORY_DRILLING_KITS: DrillingKit[] = [
  {
    id: 'factory-biotech-kontact',
    name: 'AtlaSurgery 2 (Biotech Dental)',
    brandLabel: 'Marque Biotech Dental · Trousse AtlaSurgery 2 (Kontact) · Tubeless 12 mm · Forets 6–16 mm',
    systemGroupId: 'biotech-kontact',
    systemGroupName: 'AtlaSurgery 2 (Biotech Dental)',
    subSystemLabel: 'Standard',
    implantBrandName: 'Biotech Dental',
    implantModelName: 'Kontact',
    isFactory: true,
    kind: 'guided',
    usageCount: 30,
    lastUsedAt: '2026-11-15T00:00:00.000Z',
    factoryDefaults: {
      offsetMm: 12.0,
      guidingHeightMm: 4.0,
      guidingDiameterMm: 5.0,
      hasSleeve: false,
      sleeveSeating: 'above',
      sleeveLipThicknessMm: 0.5,
      sleeveWallThicknessMm: 0.35,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [6.0, 8.0, 10.0, 12.0, 14.0, 16.0],
      drillDiametersMm: [2.0, 3.0, 3.6, 4.2, 4.8],
      implantDiametersMm: [3.0, 3.6, 4.2, 4.8],
      implantLengthsMm: [6.0, 8.0, 10.0, 12.0, 14.0, 16.0],
    },
    userDefaults: {
      offsetMm: 12.0,
      guidingHeightMm: 4.0,
      guidingDiameterMm: 5.0,
      hasSleeve: false,
      sleeveSeating: 'above',
      sleeveLipThicknessMm: 0.5,
      sleeveWallThicknessMm: 0.35,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [6.0, 8.0, 10.0, 12.0, 14.0, 16.0],
      drillDiametersMm: [2.0, 3.0, 3.6, 4.2, 4.8],
      implantDiametersMm: [3.0, 3.6, 4.2, 4.8],
      implantLengthsMm: [6.0, 8.0, 10.0, 12.0, 14.0, 16.0],
    },
    history: [],
  },
  {
    id: 'factory-globald-pilot',
    name: 'G20 (Global D)',
    brandLabel: 'Marque Global D · Trousse G20 · In-Kone · Calcul inversé L17.3–L25.5',
    systemGroupId: 'globald-pilot',
    systemGroupName: 'G20 (Global D)',
    subSystemLabel: 'Pilote',
    implantBrandName: 'Global D',
    implantModelName: 'In-Kone',
    isFactory: true,
    kind: 'pilot',
    usageCount: 20,
    lastUsedAt: '2026-11-14T00:00:00.000Z',
    factoryDefaults: {
      offsetMm: 9.0,
      guidingHeightMm: 4.0,
      guidingDiameterMm: 2.0,
      hasSleeve: false,
      sleeveSeating: 'above',
      sleeveLipThicknessMm: 0.5,
      sleeveWallThicknessMm: 0.35,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [17.3, 19.0, 20.5, 22.0, 23.5, 25.5],
      drillDiametersMm: [2.0],
      implantDiametersMm: [3.0, 3.5, 4.0, 4.5, 5.0],
      implantLengthsMm: [6.0, 8.5, 10.0, 11.5, 13.0, 15.0],
    },
    userDefaults: {
      offsetMm: 9.0,
      guidingHeightMm: 4.0,
      guidingDiameterMm: 2.0,
      hasSleeve: false,
      sleeveSeating: 'above',
      sleeveLipThicknessMm: 0.5,
      sleeveWallThicknessMm: 0.35,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [17.3, 19.0, 20.5, 22.0, 23.5, 25.5],
      drillDiametersMm: [2.0],
      implantDiametersMm: [3.0, 3.5, 4.0, 4.5, 5.0],
      implantLengthsMm: [6.0, 8.5, 10.0, 11.5, 13.0, 15.0],
    },
    history: [],
  },
  {
    id: 'factory-mis-mguide',
    name: 'MGUIDE (MIS · Dentsply Sirona) · Standard',
    brandLabel: 'Marque MIS (Dentsply Sirona) · Trousse MGUIDE Standard · C1 / V3 / SEVEN · Offset 9,5 mm · H 5 mm',
    systemGroupId: 'mis-mguide',
    systemGroupName: 'MGUIDE (MIS · Dentsply Sirona)',
    subSystemLabel: 'Standard',
    implantBrandName: 'MIS (Dentsply Sirona)',
    implantModelName: 'C1 / V3 / SEVEN (Standard)',
    isFactory: true,
    kind: 'guided',
    usageCount: 15,
    lastUsedAt: '2026-11-12T00:00:00.000Z',
    factoryDefaults: {
      offsetMm: 9.5,
      guidingHeightMm: 5.0,
      guidingDiameterMm: 5.45,
      hasSleeve: false,
      sleeveSeating: 'flush',
      sleeveLipThicknessMm: 0.0,
      sleeveWallThicknessMm: 0.5,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [...MIS_MGUIDE_DRILL_LENGTHS],
      drillDiametersMm: [...MIS_MGUIDE_DRILL_DIAMETERS],
      implantDiametersMm: [...MIS_MGUIDE_IMPLANT_DIAMETERS],
      implantLengthsMm: [...MIS_MGUIDE_IMPLANT_LENGTHS],
      implantToDrillDiameterMap: { '3.3': 3.2, '3.8': 3.6, '4.2': 4.1, '5.0': 4.9 },
    },
    userDefaults: {
      offsetMm: 9.5,
      guidingHeightMm: 5.0,
      guidingDiameterMm: 5.45,
      hasSleeve: false,
      sleeveSeating: 'flush',
      sleeveLipThicknessMm: 0.0,
      sleeveWallThicknessMm: 0.5,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [...MIS_MGUIDE_DRILL_LENGTHS],
      drillDiametersMm: [...MIS_MGUIDE_DRILL_DIAMETERS],
      implantDiametersMm: [...MIS_MGUIDE_IMPLANT_DIAMETERS],
      implantLengthsMm: [...MIS_MGUIDE_IMPLANT_LENGTHS],
      implantToDrillDiameterMap: { '3.3': 3.2, '3.8': 3.6, '4.2': 4.1, '5.0': 4.9 },
    },
    history: [],
  },
  {
    id: 'factory-mis-mguide-narrow',
    name: 'MGUIDE (MIS · Dentsply Sirona) · Narrow',
    brandLabel: 'Marque MIS (Dentsply Sirona) · Trousse MGUIDE Narrow · Ø3.3 · Offset 9,5 mm · H 5 mm',
    systemGroupId: 'mis-mguide',
    systemGroupName: 'MGUIDE (MIS · Dentsply Sirona)',
    subSystemLabel: 'Narrow',
    implantBrandName: 'MIS (Dentsply Sirona)',
    implantModelName: 'C1 / V3 / SEVEN (Narrow)',
    isFactory: true,
    kind: 'guided',
    usageCount: 16,
    lastUsedAt: '2026-11-13T00:00:00.000Z',
    factoryDefaults: {
      offsetMm: 9.5,
      guidingHeightMm: 5.0,
      guidingDiameterMm: 3.95,
      hasSleeve: false,
      sleeveSeating: 'flush',
      sleeveLipThicknessMm: 0.0,
      sleeveWallThicknessMm: 0.5,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [...MIS_MGUIDE_DRILL_LENGTHS],
      drillDiametersMm: [...MIS_MGUIDE_NARROW_DRILL_DIAMETERS],
      implantDiametersMm: [...MIS_MGUIDE_NARROW_IMPLANT_DIAMETERS],
      implantLengthsMm: [...MIS_MGUIDE_IMPLANT_LENGTHS],
      implantToDrillDiameterMap: { '3.3': 3.2 },
    },
    userDefaults: {
      offsetMm: 9.5,
      guidingHeightMm: 5.0,
      guidingDiameterMm: 3.95,
      hasSleeve: false,
      sleeveSeating: 'flush',
      sleeveLipThicknessMm: 0.0,
      sleeveWallThicknessMm: 0.5,
      drillToSleeveClearanceMm: 0.1,
      printingClearanceMm: 0.15,
      surgicalGuideOffsetMm: 0.25,
      drillStopThicknessMm: 2.0,
      availableLengthsMm: [...MIS_MGUIDE_DRILL_LENGTHS],
      drillDiametersMm: [...MIS_MGUIDE_NARROW_DRILL_DIAMETERS],
      implantDiametersMm: [...MIS_MGUIDE_NARROW_IMPLANT_DIAMETERS],
      implantLengthsMm: [...MIS_MGUIDE_IMPLANT_LENGTHS],
      implantToDrillDiameterMap: { '3.3': 3.2 },
    },
    history: [],
  },
];

export type SafetyStatusCode = 'optimal' | 'compression' | 'guidance_fault';

export interface SafetyEvaluation {
  status: SafetyStatusCode;
  label: string;
  detail: string;
  mouthOpeningWarning: boolean;
}

export interface VisibilityFilters {
  fullscreen: boolean;
  diagramControls: boolean;
  handpiece: boolean;
  deviationCone: boolean;
  boneAndGingiva: boolean;
  adjacentTeeth: boolean;
  implant: boolean;
  drillAndStop: boolean;
  surgicalGuide: boolean;
  sleeve: boolean;
}

export interface SimulationParams {
  mode: SimulatorMode;
  activeKitId: string;
  // Implant-first selection
  implantBrand: 'kontact' | 'globald' | 'mis' | 'custom';
  customImplantId?: string;
  customImplantName?: string;
  implantDiameter: number;
  implantLength: number;
  // Anatomical & clinical site parameters
  subcrestalDepth: number;
  gingivaThickness: number;
  handpieceHeadHeight: number;
  // Active kit adjustable parameters
  offsetOverride: number;
  guideHeight: number;
  guidingDiameter: number;
  hasSleeve: boolean;
  sleeveSeating: SleeveSeating;
  sleeveLipThickness: number;
  sleeveWallThickness: number;
  drillToSleeveClearance: number;
  printingClearance: number;
  surgicalGuideOffset: number;
  guideTubeExtension: GuideTubeExtension;
  drillStopThickness: number;
  // Pilot drill explicit length override (auto-adapted when implant changes unless picked)
  pilotDrillLength: number;
  // Caliper creation wizard draft state
  wizardKind: KitDrillKind;
  wizardHasSleeve: boolean;
  wizardSleeveSeating: SleeveSeating;
  wizardSleeveLipThickness: number;
  wizardSleeveWallThickness: number;
  wizardDrillToSleeveClearance: number;
  wizardPrintingClearance: number;
  wizardSurgicalGuideOffset: number;
  wizardDrillStopThickness: number;
  wizardGuidingDiameter: number;
  wizardGuidingHeight: number;
  wizardAvailableLengths: number[];
  wizardDrillDiameters: number[];
  wizardImplantDiameters: number[];
  wizardImplantLengths: number[];
  wizardImplantToDrillDiameterMap: Record<string, number>;
  wizardDefaultOffset: number;
}

export interface BlueSkyPlanParams {
  guideOffsetMm: number;
  guideHoleDiameterMm: number;
  sleeveHeightMm: number;
  hasSleeve: boolean;
  sleeveSeating: SleeveSeating;
  sleeveLipThicknessMm: number;
  sleeveWallThicknessMm: number;
  drillToSleeveClearanceMm: number;
  printingClearanceMm: number;
  drillStopThicknessMm: number;
  totalOffsetFromImplantMm: number;
}

export interface ClinicalSuggestion {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  patch: Partial<SimulationParams>;
}

export interface ComputedGeometry {
  activeKit: DrillingKit;
  offsetCao: number;
  drillUsefulLength: number;
  matchedGuidedDrillLengthMm: number;
  totalDrillingDepthFromStop: number;
  intraosseousDepthFromCrest: number;
  freeSpaceUnderGuide: number;
  surgicalGuideOffsetMm: number;
  guideTubeExtension: GuideTubeExtension;
  wellDiameter: number;
  canonDiameter: number;
  diametralClearance: number;
  radialClearance: number;
  guideHeight: number;
  deviationAngleDeg: number;
  apicalDeviationMm: number;
  minMouthOpeningMm: number;
  yBoneCrest: number;
  yGingivaTop: number;
  yImplantPlatform: number;
  yImplantApex: number;
  yGuideTop: number;
  yResinGuideTop: number;
  yGuideBottom: number;
  yDrillTip: number;
  showSleeve: boolean;
  drillActiveDiameter: number;
  drillPreviousDiameter: number;
  drillRingColorHex: string | null;
  drillMarking: string;
  isPilotKit: boolean;
  blueSkyPlan: BlueSkyPlanParams;
  safety: SafetyEvaluation;
  suggestion: ClinicalSuggestion | null;
}

export interface PilotComparisonRow {
  lengthMm: number;
  marking: string;
  offsetCao: number;
  bspGuideOffset: number;
  freeSpaceUnderGuide: number;
  minMouthOpeningMm: number;
  apicalDeviationMm: number;
  deviationAngleDeg: number;
  safety: SafetyEvaluation;
}

export const DEFAULT_VISIBILITY_FILTERS: VisibilityFilters = {
  fullscreen: false,
  diagramControls: true,
  handpiece: true,
  deviationCone: true,
  boneAndGingiva: true,
  adjacentTeeth: true,
  implant: true,
  drillAndStop: true,
  surgicalGuide: true,
  sleeve: true,
};

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  mode: 'kit',
  activeKitId: FACTORY_DRILLING_KITS[0].id,
  implantBrand: 'kontact',
  implantDiameter: 4.2,
  implantLength: 10.0,
  subcrestalDepth: 0.5,
  gingivaThickness: 2.0,
  handpieceHeadHeight: 13.5,
  offsetOverride: FACTORY_DRILLING_KITS[0].userDefaults.offsetMm,
  guideHeight: FACTORY_DRILLING_KITS[0].userDefaults.guidingHeightMm,
  guidingDiameter: FACTORY_DRILLING_KITS[0].userDefaults.guidingDiameterMm,
  hasSleeve: FACTORY_DRILLING_KITS[0].userDefaults.hasSleeve,
  sleeveSeating: FACTORY_DRILLING_KITS[0].userDefaults.sleeveSeating,
  sleeveLipThickness: FACTORY_DRILLING_KITS[0].userDefaults.sleeveLipThicknessMm,
  sleeveWallThickness: FACTORY_DRILLING_KITS[0].userDefaults.sleeveWallThicknessMm,
  drillToSleeveClearance: FACTORY_DRILLING_KITS[0].userDefaults.drillToSleeveClearanceMm,
  printingClearance: FACTORY_DRILLING_KITS[0].userDefaults.printingClearanceMm,
  surgicalGuideOffset: FACTORY_DRILLING_KITS[0].userDefaults.surgicalGuideOffsetMm,
  guideTubeExtension: 'gingiva',
  drillStopThickness: FACTORY_DRILLING_KITS[0].userDefaults.drillStopThicknessMm,
  pilotDrillLength: 19.0,
  wizardKind: 'guided',
  wizardHasSleeve: false,
  wizardSleeveSeating: 'above',
  wizardSleeveLipThickness: 0.5,
  wizardSleeveWallThickness: 0.35,
  wizardDrillToSleeveClearance: 0.1,
  wizardPrintingClearance: 0.15,
  wizardSurgicalGuideOffset: 0.25,
  wizardDrillStopThickness: 2.0,
  wizardGuidingDiameter: 5.0,
  wizardGuidingHeight: 4.0,
  wizardAvailableLengths: [6.0, 8.0, 10.0, 12.0, 14.0, 16.0],
  wizardDrillDiameters: [2.0, 3.0, 3.6, 4.2, 4.8],
  wizardImplantDiameters: [3.0, 3.6, 4.2, 4.8],
  wizardImplantLengths: [6.0, 8.0, 10.0, 12.0, 14.0, 16.0],
  wizardImplantToDrillDiameterMap: { '3.0': 3.0, '3.6': 3.6, '4.2': 4.2, '4.8': 4.8 },
  wizardDefaultOffset: 12.0,
};

export function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapshotFromParams(params: SimulationParams, kit: DrillingKit): KitParameterSnapshot {
  return {
    offsetMm: roundTo(params.offsetOverride, 2),
    guidingHeightMm: roundTo(params.guideHeight, 2),
    guidingDiameterMm: roundTo(params.guidingDiameter, 2),
    hasSleeve: params.hasSleeve,
    sleeveSeating: params.sleeveSeating,
    sleeveLipThicknessMm: roundTo(params.sleeveLipThickness, 2),
    sleeveWallThicknessMm: roundTo(params.sleeveWallThickness, 2),
    drillToSleeveClearanceMm: roundTo(params.drillToSleeveClearance, 2),
    printingClearanceMm: roundTo(params.printingClearance, 2),
    surgicalGuideOffsetMm: roundTo(params.surgicalGuideOffset, 2),
    drillStopThicknessMm: roundTo(params.drillStopThickness, 2),
    guideTubeExtension: params.guideTubeExtension,
    handpieceHeadHeightMm: roundTo(params.handpieceHeadHeight, 1),
    subcrestalDepthMm: roundTo(params.subcrestalDepth, 1),
    gingivaThicknessMm: roundTo(params.gingivaThickness, 1),
    availableLengthsMm: [...kit.userDefaults.availableLengthsMm],
    drillDiametersMm: [...kit.userDefaults.drillDiametersMm],
    implantDiametersMm: [...kit.userDefaults.implantDiametersMm],
    implantLengthsMm: [...kit.userDefaults.implantLengthsMm],
    implantToDrillDiameterMap: kit.userDefaults.implantToDrillDiameterMap
      ? { ...kit.userDefaults.implantToDrillDiameterMap }
      : undefined,
  };
}

export const MIN_CLINICAL_FREE_SPACE_MM = 1.5;

export function pickOptimalPilotLength(
  implantLength: number,
  lengths: number[],
  subcrestalDepth = DEFAULT_SIMULATION_PARAMS.subcrestalDepth,
  gingivaThickness = DEFAULT_SIMULATION_PARAMS.gingivaThickness,
  guideHeight = DEFAULT_SIMULATION_PARAMS.guideHeight,
): number {
  const sorted = [...lengths].filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return roundTo(
      clamp(implantLength + subcrestalDepth + gingivaThickness + guideHeight + MIN_CLINICAL_FREE_SPACE_MM, 10, 34),
      1,
    );
  }
  const clinicalTarget = sorted.find((len) => {
    const offset = len - implantLength;
    const freeSpace = offset - subcrestalDepth - gingivaThickness - guideHeight;
    return freeSpace >= MIN_CLINICAL_FREE_SPACE_MM - 1e-6 && offset >= guideHeight - 1e-6;
  });
  if (clinicalTarget !== undefined) return clinicalTarget;

  const nonCompressing = sorted.find((len) => {
    const offset = len - implantLength;
    const freeSpace = offset - subcrestalDepth - gingivaThickness - guideHeight;
    return freeSpace >= -1e-6 && offset >= guideHeight - 1e-6;
  });
  if (nonCompressing !== undefined) return nonCompressing;

  return sorted[sorted.length - 1];
}

export interface GuidedDrillOption {
  drillLengthMm: number;
  physicalLengthMm: number;
  offsetMm: number;
  freeSpaceMm: number;
}

export function getGuidedDrillOptions(
  implantLength: number,
  calibrationOffsetMm: number,
  availableDrillLengthsMm: number[],
  subcrestalDepth = DEFAULT_SIMULATION_PARAMS.subcrestalDepth,
  gingivaThickness = DEFAULT_SIMULATION_PARAMS.gingivaThickness,
  guideHeight = DEFAULT_SIMULATION_PARAMS.guideHeight,
): GuidedDrillOption[] {
  const sorted = [...availableDrillLengthsMm]
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  return sorted
    .map((drillLengthMm) => {
      const physicalLengthMm = roundTo(drillLengthMm + calibrationOffsetMm, 2);
      const offsetMm = roundTo(physicalLengthMm - implantLength, 2);
      const freeSpaceMm = roundTo(offsetMm - subcrestalDepth - gingivaThickness - guideHeight, 2);
      return { drillLengthMm, physicalLengthMm, offsetMm, freeSpaceMm };
    })
    .filter((opt) => opt.offsetMm >= 4.0 && opt.offsetMm <= 22.0);
}

export function pickOptimalGuidedDrillOption(
  implantLength: number,
  calibrationOffsetMm: number,
  availableDrillLengthsMm: number[],
  subcrestalDepth = DEFAULT_SIMULATION_PARAMS.subcrestalDepth,
  gingivaThickness = DEFAULT_SIMULATION_PARAMS.gingivaThickness,
  guideHeight = DEFAULT_SIMULATION_PARAMS.guideHeight,
): GuidedDrillOption | null {
  const options = getGuidedDrillOptions(
    implantLength,
    calibrationOffsetMm,
    availableDrillLengthsMm,
    subcrestalDepth,
    gingivaThickness,
    guideHeight,
  );
  if (options.length === 0) return null;

  const clinicalTarget = options.find(
    (opt) => opt.freeSpaceMm >= MIN_CLINICAL_FREE_SPACE_MM - 1e-6 && opt.offsetMm >= guideHeight - 1e-6,
  );
  if (clinicalTarget) return clinicalTarget;

  const nonCompressing = options.find(
    (opt) => opt.freeSpaceMm >= -1e-6 && opt.offsetMm >= guideHeight - 1e-6,
  );
  if (nonCompressing) return nonCompressing;

  return options[options.length - 1];
}

export function pickOptimalGuidedOffset(
  subcrestalDepth: number,
  gingivaThickness: number,
  guideHeight: number,
  hasSleeve: boolean,
  kitId?: string,
  implantLength = DEFAULT_SIMULATION_PARAMS.implantLength,
  calibrationOffsetMm = 12.0,
  availableDrillLengthsMm: number[] = BIOTECH_GUIDED_DRILL_LENGTHS,
): number {
  const options = getGuidedDrillOptions(
    implantLength,
    calibrationOffsetMm,
    availableDrillLengthsMm,
    subcrestalDepth,
    gingivaThickness,
    guideHeight,
  );
  if (!hasSleeve || isMisMguideKitId(kitId)) {
    const nominalCalibrated = options.find(
      (opt) =>
        Math.abs(opt.offsetMm - calibrationOffsetMm) < 0.05 &&
        opt.freeSpaceMm >= MIN_CLINICAL_FREE_SPACE_MM - 1e-6 &&
        opt.offsetMm >= guideHeight - 1e-6,
    );
    if (nominalCalibrated) return nominalCalibrated.offsetMm;
  }
  const opt = pickOptimalGuidedDrillOption(
    implantLength,
    calibrationOffsetMm,
    availableDrillLengthsMm,
    subcrestalDepth,
    gingivaThickness,
    guideHeight,
  );
  if (opt) return opt.offsetMm;
  return roundTo(
    clamp(
      Math.max(guideHeight, subcrestalDepth + gingivaThickness + guideHeight + MIN_CLINICAL_FREE_SPACE_MM),
      4.0,
      22.0,
    ),
    1,
  );
}

export function paramsPatchFromSnapshot(
  snapshot: KitParameterSnapshot,
  implantLength: number,
  kind: KitDrillKind,
  site?: {
    subcrestalDepth?: number;
    gingivaThickness?: number;
    guideHeight?: number;
    calibrationOffsetMm?: number;
    preserveSnapshotOffset?: boolean;
    kitId?: string;
  },
): Partial<SimulationParams> {
  const subcrestal = site?.subcrestalDepth ?? DEFAULT_SIMULATION_PARAMS.subcrestalDepth;
  const gingiva = site?.gingivaThickness ?? DEFAULT_SIMULATION_PARAMS.gingivaThickness;
  const guideH = site?.guideHeight ?? snapshot.guidingHeightMm;
  const calibrationOffset = site?.calibrationOffsetMm ?? snapshot.offsetMm;
  const patch: Partial<SimulationParams> = {
    offsetOverride:
      kind === 'guided' && !site?.preserveSnapshotOffset
        ? pickOptimalGuidedOffset(
            subcrestal,
            gingiva,
            guideH,
            snapshot.hasSleeve,
            site?.kitId,
            implantLength,
            calibrationOffset,
            snapshot.availableLengthsMm,
          )
        : snapshot.offsetMm,
    guideHeight: snapshot.guidingHeightMm,
    guidingDiameter: snapshot.guidingDiameterMm,
    hasSleeve: snapshot.hasSleeve,
    sleeveSeating: snapshot.sleeveSeating,
    sleeveLipThickness: snapshot.sleeveLipThicknessMm,
    sleeveWallThickness: snapshot.sleeveWallThicknessMm,
    drillToSleeveClearance: snapshot.drillToSleeveClearanceMm,
    printingClearance: snapshot.printingClearanceMm,
    surgicalGuideOffset: snapshot.surgicalGuideOffsetMm,
    drillStopThickness: snapshot.drillStopThicknessMm,
    guideTubeExtension: snapshot.guideTubeExtension ?? DEFAULT_SIMULATION_PARAMS.guideTubeExtension,
    handpieceHeadHeight:
      snapshot.handpieceHeadHeightMm ?? DEFAULT_SIMULATION_PARAMS.handpieceHeadHeight,
    subcrestalDepth:
      site?.subcrestalDepth ?? snapshot.subcrestalDepthMm ?? DEFAULT_SIMULATION_PARAMS.subcrestalDepth,
    gingivaThickness:
      site?.gingivaThickness ?? snapshot.gingivaThicknessMm ?? DEFAULT_SIMULATION_PARAMS.gingivaThickness,
  };
  if (kind === 'pilot') {
    patch.pilotDrillLength = pickOptimalPilotLength(
      implantLength,
      snapshot.availableLengthsMm,
      subcrestal,
      gingiva,
      guideH,
    );
  }
  return patch;
}

export function pickClosestPilotLength(desiredTotalMm: number, lengths: number[]): number {
  const sorted = [...lengths].filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return roundTo(clamp(desiredTotalMm, 10, 34), 1);
  let best = sorted[0];
  let bestDist = Math.abs(sorted[0] - desiredTotalMm);
  for (const len of sorted) {
    const dist = Math.abs(len - desiredTotalMm);
    if (dist < bestDist) {
      best = len;
      bestDist = dist;
    }
  }
  return best;
}

export function matchGuidedDrillToImplant(
  implantDiameter: number,
  implantLength: number,
  availableLengths: number[],
  customDrillDiameters?: number[],
  implantToDrillMap?: Record<string, number>,
): {
  spec: BiotechDrillSpec;
  drillCuttingDiameter: number;
  drillPreviousDiameter: number;
  matchedLengthMm: number;
} {
  const key = implantDiameter.toFixed(1);
  const mappedDiameter = implantToDrillMap?.[key];

  // Select the drill spec whose diameter matches custom map, custom drill diameters, or Biotech specs
  let matched = BIOTECH_DRILL_SPECS[0];
  if (typeof mappedDiameter === 'number' && Number.isFinite(mappedDiameter)) {
    const specMatch = BIOTECH_DRILL_SPECS.find((s) => Math.abs(s.diameter - mappedDiameter) < 0.15);
    matched = {
      diameter: mappedDiameter,
      previousDiameter: roundTo(Math.max(1.5, mappedDiameter - 0.6), 1),
      ringColorHex: specMatch?.ringColorHex ?? '#2563EB',
      ringName: specMatch?.ringName ?? null,
    };
  } else if (customDrillDiameters && customDrillDiameters.length > 0) {
    const sortedDias = [...customDrillDiameters].filter((d) => d > 0).sort((a, b) => a - b);
    let chosenDia = sortedDias[0];
    for (const d of sortedDias) {
      if (d <= implantDiameter + 0.05) chosenDia = d;
    }
    const idx = sortedDias.indexOf(chosenDia);
    const prevDia = idx > 0 ? sortedDias[idx - 1] : roundTo(Math.max(1.2, chosenDia * 0.75), 1);
    const specMatch = BIOTECH_DRILL_SPECS.find((s) => Math.abs(s.diameter - chosenDia) < 0.15);
    matched = {
      diameter: chosenDia,
      previousDiameter: prevDia,
      ringColorHex: specMatch?.ringColorHex ?? '#2563EB',
      ringName: specMatch?.ringName ?? null,
    };
  } else {
    for (const spec of BIOTECH_DRILL_SPECS) {
      if (spec.diameter <= implantDiameter + 0.05) {
        matched = spec;
      }
    }
  }
  // Ensure the implant drawn on the schematic is visibly slightly wider than the cutting drill
  const drillCuttingDiameter = Math.min(matched.diameter, roundTo(implantDiameter * 0.9, 2));
  const drillPreviousDiameter = Math.min(
    matched.previousDiameter,
    roundTo(drillCuttingDiameter * 0.8, 2),
  );
  const sorted = [...availableLengths].filter((n) => n > 0).sort((a, b) => a - b);
  let matchedLengthMm = implantLength;
  if (sorted.length > 0) {
    matchedLengthMm = sorted.reduce((prev, curr) =>
      Math.abs(curr - implantLength) < Math.abs(prev - implantLength) ? curr : prev,
    );
  }
  return {
    spec: matched,
    drillCuttingDiameter,
    drillPreviousDiameter,
    matchedLengthMm,
  };
}

export type ResettableParamKey =
  | 'offsetCao'
  | 'guideHeight'
  | 'drillUsefulLength'
  | 'gingivaThickness'
  | 'subcrestalDepth'
  | 'implantLength'
  | 'handpieceHeadHeight'
  | 'printingClearance'
  | 'surgicalGuideOffset'
  | 'guideTubeExtension'
  | 'drillToSleeveClearance'
  | 'sleeveLipThickness'
  | 'sleeveWallThickness'
  | 'drillStopThickness'
  | 'guidingDiameter'
  | 'wizardSleeveLipThickness'
  | 'wizardSleeveWallThickness'
  | 'wizardDrillToSleeveClearance'
  | 'wizardPrintingClearance'
  | 'wizardSurgicalGuideOffset'
  | 'wizardDrillStopThickness'
  | 'wizardGuidingDiameter'
  | 'wizardGuidingHeight'
  | 'wizardDefaultOffset';

export function getDefaultParamPatch(
  key: ResettableParamKey,
  currentParams: SimulationParams,
  activeKit: DrillingKit,
): Partial<SimulationParams> {
  const def = activeKit.userDefaults;
  switch (key) {
    case 'offsetCao':
      return activeKit.kind === 'guided'
        ? {
            offsetOverride: pickOptimalGuidedOffset(
              currentParams.subcrestalDepth,
              currentParams.gingivaThickness,
              currentParams.guideHeight,
              currentParams.hasSleeve,
              activeKit.id,
              currentParams.implantLength,
              activeKit.factoryDefaults.offsetMm,
              def.availableLengthsMm,
            ),
          }
        : { offsetOverride: def.offsetMm };
    case 'guideHeight':
      return { guideHeight: def.guidingHeightMm };
    case 'drillUsefulLength':
      if (activeKit.kind === 'pilot') {
        return {
          pilotDrillLength: pickOptimalPilotLength(
            currentParams.implantLength,
            def.availableLengthsMm,
            currentParams.subcrestalDepth,
            currentParams.gingivaThickness,
            currentParams.guideHeight,
          ),
        };
      }
      return {
        offsetOverride: pickOptimalGuidedOffset(
          currentParams.subcrestalDepth,
          currentParams.gingivaThickness,
          currentParams.guideHeight,
          currentParams.hasSleeve,
          activeKit.id,
          currentParams.implantLength,
          activeKit.factoryDefaults.offsetMm,
          def.availableLengthsMm,
        ),
      };
    case 'gingivaThickness':
      return {
        gingivaThickness:
          def.gingivaThicknessMm ?? DEFAULT_SIMULATION_PARAMS.gingivaThickness,
      };
    case 'subcrestalDepth':
      return {
        subcrestalDepth:
          def.subcrestalDepthMm ?? DEFAULT_SIMULATION_PARAMS.subcrestalDepth,
      };
    case 'implantLength': {
      const defaultLen = DEFAULT_SIMULATION_PARAMS.implantLength;
      if (activeKit.kind === 'pilot') {
        return {
          implantLength: defaultLen,
          pilotDrillLength: pickOptimalPilotLength(
            defaultLen,
            def.availableLengthsMm,
            currentParams.subcrestalDepth,
            currentParams.gingivaThickness,
            currentParams.guideHeight,
          ),
        };
      }
      return {
        implantLength: defaultLen,
        offsetOverride: pickOptimalGuidedOffset(
          currentParams.subcrestalDepth,
          currentParams.gingivaThickness,
          currentParams.guideHeight,
          currentParams.hasSleeve,
          activeKit.id,
          defaultLen,
          activeKit.factoryDefaults.offsetMm,
          def.availableLengthsMm,
        ),
      };
    }
    case 'handpieceHeadHeight':
      return {
        handpieceHeadHeight:
          def.handpieceHeadHeightMm ?? DEFAULT_SIMULATION_PARAMS.handpieceHeadHeight,
      };
    case 'printingClearance':
      return { printingClearance: def.printingClearanceMm };
    case 'surgicalGuideOffset':
      return { surgicalGuideOffset: def.surgicalGuideOffsetMm };
    case 'guideTubeExtension':
      return {
        guideTubeExtension: def.guideTubeExtension ?? DEFAULT_SIMULATION_PARAMS.guideTubeExtension,
      };
    case 'drillToSleeveClearance':
      return { drillToSleeveClearance: def.drillToSleeveClearanceMm };
    case 'sleeveLipThickness':
      return { sleeveLipThickness: def.sleeveLipThicknessMm };
    case 'sleeveWallThickness':
      return { sleeveWallThickness: def.sleeveWallThicknessMm };
    case 'drillStopThickness':
      return { drillStopThickness: def.drillStopThicknessMm };
    case 'guidingDiameter':
      return { guidingDiameter: def.guidingDiameterMm };
    case 'wizardSleeveLipThickness':
      return { wizardSleeveLipThickness: DEFAULT_SIMULATION_PARAMS.wizardSleeveLipThickness };
    case 'wizardSleeveWallThickness':
      return { wizardSleeveWallThickness: DEFAULT_SIMULATION_PARAMS.wizardSleeveWallThickness };
    case 'wizardDrillToSleeveClearance':
      return {
        wizardDrillToSleeveClearance: DEFAULT_SIMULATION_PARAMS.wizardDrillToSleeveClearance,
      };
    case 'wizardPrintingClearance':
      return { wizardPrintingClearance: DEFAULT_SIMULATION_PARAMS.wizardPrintingClearance };
    case 'wizardSurgicalGuideOffset':
      return { wizardSurgicalGuideOffset: DEFAULT_SIMULATION_PARAMS.wizardSurgicalGuideOffset };
    case 'wizardDrillStopThickness':
      return { wizardDrillStopThickness: DEFAULT_SIMULATION_PARAMS.wizardDrillStopThickness };
    case 'wizardGuidingDiameter':
      return { wizardGuidingDiameter: DEFAULT_SIMULATION_PARAMS.wizardGuidingDiameter };
    case 'wizardGuidingHeight':
      return { wizardGuidingHeight: DEFAULT_SIMULATION_PARAMS.wizardGuidingHeight };
    case 'wizardDefaultOffset':
      return { wizardDefaultOffset: DEFAULT_SIMULATION_PARAMS.wizardDefaultOffset };
  }
}

export interface ModifiedDefaultItem {
  key: string;
  label: string;
}

export function getModifiedDefaultItems(
  params: SimulationParams,
  activeKit: DrillingKit,
): ModifiedDefaultItem[] {
  const def = activeKit.userDefaults;
  const items: ModifiedDefaultItem[] = [];

  if (Math.abs(params.surgicalGuideOffset - def.surgicalGuideOffsetMm) >= 0.005) {
    items.push({
      key: 'surgicalGuideOffset',
      label: `Décalage guide (${params.surgicalGuideOffset.toFixed(2)} mm)`,
    });
  }
  if (Math.abs(params.guideHeight - def.guidingHeightMm) >= 0.04) {
    items.push({
      key: 'guideHeight',
      label: `Hauteur guidage (${params.guideHeight.toFixed(1)} mm)`,
    });
  }
  if (Math.abs(params.printingClearance - def.printingClearanceMm) >= 0.005) {
    items.push({
      key: 'printingClearance',
      label: `Jeu 3D (${params.printingClearance.toFixed(2)} mm)`,
    });
  }
  const defExt = def.guideTubeExtension ?? DEFAULT_SIMULATION_PARAMS.guideTubeExtension;
  if (params.guideTubeExtension !== defExt) {
    items.push({
      key: 'guideTubeExtension',
      label: `Prolongement (${params.guideTubeExtension === 'bone' ? 'Os' : 'Gencive'})`,
    });
  }
  const defHandpiece = def.handpieceHeadHeightMm ?? DEFAULT_SIMULATION_PARAMS.handpieceHeadHeight;
  if (Math.abs(params.handpieceHeadHeight - defHandpiece) >= 0.05) {
    items.push({
      key: 'handpieceHeadHeight',
      label: `Contre-angle (${params.handpieceHeadHeight.toFixed(1)} mm)`,
    });
  }
  if (params.hasSleeve !== def.hasSleeve) {
    items.push({
      key: 'hasSleeve',
      label: params.hasSleeve ? 'Avec douille' : 'Sans douille',
    });
  } else if (params.hasSleeve) {
    if (params.sleeveSeating !== def.sleeveSeating) {
      items.push({
        key: 'sleeveSeating',
        label: params.sleeveSeating === 'above' ? 'Douille au-dessus' : 'Douille à fleur',
      });
    }
    if (Math.abs(params.sleeveLipThickness - def.sleeveLipThicknessMm) >= 0.01) {
      items.push({
        key: 'sleeveLipThickness',
        label: `Collerette (${params.sleeveLipThickness.toFixed(2)} mm)`,
      });
    }
    if (Math.abs(params.sleeveWallThickness - def.sleeveWallThicknessMm) >= 0.01) {
      items.push({
        key: 'sleeveWallThickness',
        label: `Paroi douille (${params.sleeveWallThickness.toFixed(2)} mm)`,
      });
    }
    if (Math.abs(params.drillToSleeveClearance - def.drillToSleeveClearanceMm) >= 0.005) {
      items.push({
        key: 'drillToSleeveClearance',
        label: `Jeu douille/foret (${params.drillToSleeveClearance.toFixed(2)} mm)`,
      });
    }
  }

  return items;
}

export function getRevertDefaultsPatch(activeKit: DrillingKit): Partial<SimulationParams> {
  const def = activeKit.userDefaults;
  return {
    surgicalGuideOffset: def.surgicalGuideOffsetMm,
    guideHeight: def.guidingHeightMm,
    printingClearance: def.printingClearanceMm,
    guideTubeExtension: def.guideTubeExtension ?? DEFAULT_SIMULATION_PARAMS.guideTubeExtension,
    handpieceHeadHeight:
      def.handpieceHeadHeightMm ?? DEFAULT_SIMULATION_PARAMS.handpieceHeadHeight,
    subcrestalDepth:
      def.subcrestalDepthMm ?? DEFAULT_SIMULATION_PARAMS.subcrestalDepth,
    gingivaThickness:
      def.gingivaThicknessMm ?? DEFAULT_SIMULATION_PARAMS.gingivaThickness,
    hasSleeve: def.hasSleeve,
    sleeveSeating: def.sleeveSeating,
    sleeveLipThickness: def.sleeveLipThicknessMm,
    sleeveWallThickness: def.sleeveWallThicknessMm,
    drillToSleeveClearance: def.drillToSleeveClearanceMm,
  };
}

export function buildSingleParamSnapshotUpdate(
  key: ResettableParamKey,
  params: SimulationParams,
  geometryOffsetCao: number,
  currentSnapshot: KitParameterSnapshot,
): KitParameterSnapshot {
  const next = { ...currentSnapshot };
  switch (key) {
    case 'offsetCao':
      next.offsetMm = roundTo(geometryOffsetCao, 2);
      break;
    case 'guideHeight':
      next.guidingHeightMm = roundTo(params.guideHeight, 2);
      break;
    case 'surgicalGuideOffset':
      next.surgicalGuideOffsetMm = roundTo(params.surgicalGuideOffset, 2);
      break;
    case 'guideTubeExtension':
      next.guideTubeExtension = params.guideTubeExtension;
      break;
    case 'printingClearance':
      next.printingClearanceMm = roundTo(params.printingClearance, 2);
      break;
    case 'handpieceHeadHeight':
      next.handpieceHeadHeightMm = roundTo(params.handpieceHeadHeight, 1);
      break;
    case 'sleeveLipThickness':
      next.sleeveLipThicknessMm = roundTo(params.sleeveLipThickness, 2);
      break;
    case 'sleeveWallThickness':
      next.sleeveWallThicknessMm = roundTo(params.sleeveWallThickness, 2);
      break;
    case 'drillToSleeveClearance':
      next.drillToSleeveClearanceMm = roundTo(params.drillToSleeveClearance, 2);
      break;
    case 'subcrestalDepth':
      next.subcrestalDepthMm = roundTo(params.subcrestalDepth, 1);
      break;
    case 'gingivaThickness':
      next.gingivaThicknessMm = roundTo(params.gingivaThickness, 1);
      break;
    case 'guidingDiameter':
      next.guidingDiameterMm = roundTo(params.guidingDiameter, 2);
      break;
    case 'drillStopThickness':
      next.drillStopThicknessMm = roundTo(params.drillStopThickness, 2);
      break;
    default:
      break;
  }
  return next;
}

export function evaluateClinicalSafety(
  freeSpaceUnderGuide: number,
  guideHeight: number,
  offsetCao: number,
  minMouthOpeningMm: number,
): SafetyEvaluation {
  const mouthOpeningWarning = minMouthOpeningMm > 42.0;

  if (guideHeight < 3.0 - 1e-6) {
    return {
      status: 'guidance_fault',
      label: 'Défaut de guidage',
      detail: `Hauteur de puits insuffisante (${roundTo(guideHeight, 1)} mm < 3,0 mm min.).`,
      mouthOpeningWarning,
    };
  }

  if (offsetCao < guideHeight - 1e-6) {
    return {
      status: 'guidance_fault',
      label: 'Défaut de guidage',
      detail: `Décalage (${roundTo(offsetCao, 1)} mm) inférieur à la hauteur du guide (${roundTo(guideHeight, 1)} mm).`,
      mouthOpeningWarning,
    };
  }

  if (freeSpaceUnderGuide < -1e-6) {
    return {
      status: 'compression',
      label: 'Compression gingivale',
      detail: `Appui gingival de ${roundTo(Math.abs(freeSpaceUnderGuide), 1)} mm — prévoir lambeau ou décalage accru.`,
      mouthOpeningWarning,
    };
  }

  return {
    status: 'optimal',
    label: 'Optimal',
    detail: `Guidage stable (${roundTo(guideHeight, 1)} mm) · ${roundTo(freeSpaceUnderGuide, 1)} mm sous le puits.`,
    mouthOpeningWarning,
  };
}

export function computeClinicalSuggestion(
  params: SimulationParams,
  activeKit: DrillingKit,
  offsetCao: number,
  drillUsefulLength: number,
  freeSpaceUnderGuide: number,
  _minMouthOpeningMm: number,
): ClinicalSuggestion | null {
  if (params.mode === 'caliper') return null;

  if (activeKit.kind === 'guided') {
    const calibrationOffset = activeKit.factoryDefaults.offsetMm;
    const options = getGuidedDrillOptions(
      params.implantLength,
      calibrationOffset,
      activeKit.userDefaults.availableLengthsMm,
      params.subcrestalDepth,
      params.gingivaThickness,
      params.guideHeight,
    );
    const smallestSafeOption = pickOptimalGuidedDrillOption(
      params.implantLength,
      calibrationOffset,
      activeKit.userDefaults.availableLengthsMm,
      params.subcrestalDepth,
      params.gingivaThickness,
      params.guideHeight,
    );
    const nominalCalibratedOption =
      !params.hasSleeve || isMisMguideKitId(activeKit.id)
        ? options.find(
            (opt) =>
              Math.abs(opt.offsetMm - calibrationOffset) < 0.05 &&
              opt.freeSpaceMm >= MIN_CLINICAL_FREE_SPACE_MM - 1e-6 &&
              opt.offsetMm >= params.guideHeight - 1e-6,
          ) ?? null
        : null;
    const optimalOption = nominalCalibratedOption ?? smallestSafeOption;

    if (optimalOption) {
      const currentDrillLen = matchGuidedDrillToImplant(
        params.implantDiameter,
        Math.max(1.0, roundTo(drillUsefulLength - calibrationOffset, 2)),
        activeKit.userDefaults.availableLengthsMm,
        activeKit.userDefaults.drillDiametersMm,
        activeKit.userDefaults.implantToDrillDiameterMap,
      ).matchedLengthMm;

      if (
        optimalOption.offsetMm < offsetCao - 0.4 &&
        optimalOption.freeSpaceMm >= MIN_CLINICAL_FREE_SPACE_MM - 1e-6 &&
        optimalOption.offsetMm >= params.guideHeight - 1e-6 &&
        freeSpaceUnderGuide > MIN_CLINICAL_FREE_SPACE_MM + 0.3
      ) {
        const savedMm = roundTo(offsetCao - optimalOption.offsetMm, 1);
        const drillNote =
          Math.abs(optimalOption.drillLengthMm - currentDrillLen) > 0.1
            ? `avec le foret de ${roundTo(optimalOption.drillLengthMm, 1)} mm au lieu de ${roundTo(currentDrillLen, 1)} mm`
            : `avec le foret de ${roundTo(optimalOption.drillLengthMm, 1)} mm de votre gamme`;
        return {
          id: 'optimize-guided-offset',
          title: `Suggestion : utiliser le foret de ${roundTo(optimalOption.drillLengthMm, 1)} mm (décalage ${optimalOption.offsetMm.toFixed(1)} mm)`,
          detail: `En passant ${drillNote} (${optimalOption.freeSpaceMm.toFixed(1)} mm sous le puits), l'encombrement en bouche diminue de ${savedMm.toFixed(1)} mm.`,
          actionLabel: `Passer à ${optimalOption.offsetMm.toFixed(1)} mm`,
          patch: { offsetOverride: optimalOption.offsetMm },
        };
      }

      if (
        (freeSpaceUnderGuide < MIN_CLINICAL_FREE_SPACE_MM - 0.1 || offsetCao < params.guideHeight - 0.1) &&
        optimalOption.offsetMm > offsetCao + 0.4 &&
        optimalOption.freeSpaceMm >= 0
      ) {
        return {
          id: 'restore-guided-clearance',
          title: `Dégagement insuffisant : passer au foret de ${roundTo(optimalOption.drillLengthMm, 1)} mm (${optimalOption.offsetMm.toFixed(1)} mm)`,
          detail: `Le foret de ${roundTo(optimalOption.drillLengthMm, 1)} mm de votre gamme rétablit ${optimalOption.freeSpaceMm.toFixed(1)} mm de dégagement gingival.`,
          actionLabel: `Passer à ${optimalOption.offsetMm.toFixed(1)} mm`,
          patch: { offsetOverride: optimalOption.offsetMm },
        };
      }
    }
  } else {
    // Pilot kit: systematically propose the smallest clinically usable pilot drill
    const optimalPilot = pickOptimalPilotLength(
      params.implantLength,
      activeKit.userDefaults.availableLengthsMm,
      params.subcrestalDepth,
      params.gingivaThickness,
      params.guideHeight,
    );
    const optimalOffset = roundTo(optimalPilot - params.implantLength, 2);
    const optimalFreeSpace = roundTo(
      optimalOffset - params.subcrestalDepth - params.gingivaThickness - params.guideHeight,
      1,
    );

    if (
      optimalPilot < drillUsefulLength - 0.1 &&
      optimalFreeSpace >= MIN_CLINICAL_FREE_SPACE_MM - 1e-6 &&
      optimalOffset >= params.guideHeight - 1e-6
    ) {
      const savedMm = roundTo(drillUsefulLength - optimalPilot, 1);
      return {
        id: 'shorten-pilot-drill',
        title: `Suggestion : foret pilote L${roundTo(optimalPilot, 1)} plus court`,
        detail: `Plus petit foret cliniquement utilisable (${optimalFreeSpace.toFixed(1)} mm sous le puits) : gagnez ${savedMm.toFixed(1)} mm d'ouverture en bouche.`,
        actionLabel: `Passer à L${roundTo(optimalPilot, 1)}`,
        patch: { pilotDrillLength: optimalPilot },
      };
    }

    if (
      (freeSpaceUnderGuide < MIN_CLINICAL_FREE_SPACE_MM - 0.1 || offsetCao < params.guideHeight - 0.1) &&
      optimalPilot > drillUsefulLength + 0.1 &&
      optimalFreeSpace >= 0
    ) {
      return {
        id: 'lengthen-pilot-drill',
        title: `Dégagement insuffisant : passer au foret L${roundTo(optimalPilot, 1)}`,
        detail: `Le foret L${roundTo(optimalPilot, 1)} rétablit un dégagement clinique sûr de ${optimalFreeSpace.toFixed(1)} mm sous le puits.`,
        actionLabel: `Passer à L${roundTo(optimalPilot, 1)}`,
        patch: { pilotDrillLength: optimalPilot },
      };
    }
  }

  return null;
}

export function computeImplantGeometry(
  params: SimulationParams,
  kits: DrillingKit[] = FACTORY_DRILLING_KITS,
): ComputedGeometry {
  const activeKit = kits.find((k) => k.id === params.activeKitId) ?? kits[0] ?? FACTORY_DRILLING_KITS[0];

  const implantLength = clamp(params.implantLength, 4.0, 20.0);
  const implantDiameter = clamp(params.implantDiameter, 2.5, 6.5);
  const subcrestalDepth = clamp(params.subcrestalDepth, 0.0, 5.0);
  const gingivaThickness = clamp(params.gingivaThickness, 0.5, 8.0);
  const handpieceHeadHeight = clamp(params.handpieceHeadHeight, 9.0, 18.0);

  const isCaliperMode = params.mode === 'caliper';
  const isPilotKit = isCaliperMode
    ? params.wizardKind === 'pilot'
    : activeKit.kind === 'pilot';

  const guideHeight = clamp(
    isCaliperMode ? params.wizardGuidingHeight : params.guideHeight,
    1.5,
    10.0,
  );
  const canonDiameter = clamp(
    isCaliperMode ? params.wizardGuidingDiameter : params.guidingDiameter,
    1.5,
    6.5,
  );
  const showSleeve = isCaliperMode ? params.wizardHasSleeve : params.hasSleeve;
  const sleeveSeating: SleeveSeating = isCaliperMode
    ? params.wizardSleeveSeating
    : params.sleeveSeating;
  const sleeveLipThicknessMm = showSleeve
    ? clamp(
        isCaliperMode ? params.wizardSleeveLipThickness : params.sleeveLipThickness,
        0.0,
        2.5,
      )
    : 0.0;
  const sleeveWallThicknessMm = showSleeve
    ? clamp(
        isCaliperMode ? params.wizardSleeveWallThickness : params.sleeveWallThickness,
        0.1,
        1.5,
      )
    : 0.0;
  const drillToSleeveClearanceMm = showSleeve
    ? clamp(
        isCaliperMode ? params.wizardDrillToSleeveClearance : params.drillToSleeveClearance,
        0.0,
        0.6,
      )
    : 0.0;
  const printingClearanceMm = clamp(
    isCaliperMode ? params.wizardPrintingClearance : params.printingClearance,
    0.0,
    0.8,
  );
  const surgicalGuideOffsetMm = roundTo(
    clamp(
      isCaliperMode ? params.wizardSurgicalGuideOffset : params.surgicalGuideOffset,
      0.05,
      0.8,
    ),
    2,
  );
  const drillStopThicknessMm = clamp(
    isCaliperMode ? params.wizardDrillStopThickness : params.drillStopThickness,
    0.5,
    4.0,
  );

  let offsetCao: number;
  let drillUsefulLength: number;
  let matchedGuidedDrillLengthMm = implantLength;
  let drillActiveDiameter = 2.0;
  let drillPreviousDiameter = 1.5;
  let drillRingColorHex: string | null = '#2563EB';
  let drillMarking = '';

  if (isCaliperMode) {
    if (isPilotKit) {
      drillUsefulLength = clamp(
        params.wizardDefaultOffset + implantLength,
        10.0,
        34.0,
      );
      offsetCao = roundTo(drillUsefulLength - implantLength, 2);
      const pilotDia = params.wizardDrillDiameters[0] ?? canonDiameter;
      drillActiveDiameter = Math.min(pilotDia, roundTo(implantDiameter * 0.85, 2));
      drillPreviousDiameter = drillActiveDiameter;
      drillRingColorHex = null;
      drillMarking = `Ø${roundTo(pilotDia, 1)} · L${roundTo(drillUsefulLength, 1)}`;
    } else {
      offsetCao = clamp(params.wizardDefaultOffset, 4.0, 22.0);
      drillUsefulLength = roundTo(offsetCao + implantLength, 2);
      const matched = matchGuidedDrillToImplant(
        implantDiameter,
        implantLength,
        params.wizardAvailableLengths,
        params.wizardDrillDiameters,
        params.wizardImplantToDrillDiameterMap,
      );
      matchedGuidedDrillLengthMm = matched.matchedLengthMm;
      drillActiveDiameter = matched.drillCuttingDiameter;
      drillPreviousDiameter = matched.drillPreviousDiameter;
      drillRingColorHex = matched.spec.ringColorHex ?? '#2563EB';
      drillMarking = `Ø${matched.spec.diameter.toFixed(1)}`;
    }
  } else if (isPilotKit) {
    drillUsefulLength = clamp(params.pilotDrillLength, 10.0, 34.0);
    offsetCao = roundTo(drillUsefulLength - implantLength, 2);
    const pilotDia = activeKit.userDefaults.drillDiametersMm[0] ?? canonDiameter;
    drillActiveDiameter = Math.min(pilotDia, roundTo(implantDiameter * 0.85, 2));
    drillPreviousDiameter = drillActiveDiameter;
    drillRingColorHex = null;
    drillMarking = `Ø${roundTo(pilotDia, 1)} · L${roundTo(drillUsefulLength, 1)}`;
  } else {
    offsetCao = clamp(params.offsetOverride, 4.0, 22.0);
    drillUsefulLength = roundTo(offsetCao + implantLength, 2);
    const calibrationOffset = activeKit.factoryDefaults.offsetMm;
    const effectiveCatalogueLength = Math.max(
      1.0,
      roundTo(drillUsefulLength - calibrationOffset, 2),
    );
    const matched = matchGuidedDrillToImplant(
      implantDiameter,
      effectiveCatalogueLength,
      activeKit.userDefaults.availableLengthsMm,
      activeKit.userDefaults.drillDiametersMm,
      activeKit.userDefaults.implantToDrillDiameterMap,
    );
    matchedGuidedDrillLengthMm = matched.matchedLengthMm;
    drillActiveDiameter = matched.drillCuttingDiameter;
    drillPreviousDiameter = matched.drillPreviousDiameter;
    drillRingColorHex = matched.spec.ringColorHex;
    drillMarking = `Ø${matched.spec.diameter.toFixed(1)} · ${matched.matchedLengthMm} mm`;
  }

  // Mechanical drill-to-guide clearance (for deviation cone & bore inside sleeve/resin)
  const wellDiameter = roundTo(
    canonDiameter + (showSleeve ? drillToSleeveClearanceMm : printingClearanceMm),
    2,
  );
  const diametralClearance = roundTo(Math.max(0, wellDiameter - canonDiameter), 3);
  const radialClearance = roundTo(diametralClearance / 2, 3);

  // Blue Sky Plan specific calculations:
  // - If sleeve sits ABOVE guide resin, subtract sleeve lip thickness from total offset.
  // - If sleeve sits FLUSH with guide resin (or no sleeve), deduction is 0.
  const effectiveLipDeduction =
    showSleeve && sleeveSeating === 'above' ? sleeveLipThicknessMm : 0.0;
  const bspGuideOffsetMm = roundTo(offsetCao - effectiveLipDeduction, 2);

  // - Without sleeve: canon + 3D printing clearance
  // - With sleeve: canon + drill-to-sleeve clearance + 2 * sleeve wall + 3D printing clearance
  const bspGuideHoleDiameterMm = roundTo(
    canonDiameter +
      (showSleeve ? drillToSleeveClearanceMm + 2 * sleeveWallThicknessMm : 0) +
      printingClearanceMm,
    2,
  );
  const bspSleeveHeightMm = roundTo(guideHeight, 2);

  // Vertical planes relative to Bone Crest (y = 0; +down/apical, -up/coronal)
  const yBoneCrest = 0;
  const yGingivaTop = roundTo(-gingivaThickness, 2);
  const yImplantPlatform = roundTo(subcrestalDepth, 2);
  const yImplantApex = roundTo(yImplantPlatform + implantLength, 2);
  const yGuideTop = roundTo(yImplantPlatform - offsetCao, 2);
  const yResinGuideTop = roundTo(yGuideTop + effectiveLipDeduction, 2);
  const yGuideBottom = roundTo(yGuideTop + guideHeight, 2);
  const yDrillTip = roundTo(yGuideTop + drillUsefulLength, 2);

  const freeSpaceUnderGuide = roundTo(yGingivaTop - yGuideBottom, 2);

  const tanTheta = guideHeight > 0 ? diametralClearance / guideHeight : 0;
  const deviationAngleDeg = roundTo((Math.atan(tanTheta) * 180) / Math.PI, 2);
  const leverArmToApex = Math.max(0, drillUsefulLength - guideHeight / 2);
  const apicalDeviationMm = roundTo(leverArmToApex * tanTheta, 2);

  const minMouthOpeningMm = roundTo(drillUsefulLength + handpieceHeadHeight, 1);

  const safety = evaluateClinicalSafety(
    freeSpaceUnderGuide,
    guideHeight,
    offsetCao,
    minMouthOpeningMm,
  );

  const suggestion = computeClinicalSuggestion(
    params,
    activeKit,
    offsetCao,
    drillUsefulLength,
    freeSpaceUnderGuide,
    minMouthOpeningMm,
  );

  return {
    activeKit,
    offsetCao: roundTo(offsetCao, 2),
    drillUsefulLength: roundTo(drillUsefulLength, 2),
    matchedGuidedDrillLengthMm,
    totalDrillingDepthFromStop: roundTo(drillUsefulLength, 2),
    intraosseousDepthFromCrest: roundTo(yImplantApex, 2),
    freeSpaceUnderGuide,
    surgicalGuideOffsetMm,
    guideTubeExtension: params.guideTubeExtension,
    wellDiameter,
    canonDiameter: roundTo(canonDiameter, 2),
    diametralClearance,
    radialClearance,
    guideHeight: roundTo(guideHeight, 2),
    deviationAngleDeg,
    apicalDeviationMm,
    minMouthOpeningMm,
    yBoneCrest,
    yGingivaTop,
    yImplantPlatform,
    yImplantApex,
    yGuideTop,
    yResinGuideTop,
    yGuideBottom,
    yDrillTip,
    showSleeve,
    drillActiveDiameter,
    drillPreviousDiameter,
    drillRingColorHex,
    drillMarking,
    isPilotKit,
    blueSkyPlan: {
      guideOffsetMm: bspGuideOffsetMm,
      guideHoleDiameterMm: bspGuideHoleDiameterMm,
      sleeveHeightMm: bspSleeveHeightMm,
      hasSleeve: showSleeve,
      sleeveSeating,
      sleeveLipThicknessMm: roundTo(sleeveLipThicknessMm, 2),
      sleeveWallThicknessMm: roundTo(sleeveWallThicknessMm, 2),
      drillToSleeveClearanceMm: roundTo(drillToSleeveClearanceMm, 2),
      printingClearanceMm: roundTo(printingClearanceMm, 2),
      drillStopThicknessMm: roundTo(drillStopThicknessMm, 2),
      totalOffsetFromImplantMm: roundTo(offsetCao, 2),
    },
    safety,
    suggestion,
  };
}

export function computePilotComparison(
  params: SimulationParams,
  kits: DrillingKit[],
): PilotComparisonRow[] {
  const activeKit = kits.find((k) => k.id === params.activeKitId) ?? kits[0];
  const lengths = [...activeKit.userDefaults.availableLengthsMm].sort((a, b) => a - b);
  return lengths.map((lengthMm) => {
    const geom = computeImplantGeometry(
      {
        ...params,
        mode: 'kit',
        pilotDrillLength: lengthMm,
      },
      kits,
    );
    return {
      lengthMm,
      marking: `L${roundTo(lengthMm, 1)}`,
      offsetCao: geom.offsetCao,
      bspGuideOffset: geom.blueSkyPlan.guideOffsetMm,
      freeSpaceUnderGuide: geom.freeSpaceUnderGuide,
      minMouthOpeningMm: geom.minMouthOpeningMm,
      apicalDeviationMm: geom.apicalDeviationMm,
      deviationAngleDeg: geom.deviationAngleDeg,
      safety: geom.safety,
    };
  });
}

export const DRILLING_KITS_STORAGE_KEY = 'orthoguide_drilling_kits_v4';

function sanitizeNumberArray(raw: unknown, fallback: number[]): number[] {
  if (!Array.isArray(raw)) return [...fallback];
  const filtered = raw.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0);
  return filtered.length > 0 ? filtered : [...fallback];
}

function sanitizeSnapshot(raw: unknown, fallback: KitParameterSnapshot): KitParameterSnapshot {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const obj = raw as Record<string, unknown>;
  const num = (v: unknown, def: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : def;
  const rawMap =
    obj.implantToDrillDiameterMap && typeof obj.implantToDrillDiameterMap === 'object'
      ? (obj.implantToDrillDiameterMap as Record<string, unknown>)
      : undefined;
  let cleanMap: Record<string, number> | undefined = fallback.implantToDrillDiameterMap
    ? { ...fallback.implantToDrillDiameterMap }
    : undefined;
  if (rawMap) {
    cleanMap = {};
    for (const [k, v] of Object.entries(rawMap)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        cleanMap[k] = v;
      }
    }
  }
  return {
    offsetMm: num(obj.offsetMm, fallback.offsetMm),
    guidingHeightMm: num(obj.guidingHeightMm, fallback.guidingHeightMm),
    guidingDiameterMm: num(obj.guidingDiameterMm, fallback.guidingDiameterMm),
    hasSleeve: typeof obj.hasSleeve === 'boolean' ? obj.hasSleeve : fallback.hasSleeve,
    sleeveSeating: obj.sleeveSeating === 'flush' ? 'flush' : 'above',
    sleeveLipThicknessMm: num(obj.sleeveLipThicknessMm, fallback.sleeveLipThicknessMm),
    sleeveWallThicknessMm: num(obj.sleeveWallThicknessMm, fallback.sleeveWallThicknessMm),
    drillToSleeveClearanceMm: num(obj.drillToSleeveClearanceMm, fallback.drillToSleeveClearanceMm),
    printingClearanceMm: num(obj.printingClearanceMm, fallback.printingClearanceMm),
    surgicalGuideOffsetMm: num(obj.surgicalGuideOffsetMm, fallback.surgicalGuideOffsetMm),
    drillStopThicknessMm: num(obj.drillStopThicknessMm, fallback.drillStopThicknessMm),
    guideTubeExtension:
      obj.guideTubeExtension === 'bone' || obj.guideTubeExtension === 'gingiva'
        ? obj.guideTubeExtension
        : fallback.guideTubeExtension,
    handpieceHeadHeightMm:
      typeof obj.handpieceHeadHeightMm === 'number' && Number.isFinite(obj.handpieceHeadHeightMm)
        ? obj.handpieceHeadHeightMm
        : fallback.handpieceHeadHeightMm,
    subcrestalDepthMm:
      typeof obj.subcrestalDepthMm === 'number' && Number.isFinite(obj.subcrestalDepthMm)
        ? obj.subcrestalDepthMm
        : fallback.subcrestalDepthMm,
    gingivaThicknessMm:
      typeof obj.gingivaThicknessMm === 'number' && Number.isFinite(obj.gingivaThicknessMm)
        ? obj.gingivaThicknessMm
        : fallback.gingivaThicknessMm,
    availableLengthsMm: sanitizeNumberArray(obj.availableLengthsMm, fallback.availableLengthsMm),
    drillDiametersMm: sanitizeNumberArray(obj.drillDiametersMm, fallback.drillDiametersMm),
    implantDiametersMm: sanitizeNumberArray(obj.implantDiametersMm, fallback.implantDiametersMm),
    implantLengthsMm: sanitizeNumberArray(obj.implantLengthsMm, fallback.implantLengthsMm),
    implantToDrillDiameterMap: cleanMap,
  };
}

export function loadDrillingKitsFromStorage(): DrillingKit[] {
  if (typeof window === 'undefined') return FACTORY_DRILLING_KITS;
  try {
    const currentRaw = window.localStorage.getItem(DRILLING_KITS_STORAGE_KEY);
    const legacyRaw =
      currentRaw ??
      window.localStorage.getItem('orthoguide_drilling_kits_v3') ??
      window.localStorage.getItem('orthoguide_drilling_kits_v2');
    const isMigratingFromLegacy = !currentRaw && Boolean(legacyRaw);
    const raw = legacyRaw;
    if (!raw) return FACTORY_DRILLING_KITS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FACTORY_DRILLING_KITS;

    const loadedById = new Map<string, DrillingKit>();
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      let id = typeof obj.id === 'string' ? obj.id : `kit-${Date.now()}`;
      if (id === 'factory-biotech-sleeveless' || id === 'factory-biotech-mastertube') {
        id = 'factory-biotech-kontact';
      }
      const factoryMatch = FACTORY_DRILLING_KITS.find((f) => f.id === id);
      const baseFallback = factoryMatch?.factoryDefaults ?? FACTORY_DRILLING_KITS[0].factoryDefaults;
      const factoryDefaults = sanitizeSnapshot(obj.factoryDefaults, baseFallback);
      const userDefaults = sanitizeSnapshot(obj.userDefaults, factoryDefaults);
      const history: KitHistoryEntry[] = Array.isArray(obj.history)
        ? obj.history
            .filter((h): h is Record<string, unknown> => Boolean(h && typeof h === 'object'))
            .map((h) => ({
              id: typeof h.id === 'string' ? h.id : `hist-${Date.now()}`,
              savedAt: typeof h.savedAt === 'string' ? h.savedAt : new Date().toISOString(),
              label: typeof h.label === 'string' ? h.label : 'Réglage sauvegardé',
              snapshot: sanitizeSnapshot(h.snapshot, userDefaults),
            }))
        : [];
      loadedById.set(id, {
        id,
        name: factoryMatch?.name ?? (typeof obj.name === 'string' ? obj.name : 'Système personnalisé'),
        brandLabel:
          factoryMatch?.brandLabel ??
          (typeof obj.brandLabel === 'string' ? obj.brandLabel : 'Système personnalisé'),
        systemGroupId:
          factoryMatch?.systemGroupId ??
          (typeof obj.systemGroupId === 'string' ? obj.systemGroupId : undefined),
        systemGroupName:
          factoryMatch?.systemGroupName ??
          (typeof obj.systemGroupName === 'string' ? obj.systemGroupName : undefined),
        subSystemLabel:
          factoryMatch?.subSystemLabel ??
          (typeof obj.subSystemLabel === 'string' ? obj.subSystemLabel : undefined),
        implantBrandName:
          factoryMatch?.implantBrandName ??
          (typeof obj.implantBrandName === 'string' ? obj.implantBrandName : undefined),
        implantModelName:
          factoryMatch?.implantModelName ??
          (typeof obj.implantModelName === 'string' ? obj.implantModelName : undefined),
        isFactory: Boolean(factoryMatch ?? obj.isFactory),
        kind: obj.kind === 'pilot' ? 'pilot' : 'guided',
        usageCount:
          typeof obj.usageCount === 'number' && Number.isFinite(obj.usageCount)
            ? obj.usageCount
            : 1,
        lastUsedAt:
          typeof obj.lastUsedAt === 'string' ? obj.lastUsedAt : new Date().toISOString(),
        factoryDefaults,
        userDefaults,
        history,
      });
    }

    for (const f of FACTORY_DRILLING_KITS) {
      if (!loadedById.has(f.id)) {
        loadedById.set(f.id, f);
      } else if (f.id === 'factory-biotech-kontact') {
        const existing = loadedById.get(f.id)!;
        const isUnmodifiedLegacyOffset =
          existing.history.length === 0 &&
          (existing.userDefaults.offsetMm === 12.0 ||
            existing.userDefaults.offsetMm === 10.0 ||
            existing.userDefaults.offsetMm === 8.0);
        const hasLegacyThreeLengths =
          existing.userDefaults.availableLengthsMm.length === 3 &&
          existing.userDefaults.availableLengthsMm[0] === 8 &&
          existing.userDefaults.availableLengthsMm[2] === 12;
        const hasLegacyImplantLengths =
          existing.userDefaults.implantLengthsMm.length === 3 &&
          existing.userDefaults.implantLengthsMm[0] === 8 &&
          existing.userDefaults.implantLengthsMm[2] === 12;
        loadedById.set(f.id, {
          ...existing,
          name: f.name,
          brandLabel: f.brandLabel,
          systemGroupId: f.systemGroupId,
          systemGroupName: f.systemGroupName,
          subSystemLabel: f.subSystemLabel,
          factoryDefaults: f.factoryDefaults,
          userDefaults: {
            ...existing.userDefaults,
            availableLengthsMm: hasLegacyThreeLengths
              ? [...BIOTECH_GUIDED_DRILL_LENGTHS]
              : existing.userDefaults.availableLengthsMm,
            implantLengthsMm: hasLegacyImplantLengths
              ? [...BIOTECH_KONTACT_LENGTHS]
              : existing.userDefaults.implantLengthsMm,
            offsetMm: isUnmodifiedLegacyOffset
              ? f.userDefaults.offsetMm
              : existing.userDefaults.offsetMm,
          },
        });
      } else if (f.id === 'factory-globald-pilot') {
        const existing = loadedById.get(f.id)!;
        const hasLegacy17 =
          existing.userDefaults.availableLengthsMm.length === 7 &&
          existing.userDefaults.availableLengthsMm[0] === 17 &&
          existing.userDefaults.availableLengthsMm[1] === 17.3;
        const isUnmodifiedLegacyOffset =
          existing.history.length === 0 && existing.userDefaults.offsetMm === 10.5;
        const resetTubelessOnMigration = isMigratingFromLegacy && existing.history.length === 0;
        loadedById.set(f.id, {
          ...existing,
          name: f.name,
          brandLabel: f.brandLabel,
          systemGroupId: f.systemGroupId,
          systemGroupName: f.systemGroupName,
          subSystemLabel: f.subSystemLabel,
          factoryDefaults: f.factoryDefaults,
          userDefaults: {
            ...existing.userDefaults,
            availableLengthsMm: hasLegacy17
              ? [...GLOBAL_D_PILOT_DRILL_LENGTHS]
              : existing.userDefaults.availableLengthsMm,
            offsetMm: isUnmodifiedLegacyOffset
              ? f.factoryDefaults.offsetMm
              : existing.userDefaults.offsetMm,
            hasSleeve: resetTubelessOnMigration ? false : existing.userDefaults.hasSleeve,
            printingClearanceMm: resetTubelessOnMigration
              ? 0.15
              : existing.userDefaults.printingClearanceMm,
          },
        });
      } else if (f.id === 'factory-mis-mguide') {
        const existing = loadedById.get(f.id)!;
        const isInitialMisV1 =
          existing.history.length === 0 &&
          existing.userDefaults.offsetMm === 10.0 &&
          existing.userDefaults.guidingHeightMm === 4.5 &&
          existing.userDefaults.guidingDiameterMm === 5.0;
        const resetTubelessOnMigration = isMigratingFromLegacy && existing.history.length === 0;
        const baseUserDefaults = isInitialMisV1
          ? { ...f.userDefaults, hasSleeve: existing.userDefaults.hasSleeve }
          : existing.userDefaults;
        loadedById.set(f.id, {
          ...existing,
          name: f.name,
          brandLabel: f.brandLabel,
          systemGroupId: f.systemGroupId,
          systemGroupName: f.systemGroupName,
          subSystemLabel: f.subSystemLabel,
          implantModelName: f.implantModelName,
          factoryDefaults: f.factoryDefaults,
          userDefaults: resetTubelessOnMigration
            ? { ...baseUserDefaults, hasSleeve: false, printingClearanceMm: 0.15 }
            : baseUserDefaults,
        });
      } else if (f.id === 'factory-mis-mguide-narrow') {
        const existing = loadedById.get(f.id)!;
        const resetTubelessOnMigration = isMigratingFromLegacy && existing.history.length === 0;
        loadedById.set(f.id, {
          ...existing,
          name: f.name,
          brandLabel: f.brandLabel,
          systemGroupId: f.systemGroupId,
          systemGroupName: f.systemGroupName,
          subSystemLabel: f.subSystemLabel,
          implantModelName: f.implantModelName,
          factoryDefaults: f.factoryDefaults,
          userDefaults: resetTubelessOnMigration
            ? { ...existing.userDefaults, hasSleeve: false, printingClearanceMm: 0.15 }
            : existing.userDefaults,
        });
      }
    }

    return Array.from(loadedById.values());
  } catch {
    return FACTORY_DRILLING_KITS;
  }
}

export function saveDrillingKitsToStorage(kits: DrillingKit[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRILLING_KITS_STORAGE_KEY, JSON.stringify(kits));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function sortKitsByUsage(kits: DrillingKit[]): DrillingKit[] {
  return [...kits].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return b.lastUsedAt.localeCompare(a.lastUsedAt);
  });
}

export function sortKitsAlphabetically(kits: DrillingKit[]): DrillingKit[] {
  return [...kits].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
  );
}

export interface DrillingSystemGroup {
  groupId: string;
  groupName: string;
  kind: KitDrillKind;
  kits: DrillingKit[];
  usageCount: number;
  lastUsedAt: string;
}

export function groupDrillingKitsBySystem(kits: DrillingKit[]): DrillingSystemGroup[] {
  const groupsMap = new Map<string, DrillingKit[]>();
  for (const kit of kits) {
    const gid = kit.systemGroupId ?? kit.id;
    const list = groupsMap.get(gid) ?? [];
    list.push(kit);
    groupsMap.set(gid, list);
  }

  const groups: DrillingSystemGroup[] = Array.from(groupsMap.entries()).map(
    ([groupId, groupKits]) => {
      // Preserve deterministic sub-system order (Narrow first as default, Standard second)
      const orderedSubKits = [...groupKits].sort((a, b) => {
        if (a.id === 'factory-mis-mguide-narrow' && b.id === 'factory-mis-mguide') return -1;
        if (a.id === 'factory-mis-mguide' && b.id === 'factory-mis-mguide-narrow') return 1;
        return (a.subSystemLabel ?? a.name).localeCompare(
          b.subSystemLabel ?? b.name,
          'fr',
          { sensitivity: 'base' },
        );
      });
      const primary = orderedSubKits[0];
      const maxUsage = Math.max(...orderedSubKits.map((k) => k.usageCount));
      const latestUsedAt = orderedSubKits.reduce(
        (best, k) => (k.lastUsedAt > best ? k.lastUsedAt : best),
        orderedSubKits[0].lastUsedAt,
      );
      return {
        groupId,
        groupName: primary.systemGroupName ?? primary.name,
        kind: primary.kind,
        kits: orderedSubKits,
        usageCount: maxUsage,
        lastUsedAt: latestUsedAt,
      };
    },
  );

  return groups.sort((a, b) =>
    a.groupName.localeCompare(b.groupName, 'fr', { sensitivity: 'base' }),
  );
}

export interface DrillingSystemsLayout {
  mainGroupIds: string[];
  libraryGroupIds: string[];
}

export const DRILLING_SYSTEMS_LAYOUT_STORAGE_KEY = 'orthoguide_drilling_systems_layout_v1';

export function resolveDrillingSystemsLayout(
  kits: DrillingKit[],
  savedLayout: DrillingSystemsLayout | null,
): { mainGroups: DrillingSystemGroup[]; libraryGroups: DrillingSystemGroup[] } {
  const allAlphaGroups = groupDrillingKitsBySystem(kits);
  if (!savedLayout) {
    return {
      mainGroups: allAlphaGroups.slice(0, 3),
      libraryGroups: allAlphaGroups.slice(3),
    };
  }

  const byId = new Map(allAlphaGroups.map((g) => [g.groupId, g]));
  const assigned = new Set<string>();
  const mainGroups: DrillingSystemGroup[] = [];
  const libraryGroups: DrillingSystemGroup[] = [];

  for (const id of savedLayout.mainGroupIds) {
    const group = byId.get(id);
    if (group && !assigned.has(id)) {
      mainGroups.push(group);
      assigned.add(id);
    }
  }

  for (const id of savedLayout.libraryGroupIds) {
    const group = byId.get(id);
    if (group && !assigned.has(id)) {
      libraryGroups.push(group);
      assigned.add(id);
    }
  }

  for (const group of allAlphaGroups) {
    if (!assigned.has(group.groupId)) {
      if (mainGroups.length < 3) {
        mainGroups.push(group);
      } else {
        libraryGroups.push(group);
      }
      assigned.add(group.groupId);
    }
  }

  return { mainGroups, libraryGroups };
}

export function reorderDrillingSystemGroups(
  currentMainIds: string[],
  currentLibraryIds: string[],
  draggedGroupId: string,
  targetZone: 'main' | 'library',
  targetIndex?: number,
): DrillingSystemsLayout {
  const nextMain = currentMainIds.filter((id) => id !== draggedGroupId);
  const nextLibrary = currentLibraryIds.filter((id) => id !== draggedGroupId);
  const targetList = targetZone === 'main' ? nextMain : nextLibrary;
  const sourceList = targetZone === 'main' ? currentMainIds : currentLibraryIds;

  const rawIndex =
    typeof targetIndex === 'number' && Number.isFinite(targetIndex)
      ? targetIndex
      : targetList.length;
  const oldIndexInTarget = sourceList.indexOf(draggedGroupId);
  const adjustedIndex =
    oldIndexInTarget !== -1 && oldIndexInTarget < rawIndex ? rawIndex - 1 : rawIndex;
  const clampedIndex = Math.max(0, Math.min(targetList.length, adjustedIndex));

  targetList.splice(clampedIndex, 0, draggedGroupId);

  return {
    mainGroupIds: nextMain,
    libraryGroupIds: nextLibrary,
  };
}

export function loadDrillingSystemsLayoutFromStorage(): DrillingSystemsLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRILLING_SYSTEMS_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.mainGroupIds) || !Array.isArray(obj.libraryGroupIds)) return null;
    return {
      mainGroupIds: obj.mainGroupIds.filter((id): id is string => typeof id === 'string'),
      libraryGroupIds: obj.libraryGroupIds.filter((id): id is string => typeof id === 'string'),
    };
  } catch {
    return null;
  }
}

export function saveDrillingSystemsLayoutToStorage(layout: DrillingSystemsLayout | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!layout) {
      window.localStorage.removeItem(DRILLING_SYSTEMS_LAYOUT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(DRILLING_SYSTEMS_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    }
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getKitCompatibilityLabel(
  kit: DrillingKit,
  _customImplants: CustomImplantSystem[] = [],
): string {
  if (kit.kind === 'pilot') return 'Tous implants';
  if (kit.implantBrandName && kit.implantModelName) {
    return `${kit.implantBrandName} · ${kit.implantModelName}`;
  }
  return kit.name;
}

export interface CustomImplantSystem {
  id: string;
  brand: string;
  model: string;
  name: string;
  diametersMm: number[];
  lengthsMm: number[];
  diameter: number;
  length: number;
  usageCount: number;
  lastUsedAt: string;
  isFactory?: boolean;
}

export const FACTORY_IMPLANT_MODELS: CustomImplantSystem[] = [
  {
    id: 'factory-implant-biotech-kontact',
    brand: 'Biotech',
    model: 'Kontact',
    name: 'Biotech Kontact',
    diametersMm: [...BIOTECH_KONTACT_DIAMETERS],
    lengthsMm: [...BIOTECH_KONTACT_LENGTHS],
    diameter: 4.2,
    length: 10.0,
    usageCount: 30,
    lastUsedAt: '2026-11-15T00:00:00.000Z',
    isFactory: true,
  },
  {
    id: 'factory-implant-globald-inkone',
    brand: 'Global D',
    model: 'In-Kone',
    name: 'Global D In-Kone',
    diametersMm: [...GLOBAL_D_IMPLANT_DIAMETERS],
    lengthsMm: [...GLOBAL_D_IMPLANT_LENGTHS],
    diameter: 4.0,
    length: 10.0,
    usageCount: 20,
    lastUsedAt: '2026-11-14T00:00:00.000Z',
    isFactory: true,
  },
  {
    id: 'factory-implant-mis-mguide',
    brand: 'MIS (Dentsply Sirona)',
    model: 'C1 / V3 / SEVEN',
    name: 'MIS (Dentsply Sirona) C1 / V3 / SEVEN',
    diametersMm: [...MIS_MGUIDE_IMPLANT_DIAMETERS],
    lengthsMm: [...MIS_MGUIDE_IMPLANT_LENGTHS],
    diameter: 4.2,
    length: 10.0,
    usageCount: 15,
    lastUsedAt: '2026-11-13T00:00:00.000Z',
    isFactory: true,
  },
];

export function sanitizeImplantDimensionList(
  values: number[],
  minMm: number,
  maxMm: number,
  fallbackMm: number,
): number[] {
  const unique = Array.from(
    new Set(
      values
        .filter((v) => typeof v === 'number' && Number.isFinite(v))
        .map((v) => roundTo(clamp(v, minMm, maxMm), 1)),
    ),
  ).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [roundTo(clamp(fallbackMm, minMm, maxMm), 1)];
}

export function createImplantLibraryEntry(
  brandInput: string,
  modelInput: string,
  diametersMm: number[],
  lengthsMm: number[],
  id?: string,
): CustomImplantSystem {
  const brand = brandInput.trim() || 'Marque personnalisée';
  const model = modelInput.trim() || 'Modèle standard';
  const cleanDias = sanitizeImplantDimensionList(diametersMm, 2.0, 8.0, 4.0);
  const cleanLens = sanitizeImplantDimensionList(lengthsMm, 4.0, 20.0, 10.0);
  return {
    id: id ?? `imp-${Date.now()}`,
    brand,
    model,
    name: `${brand} ${model}`,
    diametersMm: cleanDias,
    lengthsMm: cleanLens,
    diameter: cleanDias[0],
    length: cleanLens[0],
    usageCount: 1,
    lastUsedAt: new Date().toISOString(),
    isFactory: false,
  };
}

export interface ImplantBrandGroup {
  brand: string;
  models: CustomImplantSystem[];
}

export function groupImplantModelsByBrand(models: CustomImplantSystem[]): ImplantBrandGroup[] {
  const groups = new Map<string, CustomImplantSystem[]>();
  for (const item of models) {
    const key = item.brand.trim() || 'Autre';
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return Array.from(groups.entries()).map(([brand, list]) => ({ brand, models: list }));
}

export function sortImplantModelsByUsage(models: CustomImplantSystem[]): CustomImplantSystem[] {
  return [...models].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    const dateDiff = b.lastUsedAt.localeCompare(a.lastUsedAt);
    if (dateDiff !== 0) return dateDiff;
    const brandCmp = a.brand.localeCompare(b.brand, 'fr');
    if (brandCmp !== 0) return brandCmp;
    return a.model.localeCompare(b.model, 'fr');
  });
}

export const CUSTOM_IMPLANTS_STORAGE_KEY = 'orthoguide_custom_implants_v1';

function isRemovedKontactSN(id: string, brand: string, model: string, name: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const candidates = [norm(id), norm(model), norm(name), norm(`${brand} ${model}`)];
  return candidates.some((c) => /\b[kc]ontact\s+[sn]\b/.test(c));
}

export function filterLegacyKontactSNModels(models: CustomImplantSystem[]): CustomImplantSystem[] {
  return models.filter((m) => !isRemovedKontactSN(m.id, m.brand, m.model, m.name));
}

export function loadCustomImplantSystemsFromStorage(): CustomImplantSystem[] {
  if (typeof window === 'undefined') return [...FACTORY_IMPLANT_MODELS];
  try {
    const raw = window.localStorage.getItem(CUSTOM_IMPLANTS_STORAGE_KEY);
    if (!raw) return [...FACTORY_IMPLANT_MODELS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...FACTORY_IMPLANT_MODELS];

    const byId = new Map<string, CustomImplantSystem>();
    let removedAnyLegacy = false;
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.id === 'string' ? rec.id : `imp-${Date.now()}-${byId.size}`;
      const factorySeed = FACTORY_IMPLANT_MODELS.find((f) => f.id === id);
      const legacyName = typeof rec.name === 'string' ? rec.name.trim() : 'Système personnalisé';
      const brand =
        typeof rec.brand === 'string' && rec.brand.trim().length > 0
          ? rec.brand.trim()
          : factorySeed?.brand ?? (legacyName.split(/\s+/)[0] || 'Autre');
      const model =
        typeof rec.model === 'string' && rec.model.trim().length > 0
          ? rec.model.trim()
          : factorySeed?.model ?? (legacyName.split(/\s+/).slice(1).join(' ') || 'Standard');
      if (!factorySeed && isRemovedKontactSN(id, brand, model, legacyName)) {
        removedAnyLegacy = true;
        continue;
      }
      const fallbackDia =
        typeof rec.diameter === 'number' && Number.isFinite(rec.diameter)
          ? clamp(rec.diameter, 2.0, 8.0)
          : factorySeed?.diameter ?? 4.0;
      const fallbackLen =
        typeof rec.length === 'number' && Number.isFinite(rec.length)
          ? clamp(rec.length, 4.0, 20.0)
          : factorySeed?.length ?? 10.0;
      const diametersMm = factorySeed
        ? [...factorySeed.diametersMm]
        : Array.isArray(rec.diametersMm)
          ? sanitizeImplantDimensionList(rec.diametersMm as number[], 2.0, 8.0, fallbackDia)
          : [roundTo(fallbackDia, 1)];
      const lengthsMm = factorySeed
        ? [...factorySeed.lengthsMm]
        : Array.isArray(rec.lengthsMm)
          ? sanitizeImplantDimensionList(rec.lengthsMm as number[], 4.0, 20.0, fallbackLen)
          : [roundTo(fallbackLen, 1)];
      byId.set(id, {
        id,
        brand,
        model,
        name: `${brand} ${model}`,
        diametersMm,
        lengthsMm,
        diameter: diametersMm.includes(roundTo(fallbackDia, 1))
          ? roundTo(fallbackDia, 1)
          : diametersMm[0],
        length: lengthsMm.includes(roundTo(fallbackLen, 1))
          ? roundTo(fallbackLen, 1)
          : lengthsMm[0],
        usageCount:
          typeof rec.usageCount === 'number' && Number.isFinite(rec.usageCount)
            ? rec.usageCount
            : factorySeed?.usageCount ?? 1,
        lastUsedAt:
          typeof rec.lastUsedAt === 'string'
            ? rec.lastUsedAt
            : factorySeed?.lastUsedAt ?? '2026-11-10T00:00:00.000Z',
        isFactory: Boolean(factorySeed),
      });
    }

    for (const f of FACTORY_IMPLANT_MODELS) {
      if (!byId.has(f.id)) {
        byId.set(f.id, f);
      }
    }

    const result = Array.from(byId.values());
    if (removedAnyLegacy) {
      saveCustomImplantSystemsToStorage(result);
    }
    return result;
  } catch {
    return [...FACTORY_IMPLANT_MODELS];
  }
}

export function saveCustomImplantSystemsToStorage(systems: CustomImplantSystem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_IMPLANTS_STORAGE_KEY, JSON.stringify(systems));
  } catch {
    // Ignore storage quota errors
  }
}

export function computeVerticalSliderValue(
  startValue: number,
  deltaY: number,
  pxPerMm: number,
  min: number,
  max: number,
  step: number,
  invertY = false,
): number {
  const safePxPerMm = Math.max(1, pxPerMm);
  const signedDelta = invertY ? deltaY : -deltaY;
  const raw = startValue + signedDelta / safePxPerMm;
  const snapped = Math.round(raw / step) * step;
  return clamp(roundTo(snapped, 2), min, max);
}



