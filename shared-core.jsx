import React, { useState, useEffect, useRef, useCallback } from "react";


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

export { BLOCKS, C, MONO, S, SVG_PATHS, TOOL, ToolIcon, VERSION, glass, glow, rgb };
