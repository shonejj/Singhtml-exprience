// Chapter 1 with REAL input only (teleporting between locations allowed). usage: node tr1.js <mode: kb|mouse|touch> [h]
const { chromium, devices } = require('playwright');
const mode = process.argv[2] || 'kb', H = +(process.argv[3] || 720);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: Math.round(H * 2.1), height: H }, hasTouch: mode === 'touch', isMobile: mode === 'touch' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a); const log = (...a) => console.log(...a); const T = ms => p.waitForTimeout(ms);
  await p.goto('file://' + process.cwd() + '/game.html'); await T(2000);
  await ev(() => { __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; __game.Settings.v.seenIntro = true; __game.Settings.v.difficulty = 'story'; __game.Settings.save(); });
  await p.click('text=New Game'); await T(400); await p.click('.slot >> nth=0'); await T(1200); await p.click('#crok');
  await p.waitForFunction(() => __game.Game.state === 'play', null, { timeout: 120000 }); await T(1500);
  const tp = (x, z, yaw = 0) => ev(([x, z, y]) => __game.Player.place(x, z, y), [x, z, yaw]);
  const obj = () => ev(() => __game.Game.objective().text); const key = async (k, ms = 80) => { await p.keyboard.down(k); await T(ms); await p.keyboard.up(k); };
  // walk a bit with real keys
  const z0 = await ev(() => __game.Player.z); await p.keyboard.down('KeyW'); await T(1200); await p.keyboard.up('KeyW'); log('walk', z0.toFixed(1), '->', (await ev(() => __game.Player.z)).toFixed(1));
  await tp(13.5, 38.6); await T(500); await key('KeyE'); await T(400); log('pod:', await obj());
  await p.keyboard.down('KeyQ'); await T(500); await p.keyboard.up('KeyQ'); await T(300); log('scan:', await obj());
  await tp(-19, 9.5, -1.5); await T(500); await key('KeyE'); await T(400); log('outpost:', await obj());
  await tp(12, -17); await T(600); log('tower:', await obj());
  await tp(13.5, -16.5); await T(600); log('prompt', await ev(() => document.getElementById('prompt').textContent)); await key('KeyE'); await T(800);
  log('puzzle state', await ev(() => __game.Game.state));
  const dial = () => ev(() => { const P = __game.Puzzle.cur; return P && [P.vals[0], P.target[0]]; });
  if (mode === 'kb') {   // arrows: move toward target using only what the screen shows (amber trace), hold until locking
    for (let i = 0; i < 80; i++) { const d = await dial(); if (!d) break; const diff = d[1] - d[0]; if (Math.abs(diff) < 0.02) { await T(300); continue; } await key(diff > 0 ? 'ArrowRight' : 'ArrowLeft', Math.min(500, Math.abs(diff) * 3000)); await T(60); }
  } else if (mode === 'mouse') {  // real mouse drag on the slider thumb
    const box = await p.locator('#puzctr input').boundingBox();
    for (let i = 0; i < 6; i++) { const d = await dial(); if (!d || Math.abs(d[1] - d[0]) < .02) break; const sx = box.x + box.width * d[0], ex = box.x + box.width * d[1]; await p.mouse.move(sx, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move((sx + ex) / 2, box.y + box.height / 2, { steps: 5 }); await p.mouse.move(ex, box.y + box.height / 2, { steps: 5 }); await p.mouse.up(); await T(200); }
  } else {  // touch: tap the step buttons
    for (let i = 0; i < 120; i++) { const d = await dial(); if (!d) break; const diff = d[1] - d[0]; if (Math.abs(diff) < 0.03) { await T(300); continue; } const btn = p.locator(`#puzctr .st[data-d="${diff > 0 ? 1 : -1}"]`).first(); const bb = await btn.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await T(40); }
  }
  await T(1500); log('after puzzle: flag', await ev(() => __game.Game.S.flags.relay1), 'state', await ev(() => __game.Game.state));
  for (let i = 0; i < 12; i++) { if (await ev(() => !!__game.Game.dlg)) { await key('Space'); await T(250); await key('Space'); await T(200); } else await T(500); }
  log('obj:', await obj());
  if (process.argv[4] === "puzzle-only") { log("ERR", errs.join("|")); await b.close(); return; }
  // boss with REAL fire + scan input
  await tp(0, -36, Math.PI); await T(2000); for (let i = 0; i < 40 && !(await ev(() => __game.Boss.active)); i++) await T(500);
  await T(4500); log('boss active', await ev(() => __game.Boss.active), 'state', await ev(() => __game.Game.state));
  const t0 = Date.now(); let scans = 0;
  while (Date.now() - t0 < 150000 && await ev(() => __game.Boss.active && __game.Boss.b && !__game.Boss.b.dead)) {
    const st = await ev(() => { const b = __game.Boss.b, P = __game.Player; const s = __game.R.toScreen(b.x, b.y + b.aimH, b.z); return { s, revealed: b.revealed, hp: b.hp, dead: P.dead, d: Math.hypot(b.x - P.x, b.z - P.z) }; });
    if (st.dead) { await ev(() => __game.Game.retry()); await T(500); continue; }
    if (st.revealed <= 0) { await p.keyboard.down('KeyQ'); await T(600); await p.keyboard.up('KeyQ'); scans++; }
    if (st.s) await p.mouse.move(Math.max(5, st.s[0]), Math.max(5, st.s[1]));
    await p.mouse.down(); await T(900); await p.mouse.up();
    if (st.d > 14) await ev(() => { const b = __game.Boss.b; __game.Player.place(b.x + 8, b.z + 8, Math.PI); });
    if (Math.random() < .3) { await key('Space', 100); }
  }
  await T(4000); log('boss defeated flag', await ev(() => __game.Game.S.flags.boss_guardian), 'scans', scans, 'obj', await obj());
  // talk to Mara with real keys
  await tp(8, -30, Math.PI); await T(800); await key('KeyE'); await T(600);
  for (let i = 0; i < 20; i++) { const ch = await ev(() => !!__game.Game.dlgChoices); if (await ev(() => !__game.Game.dlg)) break; await key(ch ? 'Digit1' : 'Space'); await T(300); }
  log('mara joined', await ev(() => __game.Game.S.flags.mara_joined), 'obj', await obj());
  await tp(0, -63.5); await T(600); await key('KeyE'); await T(3000); log('final state', await ev(() => __game.Game.state));
  log('ERR', errs.join('|')); await b.close();
})();
