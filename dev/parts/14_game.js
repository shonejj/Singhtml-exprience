
/* =====================================================================
   GAME — state, region streaming, environment & weather, frame build,
   events/quests, saving, dialogue, cinematics, chapters, endings
   ===================================================================== */
const Game = {
  state: 'boot', S: null, time: 0, dt: 1 / 60, slowmo: 0, hitstop: 0, wind: [1, 0, .4, 0], tod: .3, fadeV: 1, inCine: false, cpDefs: [], dynLights: [], ripples: [], sig: 0, pulse: null, slot: 'auto', tunnelGust: false,
  W: { cur: null, tgt: null, t: 0 }, rain: [],
  newState(look) {
    return { version: SAVE_VERSION, look: JSON.parse(JSON.stringify(look)), chapter: 0, region: 0, maxRegion: 0, suit: 'field', suits: ['field'], weapon: 'pulse', weapons: ['pulse'], items: [], salvage: 0, cores: 0, ups: {}, flags: {},
      quests: {}, journal: [], freqs: [], rev: [0, 0, 0, 0, 0, 0, 0, 0], cps: [], lastCp: null, pos: null, rel: { mara: 0, elias: 0, nova: 0, orin: 0 }, crew: [], disc: {}, kills: 0, playTime: 0, endings: [], cos: {}, hp: 100, tod: null, seenBoss: {} };
  },
  has(i) { return this.S && this.S.items.includes(i); }, up(u) { return (this.S && this.S.ups[u]) || 0; },
  giveItem(i) { if (!this.S.items.includes(i)) this.S.items.push(i); Audio2.sfx('pickup'); UI.toast('Acquired: ' + ITEMS[i].name); this.event('item_' + i); if (Settings.v.tutorial) { const tips = { scanner: `Hold [${Input.glyph('scan')}] to pulse the scanner.`, burst: `Press [${Input.glyph('burst')}] for a resonance burst.`, grip: 'Walk into dense vines to climb them.', boots: `Press [${Input.glyph('jump')}] again in mid-air to double jump.` }; if (tips[i]) setTimeout(() => this.say('sys', tips[i]), 1200); } },
  takeItem(i) { this.S.items = this.S.items.filter(x => x !== i); },
  giveWeapon(w) { if (!this.S.weapons.includes(w)) this.S.weapons.push(w); this.S.weapon = w; Audio2.sfx('pickup'); UI.toast('Weapon: ' + WEAPONS[w].name + ` — press [${this.S.weapons.length}] or cycle`); },
  giveSuit(s) { if (!this.S.suits.includes(s)) this.S.suits.push(s); UI.toast('Suit unlocked: ' + SUITS[s].name); },
  unlockCos(k, v) { this.S.cos[k + v] = 1; const g = Save.global(); g.cos = g.cos || {}; g.cos[k + v] = 1; Save.setGlobal(g); },
  cosUnlocked(k, v) { const need = (UNLOCKABLE[k] || {})[v]; if (!need) return true; const g = Save.global(); return (this.S && this.S.cos[k + v]) || (g.cos && g.cos[k + v]) || (this.S && this.S.chapter >= +need.slice(2) - 1) || (g.maxCh || 0) >= +need.slice(2) - 1; },
  rel(id, d) { this.S.rel[id] = (this.S.rel[id] || 0) + d; },
  addSalvage(n, x, y, z) { this.S.salvage += n; for (let i = 0; i < Math.min(n, 10); i++) FX.spawn(x, y, z, (Math.random() - .5) * 3, 2 + Math.random() * 2, (Math.random() - .5) * 3, .8, .5, [1, .8, .3], true, 1); Audio2.sfx('pickup'); },
  lockInput() { return this.state !== 'play' || this.inCine; },
  setState(s) { this.state = s; if (s !== 'play') Input.unlock(); },
  hearMul() { const W = this.W.cur || {}; return 1 - (W.rain || 0) * .35 - (W.wind || 0) * .15; },
  sightMul() { const W = this.W.cur || {}; return (1 - (W.fog || 0) * .45 - (W.dust || 0) * .3) * (1 - this.darkness() * .35); },
  darkness() { return this.env ? this.env.night : 0; },
  dirName(x, z) { const p = Player.ch; const a = Math.atan2(x - p.x, z - p.z) - Cam.yaw; const d = ((a % TAU) + TAU) % TAU; return ['ahead', 'ahead-left', 'left', 'behind-left', 'behind', 'behind-right', 'right', 'ahead-right'][Math.round(d / (TAU / 8)) % 8]; },
  cue(t) { if (this._lastCue === t && this.time - this._cueT < 3) return; this._lastCue = t; this._cueT = this.time; this.say('sys', t, { short: true }); },
  scanLine(t) { $('scantxt').textContent = t; this.scanLineT = 4; },
  flashLight(x, y, z, col, r, ttl) { this.dynLights.push({ x, y, z, col, r, int: 1.2, ttl }); },
  ripple(x, z, s) { this.ripples.push([x, z, this.time, s]); if (this.ripples.length > 8) this.ripples.shift(); },
  dmgNumber(x, y, z, n, crit) { UI.dmgNums.push({ x, y, z, n, crit, t: 0 }); },
  /* ---------------- events & quests ---------------- */
  event(name) {
    if (!this.S) return; const S = this.S;
    for (const q of QUESTS) { const st = S.quests[q.id];
      if (st === undefined && q.start === name && q.ch <= S.chapter) { S.quests[q.id] = 0; UI.toast('New side objective: ' + q.title); Audio2.sfx('ui_ok'); continue; }
      if (st === undefined || st >= q.steps.length) continue; const step = q.steps[st]; if (step.on === name && (!step.check || step.check())) { this.advance(q); continue; }
      // robustness: if the player completes a later step first, skip ahead to it
      for (let k = st + 1; k < q.steps.length; k++) { const s2 = q.steps[k]; if (s2.on === name && (!s2.check || s2.check())) { S.quests[q.id] = k; this.advance(q); break; } } }
  },
  pollQuests() { const S = this.S; for (const q of QUESTS) { const st = S.quests[q.id]; if (st === undefined || st >= q.steps.length) continue; const step = q.steps[st]; if (step.check && step.check()) this.advance(q); } },
  advance(q) { const S = this.S; S.quests[q.id]++; Audio2.sfx('ui_ok'); if (S.quests[q.id] >= q.steps.length) { UI.toast((q.main ? 'Chapter objective complete: ' : 'Side objective complete: ') + q.title); if (!q.main) { this.addSalvage(15, Player.x, Player.y + 1, Player.z); } } },
  mainQuest() { return QUESTS.find(q => q.main && q.ch === this.S.chapter); },
  objective() { const S = this.S; if (!S) return null; const q = this.mainQuest(); if (!q) return null; const st = S.quests[q.id] ?? 0; if (st >= q.steps.length) return { q, text: 'Chapter complete', step: null }; const step = q.steps[st]; return { q, text: typeof step.t === 'function' ? step.t() : step.t, step: S.region === q.ch ? step : null }; },
  readLog(id) { const S = this.S; const L = LOGS[id]; if (!S.journal.includes(id)) { S.journal.push(id); UI.toast('Record added: ' + L.title); } Audio2.sfx('log'); if (L.kind === 'audio') { this.say(L.speaker || 'radio', L.text.split('\n')[0], { radio: true, long: true }); } else UI.showRecord(L); this.event('log'); },
  /* ---------------- crew ---------------- */
  joinCrew(id) { if (!this.S.crew.includes(id)) this.S.crew.push(id); this.spawnCrew(); },
  spawnCrew() { const S = this.S; const ids = S.crew.filter(id => !(id === 'orin' && flag('betrayal'))); const follow = ids.slice(-2); Companions.set(follow); for (const c of Companions.list) { c.x = Player.x - 2; c.z = Player.z + 2; c.y = World.ground(c.x, c.z, 999).h; } },
  betrayal() { setFlag('betrayal'); this.S.crew = this.S.crew.filter(c => c !== 'orin'); const o = Companions.get('orin'); if (o) { FX.burst(o.x, o.y + 1, o.z, 60, [1, .3, .4], 4, 1.5, .7, true, -.2); Audio2.sfx('echo_die', [o.x, o.y + 1, o.z]); } this.spawnCrew(); this.sig = 1.5;
    const b = Boss.b; if (b) { b.hp = 0; Boss.defeat(); } setFlag('boss_firstvoice'); this.event('boss_firstvoice'); },
  /* ---------------- checkpoints ---------------- */
  activateCp(id) { const S = this.S; const first = !S.cps.includes(id); if (first) S.cps.push(id); S.lastCp = id; const d = this.cpDefs.find(c => c.id === id); if (d) { d.L.base = 1; d.L.int = 1; }
    if (first) { Audio2.sfx('checkpoint'); UI.toast('◆ Checkpoint: ' + (d ? d.name : id), 'cp'); FX.burst(d.x, World.hf.at(d.x, d.z) + 3, d.z, 30, [1, .7, .3], 3, 1, .6, true); }
    Player.hp = Player.maxHp(); this.save('auto', true); },
  /* ---------------- saving ---------------- */
  snapshot() { const S = this.S; S.pos = [Player.x, Player.y, Player.z, Player.ch.yaw]; S.hp = Player.hp; S.tod = this.tod; S.rev[S.region] = S.rev[S.region] || 0; return S; },
  save(slot, quiet) { if (!this.S) return; const r = Save.write(slot, this.snapshot()); if (!r.ok) UI.toast(r.err); else if (!quiet) UI.toast('Game saved' + (slot === 'auto' ? ' (autosave)' : ' to slot ' + slot)); else UI.toast('Autosaved', 'cp'); const g = Save.global(); g.maxCh = Math.max(g.maxCh || 0, this.S.chapter); Save.setGlobal(g); },
  /* ---------------- region streaming ---------------- */
  async loadRegion(i, at, o = {}) {
    this.setState('loading'); UI.show('loading'); const R0 = REGIONS[i]; $('loadt').textContent = 'ESTABLISHING SIGNAL · ' + R0.name.toUpperCase(); $('loadtip').textContent = UI.tip(); const bar = $('loadbar'); bar.style.width = '0%';
    const step = async (p) => { bar.style.width = (p * 100) + '%'; await new Promise(r => setTimeout(r, 16)); };
    Enemies.clear(); Combat.shots = []; Boss.active = false; Boss.b = null; Beams.sets = []; Seq.sets = []; this.cpDefs = []; FX.n = 0; Companions.stationed = [];
    World.reset(); World.region = R0; if (this.S) this.S.region = i; await step(.05);
    const rng = RNG(R0.seed); World.buildTerrain(R0, rng); await step(.35);
    World.water = R0.water ? { h: R0.water.h, col: R0.water.col } : null; if (R0.water && this.S && this.S.flags.drain4 && R0.id === 'sunken') World.water.h = -2.6;
    Player.init(this.S ? this.S.look : DEFAULT_LOOK); const sp = at || R0.spawn; Player.place(sp[0], sp[1], sp[2] ?? Math.PI);
    R0.build(RNG(R0.seed + 1)); await step(.7);
    World.scatterGrass(R0, RNG(R0.seed + 2), R0.grassDensity || 1); World.scatterPebbles(R0, RNG(R0.seed + 3)); await step(.85);
    World.upload(); await step(.95);
    UI.buildRegionMap(); this.wInit(R0);
    if (this.S) { const rev = this.S.rev[i] || 0; for (const t of World.scanTargets) if (t.kind === 'hidden') t.revealed = !!((rev >> t.group) & 1); this.S.maxRegion = Math.max(this.S.maxRegion, i); this.tod = this.S.tod != null && o.keepTod ? this.S.tod : R0.t0; this.spawnCrew(); }
    else this.tod = R0.t0;
    Audio2.setRegionMusic(R0.music); Audio2.setMode('explore'); if (Audio2.ok) Audio2.setVerb(R0.verb[0], R0.verb[1]);
    Cam.yaw = Player.ch.yaw; Cam.pitch = .3; Cam.trans = null; Cam.cine = null; const d = Cam.desired(0); Cam.eye = d.eye; Cam.at = d.at;
    await step(1); UI.hide('loading');
  },
  wInit(R0) { const pick = () => { const L = R0.weather; let s = L.reduce((a, w) => a + w.w, 0) * Math.random(); for (const w of L) { s -= w.w; if (s <= 0) return w; } return L[0]; }; this.W.pick = pick; this.W.tgt = pick(); this.W.cur = Object.assign({}, this.W.tgt); this.W.t = 60 + Math.random() * 60; this.wetV = this.W.cur.rain > .3 ? .8 : 0; this.windA = Math.random() * TAU; },
  /* ---------------- per-step simulation ---------------- */
  update(dt) {
    const S = this.S; this.time += dt; if (S && this.state === 'play') S.playTime += dt;
    // weather drifts toward a target state; wind is one shared field
    const W = this.W; if (!W.cur || !World.hf) return; W.t -= dt; if (W.t <= 0) { W.tgt = W.pick(); W.t = 70 + Math.random() * 80; }
    for (const k in W.tgt) if (typeof W.tgt[k] === 'number') W.cur[k] = lerp(W.cur[k] ?? 0, W.tgt[k], dt / 20);
    this.windA += dt * .02 * Math.sin(this.time * .05); const gust = Math.max(0, vnoise(this.time * .35, 3) * 1.6 - .6) * W.cur.wind;
    this.wind[0] = Math.cos(this.windA); this.wind[1] = Math.sin(this.windA); this.wind[2] = W.cur.wind * (.7 + .3 * vnoise(this.time * .1, 9)) + gust * .8; this.wind[3] = gust;
    if (World.region && World.region.dayLen) this.tod = (this.tod + dt / World.region.dayLen) % 1;
    this.wetV = lerp(this.wetV || 0, W.cur.rain > .2 ? 1 : 0, dt / (W.cur.rain > .2 ? 25 : 60));
    // lightning
    if (W.cur.storm > .2 && Math.random() < dt * W.cur.storm * .08) { this.lightning = 1; setTimeout(() => Audio2.sfx('thunder', null, .5 + Math.random() * .5), 600 + Math.random() * 2000); if (Settings.v.audioCues) this.cue('Lightning'); }
    this.lightning = Math.max(0, (this.lightning || 0) - dt * 4);
    const live = this.state === 'play' || this.state === 'cine' || this.state === 'ending';
    if (this.S && (live || this.state === 'dialogue')) { for (const m of World.machines) if (m.update) m.update(dt); Player.update(dt); Companions.update(dt); }
    if (this.S && live) {
      Enemies.update(dt); Boss.update(dt); Combat.update(dt); Props.step(dt); Scanner.update(dt); Beams.update(dt);
      // player pushes props
      const p = Player.ch; for (const pr of World.props) { const dx = pr.x - p.x, dz = pr.z - p.z, d = Math.hypot(dx, dz); if (d < pr.r + .4 && Math.abs(pr.y - p.y - .5) < 1) { Props.impulse(pr, dx / (d || 1) * 4 * Math.min(pr.m, 3) * dt * 10, 0, dz / (d || 1) * 4 * Math.min(pr.m, 3) * dt * 10); } }
      // triggers
      for (const t of World.triggers) { if (t.done || t.hazard) continue; t.cd = (t.cd || 0) - dt; if (t.cond && !t.cond()) continue; if (dist2(p.x, p.z, t.x, t.z) < t.r * t.r) { if (t.once) t.done = true; t.fn(t); } }
      // noise → enemy hearing; scanner HUD line timer
      if (Player.noise > 6 && Math.random() < dt * 4) Enemies.hear(p.x, p.z, Player.noise);
      this.scanLineT = (this.scanLineT || 0) - dt; if (this.scanLineT <= 0) $('scantxt').textContent = '';
      // music intensity
      if (!Boss.active && this.state === 'play') Audio2.setMode(Enemies.threat ? 'combat' : 'explore');
      // discovery of points of interest
      if (S && this.time - (this.playAt || 0) > 5) { const disc = S.disc[S.region] || (S.disc[S.region] = []); for (const poi of World.region.pois) if (!disc.includes(poi.n) && dist2(p.x, p.z, poi.x, poi.z) < 400) { disc.push(poi.n); UI.toast('Discovered: ' + poi.n); } }
      if (S && Math.floor(this.time) !== Math.floor(this.time - dt)) this.pollQuests();
    }
    for (let i = this.dynLights.length - 1; i >= 0; i--) { this.dynLights[i].ttl -= dt; if (this.dynLights[i].ttl <= 0) this.dynLights.splice(i, 1); }
    if (!this.S && World.machines) for (const m of World.machines) if (m.update && this.state === 'title') try { m.update(dt); } catch (e) { }
    if (this.pulse) { this.pulse.t += dt; if (this.pulse.t > .6) this.pulse = null; }
    this.sig = Math.max(0, this.sig - dt * .5);
    this.updateWeatherFX(dt);
  },
  updateWeatherFX(dt) {
    const W = this.W.cur, c = Cam.at, q = [.4, .7, 1, 1.4][R.Q.particles]; if (!W) return;
    const em = (n, f) => { const k = n * q * dt; for (let i = 0; i < Math.floor(k) + (Math.random() < k % 1 ? 1 : 0); i++) f(); };
    em(W.ash * 30, () => FX.spawn(c[0] + (Math.random() - .5) * 40, c[1] + 8 + Math.random() * 6, c[2] + (Math.random() - .5) * 40, 0, -.6, 0, 9, .3, [.75, .72, .76], false, .02, 1));
    em(W.dust * 70, () => FX.spawn(c[0] + (Math.random() - .5) * 36 - this.wind[0] * 10, c[1] + Math.random() * 5, c[2] + (Math.random() - .5) * 36 - this.wind[1] * 10, 0, 0, 0, 3, .4, World.region.dustCol, false, 0, 1.6));
    em(W.spores * 14, () => FX.spawn(c[0] + (Math.random() - .5) * 30, c[1] + Math.random() * 6, c[2] + (Math.random() - .5) * 30, 0, .15, 0, 6, .5, Math.random() < .5 ? [.5, 1, .8] : [1, .6, .9], true, -.01, .3));
    em(W.motes * 10, () => FX.spawn(c[0] + (Math.random() - .5) * 30, c[1] + Math.random() * 5, c[2] + (Math.random() - .5) * 30, (Math.random() - .5) * .3, .1, (Math.random() - .5) * .3, 5, .3, [1, .9, .6], true, 0, .2));
    // persistent rain drops rendered as streak lines
    const want = Math.floor(W.rain * [150, 350, 650, 900][R.Q.particles]); const r = this.rain;
    while (r.length < want) r.push([c[0] + (Math.random() - .5) * 40, c[1] + Math.random() * 18, c[2] + (Math.random() - .5) * 40]); if (r.length > want) r.length = want;
    for (const d of r) { d[0] += this.wind[0] * this.wind[2] * 3 * dt; d[2] += this.wind[1] * this.wind[2] * 3 * dt; d[1] -= 22 * dt; const gh = World.hf ? World.hf.at(d[0], d[2]) : 0, wh = World.water ? World.water.h : -999;
      if (d[1] < Math.max(gh, wh)) { if (Math.random() < .15) { if (wh > gh) this.ripple(d[0], d[2], .3); else FX.spawn(d[0], gh + .02, d[2], (Math.random() - .5), 1, (Math.random() - .5), .2, .35, [.7, .8, .9], false, 1); } d[0] = c[0] + (Math.random() - .5) * 40; d[2] = c[2] + (Math.random() - .5) * 40; d[1] = c[1] + 12 + Math.random() * 6; } }
  },
  /* ---------------- environment lighting ---------------- */
  computeEnv() {
    const R0 = World.region, P = R0.pal, W = this.W.cur || {}; const t = this.tod; const a = (t - .25) * TAU; const el = Math.sin(a);
    const az = P.sunAz || 0; let sd = [Math.cos(a) * Math.cos(az), Math.max(.05, el), Math.cos(a) * Math.sin(az)]; const day = smooth(clamp((el + .08) / .35, 0, 1)), night = 1 - day;
    if (el < .05) sd = [-Math.cos(a) * Math.cos(az) * .5, .55, -Math.cos(a) * Math.sin(az) * .5];
    const l = Math.hypot(...sd); sd = sd.map(v => v / l);
    const dusk = smooth(clamp(1 - Math.abs(el) / .3, 0, 1)) * day;
    const H = k => hex(P[k]); const overcast = (W.cloud || 0) * .5 + (W.fog || 0) * .3 + (W.dust || 0) * .4;
    let sunCol = mixc(mixc(H('moon'), H('sun'), day), H('dusk'), dusk * .7); sunCol = scalec(sunCol, lerp(.55, 1.05, day) * (1 - overcast * .5));
    const skyTop = mixc(H('nightTop'), H('dayTop'), day), skyHor = mixc(mixc(H('nightHor'), H('dayHor'), day), H('dusk'), dusk * .4);
    let fogCol = mixc(mixc(H('nightFog'), H('dayFog'), day), H('dusk'), dusk * .3); if (W.dust) fogCol = mixc(fogCol, scalec(R0.dustCol, .9), W.dust * .5);
    const amb = scalec(H('amb'), .72 + day * .33), gnd = scalec(H('gnd'), .6 + day * .4);
    const sky = mixc(amb, skyTop, .25);
    const fogD = (.008 + (W.fog || 0) * .035 + (W.dust || 0) * .03 + (W.rain || 0) * .008) * [.7, .85, 1][R.Q.fog || 2] * (R.Q.drawDist === 0 ? 1.4 : 1);
    this.env = { sunDir: sd, sunCol, skyTop, skyHor, fogCol, sky, gnd, night, fog: [fogD, (World.water ? World.water.h : 0) + 1, .12, .93], dusk };
    return this.env;
  },
  /* ---------------- frame assembly → renderer ---------------- */
  render() {
    if (!World.hf || !Player.ch || this.state === 'loading') return; const E = this.computeEnv(), R0 = World.region, W = this.W.cur;
    mpi = 0; R.beginInst();
    if (this.S && Player.ch && Player.ch.alpha !== 0 && this.state !== 'creator') Player.draw();
    Companions.draw(); Enemies.draw(); Boss.draw(); Props.draw(); Combat.draw(); Beams.draw(); Seq.draw(this.dt);
    for (const m of World.machines) if (m.draw) m.draw();
    if (this.extraDraw) this.extraDraw();
    if (this.state === 'creator' && UI.previewChar) drawHumanoid(UI.previewChar, { weapon: UI.prevAnim === 'combat' ? WEAPONS.pulse : null });
    // lights: static + dynamic + headlamp, nearest 8 to the camera focus
    const L = []; const c = Cam.at; const t = this.time;
    for (const s of World.lights) { if (s.cond && !s.cond()) continue; let k = s.int; if (s.flicker) k *= 1 - s.flicker * (vnoise(t * 9 + s.x, s.z) > .7 ? 1 : 0); if (s.blink) k *= (Math.sin(t * TAU / s.blink) > .6 ? 1 : .15); if (k <= .01) continue; const d = dist2(s.x, s.z, c[0], c[2]); if (d > 3600) continue; L.push([d, s.x, s.y, s.z, s.r, s.col, k]); }
    for (const s of this.dynLights) L.push([0, s.x, s.y, s.z, s.r, s.col, s.int]);
    if (this.S && Player.ch) { const p = Player.ch, dark = Math.max(E.night, R0.id === 'forest' || R0.id === 'core' ? .8 : 0); if (dark > .2) L.push([0, p.x, p.y + 2.2, p.z, 5, [.75, .85, 1], .45 * dark]); }
    if (Player.lamp && this.S) { const p = Player.ch; L.push([0, p.x + Math.sin(p.yaw) * 2.5, p.y + 1.6, p.z + Math.cos(p.yaw) * 2.5, 11, [1, .95, .85], 1.3]); }
    if (Scanner.pulse) { const P = Scanner.pulse; L.push([0, P.x, P.y, P.z, P.r * .6, [.3, .9, 1], P.s * .8]); }
    L.sort((a, b) => a[0] - b[0]); const n = Math.min(8, L.length); const lights = this._lights || (this._lights = new Float32Array(64)); lights.fill(0);
    for (let i = 0; i < n; i++) { const l = L[i]; lights.set([l[1], l[2], l[3], l[4], l[5][0], l[5][1], l[5][2], l[6]], i * 8); }
    // pushers (vegetation reacts to bodies + burst wave)
    const push = this._push || (this._push = new Float32Array(16)); push.fill(0); const p = Player.ch; push.set([p.x, p.y, p.z, 1.3]);
    Companions.list.slice(0, 1).forEach(ch => push.set([ch.x, ch.y, ch.z, 1.1], 4)); const big = Enemies.list.find(e => e.heavy && !e.dead && dist2(e.x, e.z, p.x, p.z) < 400) || (Boss.b && !Boss.b.dead ? Boss.b : null); if (big) push.set([big.x, big.y, big.z, big.radius * 2.2], 8);
    if (this.pulse) push.set([this.pulse.x, p.y, this.pulse.z, 2 + this.pulse.t * 14], 12);
    const rip = this._rip || (this._rip = new Float32Array(32)); rip.fill(0); this.ripples.forEach((r, i) => rip.set([r[0], r[1], r[2], r[3]], i * 4));
    const pn = FX.update(this.state === 'pause' ? 0 : this.dt, this.wind);
    // rain line buffer
    let ln = 0; const lb = FX.lines, lu = FX.linesU; for (const d of this.rain) { if (ln >= 3990) break; for (let k = 0; k < 2; k++) { const o = ln * 5; lb[o] = d[0] - (k ? this.wind[0] * .08 : 0); lb[o + 1] = d[1] + (k ? .45 : 0); lb[o + 2] = d[2] - (k ? this.wind[1] * .08 : 0); const cb = (o + 3) * 4; lu[cb] = 170; lu[cb + 1] = 190; lu[cb + 2] = 215; lu[cb + 3] = 140; lb[o + 4] = 1; ln++; } }
    // occlusion cut-out around the player
    let cut = [0, 0, 0, 0]; const ps = R.vp ? M4.xform(R.vp, p.x, p.y + 1, p.z) : null; if (ps && this.S && !Cam.cine && Cam.rig().id !== 'close') cut = [ps[0] * .5 + .5, ps[1] * .5 + .5, Cam.rig().ortho ? .16 : .14, Math.hypot(Cam.eye[0] - p.x, Cam.eye[1] - p.y - 1, Cam.eye[2] - p.z)];
    const scan = Scanner.pulse ? [Scanner.pulse.x, Scanner.pulse.y, Scanner.pulse.z, Scanner.pulse.r] : [0, -999, 0, 0];
    const ED = this.endingTint; const cine = Cam.cine; const dlgCam = this.state === 'dialogue';
    const chapterGrade = { ashen: [[.02, 0, .03], [1.04, .98, .95]], settlement: [[0, .01, .01], [1, 1.02, .98]], forest: [[0, .02, .04], [.92, 1.04, 1.08]], sunken: [[0, .01, .02], [.95, 1, 1.05]], iron: [[.03, .01, 0], [1.08, .98, .9]], canyon: [[.02, .01, 0], [1.06, 1, .94]], capital: [[.02, 0, .03], [1.04, .98, 1.04]], core: [[.03, 0, .04], [1.05, .95, 1.08]] }[R0.id];
    const F = {
      time: this.time, cam: Cam.frame(), sunDir: E.sunDir, sunCol: E.sunCol, sky: E.sky, gnd: E.gnd, fogCol: E.fogCol, fog: E.fog, skyTop: E.skyTop, skyHor: E.skyHor, night: E.night,
      aurora: (R0.aurora || 0) * (.4 + E.night * .6) + (ED && ED.aur ? 1 : 0), cloud: W ? W.cloud : .3, planet: R0.noPlanet ? 0 : 1, planetDir: R0.pal.planetDir, planetCol: hex(R0.pal.planet),
      wind: this.wind, push, revealed: this.S ? (this.S.rev[this.S.region] || 0) : 0, lights, nLights: n, scan, scanS: Scanner.pulse ? Scanner.pulse.s : 0, cut, wet: this.wetV,
      water: World.water, rain: W ? W.rain : 0, ripples: rip, partData: FX.out, partN: pn, lineData: FX.lines, lineN: ln, flash: scalec([.7, .75, 1], this.lightning * 1.6), echo: this.S && this.S.chapter >= 3 ? .7 : 0, bands: 5, desat: ED ? ED.desat || 0 : 0,
      post: { bloom: R.Q.post >= 2 ? 1 : .6, rays: 1, dof: cine ? 1 : dlgCam ? .6 : 0, focus: cine ? cine.focus || 10 : 4, focusR: cine ? 12 : 5, chroma: Scanner.pulse ? 1.5 : Boss.active ? .6 : R0.id === 'core' ? .8 : 0,
        sig: Math.min(1, this.sig + (R0.id === 'core' ? .12 : 0) + (Scanner.active ? .05 : 0)), hurt: Player.hurtT ? Player.hurtT * 1.2 + (this.S && Player.hp < 30 ? .25 + Math.sin(this.time * 4) * .1 : 0) : (this.S && Player.hp < 30 && this.state === 'play' ? .25 + Math.sin(this.time * 4) * .1 : 0), fade: this.fadeV, fadeCol: this.fadeCol || [0, 0, 0],
        vig: .9, contrast: 1.06, satu: (ED && ED.desat ? 1 - ED.desat : 1.08), expo: 1, lift: ED ? ED.lift : chapterGrade[0], gain: ED ? ED.gain : chapterGrade[1] },
    };
    if (W && W.dust) F.post.contrast = .95;
    F.fogOff = Math.max(0, Math.hypot(Cam.eye[0] - Cam.at[0], Cam.eye[1] - Cam.at[1], Cam.eye[2] - Cam.at[2]) - 9);
    R.render(F);
    // audio listener + ambience
    const f = Cam.forward(); Audio2.setListener(Cam.eye, f);
    Audio2.ambience({ wind: this.wind[2], gust: this.wind[3], rain: W ? W.rain : 0, static: Scanner.active ? .5 + this.sig : this.sig * .5 + (R0.id === 'core' ? .2 : 0), water: World.water ? .6 : 0, hum: (R0.id === 'iron' || R0.id === 'sunken' && flag('power4')) ? 1 : R0.id === 'core' ? .7 : 0, events: this.state === 'play' ? 1 : 0, eventPool: R0.id === 'iron' ? ['clank', 'creak'] : R0.id === 'forest' ? ['creature', 'chime'] : R0.id === 'sunken' ? ['drip', 'creak'] : R0.id === 'core' ? ['chime', 'creature'] : ['creature', 'creak'], pos: Cam.at, indoor: false });
    Audio2.updateMusic();
  },
  /* ---------------- dialogue ---------------- */
  dialogue(id, done) {
    const D = DLG[id]; if (!D) return; this.dlg = { D, i: 0, done, id }; this.prevState = this.state === 'dialogue' ? 'play' : this.state; this.setState('dialogue'); Input.unlock();
    $('dlg').style.display = 'block'; this.dlgStep();
  },
  dlgStep() {
    const d = this.dlg; if (!d) return; const D = d.D;
    while (d.i < D.length) {
      const n = D[d.i];
      if (n.l) { d.i++; continue; } if (n.end) { d.i = D.length; break; }
      if (n.go && !n.s && !n.c) { const j = D.findIndex(x => x.l === n.go); d.i = j >= 0 ? j : D.length; continue; }
      if (n.cond) { if (n.cond()) { const j = D.findIndex(x => x.l === n.go); d.i = j >= 0 ? j : d.i + 1; } else d.i++; continue; }
      if (n.fx) { n.fx(); d.i++; if (!this.dlg) return; continue; }
      if (n.rnd) { const [s, t] = n.rnd[Math.floor(Math.random() * n.rnd.length)]; this.showLine(s, t, null, n); d.i++; return; }
      if (n.c) { this.showLine(D[d.i - 1] && D[d.i - 1].s || 'you', null, n.c.filter(c => !c.req || c.req()), n); return; }
      if (n.s) { this.showLine(n.s, n.t, null, n); d.i++; return; }
      d.i++;
    }
    this.endDialogue();
  },
  showLine(s, t, choices, n) {
    const C = CREW[s] || CREW.radio; $('dlgwho').textContent = (C.name + (C.role ? ' · ' + C.role : '')).toUpperCase(); $('dlgwho').style.color = C.col;
    drawPortrait($('dlgface'), NPC_LOOKS[s] || (s === 'you' ? this.S.look : NPC_LOOKS.vael));
    for (const c of Companions.list) c.talking = c.id === s;
    const txt = $('dlgtxt'), ch = $('dlgch'); ch.innerHTML = '';
    if (t) { txt.textContent = ''; let i = 0; clearInterval(this._tw); this._tw = setInterval(() => { i += 2; txt.textContent = t.slice(0, i); if (i >= t.length) clearInterval(this._tw); }, 16); this._full = t; Audio2.voice(t, C.pitch, !!(n && n.radio)); }
    if (choices) { txt.textContent = this._full || ''; choices.forEach((c, k) => { const b = document.createElement('button'); b.textContent = (k + 1) + '. ' + c.t; b.onclick = () => this.choose(c); ch.appendChild(b); }); setTimeout(() => ch.firstChild && ch.firstChild.focus(), 30); }
    this.dlgChoices = choices;
    // conversational camera: frame speaker and player
    const sp = Companions.get(s); if (sp && !Cam.cine) { const p = Player.ch; const mx = (p.x + sp.x) / 2, mz = (p.z + sp.z) / 2, dx = sp.x - p.x, dz = sp.z - p.z, l = Math.hypot(dx, dz) || 1; const side = [-dz / l, dx / l]; this.dlgCam = { eye: [mx + side[0] * 4.2 + dx / l * -1.2, p.y + 1.9, mz + side[1] * 4.2 + dz / l * -1.2], at: [lerp(p.x, sp.x, .6), p.y + 1.3, lerp(p.z, sp.z, .6)] }; Player.ch.yaw = Math.atan2(dx, dz); sp.yaw = Math.atan2(-dx, -dz); }
  },
  choose(c) { Audio2.sfx('ui_ok'); if (c.fx) c.fx(); if (!this.dlg) return; const D = this.dlg.D; if (c.go) { const j = D.findIndex(x => x.l === c.go); this.dlg.i = j >= 0 ? j : D.length; } else this.dlg.i++; this.dlgChoices = null; this.dlgStep(); },
  dlgAdvance() { if (!this.dlg || this.dlgChoices) return; const txt = $('dlgtxt'); if (this._full && txt.textContent.length < this._full.length) { clearInterval(this._tw); txt.textContent = this._full; return; } this._full = ''; this.dlgStep(); },
  endDialogue() { const d = this.dlg; this.dlg = null; $('dlg').style.display = 'none'; for (const c of Companions.list) c.talking = false; this.dlgCam = null; if (this.state === 'dialogue') this.setState(this.prevState === 'dialogue' ? 'play' : (this.prevState || 'play')); if (d && d.id && d.id.endsWith('meet')) this.event('talk_' + d.id.replace('_meet', '1')); if (d && d.done) d.done(); },
  /* ---------------- subtitles / barks ---------------- */
  say(s, t, o = {}) { if (!Settings.v.subtitles && s !== 'sys') { Audio2.voice(t, (CREW[s] || CREW.radio).pitch, o.radio); return; } const C = CREW[s] || CREW.radio; const el = document.createElement('div'); el.innerHTML = `<b style="color:${C.col}">${C.name}:</b> ` + t.replace(/</g, '&lt;'); $('subs').appendChild(el); while ($('subs').children.length > 3) $('subs').firstChild.remove();
    const dur = o.short ? 2.6 : Math.min(9, 2.5 + t.length * .05); setTimeout(() => el.remove(), dur * 1000); if (s !== 'sys') Audio2.voice(t, C.pitch, o.radio); if (o.radio) this.sig = Math.max(this.sig, .4); },
  chapterCard(a, b, c, dur = 4, boss) { const el = $('chap'); $('chapa').textContent = a; $('chapb').textContent = b; $('chapc').textContent = c; el.style.display = 'flex'; el.style.opacity = 1; clearTimeout(this._cc); this._cc = setTimeout(() => { el.style.transition = 'opacity 1s'; el.style.opacity = 0; setTimeout(() => { el.style.display = 'none'; el.style.transition = ''; }, 1000); }, dur * 1000); },
  fade(t = .5, col) { this.fadeCol = col || [0, 0, 0]; this.fadeV = 1; this.fadeTo = 0; this.fadeSpeed = 1 / Math.max(.05, t); },
  fadeOut(t = .5, col) { this.fadeCol = col || [0, 0, 0]; this.fadeTo = 1; this.fadeSpeed = 1 / Math.max(.05, t); return new Promise(r => setTimeout(r, t * 1000 + 30)); },
  cinematic(on) { this.inCine = on; $('cine').style.display = on ? 'block' : 'none'; $('hud').style.opacity = on ? 0 : 1; if (on) Input.unlock(); },
  /* ---------------- flow: new game, continue, chapters, death ---------------- */
  async newGame(slot, look) {
    Audio2.init(); this.slot = slot; this.S = this.newState(look); this.S.quests.q1 = 0; this.S.quests.qS = undefined;
    if (!Settings.v.seenIntro || true) { await this.intro(); }
  },
  async startPlay(at) {
    UI.hideAll(); this.setState('play'); $('hud').style.display = 'block'; this.fade(.8); this.ensureQuests(); this.playAt = this.time;
    const R0 = REGIONS[this.S.region]; this.chapterCard('CHAPTER ' + R0.num, R0.chapter.toUpperCase(), R0.name.toUpperCase(), 4.2);
  },
  ensureQuests() { const S = this.S; for (const q of QUESTS) if (q.main && q.ch <= S.chapter && S.quests[q.id] === undefined) S.quests[q.id] = q.ch < S.chapter ? q.steps.length : 0; if (S.chapter >= 1 && S.quests.q2s === undefined) S.quests.q2s = 0; },
  async continueFrom(slot, data) {
    Audio2.init(); this.slot = slot; this.S = data; UI.hideAll(); if (data._recovered) UI.toast('Primary save was damaged — recovered from backup.');
    const pos = data.pos; await this.loadRegion(data.region, pos ? [pos[0], pos[2], pos[3]] : null, { keepTod: true }); Player.hp = Math.max(30, data.hp || Player.maxHp()); this.startPlay();
  },
  async completeChapter() {
    const S = this.S; if (UI.closeRecord) UI.closeRecord(); $('confirm').style.display = 'none'; if (this.state !== 'play') return; this.event('exit'); this.setState('cine'); await this.fadeOut(1);
    if (S.region < S.chapter) { await this.travel(S.region + 1); return; }
    const R0 = REGIONS[S.region]; const rec = S.journal.filter(j => LOGS[j].ch === S.chapter).length, tot = Object.values(LOGS).filter(l => l.ch === S.chapter).length;
    $('cdbody').innerHTML = `<div class="small" style="letter-spacing:.3em;color:var(--amber)">CHAPTER ${R0.num}</div><h2 style="margin:6px 0 12px;letter-spacing:.1em">${R0.chapter}</h2>` + [['Records recovered', rec + ' / ' + tot], ['Places discovered', (S.disc[S.region] || []).length + ' / ' + R0.pois.length], ['Hidden frequencies', S.freqs.length + ' / 8'], ['Echoed silenced', S.kills], ['Salvage', S.salvage], ['Time on Vesper-9', UI.fmtTime(S.playTime)]].map(([a, b]) => `<div class="stat">${a}<b>${b}</b></div>`).join('');
    if (S.chapter >= 7) return; UI.show('chapdone'); this.setState('chapdone');
    $('cdnext').onclick = async () => { Audio2.sfx('ui_ok'); UI.hide('chapdone'); S.chapter++; S.region = S.chapter; S.lastCp = null; this.ensureQuests(); await this.loadRegion(S.region); this.save('auto', true); this.startPlay(); };
  },
  async travel(region, cpId) { const S = this.S; this.setState('cine'); await this.fadeOut(.5); const cp = cpId && this.cpDefsFor(region, cpId); await this.loadRegion(region, cp ? [cp.x + 1.5, cp.z + 1.5, 0] : null); this.startPlay(); },
  cpDefsFor(region, id) { const p = this.S.cpPos && this.S.cpPos[id]; return p ? { x: p[0], z: p[1] } : null; },
  onKill(e) { if (this.S) this.S.kills++; },
  onBossPhase(id, ph) { const lines = { guardian: ['mara', 'It\'s pulling power from the tower! Keep moving!'], titan: ['orin', 'The coolant tanks — get it near them!'], chorus: ['orin', 'Every voice you woke is mine now.'], archivist: ['elias', 'It\'s rewriting itself. Break the plates again!'] }; const l = lines[id]; if (l) this.say(l[0], l[1], { radio: id === 'guardian' }); },
  onBossTalk(id) { if (id === 'firstvoice') { this.setState('play'); this.dialogue('fv_talk'); } },
  onDeath() { const tips = ['Roll through attacks — you are briefly untouchable mid-roll.', 'Scan bosses that seem to shrug off damage.', 'Crouch to move quietly; the Echoed hunt by sound.', 'Vent heat early so you never overheat mid-fight.', 'Stalkers fear your headlamp.', 'Hit brutes from behind for critical damage.']; $('deathtip').textContent = tips[Math.floor(Math.random() * tips.length)];
    setTimeout(() => { this.setState('dead'); UI.show('death'); Audio2.stopMusic(); }, 1600); },
  retry() { UI.hide('death'); const S = this.S; const cp = this.cpDefs.find(c => c.id === S.lastCp); const at = cp ? [cp.x + 1.6, cp.z + 1.2] : World.region.spawn;
    if (Boss.active) { Enemies.list = Enemies.list.filter(e => !e.isBoss); Boss.active = false; Boss.b = null; $('bossbar').style.display = 'none'; World.props = World.props.filter(p => p.kind !== 'coolant'); }
    Combat.shots = []; Enemies.list.forEach(e => { if (!e.isBoss && dist2(e.x, e.z, at[0], at[1]) < 400) { e.x = e.home[0]; e.z = e.home[1]; e.state = 'return'; } e.aware = 0; if (e.state === 'chase') e.state = 'return'; });
    Player.init(S.look); Player.place(at[0], at[1], Math.PI); Player.hp = Player.maxHp(); this.spawnCrew(); Audio2.setRegionMusic(World.region.music); this.fade(1); this.setState('play'); },
  /* ---------------- opening cinematic ---------------- */
  // Story, stated plainly: YOU are the signals operator of the five-person expedition vessel MERIDIAN. A distress signal in your own
  // voice pulls the ship to Vesper-9. A storm kills the ship's comms; your capsule ejects; you crash alone and wake up.
  async intro() {
    const skip = !!Settings.v.seenIntro; this.skipFlag = false; $('skip').style.display = skip ? 'block' : 'none'; $('skip').onclick = () => { this.skipFlag = true; };
    UI.hideAll(); this.fadeV = 1; this.fadeTo = 1; this.cinematic(true); this.setState('cine'); $('hud').style.display = 'none';
    const wait = s => new Promise(r => { const t0 = performance.now(); const f = () => { if (this.skipFlag || performance.now() - t0 > s * 1000) r(); else requestAnimationFrame(f); }; f(); });
    const text = (t, sub) => { $('cinetext').innerHTML = t ? `<div>${t}</div>` + (sub ? `<div style="font-size:.55em;color:var(--amber);letter-spacing:.3em;margin-top:10px">${sub}</div>` : '') : ''; };
    const look = this.S.look; await this.loadRegion(0); this.setState('cine'); this.cinematic(true); $('hud').style.display = 'none'; Audio2.stopMusic(); this.fadeV = 1; this.fadeTo = 1;
    this.W.tgt = REGIONS[0].weather[0]; this.W.cur = Object.assign({}, this.W.tgt); this.tod = .4; this.W.t = 1e9;
    // 1 · darkness, static, the voice
    this.sig = 1; Audio2.bed.static && Audio2.bed.static.g.gain.setTargetAtTime(.12, Audio2.now(), .5); await wait(1.6);
    text('“If you\'re hearing this…”'); Audio2.voice('if you are hearing this', 1, true); await wait(2.4);
    text('“…don\'t answer.”'); Audio2.voice('dont answer', 1, true); await wait(2.6); text(''); this.sig = 0;
    // 2 · title
    $('chapa').textContent = 'A SIGNAL FROM A WORLD THAT WENT SILENT'; $('chapb').textContent = 'THE LAST FREQUENCY'; $('chapc').textContent = ''; $('chap').style.display = 'flex'; $('chap').style.opacity = 1; Audio2.motif(.5, .08); await wait(3.6); $('chap').style.display = 'none';
    Audio2.setRegionMusic({ root: 82.4, scale: [0, 3, 7, 10], prog: [0, 2] }); Audio2.setMode('explore');
    // 3 · the bridge of the MERIDIAN — meet the crew (the explorer is YOU, wearing your chosen look)
    const BX = 0, BY = 260, BZ = 0; const crewDef = [['mara', 'MARA OKONKWO', 'EXPEDITION ENGINEER', -4], ['elias', 'ELIAS VANTERPOOL', 'RESEARCH SPECIALIST', -2], ['you', 'YOU', 'SIGNALS OPERATOR', 0], ['nova', 'NOVA ASHE', 'RECONNAISSANCE SPECIALIST', 2], ['orin', 'ORIN', 'SIGNAL TECHNICIAN', 4]];
    const crew = crewDef.map(([id, , , x]) => { const c = makeChar(id === 'you' ? look : NPC_LOOKS[id]); c.x = BX + x; c.z = BZ; c.y = BY + .45; c.yaw = 0; c.anim.sit = 1; c.onGround = true; c.pose.plant = 0; return c; });
    let alarm = 0, shipMode = false; const ship = { x: 0, y: 0, z: 0, yaw: -2.4, pitch: .35, shake: 0, fire: 0, capsule: null };
    const W2 = [.62, .64, .68], D2 = [.3, .32, .38];
    this.extraDraw = () => { const dt = this.dt || .016; const t = this.time;
      if (!shipMode) {
        R.box(BX, BY - .25, BZ + 1, 14, .5, 10, 0, [.42, .45, .5], 0, F_REFL); R.box(BX, BY + 4.8, BZ + 1, 14, .4, 10, 0, [.3, .33, .38]);
        R.box(BX - 7, BY + 2.4, BZ + 1, .4, 5, 10, 0, W2); R.box(BX + 7, BY + 2.4, BZ + 1, .4, 5, 10, 0, W2); R.box(BX, BY + 2.4, BZ - 4, 14, 5, .4, 0, D2);
        R.box(BX - 4.8, BY + 2.4, BZ + 5.5, 4.4, 5, .4, 0, W2); R.box(BX + 4.8, BY + 2.4, BZ + 5.5, 4.4, 5, .4, 0, W2); R.box(BX, BY + .4, BZ + 5.5, 5.2, 1.3, .4, 0, W2); R.box(BX, BY + 4.4, BZ + 5.5, 5.2, 1.0, .4, 0, W2);
        R.box(BX, BY + 4.7, BZ + .5, 10, .1, .5, 0, [1, .95, .8], 1, F_UNLIT);
        for (const [i, c] of crew.entries()) { const x = BX + crewDef[i][3]; R.box(x, BY + .55, BZ - .55, 1.1, .2, 1, 0, [.25, .27, .3]); R.box(x, BY + 1.1, BZ - 1, 1, 1.1, .2, 0, [.25, .27, .3]); R.box(x, BY + .75, BZ + 1.6, 1.6, .7, .9, 0, [.3, .33, .38]);
          const act = i === 2 || alarm > 0; R.box(x, BY + 1.12, BZ + 1.62, 1.3, .06, .6, 0, alarm > 0 && Math.sin(t * 8) > 0 ? [1, .25, .2] : [.4, .9, 1], act ? 1 : .35, F_UNLIT);
          c.anim.talk = 0; Anim.update(c, dt); drawHumanoid(c, {}); }
        this.flashLight(BX, BY + 3.6, BZ, alarm > 0 && Math.sin(t * 8) > 0 ? [1, .3, .25] : [1, .95, .85], 22, .05); this.flashLight(BX, BY + 2, BZ - 2, [.7, .85, 1], 14, .05);
      } else {
        const sp = A34.trs(mp(), ship.x, ship.y, ship.z, ship.yaw, ship.pitch, Math.sin(t * 9) * .12 * ship.shake, 1, 1, 1);
        part(sp, 0, 0, 0, 3.2, 1.6, 11, [.74, .75, .78], 0, F_REFL); part(sp, 0, .05, 6.4, 2.4, 1.3, 2.4, [.84, .85, .88], 0, 0, 'cone' === 'x' ? 'cone' : 'cube'); part(sp, 0, .9, 3, 2.2, .7, 3, [.2, .55, .75], .6, F_REFL);
        part(sp, 0, 0, 0, 11, .25, 4.2, [.58, .6, .64], 0, F_REFL); part(sp, 0, 1.2, -4.5, .35, 2.4, 2.2, [.5, .52, .56]); part(sp, -1.3, 0, -6, 1.3, 1.3, 1.6, [1, .55, .2], 1, F_UNLIT); part(sp, 1.3, 0, -6, 1.3, 1.3, 1.6, [1, .55, .2], 1, F_UNLIT);
        part(sp, 0, 1.0, 0, 1.2, .05, 5, [1, .3, .2], alarm > 0 && Math.sin(t * 8) > 0 ? 1 : .1, F_UNLIT);
        if (ship.fire && Math.random() < .8) { const e = A34.pt(sp, 0, 0, -7); FX.spawn(e[0], e[1], e[2], (Math.random() - .5) * 2, 1, (Math.random() - .5) * 2, 1, 1.6, [1, .5, .2], true, -.1); }
        if (!ship.capsule) { const e = A34.pt(sp, 0, 0, -7); FX.spawn(e[0], e[1], e[2], 0, 0, 0, .5, 1.3, [1, .7, .3], true, 0); } this.flashLight(ship.x, ship.y + 3, ship.z, [1, .85, .7], 30, .05);
        const cp = ship.capsule; if (cp) { const c2 = A34.trs(mp(), cp.x, cp.y, cp.z, cp.yaw, cp.pitch, 0, 1, 1, 1); part(c2, 0, 0, 0, 1.6, 1.6, 3.2, [.7, .7, .72], 0, F_REFL); part(c2, 0, .2, 1.7, 1.2, 1.2, 1.2, [.5, .5, .55]); part(c2, 0, .2, 0, 1.7, .5, 1.7, [1, .3, .2], .9, F_UNLIT);
          for (let k = 0; k < 4; k++) FX.spawn(cp.x + (Math.random() - .5), cp.y + 1, cp.z + (Math.random() - .5), (Math.random() - .5), 3 + Math.random() * 2, (Math.random() - .5), 1.4, 2, [1, .5 + Math.random() * .3, .2], true, -.1); this.flashLight(cp.x, cp.y, cp.z, [1, .6, .3], 22, .05); }
      } };
    const sc = (x, y, z, fov = .6) => ({ eye: [x, y, z], fov });
    const shot = (eyeF, atF, dur, fov = .6) => Cam.play([{ t: 0, eye: eyeF, at: atF, fov }, { t: dur, eye: eyeF, at: atF, fov }], null, { hold: true });
    this.fadeTo = 0; this.fadeSpeed = 1.2; this.fadeV = 1;
    text('EXPEDITION VESSEL MERIDIAN', 'CREW OF FIVE · BOUND FOR VESPER-9'); Cam.play([{ t: 0, eye: [BX - 5, BY + 3, BZ - 3.4], at: [BX, BY + 1.6, BZ + 3], fov: .75 }, { t: 6, eye: [BX + 5, BY + 3, BZ - 3.4], at: [BX, BY + 1.6, BZ + 3], fov: .75 }], null, { hold: true }); Audio2.sfx('machine'); await wait(3.4);
    for (let i = 0; i < crewDef.length && !this.skipFlag; i++) { const [id, name, role, x] = crewDef[i]; text(name, role); const ch = crew[i]; shot([BX + x + .6, BY + 1.55, BZ + 4.2], [BX + x, BY + 1.45, BZ], 2.4, .38); if (id === 'you') { ch.anim.talk = 0; Audio2.motif(1, .04); } await wait(id === 'you' ? 3 : 2); }
    // 4 · the signal arrives
    text('A SIGNAL ARRIVES', 'SURFACE OF VESPER-9 · SOURCE UNKNOWN'); shot([BX, BY + 2.6, BZ - 3.8], [BX, BY + 1.5, BZ + 4], 5, .85); this.sig = 1; Audio2.sfx('scan_ping'); Audio2.sfx('log'); await wait(2);
    this.say('radio', '…if you\'re hearing this… don\'t answer…', { radio: true }); await wait(3.2); text(''); this.sig = .4;
    this.say('mara', 'Operator… that\'s coming from the surface. Nobody should be down there.'); crew[0].anim.talk = 1; shot([BX - 1.5, BY + 1.7, BZ + 3.4], [BX - 3, BY + 1.5, BZ], 3, .5); await wait(3.6); crew[0].anim.talk = 0;
    this.say('orin', 'It\'s repeating. Every three hundred and twelve seconds.'); this.sig = 0; await wait(2.8);
    // 5 · the approach, the storm, the failure
    shipMode = true; this.W.tgt = REGIONS[0].weather[3]; this.W.cur = Object.assign({}, this.W.tgt); this.tod = .33; ship.x = 50; ship.y = 70; ship.z = 90; ship.yaw = -2.5; ship.pitch = .18;
    const t0 = performance.now(); let flying = true; const fly = () => { if (!flying) return; const k = (performance.now() - t0) / 1000; if (!ship.capsule) { ship.x = 50 - k * 6; ship.y = 70 - k * 2; ship.z = 90 - k * 8; } if (k < 40 && !this.skipFlag) requestAnimationFrame(fly); }; fly();
    this.fadeCol = [0, 0, 0]; const shipAt = () => [ship.x, ship.y, ship.z];
    text('VESPER-9', 'A STORM-WRAPPED WORLD · COMMUNICATIONS ARRAY: ONLINE'); Cam.play([{ t: 0, eye: () => [ship.x + 17, ship.y + 4, ship.z + 13], at: shipAt, fov: .8 }, { t: 12, eye: () => [ship.x + 11, ship.y + 3, ship.z + 8], at: shipAt, fov: .75 }], null, { hold: true }); await wait(3.6);
    this.lightning = 1; Audio2.sfx('thunder'); ship.shake = 1; await wait(1); this.lightning = 1; Audio2.sfx('thunder'); await wait(1.2);
    alarm = 1; ship.fire = 1; this.sig = 1.5; text('COMMUNICATION FAILURE', 'MERIDIAN · ALL CHANNELS DOWN'); for (let i = 0; i < 5; i++) Audio2.tone(880, .25, 'square', .05, { delay: i * .5 }); Audio2.sfx('overheat'); await wait(3.4);
    this.say('mara', '(over comms) We\'re losing the ship! Operator — get to the capsule!', { radio: true }); await wait(2.8);
    // 6 · your capsule ejects and falls
    text('YOUR CAPSULE EJECTS', 'THE MERIDIAN AND ITS CREW ARE LOST IN THE STORM'); ship.capsule = { x: ship.x, y: ship.y - 2, z: ship.z, yaw: -2.5, pitch: 1, vy: 0 }; Audio2.sfx('burst'); Cam.shake(.6);
    const cp = ship.capsule; const ct0 = performance.now(), cs = [cp.x, cp.y, cp.z], ce = [3, World.hf.at(3, 58) + 1, 58];
    Cam.play([{ t: 0, eye: () => [cp.x + 9, cp.y + 3, cp.z + 8], at: () => [cp.x, cp.y, cp.z], fov: .8 }, { t: 14, eye: () => [cp.x + 7, cp.y + 3, cp.z + 9], at: () => [cp.x, cp.y - 1, cp.z], fov: .8 }], null, { hold: true });
    await new Promise(r => { const f = () => { const k = Math.min(1, (performance.now() - ct0) / 6500); const e = k * k; cp.x = lerp(cs[0], ce[0], e); cp.y = lerp(cs[1], ce[1], e); cp.z = lerp(cs[2], ce[2], e); if (k < 1 && !this.skipFlag) requestAnimationFrame(f); else r(); }; f(); });
    flying = false; this.skipFlag ? 0 : (Audio2.sfx('brute_slam'), Cam.shake(1)); await this.fadeOut(.2, [1, 1, 1]); shipMode = false; this.extraDraw = null; text(''); await wait(.6);
    // 7 · you wake in the wreck of your capsule
    this.fadeCol = [0, 0, 0]; this.fadeV = 1; this.W.tgt = REGIONS[0].weather[1]; this.W.cur = Object.assign({}, this.W.tgt); this.tod = .37; Audio2.setRegionMusic(REGIONS[0].music);
    Player.init(look); Player.place(2.5, 55.5, Math.PI * .9); Player.ch.anim.kneel = 1; Audio2.sfx('heartbeat'); await wait(1.2);
    this.fadeTo = 0; this.fadeSpeed = .45; Cam.play([{ t: 0, eye: [4.5, Player.y + .8, 53.5], at: [2.5, Player.y + .9, 55.5], fov: .6 }, { t: 5, eye: [6.5, Player.y + 2.2, 51], at: [2.5, Player.y + 1, 55.5], fov: .75 }], null, { hold: true });
    text('VESPER-9 · ASHEN FRONTIER', 'YOU SURVIVED. YOU ARE ALONE.'); await wait(3); Player.ch.anim.kneel = 0; text('');
    this.say('you', 'Mara? Elias? …Nova, Orin — anyone?'); await wait(2.4); this.say('radio', '…[static]… repeat… don\'t… answer…', { radio: true }); await wait(2.4);
    Settings.v.seenIntro = true; Settings.save(); $('skip').style.display = 'none'; Cam.cine = null; Cam.beginTrans(); this.cinematic(false); this.extraDraw = null; Player.ch.anim.kneel = 0; this.sig = 0; text('');
    Player.place(2.5, 55.5, Math.PI * .9); this.W.t = 60; this.startPlay(); this.save('auto', true);
    setTimeout(() => this.say('sys', 'OBJECTIVE: find your crew — Mara, Elias, Nova, Orin — and the source of the signal.'), 1800);
    if (Settings.v.tutorial) setTimeout(() => this.say('sys', Input.device === 'touch' ? 'Left stick: move · drag the right side: look · CAM button: change view' : Input.device === 'pad' ? 'Left stick: move · Right stick: camera · D-pad ↓: change camera' : `WASD to move · [${Input.glyph('camera')}] changes the camera · [${Input.glyph('interact')}] interacts`), 6500);
  },
  /* ---------------- endings ---------------- */
  async ending(k) {
    const S = this.S, E = ENDINGS[k]; setFlag('ending', k); if (!S.endings.includes(k)) S.endings.push(k); const g = Save.global(); g.endings = [...new Set([...(g.endings || []), k])]; Save.setGlobal(g); this.event('ending'); this.save('auto', true);
    this.endDialogue(); this.setState('ending'); this.cinematic(true); $('skip').style.display = 'none';
    // the Heart reacts first
    Audio2.motif(1, .1, k === 'D'); if (k === 'D') setTimeout(() => Audio2.motif(1, .1, true), 2400);
    this.sig = k === 'B' ? 2 : 1; Cam.play([{ t: 0, eye: [8, 6, -48], at: [0, 7, -60], fov: .7 }, { t: 5, eye: [3, 9, -52], at: [0, 7, -60], fov: .5 }], null, { hold: true }); for (let i = 0; i < 6; i++) setTimeout(() => FX.burst(0, 7, -60, 50, k === 'B' ? [1, 1, 1] : [1, .5, .9], 6, 2, .9, true, -.1), i * 600);
    await new Promise(r => setTimeout(r, 4500)); await this.fadeOut(1.5, k === 'B' ? [1, 1, 1] : [0, 0, 0]);
    // epilogue: another region transformed by the choice
    this.endingTint = { lift: E.tint.lift, gain: E.tint.gain, desat: E.desat || 0, aur: E.aur }; await this.loadRegion(E.epi); this.setState('ending'); this.cinematic(true);
    this.tod = k === 'B' ? .45 : .9; if (k === 'B') { this.W.tgt = Object.assign(W_('Silence', 1, { wind: 0, fog: .4 })); this.W.cur = Object.assign({}, this.W.tgt); } else { this.W.tgt = W_('Calm', 1, { motes: 1, wind: .2 }); this.W.cur = Object.assign({}, this.W.tgt); }
    if (k === 'A') for (const L of World.lights) { L.cond = null; L.int = Math.max(L.int, .9); }
    if (k === 'C') for (const L of World.lights) { L.col = [.4, .9, 1]; L.int = 1; L.cond = null; }
    Enemies.clear(); Companions.set(S.crew.filter(c => c !== 'orin')); const sp = World.region.spawn; Companions.list.forEach((c, i) => { c.x = sp[0] + i * 1.5 - 1; c.z = sp[1] - 8; c.y = World.ground(c.x, c.z, 999).h; c.follow = false; c.yaw = Math.PI; if (k === 'B') c.anim.sit = 1; });
    Player.place(sp[0] + 3, sp[1] - 9, Math.PI); if (k === 'C') Player.ch.alpha = 0;
    Audio2.setRegionMusic(E.music); Audio2.setMode(k === 'B' ? 'silence' : 'ending');
    const cx = sp[0], cz = sp[1]; Cam.play([{ t: 0, eye: [cx + 14, 6, cz - 2], at: [cx, 2, cz - 10], fov: .8 }, { t: 30, eye: [cx - 10, 18, cz - 30], at: [cx, 8, cz - 60], fov: .7 }], null, { hold: true });
    this.fadeTo = 0; this.fadeSpeed = .5;
    for (const line of E.lines) { $('cinetext').textContent = line; await new Promise(r => setTimeout(r, 4200 + line.length * 35)); }
    $('cinetext').textContent = ''; $('chapa').textContent = E.secret ? 'SECRET ENDING' : 'ENDING'; $('chapb').textContent = E.title.toUpperCase(); $('chapc').textContent = ''; $('chap').style.display = 'flex'; $('chap').style.opacity = 1;
    await new Promise(r => setTimeout(r, 4500)); $('chap').style.display = 'none'; await this.fadeOut(1.5);
    this.cinematic(false); UI.showCredits(async () => {
      // post-credit scene
      this.cinematic(true); this.fadeTo = 0; this.fadeSpeed = .5; this.tod = .95; this.W.cur = W_('Clear', 1, { wind: .1 }); this.W.tgt = this.W.cur;
      if (k === 'D' || k === 'A') this.extraDraw = () => { for (let i = 0; i < 5; i++) { const on = k === 'D' ? Math.floor(this.time * 2.5) % 10 === i * 2 : Math.sin(this.time + i) > .9; const a = i * .12 + .3; A34.trs(_W, Cam.eye[0] + Math.sin(a) * 300, 140 + i * 6, Cam.eye[2] - 300, 0, 0, 0, 2.5, 2.5, 2.5); R.inst('oct', _W, 1, 1, .9, on ? 1 : .05, F_UNLIT); } };
      if (k === 'C') { Player.ch.alpha = 1; }
      Cam.play([{ t: 0, eye: [cx, 3, cz - 6], at: [cx, 20, cz - 60], fov: .9 }, { t: 14, eye: [cx, 2.5, cz - 8], at: [cx, 30, cz - 60], fov: .8 }], null, { hold: true });
      $('cinetext').textContent = E.post; if (k === 'D') { setTimeout(() => Audio2.motif(1, .08), 1500); setTimeout(() => Audio2.motif(1, .08, true), 5000); } if (k === 'C') Audio2.voice('if you are hearing this dont answer', 1, true);
      await new Promise(r => setTimeout(r, 11000)); $('cinetext').textContent = ''; await this.fadeOut(1.5); this.extraDraw = null; this.endingTint = null; this.cinematic(false); UI.toTitle();
    });
  },
};
