// Portada 3D de Collapse (Gandy): el anillo de amplitudes detrás de la pantalla de inicio.
// Opcional y aditivo: si falta THREE o WebGL, start() devuelve false y queda el inicio 2D.
// Requiere js/vendor/three.min.js (three r149, build UMD, global THREE). Plan: docs/plan-portada-3d.md.
//
//   Intro3D.start(container) → true si montó la escena, false si no pudo
//   Intro3D.stop()           → detiene el bucle y libera la GPU
//
// La animación (fase 2) recorre, con datos de Quantum.runQuantum: superposición (k=0) → marcador (el signo
// se invierte y las probabilidades NO se mueven) → k=1 → k=2 → k=3 (se pasa y el acierto cae).
(function () {
  'use strict';

  var PAL = { pos: 0x4cc9f0, neg: 0xff6b9d, prob: 0xffd166, ground: 0x1a2038, tank: 0xe8ecf4, tankDark: 0x8e9dbf, fog: 0xaab8d6 };
  var R0 = 0.9, R1 = 2.1, H = 2.0;     // radio interior, exterior y alto para amplitud 1
  var GAP = Math.PI / 180 * 1.5;       // mismo hueco entre cuñas que drawSectors
  var INSET = Math.PI / 20;            // la cuña de probabilidad es más angosta (como el cono 2D)
  var HOLD = 2600, MOVE = 900;         // ms que se sostiene cada paso y ms que dura la transición

  // Respaldo sin Quantum: forma cerrada de Grover con 8 sectores, sin ruido (θ con sin θ = 1/√8).
  // Sector marcado: sin((2k+1)θ); cada uno de los otros 7: cos((2k+1)θ)/√7. Da 12,5 / 78,1 / 94,5 / 33,0 %.
  var THETA = Math.asin(1 / Math.sqrt(8));
  function defaultResult(target, k) {
    k = k === undefined ? 2 : k;
    var marked = Math.sin((2 * k + 1) * THETA), other = Math.cos((2 * k + 1) * THETA) / Math.sqrt(7);
    var amps = [], probs = [];
    for (var i = 0; i < 8; i++) { var re = i === target ? marked : other; amps.push({ re: re, im: 0 }); probs.push(re * re); }
    return { amps: amps, probs: probs, theory: marked * marked };
  }
  function getResult(k, target) {
    try {
      var Q = window.Quantum;
      if (Q && typeof Q.runQuantum === 'function') {
        var r = Q.runQuantum({ k: k, target: target });
        if (r && r.amps && r.amps.length === 8 && r.probs && r.probs.length === 8) return r;
      }
    } catch (e) { /* cae al respaldo */ }
    return defaultResult(target, k);
  }

  // Sector i = cuña [i·45°, (i+1)·45°) desde +x en sentido horario de pantalla.
  // Mapeo a 3D: el eje y del canvas (hacia abajo) es el eje +z del mundo, así que mirando desde arriba
  // con +x a la derecha el sentido horario es el mismo que en el juego.
  function polar(angle, r) { return { x: r * Math.cos(angle), z: r * Math.sin(angle) }; }
  function layout(result) {
    var out = [];
    for (var i = 0; i < 8; i++) {
      var a = result.amps && result.amps[i] ? result.amps[i].re : Math.sqrt(result.probs[i] || 0);
      var p = Math.max(0, Math.min(1, result.probs[i] || 0));
      out.push({ i: i, a0: i * Math.PI / 4, a1: (i + 1) * Math.PI / 4, center: (i + 0.5) * Math.PI / 4, amp: a, prob: p, negative: a < 0 });
    }
    return out;
  }

  // ---- Línea de tiempo (pura, sin THREE: se prueba sin GPU) ----
  function pct(p) { return (p * 100).toFixed(1).replace('.', ',') + ' %'; }

  function sequence(target) {
    target = target === undefined ? 3 : target;
    var rs = [0, 1, 2, 3].map(function (k) { return getResult(k, target); });
    var amps = rs.map(function (r) { return layout(r).map(function (s) { return s.amp; }); });
    var probs = rs.map(function (r) { return layout(r).map(function (s) { return s.prob; }); });
    var marked = amps[0].slice(); marked[target] = -marked[target];   // el oráculo solo invierte la fase
    var p = function (k) { return pct(probs[k][target]); };
    return [
      { name: 'superposicion', k: 0, amps: amps[0], probs: probs[0],
        caption: 'Superposición: los 8 sectores tienen la misma amplitud (' + p(0) + ' cada uno).' },
      { name: 'marcador', k: 0, amps: marked, probs: probs[0],
        caption: 'El marcador invierte el signo del sector buscado, pero las probabilidades no se mueven.' },
      { name: 'k1', k: 1, amps: amps[1], probs: probs[1],
        caption: '1 iteración (marcador + difusor): el sector correcto sube a ' + p(1) + '.' },
      { name: 'k2', k: 2, amps: amps[2], probs: probs[2],
        caption: '2 iteraciones: ' + p(2) + '. Es el mejor acierto con 8 sectores.' },
      { name: 'k3', k: 3, amps: amps[3], probs: probs[3],
        caption: '3 iteraciones: te pasaste y baja a ' + p(3) + '. Más no siempre es mejor.' }
    ];
  }

  function stateAt(seq, ms) {
    var slot = HOLD + MOVE, n = seq.length, cycle = n * slot;
    var u = ((ms % cycle) + cycle) % cycle, idx = Math.floor(u / slot), local = u - idx * slot;
    var a = seq[idx], b = seq[(idx + 1) % n];
    if (local <= HOLD) return { step: idx, caption: a.caption, amps: a.amps.slice(), probs: a.probs.slice() };
    var f = (local - HOLD) / MOVE; f = f * f * (3 - 2 * f);   // smoothstep
    var mix = function (x, y) { return x + (y - x) * f; };
    return {
      step: f < 0.5 ? idx : (idx + 1) % n,
      caption: f < 0.5 ? a.caption : b.caption,
      amps: a.amps.map(function (v, i) { return mix(v, b.amps[i]); }),
      probs: a.probs.map(function (v, i) { return mix(v, b.probs[i]); })
    };
  }

  // Calidad adaptativa: si el promedio de tiempo por fotograma pasa de ~30 fps, se baja una sola vez
  // (resolución 1:1 y sin niebla) y no se vuelve a subir, para evitar parpadeos de calidad.
  var SLOW_MS = 34;
  function nextQuality(level, avgMs) { return level >= 1 ? 1 : (avgMs > SLOW_MS ? 1 : 0); }

  // Parallax: el puntero (mouse o dedo) desplaza un poco la cámara. nx, ny en −1..1; se recortan.
  var PARALLAX_ANGLE = 0.35, PARALLAX_HEIGHT = 0.7;
  function parallaxOffset(nx, ny) {
    var cl = function (v) { return Math.max(-1, Math.min(1, typeof v === 'number' && isFinite(v) ? v : 0)); };
    return { dAngle: cl(nx) * PARALLAX_ANGLE, dHeight: -cl(ny) * PARALLAX_HEIGHT };
  }

  function camDistance(aspect) { return aspect < 1.3 ? Math.min(11, 6.2 * 1.3 / aspect) : 6.2; }

  // ---- Escena ----
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  var live = null;   // estado de la escena en marcha

  // Cuña anular extruida: forma 2D entre dos radios y ángulos, profundidad 1 hacia +y (se escala después).
  function wedgeGeometry(r0, r1, a0, a1) {
    var T = window.THREE, s = new T.Shape(), steps = 8, i, a;
    for (i = 0; i <= steps; i++) { a = a0 + (a1 - a0) * i / steps; s[i ? 'lineTo' : 'moveTo'](r1 * Math.cos(a), -r1 * Math.sin(a)); }
    for (i = steps; i >= 0; i--) { a = a0 + (a1 - a0) * i / steps; s.lineTo(r0 * Math.cos(a), -r0 * Math.sin(a)); }
    var g = new T.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);          // (x, y, z) → (x, z, −y): la forma queda en el suelo y se extruye hacia arriba
    return g;
  }

  function buildTank(T) {
    var g = new T.Group();
    var body = new T.Mesh(new T.BoxGeometry(0.7, 0.22, 0.9), new T.MeshStandardMaterial({ color: PAL.tank, roughness: 0.5 }));
    body.position.y = 0.11;
    var turret = new T.Mesh(new T.CylinderGeometry(0.2, 0.24, 0.16, 6), new T.MeshStandardMaterial({ color: PAL.tankDark, roughness: 0.5 }));
    turret.position.y = 0.3;
    var barrel = new T.Mesh(new T.BoxGeometry(0.09, 0.09, 0.62), new T.MeshStandardMaterial({ color: PAL.tank, roughness: 0.4 }));
    barrel.position.set(0, 0.3, 0.4);
    g.add(body, turret, barrel);
    return g;
  }

  // Niebla: pocas partículas translúcidas que derivan en círculos lentos.
  function buildFog(T, scene) {
    var n = window.innerWidth < 600 ? 28 : 56, pos = new Float32Array(n * 3), seeds = [];
    for (var i = 0; i < n; i++) seeds.push({ r: 1.2 + Math.random() * 2.6, a: Math.random() * Math.PI * 2, y: 0.15 + Math.random() * 1.5, w: (0.02 + Math.random() * 0.05) * (Math.random() < 0.5 ? -1 : 1) });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var pts = new T.Points(g, new T.PointsMaterial({ color: PAL.fog, size: 0.3, transparent: true, opacity: 0.22, depthWrite: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts: pts, seeds: seeds, pos: pos };
  }
  function driftFog(fog, sec) {
    for (var i = 0; i < fog.seeds.length; i++) {
      var s = fog.seeds[i], a = s.a + s.w * sec;
      fog.pos[i * 3] = s.r * Math.cos(a); fog.pos[i * 3 + 1] = s.y + 0.1 * Math.sin(sec * 0.4 + i); fog.pos[i * 3 + 2] = s.r * Math.sin(a);
    }
    fog.pts.geometry.attributes.position.needsUpdate = true;
  }

  function makeCaption(container) {
    var c = document.createElement('div');
    c.setAttribute('aria-hidden', 'true');     // es ilustración: la guía y el juego explican lo mismo con texto
    c.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:4%;width:max-content;max-width:min(92%,520px);' +
      'text-align:center;font:15px/1.4 system-ui,sans-serif;color:#e8ecf4;background:rgba(14,18,32,.72);padding:8px 14px;' +
      'border-radius:12px;pointer-events:none;transition:opacity .25s';
    var t = document.createElement('div'), n = document.createElement('div');
    n.textContent = 'Ilustración con datos del simulador';
    n.style.cssText = 'font-size:14px;opacity:.65;margin-top:4px';
    c.appendChild(t); c.appendChild(n);
    container.appendChild(c);
    return { root: c, text: t };
  }

  function buildScene(T, container) {
    var w = Math.max(1, container.clientWidth || window.innerWidth), h = Math.max(1, container.clientHeight || window.innerHeight);
    var small = window.innerWidth < 600;
    var renderer = new T.WebGLRenderer({ antialias: !small, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    var canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    container.appendChild(canvas);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(40, w / h, 0.1, 50);
    scene.add(new T.HemisphereLight(0xcfe8ff, 0x10142a, 0.9));
    var sun = new T.DirectionalLight(0xffffff, 0.8); sun.position.set(3, 6, 2); scene.add(sun);

    var ground = new T.Mesh(new T.CircleGeometry(R1 + 0.5, 48), new T.MeshBasicMaterial({ color: PAL.ground, transparent: true, opacity: 0.55 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; scene.add(ground);   // bajo las columnas: evita z-fighting con las que cuelgan (amplitud negativa)
    scene.add(buildTank(T));

    var sectors = [];
    for (var i = 0; i < 8; i++) {
      var a0 = i * Math.PI / 4 + GAP, a1 = (i + 1) * Math.PI / 4 - GAP;
      var col = new T.Mesh(wedgeGeometry(R0, R1, a0, a1), new T.MeshStandardMaterial({ color: PAL.pos, roughness: 0.45, metalness: 0.05 }));
      var cone = new T.Mesh(wedgeGeometry(R0 - 0.1, R1 - 0.2, a0 + INSET, a1 - INSET),
        new T.MeshBasicMaterial({ color: PAL.prob, transparent: true, opacity: 0.5, depthWrite: false }));
      scene.add(col); scene.add(cone);
      sectors.push({ col: col, cone: cone });
    }
    return { renderer: renderer, scene: scene, camera: camera, canvas: canvas, sectors: sectors, fog: buildFog(T, scene), caption: makeCaption(container) };
  }

  // Aplica un estado {amps, probs, caption} a las columnas: la altura sigue a |amplitud| y el signo da color y lado.
  function applyState(l, st) {
    for (var i = 0; i < 8; i++) {
      var amp = st.amps[i], h = Math.max(0.03, Math.min(1, Math.abs(amp)) * H), s = l.sectors[i];
      s.col.scale.y = h;
      s.col.position.y = amp < 0 ? -h : 0;
      s.col.material.color.setHex(amp < 0 ? PAL.neg : PAL.pos);
      s.cone.scale.y = Math.max(0.03, Math.min(1, st.probs[i]) * H);
    }
    if (st.caption !== l.lastCaption) { l.lastCaption = st.caption; l.caption.text.textContent = st.caption; }
  }

  function placeCamera(l, angle, dh) {
    var aspect = l.camera.aspect, r = camDistance(aspect);
    l.camera.position.set(r * Math.cos(angle), 3.6 * r / 6.2 + (dh || 0), r * Math.sin(angle));
    l.camera.lookAt(0, 0.4, 0);
  }

  function degrade(l) {
    l.quality = 1;
    l.renderer.setPixelRatio(1);
    if (l.onResize) l.onResize();
    l.fog.pts.visible = false;
  }

  function frame(t) {
    if (!live) return;
    if (live.t0 === null) live.t0 = t;
    var ms = t - live.t0;
    if (live.last !== null) {
      var dt = t - live.last;
      if (dt > 0 && dt < 250) {            // se ignoran saltos por cambio de pestaña
        live.avg = live.avg === null ? dt : live.avg * 0.9 + dt * 0.1;
        live.frames++;
        if (live.frames > 40 && live.quality === 0 && nextQuality(0, live.avg) === 1) degrade(live);
      }
    }
    live.last = t;
    applyState(live, stateAt(live.seq, ms));
    driftFog(live.fog, ms / 1000);
    live.px += (live.tx - live.px) * 0.08; live.py += (live.ty - live.py) * 0.08;   // suavizado
    var par = parallaxOffset(live.px, live.py);
    placeCamera(live, ms * 0.00012 + par.dAngle, par.dHeight);
    live.renderer.render(live.scene, live.camera);
    live.raf = requestAnimationFrame(frame);
  }

  function start(container) {
    stop();
    var T = window.THREE;
    if (!T || !container || !hasWebGL()) return false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      var s = buildScene(T, container);
      live = { renderer: s.renderer, scene: s.scene, camera: s.camera, canvas: s.canvas, sectors: s.sectors, fog: s.fog, caption: s.caption,
        container: container, px: 0, py: 0, tx: 0, ty: 0, raf: 0, t0: null, last: null, avg: null, frames: 0, quality: 0, lastCaption: null, seq: sequence(3) };
      live.onResize = function () {
        var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
        live.renderer.setSize(w, h, false); live.camera.aspect = w / h; live.camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', live.onResize);
      if (!reduce) {
        live.onPointer = function (e) {
          if (!live || typeof e.clientX !== 'number') return;
          live.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
          live.ty = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
        };
        window.addEventListener('pointermove', live.onPointer, { passive: true });
      }
      live.onVisibility = function () {
        if (document.hidden) { cancelAnimationFrame(live.raf); live.raf = 0; }
        else if (live && !live.raf && !reduce) live.raf = requestAnimationFrame(frame);
      };
      document.addEventListener('visibilitychange', live.onVisibility);
      if (reduce) {            // sin movimiento: se muestra solo el estado k = 2
        applyState(live, stateAt(live.seq, 3 * (HOLD + MOVE)));
        driftFog(live.fog, 0);
        placeCamera(live, 0.8);
        live.renderer.render(live.scene, live.camera);
      } else live.raf = requestAnimationFrame(frame);
      return true;
    } catch (e) { stop(); return false; }
  }

  function stop() {
    if (!live) return;
    var l = live; live = null;
    cancelAnimationFrame(l.raf);
    window.removeEventListener('resize', l.onResize);
    if (l.onPointer) window.removeEventListener('pointermove', l.onPointer);
    document.removeEventListener('visibilitychange', l.onVisibility);
    l.scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    l.renderer.dispose();
    if (l.canvas && l.canvas.parentNode) l.canvas.parentNode.removeChild(l.canvas);
    if (l.caption && l.caption.root.parentNode) l.caption.root.parentNode.removeChild(l.caption.root);
  }

  window.Intro3D = {
    start: start, stop: stop, layout: layout, polar: polar, defaultResult: defaultResult, getResult: getResult,
    sequence: sequence, stateAt: stateAt, nextQuality: nextQuality, parallaxOffset: parallaxOffset, timing: { HOLD: HOLD, MOVE: MOVE }
  };
})();
