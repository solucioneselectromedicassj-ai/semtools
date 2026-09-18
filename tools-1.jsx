import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";
import { CameraView, askClaude } from "./shared-api.jsx";
import { CalButton, DemoBanner, ModuleGate, TimeChart, getCal, isDemoMode } from "./shared-mods.jsx";
import { StopFAB } from "./shared-app.jsx";

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

function ToolJackSensor({ modId }) {
  const m = JACK_MODS[modId];
  const col = m.col;
  const [on,setOn]=useState(false), [val,setVal]=useState(null), [val2,setVal2]=useState(null);
  const [peak,setPeak]=useState(null), [minV,setMin]=useState(null), [err,setErr]=useState(null);
  const [trendData,setTrend]=useState([]);
  // Demo mode
  useEffect(()=>{
    if(!isDemoMode()) return;
    setOn(true);
    const DEMO_VALS={
      jack_thermo:  ()=>+(36.4+Math.random()*0.8).toFixed(1),
      jack_thermo2: ()=>+(36.4+Math.random()*0.8).toFixed(1),
      jack_air:     ()=>+(0.03+Math.random()*0.06).toFixed(3),
      jack_volt:    ()=>+(12.1+Math.random()*0.4).toFixed(2),
      jack_light:   ()=>Math.round(420+Math.random()*80),
      jack_raw:     ()=>+((Math.random()-0.5)*0.8).toFixed(3),
    };
    const gen=DEMO_VALS[modId]||(()=>+(36.5+Math.random()).toFixed(1));
    const t=setInterval(()=>{
      const cv=gen();
      setVal(cv); setPeak(p=>p===null||cv>p?cv:p); setMin(n=>n===null||cv<n?cv:n);
      setTrend(h=>[...h.slice(-59),cv]);
      if(m.stereo) setVal2(+(cv+(Math.random()-0.5)*0.3).toFixed(2));
    },400);
    return ()=>clearInterval(t);
  },[]);
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
        setTrend(h=>[...h.slice(-59),v]);
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
      <JackManualPanel/>

      {/* Display principal */}
      {!m.stereo ? (
        <div style={{ ...S.disp(col), display:"flex", flexDirection:"column", alignItems:"center",
                      justifyContent:"center", padding:"28px 18px", minHeight:140 }}>
          {(()=>{
            const isTemp=modId==="jack_thermo"||modId==="jack_thermo2";
            const [showF,setShowF]=React.useState(false);
            const dv=isTemp&&showF&&val!==null?(val*9/5+32).toFixed(1):fmt(val);
            const du=isTemp?(showF?"°F":"°C"):m.unit;
            return (<>
              <div style={{fontFamily:MONO,fontSize:64,fontWeight:700,color:col,lineHeight:1,
                textShadow:`0 0 30px ${col}`}}>{dv}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                <div style={{fontFamily:MONO,fontSize:16,color:`rgba(${rgb(col)},0.7)`}}>{du}</div>
                {isTemp&&<button style={{border:`1px solid rgba(${rgb(col)},0.5)`,borderRadius:6,
                  padding:"2px 8px",background:"rgba(255,255,255,0.05)",cursor:"pointer",
                  fontFamily:MONO,fontSize:9,color:col}}
                  onClick={()=>setShowF(f=>!f)}>{showF?"→°C":"→°F"}</button>}
              </div>
            </>);
          })()}
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

      {on && <StopFAB onStop={stop} label="⏹ Desconectar" col={col}/>}
      {!on && <button style={S.btn("p",col)} onClick={start}>Conectar {m.icon} {m.label}</button>}

      {/* Gráfica temporal */}
      {trendData.length>2&&<TimeChart data={trendData} col={col} unit={" "+m.unit} height={80}/>}

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

      {m.stereo && <div style={S.note}>Conectá sonda 1 al canal L y sonda 2 al canal R del jack estéreo TRRS.</div>}
      {!m.stereo && <div style={S.note}>Conectá el sensor al jack 3.5mm. Ver manual para construir {m.label === "Temperatura" ? "ThermoJack" : m.icon+" módulo"}.</div>}
    </div>
  );
}

// ── Decibelímetro ── auto-start + picos + duración ────────────────────────────

export { JACK_MATERIALS, JACK_MODS, JackManualPanel, ToolDistancia, ToolIntegrado, ToolJackSensor, ToolORP, ToolORPInner, ToolResistencias, ToolpHInner, ToolpHJack };
