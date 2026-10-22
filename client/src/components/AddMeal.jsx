import { useRef, useState } from 'react';
import { api } from '../api.js';
import { dayStr, guessMealType, prepareImage, sumBy, round } from '../utils.js';
import ItemEditor from './ItemEditor.jsx';

const TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];
const BLANK = { name: '', grams: 100, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 'high', question: null, note: null, source: 'manual',
  per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 } };

export default function AddMeal({ onSaved }) {
  const [stage, setStage] = useState('input');
  const [img, setImg] = useState(null);
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState(guessMealType());
  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(), camRef = useRef();

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    try { setError(''); setImg(await prepareImage(file)); }
    catch { setError('That image could not be read. Try another photo.'); }
  };

  const analyze = async (extra = '') => {
    if (!img && !text.trim()) { setError('Add a photo or describe your meal.'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      if (img) fd.append('image', img.blob, 'meal.jpg');
      fd.append('text', [text.trim(), extra].filter(Boolean).join('\n'));
      const res = await api.analyze(fd);
      if (res.status !== 'ok') {
        setError(res.message || (res.status === 'blurry' ? 'The photo is too blurry or dark. Retake it in better light.' : res.status === 'not_food' ? 'No food found in this photo.' : 'Could not identify the meal.'));
        return;
      }
      setItems(res.items); setAnswers({}); setStage('review');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const reanalyze = () => {
    const extra = 'Clarifications: ' + items.map((it, i) => answers[i]?.trim() && `${it.name} — ${it.question} ${answers[i].trim()}`).filter(Boolean).join('; ');
    analyze(extra);
  };

  const save = async () => {
    const valid = items.filter((i) => i.name.trim() && i.grams > 0);
    if (!valid.length) { setError('Add at least one food item.'); return; }
    if (valid.some((i) => i.source === 'manual')) { setError('Finish the name of each new item (tap outside the field to look it up).'); return; }
    setBusy(true); setError('');
    try {
      await api.saveMeal({ day: dayStr(), eaten_at: new Date().toISOString(), meal_type: mealType, note: text.trim(), thumbnail: img?.thumb, items: valid });
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const update = (i, next) => setItems((arr) => arr.map((x, j) => (j === i ? next : x)));
  const hasAnswers = Object.values(answers).some((a) => a?.trim());
  const btn = 'w-full rounded-full py-3 disabled:opacity-50';

  if (stage === 'review') return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Check your meal</h1>
      <p className="text-sm text-mute">Fix any name or weight; calories update right away.</p>
      <ul className="divide-y divide-line">
        {items.map((it, i) => (
          <ItemEditor key={`${i}-${it.name}-${it.source}`} item={it} answer={answers[i]}
            onAnswer={(v) => setAnswers((a) => ({ ...a, [i]: v }))}
            onChange={(n) => update(i, n)} onRemove={() => setItems((arr) => arr.filter((_, j) => j !== i))} />
        ))}
      </ul>
      <button onClick={() => setItems((a) => [...a, { ...BLANK }])} className="text-sm underline">Add another item</button>
      <div className="flex items-baseline justify-between rounded-xl bg-ink p-4 text-paper">
        <span className="text-2xl font-bold tabular-nums">{Math.round(sumBy(items, 'calories'))} kcal</span>
        <span className="text-sm tabular-nums opacity-80">P {round(sumBy(items, 'protein'))}g · C {round(sumBy(items, 'carbs'))}g · F {round(sumBy(items, 'fat'))}g</span>
      </div>
      {error && <p role="alert" className="text-chilli">{error}</p>}
      {hasAnswers && <button onClick={reanalyze} disabled={busy} className={`${btn} border border-ink`}>{busy ? 'Analyzing…' : 'Recalculate with my answers'}</button>}
      <button onClick={save} disabled={busy} className={`${btn} bg-leaf text-white`}>Save {mealType}</button>
      <button onClick={() => { setStage('input'); setError(''); }} className="w-full py-2 text-mute">Back</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Log a meal</h1>
      <div role="radiogroup" aria-label="Meal type" className="grid grid-cols-4 gap-1 rounded-full bg-line p-1 text-sm">
        {TYPES.map((t) => (
          <button key={t} role="radio" aria-checked={mealType === t} onClick={() => setMealType(t)}
            className={`rounded-full py-1.5 capitalize ${mealType === t ? 'bg-ink text-paper' : ''}`}>{t}</button>
        ))}
      </div>

      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`overflow-hidden rounded-2xl border-2 border-dashed ${drag ? 'border-leaf bg-leaf/10' : 'border-line'}`}>
        {img ? (
          <div className="relative">
            <img src={img.preview} alt="Your meal" className="max-h-72 w-full object-cover" />
            <button onClick={() => setImg(null)} className="absolute right-2 top-2 rounded-full bg-ink/80 px-3 py-1 text-sm text-paper">Remove</button>
          </div>
        ) : (
          <div className="space-y-3 p-6 text-center">
            <p className="text-mute">Drop a photo here, or</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => camRef.current.click()} className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Take photo</button>
              <button onClick={() => fileRef.current.click()} className="rounded-full border border-ink px-4 py-2 text-sm">Choose photo</button>
            </div>
          </div>
        )}
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
      </div>

      <label className="block">What did you eat?
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000}
          placeholder="2 idlis with sambar and coconut chutney"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2" />
        <span className="text-xs text-mute">With a photo, your words decide the foods and amounts (e.g. “200 g rice, 1 egg”). The photo fills in the rest.</span>
      </label>

      {error && <p role="alert" className="text-chilli">{error}</p>}
      <button onClick={() => analyze()} disabled={busy} className={`${btn} bg-ink text-paper`}>{busy ? 'Analyzing…' : 'Calculate calories'}</button>
    </div>
  );
}
