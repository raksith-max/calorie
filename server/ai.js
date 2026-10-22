import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const SYSTEM = `You are a nutrition analyst for a calorie-tracking app. Identify the foods in the user's meal and estimate each item's edible weight and nutrition for the WHOLE portion eaten (not per 100 g).

Respond with ONLY a JSON object, no prose and no markdown fences:
{
  "status": "ok" | "not_food" | "blurry" | "unclear",
  "message": "short explanation when status is not ok, otherwise empty string",
  "items": [
    { "name": string, "grams": number, "calories": number, "protein": number, "carbs": number, "fat": number,
      "confidence": "high" | "medium" | "low", "question": string | null }
  ]
}

Rules:
- status "not_food" if the image has no food; "blurry" if it is too dark/blurry to identify; "unclear" if the text is not a meal. Use an empty items array for those.
- If the user typed a description, it is the source of truth for WHAT was eaten and HOW MUCH. Use the photo only to fill gaps (e.g. sides, cooking style) and sanity-check portions. Never invent items that are in neither.
- List each distinct food separately (e.g. idli, sambar and chutney are three items). Do not add a total row.
- Name items specifically, including preparation: "cooked white rice", "fried egg", "chicken biryani", not "rice" or "food".
- Weights in grams of the food as eaten. Typical Indian portions: 1 idli 40 g, 1 dosa 90 g, 1 chapati 40 g, 1 katori cooked rice 150 g, 1 katori dal/sambar/curry 150 g, 1 boiled egg 50 g, 1 medu vada 50 g, 1 plate biryani 250 g.
- Protein, carbs, fat in grams; calories in kcal. Make calories consistent with the macros (4/4/9 per gram).
- Include visible cooking oil, ghee, sauces and gravies in the item that contains them.
- confidence "low" when portion size or preparation is genuinely uncertain. For every "low" item set "question" to ONE short question that would resolve it (e.g. "Is the dosa made with ghee or oil?", "How big was the bowl?"). Otherwise "question" is null.
- Never refuse to estimate because exactness is impossible; give your best estimate.`;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

function validate(data) {
  const status = ['ok', 'not_food', 'blurry', 'unclear'].includes(data.status) ? data.status : 'ok';
  if (status !== 'ok') return { status, message: String(data.message || ''), items: [] };
  if (!Array.isArray(data.items)) throw new Error('items missing');
  const items = [];
  for (const it of data.items) {
    const grams = num(it.grams), calories = num(it.calories);
    if (!it.name || !grams || grams <= 0 || calories === null) continue;
    items.push({
      name: String(it.name).slice(0, 80), grams, calories,
      protein: num(it.protein) ?? 0, carbs: num(it.carbs) ?? 0, fat: num(it.fat) ?? 0,
      confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'medium',
      question: it.question ? String(it.question).slice(0, 160) : null,
    });
  }
  if (!items.length) return { status: 'unclear', message: 'No foods could be identified. Try a clearer photo or describe the meal.', items: [] };
  return { status: 'ok', message: '', items };
}

export async function analyzeMeal({ image, mediaType, text }) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: image.toString('base64') } });
  content.push({ type: 'text', text: text ? `Meal description from the user (source of truth): ${text}` : 'Analyze the meal in the photo.' });

  let response;
  try {
    response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });
  } catch (err) {
    if (err.status === 401) throw new HttpError(500, 'Invalid or missing ANTHROPIC_API_KEY on the server.');
    if (err.status === 429) throw new HttpError(429, 'Too many requests to the AI service. Wait a moment and try again.');
    throw new HttpError(502, 'The AI service is unavailable right now. Try again shortly.');
  }

  const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return validate(parseJson(raw));
  } catch {
    throw new HttpError(502, 'The AI returned an unreadable response. Please try again.');
  }
}
