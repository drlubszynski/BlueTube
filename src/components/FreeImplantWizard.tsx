import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CustomImplantSystem,
  clamp,
  createImplantLibraryEntry,
  roundTo,
} from '../utils/implantGeometry';

type FreeImplantStep = 'brand' | 'model' | 'diameters' | 'lengths';

interface FreeImplantWizardProps {
  existingModels: CustomImplantSystem[];
  onSaveModel: (entry: CustomImplantSystem) => void;
  onClose: () => void;
}

const SUGGESTED_BRANDS = [
  'Straumann',
  'Nobel Biocare',
  'Anthogyr',
  'Zimmer Biomet',
  'Camlog',
  'MIS',
  'Osstem',
];

export function FreeImplantWizard({
  existingModels,
  onSaveModel,
  onClose,
}: FreeImplantWizardProps) {
  const [step, setStep] = useState<FreeImplantStep>('brand');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [diameterCursor, setDiameterCursor] = useState(4.0);
  const [diametersMm, setDiametersMm] = useState<number[]>([]);
  const [previewDiameter, setPreviewDiameter] = useState<number | null>(null);

  const [lengthCursor, setLengthCursor] = useState(10.0);
  const [lengthsMm, setLengthsMm] = useState<number[]>([]);
  const [previewLength, setPreviewLength] = useState<number | null>(null);

  const existingBrands = Array.from(
    new Set([...existingModels.map((m) => m.brand), ...SUGGESTED_BRANDS]),
  ).slice(0, 8);

  const handleNextBrand = () => {
    if (!brand.trim()) {
      setError('Veuillez saisir le nom de la marque.');
      return;
    }
    setError(null);
    setStep('model');
  };

  const handleNextModel = () => {
    if (!model.trim()) {
      setError("Veuillez saisir le nom du modèle d'implant.");
      return;
    }
    setError(null);
    setStep('diameters');
  };

  const handleAddDiameter = () => {
    const val = roundTo(clamp(diameterCursor, 2.0, 8.0), 1);
    setDiametersMm((prev) =>
      prev.some((d) => Math.abs(d - val) < 0.05)
        ? prev
        : [...prev, val].sort((a, b) => a - b),
    );
    setPreviewDiameter(val);
    setError(null);
  };

  const handleRemoveDiameter = (val: number) => {
    setDiametersMm((prev) => {
      const next = prev.filter((d) => Math.abs(d - val) >= 0.05);
      if (previewDiameter !== null && Math.abs(previewDiameter - val) < 0.05) {
        setPreviewDiameter(next[0] ?? null);
      }
      return next;
    });
  };

  const handleGoToLengths = () => {
    if (diametersMm.length === 0) {
      const val = roundTo(clamp(diameterCursor, 2.0, 8.0), 1);
      setDiametersMm([val]);
      setPreviewDiameter(val);
    }
    setError(null);
    setStep('lengths');
  };

  const handleAddLength = () => {
    const val = roundTo(clamp(lengthCursor, 4.0, 20.0), 1);
    setLengthsMm((prev) =>
      prev.some((l) => Math.abs(l - val) < 0.05)
        ? prev
        : [...prev, val].sort((a, b) => a - b),
    );
    setPreviewLength(val);
    setError(null);
  };

  const handleRemoveLength = (val: number) => {
    setLengthsMm((prev) => {
      const next = prev.filter((l) => Math.abs(l - val) >= 0.05);
      if (previewLength !== null && Math.abs(previewLength - val) < 0.05) {
        setPreviewLength(next[0] ?? null);
      }
      return next;
    });
  };

  const handleSave = () => {
    const finalDias =
      diametersMm.length > 0
        ? diametersMm
        : [roundTo(clamp(diameterCursor, 2.0, 8.0), 1)];
    const finalLens =
      lengthsMm.length > 0
        ? lengthsMm
        : [roundTo(clamp(lengthCursor, 4.0, 20.0), 1)];

    const entry = createImplantLibraryEntry(brand, model, finalDias, finalLens);
    onSaveModel({
      ...entry,
      diameter: previewDiameter ?? entry.diametersMm[0],
      length: previewLength ?? entry.lengthsMm[0],
    });
  };

  const stepIndex =
    step === 'brand' ? 1 : step === 'model' ? 2 : step === 'diameters' ? 3 : 4;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-implant-wizard-title"
      data-testid="free-implant-wizard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
    >
      <div className="bsp-panel w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Modal Header */}
        <div className="bsp-section-header flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <div>
              <h2
                id="free-implant-wizard-title"
                className="text-sm font-bold text-slate-900"
              >
                Saisie libre d&apos;implant — Ajout à la bibliothèque
              </h2>
              <p className="text-[11px] text-slate-500">
                Étape {stepIndex} / 4 ·{' '}
                {step === 'brand'
                  ? 'Marque'
                  : step === 'model'
                    ? 'Modèle'
                    : step === 'diameters'
                      ? 'Diamètres (2 à 8 mm)'
                      : 'Longueurs'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la saisie libre d'implant"
            data-testid="free-implant-close-btn"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Step Progress Strip */}
        <div className="grid grid-cols-4 gap-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] font-semibold">
          {(
            [
              ['brand', '1. Marque'],
              ['model', '2. Modèle'],
              ['diameters', '3. Diamètres'],
              ['lengths', '4. Longueurs'],
            ] as const
          ).map(([key, label], idx) => {
            const active = step === key;
            const done = stepIndex > idx + 1;
            return (
              <div
                key={key}
                className={`rounded-md px-2 py-1 text-center transition-colors ${
                  active
                    ? 'bg-sky-600 text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-slate-500'
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* STEP 1: BRAND */}
          {step === 'brand' && (
            <div className="space-y-3" data-testid="free-implant-step-brand">
              <div>
                <label
                  htmlFor="free-implant-brand-input"
                  className="block text-sm font-bold text-slate-900"
                >
                  1. Quel est le nom de la marque de l&apos;implant ?
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Saisissez le fabricant afin de classer ce modèle dans votre bibliothèque
                  locale.
                </p>
                <input
                  id="free-implant-brand-input"
                  data-testid="free-implant-brand-input"
                  type="text"
                  autoFocus
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNextBrand();
                    }
                  }}
                  placeholder="Ex : Straumann, Nobel Biocare, Anthogyr..."
                  className="bsp-input mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-medium text-slate-500">
                  Suggestions rapides :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {existingBrands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBrand(b);
                        setError(null);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        brand.trim().toLowerCase() === b.toLowerCase()
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleNextBrand}
                  data-testid="free-implant-step1-next"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Continuer vers le modèle
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MODEL */}
          {step === 'model' && (
            <div className="space-y-3" data-testid="free-implant-step-model">
              <div>
                <div className="mb-1 inline-flex items-center rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                  Marque : {brand.trim()}
                </div>
                <label
                  htmlFor="free-implant-model-input"
                  className="block text-sm font-bold text-slate-900"
                >
                  2. Quel est le modèle d&apos;implant ?
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chaque système est basé sur un modèle précis (ex : BLX, BLT, NobelActive,
                  Axiom X3…).
                </p>
                <input
                  id="free-implant-model-input"
                  data-testid="free-implant-model-input"
                  type="text"
                  autoFocus
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNextModel();
                    }
                  }}
                  placeholder="Ex : BLX, NobelActive, Axiom X3..."
                  className="bsp-input mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

              <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('brand');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Retour marque
                </button>
                <button
                  type="button"
                  onClick={handleNextModel}
                  data-testid="free-implant-step2-next"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Saisir les diamètres (2–8 mm)
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & STEP 4: PROGRESSIVE SLIDER CAPTURE + LIVE SECTION-2 PREVIEW */}
          {(step === 'diameters' || step === 'lengths') && (
            <div className="space-y-4">
              {step === 'diameters' ? (
                <div
                  className="rounded-lg border border-sky-200 bg-sky-50/40 p-3.5"
                  data-testid="free-implant-step-diameters"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        3. Noter les diamètres existants ({brand.trim()} · {model.trim()})
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Réglez le curseur (2,0 à 8,0 mm) puis validez chaque diamètre de la
                        gamme. Passez aux longueurs à tout moment.
                      </p>
                    </div>
                    <span className="font-mono-tabular shrink-0 rounded-md border border-sky-300 bg-white px-2.5 py-1 text-sm font-bold text-sky-700">
                      Ø {diameterCursor.toFixed(1)} mm
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDiameterCursor((d) => roundTo(clamp(d - 0.1, 2.0, 8.0), 1))
                      }
                      aria-label="Diminuer le diamètre de 0.1 mm"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <input
                      type="range"
                      min={2.0}
                      max={8.0}
                      step={0.1}
                      value={diameterCursor}
                      aria-label="Curseur diamètre d'implant (2 à 8 mm)"
                      data-testid="free-implant-diameter-slider"
                      onChange={(e) => setDiameterCursor(parseFloat(e.target.value))}
                      className="cad-slider w-full"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDiameterCursor((d) => roundTo(clamp(d + 0.1, 2.0, 8.0), 1))
                      }
                      aria-label="Augmenter le diamètre de 0.1 mm"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-1 flex justify-between font-mono-tabular text-[10px] text-slate-400">
                    <span>2.0 mm</span>
                    <span>5.0 mm</span>
                    <span>8.0 mm</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleAddDiameter}
                      data-testid="free-implant-add-diameter"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Valider ce diamètre (Ø {diameterCursor.toFixed(1)} mm)
                    </button>

                    <button
                      type="button"
                      onClick={handleGoToLengths}
                      data-testid="free-implant-to-lengths"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-white px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                    >
                      Passer aux longueurs
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-lg border border-sky-200 bg-sky-50/40 p-3.5"
                  data-testid="free-implant-step-lengths"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        4. Noter les longueurs existantes ({brand.trim()} · {model.trim()})
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Réglez le curseur (4,0 à 20,0 mm) puis validez chaque longueur
                        disponible dans la gamme.
                      </p>
                    </div>
                    <span className="font-mono-tabular shrink-0 rounded-md border border-sky-300 bg-white px-2.5 py-1 text-sm font-bold text-sky-700">
                      {lengthCursor.toFixed(1)} mm
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLengthCursor((l) => roundTo(clamp(l - 0.5, 4.0, 20.0), 1))
                      }
                      aria-label="Diminuer la longueur de 0.5 mm"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <input
                      type="range"
                      min={4.0}
                      max={20.0}
                      step={0.1}
                      value={lengthCursor}
                      aria-label="Curseur longueur d'implant (4 à 20 mm)"
                      data-testid="free-implant-length-slider"
                      onChange={(e) => setLengthCursor(parseFloat(e.target.value))}
                      className="cad-slider w-full"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLengthCursor((l) => roundTo(clamp(l + 0.5, 4.0, 20.0), 1))
                      }
                      aria-label="Augmenter la longueur de 0.5 mm"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-1 flex justify-between font-mono-tabular text-[10px] text-slate-400">
                    <span>4.0 mm</span>
                    <span>12.0 mm</span>
                    <span>20.0 mm</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleAddLength}
                      data-testid="free-implant-add-length"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Valider cette longueur ({lengthCursor.toFixed(1)} mm)
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('diameters')}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Modifier les diamètres
                    </button>
                  </div>
                </div>
              )}

              {/* LIVE SECTION-2 STYLE PREVIEW OF CAPTURED CHOICES */}
              <div
                data-testid="free-implant-live-preview"
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Aperçu dans « 2. Choix de l&apos;implant » ·{' '}
                    <span className="text-sky-700">
                      {brand.trim()} — {model.trim()}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-[10.5px] text-slate-500">
                    {diametersMm.length} Ø · {lengthsMm.length} L
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Preview Diameters (identical button graphics to Section 2) */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-600">
                        Diamètres {model.trim()} (mm)
                      </span>
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {previewDiameter !== null
                          ? `Ø${previewDiameter.toFixed(1)} mm`
                          : diametersMm.length === 0
                            ? 'Aucun validé'
                            : `Ø${diametersMm[0].toFixed(1)} mm`}
                      </span>
                    </div>
                    {diametersMm.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
                        Validez votre premier diamètre avec le bouton ci-dessus.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {diametersMm.map((dia) => {
                          const active =
                            previewDiameter !== null &&
                            Math.abs(previewDiameter - dia) < 0.05;
                          return (
                            <div
                              key={dia}
                              className={`inline-flex items-center overflow-hidden rounded-md border transition-colors ${
                                active
                                  ? 'border-sky-600 bg-sky-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setPreviewDiameter(dia)}
                                className="font-mono-tabular px-2.5 py-1 text-xs font-semibold"
                              >
                                Ø{dia.toFixed(1)}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDiameter(dia)}
                                aria-label={`Supprimer Ø ${dia.toFixed(1)} mm`}
                                className={`px-1.5 py-1 text-[10px] ${
                                  active
                                    ? 'hover:bg-sky-700 text-sky-100'
                                    : 'hover:bg-slate-100 text-slate-400'
                                }`}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Preview Lengths (identical button graphics to Section 2) */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-600">
                        Longueurs {model.trim()} (mm)
                      </span>
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {previewLength !== null
                          ? `${previewLength.toFixed(1)} mm`
                          : lengthsMm.length === 0
                            ? 'En attente'
                            : `${lengthsMm[0].toFixed(1)} mm`}
                      </span>
                    </div>
                    {lengthsMm.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
                        {step === 'diameters'
                          ? 'Les longueurs s’afficheront ici à l’étape suivante.'
                          : 'Validez vos longueurs avec le bouton ci-dessus.'}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {lengthsMm.map((len) => {
                          const active =
                            previewLength !== null &&
                            Math.abs(previewLength - len) < 0.05;
                          return (
                            <div
                              key={len}
                              className={`inline-flex items-center overflow-hidden rounded-md border transition-colors ${
                                active
                                  ? 'border-sky-600 bg-sky-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setPreviewLength(len)}
                                className="font-mono-tabular px-2.5 py-1 text-xs font-semibold"
                              >
                                {Number.isInteger(len)
                                  ? `${len.toFixed(0)} mm`
                                  : `${len.toFixed(1)} mm`}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveLength(len)}
                                aria-label={`Supprimer ${len.toFixed(1)} mm`}
                                className={`px-1.5 py-1 text-[10px] ${
                                  active
                                    ? 'hover:bg-sky-700 text-sky-100'
                                    : 'hover:bg-slate-100 text-slate-400'
                                }`}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(step === 'diameters' ? 'model' : 'diameters')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Étape précédente
                </button>

                {step === 'lengths' && (
                  <button
                    type="button"
                    onClick={handleSave}
                    data-testid="free-implant-save"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Enregistrer dans la bibliothèque
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
