// UI de Collapse (Gandy). Solo dibuja; sin lógica de juego. Contrato en TAREAS.md.
// Fase 0: esqueleto. Las fases 1–4 están en docs/gandy-fases.md.
(function () {
  'use strict';

  function drawHUD(ctx, state) {}
  // ---- Sectores (fase 1) ----
  var R0 = 26;          // radio libre alrededor del tanque
  var RLEN = 70;        // largo de la barra para valor 1
  var GAP = Math.PI / 180 * 1.5;
  var COLOR = {
    pos: '#4cc9f0',       // amplitud +
    neg: '#ff6b9d',       // amplitud −
    prob: '#ffd166',      // cono de probabilidad
    live: '#80ed99',      // clásico: sector aún posible
    dead: '#8e9195',      // clásico: sector descartado (el gris se reserva para esto)
    guide: 'rgba(232,236,244,0.25)',
    text: '#e8ecf4'
  };

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function clamp01(v) { return Math.max(0, Math.min(1, num(v))); }

  // Cuña del sector i entre los radios r0 y r1; inset estrecha el ángulo (para el cono de probabilidad).
  function wedge(ctx, x, y, i, r0, r1, inset) {
    var a0 = i * Math.PI / 4 + GAP + inset, a1 = (i + 1) * Math.PI / 4 - GAP - inset;
    ctx.beginPath();
    ctx.arc(x, y, r1, a0, a1);
    ctx.arc(x, y, r0, a1, a0, true);
    ctx.closePath();
    ctx.fill();
  }

  function sectorLabel(ctx, x, y, i, text) {
    var a = (i + 0.5) * Math.PI / 4, r = R0 + RLEN + 14;
    ctx.fillStyle = COLOR.text;
    ctx.fillText(text, x + r * Math.cos(a), y + r * Math.sin(a));
  }

  function drawSectors(ctx, x, y, result, cannon) {
    if (!ctx || !result || !result.probs) return;
    x = num(x); y = num(y);
    var quantum = cannon === 'quantum';
    var dead = {};
    (result.discarded || []).forEach(function (d) { dead[d] = true; });

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR.guide;
    ctx.beginPath(); ctx.arc(x, y, R0 + RLEN, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < 8; i++) {
      var p = clamp01(result.probs[i]);
      if (quantum) {
        var a = result.amps && result.amps[i];
        var re = a ? num(a.re) : Math.sqrt(p);       // sin amps: se muestra |a| = √p
        ctx.globalAlpha = 1;
        ctx.fillStyle = re >= 0 ? COLOR.pos : COLOR.neg;
        wedge(ctx, x, y, i, R0, R0 + Math.min(1, Math.abs(re)) * RLEN, 0);
        ctx.globalAlpha = 0.6;                        // cono de probabilidad, más angosto, encima
        ctx.fillStyle = COLOR.prob;
        wedge(ctx, x, y, i, R0, R0 + p * RLEN, Math.PI / 20);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 1;
        if (dead[i]) {
          ctx.fillStyle = COLOR.dead;
          wedge(ctx, x, y, i, R0, R0 + 8, 0);         // tope fijo: descartado, sin probabilidad
        } else {
          ctx.fillStyle = COLOR.live;
          wedge(ctx, x, y, i, R0, R0 + p * RLEN, 0);
        }
      }
      sectorLabel(ctx, x, y, i, dead[i] ? '✕' : Math.round(p * 100) + '%');
    }
    ctx.restore();
  }
  function showStart(onPlay) {}
  function showEnd(log, onReplay) {}

  window.UI = { drawHUD: drawHUD, drawSectors: drawSectors, showStart: showStart, showEnd: showEnd };
})();
