import { get, set } from 'idb-keyval';

// Todo se guarda en el teléfono (IndexedDB). Nada se sube salvo al probar un outfit.
const KEYS = { profile: 'fitto.profile', wardrobe: 'fitto.wardrobe', streak: 'fitto.streak', looks: 'fitto.looks' };

export async function loadAll() {
  const [profile, wardrobe, streak, looks] = await Promise.all([
    get(KEYS.profile),
    get(KEYS.wardrobe),
    get(KEYS.streak),
    get(KEYS.looks),
  ]);
  return {
    profile: profile ?? null,
    wardrobe: wardrobe ?? [],
    streak: streak ?? { count: 0, best: 0, lastDate: null, freezes: 1, days: [] },
    looks: looks ?? [],
  };
}

export const saveProfile = (p) => set(KEYS.profile, p);
export const saveWardrobe = (w) => set(KEYS.wardrobe, w);
export const saveStreak = (s) => set(KEYS.streak, s);
export const saveLooks = (l) => set(KEYS.looks, l);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
