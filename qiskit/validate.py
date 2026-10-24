"""Valida el simulador JS (js/quantum.js) contra Qiskit.

Uso (desde la raíz del repo):
    python qiskit/validate.py            # imprime la tabla 8.4 y compara
    python qiskit/validate.py --json     # además escribe qiskit/fixtures/statevector_cases.json

Convención little-endian de Qiskit: el sector i = int('q2 q1 q0', 2).
"""
import json
import math
import os
import sys

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

N_QUBITS = 3
N = 2 ** N_QUBITS
THETA = math.asin(1 / math.sqrt(N))


def circuit(k, target, with_h=True, with_diffuser=True):
    qc = QuantumCircuit(N_QUBITS)
    if with_h:
        qc.h(range(N_QUBITS))
    zeros = [q for q in range(N_QUBITS) if not (target >> q) & 1]
    for _ in range(k):
        # marcador: invierte la fase del sector `target`
        if zeros:
            qc.x(zeros)
        qc.ccz(0, 1, 2)
        if zeros:
            qc.x(zeros)
        if with_diffuser:  # difusor 2|s><s| - I (salvo fase global)
            qc.h(range(N_QUBITS))
            qc.x(range(N_QUBITS))
            qc.ccz(0, 1, 2)
            qc.x(range(N_QUBITS))
            qc.h(range(N_QUBITS))
    return qc


def probs(qc):
    return list(Statevector.from_instruction(qc).probabilities())  # índice = sector (little-endian)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    expected = [0.125, 0.78125, 0.9453125, 0.330078125]
    print("k | clásico (k+1)/8 | Qiskit P(marcado) | teoría sin^2((2k+1)theta)")
    ok = True
    cases = []
    for k in range(4):
        theory = math.sin((2 * k + 1) * THETA) ** 2
        for t in range(N):
            p = probs(circuit(k, t))
            cases.append({"k": k, "target": t, "probs": p})
            ok &= abs(p[t] - theory) < 1e-9 and abs(p[t] - expected[k]) < 1e-9
        p3 = probs(circuit(k, 3))[3]
        print(f"{k} | {100 * (k + 1) / N:5.1f}%          | {100 * p3:5.1f}%            | {100 * theory:5.1f}%")

    # configuraciones erróneas
    for t in range(N):
        pm = probs(circuit(1, t, with_diffuser=False))   # marcador sin difusor
        ok &= all(abs(x - 1 / N) < 1e-9 for x in pm)
        cases.append({"k": 1, "target": t, "no_diffuser": True, "probs": pm})
    pd = probs(circuit(1, 5, with_h=False))              # marcador + difusor sin superposición
    ok &= pd[5] < 1 / N
    cases.append({"k": 1, "target": 5, "no_hadamard": True, "probs": pd})

    print("\nTodo coincide con la tabla 8.4" if ok else "\nHAY DIFERENCIAS")

    if "--json" in sys.argv:
        out = os.path.join(os.path.dirname(__file__), "fixtures")
        os.makedirs(out, exist_ok=True)
        with open(os.path.join(out, "statevector_cases.json"), "w") as f:
            json.dump(cases, f, indent=1)
        print("Escrito qiskit/fixtures/statevector_cases.json")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
