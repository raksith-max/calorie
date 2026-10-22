import { useState } from 'react';
import { api } from '../api.js';

export default function Settings({ settings, onSaved }) {
  const [cal, setCal] = useState(settings.calorieGoal);
  const [pro, setPro] = useState(settings.proteinGoal);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setMsg(''); setError('');
    try { onSaved(await api.saveSettings({ calorieGoal: Number(cal), proteinGoal: Number(pro) })); setMsg('Goals saved'); }
    catch (e) { setError(e.message); }
  };
  const field = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-lg tabular-nums';
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Daily goals</h1>
      <label className="block">Calories (kcal)<input type="number" inputMode="numeric" min="1" value={cal} onChange={(e) => setCal(e.target.value)} className={field} /></label>
      <label className="block">Protein (g)<input type="number" inputMode="numeric" min="1" value={pro} onChange={(e) => setPro(e.target.value)} className={field} /></label>
      <button onClick={save} className="w-full rounded-full bg-ink py-3 text-paper">Save goals</button>
      {msg && <p role="status" className="text-leaf">{msg}</p>}
      {error && <p role="alert" className="text-chilli">{error}</p>}
    </div>
  );
}
