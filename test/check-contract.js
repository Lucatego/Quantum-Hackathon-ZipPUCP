// Verifica el contrato de TAREAS.md entre módulos:  node test/check-contract.js [raíz-del-repo]
// Carga cada js/*.js en un sandbox (sin navegador) y comprueba nombres, formas y cruces reales
// (p. ej. que UI.drawSectors acepte lo que devuelve Quantum.run*). Un módulo ausente es "pendiente", no error.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
var errors = [], pending = [], notes = [];

// Stub permisivo para DOM/canvas: cualquier propiedad o llamada devuelve otro stub.
function stub() {
  var fn = function () { return stub(); };
  return new Proxy(fn, {
    get: function (t, p) {
      if (p === Symbol.toPrimitive) return function () { return 0; };
      if (p === 'length') return 0;
      if (p === 'getContext') return function () { return stub(); };
      return stub();
    },
    set: function () { return true; },
    apply: function () { return stub(); },
    construct: function () { return stub(); }
  });
}
var sandbox = { console: { log: function () {}, warn: function () {}, error: function () {}, info: function () {} }, Math: Math, Date: Date, JSON: JSON };
sandbox.window = sandbox;
sandbox.document = stub();
sandbox.requestAnimationFrame = function () { return 0; };
sandbox.setTimeout = function () { return 0; };
sandbox.setInterval = function () { return 0; };
sandbox.addEventListener = function () {};
sandbox.performance = { now: function () { return 0; } };
vm.createContext(sandbox);

['content', 'quantum', 'ui', 'game'].forEach(function (m) {
  var file = path.join(root, 'js', m + '.js');
  if (!fs.existsSync(file)) { pending.push('js/' + m + '.js no existe todavía'); return; }
  try { vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: 'js/' + m + '.js' }); }
  catch (e) { errors.push('js/' + m + '.js lanza al cargar: ' + (e && e.message)); }
});

function fns(name, names) {
  var o = sandbox[name];
  if (!o) { pending.push('window.' + name + ' no está definido'); return false; }
  names.forEach(function (n) { if (typeof o[n] !== 'function') errors.push(name + '.' + n + ' debe ser una función'); });
  return true;
}
function near(a, b, tol) { return Math.abs(a - b) <= tol; }
function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
function guard(label, f) { try { f(); } catch (e) { errors.push(label + ' lanzó: ' + (e && e.message)); } }

var hasQ = fns('Quantum', ['runQuantum', 'runClassical', 'sample', 'toQiskit', 'selfTest']);
var hasUI = fns('UI', ['drawHUD', 'drawSectors', 'showStart', 'showEnd']);

if (sandbox.Game) {
  if (typeof sandbox.Game.start !== 'function') errors.push('Game.start debe ser una función');
  if (!Array.isArray(sandbox.Game.log)) errors.push('Game.log debe ser un arreglo');
  if (!sandbox.Game.config || typeof sandbox.Game.config !== 'object') errors.push('Game.config debe ser un objeto');
} else pending.push('window.Game no está definido');

var CARDS = ['probClasica', 'amplitud', 'interferencia', 'sobreRotacion', 'ruidoDatos', 'ruidoCircuito', 'pocasPartidas'];
var C = sandbox.Content;
if (C) {
  if (!Array.isArray(C.start) || C.start.length !== 3) errors.push('Content.start debe ser un arreglo de 3 líneas');
  if (!C.cards) errors.push('Content.cards falta');
  else CARDS.forEach(function (k) {
    var c = C.cards[k];
    if (!c) { errors.push('Content.cards.' + k + ' falta'); return; }
    ['titulo', 'intuitivo', 'profundo'].forEach(function (f) { if (typeof c[f] !== 'string' || !c[f]) errors.push('Content.cards.' + k + '.' + f + ' debe ser texto no vacío'); });
  });
  if (typeof C.pickCard !== 'function') errors.push('Content.pickCard debe ser una función');
  else if (C.cards) guard('Content.pickCard', function () {
    var key = C.pickCard([{ cannon: 'quantum', k: 3, target: 1, shot: 4, hit: false, theory: 0.33, t: 0 }]);
    if (!C.cards[key]) errors.push('Content.pickCard devolvió "' + key + '", que no es una clave de Content.cards');
  });
} else pending.push('window.Content no está definido');

// ---- Formas reales de Quantum ----
var real = {};
if (hasQ) {
  guard('Quantum.runQuantum', function () {
    var T = [0.125, 0.781, 0.945, 0.33];
    [0, 1, 2, 3].forEach(function (k) {
      var r = sandbox.Quantum.runQuantum({ k: k, target: 3 });
      real['q' + k] = r;
      if (!r || r.amps.length !== 8 || r.probs.length !== 8) { errors.push('runQuantum k=' + k + ': amps y probs deben tener 8 entradas'); return; }
      if (!r.amps.every(function (a) { return typeof a.re === 'number' && typeof a.im === 'number'; })) errors.push('runQuantum k=' + k + ': cada amp debe ser {re, im}');
      if (!near(sum(r.probs), 1, 1e-9)) errors.push('runQuantum k=' + k + ': Σp = ' + sum(r.probs));
      if (!near(r.probs[3], T[k], 5e-3)) errors.push('runQuantum k=' + k + ': p(target)=' + r.probs[3] + ', se esperaba ≈' + T[k]);
      if (!near(r.theory, T[k], 5e-3)) errors.push('runQuantum k=' + k + ': theory=' + r.theory + ', se esperaba ≈' + T[k]);
    });
  });
  guard('Quantum.runClassical', function () {
    var r = sandbox.Quantum.runClassical({ k: 2, target: 3 });
    real.c2 = r;
    if (!r || r.probs.length !== 8) errors.push('runClassical: probs debe tener 8 entradas');
    else {
      if (!Array.isArray(r.discarded)) errors.push('runClassical: discarded debe ser un arreglo');
      if (typeof r.found !== 'boolean') errors.push('runClassical: found debe ser booleano');
      if (!near(r.theory, 3 / 8, 1e-9)) errors.push('runClassical k=2: theory=' + r.theory + ', se esperaba 0.375');
    }
  });
  guard('Quantum.sample', function () {
    var i = sandbox.Quantum.sample([0, 0, 0, 1, 0, 0, 0, 0]);
    if (i !== 3) errors.push('Quantum.sample([0,0,0,1,0,…]) devolvió ' + i + ', se esperaba 3');
  });
  guard('Quantum.toQiskit', function () {
    var s = sandbox.Quantum.toQiskit(2);
    if (typeof s !== 'string' || !/measure/.test(s)) errors.push('Quantum.toQiskit(2) debe devolver código Qiskit con measure');
  });
  guard('Quantum.selfTest', function () { sandbox.Quantum.selfTest(); });
}

// ---- Cruce Quantum → UI ----
if (hasQ && hasUI) {
  var ctx = stub();
  [0, 1, 2, 3].forEach(function (k) {
    if (real['q' + k]) guard('UI.drawSectors(runQuantum k=' + k + ')', function () { sandbox.UI.drawSectors(ctx, 100, 100, real['q' + k], 'quantum'); });
  });
  if (real.c2) guard('UI.drawSectors(runClassical)', function () { sandbox.UI.drawSectors(ctx, 100, 100, real.c2, 'classic'); });
  guard('UI.drawHUD', function () { sandbox.UI.drawHUD(ctx, { energy: 50, cannon: 'quantum', k: 2, radar: true }); });
}

pending.forEach(function (p) { console.log('PENDIENTE  ' + p); });
errors.forEach(function (e) { console.log('ERROR      ' + e); });
console.log('\n' + (errors.length ? errors.length + ' error(es) de contrato' : 'Contrato OK en lo que ya está entregado') + (pending.length ? ' · ' + pending.length + ' pendiente(s)' : ''));
process.exit(errors.length ? 1 : 0);
