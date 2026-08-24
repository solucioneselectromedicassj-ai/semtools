# ThermoJack — Módulo de temperatura para jack 3.5mm

## Principio de funcionamiento

La resistencia del NTC varía con la temperatura (β≈3950K).
Un divisor resistivo convierte esa variación a tensión.
El LM358 como buffer la lleva al jack sin cargar el divisor.
El celular "escucha" la tensión como señal de micrófono.

## Esquema

```
    +5V (USB) o +3.7V (LiPo)
        │
       [R1 = 10kΩ 1%]
        │
        ├──────────────────── A+ LM358 (pin 3)
        │                         │
      [NTC 10kΩ @ 25°C]          LM358 buffer
        │                     (salida = entrada)
       GND                        │
                               [C1 = 10µF] ──── TIP (jack 3.5mm)
                               (bloqueo DC)
                                  │
                                 GND ────────── RING (jack 3.5mm)

Componentes:
  NTC  : 10kΩ @ 25°C, β=3950K (ej: NTCLE203E3103SB0)
  R1   : 10kΩ 1% (resistencia de referencia)
  LM358: op-amp simple suministro (pin 8=Vcc, pin 4=GND)
  C1   : 10µF electrolítico (bloqueo DC para jack)
  Jack : conector TRRS 3.5mm hembra (TIP=señal, RING1=GND)
  Alim : 3.3V–5V (pila AA o USB)
```

## Tensión de salida vs temperatura

Vout = Vcc × NTC(T) / (R1 + NTC(T))

Con Vcc=3.3V, R1=10kΩ:

| T (°C) | NTC (kΩ) | Vout (mV) |
|--------|----------|-----------|
| 0      | 32.65    | 2,539     |
| 10     | 19.90    | 2,201     |
| 20     | 12.49    | 1,799     |
| 25     | 10.00    | 1,650     |
| 30     | 8.06     | 1,461     |
| 37     | 5.89     | 1,178     |
| 50     | 3.60     | 790       |
| 70     | 1.75     | 432       |

## Calibración en la app (ToolJack → ThermoJack)

La app lee un valor normalizado V (0–1) del ADC de audio.
Fórmula calibrada (ajustar A y B para cada unidad):

  T(°C) = A × ln(V / (1 - V)) + B

Calibración de 2 puntos:
1. Sumergí el NTC en agua+hielo (0°C) → anotá V₀
2. Sumergí en agua hirviendo (100°C) → anotá V₁
3. Calculá A = 100 / (ln(V₁/(1-V₁)) - ln(V₀/(1-V₀)))
4. B = -A × ln(V₀/(1-V₀))

## PCB (tamaño tarjeta SIM)

```
┌──────────────────────────────┐
│  +  NTC   R1   LM358   C1   │──── Jack 3.5mm
│  ─  ──────────────────────  │
└──────────────────────────────┘
       30mm × 12mm
```

## Costo de fabricación

| Componente   | Unidad |
|---|---|
| NTC 10kΩ     | $0.20  |
| Resistor 10k | $0.05  |
| LM358        | $0.30  |
| Cap 10µF     | $0.10  |
| Jack 3.5mm   | $0.50  |
| PCB          | $0.80  |
| Caja/Encapsul| $1.00  |
| **TOTAL**    | **~$3.00** |

Precio de venta sugerido: $15–20 USD
