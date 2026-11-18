const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => { __game.Settings.v.quality = 'medium'; __game.Settings.v.dynRes = false; __game.Settings.save(); });
  await p.click('text=New Game'); await p.waitForTimeout(400); await p.click('.slot >> nth=0'); await p.waitForTimeout(1200); await p.click('#crok');
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < 130000) { await p.waitForTimeout(1700); const st = await p.evaluate(() => [__game.Game.state, document.getElementById('cinetext').innerText.replace(/\n/g, ' | ').slice(0, 70)]); await p.screenshot({ path: `shots/in_${String(i).padStart(2, '0')}.png` }); console.log(i, st.join(' ')); i++; if (st[0] === 'play') break; }
  console.log('ERR', errs.join('|')); await b.close();
})();
