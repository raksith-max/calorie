import { timeLabel } from '../utils.js';

export default function MealList({ meals, onDelete }) {
  if (!meals.length) return <p className="py-6 text-center text-mute">Nothing logged yet. Tap Add to log a meal.</p>;
  return (
    <ul className="divide-y divide-line">
      {meals.map((m) => (
        <li key={m.id} className="flex gap-3 py-3">
          {m.thumbnail
            ? <img src={m.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            : <div className="h-14 w-14 shrink-0 rounded-lg bg-line" aria-hidden />}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium capitalize">{m.meal_type} <span className="text-sm font-normal text-mute">{timeLabel(m.eaten_at)}</span></span>
              <span className="font-bold tabular-nums">{Math.round(m.calories)} kcal</span>
            </div>
            <p className="truncate text-sm text-mute">{m.items.map((i) => i.name).join(', ')}</p>
            <p className="text-xs text-mute tabular-nums">P {Math.round(m.protein)}g · C {Math.round(m.carbs)}g · F {Math.round(m.fat)}g</p>
          </div>
          {onDelete && (
            <button onClick={() => onDelete(m.id)} aria-label={`Delete ${m.meal_type}`} className="self-start rounded p-1 text-mute hover:text-chilli">✕</button>
          )}
        </li>
      ))}
    </ul>
  );
}
