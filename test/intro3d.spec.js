// Pruebas de js/intro3d.js (portada 3D). Sin GPU: afirman geometría, datos y respaldo, no pixeles.
// Requiere test/mini-test.js y js/intro3d.js cargados.
(function () {
  var D = Math.PI / 4;

  test('Intro3D: expone start, stop y ayudantes puros', function () {
    assert(window.Intro3D, 'falta window.Intro3D');
    ['start', 'stop', 'layout', 'polar', 'defaultResult', 'getResult'].forEach(function (f) { assertEq(typeof Intro3D[f], 'function', 'Intro3D.' + f); });
  });

  test('Intro3D.layout: 8 sectores, cada uno [i·45°, (i+1)·45°) con su centro', function () {
    var l = Intro3D.layout(Intro3D.defaultResult(3));
    assertEq(l.length, 8, 'sectores');
    l.forEach(function (s, i) {
      assertEq(s.i, i, 'índice');
      assertClose(s.a0, i * D, 1e-12, 'a0 sector ' + i);
      assertClose(s.a1, (i + 1) * D, 1e-12, 'a1 sector ' + i);
      assertClose(s.center, (i + 0.5) * D, 1e-12, 'centro sector ' + i);
    });
  });

  test('Intro3D.polar: sentido horario en pantalla (x = cos, z = sin con z hacia abajo)', function () {
    var p0 = Intro3D.polar(0.5 * D, 1);       // sector 0: abajo-derecha
    assert(p0.x > 0 && p0.z > 0, 'sector 0 debe estar a la derecha y hacia abajo');
    var p3 = Intro3D.polar(3.5 * D, 1);       // sector 3: abajo-izquierda
    assert(p3.x < 0 && p3.z > 0, 'sector 3 debe estar a la izquierda y hacia abajo');
    var p5 = Intro3D.polar(5.5 * D, 1);       // sector 5: arriba-izquierda
    assert(p5.x < 0 && p5.z < 0, 'sector 5 debe estar a la izquierda y hacia arriba');
    var p6 = Intro3D.polar(6.5 * D, 1);       // sector 6: arriba-derecha
    assert(p6.x > 0 && p6.z < 0, 'sector 6 debe estar a la derecha y hacia arriba');
    assertClose(Math.hypot(p0.x, p0.z), 1, 1e-12, 'radio');
  });

  test('Intro3D.layout: el signo de la amplitud marca el color (negativo = rosa)', function () {
    var l = Intro3D.layout(Intro3D.defaultResult(3));
    assertEq(l[3].negative, false, 'sector marcado positivo');
    for (var i = 0; i < 8; i++) if (i !== 3) assertEq(l[i].negative, true, 'sector ' + i + ' negativo');
  });

  test('Intro3D.defaultResult: amplitudes del contrato y probabilidades que suman ≈ 1', function () {
    var r = Intro3D.defaultResult(3), sum = r.probs.reduce(function (a, b) { return a + b; }, 0);
    assertClose(r.amps[3].re, 0.972, 1e-3, 'marcado');
    assertClose(r.amps[0].re, -0.088, 1e-3, 'resto');
    assertClose(sum, 1, 2e-3, 'Σp');
    assertClose(r.probs[3], 0.945, 1e-3, 'p(marcado)');
  });

  test('Intro3D.getResult: usa Quantum.runQuantum si existe y respalda si falla o es inválido', function () {
    var saved = window.Quantum, called = null;
    try {
      var fake = { amps: [], probs: [] };
      for (var i = 0; i < 8; i++) { fake.amps.push({ re: 0.1 * i, im: 0 }); fake.probs.push(0.01 * i * i); }
      window.Quantum = { runQuantum: function (a) { called = a; return fake; } };
      assertEq(Intro3D.getResult(2, 3), fake, 'debe devolver lo del simulador');
      assertEq(called.k, 2, 'k'); assertEq(called.target, 3, 'target');
      window.Quantum = { runQuantum: function () { throw new Error('boom'); } };
      assertClose(Intro3D.getResult(2, 3).amps[3].re, 0.972, 1e-3, 'respaldo si lanza');
      window.Quantum = { runQuantum: function () { return { amps: [1], probs: [1] }; } };
      assertClose(Intro3D.getResult(2, 3).amps[3].re, 0.972, 1e-3, 'respaldo si es inválido');
      window.Quantum = undefined;
      assertClose(Intro3D.getResult(2, 3).amps[3].re, 0.972, 1e-3, 'respaldo sin Quantum');
    } finally { window.Quantum = saved; }
  });

  test('Intro3D.layout: tolera resultados sin amps (usa √p)', function () {
    var l = Intro3D.layout({ probs: [0.25, 0, 0, 0, 0, 0, 0, 0.75] });
    assertClose(l[0].amp, 0.5, 1e-12, 'amp = √0.25');
    assertClose(l[7].prob, 0.75, 1e-12, 'prob');
  });

  test('Intro3D.start: sin THREE o sin contenedor devuelve false y no lanza', function () {
    var saved = window.THREE;
    try {
      window.THREE = undefined;
      assertEq(Intro3D.start({}), false, 'sin THREE');
      assertEq(Intro3D.start(null), false, 'sin contenedor');
    } finally { window.THREE = saved; }
  });

  test('Intro3D.stop: sin start previo no lanza y es idempotente', function () {
    Intro3D.stop(); Intro3D.stop();
  });

  // ---------- Línea de tiempo de la animación (fase 2) ----------
  function withoutQuantum(fn) { var saved = window.Quantum; window.Quantum = undefined; try { fn(); } finally { window.Quantum = saved; } }

  test('Intro3D.sequence: 5 pasos (superposición, marcador, k=1, k=2, k=3) con 8 amplitudes y 8 probabilidades', function () {
    withoutQuantum(function () {
      var seq = Intro3D.sequence(3);
      assertEq(seq.map(function (s) { return s.name; }).join(','), 'superposicion,marcador,k1,k2,k3', 'orden de pasos');
      seq.forEach(function (s) {
        assertEq(s.amps.length, 8, s.name + ' amps'); assertEq(s.probs.length, 8, s.name + ' probs');
        assert(typeof s.caption === 'string' && s.caption.length > 0, s.name + ' sin subtítulo');
      });
    });
  });

  test('Intro3D.sequence: el marcador solo invierte el signo y NO mueve ninguna probabilidad', function () {
    withoutQuantum(function () {
      var seq = Intro3D.sequence(3), a = seq[0], m = seq[1];
      for (var i = 0; i < 8; i++) assertClose(m.probs[i], a.probs[i], 1e-12, 'prob sector ' + i);
      assertClose(m.amps[3], -a.amps[3], 1e-12, 'el sector marcado cambia de signo');
      for (var j = 0; j < 8; j++) if (j !== 3) assertClose(m.amps[j], a.amps[j], 1e-12, 'amp sector ' + j);
    });
  });

  test('Intro3D.sequence: los subtítulos llevan las cifras de la tabla (12,5 / 78,1 / 94,5 / 33,0 %)', function () {
    withoutQuantum(function () {
      var c = Intro3D.sequence(3).map(function (s) { return s.caption; });
      assert(/12,5 %/.test(c[0]), 'k=0'); assert(/78,1 %/.test(c[2]), 'k=1');
      assert(/94,5 %/.test(c[3]), 'k=2'); assert(/33,0 %/.test(c[4]), 'k=3');
    });
  });

  test('Intro3D.sequence: con Quantum las cifras salen del simulador, no del respaldo', function () {
    var saved = window.Quantum;
    try {
      window.Quantum = { runQuantum: function (a) {
        var amps = [], probs = [];
        for (var i = 0; i < 8; i++) { var re = i === a.target ? 0.5 : Math.sqrt(0.5 / 7); amps.push({ re: re, im: 0 }); probs.push(re * re); }
        return { amps: amps, probs: probs, theory: 0.25 };
      } };
      var seq = Intro3D.sequence(3);
      assert(/25,0 %/.test(seq[3].caption), 'debe mostrar 25,0 % (el dato del simulador falso), no 94,5 %');
      assert(!/94,5/.test(seq[3].caption), 'no debe usar el respaldo');
    } finally { window.Quantum = saved; }
  });

  test('Intro3D.stateAt: t=0 es el primer paso, el punto medio de la transición interpola y el ciclo se repite', function () {
    withoutQuantum(function () {
      var seq = Intro3D.sequence(3), T = Intro3D.timing, slot = T.HOLD + T.MOVE, cycle = seq.length * slot;
      var s0 = Intro3D.stateAt(seq, 0);
      assertEq(s0.step, 0, 'paso inicial'); assertClose(s0.amps[3], seq[0].amps[3], 1e-12, 'amp inicial');
      var mid = Intro3D.stateAt(seq, T.HOLD + T.MOVE / 2);
      assertClose(mid.amps[3], (seq[0].amps[3] + seq[1].amps[3]) / 2, 1e-9, 'punto medio');
      assertClose(Intro3D.stateAt(seq, cycle).amps[3], s0.amps[3], 1e-12, 'el ciclo se repite');
      assertEq(Intro3D.stateAt(seq, 3 * slot).step, 3, 'k=2 al inicio del cuarto paso');
      assertEq(Intro3D.stateAt(seq, -slot).step, 4, 'tiempo negativo no rompe (último paso)');
    });
  });

  test('Intro3D.stateAt: el sector marcado pasa por cero al invertir su signo (se ve el giro)', function () {
    withoutQuantum(function () {
      var seq = Intro3D.sequence(3), T = Intro3D.timing, slot = T.HOLD + T.MOVE;
      // de superposición (+0,354) a marcador (−0,354): en el punto medio la amplitud es ≈ 0
      assertClose(Intro3D.stateAt(seq, T.HOLD + T.MOVE / 2).amps[3], 0, 1e-9, 'amp en el cruce');
      // de k=2 (+0,972) a k=3 (+0,575) no cambia de signo; de k=3 a superposición tampoco
      var s = Intro3D.stateAt(seq, 3 * slot + T.HOLD + T.MOVE / 2);
      assert(s.amps[3] > 0, 'k=2→k=3 mantiene el signo del marcado');
      assert(s.amps[0] < 0, 'el resto sigue negativo entre k=2 y k=3');
    });
  });

  test('Intro3D.stateAt: el subtítulo cambia a la mitad de la transición', function () {
    withoutQuantum(function () {
      var seq = Intro3D.sequence(3), T = Intro3D.timing;
      assertEq(Intro3D.stateAt(seq, T.HOLD + T.MOVE * 0.2).caption, seq[0].caption, 'antes de la mitad');
      assertEq(Intro3D.stateAt(seq, T.HOLD + T.MOVE * 0.8).caption, seq[1].caption, 'después de la mitad');
    });
  });
})();
