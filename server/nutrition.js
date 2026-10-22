import { findIndianFood } from './foods.js';

const USDA_KEY = () => process.env.USDA_API_KEY || 'DEMO_KEY';
const cache = new Map();

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const tokens = (s) => s.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 2).map((t) => (t.length > 3 ? t.replace(/s$/, '') : t));

// USDA FoodData Central search -> per-100 g values, or null.
async function usdaLookup(name) {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('query', name);
  url.searchParams.set('pageSize', '8');
  url.searchParams.set('dataType', 'Foundation,SR Legacy');
  url.searchParams.set('api_key', USDA_KEY());
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const { foods = [] } = await res.json();
  const want = tokens(name);
  let best = null, bestScore = -1;
  for (const f of foods) {
    const get = (num) => f.foodNutrients?.find((n) => n.nutrientNumber === num)?.value;
    const kcal = get('208') ?? get('957') ?? get('958'); // energy, kcal (Foundation foods use 957/958)
    if (kcal == null) continue;
    const have = tokens(f.description);
    const overlap = want.filter((t) => have.includes(t)).length / Math.max(want.length, 1);
    const penalty = have.length * 0.01; // prefer simpler descriptions
    const score = overlap - penalty;
    if (score > bestScore) {
      bestScore = score;
      best = { score: overlap, label: f.description,
        per100g: { calories: kcal, protein: get('203') ?? 0, carbs: get('205') ?? 0, fat: get('204') ?? 0 } };
    }
  }
  return best && best.score >= 0.5 ? best : null; // reject weak matches
}

// Resolve one item to per-100 g values: Indian table -> USDA -> the model's own estimate.
export async function resolvePer100g(name, aiPer100g) {
  const key = name.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  let result = null;
  const indian = findIndianFood(name);
  if (indian) {
    result = { per100g: indian.per100g, source: 'indian-table', label: indian.names[0],
      serving: { label: indian.serving, grams: indian.servingGrams } };
  } else {
    try {
      const usda = await usdaLookup(name);
      if (usda) result = { per100g: usda.per100g, source: 'usda', label: usda.label };
    } catch { /* network/rate-limit: fall through */ }
  }
  if (!result && aiPer100g) result = { per100g: aiPer100g, source: 'ai-estimate' };
  if (result && result.source !== 'ai-estimate') cache.set(key, result);
  return result;
}

export function scale(per100g, grams) {
  const k = grams / 100;
  return {
    calories: round(per100g.calories * k, 0),
    protein: round(per100g.protein * k),
    carbs: round(per100g.carbs * k),
    fat: round(per100g.fat * k),
  };
}

const downgrade = (c) => (c === 'high' ? 'medium' : c);

// Turn the model's raw items into database-backed items.
export async function enrichItems(rawItems) {
  return Promise.all(rawItems.map(async (it) => {
    const aiPer100g = it.grams > 0 ? {
      calories: (it.calories / it.grams) * 100, protein: (it.protein / it.grams) * 100,
      carbs: (it.carbs / it.grams) * 100, fat: (it.fat / it.grams) * 100,
    } : null;
    const hit = await resolvePer100g(it.name, aiPer100g);
    const per100g = hit?.per100g || aiPer100g;
    let confidence = it.confidence;
    let note = null;
    // If the database and the model disagree a lot, the dish or preparation is probably misjudged.
    if (hit && hit.source !== 'ai-estimate' && aiPer100g && aiPer100g.calories > 0) {
      const diff = Math.abs(hit.per100g.calories - aiPer100g.calories) / aiPer100g.calories;
      if (diff > 0.4) { confidence = downgrade(confidence); note = 'Database and AI estimates differ — check the preparation and portion.'; }
    }
    return {
      name: it.name, grams: it.grams, ...scale(per100g, it.grams),
      per100g: { calories: round(per100g.calories), protein: round(per100g.protein), carbs: round(per100g.carbs), fat: round(per100g.fat) },
      confidence, question: it.question || null, note,
      source: hit?.source || 'ai-estimate', serving: hit?.serving || null,
    };
  }));
}
