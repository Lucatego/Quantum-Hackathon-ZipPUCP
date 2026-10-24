# Cambios finales antes del freeze (revisión de las 14:26)

Validado sobre `origin/main` en `a9efd0b`:
- `Quantum.selfTest()`: todo en verde.
- `check-contract`: OK. `check-content`: OK, 0 avisos. UI: 34 de 34 pruebas con jsdom.
- Juego (sin navegador): la niebla se expande hasta 1,6×, el ruido del circuito queda en σ = 0,152 y `?demo` arranca con el radar activo.

**El juego funciona. Lo que queda son textos y el pitch.** Cada bloque dice el archivo, la línea y el texto exacto. Cada persona hace lo suyo en su rama (`fix/<tema>`) y abre un PR.

---

## GANDY (`js/ui.js`, `docs/GUIA.md`): ~5 min

### 1. Contradicción sobre la "ventaja cuántica" (`js/ui.js:245`)
La última diapositiva de "Cómo jugar" contradice la tarjeta `interferencia` de `content.js`.

Reemplazar:
```js
      'Es una simulación didáctica de 3 qubits: no es hardware cuántico ni una ventaja cuántica real.' }
```
por:
```js
      'Es una simulación didáctica de 3 qubits, no hardware cuántico. La ventaja de Grover en número de consultas es real para la búsqueda no estructurada idealizada, pero con 8 sectores esto no demuestra una ventaja práctica.' }
```

### 2. Sacar los paneles de mitos/verdades de la pantalla de inicio (`js/ui.js:222–229`)
**Por qué:**
- El pilar 5 del brief dice "explicar después, no antes".
- La sección 9 pide instrucciones de **3 líneas como máximo**.
- Hoy el inicio tiene 3 párrafos, 2 títulos y 6 viñetas: en el celular hay que hacer scroll para llegar a "Jugar".
- Mostrar el mito antes de jugar puede sembrarlo en quien no lo tenía.

En `showStart`, **borrar** estas líneas:
```js
    var myths = window.Content && Array.isArray(window.Content.myths) ? window.Content.myths : [];
    var truths = window.Content && Array.isArray(window.Content.truths) ? window.Content.truths : [];
```
```js
    var bad = renderMessagePanel('Qué NO se debe creer', myths);
    if (bad) o.box.appendChild(bad);
    var good = renderMessagePanel('Qué sí queremos promover', truths);
    if (good) o.box.appendChild(good);
```
En `showEnd` (líneas 424–427) **se quedan**, pero con otros títulos:
```js
    var bad = renderMessagePanel('Lo que el cañón cuántico NO hace', myths);
    if (bad) o.box.appendChild(bad);
    var good = renderMessagePanel('Lo que viste en la partida', truths);
    if (good) o.box.appendChild(good);
```
("Qué sí queremos promover" suena a publicidad; en la pantalla final se lee mejor como algo que se aprendió.)

Después: `node test/run-ui-tests.js` (o abrir `test/ui.test.html`).

### 3. `docs/GUIA.md:79`
Reemplazar la viñeta por:
```md
- El clásico usa la **mejor estrategia clásica posible** para este problema: ningún método clásico supera (k+1)/8 con k consultas. La ventaja de Grover en número de consultas es real para la búsqueda no estructurada idealizada; con 8 sectores es un ejemplo pedagógico, no una demostración de ventaja práctica.
```

### 4. (Si da el tiempo) Tabla de `Game.config` en `docs/GUIA.md` §10
Agregar estas filas:

| Clave | Valor | Qué hace |
|---|---|---|
| `bots` | 6 | (antes decía 5) |
| `phaseNoiseScale` | 0,33 | Fracción del ruido calibrado con IBM (`Quantum.CALIBRATED_PHASE_NOISE` = 0,46). Con 1,0 se usa el nivel completo |
| `stormSensorFlip` | 0,25 | Ruido del sensor en la tormenta (afecta a ambos cañones) |
| `fogPhaseEvery` / `fogPhaseStep` / `fogMaxScale` | 25 s / 0,15 / 1,6 | La niebla se expande por fases |

Y una línea: "`?demo` en la URL: modo para la presentación (ver `docs/DEMO.md`)".

---

## ALVARO (`js/content.js`, `pitch/`): prioridad, el pitch

### 1. `js/content.js`, tercera frase de `truths`
"Se mide con datos reales" no es cierto: los datos son de una simulación. Reemplazar:
```js
    'La ventaja real aparece en la búsqueda no estructurada y se enseña con evidencia: funciona bien, falla bien y se mide con datos reales.'
```
por:
```js
    'La ventaja aparece en la búsqueda no estructurada idealizada, y aquí la ves con muchas búsquedas simuladas: en unas condiciones ayuda y en otras falla.'
```
Después: `node test/check-content.js`.

### 2. El pitch (`pitch/PITCH.md`)
El gancho y el cierre del borrador actual están bien y se quedan. Lo que falta es el **centro**: decir qué hace el juego. Además, **no venderlo como "aprender IA / Quantum Machine Learning"**: el prototipo no tiene ML, enseña **probabilidad clásica vs. amplitudes e interferencia**. El QML va en la visión.

Este texto va **entre** la apertura (hasta "...tenemos que cambiar eso.") y el cierre ("Porque la diversión y el rigor científico..."):

> **El reto.** Nos pidieron tomar un concepto de estadística y mostrar su equivalente cuántico. Elegimos el más básico: **probabilidad**. Collapse es un battle royale de tanques. Un enemigo se esconde en la niebla, en uno de 8 sectores, y hay que encontrarlo para acertarle.
>
> **Dos cañones, mismas reglas.** El cañón clásico busca como la estadística: revisa sectores y los descarta, y la probabilidad se reparte entre los que quedan. El cañón cuántico usa amplitudes, que pueden ser negativas, y las hace **interferir**: es la idea del algoritmo de Grover. Los dos usan **el mismo sensor y pagan la misma energía por consulta**.
>
> **[DEMO: Lucas juega, ver `docs/DEMO.md`]** Con dos consultas, el clásico acierta 37,5 %. El cuántico, con el mismo presupuesto, ~95 %. Pero con una iteración más el acierto **cae** a 33 %: más no siempre es mejor. Y en la tormenta, donde el sensor miente, fallan los dos: ningún método salva datos malos.
>
> **Rigor.** La física no está inventada: el simulador del juego coincide con **Qiskit** con un error de 10⁻¹⁵. El ruido del circuito es un modelo de un solo parámetro, ajustado al perfil de un procesador de IBM simulado en Qiskit Aer. En el juego usamos un tercio de esa intensidad. Con el ruido completo pasa algo interesante: el número óptimo de iteraciones baja de 2 a 1.
>
> **Honestidad.** La ventaja de Grover en número de consultas es real, pero solo para búsqueda no estructurada idealizada. Con 8 sectores no demostramos ventaja práctica, y el "sensor oráculo" es una abstracción. El juego te muestra cuándo gana el cuántico y cuándo pierde.
>
> **Visión.** Primero, el battle royale completo. Después, **auto-calibración**: que el cañón ajuste solo sus ángulos con descenso de gradiente. Eso es exactamente entrenar un circuito variacional, el puente con el Quantum Machine Learning. Y luego más qubits, y correrlo en hardware real de IBM.
>
> **Aprendes probabilidad cuántica porque te sirve para ganar, no porque te la explican.**

En la apertura, cambiar "¿Y si aprender inteligencia artificial fuera como jugar?" por **"¿Y si aprender computación cuántica fuera como jugar?"**. Al final, mostrar el **QR** de https://lucatego.github.io/Quantum-Hackathon-ZipPUCP/.

Para la próxima: subirlo por una rama `feat/pitch` (el borrador se subió directo a `main`).

---

## AVIX (`pitch/slide-tabla.html`): ~2 min

La columna "Cuántico con ruido IBM" muestra lo que **mide Qiskit Aer** con FakeSherbrooke (59 / 59 / 22 %). La nota al pie da a entender que esos números salen del modelo de σ = 0,46. Además, el juego usa un tercio de esa intensidad, y la slide tiene que decirlo para no contradecir la demo.

En la nota con `*<b>Límite:</b>`, reemplazar la primera oración por:
```html
*<b>Límite:</b> la columna 4 es Qiskit Aer con el modelo de ruido de un procesador IBM simulado (FakeSherbrooke, 8192 disparos por k). El juego lo aproxima con un desfase de un solo parámetro (σ = 0,46) y, para que se pueda jugar, usa un tercio de esa intensidad (con k = 2, ~90 %). No es una medición en hardware real.
```

Además: revisar que las cifras del texto del pitch de Alvaro (arriba) sean correctas.

---

## LUCAS
1. Abrir https://lucatego.github.io/Quantum-Hackathon-ZipPUCP/?demo y jugar 2 minutos en el navegador real. **Nadie lo ha probado todavía en un navegador.**
2. Ensayar la ruta de `docs/DEMO.md` con Alvaro narrando y con cronómetro.
3. Mergear los PRs de los cambios de arriba y repetir la prueba de humo en Pages y en el celular.
