const { chromium } = require('playwright');
const [region, x, z, yaw, tag, sprint] = [+process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6], process.argv[7] === 'sprint'];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 } });
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async ([r, x, z, yaw]) => { const G = __game.Game; __game.Settings.v.quality = 'low'; __game.Settings.v.dynRes = false; __game.Settings.v.pixelH = 400; G.S = G.newState(JSON.parse(JSON.stringify(eval('DEFAULT_LOOK')))); G.ensureQuests(); await G.loadRegion(r); G.startPlay(); __game.Player.place(x, z, yaw); document.getElementById('chap').style.display = 'none'; document.getElementById('hud').style.display = 'none';
    const P = __game.Player; const eye = () => { const c = P.ch; return [P.x + Math.cos(c.yaw) * 5, P.y + 1.0, P.z - Math.sin(c.yaw) * 5]; }; const at = () => [P.x, P.y + .85, P.z]; __game.Cam.play([{ t: 0, eye, at, fov: .5 }, { t: 1, eye, at, fov: .5 }], null, { hold: true }); }, [region, x, z, yaw]);
  await p.waitForTimeout(600); if (sprint) await p.keyboard.down('ShiftLeft'); await p.keyboard.down('KeyW'); await p.waitForTimeout(1300);
  for (let i = 0; i < 8; i++) { await p.screenshot({ path: `shots/g2_${tag}_${i}.png`, clip: { x: 170, y: 40, width: 300, height: 320 } }); await p.waitForTimeout(90); }
  await p.keyboard.up('KeyW'); if (sprint) await p.keyboard.up('ShiftLeft'); await b.close();
})();
