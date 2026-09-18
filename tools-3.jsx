import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, rgb } from "./shared-core.jsx";
import { StopFAB } from "./shared-app.jsx";
import { SensorTester } from "./tools-2.jsx";

function ToolBrujula() {
  const col=C.cyan;
  const [hdg,setHdg]=useState(null), [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [method,setMethod]=useState(null); // "abs-sensor"|"abs-event"|"ios"
  const refs=useRef({});

  const cardinal=deg=>{
    const d=((deg%360)+360)%360;
    return ["N","NE","E","SE","S","SO","O","NO"][Math.round(d/45)%8];
  };

  const startListener=()=>{
    let gotData=false;

    // Método 1: AbsoluteOrientationSensor (Generic Sensor API — más preciso)
    if('AbsoluteOrientationSensor' in window){
      try {
        const sensor=new AbsoluteOrientationSensor({frequency:20,referenceFrame:"screen"});
        sensor.addEventListener('reading',()=>{
          const q=sensor.quaternion; // [x,y,z,w]
          // Convertir quaternion a heading (yaw)
          const heading=Math.atan2(2*(q[0]*q[3]+q[1]*q[2]),1-2*(q[2]*q[2]+q[3]*q[3]))*180/Math.PI;
          setHdg(((heading%360)+360)%360);
          gotData=true; setMethod("abs-sensor");
        });
        sensor.addEventListener('error',e2=>console.warn("AbsOriSensor:",e2.error.name));
        sensor.start();
        refs.current.sensor=sensor;
      } catch(_e){ /* fallback */ }
    }

    // Método 2: deviceorientationabsolute (Android Chrome)
    const hAbs=e=>{
      if(gotData&&method==="abs-sensor") return;
      if(e.alpha==null) return;
      gotData=true; setMethod("abs-event");
      setHdg((360-e.alpha+360)%360);
    };

    // Método 3: iOS webkitCompassHeading
    const hRel=e=>{
      if(gotData) return;
      if(e.webkitCompassHeading!=null){
        gotData=true; setMethod("ios");
        setHdg(e.webkitCompassHeading);
      }
    };

    refs.current.hAbs=hAbs; refs.current.hRel=hRel;
    window.addEventListener("deviceorientationabsolute",hAbs,true);
    window.addEventListener("deviceorientation",hRel,true);
    setOn(true); setErr(null);

    setTimeout(()=>setHdg(p=>{
      if(p===null) setErr("Sin datos de magnetómetro. Mové el celular en figura 8 y esperá. Si no funciona, este dispositivo puede no tener magnetómetro activo.");
      return p;
    }),6000);
  };

  const start=async()=>{
    if(typeof DeviceOrientationEvent?.requestPermission==="function"){
      try{ const p=await DeviceOrientationEvent.requestPermission(); if(p!=="granted"){setErr("Permiso denegado");return;} }
      catch(e){ setErr(e.message); return; }
    }
    if('AbsoluteOrientationSensor' in window){
      try{ await Promise.all([navigator.permissions.query({name:"accelerometer"}),
                               navigator.permissions.query({name:"magnetometer"}),
                               navigator.permissions.query({name:"gyroscope"})]); }
      catch(_e){}
    }
    startListener();
  };

  const stop=()=>{
    refs.current.sensor?.stop();
    window.removeEventListener("deviceorientationabsolute",refs.current.hAbs,true);
    window.removeEventListener("deviceorientation",refs.current.hRel,true);
    setOn(false); setHdg(null); setMethod(null);
  };

  useEffect(()=>{
    if(typeof DeviceOrientationEvent?.requestPermission!=="function"){ startListener(); }
    return ()=>{
      refs.current.sensor?.stop();
      window.removeEventListener("deviceorientationabsolute",refs.current.hAbs,true);
      window.removeEventListener("deviceorientation",refs.current.hRel,true);
    };
  },[]);

  const deg=hdg!==null?Math.round(hdg):null;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Brújula Digital</div>
      {method&&<div style={{...S.pill(C.green),textAlign:"center",fontSize:9}}>
        Método: {method==="abs-sensor"?"AbsoluteOrientationSensor (óptimo)":method==="abs-event"?"deviceorientationabsolute":"iOS webkitCompassHeading"}
      </div>}

      {/* Rosa de los vientos */}
      <div style={{...S.disp(col),display:"flex",justifyContent:"center",padding:20}}>
        <div style={{position:"relative",width:180,height:180}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid rgba(${rgb(col)},0.25)`,background:"rgba(0,0,0,0.6)"}}/>
          {[["N",0],["E",90],["S",180],["O",270]].map(([l,a])=>(
            <div key={l} style={{position:"absolute",width:"100%",height:"100%",transform:`rotate(${a}deg)`}}>
              <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",
                fontFamily:MONO,fontSize:l==="N"?14:10,fontWeight:700,
                color:l==="N"?C.red:col,textShadow:l==="N"?`0 0 8px ${C.red}`:`0 0 8px ${col}`}}>{l}</div>
            </div>
          ))}
          <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"center",alignItems:"center",
            transform:`rotate(${deg??0}deg)`,transition:"transform .2s ease-out"}}>
            <div style={{position:"relative",width:4,height:140}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:C.red,borderRadius:"2px 2px 0 0",boxShadow:`0 0 10px ${C.red}`}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:"50%",background:col,borderRadius:"0 0 2px 2px"}}/>
            </div>
          </div>
          <div style={{position:"absolute",top:"50%",left:"50%",width:12,height:12,marginTop:-6,marginLeft:-6,
            borderRadius:"50%",background:C.amber,boxShadow:`0 0 10px ${C.amber}`}}/>
        </div>
      </div>

      <div style={S.row}>
        <div style={{...S.disp(col),flex:2,textAlign:"center"}}>
          <div style={{fontFamily:MONO,fontSize:48,fontWeight:700,color:col,textShadow:`0 0 20px ${col}`,lineHeight:1}}>
            {deg!==null?deg+"°":"---"}
          </div>
          <div style={S.dlbl}>RUMBO</div>
        </div>
        <div style={{...S.disp(C.amber),flex:1,textAlign:"center"}}>
          <div style={{fontFamily:MONO,fontSize:36,fontWeight:700,color:C.amber,textShadow:`0 0 16px ${C.amber}`,lineHeight:1}}>
            {deg!==null?cardinal(deg):"--"}
          </div>
          <div style={S.dlbl}>CARDINAL</div>
        </div>
      </div>

      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.7,
        background:"rgba(255,184,48,0.08)",borderRadius:8,padding:"8px 12px"}}>{err}</div>}
      {!on&&typeof DeviceOrientationEvent?.requestPermission==="function"&&(
        <button style={S.btn("p",col)} onClick={start}>Activar brújula</button>
      )}
      {on&&typeof DeviceOrientationEvent?.requestPermission==="function"&&(
        <button style={S.btn("r")} onClick={stop}>Detener</button>
      )}
      <SensorTester onResult={r => {
        if(!r.mag && !err) setErr("Tu celular no tiene magnetómetro — la brújula no puede funcionar en este dispositivo.");
      }}/>
      <div style={S.note}>
        Alejá el celular de metales y electrónica. Calibrá moviéndolo en figura 8.
        La aguja roja → Norte magnético.
      </div>
    </div>
  );
}

// ── Osciloscopio ── auto-snapshot en picos ────────────────────────────────────
function ToolOscilo() {
  const col=C.cyan;
  const cRef=useRef(),anlRef=useRef(),rafRef=useRef(),stRef=useRef(),actxRef=useRef(),snapRef=useRef();
  const [on,setOn]=useState(false), [freq,setFreq]=useState(null), [err,setErr]=useState(null);
  const [snaps,setSnaps]=useState([]), [autoSnap,setAutoSnap]=useState(true);
  const lastSnapRef=useRef(0), prevAboveRef=useRef(false);
  const AUTO_THRESH=0.3, AUTO_COOLDOWN=3000;

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:true}); stRef.current=s;
      const actx=new AudioContext(); actxRef.current=actx;
      const src=actx.createMediaStreamSource(s);
      const anl=actx.createAnalyser(); anl.fftSize=8192; src.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);
      const DISP=2048, td=new Float32Array(anl.fftSize), fd=new Float32Array(anl.frequencyBinCount);
      const draw=()=>{
        const c=cRef.current; if(!c) return;
        const cx=c.getContext("2d"),W=c.width,H=c.height;
        anl.getFloatTimeDomainData(td);
        cx.fillStyle="rgba(0,0,0,0.85)"; cx.fillRect(0,0,W,H);
        cx.strokeStyle="rgba(255,255,255,0.06)"; cx.lineWidth=1;
        for(let i=1;i<4;i++){cx.beginPath();cx.moveTo(0,H*i/4);cx.lineTo(W,H*i/4);cx.stroke();}
        for(let i=1;i<8;i++){cx.beginPath();cx.moveTo(W*i/8,0);cx.lineTo(W*i/8,H);cx.stroke();}
        let trig=0;
        for(let i=1;i<td.length-DISP;i++) if(td[i-1]<0&&td[i]>=0){trig=i;break;}
        cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath();
        const sw=W/DISP;
        for(let i=0;i<DISP;i++){const y=(1-td[trig+i])*H/2;i===0?cx.moveTo(0,y):cx.lineTo(i*sw,y);}
        cx.stroke();
        // Frecuencia con interpolación parabólica
        anl.getFloatFrequencyData(fd);
        let mi=1,mv=-Infinity;
        for(let i=1;i<fd.length-1;i++) if(fd[i]>mv){mv=fd[i];mi=i;}
        if(mv>-80){
          const a=fd[mi-1],b=fd[mi],cc=fd[mi+1];
          const fHz=(mi+0.5*(a-cc)/(a-2*b+cc+1e-9))*actx.sampleRate/anl.fftSize;
          setFreq(fHz.toFixed(1));
          // Amplitud para auto-snap
          let maxAmp=0; for(let i=0;i<td.length;i++) if(Math.abs(td[i])>maxAmp) maxAmp=Math.abs(td[i]);
          const above=maxAmp>AUTO_THRESH;
          if(above&&!prevAboveRef.current&&autoSnap&&Date.now()-lastSnapRef.current>AUTO_COOLDOWN){
            lastSnapRef.current=Date.now();
            const img=c.toDataURL("image/png");
            setSnaps(prev=>[{img,freq:fHz.toFixed(1),ts:new Date().toLocaleTimeString(),auto:true},...prev.slice(0,4)]);
          }
          prevAboveRef.current=above;
        } else setFreq(null);
        rafRef.current=requestAnimationFrame(draw);
      };
      rafRef.current=requestAnimationFrame(draw);
    } catch(e){ setErr("Sin micrófono: "+e.message); }
  };

  const stop=()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); actxRef.current?.close(); setOn(false); setFreq(null); };
  const snap=()=>{ const c=cRef.current; if(!c) return; const img=c.toDataURL("image/png"); setSnaps(prev=>[{img,freq,ts:new Date().toLocaleTimeString(),auto:false},...prev.slice(0,4)]); };
  useEffect(()=>()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); actxRef.current?.close(); },[]);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Osciloscopio de Audio</div>
      <canvas ref={cRef} width={640} height={200}
        style={{width:"100%",borderRadius:10,border:`1px solid rgba(${rgb(col)},0.3)`,background:"rgba(0,0,0,0.85)"}}/>
      {freq&&on&&(
        <div style={{...S.disp(col),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <span style={S.dval(col,34)}>{freq}</span>
            <span style={S.dunt}>Hz</span>
            <div style={S.dlbl}>FRECUENCIA DOMINANTE</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
            <button style={{...S.btn("s"),width:"auto",padding:"8px 12px",fontSize:11}} onClick={snap}>📸 Snap</button>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>Auto</span>
              <div style={{width:32,height:18,borderRadius:9,background:autoSnap?col:"rgba(255,255,255,0.1)",
                border:`1px solid ${C.bord}`,cursor:"pointer",position:"relative",transition:"background .2s"}}
                onClick={()=>setAutoSnap(a=>!a)}>
                <div style={{position:"absolute",top:2,left:autoSnap?14:2,width:14,height:14,
                  borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
              </div>
            </div>
          </div>
        </div>
      )}
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{err}</div>}
      <div style={S.row}>
        {!on?<button style={{...S.btn("p",col),flex:1}} onClick={start}>Activar</button>
            :<><button style={{...S.btn("r"),flex:1}} onClick={stop}>Detener</button>
               <button style={{...S.btn("s"),flex:.5,fontSize:11}} onClick={snap}>📸 Snap</button></>}
      </div>
      {/* Capturas en sección fija — no mueve el canvas */}
      {snaps.length>0&&(
        <div style={{...S.res(col),maxHeight:180,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700}}>
              CAPTURAS ({snaps.length})
            </div>
            <button style={{...S.btn("s"),width:"auto",padding:"4px 10px",fontSize:10}}
              onClick={()=>setSnaps([])}>Borrar</button>
          </div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {snaps.map((s,i)=>(
              <div key={i} style={{flex:"0 0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <img src={s.img} alt="snap" style={{width:90,borderRadius:6,
                  border:`1px solid rgba(${rgb(col)},0.4)`,display:"block"}}/>
                <div style={{fontFamily:MONO,fontSize:10,color:col,fontWeight:700,textAlign:"center"}}>
                  {s.freq} Hz
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {s.auto&&<span style={S.pill(C.amber)}>auto</span>}
                  <a href={s.img} download={`osc_${s.ts.replace(/:/g,"-")}.png`}
                    style={{fontFamily:MONO,fontSize:9,color:C.blue}}>⬇</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={S.note}>Resolución ~5 Hz · Auto-snap captura picos · 📸 manual · Capturas en scroll horizontal</div>
    </div>
  );
}




// ── Generador de tonos ────────────────────────────────────────────────────────
function ToolGenerador() {
  const col = C.amber;
  const [on, setOn] = useState(false);
  const [freq, setFreq] = useState(1000);
  const [wave, setWave] = useState("sine");
  const [vol, setVol] = useState(0.5);
  const [sweep, setSweep] = useState(false);
  const ctxRef = useRef(null), oscRef = useRef(null), gainRef = useRef(null), rafRef = useRef();

  const start = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave; osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    ctxRef.current = ctx; oscRef.current = osc; gainRef.current = gain;
    setOn(true);
  };

  const stop = () => {
    oscRef.current?.stop(); ctxRef.current?.close();
    ctxRef.current = null; oscRef.current = null;
    setOn(false); setSweep(false);
  };

  useEffect(()=>{ if(oscRef.current) oscRef.current.frequency.value = freq; }, [freq]);
  useEffect(()=>{ if(oscRef.current) oscRef.current.type = wave; }, [wave]);
  useEffect(()=>{ if(gainRef.current) gainRef.current.gain.value = vol; }, [vol]);

  useEffect(()=>{
    if(!sweep||!oscRef.current) return;
    let f = 20;
    const run = () => {
      f = f < 20000 ? f * 1.02 : 20;
      if(oscRef.current) oscRef.current.frequency.value = f;
      setFreq(Math.round(f));
      rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sweep]);

  useEffect(()=>()=>{ oscRef.current?.stop(); ctxRef.current?.close(); }, []);

  const WAVES = [["sine","Seno ∿"],["square","Cuadrada ⊓"],["triangle","Triángulo △"],["sawtooth","Sierra ⋁"]];
  const PRESETS = [[20,"20Hz"],[50,"50Hz"],[60,"60Hz"],[440,"440Hz"],[1000,"1kHz"],[10000,"10kHz"]];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Generador de Tonos</div>
      {on && <button style={{...S.btn("r"),marginBottom:4}} onClick={stop}>⏹ Detener</button>}

      {/* Frecuencia */}
      <div style={{...S.disp(col),padding:"20px 16px",textAlign:"center"}}>
        <div style={{fontFamily:MONO,fontSize:56,fontWeight:700,color:col,
          textShadow:`0 0 24px ${col}`,lineHeight:1}}>
          {freq>=1000?(freq/1000).toFixed(freq>=10000?1:2)+"kHz":freq+"Hz"}
        </div>
        <div style={S.dlbl}>{wave.toUpperCase()}</div>
      </div>

      <input type="range" min={20} max={20000} step={1} value={freq}
        style={{width:"100%",accentColor:col}}
        onChange={e=>setFreq(+e.target.value)}/>
      <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:9,color:C.dim}}>
        <span>20 Hz</span><span>20 kHz</span>
      </div>

      {/* Presets */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {PRESETS.map(([f,l])=>(
          <button key={f} style={{border:`1px solid ${freq===f?col:C.bord}`,borderRadius:8,
            padding:"5px 10px",cursor:"pointer",fontFamily:MONO,fontSize:10,
            color:freq===f?col:C.dim,background:freq===f?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setFreq(f)}>{l}</button>
        ))}
      </div>

      {/* Forma de onda */}
      <div style={{display:"flex",gap:6}}>
        {WAVES.map(([w,l])=>(
          <button key={w} style={{flex:1,border:`1px solid ${wave===w?col:C.bord}`,borderRadius:8,
            padding:"8px 4px",cursor:"pointer",fontFamily:MONO,fontSize:9,
            color:wave===w?col:C.dim,background:wave===w?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setWave(w)}>{l}</button>
        ))}
      </div>

      {/* Volumen */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim,whiteSpace:"nowrap"}}>Vol {Math.round(vol*100)}%</span>
        <input type="range" min={0} max={1} step={0.01} value={vol}
          style={{flex:1,accentColor:col}} onChange={e=>setVol(+e.target.value)}/>
      </div>

      <div style={S.row}>
        {!on
          ?<button style={{...S.btn("p",col),flex:1}} onClick={start}>▶ Generar tono</button>
          :<button style={{...S.btn(sweep?"r":"s"),flex:1}} onClick={()=>setSweep(s=>!s)}>
            {sweep?"⏹ Parar sweep":"⟳ Sweep 20Hz→20kHz"}
          </button>
        }
      </div>
      <div style={S.note}>Útil para probar amplificadores, bocinas, filtros y circuitos de audio. 50/60Hz detecta ruido de red eléctrica.</div>
    </div>
  );
}

// ── Analizador de espectro ────────────────────────────────────────────────────
function ToolEspectro() {
  const col = C.violet;
  const [on, setOn] = useState(false), [err, setErr] = useState(null);
  const [peak, setPeak] = useState(null);
  const anlRef = useRef(), stRef = useRef(), cRef = useRef(), rafRef = useRef();

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stRef.current = s;
      const ctx = new AudioContext(), src2 = ctx.createMediaStreamSource(s);
      const anl = ctx.createAnalyser(); anl.fftSize = 4096; anl.smoothingTimeConstant = 0.7;
      src2.connect(anl); anlRef.current = anl;
      setOn(true); setErr(null);
      const buf = new Float32Array(anl.frequencyBinCount);
      const draw = () => {
        anl.getFloatFrequencyData(buf);
        const c = cRef.current; if(!c) return;
        const ctx2=c.getContext("2d"), W=c.width, H=c.height;
        ctx2.fillStyle="rgba(0,0,0,0.85)"; ctx2.fillRect(0,0,W,H);
        // Grid de frecuencias
        const sampleRate = ctx.sampleRate;
        ctx2.strokeStyle="rgba(255,255,255,0.06)"; ctx2.lineWidth=1;
        [100,1000,10000].forEach(f=>{
          const x = Math.log10(f/20)/Math.log10(sampleRate/2/20)*W;
          ctx2.beginPath();ctx2.moveTo(x,0);ctx2.lineTo(x,H);ctx2.stroke();
          ctx2.fillStyle="rgba(255,255,255,0.3)";ctx2.font="8px monospace";
          ctx2.fillText(f>=1000?f/1000+"kHz":f+"Hz",x+2,H-2);
        });
        // Espectro
        ctx2.beginPath();
        let maxDb=-Infinity, maxBin=0;
        for(let i=0;i<buf.length;i++){
          const freq2=i/buf.length*(sampleRate/2);
          if(freq2<20) continue;
          const x=Math.log10(freq2/20)/Math.log10(sampleRate/2/20)*W;
          const y=H-(buf[i]+120)/80*H;
          i===0?ctx2.moveTo(x,Math.max(0,y)):ctx2.lineTo(x,Math.max(0,y));
          if(buf[i]>maxDb){maxDb=buf[i];maxBin=i;}
        }
        ctx2.strokeStyle=col; ctx2.lineWidth=2; ctx2.stroke();
        // Fill bajo la curva
        ctx2.lineTo(W,H); ctx2.lineTo(0,H); ctx2.closePath();
        ctx2.fillStyle=`rgba(${rgb(col)},0.08)`; ctx2.fill();
        // Pico
        const peakFreq = maxBin/buf.length*(sampleRate/2);
        if(peakFreq>20) setPeak(Math.round(peakFreq));
        rafRef.current=requestAnimationFrame(draw);
      };
      rafRef.current=requestAnimationFrame(draw);
    } catch(e){ setErr(e.message); }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false); setPeak(null);
  };

  useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);stRef.current?.getTracks().forEach(t=>t.stop());},[]);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Analizador de Espectro</div>
      {on && <StopFAB onStop={stop} col={col}/>}
      {peak&&<div style={{...S.disp(col),textAlign:"center",padding:"8px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>FRECUENCIA DOMINANTE</div>
        <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:col,textShadow:`0 0 14px ${col}`}}>
          {peak>=1000?(peak/1000).toFixed(2)+"kHz":peak+" Hz"}
        </div>
      </div>}
      <canvas ref={cRef} width={640} height={200}
        style={{width:"100%",borderRadius:10,border:`1px solid rgba(${rgb(col)},0.25)`,background:"#000"}}/>
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>Activar micrófono</button>}
      <div style={S.note}>Escala logarítmica 20Hz–20kHz. Detecta 50/60Hz (ruido eléctrico), armónicos, resonancias. Útil para diagnóstico de motores y transformadores.</div>
    </div>
  );
}

// ── Vibrómetro ─────────────────────────────────────────────────────────────────
function ToolVibrómetro() {
  const col = C.orange;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [mag,setMag]=useState(0),[peak,setPeak]=useState(0),[domFreq,setDomFreq]=useState(null);
  const [samples,setSamples]=useState([]);
  const hRef=useRef(), cRef=useRef(), rafRef=useRef();
  const BUF_SIZE=256, SAMPLE_RATE=50;

  const startSensor=()=>{
    const buf=[];
    const h=e=>{
      const a=e.accelerationIncludingGravity;
      if(!a) return;
      const m=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);
      const g=9.81, vibMag=Math.abs(m-g);
      setMag(+vibMag.toFixed(3));
      setPeak(p=>Math.max(p,vibMag));
      buf.push(vibMag);
      if(buf.length>BUF_SIZE) buf.shift();
      setSamples([...buf]);
      // FFT simple: encontrar frecuencia dominante
      if(buf.length===BUF_SIZE){
        let maxAmp=0,maxK=0;
        for(let k=1;k<BUF_SIZE/2;k++){
          let re=0,im=0;
          for(let n=0;n<BUF_SIZE;n++){
            re+=buf[n]*Math.cos(2*Math.PI*k*n/BUF_SIZE);
            im-=buf[n]*Math.sin(2*Math.PI*k*n/BUF_SIZE);
          }
          const amp=Math.sqrt(re*re+im*im);
          if(amp>maxAmp){maxAmp=amp;maxK=k;}
        }
        setDomFreq(+(maxK*SAMPLE_RATE/BUF_SIZE).toFixed(1));
      }
    };
    hRef.current=h;
    window.addEventListener("devicemotion",h,true);
    setOn(true);setErr(null);setPeak(0);
  };

  const start=async()=>{
    if(typeof DeviceMotionEvent?.requestPermission==="function"){
      try{const p=await DeviceMotionEvent.requestPermission();if(p!=="granted"){setErr("Permiso denegado");return;}}
      catch(e){setErr(e.message);return;}
    }
    startSensor();
  };

  const stop=()=>{
    if(hRef.current) window.removeEventListener("devicemotion",hRef.current,true);
    setOn(false);
  };

  useEffect(()=>{
    if(typeof DeviceMotionEvent?.requestPermission!=="function") startSensor();
    return()=>{if(hRef.current) window.removeEventListener("devicemotion",hRef.current,true);};
  },[]);

  // Canvas
  useEffect(()=>{
    const c=cRef.current; if(!c||samples.length<2) return;
    const ctx=c.getContext("2d"),W=c.width,H=c.height;
    ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,W,H);
    const mx=Math.max(...samples,0.1);
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();
    samples.forEach((v,i)=>{
      const x=i/samples.length*W, y=H-(v/mx)*(H-4)-2;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();
  },[samples]);

  const vibLevel = mag<0.05?"✓ Quieto":mag<0.2?"◉ Leve":mag<0.5?"⊘ Moderado":"⚠ Fuerte";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Vibrómetro</div>
      {on&&<StopFAB onStop={stop} col={col}/>}
      <div style={{display:"flex",gap:8}}>
        <div style={{...S.disp(col),flex:2,textAlign:"center",padding:"16px 8px"}}>
          <div style={{fontFamily:MONO,fontSize:44,fontWeight:700,color:col,lineHeight:1,textShadow:`0 0 20px ${col}`}}>
            {mag.toFixed(3)}
          </div>
          <div style={{fontFamily:MONO,fontSize:11,color:C.dim}}>m/s²</div>
          <div style={S.dlbl}>{vibLevel}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
          <div style={{...S.disp(C.red),textAlign:"center",flex:1,padding:"10px 4px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>PICO</div>
            <div style={{fontFamily:MONO,fontSize:18,fontWeight:700,color:C.red}}>{peak.toFixed(3)}</div>
          </div>
          {domFreq&&<div style={{...S.disp(C.amber),textAlign:"center",flex:1,padding:"10px 4px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>FREC. DOM.</div>
            <div style={{fontFamily:MONO,fontSize:16,fontWeight:700,color:C.amber}}>{domFreq}Hz</div>
          </div>}
        </div>
      </div>
      <canvas ref={cRef} width={640} height={80}
        style={{width:"100%",borderRadius:8,border:`1px solid rgba(${rgb(col)},0.25)`,background:"#000"}}/>
      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&typeof DeviceMotionEvent?.requestPermission==="function"&&
        <button style={S.btn("p",col)} onClick={start}>Activar vibrómetro</button>}
      <div style={S.note}>Apoyá el celular sobre el equipo. Detecta vibración mecánica y su frecuencia dominante. Útil para rodamientos, motores, transformadores.</div>
    </div>
  );
}

// ── PPG / Pulso cardíaco ──────────────────────────────────────────────────────

export { ToolBrujula, ToolEspectro, ToolGenerador, ToolOscilo, ToolVibrómetro };
