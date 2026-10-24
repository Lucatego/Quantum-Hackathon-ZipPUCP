/* Collapse: contenido educativo (solo datos + pickCard). Sin DOM.
 * Expone un solo global: window.Content (ver contrato en TAREAS.md).
 * Todos los textos pasan por el checklist de la sección 7 del brief: Content.checklist / Content.audit,
 * que también corre por terminal con  node test/check-content.js */
(function (root) {
  'use strict';

  var start = [
    'Un enemigo se esconde en la niebla, en uno de 8 sectores alrededor de tu tanque. A ciegas aciertas 1 de cada 8.',
    'Cañón clásico (1): cada consulta revisa un sector y lo descarta. Cañón cuántico (2): cada iteración hace interferir amplitudes.',
    'Mismo sensor y misma energía por consulta para los dos. Ajusta k con Q/E, busca con Espacio y descubre cuándo conviene cada uno.'
  ];

  var cards = {
    probClasica: {
      titulo: 'Probabilidad clásica: descartar reparte',
      intuitivo: 'Sin información, cada sector tiene 1/8 (12,5 %). Cada consulta del cañón clásico revisa un sector: si el enemigo no está, lo descarta y su probabilidad se reparte entre los que quedan. Con k consultas aciertas (k+1)/8: 25 %, 37,5 % y 50 %.',
      profundo: 'Es probabilidad condicional: si descartaste k sectores, cada uno de los que quedan tiene 1/(8 − k). Sumando "lo encontré consultando" (k/8) y "disparé al azar entre los que quedan" (1/8) sale (k+1)/8. ' +
        'Es la mejor estrategia clásica posible para este problema: sin una estructura que aprovechar, ningún método clásico supera (k+1)/8 con k consultas. ' +
        'Por eso la comparación con el cañón cuántico es justa: mismo sensor, misma energía por consulta y mismo criterio de acierto.'
    },
    amplitud: {
      titulo: 'Amplitud no es probabilidad',
      intuitivo: 'El cañón cuántico no guarda probabilidades sino amplitudes, que pueden ser negativas (por eso las barras cambian de color). La probabilidad de cada sector es su amplitud al cuadrado: +0,35 y −0,35 dan el mismo 12,5 %. Al disparar (medir) sale un solo sector.',
      profundo: 'Tras la superposición (H en los 3 qubits) los 8 sectores tienen amplitud 1/√8 ≈ 0,354. Eso no significa que el cañón pruebe los 8 sectores a la vez y elija el bueno: es un solo estado con 8 amplitudes, y medirlo da un solo sector al azar según los cuadrados (regla de Born). ' +
        'El disparo tampoco te revela las amplitudes: solo ves dónde cayó. Para estimar las probabilidades hay que repetir muchos disparos, como en la tabla de esta pantalla. ' +
        'El marcador, por sí solo, cambia un signo y no mueve ninguna probabilidad; hace falta el difusor para que ese signo importe.'
    },
    interferencia: {
      titulo: 'Interferencia: amplitudes que se suman o se cancelan',
      intuitivo: 'El marcador invierte el signo del sector que indica el sensor, sin cambiar ninguna probabilidad. Luego el difusor hace interferir las amplitudes: la del sector marcado crece y las demás se cancelan en parte. Con k = 2 la teoría da ~95 %, frente al 37,5 % del clásico con las mismas consultas.',
      profundo: 'Cada iteración (marcador + difusor) gira el estado un ángulo 2θ hacia el sector marcado, con sin θ = 1/√8 (θ ≈ 20,7°). La probabilidad de acierto es sin²((2k+1)θ): 12,5 %, 78,1 %, 94,5 % y 33,0 % para k = 0, 1, 2 y 3. Es la idea del algoritmo de Grover. ' +
        'Su ventaja frente al clásico es en número de consultas al sensor y está demostrada para la búsqueda no estructurada idealizada; no hace más rápido cualquier cálculo. ' +
        'Con 8 sectores simulados en tu navegador es un ejemplo para aprender, no una demostración de ventaja práctica. Los números salen del simulador, comparado contra Qiskit.'
    },
    sobreRotacion: {
      titulo: 'Te pasaste de vueltas',
      intuitivo: 'Más iteraciones no siempre es mejor. Con k = 3 la amplitud del sector marcado "da la vuelta" y el acierto cae del ~95 % al ~33 %. La interferencia puede ayudar o perjudicar: depende de cuántas veces la aplicas.',
      profundo: 'Cada iteración gira el estado unos 41° hacia el sector marcado. Empieza en ~21°; tras 2 iteraciones queda en ~104°, cerca de los 90° que darían 100 %; con 3 llega a ~145° y se pasa: sin²(7θ) ≈ 33 %. ' +
        'Para N sectores el número óptimo de iteraciones es cercano a (π/4)·√N; con N = 8 eso da 2. ' +
        'El simulador no tiene un caso especial para k = 3: la caída sale de la misma matemática que hace subir el acierto con k = 1 y 2.'
    },
    ruidoDatos: {
      titulo: 'Datos malos: ningún método los salva',
      intuitivo: 'En la tormenta el sensor a veces señala un sector equivocado. Les pasa igual a los dos cañones: el clásico descarta sectores que no debía y el cuántico marca el sector equivocado y lo amplifica. Si los datos son malos, ningún método los salva.',
      profundo: 'En cada consulta el sensor percibe el sector real con probabilidad 1 − p y uno equivocado al azar con probabilidad p (en la tormenta del juego, p = 25 %). ' +
        'Es ruido en los datos, no en el circuito, y no es decoherencia: afectaría igual a un computador cuántico perfecto. ' +
        'Además, en el juego el sensor es un "oráculo", una abstracción que responde "¿hay alguien aquí?". Construir un oráculo cuántico a partir de un sensor real no es fácil, y en un problema real ese costo cuenta.'
    },
    ruidoCircuito: {
      titulo: 'Ruido del circuito (decoherencia)',
      intuitivo: 'Cada pieza del circuito agrega un pequeño desfase al azar y la interferencia funciona peor: el acierto con k = 2 baja del ~95 % teórico. Afecta solo al cañón cuántico, y cuantas más piezas, más ruido. No es lo mismo que el sensor fallando en la tormenta.',
      profundo: 'Los qubits reales pierden poco a poco sus fases al interactuar con el entorno; a eso se le llama decoherencia. ' +
        'El juego lo modela de forma simplificada: después de cada pieza suma a cada qubit una fase aleatoria con distribución normal de desviación σ. Es un modelo de un solo parámetro, no una simulación completa de un procesador real. ' +
        'Fíjate en la diferencia: el ruido del sensor (datos) afecta a ambos cañones; el desfase solo afecta al cuántico, porque el clásico no usa amplitudes ni fases.'
    },
    pocasPartidas: {
      titulo: 'Una partida no demuestra nada',
      intuitivo: 'Con pocos disparos el porcentaje observado puede quedar lejos de la teoría por pura suerte. Acertar 3 de 3 con k = 1 no significa que ese cañón acierte siempre. Haz más búsquedas y mira cómo lo observado se acerca a la teoría.',
      profundo: 'Es la ley de los grandes números: la frecuencia observada se acerca a la probabilidad teórica a medida que crece el número de intentos. Con n disparos, el error típico de un porcentaje p es √(p(1 − p)/n): con p = 95 % y n = 10 son ~7 puntos; con n = 100, ~2. ' +
        'Lo mismo pasa a otra escala: que el cañón cuántico gane en esta simulación pequeña no demuestra una ventaja cuántica general. ' +
        'Para afirmar algo así hacen falta problemas más grandes, hardware real y compararse con el mejor método clásico.'
    }
  };

  // Pistas de 1 línea que Game muestra una vez por sesión (tabla "Cuándo dispara Game cada pista" en TAREAS.md).
  var hints = {
    primeraBusqueda: 'El radar sabe que hay alguien en la niebla, pero no en cuál de los 8 sectores: a ciegas aciertas 1 de 8.',
    primerCuantico: 'Barras de color = amplitud (puede ser negativa); cono = probabilidad, que es la amplitud al cuadrado.',
    aciertoCuantico: 'Eso fue interferencia: la amplitud del sector marcado creció y las demás bajaron. Un acierto solo no prueba nada.',
    sobreRotacion: 'Con k = 3 te pasaste: la amplitud "da la vuelta" y el acierto cae a ~33 %. Más iteraciones no siempre es mejor.',
    tormenta: 'En la tormenta el sensor se equivoca a veces, y eso afecta por igual a los dos cañones.',
    ruidoCircuito: 'Fallar con k = 2 pasa (~5 % sin ruido); el ruido del circuito, que solo afecta al cuántico, lo hace más frecuente.',
    kCero: 'Con k = 0 no se consulta el sensor: los dos cañones disparan a ciegas y aciertan 1 de 8.'
  };

  // Reformulamos explícitamente lo que NO hay que vender y lo que sí queremos difundir.
  var myths = [
    'No decimos que el cuántico "prueba todos los sectores a la vez" ni que la superposición elige la mejor respuesta automáticamente.',
    'No afirmamos que la interferencia siempre ayuda ni que un circuito cuántico siempre es más rápido.',
    'No ocultamos que el sensor ruidoso y el ruido del circuito importan: la ventaja real tiene condiciones y límites.'
  ];
  var truths = [
    'La comparación es justa: mismo problema, mismo sensor, misma energía y mismo criterio de acierto.',
    'El cuántico usa amplitudes con fase e interferencia para reforzar el sector correcto y cancelar los otros.',
    'La ventaja real aparece en la búsqueda no estructurada y se enseña con evidencia: funciona bien, falla bien y se mide con datos reales.'
  ];

  // Tarjeta más relevante según la partida. Prioridad fijada en TAREAS.md (fase 2); `amplitud` queda de respaldo.
  // Acepta entradas del log v1 (sin misreads/phaseNoise) y v2.
  function pickCard(log) {
    var L = Array.isArray(log) ? log.filter(Boolean) : [];
    var q = L.filter(function (e) { return e.cannon === 'quantum'; });
    if (q.some(function (e) { return e.k === 3 && !e.hit; })) return 'sobreRotacion';
    if (L.some(function (e) { return e.misreads > 0; })) return 'ruidoDatos';
    if (q.some(function (e) { return !e.hit && e.phaseNoise > 0; })) return 'ruidoCircuito';
    if (q.some(function (e) { return e.hit; })) return 'interferencia';
    if (L.length && !q.length) return 'probClasica';
    if (L.length < 10) return 'pocasPartidas';
    return 'amplitud';
  }

  // ---------- checklist de la sección 7 ----------
  // Cada regla: ideas que NINGÚN texto debe sugerir (patrones sobre texto en minúsculas y sin tildes)
  // y su antídoto: la tarjeta que enseña lo correcto y la frase que debe contener.
  // Una oración con negación explícita ("no", "ni", "nunca"...) se considera aclaración y no se marca,
  // pero audit la devuelve como `aclaracion` para que alguien la lea.
  var checklist = [
    { id: 'superposicion', regla: 'La superposición no es probar todas las respuestas a la vez y elegir la mejor.',
      patrones: [/prueb(a|an|e|en) (todas|todos|los \d|las \d)/, /(todas las|todos los) (respuestas|soluciones|opciones|posibilidades|sectores|caminos) a la vez/,
        /(\d|ocho) sectores a la vez/, /en todos (los sectores|lados) a la vez/, /copia de cada/, /en paralelo/, /elige (la mejor|el mejor|el bueno) (solo|automatic)/],
      antidoto: { card: 'amplitud', dice: /un solo estado con 8 amplitudes/ } },
    { id: 'medicion', regla: 'Medir no permite recuperar toda la información del estado.',
      patrones: [/(medir|medicion|disparo|disparar).{0,40}(toda la informacion|todas las amplitudes|revela (el|todo el) estado|ves el estado)/, /recupera(r|s)? (toda la informacion|el estado|las amplitudes)/],
      antidoto: { card: 'amplitud', dice: /(no|tampoco) te revela las amplitudes/ } },
    { id: 'rapidez', regla: 'Un circuito cuántico no es automáticamente más rápido que cualquier algoritmo clásico.',
      patrones: [/(siempre|automaticamente) (es |son )?mas rapid/, /mas rapido que cualquier/, /exponencialmente mas rapid/, /cuantico (siempre )?(gana|es mejor)/, /(siempre|automaticamente) gana/],
      antidoto: { card: 'interferencia', dice: /no hace mas rapido cualquier calculo/ } },
    { id: 'interferencia', regla: 'La interferencia no siempre aumenta la probabilidad del resultado deseado.',
      patrones: [/interferencia siempre (ayuda|aumenta|mejora|sube)/, /mas iteraciones (siempre )?(es|son) mejor/, /cuantas mas iteraciones,? mejor/,
        /(debe|deberia) (dominar|ganar|salir siempre)/, /siempre (amplifica|acierta)/],
      antidoto: { card: 'sobreRotacion', dice: /puede ayudar o perjudicar/ } },
    { id: 'ruido', regla: 'El ruido de los datos y la decoherencia no son lo mismo.',
      patrones: [/(sensor|datos|tormenta|zona).{0,40}decoheren/, /decoheren.{0,40}(sensor|datos|tormenta|zona)/],
      antidoto: { card: 'ruidoCircuito', dice: /no es lo mismo que el sensor/ } },
    { id: 'ventaja', regla: 'Un buen resultado en una simulación pequeña no demuestra una ventaja cuántica general.',
      patrones: [/(demuestra|prueba|probado|demostrado|confirma).{0,30}ventaja cuantica/, /ventaja cuantica (real|general|demostrada|probada)/, /una partida (demuestra|prueba)/],
      antidoto: { card: 'pocasPartidas', dice: /no demuestra una ventaja cuantica general/ } },
    { id: 'oraculo', regla: 'Un oráculo cuántico no se construye fácilmente a partir de cualquier sensor real (en el juego es una abstracción).',
      patrones: [/(cualquier|un|el) sensor real.{0,40}(oraculo|cuantic)/, /oraculo.{0,30}(facil|sencill|directamente|cualquier sensor)/],
      antidoto: { card: 'ruidoDatos', dice: /una abstraccion/ } },
    { id: 'entrelazamiento', regla: 'El entrelazamiento no permite comunicación instantánea.',
      patrones: [/entrelaza.{0,60}(instantane|comunica|mensaje|mas rapido que la luz)/],
      antidoto: null } // el juego no usa entrelazamiento: basta con que ningún texto lo sugiera
  ];

  var NEGACION = /(^|[^a-z])(no|ni|nunca|jamas|tampoco|mito|falso)([^a-z]|$)/;

  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // audit(textos) → [{ texto, oracion, regla, aclaracion }]. `textos`: string, arreglo o { etiqueta: texto }.
  function audit(textos) {
    var items = typeof textos === 'string' ? { texto: textos } : textos || {};
    var out = [];
    Object.keys(items).forEach(function (etq) {
      norm(items[etq]).split(/[.!?;]+\s+|\n+/).forEach(function (oracion) {
        checklist.forEach(function (r) {
          if (!r.patrones.some(function (p) { return p.test(oracion); })) return;
          out.push({ texto: etq, oracion: oracion.trim(), regla: r.id, aclaracion: NEGACION.test(oracion) });
        });
      });
    });
    return out;
  }

  // Todos los textos de este módulo, con etiqueta, para auditarlos juntos.
  function textos() {
    var t = {};
    start.forEach(function (s, i) { t['start[' + i + ']'] = s; });
    Object.keys(cards).forEach(function (k) {
      ['titulo', 'intuitivo', 'profundo'].forEach(function (f) { t['cards.' + k + '.' + f] = cards[k][f]; });
    });
    Object.keys(hints).forEach(function (k) { t['hints.' + k] = hints[k]; });
    myths.forEach(function (s, i) { t['myths[' + i + ']'] = s; });
    truths.forEach(function (s, i) { t['truths[' + i + ']'] = s; });
    return t;
  }

  root.Content = {
    start: start,
    cards: cards,
    hints: hints,
    myths: myths,
    truths: truths,
    pickCard: pickCard,
    checklist: checklist,
    audit: audit,
    textos: textos,
    norm: norm
  };
})(typeof window !== 'undefined' ? window : this);
