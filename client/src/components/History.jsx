import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { dayStr, shiftDay, weekdayShort, round } from '../utils.js';
import MealList from './MealList.jsx';

export default function History({ settings, refreshKey }) {
  const today = dayStr();
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(today);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats(days[0], today).then((rows) => setStats(Object.fromEntries(rows.map((r) => [r.day, r])))).catch((e) => setError(e.message));
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.meals(selected).then(setMeals).catch((e) => setError(e.message)); }, [selected, refreshKey]);

  const max = Math.max(settings.calorieGoal * 1.15, ...days.map((d) => stats[d]?.calories || 0));
  const logged = days.filter((d) => stats[d]);
  const avg = logged.length ? round(logged.reduce((s, d) => s + stats[d].calories, 0) / logged.length) : 0;
  const goalY = 100 - (settings.calorieGoal / max) * 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Last 7 days</h1>
      {error && <p role="alert" className="text-chilli">{error}</p>}
      <p className="text-mute">{logged.length ? `Average ${avg} kcal on days you logged.` : 'No meals logged this week.'}</p>
      <div className="relative h-48">
        <div className="absolute inset-x-0 border-t border-dashed border-mute/60" style={{ top: `${goalY}%` }} aria-hidden />
        <span className="absolute right-0 -translate-y-full text-xs text-mute" style={{ top: `${goalY}%` }}>goal {settings.calorieGoal}</span>
        <div className="flex h-full items-end gap-2">
          {days.map((d) => {
            const cal = stats[d]?.calories || 0;
            const over = cal > settings.calorieGoal;
            return (
              <button key={d} onClick={() => setSelected(d)} aria-label={`${d}: ${Math.round(cal)} kcal`} aria-pressed={selected === d}
                className="flex h-full flex-1 flex-col justify-end">
                <span className="mb-1 text-center text-[11px] tabular-nums text-mute">{cal ? Math.round(cal) : ''}</span>
                <span className="w-full rounded-t-md" style={{ height: `${(cal / max) * 100}%`, minHeight: cal ? 3 : 0,
                  background: over ? 'var(--color-chilli)' : 'var(--color-leaf)', opacity: selected === d ? 1 : 0.55 }} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 text-center text-xs text-mute">{days.map((d) => <span key={d} className={`flex-1 ${selected === d ? 'font-bold text-ink' : ''}`}>{d === today ? 'Today' : weekdayShort(d)}</span>)}</div>
      <section>
        <h2 className="text-lg font-bold">{selected === today ? 'Today' : selected}</h2>
        <MealList meals={meals} />
      </section>
    </div>
  );
}
