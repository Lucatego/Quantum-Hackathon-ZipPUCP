/* Collapse: simulador cuántico de 3 qubits (8 sectores). Solo cálculo, sin DOM.
 * Convención little-endian como Qiskit: el sector i tiene bits (q2 q1 q0) = i en binario.
 * Expone un solo global: window.Quantum (ver contrato en TAREAS.md). */
(function (root) {
  'use strict';

  var NQ = 3;
  var N = 1 << NQ;                       // 8 sectores
  var THETA = Math.asin(1 / Math.sqrt(N)); // sin θ = 1/√N

  // ---------- utilidades ----------
  function randInt(n) { return Math.floor(Math.random() * n); }

  function randNormal() { // Box-Muller
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Sector que el sensor percibe: el real con prob. 1 - sensorFlip, si no uno equivocado al azar.
  function perceive(target, sensorFlip) {
    if (sensorFlip > 0 && Math.random() < sensorFlip) {
      var w = randInt(N - 1);
      return w >= target ? w + 1 : w;
    }
    return target;
  }

  function probsOf(amps) {
    return amps.map(function (a) { return a.re * a.re + a.im * a.im; });
  }

  // ---------- piezas del circuito (operan sobre un array de 8 {re, im}) ----------
  function newState() {
    var a = [];
    for (var i = 0; i < N; i++) a.push({ re: i === 0 ? 1 : 0, im: 0 }); // |000>
    return a;
  }

  // H⊗3: <i|H⊗3|j> = (-1)^popcount(i&j) / √8
  function hadamard(a) {
    var s = 1 / Math.sqrt(N), out = [];
    for (var i = 0; i < N; i++) {
      var re = 0, im = 0;
      for (var j = 0; j < N; j++) {
        var sign = popcount(i & j) % 2 ? -1 : 1;
        re += sign * a[j].re; im += sign * a[j].im;
      }
      out.push({ re: re * s, im: im * s });
    }
    return out;
  }

  function popcount(x) { var c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

  // Oráculo: invierte la fase del sector marcado.
  function oracle(a, marked) {
    return a.map(function (z, i) { return i === marked ? { re: -z.re, im: -z.im } : { re: z.re, im: z.im }; });
  }

  // Difusor: 2|s><s| - I  (inversión sobre la media), |s> = superposición uniforme.
  function diffuser(a) {
    var mr = 0, mi = 0, i;
    for (i = 0; i < N; i++) { mr += a[i].re; mi += a[i].im; }
    mr /= N; mi /= N;
    return a.map(function (z) { return { re: 2 * mr - z.re, im: 2 * mi - z.im }; });
  }

  // Ruido de desfase: fase aleatoria N(0, σ) por qubit; el estado |i> gana exp(i·Σ φ_q·bit_q(i)).
  function dephase(a, sigma) {
    if (!sigma) return a;
    var phi = [], q;
    for (q = 0; q < NQ; q++) phi.push(sigma * randNormal());
    return a.map(function (z, i) {
      var ang = 0;
      for (q = 0; q < NQ; q++) if ((i >> q) & 1) ang += phi[q];
      var c = Math.cos(ang), s = Math.sin(ang);
      return { re: z.re * c - z.im * s, im: z.re * s + z.im * c };
    });
  }

  // ---------- API pública ----------
  function runQuantum(opts) {
    var k = opts.k, target = opts.target;
    var phaseNoise = opts.phaseNoise || 0, sensorFlip = opts.sensorFlip || 0;
    var a = dephase(hadamard(newState()), phaseNoise), misreads = 0;
    for (var it = 0; it < k; it++) {
      // cada iteración consulta el sensor una vez: marca el sector percibido
      var seen = perceive(target, sensorFlip);
      if (seen !== target) misreads++;
      a = dephase(oracle(a, seen), phaseNoise);
      a = dephase(diffuser(a), phaseNoise);
    }
    return {
      amps: a,
      probs: probsOf(a),
      theory: Math.pow(Math.sin((2 * k + 1) * THETA), 2),
      misreads: misreads // consultas en las que el sensor percibió un sector equivocado
    };
  }

  // ---------- circuito armado con piezas (contrato v3) ----------
  // Piezas: H superposición · M marcador (cuesta 1 consulta al sensor) · D difusor ·
  //         S estabilizador (no cambia el estado; reduce a la mitad el ruido del circuito) ·
  //         C calibrador (no es una compuerta: solo lo usa el juego para ajustar φ).
  // El circuito se ejecuta TAL CUAL, desde |000>, en el orden recibido: no hay casos especiales.
  // Fase generalizada (búsqueda exacta, Long 2001): φ = π es el Grover estándar.
  var PI = Math.PI;
  function expi(phi) { return phi === PI ? { re: -1, im: 0 } : { re: Math.cos(phi), im: Math.sin(phi) }; }
  function cmul(x, y) { return { re: x.re * y.re - x.im * y.im, im: x.re * y.im + x.im * y.re }; }

  // M_φ: multiplica por e^{iφ} la amplitud del sector marcado (φ = π → cambio de signo).
  function oraclePhi(a, marked, phi) {
    var e = expi(phi);
    return a.map(function (z, i) { return i === marked ? cmul(z, e) : { re: z.re, im: z.im }; });
  }

  // D_φ = (1 − e^{iφ})|s><s| − I  (φ = π → 2|s><s| − I). |s><s| a = media(a) en cada sector.
  function diffuserPhi(a, phi) {
    var e = expi(phi), c = { re: 1 - e.re, im: -e.im }, mr = 0, mi = 0, i;
    for (i = 0; i < N; i++) { mr += a[i].re; mi += a[i].im; }
    var m = cmul(c, { re: mr / N, im: mi / N });
    return a.map(function (z) { return { re: m.re - z.re, im: m.im - z.im }; });
  }

  // Ejecuta las piezas. `phis` (opcional): una fase por pieza, para el desplazamiento de parámetros.
  function runPieces(pieces, target, o) {
    var sigma = (o.phaseNoise || 0) * (pieces.indexOf('S') >= 0 ? 0.5 : 1);
    var a = newState(), queries = 0, misreads = 0;
    pieces.forEach(function (p, idx) {
      var phi = o.phis ? o.phis[idx] : (o.phi === undefined ? PI : o.phi);
      if (p === 'H') a = dephase(hadamard(a), sigma);
      else if (p === 'M') {
        var seen = perceive(target, o.sensorFlip || 0);
        queries++;
        if (seen !== target) misreads++;
        a = dephase(oraclePhi(a, seen, phi), sigma);
      } else if (p === 'D') a = dephase(diffuserPhi(a, phi), sigma);
      // 'S' y 'C' no cambian el estado
    });
    return { amps: a, queries: queries, misreads: misreads };
  }

  function runCircuit(opts) {
    var pieces = opts.pieces || [], target = opts.target;
    var r = runPieces(pieces, target, opts);
    // ideal: el mismo circuito sin ruido de circuito y con sensor perfecto
    var ideal = probsOf(runPieces(pieces, target, { phi: opts.phi }).amps);
    return {
      amps: r.amps, probs: probsOf(r.amps), ideal: ideal, theory: ideal[target],
      queries: r.queries, misreads: r.misreads
    };
  }

  // Acierto medio sobre los 8 sectores (el objetivo del calibrador: no filtra dónde está el enemigo).
  function meanSuccess(pieces, o) {
    var tot = 0, t, n = o.phaseNoise ? 40 : 1, r;
    for (t = 0; t < N; t++) for (r = 0; r < n; r++) tot += probsOf(runPieces(pieces, t, o).amps)[t];
    return tot / (N * n);
  }

  // Valor y derivada d(acierto medio)/dφ con la regla de desplazamiento de parámetros.
  // φ aparece en varias compuertas (M y D); cada una tiene generador de brecha 1, así que
  // dP/dφ = Σ_j [P(φ_j + π/2) − P(φ_j − π/2)] / 2 desplazando una compuerta a la vez.
  function gradient(opts) {
    var pieces = opts.pieces, phi = opts.phi === undefined ? PI : opts.phi, noise = opts.phaseNoise || 0;
    var base = pieces.map(function () { return phi; }), d = 0;
    pieces.forEach(function (p, j) {
      if (p !== 'M' && p !== 'D') return;
      var up = base.slice(), dn = base.slice();
      up[j] += PI / 2; dn[j] -= PI / 2;
      d += (meanSuccess(pieces, { phis: up, phaseNoise: noise }) - meanSuccess(pieces, { phis: dn, phaseNoise: noise })) / 2;
    });
    return { value: meanSuccess(pieces, { phi: phi, phaseNoise: noise }), dphi: d };
  }

  // Fase de la búsqueda exacta con k iteraciones (Long, 2001): sin(π/(4J+6)) = sin β · sin(φ/2),
  // con sin β = 1/√N y J = k − 1 (Long cuenta J + 1 iteraciones). Con ese φ el acierto es 100 %.
  // Para N = 8: k=2 → 121,9° · k=3 → 78,0° · k=4 → 58,8°. Con k=1 no existe (el máximo es 78,1 % en φ=π).
  function exactPhi(k) {
    if (k < 2) return null;
    var x = Math.sin(PI / (4 * (k - 1) + 6)) / Math.sin(THETA);
    return x > 1 ? null : 2 * Math.asin(x);
  }

  // Cañón clásico: k consultas "¿es el sector i?" a sectores distintos, en orden aleatorio.
  // Un "sí" (según la percepción del sensor) detiene la búsqueda y apunta a ese sector;
  // un "no" lo descarta y la probabilidad se reparte entre los que quedan.
  function runClassical(opts) {
    var k = opts.k, target = opts.target, sensorFlip = opts.sensorFlip || 0;
    var order = [], i, j, t;
    for (i = 0; i < N; i++) order.push(i);
    for (i = N - 1; i > 0; i--) { j = randInt(i + 1); t = order[i]; order[i] = order[j]; order[j] = t; }

    var discarded = [], found = false, hit = -1, misreads = 0;
    for (var q = 0; q < k && q < N; q++) {
      var s = order[q], seen = perceive(target, sensorFlip);
      if (seen !== target) misreads++;
      if (seen === s) { found = true; hit = s; break; }
      discarded.push(s);
    }

    var probs = [];
    if (found) {
      for (i = 0; i < N; i++) probs.push(i === hit ? 1 : 0);
    } else {
      var left = N - discarded.length;
      for (i = 0; i < N; i++) probs.push(discarded.indexOf(i) >= 0 ? 0 : 1 / left);
    }
    return { probs: probs, discarded: discarded, found: found, theory: Math.min(1, (k + 1) / N), misreads: misreads };
  }

  function sample(probs) {
    var total = 0, i;
    for (i = 0; i < probs.length; i++) total += probs[i];
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < probs.length; i++) { acc += probs[i]; if (r < acc) return i; }
    return probs.length - 1;
  }

  // Comentario honesto sobre lo que debe salir al correr el circuito exportado (depende de k).
  function qiskitExpectation(k, bits) {
    var pct = function (x) { return (100 * x).toFixed(1).replace('.', ',') + ' %'; };
    var p = Math.pow(Math.sin((2 * k + 1) * THETA), 2);
    var prev = k > 0 ? Math.pow(Math.sin((2 * k - 1) * THETA), 2) : 0;
    var msg = "la clave '" + bits + "' debería salir ~" + pct(p) + " de las veces (teoría con k=" + k + ")";
    if (k === 0) msg += ': sin iteraciones es puro azar, 1 de 8';
    else if (p < prev) msg += ': ¡te pasaste de iteraciones! Con k=' + (k - 1) + ' la teoría daba ' + pct(prev);
    return msg;
  }

  // Texto Qiskit ejecutable del circuito del cañón (oráculo para el sector `target`, por defecto 5 = '101').
  // `piecesOrK`: un número k (circuito estándar H + k×[M, D]) o el array de piezas armado por el jugador
  // (ej. ['H','M','D','M']); se exporta TAL CUAL, incluidas las configuraciones erróneas.
  // `phi` (opcional, radianes): fase generalizada del marcador y el difusor; por defecto π (Grover estándar).
  function toQiskit(piecesOrK, target, phi) {
    if (target === undefined) target = 5;
    var isK = typeof piecesOrK === 'number', pieces, k;
    if (isK) {
      k = piecesOrK; pieces = ['H'];
      for (var i = 0; i < k; i++) pieces.push('M', 'D');
    } else { pieces = piecesOrK; k = pieces.filter(function (p) { return p === 'M'; }).length; }
    var std = phi === undefined || phi === PI;
    var bits = target.toString(2).padStart(NQ, '0'); // bits[0] es q2 (little-endian)
    var zeros = [];
    for (var q = 0; q < NQ; q++) if (((target >> q) & 1) === 0) zeros.push(q);
    var xs = zeros.length ? '[' + zeros.join(', ') + ']' : null;
    var phase = std ? 'qc.ccz(0, 1, 2)' : 'qc.mcp(' + phi.toFixed(6) + ', [0, 1], 2)';

    var L = [];
    L.push('# pip install qiskit qiskit-aer');
    L.push('from qiskit import QuantumCircuit, transpile');
    L.push('from qiskit_aer import AerSimulator');
    L.push('');
    L.push('# Cañón cuántico de Collapse: 3 qubits = 8 sectores. Piezas: ' + (pieces.join(' ') || '(ninguna)') + '.');
    L.push("# Sector marcado: " + target + " ('" + bits + "', little-endian como Qiskit).");
    if (!std) L.push('# Fase del marcador y el difusor: φ = ' + (phi * 180 / PI).toFixed(2) + '° (π = Grover estándar).');
    L.push('qc = QuantumCircuit(3, 3)');
    var n = 0;
    pieces.forEach(function (p) {
      n++;
      L.push('');
      if (p === 'H') {
        L.push('# [' + n + '] H: superposición uniforme');
        L.push('qc.h([0, 1, 2])');
      } else if (p === 'M') {
        L.push('# [' + n + '] M, marcador (oráculo): ' + (std ? 'invierte la fase' : 'cambia la fase') + ' del sector ' + target);
        if (xs) L.push('qc.x(' + xs + ')');
        L.push(phase);
        if (xs) L.push('qc.x(' + xs + ')');
      } else if (p === 'D') {
        L.push('# [' + n + '] D, difusor: ' + (std ? '2|s><s| - I' : '(1 - e^{iφ})|s><s| - I') + ' (salvo fase global)');
        L.push('qc.h([0, 1, 2])');
        L.push('qc.x([0, 1, 2])');
        L.push(phase);
        L.push('qc.x([0, 1, 2])');
        L.push('qc.h([0, 1, 2])');
      } else if (p === 'S') {
        L.push('# [' + n + '] S, estabilizador: no cambia el estado (en el juego reduce el ruido a la mitad)');
        L.push('qc.barrier()');
      } else {
        L.push('# [' + n + '] ' + p + ': pieza sin compuerta (solo la usa el juego)');
      }
    });
    L.push('');
    L.push('qc.measure([0, 1, 2], [0, 1, 2])   # medición = el disparo');
    L.push('');
    L.push('sim = AerSimulator()');
    L.push('counts = sim.run(transpile(qc, sim), shots=1024).result().get_counts()');
    L.push('print(counts)   # ' + (isK && std ? qiskitExpectation(k, bits) : circuitExpectation(pieces, target, bits, phi)));
    return L.join('\n');
  }

  // Qué debería salir al correr un circuito armado (puede ser una configuración errónea: se dice).
  function circuitExpectation(pieces, target, bits, phi) {
    var p = runCircuit({ pieces: pieces, target: target, phi: phi }).theory;
    var msg = "la clave '" + bits + "' debería salir ~" + (100 * p).toFixed(1).replace('.', ',') + ' % de las veces (teoría de este circuito)';
    if (pieces.indexOf('H') < 0) msg += '. Sin H no hay superposición: no se concentra amplitud';
    else if (pieces.indexOf('M') >= 0 && pieces.indexOf('D') < 0) msg += '. Marcador sin difusor: las probabilidades no cambian';
    else if (pieces.indexOf('D') >= 0 && pieces.indexOf('M') < 0) msg += '. Difusor sin marcador: no hay nada que amplificar';
    return msg;
  }

  // ---------- autotest ----------
  function selfTest() {
    var results = [];
    function check(name, ok, detail) {
      results.push({ name: name, ok: !!ok, detail: detail || '' });
      var style = ok ? 'color:#2ecc71' : 'color:#e74c3c;font-weight:bold';
      console.log('%c' + (ok ? 'OK  ' : 'FALLA ') + name + (detail ? '  ' + detail : ''), style);
    }
    var TOL = 1e-9, t, k, i, r;

    // 1. Tabla 8.4: k = 0..3 → 12,5 / 78,1 / 94,5 / 33,0 %, para los 8 sectores marcados.
    var expected = [0.125, 0.78125, 0.9453125, 0.330078125];
    console.log('k | P(marcado) simulada | teoría | esperada (8.4)');
    for (k = 0; k < 4; k++) {
      var worst = 0, pm = 0;
      for (t = 0; t < N; t++) {
        r = runQuantum({ k: k, target: t });
        pm = r.probs[t];
        worst = Math.max(worst, Math.abs(pm - expected[k]), Math.abs(pm - r.theory));
      }
      r = runQuantum({ k: k, target: 3 });
      console.log(k + ' | ' + (100 * r.probs[3]).toFixed(1) + '% | ' + (100 * r.theory).toFixed(1) + '% | ' + (100 * expected[k]).toFixed(1) + '%');
      check('Tabla 8.4, k=' + k + ' → ' + (100 * expected[k]).toFixed(1) + '%', worst < TOL, 'error máx = ' + worst.toExponential(2));
    }

    // 2. Σp = 1 (con y sin ruido de fase: el desfase es unitario).
    var sumErr = 0;
    for (k = 0; k < 4; k++) for (t = 0; t < N; t++) {
      [0, 0.3].forEach(function (ph) {
        var p = runQuantum({ k: k, target: t, phaseNoise: ph }).probs;
        sumErr = Math.max(sumErr, Math.abs(p.reduce(function (x, y) { return x + y; }, 0) - 1));
      });
    }
    check('Σp = 1', sumErr < TOL, 'error máx = ' + sumErr.toExponential(2));

    // 3. H·H = I sobre todos los estados base.
    var hhErr = 0;
    for (i = 0; i < N; i++) {
      var e = newState(); e[0] = { re: 0, im: 0 }; e[i] = { re: 1, im: 0 };
      var back = hadamard(hadamard(e));
      for (var j = 0; j < N; j++) hhErr = Math.max(hhErr, Math.abs(back[j].re - e[j].re), Math.abs(back[j].im - e[j].im));
    }
    check('H·H = I', hhErr < TOL, 'error máx = ' + hhErr.toExponential(2));

    // 4. Un marcador sin difusor no cambia las probabilidades (pero sí el signo de la amplitud).
    var base = hadamard(newState()), marked = oracle(base, 5);
    var pb = probsOf(base), pmk = probsOf(marked), dif = 0;
    for (i = 0; i < N; i++) dif = Math.max(dif, Math.abs(pb[i] - pmk[i]));
    check('marcador sin difusor: probabilidades iguales', dif < TOL && marked[5].re < 0 && base[5].re > 0,
      'cambio máx = ' + dif.toExponential(2));

    // 5. Marcador + difusor sin superposición previa no mejoran el acierto: desde |000> el difusor
    //    NO devuelve |000> (da amplitudes -0,75 y 0,25), pero el sector marcado queda en 1/16 < 1/8.
    var d0 = probsOf(diffuser(oracle(newState(), 5)));
    check('marcador + difusor sin superposición: no mejora el acierto (< 12,5%)', d0[5] < 0.125,
      'P(marcado) = ' + (100 * d0[5]).toFixed(2) + '%');

    // 6. Little-endian: el sector i corresponde al índice del vector (bit 0 = qubit 0).
    check('little-endian: toQiskit marca "' + 5..toString(2).padStart(3, '0') + '" con X en q1',
      /qc\.x\(\[1\]\)/.test(toQiskit(1, 5)));

    // 7. Ruido de fase degrada (en promedio) el acierto a k = 2.
    var sum = 0, M = 400;
    for (i = 0; i < M; i++) sum += runQuantum({ k: 2, target: 0, phaseNoise: 0.4 }).probs[0];
    check('ruido de circuito: acierto medio (k=2, σ=0.4) < 94,5%', sum / M < 0.9453125,
      'media = ' + (100 * sum / M).toFixed(1) + '%');

    // 8. Clásico: P(acierto) ≈ (k+1)/8 por Monte Carlo.
    var trials = 20000, classOk = true, msg = [];
    for (k = 0; k < 4; k++) {
      var hits = 0;
      for (i = 0; i < trials; i++) {
        var c = runClassical({ k: k, target: 2 });
        if (sample(c.probs) === 2) hits++;
      }
      var f = hits / trials, th = (k + 1) / N;
      msg.push('k=' + k + ': ' + (100 * f).toFixed(1) + '%');
      if (Math.abs(f - th) > 0.02) classOk = false;
    }
    check('clásico ≈ (k+1)/8 (Monte Carlo)', classOk, msg.join('  '));

    // 9. Sensor ruidoso (flip = 1): el cuántico marca siempre un sector equivocado → nunca por encima de lo teórico.
    var wrong = 0;
    for (i = 0; i < 200; i++) wrong += runQuantum({ k: 1, target: 0, sensorFlip: 1 }).probs[0];
    check('sensor siempre falso: cuántico acierta menos que sin ruido (k=1)', wrong / 200 < 0.78125,
      'media = ' + (100 * wrong / 200).toFixed(1) + '%');

    // 10. sample respeta las probabilidades.
    var cnt = [0, 0, 0, 0, 0, 0, 0, 0], S = 20000, p4 = runQuantum({ k: 2, target: 4 }).probs;
    for (i = 0; i < S; i++) cnt[sample(p4)]++;
    check('sample ~ probs', Math.abs(cnt[4] / S - p4[4]) < 0.015, (100 * cnt[4] / S).toFixed(1) + '% vs ' + (100 * p4[4]).toFixed(1) + '%');

    // 10b. misreads: 0 con sensor perfecto; con sensor siempre falso, una por consulta/iteración.
    var mqOk = true, mcOk = true;
    for (k = 0; k < 4; k++) {
      mqOk = mqOk && runQuantum({ k: k, target: 2 }).misreads === 0 && runQuantum({ k: k, target: 2, sensorFlip: 1 }).misreads === k;
      var cf = runClassical({ k: k, target: 2, sensorFlip: 1 });
      // con sensor siempre falso, cada consulta hecha se equivoca; el clásico puede parar antes si cree haber encontrado
      mcOk = mcOk && runClassical({ k: k, target: 2 }).misreads === 0 && cf.misreads >= Math.min(k, 1) * (k ? 1 : 0) && cf.misreads <= k;
    }
    check('misreads: 0 sin ruido, = k con sensor siempre falso (cuántico)', mqOk && mcOk);

    // 10c. Circuito armado con piezas (v3): igual al estándar, cuenta consultas y se ejecuta tal cual.
    var stdP = ['H', 'M', 'D', 'M', 'D'];
    var rc = runCircuit({ pieces: stdP, target: 3 });
    check('runCircuit estándar = tabla 8.4 (k=2), queries = nº de M', Math.abs(rc.theory - expected[2]) < TOL && rc.queries === 2 &&
      rc.ideal[3] === rc.theory, 'P = ' + (100 * rc.theory).toFixed(1) + '%, queries = ' + rc.queries);
    var bad = [
      ['H', 'M'], ['M', 'D', 'M', 'D'], ['H', 'D'], ['H', 'M', 'M', 'D']
    ].map(function (p) { return runCircuit({ pieces: p, target: 3 }).theory; });
    // H·M, H·D y H·M·M·D dejan el acierto en 12,5 % exacto. Sin H el difusor sí mezcla amplitudes desde |000>
    // y sube apenas a 14,1 % (9/64): casi nada frente al 78-95 % de un circuito bien armado.
    check('configuraciones erróneas no mejoran (H·M, H·D, M·M·D = 12,5 %; sin H ≈ 14,1 %)',
      Math.abs(bad[0] - 0.125) < TOL && Math.abs(bad[2] - 0.125) < TOL && Math.abs(bad[3] - 0.125) < TOL &&
      Math.abs(bad[1] - 9 / 64) < TOL, bad.map(function (x) { return (100 * x).toFixed(1) + '%'; }).join(' · '));
    check('S no cambia el estado', Math.abs(runCircuit({ pieces: ['H', 'M', 'D', 'S'], target: 3 }).theory - expected[1]) < TOL);
    var noS = 0, withS = 0, R = 600;
    for (i = 0; i < R; i++) {
      noS += runCircuit({ pieces: stdP, target: 3, phaseNoise: 0.4 }).probs[3];
      withS += runCircuit({ pieces: stdP.concat('S'), target: 3, phaseNoise: 0.4 }).probs[3];
    }
    check('S reduce el ruido del circuito (acierto con S > sin S)', withS > noS, (100 * noS / R).toFixed(1) + '% → ' + (100 * withS / R).toFixed(1) + '%');

    // Búsqueda exacta (Long): con φ ajustada el acierto llega a 100 %, incluso donde φ=π sobre-rota (k=3).
    var exOk = true, exMsg = [];
    [2, 3, 4].forEach(function (kk) {
      var ph = exactPhi(kk), pp = ['H'];
      for (var z = 0; z < kk; z++) pp.push('M', 'D');
      for (t = 0; t < N; t++) exOk = exOk && Math.abs(runCircuit({ pieces: pp, target: t, phi: ph }).theory - 1) < 1e-9;
      exMsg.push('k=' + kk + ' φ=' + (ph * 180 / Math.PI).toFixed(1) + '°');
    });
    check('búsqueda exacta: φ de Long da 100 % en los 8 sectores', exOk && exactPhi(1) === null, exMsg.join(' · '));

    // Calibrador: la derivada por desplazamiento de parámetros coincide con diferencias finitas.
    var gOk = true, gMsg = '';
    [0.8, 1.5, 2.4].forEach(function (ph) {
      var g = gradient({ pieces: stdP, phi: ph }), h = 1e-5;
      var fd = (gradient({ pieces: stdP, phi: ph + h }).value - gradient({ pieces: stdP, phi: ph - h }).value) / (2 * h);
      gOk = gOk && Math.abs(g.dphi - fd) < 1e-6;
      gMsg = 'error máx vs. dif. finitas: ' + Math.abs(g.dphi - fd).toExponential(1);
    });
    check('gradient (desplazamiento de parámetros) = diferencias finitas', gOk, gMsg);
    // Subir con el gradiente desde φ = π/2 llega al máximo (k=2 → φ ≈ 121,9°).
    var phiT = 1.2;
    for (i = 0; i < 80; i++) phiT += 1.5 * gradient({ pieces: stdP, phi: phiT }).dphi;
    check('descenso de gradiente: el acierto medio sube a ~100 %', gradient({ pieces: stdP, phi: phiT }).value > 0.999,
      'φ = ' + (phiT * 180 / Math.PI).toFixed(1) + '°, acierto medio = ' + (100 * gradient({ pieces: stdP, phi: phiT }).value).toFixed(2) + '%');
    check('toQiskit(piezas): exporta tal cual y avisa de configs erróneas',
      /Marcador sin difusor/.test(toQiskit(['H', 'M'], 5)) && /Sin H/.test(toQiskit(['M', 'D'], 5)) && /mcp\(/.test(toQiskit(stdP, 5, 1.2)));

    // 11. Fixtures de Qiskit (solo en Node: un navegador no puede leer archivos locales desde file://).
    // Se generan con: python qiskit/validate.py --json
    if (typeof require === 'function' && typeof __dirname !== 'undefined') {
      try {
        var fx = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'qiskit', 'fixtures', 'statevector_cases.json'), 'utf8'));
        var fxErr = 0, n = 0;
        fx.forEach(function (c) {
          var p;
          if (c.no_diffuser) p = probsOf(oracle(hadamard(newState()), c.target));
          else if (c.no_hadamard) p = probsOf(diffuser(oracle(newState(), c.target)));
          else p = runQuantum({ k: c.k, target: c.target }).probs;
          for (var s = 0; s < N; s++) fxErr = Math.max(fxErr, Math.abs(p[s] - c.probs[s]));
          n++;
        });
        check('coincide con Qiskit Statevector (' + n + ' casos, 8 sectores)', fxErr < TOL, 'error máx = ' + fxErr.toExponential(2));
        var cx = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'qiskit', 'fixtures', 'circuit_cases.json'), 'utf8'));
        var cxErr = 0;
        cx.forEach(function (c) {
          var p = runCircuit({ pieces: c.pieces, target: c.target, phi: c.phi }).probs;
          for (var s = 0; s < N; s++) cxErr = Math.max(cxErr, Math.abs(p[s] - c.probs[s]));
        });
        check('circuitos armados y φ de Long coinciden con Qiskit (' + cx.length + ' casos)', cxErr < TOL, 'error máx = ' + cxErr.toExponential(2));
      } catch (e) {
        console.log('%cOMITIDA comparación con fixtures de Qiskit (' + e.message + ')', 'color:#f39c12');
      }
    } else {
      console.log('%cOMITIDA comparación con fixtures de Qiskit (solo en Node: node -e "require(\'./js/quantum.js\').selfTest()")', 'color:#f39c12');
    }

    var pass = results.every(function (x) { return x.ok; });
    console.log('%c' + (pass ? '✔ Todo en verde' : '✘ Hay pruebas fallidas'), pass ? 'color:#2ecc71;font-size:14px' : 'color:#e74c3c;font-size:14px');
    return { pass: pass, results: results };
  }

  var Quantum = {
    // σ del desfase por qubit y por pieza que reproduce la curva acierto-vs-k del ruido de FakeSherbrooke
    // (IBM) en Qiskit Aer. Viene de qiskit/fixtures/noise_profile.json (generate_noise_profile.py).
    // Es el nivel "completo"; el juego puede escalarlo (p. ej. × 0.5) para dar más o menos ruido.
    CALIBRATED_PHASE_NOISE: 0.46,
    runQuantum: runQuantum,
    runClassical: runClassical,
    sample: sample,
    toQiskit: toQiskit,
    selfTest: selfTest,
    runCircuit: runCircuit,
    gradient: gradient,
    exactPhi: exactPhi
  };

  root.Quantum = Quantum;
  if (typeof module !== 'undefined' && module.exports) module.exports = Quantum;
})(typeof window !== 'undefined' ? window : globalThis);
