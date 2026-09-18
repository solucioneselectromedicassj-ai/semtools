import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";
import { CAL_DEFAULTS, activateMod, deactivateMod, detectBrand, getCal, isDemoMode, isModActive, resetCal } from "./shared-mods.jsx";

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
      {/* Gestión de calibraciones */}
      <div style={{...glass(C.amber,0.06),borderRadius:12,padding:"14px 16px",
        border:`1px solid rgba(${rgb(C.amber)},0.2)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.amber,fontWeight:700,letterSpacing:2,marginBottom:10}}>
          ⚙ CALIBRACIONES GUARDADAS
        </div>
        {["nivel","decibeles","thermo","volt","air"].map(k=>{
          const cal = getCal(k);
          const def = CAL_DEFAULTS[k];
          const isDiff = JSON.stringify(cal)!==JSON.stringify(def);
          return (
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 0",borderBottom:`1px solid ${C.bord}`}}>
              <div>
                <span style={{fontFamily:MONO,fontSize:11,color:isDiff?C.amber:C.dim,fontWeight:isDiff?700:400}}>
                  {k.charAt(0).toUpperCase()+k.slice(1)}
                </span>
                {isDiff&&<span style={{fontFamily:MONO,fontSize:9,color:C.dim,marginLeft:8}}>
                  {JSON.stringify(cal).replace(/[{}"]/g,"").slice(0,30)}
                </span>}
              </div>
              {isDiff
                ? <button style={{...S.btn("s"),width:"auto",padding:"4px 10px",fontSize:10,color:C.red}}
                    onClick={()=>resetCal(k)}>Reset</button>
                : <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>Sin calibrar</span>
              }
            </div>
          );
        })}
        <button style={{...S.btn("s"),marginTop:10,fontSize:10}}
          onClick={()=>["nivel","decibeles","thermo","volt","air"].forEach(k=>resetCal(k))}>
          Resetear todas las calibraciones
        </button>
      </div>

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
      {/* Modo desarrollador — activa todos los módulos */}
      {(()=>{
        const ALL_MODS=["aquapanel","ecgmodule","condmod","cloromod","tacolasr","oscilo2","comptest","spo2mod","irmodule","termocam","redcable"];
        const [devMode,setDevMode]=useState(()=>ALL_MODS.every(m=>isModActive(m)));
        const [demoMode,setDemoMode]=useState(()=>isDemoMode());
        return (
          <div style={{...glass(C.amber,0.07),borderRadius:12,padding:"14px 16px",
            border:`1px solid rgba(${rgb(C.amber)},0.3)`}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.amber,fontWeight:700,
              letterSpacing:2,marginBottom:8}}>🔧 MODO DESARROLLADOR</div>
            <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:10}}>
              Activa todos los módulos físicos para pruebas y desarrollo.
            </div>
            <button style={{...S.btn(devMode?"r":"p",C.amber),marginBottom:8}} onClick={()=>{
              if(devMode){ ALL_MODS.forEach(m=>deactivateMod(m)); setDevMode(false); }
              else { ALL_MODS.forEach(m=>activateMod(m)); setDevMode(true); }
            }}>
              {devMode?"🔒 Desactivar módulos":"🔓 Activar todos los módulos"}
            </button>

            <div style={{fontFamily:MONO,fontSize:9,color:C.violet,fontWeight:700,
              letterSpacing:2,marginBottom:6,marginTop:4}}>🎭 MODO DEMO</div>
            <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:8}}>
              Simula todos los sensores con datos realistas — sin necesitar hardware.
              Ideal para ver cómo queda cada herramienta antes de armar los módulos.
            </div>
            <button style={{...S.btn(demoMode?"r":"p",C.violet)}} onClick={()=>{
              const next=!demoMode;
              try{ localStorage.setItem("sem_demo_mode", next?"1":"0"); }catch(_e){}
              if(!demoMode){ ALL_MODS.forEach(m=>activateMod(m)); setDevMode(true); }
              setDemoMode(next);
              window.location.reload();
            }}>
              {demoMode?"⏹ Salir del modo demo":"🎭 Activar modo demo (datos simulados)"}
            </button>
            {demoMode&&<div style={{fontFamily:MONO,fontSize:9,color:C.violet,marginTop:8,
              background:`rgba(${rgb(C.violet)},0.1)`,borderRadius:6,padding:"6px 10px"}}>
              ✓ Modo demo activo — todos los sensores simulados con datos realistas
            </div>}
          </div>
        );
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
          if(window.__semRediagnose) window.__semRediagnose();
          else { try{localStorage.removeItem("sem_caps");}catch(_e){} window.location.reload(); }
        }}>
          🔬 Re-ejecutar test de sensores
        </button>
      </div>

      <div style={S.note}>
        La limpieza de caché elimina recursos guardados por SEM Tools (service worker). No borra datos del sistema ni de otras apps.
      </div>
    </div>
  );
}

// ── Dispositivo & Sensores ────────────────────────────────────────────────────
// Detección dinámica: cada sensor devuelve "ok" | "no" | "perm" | "checking".
async function detectAccelerometer() {
  try {
    if (typeof DeviceMotionEvent === "undefined") return "no";
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm !== "granted") return "perm";
      } catch(_e) { return "perm"; }
    }
    return await new Promise(resolve => {
      let got = false;
      const h = e => { const ag = e.accelerationIncludingGravity; if (ag && ag.x !== null) got = true; };
      window.addEventListener("devicemotion", h, true);
      setTimeout(() => { window.removeEventListener("devicemotion", h, true); resolve(got ? "ok" : "no"); }, 1200);
    });
  } catch(_e) { return "no"; }
}

async function detectGyroscope() {
  try {
    if (typeof DeviceOrientationEvent === "undefined") return "no";
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== "granted") return "perm";
      } catch(_e) { return "perm"; }
    }
    return await new Promise(resolve => {
      let got = false;
      const h = e => { if (e.beta !== null || e.gamma !== null) got = true; };
      window.addEventListener("deviceorientation", h, true);
      setTimeout(() => { window.removeEventListener("deviceorientation", h, true); resolve(got ? "ok" : "no"); }, 1200);
    });
  } catch(_e) { return "no"; }
}

async function detectMagnetometer() {
  try {
    if ("Magnetometer" in window) {
      try {
        const sensor = new window.Magnetometer({ frequency: 5 });
        const r = await new Promise(resolve => {
          let done = false;
          sensor.addEventListener("reading", () => { if (!done) { done = true; try { sensor.stop(); } catch(_e){} resolve("ok"); } });
          sensor.addEventListener("error", ev => { done = true; resolve(ev.error?.name === "NotAllowedError" ? "perm" : "no"); });
          sensor.start();
          setTimeout(() => { if (!done) { done = true; try { sensor.stop(); } catch(_e){} resolve("no"); } }, 1500);
        });
        if (r === "ok" || r === "perm") return r;
      } catch(_e) { /* sin soporte real — fallback abajo */ }
    }
    // Fallback: DeviceOrientation (alpha = rumbo, proxy de magnetómetro real)
    if (typeof DeviceOrientationEvent === "undefined") return "no";
    return await new Promise(resolve => {
      const alphas = [];
      const h = e => { if (e.alpha != null) alphas.push(e.alpha); };
      window.addEventListener("deviceorientation", h, true);
      setTimeout(() => { window.removeEventListener("deviceorientation", h, true); resolve(alphas.length > 0 ? "ok" : "no"); }, 1200);
    });
  } catch(_e) { return "no"; }
}

async function detectAmbientLight() {
  try {
    if (!("AmbientLightSensor" in window)) return "no";
    const sensor = new window.AmbientLightSensor({ frequency: 2 });
    return await new Promise(resolve => {
      let done = false;
      sensor.addEventListener("reading", () => { if (!done) { done = true; try { sensor.stop(); } catch(_e){} resolve("ok"); } });
      sensor.addEventListener("error", ev => { done = true; resolve(ev.error?.name === "NotAllowedError" ? "perm" : "no"); });
      sensor.start();
      setTimeout(() => { if (!done) { done = true; try { sensor.stop(); } catch(_e){} resolve("no"); } }, 1500);
    });
  } catch(e) { return e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "perm" : "no"; }
}

async function detectGeolocation() {
  try {
    if (!navigator.geolocation) return "no";
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        () => resolve("ok"),
        err => resolve(err.code === 1 ? "perm" : "no"),
        { timeout: 4000, maximumAge: 60000 }
      );
    });
  } catch(_e) { return "no"; }
}

async function detectMicrophone() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return "no";
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]);
    stream.getTracks().forEach(t => t.stop());
    return "ok";
  } catch(e) { return e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError" ? "perm" : "no"; }
}

async function detectBluetooth() {
  try {
    if (!navigator.bluetooth) return "no";
    if (typeof navigator.bluetooth.getAvailability === "function") {
      const avail = await navigator.bluetooth.getAvailability();
      return avail ? "ok" : "no";
    }
    return "ok"; // API presente — requiere gesto del usuario para verificar de más
  } catch(_e) { return "no"; }
}

const SENSOR_STATUS = {
  ok:       { icon:"✅", label:"DISPONIBLE",   col:C.green },
  no:       { icon:"❌", label:"NO DISPONIBLE", col:C.red   },
  perm:     { icon:"⚠️", label:"SIN PERMISO",   col:C.amber },
  checking: { icon:"…",  label:"Verificando…",  col:C.dim   },
};

const SENSOR_LIST = [
  { id:"accelerometer", icon:"⦿",  label:"Acelerómetro (DeviceMotion)" },
  { id:"gyroscope",     icon:"〜", label:"Giroscopio (DeviceOrientation)" },
  { id:"magnetometer",  icon:"🧭", label:"Magnetómetro" },
  { id:"ambientlight",  icon:"☀️", label:"Sensor de luz ambiental" },
  { id:"geolocation",   icon:"📍", label:"Geolocalización" },
  { id:"microphone",    icon:"🎙", label:"Micrófono / Jack de audio" },
  { id:"bluetooth",     icon:"🔷", label:"Bluetooth" },
];

function InfoRow({ label, value }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
      <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{label}</span>
      <span style={{fontFamily:MONO,fontSize:11,color:C.text,fontWeight:700,textAlign:"right"}}>{value}</span>
    </div>
  );
}

export { InfoRow, SENSOR_LIST, SENSOR_STATUS, ToolSistema, detectAccelerometer, detectAmbientLight, detectBluetooth, detectGeolocation, detectGyroscope, detectMagnetometer, detectMicrophone };
