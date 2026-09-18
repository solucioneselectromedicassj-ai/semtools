import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { BLOCKS, C, MONO, S, SVG_PATHS, TOOL, ToolIcon, VERSION, rgb } from "./shared-core.jsx";
import { Onboarding } from "./shared-api.jsx";
import { ErrorBoundary, ModulePlaceholder, TOOL_NEEDS } from "./shared-app.jsx";
import { ToolDistancia, ToolIntegrado, ToolJackSensor, ToolResistencias } from "./tools-1.jsx";
import { ToolDecibeles, ToolNivel } from "./tools-2.jsx";
import { ToolBrujula, ToolOscilo } from "./tools-3.jsx";
import { ToolUSBProbe } from "./tools-5.jsx";
import { ToolBLEScanner, ToolHTTPTester, ToolIPInfo, ToolLANScanner, ToolPing, ToolRed } from "./tools-6.jsx";
import { ToolSistema } from "./tools-7.jsx";
import { ToolDispositivo, ToolModulos } from "./tools-8.jsx";
import { ToolEndoscopio, ToolQR } from "./tools-9.jsx";
import { ToolIR, ToolNFC } from "./tools-10.jsx";

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
    case "dispositivo":   return <ToolDispositivo key={tool}/>;
    case "qr":            return <ToolQR key={tool}/>;
    case "nfc":           return <ToolNFC key={tool}/>;
    case "ir":            return <ToolIR key={tool}/>;
    case "endoscopio":    return <ToolEndoscopio key={tool}/>;
    case "usbprobe":      return <ToolUSBProbe key={tool}/>;
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
function App() {
  const [tool,setTool]=useState(null);
  const [onboardStep,setOnboardStep]=useState(null);

  // Activar modo dev si viene con ?devmode=1 en la URL
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if(params.get("devmode")==="1"){
      const ALL_MODS=["aquapanel","ecgmodule","condmod","cloromod","tacolasr","oscilo2","comptest","spo2mod","irmodule","termocam","redcable"];
      const m={}; ALL_MODS.forEach(id=>m[id]=true);
      try{ localStorage.setItem("sem_active_mods", JSON.stringify(m)); }catch(_e){}
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // null=auto, 1=forzar paso 1, 2=forzar paso 2
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

  // Exponer función de rediagnóstico globalmente (accesible desde ToolSistema)
  useEffect(()=>{
    window.__semGoTo = (toolId) => { setTool(toolId); };
    window.__semRediagnose = () => {
      try{ localStorage.removeItem("sem_caps"); }catch(_e){}
      setCaps(null);
      setOnboardStep(2);
      setShowOnboard(true);
    };
    return ()=>{ delete window.__semRediagnose; };
  },[]);

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
      {showOnboard && <Onboarding onDone={c=>{setCaps(c);setShowOnboard(false);setOnboardStep(null);}} startStep={onboardStep}/>}
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
            padding:"5px 10px",cursor:"pointer",fontFamily:MONO,fontSize:8,color:C.dim,
            display:"flex",alignItems:"center",gap:4}}
            onClick={()=>{setOnboardStep(1);setShowOnboard(true);}}
            title="Cambiar API key de IA">
            🔑
            <span style={{fontSize:7,letterSpacing:.5,opacity:.7}}>IA</span>
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

export { App, Home, getView };
