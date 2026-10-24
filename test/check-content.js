// Revisa los textos del juego con el checklist de la sección 7 del brief:  node test/check-content.js [raíz-del-repo]
// - js/content.js: estructura, pickCard, antídotos y ninguna idea prohibida → si falla, sale con código 1.
// - Textos de otros módulos (say(...) de game.js, DEFAULT_START de ui.js, comentarios de toQiskit):
//   se reportan como AVISO con su dueño; no se editan (TAREAS.md, fase 2).
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
var errors = [], warns = [], notes = [];
function read(rel) { var f = path.join(root, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }

var sandbox = { console: { log: function () {}, warn: function () {}, error: function () {} }, Math: Math };
sandbox.window = sandbox;
vm.createContext(sandbox);
['js/content.js', 'js/quantum.js'].forEach(function (f) {
  var src = read(f);
  if (src) try { vm.runInContext(src, sandbox, { filename: f }); } catch (e) { errors.push(f + ' lanza al cargar: ' + e.message); }
});

var C = sandbox.Content;
if (!C) { console.log('ERROR      window.Content no está definido'); process.exit(1); }

// ---- Estructura ----
var CARDS = ['probClasica', 'amplitud', 'interferencia', 'sobreRotacion', 'ruidoDatos', 'ruidoCircuito', 'pocasPartidas'];
var HINTS = ['primeraBusqueda', 'primerCuantico', 'aciertoCuantico', 'sobreRotacion', 'tormenta', 'ruidoCircuito', 'kCero'];
var PROMO_SECTIONS = ['myths', 'truths'];
if (!Array.isArray(C.start) || C.start.length !== 3) errors.push('Content.start debe tener 3 líneas');
PROMO_SECTIONS.forEach(function (k) {
  var arr = C[k];
  if (!Array.isArray(arr) || arr.length < 2) errors.push('Content.' + k + ' debe ser un arreglo con al menos 2 frases');
  else if (arr.some(function (s) { return !String(s || '').trim(); })) errors.push('Content.' + k + ' tiene entradas vacías');
});
CARDS.forEach(function (k) {
  var c = C.cards && C.cards[k];
  if (!c) return errors.push('falta la tarjeta ' + k);
  var n = String(c.intuitivo).split(/[.!?]+(\s+|$)/).filter(function (s) { return s && s.trim(); }).length;
  if (n < 2 || n > 4) errors.push('cards.' + k + '.intuitivo tiene ' + n + ' oraciones (deben ser 2 a 4)');
  if (!c.profundo) errors.push('cards.' + k + '.profundo vacío');
});
HINTS.forEach(function (k) {
  var h = C.hints && C.hints[k];
  if (!h) errors.push('falta la pista ' + k);
  else if (h.length > 130) warns.push('hints.' + k + ' tiene ' + h.length + ' caracteres; en el celular puede no caber en una línea');
});

// ---- pickCard: prioridad de TAREAS.md ----
function e(cannon, k, hit, extra) { var o = { cannon: cannon, k: k, target: 1, shot: hit ? 1 : 2, hit: hit, theory: 0, t: 0 }; for (var p in extra) o[p] = extra[p]; return o; }
var many = function (x, n) { var a = []; for (var i = 0; i < n; i++) a.push(x); return a; };
[
  ['fallo cuántico k=3 gana a todo', [e('quantum', 3, false), e('classic', 1, false, { misreads: 1 }), e('quantum', 2, true)], 'sobreRotacion'],
  ['misreads', [e('classic', 2, false, { misreads: 1 }), e('quantum', 2, false, { phaseNoise: 0.15 })], 'ruidoDatos'],
  ['fallo cuántico con phaseNoise', [e('quantum', 2, false, { phaseNoise: 0.15 }), e('quantum', 1, true)], 'ruidoCircuito'],
  ['acierto cuántico', [e('quantum', 2, true), e('quantum', 1, false)], 'interferencia'],
  ['solo clásico', [e('classic', 1, true), e('classic', 3, false)], 'probClasica'],
  ['menos de 10 disparos', [e('quantum', 0, false)], 'pocasPartidas'],
  ['log vacío', [], 'pocasPartidas'],
  ['log v1 sin campos de ruido', [e('quantum', 3, true), e('quantum', 1, false)], 'interferencia'],
  ['respaldo', many(e('quantum', 0, false), 12), 'amplitud']
].forEach(function (c) {
  var got;
  try { got = C.pickCard(c[1]); } catch (err) { got = 'lanzó: ' + err.message; }
  if (got !== c[2]) errors.push('pickCard (' + c[0] + '): dio "' + got + '", se esperaba "' + c[2] + '"');
});
try { C.pickCard(undefined); C.pickCard(null); } catch (err) { errors.push('pickCard sin log lanzó: ' + err.message); }

// ---- Checklist §7 sobre content.js ----
C.audit(C.textos()).forEach(function (h) {
  if (h.aclaracion) notes.push('[' + h.regla + '] ' + h.texto + ': "' + h.oracion + '"');
  else errors.push('§7 ' + h.regla + ' en ' + h.texto + ': "' + h.oracion + '"');
});
C.checklist.forEach(function (r) {
  if (!r.antidoto) return;
  var c = C.cards[r.antidoto.card];
  var txt = c ? C.norm(c.intuitivo + ' ' + c.profundo) : '';
  if (!r.antidoto.dice.test(txt)) errors.push('§7 ' + r.id + ': la tarjeta ' + r.antidoto.card + ' debe enseñar lo correcto (' + r.antidoto.dice + ')');
});

// ---- Checklist §7 sobre textos de otros módulos (solo avisos) ----
function literals(src) {
  var out = [], re = /(['"`])((?:\\.|(?!\1).)*)\1/g, m;
  while ((m = re.exec(src))) out.push(m[2]);
  return out;
}
var ext = {};
var game = read('js/game.js');
if (game) (game.match(/say\(([^;\n]*)\)/g) || []).forEach(function (call, i) { ext['game.js say #' + (i + 1) + ' (Lucas)'] = literals(call).join(' … '); });
var ui = read('js/ui.js');
var ds = ui && ui.match(/DEFAULT_START\s*=\s*\[([\s\S]*?)\];/);
if (ds) literals(ds[1]).forEach(function (s, i) { ext['ui.js DEFAULT_START[' + i + '] (Gandy)'] = s; });
if (sandbox.Quantum && typeof sandbox.Quantum.toQiskit === 'function') [0, 1, 2, 3].forEach(function (k) {
  sandbox.Quantum.toQiskit(k).split('\n').forEach(function (line, i) {
    var j = line.indexOf('#');
    if (j >= 0) ext['toQiskit(' + k + ') línea ' + (i + 1) + ' (Avix)'] = line.slice(j + 1);
  });
});
var seen = {};
C.audit(ext).forEach(function (h) {
  var key = h.regla + '|' + h.oracion;
  if (seen[key]) return;
  seen[key] = true;
  (h.aclaracion ? notes : warns).push('[' + h.regla + '] ' + h.texto + ': "' + h.oracion + '"');
});

notes.forEach(function (n) { console.log('REVISAR    aclaración con negación, léela: ' + n); });
warns.forEach(function (w) { console.log('AVISO      ' + w); });
errors.forEach(function (x) { console.log('ERROR      ' + x); });
console.log('\n' + (errors.length ? errors.length + ' error(es) en content.js' : 'content.js OK: estructura, pickCard y checklist §7') +
  ' · ' + Object.keys(ext).length + ' textos externos revisados, ' + warns.length + ' aviso(s)');
process.exit(errors.length ? 1 : 0);
