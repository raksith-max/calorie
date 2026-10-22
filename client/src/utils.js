const pad = (n) => String(n).padStart(2, '0');
export const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const shiftDay = (str, n) => { const [y, m, d] = str.split('-').map(Number); return dayStr(new Date(y, m - 1, d + n)); };
export const weekdayShort = (str) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' }); };
export const timeLabel = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const guessMealType = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'; };
export const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
export const sumBy = (items, k) => items.reduce((s, i) => s + (Number(i[k]) || 0), 0);

// Scale per-100 g values to a portion, instantly and locally.
export function scaleItem(item, grams) {
  const k = grams / 100, p = item.per100g;
  return { ...item, grams, calories: round(p.calories * k), protein: round(p.protein * k, 1), carbs: round(p.carbs * k, 1), fat: round(p.fat * k, 1) };
}

// Downscale a photo in the browser: smaller upload, faster analysis, and a tiny thumbnail to store.
async function toCanvas(file, maxSide) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
export async function prepareImage(file) {
  const big = await toCanvas(file, 1280);
  const blob = await new Promise((res) => big.toBlob(res, 'image/jpeg', 0.85));
  const thumb = (await toCanvas(file, 160)).toDataURL('image/jpeg', 0.6);
  return { blob, thumb, preview: URL.createObjectURL(blob) };
}
