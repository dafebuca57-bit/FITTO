// Protección propia, calculada en el teléfono (sin internet), independiente de la IA de ropa:
// detecta tu cara y tu silueta con MediaPipe y marca qué zonas NUNCA deben cambiar:
// el fondo, la cara, el cabello y todo lo que está por encima de la barbilla.
// Al final, esas zonas se copian siempre de tu foto original.

const BASE = './mediapipe';

// Cada detector de MediaPipe se carga en su propio marco invisible: si comparten página,
// sus motores internos chocan entre sí.
const frames = {};
function isolatedWindow(name) {
  if (!frames[name]) {
    frames[name] = new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;top:-10px;border:0;opacity:0;pointer-events:none';
      f.onload = () => resolve(f.contentWindow);
      f.src = 'about:blank';
      document.body.appendChild(f);
    });
  }
  return frames[name];
}

const abs = (path) => new URL(`${BASE}/${path}`, document.baseURI).href;

async function loadScriptIn(win, path) {
  if (win.__fittoLoaded?.[path]) return win.__fittoLoaded[path];
  win.__fittoLoaded = win.__fittoLoaded ?? {};
  win.__fittoLoaded[path] = new Promise((resolve, reject) => {
    const s = win.document.createElement('script');
    s.src = abs(path);
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${path}`));
    win.document.head.appendChild(s);
  });
  return win.__fittoLoaded[path];
}

// Copia la imagen a un canvas del propio marco (evita problemas entre ventanas).
function imageIn(win, img) {
  const c = win.document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

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

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

let segmenter = null;
let detector = null;

// Silueta de la persona: canvas con alfa = probabilidad de "persona".
async function personMask(img) {
  const win = await isolatedWindow('seg');
  await loadScriptIn(win, 'selfie_segmentation/selfie_segmentation.js');
  if (!segmenter) {
    segmenter = new win.SelfieSegmentation({ locateFile: (f) => abs(`selfie_segmentation/${f}`) });
    segmenter.setOptions({ modelSelection: 0, selfieMode: false });
    await segmenter.initialize();
  }
  return new Promise((resolve, reject) => {
    segmenter.onResults((r) => {
      const c = canvas(img.naturalWidth, img.naturalHeight);
      c.getContext('2d').drawImage(r.segmentationMask, 0, 0, c.width, c.height);
      resolve(c);
    });
    segmenter.send({ image: imageIn(win, img) }).catch(reject);
  });
}

// Caja de la cara (normalizada 0..1), o null si no se encontró.
async function faceBox(img) {
  const win = await isolatedWindow('face');
  await loadScriptIn(win, 'face_detection/face_detection.js');
  if (!detector) {
    detector = new win.FaceDetection({ locateFile: (f) => abs(`face_detection/${f}`) });
    detector.setOptions({ model: 'short', minDetectionConfidence: 0.5, selfieMode: false });
    await detector.initialize();
  }
  return new Promise((resolve, reject) => {
    detector.onResults((r) => {
      const dets = r.detections ?? [];
      if (!dets.length) return resolve(null);
      // La cara más grande (la tuya, no la de alguien al fondo).
      const best = dets
        .map((d) => d.boundingBox)
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];
      resolve(best);
    });
    detector.send({ image: imageIn(win, img) }).catch(reject);
  });
}

// Devuelve un canvas del tamaño de la foto: alfa 255 = zona protegida (siempre de tu foto).
// Devuelve null si no se pudo calcular (la app sigue con la protección normal).
export async function computeProtection(frameUrl) {
  try {
    const img = await loadImage(frameUrl);
    const W = img.naturalWidth, H = img.naturalHeight;
    const [person, face] = await withTimeout(Promise.all([personMask(img), faceBox(img)]), 20000);

    // Trabaja a resolución reducida.
    const sw = 192, sh = Math.round((192 * H) / W);
    const pc = canvas(sw, sh);
    const pctx = pc.getContext('2d', { willReadFrequently: true });
    // Un poco más ancha que el cuerpo: la prenda nueva puede ser algo más holgada.
    pctx.filter = 'blur(3px)';
    pctx.drawImage(person, 0, 0, sw, sh);
    pctx.filter = 'none';
    const pd = pctx.getImageData(0, 0, sw, sh).data;

    let personCount = 0;
    const out = canvas(sw, sh);
    const octx = out.getContext('2d', { willReadFrequently: true });
    const od = octx.createImageData(sw, sh);

    // Por encima de la barbilla todo queda protegido (cara, cabello, fondo).
    const chinY = face ? Math.min(sh, Math.round((face.yCenter + face.height * 0.62) * sh)) : -1;
    // Óvalo de cabeza y cabello, un poco más grande que la cara.
    const hx = face ? face.xCenter * sw : 0, hy = face ? (face.yCenter - face.height * 0.15) * sh : 0;
    const hrx = face ? face.width * sw * 0.95 : 0, hry = face ? face.height * sh * 1.05 : 0;

    for (let y = 0, i = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++, i += 4) {
        const isPerson = pd[i + 3] > 80; // alfa del blur: incluye un pequeño margen alrededor del cuerpo
        if (isPerson) personCount++;
        let protect = !isPerson || y < chinY;
        if (face && !protect) {
          const dx = (x - hx) / hrx, dy = (y - hy) / hry;
          if (dx * dx + dy * dy < 1) protect = true;
        }
        od.data[i + 3] = protect ? 255 : 0;
      }
    }
    // Si no se detectó a la persona, no arriesgar: no se aplica esta protección.
    if (personCount < sw * sh * 0.05) return null;
    octx.putImageData(od, 0, 0);

    // Borde suave a tamaño completo.
    const full = canvas(W, H);
    const fctx = full.getContext('2d');
    fctx.filter = 'blur(4px)';
    fctx.drawImage(out, 0, 0, sw, sh, 0, 0, W, H);
    return { mask: full, faceFound: Boolean(face) };
  } catch {
    return null;
  }
}

// Copia de tu foto original todas las zonas protegidas sobre el resultado de la IA.
export async function applyProtection(frameUrl, resultUrl, protection) {
  const [orig, res] = await Promise.all([loadImage(frameUrl), loadImage(resultUrl)]);
  const W = orig.naturalWidth, H = orig.naturalHeight;
  const keep = canvas(W, H);
  const kctx = keep.getContext('2d');
  kctx.drawImage(orig, 0, 0);
  kctx.globalCompositeOperation = 'destination-in';
  kctx.drawImage(protection.mask, 0, 0, W, H);

  const out = canvas(W, H);
  const octx = out.getContext('2d');
  octx.drawImage(res, 0, 0, W, H);
  octx.drawImage(keep, 0, 0);
  return out.toDataURL('image/jpeg', 0.95);
}
