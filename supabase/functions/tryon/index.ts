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

// Acepta data URLs o, para pruebas, archivos de ejemplo del propio Space.
async function toBlob(input: string): Promise<Blob> {
  if (input.startsWith(`${SPACE}/file=`)) {
    const r = await fetch(input, { headers: authHeaders() });
    if (!r.ok) throw new Error("No se pudo leer la imagen de ejemplo");
    return await r.blob();
  }
  return dataUrlToBlob(input);
}

type SpaceInfo = { prefix: string; fnIndex: number };

// Lee la configuración del Space: prefijo de la API (Gradio 5 usa /gradio_api) y el índice de "tryon".
async function spaceInfo(): Promise<SpaceInfo> {
  const r = await fetch(`${SPACE}/config`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`El modelo no está disponible ahora (${r.status}). Intenta en unos minutos.`);
  const cfg = await r.json();
  const prefix = typeof cfg.api_prefix === "string" ? cfg.api_prefix.replace(/\/$/, "") : "";
  const deps: Array<{ api_name?: string }> = cfg.dependencies ?? [];
  const fnIndex = deps.findIndex((d) => d.api_name === "tryon");
  if (fnIndex < 0) throw new Error("El modelo cambió y ya no expone la función de try-on");
  return { prefix, fnIndex };
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
  const { prefix, fnIndex } = await spaceInfo();
  const personFile = await upload(prefix, person, "persona.jpg");
  const garmentFile = await upload(prefix, garment, "prenda.png");
  const session_hash = crypto.randomUUID().replace(/-/g, "").slice(0, 11);

  // Protocolo de cola de Gradio (sse_v3): entrar a la cola y leer eventos.
  const join = await fetch(`${SPACE}${prefix}/queue/join`, {
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
      fn_index: fnIndex,
      session_hash,
      event_data: null,
      trigger_id: null,
    }),
  });
  if (!join.ok) throw new Error(`El modelo no aceptó la solicitud (${join.status})`);

  const stream = await fetch(`${SPACE}${prefix}/queue/data?session_hash=${session_hash}`, {
    headers: { ...authHeaders(), Accept: "text/event-stream" },
  });
  if (!stream.ok || !stream.body) throw new Error(`No hubo respuesta del modelo (${stream.status})`);

  const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        let msg: { msg?: string; success?: boolean; output?: { data?: unknown[]; error?: string } };
        try {
          msg = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        if (msg.msg === "queue_full") throw new Error("El modelo gratuito está lleno. Intenta en unos minutos.");
        if (msg.msg !== "process_completed") continue;
        if (!msg.success || !msg.output?.data) {
          const err = msg.output?.error ?? "";
          if (/quota|GPU/i.test(err)) throw new Error("Se agotó la cuota gratuita del modelo por ahora. Intenta más tarde.");
          throw new Error(err ? `El modelo devolvió un error: ${err}` : "El modelo no pudo generar la imagen. Prueba con otra foto.");
        }
        const file = msg.output.data[0] as { url?: string; path?: string } | string;
        const url = typeof file === "string" ? `${SPACE}${prefix}/file=${file}` : file?.url ?? `${SPACE}${prefix}/file=${file?.path}`;
        const img = await fetch(url, { headers: authHeaders() });
        if (!img.ok) throw new Error("No se pudo descargar la imagen generada");
        return await blobToDataUrl(await img.blob());
      }
    }
  } finally {
    reader.cancel().catch(() => {});
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

    const image = await runTryOn(await toBlob(String(person)), await toBlob(String(garment)), String(description ?? "prenda de vestir"));
    if (body?.check) return json({ ok: true, bytes: image.length, head: image.slice(0, 30) });
    return json({ image });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
