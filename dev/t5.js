const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async () => { const G = __game.Game; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.ensureQuests(); await G.loadRegion(0); G.startPlay(); __game.Puzzle.open({ type: 'tune', dials: 2, title: 'T', target: [.3, .6] }, () => {}); });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const c = document.getElementById('puzc'), g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let amber = 0, cyan = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 150 && d[i + 1] > 90 && d[i + 2] < 120) amber++; if (d[i] < 150 && d[i + 2] > 200) cyan++; } return { amber, cyan, P: __game.Puzzle.cur && __game.Puzzle.cur.target, state: __game.Game.state }; });
  console.log(JSON.stringify(r), errs.join('\n'));
  await p.screenshot({ path: 'shots/puz2.png' });
  await p.evaluate(() => __game.Puzzle.close(false));
  await p.evaluate(() => __game.Puzzle.open({ type: 'route', w: 5, h: 4, seed: 22, title: 'R' }, () => {})); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/puz3.png' });
  await b.close();
})();
