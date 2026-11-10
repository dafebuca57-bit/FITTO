import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { COLORS, FITS, TYPES, colorById, colorName, typeById } from '../lib/garments.js';
import { renderGenericGarment } from '../lib/image.js';
import { uid } from '../lib/store.js';

export default function VestidoRapido({ onClose, onAdd }) {
  const [tipo, setTipo] = useState('camisa');
  const [color, setColor] = useState('blanco');
  const [corte, setCorte] = useState('recto');
  const [added, setAdded] = useState(0);

  const t = typeById(tipo);
  const c = colorById(color);
  const f = FITS.find((x) => x.id === corte);
  const cName = colorName(c.id, t.g);
  const name = `${t.label} ${cName}`;
  const preview = useMemo(() => renderGenericGarment(t.d, c.hex, corte), [t, c, corte]);

  function add(close) {
    onAdd({
      id: uid(),
      name,
      category: t.category,
      type: t.id,
      color: c.hex,
      colorName: cName,
      fit: corte,
      image: preview,
      generic: true,
      createdAt: Date.now(),
    });
    setAdded((n) => n + 1);
    if (close) onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Vestido Rápido" onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h2 className="h1" style={{ fontSize: 30, margin: 0 }}>Vestido Rápido<span className="dot">.</span></h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        <p className="muted" style={{ margin: '6px 0 0' }}>
          Agrega una prenda en 3 toques. Sin fotos.{added > 0 && <b style={{ color: 'var(--ink)' }}> +{added} agregadas</b>}
        </p>

        <p className="eyebrow mt16" style={{ color: 'var(--ink)' }}><span className="dot">1</span> ¿Qué es?</p>
        <div className="grid4 mt8">
          {TYPES.map((x) => (
            <button key={x.id} type="button" className="type-btn" aria-pressed={tipo === x.id} onClick={() => setTipo(x.id)}>
              <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
                <path d={x.d} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
              </svg>
              {x.label}
            </button>
          ))}
        </div>

        <p className="eyebrow mt16" style={{ color: 'var(--ink)' }}><span className="dot">2</span> Color</p>
        <div className="mt8" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {COLORS.map((x) => (
            <button key={x.id} type="button" className="swatch" aria-label={x.label} aria-pressed={color === x.id}
              style={{ background: x.hex }} onClick={() => setColor(x.id)} />
          ))}
        </div>

        <p className="eyebrow mt16" style={{ color: 'var(--ink)' }}><span className="dot">3</span> Corte</p>
        <div className="segmented mt8">
          {FITS.map((x) => (
            <button key={x.id} type="button" aria-pressed={corte === x.id} onClick={() => setCorte(x.id)}>{x.label}</button>
          ))}
        </div>

        <div className="card-ink row mt16" style={{ gap: 14, padding: 12, borderRadius: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 18, background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <p className="eyebrow" style={{ color: 'var(--muted-on-ink)' }}>Así quedará</p>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, lineHeight: 1.15 }}>
              {name}, corte {f.label.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="row mt16">
          <button type="button" className="btn btn-lime" style={{ flex: 1 }} onClick={() => add(false)}>Agregar y otra</button>
          <button type="button" className="btn btn-ink" onClick={() => add(true)}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
