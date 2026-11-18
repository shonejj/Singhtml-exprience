const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 760, height: 360 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async () => { const G = __game.Game; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.ensureQuests(); await G.loadRegion(0); G.startPlay(); __game.Puzzle.open({ type: 'tune', dials: 1, title: 'Relay Tower R-7', sub: 'x', target: [.62], help: 'Slide' }, () => { }); });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/puz_mobile.png' });
  const bb = await p.locator('#puzctr .st').first().boundingBox(); console.log(JSON.stringify(bb), await p.evaluate(() => [innerHeight, document.querySelector('#puz .panel').getBoundingClientRect().height]));
  await p.touchscreen.tap(bb.x + 20, bb.y + 20); await p.waitForTimeout(200); console.log(await p.evaluate(() => __game.Puzzle.cur.vals));
  await b.close();
})();
