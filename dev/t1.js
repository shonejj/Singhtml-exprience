const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message + '\n' + e.stack));
  await p.goto('file://' + process.cwd() + '/game.html');
  await p.waitForTimeout(6000);
  await p.screenshot({ path: 'shots/title.png' });
  console.log(errs.slice(0,30).join("\n")); const info = await p.evaluate(() => ({ state: __game.Game.state, W: __game.R.W, H: __game.R.H, tier: __game.R.autoTier, gpu: __game.R.gpuName, chunks: __game.R.chunks.length }));
  console.log(JSON.stringify(info));
  console.log(errs.slice(0, 30).join('\n'));
  await b.close();
})();
