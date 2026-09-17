rp > 400 ? {label:"◉ Oxidante residual", col:C.amber, detail:"Verificar filtro de carbón"} :
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
