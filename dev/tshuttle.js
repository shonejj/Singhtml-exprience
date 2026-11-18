const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = 4; G.S.region = 4; G.ensureQuests(); await G.loadRegion(4); G.startPlay();
    const W = __game.World, sh = W.dyn.find(c => c.kind === 'platform' && c.surf === 'metal' && Math.abs((c.x0 + c.x1) / 2 + 3) < 1);
    const mid = () => (sh.z0 + sh.z1) / 2; for (let i = 0; i < 400 && Math.abs(mid() - 11) > .4; i++) await new Promise(r => setTimeout(r, 50));
    __game.Player.place(-3, mid(), 0); const out = []; const t0 = performance.now();
    while (performance.now() - t0 < 3500) { await new Promise(r => setTimeout(r, 60)); const c = __game.Player.ch; const top = sh.y1; out.push({ rootMinusTop: +(c.y - top).toFixed(2), onPlatform: Math.abs(c.z - mid()) < 1.6, sole: c.sole.map((s, i) => +(s[1] - top).toFixed(3)) }); }
    return { top: sh.y1, samples: out.filter(o => o.onPlatform).length, total: out.length, worst: out.filter(o => o.onPlatform).reduce((m, o) => Math.max(m, ...o.sole.map(Math.abs)), 0), roots: [...new Set(out.map(o => o.rootMinusTop))].slice(0, 6) }; });
  console.log(JSON.stringify(r)); console.log(errs.join('|')); await b.close();
})();
