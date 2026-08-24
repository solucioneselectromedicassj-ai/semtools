# SEM Tools v2

PWA de herramientas para taller biomédico — Soluciones Electromédicas SJ

## Herramientas incluidas

| Tool | Descripción |
|---|---|
| 🔴 Resistencias | Cámara + Claude → bandas de color → valor Ω |
| ◻ Integrados IC | Cámara + Claude → identificación + cómo probar |
| 📏 Distancia | Foto → Claude estima / tap-to-measure |
| ⚙️ Tacómetro | Estroboscopio → RPM (torch o pantalla) |
| 🔌 Lector Jack | Módulos ThermoJack / AirJack / VoltJack |
| 📊 Decibelímetro | Nivel SPL en tiempo real |
| ⦿ Nivel | Burbuja digital ±1° |
| 〜 Osciloscopio | Forma de onda + frecuencia dominante |

## Deploy

```bash
npm install
npm run dev       # desarrollo local
npm run build     # build para producción
```

Conectar repo a Vercel → deploy automático en cada push.

## Módulos físicos compatibles (Jack 3.5mm)

- **ThermoJack**: NTC 10kΩ + LM358 → temperatura
- **AirJack**: hilo caliente NiCr → velocidad de flujo
- **VoltJack**: divisor resistivo → tensión

## Stack

React 18 + Vite + vite-plugin-pwa
API: Anthropic claude-sonnet-4-6 (visión por cámara)
