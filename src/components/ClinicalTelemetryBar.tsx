import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, XCircle } from 'lucide-react';
import { ComputedGeometry, SimulationParams } from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

interface ClinicalTelemetryBarProps {
  geometry: ComputedGeometry;
  onApplySuggestion: (patch: Partial<SimulationParams>) => void;
}

export function ClinicalTelemetryBar({
  geometry,
  onApplySuggestion,
}: ClinicalTelemetryBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayStatusKey: 'optimal' | 'improvable' | 'compression' | 'guidance_fault' =
    geometry.safety.status === 'optimal' && geometry.suggestion
      ? 'improvable'
      : geometry.safety.status;

  const statusConfig = {
    optimal: {
      container: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
      icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />,
      badgeText: 'Optimal',
    },
    improvable: {
      container: 'border-amber-300 bg-amber-50/90 text-amber-900',
      icon: <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />,
      badgeText: 'Améliorable',
    },
    compression: {
      container: 'border-amber-200 bg-amber-50/80 text-amber-950',
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />,
      badgeText: 'Compression gingivale',
    },
    guidance_fault: {
      container: 'border-rose-200 bg-rose-50/80 text-rose-950',
      icon: <XCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />,
      badgeText: 'Défaut de guidage',
    },
  }[displayStatusKey];

  const freeSpacePositive = geometry.freeSpaceUnderGuide >= 0;

  return (
    <section
      aria-label="Indicateurs cliniques en temps réel"
      data-testid="clinical-telemetry-drawer"
      className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="clinical-telemetry-content"
        data-testid="clinical-telemetry-toggle"
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50/80"
      >
        <div className="flex items-center gap-2 min-w-0">
          {statusConfig.icon}
          <h2 className="truncate text-xs font-bold text-slate-900">
            Indicateurs cliniques en temps réel
          </h2>
          <span
            data-testid="telemetry-status-badge"
            className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[10px] font-bold ${statusConfig.container}`}
          >
            {statusConfig.badgeText}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono-tabular hidden sm:inline text-[11px] text-slate-500">
            Foret : <strong className="text-slate-800">{geometry.drillMarking}</strong>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isOpen && (
        <div id="clinical-telemetry-content" className="border-t border-slate-200 p-3.5 space-y-2.5">
          {/* Compact Status summary */}
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${statusConfig.container}`}
            role="status"
            aria-live="polite"
          >
            {statusConfig.icon}
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs font-bold tracking-tight">{statusConfig.badgeText}</span>
              <span className="text-[11px] opacity-90">{geometry.safety.detail}</span>
            </div>
          </div>

          {/* 5 Real-time precision KPIs with locked uniform height and baseline */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <div className="flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
              <div className="truncate text-[10.5px] font-semibold text-slate-500">
                <BilingualTerm fr="Décalage total" en="Total Implant-to-Stop Offset" />
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="metric-offset"
                  className="font-mono-tabular text-base font-bold text-sky-700"
                >
                  {geometry.offsetCao.toFixed(1)}
                </span>
                <span className="font-mono-tabular text-[10.5px] text-slate-400">mm</span>
              </div>
              <div className="truncate text-[10px] text-slate-500">Col → Butée</div>
            </div>

            <div className="flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
              <div className="truncate text-[10.5px] font-semibold text-slate-500">
                <BilingualTerm fr="Profondeur" en="Drilling Depth" />
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="metric-drilling-depth"
                  className="font-mono-tabular text-base font-bold text-slate-900"
                >
                  {geometry.totalDrillingDepthFromStop.toFixed(1)}
                </span>
                <span className="font-mono-tabular text-[10.5px] text-slate-400">mm</span>
              </div>
              <div className="truncate text-[10px] text-slate-500">
                {geometry.intraosseousDepthFromCrest.toFixed(1)} mm os
              </div>
            </div>

            <div
              className="flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2"
              title="Décalage du guide chirurgical : espace réduit entre le guide chirurgical, les dents et la gencive (0,25 mm par défaut : bon ratio entre friction et facilité de manipulation du guide chirurgical)."
            >
              <div className="truncate text-[10.5px] font-semibold text-slate-500">
                <BilingualTerm fr="Décalage guide chir." en="Surgical Guide Offset" />
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="metric-free-space"
                  className={`font-mono-tabular text-base font-bold ${
                    freeSpacePositive ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {geometry.surgicalGuideOffsetMm.toFixed(2)}
                </span>
                <span className="font-mono-tabular text-[10.5px] text-slate-400">mm</span>
              </div>
              <div
                className="truncate text-[10px] text-slate-500"
                title="Bon ratio entre friction et facilité de manipulation du guide chirurgical"
              >
                {freeSpacePositive ? 'Dents/gencive · friction' : 'Compression gingivale'}
              </div>
            </div>

            <div className="flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
              <div className="truncate text-[10.5px] font-semibold text-slate-500">
                <BilingualTerm fr="Déviation apex" en="Max Apical Deviation" />
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="metric-apical-deviation"
                  className="font-mono-tabular text-base font-bold text-slate-900"
                >
                  {geometry.apicalDeviationMm.toFixed(2)}
                </span>
                <span className="font-mono-tabular text-[10px] text-slate-400">mm</span>
                <span className="font-mono-tabular text-[10px] font-medium text-slate-600">
                  ({geometry.deviationAngleDeg.toFixed(1)}°)
                </span>
              </div>
              <div className="truncate text-[10px] text-slate-500">
                Jeu {geometry.radialClearance.toFixed(3)}
              </div>
            </div>

            <div className="col-span-2 flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 sm:col-span-1">
              <div className="truncate text-[10.5px] font-semibold text-slate-500">
                <BilingualTerm fr="Ouverture min." en="Minimum Mouth Opening" />
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="metric-mouth-opening"
                  className={`font-mono-tabular text-base font-bold ${
                    geometry.safety.mouthOpeningWarning ? 'text-amber-700' : 'text-slate-900'
                  }`}
                >
                  {geometry.minMouthOpeningMm.toFixed(1)}
                </span>
                <span className="font-mono-tabular text-[10.5px] text-slate-400">mm</span>
              </div>
              <div className="truncate text-[10px] text-slate-500">
                {geometry.safety.mouthOpeningWarning ? 'Secteur postérieur' : 'Foret + CA'}
              </div>
            </div>
          </div>

          {/* Clinical Optimization Suggestion Banner */}
          {geometry.suggestion && (
            <div
              data-testid="clinical-suggestion-banner"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-semibold text-amber-950">{geometry.suggestion.title}</div>
                  <p className="mt-0.5 text-[11px] text-amber-900">{geometry.suggestion.detail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplySuggestion(geometry.suggestion!.patch)}
                className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-amber-700"
              >
                {geometry.suggestion.actionLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
