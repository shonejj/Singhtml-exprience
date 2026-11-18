
/* =====================================================================
   AUDIO — fully procedural WebAudio: buses, spatial SFX, ambience,
   weather beds, generative adaptive music, radio voice synthesis
   ===================================================================== */
const Audio2 = {
  ctx: null, ok: false, music: { on: false, step: 0, next: 0, mode: 'explore', region: null, intensity: 0 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx; this.ok = true;
    this.master = c.createGain(); this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.ratio.value = 4; this.master.connect(this.comp); this.comp.connect(c.destination);
    this.bus = {}; for (const k of ['music', 'sfx', 'ambient', 'dialogue', 'radio']) { this.bus[k] = c.createGain(); this.bus[k].connect(this.master); }
    // reverb send
    this.verb = c.createConvolver(); this.verbGain = c.createGain(); this.verbGain.gain.value = .25; this.verb.connect(this.verbGain); this.verbGain.connect(this.master); this.setVerb(1.6, 2.5);
    // noise buffers
    const len = c.sampleRate * 2; this.noise = c.createBuffer(1, len, c.sampleRate); const d = this.noise.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    this.white = c.createBuffer(1, len, c.sampleRate); const wd = this.white.getChannelData(0); for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    // ambient beds
    this.bed = {};
    const loop = (buf, type, f, q, bus) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.bus[bus]); s.start(); return { s, f: fl, g }; };
    this.bed.wind = loop(this.noise, 'bandpass', 400, .6, 'ambient'); this.bed.gust = loop(this.noise, 'bandpass', 900, 2, 'ambient');
    this.bed.rain = loop(this.white, 'highpass', 2500, .5, 'ambient'); this.bed.rain2 = loop(this.noise, 'lowpass', 700, .5, 'ambient');
    this.bed.static = loop(this.white, 'bandpass', 2200, 1.5, 'radio'); this.bed.water = loop(this.noise, 'lowpass', 500, 1, 'ambient');
    this.bed.hum = (() => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const g = c.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(this.bus.ambient); o.start(); return { o, f, g }; })();
    // drone
    this.drone = []; for (let i = 0; i < 3; i++) { const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = c.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(this.bus.music); g.connect(this.verb); o.start(); this.drone.push({ o, f, g }); }
    // music delay
    this.delay = c.createDelay(1); this.delay.delayTime.value = .375; this.fb = c.createGain(); this.fb.gain.value = .35; this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.bus.music);
    this.listener = c.listener; this.applyVolumes();
  },
  setVerb(sec, decay) { if (!this.ctx) return; const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } this.verb.buffer = b; },
  applyVolumes() { if (!this.ok) return; const s = Settings.v, t = this.ctx.currentTime; this.master.gain.setTargetAtTime(s.master, t, .05); for (const k of ['music', 'sfx', 'ambient', 'dialogue', 'radio']) this.bus[k].gain.setTargetAtTime(s[k], t, .05); this.comp.ratio.value = s.dynRange ? 3 : 12; },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  // positional output node
  out(pos, bus = 'sfx', occl = false) {
    const c = this.ctx; if (!pos) return this.bus[bus];
    const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3; p.maxDistance = 80; p.rolloffFactor = 1.1;
    if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; } else p.setPosition(pos[0], pos[1], pos[2]);
    if (occl) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(p); p.connect(this.bus[bus]); p.connect(this.verb); return f; }
    p.connect(this.bus[bus]); return p;
  },
  setListener(pos, fwd) {
    if (!this.ok) return; const l = this.listener, t = this.ctx.currentTime;
    if (l.positionX) { l.positionX.setTargetAtTime(pos[0], t, .05); l.positionY.setTargetAtTime(pos[1], t, .05); l.positionZ.setTargetAtTime(pos[2], t, .05); l.forwardX.setTargetAtTime(fwd[0], t, .05); l.forwardY.setTargetAtTime(fwd[1], t, .05); l.forwardZ.setTargetAtTime(fwd[2], t, .05); l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
    else { l.setPosition(pos[0], pos[1], pos[2]); l.setOrientation(fwd[0], fwd[1], fwd[2], 0, 1, 0); }
  },
  env(g, t, a, peak, d, sus = 0) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sus, .0001), t + a + d); },
  tone(f, dur, type = 'sine', vol = .3, o = {}) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime + (o.delay || 0); const osc = c.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t + dur); const g = c.createGain(); this.env(g, t, o.a || .005, vol, dur);
    let node = osc; if (o.filter) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.filter; osc.connect(fl); node = fl; }
    node.connect(g); const out = this.out(o.pos, o.bus || 'sfx', o.occl); g.connect(out); if (o.verb) g.connect(this.verb); if (o.dly) g.connect(this.delay);
    osc.start(t); osc.stop(t + dur + .05);
  },
  noiseHit(dur, f, vol = .3, o = {}) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime + (o.delay || 0); const s = c.createBufferSource(); s.buffer = o.white ? this.white : this.noise; s.playbackRate.value = o.rate || 1;
    const fl = c.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(f, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur); fl.Q.value = o.q || 1;
    const g = c.createGain(); this.env(g, t, o.a || .003, vol, dur); s.connect(fl); fl.connect(g); g.connect(this.out(o.pos, o.bus || 'sfx', o.occl)); if (o.verb) g.connect(this.verb);
    s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  /* ---- SFX catalogue ---- */
  sfx(name, pos, k = 1, occl = false) {
    if (!this.ok) return; const o = { pos, occl };
    switch (name) {
      case 'step_ash': this.noiseHit(.09, 500, .16 * k, { ...o, type: 'lowpass' }); break;
      case 'step_grass': this.noiseHit(.12, 2600, .1 * k, { ...o, q: .7 }); this.noiseHit(.06, 700, .08 * k, { ...o, type: 'lowpass' }); break;
      case 'step_stone': this.noiseHit(.05, 1800, .14 * k, { ...o, q: 3 }); this.tone(220 + Math.random() * 60, .04, 'triangle', .03 * k, o); break;
      case 'step_metal': this.noiseHit(.05, 3000, .1 * k, { ...o, q: 4 }); this.tone(520 + Math.random() * 300, .18, 'triangle', .05 * k, { ...o, verb: 1 }); break;
      case 'step_water': this.noiseHit(.18, 1200, .18 * k, { ...o, to: 400, q: .8 }); break;
      case 'step_crystal': this.tone(1200 + Math.random() * 800, .25, 'sine', .05 * k, { ...o, verb: 1 }); this.noiseHit(.04, 4000, .06 * k, o); break;
      case 'jump': this.noiseHit(.12, 900, .08, { ...o, to: 1800 }); break;
      case 'land': this.noiseHit(.15, 300, .25 * k, { ...o, type: 'lowpass' }); break;
      case 'roll': this.noiseHit(.3, 400, .18, { ...o, to: 1400 }); break;
      case 'shot': this.tone(980, .14, 'square', .1, { ...o, to: 160, filter: 2400 }); this.noiseHit(.08, 2000, .12, o); break;
      case 'scatter': for (let i = 0; i < 3; i++) this.tone(700 + i * 90, .16, 'sawtooth', .06, { ...o, to: 120, filter: 1800 }); this.noiseHit(.14, 1200, .2, o); break;
      case 'lance': this.tone(140, .6, 'sawtooth', .16, { ...o, to: 1400, filter: 3000, verb: 1 }); this.noiseHit(.5, 3000, .15, { ...o, to: 300 }); break;
      case 'overheat': this.noiseHit(.6, 4000, .15, { ...o, to: 600, white: 1 }); this.tone(300, .4, 'square', .05, { ...o, to: 80 }); break;
      case 'vent': this.noiseHit(.5, 5000, .12, { ...o, to: 1200, white: 1 }); break;
      case 'hit': this.noiseHit(.07, 1500, .2, { ...o, q: 2 }); this.tone(180, .08, 'square', .06, { ...o, to: 90 }); break;
      case 'crit': this.tone(1500, .18, 'triangle', .1, { ...o, to: 2600 }); this.noiseHit(.08, 2500, .2, o); break;
      case 'melee': this.noiseHit(.16, 700, .2, { ...o, to: 2600, q: 1.5 }); this.tone(90, .15, 'sine', .15, o); break;
      case 'burst': this.tone(60, .9, 'sine', .4, { ...o, to: 30 }); this.tone(300, 1.2, 'triangle', .08, { ...o, to: 1200, verb: 1 }); this.noiseHit(.8, 600, .2, { ...o, to: 120 }); break;
      case 'hurt': this.tone(120, .2, 'square', .1, { ...o, to: 60, filter: 900 }); this.noiseHit(.15, 500, .2, o); break;
      case 'echo_hurt': this.tone(400 + Math.random() * 200, .2, 'sawtooth', .08, { ...o, to: 220, filter: 1500 }); break;
      case 'echo_call': { const f = 180 + Math.random() * 120; this.tone(f, .9, 'sawtooth', .06 * k, { ...o, to: f * 1.6, filter: 900, verb: 1, a: .3 }); this.tone(f * 1.01, .9, 'sine', .05 * k, { ...o, to: f * .7, a: .25 }); break; }
      case 'echo_alert': this.tone(900, .35, 'sawtooth', .08, { ...o, to: 300, filter: 2000 }); this.tone(1400, .25, 'sine', .05, { ...o, to: 500 }); break;
      case 'echo_die': this.tone(600, 1.1, 'sine', .12, { ...o, to: 80, verb: 1 }); this.noiseHit(1, 3000, .1, { ...o, to: 200 }); for (let i = 0; i < 4; i++) this.tone(800 + i * 300, .3, 'sine', .03, { ...o, delay: i * .08, verb: 1 }); break;
      case 'brute_slam': this.tone(55, .8, 'sine', .45, { ...o, to: 25 }); this.noiseHit(.6, 200, .4, { ...o, type: 'lowpass' }); break;
      case 'boss_roar': this.tone(70, 1.8, 'sawtooth', .2, { ...o, to: 40, filter: 500, verb: 1, a: .2 }); this.tone(110, 1.6, 'square', .08, { ...o, to: 55, filter: 700, a: .3 }); this.noiseHit(1.5, 400, .25, { ...o, to: 150 }); break;
      case 'tele': this.tone(1200, .4, 'square', .05, { ...o, to: 2400, filter: 3000 }); break;
      case 'scan': this.tone(320, 1.1, 'sine', .14, { to: 1900, verb: 1, a: .02 }); this.tone(640, 1.1, 'triangle', .05, { to: 3800, a: .05, dly: 1 }); break;
      case 'scan_ping': this.tone(1760, .25, 'sine', .08, { ...o, verb: 1 }); this.tone(2640, .2, 'sine', .04, { ...o, delay: .08 }); break;
      case 'reveal': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .5, 'triangle', .07, { delay: i * .07, verb: 1 })); break;
      case 'pickup': this.tone(880, .12, 'triangle', .1); this.tone(1320, .16, 'triangle', .08, { delay: .06 }); break;
      case 'log': this.noiseHit(.4, 2500, .1, { white: 1, bus: 'radio' }); this.tone(1000, .1, 'square', .04, { delay: .1, bus: 'radio' }); break;
      case 'ui': this.tone(1400, .04, 'square', .03, { filter: 3000 }); break;
      case 'ui_ok': this.tone(900, .06, 'square', .04, { filter: 3000 }); this.tone(1350, .08, 'square', .04, { filter: 3000, delay: .05 }); break;
      case 'ui_back': this.tone(700, .06, 'square', .03, { filter: 2000 }); break;
      case 'checkpoint': [392, 523, 659, 784].forEach((f, i) => this.tone(f, .9, 'sine', .09, { delay: i * .12, verb: 1, dly: 1 })); break;
      case 'door': this.tone(70, 1.2, 'sawtooth', .1, { ...o, to: 110, filter: 300 }); this.noiseHit(1.1, 300, .15, { ...o, type: 'lowpass' }); this.noiseHit(.15, 900, .2, { ...o, delay: 1.1 }); break;
      case 'machine': this.tone(55, 1.6, 'sawtooth', .12, { ...o, to: 110, filter: 400, a: .4 }); this.tone(220, 1.2, 'square', .03, { ...o, to: 440, filter: 800, a: .5 }); break;
      case 'power': this.tone(80, 1.5, 'sawtooth', .14, { ...o, to: 240, filter: 900, a: .5 }); [262, 330, 392].forEach((f, i) => this.tone(f, 1.5, 'sine', .05, { delay: .6 + i * .1, verb: 1 })); break;
      case 'solve': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .7, 'triangle', .08, { delay: i * .09, verb: 1, dly: 1 })); break;
      case 'fail': this.tone(220, .3, 'square', .06, { to: 110, filter: 900 }); break;
      case 'break': this.noiseHit(.35, 1200, .3, { ...o, q: .6 }); this.tone(160, .2, 'square', .08, { ...o, to: 60, filter: 800 }); break;
      case 'thud': this.noiseHit(.12, 250, .2 * k, { ...o, type: 'lowpass' }); break;
      case 'splash': this.noiseHit(.4, 1500, .25 * k, { ...o, to: 300, q: .7 }); break;
      case 'thunder': this.noiseHit(3.5, 120, .55 * k, { type: 'lowpass', to: 50, a: .1, verb: 1, bus: 'ambient', delay: o.pos ? 0 : 0 }); this.noiseHit(1.2, 600, .3 * k, { type: 'lowpass', to: 90, bus: 'ambient' }); break;
      case 'creature': { const f = 300 + Math.random() * 900; this.tone(f, .5, 'sine', .03, { ...o, to: f * (Math.random() > .5 ? 1.5 : .6), verb: 1, bus: 'ambient' }); break; }
      case 'creak': this.tone(90 + Math.random() * 40, 1.2, 'sawtooth', .025, { ...o, to: 70, filter: 400, verb: 1, bus: 'ambient', a: .3 }); break;
      case 'drip': this.tone(1800 + Math.random() * 900, .1, 'sine', .04, { ...o, to: 900, verb: 1, bus: 'ambient' }); break;
      case 'clank': this.noiseHit(.08, 2500, .12, { ...o, q: 6, bus: 'ambient' }); this.tone(320 + Math.random() * 200, .6, 'triangle', .04, { ...o, verb: 1, bus: 'ambient' }); break;
      case 'chime': this.tone([523, 587, 659, 784, 880][Math.random() * 5 | 0] * 2, 1.4, 'sine', .03, { ...o, verb: 1, bus: 'ambient' }); break;
      case 'ping': this.tone(1200, .5, 'sine', .07, { ...o, verb: 1 }); break;
      case 'deny': this.tone(200, .15, 'square', .05, { filter: 800 }); this.tone(160, .15, 'square', .05, { filter: 800, delay: .12 }); break;
      case 'heartbeat': this.tone(60, .15, 'sine', .25); this.tone(55, .15, 'sine', .2, { delay: .22 }); break;
    }
  },
  // Vael leitmotif — five notes that recur in puzzles, story and endings
  motif(scale = 1, vol = .07, answer = false) { const n = answer ? [784, 659, 587, 523, 659] : [523, 659, 587, 784, 698]; n.forEach((f, i) => this.tone(f * scale, .9, 'triangle', vol, { delay: i * .32, verb: 1, dly: 1, a: .02, bus: 'music' })); },
  // synthetic radio "voice": formant babble so speech has rhythm without recorded VO
  voice(text, pitch = 1, radio = false) {
    if (!this.ok || !Settings.v.dialogue) return; const c = this.ctx; const syl = Math.min(18, Math.ceil(text.length / 6)); let t = c.currentTime + .02;
    const bus = radio ? 'radio' : 'dialogue';
    for (let i = 0; i < syl; i++) {
      const d = .07 + Math.random() * .07; const o = c.createOscillator(); o.type = 'sawtooth'; const base = (110 + Math.random() * 30) * pitch; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * (.9 + Math.random() * .25), t + d);
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 400 + Math.random() * 600; f1.Q.value = 5; const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1200 + Math.random() * 1200; f2.Q.value = 6;
      const g = c.createGain(); this.env(g, t, .015, radio ? .1 : .07, d); o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g);
      if (radio) { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700; g.connect(hp); hp.connect(this.bus[bus]); } else g.connect(this.bus[bus]);
      o.start(t); o.stop(t + d + .05); t += d + .03 + (Math.random() < .2 ? .12 : 0);
    }
    if (radio) this.noiseHit(t - c.currentTime, 2400, .03, { white: 1, bus: 'radio', q: 1 });
  },
  /* ---- ambience update (per frame) ---- */
  ambience(env) {
    if (!this.ok) return; const t = this.ctx.currentTime, B = this.bed;
    B.wind.g.gain.setTargetAtTime(.08 + env.wind * .35, t, .3); B.wind.f.frequency.setTargetAtTime(250 + env.wind * 500, t, .4);
    B.gust.g.gain.setTargetAtTime(Math.max(0, env.gust) * .12 * env.wind, t, .2); B.gust.f.frequency.setTargetAtTime(700 + env.gust * 900, t, .3);
    B.rain.g.gain.setTargetAtTime(env.rain * .16 * (env.indoor ? .3 : 1), t, .5); B.rain2.g.gain.setTargetAtTime(env.rain * .25, t, .5);
    B.static.g.gain.setTargetAtTime(env.static * .05, t, .2); B.static.f.frequency.setTargetAtTime(1500 + Math.random() * 2000, t, .05);
    B.water.g.gain.setTargetAtTime(env.water * .12, t, .5); B.hum.g.gain.setTargetAtTime(env.hum * .06, t, .5);
    // random environmental events
    if (Math.random() < env.events * .004) this.sfx(env.eventPool[Math.random() * env.eventPool.length | 0], [env.pos[0] + (Math.random() - .5) * 50, env.pos[1] + 4, env.pos[2] + (Math.random() - .5) * 50]);
  },
  /* ---- generative adaptive music ---- */
  setRegionMusic(m) { this.music.region = m; this.music.on = true; if (!this.ok) return; const t = this.ctx.currentTime; this.drone.forEach((d, i) => { d.o.frequency.setTargetAtTime(m.root * [.5, .5 * 1.498, 1][i] * (i === 1 ? 1.003 : 1), t, 1.5); }); },
  setMode(mode) { this.music.mode = mode; },
  stopMusic() { this.music.on = false; if (!this.ok) return; const t = this.ctx.currentTime; this.drone.forEach(d => d.g.gain.setTargetAtTime(0, t, .8)); },
  updateMusic() {
    if (!this.ok || !this.music.on || !this.music.region) return; const c = this.ctx, M = this.music, R0 = M.region, t = c.currentTime;
    const mode = M.mode, bpm = mode === 'boss' ? 132 : mode === 'combat' ? 112 : mode === 'ending' ? R0.endBpm || 66 : 72, beat = 60 / bpm / 2;
    const dv = mode === 'silence' ? 0 : mode === 'boss' ? .05 : .035;
    this.drone.forEach((d, i) => { d.g.gain.setTargetAtTime(dv * (i === 2 ? .6 : 1), t, 1); d.f.frequency.setTargetAtTime(mode === 'boss' ? 900 : mode === 'combat' ? 600 : 260 + Math.sin(t * .1) * 80, t, 1); });
    if (M.next < t) M.next = t + .05;
    while (M.next < t + .2) {
      const st = M.step++, at = M.next, sc = R0.scale, root = R0.root, bar = Math.floor(st / 16), chord = R0.prog[bar % R0.prog.length];
      const note = (deg, oct) => root * Math.pow(2, (sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (oct + Math.floor(deg / sc.length))) / 12);
      if (mode !== 'silence') {
        // pad on bar start
        if (st % 16 === 0) [0, 2, 4].forEach(k => this.tone(note(chord + k, 1), beat * 15, 'sawtooth', .022, { delay: at - t, a: 1.2, filter: 700, verb: 1, bus: 'music' }));
        // arpeggio (sparser while exploring)
        const arpP = mode === 'explore' ? .35 : mode === 'ending' ? .5 : .85;
        if (st % 2 === 0 && hash1(st * 1.7 + bar) < arpP) { const deg = chord + [0, 2, 4, 6, 4, 2][Math.floor(hash1(st) * 6)]; this.tone(note(deg, 2), beat * 1.6, 'triangle', .035, { delay: at - t, dly: 1, bus: 'music' }); }
        if ((mode === 'combat' || mode === 'boss') && st % 4 === 0) { this.tone(note(chord, 0), beat * 3, 'square', .05, { delay: at - t, filter: 400, bus: 'music' }); }
        if (mode === 'boss' || mode === 'combat') {
          if (st % 8 === 0 || (mode === 'boss' && st % 8 === 6)) this.tone(110, .25, 'sine', .25, { delay: at - t, to: 40, bus: 'music' });
          if (st % 2 === 1) this.noiseHit(.04, 8000, .04, { delay: at - t, white: 1, type: 'highpass', bus: 'music' });
          if (st % 8 === 4) this.noiseHit(.18, 1800, .1, { delay: at - t, bus: 'music' });
        }
        if (mode === 'explore' && st % 64 === 32 && hash1(bar) < .4) this.motif(R0.root / 261.6 * 2, .03);
      }
      M.next += beat;
    }
  },
};
