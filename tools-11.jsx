import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, rgb } from "./shared-core.jsx";
import { CameraView, askClaude } from "./shared-api.jsx";

// ── Lupa — cámara con zoom digital, linterna y congelar imagen ───────────────
function ToolLupa() {
  const col = C.amber;
  const vRef=useRef(), cRef=useRef(), tkRef=useRef(null);
  const [on,setOn]=useState(false), [err,setErr]=useState(null);
  const [torch,setTorch]=useState(false), [torchOk,setTorchOk]=useState(false);
  const [zoom,setZoom]=useState(1), [contrast,setContrast]=useState(false);
  const [frozen,setFrozen]=useState(null);

  const stop=useCallback(async()=>{
    if(tkRef.current){
      try{ await tkRef.current.applyConstraints({advanced:[{torch:false}]}); }catch(_e){}
    }
    vRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    if(vRef.current) vRef.current.srcObject=null;
    tkRef.current=null; setOn(false); setTorch(false); setFrozen(null); setZoom(1);
  },[]);

  const start=useCallback(async()=>{
    try{
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
    catch(_e){ setErr("Linterna no disponible en este dispositivo"); }
  };

  const toggleFreeze=()=>{
    if(frozen){ setFrozen(null); return; }
    const v=vRef.current,c=cRef.current; if(!v||!c) return;
    c.width=v.videoWidth||640; c.height=v.videoHeight||480;
    const ctx=c.getContext("2d");
    if(contrast) ctx.filter="contrast(1.6) brightness(1.1)";
    ctx.drawImage(v,0,0);
    setFrozen(c.toDataURL("image/jpeg",0.92));
  };

  useEffect(()=>()=>stop(),[stop]);

  const visualFilter = contrast ? "contrast(1.6) brightness(1.1)" : "none";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Lupa</div>

      <div style={{position:"relative",borderRadius:10,overflow:"hidden",border:`1px solid ${C.bord}`,background:"#000"}}>
        {frozen
          ? <img src={frozen} alt="Imagen congelada" style={{width:"100%",display:"block",maxHeight:400,objectFit:"contain"}}/>
          : <video ref={vRef} style={{...S.vid,border:"none",borderRadius:0,maxHeight:400,
              transform:`scale(${zoom})`,transformOrigin:"center",transition:"transform .1s",filter:visualFilter}}
              playsInline muted/>
        }
        {frozen && <div style={{position:"absolute",top:8,left:8,...S.pill(col)}}>❄ Congelada</div>}
      </div>
      <canvas ref={cRef} style={{display:"none"}}/>

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{err}</div>}

      {on && !frozen && (
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:MONO,fontSize:10,color:C.dim,whiteSpace:"nowrap"}}>Zoom {zoom.toFixed(1)}×</span>
          <input type="range" min={1} max={6} step={0.1} value={zoom}
            style={{flex:1,accentColor:col}} onChange={e=>setZoom(+e.target.value)}/>
        </div>
      )}

      <div style={S.row}>
        <button style={{...S.btn(on?"s":"p",col),flex:1}} onClick={()=>on?stop():start()}>
          {on?"Apagar cámara":"🔍 Activar lupa"}
        </button>
        {on && (
          <button style={{...S.btn(frozen?"p":"s", frozen?C.green:col),flex:1}} onClick={toggleFreeze}>
            {frozen?"▶ Reanudar":"❄ Congelar"}
          </button>
        )}
      </div>

      {on && (
        <div style={S.row}>
          {torchOk && (
            <button style={{...S.btn("s"),flex:1,background:torch?C.amber:"rgba(255,255,255,0.07)",
              color:torch?"#000":C.text}} onClick={toggleTorch}>
              🔦 {torch?"Linterna ON":"Linterna OFF"}
            </button>
          )}
          <button style={{...S.btn("s"),flex:1,background:contrast?`rgba(${rgb(col)},0.2)`:"rgba(255,255,255,0.07)",
            color:contrast?col:C.text,border:contrast?`1px solid ${col}`:`1px solid ${C.bord}`}}
            onClick={()=>setContrast(c=>!c)}>
            ◐ {contrast?"Alto contraste ON":"Alto contraste OFF"}
          </button>
        </div>
      )}

      <div style={S.note}>
        Zoom digital — a mayor zoom, menor nitidez (es una limitación de la cámara, no de la app).
        Usá "Congelar" para sostener la imagen quieta y leer sin que te tiemble el pulso.
        Alto contraste ayuda a leer marcados gastados o con poco relieve.
      </div>
    </div>
  );
}

// ── Escáner de Texto — cámara + IA transcribe texto literal ──────────────────
function ToolOCR() {
  const col = C.green;
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const [photo,setPhoto]=useState(null), [copied,setCopied]=useState(false);

  const analyze = async b64 => {
    setLoading(true); setResult(null); setCopied(false);
    setPhoto("data:image/jpeg;base64,"+b64);
    try{
      const text = await askClaude(b64,
        "Transcribí EXACTAMENTE todo el texto visible en esta imagen (etiqueta, placa, serie, modelo, código de equipo, etc.), tal cual aparece, línea por línea, respetando mayúsculas/minúsculas y símbolos. " +
        "No interpretes, no corrijas errores de tipeo ni completes información faltante — copialo literal. " +
        "Si hay varios bloques de texto separados (ej. distintas etiquetas), separalos con una línea '---'. " +
        "Si algún carácter no se distingue con certeza, usá ? en su lugar. " +
        "Si no hay texto legible en la imagen, respondé exactamente: SIN TEXTO");
      setResult(text);
    } catch(e){ setResult(e.message==="NO_KEY"?"🔑 Configurá tu API key de Gemini (botón 🔑 arriba)":e.message==="INVALID_KEY"?"🔑 API key inválida — tocá 🔑 para reconfigurar":"⚠ "+e.message); }
    setLoading(false);
  };

  const copy = () => {
    if(!result) return;
    navigator.clipboard?.writeText(result).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Escáner de Texto</div>
      <CameraView captureLabel={loading?"Transcribiendo…":"📷 Escanear texto"} onCapture={loading?null:analyze}/>
      {photo && (
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <img src={photo} alt="Foto enviada a la IA" style={{width:92,borderRadius:8,border:`1px solid rgba(${rgb(col)},0.3)`,flexShrink:0}}/>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.7}}>
            Enfocá bien la etiqueta o placa, de frente y sin reflejos, para que la transcripción sea exacta.
          </div>
        </div>
      )}
      {result&&<div style={S.res(col)}>
        <pre style={{fontFamily:MONO,fontSize:12,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.8}}>{result}</pre>
      </div>}
      {result && !/^🔑|^⚠/.test(result) && (
        <button style={S.btn("p",col)} onClick={copy}>{copied?"✓ Copiado":"📋 Copiar texto"}</button>
      )}
      <div style={S.note}>
        Transcribe texto literal (series, modelos, códigos de equipo) — no interpreta ni identifica el componente.
        Para identificar un integrado por su marking usá "Integrados IC".
      </div>
    </div>
  );
}

export { ToolLupa, ToolOCR };
