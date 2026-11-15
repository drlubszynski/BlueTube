export function BrandLogo({
  groupId,
  size = 'sm',
}: {
  groupId: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  const iconCls = size === 'md' ? 'h-4 w-4 shrink-0' : 'h-3.5 w-3.5 shrink-0';
  const wrapCls =
    size === 'md'
      ? 'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-extrabold tracking-tight'
      : 'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-tight';

  if (groupId === 'biotech-kontact' || groupId === 'biotech-dental') {
    return (
      <span
        data-testid="brand-logo-biotech-kontact"
        title="Biotech Dental"
        className={`${wrapCls} border-sky-200/80 bg-sky-50/90 text-sky-800`}
      >
        <svg viewBox="0 0 20 20" className={iconCls} aria-hidden="true">
          <polygon points="10,1.5 17.5,5.8 17.5,14.2 10,18.5 2.5,14.2 2.5,5.8" fill="#0284c7" />
          <path d="M7.2 6.2h3.4a2 2 0 0 1 0 3.8H7.2zm0 3.8h3.7a2.1 2.1 0 0 1 0 4.1H7.2z" fill="#ffffff" />
        </svg>
        <span>BD</span>
      </span>
    );
  }
  if (groupId === 'globald-pilot' || groupId === 'global-d') {
    return (
      <span
        data-testid="brand-logo-globald-pilot"
        title="Global D"
        className={`${wrapCls} border-rose-200/80 bg-slate-900 text-white`}
      >
        <svg viewBox="0 0 20 20" className={iconCls} aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="#0f172a" stroke="#e11d48" strokeWidth="2.2" />
          <path d="M10 4.2a5.8 5.8 0 1 0 5.5 7.6h-4.2v-1.8h6.2" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <span>GD</span>
      </span>
    );
  }
  if (groupId === 'mis-mguide' || groupId === 'mis-dentsply-sirona') {
    return (
      <span
        data-testid="brand-logo-mis-mguide"
        title="MIS · Dentsply Sirona"
        className={`${wrapCls} border-sky-200/80 bg-sky-900 text-white`}
      >
        <svg viewBox="0 0 20 20" className={iconCls} aria-hidden="true">
          <rect x="2" y="2" width="16" height="16" rx="3.5" fill="#0369a1" />
          <path d="M5 13.5V6.8l2.8 3.6 2.8-3.6v6.7M14.5 6.8v6.7" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>MIS</span>
      </span>
    );
  }
  return (
    <span
      title="Système personnalisé"
      className={`${wrapCls} border-slate-200 bg-slate-100 text-slate-700`}
    >
      <svg viewBox="0 0 20 20" className={iconCls} aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" fill="#0284c7" fillOpacity="0.14" stroke="#0284c7" strokeWidth="1.8" />
        <circle cx="10" cy="10" r="2.6" fill="#0284c7" />
      </svg>
      <span>PERSO</span>
    </span>
  );
}
