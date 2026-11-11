// Catálogo de prendas para "Vestido Rápido": tipo + color + corte, sin fotos.

export const CATEGORIES = [
  { id: 'superior', label: 'Superiores' },
  { id: 'inferior', label: 'Inferiores' },
  { id: 'vestido', label: 'Vestidos' },
  { id: 'calzado', label: 'Calzado' },
];

const P = {
  camisa: 'M30 18 L42 12 Q50 20 58 12 L70 18 L86 34 L76 44 L68 38 L68 88 L32 88 L32 38 L24 44 L14 34 Z',
  camiseta: 'M32 16 L44 12 Q50 18 56 12 L68 16 L84 30 L74 40 L68 36 L68 88 L32 88 L32 36 L26 40 L16 30 Z',
  sueter: 'M30 16 L42 12 Q50 18 58 12 L70 16 L88 70 L78 74 L68 40 L68 88 L32 88 L32 40 L22 74 L12 70 Z',
  chaqueta: 'M30 14 L44 10 L50 34 L56 10 L70 14 L86 30 L84 88 L70 88 L70 46 L70 90 H30 V46 L30 88 L16 88 L14 30 Z',
  jeans: 'M28 10 H72 L78 92 H58 L50 40 L42 92 H22 Z',
  pantalon: 'M26 10 H74 L82 92 H60 L50 42 L40 92 H18 Z',
  falda: 'M32 22 H68 L82 86 H18 Z',
  short: 'M24 26 H76 L82 70 H56 L50 48 L44 70 H18 Z',
  vestido: 'M38 8 H62 L60 30 L80 92 H20 L40 30 Z',
  tenis: 'M10 62 Q12 44 24 46 L40 52 Q56 58 76 60 Q92 62 92 74 L92 80 H10 Z',
  zapatos: 'M8 66 Q10 54 22 56 L50 60 Q70 62 84 58 Q94 58 94 70 L94 76 H8 Z',
};

export const TYPES = [
  { id: 'camisa', g: 'f', label: 'Camisa', category: 'superior', d: P.camisa },
  { id: 'camiseta', g: 'f', label: 'Camiseta', category: 'superior', d: P.camiseta },
  { id: 'sueter', g: 'm', label: 'Suéter', category: 'superior', d: P.sueter },
  { id: 'chaqueta', g: 'f', label: 'Chaqueta', category: 'superior', d: P.chaqueta },
  { id: 'jeans', g: 'mp', label: 'Jeans', category: 'inferior', d: P.jeans },
  { id: 'pantalon', g: 'm', label: 'Pantalón', category: 'inferior', d: P.pantalon },
  { id: 'falda', g: 'f', label: 'Falda', category: 'inferior', d: P.falda },
  { id: 'short', g: 'm', label: 'Short', category: 'inferior', d: P.short },
  { id: 'vestido', g: 'm', label: 'Vestido', category: 'vestido', d: P.vestido },
  { id: 'tenis', g: 'mp', label: 'Tenis', category: 'calzado', d: P.tenis },
  { id: 'zapatos', g: 'mp', label: 'Zapatos', category: 'calzado', d: P.zapatos },
];

export const COLORS = [
  { id: 'negro', label: 'Negro', hex: '#1E1C1A' },
  { id: 'blanco', label: 'Blanco', hex: '#F7F5F0' },
  { id: 'gris', label: 'Gris', hex: '#8A8782' },
  { id: 'crema', label: 'Crema', hex: '#E6D3B3' },
  { id: 'cafe', label: 'Café', hex: '#7A4A2A' },
  { id: 'azul', label: 'Azul oscuro', hex: '#243B6B' },
  { id: 'celeste', label: 'Celeste', hex: '#8FB3DE' },
  { id: 'oliva', label: 'Oliva', hex: '#6B7A3A' },
  { id: 'verde', label: 'Verde', hex: '#2F7A4F' },
  { id: 'rojo', label: 'Rojo', hex: '#C2362B' },
  { id: 'rosa', label: 'Rosa', hex: '#E8A9B8' },
  { id: 'amarillo', label: 'Mostaza', hex: '#C9A227' },
];

export const FITS = [
  { id: 'slim', label: 'Slim' },
  { id: 'recto', label: 'Recto' },
  { id: 'ancho', label: 'Ancho' },
];

export const typeById = (id) => TYPES.find((t) => t.id === id);
export const colorById = (id) => COLORS.find((c) => c.id === id);

// Solo prendas superiores (y vestidos, en modo experimental) se pueden probar con IA.
export const canTryOn = (item) => item.category === 'superior' || item.category === 'vestido';

// Concordancia del color con la prenda: "Camisa blanca", "Jeans negros".
const VARIABLE = { negro: 'negr', blanco: 'blanc', rojo: 'roj' };
export function colorName(colorId, g = 'm') {
  const c = colorById(colorId);
  if (colorId === 'azul') return { m: 'azul oscuro', f: 'azul oscuro', mp: 'azul oscuro', fp: 'azul oscuro' }[g];
  const root = VARIABLE[colorId];
  if (!root) return c.label.toLowerCase();
  return root + { m: 'o', f: 'a', mp: 'os', fp: 'as' }[g];
}

// Descripción en inglés para el modelo de IA (entiende mejor inglés que español).
const EN_TYPE = { camisa: 'shirt', camiseta: 't-shirt', sueter: 'sweater', chaqueta: 'jacket', vestido: 'dress' };
const EN_COLOR = {
  negro: 'black', blanco: 'white', gris: 'gray', crema: 'cream', cafe: 'brown', azul: 'navy blue',
  celeste: 'light blue', oliva: 'olive green', verde: 'green', rojo: 'red', rosa: 'pink', amarillo: 'mustard yellow',
};
export function englishDescription(item, body) {
  const colorId = item.colorId ?? (item.generic ? COLORS.find((c) => c.hex === item.color)?.id : null);
  const type = EN_TYPE[item.type] ?? 'top';
  const who = body === 'hombre' ? "men's " : body === 'mujer' ? "women's " : '';
  return `${who}${colorId ? EN_COLOR[colorId] + ' ' : ''}${type}`.trim();
}
