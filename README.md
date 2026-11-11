# Fitto

App para planear tu vestimenta: armario rápido sin fotos ("Vestido Rápido"), outfit del día con puntaje de match y cumplidos, racha diaria con congeladores, y probador virtual con IA sobre tu propia foto.

## Descargar el APK

Cada vez que se sube código a `main`, GitHub Actions compila el APK:

1. Enlace fijo a la última versión: https://github.com/dafebuca57-bit/FITTO/releases/latest/download/fitto.apk
2. Descarga `fitto.apk` desde el teléfono e instálalo (Android pedirá permitir apps de fuentes desconocidas).

También queda como artefacto en la pestaña **Actions**.

## Cómo funciona el probador

- La app envía tu foto y la prenda a la función `tryon` en Supabase (`supabase/functions/tryon`).
- La función llama al modelo gratuito **IDM-VTON** en Hugging Face Spaces y devuelve la imagen generada.
- Funciona mejor con **prendas superiores** y fotos de frente con buena luz. Puede tardar 30 s – 2 min y tiene límites de uso gratuitos.

### Mejorar velocidad y cuota (opcional, gratis)

Crea un token en huggingface.co → Settings → Access Tokens (tipo *Read*) y guárdalo en Supabase como secreto `HF_TOKEN` de las Edge Functions.

### Cambiar de modelo

Define el secreto `HF_SPACE` con la URL de otro Space compatible. Para pasar a un servicio de pago (FASHN, Google) solo hay que cambiar la función del servidor; la app no cambia.

## Desarrollo

```bash
npm install
npm run dev          # versión web
npm run android:sync # compila y copia al proyecto Android
```

Stack: React + Vite, Capacitor (Android), Supabase Edge Functions. Los datos del usuario (fotos, armario, racha) se guardan solo en el teléfono.
