# Collapse: división de tareas del prototipo

> Quedan **2 horas** para la entrega. Lo que se evalúa es un **prototipo funcional y una buena idea/pitch**, no el sistema completo.
> Brief completo: [`INDICACIONES.md`](INDICACIONES.md).

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
