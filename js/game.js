// Collapse: motor de juego (Lucas).
// Solo habla con los demás módulos a través de window.Quantum y window.UI (contrato en TAREAS.md).
(function () {
  'use strict';

  const SECTORS = 8;
  const SECTOR_ANGLE = (Math.PI * 2) / SECTORS;

  const config = {
    world: { w: 2000, h: 1300 },
    bots: 5,
    playerSpeed: 230,
    botSpeed: 110,
    bulletSpeed: 620,
    bulletDamage: 20,
    searchDamage: 60,
    botBulletDamage: 6,
    fireCooldown: 0.25,
    botFireCooldown: 1.1,
    radarRange: 380,
    botSight: 450,
    energyMax: 100,
    energyRegen: 9,        // por segundo
    costPerQuery: 20,      // igual para una consulta clásica que para una iteración cuántica
    slowmoDuration: 1.1,   // segundos reales que se muestran las barras antes del tiro
    slowmoScale: 0.12,
    phaseNoise: 0,         // ruido del circuito (solo cuántico)
    sensorFlip: 0,         // ruido del sensor (afecta a ambos)
  };

  const Game = { config, log: [], history: [], state: null, start };
  window.Game = Game;

  let canvas, ctx;
  let dpr = 1;
  let running = false;
  let lastTime = 0;
  let world = null;
  let inputBound = false;
  const keys = {};
  const mouse = { x: 0, y: 0, down: false };

  // ---------- utilidades ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function sectorOf(from, to) {
    let a = Math.atan2(to.y - from.y, to.x - from.x);
    if (a < 0) a += Math.PI * 2;
    return Math.floor(a / SECTOR_ANGLE) % SECTORS;
  }

  function inFog(p) {
    return world.fog.some((f) => Math.hypot(p.x - f.x, p.y - f.y) < f.r);
  }

  function say(text) {
    world.msg = text;
    world.msgT = 1.8;
  }

  // ---------- mundo ----------
  function makeTank(x, y, isPlayer) {
    return {
      x, y, r: 18, hp: 100, angle: 0, isPlayer, alive: true,
      fireCd: rand(0, 1), wp: null, wait: 0, revealed: 0, flash: 0,
      color: isPlayer ? '#4fc3f7' : '#ff7a59',
    };
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
    const a = rand(0, Math.PI * 2), r = rand(0, f.r * 0.7);
    return { x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r };
  }

  function newWorld() {
    const W = config.world.w, H = config.world.h;
    const fog = [
      { x: W * 0.28, y: H * 0.35, r: 220 },
      { x: W * 0.72, y: H * 0.58, r: 260 },
      { x: W * 0.52, y: H * 0.16, r: 160 },
      { x: W * 0.18, y: H * 0.8, r: 150 },
    ];
    const player = makeTank(W / 2, H * 0.82, true);
    const bots = [];
    for (let i = 0; i < config.bots; i++) {
      const p = randomPoint(player, 450);
      bots.push(makeTank(p.x, p.y, false));
    }
    return {
      fog, player, bots,
      bullets: [], particles: [], tracers: [],
      energy: config.energyMax, cannon: 'classic', k: 1,
      search: null, lastResult: null,
      time: 0, shake: 0, msg: '', msgT: 0,
      over: false, endT: 0,
    };
  }

  function tanks() {
    return [world.player].concat(world.bots);
  }

  // ---------- combate ----------
  function fire(owner, angle, dmg) {
    world.bullets.push({
      x: owner.x + Math.cos(angle) * (owner.r + 6),
      y: owner.y + Math.sin(angle) * (owner.r + 6),
      vx: Math.cos(angle) * config.bulletSpeed,
      vy: Math.sin(angle) * config.bulletSpeed,
      owner, dmg, life: 1.3,
    });
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(60, 260);
      world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), color });
    }
  }

  function damage(t, dmg) {
    if (!t.alive) return;
    t.hp -= dmg;
    t.flash = 0.12;
    if (t.hp <= 0) {
      t.alive = false;
      burst(t.x, t.y, t.color, 26);
      if (t.isPlayer) say('Te eliminaron');
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

  function trySearch() {
    const w = world;
    if (!w || w.search || w.over || !w.player.alive) return;
    const bot = radarTarget();
    if (!bot) return say('El radar no detecta a nadie en la niebla');
    const cost = w.k * config.costPerQuery;
    if (w.energy < cost) return say('Energía insuficiente para k = ' + w.k);
    w.energy -= cost;

    const target = sectorOf(w.player, bot);
    const Q = window.Quantum;
    const result = w.cannon === 'quantum'
      ? Q.runQuantum({ k: w.k, target, phaseNoise: config.phaseNoise, sensorFlip: config.sensorFlip })
      : Q.runClassical({ k: w.k, target, sensorFlip: config.sensorFlip });
    w.search = { t: 0, bot, target, result, cannon: w.cannon, k: w.k };
  }

  function resolveSearch() {
    const w = world, s = w.search, p = w.player;
    w.search = null;
    const shot = window.Quantum.sample(s.result.probs);
    const hit = shot === s.target;
    const entry = { cannon: s.cannon, k: s.k, target: s.target, shot, hit, theory: s.result.theory, t: +w.time.toFixed(2) };
    Game.log.push(entry);
    Game.history.push(entry);

    const ang = hit ? Math.atan2(s.bot.y - p.y, s.bot.x - p.x) : (shot + 0.5) * SECTOR_ANGLE;
    w.tracers.push({ x: p.x, y: p.y, ang, len: hit ? dist(p, s.bot) : config.radarRange, life: 0.4, hit });
    w.lastResult = { result: s.result, cannon: s.cannon, life: 0.7 };

    if (hit) {
      damage(s.bot, config.searchDamage);
      s.bot.revealed = 1.2;
      burst(s.bot.x, s.bot.y, '#ffe066', 14);
      w.shake = Math.max(w.shake, 7);
      say('¡Acierto! Sector ' + shot);
    } else {
      say('Fallo: disparaste al sector ' + shot + ', estaba en el ' + s.target);
    }
  }

  // ---------- actualización ----------
  function updatePlayer(dt) {
    const p = world.player;
    if (!p.alive) return;
    let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    p.x = clamp(p.x + (mx / len) * config.playerSpeed * dt, p.r, config.world.w - p.r);
    p.y = clamp(p.y + (my / len) * config.playerSpeed * dt, p.r, config.world.h - p.r);

    const m = screenToWorld(mouse.x, mouse.y);
    p.angle = Math.atan2(m.y - p.y, m.x - p.x);
    p.fireCd -= dt;
    if (mouse.down && p.fireCd <= 0 && !world.search) {
      fire(p, p.angle, config.bulletDamage);
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
    for (const b of world.bots) {
      if (!b.alive) continue;
      b.fireCd -= dt;
      b.revealed -= dt;
      const hidden = inFog(b);
      const enemy = nearestVisibleEnemy(b);

      if (enemy && !hidden) {
        // Pelea: mantener distancia y orbitar mientras dispara.
        const a = Math.atan2(enemy.y - b.y, enemy.x - b.x);
        b.angle = a;
        const d = dist(b, enemy);
        const forward = d > 260 ? 1 : d < 180 ? -1 : 0;
        const vx = Math.cos(a) * forward + Math.cos(a + Math.PI / 2) * 0.6;
        const vy = Math.sin(a) * forward + Math.sin(a + Math.PI / 2) * 0.6;
        b.x += vx * config.botSpeed * dt;
        b.y += vy * config.botSpeed * dt;
        if (b.fireCd <= 0) {
          fire(b, a + rand(-0.18, 0.18), config.botBulletDamage);
          b.fireCd = config.botFireCooldown + rand(0, 0.5);
        }
      } else if (b.wait > 0) {
        // Acampando (normalmente dentro de la niebla).
        b.wait -= dt;
      } else {
        if (!b.wp) b.wp = Math.random() < 0.6 ? pointInFog() : randomPoint();
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
      for (const t of list) {
        if (t === u.owner || !t.alive) continue;
        if (Math.hypot(u.x - t.x, u.y - t.y) < t.r + 4) {
          damage(t, u.dmg);
          if (!t.isPlayer) t.revealed = Math.max(t.revealed, 0.4);
          burst(u.x, u.y, '#ffffff', 4);
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
  }

  function checkEnd(dtReal) {
    const w = world;
    if (!w.over) {
      const botsLeft = w.bots.filter((b) => b.alive).length;
      if (!w.player.alive || botsLeft === 0) {
        w.over = true;
        w.endT = 1.3;
        if (w.player.alive) say('¡Último en pie!');
      }
      return;
    }
    w.endT -= dtReal;
    if (w.endT <= 0) {
      running = false;
      mouse.down = false;
      if (window.UI && UI.showEnd) UI.showEnd(Game.log, start);
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
    updateBots(dt);
    updateBullets(dt);
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
    cam.x = W <= v.w ? (W - v.w) / 2 : clamp(p.x - v.w / 2, 0, W - v.w);
    cam.y = H <= v.h ? (H - v.h) / 2 : clamp(p.y - v.h / 2, 0, H - v.h);
  }

  function screenToWorld(sx, sy) {
    return { x: sx + cam.x, y: sy + cam.y };
  }

  function drawTank(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = '#8a93a6';
    ctx.strokeStyle = '#5b6375';
    ctx.lineWidth = 3;
    ctx.fillRect(t.r * 0.3, -6, t.r * 1.2, 12);
    ctx.strokeRect(t.r * 0.3, -6, t.r * 1.2, 12);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = t.flash > 0 ? '#ffffff' : t.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    if (!t.isPlayer) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(t.x - 20, t.y - t.r - 12, 40, 5);
      ctx.fillStyle = '#7bd88f';
      ctx.fillRect(t.x - 20, t.y - t.r - 12, 40 * Math.max(0, t.hp) / 100, 5);
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

    for (const u of world.bullets) {
      ctx.beginPath();
      ctx.arc(u.x, u.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = u.owner.isPlayer ? '#9be7ff' : '#ffb199';
      ctx.fill();
    }

    for (const b of world.bots) {
      if (b.alive && (!inFog(b) || b.revealed > 0)) drawTank(b);
    }
    const p = world.player;
    if (p.alive) {
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

    // Niebla (encima de todo lo del mundo)
    for (const f of world.fog) {
      const g = ctx.createRadialGradient(f.x, f.y, f.r * 0.55, f.x, f.y, f.r);
      g.addColorStop(0, 'rgba(150,160,185,0.55)');
      g.addColorStop(1, 'rgba(150,160,185,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const t of world.tracers) {
      ctx.strokeStyle = t.hit ? 'rgba(255,224,102,' + t.life * 2.5 + ')' : 'rgba(255,255,255,' + t.life * 2 + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.ang) * t.len, t.y + Math.sin(t.ang) * t.len);
      ctx.stroke();
    }

    // Radar: anillo de alcance y división en 8 sectores
    if (p.alive && radarTarget()) {
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
      k: w.k,
      radar: !!(w.player.alive && radarTarget()),
      hp: Math.max(0, w.player.hp),
      botsLeft: w.bots.filter((b) => b.alive).length,
      cost: w.k * config.costPerQuery,
      costPerQuery: config.costPerQuery,
      searching: !!w.search,
    };
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

    if (world.msgT > 0) {
      ctx.globalAlpha = Math.min(1, world.msgT * 2);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(world.msg, v.w / 2, v.h - 40);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
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
      if (e.code === 'KeyQ') world.k = Math.max(0, world.k - 1);
      if (e.code === 'KeyE') world.k = Math.min(3, world.k + 1);
      if (e.code === 'Space') trySearch();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    canvas.addEventListener('mousemove', (e) => {
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

  function start() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    if (!inputBound) bindInput();
    resize();
    world = newWorld();
    Game.state = world;
    Game.log = [];
    mouse.down = false;
    if (!running) {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  }
})();
