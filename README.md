# Collapse

Battle royale de tanques para aprender **probabilidad clásica vs. amplitudes e interferencia (Grover)** jugando. Prototipo del hackathon de computación cuántica (track EdTech, IEEE Computer Society PUCP).

**Jugar:** https://lucatego.github.io/Quantum-Hackathon-ZipPUCP/ · modo demo: `?demo` · ruta de aprendizaje: `?ruta`

## La idea

Un enemigo se esconde en la niebla, en uno de **8 sectores** alrededor de tu tanque. Disparar a ciegas acierta 1 de 8 (12,5 %). Hay dos cañones, con **el mismo sensor y la misma energía por consulta**:

- **Clásico:** cada consulta revisa un sector y lo descarta; con k consultas acierta (k+1)/8.
- **Cuántico:** un circuito de 3 qubits armado con piezas (H superposición, M marcador, D difusor). Cada par M+D es una iteración y acierta sin²((2k+1)θ).

| k | Clásico | Cuántico (sin ruido) |
|---|---|---|
| 0 | 12,5 % | 12,5 % |
| 1 | 25 % | 78,1 % |
| 2 | 37,5 % | 94,5 % |
| 3 | 50 % | 33,0 % |

Con k = 3 el cuántico **se pasa de iteraciones** y cae. El juego también muestra dos tipos de ruido: el sensor que falla en la tormenta (afecta a ambos cañones) y el desfase del circuito (solo al cuántico). La pantalla final compara lo observado con la teoría: una partida no demuestra nada.

Lo que se aprende se explica en [`docs/GUIA.md`](docs/GUIA.md).

## Cómo correrlo

HTML + JavaScript puro + Canvas 2D. **Sin build ni dependencias.** Abre `index.html` con doble clic, o sirve la carpeta:

```bash
python -m http.server 8000   # y abre http://localhost:8000/
```

Controles: `WASD` mover · `← →` o mouse apuntar · `F` / clic disparo normal · `Espacio` / clic derecho búsqueda en la niebla · `1` `2` cañón clásico / cuántico · `Q` `E` k del clásico · `R` suelta la última pieza.

## Estructura

```
index.html            carga content → quantum → ui → game
js/quantum.js         simulador de 3 qubits (vector de estado), sin DOM
js/game.js            motor del juego, bots, niebla, loot, ruta, calibrador
js/ui.js              HUD, barras de amplitud/probabilidad, guía, pantalla final
js/content.js         textos educativos, pistas y checklist de errores conceptuales
js/intro3d.js         portada 3D
qiskit/               validación contra Qiskit y calibración del ruido (no corre en el juego)
test/                 pruebas y páginas de prueba por módulo
docs/                 guía, contrato, demo, notas del módulo cuántico
pitch/                borradores del pitch y slides
video/                video explicativo con Remotion (proyecto aparte)
```

Los módulos se hablan solo por sus objetos globales (`Quantum`, `UI`, `Game`, `Content`); el contrato está en [`TAREAS.md`](TAREAS.md).

## Rigor cuántico

- El simulador del juego es **propio** (8 amplitudes complejas, little-endian como Qiskit). Qiskit **no corre dentro del juego**: se usa para validar, calibrar el ruido y exportar el cañón.
- `Quantum.selfTest()` reproduce la tabla de arriba (error ~1e-16) y compara con **Qiskit `Statevector`** en 121 casos (error ~4e-15), incluidas configuraciones erróneas.
- El ruido del circuito es un **modelo de desfase de un parámetro**, ajustado al perfil de ruido de un procesador IBM simulado (`FakeSherbrooke` en Qiskit Aer). No es una medición en hardware real. El juego usa un tercio de esa intensidad.
- El calibrador (pieza C) ajusta una fase φ con descenso de gradiente (regla de desplazamiento de parámetros). Con φ de la búsqueda exacta de Long el acierto llega a 100 % en una simulación sin ruido.
- El oráculo es una **abstracción**, y la ventaja de Grover en consultas está demostrada solo para la búsqueda no estructurada idealizada. Con 8 sectores esto es un ejemplo pedagógico, no una demostración de ventaja práctica.

Detalle y validación: [`docs/quantum.md`](docs/quantum.md).

## Pruebas

```bash
node -e "require('./js/quantum.js').selfTest()"   # simulador + fixtures de Qiskit
node test/check-contract.js                        # contrato entre módulos
node test/check-content.js                         # textos contra el checklist
node test/run-ui-tests.js                          # UI (con jsdom corre completa)
```

Qiskit (opcional, entorno con `qiskit`, `qiskit-aer`, `qiskit-ibm-runtime`):

```bash
pip install -r qiskit/requirements.txt
python qiskit/validate.py --json             # regenera los fixtures
python qiskit/generate_noise_profile.py      # calibra el ruido (~30 s)
```

`Quantum.toQiskit(...)` exporta el circuito como código ejecutable; hay una celda lista en [`qiskit/colab_demo.ipynb`](qiskit/colab_demo.ipynb).

## Trabajo en equipo

Nadie commitea directo en `main`: cada persona trabaja en su rama y abre un PR. Commits con prefijo `new:`, `change:` o `fix:`. El plan de trabajo y el estado están en [`TAREAS.md`](TAREAS.md); el brief completo, en [`INDICACIONES.md`](INDICACIONES.md).

## Estado y límites

Es un prototipo de hackathon. El juego se verifica con pruebas en Node y jsdom; la prueba en navegador real y en celular depende del equipo. No se afirma "el primer juego cuántico": el diferencial es la combinación de battle royale, comparación justa clásico/cuántico sobre el mismo problema y mecánicas que son el concepto.
