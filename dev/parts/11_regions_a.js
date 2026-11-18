
/* =====================================================================
   REGIONS — eight connected chapters (data + builders)
   ===================================================================== */
const W_ = (name, w, o) => Object.assign({ name, w, rain: 0, fog: 0, ash: 0, spores: 0, wind: .3, storm: 0, dust: 0, motes: 0, cloud: .3 }, o);
const REGIONS = [];
const flag = k => !!GS().flags[k];
const setFlag = (k, v = 1) => { GS().flags[k] = v; };

/* ---------------- 01 · ASHEN FRONTIER · Signalfall ---------------- */
REGIONS.push({
  id: 'ashen', name: 'Ashen Frontier', chapter: 'Signalfall', num: 'I', seed: 101, sideYaw: Math.PI / 2,
  pal: { dayTop: '#2b3156', dayHor: '#c98a66', dayFog: '#7a5a58', sun: '#ffd2a0', dusk: '#ff8a50', nightTop: '#07081a', nightHor: '#2a2340', nightFog: '#1e1a2c', moon: '#8a9ad0', amb: '#5a5070', gnd: '#3a2a28', planet: '#d09070', planetDir: [-.5, .35, -.8], sunAz: .6 },
  dayLen: 480, t0: .37, music: { root: 110, scale: [0, 2, 3, 7, 8], prog: [0, 3, 2, 4] }, dustCol: [.42, .38, .4], leafCol: [.6, .4, .2], killY: -30, verb: [2, 3],
  weather: [W_('Clear', 3, { ash: .4, wind: .5, cloud: .2 }), W_('Ashfall', 3, { ash: 1, wind: .6, fog: .25, cloud: .5 }), W_('Dust storm', 1.5, { dust: 1, wind: 1, fog: .6, ash: .4 }), W_('Electrical storm', 1, { storm: 1, wind: .8, ash: .5, cloud: .9, fog: .2 })],
  path: [[2, 62], [10, 44], [0, 26], [-14, 8], [-4, -6], [10, -18], [4, -32], [0, -46], [0, -70]],
  flats: [{ x: 3, z: 58, r: 7, h: .5 }, { x: -16, z: 8, r: 9, h: 1 }, { x: 12, z: -20, r: 6, h: 2 }, { x: 0, z: -46, r: 15, h: 0 }, { x: -46, z: -16, r: 7, h: 10, blend: 2 }],
  height(x, z) { let h = fbm(x * .03, z * .03) * 8 + ridge(x * .05 + 3, z * .05) * 4 - 4; const m = fbm(x * .02 + 10, z * .02); h += smooth(clamp((m - .58) * 12, 0, 1)) * 7; return h; },
  pathH(x, z) { return fbm(x * .03, z * .03) * 6 - 2; }, pathW: 2.2,
  mat(x, z, h, dp) { if (dp < 2) return 'ash'; const n = fbm(x * .08 + 4, z * .08); if (n > .58) return 'grass'; if (n < .3) return 'stone'; if (hash(x * .3 | 0, z * .3 | 0) > .985) return 'crystal'; return 'ash'; },
  ground(m, x, z, h, rng) { const v = vnoise(x * .4, z * .4) * .08; if (m === 'grass') return [.4 + v, .27 + v, .16]; if (m === 'stone') return [.33 + v, .3 + v, .33 + v]; if (m === 'crystal') return [.36, .28, .46]; return [.22 + v, .2 + v, .24 + v * 1.4]; },
  grassOn: m => m === 'grass', grassCol: (x, z, r) => r() < .5 ? [.62, .42, .2] : [.5, .3, .18], grassDensity: 1.4, flowers: .03, flowerCols: [[1, .9, .7], [.8, .9, 1]], flowerGlow: .6,
  spawn: [2, 54, Math.PI], boss: { id: 'guardian', x: 0, z: -46 }, tuftCol: [.5, .38, .26],
  pois: [{ n: 'Landing capsule', x: 3, z: 58 }, { n: 'Drop pod', x: 16, z: 42 }, { n: 'Survey outpost', x: -16, z: 8 }, { n: 'Relay tower', x: 12, z: -20 }, { n: 'Crater', x: 0, z: -46 }],
  build(rng) {
    const P = { metal: [.42, .42, .46], light: [1, .3, .2] };
    // crash site
    Lib.capsule(3, 58, .4, rng); Lib.debrisField(6, 52, 9, 50, [[.5, .5, .52], [.3, .3, .32], [.6, .35, .2]], rng);
    for (let i = 0; i < 6; i++) Lib.hullPlate(3 + rng.range(-10, 10), 50 + rng.range(-8, 4), rng.range(.8, 1.6), rng() * 6, [.55, .55, .57], rng);
    K.inspect(3.5, 56.5, '', { label: 'Inspect capsule console', fx: () => Game.readLog('l_manifest') });
    K.checkpoint(9, 51, 'c1a', 'Crash Site');
    // drop pod with comm gear
    Lib.capsule(16, 42, 2.2, rng); Lib.debrisField(16, 42, 5, 25, [[.5, .5, .52], [.3, .3, .32]], rng);
    K.cache(14, 40, { label: 'Recover communication equipment', item: 'scanner', id: 'scanner' });
    K.trig(8, 46, 5, () => Game.event('reach_site'));
    // outpost
    Lib.house(-19, 6, 4.5, 3.5, 0, { base: [.3, .3, .32], wall: [.55, .55, .5], roof: [.4, .38, .36], moss: [.3, .3, .2] }, rng, { flat: true, broken: true });
    Lib.house(-11, 12, 4, 3.2, Math.PI / 2, { base: [.3, .3, .32], wall: [.6, .52, .42], roof: [.35, .33, .32], moss: [.3, .3, .2] }, rng, { flat: true });
    Lib.terminal(-17, 9.8, Math.PI, [.4, .9, 1]); K.log(-17, 10.6, 'l_outpost', { noMesh: true });
    K.radio(-12, 4, ['…if you\'re hearing this…', '…don\'t… answer…', '…[static]… it listens for… ', '…repeat: do not answer…']);
    Lib.crateStack(-22, 12, 2, [.4, .33, .22], rng); Lib.crateStack(-9, 4, 1, [.4, .33, .22], rng); K.lampOnApproach(-14, 2, [1, .8, .5]);
    K.cache(-20, 9.5, { label: 'Open locker', item: 'burst', id: 'burst', ry: Math.PI / 2 });
    K.dragMarks(-17, 4, -30, -10); K.trig(-16, 8, 10, () => Game.event('reach_outpost'));
    for (let i = 0; i < 4; i++) Props.add(i % 2 ? 'barrel' : 'crate', -14 + rng.range(-5, 5), 6 + rng.range(-4, 4));
    K.enemy('drifter', -18, 0, { patrol: [[-18, 0], [-8, 10], [-22, 14]] }); K.enemy('drifter', -6, 14);
    // relay tower
    Lib.tower(12, -20, 16, P, rng, { dish: true }); K.trig(12, -20, 9, () => Game.event('reach_tower'));
    K.inter({ x: 13.5, z: -18, label: 'Tune relay receiver', kind: 'puzzle', on: () => !flag('relay1') && Game.has('scanner'), use: () => Puzzle.open({ type: 'tune', dials: 1, title: 'Relay Tower R-7', sub: 'Match the source carrier', help: 'Slide the frequency until your trace matches the amber source. ←/→ or drag.', target: [.62] }, () => { setFlag('relay1'); Game.event('puzzle_relay1'); Game.readLog('l_relay'); setTimeout(() => Game.dialogue('mara_radio'), 2500); }) });
    K.checkpoint(18, -12, 'c1b', 'Relay Tower');
    K.enemy('crawler', 20, -26); K.enemy('crawler', 6, -24); K.enemy('stalker', 22, 2); K.enemy('drifter', 2, 28);
    // crater arena
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; Lib.rock(Math.cos(a) * 19, -46 + Math.sin(a) * 19, rng.range(1, 2.2), [.32, .3, .34], rng); }
    Lib.crystal(-8, -52, 1.2, [.6, .4, 1], rng); Lib.crystal(9, -40, .9, [.6, .4, 1], rng);
    K.trig(0, -46, 15, () => { if (flag('relay1') && !flag('boss_guardian')) Boss.start('guardian', 0, -48, () => { setFlag('boss_guardian'); Game.event('boss_guardian'); Game.spawnCrew(); }); }, { once: false, cond: () => flag('relay1') && !flag('boss_guardian') && !Boss.active });
    K.npc('mara', 8, -32, Math.PI, () => Game.dialogue(flag('mara_joined') ? 'mara_idle' : 'mara_meet'), { on: () => flag('boss_guardian') });
    K.exit(0, -66, () => flag('mara_joined'), () => Game.completeChapter());
    // hidden ridge path to the mesa (scanner reveals Vael steps)
    K.hidden(1, -34, -8, 'Vael stairway resolved', g => { const steps = [[-34, -8, 1.4], [-37, -10, 3], [-40, -12, 4.6], [-42.5, -13.5, 6.2], [-44, -15, 7.8]]; for (const [x, z, h] of steps) K.hplat(g, x, World.hf.at(-34, -8) + h, z, 2.2, 2.2, [.5, .9, 1]); });
    K.trig(-46, -16, 4, () => Game.event('reach_mesa'));
    K.freq(-47, -17, 1); K.log(-45, -18, 'l_glyph');
    // landmarks + scatter
    Lib.tower(-52, -30, 14, P, rng, { broken: true, dead: true }); Lib.tower(56, 12, 18, P, rng, { dead: true }); Lib.tower(-48, 46, 12, P, rng, { broken: true, dead: true });
    K.silhouette(-30, -36, { r: 22 });
    for (let i = 0; i < 26; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 6) continue; Lib.spire(x, z, rng.range(4, 11), rng.range(.8, 1.8), [.3, .28, .32], rng); }
    for (let i = 0; i < 60; i++) { const x = rng.range(-72, 72), z = rng.range(-72, 72); if (World.dPath(x, z) < 3) continue; Lib.rock(x, z, rng.range(.3, 1.3), [.3, .28, .31], rng); }
    for (let i = 0; i < 22; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 4) continue; Lib.ashTree(x, z, rng.range(.8, 1.4), rng); }
    for (let i = 0; i < 10; i++) { const x = rng.range(-60, 60), z = rng.range(-60, 60); if (World.dPath(x, z) < 4) continue; Lib.crystal(x, z, rng.range(.4, 1), [.6, .45, 1], rng, .5); }
    for (let i = 0; i < 6; i++) Props.add('rock', rng.range(-30, 30), rng.range(-30, 40));
  },
});

/* ---------------- 02 · OVERGROWN SETTLEMENT · Where the Roots Remember ---------------- */
REGIONS.push({
  id: 'settlement', name: 'Overgrown Settlement', chapter: 'Where the Roots Remember', num: 'II', seed: 202, sideYaw: Math.PI / 2,
  pal: { dayTop: '#6f8fa8', dayHor: '#c9d2c0', dayFog: '#9aa89a', sun: '#fff0d0', dusk: '#ffb070', nightTop: '#0a1220', nightHor: '#22303a', nightFog: '#1a2428', moon: '#9ab0d0', amb: '#5a7070', gnd: '#3a4a2a', planet: '#c0a080', planetDir: [.6, .3, -.7], sunAz: 2.2 },
  dayLen: 520, t0: .4, music: { root: 130.8, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 2] }, dustCol: [.45, .5, .35], leafCol: [.4, .6, .3], verb: [1.2, 3],
  weather: [W_('Overcast', 3, { cloud: .8, wind: .3, fog: .2 }), W_('Light rain', 3, { rain: .5, cloud: .9, fog: .3, wind: .4 }), W_('Heavy rain', 1.5, { rain: 1, cloud: 1, fog: .45, wind: .7, storm: .3 }), W_('Clear', 2, { cloud: .3, wind: .2, motes: .3 })],
  path: [[0, 64], [0, 30], [0, 4], [6, -14], [0, -30], [0, -46], [0, -70]],
  flats: [{ x: 0, z: 4, r: 12, h: .5 }, { x: 0, z: -46, r: 16, h: 0 }],
  height(x, z) { return fbm(x * .025, z * .025) * 4 - 1 + Math.max(0, Math.abs(x) - 42) * .25; }, pathH() { return .3; }, pathW: 3,
  mat(x, z, h, dp) { if (dp < 3 || (Math.abs(z - 22) < 2 && Math.abs(x) < 34) || (Math.abs(z + 14) < 2 && Math.abs(x) < 34) || Math.abs(x) < 2.5) return fbm(x * .3, z * .3) > .6 ? 'grass' : 'stone'; if (fbm(x * .1, z * .1) > .62) return 'mud'; return 'grass'; },
  ground(m, x, z, h, rng) { const v = vnoise(x * .5, z * .5) * .07; if (m === 'stone') return [.42 + v, .41 + v, .38 + v]; if (m === 'mud') return [.3 + v, .26 + v, .18]; return [.26 + v, .4 + v, .2]; },
  grassOn: m => m === 'grass' || m === 'mud', grassCol: (x, z, r) => r() < .6 ? [.38, .6, .28] : [.5, .66, .3], grassDensity: 2, grassH: 1.2, flowers: .05, flowerCols: [[1, .8, .3], [.9, .5, .8], [1, 1, 1]],
  spawn: [0, 60, Math.PI], boss: { id: 'rootbound', x: 0, z: -46 },
  pois: [{ n: 'Main street', x: 0, z: 34 }, { n: 'Plaza', x: 0, z: 4 }, { n: 'Substation', x: 24, z: -8 }, { n: 'Community hall', x: -14, z: -16 }, { n: 'Mining depot', x: 30, z: 40 }, { n: 'Root square', x: 0, z: -46 }],
  build(rng) {
    const pals = [{ base: [.32, .3, .28], wall: [.72, .66, .56], roof: [.25, .45, .45], moss: [.3, .5, .25] }, { base: [.32, .3, .28], wall: [.62, .56, .5], roof: [.55, .3, .25], moss: [.3, .5, .25] }, { base: [.32, .3, .28], wall: [.78, .74, .64], roof: [.3, .35, .42], moss: [.3, .5, .25] }];
    const powered = () => flag('power2');
    // houses along streets
    const spots = [[-10, 46, 0], [10, 46, Math.PI], [-12, 30, 0], [12, 32, Math.PI], [-20, 22, Math.PI / 2], [20, 24, -Math.PI / 2], [-30, 28, 0], [30, 30, Math.PI], [-24, 8, Math.PI / 2], [24, 12, -Math.PI / 2], [-28, -2, 0], [28, -24, Math.PI], [-20, -30, 0], [16, -34, Math.PI], [-32, -14, Math.PI / 2], [34, 2, -Math.PI / 2]];
    for (const [x, z, ry] of spots) Lib.house(x, z, rng.range(4.5, 6), rng.range(4, 5), ry, rng.pick(pals), rng, { overgrown: rng() < .7, lit: false, broken: rng() < .3, flat: rng() < .25 });
    // community hall (power-gated door)
    Lib.house(-14, -16, 9, 6, 0, { base: [.3, .3, .3], wall: [.66, .6, .52], roof: [.4, .25, .2], moss: [.3, .5, .25] }, rng, { h: 4.2, overgrown: true });
    K.door(-14, -13, 1.3, 2.6, 0, powered, [.35, .3, .26]);
    K.radio(-16, -17, ['…council emergency broadcast… all citizens to the shelters…', '…the Quiet begins at second bell. Do not sing. Do not transmit…', '…if anyone comes after… we were not lost. We chose…'], { r: 5 });
    K.log(-11.5, -17.5, 'l_council');
    K.npc('orin', -13, -16, 0, () => Game.dialogue(flag('orin_met') ? 'orin_idle' : 'orin_meet'), { on: () => powered() });
    // power cells in three houses
    K.pickupCell(-20, 22.3, 'cell_a'); K.pickupCell(20, 24.5, 'cell_b'); K.pickupCell(-28, -2.5, 'cell_c');
    // substation
    Lib.machine(24, -8, Math.PI, { metal: [.4, .42, .44], rust: [.45, .3, .2] }, rng); Lib.antennaArray(28, -12, 4, 6, [.5, .5, .52], rng);
    K.inter({ x: 24, z: -4.5, label: 'Insert cells & route power', kind: 'puzzle', on: () => !powered(), use: () => { const n = ['a', 'b', 'c'].filter(k => flag('cell_' + k)).length; if (n < 3) { Game.say('mara', `We need three cells for this. You've got ${n}.`); Audio2.sfx('deny'); return; }
      Puzzle.open({ type: 'route', w: 5, h: 4, seed: 22, title: 'Settlement Substation', sub: 'Reconnect the grid', help: 'Click/tap a conduit to rotate. Keyboard: arrows + Space.' }, () => { setFlag('power2'); Game.event('puzzle_power2'); Audio2.sfx('power', [24, 2, -8]); Game.readLog('l_timestamp'); Game.say('mara', 'Lights! …The whole street just woke up.'); }); } });
    K.spin(24, World.hf.at(24, -8) + 4.6, -8, 1, [.5, .5, .55], 4, powered);
    // street lamps & cables come alive with power
    for (const [x, z] of [[-4, 40], [4, 26], [-4, 14], [4, -4], [-4, -22], [5, -30]]) Lib.lamp(x, z, 3.6, [1, .8, .5], { int: .9, cond: powered });
    for (let i = 0; i < 6; i++) { const z = 44 - i * 12; Lib.cable(-6, World.hf.at(-6, z) + 4, z, 6, World.hf.at(6, z) + 4.2, z - 3, 1, [.1, .1, .1]); }
    // plaza with resonator bells (Vael song)
    Lib.pillar(0, 4, 4, .6, [.6, .58, .55], { glyph: [.5, .9, 1] });
    Seq.add({ region: 1, pylons: [{ x: -6, z: 0 }, { x: 6, z: 0 }, { x: 0, z: 10 }, { x: 0, z: -4 }], cond: [3, 6], order: [0, 2, 1, 3], onSolve: () => { setFlag('bells2'); Game.event('puzzle_bells'); Game.say('orin', 'There. The relay heard us.'); } });
    K.trig(0, 4, 10, () => Game.event('reach_plaza'));
    Lib.stall(-8, 12, .2, [.7, .3, .3], rng); Lib.stall(8, 14, -.2, [.3, .5, .7], rng); Lib.flag(-10, -4, 5, [.8, .7, .3]); Lib.flag(10, -6, 5, [.3, .6, .7]);
    K.toy(-29, 29); K.log(-11, 31, 'l_drawing');
    // mining depot (scatter coil)
    Lib.hall(32, 42, 8, 10, 6, 0, { metal: [.42, .42, .44], rust: [.5, .32, .2] }); Lib.crateStack(28, 38, 3, [.45, .35, .2], rng); K.cache(33, 44, { label: 'Open depot locker', weapon: 'scatter', id: 'scatter' });
    for (let i = 0; i < 5; i++) Props.add(i % 2 ? 'barrel' : 'crate', 30 + rng.range(-4, 4), 36 + rng.range(-3, 6));
    // Mara's rover side quest
    Lib.vehicle(-34, 42, .6, [.6, .45, .25], rng, { overgrown: [.3, .5, .25] });
    K.inter({ x: -32, z: 40, label: 'Search the rover', kind: 'inspect', on: () => !flag('toolkit'), use: () => { setFlag('toolkit'); Game.giveItem('toolkit'); Game.readLog('l_rover'); Game.event('item_toolkit'); } });
    // water tower (freq #2 requires double jump)
    const wy = World.hf.at(-38, -32); for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) World.B(-38, -32).box(-38 + lx, wy + 4.5, -32 + lz, .3, 9, .3, [.4, .38, .36]);
    Lib.platform(-38, wy + 9, -32, 4, 4, [.45, .42, .4]); World.B(-38, -32).cyl(-38, wy + 9, -32, 1.8, 3, 8, [.5, .45, .4], { flags: F_OCC });
    Lib.platform(-38, wy + 6.6, -27.5, 2, 2, [.4, .4, .42], { legs: true }); Lib.platform(-38, wy + 4.2, -24, 2, 2, [.4, .4, .42], { legs: true }); Lib.platform(-38, wy + 2, -20.5, 2, 2, [.4, .4, .42], { legs: true });
    K.freq(-38, -32, 2, { y: 12 });
    // boss: root square
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; Lib.tendril(Math.cos(a) * 18, -46 + Math.sin(a) * 18, rng.range(3, 6), [.3, .35, .2], rng, [.9, .6, 1]); }
    K.trig(0, -46, 15, () => { if (flag('bells2') && !flag('boss_rootbound')) Boss.start('rootbound', 0, -47, () => { setFlag('boss_rootbound'); Game.event('boss_rootbound'); }); }, { once: false, cond: () => flag('bells2') && !flag('boss_rootbound') && !Boss.active });
    K.door(0, -32, 6, 4, 0, () => flag('bells2'), [.3, .4, .25]);
    K.exit(0, -66, () => flag('boss_rootbound'), () => Game.completeChapter());
    K.checkpoint(5, 54, 'c2a', 'Settlement Gate'); K.checkpoint(8, -24, 'c2b', 'North Street');
    // enemies
    K.enemy('drifter', -6, 36); K.enemy('drifter', 14, 20, { patrol: [[14, 20], [14, 0], [4, 6]] }); K.enemy('drifter', -18, 0); K.enemy('crawler', 22, -14); K.enemy('crawler', 26, -4);
    K.enemy('mimic', 10, -22); K.enemy('watcher', 0, 14); K.enemy('stalker', -26, 16);
    // flora
    for (let i = 0; i < 30; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 5 || (Math.abs(x) < 36 && Math.abs(z) < 50)) continue; Lib.bulbTree(x, z, rng.range(.9, 1.4), rng, { trunk: [.3, .26, .22], leaf: [.3, .55, .3], bulb: [1, .8, .4] }); }
    for (let i = 0; i < 70; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 3) continue; Lib.bush(x, z, rng.range(.5, 1.2), [.25, .45, .22], rng); }
    for (let i = 0; i < 40; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); Lib.frond(x, z, rng.range(.8, 1.6), [.3, .55, .3], rng); }
    for (const [x, z] of spots) Lib.vines(x + rng.range(-2, 2), World.hf.at(x, z) + 3.6, z + 2.6, 2.5, [.28, .48, .25], rng, 5);
  },
});

/* ---------------- 03 · WHISPERING FOREST · The Forest of Borrowed Voices ---------------- */
REGIONS.push({
  id: 'forest', name: 'Whispering Forest', chapter: 'The Forest of Borrowed Voices', num: 'III', seed: 303, sideYaw: Math.PI / 2,
  pal: { dayTop: '#123048', dayHor: '#3a6a78', dayFog: '#24485a', sun: '#a8d8e0', dusk: '#a080c0', nightTop: '#04060e', nightHor: '#101e2a', nightFog: '#0c1820', moon: '#6080b0', amb: '#4a7080', gnd: '#1c3428', planet: '#8070a0', planetDir: [.2, .5, -.8], sunAz: 1 },
  dayLen: 0, t0: .3, music: { root: 98, scale: [0, 3, 5, 7, 10], prog: [0, 2, 3, 1] }, dustCol: [.25, .35, .3], leafCol: [.3, .8, .7], verb: [2.5, 2.5],
  weather: [W_('Mist', 3, { fog: .7, spores: .6, wind: .15, motes: .8 }), W_('Spore bloom', 2, { fog: .5, spores: 1, wind: .25, motes: .6 }), W_('Still', 2, { fog: .35, spores: .3, wind: .05, motes: 1 }), W_('Drizzle', 1.5, { rain: .4, fog: .6, wind: .3 })],
  path: [[0, 64], [10, 34], [-8, 18], [-2, 4], [0, -10], [-4, -24], [0, -46], [0, -70]],
  flats: [{ x: 10, z: 30, r: 6, h: 1 }, { x: -22, z: 14, r: 6, h: 1.5 }, { x: 0, z: -46, r: 15, h: 0 }, { x: -36, z: -12, r: 6, h: 7, blend: 1.5 }],
  height(x, z) { let h = fbm(x * .04, z * .04) * 5 - 1; const rav = smooth(clamp((5 - Math.abs(z - 0)) / 3, 0, 1)); h -= rav * 14; return h; },
  pathH(x, z) { return fbm(x * .04, z * .04) * 3; }, pathW: 2.4,
  mat(x, z, h, dp) { if (h < -6) return 'stone'; if (dp < 1.8) return 'mud'; return fbm(x * .1, z * .1) > .55 ? 'mud' : 'grass'; },
  ground(m, x, z, h, rng) { const v = vnoise(x * .5, z * .5) * .06; if (m === 'stone') return [.26 + v, .28 + v, .32]; if (m === 'mud') return [.2 + v, .22 + v, .2]; return [.14 + v, .3 + v, .27 + v]; },
  grassOn: m => m === 'grass', grassCol: (x, z, r) => r() < .7 ? [.15, .4, .38] : [.3, .5, .55], grassDensity: 1.8, grassH: 1.3, flowers: .08, flowerCols: [[.3, 1, .9], [1, .4, .9], [.6, .8, 1]], flowerGlow: 1,
  spawn: [0, 60, Math.PI], boss: { id: 'warden', x: 0, z: -46 },
  pois: [{ n: "Nova's flare", x: 10, z: 30 }, { n: "Fallen explorer's camp", x: -22, z: 14 }, { n: 'Ravine', x: 0, z: 0 }, { n: 'Spore wall', x: -4, z: -24 }, { n: 'Hollow', x: 0, z: -46 }],
  build(rng) {
    const pal = { trunk: [.18, .2, .22], cap: [.2, .35, .4], bulb: [.4, 1, .9], stem: [.5, .5, .55], capGlow: .4 };
    // Nova's flare camp
    World.light(10, World.hf.at(10, 30) + 1, 30, 10, [1, .4, .3], 1.2, { flicker: .4 });
    World.machines.push({ update: () => { if (Math.random() < .5) FX.spawn(10 + (Math.random() - .5) * .2, World.hf.at(10, 30) + .5, 30, (Math.random() - .5) * .3, 1.5, (Math.random() - .5) * .3, 1, .6, [1, .45, .3], true, -.2); } });
    K.npc('nova', 11, 28, Math.PI, () => Game.dialogue(flag('nova_met') ? 'nova_idle' : 'nova_meet'));
    // fallen explorer camp — the suit carries YOUR emblem
    const cy = World.hf.at(-22, 14); const b = World.B(-22, 14); b.box(-22, cy + .15, 14, 1.8, .3, .6, [.35, .33, .3]); b.box(-21, cy + .6, 14, .5, .7, .4, [.3, .3, .32]); b.ico(-21, cy + 1.1, 14, .22, 1, [.85, .82, .75]);
    World.machines.push({ draw: () => { const e = hex(CUSTOM.cloth[GS().look.emblemCol]); A34.trs(_W, -20.95, cy + .75, 14.21, 0, 0, 0, .12, .12, .02); R.inst('cube', _W, e[0], e[1], e[2], .5); } });
    Lib.stall(-24, 12, .4, [.3, .4, .35], rng); K.log(-23, 15.5, 'l_explorer'); K.cache(-20, 16, { label: 'Take the explorer\'s grip gloves', item: 'grip', id: 'grip' });
    // ravine with hidden mist bridge (scanner)
    K.hidden(1, 0, 6, 'Resonant bridge resolved', g => { for (let i = 0; i < 6; i++) K.hplat(g, -1 + Math.sin(i) * .6, Math.max(World.hf.at(0, 7), World.hf.at(0, -7)) - .1, 6 - i * 2.4, 2.4, 2.6, [.4, 1, .9]); });
    K.trig(0, -10, 5, () => Game.event('reach_north'));
    // vine wall climb to the eastern ledge (needs grip)
    const ly = World.hf.at(-36, -12); World.addCol({ x0: -29, x1: -28.4, z0: -15, z1: -9, y0: -10, y1: ly + .1, climb: () => Game.has('grip'), kind: 'vine', surf: 'grass' });
    for (let i = 0; i < 8; i++) Lib.vines(-28.3, ly, -15 + i * .8, ly - World.hf.at(-27, -12), [.2, .5, .4], rng, 3);
    World.scanTargets.push({ x: -28.5, z: -12, kind: 'signal', id: 'vinewall', strength: .7, onScan: () => Game.cue(Game.has('grip') ? 'Climbable growth — grip it' : 'Dense vines. You would need better grip.') });
    K.freq(-37, -13, 3, { on: () => true }); K.log(-35, -10, 'l_lilies');
    // spore wall + wind vanes (beam puzzle)
    const sporeOn = () => !flag('vanes3');
    World.triggers.push({ x: -4, z: -24, r: 5, hazard: 'spores', dmg: 6, msg: 'Spore cloud — find a way to clear it', on: sporeOn });
    World.machines.push({ update: dt => { if (sporeOn()) for (let i = 0; i < 3; i++) FX.spawn(-4 + (Math.random() - .5) * 9, World.hf.at(-4, -24) + Math.random() * 3, -24 + (Math.random() - .5) * 9, 0, .2, 0, 2, .9, [.6, .9, .4], false, -.02, .2); } });
    World.scanTargets.push({ x: -4, z: -24, kind: 'hazard', label: 'toxic spore wall', strength: .6 });
    Beams.add({ region: 2, src: [14, -16], dir: -Math.PI / 2, target: [-4, -28], col: [.7, 1, .9], verb: 'Turn wind vane', mirrors: [{ x: 4, z: -16, ang: 0 }, { x: 4, z: -28, ang: Math.PI / 4 }], step: Math.PI / 4, onSolve: () => { setFlag('vanes3'); Game.event('puzzle_vanes'); Game.say('nova', 'The wind took it. Clever.'); } });
    K.enemy('mimic', 14, -10); K.enemy('stalker', -12, 26); K.enemy('stalker', 16, 8); K.enemy('swarm', -8, -34); K.enemy('swarm', -6, -36); K.enemy('swarm', -10, -35); K.enemy('watcher', 6, 40); K.enemy('drifter', -14, 40);
    K.radio(14, -10, ['(Mara\'s voice) Over here — I found something…', '(your voice) …don\'t answer…', '(Mara\'s voice) Please, it\'s me…'], { r: 9, every: 11 });
    K.log(18, -6, 'l_voice');
    // boss hollow
    K.trig(0, -46, 15, () => { if (flag('vanes3') && !flag('boss_warden')) Boss.start('warden', 0, -48, () => { setFlag('boss_warden'); Game.event('boss_warden'); }); }, { once: false, cond: () => flag('vanes3') && !flag('boss_warden') && !Boss.active });
    K.exit(0, -66, () => flag('boss_warden'), () => Game.completeChapter());
    K.checkpoint(6, 52, 'c3a', 'Forest Edge'); K.checkpoint(4, -14, 'c3b', 'North Ravine');
    K.silhouette(30, -20, { r: 20 });
    // the forest
    for (let i = 0; i < 16; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 9 || Math.abs(z) < 7) continue; Lib.megaStalk(x, z, rng.range(.9, 1.3), rng, pal); }
    for (let i = 0; i < 60; i++) { const x = rng.range(-72, 72), z = rng.range(-72, 72); if (World.dPath(x, z) < 3 || Math.abs(z) < 6) continue; Lib.fungus(x, z, rng.range(.5, 1.6), rng, { stem: [.55, .55, .6], cap: rng() < .5 ? [.3, .8, .8] : [.8, .3, .7], capGlow: .5 }); }
    for (let i = 0; i < 26; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 4 || Math.abs(z) < 6) continue; Lib.bulbTree(x, z, rng.range(1, 1.6), rng, { trunk: [.15, .18, .2], leaf: [.15, .35, .35], bulb: rng() < .5 ? [.4, 1, .9] : [1, .4, .9] }); }
    for (let i = 0; i < 80; i++) { const x = rng.range(-72, 72), z = rng.range(-72, 72); Lib.frond(x, z, rng.range(.8, 1.8), [.15, .4, .4], rng); }
    for (let i = 0; i < 30; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (Math.abs(z) < 6) continue; Lib.bush(x, z, rng.range(.5, 1), [.12, .3, .3], rng, { em: .1 }); }
  },
});

/* ---------------- 04 · SUNKEN RESEARCH COMPLEX · Beneath the Hush ---------------- */
REGIONS.push({
  id: 'sunken', name: 'Sunken Research Complex', chapter: 'Beneath the Hush', num: 'IV', seed: 404, sideYaw: Math.PI / 2,
  pal: { dayTop: '#3a4650', dayHor: '#7a8a90', dayFog: '#4a5a62', sun: '#d0e0f0', dusk: '#a0a0c0', nightTop: '#06080c', nightHor: '#182028', nightFog: '#141c22', moon: '#7090b0', amb: '#405058', gnd: '#202828', planet: '#90a0b0', planetDir: [-.3, .3, -.9], sunAz: 3 },
  dayLen: 600, t0: .45, music: { root: 116.5, scale: [0, 2, 3, 5, 7, 10], prog: [0, 5, 3, 4] }, dustCol: [.5, .52, .55], leafCol: [.4, .5, .5], verb: [3, 2.2],
  water: { h: 0, col: [.1, .28, .32] },
  weather: [W_('Heavy rain', 3, { rain: 1, cloud: 1, fog: .45, wind: .5, storm: .3 }), W_('Rain', 3, { rain: .6, cloud: .9, fog: .35, wind: .4 }), W_('Mist', 2, { fog: .65, cloud: .8, wind: .1 })],
  path: [[0, 64], [0, 30], [20, 12], [0, -4], [-18, -20], [0, -32], [0, -46], [0, -70]],
  flats: [{ x: 0, z: 58, r: 8, h: 1 }, { x: 0, z: 30, r: 9, h: 1 }, { x: 22, z: 10, r: 8, h: 1 }, { x: 0, z: -4, r: 7, h: 1 }, { x: -20, z: -20, r: 9, h: 1 }, { x: 0, z: -46, r: 16, h: 1 }, { x: 0, z: -66, r: 6, h: 1 }, { x: 32, z: -32, r: 7, h: -2.2 }],
  height(x, z) { return fbm(x * .05, z * .05) * 2 - 4.2; }, pathH() { return .9; }, pathW: 2.4, edgeH: 8,
  mat(x, z, h, dp) { if (h > .5) return 'stone'; if (h < -3.6) return 'mud'; return 'sand'; },
  ground(m, x, z, h, rng) { const v = vnoise(x * .4, z * .4) * .06; if (m === 'stone') { const tile = (Math.floor(x / 2) + Math.floor(z / 2)) & 1; return [.42 + v + tile * .03, .44 + v + tile * .03, .46 + v]; } if (m === 'mud') return [.18, .2, .2]; return [.3 + v, .32 + v, .3]; },
  grassOn: (m, x, z) => m === 'sand' && World.hf.at(x, z) > -.5, grassCol: () => [.3, .45, .4], grassDensity: .6, grassH: 1.4,
  spawn: [0, 60, Math.PI], boss: { id: 'archivist', x: 0, z: -46 },
  pois: [{ n: 'Entrance causeway', x: 0, z: 56 }, { n: 'Laboratory block', x: 0, z: 30 }, { n: 'Power room', x: 22, z: 10 }, { n: 'Pump control', x: 0, z: -4 }, { n: 'Archive wing', x: -20, z: -20 }, { n: 'Observation dome', x: 0, z: -46 }],
  build(rng) {
    const C = [.5, .52, .54], D = [.3, .32, .35]; const powered = () => flag('power4');
    const lab = (x, z, w, d, h, ry) => { const y = World.hf.at(x, z); const b = World.B(x, z); b.withT(A34.trs(new Float32Array(12), x, y, z, ry, 0, 0, 1, 1, 1), () => { b.box(0, h / 2, -d / 2, w, h, .4, C, { flags: F_OCC }); b.box(-w / 2, h / 2, 0, .4, h, d, C, { flags: F_OCC }); b.box(w / 2, h / 2, 0, .4, h, d, C, { flags: F_OCC }); b.box(0, h + .2, 0, w + .6, .4, d + .6, D, { flags: F_OCC }); for (let i = 0; i < 3; i++) b.box(-w / 2 + (i + .5) * w / 3, h * .6, -d / 2 + .22, w / 3 - .4, h * .4, .05, [.15, .25, .3], { flags: F_REFL, em: 0 }); });
      World.boxCol(x + Math.sin(ry) * -d / 2, z + Math.cos(ry) * -d / 2, Math.abs(Math.cos(ry)) > .5 ? w : .5, Math.abs(Math.cos(ry)) > .5 ? .5 : w, y, y + h); World.boxCol(x - Math.cos(ry) * w / 2, z + Math.sin(ry) * w / 2, Math.abs(Math.cos(ry)) > .5 ? .5 : d, Math.abs(Math.cos(ry)) > .5 ? d : .5, y, y + h); World.boxCol(x + Math.cos(ry) * w / 2, z - Math.sin(ry) * w / 2, Math.abs(Math.cos(ry)) > .5 ? .5 : d, Math.abs(Math.cos(ry)) > .5 ? d : .5, y, y + h);
      World.boxCol(x, z, w + .6, d + .6, y + h, y + h + .4, { kind: 'roof' }); };
    lab(-6, 30, 8, 6, 3.6, 0); lab(8, 32, 6, 6, 3.6, 0); lab(26, 12, 7, 6, 3.4, Math.PI / 2); lab(-22, -22, 10, 7, 4, 0);
    // glass corridors (reflective) + pipes
    for (const [x0, z0, x1, z1] of [[0, 50, 0, 38], [6, 24, 18, 14], [-4, -10, -14, -16]]) { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2); for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = lerp(z0, z1, i / n), y = World.hf.at(x, z); World.B(x, z).box(x + 2.2, y + 1.6, z, .1, 3.2, 2, [.35, .5, .55], { flags: F_REFL }); World.B(x, z).box(x, y + 3.3, z, 4.6, .15, 2, [.4, .55, .6], { flags: F_REFL }); } }
    Lib.pipe(-10, 1.5, 40, 30, 1.5, 6, .35, [.5, .4, .3]); Lib.pipe(30, 1.5, 6, 30, 1.5, -40, .4, [.45, .45, .5]); Lib.pipe(-30, 2, 50, -30, 2, -40, .3, [.45, .45, .5]);
    for (let i = 0; i < 10; i++) Lib.lamp(rng.range(-8, 8), 50 - i * 11, 3.5, [.7, .95, 1], { int: .8, cond: () => powered() || i < 3, flicker: .3 });
    K.log(-5, 31, 'l_lantern'); K.log(9, 33, 'l_returned');
    K.checkpoint(4, 54, 'c4a', 'Causeway'); K.checkpoint(-6, -10, 'c4b', 'Pump Control');
    // power room — multi-receiver routing
    Lib.machine(22, 6, 0, { metal: [.42, .44, .46], rust: [.3, .4, .45] }, rng);
    K.inter({ x: 22, z: 9.5, label: 'Reroute emergency power', kind: 'puzzle', on: () => !powered(), use: () => Puzzle.open({ type: 'route', w: 6, h: 5, multi: true, seed: 44, title: 'Complex Power Grid', sub: 'Two receivers: pumps and archive', help: 'Both receivers must glow green.' }, () => { setFlag('power4'); Game.event('puzzle_power4'); Audio2.sfx('power', [22, 2, 8]); Game.say('elias', '(muffled, over intercom) Lights — oh thank god. Whoever you are — the pump console, please, the archive is flooding.'); }) });
    // pump console drains the complex: the water plane actually lowers
    Lib.terminal(0, -2, Math.PI, [.4, 1, .8]);
    K.inter({ x: 0, z: -3.5, label: 'Engage drainage pumps', kind: 'puzzle', on: () => powered() && !flag('drain4'), use: () => { setFlag('drain4'); Game.event('drain'); Audio2.sfx('machine', [0, 1, -4]); Cam.shake(.3); Game.say('mara', 'Listen to that. Every pump in the building just woke up.'); } });
    World.machines.push({ update: dt => { if (flag('drain4') && World.water.h > -2.6) { World.water.h = Math.max(-2.6, World.water.h - dt * .35); if (Math.random() < .3) FX.splash(rng.range(-30, 30), World.water.h, rng.range(-40, 40), 1); } } });
    K.door(-22, -18.3, 2, 3, 0, () => flag('drain4'), [.4, .42, .45], { label: 'Archive door (sealed — flooded)', use: () => Audio2.sfx('deny') });
    K.npc('elias', -22, -22, 0, () => Game.dialogue(flag('elias_met') ? 'elias_idle' : 'elias_meet'), { on: () => flag('drain4') });
    K.log(-25, -23, 'l_reflection');
    // sunken lab (only reachable after draining) with freq #4
    const sy = World.hf.at(32, -32); World.B(32, -32).box(32, sy + 1.5, -36, 8, 3, .4, [.35, .45, .5], { flags: F_REFL }); World.B(32, -32).box(36, sy + 1.5, -32, .4, 3, 8, [.35, .45, .5], { flags: F_REFL });
    K.freq(32, -32, 4, { on: () => flag('drain4') }); K.log(30, -30, 'l_pump', { r: 2 });
    // dome arena
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; Lib.pillar(Math.cos(a) * 17, -46 + Math.sin(a) * 17, 7, .5, [.55, .57, .6]); }
    K.trig(0, -46, 14, () => { if (flag('elias_met') && !flag('boss_archivist')) Boss.start('archivist', 0, -48, () => { setFlag('boss_archivist'); Game.event('boss_archivist'); }); }, { once: false, cond: () => flag('elias_met') && !flag('boss_archivist') && !Boss.active });
    K.door(0, -33, 4, 3.5, 0, () => flag('elias_met'), [.4, .42, .45]);
    K.exit(0, -66, () => flag('boss_archivist'), () => Game.completeChapter());
    K.enemy('drifter', 2, 40); K.enemy('watcher', 10, 20); K.enemy('crawler', 18, 4); K.enemy('crawler', 24, 16); K.enemy('drifter', -10, -18); K.enemy('brute', -4, -26); K.enemy('burrower', 6, 0);
    for (let i = 0; i < 8; i++) Props.add(i % 3 ? 'can' : 'barrel', rng.range(-6, 6), rng.range(20, 50));
    for (let i = 0; i < 30; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 6) continue; Lib.reeds(x, z, 1.5, [.3, .45, .4], rng); }
    for (let i = 0; i < 25; i++) { const x = rng.range(-70, 70), z = rng.range(-70, 70); if (World.dPath(x, z) < 6) continue; Lib.rock(x, z, rng.range(.6, 1.6), [.35, .38, .4], rng); }
    for (let i = 0; i < 8; i++) { const x = rng.range(-60, 60), z = rng.range(-60, 60); if (World.dPath(x, z) < 8) continue; Lib.tower(x, z, rng.range(6, 12), { metal: [.4, .42, .45], light: [.6, .9, 1] }, rng, { dead: rng() < .5 }); }
  },
});
