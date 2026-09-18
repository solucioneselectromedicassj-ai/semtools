import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glow, rgb } from "./shared-core.jsx";
import { CalButton, CalPanel, DEMO_GENERATORS, TimeChart, getCal, isDemoMode, resetCal, saveCal } from "./shared-mods.jsx";
import { StopFAB } from "./shared-app.jsx";

function ToolDecibeles() {
  const col=C.cyan;
  const [db,setDb]=useState(null), [peak,setPeak]=useState(null);
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [history,setHistory]=useState([]);
  // Demo mode
  useEffect(()=>{
    if(!isDemoMode()) return;
    setOn(true);
    const t=setInterval(()=>{
      const v=Math.round(DEMO_GENERATORS.decibeles());
      setDb(v); setPeak(p=>Math.max(p??0,v));
      setHistory(h=>[...h.slice(-59),v]);
    },300);
    return ()=>clearInterval(t);
  },[]); // últimas 60 lecturas para gráfica
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
      {on && <StopFAB onStop={stop} col={col}/>}
      {!on && <button style={S.btn("p",col)} onClick={start}>Activar micrófono</button>}

      {/* Gráfica temporal */}
      {history.length>2&&<TimeChart data={history} col={col} unit=" dB" height={80}/>}


      {(()=>{
        const [calOpen, setCalOpen]  = React.useState(false);
        const [phase,   setPhase]    = React.useState("intro");
        const [prog,    setProg]     = React.useState(0);
        const [meas,    setMeas]     = React.useState(null);
        const cal = getCal("decibeles");
        const isCalibrated = cal.offset !== 0;
        const REFS = [
          { label:"Habitación cerrada y silenciosa",  db:28, desc:"Noche, sin ruidos" },
          { label:"Oficina tranquila",                db:38, desc:"Ventilación suave, personas lejanas" },
          { label:"Habitación con ruido de fondo",    db:48, desc:"Ventilador, heladera, calle lejana" },
          { label:"Exterior tranquilo",               db:42, desc:"Viento suave, sin tráfico" },
        ];
        const measure = () => {
          if(!on){ alert("Activá el micrófono primero"); return; }
          setPhase("measuring"); setProg(0); setMeas(null);
          const samples=[]; const steps=25;
          let i=0;
          const t=setInterval(()=>{
            if(db!==null) samples.push(db);
            i++; setProg(Math.round(i/steps*100));
            if(i>=steps){
              clearInterval(t);
              setMeas(samples.length>0?Math.round(samples.reduce((a,b)=>a+b)/samples.length):null);
              setPhase("choose");
            }
          },200);
        };
        return (
          <>
            <CalButton onOpen={()=>{setCalOpen(o=>!o);setPhase("intro");}} active={isCalibrated}/>
            {calOpen&&(
              <CalPanel title="DECIBELÍMETRO"
                onClose={()=>setCalOpen(false)}
                onReset={()=>{resetCal("decibeles");setCalOpen(false);}}>
                {phase==="intro"&&(
                  <>
                    <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.9,marginBottom:12}}>
                      <span style={{color:C.amber,fontWeight:700}}>1.</span> Activá el micrófono<br/>
                      <span style={{color:C.amber,fontWeight:700}}>2.</span> Buscá el lugar más silencioso que puedas<br/>
                      <span style={{color:C.amber,fontWeight:700}}>3.</span> Quedate quieto y apretá el botón
                    </div>
                    <button style={S.btn("p",C.amber)} onClick={measure}>
                      🤫 Medir silencio (5 segundos)
                    </button>
                  </>
                )}
                {phase==="measuring"&&(
                  <div style={{textAlign:"center",padding:"8px 0"}}>
                    <div style={{fontFamily:MONO,fontSize:13,color:C.amber,marginBottom:10}}>
                      🤫 No hagas ruido…
                    </div>
                    <div style={{height:8,background:`rgba(${rgb(C.amber)},0.15)`,borderRadius:4,overflow:"hidden",marginBottom:8}}>
                      <div style={{height:"100%",width:`${prog}%`,background:C.amber,borderRadius:4,transition:"width .15s"}}/>
                    </div>
                    <div style={{fontFamily:MONO,fontSize:24,fontWeight:700,color:C.amber}}>{db??"-"} dB</div>
                  </div>
                )}
                {phase==="choose"&&meas!==null&&(
                  <>
                    <div style={{fontFamily:MONO,fontSize:11,color:C.text,marginBottom:12}}>
                      Tu micrófono midió <span style={{color:C.amber,fontWeight:700}}>{meas} dB</span> en silencio.<br/>
                      ¿Cómo describirías ese lugar?
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {REFS.map((ref,i)=>(
                        <button key={i} style={{border:`1px solid rgba(${rgb(C.amber)},0.3)`,borderRadius:8,
                          padding:"10px 12px",cursor:"pointer",textAlign:"left",
                          background:"rgba(255,255,255,0.03)"}}
                          onClick={()=>{
                            saveCal("decibeles",{offset:ref.db-meas});
                            setCalOpen(false); setPhase("intro");
                          }}>
                          <div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.text}}>{ref.label}</div>
                          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:2}}>{ref.desc} · ref {ref.db} dB</div>
                          <div style={{fontFamily:MONO,fontSize:9,color:C.amber,marginTop:2}}>
                            → corrección {ref.db-meas>0?"+":""}{ref.db-meas} dB
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </CalPanel>
            )}
          </>
        );
      })()}

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

      {/* Calibración del nivel */}
      {(() => {
        const [calOpen, setCalOpen] = React.useState(false);
        const cal = getCal("nivel");
        const isCalibrated = cal.bOffset !== 0 || cal.gOffset !== 0;
        return (
          <>
            <CalButton onOpen={()=>setCalOpen(o=>!o)} active={isCalibrated}/>
            {calOpen && (
              <CalPanel title="NIVEL" onClose={()=>setCalOpen(false)}
                onReset={()=>{ resetCal("nivel"); setCalOpen(false); }}>
                <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8,marginBottom:12}}>
                  Apoyá el celular sobre una superficie plana de referencia (mesa, regla metálica).
                  Cuando esté quieto, tocá "Tomar referencia".
                </div>
                <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginBottom:8}}>
                  Valor actual: lateral {gx.toFixed(2)}° · inclinación {gy.toFixed(2)}°
                </div>
                <button style={{...S.btn("p",C.amber)}} onClick={()=>{
                  saveCal("nivel", { bOffset: -gy, gOffset: -gx });
                  setCalOpen(false);
                }}>
                  📐 Tomar referencia plana (offset actual)
                </button>
              </CalPanel>
            )}
          </>
        );
      })()}

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

export { SensorTester, ToolDecibeles, ToolNivel };
