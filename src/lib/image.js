import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Toma una foto con la cámara (o la elige de la galería) y la devuelve como data URL comprimido.
export async function takePhoto(fromGallery = false) {
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: fromGallery ? CameraSource.Photos : CameraSource.Camera,
    quality: 85,
    width: 1024,
    correctOrientation: true,
    webUseInput: true,
  });
  return resize(photo.dataUrl, 1024);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function resize(dataUrl, max = 1024, type = 'image/jpeg') {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL(type, 0.86);
}

// Color promedio del centro de la imagen (donde suele estar la prenda).
export async function dominantColor(dataUrl) {
  const img = await loadImage(dataUrl);
  const c = document.createElement('canvas');
  const size = 48;
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const sx = img.width * 0.3;
  const sy = img.height * 0.3;
  ctx.drawImage(img, sx, sy, img.width * 0.4, img.height * 0.4, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

// Dibuja una prenda genérica como foto "flat lay" sobre fondo blanco,
// para que el modelo de try-on tenga una imagen de referencia.
export function renderGenericGarment(d, hex, fit = 'recto') {
  const W = 768, H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const sx = fit === 'slim' ? 6.2 : fit === 'ancho' ? 7.6 : 6.9;
  const sy = 8.6;
  ctx.save();
  ctx.translate(W / 2 - 50 * sx, H / 2 - 50 * sy);
  ctx.scale(sx, sy);
  const path = new Path2D(d);

  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = hex;
  ctx.fill(path);
  ctx.shadowColor = 'transparent';

  // Volumen: luz arriba, sombra abajo.
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(0, 0, 0, 100);
  g.addColorStop(0, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 100, 100);
  ctx.restore();

  ctx.lineWidth = 0.5;
  ctx.strokeStyle = shade(hex, -0.18);
  ctx.stroke(path);
  ctx.restore();
  return c.toDataURL('image/png');
}
