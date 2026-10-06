import React, { useState, useEffect } from "react";
import { C, MONO, S, rgb } from "./shared-core.jsx";

// ── Categorías de conversión ───────────────────────────────────────────────────
// Unidades lineales: factor = cuántas unidades "base" equivalen a 1 unidad.
// Temperatura es especial (offset, no lineal) → usa toBase/fromBase.
const UNIT_CATEGORIES = {
  temperatura: {
    label:"Temperatura", icon:"🌡",
    units: [
      { id:"c", label:"°C", toBase:v=>v,              fromBase:v=>v },
      { id:"f", label:"°F", toBase:v=>(v-32)*5/9,      fromBase:v=>v*9/5+32 },
      { id:"k", label:"K",  toBase:v=>v-273.15,        fromBase:v=>v+273.15 },
    ],
  },
  presion: {
    label:"Presión", icon:"🔘",
    units: [ // base: kPa
      { id:"kpa",   label:"kPa",    factor:1 },
      { id:"mmhg",  label:"mmHg",   factor:0.133322 },
      { id:"bar",   label:"bar",    factor:100 },
      { id:"psi",   label:"psi",    factor:6.89476 },
      { id:"atm",   label:"atm",    factor:101.325 },
      { id:"cmh2o", label:"cmH₂O",  factor:0.0980665 },
    ],
  },
  longitud: {
    label:"Longitud", icon:"📏",
    units: [ // base: mm
      { id:"mm", label:"mm", factor:1 },
      { id:"cm", label:"cm", factor:10 },
      { id:"m",  label:"m",  factor:1000 },
      { id:"in", label:"in", factor:25.4 },
      { id:"ft", label:"ft", factor:304.8 },
    ],
  },
  peso: {
    label:"Peso", icon:"⚖️",
    units: [ // base: g
      { id:"g",  label:"g",  factor:1 },
      { id:"kg", label:"kg", factor:1000 },
      { id:"lb", label:"lb", factor:453.592 },
      { id:"oz", label:"oz", factor:28.3495 },
    ],
  },
  volumen: {
    label:"Volumen", icon:"🧪",
    units: [ // base: mL
      { id:"ml",    label:"mL",       factor:1 },
      { id:"l",     label:"L",        factor:1000 },
      { id:"galus", label:"gal (US)", factor:3785.41 },
      { id:"floz",  label:"fl oz",    factor:29.5735 },
    ],
  },
  flujo: {
    label:"Flujo", icon:"💧",
    units: [ // base: mL/min
      { id:"mlmin", label:"mL/min", factor:1 },
      { id:"lmin",  label:"L/min",  factor:1000 },
      { id:"lh",    label:"L/h",    factor:1000/60 },
      { id:"mlh",   label:"mL/h",   factor:1/60 },
    ],
  },
  resistencia: {
    label:"Resistencia", icon:"🔴",
    units: [ // base: Ω
      { id:"ohm",  label:"Ω",  factor:1 },
      { id:"kohm", label:"kΩ", factor:1e3 },
      { id:"mohm", label:"MΩ", factor:1e6 },
    ],
  },
  conductividad: {
    label:"Conductividad", icon:"⚡",
    units: [ // base: µS/cm
      { id:"us", label:"µS/cm", factor:1 },
      { id:"ms", label:"mS/cm", factor:1000 },
      { id:"sm", label:"S/m",   factor:10000 },
    ],
  },
};

function convertAll(catId, unitId, rawValue) {
  const val = parseFloat(rawValue);
  if (isNaN(val)) return null;
  const cat = UNIT_CATEGORIES[catId];
  const src = cat.units.find(u=>u.id===unitId);
  if (!src) return null;
  const base = src.toBase ? src.toBase(val) : val * src.factor;
  return cat.units.map(u => ({
    id: u.id, label: u.label,
    value: u.fromBase ? u.fromBase(base) : base / u.factor,
  }));
}

function fmtNum(v) {
  if (v===null || v===undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 0.001 || abs >= 1e6)) return v.toExponential(3);
  const decimals = abs>=100 ? 1 : abs>=1 ? 3 : 6;
  return parseFloat(v.toFixed(decimals)).toString();
}

// ── Convertidor de Unidades ───────────────────────────────────────────────────
function ToolConvertidor() {
  const col = C.blue;
  const [cat, setCat] = useState("temperatura");
  const [unitId, setUnitId] = useState(UNIT_CATEGORIES.temperatura.units[0].id);
  const [value, setValue] = useState("37");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { setUnitId(UNIT_CATEGORIES[cat].units[0].id); }, [cat]);

  const category = UNIT_CATEGORIES[cat];
  const results = convertAll(cat, unitId, value);

  const copy = (id, val) => {
    navigator.clipboard?.writeText(fmtNum(val)).then(() => {
      setCopiedId(id); setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div style={S.wrap}>
      <div style={S.st(col)}>▸ Convertidor de Unidades</div>

      {/* Categorías */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {Object.entries(UNIT_CATEGORIES).map(([id,c]) => (
          <button key={id} style={{border:`1px solid ${cat===id?col:C.bord}`,borderRadius:8,
            padding:"6px 10px",cursor:"pointer",fontFamily:MONO,fontSize:10,
            color:cat===id?col:C.dim,background:cat===id?`rgba(${rgb(col)},0.12)`:"rgba(255,255,255,0.04)"}}
            onClick={()=>setCat(id)}>{c.icon} {c.label}</button>
        ))}
      </div>

      {/* Valor + unidad origen */}
      <div style={S.row}>
        <input style={{...S.inp,flex:1,fontSize:20,fontFamily:MONO,fontWeight:700}}
          type="number" inputMode="decimal" value={value}
          onChange={e=>setValue(e.target.value)} placeholder="0"/>
        <select style={{...S.sel,flex:"0 0 112px"}} value={unitId} onChange={e=>setUnitId(e.target.value)}>
          {category.units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>

      {/* Resultados */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {results
          ? results.filter(r=>r.id!==unitId).map(r => (
              <div key={r.id} style={{...S.disp(col),display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"12px 16px",cursor:"pointer"}}
                onClick={()=>copy(r.id,r.value)}>
                <div>
                  <div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:1}}>{r.label}</div>
                  <div style={{fontFamily:MONO,fontSize:24,fontWeight:700,color:col,textShadow:`0 0 14px ${col}`}}>
                    {fmtNum(r.value)}
                  </div>
                </div>
                <span style={{fontFamily:MONO,fontSize:10,color:copiedId===r.id?C.green:C.dim}}>
                  {copiedId===r.id?"✓ Copiado":"📋"}
                </span>
              </div>
            ))
          : <div style={S.note}>Ingresá un valor numérico.</div>
        }
      </div>

      <div style={S.note}>
        Tocá un resultado para copiarlo. Presión y flujo son útiles para monitores y equipos de diálisis;
        conductividad para el agua de tratamiento.
      </div>
    </div>
  );
}

export { ToolConvertidor };
