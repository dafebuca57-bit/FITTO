import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const ENDPOINT = `${SUPABASE_URL}/functions/v1/tryon`;

async function call(body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.error) throw new Error(data.error || `Error del servidor (${r.status})`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Tardó demasiado. El modelo gratuito puede estar saturado; intenta de nuevo.');
    if (e instanceof TypeError) throw new Error('Sin conexión con el servidor. Revisa tu internet.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function tryOn(personDataUrl, garmentDataUrl, description, garmentType, body) {
  const { image, mask, provider } = await call({ person: personDataUrl, garment: garmentDataUrl, description, garmentType, body }, 240000);
  return { image, mask, provider };
}

export const pingServer = () => call({ ping: true }, 20000);
