// Genera src/data.json con los números REALES del simulador (js/quantum.js), para que el video no tenga cifras escritas a mano.
//   node scripts/make-data.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const sandbox = { console, Math, Date, JSON };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'quantum.js'), 'utf8'), sandbox, { filename: 'quantum.js' });
const Q = sandbox.Quantum;
if (!Q || typeof Q.runQuantum !== 'function') throw new Error('js/quantum.js no expone Quantum.runQuantum');

const TARGET = 3;
const round = (v) => Math.round(v * 1e6) / 1e6;
const data = { target: TARGET, quantum: [], classic: [] };

for (let k = 0; k <= 3; k++) {
  const q = Q.runQuantum({ k, target: TARGET });
  data.quantum.push({ k, amps: q.amps.map((a) => round(a.re)), probs: q.probs.map(round), theory: round(q.theory) });
  const c = Q.runClassical({ k, target: TARGET });
  data.classic.push({ k, probs: c.probs.map(round), discarded: c.discarded, theory: round(c.theory) });
}

// Paso intermedio real: tras la superposición, el marcador solo invierte la fase del sector buscado.
const k0 = data.quantum[0];
const marked = k0.amps.slice();
marked[TARGET] = -marked[TARGET];
data.marker = { amps: marked, probs: k0.probs.slice() };

data.qiskit = Q.toQiskit(2, TARGET);   // mismo sector que el resto del video

fs.writeFileSync(path.join(__dirname, '..', 'src', 'data.json'), JSON.stringify(data, null, 2));
console.log('src/data.json escrito. p(marcado) por k:', data.quantum.map((d) => (d.probs[TARGET] * 100).toFixed(1) + ' %').join(' / '));
console.log('clásico (k+1)/8:', data.classic.map((d) => (d.theory * 100).toFixed(1) + ' %').join(' / '));
