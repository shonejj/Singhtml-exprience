const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR: ' + e.message + ' ' + e.stack.split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const log = (...a) => console.log(...a);
  const ev = (f, a) => p.evaluate(f, a);
  const shot = n => p.screenshot({ path: 'shots/' + n + '.png' });
  await p.goto('file://' + process.cwd() + '/game.html'); await p.waitForTimeout(2500);
  await ev(() => { __game.Settings.v.quality = 'medium'; __game.Settings.v.dynRes = false; __game.Settings.save(); });
  await p.click('text=New Game'); await p.waitForTimeout(500); await shot('p_slots');
  await p.click('.slot >> nth=0'); await p.waitForTimeout(1500); await shot('p_creator');
  await p.click('#cranims button:has-text("run")'); await p.waitForTimeout(800); await shot('p_creator_run');
  await p.click('#crok'); log('intro started');
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(4000); await shot('p_intro' + i); }
  await p.waitForFunction(() => __game.Game.state === 'play', null, { timeout: 60000 }); log('state play after intro', await ev(() => [__game.Player.x, __game.Player.z]));
  await p.waitForTimeout(1500); await shot('p_wake');
  // walk forward with keyboard
  const z0 = await ev(() => __game.Player.z); await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW'); log('moved', z0, '->', await ev(() => __game.Player.z));
  await p.keyboard.press('KeyC'); await p.waitForTimeout(1200); await shot('p_camC');
  // drop pod
  await ev(() => __game.Player.place(13.5, 38.6, 0)); await p.waitForTimeout(800); log('prompt:', await ev(() => document.getElementById('prompt').textContent));
  await p.keyboard.press('KeyE'); await p.waitForTimeout(600); log('items', await ev(() => __game.Game.S.items), 'obj', await ev(() => __game.Game.objective().text));
  await p.keyboard.down('KeyQ'); await p.waitForTimeout(700); await shot('p_scan'); await p.keyboard.up('KeyQ'); await p.waitForTimeout(400); log('obj', await ev(() => __game.Game.objective().text));
  // outpost: fight
  await ev(() => __game.Player.place(-12, 2, 3.14)); await p.waitForTimeout(1500); await p.mouse.move(640, 300);
  for (let i = 0; i < 10; i++) { await p.mouse.down(); await p.waitForTimeout(250); await p.mouse.up(); }
  await shot('p_combat');
  await ev(() => __game.Enemies.list.forEach(e => { if (Math.hypot(e.x + 14, e.z - 8) < 20) __game.Enemies.damage(e, 999); }));
  await ev(() => __game.Player.place(-19, 9.5, -1.5)); await p.waitForTimeout(500); log('prompt:', await ev(() => document.getElementById('prompt').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(500);
  log('items', await ev(() => __game.Game.S.items), 'obj', await ev(() => __game.Game.objective().text));
  await p.keyboard.press('KeyF'); await p.waitForTimeout(300); await shot('p_burst');
  // relay tower puzzle
  await ev(() => __game.Player.place(13.5, -16.5, 3.14)); await p.waitForTimeout(800); log('prompt:', await ev(() => document.getElementById('prompt').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(800); await shot('p_puzzle');
  await ev(() => { const P = __game.Puzzle.cur; P.vals = P.target.slice(); }); await p.waitForTimeout(2000); log('relay1', await ev(() => __game.Game.S.flags.relay1), 'state', await ev(() => __game.Game.state));
  await p.waitForTimeout(3500); log('state', await ev(() => __game.Game.state)); await shot('p_dialogue');
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(200); }
  log('state after dlg', await ev(() => __game.Game.state), 'obj', await ev(() => __game.Game.objective().text));
  // boss
  await ev(() => __game.Player.place(0, -34, 3.14)); await p.waitForTimeout(2500); log('boss', await ev(() => __game.Boss.active)); await shot('p_bossintro'); await p.waitForTimeout(3000); await shot('p_boss');
  await ev(() => { __game.Boss.b.revealed = 99; }); for (let i = 0; i < 30; i++) { await ev(() => __game.Boss.b && __game.Boss.damage(40)); await p.waitForTimeout(100); }
  await p.waitForTimeout(800); await shot('p_bossdeath'); await p.waitForTimeout(3000); log('boss flag', await ev(() => __game.Game.S.flags.boss_guardian), 'obj', await ev(() => __game.Game.objective().text), 'state', await ev(() => __game.Game.state));
  await ev(() => { const m = __game.Companions.get('mara'); return m && [m.x, m.z]; }).then(r => log('mara', r));
  await ev(() => __game.Player.place(8, -30, 3.14)); await p.waitForTimeout(800); log('prompt:', await ev(() => document.getElementById('prompt').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(800); await shot('p_mara');
  for (let i = 0; i < 14; i++) { const ch = await ev(() => !!__game.Game.dlgChoices); if (ch) await p.keyboard.press('Digit1'); else await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  log('mara joined', await ev(() => __game.Game.S.flags.mara_joined), 'crew', await ev(() => __game.Game.S.crew), 'state', await ev(() => __game.Game.state));
  // pause kit & map
  await p.keyboard.press('KeyM'); await p.waitForTimeout(900); await shot('p_map'); await p.click('#mapw'); await p.waitForTimeout(500); await shot('p_worldmap');
  await p.click('#kittabs button:has-text("Journal")'); await p.waitForTimeout(400); await shot('p_journal');
  await p.click('#kittabs button:has-text("Objectives")'); await p.waitForTimeout(400); await shot('p_quests');
  await p.click('#kittabs button:has-text("Inventory")'); await p.waitForTimeout(400); await shot('p_inventory');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); log('state after esc', await ev(() => __game.Game.state));
  // exit
  await ev(() => __game.Player.place(0, -63.5, 3.14)); await p.waitForTimeout(600); log('prompt:', await ev(() => document.getElementById('prompt').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(2000); await shot('p_chapdone');
  await p.click('#cdnext'); await p.waitForFunction(() => __game.Game.state === 'play' && __game.Game.S.region === 1, null, { timeout: 60000 }); await p.waitForTimeout(2500); await shot('p_ch2');
  log('ch2 obj', await ev(() => __game.Game.objective().text), 'crew', await ev(() => __game.Companions.list.map(c => c.id)));
  log('autosave', await ev(() => { const d = __game.Save.read('auto'); return d && [d.chapter, d.region]; }));
  log('ERRORS:\n' + errs.join('\n'));
  await b.close();
})();
