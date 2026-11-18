const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 } });
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async () => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; __game.Settings.v.pixelH = 400; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.ensureQuests(); await G.loadRegion(0); G.startPlay(); __game.Player.place(3, 40, 0); document.getElementById('chap').style.display = 'none'; document.getElementById('hud').style.display = 'none';
    const P = __game.Player; __game.Cam.play([{ t: 0, eye: () => [P.x + .01, P.y + 1.0, P.z - 5.2], at: () => [P.x, P.y + .9, P.z], fov: .42 }, { t: 1, eye: () => [P.x + .01, P.y + 1.0, P.z - 5.2], at: () => [P.x, P.y + .9, P.z], fov: .42 }], null, { hold: true }); });
  for (const [label, shift] of [['walk', false], ['run', true]]) {
    await p.evaluate(() => __game.Player.place(3, 40, 0));
    await p.waitForTimeout(500);
    // face +x so the camera at -x... player yaw follows movement direction; walk along +x using D key (camera yaw default)
    if (shift) await p.keyboard.down('ShiftLeft'); await p.keyboard.down('KeyD'); await p.waitForTimeout(1200);
    for (let i = 0; i < 8; i++) { await p.screenshot({ path: `shots/gait_${label}_${i}.png`, clip: { x: 160, y: 60, width: 320, height: 300 } }); await p.waitForTimeout(95); }
    await p.keyboard.up('KeyD'); if (shift) await p.keyboard.up('ShiftLeft');
  }
  await b.close();
})();
