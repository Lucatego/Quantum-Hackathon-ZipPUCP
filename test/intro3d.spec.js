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
    assertClose(r.amps[3].re, 0.972, 1e-9, 'marcado');
    assertClose(r.amps[0].re, -0.088, 1e-9, 'resto');
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
      assertClose(Intro3D.getResult(2, 3).amps[3].re, 0.972, 1e-9, 'respaldo si lanza');
      window.Quantum = { runQuantum: function () { return { amps: [1], probs: [1] }; } };
      assertClose(Intro3D.getResult(2, 3).amps[3].re, 0.972, 1e-9, 'respaldo si es inválido');
      window.Quantum = undefined;
      assertClose(Intro3D.getResult(2, 3).amps[3].re, 0.972, 1e-9, 'respaldo sin Quantum');
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
})();
