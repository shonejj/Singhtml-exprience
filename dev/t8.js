const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 620 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await ev(async () => { const G = __game.Game; __game.Settings.v.seenIntro = true; __game.Settings.save(); G.slot = 1; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.items = ['scanner', 'burst']; G.ensureQuests(); await G.loadRegion(0); G.startPlay(); });
  await p.waitForTimeout(1500);
  await ev(() => { __game.Player.place(-14, 4, 0); __game.Game.S.salvage = 77; __game.Game.save(1); });
  // death and retry
  await ev(() => { __game.Player.hp = 1; __game.Player.inv = 0; __game.Player.hurt(50); }); await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/death.png' });
  console.log('dead state', await ev(() => __game.Game.state)); await p.click('#retry'); await p.waitForTimeout(800); console.log('after retry', await ev(() => [__game.Game.state, __game.Player.hp, __game.Player.dead]));
  // settings screen + quality change
  await ev(() => __game.UI.openKit('settings')); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/settings.png' });
  await p.selectOption('#setbody select >> nth=0', 'ultra'); await p.waitForTimeout(800); console.log('quality', await ev(() => [__game.Settings.v.quality, __game.R.Q.shadows, __game.R.W, __game.R.H]));
  await p.click('#settabs button:has-text("Accessibility")'); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/settings_access.png' });
  await p.click('#settabs button:has-text("Controls")'); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/settings_controls.png' });
  // rebind
  await p.click('#setbody button >> nth=0'); await p.keyboard.press('KeyI'); await p.waitForTimeout(200); console.log('rebind up', await ev(() => __game.Settings.v.keys.up));
  await ev(() => { __game.Settings.v.keys.up = 'KeyW'; __game.Settings.save(); });
  // corrupt main save → recovery from backup
  await ev(() => { __game.Game.save(1); localStorage.setItem('tlf_save_1', '{"v":3,"sum":"x","body":"{}"}'); });
  console.log('recovered', await ev(() => { const d = __game.Save.read(1); return d && [d._recovered, d.salvage]; }));
  // reload & continue
  await ev(() => __game.Game.save(1)); await p.reload(); await p.waitForTimeout(2500);
  await p.click('text=Continue'); await p.waitForFunction(() => __game.Game.state === 'play', null, { timeout: 60000 }); await p.waitForTimeout(800);
  console.log('continued', await ev(() => [__game.Game.S.region, Math.round(__game.Player.x), Math.round(__game.Player.z), __game.Game.S.salvage]));
  console.log(errs.join('\n')); await b.close();
})();
