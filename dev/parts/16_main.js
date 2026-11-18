
/* =====================================================================
   MAIN LOOP — semi-fixed timestep simulation, adaptive resolution,
   global input routing, boot sequence
   ===================================================================== */
const Main = {
  last: 0, ft: [], dynT: 0, fpsAcc: 0, fpsN: 0, fps: 60,
  menuNav() {
    const I = Input, scr = [...document.querySelectorAll('.screen.on')].pop() || ($('dlg').style.display === 'block' ? $('dlg') : null); if (!scr) return;
    const btns = [...scr.querySelectorAll('button:not(:disabled), input, select, .slot, .it')].filter(b => b.offsetParent !== null);
    if (!btns.length) return; const i = btns.indexOf(document.activeElement);
    if (I.pressed.has('Pad13') || (I.pressed.has('ArrowDown') && !Puzzle.cur && Game.state !== 'play')) { (btns[(i + 1) % btns.length] || btns[0]).focus(); }
    if (I.pressed.has('Pad12') || (I.pressed.has('ArrowUp') && !Puzzle.cur && Game.state !== 'play')) { (btns[(i - 1 + btns.length) % btns.length] || btns[0]).focus(); }
    if (I.pressed.has('Pad0') && document.activeElement && document.activeElement.click) document.activeElement.click();
  },
  route() {
    const I = Input, st = Game.state;
    if (st === 'play') {
      if (I.hit('pause') || I.pressed.has('Pad9') || I.pressed.has('T_pause')) { UI.openKit('inventory'); return; }
      if (I.hit('inventory') || I.pressed.has('Pad8')) { UI.openKit('inventory'); return; } if (I.hit('map')) { UI.openKit('map'); return; } if (I.hit('journal')) { UI.openKit('journal'); return; }
      if (I.tap('interact') && UI.inter) { const t = UI.inter; Player.ch.anim.interact = .5; Audio2.sfx('ui'); t.use(t); if (t.kind !== 'npc') Game.event('use_' + (t.id || t.kind)); }
      if (I.hit('camera') && false) { }
    } else if (st === 'dialogue') {
      if (I.pressed.has('Space') || I.pressed.has('Enter') || I.tap('interact') || I.pressed.has('Pad0')) Game.dlgAdvance();
      const chs = Game.dlgChoices; if (chs) for (let k = 0; k < chs.length; k++) if (I.pressed.has('Digit' + (k + 1))) { Game.choose(chs[k]); break; }
      this.menuNav();
    } else if (st === 'pause' || st === 'title' || st === 'creator' || st === 'chapdone' || st === 'dead') {
      if ((I.pressed.has('Escape') || I.pressed.has('Pad1') || I.pressed.has('Pad9')) && $('confirm').style.display !== 'flex' && !Input.rebinding) { if (UI.back && st !== 'title') { Audio2.sfx('ui_back'); UI.back(); } else if (st === 'title' && document.querySelector('#settings.on,#slots.on,#credits.on')) UI.back(); }
      if (st === 'pause' && (I.hit('inventory') || I.hit('map') || I.hit('journal')) && $('kit').classList.contains('on')) { const tab = I.hit('map') ? 'map' : I.hit('journal') ? 'journal' : 'inventory'; if (UI.kitTab === tab) UI.resume(); else UI.openKit(tab); }
      this.menuNav();
    } else if (st === 'record') { if ((I.pressed.has('Escape') || I.tap('interact') || I.pressed.has('Enter') || I.pressed.has('Pad0') || I.pressed.has('Pad1')) && UI.closeRecord) UI.closeRecord(); }
    else if (st === 'cine' && Game.inCine && Settings.v.seenIntro && (I.pressed.has('Escape') || I.pressed.has('Pad9'))) Game.skipFlag = true;
  },
  frame(now) {
    requestAnimationFrame(t => this.frame(t));
    let dt = Math.min(.1, (now - this.last) / 1000 || .016); const cap = Settings.v.fpsCap; if (cap && dt < 1 / (cap + 2)) return; this.last = now;
    try {
      Input.update(); this.route();
      let sdt = dt; if (Game.hitstop > 0) { Game.hitstop -= dt; sdt = 0; } if (Game.slowmo > 0) { Game.slowmo -= dt; sdt *= .35; }
      Game.dt = sdt; const n = Math.max(1, Math.ceil(sdt / (1 / 60))); for (let i = 0; i < n; i++) Game.update(sdt / n);
      if (Game.fadeTo !== undefined) { const s = Game.fadeSpeed || 2; Game.fadeV = Game.fadeV < Game.fadeTo ? Math.min(Game.fadeTo, Game.fadeV + dt * s) : Math.max(Game.fadeTo, Game.fadeV - dt * s); }
      if (Game.state === 'creator') UI.updatePreview(dt);
      if (Game.state === 'puzzle') Puzzle.update(dt);
      if (Cam.cine) Cam.updateCine(Game.state === 'pause' ? 0 : dt); else if (Game.S && Player.ch) Cam.update(dt);
      if (Game.dlgCam && !Cam.cine) { const k = 1 - Math.exp(-dt * 4); for (let i = 0; i < 3; i++) { Cam.eye[i] = lerp(Cam.eye[i], Game.dlgCam.eye[i], k); Cam.at[i] = lerp(Cam.at[i], Game.dlgCam.at[i], k); } Cam.fov = lerp(Cam.fov, .7, k); Cam.ortho = 0; }
      Game.render(); UI.hud();
      // adaptive resolution from smoothed frame time
      this.ft.push(dt); if (this.ft.length > 60) this.ft.shift(); const avg = this.ft.reduce((a, b) => a + b, 0) / this.ft.length; this.dynT += dt;
      if (Settings.v.dynRes && this.dynT > 2 && this.ft.length >= 60) { const target = 1 / (cap || 60); if (avg > target * 1.3 && R.dynScale > .55) { R.dynScale *= .88; R.resize(); this.dynT = 0; } else if (avg < target * 1.05 && R.dynScale < 1) { R.dynScale = Math.min(1, R.dynScale * 1.08); R.resize(); this.dynT = 0; } }
      this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc > .5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; if (Settings.v.showFps) $('perf').textContent = `${this.fps.toFixed(0)} fps · ${R.W}×${R.H} ×${R.scale} · chunks ${R.stats ? R.stats.chunks : 0} · particles ${FX.n} · enemies ${Enemies.list.length} · ${R.autoTier}${Settings.v.quality !== 'auto' ? '→' + Settings.v.quality : ''} · dyn ${R.dynScale.toFixed(2)}`; }
    } catch (e) { console.error(e); if (!this.errShown) { this.errShown = true; UI.toast('Error: ' + e.message); } }
    Input.endFrame();
  },
};
function GS() { return Game.S || Main.titleState || (Main.titleState = Game.newState(DEFAULT_LOOK)); }
function boot() {
  Settings.load(); Save.test(); Input.init(); FX.init();
  if (!R.init($('gl'))) { const e = $('err'); e.style.display = 'flex'; e.innerHTML = '<div><h2 style="color:var(--amber);letter-spacing:.2em">WEBGL2 UNAVAILABLE</h2><p>THE LAST FREQUENCY renders its 3D pixel-art world with WebGL2, which this browser or device does not provide' + (R.err ? ' (shader error: ' + R.err.slice(0, 200) + ')' : '') + '.</p><p class="small">Try an up-to-date Chrome, Edge, Firefox or Safari (15+), enable hardware acceleration, or use another device.</p></div>'; $('fade').classList.remove('on'); return; }
  $('fade').classList.remove('on');
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { Audio2.sfx('ui_back'); if (UI.back) UI.back(); });
  $('dlg').addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') Game.dlgAdvance(); });
  $('puzhintb').onclick = () => Puzzle.hint(); $('puzquit').onclick = () => Puzzle.close(false);
  $('retry').onclick = () => { Audio2.sfx('ui_ok'); Game.retry(); }; $('deathmenu').onclick = () => UI.toTitle();
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (Game.state === 'play') UI.openKit('inventory'); if (Audio2.ctx) Audio2.ctx.suspend(); } else if (Audio2.ctx) Audio2.ctx.resume(); });
  addEventListener('pointerdown', () => Audio2.init(), { once: true }); addEventListener('keydown', () => Audio2.init(), { once: true });
  Game.setState('title'); UI.toTitle();
  Main.last = performance.now(); requestAnimationFrame(t => Main.frame(t));
  window.__game = { Game, R, World, Player, Cam, UI, Enemies, Boss, Settings, Save, REGIONS, Scanner, Puzzle, Input, Audio2, FX, Companions };
}
window.addEventListener('error', e => { if (!R.gl) { const el = $('err'); el.style.display = 'flex'; el.textContent = 'Failed to start: ' + e.message; } });
boot();
</script>
</body>
</html>
