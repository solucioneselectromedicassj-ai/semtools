import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, rgb } from "./shared-core.jsx";

function ToolEndoscopio() {
  const col = C.teal || C.blue;
  const vRef=useRef(), mrRef=useRef(), chunksRef=useRef([]), timerRef=useRef();
  const [devices,   setDevices]  = useState([]);
  const [selDev,    setSelDev]   = useState(null);
  const [on,        setOn]       = useState(false);
  const [recording, setRecording]= useState(false);
  const [recTime,   setRecTime]  = useState(0);
  const [photos,    setPhotos]   = useState([]);
  const [videos,    setVideos]   = useState([]);
  const [err,       setErr]      = useState(null);
  const [torch,     setTorch]    = useState(false);
  const [torchOk,   setTorchOk] = useState(false);
  const [zoom,      setZoom]     = useState(1);
  const [zoomRange, setZoomRange]= useState(null);
  const tkRef=useRef(null);

  // Enumerar cámaras disponibles
  const refreshDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter(d => d.kind === "videoinput");
      setDevices(cams);
      // Auto-seleccionar cámara externa/USB si hay más de 1
      if (!selDev && cams.length > 0) {
        const ext = cams.find(d =>
          d.label && !d.label.toLowerCase().includes("front") &&
          !d.label.toLowerCase().includes("usuario") &&
          !d.label.toLowerCase().includes("facetime")
        );
        setSelDev((ext || cams[0]).deviceId);
      }
    } catch(e) { setErr("Sin permiso de cámara: " + e.message); }
  };

  useEffect(() => { refreshDevices(); }, []);

  const start = async () => {
    try {
      const constraints = selDev
        ? { video: { deviceId: { exact: selDev }, width:{ ideal:1920 }, height:{ ideal:1080 } } }
        : { video: { facingMode:"environment", width:{ ideal:1920 } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      vRef.current.srcObject = stream;
      await vRef.current.play();
      // Torch y zoom
      const track = stream.getVideoTracks()[0];
      tkRef.current = track;
      const caps = track.getCapabilities?.() || {};
      setTorchOk(!!caps.torch);
      if (caps.zoom) setZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
      setOn(true); setErr(null); setRecTime(0);
    } catch(e) { setErr("Error de cámara: " + e.message); }
  };

  const stop = () => {
    if (recording) stopRec();
    vRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (vRef.current) vRef.current.srcObject = null;
    tkRef.current = null;
    setOn(false); setTorch(false); setZoom(1);
  };

  const toggleTorch = async () => {
    if (!tkRef.current) return;
    const n = !torch;
    try { await tkRef.current.applyConstraints({ advanced:[{ torch:n }] }); setTorch(n); }
    catch(_e) {}
  };

  const applyZoom = async (z) => {
    if (!tkRef.current) return;
    setZoom(z);
    try { await tkRef.current.applyConstraints({ advanced:[{ zoom:z }] }); }
    catch(_e) {}
  };

  // Foto
  const takePhoto = () => {
    const v = vRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext("2d").drawImage(v, 0, 0);
    const url = c.toDataURL("image/jpeg", 0.95);
    const ts = new Date().toLocaleTimeString();
    setPhotos(p => [{ url, ts }, ...p.slice(0, 19)]);
    navigator.vibrate?.(50);
  };

  // Grabación
  const startRec = () => {
    const stream = vRef.current?.srcObject;
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const dur = recTime;
      setVideos(v => [{ url, ts: new Date().toLocaleTimeString(), dur }, ...v.slice(0, 9)]);
    };
    mr.start(200);
    mrRef.current = mr;
    setRecording(true); setRecTime(0);
    timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
  };

  const stopRec = () => {
    mrRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    vRef.current?.srcObject?.getTracks().forEach(t => t.stop());
  }, []);

  const fmtTime = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Cámara Endoscopio / USB</div>

      {/* Selector de cámara */}
      <div style={{ ...S.disp(col), padding:"12px 14px" }}>
        <div style={{ fontFamily:MONO, fontSize:9, color:col, fontWeight:700, marginBottom:8, letterSpacing:2 }}>
          SELECCIONAR CÁMARA
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {devices.map((d, i) => {
            const isExt = d.label && !d.label.toLowerCase().includes("front") &&
                          !d.label.toLowerCase().includes("usuario");
            return (
              <button key={d.deviceId} style={{
                border: selDev===d.deviceId ? `2px solid ${col}` : `1px solid ${C.bord}`,
                borderRadius:10, padding:"10px 14px",
                background: selDev===d.deviceId ? `rgba(${rgb(col)},0.12)` : "rgba(255,255,255,0.04)",
                cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left",
                boxShadow: selDev===d.deviceId ? `0 0 12px rgba(${rgb(col)},0.25)` : "none",
              }} onClick={() => { setSelDev(d.deviceId); if (on) { stop(); setTimeout(start, 200); } }}>
                <span style={{ fontSize:20 }}>{isExt ? "🔌" : i===0 ? "📷" : "🤳"}</span>
                <div>
                  <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:C.text }}>
                    {d.label || `Cámara ${i + 1}`}
                  </div>
                  {isExt && <div style={S.pill(col)}>Externa / USB</div>}
                </div>
              </button>
            );
          })}
          <button style={{ ...S.btn("s"), fontSize:10 }} onClick={refreshDevices}>
            🔄 Actualizar lista de cámaras
          </button>
        </div>
      </div>

      {/* Visor de video */}
      <div style={{ position:"relative", borderRadius:12, overflow:"hidden",
                    border:`2px solid ${recording ? C.red : `rgba(${rgb(col)},0.4)`}`,
                    boxShadow: recording ? `0 0 20px ${C.red}66` : "none",
                    transition:"all .3s", background:"#000" }}>
        <video ref={vRef} style={{ width:"100%", display:"block", maxHeight:300,
                                    objectFit:"contain", background:"#000" }}
          playsInline muted/>
        {/* Indicador REC */}
        {recording && (
          <div style={{ position:"absolute", top:10, left:12, display:"flex",
                        alignItems:"center", gap:6,
                        background:"rgba(0,0,0,0.7)", borderRadius:20, padding:"4px 12px" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.red,
                          boxShadow:`0 0 8px ${C.red}`, animation:"pulse 1s infinite" }}/>
            <span style={{ fontFamily:MONO, fontSize:12, color:C.red, fontWeight:700 }}>
              REC {fmtTime(recTime)}
            </span>
          </div>
        )}
        {!on && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                        justifyContent:"center", background:"rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily:MONO, fontSize:11, color:C.dim }}>Cámara apagada</div>
          </div>
        )}
      </div>

      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:10, lineHeight:1.6 }}>{err}</div>}

      {/* Controles principales */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <button style={{ ...S.btn(on?"r":"p", on?C.red:col), gridColumn:"1/-1" }}
          onClick={on ? stop : start}>
          {on ? "⏹ Apagar cámara" : "▶ Encender cámara"}
        </button>
        {on && (
          <>
            <button style={{ ...S.btn("p", C.violet), fontSize:12, padding:"14px 8px" }}
              onClick={takePhoto}>
              📷 Foto
            </button>
            <button style={{
              ...S.btn("p", recording ? C.red : C.orange),
              fontSize:12, padding:"14px 8px"
            }} onClick={recording ? stopRec : startRec}>
              {recording ? `⏹ Parar (${fmtTime(recTime)})` : "⏺ Grabar video"}
            </button>
            {torchOk && (
              <button style={{ ...S.btn("s"), background: torch ? C.amber : "rgba(255,255,255,0.07)",
                               color: torch ? "#000" : C.text, fontSize:11 }}
                onClick={toggleTorch}>
                🔦 {torch ? "Linterna ON" : "Linterna OFF"}
              </button>
            )}
            {zoomRange && (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>
                  ZOOM {zoom.toFixed(1)}×
                </span>
                <input type="range" min={zoomRange.min} max={zoomRange.max} step={0.1}
                  value={zoom} style={{ width:"100%" }}
                  onChange={e => applyZoom(parseFloat(e.target.value))} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Fotos capturadas */}
      {photos.length > 0 && (
        <div style={S.res(C.violet)}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.violet, fontWeight:700, marginBottom:8 }}>
            FOTOS ({photos.length})
          </div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", gap:4 }}>
                <img src={p.url} alt="foto" style={{ width:100, borderRadius:6,
                  border:`1px solid rgba(${rgb(C.violet)},0.4)` }}/>
                <div style={{ fontFamily:MONO, fontSize:8, color:C.dim, textAlign:"center" }}>{p.ts}</div>
                <a href={p.url} download={`endo_${p.ts.replace(/:/g,"-")}.jpg`}
                  style={{ fontFamily:MONO, fontSize:9, color:C.blue, textAlign:"center" }}>⬇ Guardar</a>
              </div>
            ))}
          </div>
          <button style={{ ...S.btn("s"), marginTop:8, fontSize:10 }}
            onClick={() => setPhotos([])}>Borrar fotos</button>
        </div>
      )}

      {/* Videos grabados */}
      {videos.length > 0 && (
        <div style={S.res(C.red)}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.red, fontWeight:700, marginBottom:8 }}>
            VIDEOS ({videos.length})
          </div>
          {videos.map((v, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
                                   alignItems:"center", padding:"8px 0",
                                   borderBottom: i<videos.length-1?`1px solid ${C.bord}`:"none" }}>
              <div>
                <div style={{ fontFamily:MONO, fontSize:11, color:C.text }}>
                  Video {i+1} — {fmtTime(v.dur)}
                </div>
                <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>{v.ts}</div>
              </div>
              <a href={v.url} download={`endo_video_${v.ts.replace(/:/g,"-")}.webm`}
                style={{ ...S.btn("p", C.red), width:"auto", padding:"8px 14px",
                         fontSize:11, textDecoration:"none" }}>
                ⬇ Descargar
              </a>
            </div>
          ))}
        </div>
      )}

      <div style={S.note}>
        Conectá la cámara USB/endoscopio por OTG antes de abrir la app.
        Tocá "Actualizar lista" si no aparece. Las fotos y videos se guardan en el dispositivo.
      </div>
    </div>
  );
}

// ── Lector + Generador de QR ──────────────────────────────────────────────────
function ToolQR() {
  const col = C.green;
  const vRef=useRef(), cRef=useRef(), rafRef=useRef(), stRef=useRef(), detRef=useRef(null);
  const [on,     setOn]     = useState(false);
  const [mode,   setMode]   = useState("read"); // "read" | "gen"
  const [result, setResult] = useState(null);
  const [err,    setErr]    = useState(null);
  const [found,  setFound]  = useState(false);
  const [genTxt, setGenTxt] = useState("");
  const [history,setHistory]= useState([]);
  const [copied, setCopied] = useState(false);

  // ── Iniciar cámara + detector ──────────────────────────────────────────────
  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      stRef.current = s;
      vRef.current.srcObject = s;
      await vRef.current.play();

      // BarcodeDetector nativo (Chrome Android / Chrome desktop)
      if ("BarcodeDetector" in window) {
        try {
          const fmts = await BarcodeDetector.getSupportedFormats();
          detRef.current = new BarcodeDetector({
            formats: fmts.filter(f => ["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","data_matrix","pdf417"].includes(f))
          });
        } catch(_e) {
          detRef.current = new BarcodeDetector({ formats:["qr_code"] });
        }
        setOn(true); setErr(null); setFound(false); setResult(null);
        const scan = async () => {
          if (!vRef.current || !detRef.current) return;
          try {
            const codes = await detRef.current.detect(vRef.current);
            if (codes.length > 0) {
              const c = codes[0];
              setResult(c);
              setFound(true);
              setHistory(h => [{ value:c.rawValue, format:c.format, ts:new Date().toLocaleTimeString() },
                               ...h.filter(x=>x.value!==c.rawValue).slice(0,9)]);
              // Vibrar al detectar
              navigator.vibrate?.(100);
              setTimeout(() => { setFound(false); rafRef.current = requestAnimationFrame(scan); }, 2000);
              return;
            }
          } catch(_e) {}
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } else {
        setOn(true);
        setErr("BarcodeDetector no disponible — actualizá Chrome a la versión más reciente");
      }
    } catch(e) { setErr("Sin cámara: " + e.message); }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t => t.stop());
    if (vRef.current) vRef.current.srcObject = null;
    setOn(false); setFound(false);
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false), 2000); });
  };

  const isURL = (s) => /^https?:\/\//i.test(s);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    stRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // URL del QR generado
  const qrUrl = genTxt.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(genTxt.trim())}`
    : null;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ QR / Código de Barras</div>

      {/* Tabs */}
      <div style={S.row}>
        {[["read","📷 Leer"],["gen","⚡ Generar"]].map(([m,l])=>(
          <button key={m} style={{...S.btn(mode===m?"p":"s",col),flex:1,fontSize:12}}
            onClick={()=>{ setMode(m); if(on) stop(); setResult(null); }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── MODO LEER ─────────────────────────────────────────────────────── */}
      {mode==="read" && (
        <>
          {/* Visor de cámara con overlay */}
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden",
                        border:`2px solid ${found ? C.green : `rgba(${rgb(col)},0.3)`}`,
                        transition:"border-color .3s",
                        boxShadow: found ? `0 0 20px ${C.green}88` : "none" }}>
            <video ref={vRef} style={{...S.vid, border:"none", borderRadius:0, maxHeight:260}}
              playsInline muted/>
            {/* Marco de escaneo */}
            {on && !found && (
              <div style={{ position:"absolute", inset:0, display:"flex",
                            justifyContent:"center", alignItems:"center", pointerEvents:"none" }}>
                <div style={{ width:200, height:200, position:"relative" }}>
                  {[["0","0"],["auto","0"],["0","auto"],["auto","auto"]].map(([t,l],i)=>(
                    <div key={i} style={{
                      position:"absolute",
                      top:t, bottom:t==="auto"?"0":undefined,
                      left:l, right:l==="auto"?"0":undefined,
                      width:28, height:28,
                      borderTop: t==="0"?`3px solid ${col}`:undefined,
                      borderBottom: t==="auto"?`3px solid ${col}`:undefined,
                      borderLeft: l==="0"?`3px solid ${col}`:undefined,
                      borderRight: l==="auto"?`3px solid ${col}`:undefined,
                      boxShadow:`0 0 8px ${col}66`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
            {/* Flash de detección */}
            {found && (
              <div style={{ position:"absolute", inset:0,
                            background:`rgba(${rgb(C.green)},0.2)`,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontFamily:MONO, fontSize:32,
                              filter:`drop-shadow(0 0 12px ${C.green})` }}>✓</div>
              </div>
            )}
          </div>
          <canvas ref={cRef} style={{ display:"none" }}/>

          {err && <div style={{ color:C.amber, fontFamily:MONO, fontSize:10, lineHeight:1.7,
                                background:`rgba(${rgb(C.amber)},0.08)`, borderRadius:8, padding:"8px 12px" }}>{err}</div>}

          <div style={S.row}>
            {!on
              ? <button style={{...S.btn("p",col),flex:1}} onClick={start}>Activar escáner</button>
              : <button style={{...S.btn("r"),flex:1}} onClick={stop}>Detener</button>
            }
          </div>

          {/* Resultado */}
          {result && (
            <div style={{...S.disp(C.green), display:"flex", flexDirection:"column", gap:10}}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={S.pill(col)}>{result.format?.replace("_"," ").toUpperCase()}</span>
                <span style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>{new Date().toLocaleTimeString()}</span>
              </div>
              <div style={{ fontFamily:MONO, fontSize:13, color:C.text, wordBreak:"break-all",
                            lineHeight:1.6 }}>{result.rawValue}</div>
              <div style={S.row}>
                <button style={{...S.btn("p",col),flex:1,fontSize:11}}
                  onClick={()=>copy(result.rawValue)}>
                  {copied?"✓ Copiado":"📋 Copiar"}
                </button>
                {isURL(result.rawValue) && (
                  <a href={result.rawValue} target="_blank" rel="noreferrer"
                    style={{...S.btn("p",C.blue),flex:1,fontSize:11,textDecoration:"none",
                            textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    🌐 Abrir
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Historial */}
          {history.length>0 && (
            <div style={S.res(col)}>
              <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:8}}>
                HISTORIAL ({history.length})
              </div>
              {history.map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"7px 0",borderBottom:i<history.length-1?`1px solid ${C.bord}`:"none"}}>
                  <span style={S.pill(col)}>{h.format?.replace("_"," ")}</span>
                  <div style={{flex:1,fontFamily:MONO,fontSize:10,color:C.text,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.value}</div>
                  <button style={{border:"none",background:"none",color:C.blue,
                    fontFamily:MONO,fontSize:10,cursor:"pointer",flexShrink:0}}
                    onClick={()=>copy(h.value)}>📋</button>
                </div>
              ))}
              <button style={{...S.btn("s"),marginTop:8,fontSize:10}}
                onClick={()=>setHistory([])}>Borrar historial</button>
            </div>
          )}

          <div style={S.note}>
            Detecta QR, EAN-13, Code 128, Code 39, UPC y más. Vibra al detectar.
            Requiere Chrome actualizado.
          </div>
        </>
      )}

      {/* ── MODO GENERAR ──────────────────────────────────────────────────── */}
      {mode==="gen" && (
        <>
          <div style={S.note}>Escribí el texto, URL o dato que querés convertir en QR.</div>
          <textarea
            style={{...S.inp, minHeight:90, resize:"vertical", lineHeight:1.6}}
            placeholder="Texto, URL, número de teléfono, email..."
            value={genTxt}
            onChange={e=>setGenTxt(e.target.value)}
          />
          {qrUrl && (
            <div style={{...S.disp(col), display:"flex", flexDirection:"column",
                         alignItems:"center", gap:12, padding:20}}>
              <img src={qrUrl} alt="QR generado"
                style={{width:220,height:220,borderRadius:8,background:"#fff",padding:8}}/>
              <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",
                wordBreak:"break-all"}}>{genTxt.slice(0,60)}{genTxt.length>60?"…":""}</div>
              <div style={S.row}>
                <button style={{...S.btn("p",col),flex:1,fontSize:11}}
                  onClick={()=>copy(genTxt)}>📋 Copiar texto</button>
                <a href={qrUrl} download="qr-semtools.png" target="_blank" rel="noreferrer"
                  style={{...S.btn("p",C.blue),flex:1,fontSize:11,textDecoration:"none",
                          textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ⬇ Guardar QR
                </a>
              </div>
            </div>
          )}
          {!qrUrl && (
            <div style={{...S.disp(col),display:"flex",alignItems:"center",justifyContent:"center",
              minHeight:120,opacity:.4}}>
              <div style={{fontFamily:MONO,fontSize:12,color:C.dim}}>El QR aparece mientras escribís</div>
            </div>
          )}
          <div style={S.note}>El QR se genera al instante. Podés guardarlo como imagen.</div>
        </>
      )}
    </div>
  );
}


// ── SpO2 por Jack Estéreo ─────────────────────────────────────────────────────

export { ToolEndoscopio, ToolQR };
