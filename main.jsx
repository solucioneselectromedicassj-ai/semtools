import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ── Service Worker ──────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

const VERSION = "2.6";

// ── Helpers ──────────────────────────────────────────────────────────────────
const rgb = hex => { if(!hex||typeof hex!=='string'||!hex.startsWith('#')) return '128,128,128'; return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`; };
const glow = (h,a=0.45) => h?`0 0 22px rgba(${rgb(h)},${a})`:'none';
const glass = (h,a=0.06) => ({ background:`rgba(${rgb(h)},${a})`, backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)" });


// ── Sistema de íconos SVG inline (sin dependencias externas) ─────────────────
const SVG_PATHS = {
  decibeles:    ["M11 5L6 9H2v6h4l5 4V5z","M15.54 8.46a5 5 0 0 1 0 7.07","M19.07 4.93a10 10 0 0 1 0 14.14"],
  nivel:        ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M12 8v4l3 3","M4.93 4.93l1.41 1.41M19.07 4.93l-1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2"],
  brujula:      ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"],
  oscilo:       ["M22 12h-4l-3 9L9 3l-3 9H2"],
  sistema:      ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 8v4","M12 16h.01"],
  qr:           ["M3 3h6v6H3z","M15 3h6v6h-6z","M3 15h6v6H3z","M15 15h.01","M21 15h.01","M15 21h.01","M21 21h.01","M21 18h-3","M18 21v-3"],
  ir:           ["M5 12.55a11 11 0 0 1 14.08 0","M1.42 9a16 16 0 0 1 21.16 0","M8.53 16.11a6 6 0 0 1 6.95 0","M12 20h.01"],
  endoscopio:   ["M23 7l-7 5 7 5V7z","M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1V5z"],
  resistencias: ["M10 2L3 12h18L14 2z","M12 12v10","M8 22h8"],
  integrados:   ["M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4","M9 3v18","M3 9h6","M3 15h6","M15 9h6","M15 15h6"],
  distancia:    ["M21 3H3","M21 21H3","M3 3v18","M21 3v18","M9 12h6","M12 9l3 3-3 3"],
  jack_thermo:  ["M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"],
  jack_thermo2: ["M9 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a3.5 3.5 0 1 0 5 0z","M15 14.76V7.5a2.5 2.5 0 0 1 5 0v7.26a3.5 3.5 0 1 1-5 0z"],
  jack_air:     ["M9.59 4.59A2 2 0 1 1 11 8H2","M10.59 11.41A2 2 0 1 0 14 16H2","M15.73 8.73A2.5 2.5 0 1 1 19.5 12H2"],
  jack_volt:    ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  jack_light:   ["M12 1v2","M12 21v2","M4.22 4.22l1.42 1.42","M18.36 18.36l1.42 1.42","M1 12h2","M21 12h2","M4.22 19.78l1.42-1.42","M18.36 5.64l1.42-1.42","M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"],
  jack_raw:     ["M2 12c2-4 4-6 6-6s4 8 6 8 4-2 6-2"],
  red:          ["M5 12.55a11 11 0 0 1 14.08 0","M1.42 9a16 16 0 0 1 21.16 0","M8.53 16.11a6 6 0 0 1 6.95 0","M12 20h.01"],
  ping:         ["M22 12h-4l-3 9L9 3l-3 9H2"],
  lan:          ["M9 3H5a2 2 0 0 0-2 2v4","M9 3h10a2 2 0 0 1 2 2v4","M9 3v18","M3 9h18","M5 21h14a2 2 0 0 0 2-2V9"],
  http:         ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M12 8v8","M8 12h8"],
  ble:          ["M6.5 6.5l11 11","M6.5 17.5l11-11","M12 2v4","M12 18v4"],
  ipinfo:       ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z","M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  modulos:      ["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z","M3.27 6.96L12 12l8.73-5.05","M12 22.08V12"],
  tacometro:    ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 12l4-4"],
  celular:      ["M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z","M12 18h.01"],
  camara:       ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  jack:         ["M12 2v8","M8 6H4","M20 6h-4","M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z","M12 18v4"],
  celularplus:  ["M1 6l4.5 4.5","M22.5 6l-4.5 4.5","M5.5 10.5l3 3","M19.5 10.5l-3 3","M8.5 13.5l3 3","M15.5 13.5l-3 3","M12 17h.01"],
  modulos_bl:   ["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8","M12 22V12","M3 8l9 5 9-5","M7 21h10a2 2 0 0 0 2-2v-6"],
  nfc:          ["M3 7V5a2 2 0 0 1 2-2h2","M17 3h2a2 2 0 0 1 2 2v2","M21 17v2a2 2 0 0 1-2 2h-2","M7 21H5a2 2 0 0 1-2-2v-2","M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0","M8 8a6 6 0 0 0 0 8","M16 8a6 6 0 0 1 0 8"],
};

function ToolIcon({ id, size=26, color, strokeWidth=1.6, style={} }) {
  const paths = SVG_PATHS[id];
  if (!paths) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color||"currentColor"} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths.map((d,i) => <path key={i} d={d}/>)}
    </svg>
  );
}

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0D1829", bord:"rgba(255,255,255,0.18)", text:"#F0F4FF", dim:"#8898C0",
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
  endoscopio:   { icon:"🔭", label:"Cámara / Endoscopio",sub:"USB · foto · video · linterna",        col:C.blue   },
  qr:           { icon:"⬛", label:"QR / Código Barras",sub:"Leer · generar · historial",           col:C.green  },
  ir:           { icon:"📡", label:"Control Remoto",  sub:"Detector IR · LAN · módulo TX",         col:C.violet },
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
  ping:         { icon:"📡", label:"Ping",             sub:"Latencia continua · gráfico · loss",    col:C.cyan   },
  lan:          { icon:"🔍", label:"Escáner LAN",      sub:"Detecta dispositivos en la red local",  col:C.blue   },
  http:         { icon:"⚡", label:"HTTP Tester",      sub:"GET/POST a APIs y módulos IoT locales", col:C.violet },
  ble:          { icon:"🔷", label:"Scanner BLE",      sub:"Bluetooth Low Energy · módulos SEM",    col:C.violet },
  ipinfo:       { icon:"🌐", label:"IP / ISP",         sub:"IP pública · proveedor · ubicación",    col:C.green  },
  modulos:      { icon:"📦", label:"Módulos",         sub:"Hardware externo · Catálogo y precios", col:C.green  },
};

const BLOCKS = [
  { id:"celular",  icon:"📱", label:"CELULAR",     col:C.cyan,   tools:["decibeles","nivel","brujula","oscilo","sistema","qr","ir"] },
  { id:"camara",   icon:"📷", label:"CÁMARA + IA", col:C.violet, tools:["resistencias","integrados","distancia","endoscopio"] },
  { id:"jack",     icon:"🔌", label:"JACK 3.5mm",  col:C.orange, tools:["jack_thermo","jack_thermo2","jack_air","jack_volt","jack_light","jack_raw"] },
  { id:"celularplus", icon:"📶", label:"CONECTIVIDAD", col:C.blue, tools:["red","ping","lan","http","ble","ipinfo"] },
  { id:"modulos",  icon:"📡", label:"MÓDULOS",     col:C.green,  tools:["modulos"] },
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
  dlbl: { fontFamily:MONO, fontSize:10, color:C.dim, letterSpacing:1.5, marginTop:5 },
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
  note: { fontFamily:MONO, fontSize:11, color:C.dim, lineHeight:1.8,
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
  st:   col => ({ fontFamily:MONO, fontSize:10, letterSpacing:2,
          color:col, textTransform:"uppercase", fontWeight:700, marginBottom:2 }),
};

// ── Claude API ────────────────────────────────────────────────────────────────
function getUserKey() { try { return localStorage.getItem("sem_gemini_key")||""; } catch(_e){ return ""; } }

async function askClaude(b64, prompt) {
  const key = getUserKey();
  if (!key) throw new Error("NO_KEY");
  const r = await fetch("/api/claude", {
    method:"POST",
    headers:{"Content-Type":"application/json", "x-user-key": key},
    body:JSON.stringify({ model:"gemini-1.5-flash", max_tokens:1000,
      messages:[{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 } },
        { type:"text", text:prompt }
      ]}]
    })
  });
  const d = await r.json();
  if (d.error) {
    if (d.error.message==="NO_KEY"||d.error.message==="INVALID_KEY")
      throw new Error(d.error.message);
    throw new Error(d.error.message);
  }
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

  const [grid,setGrid]=useState(false);
  return (
    <>
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",border:`1px solid ${C.bord}`}}>
        <video ref={vRef} style={{...S.vid,border:"none",borderRadius:0}} playsInline muted/>
        {/* Grilla de encuadre */}
        {grid && on && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
            {[1,2].map(i=>(
              <div key={"v"+i} style={{position:"absolute",top:0,bottom:0,left:`${i*33.33}%`,width:1,background:"rgba(255,255,255,0.35)"}}/>
            ))}
            {[1,2].map(i=>(
              <div key={"h"+i} style={{position:"absolute",left:0,right:0,top:`${i*33.33}%`,height:1,background:"rgba(255,255,255,0.35)"}}/>
            ))}
            {/* Centro */}
            <div style={{position:"absolute",top:"50%",left:"50%",width:20,height:20,
              marginTop:-10,marginLeft:-10,border:"1px solid rgba(255,255,255,0.6)",borderRadius:"50%"}}/>
          </div>
        )}
      </div>
      <canvas ref={cRef} style={{display:"none"}}/>
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{err}</div>}
      <div style={S.row}>
        <button style={{...S.btn(on?"s":"p",C.violet),flex:on?0.5:1}} onClick={()=>on?stop():start()}>
          {on?"Apagar":"Activar cámara"}
        </button>
        {on&&(
          <button style={{...S.btn("s"),flex:.4,background:grid?"rgba(14,165,233,0.25)":"rgba(255,255,255,0.07)",
            color:grid?C.cyan:C.text,border:grid?`1px solid ${C.cyan}`:"none"}}
            onClick={()=>setGrid(g=>!g)}>⊞</button>
        )}
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
function Onboarding({ onDone }) {
  const [step,    setStep]    = useState(1); // 1=apikey, 2=sensors, 3=results
  const [key,     setKey]     = useState("");
  const [testing, setTesting] = useState(false);
  const [err,     setErr]     = useState(null);
  const [caps,    setCaps]    = useState(null);
  const [scanning,setScanning]= useState(false);

  // ── PASO 1: API Key ────────────────────────────────────────────────────────
  const testAndSave = async () => {
    const k = key.trim();
    if (k.length < 15) { setErr("Key muy corta — copiá todo el texto"); return; }
    setTesting(true); setErr(null);
    try {
      for (const ver of ["v1beta","v1"]) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/${ver}/models?key=${k}&pageSize=3`,
          { headers:{"Content-Type":"application/json"} }
        );
        const d = await r.json();
        if (r.ok && d.models?.length > 0) {
          localStorage.setItem("sem_gemini_key", k);
          setStep(2); setTesting(false); return;
        }
        const m = d?.error?.message || "";
        if (m.includes("API_KEY_INVALID") || m.includes("API key not valid"))
          throw new Error("Key inválida — verificá que copiaste bien");
      }
      throw new Error("No se encontraron modelos. Verificá que la API de Gemini esté habilitada.");
    } catch(e) { setErr(e.message); }
    setTesting(false);
  };

  const skipKey = () => {
    localStorage.setItem("sem_gemini_key", "SKIP");
    setStep(2);
  };

  // ── PASO 2: Test sensores ─────────────────────────────────────────────────
  const runTest = async () => {
    setScanning(true);
    const result = await runSensorDetection();
    setCaps(result);
    setScanning(false);
    setStep(3);
  };

  // ── PASO 3: Resultados + entrar ───────────────────────────────────────────
  const finish = () => {
    try { localStorage.setItem("sem_caps", JSON.stringify(caps)); } catch(_e) {}
    onDone(caps);
  };

  const CAP_LABELS = {
    camera:       { label:"Cámara"          },
    microphone:   { label:"Micrófono"       },
    accelerometer:{ label:"Acelerómetro"    },
    gyroscope:    { label:"Giroscopio"      },
    magnetometer: { label:"Magnetómetro"    },
    nfc:          { label:"NFC"             },
    ai:           { label:"IA (Gemini)"     },
  };

  const BG = "linear-gradient(170deg,#0D1829 0%,#152240 100%)";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, background:BG,
                  overflowY:"auto", zIndex:200, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"28px 20px 32px", maxWidth:480, margin:"0 auto", width:"100%",
                    display:"flex", flexDirection:"column", gap:20 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", paddingTop:8 }}>
          <div style={{ fontFamily:MONO, fontSize:26, fontWeight:700, color:C.amber,
                        textShadow:`0 0 24px ${C.amber}` }}>SEM Tools</div>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, letterSpacing:3, marginTop:4 }}>
            CONFIGURACIÓN INICIAL
          </div>
          {/* Barra de progreso */}
          <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:16 }}>
            {[1,2,3].map(n => (
              <div key={n} style={{ height:4, width:60, borderRadius:2,
                background: n <= step ? C.amber : "rgba(255,255,255,0.1)",
                boxShadow: n === step ? `0 0 10px ${C.amber}` : "none",
                transition:"all .3s" }}/>
            ))}
          </div>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:8 }}>
            {step===1?"Paso 1 de 3 — API de IA":step===2?"Paso 2 de 3 — Test de hardware":"Paso 3 de 3 — Resultado"}
          </div>
        </div>

        {/* ── PASO 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div style={{ ...glass(C.violet, 0.08), borderRadius:14, padding:18,
                          border:`1px solid rgba(${rgb(C.violet)},0.25)` }}>
              <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:C.violet, marginBottom:10 }}>
                🤖 HERRAMIENTAS CON IA
              </div>
              <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
                Resistencias, Integrados IC y Distancia usan Google Gemini para analizar fotos.
                La key es gratis y queda solo en tu celular.
              </div>
            </div>

            {[
              { n:"1", icon:"🌐", title:"Abrí Google AI Studio",
                btn: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  style={{ ...S.btn("p",C.blue), display:"block", textDecoration:"none",
                           textAlign:"center", fontFamily:MONO, fontSize:12, fontWeight:700 }}>
                  Abrir Google AI Studio →
                </a>,
                desc:"Se abre en el navegador. Iniciá sesión con tu cuenta Google."
              },
              { n:"2", icon:"🔑", title:'Tocá "Create API key"',
                desc:'Elegí "Default Gemini Project". Copiá todo el texto de la clave (AIzaSy... o AQ...).' },
              { n:"3", icon:"📋", title:"Pegá tu key acá abajo",
                desc:"Queda guardada solo en este celular. Nadie más la ve." },
            ].map(({ n, icon, title, btn, desc }) => (
              <div key={n} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                              background:`rgba(${rgb(C.cyan)},0.15)`,
                              border:`1px solid rgba(${rgb(C.cyan)},0.4)`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontFamily:MONO, fontSize:14, fontWeight:700, color:C.cyan }}>
                  {n}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:C.text, marginBottom:4 }}>
                    {icon} {title}
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.7, marginBottom:btn?10:0 }}>
                    {desc}
                  </div>
                  {btn}
                </div>
              </div>
            ))}

            <input style={{ ...S.inp, fontSize:12 }}
              placeholder="Pegá tu key acá (AIzaSy... o AQ...)"
              value={key} onChange={e=>{ setKey(e.target.value); setErr(null); }}/>
            {err && <div style={{ fontFamily:MONO, fontSize:10, color:C.red, lineHeight:1.6,
                                   background:`rgba(${rgb(C.red)},0.08)`, borderRadius:8, padding:"8px 12px" }}>{err}</div>}
            <button style={{ ...S.btn("p",C.green), opacity:testing?.7:1 }}
              onClick={testing?null:testAndSave}>
              {testing?"Verificando…":"✓ Guardar y continuar"}
            </button>
            <div style={{ textAlign:"center" }}>
              <button style={{ border:"none", background:"none", color:C.dim,
                               fontFamily:MONO, fontSize:10, cursor:"pointer", textDecoration:"underline" }}
                onClick={skipKey}>
                Saltar — usar sin herramientas de IA
              </button>
            </div>
          </>
        )}

        {/* ── PASO 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div style={{ ...glass(C.cyan, 0.07), borderRadius:14, padding:18,
                          border:`1px solid rgba(${rgb(C.cyan)},0.25)`, textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔬</div>
              <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:C.cyan, marginBottom:10 }}>
                Test de hardware
              </div>
              <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.9 }}>
                Vamos a probar qué sensores tiene tu celular para saber qué herramientas van a funcionar.{"\n\n"}
                El test dura 4 segundos. Cuando empiece:{"\n"}
                • Mové el celular suavemente{"\n"}
                • Giralo un poco en todas las direcciones
              </div>
            </div>

            {!scanning
              ? <button style={{ ...S.btn("p",C.cyan), fontSize:13, padding:"16px" }}
                  onClick={runTest}>
                  🔬 Iniciar test de sensores
                </button>
              : <div style={{ ...S.disp(C.cyan), textAlign:"center", padding:"24px 16px" }}>
                  <div style={{ fontFamily:MONO, fontSize:14, color:C.cyan,
                                textShadow:`0 0 16px ${C.cyan}`, marginBottom:8 }}>
                    Probando sensores…
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
                    Mové el celular suavemente en todas las direcciones
                  </div>
                  <div style={{ marginTop:16, display:"flex", justifyContent:"center", gap:6 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:8, height:8, borderRadius:"50%",
                                            background:C.cyan, opacity: 0.4 + i*0.3 }}/>
                    ))}
                  </div>
                </div>
            }
          </>
        )}

        {/* ── PASO 3: RESULTADOS ─────────────────────────────────────────── */}
        {step === 3 && caps && (
          <>
            {/* Sensores detectados */}
            {/* Info del dispositivo */}
            {caps.brand && (
              <div style={{ ...glass(C.amber, 0.07), borderRadius:12, padding:"12px 16px",
                            border:`1px solid rgba(${rgb(C.amber)},0.25)`, marginBottom:4 }}>
                <div style={{ fontFamily:MONO, fontSize:9, color:C.amber, fontWeight:700,
                              letterSpacing:2, marginBottom:8 }}>DISPOSITIVO DETECTADO</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:C.text }}>
                      {caps.brand.brand}
                    </div>
                    <div style={{ fontFamily:MONO, fontSize:10, color:C.dim }}>
                      {caps.brand.model} · {caps.brand.os} {caps.brand.osVer}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={S.pill(caps.jack ? C.green : C.amber)}>
                      Jack 3.5mm: {caps.jack ? "✓ Detectado" : "? No detectado"}
                    </div>
                    <div style={{ fontFamily:MONO, fontSize:8, color:C.dim, marginTop:4 }}>
                      {caps.jack ? "Módulos jack disponibles" : "Usá módulos BLE o USB-C"}
                    </div>
                  </div>
                </div>
                {/* Toggle manual de jack si hay duda */}
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>¿Tenés jack 3.5mm?</span>
                  <div style={{ display:"flex", gap:6 }}>
                    {[true, false].map(v => (
                      <button key={String(v)} style={{
                        border: caps.jack===v ? `2px solid ${C.amber}` : `1px solid ${C.bord}`,
                        borderRadius:6, padding:"4px 12px", cursor:"pointer",
                        background: caps.jack===v ? `rgba(${rgb(C.amber)},0.15)` : "rgba(255,255,255,0.04)",
                        fontFamily:MONO, fontSize:10,
                        color: caps.jack===v ? C.amber : C.dim,
                      }} onClick={() => setCaps(c => ({ ...c, jack: v }))}>
                        {v ? "Sí" : "No"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...S.disp(C.cyan), padding:"14px 16px" }}>
              <div style={{ fontFamily:MONO, fontSize:9, color:C.cyan, fontWeight:700,
                            letterSpacing:2, marginBottom:12 }}>SENSORES DETECTADOS</div>
              {Object.entries(CAP_LABELS).map(([k, { label }]) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0",
                                      borderBottom:`1px solid ${C.bord}` }}>
                  <ToolIcon id={k==="ai"?"sistema":k==="nfc"?"nfc":k==="camera"?"endoscopio":k==="microphone"?"decibeles":k==="accelerometer"?"nivel":k==="magnetometer"?"brujula":k==="gyroscope"?"oscilo":"sistema"} size={18} color={caps[k]?C.green:C.red} strokeWidth={1.6}/>
                  <div style={{ flex:1, fontFamily:MONO, fontSize:11, color:C.text }}>{label}</div>
                  <div style={{ ...S.pill(caps[k]?C.green:C.red) }}>
                    {caps[k]?"✓ Disponible":"✗ No detectado"}
                  </div>
                </div>
              ))}
            </div>

            {/* Herramientas habilitadas/deshabilitadas */}
            <div style={{ ...glass(C.green,0.06), borderRadius:12, padding:"14px 16px",
                          border:`1px solid rgba(${rgb(C.green)},0.2)` }}>
              <div style={{ fontFamily:MONO, fontSize:9, color:C.green, fontWeight:700,
                            letterSpacing:2, marginBottom:10 }}>QUÉ VA A FUNCIONAR EN TU CELULAR</div>
              {Object.entries(TOOL_NEEDS).map(([id, { label, needs }]) => {
                const ok = needs.every(n => caps[n]);
                const missing = needs.filter(n => !caps[n]);
                return (
                  <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0",
                                         borderBottom:`1px solid ${C.bord}` }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0,
                                  background:ok?C.green:C.red,
                                  boxShadow:`0 0 6px ${ok?C.green:C.red}` }}/>
                    <div style={{ flex:1 }}>
                      <span style={{ fontFamily:MONO, fontSize:10,
                                     color:ok?C.text:C.dim }}>{label}</span>
                      {!ok && missing.length > 0 && (
                        <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>
                          {" "}— requiere {missing.join(", ")}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily:MONO, fontSize:12,
                                   color:ok?C.green:C.red }}>{ok?"✓":"✗"}</span>
                  </div>
                );
              })}
            </div>

            {!caps.magnetometer && (
              <div style={{ fontFamily:MONO, fontSize:10, color:C.amber, lineHeight:1.8,
                            background:`rgba(${rgb(C.amber)},0.08)`, borderRadius:8, padding:"10px 12px" }}>
                ⚠ Tu celular no tiene magnetómetro — la brújula no va a funcionar.
                El Nivel sí {caps.accelerometer?"funciona porque tiene acelerómetro.":""}
              </div>
            )}

            {/* Tips específicos del sistema */}
            {caps.brand?.tips?.length > 0 && (
              <div style={{ ...glass(caps.brand.ui==="miui"?C.amber:C.blue, 0.06),
                            borderRadius:12, padding:"14px 16px",
                            border:`1px solid rgba(${rgb(caps.brand.ui==="miui"?C.amber:C.blue)},0.2)` }}>
                <div style={{ fontFamily:MONO, fontSize:9, color:caps.brand.ui==="miui"?C.amber:C.blue,
                              fontWeight:700, letterSpacing:2, marginBottom:10 }}>
                  AJUSTES RECOMENDADOS PARA {caps.brand.brand.toUpperCase()}
                </div>
                {caps.brand.tips.map((t,i) => (
                  <div key={i} style={{ fontFamily:MONO, fontSize:10, color:C.dim,
                                        lineHeight:1.9 }}>{t}</div>
                ))}
              </div>
            )}

            {/* Jack no detectado — mostrar alternativas */}
            {!caps.jack && (
              <div style={{ ...glass(C.orange, 0.06), borderRadius:12, padding:"14px 16px",
                            border:`1px solid rgba(${rgb(C.orange)},0.2)` }}>
                <div style={{ fontFamily:MONO, fontSize:9, color:C.orange, fontWeight:700,
                              letterSpacing:2, marginBottom:8 }}>SIN JACK 3.5mm — ALTERNATIVAS</div>
                {["🔷 Módulos BLE: sensores que se conectan por Bluetooth Low Energy",
                  "🔌 Adaptador USB-C a 3.5mm: permite usar módulos jack en celulares sin jack",
                  "📡 Módulos WiFi: basados en ESP32, se comunican por la red local",
                  "⚡ Módulos USB-C: conexión directa de datos + alimentación 5V"].map((t,i)=>(
                  <div key={i} style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.9 }}>{t}</div>
                ))}
              </div>
            )}

            <button style={{ ...S.btn("p",C.green), fontSize:13, padding:"16px" }}
              onClick={finish}>
              Entrar a SEM Tools →
            </button>
          </>
        )}

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
    } catch(e){ setResult(e.message==="NO_KEY"?"🔑 Configurá tu API key de Gemini (botón 🔑 arriba)":e.message==="INVALID_KEY"?"🔑 API key inválida — tocá 🔑 para reconfigurar":"⚠ "+e.message); }
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
    } catch(e){ setResult(e.message==="NO_KEY"?"🔑 Configurá tu API key de Gemini (botón 🔑 arriba)":e.message==="INVALID_KEY"?"🔑 API key inválida — tocá 🔑 para reconfigurar":"⚠ "+e.message); }
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
  const [model,setModel]=useState("bubble");  // bubble | horizon | regla
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
        {[["bubble","🔵 Burbuja"],["horizon","📐 Horizonte"],["regla","📏 Regla"]].map(([md,l])=>(
          <button key={md} style={{...S.btn(model===md?"p":"s",col),flex:1,fontSize:10}}
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

      {/* Regla: nivel de burbuja lineal horizontal */}
      {model==="regla" && (
        <div style={{...S.disp(col),padding:"24px 20px",display:"flex",flexDirection:"column",gap:16}}>
          {/* Tubo horizontal */}
          <div style={{position:"relative",height:52,borderRadius:26,
            border:`2px solid rgba(${rgb(col)},0.4)`,background:"rgba(0,0,0,0.8)",overflow:"hidden"}}>
            {/* Graduaciones */}
            {Array.from({length:21}).map((_,i)=>{
              const center=i===10, major=i%5===0;
              return (
                <div key={i} style={{position:"absolute",
                  top:center?0:major?8:16,bottom:center?0:major?8:16,
                  left:`${i/20*100}%`,width:center?2:1,
                  background:`rgba(${rgb(col)},${center?0.7:major?0.4:0.2})`}}/>
              );
            })}
            {/* Zona de nivel OK */}
            <div style={{position:"absolute",top:8,bottom:8,left:"calc(50% - 15px)",width:30,
              borderRadius:4,border:`1px solid rgba(${rgb(col)},0.3)`,
              background:`rgba(${rgb(col)},0.06)`}}/>
            {/* Burbuja */}
            <div style={{
              position:"absolute",top:"50%",transform:"translateY(-50%)",
              left:`calc(${Math.min(Math.max(50+gx*2.8,8),92)}% - 20px)`,
              width:40,height:40,borderRadius:"50%",transition:"left .08s ease-out",
              background:flat?`radial-gradient(circle at 35% 35%,${col}CC,${col}55)`:`radial-gradient(circle at 35% 35%,${C.blue}CC,${C.blue}44)`,
              border:`2px solid ${flat?col:C.blue}`,
              boxShadow:flat?`0 0 20px ${col}`:`0 0 10px ${C.blue}55`
            }}/>
          </div>
          {/* Escala */}
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:9,color:C.dim,paddingInline:4}}>
            {["-10°","-5°","0°","+5°","+10°"].map(l=><span key={l}>{l}</span>)}
          </div>
          {/* Lectura vertical también */}
          <div style={{...S.disp(C.blue),textAlign:"center",padding:"10px 16px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>INCLINACIÓN ADELANTE/ATRÁS</div>
            <div style={{fontFamily:MONO,fontSize:22,fontWeight:700,color:C.blue,textShadow:`0 0 12px ${C.blue}`}}>
              {gy.toFixed(1)}°
            </div>
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


// ── Test real de sensores del hardware ───────────────────────────────────────
function SensorTester({ onResult }) {
  const [state, setState] = useState("idle"); // idle | running | done
  const [res,   setRes]   = useState(null);

  const run = async () => {
    setState("running");
    const result = { accel: false, gyro: false, mag: false,
                     magValues: [], accelMax: 0, details: {} };

    await new Promise(resolve => {
      const motionH = e => {
        const ag = e.accelerationIncludingGravity;
        if (ag && (ag.x !== null || ag.y !== null || ag.z !== null)) {
          result.accel = true;
          const mag = Math.sqrt((ag.x||0)**2+(ag.y||0)**2+(ag.z||0)**2);
          result.accelMax = Math.max(result.accelMax, mag);
          result.details.accelX = ag.x?.toFixed(2);
          result.details.accelY = ag.y?.toFixed(2);
          result.details.accelZ = ag.z?.toFixed(2);
        }
        if (e.rotationRate?.alpha !== null) result.gyro = true;
      };
      const oriH = e => {
        if (e.alpha !== null && e.alpha !== undefined) {
          result.magValues.push(e.alpha);
          result.details.alpha = e.alpha?.toFixed(1);
          result.details.beta  = e.beta?.toFixed(1);
          result.details.gamma = e.gamma?.toFixed(1);
        }
      };
      const absH = e => {
        if (e.alpha !== null && e.alpha !== undefined && e.absolute) {
          result.magValues.push(e.alpha);
          result.details.absAlpha = e.alpha?.toFixed(1);
        }
      };
      window.addEventListener("devicemotion",      motionH, true);
      window.addEventListener("deviceorientation", oriH,    true);
      window.addEventListener("deviceorientationabsolute", absH, true);
      setTimeout(() => {
        window.removeEventListener("devicemotion",      motionH, true);
        window.removeEventListener("deviceorientation", oriH,    true);
        window.removeEventListener("deviceorientationabsolute", absH, true);
        // Magnetómetro real: alpha debe variar o ser absoluto
        const vals = result.magValues;
        const range = vals.length > 1
          ? Math.max(...vals) - Math.min(...vals) : 0;
        // Si hay valores absolutos o la variación > 2° → hay magnetómetro
        result.mag = vals.length > 0 && (result.details.absAlpha !== undefined || range > 0.1);
        resolve();
      }, 3500);
    });

    setRes(result);
    setState("done");
    onResult?.(result);
  };

  const Label = ({ok, label, detail}) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                  borderBottom:`1px solid ${C.bord}` }}>
      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                    background:`rgba(${rgb(ok?C.green:C.red)},0.15)`,
                    border:`2px solid ${ok?C.green:C.red}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:16, boxShadow:`0 0 10px ${ok?C.green:C.red}66` }}>
        {ok ? "✓" : "✗"}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700,
                      color:ok?C.green:C.red, textShadow:`0 0 8px ${ok?C.green:C.red}66` }}>
          {label}
        </div>
        {detail && <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:2 }}>{detail}</div>}
      </div>
      <div style={S.pill(ok?C.green:C.red)}>{ok?"Disponible":"No detectado"}</div>
    </div>
  );

  return (
    <div>
      {state === "idle" && (
        <button style={{ ...S.btn("p", C.amber), display:"flex", alignItems:"center",
                         gap:8, justifyContent:"center" }} onClick={run}>
          🔬 Probar sensores del hardware
        </button>
      )}
      {state === "running" && (
        <div style={{ ...S.disp(C.amber), textAlign:"center", padding:"20px 16px" }}>
          <div style={{ fontFamily:MONO, fontSize:13, color:C.amber,
                        textShadow:`0 0 12px ${C.amber}` }}>Probando sensores…</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, marginTop:8, lineHeight:1.7 }}>
            Mové el celular suavemente durante 3 segundos.{"\n"}
            Giralo un poco para probar el magnetómetro.
          </div>
        </div>
      )}
      {state === "done" && res && (
        <div style={{ ...S.disp(C.cyan), padding:"14px 16px" }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.cyan, fontWeight:700,
                        letterSpacing:2, marginBottom:10 }}>RESULTADO DEL TEST</div>
          <Label ok={res.accel} label="Acelerómetro"
            detail={res.accel ? `Valor: ${res.accelMax.toFixed(1)} m/s² · X:${res.details.accelX} Y:${res.details.accelY} Z:${res.details.accelZ}` : "No respondió en 3.5s"} />
          <Label ok={res.gyro} label="Giroscopio"
            detail={res.gyro ? "Detectó rotación" : "Sin datos de rotationRate"} />
          <Label ok={res.mag}  label="Magnetómetro (brújula)"
            detail={res.mag
              ? `alpha: ${res.details.absAlpha||res.details.alpha}° · ${res.magValues.length} lecturas`
              : res.magValues.length > 0
                ? `Recibe alpha pero sin variación — posiblemente sin magnetómetro físico (${res.magValues.length} lecturas, rango 0°)`
                : "No respondió — sin magnetómetro o sin permiso"} />
          {!res.mag && (
            <div style={{ marginTop:12, fontFamily:MONO, fontSize:10, color:C.amber,
                          lineHeight:1.8, background:`rgba(${rgb(C.amber)},0.08)`,
                          borderRadius:8, padding:"10px 12px" }}>
              ⚠ Tu celular no tiene magnetómetro activo.{"\n"}
              La brújula digital no puede funcionar en este dispositivo.{"\n"}
              Podés usar el Nivel (acelerómetro) que {res.accel?"sí funciona":"tampoco detectó datos"}.
            </div>
          )}
          <button style={{ ...S.btn("s"), marginTop:12, fontSize:10 }}
            onClick={()=>{ setState("idle"); setRes(null); }}>
            Probar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Brújula ── auto-start Android ─────────────────────────────────────────────
function ToolBrujula() {
  const col=C.cyan;
  const [hdg,setHdg]=useState(null), [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [method,setMethod]=useState(null); // "abs-sensor"|"abs-event"|"ios"
  const refs=useRef({});

  const cardinal=deg=>{
    const d=((deg%360)+360)%360;
    return ["N","NE","E","SE","S","SO","O","NO"][Math.round(d/45)%8];
  };

  const startListener=()=>{
    let gotData=false;

    // Método 1: AbsoluteOrientationSensor (Generic Sensor API — más preciso)
    if('AbsoluteOrientationSensor' in window){
      try {
        const sensor=new AbsoluteOrientationSensor({frequency:20,referenceFrame:"screen"});
        sensor.addEventListener('reading',()=>{
          const q=sensor.quaternion; // [x,y,z,w]
          // Convertir quaternion a heading (yaw)
          const heading=Math.atan2(2*(q[0]*q[3]+q[1]*q[2]),1-2*(q[2]*q[2]+q[3]*q[3]))*180/Math.PI;
          setHdg(((heading%360)+360)%360);
          gotData=true; setMethod("abs-sensor");
        });
        sensor.addEventListener('error',e2=>console.warn("AbsOriSensor:",e2.error.name));
        sensor.start();
        refs.current.sensor=sensor;
      } catch(_e){ /* fallback */ }
    }

    // Método 2: deviceorientationabsolute (Android Chrome)
    const hAbs=e=>{
      if(gotData&&method==="abs-sensor") return;
      if(e.alpha==null) return;
      gotData=true; setMethod("abs-event");
      setHdg((360-e.alpha+360)%360);
    };

    // Método 3: iOS webkitCompassHeading
    const hRel=e=>{
      if(gotData) return;
      if(e.webkitCompassHeading!=null){
        gotData=true; setMethod("ios");
        setHdg(e.webkitCompassHeading);
      }
    };

    refs.current.hAbs=hAbs; refs.current.hRel=hRel;
    window.addEventListener("deviceorientationabsolute",hAbs,true);
    window.addEventListener("deviceorientation",hRel,true);
    setOn(true); setErr(null);

    setTimeout(()=>setHdg(p=>{
      if(p===null) setErr("Sin datos de magnetómetro. Mové el celular en figura 8 y esperá. Si no funciona, este dispositivo puede no tener magnetómetro activo.");
      return p;
    }),6000);
  };

  const start=async()=>{
    if(typeof DeviceOrientationEvent?.requestPermission==="function"){
      try{ const p=await DeviceOrientationEvent.requestPermission(); if(p!=="granted"){setErr("Permiso denegado");return;} }
      catch(e){ setErr(e.message); return; }
    }
    if('AbsoluteOrientationSensor' in window){
      try{ await Promise.all([navigator.permissions.query({name:"accelerometer"}),
                               navigator.permissions.query({name:"magnetometer"}),
                               navigator.permissions.query({name:"gyroscope"})]); }
      catch(_e){}
    }
    startListener();
  };

  const stop=()=>{
    refs.current.sensor?.stop();
    window.removeEventListener("deviceorientationabsolute",refs.current.hAbs,true);
    window.removeEventListener("deviceorientation",refs.current.hRel,true);
    setOn(false); setHdg(null); setMethod(null);
  };

  useEffect(()=>{
    if(typeof DeviceOrientationEvent?.requestPermission!=="function"){ startListener(); }
    return ()=>{
      refs.current.sensor?.stop();
      window.removeEventListener("deviceorientationabsolute",refs.current.hAbs,true);
      window.removeEventListener("deviceorientation",refs.current.hRel,true);
    };
  },[]);

  const deg=hdg!==null?Math.round(hdg):null;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Brújula Digital</div>
      {method&&<div style={{...S.pill(C.green),textAlign:"center",fontSize:9}}>
        Método: {method==="abs-sensor"?"AbsoluteOrientationSensor (óptimo)":method==="abs-event"?"deviceorientationabsolute":"iOS webkitCompassHeading"}
      </div>}

      {/* Rosa de los vientos */}
      <div style={{...S.disp(col),display:"flex",justifyContent:"center",padding:20}}>
        <div style={{position:"relative",width:180,height:180}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid rgba(${rgb(col)},0.25)`,background:"rgba(0,0,0,0.6)"}}/>
          {[["N",0],["E",90],["S",180],["O",270]].map(([l,a])=>(
            <div key={l} style={{position:"absolute",width:"100%",height:"100%",transform:`rotate(${a}deg)`}}>
              <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",
                fontFamily:MONO,fontSize:l==="N"?14:10,fontWeight:700,
                color:l==="N"?C.red:col,textShadow:l==="N"?`0 0 8px ${C.red}`:`0 0 8px ${col}`}}>{l}</div>
            </div>
          ))}
          <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"center",alignItems:"center",
            transform:`rotate(${deg??0}deg)`,transition:"transform .2s ease-out"}}>
            <div style={{position:"relative",width:4,height:140}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:C.red,borderRadius:"2px 2px 0 0",boxShadow:`0 0 10px ${C.red}`}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:"50%",background:col,borderRadius:"0 0 2px 2px"}}/>
            </div>
          </div>
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
            {deg!==null?cardinal(deg):"--"}
          </div>
          <div style={S.dlbl}>CARDINAL</div>
        </div>
      </div>

      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.7,
        background:"rgba(255,184,48,0.08)",borderRadius:8,padding:"8px 12px"}}>{err}</div>}
      {!on&&typeof DeviceOrientationEvent?.requestPermission==="function"&&(
        <button style={S.btn("p",col)} onClick={start}>Activar brújula</button>
      )}
      {on&&typeof DeviceOrientationEvent?.requestPermission==="function"&&(
        <button style={S.btn("r")} onClick={stop}>Detener</button>
      )}
      <SensorTester onResult={r => {
        if(!r.mag && !err) setErr("Tu celular no tiene magnetómetro — la brújula no puede funcionar en este dispositivo.");
      }}/>
      <div style={S.note}>
        Alejá el celular de metales y electrónica. Calibrá moviéndolo en figura 8.
        La aguja roja → Norte magnético.
      </div>
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
      {/* Capturas en sección fija — no mueve el canvas */}
      {snaps.length>0&&(
        <div style={{...S.res(col),maxHeight:180,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700}}>
              CAPTURAS ({snaps.length})
            </div>
            <button style={{...S.btn("s"),width:"auto",padding:"4px 10px",fontSize:10}}
              onClick={()=>setSnaps([])}>Borrar</button>
          </div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {snaps.map((s,i)=>(
              <div key={i} style={{flex:"0 0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <img src={s.img} alt="snap" style={{width:90,borderRadius:6,
                  border:`1px solid rgba(${rgb(col)},0.4)`,display:"block"}}/>
                <div style={{fontFamily:MONO,fontSize:10,color:col,fontWeight:700,textAlign:"center"}}>
                  {s.freq} Hz
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {s.auto&&<span style={S.pill(C.amber)}>auto</span>}
                  <a href={s.img} download={`osc_${s.ts.replace(/:/g,"-")}.png`}
                    style={{fontFamily:MONO,fontSize:9,color:C.blue}}>⬇</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={S.note}>Resolución ~5 Hz · Auto-snap captura picos · 📸 manual · Capturas en scroll horizontal</div>
    </div>
  );
}



// ── Conectividad — herramientas avanzadas ────────────────────────────────────

// ── Ping + gráfico en tiempo real ────────────────────────────────────────────
function ToolPing() {
  const col = C.cyan;
  const [running,  setRunning]  = useState(false);
  const [pings,    setPings]    = useState([]); // [{ms, ts, lost}]
  const [target,   setTarget]   = useState("https://www.google.com/favicon.ico");
  const [interval, setInterval2]= useState(2);  // segundos
  const [stats,    setStats]    = useState(null);
  const timerRef = useRef(null), cRef = useRef(null);

  const doPing = async (url) => {
    const t0 = performance.now();
    try {
      await fetch(url + "?t=" + Date.now(), { mode:"no-cors", cache:"no-store" });
      const ms = Math.round(performance.now() - t0);
      return { ms, lost: false };
    } catch(_e) {
      return { ms: null, lost: true };
    }
  };

  const start = () => {
    setRunning(true); setPings([]); setStats(null);
    const run = async () => {
      const r = await doPing(target);
      const ts = new Date().toLocaleTimeString();
      setPings(prev => {
        const next = [...prev.slice(-59), { ...r, ts }];
        // Calcular stats
        const valid = next.filter(p => !p.lost).map(p => p.ms);
        const lost  = next.filter(p => p.lost).length;
        if (valid.length > 0) {
          setStats({
            avg:  Math.round(valid.reduce((a,b)=>a+b,0)/valid.length),
            min:  Math.min(...valid),
            max:  Math.max(...valid),
            loss: Math.round(lost/next.length*100),
            last: r.ms,
            lastLost: r.lost,
            count: next.length,
          });
        }
        return next;
      });
    };
    run();
    timerRef.current = setInterval(run, interval * 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    setRunning(false);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Dibujar gráfico
  useEffect(() => {
    const c = cRef.current; if (!c || pings.length < 2) return;
    const ctx = c.getContext("2d"), W = c.width, H = c.height;
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H);
    const valid = pings.filter(p=>!p.lost).map(p=>p.ms);
    if (!valid.length) return;
    const mx = Math.max(...valid, 200);
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    [0.25,0.5,0.75].forEach(f => {
      ctx.beginPath(); ctx.moveTo(0,H*f); ctx.lineTo(W,H*f); ctx.stroke();
    });
    // Labels ms
    ctx.fillStyle = C.dim; ctx.font = "9px monospace";
    ctx.fillText(mx+"ms", 4, 12);
    ctx.fillText("0", 4, H-4);
    // Línea
    const sw = W / Math.max(pings.length-1, 1);
    ctx.beginPath();
    pings.forEach((p,i) => {
      const x = i * sw;
      const y = p.lost ? H : H - (p.ms/mx)*(H-16) - 8;
      const col2 = p.lost ? C.red : p.ms > 300 ? C.amber : p.ms > 100 ? C.cyan : C.green;
      ctx.strokeStyle = col2; ctx.lineWidth = 2;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(x,y);
      // Punto
      ctx.fillStyle = col2;
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x,y);
    });
  }, [pings]);

  const pingCol = stats ? (stats.lastLost ? C.red : stats.last > 300 ? C.amber : stats.last > 100 ? C.cyan : C.green) : col;

  const TARGETS = [
    ["Google",      "https://www.google.com/favicon.ico"],
    ["Cloudflare",  "https://1.1.1.1/favicon.ico"],
    ["Gateway",     "http://192.168.1.1"],
    ["SEM Server",  "https://semtools.vercel.app"],
  ];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Ping — Latencia en tiempo real</div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {TARGETS.map(([label,url]) => (
          <button key={label} style={{
            border: target===url?`2px solid ${col}`:`1px solid ${C.bord}`,
            borderRadius:8, padding:"6px 12px", background: target===url?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)",
            cursor:"pointer", fontFamily:MONO, fontSize:10, color: target===url?col:C.dim,
          }} onClick={()=>setTarget(url)}>{label}</button>
        ))}
      </div>

      <div style={S.row}>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim,alignSelf:"center",whiteSpace:"nowrap"}}>Intervalo:</span>
        {[1,2,5].map(s=>(
          <button key={s} style={{
            border:interval===s?`2px solid ${col}`:`1px solid ${C.bord}`,
            borderRadius:8,padding:"6px 14px",background:interval===s?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)",
            cursor:"pointer",fontFamily:MONO,fontSize:11,color:interval===s?col:C.dim,
          }} onClick={()=>setInterval2(s)}>{s}s</button>
        ))}
      </div>

      {/* Display principal */}
      <div style={{...S.disp(pingCol),display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:MONO,fontSize:52,fontWeight:700,color:pingCol,
            lineHeight:1,textShadow:`0 0 24px ${pingCol}`}}>
            {stats ? (stats.lastLost ? "---" : stats.last) : "---"}
          </div>
          <div style={{fontFamily:MONO,fontSize:12,color:C.dim}}>ms</div>
          <div style={S.dlbl}>{stats?.lastLost ? "⚠ TIMEOUT" : "LATENCIA"}</div>
        </div>
        {stats && (
          <div style={{display:"flex",flexDirection:"column",gap:8,textAlign:"right"}}>
            {[["MÍN", stats.min, C.green],["AVG", stats.avg, col],["MÁX", stats.max, C.red]].map(([l,v,c])=>(
              <div key={l}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{l}</div>
                <div style={{fontFamily:MONO,fontSize:18,fontWeight:700,color:c,textShadow:`0 0 10px ${c}`}}>{v} ms</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loss */}
      {stats && (
        <div style={{display:"flex",gap:8}}>
          <div style={{...S.disp(stats.loss>0?C.red:C.green),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>PACKET LOSS</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,
              color:stats.loss>0?C.red:C.green,textShadow:`0 0 12px ${stats.loss>0?C.red:C.green}`}}>
              {stats.loss}%
            </div>
          </div>
          <div style={{...S.disp(col),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>MUESTRAS</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:col}}>{stats.count}</div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <canvas ref={cRef} width={640} height={120}
        style={{width:"100%",borderRadius:10,border:`1px solid rgba(${rgb(col)},0.25)`,background:"#000"}}/>

      {!running
        ? <button style={S.btn("p",col)} onClick={start}>▶ Iniciar ping continuo</button>
        : <button style={S.btn("r")} onClick={stop}>⏹ Detener</button>
      }
      <div style={S.note}>Mide latencia real hacia el destino. Verde &lt;100ms · Amarillo &lt;300ms · Rojo &gt;300ms o timeout.</div>
    </div>
  );
}

// ── Escáner LAN completo ──────────────────────────────────────────────────────
function ToolLANScanner() {
  const col = C.blue;
  const [scanning,  setScanning]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [devices,   setDevices]   = useState([]);
  const [subnet,    setSubnet]    = useState("192.168.1");
  const [range,     setRange]     = useState([1,30]);
  const stopRef = useRef(false);

  const scan = async () => {
    setScanning(true); setDevices([]); setProgress(0); stopRef.current = false;
    const total = range[1] - range[0] + 1;
    let done = 0;
    const found = [];
    const BATCH = 8; // requests paralelos
    const ips = Array.from({length:total},(_,i)=>range[0]+i);

    for (let i=0; i<ips.length; i+=BATCH) {
      if (stopRef.current) break;
      const batch = ips.slice(i, i+BATCH);
      await Promise.allSettled(batch.map(async n => {
        const ip = `${subnet}.${n}`;
        const t0 = performance.now();
        try {
          const ctrl = new AbortController();
          const to = setTimeout(()=>ctrl.abort(), 1200);
          await fetch(`http://${ip}`, { mode:"no-cors", cache:"no-store", signal:ctrl.signal });
          clearTimeout(to);
          const ms = Math.round(performance.now()-t0);
          found.push({ ip, ms, status:"activo" });
          setDevices([...found].sort((a,b)=>a.ip.localeCompare(b.ip)));
        } catch(e) {
          if (e.name!=="AbortError") {
            // Responde con error de red (CORS) = está ahí pero no HTTP
            found.push({ ip, ms:Math.round(performance.now()-t0), status:"detectado" });
            setDevices([...found].sort((a,b)=>a.ip.localeCompare(b.ip)));
          }
        }
        done++;
        setProgress(Math.round(done/total*100));
      }));
    }
    setScanning(false);
  };

  const guessDevice = (ip) => {
    const last = parseInt(ip.split(".").pop());
    if (last===1||last===254) return { icon:"📡", label:"Router / Gateway" };
    if (last>=100&&last<=120) return { icon:"📺", label:"Posible Smart TV" };
    if (last>=200) return { icon:"🖨", label:"Posible impresora" };
    return { icon:"📱", label:"Dispositivo red" };
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Escáner LAN — Red local</div>

      <div style={S.row}>
        <div style={{flex:2}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>SUBRED</div>
          <input style={{...S.inp,fontSize:12}} value={subnet}
            onChange={e=>setSubnet(e.target.value)} placeholder="192.168.1"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>DESDE</div>
          <input style={{...S.inp,fontSize:12}} type="number" value={range[0]}
            onChange={e=>setRange([+e.target.value,range[1]])}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>HASTA</div>
          <input style={{...S.inp,fontSize:12}} type="number" value={range[1]}
            onChange={e=>setRange([range[0],+e.target.value])}/>
        </div>
      </div>

      {/* Presets rápidos */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["Home /24","192.168.1",1,30],["Rango amplio","192.168.1",1,100],
          ["192.168.0.x","192.168.0",1,30],["10.0.0.x","10.0.0",1,30]].map(([l,s,f,t])=>(
          <button key={l} style={{border:`1px solid ${C.bord}`,borderRadius:8,padding:"5px 10px",
            background:"rgba(255,255,255,0.04)",cursor:"pointer",fontFamily:MONO,fontSize:9,color:C.dim}}
            onClick={()=>{setSubnet(s);setRange([f,t]);}}>
            {l}
          </button>
        ))}
      </div>

      {scanning && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:10,color:C.dim,marginBottom:6}}>
            <span>Escaneando {subnet}.{range[0]}–{range[1]}…</span>
            <span style={{color:col}}>{progress}%</span>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:col,
              boxShadow:`0 0 8px ${col}`,borderRadius:3,transition:"width .2s"}}/>
          </div>
        </div>
      )}

      {devices.length>0 && (
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10}}>
            {devices.length} DISPOSITIVO{devices.length>1?"S":""} ENCONTRADO{devices.length>1?"S":""}
          </div>
          {devices.map((d,i)=>{
            const g=guessDevice(d.ip);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                padding:"10px 0",borderBottom:i<devices.length-1?`1px solid ${C.bord}`:"none"}}>
                <span style={{fontSize:20}}>{g.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:C.text}}>{d.ip}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{g.label}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={S.pill(d.status==="activo"?C.green:C.amber)}>{d.status}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:3}}>{d.ms}ms</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={S.row}>
        {!scanning
          ? <button style={{...S.btn("p",col),flex:1}} onClick={scan}>🔍 Escanear red</button>
          : <button style={{...S.btn("r"),flex:1}} onClick={()=>stopRef.current=true}>⏹ Detener</button>
        }
      </div>
      <div style={S.note}>Detecta dispositivos activos en la red local. Útil para encontrar módulos SEM, routers, Smart TVs y cámaras IP.</div>
    </div>
  );
}

// ── HTTP Tester ───────────────────────────────────────────────────────────────
function ToolHTTPTester() {
  const col = C.violet;
  const [url,     setUrl]     = useState("http://192.168.1.1");
  const [method,  setMethod]  = useState("GET");
  const [body,    setBody]    = useState("");
  const [headers, setHeaders] = useState("Content-Type: application/json");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [history, setHistory] = useState([]);

  const send = async () => {
    setLoading(true); setResult(null);
    const t0 = performance.now();
    try {
      const hdrs = {};
      headers.split("\n").forEach(h => {
        const [k,...v]=h.split(":"); if(k.trim()) hdrs[k.trim()]=v.join(":").trim();
      });
      const opts = { method, headers:hdrs, mode:"cors", cache:"no-store" };
      if(method!=="GET"&&method!=="HEAD"&&body) opts.body=body;
      const r = await fetch(url, opts);
      const ms = Math.round(performance.now()-t0);
      let text="";
      try{ text=await r.text(); }catch(_e){}
      const res = { ok:r.ok, status:r.status, statusText:r.statusText,
                    ms, body:text.slice(0,2000), url };
      setResult(res);
      setHistory(h=>[res,...h.slice(0,9)]);
    } catch(e) {
      const ms=Math.round(performance.now()-t0);
      const res={ ok:false, status:0, statusText:e.message, ms, body:"", url };
      setResult(res);
      setHistory(h=>[res,...h.slice(0,9)]);
    }
    setLoading(false);
  };

  const PRESETS=[
    ["Router",       "GET",  "http://192.168.1.1",""],
    ["SEM módulo",   "GET",  "http://192.168.1.200/status",""],
    ["API local",    "GET",  "http://192.168.1.200/api/read",""],
    ["POST JSON",    "POST", "http://192.168.1.200/api/cmd",'{"cmd":"on"}'],
  ];

  const statusCol = result ? (result.ok?C.green:result.status===0?C.dim:C.amber) : col;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ HTTP Tester — API REST local</div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {PRESETS.map(([l,m,u,b])=>(
          <button key={l} style={{border:`1px solid ${C.bord}`,borderRadius:8,padding:"5px 10px",
            background:"rgba(255,255,255,0.04)",cursor:"pointer",fontFamily:MONO,fontSize:9,color:C.dim}}
            onClick={()=>{setMethod(m);setUrl(u);if(b)setBody(b);}}>
            {l}
          </button>
        ))}
      </div>

      <div style={S.row}>
        <select style={{...S.sel,flex:"0 0 80px"}} value={method} onChange={e=>setMethod(e.target.value)}>
          {["GET","POST","PUT","PATCH","DELETE","HEAD"].map(m=><option key={m}>{m}</option>)}
        </select>
        <input style={{...S.inp,flex:1}} value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://..."/>
      </div>

      <div>
        <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>HEADERS (uno por línea)</div>
        <textarea style={{...S.inp,minHeight:60,resize:"vertical",lineHeight:1.6}}
          value={headers} onChange={e=>setHeaders(e.target.value)}/>
      </div>

      {(method==="POST"||method==="PUT"||method==="PATCH")&&(
        <div>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>BODY</div>
          <textarea style={{...S.inp,minHeight:80,resize:"vertical",lineHeight:1.6,fontFamily:MONO}}
            value={body} onChange={e=>setBody(e.target.value)} placeholder='{"key":"value"}'/>
        </div>
      )}

      <button style={{...S.btn("p",col),opacity:loading?.7:1}} onClick={loading?null:send}>
        {loading?"Enviando…":`${method} → Enviar`}
      </button>

      {result&&(
        <div style={{...S.disp(statusCol),padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={S.pill(statusCol)}>
              {result.status||"ERR"} {result.statusText}
            </div>
            <div style={{fontFamily:MONO,fontSize:11,color:C.dim}}>{result.ms}ms</div>
          </div>
          {result.body&&(
            <pre style={{fontFamily:MONO,fontSize:10,color:C.text,
              whiteSpace:"pre-wrap",wordBreak:"break-all",
              maxHeight:200,overflowY:"auto",margin:0,lineHeight:1.7}}>
              {result.body}
            </pre>
          )}
        </div>
      )}

      {history.length>0&&(
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:8}}>HISTORIAL</div>
          {history.map((h,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",
              borderBottom:i<history.length-1?`1px solid ${C.bord}`:"none",cursor:"pointer"}}
              onClick={()=>setUrl(h.url)}>
              <div style={S.pill(h.ok?C.green:C.red)}>{h.status||"ERR"}</div>
              <div style={{flex:1,fontFamily:MONO,fontSize:10,color:C.dim,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.url}</div>
              <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{h.ms}ms</div>
            </div>
          ))}
        </div>
      )}
      <div style={S.note}>Enviá requests HTTP a routers, módulos IoT, APIs locales y Smart TVs. Útil para probar y desarrollar módulos SEM.</div>
    </div>
  );
}

// ── BLE Scanner ───────────────────────────────────────────────────────────────
function ToolBLEScanner() {
  const col = C.violet;
  const [devices,  setDevices]  = useState([]);
  const [scanning, setScanning] = useState(false);
  const [err,      setErr]      = useState(null);
  const [selected, setSelected] = useState(null);

  const scan = async () => {
    if (!navigator.bluetooth) {
      setErr("Web Bluetooth no disponible. Requiere Chrome con flag #enable-web-bluetooth activado.");
      return;
    }
    setScanning(true); setErr(null);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "battery_service","device_information","generic_access",
          "heart_rate","health_thermometer",
          "00001800-0000-1000-8000-00805f9b34fb",
          "00001801-0000-1000-8000-00805f9b34fb",
        ]
      });
      const info = {
        id:   device.id,
        name: device.name || "Dispositivo sin nombre",
        ts:   new Date().toLocaleTimeString(),
      };
      // Intentar conectar para leer servicios
      try {
        const server   = await device.gatt.connect();
        const services = await server.getPrimaryServices();
        info.services  = services.map(s => s.uuid).slice(0,5);
        info.connected = true;
        setSelected(info);
        await server.disconnect();
      } catch(_e) {
        info.connected = false;
        info.services  = [];
      }
      setDevices(prev => [info, ...prev.filter(d=>d.id!==info.id)]);
    } catch(e) {
      if (e.name !== "NotFoundError") setErr("Error BLE: " + e.message);
    }
    setScanning(false);
  };

  const BLE_SERVICES = {
    "0000180f-0000-1000-8000-00805f9b34fb": "🔋 Batería",
    "0000180a-0000-1000-8000-00805f9b34fb": "ℹ️ Info dispositivo",
    "0000180d-0000-1000-8000-00805f9b34fb": "❤️ Frecuencia cardíaca",
    "00001809-0000-1000-8000-00805f9b34fb": "🌡 Termómetro",
    "00001800-0000-1000-8000-00805f9b34fb": "📡 Generic Access",
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Scanner BLE — Bluetooth Low Energy</div>

      <div style={{...S.disp(col),padding:"12px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8}}>
          Detecta dispositivos BLE cercanos: auriculares, smartwatches, módulos SEM, sensores médicos, ESP32, Arduino BLE.
          Cada escaneo detecta un dispositivo — repetí para agregar más.
        </div>
      </div>

      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6,
        background:`rgba(${rgb(C.amber)},0.08)`,borderRadius:8,padding:"8px 12px"}}>{err}</div>}

      <button style={{...S.btn("p",col),opacity:scanning?.7:1}} onClick={scanning?null:scan}>
        {scanning?"Buscando dispositivo BLE…":"📡 Buscar dispositivo BLE"}
      </button>

      {devices.length>0&&(
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10}}>
            {devices.length} DISPOSITIVO{devices.length>1?"S":""} BLE
          </div>
          {devices.map((d,i)=>(
            <div key={i} style={{padding:"12px 0",
              borderBottom:i<devices.length-1?`1px solid ${C.bord}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:20}}>📡</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:C.text}}>{d.name}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{d.ts}</div>
                </div>
                <div style={S.pill(d.connected?C.green:C.dim)}>
                  {d.connected?"Conectado":"Sin conexión GATT"}
                </div>
              </div>
              {d.services?.length>0&&(
                <div style={{paddingLeft:28}}>
                  {d.services.map((s,j)=>(
                    <div key={j} style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.8}}>
                      {BLE_SERVICES[s]||"• "+s.slice(0,8)+"…"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button style={{...S.btn("s"),marginTop:8,fontSize:10}}
            onClick={()=>setDevices([])}>Borrar lista</button>
        </div>
      )}

      <div style={S.note}>Requiere Chrome. El sistema muestra el selector de dispositivos — elegís el que querés detectar. Ideal para identificar módulos SEM Bluetooth.</div>
    </div>
  );
}

// ── Info pública: IP, ISP, ubicación ─────────────────────────────────────────
function ToolIPInfo() {
  const col = C.green;
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch2 = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://ipapi.co/json/");
      const d = await r.json();
      setInfo(d);
    } catch(e) {
      try {
        const r2 = await fetch("https://api.ipify.org?format=json");
        const d2 = await r2.json();
        setInfo({ ip: d2.ip, org:"No disponible", city:"No disponible", country_name:"No disponible" });
      } catch(_e2) { setInfo({error:"Sin conexión"}); }
    }
    setLoading(false);
  };

  useEffect(() => { fetch2(); }, []);

  const rows = info && !info.error ? [
    ["IP Pública",   info.ip,           C.cyan],
    ["ISP / Org",    info.org,          C.text],
    ["Ciudad",       info.city,         C.text],
    ["País",         info.country_name, C.text],
    ["Región",       info.region,       C.dim],
    ["Timezone",     info.timezone,     C.dim],
    ["ASN",          info.asn,          C.dim],
  ] : [];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ IP Pública e ISP</div>

      {loading&&<div style={{...S.disp(col),textAlign:"center",padding:20}}>
        <div style={{fontFamily:MONO,fontSize:12,color:col}}>Consultando…</div>
      </div>}

      {info?.error&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{info.error}</div>}

      {info&&!info.error&&(
        <>
          <div style={{...S.disp(col),padding:"16px 18px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:col,marginBottom:6,letterSpacing:2}}>IP PÚBLICA</div>
            <div style={{fontFamily:MONO,fontSize:36,fontWeight:700,color:col,
              textShadow:`0 0 20px ${col}`,letterSpacing:1}}>{info.ip}</div>
          </div>
          <div style={S.res(col)}>
            {rows.map(([k,v,c])=>v&&(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                padding:"8px 0",borderBottom:`1px solid ${C.bord}`}}>
                <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{k}</span>
                <span style={{fontFamily:MONO,fontSize:10,color:c||C.text,fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button style={S.btn("s")} onClick={fetch2}>🔄 Actualizar</button>
      <div style={S.note}>Muestra tu IP pública real y el proveedor de internet. Útil para configurar acceso remoto a módulos.</div>
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




// ── Detección de marca del dispositivo ───────────────────────────────────────
function detectBrand() {
  const ua = navigator.userAgent;
  let brand = "Android", ui = "stock"; let hasJackGuess = true;
  if (/iphone|ipad/i.test(ua))                    { brand="Apple";          ui="ios";     hasJackGuess=false; }
  else if (/samsung|SM-[A-Z]/i.test(ua))          { brand="Samsung";        ui="oneui";   }
  else if (/miui|xiaomi|redmi|poco/i.test(ua))    { brand="Xiaomi/Redmi";   ui="miui";    }
  else if (/huawei|emui/i.test(ua))               { brand="Huawei";         ui="emui";    }
  else if (/moto[a-z ]|motorola/i.test(ua))       { brand="Motorola";       ui="stock";   }
  else if (/oneplus/i.test(ua))                   { brand="OnePlus";        ui="oxygen";  }
  else if (/pixel/i.test(ua))                     { brand="Google Pixel";   ui="stock";   hasJackGuess=false; }
  else if (/oppo|realme/i.test(ua))               { brand="OPPO/Realme";    ui="coloros"; }
  const modelMatch = ua.match(/;\s*([^;)]+)\s*Build/) || ua.match(/;\s*([^;)]+)\)/);
  const model   = modelMatch?.[1]?.trim().slice(0,35) || brand;
  const osVer   = ua.match(/Android\s*([\d.]+)/)?.[1] || ua.match(/OS\s*([\d_]+)/)?.[1]?.replace(/_/g,".")||"?";
  const os      = /iphone|ipad/i.test(ua)?"iOS":"Android";
  const TIPS = {
    miui:    ["⚙ Ajustes → Apps → Chrome → Permisos → habilitá todo","⚙ Ajustes → Batería → desactivar ahorro para Chrome","⚙ Bloqueá Chrome en Recientes para que no se cierre"],
    oneui:   ["⚙ Ajustes → Privacidad → Administrador de permisos → revisar Chrome","⚙ Para NFC: Ajustes → Conexiones → NFC → Activar"],
    emui:    ["⚙ Ajustes → Aplicaciones → Chrome → Permisos → habilitá sensores","⚙ Gestión de energía → Sin restricciones para Chrome"],
    ios:     ["⚙ Ajustes → Chrome → Movimiento y orientación → Activar","⚙ iOS requiere permiso explícito para sensores de movimiento"],
    oxygen:  ["⚙ OxygenOS generalmente sin restricciones — revisá permisos en Ajustes si algo falla"],
    coloros: ["⚙ Ajustes → Batería → No optimizar → Chrome"],
    stock:   ["⚙ Ajustes → Aplicaciones → Chrome → Permisos"],
  };
  return { brand, model, os, osVer, ui, hasJackGuess, tips: TIPS[ui]||TIPS.stock };
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

      {/* Tips por marca del sistema */}
      {(() => {
        const b = detectBrand();
        return b.tips?.length > 0 ? (
          <div style={{ ...glass(C.amber,0.06), borderRadius:12, padding:"14px 16px",
                        border:`1px solid rgba(${rgb(C.amber)},0.2)` }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.amber, fontWeight:700,
                          letterSpacing:2, marginBottom:8 }}>
              AJUSTES PARA {b.brand.toUpperCase()} ({b.ui.toUpperCase()})
            </div>
            {b.tips.map((t,i) => (
              <div key={i} style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.9 }}>{t}</div>
            ))}
          </div>
        ) : null;
      })()}
      {/* Diagnóstico de hardware desde Sistema */}
      <div style={{...glass(C.cyan,0.06),borderRadius:12,padding:"14px 16px",
        border:`1px solid rgba(${rgb(C.cyan)},0.2)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.cyan,fontWeight:700,
          letterSpacing:2,marginBottom:10}}>DIAGNÓSTICO DE HARDWARE</div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:10}}>
          Re-ejecuta el test de sensores para actualizar la compatibilidad de herramientas.
        </div>
        <button style={{...S.btn("p",C.cyan)}} onClick={()=>{
          try{localStorage.removeItem("sem_caps");}catch(_e){}
          window.location.reload();
        }}>
          🔬 Re-ejecutar diagnóstico completo
        </button>
      </div>

      <div style={S.note}>
        La limpieza de caché elimina recursos guardados por SEM Tools (service worker). No borra datos del sistema ni de otras apps.
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




// ── Cámara Endoscopio / USB ───────────────────────────────────────────────────
function ToolEndoscopio() {
  const col = C.teal || C.blue;
  const vRef=useRef(), mrRef=useRef(), chunksRef=useRef([]), timerRef=useRef();
  const [devices,   setDevices]  = useState([]);
  const [selDev,    setSelDev]   = useState(null);
  const [on,        setOn]       = useState(false);
  const [recording, setRecording]= useState(false);
  const [recTime,   setRecTime]  = useState(0);
  const [photos,    setPhotos]   = useState([]);
  const [videos,    setVideos]   = useState([]);
  const [err,       setErr]      = useState(null);
  const [torch,     setTorch]    = useState(false);
  const [torchOk,   setTorchOk] = useState(false);
  const [zoom,      setZoom]     = useState(1);
  const [zoomRange, setZoomRange]= useState(null);
  const tkRef=useRef(null);

  // Enumerar cámaras disponibles
  const refreshDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter(d => d.kind === "videoinput");
      setDevices(cams);
      // Auto-seleccionar cámara externa/USB si hay más de 1
      if (!selDev && cams.length > 0) {
        const ext = cams.find(d =>
          d.label && !d.label.toLowerCase().includes("front") &&
          !d.label.toLowerCase().includes("usuario") &&
          !d.label.toLowerCase().includes("facetime")
        );
        setSelDev((ext || cams[0]).deviceId);
      }
    } catch(e) { setErr("Sin permiso de cámara: " + e.message); }
  };

  useEffect(() => { refreshDevices(); }, []);

  const start = async () => {
    try {
      const constraints = selDev
        ? { video: { deviceId: { exact: selDev }, width:{ ideal:1920 }, height:{ ideal:1080 } } }
        : { video: { facingMode:"environment", width:{ ideal:1920 } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      vRef.current.srcObject = stream;
      await vRef.current.play();
      // Torch y zoom
      const track = stream.getVideoTracks()[0];
      tkRef.current = track;
      const caps = track.getCapabilities?.() || {};
      setTorchOk(!!caps.torch);
      if (caps.zoom) setZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
      setOn(true); setErr(null); setRecTime(0);
    } catch(e) { setErr("Error de cámara: " + e.message); }
  };

  const stop = () => {
    if (recording) stopRec();
    vRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (vRef.current) vRef.current.srcObject = null;
    tkRef.current = null;
    setOn(false); setTorch(false); setZoom(1);
  };

  const toggleTorch = async () => {
    if (!tkRef.current) return;
    const n = !torch;
    try { await tkRef.current.applyConstraints({ advanced:[{ torch:n }] }); setTorch(n); }
    catch(_e) {}
  };

  const applyZoom = async (z) => {
    if (!tkRef.current) return;
    setZoom(z);
    try { await tkRef.current.applyConstraints({ advanced:[{ zoom:z }] }); }
    catch(_e) {}
  };

  // Foto
  const takePhoto = () => {
    const v = vRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext("2d").drawImage(v, 0, 0);
    const url = c.toDataURL("image/jpeg", 0.95);
    const ts = new Date().toLocaleTimeString();
    setPhotos(p => [{ url, ts }, ...p.slice(0, 19)]);
    navigator.vibrate?.(50);
  };

  // Grabación
  const startRec = () => {
    const stream = vRef.current?.srcObject;
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const dur = recTime;
      setVideos(v => [{ url, ts: new Date().toLocaleTimeString(), dur }, ...v.slice(0, 9)]);
    };
    mr.start(200);
    mrRef.current = mr;
    setRecording(true); setRecTime(0);
    timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
  };

  const stopRec = () => {
    mrRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    vRef.current?.srcObject?.getTracks().forEach(t => t.stop());
  }, []);

  const fmtTime = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Cámara Endoscopio / USB</div>

      {/* Selector de cámara */}
      <div style={{ ...S.disp(col), padding:"12px 14px" }}>
        <div style={{ fontFamily:MONO, fontSize:9, color:col, fontWeight:700, marginBottom:8, letterSpacing:2 }}>
          SELECCIONAR CÁMARA
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {devices.map((d, i) => {
            const isExt = d.label && !d.label.toLowerCase().includes("front") &&
                          !d.label.toLowerCase().includes("usuario");
            return (
              <button key={d.deviceId} style={{
                border: selDev===d.deviceId ? `2px solid ${col}` : `1px solid ${C.bord}`,
                borderRadius:10, padding:"10px 14px",
                background: selDev===d.deviceId ? `rgba(${rgb(col)},0.12)` : "rgba(255,255,255,0.04)",
                cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left",
                boxShadow: selDev===d.deviceId ? `0 0 12px rgba(${rgb(col)},0.25)` : "none",
              }} onClick={() => { setSelDev(d.deviceId); if (on) { stop(); setTimeout(start, 200); } }}>
                <span style={{ fontSize:20 }}>{isExt ? "🔌" : i===0 ? "📷" : "🤳"}</span>
                <div>
                  <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:C.text }}>
                    {d.label || `Cámara ${i + 1}`}
                  </div>
                  {isExt && <div style={S.pill(col)}>Externa / USB</div>}
                </div>
              </button>
            );
          })}
          <button style={{ ...S.btn("s"), fontSize:10 }} onClick={refreshDevices}>
            🔄 Actualizar lista de cámaras
          </button>
        </div>
      </div>

      {/* Visor de video */}
      <div style={{ position:"relative", borderRadius:12, overflow:"hidden",
                    border:`2px solid ${recording ? C.red : `rgba(${rgb(col)},0.4)`}`,
                    boxShadow: recording ? `0 0 20px ${C.red}66` : "none",
                    transition:"all .3s", background:"#000" }}>
        <video ref={vRef} style={{ width:"100%", display:"block", maxHeight:300,
                                    objectFit:"contain", background:"#000" }}
          playsInline muted/>
        {/* Indicador REC */}
        {recording && (
          <div style={{ position:"absolute", top:10, left:12, display:"flex",
                        alignItems:"center", gap:6,
                        background:"rgba(0,0,0,0.7)", borderRadius:20, padding:"4px 12px" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.red,
                          boxShadow:`0 0 8px ${C.red}`, animation:"pulse 1s infinite" }}/>
            <span style={{ fontFamily:MONO, fontSize:12, color:C.red, fontWeight:700 }}>
              REC {fmtTime(recTime)}
            </span>
          </div>
        )}
        {!on && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                        justifyContent:"center", background:"rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily:MONO, fontSize:11, color:C.dim }}>Cámara apagada</div>
          </div>
        )}
      </div>

      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:10, lineHeight:1.6 }}>{err}</div>}

      {/* Controles principales */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <button style={{ ...S.btn(on?"r":"p", on?C.red:col), gridColumn:"1/-1" }}
          onClick={on ? stop : start}>
          {on ? "⏹ Apagar cámara" : "▶ Encender cámara"}
        </button>
        {on && (
          <>
            <button style={{ ...S.btn("p", C.violet), fontSize:12, padding:"14px 8px" }}
              onClick={takePhoto}>
              📷 Foto
            </button>
            <button style={{
              ...S.btn("p", recording ? C.red : C.orange),
              fontSize:12, padding:"14px 8px"
            }} onClick={recording ? stopRec : startRec}>
              {recording ? `⏹ Parar (${fmtTime(recTime)})` : "⏺ Grabar video"}
            </button>
            {torchOk && (
              <button style={{ ...S.btn("s"), background: torch ? C.amber : "rgba(255,255,255,0.07)",
                               color: torch ? "#000" : C.text, fontSize:11 }}
                onClick={toggleTorch}>
                🔦 {torch ? "Linterna ON" : "Linterna OFF"}
              </button>
            )}
            {zoomRange && (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>
                  ZOOM {zoom.toFixed(1)}×
                </span>
                <input type="range" min={zoomRange.min} max={zoomRange.max} step={0.1}
                  value={zoom} style={{ width:"100%" }}
                  onChange={e => applyZoom(parseFloat(e.target.value))} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Fotos capturadas */}
      {photos.length > 0 && (
        <div style={S.res(C.violet)}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.violet, fontWeight:700, marginBottom:8 }}>
            FOTOS ({photos.length})
          </div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", gap:4 }}>
                <img src={p.url} alt="foto" style={{ width:100, borderRadius:6,
                  border:`1px solid rgba(${rgb(C.violet)},0.4)` }}/>
                <div style={{ fontFamily:MONO, fontSize:8, color:C.dim, textAlign:"center" }}>{p.ts}</div>
                <a href={p.url} download={`endo_${p.ts.replace(/:/g,"-")}.jpg`}
                  style={{ fontFamily:MONO, fontSize:9, color:C.blue, textAlign:"center" }}>⬇ Guardar</a>
              </div>
            ))}
          </div>
          <button style={{ ...S.btn("s"), marginTop:8, fontSize:10 }}
            onClick={() => setPhotos([])}>Borrar fotos</button>
        </div>
      )}

      {/* Videos grabados */}
      {videos.length > 0 && (
        <div style={S.res(C.red)}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.red, fontWeight:700, marginBottom:8 }}>
            VIDEOS ({videos.length})
          </div>
          {videos.map((v, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
                                   alignItems:"center", padding:"8px 0",
                                   borderBottom: i<videos.length-1?`1px solid ${C.bord}`:"none" }}>
              <div>
                <div style={{ fontFamily:MONO, fontSize:11, color:C.text }}>
                  Video {i+1} — {fmtTime(v.dur)}
                </div>
                <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>{v.ts}</div>
              </div>
              <a href={v.url} download={`endo_video_${v.ts.replace(/:/g,"-")}.webm`}
                style={{ ...S.btn("p", C.red), width:"auto", padding:"8px 14px",
                         fontSize:11, textDecoration:"none" }}>
                ⬇ Descargar
              </a>
            </div>
          ))}
        </div>
      )}

      <div style={S.note}>
        Conectá la cámara USB/endoscopio por OTG antes de abrir la app.
        Tocá "Actualizar lista" si no aparece. Las fotos y videos se guardan en el dispositivo.
      </div>
    </div>
  );
}

// ── Lector + Generador de QR ──────────────────────────────────────────────────
function ToolQR() {
  const col = C.green;
  const vRef=useRef(), cRef=useRef(), rafRef=useRef(), stRef=useRef(), detRef=useRef(null);
  const [on,     setOn]     = useState(false);
  const [mode,   setMode]   = useState("read"); // "read" | "gen"
  const [result, setResult] = useState(null);
  const [err,    setErr]    = useState(null);
  const [found,  setFound]  = useState(false);
  const [genTxt, setGenTxt] = useState("");
  const [history,setHistory]= useState([]);
  const [copied, setCopied] = useState(false);

  // ── Iniciar cámara + detector ──────────────────────────────────────────────
  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      stRef.current = s;
      vRef.current.srcObject = s;
      await vRef.current.play();

      // BarcodeDetector nativo (Chrome Android / Chrome desktop)
      if ("BarcodeDetector" in window) {
        try {
          const fmts = await BarcodeDetector.getSupportedFormats();
          detRef.current = new BarcodeDetector({
            formats: fmts.filter(f => ["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","data_matrix","pdf417"].includes(f))
          });
        } catch(_e) {
          detRef.current = new BarcodeDetector({ formats:["qr_code"] });
        }
        setOn(true); setErr(null); setFound(false); setResult(null);
        const scan = async () => {
          if (!vRef.current || !detRef.current) return;
          try {
            const codes = await detRef.current.detect(vRef.current);
            if (codes.length > 0) {
              const c = codes[0];
              setResult(c);
              setFound(true);
              setHistory(h => [{ value:c.rawValue, format:c.format, ts:new Date().toLocaleTimeString() },
                               ...h.filter(x=>x.value!==c.rawValue).slice(0,9)]);
              // Vibrar al detectar
              navigator.vibrate?.(100);
              setTimeout(() => { setFound(false); rafRef.current = requestAnimationFrame(scan); }, 2000);
              return;
            }
          } catch(_e) {}
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } else {
        setOn(true);
        setErr("BarcodeDetector no disponible — actualizá Chrome a la versión más reciente");
      }
    } catch(e) { setErr("Sin cámara: " + e.message); }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t => t.stop());
    if (vRef.current) vRef.current.srcObject = null;
    setOn(false); setFound(false);
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false), 2000); });
  };

  const isURL = (s) => /^https?:\/\//i.test(s);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // URL del QR generado
  const qrUrl = genTxt.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(genTxt.trim())}`
    : null;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ QR / Código de Barras</div>

      {/* Tabs */}
      <div style={S.row}>
        {[["read","📷 Leer"],["gen","⚡ Generar"]].map(([m,l])=>(
          <button key={m} style={{...S.btn(mode===m?"p":"s",col),flex:1,fontSize:12}}
            onClick={()=>{ setMode(m); if(on) stop(); setResult(null); }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── MODO LEER ─────────────────────────────────────────────────────── */}
      {mode==="read" && (
        <>
          {/* Visor de cámara con overlay */}
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden",
                        border:`2px solid ${found ? C.green : `rgba(${rgb(col)},0.3)`}`,
                        transition:"border-color .3s",
                        boxShadow: found ? `0 0 20px ${C.green}88` : "none" }}>
            <video ref={vRef} style={{...S.vid, border:"none", borderRadius:0, maxHeight:260}}
              playsInline muted/>
            {/* Marco de escaneo */}
            {on && !found && (
              <div style={{ position:"absolute", inset:0, display:"flex",
                            justifyContent:"center", alignItems:"center", pointerEvents:"none" }}>
                <div style={{ width:200, height:200, position:"relative" }}>
                  {[["0","0"],["auto","0"],["0","auto"],["auto","auto"]].map(([t,l],i)=>(
                    <div key={i} style={{
                      position:"absolute",
                      top:t, bottom:t==="auto"?"0":undefined,
                      left:l, right:l==="auto"?"0":undefined,
                      width:28, height:28,
                      borderTop: t==="0"?`3px solid ${col}`:undefined,
                      borderBottom: t==="auto"?`3px solid ${col}`:undefined,
                      borderLeft: l==="0"?`3px solid ${col}`:undefined,
                      borderRight: l==="auto"?`3px solid ${col}`:undefined,
                      boxShadow:`0 0 8px ${col}66`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
            {/* Flash de detección */}
            {found && (
              <div style={{ position:"absolute", inset:0,
                            background:`rgba(${rgb(C.green)},0.2)`,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontFamily:MONO, fontSize:32,
                              filter:`drop-shadow(0 0 12px ${C.green})` }}>✓</div>
              </div>
            )}
          </div>
          <canvas ref={cRef} style={{ display:"none" }}/>

          {err && <div style={{ color:C.amber, fontFamily:MONO, fontSize:10, lineHeight:1.7,
                                background:`rgba(${rgb(C.amber)},0.08)`, borderRadius:8, padding:"8px 12px" }}>{err}</div>}

          <div style={S.row}>
            {!on
              ? <button style={{...S.btn("p",col),flex:1}} onClick={start}>Activar escáner</button>
              : <button style={{...S.btn("r"),flex:1}} onClick={stop}>Detener</button>
            }
          </div>

          {/* Resultado */}
          {result && (
            <div style={{...S.disp(C.green), display:"flex", flexDirection:"column", gap:10}}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={S.pill(col)}>{result.format?.replace("_"," ").toUpperCase()}</span>
                <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>{new Date().toLocaleTimeString()}</span>
              </div>
              <div style={{ fontFamily:MONO, fontSize:13, color:C.text, wordBreak:"break-all",
                            lineHeight:1.6 }}>{result.rawValue}</div>
              <div style={S.row}>
                <button style={{...S.btn("p",col),flex:1,fontSize:11}}
                  onClick={()=>copy(result.rawValue)}>
                  {copied?"✓ Copiado":"📋 Copiar"}
                </button>
                {isURL(result.rawValue) && (
                  <a href={result.rawValue} target="_blank" rel="noreferrer"
                    style={{...S.btn("p",C.blue),flex:1,fontSize:11,textDecoration:"none",
                            textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    🌐 Abrir
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Historial */}
          {history.length>0 && (
            <div style={S.res(col)}>
              <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:8}}>
                HISTORIAL ({history.length})
              </div>
              {history.map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"7px 0",borderBottom:i<history.length-1?`1px solid ${C.bord}`:"none"}}>
                  <span style={S.pill(col)}>{h.format?.replace("_"," ")}</span>
                  <div style={{flex:1,fontFamily:MONO,fontSize:10,color:C.text,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.value}</div>
                  <button style={{border:"none",background:"none",color:C.blue,
                    fontFamily:MONO,fontSize:10,cursor:"pointer",flexShrink:0}}
                    onClick={()=>copy(h.value)}>📋</button>
                </div>
              ))}
              <button style={{...S.btn("s"),marginTop:8,fontSize:10}}
                onClick={()=>setHistory([])}>Borrar historial</button>
            </div>
          )}

          <div style={S.note}>
            Detecta QR, EAN-13, Code 128, Code 39, UPC y más. Vibra al detectar.
            Requiere Chrome actualizado.
          </div>
        </>
      )}

      {/* ── MODO GENERAR ──────────────────────────────────────────────────── */}
      {mode==="gen" && (
        <>
          <div style={S.note}>Escribí el texto, URL o dato que querés convertir en QR.</div>
          <textarea
            style={{...S.inp, minHeight:90, resize:"vertical", lineHeight:1.6}}
            placeholder="Texto, URL, número de teléfono, email..."
            value={genTxt}
            onChange={e=>setGenTxt(e.target.value)}
          />
          {qrUrl && (
            <div style={{...S.disp(col), display:"flex", flexDirection:"column",
                         alignItems:"center", gap:12, padding:20}}>
              <img src={qrUrl} alt="QR generado"
                style={{width:220,height:220,borderRadius:8,background:"#fff",padding:8}}/>
              <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",
                wordBreak:"break-all"}}>{genTxt.slice(0,60)}{genTxt.length>60?"…":""}</div>
              <div style={S.row}>
                <button style={{...S.btn("p",col),flex:1,fontSize:11}}
                  onClick={()=>copy(genTxt)}>📋 Copiar texto</button>
                <a href={qrUrl} download="qr-semtools.png" target="_blank" rel="noreferrer"
                  style={{...S.btn("p",C.blue),flex:1,fontSize:11,textDecoration:"none",
                          textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ⬇ Guardar QR
                </a>
              </div>
            </div>
          )}
          {!qrUrl && (
            <div style={{...S.disp(col),display:"flex",alignItems:"center",justifyContent:"center",
              minHeight:120,opacity:.4}}>
              <div style={{fontFamily:MONO,fontSize:12,color:C.dim}}>El QR aparece mientras escribís</div>
            </div>
          )}
          <div style={S.note}>El QR se genera al instante. Podés guardarlo como imagen.</div>
        </>
      )}
    </div>
  );
}

// ── Control Remoto IR — detector por cámara + LAN ─────────────────────────────
function ToolIR() {
  const col = C.violet;
  const vRef=useRef(), cRef=useRef(), rafRef=useRef(), stRef=useRef();
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [pulses,setPulses]=useState(0), [lastPulse,setLastPulse]=useState(null);
  const [scanning,setScanning]=useState(false), [lanDevices,setLanDevices]=useState([]);
  const prevBright=useRef(0);

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:640}}});
      stRef.current=s; vRef.current.srcObject=s; await vRef.current.play();
      setOn(true); setErr(null);
      const c=cRef.current;
      const analyze=()=>{
        if(!vRef.current||!c) return;
        c.width=160; c.height=120; // baja resolución para velocidad
        const ctx=c.getContext("2d");
        ctx.drawImage(vRef.current,0,0,160,120);
        const data=ctx.getImageData(0,0,160,120).data;
        // Buscar pixels muy brillantes (IR LED aparece como blanco/violeta)
        let bright=0;
        for(let i=0;i<data.length;i+=4){
          if(data[i]>220&&data[i+1]>200&&data[i+2]>200) bright++;
        }
        const threshold=30;
        if(bright>threshold&&prevBright.current<=threshold){
          // Flanco ascendente: pulso detectado
          setPulses(p=>p+1);
          setLastPulse(new Date().toLocaleTimeString());
        }
        prevBright.current=bright;
        rafRef.current=requestAnimationFrame(analyze);
      };
      rafRef.current=requestAnimationFrame(analyze);
    } catch(e){ setErr("Sin cámara: "+e.message); }
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    if(vRef.current) vRef.current.srcObject=null;
    setOn(false);
  };

  // Scanner LAN: prueba IPs comunes de smart TVs y dispositivos IR/WiFi
  const scanLAN=async()=>{
    setScanning(true); setLanDevices([]);
    const found=[];
    // Detectar gateway estimado del celular
    const targets=[
      {ip:"192.168.1.1",   name:"Router / Gateway"},
      {ip:"192.168.0.1",   name:"Router / Gateway"},
      {ip:"192.168.1.100", name:"Posible Smart TV"},
      {ip:"192.168.1.101", name:"Posible Smart TV"},
      {ip:"192.168.0.100", name:"Posible Smart TV"},
      {ip:"192.168.1.200", name:"Broadlink RM / IR Bridge"},
    ];
    await Promise.allSettled(targets.map(async t=>{
      try{
        const ctrl=new AbortController();
        const to=setTimeout(()=>ctrl.abort(),1500);
        await fetch(`http://${t.ip}`,{mode:"no-cors",signal:ctrl.signal});
        clearTimeout(to);
        found.push({...t,ok:true});
      } catch(_e){
        // Si aborta por timeout → no responde. Si da error de red → puede estar ahí
        if(_e.name!=="AbortError") found.push({...t,ok:true,note:"posible"});
      }
    }));
    setLanDevices(found);
    setScanning(false);
  };

  useEffect(()=>()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); },[]);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Control Remoto IR</div>

      {/* Detector IR por cámara */}
      <div style={{...S.disp(col),padding:"14px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10,letterSpacing:2}}>
          DETECTOR IR POR CÁMARA
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:12}}>
          Apuntá un control remoto a la cámara trasera y presioná un botón. La cámara detecta el destello del LED infrarrojo (invisible al ojo pero visible al sensor).
        </div>
        <div style={{position:"relative",borderRadius:8,overflow:"hidden",marginBottom:10}}>
          <video ref={vRef} style={{...S.vid,border:"none",borderRadius:0,maxHeight:150}} playsInline muted/>
          {pulses>0&&(
            <div style={{position:"absolute",top:8,right:8,background:`rgba(${rgb(col)},0.9)`,
              borderRadius:20,padding:"4px 12px",fontFamily:MONO,fontSize:12,color:"#fff",fontWeight:700}}>
              ⚡ IR detectado
            </div>
          )}
        </div>
        <canvas ref={cRef} style={{display:"none"}}/>
        <div style={S.row}>
          <div style={{...S.disp(C.red),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>PULSOS</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:C.red,textShadow:`0 0 12px ${C.red}`}}>{pulses}</div>
          </div>
          <div style={{...S.disp(col),flex:2,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>ÚLTIMO PULSO</div>
            <div style={{fontFamily:MONO,fontSize:14,fontWeight:700,color:col}}>{lastPulse||"---"}</div>
          </div>
          <button style={{...S.btn("s"),flex:.5,padding:"8px 4px",fontSize:11}}
            onClick={()=>{setPulses(0);setLastPulse(null);}}>Reset</button>
        </div>
        {!on
          ?<button style={S.btn("p",col)} onClick={start}>Activar detector IR</button>
          :<button style={S.btn("r")} onClick={stop}>Detener</button>
        }
      </div>

      {/* Scanner LAN */}
      <div style={{...S.disp(C.blue),padding:"14px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.blue,fontWeight:700,marginBottom:8,letterSpacing:2}}>
          SCANNER RED LOCAL (LAN)
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:10}}>
          Busca Smart TVs, IR bridges (Broadlink RM) y otros dispositivos controlables por WiFi en tu red.
        </div>
        <button style={{...S.btn("p",C.blue),opacity:scanning?.7:1}} onClick={scanning?null:scanLAN}>
          {scanning?"Escaneando red…":"🔍 Escanear dispositivos en la red"}
        </button>
        {lanDevices.length>0&&(
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
            {lanDevices.map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",
                background:"rgba(77,158,255,0.07)",borderRadius:8,border:`1px solid rgba(${rgb(C.blue)},0.2)`}}>
                <div>
                  <div style={{fontFamily:MONO,fontSize:11,color:C.text,fontWeight:700}}>{d.name}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{d.ip}{d.note?" · "+d.note:""}</div>
                </div>
                <span style={S.pill(d.ok?C.green:C.dim)}>{d.ok?"Encontrado":"?"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Módulo externo para control */}
      <div style={{...glass(C.green,0.06),borderRadius:12,padding:"14px 16px",
        border:`1px solid rgba(${rgb(C.green)},0.2)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.green,fontWeight:700,marginBottom:8,letterSpacing:2}}>
          MÓDULO IR TX — EMISIÓN DE SEÑALES
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8,marginBottom:10}}>
          Para controlar dispositivos (TV, aires, equipos) se necesita un LED IR emisor.
          El módulo SEM IR-TX conecta por USB-C y permite enviar cualquier código IR de las bases de datos de Pronto/LIRC.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {["LED IR 940nm + driver","Base de datos LIRC + Pronto","Control por marca/modelo","Aprendizaje de códigos desconocidos","Interfaz USB-C OTG"].map((f,i)=>(
            <div key={i} style={{fontFamily:MONO,fontSize:10,color:C.dim}}>
              <span style={{color:C.green}}>▸ </span>{f}
            </div>
          ))}
        </div>
        <div style={{...S.pill(C.amber),marginTop:12,textAlign:"center",fontSize:10,padding:"6px 14px"}}>
          En desarrollo · Precio estimado ARS 8.000
        </div>
      </div>

      <div style={S.note}>
        La cámara detecta IR pero no puede decodificar el protocolo completo — para eso se necesita hardware.
        El detector sirve para verificar si un control remoto funciona sin necesitar un TV cerca.
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

// ── Qué sensor necesita cada herramienta ─────────────────────────────────────
const TOOL_NEEDS = {
  decibeles:    { needs:["microphone"],             label:"Decibelímetro"      },
  nivel:        { needs:["accelerometer"],           label:"Nivel"              },
  brujula:      { needs:["magnetometer"],            label:"Brújula"            },
  oscilo:       { needs:["microphone"],              label:"Osciloscopio"       },
  sistema:      { needs:[],                          label:"Sistema"            },
  qr:           { needs:["camera"],                  label:"QR / Código Barras" },
  ir:           { needs:["camera"],                  label:"Control Remoto IR"  },
  endoscopio:   { needs:["camera"],                  label:"Endoscopio / USB"   },
  nfc:          { needs:["nfc"],                     label:"NFC"                },
  resistencias: { needs:["camera","ai"],             label:"Resistencias"       },
  integrados:   { needs:["camera","ai"],             label:"Integrados IC"      },
  distancia:    { needs:["camera"],                  label:"Distancia"          },
  jack_thermo:  { needs:["microphone","jack"],       label:"Temperatura"        },
  jack_thermo2: { needs:["microphone","jack"],       label:"Dual Temp"          },
  jack_air:     { needs:["microphone","jack"],       label:"Flujo Aire"         },
  jack_volt:    { needs:["microphone","jack"],       label:"Voltaje CC"         },
  jack_light:   { needs:["microphone","jack"],       label:"Luminosidad"        },
  jack_raw:     { needs:["microphone","jack"],       label:"Señal Cruda"        },
  red:          { needs:[],                          label:"Red / Internet"     },
  ping:         { needs:[],                          label:"Ping"               },
  lan:          { needs:[],                          label:"Escáner LAN"        },
  http:         { needs:[],                          label:"HTTP Tester"        },
  ble:          { needs:[],                          label:"Scanner BLE"        },
  ipinfo:       { needs:[],                          label:"IP / ISP"           },
  modulos:      { needs:[],                          label:"Módulos"            },
  tacometro:    { needs:[],                          label:"Tacómetro"          },
};

function toolEnabled(toolId, caps) {
  const needs = TOOL_NEEDS[toolId]?.needs || [];
  return needs.every(n => caps[n]);
}

function Home({onSel, caps}) {
  const [sector,setSector]=React.useState(null);

  if(sector){
    const bl=BLOCKS.find(b=>b.id===sector);
    if(!bl) return null;
    return (
      <div style={S.wrap}>
        <button style={{...S.btn("s"),display:"flex",alignItems:"center",gap:8}}
          onClick={()=>setSector(null)}>
          ← {bl.icon} {bl.label}
        </button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {bl.tools.map(tid=>{
            const t=TOOL[tid];
            if(!t) return null;
            const disabled = tid==="tacometro";
            const needs    = (TOOL_NEEDS&&TOOL_NEEDS[tid]?.needs)||[];
            const missing  = (caps&&!disabled) ? needs.filter(n=>!caps[n]) : [];
            const cantRun  = missing.length>0;
            const op       = disabled?0.5:cantRun?0.45:1;
            return (
              <div key={tid}
                style={{...S.card(t.col),opacity:op,flexDirection:"column",
                  alignItems:"flex-start",minHeight:110,
                  cursor:(disabled||cantRun)?"default":"pointer"}}
                onClick={()=>{ if(!disabled&&!cantRun) onSel(tid); }}>
                <div style={{marginBottom:8,
                  filter:cantRun?"none":`drop-shadow(0 0 8px ${t.col}88)`}}>
                  {cantRun
                    ? <ToolIcon id="sistema" size={28} color={C.dim} strokeWidth={1.4}/>
                    : <ToolIcon id={tid} size={28} color={t.col} strokeWidth={1.4}/>
                  }
                </div>
                <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,
                  color:cantRun?C.dim:C.text,marginBottom:3}}>{t.label}</div>
                <div style={{fontSize:11,color:C.dim,lineHeight:1.5}}>{t.sub}</div>
                {disabled&&<div style={{marginTop:6}}><span style={S.pill(C.green)}>módulo</span></div>}
                {cantRun&&<div style={{marginTop:6}}>
                  <span style={S.pill(C.red)}>sin {missing.join(" + ")}</span>
                </div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:8}}>
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:2,
        textAlign:"center",paddingBottom:4}}>SELECCIONÁ UN BLOQUE</div>
      {BLOCKS.map(bl=>(
        <button key={bl.id} style={{
          border:`1px solid rgba(${rgb(bl.col)},0.3)`,
          borderLeft:`4px solid ${bl.col}`,
          borderRadius:14,padding:"18px 20px",
          background:`rgba(${rgb(bl.col)},0.07)`,
          cursor:"pointer",display:"flex",alignItems:"center",gap:16,
          boxShadow:`0 2px 20px rgba(0,0,0,0.3)`,
          backdropFilter:"blur(10px)",textAlign:"left",width:"100%",
        }} onClick={()=>setSector(bl.id)}>
          <div style={{filter:`drop-shadow(0 0 12px ${bl.col}99)`}}>
            <ToolIcon id={bl.id==="camara"?"camara":bl.id==="celularplus"?"celularplus":bl.id==="modulos"?"modulos_bl":bl.id} size={36} color={bl.col} strokeWidth={1.4}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:MONO,fontSize:15,fontWeight:700,color:bl.col,
              textShadow:`0 0 14px ${bl.col}88`,letterSpacing:1,marginBottom:4}}>{bl.label}</div>
            <div style={{fontFamily:MONO,fontSize:11,color:C.dim,lineHeight:1.6}}>
              <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                {bl.tools.slice(0,6).map(tid=>
                  SVG_PATHS[tid]
                    ? <ToolIcon key={tid} id={tid} size={13} color={`rgba(${rgb(bl.col)},0.6)`} strokeWidth={1.9}/>
                    : null
                )}
                {bl.tools.length>6&&<span style={{fontSize:9,color:C.dim}}>+{bl.tools.length-6}</span>}
                <span style={{fontSize:9,color:`rgba(${rgb(bl.col)},0.5)`,marginLeft:2}}>
                  · {bl.tools.length} herramienta{bl.tools.length>1?"s":""}
                </span>
              </div>
            </div>
          </div>
          <div style={{fontFamily:MONO,fontSize:22,color:`rgba(${rgb(bl.col)},0.5)`}}>›</div>
        </button>
      ))}
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",
        letterSpacing:1,paddingTop:8}}>SEM TOOLS · <span style={{color:C.amber}}>v{VERSION}</span></div>
    </div>
  );
}




// ── NFC — Lector y escritor de tags ──────────────────────────────────────────
function ToolNFC() {
  const col = C.green;
  const [mode,    setMode]    = useState("read");
  const [reading, setReading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [records, setRecords] = useState([]);
  const [writeText, setWriteText] = useState("");
  const [err,     setErr]     = useState(null);
  const [history, setHistory] = useState([]);
  const readerRef = useRef(null);

  const hasNFC = "NDEFReader" in window;

  const startRead = async () => {
    if (!hasNFC) { setErr("NFC no disponible en este dispositivo o navegador"); return; }
    setReading(true); setErr(null); setRecords([]);
    try {
      const reader = new NDEFReader();
      readerRef.current = reader;
      await reader.scan();
      reader.addEventListener("reading", ({ message, serialNumber }) => {
        const recs = message.records.map(r => {
          let value = "";
          try {
            if (r.recordType === "text") {
              const dec = new TextDecoder(r.encoding || "utf-8");
              value = dec.decode(r.data);
            } else if (r.recordType === "url") {
              const dec = new TextDecoder();
              value = dec.decode(r.data);
            } else {
              value = `[${r.recordType}] ${r.data?.byteLength || 0} bytes`;
            }
          } catch(_e) { value = "No legible"; }
          return { type: r.recordType, value, mediaType: r.mediaType };
        });
        const entry = { serialNumber, records: recs, ts: new Date().toLocaleTimeString() };
        setRecords(recs);
        setHistory(h => [entry, ...h.slice(0, 9)]);
        navigator.vibrate?.(150);
      });
      reader.addEventListener("readingerror", () => setErr("Tag NFC no legible"));
    } catch(e) {
      setErr("Error NFC: " + e.message);
      setReading(false);
    }
  };

  const stopRead = () => {
    readerRef.current = null;
    setReading(false); setRecords([]);
  };

  const writeTag = async () => {
    if (!hasNFC || !writeText.trim()) return;
    setWriting(true); setErr(null);
    try {
      const writer = new NDEFReader();
      await writer.write({
        records: [
          writeText.startsWith("http")
            ? { recordType: "url", data: writeText.trim() }
            : { recordType: "text", data: writeText.trim(), lang: "es" }
        ]
      });
      setErr(null);
      setWriteText("");
      navigator.vibrate?.([100, 50, 100]);
      alert("✓ Tag NFC escrito correctamente");
    } catch(e) {
      setErr("Error al escribir: " + e.message);
    }
    setWriting(false);
  };

  const isURL = s => /^https?:\/\//i.test(s);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ NFC — Near Field Communication</div>

      {!hasNFC && (
        <div style={{ ...glass(C.amber, 0.08), borderRadius:12, padding:16,
                      border:`1px solid rgba(${rgb(C.amber)},0.3)` }}>
          <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:C.amber, marginBottom:8 }}>
            NFC no disponible en este dispositivo
          </div>
          <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
            Tu celular puede no tener hardware NFC, o el navegador no soporta Web NFC API.
            Web NFC requiere Chrome para Android 89+ con NFC habilitado.
          </div>
          <div style={{ marginTop:12, fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
            <div style={{ color:C.green, fontWeight:700, marginBottom:4 }}>Con NFC podés:</div>
            • Leer tags NFC de productos, tarjetas, equipos médicos{"\n"}
            • Escribir tags para vincular módulos SEM automáticamente{"\n"}
            • Identificar tarjetas de control de acceso{"\n"}
            • Escanear etiquetas de activos del taller
          </div>
        </div>
      )}

      {hasNFC && (
        <>
          <div style={S.row}>
            {[["read","📖 Leer tag"],["write","✍️ Escribir tag"]].map(([m,l])=>(
              <button key={m} style={{...S.btn(mode===m?"p":"s",col),flex:1,fontSize:11}}
                onClick={()=>{ setMode(m); stopRead(); setErr(null); }}>
                {l}
              </button>
            ))}
          </div>

          {mode==="read" && (
            <>
              <div style={{ ...S.disp(reading?col:C.dim), textAlign:"center", padding:"24px 16px",
                            transition:"all .3s" }}>
                <ToolIcon id="nfc" size={48} color={reading?col:C.dim} strokeWidth={1.2}
                  style={{margin:"0 auto 12px",display:"block",
                    filter:reading?`drop-shadow(0 0 12px ${col})`:"none"}}/>
                <div style={{ fontFamily:MONO, fontSize:12, color:reading?col:C.dim, fontWeight:700 }}>
                  {reading?"Acercá el tag NFC al celular…":"NFC listo para leer"}
                </div>
                {reading && (
                  <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, marginTop:8 }}>
                    Mantené el celular quieto sobre el tag
                  </div>
                )}
              </div>

              {!reading
                ? <button style={S.btn("p",col)} onClick={startRead}>Activar lector NFC</button>
                : <button style={S.btn("r")} onClick={stopRead}>Detener</button>
              }

              {records.length>0 && (
                <div style={S.res(col)}>
                  <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10}}>
                    DATOS LEÍDOS
                  </div>
                  {records.map((r,i)=>(
                    <div key={i} style={{padding:"10px 0",
                      borderBottom:i<records.length-1?`1px solid ${C.bord}`:"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={S.pill(col)}>{r.type}</span>
                        {r.mediaType&&<span style={S.pill(C.dim)}>{r.mediaType}</span>}
                      </div>
                      <div style={{fontFamily:MONO,fontSize:12,color:C.text,wordBreak:"break-all",
                        lineHeight:1.6}}>{r.value}</div>
                      {isURL(r.value)&&(
                        <a href={r.value} target="_blank" rel="noreferrer"
                          style={{fontFamily:MONO,fontSize:10,color:C.blue}}>🌐 Abrir URL</a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {history.length>0&&(
                <div style={S.res(C.dim)}>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,fontWeight:700,marginBottom:8}}>
                    HISTORIAL ({history.length} tags)
                  </div>
                  {history.map((h,i)=>(
                    <div key={i} style={{padding:"7px 0",
                      borderBottom:i<history.length-1?`1px solid ${C.bord}`:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontFamily:MONO,fontSize:10,color:C.text,fontWeight:700}}>
                          UID: {h.serialNumber||"desconocido"}
                        </span>
                        <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{h.ts}</span>
                      </div>
                      <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>
                        {h.records.map(r=>r.value).join(" · ").slice(0,60)}
                      </div>
                    </div>
                  ))}
                  <button style={{...S.btn("s"),marginTop:8,fontSize:10}}
                    onClick={()=>setHistory([])}>Borrar historial</button>
                </div>
              )}
            </>
          )}

          {mode==="write" && (
            <>
              <div style={S.note}>
                Escribí texto o URL. Si empieza con "http" se guarda como URL (link directo al abrir el tag).
                Ideal para vincular un tag NFC a la ficha del módulo SEM.
              </div>
              <textarea style={{...S.inp,minHeight:80,resize:"vertical",lineHeight:1.6}}
                placeholder='Texto libre, URL (https://...), número de serie, etc.'
                value={writeText} onChange={e=>setWriteText(e.target.value)}/>
              <button style={{...S.btn("p",col),opacity:writing||!writeText.trim()?.7:1}}
                onClick={writing||!writeText.trim()?null:writeTag}>
                {writing?"Acercá el tag NFC…":"✍️ Escribir en tag NFC"}
              </button>
              <div style={{ fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,
                            background:`rgba(${rgb(C.amber)},0.06)`,borderRadius:8,padding:"8px 12px",
                            border:`1px solid rgba(${rgb(C.amber)},0.2)` }}>
                ⚠ Solo tags NFC NDEF regrabables (NTAG213, NTAG215, NTAG216).
                Tags de tarjetas de crédito/débito NO son regrabables.
              </div>
            </>
          )}
        </>
      )}

      {err && <div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6,
                background:`rgba(${rgb(C.amber)},0.08)`,borderRadius:8,padding:"8px 12px"}}>{err}</div>}

      <div style={S.note}>
        NFC funciona en Chrome Android 89+. Para escribir: tags NTAG213 (~$0.50 c/u).
        Perfectos para etiquetar cada módulo SEM y vincularlos automáticamente a la app.
      </div>
    </div>
  );
}

// ── Router de herramientas ────────────────────────────────────────────────────
function getView(tool) {
  switch(tool) {
    case "resistencias":  return <ToolResistencias key={tool}/>;
    case "integrados":    return <ToolIntegrado key={tool}/>;
    case "distancia":     return <ToolDistancia key={tool}/>;
    case "decibeles":     return <ToolDecibeles key={tool}/>;
    case "nivel":         return <ToolNivel key={tool}/>;
    case "brujula":       return <ToolBrujula key={tool}/>;
    case "oscilo":        return <ToolOscilo key={tool}/>;
    case "red":      return <ToolRed key={tool}/>;
    case "ping":     return <ToolPing key={tool}/>;
    case "lan":      return <ToolLANScanner key={tool}/>;
    case "http":     return <ToolHTTPTester key={tool}/>;
    case "ble":      return <ToolBLEScanner key={tool}/>;
    case "ipinfo":   return <ToolIPInfo key={tool}/>;
    case "sistema":       return <ToolSistema key={tool}/>;
    case "qr":            return <ToolQR key={tool}/>;
    case "ir":            return <ToolIR key={tool}/>;
    case "endoscopio":    return <ToolEndoscopio key={tool}/>;
    case "modulos":       return <ToolModulos key={tool}/>;
    case "jack_thermo":   return <ToolJackSensor key={tool} modId="jack_thermo"/>;
    case "jack_thermo2":  return <ToolJackSensor key={tool} modId="jack_thermo2"/>;
    case "jack_air":      return <ToolJackSensor key={tool} modId="jack_air"/>;
    case "jack_volt":     return <ToolJackSensor key={tool} modId="jack_volt"/>;
    case "jack_light":    return <ToolJackSensor key={tool} modId="jack_light"/>;
    case "jack_raw":      return <ToolJackSensor key={tool} modId="jack_raw"/>;
    case "tacometro":
      return <ModulePlaceholder key={tool} icon="⚙️" title="Tacómetro Estroboscópico"
        why={"El efecto estroboscópico puede desencadenar convulsiones.\nRequiere módulo externo con LED controlado."}
        when="LED IR + fotodetector vía USB-C · En desarrollo"/>;
    default: return <div style={{padding:20,fontFamily:"monospace",color:"#E2E8FF"}}>
      Herramienta "{tool}" no encontrada
    </div>;
  }
}


// ── Batería en tiempo real (sin DevicePanel) ──────────────────────────────────
function BatteryDisplay() {
  const [pct, setPct] = useState(null);
  const [chg, setChg] = useState(false);
  useEffect(() => {
    navigator.getBattery?.().then(b => {
      const update = () => { setPct(Math.round(b.level*100)); setChg(b.charging); };
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
      return () => { b.removeEventListener("levelchange", update); b.removeEventListener("chargingchange", update); };
    });
  }, []);
  if (pct === null) return null;
  const col = chg ? C.green : pct > 40 ? C.dim : pct > 20 ? C.amber : C.red;
  return <span style={{fontFamily:MONO,fontSize:8,color:col,fontWeight:700}}>{chg?"⚡":""}{pct}%</span>;
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={err:null}; }
  static getDerivedStateFromError(e){ return {err:e}; }
  render(){
    if(this.state.err) return (
      <div style={{padding:20,background:"#0D1829",minHeight:"100vh",color:"#E2E8FF",fontFamily:"monospace"}}>
        <div style={{color:"#FF3355",fontWeight:700,fontSize:14,marginBottom:12}}>
          ⚠ Error v{VERSION} — mandá esta info:
        </div>
        <div style={{background:"rgba(255,51,85,0.1)",borderRadius:8,padding:12,
          fontSize:11,lineHeight:1.8,wordBreak:"break-all",whiteSpace:"pre-wrap",
          border:"1px solid rgba(255,51,85,0.3)"}}>
          {String(this.state.err)}{"\n\n"}{this.state.err?.stack?.slice(0,500)}
        </div>
        <button style={{marginTop:16,padding:"10px 20px",background:"#FF8C42",
          border:"none",borderRadius:8,color:"#000",fontFamily:"monospace",
          fontWeight:700,cursor:"pointer",fontSize:12}}
          onClick={()=>this.setState({err:null})}>
          ↺ Volver
        </button>
      </div>
    );
    return this.props.children;
  }
}

function App() {
  const [tool,setTool]=useState(null);
  const [showOnboard,setShowOnboard]=useState(()=>{
    try{ const k=localStorage.getItem("sem_gemini_key"); return !k; }
    catch(_e){ return false; }
  });
  const [hiContrast,setHiContrast]=useState(false);
  const [caps,setCaps]=useState(()=>{
    try{ const c=localStorage.getItem("sem_caps"); return c?JSON.parse(c):null; }
    catch(_e){ return null; }
  });
  const t=tool?TOOL[tool]:null;
  const col=t?.col||C.amber;

  // Modo solar: inyectar estilos globales
  useEffect(()=>{
    let style = document.getElementById("solar-style");
    if(!style){ style=document.createElement("style"); style.id="solar-style"; document.head.appendChild(style); }
    if(hiContrast){
      style.textContent = `
        * { color: #0A1020 !important; border-color: rgba(10,16,32,0.25) !important; }
        [style*="background: rgb(7, 9, 15)"], [style*="background: linear-gradient"] { background: #F0F4FF !important; }
        [style*="rgba(0,0,0"] { background: #E8EDF8 !important; }
        [style*="#07090F"], [style*="#0D1829"], [style*="#080B14"], [style*="rgba(0, 0, 0"] { background: #E8EDF8 !important; }
        canvas { filter: invert(1) hue-rotate(180deg); }
      `;
    } else {
      style.textContent = "";
    }
  },[hiContrast]);

  useEffect(()=>{
    const l=document.createElement("link"); l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap";
    document.head.appendChild(l);
  },[]);

  return (
    <div style={S.app}>
      {showOnboard && <Onboarding onDone={c=>{setCaps(c);setShowOnboard(false);}}/>}
      <div style={S.hdr}>
        {tool&&<button style={{border:"none",background:"none",color:col,fontFamily:MONO,fontSize:22,cursor:"pointer",padding:"0 8px 0 0",textShadow:`0 0 12px ${col}66`}} onClick={()=>setTool(null)}>←</button>}
        <div>
          <div style={{...S.logo,color:col,display:"flex",alignItems:"center",gap:8}}>
            {t&&<ToolIcon id={tool} size={18} color={col} strokeWidth={2}/>}
            {t?t.label:"SEM Tools"}
          </div>
          <div style={S.sub}>HERRAMIENTAS DE TALLER · v{VERSION}</div>
        </div>
        <div style={{flex:1}}/>
        
        {!showOnboard&&(
          <button style={{border:"none",background:"rgba(255,255,255,0.06)",borderRadius:8,
            padding:"6px 8px",cursor:"pointer",fontFamily:MONO,fontSize:9,color:C.dim}}
            onClick={()=>setShowOnboard(true)}>
            🔑
          </button>
        )}
        <button style={{border:hiContrast?`2px solid ${C.amber}`:"1px solid rgba(255,255,255,0.15)",
          borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:14,
          background:hiContrast?C.amber:"rgba(255,255,255,0.06)",
          boxShadow:hiContrast?`0 0 14px ${C.amber}`:"none",
          transition:"all .2s"}}
          onClick={()=>setHiContrast(h=>!h)} title={hiContrast?"Modo nocturno":"Modo solar"}>
          {hiContrast?"🌙":"☀️"}
        </button>
      </div>
      <div style={S.body}>
        {tool===null?<ErrorBoundary key="home"><Home onSel={setTool} caps={caps}/></ErrorBoundary>:<ErrorBoundary key={tool}>{getView(tool)}</ErrorBoundary>}
      </div>
      <div style={S.nav}>
        <button style={S.nb(tool===null,C.amber)} onClick={()=>setTool(null)}>
          <span style={{fontSize:18}}>⊞</span>
          <span style={S.nl}>INICIO</span>
        </button>
        {tool&&<button style={{...S.nb(true,col),flex:3,alignItems:"flex-start",paddingLeft:16,pointerEvents:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <ToolIcon id={tool} size={14} color={col} strokeWidth={2}/>
            <span style={{fontFamily:MONO,fontSize:11,color:col,textShadow:`0 0 8px ${col}`}}>{t?.label}</span>
          </div>
          <span style={{...S.nl,color:C.dim}}>ACTIVO</span>
        </button>}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
