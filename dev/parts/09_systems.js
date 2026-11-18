
/* =====================================================================
   BOSSES — data-driven phases, telegraphed attacks, weakness systems
   ===================================================================== */
const BOSSES = {
  guardian: { name: 'THE UNSTABLE GUARDIAN', sub: 'Relay-bound Echo', hp: 420, radius: 2, aimH: 3.2, speed: 1.4, weak: 'scan', adds: 'drifter', col: [.35, .33, .4], glow: [.4, .95, 1],
    phases: [{ at: 1, atk: ['slam', 'volley', 'slam'] }, { at: .55, atk: ['slam', 'summon', 'volley', 'charge'] }] },
  rootbound: { name: 'ROOTBOUND', sub: 'The Settlement Remembers', hp: 560, radius: 2.6, aimH: 2, speed: 0, weak: 'pylons', adds: 'crawler', col: [.3, .36, .2], glow: [.9, .6, 1],
    phases: [{ at: 1, atk: ['spikes', 'volley', 'spikes'] }, { at: .5, atk: ['spikes', 'summon', 'pulse', 'spikes', 'volley'] }] },
  warden: { name: 'THE WARDEN', sub: 'Keeper of Borrowed Voices', hp: 520, radius: 1.4, aimH: 4, speed: 2.4, weak: 'scan', adds: 'swarm', col: [.25, .3, .32], glow: [.9, .4, 1], cloak: true,
    phases: [{ at: 1, atk: ['charge', 'homing', 'teleport'] }, { at: .5, atk: ['summon', 'charge', 'homing', 'teleport', 'pulse'] }] },
  archivist: { name: 'THE ARCHIVIST', sub: 'It Kept Every Record', hp: 600, radius: 1.8, aimH: 3, speed: 1, weak: 'burst', adds: 'watcher', col: [.6, .62, .66], glow: [.4, 1, .9], fly: 3,
    phases: [{ at: 1, atk: ['volley', 'beam', 'teleport'] }, { at: .5, atk: ['beam', 'summon', 'homing', 'teleport', 'volley'] }] },
  titan: { name: 'THE FORGE TITAN', sub: 'When the Iron Woke', hp: 900, radius: 2.8, aimH: 4, speed: 1.1, weak: 'cold', adds: 'crawler', col: [.38, .32, .3], glow: [1, .5, .15],
    phases: [{ at: 1, atk: ['slam', 'charge', 'volley'] }, { at: .5, atk: ['beam', 'slam', 'charge', 'summon'] }] },
  resonant: { name: 'THE RESONANT', sub: 'The Hollow Sings Back', hp: 700, radius: 2.4, aimH: 3.5, speed: 0, weak: 'nodes', adds: 'swarm', col: [.6, .45, .9], glow: [.8, .6, 1], fly: 2,
    phases: [{ at: 1, atk: ['pulse', 'volley', 'slam'] }, { at: .5, atk: ['beam', 'pulse', 'homing', 'slam', 'summon'] }] },
  firstvoice: { name: 'THE FIRST VOICE', sub: 'Curator of the Archive', hp: 640, radius: 2, aimH: 5, speed: .8, weak: 'scan', adds: 'mimic', col: [.6, .9, 1], glow: [.7, 1, 1], fly: 1.5, talk: .5,
    phases: [{ at: 1, atk: ['homing', 'pulse', 'teleport'] }] },
  chorus: { name: 'THE CHORUS', sub: 'Every Voice That Wanted Back', hp: 1100, radius: 2.2, aimH: 3.5, speed: 1.8, weak: 'burst', adds: 'mimic', col: [.12, .1, .14], glow: [1, .25, .35],
    phases: [{ at: 1, atk: ['volley', 'charge', 'spikes'] }, { at: .66, atk: ['beam', 'summon', 'homing', 'slam'] }, { at: .33, atk: ['beam', 'spikes', 'pulse', 'charge', 'homing', 'summon'] }] },
};
const Boss = {
  active: false, b: null, fx: [],
  start(id, x, z, onDefeat) {
    const D = BOSSES[id]; const b = { id, D, x, z, y: World.hf.at(x, z) + (D.fly || 0), yaw: 0, hp: D.hp * (Settings.v.difficulty === 'story' ? .6 : Settings.v.difficulty === 'hard' ? 1.25 : 1), maxHp: 0, radius: D.radius, aimH: D.aimH, isBoss: true, state: 'intro', t: 0, q: [], atk: null, vuln: 0, revealed: 0, shield: D.weak === 'burst' ? 1 : 0, cold: 0, flash: 0, phase: 0, center: [x, z], dead: false, talkDone: false, anim: { t: 0 } };
    b.maxHp = b.hp; this.b = b; this.active = true; this.onDefeat = onDefeat; this.fx = []; Enemies.list.push(b);
    if (D.weak === 'nodes') this.nodes = [0, 1, 2].map(i => ({ x: x + Math.cos(i * 2.09) * 9, z: z + Math.sin(i * 2.09) * 9, i })), this.seq = [0, 2, 1], this.seqI = 0, this.seqShow = 0;
    if (D.weak === 'pylons') this.pylons = [0, 1, 2].map(i => ({ x: x + Math.cos(i * 2.09 + .5) * 8, z: z + Math.sin(i * 2.09 + .5) * 8, charge: 1 }));
    if (D.weak === 'cold') for (let i = 0; i < 5; i++) Props.add('coolant', x + Math.cos(i * 1.256) * 11, z + Math.sin(i * 1.256) * 11);
    $('bossbar').style.display = 'block'; $('bossname').textContent = D.name; Audio2.setMode('boss'); Audio2.sfx('boss_roar', [x, b.y + 2, z]);
    // intro cinematic orbit
    Game.cinematic(true); const ey = b.y + 3;
    Cam.play([{ t: 0, eye: [x + 14, ey + 4, z + 14], at: [x, ey, z], fov: .9 }, { t: 2.2, eye: [x + 7, ey + 1, z + 9], at: [x, ey + 1, z], fov: .6 }, { t: 3.4, eye: [x + 5, ey, z + 7], at: [x, ey + 1.5, z], fov: .55 }], () => { Game.cinematic(false); b.state = 'idle'; b.t = 0; });
    Game.chapterCard(D.sub, D.name, '', 3.2, true);
  },
  damage(dmg, src = {}) {
    const b = this.b; if (!b || b.dead || b.state === 'intro' || b.state === 'talk') return; const D = b.D; let k = 1;
    if (D.weak === 'scan' && b.revealed <= 0) k = .25; if (D.weak === 'burst' && b.shield > 0) { k = .15; if (src.burst) { b.shield = 0; b.shieldT = 6; Audio2.sfx('break', [b.x, b.y + 2, b.z]); FX.burst(b.x, b.y + 2, b.z, 40, [.8, 1, 1], 5, 1, .8, true); Game.cue('Shield shattered!'); } }
    if (D.weak === 'cold' && b.cold <= 0) k = .2; if (D.weak === 'pylons' && b.vuln <= 0) k = .2; if (D.weak === 'nodes' && b.vuln <= 0) k = .15;
    if (b.vuln > 0) k *= 2.2; b.hp -= dmg * k; b.flash = .1; Game.dmgNumber(b.x, b.y + b.aimH + 1, Math.round(dmg * k), k > 1);
    if (k < .3 && Math.random() < .1) Game.cue(D.weak === 'scan' ? 'It shifts out of phase — scan it!' : D.weak === 'cold' ? 'Armored. Its vents are white-hot...' : D.weak === 'pylons' ? 'Roots absorb the energy. The arc pylons?' : D.weak === 'nodes' ? 'The crystal nodes sing in sequence...' : 'Shielded — a resonance burst might break it.');
    const r = b.hp / b.maxHp; const ph = D.phases.length - 1 - [...D.phases].reverse().findIndex(p => r <= p.at);
    if (ph > b.phase && ph < D.phases.length) { b.phase = ph; b.q = []; Audio2.sfx('boss_roar', [b.x, b.y + 2, b.z]); Cam.shake(.6); FX.burst(b.x, b.y + 2, b.z, 60, D.glow, 6, 1.4, .8, true); Game.onBossPhase(b.id, ph); }
    if (D.talk && r < D.talk && !b.talkDone) { b.talkDone = true; b.state = 'talk'; Game.onBossTalk(b.id); return; }
    if (b.hp <= 0) this.defeat();
  },
  defeat() {
    const b = this.b; b.dead = true; b.state = 'dead'; b.t = 0; Audio2.sfx('echo_die', [b.x, b.y + 2, b.z]); Audio2.sfx('boss_roar', [b.x, b.y + 2, b.z]); Game.slowmo = 1.2; Cam.shake(1);
    for (let i = 0; i < 4; i++) setTimeout(() => FX.burst(b.x, b.y + 2 + i, b.z, 80, i % 2 ? b.D.glow : [1, 1, 1], 7, 2, 1, true, -.1), i * 250);
    $('bossbar').style.display = 'none'; Audio2.setMode('explore'); Enemies.list.forEach(e => { if (!e.isBoss && dist2(e.x, e.z, b.x, b.z) < 900) Enemies.kill(e); });
    setTimeout(() => { this.active = false; Enemies.list = Enemies.list.filter(e => e !== b); Game.addSalvage(25, b.x, b.y + 2, b.z); Game.S.cores = (Game.S.cores || 0) + 1; UI.toast('Resonant core recovered'); if (this.onDefeat) this.onDefeat(); }, 2200);
  },
  onScan() { const b = this.b; if (!b || b.dead) return; if (b.D.weak === 'scan') { b.revealed = 7 + Game.up('scan') * 2; Game.cue('Phase locked — it is vulnerable!'); Audio2.sfx('reveal'); } if (b.D.cloak) b.cloakT = 7; },
  onBurst(x, z) { const b = this.b; if (!b || b.dead) return; if (b.D.weak === 'burst' && Math.hypot(b.x - x, b.z - z) < 9) this.damage(1, { burst: true });
    if (b.D.weak === 'pylons') for (const p of this.pylons) if (p.charge >= 1 && Math.hypot(p.x - x, p.z - z) < 4) this.zap(p); },
  zap(p) { const b = this.b; p.charge = 0; Audio2.sfx('power', [p.x, 2, p.z]); FX.sparks(p.x, World.hf.at(p.x, p.z) + 3, p.z, 40, [.8, .6, 1]); this.fx.push({ k: 'arc', a: [p.x, World.hf.at(p.x, p.z) + 3, p.z], b: [b.x, b.y + 2, b.z], t: .6 });
    if (Math.hypot(p.x - b.x, p.z - b.z) < 14) { b.vuln = 5; Game.cue('The roots burn! Strike the heart!'); Cam.shake(.4); } },
  onCold() { const b = this.b; if (!b || b.dead || b.D.weak !== 'cold') return; b.cold = 6; b.vuln = 5; Game.cue('Thermal shock! Its core is exposed!'); Cam.shake(.6); Audio2.sfx('break', [b.x, b.y + 2, b.z]); },
  shootNode(n) { const b = this.b; if (!b || b.dead) return; if (this.seq[this.seqI] === n.i) { this.seqI++; Audio2.tone([523, 659, 784][n.i], .5, 'triangle', .1, { verb: 1 }); n.lit = 1.5;
      if (this.seqI >= 3) { this.seqI = 0; b.vuln = 7; Game.cue('Harmonic lock — the Resonant is exposed!'); Audio2.sfx('solve'); this.seq = [0, 1, 2].sort(() => Math.random() - .5); this.seqShow = 0; } }
    else { this.seqI = 0; Audio2.sfx('fail'); this.queue('pulse'); this.seqShow = 0; } },
  queue(a) { this.b.q.unshift(a); this.b.atk = null; this.b.state = 'idle'; this.b.t = 99; },
  update(dt) {
    const b = this.b; if (!b) return; const D = b.D, p = Player.ch; b.t += dt; b.anim.t += dt; b.flash -= dt; b.vuln = Math.max(0, b.vuln - dt); b.revealed = Math.max(0, b.revealed - dt); b.cold = Math.max(0, b.cold - dt); b.cloakT = Math.max(0, (b.cloakT || 0) - dt);
    if (b.shieldT > 0) { b.shieldT -= dt; if (b.shieldT <= 0) b.shield = 1; }
    $('bosshp').style.width = (Math.max(0, b.hp) / b.maxHp * 100) + '%';
    // arena boundary keeps the duel focused
    if (!b.dead && b.state !== 'intro') { const dx = p.x - b.center[0], dz = p.z - b.center[1], d = Math.hypot(dx, dz); if (d > 22) { p.x = b.center[0] + dx / d * 22; p.z = b.center[1] + dz / d * 22; } }
    if (this.pylons) for (const q of this.pylons) q.charge = Math.min(1, q.charge + dt / 9);
    if (this.nodes && b.state !== 'intro') { this.seqShow += dt; for (const n of this.nodes) n.lit = Math.max(0, (n.lit || 0) - dt); }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t -= dt; this.stepFx(f, dt); if (f.t <= 0) this.fx.splice(i, 1); }
    if (b.dead || b.state === 'intro' || b.state === 'talk') return;
    const dP = Math.hypot(p.x - b.x, p.z - b.z);
    b.yaw = lerpAng(b.yaw, Math.atan2(p.x - b.x, p.z - b.z), dt * (b.atk === 'charge' && b.t > 1 ? 0 : 3));
    if (D.speed && !b.atk) { const tx = dP > 6 ? p.x : b.x, tz = dP > 6 ? p.z : b.z; const dx = tx - b.x, dz = tz - b.z, l = Math.hypot(dx, dz) || 1; b.x += dx / l * D.speed * dt * (l > .5 ? 1 : 0); b.z += dz / l * D.speed * dt * (l > .5 ? 1 : 0); }
    const gy = World.hf.at(b.x, b.z); b.y = lerp(b.y, gy + (D.fly || 0) + (D.fly ? Math.sin(b.anim.t) * .4 : 0), dt * 4);
    if (b.state === 'idle') { if (b.t > (b.vuln > 0 ? 2.5 : 1.3)) { if (!b.q.length) b.q = [...D.phases[b.phase].atk]; b.atk = b.q.shift(); b.state = 'atk'; b.t = 0; b.hit = 0; b.n = 0; this.begin(b.atk); } }
    else if (b.state === 'atk') { if (this.run(b.atk, dt)) { b.state = 'idle'; b.t = 0; b.atk = null; if (Math.random() < .35 && D.weak !== 'scan') { b.vuln = Math.max(b.vuln, 2); } } }
  },
  begin(a) { const b = this.b, p = Player.ch; b.tgt = [p.x, p.z]; if (a !== 'summon') Audio2.sfx('tele', [b.x, b.y + 2, b.z]);
    if (a === 'spikes') { this.fx.push(...[0, 1, 2, 3, 4].map(i => ({ k: 'spike', x: p.x + (i ? (Math.random() - .5) * 8 : 0), z: p.z + (i ? (Math.random() - .5) * 8 : 0), t: 1.8 + i * .25, max: 1.8 + i * .25 }))); }
    if (a === 'teleport') { FX.burst(b.x, b.y + 2, b.z, 40, b.D.glow, 4, .8, .7, true); } },
  run(a, dt) {
    const b = this.b, p = Player.ch, t = b.t, D = b.D;
    switch (a) {
      case 'slam': if (t < 1) { b.lift = t; return false; } if (!b.hit) { b.hit = 1; b.lift = 0; Audio2.sfx('brute_slam', [b.x, b.y, b.z]); Cam.shake(.7); Input.rumble(1, 300); this.fx.push({ k: 'wave', x: b.x, z: b.z, r: b.radius, t: 2.2, hit: false }); FX.ring(b.x, b.y + .3, b.z, 5, 60, D.glow); } return t > 2;
      case 'volley': if (t > .5 + b.n * .5 && b.n < 3) { b.n++; const n = 5 + b.phase * 2; for (let i = 0; i < n; i++) { const a2 = Math.atan2(p.x - b.x, p.z - b.z) + (i - (n - 1) / 2) * .18; Combat.enemyShot(b.x, b.y + b.aimH, b.z, b.x + Math.sin(a2) * 20, p.y + 1, b.z + Math.cos(a2) * 20, 13, 9, D.glow); } Audio2.sfx('shot', [b.x, b.y + 2, b.z]); } return t > 2.2;
      case 'homing': if (t > .6 + b.n * .35 && b.n < 4) { b.n++; Combat.enemyShot(b.x, b.y + b.aimH + 1, b.z, b.x + (Math.random() - .5) * 10, b.y + 6, b.z + (Math.random() - .5) * 10, 7, 12, D.glow, { homing: 1.6, life: 5 }); } return t > 2.4;
      case 'charge': if (t < 1.1) { b.yaw = lerpAng(b.yaw, Math.atan2(p.x - b.x, p.z - b.z), dt * 5); return false; } if (t < 2.2) { const f = [Math.sin(b.yaw), Math.cos(b.yaw)]; b.x += f[0] * 15 * dt; b.z += f[1] * 15 * dt; const dx = b.x - b.center[0], dz = b.z - b.center[1], d = Math.hypot(dx, dz); if (d > 19) { b.x = b.center[0] + dx / d * 19; b.z = b.center[1] + dz / d * 19; } if (!b.hit && Math.hypot(p.x - b.x, p.z - b.z) < b.radius + .8) { b.hit = 1; Player.hurt(22, [b.x, b.y, b.z]); } FX.dust(b.x, b.y, b.z, 2, World.region.dustCol); return false; } return t > 2.8;
      case 'beam': { if (t < 1) { b.beamA = Math.atan2(p.x - b.x, p.z - b.z) - 1.4; return false; } const a2 = b.beamA + (t - 1) * 1.1 * (b.phase ? 1.3 : 1); b.beam = a2; const f = [Math.sin(a2), Math.cos(a2)], dx = p.x - b.x, dz = p.z - b.z, along = dx * f[0] + dz * f[1], perp = Math.abs(dx * f[1] - dz * f[0]);
        if (along > 0 && along < 28 && perp < .8 && p.y - World.hf.at(p.x, p.z) < .6) { if (Player.hurt(14, [b.x, b.y, b.z])) { } } if (t > 3.6) { b.beam = null; return true; } return false; }
      case 'spikes': return t > 3.2;
      case 'pulse': if (t < .9) return false; if (!b.hit) { b.hit = 1; FX.ring(b.x, b.y + .3, b.z, 7, 80, D.glow); Audio2.sfx('burst', [b.x, b.y, b.z]); if (Math.hypot(p.x - b.x, p.z - b.z) < 7.5) Player.hurt(18, [b.x, b.y, b.z]); Cam.shake(.4); } return t > 1.5;
      case 'summon': if (!b.hit) { b.hit = 1; const n = Math.min(4, 2 + b.phase); for (let i = 0; i < n; i++) { const a2 = Math.random() * TAU; const e = Enemies.spawn(D.adds, b.x + Math.cos(a2) * 6, b.z + Math.sin(a2) * 6); e.state = 'chase'; e.lastSeen = [p.x, p.y, p.z]; FX.burst(e.x, e.y + 1, e.z, 20, D.glow, 3, .8, .6, true); } Audio2.sfx('echo_call', [b.x, b.y + 2, b.z]); } return t > 1.4;
      case 'teleport': if (t > .6 && !b.hit) { b.hit = 1; const a2 = Math.random() * TAU; b.x = b.center[0] + Math.cos(a2) * 10; b.z = b.center[1] + Math.sin(a2) * 10; FX.burst(b.x, b.y + 2, b.z, 40, D.glow, 4, .8, .7, true); Audio2.sfx('tele', [b.x, b.y, b.z]); } return t > 1;
    }
    return true;
  },
  stepFx(f, dt) { const p = Player.ch;
    if (f.k === 'wave') { f.r += dt * 9; const d = Math.hypot(p.x - f.x, p.z - f.z); if (!f.hit && Math.abs(d - f.r) < .8 && p.y - World.hf.at(p.x, p.z) < .5) { f.hit = true; Player.hurt(16, [f.x, 0, f.z]); } }
    if (f.k === 'spike' && f.t <= .25 && !f.done) { f.done = 1; Audio2.sfx('break', [f.x, 0, f.z]); FX.burst(f.x, World.hf.at(f.x, f.z), f.z, 16, World.region.dustCol, 4, .8, .8); if (Math.hypot(p.x - f.x, p.z - f.z) < 1.5) Player.hurt(16, [f.x, 0, f.z]); } },
  draw() {
    const b = this.b; if (!b) return; const D = b.D, t = b.anim.t; const dk = b.dead ? sat(1 - b.t / 2) : 1; const fl = b.flash > 0 ? 1 : 0; const col = fl ? [1, 1, 1] : b.cold > 0 ? [.6, .85, 1] : D.col, gl = D.glow; const em = fl;
    for (const f of this.fx) {
      if (f.k === 'wave') { const n = 36; for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = f.x + Math.cos(a) * f.r, z = f.z + Math.sin(a) * f.r; A34.trs(_W, x, World.hf.at(x, z) + .25, z, -a, 0, 0, .3, .5, f.r * TAU / n); R.inst('cube', _W, gl[0], gl[1], gl[2], 1, F_UNLIT); } }
      if (f.k === 'spike') { const gy = World.hf.at(f.x, f.z); if (f.t > .25) { A34.trs(_W, f.x, gy + .04, f.z, t * 2, 0, 0, 2.6 * (1 - f.t / f.max) + .3, .03, 2.6 * (1 - f.t / f.max) + .3); R.inst('cyl', _W, 1, .25, .2, .8, F_UNLIT); } else { const h = 3 * (f.t / .25); A34.trs(_W, f.x, gy + h / 2, f.z, f.x, 0, 0, .7, h, .7); R.inst('cone', _W, D.col[0], D.col[1], D.col[2], .2); } }
      if (f.k === 'arc') { const n = 10; for (let i = 0; i < n; i++) { const k = i / n, x = lerp(f.a[0], f.b[0], k) + (Math.random() - .5) * .6, y = lerp(f.a[1], f.b[1], k) + (Math.random() - .5) * .6, z = lerp(f.a[2], f.b[2], k) + (Math.random() - .5) * .6; A34.trs(_W, x, y, z, 0, 0, 0, .15, .15, .15); R.inst('cube', _W, .8, .7, 1, 1, F_UNLIT); } }
    }
    if (this.pylons) for (const q of this.pylons) { const gy = World.hf.at(q.x, q.z); A34.trs(_W, q.x, gy + 1.5, q.z, 0, 0, 0, .5, 3, .5); R.inst('cube', _W, .3, .3, .35, 0, F_OCC); A34.trs(_W, q.x, gy + 3.2, q.z, t, 0, 0, .7, .7, .7); R.inst('oct', _W, .8, .6, 1, q.charge >= 1 ? 1 : .2, q.charge >= 1 ? F_UNLIT : 0); }
    if (this.nodes) for (const n of this.nodes) { const gy = World.hf.at(n.x, n.z); const show = this.seqShow < 3.6 && Math.floor(this.seqShow / 1.2) < 3 && this.seq[Math.floor(this.seqShow / 1.2)] === n.i; A34.trs(_W, n.x, gy + 2 + Math.sin(t * 2 + n.i) * .3, n.z, t, 0, 0, 1, 1.8, 1); R.inst('oct', _W, .7, .5, 1, show || n.lit > 0 ? 1 : .3, show || n.lit > 0 ? F_UNLIT : 0); }
    if (b.dead && dk <= 0) return;
    if (D.cloak && b.revealed <= 0 && b.cloakT <= 0 && b.state !== 'intro' && Math.sin(t * 13) > -.7) { A34.trs(_W, b.x, b.y + 4.2, b.z, 0, 0, 0, .25, .25, .25); R.inst('ico', _W, gl[0], gl[1], gl[2], 1, F_UNLIT); return; }
    const lift = (b.lift || 0) * 1.5; const root = A34.trs(mp(), b.x, b.y + lift, b.z, b.yaw, 0, 0, dk, dk, dk); const vul = b.vuln > 0 || b.revealed > 0 ? 1 : 0;
    switch (b.id) {
      case 'guardian': { const body = joint(root, 0, 2.6, 0, 0, .15, Math.sin(t) * .05); part(body, 0, .8, 0, 2, 2.4, 1.3, col, em); part(body, 0, 1, .66, .7, .7, .05, gl, vul ? 1 : .4);
        for (let i = 0; i < 3; i++) partR(body, 0, 2.3 + i * .8, -.5, 0, 0, 0, .12, 1.2, .12, [.5, .5, .55]); part(body, 0, 3.8, -.5, .25, .25, .25, [1, .3, .2], 1);
        const hd = joint(body, 0, 2.2, .3, Math.sin(t * .7) * .3, .2, 0); part(hd, 0, .3, 0, .9, .8, .9, col, em); part(hd, 0, .35, .46, .6, .1, .02, gl, 1);
        for (const s of [-1, 1]) { const ar = joint(body, s * 1.2, 1.7, 0, 0, b.atk === 'slam' ? -2.5 * (b.lift || 0) : -.2 + Math.sin(t + s) * .1, s * .2); part(ar, 0, -1.2, 0, .6, 2.4, .6, col, em); part(ar, 0, -2.5, 0, .9, .6, .9, scalec(col, .7), em); }
        for (const s of [-1, 1]) { const lg = joint(root, s * .7, 2.4, 0, 0, Math.sin(t * 3) * .2 * (b.atk === 'charge' ? 1 : .2), 0); part(lg, 0, -1.2, 0, .7, 2.4, .7, col, em); } break; }
      case 'rootbound': { part(root, 0, 1.6, 0, 3, 2.6, 3, col, em, 0, 'ico'); part(root, 0, 2, 0, 1.4, 1.4, 1.4, b.vuln > 0 ? [1, .4, .7] : gl, b.vuln > 0 ? 1 : .5, 0, 'ico');
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.sin(t * .5 + i) * .1; const rt = joint(root, Math.cos(a) * 1.6, 1, Math.sin(a) * 1.6, -a + Math.PI / 2, 0, .9 + Math.sin(t * 1.5 + i) * .2); part(rt, 0, 1.5, 0, .35, 3, .35, scalec(col, .8), em); part(rt, 0, 3.1, 0, .2, .4, .2, gl, .8); } break; }
      case 'warden': { const sc = b.revealed > 0 || b.cloakT > 0 ? 1 : .9; for (const s of [-1, 1]) for (const f of [-1, 1]) { const lg = joint(root, s * .9, 0, f * .9, 0, f * .3 + Math.sin(t * 3 + s + f) * .15 * (b.atk === 'charge' ? 2 : .5), -s * .3); part(lg, 0, 2, 0, .12, 4.2, .12, col, em); }
        const body = joint(root, 0, 4, 0, 0, .1, 0); part(body, 0, 0, 0, 1.4, .9, 1.8, col, em); const nk = joint(body, 0, .4, .8, Math.sin(t) * .4, -.8, 0); part(nk, 0, .9, 0, .2, 1.8, .2, col, em); part(nk, 0, 1.9, .2, .5, .5, .5, gl, 1, 0, 'ico');
        for (let i = 0; i < 4; i++) part(body, (i - 1.5) * .3, .5, -.6, .05, .8 + Math.sin(t * 4 + i) * .2, .05, gl, .9); break; }
      case 'archivist': { part(root, 0, 0, 0, 1.4, 1.4, 1.4, col, em, F_REFL, 'ico'); part(root, 0, 0, .55, .6, .6, .4, vul || !b.shield ? [1, 1, 1] : gl, 1, 0, 'ico');
        if (b.shield) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .8; partR(root, Math.cos(a) * 2.4, Math.sin(t * 2 + i) * .4, Math.sin(a) * 2.4, -a, 0, 0, .15, 1.8, 1.1, [.75, .78, .82], .2, F_REFL); part(root, Math.cos(a) * 2.48, Math.sin(t * 2 + i) * .4, Math.sin(a) * 2.48, .02, 1.2, .5, gl, .9); }
        for (let i = 0; i < 2; i++) { const rr = joint(root, 0, 0, 0, t * (i ? .7 : -.5), i ? 1.2 : .3, 0); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; part(rr, Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4, .25, .1, .25, gl, .8); } } break; }
      case 'titan': { const body = joint(root, 0, 3.4, 0, 0, .1 + (b.lift || 0) * -.3, 0); part(body, 0, 1, 0, 3.6, 2.6, 2.4, col, em, F_REFL); part(body, 0, 1, 1.21, 1.4, 1.2, .05, b.cold > 0 ? [.6, .9, 1] : [1, .55, .15], 1);
        for (const s of [-1, 1]) { part(body, s * 1.1, 3, -.8, .6, 1.8, .6, scalec(col, .8), em); } const hd = joint(body, 0, 2.6, .5, 0, 0, 0); part(hd, 0, .3, 0, 1.2, .8, 1, col, em); part(hd, 0, .3, .51, .9, .15, .02, [1, .3, .1], 1);
        for (const s of [-1, 1]) { const ar = joint(body, s * 2.2, 2, 0, 0, b.atk === 'slam' ? -2.4 * (b.lift || 0) : -.3, s * .1); part(ar, 0, -1.4, 0, .9, 2.8, .9, col, em, F_REFL); part(ar, 0, -3, 0, 1.4, 1, 1.4, scalec(col, .6), em); }
        for (const s of [-1, 1]) { const lg = joint(root, s * 1.2, 3.4, 0, 0, Math.sin(t * 2) * .15, 0); part(lg, 0, -1.7, 0, 1.1, 3.4, 1.3, scalec(col, .8), em); } if (Math.random() < .3) FX.steam(b.x, b.y + 8, b.z - 1, 1); break; }
      case 'resonant': { for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + t * .4; const r2 = i ? 1.6 : 0; partR(root, Math.cos(a) * r2, (i ? 0 : .5) + Math.sin(t * 2 + i) * .3, Math.sin(a) * r2, a, .3, .2, i ? 1 : 1.8, i ? 3 : 4, i ? 1 : 1.8, col, b.vuln > 0 ? 1 : .35, 0, 'oct'); }
        const rr = joint(root, 0, 0, 0, t, .4, 0); for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; part(rr, Math.cos(a) * 4, 0, Math.sin(a) * 4, .2, .2, .2, gl, 1); } break; }
      case 'firstvoice': { const al = .8; part(root, 0, 2.5, 0, 2, 5, 1.2, col, .9, F_UNLIT); part(root, 0, 5.6, 0, 1.2, 1.4, 1.2, [1, 1, 1], 1, F_UNLIT, 'ico');
        for (let i = 0; i < 3; i++) { const h = joint(root, 0, 5.6, 0, t * (i + 1) * .3, Math.PI / 2 + i * .3, 0); for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; part(h, Math.cos(a) * (1.6 + i * .6), Math.sin(a) * (1.6 + i * .6), 0, .12, .12, .12, gl, 1, F_UNLIT); } }
        for (const s of [-1, 1]) { const ar = joint(root, s * 1.2, 4.5, 0, 0, -.4 + Math.sin(t * .8 + s) * .3, s * .5); part(ar, 0, -1.6, 0, .4, 3.2, .4, col, .8, F_UNLIT); } break; }
      case 'chorus': { const body = joint(root, 0, 2.5, 0, 0, .2, 0); part(body, 0, .5, 0, 1.5, 2.2, 1, col, em); part(body, 0, .8, .51, .5, .5, .02, gl, 1);
        const hd = joint(body, 0, 1.9, .2, Math.sin(t * 1.3) * .5, .2, 0); part(hd, 0, .3, 0, .8, .9, .85, [.55, .57, .6], em, F_REFL); part(hd, 0, .35, .44, .6, .2, .02, gl, 1);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const tn = joint(body, Math.cos(a) * .6, .2, Math.sin(a) * .4 - .3, -a, 0, 1.1 + Math.sin(t * 2 + i) * .4); part(tn, 0, 1.4, 0, .18, 2.8, .18, col, em); part(tn, 0, 2.9, 0, .25, .25, .25, gl, 1, 0, 'oct'); }
        for (const s of [-1, 1]) { const lg = joint(root, s * .5, 2.4, 0, 0, Math.sin(t * 4) * .2, 0); part(lg, 0, -1.2, 0, .45, 2.4, .5, col, em); } break; }
    }
    if (b.beam != null) { const f = [Math.sin(b.beam), Math.cos(b.beam)]; A34.trs(_W, b.x + f[0] * 14, World.hf.at(b.x, b.z) + .45, b.z + f[1] * 14, b.beam, 0, 0, .35, .35, 28); R.inst('cube', _W, gl[0], gl[1], gl[2], 1, F_UNLIT); Game.flashLight(b.x + f[0] * 4, b.y + 1, b.z + f[1] * 4, gl, 10, .02); }
    if (b.atk === 'charge' && b.t < 1.1 && b.state === 'atk') { const f = [Math.sin(b.yaw), Math.cos(b.yaw)]; A34.trs(_W, b.x + f[0] * 9, World.hf.at(b.x, b.z) + .05, b.z + f[1] * 9, b.yaw, 0, 0, b.radius * 2, .03, 18); R.inst('cube', _W, 1, .2, .2, .8, F_UNLIT); }
    if ((b.atk === 'pulse' || b.atk === 'slam') && b.t < (b.atk === 'pulse' ? .9 : 1) && b.state === 'atk') { const r = b.atk === 'pulse' ? 7.5 : 3 + b.t * 3; A34.trs(_W, b.x, World.hf.at(b.x, b.z) + .05, b.z, b.anim.t, 0, 0, r * 2, .03, r * 2); R.inst('cyl', _W, 1, .25, .2, .5 + Math.sin(b.anim.t * 25) * .3, F_UNLIT); }
  },
};

/* =====================================================================
   COMPANIONS — physically present crew with follow AI and barks
   ===================================================================== */
const CREW = { mara: { name: 'Mara', role: 'Expedition Engineer', pitch: 1.25, col: '#ffb547' }, elias: { name: 'Elias', role: 'Research Specialist', pitch: .85, col: '#9fd3ff' }, nova: { name: 'Nova', role: 'Reconnaissance', pitch: 1.4, col: '#9dffb0' }, orin: { name: 'Orin', role: 'Signal Technician', pitch: .7, col: '#c9b6ff' },
  vael: { name: 'The First Voice', role: '', pitch: .6, col: '#aaffff' }, radio: { name: 'Unknown Signal', role: '', pitch: .9, col: '#ff8080' }, you: { name: 'You', role: '', pitch: 1, col: '#ffffff' }, sys: { name: 'Scanner', role: '', pitch: 2, col: '#6ff3ff' } };
const Companions = {
  list: [],
  set(ids, positions) { this.list = ids.map((id, i) => { const ch = makeChar(NPC_LOOKS[id]); const p = positions && positions[i]; ch.x = p ? p[0] : Player.x - 2 - i; ch.z = p ? p[1] : Player.z - 2; ch.y = World.ground(ch.x, ch.z, 999).h; ch.id = id; ch.follow = !p || p[2] !== 'stay'; ch.slot = i; ch.shootCd = 2; ch.onStep = () => { if (dist2(ch.x, ch.z, Player.x, Player.z) < 200) Audio2.sfx('step_ash', [ch.x, ch.y, ch.z], .4); }; return ch; }); },
  get(id) { return this.list.find(c => c.id === id) || (this.stationed || []).find(c => c.id === id); },
  update(dt) {
    const p = Player.ch;
    for (const c of this.list) {
      let tx = c.x, tz = c.z;
      if (c.follow && !Game.inCine) { const back = [-Math.sin(p.yaw), -Math.cos(p.yaw)], side = c.slot % 2 ? 1 : -1; tx = p.x + back[0] * (2.2 + c.slot) + back[1] * side * 1.4; tz = p.z + back[1] * (2.2 + c.slot) - back[0] * side * 1.4; }
      if (c.goto) { tx = c.goto[0]; tz = c.goto[1]; }
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
      if (d > 30 && c.follow) { c.x = tx; c.z = tz; c.y = World.ground(tx, tz, 999).h; c.scarf = null; }
      const sp = d > 6 ? 5.5 : d > 1.2 ? 3 : 0; const vx = d > .1 ? dx / d * sp : 0, vz = d > .1 ? dz / d * sp : 0;
      c.vx = lerp(c.vx || 0, vx, dt * 5); c.vz = lerp(c.vz || 0, vz, dt * 5);
      let nx = c.x + c.vx * dt, nz = c.z + c.vz * dt; const r = World.collide(nx, nz, .3, c.y, 1.7); nx = r[0]; nz = r[1];
      const g = World.ground(nx, nz, c.y + .5); if (Math.abs(g.h - c.y) < 1.2) { c.x = nx; c.z = nz; c.y = lerp(c.y, g.h, Math.min(1, dt * 15)); } c.onGround = true;
      c.speed = Math.hypot(c.vx, c.vz);
      // face movement, the speaker, or nearest threat
      let face = c.speed > .3 ? Math.atan2(c.vx, c.vz) : c.yaw; let threat = null;
      for (const e of Enemies.list) if (!e.dead && !e.hidden && !e.disguised && e.state === 'chase' && dist2(e.x, e.z, c.x, c.z) < 300) { threat = e; break; }
      if (threat) { face = Math.atan2(threat.x - c.x, threat.z - c.z); c.anim.aim = lerp(c.anim.aim, 1, dt * 5); c.shootCd -= dt;
        if (c.shootCd <= 0 && World.los([c.x, c.y + 1.3, c.z], [threat.x, threat.y + threat.aimH, threat.z])) { c.shootCd = 1.6 + Math.random(); const mz = c.muzzle || [c.x, c.y + 1.3, c.z]; Combat.shots.push({ x: mz[0], y: mz[1], z: mz[2], vx: (threat.x - mz[0]), vy: (threat.y + threat.aimH - mz[1]), vz: (threat.z - mz[2]), life: 1, dmg: 4, own: 'p', col: [.6, .9, 1], pierce: 0, hitSet: new Set(), r: .3 }); const s = Combat.shots[Combat.shots.length - 1], l = Math.hypot(s.vx, s.vy, s.vz) || 1; s.vx *= 40 / l; s.vy *= 40 / l; s.vz *= 40 / l; Audio2.sfx('shot', [c.x, c.y + 1, c.z]); } }
      else { c.anim.aim = lerp(c.anim.aim, 0, dt * 3); if (c.talking) face = Math.atan2(p.x - c.x, p.z - c.z); if (c.lookAt) face = Math.atan2(c.lookAt[0] - c.x, c.lookAt[1] - c.z); }
      c.yaw = lerpAng(c.yaw, face, dt * 6); c.anim.talk = c.talking ? 1 : 0;
      if (c.look.accessory === 1) stepScarf(c, dt, Game.wind);
      Anim.update(c, dt);
    }
  },
  draw() { for (const c of this.list) if (dist2(c.x, c.z, Cam.at[0], Cam.at[2]) < 3600) drawHumanoid(c, { weapon: c.id === 'elias' ? null : { id: 'pulse', col: [.6, .9, 1] } }); },
};

/* =====================================================================
   SCANNER — signature mechanic: pulse reveal, signal tracking, marking
   ===================================================================== */
const Scanner = {
  active: false, pulse: null, cd: 0, wave: new Float32Array(130), sig: 0, held: 0,
  range() { return (22 + Game.up('scan') * 8) * SUITS[Game.S.suit].scan; },
  update(dt) {
    const I = Input; this.cd -= dt; const want = Game.has('scanner') && !Game.lockInput() && I.act('scan');
    if (want && !this.active) { this.active = true; if (this.cd <= 0) this.fire(); }
    if (!want) this.active = false;
    this.held = this.active ? this.held + dt : 0;
    if (this.pulse) { const P = this.pulse; P.r += dt * 26; P.s = sat(1 - P.r / (P.max + 6)) * 1.2;
      for (const t of World.scanTargets) if (!t.hit && Math.hypot(t.x - P.x, t.z - P.z) < P.r) { t.hit = true; this.onTarget(t); }
      for (const e of Enemies.list) if (!e.dead && !e.markedBy && Math.hypot(e.x - P.x, e.z - P.z) < P.r) { e.markedBy = 1; e.marked = 8 + Game.up('scan') * 3; if (e.disguised && Game.up('scan') >= 1) Enemies.reveal(e); if (e.hidden) e.marked = 8; if (e.isBoss) Boss.onScan(); }
      if (P.r > P.max + 6) this.pulse = null; }
    // continuous waveform toward strongest signal in front of the camera
    let best = 0, bt = null; const f = Cam.forward(); const fl = Math.hypot(f[0], f[2]) || 1; const p = Player.ch;
    for (const t of World.scanTargets) { if (t.done || t.kind === 'hidden' && t.revealed) continue; const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz) || 1; if (d > 90) continue; const dot = (dx * f[0] + dz * f[2]) / (d * fl); const s = Math.max(0, dot) ** 4 * (1 - d / 90) * (t.strength || 1); if (s > best) { best = s; bt = t; } }
    this.sig = lerp(this.sig, best, dt * 5); this.target = bt;
    for (let i = 0; i < this.wave.length; i++) this.wave[i] = Math.sin(i * (.2 + this.sig * .5) + Game.time * 9) * (.2 + this.sig * .8) + (Math.random() - .5) * (1 - this.sig) * .9;
    if (this.active && this.sig > .5 && Math.random() < dt * this.sig * 3) Audio2.sfx('scan_ping');
  },
  fire() { const p = Player.ch; this.cd = 1.4; this.pulse = { x: p.x, y: p.y + 1, z: p.z, r: 0, max: this.range(), s: 1 }; for (const t of World.scanTargets) t.hit = false; for (const e of Enemies.list) e.markedBy = 0;
    Audio2.sfx('scan'); Player.noise = Math.max(Player.noise, 12 * SUITS[Game.S.suit].noise); Game.event('scan');
    if (Game.S.chapter >= 1 && Math.random() < .18) setTimeout(() => Game.scanLine('SECONDARY ECHO SIGNATURE DETECTED · SOURCE: OPERATOR · CALIBRATING…'), 900); },
  onTarget(t) {
    if (t.kind === 'hidden' && !t.revealed) { t.revealed = true; Game.S.rev[Game.S.region] = (Game.S.rev[Game.S.region] || 0) | (1 << t.group); Audio2.sfx('reveal'); UI.toast(t.label || 'Hidden structure resolved'); if (t.onReveal) t.onReveal(t); Game.event('reveal_' + t.id); }
    else if (t.kind === 'freq' && !t.done) { Audio2.sfx('scan_ping'); UI.toast('◈ Anomalous frequency detected nearby'); t.found = true; }
    else if (t.kind === 'signal') { Audio2.sfx('scan_ping', [t.x, t.y || 2, t.z]); if (t.onScan) t.onScan(t); Game.event('scanned_' + t.id); }
    else if (t.kind === 'hazard') { Game.cue('Unstable resonance: ' + (t.label || 'avoid this area')); t.shown = 6; }
    else if (t.kind === 'lore' && !t.done) { t.done = true; Audio2.sfx('log'); if (t.onScan) t.onScan(t); }
  },
};

/* =====================================================================
   PUZZLES — overlay (tune, route) and in-world (sequence, beam)
   ===================================================================== */
const Puzzle = {
  cur: null,
  open(def, onSolve) {
    this.cur = Object.assign({ t: 0, hold: 0, hints: 0 }, def); this.onSolve = onSolve; const P = this.cur;
    $('puztitle').textContent = def.title || 'Signal'; $('puzsub').textContent = def.sub || ''; $('puzhint').textContent = def.help || '';
    const ctr = $('puzctr'); ctr.innerHTML = '';
    if (def.type === 'tune') { const n = def.dials || 1; P.vals = []; P.target = def.target || Array.from({ length: n }, () => .15 + Math.random() * .7); const names = ['Frequency', 'Phase', 'Amplitude'];
      for (let i = 0; i < n; i++) { P.vals[i] = (P.target[i] + .35 + Math.random() * .3) % 1; const row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<label>${names[i]}</label><input type="range" min="0" max="1000" value="${P.vals[i] * 1000}" data-i="${i}">`; ctr.appendChild(row); row.querySelector('input').oninput = e => { P.vals[i] = e.target.value / 1000; P.sel = i; }; }
      P.sel = 0; this.osc(true); }
    if (def.type === 'route') this.genRoute(P);
    Game.setState('puzzle'); UI.show('puz'); const c = $('puzc');
    c.onpointerdown = e => this.click(e);
  },
  osc(on) { if (!Audio2.ok) return; if (on) { const c = Audio2.ctx; this.o1 = c.createOscillator(); this.o2 = c.createOscillator(); this.og = c.createGain(); this.og.gain.value = .04; this.o1.type = 'triangle'; this.o2.type = 'triangle'; this.o1.connect(this.og); this.o2.connect(this.og); this.og.connect(Audio2.bus.sfx); this.o1.start(); this.o2.start(); }
    else if (this.o1) { try { this.o1.stop(); this.o2.stop(); } catch (e) { } this.o1 = null; } },
  close(solved) { this.osc(false); const P = this.cur; this.cur = null; UI.hide('puz'); Game.setState('play'); if (solved) { Audio2.sfx('solve'); if (this.onSolve) this.onSolve(); } else Audio2.sfx('ui_back'); },
  hint() { const P = this.cur; if (!P) return; P.hints++; Audio2.sfx('ui');
    if (P.type === 'tune') { let worst = 0, wi = 0; P.vals.forEach((v, i) => { const d = Math.abs(v - P.target[i]); if (d > worst) { worst = d; wi = i; } }); $('puzhint').textContent = `Hint: ${['Frequency', 'Phase', 'Amplitude'][wi]} is ${P.vals[wi] < P.target[wi] ? 'too low' : 'too high'}. Listen for the beating to slow.`; P.showT = 2; }
    if (P.type === 'route') { const wrong = P.cells.filter(c => c.sol !== undefined && c.rot % (c.sym || 4) !== c.sol % (c.sym || 4)); if (wrong.length) { const c = wrong[0]; c.rot = c.sol; c.locked = true; $('puzhint').textContent = 'Hint: one conduit locked into place.'; } } },
  tol() { return Settings.v.puzzleHints ? .06 : .035; },
  update(dt) {
    const P = this.cur; if (!P) return; P.t += dt; const c = $('puzc'), g = c.getContext('2d'); const W = c.width, H = c.height; g.fillStyle = '#050a0e'; g.fillRect(0, 0, W, H);
    const I = Input;
    if (P.type === 'tune') {
      const n = P.vals.length; if (I.down.has('ArrowUp') && !P.k1) { P.sel = (P.sel + n - 1) % n; } if (I.down.has('ArrowDown') && !P.k2) { P.sel = (P.sel + 1) % n; } P.k1 = I.down.has('ArrowUp'); P.k2 = I.down.has('ArrowDown');
      let adj = 0; if (I.down.has('ArrowLeft') || I.key('left')) adj -= 1; if (I.down.has('ArrowRight') || I.key('right')) adj += 1; if (I.padAxes) adj += I.padAxes[0] * 1.5; if (I.padBtn) { if (I.padBtn(12) && !P.p1) P.sel = (P.sel + n - 1) % n; if (I.padBtn(13) && !P.p2) P.sel = (P.sel + 1) % n; P.p1 = I.padBtn(12); P.p2 = I.padBtn(13); }
      if (adj) { P.vals[P.sel] = clamp(P.vals[P.sel] + adj * dt * .18, 0, 1); const el = $('puzctr').querySelectorAll('input')[P.sel]; if (el) el.value = P.vals[P.sel] * 1000; }
      $('puzctr').querySelectorAll('.row').forEach((r, i) => r.style.outline = i === P.sel ? '1px solid #ffb547' : '');
      const err = P.vals.reduce((s, v, i) => s + Math.abs(v - P.target[i]), 0) / n; const ok = err < this.tol();
      const wave = (vals, x) => { const f = 1 + vals[0] * 4, ph = (vals[1] ?? .5) * TAU, a = .3 + (vals[2] ?? .6) * .6; return Math.sin(x * f * .035 + ph + P.t * 1.5) * a; };
      g.strokeStyle = '#123'; g.lineWidth = 1; for (let x = 0; x < W; x += 25) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 25) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = 'rgba(255,181,71,.9)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < W; x += 2) { const y = H / 2 - wave(P.target, x) * H * .36; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      const noise = Math.min(1, err * 3); g.strokeStyle = ok ? '#8dff9a' : '#6ff3ff'; g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x < W; x += 2) { const y = H / 2 - wave(P.vals, x) * H * .36 + (Math.random() - .5) * noise * 18; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = '#6ff3ff'; g.font = '10px monospace'; g.fillText('SIGNAL COHERENCE ' + Math.round((1 - Math.min(1, err * 3)) * 100) + '%', 8, 14); if (P.showT > 0) { P.showT -= dt; g.fillStyle = '#ffb547'; g.fillText('TARGET ' + P.target.map(v => (v * 100).toFixed(0)).join(' · '), 8, H - 8); }
      if (this.o1) { const f1 = 220 + P.target[0] * 440, f2 = 220 + P.vals[0] * 440 + (n > 1 ? (P.vals[1] - P.target[1]) * 60 : 0); this.o1.frequency.value = f1; this.o2.frequency.value = f2; }
      if (ok) { P.hold += dt; g.fillStyle = '#8dff9a'; g.fillRect(0, H - 4, W * Math.min(1, P.hold / 1.2), 4); if (P.hold > 1.2) return this.close(true); } else P.hold = 0;
    }
    if (P.type === 'route') this.drawRoute(P, g, W, H, dt);
    if ((I.pressed.has('Escape') || I.pressed.has('Pad1')) && P.t > .2) return this.close(false);
    if (I.pressed.has('KeyH') || I.pressed.has('Pad3')) this.hint();
  },
  // ---- conduit routing: generate a solvable grid by carving a path, then scramble
  genRoute(P) {
    const W = P.w || 5, H = P.h || 4, rng = RNG(P.seed || 1); P.W = W; P.H = H; const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push({ x, y, con: [0, 0, 0, 0], rot: 0 });
    const at = (x, y) => cells[y * W + x]; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const carve = (sx, sy, tx, ty) => { let x = sx, y = sy; const seen = new Set([x + ',' + y]); let guard = 0; while ((x !== tx || y !== ty) && guard++ < 200) { const opts = []; for (let d = 0; d < 4; d++) { const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const closer = Math.abs(tx - nx) + Math.abs(ty - ny) < Math.abs(tx - x) + Math.abs(ty - y); opts.push(...(closer ? [d, d, d] : seen.has(nx + ',' + ny) ? [] : [d])); } const d = rng.pick(opts); const nx = x + D[d][0], ny = y + D[d][1]; at(x, y).con[d] = 1; at(nx, ny).con[(d + 2) % 4] = 1; x = nx; y = ny; seen.add(x + ',' + y); } };
    P.src = { x: 0, y: rng.int(0, H - 1) }; P.sinks = [{ x: W - 1, y: rng.int(0, H - 1) }]; if (P.multi) P.sinks.push({ x: rng.int(2, W - 2), y: P.src.y ? 0 : H - 1 });
    at(P.src.x, P.src.y).con[3] = 1; for (const s of P.sinks) { carve(P.src.x, P.src.y, s.x, s.y); at(s.x, s.y).con[s.x === W - 1 ? 1 : s.y === 0 ? 0 : 2] = 1; }
    for (const c of cells) { if (!c.con.some(v => v)) { const k = rng.int(0, 2); c.con = k === 0 ? [1, 0, 1, 0] : k === 1 ? [1, 1, 0, 0] : [0, 0, 0, 0]; } const r = rng.int(0, 3); c.sol = (4 - r) % 4; c.base = c.con.slice(); c.rot = r; const s = c.con.join(''); c.sym = (s === '1010' || s === '0101') ? 2 : (s === '1111' || s === '0000') ? 1 : 4; c.sol = (4 - r) % 4; }
    // base holds the solved orientation; displayed = base rotated by rot; solved when rot ≡ 0 for path cells
    for (const c of cells) { c.sol = 0; }
    P.cells = cells; P.cur = [0, 0];
  },
  conOf(c) { const r = c.rot % 4; return [0, 1, 2, 3].map(d => c.base[(d - r + 4) % 4]); },
  powered(P) { const W = P.W, H = P.H, at = (x, y) => P.cells[y * W + x], D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const on = new Set(); const st = [[P.src.x, P.src.y]]; if (!this.conOf(at(P.src.x, P.src.y))[3]) return on;
    on.add(P.src.x + ',' + P.src.y); while (st.length) { const [x, y] = st.pop(); const c = this.conOf(at(x, y)); for (let d = 0; d < 4; d++) { if (!c[d]) continue; const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = nx + ',' + ny; if (on.has(k)) continue; if (this.conOf(at(nx, ny))[(d + 2) % 4]) { on.add(k); st.push([nx, ny]); } } } return on; },
  drawRoute(P, g, W, H, dt) {
    const cs = Math.min((W - 40) / P.W, (H - 30) / P.H) | 0, ox = (W - cs * P.W) / 2 | 0, oy = (H - cs * P.H) / 2 + 6 | 0; P.geo = { cs, ox, oy };
    const I = Input; const mv = (dx, dy) => { P.cur[0] = clamp(P.cur[0] + dx, 0, P.W - 1); P.cur[1] = clamp(P.cur[1] + dy, 0, P.H - 1); };
    if (I.pressed.has('ArrowLeft') || I.pressed.has(Settings.v.keys.left) || I.pressed.has('Pad14')) mv(-1, 0); if (I.pressed.has('ArrowRight') || I.pressed.has(Settings.v.keys.right) || I.pressed.has('Pad15')) mv(1, 0);
    if (I.pressed.has('ArrowUp') || I.pressed.has(Settings.v.keys.up) || I.pressed.has('Pad12')) mv(0, -1); if (I.pressed.has('ArrowDown') || I.pressed.has(Settings.v.keys.down) || I.pressed.has('Pad13')) mv(0, 1);
    if (I.pressed.has('Space') || I.pressed.has('Enter') || I.pressed.has('Pad0')) this.rotate(P.cells[P.cur[1] * P.W + P.cur[0]]);
    const on = this.powered(P);
    for (const c of P.cells) { const x = ox + c.x * cs, y = oy + c.y * cs; g.fillStyle = c.locked ? '#14241a' : '#0b141a'; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); const con = this.conOf(c), lit = on.has(c.x + ',' + c.y);
      g.fillStyle = lit ? '#ffb547' : '#3a5a66'; const m = cs / 2, w = Math.max(3, cs / 6 | 0); if (con.some(v => v)) g.fillRect(x + m - w / 2, y + m - w / 2, w, w);
      if (con[0]) g.fillRect(x + m - w / 2, y, w, m); if (con[2]) g.fillRect(x + m - w / 2, y + m, w, m); if (con[3]) g.fillRect(x, y + m - w / 2, m, w); if (con[1]) g.fillRect(x + m, y + m - w / 2, m, w);
      if (P.cur[0] === c.x && P.cur[1] === c.y && Input.device !== 'touch') { g.strokeStyle = '#6ff3ff'; g.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3); } }
    g.fillStyle = '#ffb547'; g.fillRect(ox - 12, oy + P.src.y * cs + cs / 2 - 4, 12, 8); g.font = '9px monospace'; g.fillText('PWR', ox - 30, oy + P.src.y * cs + cs / 2 + 3);
    let all = true; for (const s of P.sinks) { const lit = on.has(s.x + ',' + s.y) && this.conOf(P.cells[s.y * P.W + s.x])[s.x === P.W - 1 ? 1 : s.y === 0 ? 0 : 2]; all = all && lit; g.fillStyle = lit ? '#8dff9a' : '#ff5a5a'; if (s.x === P.W - 1) g.fillRect(ox + P.W * cs, oy + s.y * cs + cs / 2 - 4, 12, 8); else g.fillRect(ox + s.x * cs + cs / 2 - 4, s.y === 0 ? oy - 12 : oy + P.H * cs, 8, 12); }
    g.fillStyle = '#6ff3ff'; g.font = '10px monospace'; g.fillText('ROUTE POWER TO ALL RECEIVERS', 8, 12);
    if (all) { P.hold += dt; if (P.hold > .6) return this.close(true); } else P.hold = 0;
  },
  rotate(c) { if (!c || c.locked) return; c.rot = (c.rot + 1) % 4; Audio2.sfx('ui'); },
  click(e) { const P = this.cur; if (!P || P.type !== 'route' || !P.geo) return; const c = $('puzc'), r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * c.width, y = (e.clientY - r.top) / r.height * c.height; const { cs, ox, oy } = P.geo; const gx = Math.floor((x - ox) / cs), gy = Math.floor((y - oy) / cs); if (gx >= 0 && gy >= 0 && gx < P.W && gy < P.H) { P.cur = [gx, gy]; this.rotate(P.cells[gy * P.W + gx]); } },
};
/* in-world beam puzzles (mirrors, dishes, wind vanes) */
const Beams = {
  sets: [],
  add(def) { def.mirrors.forEach(m => { m.ang = m.ang ?? 0; World.inter.push({ x: m.x, z: m.z, y: World.hf.at(m.x, m.z), r: 1.8, label: def.verb || 'Rotate mirror', kind: 'mirror', on: () => !def.solved, use: () => { m.ang = (m.ang + (def.step || Math.PI / 4)) % TAU; Audio2.sfx('machine', [m.x, 1, m.z]); } }); World.addCol({ x: m.x, z: m.z, r: .45, y1: World.hf.at(m.x, m.z) + 1.4 }); }); this.sets.push(def); return def; },
  trace(def) {
    let x = def.src[0], z = def.src[1], a = def.dir; const pts = [[x, z]]; let hit = false; const H = def.h || 1.2;
    if (def.kind === 'dish') { const ta = Math.atan2(def.target[0] - x, def.target[1] - z); hit = Math.abs(angDiff(a, ta)) < .2; const L = hit ? Math.hypot(def.target[0] - x, def.target[1] - z) : 30; pts.push([x + Math.sin(hit ? ta : a) * L, z + Math.cos(hit ? ta : a) * L]); def.pts = pts; return hit; }
    for (let b = 0; b < 10; b++) { let dx = Math.sin(a), dz = Math.cos(a), best = 40, bm = null;
      for (const m of def.mirrors) { if (m === def.last) continue; const ox = m.x - x, oz = m.z - z, t = ox * dx + oz * dz; if (t <= .3) continue; const px = ox - dx * t, pz = oz - dz * t; if (px * px + pz * pz < .36 && t < best) { best = t; bm = m; } }
      const tr = def.target; { const ox = tr[0] - x, oz = tr[1] - z, t = ox * dx + oz * dz; if (t > .3) { const px = ox - dx * t, pz = oz - dz * t; if (px * px + pz * pz < .64 && t < best) { pts.push([tr[0], tr[1]]); hit = true; break; } } }
      // walls stop the beam
      let wall = best; for (let s = .8; s < best - .5; s += .5) { const px = x + dx * s, pz = z + dz * s; if (World.solid(px, World.hf.at(px, pz) + H, pz)) { wall = s; break; } }
      if (wall < best || !bm) { pts.push([x + dx * wall, z + dz * wall]); break; }
      x = bm.x; z = bm.z; pts.push([x, z]); def.last = bm;
      if (def.kind === 'dish') break; // dishes don't reflect
      const n = bm.ang; const nx = Math.sin(n), nz = Math.cos(n); const d = dx * nx + dz * nz; const rx = dx - 2 * d * nx, rz = dz - 2 * d * nz; a = Math.atan2(rx, rz);
    }
    def.last = null; def.pts = pts; return hit;
  },
  update(dt) { for (const d of this.sets) { if (d.region !== GS().region) continue; const hit = this.trace(d); if (hit && !d.solved) { d.hold = (d.hold || 0) + dt; if (d.hold > .5) { d.solved = true; Audio2.sfx('solve'); if (d.onSolve) d.onSolve(); } } else if (!hit) d.hold = 0; } },
  draw() { for (const d of this.sets) { if (d.region !== GS().region || !d.pts) continue; const y0 = (x, z) => World.hf.at(x, z) + (d.h || 1.2); const c = d.solved ? [.6, 1, .7] : d.col || [1, .85, .5];
      for (let i = 0; i < d.pts.length - 1; i++) { const a = d.pts[i], b = d.pts[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const y = (y0(a[0], a[1]) + y0(b[0], b[1])) / 2; A34.trs(_W, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, Math.atan2(b[0] - a[0], b[1] - a[1]), 0, 0, .1, .1, L); R.inst('cube', _W, c[0], c[1], c[2], 1, F_UNLIT); }
      for (const m of d.mirrors) { const gy = World.hf.at(m.x, m.z); A34.trs(_W, m.x, gy + .5, m.z, 0, 0, 0, .5, 1, .5); R.inst('cyl', _W, .3, .3, .33, 0); A34.trs(_W, m.x, gy + (d.h || 1.2), m.z, m.ang, 0, 0, d.kind === 'dish' ? 1.2 : 1.1, d.kind === 'dish' ? 1.2 : .9, .08); R.inst(d.kind === 'dish' ? 'cyl' : 'cube', _W, .75, .82, .9, .2, F_REFL); }
      const t = d.target, gy = World.hf.at(t[0], t[1]); A34.trs(_W, t[0], gy + (d.h || 1.2), t[1], Game.time, 0, 0, .6, .6, .6); R.inst('oct', _W, c[0], c[1], c[2], d.solved ? 1 : .4, d.solved ? F_UNLIT : 0);
      if (d.kind !== 'dish') { const s = d.src, sy = World.hf.at(s[0], s[1]); A34.trs(_W, s[0], sy + .7, s[1], d.dir, 0, 0, .6, 1.4, .6); R.inst('cube', _W, .25, .26, .3, 0); } } },
};
/* in-world tone sequence (Vael bells) */
const Seq = {
  sets: [],
  add(def) { const tones = [523, 659, 587, 784, 698, 880]; def.i = 0; def.pylons.forEach((p, k) => { p.k = k; p.lit = 0; World.inter.push({ x: p.x, z: p.z, y: World.hf.at(p.x, p.z), r: 2, label: 'Strike resonator', kind: 'pylon', on: () => !def.solved, use: () => this.hit(def, p), shootable: () => this.hit(def, p), sr: 1 }); World.addCol({ x: p.x, z: p.z, r: .5, y1: World.hf.at(p.x, p.z) + 2.4 }); });
    World.inter.push({ x: def.cond[0], z: def.cond[1], y: World.hf.at(def.cond[0], def.cond[1]), r: 2.2, label: 'Listen to the conductor stone', kind: 'cond', on: () => !def.solved, use: () => this.play(def) });
    def.tones = tones; this.sets.push(def); return def; },
  play(def) { def.i = 0; def.order.forEach((k, j) => setTimeout(() => { Audio2.tone(def.tones[k], .7, 'triangle', .12, { verb: 1 }); def.pylons[k].lit = .8; }, j * 700)); if (Settings.v.puzzleHints) Game.cue('Order: ' + def.order.map(k => k + 1).join(' → ')); },
  hit(def, p) { if (def.solved) return; Audio2.tone(def.tones[p.k], .6, 'triangle', .12, { verb: 1 }); p.lit = .6; if (def.order[def.i] === p.k) { def.i++; if (def.i >= def.order.length) { def.solved = true; setTimeout(() => { Audio2.sfx('solve'); if (def.onSolve) def.onSolve(); }, 500); } } else { def.i = 0; setTimeout(() => Audio2.sfx('fail'), 300); } },
  draw(dt) { for (const d of this.sets) { if (d.region !== GS().region) continue; for (const p of d.pylons) { p.lit = Math.max(0, p.lit - dt); const gy = World.hf.at(p.x, p.z); A34.trs(_W, p.x, gy + 1.2, p.z, 0, 0, 0, .7, 2.4, .7); R.inst('cyl', _W, .35, .33, .3, 0, F_OCC); A34.trs(_W, p.x, gy + 2.7, p.z, Game.time + p.k, 0, 0, .55, .7, .55); R.inst('oct', _W, .5, .9, 1, d.solved ? 1 : p.lit > 0 ? 1 : .25, p.lit > 0 || d.solved ? F_UNLIT : 0); if (p.lit > 0) Game.flashLight(p.x, gy + 2.7, p.z, [.5, .9, 1], 6, .01); }
    const gy = World.hf.at(d.cond[0], d.cond[1]); A34.trs(_W, d.cond[0], gy + .5, d.cond[1], .3, 0, 0, 1.4, 1, 1); R.inst('cube', _W, .4, .38, .36, 0); A34.trs(_W, d.cond[0], gy + 1.05, d.cond[1], .3, 0, 0, 1, .06, .6); R.inst('cube', _W, .5, .9, 1, .7); } },
};
