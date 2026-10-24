# Actualización de la guía (revisión de las 16:50)

`docs/GUIA.md` describe el prototipo de las 14:00: 5 bots, mapa chico, contrato v1 y una "visión" que ya está hecha. Este documento trae **el texto listo para reemplazar**, sección por sección. Todo lo que dice se comprobó contra `main` (`b08e47b`, después de los cambios de Gandy de las 16:40). Los valores de configuración salen de `Game.config` en ese commit.

**Regla para no volver a desfasarnos:** cada PR que cambie el comportamiento del juego actualiza en el mismo PR su parte de `GUIA.md` y la tabla de `Game.config` (§10).

Responsable de aplicarlo: **Gandy**, dueño de `docs/GUIA.md` y de la guía dentro del juego (`js/ui.js`).

---

## 1. `docs/GUIA.md`

### Aviso inicial (línea 5)
Reemplazar el bloque `> Estado verificado…` por:
```md
> Estado verificado el 2026-10-24 sobre `main` (`b08e47b`): carga `content.js`, `quantum.js`, `ui.js`, `game.js` y la portada 3D opcional (`vendor/three.min.js` + `intro3d.js`). Detalle en la sección 9.
```

### §4. Cómo es una partida (reemplazar entera)
La versión de Gandy de las 16:43 tiene dos errores que este reemplazo corrige:
- **una frase rota en el punto 1:** "…no demuestra nada). de pasarse Se navega…";
- **dos puntos numerados "2."**.

También conserva su punto nuevo "Cómo enseña el juego mientras juegas".
```md
## 4. Cómo es una partida
1. **Pantalla de inicio:** portada 3D (o 2D si no hay WebGL), los botones **Jugar**, **Ruta de aprendizaje** y **Cómo jugar**. "Cómo jugar" es una guía de 12 diapositivas: el reto, cómo se juega, la Ruta en 4 rondas, controles con teclas dibujadas, qué te avisa el juego, los dos cañones, qué tiene que ver con la computación cuántica, tu cañón como circuito interactivo, un laboratorio de k con el anillo en 3D, la trampa de pasarse con gráfico, un glosario y por qué una partida no demuestra nada. Se navega con los botones o con `←` `→` `Esc`. "Más sobre el juego" despliega el contexto y los mitos.
2. **Cómo enseña el juego mientras juegas** (todo en `js/ui.js`):
   - **Tarjetas a la izquierda, bajo el HUD:** definen cada término la primera vez que aparece (radar, pieza recogida, zona inestable, tormenta, tipo de bala, consulta…) y, después de cada disparo, explican qué pasó con la teoría y el recuento real. Cada definición sale una vez por sesión.
   - **Fin de ronda** (`UI.showRoundEnd`): la idea de la ronda (`Content.cards`), las palabras nuevas y observado frente a teoría.
   - **Glosario único:** `UI.defs` y `UI.glossary` alimentan la guía, las tarjetas y el fin de ronda. Sus textos pasan `Content.audit`.
3. **Arena:** un mapa de 3200×2200 con **10 bots** que deambulan, se esconden en la niebla y pelean entre sí y contra ti. El **minimapa** (abajo a la derecha) muestra la niebla, la zona, las piezas y solo los bots que estás viendo.
4. **La niebla está viva:** son bancos de humo irregulares que **crecen por fases** (cada 25 s), los **arrastra el viento** (el indicador "Viento →" dice hacia dónde) y cada 35 s uno **se disipa** y reaparece en otro lugar, dejando expuestos a los que se escondían ahí.
5. **La zona se cierra:** cada 30 s la zona segura se achica. **Afuera está la tormenta:** pierdes 4 de vida por segundo y **el sensor falla** (para los dos cañones).
6. **Disparo normal** (clic izquierdo o `F`): para enemigos que ves en campo abierto. Las balas `1` dañan (12). Con una bala `0` (teclas `Z`/`X` o los pickups del piso) **te curas tú** al impactar (8). Las **zonas inestables** (≈) del piso vuelven aleatorio el efecto de las balas que las cruzan.
7. **Radar:** si hay un enemigo **dentro de la niebla y a tu alcance** (380), el HUD muestra "¡Hay alguien! (Espacio)". Sabes *que* hay alguien, pero **no en cuál de los 8 sectores**.
8. **Tu cañón cuántico se arma con piezas:** empiezas solo con el clásico. Por el mapa hay piezas **H** (superposición), **M** (marcador), **D** (difusor), **S** (estabilizador) y, después del minuto, a veces una **C** (calibrador). Al pasar por encima se agregan **en ese orden** a tu circuito (hasta 8). `R` suelta la última. Siempre aparecen H, M y D cerca del inicio.
9. **Disparo de búsqueda** (`Espacio` o clic derecho):
   - **Clásico:** k consultas, que eliges con `Q`/`E` (0 a 3).
   - **Cuántico:** k es la **cantidad de marcadores (M)** de tu circuito; Q/E no lo cambian.
   - Cada consulta o marcador cuesta **20 de energía** (máximo 100, se regenera 9 por segundo).
   - El juego entra en **cámara lenta ~1 s** y muestra las 8 barras. El disparo sale hacia un sector **muestreado** según esas barras: si coincide con el del enemigo, aciertas (60 de daño).
10. **Fin:** ganas si eres el último en pie y pierdes si te eliminan. Aparece la **pantalla final** (sección 5).

**Otros modos:**
- **Ruta de aprendizaje** (botón en el inicio, o `?ruta` / `?ruta=N`): 4 rondas cortas de un concepto cada una (Niebla → Amplitudes → Sobre-rotación → Ruido), en el mapa chico. El progreso se guarda.
- **Demo** (`?demo`): el mapa chico de siempre, k libre y sin piezas, para la presentación (ver `docs/DEMO.md`).
```

### §5. Agregar estas subsecciones (antes de "Pantalla final")
```md
### Las piezas del circuito
| Pieza | Qué hace | Consecuencia que vas a ver |
|---|---|---|
| **H** | Reparte la amplitud entre los 8 sectores | Sin H, el difusor no mejora nada (`[M][D]` ≈ 6 %) |
| **M** | Invierte el signo de la amplitud del sector que percibe el sensor. Cuesta 1 consulta | Solo no cambia ninguna probabilidad (`[H][M]` = 12,5 %) |
| **D** | Hace interferir las amplitudes | Cada par M + D es una iteración. Sin ruido: `[H][M][D]` 78 %, dos pares 94,5 %, tres pares 33 %. Con el ruido del juego: ≈ 74 / 90 / 33 % |
| **S** | No cambia el estado: divide a la mitad el ruido del circuito | Con dos pares y S: ≈ 94 % en vez de ≈ 90 % |
| **C** | **Calibrador:** ajusta la fase φ de M y D con descenso de gradiente, un paso por disparo (panel violeta con la curva) | Con 3 pares corrige la sobre-rotación: φ ≈ 78° y del 33 % sube a ~95 % |

Los porcentajes "con ruido" usan el valor del juego (σ = 0,152, un tercio del calibrado con IBM) y salen del simulador (`Quantum.runCircuit`).

### Los dos tipos de ruido
- **Ruido en los datos (tormenta):** el sensor percibe un sector equivocado el 25 % de las veces. Afecta **a los dos cañones**: el clásico descarta mal y el cuántico marca el sector equivocado.
- **Ruido del circuito (desfase):** una fase al azar después de cada pieza. Afecta **solo al cuántico**. El estabilizador (S) lo reduce.
```

En "Pantalla final", agregar una viñeta:
```md
- **Conceptos n/9:** cada logro es un objetivo de aprendizaje (por ejemplo, "El marcador solo no basta" o "Sobre-rotación"). Se desbloquean jugando y se guardan entre partidas.
```

### §6. Por qué la comparación es justa (última viñeta)
Reemplazar `- Ruidos separados y apagados por defecto: …` por:
```md
- Ruidos separados: el de los datos (`sensorFlip`, tormenta) afecta a **ambos** cañones; el del circuito (`phaseNoise`) solo al cuántico. El del circuito está activo con σ = 0,152 (un tercio del nivel calibrado con `FakeSherbrooke`, `Quantum.CALIBRATED_PHASE_NOISE` = 0,46).
- Los bots usan **el mismo simulador y las mismas reglas** que el jugador.
```

### §7. Qué NO afirma el juego (primera viñeta, línea 80)
```md
- El clásico usa la **mejor estrategia clásica posible** para este problema: ningún método clásico supera (k+1)/8 con k consultas. La ventaja de Grover en número de consultas es real para la búsqueda no estructurada idealizada; con 8 sectores es un ejemplo pedagógico, no una demostración de ventaja práctica.
```
Y agregar al final de la sección:
```md
- Las **zonas inestables** (≈) del piso son una mecánica de juego con probabilidades fijas, **no** una simulación de superposición.
- El **calibrador** entrena un circuito parametrizado, como en QML; no es "inteligencia artificial".
```

### §8. Contrato (reemplazar el bloque de código)
```js
// ---- Quantum (Avix) ----
Quantum.runQuantum({ k, target, phaseNoise, sensorFlip })   // → { amps, probs, theory, misreads }
Quantum.runClassical({ k, target, sensorFlip })             // → { probs, discarded, found, theory, misreads }
Quantum.runCircuit({ pieces, target, phaseNoise, sensorFlip, phi })
  // → { amps, probs, ideal, theory, queries, misreads }   pieces: ['H','M','D','S','C',…]
Quantum.gradient({ pieces, phi, phaseNoise })               // → { value, dphi }  (desplazamiento de parámetros)
Quantum.exactPhi(k)                                         // φ de la búsqueda exacta (k=2 → 121,9°, k=3 → 78,0°)
Quantum.sample(probs)  Quantum.toQiskit(piecesOrK, target, phi)  Quantum.selfTest()
Quantum.CALIBRATED_PHASE_NOISE                              // 0,46

// ---- UI (Gandy) ----
UI.drawHUD(ctx, state)   UI.drawSectors(ctx, x, y, result, cannon)
UI.showStart(onPlay)     UI.showEnd(log, onReplay, history)   UI.showGuide(onClose)
UI.showRoundEnd(info, onNext)        // info = { round, total, titulo, card, passed, log }
UI.defs  UI.glossary  UI.teachEvents  // glosario y tarjetas que enseñan mientras se juega
// opcionales (si faltan, Game dibuja un respaldo):
UI.drawCircuit(ctx, state)   UI.drawCalibration(ctx, { phi, curve })

// ---- Game (Lucas) ----
Game.start()   Game.startRoute(n)   Game.config   Game.state
Game.log / Game.history   // [{ cannon, k, target, shot, hit, theory, t, zone, sensorFlip, phaseNoise, misreads, circuit, phi }]
Game.collection           // { unlocked: { id: fecha }, stats }      Game.ACHIEVEMENTS (9 ids)
Game.routeProgress        // rondas superadas (0..4)                 Game.ROUTE_LENGTH
Game.record               // { kills, quantumAcc }

// ---- Content (Alvaro) ----
Content.start  Content.cards  Content.hints  Content.pickCard(log)  Content.myths  Content.truths
// pendientes (Game usa respaldos): Content.pieces, Content.achievements, Content.rounds, Content.cards.calibracion
```

### §9. Estado de la integración (reemplazar entera)
```md
## 9. Estado de la integración (verificado)
Sobre `main` (`b08e47b`):
- `Quantum.selfTest()`: todo en verde, incluida la comparación con los fixtures de Qiskit (41 casos, error ~1e-15).
- `node test/check-contract.js`: OK. `node test/check-content.js`: OK.
- `node test/run-ui-tests.js`: 92 de 92 con `jsdom` (incluye la portada 3D y las tarjetas).
- Prueba de punta a punta con los 4 módulos y la portada (sin WebGL cae al 2D): inicio → botón **Ruta de aprendizaje** → ronda 1 y 2 superadas con su pantalla de fin de ronda → battle royale con tarjetas educativas → pantalla final, sin errores.
- **No verificado:** rendimiento en celular real (ver la sección "Rendimiento" de `docs/ACTUALIZACION-GUIA.md`).
```

### §10. Ajustes rápidos (reemplazar la tabla)
| Clave | Valor | Qué hace |
|---|---|---|
| `world` | 3200×2200 | Tamaño del mapa (aplica al reiniciar) |
| `bots` | 10 | Cantidad de bots (aplica al reiniciar) |
| `costPerQuery` | 20 | Energía por consulta o marcador (igual para ambos) |
| `energyRegen` | 9 / s | Regeneración de energía |
| `radarRange` | 380 | Alcance del radar |
| `slowmoDuration` | 1,1 s | Cuánto se ven las barras antes del tiro |
| `bulletDamage` / `bulletHeal` | 12 / 8 | Daño de la bala 1 / curación de la bala 0 (para quien dispara) |
| `phaseNoise` | 0,152 | Ruido del circuito (solo cuántico); se calcula como `phaseNoiseScale` × 0,46 |
| `phaseNoiseScale` | 0,33 | Fracción del ruido calibrado con IBM (1,0 = nivel completo, k=2 ≈ 60 %) |
| `sensorFlip` / `stormSensorFlip` | 0 / 0,25 | Ruido del sensor en niebla normal / en la tormenta (ambos cañones) |
| `zoneEnabled`, `zonePhaseEvery`, `zoneShrink`, `zoneMinR`, `zoneDamage` | sí, 30 s, 0,7, 380, 4/s | La zona que se cierra |
| `fogPhaseEvery`, `fogPhaseStep`, `fogMaxScale` | 25 s, 0,15, 1,6 | Crecimiento de la niebla |
| `fogAlive`, `windSpeed`, `windChangeEvery`, `dissipateEvery` | sí, 18, 20 s, 35 s | Viento y bancos que se disipan |
| `loot`, `lootInitial`, `lootEvery`, `lootMax`, `circuitMax` | sí, 12, 8 s, 20, 8 | Piezas del circuito |
| `lootWeights` | H 20 · M 30 · D 30 · S 10 | Probabilidad de cada pieza |
| `calibAfter`, `calibLr`, `calibMaxStep` | 60 s, 1, 0,5 | Calibrador (C) |
| `botSearchCooldown` / `botSearchDamage` | 3,5 s / 10 | Bots que te buscan cuando te escondes |

Ejemplo: `Game.config.stormSensorFlip = 0.5` y busca dentro de la tormenta: los dos cañones fallan mucho más, porque ningún método salva datos malos.

### §11. Problemas frecuentes (reemplazar la tabla)
| Síntoma | Causa probable |
|---|---|
| La página dice "Faltan módulos: …" | Falta o falla un `<script>`. Revisa la consola y el orden de carga |
| `Espacio` no hace nada | El radar no detecta a nadie en la niebla, no alcanza la energía (k × 20) o tu circuito cuántico está vacío |
| `Q`/`E` no cambia k en el cuántico | Es a propósito: en el cuántico, k = cantidad de marcadores (M). Recoge o suelta piezas (`R`) |
| `[H][M]` no mejora nada | Correcto: el marcador solo cambia un signo. Falta el difusor (D) |
| El cuántico "falla más" con 3 pares | Es la sobre-rotación. Suelta un par con `R`, o consigue el calibrador (C) |
| Pierdo vida sin que nadie me dispare | Estás fuera de la zona: aviso "FUERA DE LA ZONA" arriba |
| Quiero repetir una ronda de la Ruta | `?ruta=N` en la URL (o `Game.startRoute(N)` en la consola) |
| Nada se ve en el celular | Abre por HTTP (GitHub Pages) y recarga |

### §12. Fuera del prototipo / visión (reemplazar entera)
```md
## 12. Hecho y visión
**Ya está en el prototipo** (antes era visión): zona que se cierra, loot de piezas de circuito, bots con arquetipos, ruido calibrado con un backend falso de IBM, auto-calibración con descenso de gradiente (calibrador), Ruta de aprendizaje y colección de conceptos.

**Visión:** arena más grande con niebla generada y "desafío del día", 7 tipos de enemigos que encarnan un concepto cada uno, estadísticas de precisión de los enemigos, controles táctiles, leaderboard, 4 qubits (16 sectores) y correr el desafío del día en hardware real de IBM.
```

---

## 2. Guía "Cómo jugar" dentro del juego (`js/ui.js`, `DEFAULT_GUIDE`)

Tiene 12 diapositivas y ya está al día con los controles, las piezas H, M y D, la tecla `R`, la Ruta, los avisos, el glosario y la frase de la ventaja. Faltan dos cosas:

1. **Nueva diapositiva "El mapa"**, después de "Controles". Es información para jugar, no un concepto, así que no rompe el pilar de "explicar después":
   ```js
   { titulo: 'El mapa', texto:
     'La niebla crece, la mueve el viento y a veces se disipa: los escondites cambian.\n' +
     'La zona segura se cierra por fases. Afuera, la tormenta te quita vida y hace que el sensor falle.\n' +
     'El minimapa muestra la niebla, la zona y las piezas; nunca a los enemigos escondidos.' },
   ```
2. **Diapositiva "Tu cañón cuántico es un circuito"**: agregar una línea al final de su `texto`:
   ```js
   'También hay piezas raras: S (estabilizador) reduce el ruido y C (calibrador) aprende a ajustar el circuito mientras disparas.'
   ```

**No** explicar en la guía los dos tipos de ruido ni cómo funciona el calibrador: eso lo hacen las tarjetas al final (pilar 5).

---

## 3. Rendimiento: medir antes de agrandar el mapa

Metas: **60 fps en laptop** y **≥ 30 fps en celular**, con un tiempo de cuadro de ~16 ms.

1. **Medir primero:** un contador de FPS opcional (`?fps`) en una esquina. Anotar los fps de `main` hoy en una laptop y en un celular: esa es la línea base.
2. **Niebla:** hoy se crea un degradado radial por cada círculo visible en cada cuadro. **Medido en `main`: 6–9 por cuadro** en una pantalla de laptop al empezar, y suben a medida que la niebla crece y con la arena XL. **Pre-dibujar cada banco** una vez en un canvas aparte y después solo copiarlo con `drawImage` (moverlo o escalarlo es barato). Es el ahorro más grande y es requisito antes de llegar a ~70 círculos.
3. **Minimapa:** redibuja todos los círculos de niebla en cada cuadro. Dibujar el fondo (niebla y zona) en una capa y refrescarla cada ~0,5 s; encima, solo los puntos que se mueven.
4. **`devicePixelRatio`:** limitarlo a 2 en `resize()` (`Math.min(2, window.devicePixelRatio || 1)`). En celulares con 3×, el canvas tiene 9 veces más píxeles.
5. **"¿Está en la niebla?":** se calcula muchas veces por cuadro para cada tanque. Calcularlo una vez por tanque por cuadro y guardarlo.
6. **Calibrador con ruido:** `Quantum.gradient` con `phaseNoise` tarda ~13 ms por llamada (40 simulaciones por sector). Para el jugador está bien (una vez por disparo). Si un bot lo usa, que entrene **sin ruido** o con menos simulaciones.
7. **Portada 3D:** ya se detiene al cerrar el inicio (verificado). Three.js son 600 KB, que GitHub Pages sirve comprimidos a ~155 KB.

---

## 4. Si se mergea `feat/cambios-arena-guia-v2x`

Esa rama, de prueba, cambia valores que aparecen en la guía. Si entra a `main`, actualizar en el mismo PR:
- **§4 "Arena":** 4800×3200 con **14 bots**; cámara alejada (0,85); la niebla se genera con una semilla (`?semilla=N`, `?dia` para el desafío del día), con corredores, y cubre ~35 % del mapa al empezar y ~55 % al final.
- **§10 tabla:**
  - cambian `world` 4800×3200, `bots` 14, `lootInitial` 18, `lootEvery` 6 s, `lootMax` 28, `fogPhaseStep` 0,1 y `fogMaxScale` 1,35;
  - son nuevos `cameraZoom` 0,85, `fogCoverage` 0,35, `fogMaxBanks` 24 y `fogCorridors` 3.
- **§11:** agregar "¿Cómo veo los fps? `?fps` en la URL".
- **Rendimiento (§3 de este documento):** los puntos 2 a 5 ya están hechos en esa rama. Medido: 0 degradados por cuadro (antes 6–9), ~25 `arc` (antes ~70) y 2,2× menos píxeles en pantallas 3×.
