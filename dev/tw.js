const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async () => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.ensureQuests(); await G.loadRegion(0); G.startPlay(); __game.Player.place(3, 40, Math.PI); window.__flips = 0; window.__minFoot = 9; window.__last = true; window.__air = 0;
    setInterval(() => { const c = __game.Player.ch; if (c.onGround !== window.__last) { window.__flips++; window.__last = c.onGround; } }, 8); });
  await p.waitForTimeout(800);
  for (const [label, sprint] of [['walk', false], ['run', true]]) {
    await p.evaluate(() => { window.__flips = 0; });
    if (sprint) await p.keyboard.down('ShiftLeft'); await p.keyboard.down('KeyW'); await p.waitForTimeout(5000); await p.keyboard.up('KeyW'); if (sprint) await p.keyboard.up('ShiftLeft');
    console.log(label, JSON.stringify(await p.evaluate(() => ({ flips: window.__flips, z: __game.Player.z, speed: __game.Player.ch.speed }))));
    await p.evaluate(() => __game.Player.place(3, 40, Math.PI));
  }
  await b.close();
})();
