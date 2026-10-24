# Plan: portada de Collapse con 3D y animación (por fases)

Objetivo: que la pantalla de inicio **se sienta como un juego terminado** y que cuente la idea del proyecto sin leer nada: *un anillo de 8 sectores cuyas amplitudes crecen y se cancelan*. Que impresione en el pitch y en el celular.

Principio rector (el mismo del proyecto): **mejor poco y correcto que mucho e inventado.** La animación no es decoración: el 3D se alimenta de `Quantum.runQuantum`, así que lo que se ve es lo que el juego calcula.

## Dos vías, y cuál usar para qué

| Vía | Qué es | Pros | Contras | Usarla para |
|---|---|---|---|---|
| **A. Three.js en vivo** | Escena 3D en un `<canvas>` detrás del overlay de inicio | Interactiva, usa datos reales, cabe en el stack (sin build) | Rendimiento en celulares, WebGL puede faltar | **La portada del juego** |
| **B. Remotion (video prerenderizado)** | Proyecto React aparte que renderiza MP4/WebM/GIF | Calidad de cine, control total del tiempo, ideal para el pitch | Necesita Node y un paso de render; no es interactivo; licencia a verificar | Título animado, clips de la guía, teaser del pitch, GIF del README |

Remotion **no entra al runtime del juego**: vive en `video/` con su propio `package.json` y solo entrega archivos (`assets/*.webm`) que el juego reproduce con `<video muted loop playsinline>`. Así se mantiene la regla "HTML + JS vanilla, sin build ni dependencias" para lo que se despliega.

> Nota: no verifiqué en esta sesión los términos actuales de Remotion. Antes de usarlo, **revisar su licencia** (hasta donde sé, el uso gratuito tiene límites por tamaño de equipo) y las "skills"/ayudas para asistentes de código que ofrezca. Three.js es MIT.

## Concepto visual: "el anillo de amplitudes"
- **Tanque low-poly en el centro** y, alrededor, **8 columnas 3D** (una por sector, el mismo orden y sentido que el juego).
- Cada columna es la **amplitud**: sube en **cian** si es positiva, **baja en rosa** si es negativa. Encima, un **cono amarillo translúcido** con la probabilidad (amplitud al cuadrado). Misma paleta que `drawSectors`.
- **Bucle narrativo de ~12 s** con datos reales de `Quantum.runQuantum({ k, target })`:
  1. k = 0: ocho columnas iguales (superposición).
  2. Marcador: una columna se **invierte** (rosa) y *las probabilidades no se mueven*.
  3. Difusor: la columna correcta **crece**, las demás se encogen (k = 1, 2).
  4. k = 3: se pasa y **vuelve a caer**. Subtítulo: "Más no siempre es mejor".
- Fondo: niebla volumétrica (partículas/planos translúcidos), cámara en órbita lenta, **parallax con el mouse o el giroscopio**.
- Título **COLLAPSE** con revelado animado; botones "Jugar" y "Cómo jugar" ya existentes por encima.

## Fases

| Fase | Entrega | Quién | Tiempo | Corte |
|---|---|---|---|---|
| 0. Dirección y acuerdo | Paleta, tipografía, contrato `Intro3D`, decisión de licencias | Gandy + equipo | 15 min | — |
| 1. Escena base | Anillo 3D estático con datos reales + órbita de cámara + respaldo 2D | Gandy | 40 min | **mínimo viable** |
| 2. Animación narrativa | Bucle k = 0→3 con subtítulos, niebla y título | Gandy | 40 min | **recomendada** |
| 3. Interacción y transición | Parallax, "inmersión" al pulsar Jugar, tanque 3D | Gandy | 30 min | opcional |
| 4. Remotion | Título animado y clip del bucle para guía/pitch | Alvaro o quien tenga tiempo | 60 min | opcional (pitch) |
| 5. Rendimiento y cierre | Móvil, accesibilidad, pruebas, integración | Todos | 30 min | obligatoria |

Con poco tiempo: **0 + 1 + 5**. Con holgura: **+ 2**. Fases 3 y 4 suben el nivel pero no son necesarias para que funcione.

### Fase 0: dirección y acuerdo (15 min) — HECHA en `feat/ui`
- **Paleta:** reutilizar la de `ui.js` (`COLOR`): cian `#4cc9f0` (amplitud +), rosa `#ff6b9d` (amplitud −), amarillo `#ffd166` (probabilidad), verde `#80ed99`, fondo `#0e1220`. Un solo lenguaje visual entre portada, juego y pitch.
- **Contrato nuevo (aditivo y opcional):**
  ```js
  Intro3D.start(container)   // monta la escena detrás del overlay; devuelve true si pudo, false si no hay WebGL
  Intro3D.stop()             // la detiene y libera recursos (al pulsar Jugar)
  ```
  `UI.showStart` llama `Intro3D.start` si existe; si devuelve `false` o no existe, queda el inicio de hoy. `Game` no cambia.
- **Archivos nuevos (dueño: Gandy):** `js/intro3d.js`, `js/vendor/three.min.js`, `test/intro3d.html`. `index.html` solo suma dos `<script>` (avisar a quien integra).
- **Decisión de Three.js sin build:** las versiones recientes solo publican módulos ES, que **no cargan con doble clic (`file://`)**. Para conservar "abre con doble clic" se usa una versión anterior con build UMD (`three.min.js`, existe hasta r159 aprox.; **confirmar la versión exacta al descargar**) y se **guarda una copia local en `js/vendor/`**. Eso además evita depender de un CDN con el wifi de la demo.

### Fase 1: escena base (40 min) — HECHA en `feat/ui` (render visual pendiente de verificar en navegador)
- Cámara en perspectiva inclinada ~35° mirando al tanque, iluminación hemisférica + direccional suave.
- 8 columnas `CylinderGeometry`/wedge con la altura = amplitud, color por signo, orden y sentido iguales a `drawSectors` (sector `i` = `[i·45°, (i+1)·45°)`, horario desde +x).
- Conos de probabilidad translúcidos encima.
- Datos de `Quantum.runQuantum({ k: 2, target })`; si `Quantum` no existe, amplitudes del contrato (0,972 / −0,088).
- Respaldo: sin WebGL → `Intro3D.start` devuelve `false` y se ve el inicio actual.
- Pruebas: sin WebGL no lanza; `stop()` libera la escena (sin loops colgados); sector `i` en la posición angular esperada (prueba de geometría sin renderizar).

**Hecho cuando:** el anillo aparece detrás del overlay y Jugar sigue funcionando.

### Fase 2: animación narrativa (40 min)
- Línea de tiempo en JS (sin librería): interpola entre los estados reales de k = 0, marcador, k = 1, 2, 3.
- Subtítulos cortos sincronizados (sin cifras inventadas: solo las de la tabla 8.4).
- Niebla con partículas (`Points`) y título con revelado CSS.
- Respeta `prefers-reduced-motion`: muestra solo el estado k = 2, sin bucle.

**Hecho cuando:** el bucle de ~12 s cuenta la idea sin sonido y sin leer la guía.

### Fase 3: interacción y transición (30 min, opcional)
- Parallax con el mouse; en celular, ligero giro con el dedo (sin pedir permisos de giroscopio).
- Al pulsar Jugar: la cámara baja hacia el tanque en ~0,8 s y entra el juego.
- Tanque 3D con formas geométricas (cuerpo + torreta + cañón) en estilo .io.

### Fase 4: Remotion (60 min, opcional, orientada al pitch)
- Proyecto en `video/` (React + Remotion), **fuera del despliegue**, con README de render.
- Composiciones:
  1. **Título animado** (2–3 s) para abrir el pitch.
  2. **Bucle k = 0→3** (10–12 s) con los valores de la tabla 8.4: sirve de clip en la diapositiva "tabla 8.4" y como GIF del README.
  3. **Teaser** de 15 s con capturas del juego.
- Los datos de las composiciones se leen de un JSON generado con `Quantum.runQuantum` (no se escriben a mano).
- Salida: `assets/*.webm` y `*.mp4`; si se usa en el juego, `<video muted loop playsinline>` con imagen de respaldo.
- Con un asistente de código se puede iterar escribiendo la composición en lenguaje natural y renderizando previsualizaciones; **la revisión humana de textos y cifras sigue siendo obligatoria**.

### Fase 5: rendimiento y cierre (30 min, obligatoria)
- **Rendimiento:** limitar `devicePixelRatio` a 1,5–2, sin sombras, geometrías simples, `requestAnimationFrame` pausado si la pestaña no está visible, `stop()` al pulsar Jugar para que el juego tenga toda la GPU.
- **Móvil:** probar a 360 px en un celular real; menos partículas en pantallas pequeñas.
- **Accesibilidad:** contraste de subtítulos, `prefers-reduced-motion`, botones ≥ 44 px, el 3D no debe tapar los botones.
- **Presupuesto:** peso total de la portada razonable para GitHub Pages (Three.js minificado pesa del orden de medio MB: medirlo).
- **Integración:** `node test/check-contract.js` y `node test/run-ui-tests.js` en verde; `integration-verifier` sobre la rama; confirmar que sin `Intro3D` todo sigue igual.
- **Honestidad:** subtítulo "ilustración con datos del simulador"; nada de "ventaja cuántica real" (sección 7 del brief).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El 3D consume la GPU y baja los fps del juego | `Intro3D.stop()` al pulsar Jugar; DPR limitado |
| Celular sin WebGL o muy lento | `start` devuelve `false` y queda el inicio actual |
| Wifi de la demo caído | `three.min.js` guardado en `js/vendor/`, nada de CDN en producción |
| Módulos ES no cargan con doble clic | Versión UMD local, sin `import` |
| El tiempo se va en pulir | Cortes definidos: 0+1+5 ya es una portada 3D funcional |
| Licencia de Remotion | Verificarla antes de depender de él; la fase 4 es opcional y el juego no la necesita |
| Animación que exagera o inventa | Datos de `Quantum.runQuantum`; subtítulos revisados con la sección 7 |

## Decisiones que necesito del equipo
1. ¿Vía A (3D en vivo) como prioridad y Remotion solo para el pitch? **Recomendado.**
2. ¿Hasta qué fase? Recomendado: **0, 1, 2 y 5**.
3. ¿Se aprueba añadir `js/intro3d.js` y `js/vendor/three.min.js` y dos `<script>` en `index.html`? (Lo toca quien integra.)
4. ¿Quién hace la fase 4 si se hace? Es independiente y se puede paralelizar.
