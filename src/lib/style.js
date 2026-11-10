// Puntaje de "match" y cumplidos. Reglas simples de color:
// neutros combinan con todo, análogos y complementarios combinan bien,
// y se premian los colores que van con el subtono de piel del usuario.

function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

const isNeutral = ({ s, l }) => s < 0.18 || l < 0.14 || l > 0.9;
const isEarthy = ({ h, s }) => h >= 18 && h <= 60 && s < 0.6;

function hueDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Qué tan bien va un color con el subtono: 'calido' | 'frio' | 'neutro'
function toneFit(hex, tone) {
  const c = hexToHsl(hex);
  if (isNeutral(c) || tone === 'neutro') return 0.85;
  const warm = (c.h <= 70 || c.h >= 340) || isEarthy(c) || (c.h > 70 && c.h < 110 && c.s < 0.5);
  if (tone === 'calido') return warm ? 1 : 0.62;
  return warm ? 0.62 : 1;
}

// Armonía entre dos colores (0..1).
function pairHarmony(a, b) {
  const A = hexToHsl(a), B = hexToHsl(b);
  if (isNeutral(A) || isNeutral(B)) return 0.95;
  const d = hueDist(A.h, B.h);
  if (d < 35) return 0.9; // análogos
  if (d > 150) return 0.86; // complementarios
  if (d > 100 && d <= 150) return 0.72; // triádicos: más atrevido
  // Choque típico: dos colores saturados medio separados
  return A.s > 0.5 && B.s > 0.5 ? 0.55 : 0.7;
}

export function outfitScore(colors, tone = 'neutro') {
  const valid = colors.filter(Boolean);
  if (!valid.length) return 0;
  let harmony = 1;
  let pairs = 0, sum = 0;
  for (let i = 0; i < valid.length; i++)
    for (let j = i + 1; j < valid.length; j++) {
      sum += pairHarmony(valid[i], valid[j]);
      pairs++;
    }
  if (pairs) harmony = sum / pairs;
  const tone_ = valid.reduce((acc, c) => acc + toneFit(c, tone), 0) / valid.length;
  const raw = harmony * 0.6 + tone_ * 0.4;
  return Math.max(55, Math.min(98, Math.round(raw * 100)));
}

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

export function compliment(score, { colorName = '', tone = 'neutro', seed = 0 } = {}) {
  const toneTxt = tone === 'calido' ? 'tu tono cálido' : tone === 'frio' ? 'tu tono frío' : 'tu tono de piel';
  if (score >= 90)
    return {
      title: pick(['¡Match perfecto!', '¡Esto es tuyo!', '¡Brillas con esto!'], seed),
      text: pick(
        [
          `El ${colorName || 'color'} resalta ${toneTxt}. Combinación de 10.`,
          `Colores en total armonía con ${toneTxt}. Sal con confianza.`,
          `Este look te ilumina el rostro. Guárdalo en tus favoritos.`,
        ],
        seed,
      ),
    };
  if (score >= 80)
    return {
      title: pick(['Te queda muy bien', 'Gran elección', 'Se ve increíble'], seed),
      text: pick(
        [
          `Buen equilibrio de colores. Un accesorio sencillo lo deja perfecto.`,
          `Funciona muy bien con ${toneTxt}. Unos tenis blancos lo elevan.`,
          `Look limpio y seguro. Va con casi cualquier plan.`,
        ],
        seed,
      ),
    };
  if (score >= 70)
    return {
      title: 'Buen look, con un ajuste más',
      text: pick(
        [
          `Prueba cambiar una prenda por un neutro (blanco, crema o negro) para equilibrar.`,
          `Agrega un toque de color cerca del rostro para darle más vida.`,
        ],
        seed,
      ),
    };
  return {
    title: 'Probemos otra combinación',
    text: `Estos colores compiten entre sí. Cambia la prenda superior por un tono más suave que vaya con ${toneTxt}.`,
  };
}

// Elige el mejor outfit del armario, rotando con "variant" y priorizando lo menos usado.
export function suggestOutfit(wardrobe, tone, variant = 0) {
  const by = (cat) => wardrobe.filter((w) => w.category === cat);
  const tops = by('superior'), bottoms = by('inferior'), dresses = by('vestido'), shoes = by('calzado');
  const combos = [];
  for (const t of tops) for (const b of bottoms) combos.push([t, b]);
  for (const d of dresses) combos.push([d]);
  if (!combos.length) return null;

  const now = Date.now();
  const freshness = (items) =>
    items.reduce((acc, it) => acc + Math.min(1, (now - (it.lastWorn ?? 0)) / (14 * 86400000)), 0) / items.length;

  const ranked = combos
    .map((items) => {
      const shoe = shoes.length
        ? shoes.reduce((best, s) => (outfitScore([...items, s].map((x) => x.color), tone) > outfitScore([...items, best].map((x) => x.color), tone) ? s : best), shoes[0])
        : null;
      const all = shoe ? [...items, shoe] : items;
      const score = outfitScore(all.map((x) => x.color), tone);
      return { items: all, score, rank: score + freshness(items) * 8 };
    })
    .sort((a, b) => b.rank - a.rank);

  return ranked[variant % ranked.length];
}
