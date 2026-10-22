import { useEffect, useState } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import AddMeal from './components/AddMeal.jsx';
import History from './components/History.jsx';
import Settings from './components/Settings.jsx';

function Login({ onDone }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { localStorage.setItem('plate-password', pw); } catch { /* private mode */ }
    try { onDone(await api.settings()); } catch (err) { setError(err.auth ? 'Wrong password.' : err.message); }
  };
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold">Plate</h1>
      <label className="block">Password
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-3" />
      </label>
      {error && <p role="alert" className="text-chilli">{error}</p>}
      <button className="rounded-full bg-ink py-3 text-paper">Unlock</button>
    </form>
  );
}

const TABS = [['today', 'Today'], ['add', 'Add'], ['history', 'History'], ['goals', 'Goals']];

export default function App() {
  const [tab, setTab] = useState('today');
  const [settings, setSettings] = useState({ calorieGoal: 2000, proteinGoal: 100 });
  const [refreshKey, setRefreshKey] = useState(0);

  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const lock = () => setLocked(true);
    window.addEventListener('plate-auth', lock);
    api.settings().then(setSettings).catch(() => {});
    return () => window.removeEventListener('plate-auth', lock);
  }, []);

  if (locked) return <Login onDone={(s) => { setSettings(s); setLocked(false); setRefreshKey((k) => k + 1); }} />;

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-4">
      {tab === 'today' && <Dashboard settings={settings} refreshKey={refreshKey} onAdd={() => setTab('add')} />}
      {tab === 'add' && <AddMeal onSaved={() => { setRefreshKey((k) => k + 1); setTab('today'); }} />}
      {tab === 'history' && <History settings={settings} refreshKey={refreshKey} />}
      {tab === 'goals' && <Settings settings={settings} onSaved={setSettings} />}

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-md">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`flex-1 py-4 text-sm ${tab === id ? 'font-bold text-ink' : 'text-mute'}`}>
              {label}
              <span className={`mx-auto mt-1 block h-1 w-6 rounded-full ${tab === id ? 'bg-turmeric' : 'bg-transparent'}`} />
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
