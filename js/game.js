// Collapse: motor de juego (Lucas).
// Solo habla con los demás módulos a través de window.Quantum, window.UI y window.Content (contrato en TAREAS.md).
(function () {
  'use strict';

  const SECTORS = 8;
  const SECTOR_ANGLE = (Math.PI * 2) / SECTORS;
  const RECORD_KEY = 'collapse.record';
  const COLLECTION_KEY = 'collapse.coleccion';

  // Colección de conceptos: cada logro es un objetivo de aprendizaje (sección 5 del brief).
  // Nombre de respaldo; Content.achievements[id].titulo lo reemplaza.
  const ACHIEVEMENTS = {
    probCondicional: 'Probabilidad condicional',
    amplitudNegativa: 'Amplitud negativa',
    marcadorSolo: 'El marcador solo no basta',
    interferencia: 'Interferencia',
    sobreRotacion: 'Sobre-rotación',
    tormentaEngana: 'La tormenta engaña a los dos',
    decoherencia: 'Decoherencia',
    grandesNumeros: 'Ley de los grandes números',
    calibracion: 'Calibración',
  };

  const config = {
    world: { w: 3200, h: 2200 },
    bots: 10,
    playerSpeed: 230,
    botSpeed: 110,
    bulletSpeed: 620,
    bulletDamage: 12,
    bulletHeal: 8,         // vida que recupera quien dispara una bala 0 al impactar
    searchDamage: 60,
    botBulletDamage: 6,
    fireCooldown: 0.25,
    aimTurnSpeed: 3.2,     // rad/s al girar el cañón con ← →
    lookAheadMax: 320,     // cuánto puede adelantarse la cámara con ↑ (píxeles)
    lookAheadSpeed: 600,   // píxeles por segundo al adelantar o recoger la vista
    botFireCooldown: 1.1,
    radarRange: 380,
    botSight: 450,
    energyMax: 100,
    energyRegen: 9,        // por segundo
    costPerQuery: 20,      // igual para una consulta clásica que para una iteración cuántica
    slowmoDuration: 1.1,   // segundos reales que se muestran las barras antes del tiro
    slowmoScale: 0.12,
    pickupRadius: 16,      // pickups de tipo de bala (0/1)
    hazardRadius: 44,      // zonas H del piso
    // Ruido del circuito (solo cuántico). En start() se toma como una fracción del nivel calibrado con
    // FakeSherbrooke (Quantum.CALIBRATED_PHASE_NOISE = 0.46): 0.33 → k=2 ≈ 90 %; 1.0 → k=2 ≈ 60 % (nivel completo).
    phaseNoiseScale: 0.33,
    phaseNoise: 0.15,      // valor de respaldo si Quantum no trae la calibración
    sensorFlip: 0,         // ruido del sensor en niebla normal (afecta a ambos)
    stormSensorFlip: 0.25, // ruido del sensor dentro de la tormenta (afecta a ambos)
    // Zona segura que se cierra por fases (sección 8.7 del brief). Fuera de ella está la tormenta:
    // daño por tiempo y sensor poco fiable para los dos cañones.
    zoneEnabled: true,
    zonePhaseEvery: 30,    // segundos de juego entre cierres
    zoneShrink: 0.7,       // el radio objetivo se multiplica por esto en cada cierre
    zoneMinR: 380,         // radio mínimo
    zoneShrinkSpeed: 25,   // píxeles por segundo mientras se cierra
    zoneDamage: 4,         // vida por segundo fuera de la zona
    // La niebla se expande por fases (como la zona de un battle royale): más escondites, más búsquedas.
    fogPhaseEvery: 25,     // segundos de juego entre expansiones
    fogPhaseStep: 0.15,    // cuánto crece el radio en cada fase (× radio inicial)
    fogMaxScale: 1.6,      // tamaño máximo (× radio inicial)
    fogGrowSpeed: 0.05,    // velocidad de crecimiento durante una expansión (escala por segundo)
    // Niebla viva: el viento la arrastra y los bancos se disipan y reaparecen en otro lugar.
    fogAlive: true,
    windSpeed: 18,         // píxeles por segundo
    windChangeEvery: 20,   // segundos de juego entre cambios de dirección
    dissipateEvery: 35,    // segundos de juego entre bancos que se disipan
    dissipateTime: 3,      // segundos que tarda en desaparecer
    formTime: 4,           // segundos que tarda en formarse el banco nuevo
    botSearchCooldown: 3.5,
    botSearchDamage: 10,
    // Loot de piezas de circuito (fase 3): el cañón cuántico se arma con lo que recoges, en ese orden.
    // Solo se activa si Quantum.runCircuit existe; si no, el cuántico sigue con k libre (Q/E).
    loot: true,
    lootInitial: 12,       // piezas al empezar (además del kit garantizado)
    lootEvery: 8,          // segundos de juego entre piezas nuevas
    lootMax: 20,           // piezas en el piso como máximo
    lootWeights: { H: 20, M: 30, D: 30, S: 10 },
    circuitMax: 8,         // ranuras del circuito
    pieceRadius: 14,
  };

  // Piezas del circuito: nombre de respaldo (Content.pieces[x].nombre lo reemplaza) y color.
  const PIECES = {
    H: { nombre: 'Superposición', color: '#4cc9f0' },
    M: { nombre: 'Marcador', color: '#ff6b9d' },
    D: { nombre: 'Difusor', color: '#ffd166' },
    S: { nombre: 'Estabilizador', color: '#80ed99' },
  };

  // Arquetipos de bots (sección 8.8): cómo buscan al jugador cuando se esconde en la niebla.
  const ARCHETYPES = {
    clasico: { label: 'clásico', cannon: 'classic', k: 2 },
    cuantico: { label: 'cuántico', cannon: 'quantum', k: 2 },
    ansioso: { label: 'ansioso', cannon: 'quantum', k: 3 },
  };
  const ARCH_ORDER = ['clasico', 'cuantico', 'ansioso'];

  // Zonas de niebla como fracciones del mapa: [x, y, radio, tormenta?]. El mapa chico es el de ?demo.
  const FOG_LAYOUT_SMALL = [
    [0.28, 0.35, 220], [0.72, 0.58, 260, true], [0.52, 0.16, 160], [0.18, 0.8, 150],
  ];
  const FOG_LAYOUT_LARGE = [
    [0.15, 0.2, 230], [0.42, 0.14, 200], [0.76, 0.18, 240], [0.28, 0.5, 260], [0.62, 0.46, 300],
    [0.88, 0.55, 210], [0.18, 0.84, 220], [0.52, 0.8, 250], [0.84, 0.86, 190],
  ];

  const Game = {
    config, log: [], history: [], state: null, record: loadRecord(), start,
    collection: loadCollection(), ACHIEVEMENTS: Object.keys(ACHIEVEMENTS),
  };
  window.Game = Game;

  let canvas, ctx;
  let dpr = 1;
  let running = false;
  let lastTime = 0;
  let world = null;
  let inputBound = false;
  const keys = {};
  const mouse = { x: 0, y: 0, down: false };
  // Puntería: 'keys' (← → giran el cañón, sin mouse) o 'mouse'. Empieza en 'keys' y pasa a 'mouse'
  // en cuanto el mouse se mueve sobre el canvas; vuelve a 'keys' al tocar ← o →.
  let aimMode = 'keys';
  let lookAhead = 0;

  // Pistas: cada una se muestra una sola vez por sesión (no se reinicia al jugar otra vez).
  const seenHints = new Set();
  const hintQueue = [];
  let hintCur = null;

  // ---------- utilidades ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function sectorOf(from, to) {
    let a = Math.atan2(to.y - from.y, to.x - from.x);
    if (a < 0) a += Math.PI * 2;
    return Math.floor(a / SECTOR_ANGLE) % SECTORS;
  }

  function outsideSafe(p) {
    const z = world.zone;
    return z.enabled && Math.hypot(p.x - z.x, p.y - z.y) > z.r;
  }

  // 'tormenta' | 'niebla' | null. Es tormenta la niebla de un banco de tormenta o fuera de la zona segura.
  function zoneOf(p) {
    let zone = null;
    for (const f of world.fog) {
      if (Math.hypot(p.x - f.x, p.y - f.y) >= f.r) continue;
      for (const c of f.blobs) {
        if (Math.hypot(p.x - f.x - c.dx, p.y - f.y - c.dy) < c.r) {
          if (f.storm) return 'tormenta';
          zone = 'niebla';
          break;
        }
      }
    }
    return zone && outsideSafe(p) ? 'tormenta' : zone;
  }

  function inFog(p) {
    return zoneOf(p) !== null;
  }

  function sensorFlipAt(p) {
    return zoneOf(p) === 'tormenta' || outsideSafe(p) ? config.stormSensorFlip : config.sensorFlip;
  }

  function say(text) {
    world.msg = text;
    world.msgT = 1.8;
  }

  function hint(key) {
    if (seenHints.has(key)) return;
    const C = window.Content;
    const text = C && C.hints && C.hints[key];
    if (!text) return;
    seenHints.add(key);
    hintQueue.push(String(text));
  }

  function loadRecord() {
    try {
      const r = JSON.parse(localStorage.getItem(RECORD_KEY));
      if (r && typeof r.kills === 'number') return r;
    } catch (e) { /* sin almacenamiento: récord solo en memoria */ }
    return { kills: 0, quantumAcc: null };
  }

  function loadCollection() {
    try {
      const c = JSON.parse(localStorage.getItem(COLLECTION_KEY));
      if (c && c.unlocked && c.stats) return c;
    } catch (e) { /* sin almacenamiento: colección solo en memoria */ }
    return { unlocked: {}, stats: { classic: 0, searches: 0, stormMisreads: 0, hitStd2: 0 } };
  }

  function saveCollection() {
    try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(Game.collection)); } catch (e) { /* ignorar */ }
  }

  function achievementTitle(id) {
    const C = window.Content;
    const a = C && C.achievements && C.achievements[id];
    return (a && a.titulo) || ACHIEVEMENTS[id] || id;
  }

  function unlock(id) {
    const c = Game.collection;
    if (c.unlocked[id]) return;
    c.unlocked[id] = new Date().toISOString();
    saveCollection();
    world.newConcepts.push(id);
    const n = Object.keys(c.unlocked).length, total = Object.keys(ACHIEVEMENTS).length;
    hintQueue.push('★ Concepto desbloqueado: ' + achievementTitle(id) + ' (' + n + '/' + total + ')');
  }

  function saveRecord(r) {
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(r)); } catch (e) { /* ignorar */ }
  }

  // ---------- piezas del circuito ----------
  function pieceName(t) {
    const C = window.Content;
    const c = C && C.pieces && C.pieces[t];
    return (c && c.nombre) || (PIECES[t] && PIECES[t].nombre) || t;
  }

  // El cañón cuántico se arma con piezas si el simulador sabe ejecutar circuitos arbitrarios.
  function circuitModeAvailable() {
    return config.loot && !isDemo() && !!(window.Quantum && typeof window.Quantum.runCircuit === 'function');
  }

  // gates: compuertas que se simulan; queries: consultas al sensor (marcadores); nS: estabilizadores;
  // std: número de iteraciones si el circuito es el Grover estándar H(MD)^n, o null si es otro circuito.
  function circuitInfo(circ) {
    const gates = circ.filter((t) => t === 'H' || t === 'M' || t === 'D');
    const str = gates.join('');
    return {
      gates, str: circ.join(''),
      queries: gates.filter((t) => t === 'M').length,
      nS: circ.filter((t) => t === 'S').length,
      std: /^H(MD)*$/.test(str) ? (gates.length - 1) / 2 : null,
    };
  }

  function makePiece(type, x, y) {
    return { type, x, y, bob: rand(0, Math.PI * 2), noPickUntil: 0 };
  }

  function randomPieceType() {
    const wts = config.lootWeights, keysW = Object.keys(wts);
    let r = Math.random() * keysW.reduce((a, k) => a + wts[k], 0);
    for (const k of keysW) { r -= wts[k]; if (r < 0) return k; }
    return keysW[keysW.length - 1];
  }

  function lootPoint() {
    const z = world.zone, W = config.world.w, H = config.world.h;
    for (let i = 0; i < 20; i++) {
      const q = Math.random() < 0.4 ? pointInFog() : randomPoint();
      q.x = clamp(q.x, 40, W - 40); q.y = clamp(q.y, 40, H - 40);
      if (!z.enabled || !outsideSafe(q)) return q;
    }
    return randomPoint();
  }

  // Kit garantizado: H, M y D cerca del inicio, para que nadie se quede sin probar el cañón cuántico.
  function giveStarterKit() {
    const p = world.player, base = -Math.PI / 2;
    [['H', 140, -0.6], ['M', 230, 0], ['D', 320, 0.6]].forEach(([t, d, da]) => {
      world.groundPieces.push(makePiece(t, clamp(p.x + Math.cos(base + da) * d, 40, config.world.w - 40), clamp(p.y + Math.sin(base + da) * d, 40, config.world.h - 40)));
    });
  }

  function updateLoot() {
    const w = world, p = w.player;
    if (!w.circuitMode || !p.alive) return;
    if (w.time >= w.nextLootAt) {
      w.nextLootAt += config.lootEvery;
      if (w.groundPieces.length < config.lootMax) { const q = lootPoint(); w.groundPieces.push(makePiece(randomPieceType(), q.x, q.y)); }
    }
    for (let i = w.groundPieces.length - 1; i >= 0; i--) {
      const g = w.groundPieces[i];
      if (w.time < g.noPickUntil || dist(p, g) > p.r + config.pieceRadius) continue;
      if (w.circuit.length >= config.circuitMax) {
        if (w.time - (g.fullMsgAt || -9) > 3) { g.fullMsgAt = w.time; say('Circuito lleno (' + config.circuitMax + ' piezas): R suelta la última'); }
        continue;
      }
      w.circuit.push(g.type);
      w.groundPieces.splice(i, 1);
      say('Recogiste ' + pieceName(g.type) + ' · circuito: ' + w.circuit.join(' '));
      hint('primeraPieza');
      onPiecePicked(g.type);
    }
  }

  function onPiecePicked(type) {
    if (type === 'S') unlock('decoherencia');
  }

  function dropLastPiece() {
    const w = world, p = w.player;
    if (!w.circuitMode || !p.alive || w.search) return;
    if (!w.circuit.length) return say('Tu circuito está vacío');
    const t = w.circuit.pop(), a = p.angle + Math.PI;
    const g = makePiece(t, clamp(p.x + Math.cos(a) * 60, 40, config.world.w - 40), clamp(p.y + Math.sin(a) * 60, 40, config.world.h - 40));
    g.noPickUntil = w.time + 1.2;
    w.groundPieces.push(g);
    say('Soltaste ' + pieceName(t) + (w.circuit.length ? ' · circuito: ' + w.circuit.join(' ') : ' · circuito vacío'));
  }

  // ---------- mundo ----------
  function makeTank(x, y, isPlayer, arch) {
    return {
      x, y, r: 18, hp: 100, maxHp: 100, angle: 0, isPlayer, alive: true, arch,
      fireCd: rand(0, 1), searchCd: rand(1, config.botSearchCooldown), wp: null, wait: 0, revealed: 0, flash: 0,
      activeBulletType: 1, bulletType: 1,
      color: isPlayer ? '#4fc3f7' : '#ff7a59',
    };
  }

  function makePickup(x, y, type) {
    return { x, y, type, radius: config.pickupRadius, pulse: rand(0, Math.PI * 2), active: true };
  }

  function makeHazard(x, y, radius) {
    return { x, y, radius: radius || config.hazardRadius, kind: 'H', pulse: rand(0, Math.PI * 2), active: true };
  }

  function randomPoint(minDistFrom, minDist) {
    const W = config.world.w, H = config.world.h;
    for (let i = 0; i < 50; i++) {
      const p = { x: rand(60, W - 60), y: rand(60, H - 60) };
      if (!minDistFrom || dist(p, minDistFrom) > minDist) return p;
    }
    return { x: rand(60, W - 60), y: rand(60, H - 60) };
  }

  function pointInFog() {
    const f = world.fog[Math.floor(Math.random() * world.fog.length)];
    const c = f.blobs[Math.floor(Math.random() * f.blobs.length)];
    const a = rand(0, Math.PI * 2), r = rand(0, c.r * 0.7);
    return { x: f.x + c.dx + Math.cos(a) * r, y: f.y + c.dy + Math.sin(a) * r };
  }

  // Destino de un bot que deambula: esconderse en la niebla, cazar cerca del jugador (en un mapa
  // grande, si no, casi no se cruzan) o explorar.
  function nextWaypoint() {
    for (let i = 0; i < 12; i++) {
      const wp = rawWaypoint();
      if (!outsideSafe(wp)) return wp;
    }
    const z = world.zone, a = rand(0, Math.PI * 2), d = rand(0, z.r * 0.8);
    return { x: clamp(z.x + Math.cos(a) * d, 60, config.world.w - 60), y: clamp(z.y + Math.sin(a) * d, 60, config.world.h - 60) };
  }

  function rawWaypoint() {
    const r = Math.random(), p = world.player;
    if (r < 0.45) return pointInFog();
    if (r < 0.8 && p.alive) {
      const a = rand(0, Math.PI * 2), d = rand(150, config.botSight);
      return {
        x: clamp(p.x + Math.cos(a) * d, 60, config.world.w - 60),
        y: clamp(p.y + Math.sin(a) * d, 60, config.world.h - 60),
      };
    }
    return randomPoint();
  }

  // Un banco de niebla es un grupo de círculos superpuestos (forma de humo). f.x, f.y y f.r son el
  // contorno de todo el banco; cada círculo guarda su desplazamiento y radio iniciales (dx0, dy0, r0).
  function makeFogBank(x, y, size, storm) {
    const blobs = [{ dx0: 0, dy0: 0, r0: size * 0.72 }];
    const n = 2 + Math.floor(Math.random() * 3);
    const a0 = rand(0, Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + rand(-0.4, 0.4), d = size * rand(0.35, 0.6);
      blobs.push({ dx0: Math.cos(a) * d, dy0: Math.sin(a) * d, r0: size * rand(0.38, 0.55) });
    }
    for (const c of blobs) { c.dx = c.dx0; c.dy = c.dy0; c.r = c.r0; }
    const bound = Math.max(...blobs.map((c) => Math.hypot(c.dx0, c.dy0) + c.r0));
    return { x, y, r: bound, rBound0: bound, size, storm, blobs, fade: 1, state: 'estable' };
  }

  function makeZone(W, H) {
    const r = Math.hypot(W, H) / 2 + 100;   // al principio cubre todo el mapa
    return {
      enabled: config.zoneEnabled, x: W * rand(0.4, 0.6), y: H * rand(0.4, 0.6),
      r, rTarget: r, nextAt: config.zonePhaseEvery,
    };
  }

  function newWorld() {
    const W = config.world.w, H = config.world.h;
    const layout = W >= 3000 ? FOG_LAYOUT_LARGE : FOG_LAYOUT_SMALL;
    const fog = layout.map(([fx, fy, r, storm]) => makeFogBank(W * fx, H * fy, r, !!storm));
    const hazards = [
      makeHazard(W * 0.5, H * 0.55, 64),
      makeHazard(W * 0.22, H * 0.33, 54),
      makeHazard(W * 0.8, H * 0.72, 58),
    ];
    const pickups = [
      makePickup(W * 0.32, H * 0.58, 0),
      makePickup(W * 0.68, H * 0.42, 1),
      makePickup(W * 0.5, H * 0.2, 0),
    ];
    const player = makeTank(W / 2, H * 0.82, true, null);
    const bots = [];
    for (let i = 0; i < config.bots; i++) {
      const p = randomPoint(player, 450);
      bots.push(makeTank(p.x, p.y, false, ARCH_ORDER[i % ARCH_ORDER.length]));
    }
    return {
      fog, hazards, pickups, player, bots,
      circuit: [], groundPieces: [], circuitMode: false, nextLootAt: config.lootEvery,
      newConcepts: [],
      bullets: [], particles: [], tracers: [],
      energy: config.energyMax, cannon: 'classic', k: 1,
      search: null, lastResult: null, radarBot: null,
      kills: 0,
      fogScale: 1, fogTarget: 1, nextFogAt: config.fogPhaseEvery,
      wind: { ang: rand(0, Math.PI * 2), nextAt: config.windChangeEvery },
      nextDissipateAt: config.dissipateEvery,
      zone: makeZone(W, H),
      time: 0, shake: 0, msg: '', msgT: 0,
      over: false, endT: 0,
    };
  }

  function tanks() {
    return [world.player].concat(world.bots);
  }

  function healTarget(target, amount) {
    if (!target || !target.alive) return;
    if (typeof target.maxHp === 'number') {
      target.hp = Math.min(target.maxHp, target.hp + amount);
    } else {
      target.hp += amount;
    }
  }

  // Regla: una curación siempre es para quien disparó (nunca cura al enemigo impactado); el daño es
  // para el impactado y la baja se atribuye a quien disparó. Devuelve 'heal' o 'damage'.
  function applyBulletHit(target, bullet) {
    if (!target || !target.alive) return null;
    const heals = bullet.superposed ? bullet.outcome === 'heal' : bullet.type === 0;
    if (heals) {
      const amount = Math.round((bullet.heal || config.bulletHeal) * (bullet.superposed ? 1.2 : 1));
      const shooter = bullet.owner;
      healTarget(shooter, amount);
      if (shooter && shooter.alive) burst(shooter.x, shooter.y, '#7ef7c7', 8);
      if (shooter && shooter.isPlayer) say('+' + amount + ' de vida' + (bullet.superposed ? ' (la bala pasó por una zona inestable)' : ' (bala 0)'));
      return 'heal';
    }
    damage(target, Math.round((bullet.dmg || config.bulletDamage) * (bullet.superposed ? 1.1 : 1)), bullet.owner);
    burst(target.x, target.y, '#ff8c7b', 10);
    return 'damage';
  }

  function findHazardAt(x, y) {
    return world.hazards.find((h) => h.active && Math.hypot(h.x - x, h.y - y) <= h.radius);
  }

  function transformBulletInHazard(bullet) {
    if (!bullet || bullet.life <= 0) return;
    const hazard = findHazardAt(bullet.x, bullet.y);
    if (!hazard) {
      bullet.inHazardH = false;
      return;
    }

    if (bullet.inHazardH && bullet.superposed) return;

    bullet.inHazardH = true;
    bullet.superposed = true;
    const typeBias = bullet.type === 0 ? 0.68 : 0.42;
    const roll = Math.random();
    bullet.outcome = roll < typeBias ? 'heal' : 'damage';
    if (bullet.type === 1 && roll < 0.26) bullet.outcome = 'heal';
    if (bullet.type === 0 && roll > 0.88) bullet.outcome = 'damage';
    bullet.heal = bullet.heal || config.bulletHeal;
    bullet.dmg = bullet.dmg || config.bulletDamage;
    burst(bullet.x, bullet.y, bullet.outcome === 'heal' ? '#7ef7c7' : '#ff8c7b', 6);
  }

  function fire(owner, angle, dmg, bulletType) {
    const type = typeof bulletType === 'number' ? bulletType : 1;
    world.bullets.push({
      x: owner.x + Math.cos(angle) * (owner.r + 6),
      y: owner.y + Math.sin(angle) * (owner.r + 6),
      vx: Math.cos(angle) * config.bulletSpeed,
      vy: Math.sin(angle) * config.bulletSpeed,
      owner, dmg: dmg || config.bulletDamage, type,
      life: 1.3, superposed: false, inHazardH: false,
      outcome: null, heal: config.bulletHeal,
    });
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(60, 260);
      world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), color });
    }
  }

  function damage(t, dmg, by, silent) {
    if (!t.alive) return;
    t.hp -= dmg;
    if (!silent) t.flash = 0.12;
    if (t.hp <= 0) {
      t.alive = false;
      burst(t.x, t.y, t.color, 26);
      if (t.isPlayer) say('Te eliminaron');
      else if (by === world.player) world.kills++;
      world.shake = Math.max(world.shake, 10);
    }
  }

  // Enemigo escondido en la niebla más cercano dentro del alcance del radar.
  function radarTarget() {
    const p = world.player;
    let best = null, bestD = config.radarRange;
    for (const b of world.bots) {
      if (!b.alive || !inFog(b)) continue;
      const d = dist(p, b);
      if (d <= bestD) { best = b; bestD = d; }
    }
    return best;
  }

  function runSearch(cannon, k, target, sensorFlip) {
    const Q = window.Quantum;
    return cannon === 'quantum'
      ? Q.runQuantum({ k, target, phaseNoise: config.phaseNoise, sensorFlip })
      : Q.runClassical({ k, target, sensorFlip });
  }

  // Lo que va a disparar el jugador: con piezas, k = nº de marcadores del circuito; si no, k libre (Q/E).
  function shotPlan() {
    const w = world;
    if (w.cannon === 'quantum' && w.circuitMode) {
      const info = circuitInfo(w.circuit);
      // El estabilizador lo aplica Quantum (divide el ruido a la mitad); acá solo se registra para el log.
      return { k: info.queries, info, phaseNoise: config.phaseNoise * (info.nS ? 0.5 : 1) };
    }
    const k = w.k;
    const info = w.cannon === 'quantum' ? circuitInfo(['H'].concat(...Array(k).fill(['M', 'D']))) : null;
    return { k, info, phaseNoise: w.cannon === 'quantum' ? config.phaseNoise : 0 };
  }

  function trySearch() {
    const w = world;
    if (!w || w.search || w.over || !w.player.alive) return;
    const bot = w.radarBot;
    if (!bot) return say('El radar no detecta a nadie en la niebla');
    const plan = shotPlan();
    if (w.cannon === 'quantum' && w.circuitMode && !plan.info.gates.length) return say('Tu cañón cuántico está vacío: recoge piezas H, M y D');
    const cost = plan.k * config.costPerQuery;
    if (w.energy < cost) return say('Energía insuficiente para k = ' + plan.k);
    w.energy -= cost;

    const target = sectorOf(w.player, bot);
    const zone = zoneOf(bot);
    const sensorFlip = sensorFlipAt(bot);
    const result = w.cannon === 'quantum' && w.circuitMode
      ? window.Quantum.runCircuit({ pieces: w.circuit.slice(), target, phaseNoise: config.phaseNoise, sensorFlip })
      : runSearch(w.cannon, plan.k, target, sensorFlip);
    w.search = { t: 0, bot, target, result, cannon: w.cannon, k: plan.k, zone, sensorFlip, info: plan.info, phaseNoise: plan.phaseNoise };

    if (w.cannon === 'quantum') {
      hint('primerCuantico');
      const g = plan.info.gates;
      if (g.includes('M') && !g.includes('D')) hint('marcadorSolo');
      if (!g.includes('H') && (g.includes('M') || g.includes('D'))) hint('sinSuperposicion');
    }
    if (plan.k === 0) hint('kCero');
    if (zone === 'tormenta') hint('tormenta');
  }

  function resolveSearch() {
    const w = world, s = w.search, p = w.player;
    w.search = null;
    const shot = window.Quantum.sample(s.result.probs);
    const hit = shot === s.target;
    const entry = {
      cannon: s.cannon, k: s.k, target: s.target, shot, hit, theory: s.result.theory, t: +w.time.toFixed(2),
      zone: s.zone, sensorFlip: s.sensorFlip,
      phaseNoise: s.phaseNoise,
      misreads: s.result.misreads || 0,
      circuit: s.info ? s.info.str : null,
    };
    Game.log.push(entry);
    Game.history.push(entry);

    const ang = hit ? Math.atan2(s.bot.y - p.y, s.bot.x - p.x) : (shot + 0.5) * SECTOR_ANGLE;
    w.tracers.push({ x: p.x, y: p.y, ang, len: hit ? dist(p, s.bot) : config.radarRange, life: 0.4, color: hit ? '255,224,102' : '255,255,255' });
    w.lastResult = { result: s.result, cannon: s.cannon, life: 0.7 };

    if (hit) {
      damage(s.bot, config.searchDamage, p);
      s.bot.revealed = 1.2;
      burst(s.bot.x, s.bot.y, '#ffe066', 14);
      w.shake = Math.max(w.shake, 7);
      say('¡Acierto! Sector ' + shot);
    } else {
      say('Fallo: disparaste al sector ' + shot + ', estaba en el ' + s.target);
    }

    if (s.cannon === 'quantum') {
      if (hit && s.k >= 1) hint('aciertoCuantico');
      if (!hit && s.info.std === 3) hint('sobreRotacion');
      if (!hit && s.info.std === 2) hint('ruidoCircuito');
    }
    onSearchResolved(entry, s);
  }

  // Detecta los logros a partir de lo que pasó en la búsqueda (no hay quizzes: se gana jugando).
  function onSearchResolved(entry, s) {
    const st = Game.collection.stats, info = s.info, g = info ? info.gates : [];
    st.searches++;
    if (entry.cannon === 'classic') {
      st.classic++;
      if (st.classic >= 5) unlock('probCondicional');
    } else {
      if (g.includes('M')) unlock('amplitudNegativa');
      if (g.includes('M') && !g.includes('D')) unlock('marcadorSolo');
      if (entry.hit && g.includes('H') && g.includes('M') && g.includes('D')) unlock('interferencia');
      if (info.std === 2 && entry.hit) st.hitStd2++;
      if (info.std === 3 && !entry.hit && st.hitStd2 > 0) unlock('sobreRotacion');
      if (info.std === 2 && !entry.hit && entry.phaseNoise > 0) unlock('decoherencia');
    }
    if (entry.zone === 'tormenta' && entry.misreads > 0 && ++st.stormMisreads >= 3) unlock('tormentaEngana');
    if (st.searches >= 30) unlock('grandesNumeros');
    saveCollection();
  }

  // Un bot busca al jugador escondido en la niebla con el cañón de su arquetipo.
  function botSearch(b) {
    const w = world, p = w.player;
    const a = ARCHETYPES[b.arch];
    const target = sectorOf(b, p);
    const result = runSearch(a.cannon, a.k, target, sensorFlipAt(p));
    const shot = window.Quantum.sample(result.probs);
    const hit = shot === target;
    const ang = hit ? Math.atan2(p.y - b.y, p.x - b.x) : (shot + 0.5) * SECTOR_ANGLE;
    w.tracers.push({ x: b.x, y: b.y, ang, len: hit ? dist(b, p) : config.radarRange, life: 0.35, color: '255,122,89' });
    b.revealed = Math.max(b.revealed, 0.5);
    b.searchCd = config.botSearchCooldown + rand(0, 1);
    if (hit) {
      damage(p, config.botSearchDamage, b);
      say('Un bot ' + a.label + ' te encontró en la niebla (k = ' + a.k + ')');
    }
  }

  // ---------- actualización ----------
  function updatePlayer(dt) {
    const p = world.player;
    if (!p.alive) return;
    // WASD mueve; las flechas apuntan y mueven la vista (para jugar sin mouse).
    let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    p.x = clamp(p.x + (mx / len) * config.playerSpeed * dt, p.r, config.world.w - p.r);
    p.y = clamp(p.y + (my / len) * config.playerSpeed * dt, p.r, config.world.h - p.r);

    for (const pickup of world.pickups) {
      if (!pickup.active) continue;
      if (Math.hypot(p.x - pickup.x, p.y - pickup.y) <= p.r + pickup.radius) {
        pickup.active = false;
        p.activeBulletType = pickup.type;
        p.bulletType = pickup.type;
        say('Balas ' + pickup.type + ' recogidas');
      }
    }

    const turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    if (turn) aimMode = 'keys';
    if (aimMode === 'mouse') {
      const m = screenToWorld(mouse.x, mouse.y);
      p.angle = Math.atan2(m.y - p.y, m.x - p.x);
    } else {
      p.angle += turn * config.aimTurnSpeed * dt;
    }
    const look = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    if (look > 0) lookAhead = Math.min(config.lookAheadMax, lookAhead + config.lookAheadSpeed * dt);
    else if (look < 0) lookAhead = Math.max(0, lookAhead - config.lookAheadSpeed * dt);

    p.fireCd -= dt;
    if ((mouse.down || keys.KeyF) && p.fireCd <= 0 && !world.search) {
      fire(p, p.angle, config.bulletDamage, p.activeBulletType);
      p.fireCd = config.fireCooldown;
    }
  }

  function nearestVisibleEnemy(b) {
    let best = null, bestD = config.botSight;
    for (const t of tanks()) {
      if (t === b || !t.alive || inFog(t)) continue;
      const d = dist(b, t);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  function updateBots(dt) {
    const p = world.player;
    const playerHidden = p.alive && inFog(p);
    for (const b of world.bots) {
      if (!b.alive) continue;
      b.fireCd -= dt;
      b.searchCd -= dt;
      b.revealed -= dt;
      const hidden = inFog(b);
      const enemy = nearestVisibleEnemy(b);
      if (outsideSafe(b) && (b.wait > 0 || !b.wp || outsideSafe(b.wp))) { b.wait = 0; b.wp = nextWaypoint(); }

      if (playerHidden && b.searchCd <= 0 && dist(b, p) <= config.radarRange) botSearch(b);

      if (enemy && !hidden) {
        // Pelea: mantener distancia y orbitar mientras dispara.
        const a = Math.atan2(enemy.y - b.y, enemy.x - b.x);
        b.angle = a;
        const d = dist(b, enemy);
        const forward = d > 260 ? 1 : d < 180 ? -1 : 0;
        let vx = Math.cos(a) * forward + Math.cos(a + Math.PI / 2) * 0.6;
        let vy = Math.sin(a) * forward + Math.sin(a + Math.PI / 2) * 0.6;
        if (outsideSafe(b)) {
          // Fuera de la zona: vuelve hacia adentro sin dejar de disparar.
          const az = Math.atan2(world.zone.y - b.y, world.zone.x - b.x);
          vx = Math.cos(az); vy = Math.sin(az);
        }
        b.x += vx * config.botSpeed * dt;
        b.y += vy * config.botSpeed * dt;
        if (b.fireCd <= 0) {
          fire(b, a + rand(-0.18, 0.18), config.botBulletDamage);
          b.fireCd = config.botFireCooldown + rand(0, 0.5);
        }
      } else if (b.wait > 0) {
        // Acampando (normalmente dentro de la niebla); si la niebla se mueve, se mueve con ella.
        b.wait -= dt;
        if (config.fogAlive && hidden) {
          const wv = windVec();
          b.x += wv.x * dt;
          b.y += wv.y * dt;
        }
      } else {
        if (!b.wp) b.wp = nextWaypoint();
        const a = Math.atan2(b.wp.y - b.y, b.wp.x - b.x);
        b.angle = a;
        b.x += Math.cos(a) * config.botSpeed * dt;
        b.y += Math.sin(a) * config.botSpeed * dt;
        if (dist(b, b.wp) < 12) {
          b.wp = null;
          b.wait = inFog(b) ? rand(3, 7) : rand(0.5, 1.5);
        }
      }
      b.x = clamp(b.x, b.r, config.world.w - b.r);
      b.y = clamp(b.y, b.r, config.world.h - b.r);
    }
  }

  function updateBullets(dt) {
    const list = tanks();
    world.bullets = world.bullets.filter((u) => {
      u.x += u.vx * dt;
      u.y += u.vy * dt;
      u.life -= dt;
      transformBulletInHazard(u);

      for (const t of list) {
        if (t === u.owner || !t.alive) continue;
        if (Math.hypot(u.x - t.x, u.y - t.y) < t.r + 4) {
          applyBulletHit(t, u);
          if (!t.isPlayer) t.revealed = Math.max(t.revealed, 0.4);
          return false;
        }
      }
      return u.life > 0 && u.x > 0 && u.y > 0 && u.x < config.world.w && u.y < config.world.h;
    });
  }

  function updateEffects(dt, dtReal) {
    world.particles = world.particles.filter((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
      return (q.life -= dt) > 0;
    });
    world.tracers = world.tracers.filter((t) => (t.life -= dtReal) > 0);
    if (world.lastResult && (world.lastResult.life -= dtReal) <= 0) world.lastResult = null;
    for (const t of tanks()) t.flash -= dtReal;
    world.shake = Math.max(0, world.shake - 40 * dtReal);
    world.msgT -= dtReal;
    if (hintCur && (hintCur.t -= dtReal) <= 0) hintCur = null;
    if (!hintCur && hintQueue.length) hintCur = { text: hintQueue.shift(), t: 4.5 };
  }

  // Récord personal: bots eliminados y % de acierto cuántico (k ≥ 1, mínimo 5 disparos).
  function updateRecord() {
    const r = Game.record, w = world;
    const q = Game.log.filter((e) => e.cannon === 'quantum' && e.k >= 1);
    const acc = q.length >= 5 ? q.filter((e) => e.hit).length / q.length : null;
    const news = [];
    if (w.kills > r.kills) { r.kills = w.kills; news.push(w.kills + ' bots'); }
    if (acc !== null && (r.quantumAcc === null || acc > r.quantumAcc)) {
      r.quantumAcc = acc;
      news.push(Math.round(acc * 100) + '% de acierto cuántico');
    }
    if (news.length) { saveRecord(r); say('¡Nuevo récord! ' + news.join(' · ')); }
  }

  function checkEnd(dtReal) {
    const w = world;
    if (!w.over) {
      const botsLeft = w.bots.filter((b) => b.alive).length;
      if (!w.player.alive || botsLeft === 0) {
        w.over = true;
        w.endT = 1.6;
        if (w.player.alive) say('¡Último en pie!');
        updateRecord();
      }
      return;
    }
    w.endT -= dtReal;
    if (w.endT <= 0) {
      running = false;
      mouse.down = false;
      if (window.UI && UI.showEnd) UI.showEnd(Game.log, start, Game.history);
    }
  }

  function updateFog(dt) {
    const w = world;
    if (w.time >= w.nextFogAt) {
      w.nextFogAt += config.fogPhaseEvery;
      if (w.fogTarget < config.fogMaxScale) {
        w.fogTarget = Math.min(config.fogMaxScale, w.fogTarget + config.fogPhaseStep);
        say('¡La niebla se expande!');
      }
    }
    if (w.fogScale < w.fogTarget) w.fogScale = Math.min(w.fogTarget, w.fogScale + config.fogGrowSpeed * dt);
    if (config.fogAlive) updateFogLife(dt);
    for (const f of w.fog) {
      const k = w.fogScale * f.fade;
      f.r = f.rBound0 * k;
      for (const c of f.blobs) { c.dx = c.dx0 * k; c.dy = c.dy0 * k; c.r = c.r0 * k; }
    }
  }

  function windVec() {
    return { x: Math.cos(world.wind.ang) * config.windSpeed, y: Math.sin(world.wind.ang) * config.windSpeed };
  }

  // Dónde aparece un banco nuevo: dentro de la zona segura y lejos del jugador.
  function fogSpawnPoint() {
    const z = world.zone, p = world.player, W = config.world.w, H = config.world.h;
    for (let i = 0; i < 30; i++) {
      let q;
      if (z.enabled) {
        const a = rand(0, Math.PI * 2), d = rand(0, z.r * 0.8);
        q = { x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d };
      } else q = randomPoint();
      q.x = clamp(q.x, 150, W - 150); q.y = clamp(q.y, 150, H - 150);
      if (dist(q, p) > 350) return q;
    }
    return randomPoint(p, 350);
  }

  function updateFogLife(dt) {
    const w = world, W = config.world.w, H = config.world.h, wv = windVec();
    if (w.time >= w.wind.nextAt) {
      w.wind.nextAt += config.windChangeEvery;
      w.wind.ang += rand(-1.2, 1.2);
    }
    if (w.time >= w.nextDissipateAt) {
      w.nextDissipateAt += config.dissipateEvery;
      const pool = w.fog.filter((f) => !f.storm && f.state === 'estable');
      if (pool.length) {
        pool[Math.floor(Math.random() * pool.length)].state = 'disipando';
        say('¡Un banco de niebla se disipa!');
      }
    }
    for (const f of w.fog) {
      if (f.storm) continue;   // la tormenta circular (mapa de ?demo) no se mueve
      f.x += wv.x * dt;
      f.y += wv.y * dt;
      // Si el viento la saca del mapa, se disipa y reaparece en otro lugar.
      if (f.state === 'estable' && (f.x < -f.r * 0.2 || f.y < -f.r * 0.2 || f.x > W + f.r * 0.2 || f.y > H + f.r * 0.2)) f.state = 'disipando';
      if (f.state === 'disipando') {
        f.fade -= dt / config.dissipateTime;
        if (f.fade <= 0) {
          const q = fogSpawnPoint(), nb = makeFogBank(q.x, q.y, f.size, false);
          Object.assign(f, nb, { fade: 0, state: 'formando' });
        }
      } else if (f.state === 'formando') {
        f.fade += dt / config.formTime;
        if (f.fade >= 1) { f.fade = 1; f.state = 'estable'; }
      }
    }
  }

  function updateZone(dt) {
    const z = world.zone;
    if (!z.enabled) return;
    if (world.time >= z.nextAt) {
      z.nextAt += config.zonePhaseEvery;
      if (z.rTarget > config.zoneMinR) {
        z.rTarget = Math.max(config.zoneMinR, z.rTarget * config.zoneShrink);
        say('¡La zona se cierra! Afuera, la tormenta daña y el sensor falla');
      }
    }
    if (z.r > z.rTarget) z.r = Math.max(z.rTarget, z.r - config.zoneShrinkSpeed * dt);
    for (const t of tanks()) {
      if (t.alive && outsideSafe(t)) damage(t, config.zoneDamage * dt, null, true);
    }
  }

  function update(dtReal) {
    const w = world;
    let dt = dtReal;
    if (w.search) {
      w.search.t += dtReal;
      dt *= config.slowmoScale;
      if (w.search.t >= config.slowmoDuration) resolveSearch();
    }
    w.time += dt;
    w.energy = Math.min(config.energyMax, w.energy + config.energyRegen * dt);
    updatePlayer(dt);
    updateLoot();
    updateFog(dt);
    updateZone(dt);
    updateBots(dt);
    updateBullets(dt);
    w.radarBot = w.player.alive ? radarTarget() : null;
    if (w.radarBot) hint('primeraBusqueda');
    updateEffects(dt, dtReal);
    checkEnd(dtReal);
  }

  // ---------- render ----------
  let cam = { x: 0, y: 0 };

  function viewSize() {
    return { w: canvas.width / dpr, h: canvas.height / dpr };
  }

  function updateCamera() {
    const v = viewSize(), W = config.world.w, H = config.world.h, p = world.player;
    // Con ↑ la cámara mira hacia donde apunta el cañón.
    const fx = p.x + Math.cos(p.angle) * lookAhead, fy = p.y + Math.sin(p.angle) * lookAhead;
    cam.x = W <= v.w ? (W - v.w) / 2 : clamp(fx - v.w / 2, 0, W - v.w);
    cam.y = H <= v.h ? (H - v.h) / 2 : clamp(fy - v.h / 2, 0, H - v.h);
  }

  function screenToWorld(sx, sy) {
    return { x: sx + cam.x, y: sy + cam.y };
  }

  function drawTank(t) {
    const quantumLook = t.isPlayer && world.cannon === 'quantum';
    if (quantumLook) {
      // Halo pulsante: el tanque "se vuelve cuántico".
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r + 7 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(179,136,255,' + (0.35 + pulse * 0.4) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = quantumLook ? '#b388ff' : '#8a93a6';
    ctx.strokeStyle = '#5b6375';
    ctx.lineWidth = 3;
    ctx.fillRect(t.r * 0.3, -6, t.r * 1.2, 12);
    ctx.strokeRect(t.r * 0.3, -6, t.r * 1.2, 12);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = t.flash > 0 ? '#ffffff' : quantumLook ? '#9f7aea' : t.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    if (!t.isPlayer) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(t.x - 20, t.y - t.r - 12, 40, 5);
      ctx.fillStyle = '#7bd88f';
      ctx.fillRect(t.x - 20, t.y - t.r - 12, 40 * Math.max(0, t.hp) / 100, 5);
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(232,236,244,0.75)';
      ctx.fillText(ARCHETYPES[t.arch].label, t.x, t.y - t.r - 17);
      ctx.textAlign = 'left';
    }
  }

  function drawWorld() {
    const v = viewSize(), W = config.world.w, H = config.world.h;
    // Grilla
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = Math.floor(cam.x / 50) * 50, y0 = Math.floor(cam.y / 50) * 50;
    for (let x = x0; x < cam.x + v.w + 50; x += 50) { ctx.moveTo(x, cam.y); ctx.lineTo(x, cam.y + v.h); }
    for (let y = y0; y < cam.y + v.h + 50; y += 50) { ctx.moveTo(cam.x, y); ctx.lineTo(cam.x + v.w, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, W, H);

    for (const hazard of world.hazards) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(127, 205, 255, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(127, 205, 255, 0.7)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#d8f3ff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('≈', hazard.x, hazard.y + 6);   // zona inestable (no confundir con la pieza H del circuito)
      ctx.restore();
    }

    for (const pickup of world.pickups) {
      if (!pickup.active) continue;
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
      ctx.fillStyle = pickup.type === 0 ? 'rgba(75, 255, 150, 0.7)' : 'rgba(255, 120, 120, 0.8)';
      ctx.fill();
      ctx.fillStyle = '#0b1020';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(pickup.type), pickup.x, pickup.y + 5);
    }

    for (const g of world.groundPieces) {
      if (g.x < cam.x - 30 || g.x > cam.x + v.w + 30 || g.y < cam.y - 30 || g.y > cam.y + v.h + 30) continue;
      const bob = Math.sin(world.time * 3 + g.bob) * 2, sz = 22;
      ctx.fillStyle = 'rgba(8,10,20,0.85)';
      ctx.fillRect(g.x - sz / 2, g.y - sz / 2 + bob, sz, sz);
      ctx.strokeStyle = PIECES[g.type].color;
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x - sz / 2, g.y - sz / 2 + bob, sz, sz);
      ctx.fillStyle = PIECES[g.type].color;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.type, g.x, g.y + 5 + bob);
      ctx.textAlign = 'left';
    }

    for (const u of world.bullets) {
      ctx.beginPath();
      ctx.arc(u.x, u.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = u.type === 0 ? '#7ef7c7' : (u.superposed ? '#d39bff' : '#ff8c7b');
      ctx.fill();
    }

    for (const b of world.bots) {
      if (b.alive && (!inFog(b) || b.revealed > 0)) drawTank(b);
    }
    const p = world.player;
    if (p.alive) {
      if (aimMode === 'keys') {
        // Sin mouse no hay cursor: una línea punteada muestra hacia dónde sale el disparo.
        ctx.save();
        ctx.strokeStyle = 'rgba(155,231,255,0.35)';
        ctx.setLineDash([6, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(p.angle) * (p.r + 24), p.y + Math.sin(p.angle) * (p.r + 24));
        ctx.lineTo(p.x + Math.cos(p.angle) * 260, p.y + Math.sin(p.angle) * 260);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = inFog(p) ? 0.6 : 1;
      drawTank(p);
      ctx.globalAlpha = 1;
    }

    for (const q of world.particles) {
      ctx.globalAlpha = Math.min(1, q.life * 2);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Niebla y tormenta (encima de todo lo del mundo)
    for (const f of world.fog) {
      if (f.x + f.r < cam.x || f.x - f.r > cam.x + v.w || f.y + f.r < cam.y || f.y - f.r > cam.y + v.h) continue;
      const rgb = f.storm || outsideSafe(f) ? '190,120,200' : '150,160,185';
      for (const c of f.blobs) {
        const cx = f.x + c.dx, cy = f.y + c.dy;
        const g = ctx.createRadialGradient(cx, cy, c.r * 0.45, cx, cy, c.r);
        g.addColorStop(0, 'rgba(' + rgb + ',0.42)');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (f.storm) {
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,230,255,0.85)';
        ctx.fillText('TORMENTA · sensor poco fiable', f.x, f.y - f.r * 0.6);
        ctx.textAlign = 'left';
      }
    }

    const z = world.zone;
    if (z.enabled && z.r < Math.hypot(W, H)) {
      ctx.beginPath();
      ctx.rect(cam.x - 10, cam.y - 10, v.w + 20, v.h + 20);
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(150,70,170,0.22)';
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(214,179,255,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const t of world.tracers) {
      ctx.strokeStyle = 'rgba(' + t.color + ',' + Math.min(1, t.life * 2.5) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.ang) * t.len, t.y + Math.sin(t.ang) * t.len);
      ctx.stroke();
    }

    // Radar: anillo de alcance y división en 8 sectores
    if (world.radarBot) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,224,102,0.35)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, config.radarRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,224,102,0.12)';
      ctx.beginPath();
      for (let i = 0; i < SECTORS; i++) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(i * SECTOR_ANGLE) * config.radarRange, p.y + Math.sin(i * SECTOR_ANGLE) * config.radarRange);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function hudState() {
    const w = world;
    return {
      energy: w.energy,
      cannon: w.cannon,
      k: shotPlan().k,
      radar: !!w.radarBot,
      hp: Math.max(0, w.player.hp),
      botsLeft: w.bots.filter((b) => b.alive).length,
      cost: shotPlan().k * config.costPerQuery,
      costPerQuery: config.costPerQuery,
      circuit: w.circuit.slice(),
      circuitMax: config.circuitMax,
      circuitMode: w.circuitMode,
      concepts: Object.keys(Game.collection.unlocked).length,
      conceptsTotal: Object.keys(ACHIEVEMENTS).length,
      searching: !!w.search,
      activeBulletType: w.player.activeBulletType,
      inHazardH: !!findHazardAt(w.player.x, w.player.y),
      radarZone: w.radarBot ? zoneOf(w.radarBot) : null,
      kills: w.kills,
      record: Game.record,
    };
  }

  function wrapText(text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // Minimapa (abajo a la derecha): niebla, tormenta, tu tanque, la vista de la cámara y solo los bots
  // que estás viendo (fuera de la niebla y cerca). Nunca muestra a los escondidos: eso es trabajo del radar.
  function drawMinimap(v) {
    const W = config.world.w, H = config.world.h;
    const mw = Math.min(200, v.w * 0.3), s = mw / W, mh = H * s;
    const mx = v.w - mw - 12, my = v.h - mh - 12, p = world.player;
    ctx.fillStyle = 'rgba(8,10,20,0.75)';
    ctx.fillRect(mx, my, mw, mh);
    for (const f of world.fog) {
      ctx.fillStyle = f.storm ? 'rgba(190,120,200,0.5)' : 'rgba(150,160,185,0.35)';
      for (const c of f.blobs) {
        ctx.beginPath();
        ctx.arc(mx + (f.x + c.dx) * s, my + (f.y + c.dy) * s, c.r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const z = world.zone;
    if (z.enabled) {
      ctx.strokeStyle = 'rgba(214,179,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx + z.x * s, my + z.y * s, z.r * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(232,236,244,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + Math.max(0, cam.x) * s, my + Math.max(0, cam.y) * s, Math.min(W, v.w) * s, Math.min(H, v.h) * s);
    ctx.fillStyle = '#ff7a59';
    for (const b of world.bots) {
      if (!b.alive || (inFog(b) && b.revealed <= 0) || dist(b, p) > config.botSight * 1.5) continue;
      ctx.fillRect(mx + b.x * s - 2, my + b.y * s - 2, 4, 4);
    }
    for (const g of world.groundPieces) {
      ctx.fillStyle = PIECES[g.type].color;
      ctx.fillRect(mx + g.x * s - 1, my + g.y * s - 1, 2, 2);
    }
    if (world.radarBot) {
      ctx.strokeStyle = 'rgba(255,224,102,0.6)';
      ctx.beginPath();
      ctx.arc(mx + p.x * s, my + p.y * s, config.radarRange * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.alive) {
      ctx.fillStyle = world.cannon === 'quantum' ? '#b388ff' : '#4fc3f7';
      ctx.beginPath();
      ctx.arc(mx + p.x * s, my + p.y * s, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(232,236,244,0.4)';
    ctx.strokeRect(mx, my, mw, mh);
  }

  // Barra del circuito de respaldo (abajo a la izquierda). Gandy puede reemplazarla con UI.drawCircuit.
  function drawCircuitBar(v) {
    const c = world.circuit, sz = 26, gap = 4, x0 = 12, y0 = v.h - sz - 30;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232,236,244,0.85)';
    ctx.fillText('Circuito del cañón cuántico' + (c.length ? ' · R suelta la última' : ' · recoge piezas H, M, D'), x0, y0 - 8);
    for (let i = 0; i < config.circuitMax; i++) {
      const x = x0 + i * (sz + gap), t = c[i];
      ctx.fillStyle = 'rgba(8,10,20,0.75)';
      ctx.fillRect(x, y0, sz, sz);
      ctx.strokeStyle = t ? PIECES[t].color : 'rgba(232,236,244,0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y0, sz, sz);
      if (t) {
        ctx.fillStyle = PIECES[t].color;
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t, x + sz / 2, y0 + sz / 2 + 5);
        ctx.textAlign = 'left';
      }
    }
  }

  function drawOverlayText(v) {
    // Récord y bajas (arriba a la derecha; el HUD de UI va arriba a la izquierda)
    const r = Game.record;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(232,236,244,0.8)';
    ctx.fillText('Bajas: ' + world.kills, v.w - 16, 24);
    ctx.fillText('Récord: ' + r.kills + ' bots' + (r.quantumAcc !== null ? ' · ' + Math.round(r.quantumAcc * 100) + '% cuántico' : ''), v.w - 16, 42);
    if (world.fogScale < world.fogTarget) {
      ctx.fillStyle = '#d6b3ff';
      ctx.fillText('La niebla se está expandiendo…', v.w - 16, 60);
    } else if (world.fogTarget < config.fogMaxScale) {
      ctx.fillText('La niebla se expande en ' + Math.ceil(world.nextFogAt - world.time) + ' s', v.w - 16, 60);
    }
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.fillText('Conceptos ' + Object.keys(Game.collection.unlocked).length + '/' + Object.keys(ACHIEVEMENTS).length, v.w - 16, 114);
    if (config.fogAlive) {
      const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
      let a = world.wind.ang % (Math.PI * 2);
      if (a < 0) a += Math.PI * 2;
      ctx.fillStyle = 'rgba(232,236,244,0.8)';
      ctx.fillText('Viento ' + arrows[Math.round(a / (Math.PI / 4)) % 8], v.w - 16, 96);
    }
    const z = world.zone;
    if (z.enabled) {
      ctx.fillStyle = 'rgba(214,179,255,0.9)';
      if (z.r > z.rTarget) ctx.fillText('La zona se está cerrando…', v.w - 16, 78);
      else if (z.rTarget > config.zoneMinR) ctx.fillText('La zona se cierra en ' + Math.ceil(z.nextAt - world.time) + ' s', v.w - 16, 78);
    }
    if (world.player.alive && outsideSafe(world.player)) {
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b9d';
      ctx.fillText('FUERA DE LA ZONA · pierdes vida y el sensor falla', v.w / 2, 30);
    }

    if (world.msgT > 0) {
      ctx.globalAlpha = Math.min(1, world.msgT * 2);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(world.msg, v.w / 2, v.h - 40);
      ctx.globalAlpha = 1;
    }

    if (hintCur) {
      ctx.font = '15px system-ui, sans-serif';
      const lines = wrapText(hintCur.text, Math.min(560, v.w - 64));
      const lh = 20, boxW = Math.min(600, v.w - 32), boxH = lines.length * lh + 20;
      const bx = (v.w - boxW) / 2, by = 64;
      ctx.globalAlpha = Math.min(1, hintCur.t * 2);
      ctx.fillStyle = 'rgba(14,18,32,0.88)';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(bx, by, 4, boxH);
      ctx.fillStyle = '#e8ecf4';
      ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, v.w / 2, by + 24 + i * lh));
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  function render() {
    const v = viewSize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e1220';
    ctx.fillRect(0, 0, v.w, v.h);

    updateCamera();
    const sx = rand(-1, 1) * world.shake, sy = rand(-1, 1) * world.shake;
    ctx.save();
    ctx.translate(-cam.x + sx, -cam.y + sy);
    drawWorld();
    ctx.restore();

    const p = world.player;
    const px = p.x - cam.x, py = p.y - cam.y;
    const UIm = window.UI;
    if (UIm && UIm.drawSectors) {
      if (world.search) UIm.drawSectors(ctx, px, py, world.search.result, world.search.cannon);
      else if (world.lastResult) UIm.drawSectors(ctx, px, py, world.lastResult.result, world.lastResult.cannon);
    }
    if (UIm && UIm.drawHUD) UIm.drawHUD(ctx, hudState());
    if (world.circuitMode) {
      if (UIm && UIm.drawCircuit) UIm.drawCircuit(ctx, hudState());
      else drawCircuitBar(v);
    }
    drawMinimap(v);
    drawOverlayText(v);
  }

  // ---------- input y loop ----------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }

  function bindInput() {
    inputBound = true;
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!running || !world || e.repeat) return;
      if (e.code === 'Digit1') world.cannon = 'classic';
      if (e.code === 'Digit2') world.cannon = 'quantum';
      if (e.code === 'KeyZ') world.player.activeBulletType = 0;
      if (e.code === 'KeyX') world.player.activeBulletType = 1;
      if ((e.code === 'KeyQ' || e.code === 'KeyE') && world.cannon === 'quantum' && world.circuitMode) {
        say('En el cuántico, k sale de tu circuito: recoge marcadores (M) y difusores (D), o suelta con R');
      } else {
        if (e.code === 'KeyQ') world.k = Math.max(0, world.k - 1);
        if (e.code === 'KeyE') world.k = Math.min(3, world.k + 1);
      }
      if (e.code === 'KeyR') dropLastPiece();
      if (e.code === 'Space') trySearch();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    canvas.addEventListener('mousemove', (e) => {
      aimMode = 'mouse';
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) mouse.down = true;
      if (e.button === 2 && running) trySearch();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // Modo demo (?demo en la URL): para la presentación en vivo. Arranca junto a la niebla con un bot
  // escondido y con más energía y menos daño. No toca la física: ambos cañones siguen pagando lo mismo.
  function isDemo() {
    return typeof location !== 'undefined' && /[?&]demo\b/.test(location.search);
  }

  // Se aplica antes de crear el mundo: la demo usa el mapa chico (ya probado) para que sea predecible.
  function demoConfig() {
    Object.assign(config, { world: { w: 2000, h: 1300 }, bots: 6, zoneEnabled: false, fogAlive: false, energyRegen: 30, botBulletDamage: 3, botSearchDamage: 4 });
  }

  function setupDemo() {
    const f = world.fog[0], p = world.player, b = world.bots[0];
    p.x = f.x + f.r + 70; p.y = f.y;
    b.x = f.x; b.y = f.y; b.wait = 25; b.fireCd = 5;
  }

  function start() {
    canvas = document.getElementById('game');
    const cal = window.Quantum && window.Quantum.CALIBRATED_PHASE_NOISE;
    if (typeof cal === 'number') config.phaseNoise = +(cal * config.phaseNoiseScale).toFixed(3);
    ctx = canvas.getContext('2d');
    if (!inputBound) bindInput();
    resize();
    if (isDemo()) demoConfig();
    world = newWorld();
    if (isDemo()) setupDemo();
    world.circuitMode = circuitModeAvailable();
    if (world.circuitMode) {
      giveStarterKit();
      for (let i = 0; i < config.lootInitial; i++) { const q = lootPoint(); world.groundPieces.push(makePiece(randomPieceType(), q.x, q.y)); }
    }
    Game.state = world;
    Game.log = [];
    hintQueue.length = 0;
    hintCur = null;
    mouse.down = false;
    lookAhead = 0;
    if (!running) {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  }
})();
