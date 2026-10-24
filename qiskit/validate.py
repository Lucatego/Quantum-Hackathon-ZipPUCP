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


def circuit_pieces(pieces, target, phi=math.pi):
    """Circuito armado con piezas H / M / D / S (como Quantum.toQiskit(pieces) en JS).
    M y D usan la fase generalizada phi (pi = Grover estandar). C no es una compuerta."""
    qc = QuantumCircuit(N_QUBITS)
    zeros = [q for q in range(N_QUBITS) if not (target >> q) & 1]

    def phase():
        if phi == math.pi:
            qc.ccz(0, 1, 2)
        else:
            qc.mcp(phi, [0, 1], 2)

    for p in pieces:
        if p == "H":
            qc.h(range(N_QUBITS))
        elif p == "M":
            if zeros:
                qc.x(zeros)
            phase()
            if zeros:
                qc.x(zeros)
        elif p == "D":  # (1 - e^{i phi})|s><s| - I, salvo fase global
            qc.h(range(N_QUBITS))
            qc.x(range(N_QUBITS))
            phase()
            qc.x(range(N_QUBITS))
            qc.h(range(N_QUBITS))
        # S y C no cambian el estado
    return qc


def long_phi(k):
    """Fase de la busqueda exacta (Long, 2001) con k iteraciones: J = k - 1. None si no existe."""
    if k < 2:
        return None
    x = math.sin(math.pi / (4 * (k - 1) + 6)) / math.sin(THETA)
    return None if x > 1 else 2 * math.asin(x)


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

    # --- fase 3: circuitos armados, configuraciones erroneas y busqueda exacta ---
    pcases = []
    std = lambda k: ["H"] + ["M", "D"] * k
    configs = [
        (["H", "M"], math.pi),                      # marcador sin difusor: nada cambia
        (["M", "D", "M", "D"], math.pi),            # sin H: no hay superposicion
        (["H", "D"], math.pi),                      # difusor sin marcador
        (["H", "M", "D", "S"], math.pi),            # S no cambia el estado
        (["H", "M", "D", "M"], math.pi),            # configuracion a medias
        (["H", "M", "M", "D"], math.pi),            # M repetido se cancela
        (std(3), math.pi),
    ]
    for pieces, phi in configs:
        for t in range(N):
            pcases.append({"pieces": pieces, "target": t, "phi": phi, "probs": probs(circuit_pieces(pieces, t, phi))})
    print("\nBusqueda exacta (fase generalizada), acierto de Statevector en los 8 sectores:")
    print("k | phi (Long) | acierto con phi=pi | peor sector con phi (Long)")
    for k in (2, 3, 4):
        phi = long_phi(k)
        worst = 1.0
        for t in range(N):
            p = probs(circuit_pieces(std(k), t, phi))
            worst = min(worst, p[t])
            pcases.append({"pieces": std(k), "target": t, "phi": phi, "probs": p})
        base = probs(circuit_pieces(std(k), 5))[5]
        print(f"{k} | {math.degrees(phi):6.2f} deg | {100 * base:6.2f}%            | {100 * worst:7.3f}%")
        ok &= worst > 1 - 1e-9
    ok &= long_phi(1) is None  # con k = 1 no existe solucion exacta (el maximo es 78,1 %)

    print("\nTodo coincide con la tabla 8.4 y la busqueda exacta" if ok else "\nHAY DIFERENCIAS")

    if "--json" in sys.argv:
        out = os.path.join(os.path.dirname(__file__), "fixtures")
        os.makedirs(out, exist_ok=True)
        with open(os.path.join(out, "statevector_cases.json"), "w") as f:
            json.dump(cases, f, indent=1)
        print("Escrito qiskit/fixtures/statevector_cases.json")
        with open(os.path.join(out, "circuit_cases.json"), "w") as f:
            json.dump(pcases, f, indent=1)
        print("Escrito qiskit/fixtures/circuit_cases.json")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
