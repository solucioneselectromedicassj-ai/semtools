import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ── Service Worker ──────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const rgb = hex => `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
const glow = (h,a=0.45) => `0 0 22px rgba(${rgb(h)},${a})`;
const glass = (h,a=0.06) => ({ background:`rgba(${rgb(h)},${a})`, backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)" });

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0D1829", bord:"rgba(255,255,255,0.12)", text:"#E2E8FF", dim:"#5A7099",
  cyan:"#00D9FF", orange:"#FF7A35", violet:"#B06EFF", green:"#00EF88",
  amber:"#FFB830", red:"#FF3355", blue:"#4D9EFF",
};
const MONO = "'JetBrains Mono','Courier New',monospace";

// ── Tool & block metadata ─────────────────────────────────────────────────────
const TOOL = {
  decibeles:    { icon:"🔊", label:"Decibelímetro",  sub:"Auto · detección de picos + duración", col:C.cyan   },
  nivel:        { icon:"⦿",  label:"Nivel",           sub:"Burbuja 2D · horizonte · auto-start",  col:C.cyan   },
  brujula:      { icon:"🧭", label:"Brújula",         sub:"Magnetómetro · rumbo · auto-start",    col:C.cyan   },
  sistema:      { icon:"🔧", label:"Sistema",         sub:"Limpieza · benchmark · optimización",   col:C.cyan   },
  oscilo:       { icon:"〜", label:"Osciloscopio",    sub:"Audio · FFT · captura automática",     col:C.cyan   },
  resistencias: { icon:"🔴", label:"Resistencias",    sub:"Cámara + IA → valor Ω",               col:C.violet },
  integrados:   { icon:"◻",  label:"Integrados IC",   sub:"Cámara + IA → ID + cómo probarlo",    col:C.violet },
  distancia:    { icon:"📏", label:"Distancia",       sub:"IA o medición por toque",              col:C.violet },
  jack_thermo:  { icon:"🌡",  label:"Temperatura",    sub:"NTC · °C en tiempo real",               col:C.orange },
  jack_thermo2: { icon:"🌡🌡",label:"Dual Temp",       sub:"2 sondas NTC · diferencial",            col:C.red    },
  jack_air:     { icon:"💨", label:"Flujo de aire",    sub:"Anemómetro térmico · m/s",              col:C.blue   },
  jack_volt:    { icon:"⚡", label:"Voltaje CC",       sub:"Divisor 27kΩ · 0–30V",                  col:C.amber  },
  jack_light:   { icon:"☀️", label:"Luminosidad",      sub:"LDR · lux aproximado",                  col:C.violet },
  jack_raw:     { icon:"〜", label:"Señal cruda",      sub:"Voltaje de audio del jack · mV",        col:C.green  },
  tacometro:    { icon:"⚙️", label:"Tacómetro",       sub:"Módulo externo próximamente",          col:C.green  },
  red:          { icon:"📶", label:"Red / Internet",  sub:"Velocidad · Ping · Tipo de conexión",  col:C.blue   },
  modulos:      { icon:"📦", label:"Módulos",         sub:"Hardware externo · Catálogo y precios", col:C.green  },
};

const BLOCKS = [
  { id:"celular",  icon:"📱", label:"CELULAR",     col:C.cyan,   tools:["decibeles","nivel","brujula","oscilo","sistema"] },
  { id:"camara",   icon:"📷", label:"CÁMARA + IA", col:C.violet, tools:["resistencias","integrados","distancia"] },
  { id:"jack",     icon:"🔌", label:"JACK 3.5mm",  col:C.orange, tools:["jack_thermo","jack_thermo2","jack_air","jack_volt","jack_light","jack_raw"] },
  { id:"celularplus", icon:"📶", label:"CONECTIVIDAD", col:C.blue, tools:["red"] },
  { id:"modulos",  icon:"📡", label:"MÓDULOS",     col:C.green,  tools:["tacometro","modulos"] },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:  { display:"flex", flexDirection:"column", height:"100vh", background:"linear-gradient(170deg,#0D1829 0%,#152240 55%,#0F1A35 100%)", color:C.text,
          fontFamily:"-apple-system,'Segoe UI',sans-serif", overflow:"hidden" },
  hdr:  { padding:"10px 14px 9px", display:"flex", alignItems:"center", gap:10, minHeight:50,
          background:"rgba(7,9,15,0.96)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.bord}` },
  logo: { fontFamily:MONO, fontSize:17, fontWeight:700, color:C.amber, letterSpacing:"-0.5px",
          textShadow:`0 0 20px ${C.amber}66` },
  sub:  { fontFamily:MONO, fontSize:8, color:C.dim, letterSpacing:2 },
  body: { flex:1, overflowY:"auto", padding:"14px 12px 4px" },
  nav:  { display:"flex", background:"rgba(7,9,15,0.97)", backdropFilter:"blur(20px)",
          borderTop:`1px solid ${C.bord}`, paddingBottom:"env(safe-area-inset-bottom,0)" },
  nb:   (a,col) => ({ flex:1, border:"none", background:"none", padding:"9px 4px 11px",
          cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          color:a?col:C.dim, borderTop:a?`2px solid ${col}`:"2px solid transparent",
          textShadow:a?`0 0 10px ${col}88`:"none", transition:"all .15s" }),
  nl:   { fontSize:7, fontFamily:MONO, letterSpacing:.5 },
  wrap: { display:"flex", flexDirection:"column", gap:14, paddingBottom:14 },
  card: col => ({ borderRadius:14, padding:"14px 14px 12px", cursor:"pointer",
          ...glass(col, 0.07), border:`1px solid rgba(${rgb(col)},0.22)`,
          borderLeft:`3px solid ${col}`,
          boxShadow:`0 2px 16px rgba(0,0,0,0.4), inset 0 0 20px rgba(${rgb(col)},0.04)`,
          display:"flex", alignItems:"flex-start", gap:12 }),
  disp: col => ({ background:"rgba(0,0,0,0.75)", borderRadius:12,
          border:`1px solid rgba(${rgb(col)},0.28)`,
          boxShadow:`inset 0 0 30px rgba(0,0,0,0.6), ${glow(col,0.07)}`,
          padding:"16px 18px" }),
  dval: (col,sz=46) => ({ fontFamily:MONO, fontSize:sz, fontWeight:700, color:col,
          lineHeight:1, textShadow:`0 0 24px ${col}` }),
  dunt: { fontFamily:MONO, fontSize:12, color:C.dim, marginLeft:5 },
  dlbl: { fontFamily:MONO, fontSize:9, color:C.dim, letterSpacing:2, marginTop:5 },
  btn:  (v,col=C.amber) => {
    const bg = v==="p"?col:v==="r"?C.red:v==="g"?C.green:"rgba(255,255,255,0.07)";
    const accent = v==="p"||v==="r"||v==="g";
    return { border:accent?"none":`1px solid ${C.bord}`, borderRadius:11,
      padding:"13px 16px", fontFamily:MONO, fontSize:12, fontWeight:700,
      cursor:"pointer", letterSpacing:.5, width:"100%", background:bg,
      color:accent?(col===C.amber||col===C.green||col===C.cyan?"#000":"#fff"):C.text,
      boxShadow:accent?`${glow(col,0.38)},0 2px 10px rgba(0,0,0,0.4)`:"none",
      transition:"all .12s" };
  },
  row:  { display:"flex", gap:8 },
  res:  col => ({ ...glass(col,0.05), borderRadius:10, padding:14,
          border:`1px solid rgba(${rgb(col)},0.2)` }),
  note: { fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.7,
          background:"rgba(255,255,255,0.03)", borderRadius:8,
          padding:"8px 12px", border:`1px solid ${C.bord}` },
  tag:  ok => ({ background:ok?"rgba(0,239,136,0.1)":"rgba(255,51,85,0.1)",
          border:`1px solid ${ok?C.green:C.red}44`, borderRadius:8,
          padding:"11px 14px", fontFamily:MONO, fontSize:13,
          color:ok?C.green:C.red, fontWeight:700, textAlign:"center",
          textShadow:`0 0 12px ${ok?C.green:C.red}88` }),
  inp:  { background:"rgba(255,255,255,0.07)", border:`1px solid ${C.bord}`,
          borderRadius:8, padding:"11px 13px", color:C.text,
          fontFamily:MONO, fontSize:13, width:"100%", boxSizing:"border-box" },
  sel:  { background:"rgba(255,255,255,0.07)", border:`1px solid ${C.bord}`,
          borderRadius:8, padding:"10px 11px", color:C.text,
          fontFamily:MONO, fontSize:11, width:"100%" },
  vid:  { width:"100%", borderRadius:10, border:`1px solid ${C.bord}`,
          background:"#000", maxHeight:220, objectFit:"cover", display:"block" },
  pill: col => ({ background:`rgba(${rgb(col)},0.12)`, border:`1px solid rgba(${rgb(col)},0.3)`,
          borderRadius:20, padding:"3px 10px", fontFamily:MONO,
          fontSize:9, color:col, fontWeight:700, display:"inline-block" }),
  st:   col => ({ fontFamily:MONO, fontSize:9, letterSpacing:2.5,
          color:col, textTransform:"uppercase", fontWeight:700, marginBottom:2 }),
};

// ── Claude API ────────────────────────────────────────────────────────────────
async function askClaude(b64, prompt) {
  const r = await fetch("/api/claude", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000,
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

// ── CameraView ────────────────────────────────────────────────────────────────
function CameraView({ captureLabel="📷 Capturar", onCapture }) {
  const vRef=useRef(), cRef=useRef(), tkRef=useRef(null);
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [torch,setTorch]=useState(false), [torchOk,setTorchOk]=useState(false);

  const stop=useCallback(()=>{
    vRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    if(vRef.current) vRef.current.srcObject=null;
    tkRef.current=null; setOn(false); setTorch(false);
  },[]);

  const start=useCallback(async()=>{
    try {
      stop();
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280}}});
      vRef.current.srcObject=s; await vRef.current.play();
      const t=s.getVideoTracks()[0]; tkRef.current=t;
      setTorchOk(!!(t.getCapabilities?.()?.torch));
      setOn(true); setErr(null);
    } catch(e){ setErr("Sin cámara: "+e.message); }
  },[stop]);

  const toggleTorch=async()=>{
    if(!tkRef.current) return;
    const n=!torch;
    try{ await tkRef.current.applyConstraints({advanced:[{torch:n}]}); setTorch(n); }
    catch(_e){ setErr("Torch no disponible"); }
  };

  const capture=()=>{
    const v=vRef.current,c=cRef.current; if(!v||!c) return;
    c.width=v.videoWidth||640; c.height=v.videoHeight||480;
    c.getContext("2d").drawImage(v,0,0);
    onCapture?.(c.toDataURL("image/jpeg",0.85).split(",")[1], c);
  };

  useEffect(()=>()=>stop(),[stop]);

  return (
    <>
      <video ref={vRef} style={S.vid} playsInline muted/>
      <canvas ref={cRef} style={{display:"none"}}/>
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{err}</div>}
      <div style={S.row}>
        <button style={{...S.btn(on?"s":"p",C.violet),flex:on?0.5:1}} onClick={()=>on?stop():start()}>
          {on?"Apagar":"Activar cámara"}
        </button>
        {torchOk&&on&&(
          <button style={{...S.btn("s"),flex:.4,background:torch?C.amber:"rgba(255,255,255,0.07)",
            color:torch?"#000":C.text}} onClick={toggleTorch}>🔦{torch?" ON":" OFF"}</button>
        )}
        {on&&onCapture&&(
          <button style={{...S.btn("p",C.violet),flex:1}} onClick={capture}>{captureLabel}</button>
        )}
      </div>
    </>
  );
}


// ── Device Compatibility Check ────────────────────────────────────────────────
async function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const modelRaw = isAndroid
    ? (ua.match(/Android ([^;]+); ([^)]+)/)?.[2] || "Android")
    : isIOS ? (ua.match(/(iPhone|iPad)/)?.[0] || "iOS") : "Desconocido";
  const model = modelRaw.trim().slice(0, 40);
  const osVer = isAndroid ? (ua.match(/Android\s([\d.]+)/)?.[1] || "?")
                           : (ua.match(/OS\s([\d_]+)/)?.[1]?.replace(/_/g,".") || "?");

  let bat = null;
  try { bat = await navigator.getBattery(); } catch(e) {}

  const conn = navigator.connection || navigator.mozConnection || null;

  const caps = {
    camera:       !!(navigator.mediaDevices?.getUserMedia),
    microphone:   !!(navigator.mediaDevices?.getUserMedia),
    gyroscope:    typeof DeviceOrientationEvent !== "undefined",
    magnetometer: typeof DeviceOrientationEvent !== "undefined",
    bluetooth:    !!navigator.bluetooth,
    usb:          !!navigator.usb,
    memory:       navigator.deviceMemory || null,   // GB
    cores:        navigator.hardwareConcurrency || null,
    vibration:    !!navigator.vibrate,
    ambient:      !!window.AmbientLightSensor,
  };

  const warns = [];
  if (bat && bat.level < 0.20 && !bat.charging) warns.push("🔋 Batería < 20% — cargá antes de usar herramientas de cámara o micrófono");
  if (!caps.gyroscope) warns.push("⚠ Giroscopio no disponible — Nivel y Brújula no funcionarán");
  if (!caps.camera) warns.push("⚠ Cámara sin acceso — Herramientas de IA desactivadas");
  if (!caps.microphone) warns.push("⚠ Micrófono sin acceso — Osciloscopio y Decibelímetro desactivados");

  return { model, os: isAndroid?"Android":isIOS?"iOS":"Otro", osVer, bat, caps, conn, warns, isAndroid, isIOS };
}

function DevicePanel({ info, onClose }) {
  if (!info) return null;
  const { model, os, osVer, bat, caps, conn, warns } = info;
  const batPct = bat ? Math.round(bat.level * 100) : null;
  const batCol = batPct === null ? C.dim : batPct > 40 ? C.green : batPct > 20 ? C.amber : C.red;

  const TOOL_COMPAT = [
    { label:"Decibelímetro",   ok: caps.microphone,   reason:"Requiere micrófono" },
    { label:"Osciloscopio",    ok: caps.microphone,   reason:"Requiere micrófono" },
    { label:"Nivel",           ok: caps.gyroscope,    reason:"Requiere giroscopio" },
    { label:"Brújula",         ok: caps.magnetometer, reason:"Requiere magnetómetro" },
    { label:"Resistencias",    ok: caps.camera,       reason:"Requiere cámara" },
    { label:"Integrados IC",   ok: caps.camera,       reason:"Requiere cámara" },
    { label:"Distancia",       ok: caps.camera,       reason:"Requiere cámara" },
    { label:"Sensores Jack",   ok: caps.microphone,   reason:"Requiere entrada de audio" },
    { label:"Bluetooth BLE",   ok: caps.bluetooth,    reason:"BT no disponible" },
    { label:"USB-C Módulos",   ok: caps.usb,          reason:"WebUSB no disponible" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"linear-gradient(170deg,#0D1829EE 0%,#152240F5 100%)",
                  backdropFilter:"blur(8px)", zIndex:100, overflowY:"auto",
                  display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"14px 14px 20px", display:"flex", flexDirection:"column", gap:14 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700, color:C.amber,
                          textShadow:`0 0 12px ${C.amber}` }}>Diagnóstico del dispositivo</div>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:2 }}>
              {model} · {os} {osVer}
            </div>
          </div>
          <button style={{ border:"none", background:"rgba(255,255,255,0.08)", color:C.text,
                           borderRadius:8, padding:"8px 14px", fontFamily:MONO, fontSize:12,
                           cursor:"pointer" }} onClick={onClose}>Cerrar</button>
        </div>

        {/* Advertencias */}
        {warns.length > 0 && (
          <div style={{ ...glass(C.red, 0.06), borderRadius:10, padding:12,
                        border:`1px solid rgba(${rgb(C.red)},0.25)` }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.red, fontWeight:700, marginBottom:6 }}>ADVERTENCIAS</div>
            {warns.map((w,i) => (
              <div key={i} style={{ fontFamily:MONO, fontSize:11, color:C.amber, lineHeight:1.8 }}>{w}</div>
            ))}
          </div>
        )}

        {/* Batería + conectividad */}
        <div style={S.row}>
          <div style={{ ...S.disp(batCol), flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:MONO, fontSize:30, fontWeight:700, color:batCol,
                          textShadow:`0 0 14px ${batCol}` }}>
              {batPct !== null ? batPct+"%" : "---"}
            </div>
            <div style={S.dlbl}>{bat?.charging ? "⚡ CARGANDO" : "🔋 BATERÍA"}</div>
          </div>
          {conn && (
            <div style={{ ...S.disp(C.cyan), flex:1, textAlign:"center" }}>
              <div style={{ fontFamily:MONO, fontSize:24, fontWeight:700, color:C.cyan,
                            textShadow:`0 0 12px ${C.cyan}` }}>
                {conn.effectiveType?.toUpperCase() || "---"}
              </div>
              <div style={S.dlbl}>{conn.downlink ? conn.downlink+" Mbps" : "RED"}</div>
            </div>
          )}
        </div>

        {/* Hardware */}
        <div style={{ ...glass(C.violet, 0.05), borderRadius:10, padding:12,
                      border:`1px solid rgba(${rgb(C.violet)},0.2)` }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.violet, fontWeight:700, marginBottom:8 }}>HARDWARE</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {[
              ["RAM", caps.memory ? caps.memory+" GB" : "?"],
              ["CPU", caps.cores ? caps.cores+" núcleos" : "?"],
              ["Vibración", caps.vibration ? "✓" : "✗"],
              ["Luz amb.", caps.ambient ? "✓" : "✗"],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                    padding:"5px 8px", background:"rgba(255,255,255,0.04)",
                                    borderRadius:6 }}>
                <span style={{ fontFamily:MONO, fontSize:10, color:C.dim }}>{k}</span>
                <span style={{ fontFamily:MONO, fontSize:10, color:C.text, fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compatibilidad por herramienta */}
        <div style={{ ...glass(C.cyan, 0.04), borderRadius:10, padding:12,
                      border:`1px solid rgba(${rgb(C.cyan)},0.2)` }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.cyan, fontWeight:700, marginBottom:10 }}>
            COMPATIBILIDAD DE HERRAMIENTAS
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {TOOL_COMPAT.map(({ label, ok, reason }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between",
                                        alignItems:"center", padding:"6px 8px",
                                        background:"rgba(255,255,255,0.03)", borderRadius:7 }}>
                <span style={{ fontFamily:MONO, fontSize:11, color:ok ? C.text : C.dim }}>{label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {!ok && <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>{reason}</span>}
                  <span style={{ fontFamily:MONO, fontSize:13, fontWeight:700,
                                 color:ok?C.green:C.red, textShadow:`0 0 8px ${ok?C.green:C.red}` }}>
                    {ok ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recomendaciones */}
        <div style={S.note}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.amber, fontWeight:700, marginBottom:6 }}>RECOMENDACIONES</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.9 }}>
            🔋 Mantené carga mínima 30% para usar cámara y micrófono<br/>
            📱 Cerrá otras apps en segundo plano para mejor precisión<br/>
            🌡 Evitá usar en condiciones de calor extremo (protección térmica reduce rendimiento)<br/>
            🔌 Para módulos USB-C: usá cable OTG certificado, evitá cables USB 2.0 sin datos
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Resistencias ──────────────────────────────────────────────────────────────
function ToolResistencias() {
  const col=C.violet;
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const analyze=async b64=>{
    setLoading(true); setResult(null);
    try{ setResult(await askClaude(b64,
      "Analizá esta resistencia. Respondé exactamente:\nBANDAS: [colores]\nVALOR: [ej: 4.7 kΩ]\nTOLERANCIA: [±%]\nTIPO: [4 o 5 bandas]\nSi no hay resistencia: SIN COMPONENTE"));
    } catch(e){ setResult("⚠ "+e.message); }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Lector de Resistencias</div>
      <CameraView captureLabel={loading?"Analizando…":"📷 Leer bandas"} onCapture={loading?null:analyze}/>
      {result&&<div style={S.res(col)}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,marginBottom:6,fontWeight:700}}>RESULTADO</div>
        <pre style={{fontFamily:MONO,fontSize:13,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.9}}>{result}</pre>
      </div>}
      <div style={S.note}>Apuntá la cámara con buena luz y presioná Leer bandas.</div>
    </div>
  );
}

// ── Integrados ────────────────────────────────────────────────────────────────
function ToolIntegrado() {
  const col=C.violet;
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const analyze=async b64=>{
    setLoading(true); setResult(null);
    try{ setResult(await askClaude(b64,
      "Analizá este IC/integrado.\nMARKING: [texto en chip]\nCOMPONENTE: [nombre]\nFUNCIÓN: [breve]\nENCAPSULADO: [tipo y pines]\nCÓMO PROBARLO:\n[pasos para técnico]\nEQUIVALENTE: [si existe]\nSi no hay componente: SIN COMPONENTE"));
    } catch(e){ setResult("⚠ "+e.message); }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Identificador de IC</div>
      <CameraView captureLabel={loading?"Identificando…":"📷 Identificar IC"} onCapture={loading?null:analyze}/>
      {result&&<div style={S.res(col)}>
        <pre style={{fontFamily:MONO,fontSize:12,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.9}}>{result}</pre>
      </div>}
      <div style={S.note}>Enfocá el marking del chip con buena luz.</div>
    </div>
  );
}

// ── Distancia ─────────────────────────────────────────────────────────────────
function ToolDistancia() {
  const col=C.violet;
  const [mode,setMode]=useState(null);
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const [captured,setCaptured]=useState(null), [pts,setPts]=useState([]);
  const [phase,setPhase]=useState("ref1"), [refMM,setRefMM]=useState("85.6");
  const tapCanvas=useRef();

  const reset=()=>{ setCaptured(null);setResult(null);setPts([]);setPhase("ref1");setMode(null); };

  const onCapture=async(b64,canvas)=>{
    setCaptured(b64); setResult(null);
    if(mode==="claude"){
      setLoading(true);
      try{ setResult(await askClaude(b64,
        "Estimá distancias en esta foto. Si hay objeto de referencia conocido (tarjeta crédito 85.6×54mm, moneda, regla) usalo como escala.\nREFERENCIA: [objeto]\nMEDIDAS:\n[lista en cm]\nPRECISIÓN: [±X%]"));
      } catch(e){ setResult("⚠ "+e.message); }
      setLoading(false);
    } else {
      setTimeout(()=>{
        const tc=tapCanvas.current; if(!tc) return;
        const img=new Image(); img.onload=()=>tc.getContext("2d").drawImage(img,0,0,tc.width,tc.height);
        img.src="data:image/jpeg;base64,"+b64;
        setPts([]); setPhase("ref1");
      },100);
    }
  };

  const handleTap=e=>{
    if(!captured||mode!=="tap") return;
    const tc=tapCanvas.current, rect=tc.getBoundingClientRect();
    const sx=tc.width/rect.width, sy=tc.height/rect.height;
    const touch=e.touches?.[0]||e;
    const px=(touch.clientX-rect.left)*sx, py=(touch.clientY-rect.top)*sy;
    const ctx=tc.getContext("2d");
    ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2);
    ctx.fillStyle=phase==="target"?C.green:C.amber; ctx.fill();
    ctx.strokeStyle="#000"; ctx.lineWidth=2; ctx.stroke();
    const np=[...pts,{x:px,y:py}]; setPts(np);
    if(phase==="ref1") setPhase("ref2");
    else if(phase==="ref2"){
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(px,py);
      ctx.strokeStyle=C.amber; ctx.lineWidth=3; ctx.setLineDash([8,4]); ctx.stroke(); ctx.setLineDash([]);
      setPhase("target");
    } else {
      const [p1,p2,p3]=np;
      const scale=parseFloat(refMM)/Math.hypot(p2.x-p1.x,p2.y-p1.y);
      const d1=Math.hypot(p3.x-p1.x,p3.y-p1.y)*scale;
      const d2=Math.hypot(p3.x-p2.x,p3.y-p2.y)*scale;
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p3.x,p3.y);
      ctx.strokeStyle=C.green; ctx.lineWidth=2; ctx.stroke();
      setResult(`Desde P1: ${(d1/10).toFixed(1)} cm  (${d1.toFixed(0)} mm)\nDesde P2: ${(d2/10).toFixed(1)} cm  (${d2.toFixed(0)} mm)\nEscala: ${scale.toFixed(2)} mm/px`);
      setPhase("done");
    }
  };

  if(!mode) return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Medidor de Distancia</div>
      <div style={{...S.note,textAlign:"center",padding:18}}>¿Cómo querés medir?</div>
      <button style={S.btn("p",col)} onClick={()=>setMode("claude")}>🤖  IA estima con referencia</button>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",lineHeight:1.6}}>
        Poné una tarjeta de crédito o moneda como referencia en la foto
      </div>
      <button style={S.btn("s")} onClick={()=>setMode("tap")}>✋  Medir tocando la pantalla</button>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",lineHeight:1.6}}>
        Tocás 2 puntos de referencia conocida → luego el punto a medir
      </div>
    </div>
  );
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Distancia — {mode==="claude"?"IA":"Toque"}</div>
      {mode==="tap"&&!captured&&(
        <div style={S.row}>
          <span style={{fontFamily:MONO,fontSize:10,color:C.dim,alignSelf:"center",whiteSpace:"nowrap"}}>Ref mm:</span>
          <input style={{...S.inp,flex:1}} type="number" value={refMM} onChange={e=>setRefMM(e.target.value)}/>
        </div>
      )}
      {mode==="tap"&&captured&&(
        <div style={{...S.pill(col),textAlign:"center",padding:"6px 14px",fontSize:11}}>
          {{ref1:"Tocá PUNTO 1 de la referencia",ref2:"Tocá PUNTO 2 de la referencia",target:"Tocá el punto a medir",done:"✓ Listo"}[phase]}
        </div>
      )}
      {!captured
        ? <CameraView captureLabel={loading?"Analizando…":"📷 Capturar"} onCapture={loading?null:onCapture}/>
        : <>
            {mode==="tap"&&<canvas ref={tapCanvas} width={640} height={360}
              style={{width:"100%",borderRadius:8,border:`1px solid ${C.bord}`,cursor:"crosshair"}}
              onClick={handleTap} onTouchEnd={handleTap}/>}
            <button style={S.btn("s")} onClick={reset}>↺ Volver a empezar</button>
          </>
      }
      {result&&<div style={S.res(col)}><pre style={{fontFamily:MONO,fontSize:13,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.8}}>{result}</pre></div>}
    </div>
  );
}


// ── Sensores Jack — herramientas individuales ────────────────────────────────
const JACK_MODS = {
  jack_thermo:  { label:"Temperatura",   unit:"°C",  icon:"🌡",  col:"#FF3355", convert:v=>v*100-40,           stereo:false },
  jack_thermo2: { label:"Dual Temp",     unit:"°C",  icon:"🌡🌡",col:"#B06EFF", convert:v=>v*100-40,           stereo:true  },
  jack_air:     { label:"Flujo de aire", unit:"m/s", icon:"💨",  col:"#4D9EFF", convert:v=>Math.sqrt(Math.max(0,v)*8), stereo:false },
  jack_volt:    { label:"Voltaje CC",    unit:"V",   icon:"⚡",  col:"#FFB830", convert:v=>v*30,               stereo:false },
  jack_light:   { label:"Luminosidad",   unit:"lux", icon:"☀️",  col:"#B06EFF", convert:v=>Math.pow(Math.max(0,v)*10,2.5), stereo:false },
  jack_raw:     { label:"Señal cruda",   unit:"mV",  icon:"〜",  col:"#00EF88", convert:v=>v*1000,            stereo:false },
};

function ToolJackSensor({ modId }) {
  const m = JACK_MODS[modId];
  const col = m.col;
  const [on,setOn]=useState(false), [val,setVal]=useState(null), [val2,setVal2]=useState(null);
  const [peak,setPeak]=useState(null), [minV,setMin]=useState(null), [err,setErr]=useState(null);
  const anlRef=useRef(null), rafRef=useRef(), stRef=useRef(), canRef=useRef();

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:2 }
      });
      stRef.current = s;
      const actx = new AudioContext(), src2 = actx.createMediaStreamSource(s);
      const splitter = actx.createChannelSplitter(2);
      src2.connect(splitter);
      const anlL = actx.createAnalyser(); anlL.fftSize = 1024;
      const anlR = actx.createAnalyser(); anlR.fftSize = 1024;
      splitter.connect(anlL, 0); splitter.connect(anlR, 1);
      anlRef.current = { L:anlL, R:anlR };
      setOn(true); setErr(null);
      const td = new Float32Array(anlL.fftSize), td2 = new Float32Array(anlR.fftSize);
      const draw = () => {
        anlL.getFloatTimeDomainData(td);
        let rms=0; for(let i=0;i<td.length;i++) rms+=td[i]*td[i];
        rms=Math.sqrt(rms/td.length);
        const v = m.convert(rms);
        setVal(v); setPeak(p=>p===null||v>p?v:p); setMin(n=>n===null||v<n?v:n);
        if(m.stereo) {
          anlR.getFloatTimeDomainData(td2);
          let rms2=0; for(let i=0;i<td2.length;i++) rms2+=td2[i]*td2[i];
          setVal2(m.convert(Math.sqrt(rms2/td2.length)));
        }
        const c = canRef.current;
        if(c) {
          const cx=c.getContext("2d"),W=c.width,H=c.height;
          cx.fillStyle="rgba(0,0,0,0.75)"; cx.fillRect(0,0,W,H);
          cx.strokeStyle="rgba(255,255,255,0.06)"; cx.lineWidth=1;
          for(let i=1;i<4;i++){cx.beginPath();cx.moveTo(0,H*i/4);cx.lineTo(W,H*i/4);cx.stroke();}
          cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath();
          const sw=W/td.length;
          for(let i=0;i<td.length;i++){const y=(1-td[i])*H/2;i===0?cx.moveTo(0,y):cx.lineTo(i*sw,y);}
          cx.stroke();
        }
        rafRef.current=requestAnimationFrame(draw);
      };
      rafRef.current=requestAnimationFrame(draw);
    } catch(e){ setErr("Sin acceso al jack: "+e.message); }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false); setVal(null); setVal2(null);
  };
  useEffect(()=>()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); },[]);

  const fmt = v => {
    if(v===null||isNaN(v)) return "---";
    return Math.abs(v)<10?v.toFixed(2):Math.abs(v)<100?v.toFixed(1):Math.round(v).toString();
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ {m.icon} {m.label}</div>

      {/* Display principal */}
      {!m.stereo ? (
        <div style={{ ...S.disp(col), display:"flex", flexDirection:"column", alignItems:"center",
                      justifyContent:"center", padding:"28px 18px", minHeight:140 }}>
          <div style={{ fontFamily:MONO, fontSize:64, fontWeight:700, color:col, lineHeight:1,
                        textShadow:`0 0 30px ${col}` }}>{fmt(val)}</div>
          <div style={{ fontFamily:MONO, fontSize:16, color:`rgba(${rgb(col)},0.7)`, marginTop:6 }}>{m.unit}</div>
          <div style={S.dlbl}>{m.label.toUpperCase()}</div>
        </div>
      ) : (
        <>
          <div style={S.row}>
            <div style={{ ...S.disp("#FF3355"), flex:1, textAlign:"center", padding:"16px 8px" }}>
              <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>SONDA 1 (L)</div>
              <div style={{ fontFamily:MONO, fontSize:38, fontWeight:700, color:"#FF3355",
                            textShadow:"0 0 20px #FF3355" }}>{fmt(val)}</div>
              <div style={{ fontFamily:MONO, fontSize:12, color:C.dim }}>°C</div>
            </div>
            <div style={{ ...S.disp(col), flex:1, textAlign:"center", padding:"16px 8px" }}>
              <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>SONDA 2 (R)</div>
              <div style={{ fontFamily:MONO, fontSize:38, fontWeight:700, color:col,
                            textShadow:`0 0 20px ${col}` }}>{fmt(val2)}</div>
              <div style={{ fontFamily:MONO, fontSize:12, color:C.dim }}>°C</div>
            </div>
          </div>
          {val!==null && val2!==null && (
            <div style={{ ...S.disp(C.amber), textAlign:"center", padding:"10px 16px" }}>
              <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>DIFERENCIA</div>
              <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700, color:C.amber,
                            textShadow:`0 0 16px ${C.amber}` }}>
                {Math.abs(parseFloat(fmt(val))-parseFloat(fmt(val2))).toFixed(1)} °C
              </div>
            </div>
          )}
        </>
      )}

      {/* Forma de onda */}
      <canvas ref={canRef} width={640} height={80}
        style={{ width:"100%", borderRadius:8, border:`1px solid rgba(${rgb(col)},0.2)`,
                 background:"rgba(0,0,0,0.7)" }}/>

      {/* Min/Max */}
      {(peak!==null||minV!==null) && (
        <div style={S.row}>
          <div style={{ ...S.disp(C.blue), flex:1, textAlign:"center", padding:"10px 8px" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>MÍN</div>
            <div style={{ fontFamily:MONO, fontSize:24, fontWeight:700, color:C.blue,
                          textShadow:`0 0 12px ${C.blue}` }}>{fmt(minV)} {m.unit}</div>
          </div>
          <div style={{ ...S.disp(C.red), flex:1, textAlign:"center", padding:"10px 8px" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>MÁX</div>
            <div style={{ fontFamily:MONO, fontSize:24, fontWeight:700, color:C.red,
                          textShadow:`0 0 12px ${C.red}` }}>{fmt(peak)} {m.unit}</div>
          </div>
          <button style={{ ...S.btn("s"), flex:.45, padding:"8px 4px", fontSize:11 }}
            onClick={()=>{setPeak(null);setMin(null);}}>Reset</button>
        </div>
      )}

      {err && <div style={{ color:C.amber, fontFamily:MONO, fontSize:10, lineHeight:1.6 }}>{err}</div>}
      {!on
        ? <button style={S.btn("p", col)} onClick={start}>Conectar {m.icon} {m.label}</button>
        : <button style={S.btn("r")} onClick={stop}>Desconectar</button>
      }
      {m.stereo && <div style={S.note}>Conectá sonda 1 al canal L y sonda 2 al canal R del jack estéreo TRRS.</div>}
      {!m.stereo && <div style={S.note}>Conectá el sensor al jack 3.5mm. Ver manual para construir {m.label === "Temperatura" ? "ThermoJack" : m.icon+" módulo"}.</div>}
    </div>
  );
}

// ── Decibelímetro ── auto-start + picos + duración ────────────────────────────
function ToolDecibeles() {
  const col=C.cyan;
  const [db,setDb]=useState(null), [peak,setPeak]=useState(null);
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [events,setEvents]=useState([]); // {db,dur,ts}
  const [thresh,setThresh]=useState(75);
  const anlRef=useRef(),rafRef=useRef(),stRef=useRef();
  const evRef=useRef(null); // {startMs, maxDb}

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:true}); stRef.current=s;
      const actx=new AudioContext(), src=actx.createMediaStreamSource(s);
      const anl=actx.createAnalyser(); anl.fftSize=512; src.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);
      const buf=new Float32Array(anl.fftSize);
      const tick=()=>{
        anl.getFloatTimeDomainData(buf);
        let rms=0; for(let i=0;i<buf.length;i++) rms+=buf[i]*buf[i];
        rms=Math.sqrt(rms/buf.length);
        const v=rms>0?Math.max(0,20*Math.log10(rms)+90):0;
        setDb(v.toFixed(1));
        setPeak(p=>p===null||v>parseFloat(p)?v.toFixed(1):p);
        // Detección de eventos sobre umbral
        const now=Date.now();
        if(v>=thresh){
          if(!evRef.current) evRef.current={startMs:now,maxDb:v};
          else if(v>evRef.current.maxDb) evRef.current.maxDb=v;
        } else {
          if(evRef.current){
            const dur=((now-evRef.current.startMs)/1000).toFixed(1);
            const ev={db:evRef.current.maxDb.toFixed(1),dur,ts:new Date().toLocaleTimeString()};
            setEvents(prev=>[ev,...prev.slice(0,6)]);
            evRef.current=null;
          }
        }
        rafRef.current=requestAnimationFrame(tick);
      };
      rafRef.current=requestAnimationFrame(tick);
    } catch(e){ setErr("Sin micrófono: "+e.message); }
  };

  const stop=()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); setOn(false); setDb(null); };
  // Auto-start al montar
  useEffect(()=>{ start(); return()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); }; },[]);

  const v=parseFloat(db)||0;
  const pct=Math.min(v/120*100,100);
  const bc=v<60?C.green:v<80?C.amber:C.red;
  const label=v<45?"SILENCIOSO":v<60?"AMBIENTE":v<75?"CONVERSACIÓN":v<90?"RUIDOSO":"⚠ PELIGROSO";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Decibelímetro SPL</div>
      <div style={{...S.disp(col),display:"flex",alignItems:"baseline",gap:4}}>
        <span style={S.dval(col)}>{db??"---"}</span>
        <span style={S.dunt}>dB</span>
        <div style={{flex:1}}/>
        <span style={{fontFamily:MONO,fontSize:10,color:bc,textShadow:`0 0 8px ${bc}`,fontWeight:700}}>{on?label:"---"}</span>
      </div>
      {/* Barra */}
      <div style={{background:"rgba(255,255,255,0.07)",borderRadius:8,height:16,overflow:"hidden",border:`1px solid ${C.bord}`}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:8,transition:"width .06s",
          background:`linear-gradient(90deg,${C.green},${C.amber},${C.red})`,
          boxShadow:pct>75?`${glow(C.red,0.5)}`:"none"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:9,color:C.dim}}>
        {["0","30","60","90","120 dB"].map(l=><span key={l}>{l}</span>)}
      </div>
      {/* Umbral */}
      <div style={S.row}>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim,alignSelf:"center",whiteSpace:"nowrap"}}>Umbral eventos:</span>
        <input style={{...S.inp,flex:1}} type="range" min={40} max={110} value={thresh} onChange={e=>setThresh(+e.target.value)}/>
        <span style={{fontFamily:MONO,fontSize:12,color:col,fontWeight:700,alignSelf:"center",minWidth:36}}>{thresh} dB</span>
      </div>
      {peak&&(
        <div style={S.row}>
          <div style={{...S.disp(C.red),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>PICO MÁXIMO</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:C.red,textShadow:`0 0 14px ${C.red}`}}>{peak} dB</div>
          </div>
          <button style={{...S.btn("s"),flex:.5,padding:"8px 4px",fontSize:11}} onClick={()=>setPeak(null)}>Reset</button>
        </div>
      )}
      {/* Eventos */}
      {events.length>0&&(
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,marginBottom:8,fontWeight:700}}>EVENTOS ≥ {thresh} dB</div>
          {events.map((ev,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",
              borderBottom:i<events.length-1?`1px solid ${C.bord}`:"none"}}>
              <span style={{fontFamily:MONO,fontSize:13,color:C.red,fontWeight:700}}>{ev.db} dB</span>
              <span style={{fontFamily:MONO,fontSize:11,color:C.amber}}>{ev.dur} s</span>
              <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{ev.ts}</span>
            </div>
          ))}
          <button style={{...S.btn("s"),marginTop:8,fontSize:10}} onClick={()=>setEvents([])}>Borrar historial</button>
        </div>
      )}
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{err}</div>}
      {on?<button style={S.btn("r")} onClick={stop}>Detener</button>
         :<button style={S.btn("p",col)} onClick={start}>Activar micrófono</button>}
    </div>
  );
}

// ── Nivel ── auto-start Android ───────────────────────────────────────────────
function ToolNivel() {
  const col=C.cyan;
  const [model,setModel]=useState("bubble");
  const [ang,setAng]=useState({b:0,g:0}), [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [hasData,setHasData]=useState(false);
  const hRef=useRef(null);

  const startMotion = () => {
    // Usar DeviceMotionEvent (acelerómetro) — más confiable que orientation
    const h = e => {
      const ax = e.accelerationIncludingGravity?.x || 0;
      const ay = e.accelerationIncludingGravity?.y || 0;
      const az = e.accelerationIncludingGravity?.z || -9.8;
      const g2 = Math.sqrt(ax*ax+ay*ay+az*az)||9.8;
      const gamma = Math.asin(Math.max(-1,Math.min(1,ax/g2)))*180/Math.PI;
      const beta  = Math.asin(Math.max(-1,Math.min(1,-ay/g2)))*180/Math.PI;
      setAng({b:beta, g:gamma}); setHasData(true);
    };
    hRef.current = h;
    window.addEventListener("devicemotion", h, true);
    setOn(true); setErr(null);
    setTimeout(()=>setHasData(d=>{ if(!d) setErr("Sin datos del acelerómetro — verifica permisos en el sistema"); return d; }), 3000);
  };

  const start = async () => {
    if(typeof DeviceMotionEvent?.requestPermission==="function"){
      try{ const p=await DeviceMotionEvent.requestPermission(); if(p!=="granted"){setErr("Permiso denegado");return;} }
      catch(e){ setErr(e.message); return; }
    }
    startMotion();
  };

  const stop = () => {
    if(hRef.current) window.removeEventListener("devicemotion",hRef.current,true);
    setOn(false); setAng({b:0,g:0}); setHasData(false);
  };

  // Android auto-start
  useEffect(()=>{
    if(typeof DeviceMotionEvent?.requestPermission!=="function"){ startMotion(); }
    return ()=>{ if(hRef.current) window.removeEventListener("devicemotion",hRef.current,true); };
  },[]);

  const gx=ang.g, gy=ang.b;
  const bx=Math.max(-38,Math.min(38,-gx*1.4));
  const by=Math.max(-38,Math.min(38,-gy*1.4));
  const flat=Math.abs(gx)<1.5&&Math.abs(gy)<1.5;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Nivel Digital</div>
      <div style={S.row}>
        {[["bubble","🔵 Burbuja"],["horizon","📐 Horizonte"]].map(([md,l])=>(
          <button key={md} style={{...S.btn(model===md?"p":"s",col),flex:1,fontSize:11}}
            onClick={()=>setModel(md)}>{l}</button>
        ))}
      </div>

      {model==="bubble" && (
        <div style={{...S.disp(col),display:"flex",justifyContent:"center",padding:20,minHeight:210}}>
          <div style={{position:"relative",width:190,height:190}}>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid rgba(${rgb(col)},0.3)`,background:"rgba(0,0,0,0.8)"}}/>
            <div style={{position:"absolute",inset:22,borderRadius:"50%",border:`1px solid rgba(${rgb(col)},0.15)`}}/>
            <div style={{position:"absolute",inset:44,borderRadius:"50%",border:`1px solid rgba(${rgb(col)},0.1)`}}/>
            <div style={{position:"absolute",top:"50%",left:10,right:10,height:1,background:`rgba(${rgb(col)},0.15)`,transform:"translateY(-50%)"}}/>
            <div style={{position:"absolute",left:"50%",top:10,bottom:10,width:1,background:`rgba(${rgb(col)},0.15)`,transform:"translateX(-50%)"}}/>
            <div style={{position:"absolute",top:"50%",left:"50%",width:20,height:20,marginTop:-10,marginLeft:-10,
              borderRadius:"50%",border:`1.5px solid rgba(${rgb(col)},${flat?.7:.2})`,transition:"border-color .3s"}}/>
            <div style={{position:"absolute",top:"50%",left:"50%",width:36,height:36,marginTop:-18,marginLeft:-18,
              transform:`translate(${bx}px,${by}px)`,borderRadius:"50%",transition:"transform .08s ease-out",
              background:flat?`radial-gradient(circle at 35% 35%,${col}CC,${col}55)`:`radial-gradient(circle at 35% 35%,${C.blue}CC,${C.blue}44)`,
              border:`2px solid ${flat?col:C.blue}`,
              boxShadow:flat?`0 0 22px ${col}`:` 0 0 12px ${C.blue}55`}}/>
          </div>
        </div>
      )}

      {model==="horizon" && (
        <div style={{...S.disp(col),display:"flex",justifyContent:"center",alignItems:"center",
          minHeight:140,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column"}}>
            <div style={{flex:1,background:"rgba(14,165,233,0.06)"}}/>
            <div style={{flex:1,background:"rgba(0,239,136,0.04)"}}/>
          </div>
          <div style={{position:"relative",width:"88%",zIndex:2}}>
            <div style={{height:3,borderRadius:3,
              background:flat?col:C.amber,
              transform:`rotate(${gx}deg)`,transition:"transform .06s ease-out",
              boxShadow:flat?`0 0 16px ${col}`:`0 0 10px ${C.amber}`}}/>
          </div>
          <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",
            fontFamily:MONO,fontSize:12,color:flat?col:C.amber,fontWeight:700,textShadow:`0 0 8px ${flat?col:C.amber}`}}>
            {gx.toFixed(1)}°
          </div>
        </div>
      )}

      <div style={S.row}>
        <div style={{...S.disp(col),flex:1,textAlign:"center"}}>
          <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:col,textShadow:`0 0 14px ${col}`}}>{gx.toFixed(1)}°</div>
          <div style={S.dlbl}>LATERAL</div>
        </div>
        <div style={{...S.disp(C.blue),flex:1,textAlign:"center"}}>
          <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:C.blue,textShadow:`0 0 14px ${C.blue}`}}>{gy.toFixed(1)}°</div>
          <div style={S.dlbl}>INCLINACIÓN</div>
        </div>
      </div>

      {on&&hasData&&<div style={S.tag(flat)}>{flat?"✓  NIVELADO  ±1.5°":"⊘  FUERA DE NIVEL"}</div>}
      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6}}>{err}</div>}
      {typeof DeviceMotionEvent?.requestPermission==="function" && !on && (
        <button style={S.btn("p",col)} onClick={start}>Activar nivel</button>
      )}
      {on && typeof DeviceMotionEvent?.requestPermission==="function" && (
        <button style={S.btn("r")} onClick={stop}>Detener</button>
      )}
      <div style={S.note}>Apoyá el celular sobre la superficie. Usa el acelerómetro para mayor precisión.</div>
    </div>
  );
}

// ── Brújula ── auto-start Android ─────────────────────────────────────────────
function ToolBrujula() {
  const col=C.cyan;
  const [hdg,setHdg]=useState(null), [on,setOn]=useState(false), [err,setErr]=useState(null);
  const hRef=useRef(null), needsPerm=typeof DeviceOrientationEvent?.requestPermission==="function";

  const cardinal=deg=>{
    const d=((deg%360)+360)%360;
    const cards=["N","NE","E","SE","S","SO","O","NO"];
    return cards[Math.round(d/45)%8];
  };

  const startListener=()=>{
    let gotAbs=false;
    const hAbs=e=>{ if(e.alpha==null) return; gotAbs=true; setHdg((360-e.alpha+360)%360); };
    const hRel=e=>{ if(gotAbs) return; if(e.webkitCompassHeading!=null) setHdg(e.webkitCompassHeading); };
    hRef.current={abs:hAbs,rel:hRel};
    window.addEventListener("deviceorientationabsolute",hAbs,true);
    window.addEventListener("deviceorientation",hRel,true);
    setOn(true); setErr(null);
    setTimeout(()=>setHdg(p=>{ if(p===null) setErr("Sin datos — mové el celular en figura 8"); return p; }),5000);
  };
    const start=async()=>{
    if(needsPerm){
      try{ const p=await DeviceOrientationEvent.requestPermission(); if(p!=="granted"){setErr("Permiso denegado");return;} }
      catch(e){ setErr(e.message); return; }
    }
    startListener();
  };

  const stop=()=>{
    if(hRef.current){
      window.removeEventListener("deviceorientationabsolute",hRef.current?.abs||hRef.current,true);
      window.removeEventListener("deviceorientation",hRef.current?.rel||hRef.current,true);
    }
    setOn(false); setHdg(null);
  };

  useEffect(()=>{
    if(!needsPerm){ startListener(); return ()=>{ if(hRef.current){ window.removeEventListener("deviceorientationabsolute",hRef.current,true); window.removeEventListener("deviceorientation",hRef.current,true); } }; }
  },[]);

  const deg=hdg!==null?Math.round(hdg):null;
  const card=deg!==null?cardinal(deg):"--";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Brújula Digital</div>
      {/* Rosa */}
      <div style={{...S.disp(col),display:"flex",justifyContent:"center",padding:20}}>
        <div style={{position:"relative",width:180,height:180}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid rgba(${rgb(col)},0.25)`,background:"rgba(0,0,0,0.6)"}}/>
          {/* Marcas cardinales fijas */}
          {[["N",0],["E",90],["S",180],["O",270]].map(([l,a])=>(
            <div key={l} style={{position:"absolute",width:"100%",height:"100%",transform:`rotate(${a}deg)`}}>
              <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",
                fontFamily:MONO,fontSize:l==="N"?14:10,fontWeight:700,
                color:l==="N"?C.red:col,textShadow:l==="N"?`0 0 8px ${C.red}`:`0 0 8px ${col}`}}>{l}</div>
            </div>
          ))}
          {/* Aguja giratoria */}
          <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"center",alignItems:"center",
            transform:`rotate(${deg??0}deg)`,transition:"transform .2s ease-out"}}>
            <div style={{position:"relative",width:4,height:140}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:C.red,borderRadius:"2px 2px 0 0",
                boxShadow:`0 0 10px ${C.red}`}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:"50%",background:col,borderRadius:"0 0 2px 2px"}}/>
            </div>
          </div>
          {/* Centro */}
          <div style={{position:"absolute",top:"50%",left:"50%",width:12,height:12,marginTop:-6,marginLeft:-6,
            borderRadius:"50%",background:C.amber,boxShadow:`0 0 10px ${C.amber}`}}/>
        </div>
      </div>
      <div style={S.row}>
        <div style={{...S.disp(col),flex:2,textAlign:"center"}}>
          <div style={{fontFamily:MONO,fontSize:48,fontWeight:700,color:col,textShadow:`0 0 20px ${col}`,lineHeight:1}}>
            {deg!==null?deg+"°":"---"}
          </div>
          <div style={S.dlbl}>RUMBO</div>
        </div>
        <div style={{...S.disp(C.amber),flex:1,textAlign:"center"}}>
          <div style={{fontFamily:MONO,fontSize:36,fontWeight:700,color:C.amber,textShadow:`0 0 16px ${C.amber}`,lineHeight:1}}>
            {card}
          </div>
          <div style={S.dlbl}>CARDINAL</div>
        </div>
      </div>
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11,lineHeight:1.6}}>{err}</div>}
      {needsPerm&&!on&&<button style={S.btn("p",col)} onClick={start}>Activar brújula</button>}
      {on&&needsPerm&&<button style={S.btn("r")} onClick={stop}>Detener</button>}
      <div style={S.note}>Mantené el celular horizontal y alejado de metales. La aguja roja apunta al norte magnético.</div>
    </div>
  );
}

// ── Osciloscopio ── auto-snapshot en picos ────────────────────────────────────
function ToolOscilo() {
  const col=C.cyan;
  const cRef=useRef(),anlRef=useRef(),rafRef=useRef(),stRef=useRef(),actxRef=useRef(),snapRef=useRef();
  const [on,setOn]=useState(false), [freq,setFreq]=useState(null), [err,setErr]=useState(null);
  const [snaps,setSnaps]=useState([]), [autoSnap,setAutoSnap]=useState(true);
  const lastSnapRef=useRef(0), prevAboveRef=useRef(false);
  const AUTO_THRESH=0.3, AUTO_COOLDOWN=3000;

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:true}); stRef.current=s;
      const actx=new AudioContext(); actxRef.current=actx;
      const src=actx.createMediaStreamSource(s);
      const anl=actx.createAnalyser(); anl.fftSize=8192; src.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);
      const DISP=2048, td=new Float32Array(anl.fftSize), fd=new Float32Array(anl.frequencyBinCount);
      const draw=()=>{
        const c=cRef.current; if(!c) return;
        const cx=c.getContext("2d"),W=c.width,H=c.height;
        anl.getFloatTimeDomainData(td);
        cx.fillStyle="rgba(0,0,0,0.85)"; cx.fillRect(0,0,W,H);
        cx.strokeStyle="rgba(255,255,255,0.06)"; cx.lineWidth=1;
        for(let i=1;i<4;i++){cx.beginPath();cx.moveTo(0,H*i/4);cx.lineTo(W,H*i/4);cx.stroke();}
        for(let i=1;i<8;i++){cx.beginPath();cx.moveTo(W*i/8,0);cx.lineTo(W*i/8,H);cx.stroke();}
        let trig=0;
        for(let i=1;i<td.length-DISP;i++) if(td[i-1]<0&&td[i]>=0){trig=i;break;}
        cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath();
        const sw=W/DISP;
        for(let i=0;i<DISP;i++){const y=(1-td[trig+i])*H/2;i===0?cx.moveTo(0,y):cx.lineTo(i*sw,y);}
        cx.stroke();
        // Frecuencia con interpolación parabólica
        anl.getFloatFrequencyData(fd);
        let mi=1,mv=-Infinity;
        for(let i=1;i<fd.length-1;i++) if(fd[i]>mv){mv=fd[i];mi=i;}
        if(mv>-80){
          const a=fd[mi-1],b=fd[mi],cc=fd[mi+1];
          const fHz=(mi+0.5*(a-cc)/(a-2*b+cc+1e-9))*actx.sampleRate/anl.fftSize;
          setFreq(fHz.toFixed(1));
          // Amplitud para auto-snap
          let maxAmp=0; for(let i=0;i<td.length;i++) if(Math.abs(td[i])>maxAmp) maxAmp=Math.abs(td[i]);
          const above=maxAmp>AUTO_THRESH;
          if(above&&!prevAboveRef.current&&autoSnap&&Date.now()-lastSnapRef.current>AUTO_COOLDOWN){
            lastSnapRef.current=Date.now();
            const img=c.toDataURL("image/png");
            setSnaps(prev=>[{img,freq:fHz.toFixed(1),ts:new Date().toLocaleTimeString(),auto:true},...prev.slice(0,4)]);
          }
          prevAboveRef.current=above;
        } else setFreq(null);
        rafRef.current=requestAnimationFrame(draw);
      };
      rafRef.current=requestAnimationFrame(draw);
    } catch(e){ setErr("Sin micrófono: "+e.message); }
  };

  const stop=()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); actxRef.current?.close(); setOn(false); setFreq(null); };
  const snap=()=>{ const c=cRef.current; if(!c) return; const img=c.toDataURL("image/png"); setSnaps(prev=>[{img,freq,ts:new Date().toLocaleTimeString(),auto:false},...prev.slice(0,4)]); };
  useEffect(()=>()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); actxRef.current?.close(); },[]);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Osciloscopio de Audio</div>
      <canvas ref={cRef} width={640} height={200}
        style={{width:"100%",borderRadius:10,border:`1px solid rgba(${rgb(col)},0.3)`,background:"rgba(0,0,0,0.85)"}}/>
      {freq&&on&&(
        <div style={{...S.disp(col),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <span style={S.dval(col,34)}>{freq}</span>
            <span style={S.dunt}>Hz</span>
            <div style={S.dlbl}>FRECUENCIA DOMINANTE</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
            <button style={{...S.btn("s"),width:"auto",padding:"8px 12px",fontSize:11}} onClick={snap}>📸 Snap</button>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>Auto</span>
              <div style={{width:32,height:18,borderRadius:9,background:autoSnap?col:"rgba(255,255,255,0.1)",
                border:`1px solid ${C.bord}`,cursor:"pointer",position:"relative",transition:"background .2s"}}
                onClick={()=>setAutoSnap(a=>!a)}>
                <div style={{position:"absolute",top:2,left:autoSnap?14:2,width:14,height:14,
                  borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
              </div>
            </div>
          </div>
        </div>
      )}
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{err}</div>}
      <div style={S.row}>
        {!on?<button style={{...S.btn("p",col),flex:1}} onClick={start}>Activar</button>
            :<><button style={{...S.btn("r"),flex:1}} onClick={stop}>Detener</button>
               <button style={{...S.btn("s"),flex:.5,fontSize:11}} onClick={snap}>📸 Snap</button></>}
      </div>
      {snaps.length>0&&(
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,marginBottom:8,fontWeight:700}}>CAPTURAS</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {snaps.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center"}}>
                <img src={s.img} alt="snap" style={{width:100,borderRadius:6,border:`1px solid rgba(${rgb(col)},0.3)`}}/>
                <div>
                  <div style={{fontFamily:MONO,fontSize:14,color:col,fontWeight:700}}>{s.freq} Hz</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{s.auto?"⚡ auto · ":""}{s.ts}</div>
                  <a href={s.img} download={`osc_${s.ts.replace(/:/g,"-")}.png`}
                    style={{fontFamily:MONO,fontSize:9,color:C.blue}}>⬇ Descargar</a>
                </div>
              </div>
            ))}
            <button style={{...S.btn("s"),fontSize:10}} onClick={()=>setSnaps([])}>Borrar capturas</button>
          </div>
        </div>
      )}
      <div style={S.note}>Resolución ~5 Hz · Auto-snap captura picos de amplitud automáticamente · Manual con 📸</div>
    </div>
  );
}


// ── Red / Internet ────────────────────────────────────────────────────────────
function ToolRed() {
  const col = C.blue;
  const [info, setInfo]   = useState(null);
  const [speed, setSpeed] = useState(null);
  const [ping, setPing]   = useState(null);
  const [testing, setTesting] = useState(false);
  const [err, setErr]     = useState(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || null;
    setInfo({
      type:        conn?.effectiveType || "desconocido",
      downlink:    conn?.downlink || null,
      rtt:         conn?.rtt || null,
      saveData:    conn?.saveData || false,
    });
  }, []);

  const runTest = async () => {
    setTesting(true); setSpeed(null); setPing(null); setErr(null);
    try {
      // Ping
      const p0 = performance.now();
      await fetch("https://www.gstatic.com/generate_204", { mode:"no-cors", cache:"no-store" });
      const pingMs = Math.round(performance.now() - p0);
      setPing(pingMs);

      // Download speed (10MB from Cloudflare)
      const t0 = performance.now();
      const res = await fetch("https://speed.cloudflare.com/__down?bytes=5000000", { cache:"no-store" });
      const blob = await res.blob();
      const secs = (performance.now() - t0) / 1000;
      const mbps = ((blob.size * 8) / secs / 1e6).toFixed(1);
      setSpeed(mbps);
    } catch(e) {
      setErr("No se pudo completar el test: " + e.message);
    }
    setTesting(false);
  };

  const typeCol = { "4g":C.green, "3g":C.amber, "2g":C.red, "slow-2g":C.red }[info?.type] || C.dim;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Red e Internet</div>

      {/* Tipo de conexión */}
      {info && (
        <div style={{ ...S.disp(typeCol), display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <span style={{ ...S.dval(typeCol, 40) }}>{info.type.toUpperCase()}</span>
            <div style={S.dlbl}>TIPO DE CONEXIÓN</div>
          </div>
          <div style={{ textAlign:"right" }}>
            {info.downlink && <div style={{ fontFamily:MONO, fontSize:14, color:col, fontWeight:700 }}>{info.downlink} Mbps</div>}
            {info.rtt && <div style={{ fontFamily:MONO, fontSize:11, color:C.dim }}>RTT: {info.rtt} ms</div>}
            {info.saveData && <div style={S.pill(C.amber)}>Datos reducidos</div>}
          </div>
        </div>
      )}

      {/* Resultados del test */}
      {(ping !== null || speed !== null) && (
        <div style={S.row}>
          {ping !== null && (
            <div style={{ ...S.disp(ping < 50 ? C.green : ping < 150 ? C.amber : C.red), flex:1, textAlign:"center" }}>
              <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700,
                            color: ping < 50 ? C.green : ping < 150 ? C.amber : C.red,
                            textShadow:`0 0 12px ${ping<50?C.green:C.amber}` }}>{ping}</div>
              <div style={S.dlbl}>PING (ms)</div>
            </div>
          )}
          {speed !== null && (
            <div style={{ ...S.disp(C.cyan), flex:1, textAlign:"center" }}>
              <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700, color:C.cyan, textShadow:`0 0 12px ${C.cyan}` }}>{speed}</div>
              <div style={S.dlbl}>BAJADA (Mbps)</div>
            </div>
          )}
        </div>
      )}

      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11, lineHeight:1.6 }}>{err}</div>}

      <button style={{ ...S.btn("p", col), opacity: testing ? 0.7 : 1 }}
        onClick={testing ? null : runTest}>
        {testing ? "Midiendo… (puede tardar 10s)" : "▶ Medir velocidad"}
      </button>

      <div style={S.note}>
        Mide la velocidad de bajada real y el ping hacia servidores externos.
        Para medir la señal WiFi usá la barra de estado del sistema.
      </div>
    </div>
  );
}



// ── Sistema / Optimización ────────────────────────────────────────────────────
function ToolSistema() {
  const col = C.cyan;
  const [storage,  setStorage]  = useState(null);
  const [bat,      setBat]      = useState(null);
  const [bench,    setBench]    = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState(null);
  const [benchRun, setBenchRun] = useState(false);
  const [open,     setOpen]     = useState({bat:false,mem:false,storage:false,net:false});

  const conn = navigator.connection || navigator.mozConnection || null;

  useEffect(()=>{
    // Batería
    navigator.getBattery?.().then(b=>{
      setBat({ level: Math.round(b.level*100), charging: b.charging,
               chargingTime: b.chargingTime, dischargingTime: b.dischargingTime });
      b.addEventListener("levelchange", ()=>setBat(prev=>({...prev, level: Math.round(b.level*100)})));
      b.addEventListener("chargingchange",()=>setBat(prev=>({...prev, charging: b.charging})));
    });
    // Almacenamiento
    navigator.storage?.estimate().then(e=>{
      const used = e.usage||0, quota = e.quota||0;
      setStorage({ usedMB:(used/1e6).toFixed(1), quotaMB:(quota/1e6).toFixed(0),
                   pct: quota>0?Math.round(used/quota*100):0 });
    });
  },[]);

  // ── Limpiar caché de la app ───────────────────────────────────────────────
  const cleanCache = async () => {
    setCleaning(true); setCleanMsg(null);
    try {
      const keys = await caches.keys();
      let totalDeleted = 0;
      for (const key of keys) {
        const cache = await caches.open(key);
        const reqs  = await cache.keys();
        totalDeleted += reqs.length;
        await caches.delete(key);
      }
      // También limpiar localStorage de la app si hay algo
      const lsKeys = Object.keys(localStorage||{}).filter(k=>k.startsWith("sem_"));
      lsKeys.forEach(k=>localStorage.removeItem(k));
      setCleanMsg({ ok:true, msg:`Caché eliminada: ${keys.length} cache(s) · ${totalDeleted} recursos · ${lsKeys.length} items localStorage` });
      // Recalcular storage
      navigator.storage?.estimate().then(e=>{
        setStorage({ usedMB:(e.usage/1e6).toFixed(1), quotaMB:(e.quota/1e6).toFixed(0),
                     pct: e.quota>0?Math.round(e.usage/e.quota*100):0 });
      });
    } catch(e){ setCleanMsg({ok:false, msg:"Error: "+e.message}); }
    setCleaning(false);
  };

  // ── Benchmark de rendimiento ──────────────────────────────────────────────
  const runBench = () => {
    setBenchRun(true); setBench(null);
    setTimeout(()=>{
      const results = {};
      // CPU: operaciones float en 1 segundo
      let ops=0; const t0=performance.now();
      while(performance.now()-t0<500) { Math.sqrt(Math.random()*1e6); ops++; }
      results.cpu = ops*2; // ops/s

      // Memoria: allocar y leer arrays
      const m0=performance.now();
      const arr=new Float32Array(1e6);
      for(let i=0;i<arr.length;i++) arr[i]=i*0.001;
      results.mem = Math.round(performance.now()-m0);

      // Render: requestAnimationFrame latency estimado
      results.cpuGrade = results.cpu>3e6?"Excelente":results.cpu>1.5e6?"Bueno":results.cpu>5e5?"Regular":"Lento";
      results.memGrade = results.mem<20?"Excelente":results.mem<60?"Bueno":results.mem<150?"Regular":"Lento";

      setBench(results); setBenchRun(false);
    },100);
  };

  // ── Tips por área ────────────────────────────────────────────────────────
  const batLevel = bat?.level||100;
  const batTips = batLevel>60 ? [
    "✓ Batería en buen nivel — podés usar todas las herramientas",
    "Usá herramientas de cámara e IA con total normalidad",
  ] : batLevel>30 ? [
    "⚡ Bajá el brillo de pantalla al mínimo útil",
    "⚡ Desactivá WiFi si usás solo datos o viceversa",
    "⚡ Cerrá otras apps en segundo plano",
    "⚡ Evitá usar cámara y micrófono simultáneamente",
  ] : [
    "🔴 Batería crítica — conectá el cargador",
    "🔴 Evitá herramientas de cámara (consumen mucho)",
    "🔴 El osciloscopio y decibelímetro son de bajo consumo — preferí esos",
    "🔴 Activá modo ahorro de energía en ajustes del sistema",
  ];

  const memGB = navigator.deviceMemory || 4;
  const memTips = memGB>=6 ? [
    "✓ RAM suficiente para todas las herramientas simultáneas",
    "Podés mantener la app abierta en segundo plano sin problema",
  ] : memGB>=3 ? [
    "Cerrá apps no usadas antes de trabajar con IA y cámara",
    "Si la app se cierra sola, es por falta de RAM — cerrá otras",
    "No tengas música o navegador abiertos en paralelo",
  ] : [
    "🔴 RAM limitada — trabajá con una sola herramienta a la vez",
    "🔴 El navegador puede matar la app si hay muchas pestañas abiertas",
    "🔴 Reiniciá el celular periódicamente para liberar RAM fragmentada",
    "🔴 Para herramientas de IA usá conexión WiFi para reducir carga",
  ];

  const storagePct = storage?.pct||0;
  const storageTips = storagePct<60 ? [
    "✓ Almacenamiento con espacio suficiente",
    "Las capturas del osciloscopio se guardan en memoria de sesión (no ocupan espacio permanente)",
  ] : storagePct<85 ? [
    "Borrá fotos y videos viejos del carrete",
    "Limpiá la caché del navegador desde Ajustes → Apps",
    "Desinstalá apps que no uses",
  ] : [
    "🔴 Almacenamiento casi lleno — puede afectar el rendimiento general",
    "🔴 Presioná LIMPIAR CACHÉ DE APP para recuperar espacio de SEM Tools",
    "🔴 Borrá archivos grandes: videos, fotos duplicadas, descargas viejas",
    "🔴 Usá Google Fotos en modo 'liberar espacio' para comprimir fotos",
  ];

  const netType = conn?.effectiveType||"4g";
  const netTips = netType==="4g"||netType==="wifi" ? [
    "✓ Conexión buena para todas las herramientas de IA",
    "Resistencias e Integrados IC funcionan bien con esta conexión",
  ] : netType==="3g" ? [
    "Herramientas de IA (Resistencias, Integrados) van a tardar más",
    "Preferí WiFi si está disponible",
    "Cerrá otras apps que consuman datos en segundo plano",
  ] : [
    "🔴 Conexión lenta — herramientas de IA no van a funcionar bien",
    "🔴 Usá las herramientas locales: Nivel, Brújula, Decibelímetro, Osciloscopio",
    "🔴 Conectate a WiFi antes de usar Resistencias o Integrados IC",
  ];

  const toggle = k => setOpen(o=>({...o,[k]:!o[k]}));

  const Section = ({id,icon,title,value,valueCol,tips,warning}) => (
    <div style={{...glass(valueCol||col,0.06),borderRadius:12,overflow:"hidden",
      border:`1px solid rgba(${rgb(valueCol||col)},0.22)`,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}
        onClick={()=>toggle(id)}>
        <span style={{fontSize:24}}>{icon}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.text}}>{title}</div>
          <div style={{fontFamily:MONO,fontSize:13,color:valueCol||col,fontWeight:700,
            textShadow:`0 0 10px ${valueCol||col}88`,marginTop:2}}>{value}</div>
        </div>
        {warning && <span style={S.pill(C.amber)}>{warning}</span>}
        <span style={{fontFamily:MONO,fontSize:14,color:C.dim}}>{open[id]?"▲":"▼"}</span>
      </div>
      {open[id] && (
        <div style={{padding:"0 16px 14px",borderTop:`1px solid rgba(${rgb(valueCol||col)},0.15)`}}>
          {tips.map((t,i)=>(
            <div key={i} style={{fontFamily:MONO,fontSize:10,color:
              t.startsWith("✓")?C.green:t.startsWith("🔴")?C.red:t.startsWith("⚡")?C.amber:C.dim,
              lineHeight:1.8,paddingTop:i===0?10:0}}>{t}</div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Sistema · Optimización</div>

      {/* Acciones rápidas */}
      <div style={{...S.disp(col),padding:"14px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:12,letterSpacing:2}}>
          ACCIONES DISPONIBLES
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>

          {/* Limpiar caché */}
          <button style={{...S.btn("p",col),display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}
            onClick={cleaning?null:cleanCache} disabled={cleaning}>
            <span style={{fontSize:16}}>🗑</span>
            {cleaning?"Limpiando…":"Limpiar caché de SEM Tools"}
          </button>
          {cleanMsg && (
            <div style={{fontFamily:MONO,fontSize:10,
              color:cleanMsg.ok?C.green:C.red,lineHeight:1.7,
              background:`rgba(${cleanMsg.ok?rgb(C.green):rgb(C.red)},0.08)`,
              borderRadius:8,padding:"8px 12px"}}>
              {cleanMsg.ok?"✓ ":""}{cleanMsg.msg}
            </div>
          )}

          {/* Benchmark */}
          <button style={{...S.btn("s"),display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}
            onClick={benchRun?null:runBench} disabled={benchRun}>
            <span style={{fontSize:16}}>⚡</span>
            {benchRun?"Midiendo rendimiento…":"Test de rendimiento (CPU + Memoria)"}
          </button>
          {bench && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{...S.disp(C.blue),textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>CPU</div>
                <div style={{fontFamily:MONO,fontSize:20,fontWeight:700,color:C.blue,textShadow:`0 0 12px ${C.blue}`}}>
                  {(bench.cpu/1e6).toFixed(1)}M ops/s
                </div>
                <div style={{fontFamily:MONO,fontSize:10,color:bench.cpuGrade==="Excelente"?C.green:bench.cpuGrade==="Bueno"?C.amber:C.red}}>
                  {bench.cpuGrade}
                </div>
              </div>
              <div style={{...S.disp(C.violet),textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>MEMORIA</div>
                <div style={{fontFamily:MONO,fontSize:20,fontWeight:700,color:C.violet,textShadow:`0 0 12px ${C.violet}`}}>
                  {bench.mem} ms
                </div>
                <div style={{fontFamily:MONO,fontSize:10,color:bench.memGrade==="Excelente"?C.green:bench.memGrade==="Bueno"?C.amber:C.red}}>
                  {bench.memGrade}
                </div>
              </div>
            </div>
          )}

          {/* Forzar actualización */}
          <button style={{...S.btn("s"),display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}
            onClick={()=>window.location.reload(true)}>
            <span style={{fontSize:16}}>🔄</span> Forzar actualización de la app
          </button>
        </div>
      </div>

      {/* Diagnóstico por área — expandible */}
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:6}}>
        DIAGNÓSTICO POR ÁREA (tocá para ver consejos)
      </div>

      <Section id="bat" icon="🔋"
        title="Batería"
        value={bat ? `${bat.level}% · ${bat.charging?"⚡ Cargando":"Descargando"}` : "Cargando…"}
        valueCol={batLevel>60?C.green:batLevel>30?C.amber:C.red}
        tips={batTips}
        warning={batLevel<30&&!bat?.charging?"¡Cargá!":null}
      />
      <Section id="mem" icon="🧠"
        title={`RAM — ${navigator.deviceMemory||"?"}GB · ${navigator.hardwareConcurrency||"?"} núcleos`}
        value={memGB>=6?"Amplia":memGB>=3?"Suficiente":"Limitada"}
        valueCol={memGB>=6?C.green:memGB>=3?C.amber:C.red}
        tips={memTips}
      />
      <Section id="storage" icon="💾"
        title={`Almacenamiento${storage?` — ${storage.usedMB}MB / ${storage.quotaMB}MB`:""}`}
        value={storage?`${storage.pct}% usado`:"Calculando…"}
        valueCol={storagePct<60?C.green:storagePct<85?C.amber:C.red}
        tips={storageTips}
        warning={storagePct>85?"¡Casi lleno!":null}
      />
      <Section id="net" icon="📶"
        title={`Red — ${(conn?.effectiveType||"?").toUpperCase()}${conn?.downlink?` · ${conn.downlink}Mbps`:""}`}
        value={netType==="4g"||netType==="wifi"?"Buena":netType==="3g"?"Regular":"Lenta"}
        valueCol={netType==="4g"||netType==="wifi"?C.green:netType==="3g"?C.amber:C.red}
        tips={netTips}
      />

      <div style={S.note}>
        La limpieza de caché elimina recursos guardados por SEM Tools (service worker). La app los vuelve a descargar al próximo uso. No borra datos del sistema ni de otras apps.
      </div>
    </div>
  );
}

// ── Marketplace de Módulos ─────────────────────────────────────────────────────
const MODULE_CATALOG = [
  {
    id:"tacolasr", icon:"⚙️", name:"Tacómetro Láser",
    col:C.green, status:"dev",
    desc:"Mide RPM sin contacto y sin efecto estroboscópico. Láser 650nm + fotodiodo + cinta reflectante. Rango: 30 – 60.000 RPM.",
    iface:"Jack 3.5mm + USB-C alimentación",
    price:"ARS 12.000 aprox.",
    specs:["Rango: 30–60.000 RPM","Precisión ±0.1%","Alimentación: USB-C 5V","Señal: jack 3.5mm","Incluye: cinta reflectante + soporte magnético"],
  },
  {
    id:"oscilo2", icon:"〜", name:"Osciloscopio 500kHz",
    col:C.cyan, status:"design",
    desc:"Osciloscopio real de 2 canales hasta 500kHz. STM32 + ADC 12-bit + Bluetooth BLE. 25× mejor que audio.",
    iface:"Bluetooth BLE",
    price:"ARS 28.000 aprox.",
    specs:["2 canales simultáneos","BW: DC–500 kHz","ADC: 12-bit","Muestra: 2 Msps","Trigger: automático / manual","Batería interna 8h"],
  },
  {
    id:"comptest", icon:"◻", name:"Tester de Componentes",
    col:C.violet, status:"design",
    desc:"Identifica y mide resistencias, capacitores, inductores, transistores, MOSFETs, diodos, LEDs y cristales. Sin tocar ningún menú.",
    iface:"Bluetooth BLE",
    price:"ARS 18.000 aprox.",
    specs:["Autodetección de tipo","R: 0.1Ω – 50MΩ","C: 1pF – 100mF","L: 1µH – 1H","ESR de electrolíticos","hFE de transistores NPN/PNP"],
  },
  {
    id:"termo2", icon:"🌡🌡", name:"Sondas Dual Temperatura",
    col:C.red, status:"available",
    desc:"Dos sondas NTC calibradas en un solo conector TRRS. Mide dos puntos simultáneamente y calcula diferencial.",
    iface:"Jack 3.5mm (estéreo)",
    price:"ARS 4.500 aprox.",
    specs:["2 sondas NTC calibradas","Rango: -40°C a +125°C","Precisión: ±0.5°C","Longitud: 1m c/u","Conector TRRS integrado"],
  },
  {
    id:"termocam", icon:"🌡", name:"Cámara Termográfica",
    col:C.orange, status:"design",
    desc:"Sensor IR MLX90640 (32×24px) superpuesto en tiempo real sobre la cámara del celular. Detecta puntos calientes en equipos electrónicos, motores y transformadores.",
    iface:"Bluetooth BLE",
    price:"ARS 45.000 aprox.",
    specs:["Sensor: MLX90640","Resolución: 32×24 pixels","Rango: -40°C a +300°C","Precisión: ±1.5°C","Superposición sobre cámara HD","Paleta de colores configurable"],
  },
  {
    id:"redcable", icon:"🔗", name:"Tester de Red / Cable UTP",
    col:C.blue, status:"design",
    desc:"Prueba continuidad de cables UTP, coaxial y fibra óptica. Reporta par defectuoso, cortocircuito y longitud aproximada via Bluetooth.",
    iface:"Bluetooth BLE",
    price:"ARS 15.000 aprox.",
    specs:["UTP Cat5/6/7","Coaxial 50Ω/75Ω","Mide longitud por TDR","Detecta par roto/invertido","2 cabezales incluidos"],
  },
];

const STATUS_LABEL = {
  available: { label:"Disponible", col:C.green },
  dev:       { label:"En desarrollo", col:C.amber },
  design:    { label:"En diseño", col:C.violet },
};

function ToolModulos() {
  const [sel, setSel] = useState(null);
  const col = C.green;

  if (sel) {
    const m = MODULE_CATALOG.find(x => x.id === sel);
    const st = STATUS_LABEL[m.status];
    return (
      <div style={S.wrap}>
        <button style={S.btn("s")} onClick={() => setSel(null)}>← Volver al catálogo</button>
        <div style={{ fontSize:40, textAlign:"center", filter:`drop-shadow(0 0 12px ${m.col}88)` }}>{m.icon}</div>
        <div style={{ fontFamily:MONO, fontSize:16, fontWeight:700, color:m.col, textAlign:"center",
                      textShadow:`0 0 16px ${m.col}` }}>{m.name}</div>
        <div style={{ textAlign:"center" }}><span style={S.pill(st.col)}>{st.label}</span></div>
        <div style={{ ...S.res(m.col), fontFamily:MONO, fontSize:11, color:C.text, lineHeight:1.9 }}>{m.desc}</div>
        <div style={{ ...S.disp(m.col) }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginBottom:8 }}>ESPECIFICACIONES</div>
          {m.specs.map((s,i) => (
            <div key={i} style={{ fontFamily:MONO, fontSize:11, color:C.text, lineHeight:1.9 }}>
              <span style={{ color:m.col }}>▸ </span>{s}
            </div>
          ))}
        </div>
        <div style={S.row}>
          <div style={{ ...S.disp(C.amber), flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>INTERFAZ</div>
            <div style={{ fontFamily:MONO, fontSize:11, color:C.amber, fontWeight:700, marginTop:4 }}>{m.iface}</div>
          </div>
          <div style={{ ...S.disp(C.green), flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>PRECIO EST.</div>
            <div style={{ fontFamily:MONO, fontSize:11, color:C.green, fontWeight:700, marginTop:4 }}>{m.price}</div>
          </div>
        </div>
        {m.status === "available"
          ? <button style={S.btn("p", C.green)}>🛒  Consultar disponibilidad</button>
          : <div style={S.tag(false)}>⏳  {st.label} — te avisamos cuando esté listo</div>
        }
        <div style={S.note}>Los módulos son de fabricación local. Compatible con Android 8+ y iOS 14+. Sin drivers adicionales.</div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Módulos de Hardware</div>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
        Módulos fabricados localmente que extienden las capacidades de la app.
        Conectan por jack 3.5mm, USB-C o Bluetooth BLE.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {MODULE_CATALOG.map(m => {
          const st = STATUS_LABEL[m.status];
          return (
            <div key={m.id} style={{ ...S.card(m.col) }} onClick={() => setSel(m.id)}>
              <div style={{ fontSize:28, filter:`drop-shadow(0 0 8px ${m.col}66)` }}>{m.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:C.text }}>{m.name}</div>
                  <span style={S.pill(st.col)}>{st.label}</span>
                </div>
                <div style={{ fontSize:10, color:C.dim, lineHeight:1.45 }}>{m.desc.slice(0,80)}…</div>
                <div style={{ fontFamily:MONO, fontSize:9, color:m.col, marginTop:6 }}>{m.iface} · {m.price}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Módulo placeholder ────────────────────────────────────────────────────────
function ModulePlaceholder({icon,title,why,when}) {
  return (
    <div style={{...S.wrap,alignItems:"center",paddingTop:24}}>
      <div style={{fontSize:52,marginBottom:8,filter:`drop-shadow(0 0 12px ${C.green}88)`}}>{icon}</div>
      <div style={{fontFamily:MONO,fontSize:16,fontWeight:700,color:C.dim,marginBottom:8}}>{title}</div>
      <div style={{fontFamily:MONO,fontSize:11,color:C.dim,lineHeight:1.9,textAlign:"center",marginBottom:16}}>{why}</div>
      <div style={S.pill(C.green)}>📡 Módulo externo · Próximamente</div>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginTop:12,lineHeight:1.8,textAlign:"center"}}>{when}</div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({onSel}) {
  const [sector,setSector]=React.useState(null);
  if(sector){
    const bl=BLOCKS.find(b=>b.id===sector);
    return (
      <div style={S.wrap}>
        <button style={{...S.btn("s"),display:"flex",alignItems:"center",gap:8,textAlign:"left"}}
          onClick={()=>setSector(null)}>
          <span>←</span> {bl.icon} {bl.label}
        </button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {bl.tools.map(tid=>{
            const t=TOOL[tid]; const disabled=tid==="tacometro";
            return (
              <div key={tid} style={{...S.card(t.col),opacity:disabled?.6:1,flexDirection:"column",alignItems:"flex-start",minHeight:110}}
                onClick={()=>!disabled&&onSel(tid)}>
                <div style={{fontSize:32,filter:`drop-shadow(0 0 10px ${t.col}88)`,marginBottom:6}}>{t.icon}</div>
                <div style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4}}>{t.label}</div>
                <div style={{fontSize:10,color:C.dim,lineHeight:1.5}}>{t.sub}</div>
                {disabled&&<div style={{marginTop:8}}><span style={S.pill(C.green)}>módulo</span></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:8}}>
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:2,textAlign:"center",paddingBottom:4}}>SELECCIONÁ UN BLOQUE</div>
      {BLOCKS.map(bl=>(
        <button key={bl.id} style={{
          border:`1px solid rgba(${rgb(bl.col)},0.3)`, borderLeft:`4px solid ${bl.col}`,
          borderRadius:14, padding:"18px 20px",
          background:`rgba(${rgb(bl.col)},0.07)`,
          cursor:"pointer", display:"flex", alignItems:"center", gap:16,
          boxShadow:`0 2px 20px rgba(0,0,0,0.3)`,
          backdropFilter:"blur(10px)", textAlign:"left", width:"100%",
        }} onClick={()=>setSector(bl.id)}>
          <div style={{fontSize:36,filter:`drop-shadow(0 0 12px ${bl.col}99)`}}>{bl.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:MONO,fontSize:14,fontWeight:700,color:bl.col,
              textShadow:`0 0 14px ${bl.col}88`,letterSpacing:1,marginBottom:4}}>{bl.label}</div>
            <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.6}}>
              {bl.tools.map(tid=>TOOL[tid]?.icon).join("  ")}
              {" · "}{bl.tools.length} herramienta{bl.tools.length>1?"s":""}
            </div>
          </div>
          <div style={{fontFamily:MONO,fontSize:22,color:`rgba(${rgb(bl.col)},0.5)`}}>›</div>
        </button>
      ))}
      <div style={{fontFamily:MONO,fontSize:8,color:C.dim,textAlign:"center",letterSpacing:2,paddingTop:8}}>SEM TOOLS v2</div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function getView(tool) {
  switch(tool) {
    case "resistencias": return <ToolResistencias key={tool}/>;
    case "integrados":   return <ToolIntegrado key={tool}/>;
    case "distancia":    return <ToolDistancia key={tool}/>;
    case "decibeles":    return <ToolDecibeles key={tool}/>;
    case "nivel":        return <ToolNivel key={tool}/>;
    case "brujula":      return <ToolBrujula key={tool}/>;
    case "oscilo":       return <ToolOscilo key={tool}/>;
    case "red":          return <ToolRed key={tool}/>;
    case "sistema":      return <ToolSistema key={tool}/>;
    case "modulos":      return <ToolModulos key={tool}/>;
    case "jack_thermo":  return <ToolJackSensor key={tool} modId="jack_thermo"/>;
    case "jack_thermo2": return <ToolJackSensor key={tool} modId="jack_thermo2"/>;
    case "jack_air":     return <ToolJackSensor key={tool} modId="jack_air"/>;
    case "jack_volt":    return <ToolJackSensor key={tool} modId="jack_volt"/>;
    case "jack_light":   return <ToolJackSensor key={tool} modId="jack_light"/>;
    case "jack_raw":     return <ToolJackSensor key={tool} modId="jack_raw"/>;
    case "tacometro":    return <ModulePlaceholder key={tool} icon="⚙️" title="Tacómetro Estroboscópico"
      why={"El efecto estroboscópico puede desencadenar convulsiones.\nRequiere módulo externo con LED controlado."}
      when="LED IR + fotodetector vía USB-C · En desarrollo"/>;
    default: return null;
  }
}

function App() {
  const [tool,setTool]=useState(null);
  const [devInfo,setDevInfo]=useState(null);
  const [showDev,setShowDev]=useState(false);
  const t=tool?TOOL[tool]:null;
  const col=t?.col||C.amber;

  useEffect(()=>{ getDeviceInfo().then(setDevInfo); },[]);

  useEffect(()=>{
    const l=document.createElement("link"); l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap";
    document.head.appendChild(l);
  },[]);

  const batPct = devInfo?.bat ? Math.round(devInfo.bat.level*100) : null;
  const batLow  = batPct !== null && batPct < 20 && !devInfo?.bat?.charging;

  return (
    <div style={S.app}>
      {showDev && <DevicePanel info={devInfo} onClose={()=>setShowDev(false)}/>}
      <div style={S.hdr}>
        {tool&&<button style={{border:"none",background:"none",color:col,fontFamily:MONO,fontSize:22,cursor:"pointer",padding:"0 8px 0 0",textShadow:`0 0 12px ${col}66`}} onClick={()=>setTool(null)}>←</button>}
        <div>
          <div style={{...S.logo,color:col}}>{t?`${t.icon} ${t.label}`:"SEM Tools"}</div>
          <div style={S.sub}>HERRAMIENTAS DE TALLER</div>
        </div>
        <div style={{flex:1}}/>
        <button style={{border:"none",background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}} onClick={()=>setShowDev(true)}>
          <span style={{fontSize:14,lineHeight:1}}>{batLow?"🔴":"📱"}</span>
          {batPct!==null&&<span style={{fontFamily:MONO,fontSize:8,color:batLow?C.red:C.dim,fontWeight:700}}>{batPct}%</span>}
        </button>
      </div>
      <div style={S.body}>
        {tool===null?<Home onSel={setTool}/>:getView(tool)}
      </div>
      <div style={S.nav}>
        <button style={S.nb(tool===null,C.amber)} onClick={()=>setTool(null)}>
          <span style={{fontSize:18}}>⊞</span>
          <span style={S.nl}>INICIO</span>
        </button>
        {tool&&<button style={{...S.nb(true,col),flex:3,alignItems:"flex-start",paddingLeft:16,pointerEvents:"none"}}>
          <span style={{fontFamily:MONO,fontSize:11,color:col,textShadow:`0 0 8px ${col}`}}>{t?.icon} {t?.label}</span>
          <span style={{...S.nl,color:C.dim}}>ACTIVO</span>
        </button>}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
