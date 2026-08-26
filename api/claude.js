// api/claude.js — Proxy hacia Gemini Flash
// Acepta el formato de Anthropic y lo convierte a Gemini
// La API key viene del cliente (header x-user-key) — cada usuario usa la suya

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-key',
    }});
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Key del usuario (enviada por la app desde localStorage)
  const userKey = req.headers.get('x-user-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!userKey) {
    return new Response(JSON.stringify({
      error: { message: 'NO_KEY' }
    }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  const body = await req.json();

  // Convertir formato Anthropic → Gemini
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

  const geminiBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: body.max_tokens || 1000, temperature: 0.3 },
  };

  // Nuevo formato de key AQ. usa flash-latest; ambos formatos funcionan igual
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userKey}`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    const errMsg = data?.error?.message || 'Error de Gemini';
    const isInvalid = errMsg.includes('API_KEY_INVALID') || upstream.status === 400;
    return new Response(JSON.stringify({
      error: { message: isInvalid ? 'INVALID_KEY' : errMsg }
    }), { status: upstream.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  // Convertir respuesta Gemini → formato Anthropic
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
  return new Response(JSON.stringify({
    content: [{ type: 'text', text }]
  }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
