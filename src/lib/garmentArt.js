// Dibuja prendas "Vestido Rápido" con aspecto de foto de producto (flat lay):
// silueta realista, costuras, cuello, bastas, textura de tela, pliegues y sombra.
// La IA del probador copia la imagen de la prenda, así que mientras más real se vea, mejor el resultado.
//
// Coordenadas de diseño: 100 de ancho x 130 de alto, centradas en un lienzo de 768x1024.

const W = 768, H = 1024, S = 7.0;
const OX = (W - 100 * S) / 2, OY = (H - 130 * S) / 2;

const DENIM = new Set(['jeans', 'short']);

const SHAPES = {
  camiseta: {
    body: 'M35 10 Q50 19 65 10 L81 15 Q89 19 97 38 L84 47 L77 39 L77 124 Q50 127 23 124 L23 39 L16 47 L3 38 Q11 19 19 15 Z',
    lines: ['M37 12.5 Q50 22 63 12.5', 'M94.5 36.5 L82.6 44.6', 'M5.5 36.5 L17.4 44.6', 'M23 120.5 Q50 123.5 77 120.5', 'M19 15 Q22 27 23 39', 'M81 15 Q78 27 77 39'],
    folds: [['M36 60 Q34 90 37 120', 0.12], ['M62 58 Q65 90 62 120', 0.1], ['M77 42 Q72 50 66 56', 0.14], ['M23 42 Q28 50 34 56', 0.14]],
    lights: [['M48 40 Q46 80 49 118', 0.1]],
  },
  camisa: {
    body: 'M38 8 L44 6 L50 12 L56 6 L62 8 L80 14 Q86 17 88 26 L97 112 L86 114 L77 46 L77 126 Q50 128 23 126 L23 46 L14 114 L3 112 L12 26 Q14 17 20 14 Z',
    patches: ['M38 8 L50 13 L42 23 Z', 'M62 8 L50 13 L58 23 Z'],
    lines: ['M38 8 L50 13 L42 23 Z', 'M62 8 L50 13 L58 23 Z', 'M44 6 Q50 9 56 6', 'M47.5 22 L47.5 126', 'M52.5 22 L52.5 126', 'M3.9 104 L14.9 106', 'M96.1 104 L85.1 106', 'M58 34 L70 34 L70 48 Q64 50 58 48 Z', 'M20 14 Q22 30 23 46', 'M80 14 Q78 30 77 46', 'M23 122 Q50 124.5 77 122'],
    buttons: [[50, 28], [50, 42], [50, 56], [50, 70], [50, 84], [50, 98], [50, 112]],
    folds: [['M8 60 Q12 66 16 70', 0.14], ['M92 60 Q88 66 84 70', 0.14], ['M34 60 Q32 92 35 122', 0.1], ['M66 60 Q68 92 65 122', 0.1], ['M77 50 Q70 58 64 62', 0.12]],
    lights: [['M40 30 Q38 80 41 120', 0.1], ['M7 40 Q6 70 8 100', 0.08]],
  },
  sueter: {
    body: 'M36 9 Q50 16 64 9 L80 14 Q87 17 89 26 L97 112 L85 115 L77 48 L77 124 Q50 127 23 124 L23 48 L15 115 L3 112 L11 26 Q13 17 20 14 Z',
    lines: ['M37.5 12 Q50 20.5 62.5 12', 'M23 115 Q50 118 77 115', 'M4.2 103 L15.9 106', 'M95.8 103 L84.1 106', 'M20 14 Q22 30 23 48', 'M80 14 Q78 30 77 48'],
    ribs: [{ from: [23, 116], to: [77, 116], h: 8, step: 1.6 }, { from: [4.2, 104], to: [15.4, 107], h: 8, step: 1.4 }, { from: [84.6, 107], to: [95.8, 104], h: 8, step: 1.4 }],
    folds: [['M9 58 Q13 64 17 70', 0.16], ['M91 58 Q87 64 83 70', 0.16], ['M35 60 Q33 90 36 114', 0.12], ['M65 60 Q67 90 64 114', 0.12], ['M77 52 Q70 58 64 62', 0.12], ['M23 52 Q30 58 36 62', 0.12]],
    lights: [['M48 30 Q47 70 49 110', 0.1]],
  },
  chaqueta: {
    body: 'M37 7 L44 4 L56 4 L63 7 L81 13 Q88 16 90 26 L97 114 L85 116 L78 48 L78 126 Q50 128 22 126 L22 48 L15 116 L3 114 L10 26 Q12 16 19 13 Z',
    lines: ['M44 4 L44 12 Q50 15 56 12 L56 4', 'M50 14 L50 126', 'M28 90 L37 80', 'M72 90 L63 80', 'M22 119 Q50 121 78 119', 'M4 105 L15.8 108', 'M96 105 L84.2 108', 'M19 13 Q21 30 22 48', 'M81 13 Q79 30 78 48', 'M30 30 Q40 28 46 30', 'M70 30 Q60 28 54 30'],
    zipper: 'M50 14 L50 125',
    folds: [['M9 58 Q13 64 17 70', 0.16], ['M91 58 Q87 64 83 70', 0.16], ['M33 50 Q31 90 34 118', 0.12], ['M67 50 Q69 90 66 118', 0.12]],
    lights: [['M42 20 Q40 70 43 116', 0.1], ['M58 20 Q60 70 57 116', 0.06]],
  },
  jeans: {
    body: 'M24 4 L76 4 L78 14 L84 126 L58 126 L51 40 L49 40 L42 126 L16 126 L22 14 Z',
    lines: ['M23.4 10 L76.6 10', 'M50 10 L50 34 Q49.5 38 46 39', 'M23.3 14 Q33 15 35 25', 'M76.7 14 Q67 15 65 25', 'M17 121 L41.5 121', 'M58.5 121 L83 121'],
    stitches: ['M53.5 10.5 L53.5 31 Q53.5 36.5 49.5 39', 'M23.4 16 Q32 17 33.5 25', 'M76.6 16 Q68 17 66.5 25', 'M24 7.2 L76 7.2', 'M17 123 L41.8 123', 'M58.2 123 L83 123', 'M70 15 L74.5 15 L74.5 21 L70 21'],
    loops: [28, 40, 60, 72],
    buttons: [[50, 7]],
    folds: [['M24 80 Q30 82 38 80', 0.14], ['M62 80 Q70 82 78 80', 0.14], ['M44 42 Q40 48 36 50', 0.12], ['M56 42 Q60 48 64 50', 0.12], ['M30 30 Q29 70 30 118', 0.08], ['M70 30 Q71 70 70 118', 0.08]],
    lights: [['M33 36 Q34 70 32 110', 0.12], ['M67 36 Q66 70 68 110', 0.12]],
  },
  pantalon: {
    body: 'M24 4 L76 4 L78 14 L83 126 L58 126 L51 38 L49 38 L42 126 L17 126 L22 14 Z',
    lines: ['M23.4 10 L76.6 10', 'M50 10 L50 32 Q49 36 46 37', 'M24 12 L32 26', 'M76 12 L68 26', 'M17.3 122 L41.6 122', 'M58.4 122 L82.7 122'],
    loops: [28, 40, 60, 72],
    buttons: [[50, 7]],
    folds: [['M44 40 Q40 46 36 48', 0.12], ['M56 40 Q60 46 64 48', 0.12], ['M22 96 Q30 98 40 96', 0.08], ['M60 96 Q70 98 80 96', 0.08]],
    lights: [['M30 22 L29.5 120', 0.14], ['M70 22 L70.5 120', 0.14]],
  },
  falda: {
    body: 'M30 8 L70 8 L71 16 L88 116 Q50 124 12 116 L29 16 Z',
    lines: ['M29.2 16 L70.8 16', 'M13 112 Q50 120 87 112'],
    folds: [['M38 18 Q34 70 26 118', 0.14], ['M46 18 Q45 70 42 120', 0.1], ['M55 18 Q56 70 59 120', 0.1], ['M63 18 Q67 70 75 118', 0.14]],
    lights: [['M42 20 Q40 70 34 118', 0.1], ['M59 20 Q61 70 67 118', 0.1]],
  },
  short: {
    body: 'M23 8 L77 8 L79 18 L86 78 L57 80 L51 46 L49 46 L43 80 L14 78 L21 18 Z',
    lines: ['M22.4 14 L77.6 14', 'M50 14 L50 36 Q49.5 40 46 41', 'M22 18 Q32 19 34 29', 'M78 18 Q68 19 66 29', 'M14.4 73 L43.5 75', 'M56.5 75 L85.6 73'],
    stitches: ['M53.5 14.5 L53.5 33 Q53.5 38.5 49.5 41', 'M23 11 L77 11', 'M14.6 75.2 L43.2 77.2', 'M56.8 77.2 L85.4 75.2'],
    loops: [28, 40, 60, 72],
    buttons: [[50, 11]],
    folds: [['M44 46 Q40 52 34 54', 0.12], ['M56 46 Q60 52 66 54', 0.12]],
    lights: [['M30 30 Q30 50 28 70', 0.12], ['M70 30 Q70 50 72 70', 0.12]],
  },
  vestido: {
    body: 'M38 6 L44 6 Q50 14 56 6 L62 6 L66 16 Q70 26 68 40 L66 50 L88 124 Q50 130 12 124 L34 50 L32 40 Q30 26 34 16 Z',
    lines: ['M33 50 Q50 52.5 67 50', 'M44 6 Q50 14 56 6', 'M13 120 Q50 126 87 120', 'M38 6 Q36 12 34 16', 'M62 6 Q64 12 66 16'],
    folds: [['M40 54 Q34 90 24 122', 0.14], ['M47 54 Q46 90 42 125', 0.1], ['M54 54 Q55 90 59 125', 0.1], ['M60 54 Q66 90 76 122', 0.14], ['M40 22 Q42 34 41 46', 0.08]],
    lights: [['M43 56 Q40 90 33 122', 0.1], ['M57 56 Q60 90 67 122', 0.1]],
  },
  tenis: {
    body: 'M8 82 Q8 66 20 64 L40 64 Q52 56 62 52 L70 50 Q78 50 80 58 L84 70 Q94 72 94 82 L94 88 L8 88 Z',
    patches: ['M8 82 L94 82 L94 88 L8 88 Z'],
    patchColor: '#F4F2EE',
    lines: ['M8 82 L94 82', 'M44 62 L52 66', 'M48 59 L56 63', 'M52 56 L60 60', 'M20 64 Q22 74 34 76 L60 76'],
    folds: [['M60 60 Q66 70 74 74', 0.12]],
    lights: [['M20 68 Q40 66 58 58', 0.12]],
  },
  zapatos: {
    body: 'M6 86 Q6 74 18 72 L46 72 Q62 68 72 62 Q80 58 86 62 Q96 68 96 80 L96 88 L6 88 Z',
    patches: ['M6 85 L96 85 L96 88 L6 88 Z'],
    patchColor: '#2A2420',
    lines: ['M46 72 Q56 70 66 64', 'M18 72 Q20 80 30 82 L90 82'],
    folds: [['M70 64 Q76 70 84 70', 0.1]],
    lights: [['M20 76 Q50 72 80 64', 0.14]],
  },
};

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

let noiseCanvas = null;
function noise() {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(192, 192);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + rnd() * 36;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

let twillCanvas = null;
function twill() {
  if (twillCanvas) return twillCanvas;
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = 'rgb(160,160,160)';
  ctx.lineWidth = 1.4;
  for (let k = -24; k < 48; k += 4) {
    ctx.beginPath();
    ctx.moveTo(k, 24);
    ctx.lineTo(k + 24, 0);
    ctx.stroke();
  }
  twillCanvas = c;
  return c;
}

export function renderGarment(typeId, hex, fit = 'recto') {
  const shape = SHAPES[typeId] ?? SHAPES.camiseta;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const fx = fit === 'slim' ? 0.93 : fit === 'ancho' ? 1.07 : 1;
  const toDevice = () => ctx.setTransform(S * fx, 0, 0, S, OX + 50 * S * (1 - fx), OY);
  const body = new Path2D(shape.body);
  const dark = luminance(hex) < 0.25;

  // Sombra suave de la prenda sobre el fondo.
  ctx.save();
  toDevice();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = hex;
  ctx.fill(body);
  ctx.restore();

  ctx.save();
  toDevice();
  ctx.clip(body);

  // Textura de tela.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = DENIM.has(typeId) ? 0.55 : 0.35;
  ctx.fillStyle = ctx.createPattern(DENIM.has(typeId) ? twill() : noise(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Volumen general: luz arriba-izquierda, sombra en bordes y abajo.
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(0, OY, 0, OY + 130 * S);
  g.addColorStop(0, dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.14)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 520);
  r.addColorStop(0, 'rgba(0,0,0,0)');
  r.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);

  // Piezas de otro tono (cuello, suela).
  for (const p of shape.patches ?? []) {
    toDevice();
    ctx.fillStyle = shape.patchColor ?? shade(hex, dark ? 0.12 : 0.1);
    ctx.fill(new Path2D(p));
  }

  // Pliegues (sombras y luces difuminadas).
  const stroke = (list, color, blur, width) => {
    for (const [d, a] of list ?? []) {
      toDevice();
      ctx.filter = `blur(${blur}px)`;
      ctx.strokeStyle = color(a);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke(new Path2D(d));
      ctx.filter = 'none';
    }
  };
  stroke(shape.folds, (a) => `rgba(0,0,0,${dark ? a * 1.1 : a * 0.95})`, 16, 6);
  stroke(shape.lights, (a) => `rgba(255,255,255,${dark ? a * 0.9 : a * 0.9})`, 22, 8);

  // Elástico acanalado (suéter).
  for (const rib of shape.ribs ?? []) {
    toDevice();
    ctx.strokeStyle = shade(hex, dark ? 0.12 : -0.14);
    ctx.lineWidth = 0.35;
    const [x0, y0] = rib.from, [x1, y1] = rib.to;
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / rib.step));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rib.h * (y1 - y0)) / 60, y + rib.h * 0.95);
      ctx.stroke();
    }
  }

  // Costuras y bordes.
  toDevice();
  ctx.strokeStyle = shade(hex, dark ? 0.16 : -0.22);
  ctx.lineWidth = 0.42;
  ctx.lineJoin = 'round';
  for (const d of shape.lines ?? []) ctx.stroke(new Path2D(d));

  // Pespuntes (contraste dorado en mezclilla).
  ctx.setLineDash([1.1, 0.8]);
  ctx.strokeStyle = DENIM.has(typeId) ? 'rgba(201,145,62,0.95)' : shade(hex, dark ? 0.25 : -0.12);
  ctx.lineWidth = 0.32;
  for (const d of shape.stitches ?? []) ctx.stroke(new Path2D(d));
  ctx.setLineDash([]);

  // Cierre.
  if (shape.zipper) {
    ctx.strokeStyle = 'rgba(40,40,40,0.75)';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([0.45, 0.45]);
    ctx.stroke(new Path2D(shape.zipper));
    ctx.setLineDash([]);
  }

  // Pasadores del cinturón.
  for (const x of shape.loops ?? []) {
    ctx.fillStyle = shade(hex, dark ? 0.1 : -0.12);
    ctx.fillRect(x - 0.8, typeId === 'short' ? 7.4 : 3.4, 1.6, 7.4);
  }

  // Botones.
  for (const [x, y] of shape.buttons ?? []) {
    ctx.beginPath();
    ctx.arc(x, y, DENIM.has(typeId) ? 1.6 : 1.05, 0, Math.PI * 2);
    ctx.fillStyle = DENIM.has(typeId) ? '#B9A27A' : luminance(hex) > 0.75 ? '#E8E4DC' : shade(hex, dark ? 0.35 : 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.18;
    ctx.stroke();
  }
  ctx.restore();

  // Contorno muy sutil.
  ctx.save();
  toDevice();
  ctx.strokeStyle = shade(hex, dark ? 0.06 : -0.28);
  ctx.lineWidth = 0.3;
  ctx.stroke(body);
  ctx.restore();

  return c.toDataURL('image/png');
}

// Versión de dibujo: si cambia, las prendas rápidas guardadas se vuelven a dibujar.
export const ART_VERSION = 2;
