import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";




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



// ── Gráfica temporal reutilizable ────────────────────────────────────────────
function TimeChart({ data, col, unit="", height=80 }) {
  const cRef = useRef();
  useEffect(()=>{
    const c = cRef.current; if(!c||data.length<2) return;
    const ctx=c.getContext("2d"), W=c.width, H=c.height;
    ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.fillRect(0,0,W,H);
    const valid=data.filter(v=>v!==null&&!isNaN(v));
    if(valid.length<2) return;
    const mn=Math.min(...valid), mx=Math.max(...valid), range=mx-mn||1;
    // Grid
    ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1;
    [0.25,0.5,0.75].forEach(f=>{
      ctx.beginPath();ctx.moveTo(0,H*f);ctx.lineTo(W,H*f);ctx.stroke();
    });
    // Línea
    const sw=W/(data.length-1);
    ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.lineCap="round";
    ctx.beginPath();
    let started=false;
    data.forEach((v,i)=>{
      if(v===null||isNaN(v)) return;
      const x=i*sw, y=H-4-((v-mn)/range)*(H-10);
      if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
    });
    ctx.stroke();
    // Labels
    ctx.fillStyle=col; ctx.font="bold 9px monospace";
    ctx.fillText(mx.toFixed(1)+unit, 4, 11);
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="9px monospace";
    ctx.fillText(mn.toFixed(1)+unit, 4, H-3);
  }, [data]);
  return (
    <canvas ref={cRef} width={640} height={height}
      style={{width:"100%",borderRadius:8,border:`1px solid rgba(${rgb(col)},0.2)`,
        background:"rgba(0,0,0,0.7)",display:"block"}}/>
  );
}



// ── Botón de activación de módulo — componente separado (hooks válidos) ───────
function ModuleActivateButton({ moduleId, col }) {
  const [active, setActive] = useState(()=>isModActive(moduleId));
  return (
    <button style={{...S.btn(active?"r":"s"),display:"flex",alignItems:"center",
      justifyContent:"center",gap:8}}
      onClick={()=>{
        if(active){ deactivateMod(moduleId); setActive(false); }
        else { activateMod(moduleId); setActive(true); }
      }}>
      {active ? "🔒 Desactivar módulo" : "🔓 Tengo este módulo — Activar"}
    </button>
  );
}

// ── Sistema de módulos activables ────────────────────────────────────────────
function getActiveMods() {
  try { return JSON.parse(localStorage.getItem("sem_active_mods")||"{}"); } catch(_e){ return {}; }
}
function activateMod(id) {
  const m = getActiveMods(); m[id]=true;
  try { localStorage.setItem("sem_active_mods", JSON.stringify(m)); } catch(_e){}
}
function deactivateMod(id) {
  const m = getActiveMods(); delete m[id];
  try { localStorage.setItem("sem_active_mods", JSON.stringify(m)); } catch(_e){}
}
function isModActive(id) { return !!getActiveMods()[id]; }

// Hook para chequear módulo activo
function useModule(id) {
  const [active, setActive] = useState(()=>isModActive(id));
  const toggle = () => {
    if(active){ deactivateMod(id); setActive(false); }
    else { activateMod(id); setActive(true); }
  };
  return [active, toggle];
}

// Pantalla de "requiere módulo" cuando la tool está bloqueada
function ModuleGate({ modName, modId, children }) {
  const [active, toggle] = useModule(modId);
  if(active) return children;
  return (
    <div style={S.wrap}>
      <div style={{...glass(C.green,0.08),borderRadius:14,padding:20,
        border:`1px solid rgba(${rgb(C.green)},0.3)`,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12,filter:`drop-shadow(0 0 16px ${C.green})`}}>📦</div>
        <div style={{fontFamily:MONO,fontSize:14,fontWeight:700,color:C.green,marginBottom:8}}>
          {modName}
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8,marginBottom:16}}>
          Esta herramienta requiere el módulo físico {modName}.
          Si ya lo tenés, activalo para desbloquear las herramientas asociadas.
        </div>
        <button style={{...S.btn("p",C.green),maxWidth:280,margin:"0 auto"}} onClick={toggle}>
          ✓ Tengo el módulo — Activar
        </button>
        <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:12}}>
          Módulos disponibles en la sección MÓDULOS
        </div>
      </div>
    </div>
  );
}


// ── MODO DEMO — simulación de todos los sensores ─────────────────────────────
function isDemoMode() {
  try { return localStorage.getItem("sem_demo_mode")==="1"; } catch(_e){ return false; }
}

// Generadores de datos realistas por tipo de sensor
const DEMO_GENERATORS = {
  decibeles:   () => 42 + Math.random()*15 + (Math.random()<0.05?20:0),
  nivel_x:     () => (Math.random()-0.5)*2,
  nivel_y:     () => (Math.random()-0.5)*2,
  spo2:        () => 96 + Math.round(Math.random()*2),
  bpm_cardiaco:() => 68 + Math.round(Math.random()*8),
  temperatura: () => 36.4 + Math.random()*0.8,
  conductividad:()=> 0.14 + Math.random()*0.04,
  orp:         () => 340 + Math.random()*60,
  ph:          () => 7.1 + Math.random()*0.3,
  flujo_aire:  () => 0.03 + Math.random()*0.06,
  voltaje:     () => 12.1 + Math.random()*0.4,
  vibracion:   () => 0.05 + Math.random()*0.12,
  luminosidad: () => 420 + Math.random()*80,
  ecg_sample:  (t) => {
    const T=1.0, x=(t%T)/T;
    return 0.15*Math.exp(-((x-0.2)**2)/0.006)
          +1.0*Math.exp(-((x-0.4)**2)/0.0006)
          -0.15*Math.exp(-((x-0.43)**2)/0.0008)
          +0.3*Math.exp(-((x-0.65)**2)/0.015)
          +(Math.random()-0.5)*0.03;
  },
  sinal_cruda: () => (Math.random()-0.5)*0.8,
};

// Hook para datos de demo con actualización periódica
function useDemoData(key, interval=300, transform=v=>v) {
  const [val, setVal] = useState(()=>transform(DEMO_GENERATORS[key]?.() ?? 0));
  useEffect(()=>{
    if(!isDemoMode()) return;
    const t=setInterval(()=>setVal(transform(DEMO_GENERATORS[key]?.() ?? 0)), interval);
    return ()=>clearInterval(t);
  }, [key, interval]);
  return val;
}

// Banner de demo mode
function DemoBanner() {
  if(!isDemoMode()) return null;
  return (
    <div style={{
      background:`rgba(${rgb(C.amber)},0.15)`,
      border:`1px solid rgba(${rgb(C.amber)},0.4)`,
      borderRadius:8, padding:"6px 12px", marginBottom:8,
      display:"flex", alignItems:"center", gap:8,
      fontFamily:MONO, fontSize:9, color:C.amber, fontWeight:700,
    }}>
      🎭 MODO DEMO — datos simulados · sin hardware real
    </div>
  );
}

// ── Sistema de calibración ────────────────────────────────────────────────────
const CAL_DEFAULTS = {
  nivel:     { bOffset:0, gOffset:0 },          // offset acelerómetro
  decibeles: { offset:0 },                       // ±dB offset
  thermo:    { offset:0, factor:1 },             // offset °C + factor escala
  volt:      { factor:1 },                       // factor divisor resistivo
  air:       { offset:0 },                       // offset m/s en reposo
};

function getCal(key) {
  try {
    const s = localStorage.getItem("sem_cal_" + key);
    return s ? { ...CAL_DEFAULTS[key], ...JSON.parse(s) } : { ...CAL_DEFAULTS[key] };
  } catch(_e) { return { ...CAL_DEFAULTS[key] }; }
}

function saveCal(key, val) {
  try { localStorage.setItem("sem_cal_" + key, JSON.stringify(val)); } catch(_e) {}
}

function resetCal(key) {
  try { localStorage.removeItem("sem_cal_" + key); } catch(_e) {}
}

function CalButton({ onOpen, active }) {
  return (
    <button style={{
      border:`1px solid ${active ? C.amber : C.bord}`,
      borderRadius:8, padding:"5px 12px", cursor:"pointer",
      background: active ? `rgba(${rgb(C.amber)},0.12)` : "rgba(255,255,255,0.04)",
      fontFamily:MONO, fontSize:10,
      color: active ? C.amber : C.dim,
      display:"flex", alignItems:"center", gap:6,
    }} onClick={onOpen}>
      ⚙ {active ? "Calibrado ✓" : "Calibrar"}
    </button>
  );
}

function CalPanel({ title, children, onReset, onClose }) {
  return (
    <div style={{ ...glass(C.amber,0.08), borderRadius:14, padding:"16px",
                  border:`1px solid rgba(${rgb(C.amber)},0.35)`,
                  boxShadow:`0 0 20px rgba(${rgb(C.amber)},0.1)` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:C.amber }}>
          ⚙ CALIBRACIÓN — {title}
        </div>
        <button style={{ border:"none", background:"none", color:C.dim,
                         fontFamily:MONO, fontSize:11, cursor:"pointer" }}
          onClick={onClose}>✕</button>
      </div>
      {children}
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button style={{ ...S.btn("s"), flex:1, fontSize:10 }} onClick={onReset}>
          Resetear calibración
        </button>
        <button style={{ ...S.btn("p",C.amber), flex:1, fontSize:10 }} onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:8, lineHeight:1.6 }}>
        Los valores de calibración se guardan en este celular.
      </div>
    </div>
  );
}

export { CAL_DEFAULTS, CalButton, CalPanel, DEMO_GENERATORS, DemoBanner, ModuleActivateButton, ModuleGate, TimeChart, activateMod, deactivateMod, detectBrand, getActiveMods, getCal, isDemoMode, isModActive, resetCal, saveCal, useDemoData, useModule };
