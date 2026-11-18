
/* =====================================================================
   WORLD — heightfield terrain, colliders + spatial grid, chunked static
   geometry (main + detail LOD), object library, raycasts
   ===================================================================== */
const HALF = 80, CHUNK = 32;
class Heightfield {
  constructor(n, half) { this.n = n; this.half = half; this.cell = half * 2 / (n - 1); this.h = new Float32Array(n * n); this.mat = new Uint8Array(n * n); }
  idx(x, z) { return [(x + this.half) / this.cell, (z + this.half) / this.cell]; }
  get(i, j) { i = clamp(i, 0, this.n - 1); j = clamp(j, 0, this.n - 1); return this.h[j * this.n + i]; }
  at(x, z) { const [fx, fz] = this.idx(x, z); const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    // match triangle split used by the mesh (diagonal i,j → i+1,j+1)
    const h00 = this.get(i, j), h10 = this.get(i + 1, j), h01 = this.get(i, j + 1), h11 = this.get(i + 1, j + 1);
    return tx > tz ? h00 + (h10 - h00) * tx + (h11 - h10) * tz : h00 + (h11 - h01) * tx + (h01 - h00) * tz; }
  normal(x, z) { const e = .5, dx = this.at(x + e, z) - this.at(x - e, z), dz = this.at(x, z + e) - this.at(x, z - e); const l = Math.hypot(dx, 2 * e, dz); return [-dx / l, 2 * e / l, -dz / l]; }
  matAt(x, z) { const [fx, fz] = this.idx(x, z); return this.mat[clamp(Math.round(fz), 0, this.n - 1) * this.n + clamp(Math.round(fx), 0, this.n - 1)]; }
}
const MATS = ['ash', 'grass', 'stone', 'metal', 'water', 'crystal', 'mud', 'sand', 'void'];
const MAT = Object.fromEntries(MATS.map((m, i) => [m, i]));

const World = {
  hf: null, cols: [], dyn: [], grid: new Map(), lights: [], inter: [], props: [], machines: [], triggers: [], decals: [], region: null, water: null, builders: new Map(), hiddenCols: [],
  reset() { this.cols = []; this.dyn = []; this.grid = new Map(); this.lights = []; this.inter = []; this.props = []; this.machines = []; this.triggers = []; this.builders = new Map(); this.water = null; this.anims = []; this.beams = []; this.landmarks = []; this.spawns = []; this.scanTargets = []; this.flora = []; },
  B(x, z, det = false) { const k = Math.floor((x + HALF) / CHUNK) + ',' + Math.floor((z + HALF) / CHUNK) + (det ? 'd' : ''); let b = this.builders.get(k); if (!b) { b = new MeshBuilder(8192); b.rng = RNG(hash(x, z) * 1e6); this.builders.set(k, b); } return b; },
  /* ---- colliders ---- */
  addCol(c) { c.y0 = c.y0 == null ? -50 : c.y0; if (c.r) { c.x0 = c.x - c.r; c.x1 = c.x + c.r; c.z0 = c.z - c.r; c.z1 = c.z + c.r; }
    if (c.dynamic) { this.dyn.push(c); return c; } c.id = this.cols.length; this.cols.push(c);
    for (let gx = Math.floor(c.x0 / 8); gx <= Math.floor(c.x1 / 8); gx++) for (let gz = Math.floor(c.z0 / 8); gz <= Math.floor(c.z1 / 8); gz++) { const k = gx * 1000 + gz; let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(c); }
    return c; },
  boxCol(x, z, sx, sz, y0, y1, o = {}) { return this.addCol(Object.assign({ x0: x - sx / 2, x1: x + sx / 2, z0: z - sz / 2, z1: z + sz / 2, y0, y1 }, o)); },
  near(x, z, r, out) { out.length = 0; const seen = this._seen || (this._seen = new Set()); seen.clear();
    for (let gx = Math.floor((x - r) / 8); gx <= Math.floor((x + r) / 8); gx++) for (let gz = Math.floor((z - r) / 8); gz <= Math.floor((z + r) / 8); gz++) { const a = this.grid.get(gx * 1000 + gz); if (a) for (const c of a) if (!seen.has(c)) { seen.add(c); if (c.on === undefined || c.on()) out.push(c); } }
    for (const c of this.dyn) if ((c.on === undefined || c.on()) && c.x1 > x - r && c.x0 < x + r && c.z1 > z - r && c.z0 < z + r) out.push(c); return out; },
  _tmp: [],
  overlap(c, x, z, r) { if (c.r) return dist2(x, z, c.x, c.z) < (c.r + r) * (c.r + r); return x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1; },
  ground(x, z, feet, step = .5, r = .2) {
    let h = this.hf.at(x, z), col = null; if (this.region && this.region.voidBelow != null && this.hf.matAt(x, z) === MAT.void) h = -60;
    const a = this.near(x, z, r + .1, this._tmp);
    for (const c of a) { if (c.noStand) continue; if (!this.overlap(c, x, z, r * .5)) continue; if (c.y1 <= feet + step && c.y1 > h) { h = c.y1; col = c; } }
    return { h, col };
  },
  // push a vertical cylinder out of colliders; returns [x,z,hitWall]
  collide(x, z, r, feet, height, step = .5) {
    let hit = null; const a = this.near(x, z, r + .5, this._tmp);
    for (let it = 0; it < 2; it++) for (const c of a) {
      if (c.y1 <= feet + step || c.y0 >= feet + height) continue;
      if (c.r) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; hit = c; } continue; }
      const cx = clamp(x, c.x0, c.x1), cz = clamp(z, c.z0, c.z1); let dx = x - cx, dz = z - cz; const d = Math.hypot(dx, dz);
      if (d < r) { if (d > 1e-5) { x = cx + dx / d * r; z = cz + dz / d * r; } else { const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z, m = Math.min(l, rr, t, b); if (m === l) x = c.x0 - r; else if (m === rr) x = c.x1 + r; else if (m === t) z = c.z0 - r; else z = c.z1 + r; } hit = c; }
    }
    const lim = HALF - 4; if (x < -lim) { x = -lim; hit = hit || {}; } if (x > lim) { x = lim; hit = hit || {}; } if (z < -lim) { z = -lim; hit = hit || {}; } if (z > lim) { z = lim; hit = hit || {}; }
    return [x, z, hit];
  },
  // point-in-solid test used by raycasts
  solid(x, y, z) { if (y < this.hf.at(x, z) - .05) return true; const a = this.near(x, z, .05, this._tmp); for (const c of a) { if (c.noRay) continue; if (y > c.y0 && y < c.y1 && this.overlap(c, x, z, 0)) return true; } return false; },
  ray(a, b, step = .4) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz), n = Math.ceil(L / step);
    for (let i = 1; i <= n; i++) { const t = i / n; if (this.solid(a[0] + dx * t, a[1] + dy * t, a[2] + dz * t)) return t * L; } return -1; },
  los(a, b) { return this.ray(a, b, .6) < 0; },
  light(x, y, z, r, col, int, o = {}) { const L = Object.assign({ x, y, z, r, col, int, base: int }, o); this.lights.push(L); return L; },
  /* ---- upload all builders to GPU chunks ---- */
  upload() { R.freeChunks(); const map = {}; for (const [k, b] of this.builders) { const det = k.endsWith('d'), key = det ? k.slice(0, -1) : k; map[key] = map[key] || {}; map[key][det ? 'det' : 'main'] = R.upload(b); }
    for (const k in map) { const c = map[k], mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of ['main', 'det']) if (c[p]) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], c[p].min[i] - 1.5); mx[i] = Math.max(mx[i], c[p].max[i] + 1.5); } c.min = mn; c.max = mx; R.chunks.push(c); }
    this.builders = new Map(); },
  /* ---- terrain generation ---- */
  buildTerrain(reg, rng) {
    const n = 161, hf = this.hf = new Heightfield(n, HALF);
    const path = reg.path, flats = reg.flats || [];
    const dPath = (x, z) => { let best = 1e9; for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1]; const abx = b[0] - a[0], abz = b[1] - a[1]; const t = clamp(((x - a[0]) * abx + (z - a[1]) * abz) / (abx * abx + abz * abz), 0, 1); const d = Math.hypot(x - a[0] - abx * t, z - a[1] - abz * t); if (d < best) best = d; } return best; };
    this.dPath = dPath;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + i * hf.cell, z = -HALF + j * hf.cell; let h = reg.height(x, z);
      const dp = dPath(x, z); const ph = reg.pathH ? reg.pathH(x, z) : h; h = lerp(ph, h, smooth(clamp((dp - (reg.pathW || 2.5)) / 5, 0, 1)));
      for (const f of flats) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r + (f.blend || 4)) h = lerp(f.h, h, smooth(clamp((d - f.r) / (f.blend || 4), 0, 1))); }
      const edge = Math.max(Math.abs(x), Math.abs(z)); if (reg.edge !== 'void' && edge > HALF - 14) h += Math.pow((edge - (HALF - 14)) / 14, 2) * (reg.edgeH || 14) * (.7 + fbm(x * .1, z * .1, 2) * .6);
      hf.h[j * n + i] = h; const slope = 0; hf.mat[j * n + i] = MAT[reg.mat(x, z, h, dp)] || 0;
    }
    // slope-based material override → stone on steep faces
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i; const s = Math.max(Math.abs(hf.h[k + 1] - hf.h[k - 1]), Math.abs(hf.h[k + n] - hf.h[k - n])) / (2 * hf.cell); if (s > .9 && hf.mat[k] !== MAT.void && hf.mat[k] !== MAT.metal) hf.mat[k] = MAT.stone; }
    // faceted mesh in chunks
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const x0 = -HALF + i * hf.cell, z0 = -HALF + j * hf.cell, x1 = x0 + hf.cell, z1 = z0 + hf.cell;
      const k = j * n + i, mt = hf.mat[k]; if (mt === MAT.void) continue;
      const a = [x0, hf.h[k], z0], b = [x1, hf.h[k + 1], z0], c = [x1, hf.h[k + n + 1], z1], d = [x0, hf.h[k + n], z1];
      const bld = this.B(x0 + .5, z0 + .5); const cx = x0 + .5, cz = z0 + .5, hh = (a[1] + c[1]) / 2;
      const col = reg.ground(MATS[mt], cx, cz, hh, rng);
      // per-face tonal variation gives a hand-painted pixel texture
      const v1 = (hash(i, j) - .5) * .1, v2 = (hash(i + 7, j + 3) - .5) * .1;
      bld.tri(a, c, b, [col[0] * (1 + v1), col[1] * (1 + v1), col[2] * (1 + v1)], { flags: F_GROUND });
      bld.tri(a, d, c, [col[0] * (1 + v2), col[1] * (1 + v2), col[2] * (1 + v2)], { flags: F_GROUND });
    }
  },
  scatterPebbles(reg, rng) { const q = R.Q.vegetation; const n = [1500, 3000, 5000, 7000][q]; const hf = this.hf;
    for (let i = 0; i < n; i++) { const x = rng.range(-HALF + 4, HALF - 4), z = rng.range(-HALF + 4, HALF - 4); const m = MATS[hf.matAt(x, z)]; if (m === 'void' || m === 'water') continue; const y = hf.at(x, z); const b = this.B(x, z, true);
      const c = scalec(reg.ground(m, x, z, y, rng), rng.range(.55, 1.35)); if (rng() < .6) b.box(x, y + .02, z, rng.range(.06, .25), rng.range(.03, .12), rng.range(.06, .22), c, { ry: rng() * 6, vary: .1 });
      else { const h = rng.range(.15, .4), tc = reg.tuftCol || scalec(c, 1.2); for (let k = 0; k < 3; k++) b.blade(x + rng.range(-.1, .1), y, z + rng.range(-.1, .1), h, .03, rng() * 6, rng.range(-.1, .1), tc, { sw: p => clamp((p[1] - y) / h, 0, 1) * .7, flags: F_FOLIAGE, vary: 0 }); } } },
  /* ---- vegetation scatter ---- */
  scatterGrass(reg, rng, density) {
    const q = R.Q.vegetation; const dens = density * [.35, .7, 1.1, 1.6][q];
    const hf = this.hf; const total = Math.floor(160 * 160 * dens);
    for (let i = 0; i < total; i++) {
      const x = rng.range(-HALF + 6, HALF - 6), z = rng.range(-HALF + 6, HALF - 6); const m = hf.matAt(x, z);
      if (!reg.grassOn || !reg.grassOn(MATS[m], x, z)) continue; if (this.dPath(x, z) < 1.2 && rng() < .8) continue;
      const y = hf.at(x, z); const b = this.B(x, z, true); const h = rng.range(.25, .7) * (reg.grassH || 1), col = reg.grassCol(x, z, rng);
      const sw = p => clamp((p[1] - y) / h, 0, 1) * .9;
      for (let k = 0; k < 3; k++) { const ox = x + rng.range(-.25, .25), oz = z + rng.range(-.25, .25); b.blade(ox, hf.at(ox, oz) - .02, oz, h * rng.range(.6, 1.1), .05, rng() * TAU, rng.range(-.15, .15), scalec(col, rng.range(.8, 1.15)), { sw, flags: F_FOLIAGE, vary: 0 }); }
      if (rng() < .12) { const pc = scalec(reg.ground(MATS[m], x, z, y, rng), rng.range(.6, 1.3)); b.box(x + rng.range(-.4, .4), y + .03, z + rng.range(-.4, .4), rng.range(.08, .22), rng.range(.04, .1), rng.range(.08, .2), pc, { ry: rng() * 6, vary: .1 }); }
      if (reg.flowers && rng() < reg.flowers) { const fc = rng.pick(reg.flowerCols); b.box(x, y + h * .9, z, .09, .09, .09, fc, { em: reg.flowerGlow || 0, sw: .8, flags: F_FOLIAGE, vary: .1 }); }
    }
  },
};

/* =====================================================================
   OBJECT LIBRARY — reusable, parameterised, seeded variations
   ===================================================================== */
const Lib = {
  Y(x, z) { return World.hf.at(x, z); },
  rock(x, z, s, col, rng, o = {}) { const y = this.Y(x, z) - s * .25; const b = World.B(x, z); b.ico(x, y, z, s, 1, col, { jitter: .45, rng, sx: rng.range(.8, 1.4), sy: rng.range(.5, 1), sz: rng.range(.8, 1.3), vary: .1, flags: (o.flags || 0) | F_OCC });
    if (s > .45) World.addCol({ x, z, r: s * .85, y1: y + s * .75, kind: 'rock' }); return y + s; },
  boulders(x, z, n, s, col, rng) { for (let i = 0; i < n; i++) this.rock(x + rng.range(-s * 2, s * 2), z + rng.range(-s * 2, s * 2), s * rng.range(.4, 1.1), col, rng); },
  spire(x, z, h, r, col, rng) { const y = this.Y(x, z) - 1; const b = World.B(x, z); let cy = y, cr = r; const segs = 4 + (rng() * 3 | 0); const lx = rng.range(-.08, .08), lz = rng.range(-.08, .08);
    for (let i = 0; i < segs; i++) { const sh = h / segs, nr = cr * rng.range(.65, .9); b.cyl(x + lx * (cy - y), cy, z + lz * (cy - y), cr, sh, 6, scalec(col, 1 - i * .04), { rTop: nr, lean: [lx, lz], a0: rng() * 6, flags: F_OCC }); cy += sh; cr = nr; }
    World.addCol({ x, z, r: r * .9, y1: y + h, kind: 'rock' }); },
  crystal(x, z, s, col, rng, glow = .6) { const y = this.Y(x, z); const b = World.B(x, z); const n = 2 + (rng() * 4 | 0);
    for (let i = 0; i < n; i++) { const h = s * rng.range(.8, 2.2), r = s * rng.range(.15, .35), ax = rng.range(-.35, .35), az = rng.range(-.35, .35);
      b.withT(A34.trs(new Float32Array(12), x + rng.range(-s * .4, s * .4), y - .1, z + rng.range(-s * .4, s * .4), rng() * 6, ax, az, 1, 1, 1), () => { b.cyl(0, 0, 0, r, h * .75, 5, col, { rTop: r * .8, em: glow * .5, noCap: true }); b.cyl(0, h * .75, 0, r * .8, h * .3, 5, scalec(col, 1.3), { rTop: 0, em: glow }); }); }
    if (s > .6) World.addCol({ x, z, r: s * .5, y1: y + s * 1.5 });
    if (glow > .3 && rng() < .35) World.light(x, y + s, z, 4 + s * 3, col, .5, { flicker: .1 }); },
  /* ---- trees & large flora ---- */
  ashTree(x, z, s, rng) { const y = this.Y(x, z) - .2, b = World.B(x, z); const bark = [.22, .19, .2];
    const branch = (px, py, pz, ang, tilt, len, r, d) => { const ex = px + Math.cos(ang) * Math.sin(tilt) * len, ey = py + Math.cos(tilt) * len, ez = pz + Math.sin(ang) * Math.sin(tilt) * len;
      // approximate a branch with a leaning cylinder
      b.cyl(px, py, pz, r, len * Math.cos(tilt), 5, bark, { rTop: r * .6, lean: [Math.cos(ang) * Math.tan(tilt), Math.sin(ang) * Math.tan(tilt)], sw: p => clamp((p[1] - y) / (s * 6), 0, .25) });
      if (d > 0) { const k = 1 + (rng() * 2 | 0); for (let i = 0; i < k + 1; i++) branch(ex, ey, ez, ang + rng.range(-1.4, 1.4), clamp(tilt + rng.range(-.2, .5), .2, 1.2), len * rng.range(.5, .75), r * .6, d - 1); } };
    branch(x, y, z, rng() * 6, rng.range(0, .2), s * 2.4, s * .22, 3);
    World.addCol({ x, z, r: s * .25, y1: y + s * 3, kind: 'tree' }); },
  bulbTree(x, z, s, rng, pal) { const y = this.Y(x, z) - .2, b = World.B(x, z); const h = s * rng.range(3.5, 5.5);
    const lx = rng.range(-.12, .12), lz = rng.range(-.12, .12); b.cyl(x, y, z, s * .3, h, 6, pal.trunk, { rTop: s * .14, lean: [lx, lz], sw: p => clamp((p[1] - y) / h, 0, 1) * .15, flags: F_OCC });
    const tx = x + lx * h, tz = z + lz * h, ty = y + h; const sw = p => .35 + clamp((p[1] - ty + 2) / 4, 0, .5);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + rng() * .5, d = s * rng.range(.8, 1.6); const ex = tx + Math.cos(a) * d, ez = tz + Math.sin(a) * d, ey = ty - rng.range(0, 1.2) * s;
      b.tri([tx, ty + .1, tz], [ex + Math.cos(a + 1.57) * .5 * s, ey, ez + Math.sin(a + 1.57) * .5 * s], [ex - Math.cos(a + 1.57) * .5 * s, ey, ez - Math.sin(a + 1.57) * .5 * s], b.vary(pal.leaf, {}), { sw, flags: F_FOLIAGE | F_OCC });
      if (rng() < .7) b.ico(ex, ey - .25 * s, ez, .22 * s, 0, pal.bulb, { em: .9, sw, vary: .1 }); }
    if (rng() < .5) World.light(tx, ty - 1, tz, 6 * s, pal.bulb, .55, { flicker: .05 });
    World.addCol({ x, z, r: s * .3, y1: y + h, kind: 'tree' }); },
  megaStalk(x, z, s, rng, pal) { const y = this.Y(x, z) - .5, b = World.B(x, z); const h = s * rng.range(9, 15);
    // flared roots
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + rng() * .5; b.tri([x + Math.cos(a) * s * 2.2, y, z + Math.sin(a) * s * 2.2], [x + Math.cos(a + .3) * s * .6, y + s * 2.5, z + Math.sin(a + .3) * s * .6], [x + Math.cos(a - .3) * s * .6, y + s * 2.5, z + Math.sin(a - .3) * s * .6], pal.trunk, { flags: F_OCC }); }
    b.cyl(x, y, z, s * .9, h, 7, pal.trunk, { rTop: s * .55, flags: F_OCC, sw: p => clamp((p[1] - y) / h, 0, 1) * .06 });
    for (let k = 0; k < 2; k++) { const cy = y + h * (k ? .62 : 1), cr = s * (k ? 3 : 4.5); b.cyl(x, cy - .4, z, cr, .8, 9, pal.cap, { rTop: cr * .35, sw: .08, flags: F_OCC, top: scalec(pal.cap, 1.2) });
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; b.ico(x + Math.cos(a) * cr * .9, cy - .5, z + Math.sin(a) * cr * .9, .18, 0, pal.bulb, { em: 1, sw: .3 }); } }
    World.light(x, y + h * .62 - 1, z, 9, pal.bulb, .6, { flicker: .08 });
    World.addCol({ x, z, r: s * 1, y1: y + h, kind: 'tree' }); },
  fungus(x, z, s, rng, pal) { const y = this.Y(x, z) - .1, b = World.B(x, z); const h = s * rng.range(1, 2.6);
    b.cyl(x, y, z, s * .18, h, 6, pal.stem, { rTop: s * .14, sw: p => clamp((p[1] - y) / h, 0, 1) * .2 });
    b.cyl(x, y + h - .1 * s, z, s * rng.range(.6, 1), .35 * s, 8, pal.cap, { rTop: s * .2, em: pal.capGlow || 0, sw: .2, flags: F_OCC });
    if (s > .9) World.addCol({ x, z, r: s * .2, y1: y + h }); },
  frond(x, z, s, col, rng) { const y = this.Y(x, z), b = World.B(x, z, true); const n = 5 + (rng() * 4 | 0);
    for (let i = 0; i < n; i++) { const a = rng() * TAU, l = s * rng.range(.6, 1.2), tilt = rng.range(.4, 1); const ex = x + Math.cos(a) * l * tilt, ez = z + Math.sin(a) * l * tilt, ey = y + l * (1 - tilt * .5);
      const w = .12 * s; b.tri([x - Math.sin(a) * w, y, z + Math.cos(a) * w], [x + Math.sin(a) * w, y, z - Math.cos(a) * w], [ex, ey, ez], b.vary(col, { vary: .15 }), { sw: p => clamp((p[1] - y) / l, 0, 1), flags: F_FOLIAGE }); } },
  bush(x, z, s, col, rng, o = {}) { const y = this.Y(x, z), b = World.B(x, z); for (let i = 0; i < 3; i++) b.ico(x + rng.range(-s * .5, s * .5), y + s * .4 + rng() * s * .3, z + rng.range(-s * .5, s * .5), s * rng.range(.4, .7), 1, col, { jitter: .5, rng, sw: .35, flags: F_FOLIAGE | F_OCC, vary: .12, em: o.em || 0 }); },
  reeds(x, z, s, col, rng) { const y = this.Y(x, z), b = World.B(x, z, true); for (let i = 0; i < 9; i++) { const ox = x + rng.range(-s, s), oz = z + rng.range(-s, s), h = rng.range(.8, 1.8); b.blade(ox, y, oz, h, .04, rng() * 6, rng.range(-.2, .2), b.vary(col, {}), { sw: p => clamp((p[1] - y) / h, 0, 1), flags: F_FOLIAGE }); } },
  vines(x, y, z, len, col, rng, n = 4) { const b = World.B(x, z, true); for (let i = 0; i < n; i++) { const ox = x + rng.range(-.6, .6), oz = z + rng.range(-.6, .6), l = len * rng.range(.5, 1);
      b.tri([ox - .06, y, oz], [ox + .06, y, oz], [ox, y - l, oz], b.vary(col, {}), { sw: p => clamp((y - p[1]) / len, 0, 1) * .9, flags: F_FOLIAGE }); } },
  /* ---- architecture ---- */
  house(x, z, w, d, ry, pal, rng, o = {}) {
    const y = this.Y(x, z) - .3, b = World.B(x, z), h = o.h || rng.range(2.8, 3.6);
    const m = A34.trs(new Float32Array(12), x, y, z, ry, 0, 0, 1, 1, 1);
    b.withT(m, () => {
      b.box(0, .3, 0, w + .3, .6, d + .3, pal.base, { flags: F_OCC });
      const wallH = h; // walls with door gap on front (+z)
      b.box(-w / 2, .6 + wallH / 2, 0, .25, wallH, d, pal.wall, { flags: F_OCC }); b.box(w / 2, .6 + wallH / 2, 0, .25, wallH, d, pal.wall, { flags: F_OCC });
      b.box(0, .6 + wallH / 2, -d / 2, w, wallH, .25, pal.wall, { flags: F_OCC });
      const dw = 1.3; b.box(-(w + dw) / 4 - .0, .6 + wallH / 2, d / 2, (w - dw) / 2, wallH, .25, pal.wall, { flags: F_OCC }); b.box((w + dw) / 4, .6 + wallH / 2, d / 2, (w - dw) / 2, wallH, .25, pal.wall, { flags: F_OCC });
      b.box(0, .6 + wallH - .35, d / 2, dw, .7, .25, pal.wall, { flags: F_OCC });
      // windows (emissive if lit)
      const lit = o.lit ? .9 : 0; b.box(-w / 4, .6 + wallH * .6, d / 2 + .14, .7, .6, .05, o.lit ? [1, .8, .45] : [.12, .14, .16], { em: lit, flags: F_REFL });
      b.box(w / 2 + .14, .6 + wallH * .6, 0, .05, .6, .8, o.lit ? [1, .8, .45] : [.12, .14, .16], { em: lit, flags: F_REFL });
      // pitched roof
      const rh = o.flat ? .3 : w * .35, ov = .4; const top = .6 + wallH;
      if (o.flat) b.box(0, top + .15, 0, w + ov * 2, .3, d + ov * 2, pal.roof, { flags: F_OCC });
      else { const A = [-w / 2 - ov, top, -d / 2 - ov], B2 = [w / 2 + ov, top, -d / 2 - ov], C = [w / 2 + ov, top, d / 2 + ov], D = [-w / 2 - ov, top, d / 2 + ov], E = [0, top + rh, -d / 2 - ov], Fp = [0, top + rh, d / 2 + ov];
        b.quad(A, E, Fp, D, b.vary(pal.roof, {}), { flags: F_OCC }); b.quad(E, B2, C, Fp, b.vary(scalec(pal.roof, .85), {}), { flags: F_OCC }); b.tri(A, B2, E, pal.wall, { flags: F_OCC }); b.tri(D, Fp, C, pal.wall, { flags: F_OCC });
        if (o.broken) b.box(w * .2, top + rh * .5, 0, w * .3, .1, d * .6, [.05, .05, .06]); }
      // overgrowth
      if (o.overgrown) for (let i = 0; i < 4; i++) b.ico(rng.range(-w / 2, w / 2), .6 + rng.range(0, wallH), d / 2 + .2, rng.range(.3, .7), 1, pal.moss, { jitter: .6, rng, sw: .2, flags: F_FOLIAGE });
    });
    // colliders (rotated walls approximated: only 0/90deg rotations used for houses)
    const rot = Math.round(ry / (Math.PI / 2)) & 1; const W2 = rot ? d : w, D2 = rot ? w : d; const cy = y + .6 + h;
    const sgn = Math.round(Math.cos(ry)) || 1, sgs = Math.round(Math.sin(ry));
    const wall = (lx, lz, sx, sz) => { const wx = x + lx * Math.cos(ry) + lz * Math.sin(ry), wz = z - lx * Math.sin(ry) + lz * Math.cos(ry); World.boxCol(wx, wz, rot ? sz : sx, rot ? sx : sz, y, cy, { kind: 'wall' }); };
    wall(-w / 2, 0, .3, d); wall(w / 2, 0, .3, d); wall(0, -d / 2, w, .3); const dw = 1.3; wall(-(w + dw) / 4, d / 2, (w - dw) / 2, .3); wall((w + dw) / 4, d / 2, (w - dw) / 2, .3);
    World.boxCol(x, z, W2 + .8, D2 + .8, cy - .1, cy + (o.flat ? .3 : w * .35), { kind: 'roof', noStand: !o.flat });
    World.boxCol(x, z, W2, D2, y, y + .62, { kind: 'floor' });
    if (o.lit) World.light(x, y + 2, z, 6, [1, .75, .4], .8, { flicker: .1 });
    return { y, h, top: y + .6 + h };
  },
  wallRuin(x, z, len, h, ry, col, rng) { const y = this.Y(x, z) - .4, b = World.B(x, z); const n = Math.ceil(len / 1.2);
    for (let i = 0; i < n; i++) { const lx = -len / 2 + (i + .5) * len / n, hh = h * rng.range(.35, 1); const wx = x + Math.cos(ry) * lx, wz = z - Math.sin(ry) * lx;
      b.box(wx, y + hh / 2, wz, len / n + .02, hh, .5, b.vary(col, { vary: .12 }), { ry, flags: F_OCC }); World.addCol({ x: wx, z: wz, r: .6, y1: y + hh }); } },
  pillar(x, z, h, r, col, o = {}) { const y = this.Y(x, z) - .2, b = World.B(x, z); b.box(x, y + .3, z, r * 2.6, .6, r * 2.6, scalec(col, .9), { flags: F_OCC }); b.cyl(x, y + .6, z, r, h - 1.2, o.sides || 8, col, { flags: F_OCC, rTop: r * .92 }); b.box(x, y + h - .3, z, r * 2.6, .6, r * 2.6, scalec(col, 1.05), { flags: F_OCC });
    if (o.glyph) b.box(x, y + h * .55, z + r * .95, r * .6, h * .3, .06, o.glyph, { em: .9 }); World.addCol({ x, z, r: r * 1.2, y1: y + h }); return y + h; },
  arch(x, z, w, h, ry, col, o = {}) { const y = this.Y(x, z) - .3, b = World.B(x, z); const m = A34.trs(new Float32Array(12), x, y, z, ry, 0, 0, 1, 1, 1);
    b.withT(m, () => { b.box(-w / 2, h / 2, 0, 1, h, 1, col, { flags: F_OCC }); b.box(w / 2, h / 2, 0, 1, h, 1, col, { flags: F_OCC }); b.box(0, h + .5, 0, w + 1.6, 1, 1.2, scalec(col, 1.05), { flags: F_OCC });
      if (o.glyph) b.box(0, h + .5, .62, w * .6, .3, .05, o.glyph, { em: 1 }); });
    for (const s of [-1, 1]) World.addCol({ x: x + Math.cos(ry) * s * w / 2, z: z - Math.sin(ry) * s * w / 2, r: .65, y1: y + h + 1 }); },
  platform(x, y, z, sx, sz, col, o = {}) { const b = World.B(x, z); b.box(x, y - (o.th || .5) / 2, z, sx, o.th || .5, sz, col, { flags: (o.flags || 0) | F_OCC, rev: o.rev || 0, top: o.top }); if (o.legs) for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const px = x + lx * (sx / 2 - .2), pz = z + lz * (sz / 2 - .2), gy = this.Y(px, pz); b.box(px, (gy + y) / 2, pz, .2, y - gy, .2, scalec(col, .7)); }
    return World.boxCol(x, z, sx, sz, y - (o.th || .5), y, Object.assign({ kind: 'platform' }, o.col || {})); },
  stairs(x, z, y0, y1, len, w, ry, col) { const n = Math.max(2, Math.ceil((y1 - y0) / .35)), b = World.B(x, z);
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, lz = -len / 2 + t * len, sy = y0 + (y1 - y0) * (i + 1) / n; const px = x + Math.sin(ry) * lz, pz = z + Math.cos(ry) * lz;
      b.box(px, (y0 + sy) / 2 - .2, pz, w, sy - y0 + .4, len / n + .02, b.vary(col, { vary: .05 }), { ry, flags: F_OCC }); World.boxCol(px, pz, Math.abs(Math.cos(ry)) > .5 ? w : len / n, Math.abs(Math.cos(ry)) > .5 ? len / n : w, y0 - 1, sy, { kind: 'stair' }); } },
  tower(x, z, h, pal, rng, o = {}) { const y = this.Y(x, z) - .2, b = World.B(x, z); const base = o.w || 2.2;
    for (let s = 0; s < 4; s++) { const a = s / 4 * TAU + Math.PI / 4; const r = base * .7; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      b.cyl(px, y, pz, .12, h, 4, pal.metal, { lean: [-Math.cos(a) * r * .55 / h, -Math.sin(a) * r * .55 / h], flags: F_OCC | F_REFL }); }
    for (let k = 1; k < 7; k++) { const t = k / 7, yy = y + h * t, r = base * .7 * (1 - t * .55); b.box(x, yy, z, r * 1.45, .08, r * 1.45, pal.metal, { ry: Math.PI / 4 * 0, flags: F_OCC }); }
    b.cyl(x, y + h, z, .06, 3, 4, pal.metal, { rTop: .02 }); b.ico(x, y + h + 3, z, .18, 0, pal.light, { em: 1 });
    if (o.dish) { b.cyl(x + .6, y + h * .8, z, .9, .25, 8, [.6, .62, .65], { rTop: .3, flags: F_REFL }); }
    if (o.broken) b.box(x + 1.2, y + h * .4, z, .14, h * .5, .14, pal.metal, { rz: .9 });
    World.addCol({ x, z, r: base * .8, y1: y + h, kind: 'tower', noRay: true }); World.light(x, y + h + 3, z, 7, pal.light, o.dead ? 0 : .8, { blink: 1.2 });
    return y + h; },
  antennaArray(x, z, n, h, col, rng) { for (let i = 0; i < n; i++) { const px = x + rng.range(-3, 3), pz = z + rng.range(-3, 3), y = this.Y(px, pz); const b = World.B(px, pz); const hh = h * rng.range(.5, 1);
    b.cyl(px, y, pz, .07, hh, 4, col, { rTop: .03, flags: F_REFL }); b.box(px, y + hh * .8, pz, .9, .04, .04, col, { ry: rng() * 3 }); } },
  capsule(x, z, ry, rng) { const y = this.Y(x, z) + .2, b = World.B(x, z); const hull = [.62, .6, .58], dark = [.18, .18, .2];
    b.withT(A34.trs(new Float32Array(12), x, y, z, ry, .18, .08, 1, 1, 1), () => {
      b.cyl(0, 0, 0, 1.25, 2.6, 8, hull, { rTop: .7, flags: F_OCC | F_REFL, a0: .2 }); b.cyl(0, 2.6, 0, .7, .6, 8, dark, { rTop: .3 });
      b.box(0, 1.2, 1.15, 1.1, 1.3, .1, [.05, .08, .1], { em: 0, flags: F_REFL }); b.box(0, .2, 0, 3, .3, 3, [.15, .12, .1]);
      b.box(.9, 1.9, .5, .3, .1, .3, [1, .3, .2], { em: 1 }); });
    World.addCol({ x, z, r: 1.4, y1: y + 3 }); World.light(x + .9, y + 2, z + .5, 4, [1, .35, .2], .9, { blink: .8 }); },
  debrisField(x, z, r, n, cols, rng) { for (let i = 0; i < n; i++) { const px = x + rng.range(-r, r), pz = z + rng.range(-r, r), y = this.Y(px, pz); const b = World.B(px, pz, true);
    const s = rng.range(.1, .6); b.box(px, y + s * .2, pz, s * rng.range(.5, 2), s * .4, s * rng.range(.4, 1.6), rng.pick(cols), { ry: rng() * 6, rx: rng.range(-.3, .3), rz: rng.range(-.3, .3), flags: rng() < .3 ? F_REFL : 0 }); } },
  hullPlate(x, z, s, ry, col, rng) { const y = this.Y(x, z), b = World.B(x, z); b.box(x, y + s * .3, z, s * 2, .12, s, col, { ry, rx: rng.range(.3, 1), rz: rng.range(-.3, .3), flags: F_REFL | F_OCC }); World.addCol({ x, z, r: s * .7, y1: y + s * .6 }); },
  crateStack(x, z, n, col, rng) { const y0 = this.Y(x, z), b = World.B(x, z); let y = y0; for (let i = 0; i < n; i++) { const s = rng.range(.8, 1.1); b.box(x + rng.range(-.1, .1), y + s / 2, z + rng.range(-.1, .1), s, s, s, col, { ry: rng.range(-.2, .2), flags: F_OCC }); b.box(x, y + s / 2, z, s * 1.02, .12, s * 1.02, scalec(col, .7)); y += s; }
    World.boxCol(x, z, 1.1, 1.1, y0, y, { kind: 'crate' }); },
  pipe(x0, y0, z0, x1, y1, z1, r, col) { const b = World.B((x0 + x1) / 2, (z0 + z1) / 2); const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz);
    const ry = Math.atan2(dx, dz), rx = Math.atan2(Math.hypot(dx, dz), dy); b.withT(A34.trs(new Float32Array(12), x0, y0, z0, ry, rx, 0, 1, 1, 1), () => { b.cyl(0, 0, 0, r, L, 6, col, { flags: F_REFL | F_OCC }); for (let t = 1; t < L; t += 3) b.cyl(0, t, 0, r * 1.25, .2, 6, scalec(col, .7)); }); },
  cable(x0, y0, z0, x1, y1, z1, sag, col) { const n = 10, b = World.B((x0 + x1) / 2, (z0 + z1) / 2, true); let prev = null;
    for (let i = 0; i <= n; i++) { const t = i / n, p = [lerp(x0, x1, t), lerp(y0, y1, t) - Math.sin(t * Math.PI) * sag, lerp(z0, z1, t)]; const sw = Math.sin(t * Math.PI) * .7;
      if (prev) { b.quad([prev[0], prev[1] + .04, prev[2]], [p[0], p[1] + .04, p[2]], [p[0], p[1] - .04, p[2]], [prev[0], prev[1] - .04, prev[2]], col, { sw: Math.max(sw, prev[3]) }); } prev = [...p, sw]; } },
  lamp(x, z, h, col, o = {}) { const y = this.Y(x, z), b = World.B(x, z); b.cyl(x, y, z, .07, h, 5, [.2, .21, .23], { flags: F_REFL }); b.box(x + .3, y + h, z, .7, .08, .1, [.2, .21, .23]); b.box(x + .55, y + h - .1, z, .25, .12, .2, col, { em: o.off ? 0 : 1 });
    World.addCol({ x, z, r: .15, y1: y + h }); return World.light(x + .55, y + h - .3, z, o.r || 8, col, o.off ? 0 : (o.int || .9), { flicker: o.flicker || 0, cond: o.cond }); },
  terminal(x, z, ry, col, o = {}) { const y = this.Y(x, z), b = World.B(x, z); b.withT(A34.trs(new Float32Array(12), x, y, z, ry, 0, 0, 1, 1, 1), () => { b.box(0, .5, 0, .8, 1, .5, [.22, .23, .26], { flags: F_REFL }); b.box(0, 1.2, -.05, .75, .55, .12, [.15, .16, .18], { rx: -.3 }); b.box(0, 1.22, .03, .6, .4, .02, col, { em: .9, rx: -.3 }); });
    World.addCol({ x, z, r: .45, y1: y + 1.3 }); World.light(x + Math.sin(ry) * .5, y + 1.3, z + Math.cos(ry) * .5, 3, col, .6, { flicker: .15 }); return y; },
  vehicle(x, z, ry, col, rng, o = {}) { const y = this.Y(x, z), b = World.B(x, z); b.withT(A34.trs(new Float32Array(12), x, y + .1, z, ry, rng.range(-.08, .08), rng.range(-.15, .15), 1, 1, 1), () => {
      b.box(0, .9, 0, 2, .9, 4.2, col, { flags: F_OCC | F_REFL }); b.box(0, 1.65, -.3, 1.8, .7, 2, scalec(col, .9), { flags: F_OCC }); b.box(0, 1.65, .72, 1.7, .55, .05, [.08, .1, .12], { flags: F_REFL, rx: .3 });
      for (const [wx, wz] of [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]]) { b.withT(A34.trs(new Float32Array(12), wx, .45, wz, 0, 0, Math.PI / 2, 1, 1, 1), () => b.cyl(0, -.2, 0, .45, .4, 8, [.08, .08, .08])); }
      if (o.overgrown) for (let i = 0; i < 4; i++) b.ico(rng.range(-1, 1), 2, rng.range(-2, 2), rng.range(.3, .6), 1, o.overgrown, { jitter: .5, rng, sw: .2, flags: F_FOLIAGE }); });
    World.addCol({ x, z, r: 1.7, y1: y + 2, kind: 'vehicle' }); },
  stall(x, z, ry, cloth, rng) { const y = this.Y(x, z), b = World.B(x, z); b.withT(A34.trs(new Float32Array(12), x, y, z, ry, 0, 0, 1, 1, 1), () => {
      for (const [lx, lz] of [[-1.2, -.8], [1.2, -.8], [-1.2, .8], [1.2, .8]]) b.box(lx, 1.2, lz, .1, 2.4, .1, [.3, .25, .2]);
      b.box(0, .8, .3, 2.4, .1, 1, [.35, .28, .2]); b.quad([-1.4, 2.4, -1], [1.4, 2.4, -1], [1.4, 2.0, 1.2], [-1.4, 2.0, 1.2], cloth, { sw: p => .4 + (p[2] > 0 ? .5 : 0), flags: F_FOLIAGE }); });
    World.addCol({ x, z, r: 1.2, y1: y + .9 }); },
  flag(x, z, h, col) { const y = this.Y(x, z), b = World.B(x, z); b.cyl(x, y, z, .05, h, 4, [.3, .3, .32]); for (let i = 0; i < 5; i++) { const t0 = i / 5, t1 = (i + 1) / 5; b.quad([x + t0 * 1.6, y + h, z], [x + t1 * 1.6, y + h, z], [x + t1 * 1.6, y + h - .9, z], [x + t0 * 1.6, y + h - .9, z], b.vary(col, { vary: .06 }), { sw: p => (p[0] - x) / 1.6, flags: F_FOLIAGE }); } },
  monolith(x, y, z, w, h, col, glyph, o = {}) { const b = World.B(x, z); b.box(x, y + h / 2, z, w, h, w * .5, col, { ry: o.ry || 0, flags: F_OCC | F_REFL }); b.box(x, y + h * .5, z, w * 1.02, h * .06, w * .52, glyph, { ry: o.ry || 0, em: 1 });
    if (o.col !== false) World.addCol({ x, z, r: w * .55, y0: y, y1: y + h }); },
  vaelTower(x, z, h, col, glow, rng) { const y = this.Y(x, z) - 1, b = World.B(x, z); let cy = y, r = 3.2; const n = 7;
    for (let i = 0; i < n; i++) { const sh = h / n, nr = r * (i < n - 2 ? .88 : .5); b.cyl(x, cy, z, r, sh, 8, scalec(col, 1 - i * .03), { rTop: nr, flags: F_OCC, a0: i * .2 }); b.cyl(x, cy + sh - .3, z, nr * 1.05, .3, 8, glow, { em: .9, rTop: nr * 1.05 }); cy += sh; r = nr; }
    b.cyl(x, cy, z, .15, 8, 4, glow, { rTop: .02, em: .7 }); World.light(x, cy + 4, z, 14, glow, .9, { blink: 3 });
    World.addCol({ x, z, r: 3.3, y1: y + h, kind: 'tower' }); },
  ring(x, y, z, r, th, col, o = {}) { const b = World.B(x, z); const n = 20; const m = A34.trs(new Float32Array(12), x, y, z, o.ry || 0, o.rx || 0, 0, 1, 1, 1);
    b.withT(m, () => { for (let i = 0; i < n; i++) { const a = i / n * TAU, a2 = (i + 1) / n * TAU; b.box(Math.cos((a + a2) / 2) * r, Math.sin((a + a2) / 2) * r, 0, th, TAU * r / n + .05, th, col, { rz: (a + a2) / 2, em: o.em || 0 }); } }); },
  machine(x, z, ry, pal, rng) { const y = this.Y(x, z), b = World.B(x, z); b.withT(A34.trs(new Float32Array(12), x, y, z, ry, 0, 0, 1, 1, 1), () => {
      b.box(0, 1.5, 0, 4, 3, 3, pal.metal, { flags: F_OCC | F_REFL }); b.cyl(-1, 3, 0, .5, 2.5, 6, pal.rust, { flags: F_OCC }); b.box(1.2, 3.4, 0, 1.2, .8, 2, pal.rust);
      b.box(0, 1.5, 1.52, 2.6, .3, .05, [1, .5, .1], { em: .8 }); for (let i = 0; i < 3; i++) b.cyl(1.6, .4 + i * .9, -1.6, .25, 1.6, 6, pal.metal, { flags: F_REFL }); });
    World.addCol({ x, z, r: 2.4, y1: y + 3.4, kind: 'machine' }); World.light(x, y + 2, z + 1.8, 5, [1, .5, .15], .7, { flicker: .2 }); },
  hall(x, z, w, d, h, ry, pal) { const y = this.Y(x, z) - .4, b = World.B(x, z); // open industrial hall frame
    for (let i = 0; i <= 4; i++) { const lz = -d / 2 + i * d / 4; for (const s of [-1, 1]) { const px = x + s * w / 2 * Math.cos(ry) + lz * Math.sin(ry), pz = z - s * w / 2 * Math.sin(ry) + lz * Math.cos(ry); b.box(px, y + h / 2, pz, .5, h, .5, pal.metal, { flags: F_OCC | F_REFL }); World.addCol({ x: px, z: pz, r: .35, y1: y + h }); }
      b.withT(A34.trs(new Float32Array(12), x + lz * Math.sin(ry), y + h, z + lz * Math.cos(ry), ry, 0, 0, 1, 1, 1), () => b.box(0, 0, 0, w + .5, .4, .4, pal.metal, { flags: F_OCC })); }
    b.withT(A34.trs(new Float32Array(12), x, y + h + .4, z, ry, 0, 0, 1, 1, 1), () => { for (let i = 0; i < 6; i++) if (i % 3 !== 1) b.box(0, 0, -d / 2 + (i + .5) * d / 6, w + .8, .1, d / 6 - .1, i % 2 ? pal.rust : pal.metal, { flags: F_OCC }); }); },
  stack(x, z, h, r, pal) { const y = this.Y(x, z) - .3, b = World.B(x, z); b.cyl(x, y, z, r, h, 8, pal.rust, { rTop: r * .85, flags: F_OCC }); for (let i = 1; i < 4; i++) b.cyl(x, y + h * i / 4, z, r * (1 - i * .04) + .1, .4, 8, [.9, .85, .8]); World.addCol({ x, z, r, y1: y + h }); return y + h; },
  tendril(x, z, h, col, rng, glow) { const y = this.Y(x, z) - .5, b = World.B(x, z); let px = x, pz = z, py = y, r = rng.range(.4, .8); const n = 8;
    for (let i = 0; i < n; i++) { const nx = px + rng.range(-.6, .6), nz = pz + rng.range(-.6, .6), sh = h / n; b.cyl(px, py, pz, r, sh, 6, col, { rTop: r * .85, lean: [(nx - px) / sh, (nz - pz) / sh], sw: p => clamp((p[1] - y) / h, 0, 1) * .3, flags: F_OCC });
      if (glow && i % 2) b.ico(px, py + sh / 2, pz, r * 1.1, 0, glow, { em: .9, sw: clamp((py - y) / h, 0, 1) * .3 }); px = nx; pz = nz; py += sh; r *= .85; }
    World.addCol({ x, z, r: .7, y1: y + h }); },
};
