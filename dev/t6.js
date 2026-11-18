const { chromium } = require('playwright');
const startCh = +(process.argv[2] || 1), endCh = +(process.argv[3] || 7), ending = process.argv[4] || 'A';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  const ev = (f, a) => p.evaluate(f, a); const log = (...a) => console.log(...a); const shot = n => p.screenshot({ path: 'shots/c_' + n + '.png' });
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await ev(() => { window.T = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    async use(x, z, label) { const G = __game; G.Player.place(x, z, 0); await T.sleep(250); let best = null, bd = 1e9; for (const t of G.World.inter) { if (!t.on()) continue; if (label && !(t.label || '').includes(label)) continue; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t; } } if (!best || bd > 4) return 'none:' + label; G.Player.place(best.x + .5, best.z + .5, 0); best.use(best); G.Game.event('use_' + (best.id || best.kind)); await T.solve(); await T.talk(); return best.label; },
    async solve() { const P = __game.Puzzle; for (let i = 0; i < 80 && P.cur; i++) { const c = P.cur; if (c.type === 'tune') c.vals = c.target.slice(); if (c.type === 'route') c.cells.forEach(k => k.rot = 0); await T.sleep(150); } },
    async talk(pick = 0) { const G = __game.Game; for (let i = 0; i < 120 && (G.dlg || G.state === 'dialogue'); i++) { if (G.dlgChoices) { const ch = G.dlgChoices; G.choose(ch[Math.min(pick, ch.length - 1)]); } else { G._full = ''; G.dlgStep(); } await T.sleep(60); } },
    async boss() { const G = __game; for (let i = 0; i < 60 && !G.Boss.active; i++) await T.sleep(200); if (!G.Boss.active) return 'noboss'; await T.sleep(4200); for (let i = 0; i < 200 && G.Boss.b && !G.Boss.b.dead; i++) { const b = G.Boss.b; b.revealed = 9; b.vuln = 9; b.cold = 9; b.shield = 0; if (G.Game.state === 'dialogue') { await T.talk(); continue; } G.Boss.damage(25); await T.sleep(60); } await T.sleep(2600); await T.talk(); return 'ok'; },
    kill() { __game.Enemies.list.forEach(e => { if (!e.isBoss) __game.Enemies.kill(e); }); },
    scanAt(x, z) { const G = __game; G.Player.place(x, z, 0); G.Scanner.fire(); },
  }; });
  await ev(async c => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; __game.Settings.v.seenIntro = true; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = c; G.S.region = c; G.S.items = ['scanner', 'burst']; G.S.crew = ['mara', 'orin', 'nova', 'elias'].slice(0, c); if (c >= 3) G.S.items.push('grip'); if (c >= 5) G.S.items.push('boots'); G.ensureQuests(); await G.loadRegion(c); G.startPlay(); }, startCh);
  const step = async (name, f) => { try { const r = await ev(f); log(name, '→', JSON.stringify(r)); } catch (e) { log(name, 'FAILED', e.message.slice(0, 300)); } };
  const chapterExit = async () => { await step('exit', async () => { const r = await T.use(0, -64, 'Travel'); await T.sleep(2500); return [r, __game.Game.state]; }); if (await ev(() => __game.Game.state) === 'chapdone') { await p.click('#cdnext'); await p.waitForFunction(() => __game.Game.state === 'play', null, { timeout: 90000 }); } };
  for (let ch = startCh; ch <= endCh; ch++) {
    log('=== CHAPTER', ch, await ev(() => [__game.Game.S.region, __game.World.region.id, __game.Game.objective()?.text]));
    if (ch === 1) {
      await step('cells', async () => { await T.use(-20, 22.3, 'cell'); await T.use(20, 24.5, 'cell'); await T.use(-28, -2.5, 'cell'); return Object.keys(__game.Game.S.flags); });
      await step('power', async () => { await T.use(24, -4.5, 'route'); return __game.Game.S.flags.power2; });
      await step('orin', async () => { await T.sleep(1500); return [await T.use(-13, -16, 'Talk'), __game.Game.S.crew]; });
      await step('bells', async () => { const s = __game.Game; const d = window.Seq || null; return 'seq'; });
      await step('bells2', async () => { const S = eval('Seq').sets[0]; for (const k of S.order) { const pl = S.pylons[k]; await T.use(pl.x, pl.z, 'resonator'); } await T.sleep(800); return __game.Game.S.flags.bells2; });
      await step('rover', async () => [await T.use(-32, 40, 'rover'), __game.Game.S.items]);
      await step('scatter', async () => [await T.use(33, 44, 'locker'), __game.Game.S.weapons]);
      await step('boss', async () => { T.kill(); __game.Player.place(0, -36, 3.1); return await T.boss(); }); await shot('boss_rootbound');
    }
    if (ch === 2) {
      await step('nova', async () => [await T.use(11, 28, 'Talk'), __game.Game.S.crew]);
      await step('grip', async () => [await T.use(-20, 16, 'grip'), __game.Game.S.items]);
      await step('scan bridge', async () => { T.scanAt(0, 12); await T.sleep(2500); return __game.Game.S.rev[2]; }); await shot('bridge');
      await step('vanes', async () => { const d = eval('Beams').sets[0]; d.mirrors[0].ang = 0; d.mirrors[1].ang = 0; for (let a = 0; a < 8 && !d.solved; a++) { for (let b2 = 0; b2 < 8 && !d.solved; b2++) { d.mirrors[1].ang = b2 * Math.PI / 4; await T.sleep(40); eval('Beams').update(1); } if (!d.solved) d.mirrors[0].ang = (a + 1) * Math.PI / 4; } return [d.solved, __game.Game.S.flags.vanes3]; });
      await shot('vanes');
      await step('boss', async () => { T.kill(); __game.Player.place(0, -36, 3.1); return await T.boss(); }); await shot('boss_warden');
    }
    if (ch === 3) {
      await step('power', async () => [await T.use(22, 9.5, 'power'), __game.Game.S.flags.power4]);
      await step('drain', async () => { await T.talk(); const r = await T.use(0, -3.5, 'pumps'); await T.sleep(4000); return [r, __game.World.water.h]; }); await shot('drained');
      await step('elias', async () => { await T.sleep(2500); return [await T.use(-22, -22, 'Talk'), __game.Game.S.crew]; });
      await step('boss', async () => { T.kill(); __game.Player.place(0, -36, 3.1); return await T.boss(); }); await shot('boss_archivist');
    }
    if (ch === 4) {
      await step('cross', async () => { __game.Player.place(0, 2, 3.1); await T.sleep(1000); return __game.Game.objective().text; }); await shot('iron_yard');
      await step('foundry', async () => { __game.Player.place(-26, -6, 3.1); await T.sleep(1500); await T.talk(); return __game.Game.S.flags.foundry_seen; }); await shot('foundry');
      await step('vault', async () => { const d = eval('Beams').sets[0]; for (let a = 0; a < 8 && !d.solved; a++) for (let b2 = 0; b2 < 8 && !d.solved; b2++) for (let c2 = 0; c2 < 8 && !d.solved; c2++) { d.mirrors[0].ang = a * Math.PI / 4; d.mirrors[1].ang = b2 * Math.PI / 4; d.mirrors[2].ang = c2 * Math.PI / 4; eval('Beams').update(1); } await T.sleep(1500); return [d.solved, __game.Game.S.flags.vault5]; });
      await step('boots', async () => [await T.use(28, -16, 'Boots'), __game.Game.S.items]);
      await step('boss', async () => { T.kill(); __game.Player.place(0, -36, 3.1); return await T.boss(); }); await shot('boss_titan');
    }
    if (ch === 5) {
      await step('orin ask', async () => { __game.Player.place(eval('meander')(36), 36, 3.1); await T.sleep(800); await T.talk(); return __game.Game.S.flags.orin_ask; });
      await step('stone', async () => [await T.use(-21, 35, 'cantor'), __game.Game.S.items]);
      await step('keep stone', async () => { const o = __game.Companions.get('orin'); __game.Game.dialogue('orin_idle'); await T.talk(1); return [__game.Game.S.flags.orin_doubt, __game.Game.S.items]; });
      await step('dishes', async () => { const sets = eval('Beams').sets; for (const d of sets) { for (let a = 0; a < 24 && !d.solved; a++) { d.dir = a * Math.PI / 12; eval('Beams').update(1); } } await T.sleep(2000); await T.talk(); return [sets.map(d => d.solved), __game.Game.S.flags.dishes6]; }); await shot('dishes');
      await step('key', async () => [await T.use(1, -24, 'Key'), __game.Game.S.items]);
      await step('boss', async () => { T.kill(); __game.Player.place(0, -38, 3.1); return await T.boss(); }); await shot('boss_resonant');
    }
    if (ch === 6) {
      await step('gate', async () => { __game.Player.place(0, 46, 3.1); await T.sleep(800); return __game.Game.objective().text; }); await shot('capital');
      await step('memorial', async () => { const d = eval('Beams').sets[0]; for (let a = 0; a < 8 && !d.solved; a++) for (let b2 = 0; b2 < 8 && !d.solved; b2++) for (let c2 = 0; c2 < 8 && !d.solved; c2++) { d.mirrors[0].ang = a * Math.PI / 4; d.mirrors[1].ang = b2 * Math.PI / 4; d.mirrors[2].ang = c2 * Math.PI / 4; eval('Beams').update(1); } await T.sleep(500); return __game.Game.S.flags.memorial7; });
      await step('archive', async () => { const r = await T.use(33, 7.5, 'Reconstruct'); await T.sleep(1000); await T.talk(); return [r, __game.Game.S.flags.archive7]; });
      await step('transit', async () => [await T.use(3, 36, 'transit'), __game.Game.S.flags.transit7]);
      await step('boss', async () => { T.kill(); __game.Player.place(0, -36, 3.1); return await T.boss(); }); await shot('boss_firstvoice');
      await step('betrayal', async () => { await T.talk(); return [__game.Game.S.flags.betrayal, __game.Game.S.crew]; });
    }
    if (ch === 7) {
      await step('memories', async () => { await T.use(-28, 34, 'memory'); await T.use(28, 32, 'memory'); await T.use(-26, 2, 'memory'); return ['mara', 'nova', 'elias'].map(k => __game.Game.S.flags['mem_' + k]); }); await shot('core');
      await step('harmony', async () => { const r = await T.use(26, -6, 'Harmonise'); await T.talk(); return [r, __game.Game.S.flags.harmony8]; });
      await step('boss', async () => { T.kill(); __game.Player.place(0, -22, 3.1); return await T.boss(); }); await shot('boss_chorus');
      await step('heart', async () => { await T.sleep(2000); const G = __game.Game; if (!G.dlg) G.dialogue('heart'); await T.sleep(300); const ch = G.dlgChoices; return ch && ch.map(c => c.t); });
      await step('ending', async (e) => { return 'choose'; });
      await ev(async e => { const G = __game.Game; const ch = G.dlgChoices; const idx = { A: 0, B: 1, C: 2, D: 3 }[e]; G.choose(ch[Math.min(idx, ch.length - 1)]); }, ending);
      for (let i = 0; i < 9; i++) { await p.waitForTimeout(5000); await shot('ending_' + ending + i); }
      log('state', await ev(() => [__game.Game.state, __game.Game.S && __game.Game.S.endings]));
      break;
    }
    await chapterExit();
  }
  log('ERRORS:\n' + [...new Set(errs)].join('\n'));
  await b.close();
})();
