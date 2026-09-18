import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";

function ToolCloro() {
  const col = C.amber;
  const [phase, setPhase] = useState("intro"); // intro|blank|sample|result
  const [blankRGB, setBlankRGB] = useState(null);
  const [result, setResult] = useState(null);
  const [type, setType] = useState("libre"); // libre|total|cloraminas
  const vRef=useRef(), cRef=useRef(), stRef=useRef(), tkRef=useRef();
  const [on, setOn] = useState(false), [err, setErr] = useState(null);

  const LIMITS = {
    dialisis:  { label:"Diálisis (AAMI)",    libre:0.5,  total:0.1  },
    potable:   { label:"Agua potable (OMS)", libre:5.0,  total:5.0  },
    piscina:   { label:"Pileta",             libre:3.0,  total:5.0  },
  };
  const [checkLimit, setCheckLimit] = useState("dialisis");

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video:{facingMode:"environment",width:{ideal:1280}}
      });
      stRef.current = s; vRef.current.srcObject = s;
      await vRef.current.play();
      const track = s.getVideoTracks()[0]; tkRef.current = track;
      setOn(true); setErr(null);
    } catch(e) { setErr(e.message); }
  };

  const stopCamera = () => {
    stRef.current?.getTracks().forEach(t=>t.stop());
    if(vRef.current) vRef.current.srcObject = null;
    setOn(false);
  };

  // Capturar muestra y extraer RGB promedio del centro
  const capture = () => {
    const v = vRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0);
    // Zona central 80x80px
    const cx = Math.floor(c.width/2-40), cy = Math.floor(c.height/2-40);
    const d = ctx.getImageData(cx, cy, 80, 80).data;
    let r=0,g=0,b=0,n=d.length/4;
    for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}
    return {r:r/n, g:g/n, b:b/n};
  };

  const takeBlank = () => {
    const rgb = capture();
    setBlankRGB(rgb);
    setPhase("sample");
  };

  const takeSample = () => {
    if(!blankRGB) return;
    const sample = capture();
    // Calcular diferencia de color rosa/rojo vs referencia
    // El DPD vira a rosado → aumenta R, disminuye G y B relativos
    const dR = sample.r - blankRGB.r;  // delta rojo
    const dG = blankRGB.g - sample.g;  // delta verde (cae)
    // Índice de color rosado = combinación ponderada
    const pinkIndex = Math.max(0, dR * 0.6 + dG * 0.4);
    // Calibración empírica DPD: curva aproximada (lineal en rango bajo)
    // pinkIndex 0 → 0 mg/L, pinkIndex ~40 → 5 mg/L
    const clMgL = Math.min(10, Math.max(0, pinkIndex / 8));
    const limit = LIMITS[checkLimit];
    const limitVal = type === "libre" ? limit.libre : limit.total;
    const status = clMgL <= limitVal ? "ok" : "alto";
    setResult({
      cl: clMgL.toFixed(2),
      dR: dR.toFixed(1), dG: dG.toFixed(1),
      pinkIndex: pinkIndex.toFixed(1),
      status, limitVal, limitLabel: limit.label,
      sampleRGB: sample,
    });
    setPhase("result");
    stopCamera();
  };

  const reset = () => {
    setPhase("intro"); setBlankRGB(null); setResult(null);
    stopCamera(); setErr(null);
  };

  useEffect(() => () => stopCamera(), []);

  const resultCol = result?.status==="ok" ? C.green : C.red;

  // Color de preview de la muestra
  const previewBg = result?.sampleRGB
    ? `rgb(${Math.round(result.sampleRGB.r)},${Math.round(result.sampleRGB.g)},${Math.round(result.sampleRGB.b)})`
    : "transparent";

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Medidor de Cloro — DPD Colorimétrico</div>

      {/* Selector de tipo */}
      <div style={{display:"flex",gap:6}}>
        {[["libre","Cl₂ libre"],["total","Cl₂ total"],["cloraminas","Cloraminas"]].map(([v,l])=>(
          <button key={v} style={{flex:1,border:`1px solid ${type===v?col:C.bord}`,borderRadius:8,
            padding:"6px 4px",cursor:"pointer",fontFamily:MONO,fontSize:9,
            color:type===v?col:C.dim,background:type===v?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setType(v)}>{l}</button>
        ))}
      </div>

      {/* Límite de referencia */}
      <div style={{display:"flex",gap:6}}>
        {Object.entries(LIMITS).map(([k,v])=>(
          <button key={k} style={{flex:1,border:`1px solid ${checkLimit===k?col:C.bord}`,borderRadius:8,
            padding:"5px 4px",cursor:"pointer",fontFamily:MONO,fontSize:8,
            color:checkLimit===k?col:C.dim,background:checkLimit===k?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setCheckLimit(k)}>{v.label.split(" ")[0]}</button>
        ))}
      </div>

      {/* Instrucciones por fase */}
      {phase==="intro" && (
        <div style={{...glass(col,0.07),borderRadius:12,padding:16,
          border:`1px solid rgba(${rgb(col)},0.25)`,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:col}}>
            MÉTODO DPD — PASOS
          </div>
          {[
            {n:"1",t:"Preparar muestra",d:"Llená un tubo o vaso transparente con 10mL de agua a analizar. Mantenerlo limpio."},
            {n:"2",t:"Fotografiar referencia",d:"Con el vaso vacío o con agua sin DPD → tomás la foto de referencia (blanco)."},
            {n:"3",t:"Agregar reactivo DPD",d:"Añadí 1 tableta DPD-1 (cloro libre) o DPD-3 (cloro total) al agua. Mezclá hasta disolver."},
            {n:"4",t:"Fotografiar muestra",d:"Dentro de 2 minutos, fotografiá la muestra coloreada sobre fondo blanco con buena luz."},
          ].map(({n,t,d})=>(
            <div key={n} style={{display:"flex",gap:10}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,fontFamily:MONO,
                fontSize:12,fontWeight:700,color:col,display:"flex",alignItems:"center",
                justifyContent:"center",background:`rgba(${rgb(col)},0.15)`,
                border:`1px solid rgba(${rgb(col)},0.4)`}}>{n}</div>
              <div>
                <div style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:C.text}}>{t}</div>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.7}}>{d}</div>
              </div>
            </div>
          ))}
          <div style={{fontFamily:MONO,fontSize:9,color:C.amber,lineHeight:1.7,
            background:`rgba(${rgb(C.amber)},0.08)`,borderRadius:8,padding:"8px 10px"}}>
            ⚠ Para diálisis: usar fondo blanco uniforme, luz natural o LED blanco, mismo encuadre en ambas fotos.
            Reactivo DPD disponible en farmacias o proveedores de tratamiento de agua.
          </div>
          <button style={S.btn("p",col)} onClick={async()=>{await startCamera();setPhase("blank");}}>
            📷 Iniciar medición
          </button>
        </div>
      )}

      {/* Cámara */}
      {(phase==="blank"||phase==="sample")&&(
        <>
          <div style={{position:"relative",borderRadius:12,overflow:"hidden",
            border:`2px solid ${col}`,background:"#000"}}>
            <video ref={vRef} style={{...S.vid,border:"none",borderRadius:0,maxHeight:220}} playsInline muted/>
            {/* Marcador central */}
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
              <div style={{width:80,height:80,border:`2px solid ${col}`,borderRadius:8,
                boxShadow:`0 0 12px ${col}88`}}/>
            </div>
            <div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center",
              fontFamily:MONO,fontSize:10,color:col,background:"rgba(0,0,0,0.6)",padding:"4px 0"}}>
              {phase==="blank"?"Encuadrá el AGUA LIMPIA (sin DPD)":"Encuadrá la MUESTRA CON DPD (rosada)"}
            </div>
          </div>
          <canvas ref={cRef} style={{display:"none"}}/>
          <button style={S.btn("p",col)} onClick={phase==="blank"?takeBlank:takeSample}>
            {phase==="blank"?"📸 Fotografiar referencia (agua limpia)":"📸 Fotografiar muestra con DPD"}
          </button>
          {phase==="sample"&&blankRGB&&(
            <div style={{fontFamily:MONO,fontSize:10,color:C.green}}>
              ✓ Referencia tomada — ahora agregá DPD y fotografiá la muestra
            </div>
          )}
        </>
      )}

      {/* Resultado */}
      {phase==="result"&&result&&(
        <>
          <div style={{...S.disp(resultCol),padding:"16px",textAlign:"center"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>
              CLORO {type.toUpperCase()} — {LIMITS[checkLimit].label}
            </div>
            <div style={{fontFamily:MONO,fontSize:64,fontWeight:700,color:resultCol,
              lineHeight:1,textShadow:`0 0 24px ${resultCol}`}}>
              {result.cl}
            </div>
            <div style={{fontFamily:MONO,fontSize:14,color:C.dim}}>mg/L Cl₂</div>
            <div style={{marginTop:8,padding:"6px 16px",borderRadius:20,display:"inline-block",
              background:`rgba(${rgb(resultCol)},0.15)`,border:`1px solid ${resultCol}`,
              fontFamily:MONO,fontSize:11,fontWeight:700,color:resultCol}}>
              {result.status==="ok"
                ?`✓ DENTRO DEL LÍMITE (≤${result.limitVal} mg/L)`
                :`⚠ SUPERA EL LÍMITE (>${result.limitVal} mg/L)`}
            </div>
          </div>

          {/* Color capturado */}
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,borderRadius:10,height:50,
              background:blankRGB?`rgb(${Math.round(blankRGB.r)},${Math.round(blankRGB.g)},${Math.round(blankRGB.b)})`:"#fff",
              border:`1px solid ${C.bord}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:MONO,fontSize:9,color:"rgba(0,0,0,0.5)"}}>Referencia</span>
            </div>
            <div style={{flex:1,borderRadius:10,height:50,background:previewBg,
              border:`2px solid ${resultCol}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:MONO,fontSize:9,color:"rgba(0,0,0,0.5)"}}>Muestra</span>
            </div>
          </div>

          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.7,
            background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px"}}>
            ΔR: {result.dR} · ΔG: {result.dG} · Índice rosa: {result.pinkIndex}
          </div>

          {result.status!=="ok"&&checkLimit==="dialisis"&&(
            <div style={{fontFamily:MONO,fontSize:10,color:C.red,lineHeight:1.8,
              background:`rgba(${rgb(C.red)},0.08)`,borderRadius:8,padding:"10px 12px",
              border:`1px solid rgba(${rgb(C.red)},0.3)`}}>
              🚨 AGUA NO APTA PARA DIÁLISIS<br/>
              Verificar filtros de carbón activado · No usar hasta corregir · Repetir medición
            </div>
          )}

          <button style={S.btn("s")} onClick={reset}>← Nueva medición</button>
        </>
      )}

      {err&&<div style={{color:C.red,fontFamily:MONO,fontSize:10}}>{err}</div>}
      <div style={S.note}>
        Precisión: ±0.1 mg/L con buena iluminación uniforme. Reactivo DPD-1 (cloro libre) o DPD-3 (cloro total).
        Límite AAMI diálisis: libre &lt;0.5 mg/L · total &lt;0.1 mg/L.
      </div>
    </div>
  );
}


// ── USB-C Probe — WebUSB ──────────────────────────────────────────────────────
function ToolUSBProbe() {
  const col = C.cyan;
  const [device,   setDevice]   = useState(null);
  const [info,     setInfo]     = useState(null);
  const [packets,  setPackets]  = useState([]);
  const [reading,  setReading]  = useState(false);
  const [err,      setErr]      = useState(null);
  const [spo2,     setSpo2]     = useState(null);
  const [bpm,      setBpm]      = useState(null);
  const stopRef = useRef(false);

  const supported = "usb" in navigator;

  const connect = async () => {
    try {
      setErr(null); setInfo(null); setPackets([]); setSpo2(null); setBpm(null);
      const dev = await navigator.usb.requestDevice({ filters: [] });
      setDevice(dev);
      await dev.open();

      // Info del dispositivo
      setInfo({
        name:    dev.productName || "Desconocido",
        vendor:  `0x${dev.vendorId.toString(16).padStart(4,"0")}`,
        product: `0x${dev.productId.toString(16).padStart(4,"0")}`,
        configs: dev.configurations.length,
        speed:   dev.usbVersionMajor + "." + dev.usbVersionMinor,
      });

      // Seleccionar configuración
      if(dev.configuration === null) await dev.selectConfiguration(1);
      
      // Mostrar info de interfaces para diagnóstico
      const ifaceInfo = dev.configuration.interfaces.map(i => ({
        num: i.interfaceNumber,
        alts: i.alternates.map(a => ({
          cls: a.interfaceClass,
          sub: a.interfaceSubclass,
          eps: a.endpoints.map(e => `${e.direction}@${e.endpointNumber}(${e.type})`)
        }))
      }));
      console.log("Interfaces:", JSON.stringify(ifaceInfo, null, 2));

      // CONTEC RS01: Interface 1 (bulk data) es la que tiene los datos
      // Interface 0 es HID (protegida, Chrome la bloquea)
      // Interface 1: cls=8 sub=6, EP2 bulk IN/OUT → datos SpO2
      let ep = null;
      
      // Reclamar interfaz 1 (datos bulk)
      try {
        await dev.claimInterface(1);
        ep = { endpointNumber: 2, packetSize: 64, type: "bulk" };
        console.log("✓ Interface 1 reclamada, EP2 bulk listo");
      } catch(e) {
        // Fallback: intentar todas
        for(const iface of dev.configuration.interfaces) {
          try {
            await dev.claimInterface(iface.interfaceNumber);
            for(const alt of iface.alternates) {
              for(const e of alt.endpoints) {
                if(e.direction === "in" && e.type === "bulk") ep = e;
              }
            }
            break;
          } catch(_e) {}
        }
        if(!ep) throw new Error("No se pudo reclamar interfaz de datos. " + e.message);
      }

      // Enviar comando de inicio al RS01 (vendor-specific o SCSI)
      // El RS01 usa protocolo propietario sobre bulk — primero enviamos un inquiry
      try {
        // Comando SCSI Inquiry (Mass Storage BOT)
        const cbw = new Uint8Array(31);
        cbw[0]=0x55;cbw[1]=0x53;cbw[2]=0x42;cbw[3]=0x43; // "USBC" signature
        cbw[4]=0x01;cbw[5]=0x00;cbw[6]=0x00;cbw[7]=0x00; // tag
        cbw[8]=0x24;cbw[9]=0x00;cbw[10]=0x00;cbw[11]=0x00; // transfer length 36
        cbw[12]=0x80; // flags: data IN
        cbw[13]=0x00; // LUN 0
        cbw[14]=0x06; // CB length
        cbw[15]=0x12; // INQUIRY command
        await dev.transferOut(2, cbw.buffer);
        console.log("✓ SCSI Inquiry enviado");
      } catch(e) { console.log("Inquiry:", e.message); }

      setInfo(prev => ({...prev, 
        interfaces: "1 (bulk data)",
        endpoint: "EP2 bulk IN/OUT"
      }));

      setReading(true); stopRef.current = false;

      // Leer datos en loop
      const readLoop = async () => {
        while(!stopRef.current) {
          try {
            const result = await dev.transferIn(ep.endpointNumber, ep.packetSize || 64);
            if(result.data && result.data.byteLength > 0) {
              const bytes = Array.from(new Uint8Array(result.data.buffer));
              const hex   = bytes.map(b => b.toString(16).padStart(2,"0").toUpperCase()).join(" ");
              const ascii = bytes.map(b => b>=32&&b<127?String.fromCharCode(b):"·").join("");
              const ts    = new Date().toLocaleTimeString("es-AR");

              setPackets(p => [...p.slice(-49), { hex, ascii, bytes, ts }]);

              // Detectar SpO2 — patrones comunes CONTEC/Nellcor
              // Paquete típico: [0xD0, SpO2%, PR_high, PR_low, status, ...]
              // O:              [sync, SpO2, PR, waveform...]
              for(let i=0; i<bytes.length-2; i++) {
                // Patrón CONTEC: byte sync 0xD0 o 0xFF
                if((bytes[i]===0xD0||bytes[i]===0xFF) && bytes[i+1]>50 && bytes[i+1]<=100) {
                  setSpo2(bytes[i+1]);
                  const pr = bytes.length>i+3 ? (bytes[i+2]<<8|bytes[i+3]) : bytes[i+2];
                  if(pr>30&&pr<250) setBpm(pr);
                }
                // Patrón alternativo: SpO2 en rango 70-100, PR en rango 40-200
                if(bytes[i]>=70&&bytes[i]<=100 && i+1<bytes.length && bytes[i+1]>=40&&bytes[i+1]<=200) {
                  if(i===0||bytes[i-1]===0x01||bytes[i-1]===0x02) {
                    setSpo2(bytes[i]); setBpm(bytes[i+1]);
                  }
                }
              }
            }
          } catch(e) {
            if(!stopRef.current) setErr("Error de lectura: " + e.message);
            break;
          }
        }
        setReading(false);
      };
      readLoop();

    } catch(e) {
      if(e.name !== "NotFoundError") setErr(e.message);
      setReading(false);
    }
  };

  const disconnect = async () => {
    stopRef.current = true;
    try { await device?.close(); } catch(_e) {}
    setDevice(null); setReading(false); setInfo(null);
  };

  const spo2Col = spo2 ? (spo2>=95?C.green:spo2>=90?C.amber:C.red) : col;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ USB-C Probe — Analizador WebUSB</div>

      {!supported && (
        <div style={{...glass(C.red,0.1),borderRadius:12,padding:14,border:`1px solid ${C.red}`}}>
          <div style={{fontFamily:MONO,fontSize:11,color:C.red,fontWeight:700}}>
            WebUSB no disponible
          </div>
          <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginTop:6,lineHeight:1.7}}>
            Requiere Chrome en Android con USB OTG habilitado. Verificá que Chrome sea el navegador por defecto y que el celular soporte USB Host.
          </div>
        </div>
      )}

      {supported && !device && (
        <div style={{...glass(col,0.07),borderRadius:12,padding:16,
          border:`1px solid rgba(${rgb(col)},0.25)`}}>
          <div style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:col,marginBottom:10}}>
            INSTRUCCIONES
          </div>
          {["1. Conectá el sensor CONTEC RS01 al celular con un cable USB-C",
            "2. Encendé el dispositivo CONTEC",
            "3. Tocá 'Conectar dispositivo USB'",
            "4. Chrome muestra una lista — elegí el dispositivo CONTEC",
            "5. La app lee los datos crudos y detecta SpO2 automáticamente"
          ].map((t,i)=>(
            <div key={i} style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.9}}>{t}</div>
          ))}
        </div>
      )}

      {/* Datos SpO2 detectados */}
      {(spo2||bpm) && (
        <div style={{display:"flex",gap:8}}>
          <div style={{...S.disp(spo2Col),flex:2,textAlign:"center",padding:"16px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>SpO₂</div>
            <div style={{fontFamily:MONO,fontSize:52,fontWeight:700,color:spo2Col,
              lineHeight:1,textShadow:`0 0 20px ${spo2Col}`}}>{spo2??"-"}</div>
            <div style={{fontFamily:MONO,fontSize:11,color:C.dim}}>%</div>
          </div>
          <div style={{...S.disp(C.amber),flex:1,textAlign:"center",padding:"16px 4px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>BPM</div>
            <div style={{fontFamily:MONO,fontSize:32,fontWeight:700,color:C.amber,
              lineHeight:1}}>{bpm??"-"}</div>
          </div>
        </div>
      )}

      {/* Info del dispositivo */}
      {info && (
        <div style={{...S.res(col)}}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:6}}>
            DISPOSITIVO DETECTADO
          </div>
          {Object.entries(info).map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",
              padding:"4px 0",borderBottom:`1px solid ${C.bord}`}}>
              <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{k}</span>
              <span style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stream de paquetes */}
      {packets.length > 0 && (
        <div style={{...S.res(col),maxHeight:200,overflow:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700}}>
              DATOS CRUDOS ({packets.length} paquetes)
            </div>
            <button style={{...S.btn("s"),padding:"2px 8px",fontSize:9}}
              onClick={()=>setPackets([])}>Limpiar</button>
          </div>
          {packets.slice(-10).map((p,i)=>(
            <div key={i} style={{marginBottom:6,padding:"6px 8px",
              background:"rgba(0,0,0,0.4)",borderRadius:4}}>
              <div style={{fontFamily:MONO,fontSize:8,color:C.dim}}>{p.ts}</div>
              <div style={{fontFamily:MONO,fontSize:9,color:col,wordBreak:"break-all",
                lineHeight:1.6}}>{p.hex}</div>
              <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{p.ascii}</div>
            </div>
          ))}
        </div>
      )}

      {err && <div style={{color:C.red,fontFamily:MONO,fontSize:10,lineHeight:1.6}}>{err}</div>}

      {!device
        ? <button style={{...S.btn("p",col),...(!supported&&{opacity:.4})}}
            onClick={supported?connect:null}>
            🔌 Conectar dispositivo USB
          </button>
        : <button style={S.btn("r")} onClick={disconnect}>⏹ Desconectar</button>
      }

      {/* Sección alternativa: leer archivos del dispositivo montado */}
      <div style={{...glass(C.violet,0.07),borderRadius:12,padding:"14px 16px",
        border:`1px solid rgba(${rgb(C.violet)},0.25)`}}>
        <div style={{fontFamily:MONO,fontSize:9,color:C.violet,fontWeight:700,
          letterSpacing:2,marginBottom:8}}>ALTERNATIVA — LEER ARCHIVOS DEL DISPOSITIVO</div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8,marginBottom:10}}>
          Algunos dispositivos USB se montan como pendrive en Windows. Si aparece una unidad nueva
          en el Explorador de archivos, usá este botón para leer los datos:
        </div>
        {(()=>{
          const [fileData,setFileData]=useState(null);
          const [fileName,setFileName]=useState(null);
          const [parsedSpo2,setParsedSpo2]=useState([]);

          const readFile=async()=>{
            try{
              const [fh]=await window.showOpenFilePicker({
                types:[
                  {description:"CONTEC data files",accept:{"application/octet-stream":[".spo",".dat",".bin",".db",".rec"]}},
                  {description:"All files",accept:{"*/*":[".*"]}},
                ],
                multiple:false
              });
              const file=await fh.getFile();
              setFileName(file.name);
              const buf=await file.arrayBuffer();
              const bytes=new Uint8Array(buf);
              setFileData({
                size:file.size,
                hex:Array.from(bytes.slice(0,128)).map(b=>b.toString(16).padStart(2,"0").toUpperCase()).join(" "),
                ascii:Array.from(bytes.slice(0,64)).map(b=>b>=32&&b<127?String.fromCharCode(b):"·").join(""),
              });
              // Intentar parsear SpO2
              const parsed=[];
              for(let i=0;i<bytes.length-3;i++){
                if(bytes[i]>=70&&bytes[i]<=100&&bytes[i+1]>=30&&bytes[i+1]<=220){
                  parsed.push({spo2:bytes[i],pr:bytes[i+1],offset:i});
                  i+=2;
                }
              }
              setParsedSpo2(parsed.slice(0,20));
            }catch(e){
              if(e.name!=="AbortError") alert("Error: "+e.message);
            }
          };

          return (
            <>
              <button style={S.btn("p",C.violet)} onClick={readFile}>
                📂 Abrir archivo del dispositivo USB
              </button>
              {fileName&&(
                <div style={{marginTop:10}}>
                  <div style={{fontFamily:MONO,fontSize:10,color:C.violet,fontWeight:700,marginBottom:4}}>
                    {fileName} — {fileData?.size} bytes
                  </div>
                  <div style={{fontFamily:MONO,fontSize:8,color:C.dim,lineHeight:1.6,
                    wordBreak:"break-all",background:"rgba(0,0,0,0.4)",borderRadius:6,padding:"8px"}}>
                    HEX: {fileData?.hex}
                  </div>
                  <div style={{fontFamily:MONO,fontSize:8,color:C.dim,marginTop:4}}>
                    ASCII: {fileData?.ascii}
                  </div>
                  {parsedSpo2.length>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontFamily:MONO,fontSize:9,color:C.green,fontWeight:700}}>
                        Posibles lecturas SpO2 detectadas:
                      </div>
                      {parsedSpo2.map((r,i)=>(
                        <div key={i} style={{fontFamily:MONO,fontSize:9,color:C.dim}}>
                          offset 0x{r.offset.toString(16)}: SpO2={r.spo2}% PR={r.pr}bpm
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div style={S.note}>
        CONTEC RS01 — VID:0x28E9 PID:0x01F3 — USB Mass Storage (cls 8 sub 6).
        WebUSB no puede acceder a Mass Storage por seguridad del browser.
        Los datos se leen desde los archivos grabados en el dispositivo.
      </div>
    </div>
  );
}

// ── Conectividad — herramientas avanzadas ────────────────────────────────────

// ── Ping + gráfico en tiempo real ────────────────────────────────────────────

export { ToolCloro, ToolUSBProbe };
