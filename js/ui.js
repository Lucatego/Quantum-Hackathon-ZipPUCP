// UI de Collapse (Gandy). Solo dibuja; sin lógica de juego. Contrato en TAREAS.md.
// Fase 0: esqueleto. Las fases 1–4 están en docs/gandy-fases.md.
(function () {
  'use strict';

  function drawHUD(ctx, state) {}
  function drawSectors(ctx, x, y, result, cannon) {}
  function showStart(onPlay) {}
  function showEnd(log, onReplay) {}

  window.UI = { drawHUD: drawHUD, drawSectors: drawSectors, showStart: showStart, showEnd: showEnd };
})();
