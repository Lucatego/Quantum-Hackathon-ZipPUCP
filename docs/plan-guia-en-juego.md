# Plan: guía dentro del juego (por fases)

Objetivo: que alguien que abre el juego **sin leer nada** entienda en menos de un minuto qué hacer, qué muestran las barras y por qué el cañón cuántico a veces falla. Parte de [`GUIA.md`](GUIA.md) (texto fuente) y del juego que corre hoy en `main`.

Principios (del brief y del equipo):
- **Contrato aditivo:** nada de lo que ya existe cambia (`TAREAS.md`). Las funciones nuevas son opcionales y cada módulo sigue funcionando si falta alguna.
- `UI` solo dibuja y muestra; **no decide cuándo** (eso lo decide `Game`). `Content` solo trae textos.
- Los textos pasan el checklist de la sección 7 de `INDICACIONES.md`: sin "ventaja cuántica real", sin inventar cifras, oráculo presentado como abstracción.
- Cada fase se puede **entregar sola**. Si se acaba el tiempo, se corta en la última fase cerrada.

## Resumen

| Fase | Entrega | Dueño | Toca juego | Tiempo | Corte |
|---|---|---|---|---|---|
| 0. Acuerdo | Contrato nuevo acordado y textos base | Gandy + Alvaro | no | 15 min | — |
| 1. "Cómo jugar" | Pantalla de guía por diapositivas desde el inicio | Gandy | no | 30 min | **mínimo viable** |
| 2. Pistas en contexto | Avisos breves en el momento justo | Gandy + Lucas | 1 llamada | 30 min | **recomendada** |
| 3. Guía a demanda | Tecla/botón `?` que pausa y abre la guía | Lucas + Gandy | pausa | 25 min | opcional |
| 4. Práctica guiada | Primer encuentro tutorial con 1 bot | Lucas | sí | 45 min | solo si sobra tiempo |
| 5. Cierre | Pruebas, móvil, integración | Todos | no | 20 min | obligatoria |

Si queda poco tiempo: **0 + 1 + 5**. Con holgura: añadir la 2. Las fases 3 y 4 son de visión/pitch.

---

## Fase 0: acuerdo de contrato y textos (15 min)
**Qué se acuerda** (todo opcional, aditivo; avisar al grupo antes de empezar):
```js
UI.showGuide(onClose)        // guía completa por diapositivas; onClose se llama una vez al cerrar
UI.hint(key)                 // aviso breve no bloqueante, una vez por key y partida (Game lo llama en el evento)
Content.guide = [{ titulo, texto }, …]        // diapositivas (4 a 6)
Content.hints = { clave: 'texto corto', … }   // pistas
```
**Claves de pista acordadas** (Game las emite, UI las muestra):
`primerRadar`, `primeraBusqueda`, `energiaBaja`, `primerFallo`, `primerAciertoCuantico`, `kTresFalla`.

**Reglas:** si `Content.guide`/`Content.hints` no existen, `UI` usa textos por defecto propios; si `UI.hint`/`UI.showGuide` no existen, `Game` no los llama.

**Hecho cuando:** el contrato nuevo está escrito en `TAREAS.md` (PR pequeño) y Alvaro tiene la lista de diapositivas y pistas por redactar.

## Fase 1: pantalla "Cómo jugar" (30 min, solo UI)
Sin tocar `game.js`. Es el mínimo viable.

**Diapositivas** (una idea cada una, textos cortos; fuente: `GUIA.md` secciones 3 a 5):
1. **El reto:** hay un enemigo escondido en la niebla, en 1 de 8 sectores.
2. **Controles:** movimiento, apuntar, disparo normal, `Espacio`/clic derecho para buscar, `1`/`2` cañón, `Q`/`E` k.
3. **Dos cañones, misma energía:** costo `k × 20`, mismo sensor.
4. **Cómo leer las barras:** clásico (probabilidad, grises = descartados) y cuántico (cian/rosa = amplitud con signo, amarillo = probabilidad).
5. **La trampa:** con k = 3 el acierto cuántico cae (tabla 12,5 / 78,1 / 94,5 / 33,0 %).
6. **Una partida no demuestra nada:** la pantalla final compara observado vs. teoría.

**Implementación (`js/ui.js`):**
- `showGuide(onClose)` reutiliza `openOverlay()`/`onceButton()`; navegación `Anterior` / `Siguiente` / `Saltar` y puntos de progreso; teclado `←`/`→`/`Esc`.
- Un **ejemplo vivo** en la diapositiva 4: un `<canvas>` pequeño que llama a `drawSectors` con las amplitudes del contrato (k = 2) para clásico y cuántico: la guía enseña con el mismo dibujo del juego.
- `showStart` añade el botón secundario **"Cómo jugar"** que abre la guía y vuelve al inicio al cerrar.
- Textos desde `Content.guide`; por defecto, un arreglo propio.

**Pruebas (`test/ui.spec.js`):** avanzar/retroceder cambia de diapositiva; `Saltar`/`Esc` cierran y llaman `onClose` una sola vez; sin `Content` no lanza; texto escapado; botones de 44 px.

**Hecho cuando:** desde el inicio se abre la guía, se recorre en el celular a 360 px sin scroll horizontal y las pruebas están en verde.

## Fase 2: pistas en contexto (30 min)
Enseñar **en el momento**, no antes. Avisos pequeños, no bloqueantes, una vez por partida.

| Clave | Cuándo la emite `Game` | Mensaje (borrador) |
|---|---|---|
| `primerRadar` | primera vez que `radar` pasa a `true` | "Hay alguien en la niebla. Pulsa Espacio para buscarlo." |
| `primeraBusqueda` | al iniciar la primera búsqueda | "Mira las barras: así reparte tu cañón la probabilidad entre los 8 sectores." |
| `energiaBaja` | `energy < costo` al intentar buscar | "Sin energía para k = N. Baja k con Q o espera a que se regenere." |
| `primerFallo` | primer disparo de búsqueda fallido | "Fallar es normal: el disparo se muestrea según las probabilidades." |
| `primerAciertoCuantico` | primer acierto con cañón cuántico, k ≥ 1 | "El circuito amplificó el sector correcto. Mira cuánto creció su barra." |
| `kTresFalla` | fallo cuántico con k = 3 | "Con k = 3 te pasaste de iteraciones: la amplitud dio la vuelta." |

**Implementación:**
- `UI.hint(key)`: cola de un solo aviso visible (≈4 s), dibujado como pastilla DOM no interactiva (`pointer-events: none`) para no tapar el juego ni robar el clic; recuerda las keys ya mostradas **en esta partida** (se reinicia en `showStart`/`showEnd`).
- `Game`: una línea por evento, protegida (`window.UI && UI.hint && UI.hint('primerRadar')`). **Game decide el cuándo; UI decide el cómo.**
- Textos de `Content.hints[key]`, con respaldo propio si falta.

**Honestidad:** `kTresFalla` y `primerAciertoCuantico` describen **un resultado de esa partida**, no una prueba; el texto no debe sugerir que un acierto demuestra ventaja.

**Pruebas:** una key se muestra una sola vez; keys desconocidas se ignoran; sin `Content` hay texto por defecto; el aviso desaparece solo; no intercepta clics.

**Hecho cuando:** en una partida real aparecen las 6 pistas en su momento y ninguna se repite.

## Fase 3: guía a demanda con `?` / `H` (25 min, opcional)
- `Game`: tecla `H` (y botón `?` visible en celular) → **pausa** el bucle y llama `UI.showGuide(() => Game.resume())`. Requiere `Game.pause()/resume()` mínimos.
- `UI`: botón `?` en el HUD (solo dibujo + zona clicable que `Game` conecta).
- Una guía abierta **no consume energía ni deja a los bots disparar** mientras está en pausa.

**Hecho cuando:** `H` pausa y reanuda sin que los bots se muevan ni la energía cambie durante la pausa.

## Fase 4: práctica guiada (45 min, solo si sobra tiempo)
Un primer encuentro tutorial controlado, con pasos que se completan haciendo la acción:
1. Ponte cerca de la niebla (el bot de práctica se esconde allí y **no ataca**).
2. Haz una búsqueda con el cañón clásico, k = 1.
3. Cambia al cuántico (`2`) y busca con k = 2.
4. Repite con k = 3 y observa la caída.
5. Se abre el resultado con la comparación y el juego normal empieza.

**Requiere de `Game`:** modo `Game.config.tutorial = true` (1 bot pasivo, energía infinita, ruido 0) y un callback de paso completado. `UI` solo dibuja el panel de pasos y el resaltado. **Es el candidato a recortar:** si no hay tiempo, se presenta en el pitch como visión.

## Fase 5: cierre (20 min, obligatoria)
- `node test/run-ui-tests.js` (con `jsdom`) y `node test/check-contract.js` en verde.
- Revisión a 360 px y 1280 px: sin scroll horizontal, botones ≥ 44 px, fuentes ≥ 14 px.
- Guardar `localStorage` solo como comodidad (`guiaVista`): **la primera vez** abre la guía tras "Jugar"; después no. Debe funcionar sin `localStorage` (modo privado) envuelto en `try/catch`.
- Pasar `contract-auditor` sobre los textos (sección 7) y `integration-verifier` sobre la rama integrada.
- Actualizar `docs/GUIA.md` (controles de `H`/`?` si se hizo la fase 3).

## Riesgos y decisiones

| Riesgo | Mitigación |
|---|---|
| Cambiar contrato rompe a otro | Solo funciones opcionales; avisar en el grupo antes de la fase 0 |
| Tutorial largo aburre | Una idea por diapositiva, `Saltar` siempre visible, solo la primera vez |
| Pistas tapan el juego | No bloqueantes, `pointer-events: none`, ≤ 4 s, una vez por partida |
| Textos inexactos o infladores | Revisión con la sección 7; cifras solo de la tabla 8.4 |
| `Content` no llega a tiempo | Textos por defecto dentro de `ui.js`; `Content` los sobrescribe |
| Fase 4 consume el tiempo | Se corta; va al pitch como visión |

## Decisiones que necesito de ustedes
1. ¿Se acepta el contrato aditivo de la fase 0 (`UI.showGuide`, `UI.hint`, `Content.guide`, `Content.hints`)?
2. ¿Hasta qué fase se llega? Recomendación: **0, 1, 2 y 5**.
3. ¿Quién redacta los textos: Alvaro (en `content.js`) o los escribe Gandy como respaldo en `ui.js`?
