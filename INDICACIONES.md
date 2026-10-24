# Collapse: battle royale de búsqueda clásica vs. cuántica

> Brief de proyecto para iniciar el prototipo. **Versión 1.1**.
> Hackathon de computación cuántica, track **EdTech** (organizado por IEEE Computer Society PUCP).
> Base: versión 1 (battle royale con mecánicas cuánticas jugables). Incorpora de la versión 2: comparación justa, separación entre ruido de datos y ruido del circuito, lista de errores conceptuales a evitar, dos niveles de profundidad y evaluación del aprendizaje.

---

## 1. Contexto: el reto

El reto pide una herramienta, juego, app o experiencia interactiva que:

1. Tome un concepto de **Estadística o Machine Learning** (distribuciones de probabilidad, Monte Carlo, descenso de gradiente, redes neuronales, SVM, etc.).
2. Muestre su **equivalente cuántico** (QML / computación cuántica).
3. Tenga **tendencia a ser adictiva** de usar.

En esta etapa se evalúa un **prototipo funcional**. La prioridad es que la idea se entienda y se sienta bien al jugar, no una implementación completa ni pulida.

---

## 2. La idea en una frase

Un juego de tanques estilo **Diep.io** en formato **battle royale**, donde los enemigos se esconden en zonas de niebla y para acertarles hay que **buscarlos**. El cañón clásico busca como lo haría la estadística: probando sectores al azar y descartando (muestreo, probabilidad condicional). El cañón cuántico busca con **amplitudes que interfieren** (amplificación de amplitud, la idea detrás del algoritmo de Grover). Ambos tienen **el mismo presupuesto y el mismo criterio de éxito**, y el jugador descubre jugando cuándo conviene cada uno.

---

## 3. Concepto estadístico y su equivalente cuántico

Este es el corazón del proyecto y responde directamente al reto.

| | Clásico (Estadística) | Cuántico |
|---|---|---|
| Concepto | Distribución de probabilidad, muestreo aleatorio (Monte Carlo), probabilidad condicional | Amplitudes, regla de Born, interferencia, amplificación de amplitud |
| Cómo se representa la incertidumbre | Probabilidades: siempre positivas, suman 1 | Amplitudes: pueden ser negativas (o complejas); la probabilidad es su cuadrado |
| Cómo se actualiza | Al descartar un sector, la probabilidad se reparte entre los que quedan | Las compuertas rotan el estado; las amplitudes se refuerzan o se cancelan |
| Problema que resuelve en el juego | Encontrar en qué sector de la niebla está el enemigo | El mismo |
| Resultado observable | Tasa de acierto con k consultas: aprox. (k+1)/N | Tasa de acierto con k iteraciones: sin²((2k+1)θ), con sin θ = 1/√N |

**Por qué es una comparación honesta:** ambos resuelven el mismo problema (búsqueda no estructurada), usan el mismo sensor ("oráculo"), pagan el mismo costo por consulta y se miden con la misma tasa de acierto. La amplificación de amplitud tiene una ventaja real y demostrada (cuadrática) en este tipo de problema idealizado, pero el juego también muestra dónde falla: si te pasas de iteraciones, si hay ruido en el circuito o si el sensor da datos falsos.

**Puente con QML (nivel de profundización y extensión):** el circuito cuántico del cañón es un circuito parametrizado. Ajustar sus parámetros para maximizar el acierto es exactamente lo que hace el entrenamiento de un circuito variacional en QML. Ver sección 9 (fuera del MVP: "auto-calibración" con descenso de gradiente).

---

## 4. Público objetivo

- **Principal:** estudiantes de secundaria (últimos años) interesados en videojuegos, tecnología o ciencia.
- **Secundario:** universitarios de primeros ciclos que no han estudiado formalmente computación cuántica ni machine learning.
- **Conocimientos previos requeridos:** ninguno en física cuántica, programación o IA. Basta con saber jugar: moverse, apuntar, recoger cosas, decidir.

**Dos niveles de profundidad:**

- **Modo intuitivo (por defecto):** visualizaciones, lenguaje sencillo, consecuencias observables en la partida. Los términos científicos aparecen después de que el jugador vio el fenómeno ("eso que acabas de hacer se llama interferencia").
- **Modo profundización (opcional, botón "ver más"):** amplitudes con sus valores, la fórmula de la probabilidad de éxito, el circuito equivalente en Qiskit, por qué el oráculo es una abstracción.

---

## 5. Objetivos

**Objetivo de aprendizaje:** que el jugador entienda que la probabilidad cuántica funciona con reglas distintas a la clásica, y que esas reglas pueden ser útiles en ciertos problemas, no en todos.

Después de unas pocas partidas, el jugador debería poder explicar con sus palabras:

1. **Probabilidad clásica:** sin información, todos los sectores son igual de probables; al descartar uno, la probabilidad se reparte entre los demás.
2. **Amplitudes y medición:** el estado cuántico tiene amplitudes, y al medir (disparar) se obtiene un solo resultado, con probabilidad igual al cuadrado de la amplitud.
3. **Fase e interferencia:** cambiar una fase no cambia las probabilidades por sí solo, pero después de otra operación puede hacer que amplitudes se refuercen o se cancelen.
4. **Más no siempre es mejor:** demasiadas iteraciones bajan el acierto.
5. **Dos tipos de ruido:** un sensor que da datos falsos afecta a ambos cañones; el ruido del circuito afecta solo al cuántico.
6. **Pensamiento crítico:** una partida no demuestra nada; hay que mirar muchos disparos.

**Objetivo de experiencia:** que el jugador quiera jugar "una partida más".

---

## 6. Pilares de diseño (no negociables)

1. **La mecánica ES el concepto.** El jugador aprende porque la regla le sirve para ganar, no porque lee y responde un quiz. Nada de "responde estas preguntas para desbloquear el poder".
2. **Comparación justa.** Mismo problema, mismo sensor, mismo costo por consulta, mismo criterio de acierto. Nunca dar ventajas ocultas al cañón cuántico.
3. **Lo cuántico no gana por guion.** Es más potente en ciertas condiciones y frágil en otras. Debe ser posible ganar jugando solo clásico.
4. **Matemática real debajo.** Las probabilidades salen de un simulador real de vector de estado, validado contra Qiskit.
5. **Explicar después, no antes.** Tarjetas cortas tras descubrir algo y en la pantalla final, nunca interrumpiendo el combate.
6. **Partidas cortas y feedback inmediato.** Rondas de 2 a 4 minutos, reinicio instantáneo, mucho *juice*.
7. **Honestidad sobre las abstracciones.** Lo que es simplificación de juego se dice como tal en el modo profundización.

---

## 7. Qué NO debe enseñar el juego

Ningún texto, mecánica o visual debe sugerir que:

- La superposición equivale a tener una copia de cada solución y elegir la mejor automáticamente ("prueba todas las respuestas a la vez").
- Medir un qubit permite recuperar toda la información de su estado.
- Un circuito cuántico es automáticamente más rápido que cualquier algoritmo clásico.
- La interferencia siempre aumenta la probabilidad del resultado deseado.
- El ruido de los datos y la decoherencia son lo mismo.
- Un buen resultado en una simulación pequeña demuestra una ventaja cuántica general.
- Un oráculo cuántico se puede construir fácilmente a partir de cualquier sensor real (en el juego es una abstracción).
- El entrelazamiento permite comunicación instantánea (si alguna vez se usa).

Esta lista también sirve como checklist de revisión de todos los textos del juego.

---

## 8. Mecánicas

### 8.1 Estructura de la partida (battle royale)

- Mapa top-down pequeño con zonas abiertas y **zonas de niebla** (humo, arbustos).
- El jugador contra **10 a 15 bots**.
- Todos empiezan con el **cañón clásico**. Por el mapa aparece *loot* cuántico (piezas de circuito) y energía.
- La **zona segura se cierra** por fases. Gana el último en pie.
- En campo abierto se apunta y dispara normalmente. La mecánica de búsqueda entra en juego cuando el enemigo está en la niebla.

### 8.2 El problema central: encontrar al enemigo en la niebla

- Cuando un enemigo entra en la niebla cerca de ti, el radar indica que **hay alguien dentro de tu alcance**, pero no en cuál de los **8 sectores** alrededor de tu tanque.
- Disparar a ciegas acierta 1 de cada 8 veces (12,5%).
- Para mejorar, puedes gastar energía en **consultas** antes de disparar. Cada consulta usa el mismo **sensor** (el "oráculo"), que responde a la pregunta "¿hay un enemigo aquí?".
- La diferencia está en cómo cada cañón usa esas consultas.

### 8.3 Cañón clásico: muestreo y descarte

- Cada consulta revisa **un sector**. Si el enemigo está ahí, el disparo va directo. Si no, ese sector se descarta.
- Alrededor del tanque se muestran **barras de probabilidad** por sector: empiezan iguales (1/8) y, al descartar sectores, la probabilidad se reparte entre los restantes (probabilidad condicional).
- Con k consultas, la probabilidad de acertar es aproximadamente **(k+1)/8**: 1 consulta → 25%, 2 → 37,5%, 3 → 50%.
- Es robusto, predecible y barato de equipar.

### 8.4 Cañón cuántico: amplificación de amplitud

El cañón cuántico tiene un registro de **3 qubits → 8 sectores**. El jugador lo configura con **piezas de circuito** recogidas como loot:

- **Superposición (H en los 3 qubits):** reparte la amplitud por igual en los 8 sectores.
- **Marcador (oráculo):** usa una consulta al sensor e invierte la fase del sector donde está el enemigo. **Por sí solo no cambia ninguna probabilidad**, y el juego debe mostrarlo: las barras de probabilidad no se mueven, solo cambia el signo/color de una barra de amplitud.
- **Difusor:** hace que las amplitudes interfieran: la del sector marcado crece y las demás se cancelan parcialmente.
- Un par **marcador + difusor** es una **iteración**. El disparo es la **medición**: la dirección se muestrea según el cuadrado de las amplitudes.

Con 8 sectores (sin ruido):

| Iteraciones (k) | Acierto clásico con k consultas | Acierto cuántico con k iteraciones |
|---|---|---|
| 0 | 12,5% | 12,5% |
| 1 | 25% | ~78% |
| 2 | 37,5% | ~95% |
| 3 | 50% | ~33% |

La fila k = 3 es clave: **pasarse de iteraciones hace que la amplitud "dé la vuelta" y el acierto cae**. El jugador lo descubre cuando su cañón con más piezas empieza a fallar. Esto enseña que la interferencia no siempre ayuda.

**Visualización:** alrededor del tanque se muestran 8 barras de **amplitud** (pueden ser negativas, con color distinto para el signo) y, superpuesto, el cono de **probabilidad** resultante. Es fundamental que el jugador vea la diferencia entre amplitud y probabilidad.

**Errores de configuración con consecuencias reales:** un difusor sin superposición previa, o un marcador sin difusor, no mejoran nada. El simulador real lo refleja sin programar casos especiales.

### 8.5 Reglas de la comparación justa

- Ambos cañones usan **el mismo sensor** y pagan **la misma energía por consulta/iteración**.
- El acierto se mide igual para ambos: proyectil en el sector correcto.
- El cañón cuántico requiere loot y ocupa ranuras; el clásico no. Ese es su costo de acceso.
- Los números de la tabla 8.4 deben salir del simulador, no estar escritos a mano.

### 8.6 Dos tipos de ruido (separados a propósito)

**Ruido en los datos (afecta a ambos cañones):**
- Dentro de la tormenta, el **sensor falla** con cierta probabilidad: a veces dice "aquí hay alguien" cuando no, o al revés.
- El cañón clásico descarta sectores equivocados. El cuántico marca el sector equivocado y amplifica el error.
- Enseña que si los datos son malos, ningún método los salva.

**Ruido del circuito (afecta solo al cuántico):**
- Cada pieza de circuito agrega un poco de **ruido de desfase**: las fases se perturban y la interferencia funciona peor.
- Cuantas más piezas, más ruido. Es otra razón para no abusar de iteraciones.
- La intensidad se **calibra con el modelo de ruido de un procesador real de IBM** precalculado con Qiskit Aer (ver 10.2). Una mejora de "estabilidad" puede reducirlo a cambio de energía o ranuras.
- Solo a este ruido se le llama "decoherencia" en los textos del juego, y en el modo profundización se aclara que es un modelo simplificado.

### 8.7 La zona

- La zona segura se cierra por fases y obliga a moverse.
- Fuera de la zona hay daño por tiempo y el **sensor es menos fiable** (ruido en los datos).
- La zona **no** se presenta como decoherencia literal; es una mecánica de presión de supervivencia que, además, degrada los datos.

### 8.8 Bots con arquetipos

Los bots muestran la comparación frente al jugador:

- **Bot clásico:** consulta sector por sector. Constante.
- **Bot cuántico:** usa el cañón cuántico. Muy peligroso con la configuración correcta, vulnerable en la tormenta y si acumula ruido.
- **Bot "ansioso"** (opcional): usa demasiadas iteraciones y falla seguido. Ejemplo vivo de sobre-rotación.

### 8.9 Pantalla final (momento de aprendizaje)

- **Estadísticas comparativas reales de la partida:** disparos y aciertos por cañón y por número de consultas/iteraciones; aciertos perdidos por sensor ruidoso y por ruido del circuito.
- **Frecuencia observada vs. probabilidad teórica:** por ejemplo, "con 2 iteraciones acertaste 17 de 19 (89%); la teoría dice 95%". Enseña que con pocos disparos la frecuencia varía (ley de los grandes números) y que **una partida no demuestra nada**.
- **Una tarjeta corta** (2 a 4 líneas) sobre el concepto que más influyó, con "ver más".
- Botón **"Exporta tu cañón a Qiskit"**: código Qiskit del circuito exacto que usó el jugador, listo para Google Colab o IBM Quantum.
- Botón grande de **"Jugar otra vez"**.

### 8.10 Ganchos de adicción

- Rondas cortas y reinicio inmediato.
- El tanque cambia de aspecto al volverse cuántico.
- El "momento eureka" de encontrar el número óptimo de iteraciones.
- Récord personal y leaderboard local (útil para la demo en vivo).
- Opcional: "desafío del día" con mapa, loot y nivel de ruido fijos.

### 8.11 Otras mecánicas (fuera del MVP)

| Concepto clásico | Equivalente cuántico | Mecánica | Nota |
|---|---|---|---|
| Descenso de gradiente | Entrenamiento de circuito variacional (regla de desplazamiento de parámetros) | "Auto-calibración": el cañón ajusta solo los ángulos de sus piezas para maximizar el acierto, mostrando la curva de mejora | Puente directo con QML; primera extensión recomendada |
| Optimización con mínimos locales | Annealing / tunelamiento | Zona final con paisaje de energía | |
| Posición definida | Superposición + medición | Señuelo: el tanque en dos posiciones hasta ser "medido" | Es una metáfora macroscópica; si se usa, decirlo |
| Variables correlacionadas | Entrelazamiento | Modo dúo con resultados correlacionados | Sin comunicación instantánea |

---

## 9. Alcance del prototipo

### Dentro del MVP

- [ ] Arena top-down con movimiento y disparo (teclado + mouse; idealmente controles táctiles básicos).
- [ ] Zonas de niebla y radar que indica presencia sin sector.
- [ ] 10 a 15 bots con IA simple y al menos dos arquetipos (clásico y cuántico).
- [ ] Zona que se cierra por fases, con sensor menos fiable fuera de ella.
- [ ] Simulador de vector de estado de 3 qubits, validado contra Qiskit.
- [ ] Cañón clásico con consultas, descarte y barras de probabilidad.
- [ ] Cañón cuántico con piezas (superposición, marcador, difusor), barras de amplitud y probabilidad, y medición al disparar.
- [ ] Sistema de energía compartido para consultas/iteraciones.
- [ ] Ruido en los datos (sensor) y ruido del circuito (desfase por pieza), separados.
- [ ] Pantalla final con estadísticas comparativas, frecuencia vs. teoría, tarjeta explicativa y "Exporta tu cañón a Qiskit".
- [ ] Pantalla de inicio con instrucciones de 3 líneas como máximo.
- [ ] Modo profundización básico ("ver más") en las tarjetas.

### Fuera del MVP (visión a futuro en el pitch)

- Auto-calibración con descenso de gradiente (puente QML).
- Multijugador real en línea, modo dúo con entrelazamiento.
- Señuelo por superposición, zona final de tunelamiento.
- Más qubits/sectores como progresión (por ejemplo, 16 sectores con 4 qubits).
- Backend con Qiskit o ejecución en hardware real de IBM (por ejemplo, un "desafío del día" corrido en un procesador real).
- Cuentas, persistencia en servidor, tienda, skins.

---

## 10. Lineamientos técnicos

### 10.1 Generales

- **Plataforma:** web, corre en el navegador sin instalación. Debe poder abrirse desde un celular con un QR durante la demo.
- **Stack sugerido:** HTML + JavaScript (o TypeScript) con Canvas 2D. Se puede usar una librería ligera (p5.js o Phaser) si acelera el desarrollo. Sin backend para el MVP.
- **Simulador cuántico propio y pequeño:** vector de estado de 8 amplitudes complejas; compuertas como matrices unitarias; medición por muestreo según |amplitud|²; ruido de desfase como perturbación aleatoria de fases tras cada pieza. Módulo aislado y testeable (las probabilidades suman 1, H·H = identidad, la tabla 8.4 se reproduce).
- **Convención de qubits:** igual que Qiskit, **little-endian** (el qubit 0 es el bit de más a la derecha: en `'011'`, los qubits 0 y 1 valen 1).
- **Separación clara** entre motor de juego, simulador cuántico, lógica de cañones/sensor, IA de bots y UI/textos.
- **Textos educativos en un archivo aparte** (JSON o módulo de contenido), con versión intuitiva y versión de profundización para cada concepto.
- **Registro de eventos de la partida** (consultas, iteraciones, disparos, aciertos, tipo de ruido) para alimentar la pantalla final con datos reales.
- **Rendimiento:** 60 fps en un portátil normal; aceptable en celular.
- **Idioma de la interfaz:** español.
- **Estética:** minimalista y coherente (formas geométricas tipo .io, paleta propia).

### 10.2 Integración con Qiskit

**Principio:** Qiskit (Python) **no corre dentro del bucle del juego**. El juego funciona a 60 fps, offline y sin depender del wifi del evento. Qiskit se usa *alrededor* del juego:

**a) Validación del simulador (oráculo de tests).** Un script construye en Qiskit los circuitos que usa el juego (superposición, marcador para cada uno de los 8 sectores, difusor, k = 0 a 3, y configuraciones erróneas), calcula las probabilidades con `qiskit.quantum_info.Statevector` y las exporta a `qiskit/fixtures/statevector_cases.json`. Los tests de JS comparan con tolerancia pequeña (por ejemplo 1e-9).

```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

qc = QuantumCircuit(3)
qc.h([0, 1, 2])
# ... marcador + difusor ...
probs = Statevector.from_instruction(qc).probabilities_dict()
```

**b) Perfil de ruido del circuito.** Un script ejecuta los circuitos de búsqueda en Qiskit Aer con el modelo de ruido de un backend falso de IBM (módulo `fake_provider` de `qiskit_ibm_runtime`) y mide cómo baja la probabilidad de acierto según k. El resultado se exporta a `qiskit/fixtures/noise_profile.json` y el juego calibra con él la intensidad del desfase por pieza.

**c) "Exporta tu cañón a Qiskit".** En la pantalla final, el juego genera en JS (solo texto) el código Qiskit del circuito que el jugador equipó. Debe ser válido y ejecutable; agregar un test que lo verifique para algunas configuraciones.

**Opciones descartadas para el MVP:** backend Python llamado desde el juego (dependencia de red en la demo), Qiskit en el navegador vía Pyodide (sin soporte oficial conocido y carga pesada), Qiskit Machine Learning (queda para la extensión de auto-calibración).

### 10.3 Estructura de carpetas sugerida

```
collapse/
├── game/                 # Juego web (HTML + JS/TS)
│   ├── src/
│   │   ├── engine/       # Bucle de juego, render, input, colisiones
│   │   ├── quantum/      # Simulador de 3 qubits (módulo aislado)
│   │   ├── weapons/      # Cañón clásico, cañón cuántico, sensor/oráculo, energía
│   │   ├── bots/         # IA y arquetipos
│   │   ├── stats/        # Registro de eventos y métricas de la partida
│   │   ├── ui/           # HUD, pantallas, exportador a Qiskit
│   │   └── content/      # Textos educativos (JSON), intuitivo + profundización
│   ├── data/             # JSON generados por Qiskit (copiados desde qiskit/fixtures)
│   └── tests/
└── qiskit/               # Scripts de Python (no se despliegan con el juego)
    ├── requirements.txt  # qiskit, qiskit-aer, qiskit-ibm-runtime
    ├── generate_fixtures.py
    ├── generate_noise_profile.py
    └── fixtures/
```

---

## 11. Resultado esperado para la presentación

1. **Prototipo jugable** en el navegador, accesible por URL/QR.
2. **Demo en vivo de 60 a 90 segundos**: el jurado ve una partida y, si es posible, juega.
3. **Mensaje del pitch:** "aprendes probabilidad cuántica porque te sirve para ganar, no porque te la explican".
4. **Rigor:** "la física del juego está verificada contra Qiskit"; "el ruido del circuito está calibrado con un procesador real de IBM"; "con el mismo presupuesto de consultas, la búsqueda cuántica acierta más en este problema idealizado, pero el juego también te muestra cuándo pierde".
5. **Cierre:** "Exporta tu cañón a Qiskit" y, si hay tiempo, correr ese código en vivo en Colab.
6. **Evidencia de aprendizaje:** pre/post test con algunos testers (sección 12).
7. **Diapositivas:** la tabla de la sección 3, la tabla de la sección 8.4 y la visión a futuro.
8. **Originalidad, dicha con cuidado:** no afirmar que es "el primer juego cuántico". El diferencial propuesto es la combinación de battle royale + comparación justa clásico/cuántico sobre el mismo problema + mecánicas que son el concepto. Idealmente, revisar antes juegos educativos cuánticos existentes para poder contrastarlo.

---

## 12. Cómo sabremos si funciona

**Tres dimensiones:** diversión, aprendizaje y validez científica.

**Pre/post test (3 a 5 preguntas, antes y después de jugar unos minutos).** Ejemplos:
- Si cambias la fase de un sector, ¿cambia su probabilidad de inmediato?
- ¿Más iteraciones siempre mejoran el acierto?
- Si el sensor da datos falsos, ¿cuál de los dos cañones se ve afectado?
- ¿Por qué una sola partida no basta para decidir qué cañón es mejor?

**Indicadores para una primera prueba:**
- Porcentaje que entiende las reglas sin ayuda en menos de 30 segundos.
- Porcentaje que termina una partida y porcentaje que pide jugar otra.
- Diferencia de respuestas correctas entre pre y post test.
- Capacidad de nombrar una limitación de la computación cuántica.
- Reproducibilidad: el simulador coincide con Qiskit y la tabla 8.4 se reproduce.

Estos son indicadores propuestos, no resultados. Los valores objetivo se definen antes de probar.

**Criterio de decisión:** el proyecto va bien si (1) la comparación es técnicamente válida, (2) tiene consecuencias visibles en la partida y (3) los testers pueden explicar después al menos una diferencia entre probabilidad clásica y cuántica. Si algo de la parte cuántica no se puede implementar correctamente a tiempo, se reduce el alcance antes que presentar algo inventado.

---

## 13. Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|---|---|
| Divertido pero no educa | La búsqueda en la niebla depende del concepto; pantalla final con datos reales |
| Educa pero no es divertido | Partidas cortas, *juice*, nada de quizzes obligatorios, testear pronto |
| Demasiados conceptos a la vez | Una sola mecánica cuántica en el MVP (búsqueda); el resto es extensión |
| "AI slop" / se ve genérico | Simulación real, estética propia, textos revisados por el equipo |
| Errores conceptuales | Checklist de la sección 7; revisión por alguien con base en computación cuántica |
| Lo cuántico rompe el balance | Costo de acceso (loot/ranuras), ruido del circuito, sensor ruidoso en tormenta, sobre-rotación |
| El jurado cuestiona el oráculo | Aclarar en profundización que es una abstracción y que la comparación es justa porque ambos usan el mismo |
| Afirmar originalidad no demostrada | Formular el diferencial como combinación, no como "primero" |
| Falla de red durante la demo | El juego no depende de Python ni de internet |
| El simulador JS no coincide con Qiskit | Little-endian desde el inicio y tests contra fixtures |
| Alcance demasiado grande | Respetar el MVP y el orden de trabajo |

---

## 14. Orden de trabajo sugerido

1. Arena básica: tanque, movimiento, disparo, bots que se mueven y disparan.
2. Simulador cuántico de 3 qubits con tests. En paralelo: script de Qiskit que genera los fixtures.
3. Niebla + sensor + cañón clásico con barras de probabilidad.
4. Cañón cuántico con piezas, barras de amplitud/probabilidad y medición. Verificar que la tabla 8.4 se reproduce. **Probar aquí si se siente divertido antes de seguir.**
5. Energía compartida y loot de piezas.
6. Zona que se cierra + ruido en los datos del sensor.
7. Ruido del circuito (primero valores provisionales; luego calibrar con el perfil de Qiskit Aer).
8. Arquetipos de bots.
9. Registro de eventos y pantalla final (estadísticas, frecuencia vs. teoría, tarjeta, exportar a Qiskit).
10. Pulido: sonido, partículas, pantalla de inicio, controles táctiles.
11. Si sobra tiempo: auto-calibración con descenso de gradiente.

---

## 15. Indicaciones para el asistente de código

- Prioriza tener **algo jugable de punta a punta lo antes posible** y luego iterar.
- Antes de decisiones de diseño grandes que cambien la experiencia (cómo se seleccionan y ordenan las piezas, cuánta energía cuesta cada consulta, controles en móvil), **propón opciones y consulta al equipo**.
- La comparación entre cañones debe ser justa (sección 8.5). No agregues ventajas al cañón cuántico que no salgan de la simulación.
- Mantén el código simple y legible: es un prototipo de hackathon.
- Todo texto educativo debe pasar el checklist de la sección 7; si hay duda, márcalo para revisión.
- No introduzcas dependencias de Python ni llamadas a servidor en el juego. Qiskit vive solo en `qiskit/` y se comunica con el juego mediante JSON.
- Usa la convención little-endian de Qiskit en el simulador desde el primer commit.
