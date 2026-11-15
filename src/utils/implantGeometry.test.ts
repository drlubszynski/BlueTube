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
  createImplantLibraryEntry,
  getDefaultParamPatch,
  getElementHighlightConfig,
  getGuidedDrillOptions,
  groupImplantModelsByBrand,
  matchGuidedDrillToImplant,
  pickOptimalGuidedOffset,
  pickOptimalPilotLength,
  sortImplantModelsByUsage,
  sortKitsByUsage,
} from './implantGeometry';

test('Biotech sleepless kit defaults to optimal achievable drill offset without pending suggestions', () => {
  const geom = computeImplantGeometry(DEFAULT_SIMULATION_PARAMS, FACTORY_DRILLING_KITS);

  assert.equal(geom.offsetCao, 10.0);
  assert.equal(geom.drillUsefulLength, 20.0);
  assert.equal(geom.matchedGuidedDrillLengthMm, 8.0);
  assert.equal(geom.drillMarking, 'Ø4.2 · 8 mm');
  assert.equal(geom.freeSpaceUnderGuide, 3.5);
  assert.equal(geom.surgicalGuideOffsetMm, 0.25);
  assert.equal(geom.guideTubeExtension, 'gingiva');
  assert.equal(geom.suggestion, null);
  assert.equal(FACTORY_DRILLING_KITS[0].factoryDefaults.surgicalGuideOffsetMm, 0.25);
  assert.equal(FACTORY_DRILLING_KITS[1].factoryDefaults.surgicalGuideOffsetMm, 0.25);
  const boneGeom = computeImplantGeometry(
    { ...DEFAULT_SIMULATION_PARAMS, guideTubeExtension: 'bone' },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(boneGeom.guideTubeExtension, 'bone');
  assert.equal(boneGeom.blueSkyPlan.guideOffsetMm, geom.blueSkyPlan.guideOffsetMm);
  assert.equal(geom.safety.status, 'optimal');
  assert.equal(geom.blueSkyPlan.guideOffsetMm, 10.0);
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
  // On 10 mm implant with [8, 10, 12] drills calibrated at 12 mm, 12.0 mm offset uses the 10 mm drill
  // and proposes 10.0 mm using the shorter 8 mm drill (never an unachievable 9.0 mm offset)
  assert.equal(above.suggestion?.patch.offsetOverride, 10.0);

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
  assert.equal(optimalSleeve.offsetCao, 10.0);
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
  // 8 mm implant with Biotech [8, 10, 12] drills calibrated at 12 mm -> physical drills [20, 22, 24] -> offsets [12, 14, 16]
  const optionsL8 = getGuidedDrillOptions(8.0, 12.0, BIOTECH_GUIDED_DRILL_LENGTHS, 0.5, 2.0, 4.0);
  assert.deepEqual(
    optionsL8.map((o) => o.offsetMm),
    [12.0, 14.0, 16.0],
  );
  assert.equal(
    pickOptimalGuidedOffset(0.5, 2.0, 4.0, false, 'factory-biotech-kontact', 8.0, 12.0, BIOTECH_GUIDED_DRILL_LENGTHS),
    12.0,
  );

  // At 12.0 mm on L8 implant, no shorter drill than 8 mm exists -> Optimal, no suggestion
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

  // At 14.0 mm on L8 implant (using 10 mm drill), suggestion proposes 12.0 mm (using 8 mm drill)
  const l8Oversized = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 8.0,
      offsetOverride: 14.0,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(l8Oversized.matchedGuidedDrillLengthMm, 10.0);
  assert.equal(l8Oversized.suggestion?.patch.offsetOverride, 12.0);

  // 12 mm implant -> offsets [8, 10, 12]; optimal is 8.0 mm (8 mm drill, 1.5 mm free space)
  const l12Optimal = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 12.0,
      offsetOverride: pickOptimalGuidedOffset(0.5, 2.0, 4.0, false, 'factory-biotech-kontact', 12.0, 12.0, BIOTECH_GUIDED_DRILL_LENGTHS),
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(l12Optimal.offsetCao, 8.0);
  assert.equal(l12Optimal.suggestion, null);

  // Thick gingiva (4.5 mm) on L10 makes 10.0 mm offset have < 1.5 mm clearance -> suggests 12.0 mm (10 mm drill)
  const thickGingiva = computeImplantGeometry(
    {
      ...DEFAULT_SIMULATION_PARAMS,
      implantLength: 10.0,
      gingivaThickness: 4.5,
      subcrestalDepth: 0.5,
      guideHeight: 4.0,
      offsetOverride: 10.0,
    },
    FACTORY_DRILLING_KITS,
  );
  assert.equal(thickGingiva.suggestion?.patch.offsetOverride, 12.0);

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

test('Biotech guided drills match 8, 10, 12 mm lengths and clinical suggestion proposes optimal offset when oversized', () => {
  const matched8 = matchGuidedDrillToImplant(3.6, 8.0, [8, 10, 12]);
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
  assert.equal(geomLong.suggestion!.patch.offsetOverride, 10.0);
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
  assert.equal(FACTORY_DRILLING_KITS[0].name, 'Forage guidé Biotech Kontact');
  assert.equal(FACTORY_DRILLING_KITS[1].name, 'Foret pilote Global D');
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
  assert.equal(implantCfg?.openDrawer, null);
  assert.deepEqual(implantCfg?.params, ['implantDiameter', 'implantLength']);

  const gingivaCfg = getElementHighlightConfig('gingiva');
  assert.equal(gingivaCfg?.openDrawer, 3);
  assert.deepEqual(gingivaCfg?.params, ['gingivaThickness']);

  const subcrestalCfg = getElementHighlightConfig('subcrestal');
  assert.equal(subcrestalCfg?.openDrawer, 3);
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
  assert.equal(drillCfg?.openDrawer, null);
  assert.ok(drillCfg?.params.includes('offsetCao'));
  assert.ok(drillCfg?.params.includes('drillUsefulLength'));

  const handpieceCfg = getElementHighlightConfig('handpiece');
  assert.equal(handpieceCfg?.openDrawer, 4);
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
  assert.equal(sorted.length, 4);
  assert.deepEqual(
    sorted.slice(0, 3).map((m) => m.id),
    ['imp-nobel', 'factory-implant-biotech-kontact', 'factory-implant-globald-inkone'],
  );

  const groupedExtra = groupImplantModelsByBrand(sorted.slice(3));
  assert.equal(groupedExtra.length, 1);
  assert.equal(groupedExtra[0].brand, 'Anthogyr');
  assert.equal(groupedExtra[0].models[0].model, 'Axiom X3');
});



