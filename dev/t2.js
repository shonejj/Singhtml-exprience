const { chromium } = require('playwright');
const region = +(process.argv[2] || 0), tag = process.argv[3] || 'r' + region, modes = (process.argv[4] || '0,1').split(',').map(Number);
const quality = process.argv[5] || 'high';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GPU stall')) errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message + '\n' + e.stack));
  await p.goto('file://' + process.cwd() + '/game.html');
  await p.waitForTimeout(2500);
  await p.evaluate(async ([region, q]) => { const G = __game.Game; __game.Settings.v.quality = q; __game.Settings.v.dynRes = false; __game.Settings.v.seenIntro = true; __game.Settings.save(); G.S = G.newState({ ...__game.Game.S ? {} : {}, ...(window.DEFAULT_LOOK || {}) , ...JSON.parse(JSON.stringify(eval('DEFAULT_LOOK'))) }); G.S.chapter = region; G.S.region = region; G.S.items = ['scanner', 'burst']; G.ensureQuests(); await G.loadRegion(region); G.startPlay(); }, [region, quality]);
  await p.waitForTimeout(3000);
  for (const m of modes) { await p.evaluate(m => { __game.Cam.setMode(m, true); __game.Cam.trans = null; }, m); await p.waitForTimeout(1800); await p.screenshot({ path: `shots/${tag}_cam${m}.png` }); }
  const info = await p.evaluate(() => ({ state: __game.Game.state, pos: [__game.Player.x, __game.Player.y, __game.Player.z], fps: 0, W: __game.R.W, H: __game.R.H, enemies: __game.Enemies.list.length, inter: __game.World.inter.length }));
  console.log(JSON.stringify(info)); console.log(errs.slice(0, 20).join('\n'));
  await b.close();
})();
