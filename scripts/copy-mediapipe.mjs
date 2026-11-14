// Copia los detectores de MediaPipe (cara y persona) a public/ para que funcionen sin internet.
import { cpSync, mkdirSync } from 'node:fs';
for (const pkg of ['selfie_segmentation', 'face_detection']) {
  const dest = `public/mediapipe/${pkg}`;
  mkdirSync(dest, { recursive: true });
  cpSync(`node_modules/@mediapipe/${pkg}`, dest, {
    recursive: true,
    filter: (src) => !/(README|package\.json|index\.d\.ts|full_range)/.test(src),
  });
}
console.log('MediaPipe copiado a public/mediapipe');
