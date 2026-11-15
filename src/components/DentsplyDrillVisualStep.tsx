import { CheckCircle2, Drill } from 'lucide-react';
import { DENTSPLY_MIS_DRILL_COLORS, formatMetricMm } from '../utils/implantGeometry';

export function DentsplyDrillVisualStep() {
  return (
    <div
      data-testid="dentsply-drill-visual-step"
      className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-3"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Drill className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
          <span>Design visuel officiel des forets MIS MGUIDE (Dentsply Sirona)</span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-600">
          Rendu 2D calibré sur le catalogue MIS MGUIDE : acier inoxydable brossé, bague anodisée sur
          la tige RA, collerette de butée fine, cylindre de guidage sans cuillère à méplat
          d&apos;irrigation et partie active conique effilée (longueurs 6 · 8 · 10 · 11.5 · 13 · 16 mm ·
          Offset 9,5 mm).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
        {/* Official MIS MGUIDE Drill Color Codes & Platform Mapping */}
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
            <span className="font-semibold text-slate-700">
              Codes couleur MIS MGUIDE actifs (tige RA · dimensions techniques BSP conservées)
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Actif en 2D
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {DENTSPLY_MIS_DRILL_COLORS.map((spec) => (
              <div
                key={spec.diameterMm}
                data-testid={`mis-color-spec-${formatMetricMm(spec.diameterMm)}`}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/80 px-2 py-1 text-[10px] text-slate-700"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-slate-400/70 shadow-2xs"
                  style={
                    spec.ringColorHex
                      ? { backgroundColor: spec.ringColorHex }
                      : {
                          background:
                            'linear-gradient(135deg, #CBD5E1 0%, #F8FAFC 50%, #94A3B8 100%)',
                        }
                  }
                  aria-hidden="true"
                />
                <div className="min-w-0 leading-tight">
                  <div className="font-mono-tabular font-bold text-slate-900">
                    Ø{formatMetricMm(spec.diameterMm)}
                    {spec.conicalDiameterMm ? ` / ${formatMetricMm(spec.conicalDiameterMm)}` : ''}{' '}
                    <span className="font-sans font-semibold text-slate-500">· {spec.platform}</span>
                  </div>
                  <div className="truncate text-[9.5px] text-slate-500">
                    {spec.implantDiametersLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini SVG Blueprint Preview of an Authentic Stainless-Steel MIS MGUIDE Drill */}
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2">
          <svg
            width="42"
            height="104"
            viewBox="0 0 42 104"
            aria-label="Aperçu géométrique du foret MIS MGUIDE en acier inoxydable"
            className="shrink-0"
          >
            <defs>
              <linearGradient id="miniMisSteel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7C8594" />
                <stop offset="35%" stopColor="#E2E8F0" />
                <stop offset="60%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>
              <linearGradient id="miniMisFacet" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            {/* RA Latch Shank */}
            <path
              d="M 16 3 L 26 3 L 27 5 L 27 8 L 23 8 L 23 12 L 27 12 L 27 33 L 15 33 L 15 5 Z"
              fill="url(#miniMisSteel)"
              stroke="#475569"
              strokeWidth="0.9"
            />
            {/* Anodized Color Ring on Shank */}
            <rect x="15" y="21" width="12" height="6" fill="#DC2626" stroke="#1E293B" strokeWidth="0.6" />
            <rect x="18" y="21.5" width="3" height="5" fill="#FFFFFF" opacity="0.28" />
            {/* Slim Stopper Flange */}
            <rect x="8" y="33" width="26" height="4.5" rx="1" fill="url(#miniMisSteel)" stroke="#334155" strokeWidth="0.9" />
            {/* Keyless Guiding Cylinder with Left Irrigation Flat */}
            <rect x="12" y="37.5" width="18" height="22" fill="url(#miniMisSteel)" stroke="#334155" strokeWidth="0.9" />
            <rect x="12.6" y="38" width="7.2" height="21" fill="url(#miniMisFacet)" opacity="0.82" />
            {/* Helical Exit Bevel */}
            <path
              d="M 12 59.5 Q 15 58 15.5 64 L 26.5 64 Q 27 61 30 59.5 Z"
              fill="url(#miniMisSteel)"
              stroke="#334155"
              strokeWidth="0.9"
            />
            {/* Conical Straight-Fluted Cutting Blade */}
            <path
              d="M 15.5 64 L 26.5 64 L 24 94 L 21 101 L 18 94 Z"
              fill="url(#miniMisSteel)"
              stroke="#334155"
              strokeWidth="0.9"
            />
            <path d="M 19.5 65 L 22.5 65 L 21.8 94 L 20.2 94 Z" fill="#64748B" opacity="0.55" />
          </svg>
        </div>
      </div>
    </div>
  );
}
