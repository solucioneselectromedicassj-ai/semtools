// api/claude.js — Proxy dual: Gemini (gratis) o Claude (Anthropic)
// Detecta por el prefijo de la key del usuario
export const config = { runtime: 'edge', maxDuration: 60 };
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// fetch con límite de tiempo propio — sin esto, si Google/Anthropic tarda en
// responder, la función de Vercel se queda colgada hasta que la plataforma la
// corta de golpe, y el cliente recibe una respuesta rota (no JSON) en vez de
// un error prolijo.
async function fetchT(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// ── Llamada a Anthropic Claude ────────────────────────────────────────────────
// Lista de modelos de repuesto: si el primero quedó descontinuado o no está
// disponible para la key del usuario, probamos el siguiente en vez de fallar.
const ANTHROPIC_MODELS = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'];

async function callAnthropic(messages, key) {
  let lastErr = 'No se pudo conectar con Claude';
  for (const model of ANTHROPIC_MODELS) {
    let r;
    try {
      r = await fetchT('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 1000, messages }),
      }, 20000);
    } catch(_e) { lastErr = 'Claude tardó demasiado en responder — probá de nuevo'; continue; }
    let d; try { d = await r.json(); } catch(_e) { d = { error:{ message:'Non-JSON response' } }; }
    if (!r.ok) {
      if (r.status === 401) return { ok:false, error:'INVALID_KEY' };
      lastErr = d?.error?.message || 'Error Anthropic';
      // Modelo inexistente/descontinuado para esta key → probar el siguiente
      if (r.status === 404 || /model/i.test(lastErr)) continue;
      return { ok:false, error:lastErr };
    }
    const text = d?.content?.[0]?.text || 'Sin respuesta';
    return { ok:true, text };
  }
  return { ok:false, error:lastErr };
}

// ── Llamada a Gemini ──────────────────────────────────────────────────────────
// Lista fija de repuesto, por si falla la consulta en vivo a Google (ej. sin red).
// No es la fuente principal — Google va dando de baja nombres de modelo con el
// tiempo, así que primero le preguntamos a la propia API qué tiene disponible.
const GEMINI_MODELS_FALLBACK = [
  ['v1beta','gemini-2.5-flash'],
  ['v1beta','gemini-2.0-flash'],
  ['v1beta','gemini-2.5-pro'],
];

// Pregunta a Gemini qué modelos están disponibles AHORA para esta key y
// soportan generateContent — así nunca dependemos de un nombre fijo que
// Google puede descontinuar en cualquier momento. Timeout corto: si Google
// tarda en contestar esto, mejor seguir directo con la lista fija de repuesto.
async function listGeminiModels(key) {
  try {
    const r = await fetchT(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=50`, {}, 6000);
    const d = await r.json();
    if (!r.ok || !Array.isArray(d.models)) return [];
    const names = d.models
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => (m.name || '').replace(/^models\//, ''))
      .filter(n => /gemini/i.test(n));
    // Preferir "flash" primero: en el plan gratis suele tener cuota real, mientras que
    // los modelos "pro" muchas veces tienen cuota 0 en el free tier y fallan siempre.
    // Penalizar "lite"/"exp"/"preview" (menos capaces o inestables).
    const score = n => (/flash/i.test(n) ? 2 : /pro/i.test(n) ? 1 : 0)
      - (/lite/i.test(n) ? 0.3 : 0) - (/exp|preview|thinking/i.test(n) ? 0.3 : 0);
    names.sort((a, b) => score(b) - score(a));
    return names.map(n => ['v1beta', n]);
  } catch(_e) { return []; }
}

async function callGemini(messages, key) {
  // Convertir formato Anthropic → Gemini parts
  const parts = [];
  for (const msg of messages) {
    for (const block of (Array.isArray(msg.content) ? msg.content : [{type:'text',text:msg.content}])) {
      if (block.type === 'image') parts.push({ inlineData:{ mimeType:block.source.media_type, data:block.source.data } });
      else if (block.type === 'text') parts.push({ text: block.text });
    }
  }

  const discovered = await listGeminiModels(key);
  const seen = new Set();
  // Como mucho 3 modelos en fila: cada intento ya tiene su propio timeout, pero
  // si probamos demasiados en serie la función entera puede exceder el límite
  // de tiempo de Vercel y la plataforma la corta con una respuesta rota.
  const candidates = [...discovered, ...GEMINI_MODELS_FALLBACK]
    .filter(([, m]) => { if (seen.has(m)) return false; seen.add(m); return true; })
    .slice(0, 3);

  let lastErr = 'No hay modelos Gemini disponibles para esta key';
  let timedOut = false;
  for (const [ver, model] of candidates) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
    let r;
    try {
      r = await fetchT(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents:[{ role:'user', parts }], generationConfig:{ maxOutputTokens:1200, temperature:0.2 } }),
      }, 18000);
    } catch(_e) { timedOut = true; lastErr = 'El modelo ' + model + ' tardó demasiado en responder'; continue; }
    let d; try { d = await r.json(); } catch(_e) { continue; }
    if (!r.ok) {
      const msg = d?.error?.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) return { ok:false, error:'INVALID_KEY' };
      lastErr = msg || lastErr;
      continue; // probar siguiente modelo
    }
    const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Respuesta vacía (bloqueo de seguridad, modelo sin cuota, etc.) → probar el siguiente modelo
    // en vez de devolverle al usuario un resultado vacío como si fuera válido.
    if (!text) { lastErr = 'Respuesta vacía del modelo ' + model; continue; }
    if (text.includes('no longer available') || text.includes('please update your code')) { lastErr = text; continue; }
    return { ok:true, text };
  }
  // Mensaje legible según la causa, en vez de mostrarle al usuario el bloque
  // crudo de texto en inglés de Google.
  if (/exceeded your current quota|RESOURCE_EXHAUSTED|quota/i.test(lastErr)) {
    lastErr = 'Se agotó la cuota gratuita de IA por ahora (el modelo con más capacidad no está incluido en el plan gratis). Esperá un rato y probá de nuevo, o usá otra API key.';
  } else if (timedOut) {
    lastErr = 'La IA tardó demasiado en responder — puede ser la conexión. Probá de nuevo, con mejor señal si es posible.';
  }
  return { ok:false, error:lastErr };
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: { ...CORS, 'Access-Control-Allow-Methods':'POST', 'Access-Control-Allow-Headers':'Content-Type, x-user-key' }
  });
  if (req.method !== 'POST') return new Response('Method not allowed', { status:405 });

  const key = req.headers.get('x-user-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return new Response(JSON.stringify({ error:{ message:'NO_KEY' } }), { status:401, headers:CORS });

  let body;
  try { body = await req.json(); }
  catch(_e) { return new Response(JSON.stringify({ error:{ message:'Pedido inválido — intentá de nuevo' } }), { status:400, headers:CORS }); }
  const messages = body.messages || [];

  // Detectar proveedor por prefijo de key
  const isAnthropic = key.startsWith('sk-ant-') || key.startsWith('sk-');
  let result;
  try {
    result = isAnthropic
      ? await callAnthropic(messages, key)
      : await callGemini(messages, key);
  } catch(_e) {
    return new Response(JSON.stringify({ error:{ message:'Error inesperado del servidor — intentá de nuevo' } }), { status:500, headers:CORS });
  }

  if (!result.ok) {
    if (result.error === 'INVALID_KEY') return new Response(JSON.stringify({ error:{ message:'INVALID_KEY' } }), { status:401, headers:CORS });
    return new Response(JSON.stringify({ error:{ message:result.error } }), { status:500, headers:CORS });
  }
  return new Response(JSON.stringify({ content:[{ type:'text', text:result.text }] }), { headers:CORS });
}
