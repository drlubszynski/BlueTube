import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import {
  DrillingKit,
  GLOBAL_D_OFFICIAL_CHART,
  GLOBAL_D_PILOT_DRILL_LENGTHS,
  PilotComparisonRow,
  SimulationParams,
  computePilotComparison,
} from '../utils/implantGeometry';
import { BilingualTerm } from './BilingualTerm';

interface GlobalDComparatorProps {
  params: SimulationParams;
  kits: DrillingKit[];
  onSelectDrillLength: (lengthMm: number) => void;
  onSelectImplantAndDrill?: (implantLengthMm: number, drillLengthMm: number) => void;
}

export function GlobalDComparator({
  params,
  kits,
  onSelectDrillLength,
  onSelectImplantAndDrill,
}: GlobalDComparatorProps) {
  const activeKit = kits.find((k) => k.id === params.activeKitId) ?? kits[0];
  const rows: PilotComparisonRow[] = computePilotComparison(params, kits);
  const isGlobalDKits = activeKit.id === 'factory-globald-pilot';
  const [tab, setTab] = useState<'comparator' | 'matrix'>('comparator');

  return (
    <section
      aria-label="Comparateur simultané des longueurs de forets pilotes"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Comparateur simultané — {activeKit.name} (Calcul inversé)
          </h2>
          <p className="text-xs text-slate-500">
            Formule :{' '}
            <span className="font-mono-tabular font-medium text-slate-700">
              Décalage total = Longueur foret − Longueur implant
            </span>{' '}
            ({params.implantLength.toFixed(1)} mm). Cliquez sur une ligne pour appliquer le foret.
          </p>
        </div>

        {isGlobalDKits && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab('comparator')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                tab === 'comparator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comparateur clinique
            </button>
            <button
              type="button"
              onClick={() => setTab('matrix')}
              data-testid="globald-matrix-tab"
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                tab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tableau Global D (L6 → L15)
            </button>
          </div>
        )}
      </div>

      {tab === 'matrix' && isGlobalDKits ? (
        <div data-testid="globald-official-matrix" className="space-y-2.5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2 text-left font-semibold">
                    Longueur catalogue
                  </th>
                  {GLOBAL_D_PILOT_DRILL_LENGTHS.map((drillLen) => (
                    <th key={drillLen} className="font-mono-tabular px-2.5 py-2 font-semibold">
                      L{drillLen.toFixed(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {GLOBAL_D_OFFICIAL_CHART.map((row) => {
                  const isCurrentImplant =
                    Math.abs(params.implantLength - row.implantLengthMm) < 0.05;
                  return (
                    <tr
                      key={row.catalogueLabel}
                      className={isCurrentImplant ? 'bg-sky-50/40' : 'hover:bg-slate-50/70'}
                    >
                      <td className="px-3 py-2 text-left font-semibold text-slate-900">
                        {row.catalogueLabel}{' '}
                        <span className="font-mono-tabular text-[10.5px] font-normal text-slate-500">
                          ({row.implantLengthMm.toFixed(1)} mm)
                        </span>
                      </td>
                      {GLOBAL_D_PILOT_DRILL_LENGTHS.map((drillLen) => {
                        const offsetVal = row.offsetsByDrill[drillLen];
                        const isSelectedCell =
                          isCurrentImplant &&
                          Math.abs(params.pilotDrillLength - drillLen) < 0.05;
                        const isNominal10 = offsetVal === 10.0;

                        if (offsetVal === null || offsetVal === undefined) {
                          return (
                            <td key={drillLen} className="px-2.5 py-2 text-slate-300">
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={drillLen} className="px-1.5 py-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectImplantAndDrill) {
                                  onSelectImplantAndDrill(row.implantLengthMm, drillLen);
                                } else {
                                  onSelectDrillLength(drillLen);
                                }
                              }}
                              className={`font-mono-tabular w-full rounded-md border px-2 py-1 text-xs transition-colors ${
                                isSelectedCell
                                  ? 'border-sky-600 bg-sky-600 font-bold text-white shadow-xs'
                                  : isNominal10
                                    ? 'border-slate-300 bg-slate-100 font-bold text-slate-900 hover:border-sky-400 hover:bg-sky-50'
                                    : 'border-slate-200 bg-white font-medium text-amber-800 hover:border-sky-400 hover:bg-sky-50'
                              }`}
                            >
                              {offsetVal.toFixed(1)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />
            <div>
              Les valeurs en gras (<strong className="font-mono-tabular text-slate-900">10.0 mm</strong>)
              correspondent au décalage standard Blue Sky Plan avec douille Global D (collerette{' '}
              <strong className="font-mono-tabular text-slate-800">0.5 mm</strong> au-dessus du
              guide). Prévoir un jeu d’impression adapté pour limiter la friction des douilles dans
              le guide. Cliquez sur une cellule pour charger l’implant et le foret correspondants.
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Foret</th>
                <th className="px-3 py-2 font-medium">Longueur utile</th>
                <th className="px-3 py-2 font-medium">
                  <BilingualTerm fr="Décalage guide BSP" en="Guide Tube Offset" />
                </th>
                <th className="px-3 py-2 font-medium">Dégagement sous puits</th>
                <th className="px-3 py-2 font-medium">Déviation apex</th>
                <th className="px-3 py-2 font-medium">Ouverture min.</th>
                <th className="py-2 pl-3 font-medium">Sécurité clinique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isSelected = Math.abs(params.pilotDrillLength - row.lengthMm) < 0.05;

                const statusIcon =
                  row.safety.status === 'optimal' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  ) : row.safety.status === 'compression' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                  );

                const statusTextClass =
                  row.safety.status === 'optimal'
                    ? 'text-emerald-700'
                    : row.safety.status === 'compression'
                      ? 'text-amber-700'
                      : 'text-rose-700';

                return (
                  <tr
                    key={row.marking}
                    onClick={() => onSelectDrillLength(row.lengthMm)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDrillLength(row.lengthMm);
                        }}
                        className="flex items-center gap-2 text-left font-mono-tabular whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-600"
                        aria-label={`Sélectionner le foret ${row.marking} (${row.lengthMm} mm)`}
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-xs ${
                            isSelected ? 'bg-sky-600' : 'bg-slate-300'
                          }`}
                          aria-hidden="true"
                        />
                        {row.marking}
                      </button>
                    </td>
                    <td className="font-mono-tabular px-3 py-2.5 text-slate-700">
                      {row.lengthMm.toFixed(1)} mm
                    </td>
                    <td className="font-mono-tabular px-3 py-2.5 font-semibold text-sky-700">
                      {row.bspGuideOffset.toFixed(1)} mm
                      <span className="ml-1 text-[10px] font-normal text-slate-400">
                        (total {row.offsetCao.toFixed(1)})
                      </span>
                    </td>
                    <td
                      className={`font-mono-tabular px-3 py-2.5 font-medium ${
                        row.freeSpaceUnderGuide >= 0 ? 'text-slate-700' : 'text-amber-700'
                      }`}
                    >
                      {row.freeSpaceUnderGuide >= 0 ? '+' : ''}
                      {row.freeSpaceUnderGuide.toFixed(1)} mm
                    </td>
                    <td className="font-mono-tabular px-3 py-2.5 text-slate-600">
                      {row.apicalDeviationMm.toFixed(2)} mm ({row.deviationAngleDeg.toFixed(1)}°)
                    </td>
                    <td className="font-mono-tabular px-3 py-2.5 text-slate-600">
                      {row.minMouthOpeningMm.toFixed(1)} mm
                    </td>
                    <td className={`py-2.5 pl-3 font-medium ${statusTextClass}`}>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {statusIcon}
                        {row.safety.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
