# Collapse: guía completa (cómo se juega y cómo encaja cada pieza)

Esta guía sirve para dos cosas: **jugar** (sección 1 a 5) y **entender o integrar el código** (sección 6 en adelante). No hace falta saber física cuántica para jugar.

> Estado verificado el 2026-10-24 sobre `origin/main`: carga `quantum.js`, `ui.js` y `game.js`; falta `js/content.js` (Alvaro). Detalle en la sección 9.

---

## 1. La idea en una frase
Un tanque que debe **encontrar y acertar a un enemigo escondido en la niebla**, con dos cañones que gastan la **misma energía** y usan el **mismo sensor**: uno busca como un humano (descarta sectores) y otro usa un circuito cuántico simulado (amplifica el sector correcto). Aprendes probabilidad cuántica porque te sirve para ganar.

## 2. Cómo abrirlo
- Es HTML + JavaScript puro, **sin instalar nada**. Abre `index.html` con doble clic.
- Si el navegador bloquea algo, sirve la carpeta: `python -m http.server 8000` y entra a `http://localhost:8000/`.
- En el celular: publica en GitHub Pages (Settings → Pages → rama `main`, raíz) y abre la URL.

## 3. Controles
| Acción | Tecla / botón |
|---|---|
| Moverte | `WASD` (las flechas ya no mueven) |
| Apuntar | Mouse, o `←` `→` para girar el cañón sin mouse |
| Mover la vista | `↑` `↓` (la cámara mira más lejos hacia donde apuntas / vuelve) |
| Disparo normal | Clic izquierdo o `F` |
| Cañón clásico / cuántico | `1` / `2` |
| Bajar / subir **k** (0 a 3) | `Q` / `E` |
| **Disparo de búsqueda** | `Espacio` o clic derecho |

## 4. Cómo es una partida
1. **Pantalla de inicio:** tres líneas de contexto, el botón **Jugar** y el botón **Cómo jugar**, que abre una guía de 6 diapositivas (reto, controles, los dos cañones, cómo leer las barras con ejemplo dibujado, la trampa de k = 3 y por qué una partida no demuestra nada). Se navega con los botones o con `←` `→` `Esc`.
2. **Arena:** hay 5 bots que deambulan, pelean entre sí y contra ti. Hay **zonas de niebla** donde los bots se esconden: dentro no puedes verlos.
3. **Disparo normal** (clic izquierdo): para enemigos que ves en campo abierto.
4. **Radar:** si hay un enemigo **dentro de la niebla y a tu alcance**, el HUD muestra el indicador rosa parpadeante "¡Hay alguien! (Espacio)". Sabes *que* hay alguien, pero **no en cuál de los 8 sectores** que rodean tu tanque.
5. **Disparo de búsqueda** (`Espacio`):
   - Cuesta **k × 20 de energía** (máximo 100, se regenera 9 por segundo). Con k = 0 es gratis: disparas a ciegas.
   - El juego se pone en **cámara lenta ~1 s** y muestra las 8 barras alrededor de tu tanque.
   - Luego el disparo **sale hacia un sector muestreado según esas barras**. Si coincide con el sector real del enemigo, aciertas (60 de daño, contra 20 del disparo normal).
6. **Fin:** ganas cuando no quedan bots; pierdes si te eliminan. Aparece la **pantalla final** (sección 5).

## 5. Cómo leer lo que ves

### Los 8 sectores
El sector `i` es la cuña `[i·45°, (i+1)·45°)` medida desde el eje +x **en sentido horario** (en pantalla, la "y" crece hacia abajo). Cada cuña muestra un porcentaje.

### Cañón clásico (barras verdes)
- Cada consulta mira **un** sector. Si el enemigo no está, **ese sector se descarta** (gris con ✕) y la probabilidad se reparte entre los restantes.
- Con **k consultas** aciertas con probabilidad `(k+1)/8`: 12,5 % · 25 % · 37,5 % · 50 %.
- Es predecible: más energía, más acierto, siempre.

### Cañón cuántico (cuñas cian/rosa + cono amarillo)
Tiene dos capas, y la diferencia entre ellas es lo que hay que aprender:
- **Cuña cian o rosa = amplitud.** Puede ser **positiva (cian) o negativa (rosa)**. Es lo que el circuito manipula.
- **Cono amarillo = probabilidad.** Es la amplitud **al cuadrado**: siempre positiva, y es la que decide hacia dónde sale el disparo.
- El circuito repite **k veces** el par *marcador + difusor*:
  - **Marcador (oráculo):** invierte el signo de la amplitud del sector donde está el enemigo. Por sí solo **no cambia ninguna probabilidad** (solo el color).
  - **Difusor:** hace que las amplitudes interfieran y la del sector marcado **crezca**.
- Resultado esperado (sin ruido, 8 sectores):

| k | Clásico (k consultas) | Cuántico (k iteraciones) |
|---|---|---|
| 0 | 12,5 % | 12,5 % |
| 1 | 25 % | 78,1 % |
| 2 | 37,5 % | **94,5 %** |
| 3 | 50 % | **33,0 %** |

**La trampa de k = 3:** pasarse de iteraciones hace que la amplitud "dé la vuelta" y el acierto **cae**. Más no siempre es mejor.

### Pantalla final
- **Tabla** por cañón × k: aciertos/disparos, % **observado** y % **teórico**. Con pocos disparos lo observado se aleja de la teoría: **una partida no demuestra nada**.
- **Tarjeta** con el concepto que más influyó, con "Ver más".
- **Código Qiskit** del circuito (para pegar en Google Colab o IBM Quantum) y botón **Copiar código**.
- **Jugar otra vez.**

## 6. Por qué la comparación es justa
- Mismo **sensor** para ambos y mismo **costo** por consulta/iteración (`costPerQuery`).
- El acierto se mide igual: el disparo cae en el sector correcto.
- Los números de la tabla **salen del simulador**, no están escritos a mano (con k = 0..3 el simulador da 12,5 / 78,1 / 94,5 / 33,0 %).
- Ruidos separados y apagados por defecto: `sensorFlip` afecta a **ambos** cañones; `phaseNoise` solo al cuántico.

## 7. Qué NO afirma el juego
- No dice que haya "ventaja cuántica real": con 8 sectores es un ejemplo pedagógico de amplificación de amplitud (Grover) y el clásico es el mismo problema, no el mejor algoritmo posible.
- El **oráculo es una abstracción**: aquí es el sensor del juego, no un cálculo que el circuito "resuelva solo".
- Es una **simulación** de 3 qubits (vector de 8 amplitudes), no hardware real.
- No es "el primer juego cuántico": el diferencial es la combinación de battle royale, comparación justa y pantalla de aprendizaje.

---

## 8. Arquitectura: quién es dueño de qué
Cuatro módulos independientes, cada uno expone **un solo objeto global**. Se cargan con `<script>` en este orden (ver `index.html`):

```
content.js  →  quantum.js  →  ui.js  →  game.js
(Alvaro)       (Avix)         (Gandy)   (Lucas)
```

| Módulo | Responsabilidad | No debe |
|---|---|---|
| `Quantum` | Cálculo: amplitudes, probabilidades, muestreo, texto Qiskit | tocar el DOM |
| `UI` | Dibujar barras, HUD y overlays | contener lógica de juego |
| `Game` | Bucle, bots, niebla, energía, disparos, `Game.log` | acceder a `Quantum`/`UI` por otro nombre que el del contrato |
| `Content` | Textos de inicio y tarjetas | tener lógica más allá de `pickCard` |

### Contrato (fijo; si hay que cambiarlo, se avisa al grupo)
```js
Quantum.runQuantum({ k, target, phaseNoise = 0, sensorFlip = 0 })
  // → { amps: [{re, im} ×8], probs: [8], theory }
Quantum.runClassical({ k, target, sensorFlip = 0 })
  // → { probs: [8], discarded: [índices], found: bool, theory: (k+1)/8 }
Quantum.sample(probs)   // → índice 0..7
Quantum.toQiskit(k)     // → string con código Qiskit
Quantum.selfTest()      // → imprime comprobaciones en consola

UI.drawHUD(ctx, state)                     // state: { energy, cannon, k, radar, hp?, botsLeft?, cost?, costPerQuery?, searching? }
UI.drawSectors(ctx, x, y, result, cannon)  // x, y en pantalla; result de run*; cannon 'classic' | 'quantum'
UI.showStart(onPlay)
UI.showGuide(onClose)                      // opcional (aditivo): guía "Cómo jugar" por diapositivas; showStart ya la ofrece
UI.showEnd(log, onReplay)                  // log: [{ cannon, k, target, shot, hit, theory, t }]

Game.start()  Game.log  Game.config

Content.start = ['línea 1', 'línea 2', 'línea 3']
Content.cards = { probClasica, amplitud, interferencia, sobreRotacion, ruidoDatos, ruidoCircuito, pocasPartidas }
                // cada una: { titulo, intuitivo, profundo }
Content.pickCard(log)  // → clave de Content.cards
```
`ctx` llega **ya escalado a píxeles CSS**: no vuelvas a aplicar `devicePixelRatio`.

### Cómo se enganchan `Game` y `UI` en el juego que corre
- Cada fotograma `Game` arma el estado del HUD (`hudState()`: energía, cañón, k, radar, vida, bots restantes, costo, `searching`) y llama `UI.drawHUD(ctx, estado)`.
- Durante la búsqueda llama `UI.drawSectors(ctx, px, py, result, cannon)` con la posición del jugador **en pantalla** (restando la cámara) y el `result` que devolvió `Quantum.run*`. Tras el disparo mantiene el último resultado ~0,7 s.
- Cada disparo de búsqueda agrega `{ cannon, k, target, shot, hit, theory, t }` a `Game.log`.
- Al terminar llama `UI.showEnd(Game.log, start)`; `index.html` llama `UI.showStart(() => Game.start())` al cargar.

### Integrar un módulo nuevo o una versión nueva
1. Trabaja en tu rama (`feat/<tema>`), solo en **tus archivos**.
2. Comprueba el contrato: `node test/check-contract.js` (un módulo ausente cuenta como *pendiente*, un contrato roto como *error*).
3. Si tocas la UI: `node test/run-ui-tests.js` (con `jsdom` instalado corre también los overlays) o abre `test/ui.test.html`.
4. PR a `main`. Para revisar la integración completa usa el agente `integration-verifier` (`.claude/agents/`).

### Agregar `Content` (lo único que falta hoy)
Crea `js/content.js` con `window.Content = { start: [...3 líneas], cards: {7 claves}, pickCard(log) {...} }`. `UI` ya lo usa si existe y tiene un texto por defecto si no. `check-contract.js` valida que las 7 tarjetas tengan `titulo`, `intuitivo` y `profundo` y que `pickCard` devuelva una clave válida.

## 9. Estado de la integración (verificado)
Sobre `origin/main`:
- `node test/check-contract.js` → **sin errores de contrato**. Quantum, UI y Game cumplen nombres y formas, y `UI.drawSectors` acepta lo que devuelve `Quantum.run*` para k = 0..3 y para el clásico.
- `Quantum.runQuantum` con k = 0..3 da **12,5 / 78,1 / 94,5 / 33,0 %**; `toQiskit(2)` devuelve un circuito Qiskit.
- `node test/run-ui-tests.js` → 15 ok (los 9 de overlays requieren `jsdom`; con él, 24/24).
- **Pendiente:** `js/content.js` no existe. `index.html` lo pide y el navegador registra un 404 inofensivo; el inicio usa texto por defecto y la pantalla final no muestra tarjeta.
- **No verificado:** el juego completo **no se jugó en un navegador** en esta revisión, ni el rendimiento en celular, ni los 20 disparos con k = 2 (~95 %) del plan de humo de `TAREAS.md`.

## 10. Ajustes rápidos (consola del navegador)
`Game.config` se puede cambiar en vivo; valores por defecto:

| Clave | Valor | Qué hace |
|---|---|---|
| `bots` | 5 | Cantidad de bots (aplica al reiniciar) |
| `costPerQuery` | 20 | Energía por consulta/iteración (igual para ambos) |
| `energyRegen` | 9 / s | Regeneración |
| `radarRange` | 380 | Alcance del radar |
| `slowmoDuration` | 1,1 s | Cuánto se ven las barras antes del tiro |
| `sensorFlip` | 0 | Ruido del sensor (0 a 1), afecta a ambos |
| `phaseNoise` | 0 | Ruido del circuito, solo cuántico |

Ejemplo: `Game.config.sensorFlip = 0.3` y juega con k = 2: verás que el cuántico amplifica también el error.

## 11. Problemas frecuentes
| Síntoma | Causa probable |
|---|---|
| La página dice "Faltan módulos: …" | Falta o falla un `<script>`; revisa la consola y el orden de carga |
| 404 de `js/content.js` | Aún no existe; es esperado, no rompe nada |
| `Espacio` no hace nada | El radar no detecta a nadie en la niebla, o no alcanza la energía (k × 20) |
| El cuántico "falla más" con k = 3 | Es la sobre-rotación: comportamiento correcto, no un error |
| Nada se ve en el celular | Abre por HTTP (GitHub Pages) y recarga; revisa que el canvas ocupe toda la pantalla |

## 12. Fuera del prototipo (visión para el pitch)
Zona que se cierra, loot de piezas de circuito, 10 a 15 bots con arquetipos, ruido calibrado con un backend de IBM, controles táctiles, leaderboard y auto-calibración con descenso de gradiente (puente con QML).
