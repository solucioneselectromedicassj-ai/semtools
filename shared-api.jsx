import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, ToolIcon, glass, rgb } from "./shared-core.jsx";
import { detectBrand } from "./shared-mods.jsx";
import { TOOL_NEEDS } from "./shared-app.jsx";


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

export { CameraView, Onboarding, askClaude, getUserKey, runSensorDetection };
