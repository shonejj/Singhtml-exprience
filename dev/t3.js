// single high-res chase-view screenshot with fixed weather for art direction review
const { chromium } = require('playwright');
const region = +(process.argv[2] || 0), mode = +(process.argv[3] || 1), tod = process.argv[4] || '', w = +(process.argv[5] ?? 0), tag = process.argv[6] || 'look';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async ([region, w]) => { const G = __game.Game; __game.Settings.v.quality = 'high'; __game.Settings.v.dynRes = false; __game.Settings.save(); G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = region; G.S.region = region; G.S.items = ['scanner', 'burst', 'grip', 'boots', 'key']; G.ensureQuests(); await G.loadRegion(region); G.startPlay(); G.W.tgt = __game.REGIONS[region].weather[w]; G.W.cur = Object.assign({}, G.W.tgt); }, [region, w]);
  if (tod) await p.evaluate(t => __game.Game.tod = +t, tod);
  await p.waitForTimeout(2500);
  await p.evaluate(m => { __game.Cam.setMode(m, true); __game.Cam.trans = null; }, mode); await p.waitForTimeout(1500);
  await p.screenshot({ path: `shots/${tag}.png` }); console.log(errs.join('\n')); await b.close();
})();
