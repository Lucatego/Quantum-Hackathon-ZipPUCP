# Collapse: battle royale de probabilidad clásica vs. cuántica

> Brief de proyecto para iniciar el prototipo. Nombre tentativo: **Collapse**.
> Hackathon de computación cuántica, track **EdTech** (organizado por IEEE Computer Society PUCP).

---

## 1. Contexto: el reto

El reto pide una herramienta, juego, app o experiencia interactiva que:

1. Tome un concepto de **Estadística o Machine Learning** (distribuciones de probabilidad, Monte Carlo, descenso de gradiente, redes neuronales, SVM, etc.).
2. Muestre su **equivalente cuántico** (QML / computación cuántica).
3. Tenga **tendencia a ser adictiva** de usar.

En esta etapa se evalúa un **prototipo funcional**. La prioridad es que la idea se entienda y se sienta bien al jugar, no una implementación completa ni pulida.

---

## 2. La idea en una frase

Un juego de tanques estilo **Diep.io** en formato **battle royale**, donde cada jugador empieza con armas basadas en **probabilidad clásica** y recoge *loot* cuántico para mejorarlas. Mientras juega, descubre en la práctica la diferencia entre **sumar probabilidades** (clásico) y **sumar amplitudes que pueden cancelarse** (cuántico).

La zona del battle royale que se cierra representa el **ruido/decoherencia**: lo cuántico es potente pero frágil, y el entorno lo destruye.

---

## 3. Público objetivo

- Estudiantes de **secundaria (últimos años)** y **universitarios de primeros ciclos**.
- Saben poco o nada de computación cuántica. Pueden conocer nociones básicas de probabilidad (media, varianza, "campana").
- Están acostumbrados a juegos web/móviles rápidos (.io, battle royale). Se aburren rápido con texto largo.

Implicancias:
- Cero requisitos previos de física o álgebra lineal para poder jugar.
- Explicaciones en lenguaje sencillo, de pocas líneas, con la matemática real disponible como "ver más" para quien quiera profundizar.
- Debe correr en el navegador, también en celular, sin instalar nada.

---

## 4. Objetivos

**Objetivo principal:** que el jugador entienda intuitivamente **qué hace diferente a la probabilidad cuántica** jugando, no leyendo.

Al terminar unas pocas partidas, el jugador debería poder explicar con sus palabras:

1. **Superposición y medición:** un estado cuántico puede "estar en varias opciones a la vez" con ciertas amplitudes, y al medirlo colapsa a una sola, con probabilidad igual al cuadrado de la amplitud (regla de Born).
2. **Interferencia:** las amplitudes pueden reforzarse o cancelarse. Eso permite concentrar la probabilidad en el resultado deseado, algo que la probabilidad clásica no puede hacer.
3. **Decoherencia/ruido:** el entorno destruye los efectos cuánticos; por eso lo cuántico no es "magia" ni siempre mejor.
4. (Secundario) **Comparación con conceptos clásicos:** distribución gaussiana vs. amplitudes, muestreo Monte Carlo vs. amplificación de amplitud, descenso de gradiente vs. tunelamiento.

**Objetivo de experiencia:** que el jugador quiera jugar "una partida más".

---

## 5. Pilares de diseño (no negociables)

1. **La mecánica ES el concepto.** El jugador aprende porque la regla cuántica le sirve para ganar, no porque lee y responde un quiz. Nada de "responde estas preguntas para desbloquear el poder" (evitar el *chocolate-covered broccoli*).
2. **Lo cuántico no es simplemente "mejor".** Es diferente: más potente en ciertas situaciones, pero frágil. Debe ser posible ganar jugando solo clásico.
3. **Matemática real debajo.** Las probabilidades del juego deben salir de un simulador real de vector de estado (números complejos, compuertas unitarias), no de números inventados. Esto da credibilidad frente al jurado.
4. **Explicar después, no antes.** Las explicaciones aparecen como tarjetas cortas *después* de que el jugador descubrió algo, o en la pantalla final, nunca interrumpiendo el combate.
5. **Partidas cortas y feedback inmediato.** Rondas de 2 a 4 minutos, reinicio instantáneo, mucho *juice* (partículas, sonido, números flotantes).
6. **Rigor científico.** Prohibido decir cosas como "la computadora cuántica prueba todas las respuestas a la vez" o "lo cuántico siempre es más rápido". El entrelazamiento no permite comunicación instantánea.

---

## 6. Mecánicas

### 6.1 Estructura de la partida (battle royale)

- Mapa top-down pequeño. El jugador contra **10 a 15 bots**.
- Todos empiezan como **tanque clásico**.
- Por el mapa aparece *loot* cuántico (qubits, compuertas) que se recoge pasando encima.
- La **zona segura se cierra** por fases. Gana el último en pie.

### 6.2 Mapeo clásico → cuántico → mecánica

| Concepto clásico | Equivalente cuántico | Mecánica en el juego | Prioridad |
|---|---|---|---|
| Distribución gaussiana (μ, σ) | Amplitudes + interferencia | **Puntería** (ver 6.3) | MVP |
| Posición definida | Superposición + medición (regla de Born) | **Señuelo**: el tanque existe en dos posiciones con cierta amplitud; al recibir un impacto o disparar, colapsa a una | MVP |
| Ruido aleatorio | Decoherencia | **La zona**: fuera de ella, o cuando se cierra, los estados cuánticos pierden coherencia (ver 6.5) | MVP |
| Muestreo Monte Carlo | Amplificación de amplitud (tipo Grover) | **Radar de loot**: el clásico revela casillas al azar; el cuántico amplifica la casilla correcta en menos pasos | Opcional |
| Descenso de gradiente | Annealing / tunelamiento | **Zona final**: paisaje de energía con mínimos locales; el optimizador clásico se atasca, el cuántico puede "atravesar" barreras | Opcional |
| Variables correlacionadas | Entrelazamiento | **Modo dúo**: medir tu tanque fija el resultado del compañero (correlación, sin comunicación) | Fuera del MVP |

### 6.3 Mecánica estrella: la puntería

Es la mecánica más importante del prototipo; si solo se implementa una cosa bien, que sea esta.

- **Cañón clásico:** el disparo sale en la dirección apuntada con una dispersión gaussiana. Los upgrades clásicos reducen σ (más precisión) o cambian el número de proyectiles. Muestra visualmente la "campana" como un cono alrededor del cañón.
- **Cañón cuántico:** el cañón tiene un registro de **3 qubits → 8 direcciones posibles** alrededor del tanque. El jugador equipa compuertas recogidas como loot (H, X, Z, fase, etc.) en ranuras. El estado resultante define una distribución de probabilidad sobre las 8 direcciones, que se dibuja alrededor del tanque (largo/brillo de cada rayo = probabilidad).
  - Al disparar se **mide**: la dirección se muestrea según |amplitud|².
  - Con la secuencia correcta de compuertas (por ejemplo, una iteración tipo Grover con un "oráculo" que marca la dirección del enemigo más cercano), las amplitudes **interfieren** y la probabilidad se concentra en la dirección buena, mucho más que lo que puede lograr una distribución clásica.
  - El jugador lo descubre experimentando: "puse estas compuertas y ahora casi siempre acierto".
- La visualización de la distribución sobre las 8 direcciones es clave: el jugador debe **ver** cómo cambia la probabilidad al agregar o quitar compuertas.

Los detalles exactos (qué compuertas existen, cómo se elige el oráculo, cuántas ranuras) se pueden ajustar durante el desarrollo para que se sienta bien.

### 6.4 Balance clásico vs. cuántico

| | Clásico | Cuántico |
|---|---|---|
| Fortaleza | Robusto, predecible, no le afecta el ruido | Puede concentrar probabilidad por interferencia; trucos imposibles en clásico (señuelo) |
| Debilidad | Techo de precisión limitado | Frágil: decoherencia, la medición destruye el estado, requiere loot y configuración |
| Fantasía | "El veterano confiable" | "El cañón de cristal" |

Regla: debe existir una forma viable de ganar como clásico, sobre todo en la zona final donde el ruido es mayor.

### 6.5 Decoherencia (la zona)

- Fuera de la zona segura, y con más intensidad a medida que se cierra, se aplica **ruido de desfase** al estado cuántico del jugador: las fases se aleatorizan y la interferencia deja de funcionar.
- Visualmente, la distribución de puntería se va "aplanando" hacia uniforme (todas las direcciones igual de probables) y el señuelo puede colapsar solo.
- La intensidad del ruido se **calibra con el modelo de ruido de un procesador real de IBM**, precalculado con Qiskit Aer (ver 8.2). Mensaje para el pitch: "la tormenta del mapa usa el ruido de un procesador cuántico real".
- Esto enseña sin texto que lo cuántico necesita aislamiento del entorno.

### 6.6 Bots con arquetipos

Los bots no solo sirven de enemigos: **muestran la comparación**.

- **Bot clásico:** solo mejora precisión clásica. Consistente.
- **Bot cuántico:** va full cuántico. Muy peligroso a mitad de partida, vulnerable al final por decoherencia.
- **Bot mixto** (opcional).

Así el jugador ve la comparación ocurrir frente a él.

### 6.7 Pantalla final (momento de aprendizaje)

Al terminar cada partida:

- **Estadísticas comparativas**, por ejemplo: "Disparos clásicos: 34% de acierto. Disparos con interferencia: 68%. Estados perdidos por decoherencia: 2."
- **Una tarjeta corta** (2 a 4 líneas) que explica el concepto que más influyó en esa partida, con un "ver más" opcional con la matemática real.
- Botón **"Exporta tu cañón a Qiskit"**: muestra el código Python/Qiskit equivalente al circuito que el jugador armó en esa partida, listo para copiar en Google Colab o IBM Quantum (ver 8.2).
- Botón grande de **"Jugar otra vez"**.

### 6.8 Ganchos de adicción

- Rondas cortas y reinicio inmediato.
- Progresión visible dentro de la partida (el tanque cambia de aspecto al volverse cuántico).
- Récord personal y leaderboard local simple (útil para la demo en vivo frente al jurado).
- Opcional: "desafío del día" con una configuración fija de mapa/loot.

---

## 7. Alcance del prototipo

### Dentro del MVP

- [ ] Arena top-down con movimiento y disparo (teclado + mouse; idealmente controles táctiles básicos).
- [ ] 10 a 15 bots con IA simple y al menos dos arquetipos (clásico y cuántico).
- [ ] Zona que se cierra por fases.
- [ ] Simulador de vector de estado de hasta 3 qubits.
- [ ] Puntería clásica (gaussiana) y cuántica (8 direcciones + compuertas + medición), con visualización de la distribución.
- [ ] Loot de compuertas en el mapa y ranuras para equiparlas.
- [ ] Señuelo por superposición.
- [ ] Decoherencia ligada a la zona.
- [ ] Pantalla final con estadísticas y tarjeta explicativa.
- [ ] Pantalla de inicio con instrucciones de 3 líneas como máximo.
- [ ] Tests del simulador JS verificados contra Qiskit.
- [ ] Datos de ruido para la zona precalculados con Qiskit Aer.
- [ ] "Exporta tu cañón a Qiskit" en la pantalla final.

### Fuera del MVP (mencionar como visión a futuro en el pitch)

- Multijugador real en línea.
- Modo dúo con entrelazamiento.
- Radar Monte Carlo vs. amplificación de amplitud, y zona final de tunelamiento (si sobra tiempo, son los siguientes en la lista).
- Cuentas de usuario, persistencia en servidor, tienda, skins.
- Backend con Qiskit llamado desde el juego (por ejemplo, un "desafío del día" cuyo resultado se corrió en hardware real de IBM).
- Un bot entrenado con Qiskit Machine Learning (clasificador cuántico variacional).

---

## 8. Lineamientos técnicos

### 8.1 Generales

- **Plataforma:** web, corre en el navegador sin instalación. Debe poder abrirse desde un celular con un QR durante la demo.
- **Stack sugerido:** HTML + JavaScript (o TypeScript) con Canvas 2D. Se puede usar una librería ligera (p5.js o Phaser) si acelera el desarrollo. Sin backend para el MVP.
- **Simulador cuántico propio y pequeño:** vector de estado de 2³ = 8 amplitudes complejas; compuertas como matrices unitarias aplicadas a un qubit o par de qubits; medición por muestreo según |amplitud|²; ruido de desfase como perturbación aleatoria de fases. Debe estar en un módulo separado y testeable (por ejemplo, verificar que las probabilidades siempre suman 1 y que H·H = identidad).
- **Convención de qubits:** el simulador JS debe usar la misma convención que Qiskit, **little-endian** (el qubit 0 es el bit de más a la derecha: en `'011'`, los qubits 0 y 1 valen 1). Si no coinciden, los tests contra Qiskit fallarán y el código exportado no reproducirá lo que pasó en el juego.
- **Separación clara** entre motor de juego, simulador cuántico, IA de bots y UI/textos educativos.
- **Textos educativos en un archivo aparte** (por ejemplo, JSON o un módulo de contenido) para poder revisarlos y corregirlos sin tocar la lógica.
- **Rendimiento:** debe correr fluido (60 fps) en un portátil normal y aceptable en celular.
- **Idioma de la interfaz:** español.
- **Estética:** minimalista y coherente (formas geométricas tipo .io, paleta propia). Evitar recursos genéricos que se vean hechos por IA sin criterio.

### 8.2 Integración con Qiskit

**Principio:** Qiskit (Python) **no corre dentro del bucle del juego**. El juego debe funcionar a 60 fps, offline y sin depender del wifi del evento. Qiskit se usa *alrededor* del juego, en tres frentes:

**a) Validación del simulador (oráculo de tests).**
Un script de Python define los circuitos de referencia que usa el juego (combinaciones de compuertas de la puntería, casos borde), calcula las probabilidades con `qiskit.quantum_info.Statevector` y las exporta a `qiskit/fixtures/statevector_cases.json`. Los tests de JS cargan ese JSON y comparan con el simulador propio (tolerancia numérica pequeña, por ejemplo 1e-9).

```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

qc = QuantumCircuit(3)
qc.h([0, 1, 2])
qc.z(2)
probs = Statevector.from_instruction(qc).probabilities_dict()
```

Mensaje para el pitch: "la física del juego está verificada contra Qiskit".

**b) Ruido realista para la zona.**
Un script usa Qiskit Aer con el modelo de ruido de un backend falso de IBM (módulo `fake_provider` de `qiskit_ibm_runtime`) para medir cuánto se degradan las distribuciones de puntería bajo ruido real. El resultado (por ejemplo, tasa de pérdida de coherencia por nivel de zona) se exporta a `qiskit/fixtures/noise_profile.json` y el juego lo usa para calibrar la decoherencia. Se precalcula una vez; el juego no llama a Python.

**c) "Exporta tu cañón a Qiskit".**
En la pantalla final, el juego genera en JavaScript (solo texto, sin Python) el código Qiskit equivalente al circuito que el jugador equipó:

```python
# Tu cañón cuántico de esta partida
from qiskit import QuantumCircuit
qc = QuantumCircuit(3)
qc.h(0); qc.h(1); qc.h(2)
qc.cz(0, 2)
qc.measure_all()
```

Con botón de copiar y un enlace sugerido a Google Colab o IBM Quantum. Es el puente entre "jugué" y "programé computación cuántica", y apoya la parte de **democratización** del reto. El código generado debe ser válido y ejecutable; agregar un test que lo verifique para algunos circuitos de ejemplo.

**Opciones descartadas para el MVP:**
- *Backend Python (FastAPI + Aer) llamado desde el juego:* agrega servidor, despliegue y dependencia de red en la demo. Si alguna vez se usa, solo al equipar compuertas, nunca en cada disparo.
- *Qiskit en el navegador vía Pyodide:* no hay soporte oficial conocido (Qiskit depende de extensiones compiladas en Rust) y la carga sería pesada. No arriesgarlo sin una prueba previa.
- *Qiskit Machine Learning:* interesante para un bot con clasificador cuántico variacional, pero complejo y poco visible en la experiencia. Queda como visión a futuro.

### 8.3 Estructura de carpetas sugerida

```
collapse/
├── game/                 # Juego web (HTML + JS/TS)
│   ├── src/
│   │   ├── engine/       # Bucle de juego, render, input, colisiones
│   │   ├── quantum/      # Simulador de 3 qubits (módulo aislado)
│   │   ├── bots/         # IA y arquetipos
│   │   ├── ui/           # HUD, pantallas, exportador a Qiskit
│   │   └── content/      # Textos educativos (JSON)
│   ├── data/             # JSON generados por Qiskit (copiados desde qiskit/fixtures)
│   └── tests/
└── qiskit/               # Scripts de Python (no se despliegan con el juego)
    ├── requirements.txt  # qiskit, qiskit-aer, qiskit-ibm-runtime
    ├── generate_fixtures.py
    ├── generate_noise_profile.py
    └── fixtures/
```

Esto permite trabajar en paralelo: una persona con perfil Python/cuántica en `qiskit/` y el resto en `game/`.

---

## 9. Resultado esperado para la presentación

1. **Prototipo jugable** en el navegador, accesible por URL/QR.
2. **Demo en vivo de unos 60 a 90 segundos**: el jurado ve una partida y, si es posible, juega.
3. **Mensaje del pitch:** "aprendes probabilidad cuántica porque te sirve para ganar, no porque te la explican".
4. **Credibilidad técnica:** "la física del juego está verificada contra Qiskit" y "la tormenta usa el ruido de un procesador cuántico real de IBM".
5. **Cierre de la demo:** mostrar "Exporta tu cañón a Qiskit" y, si hay tiempo, correr ese código en vivo en Colab.
6. **Evidencia de aprendizaje (opcional pero valiosa):** mini encuesta de 3 preguntas antes y después de jugar con algunos testers, para mostrar una mejora medida.
7. Diapositiva con el mapeo clásico → cuántico → mecánica (tabla de la sección 6.2) y la visión a futuro.

---

## 10. Criterios de éxito

- Un jugador nuevo entiende cómo jugar en menos de 30 segundos.
- Después de 2 o 3 partidas, puede explicar con sus palabras qué es la interferencia o por qué el estado "colapsa".
- Los jugadores piden jugar otra vez sin que se les pida.
- Ninguna explicación del juego contiene errores conceptuales sobre computación cuántica.
- La matemática del simulador es correcta y verificable.

---

## 11. Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|---|---|
| Divertido pero no educa | Las mecánicas deben depender del concepto; pantalla final con estadísticas y tarjeta |
| Educa pero no es divertido | Partidas cortas, *juice*, nada de quizzes obligatorios, testear con gente pronto |
| "AI slop" / se ve genérico | Simulación real, estética propia y consistente, textos revisados por el equipo |
| Errores conceptuales | Revisión de cada texto educativo; evitar metáforas engañosas (ver pilar 6) |
| Alcance demasiado grande | Respetar el MVP; la puntería cuántica primero, lo demás después |
| Lo cuántico rompe el balance | Decoherencia y costo de loot; asegurar que un clásico pueda ganar |
| Falla de red o servidor durante la demo | El juego no depende de Python ni de internet; todo lo de Qiskit se precalcula |
| El simulador JS no coincide con Qiskit | Convención little-endian desde el inicio y tests contra fixtures de Qiskit |

---

## 12. Orden de trabajo sugerido

1. Arena básica: tanque del jugador, movimiento, disparo clásico, bots que se mueven y disparan.
2. Simulador cuántico de 3 qubits con tests. En paralelo: script de Qiskit que genera los fixtures de validación.
3. Puntería cuántica con visualización de la distribución y loot de compuertas. **Probar aquí si se siente divertido antes de seguir.**
4. Zona que se cierra + decoherencia (primero con valores provisionales; luego calibrar con el perfil de ruido de Qiskit Aer).
5. Señuelo por superposición.
6. Arquetipos de bots.
7. Pantalla final con estadísticas, tarjetas educativas y "Exporta tu cañón a Qiskit".
8. Pulido: sonido, partículas, pantalla de inicio, controles táctiles.
9. Si sobra tiempo: radar Monte Carlo vs. amplificación, zona final de tunelamiento.

---

## 13. Indicaciones para el asistente de código

- Prioriza tener **algo jugable de punta a punta lo antes posible** y luego iterar.
- Antes de decisiones de diseño grandes que cambien la experiencia (por ejemplo, cómo se elige el oráculo de la puntería, cuántas ranuras de compuertas hay, cómo se controla en móvil), **propón opciones y consulta al equipo**.
- Mantén el código simple y legible: es un prototipo de hackathon que el equipo debe entender y modificar rápido.
- Cualquier texto que explique un concepto cuántico debe ser correcto; si hay duda, marcarlo para revisión del equipo.
- No introduzcas dependencias de Python ni llamadas a servidor en el juego. Qiskit vive solo en la carpeta `qiskit/` y se comunica con el juego mediante archivos JSON.
- Usa la convención little-endian de Qiskit en el simulador desde el primer commit.
