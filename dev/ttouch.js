// Chapter 1 relay -> boss -> Mara with TOUCH EVENTS ONLY (no keyboard.*, no mouse.*). Teleport between spots is allowed.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 760, height: 360 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  const ev = (f, a) => p.evaluate(f, a); const T = ms => p.waitForTimeout(ms); const log = (...a) => console.log(...a);
  const center = async sel => { const bb = await p.locator(sel).first().boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tapSel = async sel => { const [x, y] = await center(sel); await p.touchscreen.tap(x, y); };
  const hold = async (sel, ms, id) => { const [x, y] = await center(sel); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id }] }); await T(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  const tp = (x, z, yaw = 0) => ev(([x, z, y]) => __game.Player.place(x, z, y), [x, z, yaw]);
  await p.goto('file://' + process.cwd() + '/game.html'); await T(2500);
  await ev(() => { __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; __game.Settings.v.seenIntro = true; __game.Settings.v.difficulty = 'story'; __game.Settings.save(); });
  await tapSel('#tapstart'); await T(500); await tapSel('#titlemenu button:has-text("New Game")'); await T(500); await tapSel('.slot >> nth=0'); await T(1200); await tapSel('#crok');
  await p.waitForSelector('#skip', { state: 'visible', timeout: 120000 }); await T(1500); await tapSel('#skip');   // intro skippable on replay
  await p.waitForFunction(() => __game.Game.state === 'play', null, { timeout: 120000 }); await T(1500);
  log('in play. device:', await ev(() => __game.Input.device), 'touch layer on:', await ev(() => document.getElementById('touch').classList.contains('on')));
  // use virtual stick to walk (real touch)
  const [sx, sy] = await center('#tstick'); const z0 = await ev(() => __game.Player.z);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] }); for (let i = 0; i < 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy - 45, id: 1 }] }); await T(100); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  log('stick walk moved', z0.toFixed(1), '->', (await ev(() => __game.Player.z)).toFixed(1));
  // scanner by touch hold
  await tp(13.5, 38.6); await T(500); await tapSel('[data-a="interact"]'); await T(500); log('pod item:', await ev(() => __game.Game.S.items)); await hold('[data-a="scan"]', 700, 5); await T(400);
  await tp(-19, 9.5, -1.5); await T(500); await tapSel('[data-a="interact"]'); await T(500); log('items', await ev(() => __game.Game.S.items));
  // relay: tap USE, then step buttons
  await tp(13.5, -16.5); await T(700); log('prompt:', await ev(() => document.getElementById('prompt').textContent)); await tapSel('[data-a="interact"]'); await T(900); log('puzzle state', await ev(() => __game.Game.state));
  for (let i = 0; i < 160; i++) { const d = await ev(() => { const P = __game.Puzzle.cur; return P && [P.vals[0], P.target[0]]; }); if (!d) break; const diff = d[1] - d[0]; if (Math.abs(diff) < .03) { await T(300); continue; } await tapSel(`#puzctr .st[data-d="${diff > 0 ? 1 : -1}"]`); await T(30); }
  await T(1500); log('relay flag', await ev(() => __game.Game.S.flags.relay1), 'state', await ev(() => __game.Game.state));
  // radio dialogue: tap the dialogue box to advance
  for (let i = 0; i < 12; i++) { if (await ev(() => !!__game.Game.dlg)) { await tapSel('#dlgtxt'); await T(250); await tapSel('#dlgtxt'); await T(200); } else await T(400); }
  // boss with held touch buttons
  await tp(0, -36, Math.PI); await T(1500); for (let i = 0; i < 40 && !(await ev(() => __game.Boss.active)); i++) await T(500); await T(4500);
  const t0 = Date.now(); let scans = 0, rounds = 0;
  while (Date.now() - t0 < 170000 && await ev(() => __game.Boss.active && __game.Boss.b && !__game.Boss.b.dead)) {
    const st = await ev(() => { const b = __game.Boss.b, P = __game.Player; return { revealed: b.revealed, dead: P.dead, d: Math.hypot(b.x - P.x, b.z - P.z), a: Math.atan2(b.x - P.x, b.z - P.z) }; });
    if (st.dead) { await T(2200); await tapSel('#retry'); await T(600); continue; }
    if (st.revealed <= 0) { await hold('[data-a="scan"]', 650, 6); scans++; }
    // face the boss with the virtual stick (screen-up = away from camera); use stick toward boss direction relative to camera yaw
    const rel = await ev(() => { const b = __game.Boss.b, P = __game.Player, cy = __game.Cam.yaw; const dx = b.x - P.x, dz = b.z - P.z; const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy); return [dx * rx + dz * rz, -(dx * fx + dz * fz)]; });
    const l = Math.hypot(rel[0], rel[1]) || 1; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }, ] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + rel[0] / l * 40, y: sy + rel[1] / l * 40, id: 1 }] }); await T(350); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await hold('[data-a="fire"]', 1000, 7); rounds++;
    if (st.d > 15) await ev(() => { const b = __game.Boss.b; __game.Player.place(b.x + 8, b.z + 8, Math.PI); });
  }
  await T(4000); log('boss flag', await ev(() => __game.Game.S.flags.boss_guardian), 'scans', scans, 'fire rounds', rounds);
  // talk to Mara by touch
  await tp(8, -30, Math.PI); await T(900); log('prompt:', await ev(() => document.getElementById('prompt').textContent)); await tapSel('[data-a="interact"]'); await T(700);
  for (let i = 0; i < 24; i++) { if (await ev(() => !__game.Game.dlg)) break; if (await ev(() => !!__game.Game.dlgChoices)) await tapSel('#dlgch button >> nth=0'); else await tapSel('#dlgtxt'); await T(300); }
  log('mara joined', await ev(() => __game.Game.S.flags.mara_joined), 'objective', await ev(() => __game.Game.objective().text));
  await tp(0, -63.5); await T(700); await tapSel('[data-a="interact"]'); await T(3000); log('final state', await ev(() => __game.Game.state));
  log('ERR', errs.join('|')); await b.close();
})();
