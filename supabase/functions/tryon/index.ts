// Fitto – función "tryon"
// Recibe la foto de la persona y la foto de la prenda (data URLs en base64)
// y genera la imagen con el outfit puesto usando un modelo de virtual try-on
// alojado en Hugging Face Spaces (por defecto IDM-VTON).
//
// Variables opcionales (Secrets de la función):
//   HF_TOKEN  – token gratuito de Hugging Face: da más cuota y menos esperas.
//   HF_SPACE  – URL del Space a usar (por defecto https://yisol-idm-vton.hf.space)

const SPACE = (Deno.env.get("HF_SPACE") ?? "https://yisol-idm-vton.hf.space").replace(/\/$/, "");
const HF_TOKEN = Deno.env.get("HF_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function authHeaders(): Record<string, string> {
  return HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
}

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error("Imagen inválida: se esperaba un data URL en base64");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:${blob.type || "image/png"};base64,${btoa(bin)}`;
}

async function apiPrefix(): Promise<string> {
  try {
    const r = await fetch(`${SPACE}/config`, { headers: authHeaders() });
    if (!r.ok) return "";
    const cfg = await r.json();
    return typeof cfg.api_prefix === "string" ? cfg.api_prefix.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

async function upload(prefix: string, blob: Blob, name: string) {
  const form = new FormData();
  form.append("files", blob, name);
  const r = await fetch(`${SPACE}${prefix}/upload`, { method: "POST", body: form, headers: authHeaders() });
  if (!r.ok) throw new Error(`No se pudo subir la imagen al modelo (${r.status})`);
  const paths = await r.json();
  return { path: paths[0], orig_name: name, meta: { _type: "gradio.FileData" } };
}

async function runTryOn(person: Blob, garment: Blob, description: string): Promise<string> {
  const prefix = await apiPrefix();
  const personFile = await upload(prefix, person, "persona.jpg");
  const garmentFile = await upload(prefix, garment, "prenda.png");

  const start = await fetch(`${SPACE}${prefix}/call/tryon`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        { background: personFile, layers: [], composite: null },
        garmentFile,
        description,
        true, // máscara automática
        true, // recortar y centrar
        30, // pasos de denoising
        42, // semilla
      ],
    }),
  });
  if (!start.ok) throw new Error(`El modelo no aceptó la solicitud (${start.status})`);
  const { event_id } = await start.json();

  const stream = await fetch(`${SPACE}${prefix}/call/tryon/${event_id}`, { headers: authHeaders() });
  if (!stream.ok || !stream.body) throw new Error(`No hubo respuesta del modelo (${stream.status})`);
  const text = await stream.text();

  // Respuesta SSE: bloques "event: <tipo>\ndata: <json>"
  let lastEvent = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("event:")) lastEvent = line.slice(6).trim();
    else if (line.startsWith("data:")) {
      const payload = line.slice(5).trim();
      if (lastEvent === "error") {
        throw new Error(
          payload && payload !== "null"
            ? `El modelo devolvió un error: ${payload}`
            : "El modelo está ocupado o sin cuota gratuita. Intenta en unos minutos.",
        );
      }
      if (lastEvent === "complete") {
        const out = JSON.parse(payload);
        const file = out[0];
        const url: string = file?.url ?? `${SPACE}${prefix}/file=${file?.path}`;
        const img = await fetch(url, { headers: authHeaders() });
        if (!img.ok) throw new Error("No se pudo descargar la imagen generada");
        return await blobToDataUrl(await img.blob());
      }
    }
  }
  throw new Error("El modelo terminó sin devolver imagen");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  try {
    const body = await req.json();
    if (body?.ping) return json({ ok: true, space: SPACE, token: Boolean(HF_TOKEN) });
    const { person, garment, description } = body ?? {};
    if (!person || !garment) return json({ error: "Faltan la foto de la persona o de la prenda" }, 400);

    const image = await runTryOn(dataUrlToBlob(person), dataUrlToBlob(garment), String(description ?? "prenda de vestir"));
    return json({ image });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
