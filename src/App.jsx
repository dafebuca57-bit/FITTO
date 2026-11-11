import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAll, saveLooks, saveProfile, saveStreak, saveWardrobe } from './lib/store.js';
import { registerActivity } from './lib/streak.js';
import { ART_VERSION, renderGarment } from './lib/garmentArt.js';
import Icon from './components/Icon.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Hoy from './screens/Hoy.jsx';
import Armario from './screens/Armario.jsx';
import Probador from './screens/Probador.jsx';
import Perfil from './screens/Perfil.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: 'sun' },
  { id: 'armario', label: 'Armario', icon: 'hanger' },
  { id: 'probador', label: 'Probador', icon: 'mirror' },
  { id: 'perfil', label: 'Perfil', icon: 'user' },
];

const STREAK_MSG = {
  start: '¡Empezaste tu racha! Vuelve mañana.',
  up: (n) => `¡Racha de ${n} días! Sigue así.`,
  freeze: 'Usamos un congelador: tu racha sigue viva.',
  earned: (n) => `¡${n} días! Ganaste un congelador de racha.`,
  reset: 'Nueva racha: día 1. ¡Tú puedes!',
};

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('hoy');
  const [toast, setToast] = useState(null);
  const [probarId, setProbarId] = useState(null);
  const toastTimer = useRef();

  useEffect(() => {
    loadAll().then((d) => {
      // Redibuja las prendas rápidas guardadas con la versión más realista del dibujo.
      let changed = false;
      const wardrobe = d.wardrobe.map((w) => {
        if (!w.generic || w.artVersion === ART_VERSION || !w.type) return w;
        changed = true;
        return { ...w, image: renderGarment(w.type, w.color, w.fit), artVersion: ART_VERSION };
      });
      if (changed) saveWardrobe(wardrobe);
      setData({ ...d, wardrobe });
    });
  }, []);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Cada acción importante cuenta para la racha diaria.
  const activity = useCallback(
    (d) => {
      const { streak, event } = registerActivity(d.streak);
      if (event) {
        saveStreak(streak);
        const m = STREAK_MSG[event];
        showToast(typeof m === 'function' ? m(streak.count) : m);
      }
      return { ...d, streak };
    },
    [showToast],
  );

  if (!data) return <div className="screen" aria-busy="true" />;

  const actions = {
    setProfile: (profile) => {
      saveProfile(profile);
      setData((d) => ({ ...d, profile }));
    },
    addItem: (item) => {
      setData((d) => {
        const wardrobe = [item, ...d.wardrobe];
        saveWardrobe(wardrobe);
        return activity({ ...d, wardrobe });
      });
    },
    removeItem: (id) => {
      setData((d) => {
        const wardrobe = d.wardrobe.filter((w) => w.id !== id);
        saveWardrobe(wardrobe);
        return { ...d, wardrobe };
      });
    },
    wear: (ids) => {
      setData((d) => {
        const now = Date.now();
        const wardrobe = d.wardrobe.map((w) => (ids.includes(w.id) ? { ...w, lastWorn: now, timesWorn: (w.timesWorn ?? 0) + 1 } : w));
        saveWardrobe(wardrobe);
        return activity({ ...d, wardrobe });
      });
    },
    addLook: (look) => {
      setData((d) => {
        const looks = [look, ...d.looks].slice(0, 30);
        saveLooks(looks);
        return activity({ ...d, looks });
      });
    },
    removeLook: (id) => {
      setData((d) => {
        const looks = d.looks.filter((l) => l.id !== id);
        saveLooks(looks);
        return { ...d, looks };
      });
    },
    goProbar: (itemId) => {
      setProbarId(itemId);
      setTab('probador');
    },
    goTab: setTab,
    toast: showToast,
  };

  if (!data.profile) return <Onboarding onDone={actions.setProfile} />;

  const props = { data, actions };
  return (
    <div className="app">
      {tab === 'hoy' && <Hoy {...props} />}
      {tab === 'armario' && <Armario {...props} />}
      {tab === 'probador' && <Probador {...props} initialItemId={probarId} />}
      {tab === 'perfil' && <Perfil {...props} />}

      <nav className={`tabbar ${tab === 'probador' ? 'on-dark' : ''}`} aria-label="Principal">
        {TABS.map((t) => (
          <button key={t.id} type="button" className="tab" aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => { setTab(t.id); if (t.id !== 'probador') setProbarId(null); }}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
