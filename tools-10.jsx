import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, ToolIcon, glass, rgb } from "./shared-core.jsx";
import { TimeChart } from "./shared-mods.jsx";
import { StopFAB } from "./shared-app.jsx";

function ToolSpO2() {
  const col = C.red;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [spo2,setSpo2]=useState(null),[bpm,setBpm]=useState(null);
  const [phase,setPhase]=useState("idle"); // idle|measuring|ready
  const [progress,setProgress]=useState(0);
  const [sigR,setSigR]=useState([]),[sigIR,setSigIR]=useState([]);
  const stRef=useRef(),rafRef=useRef(),anlLRef=useRef(),anlRRef=useRef();

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:2}
      });
      stRef.current=s;
      const actx=new AudioContext(), src2=actx.createMediaStreamSource(s);
      const splitter=actx.createChannelSplitter(2);
      src2.connect(splitter);
      const anlL=actx.createAnalyser(); anlL.fftSize=1024; anlL.smoothingTimeConstant=0;
      const anlR=actx.createAnalyser(); anlR.fftSize=1024; anlR.smoothingTimeConstant=0;
      splitter.connect(anlL,0); splitter.connect(anlR,1);
      anlLRef.current=anlL; anlRRef.current=anlR;
      setOn(true); setPhase("measuring"); setProgress(0);
      setSpo2(null); setBpm(null); setSigR([]); setSigIR([]);
      setErr(null);

      const tdL=new Float32Array(anlL.fftSize), tdR=new Float32Array(anlR.fftSize);
      const bufR=[], bufIR=[], WINDOW=300; // ~300 muestras ≈ 6 segundos a ~50fps
      let frame=0;

      const process=()=>{
        anlL.getFloatTimeDomainData(tdL);
        anlR.getFloatTimeDomainData(tdR);
        // RMS de cada canal
        const rmsL=Math.sqrt(tdL.reduce((a,v)=>a+v*v,0)/tdL.length);
        const rmsR=Math.sqrt(tdR.reduce((a,v)=>a+v*v,0)/tdR.length);
        bufR.push(rmsL);  // Canal L = LED rojo (660nm)
        bufIR.push(rmsR); // Canal R = LED IR (940nm)
        if(bufR.length>WINDOW){bufR.shift();bufIR.shift();}
        frame++;
        setProgress(Math.min(100,Math.round(frame/WINDOW*100)));

        // Mostrar señales en gráfica
        if(frame%5===0){
          setSigR([...bufR]); setSigIR([...bufIR]);
        }

        if(bufR.length===WINDOW){
          // Calcular AC y DC de cada canal
          const mean=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
          const dcR=mean(bufR), dcIR=mean(bufIR);
          const acR=Math.sqrt(bufR.reduce((a,v)=>a+(v-dcR)**2,0)/bufR.length);
          const acIR=Math.sqrt(bufIR.reduce((a,v)=>a+(v-dcIR)**2,0)/bufIR.length);

          // Ratio R = (AC_red/DC_red) / (AC_ir/DC_ir)
          if(dcR>0.001 && dcIR>0.001 && acR>0.0001){
            const R=(acR/dcR)/(acIR/dcIR);
            // Fórmula empírica SpO2: SpO2 ≈ 110 - 25*R
            const sp=Math.min(100,Math.max(70,Math.round(110-25*R)));
            setSpo2(sp);

            // BPM desde envolvente del canal rojo
            const peaks=[];
            for(let i=2;i<bufR.length-2;i++){
              if(bufR[i]>bufR[i-1]&&bufR[i]>bufR[i-2]&&
                 bufR[i]>bufR[i+1]&&bufR[i]>bufR[i+2]&&
                 bufR[i]>dcR*1.005&&(peaks.length===0||i-peaks[peaks.length-1]>15)){
                peaks.push(i);
              }
            }
            if(peaks.length>2){
              const avgInt=peaks.slice(1).map((p,i)=>p-peaks[i]).reduce((a,b)=>a+b)/(peaks.length-1);
              setBpm(Math.round(60/(avgInt/50)));
            }
          }
          setPhase("ready");
        }
        rafRef.current=requestAnimationFrame(process);
      };
      rafRef.current=requestAnimationFrame(process);
    }catch(e){setErr("Error: "+e.message);}
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false);setPhase("idle");setSpo2(null);setBpm(null);
    setSigR([]);setSigIR([]);setProgress(0);
  };

  useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);stRef.current?.getTracks().forEach(t=>t.stop());},[]);

  const spo2Col=spo2?(spo2>=95?C.green:spo2>=90?C.amber:C.red):col;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ SpO2 — Saturación de Oxígeno</div>
      {on&&<StopFAB onStop={stop} col={col}/>}

      {/* Hardware requerido */}
      <div style={{...glass(col,0.06),borderRadius:12,padding:"12px 14px",
        border:`1px solid rgba(${rgb(col)},0.25)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:6,letterSpacing:2}}>
          MÓDULO SEM SpO2 REQUERIDO
        </div>
        {["LED rojo 660nm + LED IR 940nm","2× Fotodiodo BPW34 + amplificador TIA (LM358)",
          "Conector TRRS estéreo — L=canal rojo · R=canal IR",
          "Sonda tipo clip para dedo (imprimir en 3D)"].map((item,i)=>(
          <div key={i} style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.8}}>
            <span style={{color:col}}>▸ </span>{item}
          </div>
        ))}
      </div>

      {/* Displays SpO2 y BPM */}
      {(spo2||phase==="measuring")&&(
        <div style={{display:"flex",gap:8}}>
          <div style={{...S.disp(spo2Col),flex:2,textAlign:"center",padding:"20px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>SpO₂</div>
            <div style={{fontFamily:MONO,fontSize:52,fontWeight:700,color:spo2Col,
              textShadow:`0 0 24px ${spo2Col}`,lineHeight:1}}>
              {spo2??"--.--"}
            </div>
            <div style={{fontFamily:MONO,fontSize:12,color:C.dim}}>%</div>
            {spo2&&<div style={{fontFamily:MONO,fontSize:10,color:spo2Col,marginTop:4,fontWeight:700}}>
              {spo2>=95?"✓ Normal":spo2>=90?"⚠ Bajo":"⚠ Crítico"}
            </div>}
          </div>
          <div style={{...S.disp(C.amber),flex:1,textAlign:"center",padding:"20px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>BPM</div>
            <div style={{fontFamily:MONO,fontSize:32,fontWeight:700,color:C.amber,
              textShadow:`0 0 16px ${C.amber}`,lineHeight:1}}>
              {bpm??"-"}
            </div>
            <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginTop:4}}>pulso</div>
          </div>
        </div>
      )}

      {/* Progreso */}
      {phase==="measuring"&&!spo2&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:10,color:C.dim,marginBottom:4}}>
            <span>Analizando señal…</span><span style={{color:col}}>{progress}%</span>
          </div>
          <div style={{height:6,background:`rgba(${rgb(col)},0.15)`,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:col,borderRadius:3,transition:"width .2s"}}/>
          </div>
        </div>
      )}

      {/* Gráficas de señal */}
      {sigR.length>5&&(
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontFamily:MONO,fontSize:8,color:C.red}}>● Canal L — Rojo 660nm</div>
          <TimeChart data={sigR} col={C.red} unit="" height={50}/>
          <div style={{fontFamily:MONO,fontSize:8,color:C.violet}}>● Canal R — IR 940nm</div>
          <TimeChart data={sigIR} col={C.violet} unit="" height={50}/>
        </div>
      )}

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10,lineHeight:1.6}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>Conectar módulo SpO2</button>}
      <div style={S.note}>
        ⚠ Orientativo — no reemplaza un oxímetro certificado. Requiere módulo SEM SpO2 con sonda de dedo.
        SpO2 normal: 95-100% · Bajo: 90-94% · Crítico: &lt;90%.
      </div>
    </div>
  );
}

// ── ECG básico por Jack ───────────────────────────────────────────────────────
function ToolECG() {
  const col = C.green;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [bpm,setBpm]=useState(null),[signal,setSignal]=useState([]);
  const stRef=useRef(),anlRef=useRef(),rafRef=useRef();

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stRef.current=s;
      const ctx=new AudioContext(), src2=ctx.createMediaStreamSource(s);
      const anl=ctx.createAnalyser(); anl.fftSize=2048; anl.smoothingTimeConstant=0.1;
      src2.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null); setSignal([]); setBpm(null);
      const td=new Float32Array(anl.fftSize), buf=[];
      const process=()=>{
        anl.getFloatTimeDomainData(td);
        const avg=td.reduce((a,v)=>a+v,0)/td.length;
        buf.push(avg);
        if(buf.length>500) buf.shift();
        setSignal([...buf]);
        // Detectar picos R (QRS complex)
        if(buf.length>200){
          const peaks=[];
          const mean=buf.reduce((a,b)=>a+b)/buf.length;
          const std=Math.sqrt(buf.reduce((a,v)=>a+(v-mean)**2)/buf.length);
          for(let i=5;i<buf.length-5;i++){
            if(buf[i]>mean+std*2&&
               buf[i]>buf[i-1]&&buf[i]>buf[i-2]&&
               buf[i]>buf[i+1]&&buf[i]>buf[i+2]&&
               (peaks.length===0||i-peaks[peaks.length-1]>30)){
              peaks.push(i);
            }
          }
          if(peaks.length>2){
            const avgInt=peaks.slice(1).map((p,i2)=>p-peaks[i2]).reduce((a,b)=>a+b)/(peaks.length-1);
            setBpm(Math.round(60/(avgInt/50)));
          }
        }
        rafRef.current=requestAnimationFrame(process);
      };
      rafRef.current=requestAnimationFrame(process);
    }catch(e){setErr(e.message);}
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    setOn(false);setSignal([]);setBpm(null);
  };

  useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);stRef.current?.getTracks().forEach(t=>t.stop());},[]);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ ECG — Electrocardiograma básico</div>
      {on&&<StopFAB onStop={stop} col={col}/>}

      <div style={{...glass(col,0.06),borderRadius:12,padding:"12px 14px",
        border:`1px solid rgba(${rgb(col)},0.25)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:6,letterSpacing:2}}>
          MÓDULO SEM ECG REQUERIDO
        </div>
        {["Amplificador de instrumentación INA128 o AD8221",
          "Electrodos de superficie (adhesivos o clips)",
          "Filtro paso bajo 150Hz + filtro paso alto 0.5Hz",
          "Conector TRRS — señal diferencial al canal de micrófono"].map((item,i)=>(
          <div key={i} style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.8}}>
            <span style={{color:col}}>▸ </span>{item}
          </div>
        ))}
      </div>

      {bpm&&(
        <div style={{...S.disp(col),textAlign:"center",padding:"12px 16px"}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>FRECUENCIA CARDÍACA</div>
          <div style={{fontFamily:MONO,fontSize:48,fontWeight:700,color:col,
            textShadow:`0 0 20px ${col}`,lineHeight:1}}>{bpm}</div>
          <div style={{fontFamily:MONO,fontSize:12,color:C.dim}}>BPM</div>
        </div>
      )}

      {signal.length>5&&<TimeChart data={signal} col={col} unit="" height={100}/>}

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      {!on&&<button style={S.btn("p",col)} onClick={start}>Conectar módulo ECG</button>}
      <div style={S.note}>
        ⚠ Solo para verificación técnica de módulos — no para diagnóstico clínico.
        Requiere módulo SEM ECG con amplificador INA128 y electrodos de superficie.
      </div>
    </div>
  );
}

// ── Control Remoto IR — detector por cámara + LAN ─────────────────────────────
function ToolIR() {
  const col = C.violet;
  const vRef=useRef(), cRef=useRef(), rafRef=useRef(), stRef=useRef();
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [pulses,setPulses]=useState(0), [lastPulse,setLastPulse]=useState(null);
  const [scanning,setScanning]=useState(false), [lanDevices,setLanDevices]=useState([]);
  const prevBright=useRef(0);

  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:640}}});
      stRef.current=s; vRef.current.srcObject=s; await vRef.current.play();
      setOn(true); setErr(null);
      const c=cRef.current;
      const analyze=()=>{
        if(!vRef.current||!c) return;
        c.width=160; c.height=120; // baja resolución para velocidad
        const ctx=c.getContext("2d");
        ctx.drawImage(vRef.current,0,0,160,120);
        const data=ctx.getImageData(0,0,160,120).data;
        // Buscar pixels muy brillantes (IR LED aparece como blanco/violeta)
        let bright=0;
        for(let i=0;i<data.length;i+=4){
          if(data[i]>220&&data[i+1]>200&&data[i+2]>200) bright++;
        }
        const threshold=30;
        if(bright>threshold&&prevBright.current<=threshold){
          // Flanco ascendente: pulso detectado
          setPulses(p=>p+1);
          setLastPulse(new Date().toLocaleTimeString());
        }
        prevBright.current=bright;
        rafRef.current=requestAnimationFrame(analyze);
      };
      rafRef.current=requestAnimationFrame(analyze);
    } catch(e){ setErr("Sin cámara: "+e.message); }
  };

  const stop=()=>{
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t=>t.stop());
    if(vRef.current) vRef.current.srcObject=null;
    setOn(false);
  };

  // Scanner LAN: prueba IPs comunes de smart TVs y dispositivos IR/WiFi
  const scanLAN=async()=>{
    setScanning(true); setLanDevices([]);
    const found=[];
    // Detectar gateway estimado del celular
    const targets=[
      {ip:"192.168.1.1",   name:"Router / Gateway"},
      {ip:"192.168.0.1",   name:"Router / Gateway"},
      {ip:"192.168.1.100", name:"Posible Smart TV"},
      {ip:"192.168.1.101", name:"Posible Smart TV"},
      {ip:"192.168.0.100", name:"Posible Smart TV"},
      {ip:"192.168.1.200", name:"Broadlink RM / IR Bridge"},
    ];
    await Promise.allSettled(targets.map(async t=>{
      try{
        const ctrl=new AbortController();
        const to=setTimeout(()=>ctrl.abort(),1500);
        await fetch(`http://${t.ip}`,{mode:"no-cors",signal:ctrl.signal});
        clearTimeout(to);
        found.push({...t,ok:true});
      } catch(_e){
        // Si aborta por timeout → no responde. Si da error de red → puede estar ahí
        if(_e.name!=="AbortError") found.push({...t,ok:true,note:"posible"});
      }
    }));
    setLanDevices(found);
    setScanning(false);
  };

  useEffect(()=>()=>{ cancelAnimationFrame(rafRef.current); stRef.current?.getTracks().forEach(t=>t.stop()); },[]);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Control Remoto IR</div>

      {/* Detector IR por cámara */}
      <div style={{...S.disp(col),padding:"14px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10,letterSpacing:2}}>
          DETECTOR IR POR CÁMARA
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:12}}>
          Apuntá un control remoto a la cámara trasera y presioná un botón. La cámara detecta el destello del LED infrarrojo (invisible al ojo pero visible al sensor).
        </div>
        <div style={{position:"relative",borderRadius:8,overflow:"hidden",marginBottom:10}}>
          <video ref={vRef} style={{...S.vid,border:"none",borderRadius:0,maxHeight:150}} playsInline muted/>
          {pulses>0&&(
            <div style={{position:"absolute",top:8,right:8,background:`rgba(${rgb(col)},0.9)`,
              borderRadius:20,padding:"4px 12px",fontFamily:MONO,fontSize:12,color:"#fff",fontWeight:700}}>
              ⚡ IR detectado
            </div>
          )}
        </div>
        <canvas ref={cRef} style={{display:"none"}}/>
        <div style={S.row}>
          <div style={{...S.disp(C.red),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>PULSOS</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:C.red,textShadow:`0 0 12px ${C.red}`}}>{pulses}</div>
          </div>
          <div style={{...S.disp(col),flex:2,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>ÚLTIMO PULSO</div>
            <div style={{fontFamily:MONO,fontSize:14,fontWeight:700,color:col}}>{lastPulse||"---"}</div>
          </div>
          <button style={{...S.btn("s"),flex:.5,padding:"8px 4px",fontSize:11}}
            onClick={()=>{setPulses(0);setLastPulse(null);}}>Reset</button>
        </div>
        {!on
          ?<button style={S.btn("p",col)} onClick={start}>Activar detector IR</button>
          :<button style={S.btn("r")} onClick={stop}>Detener</button>
        }
      </div>

      {/* Scanner LAN */}
      <div style={{...S.disp(C.blue),padding:"14px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.blue,fontWeight:700,marginBottom:8,letterSpacing:2}}>
          SCANNER RED LOCAL (LAN)
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,marginBottom:10}}>
          Busca Smart TVs, IR bridges (Broadlink RM) y otros dispositivos controlables por WiFi en tu red.
        </div>
        <button style={{...S.btn("p",C.blue),opacity:scanning?.7:1}} onClick={scanning?null:scanLAN}>
          {scanning?"Escaneando red…":"🔍 Escanear dispositivos en la red"}
        </button>
        {lanDevices.length>0&&(
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
            {lanDevices.map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",
                background:"rgba(77,158,255,0.07)",borderRadius:8,border:`1px solid rgba(${rgb(C.blue)},0.2)`}}>
                <div>
                  <div style={{fontFamily:MONO,fontSize:11,color:C.text,fontWeight:700}}>{d.name}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{d.ip}{d.note?" · "+d.note:""}</div>
                </div>
                <span style={S.pill(d.ok?C.green:C.dim)}>{d.ok?"Encontrado":"?"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{...glass(C.green,0.06),borderRadius:10,padding:"12px 14px",
        border:`1px solid rgba(${rgb(C.green)},0.2)`}}>
        <div style={{fontFamily:MONO,fontSize:10,color:C.green,fontWeight:700,marginBottom:4}}>
          ¿Querés emitir señales IR?
        </div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7}}>
          El módulo SEM IR-TX (disponible en MÓDULOS) convierte este celular en un control remoto universal para TV, aires, equipos médicos y más.
        </div>
      </div>

      <div style={S.note}>
        La cámara detecta IR pero no puede decodificar el protocolo completo — para eso se necesita hardware.
        El detector sirve para verificar si un control remoto funciona sin necesitar un TV cerca.
      </div>
    </div>
  );
}
function ToolNFC() {
  const col = C.green;
  const [mode,    setMode]    = useState("read");
  const [reading, setReading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [records, setRecords] = useState([]);
  const [writeText, setWriteText] = useState("");
  const [err,     setErr]     = useState(null);
  const [history, setHistory] = useState([]);
  const readerRef = useRef(null);

  const hasNFC = "NDEFReader" in window;

  const startRead = async () => {
    if (!hasNFC) { setErr("NFC no disponible en este dispositivo o navegador"); return; }
    setReading(true); setErr(null); setRecords([]);
    try {
      const reader = new NDEFReader();
      readerRef.current = reader;
      await reader.scan();
      reader.addEventListener("reading", ({ message, serialNumber }) => {
        const recs = message.records.map(r => {
          let value = "";
          try {
            if (r.recordType === "text") {
              const dec = new TextDecoder(r.encoding || "utf-8");
              value = dec.decode(r.data);
            } else if (r.recordType === "url") {
              const dec = new TextDecoder();
              value = dec.decode(r.data);
            } else {
              value = `[${r.recordType}] ${r.data?.byteLength || 0} bytes`;
            }
          } catch(_e) { value = "No legible"; }
          return { type: r.recordType, value, mediaType: r.mediaType };
        });
        const entry = { serialNumber, records: recs, ts: new Date().toLocaleTimeString() };
        setRecords(recs);
        setHistory(h => [entry, ...h.slice(0, 9)]);
        navigator.vibrate?.(150);
      });
      reader.addEventListener("readingerror", () => setErr("Tag NFC no legible"));
    } catch(e) {
      const msg = e.message || "";
      if(msg.includes("not supported") || msg.includes("NotSupportedError")) {
        setErr("Este dispositivo no tiene hardware NFC o está desactivado en el sistema.");
        // Actualizar caps para que no vuelva a mostrarse como disponible
        try{ const c=JSON.parse(localStorage.getItem("sem_caps")||"{}"); c.nfc=false; localStorage.setItem("sem_caps",JSON.stringify(c)); }catch(_e){}
      } else {
        setErr("Error NFC: " + msg);
      }
      setReading(false);
    }
  };

  const stopRead = () => {
    readerRef.current = null;
    setReading(false); setRecords([]);
  };

  const writeTag = async () => {
    if (!hasNFC || !writeText.trim()) return;
    setWriting(true); setErr(null);
    try {
      const writer = new NDEFReader();
      await writer.write({
        records: [
          writeText.startsWith("http")
            ? { recordType: "url", data: writeText.trim() }
            : { recordType: "text", data: writeText.trim(), lang: "es" }
        ]
      });
      setErr(null);
      setWriteText("");
      navigator.vibrate?.([100, 50, 100]);
      alert("✓ Tag NFC escrito correctamente");
    } catch(e) {
      setErr("Error al escribir: " + e.message);
    }
    setWriting(false);
  };

  const isURL = s => /^https?:\/\//i.test(s);

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ NFC — Near Field Communication</div>

      {!hasNFC && (
        <div style={{ ...glass(C.amber, 0.08), borderRadius:12, padding:16,
                      border:`1px solid rgba(${rgb(C.amber)},0.3)` }}>
          <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:C.amber, marginBottom:8 }}>
            NFC no disponible en este dispositivo
          </div>
          <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
            Tu celular puede no tener hardware NFC, o el navegador no soporta Web NFC API.
            Web NFC requiere Chrome para Android 89+ con NFC habilitado.
          </div>
          <div style={{ marginTop:12, fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
            <div style={{ color:C.green, fontWeight:700, marginBottom:4 }}>Con NFC podés:</div>
            • Leer tags NFC de productos, tarjetas, equipos médicos{"\n"}
            • Escribir tags para vincular módulos SEM automáticamente{"\n"}
            • Identificar tarjetas de control de acceso{"\n"}
            • Escanear etiquetas de activos del taller
          </div>
        </div>
      )}

      {hasNFC && (
        <>
          <div style={S.row}>
            {[["read","📖 Leer tag"],["write","✍️ Escribir tag"]].map(([m,l])=>(
              <button key={m} style={{...S.btn(mode===m?"p":"s",col),flex:1,fontSize:11}}
                onClick={()=>{ setMode(m); stopRead(); setErr(null); }}>
                {l}
              </button>
            ))}
          </div>

          {mode==="read" && (
            <>
              <div style={{ ...S.disp(reading?col:C.dim), textAlign:"center", padding:"24px 16px",
                            transition:"all .3s" }}>
                <ToolIcon id="nfc" size={48} color={reading?col:C.dim} strokeWidth={1.2}
                  style={{margin:"0 auto 12px",display:"block",
                    filter:reading?`drop-shadow(0 0 12px ${col})`:"none"}}/>
                <div style={{ fontFamily:MONO, fontSize:12, color:reading?col:C.dim, fontWeight:700 }}>
                  {reading?"Acercá el tag NFC al celular…":"NFC listo para leer"}
                </div>
                {reading && (
                  <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, marginTop:8 }}>
                    Mantené el celular quieto sobre el tag
                  </div>
                )}
              </div>

              {!reading
                ? <button style={S.btn("p",col)} onClick={startRead}>Activar lector NFC</button>
                : <button style={S.btn("r")} onClick={stopRead}>Detener</button>
              }

              {records.length>0 && (
                <div style={S.res(col)}>
                  <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10}}>
                    DATOS LEÍDOS
                  </div>
                  {records.map((r,i)=>(
                    <div key={i} style={{padding:"10px 0",
                      borderBottom:i<records.length-1?`1px solid ${C.bord}`:"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={S.pill(col)}>{r.type}</span>
                        {r.mediaType&&<span style={S.pill(C.dim)}>{r.mediaType}</span>}
                      </div>
                      <div style={{fontFamily:MONO,fontSize:12,color:C.text,wordBreak:"break-all",
                        lineHeight:1.6}}>{r.value}</div>
                      {isURL(r.value)&&(
                        <a href={r.value} target="_blank" rel="noreferrer"
                          style={{fontFamily:MONO,fontSize:10,color:C.blue}}>🌐 Abrir URL</a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {history.length>0&&(
                <div style={S.res(C.dim)}>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,fontWeight:700,marginBottom:8}}>
                    HISTORIAL ({history.length} tags)
                  </div>
                  {history.map((h,i)=>(
                    <div key={i} style={{padding:"7px 0",
                      borderBottom:i<history.length-1?`1px solid ${C.bord}`:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontFamily:MONO,fontSize:10,color:C.text,fontWeight:700}}>
                          UID: {h.serialNumber||"desconocido"}
                        </span>
                        <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{h.ts}</span>
                      </div>
                      <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>
                        {h.records.map(r=>r.value).join(" · ").slice(0,60)}
                      </div>
                    </div>
                  ))}
                  <button style={{...S.btn("s"),marginTop:8,fontSize:10}}
                    onClick={()=>setHistory([])}>Borrar historial</button>
                </div>
              )}
            </>
          )}

          {mode==="write" && (
            <>
              <div style={S.note}>
                Escribí texto o URL. Si empieza con "http" se guarda como URL (link directo al abrir el tag).
                Ideal para vincular un tag NFC a la ficha del módulo SEM.
              </div>
              <textarea style={{...S.inp,minHeight:80,resize:"vertical",lineHeight:1.6}}
                placeholder='Texto libre, URL (https://...), número de serie, etc.'
                value={writeText} onChange={e=>setWriteText(e.target.value)}/>
              <button style={{...S.btn("p",col),opacity:writing||!writeText.trim()?.7:1}}
                onClick={writing||!writeText.trim()?null:writeTag}>
                {writing?"Acercá el tag NFC…":"✍️ Escribir en tag NFC"}
              </button>
              <div style={{ fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.7,
                            background:`rgba(${rgb(C.amber)},0.06)`,borderRadius:8,padding:"8px 12px",
                            border:`1px solid rgba(${rgb(C.amber)},0.2)` }}>
                ⚠ Solo tags NFC NDEF regrabables (NTAG213, NTAG215, NTAG216).
                Tags de tarjetas de crédito/débito NO son regrabables.
              </div>
            </>
          )}
        </>
      )}

      {err && <div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6,
                background:`rgba(${rgb(C.amber)},0.08)`,borderRadius:8,padding:"8px 12px"}}>{err}</div>}

      <div style={S.note}>
        NFC funciona en Chrome Android 89+. Para escribir: tags NTAG213 (~$0.50 c/u).
        Perfectos para etiquetar cada módulo SEM y vincularlos automáticamente a la app.
      </div>
    </div>
  );
}

// ── Router de herramientas ────────────────────────────────────────────────────

export { ToolECG, ToolIR, ToolNFC, ToolSpO2 };
