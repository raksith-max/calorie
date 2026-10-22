import { useState } from 'react';
import { api } from '../api.js';
import { scaleItem } from '../utils.js';

const CONF = { high: ['High confidence', 'text-leaf'], medium: ['Medium confidence', 'text-turmeric'], low: ['Low confidence', 'text-chilli'] };
const SOURCE = { 'indian-table': 'Indian food table', usda: 'USDA database', 'ai-estimate': 'AI estimate', manual: 'Not looked up yet' };

export default function ItemEditor({ item, answer, onAnswer, onChange, onRemove }) {
  const [name, setName] = useState(item.name);
  const [grams, setGrams] = useState(String(item.grams));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changeGrams = (v) => {
    setGrams(v);
    const g = Number(v);
    if (g > 0 && item.per100g) onChange(scaleItem(item, g)); // instant, local recalculation
  };

  const commitName = async () => {
    const n = name.trim();
    const g = Number(grams);
    if (!n || n === item.name && item.source !== 'manual') return;
    if (!(g > 0)) { setError('Enter a weight in grams.'); return; }
    setBusy(true); setError('');
    try { onChange(await api.lookup(n, g)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const [confLabel, confColor] = CONF[item.confidence] || CONF.medium;
  return (
    <li className="space-y-2 py-4">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} aria-label="Food name" placeholder="Food name"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 font-medium" />
        <div className="flex items-center rounded-lg border border-line bg-white pr-2">
          <input value={grams} onChange={(e) => changeGrams(e.target.value)} type="number" inputMode="decimal" min="1" aria-label="Weight in grams"
            className="w-16 rounded-lg bg-transparent px-2 py-2 text-right tabular-nums" />
          <span className="text-sm text-mute">g</span>
        </div>
        <button onClick={onRemove} aria-label={`Remove ${item.name || 'item'}`} className="px-1 text-mute hover:text-chilli">✕</button>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-bold tabular-nums">{busy ? 'Looking up…' : `${Math.round(item.calories)} kcal`}</span>
        <span className="tabular-nums text-mute">P {item.protein}g · C {item.carbs}g · F {item.fat}g</span>
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-xs">
        <span className={confColor}>{confLabel}</span>
        <span className="text-mute">{SOURCE[item.source] || item.source}{item.serving ? ` · ${item.serving.label} ≈ ${item.serving.grams} g` : ''}</span>
      </div>
      {item.note && <p className="text-xs text-chilli">{item.note}</p>}
      {error && <p role="alert" className="text-sm text-chilli">{error}</p>}
      {item.question && (
        <label className="block rounded-lg bg-turmeric/15 p-3 text-sm">
          {item.question}
          <input value={answer || ''} onChange={(e) => onAnswer(e.target.value)} placeholder="Your answer"
            className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2" />
        </label>
      )}
    </li>
  );
}
