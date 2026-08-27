// api/claude.js — Proxy Gemini
export const config = { runtime: 'edge' };
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// Modelos en orden de preferencia — el primero disponible gana
const MODELS_TO_TRY = [
  ['v1beta', 'gemini-3.6-flash'],
  ['v1beta', 'gemini-3.5-flash'],
  ['v1beta', 'gemini-2.5-flash-latest'],
  ['v1beta', 'gemini-2.0-flash'],
  ['v1',     'gemini-2.0-flash'],
  ['v1beta', 'gemini-2.0-flash-lite'],
  ['v1beta', 'gemini-1.5-flash-latest'],
];

async function callGemini(ver, model, parts, key) {
  const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
    }),
  });
  let d;
  try { d = await r.json(); }
  catch(_e) { d = { error: { message: `Respuesta no-JSON del modelo ${model}` } }; }
  return { ok: r.ok, status: r.status, data: d };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, x-user-key' }
  });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const key = req.headers.get('x-user-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return new Response(JSON.stringify({ error: { message: 'NO_KEY' } }), { status: 401, headers: CORS });

  const body = await req.json();

  // Convertir formato Anthropic → Gemini parts
  const parts = [];
  for (const msg of body.messages || []) {
    for (const block of (Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }])) {
      if (block.type === 'image') parts.push({ inlineData: { mimeType: block.source.media_type, data: block.source.data } });
      else if (block.type === 'text') parts.push({ text: block.text });
    }
  }

  // Probar cada modelo hasta que uno funcione
  let lastErr = 'No hay modelos Gemini disponibles';
  for (const [ver, model] of MODELS_TO_TRY) {
    const { ok, status, data } = await callGemini(ver, model, parts, key);

    if (ok) {
      // Verificar que la respuesta no sea el mensaje de deprecación
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.includes('no longer available') || text.includes('please update your code')) {
        // Modelo deprecated — probar el siguiente
        lastErr = `${model} deprecado`;
        continue;
      }
      return new Response(JSON.stringify({ content: [{ type: 'text', text: text || 'Sin respuesta' }] }), { headers: CORS });
    }

    const errMsg = data?.error?.message || '';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || status === 400) {
      return new Response(JSON.stringify({ error: { message: 'INVALID_KEY' } }), { status: 401, headers: CORS });
    }
    // Modelo no disponible → probar siguiente
    lastErr = errMsg || `${model} no disponible`;
  }

  return new Response(JSON.stringify({ error: { message: lastErr } }), { status: 500, headers: CORS });
}
