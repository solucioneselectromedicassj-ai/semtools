import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";
import { CalButton, CalPanel, DEMO_GENERATORS, DemoBanner, TimeChart, isDemoMode } from "./shared-mods.jsx";
import { StopFAB } from "./shared-app.jsx";

function ToolPPG() {
  const col = C.red;
  const vRef=useRef(),cRef=useRef(),rafRef=useRef(),stRef=useRef(),tkRef=useRef();
  const [on,setOn]=useState(false),[phase,setPhase]=useState("idle");
  const [bpm,setBpm]=useState(null),[signal,setSignal]=useState([]);
  const [err,setErr]=useState(null);
  const samplesRef=useRef([]);

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:640}}});
      stRef.current=s; vRef.current.srcObject=s; await vRef.current.play();
      const track=s.getVideoTracks()[0];
      tkRef.current=track;
      try{await track.applyConstraints({advanced:[{torch:true}]});}catch(_e){}
      setOn(true);setPhase("measuring");setErr(null);
      samplesRef.current=[];
      const c=cRef.current;
      const detect=()=>{
        if(!vRef.current||!c) return;
        c.width=32;c.height=32;
        const ctx=c.getContext("2d");
        ctx.drawImage(vRef.current,0,0,32,32);
        const d=ctx.getImageData(0,0,32,32).data;
        let r=0;for(let i=0;i<d.length;i+=4) r+=d[i];
        r=r/(32*32);
        samplesRef.current.push(r);
        setSignal([...samplesRef.current.slice(-150)]);
        // Detectar BPM a partir de 5 segundos (250 muestras a ~50fps aprox)
        const samples=samplesRef.current;
        if(samples.length>200){
          // Encontrar picos (máximos locales)
          const peaks=[];
          for(let i=2;i<samples.length-2;i++){
            if(samples[i]>samples[i-1]&&samples[i]>samples[i-2]&&
               samples[i]>samples[i+1]&&samples[i]>samples[i+2]&&
               samples[i]>samples.reduce((a,b)=>a+b)/samples.length*1.005){
              if(peaks.length===0||i-peaks[peaks.length-1]>10)
                peaks.push(i);
            }
          }
          if(peaks.length>2){
            const intervals=[];
            for(let i=1;i<peaks.length;i++) intervals.push(peaks[i]-peaks[i-1]);
            const avgInterval=intervals.reduce((a,b)=>a+b)/intervals.length;
            // Asumiendo ~30fps en el loop RAF
            const fps=30;
            setBpm(Math.round(60/(avgInterval/fps)));
          }
        }
        rafRef.current=requestAnimationFrame(detect);
      };
      rafRef.current=requestAnimationFrame(detect);
    }catch(e){setErr(e.message);}
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    try{tkRef.current?.applyConstraints({advanced:[{torch:false}]});}catch(_e){}
    stRef.current?.getTracks().forEach(t=>t.stop());
    if(vRef.current) vRef.current.srcObject=null;
    setOn(false);setPhase("idle");setBpm(null);setSignal([]);
    samplesRef.current=[];
  };

  useEffect(()=>()=>{
    cancelAnimationFrame(rafRef.current);
    try{tkRef.current?.applyConstraints({advanced:[{torch:false}]});}catch(_e){}
    stRef.current?.getTracks().forEach(t=>t.stop());
  },[]);

  const bpmCol=bpm?bpm>100?C.red:bpm>60?C.green:C.amber:col;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ PPG — Pulso Cardíaco</div>
      {on&&<StopFAB onStop={stop} col={col}/>}

      <div style={{...glass(col,0.07),borderRadius:12,padding:14,border:`1px solid rgba(${rgb(col)},0.25)`,marginBottom:4}}>
        <div style={{fontFamily:MONO,fontSize:10,color:col,fontWeight:700,marginBottom:8}}>INSTRUCCIONES</div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8}}>
          1. Colocá la punta del dedo índice sobre la cámara trasera<br/>
          2. Cubrí bien el lente y el flash<br/>
          3. Mantené el dedo quieto durante 10 segundos
        </div>
      </div>

      <video ref={vRef} style={{display:"none"}} playsInline muted/>
      <canvas ref={cRef} style={{display:"none"}}/>

      {bpm&&(
        <div style={{...S.disp(bpmCol),textAlign:"center",padding:"20px 16px"}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>FRECUENCIA CARDÍACA</div>
          <div style={{fontFamily:MONO,fontSize:64,fontWeight:700,color:bpmCol,lineHeight:1,
            textShadow:`0 0 30px ${bpmCol}`}}>{bpm}</div>
          <div style={{fontFamily:MONO,fontSize:14,color:C.dim}}>BPM</div>
          <div style={{fontFamily:MONO,fontSize:11,color:bpmCol,marginTop:4}}>
            {bpm>100?"Taquicardia":bpm<60?"Bradicardia":"Normal"}
          </div>
        </div>
      )}

      {signal.length>5&&(
        <TimeChart data={signal.map(v=>v||null)} col={col} height={80}/>
      )}

      {!bpm&&on&&(
        <div style={{...S.disp(col),textAlign:"center",padding:16}}>
          <div style={{fontFamily:MONO,fontSize:12,color:col}}>
            {signal.length<50?"Colocá el dedo sobre la cámara…":"Analizando pulso…"}
          </div>
          <div style={{fontFamily:MONO,fontSize:11,color:C.dim,marginTop:4}}>
            {Math.min(100,Math.round(signal.length/2))}% completado
          </div>
        </div>
      )}

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>❤ Medir pulso</button>}
      <div style={S.note}>Orientativo — no reemplaza un oxímetro médico. Útil para verificar el funcionamiento de sensores PPG en equipos biomédicos.</div>
    </div>
  );
}


// ── Generador ECG — simulador PQRST estéreo ───────────────────────────────────
function ToolECGGen() {
  const col = C.green;
  const [on,setOn]=useState(false);
  const [bpm,setBpm]=useState(60),[amp,setAmp]=useState(0.5);
  const [lead,setLead]=useState("I");
  const ctxRef=useRef(),bufRef=useRef(),srcRef=useRef(),cRef=useRef();

  // Generar un período de ECG sintético (PQRST)
  const makeECG=(sampleRate,bpmVal,leadName)=>{
    const T=Math.round(sampleRate*60/bpmVal);
    const buf=new Float32Array(T);
    const G=(t,mu,sig,a)=>a*Math.exp(-((t-mu)**2)/(2*sig**2));
    // Derivaciones: diferentes amplitudes de ondas
    const leads={
      "I":  {p:0.15,q:-0.05,r:1.0, s:-0.15,t:0.30},
      "II": {p:0.20,q:-0.10,r:1.2, s:-0.10,t:0.35},
      "III":{p:0.05,q:-0.05,r:0.8, s:-0.05,t:0.20},
      "aVR":{p:-0.15,q:0.05,r:-1.0,s:0.15, t:-0.30},
      "aVL":{p:0.10,q:-0.05,r:0.6, s:-0.10,t:0.20},
      "V1": {p:0.10,q:-0.10,r:0.3, s:-0.8, t:0.15},
      "V5": {p:0.15,q:-0.05,r:1.1, s:-0.05,t:0.40},
    };
    const w=leads[leadName]||leads["I"];
    for(let i=0;i<T;i++){
      const x=i/T;
      buf[i]=G(x,0.15,0.025,w.p)+G(x,0.36,0.012,w.q)+
             G(x,0.40,0.008,w.r)+G(x,0.44,0.010,w.s)+G(x,0.65,0.040,w.t);
    }
    return buf;
  };

  const start=()=>{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const sampleRate=ctx.sampleRate;
    const buf1=makeECG(sampleRate,bpm,"I");   // Lead I → canal L
    const buf2=makeECG(sampleRate,bpm,lead);  // Lead elegido → canal R
    // Crear buffer estéreo (2 canales)
    const abuf=ctx.createBuffer(2,buf1.length,sampleRate);
    const chL=abuf.getChannelData(0), chR=abuf.getChannelData(1);
    for(let i=0;i<buf1.length;i++){chL[i]=buf1[i]*amp; chR[i]=buf2[i]*amp;}
    // Repetir en loop
    const src2=ctx.createBufferSource();
    src2.buffer=abuf; src2.loop=true;
    src2.connect(ctx.destination); src2.start();
    ctxRef.current=ctx; srcRef.current=src2;
    bufRef.current={buf1,buf2};
    setOn(true);
    // Dibujar en canvas
    drawWave(buf1,buf2);
  };

  const stop=()=>{ srcRef.current?.stop(); ctxRef.current?.close(); setOn(false); };

  const drawWave=(b1,b2)=>{
    const c=cRef.current; if(!c) return;
    const ctx=c.getContext("2d"),W=c.width,H=c.height,H2=H/2;
    ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,H2);ctx.lineTo(W,H2);ctx.stroke();
    [[b1,C.green,"Lead I (L)"],[b2,C.cyan,`${lead} (R)`]].forEach(([buf,col2,lbl],ci)=>{
      const show=buf.slice(0,Math.min(buf.length,W));
      ctx.strokeStyle=col2; ctx.lineWidth=2; ctx.beginPath();
      const yOff=ci===0?H2*0.5:H2*1.5;
      show.forEach((v,i)=>{
        const x=i/show.length*W, y=yOff-v*(H2*0.4);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.fillStyle=col2; ctx.font="8px monospace";
      ctx.fillText(lbl,4,ci===0?12:H2+12);
    });
  };

  useEffect(()=>()=>{srcRef.current?.stop();ctxRef.current?.close();},[]);
  useEffect(()=>{ if(on){stop();setTimeout(start,100);} },[bpm,amp,lead]);
  useEffect(()=>{ if(bufRef.current) drawWave(bufRef.current.buf1,bufRef.current.buf2); },[lead]);

  const LEADS=["I","II","III","aVR","aVL","V1","V5"];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Generador ECG — Simulador PQRST</div>
      {on&&<StopFAB onStop={stop} col={col}/>}

      <div style={{...glass(col,0.06),borderRadius:12,padding:"10px 14px",
        border:`1px solid rgba(${rgb(col)},0.2)`,marginBottom:4}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:4}}>USO</div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7}}>
          Genera señal ECG sintética por el jack de audio para calibrar y probar equipos ECG.
          Canal L → Lead I siempre. Canal R → derivación seleccionada.
        </div>
      </div>

      {/* Preview ECG */}
      <canvas ref={cRef} width={640} height={120}
        style={{width:"100%",borderRadius:8,border:`1px solid rgba(${rgb(col)},0.25)`,background:"#000"}}/>

      {/* BPM */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim,whiteSpace:"nowrap"}}>
          {bpm} BPM
        </span>
        <input type="range" min={30} max={200} value={bpm} style={{flex:1,accentColor:col}}
          onChange={e=>{setBpm(+e.target.value);if(bufRef.current)drawWave(...Object.values(bufRef.current));}}/>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {[40,60,80,100,120,150].map(v=>(
          <button key={v} style={{border:`1px solid ${bpm===v?col:C.bord}`,borderRadius:6,
            padding:"4px 8px",cursor:"pointer",fontFamily:MONO,fontSize:9,
            color:bpm===v?col:C.dim,background:bpm===v?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setBpm(v)}>{v}</button>
        ))}
      </div>

      {/* Amplitud */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim,whiteSpace:"nowrap"}}>
          Amp {Math.round(amp*100)}%
        </span>
        <input type="range" min={0.05} max={1} step={0.05} value={amp}
          style={{flex:1,accentColor:col}} onChange={e=>setAmp(+e.target.value)}/>
      </div>

      {/* Derivación canal R */}
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>DERIVACIÓN CANAL R:</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {LEADS.map(l=>(
          <button key={l} style={{border:`1px solid ${lead===l?col:C.bord}`,borderRadius:6,
            padding:"5px 10px",cursor:"pointer",fontFamily:MONO,fontSize:10,
            color:lead===l?col:C.dim,background:lead===l?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setLead(l)}>{l}</button>
        ))}
      </div>

      {!on
        ?<button style={S.btn("p",col)} onClick={start}>▶ Iniciar generador ECG</button>
        :<div style={{fontFamily:MONO,fontSize:10,color:col,textAlign:"center",
          padding:"8px",background:`rgba(${rgb(col)},0.08)`,borderRadius:8}}>
          ● Generando ECG — {bpm} BPM · Lead I (L) · {lead} (R)
        </div>
      }
      <div style={S.note}>
        Conectá el jack al equipo ECG a calibrar. Sirve para verificar cables, electrodos, amplificadores y pantallas de monitores multiparamétricos.
      </div>
    </div>
  );
}

// ── Conductímetro por Jack ────────────────────────────────────────────────────
function ToolConductimetro() {
  const col = C.blue;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [cond,setCond]=useState(null),[res,setRes]=useState(null);
  const [kCell,setKCell]=useState(1.0); // constante de celda (cm⁻¹)
  const [calOpen,setCalOpen]=useState(false),[calSol,setCalSol]=useState("1413");
  const [trend,setTrend]=useState([]);
  const ctxRef=useRef(),srcRef=useRef(),anlRef=useRef(),rafRef=useRef(),stRef=useRef();
  const R_REF=10000; // resistencia de referencia 10kΩ

  const start=async()=>{
    try{
      // Salida: tono 1kHz (excitación AC para evitar electrólisis)
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator(); osc.frequency.value=1000;
      const gain=ctx.createGain(); gain.gain.value=0.8;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      ctxRef.current=ctx; srcRef.current=osc;

      // Entrada: micrófono (lee voltaje a través de R_REF)
      const s=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stRef.current=s;
      const micSrc=ctx.createMediaStreamSource(s);
      const anl=ctx.createAnalyser(); anl.fftSize=4096; anl.smoothingTimeConstant=0.8;
      micSrc.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);

      const td=new Float32Array(anl.fftSize);
      const measure=()=>{
        anl.getFloatTimeDomainData(td);
        // Calcular RMS → proporcional a V_ref
        const rms=Math.sqrt(td.reduce((a,v)=>a+v*v,0)/td.length);
        if(rms>0.001){
          // V_out=0.8 (normalizado), V_ref=rms
          // R_sol = R_ref*(V_out/V_ref - 1)
          const vOut=0.8, vRef=rms;
          const rSol=R_REF*(vOut/vRef-1);
          if(rSol>0){
            const conductivity=kCell/rSol*1e6; // µS/cm → convertir a mS/cm
            const condMs=conductivity/1000;
            setRes(Math.round(rSol));
            setCond(condMs.toFixed(3));
            setTrend(h=>[...h.slice(-59),condMs]);
          }
        }
        rafRef.current=requestAnimationFrame(measure);
      };
      rafRef.current=requestAnimationFrame(measure);
    }catch(e){setErr(e.message);}
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    srcRef.current?.stop(); ctxRef.current?.close();
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false); setCond(null); setRes(null);
  };

  // Calibración con solución conocida
  const calibrate=()=>{
    const target=parseFloat(calSol)/1000; // µS/cm → mS/cm
    if(res&&res>0&&target>0){
      const newK=target*res/1e6*1000;
      setKCell(+newK.toFixed(4));
      setCalOpen(false);
    }
  };

  useEffect(()=>()=>{
    cancelAnimationFrame(rafRef.current);
    srcRef.current?.stop(); ctxRef.current?.close();
    stRef.current?.getTracks().forEach(t=>t.stop());
  },[]);

  const REFS_CAL=[
    {label:"Agua destilada",val:"2"},
    {label:"KCl 0.01M",val:"1413"},
    {label:"Agua de red típica",val:"300"},
    {label:"Suero fisiológico",val:"15000"},
    {label:"Agua mar",val:"50000"},
  ];

  const condNum=parseFloat(cond);
  const condCol=!cond?col:condNum<0.01?C.green:condNum<1?C.cyan:condNum<10?C.amber:C.red;
  const condLabel=!cond?"---":condNum<0.01?"Agua muy pura":condNum<0.5?"Agua potable":
    condNum<2?"Agua red":condNum<10?"Solución diluida":condNum<50?"Sol. biológica":"Alta conductividad";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Conductímetro — mS/cm</div>
      <DemoBanner/>
      {isDemoMode()&&!cond&&(()=>{
        useEffect(()=>{
          const t=setInterval(()=>{
            const v=DEMO_GENERATORS.conductividad();
            setCond(v.toFixed(3)); setRes(Math.round(10000/v));
            setTrend(h=>[...h.slice(-59),v]);
          },500);
          return ()=>clearInterval(t);
        },[]);
        return null;
      })()}
      {on&&<StopFAB onStop={stop} col={col}/>}

      {/* Hardware */}
      <div style={{...glass(col,0.06),borderRadius:12,padding:"12px 14px",
        border:`1px solid rgba(${rgb(col)},0.25)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:6,letterSpacing:2}}>
          MÓDULO CONDUCTÍMETRO REQUERIDO
        </div>
        {["2× electrodo de acero inox (distancia fija: 1cm)",
          "1× resistencia 10kΩ (R referencia)",
          "Conector TRRS: Tip→excitación AC · Ring2→señal",
          "Celda de medición: tubo con electrodos separados 1cm"].map((item,i)=>(
          <div key={i} style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.8}}>
            <span style={{color:col}}>▸ </span>{item}
          </div>
        ))}
      </div>

      {/* Display */}
      <div style={{...S.disp(condCol),textAlign:"center",padding:"20px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:64,fontWeight:700,color:condCol,
          lineHeight:1,textShadow:`0 0 24px ${condCol}`}}>
          {cond??"---.---"}
        </div>
        <div style={{fontFamily:MONO,fontSize:14,color:C.dim,marginTop:4}}>mS/cm</div>
        <div style={{fontFamily:MONO,fontSize:11,color:condCol,marginTop:4,fontWeight:700}}>
          {condLabel}
        </div>
        {res&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:4}}>
          R = {res} Ω · K = {kCell} cm⁻¹
        </div>}
      </div>

      {trend.length>2&&<TimeChart data={trend} col={col} unit=" mS/cm" height={70}/>}

      {/* Calibración */}
      <CalButton onOpen={()=>setCalOpen(o=>!o)} active={kCell!==1.0}/>
      {calOpen&&(
        <CalPanel title="CONDUCTÍMETRO" onClose={()=>setCalOpen(false)}
          onReset={()=>{setKCell(1.0);setCalOpen(false);}}>
          <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:10}}>
            Sumergí los electrodos en una solución de conductividad conocida y elegí cuál es:
          </div>
          {res&&<div style={{fontFamily:MONO,fontSize:11,color:C.text,marginBottom:8}}>
            Leyendo ahora: <span style={{color:col,fontWeight:700}}>{res} Ω</span>
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {REFS_CAL.map(r=>(
              <button key={r.val} style={{border:`1px solid rgba(${rgb(col)},0.3)`,borderRadius:8,
                padding:"8px 12px",cursor:"pointer",textAlign:"left",
                background:calSol===r.val?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.03)"}}
                onClick={()=>{setCalSol(r.val);calibrate();}}>
                <div style={{fontFamily:MONO,fontSize:11,color:C.text}}>{r.label}</div>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{r.val} µS/cm</div>
              </button>
            ))}
          </div>
        </CalPanel>
      )}

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>Conectar conductímetro</button>}
      <div style={S.note}>
        Medición AC a 1kHz — no causa electrólisis. Rangos: agua pura 0.001 · potable 0.05-0.5 · mar ~50 mS/cm.
        Calibrá siempre con solución de referencia conocida.
      </div>
    </div>
  );
}


// ── Medidor de Cloro — colorimétrico DPD ─────────────────────────────────────

export { ToolConductimetro, ToolECGGen, ToolPPG };
