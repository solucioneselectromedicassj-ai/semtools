import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ── Service Worker ──────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

const VERSION = "2.9";

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
  lan:          ["M9 3H5a2 2 0 0 0-2 2v4","M9 3h6","M15 3h4a2 2 0 0 1 2 2v4","M9 21H5a2 2 0 0 1-2-2v-4","M9 21h6","M15 21h4a2 2 0 0 0 2-2v-4","M3 9h18","M3 15h18"],
  nfc:          ["M3 7V5a2 2 0 0 1 2-2h2","M17 3h2a2 2 0 0 1 2 2v2","M21 17v2a2 2 0 0 1-2 2h-2","M7 21H5a2 2 0 0 1-2-2v-2","M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0","M8 8a6 6 0 0 0 0 8","M16 8a6 6 0 0 1 0 8"],
  celular:      ["M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z","M12 18h.01"],
  camara:       ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  jack:         ["M12 2v8","M8 6H4","M20 6h-4","M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z","M12 18v4"],
  celularplus:  ["M1 6l4.5 4.5","M22.5 6l-4.5 4.5","M5.5 10.5l3 3","M19.5 10.5l-3 3","M8.5 13.5l3 3","M15.5 13.5l-3 3","M12 17h.01"],
  modulos_bl:   ["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8","M12 22V12","M3 8l9 5 9-5","M7 21h10a2 2 0 0 0 2-2v-6"],
  dispositivo:  ["M4 4h16v16H4z","M9 9h6v6H9z","M9 1v3","M15 1v3","M9 20v3","M15 20v3","M1 9h3","M1 15h3","M20 9h3","M20 15h3"],
  lan:          ["M9 3H5a2 2 0 0 0-2 2v4","M9 3h6","M15 3h4a2 2 0 0 1 2 2v4","M9 21H5a2 2 0 0 1-2-2v-4","M9 21h6","M15 21h4a2 2 0 0 0 2-2v-4","M3 9h18","M3 15h18"],
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
  dispositivo:  { icon:"📟", label:"Dispositivo & Sensores", sub:"Info del equipo · sensores en vivo · compatibilidad", col:C.blue },
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
  nfc:          { icon:"nfc", label:"NFC",              sub:"Leer · escribir tags · vincular módulos", col:C.green  },
  usbprobe:     { icon:"lan",  label:"USB-C Probe",    sub:"WebUSB · analiza cualquier sensor USB",    col:C.cyan   },
};

const BLOCKS = [
  { id:"celular",  icon:"📱", label:"CELULAR",     col:C.cyan,   tools:["decibeles","nivel","brujula","oscilo","vibro","espectro","generador","ecggen","sistema","dispositivo","qr","ir","nfc"] },
  { id:"camara",   icon:"📷", label:"CÁMARA + IA", col:C.violet, tools:["resistencias","integrados","distancia","endoscopio","ppg","cloro"] },
  { id:"jack",     icon:"🔌", label:"JACK 3.5mm",  col:C.orange, tools:["jack_thermo","jack_thermo2","jack_air","jack_volt","jack_light","jack_raw","spo2","ecg","conductimetro","orp","phjack"] },
  { id:"celularplus", icon:"📶", label:"CONECTIVIDAD", col:C.blue, tools:["red","ping","lan","http","ble","ipinfo","usbprobe"] },
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
  let r, d;
  try {
    r = await fetch("/api/claude", {
      method:"POST",
      headers:{"Content-Type":"application/json", "x-user-key": key},
      body:JSON.stringify({ model:"gemini-2.0-flash", max_tokens:1000,
        messages:[{ role:"user", content:[
          { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 } },
          { type:"text", text:prompt }
        ]}]
      })
    });
  } catch(_e) { throw new Error("Sin conexión con el servidor de IA"); }
  try { d = await r.json(); }
  catch(_e) { throw new Error("Error del servidor — intentá de nuevo"); }
  if (d.error) {
    if (d.error.message==="NO_KEY") throw new Error("NO_KEY");
    if (d.error.message==="INVALID_KEY") throw new Error("INVALID_KEY");
    throw new Error(d.error.message);
  }
  return d.content?.[0]?.text || "Sin respuesta";
}

// ── CameraView ────────────────────────────────────────────────────────────────
function CameraView({ captureLabel="📷 Capturar", onCapture }) {
  const vRef=useRef(), cRef=useRef(), tkRef=useRef(null);
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [torch,setTorch]=useState(false), [torchOk,setTorchOk]=useState(false);

  const stop=useCallback(async()=>{
    if(tkRef.current){
      try{ await tkRef.current.applyConstraints({advanced:[{torch:false}]}); }catch(_e){}
    }
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

// ── Test de hardware — con timeouts para no bloquear ─────────────────────────
async function runSensorDetection() {
  const brandInfo = detectBrand();
  const caps = {
    camera: false, microphone: false,
    accelerometer: false, gyroscope: false, magnetometer: false,
    ai: false, nfc: "NDEFReader" in window,
    jack: brandInfo.hasJackGuess, brand: brandInfo,
  };

  // getUserMedia con timeout de 3s — no bloquea si hay diálogo pendiente
  const tryMedia = (c) => Promise.race([
    navigator.mediaDevices.getUserMedia(c),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),3000))
  ]);

  try { const s=await tryMedia({video:true});  caps.camera=true;     s.getTracks().forEach(t=>t.stop()); } catch(_e){}
  try { const s=await tryMedia({audio:true});  caps.microphone=true; s.getTracks().forEach(t=>t.stop()); } catch(_e){}

  // Sensores de movimiento — escuchar 3s
  await new Promise(resolve=>{
    const alphas=[];
    const mH=e=>{
      const ag=e.accelerationIncludingGravity;
      if(ag&&ag.x!==null) caps.accelerometer=true;
      if(e.rotationRate?.alpha!==null) caps.gyroscope=true;
    };
    const oH=e=>{ if(e.alpha!=null) alphas.push(e.alpha); };
    const aH=e=>{ if(e.alpha!=null&&e.absolute) alphas.push(e.alpha+1000); };
    window.addEventListener("devicemotion",mH,true);
    window.addEventListener("deviceorientation",oH,true);
    window.addEventListener("deviceorientationabsolute",aH,true);
    setTimeout(()=>{
      window.removeEventListener("devicemotion",mH,true);
      window.removeEventListener("deviceorientation",oH,true);
      window.removeEventListener("deviceorientationabsolute",aH,true);
      const hasAbs=alphas.some(a=>a>999);
      const vals=alphas.map(a=>a>999?a-1000:a);
      const range=vals.length>1?Math.max(...vals)-Math.min(...vals):0;
      caps.magnetometer=vals.length>0&&(hasAbs||range>0.5);
      resolve();
    },3000);
  });

  try{ const k=localStorage.getItem("sem_gemini_key"); caps.ai=!!k&&k!=="SKIP"; }catch(_e){}
  return caps;
}

function Onboarding({ onDone, startStep=null }) {
  // Detectar proveedor actual para pre-seleccionar tab
  const currentKey = (() => { try{ return localStorage.getItem("sem_gemini_key")||""; }catch(_e){ return ""; } })();
  const [step,    setStep]    = useState(()=>{
    if(startStep) return startStep;
    try{ return localStorage.getItem("sem_gemini_key") ? 2 : 1; }
    catch(_e){ return 1; }
  });
  const [key,     setKey]     = useState(currentKey==="SKIP"?"":currentKey);
  const [testing, setTesting] = useState(false);
  const [err,     setErr]     = useState(null);
  const [caps,    setCaps]    = useState(null);
  const [scanning,setScanning]= useState(false);

  // ── PASO 1: API Key ────────────────────────────────────────────────────────
  const testAndSave = async () => {
    const k = key.trim();
    if (k.length < 15) { setErr("Key muy corta — copiá todo el texto"); return; }
    // Claude key: sk-ant-... → validar directamente contra Anthropic
    if (k.startsWith("sk-ant-") || k.startsWith("sk-")) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/models", {
          headers:{ "x-api-key":k, "anthropic-version":"2023-06-01" }
        });
        if (r.status === 401) throw new Error("Key de Claude inválida");
        localStorage.setItem("sem_gemini_key", k);
        setStep(2); setTesting(false); return;
      } catch(e2) { setErr(e2.message); setTesting(false); return; }
    }
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
    nfc:          { label:"NFC (verificar en herramienta)" },
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
            <div style={{...glass(C.violet,0.08),borderRadius:14,padding:16,
              border:`1px solid rgba(${rgb(C.violet)},0.25)`}}>
              <div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.violet,marginBottom:8}}>
                🤖 Herramientas con Inteligencia Artificial
              </div>
              <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8}}>
                SEM Tools puede analizar fotos para identificar resistencias, integrados IC y medir distancias.
                Para esto necesita conectarse a una IA — es como darle acceso a un asistente inteligente.{"\n\n"}
                Necesitás una "API key" — es gratis y lleva menos de 2 minutos obtenerla.
              </div>
            </div>

            {/* Tabs Gemini / Claude */}
            <div style={{display:"flex",gap:6}}>
              {[
                {id:"gemini",label:"Google Gemini",badge:"GRATIS",col:C.blue},
                {id:"claude",label:"Claude (Anthropic)",badge:"DE PAGO",col:C.violet},
              ].map(op=>(
                <button key={op.id} style={{
                  flex:1,border:`2px solid ${key.startsWith("sk-")?op.id==="claude"?op.col:"rgba(255,255,255,0.1)":op.id==="gemini"?op.col:"rgba(255,255,255,0.1)"}`,
                  borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",
                  background:((key.startsWith("sk-")&&op.id==="claude")||(!key.startsWith("sk-")&&op.id==="gemini"))
                    ?`rgba(${rgb(op.col)},0.12)`:"rgba(255,255,255,0.03)",
                }} onClick={()=>setKey(op.id==="gemini"?"":"sk-")}>
                  <div style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:op.col}}>{op.label}</div>
                  <div style={{...S.pill(op.col),marginTop:4,display:"inline-block",fontSize:8}}>{op.badge}</div>
    </button>
              ))}
            </div>

            {/* Guía Gemini */}
            {!key.startsWith("sk-") && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.blue,fontWeight:700,letterSpacing:2}}>
                  PASO A PASO — GOOGLE GEMINI (GRATIS)
                </div>
                {[
                  {n:"1",title:"Abrí Google AI Studio",
                   desc:"Tocá el botón. Se abre en tu navegador. Iniciá sesión con tu cuenta de Gmail (la misma que usás para YouTube, Maps, etc.)",
                   btn:<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                     style={{...S.btn("p",C.blue),display:"block",textDecoration:"none",textAlign:"center",fontFamily:MONO,fontSize:12,fontWeight:700}}>
                     Abrir Google AI Studio →
                   </a>},
                  {n:"2",title:'Tocá "Create API key"',
                   desc:'Buscá el botón azul grande que dice "Create API key". Tocalo.'},
                  {n:"3",title:'Elegí el proyecto y creá la key',
                   desc:'Dejá seleccionado "Default Gemini Project" y tocá "Create API key in existing project".'},
                  {n:"4",title:"Copiá la key completa",
                   desc:'Aparece un texto largo que empieza con AIza... o AQ... Tocá el ícono 📋 para copiarlo todo.'},
                ].map(({n,title,desc,btn})=>(
                  <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                      background:`rgba(${rgb(C.blue)},0.15)`,border:`2px solid rgba(${rgb(C.blue)},0.5)`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:MONO,fontSize:13,fontWeight:700,color:C.blue}}>{n}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.text,marginBottom:3}}>{title}</div>
                      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:btn?8:0}}>{desc}</div>
                      {btn}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Guía Claude */}
            {key.startsWith("sk-") && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.violet,fontWeight:700,letterSpacing:2}}>
                  PASO A PASO — ANTHROPIC CLAUDE (DE PAGO)
                </div>
                {[
                  {n:"1",title:"Abrí Anthropic Console",
                   desc:"Necesitás cuenta en Anthropic. Si no tenés, registrate en anthropic.com (requiere tarjeta de crédito).",
                   btn:<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
                     style={{...S.btn("p",C.violet),display:"block",textDecoration:"none",textAlign:"center",fontFamily:MONO,fontSize:12,fontWeight:700}}>
                     Abrir Anthropic Console →
                   </a>},
                  {n:"2",title:'Tocá "Create Key"',
                   desc:'En la sección "API Keys" tocá "Create Key". Ponele un nombre como "SEM Tools".'},
                  {n:"3",title:"Copiá la key — solo se muestra una vez",
                   desc:'La key empieza con sk-ant-api03-... Copiala toda ahora porque no se vuelve a mostrar.'},
                ].map(({n,title,desc,btn})=>(
                  <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                      background:`rgba(${rgb(C.violet)},0.15)`,border:`2px solid rgba(${rgb(C.violet)},0.5)`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:MONO,fontSize:13,fontWeight:700,color:C.violet}}>{n}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.text,marginBottom:3}}>{title}</div>
                      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:btn?8:0}}>{desc}</div>
                      {btn}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <input style={{...S.inp,fontSize:12}}
                placeholder={key.startsWith("sk-")?"sk-ant-api03-...":"AIzaSy... o AQ.Ab8R..."}
                value={key} onChange={e=>{setKey(e.target.value);setErr(null);}}/>
              {err&&<div style={{fontFamily:MONO,fontSize:10,color:C.red,lineHeight:1.6,
                background:`rgba(${rgb(C.red)},0.08)`,borderRadius:8,padding:"8px 12px"}}>{err}</div>}
              <button style={{...S.btn("p",C.green),opacity:testing?.7:1}}
                onClick={testing?null:testAndSave}>
                {testing?"Verificando…":"✓ Guardar y continuar"}
              </button>
            </div>

            <div style={{textAlign:"center",paddingBottom:8}}>
              <button style={{border:"none",background:"none",color:C.dim,
                fontFamily:MONO,fontSize:10,cursor:"pointer",textDecoration:"underline"}}
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
                {[
                  "🔷 Módulos SEM BLE: sensores que se conectan por Bluetooth — sin jack",
                  "🔌 Adaptador USB-C → 3.5mm CON DAC (chip interno): necesario para entrada de micrófono. Los adaptadores pasivos baratos NO funcionan para sensores",
                  "📡 Módulos SEM WiFi: basados en ESP32, se comunican por red local",
                  "⚡ Módulos USB-C directos: datos + alimentación 5V en un solo conector",
                ].map((t,i)=>(
                  <div key={i} style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.9 }}>{t}</div>
                ))}
                <div style={{ fontFamily:MONO, fontSize:10, color:C.amber, marginTop:8, lineHeight:1.7,
                              background:`rgba(${rgb(C.amber)},0.08)`, borderRadius:6, padding:"6px 10px" }}>
                  ⚠ Adaptadores USB-C baratos: solo audio de salida (auriculares). Para sensores jack necesitás un adaptador con chip DAC que soporte entrada de micrófono.
                </div>
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



// ── Materiales Jack y PDF ────────────────────────────────────────────────────
const JACK_MATERIALS = [
  { name:"ThermoJack", items:["NTC 10kΩ B=3950","R 10kΩ ±1%","Cap 100nF cerámico","Jack TRRS 3.5mm macho","Cable apantallado 50cm"] },
  { name:"AirJack",    items:["Transistor BD139 (sin disipador)","R 1kΩ (base)","R 47Ω/1W (emisor)","R 2.2kΩ (colector)","Cap 10µF/16V","Jack TRRS macho","Tubo PVC Ø10mm x 5cm"] },
  { name:"VoltJack",   items:["R 27kΩ ±1%","R 1kΩ ±1%","Zener 3.3V/0.5W","Cap 100nF","Jack TRRS macho","Cables con punta de prueba"] },
  { name:"PhotoJack",  items:["LDR GL5528","R 10kΩ","Cap 100nF","Jack TRRS macho"] },
];

function JackManualPanel() {
  const col = C.orange;
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ ...glass(col,0.06), borderRadius:12, border:`1px solid rgba(${rgb(col)},0.25)`,
                  overflow:"hidden", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"12px 16px", cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:col }}>
            🎁 Manual de construcción + Lista de materiales
          </div>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:2 }}>
            Gratis · ThermoJack · AirJack · VoltJack · PhotoJack
          </div>
        </div>
        <span style={{ color:col, fontSize:16 }}>{open?"▲":"▼"}</span>
      </div>

      {open && (
        <div style={{ padding:"0 16px 16px", borderTop:`1px solid rgba(${rgb(col)},0.15)` }}>
          {/* Descarga PDF */}
          <a href="/manual_jack.pdf" download="SEM_Tools_Manual_Sensores_Jack.pdf" target="_blank"
            style={{ display:"block", textDecoration:"none", marginTop:12, marginBottom:14,
                     ...S.btn("p",col), textAlign:"center" }}>
            ⬇ Descargar manual completo (PDF)
          </a>

          {/* Lista de materiales por módulo */}
          {JACK_MATERIALS.map(m => (
            <div key={m.name} style={{ marginBottom:12 }}>
              <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:col, marginBottom:6 }}>
                {m.name}
              </div>
              {m.items.map((item,i) => (
                <div key={i} style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
                  <span style={{ color:col }}>▸ </span>{item}
                </div>
              ))}
            </div>
          ))}

          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:8, lineHeight:1.7,
                        background:"rgba(255,255,255,0.03)", borderRadius:6, padding:"8px 10px" }}>
            Herramientas necesarias: cautín · estaño · multímetro · termoencogible · pinzas
          </div>
        </div>
      )}
    </div>
  );
}


// ── ORP — Potencial Redox (requiere SEM AquaPanel) ───────────────────────────
function ToolORP() {
  return (
    <ModuleGate modName="SEM AquaPanel" modId="aquapanel">
      <ToolORPInner/>
    </ModuleGate>
  );
}

function ToolORPInner() {
  const col = C.violet;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [orp,setOrp]=useState(null),[trend,setTrend]=useState([]);
  const stRef=useRef(),anlRef=useRef(),rafRef=useRef();

  // ORP: electrodo de platino genera mV proporcional al potencial redox
  // Mismo circuito que pH (alta impedancia) — solo cambia el electrodo
  // Señal muy pequeña (~0.5-1V rango típico) → amplificada al rango de audio
  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stRef.current=s;
      const ctx=new AudioContext(), src2=ctx.createMediaStreamSource(s);
      const anl=ctx.createAnalyser(); anl.fftSize=4096; anl.smoothingTimeConstant=0.9;
      src2.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);
      const td=new Float32Array(anl.fftSize);
      // Calibración ORP: 0mV DC → 0V audio, ±1000mV → ±amplificado
      // Factor depende del circuito (ganancia del INA128 configurada)
      const cal = getCal("orp"); // offset en mV
      const process=()=>{
        anl.getFloatTimeDomainData(td);
        const avg=td.reduce((a,v)=>a+v,0)/td.length;
        // Convertir a mV: factor empírico según ganancia del circuito
        const mvRaw = avg * 1000 * (cal.factor||1);
        const mv = mvRaw + (cal.offset||0);
        setOrp(Math.round(mv));
        setTrend(h=>[...h.slice(-59),mv]);
        rafRef.current=requestAnimationFrame(process);
      };
      rafRef.current=requestAnimationFrame(process);
    }catch(e){setErr(e.message);}
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false);
  };

  useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);stRef.current?.getTracks().forEach(t=>t.stop());},[]);

  // Interpretación ORP para agua de diálisis
  const orpStatus = orp===null?null:
    orp > 600 ? {label:"⚠ Cloro presente", col:C.red, detail:"Agua NO apta para diálisis"} :
    orp > 400 ? {label:"◉ Oxidante residual", col:C.amber, detail:"Verificar filtro de carbón"} :
    orp > 200 ? {label:"✓ Sin cloro", col:C.green, detail:"Apto para diálisis"} :
    {label:"⬇ ORP muy bajo", col:C.dim, detail:"Electrodo desconectado o solución reductora"};

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ ORP — Potencial Redox</div>
      <DemoBanner/>
      {on&&<StopFAB onStop={stop} col={col}/>}

      <div style={{...glass(col,0.06),borderRadius:10,padding:"10px 14px",
        border:`1px solid rgba(${rgb(col)},0.2)`,marginBottom:4}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:4}}>
          MÓDULO SEM AquaPanel — Electrodo ORP de Platino
        </div>
        <div style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.7}}>
          Referencia para diálisis: ORP post-carbón &lt; 400mV (sin cloro oxidante)
        </div>
      </div>

      {orp!==null&&(
        <div style={{...S.disp(orpStatus?.col||col),textAlign:"center",padding:"16px"}}>
          <div style={{fontFamily:MONO,fontSize:64,fontWeight:700,
            color:orpStatus?.col||col,lineHeight:1,textShadow:`0 0 24px ${orpStatus?.col||col}`}}>
            {orp}
          </div>
          <div style={{fontFamily:MONO,fontSize:14,color:C.dim}}>mV</div>
          <div style={{fontFamily:MONO,fontSize:11,color:orpStatus?.col,fontWeight:700,marginTop:6}}>
            {orpStatus?.label}
          </div>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:2}}>
            {orpStatus?.detail}
          </div>
        </div>
      )}

      {trend.length>2&&<TimeChart data={trend} col={col} unit=" mV" height={80}/>}

      {/* Tabla de referencia */}
      <div style={{...S.res(col)}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:8}}>REFERENCIA ORP</div>
        {[[">750","Cloro libre alto",C.red],
          ["400-750","Oxidante presente",C.amber],
          ["200-400","Sin cloro — OK diálisis",C.green],
          ["<200","Sin oxidante / error",C.dim]].map(([r,l,c],i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",
            padding:"6px 0",borderBottom:`1px solid ${C.bord}`}}>
            <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{r} mV</span>
            <span style={{fontFamily:MONO,fontSize:10,color:c,fontWeight:700}}>{l}</span>
          </div>
        ))}
      </div>

      <CalButton onOpen={()=>{}} active={false}/>
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>Conectar electrodo ORP</button>}
      <div style={S.note}>Mismo circuito que pH. Solo cambia el electrodo: platino o Ag/AgCl para ORP.</div>
    </div>
  );
}

// ── pH por Jack (requiere SEM AquaPanel) ─────────────────────────────────────
function ToolpHJack() {
  return (
    <ModuleGate modName="SEM AquaPanel" modId="aquapanel">
      <ToolpHInner/>
    </ModuleGate>
  );
}

function ToolpHInner() {
  const col = C.cyan;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [ph,setPh]=useState(null),[trend,setTrend]=useState([]);
  const [calPhase,setCalPhase]=useState("idle");
  const [calBuf,setCalBuf]=useState([]);
  const stRef=useRef(),anlRef=useRef(),rafRef=useRef();

  const CAL_BUFFERS = [{ph:4.0,col:"#FF6B35"},{ph:7.0,col:"#4ECDC4"},{ph:10.0,col:"#9B59B6"}];

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stRef.current=s;
      const ctx=new AudioContext(), src2=ctx.createMediaStreamSource(s);
      const anl=ctx.createAnalyser(); anl.fftSize=8192; anl.smoothingTimeConstant=0.95;
      src2.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);
      const td=new Float32Array(anl.fftSize);
      const calData=getCal("ph_jack");
      const process=()=>{
        anl.getFloatTimeDomainData(td);
        const avg=td.reduce((a,v)=>a+v,0)/td.length;
        // Electrodo pH: 59.16 mV/pH a 25°C (pendiente de Nernst)
        // Con amplificador x100: 5.916V/pH → mapear al rango de audio
        const mV=avg*1000*(calData.factor||1);
        const phVal=7+mV*(calData.slope||0.017); // calibración inicial
        setPh(Math.max(0,Math.min(14,+phVal.toFixed(2))));
        setTrend(h=>[...h.slice(-59),Math.max(0,Math.min(14,phVal))]);
        rafRef.current=requestAnimationFrame(process);
      };
      rafRef.current=requestAnimationFrame(process);
    }catch(e){setErr(e.message);}
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false);
  };

  useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);stRef.current?.getTracks().forEach(t=>t.stop());},[]);

  const phCol=ph===null?col:ph<6.5?C.amber:ph>8.5?C.violet:C.green;
  const phStatus=ph===null?"":ph<6.5?"Ácido":ph>8.5?"Alcalino":"Neutro";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ pH — Electrodo de Vidrio</div>
      {on&&<StopFAB onStop={stop} col={col}/>}

      {ph!==null&&(
        <div style={{...S.disp(phCol),textAlign:"center",padding:"20px 16px"}}>
          <div style={{fontFamily:MONO,fontSize:72,fontWeight:700,color:phCol,
            lineHeight:1,textShadow:`0 0 28px ${phCol}`}}>{ph}</div>
          <div style={{fontFamily:MONO,fontSize:13,color:C.dim}}>pH</div>
          <div style={{fontFamily:MONO,fontSize:12,color:phCol,fontWeight:700,marginTop:6}}>
            {phStatus}
          </div>
        </div>
      )}

      {trend.length>2&&<TimeChart data={trend} col={col} unit=" pH" height={70}/>}

      {/* Escala visual de pH */}
      <div style={{borderRadius:8,overflow:"hidden",height:16,
        background:"linear-gradient(to right,#FF0000,#FF7F00,#FFFF00,#00FF00,#00FFFF,#0000FF,#8B00FF)"}}>
        {ph!==null&&(
          <div style={{position:"relative",height:"100%"}}>
            <div style={{position:"absolute",top:0,bottom:0,left:`${ph/14*100}%`,
              width:3,background:"#fff",transform:"translateX(-50%)",
              boxShadow:"0 0 6px rgba(255,255,255,0.8)"}}/>
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:8,color:C.dim}}>
        {[0,2,4,6,7,8,10,12,14].map(v=><span key={v}>{v}</span>)}
      </div>

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>Conectar electrodo pH</button>}
      <div style={S.note}>
        Requiere electrodo de vidrio + amplificador buffer alta impedancia (INA128 ganancia baja).
        Calibrar con buffers pH 4, 7 y 10 antes de medir.
      </div>
    </div>
  );
}

// ── Sensores Jack — herramientas individuales ────────────────────────────────
const JACK_MODS = {
  jack_thermo:  { label:"Temperatura",   unit:"°C",  icon:"🌡",  col:"#FF3355", convert:v=>{ const c=getCal('thermo'); return (v*100-40+c.offset)*c.factor; }, stereo:false },
  jack_thermo2: { label:"Dual Temp",     unit:"°C",  icon:"🌡🌡",col:"#B06EFF", convert:v=>{ const c=getCal('thermo'); return (v*100-40+c.offset)*c.factor; }, stereo:true  },
  jack_air:     { label:"Flujo de aire", unit:"m/s", icon:"💨",  col:"#4D9EFF", convert:v=>Math.sqrt(Math.max(0,v)*8), stereo:false },
  jack_volt:    { label:"Voltaje CC",    unit:"V",   icon:"⚡",  col:"#FFB830", convert:v=>v*30,               stereo:false },
  jack_light:   { label:"Luminosidad",   unit:"lux", icon:"☀️",  col:"#B06EFF", convert:v=>Math.pow(Math.max(0,v)*10,2.5), stereo:false },
  jack_raw:     { label:"Señal cruda",   unit:"mV",  icon:"〜",  col:"#00EF88", convert:v=>v*1000,            stereo:false },
};
