import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, MONO, S, glass, rgb } from "./shared-core.jsx";
import { CameraView, askClaude } from "./shared-api.jsx";
import { CalButton, DemoBanner, ModuleGate, TimeChart, getCal, isDemoMode } from "./shared-mods.jsx";
import { StopFAB } from "./shared-app.jsx";

// ── Toggle de modo IA / offline — reusado por Resistencias e Integrados ──────
function ModeTab({ active, onClick, label, col }) {
  return (
    <button onClick={onClick} style={{
      flex:1, border:`1px solid ${active?col:C.bord}`, borderRadius:8,
      padding:"10px 6px", cursor:"pointer", fontFamily:MONO, fontSize:11, fontWeight:700,
      color:active?col:C.dim, background:active?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)",
    }}>{label}</button>
  );
}

// ── Calculadora de código de colores (offline) ───────────────────────────────
const RES_COLORS = [
  { id:"black",  name:"Negro",    hex:"#1a1a1a", digit:0, mult:1,          tol:null },
  { id:"brown",  name:"Marrón",   hex:"#7B3F00", digit:1, mult:10,         tol:1    },
  { id:"red",    name:"Rojo",     hex:"#E3312E", digit:2, mult:100,        tol:2    },
  { id:"orange", name:"Naranja",  hex:"#FF8C1A", digit:3, mult:1000,       tol:null },
  { id:"yellow", name:"Amarillo", hex:"#FFD500", digit:4, mult:10000,      tol:null },
  { id:"green",  name:"Verde",    hex:"#2E9E3F", digit:5, mult:100000,     tol:0.5  },
  { id:"blue",   name:"Azul",     hex:"#2962FF", digit:6, mult:1000000,    tol:0.25 },
  { id:"violet", name:"Violeta",  hex:"#8E24AA", digit:7, mult:10000000,   tol:0.1  },
  { id:"grey",   name:"Gris",     hex:"#9E9E9E", digit:8, mult:100000000, tol:0.05 },
  { id:"white",  name:"Blanco",   hex:"#FFFFFF", digit:9, mult:1000000000, tol:null },
  { id:"gold",   name:"Dorado",   hex:"#D4AF37", digit:null, mult:0.1,     tol:5    },
  { id:"silver", name:"Plateado", hex:"#C0C0C0", digit:null, mult:0.01,    tol:10   },
  { id:"none",   name:"Sin banda", hex:null,     digit:null, mult:null,    tol:20   },
];
const DIGIT_COLORS = RES_COLORS.filter(c=>c.digit!==null);
const MULT_COLORS  = RES_COLORS.filter(c=>c.mult!==null);
const TOL_COLORS   = RES_COLORS.filter(c=>c.tol!==null);

function fmtOhms(v){
  if(v>=1e6) return +(v/1e6).toFixed(3)+" MΩ";
  if(v>=1e3) return +(v/1e3).toFixed(3)+" kΩ";
  return +v.toFixed(3)+" Ω";
}

function ColorSwatch({ c, active, onClick, col }) {
  return (
    <button onClick={onClick} title={c.name} style={{
      width:36, height:36, borderRadius:8, flexShrink:0,
      background: c.hex || "repeating-linear-gradient(45deg,#2a2a2a,#2a2a2a 4px,#1a1a1a 4px,#1a1a1a 8px)",
      border: active ? `3px solid ${col}` : "1px solid rgba(255,255,255,0.2)",
      boxShadow: active ? `0 0 10px ${col}` : "none", cursor:"pointer",
    }}/>
  );
}

function ColorRow({ label, options, value, onPick, col }) {
  return (
    <div>
      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginBottom:4}}>{label}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {options.map(c=>(
          <ColorSwatch key={c.id} c={c} active={value?.id===c.id} onClick={()=>onPick(c)} col={col}/>
        ))}
      </div>
    </div>
  );
}

function ResistorCalc() {
  const col=C.violet;
  const [bands,setBands]=useState(5);
  const digitCount = bands-2;
  const [vals,setVals]=useState(Array(5).fill(null));

  useEffect(()=>{ setVals(Array(bands).fill(null)); },[bands]);

  const setAt=(i,c)=>setVals(v=>{ const n=[...v]; n[i]=c; return n; });

  const digits = vals.slice(0,digitCount);
  const multV  = vals[digitCount];
  const tolV   = vals[digitCount+1];

  let value=null;
  if(digits.every(d=>d) && multV && multV.mult!=null){
    const num = digits.reduce((acc,d)=>acc*10+d.digit,0);
    value = num*multV.mult;
  }
  const tolPct = tolV ? tolV.tol : 20;

  const reset=()=>setVals(Array(bands).fill(null));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:6}}>
        {[4,5].map(n=>(
          <ModeTab key={n} active={bands===n} onClick={()=>setBands(n)} label={`${n} bandas`} col={col}/>
        ))}
      </div>

      {/* Vista previa de la resistencia */}
      <div style={{...S.disp(col),display:"flex",justifyContent:"center",alignItems:"center",padding:"20px 10px",gap:3}}>
        <div style={{width:26,height:4,background:"#D9B88A",borderRadius:"2px 0 0 2px"}}/>
        {vals.map((b,i)=>(
          <div key={i} style={{width:10,height:26,
            background:b?(b.hex||"repeating-linear-gradient(45deg,#2a2a2a,#2a2a2a 3px,#1a1a1a 3px,#1a1a1a 6px)"):"rgba(255,255,255,0.08)",
            border:"1px solid rgba(0,0,0,0.3)"}}/>
        ))}
        <div style={{width:26,height:4,background:"#D9B88A",borderRadius:"0 2px 2px 0"}}/>
      </div>

      {Array.from({length:digitCount}).map((_,i)=>(
        <ColorRow key={i} label={`BANDA ${i+1} (cifra)`} options={DIGIT_COLORS}
          value={vals[i]} onPick={c=>setAt(i,c)} col={col}/>
      ))}
      <ColorRow label="MULTIPLICADOR" options={MULT_COLORS}
        value={vals[digitCount]} onPick={c=>setAt(digitCount,c)} col={col}/>
      <ColorRow label="TOLERANCIA" options={TOL_COLORS}
        value={vals[digitCount+1]} onPick={c=>setAt(digitCount+1,c)} col={col}/>

      {value!==null && (
        <div style={{...S.disp(C.green),textAlign:"center",padding:"18px"}}>
          <div style={{fontFamily:MONO,fontSize:42,fontWeight:700,color:C.green,textShadow:`0 0 20px ${C.green}`}}>
            {fmtOhms(value)}
          </div>
          <div style={{fontFamily:MONO,fontSize:13,color:C.dim,marginTop:4}}>± {tolPct}%</div>
        </div>
      )}
      <button style={S.btn("s")} onClick={reset}>↺ Limpiar</button>
      <div style={S.note}>
        Calculadora 100% offline — no usa IA ni necesita conexión, funciona siempre.
        Tocá cada banda en orden, de izquierda a derecha (la banda de tolerancia es la que queda más separada del resto).
      </div>
    </div>
  );
}

const RESISTENCIA_PROMPT =
  "Sos un técnico electrónico experto leyendo resistencias a partir de una foto tomada con un celular. " +
  "La foto puede tener reflejos, mala luz o ángulo imperfecto. Puede ser una resistencia tradicional con " +
  "bandas de colores, o una resistencia SMD con un código numérico impreso (sin bandas).\n\n" +
  "Si es de bandas de colores: identificá cada banda en orden, empezando desde el extremo donde hay más " +
  "espacio hasta la primera banda (la banda de tolerancia — generalmente dorada o plateada — queda más " +
  "separada del resto, al final).\n\n" +
  "Si es SMD con código numérico (ej: 472, 4R7, 1001, 103): los primeros dígitos son las cifras y el " +
  "último es el multiplicador en potencias de 10 (472 = 47×10² = 4700Ω = 4.7kΩ); una letra R, K o M " +
  "indica la posición del punto decimal (4R7 = 4.7Ω, 4K7 = 4.7kΩ); códigos de 4 dígitos (componentes de " +
  "1% de tolerancia) tienen 3 cifras + 1 multiplicador.\n\n" +
  "Si no podés distinguir con certeza una banda o un dígito por la foto, decilo en CONFIANZA y listá en " +
  "VALOR los 2 resultados más probables separados por ' o ' — nunca inventes un valor único con falsa " +
  "seguridad cuando la lectura es dudosa.\n\n" +
  "Respondé EXACTAMENTE en este formato, una línea por campo:\n" +
  "TIPO: [bandas de color / SMD código numérico]\n" +
  "LEIDO: [lo que ves literalmente — ej: marrón-negro-rojo-dorado, o \"472\"]\n" +
  "CONFIANZA: [ALTA / MEDIA / BAJA]\n" +
  "VALOR: [ej: 4.7 kΩ — si CONFIANZA es BAJA, listá 2 opciones separadas por ' o ']\n" +
  "TOLERANCIA: [±% según la banda/color de tolerancia; si es SMD sin banda visible escribí NO DETERMINABLE]\n" +
  "Si la foto no muestra ninguna resistencia: SIN COMPONENTE";

function ToolResistencias() {
  const col=C.violet;
  const [mode,setMode]=useState("ai"); // "ai" | "manual"
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const analyze=async b64=>{
    setLoading(true); setResult(null);
    try{ setResult(await askClaude(b64, RESISTENCIA_PROMPT)); }
    catch(e){ setResult(e.message==="NO_KEY"?"🔑 Configurá tu API key de Gemini (botón 🔑 arriba)":e.message==="INVALID_KEY"?"🔑 API key inválida — tocá 🔑 para reconfigurar":"⚠ "+e.message); }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Lector de Resistencias</div>
      <div style={{display:"flex",gap:6}}>
        <ModeTab active={mode==="ai"} onClick={()=>setMode("ai")} label="📷 Foto (IA)" col={col}/>
        <ModeTab active={mode==="manual"} onClick={()=>setMode("manual")} label="🎨 Manual (sin IA)" col={C.green}/>
      </div>
      {mode==="manual" ? <ResistorCalc/> : (
        <>
          <CameraView captureLabel={loading?"Analizando…":"📷 Leer bandas"} onCapture={loading?null:analyze}/>
          {result&&<div style={S.res(col)}>
            <div style={{fontFamily:MONO,fontSize:9,color:col,marginBottom:6,fontWeight:700}}>RESULTADO</div>
            <pre style={{fontFamily:MONO,fontSize:13,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.9}}>{result}</pre>
          </div>}
          <div style={S.note}>
            Apuntá la cámara con buena luz y presioná Leer bandas. También podés subir una foto ya tomada.
            Si usás la key gratis de Gemini: Google tiene un límite diario de usos — si deja de responder, usá
            "🎨 Manual (sin IA)" arriba, que funciona siempre sin depender de ninguna cuota.
          </div>
        </>
      )}
    </div>
  );
}

// ── Integrados ────────────────────────────────────────────────────────────────
// Extrae el valor de un campo "ETIQUETA: valor" de la respuesta estructurada de la IA.
function extractField(text, label) {
  if (!text) return null;
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\s*:\\s*(.+)", "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// ── Librería local de ICs comunes (offline) ──────────────────────────────────
const IC_DB = [
  { names:["7805","L7805","MC7805","LM7805"], cat:"Regulador de voltaje lineal +5V", pkg:"TO-220", pins:"1=IN · 2=GND · 3=OUT", specs:"Vin: 7–25V · Vout: 5V fijo · Imax: 1A (con disipador) · Protección térmica y de corriente incorporada" },
  { names:["7812","L7812","MC7812"], cat:"Regulador de voltaje lineal +12V", pkg:"TO-220", pins:"1=IN · 2=GND · 3=OUT", specs:"Vin: 14–35V · Vout: 12V fijo · Imax: 1A (con disipador)" },
  { names:["7809","L7809"], cat:"Regulador de voltaje lineal +9V", pkg:"TO-220", pins:"1=IN · 2=GND · 3=OUT", specs:"Vin: 11–25V · Vout: 9V fijo · Imax: 1A" },
  { names:["7905","7912"], cat:"Regulador de voltaje lineal negativo", pkg:"TO-220", pins:"1=GND · 2=IN · 3=OUT (orden distinto al 78xx)", specs:"Vout: -5V/-12V según modelo · Imax: 1A" },
  { names:["LM317","LM317T"], cat:"Regulador de voltaje ajustable", pkg:"TO-220", pins:"1=ADJ · 2=OUT · 3=IN", specs:"Vout ajustable 1.25–37V con 2 resistencias externas · Imax: 1.5A · Vref: 1.25V entre OUT y ADJ" },
  { names:["LM358","LM358N","LM358P"], cat:"Amplificador operacional doble (dual op-amp)", pkg:"DIP-8 / SOIC-8", pins:"1=OUT1 · 2=IN1- · 3=IN1+ · 4=GND · 5=IN2+ · 6=IN2- · 7=OUT2 · 8=VCC", specs:"Vcc: 3–32V (simple) o ±1.5–±16V (dual) · Uso: amplificación, comparador, sensores" },
  { names:["LM324","LM324N"], cat:"Amplificador operacional cuádruple", pkg:"DIP-14 / SOIC-14", pins:"VCC=pin4 · GND=pin11 · 4 amp-op internos", specs:"Mismo tipo que LM358 pero con 4 canales en vez de 2" },
  { names:["TL082","TL072"], cat:"Amplificador operacional dual JFET (bajo ruido)", pkg:"DIP-8", pins:"Mismo pinout que LM358", specs:"Vcc: ±4.5 a ±18V · Uso: audio, filtros activos" },
  { names:["555","NE555","LM555"], cat:"Temporizador (timer)", pkg:"DIP-8 / SOIC-8", pins:"1=GND · 2=TRIG · 3=OUT · 4=RESET · 5=CTRL · 6=THR · 7=DIS · 8=VCC", specs:"Vcc: 4.5–16V · Modos: astable (oscilador), monoestable (temporizador), biestable · Corriente de salida hasta 200mA" },
  { names:["556","NE556"], cat:"Doble temporizador 555", pkg:"DIP-14", pins:"2 bloques 555 independientes en un chip", specs:"Mismas specs que el 555, x2" },
  { names:["4017","CD4017"], cat:"Contador decimal Johnson (divisor/secuenciador)", pkg:"DIP-16", pins:"Salidas Q0-Q9 secuenciales · CLK=14 · RESET=15 · VDD=16 · VSS=8", specs:"Vcc: 3–15V (serie 4000 CMOS) · Uso: luces secuenciales, contadores" },
  { names:["4511","CD4511"], cat:"Decodificador BCD a 7 segmentos", pkg:"DIP-16", pins:"Entradas BCD A-D · Salidas a-g para display", specs:"Vcc: 3–15V · Controla directamente un display 7 segmentos ánodo común" },
  { names:["4066","CD4066"], cat:"Switch analógico cuádruple bidireccional", pkg:"DIP-14", pins:"4 switches independientes controlados digitalmente", specs:"Vcc: 3–15V · Uso: multiplexado de señales analógicas" },
  { names:["4093","CD4093"], cat:"Compuerta NAND cuádruple con Schmitt-trigger", pkg:"DIP-14", pins:"4 compuertas NAND de 2 entradas", specs:"Vcc: 3–15V · Uso: lógica digital, osciladores simples" },
  { names:["74HC595","SN74HC595"], cat:"Registro de desplazamiento serie-paralelo", pkg:"DIP-16 / SOIC-16", pins:"DS=14 · SHCP=11 · STCP=12 · OE=13 · MR=10 · Q0-Q7 salidas", specs:"Vcc: 2–6V · Uso: expandir salidas digitales (ej. con Arduino)" },
  { names:["74HC04","SN74HC04"], cat:"Inversor hexagonal (6 compuertas NOT)", pkg:"DIP-14", pins:"6 inversores independientes", specs:"Vcc: 2–6V" },
  { names:["ULN2003","ULN2003A"], cat:"Driver de 7 transistores Darlington (relés/motores)", pkg:"DIP-16 / SOIC-16", pins:"IN1-7 entradas · OUT1-7 salidas (colector abierto) · COM=pin9 (diodos de protección) · GND=pin8", specs:"Vout max: 50V · Corriente por canal: 500mA · Uso: manejar relés, motores paso a paso, solenoides desde lógica" },
  { names:["ULN2803","ULN2803A"], cat:"Driver de 8 transistores Darlington", pkg:"DIP-18", pins:"Igual al ULN2003 pero con 8 canales", specs:"Mismas specs que ULN2003, x8 canales" },
  { names:["L293D"], cat:"Driver doble puente H para motores DC", pkg:"DIP-16", pins:"2 puentes H independientes · EN1=1 · IN1=2 · IN2=7 · OUT1=3 · OUT2=6 · VCC2(motor)=8 · GND=4,5,12,13", specs:"Vcc lógica: 4.5–7V · Vcc motor: hasta 36V · Corriente: 600mA por canal (1.2A pico) · Diodos de protección incorporados" },
  { names:["L298N","L298"], cat:"Driver doble puente H de alta corriente", pkg:"Multiwatt-15 / módulo", pins:"Similar al L293D, mayor corriente", specs:"Vcc motor: hasta 46V · Corriente: 2A por canal · Requiere disipador" },
  { names:["ATMEGA328P","ATmega328"], cat:"Microcontrolador AVR 8-bit (base del Arduino Uno)", pkg:"DIP-28 / TQFP-32", pins:"28 pines (DIP) · Varios timers, ADC, UART, SPI, I2C", specs:"Vcc: 1.8–5.5V · Flash: 32KB · RAM: 2KB · Clock: hasta 20MHz" },
  { names:["ESP32","ESP32-WROOM","ESP32-WROOM-32"], cat:"Microcontrolador WiFi+Bluetooth", pkg:"Módulo SMD", pins:"Variable según módulo — ver pinout específico del fabricante", specs:"Vcc: 3.0–3.6V (NO tolerante a 5V en la mayoría de pines) · WiFi 802.11 b/g/n · Bluetooth 4.2/BLE · Dual core hasta 240MHz" },
  { names:["ESP8266","ESP-01"], cat:"Microcontrolador WiFi", pkg:"Módulo SMD", pins:"Variable según módulo", specs:"Vcc: 3.0–3.6V (NO tolerante a 5V) · WiFi 802.11 b/g/n · 1 core hasta 160MHz" },
  { names:["CH340","CH340G"], cat:"Conversor USB a serial (UART)", pkg:"SOIC-16", pins:"USB D+/D- · TXD · RXD · VCC · GND", specs:"Vcc: 3.3–5.5V · Usado en placas Arduino clones y programadores" },
  { names:["CP2102"], cat:"Conversor USB a serial (UART)", pkg:"QFN-28", pins:"Similar al CH340, distinto fabricante (Silicon Labs)", specs:"Vcc: 3.0–3.6V · Requiere driver específico en Windows" },
  { names:["FT232RL"], cat:"Conversor USB a serial (UART), alta calidad", pkg:"SSOP-28", pins:"USB + UART + control de flujo", specs:"Vcc: 3.3–5.25V · Más confiable que CH340, más caro" },
  { names:["24C32","AT24C32","24LC32"], cat:"Memoria EEPROM I2C 32Kbit", pkg:"DIP-8 / SOIC-8", pins:"SDA=5 · SCL=6 · WP=7 · A0-A2=1,2,3 (dirección) · VCC=8 · GND=4", specs:"Vcc: 1.8–5.5V · Retención de datos: >100 años · Ciclos de escritura: >1 millón" },
  { names:["PC817","4N25","4N35"], cat:"Optoacoplador (aislamiento galvánico)", pkg:"DIP-4", pins:"1,2=LED (ánodo/cátodo) · 3,4=fototransistor (emisor/colector)", specs:"Aislamiento: 2500–5000Vrms · Uso: aislar circuitos de distinto voltaje/tierra" },
  { names:["MAX232","MAX232CPE"], cat:"Conversor de niveles RS232 a TTL", pkg:"DIP-16", pins:"Requiere 4 capacitores externos (1µF típico)", specs:"Vcc: 5V · Convierte ±12V RS232 a 0-5V TTL para comunicación serie con PC" },
  { names:["IRF540","IRF540N"], cat:"MOSFET canal N de potencia", pkg:"TO-220", pins:"1=Gate · 2=Drain · 3=Source", specs:"Vds max: 100V · Id max: 33A · Uso: switching de cargas, control PWM de motores/LEDs" },
  { names:["IRFZ44N"], cat:"MOSFET canal N de potencia (logic level)", pkg:"TO-220", pins:"1=Gate · 2=Drain · 3=Source", specs:"Vds max: 55V · Id max: 49A · Se activa bien con 5V de gate (logic level)" },
  { names:["BC547","BC548","BC337"], cat:"Transistor NPN de uso general", pkg:"TO-92", pins:"1=Colector · 2=Base · 3=Emisor (puede variar, verificar datasheet del fabricante)", specs:"Vce max: 45–50V · Ic max: 100mA–800mA según modelo · Uso: amplificación de señal, switching de baja potencia" },
  { names:["BC557","BC327"], cat:"Transistor PNP de uso general", pkg:"TO-92", pins:"Complementario de BC547/BC337", specs:"Mismas specs que su par NPN, polaridad invertida" },
  { names:["TIP120","TIP122"], cat:"Transistor Darlington NPN de potencia", pkg:"TO-220", pins:"1=Base · 2=Colector · 3=Emisor", specs:"Vce max: 60–100V · Ic max: 5A · Ganancia muy alta (Darlington) · Uso: control de motores/relés desde un microcontrolador" },
  { names:["1N4001","1N4007"], cat:"Diodo rectificador", pkg:"DO-41 (axial)", pins:"Banda = cátodo", specs:"1N4001: 50V/1A · 1N4007: 1000V/1A · Uso: rectificación, protección contra inversión de polaridad" },
  { names:["1N4148"], cat:"Diodo de señal (conmutación rápida)", pkg:"DO-35 (axial)", pins:"Banda = cátodo", specs:"Vr max: 100V · If max: 200mA · Uso: lógica, protección de pines, detección" },
  { names:["1N5819"], cat:"Diodo Schottky", pkg:"DO-41 (axial)", pins:"Banda = cátodo", specs:"Vr: 40V · If: 1A · Caída de voltaje muy baja (~0.3–0.5V) · Uso: rectificación eficiente, protección de polaridad en fuentes" },
];

function icMatches(entry, q) {
  const ql = q.toLowerCase().replace(/[^a-z0-9]/g,"");
  if (entry.names.some(n=>n.toLowerCase().replace(/[^a-z0-9]/g,"").includes(ql))) return true;
  return entry.cat.toLowerCase().includes(q.toLowerCase());
}

function ICLibrary() {
  const col=C.violet;
  const [q,setQ]=useState("");
  const query=q.trim();
  const results = query.length<2 ? [] : IC_DB.filter(e=>icMatches(e,query)).slice(0,12);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <input style={S.inp} placeholder="Escribí el part number (ej: LM358, 7805, 555...)"
        value={q} onChange={e=>setQ(e.target.value)}/>
      {query.length>=2 && results.length===0 && (
        <div style={{...S.note,textAlign:"center"}}>
          No está en la librería local ({IC_DB.length} componentes). Probá "📷 Foto (IA)" o buscá el marking directo en Google.
        </div>
      )}
      {results.map((e,i)=>(
        <div key={i} style={S.res(col)}>
          <div style={{fontFamily:MONO,fontSize:14,fontWeight:700,color:col,marginBottom:4}}>
            {e.names[0]}
            {e.names.length>1 && <span style={{fontSize:10,color:C.dim,fontWeight:400}}> · {e.names.slice(1).join(", ")}</span>}
          </div>
          <div style={{fontFamily:MONO,fontSize:11,color:C.text,marginBottom:6}}>{e.cat}</div>
          <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.8}}>
            <div><span style={{color:col}}>Encapsulado: </span>{e.pkg}</div>
            <div><span style={{color:col}}>Pines: </span>{e.pins}</div>
            <div><span style={{color:col}}>Specs: </span>{e.specs}</div>
          </div>
          <a href={`https://www.google.com/search?q=${encodeURIComponent(e.names[0])}+datasheet+pdf`} target="_blank" rel="noreferrer"
            style={{...S.btn("s"),textDecoration:"none",display:"block",textAlign:"center",marginTop:8,fontSize:11}}>
            📄 Buscar datasheet
          </a>
        </div>
      ))}
      <div style={S.note}>
        Librería offline de los {IC_DB.length} componentes más comunes en taller — no usa IA ni necesita conexión, funciona siempre.
        Si no encontrás el tuyo acá, probá "📷 Foto (IA)".
      </div>
    </div>
  );
}

const INTEGRADO_PROMPT =
  "Sos un técnico electrónico experto identificando integrados (ICs) a partir de una foto tomada con un celular. " +
  "La foto puede tener baja resolución, reflejos, polvo o el marking parcialmente borrado. Sé honesto sobre la incertidumbre: " +
  "NUNCA inventes un part number específico con falsa certeza si no podés leerlo con confianza — es preferible decir que no estás seguro " +
  "antes que dar un dato incorrecto a un técnico que va a confiar en él.\n\n" +
  "Para identificar el componente, priorizá primero los ICs más comunes en electrónica de taller/reparación " +
  "(reguladores de voltaje 78xx/79xx/LM317, amplificadores operacionales LM358/LM324/TL082, temporizadores " +
  "555/556, lógica CMOS/TTL serie 4000/74xx, drivers de motor/relé ULN2003/L293D, microcontroladores " +
  "ATmega/PIC/ESP32/STM32, memorias EEPROM 24Cxx, conversores USB-serie CH340/CP2102, optoacopladores " +
  "4N25/PC817) antes que pensar en componentes raros o poco frecuentes — en un taller real, lo más probable " +
  "es casi siempre lo más común. Pero si el marking leído no encaja con ninguno de esos, decilo igual.\n\n" +
  "Respondé EXACTAMENTE en este formato, una línea por campo:\n" +
  "MARKING LEIDO: [transcribí EXACTAMENTE los caracteres que ves en el chip, línea por línea separadas por /; usá ? para cualquier carácter que no puedas distinguir con certeza; si no hay texto legible escribí NO LEGIBLE]\n" +
  "CONFIANZA: [ALTA / MEDIA / BAJA — qué tan seguro estás de la lectura del marking]\n" +
  "COMPONENTE: [nombre o part number más probable según el marking; si CONFIANZA es BAJA listá 2-3 candidatos posibles separados por ' o ' en vez de afirmar uno solo]\n" +
  "FUNCION: [qué hace este tipo de componente, en 1-2 líneas]\n" +
  "ENCAPSULADO: [tipo de paquete que VES en la foto — DIP-8, SOIC-16, TO-220, etc. — y cantidad de pines; esto es más confiable que leer el texto]\n" +
  "ESPECIFICACIONES CLAVE: [si identificás el componente con CONFIANZA ALTA o MEDIA: voltaje de alimentación típico, corriente o potencia máxima u otro dato eléctrico relevante que SEPAS con certeza real para ese part number específico; si no estás seguro del valor exacto, escribí DESCONOCIDO — no inventes números para parecer más completo]\n" +
  "PINES CLAVE: [si identificás el componente con CONFIANZA ALTA o MEDIA: función de los pines más importantes, ej Pin1=VCC, Pin4=GND; si no, escribí DESCONOCIDO]\n" +
  "COMO PROBARLO: [pasos concretos para un técnico con multímetro u osciloscopio]\n" +
  "EQUIVALENTE: [reemplazo común si existe, o NINGUNO]\n" +
  "BUSQUEDA SUGERIDA: [la mejor cadena de búsqueda en inglés para encontrar el datasheet — normalmente el marking o part number más probable, sin la palabra datasheet]\n" +
  "Si la foto no muestra ningún componente: SIN COMPONENTE";

function buildIntegradoLinks(text) {
  const raw = extractField(text,"BUSQUEDA SUGERIDA") || extractField(text,"COMPONENTE") || extractField(text,"MARKING LEIDO");
  if (!raw) return null;
  const clean = raw.replace(/\?/g,"").replace(/\bNO LEGIBLE\b/i,"").replace(/\bDESCONOCIDO\b/i,"").trim();
  if (!clean || /SIN COMPONENTE/i.test(clean)) return null;
  const query = encodeURIComponent(clean.split(/\s+o\s+/i)[0].trim());
  return {
    datasheet: `https://www.google.com/search?q=${query}+datasheet+pdf`,
    pinout:    `https://www.google.com/search?tbm=isch&q=${query}+pinout+diagram`,
    octopart:  `https://octopart.com/search?q=${query}`,
  };
}

function ToolIntegrado() {
  const col=C.violet;
  const [mode,setMode]=useState("ai"); // "ai" | "lib"
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const [photo,setPhoto]=useState(null), [links,setLinks]=useState(null);
  const analyze=async b64=>{
    setLoading(true); setResult(null); setLinks(null);
    setPhoto("data:image/jpeg;base64,"+b64);
    try{
      const text = await askClaude(b64, INTEGRADO_PROMPT);
      setResult(text);
      setLinks(buildIntegradoLinks(text));
    } catch(e){ setResult(e.message==="NO_KEY"?"🔑 Configurá tu API key de Gemini (botón 🔑 arriba)":e.message==="INVALID_KEY"?"🔑 API key inválida — tocá 🔑 para reconfigurar":"⚠ "+e.message); }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Identificador de IC</div>
      <div style={{display:"flex",gap:6}}>
        <ModeTab active={mode==="ai"} onClick={()=>setMode("ai")} label="📷 Foto (IA)" col={col}/>
        <ModeTab active={mode==="lib"} onClick={()=>setMode("lib")} label="🔍 Librería (sin IA)" col={C.green}/>
      </div>
      {mode==="lib" ? <ICLibrary/> : (
        <>
          <CameraView captureLabel={loading?"Identificando…":"📷 Identificar IC"} onCapture={loading?null:analyze}/>
          {photo && (
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <img src={photo} alt="Foto enviada a la IA" style={{width:92,borderRadius:8,border:`1px solid rgba(${rgb(col)},0.3)`,flexShrink:0}}/>
              <div style={{fontFamily:MONO,fontSize:9,color:C.dim,lineHeight:1.7}}>
                Esta es la foto que se envió a la IA. Si el marking salió borroso, con reflejo o muy chico, acercá más la cámara, mejorá la luz y volvé a capturar.
              </div>
            </div>
          )}
          {result&&<div style={S.res(col)}>
            <pre style={{fontFamily:MONO,fontSize:12,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.9}}>{result}</pre>
          </div>}
          {links && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <a href={links.datasheet} target="_blank" rel="noreferrer"
                style={{...S.btn("s"),textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                📄 Buscar datasheet
              </a>
              <a href={links.pinout} target="_blank" rel="noreferrer"
                style={{...S.btn("s"),textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                🖼 Ver diagrama de conexión / pines
              </a>
              <a href={links.octopart} target="_blank" rel="noreferrer"
                style={{...S.btn("s"),textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                🔍 Buscar en Octopart
              </a>
            </div>
          )}
          <div style={S.note}>
            Enfocá bien de cerca el marking, con buena luz y sin reflejos — eso es lo que más mejora el resultado.
            Si la IA no está segura te lo va a decir en CONFIANZA; usá los enlaces de arriba para confirmar con el datasheet real antes de dar el componente por bueno.
            Si usás la key gratis de Gemini: Google tiene un límite diario de usos — si deja de responder, usá
            "🔍 Librería (sin IA)" arriba, que funciona siempre sin depender de ninguna cuota.
          </div>
        </>
      )}
    </div>
  );
}

// ── Distancia ─────────────────────────────────────────────────────────────────
function ToolDistancia() {
  const col=C.violet;
  const [mode,setMode]=useState(null);
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const [captured,setCaptured]=useState(null), [pts,setPts]=useState([]);
  const [phase,setPhase]=useState("ref1"), [refMM,setRefMM]=useState("85.6");
  const tapCanvas=useRef();

  const reset=()=>{ setCaptured(null);setResult(null);setPts([]);setPhase("ref1");setMode(null); };

  const onCapture=async(b64,canvas)=>{
    setCaptured(b64); setResult(null);
    if(mode==="claude"){
      setLoading(true);
      try{ setResult(await askClaude(b64,
        "Estimá distancias en esta foto. Si hay objeto de referencia conocido (tarjeta crédito 85.6×54mm, moneda, regla) usalo como escala.\nREFERENCIA: [objeto]\nMEDIDAS:\n[lista en cm]\nPRECISIÓN: [±X%]"));
      } catch(e){ setResult("⚠ "+e.message); }
      setLoading(false);
    } else {
      setTimeout(()=>{
        const tc=tapCanvas.current; if(!tc) return;
        const img=new Image(); img.onload=()=>tc.getContext("2d").drawImage(img,0,0,tc.width,tc.height);
        img.src="data:image/jpeg;base64,"+b64;
        setPts([]); setPhase("ref1");
      },100);
    }
  };

  const handleTap=e=>{
    if(!captured||mode!=="tap") return;
    const tc=tapCanvas.current, rect=tc.getBoundingClientRect();
    const sx=tc.width/rect.width, sy=tc.height/rect.height;
    const touch=e.touches?.[0]||e;
    const px=(touch.clientX-rect.left)*sx, py=(touch.clientY-rect.top)*sy;
    const ctx=tc.getContext("2d");
    ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2);
    ctx.fillStyle=phase==="target"?C.green:C.amber; ctx.fill();
    ctx.strokeStyle="#000"; ctx.lineWidth=2; ctx.stroke();
    const np=[...pts,{x:px,y:py}]; setPts(np);
    if(phase==="ref1") setPhase("ref2");
    else if(phase==="ref2"){
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(px,py);
      ctx.strokeStyle=C.amber; ctx.lineWidth=3; ctx.setLineDash([8,4]); ctx.stroke(); ctx.setLineDash([]);
      setPhase("target");
    } else {
      const [p1,p2,p3]=np;
      const scale=parseFloat(refMM)/Math.hypot(p2.x-p1.x,p2.y-p1.y);
      const d1=Math.hypot(p3.x-p1.x,p3.y-p1.y)*scale;
      const d2=Math.hypot(p3.x-p2.x,p3.y-p2.y)*scale;
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p3.x,p3.y);
      ctx.strokeStyle=C.green; ctx.lineWidth=2; ctx.stroke();
      setResult(`Desde P1: ${(d1/10).toFixed(1)} cm  (${d1.toFixed(0)} mm)\nDesde P2: ${(d2/10).toFixed(1)} cm  (${d2.toFixed(0)} mm)\nEscala: ${scale.toFixed(2)} mm/px`);
      setPhase("done");
    }
  };

  if(!mode) return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Medidor de Distancia</div>
      <div style={{...S.note,textAlign:"center",padding:18}}>¿Cómo querés medir?</div>
      <button style={S.btn("p",col)} onClick={()=>setMode("claude")}>🤖  IA estima con referencia</button>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",lineHeight:1.6}}>
        Poné una tarjeta de crédito o moneda como referencia en la foto
      </div>
      <button style={S.btn("s")} onClick={()=>setMode("tap")}>✋  Medir tocando la pantalla</button>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,textAlign:"center",lineHeight:1.6}}>
        Tocás 2 puntos de referencia conocida → luego el punto a medir
      </div>
    </div>
  );
  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Distancia — {mode==="claude"?"IA":"Toque"}</div>
      {mode==="tap"&&!captured&&(
        <div style={S.row}>
          <span style={{fontFamily:MONO,fontSize:10,color:C.dim,alignSelf:"center",whiteSpace:"nowrap"}}>Ref mm:</span>
          <input style={{...S.inp,flex:1}} type="number" value={refMM} onChange={e=>setRefMM(e.target.value)}/>
        </div>
      )}
      {mode==="tap"&&captured&&(
        <div style={{...S.pill(col),textAlign:"center",padding:"6px 14px",fontSize:11}}>
          {{ref1:"Tocá PUNTO 1 de la referencia",ref2:"Tocá PUNTO 2 de la referencia",target:"Tocá el punto a medir",done:"✓ Listo"}[phase]}
        </div>
      )}
      {!captured
        ? <CameraView captureLabel={loading?"Analizando…":"📷 Capturar"} onCapture={loading?null:onCapture}/>
        : <>
            {mode==="tap"&&<canvas ref={tapCanvas} width={640} height={360}
              style={{width:"100%",borderRadius:8,border:`1px solid ${C.bord}`,cursor:"crosshair"}}
              onClick={handleTap} onTouchEnd={handleTap}/>}
            <button style={S.btn("s")} onClick={reset}>↺ Volver a empezar</button>
          </>
      }
      {result&&<div style={S.res(col)}><pre style={{fontFamily:MONO,fontSize:13,color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.8}}>{result}</pre></div>}
    </div>
  );
}



// ── Materiales Jack y PDF ────────────────────────────────────────────────────
const JACK_MATERIALS = [
  { name:"ThermoJack", items:["NTC 10kΩ B=3950","R 10kΩ ±1%","Cap 100nF cerámico","Jack TRRS 3.5mm macho","Cable apantallado 50cm"] },
  { name:"AirJack",    items:["Transistor BD139 (sin disipador)","R 1kΩ (base)","R 47Ω/1W (emisor)","R 2.2kΩ (colector)","Cap 10µF/16V","Jack TRRS macho","Tubo PVC Ø10mm x 5cm"] },
  { name:"VoltJack",   items:["R 27kΩ ±1%","R 1kΩ ±1%","Zener 3.3V/0.5W","Cap 100nF","Jack TRRS macho","Cables con punta de prueba"] },
  { name:"PhotoJack",  items:["LDR GL5528","R 10kΩ","Cap 100nF","Jack TRRS macho"] },
];

function JackManualPanel() {
  const col = C.orange;
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ ...glass(col,0.06), borderRadius:12, border:`1px solid rgba(${rgb(col)},0.25)`,
                  overflow:"hidden", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"12px 16px", cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:col }}>
            🎁 Manual de construcción + Lista de materiales
          </div>
          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:2 }}>
            Gratis · ThermoJack · AirJack · VoltJack · PhotoJack
          </div>
        </div>
        <span style={{ color:col, fontSize:16 }}>{open?"▲":"▼"}</span>
      </div>

      {open && (
        <div style={{ padding:"0 16px 16px", borderTop:`1px solid rgba(${rgb(col)},0.15)` }}>
          {/* Descarga PDF */}
          <a href="/manual_jack.pdf" download="SEM_Tools_Manual_Sensores_Jack.pdf" target="_blank"
            style={{ display:"block", textDecoration:"none", marginTop:12, marginBottom:14,
                     ...S.btn("p",col), textAlign:"center" }}>
            ⬇ Descargar manual completo (PDF)
          </a>

          {/* Lista de materiales por módulo */}
          {JACK_MATERIALS.map(m => (
            <div key={m.name} style={{ marginBottom:12 }}>
              <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:col, marginBottom:6 }}>
                {m.name}
              </div>
              {m.items.map((item,i) => (
                <div key={i} style={{ fontFamily:MONO, fontSize:10, color:C.dim, lineHeight:1.8 }}>
                  <span style={{ color:col }}>▸ </span>{item}
                </div>
              ))}
            </div>
          ))}

          <div style={{ fontFamily:MONO, fontSize:9, color:C.dim, marginTop:8, lineHeight:1.7,
                        background:"rgba(255,255,255,0.03)", borderRadius:6, padding:"8px 10px" }}>
            Herramientas necesarias: cautín · estaño · multímetro · termoencogible · pinzas
          </div>
        </div>
      )}
    </div>
  );
}


// ── ORP — Potencial Redox (requiere SEM AquaPanel) ───────────────────────────
function ToolORP() {
  return (
    <ModuleGate modName="SEM AquaPanel" modId="aquapanel">
      <ToolORPInner/>
    </ModuleGate>
  );
}

function ToolORPInner() {
  const col = C.violet;
  const [on,setOn]=useState(false),[err,setErr]=useState(null);
  const [orp,setOrp]=useState(null),[trend,setTrend]=useState([]);
  const stRef=useRef(),anlRef=useRef(),rafRef=useRef();

  // ORP: electrodo de platino genera mV proporcional al potencial redox
  // Mismo circuito que pH (alta impedancia) — solo cambia el electrodo
  // Señal muy pequeña (~0.5-1V rango típico) → amplificada al rango de audio
  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stRef.current=s;
      const ctx=new AudioContext(), src2=ctx.createMediaStreamSource(s);
      const anl=ctx.createAnalyser(); anl.fftSize=4096; anl.smoothingTimeConstant=0.9;
      src2.connect(anl); anlRef.current=anl;
      setOn(true); setErr(null);
      const td=new Float32Array(anl.fftSize);
      // Calibración ORP: 0mV DC → 0V audio, ±1000mV → ±amplificado
      // Factor depende del circuito (ganancia del INA128 configurada)
      const cal = getCal("orp"); // offset en mV
      const process=()=>{
        anl.getFloatTimeDomainData(td);
        const avg=td.reduce((a,v)=>a+v,0)/td.length;
        // Convertir a mV: factor empírico según ganancia del circuito
        const mvRaw = avg * 1000 * (cal.factor||1);
        const mv = mvRaw + (cal.offset||0);
        setOrp(Math.round(mv));
        setTrend(h=>[...h.slice(-59),mv]);
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

  // Interpretación ORP para agua de diálisis
  const orpStatus = orp===null?null:
    orp > 600 ? {label:"⚠ Cloro presente", col:C.red, detail:"Agua NO apta para diálisis"} :
    orp > 400 ? {label:"◉ Oxidante residual", col:C.amber, detail:"Verificar filtro de carbón"} :
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
      <div style={{...glass(C.amber,0.08),borderRadius:10,padding:"10px 14px",
        border:`1px solid rgba(${rgb(C.amber)},0.3)`}}>
        <div style={{fontFamily:MONO,fontSize:10,color:C.amber,fontWeight:700,lineHeight:1.7}}>
          🧪 EXPERIMENTAL — este sensor solo funciona si armaste vos el circuito (ver manual abajo).
          No viene calibrado de fábrica ni se vende armado.
        </div>
      </div>
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

export { JACK_MATERIALS, JACK_MODS, JackManualPanel, ToolDistancia, ToolIntegrado, ToolJackSensor, ToolORP, ToolORPInner, ToolResistencias, ToolpHInner, ToolpHJack };
