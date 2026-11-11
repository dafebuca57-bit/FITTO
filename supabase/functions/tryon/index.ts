// Fitto – función "tryon"
// Recibe tu foto y la de la prenda (data URLs) y genera la imagen con la prenda puesta
// usando modelos gratuitos de virtual try-on en Hugging Face Spaces.
//
// Modelo principal: Leffa en modo DressCode (entrenado con hombres y mujeres; superior, inferior y vestidos).
// Respaldo: IDM-VTON (solo prendas superiores; tiende a feminizar el cuerpo).
//
// Secrets opcionales: HF_TOKEN (más cuota), LEFFA_SPACE, IDM_SPACE (URLs alternativas).

const LEFFA = (Deno.env.get("LEFFA_SPACE") ?? "https://franciszzj-leffa.hf.space").replace(/\/$/, "");
const IDM = (Deno.env.get("IDM_SPACE") ?? Deno.env.get("HF_SPACE") ?? "https://yisol-idm-vton.hf.space").replace(/\/$/, "");
const HF_TOKEN = Deno.env.get("HF_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FileRef = { url?: string; path?: string } | string;
type Result = { image: string; mask: string | null; provider: "leffa" | "idm" };

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

// Acepta data URLs o, para pruebas, imágenes de ejemplo alojadas en Hugging Face Spaces.
async function toBlob(input: string): Promise<Blob> {
  if (/^https:\/\/[a-z0-9-]+\.hf\.space\/.*file=/.test(input)) {
    const r = await fetch(input, { headers: authHeaders() });
    if (!r.ok) throw new Error("No se pudo leer la imagen de ejemplo");
    return await r.blob();
  }
  return dataUrlToBlob(input);
}

async function spaceInfo(space: string, apiName: string) {
  const r = await fetch(`${space}/config`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`El modelo no está disponible ahora (${r.status}). Intenta en unos minutos.`);
  const cfg = await r.json();
  const prefix = typeof cfg.api_prefix === "string" ? cfg.api_prefix.replace(/\/$/, "") : "";
  const deps: Array<{ api_name?: string }> = cfg.dependencies ?? [];
  const fnIndex = deps.findIndex((d) => d.api_name === apiName);
  if (fnIndex < 0) throw new Error("El modelo cambió y ya no expone la función de try-on");
  return { prefix, fnIndex };
}

async function upload(space: string, prefix: string, blob: Blob, name: string) {
  const form = new FormData();
  form.append("files", blob, name);
  const r = await fetch(`${space}${prefix}/upload`, { method: "POST", body: form, headers: authHeaders() });
  if (!r.ok) throw new Error(`No se pudo subir la imagen al modelo (${r.status})`);
  const paths = await r.json();
  return { path: paths[0], orig_name: name, meta: { _type: "gradio.FileData" } };
}

// Llama a una función de un Space de Gradio por su cola (sse_v3) y devuelve las salidas.
async function callSpace(space: string, prefix: string, fnIndex: number, data: unknown[]): Promise<unknown[]> {
  const session_hash = crypto.randomUUID().replace(/-/g, "").slice(0, 11);
  const join = await fetch(`${space}${prefix}/queue/join`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ data, fn_index: fnIndex, session_hash, event_data: null, trigger_id: null }),
  });
  if (!join.ok) throw new Error(`El modelo no aceptó la solicitud (${join.status})`);

  const stream = await fetch(`${space}${prefix}/queue/data?session_hash=${session_hash}`, {
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
          if (/quota|GPU/i.test(err)) throw new Error("Se agotó la cuota gratuita de la IA por ahora. Intenta en un rato (con un token de Hugging Face hay más cuota).");
          throw new Error(err ? `El modelo devolvió un error: ${err}` : "El modelo no pudo generar la imagen. Prueba con otra foto.");
        }
        return msg.output.data;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  throw new Error("El modelo terminó sin devolver imagen");
}

async function download(space: string, prefix: string, file: FileRef): Promise<string> {
  const url = typeof file === "string" ? `${space}${prefix}/file=${file}` : file?.url ?? `${space}${prefix}/file=${file?.path}`;
  const r = await fetch(url, { headers: authHeaders() });
  if (!r.ok) throw new Error("No se pudo descargar la imagen generada");
  return await blobToDataUrl(await r.blob());
}

// Leffa: devuelve [imagen 768x1024, máscara, densepose]. La foto se letterboxea a 768x1024.
async function leffa(person: Blob, garment: Blob, garmentType: string): Promise<Result> {
  const { prefix, fnIndex } = await spaceInfo(LEFFA, "leffa_predict_vt");
  const p = await upload(LEFFA, prefix, person, "persona.jpg");
  const g = await upload(LEFFA, prefix, garment, "prenda.png");
  const out = await callSpace(LEFFA, prefix, fnIndex, [
    p,
    g,
    false, // acelerar UNet de referencia
    30, // pasos
    2.5, // guidance
    42, // semilla
    "dress_code", // modelo entrenado con hombres y mujeres
    garmentType, // upper_body | lower_body | dresses
    false, // repaint
  ]);
  const image = await download(LEFFA, prefix, out[0] as FileRef);
  let mask: string | null = null;
  try {
    mask = await download(LEFFA, prefix, out[1] as FileRef);
  } catch {
    mask = null;
  }
  return { image, mask, provider: "leffa" };
}

// IDM-VTON (respaldo): devuelve [imagen pegada sobre la foto original, máscara en gris].
async function idm(person: Blob, garment: Blob, description: string): Promise<Result> {
  const { prefix, fnIndex } = await spaceInfo(IDM, "tryon");
  const p = await upload(IDM, prefix, person, "persona.jpg");
  const g = await upload(IDM, prefix, garment, "prenda.png");
  const out = await callSpace(IDM, prefix, fnIndex, [
    { background: p, layers: [], composite: null },
    g,
    description,
    true,
    true,
    30,
    42,
  ]);
  const image = await download(IDM, prefix, out[0] as FileRef);
  let mask: string | null = null;
  try {
    mask = await download(IDM, prefix, out[1] as FileRef);
  } catch {
    mask = null;
  }
  return { image, mask, provider: "idm" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  try {
    const body = await req.json();
    if (body?.ping) return json({ ok: true, leffa: LEFFA, idm: IDM, token: Boolean(HF_TOKEN) });
    const { person, garment, description, garmentType = "upper_body", provider = "leffa", body: bodyType } = body ?? {};
    if (!person || !garment) return json({ error: "Faltan la foto de la persona o de la prenda" }, 400);
    if (!["upper_body", "lower_body", "dresses"].includes(garmentType)) return json({ error: "Tipo de prenda inválido" }, 400);

    const pBlob = await toBlob(String(person));
    const gBlob = await toBlob(String(garment));
    let result: Result;
    let fallbackReason: string | null = null;
    if (provider === "idm") {
      result = await idm(pBlob, gBlob, String(description ?? "top"));
    } else {
      try {
        result = await leffa(pBlob, gBlob, garmentType);
      } catch (e) {
        // Respaldo con IDM-VTON solo para prendas superiores y cuerpo de mujer (con hombres feminiza).
        if (garmentType !== "upper_body" || bodyType !== "mujer") throw e;
        fallbackReason = e instanceof Error ? e.message : String(e);
        result = await idm(pBlob, gBlob, String(description ?? "top"));
      }
    }

    if (body?.check) {
      return json({ ok: true, provider: result.provider, fallbackReason, bytes: result.image.length, head: result.image.slice(0, 30), maskBytes: result.mask?.length ?? 0, maskHead: result.mask?.slice(0, 30) ?? null });
    }
    return json({ ...result, fallbackReason });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
