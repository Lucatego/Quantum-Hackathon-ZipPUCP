# Gandy: tareas de UI por fases (`feat/ui`)

Archivos propios: `js/ui.js`, `test/ui.html`, `test/ui.spec.js`, `test/ui.test.html`, `test/mini-test.js`, `test/run-ui-tests.js`, `test/check-contract.js`. Nada fuera de eso, salvo la fase 5 (integración).

**Estado:** fases 0–4 hechas (24/24 pruebas con jsdom). La fase 4 se revisó en Chrome a 360 px de ancho; lo último (HUD sin solaparse con los sectores) no se volvió a ver tras el ajuste. Fase 0: `ui.js` es un esqueleto; `test/ui.spec.js` ya tiene 24 pruebas escritas contra el contrato (están en rojo a propósito hasta implementar cada fase). Verificadas como alcanzables con una implementación de referencia desechable (24/24 con jsdom).

Agentes (en `.claude/agents/`): `ui-front` (implementa fases 0–4 con pruebas), `integration-verifier` (tras cada push de otra rama), `contract-auditor` (revisión de solo lectura del contrato).
Contrato: [`TAREAS.md`](../TAREAS.md). Agente que ejecuta las fases 0–4: `ui-front`.

Cada fase termina con **commit + tests en verde**. Si una fase se atrasa, se recorta la siguiente, no se salta la verificación.

| Fase | Tiempo aprox. | Entrega | Hecho cuando |
|---|---|---|---|
| 0. Cimientos | 10 min | `ui.js` con las 4 funciones como stubs seguros; `test/ui.test.html` con el mini-runner | `ui.test.html` abre y el test "contrato" pasa (existen las 4 funciones) |
| 1. `drawSectors` | 25 min | 8 cuñas/barras radiales, clásico y cuántico | Tests de geometría y color pasan; `test/ui.html` muestra k=0..3 |
| 2. `drawHUD` | 15 min | energía, cañón, k + costo, radar parpadeante | Tests de HUD pasan (no lanza con campos opcionales ausentes) |
| 3. Overlays | 25 min | `showStart` y `showEnd` (tabla, tarjeta, Qiskit copiable, replay) | Tests de DOM pasan; funciona sin `Content`/`Quantum` |
| 4. Pulido y móvil | 15 min | paleta, tamaños legibles en celular, estados vacíos | Revisión visual a 360 px de ancho; tests siguen verdes |
| 5. Integración | al final | verificar con el resto de ramas, QR y prueba en celular | `integration-verifier` sin hallazgos críticos |

## Fase 0: cimientos
- `window.UI = { drawHUD, drawSectors, showStart, showEnd }`, sin lógica de juego ni dependencias duras.
- `test/ui.test.html` + `test/ui.spec.js`: mini-runner (`test(nombre, fn)`, `assert`, `assertClose`) y un **contexto 2D grabador** (`makeRecordingCtx()`) que guarda las llamadas (`arc`, `fillRect`, `fillText`, `fillStyle`…) para poder afirmar qué se dibujó sin mirar pixeles.
- `node test/run-ui-tests.js` corre los mismos tests sin navegador (DOM mínimo simulado), para que los agentes los ejecuten desde la terminal.

## Fase 1: `drawSectors(ctx, x, y, result, cannon)`
- Sector `i` = cuña `[i·45°, (i+1)·45°)`, sentido horario desde +x (canvas).
- **Cuántico:** barra de amplitud (signo → color) + cono de probabilidad encima. Usa `result.amps`/`result.probs`.
- **Clásico:** barras de `probs`; los `discarded` en gris.
- `result == null` → no dibuja y no lanza.
- Tests: 8 sectores dibujados; amplitud negativa y positiva con color distinto; longitud proporcional a `|re|` y a `p`; descartados en gris; `null` seguro; no deja el `ctx` modificado (`save`/`restore` balanceados).

## Fase 2: `drawHUD(ctx, state)`
- Energía 0..100 (barra), cañón activo, `k` con costo (`state.cost`/`costPerQuery` si vienen), radar parpadeando solo si `state.radar`.
- Opcionales: `hp`, `botsLeft`, `searching`. Ausentes → no se dibujan, no hay `NaN`.
- Tests: energía fuera de rango se recorta a 0..100; ningún `fillText` contiene `NaN`/`undefined`; radar apagado no dibuja el indicador.

## Fase 3: `showStart` y `showEnd`
- `showStart(onPlay)`: líneas de `Content.start` o texto por defecto; botón "Jugar" llama `onPlay` y retira el overlay.
- `showEnd(log, onReplay)`: tabla cañón × k (disparos, aciertos, % observado vs. teórico), tarjeta de `Content.cards[Content.pickCard(log)]` con "ver más", bloque copiable de `Quantum.toQiskit(k)`, botón "Jugar otra vez".
- Robustez: `log` vacío, `Content` o `Quantum` inexistentes, `pickCard` que devuelve una clave inválida.
- Escapar el texto (usar `textContent`, no `innerHTML`, con datos del log).
- Tests: agregación correcta del log (p. ej. 30 disparos falsos), % observado, teoría tomada del log, overlay se retira, callbacks se invocan una sola vez.

## Fase 4: pulido y móvil
- Paleta propia con contraste legible; fuentes ≥ 14 px en overlays; botones ≥ 44 px.
- Verificar a 360×640 y 1280×720. `test/ui.html` con botones k=0..3 y el log falso (valores del contrato: 0,354/0,354 · 0,884/0,177 · 0,972/−0,088 · 0,575/−0,309).

## Fase 5: integración (cuando lleguen las otras ramas)
Disparada por el agente `integration-verifier` cada vez que alguien hace push de `feat/quantum`, `feat/game`, `feat/pitch`:
1. `node test/check-contract.js` (firmas y nombres globales).
2. Merge de prueba en un worktree temporal, nunca sobre `main`.
3. Pruebas de `ui.js` contra el `Quantum` y el `Content` reales (no solo mocks).
4. Prueba de humo en navegador de `index.html`.
5. Informe: qué rompe, de quién es la rama, qué cambio mínimo lo arregla.

## Riesgos conocidos
- `result.amps` con `{re, im}`: la amplitud mostrada es `re` (la fase es 0/π en este circuito); si llega `im ≠ 0`, usar `Math.hypot` con signo de `re`.
- `ctx` ya viene escalado: no volver a aplicar `devicePixelRatio`.
- `Content` carga primero, pero puede no existir en `test/ui.html`: nunca asumirlo.
