import React, { useState, useEffect, useRef } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";

// ── Transportador — ángulo en vivo con acelerómetro ──────────────────────────
function getProtractorOffset() { try{ return parseFloat(localStorage.getItem("sem_protractor_offset")||"0")||0; }catch(_e){ return 0; } }
function setProtractorOffsetLS(v) { try{ localStorage.setItem("sem_protractor_offset", String(v)); }catch(_e){} }

function ToolTransportador() {
  const col = C.amber;
  const [angRaw,setAngRaw]=useState(0), [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [hasData,setHasData]=useState(false);
  const [offset,setOffset]=useState(()=>getProtractorOffset());
  const hRef=useRef(null);

  const startMotion = () => {
    const h = e => {
      const ax = e.accelerationIncludingGravity?.x || 0;
      const ay = e.accelerationIncludingGravity?.y || 0;
      const az = e.accelerationIncludingGravity?.z || -9.8;
      const g2 = Math.sqrt(ax*ax+ay*ay+az*az)||9.8;
      const gamma = Math.asin(Math.max(-1,Math.min(1,ax/g2)))*180/Math.PI;
      setAngRaw(gamma); setHasData(true);
    };
    hRef.current = h;
    window.addEventListener("devicemotion", h, true);
    setOn(true); setErr(null);
    setTimeout(()=>setHasData(d=>{ if(!d) setErr("Sin datos del acelerómetro — verificá permisos del sistema"); return d; }), 3000);
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
    setOn(false); setAngRaw(0); setHasData(false);
  };

  useEffect(()=>{
    if(typeof DeviceMotionEvent?.requestPermission!=="function"){ startMotion(); }
    return ()=>{ if(hRef.current) window.removeEventListener("devicemotion",hRef.current,true); };
  },[]);

  const angle = angRaw + offset;
  const clamped = Math.max(-90,Math.min(90,angle));
  const cx=50, cy=55, r=42;
  const rad = clamped*Math.PI/180;
  const nx = cx + r*Math.sin(rad), ny = cy - r*Math.cos(rad);

  const zero = () => { const o=-angRaw; setOffset(o); setProtractorOffsetLS(o); };
  const resetCalib = () => { setOffset(0); setProtractorOffsetLS(0); };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Transportador</div>

      <div style={{...S.disp(col),display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px"}}>
        <svg width="220" height="130" viewBox="0 0 100 65">
          <path d="M8 55 A42 42 0 0 1 92 55" fill="none" stroke={C.bord} strokeWidth="1.5"/>
          {[-90,-60,-30,0,30,60,90].map(a=>{
            const r2=a*Math.PI/180;
            const x1=cx+(r-4)*Math.sin(r2), y1=cy-(r-4)*Math.cos(r2);
            const x2=cx+r*Math.sin(r2), y2=cy-r*Math.cos(r2);
            return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.dim} strokeWidth="1"/>;
          })}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={col} strokeWidth="2.5" strokeLinecap="round"
            style={{filter:`drop-shadow(0 0 4px ${col})`}}/>
          <circle cx={cx} cy={cy} r="3" fill={col}/>
        </svg>
        <div style={{fontFamily:MONO,fontSize:52,fontWeight:700,color:col,lineHeight:1,
          textShadow:`0 0 24px ${col}`,marginTop:4}}>{angle.toFixed(1)}°</div>
        <div style={S.dlbl}>INCLINACIÓN</div>
      </div>

      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6}}>{err}</div>}

      <div style={S.row}>
        <button style={{...S.btn("s"),flex:1}} onClick={zero}>📐 Poner en cero</button>
        {offset!==0 && <button style={{...S.btn("s"),flex:.6,color:C.red}} onClick={resetCalib}>Reset</button>}
      </div>

      {typeof DeviceMotionEvent?.requestPermission==="function" && !on && (
        <button style={S.btn("p",col)} onClick={start}>Activar transportador</button>
      )}
      {on && typeof DeviceMotionEvent?.requestPermission==="function" && (
        <button style={S.btn("r")} onClick={stop}>Detener</button>
      )}

      <div style={S.note}>
        Apoyá el borde del celular contra la superficie a medir. Si la referencia no es perfectamente plana,
        apoyate sobre ella y tocá "Poner en cero" antes de medir el ángulo relativo.
      </div>
    </div>
  );
}

// ── Cronómetro + Temporizador ─────────────────────────────────────────────────
function fmtStopwatch(ms) {
  const totalCs = Math.floor(ms/10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs/100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec/60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}

function beep(freq=880, dur=0.15) {
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = freq; osc.type="sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+dur);
  }catch(_e){}
}

function ToolCronometro() {
  const col = C.cyan;
  const [mode,setMode]=useState("crono");

  const [running,setRunning]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [laps,setLaps]=useState([]);
  const startRef=useRef(0), rafRef=useRef();

  const tick = () => { setElapsed(performance.now()-startRef.current); rafRef.current=requestAnimationFrame(tick); };
  const startCrono = () => { startRef.current=performance.now()-elapsed; setRunning(true); rafRef.current=requestAnimationFrame(tick); };
  const pauseCrono = () => { cancelAnimationFrame(rafRef.current); setRunning(false); };
  const resetCrono = () => { cancelAnimationFrame(rafRef.current); setRunning(false); setElapsed(0); setLaps([]); };
  const lap = () => setLaps(l=>[{t:elapsed,ts:new Date().toLocaleTimeString()},...l]);
  useEffect(()=>()=>cancelAnimationFrame(rafRef.current),[]);

  const [durMin,setDurMin]=useState(5), [durSec,setDurSec]=useState(0);
  const [remaining,setRemaining]=useState(null);
  const [timerRunning,setTimerRunning]=useState(false);
  const [finished,setFinished]=useState(false);
  const timerEndRef=useRef(0), timerRafRef=useRef();

  const timerTick = () => {
    const rem = timerEndRef.current - performance.now();
    if(rem<=0){
      setRemaining(0); setTimerRunning(false); setFinished(true);
      beep(1046,0.4); setTimeout(()=>beep(1046,0.4),500); setTimeout(()=>beep(1046,0.4),1000);
      navigator.vibrate?.([300,150,300,150,300]);
      return;
    }
    setRemaining(rem);
    timerRafRef.current=requestAnimationFrame(timerTick);
  };
  const startTimer = () => {
    const totalMs = remaining!=null && remaining>0 ? remaining : (durMin*60+durSec)*1000;
    if(totalMs<=0) return;
    timerEndRef.current = performance.now()+totalMs;
    setFinished(false); setTimerRunning(true);
    timerRafRef.current=requestAnimationFrame(timerTick);
  };
  const pauseTimer = () => { cancelAnimationFrame(timerRafRef.current); setTimerRunning(false); };
  const resetTimer = () => { cancelAnimationFrame(timerRafRef.current); setTimerRunning(false); setFinished(false); setRemaining(null); };
  useEffect(()=>()=>cancelAnimationFrame(timerRafRef.current),[]);

  const PRESETS=[[1,0],[3,0],[5,0],[10,0],[15,0],[30,0]];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Cronómetro</div>

      <div style={S.row}>
        {[["crono","⏱ Cronómetro"],["timer","⏲ Temporizador"]].map(([m,l])=>(
          <button key={m} style={{...S.btn(mode===m?"p":"s",col),flex:1,fontSize:11}}
            onClick={()=>setMode(m)}>{l}</button>
        ))}
      </div>

      {mode==="crono" && (
        <>
          <div style={{...S.disp(col),textAlign:"center",padding:"24px 16px"}}>
            <div style={{fontFamily:MONO,fontSize:48,fontWeight:700,color:col,
              textShadow:`0 0 20px ${col}`,letterSpacing:1}}>{fmtStopwatch(elapsed)}</div>
          </div>
          <div style={S.row}>
            {!running
              ? <button style={{...S.btn("p",col),flex:1}} onClick={startCrono}>▶ {elapsed>0?"Reanudar":"Iniciar"}</button>
              : <button style={{...S.btn("r"),flex:1}} onClick={pauseCrono}>⏸ Pausar</button>
            }
            <button style={{...S.btn("s"),flex:1}} onClick={running?lap:resetCrono}>{running?"🚩 Vuelta":"↺ Reset"}</button>
          </div>
          {laps.length>0 && (
            <div style={S.res(col)}>
              <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:8}}>VUELTAS ({laps.length})</div>
              {laps.map((l,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",
                  borderBottom:i<laps.length-1?`1px solid ${C.bord}`:"none"}}>
                  <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>#{laps.length-i}</span>
                  <span style={{fontFamily:MONO,fontSize:13,color:C.text,fontWeight:700}}>{fmtStopwatch(l.t)}</span>
                  <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{l.ts}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mode==="timer" && (
        <>
          {remaining==null && !finished && (
            <>
              <div style={S.row}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>MINUTOS</div>
                  <input style={{...S.inp,fontSize:16,textAlign:"center"}} type="number" min={0} value={durMin}
                    onChange={e=>setDurMin(Math.max(0,+e.target.value))}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>SEGUNDOS</div>
                  <input style={{...S.inp,fontSize:16,textAlign:"center"}} type="number" min={0} max={59} value={durSec}
                    onChange={e=>setDurSec(Math.max(0,Math.min(59,+e.target.value)))}/>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {PRESETS.map(([m,s])=>(
                  <button key={m} style={{border:`1px solid ${C.bord}`,borderRadius:8,padding:"5px 10px",
                    background:"rgba(255,255,255,0.04)",cursor:"pointer",fontFamily:MONO,fontSize:10,color:C.dim}}
                    onClick={()=>{setDurMin(m);setDurSec(s);}}>{m} min</button>
                ))}
              </div>
            </>
          )}

          {(remaining!=null || finished) && (
            <div style={{...S.disp(finished?C.red:col),textAlign:"center",padding:"24px 16px"}}>
              <div style={{fontFamily:MONO,fontSize:48,fontWeight:700,color:finished?C.red:col,
                textShadow:`0 0 20px ${finished?C.red:col}`,letterSpacing:1}}>
                {finished?"00:00":fmtStopwatch(remaining)}
              </div>
              {finished&&<div style={{fontFamily:MONO,fontSize:13,color:C.red,marginTop:8,fontWeight:700}}>⏰ ¡TIEMPO CUMPLIDO!</div>}
            </div>
          )}

          <div style={S.row}>
            {!timerRunning
              ? <button style={{...S.btn("p",col),flex:1}} onClick={startTimer}>▶ {remaining!=null&&remaining>0?"Reanudar":"Iniciar"}</button>
              : <button style={{...S.btn("r"),flex:1}} onClick={pauseTimer}>⏸ Pausar</button>
            }
            <button style={{...S.btn("s"),flex:1}} onClick={resetTimer}>↺ Reset</button>
          </div>
        </>
      )}

      <div style={S.note}>
        Útil para protocolos de prueba: tiempos de calentamiento, ciclos de diálisis, intervalos de medición repetidos.
      </div>
    </div>
  );
}

// ── Detector de Metales — magnetómetro crudo (Generic Sensor API) ───────────
function ToolDetectorMetales() {
  const col = C.violet;
  const [supported,setSupported]=useState(null);
  const [baseline,setBaseline]=useState(null);
  const [current,setCurrent]=useState(null);
  const [calibrating,setCalibrating]=useState(false);
  const [sound,setSound]=useState(false);
  const [err,setErr]=useState(null);
  const sensorRef=useRef(null), oscRef=useRef(null), ctxRef=useRef(null), samplesRef=useRef([]);

  const stopAudio = () => {
    try{ oscRef.current?.stop(); }catch(_e){}
    try{ ctxRef.current?.close(); }catch(_e){}
    oscRef.current=null; ctxRef.current=null;
  };

  const calibrate = () => {
    setCalibrating(true); setBaseline(null); samplesRef.current=[];
    setTimeout(()=>{
      const s=samplesRef.current;
      if(s.length>0) setBaseline(s.reduce((a,b)=>a+b,0)/s.length);
      setCalibrating(false);
    },2000);
  };

  const start = () => {
    try{
      if(!("Magnetometer" in window)) { setSupported(false); return; }
      const sensor = new window.Magnetometer({ frequency:20 });
      sensor.addEventListener("reading", () => {
        const mag = Math.sqrt(sensor.x**2+sensor.y**2+sensor.z**2);
        samplesRef.current.push(mag);
        if(samplesRef.current.length>300) samplesRef.current.shift();
        setCurrent(mag);
      });
      sensor.addEventListener("error", ev => {
        setErr(ev.error?.name==="NotAllowedError"?"Permiso de magnetómetro denegado":"Error: "+ev.error?.message);
        setSupported(false);
      });
      sensor.start();
      sensorRef.current = sensor;
      setSupported(true);
      calibrate();
    }catch(e){ setSupported(false); setErr(e.message); }
  };

  useEffect(()=>{
    start();
    return ()=>{ try{ sensorRef.current?.stop(); }catch(_e){} stopAudio(); };
  },[]);

  const deviation = (baseline!=null && current!=null) ? Math.abs(current-baseline) : null;
  const pct = deviation!=null ? Math.min(100,(deviation/80)*100) : 0;
  const status = deviation==null ? null
    : deviation<8  ? {label:"Sin metal cercano",   col:C.green}
    : deviation<25 ? {label:"Posible metal cerca",  col:C.amber}
    : {label:"¡Metal detectado!", col:C.red};

  useEffect(()=>{
    if(!sound || deviation==null){ stopAudio(); return; }
    if(!ctxRef.current){
      try{
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type="sine"; gain.gain.value=0.12;
        osc.connect(gain); gain.connect(ctx.destination); osc.start();
        ctxRef.current=ctx; oscRef.current=osc;
      }catch(_e){}
    }
    if(oscRef.current) oscRef.current.frequency.value = 220 + Math.min(deviation,100)*9;
    if(deviation>8) navigator.vibrate?.(Math.max(20,60-deviation));
  },[deviation, sound]);

  useEffect(()=>()=>stopAudio(),[]);

  if(supported===false){
    return (
      <div style={S.wrap}>
        <div style={S.st(col)}>▸ Detector de Metales</div>
        <div style={{...glass(C.amber,0.08),borderRadius:14,padding:18,
          border:`1px solid rgba(${rgb(C.amber)},0.3)`,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:10}}>🧲</div>
          <div style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.amber,marginBottom:8}}>
            Sensor no disponible
          </div>
          <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8}}>
            Tu navegador no expone el valor crudo del magnetómetro (Generic Sensor API),
            solo el rumbo de brújula ya calculado por el sistema. Sin ese dato no se puede medir
            intensidad de campo magnético con precisión — mostrar un número igual sería inventarlo.
          </div>
          {err && <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:8}}>{err}</div>}
          <button style={{...S.btn("s"),marginTop:14}} onClick={()=>window.__semGoTo?.("brujula")}>
            🧭 Abrir Brújula (referencia de rumbo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Detector de Metales</div>

      <div style={{...S.disp(status?.col||col),textAlign:"center",padding:"20px 16px"}}>
        {calibrating
          ? <div style={{fontFamily:MONO,fontSize:14,color:col}}>Calibrando… alejá el celular de metales</div>
          : <>
              <div style={{fontFamily:MONO,fontSize:52,fontWeight:700,color:status?.col||col,
                lineHeight:1,textShadow:`0 0 24px ${status?.col||col}`}}>
                {deviation!=null?deviation.toFixed(1):"—"}
              </div>
              <div style={{fontFamily:MONO,fontSize:13,color:C.dim}}>µT de desviación</div>
              {status && <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:status.col,marginTop:8}}>{status.label}</div>}
            </>
        }
      </div>

      <div style={{background:"rgba(255,255,255,0.07)",borderRadius:8,height:16,overflow:"hidden",border:`1px solid ${C.bord}`}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:8,transition:"width .1s",
          background:`linear-gradient(90deg,${C.green},${C.amber},${C.red})`}}/>
      </div>

      <div style={S.row}>
        <button style={{...S.btn(sound?"p":"s",col),flex:1}} onClick={()=>setSound(s=>!s)}>
          {sound?"🔊 Sonido ON":"🔇 Sonido OFF"}
        </button>
        <button style={{...S.btn("s"),flex:1}} onClick={calibrate} disabled={calibrating}>
          🎯 Recalibrar
        </button>
      </div>

      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6}}>{err}</div>}

      <div style={S.note}>
        Detecta variaciones en el campo magnético respecto al valor de referencia (calibrado al abrir la herramienta).
        Los valores son orientativos: la carcasa del celular, imanes de fundas y componentes internos también influyen.
        Recalibrá lejos de metal antes de cada medición.
      </div>
    </div>
  );
}

export { ToolCronometro, ToolDetectorMetales, ToolTransportador };
