const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const dev = devices['Pixel 7 landscape'] || devices['Pixel 5 landscape'];
  const ctx = await b.newContext({ ...dev }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/m_title.png' });
  await p.evaluate(async () => { const G = __game.Game; __game.Settings.v.seenIntro = true; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.items = ['scanner', 'burst']; G.ensureQuests(); await G.loadRegion(0); G.startPlay(); });
  await p.waitForTimeout(1500); await p.touchscreen.tap(400, 200); await p.waitForTimeout(1200);
  console.log('device', await p.evaluate(() => [__game.Input.device, __game.Input.isTouch, document.getElementById('touch').className, innerWidth, innerHeight, __game.R.W, __game.R.H, __game.R.scale]));
  // drive the virtual stick
  const st = await p.locator('#tstick').boundingBox(); const cx = st.x + st.width / 2, cy = st.y + st.height / 2;
  const z0 = await p.evaluate(() => __game.Player.z);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  for (let i = 0; i < 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - 50, id: 1 }] }); await p.waitForTimeout(120); }
  await p.screenshot({ path: 'shots/m_play.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  console.log('moved', z0, '->', await p.evaluate(() => __game.Player.z));
  console.log(errs.join('\n')); await b.close();
})();
