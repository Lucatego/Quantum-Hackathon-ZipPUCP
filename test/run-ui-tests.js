// Corre test/ui.spec.js por terminal:  node test/run-ui-tests.js
// Sin dependencias. Si `jsdom` está instalado (npm i jsdom, p. ej. en una carpeta temporal con NODE_PATH),
// también corre las pruebas de overlays; si no, esas quedan "omitidas" y se dice explícitamente.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

var evalIn, jsdomUsed = false;
try {
  var JSDOM = require('jsdom').JSDOM;
  var dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  evalIn = function (src, name) { dom.window.eval(src + '\n//# sourceURL=' + name); };
  var win = dom.window;
  jsdomUsed = true;
} catch (e) {
  var sandbox = { console: console, setTimeout: setTimeout, clearTimeout: clearTimeout };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  evalIn = function (src, name) { vm.runInContext(src, sandbox, { filename: name }); };
  win = sandbox;
}

try {
  evalIn(read('test/mini-test.js'), 'mini-test.js');
  evalIn(process.env.UI_FILE ? fs.readFileSync(process.env.UI_FILE, 'utf8') : read('js/ui.js'), 'ui.js');
  evalIn(read('test/ui.spec.js'), 'ui.spec.js');
} catch (e) {
  console.error('No se pudo cargar: ' + (e && e.stack || e));
  process.exit(2);
}

var results = win.runTests();
var c = { ok: 0, fail: 0, skip: 0 };
results.forEach(function (r) {
  c[r.status]++;
  var mark = r.status === 'ok' ? 'ok  ' : r.status === 'fail' ? 'FAIL' : 'skip';
  console.log(mark + '  ' + r.name + (r.detail ? '  — ' + r.detail : ''));
});
console.log('\n' + c.ok + ' ok · ' + c.fail + ' fallan · ' + c.skip + ' omitidas' + (jsdomUsed ? ' (con jsdom)' : ' (sin DOM)'));
process.exit(c.fail ? 1 : 0);
