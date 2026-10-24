// Pruebas de js/ui.js contra el contrato de TAREAS.md. Requiere test/mini-test.js y js/ui.js cargados.
// No dependen de cómo se dibuja: afirman sobre lo observable (colores, llamadas, texto, callbacks).
(function () {
  var HAS_DOM = typeof document !== 'undefined' && !!document.body;

  // ---------- Contexto 2D grabador ----------
  function makeRecordingCtx() {
    var ctx = {
      calls: [], fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
      font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter'
    };
    ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'rect', 'ellipse',
      'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'translate', 'rotate',
      'scale', 'setTransform', 'clip', 'quadraticCurveTo', 'bezierCurveTo', 'setLineDash', 'roundRect']
      .forEach(function (op) {
        ctx[op] = function () {
          ctx.calls.push({ op: op, args: Array.prototype.slice.call(arguments), fill: ctx.fillStyle, stroke: ctx.strokeStyle, alpha: ctx.globalAlpha });
        };
      });
    ctx.measureText = function (s) { return { width: String(s).length * 7 }; };
    ctx.createLinearGradient = ctx.createRadialGradient = function () { return { addColorStop: function () {} }; };
    return ctx;
  }

  var FILLS = { fill: 1, fillRect: 1, fillText: 1 };
  function fillColors(ctx) {
    var s = {};
    ctx.calls.forEach(function (c) { if (FILLS[c.op]) s[c.fill] = true; });
    return Object.keys(s);
  }
  function fillLayers(ctx) { // combinaciones color+alpha distintas
    var s = {};
    ctx.calls.forEach(function (c) { if (c.op === 'fill' || c.op === 'fillRect') s[c.fill + '@' + c.alpha] = true; });
    return Object.keys(s);
  }
  function texts(ctx) {
    return ctx.calls.filter(function (c) { return c.op === 'fillText' || c.op === 'strokeText'; })
      .map(function (c) { return String(c.args[0]); });
  }
  function badNumbers(ctx) {
    return ctx.calls.filter(function (c) {
      return c.op !== 'fillText' && c.op !== 'strokeText' && c.args.some(function (a) { return typeof a === 'number' && !isFinite(a); });
    });
  }
  function balanced(ctx) {
    var d = 0;
    for (var i = 0; i < ctx.calls.length; i++) {
      if (ctx.calls[i].op === 'save') d++;
      if (ctx.calls[i].op === 'restore') { d--; if (d < 0) return false; }
    }
    return d === 0;
  }
  // 'rgb(…)', '#rgb', '#rrggbb', 'hsl(…)' → [r,g,b] o null
  function parseColor(c) {
    var m;
    c = String(c).trim().toLowerCase();
    if ((m = /^#([0-9a-f]{3})$/.exec(c))) return m[1].split('').map(function (h) { return parseInt(h + h, 16); });
    if ((m = /^#([0-9a-f]{6})/.exec(c))) return [0, 2, 4].map(function (i) { return parseInt(m[1].substr(i, 2), 16); });
    if ((m = /^rgba?\(([^)]+)\)/.exec(c))) return m[1].split(',').slice(0, 3).map(parseFloat);
    if ((m = /^hsla?\(([^)]+)\)/.exec(c))) {
      var p = m[1].split(',').map(parseFloat), h = p[0] / 360, s = p[1] / 100, l = p[2] / 100;
      if (s === 0) return [l * 255, l * 255, l * 255];
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, a = 2 * l - q;
      var f = function (t) { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? a + (q - a) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? a + (q - a) * (2 / 3 - t) * 6 : a); };
      return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
    }
    return null;
  }
  function isGrey(c) {
    var rgb = parseColor(c);
    return !!rgb && Math.max.apply(null, rgb) - Math.min.apply(null, rgb) <= 12 && rgb[0] > 25 && rgb[0] < 235;
  }
  function greyFills(ctx) { return ctx.calls.filter(function (c) { return (c.op === 'fill' || c.op === 'fillRect') && isGrey(c.fill); }).length; }

  // ---------- Datos de prueba (valores del contrato) ----------
  var KT = { 0: [0.354, 0.354], 1: [0.884, 0.177], 2: [0.972, -0.088], 3: [0.575, -0.309] };
  var THEORY = { 0: 0.125, 1: 0.781, 2: 0.945, 3: 0.33 };
  function quantumResult(k, target) {
    var amps = [], probs = [];
    for (var i = 0; i < 8; i++) {
      var re = i === target ? KT[k][0] : KT[k][1];
      amps.push({ re: re, im: 0 }); probs.push(re * re);
    }
    return { amps: amps, probs: probs, theory: THEORY[k] };
  }
  function classicResult(discarded) {
    var probs = [], live = 8 - discarded.length;
    for (var i = 0; i < 8; i++) probs.push(discarded.indexOf(i) >= 0 ? 0 : 1 / live);
    return { probs: probs, discarded: discarded, found: false, theory: (discarded.length + 1) / 8 };
  }
  function fakeLog() { // ~30 disparos: clásico k 0..3 y cuántico k 0..3
    var log = [], t = 0;
    [['classic', 0], ['classic', 1], ['classic', 2], ['classic', 3], ['quantum', 0], ['quantum', 1], ['quantum', 2], ['quantum', 3]]
      .forEach(function (ck, n) {
        var shots = n === 6 ? 8 : 3; // quantum k=2: 8 disparos, 7 aciertos
        for (var j = 0; j < shots; j++) {
          var th = ck[0] === 'quantum' ? THEORY[ck[1]] : (ck[1] + 1) / 8;
          var hit = ck[0] === 'quantum' && ck[1] === 2 ? j !== 0 : j === 0;
          log.push({ cannon: ck[0], k: ck[1], target: 2, shot: hit ? 2 : 5, hit: hit, theory: th, t: t++ });
        }
      });
    return log;
  }
  var ENERGY_STATE = { energy: 64, cannon: 'quantum', k: 2, radar: false };

  // ---------- Contrato ----------
  test('contrato: window.UI expone las 4 funciones', function () {
    assert(window.UI, 'falta window.UI');
    ['drawHUD', 'drawSectors', 'showStart', 'showEnd'].forEach(function (f) {
      assertEq(typeof window.UI[f], 'function', 'UI.' + f);
    });
  });

  // ---------- drawSectors ----------
  test('drawSectors: result null no lanza y no dibuja', function () {
    var c = makeRecordingCtx();
    UI.drawSectors(c, 100, 100, null, 'quantum');
    UI.drawSectors(c, 100, 100, null, 'classic');
    assertEq(c.calls.length, 0, 'llamadas');
  });

  test('drawSectors: cuántico k=0..3 dibuja, sin NaN y con save/restore balanceados', function () {
    [0, 1, 2, 3].forEach(function (k) {
      var c = makeRecordingCtx();
      UI.drawSectors(c, 200, 150, quantumResult(k, 3), 'quantum');
      assert(c.calls.length > 0, 'k=' + k + ' no dibujó nada');
      assertEq(badNumbers(c).length, 0, 'k=' + k + ' argumentos no finitos');
      assert(balanced(c), 'k=' + k + ' save/restore desbalanceados');
    });
  });

  test('drawSectors: cuántico muestra capas distintas para amplitud y probabilidad', function () {
    var c = makeRecordingCtx();
    UI.drawSectors(c, 200, 150, quantumResult(1, 3), 'quantum');
    assert(fillLayers(c).length >= 2, 'solo hay ' + fillLayers(c).length + ' capa(s) de relleno; se esperan amplitud y probabilidad');
  });

  test('drawSectors: el signo de la amplitud cambia el color', function () {
    var pos = quantumResult(2, 3), neg = quantumResult(2, 3);
    for (var i = 0; i < 8; i++) { pos.amps[i].re = Math.abs(pos.amps[i].re); neg.amps[i].re = i === 5 ? -Math.abs(neg.amps[i].re) : Math.abs(neg.amps[i].re); }
    var a = makeRecordingCtx(), b = makeRecordingCtx();
    UI.drawSectors(a, 200, 150, pos, 'quantum');
    UI.drawSectors(b, 200, 150, neg, 'quantum');
    assert(JSON.stringify(fillColors(a).sort()) !== JSON.stringify(fillColors(b).sort()), 'mismo conjunto de colores con signo distinto');
  });

  test('drawSectors: la amplitud (no solo la probabilidad) define lo que se ve', function () {
    var a = quantumResult(2, 3), b = quantumResult(2, 3);
    for (var i = 0; i < 8; i++) b.amps[i].re = -a.amps[i].re; // mismas probs, signos opuestos
    var ca = makeRecordingCtx(), cb = makeRecordingCtx();
    UI.drawSectors(ca, 200, 150, a, 'quantum');
    UI.drawSectors(cb, 200, 150, b, 'quantum');
    assert(JSON.stringify(ca.calls) !== JSON.stringify(cb.calls), 'dibujo idéntico con amplitudes opuestas');
  });

  test('drawSectors: clásico pinta de gris los sectores descartados', function () {
    var withDiscard = makeRecordingCtx(), none = makeRecordingCtx();
    UI.drawSectors(withDiscard, 200, 150, classicResult([0, 1, 2]), 'classic');
    UI.drawSectors(none, 200, 150, classicResult([]), 'classic');
    assert(greyFills(withDiscard) > greyFills(none), 'sin más grises con descartados (' + greyFills(withDiscard) + ' vs ' + greyFills(none) + '); el gris se reserva para descartados');
    assertEq(badNumbers(withDiscard).length, 0, 'argumentos no finitos');
    assert(balanced(withDiscard), 'save/restore desbalanceados');
  });

  test('drawSectors: clásico y cuántico se ven distintos con las mismas probabilidades', function () {
    var q = quantumResult(1, 3), cl = classicResult([]);
    cl.probs = q.probs.slice();
    var a = makeRecordingCtx(), b = makeRecordingCtx();
    UI.drawSectors(a, 200, 150, q, 'quantum');
    UI.drawSectors(b, 200, 150, cl, 'classic');
    assert(JSON.stringify(a.calls) !== JSON.stringify(b.calls), 'ambos cañones dibujan igual');
  });

  test('drawSectors: tolera campos ausentes (sin discarded, sin theory, cannon desconocido)', function () {
    var c = makeRecordingCtx();
    UI.drawSectors(c, 50, 50, { probs: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2] }, 'classic');
    UI.drawSectors(c, 50, 50, quantumResult(2, 0), 'otro');
    assertEq(badNumbers(c).length, 0, 'argumentos no finitos');
  });

  // ---------- drawHUD ----------
  function withNow(t, fn) { var real = Date.now; Date.now = function () { return t; }; try { fn(); } finally { Date.now = real; } }

  test('drawHUD: estado mínimo y con extras no lanza ni produce NaN/undefined en el texto', function () {
    var c = makeRecordingCtx();
    UI.drawHUD(c, ENERGY_STATE);
    UI.drawHUD(c, { energy: 20, cannon: 'classic', k: 0, radar: true, hp: 3, botsLeft: 4, cost: 10, costPerQuery: 5, searching: true });
    assert(c.calls.length > 0, 'no dibujó nada');
    assertEq(badNumbers(c).length, 0, 'argumentos no finitos');
    texts(c).forEach(function (s) { assert(!/NaN|undefined|null/.test(s), 'texto inválido: ' + s); });
  });

  test('drawHUD: energía fuera de 0..100 se recorta (sin NaN, sin salirse de la barra)', function () {
    [-50, 0, 100, 250].forEach(function (e) {
      var c = makeRecordingCtx();
      UI.drawHUD(c, { energy: e, cannon: 'quantum', k: 1, radar: false });
      assertEq(badNumbers(c).length, 0, 'energy=' + e);
    });
    var lo = makeRecordingCtx(), hi = makeRecordingCtx();
    UI.drawHUD(lo, { energy: -50, cannon: 'quantum', k: 1, radar: false });
    UI.drawHUD(hi, { energy: 250, cannon: 'quantum', k: 1, radar: false });
    var zero = makeRecordingCtx(), full = makeRecordingCtx();
    UI.drawHUD(zero, { energy: 0, cannon: 'quantum', k: 1, radar: false });
    UI.drawHUD(full, { energy: 100, cannon: 'quantum', k: 1, radar: false });
    assertEq(JSON.stringify(lo.calls), JSON.stringify(zero.calls), '-50 debe verse como 0');
    assertEq(JSON.stringify(hi.calls), JSON.stringify(full.calls), '250 debe verse como 100');
  });

  test('drawHUD: más energía se dibuja distinto que menos energía', function () {
    var a = makeRecordingCtx(), b = makeRecordingCtx();
    UI.drawHUD(a, { energy: 20, cannon: 'quantum', k: 1, radar: false });
    UI.drawHUD(b, { energy: 80, cannon: 'quantum', k: 1, radar: false });
    assert(JSON.stringify(a.calls) !== JSON.stringify(b.calls), 'la energía no cambia el dibujo');
  });

  test('drawHUD: cambiar de cañón o de k cambia el dibujo', function () {
    var base = makeRecordingCtx(), cann = makeRecordingCtx(), kk = makeRecordingCtx();
    UI.drawHUD(base, { energy: 50, cannon: 'quantum', k: 1, radar: false });
    UI.drawHUD(cann, { energy: 50, cannon: 'classic', k: 1, radar: false });
    UI.drawHUD(kk, { energy: 50, cannon: 'quantum', k: 3, radar: false });
    assert(JSON.stringify(base.calls) !== JSON.stringify(cann.calls), 'el cañón no cambia el HUD');
    assert(JSON.stringify(base.calls) !== JSON.stringify(kk.calls), 'k no cambia el HUD');
  });

  test('drawHUD: el radar parpadea (usa Date.now) y radar=false no dibuja el indicador', function () {
    var off = makeRecordingCtx();
    UI.drawHUD(off, { energy: 50, cannon: 'quantum', k: 1, radar: false });
    var frames = [0, 150, 300, 450, 600, 750].map(function (t) {
      var c = makeRecordingCtx();
      withNow(t, function () { UI.drawHUD(c, { energy: 50, cannon: 'quantum', k: 1, radar: true }); });
      return JSON.stringify(c.calls);
    });
    var distinct = {}; frames.forEach(function (f) { distinct[f] = true; });
    assert(Object.keys(distinct).length >= 2, 'el radar no parpadea en el tiempo');
    assert(frames.some(function (f) { return f !== JSON.stringify(off.calls); }), 'radar=true nunca difiere de radar=false');
    var again = makeRecordingCtx();
    withNow(300, function () { UI.drawHUD(again, { energy: 50, cannon: 'quantum', k: 1, radar: false }); });
    assertEq(JSON.stringify(again.calls), JSON.stringify(off.calls), 'radar=false depende del tiempo');
  });

  test('drawHUD: balancea save/restore', function () {
    var c = makeRecordingCtx();
    UI.drawHUD(c, { energy: 50, cannon: 'classic', k: 2, radar: true, hp: 2, botsLeft: 5 });
    assert(balanced(c), 'save/restore desbalanceados');
  });

  // ---------- Overlays (requieren DOM) ----------
  function dom(name, fn) {
    if (!HAS_DOM) { skip(name, 'sin DOM (en Node instala jsdom o usa test/ui.test.html)'); return; }
    test(name, function () {
      var savedC = window.Content, savedQ = window.Quantum;
      document.body.innerHTML = '';
      try { fn(); }
      finally { window.Content = savedC; window.Quantum = savedQ; document.body.innerHTML = ''; }
    });
  }
  function bodyText() { return document.body.textContent || ''; }
  function buttons() { return Array.prototype.slice.call(document.querySelectorAll('button')); }

  dom('showStart: sin Content muestra texto por defecto y un botón', function () {
    window.Content = undefined;
    UI.showStart(function () {});
    assert(bodyText().trim().length > 0, 'overlay vacío');
    assert(buttons().length >= 1, 'falta el botón Jugar');
  });

  dom('showStart: monta la portada 3D si Intro3D arranca y la detiene al pulsar Jugar', function () {
    var saved = window.Intro3D, starts = 0, stops = 0, host = null;
    try {
      window.Intro3D = { start: function (c) { starts++; host = c; return true; }, stop: function () { stops++; } };
      var played = 0;
      UI.showStart(function () { played++; });
      assertEq(starts, 1, 'start');
      assert(host && host.nodeType === 1, 'start debe recibir un elemento contenedor');
      assert(document.getElementById('ui-overlay').contains(host), 'el contenedor debe estar dentro del overlay');
      buttons()[0].click();
      assertEq(stops, 1, 'stop al jugar');
      assertEq(played, 1, 'onPlay');
    } finally { window.Intro3D = saved; }
  });

  dom('showStart: Intro3D que no puede (false) o que lanza no rompe el inicio 2D', function () {
    var saved = window.Intro3D;
    try {
      window.Intro3D = { start: function () { return false; }, stop: function () { throw new Error('no debería llamarse'); } };
      UI.showStart(function () {});
      assert(buttons().length >= 1, 'falta el botón Jugar con start=false');
      assertEq(document.querySelectorAll('#ui-overlay .stage').length, 0, 'el contenedor vacío debe retirarse');
      document.body.innerHTML = '';
      window.Intro3D = { start: function () { throw new Error('boom'); }, stop: function () {} };
      UI.showStart(function () {});
      assert(buttons().length >= 1, 'falta el botón Jugar con start que lanza');
    } finally { window.Intro3D = saved; }
  });

  dom('showStart: abrir la guía detiene la portada 3D y volver al inicio la reinicia', function () {
    var saved = window.Intro3D, starts = 0, stops = 0;
    try {
      window.Intro3D = { start: function () { starts++; return true; }, stop: function () { stops++; } };
      UI.showStart(function () {});
      btn(/Cómo jugar/).click();
      assertEq(stops, 1, 'stop al abrir la guía');
      btn(/Saltar/).click();
      assertEq(starts, 2, 'start al volver al inicio');
      btn(/^Jugar$/).click();
      assertEq(stops, 2, 'stop al jugar');
    } finally { window.Intro3D = saved; }
  });

  dom('showStart: primer vistazo = título, una frase y Jugar; el resto va plegado', function () {
    window.Content = { start: ['FRASE-UNO', 'FRASE-DOS', 'FRASE-TRES'], myths: ['MITO-1'], truths: ['VERDAD-1'] };
    UI.showStart(function () {});
    var more = document.querySelector('#ui-overlay details.more');
    assert(more, 'falta el bloque plegable');
    assert(!more.contains(document.querySelector('#ui-overlay h1')), 'el título no debe ir plegado');
    var tag = document.querySelector('#ui-overlay .tagline');
    assertEq(tag.textContent, 'FRASE-UNO', 'la frase principal es la primera línea');
    assert(!more.contains(tag), 'la frase principal no debe ir plegada');
    assert(!more.contains(buttons()[0]) && buttons()[0].textContent === 'Jugar', 'Jugar debe verse sin desplegar nada');
    ['FRASE-DOS', 'FRASE-TRES', 'MITO-1', 'VERDAD-1'].forEach(function (t) { assert(more.textContent.indexOf(t) >= 0, 'falta en el bloque plegado: ' + t); });
    assert(!more.open, 'el bloque debe empezar cerrado');
  });

  dom('showStart: orden del primer vistazo (título, frase, botones) y hay ayuda de teclas', function () {
    window.Content = undefined;
    UI.showStart(function () {});
    var hero = document.querySelector('#ui-overlay .hero'), kids = Array.prototype.map.call(hero.children, function (c) { return c.className || c.tagName; });
    assert(kids.indexOf('H1') >= 0 && kids.indexOf('tagline') > kids.indexOf('H1') && kids.indexOf('actions') > kids.indexOf('tagline'), 'orden inesperado: ' + kids.join(','));
    assert(/WASD/.test(document.querySelector('#ui-overlay .hint').textContent), 'falta la ayuda de controles');
  });

  dom('showStart: usa las líneas de Content.start', function () {
    window.Content = { start: ['LINEA-UNO', 'LINEA-DOS', 'LINEA-TRES'] };
    UI.showStart(function () {});
    ['LINEA-UNO', 'LINEA-DOS', 'LINEA-TRES'].forEach(function (s) { assert(bodyText().indexOf(s) >= 0, 'falta ' + s); });
  });

  dom('showStart: Jugar llama onPlay una sola vez y retira el overlay', function () {
    var n = 0;
    UI.showStart(function () { n++; });
    var b = buttons()[0]; b.click(); b.click();
    assertEq(n, 1, 'onPlay');
    assertEq(buttons().length, 0, 'el overlay sigue en pantalla');
  });

  // ---------- Guía "Cómo jugar" ----------
  function btn(re) { return buttons().filter(function (b) { return re.test(b.textContent); })[0]; }
  function key(k) { document.dispatchEvent(new KeyboardEvent('keydown', { key: k })); }

  test('contrato: UI.showGuide existe (aditivo)', function () { assertEq(typeof window.UI.showGuide, 'function', 'UI.showGuide'); });

  dom('showStart: ofrece "Cómo jugar" sin quitar el botón Jugar', function () {
    UI.showStart(function () {});
    assert(btn(/^Jugar$/), 'falta Jugar');
    assert(btn(/Cómo jugar/), 'falta Cómo jugar');
    assertEq(buttons()[0].textContent, 'Jugar', 'Jugar debe ser el primer botón');
  });

  dom('showGuide: muestra la primera diapositiva y avanza/retrocede', function () {
    window.Content = undefined;
    UI.showGuide(function () {});
    assert(/El reto/.test(bodyText()), 'falta la primera diapositiva');
    assert(btn(/Anterior/).disabled, 'Anterior debe estar deshabilitado en la primera');
    btn(/Siguiente/).click();
    assert(/Controles/.test(bodyText()), 'no avanzó');
    btn(/Anterior/).click();
    assert(/El reto/.test(bodyText()), 'no retrocedió');
  });

  dom('showGuide: la última diapositiva cierra y llama onClose una sola vez', function () {
    window.Content = undefined;
    var n = 0;
    UI.showGuide(function () { n++; });
    for (var i = 0; i < 20 && btn(/Siguiente/); i++) btn(/Siguiente/).click();
    var done = btn(/Listo/); assert(done, 'falta el botón Listo en la última');
    done.click();
    assertEq(n, 1, 'onClose');
    assertEq(buttons().length, 0, 'el overlay sigue en pantalla');
  });

  dom('showGuide: Saltar y Esc cierran una sola vez', function () {
    var n = 0;
    UI.showGuide(function () { n++; });
    btn(/Saltar/).click();
    assertEq(n, 1, 'Saltar');
    UI.showGuide(function () { n++; });
    key('Escape'); key('Escape');
    assertEq(n, 2, 'Esc');
  });

  dom('showGuide: flechas del teclado navegan', function () {
    window.Content = undefined;
    UI.showGuide(function () {});
    key('ArrowRight');
    assert(/Controles/.test(bodyText()), 'ArrowRight no avanzó');
    key('ArrowLeft');
    assert(/El reto/.test(bodyText()), 'ArrowLeft no retrocedió');
    key('Escape');
  });

  dom('showGuide: usa Content.guide y escapa el texto', function () {
    window.Content = { guide: [{ titulo: 'T-PROPIO <b id="xss">x</b>', texto: 'PARRAFO-1\nPARRAFO-2' }] };
    UI.showGuide(function () {});
    assert(bodyText().indexOf('PARRAFO-1') >= 0 && bodyText().indexOf('PARRAFO-2') >= 0, 'falta el texto de Content.guide');
    assertEq(document.getElementById('xss'), null, 'el título se inyectó como HTML');
    assert(btn(/Listo/), 'con una sola diapositiva el botón debe ser Listo');
  });

  dom('showGuide: Content.guide inválido cae al texto por defecto', function () {
    window.Content = { guide: [{ titulo: 5 }, null] };
    UI.showGuide(function () {});
    assert(/El reto/.test(bodyText()), 'no usó el respaldo');
    key('Escape');
  });

  dom('showGuide: la diapositiva de las barras incluye ejemplos dibujados', function () {
    window.Content = undefined;
    UI.showGuide(function () {});
    for (var i = 0; i < 3; i++) btn(/Siguiente/).click();
    assert(/Cómo leer las barras/.test(bodyText()), 'no llegó a la diapositiva 4');
    assertEq(document.querySelectorAll('#ui-overlay canvas').length, 2, 'se esperan 2 canvas (clásico y cuántico)');
    key('Escape');
  });

  dom('showGuide: "Cómo jugar" desde el inicio abre la guía y al cerrar vuelve al inicio', function () {
    var played = 0;
    UI.showStart(function () { played++; });
    btn(/Cómo jugar/).click();
    assert(/El reto/.test(bodyText()), 'no abrió la guía');
    btn(/Saltar/).click();
    assert(btn(/^Jugar$/), 'no volvió al inicio');
    btn(/^Jugar$/).click();
    assertEq(played, 1, 'onPlay');
  });

  dom('showEnd: log vacío no lanza y deja el botón de repetir', function () {
    window.Content = undefined; window.Quantum = undefined;
    UI.showEnd([], function () {});
    assert(buttons().length >= 1, 'falta "Jugar otra vez"');
  });

  dom('showEnd: tabla con disparos, aciertos y % observado/teórico con un decimal', function () {
    window.Content = undefined; window.Quantum = undefined;
    UI.showEnd(fakeLog(), function () {});
    var t = bodyText();
    assert(/87[.,]5\s*%/.test(t), 'falta % observado de cuántico k=2 (7/8 = 87,5 %)');
    assert(/94[.,]5\s*%/.test(t), 'falta % teórico de cuántico k=2 (94,5 %)');
    assert(/33[.,]0\s*%/.test(t), 'falta % teórico de cuántico k=3 (33,0 %)');
  });

  dom('showEnd: muestra la tarjeta de Content.pickCard y escapa el texto', function () {
    window.Quantum = undefined;
    window.Content = {
      cards: { amplitud: { titulo: 'TITULO <b id="xss">x</b>', intuitivo: 'INTUITIVO', profundo: 'PROFUNDO' } },
      pickCard: function () { return 'amplitud'; }
    };
    UI.showEnd(fakeLog(), function () {});
    assert(bodyText().indexOf('INTUITIVO') >= 0, 'falta el texto intuitivo');
    assertEq(document.getElementById('xss'), null, 'el título se inyectó como HTML');
  });

  dom('showEnd: pickCard con clave inválida o Content incompleto no lanza', function () {
    window.Quantum = undefined;
    window.Content = { cards: {}, pickCard: function () { return 'no-existe'; } };
    UI.showEnd(fakeLog(), function () {});
    document.body.innerHTML = '';
    window.Content = { pickCard: function () { throw new Error('boom'); } };
    UI.showEnd(fakeLog(), function () {});
  });

  dom('showEnd: incluye el código de Quantum.toQiskit', function () {
    window.Content = undefined;
    window.Quantum = { toQiskit: function (k) { return 'QISKIT-STUB k=' + k; } };
    UI.showEnd(fakeLog(), function () {});
    assert(/QISKIT-STUB k=\d/.test(bodyText()), 'falta el bloque Qiskit');
  });

  dom('showEnd: "Jugar otra vez" llama onReplay una sola vez', function () {
    window.Content = undefined; window.Quantum = undefined;
    var n = 0;
    UI.showEnd(fakeLog(), function () { n++; });
    var replay = buttons().filter(function (b) { return /otra vez|jugar/i.test(b.textContent); })[0];
    assert(replay, 'falta el botón de repetir');
    replay.click(); replay.click();
    assertEq(n, 1, 'onReplay');
  });
})();
