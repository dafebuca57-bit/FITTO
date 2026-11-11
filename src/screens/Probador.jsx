import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { canTryOn, englishDescription } from '../lib/garments.js';
import { keepOriginalOutsideGarment } from '../lib/composite.js';
import { takePhoto } from '../lib/image.js';
import { compliment, outfitScore } from '../lib/style.js';
import { tryOn } from '../lib/tryon.js';
import { uid } from '../lib/store.js';

// Para una sola prenda, el puntaje depende de qué tan bien va su color con tu subtono.
function garmentScore(item, tone, wardrobe) {
  const bottom = wardrobe.find((w) => w.category === 'inferior');
  const colors = item.category === 'vestido' || !bottom ? [item.color] : [item.color, bottom.color];
  return outfitScore(colors, tone);
}

export default function Probador({ data, actions, initialItemId }) {
  const { profile, wardrobe, looks } = data;
  const items = wardrobe.filter(canTryOn);
  const [selId, setSelId] = useState(initialItemId ?? items[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef();

  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => { if (initialItemId) setSelId(initialItemId); }, [initialItemId]);

  const sel = items.find((i) => i.id === selId) ?? null;

  async function newPhoto(gallery) {
    try {
      const photo = await takePhoto(gallery);
      actions.setProfile({ ...profile, photo });
      setResult(null);
    } catch (e) {
      if (!String(e?.message).toLowerCase().includes('cancel')) setError('No se pudo obtener la foto.');
    }
  }

  async function run() {
    if (!sel || !profile.photo) return;
    setError('');
    setBusy(true);
    setResult(null);
    setElapsed(0);
    const start = Date.now();
    timer.current = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    try {
      const raw = await tryOn(profile.photo, sel.image, englishDescription(sel, profile.body));
      // Conserva tu cara, cabello y fondo: de la IA solo se usa la zona de la prenda.
      let image = raw.image;
      if (raw.mask) {
        try {
          image = await keepOriginalOutsideGarment(profile.photo, raw.image, raw.mask);
        } catch {
          image = raw.image;
        }
      }
      const score = garmentScore(sel, profile.tone, wardrobe);
      const praise = compliment(score, { colorName: sel.colorName, tone: profile.tone, seed: Date.now() % 7 });
      const look = { id: uid(), itemId: sel.id, itemName: sel.name, image, score, praise, createdAt: Date.now() };
      setResult(look);
      setShowOriginal(false);
      actions.addLook(look);
    } catch (e) {
      setError(e.message || 'Algo salió mal. Intenta de nuevo.');
    } finally {
      clearInterval(timer.current);
      setBusy(false);
    }
  }

  const shown = result && !showOriginal ? result.image : profile.photo;

  return (
    <main className="screen dark">
      <header className="between">
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>Probador<span className="dot">.</span></h1>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => newPhoto(false)}>
            <Icon name="camera" size={16} /> Nueva foto
          </button>
          <button type="button" className="icon-btn" style={{ background: 'var(--ink-2)', color: 'var(--paper)' }} onClick={() => newPhoto(true)} aria-label="Elegir foto de la galería">
            <Icon name="image" size={18} />
          </button>
        </div>
      </header>

      <section className="photo-frame mt16" aria-label="Tu foto">
        {shown ? (
          <img src={shown} alt={result && !showOriginal ? `Tú con ${result.itemName}` : 'Tu foto'} />
        ) : (
          <div className="photo-empty" style={{ height: '100%' }}>
            <Icon name="camera" size={44} />
            <p style={{ margin: 0, fontWeight: 700 }}>Tómate una foto de frente con buena luz para empezar.</p>
            <button type="button" className="btn btn-lime" onClick={() => newPhoto(false)}>Tomar foto</button>
          </div>
        )}
        {result && !busy && (
          <div className="score-ring" aria-label={`${result.score}% de match`}>
            <b>{result.score}%</b>
            <span>match</span>
          </div>
        )}
        {result && !busy && (
          <button type="button" className="btn btn-soft btn-sm" style={{ position: 'absolute', left: 12, bottom: 12 }}
            onClick={() => setShowOriginal((v) => !v)} aria-pressed={showOriginal}>
            {showOriginal ? 'Ver con outfit' : 'Ver original'}
          </button>
        )}
        {busy && (
          <div className="loader" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20 }}>Vistiéndote…</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-on-ink)' }}>
              {elapsed}s · El modelo gratuito puede tardar hasta 1–2 minutos.
            </p>
          </div>
        )}
      </section>

      {result && !busy && (
        <div className="card-lime mt12" role="status" style={{ borderRadius: 20, padding: '12px 14px' }}>
          <p style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17 }}>{result.praise.title}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.35, fontWeight: 500 }}>{result.praise.text}</p>
        </div>
      )}
      {error && <div className="error-box mt12" role="alert">{error}</div>}

      <section className="mt16" aria-label="Elige qué probarte">
        <p className="eyebrow">Elige qué probarte</p>
        {items.length === 0 ? (
          <div className="mt8" style={{ background: 'var(--ink-2)', borderRadius: 18, padding: 14 }}>
            <p style={{ margin: 0, fontSize: 14 }}>Agrega una prenda superior o un vestido a tu armario para probártela.</p>
            <button type="button" className="btn btn-lime btn-sm mt12" onClick={() => actions.goTab('armario')}>Ir al armario</button>
          </div>
        ) : (
          <div className="chips mt8" style={{ gap: 8 }}>
            {items.map((it) => (
              <button key={it.id} type="button" onClick={() => setSelId(it.id)} aria-pressed={it.id === selId} aria-label={it.name}
                style={{ flex: '0 0 76px', height: 92, borderRadius: 16, padding: 4, background: '#fff', border: it.id === selId ? '3px solid var(--lime)' : '3px solid transparent' }}>
                <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: it.generic ? 'contain' : 'cover', borderRadius: 11 }} />
              </button>
            ))}
          </div>
        )}
        {sel && sel.category === 'vestido' && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted-on-ink)' }}>Los vestidos son experimentales: el modelo gratuito funciona mejor con prendas superiores.</p>
        )}
      </section>

      <div className="between mt16" style={{ gap: 12 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Tu cuerpo</p>
        <div className="segmented" role="group" aria-label="Tipo de cuerpo para el probador" style={{ background: 'var(--ink-2)', flex: 1, maxWidth: 240 }}>
          {[{ id: 'hombre', label: 'Hombre' }, { id: 'mujer', label: 'Mujer' }].map((b) => (
            <button key={b.id} type="button" aria-pressed={profile.body === b.id}
              style={profile.body === b.id ? { background: 'var(--lime)', color: 'var(--ink)' } : { color: 'var(--paper)' }}
              onClick={() => actions.setProfile({ ...profile, body: b.id })}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-lime btn-block mt12" disabled={!sel || !profile.photo || busy || !profile.body} onClick={run}>
        <Icon name="spark" size={18} /> {busy ? 'Generando…' : !profile.body ? 'Elige tu tipo de cuerpo' : result ? 'Probar otra vez' : `Probarme ${sel ? sel.name.toLowerCase() : 'esta prenda'}`}
      </button>

      {looks.length > 0 && (
        <section className="mt24" aria-label="Tus looks guardados">
          <p className="eyebrow">Tus looks</p>
          <div className="chips mt8" style={{ gap: 8 }}>
            {looks.map((l) => (
              <button key={l.id} type="button" onClick={() => { setResult(l); setShowOriginal(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                aria-label={`Look con ${l.itemName}, ${l.score}%`}
                style={{ flex: '0 0 76px', height: 100, borderRadius: 16, padding: 0, overflow: 'hidden', border: 'none', background: 'var(--ink-2)' }}>
                <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
