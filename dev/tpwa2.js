const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/Singhtml-exprience/index.html'); await p.waitForTimeout(3000);
  console.log('portrait viewport', await p.evaluate(() => [innerWidth, innerHeight]));
  console.log('tapstart', await p.evaluate(() => getComputedStyle(document.getElementById('tapstart')).display), 'rot', await p.evaluate(() => getComputedStyle(document.getElementById('rot')).display));
  await p.screenshot({ path: 'shots/pwa_portrait.png' });
  console.log('sw ready', await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return [r.scope, !!r.active]; }));
  const m = await p.evaluate(async () => { const l = document.querySelector('link[rel=manifest]').href; const j = await (await fetch(l)).json(); const ic = await Promise.all(j.icons.map(i => fetch(new URL(i.src, l)).then(r => r.status))); return { l, d: j.display, o: j.orientation, start: j.start_url, ic }; });
  console.log('manifest', JSON.stringify(m));
  const cdp = await ctx.newCDPSession(p); const inst = await cdp.send('Page.getInstallabilityErrors'); console.log('installability errors', JSON.stringify(inst.installabilityErrors));
  // offline: reload from service worker cache
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(2500); console.log('offline loads title:', await p.evaluate(() => !!window.__game && __game.Game.state));
  await ctx.setOffline(false);
  // landscape: tap start then check state
  const ctx2 = await b.newContext({ ...devices['Pixel 7 landscape'] }); const p2 = await ctx2.newPage(); await p2.goto('http://127.0.0.1:8767/Singhtml-exprience/index.html'); await p2.waitForTimeout(3000);
  await p2.screenshot({ path: 'shots/pwa_tap.png' }); await p2.touchscreen.tap(400, 200); await p2.waitForTimeout(1500);
  console.log('landscape tapstart after tap', await p2.evaluate(() => getComputedStyle(document.getElementById('tapstart')).display), 'rot', await p2.evaluate(() => getComputedStyle(document.getElementById('rot')).display), 'fs', await p2.evaluate(() => !!document.fullscreenElement));
  await p2.screenshot({ path: 'shots/pwa_title_land.png' });
  console.log(errs.join('|')); await b.close();
})();
