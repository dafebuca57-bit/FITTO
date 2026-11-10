// Racha diaria: cuenta días seguidos con actividad (usar un look, probar un outfit o agregar ropa).
// Si faltas un solo día y tienes un congelador, la racha se conserva.
// Ganas un congelador cada 7 días de racha (máximo 2).

export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db - da) / 86400000);
}

// Devuelve { streak, event } donde event describe qué pasó (para mostrar un mensaje).
export function registerActivity(streak, now = new Date()) {
  const today = dayKey(now);
  if (streak.lastDate === today) return { streak, event: null };

  let { count, freezes, best } = streak;
  const days = [...(streak.days ?? [])];
  let event = 'up';

  if (!streak.lastDate) {
    count = 1;
    event = 'start';
  } else {
    const gap = daysBetween(streak.lastDate, today);
    if (gap === 1) {
      count += 1;
    } else if (gap === 2 && freezes > 0) {
      freezes -= 1;
      count += 1;
      const missed = new Date(now);
      missed.setDate(missed.getDate() - 1);
      days.push({ date: dayKey(missed), freeze: true });
      event = 'freeze';
    } else {
      count = 1;
      event = 'reset';
    }
  }

  if (count > 0 && count % 7 === 0 && freezes < 2) {
    freezes += 1;
    event = event === 'freeze' ? 'freeze' : 'earned';
  }

  days.push({ date: today, freeze: false });
  const next = {
    count,
    best: Math.max(best ?? 0, count),
    lastDate: today,
    freezes,
    days: days.slice(-30),
  };
  return { streak: next, event };
}

// Racha "viva": si pasaron más días de los que un congelador cubre, se muestra en 0.
export function displayCount(streak, now = new Date()) {
  if (!streak.lastDate) return 0;
  const gap = daysBetween(streak.lastDate, dayKey(now));
  if (gap <= 1) return streak.count;
  if (gap === 2 && streak.freezes > 0) return streak.count;
  return 0;
}

// Últimos 7 días para dibujar los círculos de la racha.
export function lastSevenDays(streak, now = new Date()) {
  const map = new Map((streak.days ?? []).map((d) => [d.date, d]));
  const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const rec = map.get(key);
    out.push({ key, letter: letters[d.getDay()], done: Boolean(rec && !rec.freeze), freeze: Boolean(rec?.freeze), today: i === 0 });
  }
  return out;
}
