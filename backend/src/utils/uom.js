// utils/uom.js
// Base unit for weight = MG. Base unit for volume = ML.

export const WEIGHT = { MCG: 'MCG', MG: 'MG', GM: 'GM', KG: 'KG' };
export const VOLUME = { ML: 'ML', L: 'L' };

// Convert any weight to MG (Number)
export function toMg(value, uom) {
  if (value == null || value === '') return null;
  const v = Number(value);
  switch ((uom || '').toUpperCase()) {
    case 'MCG': return v / 1000;     // 100 MCG -> 0.1 MG
    case 'MG':  return v;            // 1 MG -> 1 MG
    case 'GM':
    case 'G':   return v * 1000;     // 1 GM -> 1000 MG
    case 'KG':  return v * 1_000_000;// 1 KG -> 1,000,000 MG
    default:    return null;
  }
}

// Convert any volume to ML (Number)
export function toMl(value, uom) {
  if (value == null || value === '') return null;
  const v = Number(value);
  switch ((uom || '').toUpperCase()) {
    case 'ML': return v;
    case 'L':  return v * 1000;
    default:   return null;
  }
}

// Parse strength strings like "228.5mg/5ml", "100 mg/ml", "500MG/2 ML"
export function parseStrengthString(str) {
  if (!str) return null;
  const s = String(str).trim().toUpperCase().replace(/\s+/g, '');
  // patterns: "<num><uom>/<num><uom>" OR "<num><uom>/ML" OR "<num><uom>/1ML"
  const m = s.match(/^([0-9]*\.?[0-9]+)(MCG|MG|G|GM|KG)\/([0-9]*\.?[0-9]+)?(ML|L)$/i);
  if (!m) return null;
  const strength_value = Number(m[1]);
  let strength_uom = m[2].replace(/^G$/, 'GM'); // normalize G -> GM
  const volume_value = m[3] ? Number(m[3]) : 1;
  const volume_uom = m[4];

  return { strength_value, strength_uom, volume_value, volume_uom };
}

// Normalize a product ingredient row to include base-unit fields
export function normalizeIngredient(row) {
  if (!row) return row;
  // optionally allow row.strength_string as input
  let { name, strength_value, strength_uom, volume_value, volume_uom, strength_string } = row;

  if ((!strength_value || !strength_uom) && strength_string) {
    const parsed = parseStrengthString(strength_string);
    if (parsed) ({ strength_value, strength_uom, volume_value, volume_uom } = parsed);
  }

  const strength_value_mg = toMg(strength_value, strength_uom);
  const volume_value_ml = toMl(volume_value ?? 1, volume_uom ?? 'ML');

  return {
    name: name || null,
    strength_value: strength_value ?? null,
    strength_uom: strength_uom ?? null,
    volume_value: volume_value ?? (volume_value_ml ? volume_value_ml : null),
    volume_uom: volume_uom ?? (volume_value_ml ? 'ML' : null),
    strength_value_mg: strength_value_mg ?? null,
    volume_value_ml: volume_value_ml ?? null,
  };
}

// Normalize an entire product.ingredients array
export function normalizeProductIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map(normalizeIngredient);
}
