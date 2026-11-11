import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { takePhoto } from '../lib/image.js';

// Cámara guiada: muestra una silueta para que te coloques bien antes de la foto del probador.
// La foto sale en el mismo cuadro 3:4 (768x1024) que usa la IA, así lo que ves es lo que se envía.

const OUT_W = 768;
const OUT_H = 1024;

// Siluetas en un lienzo de 300x400 (mismo 3:4 que la foto).
const SILHOUETTES = {
  medio: {
    label: 'Medio cuerpo',
    hint: 'Cabeza dentro del óvalo, hombros en la línea y brazos abajo.',
    head: { cx: 150, cy: 92, rx: 40, ry: 50 },
    body:
      'M128 138 L128 156 Q78 164 62 184 Q52 196 50 214 L42 300 L38 398 L66 398 L70 306 L80 236 L84 398 L216 398 L220 236 L230 306 L234 398 L262 398 L258 300 L250 214 Q248 196 238 184 Q222 164 172 156 L172 138 Z',
    shoulderY: 172,
  },
  completo: {
    label: 'Cuerpo completo',
    hint: 'Aléjate hasta que tus pies queden en la base. Ideal para pantalones y vestidos.',
    head: { cx: 150, cy: 48, rx: 22, ry: 28 },
    body:
      'M139 74 L139 86 Q110 90 100 100 Q94 106 92 118 L84 190 L80 248 L95 248 L100 192 L106 146 L106 232 L110 392 L143 392 L147 252 L153 252 L157 392 L190 392 L194 232 L194 146 L200 192 L205 248 L220 248 L216 190 L208 118 Q206 106 200 100 Q190 90 161 86 L161 74 Z',
    shoulderY: 98,
  },
};

const TIMERS = [0, 3, 10];

function brightness(canvas) {
  const s = document.createElement('canvas');
  s.width = 48;
  s.height = 64;
  const ctx = s.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, 48, 64);
  const d = ctx.getImageData(0, 0, 48, 64).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return sum / (d.length / 4);
}

export default function Camara({ onClose, onPhoto, initialMode = 'medio' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const tickRef = useRef(null);
  const [facing, setFacing] = useState('user');
  const [mode, setMode] = useState(initialMode);
  const [timer, setTimer] = useState(3);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState(null); // { url, warn }

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setReady(false);
      setError('');
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
        setReady(true);
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Fitto no tiene permiso para usar la cámara. Actívalo en los ajustes del teléfono o usa la cámara del sistema.'
            : 'No se pudo abrir la cámara. Puedes usar la cámara del sistema o una foto de la galería.',
        );
      }
    }
    if (!shot) start();
    return () => {
      cancelled = true;
    };
  }, [facing, shot]);

  useEffect(
    () => () => {
      clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = OUT_W;
    c.height = OUT_H;
    const ctx = c.getContext('2d');
    // Mismo recorte "cover" que ve la persona en pantalla.
    const scale = Math.max(OUT_W / v.videoWidth, OUT_H / v.videoHeight);
    const w = v.videoWidth * scale;
    const h = v.videoHeight * scale;
    ctx.drawImage(v, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
    const b = brightness(c);
    const warn = b < 70 ? 'La foto salió oscura. Busca más luz (de frente, no detrás de ti).' : b > 215 ? 'La foto salió muy clara. Evita la luz directa.' : '';
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setShot({ url: c.toDataURL('image/jpeg', 0.9), warn });
  }

  function shoot() {
    if (!ready || count > 0) return;
    if (!timer) return capture();
    let n = timer;
    setCount(n);
    tickRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(tickRef.current);
        setCount(0);
        capture();
      } else setCount(n);
    }, 1000);
  }

  async function systemCamera(gallery) {
    try {
      const url = await takePhoto(gallery);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onPhoto(url);
    } catch (e) {
      if (!String(e?.message).toLowerCase().includes('cancel')) setError('No se pudo obtener la foto.');
    }
  }

  const sil = SILHOUETTES[mode];

  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label="Cámara guiada">
      <div className="cam-top">
        <button type="button" className="icon-btn cam-icon" onClick={onClose} aria-label="Cerrar cámara"><Icon name="close" /></button>
        <div className="segmented cam-seg" role="group" aria-label="Tipo de foto">
          {Object.entries(SILHOUETTES).map(([id, s]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="cam-frame">
        {shot ? (
          <img src={shot.url} alt="Tu foto" />
        ) : (
          <>
            <video ref={videoRef} playsInline muted style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
            <svg className="cam-overlay" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <mask id="cut">
                  <rect width="300" height="400" fill="white" />
                  <ellipse {...sil.head} fill="black" />
                  <path d={sil.body} fill="black" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="rgba(22,19,15,0.5)" mask="url(#cut)" />
              <ellipse {...sil.head} fill="none" stroke="#C6F432" strokeWidth="2.2" strokeDasharray="6 5" />
              <path d={sil.body} fill="none" stroke="#C6F432" strokeWidth="2.2" strokeDasharray="6 5" strokeLinejoin="round" />
              <line x1="20" x2="280" y1={sil.shoulderY} y2={sil.shoulderY} stroke="rgba(198,244,50,0.45)" strokeWidth="1" />
            </svg>
            {count > 0 && <div className="cam-count" aria-live="assertive">{count}</div>}
            {!ready && !error && <div className="cam-msg">Abriendo cámara…</div>}
          </>
        )}
      </div>

      {error && <div className="error-box cam-error" role="alert">{error}</div>}

      {shot ? (
        <div className="cam-bottom stack">
          {shot.warn ? (
            <p className="cam-hint" style={{ color: '#FFD9A8' }} role="status">{shot.warn}</p>
          ) : (
            <p className="cam-hint" role="status">¿Quedaste dentro de la silueta? Si sí, ¡perfecto!</p>
          )}
          <div className="row">
            <button type="button" className="btn btn-ghost cam-ghost" style={{ flex: 1 }} onClick={() => setShot(null)}>
              <Icon name="refresh" size={18} /> Repetir
            </button>
            <button type="button" className="btn btn-lime" style={{ flex: 1 }} onClick={() => onPhoto(shot.url)}>
              <Icon name="check" size={18} stroke={3} /> Usar foto
            </button>
          </div>
        </div>
      ) : (
        <div className="cam-bottom stack">
          <p className="cam-hint">{sil.hint} De frente, con buena luz y fondo simple.</p>
          <div className="between">
            <div className="segmented cam-seg" role="group" aria-label="Temporizador" style={{ width: 150 }}>
              {TIMERS.map((t) => (
                <button key={t} type="button" aria-pressed={timer === t} onClick={() => setTimer(t)} aria-label={t ? `Temporizador ${t} segundos` : 'Sin temporizador'}>
                  {t ? `${t}s` : 'Ya'}
                </button>
              ))}
            </div>
            <button type="button" className="cam-shutter" onClick={shoot} disabled={!ready || count > 0} aria-label="Tomar foto" />
            <button type="button" className="icon-btn cam-icon" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Cambiar cámara">
              <Icon name="refresh" />
            </button>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
            <button type="button" className="cam-link" onClick={() => systemCamera(true)}>Elegir de la galería</button>
            {error && <button type="button" className="cam-link" onClick={() => systemCamera(false)}>Cámara del sistema</button>}
          </div>
        </div>
      )}
    </div>
  );
}
