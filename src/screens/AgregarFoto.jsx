import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TYPES, typeById } from '../lib/garments.js';
import { dominantColor, takePhoto } from '../lib/image.js';
import { uid } from '../lib/store.js';

export default function AgregarFoto({ onClose, onAdd }) {
  const [image, setImage] = useState(null);
  const [color, setColor] = useState('#888888');
  const [tipo, setTipo] = useState('camisa');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function shoot(gallery) {
    setError('');
    try {
      const img = await takePhoto(gallery);
      setImage(img);
      setColor(await dominantColor(img));
    } catch (e) {
      if (!String(e?.message).toLowerCase().includes('cancel')) setError('No se pudo obtener la foto. Revisa el permiso de cámara.');
    }
  }

  function save() {
    const t = typeById(tipo);
    onAdd({
      id: uid(),
      name: name.trim() || `Mi ${t.label.toLowerCase()}`,
      category: t.category,
      type: t.id,
      color,
      colorName: '',
      image,
      generic: false,
      createdAt: Date.now(),
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Agregar con foto" onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h2 className="h1" style={{ fontSize: 30, margin: 0 }}>Con foto<span className="dot">.</span></h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        <p className="muted" style={{ margin: '6px 0 0' }}>Extiende la prenda sobre una superficie lisa y tómale la foto de frente. Es lo que mejor funciona en el probador.</p>

        <div className="tile-img mt12" style={{ aspectRatio: '4 / 3', background: 'var(--sand)' }}>
          {image ? <img src={image} alt="Prenda" /> : <Icon name="camera" size={40} />}
        </div>
        {error && <div className="error-box mt8" role="alert">{error}</div>}
        <div className="row mt12">
          <button type="button" className="btn btn-ink" style={{ flex: 1 }} onClick={() => shoot(false)}>
            <Icon name="camera" size={18} /> {image ? 'Repetir' : 'Tomar foto'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => shoot(true)} aria-label="Elegir de la galería"><Icon name="image" size={18} /></button>
        </div>

        {image && (
          <>
            <p className="eyebrow mt16" style={{ color: 'var(--ink)' }}>¿Qué es?</p>
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
            <div className="field mt16">
              <label htmlFor="garment-name">Nombre (opcional)</label>
              <input id="garment-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Camisa de lino" />
            </div>
            <div className="row mt12" style={{ gap: 10 }}>
              <span className="swatch" style={{ background: color, display: 'inline-block' }} aria-hidden="true" />
              <span className="muted" style={{ fontSize: 13 }}>Color detectado automáticamente</span>
            </div>
            <button type="button" className="btn btn-lime btn-block mt16" onClick={save}>Guardar prenda</button>
          </>
        )}
      </div>
    </div>
  );
}
