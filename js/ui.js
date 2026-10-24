// UI de Collapse (Gandy). Solo dibuja; sin lógica de juego. Contrato en TAREAS.md.
// Fase 0: esqueleto. Las fases 1–4 están en docs/gandy-fases.md.
(function () {
  'use strict';

  // ---- HUD (fase 2) ----
  var HUD = { x: 12, y: 12, barW: 180, barH: 12, blinkMs: 250 };

  function pill(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawHUD(ctx, state) {
    if (!ctx || !state) return;
    var quantum = state.cannon === 'quantum';
    var energy = Math.max(0, Math.min(100, num(state.energy)));
    var k = Math.round(num(state.k));
    var x = HUD.x, y = HUD.y;

    ctx.save();
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Cañón activo + k (y costo si Game lo informa)
    pill(ctx, x, y, 10, 22, quantum ? COLOR.pos : COLOR.prob);
    ctx.fillStyle = COLOR.text;
    var line = (quantum ? 'CUÁNTICO' : 'CLÁSICO') + ' · k = ' + k;
    if (typeof state.cost === 'number' && isFinite(state.cost)) line += ' · costo ' + Math.round(state.cost);
    else if (typeof state.costPerQuery === 'number' && isFinite(state.costPerQuery)) line += ' · ' + Math.round(state.costPerQuery) + '/consulta';
    ctx.fillText(line, x + 18, y + 11);

    // Energía 0..100
    var by = y + 34;
    ctx.fillStyle = 'rgba(232,236,244,0.15)';
    ctx.fillRect(x, by, HUD.barW, HUD.barH);
    ctx.fillStyle = energy < 25 ? COLOR.neg : COLOR.live;
    ctx.fillRect(x, by, HUD.barW * energy / 100, HUD.barH);
    ctx.fillStyle = COLOR.text;
    ctx.fillText('Energía ' + Math.round(energy), x + HUD.barW + 10, by + HUD.barH / 2);

    // Opcionales: vida y bots restantes
    var extra = [];
    if (typeof state.hp === 'number' && isFinite(state.hp)) extra.push('Vida ' + Math.round(state.hp));
    if (typeof state.botsLeft === 'number' && isFinite(state.botsLeft)) extra.push('Bots ' + Math.round(state.botsLeft));
    if (extra.length) { ctx.fillStyle = COLOR.text; ctx.fillText(extra.join(' · '), x, by + 30); }

    // Radar "hay alguien": parpadea con Date.now()
    if (state.radar) {
      var on = Math.floor(Date.now() / HUD.blinkMs) % 2 === 0;
      var ry = by + (extra.length ? 58 : 30);
      if (on) { ctx.fillStyle = COLOR.neg; ctx.beginPath(); ctx.arc(x + 8, ry, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = COLOR.text;
      ctx.fillText(state.searching ? 'Buscando…' : 'Radar: hay alguien (Espacio)', x + 22, ry);
    } else if (state.searching) {
      ctx.fillStyle = COLOR.text;
      ctx.fillText('Buscando…', x, by + (extra.length ? 58 : 30));
    }
    ctx.restore();
  }
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
