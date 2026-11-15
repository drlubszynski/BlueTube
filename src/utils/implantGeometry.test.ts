import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BIOTECH_GUIDED_DRILL_LENGTHS,
  DEFAULT_SIMULATION_PARAMS,
  DrillingKit,
  FACTORY_DRILLING_KITS,
  FACTORY_IMPLANT_MODELS,
  GLOBAL_D_PILOT_DRILL_LENGTHS,
  computeImplantGeometry,
  computePilotComparison,
  computeVerticalSliderValue,
  createImplantLibraryEntry,
  getDefaultParamPatch,
  getElementHighlightConfig,
  getGuidedDrillOptions,
  groupDrillingKitsBySystem,
  groupImplantModelsByBrand,
  matchGuidedDrillToImplant,
  pickOptimalGuidedOffset,
  pickOptimalPilotLength,
  sortImplantModelsByUsage,
  sortKitsByUsage,
} from './implantGeometry';

test('Biotech tubeless kit defaults to 12.0 mm offset without pending suggestions', () => {
  const geom = computeImplantGeometry(DEFAULT_SIMULATION_PARAMS, FACTORY_DRILLING_KITS);

  assert.equal(geom.offsetCao, 12.0);
  assert.equal(geom.drillUsefulLength, 22.0);
  assert.equal(geom.matchedGuidedDrillLengthMm, 10.0);
  assert.equal(geom.drillMarking, 'Ø4.2 · 10 mm');
  assert.equal(geom.freeSpaceUnderGuide, 5.5);
  assert.equal(geom.surgicalGuideOffsetMm, 0.25);
  assert.equal(geom.guideTubeExtension, 'gingiva');
  assert.equal(geom.suggestion, null);
  assert.equal(FACTORY_DRILLING_KITS[0].factoryDefaults.offsetMm, 12.0);
  assert.equal(FACTORY_DRILLING_KITS[0].userDefaults.offsetMm, 12.0);
  assert.equal(FACTORY_DRILLING_KITS[0].factoryDefaults.surgicalGuideOffsetMm, 0.25);
  assert.equal(FACTORY_DRILLING_KITS[1].factoryDefaults.surgicalGuideOffsetMm, 0.25);
  assert.deepEqual(BIOTECH_GUIDED_DRILL_LENGTHS, [6.0, 8.0, 10.0, 12.0, 14.0, 16.0]);
  const boneGeom = computeImplantGeometry(
    { ...DEFAULT_SIMULATION_PARAMS, guideTubeExtension: 'bone' },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(boneGeom.guideTubeExtension, 'bone');
  assert.equal(boneGeom.blueSkyPlan.guideOffsetMm, geom.blueSkyPlan.guideOffsetMm);
  assert.equal(geom.safety.status, 'optimal');
  assert.equal(geom.blueSkyPlan.guideOffsetMm, 12.0);
  assert.equal(geom.blueSkyPlan.guideHoleDiameterMm, 5.15);
  assert.equal(geom.blueSkyPlan.sleeveHeightMm, 4.0);
  // Drill adapts automatically to Ø 4.2 implant while remaining visibly narrower than implant
  assert.ok(geom.drillActiveDiameter < DEFAULT_SIMULATION_PARAMS.implantDiameter);
  assert.equal(geom.drillRingColorHex, '#2563EB');
});

test('Biotech Mastertube above guide subtracts 0.5 mm sleeve lip; flush seating subtracts 0 mm; drill stop never alters BSP', () => {
  const above = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-biotech-kontact',
      hasSleeve: true,
      sleeveSeating: 'above',
      sleeveLipThickness: 0.5,
      sleeveWallThickness: 0.35,
      drillToSleeveClearance: 0.1,
      printingClearance: 0.05,
      drillStopThickness: 3.2, // Visual only
      offsetOverride: 12.0,
    },
    FACTORY_DRILLING_KITS,
  );

  assert.equal(above.blueSkyPlan.guideOffsetMm, 11.5);
  assert.equal(above.blueSkyPlan.guideHoleDiameterMm, 5.85);
  assert.equal(above.yResinGuideTop - above.yGuideTop, 0.5);
  // With sleeve (Mastertube), shortest safe drill from [6..16] suggests 8.0 mm
  assert.equal(above.suggestion?.patch.offsetOverride, 8.0);

  const optimalSleeve = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-biotech-kontact',
      hasSleeve: true,
      sleeveSeating: 'above',
      sleeveLipThickness: 0.5,
      offsetOverride: pickOptimalGuidedOffset(
        0.5,
        2.0,
        4.0,
        true,
        'factory-biotech-kontact',
        10.0,
        12.0,
        BIOTECH_GUIDED_DRILL_LENGTHS,
      ),
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(optimalSleeve.offsetCao, 8.0);
  assert.equal(optimalSleeve.suggestion, null);

  const flush = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-biotech-kontact',
      hasSleeve: true,
      sleeveSeating: 'flush',
      sleeveLipThickness: 0.5,
      sleeveWallThickness: 0.35,
      drillToSleeveClearance: 0.1,
      printingClearance: 0.05,
      offsetOverride: 12.0,
    },
    FACTORY_DRILLING_KITS,
  );

  assert.equal(flush.blueSkyPlan.guideOffsetMm, 12.0);
  assert.equal(flush.yResinGuideTop, flush.yGuideTop);
});

test('Guided kit suggestions strictly stay within physically available drill lengths', () => {
  // 8 mm implant with AtlaSurgery II [6, 8, 10, 12, 14, 16] drills calibrated at 12 mm -> offsets [10..20]
  const optionsL8 = getGuidedDrillOptions(8.0, 12.0, BIOTECH_GUIDED_DRILL_LENGTHS, 0.5, 2.0, 4.0);
  assert.deepEqual(
    optionsL8.map((o) => o.offsetMm),
    [10.0, 12.0, 14.0, 16.0, 18.0, 20.0],
  );
  // In tubeless mode (hasSleeve = false), nominal offset stays 12.0 mm across all implant lengths when clinically safe
  for (const impLen of BIOTECH_GUIDED_DRILL_LENGTHS) {
    assert.equal(
      pickOptimalGuidedOffset(0.5, 2.0, 4.0, false, 'factory-biotech-kontact', impLen, 12.0, BIOTECH_GUIDED_DRILL_LENGTHS),
      12.0,
    );
  }

  // At 12.0 mm nominal offset in tubeless mode -> Optimal, no suggestion
  const l8Optimal = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 8.0,
      offsetOverride: 12.0,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(l8Optimal.safety.status, 'optimal');
  assert.equal(l8Optimal.suggestion, null);
  assert.equal(l8Optimal.matchedGuidedDrillLengthMm, 8.0);

  // Oversized offset (16.0 mm) on L8 implant proposes returning to nominal 12.0 mm (using 8 mm drill)
  const l8Oversized = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 8.0,
      offsetOverride: 16.0,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(l8Oversized.matchedGuidedDrillLengthMm, 12.0);
  assert.equal(l8Oversized.suggestion?.patch.offsetOverride, 12.0);

  // 12 mm implant in tubeless mode -> nominal 12.0 mm (12 mm drill, Optimal)
  const l12Optimal = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 12.0,
      offsetOverride: pickOptimalGuidedOffset(0.5, 2.0, 4.0, false, 'factory-biotech-kontact', 12.0, 12.0, BIOTECH_GUIDED_DRILL_LENGTHS),
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(l12Optimal.offsetCao, 12.0);
  assert.equal(l12Optimal.suggestion, null);

  // Very thick gingiva (6.5 mm) + 1.0 mm subcrestal on L10 makes 12.0 mm offset have < 1.5 mm clearance -> suggests 14.0 mm (12 mm drill)
  const thickGingiva = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 10.0,
      gingivaThickness: 6.5,
      subcrestalDepth: 1.0,
      guideHeight: 4.0,
      offsetOverride: 12.0,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(thickGingiva.suggestion?.patch.offsetOverride, 14.0);

  // Custom guided kit with only one drill [10.0] calibrated at 10.0 mm never suggests another offset
  const singleDrillKit: DrillingKit = {
    ...FACTORY_DRILLING_KITS[0],
    id: 'custom-single-drill',
    isFactory: false,
    factoryDefaults: {
      ...FACTORY_DRILLING_KITS[0].factoryDefaults,
      offsetMm: 10.0,
      availableLengthsMm: [10.0],
    },
    userDefaults: {
      ...FACTORY_DRILLING_KITS[0].userDefaults,
      offsetMm: 10.0,
      availableLengthsMm: [10.0],
    },
  };
  const singleDrillGeom = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: singleDrillKit.id,
      implantLength: 10.0,
      offsetOverride: 10.0,
    },
    [singleDrillKit],
  );
  assert.equal(singleDrillGeom.suggestion, null);
});

test('Pilot kit (Global D) adapts offset from chosen implant length and detects gingival compression', () => {
  const geom = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-globald-pilot',
      hasSleeve: true,
      sleeveSeating: 'above',
      sleeveLipThickness: 0.5,
      sleeveWallThickness: 0.35,
      drillToSleeveClearance: 0.1,
      printingClearance: 0.05,
      guidingDiameter: 2.0,
      pilotDrillLength: 17.0,
      implantLength: 12.0,
      gingivaThickness: 2.0,
      subcrestalDepth: 0.5,
      guideHeight: 4.0,
    },
    FACTORY_DRILLING_KITS,
  );

  assert.equal(geom.offsetCao, 5.0);
  assert.equal(geom.blueSkyPlan.guideOffsetMm, 4.5);
  assert.equal(geom.freeSpaceUnderGuide, -1.5);
  assert.equal(geom.safety.status, 'compression');
});

test('pickOptimalPilotLength selects smallest clinically usable drill and suggestion directly targets it', () => {
  const expectedByLength: Array<[number, number]> = [
    [6.0, 17.3],
    [8.5, 17.3],
    [10.0, 19.0],
    [11.5, 20.5],
    [13.0, 22.0],
    [15.0, 23.5],
  ];

  for (const [implantLen, expectedPilot] of expectedByLength) {
    const picked = pickOptimalPilotLength(implantLen, GLOBAL_D_PILOT_DRILL_LENGTHS, 0.5, 2.0, 4.0);
    assert.equal(picked, expectedPilot);

    const optGeom = computeImplantGeometry(
      {
        ...DEFAULT_SIMULATION_PARAMS,
        activeKitId: 'factory-globald-pilot',
        hasSleeve: true,
        implantLength: implantLen,
        pilotDrillLength: picked,
      },
      FACTORY_DRILLING_KITS,
    );
    assert.equal(optGeom.safety.status, 'optimal');
    assert.equal(optGeom.suggestion, null);
  }

  // Thin gingiva (1.0 mm) allows L17.3 even on a 10.0 mm implant (+1.8 mm under guide)
  assert.equal(
    pickOptimalPilotLength(10.0, GLOBAL_D_PILOT_DRILL_LENGTHS, 0.5, 1.0, 4.0),
    17.3,
  );

  // Any oversized pilot drill (e.g. L20.5, L22.0, L25.5 on L10) directly suggests L19.0 (Améliorable -> Optimal)
  for (const oversized of [20.5, 22.0, 23.5, 25.5]) {
    const geom = computeImplantGeometry(
      {
        ...DEFAULT_SIMULATION_PARAMS,
        activeKitId: 'factory-globald-pilot',
        hasSleeve: true,
        implantLength: 10.0,
        pilotDrillLength: oversized,
      },
      FACTORY_DRILLING_KITS,
    );
    assert.ok(geom.suggestion !== null, `Expected suggestion for oversized pilot L${oversized}`);
    assert.equal(geom.suggestion!.patch.pilotDrillLength, 19.0);
  }
});

test('Biotech guided drills match 6–16 mm lengths and clinical suggestion proposes nominal 12.0 mm offset when oversized', () => {
  const matched8 = matchGuidedDrillToImplant(3.6, 8.0, BIOTECH_GUIDED_DRILL_LENGTHS);
  assert.equal(matched8.matchedLengthMm, 8.0);
  assert.equal(matched8.spec.ringName, 'Magenta');

  const geomLong = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 10.0,
      subcrestalDepth: 1.5,
      offsetOverride: 14.0,
      gingivaThickness: 2.0,
      guideHeight: 4.0,
    },
    FACTORY_DRILLING_KITS,
  );

  assert.ok(geomLong.suggestion !== null);
  assert.equal(geomLong.suggestion!.patch.offsetOverride, 12.0);
});

test('Custom system drill-to-implant diameter and length correlation resolves accurately', () => {
  const customMatched = matchGuidedDrillToImplant(
    4.5,
    11.5,
    [7.0, 9.0, 11.5, 13.0],
    [2.2, 2.8, 3.5, 4.1],
    { '4.5': 3.5 },
  );
  assert.equal(customMatched.spec.diameter, 3.5);
  assert.equal(customMatched.matchedLengthMm, 11.5);
  assert.ok(customMatched.drillCuttingDiameter < 4.5);
});

test('Pilot comparator evaluates all 6 official Global D pilot lengths and sortKitsByUsage prioritizes top systems dynamically', () => {
  const rows = computePilotComparison(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-globald-pilot',
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(rows.length, 6);

  const sorted = sortKitsByUsage([
    { ...FACTORY_DRILLING_KITS[1], usageCount: 99 },
    FACTORY_DRILLING_KITS[0],
  ]);
  assert.equal(sorted[0].id, 'factory-globald-pilot');
  assert.equal(FACTORY_DRILLING_KITS[0].name, 'AtlaSurgery 2 (Biotech Dental)');
  assert.equal(FACTORY_DRILLING_KITS[1].name, 'G20 (Global D)');
});

test('Global D official chart pairs yield exact 10.0 mm BSP guide offset with 0.5 mm sleeve lip', () => {
  const nominalPairs: Array<[number, number]> = [
    [8.5, 19.0],
    [10.0, 20.5],
    [11.5, 22.0],
    [13.0, 23.5],
    [15.0, 25.5],
  ];

  for (const [implantLength, pilotDrillLength] of nominalPairs) {
    const geom = computeImplantGeometry(
      {
        ...DEFAULT_SIMULATION_PARAMS,
        activeKitId: 'factory-globald-pilot',
        hasSleeve: true,
        sleeveSeating: 'above',
        sleeveLipThickness: 0.5,
        implantLength,
        pilotDrillLength,
      },
      FACTORY_DRILLING_KITS,
    );
    assert.equal(geom.blueSkyPlan.guideOffsetMm, 10.0);
  }
});

test('getDefaultParamPatch resets individual parameters to active kit userDefaults and optimal guided drill offset', () => {
  const pilotKit = FACTORY_DRILLING_KITS[1];
  const pilotPatch = getDefaultParamPatch(
    'offsetCao',
    { ...DEFAULT_SIMULATION_PARAMS, activeKitId: pilotKit.id, offsetOverride: 15.0 },
    pilotKit,
  );
  assert.equal(pilotPatch.offsetOverride, 9.0);

  const guidedKit = FACTORY_DRILLING_KITS[0];
  const guidedPatch = getDefaultParamPatch(
    'offsetCao',
    { ...DEFAULT_SIMULATION_PARAMS, activeKitId: guidedKit.id, implantLength: 8.0, offsetOverride: 16.0 },
    guidedKit,
  );
  assert.equal(guidedPatch.offsetOverride, 12.0);
});

test('getElementHighlightConfig maps clickable 2D elements to correct drawers and associated parameters', () => {
  assert.equal(getElementHighlightConfig(null), null);

  const implantCfg = getElementHighlightConfig('implant');
  assert.equal(implantCfg?.openDrawer, 2);
  assert.deepEqual(implantCfg?.params, ['implantDiameter', 'implantLength']);

  const gingivaCfg = getElementHighlightConfig('gingiva');
  assert.equal(gingivaCfg?.openDrawer, 3);
  assert.deepEqual(gingivaCfg?.params, ['gingivaThickness']);

  const subcrestalCfg = getElementHighlightConfig('subcrestal');
  assert.equal(subcrestalCfg?.openDrawer, 2);
  assert.deepEqual(subcrestalCfg?.params, ['subcrestalDepth']);

  const guideCfg = getElementHighlightConfig('surgical_guide');
  assert.equal(guideCfg?.openDrawer, 4);
  assert.ok(guideCfg?.params.includes('surgicalGuideOffset'));
  assert.ok(guideCfg?.params.includes('guideTubeExtension'));
  assert.ok(guideCfg?.params.includes('printingClearance'));
  assert.ok(guideCfg?.params.includes('bspPanel'));

  const sleeveCfg = getElementHighlightConfig('sleeve');
  assert.equal(sleeveCfg?.openDrawer, 4);
  assert.ok(sleeveCfg?.params.includes('sleeve'));

  const drillCfg = getElementHighlightConfig('drill');
  assert.equal(drillCfg?.openDrawer, 2);
  assert.ok(drillCfg?.params.includes('offsetCao'));
  assert.ok(drillCfg?.params.includes('drillUsefulLength'));

  const handpieceCfg = getElementHighlightConfig('handpiece');
  assert.equal(handpieceCfg?.openDrawer, 3);
  assert.deepEqual(handpieceCfg?.params, ['handpieceHeadHeight']);
});

test('Implant library structures entries by brand/model/dimensions and sorts Top 3 + extra drawer by usage', () => {
  const straumann = createImplantLibraryEntry(
    'Straumann',
    'BLX',
    [4.5, 3.3, 3.7, 3.7],
    [12.0, 8.0, 10.0],
    'imp-blx',
  );
  assert.equal(straumann.brand, 'Straumann');
  assert.equal(straumann.model, 'BLX');
  assert.deepEqual(straumann.diametersMm, [3.3, 3.7, 4.5]);
  assert.deepEqual(straumann.lengthsMm, [8.0, 10.0, 12.0]);

  const nobel = {
    ...createImplantLibraryEntry('Nobel Biocare', 'NobelActive', [3.5, 4.3], [10.0, 11.5], 'imp-nobel'),
    usageCount: 45,
  };
  const anthogyr = {
    ...createImplantLibraryEntry('Anthogyr', 'Axiom X3', [3.4, 4.0], [8.5, 10.0], 'imp-axiom'),
    usageCount: 2,
  };

  const sorted = sortImplantModelsByUsage([anthogyr, ...FACTORY_IMPLANT_MODELS, nobel]);
  assert.equal(sorted.length, 5);
  assert.deepEqual(
    sorted.slice(0, 3).map((m) => m.id),
    ['imp-nobel', 'factory-implant-biotech-kontact', 'factory-implant-globald-inkone'],
  );

  const groupedExtra = groupImplantModelsByBrand(sorted.slice(3));
  assert.equal(groupedExtra.length, 2);
  assert.equal(groupedExtra[0].brand, 'MIS (Dentsply Sirona)');
  assert.equal(groupedExtra[0].models[0].model, 'C1 / V3 / SEVEN');
  assert.equal(groupedExtra[1].brand, 'Anthogyr');
  assert.equal(groupedExtra[1].models[0].model, 'Axiom X3');
});

test('computeVerticalSliderValue maps vertical drag up/down with step quantization and clamping', () => {
  // Dragging UP (negative deltaY) increases value; dragging DOWN (positive deltaY) decreases value
  assert.equal(computeVerticalSliderValue(2.0, -20, 20, 0.5, 6.0, 0.1), 3.0);
  assert.equal(computeVerticalSliderValue(2.0, 10, 20, 0.5, 6.0, 0.1), 1.5);
  // Clamping at min & max
  assert.equal(computeVerticalSliderValue(2.0, 200, 20, 0.5, 6.0, 0.1), 0.5);
  assert.equal(computeVerticalSliderValue(2.0, -300, 20, 0.5, 6.0, 0.1), 6.0);
  // Step quantization (0.5 mm step)
  assert.equal(computeVerticalSliderValue(10.0, -9, 12, 4.0, 20.0, 0.5), 11.0);
  assert.equal(computeVerticalSliderValue(10.0, 5, 12, 4.0, 20.0, 0.5), 9.5);
  // Inverted Y (for downward-extending dimensions: guideHeight, subcrestalDepth, implantLength)
  assert.equal(computeVerticalSliderValue(4.0, 20, 20, 1.5, 8.0, 0.1, true), 5.0);
  assert.equal(computeVerticalSliderValue(4.0, -20, 20, 1.5, 8.0, 0.1, true), 3.0);
  assert.equal(computeVerticalSliderValue(10.0, 28, 14, 6.0, 16.0, 0.5, true), 12.0);
});

test('getModifiedDefaultItems detects shifted defaults such as surgicalGuideOffset and reverts cleanly', async () => {
  const { getModifiedDefaultItems, getRevertDefaultsPatch, snapshotFromParams } = await import('./implantGeometry');
  const kit = FACTORY_DRILLING_KITS[0];
  const baseParams = {
    ...DEFAULT_SIMULATION_PARAMS,
    activeKitId: kit.id,
    hasSleeve: kit.userDefaults.hasSleeve,
    guideHeight: kit.userDefaults.guidingHeightMm,
    surgicalGuideOffset: kit.userDefaults.surgicalGuideOffsetMm,
    printingClearance: kit.userDefaults.printingClearanceMm,
  };
  assert.deepEqual(getModifiedDefaultItems(baseParams, kit), []);

  const shiftedParams = {
    ...baseParams,
    surgicalGuideOffset: 0.45,
    guideTubeExtension: 'bone' as const,
  };
  const items = getModifiedDefaultItems(shiftedParams, kit);
  assert.equal(items.length, 2);
  assert.equal(items[0].key, 'surgicalGuideOffset');
  assert.equal(items[1].key, 'guideTubeExtension');

  const updatedKit = { ...kit, userDefaults: snapshotFromParams(shiftedParams, kit) };
  assert.deepEqual(getModifiedDefaultItems(shiftedParams, updatedKit), []);

  const revertPatch = getRevertDefaultsPatch(kit);
  assert.equal(revertPatch.surgicalGuideOffset, 0.25);
  assert.equal(revertPatch.guideTubeExtension, 'gingiva');
});

test('filterLegacyKontactSNModels removes Contact S / Contact N / Kontact S / Kontact N while keeping Biotech Kontact', async () => {
  const { filterLegacyKontactSNModels } = await import('./implantGeometry');
  const sample = [
    ...FACTORY_IMPLANT_MODELS,
    createImplantLibraryEntry('Biotech', 'Kontact S', [3.6, 4.2], [8, 10], 'imp-ks'),
    createImplantLibraryEntry('Biotech', 'Contact N', [3.6, 4.2], [8, 10], 'imp-cn'),
  ];
  const filtered = filterLegacyKontactSNModels(sample);
  assert.deepEqual(
    filtered.map((m) => m.name),
    ['Biotech Kontact', 'Global D In-Kone', 'MIS (Dentsply Sirona) C1 / V3 / SEVEN'],
  );
});

test('All factory systems default to Sans douille and MIS MGUIDE Standard & Narrow compute exact BSP tube dimensions', () => {
  for (const kit of FACTORY_DRILLING_KITS) {
    assert.equal(kit.factoryDefaults.hasSleeve, false, `${kit.id} factoryDefaults.hasSleeve should be false`);
    assert.equal(kit.userDefaults.hasSleeve, false, `${kit.id} userDefaults.hasSleeve should be false`);
    assert.equal(kit.factoryDefaults.printingClearanceMm, 0.15, `${kit.id} printingClearanceMm should be 0.15`);
  }
  assert.equal(DEFAULT_SIMULATION_PARAMS.hasSleeve, false);
  assert.equal(DEFAULT_SIMULATION_PARAMS.wizardHasSleeve, false);

  const misStd = FACTORY_DRILLING_KITS.find((k) => k.id === 'factory-mis-mguide');
  const misNarrow = FACTORY_DRILLING_KITS.find((k) => k.id === 'factory-mis-mguide-narrow');
  assert.ok(misStd, 'Missing factory-mis-mguide kit');
  assert.ok(misNarrow, 'Missing factory-mis-mguide-narrow kit');

  // Alphabetical ordering of drilling systems (regardless of usageCount) & Narrow first inside MIS
  const groups = groupDrillingKitsBySystem([
    { ...FACTORY_DRILLING_KITS[2], usageCount: 999 },
    FACTORY_DRILLING_KITS[1],
    FACTORY_DRILLING_KITS[0],
    FACTORY_DRILLING_KITS[3],
  ]);
  assert.equal(groups.length, 3);
  assert.deepEqual(
    groups.map((g) => g.groupName),
    ['AtlaSurgery 2 (Biotech Dental)', 'G20 (Global D)', 'MGUIDE (MIS · Dentsply Sirona)'],
  );
  const misGroup = groups.find((g) => g.groupId === 'mis-mguide');
  assert.ok(misGroup, 'Missing mis-mguide system group');
  assert.equal(misGroup.kits.length, 2);
  assert.equal(misGroup.kits[0].id, 'factory-mis-mguide-narrow');
  assert.equal(misGroup.kits[0].subSystemLabel, 'Narrow');
  assert.equal(misGroup.kits[1].id, 'factory-mis-mguide');
  assert.equal(misGroup.kits[1].subSystemLabel, 'Standard');

  assert.equal(misStd.kind, 'guided');
  assert.equal(misStd.implantBrandName, 'MIS (Dentsply Sirona)');
  assert.equal(misStd.implantModelName, 'C1 / V3 / SEVEN (Standard)');
  assert.equal(misStd.factoryDefaults.sleeveSeating, 'flush');
  assert.equal(misStd.factoryDefaults.sleeveWallThicknessMm, 0.5);
  assert.deepEqual(misStd.factoryDefaults.availableLengthsMm, [6.0, 8.0, 10.0, 11.5, 13.0, 16.0]);
  assert.deepEqual(misStd.factoryDefaults.drillDiametersMm, [2.4, 3.2, 3.6, 4.1, 4.9]);
  assert.deepEqual(misStd.factoryDefaults.implantDiametersMm, [3.3, 3.75, 4.2, 5.0]);
  assert.deepEqual(misStd.factoryDefaults.implantLengthsMm, [6.0, 8.0, 10.0, 11.5, 13.0, 16.0]);

  const misStdTubelessDefault = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-mis-mguide',
      implantBrand: 'mis',
      customImplantId: 'factory-implant-mis-mguide',
      implantDiameter: 4.2,
      implantLength: 11.5,
      hasSleeve: misStd.factoryDefaults.hasSleeve,
      sleeveSeating: misStd.factoryDefaults.sleeveSeating,
      sleeveLipThickness: misStd.factoryDefaults.sleeveLipThicknessMm,
      sleeveWallThickness: misStd.factoryDefaults.sleeveWallThicknessMm,
      drillToSleeveClearance: misStd.factoryDefaults.drillToSleeveClearanceMm,
      printingClearance: misStd.factoryDefaults.printingClearanceMm,
      guidingDiameter: misStd.factoryDefaults.guidingDiameterMm,
      guideHeight: misStd.factoryDefaults.guidingHeightMm,
      offsetOverride: misStd.factoryDefaults.offsetMm,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(misStdTubelessDefault.drillMarking, 'Ø4.1 · 11.5 mm');
  assert.equal(misStdTubelessDefault.matchedGuidedDrillLengthMm, 11.5);
  assert.equal(misStdTubelessDefault.blueSkyPlan.guideHoleDiameterMm, 5.6);
  assert.equal(misStdTubelessDefault.blueSkyPlan.sleeveHeightMm, 5.0);
  assert.equal(misStdTubelessDefault.blueSkyPlan.guideOffsetMm, 9.5);
  assert.equal(misStdTubelessDefault.safety.status, 'optimal');
  assert.equal(misStdTubelessDefault.suggestion, null);

  const misWithSleeve = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-mis-mguide',
      implantBrand: 'mis',
      implantDiameter: 3.3,
      implantLength: 10.0,
      hasSleeve: true,
      sleeveSeating: 'flush',
      sleeveLipThickness: 0.0,
      sleeveWallThickness: 0.5,
      drillToSleeveClearance: 0.1,
      printingClearance: 0.05,
      guidingDiameter: misStd.factoryDefaults.guidingDiameterMm,
      guideHeight: misStd.factoryDefaults.guidingHeightMm,
      offsetOverride: misStd.factoryDefaults.offsetMm,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(misWithSleeve.drillMarking, 'Ø3.2 · 10 mm');
  assert.equal(misWithSleeve.blueSkyPlan.guideHoleDiameterMm, 6.6);
  assert.equal(misWithSleeve.blueSkyPlan.sleeveHeightMm, 5.0);
  assert.equal(misWithSleeve.blueSkyPlan.guideOffsetMm, 9.5);
  assert.equal(misWithSleeve.safety.status, 'optimal');

  // Narrow MIS sub-system: 4.10 mm tubeless by default, 5.10 mm with sleeve, H 5.0, offset 9.5, flush
  assert.equal(misNarrow.factoryDefaults.sleeveSeating, 'flush');
  assert.equal(misNarrow.factoryDefaults.sleeveWallThicknessMm, 0.5);
  assert.deepEqual(misNarrow.factoryDefaults.implantDiametersMm, [3.3, 3.75]);
  assert.deepEqual(misNarrow.factoryDefaults.drillDiametersMm, [2.4, 3.2, 3.6]);

  const narrowTubelessDefault = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-mis-mguide-narrow',
      implantBrand: 'mis',
      customImplantId: 'factory-implant-mis-mguide',
      implantDiameter: 3.3,
      implantLength: 10.0,
      hasSleeve: misNarrow.factoryDefaults.hasSleeve,
      sleeveSeating: misNarrow.factoryDefaults.sleeveSeating,
      sleeveLipThickness: misNarrow.factoryDefaults.sleeveLipThicknessMm,
      sleeveWallThickness: misNarrow.factoryDefaults.sleeveWallThicknessMm,
      drillToSleeveClearance: misNarrow.factoryDefaults.drillToSleeveClearanceMm,
      printingClearance: misNarrow.factoryDefaults.printingClearanceMm,
      guidingDiameter: misNarrow.factoryDefaults.guidingDiameterMm,
      guideHeight: misNarrow.factoryDefaults.guidingHeightMm,
      offsetOverride: misNarrow.factoryDefaults.offsetMm,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(narrowTubelessDefault.drillMarking, 'Ø3.2 · 10 mm');
  assert.equal(narrowTubelessDefault.blueSkyPlan.guideHoleDiameterMm, 4.1);
  assert.equal(narrowTubelessDefault.blueSkyPlan.sleeveHeightMm, 5.0);
  assert.equal(narrowTubelessDefault.blueSkyPlan.guideOffsetMm, 9.5);
  assert.equal(narrowTubelessDefault.safety.status, 'optimal');
  assert.equal(narrowTubelessDefault.suggestion, null);

  const narrowWithSleeve = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      activeKitId: 'factory-mis-mguide-narrow',
      implantBrand: 'mis',
      implantDiameter: 3.3,
      implantLength: 10.0,
      hasSleeve: true,
      sleeveSeating: 'flush',
      sleeveLipThickness: 0.0,
      sleeveWallThickness: 0.5,
      drillToSleeveClearance: 0.1,
      printingClearance: 0.05,
      guidingDiameter: misNarrow.factoryDefaults.guidingDiameterMm,
      guideHeight: misNarrow.factoryDefaults.guidingHeightMm,
      offsetOverride: misNarrow.factoryDefaults.offsetMm,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(narrowWithSleeve.blueSkyPlan.guideHoleDiameterMm, 5.1);
  assert.equal(narrowWithSleeve.blueSkyPlan.sleeveHeightMm, 5.0);
  assert.equal(narrowWithSleeve.blueSkyPlan.guideOffsetMm, 9.5);
  assert.equal(narrowWithSleeve.safety.status, 'optimal');
});

test('resolveDrillingSystemsLayout shows 3 alphabetical groups by default and reorderDrillingSystemGroups persists personal order, archive, and unarchive', async () => {
  const { resolveDrillingSystemsLayout, reorderDrillingSystemGroups } = await import('./implantGeometry');

  const fourthKit: DrillingKit = {
    ...FACTORY_DRILLING_KITS[0],
    id: 'custom-straumann',
    name: 'Straumann BLX',
    systemGroupId: 'custom-straumann',
    systemGroupName: 'Straumann BLX',
    isFactory: false,
  };
  const fourKits = [...FACTORY_DRILLING_KITS, fourthKit];

  // Default layout: 3 alphabetical groups shown in main, 4th placed in Bibliothèque de systèmes de forage
  const defaultResolved = resolveDrillingSystemsLayout(fourKits, null);
  assert.deepEqual(
    defaultResolved.mainGroups.map((g) => g.groupId),
    ['biotech-kontact', 'globald-pilot', 'mis-mguide'],
  );
  assert.deepEqual(
    defaultResolved.libraryGroups.map((g) => g.groupId),
    ['custom-straumann'],
  );

  // Drag item 0 (Biotech) down past item 2 (MIS) -> ['globald-pilot', 'mis-mguide', 'biotech-kontact']
  const reorderedDown = reorderDrillingSystemGroups(
    defaultResolved.mainGroups.map((g) => g.groupId),
    defaultResolved.libraryGroups.map((g) => g.groupId),
    'biotech-kontact',
    'main',
    3,
  );
  assert.deepEqual(reorderedDown.mainGroupIds, [
    'globald-pilot',
    'mis-mguide',
    'biotech-kontact',
  ]);

  // Drag MIS up to index 0 -> ['mis-mguide', 'globald-pilot', 'biotech-kontact']
  const reorderedUp = reorderDrillingSystemGroups(
    reorderedDown.mainGroupIds,
    reorderedDown.libraryGroupIds,
    'mis-mguide',
    'main',
    0,
  );
  assert.deepEqual(reorderedUp.mainGroupIds, [
    'mis-mguide',
    'globald-pilot',
    'biotech-kontact',
  ]);

  // Archive Biotech into Bibliothèque de systèmes de forage -> main has 2, library has 2
  const archived = reorderDrillingSystemGroups(
    reorderedUp.mainGroupIds,
    reorderedUp.libraryGroupIds,
    'biotech-kontact',
    'library',
  );
  assert.deepEqual(archived.mainGroupIds, ['mis-mguide', 'globald-pilot']);
  assert.deepEqual(archived.libraryGroupIds, ['custom-straumann', 'biotech-kontact']);

  const resolvedAfterArchive = resolveDrillingSystemsLayout(fourKits, archived);
  assert.deepEqual(
    resolvedAfterArchive.mainGroups.map((g) => g.groupId),
    ['mis-mguide', 'globald-pilot'],
  );
  assert.deepEqual(
    resolvedAfterArchive.libraryGroups.map((g) => g.groupId),
    ['custom-straumann', 'biotech-kontact'],
  );

  // Drag Straumann out of library into main at index 1 -> main has 3, library has 1
  const unarchived = reorderDrillingSystemGroups(
    archived.mainGroupIds,
    archived.libraryGroupIds,
    'custom-straumann',
    'main',
    1,
  );
  assert.deepEqual(unarchived.mainGroupIds, [
    'mis-mguide',
    'custom-straumann',
    'globald-pilot',
  ]);
  assert.deepEqual(unarchived.libraryGroupIds, ['biotech-kontact']);
});

test('Narrow vs Standard guiding diameter and Avec/Sans douille toggle independently', async () => {
  const {
    buildKitSelectionParamsPatch,
    buildSleeveToggleParamsPatch,
  } = await import('./implantGeometry');
  const misStd = FACTORY_DRILLING_KITS.find((k) => k.id === 'factory-mis-mguide')!;
  const misNarrow = FACTORY_DRILLING_KITS.find((k) => k.id === 'factory-mis-mguide-narrow')!;

  // Start on Narrow, Sans douille
  let params = {
    ...DEFAULT_SIMULATION_PARAMS,
    ...buildKitSelectionParamsPatch(DEFAULT_SIMULATION_PARAMS, misNarrow),
  };
  assert.equal(params.activeKitId, 'factory-mis-mguide-narrow');
  assert.equal(params.hasSleeve, false);

  // Enable Douille on Narrow -> hasSleeve becomes true, activeKitId stays Narrow
  const sleeveOn = buildSleeveToggleParamsPatch(params, misNarrow, true);
  params = { ...params, ...sleeveOn.paramsPatch };
  assert.equal(params.activeKitId, 'factory-mis-mguide-narrow');
  assert.equal(params.hasSleeve, true);

  // Switch from Narrow to Standard -> hasSleeve MUST stay true (no accidental reset!)
  const toStd = buildKitSelectionParamsPatch(params, misStd, misNarrow);
  params = { ...params, ...toStd };
  assert.equal(params.activeKitId, 'factory-mis-mguide');
  assert.equal(params.hasSleeve, true);
  assert.equal(params.guidingDiameter, 5.45);

  // Turn OFF Douille on Standard, then switch back to Narrow -> hasSleeve stays false
  const sleeveOff = buildSleeveToggleParamsPatch(params, misStd, false);
  params = { ...params, ...sleeveOff.paramsPatch };
  assert.equal(params.hasSleeve, false);

  const backToNarrow = buildKitSelectionParamsPatch(params, misNarrow, misStd);
  params = { ...params, ...backToNarrow };
  assert.equal(params.activeKitId, 'factory-mis-mguide-narrow');
  assert.equal(params.hasSleeve, false);
  assert.equal(params.guidingDiameter, 3.95);
});

test('Handpiece head height supports full 0–30 mm range and strict compatibility filters guided implants', async () => {
  const { getCompatibleImplantsForKit, groupLibraryByBrand, hasAnyModifiedParam } = await import(
    './implantGeometry'
  );

  const zeroHp = computeImplantGeometry(
    { ...DEFAULT_SIMULATION_PARAMS, handpieceHeadHeight: 0 },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(zeroHp.minMouthOpeningMm, zeroHp.drillUsefulLength);

  const thirtyHp = computeImplantGeometry(
    { ...DEFAULT_SIMULATION_PARAMS, handpieceHeadHeight: 30 },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(thirtyHp.minMouthOpeningMm, thirtyHp.drillUsefulLength + 30);

  const misNarrow = FACTORY_DRILLING_KITS.find((k) => k.id === 'factory-mis-mguide-narrow')!;
  const compatNarrow = getCompatibleImplantsForKit(misNarrow, FACTORY_IMPLANT_MODELS);
  assert.equal(compatNarrow.length, 1);
  assert.equal(compatNarrow[0].id, 'factory-implant-mis-mguide');
  assert.deepEqual(compatNarrow[0].diametersMm, [3.3, 3.75]);

  const brands = groupLibraryByBrand(FACTORY_DRILLING_KITS, FACTORY_IMPLANT_MODELS);
  assert.deepEqual(
    brands.map((b) => b.brandName),
    ['Biotech Dental', 'Global D', 'MIS (Dentsply Sirona)'],
  );

  const biotechKit = FACTORY_DRILLING_KITS[0];
  const unmodifiedGeom = computeImplantGeometry(DEFAULT_SIMULATION_PARAMS, FACTORY_DRILLING_KITS);
  assert.equal(hasAnyModifiedParam(DEFAULT_SIMULATION_PARAMS, unmodifiedGeom, biotechKit), false);

  const modifiedParams = { ...DEFAULT_SIMULATION_PARAMS, gingivaThickness: 3.5 };
  const modifiedGeom = computeImplantGeometry(modifiedParams, FACTORY_DRILLING_KITS);
  assert.equal(hasAnyModifiedParam(modifiedParams, modifiedGeom, biotechKit), true);
});

test('MIS MGUIDE official catalog mapping & Dentsply ring colors match Ø3.3 Yellow, Ø3.75 Red, Ø4.2 Blue, Ø5.0 Green, and Ø2.4 no-ring steel', async () => {
  const { DENTSPLY_MIS_DRILL_COLORS, formatMetricMm } = await import('./implantGeometry');

  assert.equal(formatMetricMm(3.75), '3.75');
  assert.equal(formatMetricMm(3.3), '3.3');
  assert.equal(formatMetricMm(5.0), '5.0');

  const pilotSpec = DENTSPLY_MIS_DRILL_COLORS.find((c) => c.diameterMm === 2.4);
  assert.equal(pilotSpec?.ringColorHex, null);

  const cases: Array<{ kitId: string; impDia: number; expectedDrill: number; expectedColor: string; expectedMarking: string }> = [
    { kitId: 'factory-mis-mguide-narrow', impDia: 3.3, expectedDrill: 3.2, expectedColor: '#EAB308', expectedMarking: 'Ø3.2 · 10 mm' },
    { kitId: 'factory-mis-mguide-narrow', impDia: 3.75, expectedDrill: 3.6, expectedColor: '#DC2626', expectedMarking: 'Ø3.6 · 10 mm' },
    { kitId: 'factory-mis-mguide', impDia: 3.3, expectedDrill: 3.2, expectedColor: '#EAB308', expectedMarking: 'Ø3.2 · 10 mm' },
    { kitId: 'factory-mis-mguide', impDia: 3.75, expectedDrill: 3.6, expectedColor: '#DC2626', expectedMarking: 'Ø3.6 · 10 mm' },
    { kitId: 'factory-mis-mguide', impDia: 4.2, expectedDrill: 4.1, expectedColor: '#1D4ED8', expectedMarking: 'Ø4.1 · 10 mm' },
    { kitId: 'factory-mis-mguide', impDia: 5.0, expectedDrill: 4.9, expectedColor: '#15803D', expectedMarking: 'Ø4.9 · 10 mm' },
  ];

  for (const c of cases) {
    const kit = FACTORY_DRILLING_KITS.find((k) => k.id === c.kitId)!;
    const geom = computeImplantGeometry(
      {
        ...DEFAULT_SIMULATION_PARAMS,
        activeKitId: kit.id,
        implantBrand: 'mis',
        customImplantId: 'factory-implant-mis-mguide',
        implantDiameter: c.impDia,
        implantLength: 10.0,
        hasSleeve: kit.factoryDefaults.hasSleeve,
        sleeveSeating: kit.factoryDefaults.sleeveSeating,
        sleeveLipThickness: kit.factoryDefaults.sleeveLipThicknessMm,
        sleeveWallThickness: kit.factoryDefaults.sleeveWallThicknessMm,
        drillToSleeveClearance: kit.factoryDefaults.drillToSleeveClearanceMm,
        printingClearance: kit.factoryDefaults.printingClearanceMm,
        guidingDiameter: kit.factoryDefaults.guidingDiameterMm,
        guideHeight: kit.factoryDefaults.guidingHeightMm,
        offsetOverride: kit.factoryDefaults.offsetMm,
      },
      FACTORY_DRILLING_KITS,
    );
    assert.equal(geom.drillActiveDiameter, c.expectedDrill);
    assert.equal(geom.drillRingColorHex, c.expectedColor);
    assert.equal(geom.drillMarking, c.expectedMarking);
    assert.equal(geom.blueSkyPlan.guideOffsetMm, 9.5);
  }
});

test('Biotech Dental AtlaSurgery 2 drill color codes match KATLAFE catalog (Ø2.0 steel no-ring, Ø3.0 Yellow, Ø3.6 Magenta, Ø4.2 Blue, Ø4.8 Green)', async () => {
  const { BIOTECH_DRILL_SPECS } = await import('./implantGeometry');
  const byDia = Object.fromEntries(BIOTECH_DRILL_SPECS.map((s) => [s.diameter, s.ringColorHex]));
  assert.equal(byDia[2.0], null);
  assert.equal(byDia[3.0], '#EAB308');
  assert.equal(byDia[3.6], '#D946EF');
  assert.equal(byDia[4.2], '#2563EB');
  assert.equal(byDia[4.8], '#16A34A');
});





