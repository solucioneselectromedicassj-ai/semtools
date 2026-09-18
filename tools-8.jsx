import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";
import { ModuleActivateButton, detectBrand } from "./shared-mods.jsx";
import { InfoRow, SENSOR_LIST, SENSOR_STATUS, detectAccelerometer, detectAmbientLight, detectBluetooth, detectGeolocation, detectGyroscope, detectMagnetometer, detectMicrophone } from "./tools-7.jsx";

function ToolDispositivo() {
  const col = C.blue;
  const [info,     setInfo]     = useState({ brand:null, cores:null, ram:null, storage:null, battery:null });
  const [sensors,  setSensors]  = useState({
    accelerometer:"checking", gyroscope:"checking", magnetometer:"checking",
    ambientlight:"checking", geolocation:"checking", microphone:"checking", bluetooth:"checking",
  });
  const [scanning, setScanning] = useState(true);
  const [liveAccel,setLiveAccel]= useState({x:0,y:0,z:0});
  const [liveMag,  setLiveMag]  = useState({value:null, real:false});
  const [liveLight,setLiveLight]= useState(null);

  const refreshInfo = useCallback(() => {
    const brandInfo = detectBrand();
    setInfo(prev => ({ ...prev, brand:brandInfo, cores:navigator.hardwareConcurrency||null, ram:navigator.deviceMemory||null }));

    navigator.storage?.estimate?.().then(e => {
      const used = e.usage||0, quota = e.quota||0;
      setInfo(prev => ({ ...prev, storage:{
        usedMB:(used/1e6).toFixed(1), quotaMB:(quota/1e6).toFixed(0),
        pct: quota>0 ? Math.round(used/quota*100) : 0,
      }}));
    }).catch(()=>{});

    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const update = () => setInfo(prev => ({ ...prev, battery:{
          level:Math.round(b.level*100), charging:b.charging,
          dischargingTime:b.dischargingTime, chargingTime:b.chargingTime,
        }}));
        update();
        b.onlevelchange = update;
        b.onchargingchange = update;
      }).catch(() => setInfo(prev => ({ ...prev, battery:"unsupported" })));
    } else {
      setInfo(prev => ({ ...prev, battery:"unsupported" }));
    }
  }, []);

  useEffect(() => { refreshInfo(); }, [refreshInfo]);

  useEffect(() => {
    let cancelled = false;
    setScanning(true);
    (async () => {
      const results = {};
      results.accelerometer = await detectAccelerometer();
      results.gyroscope     = await detectGyroscope();
      results.magnetometer  = await detectMagnetometer();
      results.ambientlight  = await detectAmbientLight();
      results.geolocation   = await detectGeolocation();
      results.microphone    = await detectMicrophone();
      results.bluetooth     = await detectBluetooth();
      if (!cancelled) { setSensors(results); setScanning(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Valores en vivo — acelerómetro (cada 500ms)
  useEffect(() => {
    if (sensors.accelerometer !== "ok") return;
    const ref = {x:0,y:0,z:0};
    const h = e => { const ag = e.accelerationIncludingGravity; if (ag) { ref.x=ag.x; ref.y=ag.y; ref.z=ag.z; } };
    window.addEventListener("devicemotion", h, true);
    const t = setInterval(() => setLiveAccel({...ref}), 500);
    return () => { window.removeEventListener("devicemotion", h, true); clearInterval(t); };
  }, [sensors.accelerometer]);

  // Valores en vivo — magnetómetro con fallback a DeviceOrientation (cada 500ms)
  useEffect(() => {
    if (sensors.magnetometer !== "ok") return;
    let usingReal = false, sensorObj = null;
    const state = { value:null };
    if ("Magnetometer" in window) {
      try {
        sensorObj = new window.Magnetometer({ frequency:5 });
        sensorObj.addEventListener("reading", () => { state.value = Math.sqrt(sensorObj.x**2+sensorObj.y**2+sensorObj.z**2); });
        sensorObj.start();
        usingReal = true;
      } catch(_e) { usingReal = false; sensorObj = null; }
    }
    const h = e => { if (!usingReal && e.alpha != null) state.value = e.alpha; };
    if (!usingReal) window.addEventListener("deviceorientation", h, true);
    const t = setInterval(() => setLiveMag({ value:state.value, real:usingReal }), 500);
    return () => {
      clearInterval(t);
      if (sensorObj) { try { sensorObj.stop(); } catch(_e){} }
      if (!usingReal) window.removeEventListener("deviceorientation", h, true);
    };
  }, [sensors.magnetometer]);

  // Valores en vivo — luz ambiental (cada 500ms)
  useEffect(() => {
    if (sensors.ambientlight !== "ok") return;
    let sensorObj = null;
    try { sensorObj = new window.AmbientLightSensor({ frequency:2 }); sensorObj.start(); } catch(_e) { sensorObj = null; }
    if (!sensorObj) return;
    const t = setInterval(() => setLiveLight(sensorObj.illuminance ?? null), 500);
    return () => { clearInterval(t); try { sensorObj.stop(); } catch(_e){} };
  }, [sensors.ambientlight]);

  const jackOk  = sensors.microphone === "ok" && (info.brand?.hasJackGuess ?? true);
  const magOk   = sensors.magnetometer === "ok";
  const bleOk   = sensors.bluetooth === "ok";
  const micOk   = sensors.microphone === "ok";
  const accelOk = sensors.accelerometer === "ok";

  const COMPAT = [
    { ok:jackOk,  label:"CELULAR, JACK, SpO2, ECG",          note:"requiere jack de audio 3.5mm" },
    { ok:magOk,   label:"Módulo detector de campo magnético", note:"requiere magnetómetro" },
    { ok:bleOk,   label:"Módulo ESP32 BLE",                   note:"requiere Bluetooth" },
    { ok:micOk,   label:"Decibelímetro",                      note:"requiere micrófono" },
    { ok:accelOk, label:"Nivel de superficie",                note:"requiere acelerómetro" },
  ];

  const battLabel = info.battery === "unsupported" ? "No disponible en este navegador"
    : info.battery ? `${info.battery.level}% · ${info.battery.charging?"⚡ Cargando":"Descargando"}`
    : "Cargando…";

  const anyLive = accelOk || magOk || sensors.ambientlight==="ok" || (info.battery && info.battery!=="unsupported");

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Dispositivo &amp; Sensores</div>

      {/* Info del dispositivo */}
      <div style={{...S.disp(col),padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:MONO,fontSize:9,color:col,fontWeight:700,letterSpacing:2}}>INFO DEL DISPOSITIVO</div>
          <button style={{...S.btn("s"),width:"auto",padding:"5px 12px",fontSize:10}} onClick={refreshInfo}>
            🔄 Actualizar
          </button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <InfoRow label="Modelo"         value={info.brand ? `${info.brand.brand} · ${info.brand.model}` : "—"} />
          <InfoRow label="Sistema"        value={info.brand ? `${info.brand.os} ${info.brand.osVer}` : "—"} />
          <InfoRow label="RAM aproximada" value={info.ram ? `${info.ram} GB` : "No disponible"} />
          <InfoRow label="Núcleos CPU"    value={info.cores ? `${info.cores}` : "No disponible"} />
          <InfoRow label="Almacenamiento" value={info.storage ? `${info.storage.usedMB}MB / ${info.storage.quotaMB}MB (${info.storage.pct}%)` : "Calculando…"} />
          <InfoRow label="Batería"        value={battLabel} />
        </div>
      </div>

      {/* Sensores disponibles */}
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:2,marginTop:4,marginBottom:2}}>
        SENSORES DISPONIBLES {scanning?"· escaneando…":""}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {SENSOR_LIST.map(s => {
          const st = SENSOR_STATUS[sensors[s.id]] || SENSOR_STATUS.checking;
          return (
            <div key={s.id} style={{...glass(st.col,0.05),borderRadius:10,padding:"10px 14px",
              border:`1px solid rgba(${rgb(st.col)},0.22)`,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <div style={{flex:1,fontFamily:MONO,fontSize:11,color:C.text}}>{s.label}</div>
              <span style={S.pill(st.col)}>{st.icon} {st.label}</span>
            </div>
          );
        })}
      </div>
      <div style={S.note}>
        La luz ambiental requiere el permiso ambient-light-sensor habilitado por el navegador (Permissions-Policy). El magnetómetro es una API experimental — si no está disponible se usa la orientación del dispositivo como referencia de rumbo.
      </div>

      {/* Valores en vivo */}
      {anyLive && (
        <>
          <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:2,marginTop:4,marginBottom:2}}>
            VALORES EN VIVO
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {accelOk && (
              <div style={{...S.disp(C.cyan),textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>ACELERÓMETRO (m/s²)</div>
                <div style={{fontFamily:MONO,fontSize:12,color:C.cyan,marginTop:4,lineHeight:1.7}}>
                  X {liveAccel.x?.toFixed(2)}<br/>Y {liveAccel.y?.toFixed(2)}<br/>Z {liveAccel.z?.toFixed(2)}
                </div>
              </div>
            )}
            {magOk && (
              <div style={{...S.disp(C.violet),textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{liveMag.real?"MAGNETÓMETRO (µT)":"RUMBO (°) · fallback"}</div>
                <div style={{fontFamily:MONO,fontSize:20,fontWeight:700,color:C.violet,marginTop:4}}>
                  {liveMag.value!=null ? liveMag.value.toFixed(1) : "—"}
                </div>
              </div>
            )}
            {sensors.ambientlight==="ok" && (
              <div style={{...S.disp(C.amber),textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>LUZ AMBIENTAL (lux)</div>
                <div style={{fontFamily:MONO,fontSize:20,fontWeight:700,color:C.amber,marginTop:4}}>
                  {liveLight!=null ? liveLight.toFixed(0) : "—"}
                </div>
              </div>
            )}
            {info.battery && info.battery!=="unsupported" && (
              <div style={{...S.disp(info.battery.level>30?C.green:C.red),textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>BATERÍA</div>
                <div style={{fontFamily:MONO,fontSize:20,fontWeight:700,
                  color:info.battery.level>30?C.green:C.red,marginTop:4}}>{info.battery.level}%</div>
                <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:2}}>
                  {info.battery.charging?"⚡ Cargando":"Descargando"}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Compatibilidad con módulos SEM Tools */}
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:2,marginTop:4,marginBottom:2}}>
        COMPATIBILIDAD CON MÓDULOS SEM TOOLS
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {COMPAT.map((c,i) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 12px",borderRadius:8,background:`rgba(${rgb(c.ok?C.green:C.dim)},0.06)`,
            border:`1px solid ${c.ok?`rgba(${rgb(C.green)},0.25)`:C.bord}`}}>
            <div>
              <div style={{fontFamily:MONO,fontSize:11,color:c.ok?C.text:C.dim,fontWeight:c.ok?700:400}}>{c.label}</div>
              <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:2}}>{c.note}</div>
            </div>
            <span style={{fontSize:16}}>{c.ok?"✅":"❌"}</span>
          </div>
        ))}
      </div>

      <div style={S.note}>
        Esta pantalla te ayuda a saber qué módulos físicos podés usar antes de comprarlos. Todo se detecta localmente en tu celular — no se envía nada a ningún servidor.
      </div>
    </div>
  );
}

// ── Marketplace de Módulos ─────────────────────────────────────────────────────
const MODULE_CATALOG = [
  {
    id:"tacolasr", icon:"⚙️", name:"SEM TacoLaser",
    col:C.green, status:"dev",
    desc:"Medí RPM sin contacto, sin tocar la pieza giratoria y sin efecto estroboscópico. Láser 650nm + fotodiodo. Desde un ventilador hasta un motor industrial.",
    iface:"Jack 3.5mm + USB-C",
    price:"",
    specs:["Rango: 30 – 60.000 RPM","Precisión ±0.1%","USB-C para alimentación","Jack 3.5mm para señal","Incluye cinta reflectante"],
  },
  {
    id:"oscilo2", icon:"〜", name:"SEM Scope 500K",
    col:C.cyan, status:"dev",
    desc:"Un osciloscopio de 2 canales que cabe en el bolsillo. 500kHz de ancho de banda, ADC 12-bit, conexión Bluetooth. Lo que antes requería un equipo de laboratorio.",
    iface:"Bluetooth BLE",
    price:"",
    specs:["2 canales simultáneos","BW: DC–500 kHz","ADC 12-bit · 2 Msps","Trigger automático / manual","Batería interna 8 horas"],
  },
  {
    id:"comptest", icon:"◻", name:"SEM ComponentID",
    col:C.violet, status:"dev",
    desc:"Acercás el componente, el módulo lo identifica y te da su valor. Resistencias, capacitores, inductores, transistores, MOSFETs, diodos — sin buscar nada.",
    iface:"Bluetooth BLE",
    price:"",
    specs:["Autodetección de tipo","R: 0.1Ω – 50MΩ","C: 1pF – 100mF","ESR de electrolíticos","hFE de transistores NPN/PNP"],
  },
  {
    id:"irmodule", icon:"📡", name:"SEM IR-TX Universal",
    col:C.violet, status:"dev",
    desc:"Convertí tu celular en un control remoto universal. TV, aires acondicionados, equipos médicos — cualquier dispositivo infrarrojo. Aprende códigos desconocidos.",
    iface:"USB-C OTG",
    price:"",
    specs:["LED IR 940nm de alta potencia","Base de datos LIRC + Pronto","Control por marca y modelo","Aprende códigos nuevos","Alcance: hasta 10 metros"],
  },
  {
    id:"termocam", icon:"🌡", name:"SEM ThermoVision",
    col:C.orange, status:"dev",
    desc:"Ves el calor. Sensor infrarrojo superpuesto en tiempo real sobre la cámara — encontrás fugas térmicas, puntos calientes en circuitos, motores recalentados.",
    iface:"Bluetooth BLE",
    price:"",
    specs:["Sensor MLX90640 · 32×24px","Rango: -40°C a +300°C","Precisión: ±1.5°C","Overlay sobre cámara HD","Paleta configurable (iron, rainbow)"],
  },
  {
    id:"redcable", icon:"🔗", name:"SEM CablePro",
    col:C.blue, status:"dev",
    desc:"Diagnóstico completo de redes. UTP, coaxial, fibra óptica — detecta el par roto, el cortocircuito y hasta dónde está la falla. Sin estar en ambos extremos.",
    iface:"Bluetooth BLE",
    price:"",
    specs:["UTP Cat5/6/7 · Coaxial 50/75Ω","Localización de falla por TDR","Detecta par roto/invertido","2 cabezales incluidos"],
  },
  {
    id:"termo2", icon:"🌡🌡", name:"SEM DualTemp",
    col:C.red, status:"available",
    desc:"Dos sondas de temperatura en un solo conector. Medís dos puntos simultáneamente y ves el diferencial en tiempo real. Listo para usar.",
    iface:"Jack 3.5mm estéreo",
    price:"",
    specs:["2 sondas NTC calibradas","Rango: -40°C a +125°C","Precisión: ±0.5°C","Cable 1m c/u · Conector TRRS"],
  },
  {
    id:"aquapanel", icon:"🧪", name:"SEM AquaPanel",
    col:C.cyan, status:"dev",
    desc:"pH + ORP + Conductividad en un módulo. Panel completo de calidad de agua para diálisis. Activa las herramientas avanzadas en la app.",
    iface:"Jack 3.5mm (TRRS)", price:"",
    specs:["Electrodo pH vidrio","Electrodo ORP platino","Celda conductividad K=1.0","Amplificador INA128","Compatible norma AAMI diálisis"],
    moduleId:"aquapanel",
  },
  {
    id:"ecgmod", icon:"📟", name:"SEM ECG-5",
    col:C.green, status:"dev",
    desc:"ECG de 5 derivaciones por jack estéreo. INA128 + filtros + electrodos. Compatible con el generador y lector ECG de la app.",
    iface:"Jack 3.5mm estéreo", price:"",
    specs:["5 derivaciones: I, II, III, aVR, V1","INA128 · CMRR >100dB","Filtros 0.5–150Hz","Cable de paciente 3 electrodos"],
  },
  {
    id:"condmod", icon:"💧", name:"SEM ConductPro",
    col:C.blue, status:"dev",
    desc:"Celda de conductividad 0.001–100 mS/cm. Electrodos de acero inox 316L. Para agua de diálisis, soluciones biológicas y control de calidad.",
    iface:"Jack 3.5mm (TRRS)", price:"",
    specs:["Rango: 0.001–100 mS/cm","Electrodos inox 316L","Celda K=1.0 cm⁻¹","Cable 1m TRRS"],
  },
  {
    id:"cloromod", icon:"🟡", name:"SEM CloroCheck",
    col:C.amber, status:"dev",
    desc:"Kit DPD estandarizado para medir cloro con la cámara del celular. Protocolo AAMI para diálisis incluido.",
    iface:"Cámara", price:"",
    specs:["100 tabletas DPD-1","50 tabletas DPD-3","Tubo 10mL calibrado","Tarjeta de blanco","Protocolo AAMI"],
  },
  {
    id:"spo2mod", icon:"❤️", name:"SEM SpO2",
    col:C.red, status:"dev",
    desc:"Sensor de saturación O₂ por jack estéreo. LED 660nm + IR 940nm + fotodiodo + clip para dedo. SpO2% y BPM simultáneos.",
    iface:"Jack 3.5mm estéreo", price:"",
    specs:["LED rojo 660nm + IR 940nm","Fotodiodo BPW34 x2","Amplificador TIA LM358","Clip dedo 3D","Rango 70–100% SpO2"],
  },
];

const STATUS_LABEL = {
  available: { label:"Disponible", col:C.green },
  dev:       { label:"Próximamente",  col:C.amber },
  design:    { label:"En diseño", col:C.violet },
};

function ToolModulos() {
  const [sel, setSel] = useState(null);
  const col = C.green;

  if (sel) {
    const m = MODULE_CATALOG.find(x => x.id === sel);
    const st = STATUS_LABEL[m.status];
    return (
      <div style={S.wrap}>
        <button style={S.btn("s")} onClick={() => setSel(null)}>← Volver al catálogo</button>
        <div style={{ fontSize:40, textAlign:"center", filter:`drop-shadow(0 0 12px ${m.col}88)` }}>{m.icon}</div>
        <div style={{ fontFamily:MONO, fontSize:16, fontWeight:700, color:m.col, textAlign:"center",
                      textShadow:`0 0 16px ${m.col}` }}>{m.name}</div>
        <div style={{ textAlign:"center" }}><span style={S.pill(st.col)}>{st.label}</span></div>
        <div style={{ ...S.res(m.col), fontFamily:MONO, fontSize:11, color:C.text, lineHeight:1.9 }}>{m.desc}</div>
        <div style={{ ...S.disp(m.col) }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginBottom:8 }}>ESPECIFICACIONES</div>
          {m.specs.map((s,i) => (
            <div key={i} style={{ fontFamily:MONO, fontSize:11, color:C.text, lineHeight:1.9 }}>
              <span style={{ color:m.col }}>▸ </span>{s}
            </div>
          ))}
        </div>
        <div style={S.row}>
          <div style={{ ...S.disp(C.amber), flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>INTERFAZ</div>
            <div style={{ fontFamily:MONO, fontSize:11, color:C.amber, fontWeight:700, marginTop:4 }}>{m.iface}</div>
          </div>
          <div style={{ ...S.disp(C.green), flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:C.dim }}>PRECIO EST.</div>
            <div style={{ fontFamily:MONO, fontSize:11, color:C.green, fontWeight:700, marginTop:4 }}>{m.price}</div>
          </div>
        </div>
        {/* Botón abrir herramienta si está construida */}
        {m.toolId && (
          <button style={{...S.btn("p",m.col),display:"flex",alignItems:"center",
            justifyContent:"center",gap:8}}
            onClick={()=>window.__semGoTo?.(m.toolId)}>
            ▶ Abrir herramienta
          </button>
        )}

        {/* Botón activar módulo (requiere hardware físico) */}
        {m.moduleId && <ModuleActivateButton moduleId={m.moduleId} col={m.col}/>}

        {m.status === "available" && !m.toolId
          ? <button style={S.btn("p", C.green)}>🛒  Consultar disponibilidad</button>
          : !m.toolId && <div style={S.tag(false)}>⏳  {st.label} — te avisamos cuando esté listo</div>
        }
        <div style={S.note}>Compatible con Android 8+ y iOS 14+. Sin drivers ni instalaciones adicionales.</div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Módulos de Hardware</div>
      <div style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
        Módulos fabricados localmente que extienden las capacidades de la app.
        Conectan por jack 3.5mm, USB-C o Bluetooth BLE.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {MODULE_CATALOG.map(m => {
          const st = STATUS_LABEL[m.status];
          return (
            <div key={m.id} style={{ ...S.card(m.col) }} onClick={() => setSel(m.id)}>
              <div style={{ fontSize:28, filter:`drop-shadow(0 0 8px ${m.col}66)` }}>{m.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:C.text }}>{m.name}</div>
                  <span style={S.pill(st.col)}>{st.label}</span>
                </div>
                <div style={{ fontSize:10, color:C.dim, lineHeight:1.45 }}>{m.desc.slice(0,80)}…</div>
                <div style={{ fontFamily:MONO, fontSize:9, color:m.col, marginTop:6 }}>{m.iface} · {m.price}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




// ── Cámara Endoscopio / USB ───────────────────────────────────────────────────

export { MODULE_CATALOG, STATUS_LABEL, ToolDispositivo, ToolModulos };
