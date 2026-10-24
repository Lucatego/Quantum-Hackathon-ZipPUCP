// Mini-runner de pruebas sin dependencias. Se carga en el navegador (test/ui.test.html)
// y en Node (test/run-ui-tests.js). Expone: test, skip, assert, assertEq, assertClose, runTests.
(function (g) {
  var tests = [];

  g.test = function (name, fn) { tests.push({ name: name, fn: fn }); };
  g.skip = function (name, why) { tests.push({ name: name, skip: why || 'omitida' }); };

  g.assert = function (cond, msg) { if (!cond) throw new Error(msg || 'assert falló'); };
  g.assertEq = function (a, b, msg) {
    if (a !== b) throw new Error((msg || 'assertEq') + ': esperaba ' + JSON.stringify(b) + ', obtuve ' + JSON.stringify(a));
  };
  g.assertClose = function (a, b, tol, msg) {
    if (!(Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol))) {
      throw new Error((msg || 'assertClose') + ': esperaba ' + b + ' ± ' + tol + ', obtuve ' + a);
    }
  };

  g.runTests = function () {
    return tests.map(function (t) {
      if (t.skip) return { name: t.name, status: 'skip', detail: t.skip };
      try { t.fn(); return { name: t.name, status: 'ok' }; }
      catch (e) { return { name: t.name, status: 'fail', detail: (e && e.message) || String(e) }; }
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
