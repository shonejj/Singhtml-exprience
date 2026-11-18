const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  const run = async (region, start, keys, label, ms, idleOK) => {
    await p.evaluate(async ([r, st, idleOK]) => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.S.chapter = r; G.S.region = r; G.ensureQuests(); await G.loadRegion(r); G.startPlay(); __game.Player.place(st[0], st[1], st[2]);
      window.__m = { min: 9, max: -9, n: 0, flips: 0, last: true, all: [] }; clearInterval(window.__iv); window.__iv = setInterval(() => { const c = __game.Player.ch; if (c.onGround !== window.__m.last) { window.__m.flips++; window.__m.last = c.onGround; } if (!c.sole || !c.sole[0] || !c.onGround || (c.speed < .5 && !window.__idleOK)) return; for (const s of c.sole) { const g = __game.World.ground(s[0], s[2], s[1] + .5, .5, .1).h; const d = s[1] - g; window.__m.all.push(d); window.__m.min = Math.min(window.__m.min, d); window.__m.max = Math.max(window.__m.max, d); window.__m.n++; } }, 16); window.__idleOK = !!idleOK; }, [region, start, idleOK]);
    await p.waitForTimeout(1500);
    for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(ms); for (const k of keys) await p.keyboard.up(k);
    console.log(label, JSON.stringify(await p.evaluate(() => { const a = window.__m.all.slice().sort((x, y) => x - y), q = f => +a[Math.floor(f * (a.length - 1))].toFixed(3); return { n: a.length, p1: q(.01), p50: q(.5), p99: q(.99), 'outside±0.12m': +(a.filter(v => Math.abs(v) > .12).length / a.length * 100).toFixed(1) + '%', flips: window.__m.flips }; })));
  };
  // Chapter 1 path (slopes), walk and sprint; Chapter 2 street (flat) and settlement rooftop-free; Chapter 6 canyon (steep)
  await run(0, [10, 44, -2.64], ['KeyW'], 'ch1 path walk (slopes)', 7000);
  await run(0, [10, 44, -2.64], ['KeyW', 'ShiftLeft'], 'ch1 path sprint (slopes)', 7000);
  await run(1, [0, 60, Math.PI], ['KeyW', 'ShiftLeft'], 'ch2 street sprint', 6000);
  await run(1, [-38, -20.5, 0], [], 'ch2 idle on water-tower platform', 2500, true);
  await run(1, [-38, -27.5, 0], [], 'ch2 idle on upper platform', 2500, true);
  await run(1, [-10, 52, Math.PI], ['KeyW'], 'ch2 walk into/across house floor', 6000, true);
  await run(4, [-3, 11, 0], [], 'ch5 standing on moving shuttle', 4000, true);
  await run(2, [0, 60, Math.PI], ['KeyW', 'ShiftLeft'], 'ch3 forest sprint', 6000);
  await run(5, [4.3, 60, Math.PI], ['KeyW', 'ShiftLeft'], 'ch6 canyon route sprint', 6000);
  console.log(errs.join('|')); await b.close();
})();
