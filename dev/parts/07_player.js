
/* =====================================================================
   PHYSICS PROPS — lightweight rigid bodies (sphere/box proxies)
   ===================================================================== */
const Props = {
  add(kind, x, z, o = {}) {
    const y = World.hf.at(x, z) + (o.y || 0); const defs = { crate: { r: .42, m: 3, col: [.45, .36, .24], hp: 20, salv: 3 }, barrel: { r: .38, m: 4, col: [.35, .2, .15], hp: 30, salv: 4, roll: true }, can: { r: .15, m: .4, col: [.6, .6, .55], hp: 4, roll: true },
      rock: { r: .3, m: 5, col: [.4, .38, .4], hp: 999, roll: true }, cell: { r: .25, m: 1, col: [.2, .8, .9], hp: 6, salv: 2, em: .8 }, pod: { r: .5, m: 6, col: [.6, .62, .64], hp: 40, salv: 6 }, coolant: { r: .55, m: 8, col: [.6, .9, 1], hp: 25, explode: 'cold', em: .4 } };
    const d = defs[kind]; const p = Object.assign({ kind, x, y: y + d.r, z, vx: 0, vy: 0, vz: 0, rx: 0, ry: Math.random() * 6, rz: 0, sleep: 0 }, d, o); p.col = o.col || d.col; World.props.push(p); return p;
  },
  impulse(p, ix, iy, iz) { p.vx += ix / p.m; p.vy += iy / p.m; p.vz += iz / p.m; p.sleep = 0; },
  damage(p, dmg, ix = 0, iz = 0) { if (p.hp > 900) { this.impulse(p, ix, 2, iz); return; } p.hp -= dmg; this.impulse(p, ix, 1.5, iz); if (p.hp <= 0) this.destroy(p); },
  destroy(p) { const i = World.props.indexOf(p); if (i >= 0) World.props.splice(i, 1); Audio2.sfx('break', [p.x, p.y, p.z]); FX.burst(p.x, p.y, p.z, 18, p.col, 3, 1.2, .9);
    if (p.salv) Game.addSalvage(p.salv, p.x, p.y, p.z);
    if (p.explode === 'cold') { FX.burst(p.x, p.y + .5, p.z, 60, [.7, .95, 1], 6, 1.8, 1.2, true); Audio2.sfx('burst', [p.x, p.y, p.z]); Combat.blast(p.x, p.y, p.z, 5, 30, 'cold'); } },
  step(dt) {
    const L = World.props, g = 18;
    for (const p of L) {
      if (p.sleep > 1.5) continue;
      p.vy -= g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const gr = World.ground(p.x, p.z, p.y - p.r + .3, .3, p.r);
      if (p.y - p.r < gr.h) { p.y = gr.h + p.r; if (p.vy < -3) Audio2.sfx('thud', [p.x, p.y, p.z], Math.min(1, -p.vy / 10)); p.vy = -p.vy * .25; if (Math.abs(p.vy) < .5) p.vy = 0;
        const n = World.hf.normal(p.x, p.z); p.vx += n[0] * g * dt * (p.roll ? .8 : .2); p.vz += n[2] * g * dt * (p.roll ? .8 : .2);
        const fr = Math.pow(p.roll ? .6 : .02, dt); p.vx *= fr; p.vz *= fr; }
      const [nx, nz, hit] = World.collide(p.x, p.z, p.r, p.y - p.r, p.r * 2, .25); if (hit) { const bx = nx - p.x, bz = nz - p.z; if (bx || bz) { const l = Math.hypot(bx, bz); const vn = (p.vx * bx + p.vz * bz) / l; if (vn < 0) { p.vx -= 1.5 * vn * bx / l; p.vz -= 1.5 * vn * bz / l; } } } p.x = nx; p.z = nz;
      if (p.roll) { p.rx += p.vz * dt / p.r; p.rz -= p.vx * dt / p.r; }
      if (Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.vz) < .05) p.sleep += dt; else p.sleep = 0;
      if (p.y < -40) p.hp = 0;
    }
    // prop-prop sphere contacts
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, m = a.r + b.r, d2 = dx * dx + dy * dy + dz * dz; if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), o = (m - d) / d * .5; a.x -= dx * o; a.y -= dy * o * .5; a.z -= dz * o; b.x += dx * o; b.y += dy * o * .5; b.z += dz * o; const t = (a.vx - b.vx) * dx / d + (a.vz - b.vz) * dz / d; if (t > 0) { const ia = t * b.m / (a.m + b.m), ib = t * a.m / (a.m + b.m); a.vx -= ia * dx / d; a.vz -= ia * dz / d; b.vx += ib * dx / d; b.vz += ib * dz / d; a.sleep = b.sleep = 0; } } }
  },
  draw() {
    for (const p of World.props) {
      if (dist2(p.x, p.z, Cam.at[0], Cam.at[2]) > 3600) continue; const c = p.col;
      if (p.kind === 'crate' || p.kind === 'pod') { A34.trs(_W, p.x, p.y, p.z, p.ry, p.rx * .2, p.rz * .2, p.r * 1.9, p.r * 1.9, p.r * 1.9); R.inst('cube', _W, c[0], c[1], c[2], 0, F_OCC); A34.trs(_W, p.x, p.y, p.z, p.ry, p.rx * .2, p.rz * .2, p.r * 1.95, p.r * .3, p.r * 1.95); R.inst('cube', _W, c[0] * .6, c[1] * .6, c[2] * .6, 0); }
      else if (p.kind === 'barrel' || p.kind === 'can' || p.kind === 'coolant') { A34.trs(_W, p.x, p.y, p.z, p.ry, p.rx, p.rz, p.r * 1.8, p.r * 2.2, p.r * 1.8); R.inst('cyl', _W, c[0], c[1], c[2], p.em || 0, F_REFL); }
      else if (p.kind === 'cell') { A34.trs(_W, p.x, p.y, p.z, p.ry + Game.time, 0, 0, p.r * 1.4, p.r * 2, p.r * 1.4); R.inst('oct', _W, c[0], c[1], c[2], p.em); }
      else { A34.trs(_W, p.x, p.y, p.z, p.ry, p.rx, p.rz, p.r * 2, p.r * 1.6, p.r * 2); R.inst('ico', _W, c[0], c[1], c[2], 0); }
    }
  },
};

/* =====================================================================
   PLAYER — movement, traversal, combat input, resources
   ===================================================================== */
const WEAPONS = {
  pulse: { id: 'pulse', name: 'Pulse Emitter', dmg: 12, heat: 7, rate: .15, speed: 46, spread: .015, col: [1, .75, .3], desc: 'Standard expedition sidearm. Coherent light bolts. Overheats under sustained fire.' },
  scatter: { id: 'scatter', name: 'Scatter Coil', dmg: 8, pellets: 7, heat: 26, rate: .62, speed: 36, spread: .16, col: [1, .45, .25], desc: 'Salvaged settlement mining tool. Devastating up close; useless at range.' },
  lance: { id: 'lance', name: 'Resonance Lance', dmg: 55, heat: 42, rate: 1.0, speed: 90, spread: 0, pierce: true, col: [.4, 1, .95], desc: 'Vael-tuned beam. Pierces through multiple Echoed. Slow cycle.' },
};
const SUITS = {
  field: { name: 'Field Suit', armor: 0, speed: 1, noise: 1, scan: 1, hp: 0, desc: 'Balanced expedition suit.' },
  scout: { name: 'Scout Weave', armor: -.15, speed: 1.12, noise: .7, scan: 1, hp: 0, desc: '+12% speed, quieter steps. Takes 15% more damage.' },
  plate: { name: 'Field Plate', armor: .3, speed: .9, noise: 1.4, scan: 1, hp: 20, desc: '30% damage reduction, +20 health. Slower and louder.' },
  mesh: { name: 'Signal Mesh', armor: 0, speed: 1, noise: .8, scan: 1.5, hp: -15, desc: '+50% scanner range and reveal time. -15 health.' },
};
const Player = {
  init(look) {
    this.ch = makeChar(look); const c = this.ch; c.onStep = side => this.footstep(side);
    this.vx = 0; this.vz = 0; this.vy = 0; this.hp = 100; this.stamina = 100; this.heat = 0; this.overheat = 0; this.fireCd = 0; this.burstCd = 0; this.meleeCd = 0; this.inv = 0; this.coyote = 0; this.jumpBuf = 0; this.airJumps = 0;
    this.state = 'move'; this.lamp = false; this.lock = null; this.dead = false; this.safe = [0, 0, 0]; this.safeT = 0; this.noise = 0; this.hurtT = 0; this.charge = 0; this.aimDir = [0, 0, 1]; this.aiming = false; this.mantleT = 0;
  },
  get x() { return this.ch.x; }, get y() { return this.ch.y; }, get z() { return this.ch.z; },
  maxHp() { return 100 + (Game.up('armor') * 20) + SUITS[Game.S.suit].hp; },
  weapon() { return WEAPONS[Game.S.weapon] || WEAPONS.pulse; },
  place(x, z, yaw = 0) { const c = this.ch; c.x = x; c.z = z; c.y = World.ground(x, z, 999).h; c.yaw = yaw; this.vx = this.vz = this.vy = 0; this.safe = [x, c.y, z]; c.scarf = null; },
  footstep(side) {
    const c = this.ch; const m = MATS[World.hf.matAt(c.x, c.z)]; let surf = m === 'grass' || m === 'mud' ? 'grass' : m === 'metal' ? 'metal' : m === 'stone' || m === 'sand' ? 'stone' : m === 'crystal' ? 'crystal' : 'ash';
    const g = World.ground(c.x, c.z, c.y + .2); if (g.col) surf = g.col.surf || (g.col.kind === 'platform' || g.col.kind === 'stair' ? 'metal' : 'stone');
    if (World.water && c.y < World.water.h + .05) surf = 'water';
    const loud = c.crouch ? .35 : c.speed > 5 ? 1.2 : .7; Audio2.sfx('step_' + surf, null, loud * (c.crouch ? .5 : 1));
    this.noise = Math.max(this.noise, (c.crouch ? 2 : c.speed > 5 ? 11 : 6) * SUITS[Game.S.suit].noise);
    const fx = c.x + Math.cos(c.yaw) * (side ? .1 : -.1), fz = c.z - Math.sin(c.yaw) * (side ? .1 : -.1);
    if (surf === 'water') { FX.splash(fx, World.water.h, fz, .6); Game.ripple(fx, fz, .7); }
    else if (surf === 'ash' || surf === 'stone') FX.dust(fx, c.y + .05, fz, c.speed > 5 ? 4 : 2, World.region.dustCol);
    else if (surf === 'grass' && Math.random() < .4) FX.leaf(fx, c.y + .2, fz, World.region.leafCol);
  },
  hurt(dmg, from, kind) {
    if (this.dead || this.inv > 0 || Game.god) return false; const diff = { story: .4, easy: .65, normal: 1, hard: 1.4 }[Settings.v.difficulty] || 1;
    dmg *= diff * (1 - SUITS[Game.S.suit].armor) * (1 - Game.up('armor') * .06); this.hp -= dmg; this.inv = .45; this.hurtT = .5;
    const c = this.ch; c.anim.hurt = .3; c.anim.hurtDir = Math.random() < .5 ? -1 : 1; Audio2.sfx('hurt'); Cam.shake(.35); Input.rumble(.6, 140);
    if (from) { const dx = c.x - from[0], dz = c.z - from[2], l = Math.hypot(dx, dz) || 1; this.vx += dx / l * 6; this.vz += dz / l * 6; }
    FX.burst(c.x, c.y + 1.1, c.z, 10, [1, .3, .3], 2, .6, .5);
    if (Settings.v.audioCues && from) Game.cue('Damage from ' + Game.dirName(from[0], from[2]));
    if (this.hp <= 0) { this.hp = 0; this.die(); } return true;
  },
  die() { this.dead = true; this.ch.anim.dead = true; Audio2.sfx('echo_die'); Game.onDeath(); },
  update(dt) {
    const c = this.ch, I = Input, S = Game.S, suit = SUITS[S.suit];
    this.inv = Math.max(0, this.inv - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.noise = Math.max(0, this.noise - dt * 12);
    this.fireCd -= dt; this.burstCd -= dt; this.meleeCd -= dt;
    if (this.overheat > 0) { this.overheat -= dt; if (this.overheat <= 0) this.heat = 0; }
    else this.heat = Math.max(0, this.heat - dt * (c.anim.reload > 0 ? 120 : 26 + Game.up('cooling') * 10));
    if (this.dead) { c.speed = lerp(c.speed, 0, dt * 5); Anim.update(c, dt); return; }
    const locked = Game.lockInput();
    // --- desired movement ---
    let mx = locked ? 0 : I.move[0], my = locked ? 0 : I.move[1]; const mag = Math.min(1, Math.hypot(mx, my));
    const cy = Cam.moveYaw(); const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    let dx = fx * -my + rx * mx, dz = fz * -my + rz * mx; const dl = Math.hypot(dx, dz); if (dl > 0) { dx /= dl; dz /= dl; }
    c.crouch = !locked && I.act('crouch') && c.onGround && this.state === 'move';
    this.aiming = !locked && (I.act('aim') || (I.device === 'touch' && I.touch.held.has('fire')));
    let want = c.crouch ? 1.8 : 4.3; const sprint = !locked && I.act('sprint') && !c.crouch && !this.aiming && this.stamina > 2 && mag > .5;
    if (sprint) want = 6.6; if (this.aiming) want = 2.6; if (mag < .55 && I.device !== 'kb') want *= mag / .55 * .7 + .3;
    want *= suit.speed * (1 + Game.up('legs') * .05);
    if (World.water && c.y < World.water.h - .3) want *= .6;
    if (sprint && c.speed > 3) { this.stamina -= dt * 16; this.staminaT = .8; } else { this.staminaT = (this.staminaT || 0) - dt; if (this.staminaT <= 0) this.stamina = Math.min(100 + Game.up('legs') * 15, this.stamina + dt * 30); }
    // --- states ---
    if (this.state === 'roll') {
      c.anim.roll -= 0; this.rollT -= dt; const k = this.rollT / .5; const sp = 8.5 * Math.max(.3, k);
      this.vx = this.rollDir[0] * sp; this.vz = this.rollDir[1] * sp; if (this.rollT <= 0) this.state = 'move';
    } else if (this.state === 'mantle') {
      this.mantleT += dt / .42; const t = smooth(Math.min(1, this.mantleT)); c.anim.mantle = 1 - Math.abs(t - .5) * 2;
      c.x = lerp(this.mStart[0], this.mEnd[0], t); c.z = lerp(this.mStart[2], this.mEnd[2], t); c.y = lerp(this.mStart[1], this.mEnd[1], Math.min(1, t * 1.6));
      if (this.mantleT >= 1) { this.state = 'move'; c.anim.mantle = 0; c.onGround = true; this.vy = 0; } c.speed = 1; Anim.update(c, dt); return;
    } else if (this.state === 'climb') {
      const col = this.climbCol; c.climbing = true; c.onGround = false; const up = -my; c.climbSpeed = Math.abs(up) * 1.6; c.y += up * 1.8 * dt; this.vx = this.vz = 0; this.vy = 0;
      const gh = World.hf.at(c.x, c.z); if (c.y < gh) { c.y = gh; this.state = 'move'; c.climbing = false; }
      if (c.y > col.y1 - .9) { this.startMantle(c.x + Math.sin(c.yaw) * .7, col.y1, c.z + Math.cos(c.yaw) * .7); c.climbing = false; }
      if (I.tap('jump') || I.tap('dodge')) { this.state = 'move'; c.climbing = false; this.vy = 4; this.vx = -Math.sin(c.yaw) * 4; this.vz = -Math.cos(c.yaw) * 4; }
      c.speed = 0; Anim.update(c, dt); return;
    } else {
      // accelerate toward desired velocity (more grip on ground than in air)
      const acc = c.onGround ? (c.crouch ? 30 : 26) : 7; const tvx = dx * want * mag, tvz = dz * want * mag;
      const k = 1 - Math.exp(-acc * dt / Math.max(want, 1)); this.vx = lerp(this.vx, tvx, Math.min(1, k * 3)); this.vz = lerp(this.vz, tvz, Math.min(1, k * 3));
      // facing: toward movement, or aim direction when aiming/firing
      const face = (this.aiming || this.fireHold > 0 || this.lock) ? Math.atan2(this.aimDir[0], this.aimDir[2]) : (Math.hypot(this.vx, this.vz) > .4 ? Math.atan2(this.vx, this.vz) : c.yaw);
      const before = c.yaw; c.yaw = lerpAng(c.yaw, face, 1 - Math.exp(-dt * (this.aiming ? 20 : 11))); c.anim.turn = clamp(angDiff(before, c.yaw) / dt * .15, -1, 1);
      // roll
      if (!locked && I.tap('dodge') && c.onGround && this.stamina > 15) { this.state = 'roll'; this.rollT = .5; c.anim.roll = .5; c.anim.rollMax = .5; this.inv = Math.max(this.inv, .38); this.stamina -= 18; this.staminaT = .8;
        const d = dl > 0 && mag > .1 ? [dx, dz] : [Math.sin(c.yaw), Math.cos(c.yaw)]; this.rollDir = d; c.yaw = Math.atan2(d[0], d[1]); Audio2.sfx('roll'); FX.dust(c.x, c.y + .1, c.z, 8, World.region.dustCol); }
    }
    // --- jump / coyote / buffer ---
    if (c.onGround) { this.coyote = .12; this.airJumps = Game.has('boots') ? 1 : 0; } else this.coyote -= dt;
    if (!locked && I.tap('jump')) this.jumpBuf = .14; else this.jumpBuf -= dt;
    if (this.jumpBuf > 0 && this.state === 'move') {
      // mantle check: obstacle ahead whose top is reachable
      const ahead = this.ledgeAhead(); if (ahead) { this.startMantle(ahead[0], ahead[1], ahead[2]); this.jumpBuf = 0; }
      else if (this.coyote > 0) { this.vy = 6.4; c.onGround = false; this.coyote = 0; this.jumpBuf = 0; Audio2.sfx('jump'); this.noise = Math.max(this.noise, 6); }
      else if (this.airJumps > 0) { this.vy = 5.8; this.airJumps--; this.jumpBuf = 0; Audio2.sfx('jump'); FX.burst(c.x, c.y, c.z, 14, [.4, .9, 1], 2, .5, .4, true); }
    }
    // --- integrate ---
    this.vy -= 18 * dt; if (this.vy < -30) this.vy = -30;
    let nx = c.x + this.vx * dt, nz = c.z + this.vz * dt, ny = c.y + this.vy * dt;
    const res = World.collide(nx, nz, .34, ny, 1.75); nx = res[0]; nz = res[1];
    // deep water acts as a soft boundary
    if (World.water && World.hf.at(nx, nz) < World.water.h - 1.5 && !World.ground(nx, nz, ny + .3).col) { nx = c.x; nz = c.z; this.vx *= -.2; this.vz *= -.2; if (Math.random() < .05) Game.cue('Water too deep'); }
    // climbable surface?
    // steep terrain blocks walking (cliffs need mantling, climbing or a resolved path)
    { const gg = World.ground(nx, nz, Math.max(c.y, ny) + .05, .5, .3), gh = gg.h, hd = Math.hypot(nx - c.x, nz - c.z); if (!gg.col && c.onGround && hd > 1e-4 && gh - c.y > .12 && (gh - c.y) / hd > 1.3 && this.state === 'move') { nx = c.x; nz = c.z; } }
    if (res[2] && (typeof res[2].climb === 'function' ? res[2].climb() : res[2].climb) && mag > .3 && this.state === 'move') { const col = res[2]; this.state = 'climb'; this.climbCol = col; const cx = clamp(nx, col.x0, col.x1), cz = clamp(nz, col.z0, col.z1); c.yaw = Math.atan2(cx - nx, cz - nz); this.vy = 0; }
    const g = World.ground(nx, nz, Math.max(c.y, ny) + .05, c.onGround ? .5 : .3, .3);
    const wasGround = c.onGround;
    if (ny <= g.h + (wasGround && this.vy <= 0 ? .35 : 0) && this.vy <= 0) {
      if (!wasGround && this.vy < -4) { c.anim.land = Math.min(.25, -this.vy * .02); Audio2.sfx('land', null, Math.min(1, -this.vy / 12)); FX.dust(nx, g.h + .05, nz, 6, World.region.dustCol); this.noise = Math.max(this.noise, 8); if (this.vy < -17) this.hurt((-this.vy - 17) * 5, null, 'fall'); }
      ny = g.h; this.vy = 0; c.onGround = true;
      if (g.col && g.col.dynamic && g.col.dx !== undefined) { nx += g.col.dx; nz += g.col.dz; ny += g.col.dy || 0; }
    } else c.onGround = false;
    c.x = nx; c.y = ny; c.z = nz; c.vy = this.vy; c.speed = Math.hypot(this.vx, this.vz);
    // safe position tracking + void falls
    this.safeT -= dt; if (c.onGround && this.safeT <= 0 && !g.col?.dynamic) { this.safe = [c.x, c.y, c.z]; this.safeT = .5; }
    if (c.y < (World.region.killY ?? -25)) { this.hurt(15, null, 'fall'); this.inv = 0; this.place(this.safe[0], this.safe[2], c.yaw); Game.fade(.3); }
    // hazards
    for (const hz of World.triggers) if (hz.hazard && (!hz.on || hz.on()) && dist2(c.x, c.z, hz.x, hz.z) < hz.r * hz.r && c.y < (hz.y ?? -99) + (hz.h || 99)) { this.hazT = (this.hazT || 0) - dt; if (this.hazT <= 0) { this.hazT = .5; this.hurt(hz.dmg, null, hz.hazard); if (hz.msg) Game.cue(hz.msg); } }
    // --- combat input ---
    if (!locked) this.combat(dt, I);
    c.anim.aim = lerp(c.anim.aim, this.aiming || this.fireHold > 0 ? 1 : 0, 1 - Math.exp(-dt * 14)); this.fireHold = Math.max(0, (this.fireHold || 0) - dt);
    c.anim.accel = clamp((c.speed - (this.lastSpeed || 0)) / dt * .05, -1, 1); this.lastSpeed = c.speed;
    c.anim.scan = lerp(c.anim.scan, Scanner.active ? 1 : 0, dt * 8);
    if (c.look.accessory === 1) stepScarf(c, dt, Game.wind);
    c.coatSway = Math.sin(c.anim.phase) * .15 * sat(c.speed / 5) + c.speed * .05;
    Anim.update(c, dt);
    // pushers for vegetation
  },
  ledgeAhead() {
    const c = this.ch, f = [Math.sin(c.yaw), Math.cos(c.yaw)]; const px = c.x + f[0] * .6, pz = c.z + f[1] * .6;
    const top = World.ground(px, pz, c.y + 2.2, 2.2, .1); const rise = top.h - c.y;
    if (rise > .55 && rise < 2.1 && (top.col || World.hf.at(px, pz) === top.h)) { const above = World.solid(px, top.h + 1, pz) || World.solid(c.x, c.y + 2.2, c.z); if (!above) return [px + f[0] * .2, top.h, pz + f[1] * .2]; }
    return null;
  },
  startMantle(x, y, z) { this.state = 'mantle'; this.mantleT = 0; this.mStart = [this.ch.x, this.ch.y, this.ch.z]; this.mEnd = [x, y, z]; Audio2.sfx('jump'); this.vy = 0; },
  combat(dt, I) {
    const c = this.ch, W = this.weapon();
    Combat.computeAim(this);
    // switch weapons
    const owned = Game.S.weapons; let sw = null;
    if (I.hit('w1')) sw = 'pulse'; if (I.hit('w2')) sw = 'scatter'; if (I.hit('w3')) sw = 'lance';
    if (I.tap('weapon') || I.pressed.has('Pad15')) { const i = owned.indexOf(Game.S.weapon); sw = owned[(i + 1) % owned.length]; }
    if (I.mouse.wheel && Input.locked && !Cam.rig().zoomWheel) { const i = owned.indexOf(Game.S.weapon); sw = owned[(i + owned.length + Math.sign(I.mouse.wheel)) % owned.length]; }
    if (sw && owned.includes(sw) && sw !== Game.S.weapon) { Game.S.weapon = sw; Audio2.sfx('ui'); UI.toast(WEAPONS[sw].name); }
    if (I.tap('reload') && this.heat > 5 && this.overheat <= 0) { c.anim.reload = .6; Audio2.sfx('vent'); FX.steam(c.x, c.y + 1.2, c.z, 10); }
    // fire
    const firing = I.act('fire') && this.state !== 'roll' && this.state !== 'climb';
    if (firing) this.fireHold = .5;
    const cap = 100 + Game.up('cooling') * 25;
    if (firing && this.fireCd <= 0 && this.overheat <= 0 && c.anim.reload <= 0) {
      this.fireCd = W.rate; this.heat += W.heat; c.anim.fire = .12; Combat.fire(this, W); this.noise = Math.max(this.noise, 20);
      if (this.heat >= cap) { this.overheat = 1.6; Audio2.sfx('overheat'); FX.steam(c.x, c.y + 1.2, c.z, 18); UI.toast('OVERHEATED'); }
    }
    // resonance burst
    if (I.tap('burst') && this.burstCd <= 0 && Game.has('burst')) { this.burstCd = 6 - Game.up('burst') * 1; c.anim.burst = 1; setTimeout(() => c.anim.burst = 0, 350); Combat.burst(c.x, c.y + 1, c.z); }
    // melee
    if (I.tap('melee') && this.meleeCd <= 0) { this.meleeCd = .55; c.anim.melee = .35; Audio2.sfx('melee'); setTimeout(() => Combat.melee(this), 140); }
    // lock-on toggle
    if (I.tap('lock')) { if (this.lock) this.lock = null; else { this.lock = Combat.bestTarget(this, 1.2, 30); if (this.lock) Audio2.sfx('tele'); } }
    if (this.lock && (this.lock.dead || dist2(this.lock.x, this.lock.z, c.x, c.z) > 1600)) this.lock = null;
    if (I.tap('lamp')) { this.lamp = !this.lamp; Audio2.sfx('ui'); }
  },
  draw() {
    const c = this.ch; c.flash = this.hurtT > .3 ? .1 : 0;
    drawHumanoid(c, { weapon: this.weapon(), scanner: true, echo: Game.S && Game.S.chapter >= 3 });
  },
};

/* =====================================================================
   CAMERA — 8 rigs over one world, smooth transitions, collision,
   occlusion cut-out, shake, cinematic paths, contextual zones
   ===================================================================== */
const RIGS = [
  { id: 'iso', name: 'Isometric Diorama', ortho: 8.5, pitch: .6, dist: 60, fixed: true, step: Math.PI / 4, zoomWheel: true },
  { id: 'chase', name: 'Rear-Low Chase', fov: 58, dist: 4.6, height: 1.05, pitch: .06, orbit: true, follow: true, lookH: 1.25 },
  { id: 'side', name: 'Side-On Exploration', fov: 30, dist: 22, height: 1.6, pitch: .07, fixed: true, side: true, zoomWheel: true },
  { id: 'top', name: 'Top-Down Exploration', fov: 40, dist: 15, pitch: 1.25, fixed: true, zoomWheel: true },
  { id: 'wide', name: 'Cinematic Wide', fov: 26, dist: 34, pitch: .2, drift: true, zoomWheel: true },
  { id: 'close', name: 'Close Character View', fov: 36, dist: 2.7, height: 1.5, pitch: .05, front: true, lookH: 1.45 },
  { id: 'ots', name: 'Over-the-Shoulder', fov: 62, dist: 2.5, height: 1.65, pitch: .08, orbit: true, shoulder: .62, lookH: 1.55 },
  { id: 'elev', name: 'Elevated Environmental', fov: 46, dist: 19, pitch: .78, orbit: true, zoomWheel: true },
];
const Cam = {
  mode: 0, eye: [0, 10, 10], at: [0, 0, 0], yaw: Math.PI * .75, pitch: .3, zoom: 1, fov: 1, ortho: 0, trauma: 0, cine: null, lastLook: 0, override: null, trans: null, drift: 0,
  rig() { return RIGS[this.override != null ? this.override : this.mode]; },
  wantsLock() { const r = this.rig(); return !!r.orbit && Input.device === 'kb'; },
  moveYaw() { return this.yaw; },
  setMode(m, instant) { if (m === this.mode && this.override == null) return; this.beginTrans(); this.mode = m; this.override = null; const r = RIGS[m]; if (r.fixed && r.id === 'side') this.yaw = (World.region && World.region.sideYaw) ?? Math.PI / 2;
    if (r.follow) this.yaw = Player.ch ? Player.ch.yaw : this.yaw; if (instant) this.trans = null; if (!r.orbit) Input.unlock(); UI.toast('Camera: ' + r.name); },
  beginTrans() { this.trans = { eye: this.eye.slice(), at: this.at.slice(), P: R.lastP ? R.lastP.slice() : null, t: 0 }; },
  shake(a) { this.trauma = Math.min(1, this.trauma + a); },
  desired(dt) {
    const r = this.rig(), p = Player.ch, z = this.zoom * Settings.v.camDist; const tx = p.x, ty = p.y, tz = p.z;
    let at = [tx, ty + (r.lookH || 1), tz], eye;
    if (r.ortho) { const d = r.dist; eye = [tx - Math.sin(this.yaw) * Math.cos(r.pitch) * d, ty + 1 + Math.sin(r.pitch) * d, tz - Math.cos(this.yaw) * Math.cos(r.pitch) * d]; return { eye, at, ortho: r.ortho * z }; }
    let pitch = r.orbit ? this.pitch : r.pitch, dist = r.dist * (r.zoomWheel ? z : (r.orbit ? Math.sqrt(z) : 1)), yaw = this.yaw;
    if (r.front) yaw = p.yaw + Math.PI + .5;
    if (r.drift) { this.drift += dt * .05; yaw = this.yaw + Math.sin(this.drift) * .5; at[1] += 1.5; }
    if (r.shoulder) { const rx = -Math.cos(yaw), rz = Math.sin(yaw); at = [tx + rx * r.shoulder * .0 - Math.sin(yaw) * -0, ty + r.lookH, tz]; at[0] -= rx * r.shoulder; at[2] -= rz * r.shoulder; }
    // lock-on framing: bias target between player and locked enemy
    if (Player.lock && !Player.lock.dead && (r.orbit || r.follow)) { const L = Player.lock; at = [lerp(at[0], L.x, .35), lerp(at[1], (L.y || 0) + 1, .3), lerp(at[2], L.z, .35)]; }
    eye = [at[0] - Math.sin(yaw) * Math.cos(pitch) * dist, at[1] + Math.sin(pitch) * dist + (r.height ? r.height - (r.lookH || 1) : 0), at[2] - Math.cos(yaw) * Math.cos(pitch) * dist];
    // collision: pull the camera in front of blocking geometry (perspective rigs that orbit close)
    if (dist < 8) { const hit = World.ray(at, eye, .25); if (hit >= 0) { const L = Math.hypot(eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]); const k = Math.max(.15, (hit - .35) / L); eye = [lerp(at[0], eye[0], k), lerp(at[1], eye[1], k), lerp(at[2], eye[2], k)]; } }
    // long-range rigs lift over intervening terrain so the explorer stays visible
    if (dist >= 8) { let need = eye[1]; for (let i = 1; i <= 14; i++) { const t = i / 15; const x = lerp(at[0], eye[0], t), z = lerp(at[2], eye[2], t); const h = World.hf.at(x, z) + 1.2; const req = at[1] + (h - at[1]) / t; if (req > need) need = req; } this.lift = lerp(this.lift || 0, need - eye[1], .08); eye[1] += this.lift; }
    const gh = World.hf.at(eye[0], eye[2]) + .3; if (eye[1] < gh) eye[1] = gh;
    return { eye, at, fov: r.fov * Math.PI / 180 };
  },
  update(dt) {
    const r = this.rig(), I = Input, S = Settings.v; const p = Player.ch;
    if (this.cine) return this.updateCine(dt);
    // user camera control
    if (Game.state === 'play' && !Game.lockInput()) {
      if (r.orbit) { if (I.look[0] || I.look[1]) this.lastLook = Game.time; this.yaw -= I.look[0] * 1.2; this.pitch = clamp(this.pitch + I.look[1] * 1.0, -.35, r.id === 'elev' ? 1.25 : .9); }
      else if (r.id === 'iso' || r.id === 'top' || r.id === 'wide') { if (I.hit('rotl')) this.yaw += r.step || .3; if (I.hit('rotr')) this.yaw -= r.step || .3; if (I.device !== 'kb' && Math.abs(I.look[0]) > .02) this.yaw -= I.look[0] * .8; }
      if (I.mouse.wheel && (r.zoomWheel || !Input.locked)) this.zoom = clamp(this.zoom * (1 + I.mouse.wheel * .08), .55, 1.9);
      // auto-camera: drift behind the player when moving without manual input
      if (S.autoCam && (r.follow || r.orbit) && Game.time - this.lastLook > 1.6 && p.speed > 1 && !Player.aiming) this.yaw = lerpAng(this.yaw, p.yaw, dt * (r.follow ? 1.4 : .5));
      if (I.tap('camera')) this.setMode((this.mode + 1) % RIGS.length);
    }
    const d = this.desired(dt);
    const lag = r.ortho ? 7 : r.orbit ? 18 : 6; const k = 1 - Math.exp(-dt * lag);
    for (let i = 0; i < 3; i++) { this.eye[i] = lerp(this.eye[i], d.eye[i], r.orbit ? 1 : k); this.at[i] = lerp(this.at[i], d.at[i], r.orbit ? Math.min(1, k * 2) : k); }
    if (r.orbit) { this.eye = d.eye.slice(); this.at = d.at.slice(); }
    this.fov = d.fov || .8; this.ortho = d.ortho || 0;
    if (this.trans) { this.trans.t += dt / .9; const t = smooth(Math.min(1, this.trans.t)); for (let i = 0; i < 3; i++) { this.eye[i] = lerp(this.trans.eye[i], this.eye[i], t); this.at[i] = lerp(this.trans.at[i], this.at[i], t); } if (this.trans.t >= 1) this.trans = null; }
  },
  updateCine(dt) {
    const C = this.cine; C.t += dt; const keys = C.keys; let i = 0; while (i < keys.length - 2 && C.t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; const t = b.t > a.t ? smooth(clamp((C.t - a.t) / (b.t - a.t), 0, 1)) : 1;
    const ev = typeof a.eye === 'function' ? a.eye() : a.eye, bv = typeof b.eye === 'function' ? b.eye() : b.eye, aa = typeof a.at === 'function' ? a.at() : a.at, ba = typeof b.at === 'function' ? b.at() : b.at;
    for (let j = 0; j < 3; j++) { this.eye[j] = lerp(ev[j], bv[j], t); this.at[j] = lerp(aa[j], ba[j], t); }
    this.fov = lerp(a.fov || .7, b.fov || .7, t); this.ortho = 0; C.focus = Math.hypot(this.eye[0] - this.at[0], this.eye[1] - this.at[1], this.eye[2] - this.at[2]);
    if (C.t >= keys[keys.length - 1].t && !C.hold) { const done = C.done; this.cine = null; this.beginTrans(); if (done) done(); }
  },
  play(keys, done, o = {}) { this.cine = Object.assign({ keys, t: 0, done }, o); },
  frame() {
    // shake offsets
    const s = Settings.v.shake * (Settings.v.reducedMotion ? .3 : 1), tr = this.trauma * this.trauma * s; this.trauma = Math.max(0, this.trauma - Game.dt * 1.6);
    const t = Game.time * 30; const off = [(vnoise(t, 1) - .5) * tr * .6, (vnoise(t, 7) - .5) * tr * .6, (vnoise(t, 13) - .5) * tr * .6];
    const eye = [this.eye[0] + off[0], this.eye[1] + off[1], this.eye[2] + off[2]], at = [this.at[0] + off[0] * .5, this.at[1] + off[1] * .5, this.at[2] + off[2] * .5];
    return { eye, at, fov: this.fov, ortho: this.ortho, near: this.ortho ? Math.hypot(eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]) - 40 : undefined, blendP: this.trans && this.trans.P, blendT: this.trans ? smooth(Math.min(1, this.trans.t)) : 1 };
  },
  forward() { const dx = this.at[0] - this.eye[0], dy = this.at[1] - this.eye[1], dz = this.at[2] - this.eye[2], l = Math.hypot(dx, dy, dz) || 1; return [dx / l, dy / l, dz / l]; },
};
