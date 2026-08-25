// ─── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:     "#F4F5FB",
  surf:   "#FFFFFF",
  surf2:  "#ECEEF8",
  bord:   "#D8DCF0",
  text:   "#1E2340",
  dim:    "#7B85B0",
  amber:  "#FF8C42",
  blue:   "#3B9EEB",
  green:  "#1DB98A",
  red:    "#E84855",
  purple: "#8B5CF6",
  teal:   "#0EA5E9",
  yellow: "#F59E0B",
};

// Color de acento por herramienta
const TOOL_COLOR = {
  resistencias: "#FF8C42",
  integrados:   "#E84855",
  distancia:    "#3B9EEB",
  tacometro:    "#94A3B8",
  jack:         "#0EA5E9",
  decibeles:    "#8B5CF6",
  nivel:        "#1DB98A",
  oscilo:       "#F59E0B",
};

const MONO = "'JetBrains Mono','Courier New',monospace";
const UI   = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const SCAN = `repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)`;

// Glow por color
const glow = (color, alpha=0.35) => {
  const map = {
    "#FF8C42": `0 4px 14px rgba(255,140,66,${alpha})`,
    "#E84855": `0 4px 14px rgba(232,72,85,${alpha})`,
    "#3B9EEB": `0 4px 14px rgba(59,158,235,${alpha})`,
    "#8B5CF6": `0 4px 14px rgba(139,92,246,${alpha})`,
    "#1DB98A": `0 4px 14px rgba(29,185,138,${alpha})`,
    "#0EA5E9": `0 4px 14px rgba(14,165,233,${alpha})`,
    "#F59E0B": `0 4px 14px rgba(245,158,11,${alpha})`,
  };
  return map[color] || `0 4px 14px rgba(30,35,64,${alpha})`;
};

const S = {
  app:  { display:"flex", flexDirection:"column", height:"100vh", background:C.bg,
          fontFamily:UI, color:C.text, overflow:"hidden" },
  hdr:  { padding:"12px 16px 10px", borderBottom:`1px solid ${C.bord}`,
          background:C.surf, display:"flex", alignItems:"center", gap:10, minHeight:52,
          boxShadow:"0 2px 8px rgba(30,35,64,0.06)" },
  logo: { fontFamily:MONO, fontSize:17, fontWeight:700, color:C.amber, letterSpacing:"-0.5px" },
  sub:  { fontFamily:MONO, fontSize:8, color:C.dim, letterSpacing:2, marginTop:1 },
  body: { flex:1, overflowY:"auto", padding:"16px 14px 8px" },
  nav:  { display:"flex", background:C.surf, borderTop:`1px solid ${C.bord}`,
          boxShadow:"0 -2px 8px rgba(30,35,64,0.05)" },
  nb:   (a,col)=>({ flex:1, border:"none", background:"none", padding:"9px 4px 11px",
                color: a ? (col||C.amber) : C.dim, cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                fontSize:18, borderTop: a ? `2.5px solid ${col||C.amber}` : "2.5px solid transparent",
                transition:"color .15s" }),
  nl:   { fontSize:8, fontFamily:MONO, letterSpacing:.5 },
  wrap: { display:"flex", flexDirection:"column", gap:14, paddingBottom:10 },
  st:   (col)=>({ fontFamily:MONO, fontSize:10, letterSpacing:2, color:col||C.dim,
                  textTransform:"uppercase", marginBottom:2, fontWeight:700 }),
  disp: { background:"#080B14", border:`1px solid ${C.bord}`, borderRadius:10,
          padding:"14px 18px", backgroundImage:SCAN },
  dval: { fontFamily:MONO, fontSize:38, fontWeight:700, color:C.amber, lineHeight:1 },
  dunt: { fontFamily:MONO, fontSize:12, color:C.dim, marginLeft:6 },
  dlbl: { fontFamily:MONO, fontSize:9, color:C.dim, letterSpacing:2, marginTop:3 },

  btn: (v="p", col) => {
    const bg = v==="p" ? (col||C.amber)
             : v==="b" ? C.blue
             : v==="g" ? C.green
             : v==="r" ? C.red
             : C.surf2;
    const isColored = v !== "s";
    return {
      border:"none", borderRadius:10, padding:"12px 16px",
      fontFamily:MONO, fontSize:12, fontWeight:700,
      cursor:"pointer", letterSpacing:.4, width:"100%",
      background: isColored
        ? `linear-gradient(180deg, ${bg} 0%, ${bg}CC 100%)`
        : C.surf2,
      color: isColored ? "#FFF" : C.text,
      boxShadow: isColored
        ? `${glow(bg, 0.3)}, 0 2px 4px rgba(0,0,0,0.08)`
        : "0 1px 3px rgba(30,35,64,0.08)",
      transition:"transform .1s, box-shadow .1s",
    };
  },

  vid:  { width:"100%", borderRadius:10, border:`1px solid ${C.bord}`,
          background:"#000", maxHeight:220, objectFit:"cover", display:"block" },
  res:  { background:C.surf, borderRadius:10, padding:14, border:`1px solid ${C.bord}`,
          boxShadow:"0 2px 8px rgba(30,35,64,0.06)" },
  row:  { display:"flex", gap:8 },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },

  card: (col) => ({
    background:C.surf, borderRadius:14,
    boxShadow:"0 2px 10px rgba(30,35,64,0.08), 0 1px 3px rgba(30,35,64,0.04)",
    border:`1px solid ${C.bord}`,
    cursor:"pointer", display:"flex", flexDirection:"column", gap:6,
    overflow:"hidden", position:"relative",
    borderTop:`3px solid ${col||C.amber}`,
    padding:"14px 13px 12px",
    transition:"transform .12s, box-shadow .12s",
  }),

  note: { fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.7,
          background:C.surf2, borderRadius:8, padding:"8px 12px" },
  tag:  (ok)=>({ background:ok?`${C.green}18`:`${C.red}18`,
                  border:`1px solid ${ok?C.green:C.red}55`,
                  borderRadius:8, padding:"10px 14px",
                  fontFamily:MONO, fontSize:12, color:ok?C.green:C.red,
                  fontWeight:700 }),
  inp:  { background:C.surf, border:`1px solid ${C.bord}`, borderRadius:8,
          padding:"11px 13px", color:C.text, fontFamily:MONO, fontSize:13,
          width:"100%", boxSizing:"border-box",
          boxShadow:"inset 0 1px 3px rgba(30,35,64,0.06)" },
  sel:  { background:C.surf, border:`1px solid ${C.bord}`, borderRadius:8,
          padding:"10px 11px", color:C.text, fontFamily:MONO, fontSize:11,
          width:"100%", boxShadow:"inset 0 1px 3px rgba(30,35,64,0.06)" },
  pill: (col)=>({ background:`${col}18`, border:`1px solid ${col}44`,
                   borderRadius:20, padding:"4px 10px", fontFamily:MONO,
                   fontSize:10, color:col, fontWeight:700 }),
};

// ─── Claude API ───────────────────────────────────────────────────────────────
async function askClaude(b64, prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:1000,
      messages:[{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 } },
        { type:"text", text:prompt }
      ]}]
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "Sin respuesta";
}

// ─── CameraView ───────────────────────────────────────────────────────────────
function CameraView({ captureLabel="📷 Capturar", onCapture, onStream }) {
  const vRef  = useRef();
  const cRef  = useRef();
  const tkRef = useRef(null);
  const [on,         setOn]        = useState(false);
  const [err,        setErr]       = useState(null);
  const [devices,    setDevices]   = useState([]);
  const [selDev,     setSelDev]    = useState("environment");
  const [torchOn,    setTorchOn]   = useState(false);
  const [torchAvail, setTorchAvail]= useState(false);

  const stop = useCallback(() => {
    vRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (vRef.current) vRef.current.srcObject = null;
    tkRef.current = null;
    setOn(false); setTorchOn(false); setTorchAvail(false);
    onStream?.(null);
  }, [onStream]);

  const start = useCallback(async (deviceId) => {
    try {
      stop();
      const did = deviceId ?? selDev;
      const constraints = {
        video: (did === "environment" || did === "user")
          ? { facingMode: did, width: { ideal: 1280 } }
          : { deviceId: { exact: did }, width: { ideal: 1280 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      vRef.current.srcObject = stream;
      await vRef.current.play();
      const track = stream.getVideoTracks()[0];
      tkRef.current = track;
      const caps = track.getCapabilities?.() || {};
      setTorchAvail(!!caps.torch);
      setOn(true); setErr(null);
      onStream?.(stream);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter(d => d.kind === "videoinput"));
    } catch(e) { setErr("Sin acceso a cámara: " + e.message); }
  }, [selDev, stop, onStream]);

  const switchDev = async (did) => { setSelDev(did); if (on) await start(did); };

  const toggleTorch = async () => {
    if (!tkRef.current) return;
    const next = !torchOn;
    try { await tkRef.current.applyConstraints({ advanced: [{ torch: next }] }); setTorchOn(next); }
    catch(e) { setErr("Torch no soportado"); }
  };

  const capture = () => {
    const v = vRef.current, c = cRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0);
    const b64 = c.toDataURL("image/jpeg", 0.85).split(",")[1];
    onCapture?.(b64, c);
  };

  useEffect(() => () => stop(), [stop]);

  return (
    <>
      <video ref={vRef} style={S.vid} playsInline muted />
      <canvas ref={cRef} style={{ display:"none" }} />
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11 }}>{err}</div>}
      {devices.length > 1 && on && (
        <select style={S.sel} value={selDev} onChange={e => switchDev(e.target.value)}>
          <option value="environment">📷 Cámara trasera</option>
          <option value="user">🤳 Frontal</option>
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || "Cámara USB / Endoscopio"}</option>
          ))}
        </select>
      )}
      <div style={S.row}>
        <button style={{ ...S.btn(on ? "s" : "p", C.amber), flex: on ? 0.55 : 1 }}
          onClick={() => on ? stop() : start()}>
          {on ? "Apagar" : "Activar cámara"}
        </button>
        {torchAvail && on && (
          <button style={{ ...S.btn("s"), flex:0.45, background:torchOn?C.yellow:C.surf2, color:torchOn?"#000":C.text }}
            onClick={toggleTorch}>
            {torchOn ? "🔦 ON" : "🔦 OFF"}
          </button>
        )}
        {on && onCapture && (
          <button style={{ ...S.btn("p", C.amber), flex:1 }} onClick={capture}>{captureLabel}</button>
        )}
      </div>
    </>
  );
}

// ─── Resistencias ─────────────────────────────────────────────────────────────
function ToolResistencias() {
  const col = TOOL_COLOR.resistencias;
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const analyze = async (b64) => {
    setLoading(true); setResult(null);
    try {
      const r = await askClaude(b64,
        "Analizá esta resistencia electrónica.\n" +
        "Identificá las bandas de color y respondé EXACTAMENTE así:\n" +
        "BANDAS: [colores de izq a der]\nVALOR: [valor con unidad, ej: 4.7 kΩ]\n" +
        "TOLERANCIA: [±%]\nTIPO: [4 o 5 bandas]\n" +
        "Si no hay resistencia visible respondé: SIN COMPONENTE");
      setResult(r);
    } catch(e) { setResult("⚠ " + e.message); }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Lector de Resistencias</div>
      <CameraView captureLabel={loading ? "Analizando…" : "📷 Leer bandas"} onCapture={loading ? null : analyze} />
      {result && (
        <div style={S.res}>
          <div style={{ fontFamily:MONO, fontSize:9, color:col, marginBottom:6, fontWeight:700 }}>RESULTADO</div>
          <pre style={{ fontFamily:MONO, fontSize:12, color:C.text, whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{result}</pre>
        </div>
      )}
      <div style={S.note}>Activá la cámara, apuntá a la resistencia con buena luz y presioná Leer bandas.</div>
    </div>
  );
}

// ─── Integrados ───────────────────────────────────────────────────────────────
function ToolIntegrado() {
  const col = TOOL_COLOR.integrados;
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const analyze = async (b64) => {
    setLoading(true); setResult(null);
    try {
      const r = await askClaude(b64,
        "Analizá este componente electrónico (IC/integrado).\n" +
        "Respondé con este formato:\n\n" +
        "MARKING: [texto en el chip]\nCOMPONENTE: [nombre completo]\n" +
        "FUNCIÓN: [descripción breve]\nENCAPSULADO: [tipo y pines]\n" +
        "CÓMO PROBARLO:\n[pasos numerados para técnico biomédico]\n" +
        "EQUIVALENTE: [sustituto si existe]\n\n" +
        "Si no hay componente: SIN COMPONENTE");
      setResult(r);
    } catch(e) { setResult("⚠ " + e.message); }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Identificador de Integrados</div>
      <CameraView captureLabel={loading ? "Identificando…" : "📷 Identificar IC"} onCapture={loading ? null : analyze} />
      {result && (
        <div style={S.res}>
          <div style={{ fontFamily:MONO, fontSize:9, color:col, marginBottom:6, fontWeight:700 }}>RESULTADO</div>
          <pre style={{ fontFamily:MONO, fontSize:12, color:C.text, whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{result}</pre>
        </div>
      )}
      <div style={S.note}>Enfocá el marking del IC con buena luz. Claude identifica el chip y describe cómo probarlo.</div>
    </div>
  );
}

// ─── Distancia ────────────────────────────────────────────────────────────────
function ToolDistancia() {
  const col = TOOL_COLOR.distancia;
  const [mode, setMode] = useState(null); // null=elegir, "claude", "tap"
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [captured, setCaptured] = useState(null);
  const [phase, setPhase] = useState("ref1");
  const [pts,   setPts]   = useState([]);
  const [refMM, setRefMM] = useState("85.6");
  const tapCanvas = useRef();

  const reset = () => { setCaptured(null); setResult(null); setPts([]); setPhase("ref1"); setMode(null); };

  const onCapture = async (b64, canvas) => {
    setCaptured(b64); setResult(null);
    if (mode === "claude") {
      setLoading(true);
      try {
        const r = await askClaude(b64,
          "Esta foto contiene objetos para medir distancias.\n" +
          "Si ves un objeto de referencia conocido (tarjeta de crédito 85.6×54mm, moneda, regla), usalo como escala.\n" +
          "Estimá las distancias entre los objetos visibles.\n" +
          "Formato:\nREFERENCIA: [objeto usado]\nMEDIDAS:\n[lista con tamaños en cm]\nDISTANCIAS:\n[entre objetos relevantes]\nPRECISIÓN: [±X%]");
        setResult(r);
      } catch(e) { setResult("⚠ " + e.message); }
      setLoading(false);
    } else {
      setTimeout(() => {
        const tc = tapCanvas.current; if (!tc) return;
        const img = new Image();
        img.onload = () => { tc.getContext("2d").drawImage(img, 0, 0, tc.width, tc.height); };
        img.src = "data:image/jpeg;base64," + b64;
        setPts([]); setPhase("ref1");
      }, 100);
    }
  };

  const handleTap = (e) => {
    if (!captured || mode !== "tap") return;
    const tc = tapCanvas.current;
    const rect = tc.getBoundingClientRect();
    const scaleX = tc.width / rect.width, scaleY = tc.height / rect.height;
    const touch = e.touches?.[0] || e;
    const px = (touch.clientX - rect.left) * scaleX;
    const py = (touch.clientY - rect.top) * scaleY;
    const ctx = tc.getContext("2d");
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = phase === "target" ? C.green : C.amber; ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    const newPts = [...pts, { x:px, y:py }];
    setPts(newPts);
    if (phase === "ref1") { setPhase("ref2"); }
    else if (phase === "ref2") {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(px, py);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.setLineDash([8, 4]); ctx.stroke(); ctx.setLineDash([]);
      setPhase("target");
    } else {
      const [p1, p2, p3] = newPts;
      const refPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const scale = parseFloat(refMM) / refPx;
      const dist1 = Math.hypot(p3.x - p1.x, p3.y - p1.y) * scale;
      const dist2 = Math.hypot(p3.x - p2.x, p3.y - p2.y) * scale;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p3.x, p3.y);
      ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.stroke();
      setResult(`Desde P1: ${(dist1/10).toFixed(1)} cm  (${dist1.toFixed(0)} mm)\nDesde P2: ${(dist2/10).toFixed(1)} cm  (${dist2.toFixed(0)} mm)\nEscala: ${scale.toFixed(2)} mm/px`);
      setPhase("done");
    }
  };

  const phaseLabel = { ref1:"Tocá PUNTO 1 de la referencia", ref2:"Tocá PUNTO 2 de la referencia", target:"Tocá el punto a medir", done:"✓ Listo" };

  if (!mode) return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Medidor de Distancia</div>
      <div style={{ ...S.note, textAlign:"center", padding:16 }}>¿Cómo querés medir?</div>
      <button style={S.btn("p", col)} onClick={() => setMode("claude")}>
        🤖  Claude estima con IA
      </button>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, textAlign:"center" }}>
        Tomá una foto con un objeto de referencia (ej: tarjeta de crédito)
      </div>
      <button style={S.btn("s")} onClick={() => setMode("tap")}>
        ✋  Medir tocando la pantalla
      </button>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, textAlign:"center" }}>
        Tocás 2 puntos de referencia conocida → luego el punto a medir
      </div>
    </div>
  );

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Medidor de Distancia — {mode === "claude" ? "IA" : "Toque"}</div>
      {mode === "tap" && !captured && (
        <div style={S.row}>
          <span style={{ fontFamily:MONO, fontSize:10, color:C.dim, alignSelf:"center", whiteSpace:"nowrap" }}>Ref mm:</span>
          <input style={{ ...S.inp, flex:1 }} type="number" value={refMM} onChange={e => setRefMM(e.target.value)} />
        </div>
      )}
      {mode === "tap" && captured && (
        <div style={{ ...S.pill(col), textAlign:"center", fontSize:11 }}>{phaseLabel[phase]}</div>
      )}
      {!captured
        ? <CameraView captureLabel={loading ? "Analizando…" : "📷 Capturar"} onCapture={loading ? null : onCapture} />
        : <>
            {mode === "tap" && (
              <canvas ref={tapCanvas} width={640} height={360}
                style={{ width:"100%", borderRadius:8, border:`1px solid ${C.bord}`, cursor:"crosshair" }}
                onClick={handleTap} onTouchEnd={handleTap} />
            )}
            <button style={S.btn("s")} onClick={reset}>↺ Volver a empezar</button>
          </>
      }
      {result && (
        <div style={S.res}>
          <pre style={{ fontFamily:MONO, fontSize:13, color:C.text, whiteSpace:"pre-wrap", margin:0, lineHeight:1.8 }}>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Módulo ───────────────────────────────────────────────────────
function ModulePlaceholder({ icon, title, why, when }) {
  return (
    <div style={S.wrap}>
      <div style={{ textAlign:"center", padding:"24px 8px" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
        <div style={{ fontFamily:MONO, fontSize:16, fontWeight:700, color:C.dim, marginBottom:8 }}>{title}</div>
        <div style={{ fontFamily:MONO, fontSize:11, color:C.dim, lineHeight:1.8, marginBottom:16 }}>{why}</div>
        <div style={{ ...S.pill(C.teal), display:"inline-block", fontSize:11 }}>
          📦 Próximamente como módulo externo
        </div>
        <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, marginTop:12, lineHeight:1.7 }}>{when}</div>
      </div>
    </div>
  );
}

// ─── Lector Jack ──────────────────────────────────────────────────────────────
const JACK_MODULES = [
  { id:"thermo", label:"Temperatura",   unit:"°C",  icon:"🌡",  convert:v => v * 100 - 40, col:"#E84855" },
  { id:"air",    label:"Flujo de aire", unit:"m/s", icon:"💨",  convert:v => Math.sqrt(Math.max(0, v) * 8), col:"#0EA5E9" },
  { id:"volt",   label:"Voltaje CC",    unit:"V",   icon:"⚡",  convert:v => v * 30, col:"#F59E0B" },
  { id:"light",  label:"Luminosidad",   unit:"lux", icon:"☀️",  convert:v => Math.pow(v * 10, 2.5), col:"#8B5CF6" },
  { id:"raw",    label:"Señal cruda",   unit:"mV",  icon:"〜",  convert:v => v * 1000, col:"#1DB98A" },
];

function ToolJack() {
  const col = TOOL_COLOR.jack;
  const [on,     setOn]    = useState(false);
  const [module, setModule]= useState("thermo");
  const [val,    setVal]   = useState(null);
  const [peak,   setPeak]  = useState(null);
  const [minVal, setMin]   = useState(null);
  const [err,    setErr]   = useState(null);
  const anlRef = useRef(), rafRef = useRef(), stRef = useRef(), canRef = useRef();
  const mod = JACK_MODULES.find(m => m.id === module);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
      stRef.current = stream;
      const actx = new AudioContext();
      const src = actx.createMediaStreamSource(stream);
      const anl = actx.createAnalyser(); anl.fftSize = 1024; src.connect(anl); anlRef.current = anl;
      setOn(true); setErr(null);
      const td = new Float32Array(anl.fftSize);
      const draw = () => {
        anl.getFloatTimeDomainData(td);
        let rms = 0; for (let i = 0; i < td.length; i++) rms += td[i] * td[i];
        rms = Math.sqrt(rms / td.length);
        const derived = mod.convert(rms);
        setVal(derived);
        setPeak(p => p === null || derived > p ? derived : p);
        setMin(m => m === null || derived < m ? derived : m);
        const c = canRef.current; if (!c) { rafRef.current = requestAnimationFrame(draw); return; }
        const cx = c.getContext("2d"), W = c.width, H = c.height;
        cx.fillStyle = "#080B14"; cx.fillRect(0, 0, W, H);
        cx.strokeStyle = "#1A2540"; cx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { cx.beginPath(); cx.moveTo(0, H*i/4); cx.lineTo(W, H*i/4); cx.stroke(); }
        cx.strokeStyle = mod.col; cx.lineWidth = 2; cx.beginPath();
        const sw = W / td.length; let x = 0;
        for (let i = 0; i < td.length; i++) { const y = (1 - td[i]) * H / 2; i === 0 ? cx.moveTo(x,y) : cx.lineTo(x,y); x += sw; }
        cx.stroke();
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    } catch(e) { setErr("Sin acceso al jack: " + e.message); }
  };

  const stop = () => { cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t => t.stop()); setOn(false); setVal(null); };
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const fmt = (v) => {
    if (v === null || isNaN(v)) return "---";
    if (Math.abs(v) < 10) return v.toFixed(2);
    if (Math.abs(v) < 100) return v.toFixed(1);
    return Math.round(v).toString();
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Módulos Analógicos — Jack 3.5mm</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
        {JACK_MODULES.map(m => (
          <button key={m.id} style={{
            border: module===m.id ? `2px solid ${m.col}` : `1px solid ${C.bord}`,
            borderRadius:10, padding:"8px 4px", background: module===m.id ? `${m.col}15` : C.surf,
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            boxShadow: module===m.id ? glow(m.col, 0.2) : "none"
          }} onClick={() => { setModule(m.id); setPeak(null); setMin(null); }}>
            <span style={{ fontSize:18 }}>{m.icon}</span>
            <span style={{ fontFamily:MONO, fontSize:9, color:module===m.id ? m.col : C.dim, fontWeight:700 }}>{m.label}</span>
          </button>
        ))}
      </div>
      <div style={{ ...S.disp, borderTop:`3px solid ${mod.col}` }}>
        <span style={{ ...S.dval, color:mod.col }}>{fmt(val)}</span>
        <span style={S.dunt}>{mod.unit}</span>
        <div style={S.dlbl}>{mod.icon} {mod.label.toUpperCase()}</div>
      </div>
      <canvas ref={canRef} width={640} height={100}
        style={{ width:"100%", borderRadius:8, border:`1px solid ${C.bord}`, background:"#080B14" }} />
      {(peak !== null || minVal !== null) && (
        <div style={S.row}>
          <div style={{ ...S.disp, flex:1, textAlign:"center", padding:"10px 8px" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>MÍN</div>
            <div style={{ fontFamily:MONO, fontSize:22, color:C.blue }}>{fmt(minVal)} {mod.unit}</div>
          </div>
          <div style={{ ...S.disp, flex:1, textAlign:"center", padding:"10px 8px" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>MÁX</div>
            <div style={{ fontFamily:MONO, fontSize:22, color:C.red }}>{fmt(peak)} {mod.unit}</div>
          </div>
          <button style={{ ...S.btn("s"), flex:0.5, padding:"8px 4px", fontSize:11 }} onClick={() => { setPeak(null); setMin(null); }}>Reset</button>
        </div>
      )}
      {err && <div style={{ color:C.amber, fontFamily:MONO, fontSize:10, lineHeight:1.6 }}>{err}</div>}
      {!on ? <button style={S.btn("p", col)} onClick={start}>Conectar sensor Jack</button>
           : <button style={S.btn("r")} onClick={stop}>Desconectar</button>}
      <div style={S.note}>Construí el sensor con el manual descargable. Conectá al jack 3.5mm y presioná Conectar.</div>
    </div>
  );
}

// ─── Decibelímetro ────────────────────────────────────────────────────────────
function ToolDecibeles() {
  const col = TOOL_COLOR.decibeles;
  const [db, setDb]    = useState(null);
  const [peak, setPeak]= useState(null);
  const [on, setOn]    = useState(false);
  const [err, setErr]  = useState(null);
  const anlRef = useRef(), rafRef = useRef(), stRef = useRef();

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stRef.current = s;
      const actx = new AudioContext();
      const src = actx.createMediaStreamSource(s);
      const anl = actx.createAnalyser(); anl.fftSize = 512; src.connect(anl); anlRef.current = anl;
      setOn(true); setErr(null);
      const buf = new Float32Array(anl.fftSize);
      const tick = () => {
        anl.getFloatTimeDomainData(buf);
        let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        const v = rms > 0 ? Math.max(0, 20 * Math.log10(rms) + 90) : 0;
        setDb(v.toFixed(1));
        setPeak(p => p === null || v > parseFloat(p) ? v.toFixed(1) : p);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch(e) { setErr("Sin micrófono: " + e.message); }
  };

  const stop = () => { cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t => t.stop()); setOn(false); setDb(null); };
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const v = parseFloat(db) || 0;
  const pct = Math.min(v / 120 * 100, 100);
  const bc = v < 60 ? C.green : v < 80 ? C.amber : C.red;
  const label = v < 45 ? "SILENCIOSO" : v < 60 ? "AMBIENTE" : v < 75 ? "CONVERSACIÓN" : v < 90 ? "RUIDOSO" : "⚠ PELIGROSO";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Decibelímetro SPL</div>
      <div style={{ ...S.disp, borderTop:`3px solid ${col}` }}>
        <span style={{ ...S.dval, color:col }}>{db ?? "---"}</span>
        <span style={S.dunt}>dB</span>
        <div style={S.dlbl}>{on ? label : "NIVEL SPL"}</div>
      </div>
      <div style={{ background:C.surf2, borderRadius:8, height:14, overflow:"hidden", border:`1px solid ${C.bord}` }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg, ${C.green}, ${bc})`,
                      transition:"width .06s", borderRadius:8,
                      boxShadow: pct > 70 ? glow(C.red, 0.4) : "none" }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:MONO, fontSize:9, color:C.dim }}>
        <span>0</span><span>30</span><span>60</span><span>90</span><span>120 dB</span>
      </div>
      {peak && (
        <div style={{ ...S.disp, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>PICO MÁXIMO</div>
            <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700, color:C.red }}>{peak} dB</div>
          </div>
          <button style={{ ...S.btn("s"), width:"auto", padding:"8px 14px", fontSize:11 }} onClick={() => setPeak(null)}>Reset</button>
        </div>
      )}
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11 }}>{err}</div>}
      {!on
        ? <button style={S.btn("p", col)} onClick={start}>Activar micrófono</button>
        : <button style={S.btn("r")} onClick={stop}>Detener</button>
      }
    </div>
  );
}

// ─── Nivel — dos modelos ──────────────────────────────────────────────────────
function ToolNivel() {
  const col = TOOL_COLOR.nivel;
  const [model, setModel] = useState("bubble"); // "bubble" | "horizon"
  const [ang, setAng] = useState({ b:0, g:0 });
  const [on,  setOn]  = useState(false);
  const [err, setErr] = useState(null);
  const hRef = useRef(null);

  const start = async () => {
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      try {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== "granted") { setErr("Permiso denegado por el sistema"); return; }
      } catch(e) { setErr(e.message); return; }
    }
    const h = (e) => {
      const b = e.beta  || 0;
      const g = e.gamma || 0;
      setAng({ b, g });
    };
    hRef.current = h;
    window.addEventListener("deviceorientation", h, true);
    setOn(true); setErr(null);
  };

  const stop = () => {
    if (hRef.current) window.removeEventListener("deviceorientation", hRef.current, true);
    setOn(false); setAng({ b:0, g:0 });
  };

  useEffect(() => () => {
    if (hRef.current) window.removeEventListener("deviceorientation", hRef.current, true);
  }, []);

  const gx = ang.g, gy = ang.b;
  // Burbuja: negado para que vaya al lado alto (comportamiento físico correcto)
  const bx = Math.max(-38, Math.min(38, -gx * 1.4));
  const by = Math.max(-38, Math.min(38, -gy * 1.4));
  const flat = Math.abs(gx) < 1.5 && Math.abs(gy) < 1.5;

  // Nivel horizonte: ángulo de rotación de la línea
  const horizAngle = gx; // gamma = inclinación lateral
  const horizFlat = Math.abs(gx) < 1.5;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Nivel Digital</div>

      {/* Selector de modelo */}
      <div style={S.row}>
        {[["bubble","🔵 Burbuja 2D"],["horizon","📐 Horizonte"]].map(([m,label]) => (
          <button key={m} style={{
            ...S.btn(model===m?"p":"s", col), flex:1, fontSize:11
          }} onClick={() => setModel(m)}>{label}</button>
        ))}
      </div>

      {/* ── Modelo 1: Burbuja ── */}
      {model === "bubble" && (
        <div style={{ background:"#080B14", border:`1px solid ${C.bord}`, borderRadius:12,
                      display:"flex", justifyContent:"center", padding:24, backgroundImage:SCAN }}>
          <div style={{ position:"relative", width:200, height:200 }}>
            {/* Círculos de referencia */}
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${C.bord}`, background:"#0C1020" }} />
            <div style={{ position:"absolute", inset:20, borderRadius:"50%", border:`1px solid ${C.bord}44` }} />
            <div style={{ position:"absolute", inset:40, borderRadius:"50%", border:`1px solid ${C.bord}44` }} />
            {/* Cruces */}
            <div style={{ position:"absolute", top:"50%", left:10, right:10, height:1, background:`${C.bord}66`, transform:"translateY(-50%)" }} />
            <div style={{ position:"absolute", left:"50%", top:10, bottom:10, width:1, background:`${C.bord}66`, transform:"translateX(-50%)" }} />
            {/* Zona central nivelada */}
            <div style={{ position:"absolute", top:"50%", left:"50%", width:22, height:22,
                          marginTop:-11, marginLeft:-11, borderRadius:"50%",
                          border:`1.5px solid ${flat ? col : C.bord}55`, transition:"border-color .3s" }} />
            {/* Burbuja */}
            <div style={{ position:"absolute", top:"50%", left:"50%",
                          width:32, height:32, marginTop:-16, marginLeft:-16,
                          transform:`translate(${bx}px,${by}px)`,
                          borderRadius:"50%", transition:"transform .08s ease-out",
                          background: flat
                            ? `radial-gradient(circle at 35% 35%,${col}CC,${col}66)`
                            : `radial-gradient(circle at 35% 35%,${C.blue}CC,${C.blue}66)`,
                          border:`2px solid ${flat ? col : C.blue}`,
                          boxShadow: flat ? `0 0 16px ${col}88` : `0 0 10px ${C.blue}44` }} />
          </div>
        </div>
      )}

      {/* ── Modelo 2: Horizonte ── */}
      {model === "horizon" && (
        <div style={{ background:"#080B14", border:`1px solid ${C.bord}`, borderRadius:12,
                      display:"flex", justifyContent:"center", alignItems:"center",
                      padding:24, minHeight:160, backgroundImage:SCAN, position:"relative", overflow:"hidden" }}>
          {/* Cielo / tierra */}
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column" }}>
            <div style={{ flex:1, background:"#0A1428" }} />
            <div style={{ flex:1, background:"#0C1A0C" }} />
          </div>
          {/* Línea de horizonte */}
          <div style={{ position:"relative", width:"90%", zIndex:2 }}>
            <div style={{ height:3, background: horizFlat ? col : C.amber,
                          borderRadius:3, transform:`rotate(${horizAngle}deg)`,
                          transition:"transform .06s ease-out",
                          boxShadow: horizFlat ? `0 0 12px ${col}` : `0 0 8px ${C.amber}` }} />
            {/* Marcas centrales */}
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}>
              <div style={{ width:12, height:12, border:`2px solid ${horizFlat ? col : C.amber}`,
                            borderRadius:"50%", background:"transparent" }} />
            </div>
          </div>
          {/* Ángulo */}
          <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
                        fontFamily:MONO, fontSize:11, color: horizFlat ? col : C.amber, fontWeight:700 }}>
            {horizAngle.toFixed(1)}°
          </div>
        </div>
      )}

      {/* Lecturas numéricas */}
      <div style={S.row}>
        <div style={{ ...S.disp, flex:1, textAlign:"center", borderTop:`3px solid ${col}` }}>
          <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700, color:col }}>{gx.toFixed(1)}°</div>
          <div style={S.dlbl}>LATERAL (γ)</div>
        </div>
        <div style={{ ...S.disp, flex:1, textAlign:"center", borderTop:`3px solid ${C.blue}` }}>
          <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700, color:C.blue }}>{gy.toFixed(1)}°</div>
          <div style={S.dlbl}>INC. (β)</div>
        </div>
      </div>

      {on && flat && <div style={S.tag(true)}>✓  NIVELADO  ±1.5°</div>}
      {on && !flat && <div style={S.tag(false)}>⊘  FUERA DE NIVEL</div>}
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11, lineHeight:1.6 }}>{err}</div>}

      {!on
        ? <button style={S.btn("p", col)} onClick={start}>Activar nivel</button>
        : <button style={S.btn("r")} onClick={stop}>Detener</button>
      }
      <div style={S.note}>Apoyá el celular sobre la superficie. El nivel se activa por el giroscopio del dispositivo.</div>
    </div>
  );
}

// ─── Osciloscopio ─────────────────────────────────────────────────────────────
function ToolOscilo() {
  const col = TOOL_COLOR.oscilo;
  const cRef = useRef(), anlRef = useRef(), rafRef = useRef(), stRef = useRef(), actxRef = useRef();
  const snapRef = useRef();
  const [on,      setOn]     = useState(false);
  const [freq,    setFreq]   = useState(null);
  const [err,     setErr]    = useState(null);
  const [snaps,   setSnaps]  = useState([]);
  const [trigger, setTrigger]= useState(null); // umbral de auto-snap

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stRef.current = s;
      const actx = new AudioContext(); actxRef.current = actx;
      const src = actx.createMediaStreamSource(s);
      const anl = actx.createAnalyser(); anl.fftSize = 8192; src.connect(anl); anlRef.current = anl;
      setOn(true); setErr(null);
      const DISP = 2048;
      const td = new Float32Array(anl.fftSize), fd = new Float32Array(anl.frequencyBinCount);
      const draw = () => {
        const c = cRef.current; if (!c) return;
        const cx = c.getContext("2d"), W = c.width, H = c.height;
        anl.getFloatTimeDomainData(td);
        cx.fillStyle = "#080B14"; cx.fillRect(0, 0, W, H);
        cx.strokeStyle = "#1A2540"; cx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { cx.beginPath(); cx.moveTo(0, H*i/4); cx.lineTo(W, H*i/4); cx.stroke(); }
        for (let i = 1; i < 8; i++) { cx.beginPath(); cx.moveTo(W*i/8, 0); cx.lineTo(W*i/8, H); cx.stroke(); }
        // Trigger
        let trig = 0;
        for (let i = 1; i < td.length - DISP; i++) {
          if (td[i-1] < 0 && td[i] >= 0) { trig = i; break; }
        }
        cx.strokeStyle = col; cx.lineWidth = 2; cx.beginPath();
        const sw = W / DISP;
        for (let i = 0; i < DISP; i++) {
          const y = (1 - td[trig + i]) * H / 2;
          i === 0 ? cx.moveTo(0, y) : cx.lineTo(i * sw, y);
        }
        cx.stroke();
        // Frecuencia con interpolación parabólica
        anl.getFloatFrequencyData(fd);
        let mi = 1, mv = -Infinity;
        for (let i = 1; i < fd.length - 1; i++) if (fd[i] > mv) { mv = fd[i]; mi = i; }
        if (mv > -80) {
          const a = fd[mi-1], b = fd[mi], cc = fd[mi+1];
          const refinedBin = mi + 0.5 * (a - cc) / (a - 2*b + cc + 1e-9);
          const fHz = refinedBin * actx.sampleRate / anl.fftSize;
          setFreq(fHz.toFixed(1));
          // Auto-snapshot por umbral
          snapRef.current = { td: td.slice(0), fHz, mv };
        } else { setFreq(null); }
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    } catch(e) { setErr("Sin micrófono: " + e.message); }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t => t.stop());
    actxRef.current?.close();
    setOn(false); setFreq(null);
  };

  const takeSnapshot = () => {
    const c = cRef.current; if (!c) return;
    const img = c.toDataURL("image/png");
    const info = snapRef.current;
    setSnaps(prev => [{ img, freq: info?.fHz?.toFixed(1), ts: new Date().toLocaleTimeString() }, ...prev.slice(0,4)]);
  };

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t => t.stop());
    actxRef.current?.close();
  }, []);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Osciloscopio de Audio</div>
      <canvas ref={cRef} width={640} height={200}
        style={{ width:"100%", borderRadius:10, border:`2px solid ${col}33`, background:"#080B14" }} />
      {freq && on && (
        <div style={{ ...S.disp, borderTop:`3px solid ${col}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <span style={{ ...S.dval, color:col, fontSize:32 }}>{freq}</span>
            <span style={S.dunt}>Hz</span>
            <div style={S.dlbl}>FRECUENCIA DOMINANTE</div>
          </div>
          {on && <button style={{ ...S.btn("s"), width:"auto", padding:"10px 14px", fontSize:11 }} onClick={takeSnapshot}>📸 Capturar</button>}
        </div>
      )}
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11 }}>{err}</div>}
      <div style={S.row}>
        {!on
          ? <button style={{ ...S.btn("p", col), flex:1 }} onClick={start}>Activar</button>
          : <>
              <button style={{ ...S.btn("r"), flex:1 }} onClick={stop}>Detener</button>
              <button style={{ ...S.btn("s"), flex:0.6, fontSize:11 }} onClick={takeSnapshot}>📸 Snap</button>
            </>
        }
      </div>
      {snaps.length > 0 && (
        <div style={{ ...S.res }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:col, marginBottom:8, fontWeight:700 }}>CAPTURAS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {snaps.map((s,i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"center" }}>
                <img src={s.img} alt="snap" style={{ width:120, borderRadius:6, border:`1px solid ${C.bord}` }} />
                <div>
                  <div style={{ fontFamily:MONO, fontSize:13, color:col, fontWeight:700 }}>{s.freq} Hz</div>
                  <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>{s.ts}</div>
                  <a href={s.img} download={`oscilo_${s.ts.replace(/:/g,"-")}.png`}
                    style={{ fontFamily:MONO, fontSize:9, color:C.blue }}>⬇ Descargar</a>
                </div>
              </div>
            ))}
            <button style={{ ...S.btn("s"), fontSize:10 }} onClick={() => setSnaps([])}>Borrar capturas</button>
          </div>
        </div>
      )}
      <div style={S.note}>20 Hz – 20 kHz · Resolución ~5 Hz · Presioná 📸 para guardar una captura de la forma de onda.</div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
const ALL_TOOLS = [
  { id:"resistencias", icon:"🔴", t:"Resistencias",    s:"Cámara + IA → valor Ω" },
  { id:"integrados",   icon:"◻",  t:"Integrados IC",   s:"Cámara + IA → ID + prueba" },
  { id:"distancia",    icon:"📏", t:"Distancia",        s:"Foto → medición por toque o IA" },
  { id:"jack",         icon:"🔌", t:"Sensores Jack",    s:"Temperatura · Flujo · Voltaje" },
  { id:"decibeles",    icon:"🔊", t:"Decibelímetro",    s:"Nivel de ruido SPL en dB" },
  { id:"nivel",        icon:"⦿",  t:"Nivel",            s:"Burbuja 2D + horizonte digital" },
  { id:"oscilo",       icon:"〜", t:"Osciloscopio",     s:"Forma de onda + capturas" },
  { id:"tacometro",    icon:"⚙️", t:"Tacómetro",        s:"Próximamente · por módulo" },
];

function Home({ onSel }) {
  return (
    <div>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, marginBottom:14, letterSpacing:2 }}>
        SELECCIONÁ UNA HERRAMIENTA
      </div>
      <div style={S.grid}>
        {ALL_TOOLS.map(c => {
          const ac = TOOL_COLOR[c.id];
          const disabled = c.id === "tacometro";
          return (
            <div key={c.id} style={{ ...S.card(ac), opacity: disabled ? 0.6 : 1 }}
              onClick={() => !disabled && onSel(c.id)}>
              <div style={{ fontSize:26 }}>{c.icon}</div>
              <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:C.text }}>{c.t}</div>
              <div style={{ fontSize:10, color:C.dim, lineHeight:1.45 }}>{c.s}</div>
              {disabled && <div style={S.pill(C.dim)}>módulo externo</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:16, fontFamily:MONO, fontSize:9, color:C.dim, textAlign:"center", letterSpacing:1 }}>
        SEM TOOLS v2
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const VIEWS = {
  resistencias: <ToolResistencias />,
  integrados:   <ToolIntegrado />,
  distancia:    <ToolDistancia />,
  jack:         <ToolJack />,
  decibeles:    <ToolDecibeles />,
  nivel:        <ToolNivel />,
  oscilo:       <ToolOscilo />,
  tacometro: <ModulePlaceholder
    icon="⚙️"
    title="Tacómetro Estroboscópico"
    why={"El efecto estroboscópico puede desencadenar convulsiones en personas con epilepsia fotosensible.\nPor seguridad, esta función requiere un módulo externo con LED controlado."}
    when={"Módulo en desarrollo: LED IR + fotodetector vía jack.\nEstimado: próxima versión."}
  />,
};

function App() {
  const [tool, setTool] = useState(null);
  const active  = ALL_TOOLS.find(t => t.id === tool);
  const toolCol = tool ? TOOL_COLOR[tool] : C.amber;

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap";
    document.head.appendChild(l);
  }, []);

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        {tool && (
          <button style={{ border:"none", background:"none", color:toolCol,
                           fontFamily:MONO, fontSize:20, cursor:"pointer", padding:"0 6px 0 0" }}
            onClick={() => setTool(null)}>←</button>
        )}
        <div>
          <div style={{ ...S.logo, color: toolCol }}>
            {active ? `${active.icon} ${active.t}` : "SEM Tools"}
          </div>
          <div style={S.sub}>HERRAMIENTAS DE TALLER</div>
        </div>
      </div>

      <div style={S.body}>
        {tool === null ? <Home onSel={setTool} /> : VIEWS[tool]}
      </div>

      <div style={S.nav}>
        <button style={S.nb(tool === null, C.amber)} onClick={() => setTool(null)}>
          <span>⊞</span>
          <span style={S.nl}>INICIO</span>
        </button>
        {tool && (
          <button style={{ ...S.nb(true, toolCol), flex:3, alignItems:"flex-start",
                           paddingLeft:16, pointerEvents:"none" }}>
            <span style={{ fontFamily:MONO, fontSize:11, color:toolCol }}>{active?.icon} {active?.t}</span>
            <span style={{ ...S.nl, color:C.dim }}>HERRAMIENTA ACTIVA</span>
          </button>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
