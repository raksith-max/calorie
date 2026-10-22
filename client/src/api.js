const getPw = () => { try { return localStorage.getItem('plate-password') || ''; } catch { return ''; } };

async function req(path, opts = {}) {
  let res;
  try { res = await fetch('/api' + path, { ...opts, headers: { ...opts.headers, 'x-app-password': getPw() } }); }
  catch { throw new Error('Cannot reach the server. Is the backend running?'); }
  if (res.status === 401) {
    window.dispatchEvent(new Event('plate-auth'));
    throw Object.assign(new Error('Wrong password.'), { auth: true });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  analyze: (formData) => req('/analyze', { method: 'POST', body: formData }),
  lookup: (name, grams) => req('/lookup', json('POST', { name, grams })),
  meals: (day) => req(`/meals?day=${day}`),
  saveMeal: (meal) => req('/meals', json('POST', meal)),
  deleteMeal: (id) => req(`/meals/${id}`, { method: 'DELETE' }),
  stats: (from, to) => req(`/stats?from=${from}&to=${to}`),
  settings: () => req('/settings'),
  saveSettings: (s) => req('/settings', json('PUT', s)),
};
