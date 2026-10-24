// Portada 3D de Collapse (Gandy): el anillo de amplitudes detrás de la pantalla de inicio.
// Opcional y aditivo: si falta THREE o WebGL, start() devuelve false y queda el inicio 2D.
// Requiere js/vendor/three.min.js (three r149, build UMD, global THREE). Plan: docs/plan-portada-3d.md.
//
//   Intro3D.start(container) → true si montó la escena, false si no pudo
//   Intro3D.stop()           → detiene el bucle y libera la GPU
(function () {
  'use strict';

  var PAL = { pos: 0x4cc9f0, neg: 0xff6b9d, prob: 0xffd166, ground: 0x1a2038, tank: 0xe8ecf4, tankDark: 0x8e9dbf };
  var R0 = 0.9, R1 = 2.1, H = 2.0;     // radio interior, exterior y alto para amplitud 1
  var GAP = Math.PI / 180 * 1.5;       // mismo hueco entre cuñas que drawSectors
  var INSET = Math.PI / 20;            // la cuña de probabilidad es más angosta (como el cono 2D)

  // Mismos datos que usa el juego. Sin Quantum: amplitudes del contrato (k = 2, sector 3).
  var FALLBACK_AMPS = [0.972, -0.088];
  function defaultResult(target) {
    var amps = [], probs = [];
    for (var i = 0; i < 8; i++) { var re = i === target ? FALLBACK_AMPS[0] : FALLBACK_AMPS[1]; amps.push({ re: re, im: 0 }); probs.push(re * re); }
    return { amps: amps, probs: probs, theory: 0.945 };
  }
  function getResult(k, target) {
    try {
      var Q = window.Quantum;
      if (Q && typeof Q.runQuantum === 'function') {
        var r = Q.runQuantum({ k: k, target: target });
        if (r && r.amps && r.amps.length === 8 && r.probs && r.probs.length === 8) return r;
      }
    } catch (e) { /* cae al respaldo */ }
    return defaultResult(target);
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

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  var live = null;   // { renderer, scene, raf, onResize, container, canvas }

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

  function buildScene(T, container) {
    var w = Math.max(1, container.clientWidth || window.innerWidth), h = Math.max(1, container.clientHeight || window.innerHeight);
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    scene.add(buildTank(T));

    var result = getResult(2, 3), cols = [];
    layout(result).forEach(function (s) {
      var amp = Math.min(1, Math.abs(s.amp)) * H, col = new T.Mesh(
        wedgeGeometry(R0, R1, s.a0 + GAP, s.a1 - GAP),
        new T.MeshStandardMaterial({ color: s.negative ? PAL.neg : PAL.pos, roughness: 0.45, metalness: 0.05 }));
      col.scale.y = Math.max(0.03, amp);
      col.position.y = s.negative ? -Math.max(0.03, amp) : 0;   // amplitud negativa: la columna cuelga bajo el suelo
      scene.add(col);
      var cone = new T.Mesh(
        wedgeGeometry(R0 - 0.1, R1 - 0.2, s.a0 + GAP + INSET, s.a1 - GAP - INSET),
        new T.MeshBasicMaterial({ color: PAL.prob, transparent: true, opacity: 0.5, depthWrite: false }));
      cone.scale.y = Math.max(0.03, s.prob * H);
      scene.add(cone);
      cols.push(col, cone);
    });
    return { renderer: renderer, scene: scene, camera: camera, canvas: canvas, geoms: cols };
  }

  function frame(t) {
    if (!live) return;
    var a = t * 0.00012, r = 6.2;
    live.camera.position.set(r * Math.cos(a), 3.6, r * Math.sin(a));
    live.camera.lookAt(0, 0.4, 0);
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
      live = { renderer: s.renderer, scene: s.scene, camera: s.camera, canvas: s.canvas, container: container, raf: 0, meshes: s.geoms };
      live.onResize = function () {
        var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
        live.renderer.setSize(w, h, false); live.camera.aspect = w / h; live.camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', live.onResize);
      live.onVisibility = function () {
        if (document.hidden) { cancelAnimationFrame(live.raf); live.raf = 0; }
        else if (live && !live.raf && !reduce) live.raf = requestAnimationFrame(frame);
      };
      document.addEventListener('visibilitychange', live.onVisibility);
      if (reduce) { live.camera.position.set(4.6, 3.6, 4.2); live.camera.lookAt(0, 0.4, 0); live.renderer.render(live.scene, live.camera); }
      else live.raf = requestAnimationFrame(frame);
      return true;
    } catch (e) { stop(); return false; }
  }

  function stop() {
    if (!live) return;
    var l = live; live = null;
    cancelAnimationFrame(l.raf);
    window.removeEventListener('resize', l.onResize);
    document.removeEventListener('visibilitychange', l.onVisibility);
    l.scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    l.renderer.dispose();
    if (l.canvas && l.canvas.parentNode) l.canvas.parentNode.removeChild(l.canvas);
  }

  window.Intro3D = { start: start, stop: stop, layout: layout, polar: polar, defaultResult: defaultResult, getResult: getResult };
})();
