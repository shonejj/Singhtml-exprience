
/* =====================================================================
   CHARACTERS — hierarchical box skeleton, procedural animation with
   blending + foot IK, customization data, scarf/cloth chains
   ===================================================================== */
const MPOOL = []; let mpi = 0; const mp = () => { if (mpi >= MPOOL.length) MPOOL.push(new Float32Array(12)); return MPOOL[mpi++]; };
const _L = new Float32Array(12), _W = new Float32Array(12);
function joint(parent, x, y, z, ry, rx, rz) { const m = A34.trs(mp(), x, y, z, ry, rx, rz, 1, 1, 1); return A34.mul(mp(), parent, m); }
function part(M, cx, cy, cz, sx, sy, sz, col, em = 0, flags = 0, mesh = 'cube') { A34.trs(_L, cx, cy, cz, 0, 0, 0, sx, sy, sz); A34.mul(_W, M, _L); R.inst(mesh, _W, col[0], col[1], col[2], em, flags); }
function partR(M, cx, cy, cz, ry, rx, rz, sx, sy, sz, col, em = 0, flags = 0, mesh = 'cube') { A34.trs(_L, cx, cy, cz, ry, rx, rz, sx, sy, sz); A34.mul(_W, M, _L); R.inst(mesh, _W, col[0], col[1], col[2], em, flags); }

const CUSTOM = {
  skin: ['#f1d2b6', '#e0b08e', '#c68a62', '#a0663f', '#7a4a2c', '#4f3020', '#b9c4cf', '#9fb39a'],
  hairCol: ['#1c1a1a', '#4a3020', '#8a5a2a', '#d8b070', '#e8e4dc', '#a83a2a', '#3a6a8a', '#7a3a8a', '#4a8a5a'],
  eyes: ['#3a2a1a', '#3a6a9a', '#4a8a4a', '#8a8a8a', '#c08a2a', '#7ff3ff'],
  cloth: ['#c8752a', '#3f6f73', '#5a6a3a', '#3a3f4f', '#8a2f2f', '#d9d2c0', '#2a2a2e', '#6a4a8a', '#c9a640', '#4a7ac0'],
  hair: ['Shaved', 'Crop', 'Long', 'Ponytail', 'Mohawk', 'Bun', 'Curls'],
  face: ['Clean', 'Scar', 'Markings', 'Beard', 'Freckles'],
  jacket: ['Field jacket', 'Long coat', 'Vest', 'Sealed suit'],
  pattern: ['Plain', 'Stripe', 'Chevron', 'Split'],
  boots: ['Field boots', 'High boots', 'Light shoes'],
  gloves: ['None', 'Work gloves', 'Gauntlets'],
  pack: ['None', 'Field pack', 'Radio pack', 'Sling bag'],
  helmet: ['None', 'Visor band', 'Hood', 'Sealed helmet', 'Goggles'],
  accessory: ['None', 'Scarf', 'Shoulder lamp', 'Pendant', 'Tool belt'],
  body: ['Slim', 'Neutral', 'Broad'],
  emblem: ['Circle', 'Wave', 'Triangle', 'Eye', 'Star'],
  presentation: ['Neutral', 'Feminine', 'Masculine'],
};
const DEFAULT_LOOK = { presentation: 0, body: 1, skin: 2, hair: 1, hairCol: 1, eyes: 1, face: 0, jacket: 0, jacketCol: 0, pattern: 1, accent: 6, trousers: 3, boots: 0, bootCol: 6, gloves: 1, gloveCol: 6, pack: 1, helmet: 0, accessory: 1, accCol: 4, emblem: 1, emblemCol: 5 };
const UNLOCKABLE = { jacket: { 3: 'ch4' }, helmet: { 3: 'ch5' }, pattern: { 2: 'ch3' }, accessory: { 2: 'ch2' }, cloth: {} };
const lookCols = (L) => ({ skin: hex(CUSTOM.skin[L.skin]), hair: hex(CUSTOM.hairCol[L.hairCol]), eyes: hex(CUSTOM.eyes[L.eyes]), jacket: hex(CUSTOM.cloth[L.jacketCol]), accent: hex(CUSTOM.cloth[L.accent]),
  trousers: hex(CUSTOM.cloth[L.trousers]), boots: scalec(hex(CUSTOM.cloth[L.bootCol]), .7), gloves: scalec(hex(CUSTOM.cloth[L.gloveCol]), .8), acc: hex(CUSTOM.cloth[L.accCol]), emblem: hex(CUSTOM.cloth[L.emblemCol]) });

/* ---- NPC looks ---- */
const NPC_LOOKS = {
  mara: { presentation: 1, body: 1, skin: 3, hair: 3, hairCol: 5, eyes: 0, face: 4, jacket: 3, jacketCol: 0, pattern: 3, accent: 3, trousers: 0, boots: 0, bootCol: 6, gloves: 2, gloveCol: 3, pack: 3, helmet: 4, accessory: 4, accCol: 8, emblem: 2, emblemCol: 5 },
  elias: { presentation: 2, body: 1, skin: 1, hair: 6, hairCol: 4, eyes: 3, face: 3, jacket: 1, jacketCol: 5, pattern: 0, accent: 1, trousers: 3, boots: 2, bootCol: 6, gloves: 0, gloveCol: 6, pack: 3, helmet: 0, accessory: 3, accCol: 8, emblem: 3, emblemCol: 1 },
  nova: { presentation: 1, body: 0, skin: 4, hair: 2, hairCol: 0, eyes: 2, face: 2, jacket: 2, jacketCol: 2, pattern: 2, accent: 6, trousers: 2, boots: 1, bootCol: 6, gloves: 1, gloveCol: 6, pack: 1, helmet: 2, accessory: 1, accCol: 2, emblem: 4, emblemCol: 8 },
  orin: { presentation: 0, body: 2, skin: 6, hair: 0, hairCol: 0, eyes: 5, face: 0, jacket: 3, jacketCol: 3, pattern: 1, accent: 1, trousers: 3, boots: 0, bootCol: 6, gloves: 2, gloveCol: 3, pack: 2, helmet: 3, accessory: 0, accCol: 1, emblem: 1, emblemCol: 1 },
  vael: { presentation: 0, body: 0, skin: 7, hair: 0, hairCol: 0, eyes: 5, face: 2, jacket: 1, jacketCol: 5, pattern: 0, accent: 9, trousers: 5, boots: 2, bootCol: 5, gloves: 0, gloveCol: 5, pack: 0, helmet: 0, accessory: 3, accCol: 9, emblem: 3, emblemCol: 9 },
};

/* ---- animation: target pose from state, blended toward each frame ---- */
function newPose() { return { hipY: 0, hipX: 0, pitch: 0, roll: 0, twist: 0, hy: 0, hp: 0, lsp: 0, lsr: .1, le: .1, rsp: 0, rsr: -.1, re: .1, lh: 0, lk: 0, rh: 0, rk: 0, la: 0, ra: 0, lhr: 0, rhr: 0, rollSpin: 0, crouch: 0, scale: 1, plant: 0, slopeY: 0 }; }
const Anim = {
  target(ch, dt) {
    const T = newPose(), s = ch.anim, t = s.t;
    const sp = clamp(ch.speed / 6.5, 0, 1.2); const moving = ch.speed > .25;
    // idle — breathing + weight shift variations
    const br = Math.sin(t * 1.8) * .012; T.hipY = br; T.lsr = .12 + br * 2; T.rsr = -.12 - br * 2; T.le = .15; T.re = .15; T.hp = Math.sin(t * .7) * .04;
    if (s.idleVar === 1) { T.hipX = Math.sin(t * .5) * .03; T.roll = Math.sin(t * .5) * .04; T.hy = Math.sin(t * .4) * .4; }
    if (s.idleVar === 2) { T.hy = Math.sin(t * .9) * .6; T.hp = .1; }
    if (moving && ch.onGround) {
      const ph = s.phase, A = lerp(.45, 1.05, sat(sp * 1.2)), knee = lerp(.5, 1.4, sat(sp));
      T.lh = Math.sin(ph) * A; T.rh = -Math.sin(ph) * A;
      T.lk = Math.max(0, -Math.cos(ph)) * knee + .1; T.rk = Math.max(0, Math.cos(ph)) * knee + .1;
      T.la = -T.lh * .3; T.ra = -T.rh * .3;
      // contralateral swing: the arm moves opposite to the same-side leg
      T.lsp = Math.sin(ph) * A * .55; T.rsp = -Math.sin(ph) * A * .55; T.le = .35 + sp * .55; T.re = .35 + sp * .55;
      T.pitch = .04 + sp * .12 + (s.accel || 0) * .05; T.twist = -Math.sin(ph) * .08 * sp; T.roll = (s.turn || 0) * .2 * sp;
    }
    if (ch.crouch) { T.crouch = 1; T.hipY -= .32; T.lh += -.9; T.rh += -.9; T.lk += 1.5; T.rk += 1.5; T.la += .6; T.ra += .6; T.pitch += .35; T.lsp -= .3; T.rsp -= .3; }
    if (!ch.onGround && !ch.climbing && (s.airT > .12 || ch.vy < -2 || ch.vy > 2)) { const up = ch.vy > 0; T.lh = up ? -.9 : -.3; T.lk = up ? 1.3 : .4; T.rh = up ? .3 : .2; T.rk = up ? .4 : .7; T.lsp = -1.6 - (up ? .4 : 0); T.rsp = -1.6; T.lsr = .5; T.rsr = -.5; T.le = .5; T.re = .5; T.pitch = up ? -.1 : .15; }
    if (s.land > 0) { const k = s.land / .25; T.hipY -= .22 * k; T.lk += 1 * k; T.rk += 1 * k; T.lh -= .5 * k; T.rh -= .5 * k; T.pitch += .3 * k; }
    if (ch.climbing) { const ph = s.phase; T.lsp = -2.6 + Math.sin(ph) * .4; T.rsp = -2.6 - Math.sin(ph) * .4; T.le = .6; T.re = .6; T.lh = -.6 + Math.sin(ph) * .5; T.rh = -.6 - Math.sin(ph) * .5; T.lk = 1.2; T.rk = 1.2; T.pitch = -.05; }
    if (s.mantle > 0) { const k = s.mantle; T.lsp = -2.4; T.rsp = -2.4; T.le = .3 + k; T.re = .3 + k; T.lh = -1.4 * k; T.lk = 1.8 * k; T.pitch = .5 * k; }
    if (s.roll > 0) { T.rollSpin = (1 - s.roll / s.rollMax) * TAU; T.crouch = 1; T.hipY -= .45; T.lh = -1.6; T.rh = -1.6; T.lk = 2.2; T.rk = 2.2; T.lsp = -1.2; T.rsp = -1.2; T.le = 1.6; T.re = 1.6; T.pitch = .6; }
    if (s.aim > 0) { const k = s.aim; T.rsp = lerp(T.rsp, -1.5 + (s.aimPitch || 0), k); T.rsr = lerp(T.rsr, -.1, k); T.re = lerp(T.re, .15, k); T.lsp = lerp(T.lsp, -1.3 + (s.aimPitch || 0), k); T.lsr = lerp(T.lsr, .6, k); T.le = lerp(T.le, .9, k); T.twist = lerp(T.twist, -.25, k); T.hp = lerp(T.hp, -(s.aimPitch || 0) * .5, k); }
    if (s.fire > 0) { T.rsp -= s.fire * .5; T.pitch -= s.fire * .08; }
    if (s.reload > 0) { const k = Math.sin(s.reload * 6); T.lsp = -1 + k * .3; T.le = 1.8; T.rsp = -.8; T.re = 1.2; T.hp = .35; }
    if (s.melee > 0) { const k = 1 - s.melee / .35; T.rsp = lerp(-2.6, .4, smooth(k)); T.rsr = lerp(-.8, .3, k); T.re = .2; T.twist = lerp(.5, -.6, k); T.pitch += .15; }
    if (s.burst > 0) { const k = s.burst; T.lsp = -1.6 * k; T.rsp = -1.6 * k; T.lsr = 1.2 * k; T.rsr = -1.2 * k; T.le = .1; T.re = .1; T.pitch -= .2 * k; T.hp = -.3 * k; }
    if (s.scan > 0) { T.lsp = -1.2 * s.scan; T.le = 1.5 * s.scan; T.lsr = .2; T.hp = .25 * s.scan; T.hy = Math.sin(t * 1.3) * .4 * s.scan; }
    if (s.interact > 0) { T.rsp = -1.2; T.re = .6; T.pitch += .2; T.hp = .3; }
    if (s.talk > 0) { const g = Math.sin(t * 3.1) * .3; T.rsp = -.6 + g; T.re = 1.1 + g; T.lsp = -.2 - g * .5; T.hy = Math.sin(t * 1.3) * .2; }
    if (s.hurt > 0) { const k = s.hurt / .3; T.pitch -= .45 * k; T.hp -= .4 * k; T.lsp -= .6 * k; T.rsp -= .6 * k; T.hipY -= .05 * k; T.roll += (s.hurtDir || 1) * .2 * k; }
    if (s.dead) { T.hipY = -.75; T.pitch = 1.4; T.lh = -1.4; T.rh = -1.2; T.lk = 1.9; T.rk = 2; T.lsp = .3; T.rsp = .5; T.hp = .6; }
    if (s.victory > 0) { T.rsp = -2.9; T.re = .1; T.lsp = -.4; T.hp = -.2; }
    if (s.sit > 0) { T.hipY = -.5; T.lh = -1.5; T.rh = -1.5; T.lk = 1.5; T.rk = 1.5; T.pitch = .1; T.lsp = -.6; T.rsp = -.6; T.le = 1; T.re = 1; T.hp = .2; }
    if (s.kneel > 0) { T.hipY = -.45; T.lh = -1.4; T.lk = 1.6; T.rh = .1; T.rk = 2.2; T.ra = -.6; T.rsp = -1.1; T.re = .8; T.pitch = .4; T.hp = .5; }
    T.plant = ch.onGround && !ch.climbing && !s.dead && !(s.roll > 0) && !(s.mantle > 0) && !(s.sit > 0) && !(s.kneel > 0) && !(!ch.onGround) ? 1 : 0;
    return T;
  },
  update(ch, dt) {
    const s = ch.anim; s.t += dt; s.airT = ch.onGround || ch.climbing ? 0 : (s.airT || 0) + dt;
    // gait phase advances with distance travelled → feet don't slide
    const stride = ch.crouch ? .55 : lerp(.75, 1.25, sat(ch.speed / 6.5));
    const prev = s.phase; if (ch.speed > .25 && ch.onGround) s.phase += ch.speed * dt / stride * Math.PI; else if (ch.climbing) s.phase += ch.climbSpeed * dt * 4;
    if (ch.onStep && Math.floor(prev / Math.PI) !== Math.floor(s.phase / Math.PI)) ch.onStep(Math.floor(s.phase / Math.PI) & 1);
    for (const k of ['land', 'roll', 'fire', 'reload', 'melee', 'hurt', 'interact', 'mantleT']) if (s[k] > 0) s[k] = Math.max(0, s[k] - dt);
    if (s.idleT === undefined) s.idleT = 0; s.idleT += dt; if (s.idleT > 6) { s.idleT = 0; s.idleVar = (Math.random() * 3) | 0; }
    const T = this.target(ch, dt); const P = ch.pose, k = 1 - Math.exp(-dt * (s.roll > 0 ? 30 : 14));
    for (const key in T) P[key] = key === 'rollSpin' ? T[key] : lerp(P[key], T[key], k);
    // foot IK: sample ground under each foot and adapt pelvis/knees
    if (ch.onGround && !ch.climbing && World.hf) {
      const c = Math.cos(ch.yaw), sn = Math.sin(ch.yaw), w = .12;
      const gl = World.ground(ch.x - c * w, ch.z + sn * w, ch.y + .4).h, gr = World.ground(ch.x + c * w, ch.z - sn * w, ch.y + .4).h;
      const dl = clamp(gl - ch.y, -.35, .35), dr = clamp(gr - ch.y, -.35, .35);
      P.slopeY = Math.min(dl, dr, 0) * .9; P.lk += Math.max(0, dl - Math.min(dl, dr)) * 2.2; P.rk += Math.max(0, dr - Math.min(dl, dr)) * 2.2; P.lh -= Math.max(0, dl - Math.min(dl, dr)) * 1.1; P.rh -= Math.max(0, dr - Math.min(dl, dr)) * 1.1;
    }
  },
};
function makeChar(look, o = {}) {
  return Object.assign({ x: 0, y: 0, z: 0, yaw: 0, speed: 0, vy: 0, onGround: true, crouch: false, climbing: false, climbSpeed: 0, look, cols: lookCols(look), pose: newPose(),
    anim: { t: Math.random() * 10, phase: 0, land: 0, roll: 0, rollMax: .5, fire: 0, aim: 0, reload: 0, melee: 0, burst: 0, scan: 0, interact: 0, talk: 0, hurt: 0, dead: false, victory: 0, mantle: 0, idleVar: 0, sit: 0, kneel: 0 },
    scarf: null, flash: 0, alpha: 1 }, o);
}
/* ---- draw a humanoid from its pose ---- */
function drawHumanoid(ch, opts = {}) {
  const L = ch.look, C = ch.cols, P = ch.pose; const flags = (opts.flags || 0) | (opts.echo ? F_ECHO : 0);
  const bw = [.88, 1, 1.14][L.body], fem = L.presentation === 1, masc = L.presentation === 2;
  const fl = ch.flash > 0 ? .9 : 0; const em = (c) => fl; const tint = c => ch.flash > 0 ? mixc(c, [1, 1, 1], .7) : c;
  const sc = P.scale || 1;
  const root = A34.trs(mp(), ch.x, ch.y, ch.z, ch.yaw, 0, 0, sc, sc, sc);
  // foot planting: put the lowest foot sole exactly on the ground (legs: thigh .42, shank .42, hip offset .05, foot sole .07)
  const ext = (h, k) => .05 + .42 * Math.cos(h) + .42 * Math.cos(k - h) + .07;
  const Emax = Math.max(ext(P.lh, P.lk), ext(P.rh, P.rk));
  const hipH = lerp(.93 + P.hipY, Emax + (P.slopeY || 0), P.plant);
  let pelvis = joint(root, P.hipX, hipH, 0, P.twist * .3, 0, P.roll * .5);
  if (P.rollSpin) pelvis = joint(pelvis, 0, -.1, 0, 0, P.rollSpin, 0);
  const jc = tint(C.jacket), tc = tint(C.trousers), ac = tint(C.accent), bc = tint(C.boots), sk = tint(C.skin), gc = L.gloves ? tint(C.gloves) : sk;
  part(pelvis, 0, 0, 0, .36 * bw, .2, .24, tc, fl, flags);
  // legs
  for (const side of [-1, 1]) {
    const h = side < 0 ? P.lh : P.rh, k = side < 0 ? P.lk : P.rk, a = side < 0 ? P.la : P.ra;
    const th = joint(pelvis, side * .1 * bw, -.05, 0, 0, -h, side * .03);
    part(th, 0, -.21, 0, .15 * bw, .44, .17, tc, fl, flags);
    const sh = joint(th, 0, -.42, 0, 0, k, 0);
    part(sh, 0, -.2, 0, .13 * bw, .42, .14, L.boots === 1 ? bc : tc, fl, flags);
    if (L.boots !== 1) part(sh, 0, -.33, 0, .14 * bw, .14, .15, bc, fl, flags);
    const ft = joint(sh, 0, -.42, 0, 0, -k + h + a - .0, 0);
    part(ft, 0, -.03, .06, .13 * bw, .08, .27, L.boots === 2 ? tint([.85, .85, .8]) : bc, fl, flags);
  }
  // torso
  const torso = joint(pelvis, 0, .08, 0, P.twist, P.pitch, P.roll * .3);
  const tw = (fem ? .4 : masc ? .46 : .43) * bw;
  part(torso, 0, .3, 0, tw, .52, .25, jc, fl, flags);
  if (L.pattern === 1) part(torso, 0, .36, .002, tw + .01, .08, .255, ac, fl, flags);
  if (L.pattern === 2) { partR(torso, -.08, .3, .128, 0, 0, .6, .05, .3, .01, ac, fl, flags); partR(torso, .08, .3, .128, 0, 0, -.6, .05, .3, .01, ac, fl, flags); }
  if (L.pattern === 3) part(torso, tw * .25, .3, .002, tw * .5 + .01, .53, .255, ac, fl, flags);
  if (L.jacket === 1) { const sway = (ch.coatSway || 0); partR(torso, 0, -.2, .02, 0, .1 + sway, 0, tw + .02, .55, .27, jc, fl, flags); }
  if (L.jacket === 2) part(torso, 0, .32, 0, tw + .03, .4, .27, ac, fl, flags);
  if (L.jacket === 3) { part(torso, 0, .5, 0, tw + .04, .1, .28, ac, fl, flags); part(torso, 0, .05, 0, tw + .02, .06, .27, tint([.15, .15, .17]), fl, flags); }
  if (L.accessory === 4) part(torso, 0, .02, 0, tw + .04, .07, .29, tint([.35, .25, .15]), fl, flags);
  // emblem on chest
  part(torso, -tw * .25, .42, .13, .07, .07, .01, tint(C.emblem), .4 + fl, flags);
  // pack
  if (L.pack === 1) { part(torso, 0, .3, -.2, tw * .8, .42, .16, tint([.3, .28, .22]), fl, flags); part(torso, 0, .08, -.24, tw * .7, .12, .12, ac, fl, flags); }
  if (L.pack === 2) { part(torso, 0, .3, -.2, tw * .7, .45, .15, tint([.25, .26, .28]), fl, flags); partR(torso, .1, .75, -.24, 0, 0, .1, .025, .55, .025, tint([.4, .4, .42]), fl, flags); part(torso, .12, 1.03, -.24, .05, .05, .05, [1, .2, .2], .9, flags); }
  if (L.pack === 3) { partR(torso, 0, .25, .14, 0, 0, .8, .05, .62, .02, tint([.3, .22, .15]), fl, flags); part(torso, .18, .02, .02, .14, .18, .2, tint([.35, .27, .18]), fl, flags); }
  if (L.accessory === 2) { part(torso, -tw * .5, .55, .05, .08, .08, .1, tint([.8, .8, .75]), .9, flags); }
  if (L.accessory === 3) part(torso, 0, .38, .14, .05, .06, .02, tint(C.acc), .6, flags);
  // head
  const neck = joint(torso, 0, .58, 0, P.hy, P.hp, 0);
  part(neck, 0, .02, 0, .1, .08, .1, sk, fl, flags);
  const head = joint(neck, 0, .06, 0, 0, 0, 0);
  const hs = fem ? .24 : .26;
  part(head, 0, .13, 0, hs, .27, .26, sk, fl, flags);
  if (L.helmet !== 3) {
    part(head, -.06, .15, .131, .04, .035, .01, tint(C.eyes), .3, flags); part(head, .06, .15, .131, .04, .035, .01, tint(C.eyes), .3, flags);
    if (L.face === 1) partR(head, .07, .1, .132, 0, 0, .5, .015, .1, .005, tint([.6, .3, .3]), 0, flags);
    if (L.face === 2) { part(head, -.08, .08, .132, .02, .07, .005, tint(C.acc), .5, flags); part(head, .08, .08, .132, .02, .07, .005, tint(C.acc), .5, flags); }
    if (L.face === 3) part(head, 0, .02, .1, hs + .01, .12, .08, tint(C.hair), 0, flags);
    if (L.face === 4) part(head, 0, .1, .132, .14, .02, .005, tint([.7, .45, .35]), 0, flags);
  }
  // hair
  const hc = tint(C.hair);
  if (L.helmet !== 3 && L.helmet !== 2) {
    if (L.hair === 1) part(head, 0, .27, -.01, hs + .02, .06, .28, hc, fl, flags);
    if (L.hair === 2) { part(head, 0, .27, -.01, hs + .03, .07, .29, hc, fl, flags); part(head, 0, .08, -.12, hs + .04, .36, .06, hc, fl, flags); }
    if (L.hair === 3) { part(head, 0, .27, -.01, hs + .03, .07, .29, hc, fl, flags); partR(head, 0, .1, -.18, 0, .3 + Math.sin(ch.anim.phase) * .1 * sat(ch.speed / 4), 0, .07, .25, .07, hc, fl, flags); }
    if (L.hair === 4) part(head, 0, .3, -.02, .06, .12, .3, hc, fl, flags);
    if (L.hair === 5) { part(head, 0, .27, -.01, hs + .02, .06, .28, hc, fl, flags); part(head, 0, .3, -.13, .1, .1, .1, hc, fl, flags); }
    if (L.hair === 6) { for (let i = 0; i < 5; i++) part(head, (i - 2) * .055, .28 + (i & 1) * .02, -.01, .07, .08, .29, hc, fl, flags); }
  }
  if (L.helmet === 1) part(head, 0, .17, .02, hs + .03, .07, .26, tint([.12, .18, .22]), .5, flags);
  if (L.helmet === 2) { part(head, 0, .17, -.03, hs + .08, .34, .3, ac, fl, flags); part(head, 0, .02, -.05, hs + .1, .1, .32, ac, fl, flags); }
  if (L.helmet === 3) { part(head, 0, .14, 0, hs + .06, .32, .3, tint([.55, .57, .6]), fl, flags | F_REFL); part(head, 0, .16, .15, hs - .02, .13, .02, tint([.1, .7, .8]), .8, flags); }
  if (L.helmet === 4) { part(head, 0, .17, .02, hs + .03, .05, .27, tint([.3, .25, .2]), fl, flags); part(head, -.06, .17, .14, .07, .06, .02, tint([.9, .6, .2]), .7, flags); part(head, .06, .17, .14, .07, .06, .02, tint([.9, .6, .2]), .7, flags); }
  // arms
  let handR = null;
  for (const side of [-1, 1]) {
    const spn = side < 0 ? P.lsp : P.rsp, sr = side < 0 ? P.lsr : P.rsr, el = side < 0 ? P.le : P.re;
    const sh = joint(torso, side * (tw / 2 + .06), .5, 0, 0, spn, -sr);
    part(sh, 0, -.15, 0, .12 * bw, .32, .13, jc, fl, flags);
    const fa = joint(sh, 0, -.3, 0, 0, -el, 0);
    part(fa, 0, -.14, 0, .11 * bw, .29, .11, L.jacket === 2 ? sk : jc, fl, flags);
    part(fa, 0, -.31, 0, .1, .1, .1, gc, fl, flags);
    if (L.gloves === 2) part(fa, 0, -.2, 0, .13, .12, .13, gc, fl, flags);
    if (side > 0) handR = fa;
  }
  // held tool / weapon in right hand
  if (opts.weapon && handR) {
    const wpn = opts.weapon;
    const g = joint(handR, 0, -.33, .05, 0, -1.57, 0);
    part(g, 0, 0, .12, .07, .1, .36, tint([.25, .26, .3]), fl, flags);
    part(g, 0, .04, .3, .04, .04, .12, wpn.col, .9, flags);
    if (wpn.id === 'scatter') part(g, 0, .02, .1, .12, .12, .2, tint([.4, .3, .2]), fl, flags);
    if (wpn.id === 'lance') part(g, 0, .02, .2, .05, .05, .55, tint([.6, .6, .65]), fl, flags | F_REFL);
    ch.muzzle = A34.pt(g, 0, .04, .4);
  }
  if (opts.scanner && ch.anim.scan > .2) { const sh = joint(torso, -(tw / 2 + .06), .5, 0, 0, P.lsp, -P.lsr), fa = joint(sh, 0, -.3, 0, 0, -P.le, 0); part(fa, 0, -.35, .05, .14, .05, .1, [.2, .9, 1], .9, flags); }
  // scarf chain (simulated in world space)
  if (L.accessory === 1) {
    const nk = A34.pt(torso, 0, .55, -.05); if (!ch.scarf) ch.scarf = Array.from({ length: 5 }, () => [...nk, ...nk]);
    const sc = ch.scarf; sc[0][0] = nk[0]; sc[0][1] = nk[1]; sc[0][2] = nk[2];
    part(torso, 0, .55, 0, tw + .02, .08, .28, tint(C.acc), fl, flags);
    for (let i = 1; i < sc.length; i++) { const p = sc[i], q = sc[i - 1]; const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; const L2 = Math.hypot(dx, dy, dz) || 1;
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, mz = (p[2] + q[2]) / 2; const ry = Math.atan2(dx, dz), rx = Math.atan2(Math.hypot(dx, dz), dy);
      A34.trs(_W, mx, my, mz, ry, rx, 0, .08, L2, .03); R.inst('cube', _W, ...tint(C.acc), fl, flags); }
  }
  return torso;
}
// verlet scarf / cloth step driven by the shared wind state
function stepScarf(ch, dt, wind) {
  const sc = ch.scarf; if (!sc) return; const seg = .14;
  for (let i = 1; i < sc.length; i++) { const p = sc[i]; const vx = (p[0] - p[3]) * .96, vy = (p[1] - p[4]) * .96, vz = (p[2] - p[5]) * .96; p[3] = p[0]; p[4] = p[1]; p[5] = p[2];
    p[0] += vx + wind[0] * wind[2] * dt * dt * 18; p[1] += vy - 6 * dt * dt; p[2] += vz + wind[1] * wind[2] * dt * dt * 18; }
  for (let it = 0; it < 3; it++) for (let i = 1; i < sc.length; i++) { const p = sc[i], q = sc[i - 1]; const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], d = Math.hypot(dx, dy, dz) || 1, k = (d - seg) / d; p[0] -= dx * k; p[1] -= dy * k; p[2] -= dz * k;
    const gy = World.hf ? World.hf.at(p[0], p[2]) + .05 : -99; if (p[1] < gy) p[1] = gy; }
}
// small pixel portrait for dialogue box
function drawPortrait(canvas, look) {
  const c = canvas.getContext('2d'), C = lookCols(look), f = v => `rgb(${v[0] * 255 | 0},${v[1] * 255 | 0},${v[2] * 255 | 0})`; c.clearRect(0, 0, 16, 16);
  c.fillStyle = '#0a0c12'; c.fillRect(0, 0, 16, 16); c.fillStyle = f(C.jacket); c.fillRect(2, 12, 12, 4); c.fillStyle = f(C.skin); c.fillRect(4, 3, 8, 9);
  if (look.helmet === 3) { c.fillStyle = '#8c9096'; c.fillRect(3, 2, 10, 10); c.fillStyle = '#1ab3cc'; c.fillRect(4, 6, 8, 2); return; }
  c.fillStyle = f(C.eyes); c.fillRect(5, 7, 2, 1); c.fillRect(9, 7, 2, 1);
  c.fillStyle = f(C.hair); if (look.hair) c.fillRect(4, 2, 8, 2); if (look.hair === 2 || look.hair === 3) { c.fillRect(3, 3, 1, 7); c.fillRect(12, 3, 1, 7); } if (look.face === 3) c.fillRect(4, 10, 8, 2);
  if (look.helmet === 2) { c.fillStyle = f(C.accent); c.fillRect(3, 1, 10, 3); c.fillRect(3, 1, 1, 11); c.fillRect(12, 1, 1, 11); }
  if (look.helmet === 4) { c.fillStyle = '#e09a30'; c.fillRect(4, 6, 3, 2); c.fillRect(9, 6, 3, 2); }
  if (look.face === 2) { c.fillStyle = f(C.acc); c.fillRect(5, 9, 1, 2); c.fillRect(10, 9, 1, 2); }
}
