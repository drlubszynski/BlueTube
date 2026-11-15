import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Ruler,
  X,
} from 'lucide-react';
import {
  ComputedGeometry,
  ResettableParamKey,
  SimulationParams,
  clamp,
  pickOptimalPilotLength,
  roundTo,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

interface CaliperWizardProps {
  params: SimulationParams;
  geometry: ComputedGeometry;
  filters: { fullscreen: boolean };
  theme: 'light' | 'dark';
  editingKitId?: string | null;
  editingKitName?: string;
  onChangeParams: (patch: Partial<SimulationParams>) => void;
  onResetParam: (key: ResettableParamKey) => void;
  onToggleFilter: (key: 'fullscreen') => void;
  onSaveNewKit: (name: string) => void;
  onCancel: () => void;
}

export type WizardStepId =
  | 'kind'
  | 'sleeve'
  | 'seating'
  | 'sleeveLip'
  | 'sleeveWall'
  | 'drillSleeveClearance'
  | 'drillStop'
  | 'guidingDiameter'
  | 'guidingHeight'
  | 'printingClearance'
  | 'surgicalGuideOffset'
  | 'drillCatalog'
  | 'implantCorrelation'
  | 'recap';

interface WizardStepDef {
  id: WizardStepId;
  shortLabel: string;
  titleFr: string;
  titleEn: string;
  subtitle: string;
}

interface RippleInstance {
  id: number;
  x: number;
  y: number;
}

function RippleChoiceCard({
  selected,
  title,
  subtitle,
  caption,
  testId,
  onChoose,
  children,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  caption: string;
  testId: string;
  onChoose: () => void;
  children: React.ReactNode;
}) {
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    let x = rect ? rect.width / 2 : 140;
    let y = rect ? rect.height / 2 : 110;
    if (rect && e.clientX > 0 && e.clientY > 0) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 500);
    onChoose();
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      data-testid={testId}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-150 active:scale-[0.985] ${
        selected
          ? 'border-sky-600 bg-sky-50/70 ring-1 ring-sky-500/35 shadow-sm'
          : 'border-slate-200 bg-white hover:border-sky-400 hover:shadow-xs'
      }`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="ripple-shockwave"
          style={{ left: r.x, top: r.y }}
        />
      ))}

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <p className="mt-0.5 text-[11.5px] text-slate-600">{subtitle}</p>
        </div>
        <CheckCircle2
          className={`mt-0.5 h-5 w-5 shrink-0 transition-colors ${
            selected ? 'text-sky-600' : 'text-slate-300 group-hover:text-sky-400'
          }`}
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80 p-1.5">
        {children}
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2 text-[11px] font-semibold text-sky-800">
        <span>{caption}</span>
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

function CaliperParamSlider({
  id,
  labelFr,
  labelEn,
  note,
  value,
  min,
  max,
  step,
  unit = 'mm',
  decimals = 2,
  onChange,
  onReset,
}: {
  id: string;
  labelFr: string;
  labelEn: string;
  note?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  onChange: (val: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-semibold text-slate-800">
          <BilingualTerm fr={labelFr} en={labelEn} />
        </label>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono-tabular text-sm font-bold text-sky-700">
            {value.toFixed(decimals)} {unit}
          </span>
          <button
            type="button"
            onClick={onReset}
            aria-label={`Réinitialiser ${labelFr}`}
            title={`Réinitialiser ${labelFr}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {note && <p className="mt-1 text-[11.5px] text-slate-500">{note}</p>}

      <div className="mt-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(clamp(roundTo(value - step, 2), min, max))}
          aria-label={`Diminuer ${labelFr}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamp(value, min, max)}
          title="Double-cliquer pour réinitialiser par défaut"
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={onReset}
          className="cad-slider flex-1"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(roundTo(value + step, 2), min, max))}
          aria-label={`Augmenter ${labelFr}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function CaliperWizard({
  params,
  geometry,
  filters,
  theme,
  editingKitId = null,
  editingKitName = '',
  onChangeParams,
  onResetParam,
  onToggleFilter,
  onSaveNewKit,
  onCancel,
}: CaliperWizardProps) {
  const [stepIndex, setStepIndex] = useState(() => (editingKitId ? 99 : 0));
  const [fromRecap, setFromRecap] = useState(false);
  const [kitName, setKitName] = useState(() => editingKitName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [newLengthInput, setNewLengthInput] = useState('');
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [newDrillDiaInput, setNewDrillDiaInput] = useState('');
  const [drillDiaError, setDrillDiaError] = useState<string | null>(null);
  const [newImplantDiaInput, setNewImplantDiaInput] = useState('');
  const [implantDiaError, setImplantDiaError] = useState<string | null>(null);
  const [newImplantLenInput, setNewImplantLenInput] = useState('');
  const [implantLenError, setImplantLenError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'diameter' | 'height' | 'offset' | 'all' | null>(null);

  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setKitName(editingKitName ?? '');
    setStepIndex(editingKitId ? 99 : 0);
    setFromRecap(false);
    setNameError(null);
  }, [editingKitId, editingKitName]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const steps: WizardStepDef[] = useMemo(() => {
    const base: WizardStepDef[] = [
      {
        id: 'kind',
        shortLabel: 'Type foret',
        titleFr: 'Type de foret du système implantaire',
        titleEn: 'Drill System Type: Guided vs Pilot',
        subtitle:
          'Cliquez sur une des deux options pour définir si votre système utilise des forets guidés ou des forets pilotes.',
      },
      {
        id: 'sleeve',
        shortLabel: 'Douille',
        titleFr: 'Avec ou sans douille métallique',
        titleEn: 'Metal Sleeve vs Sleeveless Guide',
        subtitle:
          'Indiquez si vos forets travaillent dans une douille métallique ou directement dans le guide résine.',
      },
    ];

    if (params.wizardHasSleeve) {
      base.push(
        {
          id: 'seating',
          shortLabel: 'Position',
          titleFr: 'Position de la collerette sur le guide',
          titleEn: 'Sleeve Collar Seating Position',
          subtitle:
            'Précisez si la collerette repose au-dessus du guide (épaisseur déduite du décalage) ou à fleur.',
        },
        {
          id: 'sleeveLip',
          shortLabel: 'Collerette',
          titleFr: 'Épaisseur de la collerette de douille',
          titleEn: 'Sleeve Collar Lip Thickness',
          subtitle:
            'Mesurez au pied à coulisse l’épaisseur du rebord supérieur de la douille métallique.',
        },
        {
          id: 'sleeveWall',
          shortLabel: 'Paroi douille',
          titleFr: 'Épaisseur de paroi du cylindre de douille',
          titleEn: 'Sleeve Cylinder Wall Thickness',
          subtitle:
            'Mesurez l’épaisseur d’une paroi métallique (multipliée par 2 dans le diamètre du puits résine).',
        },
        {
          id: 'drillSleeveClearance',
          shortLabel: 'Jeu douille/foret',
          titleFr: 'Jeu souhaité entre douille et foret',
          titleEn: 'Desired Drill-to-Sleeve Clearance',
          subtitle:
            'Réglez la tolérance de glissement entre la partie guidante du foret et l’intérieur de la douille.',
        },
      );
    }

    base.push(
      {
        id: 'drillStop',
        shortLabel: 'Butée foret',
        titleFr: 'Épaisseur de la butée du foret',
        titleEn: 'Drill Stop Thickness (Schematic)',
        subtitle:
          'Mesure visuelle pour un schéma fidèle à l’échelle (n’influe pas sur les cotes Blue Sky Plan).',
      },
      {
        id: 'guidingDiameter',
        shortLabel: 'Ø guidage',
        titleFr: 'Diamètre de la partie guidante du foret',
        titleEn: 'Drill Guiding Barrel Diameter',
        subtitle:
          'Mesurez au pied à coulisse le diamètre du canon lisse qui coulisse dans le guide ou la douille.',
      },
      {
        id: 'guidingHeight',
        shortLabel: 'Hauteur',
        titleFr: 'Hauteur de la partie guidante',
        titleEn: 'Guiding Barrel Height',
        subtitle:
          'Mesurez la hauteur du cylindre guidant (donne la valeur « Hauteur » dans Blue Sky Plan).',
      },
      {
        id: 'printingClearance',
        shortLabel: 'Jeu 3D',
        titleFr: 'Jeu d’impression 3D du guide',
        titleEn: '3D Printing Resin Clearance',
        subtitle:
          'Compense le retrait de polymérisation de la résine pour éviter tout blocage du foret ou de la douille.',
      },
      {
        id: 'surgicalGuideOffset',
        shortLabel: 'Décalage guide',
        titleFr: 'Décalage du guide chirurgical (dents & gencive)',
        titleEn: 'Surgical Guide Offset',
        subtitle:
          'Espace réduit entre l’intrados du guide, les dents et la gencive (0,25 mm par défaut : bon ratio entre friction et facilité de manipulation).',
      },
      {
        id: 'drillCatalog',
        shortLabel: 'Forets & Décalage',
        titleFr: 'Longueurs, diamètres des forets et décalage par défaut',
        titleEn: 'Available Drills & Default Offset',
        subtitle:
          'Définissez les longueurs utiles disponibles, les diamètres de forets et le décalage par défaut.',
      },
      {
        id: 'implantCorrelation',
        shortLabel: 'Implants',
        titleFr: 'Corrélation avec les largeurs et longueurs d’implants',
        titleEn: 'Implant Width & Length Correlation',
        subtitle:
          'Associez les diamètres (Ø) et longueurs (L) d’implants de votre gamme aux forets correspondants.',
      },
      {
        id: 'recap',
        shortLabel: 'Validation BSP',
        titleFr: 'Récapitulatif et valeurs Blue Sky Plan',
        titleEn: 'Summary & Blue Sky Plan Parameters',
        subtitle:
          'Consultez vos mesures et vos valeurs « Tube de guidage de logiciel » puis enregistrez votre système implantaire.',
      },
    );

    return base;
  }, [params.wizardHasSleeve]);

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];
  const { blueSkyPlan } = geometry;

  const scheduleAutoAdvance = (targetIdx: number) => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = window.setTimeout(() => {
      setStepIndex(targetIdx);
      advanceTimerRef.current = null;
    }, 260);
  };

  const goToStep = (idx: number) => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    const clamped = clamp(idx, 0, steps.length - 1);
    setStepIndex(clamped);
    if (steps[clamped]?.id === 'recap') {
      setFromRecap(false);
    }
  };

  const jumpToStepIdFromRecap = (targetId: WizardStepId) => {
    const idx = steps.findIndex((s) => s.id === targetId);
    if (idx >= 0) {
      setFromRecap(true);
      goToStep(idx);
    }
  };

  const handleSelectKind = (kind: 'guided' | 'pilot') => {
    const defaultLengths =
      kind === 'pilot' ? [17.3, 19.0, 20.5, 22.0, 23.5, 25.5] : [6.0, 8.0, 10.0, 12.0, 14.0, 16.0];
    const defaultDrillDias = kind === 'pilot' ? [2.0] : [2.0, 3.0, 3.6, 4.2, 4.8];
    const defaultImplantDias =
      kind === 'pilot' ? [3.0, 3.5, 4.0, 4.5, 5.0] : [3.0, 3.6, 4.2, 4.8];
    const defaultImplantLens =
      kind === 'pilot' ? [6.0, 8.5, 10.0, 11.5, 13.0, 15.0] : [6.0, 8.0, 10.0, 12.0, 14.0, 16.0];

    onChangeParams({
      wizardKind: kind,
      wizardGuidingDiameter: kind === 'pilot' ? 2.0 : 5.0,
      wizardDefaultOffset: kind === 'pilot' ? 10.5 : 12.0,
      wizardAvailableLengths: defaultLengths,
      wizardDrillDiameters: defaultDrillDias,
      wizardImplantDiameters: defaultImplantDias,
      wizardImplantLengths: defaultImplantLens,
      wizardImplantToDrillDiameterMap:
        kind === 'pilot'
          ? { '3.0': 2.0, '3.5': 2.0, '4.0': 2.0, '4.5': 2.0, '5.0': 2.0 }
          : { '3.0': 3.0, '3.6': 3.6, '4.2': 4.2, '4.8': 4.8 },
    });
    scheduleAutoAdvance(safeIndex + 1);
  };

  const handleSelectSleeve = (hasSleeve: boolean) => {
    onChangeParams({
      wizardHasSleeve: hasSleeve,
      wizardPrintingClearance: hasSleeve ? 0.05 : 0.15,
    });
    scheduleAutoAdvance(safeIndex + 1);
  };

  const handleSelectSeating = (seating: 'above' | 'flush') => {
    onChangeParams({ wizardSleeveSeating: seating });
    scheduleAutoAdvance(safeIndex + 1);
  };

  // Array chip management helpers
  const handleAddLength = () => {
    const parsed = parseFloat(newLengthInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 4 || parsed > 40) {
      setLengthError('Entrez une longueur entre 4 et 40 mm.');
      return;
    }
    const rounded = roundTo(parsed, 1);
    if (params.wizardAvailableLengths.some((l) => Math.abs(l - rounded) < 0.05)) {
      setLengthError('Déjà présente.');
      return;
    }
    setLengthError(null);
    onChangeParams({
      wizardAvailableLengths: [...params.wizardAvailableLengths, rounded].sort((a, b) => a - b),
    });
    setNewLengthInput('');
  };

  const handleRemoveLength = (len: number) => {
    if (params.wizardAvailableLengths.length <= 1) return;
    onChangeParams({
      wizardAvailableLengths: params.wizardAvailableLengths.filter((x) => Math.abs(x - len) >= 0.05),
    });
  };

  const handleAddDrillDia = () => {
    const parsed = parseFloat(newDrillDiaInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 1.2 || parsed > 6.5) {
      setDrillDiaError('Diamètre entre 1.2 et 6.5 mm.');
      return;
    }
    const rounded = roundTo(parsed, 1);
    if (params.wizardDrillDiameters.some((d) => Math.abs(d - rounded) < 0.05)) {
      setDrillDiaError('Déjà présent.');
      return;
    }
    setDrillDiaError(null);
    onChangeParams({
      wizardDrillDiameters: [...params.wizardDrillDiameters, rounded].sort((a, b) => a - b),
    });
    setNewDrillDiaInput('');
  };

  const handleRemoveDrillDia = (dia: number) => {
    if (params.wizardDrillDiameters.length <= 1) return;
    const remaining = params.wizardDrillDiameters.filter((x) => Math.abs(x - dia) >= 0.05);
    const updatedMap = { ...params.wizardImplantToDrillDiameterMap };
    for (const key of Object.keys(updatedMap)) {
      if (Math.abs(updatedMap[key] - dia) < 0.05) {
        updatedMap[key] = remaining[0];
      }
    }
    onChangeParams({
      wizardDrillDiameters: remaining,
      wizardImplantToDrillDiameterMap: updatedMap,
    });
  };

  const handleAddImplantDia = () => {
    const parsed = parseFloat(newImplantDiaInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 2.2 || parsed > 7.0) {
      setImplantDiaError('Diamètre entre 2.2 et 7.0 mm.');
      return;
    }
    const rounded = roundTo(parsed, 1);
    if (params.wizardImplantDiameters.some((d) => Math.abs(d - rounded) < 0.05)) {
      setImplantDiaError('Déjà présent.');
      return;
    }
    setImplantDiaError(null);
    const sortedDrillDias = [...params.wizardDrillDiameters].sort((a, b) => a - b);
    let closestDrill = sortedDrillDias[0] ?? 3.0;
    for (const d of sortedDrillDias) {
      if (d <= rounded + 0.05) closestDrill = d;
    }
    onChangeParams({
      wizardImplantDiameters: [...params.wizardImplantDiameters, rounded].sort((a, b) => a - b),
      wizardImplantToDrillDiameterMap: {
        ...params.wizardImplantToDrillDiameterMap,
        [rounded.toFixed(1)]: closestDrill,
      },
    });
    setNewImplantDiaInput('');
  };

  const handleRemoveImplantDia = (dia: number) => {
    if (params.wizardImplantDiameters.length <= 1) return;
    const nextMap = { ...params.wizardImplantToDrillDiameterMap };
    delete nextMap[dia.toFixed(1)];
    onChangeParams({
      wizardImplantDiameters: params.wizardImplantDiameters.filter((x) => Math.abs(x - dia) >= 0.05),
      wizardImplantToDrillDiameterMap: nextMap,
    });
  };

  const handleAddImplantLen = () => {
    const parsed = parseFloat(newImplantLenInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 4.0 || parsed > 20.0) {
      setImplantLenError('Longueur entre 4 et 20 mm.');
      return;
    }
    const rounded = roundTo(parsed, 1);
    if (params.wizardImplantLengths.some((l) => Math.abs(l - rounded) < 0.05)) {
      setImplantLenError('Déjà présente.');
      return;
    }
    setImplantLenError(null);
    onChangeParams({
      wizardImplantLengths: [...params.wizardImplantLengths, rounded].sort((a, b) => a - b),
    });
    setNewImplantLenInput('');
  };

  const handleRemoveImplantLen = (len: number) => {
    if (params.wizardImplantLengths.length <= 1) return;
    onChangeParams({
      wizardImplantLengths: params.wizardImplantLengths.filter((x) => Math.abs(x - len) >= 0.05),
    });
  };

  const handleCopyBsp = async (
    text: string,
    key: 'diameter' | 'height' | 'offset' | 'all',
  ) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = kitName.trim();
    if (!trimmed) {
      setNameError('Veuillez saisir un nom pour votre système implantaire.');
      return;
    }
    setNameError(null);
    onSaveNewKit(trimmed);
    setKitName('');
    setStepIndex(0);
  };

  // Locked CAD SVG Coordinates for 1-parameter caliper views
  const SVG_W = 680;
  const SVG_H = 340;
  const CX = 350;

  const yShankTop = 22;
  const yStopTop = 76;
  const stopHeightPx = clamp(params.wizardDrillStopThickness * 11, 12, 38);
  const yStopBottom = yStopTop + stopHeightPx;
  const stopHalfW = 46;

  const guidingBarrelHalfW = clamp((params.wizardGuidingDiameter / 5.0) * 30, 14, 36);
  const guidingBarrelHeightPx = clamp(params.wizardGuidingHeight * 12.5, 28, 96);
  const yGuidingBottom = yStopBottom + guidingBarrelHeightPx;

  const previewDrillUsefulLen = geometry.drillUsefulLength;
  const drillTotalUnderStopPx = clamp(previewDrillUsefulLen * 8.4, 115, 226);
  const yDrillTip = Math.min(SVG_H - 18, yStopBottom + drillTotalUnderStopPx);
  const yStepStart = Math.min(yDrillTip - 22, yGuidingBottom + 10);

  const cuttingHalfW =
    params.wizardKind === 'pilot'
      ? clamp(guidingBarrelHalfW * 0.7, 7, 15)
      : clamp(guidingBarrelHalfW * 0.44, 7, 14);
  const tipStepHalfW = Math.max(4.5, cuttingHalfW * 0.72);

  const sleeveLipPx = clamp(params.wizardSleeveLipThickness * 16, 4, 24);
  const sleeveWallPx = clamp(params.wizardSleeveWallThickness * 24, 7, 22);
  const sleeveResinOffsetY =
    params.wizardSleeveSeating === 'above' ? yStopBottom + sleeveLipPx : yStopBottom;

  const holeStr = blueSkyPlan.guideHoleDiameterMm.toFixed(2);
  const heightStr = blueSkyPlan.sleeveHeightMm.toFixed(2);
  const offsetStr = blueSkyPlan.guideOffsetMm.toFixed(2);
  const isDark = theme === 'dark';

  const isBinaryChoiceStep =
    currentStep.id === 'kind' || currentStep.id === 'sleeve' || currentStep.id === 'seating';

  return (
    <div
      data-testid="caliper-wizard-panel"
      className={`relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs ${
        filters.fullscreen ? 'fixed inset-3 z-50 overflow-auto shadow-2xl' : ''
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Ruler className="h-4 w-4 text-sky-600 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 whitespace-nowrap">
            <BilingualTerm
              fr={
                editingKitId
                  ? `Modifier le système : ${editingKitName || kitName}`
                  : 'Assistant pied à coulisse — Créer mon système implantaire'
              }
              en="Digital Caliper Guided Implant System Wizard"
            />
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono-tabular rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
            Étape {safeIndex + 1} / {steps.length}
          </span>

          <button
            type="button"
            onClick={() => onToggleFilter('fullscreen')}
            aria-label={filters.fullscreen ? 'Quitter le mode plein écran' : 'Mode plein écran'}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
          >
            {filters.fullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                Réduire
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                Plein écran
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap hover:bg-slate-50 hover:text-slate-900"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Compact Stepper Strip */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70 px-4 py-2">
        {steps.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goToStep(idx)}
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              idx === safeIndex
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : idx < safeIndex
                  ? 'bg-white border border-slate-200 text-slate-800 hover:border-sky-400'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
            }`}
          >
            {idx + 1}. {s.shortLabel}
          </button>
        ))}
      </div>

      {/* Step Header */}
      <div className="border-b border-slate-100 bg-white px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">
          <BilingualTerm fr={currentStep.titleFr} en={currentStep.titleEn} />
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">{currentStep.subtitle}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* ALL-IN-ONE BINARY CHOICE BUTTONS WITH SHOCKWAVE RIPPLE + AUTO-ADVANCE */}
        {currentStep.id === 'kind' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="step1-kind-choices">
            <RippleChoiceCard
              selected={params.wizardKind === 'guided'}
              title="Forets classiques guidés"
              subtitle="Décalage fixe · Diamètres croissants (ex. Biotech Kontact 6–16 mm · décalage 12 mm)"
              caption="Sélectionner Forets guidés"
              testId="wizard-kind-guided"
              onChoose={() => handleSelectKind('guided')}
            >
              <svg viewBox="0 0 280 185" className="h-[185px] w-full rounded bg-[#F8FAFC]">
                <rect x="0" y="0" width="280" height="185" fill="#F8FAFC" />
                {[
                  { x: 68, w: 12, color: '#EAB308', label: 'Ø 3.0' },
                  { x: 140, w: 18, color: '#D946EF', label: 'Ø 3.6' },
                  { x: 212, w: 24, color: '#2563EB', label: 'Ø 4.2' },
                ].map((d) => (
                  <g key={d.label}>
                    <rect x={d.x - 5} y="14" width="10" height="22" fill="#CBD5E1" stroke="#475569" />
                    <rect x={d.x - 18} y="36" width="36" height="12" rx="2" fill="#E2E8F0" stroke="#334155" />
                    <rect x={d.x - 18} y="39" width="36" height="4" fill={d.color} />
                    <rect x={d.x - 14} y="48" width="28" height="44" fill="#E2E8F0" stroke="#334155" />
                    <rect x={d.x - d.w / 2} y="92" width={d.w} height="66" fill="#CBD5E1" stroke="#334155" />
                    <text x={d.x} y="174" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0F172A">
                      {d.label}
                    </text>
                  </g>
                ))}
              </svg>
            </RippleChoiceCard>

            <RippleChoiceCard
              selected={params.wizardKind === 'pilot'}
              title="Forets pilotes (calcul inversé)"
              subtitle="Diamètre unique · Longueurs L17.3 à L25.5 mm (ex. Global D)"
              caption="Sélectionner Forets pilotes"
              testId="wizard-kind-pilot"
              onChoose={() => handleSelectKind('pilot')}
            >
              <svg viewBox="0 0 280 185" className="h-[185px] w-full rounded bg-[#F8FAFC]">
                <rect x="0" y="0" width="280" height="185" fill="#F8FAFC" />
                {[
                  { x: 68, len: 82, label: 'L17.3' },
                  { x: 140, len: 102, label: 'L20.5' },
                  { x: 212, len: 122, label: 'L25.5' },
                ].map((d) => (
                  <g key={d.label}>
                    <rect x={d.x - 5} y="14" width="10" height="22" fill="#CBD5E1" stroke="#475569" />
                    <rect x={d.x - 14} y="36" width="28" height="11" rx="2" fill="#E2E8F0" stroke="#334155" />
                    <rect x={d.x - 7} y="47" width="14" height={d.len} fill="#CBD5E1" stroke="#334155" />
                    <text x={d.x} y={62 + d.len} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0F172A">
                      {d.label}
                    </text>
                  </g>
                ))}
              </svg>
            </RippleChoiceCard>
          </div>
        )}

        {currentStep.id === 'sleeve' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="step2-sleeve-choices">
            <RippleChoiceCard
              selected={params.wizardHasSleeve}
              title="Avec douille métallique"
              subtitle="La douille titane s’interpose entre la résine du guide et le foret."
              caption="Configurer avec douille"
              testId="wizard-sleeve-yes"
              onChoose={() => handleSelectSleeve(true)}
            >
              <svg viewBox="0 0 280 185" className="h-[185px] w-full rounded bg-[#F8FAFC]">
                <rect x="0" y="0" width="280" height="185" fill="#F8FAFC" />
                <rect x="64" y="68" width="46" height="86" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="170" y="68" width="46" height="86" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="110" y="60" width="12" height="94" fill="#94A3B8" stroke="#334155" />
                <rect x="158" y="60" width="12" height="94" fill="#94A3B8" stroke="#334155" />
                <rect x="102" y="60" width="20" height="9" fill="#CBD5E1" stroke="#0F172A" />
                <rect x="158" y="60" width="20" height="9" fill="#CBD5E1" stroke="#0F172A" />
                <rect x="130" y="18" width="20" height="24" fill="#CBD5E1" stroke="#475569" />
                <rect x="106" y="42" width="68" height="18" rx="2" fill="#E2E8F0" stroke="#334155" />
                <rect x="106" y="47" width="68" height="5" fill="#2563EB" />
                <rect x="125" y="60" width="30" height="94" fill="#E2E8F0" stroke="#334155" />
                <rect x="133" y="154" width="14" height="24" fill="#CBD5E1" stroke="#334155" />
              </svg>
            </RippleChoiceCard>

            <RippleChoiceCard
              selected={!params.wizardHasSleeve}
              title="Sans douille (résine intégrale)"
              subtitle="La butée appuie directement sur le sommet du guide résine imprimé en 3D."
              caption="Configurer sans douille"
              testId="wizard-sleeve-no"
              onChoose={() => handleSelectSleeve(false)}
            >
              <svg viewBox="0 0 280 185" className="h-[185px] w-full rounded bg-[#F8FAFC]">
                <rect x="0" y="0" width="280" height="185" fill="#F8FAFC" />
                <rect x="68" y="60" width="54" height="94" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="158" y="60" width="54" height="94" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="130" y="18" width="20" height="24" fill="#CBD5E1" stroke="#475569" />
                <rect x="106" y="42" width="68" height="18" rx="2" fill="#E2E8F0" stroke="#334155" />
                <rect x="106" y="47" width="68" height="5" fill="#2563EB" />
                <rect x="125" y="60" width="30" height="94" fill="#E2E8F0" stroke="#334155" />
                <rect x="133" y="154" width="14" height="24" fill="#CBD5E1" stroke="#334155" />
              </svg>
            </RippleChoiceCard>
          </div>
        )}

        {currentStep.id === 'seating' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="step3-seating-choices">
            <RippleChoiceCard
              selected={params.wizardSleeveSeating === 'above'}
              title="Au-dessus du guide"
              subtitle="La collerette déborde sur le dessus du guide : son épaisseur est déduite du décalage Blue Sky Plan."
              caption="Déduire l’épaisseur de collerette"
              testId="wizard-seating-above"
              onChoose={() => handleSelectSeating('above')}
            >
              <svg viewBox="0 0 280 185" className="h-[185px] w-full rounded bg-[#F8FAFC]">
                <rect x="0" y="0" width="280" height="185" fill="#F8FAFC" />
                <rect x="58" y="72" width="52" height="84" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="170" y="72" width="52" height="84" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="110" y="58" width="12" height="98" fill="#94A3B8" stroke="#334155" />
                <rect x="158" y="58" width="12" height="98" fill="#94A3B8" stroke="#334155" />
                <rect x="98" y="58" width="24" height="14" fill="#F59E0B" fillOpacity="0.85" stroke="#0F172A" />
                <rect x="158" y="58" width="24" height="14" fill="#F59E0B" fillOpacity="0.85" stroke="#0F172A" />
                <rect x="125" y="42" width="30" height="114" fill="#E2E8F0" stroke="#334155" />
                <text x="140" y="28" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#B45309">
                  Collerette posée au-dessus
                </text>
              </svg>
            </RippleChoiceCard>

            <RippleChoiceCard
              selected={params.wizardSleeveSeating === 'flush'}
              title="À fleur du guide"
              subtitle="La collerette est encastrée dans la résine : 0 mm déduit du décalage Blue Sky Plan."
              caption="Encastrée (0 mm déduit)"
              testId="wizard-seating-flush"
              onChoose={() => handleSelectSeating('flush')}
            >
              <svg viewBox="0 0 280 185" className="h-[185px] w-full rounded bg-[#F8FAFC]">
                <rect x="0" y="0" width="280" height="185" fill="#F8FAFC" />
                <rect x="58" y="58" width="52" height="98" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="170" y="58" width="52" height="98" rx="3" fill="#7DD3FC" fillOpacity="0.48" stroke="#0284C7" strokeWidth="1.4" />
                <rect x="110" y="58" width="12" height="98" fill="#94A3B8" stroke="#334155" />
                <rect x="158" y="58" width="12" height="98" fill="#94A3B8" stroke="#334155" />
                <rect x="98" y="58" width="24" height="12" fill="#CBD5E1" stroke="#0F172A" />
                <rect x="158" y="58" width="24" height="12" fill="#CBD5E1" stroke="#0F172A" />
                <rect x="125" y="42" width="30" height="114" fill="#E2E8F0" stroke="#334155" />
                <text x="140" y="28" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0369A1">
                  Collerette à fleur de la résine
                </text>
              </svg>
            </RippleChoiceCard>
          </div>
        )}

        {/* SINGLE-PARAMETER STEPS + CATALOG + IMPLANT CORRELATION: LOCKED CALIPER SVG STAGE */}
        {!isBinaryChoiceStep && currentStep.id !== 'recap' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className={`w-full select-none ${
                filters.fullscreen ? 'h-[calc(100vh-340px)]' : 'h-[310px]'
              }`}
              data-testid="caliper-stage-svg"
              role="img"
              aria-label={`Étape ${safeIndex + 1} sur ${steps.length} — ${currentStep.titleFr}`}
            >
              <defs>
                <pattern id="caliperCadGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#E2E8F0" strokeWidth="0.6" />
                </pattern>
                <linearGradient id="drillSteel" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="35%" stopColor="#F8FAFC" />
                  <stop offset="72%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#64748B" />
                </linearGradient>
                <linearGradient id="caliperMetal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E2E8F0" />
                  <stop offset="50%" stopColor="#F8FAFC" />
                  <stop offset="100%" stopColor="#CBD5E1" />
                </linearGradient>
                <linearGradient id="caliperMetalVert" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E2E8F0" />
                  <stop offset="50%" stopColor="#F8FAFC" />
                  <stop offset="100%" stopColor="#CBD5E1" />
                </linearGradient>
                <linearGradient id="sleeveTi" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#64748B" />
                  <stop offset="40%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
                <linearGradient id="lcdHousing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#caliperCadGrid)" />
              <line
                x1={CX}
                y1="10"
                x2={CX}
                y2={SVG_H - 10}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="6 4"
              />

              {/* Sleeve + Resin when applicable */}
              {params.wizardHasSleeve && (
                <g>
                  <rect
                    x={CX - guidingBarrelHalfW - sleeveWallPx - 38}
                    y={sleeveResinOffsetY}
                    width="38"
                    height={Math.max(46, guidingBarrelHeightPx)}
                    fill="#7DD3FC"
                    fillOpacity="0.32"
                    stroke="#0284C7"
                    strokeWidth="1"
                  />
                  <rect
                    x={CX + guidingBarrelHalfW + sleeveWallPx}
                    y={sleeveResinOffsetY}
                    width="38"
                    height={Math.max(46, guidingBarrelHeightPx)}
                    fill="#7DD3FC"
                    fillOpacity="0.32"
                    stroke="#0284C7"
                    strokeWidth="1"
                  />
                  <rect
                    x={CX - guidingBarrelHalfW - sleeveWallPx}
                    y={yStopBottom}
                    width={sleeveWallPx}
                    height={Math.max(52, guidingBarrelHeightPx + sleeveLipPx)}
                    fill="url(#sleeveTi)"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={CX + guidingBarrelHalfW}
                    y={yStopBottom}
                    width={sleeveWallPx}
                    height={Math.max(52, guidingBarrelHeightPx + sleeveLipPx)}
                    fill="url(#sleeveTi)"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={CX - guidingBarrelHalfW - sleeveWallPx - 14}
                    y={yStopBottom}
                    width={sleeveWallPx + 14}
                    height={sleeveLipPx}
                    fill={currentStep.id === 'sleeveLip' ? '#F59E0B' : '#CBD5E1'}
                    stroke="#0F172A"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={CX + guidingBarrelHalfW}
                    y={yStopBottom}
                    width={sleeveWallPx + 14}
                    height={sleeveLipPx}
                    fill={currentStep.id === 'sleeveLip' ? '#F59E0B' : '#CBD5E1'}
                    stroke="#0F172A"
                    strokeWidth="1.2"
                  />
                </g>
              )}

              {/* 3D clearance halo around guiding barrel / sleeve */}
              {currentStep.id === 'printingClearance' && (
                <rect
                  x={
                    CX -
                    guidingBarrelHalfW -
                    (params.wizardHasSleeve ? sleeveWallPx : 0) -
                    clamp(params.wizardPrintingClearance * 35, 3, 14)
                  }
                  y={yStopBottom}
                  width={
                    2 *
                    (guidingBarrelHalfW +
                      (params.wizardHasSleeve ? sleeveWallPx : 0) +
                      clamp(params.wizardPrintingClearance * 35, 3, 14))
                  }
                  height={guidingBarrelHeightPx}
                  fill="#38BDF8"
                  fillOpacity="0.22"
                  stroke="#0284C7"
                  strokeWidth="1.4"
                  strokeDasharray="4 3"
                />
              )}

              {/* Pedagogical Drill */}
              <g data-testid="pedagogical-biotech-drill">
                <rect
                  x={CX - 12}
                  y={yShankTop + 10}
                  width="24"
                  height={yStopTop - (yShankTop + 10)}
                  fill="url(#drillSteel)"
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <rect
                  x={CX - stopHalfW}
                  y={yStopTop}
                  width={2 * stopHalfW}
                  height={stopHeightPx}
                  rx="3"
                  fill="url(#drillSteel)"
                  stroke="#1E293B"
                  strokeWidth="1.4"
                />
                <rect
                  x={CX - stopHalfW}
                  y={yStopTop + Math.max(3, stopHeightPx * 0.28)}
                  width={2 * stopHalfW}
                  height={Math.max(5, stopHeightPx * 0.36)}
                  fill="#2563EB"
                  stroke="#1E3A8A"
                  strokeWidth="0.7"
                />
                <rect
                  x={CX - guidingBarrelHalfW}
                  y={yStopBottom}
                  width={2 * guidingBarrelHalfW}
                  height={guidingBarrelHeightPx}
                  fill="url(#drillSteel)"
                  stroke="#1E293B"
                  strokeWidth="1.4"
                />
                <path
                  d={`M ${CX - guidingBarrelHalfW} ${yGuidingBottom}
                      L ${CX - cuttingHalfW} ${yStepStart}
                      L ${CX - cuttingHalfW} ${yDrillTip - 22}
                      L ${CX - tipStepHalfW} ${yDrillTip - 16}
                      L ${CX - tipStepHalfW} ${yDrillTip - 7}
                      L ${CX} ${yDrillTip}
                      L ${CX + tipStepHalfW} ${yDrillTip - 7}
                      L ${CX + tipStepHalfW} ${yDrillTip - 16}
                      L ${CX + cuttingHalfW} ${yDrillTip - 22}
                      L ${CX + cuttingHalfW} ${yStepStart}
                      L ${CX + guidingBarrelHalfW} ${yGuidingBottom} Z`}
                  fill="url(#drillSteel)"
                  stroke="#334155"
                  strokeWidth="1.3"
                />
              </g>

              {/* STEP-SPECIFIC CALIPER JAWS & LCD */}
              {currentStep.id === 'sleeveLip' && (
                <g data-testid="caliper-jaws-sleeve-lip">
                  {(() => {
                    const targetTop = yStopBottom;
                    const targetBottom = yStopBottom + sleeveLipPx;
                    const jawTipX = CX - guidingBarrelHalfW - sleeveWallPx - 14;
                    const beamX = 122;
                    return (
                      <g>
                        <rect x={beamX} y="44" width="24" height="255" rx="2" fill="url(#caliperMetalVert)" stroke="#64748B" />
                        <path d={`M ${beamX} ${targetTop - 16} L ${jawTipX} ${targetTop} L ${beamX + 24} ${targetTop} L ${beamX + 24} ${targetTop - 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <path d={`M ${beamX + 24} ${targetBottom} L ${jawTipX} ${targetBottom} L ${beamX} ${targetBottom + 16} L ${beamX + 24} ${targetBottom + 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <rect x={beamX - 42} y={targetBottom + 18} width="96" height="40" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                        <rect x={beamX - 35} y={targetBottom + 25} width="82" height="26" rx="3" fill="#DCFCE7" />
                        <text x={beamX + 41} y={targetBottom + 43} textAnchor="end" fontSize="13" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                          {params.wizardSleeveLipThickness.toFixed(2)} mm
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {currentStep.id === 'sleeveWall' && (
                <g data-testid="caliper-jaws-sleeve-wall">
                  {(() => {
                    const wallLeft = CX - guidingBarrelHalfW - sleeveWallPx;
                    const wallRight = CX - guidingBarrelHalfW;
                    const beamY = yGuidingBottom + 36;
                    return (
                      <g>
                        <rect x={wallLeft - 110} y={beamY} width="260" height="22" rx="2" fill="url(#caliperMetal)" stroke="#64748B" />
                        <path d={`M ${wallLeft - 14} ${beamY + 22} L ${wallLeft - 14} ${yGuidingBottom + 6} L ${wallLeft} ${yStopBottom + sleeveLipPx + 10} L ${wallLeft} ${beamY + 22} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <path d={`M ${wallRight} ${beamY + 22} L ${wallRight} ${yStopBottom + sleeveLipPx + 10} L ${wallRight + 14} ${yGuidingBottom + 6} L ${wallRight + 14} ${beamY + 22} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <rect x={wallRight + 24} y={beamY - 8} width="112" height="38" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                        <rect x={wallRight + 31} y={beamY - 2} width="98" height="26" rx="3" fill="#DCFCE7" />
                        <text x={wallRight + 122} y={beamY + 16} textAnchor="end" fontSize="13" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                          {params.wizardSleeveWallThickness.toFixed(2)} mm
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {currentStep.id === 'drillSleeveClearance' && (
                <g data-testid="caliper-jaws-drill-sleeve-clearance">
                  <line x1={CX + guidingBarrelHalfW} y1={yStopBottom + 28} x2={CX + guidingBarrelHalfW + 34} y2={yStopBottom + 28} stroke="#0284C7" strokeWidth="1.8" />
                  <circle cx={CX + guidingBarrelHalfW} cy={yStopBottom + 28} r="3" fill="#0284C7" />
                  <rect x={CX + guidingBarrelHalfW + 38} y={yStopBottom + 8} width="146" height="40" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                  <rect x={CX + guidingBarrelHalfW + 45} y={yStopBottom + 15} width="132" height="26" rx="3" fill="#DCFCE7" />
                  <text x={CX + guidingBarrelHalfW + 170} y={yStopBottom + 33} textAnchor="end" fontSize="12.5" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                    Jeu {params.wizardDrillToSleeveClearance.toFixed(2)} mm
                  </text>
                </g>
              )}

              {currentStep.id === 'drillStop' && (
                <g data-testid="caliper-jaws-drill-stop">
                  {(() => {
                    const beamX = 122;
                    return (
                      <g>
                        <rect x={beamX} y="40" width="24" height="240" rx="2" fill="url(#caliperMetalVert)" stroke="#64748B" />
                        <path d={`M ${beamX} ${yStopTop - 16} L ${CX - stopHalfW} ${yStopTop} L ${beamX + 24} ${yStopTop} L ${beamX + 24} ${yStopTop - 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <path d={`M ${beamX + 24} ${yStopBottom} L ${CX - stopHalfW} ${yStopBottom} L ${beamX} ${yStopBottom + 16} L ${beamX + 24} ${yStopBottom + 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <rect x={beamX - 42} y={yStopBottom + 18} width="96" height="40" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                        <rect x={beamX - 35} y={yStopBottom + 25} width="82" height="26" rx="3" fill="#DCFCE7" />
                        <text x={beamX + 41} y={yStopBottom + 43} textAnchor="end" fontSize="13" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                          {params.wizardDrillStopThickness.toFixed(1)} mm
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {currentStep.id === 'guidingDiameter' && (
                <g data-testid="caliper-jaws-guiding-diameter">
                  {(() => {
                    const leftX = CX - guidingBarrelHalfW;
                    const rightX = CX + guidingBarrelHalfW;
                    const beamY = yGuidingBottom + 24;
                    return (
                      <g>
                        <rect x={leftX - 88} y={beamY} width={2 * guidingBarrelHalfW + 250} height="24" rx="2" fill="url(#caliperMetal)" stroke="#64748B" />
                        <path d={`M ${leftX - 18} ${beamY + 24} L ${leftX - 18} ${yGuidingBottom - 2} L ${leftX} ${yStopBottom + 6} L ${leftX} ${beamY + 24} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <path d={`M ${rightX} ${beamY + 24} L ${rightX} ${yStopBottom + 6} L ${rightX + 18} ${yGuidingBottom - 2} L ${rightX + 18} ${beamY + 24} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <rect x={rightX + 22} y={beamY - 8} width="118" height="40" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                        <rect x={rightX + 29} y={beamY - 1} width="104" height="26" rx="3" fill="#DCFCE7" />
                        <text x={rightX + 125} y={beamY + 17} textAnchor="end" fontSize="13" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                          Ø {params.wizardGuidingDiameter.toFixed(2)} mm
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {currentStep.id === 'guidingHeight' && (
                <g data-testid="caliper-jaws-guiding-height">
                  {(() => {
                    const beamX = 122;
                    const jawTipX = CX - guidingBarrelHalfW;
                    return (
                      <g>
                        <rect x={beamX} y="44" width="24" height="255" rx="2" fill="url(#caliperMetalVert)" stroke="#64748B" />
                        <path d={`M ${beamX} ${yStopBottom - 16} L ${jawTipX} ${yStopBottom} L ${beamX + 24} ${yStopBottom} L ${beamX + 24} ${yStopBottom - 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <path d={`M ${beamX + 24} ${yGuidingBottom} L ${jawTipX} ${yGuidingBottom} L ${beamX} ${yGuidingBottom + 16} L ${beamX + 24} ${yGuidingBottom + 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <rect x={beamX - 42} y={(yStopBottom + yGuidingBottom) / 2 - 20} width="96" height="40" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                        <rect x={beamX - 35} y={(yStopBottom + yGuidingBottom) / 2 - 13} width="82" height="26" rx="3" fill="#DCFCE7" />
                        <text x={beamX + 41} y={(yStopBottom + yGuidingBottom) / 2 + 5} textAnchor="end" fontSize="13" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                          H {params.wizardGuidingHeight.toFixed(1)} mm
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {currentStep.id === 'printingClearance' && (
                <g data-testid="caliper-jaws-printing-clearance">
                  <rect x={CX + guidingBarrelHalfW + 64} y={yStopBottom + 12} width="166" height="42" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                  <rect x={CX + guidingBarrelHalfW + 71} y={yStopBottom + 19} width="152" height="28" rx="3" fill="#DCFCE7" />
                  <text x={CX + guidingBarrelHalfW + 214} y={yStopBottom + 38} textAnchor="end" fontSize="12.5" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                    +{params.wizardPrintingClearance.toFixed(2)} mm (3D)
                  </text>
                </g>
              )}

              {currentStep.id === 'surgicalGuideOffset' && (
                <g data-testid="caliper-jaws-surgical-guide-offset">
                  {(() => {
                    const gapPx = clamp(params.wizardSurgicalGuideOffset * 24, 2.5, 16);
                    const gingivaTopY = yStopBottom + guidingBarrelHeightPx + 30;
                    const crownTopY = gingivaTopY - 46;
                    return (
                      <g>
                        {/* Gingiva contour under guide and adjacent tooth */}
                        <path
                          d={`M ${CX - 210} ${gingivaTopY}
                              Q ${CX - 140} ${gingivaTopY - 2} ${CX - 75} ${gingivaTopY}
                              L ${CX - guidingBarrelHalfW} ${gingivaTopY}
                              L ${CX - guidingBarrelHalfW} ${gingivaTopY + 26}
                              L ${CX - 210} ${gingivaTopY + 26} Z`}
                          fill="#F3A6A5"
                          fillOpacity="0.55"
                          stroke="#D97A78"
                          strokeWidth="1.1"
                        />
                        {/* Adjacent tooth crown (with mesial & distal proximal faces down to gingiva) */}
                        <path
                          d={`M ${CX - 186} ${gingivaTopY + 2}
                              C ${CX - 190} ${gingivaTopY - 24}, ${CX - 182} ${crownTopY}, ${CX - 156} ${crownTopY}
                              Q ${CX - 140} ${crownTopY + 4} ${CX - 124} ${crownTopY}
                              C ${CX - 102} ${crownTopY + 2}, ${CX - 98} ${gingivaTopY - 22}, ${CX - 106} ${gingivaTopY + 2} Z`}
                          fill="#F5EFE2"
                          stroke="#B3A387"
                          strokeWidth="1.2"
                        />
                        {/* Surgical guide shell hugging tooth proximally + gingiva at uniform surgicalGuideOffset */}
                        <path
                          d={`M ${CX - 194 - gapPx} ${gingivaTopY - 4}
                              C ${CX - 200 - gapPx} ${gingivaTopY - 30}, ${CX - 190 - gapPx} ${crownTopY - 12 - gapPx}, ${CX - 156} ${crownTopY - 14 - gapPx}
                              Q ${CX - 120} ${crownTopY - 14 - gapPx} ${CX - 94 + gapPx} ${crownTopY - 8 - gapPx}
                              L ${CX - guidingBarrelHalfW - 10} ${yStopBottom + 2}
                              L ${CX - guidingBarrelHalfW} ${yStopBottom + 2}
                              L ${CX - guidingBarrelHalfW} ${gingivaTopY - gapPx}
                              L ${CX - 104 + gapPx} ${gingivaTopY - gapPx}
                              C ${CX - 95 + gapPx} ${gingivaTopY - 22}, ${CX - 100 + gapPx} ${crownTopY - 1 - gapPx}, ${CX - 124} ${crownTopY - gapPx}
                              Q ${CX - 140} ${crownTopY + 3 - gapPx} ${CX - 156} ${crownTopY - gapPx}
                              C ${CX - 184 - gapPx} ${crownTopY - gapPx}, ${CX - 190 - gapPx} ${gingivaTopY - 24}, ${CX - 186 - gapPx} ${gingivaTopY - 4} Z`}
                          fill="#7DD3FC"
                          fillOpacity="0.48"
                          stroke="#0284C7"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        {/* Opposing clearance callout above crown pointing cleanly to gap */}
                        <line
                          x1={CX - 82}
                          y1={gingivaTopY - gapPx}
                          x2={CX - 82}
                          y2={gingivaTopY}
                          stroke="#0284C7"
                          strokeWidth="1.8"
                        />
                        <line
                          x1={CX - 156}
                          y1={crownTopY - 22 - gapPx}
                          x2={CX - 156}
                          y2={crownTopY - gapPx * 0.5}
                          stroke="#0284C7"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <rect
                          x={CX - 194}
                          y={crownTopY - 39 - gapPx}
                          width="76"
                          height="17"
                          rx="3"
                          fill="#F0F9FF"
                          stroke="#7DD3FC"
                        />
                        <text
                          x={CX - 156}
                          y={crownTopY - 27 - gapPx}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="700"
                          fill="#0369A1"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {params.wizardSurgicalGuideOffset.toFixed(2)} mm
                        </text>
                        <rect
                          x={CX + guidingBarrelHalfW + 64}
                          y={yStopBottom + 12}
                          width="174"
                          height="42"
                          rx="5"
                          fill="url(#lcdHousing)"
                          stroke="#475569"
                        />
                        <rect
                          x={CX + guidingBarrelHalfW + 71}
                          y={yStopBottom + 19}
                          width="160"
                          height="28"
                          rx="3"
                          fill="#DCFCE7"
                        />
                        <text
                          x={CX + guidingBarrelHalfW + 222}
                          y={yStopBottom + 38}
                          textAnchor="end"
                          fontSize="12.5"
                          fontWeight="700"
                          fill="#0F172A"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {params.wizardSurgicalGuideOffset.toFixed(2)} mm (Guide)
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {(currentStep.id === 'drillCatalog' || currentStep.id === 'implantCorrelation') && (
                <g data-testid="caliper-jaws-length">
                  {(() => {
                    const beamX = 118;
                    return (
                      <g>
                        <rect x={beamX} y="38" width="24" height="284" rx="2" fill="url(#caliperMetalVert)" stroke="#64748B" />
                        <path d={`M ${beamX} ${yStopBottom - 16} L ${beamX + 24} ${yStopBottom - 16} L ${CX - stopHalfW + 6} ${yStopBottom} L ${beamX} ${yStopBottom} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <path d={`M ${beamX + 24} ${yDrillTip} L ${CX - 3} ${yDrillTip} L ${beamX} ${yDrillTip + 16} L ${beamX + 24} ${yDrillTip + 16} Z`} fill="url(#caliperMetal)" stroke="#0284C7" strokeWidth="1.3" />
                        <rect x={beamX - 46} y={(yStopBottom + yDrillTip) / 2 - 20} width="98" height="40" rx="5" fill="url(#lcdHousing)" stroke="#475569" />
                        <rect x={beamX - 39} y={(yStopBottom + yDrillTip) / 2 - 13} width="84" height="26" rx="3" fill="#DCFCE7" />
                        <text x={beamX + 37} y={(yStopBottom + yDrillTip) / 2 + 5} textAnchor="end" fontSize="13" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
                          {previewDrillUsefulLen.toFixed(1)} mm
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>
        )}

        {/* SINGLE-PARAMETER CONTROLS */}
        {currentStep.id === 'sleeveLip' && (
          <CaliperParamSlider
            id="wiz-sleeve-lip"
            labelFr="Épaisseur de la collerette"
            labelEn="Sleeve Collar Lip Thickness"
            note={
              params.wizardSleeveSeating === 'above'
                ? 'Posée au-dessus du guide : cette épaisseur est déduite du décalage Blue Sky Plan.'
                : 'Posée à fleur : 0 mm déduit du décalage.'
            }
            value={params.wizardSleeveLipThickness}
            min={0}
            max={2.0}
            step={0.05}
            onChange={(val) => onChangeParams({ wizardSleeveLipThickness: val })}
            onReset={() => onResetParam('wizardSleeveLipThickness')}
          />
        )}

        {currentStep.id === 'sleeveWall' && (
          <CaliperParamSlider
            id="wiz-sleeve-wall"
            labelFr="Épaisseur paroi du cylindre"
            labelEn="Sleeve Cylinder Wall"
            note="Ajoutée deux fois (2 × paroi) au diamètre du trou résine dans Blue Sky Plan."
            value={params.wizardSleeveWallThickness}
            min={0.15}
            max={1.0}
            step={0.05}
            onChange={(val) => onChangeParams({ wizardSleeveWallThickness: val })}
            onReset={() => onResetParam('wizardSleeveWallThickness')}
          />
        )}

        {currentStep.id === 'drillSleeveClearance' && (
          <CaliperParamSlider
            id="wiz-drill-sleeve-clear"
            labelFr="Jeu souhaité douille / foret"
            labelEn="Drill-to-Sleeve Clearance"
            note="Tolérance radiale de glissement entre le foret et le métal de la douille."
            value={params.wizardDrillToSleeveClearance}
            min={0.02}
            max={0.4}
            step={0.01}
            onChange={(val) => onChangeParams({ wizardDrillToSleeveClearance: val })}
            onReset={() => onResetParam('wizardDrillToSleeveClearance')}
          />
        )}

        {currentStep.id === 'drillStop' && (
          <CaliperParamSlider
            id="wiz-drill-stop"
            labelFr="Épaisseur butée du foret"
            labelEn="Drill Stop Thickness"
            note="Information visuelle pour le schéma 2D uniquement — non comptée dans le calcul Blue Sky Plan."
            value={params.wizardDrillStopThickness}
            min={0.5}
            max={4.0}
            step={0.1}
            decimals={1}
            onChange={(val) => onChangeParams({ wizardDrillStopThickness: val })}
            onReset={() => onResetParam('wizardDrillStopThickness')}
          />
        )}

        {currentStep.id === 'guidingDiameter' && (
          <CaliperParamSlider
            id="wiz-guiding-dia"
            labelFr="Diamètre partie guidante"
            labelEn="Guiding Barrel Diameter"
            note="Base du calcul du « Diamètre du trou de guidage »."
            value={params.wizardGuidingDiameter}
            min={1.5}
            max={6.0}
            step={0.05}
            onChange={(val) => onChangeParams({ wizardGuidingDiameter: val })}
            onReset={() => onResetParam('wizardGuidingDiameter')}
          />
        )}

        {currentStep.id === 'guidingHeight' && (
          <CaliperParamSlider
            id="wiz-guiding-height"
            labelFr="Hauteur partie guidante"
            labelEn="Guiding Barrel Height"
            note="Correspond directement à la valeur « Hauteur » dans Blue Sky Plan."
            value={params.wizardGuidingHeight}
            min={2.0}
            max={8.0}
            step={0.1}
            decimals={1}
            onChange={(val) => onChangeParams({ wizardGuidingHeight: val })}
            onReset={() => onResetParam('wizardGuidingHeight')}
          />
        )}

        {currentStep.id === 'printingClearance' && (
          <div className="space-y-2.5">
            <CaliperParamSlider
              id="wiz-print-clear"
              labelFr="Jeu d’impression 3D"
              labelEn="3D Printing Clearance"
              value={params.wizardPrintingClearance}
              min={0.0}
              max={0.4}
              step={0.01}
              onChange={(val) => onChangeParams({ wizardPrintingClearance: val })}
              onReset={() => onResetParam('wizardPrintingClearance')}
            />
            <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-slate-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              <div>
                Les résines chirurgicales subissent un léger retrait lors de l’impression et du
                post-traitement : cette tolérance (+{params.wizardPrintingClearance.toFixed(2)} mm)
                évite tout blocage de la douille ou du foret.
              </div>
            </div>
          </div>
        )}

        {currentStep.id === 'surgicalGuideOffset' && (
          <div className="space-y-2.5">
            <CaliperParamSlider
              id="wiz-surgical-guide-offset"
              labelFr="Décalage du guide chirurgical"
              labelEn="Surgical Guide Offset"
              value={params.wizardSurgicalGuideOffset}
              min={0.05}
              max={0.6}
              step={0.05}
              onChange={(val) => onChangeParams({ wizardSurgicalGuideOffset: val })}
              onReset={() => onResetParam('wizardSurgicalGuideOffset')}
            />
            <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-slate-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              <div>
                <strong>Pourquoi 0,25 mm par défaut ?</strong> Cet espace réduit entre l’intrados du
                guide chirurgical, les dents et la gencive offre un{' '}
                <strong>bon ratio entre friction et facilité de manipulation du guide chirurgical</strong>{' '}
                en bouche.
              </div>
            </div>
          </div>
        )}

        {/* STEP: DRILL CATALOG (LENGTHS + DIAMETERS + DEFAULT OFFSET) */}
        {currentStep.id === 'drillCatalog' && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Lengths */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-900">
                {params.wizardKind === 'pilot'
                  ? 'Longueurs de forets pilotes (mm)'
                  : 'Longueurs utiles de forets (mm)'}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {params.wizardAvailableLengths.map((len) => (
                  <span
                    key={len}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono-tabular font-semibold text-slate-800"
                  >
                    {len.toFixed(1)}
                    {params.wizardAvailableLengths.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLength(len)}
                        aria-label={`Retirer ${len.toFixed(1)} mm`}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={newLengthInput}
                  onChange={(e) => {
                    setNewLengthInput(e.target.value);
                    setLengthError(null);
                  }}
                  placeholder={params.wizardKind === 'pilot' ? 'Ex: 27.0' : 'Ex: 14.0'}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddLength}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Ajouter
                </button>
              </div>
              {lengthError && <p className="mt-1 text-[11px] text-rose-600">{lengthError}</p>}
            </div>

            {/* Drill Diameters */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-900">
                Diamètres des forets du système (mm)
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {params.wizardDrillDiameters.map((dia) => (
                  <span
                    key={dia}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono-tabular font-semibold text-slate-800"
                  >
                    Ø{dia.toFixed(1)}
                    {params.wizardDrillDiameters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDrillDia(dia)}
                        aria-label={`Retirer foret Ø${dia.toFixed(1)}`}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={newDrillDiaInput}
                  onChange={(e) => {
                    setNewDrillDiaInput(e.target.value);
                    setDrillDiaError(null);
                  }}
                  placeholder="Ex: 5.2"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddDrillDia}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Ajouter
                </button>
              </div>
              {drillDiaError && <p className="mt-1 text-[11px] text-rose-600">{drillDiaError}</p>}
            </div>

            {/* Default Offset */}
            <CaliperParamSlider
              id="wiz-default-offset"
              labelFr="Décalage total par défaut"
              labelEn="Default Implant-to-Stop Offset"
              note={`Longueur utile affichée : ${geometry.drillUsefulLength.toFixed(1)} mm.`}
              value={params.wizardDefaultOffset}
              min={5.0}
              max={18.0}
              step={0.5}
              decimals={1}
              onChange={(val) => onChangeParams({ wizardDefaultOffset: val })}
              onReset={() => onResetParam('wizardDefaultOffset')}
            />
          </div>
        )}

        {/* STEP: IMPLANT WIDTH & LENGTH CORRELATION */}
        {currentStep.id === 'implantCorrelation' && (
          <div className="space-y-3" data-testid="wizard-implant-correlation">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-900">
                  Largeurs / diamètres d’implants compatibles (mm)
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {params.wizardImplantDiameters.map((dia) => (
                    <span
                      key={dia}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono-tabular font-semibold text-slate-800"
                    >
                      Ø{dia.toFixed(1)}
                      {params.wizardImplantDiameters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImplantDia(dia)}
                          aria-label={`Retirer implant Ø${dia.toFixed(1)}`}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newImplantDiaInput}
                    onChange={(e) => {
                      setNewImplantDiaInput(e.target.value);
                      setImplantDiaError(null);
                    }}
                    placeholder="Ex: 5.0"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddImplantDia}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Ajouter
                  </button>
                </div>
                {implantDiaError && (
                  <p className="mt-1 text-[11px] text-rose-600">{implantDiaError}</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-900">
                  Longueurs d’implants compatibles (mm)
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {params.wizardImplantLengths.map((len) => (
                    <span
                      key={len}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono-tabular font-semibold text-slate-800"
                    >
                      {len.toFixed(1)} mm
                      {params.wizardImplantLengths.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImplantLen(len)}
                          aria-label={`Retirer implant ${len.toFixed(1)} mm`}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newImplantLenInput}
                    onChange={(e) => {
                      setNewImplantLenInput(e.target.value);
                      setImplantLenError(null);
                    }}
                    placeholder="Ex: 14.0"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddImplantLen}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Ajouter
                  </button>
                </div>
                {implantLenError && (
                  <p className="mt-1 text-[11px] text-rose-600">{implantLenError}</p>
                )}
              </div>
            </div>

            {/* Correlation Matrix */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
              <div className="text-xs font-semibold text-slate-900">
                {params.wizardKind === 'guided'
                  ? 'Correspondance largeur d’implant → diamètre du foret final'
                  : 'Correspondance longueur d’implant → foret pilote recommandé'}
              </div>
              {params.wizardKind === 'guided' ? (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                  {params.wizardImplantDiameters.map((impDia) => {
                    const key = impDia.toFixed(1);
                    const mapped =
                      params.wizardImplantToDrillDiameterMap[key] ??
                      params.wizardDrillDiameters[0] ??
                      2.0;
                    return (
                      <label
                        key={impDia}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-mono-tabular font-semibold text-slate-800">
                          Implant Ø{impDia.toFixed(1)}
                        </span>
                        <select
                          value={mapped}
                          onChange={(e) =>
                            onChangeParams({
                              wizardImplantToDrillDiameterMap: {
                                ...params.wizardImplantToDrillDiameterMap,
                                [key]: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="font-mono-tabular rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-sky-800"
                        >
                          {params.wizardDrillDiameters.map((d) => (
                            <option key={d} value={d}>
                              Foret Ø{d.toFixed(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {params.wizardImplantLengths.map((impLen) => {
                    const matchedPilot = pickOptimalPilotLength(
                      impLen,
                      params.wizardAvailableLengths,
                      params.subcrestalDepth,
                      params.gingivaThickness,
                      params.wizardGuidingHeight,
                    );
                    const effOffset = roundTo(matchedPilot - impLen, 1);
                    return (
                      <div
                        key={impLen}
                        className="font-mono-tabular rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800"
                      >
                        Implant <strong>{impLen.toFixed(1)}</strong> → Foret{' '}
                        <strong className="text-sky-700">L{matchedPilot.toFixed(1)}</strong> (déc.{' '}
                        {effOffset.toFixed(1)})
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINAL RECAP STEP: TWO SIDE-BY-SIDE ZONES + SAVE FORM DIRECTLY BELOW */}
        {currentStep.id === 'recap' && (
          <div className="space-y-4" data-testid="wizard-final-recap">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* LEFT ZONE: Interactive Clickable Summary (click any value to reopen caliper diagram) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-900">
                    <BilingualTerm
                      fr="Récapitulatif de votre système implantaire"
                      en="Implant System Measurement Summary"
                    />
                  </div>
                  <span className="text-[10.5px] font-medium text-sky-700">
                    Cliquez sur une valeur pour revoir le pied à coulisse
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('kind')}
                    data-testid="recap-edit-kind"
                    title="Rouvrir l'étape Type de foret"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600">Type de foret :</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardKind === 'pilot' ? 'Forets pilotes' : 'Forets guidés'}
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('sleeve')}
                    data-testid="recap-edit-sleeve"
                    title="Rouvrir l'étape Douille métallique"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600">Douille :</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardHasSleeve
                        ? params.wizardSleeveSeating === 'above'
                          ? 'Au-dessus'
                          : 'À fleur'
                        : 'Sans douille'}
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('guidingDiameter')}
                    data-testid="recap-edit-guidingDiameter"
                    title="Rouvrir le pied à coulisse Ø partie guidante"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600">Ø partie guidante :</span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardGuidingDiameter.toFixed(2)} mm
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('guidingHeight')}
                    data-testid="recap-edit-guidingHeight"
                    title="Rouvrir le pied à coulisse Hauteur guidante"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600">Hauteur guidante :</span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardGuidingHeight.toFixed(1)} mm
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  {params.wizardHasSleeve && (
                    <>
                      <button
                        type="button"
                        onClick={() => jumpToStepIdFromRecap('sleeveLip')}
                        data-testid="recap-edit-sleeveLip"
                        title="Rouvrir le pied à coulisse Épaisseur collerette"
                        className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                      >
                        <span className="text-slate-600">Collerette :</span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                          {params.wizardSleeveLipThickness.toFixed(2)} mm
                          <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => jumpToStepIdFromRecap('sleeveWall')}
                        data-testid="recap-edit-sleeveWall"
                        title="Rouvrir le pied à coulisse Paroi du cylindre"
                        className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                      >
                        <span className="text-slate-600">Paroi cylindre :</span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                          {params.wizardSleeveWallThickness.toFixed(2)} mm
                          <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => jumpToStepIdFromRecap('drillSleeveClearance')}
                        data-testid="recap-edit-drillSleeveClearance"
                        title="Rouvrir le schéma Jeu douille / foret"
                        className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                      >
                        <span className="text-slate-600">Jeu douille/foret :</span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                          {params.wizardDrillToSleeveClearance.toFixed(2)} mm
                          <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => jumpToStepIdFromRecap('seating')}
                        data-testid="recap-edit-seating"
                        title="Rouvrir l'étape Position de la collerette"
                        className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                      >
                        <span className="text-slate-600">Appui collerette :</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-900 group-hover:text-sky-700">
                          {params.wizardSleeveSeating === 'above' ? 'Au-dessus' : 'À fleur'}
                          <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                        </span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('printingClearance')}
                    data-testid="recap-edit-printingClearance"
                    title="Rouvrir le schéma Jeu d’impression 3D"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600">Jeu impression 3D :</span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardPrintingClearance.toFixed(2)} mm
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('surgicalGuideOffset')}
                    data-testid="recap-edit-surgicalGuideOffset"
                    title="Rouvrir Décalage du guide chirurgical (dents & gencive)"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600">Décalage guide chir. :</span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardSurgicalGuideOffset.toFixed(2)} mm
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('drillStop')}
                    data-testid="recap-edit-drillStop"
                    title="Rouvrir le pied à coulisse Épaisseur butée"
                    className="group flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60 sm:col-span-2"
                  >
                    <span className="text-slate-600">Butée (schéma) :</span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      {params.wizardDrillStopThickness.toFixed(1)} mm
                      <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('drillCatalog')}
                    data-testid="recap-edit-drillCatalog"
                    title="Rouvrir le pied à coulisse Longueurs, diamètres & décalage"
                    className="sm:col-span-2 group flex items-center justify-between gap-2 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600 shrink-0">Forets (L / Ø / Déc.) :</span>
                    <span className="inline-flex min-w-0 items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      <span className="truncate">
                        L [{params.wizardAvailableLengths.map((l) => l.toFixed(1)).join(', ')}] · Ø [
                        {params.wizardDrillDiameters.map((d) => d.toFixed(1)).join(', ')}] ·{' '}
                        {params.wizardDefaultOffset.toFixed(1)} mm
                      </span>
                      <Pencil className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToStepIdFromRecap('implantCorrelation')}
                    data-testid="recap-edit-implantCorrelation"
                    title="Rouvrir la corrélation largeurs et longueurs d’implants"
                    className="sm:col-span-2 group flex items-center justify-between gap-2 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-sky-500 hover:bg-sky-50/60"
                  >
                    <span className="text-slate-600 shrink-0">Implants corrélés :</span>
                    <span className="inline-flex min-w-0 items-center gap-1 font-mono-tabular font-semibold text-slate-900 group-hover:text-sky-700">
                      <span className="truncate">
                        Ø [{params.wizardImplantDiameters.map((d) => d.toFixed(1)).join(', ')}] · L [
                        {params.wizardImplantLengths.map((l) => l.toFixed(1)).join(', ')}]
                      </span>
                      <Pencil className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </div>

              {/* RIGHT ZONE: Blue Sky Plan "Tube de guidage de logiciel" Final Values */}
              <div
                data-testid="wizard-bsp-tube-panel"
                className="bsp-tube-panel flex flex-col justify-between overflow-hidden rounded-xl border"
              >
                <div className="bsp-tube-header flex items-center justify-between border-b px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-xs font-semibold">
                      <BilingualTerm
                        fr="Tube de guidage de logiciel"
                        en="Software Guide Tube"
                        tone={theme}
                      />
                    </span>
                  </div>
                  <span
                    className={`font-mono-tabular text-[10.5px] font-semibold ${
                      isDark ? 'text-sky-200' : 'text-sky-800'
                    }`}
                  >
                    Blue Sky Plan
                  </span>
                </div>

                <div className="space-y-2.5 p-3.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-2">
                    <div className="text-xs font-medium">Diamètre du trou de guidage</div>
                    <button
                      type="button"
                      onClick={() => void handleCopyBsp(holeStr, 'diameter')}
                      className="bsp-tube-field flex h-8 items-center justify-between rounded border px-2.5 text-xs hover:border-sky-500"
                    >
                      <span className="font-mono-tabular font-semibold">
                        {holeStr.replace('.', ',')} mm
                      </span>
                      {copiedKey === 'diameter' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-2">
                    <div className="text-xs font-medium">Hauteur</div>
                    <button
                      type="button"
                      onClick={() => void handleCopyBsp(heightStr, 'height')}
                      className="bsp-tube-field flex h-8 items-center justify-between rounded border px-2.5 text-xs hover:border-sky-500"
                    >
                      <span className="font-mono-tabular font-semibold">
                        {heightStr.replace('.', ',')} mm
                      </span>
                      {copiedKey === 'height' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-2">
                    <div className="text-xs font-medium">Décalage</div>
                    <button
                      type="button"
                      onClick={() => void handleCopyBsp(offsetStr, 'offset')}
                      className="bsp-tube-field flex h-8 items-center justify-between rounded border px-2.5 text-xs hover:border-sky-500"
                    >
                      <span
                        className={`font-mono-tabular font-bold ${
                          isDark ? 'text-sky-300' : 'text-sky-700'
                        }`}
                      >
                        {offsetStr.replace('.', ',')} mm
                      </span>
                      {copiedKey === 'offset' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <div className="bsp-border border-t pt-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyBsp(
                          `Diamètre du trou de guidage: ${holeStr} mm | Hauteur: ${heightStr} mm | Décalage: ${offsetStr} mm`,
                          'all',
                        )
                      }
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      {copiedKey === 'all' ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          3 valeurs copiées !
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          Copier les 3 valeurs Blue Sky Plan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* DIRECTLY BELOW BOTH ZONES: NAME & SAVE INTO SYSTÈME IMPLANTAIRE LIBRARY */}
            <form
              onSubmit={handleSave}
              className="rounded-xl border border-sky-200 bg-sky-50/50 p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <label
                    htmlFor="custom-kit-name"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Nom du nouveau système implantaire
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Il apparaîtra immédiatement dans votre liste « Système implantaire » et ses
                    valeurs seront ajustables à tout moment.
                  </p>
                  <input
                    id="custom-kit-name"
                    type="text"
                    value={kitName}
                    onChange={(e) => {
                      setKitName(e.target.value);
                      setNameError(null);
                    }}
                    placeholder="Ex: Straumann BLX Guidé, NobelActive Perso..."
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                  />
                  {nameError && <p className="mt-1 text-[11px] text-rose-600">{nameError}</p>}
                </div>

                <button
                  type="submit"
                  data-testid="save-wizard-kit-btn"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                  {editingKitId
                    ? 'Enregistrer les modifications'
                    : 'Valider et enregistrer le système implantaire'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step Navigation Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            data-testid="wizard-prev-step-btn"
            onClick={() => {
              if (safeIndex === 0) {
                onCancel();
              } else {
                goToStep(safeIndex - 1);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Étape précédente
          </button>

          <div className="flex items-center gap-2">
            {(fromRecap || (editingKitId && currentStep.id !== 'recap')) && (
              <button
                type="button"
                onClick={() => goToStep(steps.length - 1)}
                data-testid="wizard-back-to-recap-btn"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
              >
                Revenir au récapitulatif
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <span className="font-mono-tabular text-[11px] text-slate-500">
              Étape {safeIndex + 1} / {steps.length}
            </span>
          </div>

          {safeIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => goToStep(safeIndex + 1)}
              data-testid="wizard-next-step-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Étape suivante
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(0)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Revoir depuis l’étape 1
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
