// api/claude.js — Proxy Gemini con auto-detección de modelo
export const config = { runtime: 'edge' };
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

async function listModels(key) {
  // Probar v1beta y v1
  for (const ver of ['v1beta', 'v1']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${key}`);
      const d = await r.json();
      if (r.ok && d.models) return d.models;
    } catch(_e) {}
  }
  return [];
}

async function generateContent(model, ver, parts, key) {
  const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
    }),
  });
  return { r, d: await r.json() };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, x-user-key' } });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const key = req.headers.get('x-user-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return new Response(JSON.stringify({ error: { message: 'NO_KEY' } }), { status: 401, headers: CORS });

  const body = await req.json();

  // Convertir partes
  const parts = [];
  for (const msg of body.messages || []) {
    for (const block of (Array.isArray(msg.content) ? msg.content : [{ type:'text', text: msg.content }])) {
      if (block.type === 'image') parts.push({ inlineData: { mimeType: block.source.media_type, data: block.source.data } });
      else if (block.type === 'text') parts.push({ text: block.text });
    }
  }

  // Auto-detectar modelo disponible
  const hasImage = parts.some(p => p.inlineData);
  const models = await listModels(key);

  // Filtrar modelos que soporten generateContent (y visión si hay imagen)
  const preferred = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let chosen = null, chosenVer = 'v1beta';

  if (models.length > 0) {
    // Usar modelos listados, preferir los conocidos
    for (const pref of preferred) {
      const found = models.find(m => m.name?.includes(pref) && m.supportedGenerationMethods?.includes('generateContent'));
      if (found) { chosen = found.name.replace('models/', ''); chosenVer = 'v1beta'; break; }
    }
    // Si ninguno preferido, usar el primero que soporte generateContent
    if (!chosen) {
      const first = models.find(m => m.supportedGenerationMethods?.includes('generateContent'));
      if (first) { chosen = first.name.replace('models/', ''); }
    }
  }

  // Fallback si listModels falló
  if (!chosen) {
    for (const [ver, model] of [['v1beta','gemini-2.0-flash'],['v1','gemini-2.0-flash'],['v1beta','gemini-1.5-flash-latest']]) {
      try {
        const { r, d } = await generateContent(model, ver, [{ text: 'test' }], key);
        if (r.ok) { chosen = model; chosenVer = ver; break; }
        const msg = d?.error?.message || '';
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid'))
          return new Response(JSON.stringify({ error: { message: 'INVALID_KEY' } }), { status: 401, headers: CORS });
      } catch(_e) {}
    }
  }

  if (!chosen) return new Response(JSON.stringify({ error: { message: 'No se encontró un modelo Gemini disponible para tu key. Verificá que la API de Gemini esté habilitada en tu proyecto de Google.' } }), { status: 500, headers: CORS });

  const { r, d } = await generateContent(chosen, chosenVer, parts, key);
  if (!r.ok) {
    const msg = d?.error?.message || 'Error de Gemini';
    if (msg.includes('API_KEY_INVALID')) return new Response(JSON.stringify({ error: { message: 'INVALID_KEY' } }), { status: 401, headers: CORS });
    return new Response(JSON.stringify({ error: { message: msg } }), { status: r.status, headers: CORS });
  }

  const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
  return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { headers: CORS });
}
