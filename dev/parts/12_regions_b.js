
/* ---------------- 05 · IRON WASTELANDS · When the Iron Woke ---------------- */
REGIONS.push({
  id: 'iron', name: 'Iron Wastelands', chapter: 'When the Iron Woke', num: 'V', seed: 505, sideYaw: Math.PI / 2,
  pal: { dayTop: '#5a4a48', dayHor: '#d08a50', dayFog: '#8a5a3a', sun: '#ffc080', dusk: '#ff7030', nightTop: '#100808', nightHor: '#3a1e14', nightFog: '#2a1810', moon: '#c09080', amb: '#6a4a3a', gnd: '#3a2418', planet: '#e0a060', planetDir: [.7, .25, -.6], sunAz: 4 },
  dayLen: 500, t0: .55, music: { root: 87.3, scale: [0, 1, 5, 7, 8], prog: [0, 1, 3, 2] }, dustCol: [.5, .35, .25], leafCol: [.5, .4, .3], verb: [2.2, 2.5],
  weather: [W_('Smog', 3, { fog: .45, dust: .3, wind: .3, cloud: .6 }), W_('Dust storm', 2, { dust: 1, wind: 1, fog: .6 }), W_('Ember fall', 2, { ash: .7, wind: .4, fog: .3, motes: .5 }), W_('Acid rain', 1, { rain: .6, fog: .4, wind: .5, cloud: 1 })],
  path: [[0, 64], [0, 24], [0, 4], [-10, -8], [8, -20], [0, -46], [0, -70]],
  flats: [{ x: 0, z: 30, r: 10, h: .5 }, { x: -26, z: -10, r: 10, h: .5 }, { x: 28, z: -14, r: 8, h: .5 }, { x: 0, z: -46, r: 16, h: 0 }],
  height(x, z) { let h = fbm(x * .03, z * .03) * 4 - .5; if (z > 6 && z < 16) h -= 5 * smooth(clamp((5 - Math.abs(z - 11)) / 2, 0, 1)); return h; }, pathH(x, z) { return (z > 6 && z < 16) ? -4.5 : .3; }, pathW: 3,
  mat(x, z, h, dp) { if (h < -3) return 'metal'; if (dp < 2.6 || fbm(x * .2, z * .2) > .62) return 'metal'; return fbm(x * .1, z * .1) > .5 ? 'sand' : 'ash'; },
  ground(m, x, z, h, rng) { const v = vnoise(x * .5, z * .5) * .07; if (m === 'metal') { const pl = (Math.floor(x / 1.5) + Math.floor(z / 1.5)) & 1; return [.34 + v + pl * .03, .32 + v + pl * .03, .3 + v]; } if (m === 'sand') return [.48 + v, .3 + v, .2]; return [.32 + v, .22 + v, .18]; },
  grassOn: m => m === 'sand', grassCol: () => [.5, .4, .25], grassDensity: .5, grassH: .6,
  spawn: [0, 60, Math.PI], boss: { id: 'titan', x: 0, z: -46 },
  pois: [{ n: 'Conveyor yard', x: 0, z: 30 }, { n: 'Molten channel', x: 0, z: 11 }, { n: 'Vessel foundry', x: -26, z: -10 }, { n: 'Vault', x: 28, z: -14 }, { n: 'Forge floor', x: 0, z: -46 }],
  build(rng) {
    const P = { metal: [.4, .4, .42], rust: [.52, .3, .18] };
    // molten channel: emissive pour + hazard; crossing on shuttle platforms (timing)
    for (let x = -72; x < 72; x += 3) { const y = World.hf.at(x, 11); World.B(x, 11).box(x + 1.5, -4.3, 11, 3.1, .2, 6, [1, .45, .1], { em: 1, flags: F_UNLIT }); }
    World.triggers.push({ x: 0, z: 11, r: 80, hazard: 'heat', dmg: 30, y: -6, h: 3.2, msg: 'Molten metal!', on: () => true, rect: [-80, 80, 8, 14] });
    for (let i = 0; i < 5; i++) World.light(-40 + i * 20, -3, 11, 10, [1, .5, .15], 1, { flicker: .2 });
    World.machines.push({ update: () => { if (Math.random() < .4) FX.spawn(rng.range(-60, 60), -4, rng.range(8, 14), 0, 1.5, 0, 1, .6, [1, .6, .2], true, -.1, .3); } });
    for (let k = 0; k < 2; k++) { const px = -3 + k * 6; const col = World.addCol({ x0: px - 1.5, x1: px + 1.5, z0: 0, z1: 3, y0: -1, y1: .4, dynamic: true, kind: 'platform', surf: 'metal' }); let t = k * 3;
      World.machines.push({ update: dt => { t += dt; const z = 11 + Math.sin(t * .55) * 6.5; const cz = (col.z0 + col.z1) / 2; col.dz = z - cz; col.dx = 0; col.dy = 0; col.z0 += col.dz; col.z1 += col.dz; }, draw: () => { A34.trs(_W, px, .15, (col.z0 + col.z1) / 2, 0, 0, 0, 3, .5, 3); R.inst('cube', _W, .45, .43, .4, 0, F_REFL); A34.trs(_W, px, .42, (col.z0 + col.z1) / 2, 0, 0, 0, 3.02, .05, .3); R.inst('cube', _W, 1, .7, .2, .8); } }); }
    K.trig(0, 2, 6, () => Game.event('reach_yard'));
    // conveyor yard, halls, stacks, cranes
    Lib.hall(-14, 34, 10, 16, 7, 0, P); Lib.hall(16, 36, 10, 14, 8, 0, P); Lib.machine(-12, 30, 0, P, rng); Lib.machine(15, 40, Math.PI / 2, P, rng);
    for (const [x, z, h] of [[-30, 40, 16], [30, 46, 18], [-40, -40, 14], [40, -30, 15]]) Lib.stack(x, z, h, 1.6, P);
    for (let i = 0; i < 6; i++) Lib.pipe(-40 + i * 16, 3, 50, -40 + i * 16, 3, 20, .4, P.rust);
    Lib.crateStack(4, 26, 3, [.45, .35, .25], rng); Lib.crateStack(-5, 22, 2, [.4, .3, .2], rng);
    for (let i = 0; i < 8; i++) Props.add(i % 2 ? 'barrel' : 'crate', rng.range(-8, 8), rng.range(20, 40));
    // steam vents (timed hazard)
    for (const [x, z] of [[-4, -2], [3, -6], [-8, -12]]) { let t = rng() * 4; const on = () => (t % 4) < 1.4; World.triggers.push({ x, z, r: 1.4, hazard: 'steam', dmg: 12, on, msg: 'Steam vent — time your crossing' }); World.machines.push({ update: dt => { t += dt; if (on()) FX.steam(x, World.hf.at(x, z), z, 3); } }); World.scanTargets.push({ x, z, kind: 'hazard', label: 'pressurised vent', strength: .5 }); }
    // pistons over the walkway
    for (const [x, z, ph] of [[8, -20, 0], [8, -24, 1.5]]) { const y = World.hf.at(x, z); let t = ph; const col = World.addCol({ x0: x - 1.2, x1: x + 1.2, z0: z - 1.2, z1: z + 1.2, y0: y + 3, y1: y + 6, dynamic: true, kind: 'piston' });
      World.machines.push({ update: dt => { t += dt; const k = Math.max(0, Math.sin(t * 1.4)); const bottom = y + .2 + (1 - k) * 3; col.y0 = bottom; col.y1 = bottom + 3; const p = Player.ch; if (k < .15 && Math.abs(p.x - x) < 1.3 && Math.abs(p.z - z) < 1.3 && p.y < bottom + .5) Player.hurt(25, [x, y, z]); if (k < .05 && !this.thud) { Audio2.sfx('brute_slam', [x, y, z]); } }, draw: () => { A34.trs(_W, x, col.y0 + 1.5, z, 0, 0, 0, 2.4, 3, 2.4); R.inst('cube', _W, .4, .38, .36, 0, F_REFL); A34.trs(_W, x, col.y0 + 6, z, 0, 0, 0, .6, 6, .6); R.inst('cyl', _W, .6, .6, .62, 0, F_REFL); } }); }
    World.B(8, -22).box(8, World.hf.at(8, -22) + 9, -22, 4, 1, 8, P.rust, { flags: F_OCC });
    // vessel foundry: rows of pods holding printed bodies wearing YOUR face
    Lib.hall(-26, -10, 12, 14, 7, 0, P); K.trig(-26, -10, 8, () => { Game.event('reach_foundry'); if (!flag('foundry_seen')) { setFlag('foundry_seen'); setTimeout(() => Game.dialogue('foundry'), 900); } });
    const pods = []; for (let i = 0; i < 6; i++) { const x = -31 + (i % 3) * 5, z = -14 + Math.floor(i / 3) * 8; const ch = makeChar(GS().look); ch.x = x; ch.z = z; ch.y = World.hf.at(x, z) + .3; ch.yaw = Math.floor(i / 3) ? Math.PI : 0; ch.anim.idleVar = 0; pods.push(ch);
      const b = World.B(x, z), y = World.hf.at(x, z); b.cyl(x, y, z, .9, .3, 8, [.3, .3, .32]); b.cyl(x, y + 2.3, z, .9, .4, 8, [.3, .3, .32]); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4; b.box(x + Math.cos(a) * .85, y + 1.3, z + Math.sin(a) * .85, .08, 2, .08, [.4, .4, .42]); } World.addCol({ x, z, r: .9, y1: y + 2.7 }); World.light(x, y + 2, z, 3, [.5, 1, .9], .4); }
    World.machines.push({ update: dt => pods.forEach(c => { c.anim.t += dt * .2; Anim.update(c, 0); }), draw: () => { if (dist2(Player.x, Player.z, -26, -10) > 900) return; for (const c of pods) { c.look = GS().look; c.cols = lookCols(c.look); drawHumanoid(c, {}); A34.trs(_W, c.x, c.y + 1, c.z, 0, 0, 0, 1.6, 2, 1.6); } } });
    K.log(-26, -4, 'l_vessel');
    // vault: mirror beam puzzle powering the door; boots inside
    Lib.machine(28, -20, 0, P, rng); K.door(28, -9.5, 3, 3.5, 0, () => flag('vault5'), [.5, .45, .35]);
    World.B(28, -14).box(24.8, World.hf.at(28, -14) + 2, -14, .5, 4, 9, P.metal, { flags: F_OCC }); World.B(28, -14).box(31.2, World.hf.at(28, -14) + 2, -14, .5, 4, 9, P.metal, { flags: F_OCC }); World.B(28, -14).box(28, World.hf.at(28, -14) + 4.2, -14, 7, .4, 9, P.rust, { flags: F_OCC });
    World.boxCol(24.8, -14, .5, 9, -1, 5); World.boxCol(31.2, -14, .5, 9, -1, 5);
    K.cache(28, -16, { label: 'Take the Pulse Boots', item: 'boots', id: 'boots', on: () => flag('vault5') });
    Beams.add({ region: 4, src: [10, 2], dir: Math.PI / 2, target: [27, -8], col: [1, .7, .3], verb: 'Rotate reflector', mirrors: [{ x: 20, z: 2, ang: 0 }, { x: 20, z: -4, ang: 0 }, { x: 27, z: -4, ang: 0 }], step: Math.PI / 4, onSolve: () => { setFlag('vault5'); Game.event('puzzle_vault'); Game.say('orin', 'Power to the vault. Whatever they kept in there, they kept it well.'); } });
    // smokestack climb (boots + scan) → freq #5
    const sy = World.hf.at(-40, -40);
    K.hidden(1, -40, -32, 'Maintenance gantry resolved', g => { for (let i = 0; i < 5; i++) K.hplat(g, -40 + (i % 2 ? 2.6 : -2.6), sy + 2.2 + i * 2.3, -34 - i * 1.2, 2, 2, [1, .7, .4]); });
    Lib.platform(-40, sy + 14.4, -40, 3.6, 3.6, [.45, .42, .4]); K.freq(-40, -40, 5, { y: 14.4 });
    // forge floor
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; Lib.pillar(Math.cos(a) * 19, -46 + Math.sin(a) * 19, 9, .7, [.42, .38, .36]); }
    K.trig(0, -46, 15, () => { if (Game.has('boots') && !flag('boss_titan')) Boss.start('titan', 0, -48, () => { setFlag('boss_titan'); Game.event('boss_titan'); }); }, { once: false, cond: () => Game.has('boots') && !flag('boss_titan') && !Boss.active });
    K.exit(0, -66, () => flag('boss_titan'), () => Game.completeChapter());
    K.checkpoint(5, 54, 'c5a', 'Yard Gate'); K.checkpoint(-6, -4, 'c5b', 'Vent Field');
    K.enemy('brute', 0, 34); K.enemy('crawler', -10, 20); K.enemy('crawler', 10, 22); K.enemy('watcher', -20, -20); K.enemy('burrower', 4, -14); K.enemy('drifter', 20, -2); K.enemy('drifter', -30, 0); K.enemy('mimic', 34, -2);
    for (let i = 0; i < 40; i++) { const x = rng.range(-72, 72), z = rng.range(-72, 72); if (World.dPath(x, z) < 4 || (z > 5 && z < 17)) continue; Lib.debrisField(x, z, 2, 4, [[.4, .3, .25], [.3, .3, .32]], rng); }
    for (let i = 0; i < 14; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 6 || (z > 4 && z < 18)) continue; Lib.vehicle(x, z, rng() * 6, [.45, .35, .25], rng); }
    for (let i = 0; i < 20; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 6) continue; Lib.rock(x, z, rng.range(.6, 1.6), [.4, .3, .25], rng); }
  },
});

/* ---------------- 06 · ECHO CANYON · The Hollow Remembers ---------------- */
const meander = z => Math.sin(z * .045) * 10;
REGIONS.push({
  id: 'canyon', name: 'Echo Canyon', chapter: 'The Hollow Remembers', num: 'VI', seed: 606, sideYaw: 0,
  pal: { dayTop: '#2a4a8a', dayHor: '#f0c090', dayFog: '#c09070', sun: '#fff0c0', dusk: '#ff9050', nightTop: '#060a1a', nightHor: '#2a2040', nightFog: '#201828', moon: '#a0b0e0', amb: '#7a6058', gnd: '#5a3a28', planet: '#e0c0a0', planetDir: [-.6, .45, -.6], sunAz: 1.6 },
  dayLen: 460, t0: .36, music: { root: 123.5, scale: [0, 2, 5, 7, 9], prog: [0, 4, 3, 1] }, dustCol: [.7, .5, .35], leafCol: [.7, .6, .4], verb: [3.5, 1.8],
  weather: [W_('Clear', 3, { wind: .5, cloud: .2 }), W_('Gale', 2, { wind: 1, dust: .5, fog: .2 }), W_('Sand haze', 2, { dust: .8, fog: .4, wind: .7 }), W_('Night bloom', 1, { motes: 1, wind: .2 })],
  path: [[meander(64), 64], [meander(40), 40], [meander(20), 20], [meander(0), 0], [meander(-20), -20], [0, -50], [0, -70]],
  flats: [{ x: 0, z: -50, r: 16, h: 0 }, { x: -2, z: -26, r: 7, h: .5 }],
  height(x, z) { const d = Math.abs(x - meander(z)); let h = smooth(clamp((d - 9) / 10, 0, 1)) * 24; h += Math.floor((h + fbm(x * .1, z * .1) * 2) / 3) * .6; h += fbm(x * .05, z * .05) * 2; if (z < -36) h *= smooth(clamp((z + 70) / 30, 0, 1)) * .6 + .4; return h; },
  pathH() { return 0; }, pathW: 4,
  mat(x, z, h, dp) { if (h > 3) return 'stone'; return fbm(x * .1, z * .1) > .6 ? 'grass' : 'sand'; },
  ground(m, x, z, h, rng) { const band = Math.floor(h / 3) % 3; const v = vnoise(x * .3, z * .3) * .06; if (m === 'stone') return [[.72, .45, .3], [.82, .58, .38], [.62, .38, .28]][(band + 3) % 3].map(c => c + v); if (m === 'grass') return [.5 + v, .5 + v, .3]; return [.78 + v, .6 + v, .42 + v]; },
  grassOn: m => m === 'grass', grassCol: () => [.6, .58, .35], grassDensity: .8, flowers: .04, flowerCols: [[.8, .5, 1]], flowerGlow: .7,
  spawn: [meander(60), 60, Math.PI], boss: { id: 'resonant', x: 0, z: -50 },
  pois: [{ n: 'Canyon mouth', x: meander(60), z: 60 }, { n: 'Wind tunnel', x: meander(26), z: 26 }, { n: 'Observatory ledge', x: 18, z: 4 }, { n: 'Monument', x: -2, z: -26 }, { n: 'Shrine cave', x: -18, z: 34 }, { n: 'Hollow amphitheatre', x: 0, z: -50 }],
  build(rng) {
    // wind tunnel: periodic gusts push across the path; boulders give cover
    let gt = 0; World.machines.push({ update: dt => { gt += dt; const g = Math.sin(gt * .9) > .3; Game.tunnelGust = g; const p = Player.ch; if (g && p.z > 18 && p.z < 34 && !Game.lockInput()) { let cover = false; for (const pr of World.props) if (pr.kind === 'rock' && Math.abs(pr.z - p.z) < 1.2 && pr.x > p.x && pr.x - p.x < 3) cover = true; for (const c of World.cols) if (c.kind === 'rock' && c.r && Math.abs(c.z - p.z) < c.r + .4 && c.x > p.x && c.x - p.x < c.r + 2.5) cover = true; if (!cover) { Player.vx -= dt * 26; FX.dust(p.x + 3, p.y + 1, p.z, 1, [.7, .55, .4]); } }
      if (g && Math.random() < .5) FX.spawn(meander(26) + 10, rng.range(.5, 4), rng.range(18, 34), -12, 0, 0, 1.4, .5, [.8, .65, .5], false, 0, 0); } });
    for (const z of [20, 24, 28, 32]) Lib.rock(meander(z) + rng.range(-1, 3), z, 1.3, [.6, .4, .3], rng);
    // climbable wall to the observatory ledge
    const lx = 18, lz = 4; const lh = World.hf.at(lx, lz);
    Lib.platform(lx - 1.1, lh + .2, lz, 10.2, 8, [.6, .45, .35]);
    // dishes: align all three toward the monument
    const dishes = [[lx, lz, 1.2], [-14, -12, 2.5], [8, -36, .3]]; let solved = () => flag('dishes6');
    dishes.forEach(([x, z, a0], i) => { const def = Beams.add({ region: 5, kind: 'dish', src: [x, z], dir: a0, target: [-2, -26], col: [.8, .9, 1], h: 2.2, mirrors: [], onSolve: () => { setFlag('dish6_' + i); if ([0, 1, 2].every(k => flag('dish6_' + k)) && !solved()) { setFlag('dishes6'); Game.event('puzzle_dishes'); setTimeout(() => Game.dialogue('monument'), 1200); } } });
      K.inter({ x, z: z + 1.6, label: 'Rotate observatory dish', kind: 'dish', on: () => !def.solved, use: () => { def.dir = (def.dir + Math.PI / 12) % TAU; Audio2.sfx('machine', [x, 2, z]); } });
      World.machines.push({ draw: () => { const gy = World.hf.at(x, z) + (i === 0 ? .2 : 0); A34.trs(_W, x, gy + 1, z, 0, 0, 0, .5, 2, .5); R.inst('cyl', _W, .4, .38, .36, 0); A34.trs(_W, x, gy + 2.3, z, def.dir, -1.2, 0, 2.4, .25, 2.4); R.inst('cyl', _W, .8, .8, .82, .1, F_REFL); } }); });
    World.addCol({ x0: 11.6, x1: 12.2, z0: lz - 3, z1: lz + 3, y0: -5, y1: lh + .25, climb: true, kind: 'vine', surf: 'grass' }); for (let i = 0; i < 6; i++) Lib.vines(11.5, lh + .2, lz - 3 + i, lh - World.hf.at(10, lz) + .5, [.4, .5, .3], rng, 3);
    World.B(11.9, lz).box(11.9, (lh + World.hf.at(11, lz)) / 2, lz, .4, lh - World.hf.at(11, lz), 6, [.55, .4, .3], { flags: F_OCC });
    // monument (Vael council recording) + resonance key
    Lib.monolith(-2, World.hf.at(-2, -26), -26, 2.4, 9, [.55, .45, .4], [.6, .9, 1]); Lib.arch(-2, -30, 8, 6, 0, [.6, .48, .38], { glyph: [.6, .9, 1] });
    K.cache(1, -24, { label: 'Take the Resonance Key', item: 'key', id: 'key', on: () => flag('dishes6') });
    // Orin's request: the cantor stone in the shrine cave
    const sx = -18, sz = 34; Lib.arch(sx, sz, 4, 3.5, Math.PI / 2, [.55, .42, .32], { glyph: [.9, .6, 1] });
    K.inspect(sx - 2, sz, 'Vael script, half eroded. The scanner renders it: "The cantor stone must never return to a Cantor."', { label: 'Read the inscription', on: () => flag('orin_ask') });
    K.inter({ x: sx - 3, z: sz + 1, label: 'Take the cantor stone', kind: 'pickup', on: () => flag('orin_ask') && !Game.has('stone') && !flag('stone_given'), use: () => { Game.giveItem('stone'); Game.event('item_stone'); } });
    World.machines.push({ draw: () => { if (!flag('orin_ask') || Game.has('stone') || flag('stone_given')) return; A34.trs(_W, sx - 3, World.hf.at(sx - 3, sz + 1) + 1, sz + 1, Game.time, 0, 0, .3, .4, .3); R.inst('oct', _W, .9, .6, 1, 1, F_UNLIT); } });
    K.trig(meander(36), 36, 8, () => { if (!flag('orin_ask')) Game.dialogue('orin_ask'); });
    // hidden cave → freq #6
    K.hidden(1, 14, -14, 'Crystal stair resolved', g => { const by = World.hf.at(14, -14); for (let i = 0; i < 6; i++) K.hplat(g, 14 + i * 1.2, by + 1.5 + i * 1.6, -14 - i * 1.8, 2, 2, [.8, .6, 1]); });
    const fy = World.hf.at(14, -14) + 1.5 + 5 * 1.6; Lib.platform(21, fy + 1.6, -24, 4, 4, [.7, .55, .45]); K.freq(21, -24, 6, { y: fy + 1.6 - World.hf.at(21, -24) });
    // amphitheatre
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; Lib.crystal(Math.cos(a) * 18, -50 + Math.sin(a) * 18, rng.range(1, 2), [.7, .5, 1], rng, .7); }
    K.trig(0, -50, 15, () => { if (Game.has('key') && !flag('boss_resonant')) Boss.start('resonant', 0, -52, () => { setFlag('boss_resonant'); Game.event('boss_resonant'); }); }, { once: false, cond: () => Game.has('key') && !flag('boss_resonant') && !Boss.active });
    K.exit(0, -66, () => flag('boss_resonant'), () => Game.completeChapter());
    K.checkpoint(meander(54) + 3, 54, 'c6a', 'Canyon Mouth'); K.checkpoint(meander(-10) + 3, -10, 'c6b', 'Monument Approach');
    K.enemy('stalker', meander(44) + 2, 44); K.enemy('watcher', meander(10), 10); K.enemy('watcher', 0, -14); K.enemy('swarm', 2, -34); K.enemy('swarm', -2, -36); K.enemy('swarm', 4, -36); K.enemy('brute', meander(0) - 3, 0); K.enemy('burrower', meander(14), 14); K.enemy('crawler', -10, -20);
    for (let i = 0; i < 10; i++) { const z = rng.range(-60, 60); Lib.arch(meander(z) + rng.range(-3, 3), z, rng.range(6, 10), rng.range(5, 9), rng() * .4, [.7, .5, .35]); }
    for (let i = 0; i < 40; i++) { const z = rng.range(-70, 70), x = meander(z) + rng.range(-10, 10); if (World.dPath(x, z) < 3) continue; Lib.rock(x, z, rng.range(.4, 1.4), [.68, .45, .32], rng); }
    for (let i = 0; i < 18; i++) { const z = rng.range(-70, 70), x = meander(z) + (rng() < .5 ? -1 : 1) * rng.range(5, 9); Lib.crystal(x, z, rng.range(.5, 1.2), [.75, .55, 1], rng, .6); }
    for (let i = 0; i < 30; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); Lib.spire(x, z, rng.range(8, 20), rng.range(1.2, 2.4), [.66, .44, .3], rng); }
  },
});

/* ---------------- 07 · SILENT CAPITAL · The City Without Names ---------------- */
REGIONS.push({
  id: 'capital', name: 'Silent Capital', chapter: 'The City Without Names', num: 'VII', seed: 707, sideYaw: Math.PI / 2,
  pal: { dayTop: '#2a1e4a', dayHor: '#e08a6a', dayFog: '#7a5070', sun: '#ffd0a0', dusk: '#ff7a60', nightTop: '#06041a', nightHor: '#2a1838', nightFog: '#1a1028', moon: '#b0a0ff', amb: '#6a5a80', gnd: '#3a2a38', planet: '#c090d0', planetDir: [.1, .4, -1], sunAz: .2 },
  dayLen: 420, t0: .7, music: { root: 103.8, scale: [0, 2, 4, 6, 7, 11], prog: [0, 3, 5, 4] }, dustCol: [.6, .55, .5], leafCol: [.7, .7, .6], verb: [4, 1.6], aurora: 1,
  weather: [W_('Dusk', 3, { motes: .6, wind: .3, cloud: .3 }), W_('Signal veil', 2, { motes: 1, wind: .2, fog: .3 }), W_('Storm', 1, { rain: .7, storm: .6, wind: .7, cloud: 1, fog: .3 })],
  path: [[0, 64], [0, 36], [0, 14], [0, -10], [0, -46], [0, -70]],
  flats: [{ x: 0, z: 12, r: 22, h: .5 }, { x: -36, z: 10, r: 10, h: .5 }, { x: 36, z: 10, r: 10, h: .5 }, { x: 0, z: -46, r: 18, h: 1.5 }, { x: 0, z: 40, r: 8, h: .5 }],
  height(x, z) { return .3 + fbm(x * .03, z * .03) * 1.5 + Math.max(0, Math.abs(x) - 50) * .3; }, pathH() { return .5; }, pathW: 4,
  mat(x, z) { return 'stone'; },
  ground(m, x, z, h, rng) { const t = (Math.floor(x / 3) + Math.floor(z / 3)) & 1; const ring = Math.abs(Math.hypot(x, z - 12) % 8 - 4) < .3; const v = vnoise(x * .3, z * .3) * .05; return ring ? [.62, .55, .42] : [.68 + t * .05 + v, .64 + t * .05 + v, .56 + v]; },
  grassOn: (m, x, z) => fbm(x * .2, z * .2) > .64, grassCol: () => [.5, .55, .4], grassDensity: .6,
  spawn: [0, 60, Math.PI], boss: { id: 'firstvoice', x: 0, z: -46 },
  pois: [{ n: 'Great gate', x: 0, z: 52 }, { n: 'Grand plaza', x: 0, z: 12 }, { n: 'Memorial district', x: -36, z: 10 }, { n: 'Archive district', x: 36, z: 10 }, { n: 'Transit station', x: 0, z: 36 }, { n: 'The Spire', x: 0, z: -46 }],
  build(rng) {
    const stone = [.74, .7, .6], glow = [.5, .95, 1];
    Lib.arch(0, 52, 10, 9, 0, stone, { glyph: glow }); K.door(0, 52, 9, 8, 0, () => Game.has('key'), [.5, .47, .4], { label: 'Great gate (needs a resonance key)', use: () => Audio2.sfx('deny') });
    for (const [x, z, h] of [[-26, -14, 30], [26, -14, 34], [-30, 34, 22], [30, 36, 26], [-50, -40, 40], [50, -36, 36], [-18, -60, 28], [18, -60, 30]]) Lib.vaelTower(x, z, h, stone, glow, rng);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; Lib.pillar(Math.cos(a) * 20, 12 + Math.sin(a) * 20, 7, .7, stone, { glyph: glow }); }
    // floating monoliths — resonance-suspended, bobbing; walkable with care
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2, r = 34 + (i % 2) * 8; const x = Math.cos(a) * r, z = 12 + Math.sin(a) * r * .7; const by = World.hf.at(x, z) + 5 + (i % 3) * 2; let t = i;
      const col = World.addCol({ x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6, y0: by - 4, y1: by, dynamic: true, kind: 'platform', surf: 'stone', dx: 0, dz: 0 });
      World.machines.push({ update: dt => { t += dt; const ny = by + Math.sin(t * .6) * .5; col.dy = ny - col.y1; col.y1 = ny; col.y0 = ny - 4; }, draw: () => { A34.trs(_W, x, col.y1 - 2, z, i, 0, 0, 3.2, 4, 3.2); R.inst('cube', _W, .66, .62, .55, 0, F_OCC | F_REFL); A34.trs(_W, x, col.y1 - 2, z, i, 0, 0, 3.25, .3, 3.25); R.inst('cube', _W, glow[0], glow[1], glow[2], 1); } }); }
    // memorial: light the memorial (mirrors)
    Lib.monolith(-30, World.hf.at(-30, -1), -1, 3, 6, [.5, .48, .45], glow); for (let i = 0; i < 9; i++) Lib.pillar(-42 + (i % 3) * 6, 14 + Math.floor(i / 3) * 4, 2, .3, stone);
    Beams.add({ region: 6, src: [-48, 20], dir: Math.PI / 2, target: [-30, 2], col: [1, .9, .7], verb: 'Turn memorial prism', mirrors: [{ x: -40, z: 20, ang: 0 }, { x: -40, z: 8, ang: 0 }, { x: -30, z: 8, ang: 0 }], step: Math.PI / 4, onSolve: () => { setFlag('memorial7'); Game.event('district'); Game.readLog('l_memorial'); } });
    // archive: 3-dial tune → the voiceprint
    Lib.monolith(36, World.hf.at(36, 10), 10, 4, 7, [.45, .45, .5], glow); Lib.terminal(33, 6, 0, glow);
    K.inter({ x: 33, z: 7.5, label: 'Reconstruct archived recording', kind: 'puzzle', on: () => !flag('archive7'), use: () => Puzzle.open({ type: 'tune', dials: 3, title: 'Archive Spindle 0', sub: 'Recording: CONTACT / FIRST ANSWER', help: 'Three dials. ↑/↓ to select. Listen for the beating to slow.' }, () => { setFlag('archive7'); Game.event('district'); setTimeout(() => Game.dialogue('voiceprint'), 600); }) });
    // transit: power the tram
    Lib.hall(0, 38, 8, 12, 6, 0, { metal: stone, rust: [.5, .5, .55] }); let tram = 0;
    K.inter({ x: 3, z: 36, label: 'Restore the transit line', kind: 'puzzle', on: () => !flag('transit7'), use: () => Puzzle.open({ type: 'route', w: 7, h: 5, multi: true, seed: 77, title: 'Transit Conductor', sub: 'Feed the line and the station', help: 'Route both outputs.' }, () => { setFlag('transit7'); Game.event('district'); Audio2.sfx('power', [0, 2, 36]); }) });
    World.machines.push({ update: dt => { if (flag('transit7')) tram += dt * .1; }, draw: () => { const z = 36 - ((tram * 60) % 100); A34.trs(_W, -8, World.hf.at(-8, z) + 3.4, z, 0, 0, 0, 2.6, 2.4, 7); R.inst('cube', _W, .7, .66, .58, 0, F_REFL | F_OCC); A34.trs(_W, -8, World.hf.at(-8, z) + 3.6, z, 0, 0, 0, 2.65, .5, 6.5); R.inst('cube', _W, glow[0], glow[1], glow[2], flag('transit7') ? 1 : .1); } });
    for (let z = -60; z < 60; z += 4) World.B(-8, z).box(-8, World.hf.at(-8, z) + 2, z, .4, .3, 4, [.5, .5, .55]);
    K.log(-6, 40, 'l_transit'); K.log(0, 20, 'l_plaza');
    // spire gate needs all three districts
    const districts = () => flag('memorial7') && flag('archive7') && flag('transit7');
    K.door(0, -26, 8, 7, 0, districts, [.55, .52, .45]); Lib.arch(0, -26, 9, 8, 0, stone, { glyph: glow });
    Lib.vaelTower(0, -60, 44, stone, glow, rng);
    K.trig(0, -46, 15, () => { if (districts() && !flag('boss_firstvoice')) Boss.start('firstvoice', 0, -50, () => { setFlag('boss_firstvoice'); Game.event('boss_firstvoice'); }); }, { once: false, cond: () => districts() && !flag('boss_firstvoice') && !Boss.active });
    K.exit(0, -66, () => flag('betrayal'), () => Game.completeChapter());
    // freq #7 on a high floating monolith
    K.hidden(1, -44, -24, 'Resonant steps resolved', g => { const by = World.hf.at(-44, -24); for (let i = 0; i < 4; i++) K.hplat(g, -44 - i * 2, by + 1.8 + i * 2.2, -24 - i * 2.2, 2, 2, glow); });
    Lib.platform(-54, World.hf.at(-44, -24) + 11.5, -34, 3, 3, stone); K.freq(-54, -34, 7, { y: World.hf.at(-44, -24) + 11.5 - World.hf.at(-54, -34) });
    K.checkpoint(5, 56, 'c7a', 'Great Gate'); K.checkpoint(6, -20, 'c7b', 'Spire Steps');
    K.enemy('mimic', -20, 30); K.enemy('watcher', 20, 0); K.enemy('watcher', -20, -4); K.enemy('brute', 10, 20); K.enemy('drifter', -40, 16); K.enemy('drifter', 40, 16); K.enemy('stalker', 30, -20); K.enemy('swarm', -6, -8); K.enemy('swarm', -4, -10); K.enemy('swarm', -8, -10);
    for (let i = 0; i < 24; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (Math.hypot(x, z - 12) < 26 || World.dPath(x, z) < 6) continue; const w = rng.range(4, 9); Lib.house(x, z, w, w * .8, Math.round(rng() * 3) * Math.PI / 2, { base: stone, wall: [.7, .66, .58], roof: [.4, .5, .6], moss: [.4, .5, .3] }, rng, { flat: true, h: rng.range(4, 9) }); }
    K.silhouette(-12, -40, { r: 18 }); K.silhouette(14, 24, { r: 16 });
  },
});

/* ---------------- 08 · FREQUENCY CORE · The Last Frequency ---------------- */
const CORE_ISLES = [[0, 60, 9], [-28, 34, 7], [28, 32, 7], [-26, 2, 7], [0, 16, 10], [26, -6, 8], [0, -32, 15], [0, -60, 10]];
const CORE_LINKS = [[[0, 60], [0, 16]], [[0, 16], [-28, 34]], [[0, 16], [28, 32]], [[0, 16], [-26, 2]], [[0, 16], [26, -6]], [[26, -6], [0, -32]], [[0, -32], [0, -60]]];
REGIONS.push({
  id: 'core', name: 'Frequency Core', chapter: 'The Last Frequency', num: 'VIII', seed: 808, sideYaw: Math.PI / 2, edge: 'void', voidBelow: true, killY: -20,
  pal: { dayTop: '#05030c', dayHor: '#3a1040', dayFog: '#1a0828', sun: '#ff70c0', dusk: '#ff3080', nightTop: '#02010a', nightHor: '#200830', nightFog: '#12061c', moon: '#60e0ff', amb: '#4a2a60', gnd: '#200a20', planet: '#000000', planetDir: [0, 1, 0], sunAz: .8 },
  dayLen: 0, t0: .3, music: { root: 73.4, scale: [0, 1, 3, 6, 7, 10], prog: [0, 1, 4, 3] }, dustCol: [.6, .3, .6], leafCol: [.9, .3, .7], verb: [5, 1.4], aurora: .6, noPlanet: true,
  weather: [W_('Distortion', 3, { motes: 1, fog: .3, wind: .2 }), W_('Signal storm', 1.5, { motes: 1, storm: .6, fog: .4, wind: .5 })],
  path: [[0, 60], [0, 16], [26, -6], [0, -32], [0, -60]],
  flats: CORE_ISLES.map(([x, z, r]) => ({ x, z, r, h: 0, blend: 1 })),
  height(x, z) { return fbm(x * .1, z * .1) * .6; }, pathH() { return 0; }, pathW: 2,
  mat(x, z, h, dp) { for (const [ix, iz, r] of CORE_ISLES) if (Math.hypot(x - ix, z - iz) < r) return Math.hypot(x - ix, z - iz) > r - 1.5 ? 'crystal' : 'metal';
    for (const [a, b] of CORE_LINKS) { const abx = b[0] - a[0], abz = b[1] - a[1]; const t = clamp(((x - a[0]) * abx + (z - a[1]) * abz) / (abx * abx + abz * abz), 0, 1); if (t > .35 && t < .6 && !(a[0] === 0 && b[1] === -60)) continue; if (Math.hypot(x - a[0] - abx * t, z - a[1] - abz * t) < 1.8) return 'metal'; }
    return 'void'; },
  ground(m, x, z, h, rng) { const v = vnoise(x * .5, z * .5) * .08; if (m === 'crystal') return [.5, .2, .5]; const pl = ((Math.floor(x) ^ Math.floor(z)) & 3) === 0; return pl ? [.1, .35, .4] : [.12 + v, .1 + v, .16 + v]; },
  grassOn: () => false, grassCol: () => [1, 1, 1], grassDensity: 0,
  spawn: [0, 58, Math.PI], boss: { id: 'chorus', x: 0, z: -32 },
  pois: [{ n: 'Descent', x: 0, z: 60 }, { n: "Mara's memory", x: -28, z: 34 }, { n: "Nova's memory", x: 28, z: 32 }, { n: "Elias's memory", x: -26, z: 2 }, { n: 'Hub', x: 0, z: 16 }, { n: 'Antechamber', x: 26, z: -6 }, { n: 'The Choir floor', x: 0, z: -32 }, { n: 'The Heart', x: 0, z: -60 }],
  build(rng) {
    const neon = [.3, .9, 1], mag = [1, .3, .7];
    // gaps in the links are bridged by resolved resonance and moving shards
    CORE_LINKS.forEach(([a, b], i) => { if (a[0] === 0 && b[1] === -60) return; const mx = lerp(a[0], b[0], .475), mz = lerp(a[1], b[1], .475); const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * .25; const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
      if (i % 2) { K.hidden(i + 1, mx, mz, 'Resonance bridge resolved', g => { const n = Math.ceil(len / 2.2); for (let k = 0; k <= n; k++) { const t = (k / n - .5) * len; K.hplat(g, mx + Math.sin(ang) * t, -.05, mz + Math.cos(ang) * t, 2.2, 2.2, neon); } }); }
      else { const col = World.addCol({ x0: mx - 1.4, x1: mx + 1.4, z0: mz - 1.4, z1: mz + 1.4, y0: -2, y1: 0, dynamic: true, kind: 'platform', surf: 'crystal' }); let t = i;
        World.machines.push({ update: dt => { t += dt * .5; const s = Math.sin(t) * len * .45; const nx = mx + Math.sin(ang) * s, nz = mz + Math.cos(ang) * s; const cx = (col.x0 + col.x1) / 2, cz = (col.z0 + col.z1) / 2; col.dx = nx - cx; col.dz = nz - cz; col.dy = 0; col.x0 += col.dx; col.x1 += col.dx; col.z0 += col.dz; col.z1 += col.dz; }, draw: () => { A34.trs(_W, (col.x0 + col.x1) / 2, -.5, (col.z0 + col.z1) / 2, t, 0, 0, 2.8, 1, 2.8); R.inst('cube', _W, .15, .12, .2, 0, F_REFL); A34.trs(_W, (col.x0 + col.x1) / 2, -.02, (col.z0 + col.z1) / 2, t, 0, 0, 2.6, .05, 2.6); R.inst('cube', _W, mag[0], mag[1], mag[2], .8); } }); } });
    // floating debris, rings, tendrils — unstable geometry
    for (let i = 0; i < 40; i++) { const x = rng.range(-70, 70), y = rng.range(-14, 22), z = rng.range(-70, 70), s = rng.range(.4, 2.2), sp = rng.range(.1, .5), ph = rng() * 6; World.machines.push({ draw: () => { if (dist2(x, z, Cam.at[0], Cam.at[2]) > 4900) return; A34.trs(_W, x, y + Math.sin(Game.time * sp + ph) * 1.5, z, Game.time * sp + ph, Game.time * sp * .7, 0, s, s, s); R.inst(i % 3 ? 'cube' : 'oct', _W, .12, .1, .16, i % 5 ? 0 : .8, F_OCC); } }); }
    for (let i = 0; i < 6; i++) Lib.ring(rng.range(-40, 40), rng.range(4, 16), rng.range(-50, 50), rng.range(4, 9), .5, i % 2 ? neon : mag, { ry: rng() * 3, rx: rng() * 1.5, em: .9 });
    for (const [x, z, r] of CORE_ISLES) for (let k = 0; k < 4; k++) { const a = rng() * TAU; Lib.tendril(x + Math.cos(a) * (r - 1), z + Math.sin(a) * (r - 1), rng.range(4, 9), [.3, .08, .2], rng, mag); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; Lib.tendril(Math.cos(a) * 14, -32 + Math.sin(a) * 14, rng.range(6, 12), [.25, .06, .18], rng, neon); }
    // memory chambers: each companion meets the life they were printed from
    const mem = (id, x, z, log) => { Lib.ring(x, 3, z, 3.2, .35, [.9, .9, 1], { em: 1 }); K.log(x + 2, z + 2, log); K.inter({ x, z, r: 3, label: 'Enter the memory', kind: 'memory', on: () => !flag('mem_' + id), use: () => { setFlag('mem_' + id); Game.event('memory'); Game.dialogue('mem_' + id); } }); World.light(x, 3, z, 9, [.8, .9, 1], 1); };
    mem('mara', -28, 34, 'l_mem_mara'); mem('nova', 28, 32, 'l_mem_nova'); mem('elias', -26, 2, 'l_mem_elias');
    // antechamber: harmonise the core (3 dials)
    Lib.monolith(26, 0, -10, 2, 6, [.15, .12, .2], neon);
    K.inter({ x: 26, z: -6, label: 'Harmonise the Core', kind: 'puzzle', on: () => !flag('harmony8') && ['mara', 'nova', 'elias'].every(k => flag('mem_' + k)), use: () => Puzzle.open({ type: 'tune', dials: 3, title: 'The Choir Key', sub: 'Every relay you woke is singing. Bring them into one chord.', help: 'Three dials. The chord resolves when all are matched.' }, () => { setFlag('harmony8'); Game.event('harmony'); Game.dialogue('orin_reveal'); }) });
    K.door(13, -18, 4, 4, Math.PI / 4 * 0, () => flag('harmony8'), [.2, .15, .25]);
    K.trig(0, -32, 14, () => { if (flag('harmony8') && !flag('boss_chorus')) Boss.start('chorus', 0, -34, () => { setFlag('boss_chorus'); Game.event('boss_chorus'); setTimeout(() => Game.dialogue('heart'), 1500); }); }, { once: false, cond: () => flag('harmony8') && !flag('boss_chorus') && !Boss.active });
    // the heart
    for (let i = 0; i < 3; i++) Lib.ring(0, 6 + i * 2, -60, 5 + i * 2.5, .5, i === 1 ? mag : neon, { rx: Math.PI / 2 + i * .4, em: 1 });
    World.machines.push({ draw: () => { const s = 2.4 + Math.sin(Game.time * 2.2) * .25; A34.trs(_W, 0, 7, -60, Game.time * .3, Game.time * .2, 0, s, s, s); R.inst('ico', _W, 1, .5, .8, 1, F_UNLIT); Game.flashLight(0, 7, -60, [1, .4, .8], 18, .01); } });
    K.inter({ x: 0, z: -55, r: 4, label: 'Approach the Heart', kind: 'heart', on: () => flag('boss_chorus') && !flag('ending'), use: () => Game.dialogue('heart') });
    K.freq(-6, -36, 8, { on: () => true });
    K.log(4, 56, 'l_descent'); K.checkpoint(5, 56, 'c8a', 'Descent'); K.checkpoint(5, 14, 'c8b', 'Hub');
    K.enemy('mimic', -24, 30); K.enemy('mimic', 24, 28); K.enemy('swarm', 0, 10); K.enemy('swarm', 2, 12); K.enemy('swarm', -2, 12); K.enemy('watcher', 22, -2); K.enemy('drifter', -22, 0); K.enemy('brute', 4, 20);
  },
});
