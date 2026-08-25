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
  bg:"#EEF1F8", surf:"#FFFFFF", surf2:"#E4E9F5", bord:"#C4CCE6",
  amber:"#C07800", blue:"#1A7FC2", green:"#16865A", red:"#D63030",
  yellow:"#8A6500", text:"#1A2038", dim:"#5E70A8",
};
const MONO = "'JetBrains Mono','Courier New',monospace";
const UI   = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const SCAN = `repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)`;

const S = {
  app:  { display:"flex", flexDirection:"column", height:"100vh", background:C.bg, fontFamily:UI, color:C.text, overflow:"hidden" },
  hdr:  { padding:"10px 16px 8px", borderBottom:`1px solid ${C.bord}`, background:C.surf, display:"flex", alignItems:"center", gap:10, minHeight:48 },
  logo: { fontFamily:MONO, fontSize:16, fontWeight:700, color:C.amber, letterSpacing:"-0.5px" },
  sub:  { fontFamily:MONO, fontSize:8, color:C.dim, letterSpacing:2, marginTop:1 },
  body: { flex:1, overflowY:"auto", padding:"14px 14px 6px" },
  nav:  { display:"flex", background:C.surf, borderTop:`1px solid ${C.bord}` },
  nb:   (a)=>({ flex:1, border:"none", background:"none", padding:"9px 4px 11px", color:a?C.amber:C.dim,
                cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                fontSize:18, borderTop:a?`2px solid ${C.amber}`:"2px solid transparent", transition:"color .15s" }),
  nl:   { fontSize:8, fontFamily:MONO, letterSpacing:.5 },
  wrap: { display:"flex", flexDirection:"column", gap:13, paddingBottom:8 },
  st:   { fontFamily:MONO, fontSize:10, letterSpacing:2, color:C.dim, textTransform:"uppercase", marginBottom:2 },
  disp: { background:"#060809", border:`1px solid ${C.bord}`, borderRadius:6, padding:"13px 17px", backgroundImage:SCAN },
  dval: { fontFamily:MONO, fontSize:38, fontWeight:700, color:C.amber, lineHeight:1 },
  dunt: { fontFamily:MONO, fontSize:12, color:C.dim, marginLeft:6 },
  dlbl: { fontFamily:MONO, fontSize:9, color:C.dim, letterSpacing:2, marginTop:3 },
  btn:  (v="p")=>({ border:"none", borderRadius:6, padding:"11px 16px", fontFamily:MONO, fontSize:12, fontWeight:700,
                     cursor:"pointer", letterSpacing:.4, width:"100%",
                     background:v==="p"?C.amber:v==="b"?C.blue:C.surf2,
                     color:v==="p"||v==="b"?"#000":C.text }),
  vid:  { width:"100%", borderRadius:6, border:`1px solid ${C.bord}`, background:"#000", maxHeight:220, objectFit:"cover", display:"block" },
  res:  { background:C.surf2, borderRadius:6, padding:12, border:`1px solid ${C.bord}` },
  row:  { display:"flex", gap:8 },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  card: { background:C.surf, border:`1px solid ${C.bord}`, borderRadius:8, padding:"16px 13px",
          cursor:"pointer", display:"flex", flexDirection:"column", gap:6 },
  note: { fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.6 },
  tag:  (ok)=>({ background:ok?`${C.green}22`:`${C.red}22`, border:`1px solid ${ok?C.green:C.red}`,
                  borderRadius:6, padding:"8px 12px", fontFamily:MONO, fontSize:12, color:ok?C.green:C.red }),
  inp:  { background:C.surf2, border:`1px solid ${C.bord}`, borderRadius:6, padding:"10px 12px",
          color:C.text, fontFamily:MONO, fontSize:13, width:"100%", boxSizing:"border-box" },
  sel:  { background:C.surf2, border:`1px solid ${C.bord}`, borderRadius:6, padding:"9px 10px",
          color:C.text, fontFamily:MONO, fontSize:11, width:"100%" },
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
  const [on,        setOn]        = useState(false);
  const [err,       setErr]       = useState(null);
  const [devices,   setDevices]   = useState([]);
  const [selDev,    setSelDev]    = useState("environment");
  const [torchOn,   setTorchOn]   = useState(false);
  const [torchAvail,setTorchAvail]= useState(false);

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

  const switchDev = async (did) => {
    setSelDev(did);
    if (on) await start(did);
  };

  const toggleTorch = async () => {
    if (!tkRef.current) return;
    const next = !torchOn;
    try {
      await tkRef.current.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch(e) { setErr("Torch no soportado"); }
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
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || "Cámara USB / Endoscopio"}
            </option>
          ))}
        </select>
      )}
      <div style={S.row}>
        <button style={{ ...S.btn(on ? "s" : "p"), flex: on ? 0.55 : 1 }} onClick={() => on ? stop() : start()}>
          {on ? "Apagar" : "Activar cámara"}
        </button>
        {torchAvail && on && (
          <button style={{ ...S.btn("s"), flex:0.45, background:torchOn ? C.yellow : C.surf2, color:torchOn ? "#000" : C.text }}
            onClick={toggleTorch}>
            {torchOn ? "🔦 ON" : "🔦 OFF"}
          </button>
        )}
        {on && onCapture && (
          <button style={{ ...S.btn(), flex:1 }} onClick={capture}>{captureLabel}</button>
        )}
      </div>
    </>
  );
}

// ─── Resistencias ─────────────────────────────────────────────────────────────
function ToolResistencias() {
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
      <div style={S.st}>▸ Lector de Resistencias</div>
      <CameraView captureLabel={loading ? "Analizando…" : "📷 Leer bandas"} onCapture={loading ? null : analyze} />
      {result && (
        <div style={S.res}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginBottom:6 }}>RESULTADO</div>
          <pre style={{ fontFamily:MONO, fontSize:12, color:C.text, whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{result}</pre>
        </div>
      )}
      <div style={S.note}>Activá la cámara, apuntá a la resistencia y presioná Leer bandas.</div>
    </div>
  );
}

// ─── Integrados ───────────────────────────────────────────────────────────────
function ToolIntegrado() {
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
      <div style={S.st}>▸ Identificador de Integrados</div>
      <CameraView captureLabel={loading ? "Identificando…" : "📷 Identificar IC"} onCapture={loading ? null : analyze} />
      {result && (
        <div style={S.res}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginBottom:6 }}>RESULTADO</div>
          <pre style={{ fontFamily:MONO, fontSize:12, color:C.text, whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{result}</pre>
        </div>
      )}
      <div style={S.note}>Enfocá el marking del IC. Claude identifica el chip y describe cómo probarlo.</div>
    </div>
  );
}

// ─── Distancia ────────────────────────────────────────────────────────────────
function ToolDistancia() {
  const [mode,     setMode]    = useState("claude");
  const [loading,  setLoading] = useState(false);
  const [result,   setResult]  = useState(null);
  const [captured, setCaptured]= useState(null);
  const [phase,    setPhase]   = useState("ref1");
  const [pts,      setPts]     = useState([]);
  const [refMM,    setRefMM]   = useState("85.6");
  const tapCanvas = useRef();

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
      setResult(`DESDE P1: ${(dist1/10).toFixed(1)} cm  (${dist1.toFixed(0)} mm)\nDESDEP2: ${(dist2/10).toFixed(1)} cm  (${dist2.toFixed(0)} mm)\nESCALA: ${scale.toFixed(2)} mm/px`);
      setPhase("done");
    }
  };

  const reset = () => { setCaptured(null); setResult(null); setPts([]); setPhase("ref1"); };
  const phaseLabel = { ref1:"Tocá PUNTO 1 de la referencia", ref2:"Tocá PUNTO 2 de la referencia", target:"Tocá el punto a medir", done:"✓ Medición lista" };

  return (
    <div style={S.wrap}>
      <div style={S.st}>▸ Medidor de Distancia</div>
      <div style={S.row}>
        {["claude", "tap"].map(m => (
          <button key={m} style={{ ...S.btn(mode === m ? "p" : "s"), flex:1 }} onClick={() => { setMode(m); reset(); }}>
            {m === "claude" ? "🤖 Claude estima" : "✋ Medir con toque"}
          </button>
        ))}
      </div>
      {mode === "tap" && captured && (
        <div style={{ fontFamily:MONO, fontSize:10, color:C.amber, textAlign:"center" }}>{phaseLabel[phase]}</div>
      )}
      {mode === "tap" && !captured && (
        <div style={S.row}>
          <span style={{ fontFamily:MONO, fontSize:10, color:C.dim, alignSelf:"center" }}>Referencia:</span>
          <input style={{ ...S.inp, flex:1 }} type="number" value={refMM} onChange={e => setRefMM(e.target.value)} />
          <span style={{ fontFamily:MONO, fontSize:10, color:C.dim, alignSelf:"center" }}>mm</span>
        </div>
      )}
      {!captured
        ? <CameraView captureLabel={loading ? "Analizando…" : "📷 Capturar"} onCapture={loading ? null : onCapture} />
        : <>
            {mode === "tap" && (
              <canvas ref={tapCanvas} width={640} height={360}
                style={{ width:"100%", borderRadius:6, border:`1px solid ${C.bord}`, cursor:"crosshair" }}
                onClick={handleTap} onTouchEnd={handleTap} />
            )}
            <button style={S.btn("s")} onClick={reset}>↺ Nueva foto</button>
          </>
      }
      {result && (
        <div style={S.res}>
          <pre style={{ fontFamily:MONO, fontSize:12, color:C.text, whiteSpace:"pre-wrap", margin:0, lineHeight:1.8 }}>{result}</pre>
        </div>
      )}
      <div style={S.note}>{mode === "claude" ? "Poné una tarjeta de crédito en la foto como referencia." : "Tap 1→2: distancia conocida. Tap 3: punto a medir."}</div>
    </div>
  );
}

// ─── Tacómetro ────────────────────────────────────────────────────────────────
function ToolTacometro() {
  const [hz,      setHz]      = useState(16.7);
  const [step,    setStep]    = useState(0.5);
  const [running, setRunning] = useState(false);
  const [mode,    setMode]    = useState("screen");
  const [flash,   setFlash]   = useState(false);
  const [err,     setErr]     = useState(null);
  const tkRef  = useRef(null);
  const itvRef = useRef(null);
  const stRef  = useRef(null);
  const rpm = Math.round(hz * 60);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"environment" } });
      stRef.current = stream;
      const track = stream.getVideoTracks()[0];
      tkRef.current = track;
      const caps = track.getCapabilities?.() || {};
      if (caps.torch) {
        setMode("torch"); // auto-seleccionar torch si disponible
      } else {
        setMode("screen");
        if (mode === "torch") setErr("Linterna no disponible en este dispositivo, usando pantalla");
      }
    } catch(e) { setErr("Sin cámara: " + e.message); }
  };

  const stopStrobe = () => {
    clearInterval(itvRef.current);
    tkRef.current?.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    setFlash(false); setRunning(false);
  };

  const startStrobe = async () => {
    if (mode === "torch" && !tkRef.current) await startCamera();
    stopStrobe(); setRunning(true);
    let state = false;
    itvRef.current = setInterval(() => {
      state = !state;
      if (mode === "torch" && tkRef.current) tkRef.current.applyConstraints({ advanced: [{ torch: state }] }).catch(() => {});
      else setFlash(state);
    }, 500 / hz);
  };

  const changeHz = (delta) => {
    const next = Math.max(1, Math.min(50, hz + delta));
    setHz(Math.round(next * 10) / 10);
    if (running) setTimeout(startStrobe, 0);
  };

  useEffect(() => () => { stopStrobe(); stRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const presets = [{ label:"600", hz:10 }, { label:"1000", hz:16.7 }, { label:"1500", hz:25 }, { label:"3000", hz:50 }];

  return (
    <div style={S.wrap}>
      {flash && mode === "screen" && (
        <div style={{ position:"fixed", inset:0, background:"#FFFFFF", zIndex:9999, pointerEvents:"none" }} />
      )}
      <div style={S.st}>▸ Tacómetro Estroboscópico</div>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.6, background:C.surf2, borderRadius:6, padding:"8px 12px", border:`1px solid ${C.bord}` }}>
        💡 Cómo usar: ajustá la frecuencia hasta que la pieza giratoria <b>parezca quieta</b>. Ese Hz × 60 = RPM real.
      </div>
      <div style={S.disp}>
        <div style={{ ...S.dval, fontSize:46 }}>{rpm}</div>
        <div style={{ fontFamily:MONO, fontSize:13, color:C.dim, marginTop:2 }}>RPM</div>
        <div style={{ ...S.dval, fontSize:22, color:C.blue, marginTop:4 }}>{hz.toFixed(1)} Hz</div>
        <div style={S.dlbl}>FRECUENCIA DE DESTELLO</div>
      </div>
      <div style={S.row}>
        <button style={{ ...S.btn("s"), flex:1, fontSize:22, padding:"14px 0" }} onClick={() => changeHz(-step)}>−</button>
        <select style={{ ...S.sel, flex:2 }} value={step} onChange={e => setStep(parseFloat(e.target.value))}>
          <option value={0.1}>Paso fino (6 RPM)</option>
          <option value={0.5}>Paso medio (30 RPM)</option>
          <option value={1}>Paso grueso (60 RPM)</option>
          <option value={5}>Salto (300 RPM)</option>
        </select>
        <button style={{ ...S.btn("s"), flex:1, fontSize:22, padding:"14px 0" }} onClick={() => changeHz(+step)}>+</button>
      </div>
      <div style={S.row}>
        {presets.map(p => (
          <button key={p.hz} style={{ ...S.btn("s"), flex:1, fontSize:11, padding:"8px 4px" }}
            onClick={() => { setHz(p.hz); if (running) setTimeout(startStrobe, 0); }}>
            {p.label}<br /><span style={{ color:C.dim, fontSize:9 }}>RPM</span>
          </button>
        ))}
      </div>
      <div style={S.row}>
        {["screen", "torch"].map(m => (
          <button key={m} style={{ ...S.btn(mode === m ? "b" : "s"), flex:1, fontSize:11 }} onClick={() => setMode(m)}>
            {m === "screen" ? "💡 Pantalla" : "🔦 Torch"}
          </button>
        ))}
      </div>
      {err && <div style={{ color:C.amber, fontFamily:MONO, fontSize:10 }}>{err}</div>}
      <button style={{ ...S.btn(running ? "s" : "p"), background:running ? C.red : "", color:running ? "#fff" : "" }}
        onClick={running ? stopStrobe : startStrobe}>
        {running ? "⏹ Detener" : "▶ Iniciar estroboscopio"}
      </button>
      <div style={S.note}>
        {mode === "torch"
          ? "Apuntá la linterna trasera a la pieza giratoria. Ajustá Hz hasta que parezca congelada → Hz × 60 = RPM."
          : "Modo pantalla: apuntá la pantalla blanca parpadeante hacia la pieza. Mejor usar modo Linterna si el celular lo soporta."
        }
      </div>
    </div>
  );
}

// ─── Lector Jack ──────────────────────────────────────────────────────────────
const JACK_MODULES = [
  { id:"raw",    label:"Señal cruda",    unit:"mV",  convert:v => v * 1000 },
  { id:"thermo", label:"ThermoJack",     unit:"°C",  convert:v => v * 100 - 40 },
  { id:"air",    label:"AirJack (flujo)",unit:"m/s", convert:v => Math.sqrt(Math.max(0, v) * 8) },
  { id:"volt",   label:"VoltJack",       unit:"V",   convert:v => v * 3.3 },
];

function ToolJack() {
  const [on,     setOn]    = useState(false);
  const [module, setModule]= useState("raw");
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
        cx.fillStyle = "#060809"; cx.fillRect(0, 0, W, H);
        cx.strokeStyle = "#1A2030"; cx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { cx.beginPath(); cx.moveTo(0, H*i/4); cx.lineTo(W, H*i/4); cx.stroke(); }
        cx.strokeStyle = C.blue; cx.lineWidth = 2; cx.beginPath();
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
      <div style={S.st}>▸ Lector Jack — Módulos Analógicos</div>
      <select style={S.sel} value={module} onChange={e => { setModule(e.target.value); setPeak(null); setMin(null); }}>
        {JACK_MODULES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <div style={S.disp}>
        <span style={S.dval}>{fmt(val)}</span>
        <span style={S.dunt}>{mod.unit}</span>
        <div style={S.dlbl}>{mod.label.toUpperCase()}</div>
      </div>
      <canvas ref={canRef} width={640} height={120}
        style={{ width:"100%", borderRadius:6, border:`1px solid ${C.bord}`, background:"#060809" }} />
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
      {!on ? <button style={S.btn()} onClick={start}>Conectar módulo Jack</button>
           : <button style={S.btn("s")} onClick={stop}>Desconectar</button>}
      <div style={S.note}>ThermoJack / AirJack / VoltJack → enchufá al jack 3.5mm y presioná Conectar.</div>
    </div>
  );
}

// ─── Decibelímetro ────────────────────────────────────────────────────────────
function ToolDecibeles() {
  const [db, setDb]  = useState(null);
  const [peak, setPeak] = useState(null);
  const [on, setOn]  = useState(false);
  const [err, setErr]= useState(null);
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
  const label = v < 45 ? "SILENCIOSO" : v < 60 ? "AMBIENTE" : v < 75 ? "CONVERSACIÓN" : v < 90 ? "RUIDOSO" : "⚠ ALTO";

  return (
    <div style={S.wrap}>
      <div style={S.st}>▸ Decibelímetro</div>
      <div style={S.disp}><span style={S.dval}>{db ?? "---"}</span><span style={S.dunt}>dB</span><div style={S.dlbl}>{on ? label : "NIVEL SPL"}</div></div>
      <div style={{ background:C.surf2, borderRadius:6, height:12, overflow:"hidden", border:`1px solid ${C.bord}` }}>
        <div style={{ height:"100%", width:`${pct}%`, background:bc, transition:"width .06s,background .2s", borderRadius:6 }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:MONO, fontSize:9, color:C.dim }}>
        <span>0</span><span>30</span><span>60</span><span>90</span><span>120 dB</span>
      </div>
      {peak && (
        <div style={{ ...S.disp, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>PICO MÁX</div><div style={{ fontFamily:MONO, fontSize:26, fontWeight:700, color:C.red }}>{peak} dB</div></div>
          <button style={{ ...S.btn("s"), width:"auto", padding:"7px 12px", fontSize:11 }} onClick={() => setPeak(null)}>Reset</button>
        </div>
      )}
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11 }}>{err}</div>}
      {!on ? <button style={S.btn()} onClick={start}>Activar micrófono</button>
           : <button style={S.btn("s")} onClick={stop}>Detener</button>}
    </div>
  );
}

// ─── Nivel ────────────────────────────────────────────────────────────────────
function ToolNivel() {
  const [ang, setAng] = useState({ b:0, g:0 });
  const [on,  setOn]  = useState(false);
  const [err, setErr] = useState(null);
  const hRef = useRef(null);

  const start = async () => {
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      try { const p = await DeviceOrientationEvent.requestPermission(); if (p !== "granted") { setErr("Permiso denegado"); return; } }
      catch(e) { setErr(e.message); return; }
    }
    const h = (e) => setAng({ b: e.beta || 0, g: e.gamma || 0 });
    hRef.current = h;
    window.addEventListener("deviceorientation", h);
    setOn(true); setErr(null);
  };

  const stop = () => { if (hRef.current) window.removeEventListener("deviceorientation", hRef.current); setOn(false); };
  useEffect(() => () => { if (hRef.current) window.removeEventListener("deviceorientation", hRef.current); }, []);

  const gx = ang.g, gy = ang.b;
  const bx = Math.max(-38, Math.min(38, -gx * 1.4));
  const by = Math.max(-38, Math.min(38, -gy * 1.4));
  const flat = Math.abs(gx) < 2 && Math.abs(gy) < 2;

  return (
    <div style={S.wrap}>
      <div style={S.st}>▸ Nivel de Burbuja</div>
      <div style={{ background:"#060809", border:`1px solid ${C.bord}`, borderRadius:8, display:"flex", justifyContent:"center", padding:24, backgroundImage:SCAN }}>
        <div style={{ position:"relative", width:200, height:200 }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${C.bord}`, background:"#0A0C12" }} />
          <div style={{ position:"absolute", top:"50%", left:10, right:10, height:1, background:C.bord, transform:"translateY(-50%)" }} />
          <div style={{ position:"absolute", left:"50%", top:10, bottom:10, width:1, background:C.bord, transform:"translateX(-50%)" }} />
          <div style={{ position:"absolute", top:"50%", left:"50%", width:26, height:26, marginTop:-13, marginLeft:-13, borderRadius:"50%", border:`1px solid ${flat ? C.green : C.bord}`, transition:"border-color .3s" }} />
          <div style={{ position:"absolute", top:"50%", left:"50%", width:30, height:30, marginTop:-15, marginLeft:-15,
                        transform:`translate(${bx}px,${by}px)`, borderRadius:"50%",
                        transition:"transform .08s ease-out,background .2s,box-shadow .2s",
                        background: flat ? `radial-gradient(circle at 35% 35%,${C.green}88,${C.green}44)` : `radial-gradient(circle at 35% 35%,${C.blue}88,${C.blue}44)`,
                        border:`2px solid ${flat ? C.green : C.blue}`,
                        boxShadow: flat ? `0 0 14px ${C.green}55` : "none" }} />
        </div>
      </div>
      <div style={S.row}>
        <div style={{ ...S.disp, flex:1, textAlign:"center" }}><div style={{ ...S.dval, fontSize:26 }}>{gx.toFixed(1)}°</div><div style={S.dlbl}>LATERAL</div></div>
        <div style={{ ...S.disp, flex:1, textAlign:"center" }}><div style={{ ...S.dval, fontSize:26 }}>{gy.toFixed(1)}°</div><div style={S.dlbl}>INCLINACIÓN</div></div>
      </div>
      {on && flat && <div style={S.tag(true)}>✓  NIVELADO</div>}
      {on && !flat && <div style={S.tag(false)}>⊘  FUERA DE NIVEL</div>}
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11 }}>{err}</div>}
      {!on ? <button style={S.btn()} onClick={start}>Activar nivel</button>
           : <button style={S.btn("s")} onClick={stop}>Detener</button>}
      <div style={S.note}>Apoyá el celular sobre la superficie. Burbuja centrada = nivelado.</div>
    </div>
  );
}

// ─── Osciloscopio ─────────────────────────────────────────────────────────────
function ToolOscilo() {
  const cRef = useRef(), anlRef = useRef(), rafRef = useRef(), stRef = useRef(), actxRef = useRef();
  const [on,   setOn]  = useState(false);
  const [freq, setFreq]= useState(null);
  const [err,  setErr] = useState(null);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stRef.current = s;
      const actx = new AudioContext(); actxRef.current = actx;
      const src = actx.createMediaStreamSource(s);
      const anl = actx.createAnalyser(); anl.fftSize = 8192; src.connect(anl); anlRef.current = anl;
      setOn(true); setErr(null);
      // fftSize 8192 → resolución ~5.4 Hz/bin a 44100 Hz
      const DISP = 2048; // muestras a dibujar (ventana visible)
      const td = new Float32Array(anl.fftSize), fd = new Float32Array(anl.frequencyBinCount);
      const draw = () => {
        const c = cRef.current; if (!c) return;
        const cx = c.getContext("2d"), W = c.width, H = c.height;
        anl.getFloatTimeDomainData(td);
        cx.fillStyle = "#060809"; cx.fillRect(0, 0, W, H);
        cx.strokeStyle = "#1A2030"; cx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { cx.beginPath(); cx.moveTo(0, H*i/4); cx.lineTo(W, H*i/4); cx.stroke(); }
        for (let i = 1; i < 8; i++) { cx.beginPath(); cx.moveTo(W*i/8, 0); cx.lineTo(W*i/8, H); cx.stroke(); }
        // Disparador: encontrar cruce por cero ascendente para estabilizar imagen
        let trig = 0;
        for (let i = 1; i < td.length - DISP; i++) {
          if (td[i-1] < 0 && td[i] >= 0) { trig = i; break; }
        }
        cx.strokeStyle = C.amber; cx.lineWidth = 2; cx.beginPath();
        const sw = W / DISP;
        for (let i = 0; i < DISP; i++) {
          const y = (1 - td[trig + i]) * H / 2;
          i === 0 ? cx.moveTo(0, y) : cx.lineTo(i * sw, y);
        }
        cx.stroke();
        // Frecuencia con interpolación parabólica (±0.5 bin de error)
        anl.getFloatFrequencyData(fd);
        let mi = 1, mv = -Infinity;
        for (let i = 1; i < fd.length - 1; i++) if (fd[i] > mv) { mv = fd[i]; mi = i; }
        if (mv > -80) {
          const a = fd[mi-1], b = fd[mi], cc = fd[mi+1];
          const refinedBin = mi + 0.5 * (a - cc) / (a - 2*b + cc + 1e-9);
          setFreq((refinedBin * actx.sampleRate / anl.fftSize).toFixed(1));
        } else { setFreq(null); }
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    } catch(e) { setErr("Sin micrófono: " + e.message); }
  };

  const stop = () => { cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t => t.stop()); actxRef.current?.close(); setOn(false); setFreq(null); };
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t => t.stop()); actxRef.current?.close(); }, []);

  return (
    <div style={S.wrap}>
      <div style={S.st}>▸ Osciloscopio de Audio</div>
      <canvas ref={cRef} width={640} height={180} style={{ width:"100%", borderRadius:6, border:`1px solid ${C.bord}`, background:"#060809" }} />
      {freq && on && (
        <div style={S.disp}><span style={S.dval}>{freq}</span><span style={S.dunt}>Hz</span><div style={S.dlbl}>FRECUENCIA DOMINANTE</div></div>
      )}
      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11 }}>{err}</div>}
      {!on ? <button style={S.btn()} onClick={start}>Activar</button>
           : <button style={S.btn("s")} onClick={stop}>Detener</button>}
      <div style={S.note}>20 Hz – 20 kHz · útil para alarmas y señales de baja frecuencia de equipos.</div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
const ALL_TOOLS = [
  { id:"resistencias", icon:"🔴", t:"Resistencias",   s:"Cámara + Claude → valor Ω" },
  { id:"integrados",   icon:"◻",  t:"Integrados IC",  s:"Cámara + Claude → IC + prueba" },
  { id:"distancia",    icon:"📏", t:"Distancia",       s:"Foto → medición por toque o Claude" },
  { id:"tacometro",    icon:"⚙️",  t:"Tacómetro",      s:"Estroboscopio → RPM de motor" },
  { id:"jack",         icon:"🔌", t:"Lector Jack",     s:"Módulos ThermoJack / AirJack" },
  { id:"decibeles",    icon:"📊", t:"Decibelímetro",   s:"Nivel de ruido SPL" },
  { id:"nivel",        icon:"⦿",  t:"Nivel",           s:"Burbuja digital ±1°" },
  { id:"oscilo",       icon:"〜", t:"Osciloscopio",    s:"Forma de onda + frecuencia" },
];

function Home({ onSel }) {
  return (
    <div>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, marginBottom:12, letterSpacing:2 }}>SELECCIONÁ UNA HERRAMIENTA</div>
      <div style={S.grid}>
        {ALL_TOOLS.map(c => (
          <div key={c.id} style={S.card} onClick={() => onSel(c.id)}>
            <div style={{ fontSize:24 }}>{c.icon}</div>
            <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:C.text }}>{c.t}</div>
            <div style={{ fontSize:10, color:C.dim, lineHeight:1.4 }}>{c.s}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:14, fontFamily:MONO, fontSize:9, color:C.dim, textAlign:"center", letterSpacing:1 }}>
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
  tacometro:    <ToolTacometro />,
  jack:         <ToolJack />,
  decibeles:    <ToolDecibeles />,
  nivel:        <ToolNivel />,
  oscilo:       <ToolOscilo />,
};

function App() {
  const [tool, setTool] = useState(null);
  const active = ALL_TOOLS.find(t => t.id === tool);

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
          <button style={{ border:"none", background:"none", color:C.amber, fontFamily:MONO, fontSize:18, cursor:"pointer", padding:"0 4px 0 0" }}
            onClick={() => setTool(null)}>←</button>
        )}
        <div>
          <div style={S.logo}>{active ? `${active.icon} ${active.t}` : "SEM Tools"}</div>
          <div style={S.sub}>HERRAMIENTAS DE TALLER</div>
        </div>
      </div>
      <div style={S.body}>
        {tool === null ? <Home onSel={setTool} /> : VIEWS[tool]}
      </div>
      <div style={S.nav}>
        <button style={S.nb(tool === null)} onClick={() => setTool(null)}>
          <span>⊞</span><span style={S.nl}>INICIO</span>
        </button>
        {tool && (
          <button style={{ ...S.nb(false), flex:3, alignItems:"flex-start", paddingLeft:16, pointerEvents:"none" }}>
            <span style={{ fontFamily:MONO, fontSize:11, color:C.amber }}>{active?.icon} {active?.t}</span>
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
