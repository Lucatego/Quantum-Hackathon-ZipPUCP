# Módulo cuántico: cómo funciona y cómo se valida

Archivos: [`js/quantum.js`](../js/quantum.js) (el que usa el juego), [`qiskit/`](../qiskit) (solo validación y calibración, nunca corre dentro del juego).

## 1. Qué es y qué no es

- 3 qubits → 8 amplitudes complejas → 8 sectores alrededor del tanque.
- Es un **simulador de vector de estado propio**, pequeño y legible. No usa Qiskit en ejecución: el juego corre offline y a 60 fps.
- Qiskit se usa **alrededor** del juego para tres cosas: validar, calibrar el ruido y exportar el cañón del jugador.
- El oráculo es una **abstracción**: el juego "sabe" dónde está el enemigo y marca ese sector. En un problema real, construir ese oráculo es el costo difícil. Se dice así en el modo "ver más".

## 2. Modelo

Convención **little-endian** como Qiskit: el sector `i` tiene bits `(q2 q1 q0) = i` en binario. En `'101'` (sector 5) valen 1 los qubits 0 y 2.

| Pieza | Qué hace | En el código |
|---|---|---|
| Superposición (H⊗3) | Reparte la amplitud por igual: 1/√8 en cada sector | `hadamard` |
| Marcador (oráculo) | Invierte el signo de la amplitud del sector marcado. **No cambia ninguna probabilidad por sí solo** | `oracle` |
| Difusor | `2\|s⟩⟨s\| − I`: refleja cada amplitud respecto a la media. Es la interferencia | `diffuser` |
| Medición | Se muestrea un sector con probabilidad `\|amplitud\|²` | `sample` |

Una **iteración** = marcador + difusor. Con `sin θ = 1/√8`:

```
P(acierto cuántico, k iteraciones) = sin²((2k+1)θ)
P(acierto clásico, k consultas)    = (k+1)/8
```

| k | Clásico | Cuántico |
|---|---|---|
| 0 | 12,5 % | 12,5 % |
| 1 | 25 % | 78,1 % |
| 2 | 37,5 % | 94,5 % |
| 3 | 50 % | 33,0 % |

En k = 3 el acierto cae: la amplitud "dio la vuelta" (sobre-rotación). Más iteraciones no siempre es mejor.

## 3. Los dos ruidos (separados a propósito)

| | Ruido de **datos** (`sensorFlip`) | Ruido del **circuito** (`phaseNoise`) |
|---|---|---|
| A quién afecta | Cuántico y clásico | Solo cuántico |
| Qué modela | El sensor falla: con probabilidad `sensorFlip` percibe un sector equivocado | Perturbaciones de fase: cada qubit gana una fase aleatoria N(0, σ) tras cada pieza |
| Efecto | Clásico: descarta sectores equivocados. Cuántico: marca el sector equivocado y lo amplifica | La interferencia funciona peor; más piezas, más ruido |
| Nombre en los textos | "datos falsos" / "sensor ruidoso" | Solo aquí se habla de "decoherencia" (modelo simplificado) |

El sensor se consulta **una vez por consulta (clásico) o una vez por iteración (cuántico)**, así que cuesta lo mismo en ambos.

### Calibración con IBM

`Quantum.CALIBRATED_PHASE_NOISE = 0.46` sale de `qiskit/generate_noise_profile.py`:

1. Ejecuta el circuito de búsqueda (k = 0..3) en Qiskit Aer con el modelo de ruido de `FakeSherbrooke` (procesador de IBM, precalculado en `qiskit_ibm_runtime`).
2. Busca la σ del desfase cuya curva acierto-vs-k se parezca más (mínimos cuadrados).

| k | Aer con ruido IBM | Modelo JS (σ = 0,46) |
|---|---|---|
| 0 | 13,1 % | 12,5 % |
| 1 | 59,4 % | ~59 % |
| 2 | 58,6 % | ~60 % |
| 3 | 22,3 % | ~26 % |

**Límites que hay que decir si preguntan:** el ruido real no es solo desfase (hay despolarización, relajación y errores de lectura), y el circuito transpilado al chip tiene más compuertas que "2 piezas por iteración". La σ es un número ajustado para que el acierto baje parecido, no una simulación del hardware. Es un nivel "completo": el juego puede usar una fracción (por ejemplo `0.5 * CALIBRATED_PHASE_NOISE`).

**Frase para el pitch (tal cual):** *"el desfase es un modelo de un solo parámetro, ajustado al perfil de ruido de un procesador IBM simulado"*. No decir "ruido real de IBM".

**σ recomendada para `Game.config.phaseNoise`: `Quantum.CALIBRATED_PHASE_NOISE = 0.46`** (reproduce el perfil a ≤ 4 puntos de acierto en todo k). Con esa σ el cuántico con k=2 baja a ~60 %, que sigue siendo mejor que el clásico (37,5 %), pero ya no llega al 94,5 % ideal. Si se quiere que k=2 todavía impresione, usar una fracción (p. ej. 0,15 ≈ 90 % en k=2).

### Resultado: `misreads`

`runQuantum` y `runClassical` devuelven `misreads`: cuántas consultas percibieron un sector equivocado por culpa del sensor (`sensorFlip`). Es 0 con sensor perfecto. En el cuántico cada iteración consulta una vez, así que va de 0 a k. En el clásico se cuentan las consultas hechas hasta que la búsqueda se detiene. Sirve para la pantalla final: "aciertos perdidos por el sensor".

## 4. Cómo se valida

Todo se corre desde la raíz del repo.

```bash
# 1) Autotest del simulador JS (en Node también compara con los fixtures de Qiskit)
node -e "require('./js/quantum.js').selfTest()"

# 2) Navegador: abrir test/quantum.html (el autotest sin la comparación con fixtures)

# 3) Qiskit: reconstruye los circuitos y escribe los fixtures
python qiskit/validate.py --json

# 4) Calibración del ruido (tarda ~30 s)
python qiskit/generate_noise_profile.py
```

El entorno usado aquí es `qhub-env` (conda): `qiskit 2.4.1`, `qiskit-aer 0.17.2`, `qiskit-ibm-runtime 0.51.0`. Ver [`qiskit/requirements.txt`](../qiskit/requirements.txt).

`selfTest()` comprueba: tabla 8.4 para los 8 sectores (1e-9), Σp = 1, H·H = I, marcador sin difusor no cambia probabilidades, difusor sin superposición no mejora el acierto, el clásico ≈ (k+1)/8 por Monte Carlo, que el ruido degrada el acierto, y la coincidencia con los 41 casos de `statevector_cases.json`.

## 5. Exportar el cañón

`Quantum.toQiskit(k, target = 5)` devuelve texto Python ejecutable (Colab o IBM Quantum). Se probó con `AerSimulator`: con k = 2 acierta ~94 %, con k = 3 ~33 %.

## 6. Qué NO afirmamos

(Checklist de la sección 7 del brief.)

- La superposición no es "probar todas las respuestas a la vez". Es un estado con amplitudes que luego interfieren.
- Medir da **un** sector, no toda la información del estado.
- La ventaja cuadrática es para este problema idealizado de búsqueda sin estructura, con un oráculo dado. No es "el cuántico siempre es más rápido".
- Una simulación de 3 qubits no demuestra ventaja cuántica general.
- El ruido de datos y la decoherencia no son lo mismo.
