import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, rgb } from "./shared-core.jsx";

function ToolPing() {
  const col = C.cyan;
  const [running,  setRunning]  = useState(false);
  const [pings,    setPings]    = useState([]); // [{ms, ts, lost}]
  const [target,   setTarget]   = useState("https://www.google.com/favicon.ico");
  const [interval, setInterval2]= useState(2);  // segundos
  const [stats,    setStats]    = useState(null);
  const timerRef = useRef(null), cRef = useRef(null);

  const doPing = async (url) => {
    const t0 = performance.now();
    try {
      await fetch(url + "?t=" + Date.now(), { mode:"no-cors", cache:"no-store" });
      const ms = Math.round(performance.now() - t0);
      return { ms, lost: false };
    } catch(_e) {
      return { ms: null, lost: true };
    }
  };

  const start = () => {
    setRunning(true); setPings([]); setStats(null);
    const run = async () => {
      const r = await doPing(target);
      const ts = new Date().toLocaleTimeString();
      setPings(prev => {
        const next = [...prev.slice(-59), { ...r, ts }];
        // Calcular stats
        const valid = next.filter(p => !p.lost).map(p => p.ms);
        const lost  = next.filter(p => p.lost).length;
        if (valid.length > 0) {
          setStats({
            avg:  Math.round(valid.reduce((a,b)=>a+b,0)/valid.length),
            min:  Math.min(...valid),
            max:  Math.max(...valid),
            loss: Math.round(lost/next.length*100),
            last: r.ms,
            lastLost: r.lost,
            count: next.length,
          });
        }
        return next;
      });
    };
    run();
    timerRef.current = setInterval(run, interval * 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    setRunning(false);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Dibujar gráfico
  useEffect(() => {
    const c = cRef.current; if (!c || pings.length < 2) return;
    const ctx = c.getContext("2d"), W = c.width, H = c.height;
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H);
    const valid = pings.filter(p=>!p.lost).map(p=>p.ms);
    if (!valid.length) return;
    const mx = Math.max(...valid, 200);
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    [0.25,0.5,0.75].forEach(f => {
      ctx.beginPath(); ctx.moveTo(0,H*f); ctx.lineTo(W,H*f); ctx.stroke();
    });
    // Labels ms
    ctx.fillStyle = C.dim; ctx.font = "9px monospace";
    ctx.fillText(mx+"ms", 4, 12);
    ctx.fillText("0", 4, H-4);
    // Línea
    const sw = W / Math.max(pings.length-1, 1);
    ctx.beginPath();
    pings.forEach((p,i) => {
      const x = i * sw;
      const y = p.lost ? H : H - (p.ms/mx)*(H-16) - 8;
      const col2 = p.lost ? C.red : p.ms > 300 ? C.amber : p.ms > 100 ? C.cyan : C.green;
      ctx.strokeStyle = col2; ctx.lineWidth = 2;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(x,y);
      // Punto
      ctx.fillStyle = col2;
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x,y);
    });
  }, [pings]);

  const pingCol = stats ? (stats.lastLost ? C.red : stats.last > 300 ? C.amber : stats.last > 100 ? C.cyan : C.green) : col;

  const TARGETS = [
    ["Google",      "https://www.google.com/favicon.ico"],
    ["Cloudflare",  "https://1.1.1.1/favicon.ico"],
    ["Gateway",     "http://192.168.1.1"],
    ["SEM Server",  "https://semtools.vercel.app"],
  ];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Ping — Latencia en tiempo real</div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {TARGETS.map(([label,url]) => (
          <button key={label} style={{
            border: target===url?`2px solid ${col}`:`1px solid ${C.bord}`,
            borderRadius:8, padding:"6px 12px", background: target===url?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)",
            cursor:"pointer", fontFamily:MONO, fontSize:10, color: target===url?col:C.dim,
          }} onClick={()=>setTarget(url)}>{label}</button>
        ))}
      </div>

      <div style={S.row}>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim,alignSelf:"center",whiteSpace:"nowrap"}}>Intervalo:</span>
        {[1,2,5].map(s=>(
          <button key={s} style={{
            border:interval===s?`2px solid ${col}`:`1px solid ${C.bord}`,
            borderRadius:8,padding:"6px 14px",background:interval===s?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)",
            cursor:"pointer",fontFamily:MONO,fontSize:11,color:interval===s?col:C.dim,
          }} onClick={()=>setInterval2(s)}>{s}s</button>
        ))}
      </div>

      {/* Display principal */}
      <div style={{...S.disp(pingCol),display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:MONO,fontSize:52,fontWeight:700,color:pingCol,
            lineHeight:1,textShadow:`0 0 24px ${pingCol}`}}>
            {stats ? (stats.lastLost ? "---" : stats.last) : "---"}
          </div>
          <div style={{fontFamily:MONO,fontSize:12,color:C.dim}}>ms</div>
          <div style={S.dlbl}>{stats?.lastLost ? "⚠ TIMEOUT" : "LATENCIA"}</div>
        </div>
        {stats && (
          <div style={{display:"flex",flexDirection:"column",gap:8,textAlign:"right"}}>
            {[["MÍN", stats.min, C.green],["AVG", stats.avg, col],["MÁX", stats.max, C.red]].map(([l,v,c])=>(
              <div key={l}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{l}</div>
                <div style={{fontFamily:MONO,fontSize:18,fontWeight:700,color:c,textShadow:`0 0 10px ${c}`}}>{v} ms</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loss */}
      {stats && (
        <div style={{display:"flex",gap:8}}>
          <div style={{...S.disp(stats.loss>0?C.red:C.green),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>PACKET LOSS</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,
              color:stats.loss>0?C.red:C.green,textShadow:`0 0 12px ${stats.loss>0?C.red:C.green}`}}>
              {stats.loss}%
            </div>
          </div>
          <div style={{...S.disp(col),flex:1,textAlign:"center",padding:"10px 8px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>MUESTRAS</div>
            <div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:col}}>{stats.count}</div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <canvas ref={cRef} width={640} height={120}
        style={{width:"100%",borderRadius:10,border:`1px solid rgba(${rgb(col)},0.25)`,background:"#000"}}/>

      {!running
        ? <button style={S.btn("p",col)} onClick={start}>▶ Iniciar ping continuo</button>
        : <button style={S.btn("r")} onClick={stop}>⏹ Detener</button>
      }
      <div style={S.note}>Mide latencia real hacia el destino. Verde &lt;100ms · Amarillo &lt;300ms · Rojo &gt;300ms o timeout.</div>
    </div>
  );
}

// ── Escáner LAN completo ──────────────────────────────────────────────────────
function ToolLANScanner() {
  const col = C.blue;
  const [scanning,  setScanning]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [devices,   setDevices]   = useState([]);
  const [subnet,    setSubnet]    = useState("192.168.1");
  const [range,     setRange]     = useState([1,30]);
  const stopRef = useRef(false);

  const scan = async () => {
    setScanning(true); setDevices([]); setProgress(0); stopRef.current = false;
    const total = range[1] - range[0] + 1;
    let done = 0;
    const found = [];
    const BATCH = 8; // requests paralelos
    const ips = Array.from({length:total},(_,i)=>range[0]+i);

    for (let i=0; i<ips.length; i+=BATCH) {
      if (stopRef.current) break;
      const batch = ips.slice(i, i+BATCH);
      await Promise.allSettled(batch.map(async n => {
        const ip = `${subnet}.${n}`;
        const t0 = performance.now();
        try {
          const ctrl = new AbortController();
          const to = setTimeout(()=>ctrl.abort(), 1200);
          await fetch(`http://${ip}`, { mode:"no-cors", cache:"no-store", signal:ctrl.signal });
          clearTimeout(to);
          const ms = Math.round(performance.now()-t0);
          found.push({ ip, ms, status:"activo" });
          setDevices([...found].sort((a,b)=>a.ip.localeCompare(b.ip)));
        } catch(e) {
          if (e.name!=="AbortError") {
            // Responde con error de red (CORS) = está ahí pero no HTTP
            found.push({ ip, ms:Math.round(performance.now()-t0), status:"detectado" });
            setDevices([...found].sort((a,b)=>a.ip.localeCompare(b.ip)));
          }
        }
        done++;
        setProgress(Math.round(done/total*100));
      }));
    }
    setScanning(false);
  };

  const guessDevice = (ip) => {
    const last = parseInt(ip.split(".").pop());
    if (last===1||last===254) return { icon:"📡", label:"Router / Gateway" };
    if (last>=100&&last<=120) return { icon:"📺", label:"Posible Smart TV" };
    if (last>=200) return { icon:"🖨", label:"Posible impresora" };
    return { icon:"📱", label:"Dispositivo red" };
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Escáner LAN — Red local</div>

      <div style={S.row}>
        <div style={{flex:2}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>SUBRED</div>
          <input style={{...S.inp,fontSize:12}} value={subnet}
            onChange={e=>setSubnet(e.target.value)} placeholder="192.168.1"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>DESDE</div>
          <input style={{...S.inp,fontSize:12}} type="number" value={range[0]}
            onChange={e=>setRange([+e.target.value,range[1]])}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>HASTA</div>
          <input style={{...S.inp,fontSize:12}} type="number" value={range[1]}
            onChange={e=>setRange([range[0],+e.target.value])}/>
        </div>
      </div>

      {/* Presets rápidos */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["Home /24","192.168.1",1,30],["Rango amplio","192.168.1",1,100],
          ["192.168.0.x","192.168.0",1,30],["10.0.0.x","10.0.0",1,30]].map(([l,s,f,t])=>(
          <button key={l} style={{border:`1px solid ${C.bord}`,borderRadius:8,padding:"5px 10px",
            background:"rgba(255,255,255,0.04)",cursor:"pointer",fontFamily:MONO,fontSize:9,color:C.dim}}
            onClick={()=>{setSubnet(s);setRange([f,t]);}}>
            {l}
          </button>
        ))}
      </div>

      {scanning && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,fontSize:10,color:C.dim,marginBottom:6}}>
            <span>Escaneando {subnet}.{range[0]}–{range[1]}…</span>
            <span style={{color:col}}>{progress}%</span>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:col,
              boxShadow:`0 0 8px ${col}`,borderRadius:3,transition:"width .2s"}}/>
          </div>
        </div>
      )}

      {devices.length>0 && (
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10}}>
            {devices.length} DISPOSITIVO{devices.length>1?"S":""} ENCONTRADO{devices.length>1?"S":""}
          </div>
          {devices.map((d,i)=>{
            const g=guessDevice(d.ip);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                padding:"10px 0",borderBottom:i<devices.length-1?`1px solid ${C.bord}`:"none"}}>
                <span style={{fontSize:20}}>{g.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:C.text}}>{d.ip}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{g.label}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={S.pill(d.status==="activo"?C.green:C.amber)}>{d.status}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:3}}>{d.ms}ms</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={S.row}>
        {!scanning
          ? <button style={{...S.btn("p",col),flex:1}} onClick={scan}>🔍 Escanear red</button>
          : <button style={{...S.btn("r"),flex:1}} onClick={()=>stopRef.current=true}>⏹ Detener</button>
        }
      </div>
      <div style={S.note}>Detecta dispositivos activos en la red local. Útil para encontrar módulos SEM, routers, Smart TVs y cámaras IP.</div>
    </div>
  );
}

// ── HTTP Tester ───────────────────────────────────────────────────────────────
function ToolHTTPTester() {
  const col = C.violet;
  const [url,     setUrl]     = useState("http://192.168.1.1");
  const [method,  setMethod]  = useState("GET");
  const [body,    setBody]    = useState("");
  const [headers, setHeaders] = useState("Content-Type: application/json");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [history, setHistory] = useState([]);

  const send = async () => {
    setLoading(true); setResult(null);
    const t0 = performance.now();
    try {
      const hdrs = {};
      headers.split("\n").forEach(h => {
        const [k,...v]=h.split(":"); if(k.trim()) hdrs[k.trim()]=v.join(":").trim();
      });
      const opts = { method, headers:hdrs, mode:"cors", cache:"no-store" };
      if(method!=="GET"&&method!=="HEAD"&&body) opts.body=body;
      const r = await fetch(url, opts);
      const ms = Math.round(performance.now()-t0);
      let text="";
      try{ text=await r.text(); }catch(_e){}
      const res = { ok:r.ok, status:r.status, statusText:r.statusText,
                    ms, body:text.slice(0,2000), url };
      setResult(res);
      setHistory(h=>[res,...h.slice(0,9)]);
    } catch(e) {
      const ms=Math.round(performance.now()-t0);
      const res={ ok:false, status:0, statusText:e.message, ms, body:"", url };
      setResult(res);
      setHistory(h=>[res,...h.slice(0,9)]);
    }
    setLoading(false);
  };

  const PRESETS=[
    ["Router",       "GET",  "http://192.168.1.1",""],
    ["SEM módulo",   "GET",  "http://192.168.1.200/status",""],
    ["API local",    "GET",  "http://192.168.1.200/api/read",""],
    ["POST JSON",    "POST", "http://192.168.1.200/api/cmd",'{"cmd":"on"}'],
  ];

  const statusCol = result ? (result.ok?C.green:result.status===0?C.dim:C.amber) : col;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ HTTP Tester — API REST local</div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {PRESETS.map(([l,m,u,b])=>(
          <button key={l} style={{border:`1px solid ${C.bord}`,borderRadius:8,padding:"5px 10px",
            background:"rgba(255,255,255,0.04)",cursor:"pointer",fontFamily:MONO,fontSize:9,color:C.dim}}
            onClick={()=>{setMethod(m);setUrl(u);if(b)setBody(b);}}>
            {l}
          </button>
        ))}
      </div>

      <div style={S.row}>
        <select style={{...S.sel,flex:"0 0 80px"}} value={method} onChange={e=>setMethod(e.target.value)}>
          {["GET","POST","PUT","PATCH","DELETE","HEAD"].map(m=><option key={m}>{m}</option>)}
        </select>
        <input style={{...S.inp,flex:1}} value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://..."/>
      </div>

      <div>
        <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>HEADERS (uno por línea)</div>
        <textarea style={{...S.inp,minHeight:60,resize:"vertical",lineHeight:1.6}}
          value={headers} onChange={e=>setHeaders(e.target.value)}/>
      </div>

      {(method==="POST"||method==="PUT"||method==="PATCH")&&(
        <div>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>BODY</div>
          <textarea style={{...S.inp,minHeight:80,resize:"vertical",lineHeight:1.6,fontFamily:MONO}}
            value={body} onChange={e=>setBody(e.target.value)} placeholder='{"key":"value"}'/>
        </div>
      )}

      <button style={{...S.btn("p",col),opacity:loading?.7:1}} onClick={loading?null:send}>
        {loading?"Enviando…":`${method} → Enviar`}
      </button>

      {result&&(
        <div style={{...S.disp(statusCol),padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={S.pill(statusCol)}>
              {result.status||"ERR"} {result.statusText}
            </div>
            <div style={{fontFamily:MONO,fontSize:11,color:C.dim}}>{result.ms}ms</div>
          </div>
          {result.body&&(
            <pre style={{fontFamily:MONO,fontSize:10,color:C.text,
              whiteSpace:"pre-wrap",wordBreak:"break-all",
              maxHeight:200,overflowY:"auto",margin:0,lineHeight:1.7}}>
              {result.body}
            </pre>
          )}
        </div>
      )}

      {history.length>0&&(
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:8}}>HISTORIAL</div>
          {history.map((h,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",
              borderBottom:i<history.length-1?`1px solid ${C.bord}`:"none",cursor:"pointer"}}
              onClick={()=>setUrl(h.url)}>
              <div style={S.pill(h.ok?C.green:C.red)}>{h.status||"ERR"}</div>
              <div style={{flex:1,fontFamily:MONO,fontSize:10,color:C.dim,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.url}</div>
              <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{h.ms}ms</div>
            </div>
          ))}
        </div>
      )}
      <div style={S.note}>Enviá requests HTTP a routers, módulos IoT, APIs locales y Smart TVs. Útil para probar y desarrollar módulos SEM.</div>
    </div>
  );
}

// ── BLE Scanner ───────────────────────────────────────────────────────────────
function ToolBLEScanner() {
  const col = C.violet;
  const [devices,  setDevices]  = useState([]);
  const [scanning, setScanning] = useState(false);
  const [err,      setErr]      = useState(null);
  const [selected, setSelected] = useState(null);

  const scan = async () => {
    if (!navigator.bluetooth) {
      setErr("Web Bluetooth no disponible. Requiere Chrome con flag #enable-web-bluetooth activado.");
      return;
    }
    setScanning(true); setErr(null);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "battery_service","device_information","generic_access",
          "heart_rate","health_thermometer",
          "00001800-0000-1000-8000-00805f9b34fb",
          "00001801-0000-1000-8000-00805f9b34fb",
        ]
      });
      const info = {
        id:   device.id,
        name: device.name || "Dispositivo sin nombre",
        ts:   new Date().toLocaleTimeString(),
      };
      // Intentar conectar para leer servicios
      try {
        const server   = await device.gatt.connect();
        const services = await server.getPrimaryServices();
        info.services  = services.map(s => s.uuid).slice(0,5);
        info.connected = true;
        setSelected(info);
        await server.disconnect();
      } catch(_e) {
        info.connected = false;
        info.services  = [];
      }
      setDevices(prev => [info, ...prev.filter(d=>d.id!==info.id)]);
    } catch(e) {
      if (e.name !== "NotFoundError") setErr("Error BLE: " + e.message);
    }
    setScanning(false);
  };

  const BLE_SERVICES = {
    "0000180f-0000-1000-8000-00805f9b34fb": "🔋 Batería",
    "0000180a-0000-1000-8000-00805f9b34fb": "ℹ️ Info dispositivo",
    "0000180d-0000-1000-8000-00805f9b34fb": "❤️ Frecuencia cardíaca",
    "00001809-0000-1000-8000-00805f9b34fb": "🌡 Termómetro",
    "00001800-0000-1000-8000-00805f9b34fb": "📡 Generic Access",
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Scanner BLE — Bluetooth Low Energy</div>

      <div style={{...S.disp(col),padding:"12px 16px"}}>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8}}>
          Detecta dispositivos BLE cercanos: auriculares, smartwatches, módulos SEM, sensores médicos, ESP32, Arduino BLE.
          Cada escaneo detecta un dispositivo — repetí para agregar más.
        </div>
      </div>

      {err&&<div style={{color:C.amber,fontFamily:MONO,fontSize:10,lineHeight:1.6,
        background:`rgba(${rgb(C.amber)},0.08)`,borderRadius:8,padding:"8px 12px"}}>{err}</div>}

      <button style={{...S.btn("p",col),opacity:scanning?.7:1}} onClick={scanning?null:scan}>
        {scanning?"Buscando dispositivo BLE…":"📡 Buscar dispositivo BLE"}
      </button>

      {devices.length>0&&(
        <div style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,marginBottom:10}}>
            {devices.length} DISPOSITIVO{devices.length>1?"S":""} BLE
          </div>
          {devices.map((d,i)=>(
            <div key={i} style={{padding:"12px 0",
              borderBottom:i<devices.length-1?`1px solid ${C.bord}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:20}}>📡</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:C.text}}>{d.name}</div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{d.ts}</div>
                </div>
                <div style={S.pill(d.connected?C.green:C.dim)}>
                  {d.connected?"Conectado":"Sin conexión GATT"}
                </div>
              </div>
              {d.services?.length>0&&(
                <div style={{paddingLeft:28}}>
                  {d.services.map((s,j)=>(
                    <div key={j} style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.8}}>
                      {BLE_SERVICES[s]||"• "+s.slice(0,8)+"…"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button style={{...S.btn("s"),marginTop:8,fontSize:10}}
            onClick={()=>setDevices([])}>Borrar lista</button>
        </div>
      )}

      <div style={S.note}>Requiere Chrome. El sistema muestra el selector de dispositivos — elegís el que querés detectar. Ideal para identificar módulos SEM Bluetooth.</div>
    </div>
  );
}

// ── Info pública: IP, ISP, ubicación ─────────────────────────────────────────
function ToolIPInfo() {
  const col = C.green;
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch2 = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://ipapi.co/json/");
      const d = await r.json();
      setInfo(d);
    } catch(e) {
      try {
        const r2 = await fetch("https://api.ipify.org?format=json");
        const d2 = await r2.json();
        setInfo({ ip: d2.ip, org:"No disponible", city:"No disponible", country_name:"No disponible" });
      } catch(_e2) { setInfo({error:"Sin conexión"}); }
    }
    setLoading(false);
  };

  useEffect(() => { fetch2(); }, []);

  const rows = info && !info.error ? [
    ["IP Pública",   info.ip,           C.cyan],
    ["ISP / Org",    info.org,          C.text],
    ["Ciudad",       info.city,         C.text],
    ["País",         info.country_name, C.text],
    ["Región",       info.region,       C.dim],
    ["Timezone",     info.timezone,     C.dim],
    ["ASN",          info.asn,          C.dim],
  ] : [];

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ IP Pública e ISP</div>

      {loading&&<div style={{...S.disp(col),textAlign:"center",padding:20}}>
        <div style={{fontFamily:MONO,fontSize:12,color:col}}>Consultando…</div>
      </div>}

      {info?.error&&<div style={{color:C.red,fontFamily:MONO,fontSize:11}}>{info.error}</div>}

      {info&&!info.error&&(
        <>
          <div style={{...S.disp(col),padding:"16px 18px"}}>
            <div style={{fontFamily:MONO,fontSize:9,color:col,marginBottom:6,letterSpacing:2}}>IP PÚBLICA</div>
            <div style={{fontFamily:MONO,fontSize:36,fontWeight:700,color:col,
              textShadow:`0 0 20px ${col}`,letterSpacing:1}}>{info.ip}</div>
          </div>
          <div style={S.res(col)}>
            {rows.map(([k,v,c])=>v&&(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                padding:"8px 0",borderBottom:`1px solid ${C.bord}`}}>
                <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{k}</span>
                <span style={{fontFamily:MONO,fontSize:10,color:c||C.text,fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button style={S.btn("s")} onClick={fetch2}>🔄 Actualizar</button>
      <div style={S.note}>Muestra tu IP pública real y el proveedor de internet. Útil para configurar acceso remoto a módulos.</div>
    </div>
  );
}

// ── Red / Internet ────────────────────────────────────────────────────────────
function ToolRed() {
  const col = C.blue;
  const [info, setInfo]   = useState(null);
  const [speed, setSpeed] = useState(null);
  const [ping, setPing]   = useState(null);
  const [testing, setTesting] = useState(false);
  const [err, setErr]     = useState(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || null;
    setInfo({
      type:        conn?.effectiveType || "desconocido",
      downlink:    conn?.downlink || null,
      rtt:         conn?.rtt || null,
      saveData:    conn?.saveData || false,
    });
  }, []);

  const runTest = async () => {
    setTesting(true); setSpeed(null); setPing(null); setErr(null);
    try {
      // Ping
      const p0 = performance.now();
      await fetch("https://www.gstatic.com/generate_204", { mode:"no-cors", cache:"no-store" });
      const pingMs = Math.round(performance.now() - p0);
      setPing(pingMs);

      // Download speed (10MB from Cloudflare)
      const t0 = performance.now();
      const res = await fetch("https://speed.cloudflare.com/__down?bytes=5000000", { cache:"no-store" });
      const blob = await res.blob();
      const secs = (performance.now() - t0) / 1000;
      const mbps = ((blob.size * 8) / secs / 1e6).toFixed(1);
      setSpeed(mbps);
    } catch(e) {
      setErr("No se pudo completar el test: " + e.message);
    }
    setTesting(false);
  };

  const typeCol = { "4g":C.green, "3g":C.amber, "2g":C.red, "slow-2g":C.red }[info?.type] || C.dim;

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Red e Internet</div>

      {/* Tipo de conexión */}
      {info && (
        <div style={{ ...S.disp(typeCol), display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <span style={{ ...S.dval(typeCol, 40) }}>{info.type.toUpperCase()}</span>
            <div style={S.dlbl}>TIPO DE CONEXIÓN</div>
          </div>
          <div style={{ textAlign:"right" }}>
            {info.downlink && <div style={{ fontFamily:MONO, fontSize:14, color:col, fontWeight:700 }}>{info.downlink} Mbps</div>}
            {info.rtt && <div style={{ fontFamily:MONO, fontSize:11, color:C.dim }}>RTT: {info.rtt} ms</div>}
            {info.saveData && <div style={S.pill(C.amber)}>Datos reducidos</div>}
          </div>
        </div>
      )}

      {/* Resultados del test */}
      {(ping !== null || speed !== null) && (
        <div style={S.row}>
          {ping !== null && (
            <div style={{ ...S.disp(ping < 50 ? C.green : ping < 150 ? C.amber : C.red), flex:1, textAlign:"center" }}>
              <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700,
                            color: ping < 50 ? C.green : ping < 150 ? C.amber : C.red,
                            textShadow:`0 0 12px ${ping<50?C.green:C.amber}` }}>{ping}</div>
              <div style={S.dlbl}>PING (ms)</div>
            </div>
          )}
          {speed !== null && (
            <div style={{ ...S.disp(C.cyan), flex:1, textAlign:"center" }}>
              <div style={{ fontFamily:MONO, fontSize:28, fontWeight:700, color:C.cyan, textShadow:`0 0 12px ${C.cyan}` }}>{speed}</div>
              <div style={S.dlbl}>BAJADA (Mbps)</div>
            </div>
          )}
        </div>
      )}

      {err && <div style={{ color:C.red, fontFamily:MONO, fontSize:11, lineHeight:1.6 }}>{err}</div>}

      <button style={{ ...S.btn("p", col), opacity: testing ? 0.7 : 1 }}
        onClick={testing ? null : runTest}>
        {testing ? "Midiendo… (puede tardar 10s)" : "▶ Medir velocidad"}
      </button>

      <div style={S.note}>
        Mide la velocidad de bajada real y el ping hacia servidores externos.
        Para medir la señal WiFi usá la barra de estado del sistema.
      </div>
    </div>
  );
}

export { ToolBLEScanner, ToolHTTPTester, ToolIPInfo, ToolLANScanner, ToolPing, ToolRed };
