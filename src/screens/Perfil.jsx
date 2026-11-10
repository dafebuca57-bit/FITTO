import { useState } from 'react';
import Icon, { Flame } from '../components/Icon.jsx';
import { displayCount, lastSevenDays } from '../lib/streak.js';
import { pingServer } from '../lib/tryon.js';

const TONE_LABEL = { calido: 'Subtono cálido', frio: 'Subtono frío', neutro: 'Subtono neutro' };
const PALETTES = {
  calido: ['#6B7A3A', '#E6D3B3', '#B5652E', '#7A4A2A', '#C9A227', '#8C3B2E'],
  frio: ['#243B6B', '#8FB3DE', '#E8A9B8', '#5B4B8A', '#2F7A6F', '#F7F5F0'],
  neutro: ['#1E1C1A', '#F7F5F0', '#8A8782', '#243B6B', '#C2362B', '#2F7A4F'],
};

export default function Perfil({ data, actions }) {
  const { profile, streak, wardrobe, looks } = data;
  const [server, setServer] = useState(null);
  const count = displayCount(streak);
  const week = lastSevenDays(streak);

  const worn = wardrobe.filter((w) => w.timesWorn).length;
  const challengeGoal = 5;
  const challenge = Math.min(challengeGoal, worn);

  const badges = [
    { label: 'Primera semana', done: (streak.best ?? 0) >= 7, icon: 'spark' },
    { label: '10 prendas', done: wardrobe.length >= 10, icon: 'hanger' },
    { label: 'Primer look IA', done: looks.length >= 1, icon: 'mirror' },
    { label: 'Racha de 30', done: (streak.best ?? 0) >= 30, icon: 'bolt' },
  ];

  async function test() {
    setServer('…');
    try {
      const r = await pingServer();
      setServer(r.ok ? 'Conectado' + (r.token ? ' (con token HF)' : '') : 'Sin respuesta');
    } catch (e) {
      setServer(e.message);
    }
  }

  return (
    <main className="screen">
      <header className="row" style={{ gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--lilac)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22 }}>
          {profile.photo ? <img src={profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="h2" style={{ fontSize: 24 }}>{profile.name}</h1>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{TONE_LABEL[profile.tone]}</p>
        </div>
      </header>

      <section className="card-lime mt16" aria-label="Racha">
        <p className="eyebrow" style={{ color: 'var(--ink)' }}>Racha actual</p>
        <p style={{ margin: '2px 0 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 84, lineHeight: 0.95, letterSpacing: '-0.04em' }}>{count}</span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{count === 1 ? 'día' : 'días'}</span>
          <span style={{ marginLeft: 'auto' }}><Flame size={40} color="var(--ink)" /></span>
        </p>
        <div className="between mt12">
          {week.map((d) => (
            <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span className={`day-dot ${d.done ? 'done' : ''} ${d.freeze ? 'freeze' : ''} ${d.today ? 'today' : ''}`}>
                {d.done && <Icon name="check" size={16} stroke={3} label="Cumplido" />}
                {d.freeze && <Icon name="snow" size={16} stroke={2.4} label="Congelador" />}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800 }}>{d.letter}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600 }}>
          Congeladores: <b>{streak.freezes}</b> · Mejor racha: <b>{streak.best ?? 0}</b> días
        </p>
      </section>

      <section className="card-ink mt12 on-ink" style={{ borderRadius: 22 }} aria-label="Reto">
        <div className="between">
          <p className="eyebrow">Reto</p>
          <p style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 800 }}>{challenge}/{challengeGoal}</p>
        </div>
        <p style={{ margin: '6px 0 10px', fontWeight: 700, fontSize: 16 }}>Usa {challengeGoal} prendas distintas de tu armario</p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={challengeGoal} aria-valuenow={challenge}>
          <div style={{ width: `${(challenge / challengeGoal) * 100}%` }} />
        </div>
      </section>

      <section className="mt16" aria-label="Insignias">
        <p className="eyebrow" style={{ color: 'var(--ink)' }}>Insignias</p>
        <div className="grid4 mt8" style={{ gap: 8 }}>
          {badges.map((b) => (
            <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: b.done ? 'var(--ink)' : 'transparent', color: b.done ? 'var(--lime)' : 'var(--muted)', border: b.done ? 'none' : '2px dashed var(--muted)' }}>
                <Icon name={b.icon} size={26} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: b.done ? 'var(--ink)' : 'var(--muted)' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt16" aria-label="Tu paleta">
        <div className="between">
          <p className="eyebrow">Colores que te favorecen</p>
        </div>
        <div className="row mt8" style={{ gap: 6 }}>
          {PALETTES[profile.tone].map((c) => (
            <span key={c} style={{ flex: 1, height: 34, borderRadius: 10, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
          ))}
        </div>
      </section>

      <section className="card mt12 stack" style={{ gap: 10 }}>
        <div className="between">
          <span style={{ fontWeight: 700 }}>Servidor del probador</span>
          <button type="button" className="btn btn-ink btn-sm" onClick={test}>Probar conexión</button>
        </div>
        {server && <p className="muted" role="status" style={{ margin: 0, fontSize: 13 }}>{server}</p>}
      </section>
    </main>
  );
}
