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

    // Tipo de bala activa: 0 = cura, 1 = daño, H = superposición
    var bulletType = state.activeBulletType === 0 ? '0: cura' : (state.activeBulletType === 1 ? '1: daño' : 'bala');
    var bulletColor = state.activeBulletType === 0 ? COLOR.live : COLOR.neg;
    ctx.fillStyle = bulletColor;
    ctx.fillRect(x + 18, y + 28, 74, 10);
    ctx.fillStyle = COLOR.text;
    ctx.fillText('Bala ' + bulletType, x + 100, y + 33);

    // Energía 0..100
    var by = y + 52;
    ctx.fillStyle = 'rgba(232,236,244,0.15)';
    ctx.fillRect(x, by, HUD.barW, HUD.barH);
    ctx.fillStyle = energy < 25 ? COLOR.neg : COLOR.live;
    ctx.fillRect(x, by, HUD.barW * energy / 100, HUD.barH);
    ctx.fillStyle = COLOR.text;
    ctx.fillText('Energía ' + Math.round(energy), x + HUD.barW + 10, by + HUD.barH / 2);

    // Opcionales: vida, bots restantes y estado de zona H
    var extra = [];
    if (typeof state.hp === 'number' && isFinite(state.hp)) extra.push('Vida ' + Math.round(state.hp));
    if (typeof state.botsLeft === 'number' && isFinite(state.botsLeft)) extra.push('Bots ' + Math.round(state.botsLeft));
    if (state.inHazardH) extra.push('Zona inestable');
    if (extra.length) { ctx.fillStyle = COLOR.text; ctx.fillText(extra.join(' · '), x, by + 30); }

    // Radar "hay alguien": parpadea con Date.now()
    if (state.radar) {
      var on = Math.floor(Date.now() / HUD.blinkMs) % 2 === 0;
      var ry = by + (extra.length ? 58 : 30);
      if (on) { ctx.fillStyle = COLOR.neg; ctx.beginPath(); ctx.arc(x + 8, ry, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = COLOR.text;
      ctx.fillText(state.searching ? 'Buscando…' : '¡Hay alguien! (Espacio)', x + 22, ry);
    } else if (state.searching) {
      ctx.fillStyle = COLOR.text;
      ctx.fillText('Buscando…', x, by + (extra.length ? 58 : 30));
    }
    teachHUD(ctx, state);
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
        var re = a ? num(a.re) : Math.sqrt(p);
        ctx.globalAlpha = 1;
        ctx.fillStyle = re >= 0 ? COLOR.pos : COLOR.neg;
        wedge(ctx, x, y, i, R0, R0 + Math.min(1, Math.abs(re)) * RLEN, 0);
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = COLOR.prob;
        wedge(ctx, x, y, i, R0, R0 + p * RLEN, Math.PI / 20);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 1;
        if (dead[i]) {
          ctx.fillStyle = COLOR.dead;
          wedge(ctx, x, y, i, R0, R0 + 8, 0);
        } else {
          ctx.fillStyle = COLOR.live;
          wedge(ctx, x, y, i, R0, R0 + p * RLEN, 0);
        }
      }
      var label = dead[i] ? '✕' : Math.round(p * 100) + '%';
      sectorLabel(ctx, x, y, i, label);
    }

    // Marca visual del estado H / superpuesto: un anillo de resplandor exterior para reforzar la idea de inestabilidad
    ctx.strokeStyle = quantum ? 'rgba(255, 154, 87, 0.35)' : 'rgba(125, 246, 206, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, R0 + RLEN + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // ---- Definiciones: el juego enseña mientras se juega ----
  // Una sola fuente para el glosario de la guía, las tarjetas que salen en pantalla y el fin de ronda.
  var DEFS = {
    sector: { t: 'Sector', d: 'Cada una de las 8 porciones de 45° alrededor de tu tanque. El enemigo escondido está en una; el reto es averiguar en cuál.' },
    niebla: { t: 'Niebla', d: 'Zona donde no ves a los enemigos. Ahí hay que buscarlos: el radar avisa de que hay alguien y tú decides cómo buscar.' },
    radar: { t: 'Radar', d: 'Te avisa de que hay alguien escondido en la niebla, pero no en cuál de los 8 sectores. Con Espacio lanzas una búsqueda.' },
    tormenta: { t: 'Tormenta', d: 'Niebla de tormenta o zona fuera del círculo seguro: el sensor se equivoca a veces. Es ruido en los datos y afecta por igual a los dos cañones.' },
    zona: { t: 'Zona segura', d: 'Círculo que se cierra por fases. Fuera de él hay tormenta: pierdes vida y el sensor falla.' },
    inestable: { t: 'Zona inestable (≈)', d: 'Charco marcado con ≈ en el piso. Una bala que lo cruza queda en superposición: al impactar se decide al azar si cura o daña. Esas probabilidades están escritas en el juego, no las calcula el simulador.' },
    balas: { t: 'Balas 0 y 1', d: 'Bala 0: al impactar te cura (+8 de vida) y no daña a nadie. Bala 1: daña al impactado (−12). Z y X cambian de tipo.' },
    energia: { t: 'Energía', d: 'Combustible de tus búsquedas. Se regenera con el tiempo; cada consulta o iteración cuesta 20.' },
    consulta: { t: 'Consulta', d: 'Cada vez que el sensor responde «¿hay alguien en este sector?». Cuesta lo mismo en el clásico que en el cuántico: 20 de energía.' },
    k: { t: 'k', d: 'Cuántas consultas hace el cañón clásico o cuántas iteraciones hace el cuántico. Con k = 0 no se consulta el sensor y se dispara a ciegas (1 de 8).' },
    clasico: { t: 'Cañón clásico', d: 'Revisa un sector por consulta y lo descarta si el enemigo no está. Con k consultas acierta (k + 1)/8: 25 %, 37,5 % y 50 % para k = 1, 2 y 3.' },
    cuantico: { t: 'Cañón cuántico', d: 'Simula un circuito de 3 qubits (8 estados, uno por sector). Sin ruido, con k = 0, 1, 2 y 3 iteraciones acierta 12,5 %, 78,1 %, 94,5 % y 33,0 %.' },
    qubit: { t: 'Qubit', d: 'Unidad básica de un computador cuántico. Con 3 qubits hay 2³ = 8 estados posibles: uno por cada sector.' },
    superposicion: { t: 'Superposición (H)', d: 'Pieza H. Deja los 8 sectores con la misma amplitud (1/√8). Sigue siendo un solo estado: no se está probando cada sector por separado.' },
    amplitud: { t: 'Amplitud', d: 'Número (puede ser negativo) asociado a cada sector. Cian = positiva, rosa = negativa. La probabilidad es su cuadrado: +0,35 y −0,35 dan el mismo 12,5 %.' },
    probabilidad: { t: 'Probabilidad', d: 'Qué tan probable es que el disparo caiga en un sector: la amplitud al cuadrado. Es el cono amarillo.' },
    oraculo: { t: 'Oráculo (sensor)', d: 'El sensor visto como la pregunta «¿es este sector?». En el juego es una abstracción: construir uno real a partir de un sensor físico no es fácil.' },
    marcador: { t: 'Marcador (M)', d: 'Pieza M. Invierte el signo de la amplitud del sector que señala el sensor. Por sí sola no cambia ninguna probabilidad.' },
    difusor: { t: 'Difusor (D)', d: 'Pieza D. Hace interferir las amplitudes: la del sector marcado crece y las demás bajan en parte. Sin un marcador antes, no tiene a quién ayudar.' },
    iteracion: { t: 'Iteración', d: 'Un par marcador + difusor (M + D). Cada iteración cuesta una consulta y suma 1 a k.' },
    interferencia: { t: 'Interferencia', d: 'Las amplitudes se suman o se cancelan según su signo. Puede ayudar o perjudicar, según cuántas iteraciones hagas.' },
    medicion: { t: 'Medición (colapso)', d: 'Al disparar se mide: el estado queda en un solo sector, elegido al azar según las probabilidades. Medir no te enseña las amplitudes, solo dónde cayó.' },
    sobrerotacion: { t: 'Sobre-rotación', d: 'Pasarte de iteraciones. Con k = 3 la amplitud del sector marcado da la vuelta y el acierto baja de ~95 % a ~33 %.' },
    estabilizador: { t: 'Estabilizador (S)', d: 'Pieza S. No cambia el estado; reduce a la mitad el ruido del circuito.' },
    calibrador: { t: 'Calibrador (C)', d: 'Pieza C. Ajusta la fase de marcadores y difusores con descenso de gradiente, un paso por disparo: es entrenar un circuito, como en aprendizaje automático cuántico.' },
    decoherencia: { t: 'Decoherencia', d: 'Ruido del circuito: cada pieza agrega un pequeño desfase al azar y la interferencia funciona peor. Solo afecta al cuántico; no es lo mismo que el sensor fallando en la tormenta.' },
    grover: { t: 'Algoritmo de Grover', d: 'Búsqueda que repite marcador + difusor. Su ventaja es en número de consultas, para búsqueda no estructurada idealizada; aquí es una simulación didáctica de 8 sectores, no una prueba de ventaja práctica.' }
  };

  var GLOSSARY = [
    { g: 'En el mapa', ids: ['sector', 'niebla', 'radar', 'tormenta', 'zona', 'inestable', 'balas'] },
    { g: 'Energía y cañones', ids: ['energia', 'consulta', 'k', 'clasico', 'cuantico'] },
    { g: 'La física del cañón cuántico', ids: ['qubit', 'superposicion', 'amplitud', 'probabilidad', 'oraculo', 'marcador', 'difusor', 'iteracion', 'interferencia', 'medicion', 'sobrerotacion'] },
    { g: 'Piezas extra y ruido', ids: ['estabilizador', 'calibrador', 'decoherencia', 'grover'] }
  ];

  var PIECE_DEF = { H: 'superposicion', M: 'marcador', D: 'difusor', S: 'estabilizador', C: 'calibrador' };
  var PIECE_SHORT = {
    H: 'H, superposición: reparte la amplitud entre los 8 sectores.',
    M: 'M, marcador: invierte el signo del sector buscado.',
    D: 'D, difusor: hace crecer la amplitud del sector marcado.',
    S: 'S, estabilizador: reduce a la mitad el ruido.',
    C: 'C, calibrador: ajusta la fase, un paso por disparo.'
  };

  // Mensajes que salen en pantalla y qué significan (la guía los explica).
  var EVENTS = [
    ['Recogiste … · circuito: H M D', 'La pieza se añadió al final de tu circuito cuántico. El orden importa.'],
    ['¡Acierto! Sector n', 'La medición cayó en el sector donde estaba el enemigo.'],
    ['Fallo: disparaste al sector a, estaba en el b', 'La medición cayó en otro sector. Aun con 94,5 % de acierto teórico se falla de vez en cuando.'],
    ['Energía insuficiente para k = n', 'Cada consulta o iteración cuesta 20. Espera a que la energía se regenere o baja k.'],
    ['Tu cañón cuántico está vacío', 'En el cuántico, k sale de tu circuito: recoge piezas H, M y D.'],
    ['El radar no detecta a nadie', 'No hay nadie en la niebla a tu alcance: no hay nada que buscar.'],
    ['+N de vida (bala 0)', 'Una bala 0 impactó y te curó. Si pasó por una zona inestable, el resultado se decidió al azar.'],
    ['Un bot … te encontró en la niebla (k = n)', 'Los bots también buscan: el clásico revisa sectores, el cuántico itera y el ansioso se pasa de iteraciones (k = 3).'],
    ['¡La niebla se expande!', 'Hay más escondites, así que habrá que buscar más.'],
    ['¡Un banco de niebla se disipa!', 'Un banco de niebla desaparece y otro se forma en otro sitio.'],
    ['¡La zona se cierra!', 'La zona segura se encoge. Afuera hay tormenta: pierdes vida y el sensor falla.']
  ];

  var ROUTE_INFO = [
    { t: 'Niebla', goal: 'Acierta 5 búsquedas con el cañón clásico.', learn: 'Descartar reparte la probabilidad: con k consultas aciertas (k + 1)/8.', card: 'probClasica', terms: ['consulta', 'clasico'] },
    { t: 'Amplitudes', goal: 'Arma el cañón cuántico con las piezas del piso y acierta 3 veces.', learn: 'Amplitud no es probabilidad, y el difusor hace interferir las amplitudes.', card: 'interferencia', terms: ['amplitud', 'marcador', 'difusor', 'interferencia'] },
    { t: 'Sobre-rotación', goal: 'Acierta 5 veces con el cuántico.', learn: 'Más iteraciones no siempre es mejor: con k = 3 el acierto baja.', card: 'sobreRotacion', terms: ['iteracion', 'sobrerotacion'] },
    { t: 'Ruido', goal: 'Acierta 3 veces a enemigos escondidos en la tormenta.', learn: 'Si los datos son malos, ningún método los salva; el ruido del circuito es otra cosa.', card: 'ruidoDatos', terms: ['tormenta', 'decoherencia'] }
  ];

  // Detecta qué hay que enseñar a partir del cambio de estado. Pura: se prueba sin canvas.
  // prev: instantánea anterior (o null en el primer cuadro de la partida); entries: disparos nuevos del log.
  function teachEvents(prev, state, entries, log, seen) {
    var out = [];
    function def(id) {
      if (seen[id] || !DEFS[id]) return;
      seen[id] = true;
      out.push({ key: id, title: DEFS[id].t, text: DEFS[id].d, kind: 'def' });
    }
    if (prev && state) {
      var pc = prev.circuit || [], c = state.circuit || [];
      if (c.length > pc.length && PIECE_DEF[c[c.length - 1]]) def(PIECE_DEF[c[c.length - 1]]);
      if (typeof state.activeBulletType === 'number' && state.activeBulletType !== prev.activeBulletType) def('balas');
      if (state.cannon !== prev.cannon) {
        if (state.cannon === 'quantum') {
          var lines = [], shown = {};
          c.forEach(function (p) { if (PIECE_SHORT[p] && !shown[p]) { shown[p] = true; lines.push(PIECE_SHORT[p]); } });
          if (lines.length && !seen.circuito) {
            seen.circuito = true;
            Object.keys(shown).forEach(function (p) { seen[PIECE_DEF[p]] = true; });
            out.push({ key: 'circuito', title: 'Tu cañón cuántico es un circuito', text: lines.join(' '), kind: 'def' });
          }
          def('cuantico');
        } else def('clasico');
      } else if (state.cannon === 'classic' && state.k !== prev.k) def('k');
      if (state.radar && !prev.radar) def('radar');
      if (state.searching && !prev.searching) def('consulta');
      if (state.inHazardH && !prev.inHazardH) def('inestable');
      if (state.radarZone === 'tormenta' && prev.radarZone !== 'tormenta') def('tormenta');
    }
    if (entries && entries.length) {
      var e = entries[entries.length - 1];
      if (e && e.cannon === 'quantum') def('medicion');
      out.push(resultCard(e, log || []));
    }
    return out;
  }

  // Qué pasó en este disparo, con los números reales (observado frente a teoría).
  function resultCard(e, log) {
    var quantum = e.cannon === 'quantum', k = Math.round(num(e.k));
    var same = log.filter(function (c) { return c && c.cannon === e.cannon && Math.round(num(c.k)) === k; });
    var hits = same.filter(function (c) { return c.hit; }).length;
    var parts = [];
    if (quantum) parts.push(e.hit ? 'La medición cayó en el sector buscado.' : 'La medición cayó en otro sector: medir da un solo sector, al azar según las probabilidades.');
    else parts.push(e.hit ? 'Entre los sectores que quedaban, el disparo fue al correcto.' : 'Disparaste a uno de los sectores que quedaban y no era el correcto.');
    parts.push('Teoría con k = ' + k + ': ' + pct(clamp01(e.theory)) + '. Llevas ' + hits + '/' + same.length + ' con este cañón y este k.');
    if (quantum && !e.hit && k === 3) parts.push('Con k = 3 te pasaste de iteraciones: aquí el acierto baja.');
    if (num(e.misreads) > 0) parts.push('El sensor se equivocó ' + num(e.misreads) + (num(e.misreads) === 1 ? ' vez' : ' veces') + ' (ruido de los datos): afecta a los dos cañones.');
    else if (quantum && !e.hit && k > 0 && k < 3 && num(e.phaseNoise) > 0) parts.push('Parte de los fallos viene del ruido del circuito, que solo afecta al cuántico.');
    return { key: 'res', title: e.hit ? 'Qué pasó: acierto' : 'Qué pasó: fallo', text: parts.join(' '), kind: 'result' };
  }

  var TEACH = { seen: {}, prev: null, logRef: null, logLen: 0, queue: [], cur: null };

  // Avanza la cola de tarjetas con el estado del HUD; devuelve la tarjeta visible (o null).
  function teachTick(state, now) {
    var T = TEACH, G = typeof window !== 'undefined' ? window.Game : null;
    if (!G || !Array.isArray(G.log)) return null;   // solo se enseña dentro de una partida (Game.log existe)
    var log = G.log;
    if (log !== T.logRef) { T.logRef = log; T.logLen = log.length; T.prev = null; T.queue = []; T.cur = null; }   // partida nueva
    var entries = log.slice(T.logLen);
    T.logLen = log.length;
    var cards = teachEvents(T.prev, state, entries, log, T.seen);
    T.prev = {
      circuit: Array.isArray(state.circuit) ? state.circuit.slice() : [], activeBulletType: state.activeBulletType, cannon: state.cannon,
      k: state.k, radar: !!state.radar, searching: !!state.searching, inHazardH: !!state.inHazardH, radarZone: state.radarZone
    };
    cards.forEach(function (c) { T.queue.push(c); });
    while (T.queue.length > 3) T.queue.shift();
    if (T.cur && now - T.cur.t0 > T.cur.dur) T.cur = null;
    if (!T.cur && T.queue.length) {
      var c = T.queue.shift();
      c.t0 = now; c.dur = Math.max(5000, Math.min(11000, 1800 + c.text.length * 45));
      T.cur = c;
    }
    return T.cur;
  }

  function wrapCanvas(ctx, text, maxW) {
    var words = String(text).split(' '), lines = [], line = '';
    var width = typeof ctx.measureText === 'function' ? function (s) { return ctx.measureText(s).width; } : function (s) { return s.length * 7; };
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (width(test) > maxW && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Tarjeta a la izquierda, bajo el HUD: no pisa la ruta, las pistas ni el minimapa.
  function drawTeach(ctx, card, now) {
    var vw = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 800;
    var x = 12, y = vw < 760 ? 180 : 150, w = Math.min(330, vw - 24), lh = 17;
    ctx.save();
    ctx.font = '13px system-ui, sans-serif';
    var lines = wrapCanvas(ctx, card.text, w - 26), h = 40 + lines.length * lh;
    var age = now - card.t0, left = card.dur - age;
    ctx.globalAlpha = Math.max(0, Math.min(1, Math.min(age / 250, left / 400)));
    ctx.fillStyle = 'rgba(14,18,32,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = card.kind === 'result' ? COLOR.pos : COLOR.prob; ctx.fillRect(x, y, 4, h);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(card.title, x + 14, y + 22);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = COLOR.text;
    lines.forEach(function (l, i) { ctx.fillText(l, x + 14, y + 42 + i * lh); });
    ctx.restore();
  }

  function teachHUD(ctx, state) {
    try {
      var now = Date.now(), card = teachTick(state, now);
      if (card) drawTeach(ctx, card, now);
    } catch (e) { /* las tarjetas nunca deben romper el HUD */ }
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
      'background:#0e1220;color:' + COLOR.text + ';font:15px/1.5 system-ui,sans-serif;padding:16px;box-sizing:border-box}' +
      '#' + OVERLAY_ID + ' .box{position:relative;z-index:1;width:100%;max-width:640px;margin:auto}' +
      '#' + OVERLAY_ID + ' .stage{position:fixed;inset:0;z-index:0;pointer-events:none}' +
      // Inicio tipo .io: escena a un lado (arriba en celular), título + frase + Jugar grande, el resto plegado.
      '#' + OVERLAY_ID + '.intro{justify-content:flex-start;padding-top:calc(46vh + 8px)}' +
      '#' + OVERLAY_ID + '.intro .stage{inset:0 0 auto 0;height:46vh}' +
      '#' + OVERLAY_ID + '.intro .box{margin:0;max-width:560px}' +
      '@media (min-width:720px){' +
        '#' + OVERLAY_ID + '.intro{justify-content:flex-start;padding:16px 16px 16px 6vw;align-items:center}' +
        '#' + OVERLAY_ID + '.intro .stage{inset:0 0 0 40%;height:auto}' +
        '#' + OVERLAY_ID + '.intro .box{margin:0;max-width:470px}' +
      '}' +
      '#' + OVERLAY_ID + '.leaving .box{opacity:0;transition:opacity .45s;pointer-events:none}' +
      '#' + OVERLAY_ID + ' .hero{display:flex;flex-direction:column;gap:10px}' +
      '#' + OVERLAY_ID + ' .eyebrow{margin:0;font-size:14px;font-weight:600;letter-spacing:.14em;color:' + COLOR.prob + '}' +
      '#' + OVERLAY_ID + ' .hero h1{margin:0;font-size:clamp(40px,9vw,72px);line-height:1;letter-spacing:.04em}' +
      '#' + OVERLAY_ID + ' .tagline{margin:0;font-size:17px;opacity:.92}' +
      '#' + OVERLAY_ID + ' .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}' +
      '#' + OVERLAY_ID + ' .actions button{margin:0}' +
      '#' + OVERLAY_ID + ' button.play{flex:1 1 220px;min-height:56px;font-size:20px;letter-spacing:.04em;box-shadow:0 0 24px rgba(76,201,240,.35)}' +
      '#' + OVERLAY_ID + ' .first{margin:0;font-size:14px;opacity:.8}' +
      '#' + OVERLAY_ID + ' .chips{display:flex;flex-wrap:wrap;gap:8px}' +
      '#' + OVERLAY_ID + ' .chip{font-size:14px;padding:3px 10px;border:1px solid ' + COLOR.guide + ';border-radius:999px;opacity:.9}' +
      '#' + OVERLAY_ID + ' details.more{margin-top:4px}' +
      '#' + OVERLAY_ID + ' .hint{margin:4px 0 0;font-size:14px;opacity:.7}' +
      '@keyframes ui-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
      '#' + OVERLAY_ID + '.intro .hero>*{animation:ui-rise .7s ease-out both}' +
      '#' + OVERLAY_ID + '.intro .hero>*:nth-child(2){animation-delay:.08s}' +
      '#' + OVERLAY_ID + '.intro .hero>*:nth-child(3){animation-delay:.16s}' +
      '#' + OVERLAY_ID + '.intro .hero>*:nth-child(4){animation-delay:.24s}' +
      '@media (prefers-reduced-motion:reduce){#' + OVERLAY_ID + ' .hero>*{animation:none!important}}' +
      '#' + OVERLAY_ID + ' h1{margin:0 0 12px;font-size:24px;letter-spacing:.06em;color:' + COLOR.pos + ';line-height:1.2}' +
      '#' + OVERLAY_ID + ' h2,#' + OVERLAY_ID + ' h3{margin:20px 0 8px;line-height:1.3}' +
      '#' + OVERLAY_ID + ' p,#' + OVERLAY_ID + ' li,#' + OVERLAY_ID + ' summary,#' + OVERLAY_ID + ' pre,#' + OVERLAY_ID + ' td,#' + OVERLAY_ID + ' th{font-size:15px;line-height:1.5}' +
      '#' + OVERLAY_ID + ' ul{margin:8px 0 0 18px;padding:0}' +
      '#' + OVERLAY_ID + ' li{margin:6px 0}' +
      '#' + OVERLAY_ID + ' button{min-height:44px;padding:0 18px;margin:8px 8px 0 0;font:600 15px system-ui,sans-serif;color:#0e1220;' +
      'background:' + COLOR.pos + ';border:0;border-radius:10px;cursor:pointer;touch-action:manipulation}' +
      '#' + OVERLAY_ID + ' button.alt{background:transparent;color:' + COLOR.text + ';border:1px solid ' + COLOR.guide + '}' +
      '#' + OVERLAY_ID + ' .scroll{overflow-x:auto}' +
      '#' + OVERLAY_ID + ' table{border-collapse:collapse;width:100%;font-size:14px}' +
      '#' + OVERLAY_ID + ' th,#' + OVERLAY_ID + ' td{padding:6px 4px;text-align:right;border-bottom:1px solid ' + COLOR.guide + '}' +
      '#' + OVERLAY_ID + ' th:first-child,#' + OVERLAY_ID + ' td:first-child{text-align:left}' +
      '#' + OVERLAY_ID + ' .card{background:rgba(232,236,244,.07);border-left:4px solid ' + COLOR.prob + ';border-radius:8px;padding:4px 14px 12px}' +
      '#' + OVERLAY_ID + ' .panel{background:rgba(232,236,244,.04);border:1px solid ' + COLOR.guide + ';border-radius:10px;padding:10px 12px;margin-top:14px}' +
      '#' + OVERLAY_ID + ' summary{cursor:pointer;color:' + COLOR.prob + ';min-height:44px;display:flex;align-items:center}' +
      '#' + OVERLAY_ID + ' .step{margin:0;color:' + COLOR.prob + ';font-size:14px}' +
      '#' + OVERLAY_ID + ' .demos{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:12px 0}' +
      '#' + OVERLAY_ID + ' .demo{text-align:center;font-size:14px}' +
      '#' + OVERLAY_ID + ' .demo canvas{display:block;max-width:100%;margin:0 auto}' +
      '#' + OVERLAY_ID + ' button:disabled{opacity:.4;cursor:default}' +
      '#' + OVERLAY_ID + ' .flow{display:grid;gap:10px;margin:14px 0}' +
      '#' + OVERLAY_ID + ' .fstep{display:flex;gap:14px;align-items:flex-start;padding:12px 14px;border:1px solid ' + COLOR.guide + ';border-radius:12px;background:rgba(232,236,244,.05)}' +
      '#' + OVERLAY_ID + ' .fnum{flex:none;width:34px;height:34px;border-radius:50%;background:' + COLOR.pos + ';color:#0e1220;font-weight:800;display:flex;align-items:center;justify-content:center}' +
      '#' + OVERLAY_ID + ' .keys{display:grid;gap:8px;margin:12px 0}' +
      '#' + OVERLAY_ID + ' .keyrow{display:flex;align-items:center;gap:14px}' +
      '#' + OVERLAY_ID + ' .keys-group{display:flex;gap:6px;min-width:150px}' +
      '#' + OVERLAY_ID + ' .key{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;padding:0 8px;box-sizing:border-box;border-radius:8px;background:#1c2440;border:1px solid ' + COLOR.guide + ';border-bottom-width:3px;font-weight:700;font-size:14px}' +
      '#' + OVERLAY_ID + ' table.map td,#' + OVERLAY_ID + ' table.map th{text-align:left;vertical-align:top}' +
      '#' + OVERLAY_ID + ' table.map td:first-child{color:' + COLOR.prob + ';width:42%}' +
      '#' + OVERLAY_ID + ' table.map td,#' + OVERLAY_ID + ' table.map th{font-size:14px;padding:6px 6px}' +
      '#' + OVERLAY_ID + ' .ksel{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}' +
      '#' + OVERLAY_ID + ' .ksel button{margin:0}' +
      '#' + OVERLAY_ID + ' .wires{background:#080b16;border-radius:10px;padding:8px;overflow-x:auto}' +
      '#' + OVERLAY_ID + ' .labstage{position:relative;height:260px;margin:8px 0;border-radius:12px;background:rgba(255,255,255,.04);overflow:hidden;display:flex;align-items:center;justify-content:center}' +
      '#' + OVERLAY_ID + ' .labstage.flat{height:auto;padding:6px 0}' +
      '#' + OVERLAY_ID + ' .ksel button[aria-pressed="true"]{outline:2px solid ' + COLOR.prob + '}' +
      '#' + OVERLAY_ID + ' .terms{display:grid;gap:8px;margin:8px 0}' +
      '#' + OVERLAY_ID + ' .term{padding:8px 12px;border-left:3px solid ' + COLOR.prob + ';background:rgba(232,236,244,.05);border-radius:6px;font-size:14px}' +
      '#' + OVERLAY_ID + ' .term b{color:' + COLOR.prob + '}' +
      '#' + OVERLAY_ID + ' .glossary details{margin:6px 0}' +
      '#' + OVERLAY_ID + ' .learn{color:' + COLOR.live + ';font-size:14px;margin-top:2px}' +
      '#' + OVERLAY_ID + ' .readout{color:' + COLOR.prob + ';font-weight:600}' +
      '#' + OVERLAY_ID + ' .chart{display:flex;gap:6px;align-items:flex-end;justify-content:center;margin:14px 0 4px}' +
      '#' + OVERLAY_ID + ' .cbars{display:flex;gap:4px;align-items:flex-end}' +
      '#' + OVERLAY_ID + ' .cbar{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:38px}' +
      '#' + OVERLAY_ID + ' .cbar.warn .cfill{outline:3px dashed ' + COLOR.neg + ';outline-offset:2px}' +
      '#' + OVERLAY_ID + ' .cval{font-size:12px;margin-bottom:4px;white-space:nowrap}' +
      '#' + OVERLAY_ID + ' .cfill{width:100%;border-radius:6px 6px 0 0}' +
      '#' + OVERLAY_ID + ' .clabel{text-align:center;margin-top:6px;font-size:14px}' +
      '#' + OVERLAY_ID + ' .legend .lg1{color:' + COLOR.live + '}' +
      '#' + OVERLAY_ID + ' .legend .lg2{color:' + COLOR.pos + '}' +
      '#' + OVERLAY_ID + ' pre{margin:0;padding:12px;background:#080b16;border-radius:8px;overflow-x:auto;font-size:14px}';
    document.head.appendChild(s);
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;     // siempre textContent: los datos nunca se interpretan como HTML
    if (cls) e.className = cls;
    return e;
  }

  // Limpieza del overlay vigente (p. ej. detener la portada 3D). Corre al cerrarlo o al ser reemplazado.
  var overlayCleanup = null;
  function runCleanup() {
    var f = overlayCleanup; overlayCleanup = null;
    if (f) { try { f(); } catch (e) { /* la limpieza nunca debe romper el juego */ } }
  }

  // Crea el overlay (reemplaza uno previo) y devuelve {root, box, close}.
  function openOverlay() {
    injectStyle();
    runCleanup();
    var old = document.getElementById(OVERLAY_ID);
    if (old) old.remove();
    var root = el('div'); root.id = OVERLAY_ID;
    var box = el('div', undefined, 'box');
    root.appendChild(box);
    document.body.appendChild(root);
    return { root: root, box: box, close: function () { runCleanup(); root.remove(); } };
  }

  // Portada 3D opcional detrás del inicio. Si Intro3D falta o no puede (sin WebGL), queda el inicio 2D.
  function mountIntro(o) {
    var I = window.Intro3D;
    if (!I || typeof I.start !== 'function') return false;
    try {
      var stage = el('div', undefined, 'stage');
      stage.setAttribute('aria-hidden', 'true');
      o.root.insertBefore(stage, o.box);
      if (I.start(stage)) {
        o.root.classList.add('intro');
        overlayCleanup = function () { if (typeof I.stop === 'function') I.stop(); };
        return true;
      } else stage.remove();
    } catch (e) { /* sin portada 3D */ }
    return false;
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

  function renderMessagePanel(title, items) {
    if (!Array.isArray(items) || !items.length) return null;
    var panel = el('div', undefined, 'panel');
    panel.appendChild(el('h3', title));
    var list = document.createElement('ul');
    items.forEach(function (item) { var li = document.createElement('li'); li.textContent = String(item); list.appendChild(li); });
    panel.appendChild(list);
    return panel;
  }

  function showStart(onPlay) {
    var o = openOverlay();
    var intro = mountIntro(o);
    var lines = window.Content && Array.isArray(window.Content.start) && window.Content.start.length ? window.Content.start : DEFAULT_START;
    var myths = window.Content && Array.isArray(window.Content.myths) ? window.Content.myths : [];
    var truths = window.Content && Array.isArray(window.Content.truths) ? window.Content.truths : [];

    // Primer vistazo: título, una frase, Jugar. Lo demás, plegado.
    var hero = el('div', undefined, 'hero');
    hero.appendChild(el('p', 'CLÁSICO VS. CUÁNTICO', 'eyebrow'));
    hero.appendChild(el('h1', 'COLLAPSE'));
    hero.appendChild(el('p', String(lines[0]), 'tagline'));
    var actions = el('div', undefined, 'actions');
    var play = el('button', 'Jugar', 'play'), started = false;
    play.type = 'button';
    // Con la escena 3D activa, primero la inmersión; luego se cierra el inicio y corre start().
    function launch(btn, start) {
      if (started) return;
      started = true;
      var called = false;
      function go() { if (called) return; called = true; o.close(); if (typeof start === 'function') start(); }
      var I = window.Intro3D, diving = false;
      if (intro && I && typeof I.dive === 'function') {
        o.root.classList.add('leaving');
        play.disabled = true; btn.disabled = true;
        try { diving = I.dive(go); } catch (e) { diving = false; }
      }
      if (diving) setTimeout(go, 1600);   // por si la pestaña está oculta y la animación no avanza
      else go();
    }
    play.addEventListener('click', function () { launch(play, onPlay); });
    actions.appendChild(play);
    var G = window.Game;
    if (G && typeof G.startRoute === 'function') {
      var total = Math.round(num(G.ROUTE_LENGTH)) || ROUTE_INFO.length, done = Math.max(0, Math.min(total, Math.round(num(G.routeProgress))));
      var nextRound = done >= total ? 1 : done + 1;
      var route = el('button', done > 0 && done < total ? 'Ruta · ronda ' + nextRound + ' de ' + total : 'Ruta de aprendizaje', 'alt');
      route.type = 'button';
      route.addEventListener('click', function () { launch(route, function () { G.startRoute(nextRound); }); });
      actions.appendChild(route);
    }
    var how = el('button', 'Cómo jugar', 'alt');
    how.type = 'button';
    how.addEventListener('click', function () { showGuide(function () { showStart(onPlay); }); });
    actions.appendChild(how);
    hero.appendChild(actions);
    if (G && typeof G.startRoute === 'function') hero.appendChild(el('p', '¿Primera vez? La Ruta de aprendizaje enseña una idea por ronda.', 'first'));
    var chips = el('div', undefined, 'chips');
    ['8 sectores', 'Mismo sensor', 'Misma energía'].forEach(function (c) { chips.appendChild(el('span', c, 'chip')); });
    hero.appendChild(chips);

    var more = el('details', undefined, 'more');
    more.appendChild(el('summary', 'Más sobre el juego'));
    lines.slice(1).forEach(function (l) { more.appendChild(el('p', String(l))); });
    var bad = renderMessagePanel('Qué NO se debe creer', myths);
    if (bad) more.appendChild(bad);
    var good = renderMessagePanel('Qué sí queremos promover', truths);
    if (good) more.appendChild(good);
    hero.appendChild(more);
    hero.appendChild(el('p', 'WASD mover · ← → apuntar · Espacio buscar · 1 / 2 cañón · Q / E k clásico · R soltar pieza', 'hint'));
    o.box.appendChild(hero);
  }

  // ---- Guía "Cómo jugar" ----
  // Una idea por diapositiva, con un elemento visual. Content.guide = [{ titulo, texto, visual? }] la sobrescribe;
  // '\n' separa párrafos. visual: 'sectors' | 'flow' | 'keys' | 'cannons' | 'mapping' | 'circuit' | 'chart'.
  var DEFAULT_GUIDE = [
    { titulo: 'El reto', visual: 'sectors', texto:
      'Hay un enemigo escondido en la niebla.\n' +
      'El radar te avisa de que está cerca, pero no en cuál de los 8 sectores que rodean tu tanque.\n' +
      'Disparar a ciegas acierta 1 de cada 8 veces (12,5 %).' },
    { titulo: 'Cómo se juega', visual: 'flow', texto:
      'Buscar en la niebla cuesta energía, y la energía se regenera con el tiempo. Los dos cañones pagan lo mismo.' },
    { titulo: 'Aprende jugando: la Ruta en 4 rondas', visual: 'route', texto:
      'El juego completo es un battle royale, pero la Ruta de aprendizaje te enseña una idea por ronda, sin exámenes: juegas y, al terminar, ves qué pasó y por qué.\n' +
      'Si es tu primera vez, empieza por ahí: está en la pantalla de inicio.' },
    { titulo: 'Controles', visual: 'keys', texto: '' },
    { titulo: 'Qué te avisa el juego', visual: 'events', texto:
      'Los mensajes de la pantalla dicen qué acaba de pasar. Además, a la izquierda aparecen tarjetas que definen cada término la primera vez que lo ves, y explican cada disparo con sus números.' },
    { titulo: 'Dos cañones, misma energía', visual: 'cannons', texto:
      'Clásico: cada consulta revisa un sector y lo descarta (se ve en gris).\n' +
      'Cuántico: la cuña de color es la amplitud (cian positiva, rosa negativa) y el cono amarillo es la probabilidad, la amplitud al cuadrado.\n' +
      'El disparo sale hacia un sector elegido al azar según las probabilidades. (Ejemplo ilustrativo.)' },
    { titulo: '¿Qué tiene que ver con la computación cuántica?', visual: 'mapping', texto:
      'Tu cañón cuántico simula un circuito de 3 qubits. Cada cosa que ves en el juego es una pieza de ese circuito.' },
    { titulo: 'Tu cañón cuántico es un circuito', visual: 'circuit', texto:
      'Recoge piezas: H (superposición), M (marcador) y D (difusor). Cada par M + D es una iteración, es decir, un valor de k. R suelta la última pieza.\n' +
      'Prueba distintos k y mira cómo cambia el circuito y el acierto teórico.' },
    { titulo: 'Laboratorio de k', visual: 'lab', texto:
      'Las columnas son las amplitudes: cian si son positivas, rosas si son negativas. Los conos amarillos son las probabilidades. La placa blanca marca el sector buscado.\n' +
      'Sube k y mira cómo crece la amplitud del sector buscado. Con k = 3 se pasa y vuelve a bajar.' },
    { titulo: 'La trampa de pasarse', visual: 'chart', texto:
      'Con 8 sectores y sin ruido, el cuántico mejora hasta k = 2 y después baja: con k = 3 la amplitud “da la vuelta”.\n' +
      'El clásico con k consultas acierta (k+1)/8: sube siempre, pero despacio.' },
    { titulo: 'Glosario', visual: 'glossary', texto:
      'Las palabras del juego, por si alguna no quedó clara. Pulsa un grupo para abrirlo.' },
    { titulo: 'Una partida no demuestra nada', texto:
      'Al final verás los aciertos observados frente a la teoría. Con pocos disparos pueden alejarse mucho: es variación normal.\n' +
      'Es una simulación didáctica de 3 qubits, no hardware cuántico. La ventaja de Grover en número de consultas es real para la búsqueda no estructurada idealizada, pero con 8 sectores esto no demuestra una ventaja práctica.' }
  ];

  function guideSlides() {
    var g = window.Content && window.Content.guide;
    if (!Array.isArray(g)) return DEFAULT_GUIDE;
    var ok = g.filter(function (s) { return s && typeof s.titulo === 'string' && typeof s.texto === 'string'; });
    return ok.length ? ok : DEFAULT_GUIDE;
  }

  // Ejemplo vivo: el mismo drawSectors del juego, con las amplitudes del contrato (k = 2, sector 3).
  function demoCanvas(label, result, cannon) {
    var wrap = el('div', undefined, 'demo'), c = document.createElement('canvas');
    var size = 270, dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr; c.style.width = size + 'px'; c.style.height = size + 'px';
    var ctx = c.getContext && c.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COLOR.text; ctx.beginPath(); ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2); ctx.fill();
      drawSectors(ctx, size / 2, size / 2, result, cannon);
    }
    wrap.appendChild(c);
    wrap.appendChild(el('div', label));
    return wrap;
  }
  function demoResults() {
    var amps = [], probs = [];
    for (var i = 0; i < 8; i++) { var re = i === 3 ? 0.972 : -0.088; amps.push({ re: re, im: 0 }); probs.push(re * re); }
    return {
      quantum: { amps: amps, probs: probs, theory: 0.945 },
      classic: { probs: [0, 0, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6], discarded: [0, 1], found: false, theory: 0.375 }
    };
  }

  // Acierto teórico por k (sector buscado 3): del simulador si existe; si no, la tabla del brief.
  var GUIDE_TABLE = [0.125, 0.781, 0.945, 0.33];
  function guideProbs() {
    var quantum = [];
    for (var k = 0; k <= 3; k++) {
      var p = null;
      try {
        var Q = window.Quantum, r = Q && typeof Q.runQuantum === 'function' && Q.runQuantum({ k: k, target: 3 });
        if (r && r.probs && typeof r.probs[3] === 'number') p = r.probs[3];
      } catch (e) { /* tabla */ }
      quantum.push(p === null ? GUIDE_TABLE[k] : p);
    }
    return { quantum: quantum, classic: [1 / 8, 2 / 8, 3 / 8, 4 / 8] };
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // --- Visuales de la guía ---
  function visSectors() {
    var wrap = el('div', undefined, 'demo'), c = document.createElement('canvas');
    var size = 280, dpr = window.devicePixelRatio || 1, ctx = null;
    c.width = size * dpr; c.height = size * dpr; c.style.width = size + 'px'; c.style.height = size + 'px';
    try { ctx = c.getContext && c.getContext('2d'); } catch (e) { ctx = null; }
    if (ctx) {
      var cx = size / 2, cy = size / 2, r0 = 34, r1 = 118;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2; ctx.strokeStyle = COLOR.guide; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = 0; i < 8; i++) {
        var a0 = i * Math.PI / 4 + 0.02, a1 = (i + 1) * Math.PI / 4 - 0.02, mid = (i + 0.5) * Math.PI / 4;
        ctx.beginPath(); ctx.arc(cx, cy, r1, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = COLOR.text; ctx.fillText(String(i), cx + (r1 + 14) * Math.cos(mid), cy + (r1 + 14) * Math.sin(mid));
      }
      ctx.fillStyle = COLOR.text; ctx.fillRect(cx - 17, cy - 12, 34, 24);
      ctx.fillStyle = '#8e9dbf'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
      var ex = cx + 78 * Math.cos(3.5 * Math.PI / 4), ey = cy + 78 * Math.sin(3.5 * Math.PI / 4);   // el enemigo, escondido en el sector 3
      ctx.setLineDash([6, 5]); ctx.strokeStyle = COLOR.neg; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex, ey, 17, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COLOR.neg; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText('?', ex, ey + 1);
    }
    wrap.appendChild(c);
    wrap.appendChild(el('div', 'Tu tanque y los 8 sectores. El enemigo está en uno, pero no sabes cuál.'));
    return wrap;
  }

  function visFlow() {
    var box = el('div', undefined, 'flow');
    [
      ['1', 'Muévete y apunta', 'WASD para moverte; ← → o el mouse para apuntar.'],
      ['2', 'Si lo ves, dispara', 'Clic o F. La bala 1 daña; la bala 0 te cura a ti.'],
      ['3', 'Si se esconde, búscalo', 'Cuando el radar lo detecta, elige cañón (1 o 2) y pulsa Espacio.']
    ].forEach(function (s) {
      var card = el('div', undefined, 'fstep');
      card.appendChild(el('div', s[0], 'fnum'));
      var t = el('div'); t.appendChild(el('strong', s[1])); t.appendChild(el('div', s[2]));
      card.appendChild(t);
      box.appendChild(card);
    });
    return box;
  }

  function visKeys() {
    var box = el('div', undefined, 'keys');
    [
      [['W', 'A', 'S', 'D'], 'Mover'],
      [['←', '→'], 'Apuntar (o con el mouse); ↑ ↓ mueven la vista'],
      [['F'], 'Disparo normal (o clic izquierdo)'],
      [['Espacio'], 'Buscar en la niebla (con el radar encendido)'],
      [['1', '2'], 'Cañón clásico / cuántico'],
      [['Q', 'E'], 'Bajar / subir k del cañón clásico (0 a 3)'],
      [['R'], 'Soltar la última pieza del circuito cuántico'],
      [['Z', 'X'], 'Bala 0 (cura) / bala 1 (daña)']
    ].forEach(function (r) {
      var row = el('div', undefined, 'keyrow'), ks = el('span', undefined, 'keys-group');
      r[0].forEach(function (k) { ks.appendChild(el('span', k, 'key')); });
      row.appendChild(ks); row.appendChild(el('span', r[1]));
      box.appendChild(row);
    });
    return box;
  }

  function visCannons() {
    var d = demoResults(), row = el('div', undefined, 'demos');
    row.appendChild(demoCanvas('Clásico: 2 sectores descartados', d.classic, 'classic'));
    row.appendChild(demoCanvas('Cuántico: k = 2, sector marcado: 3', d.quantum, 'quantum'));
    return row;
  }

  function visMapping() {
    var wrap = el('div', undefined, 'scroll'), t = el('table', undefined, 'map'), head = el('tr');
    ['En el juego', 'En computación cuántica'].forEach(function (h) { head.appendChild(el('th', h)); });
    t.appendChild(head);
    [
      ['8 sectores alrededor del tanque', '3 qubits: 2³ = 8 estados posibles'],
      ['Cuña de color de cada sector', 'Amplitud de ese estado (puede ser negativa)'],
      ['Cono amarillo', 'Probabilidad = amplitud al cuadrado'],
      ['Pieza H', 'Superposición: todas las amplitudes iguales'],
      ['El sensor del juego', 'El oráculo: reconoce el sector buscado (una abstracción)'],
      ['Pieza M (marcador)', 'Invierte el signo de la amplitud del sector buscado'],
      ['Pieza D (difusor)', 'Interferencia: refuerza el sector marcado'],
      ['Un par M + D  (k = 1)', 'Una iteración del algoritmo de Grover'],
      ['Tu disparo', 'Medición: sale un sector con probabilidad = amplitud al cuadrado']
    ].forEach(function (r) {
      var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', c)); });
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    var note = el('p', 'El circuito no “descubre” al enemigo por sí solo: el sensor es la abstracción que le dice cuál es el sector buscado.');
    var all = el('div'); all.appendChild(wrap); all.appendChild(note);
    return all;
  }

  // Lista de términos: negrita + definición.
  function termList(ids) {
    var box = el('div', undefined, 'terms');
    ids.forEach(function (id) {
      var d = DEFS[id]; if (!d) return;
      var row = el('div', undefined, 'term');
      row.appendChild(el('b', d.t)); row.appendChild(document.createTextNode(' · ' + d.d));
      box.appendChild(row);
    });
    return box;
  }

  function visGlossary() {
    var box = el('div', undefined, 'glossary');
    GLOSSARY.forEach(function (grp, i) {
      var d = el('details'); if (i === 0) d.open = true;
      d.appendChild(el('summary', grp.g));
      d.appendChild(termList(grp.ids));
      box.appendChild(d);
    });
    return box;
  }

  function visEvents() {
    var wrap = el('div', undefined, 'scroll'), t = el('table', undefined, 'map'), head = el('tr');
    ['Aviso en pantalla', 'Qué significa'].forEach(function (h) { head.appendChild(el('th', h)); });
    t.appendChild(head);
    EVENTS.forEach(function (r) {
      var tr = el('tr'); tr.appendChild(el('td', r[0])); tr.appendChild(el('td', r[1])); t.appendChild(tr);
    });
    wrap.appendChild(t);
    return wrap;
  }

  // La Ruta de aprendizaje: una idea por ronda. Usa Content.rounds si existe.
  function visRoute() {
    var C = window.Content, rounds = C && Array.isArray(C.rounds) ? C.rounds : [];
    var box = el('div', undefined, 'flow');
    ROUTE_INFO.forEach(function (r, i) {
      var step = el('div', undefined, 'fstep'), body = el('div');
      var title = (rounds[i] && rounds[i].titulo) || r.t;
      step.appendChild(el('div', String(i + 1), 'fnum'));
      body.appendChild(el('b', 'Ronda ' + (i + 1) + ' · ' + title));
      body.appendChild(el('div', (rounds[i] && rounds[i].objetivo) || r.goal));
      var learn = el('div', 'Aprendes: ' + r.learn, 'learn');
      body.appendChild(learn);
      step.appendChild(body);
      box.appendChild(step);
    });
    return box;
  }

  var circuitK = 2;   // se conserva al navegar entre diapositivas
  function visCircuit() {
    var box = el('div', undefined, 'circuit');
    var sel = el('div', undefined, 'ksel'), out = el('p', undefined, 'readout'), holder = el('div', undefined, 'wires');
    var probs = guideProbs();
    function drawCircuit() {
      holder.textContent = '';
      var gate = 46, gap = 12, x0 = 56, nIter = circuitK, width = x0 + (gate + gap) + nIter * 2 * (gate + gap) + 70;
      var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' 150', width: '100%', role: 'img', 'aria-label': 'Circuito del cañón cuántico con k = ' + circuitK });
      [0, 1, 2].forEach(function (q) {
        svg.appendChild(svgEl('line', { x1: 36, x2: width - 10, y1: 30 + q * 45, y2: 30 + q * 45, stroke: COLOR.guide, 'stroke-width': 2 }));
        var t = svgEl('text', { x: 6, y: 35 + q * 45, fill: COLOR.text, 'font-size': 14 }, 'q' + q); svg.appendChild(t);
      });
      var x = x0;
      function oneGate(label, color, tall) {
        var h = tall ? 106 : 34;
        [0, 1, 2].forEach(function (q) {
          if (!tall) { svg.appendChild(svgEl('rect', { x: x, y: 30 + q * 45 - 17, width: gate, height: 34, rx: 7, fill: color })); svg.appendChild(svgEl('text', { x: x + gate / 2, y: 30 + q * 45 + 6, fill: '#0e1220', 'font-size': 18, 'font-weight': 700, 'text-anchor': 'middle' }, label)); }
        });
        if (tall) { svg.appendChild(svgEl('rect', { x: x, y: 13, width: gate, height: h, rx: 7, fill: color })); svg.appendChild(svgEl('text', { x: x + gate / 2, y: 70, fill: '#0e1220', 'font-size': 20, 'font-weight': 700, 'text-anchor': 'middle' }, label)); }
        x += gate + gap;
      }
      oneGate('H', '#4cc9f0', false);
      for (var i = 0; i < circuitK; i++) { oneGate('M', '#ff6b9d', true); oneGate('D', '#ffd166', true); }
      svg.appendChild(svgEl('rect', { x: x + 6, y: 13, width: 50, height: 106, rx: 7, fill: 'none', stroke: COLOR.text, 'stroke-width': 2 }));
      svg.appendChild(svgEl('text', { x: x + 31, y: 70, fill: COLOR.text, 'font-size': 13, 'text-anchor': 'middle' }, 'medir'));
      holder.appendChild(svg);
      out.textContent = 'k = ' + circuitK + ': acierto teórico del cuántico ' + pct(probs.quantum[circuitK]) + ' · clásico con ' + circuitK + ' consultas ' + pct(probs.classic[circuitK]);
    }
    [0, 1, 2, 3].forEach(function (k) {
      var b = el('button', 'k = ' + k, 'alt'); b.type = 'button';
      b.addEventListener('click', function () { circuitK = k; drawCircuit(); });
      sel.appendChild(b);
    });
    box.appendChild(sel); box.appendChild(holder); box.appendChild(out);
    drawCircuit();
    return box;
  }

  function visChart() {
    var probs = guideProbs(), box = el('div', undefined, 'chart'), H = 150;
    for (var k = 0; k <= 3; k++) {
      var grp = el('div', undefined, 'cgrp'), bars = el('div', undefined, 'cbars');
      [['classic', probs.classic[k], COLOR.live], ['quantum', probs.quantum[k], COLOR.pos]].forEach(function (b) {
        var col = el('div', undefined, 'cbar' + (b[0] === 'quantum' && k === 3 ? ' warn' : ''));
        col.appendChild(el('div', pct(b[1]), 'cval'));
        var bar = el('div', undefined, 'cfill'); bar.style.height = Math.max(3, Math.round(b[1] * H)) + 'px'; bar.style.background = b[2];
        col.appendChild(bar); bars.appendChild(col);
      });
      grp.appendChild(bars); grp.appendChild(el('div', 'k = ' + k, 'clabel'));
      box.appendChild(grp);
    }
    var legend = el('p', undefined, 'legend');
    legend.appendChild(el('span', '■ clásico', 'lg1')); legend.appendChild(document.createTextNode('  ')); legend.appendChild(el('span', '■ cuántico', 'lg2'));
    var all = el('div'); all.appendChild(box); all.appendChild(legend);
    return all;
  }

  // Laboratorio: anillo 3D (si hay WebGL) o el mismo dibujo 2D del juego, con botones de k.
  function visLab() {
    var box = el('div', undefined, 'lab'), sel = el('div', undefined, 'ksel'), out = el('p', undefined, 'readout');
    var I = window.Intro3D, stage = el('div', undefined, 'labstage'), flat = null, three = false;
    stage.setAttribute('aria-hidden', 'true');
    box.appendChild(stage);
    function amps2d(k) {
      var s = I && I.labState ? I.labState(k, 3) : null, amps = [], probs = [];
      for (var i = 0; i < 8; i++) {
        var p = s ? s.probs[i] : (i === 3 ? guideProbs().quantum[k] : (1 - guideProbs().quantum[k]) / 7);
        var re = s ? s.amps[i] : (i === 3 ? Math.sqrt(p) : -Math.sqrt(p));
        amps.push({ re: re, im: 0 }); probs.push(p);
      }
      return { amps: amps, probs: probs, theory: probs[3] };
    }
    function show(k, textOnly) {
      circuitK = k;
      if (three) I.setLab(k);
      else if (!textOnly) {
        stage.classList.add('flat');
        var fresh = demoCanvas('Cuántico, k = ' + k, amps2d(k), 'quantum');
        if (flat) stage.replaceChild(fresh, flat); else stage.appendChild(fresh);
        flat = fresh;
      }
      out.textContent = 'k = ' + k + ': acierto teórico del cuántico ' + pct(guideProbs().quantum[k]) + ' · clásico con ' + k + ' consultas ' + pct(guideProbs().classic[k]);
      Array.prototype.forEach.call(sel.children, function (b, i) { b.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });
    }
    [0, 1, 2, 3].forEach(function (k) {
      var b = el('button', 'k = ' + k, 'alt'); b.type = 'button';
      b.addEventListener('click', function () { show(k); });
      sel.appendChild(b);
    });
    box.appendChild(sel); box.appendChild(out);
    if (!(I && typeof I.startLab === 'function')) { show(circuitK); return box; }
    show(circuitK, true);
    // El 3D mide su contenedor: se arranca cuando la diapositiva ya está en el DOM.
    setTimeout(function () {
      if (!box.isConnected) return;
      try { three = !!I.startLab(stage, circuitK); } catch (e) { three = false; }
      if (three) overlayCleanup = function () { if (typeof I.stop === 'function') I.stop(); };
      show(circuitK);
    }, 0);
    return box;
  }

  var VISUALS = { lab: visLab, route: visRoute, events: visEvents, glossary: visGlossary, sectors: visSectors, flow: visFlow, keys: visKeys, cannons: visCannons, mapping: visMapping, circuit: visCircuit, chart: visChart };

  function showGuide(onClose) {
    var slides = guideSlides(), idx = 0, closed = false;
    var o = openOverlay();
    function finish() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      o.close();
      if (typeof onClose === 'function') onClose();
    }
    function onKey(e) {
      if (!o.box.isConnected) { document.removeEventListener('keydown', onKey); return; }   // otro overlay lo reemplazó
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') finish();
    }
    function go(d) {
      if (closed) return;
      if (d > 0 && idx === slides.length - 1) return finish();
      idx = Math.max(0, Math.min(slides.length - 1, idx + d));
      render();
    }
    function render() {
      var s = slides[idx];
      runCleanup();
      o.box.textContent = '';
      o.box.appendChild(el('h1', 'CÓMO JUGAR'));
      o.box.appendChild(el('p', (idx + 1) + ' / ' + slides.length, 'step'));
      o.box.appendChild(el('h2', s.titulo));
      String(s.texto).split('\n').forEach(function (l) { if (l.trim()) o.box.appendChild(el('p', l)); });
      var vis = VISUALS[s.visual || (s.demo ? 'cannons' : '')];
      if (vis) { try { o.box.appendChild(vis()); } catch (e) { /* sin visual: queda el texto */ } }
      var nav = el('div', undefined, 'nav');
      var prev = el('button', 'Anterior', 'alt'); prev.type = 'button'; prev.disabled = idx === 0;
      prev.addEventListener('click', function () { go(-1); });
      var next = el('button', idx === slides.length - 1 ? 'Listo' : 'Siguiente'); next.type = 'button';
      next.addEventListener('click', function () { go(1); });
      var skip = el('button', 'Saltar', 'alt'); skip.type = 'button';
      skip.addEventListener('click', finish);
      nav.appendChild(prev); nav.appendChild(next); nav.appendChild(skip);
      o.box.appendChild(nav);
    }
    document.addEventListener('keydown', onKey);
    render();
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
    ['Cañón', 'k', 'Aciertos', 'Observado', 'Teórico'].forEach(function (h) { head.appendChild(el('th', h)); });
    t.appendChild(head);
    rows.forEach(function (g) {
      var tr = el('tr');
      [g.cannon === 'quantum' ? 'Cuántico' : 'Clásico', String(g.k), g.hits + '/' + g.shots, pct(g.hits / g.shots), pct(g.theory)]
        .forEach(function (c) { tr.appendChild(el('td', c)); });
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    return wrap;
  }

  function renderCard(card) {
    try {
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

  function cardFor(log) {
    try {
      var C = window.Content;
      var card = C && C.cards && C.cards[C.pickCard(log)];
      return card ? renderCard(card) : null;
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
    var myths = window.Content && Array.isArray(window.Content.myths) ? window.Content.myths : [];
    var truths = window.Content && Array.isArray(window.Content.truths) ? window.Content.truths : [];
    o.box.appendChild(el('h1', 'FIN DE LA PARTIDA'));
    if (rows.length) {
      o.box.appendChild(el('h2', 'Observado vs. teoría'));
      o.box.appendChild(statsTable(rows));
      o.box.appendChild(el('p', 'Con pocas partidas lo observado se aleja de la teoría: es normal.'));
    } else {
      o.box.appendChild(el('p', 'No hubo disparos de búsqueda en esta partida.'));
    }
    var bad = renderMessagePanel('Qué NO se debe creer', myths);
    if (bad) o.box.appendChild(bad);
    var good = renderMessagePanel('Qué sí queremos promover', truths);
    if (good) o.box.appendChild(good);
    var card = cardFor(log); if (card) o.box.appendChild(card);
    var q = qiskitBlock(rows); if (q) o.box.appendChild(q);
    o.box.appendChild(onceButton('Jugar otra vez', o, onReplay));
  }

  // Fin de una ronda de la Ruta de aprendizaje: qué pasó, la idea de la ronda y las palabras nuevas.
  // info = { round, total, titulo, card, passed, log }; next() empieza la ronda siguiente (o repite).
  function showRoundEnd(info, next) {
    info = info || {};
    var o = openOverlay(), rows = summarize(info.log), passed = !!info.passed;
    var round = Math.round(num(info.round)), total = Math.round(num(info.total)) || ROUTE_INFO.length;
    o.box.appendChild(el('h1', 'RONDA ' + round + ' DE ' + total + (passed ? ' · SUPERADA' : ' · SIGUE INTENTANDO')));
    if (info.titulo) o.box.appendChild(el('h2', String(info.titulo)));
    if (!passed) o.box.appendChild(el('p', 'No pasa nada: la ronda se repite y puedes mirar la tarjeta antes de volver a intentarlo.'));
    var C = window.Content, card = C && C.cards && C.cards[info.card];
    var cardBox = card ? renderCard(card) : null;
    if (cardBox) { o.box.appendChild(el('h3', 'La idea de esta ronda')); o.box.appendChild(cardBox); }
    var r = ROUTE_INFO[round - 1];
    if (r) { o.box.appendChild(el('h3', 'Palabras de esta ronda')); o.box.appendChild(termList(r.terms)); }
    if (rows.length) {
      o.box.appendChild(el('h3', 'Lo que pasó: observado vs. teoría'));
      o.box.appendChild(statsTable(rows));
      o.box.appendChild(el('p', 'Con pocos disparos lo observado se aleja de la teoría: es normal.'));
    }
    var last = round >= total;
    o.box.appendChild(onceButton(passed ? (last ? 'Ir al battle royale' : 'Siguiente ronda') : 'Reintentar', o, next));
  }

  window.UI = {
    drawHUD: drawHUD, drawSectors: drawSectors, showStart: showStart, showEnd: showEnd, showGuide: showGuide,
    showRoundEnd: showRoundEnd, defs: DEFS, glossary: GLOSSARY, teachEvents: teachEvents,
    teachReset: function () { TEACH.seen = {}; TEACH.prev = null; TEACH.logRef = null; TEACH.logLen = 0; TEACH.queue = []; TEACH.cur = null; }
  };
})();
