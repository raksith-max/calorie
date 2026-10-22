import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { dayStr, sumBy } from '../utils.js';
import ProgressRing from './ProgressRing.jsx';
import MealList from './MealList.jsx';

function Macro({ label, value, goal, color }) {
  const pct = goal ? Math.min(value / goal, 1) * 100 : 0;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-mute">{Math.round(value)}{goal ? ` / ${goal}` : ''} g</span></div>
      <div className="mt-1 h-2 rounded-full bg-line"><div className="h-2 rounded-full" style={{ width: `${goal ? pct : 100}%`, background: color, opacity: goal ? 1 : 0.35 }} /></div>
    </div>
  );
}

export default function Dashboard({ settings, refreshKey, onAdd }) {
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState('');
  const day = dayStr();

  const load = useCallback(() => api.meals(day).then(setMeals).catch((e) => setError(e.message)), [day]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const remove = async (id) => {
    if (!confirm('Delete this meal?')) return;
    try { await api.deleteMeal(id); load(); } catch (e) { setError(e.message); }
  };

  const total = sumBy(meals, 'calories');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today</h1>
      {error && <p role="alert" className="text-chilli">{error}</p>}
      <ProgressRing value={total} goal={settings.calorieGoal} />
      <div className="space-y-3">
        <Macro label="Protein" value={sumBy(meals, 'protein')} goal={settings.proteinGoal} color="var(--color-leaf)" />
        <div className="flex gap-4">
          <Macro label="Carbs" value={sumBy(meals, 'carbs')} color="var(--color-turmeric)" />
          <Macro label="Fat" value={sumBy(meals, 'fat')} color="var(--color-chilli)" />
        </div>
      </div>
      <section>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Meals</h2>
          <button onClick={onAdd} className="rounded-full bg-ink px-4 py-1.5 text-sm text-paper">Add meal</button></div>
        <MealList meals={meals} onDelete={remove} />
      </section>
    </div>
  );
}
