import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, VERSION } from "./shared-core.jsx";

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
  nfc:          { needs:["nfc"],                     label:"NFC"                },
  sistema:      { needs:[],                          label:"Sistema"            },
  dispositivo:  { needs:[],                          label:"Dispositivo & Sensores" },
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
  usbprobe:     { needs:[],                          label:"USB-C Probe"        },
  modulos:      { needs:[],                          label:"Módulos"            },
  tacometro:    { needs:[],                          label:"Tacómetro"          },
};

function toolEnabled(toolId, caps) {
  const needs = TOOL_NEEDS[toolId]?.needs || [];
  return needs.every(n => caps[n]);
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


// ── FAB — botón de detener fijo en pantalla ──────────────────────────────────
function StopFAB({ onStop, label="⏹ Detener", col }) {
  const c = col || C.red;
  return (
    <div style={{
      position:"fixed", bottom:70, left:16, right:16, zIndex:999,
      pointerEvents:"none",
    }}>
      <button style={{
        width:"100%", border:"none", borderRadius:16, padding:"14px 0",
        background:c, color:"#fff", fontFamily:MONO, fontSize:15, fontWeight:700,
        cursor:"pointer", pointerEvents:"all",
        boxShadow:`0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${c}66`,
        letterSpacing:1,
      }} onClick={onStop}>
        {label}
      </button>
    </div>
  );
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

export { BatteryDisplay, ErrorBoundary, ModulePlaceholder, StopFAB, TOOL_NEEDS, toolEnabled };
