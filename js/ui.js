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
  // ---- Overlays (fase 3) ----
  var OVERLAY_ID = 'ui-overlay';
  var DEFAULT_START = [
    'Hay un enemigo escondido en la niebla, en uno de 8 sectores.',
    'Elige cañón: el clásico descarta sectores; el cuántico amplifica el correcto.',
    'Misma energía y mismo sensor para los dos. Compara y decide.'
  ];

  function injectStyle() {
    if (document.getElementById('ui-style')) return;
    var s = document.createElement('style');
    s.id = 'ui-style';
    s.textContent =
      '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:10;display:flex;align-items:flex-start;justify-content:center;overflow:auto;' +
      'background:rgba(14,18,32,.94);color:' + COLOR.text + ';font:15px/1.5 system-ui,sans-serif;padding:16px;box-sizing:border-box}' +
      '#' + OVERLAY_ID + ' .box{width:100%;max-width:640px;margin:auto}' +
      '#' + OVERLAY_ID + ' h1{margin:0 0 12px;letter-spacing:.12em;color:' + COLOR.pos + '}' +
      '#' + OVERLAY_ID + ' h2,#' + OVERLAY_ID + ' h3{margin:20px 0 8px}' +
      '#' + OVERLAY_ID + ' button{min-height:44px;padding:0 18px;margin:8px 8px 0 0;font:600 15px system-ui,sans-serif;color:#0e1220;' +
      'background:' + COLOR.pos + ';border:0;border-radius:10px;cursor:pointer}' +
      '#' + OVERLAY_ID + ' button.alt{background:transparent;color:' + COLOR.text + ';border:1px solid ' + COLOR.guide + '}' +
      '#' + OVERLAY_ID + ' .scroll{overflow-x:auto}' +
      '#' + OVERLAY_ID + ' table{border-collapse:collapse;width:100%;min-width:420px}' +
      '#' + OVERLAY_ID + ' th,#' + OVERLAY_ID + ' td{padding:6px 8px;text-align:right;border-bottom:1px solid ' + COLOR.guide + '}' +
      '#' + OVERLAY_ID + ' th:first-child,#' + OVERLAY_ID + ' td:first-child{text-align:left}' +
      '#' + OVERLAY_ID + ' .card{background:rgba(232,236,244,.07);border-left:4px solid ' + COLOR.prob + ';border-radius:8px;padding:4px 14px 12px}' +
      '#' + OVERLAY_ID + ' summary{cursor:pointer;color:' + COLOR.prob + ';min-height:44px;display:flex;align-items:center}' +
      '#' + OVERLAY_ID + ' pre{margin:0;padding:12px;background:#080b16;border-radius:8px;overflow-x:auto;font-size:13px}';
    document.head.appendChild(s);
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;     // siempre textContent: los datos nunca se interpretan como HTML
    if (cls) e.className = cls;
    return e;
  }

  // Crea el overlay (reemplaza uno previo) y devuelve {root, box, close}.
  function openOverlay() {
    injectStyle();
    var old = document.getElementById(OVERLAY_ID);
    if (old) old.remove();
    var root = el('div'); root.id = OVERLAY_ID;
    var box = el('div', undefined, 'box');
    root.appendChild(box);
    document.body.appendChild(root);
    return { box: box, close: function () { root.remove(); } };
  }

  // Botón de un solo uso: cierra el overlay y llama cb una vez.
  function onceButton(label, o, cb, alt) {
    var done = false, b = el('button', label, alt ? 'alt' : '');
    b.type = 'button';
    b.addEventListener('click', function () {
      if (done) return;
      done = true;
      o.close();
      if (typeof cb === 'function') cb();
    });
    return b;
  }

  function pct(v) { return (v * 100).toFixed(1).replace('.', ',') + ' %'; }

  function showStart(onPlay) {
    var o = openOverlay();
    var lines = window.Content && Array.isArray(window.Content.start) && window.Content.start.length ? window.Content.start : DEFAULT_START;
    o.box.appendChild(el('h1', 'COLLAPSE'));
    lines.forEach(function (l) { o.box.appendChild(el('p', String(l))); });
    o.box.appendChild(onceButton('Jugar', o, onPlay));
  }

  // Agrupa el log por cañón × k: disparos, aciertos y teoría (promedio de log.theory).
  function summarize(log) {
    var groups = {};
    (Array.isArray(log) ? log : []).forEach(function (l) {
      if (!l || (l.cannon !== 'classic' && l.cannon !== 'quantum')) return;
      var k = Math.round(num(l.k)), key = l.cannon + '|' + k;
      var g = groups[key] || (groups[key] = { cannon: l.cannon, k: k, shots: 0, hits: 0, theory: 0 });
      g.shots++; if (l.hit) g.hits++; g.theory += num(l.theory);
    });
    return Object.keys(groups).map(function (key) { var g = groups[key]; g.theory /= g.shots; return g; })
      .sort(function (a, b) { return a.cannon === b.cannon ? a.k - b.k : (a.cannon === 'classic' ? -1 : 1); });
  }

  function statsTable(rows) {
    var wrap = el('div', undefined, 'scroll'), t = el('table'), head = el('tr');
    ['Cañón', 'k', 'Disparos', 'Aciertos', 'Observado', 'Teórico'].forEach(function (h) { head.appendChild(el('th', h)); });
    t.appendChild(head);
    rows.forEach(function (g) {
      var tr = el('tr');
      [g.cannon === 'quantum' ? 'Cuántico' : 'Clásico', String(g.k), String(g.shots), String(g.hits), pct(g.hits / g.shots), pct(g.theory)]
        .forEach(function (c) { tr.appendChild(el('td', c)); });
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    return wrap;
  }

  function cardFor(log) {
    try {
      var C = window.Content;
      var card = C && C.cards && C.cards[C.pickCard(log)];
      if (!card) return null;
      var box = el('div', undefined, 'card');
      box.appendChild(el('h3', String(card.titulo)));
      box.appendChild(el('p', String(card.intuitivo)));
      if (card.profundo) {
        var d = el('details');
        d.appendChild(el('summary', 'Ver más'));
        d.appendChild(el('p', String(card.profundo)));
        box.appendChild(d);
      }
      return box;
    } catch (e) { return null; }
  }

  function qiskitBlock(rows) {
    try {
      if (!window.Quantum || typeof window.Quantum.toQiskit !== 'function') return null;
      var best = null;                                   // k cuántico más usado; por defecto 2
      rows.forEach(function (g) { if (g.cannon === 'quantum' && (!best || g.shots > best.shots)) best = g; });
      var code = window.Quantum.toQiskit(best ? best.k : 2);
      if (typeof code !== 'string' || !code) return null;
      var box = el('div');
      box.appendChild(el('h3', 'Tu circuito en Qiskit (k = ' + (best ? best.k : 2) + ')'));
      box.appendChild(el('pre', code));
      var copy = el('button', 'Copiar código', 'alt');
      copy.type = 'button';
      copy.addEventListener('click', function () {
        try { navigator.clipboard.writeText(code); copy.textContent = 'Copiado'; } catch (e) { copy.textContent = 'Selecciona y copia'; }
      });
      box.appendChild(copy);
      return box;
    } catch (e) { return null; }
  }

  function showEnd(log, onReplay) {
    var o = openOverlay(), rows = summarize(log);
    o.box.appendChild(el('h1', 'FIN DE LA PARTIDA'));
    if (rows.length) {
      o.box.appendChild(el('h2', 'Observado vs. teoría'));
      o.box.appendChild(statsTable(rows));
      o.box.appendChild(el('p', 'Con pocas partidas lo observado se aleja de la teoría: es normal.'));
    } else {
      o.box.appendChild(el('p', 'No hubo disparos de búsqueda en esta partida.'));
    }
    var card = cardFor(log); if (card) o.box.appendChild(card);
    var q = qiskitBlock(rows); if (q) o.box.appendChild(q);
    o.box.appendChild(onceButton('Jugar otra vez', o, onReplay));
  }

  window.UI = { drawHUD: drawHUD, drawSectors: drawSectors, showStart: showStart, showEnd: showEnd };
})();
