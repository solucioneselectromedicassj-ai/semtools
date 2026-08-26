// api/claude.js — Proxy hacia Gemini
export const config = { runtime: 'edge' };

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

async function tryGemini(model, parts, userKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
    }),
  });
  return { res, data: await res.json() };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-key',
    }});
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const userKey = req.headers.get('x-user-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!userKey) {
    return new Response(JSON.stringify({ error: { message: 'NO_KEY' } }),
      { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  const body = await req.json();

  // Convertir formato Anthropic → Gemini parts
  const parts = [];
  for (const msg of body.messages || []) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'image') {
          parts.push({ inlineData: { mimeType: block.source.media_type, data: block.source.data } });
        } else if (block.type === 'text') {
          parts.push({ text: block.text });
        }
      }
    } else {
      parts.push({ text: msg.content });
    }
  }

  // Intentar modelos en orden hasta que uno funcione
  let lastError = 'No hay modelos disponibles';
  for (const model of MODELS) {
    try {
      const { res, data } = await tryGemini(model, parts, userKey);
      if (res.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
        return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const errMsg = data?.error?.message || '';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        return new Response(JSON.stringify({ error: { message: 'INVALID_KEY' } }),
          { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
      lastError = errMsg;
    } catch (e) {
      lastError = e.message;
    }
  }

  return new Response(JSON.stringify({ error: { message: lastError } }),
    { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
