// api/claude.js — Proxy dual: Gemini (gratis) o Claude (Anthropic)
// Detecta por el prefijo de la key del usuario
export const config = { runtime: 'edge' };
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// ── Llamada a Anthropic Claude ────────────────────────────────────────────────
async function callAnthropic(messages, key) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages,
    }),
  });
  let d; try { d = await r.json(); } catch(_e) { d = { error:{ message:'Non-JSON response' } }; }
  if (!r.ok) {
    if (r.status === 401) return { ok:false, error:'INVALID_KEY' };
    return { ok:false, error: d?.error?.message || 'Error Anthropic' };
  }
  const text = d?.content?.[0]?.text || 'Sin respuesta';
  return { ok:true, text };
}

// ── Llamada a Gemini ──────────────────────────────────────────────────────────
const GEMINI_MODELS = [
  ['v1beta','gemini-3.6-flash'],
  ['v1beta','gemini-2.5-flash'],
  ['v1beta','gemini-2.0-flash'],
  ['v1beta','gemini-2.0-flash-lite'],
  ['v1beta','gemini-1.5-flash-latest'],
];

async function callGemini(messages, key) {
  // Convertir formato Anthropic → Gemini parts
  const parts = [];
  for (const msg of messages) {
    for (const block of (Array.isArray(msg.content) ? msg.content : [{type:'text',text:msg.content}])) {
      if (block.type === 'image') parts.push({ inlineData:{ mimeType:block.source.media_type, data:block.source.data } });
      else if (block.type === 'text') parts.push({ text: block.text });
    }
  }

  for (const [ver, model] of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents:[{ role:'user', parts }], generationConfig:{ maxOutputTokens:1000, temperature:0.3 } }),
    });
    let d; try { d = await r.json(); } catch(_e) { continue; }
    if (!r.ok) {
      const msg = d?.error?.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) return { ok:false, error:'INVALID_KEY' };
      continue; // probar siguiente modelo
    }
    const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('no longer available') || text.includes('please update your code')) continue;
    return { ok:true, text };
  }
  return { ok:false, error:'No hay modelos Gemini disponibles para esta key' };
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: { ...CORS, 'Access-Control-Allow-Methods':'POST', 'Access-Control-Allow-Headers':'Content-Type, x-user-key' }
  });
  if (req.method !== 'POST') return new Response('Method not allowed', { status:405 });

  const key = req.headers.get('x-user-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return new Response(JSON.stringify({ error:{ message:'NO_KEY' } }), { status:401, headers:CORS });

  const body = await req.json();
  const messages = body.messages || [];

  // Detectar proveedor por prefijo de key
  const isAnthropic = key.startsWith('sk-ant-') || key.startsWith('sk-');
  const result = isAnthropic
    ? await callAnthropic(messages, key)
    : await callGemini(messages, key);

  if (!result.ok) {
    if (result.error === 'INVALID_KEY') return new Response(JSON.stringify({ error:{ message:'INVALID_KEY' } }), { status:401, headers:CORS });
    return new Response(JSON.stringify({ error:{ message:result.error } }), { status:500, headers:CORS });
  }
  return new Response(JSON.stringify({ content:[{ type:'text', text:result.text }] }), { headers:CORS });
}
