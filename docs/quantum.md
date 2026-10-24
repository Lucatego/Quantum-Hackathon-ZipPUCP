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

**σ recomendada para `Game.config.phaseNoise`: `Quantum.CALIBRATED_PHASE_NOISE = 0.46`** (reproduce el perfil a ≤ 4 puntos de acierto en todo k). Con esa σ el cuántico con k=2 baja a ~60 %, que sigue siendo mejor que el clásico (37,5 %), pero ya no llega al 94,5 % ideal. **Decisión tomada en el juego:** `Game.config.phaseNoiseScale = 0.33`, es decir σ ≈ 0,152 (un tercio de la calibración), para que se pueda jugar: con k = 2 acierta ~90 %, y con k = 1 / k = 3, ~76 % / ~32 %. Con la escala 1,0 se vería el nivel completo (k = 2 ≈ 60 %). En el pitch hay que decir las dos cosas: la curva de IBM es la de la slide y el juego usa un tercio de esa intensidad. Con el ruido completo, k = 1 y k = 2 **empatan** (~59 %); el óptimo no "baja de 2 a 1".

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

## 7. Fase 3: circuito armado con piezas y calibrador

### API (solo agrega; `runQuantum` y `runClassical` no cambian)

```js
Quantum.runCircuit({ pieces: ['H','M','D',...], target, phaseNoise, sensorFlip, phi })
  // → { amps, probs, ideal, theory, queries, misreads }
Quantum.gradient({ pieces, phi, phaseNoise })  // → { value, dphi }
Quantum.exactPhi(k)                            // → φ (rad) de la búsqueda exacta, o null
Quantum.toQiskit(piecesOrK, target, phi)       // acepta k (número) o el circuito armado
```

- **El circuito se ejecuta tal cual**, desde |000⟩ y en el orden recibido. No hay casos especiales: las configuraciones erróneas fallan porque la matemática lo dice.
- `H` superposición · `M` marcador (suma 1 a `queries`: es la consulta al sensor que paga el juego) · `D` difusor · `S` no cambia el estado y **reduce a la mitad σ** si está presente · `C` no es una compuerta (lo usa el juego para ajustar φ).
- `phi` omitido = π (Grover estándar). Con φ general: `M_φ` multiplica por e^{iφ} la amplitud del sector marcado y `D_φ = (1 − e^{iφ})|s⟩⟨s| − I`.
- `ideal` es el mismo circuito sin ruido del circuito y con sensor perfecto; `theory = ideal[target]`. Con el circuito estándar coincide con `sin²((2k+1)θ)`.

### Configuraciones erróneas (verificadas con Qiskit)

| Circuito | Acierto del sector marcado | Por qué |
|---|---|---|
| `H M` | 12,5 % | marcador sin difusor: solo cambia el signo |
| `H D` | 12,5 % | difusor sin marcador: no hay nada que amplificar |
| `H M M D` | 12,5 % | dos marcadores se cancelan |
| `M D M D` (sin H) | **14,1 %** (9/64) | no es exactamente 12,5 %: desde \|000⟩ el difusor sí mezcla amplitudes. Es una mejora mínima |
| `H M D` + `S` | 78,1 % | S no cambia el estado |
| `H (M D)×3` | 33,0 % | sobre-rotación |

Ojo con la frase "sin H no hay mejora": es casi cierta (+1,6 puntos), pero no exacta.

### Búsqueda exacta (Long, 2001) y el calibrador

`sin(π/(4J+6)) = sin β · sin(φ/2)`, con `sin β = 1/√8` y **J = k − 1**. Con esa φ el acierto es **100 % en los 8 sectores** (Qiskit `Statevector`):

| k | φ | Acierto con φ = π | Acierto con φ de Long |
|---|---|---|---|
| 1 | no existe | 78,1 % | (máximo 78,1 %) |
| 2 | 121,86° | 94,5 % | 100 % |
| 3 | 78,01° | 33,0 % | **100 %** (corrige la sobre-rotación) |
| 4 | 58,83° | 1,2 % | 100 % |

> **Corrección a `TAREAS.md`:** la fase 3 decía "2 iteraciones: φ ≈ 78°; 3 iteraciones: φ ≈ 59°". Está desfasado en uno: **78° es para k = 3 y 59° para k = 4**, porque Long cuenta J + 1 iteraciones. Se detectó con la validación contra Qiskit, no con la fórmula.

**Calibrador = descenso de gradiente con regla de desplazamiento de parámetros.** φ aparece en varias compuertas (cada `M` y cada `D`), y cada una tiene un generador con brecha 1, así que `dP/dφ = Σ_j [P(φ_j + π/2) − P(φ_j − π/2)] / 2`, desplazando una compuerta a la vez. El objetivo es el acierto medio sobre los 8 sectores, que **no depende de dónde está el enemigo**. Coincide con diferencias finitas (error ~5e-11).

**Cuidados para quien lo use en el juego (Lucas):**
- **φ = π es un punto estacionario** (la derivada vale 0 ahí, por simetría): el entrenamiento no se mueve. Hay que arrancar con un desvío, p. ej. φ₀ = π − 0,3.
- La **tasa de aprendizaje** importa: para k = 3 con paso 0,5 converge en ~8 pasos (36 % → 100 %, φ → 78,0°). Con paso 1,5 oscila entre ~76 % y ~92 %. Para k = 2 el paso 1,5 funciona.
- Con ruido (`phaseNoise > 0`) el gradiente se promedia con 40 repeticiones por sector y es ruidoso; el máximo ya no llega a 100 %.
- Cómo decirlo: "entrenar un circuito parametrizado", nunca "el juego usa IA". El 100 % es de una simulación sin ruido.

### Cómo se validó

`python qiskit/validate.py --json` escribe `statevector_cases.json` (41 casos) y `circuit_cases.json` (80 casos: configuraciones erróneas y φ de Long). `selfTest()` en Node compara los dos con `runCircuit` (error ~4e-15). Además, el código de `toQiskit(piezas, target, φ)` se ejecutó en Aer: con φ de Long da 1024 de 1024 disparos en el sector marcado para k = 2 y k = 3.
