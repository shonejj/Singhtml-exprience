<script>
'use strict';
/* =====================================================================
   THE LAST FREQUENCY — single-file browser game
   Architecture: WebGL2 low-res pixel pipeline + fixed-step simulation.
   Sections: CORE · SETTINGS · SAVE · INPUT · RENDERER · AUDIO · WORLD ·
   CHARACTERS · PHYSICS · PLAYER · CAMERA · ENEMIES · COMBAT · PARTICLES ·
   STORY DATA · QUESTS · PUZZLES · SCANNER · UI · CINEMATICS · LOOP
   ===================================================================== */
const VERSION = '1.0.0', SAVE_VERSION = 3;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sat = v => clamp(v, 0, 1);
const smooth = t => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const lerpAng = (a, b, t) => a + angDiff(a, b) * t;
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function hash1(n) { const s = Math.sin(n * 91.345 + 47.2) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), fx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += vnoise(x * f, y * f) * a; f *= 2.03; a *= .5; } return s; }
function ridge(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)) * a; f *= 2.1; a *= .5; } return s; }
// seeded RNG (mulberry32) — deterministic world generation
function RNG(seed) { let a = seed >>> 0; const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.range = (a, b) => a + f() * (b - a); f.int = (a, b) => Math.floor(a + f() * (b - a + 1)); f.pick = arr => arr[Math.floor(f() * arr.length)]; f.chance = p => f() < p; return f; }
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scalec = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/* ---------- MATH: column-major mat4 ---------- */
const M4 = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(o, a, b) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
  persp(o, fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  ortho(o, l, r, b, t, n, f) { o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
  look(o, e, c, up) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1; return o;
  },
  inv(o, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return o; d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d; return o;
  },
  xform(m, x, y, z) { const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w]; },
};
/* affine 3x4 transforms (row-major rows r0,r1,r2) used for instances & skeleton */
const A34 = {
  id() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]); },
  // build from translation, yaw(Y), pitch(X), roll(Z), scale
  trs(o, tx, ty, tz, ry, rx, rz, sx, sy, sz) {
    const cy = Math.cos(ry), sy_ = Math.sin(ry), cx = Math.cos(rx), sx_ = Math.sin(rx), cz = Math.cos(rz), sz_ = Math.sin(rz);
    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy_ * sx_ * sz_, r01 = -cy * sz_ + sy_ * sx_ * cz, r02 = sy_ * cx;
    const r10 = cx * sz_, r11 = cx * cz, r12 = -sx_;
    const r20 = -sy_ * cz + cy * sx_ * sz_, r21 = sy_ * sz_ + cy * sx_ * cz, r22 = cy * cx;
    o[0] = r00 * sx; o[1] = r01 * sy; o[2] = r02 * sz; o[3] = tx;
    o[4] = r10 * sx; o[5] = r11 * sy; o[6] = r12 * sz; o[7] = ty;
    o[8] = r20 * sx; o[9] = r21 * sy; o[10] = r22 * sz; o[11] = tz; return o;
  },
  mul(o, a, b) {
    const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
    const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
    o[0] = a0 * b0 + a1 * b4 + a2 * b8; o[1] = a0 * b1 + a1 * b5 + a2 * b9; o[2] = a0 * b2 + a1 * b6 + a2 * b10; o[3] = a0 * b3 + a1 * b7 + a2 * b11 + a3;
    o[4] = a4 * b0 + a5 * b4 + a6 * b8; o[5] = a4 * b1 + a5 * b5 + a6 * b9; o[6] = a4 * b2 + a5 * b6 + a6 * b10; o[7] = a4 * b3 + a5 * b7 + a6 * b11 + a7;
    o[8] = a8 * b0 + a9 * b4 + a10 * b8; o[9] = a8 * b1 + a9 * b5 + a10 * b9; o[10] = a8 * b2 + a9 * b6 + a10 * b10; o[11] = a8 * b3 + a9 * b7 + a10 * b11 + a11; return o;
  },
  pt(m, x, y, z) { return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]; },
};

/* ---------- SETTINGS (persisted) ---------- */
const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', jump: 'Space', crouch: 'ControlLeft', interact: 'KeyE', scan: 'KeyQ',
  reload: 'KeyR', dodge: 'AltLeft', burst: 'KeyF', melee: 'KeyV', lock: 'KeyT', lamp: 'KeyL', camera: 'KeyC', inventory: 'Tab', map: 'KeyM', journal: 'KeyJ', pause: 'Escape',
  w1: 'Digit1', w2: 'Digit2', w3: 'Digit3', rotl: 'KeyZ', rotr: 'KeyX' };
const KEY_LABELS = { up: 'Move forward', down: 'Move back', left: 'Move left', right: 'Move right', sprint: 'Sprint', jump: 'Jump / mantle', crouch: 'Crouch / stealth', interact: 'Interact', scan: 'Frequency scanner',
  reload: 'Vent heat (reload)', dodge: 'Dodge roll', burst: 'Resonance burst', melee: 'Melee strike', lock: 'Lock-on', lamp: 'Headlamp', camera: 'Cycle camera', inventory: 'Inventory', map: 'Map', journal: 'Journal', pause: 'Pause',
  w1: 'Weapon 1', w2: 'Weapon 2', w3: 'Weapon 3', rotl: 'Rotate camera left', rotr: 'Rotate camera right' };
const DEFAULT_SETTINGS = {
  quality: 'auto', pixelH: 0, dynRes: true, shadows: 2, reflections: 2, ssao: 1, particles: 2, vegetation: 2, drawDist: 2, post: 2, fog: 2, lighting: 2, edges: 1, fpsCap: 60, advanced: false, steppedWind: true, grain: 0.5, chroma: 1,
  master: .8, music: .6, sfx: .8, ambient: .7, dialogue: .9, radio: .7, dynRange: 1,
  sens: 1, invertY: false, invertX: false, camDist: 1, shake: 1, autoCam: true, aimAssist: .6, interactAssist: true, subtitles: true, tutorial: true, difficulty: 'normal',
  subSize: 18, subBg: true, uiScale: 1, contrast: false, colorblind: false, reducedMotion: false, audioCues: true, puzzleHints: false, toggleSprint: false, toggleCrouch: true,
  touchSize: 1, touchOpacity: .8, leftHanded: false, showFps: false, keys: { ...DEFAULT_KEYS }, seenIntro: false,
};
const Settings = {
  v: null,
  load() {
    let s = {}; try { s = JSON.parse(localStorage.getItem('tlf_settings') || '{}'); } catch (e) { }
    this.v = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), s); this.v.keys = Object.assign({ ...DEFAULT_KEYS }, s.keys || {});
    if (matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && s.reducedMotion === undefined) this.v.reducedMotion = true;
    this.apply();
  },
  save() { try { localStorage.setItem('tlf_settings', JSON.stringify(this.v)); } catch (e) { } this.apply(); },
  apply() {
    const v = this.v, b = document.body;
    b.classList.toggle('hc', v.contrast); b.classList.toggle('cb', v.colorblind); b.classList.toggle('reduced', v.reducedMotion); b.classList.toggle('lefty', v.leftHanded);
    document.documentElement.style.setProperty('--ui', v.uiScale); document.documentElement.style.setProperty('--subsize', v.subSize + 'px');
    document.documentElement.style.setProperty('--ts', v.touchSize); document.documentElement.style.setProperty('--to', v.touchOpacity);
    $('subs').className = 'layer' + (v.subBg ? ' bg' : ''); $('perf').style.display = v.showFps ? 'block' : 'none';
    if (window.Audio2) Audio2.applyVolumes(); if (window.R && R.gl) R.applyQuality();
  },
};
const QUALITY = {
  low: { pixelH: 180, shadows: 0, reflections: 0, ssao: 0, particles: 0, vegetation: 0, drawDist: 0, post: 0, fog: 1, lighting: 0 },
  medium: { pixelH: 220, shadows: 1, reflections: 1, ssao: 0, particles: 1, vegetation: 1, drawDist: 1, post: 1, fog: 2, lighting: 1 },
  high: { pixelH: 270, shadows: 2, reflections: 2, ssao: 1, particles: 2, vegetation: 2, drawDist: 2, post: 2, fog: 2, lighting: 2 },
  ultra: { pixelH: 320, shadows: 3, reflections: 3, ssao: 1, particles: 3, vegetation: 3, drawDist: 3, post: 3, fog: 2, lighting: 2 },
};

/* ---------- SAVE SYSTEM: versioned, checksummed, with backups ---------- */
const Save = {
  ok: true, err: '',
  test() { try { localStorage.setItem('tlf_test', '1'); localStorage.removeItem('tlf_test'); this.ok = true; } catch (e) { this.ok = false; this.err = 'Browser storage is unavailable (private mode or disabled). Progress cannot be saved this session.'; } return this.ok; },
  sum(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); },
  key(slot) { return 'tlf_save_' + slot; },
  write(slot, data) {
    if (!this.ok) return { ok: false, err: this.err };
    try {
      data.version = SAVE_VERSION; data.time = Date.now();
      const body = JSON.stringify(data), rec = JSON.stringify({ v: SAVE_VERSION, sum: this.sum(body), body });
      const prev = localStorage.getItem(this.key(slot)); if (prev) localStorage.setItem(this.key(slot) + '_bak', prev); // keep previous as backup
      localStorage.setItem(this.key(slot), rec); return { ok: true };
    } catch (e) { return { ok: false, err: 'Save failed: storage is full or blocked (' + e.name + ').' }; }
  },
  parse(raw) { if (!raw) return null; try { const r = JSON.parse(raw); if (this.sum(r.body) !== r.sum) return null; const d = JSON.parse(r.body); return this.migrate(d); } catch (e) { return null; } },
  read(slot) {
    if (!this.ok) return null;
    const main = this.parse(localStorage.getItem(this.key(slot))); if (main) return main;
    const bak = this.parse(localStorage.getItem(this.key(slot) + '_bak')); if (bak) { bak._recovered = true; return bak; } return null;
  },
  exists(slot) { return this.ok && !!localStorage.getItem(this.key(slot)); },
  del(slot) { try { localStorage.removeItem(this.key(slot)); localStorage.removeItem(this.key(slot) + '_bak'); } catch (e) { } },
  migrate(d) { if (!d.version || d.version < 2) { d.flags = d.flags || {}; d.collect = d.collect || {}; } if (d.version < 3) { d.endings = d.endings || []; d.secrets = d.secrets || []; } return d; },
  latest() { let best = null, bs = null; for (const s of ['auto', 1, 2, 3]) { const d = this.read(s); if (d && (!best || d.time > best.time)) { best = d; bs = s; } } return best ? { slot: bs, data: best } : null; },
  global() { try { return JSON.parse(localStorage.getItem('tlf_global') || '{}'); } catch (e) { return {}; } },
  setGlobal(g) { try { localStorage.setItem('tlf_global', JSON.stringify(g)); } catch (e) { } },
};

/* ---------- INPUT: keyboard/mouse, gamepad, touch → unified actions ---------- */
const Input = {
  down: new Set(), pressed: new Set(), mouse: { dx: 0, dy: 0, x: 0, y: 0, l: false, r: false, m: false, wheel: 0 }, locked: false,
  move: [0, 0], look: [0, 0], device: 'kb', pad: null, padPrev: [], touch: { stick: null, sx: 0, sy: 0, mx: 0, my: 0, cam: null, held: new Set(), toggles: new Set(), pinch: 0 },
  togg: { sprint: false, crouch: false }, rebinding: null, onAny: null,
  init() {
    addEventListener('keydown', e => {
      if (this.rebinding) { e.preventDefault(); const a = this.rebinding; this.rebinding = null; if (e.code !== 'Escape') { Settings.v.keys[a.action] = e.code; Settings.save(); } a.done(); return; }
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'AltLeft' || e.code === 'ControlLeft') e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code); this.down.add(e.code); this.device = 'kb'; if (this.onAny) this.onAny(e);
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.mouse.l = this.mouse.r = false; });
    const c = $('gl');
    c.addEventListener('mousedown', e => { this.device = 'kb'; if (e.button === 0) this.mouse.l = true; if (e.button === 2) this.mouse.r = true; if (e.button === 1) { this.mouse.m = true; this.pressed.add('Mouse1'); } this.pressed.add('Mouse' + e.button);
      if (window.Game && Game.state === 'play' && Cam.wantsLock() && !this.locked && c.requestPointerLock) { try { c.requestPointerLock(); } catch (er) { } } });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouse.l = false; if (e.button === 2) this.mouse.r = false; if (e.button === 1) this.mouse.m = false; });
    addEventListener('mousemove', e => { if (this.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    c.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('wheel', e => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === c; });
    addEventListener('gamepadconnected', () => { this.device = 'pad'; UI && UI.toast && UI.toast('Controller connected'); });
    this.initTouch();
  },
  unlock() { if (document.exitPointerLock && this.locked) document.exitPointerLock(); },
  key(a) { return this.down.has(Settings.v.keys[a]); },
  hit(a) { return this.pressed.has(Settings.v.keys[a]); },
  initTouch() {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.isTouch = isTouch;
    const st = $('tstick'), cam = $('tcam'), T = this.touch;
    const stickUpd = (t) => { const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } T.sx = dx; T.sy = dy; st.firstElementChild.style.transform = `translate(${dx * 60}%,${dy * 60}%)`; };
    st.addEventListener('touchstart', e => { e.preventDefault(); this.device = 'touch'; T.stick = e.changedTouches[0].identifier; stickUpd(e.changedTouches[0]); }, { passive: false });
    st.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === T.stick) stickUpd(t); }, { passive: false });
    const endStick = e => { for (const t of e.changedTouches) if (t.identifier === T.stick) { T.stick = null; T.sx = T.sy = 0; st.firstElementChild.style.transform = ''; } };
    st.addEventListener('touchend', endStick); st.addEventListener('touchcancel', endStick);
    const camT = new Map();
    cam.addEventListener('touchstart', e => { e.preventDefault(); this.device = 'touch'; for (const t of e.changedTouches) camT.set(t.identifier, [t.clientX, t.clientY]); if (camT.size === 2) { const p = [...camT.values()]; T.pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); } }, { passive: false });
    cam.addEventListener('touchmove', e => { e.preventDefault();
      if (camT.size >= 2) { for (const t of e.changedTouches) camT.set(t.identifier, [t.clientX, t.clientY]); const p = [...camT.values()]; const d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); this.mouse.wheel += (T.pinch - d) * .02; T.pinch = d; return; }
      for (const t of e.changedTouches) { const p = camT.get(t.identifier); if (p) { T.mx += (t.clientX - p[0]); T.my += (t.clientY - p[1]); camT.set(t.identifier, [t.clientX, t.clientY]); } } }, { passive: false });
    const camEnd = e => { for (const t of e.changedTouches) camT.delete(t.identifier); };
    cam.addEventListener('touchend', camEnd); cam.addEventListener('touchcancel', camEnd);
    document.querySelectorAll('#touch .tb').forEach(b => {
      const a = b.dataset.a;
      b.addEventListener('touchstart', e => { e.preventDefault(); this.device = 'touch'; if (b.dataset.toggle) { if (T.toggles.has(a)) T.toggles.delete(a); else T.toggles.add(a); b.classList.toggle('act', T.toggles.has(a)); } else { T.held.add(a); b.classList.add('act'); } this.pressed.add('T_' + a); if (navigator.vibrate && Settings.v.shake > 0) try { navigator.vibrate(8); } catch (er) { } }, { passive: false });
      const end = e => { e.preventDefault(); if (!b.dataset.toggle) { T.held.delete(a); b.classList.remove('act'); } };
      b.addEventListener('touchend', end, { passive: false }); b.addEventListener('touchcancel', end, { passive: false });
    });
    document.addEventListener('gesturestart', e => e.preventDefault());
    addEventListener('touchstart', () => { this.device = 'touch'; }, { passive: true, capture: true });
    addEventListener('touchmove', e => { if (window.Game && Game.state === 'play') e.preventDefault(); }, { passive: false });
  },
  // gamepad (standard mapping)
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let p = null; for (const g of pads) if (g && g.connected) { p = g; break; }
    this.pad = p; if (!p) return;
    const b = i => p.buttons[i] && p.buttons[i].pressed, prev = this.padPrev;
    const now = p.buttons.map(x => x.pressed);
    for (let i = 0; i < now.length; i++) if (now[i] && !prev[i]) { this.pressed.add('Pad' + i); this.device = 'pad'; }
    this.padPrev = now;
    const dz = v => Math.abs(v) < .18 ? 0 : (v - Math.sign(v) * .18) / .82;
    if (Math.abs(p.axes[0]) > .3 || Math.abs(p.axes[1]) > .3 || Math.abs(p.axes[2]) > .3) this.device = 'pad';
    this.padAxes = [dz(p.axes[0] || 0), dz(p.axes[1] || 0), dz(p.axes[2] || 0), dz(p.axes[3] || 0)];
    this.padBtn = b;
  },
  rumble(s, d) { try { const p = this.pad; if (p && p.vibrationActuator && Settings.v.shake > 0) p.vibrationActuator.playEffect('dual-rumble', { duration: d, strongMagnitude: s, weakMagnitude: s * .6 }); } catch (e) { } },
  // unified action query
  act(a) {
    const T = this.touch, pb = this.padBtn, v = Settings.v;
    const padMap = { jump: 0, dodge: 1, interact: 2, reload: 2, burst: 3, sprint: 10, crouch: 11, lock: 11, scan: 4, fire: 7, aim: 6, melee: 5, pause: 9, inventory: 8 };
    switch (a) {
      case 'fire': return this.mouse.l && this.locked || this.mouse.l && !Cam.wantsLock() || T.held.has('fire') || (pb && pb(7));
      case 'aim': return this.mouse.r || (pb && pb(6));
      case 'sprint': if (v.toggleSprint && this.hit('sprint')) this.togg.sprint = !this.togg.sprint; return (v.toggleSprint ? this.togg.sprint : this.key('sprint')) || T.toggles.has('sprint') || (pb && pb(10));
      case 'crouch': return this.togg.crouch || T.toggles.has('crouch');
      case 'scan': return this.key('scan') || T.held.has('scan') || (pb && pb(4));
      default: return this.key(a) || T.held.has(a) || (pb && padMap[a] != null && pb(padMap[a]));
    }
  },
  tap(a) {
    const padMap = { jump: 0, dodge: 1, interact: 2, burst: 3, melee: 5, pause: 9, inventory: 8, map: 8, lock: 11, camera: 13, weapon: 15, lamp: 14, crouch: 12 };
    if (this.hit(a)) return true; if (this.pressed.has('T_' + a)) return true; if (padMap[a] != null && this.pressed.has('Pad' + padMap[a])) return true;
    if (a === 'lock' && this.pressed.has('Mouse1')) return true; if (a === 'weapon' && this.pressed.has('T_weapon')) return true;
    return false;
  },
  update() {
    this.pollPad(); const v = Settings.v;
    let mx = 0, my = 0; if (this.key('left')) mx -= 1; if (this.key('right')) mx += 1; if (this.key('up')) my -= 1; if (this.key('down')) my += 1;
    if (this.down.has('ArrowLeft')) mx -= 1; if (this.down.has('ArrowRight')) mx += 1; if (this.down.has('ArrowUp')) my -= 1; if (this.down.has('ArrowDown')) my += 1;
    if (this.touch.stick != null) { mx = this.touch.sx; my = this.touch.sy; }
    if (this.padAxes && (this.padAxes[0] || this.padAxes[1])) { mx = this.padAxes[0]; my = this.padAxes[1]; }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; } this.move[0] = mx; this.move[1] = my;
    if (this.hit('crouch') || this.pressed.has('Pad12') ) { if (v.toggleCrouch) this.togg.crouch = !this.togg.crouch; }
    if (!v.toggleCrouch) this.togg.crouch = this.key('crouch');
    let lx = this.mouse.dx * .0025, ly = this.mouse.dy * .0025; this.mouse.dx = this.mouse.dy = 0;
    lx += this.touch.mx * .006; ly += this.touch.my * .006; this.touch.mx = this.touch.my = 0;
    if (this.padAxes) { lx += this.padAxes[2] * .05; ly += this.padAxes[3] * .04; }
    lx *= v.sens * (v.invertX ? -1 : 1); ly *= v.sens * (v.invertY ? -1 : 1); this.look[0] = lx; this.look[1] = ly;
    const tOn = this.isTouch && Game.state === 'play' && this.device === 'touch'; $('touch').classList.toggle('on', tOn); document.body.classList.toggle('touchui', tOn);
  },
  endFrame() { this.pressed.clear(); this.mouse.wheel = 0; },
  glyph(a) {
    if (this.device === 'pad') return ({ interact: 'X', jump: 'A', dodge: 'B', burst: 'Y', scan: 'LB', melee: 'RB', fire: 'RT', aim: 'LT', pause: 'START', camera: '↓', lamp: '←', weapon: '→', lock: 'R3', crouch: '↑' })[a] || a;
    if (this.device === 'touch') return ({ interact: 'USE', scan: 'SCAN', jump: 'JUMP', fire: 'FIRE', burst: 'BURST' })[a] || a.toUpperCase();
    if (a === 'fire') return 'LMB'; if (a === 'aim') return 'RMB';
    const c = Settings.v.keys[a] || ''; return c.replace('Key', '').replace('Digit', '').replace('Left', '').replace('Right', '').replace('Space', 'SPACE').replace('Control', 'CTRL').replace('Escape', 'ESC');
  },
};
