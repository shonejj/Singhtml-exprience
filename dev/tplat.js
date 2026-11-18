const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  const idle = async (region, x, z, label) => { await p.evaluate(async ([r, x, z]) => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = r; G.S.region = r; G.ensureQuests(); await G.loadRegion(r); G.startPlay(); __game.Player.place(x, z, 0); }, [region, x, z]); await p.waitForTimeout(2500);
    console.log(label, JSON.stringify(await p.evaluate(() => { const c = __game.Player.ch; const sol = c.sole.map(s => s[1]), g = c.sole.map(s => __game.World.ground(s[0], s[2], s[1] + .5, .5, .1).h); return { rootY: +c.y.toFixed(2), terrain: +__game.World.hf.at(c.x, c.z).toFixed(2), sole: sol.map(v => +v.toFixed(2)), under: g.map(v => +v.toFixed(2)), soleMinusUnder: sol.map((v, i) => +(v - g[i]).toFixed(3)), onGround: c.onGround }; }))); };
  await idle(1, -38, 0, 'ch2 flat street (control)');
  await idle(1, -38, -20.5, 'ch2 water-tower low platform');
  await idle(1, -38, -27.5, 'ch2 water-tower mid platform');
  console.log(errs.join('|')); await b.close();
})();
