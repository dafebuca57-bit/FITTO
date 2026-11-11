// Conserva tu cara, cabello, cuerpo y fondo originales: de la imagen generada por la IA
// solo se toma la zona de la prenda (la "máscara" que devuelve el modelo).
//
// El modelo (IDM-VTON) recorta tu foto al centro en proporción 3:4, la escala a 768x1024,
// genera ahí y pega el resultado de vuelta. Su máscara viene en esas coordenadas del recorte:
// dentro de la zona de la prenda los píxeles son gris neutro (128); fuera, son tu foto.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const near = (d, i, tol) => Math.abs(d[i] - 128) <= tol && Math.abs(d[i + 1] - 128) <= tol && Math.abs(d[i + 2] - 128) <= tol;
const dist = (a, b, i) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);

// Desenfoca el canal alfa y lo vuelve binario con un umbral: sirve para dilatar, erosionar y rellenar huecos.
function blurThreshold(src, w, h, radius, threshold) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = 'none';
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= threshold ? 255 : 0;
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function keepOriginalOutsideGarment(originalUrl, generatedUrl, maskUrl) {
  const [orig, gen, mask] = await Promise.all([loadImage(originalUrl), loadImage(generatedUrl), loadImage(maskUrl)]);
  const W = orig.naturalWidth, H = orig.naturalHeight;
  if (gen.naturalWidth !== W || gen.naturalHeight !== H) return generatedUrl; // geometría inesperada: no tocar

  // Mismo recorte central 3:4 que hace el modelo.
  const tw = Math.floor(Math.min(W, (H * 3) / 4));
  const th = Math.floor(Math.min(H, (W * 4) / 3));
  const left = Math.floor((W - tw) / 2);
  const top = Math.floor((H - th) / 2);

  // Calcula la máscara a resolución reducida (rápido) y luego la escala con bordes suaves.
  const sw = 240, sh = 320;
  const sample = (img, sx, sy, sWidth, sHeight) => {
    const c = canvas(sw, sh);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sw, sh);
    return ctx.getImageData(0, 0, sw, sh).data;
  };
  const O = sample(orig, left, top, tw, th);
  const G = sample(gen, left, top, tw, th);
  const M = sample(mask, 0, 0, mask.naturalWidth, mask.naturalHeight);

  const TOL = 14;
  const N = sw * sh;
  // Seguro dentro: la máscara es gris pero tu foto ahí no lo era.
  const def = new Uint8Array(N);
  for (let p = 0, i = 0; p < N; p++, i += 4) if (near(M, i, TOL) && !near(O, i, TOL)) def[p] = 1;

  // Erosión: quita las líneas finas (1–2 px) que salen en los bordes por desalineación de píxeles,
  // para ubicar dónde empieza de verdad la prenda.
  let core = def;
  for (let k = 0; k < 1; k++) {
    const next = new Uint8Array(N);
    for (let y = 1; y < sh - 1; y++)
      for (let x = 1; x < sw - 1; x++) {
        const p = y * sw + x;
        next[p] = core[p] & core[p - 1] & core[p + 1] & core[p - sw] & core[p + sw];
      }
    core = next;
  }
  let topDef = -1;
  for (let y = 0; y < sh && topDef < 0; y++) {
    let n = 0;
    for (let x = 0; x < sw; x++) n += core[y * sw + x];
    if (n >= sw * 0.04) topDef = y;
  }
  // Ambiguo: tu foto ya era gris ahí (camisa o pared gris). Cuenta solo si la IA lo cambió de verdad
  // (si no, da igual de qué imagen tomarlo) y solo desde donde empieza la prenda: protege cabello y canas.
  const minY = topDef >= 0 ? topDef - 4 : 0;

  const raw = canvas(sw, sh);
  const rctx = raw.getContext('2d');
  const md = rctx.createImageData(sw, sh);
  let count = 0;
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const inside = def[p] || (near(M, i, TOL) && dist(G, O, i) > 45 && Math.floor(p / sw) >= minY);
    if (inside) count++;
    md.data[i + 3] = inside ? 255 : 0;
  }
  if (count < N * 0.01) return generatedUrl; // no se reconoció la máscara
  rctx.putImageData(md, 0, 0);

  // Cierre morfológico (rellena huecos), un poco de margen y borde suave.
  const closed = blurThreshold(blurThreshold(raw, sw, sh, 2, 70), sw, sh, 2, 185);
  const grown = blurThreshold(closed, sw, sh, 1.5, 90);
  const soft = canvas(sw, sh);
  const sctx = soft.getContext('2d');
  sctx.filter = 'blur(1.5px)';
  sctx.drawImage(grown, 0, 0);

  // Resultado: tu foto original + la prenda generada encima, solo dentro de la máscara.
  const layer = canvas(W, H);
  const lctx = layer.getContext('2d');
  lctx.drawImage(gen, 0, 0);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(soft, 0, 0, sw, sh, left, top, tw, th);

  const out = canvas(W, H);
  const octx = out.getContext('2d');
  octx.drawImage(orig, 0, 0);
  octx.drawImage(layer, 0, 0);
  return out.toDataURL('image/jpeg', 0.92);
}
