export default function ProgressRing({ value, goal }) {
  const r = 78, c = 2 * Math.PI * r;
  const pct = Math.min(value / goal, 1);
  const over = value > goal;
  return (
    <div className="relative mx-auto h-56 w-56" role="img" aria-label={`${Math.round(value)} of ${goal} calories`}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-line)" strokeWidth="14" />
        <circle cx="100" cy="100" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
          stroke={over ? 'var(--color-chilli)' : 'var(--color-turmeric)'}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold tabular-nums">{Math.abs(Math.round(goal - value))}</div>
        <div className="text-sm text-mute">{over ? 'kcal over goal' : 'kcal left'}</div>
        <div className="mt-1 text-xs text-mute tabular-nums">{Math.round(value)} of {goal} eaten</div>
      </div>
    </div>
  );
}
