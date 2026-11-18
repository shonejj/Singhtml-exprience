const { chromium } = require('playwright');
const H = +(process.argv[2] || 620), tag = process.argv[3] || 'd';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: Math.round(H * 1.9), height: H } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a); const T = ms => p.waitForTimeout(ms);
  await p.goto('file://' + process.cwd() + '/game.html'); await T(3500); await p.screenshot({ path: `shots/ui_${tag}_title.png` });
  await ev(async () => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; __game.Settings.v.seenIntro = true; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.items = ['scanner', 'burst']; G.S.salvage = 60; G.S.journal = ['l_manifest', 'l_outpost']; G.ensureQuests(); await G.loadRegion(0); G.startPlay(); __game.Player.place(-12, 2, 3.1); });
  await T(5000); await ev(() => document.getElementById('chap').style.display = 'none'); await p.screenshot({ path: `shots/ui_${tag}_hud.png` });
  await p.mouse.move(400, 200); await p.mouse.down(); await T(700); await p.mouse.up(); await p.screenshot({ path: `shots/ui_${tag}_hud_fire.png` });
  await p.keyboard.press('Tab'); await T(900); await p.screenshot({ path: `shots/ui_${tag}_kit.png` });
  await p.click('#kitsub button:has-text("Upgrades")'); await T(400);
  await p.click('#kittabs button:has-text("System")'); await T(400); await p.click('#kitsub button:has-text("Options")'); await T(700); await p.screenshot({ path: `shots/ui_${tag}_options.png` });
  await p.click('#settings [data-back]'); await T(600); console.log('after Options→Done: kit visible', await ev(() => document.getElementById('kit').classList.contains('on')), 'settings visible', await ev(() => document.getElementById('settings').classList.contains('on')));
  await p.keyboard.press('Escape'); await T(500); console.log('after Esc: state', await ev(() => __game.Game.state));
  console.log('ERR', errs.join('|')); await b.close();
})();
