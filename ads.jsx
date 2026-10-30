import React, { useEffect, useRef } from "react";

// ── Banner de AdSense ─────────────────────────────────────────────────────────
// Reemplazá estos dos valores cuando Google AdSense apruebe el sitio
// (semtools-gilt.vercel.app) y crees el bloque de anuncio "Banner Home".
// Hasta entonces el componente no renderiza nada (return null) — no rompe
// nada ni pega a Google con credenciales inválidas.
const ADSENSE_CLIENT = "ca-pub-REEMPLAZAR";   // ej: ca-pub-1234567890123456
const ADSENSE_SLOT_HOME = "REEMPLAZAR";       // ej: 1234567890 (ID del bloque de anuncio)

let scriptLoaded = false;
function loadAdSenseScript(client) {
  if (scriptLoaded) return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

// Banner fijo para el Home — no se monta nunca sobre pantallas de cámara/sensores.
function AdBanner() {
  const pushedRef = useRef(false);
  const ready = ADSENSE_CLIENT !== "ca-pub-REEMPLAZAR" && ADSENSE_SLOT_HOME !== "REEMPLAZAR";

  useEffect(() => {
    if (!ready || pushedRef.current) return;
    pushedRef.current = true;
    loadAdSenseScript(ADSENSE_CLIENT);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (_e) {}
  }, [ready]);

  if (!ready) return null;

  return (
    <div style={{ padding:"6px 0 2px", textAlign:"center", flexShrink:0 }}>
      <ins className="adsbygoogle" style={{ display:"block" }}
        data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT_HOME}
        data-ad-format="auto" data-full-width-responsive="true"/>
    </div>
  );
}

export { AdBanner };
