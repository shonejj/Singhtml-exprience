const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  const run = async (region, start, keys, label, ms) => {
    await p.evaluate(async ([r, st]) => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = r; G.S.region = r; G.ensureQuests(); await G.loadRegion(r); G.startPlay(); __game.Player.place(st[0], st[1], st[2]);
      window.__m = { min: 9, max: -9, n: 0, flips: 0, last: true }; clearInterval(window.__iv); window.__iv = setInterval(() => { const c = __game.Player.ch; if (c.onGround !== window.__m.last) { window.__m.flips++; window.__m.last = c.onGround; } if (!c.sole || !c.sole[0] || !c.onGround || c.speed < .5) return; for (const s of c.sole) { const g = __game.World.ground(s[0], s[2], s[1] + .5, .5, .1).h; const d = s[1] - g; if (Math.abs(d) > .3) { window.__m.bad = window.__m.bad || []; if (window.__m.bad.length < 3) window.__m.bad.push({ dbg: JSON.stringify(c.dbg, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v), st: __game.Player.state, mantle: +c.anim.mantle.toFixed(2), plant: +c.pose.plant.toFixed(2), d: +d.toFixed(2), root: [c.x, c.y, c.z].map(v => +v.toFixed(2)), sole: s.map(v => +v.toFixed(2)), g: +g.toFixed(2), hf: +__game.World.hf.at(s[0], s[2]).toFixed(2), rootHf: +__game.World.hf.at(c.x, c.z).toFixed(2) }); } window.__m.min = Math.min(window.__m.min, d); window.__m.max = Math.max(window.__m.max, d); window.__m.n++; } }, 16); }, [region, start]);
    await p.waitForTimeout(1500);
    for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(ms); for (const k of keys) await p.keyboard.up(k);
    console.log(label, JSON.stringify(await p.evaluate(() => ({ ...window.__m, speed: +__game.Player.ch.speed.toFixed(1) }))));
  };
  // Chapter 1 path (slopes), walk and sprint; Chapter 2 street (flat) and settlement rooftop-free; Chapter 6 canyon (steep)
  await run(0, [2, 54, Math.PI], ['KeyW'], 'ch1 walk (slope)', 7000);
  
  
  
  
  console.log(errs.join('|')); await b.close();
})();
