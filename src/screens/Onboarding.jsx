import { useState } from 'react';
import { takePhoto } from '../lib/image.js';
import Icon from '../components/Icon.jsx';

const TONES = [
  { id: 'calido', label: 'Verdosas', hint: 'Subtono cálido' },
  { id: 'frio', label: 'Azuladas', hint: 'Subtono frío' },
  { id: 'neutro', label: 'No sé / ambas', hint: 'Subtono neutro' },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [tone, setTone] = useState('neutro');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');

  async function shoot(gallery) {
    setError('');
    try {
      setPhoto(await takePhoto(gallery));
    } catch (e) {
      if (!String(e?.message).toLowerCase().includes('cancel')) setError('No se pudo obtener la foto. Revisa el permiso de cámara.');
    }
  }

  const finish = () => onDone({ name: name.trim() || 'tú', tone, photo, createdAt: Date.now() });

  return (
    <main className="screen" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
      <div className="between">
        <span className="wordmark">FITTO<span className="dot">.</span></span>
        <span className="eyebrow">{step + 1} / 3</span>
      </div>

      {step === 0 && (
        <section className="stack mt24" style={{ flex: 1 }}>
          <h1 className="h1" style={{ fontSize: 44 }}>Tu armario,<br />tu estilo<span className="dot">.</span></h1>
          <p className="muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>
            Organiza tu ropa en segundos, recibe outfits para cada día y pruébatelos sobre tu propia foto.
          </p>
          <div className="field mt16">
            <label htmlFor="name">¿Cómo te llamas?</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="given-name" />
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-lime btn-block" onClick={() => setStep(1)}>Continuar</button>
        </section>
      )}

      {step === 1 && (
        <section className="stack mt24" style={{ flex: 1 }}>
          <h1 className="h1">Mira las venas de tu muñeca<span className="dot">.</span></h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>
            Nos ayuda a saber qué colores te favorecen para darte mejores recomendaciones.
          </p>
          <div className="stack mt8" role="radiogroup" aria-label="Color de tus venas">
            {TONES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tone === t.id}
                className="card between" onClick={() => setTone(t.id)}
                style={{ border: tone === t.id ? '2.5px solid var(--ink)' : '2.5px solid transparent', minHeight: 64, textAlign: 'left' }}>
                <span>
                  <b style={{ fontSize: 16 }}>{t.label}</b>
                  <br />
                  <span className="muted" style={{ fontSize: 13 }}>{t.hint}</span>
                </span>
                {tone === t.id && <Icon name="check" stroke={3} />}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Atrás</button>
            <button type="button" className="btn btn-lime" style={{ flex: 1 }} onClick={() => setStep(2)}>Continuar</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="stack mt24" style={{ flex: 1 }}>
          <h1 className="h1">Tu foto para el probador<span className="dot">.</span></h1>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
            De frente, de la cabeza a la cintura o cuerpo completo, con buena luz y fondo simple. Se guarda solo en tu teléfono.
          </p>
          <div className="photo-frame" style={{ maxHeight: '46vh', aspectRatio: 'auto', height: '46vh' }}>
            {photo ? (
              <img src={photo} alt="Tu foto" />
            ) : (
              <div className="photo-empty" style={{ height: '100%' }}>
                <Icon name="camera" size={40} />
                <span style={{ fontWeight: 700 }}>Aún no hay foto</span>
              </div>
            )}
          </div>
          {error && <div className="error-box" role="alert">{error}</div>}
          <div className="row">
            <button type="button" className="btn btn-ink" style={{ flex: 1 }} onClick={() => shoot(false)}>
              <Icon name="camera" size={18} /> {photo ? 'Repetir' : 'Tomar foto'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => shoot(true)} aria-label="Elegir de la galería">
              <Icon name="image" size={18} />
            </button>
          </div>
          <button type="button" className="btn btn-lime btn-block" onClick={finish}>
            {photo ? 'Empezar' : 'Hacerlo después'}
          </button>
        </section>
      )}
    </main>
  );
}
