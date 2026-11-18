
/* =====================================================================
   REGION BUILD KIT — interactables, logs, caches, checkpoints, hidden
   structures, doors, triggers, environmental storytelling helpers
   ===================================================================== */
const K = {
  inter(o) { const t = Object.assign({ y: World.hf.at(o.x, o.z), r: 2 }, o); if (!t.on) t.on = () => true; World.inter.push(t); return t; },
  log(x, z, id, o = {}) { const L = LOGS[id]; const has = () => GS().journal.includes(id);
    const b = World.B(x, z), y = World.hf.at(x, z); if (!o.noMesh) { if (L.kind === 'audio') { b.box(x, y + .25, z, .5, .5, .35, [.25, .25, .28], { flags: F_REFL }); b.box(x, y + .52, z, .3, .05, .2, [.9, .3, .2], { em: .9 }); } else if (L.kind === 'text') { b.box(x, y + .03, z, .4, .02, .3, [.85, .82, .7], { ry: hash(x, z) * 3 }); } else { b.box(x, y + .4, z, .6, .8, .2, [.4, .4, .45], { flags: F_REFL }); b.box(x, y + .5, z + .11, .4, .3, .02, [.5, .9, 1], { em: .8 }); } }
    World.scanTargets.push({ x, z, y, kind: 'lore', id, done: has(), strength: .4 });
    return this.inter({ x, z, r: o.r || 1.8, label: L.kind === 'audio' ? 'Play recording' : L.kind === 'text' ? 'Read' : 'Inspect', kind: 'log', on: () => !has(), use: () => Game.readLog(id) }); },
  cache(x, z, o = {}) { const key = 'cache_' + GS().region + '_' + Math.round(x) + '_' + Math.round(z); const done = () => GS().flags[key]; const y = World.hf.at(x, z);
    const b = World.B(x, z); b.box(x, y + .35, z, 1.1, .7, .7, o.col || [.32, .36, .3], { ry: o.ry || 0, flags: F_REFL }); b.box(x, y + .72, z, 1.12, .06, .72, [.9, .55, .15], { ry: o.ry || 0, em: .6 }); World.addCol({ x, z, r: .55, y1: y + .7 });
    return this.inter({ x, z, label: o.label || 'Open supply cache', kind: 'cache', on: () => !done() && (!o.on || o.on()), use: () => { GS().flags[key] = 1; Audio2.sfx('door', [x, y, z]); if (o.salv) Game.addSalvage(o.salv, x, y + 1, z); if (o.item) Game.giveItem(o.item); if (o.weapon) Game.giveWeapon(o.weapon); if (o.suit) Game.giveSuit(o.suit); if (o.cos) Game.unlockCos(o.cos); if (o.after) o.after(); Game.event('cache_' + (o.id || key)); } }); },
  checkpoint(x, z, id, name) { const y = World.hf.at(x, z), b = World.B(x, z);
    b.cyl(x, y, z, 1.4, .3, 8, [.25, .26, .3], { flags: F_REFL }); b.cyl(x, y + .3, z, .25, 2.4, 6, [.35, .36, .4], { rTop: .12 }); b.ico(x, y + 2.9, z, .3, 0, [1, .7, .3], { em: 1 });
    World.addCol({ x, z, r: .4, y1: y + 2.6 }); const L = World.light(x, y + 2.9, z, 7, [1, .7, .3], GS().cps.includes(id) ? 1 : .15, { flicker: .05 });
    Game.cpDefs.push({ id, x, z, name, region: GS().region, L });
    this.inter({ x, z, r: 2.4, label: 'Field station: upgrade · customize · save', kind: 'station', use: () => { Game.activateCp(id); UI.openKit('upgrades'); } });
    World.triggers.push({ x, z, r: 4, once: false, fn: () => { if (!GS().cps.includes(id) || GS().lastCp !== id) Game.activateCp(id); } }); },
  freq(x, z, n, o = {}) { const y = World.hf.at(x, z) + (o.y || 0); const done = () => GS().freqs.includes(n); const tgt = { x, y, z, kind: 'freq', id: 'freq' + n, done: done(), strength: 1.4 }; World.scanTargets.push(tgt);
    World.machines.push({ draw: () => { if (done() || !tgt.found && !Scanner.pulse) return; A34.trs(_W, x, y + 1.4 + Math.sin(Game.time * 2) * .2, z, Game.time * 2, 0, 0, .35, .5, .35); R.inst('oct', _W, .9, .5, 1, 1, F_UNLIT); } });
    return this.inter({ x, z, y, r: 2.2, label: 'Tune anomalous frequency', kind: 'freq', on: () => !done() && tgt.found && (!o.on || o.on()), use: () => Puzzle.open({ type: 'tune', dials: 2, title: 'Hidden Frequency ' + n + '/8', sub: 'A fragment of an older song', help: 'Match both dials to the amber trace. ←/→ adjust, ↑/↓ select.' }, () => { GS().freqs.push(n); tgt.done = true; Audio2.motif(1 + n * .05, .06); UI.toast('◈ Hidden frequency ' + n + ' of 8 recorded'); Game.event('freq'); Game.save('auto'); }) }); },
  // hidden structure: geometry + colliders only exist once the scanner resolves them
  hidden(g, x, z, label, build) { const rev = () => (GS().rev[GS().region] >> g) & 1; const t = { x, z, y: World.hf.at(x, z), kind: 'hidden', group: g, id: 'h' + g, label, revealed: !!rev(), strength: 1 }; World.scanTargets.push(t); build(g); return t; },
  hplat(g, x, y, z, sx, sz, col) { const b = World.B(x, z); b.box(x, y - .2, z, sx, .4, sz, col, { flags: F_HIDDEN | F_OCC, rev: g, em: .35 }); World.addCol({ x0: x - sx / 2, x1: x + sx / 2, z0: z - sz / 2, z1: z + sz / 2, y0: y - .4, y1: y, kind: 'platform', surf: 'crystal', on: () => (GS().rev[GS().region] >> g) & 1 }); },
  door(x, z, w, h, ry, open, col = [.3, .32, .36], o = {}) { const y = World.hf.at(x, z); let k = open() ? 1 : 0; const c = World.addCol({ x0: x - (Math.abs(Math.cos(ry)) > .5 ? w / 2 : .3), x1: x + (Math.abs(Math.cos(ry)) > .5 ? w / 2 : .3), z0: z - (Math.abs(Math.cos(ry)) > .5 ? .3 : w / 2), z1: z + (Math.abs(Math.cos(ry)) > .5 ? .3 : w / 2), y0: y - 1, y1: y + h, on: () => k < .9, kind: 'door' });
    let was = open();
    World.machines.push({ update: dt => { const o2 = open(); if (o2 && !was) { Audio2.sfx('door', [x, y + 1, z]); FX.steam(x, y + .2, z, 8); } was = o2; k = lerp(k, o2 ? 1 : 0, dt * 1.5); }, draw: () => { A34.trs(_W, x, y + h / 2 + k * h * .95, z, ry, 0, 0, w, h, .35); R.inst('cube', _W, col[0], col[1], col[2], 0, F_REFL | F_OCC); A34.trs(_W, x, y + h * .5 + k * h * .95, z, ry, 0, 0, w * .9, .12, .4); R.inst('cube', _W, o2c(open()), .3, .2, .9); } });
    function o2c(v) { return v ? .3 : 1; }
    if (o.label) this.inter({ x: x + Math.sin(ry) * 1.2, z: z + Math.cos(ry) * 1.2, label: o.label, kind: 'door', on: () => !open() && (!o.can || o.can()), use: o.use }); return c; },
  exit(x, z, cond, next) { const y = World.hf.at(x, z); World.machines.push({ draw: () => { if (!cond()) return; for (let i = 0; i < 6; i++) { A34.trs(_W, x + Math.cos(i + Game.time) * 1.5, y + 2 + Math.sin(Game.time * 2 + i) * 1.5, z + Math.sin(i + Game.time) * 1.5, Game.time, 0, 0, .15, .15, .15); R.inst('oct', _W, 1, .8, .4, 1, F_UNLIT); } A34.trs(_W, x, y + 4, z, 0, 0, 0, .25, 8, .25); R.inst('cube', _W, 1, .75, .35, .9, F_UNLIT); } });
    World.light(x, y + 3, z, 10, [1, .7, .3], 1, { cond });
    this.inter({ x, z, r: 3, label: 'Travel onward', kind: 'exit', on: cond, use: next }); World.landmarks.push({ x, z, name: 'Way onward', kind: 'exit' }); },
  trig(x, z, r, fn, o = {}) { World.triggers.push(Object.assign({ x, z, r, fn, once: true }, o)); },
  // crew members stand physically in the world (working, examining) until they join; then they follow
  npc(id, x, z, yaw, talk, o = {}) { const visible = () => (o.on ? o.on() : true) && !GS().crew.includes(id); const ch = makeChar(NPC_LOOKS[id]); ch.x = x; ch.z = z; ch.y = World.ground(x, z, 999).h; ch.yaw = yaw; ch.id = id;
    if (o.pose === 'kneel' || id === 'mara') ch.anim.kneel = 1; if (id === 'elias') ch.anim.sit = 1;
    World.machines.push({ update: dt => { if (!visible()) return; const near = dist2(Player.x, Player.z, x, z) < 49; ch.anim.kneel = near ? 0 : (o.pose === 'kneel' || id === 'mara' ? 1 : 0); ch.anim.sit = near ? 0 : id === 'elias' ? 1 : 0; ch.talking = Game.dlg && Game.dlg.id && Game.dlg.id.startsWith(id); ch.anim.talk = ch.talking ? 1 : 0; ch.yaw = lerpAng(ch.yaw, near ? Math.atan2(Player.x - x, Player.z - z) : yaw, dt * 3); Anim.update(ch, dt); },
      draw: () => { if (visible()) drawHumanoid(ch, {}); } });
    Companions.stationed = Companions.stationed || []; Companions.stationed.push(ch);
    this.inter({ x, z, r: 2.6, label: 'Talk to ' + CREW[id].name, kind: 'npc', on: () => (o.on ? o.on() : true), use: talk }); },
  radio(x, z, lines, o = {}) { const y = World.hf.at(x, z), b = World.B(x, z); b.box(x, y + .3, z, .7, .6, .4, [.28, .26, .22], { flags: F_REFL }); b.cyl(x + .2, y + .6, z, .02, .8, 4, [.5, .5, .5]); b.box(x - .1, y + .35, z + .21, .3, .2, .02, [1, .5, .2], { em: .8 });
    World.light(x, y + .7, z, 3, [1, .5, .2], .5, { flicker: .4 }); let i = 0; const t = { x, z, y, kind: 'signal', id: 'radio' + x, strength: .8 }; World.scanTargets.push(t);
    World.triggers.push({ x, z, r: o.r || 7, once: false, cd: 0, fn: (tr) => { if (tr.cd > 0) return; tr.cd = o.every || 14; const L = lines[i++ % lines.length]; Game.say('radio', L, { radio: true, pos: [x, y + .5, z] }); } }); },
  silhouette(x, z, o = {}) { const y = World.hf.at(x, z); let gone = false; const ch = makeChar(NPC_LOOKS.vael); ch.x = x; ch.z = z; ch.y = y; ch.yaw = o.yaw || 0;
    World.machines.push({ update: dt => { if (gone) return; ch.yaw = Math.atan2(Player.x - x, Player.z - z); Anim.update(ch, dt); if (dist2(Player.x, Player.z, x, z) < (o.r || 26) ** 2) { gone = true; FX.burst(x, y + 1, z, 40, [.6, 1, 1], 2, 1.4, .6, true, -.2); Audio2.sfx('echo_die', [x, y + 1, z]); if (o.onGone) o.onGone(); } }, draw: () => { if (!gone) { ch.flash = 0; drawHumanoid(ch, { flags: F_UNLIT }); } } }); },
  enemy(type, x, z, o) { return Enemies.spawn(type, x, z, o); },
  lampOnApproach(x, z, col) { const L = Lib.lamp(x, z, 3.2, col, { int: 0 }); L.base = 0; World.machines.push({ update: dt => { const near = dist2(Player.x, Player.z, x, z) < 64; if (near && L.int < .05) Audio2.sfx('ping', [x, 3, z]); L.int = lerp(L.int, near ? .9 : 0, dt * (near ? 3 : .5)); L.base = L.int; } }); },
  dragMarks(x0, z0, x1, z1) { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .7); for (let i = 0; i < n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t), b = World.B(x, z, true); for (const s of [-.25, .25]) b.box(x + s * Math.cos(Math.atan2(x1 - x0, z1 - z0)), World.hf.at(x, z) + .02, z - s * Math.sin(Math.atan2(x1 - x0, z1 - z0)), .08, .02, .5, [.08, .07, .08], { ry: Math.atan2(x1 - x0, z1 - z0) }); } },
  toy(x, z) { const y = World.hf.at(x, z), b = World.B(x, z, true); b.box(x, y + .1, z, .18, .2, .12, [.8, .4, .3], { ry: .5 }); b.box(x, y + .25, z, .14, .12, .12, [.8, .4, .3]); b.box(x - .04, y + .27, z + .061, .02, .02, .01, [0, 0, 0]); b.box(x + .04, y + .27, z + .061, .02, .02, .01, [0, 0, 0]);
    this.inter({ x, z, r: 1.5, label: 'Inspect', kind: 'inspect', use: () => Game.say('you', 'A child\'s toy. Someone sewed a little antenna onto its head.') }); },
  inspect(x, z, text, o = {}) { return this.inter({ x, z, r: o.r || 2, label: o.label || 'Inspect', kind: 'inspect', on: o.on, use: () => { Game.say(o.who || 'you', text); if (o.fx) o.fx(); } }); },
  spin(x, y, z, r, col, speed, cond) { let a = 0; World.machines.push({ update: dt => { a += dt * speed * (cond() ? 1 : .03); }, draw: () => { for (let i = 0; i < 3; i++) { A34.trs(_W, x, y, z, a + i * 2.09, 0, 0, .25, .08, r * 2); R.inst('cube', _W, col[0], col[1], col[2], 0, F_REFL); } } }); },
  pickupCell(x, z, flag) { const y = World.hf.at(x, z); const has = () => GS().flags[flag]; World.machines.push({ draw: () => { if (has()) return; A34.trs(_W, x, y + .6 + Math.sin(Game.time * 2) * .1, z, Game.time, 0, 0, .3, .5, .3); R.inst('oct', _W, .3, .9, 1, 1, F_UNLIT); } });
    World.scanTargets.push({ x, z, y, kind: 'signal', id: flag, strength: 1 }); return this.inter({ x, z, r: 1.6, label: 'Take power cell', kind: 'pickup', on: () => !has(), use: () => { GS().flags[flag] = 1; Audio2.sfx('pickup'); Game.event('cell'); } }); },
};
