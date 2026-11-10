import { useMemo, useState } from 'react';
import Icon, { Flame } from '../components/Icon.jsx';
import { compliment, suggestOutfit } from '../lib/style.js';
import { displayCount } from '../lib/streak.js';
import { canTryOn } from '../lib/garments.js';

const TILE_BG = ['var(--lilac)', 'var(--sand)', 'var(--lime)'];

export default function Hoy({ data, actions }) {
  const { profile, wardrobe, streak } = data;
  const [variant, setVariant] = useState(0);
  const [worn, setWorn] = useState(false);

  const outfit = useMemo(() => suggestOutfit(wardrobe, profile.tone, variant), [wardrobe, profile.tone, variant]);
  const praise = outfit ? compliment(outfit.score, { colorName: outfit.items[0]?.colorName, tone: profile.tone, seed: variant }) : null;
  const count = displayCount(streak);
  const today = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
  const tryable = outfit?.items.find(canTryOn);

  return (
    <main className="screen">
      <header className="between">
        <span className="wordmark">FITTO<span className="dot">.</span></span>
        <button type="button" className="pill" onClick={() => actions.goTab('perfil')} aria-label={`Racha de ${count} días`}>
          <Flame /> {count} {count === 1 ? 'día' : 'días'}
        </button>
      </header>

      <section className="mt16">
        <p className="eyebrow">{today}</p>
        <h1 className="h1" style={{ fontSize: 38 }}>Hoy te toca<br />brillar, {profile.name}<span className="dot">.</span></h1>
      </section>

      {!outfit ? (
        <section className="card-ink mt16 stack on-ink">
          <p className="eyebrow">Tu look del día</p>
          <p className="h2" style={{ color: 'var(--paper)' }}>Agrega al menos una prenda superior y una inferior (o un vestido) para recibir tu outfit.</p>
          <button type="button" className="btn btn-lime" onClick={() => actions.goTab('armario')}>
            <Icon name="bolt" size={18} /> Llenar mi armario
          </button>
        </section>
      ) : (
        <>
          <article className="card-ink mt16 stack on-ink" style={{ gap: 12 }}>
            <div className="between">
              <p className="eyebrow">Tu look del día</p>
              <span className="badge">{outfit.score}% match</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${outfit.items.length}, minmax(0, 1fr))`, gap: 8 }}>
              {outfit.items.map((it, i) => (
                <div key={it.id} style={{ background: TILE_BG[i % 3], borderRadius: 20, padding: 8, color: 'var(--ink)' }}>
                  <div style={{ aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                    <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: it.generic ? 'contain' : 'cover' }} />
                  </div>
                  <p style={{ margin: '6px 2px 0', fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>{it.name}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.35 }}>
              <strong style={{ color: 'var(--lime)' }}>{praise.title}.</strong> {praise.text}
            </p>
          </article>

          <div className="row mt12">
            <button type="button" className="btn btn-lime" style={{ flex: 1 }} disabled={worn}
              onClick={() => { actions.wear(outfit.items.map((x) => x.id)); setWorn(true); }}>
              {worn ? <><Icon name="check" size={18} stroke={3} /> Listo</> : 'Lo uso'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setVariant((v) => v + 1); setWorn(false); }}>
              Otra opción
            </button>
          </div>
          {tryable && (
            <button type="button" className="btn btn-ink btn-block mt8" onClick={() => actions.goProbar(tryable.id)}>
              <Icon name="mirror" size={18} /> Pruébatelo en tu foto
            </button>
          )}
        </>
      )}

      <section className="card-lilac mt16 row" style={{ gap: 10 }}>
        <Icon name="clock" />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
          {wardrobe.length
            ? <>Tienes <b>{wardrobe.length} prendas</b>. Cada look que uses suma a tu racha.</>
            : <>Con <b>Vestido Rápido</b> agregas tu ropa en 3 toques, sin fotos.</>}
        </p>
      </section>
    </main>
  );
}
