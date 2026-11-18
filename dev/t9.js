const { chromium } = require('playwright');
const E = process.argv[2] || 'A';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await ev(async () => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.seenIntro = true; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = 7; G.S.region = 7; G.S.items = ['scanner', 'burst', 'stone']; G.S.freqs = [1, 2, 3, 4, 5, 6, 7, 8]; G.S.crew = ['mara', 'nova', 'elias']; Object.assign(G.S.flags, { harmony8: 1, boss_chorus: 1, betrayal: 1 }); G.ensureQuests(); await G.loadRegion(7); G.startPlay(); __game.Player.place(0, -54, 3.1); });
  await p.waitForTimeout(1500);
  await ev(() => __game.Game.dialogue('heart')); for (let i = 0; i < 10; i++) { await ev(() => { const G = __game.Game; if (!G.dlgChoices) { G._full = ''; G.dlgStep(); } }); await p.waitForTimeout(200); }
  console.log('choices', await ev(() => (__game.Game.dlgChoices || []).map(c => c.t)));
  await p.screenshot({ path: `shots/e_${E}_choice.png` });
  await ev(e => { const G = __game.Game; const ch = G.dlgChoices; G.choose(ch[{ A: 0, B: 1, C: 2, D: 3 }[e]]); }, E);
  for (let i = 0; i < 16; i++) { await p.waitForTimeout(6000); await p.screenshot({ path: `shots/e_${E}_${i}.png` }); const st = await ev(() => [__game.Game.state, document.querySelector('.screen.on')?.id, document.getElementById('cinetext').textContent.slice(0, 60)]); console.log(i, JSON.stringify(st)); if (st[0] === 'title') break; }
  console.log('endings', await ev(() => (__game.Save.global().endings || [])));
  console.log(errs.join('\n')); await b.close();
})();
