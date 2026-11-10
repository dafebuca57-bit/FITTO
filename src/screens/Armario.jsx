import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CATEGORIES, canTryOn } from '../lib/garments.js';
import VestidoRapido from './VestidoRapido.jsx';
import AgregarFoto from './AgregarFoto.jsx';

const MONTH = 30 * 86400000;

export default function Armario({ data, actions }) {
  const { wardrobe } = data;
  const [filter, setFilter] = useState('todo');
  const [sheet, setSheet] = useState(null); // 'rapido' | 'foto' | item
  const shown = filter === 'todo' ? wardrobe : wardrobe.filter((w) => w.category === filter);
  const forgotten = wardrobe.filter((w) => w.lastWorn && Date.now() - w.lastWorn > MONTH).length;
  const generic = wardrobe.filter((w) => w.generic).length;

  return (
    <main className="screen">
      <header>
        <h1 className="h1">Mi armario<span className="dot">.</span></h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>
          {wardrobe.length} {wardrobe.length === 1 ? 'prenda' : 'prendas'} · {generic} rápidas
        </p>
      </header>

      <div className="row mt16">
        <button type="button" className="btn btn-lime" style={{ flex: 1 }} onClick={() => setSheet('rapido')}>
          <Icon name="bolt" size={18} stroke={2.6} /> Vestido Rápido
        </button>
        <button type="button" className="btn btn-ink" style={{ flex: 1 }} onClick={() => setSheet('foto')}>
          <Icon name="camera" size={18} /> Foto
        </button>
      </div>

      <div className="chips mt16" role="group" aria-label="Filtrar por categoría">
        <button type="button" className="chip" aria-pressed={filter === 'todo'} onClick={() => setFilter('todo')}>Todo</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</button>
        ))}
      </div>

      {forgotten > 0 && (
        <div className="card-lilac mt12 row" style={{ gap: 10 }}>
          <Icon name="clock" />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}><b>{forgotten} prendas</b> sin usar hace 30+ días. ¿Las rescatamos?</p>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card mt16 stack" style={{ alignItems: 'center', textAlign: 'center', padding: 28 }}>
          <Icon name="hanger" size={40} />
          <p className="h2">Aquí vivirá tu ropa</p>
          <p className="muted" style={{ margin: 0 }}>Empieza con Vestido Rápido: elige tipo, color y corte en 3 toques.</p>
        </div>
      ) : (
        <div className="grid3 mt16">
          {shown.map((it) => (
            <button key={it.id} type="button" className="tile" onClick={() => setSheet(it)} aria-label={`${it.name}, ver detalles`}>
              <div className={`tile-img ${it.generic ? 'generic' : ''}`}>
                <img src={it.image} alt="" />
                {it.generic && <span className="tag">RÁPIDA</span>}
              </div>
              <span className="tile-label">{it.name}</span>
            </button>
          ))}
        </div>
      )}

      {sheet === 'rapido' && <VestidoRapido onClose={() => setSheet(null)} onAdd={actions.addItem} />}
      {sheet === 'foto' && <AgregarFoto onClose={() => setSheet(null)} onAdd={(it) => { actions.addItem(it); setSheet(null); }} />}
      {sheet && typeof sheet === 'object' && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet.name} onClick={(e) => e.stopPropagation()}>
            <div className="between">
              <h2 className="h2">{sheet.name}</h2>
              <button type="button" className="icon-btn" onClick={() => setSheet(null)} aria-label="Cerrar"><Icon name="close" /></button>
            </div>
            <div className={`tile-img mt12 ${sheet.generic ? 'generic' : ''}`} style={{ aspectRatio: '4 / 3' }}>
              <img src={sheet.image} alt={sheet.name} />
            </div>
            <p className="muted mt12" style={{ margin: '12px 0 0' }}>
              {sheet.timesWorn ? `Usada ${sheet.timesWorn} ${sheet.timesWorn === 1 ? 'vez' : 'veces'}` : 'Aún no la has usado'}
              {sheet.generic ? ' · Prenda rápida' : ''}
            </p>
            <div className="row mt16">
              {canTryOn(sheet) && (
                <button type="button" className="btn btn-lime" style={{ flex: 1 }} onClick={() => { const id = sheet.id; setSheet(null); actions.goProbar(id); }}>
                  <Icon name="mirror" size={18} /> Probármela
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => { actions.removeItem(sheet.id); setSheet(null); actions.toast('Prenda eliminada'); }}>
                <Icon name="trash" size={18} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
