
/* =====================================================================
   PARTICLES — pooled CPU simulation, GPU points + rain lines
   ===================================================================== */
const FX = {
  max: 6000, n: 0, S: 14,
  init() { const M = this.max; this.p = new Float32Array(M * this.S); this.out = new Float32Array(M * 5); this.outU = new Uint8Array(this.out.buffer); this.lines = new Float32Array(4000 * 10); this.linesU = new Uint8Array(this.lines.buffer); },
  cap() { return [900, 2000, 4000, 6000][R.Q.particles] || 2000; },
  // layout: x y z vx vy vz life maxlife size(neg=additive) r g b grav wind
  spawn(x, y, z, vx, vy, vz, life, size, c, add = false, grav = 1, wind = 0) {
    if (this.n >= this.cap()) return; const o = this.n++ * this.S, p = this.p; p[o] = x; p[o + 1] = y; p[o + 2] = z; p[o + 3] = vx; p[o + 4] = vy; p[o + 5] = vz; p[o + 6] = life; p[o + 7] = life;
    p[o + 8] = add ? -size : size; p[o + 9] = c[0]; p[o + 10] = c[1]; p[o + 11] = c[2]; p[o + 12] = grav; p[o + 13] = wind; },
  burst(x, y, z, n, c, sp = 2, life = .8, size = .5, add = false, grav = 1) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = Math.random() * 2 - 1, s = sp * (.3 + Math.random() * .7), q = Math.sqrt(1 - e * e); this.spawn(x, y, z, Math.cos(a) * s * q, Math.abs(e) * s + sp * .2, Math.sin(a) * s * q, life * (.5 + Math.random() * .5), size * (.6 + Math.random() * .8), c, add, grav); } },
  dust(x, y, z, n, c) { for (let i = 0; i < n; i++) this.spawn(x + (Math.random() - .5) * .3, y, z + (Math.random() - .5) * .3, (Math.random() - .5) * .8, Math.random() * .7, (Math.random() - .5) * .8, .6 + Math.random() * .6, .7, c, false, .1, .6); },
  leaf(x, y, z, c) { this.spawn(x, y, z, (Math.random() - .5), 1 + Math.random(), (Math.random() - .5), 1.5, .6, c, false, .25, 1); },
  splash(x, y, z, k = 1) { for (let i = 0; i < 6 * k; i++) this.spawn(x, y + .05, z, (Math.random() - .5) * 2, 1.5 + Math.random() * 2, (Math.random() - .5) * 2, .5, .5, [.7, .85, .95], false, 1); },
  steam(x, y, z, n) { for (let i = 0; i < n; i++) this.spawn(x + (Math.random() - .5) * .3, y, z + (Math.random() - .5) * .3, (Math.random() - .5) * .5, 1 + Math.random(), (Math.random() - .5) * .5, 1.2, 1, [.8, .82, .85], false, -.1, .5); },
  sparks(x, y, z, n, c = [1, .7, .3]) { for (let i = 0; i < n; i++) this.spawn(x, y, z, (Math.random() - .5) * 5, Math.random() * 4, (Math.random() - .5) * 5, .4 + Math.random() * .3, .4, c, true, 1); },
  ring(x, y, z, r, n, c) { for (let i = 0; i < n; i++) { const a = i / n * TAU; this.spawn(x + Math.cos(a) * r * .2, y, z + Math.sin(a) * r * .2, Math.cos(a) * r * 2, .3, Math.sin(a) * r * 2, .5, .6, c, true, 0); } },
  update(dt, wind) {
    const p = this.p, S = this.S; let w = 0; const out = this.out, ou = this.outU; const hf = World.hf;
    for (let i = 0; i < this.n; i++) {
      const o = i * S; p[o + 6] -= dt; if (p[o + 6] <= 0) continue;
      const grav = p[o + 12], wk = p[o + 13];
      p[o + 4] -= 9 * grav * dt; p[o + 3] += wind[0] * wind[2] * wk * 3 * dt; p[o + 5] += wind[1] * wind[2] * wk * 3 * dt;
      const dr = Math.pow(.6, dt); p[o + 3] *= dr; p[o + 5] *= dr; if (grav < .5) p[o + 4] *= dr;
      p[o] += p[o + 3] * dt; p[o + 1] += p[o + 4] * dt; p[o + 2] += p[o + 5] * dt;
      if (grav > 0 && hf) { const gh = hf.at(p[o], p[o + 2]); if (p[o + 1] < gh) { p[o + 1] = gh; p[o + 4] *= -.3; p[o + 3] *= .5; p[o + 5] *= .5; } }
      if (w !== i) p.copyWithin(w * S, o, o + S);
      const q = w * S, t = p[q + 6] / p[q + 7], k = w * 5; out[k] = p[q]; out[k + 1] = p[q + 1]; out[k + 2] = p[q + 2];
      const cb = (k + 3) * 4; ou[cb] = clamp(p[q + 9], 0, 1) * 255; ou[cb + 1] = clamp(p[q + 10], 0, 1) * 255; ou[cb + 2] = clamp(p[q + 11], 0, 1) * 255; ou[cb + 3] = Math.min(1, t * 1.5) * 255; out[k + 4] = p[q + 8] * (.5 + t * .5);
      w++;
    }
    this.n = w; return w;
  },
};

/* =====================================================================
   COMBAT — aim solving, projectiles, burst, melee, blasts
   ===================================================================== */
const Combat = {
  shots: [],
  computeAim(pl) {
    const c = pl.ch, r = Cam.rig(), mz = c.muzzle || [c.x, c.y + 1.3, c.z];
    let dir;
    if ((r.orbit || r.id === 'close') && !Player.lock) { const f = Cam.forward(); const tgt = [Cam.eye[0] + f[0] * 60, Cam.eye[1] + f[1] * 60, Cam.eye[2] + f[2] * 60]; const h = World.ray(Cam.eye, tgt, .5); const d = h > 0 ? h : 60; const T = [Cam.eye[0] + f[0] * d, Cam.eye[1] + f[1] * d, Cam.eye[2] + f[2] * d]; dir = [T[0] - mz[0], T[1] - mz[1], T[2] - mz[2]]; }
    else if (Input.device === 'kb' && !Input.locked && !Player.lock && R.vp) { // mouse cursor → plane at chest height
      const nx = Input.mouse.x / innerWidth * 2 - 1, ny = 1 - Input.mouse.y / innerHeight * 2; const ivp = R.mats.ivp; const a = M4.xform(ivp, nx, ny, -1), b = M4.xform(ivp, nx, ny, 1);
      const py = c.y + 1.1; const t = (py - a[1]) / (b[1] - a[1] || 1e-6); const hx = lerp(a[0], b[0], t), hz = lerp(a[2], b[2], t); dir = [hx - c.x, 0, hz - c.z];
      const e = this.bestTarget(pl, .25, 30, [dir[0], dir[2]]); if (e) dir = [e.x - mz[0], (e.y + e.aimH) - mz[1], e.z - mz[2]];
    } else { const f = [Math.sin(c.yaw), Math.cos(c.yaw)]; const e = Player.lock || this.bestTarget(pl, .2 + Settings.v.aimAssist * .5, 32, f); dir = e ? [e.x - mz[0], (e.y + e.aimH) - mz[1], e.z - mz[2]] : [f[0], 0, f[1]]; }
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1; pl.aimDir = [dir[0] / l, dir[1] / l, dir[2] / l]; c.anim.aimPitch = -Math.asin(clamp(pl.aimDir[1], -.9, .9));
  },
  bestTarget(pl, cone, range, fwd) {
    const c = pl.ch; fwd = fwd || [Math.sin(c.yaw), Math.cos(c.yaw)]; const fl = Math.hypot(fwd[0], fwd[1]) || 1; let best = null, bs = 1e9;
    for (const e of Enemies.list) { if (e.dead || e.hidden) continue; const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz); if (d > range || d < .1) continue;
      const ang = Math.acos(clamp((dx * fwd[0] + dz * fwd[1]) / (d * fl), -1, 1)); if (ang > cone) continue; const s = ang * 10 + d * .15; if (s < bs && World.los([c.x, c.y + 1.3, c.z], [e.x, e.y + e.aimH, e.z])) { bs = s; best = e; } }
    return best;
  },
  fire(pl, W) {
    const c = pl.ch, mz = c.muzzle || [c.x, c.y + 1.3, c.z], d = pl.aimDir; const n = W.pellets || 1; const dmgK = 1 + Game.up('damage') * .2;
    Audio2.sfx(W.id === 'pulse' ? 'shot' : W.id); Cam.shake(W.id === 'lance' ? .3 : W.id === 'scatter' ? .2 : .04); Input.rumble(.2, 40);
    for (let i = 0; i < n; i++) { const s = W.spread; const dx = d[0] + (Math.random() - .5) * s * 2, dy = d[1] + (Math.random() - .5) * s, dz = d[2] + (Math.random() - .5) * s * 2; const l = Math.hypot(dx, dy, dz);
      this.shots.push({ x: mz[0], y: mz[1], z: mz[2], vx: dx / l * W.speed, vy: dy / l * W.speed, vz: dz / l * W.speed, life: W.id === 'scatter' ? .35 : 1.2, dmg: W.dmg * dmgK, own: 'p', col: W.col, pierce: W.pierce ? 4 : 0, hitSet: new Set(), r: W.id === 'lance' ? .5 : .3, big: W.id === 'lance' }); }
    Game.flashLight(mz[0], mz[1], mz[2], W.col, 6, .08); FX.sparks(mz[0], mz[1], mz[2], 3, W.col);
  },
  enemyShot(x, y, z, tx, ty, tz, speed, dmg, col, o = {}) { const dx = tx - x, dy = ty - y, dz = tz - z, l = Math.hypot(dx, dy, dz) || 1; this.shots.push(Object.assign({ x, y, z, vx: dx / l * speed, vy: dy / l * speed, vz: dz / l * speed, life: 3, dmg, own: 'e', col, r: .45, hitSet: new Set() }, o)); },
  update(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.life -= dt; let dead = s.life <= 0; const steps = Math.ceil(Math.hypot(s.vx, s.vy, s.vz) * dt / .4);
      if (s.homing && !dead) { const p = Player.ch; const dx = p.x - s.x, dy = p.y + 1 - s.y, dz = p.z - s.z, l = Math.hypot(dx, dy, dz) || 1, sp = Math.hypot(s.vx, s.vy, s.vz); s.vx = lerp(s.vx, dx / l * sp, dt * s.homing); s.vy = lerp(s.vy, dy / l * sp, dt * s.homing); s.vz = lerp(s.vz, dz / l * sp, dt * s.homing); }
      for (let k = 0; k < steps && !dead; k++) {
        s.x += s.vx * dt / steps; s.y += s.vy * dt / steps; s.z += s.vz * dt / steps; if (s.grav) s.vy -= 9 * dt / steps;
        if (World.solid(s.x, s.y, s.z)) { dead = true; FX.sparks(s.x, s.y, s.z, 5, s.col); Audio2.sfx('hit', [s.x, s.y, s.z]); if (s.splash) this.blast(s.x, s.y, s.z, s.splash, s.dmg * .6, 'acid'); break; }
        if (s.own === 'p') {
          for (const e of Enemies.list) { if (e.dead || s.hitSet.has(e) || e.hidden) continue; const dx = e.x - s.x, dy = (e.y + e.aimH) - s.y, dz = e.z - s.z; const rr = e.radius + s.r; if (dx * dx + dy * dy * .5 + dz * dz < rr * rr) { s.hitSet.add(e); Enemies.damage(e, s.dmg, [s.vx, s.vz], s); if (s.pierce-- <= 0) { dead = true; break; } } }
          for (const p of World.props) { const dx = p.x - s.x, dy = p.y - s.y, dz = p.z - s.z; if (dx * dx + dy * dy + dz * dz < (p.r + .2) ** 2) { Props.damage(p, s.dmg, s.vx * .1, s.vz * .1); dead = true; break; } }
          for (const t of World.inter) if (t.shootable && !t.done && dist2(t.x, t.z, s.x, s.z) < (t.sr || .8) ** 2 && Math.abs(t.y + 1 - s.y) < 1.5) { t.shootable(t); dead = true; FX.sparks(s.x, s.y, s.z, 10, [.4, .9, 1]); }
        } else { const p = Player.ch; const dx = p.x - s.x, dy = p.y + 1 - s.y, dz = p.z - s.z; if (dx * dx + dy * dy * .5 + dz * dz < (s.r + .4) ** 2) { if (Player.hurt(s.dmg, [s.x, s.y, s.z])) { } dead = true; FX.sparks(s.x, s.y, s.z, 6, s.col); if (s.splash) this.blast(s.x, s.y, s.z, s.splash, 0, 'acid'); } }
      }
      if (World.water && s.y < World.water.h && !s.wet) { s.wet = 1; FX.splash(s.x, World.water.h, s.z, 1); Game.ripple(s.x, s.z, 1); }
      if (dead) this.shots.splice(i, 1);
    }
  },
  draw() { for (const s of this.shots) { const l = Math.hypot(s.vx, s.vy, s.vz) || 1; const ry = Math.atan2(s.vx, s.vz), rx = -Math.asin(s.vy / l); const len = s.big ? 1.6 : s.own === 'e' ? .45 : .7, w = s.big ? .16 : s.own === 'e' ? .28 : .08;
    A34.trs(_W, s.x, s.y, s.z, ry, rx, 0, w, w, len); R.inst(s.own === 'e' ? 'ico' : 'cube', _W, s.col[0], s.col[1], s.col[2], 1, F_UNLIT); } },
  burst(x, y, z) {
    Audio2.sfx('burst', [x, y, z]); Cam.shake(.45); Input.rumble(.8, 220); FX.ring(x, y - .6, z, 6, 60, [.4, .95, 1]); FX.burst(x, y, z, 30, [.6, 1, 1], 4, .7, .6, true, 0);
    Game.pulse = { x, z, t: 0 }; Game.flashLight(x, y, z, [.4, .9, 1], 12, .3); Player.noise = 25;
    for (const e of Enemies.list) { if (e.dead || e.isBoss) continue; const d = Math.hypot(e.x - x, e.z - z); if (d < 6.5) { const k = 1 - d / 6.5; Enemies.damage(e, 14 * (1 + Game.up('burst') * .3) * k + 4, [(e.x - x) / (d || 1) * 30, (e.z - z) / (d || 1) * 30], { burst: true }); e.stagger += 1.2; e.vx = (e.x - x) / (d || 1) * 9 * k * (e.heavy ? .3 : 1); e.vz = (e.z - z) / (d || 1) * 9 * k * (e.heavy ? .3 : 1); } }
    for (const p of World.props) { const d = Math.hypot(p.x - x, p.z - z); if (d < 7) Props.impulse(p, (p.x - x) / (d || 1) * 18 * p.m * (1 - d / 7), 4 * p.m, (p.z - z) / (d || 1) * 18 * p.m * (1 - d / 7)); }
    for (const t of World.inter) if (t.onBurst && dist2(t.x, t.z, x, z) < (t.br || 7) ** 2) t.onBurst(t);
    if (Boss.active && Boss.b) Boss.onBurst(x, z);
  },
  melee(pl) { const c = pl.ch, f = [Math.sin(c.yaw), Math.cos(c.yaw)]; let hit = false;
    for (const e of Enemies.list) { if (e.dead) continue; const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz); if (d < 2.3 + e.radius && (dx * f[0] + dz * f[1]) / (d || 1) > .35) { Enemies.damage(e, 24 * (1 + Game.up('damage') * .15), [f[0] * 20, f[1] * 20], { melee: true }); e.stagger += .9; hit = true; } }
    for (const p of World.props) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d < 2) { Props.damage(p, 15, f[0] * 10 * p.m, f[1] * 10 * p.m); hit = true; } }
    for (const t of World.inter) if (t.onMelee && dist2(t.x, t.z, c.x, c.z) < 6) t.onMelee(t);
    if (hit) { Cam.shake(.2); Game.hitstop = .05; } FX.ring(c.x + f[0] * 1.2, c.y + 1, c.z + f[1] * 1.2, 1, 10, [1, .8, .5]); },
  blast(x, y, z, r, dmg, kind) { FX.burst(x, y, z, 30, kind === 'cold' ? [.7, .95, 1] : kind === 'acid' ? [.6, 1, .3] : [1, .6, .2], 5, .8, .8, true); Cam.shake(.3);
    for (const e of Enemies.list) { if (e.dead || e.isBoss) continue; const d = Math.hypot(e.x - x, e.z - z); if (d < r) { Enemies.damage(e, dmg * (1 - d / r), [(e.x - x) * 5, (e.z - z) * 5], { kind }); if (kind === 'cold') e.frozen = 3; } }
    if (Boss.active && Boss.b) { const b = Boss.b; const d = Math.hypot(b.x - x, b.z - z); if (d < r + b.radius && kind === 'cold') Boss.onCold(); }
    const p = Player.ch, d = Math.hypot(p.x - x, p.z - z); if (d < r && dmg > 0 && kind !== 'cold') Player.hurt(dmg * .5 * (1 - d / r), [x, y, z]); },
};

/* =====================================================================
   ENEMIES — Echoed ecosystem with perception + state machines
   ===================================================================== */
const ETYPES = {
  drifter: { name: 'Echoed Drifter', hp: 40, speed: 1.3, chase: 3.1, radius: .45, aimH: 1.1, sight: 13, hear: 16, atk: 'swipe', dmg: 11, range: 1.6, cd: 1.3, salv: 2, col: [.42, .4, .48], glow: [.4, .95, 1] },
  stalker: { name: 'Echoed Stalker', hp: 32, speed: 2, chase: 6.2, radius: .5, aimH: .6, sight: 11, hear: 12, atk: 'lunge', dmg: 15, range: 4.5, cd: 2, salv: 3, col: [.2, .2, .26], glow: [1, .35, .5], hides: true, fearLight: true },
  watcher: { name: 'Echoed Watcher', hp: 34, speed: 1.4, chase: 2.4, radius: .55, aimH: 2.2, sight: 22, hear: 10, atk: 'bolt', dmg: 9, range: 16, cd: 2.2, salv: 3, col: [.55, .5, .6], glow: [1, .7, .3], fly: 2.2, keep: 9 },
  burrower: { name: 'Echoed Burrower', hp: 50, speed: 2.4, chase: 4.8, radius: .6, aimH: .5, sight: 0, hear: 18, atk: 'erupt', dmg: 16, range: 1.8, cd: 2.4, salv: 4, col: [.35, .28, .22], glow: [1, .5, .2], burrow: true },
  crawler: { name: 'Echoed Crawler', hp: 18, speed: 2.5, chase: 5.5, radius: .4, aimH: .35, sight: 9, hear: 11, atk: 'bite', dmg: 7, range: 1.2, cd: .9, salv: 1, col: [.3, .32, .28], glow: [.6, 1, .4] },
  mimic: { name: 'Echoed Mimic', hp: 45, speed: 1.6, chase: 4, radius: .55, aimH: 1, sight: 6, hear: 6, atk: 'swipe', dmg: 14, range: 1.8, cd: 1.2, salv: 5, col: [.3, .32, .36], glow: [.4, .95, 1], mimic: true },
  brute: { name: 'Echoed Brute', hp: 170, speed: .9, chase: 2.4, radius: 1.1, aimH: 1.8, sight: 14, hear: 14, atk: 'charge', dmg: 24, range: 7, cd: 3.2, salv: 8, col: [.38, .34, .4], glow: [1, .4, .3], heavy: true, backWeak: true },
  swarm: { name: 'Resonance Swarm', hp: 7, speed: 3, chase: 6.5, radius: .25, aimH: 1.2, sight: 12, hear: 14, atk: 'touch', dmg: 4, range: .8, cd: .7, salv: 0, col: [.6, .9, 1], glow: [.6, .95, 1], fly: 1.2, small: true },
};
const Enemies = {
  list: [], alertLevel: 0,
  spawn(type, x, z, o = {}) { const T = ETYPES[type]; const e = Object.assign({ type, T, x, z, y: World.hf.at(x, z), vx: 0, vz: 0, yaw: Math.random() * TAU, hp: T.hp * (o.hpMul || 1), maxHp: T.hp * (o.hpMul || 1), state: 'idle', st: 0, home: [x, z], wp: null, lastSeen: null, aware: 0, cd: 1, stagger: 0, flash: 0, phase: Math.random() * 10,
    radius: T.radius, aimH: T.aimH, heavy: T.heavy, dead: false, hidden: !!T.burrow, disguised: !!T.mimic, anim: { t: 0, atk: 0 }, patrol: o.patrol, id: Math.random() }, o); this.list.push(e); return e; },
  clear() { this.list = []; },
  damage(e, dmg, kb, src = {}) {
    if (e.isBoss) return Boss.damage(dmg, src);
    if (e.dead) return; if (e.hidden && !src.burst) return; if (e.disguised) this.reveal(e);
    let k = 1; if (e.T.backWeak) { const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), dx = Player.x - e.x, dz = Player.z - e.z; if (dx * fx + dz * fz < 0) { k = 2; Audio2.sfx('crit', [e.x, e.y, e.z]); } }
    if (e.marked > 0) k *= 1.25; if (e.frozen > 0) k *= 1.5;
    e.hp -= dmg * k; e.flash = .12; e.stagger += dmg * k / (e.heavy ? 90 : 30); if (kb) { e.vx += kb[0] * (e.heavy ? .02 : .08); e.vz += kb[1] * (e.heavy ? .02 : .08); }
    Audio2.sfx('echo_hurt', [e.x, e.y + 1, e.z]); FX.burst(e.x, e.y + e.aimH, e.z, 6, e.T.glow, 2, .4, .45, true);
    if (e.state !== 'chase' && e.state !== 'attack') this.alert(e, [Player.x, Player.y, Player.z]);
    Game.dmgNumber(e.x, e.y + e.aimH + .6, Math.round(dmg * k), k > 1);
    if (e.hp <= 0) this.kill(e);
  },
  kill(e) { e.dead = true; e.deadT = 0; Audio2.sfx('echo_die', [e.x, e.y + 1, e.z]); FX.burst(e.x, e.y + e.aimH, e.z, 40, e.T.glow, 3, 1.4, .7, true, -.2); FX.burst(e.x, e.y + e.aimH, e.z, 20, e.T.col, 2, 1, .6);
    if (e.T.salv) Game.addSalvage(e.T.salv, e.x, e.y + 1, e.z); Game.onKill(e); if (Player.lock === e) Player.lock = null; },
  reveal(e) { e.disguised = false; e.state = 'chase'; Audio2.sfx('echo_alert', [e.x, e.y + 1, e.z]); FX.burst(e.x, e.y + 1, e.z, 25, e.T.glow, 3, .8, .6, true); Game.cue('Mimic!'); },
  alert(e, pos) { if (e.disguised) return; const was = e.state; e.lastSeen = pos.slice(); e.state = 'chase'; e.st = 0; if (was !== 'chase') { Audio2.sfx('echo_alert', [e.x, e.y + 1, e.z]); if (Settings.v.audioCues) Game.cue(e.T.name + ' alerted — ' + Game.dirName(e.x, e.z)); }
    for (const o of this.list) if (o !== e && !o.dead && o.state !== 'chase' && dist2(o.x, o.z, e.x, e.z) < 100) { o.lastSeen = pos.slice(); o.state = 'investigate'; o.st = 0; } },
  hear(x, z, loud) { for (const e of this.list) { if (e.dead || e.disguised) continue; const d = Math.hypot(e.x - x, e.z - z); const range = Math.min(e.T.hear, loud) * Game.hearMul(); if (d < range && (e.state === 'idle' || e.state === 'patrol' || e.state === 'search' || e.state === 'return')) { e.state = 'investigate'; e.lastSeen = [x, 0, z]; e.st = 0; if (Math.random() < .5) Audio2.sfx('echo_call', [e.x, e.y + 1, e.z], .6); } } },
  canSee(e) {
    const p = Player.ch, T = e.T; if (!T.sight) return false; const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
    let range = T.sight * Game.sightMul() * (p.crouch ? .6 : 1) * (Player.lamp ? 1.35 : 1); if (d > range) return false;
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw); const dot = (dx * fx + dz * fz) / (d || 1); if (dot < (e.state === 'chase' ? -1 : .2) && d > 2.5) return false;
    return World.los([e.x, e.y + e.aimH + .2, e.z], [p.x, p.y + 1.3, p.z]);
  },
  // steering with obstacle feelers so enemies route around cover instead of beelining
  steer(e, tx, tz, speed, dt) {
    let dx = tx - e.x, dz = tz - e.z; const d = Math.hypot(dx, dz); if (d < .05) return d; dx /= d; dz /= d;
    for (const a of [0, .6, -.6, 1.2, -1.2, 1.9, -1.9]) { const ca = Math.cos(a), sa = Math.sin(a); const fx = dx * ca - dz * sa, fz = dx * sa + dz * ca; const px = e.x + fx * 1.4, pz = e.z + fz * 1.4;
      const gh = World.ground(px, pz, e.y + .6).h; if (e.T.fly || (Math.abs(gh - e.y) < .7 && !World.solid(px, e.y + .8, pz))) { dx = fx; dz = fz; break; } }
    // separation
    for (const o of this.list) { if (o === e || o.dead) continue; const ox = e.x - o.x, oz = e.z - o.z, od = ox * ox + oz * oz, m = e.radius + o.radius + .3; if (od < m * m && od > 1e-4) { const k = (m - Math.sqrt(od)) * 2; dx += ox * k; dz += oz * k; } }
    const l = Math.hypot(dx, dz) || 1; const k = 1 - Math.exp(-dt * 6); e.vx = lerp(e.vx, dx / l * speed, k); e.vz = lerp(e.vz, dz / l * speed, k);
    e.yaw = lerpAng(e.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8)); return d;
  },
  update(dt) {
    const p = Player.ch; let threat = 0; const darkK = Game.darkness();
    for (const e of this.list) {
      if (e.isBoss) continue;
      if (e.dead) { e.deadT += dt; continue; }
      const T = e.T; e.st += dt; e.cd -= dt; e.flash -= dt; e.anim.t += dt; e.marked = Math.max(0, (e.marked || 0) - dt); if (e.frozen > 0) { e.frozen -= dt; e.vx *= .9; e.vz *= .9; continue; }
      if (dist2(e.x, e.z, p.x, p.z) > 3600 && e.state !== 'chase') { continue; } // distant enemies sleep (AI LOD)
      e.stagger = Math.max(0, e.stagger - dt * .8);
      if (e.stagger > 1 && e.state !== 'stagger') { e.state = 'stagger'; e.st = 0; e.stagger = 0; }
      const dP = Math.hypot(p.x - e.x, p.z - e.z), sees = !Player.dead && this.canSee(e);
      if (sees && e.state !== 'stagger' && e.state !== 'attack') { e.aware = Math.min(1.5, e.aware + dt * (dP < 5 ? 4 : 1.6)); if (e.aware >= 1 && e.state !== 'chase') this.alert(e, [p.x, p.y, p.z]); }
      else e.aware = Math.max(0, e.aware - dt * .4);
      if (sees) e.lastSeen = [p.x, p.y, p.z];
      // hearing player noise
      if (Player.noise > 0 && dP < Player.noise * Game.hearMul() && (e.state === 'idle' || e.state === 'patrol' || e.state === 'return')) { e.state = 'investigate'; e.lastSeen = [p.x, p.y, p.z]; e.st = 0; }
      // fear of light
      if (T.fearLight && Player.lamp && dP < 8 && e.state === 'chase' && Math.random() < dt) { e.state = 'evade'; e.st = 0; }
      if (e.disguised) { if (dP < 3.2) this.reveal(e); else { e.vx = e.vz = 0; this.integrate(e, dt); continue; } }
      if (e.state === 'chase' || e.state === 'attack') threat = Math.max(threat, e.heavy ? 2 : 1);
      switch (e.state) {
        case 'idle': e.vx *= .9; e.vz *= .9; if (e.st > 2 + Math.random() * 3) { e.state = 'patrol'; e.st = 0; e.wp = e.patrol ? e.patrol[(e.pi = ((e.pi || 0) + 1) % e.patrol.length)] : [e.home[0] + (Math.random() - .5) * 14, e.home[1] + (Math.random() - .5) * 14]; } if (Math.random() < dt * .1) Audio2.sfx('echo_call', [e.x, e.y + 1, e.z], .4); break;
        case 'patrol': if (this.steer(e, e.wp[0], e.wp[1], T.speed, dt) < 1 || e.st > 12) { e.state = Math.random() < .3 ? 'listen' : 'idle'; e.st = 0; } break;
        case 'listen': e.vx *= .8; e.vz *= .8; e.yaw += Math.sin(e.st * 2) * dt; if (e.st > 2.5) { e.state = 'idle'; e.st = 0; } break;
        case 'investigate': if (!e.lastSeen || this.steer(e, e.lastSeen[0], e.lastSeen[2], T.speed * 1.6, dt) < 1.5 || e.st > 10) { e.state = 'search'; e.st = 0; } break;
        case 'search': if (!e.wp || e.st % 3 < dt) e.wp = [(e.lastSeen ? e.lastSeen[0] : e.x) + (Math.random() - .5) * 8, (e.lastSeen ? e.lastSeen[2] : e.z) + (Math.random() - .5) * 8]; this.steer(e, e.wp[0], e.wp[1], T.speed, dt); if (e.st > 8) { e.state = 'return'; e.st = 0; } break;
        case 'return': if (this.steer(e, e.home[0], e.home[1], T.speed, dt) < 1.5) { e.state = 'idle'; e.st = 0; } break;
        case 'evade': { const ax = e.x - p.x, az = e.z - p.z, l = Math.hypot(ax, az) || 1; this.steer(e, e.x + ax / l * 5, e.z + az / l * 5, T.chase, dt); if (e.st > 1.8) { e.state = 'chase'; e.st = 0; } break; }
        case 'stagger': e.vx *= .85; e.vz *= .85; if (e.st > (e.heavy ? 1.6 : .9)) { e.state = 'chase'; e.st = 0; } break;
        case 'chase': {
          if (e.hidden && dP < 2.6) { e.hidden = false; e.state = 'attack'; e.st = 0; e.anim.atk = 0; Audio2.sfx('break', [e.x, e.y, e.z]); FX.burst(e.x, e.y, e.z, 30, World.region.dustCol, 4, 1, .9); Cam.shake(.3); break; }
          const tgt = sees ? [p.x, p.z] : e.lastSeen ? [e.lastSeen[0], e.lastSeen[2]] : e.home;
          if (T.keep && dP < T.keep && sees) { const ax = e.x - p.x, az = e.z - p.z, l = Math.hypot(ax, az) || 1; this.steer(e, e.x + ax / l * 3 + az / l * 2, e.z + az / l * 3 - ax / l * 2, T.chase, dt); }
          else { const d = this.steer(e, tgt[0], tgt[1], e.hidden ? T.chase * 1.2 : T.chase, dt); if (!sees && d < 1.5) { e.state = 'search'; e.st = 0; } }
          if (sees) e.yaw = lerpAng(e.yaw, Math.atan2(p.x - e.x, p.z - e.z), dt * 6);
          if (dP < T.range && e.cd <= 0 && sees && !e.hidden) { e.state = 'attack'; e.st = 0; e.anim.atk = 0; e.atkDir = [p.x - e.x, p.z - e.z]; if (T.atk === 'charge' || T.atk === 'lunge') Audio2.sfx('tele', [e.x, e.y + 1, e.z]); }
          if (e.hidden && Math.random() < dt * 10) FX.dust(e.x, e.y + .05, e.z, 2, World.region.dustCol);
          if (e.st > 14 && !sees) { e.state = 'return'; e.st = 0; }
          break; }
        case 'attack': this.attack(e, dt, dP); break;
      }
      this.integrate(e, dt);
    }
    this.list = this.list.filter(e => e.isBoss || !e.dead || e.deadT < 2.5);
    this.threat = threat;
  },
  integrate(e, dt) {
    let nx = e.x + e.vx * dt, nz = e.z + e.vz * dt; if (!e.T.fly) { const r = World.collide(nx, nz, e.radius * .8, e.y, 1.5); nx = r[0]; nz = r[1]; }
    const gh = World.ground(nx, nz, e.y + .6).h; if (!e.T.fly && Math.abs(gh - e.y) > 1.2 && gh > e.y) { nx = e.x; nz = e.z; e.vx *= -.3; e.vz *= -.3; }
    e.x = nx; e.z = nz; const tgtY = e.T.fly ? gh + e.T.fly + Math.sin(e.anim.t * 2) * .2 : gh; e.y = lerp(e.y, tgtY, Math.min(1, dt * (e.T.fly ? 3 : 15))); if (e.hidden) e.y = gh - .9;
    if (World.water && !e.T.fly && e.y < World.water.h && Math.random() < dt * 4 && Math.hypot(e.vx, e.vz) > 1) Game.ripple(e.x, e.z, .5);
  },
  attack(e, dt, dP) {
    const T = e.T, p = Player.ch, a = e.anim; a.atk += dt; e.vx *= .85; e.vz *= .85;
    const hitIf = (r, dmg, arc = .3) => { const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz); if (d < r + e.radius && (dx * fx + dz * fz) / (d || 1) > arc && Math.abs(p.y - e.y) < 2) Player.hurt(dmg, [e.x, e.y, e.z]); };
    const done = (cd) => { e.state = 'chase'; e.st = 0; e.cd = cd; };
    switch (T.atk) {
      case 'swipe': case 'bite': case 'touch': if (a.atk > .35 && !e.hit) { e.hit = 1; hitIf(T.range, T.dmg); Audio2.sfx('melee', [e.x, e.y + 1, e.z]); } if (a.atk > .7) { e.hit = 0; done(T.cd); } break;
      case 'lunge': if (a.atk < .45) { e.yaw = lerpAng(e.yaw, Math.atan2(p.x - e.x, p.z - e.z), dt * 8); } else if (a.atk < .8) { const f = [Math.sin(e.yaw), Math.cos(e.yaw)]; e.vx = f[0] * 13; e.vz = f[1] * 13; if (!e.hit && dP < 1.5) { e.hit = 1; Player.hurt(T.dmg, [e.x, e.y, e.z]); } } else { e.hit = 0; done(T.cd); } break;
      case 'bolt': if (a.atk > .6 && !e.hit) { e.hit = 1; Combat.enemyShot(e.x, e.y + e.aimH, e.z, p.x, p.y + 1, p.z, 16, T.dmg, [1, .6, .2]); Audio2.sfx('tele', [e.x, e.y + 2, e.z]); } if (a.atk > 1) { e.hit = 0; done(T.cd); } break;
      case 'erupt': if (a.atk > .3 && !e.hit) { e.hit = 1; hitIf(2.2, T.dmg, -1); FX.burst(e.x, e.y, e.z, 20, World.region.dustCol, 4, .8, .8); } if (a.atk > 1.2) { e.hit = 0; done(T.cd); if (Math.random() < .5) { e.hidden = true; } } break;
      case 'charge': if (a.atk < .9) { e.yaw = lerpAng(e.yaw, Math.atan2(p.x - e.x, p.z - e.z), dt * 3); if (Math.random() < .3) FX.dust(e.x, e.y, e.z, 1, World.region.dustCol); }
        else if (a.atk < 1.8) { const f = [Math.sin(e.yaw), Math.cos(e.yaw)]; e.vx = f[0] * 10; e.vz = f[1] * 10; Cam.shake(.04); if (!e.hit && dP < 2) { e.hit = 1; Player.hurt(T.dmg, [e.x, e.y, e.z]); } if (World.solid(e.x + f[0] * 1.3, e.y + 1, e.z + f[1] * 1.3)) { e.stagger = 2; Audio2.sfx('brute_slam', [e.x, e.y, e.z]); Cam.shake(.5); a.atk = 2; } }
        else if (a.atk < 2.1 && !e.slam) { e.slam = 1; Audio2.sfx('brute_slam', [e.x, e.y, e.z]); FX.ring(e.x, e.y + .2, e.z, 4, 40, [1, .6, .3]); hitIf(3.5, T.dmg * .6, -1); Cam.shake(.4); }
        else if (a.atk > 2.6) { e.hit = 0; e.slam = 0; done(T.cd); } break;
    }
  },
  draw() {
    for (const e of this.list) {
      if (e.isBoss) continue;
      if (dist2(e.x, e.z, Cam.at[0], Cam.at[2]) > 4900) continue; const T = e.T, t = e.anim.t, fl = e.flash > 0 ? 1 : 0;
      const dk = e.dead ? sat(1 - e.deadT / 1.2) : 1; if (dk <= 0) continue;
      const col = e.frozen > 0 ? [.6, .85, 1] : fl ? [1, 1, 1] : T.col, gl = T.glow, em = fl ? 1 : 0, flags = F_OCC * 0;
      const root = A34.trs(mp(), e.x, e.y, e.z, e.yaw, 0, 0, dk, dk, dk); const bob = Math.sin(t * 5) * .05; const mv = sat(Math.hypot(e.vx, e.vz) / 3);
      if (e.hidden) { part(root, 0, .9, 0, 1, .25, 1, World.region.dustCol); continue; }
      if (e.disguised) { part(root, 0, .6, 0, .7, 1.2, .5, [.25, .26, .3]); part(root, 0, 1.1, .26, .5, .35, .02, gl, .8 + Math.sin(t * 8) * .2); continue; }
      const atk = e.state === 'attack' ? e.anim.atk : 0;
      switch (e.type) {
        case 'drifter': case 'mimic': {
          const hunch = .35 + Math.sin(t * 1.3) * .05; const body = joint(root, 0, .95 + bob, 0, 0, hunch, Math.sin(t * .9) * .1);
          part(body, 0, .3, 0, .45, .7, .3, col, em); part(body, .1, .4, .16, .08, .3, .02, gl, 1); part(body, -.12, .15, .16, .06, .2, .02, gl, .8);
          const hd = joint(body, 0, .7, .1, Math.sin(t * 2.3) * .4, .3, Math.sin(t * 3) * .2); part(hd, 0, .1, 0, .3, .32, .3, col, em); part(hd, 0, .12, .16, .2, .06, .02, gl, 1);
          for (const s of [-1, 1]) { const sw = s < 0 && atk > .2 && atk < .5 ? -2.2 : Math.sin(t * 3 + s) * .3 - .2 + mv * Math.sin(t * 6 + s * 3) * .5; const ar = joint(body, s * .3, .55, 0, 0, sw, s * .25); part(ar, 0, -.4, 0, .1, .85, .1, col, em); part(ar, 0, -.85, .05, .08, .15, .2, gl, .7); }
          for (const s of [-1, 1]) { const lg = joint(root, s * .14, .9, 0, 0, Math.sin(t * 6 * mv + (s > 0 ? Math.PI : 0)) * .5 * mv, 0); part(lg, 0, -.45, 0, .13, .9, .14, col, em); }
          break; }
        case 'stalker': {
          const crouch = e.state === 'idle' || e.state === 'listen' ? .25 : 0; const lean = atk > .45 && atk < .8 ? -.4 : 0;
          const body = joint(root, 0, .55 - crouch + bob, 0, 0, lean, 0); part(body, 0, 0, 0, .45, .35, 1.2, col, em); for (let i = 0; i < 4; i++) part(body, 0, .2, -.4 + i * .27, .05, .25, .05, gl, .9);
          const hd = joint(body, 0, .1, .65, Math.sin(t * 4) * .3, -.1, 0); part(hd, 0, 0, .15, .3, .25, .4, col, em); part(hd, -.08, .05, .36, .05, .05, .02, gl, 1); part(hd, .08, .05, .36, .05, .05, .02, gl, 1);
          for (let i = 0; i < 4; i++) { const sx = i & 1 ? 1 : -1, sz = i < 2 ? .4 : -.4, ph = t * 10 * mv + i * 1.6; const lg = joint(body, sx * .25, -.1, sz, 0, Math.sin(ph) * .6 * mv, sx * .5); part(lg, 0, -.25, 0, .08, .55, .08, col, em); }
          const tail = joint(body, 0, .1, -.6, Math.sin(t * 3) * .5, .5, 0); part(tail, 0, 0, -.4, .06, .06, .8, col, em); break; }
        case 'watcher': {
          const body = joint(root, 0, 0, 0, 0, 0, 0); part(body, 0, 0, 0, .7, .7, .7, col, em, 0, 'ico'); const lk = joint(body, 0, 0, 0, 0, -.2, 0); part(lk, 0, 0, .3, .32, .32, .2, [1, 1, .9], 1, 0, 'ico'); part(lk, 0, 0, .38, .14, .14, .08, gl, 1, 0, 'ico');
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .5; const pt = joint(body, Math.cos(a) * .4, Math.sin(a) * .4, -.1, 0, 0, a); part(pt, 0, .25 + Math.sin(t * 3 + i) * .08, 0, .14, .5, .05, col, em); }
          for (let i = 0; i < 3; i++) part(body, (i - 1) * .2, -.6 - Math.sin(t * 2 + i) * .1, 0, .04, .6, .04, gl, .6); break; }
        case 'burrower': {
          const up = atk > 0 ? Math.min(1, atk * 4) : 1; const body = joint(root, 0, .3 + up * .5, 0, 0, -.3, 0);
          for (let i = 0; i < 5; i++) { const s = joint(body, 0, i * .35, Math.sin(t * 3 + i) * .1, 0, .1, 0); part(s, 0, 0, 0, .9 - i * .1, .4, .9 - i * .1, i % 2 ? col : scalec(col, .8), em, 0, 'oct'); }
          const mo = joint(body, 0, 1.8, .1, 0, -.4, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; part(mo, Math.cos(a) * .25, .2, Math.sin(a) * .25, .1, .5, .1, gl, .8); } break; }
        case 'crawler': {
          const body = joint(root, 0, .35 + bob, 0, 0, 0, 0); part(body, 0, 0, 0, .6, .25, .7, col, em, 0, 'oct'); part(body, 0, .15, .1, .3, .1, .3, gl, 1);
          for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1, k = (i % 3 - 1) * .3, ph = t * 14 * mv + i * 2; const lg = joint(body, s * .25, 0, k, 0, 0, s * (1 + Math.sin(ph) * .3 * mv)); part(lg, 0, -.25, 0, .05, .5, .05, col, em); } break; }
        case 'brute': {
          const ch = atk > 0 && atk < .9 ? .3 : 0; const body = joint(root, 0, 1.6 + bob - ch * .4, 0, 0, .25 + ch, 0); part(body, 0, .2, 0, 1.6, 1.3, 1.1, col, em); part(body, 0, .5, -.56, 1, .7, .05, gl, .9);
          part(body, 0, .8, .1, .9, .4, .9, scalec(col, .8), em); const hd = joint(body, 0, .9, .5, 0, .2, 0); part(hd, 0, 0, .1, .5, .4, .4, col, em); part(hd, 0, .02, .3, .3, .05, .02, gl, 1);
          for (const s of [-1, 1]) { const ar = joint(body, s * .95, .5, .1, 0, atk > 1.9 && atk < 2.2 ? -2 : -.3 + Math.sin(t * 2 + s) * .1, s * .2); part(ar, 0, -.7, 0, .45, 1.5, .45, col, em); part(ar, 0, -1.5, 0, .6, .4, .6, scalec(col, .7), em); }
          for (const s of [-1, 1]) { const lg = joint(root, s * .5, 1.3, 0, 0, Math.sin(t * 4 * mv + (s > 0 ? Math.PI : 0)) * .4 * mv, 0); part(lg, 0, -.65, 0, .5, 1.3, .55, col, em); } break; }
        case 'swarm': { A34.trs(_W, e.x, e.y, e.z, t * 3, t * 2, 0, .25, .25, .25); R.inst('oct', _W, gl[0], gl[1], gl[2], .9, F_UNLIT); break; }
      }
      if (e.marked > 0 || e === Player.lock) { A34.trs(_W, e.x, e.y + e.aimH + 1 + (e.heavy ? 1 : 0), e.z, t * 3, 0, 0, .18, .18, .18); R.inst('oct', _W, 1, .3, .3, 1, F_UNLIT); }
      if (e.state === 'attack' && (T.atk === 'charge' || T.atk === 'lunge') && e.anim.atk < (T.atk === 'charge' ? .9 : .45)) { // readable telegraph
        const f = [Math.sin(e.yaw), Math.cos(e.yaw)]; const L = T.atk === 'charge' ? 9 : 4.5; A34.trs(_W, e.x + f[0] * L / 2, World.hf.at(e.x, e.z) + .06, e.z + f[1] * L / 2, e.yaw, 0, 0, e.radius * 1.5, .03, L); R.inst('cube', _W, 1, .25, .2, .7 + Math.sin(t * 30) * .3, F_UNLIT); }
    }
  },
};
