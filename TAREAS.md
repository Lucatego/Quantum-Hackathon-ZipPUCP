# Collapse: división de tareas del prototipo

> Quedan **2 horas** para la entrega. Lo que se evalúa es un **prototipo funcional y una buena idea/pitch**, no el sistema completo.
> Brief completo: [`INDICACIONES.md`](INDICACIONES.md).
>
> **Actualización 13:50:** la fase 1 (motor, simulador, UI) ya está en `main`. Abajo están el estado y las tareas de la **fase 2: contenidos**. La división original de la fase 1 se mantiene más abajo como referencia.
> Para **jugar o entender cómo encaja cada pieza**, ver [`docs/GUIA.md`](docs/GUIA.md) (Gandy). Este archivo es el plan de trabajo; la guía es el manual.

## Estado al 14:10 y tareas finales (freeze 14:35)

**El juego está completo e integrado en `main`.** Pruebas sobre `origin/main`:
- `selfTest` en verde, incluida la comparación con los fixtures de Qiskit;
- UI: 34 de 34 pruebas;
- `check-contract`: OK, sin pendientes;
- `check-content`: OK;
- prueba de punta a punta con los 4 módulos (pistas, tarjeta final y código Qiskit).

| Pieza | Estado |
|---|---|
| Motor, tormenta, ruido, pistas, récord, bots con arquetipos (Lucas) | Listo |
| Simulador, `misreads`, perfil de ruido IBM, Colab (Avix) | Listo |
| UI + guía "Cómo jugar" dentro del juego (Gandy) | Listo, con 1 frase a corregir |
| `content.js`: tarjetas, pistas, `pickCard`, auditor del checklist (Alvaro) | Listo y correcto |
| Pitch (Alvaro) | **Borrador: falta el centro** (ver abajo) |
| UI fase 2: leyenda, modo profundización, pantalla final con ruido | **No hecho.** El ruido se registra, pero el jugador no lo ve |
| σ del ruido del circuito | **Falta decidir:** 0,15 (actual, k=2 ≈ 90 %) o 0,46 (calibrado, k=2 ≈ 60 %) |
| `docs/GUIA.md` | Desactualizada (contrato v1, §7) |
| Prueba en navegador y celular real | **Nadie la ha hecho todavía** |

### Problemas a corregir antes del freeze
1. **El juego se contradice sobre la "ventaja cuántica".**
   - `js/ui.js:245` (última diapositiva de "Cómo jugar") dice "ni una ventaja cuántica real".
   - La tarjeta `interferencia` de `content.js` dice, correctamente, que la ventaja en consultas está demostrada para la búsqueda no estructurada idealizada.
   - `docs/GUIA.md:79` dice que el clásico "no es el mejor algoritmo posible", y `probClasica` dice lo contrario, que es lo correcto.
   - Usar la misma frase en los tres lugares: *"Es una simulación didáctica de 3 qubits. La ventaja de Grover en número de consultas es real para la búsqueda no estructurada idealizada, pero con 8 sectores esto no demuestra una ventaja práctica."*
2. **El pitch no cuenta qué hace el juego.** El borrador tiene un buen gancho y un buen cierre, pero:
   - Habla de "aprender inteligencia artificial / Quantum Machine Learning", y el prototipo **no tiene ML**: enseña **probabilidad clásica (muestreo, probabilidad condicional) vs. amplitudes e interferencia (Grover)**. El reto pide justo eso, "un concepto de Estadística/ML y su equivalente cuántico", y hay que decirlo con esas palabras. El QML va como **visión** (auto-calibración por descenso de gradiente = entrenamiento de un circuito variacional), no como algo que ya hace.
   - No menciona tanques, niebla, los 8 sectores, la comparación justa, la tabla 8.4, la demo, la validación con Qiskit, el ruido calibrado ni las limitaciones. Sin eso, suena genérico (riesgo "AI slop" del brief).
   - Se subió directo a `main`, con un mensaje fuera de estilo y sin extensión `.md`. No rompe nada; para la próxima, usar `feat/pitch`.

### Tareas hasta el freeze (14:10 → 14:35)
**ALVARO (pitch, prioridad 1):** pasarlo a `pitch/PITCH.md` y armarlo para 3 minutos. Se conservan su apertura y su cierre:

| Tiempo | Bloque | Qué decir |
|---|---|---|
| 0:00–0:20 | Gancho | Su apertura, cambiando "IA" por "probabilidad y computación cuántica" |
| 0:20–0:45 | El reto, en sus términos | "Tomamos **probabilidad clásica** (muestreo y descarte) y mostramos su equivalente cuántico: **amplitudes que interfieren** (Grover)". Tabla de la sección 3 |
| 0:45–1:45 | **Demo en vivo** (Lucas juega) | Radar → clásico con k=2 (37,5 %) → cuántico con k=2 (~95 %) → cuántico con k=3 que falla (33 %) → tormenta → pantalla final con tarjeta y Qiskit |
| 1:45–2:15 | Rigor | "La física está verificada contra Qiskit (error de 1e-15)". "El ruido del circuito es un modelo de un parámetro ajustado al perfil de un procesador IBM simulado". Dato fuerte: con ese ruido, el k óptimo baja de 2 a 1 |
| 2:15–2:40 | Honestidad y visión | Comparación justa y sus límites (oráculo como abstracción, 8 sectores no demuestran ventaja práctica). Visión: BR completo, auto-calibración con gradiente (puente con QML), 4 qubits, hardware real |
| 2:40–3:00 | Cierre | "Aprendes probabilidad cuántica porque te sirve para ganar" + su frase final + QR |

**GANDY:**
1. (5 min) Corregir `ui.js:245` y `GUIA.md` §7 con la frase de arriba.
2. (15 min, si da) Bloque de ruido en la pantalla final: búsquedas en tormenta, cuántas con `misreads > 0` y el acumulado de `history`.
3. Probar en el celular con el QR.

**LUCAS:**
1. Aplicar el σ que decida el equipo en `config.phaseNoise`.
2. **Jugar en el navegador real** (Pages) y ajustar el balance (daño de los bots buscadores, energía).
3. Ensayar la ruta de la demo de 60 s del guion y mantener abierta una pestaña de respaldo.

**AVIX:**
1. Revisar que las afirmaciones técnicas del pitch sean correctas.
2. Dejar lista una slide con la tabla 8.4 junto a la curva Aer/FakeSherbrooke.
3. Dejar la celda de Colab abierta para correr el código exportado en vivo, si hay tiempo.

**14:35:** freeze, merge de los PRs, prueba de humo en Pages y celular. **14:45:** ensayo completo con el cronómetro.

## Estado al 13:45

| Pieza | Responsable | Estado |
|---|---|---|
| `js/quantum.js` + `test/quantum.html` | Avix | Listo. `selfTest` en verde: tabla 8.4 con error ~1e-16 |
| `qiskit/validate.py` + `fixtures/statevector_cases.json` | Avix | Listo. Coincide con el JS hasta 2e-15 |
| `toQiskit(k)` | Avix | Listo. El circuito exportado da 78,1 / 94,5 / 33,0 % en Qiskit |
| `js/game.js` + `test/game.html` | Lucas | Listo. Partida completa con los módulos reales |
| `js/ui.js` + tests | Gandy | Listo. 15 pruebas en Node; 24 con jsdom/navegador |
| GitHub Pages | Lucas | Activo: https://lucatego.github.io/Quantum-Hackathon-ZipPUCP/ |
| Integración en `main` | Todos | Hecha (`index.html` carga los módulos) |
| `js/content.js` | Alvaro | **Falta.** Sin él, la pantalla final no muestra tarjeta educativa |
| Slides y guion | Alvaro | **Falta.** `pitch/` tiene una sola línea |
| Ruido en la partida | Lucas | **Falta.** El simulador lo soporta, pero el juego lo tiene en 0 |
| `docs/GUIA.md` (guía para jugar e integrar) | Gandy | Lista en `feat/ui`, **falta el PR a `main`**. Describe el contrato v1; hay que actualizarla con el v2 al cierre |
| Textos con error conceptual | Avix | **Corregir.** El comentario de `toQiskit` dice que el sector "debería dominar", y no es así con k=0 ni con k=3 |

---

## Fase 2: contenidos (13:50 → 14:35)

Objetivo: que el jugador **vea y entienda** lo que pasa. Para eso hacen falta tarjetas, pistas en el momento justo, los dos tipos de ruido activos, la diferencia entre amplitud y probabilidad, y un pitch con evidencia.

Las tareas siguen siendo **independientes**. Todo lo nuevo del contrato es **opcional y compatible hacia atrás**: si alguien no termina, el juego sigue funcionando.

**Ramas de esta fase:** `feat/quantum-v2`, `feat/game-v2`, `feat/ui-v2` y `feat/content` (salen de `main` actualizado).

### Contrato v2 (solo agrega campos)
```js
// Quantum (Avix): el resultado dice cuántas veces el sensor se equivocó
Quantum.runQuantum(...)   // → { amps, probs, theory, misreads: número }
Quantum.runClassical(...) // → { probs, discarded, found, theory, misreads: número }

// Game (Lucas): cada entrada del log trae el contexto del ruido
Game.log[i] = { cannon, k, target, shot, hit, theory, t,
                zone: 'niebla' | 'tormenta', sensorFlip, phaseNoise, misreads }
Game.history  // todas las búsquedas de la sesión (varias partidas)
UI.showEnd(log, onReplay, history)  // el 3er parámetro es nuevo y opcional

// Content (Alvaro): pistas cortas que Game muestra UNA vez por sesión
Content.hints = { primeraBusqueda, primerCuantico, aciertoCuantico, sobreRotacion,
                  tormenta, ruidoCircuito, kCero }   // 1 línea cada una
```
**Cuándo dispara Game cada pista:**

| Pista | Cuándo |
|---|---|
| `primeraBusqueda` | primera vez que el radar detecta a alguien |
| `primerCuantico` | primer disparo con el cañón cuántico |
| `aciertoCuantico` | primer acierto cuántico con k ≥ 1 |
| `sobreRotacion` | primer fallo cuántico con k = 3 |
| `tormenta` | primer disparo de búsqueda dentro de la tormenta |
| `ruidoCircuito` | primer fallo cuántico con k = 2 |
| `kCero` | primer disparo con k = 0 |

Si `Content.hints[clave]` no existe, la pista no se muestra.

### AVIX: rigor y ruido real (`js/quantum.js`, `qiskit/`)
1. **(5 min) Textos.**
   - En el comentario final de `toQiskit`, reemplazar "debería dominar" por la probabilidad teórica para ese k (ej. "con k=3 la teoría da 33 %: ¡te pasaste de iteraciones!").
   - Corregir el comentario del difusor sobre |000⟩ (no devuelve |000⟩).
2. **(5 min) `misreads`:** contar en `runQuantum` y `runClassical` cuántas consultas percibieron un sector equivocado.
3. **(25 min) `qiskit/noise_profile.py`:**
   - Correr los circuitos k = 0..3 en Qiskit Aer con un backend falso de IBM (`qiskit_ibm_runtime.fake_provider`, ej. `FakeBrisbane` o `FakeManilaV2`).
   - Exportar P(acierto) por k a `qiskit/fixtures/noise_profile.json`.
   - Ajustar el `phaseNoise` (σ) del simulador JS que mejor reproduce esa curva y pasárselo a Lucas (un número).
4. **(Opcional)** Una celda de Colab lista para la demo: pegar el código exportado y correrlo en vivo.
5. Pasarle a Alvaro una frase honesta para el pitch: *"el desfase es un modelo de un solo parámetro, ajustado al perfil de ruido de un procesador IBM simulado"*.

**Hecho cuando:** `selfTest` sigue en verde, existe `noise_profile.json` y hay un σ recomendado.

### LUCAS: hacer visible el ruido y la progresión (`js/game.js`)
1. **Tormenta:** una de las zonas de niebla pasa a ser *tormenta*, con otro color y una etiqueta. Las búsquedas dentro de ella usan `sensorFlip = config.stormSensorFlip` (0,25). Afecta a **ambos** cañones.
2. **Ruido del circuito:** `config.phaseNoise = 0.15` provisional hasta recibir el valor de Avix. Afecta **solo** al cuántico.
3. **Log v2:** agregar `zone`, `sensorFlip`, `phaseNoise` y `misreads` (0 si Quantum no lo devuelve) y pasar `Game.history` a `UI.showEnd`.
4. **Pistas:** `hint(clave)` muestra `Content.hints[clave]` con el toast actual, una vez por sesión (según la tabla de arriba).
5. **Juice:** el tanque cambia de aspecto con el cañón cuántico (halo o color) y se guarda un récord personal en `localStorage` (bots eliminados y % de acierto cuántico), con try/catch.
6. **(Opcional)** Un bot "cuántico" que dispara al jugador escondido en la niebla con k = 2 y otro "ansioso" con k = 3. Ejemplos vivos de la comparación.

**Hecho cuando:** en `test/game.html` se ve la tormenta, los fallos por ruido aparecen en el log y las pistas salen (con un `Content.hints` de prueba).

### GANDY: que se lea la física (`js/ui.js`)
1. **Leyenda** en `drawSectors` durante la búsqueda: "barra = amplitud (azul +, rosa −) · cono = probabilidad", o "verde = posible · gris = descartado" en el clásico.
2. **Modo profundización:**
   - un interruptor "Ver más" en `showStart` guarda `UI.deep`;
   - con `UI.deep`, `drawSectors` muestra el valor de cada amplitud (ej. "+0,97", "−0,09") además del %;
   - el HUD muestra la fórmula: sin²((2k+1)θ) en el cuántico y (k+1)/8 en el clásico.
3. **Pantalla final v2:**
   - bloque **"Ruido"**: búsquedas en tormenta y aciertos perdidos por el sensor (`misreads > 0`), separado del ruido del circuito (`phaseNoise`);
   - **acumulado de la sesión** con `history` (varias partidas), junto a la frase "con más disparos, lo observado se acerca a la teoría";
   - destacar **"tu mejor k cuántico"**.
4. Probar en el celular con el QR (overlays y legibilidad).
5. **`docs/GUIA.md`:**
   - abrir ya el PR de `feat/ui` a `main` para que todos tengan la guía;
   - al cierre, actualizarla con el contrato v2 (`misreads`, `zone`, `history`, `Content.hints`), la tormenta y el ruido activo, y la tabla de `Game.config` (`stormSensorFlip`, `phaseNoise` ≠ 0);
   - revisar la frase de la §7 (ver "Observaciones" más abajo).

**Hecho cuando:** `test/ui.html` muestra la leyenda, el modo profundización y la pantalla final v2 con un log falso que incluye `zone`/`misreads`.

### ALVARO: contenido educativo y pitch (`js/content.js`, `pitch/`)
1. **(20 min, prioridad 1) `content.js`:**
   - `start` (3 líneas), las 7 `cards` (intuitivo de 2–4 líneas + profundo) y `hints` (1 línea cada una);
   - `pickCard(log)`, en este orden de prioridad:
     1. hubo un fallo cuántico con k=3 → `sobreRotacion`;
     2. hubo `misreads` → `ruidoDatos`;
     3. hubo fallo cuántico con `phaseNoise` > 0 → `ruidoCircuito`;
     4. hubo aciertos cuánticos → `interferencia`;
     5. solo se usó el clásico → `probClasica`;
     6. menos de 10 disparos → `pocasPartidas`.
2. **Revisar con el checklist de la sección 7** todos los textos que ve el jugador o el jurado: `say(...)` en `game.js`, `DEFAULT_START` en `ui.js`, los comentarios de `toQiskit` y `docs/GUIA.md` (sobre todo las §6 y §7). Los problemas se le **avisan al dueño del archivo**, no se editan.
3. **Slides** (orden de la fase 1) + guion de la demo de 60–90 s + preguntas del jurado. Usar la frase de calibración de Avix tal cual (es un ajuste efectivo, no "ruido real de IBM").
4. **Evidencia de aprendizaje:**
   - formulario pre/post de 4 preguntas (sección 12);
   - si da el tiempo, que 2–3 personas de otros equipos jueguen 2 minutos;
   - poner el resultado en una slide, aunque sea pequeño y diciendo que es preliminar.

**Hecho cuando:** `node test/check-contract.js` ya no marca `content.js` como pendiente y las slides están completas.

### Observaciones para revisar (13:50)
1. **`docs/GUIA.md` §7** dice que el clásico es "el mismo problema, no el mejor algoritmo posible". En búsqueda no estructurada, consultar sector por sector **sí es la estrategia clásica óptima** (ningún método clásico supera (k+1)/8 con k consultas). Y la ventaja cuadrática de Grover en número de consultas está demostrada para este problema idealizado (sección 3 del brief). Tal como está, la frase debilita el argumento de "comparación justa". Propuesta: *"El clásico usa la mejor estrategia clásica posible para este problema. La ventaja de Grover es real en número de consultas, pero solo en búsqueda no estructurada idealizada; con 8 sectores es un ejemplo pedagógico, no una demostración de ventaja práctica."* Que lo revise Alvaro con Gandy.
2. **`feat/ui` está detrás de `main`** (le falta el commit de `TAREAS.md`). No es un problema: el PR solo agrega `docs/GUIA.md` y no borra nada de `TAREAS.md`, aunque el diff contra `main` lo haga parecer.
3. Todavía nadie creó las ramas `-v2`. Si alguna tarea no va a entrar antes del freeze, recórtenla y avisen.

### Cierre (14:35 → 15:00)
1. **14:35:** freeze de código; PRs de las 4 ramas `-v2` a `main`.
2. Lucas pone el σ de Avix en `config.phaseNoise`.
3. Prueba de humo en Pages:
   - `selfTest` en verde;
   - k=2 da cerca de 95 % fuera de la tormenta y baja dentro de ella;
   - aparecen las pistas;
   - la pantalla final muestra tarjeta, ruido y acumulado.
4. QR, prueba en celular y ensayo de la demo con la partida real.

Si la entrega es a otra hora, mover el freeze a 25 minutos antes.

---

## Objetivo del prototipo
Un *vertical slice* jugable con:

- una arena con pocos bots;
- zonas de niebla;
- los dos cañones (clásico vs. cuántico) con **el mismo sensor y la misma energía**;
- barras de probabilidad/amplitud alrededor del tanque;
- una pantalla final con frecuencia observada vs. teoría.

Lo demás se presenta en el pitch como visión.

**Regla de oro:** las 4 tareas son **100% independientes**. Cada persona trabaja en sus propios archivos, con su propia página de prueba y datos falsos (*mocks*), sin esperar a nadie. La integración se hace al final. Por eso el **contrato** de abajo es fijo: si alguien necesita cambiarlo, avisa al grupo primero.

Principio rector: **mejor poco y correcto que mucho e inventado**.

---

## Flujo de trabajo con Git

**Nadie commitea directo en `main`.** Cada persona trabaja en su rama y se integra con un Pull Request.

| Persona | Rama |
|---|---|
| Avix | `feat/quantum` |
| Lucas | `feat/game` |
| Gandy | `feat/ui` |
| Alvaro | `feat/pitch` |
| Correcciones | `fix/<tema>` (ej. `fix/sectores`) |
| Integración final | `feat/integracion` → PR a `main` |

**Estilo de commits**
- `new: …` cuando se agrega algo nuevo (ej. `new: simulador de 3 qubits`)
- `change: …` cuando se modifica algo existente (ej. `change: costo de energía por consulta`)
- `fix: …` cuando se corrige un error (ej. `fix: orden little-endian en el oráculo`)

```bash
git checkout main && git pull
git checkout -b feat/<tu-rama>
# ... trabajar ...
git add <tus archivos>
git commit -m "new: ..."
git push -u origin feat/<tu-rama>
# Abrir el PR en GitHub cuando tu parte esté lista
```

Toca **solo tus archivos** (tabla de abajo). Así no hay conflictos de merge.

---

## Stack
HTML + JavaScript vanilla + Canvas 2D, **sin build ni dependencias**. Cada módulo es un archivo `.js` que se carga con `<script>` y expone **un solo objeto global**. Todo se abre con doble clic en el navegador (no hace falta servidor).

```
/
├── index.html            # integración: carga content → quantum → ui → game
├── js/quantum.js         # AVIX
├── test/quantum.html     # AVIX:   página que corre Quantum.selfTest()
├── js/game.js            # LUCAS
├── test/game.html        # LUCAS:  game.js + stubs de Quantum y UI
├── js/ui.js              # GANDY
├── test/ui.html          # GANDY:  ui.js con estado y resultados falsos
├── js/content.js         # ALVARO
├── pitch/                # ALVARO: slides, guion de demo
└── qiskit/validate.py    # AVIX (opcional)
```

---

## Contrato entre módulos (fijo)

**Sectores:** índices `0..7`. El sector `i` es la cuña angular `[i·45°, (i+1)·45°)` medida desde el eje +x **en sentido horario** (coordenadas de canvas: y crece hacia abajo, así que `Math.atan2(dy, dx)` sirve directo). Qubits en **little-endian**, como en Qiskit.

### `window.Quantum` (Avix: solo cálculo, sin DOM)
```js
Quantum.runQuantum({ k, target, phaseNoise = 0, sensorFlip = 0 })
  // → { amps: [{re, im} ×8], probs: [8 números], theory: número }
  //   theory = sin²((2k+1)θ), con sin θ = 1/√8
Quantum.runClassical({ k, target, sensorFlip = 0 })
  // → { probs: [8], discarded: [índices], found: bool, theory: (k+1)/8 }
Quantum.sample(probs)        // → índice 0..7, muestreado según probs
Quantum.toQiskit(k)          // → string con código Qiskit ejecutable
Quantum.selfTest()           // → imprime en consola: Σp = 1, H·H = I, tabla 8.4
```

**Modelo de sensor (el mismo para los dos cañones):** en cada consulta, con probabilidad `1 − sensorFlip` el sensor percibe el sector real; si no, percibe uno equivocado al azar.
- El **clásico** pregunta "¿es el sector i?" contra esa percepción.
- El **cuántico** invierte la fase del sector percibido.

Mismo sensor y mismo costo por consulta/iteración.

### `window.UI` (Gandy: solo dibuja, no contiene lógica de juego)
```js
UI.drawHUD(ctx, state)                     // energía, cañón, k, radar "hay alguien"
UI.drawSectors(ctx, x, y, result, cannon)  // 8 barras radiales alrededor de (x, y) en pantalla
UI.showStart(onPlay)                       // overlay HTML: 3 líneas + botón "Jugar"
UI.showEnd(log, onReplay)                  // overlay HTML con estadísticas de la partida
```
- `state = { energy: 0..100, cannon: 'classic' | 'quantum', k: 0..3, radar: bool }`. Además, Game manda campos extra opcionales: `hp`, `botsLeft`, `cost`, `costPerQuery`, `searching`.
- `result` es la salida de `runQuantum` o `runClassical` (o `null`).
- `cannon` es `'classic'` o `'quantum'`.
- `ctx` ya viene escalado a píxeles CSS.

### `window.Game` (Lucas)
```js
Game.start()   // (re)inicia una partida en <canvas id="game">
Game.log       // [{ cannon, k, target, shot, hit, theory, t }], un objeto por disparo de búsqueda
Game.config    // costos, ruido, nº de bots… (se puede ajustar desde la consola)
```
Game usa `Quantum.*` y `UI.*` **solo a través de esos nombres**.

### `window.Content` (Alvaro: solo datos)
```js
Content.start = ['línea 1', 'línea 2', 'línea 3']
Content.cards = { probClasica, amplitud, interferencia, sobreRotacion, ruidoDatos, ruidoCircuito, pocasPartidas }
  // cada una: { titulo, intuitivo: '2 a 4 líneas', profundo: 'texto de "ver más"' }
Content.pickCard(log) // → clave de la tarjeta más relevante según la partida
```

### Controles (los implementa Game)
- `WASD` / flechas: mover
- Mouse: apuntar
- Clic izquierdo: disparo normal
- `1` / `2`: cañón clásico / cuántico
- `Q` / `E`: bajar / subir k (0 a 3)
- **`Espacio` o clic derecho:** disparo de búsqueda a la niebla (solo cuando el radar detecta a alguien)

---

## Tareas

### AVIX: simulador cuántico (`js/quantum.js`, `test/quantum.html`)
1. Vector de 8 amplitudes complejas: H⊗3, oráculo (flip de fase en `target`), difusor (2|s⟩⟨s| − I) y medición por muestreo según |a|².
2. `phaseNoise`: fase aleatoria ~N(0, σ) por qubit después de cada pieza (ruido del circuito, **solo** cuántico).
3. `runClassical` con el mismo modelo de sensor.
4. `selfTest()`:
   - k = 0..3 → 12,5 / 78,1 / 94,5 / 33,0 % (tolerancia 1e-9);
   - Σp = 1;
   - H·H = I;
   - un marcador sin difusor no cambia las probabilidades.
5. `toQiskit(k)`: genera el texto del circuito (h, oráculo con ccz/mcx, difusor, measure).
6. *Opcional:* `qiskit/validate.py` (o una celda de Colab) con `Statevector` que imprima la misma tabla. Sacar una captura para el pitch ("verificado contra Qiskit").

**Hecho cuando:** al abrir `test/quantum.html`, la consola muestra todo en verde.

### LUCAS: juego (`js/game.js`, `test/game.html`) + despliegue
1. Loop a 60 fps en canvas, tanque con WASD + mouse, disparo normal, colisiones.
2. 4 a 6 bots: deambulan, se esconden en zonas de niebla, pelean entre ellos y contra el jugador.
3. Disparo de búsqueda:
   - si hay un enemigo en la niebla dentro del alcance → `radar = true`;
   - `Espacio` → se calcula el sector real (`target`) y se llama a `Quantum.run*`;
   - ~1 s de cámara lenta mostrando `UI.drawSectors`;
   - `Quantum.sample` da la dirección del tiro y el acierto se resuelve con `shot === target`.
4. Energía compartida: cada consulta o iteración cuesta lo mismo y la energía se regenera con el tiempo.
5. Llenar `Game.log` y, al morir o ganar, llamar a `UI.showEnd(log, Game.start)`.
6. GitHub Pages (Settings → Pages → Deploy from branch `main` / root). La URL sirve para el QR.

**Hecho cuando:** `test/game.html` se juega de punta a punta con los stubs.

### GANDY: interfaz (`js/ui.js`, `test/ui.html`)
1. `drawSectors`: 8 cuñas o barras radiales.
   - **Cuántico:** barra de **amplitud** con color según el signo (+/−) y, encima, el cono de **probabilidad**. Tiene que verse la diferencia entre amplitud y probabilidad.
   - **Clásico:** barras de probabilidad, con los sectores descartados en gris.
2. `drawHUD`: energía, cañón activo, k con su costo y el radar parpadeando.
3. `showStart`: overlay con `Content.start` (o un texto por defecto si `Content` no existe) y el botón "Jugar".
4. `showEnd`:
   - tabla por cañón × k: disparos, aciertos, % observado vs. % teórico;
   - una tarjeta `Content.cards[Content.pickCard(log)]` con "ver más";
   - un bloque copiable con `Quantum.toQiskit(k)`;
   - el botón "Jugar otra vez".
5. `test/ui.html`: botones k = 0..3 con amplitudes reales hardcodeadas (sector marcado / cada uno de los otros 7), más un log falso de unos 30 disparos.
   - k=0 → 0,354 / 0,354
   - k=1 → 0,884 / 0,177
   - k=2 → 0,972 / −0,088
   - k=3 → 0,575 / −0,309
6. Estética: formas geométricas tipo .io, paleta propia y legible en el celular.

**Hecho cuando:** `test/ui.html` muestra las 4 funciones con datos falsos.

### ALVARO: pitch y contenido (`pitch/`, `js/content.js`)
1. Slides, en este orden:
   1. problema y reto;
   2. la idea en una frase;
   3. tabla clásico vs. cuántico (sección 3);
   4. tabla 8.4;
   5. **demo en vivo**;
   6. por qué la comparación es justa;
   7. limitaciones (sobre-rotación, ruido, el oráculo como abstracción);
   8. visión (BR completo, ruido calibrado con IBM, gradiente/QML, 4 qubits, hardware real);
   9. cierre: *"aprendes probabilidad cuántica porque te sirve para ganar"*.
2. Guion de la demo de 60 a 90 s: un disparo clásico, uno cuántico con k = 2, otro con k = 3 que falla, y la pantalla final.
3. `content.js`: textos de inicio y 7 tarjetas (intuitivo + profundo), revisadas con el checklist de la **sección 7** del brief.
4. Preguntas probables del jurado:
   - ¿El oráculo es trampa?
   - ¿Hay ventaja cuántica real?
   - ¿Por qué Grover?
   - ¿Qué se validó con Qiskit?
5. No afirmar "el primer juego cuántico": el diferencial es la **combinación**.

**Hecho cuando:** las slides están completas (con un espacio para capturas del juego) y `content.js` carga sin errores.

---

## Integración (últimos 30–40 min, rama `feat/integracion`)
1. Mergear las 4 ramas. `index.html` carga `content.js → quantum.js → ui.js → game.js`.
2. Prueba de humo:
   - `Quantum.selfTest()` en verde;
   - 20 disparos con k = 2 dan cerca de 95%;
   - con k = 3 el acierto cae;
   - la pantalla final muestra datos reales.
3. Pegar el `toQiskit(2)` en Colab y comprobar que corre.
4. PR a `main`, GitHub Pages, QR y prueba en celular (Gandy).
5. Capturas o GIF en las slides y ensayo de la demo.

**Plan B si la integración falla:** reducir a una escena de "duelo en la niebla" (tanque al centro, enemigo oculto en 1 de 8 sectores, eliges cañón y k, disparas, repites). Usa solo `quantum.js` + `ui.js`, que funcionan sin `game.js`.

---

## Fuera del prototipo (solo en el pitch)
- Zona que se cierra
- Loot de piezas
- 10 a 15 bots y arquetipos de bots
- Ruido calibrado con un backend falso de IBM
- Controles táctiles
- Leaderboard
- Auto-calibración con descenso de gradiente (puente con QML)
