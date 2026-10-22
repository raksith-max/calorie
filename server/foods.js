// Common Indian foods, approximate values per 100 g of the food as eaten (cooked/prepared),
// based on typical IFCT / standard recipe values. "serving" is a typical household portion.
// Checked first because USDA has poor coverage of Indian dishes.
const F = (names, calories, protein, carbs, fat, serving, servingGrams) => ({
  names, per100g: { calories, protein, carbs, fat }, serving, servingGrams,
});

export const INDIAN_FOODS = [
  F(['idli', 'idly'], 140, 4.2, 28, 0.5, '1 idli', 40),
  F(['masala dosa'], 175, 4.3, 27, 6, '1 masala dosa', 200),
  F(['plain dosa', 'dosa', 'dosai'], 165, 4, 29, 3.5, '1 dosa', 90),
  F(['rava dosa'], 190, 4, 30, 6, '1 dosa', 100),
  F(['uttapam', 'uthappam'], 150, 4, 24, 4, '1 uttapam', 120),
  F(['medu vada', 'vada', 'vadai'], 280, 8, 28, 15, '1 vada', 50),
  F(['sambar', 'sambhar'], 50, 2.5, 7, 1.5, '1 katori', 150),
  F(['coconut chutney', 'chutney'], 150, 2, 6, 13, '2 tbsp', 30),
  F(['tomato chutney'], 70, 1.5, 8, 3.5, '2 tbsp', 30),
  F(['cooked white rice', 'white rice', 'steamed rice', 'rice'], 130, 2.7, 28, 0.3, '1 katori', 150),
  F(['curd rice', 'thayir sadam'], 120, 3, 18, 3.5, '1 bowl', 200),
  F(['lemon rice'], 150, 3, 27, 3.5, '1 plate', 200),
  F(['chicken biryani', 'mutton biryani', 'biryani'], 170, 8, 21, 6, '1 plate', 250),
  F(['veg biryani', 'vegetable biryani'], 150, 3.5, 24, 4.5, '1 plate', 250),
  F(['chapati', 'roti', 'phulka'], 300, 9, 55, 4, '1 chapati', 40),
  F(['paratha'], 326, 7.5, 45, 13, '1 paratha', 80),
  F(['poori', 'puri'], 380, 7, 45, 19, '1 poori', 30),
  F(['dal', 'dhal', 'lentil curry'], 100, 6, 13, 2.5, '1 katori', 150),
  F(['rajma'], 120, 6, 15, 3.5, '1 katori', 150),
  F(['chole', 'chana masala'], 150, 7, 20, 5, '1 katori', 150),
  F(['paneer', 'paneer butter masala'], 265, 18, 4, 20, '100 g', 100),
  F(['chicken curry'], 150, 13, 5, 8, '1 katori', 150),
  F(['egg curry'], 130, 8, 5, 9, '1 katori', 150),
  F(['boiled egg'], 155, 13, 1.1, 11, '1 egg', 50),
  F(['omelette', 'omelet'], 154, 11, 1, 12, '1 omelette', 60),
  F(['upma'], 140, 3.5, 22, 4, '1 plate', 200),
  F(['pongal'], 150, 4, 22, 5, '1 bowl', 200),
  F(['poha'], 130, 2.6, 24, 2.8, '1 plate', 150),
  F(['curd', 'yogurt', 'yoghurt', 'dahi'], 61, 3.5, 4.7, 3.3, '1 bowl', 150),
  F(['mixed vegetable curry', 'vegetable curry', 'sabzi', 'poriyal'], 90, 2.5, 10, 4.5, '1 katori', 120),
  F(['samosa'], 262, 4.5, 30, 14, '1 samosa', 60),
  F(['ghee'], 900, 0, 0, 100, '1 tsp', 5),
]; 

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Longest alias contained in the item name wins ("masala dosa" beats "dosa").
export function findIndianFood(name) {
  const n = ` ${norm(name)} `;
  let best = null, bestLen = 0;
  for (const food of INDIAN_FOODS) {
    for (const alias of food.names) {
      if (n.includes(` ${alias} `) && alias.length > bestLen) { best = food; bestLen = alias.length; }
    }
  }
  return best;
}
