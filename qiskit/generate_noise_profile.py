"""Calibra el ruido del circuito (phaseNoise) con el modelo de ruido de un backend falso de IBM.

Pasos:
  1. Ejecuta el circuito de búsqueda (k = 0..3) en Qiskit Aer con el ruido de FakeSherbrooke
     (gates, T1/T2 y lectura reales de ese procesador, precalculados en qiskit_ibm_runtime).
  2. Mide P(acierto) por k.
  3. Busca la sigma del desfase por qubit (el modelo simplificado de js/quantum.js) cuya
     curva P(acierto | k) se parezca más a la de Aer (mínimos cuadrados).
  4. Escribe qiskit/fixtures/noise_profile.json.

Uso (desde la raíz del repo):  python qiskit/generate_noise_profile.py
Requiere: qiskit, qiskit-aer, qiskit-ibm-runtime, numpy.

Aviso de honestidad: el ruido real de IBM (despolarizante, relajación, lectura) NO es solo desfase.
El juego usa un modelo de desfase calibrado para que el acierto promedio baje parecido; es una
aproximación, no una simulación del hardware.
"""
import json
import os
import sys

import numpy as np
from qiskit import transpile
from qiskit_aer import AerSimulator
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke

from validate import circuit, N, N_QUBITS

TARGET = 5
SHOTS = 8192
KS = range(4)
rng = np.random.default_rng(1234)


def aer_success(backend):
    """P(acierto) por k bajo el ruido del backend. Usa 3 qubits físicos vecinos."""
    sim = AerSimulator.from_backend(backend)
    out = []
    for k in KS:
        qc = circuit(k, TARGET)
        qc.measure_all()
        tqc = transpile(qc, backend, initial_layout=[0, 1, 2], optimization_level=1, seed_transpiler=7)
        counts = sim.run(tqc, shots=SHOTS, seed_simulator=11).result().get_counts()
        # measure_all añade un registro; la clave es 'bits' (little-endian), el sector es int(bits, 2)
        hits = sum(v for key, v in counts.items() if int(key.replace(" ", ""), 2) == TARGET)
        out.append(hits / SHOTS)
    return out


# ---- réplica en numpy del modelo de desfase de js/quantum.js ----
H1 = np.array([[1, 1], [1, -1]]) / np.sqrt(2)
H3 = np.kron(H1, np.kron(H1, H1))
BITS = np.array([[(i >> q) & 1 for q in range(N_QUBITS)] for i in range(N)])  # fila i, col q


def dephase(a, sigma):
    phi = sigma * rng.standard_normal(N_QUBITS)
    return a * np.exp(1j * BITS @ phi)


def js_model_success(k, sigma, trials=2000):
    tot = 0.0
    for _ in range(trials):
        a = np.zeros(N, complex)
        a[0] = 1
        a = dephase(H3 @ a, sigma)
        for _ in range(k):
            a[TARGET] *= -1
            a = dephase(a, sigma)
            a = dephase(2 * a.mean() - a, sigma)
        tot += abs(a[TARGET]) ** 2
    return tot / trials


def main():
    backend = FakeSherbrooke()
    aer = aer_success(backend)
    print("k | Aer (ruido IBM)")
    for k, p in zip(KS, aer):
        print(f"{k} | {100 * p:5.1f}%")

    best = None
    for sigma in np.round(np.arange(0.0, 1.01, 0.02), 2):
        curve = [js_model_success(k, sigma, trials=400) for k in KS]
        err = float(np.sum((np.array(curve) - np.array(aer)) ** 2))
        if best is None or err < best[1]:
            best = (float(sigma), err, curve)
    sigma, err, curve = best
    print(f"\nsigma ajustada = {sigma}  (error cuadrático {err:.4f})")
    print("k | Aer   | modelo JS")
    for k in KS:
        print(f"{k} | {100 * aer[k]:5.1f}% | {100 * curve[k]:5.1f}%")

    out = os.path.join(os.path.dirname(__file__), "fixtures")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "noise_profile.json"), "w") as f:
        json.dump({
            "backend": backend.name,
            "shots": SHOTS,
            "target": TARGET,
            "aer_success_by_k": aer,
            "fitted_phase_sigma": sigma,
            "model_success_by_k": curve,
            "fit_squared_error": err,
            "note": "Aproximacion: el ruido real no es solo desfase; sigma se ajusta para parecerse en acierto vs k.",
        }, f, indent=1)
    print("Escrito qiskit/fixtures/noise_profile.json")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(__file__))
    main()
