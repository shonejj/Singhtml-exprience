
/* =====================================================================
   UI — menus, HUD, field kit, maps, journal, settings, creator, slots
   ===================================================================== */
const UI = {
  dmgNums: [], stack: [],
  show(id) { $(id).classList.add('on'); }, hide(id) { $(id).classList.remove('on'); },
  hideAll() { document.querySelectorAll('.screen.on').forEach(s => s.classList.remove('on')); },
  toast(t, cls) { const d = document.createElement('div'); d.textContent = t; if (cls) d.className = cls; $('toast').appendChild(d); while ($('toast').children.length > 2) $('toast').firstChild.remove(); setTimeout(() => d.remove(), 2600); },
  fmtTime(s) { s = Math.floor(s || 0); return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`; },
  tip() { return ['The Echoed hunt by sound. Crouch, and they lose you.', 'Scan often — Vesper-9 hides more than it shows.', 'Every camera shows the same world. Try them all.', 'Hidden frequencies are scattered across all eight regions.', 'Some heights need tools you have not found yet. Come back.', 'Records you recover are kept in your journal, with evidence marked.', 'Your crew remember things they should not.'][Math.floor(Math.random() * 7)]; },
  confirm(text, yes) { $('confirmtxt').textContent = text; $('confirm').style.display = 'flex'; $('confirmyes').onclick = () => { $('confirm').style.display = 'none'; Audio2.sfx('ui_ok'); yes(); }; $('confirmno').onclick = () => { $('confirm').style.display = 'none'; Audio2.sfx('ui_back'); }; },
  showRecord(L) { const prev = Game.state === 'play' ? 'play' : null; if (prev) Game.setState('record');
    $('confirmtxt').innerHTML = `<div style="color:var(--amber);letter-spacing:.15em;margin-bottom:8px">${L.title.toUpperCase()}${L.evidence ? ' <span class="small" style="color:var(--cyan)">◈ EVIDENCE</span>' : ''}</div><div style="white-space:pre-wrap">${L.text}</div>`;
    $('confirm').style.display = 'flex'; $('confirmno').style.display = 'none'; $('confirmyes').textContent = 'Close'; $('confirmyes').focus();
    this.closeRecord = () => { $('confirm').style.display = 'none'; $('confirmno').style.display = ''; $('confirmyes').textContent = 'Confirm'; this.closeRecord = null; if (prev && Game.state === 'record') Game.setState('play'); };
    $('confirmyes').onclick = () => { Audio2.sfx('ui_back'); this.closeRecord && this.closeRecord(); }; },
  /* ---------------- title ---------------- */
  toTitle() {
    Game.S = null; Game.setState('title'); this.hideAll(); $('hud').style.display = 'none'; $('bossbar').style.display = 'none'; Boss.active = false; Companions.list = []; Enemies.clear(); Game.cinematic(false);
    const go = async () => { if (!World.region || World.region.id !== 'ashen') { await Game.loadRegion(0); } Game.setState('title'); Player.init(DEFAULT_LOOK); Player.place(9999, 9999); this.titleCam(); this.show('title'); this.titleMenu(); Game.fade(1.5); Audio2.setRegionMusic(REGIONS[0].music); };
    go();
  },
  titleCam() { const t = Game.time; Cam.play([{ t: 0, eye: [30, 9, 66], at: [0, 4, 40], fov: .8 }, { t: 60, eye: [-26, 12, 70], at: [6, 3, 36], fov: .75 }], null, { hold: true }); },
  titleMenu() {
    const m = $('titlemenu'); m.innerHTML = ''; const latest = Save.latest();
    const add = (t, fn, dis) => { const b = document.createElement('button'); b.textContent = t; b.disabled = !!dis; b.onclick = () => { Audio2.init(); Audio2.sfx('ui_ok'); fn(); }; b.onmouseenter = () => Audio2.sfx('ui'); m.appendChild(b); return b; };
    add('Continue', () => Game.continueFrom(latest.slot, latest.data), !latest);
    add('New Game', () => this.slots('new')); add('Load Game', () => this.slots('load'), !latest);
    add('Options', () => this.settings('graphics')); add('Credits', () => this.showCredits());
    if (typeof Install !== 'undefined' && Install.can()) add('Install app', () => Install.prompt());
    setTimeout(() => m.querySelector('button:not(:disabled)') && m.querySelector('button:not(:disabled)').focus(), 50);
    const g = Save.global(); $('titleinfo').innerHTML = (latest ? `Continue: ${REGIONS[latest.data.region].name}<br>` : '') + (g.endings && g.endings.length ? `Endings: ${g.endings.length}/4<br>` : '') + (Save.ok ? '' : '<span style="color:var(--red)">' + Save.err + '</span>');
  },
  slots(mode) {
    this.back = () => { this.hide('slots'); this.show('title'); }; this.hide('title'); this.show('slots'); $('slotstitle').textContent = mode === 'new' ? 'New Game — choose a slot' : mode === 'save' ? 'Save Game' : 'Load Game'; const L = $('slotlist'); L.innerHTML = '';
    const slots = mode === 'load' ? ['auto', 1, 2, 3] : [1, 2, 3];
    for (const s of slots) { const d = Save.read(s); const el = document.createElement('div'); el.className = 'slot'; el.tabIndex = 0;
      el.innerHTML = `<div class="n">${s === 'auto' ? 'AUTO' : 'SLOT ' + s}</div><div class="d">${d ? `Chapter ${REGIONS[d.chapter].num} · ${REGIONS[d.region].name}<br>${UI.fmtTime(d.playTime)} · ${new Date(d.time).toLocaleString()}${d._recovered ? ' · recovered from backup' : ''}` : 'Empty'}</div>${d && mode !== 'save' ? '<button data-del>Delete</button>' : ''}`;
      const act = () => { Audio2.init(); Audio2.sfx('ui_ok');
        if (mode === 'new') { const go = () => { this.hide('slots'); this.creator(s); }; if (d) this.confirm(`Slot ${s} already holds a game. Starting a new game here will overwrite it when you first save. Continue?`, go); else go(); }
        else if (mode === 'load') { if (!d) return; this.hide('slots'); Game.continueFrom(s, d); }
        else if (mode === 'save') { const go = () => { Game.save(s); this.slots('save'); }; if (d) this.confirm(`Overwrite slot ${s}? (The previous save is kept as a backup.)`, go); else go(); } };
      el.onclick = e => { if (e.target.dataset.del !== undefined) { e.stopPropagation(); this.confirm(`Delete ${s === 'auto' ? 'the autosave' : 'slot ' + s} permanently?`, () => { Save.del(s); this.slots(mode); }); return; } act(); }; el.onkeydown = e => { if (e.key === 'Enter') act(); };
      L.appendChild(el); }
    if (mode === 'save') this.back = () => { this.hide('slots'); this.openKit('save'); };
  },
  /* ---------------- character creator ---------------- */
  creator(slot, browseOnly, inGame) {
    this.hideAll(); Game.setState('creator'); this.show('creator'); this.crSlot = slot; const look = this.crLook = JSON.parse(JSON.stringify(inGame ? Game.S.look : (Save.global().lastLook || DEFAULT_LOOK)));
    $('crok').textContent = browseOnly ? 'Done' : inGame ? 'Apply' : 'Begin Expedition'; $('crsub').textContent = browseOnly ? 'Preview only — appearance is chosen when starting a new game' : 'Appearance never affects gameplay';
    this.prevYaw = null; const ch = this.previewChar = makeChar(look); const px = 7, pz = 49; ch.x = px; ch.z = pz; ch.y = World.ground(px, pz, 999).h; ch.yaw = -2.4; this.prevAnim = 'idle';
    // frame the explorer in the right half of the screen (the options panel covers the left)
    const ex = px - 3.4, ez = pz - 2.6, fx = px - ex, fz = pz - ez, fl = Math.hypot(fx, fz), rx = -fz / fl, rz = fx / fl; const sh = innerWidth > 760 ? 1.15 : 0;
    const key = { eye: [ex - rx * sh, ch.y + 1.45, ez - rz * sh], at: [px - rx * sh, ch.y + .95, pz - rz * sh], fov: .62 }; Cam.play([{ t: 0, ...key }, { t: 1, ...key }], null, { hold: true }); ch.yaw = Math.atan2(ex - px, ez - pz) + .5;
    const O = $('cropts'); O.innerHTML = '';
    const opt = (label, key, list, color) => { const row = document.createElement('div'); row.className = 'opt'; row.innerHTML = `<label>${label}</label><div class="ctl"></div>`; const ctl = row.querySelector('.ctl');
      if (color) { list.forEach((c, i) => { const s = document.createElement('div'); s.className = 'sw' + (look[key] === i ? ' sel' : ''); s.style.background = c; s.onclick = () => { look[key] = i; ctl.querySelectorAll('.sw').forEach((x, j) => x.classList.toggle('sel', j === i)); this.crUpdate(); }; ctl.appendChild(s); }); }
      else { const prev = document.createElement('button'), val = document.createElement('span'), next = document.createElement('button'); prev.textContent = '◂'; next.textContent = '▸'; val.className = 'val';
        const upd = () => { const ok = Game.cosUnlocked ? (key in UNLOCKABLE ? !(UNLOCKABLE[key][look[key]]) || UI.cosOk(key, look[key]) : true) : true; val.textContent = list[look[key]] + (ok ? '' : ' 🔒'); };
        const step = d => { let v = look[key]; for (let k = 0; k < list.length; k++) { v = (v + d + list.length) % list.length; if (!(key in UNLOCKABLE) || !UNLOCKABLE[key][v] || UI.cosOk(key, v)) break; } look[key] = v; upd(); this.crUpdate(); Audio2.sfx('ui'); };
        prev.onclick = () => step(-1); next.onclick = () => step(1); ctl.append(prev, val, next); upd(); }
      O.appendChild(row); };
    const sec = t => { const h = document.createElement('div'); h.className = 'small'; h.style.cssText = 'color:var(--amber);letter-spacing:.2em;margin:10px 0 2px'; h.textContent = t; O.appendChild(h); };
    sec('BODY'); opt('Presentation', 'presentation', CUSTOM.presentation); opt('Build', 'body', CUSTOM.body); opt('Skin / surface', 'skin', CUSTOM.skin, true); opt('Face detail', 'face', CUSTOM.face); opt('Eyes', 'eyes', CUSTOM.eyes, true);
    sec('HAIR & HEAD'); opt('Hair style', 'hair', CUSTOM.hair); opt('Hair colour', 'hairCol', CUSTOM.hairCol, true); opt('Headwear', 'helmet', CUSTOM.helmet);
    sec('CLOTHING'); opt('Jacket', 'jacket', CUSTOM.jacket); opt('Jacket colour', 'jacketCol', CUSTOM.cloth, true); opt('Suit pattern', 'pattern', CUSTOM.pattern); opt('Accent colour', 'accent', CUSTOM.cloth, true); opt('Trousers', 'trousers', CUSTOM.cloth, true);
    opt('Boots', 'boots', CUSTOM.boots); opt('Boot colour', 'bootCol', CUSTOM.cloth, true); opt('Gloves', 'gloves', CUSTOM.gloves); opt('Glove colour', 'gloveCol', CUSTOM.cloth, true);
    sec('EQUIPMENT & ACCESSORIES'); opt('Backpack', 'pack', CUSTOM.pack); opt('Accessory', 'accessory', CUSTOM.accessory); opt('Accessory colour', 'accCol', CUSTOM.cloth, true); opt('Emblem', 'emblem', CUSTOM.emblem); opt('Emblem colour', 'emblemCol', CUSTOM.cloth, true);
    const A = $('cranims'); A.innerHTML = ''; for (const a of ['idle', 'walk', 'run', 'turn', 'jump', 'combat', 'interact']) { const b = document.createElement('button'); b.textContent = a; b.onclick = () => { this.prevAnim = a; this.prevT = 0; }; A.appendChild(b); }
    $('crrand').onclick = () => { for (const k in DEFAULT_LOOK) { const n = { presentation: 3, body: 3, skin: 8, hair: 7, hairCol: 9, eyes: 6, face: 5, jacket: 4, jacketCol: 10, pattern: 4, accent: 10, trousers: 10, boots: 3, bootCol: 10, gloves: 3, gloveCol: 10, pack: 4, helmet: 5, accessory: 5, accCol: 10, emblem: 5, emblemCol: 10 }[k]; let v = Math.floor(Math.random() * n); if (UNLOCKABLE[k] && UNLOCKABLE[k][v] && !UI.cosOk(k, v)) v = 0; look[k] = v; } this.creator(slot, browseOnly, inGame); this.crLook = look; Object.assign(this.crLook, look); this.previewChar.look = look; this.crUpdate(); };
    $('crok').onclick = () => { Audio2.sfx('ui_ok'); const g = Save.global(); g.lastLook = look; Save.setGlobal(g); this.hide('creator'); this.previewChar = null; Cam.cine = null;
      if (inGame) { Game.S.look = look; Player.ch.look = look; Player.ch.cols = lookCols(look); Player.ch.scarf = null; Game.setState('pause'); this.openKit('character'); }
      else if (browseOnly) this.toTitle(); else Game.newGame(slot, look); };
    this.back = () => { this.hide('creator'); this.previewChar = null; Cam.cine = null; if (inGame) { Game.setState('pause'); this.openKit('character'); } else this.toTitle(); };
    this.crUpdate();
  },
  cosOk(k, v) { const need = (UNLOCKABLE[k] || {})[v]; if (!need) return true; const g = Save.global(); const n = +need.slice(2) - 1; return (Game.S && (Game.S.cos[k + v] || Game.S.chapter >= n)) || (g.cos && g.cos[k + v]) || (g.maxCh || 0) >= n; },
  crUpdate() { const c = this.previewChar; if (!c) return; c.look = this.crLook; c.cols = lookCols(c.look); c.scarf = null; },
  updatePreview(dt) {
    const c = this.previewChar; if (!c) return; this.prevT = (this.prevT || 0) + dt; const a = this.prevAnim; const s = c.anim;
    s.aim = a === 'combat' ? 1 : 0; s.interact = a === 'interact' ? .2 : 0; c.speed = a === 'walk' ? 1.6 : a === 'run' ? 5 : 0; c.onGround = true;
    if (a === 'turn') c.yaw += dt * 1.6; else c.yaw = lerpAng(c.yaw, this.prevYaw ?? c.yaw, dt * 3); if (this.prevYaw == null) this.prevYaw = c.yaw;
    if (a === 'jump') { const t = this.prevT % 1.4; c.onGround = t > .9; c.vy = t < .45 ? 1 : -1; c.y = World.ground(c.x, c.z, 999).h + Math.max(0, Math.sin(Math.min(t / .9, 1) * Math.PI)) * 1.1; if (t > .9 && t < .95) s.land = .2; } else c.y = World.ground(c.x, c.z, 999).h;
    if (c.look.accessory === 1) stepScarf(c, dt, Game.wind); Anim.update(c, dt);
  },
  /* ---------------- settings ---------------- */
  settings(tab, fromKit) {
    this.setTab = tab; this.hideAll(); this.show('settings'); this.back = () => { this.hide('settings'); if (Game.S) { this.openKit('save'); } else { this.show('title'); this.titleMenu(); } }; this.setFrom = fromKit;
    const tabs = [['graphics', 'Graphics'], ['audio', 'Audio'], ['gameplay', 'Gameplay'], ['controls', 'Controls'], ['access', 'Accessibility']]; const T = $('settabs'); T.innerHTML = '';
    for (const [k, n] of tabs) { const b = document.createElement('button'); b.textContent = n; b.className = k === tab ? 'sel' : ''; b.onclick = () => this.settings(k, fromKit); T.appendChild(b); }
    const B = $('setbody'); B.innerHTML = ''; const v = Settings.v;
    const row = (label, ctl, val) => { const r = document.createElement('div'); r.className = 'row'; const l = document.createElement('label'); l.textContent = label; r.append(l, ctl); if (val) r.append(val); B.appendChild(r); return r; };
    const sel = (label, key, opts, cb) => { const s = document.createElement('select'); for (const [k, n] of opts) { const o = document.createElement('option'); o.value = k; o.textContent = n; if (String(v[key]) === String(k)) o.selected = true; s.appendChild(o); } s.onchange = () => { const raw = s.value; v[key] = isNaN(+raw) || raw === '' ? raw : +raw; if (raw === 'true' || raw === 'false') v[key] = raw === 'true'; Settings.save(); if (cb) cb(); }; return row(label, s); };
    const rng = (label, key, min, max, step, fmt = x => x) => { const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v[key]; const val = document.createElement('span'); val.className = 'v'; val.textContent = fmt(v[key]); i.oninput = () => { v[key] = +i.value; val.textContent = fmt(v[key]); Settings.save(); }; return row(label, i, val); };
    const chk = (label, key) => { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!v[key]; i.onchange = () => { v[key] = i.checked; Settings.save(); }; return row(label, i); };
    const lv = [[0, 'Off / Low'], [1, 'Medium'], [2, 'High'], [3, 'Ultra']]; const pct = x => Math.round(x * 100) + '%';
    if (tab === 'graphics') {
      sel('Quality preset', 'quality', [['auto', 'Automatic (' + R.autoTier + ')'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra'], ['custom', 'Custom (use settings below)']], () => this.settings('graphics', fromKit));
      const custom = v.quality === 'custom'; const note = document.createElement('div'); note.className = 'small'; note.style.margin = '6px 0'; note.textContent = custom ? 'Custom: every option below applies.' : 'Presets control the options below; choose Custom to fine-tune them.'; B.appendChild(note);
      sel('Pixel resolution (vertical pixels)', 'pixelH', [[0, 'Preset'], [160, '160 · chunky'], [200, '200'], [240, '240'], [280, '280'], [320, '320'], [400, '400 · fine']]);
      chk('Dynamic resolution (keeps frame rate)', 'dynRes');
      sel('Shadow quality', 'shadows', lv); sel('Reflections (planar water + screen-space)', 'reflections', lv); sel('Ambient occlusion', 'ssao', [[0, 'Off'], [1, 'On']]); sel('Lighting (point lights)', 'lighting', [[0, 'Simple (3 lights)'], [1, 'Standard'], [2, 'Full (8 lights)']]);
      sel('Particle quality', 'particles', lv); sel('Vegetation density', 'vegetation', lv); sel('Draw distance (detail LOD)', 'drawDist', lv); sel('Fog quality', 'fog', [[0, 'Light'], [1, 'Medium'], [2, 'Full']]); sel('Post-processing', 'post', lv);
      chk('Pixel edge ink (outline treatment)', 'edges'); chk('Stepped hand-animated wind (8 fps)', 'steppedWind'); rng('Film grain', 'grain', 0, 1, .05, pct); chk('Chromatic aberration on signal events', 'chroma');
      sel('Frame-rate target', 'fpsCap', [[30, '30'], [60, '60'], [0, 'Uncapped (display refresh / VSync)']]); chk('Show performance overlay', 'showFps');
      const adv = chk('Advanced rendering mode (experimental)', 'advanced'); const n2 = document.createElement('div'); n2.className = 'small'; n2.style.marginTop = '8px';
      n2.textContent = 'Hardware ray tracing is not exposed by any standard browser API; this game does not claim it. "Advanced" raises screen-space reflection and AO quality only. ' + (navigator.gpu ? 'WebGPU detected but not required.' : 'WebGPU not detected (not required).') + ' Renderer: WebGL2 · ' + (R.gpuName || 'unknown GPU'); B.appendChild(n2);
    }
    if (tab === 'audio') { for (const [k, n] of [['master', 'Master'], ['music', 'Music'], ['sfx', 'Effects'], ['ambient', 'Ambience'], ['dialogue', 'Dialogue'], ['radio', 'Radio / signals']]) rng(n + ' volume', k, 0, 1, .05, pct); chk('Wide dynamic range (off = compressed for small speakers)', 'dynRange'); }
    if (tab === 'gameplay') { rng('Camera sensitivity', 'sens', .2, 3, .05, x => x.toFixed(2)); chk('Invert camera Y', 'invertY'); chk('Invert camera X', 'invertX'); rng('Camera distance', 'camDist', .6, 1.6, .05, x => x.toFixed(2)); rng('Camera shake', 'shake', 0, 1.5, .05, pct); chk('Auto-camera (drift behind when moving)', 'autoCam');
      rng('Aim assistance', 'aimAssist', 0, 1, .05, pct); chk('Interaction assistance (larger prompts radius)', 'interactAssist'); chk('Subtitles', 'subtitles'); chk('Tutorial hints', 'tutorial'); sel('Difficulty', 'difficulty', [['story', 'Story'], ['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]); chk('Toggle sprint (instead of hold)', 'toggleSprint'); chk('Toggle crouch (instead of hold)', 'toggleCrouch'); }
    if (tab === 'controls') {
      const h = document.createElement('div'); h.className = 'small'; h.style.margin = '0 0 8px'; h.textContent = 'Click a binding, then press a key (Esc cancels). Mouse: LMB fire · RMB aim · wheel zoom/weapon · MMB lock-on. Click the view to capture the mouse in orbit cameras.'; B.appendChild(h);
      for (const a in KEY_LABELS) { const b = document.createElement('button'); b.textContent = Settings.v.keys[a].replace('Key', '').replace('Digit', ''); b.onclick = () => { b.textContent = '…press a key…'; Input.rebinding = { action: a, done: () => this.settings('controls', fromKit) }; }; row(KEY_LABELS[a], b); }
      const r = document.createElement('button'); r.textContent = 'Reset bindings'; r.onclick = () => { Settings.v.keys = { ...DEFAULT_KEYS }; Settings.save(); this.settings('controls', fromKit); }; B.appendChild(r);
      const g = document.createElement('div'); g.className = 'small'; g.style.marginTop = '12px'; g.innerHTML = '<b style="color:var(--amber)">Controller</b> — L-stick move · R-stick camera · A jump · B roll · X interact · Y burst · LB scan · RB melee · LT aim · RT fire · L3 sprint · R3 lock · D-pad: ↑ crouch ↓ camera ← lamp → weapon · Start pause · Back kit<br><b style="color:var(--amber)">Touch</b> — left stick move · drag right side to look · pinch zoom · on-screen buttons; adjust size/opacity in Accessibility.'; B.appendChild(g);
    }
    if (tab === 'access') { chk('Subtitle background', 'subBg'); rng('Subtitle size', 'subSize', 12, 30, 1, x => x + 'px'); rng('UI scale', 'uiScale', .75, 1.4, .05, pct); chk('High-contrast UI', 'contrast'); chk('Colour-blind friendly indicators', 'colorblind'); chk('Reduced motion (less shake, distortion, flicker)', 'reducedMotion');
      chk('Audio cues → on-screen captions for important sounds', 'audioCues'); chk('Simplified puzzle hints (wider tolerance, sequence shown)', 'puzzleHints'); chk('Toggle crouch', 'toggleCrouch'); chk('Toggle sprint', 'toggleSprint');
      rng('Touch controls size', 'touchSize', .7, 1.5, .05, pct); rng('Touch controls opacity', 'touchOpacity', .2, 1, .05, pct); chk('Left-handed touch layout', 'leftHanded'); }
    { const a = document.createElement('div'); a.className = 'small'; a.style.cssText = 'margin-top:18px;opacity:.7'; a.textContent = `The Last Frequency v${VERSION} · ${R.gpuName ? R.gpuName.slice(0, 60) : 'WebGL2'} · auto tier: ${R.autoTier}`; B.appendChild(a); }
    $('setdef').onclick = () => this.confirm('Restore all settings to defaults?', () => { const keep = Settings.v.seenIntro; Settings.v = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); Settings.v.seenIntro = keep; Settings.save(); this.settings(tab, fromKit); });
  },
  /* ---------------- field kit (pause) ---------------- */
  openKit(tab = 'inventory') {
    if (!Game.S) return; if (Game.state === 'play' || Game.state === 'pause' || Game.state === 'creator') Game.setState('pause'); this.hideAll(); this.show('kit'); this.kitTab = tab; Audio2.sfx('ui');
    this.atStation = World.inter.some(t => t.kind === 'station' && dist2(t.x, t.z, Player.x, Player.z) < 16);
    const groups = [['inventory', 'Gear', ['inventory', 'upgrades']], ['map', 'Map', ['map']], ['journal', 'Journal', ['journal', 'quests']], ['character', 'Explorer', ['character']], ['save', 'System', ['save', 'settings']]]; const subName = { inventory: 'Items', upgrades: 'Upgrades', journal: 'Records', quests: 'Objectives', save: 'Save & load', settings: 'Options' };
    const T = $('kittabs'); T.innerHTML = ''; const grp = groups.find(g => g[2].includes(tab)) || groups[0];
    for (const [k, n, subs] of groups) { const b = document.createElement('button'); b.textContent = n; b.className = k === grp[0] ? 'sel' : ''; b.onclick = () => this.openKit(subs[0]); T.appendChild(b); }
    const SB = $('kitsub'); SB.innerHTML = ''; SB.style.display = grp[2].length > 1 ? 'flex' : 'none'; if (grp[2].length > 1) for (const k of grp[2]) { const b = document.createElement('button'); b.textContent = subName[k]; b.className = k === tab ? 'sel' : ''; b.onclick = () => this.openKit(k); SB.appendChild(b); }
    const F = $('kitfoot'); F.innerHTML = ''; const res = document.createElement('button'); res.className = 'prim'; res.textContent = 'Resume'; res.onclick = () => this.resume(); const mm = document.createElement('button'); mm.textContent = 'Main menu'; mm.onclick = () => this.confirm('Return to the main menu? Unsaved progress since your last checkpoint will be lost.', () => this.toTitle()); F.append(mm, res);
    const B = $('kitbody'); B.innerHTML = ''; const S = Game.S; this.back = () => this.resume();
    const two = (items, render) => { B.innerHTML = '<div class="two"><div class="list" id="kl"></div><div class="detail" id="kd"></div></div>'; const L = $('kl'); items.forEach((it, i) => { const d = document.createElement('div'); d.className = 'it' + (i === 0 ? ' sel' : ''); d.tabIndex = 0; d.innerHTML = it.label; const pick = () => { L.querySelectorAll('.it').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); $('kd').innerHTML = render(it); if (it.after) it.after(); }; d.onclick = pick; d.onfocus = pick; L.appendChild(d); }); if (items[0]) { $('kd').innerHTML = render(items[0]); if (items[0].after) items[0].after(); } else $('kd').textContent = 'Nothing here yet.'; };
    if (tab === 'inventory') {
      const items = [];
      for (const w of S.weapons) { const W = WEAPONS[w]; items.push({ label: `${W.name}${S.weapon === w ? ' <span class="small" style="display:inline;color:var(--amber)">equipped</span>' : ''}<span class="small">Weapon</span>`, w }); }
      for (const i of S.items) items.push({ label: `${ITEMS[i].name}<span class="small">${ITEMS[i].kind}</span>`, i });
      items.push({ label: `Salvage ×${S.salvage} · Resonant cores ×${S.cores}<span class="small">Resources</span>`, res: 1 });
      items.push({ label: `Records ${S.journal.length}/${Object.keys(LOGS).length} · Frequencies ${S.freqs.length}/8<span class="small">Collectibles</span>`, col: 1 });
      two(items, it => { if (it.w) { const W = WEAPONS[it.w], k = 1 + Game.up('damage') * .2; setTimeout(() => { const b = $('equipw'); if (b) b.onclick = () => { S.weapon = it.w; this.openKit('inventory'); }; }); return `<h3>${W.name}</h3>${W.desc}\n\n<div class="stat">Damage<b>${Math.round(W.dmg * k)}${W.pellets ? ' ×' + W.pellets : ''}</b></div><div class="stat">Heat per shot<b>${W.heat}</b></div><div class="stat">Cycle time<b>${W.rate}s</b></div><div class="stat">Projectile speed<b>${W.speed} m/s</b></div>${W.pierce ? '<div class="stat">Pierces<b>yes</b></div>' : ''}\n<button id="equipw">Equip</button>`; }
        if (it.i) return `<h3>${ITEMS[it.i].name}</h3>${ITEMS[it.i].desc}`;
        if (it.res) return `<h3>Resources</h3>Salvage is recovered from containers, wreckage and defeated Echoed. Spend it at field stations on upgrades.\nResonant cores come from guardians and unlock advanced scanner upgrades.\n\n<div class="stat">Salvage<b>${S.salvage}</b></div><div class="stat">Resonant cores<b>${S.cores}</b></div>`;
        return `<h3>Collectibles</h3>` + REGIONS.map((R0, i) => `<div class="stat">${R0.name}<b>${S.journal.filter(j => LOGS[j].ch === i).length}/${Object.values(LOGS).filter(l => l.ch === i).length} records · ${S.freqs.includes(i + 1) ? '◈' : '·'}</b></div>`).join('') + `\nHidden frequencies: ${S.freqs.sort((a, b) => a - b).join(', ') || 'none yet'}`; });
    }
    if (tab === 'character') {
      if (Cam.mode !== 5) this.prevCamMode = Cam.mode; Cam.setMode(5, true);
      const items = Object.keys(SUITS).map(k => ({ label: `${SUITS[k].name}${S.suit === k ? ' <span class="small" style="display:inline;color:var(--amber)">worn</span>' : ''}${S.suits.includes(k) ? '' : ' 🔒'}<span class="small">Suit</span>`, k }));
      items.unshift({ label: 'Appearance<span class="small">Customize at a field station</span>', look: 1 });
      two(items, it => { if (it.look) { setTimeout(() => { const b = $('custb'); if (b) b.onclick = () => { this.hide('kit'); this.creator(null, false, true); }; }); return `<h3>Appearance</h3>Your appearance is purely cosmetic and visible on your in-game explorer.\n\n${this.atStation ? '<button id="custb" class="prim">Open customization</button>' : '<span class="hint">Stand at a field station (checkpoint beacon) to change appearance.</span>'}\n\nRelationships\n` + ['mara', 'elias', 'nova', 'orin'].filter(c => S.crew.includes(c) || (c === 'orin' && flag('betrayal'))).map(c => `<div class="stat">${CREW[c].name}<b>${'◆'.repeat(Math.max(0, Math.min(5, S.rel[c] + 2)))}${'◇'.repeat(5 - Math.max(0, Math.min(5, S.rel[c] + 2)))}</b></div>`).join(''); }
        const s = SUITS[it.k], own = S.suits.includes(it.k); setTimeout(() => { const b = $('wearb'); if (b) b.onclick = () => { S.suit = it.k; Player.hp = Math.min(Player.hp, Player.maxHp()); this.openKit('character'); }; });
        return `<h3>${s.name}</h3>${s.desc}\n\n<div class="stat">Damage taken<b>${Math.round((1 - s.armor) * 100)}%</b></div><div class="stat">Move speed<b>${Math.round(s.speed * 100)}%</b></div><div class="stat">Noise<b>${Math.round(s.noise * 100)}%</b></div><div class="stat">Scanner range<b>${Math.round(s.scan * 100)}%</b></div><div class="stat">Max health<b>${s.hp >= 0 ? '+' : ''}${s.hp}</b></div>\n${own ? (S.suit === it.k ? 'Currently worn.' : '<button id="wearb">Wear</button>') : '<span class="hint">Unlock by progressing the story.</span>'}`; });
    }
    if (tab === 'map') { B.innerHTML = '<div style="display:flex;gap:6px;margin-bottom:6px"><button id="mapw">World</button><button id="mapr" class="sel">Region</button><span class="small" id="mapinfo" style="margin-left:auto;align-self:center"></span></div><canvas id="mapc" width="560" height="380"></canvas>'; this.mapMode = this.mapMode || 'region'; $('mapw').onclick = () => { this.mapMode = 'world'; this.drawMap(); }; $('mapr').onclick = () => { this.mapMode = 'region'; this.drawMap(); }; $('mapc').onclick = e => this.mapClick(e); this.drawMap(); }
    if (tab === 'journal') { const ids = Object.keys(LOGS).filter(id => S.journal.includes(id)); two(ids.map(id => ({ label: `${LOGS[id].evidence ? '◈ ' : ''}${LOGS[id].title}<span class="small">${REGIONS[LOGS[id].ch].name} · ${LOGS[id].kind}</span>`, id })), it => `<h3>${LOGS[it.id].title}</h3>${LOGS[it.id].evidence ? '<span class="hint">◈ Evidence — connected to the central mystery</span>\n\n' : ''}${LOGS[it.id].text}`); }
    if (tab === 'quests') { const qs = QUESTS.filter(q => S.quests[q.id] !== undefined); two(qs.map(q => ({ label: `${q.main ? '' : '◇ '}${q.title}<span class="small">${S.quests[q.id] >= q.steps.length ? 'Completed' : q.main ? 'Main story · Chapter ' + REGIONS[q.ch].num : 'Side objective'}</span>`, q })), it => { const q = it.q, st = S.quests[q.id]; return `<h3>${q.title}</h3>` + q.steps.map((s, i) => `<div style="color:${i < st ? 'var(--mute)' : i === st ? 'var(--text)' : '#3a4256'}">${i < st ? '✓' : i === st ? '▸' : '·'} ${i <= st ? (typeof s.t === 'function' ? s.t() : s.t) : '???'}</div>`).join('') + (q.ch >= 0 ? `\nRegion: ${REGIONS[q.ch].name}` : ''); }); }
    if (tab === 'upgrades') { two(UPGRADES.map(u => ({ label: `${u.name} <span class="small" style="display:inline">${'■'.repeat(Game.up(u.id))}${'□'.repeat(u.max - Game.up(u.id))}</span><span class="small">${u.desc}</span>`, u })), it => { const u = it.u, lv = Game.up(u.id), cost = u.cost[lv]; setTimeout(() => { const b = $('buyb'); if (b) b.onclick = () => { if (S.salvage < cost || (u.core && S.cores < 1)) { Audio2.sfx('deny'); return; } S.salvage -= cost; if (u.core) S.cores--; S.ups[u.id] = lv + 1; Audio2.sfx('checkpoint'); Player.hp = Player.maxHp(); this.openKit('upgrades'); }; });
      return `<h3>${u.name}</h3>${u.desc}\n\n<div class="stat">Level<b>${lv}/${u.max}</b></div>` + (lv < u.max ? `<div class="stat">Cost<b>${cost} salvage${u.core ? ' + 1 core' : ''}</b></div><div class="stat">You have<b>${S.salvage} salvage · ${S.cores} cores</b></div>\n` + (this.atStation ? `<button id="buyb" class="prim" ${S.salvage < cost || (u.core && S.cores < 1) ? 'disabled' : ''}>Install upgrade</button>` : '<span class="hint">Upgrades are installed at field stations (checkpoint beacons).</span>') : '\nFully upgraded.'); }); }
    if (tab === 'settings') { this.settings('graphics', true); return; }
    if (tab === 'save') { B.innerHTML = `<div class="menu" style="max-width:420px"><button id="svs">Save to slot…</button><button id="svl">Load game…</button><div class="small" style="margin-top:8px">${Save.ok ? 'Autosave happens at checkpoints and chapter starts. Manual saves keep a backup of the previous save in the same slot.' : Save.err}</div></div>`; $('svs').onclick = () => { this.hide('kit'); this.slots('save'); }; $('svl').onclick = () => this.confirm('Load a different save? Unsaved progress will be lost.', () => { this.hide('kit'); this.slots('load'); this.back = () => { this.hide('slots'); this.openKit('save'); }; }); }
  },
  resume() { this.hideAll(); if (Cam.mode === 5 && this.prevCamMode != null) { Cam.setMode(this.prevCamMode, true); } Game.setState('play'); Audio2.sfx('ui_back'); },
  /* ---------------- maps ---------------- */
  buildRegionMap() {
    const hf = World.hf, n = 160, c = document.createElement('canvas'); c.width = n; c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n), R0 = World.region;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -HALF + i + .5, z = -HALF + j + .5; const m = MATS[hf.matAt(x, z)], o = (j * n + i) * 4; if (m === 'void') { img.data.set([6, 4, 12, 255], o); continue; }
      const h = hf.at(x, z), nn = hf.normal(x, z); let col = R0.ground(m, x, z, h, Math.random); const sh = clamp(.55 + (nn[0] * -.6 + nn[2] * -.5) * 1.6, .3, 1.3); col = scalec(col, sh * 1.2);
      if (World.water && h < World.water.h) col = mixc(col, World.water.col, .6); if (Math.abs((h % 2 + 2) % 2 - 1) < .06) col = scalec(col, .7); if (World.dPath(x, z) < 1.2) col = mixc(col, [.9, .8, .6], .25);
      img.data.set([col[0] * 255, col[1] * 255, col[2] * 255, 255], o); }
    g.putImageData(img, 0, 0); this.mapImg = c;
  },
  drawMap() {
    const c = $('mapc'); if (!c) return; const r = c.getBoundingClientRect(); c.width = Math.max(320, r.width | 0); c.height = Math.max(240, r.height | 0); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const S = Game.S, W = c.width, H = c.height;
    document.querySelectorAll('#mapw,#mapr').forEach(b => b.classList.remove('sel')); $(this.mapMode === 'world' ? 'mapw' : 'mapr').classList.add('sel');
    g.fillStyle = '#0d0b08'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,181,71,.07)'; for (let x = 0; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.font = '11px monospace'; this.mapHits = [];
    if (this.mapMode === 'world') {
      const cx = W / 2, cy = H / 2, rr = Math.min(W, H) * .42; g.strokeStyle = 'rgba(255,181,71,.25)'; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, rr * k / 3, 0, TAU); g.stroke(); }
      const pos = REGIONS.map((_, i) => { const a = -Math.PI * .85 + i / 7 * Math.PI * 1.7; const rad = i === 7 ? 0 : rr * (.95 - i * .08); return i === 7 ? [cx, cy] : [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
      g.setLineDash([3, 4]); g.strokeStyle = 'rgba(255,213,144,.5)'; g.beginPath(); pos.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.setLineDash([]);
      REGIONS.forEach((R0, i) => { const [x, y] = pos[i], open = i <= S.maxRegion; g.fillStyle = open ? (i === S.region ? '#ffb547' : '#d8dde8') : '#3a4256'; g.beginPath(); g.arc(x, y, i === 7 ? 9 : 6, 0, TAU); g.fill(); if (i === S.region) { g.strokeStyle = '#ffb547'; g.beginPath(); g.arc(x, y, 11 + Math.sin(Game.time * 4) * 2, 0, TAU); g.stroke(); }
        g.fillStyle = open ? '#d8dde8' : '#4a5266'; g.fillText((open ? R0.num + ' · ' + R0.name : R0.num + ' · ???'), x + 12, y + 4); if (open) { const rec = S.journal.filter(j => LOGS[j].ch === i).length; g.fillStyle = '#8b94a8'; g.fillText(`${rec} records${S.freqs.includes(i + 1) ? ' · ◈' : ''}`, x + 12, y + 16); this.mapHits.push({ x, y, r: 14, act: () => { if (i !== S.region) this.confirm(`Travel to ${R0.name}?`, () => { this.hideAll(); Game.travel(i); }); } }); } });
      $('mapinfo').textContent = 'Click an unlocked region to travel. Endings: ' + (Save.global().endings || []).join(' ') || '';
    } else {
      const s = Math.min(W, H) / 160 * .95, ox = (W - 160 * s) / 2, oy = (H - 160 * s) / 2; const P = (x, z) => [ox + (x + HALF) * s, oy + (z + HALF) * s];
      g.drawImage(this.mapImg, ox, oy, 160 * s, 160 * s); g.strokeStyle = 'rgba(255,181,71,.6)'; g.strokeRect(ox, oy, 160 * s, 160 * s);
      const disc = S.disc[S.region] || []; for (const p of World.region.pois) { const [x, y] = P(p.x, p.z); const d = disc.includes(p.n); g.fillStyle = d ? '#ffd590' : 'rgba(255,255,255,.25)'; g.fillRect(x - 2, y - 2, 4, 4); if (d) { g.fillStyle = '#000'; g.fillText(p.n, x + 6, y + 5); g.fillStyle = '#ffd590'; g.fillText(p.n, x + 5, y + 4); } }
      for (const cp of Game.cpDefs) { const [x, y] = P(cp.x, cp.z); const on = S.cps.includes(cp.id); g.fillStyle = on ? '#ffb547' : '#555'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.fill(); if (on) this.mapHits.push({ x, y, r: 10, act: () => this.confirm(`Fast travel to ${cp.name}?`, () => { this.hideAll(); Game.setState('play'); Player.place(cp.x + 1.6, cp.z + 1.2, Math.PI); Game.spawnCrew(); Game.fade(.6); Audio2.sfx('scan'); }) }); }
      for (const t of World.scanTargets) { if (t.kind === 'hidden' && t.revealed) { const [x, y] = P(t.x, t.z); g.fillStyle = '#6ff3ff'; g.fillText('◇', x - 4, y + 4); } if (t.kind === 'freq' && (t.found || t.done)) { const [x, y] = P(t.x, t.z); g.fillStyle = t.done ? '#8a7aa0' : '#d08aff'; g.fillText('◈', x - 4, y + 4); } }
      const o = Game.objective(); if (o && o.step && o.step.at) { const [x, y] = P(o.step.at[0], o.step.at[1]); g.strokeStyle = '#ffb547'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7 + Math.sin(Game.time * 5) * 2, 0, TAU); g.stroke(); g.lineWidth = 1; }
      const p = Player.ch, [px, py] = P(p.x, p.z); g.save(); g.translate(px, py); g.rotate(-p.yaw + Math.PI); g.fillStyle = '#6ff3ff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.fill(); g.restore();
      for (const cmp of Companions.list) { const [x, y] = P(cmp.x, cmp.z); g.fillStyle = CREW[cmp.id].col; g.fillRect(x - 2, y - 2, 4, 4); }
      g.fillStyle = '#ffb547'; g.fillText(World.region.name.toUpperCase() + ' · CHAPTER ' + World.region.num, 10, 16);
      $('mapinfo').textContent = `Discovered ${disc.length}/${World.region.pois.length} · Click a checkpoint ◆ to fast travel`;
    }
    if (this.kitTab === 'map' && $('kit').classList.contains('on')) requestAnimationFrame(() => this.drawMap());
  },
  mapClick(e) { const c = $('mapc'), r = c.getBoundingClientRect(); const x = (e.clientX - r.left) * c.width / r.width, y = (e.clientY - r.top) * c.height / r.height; for (const h of this.mapHits || []) if (Math.hypot(h.x - x, h.y - y) < h.r) { Audio2.sfx('ui_ok'); h.act(); return; } },
  /* ---------------- credits ---------------- */
  showCredits(after) { this.hideAll(); this.show('credits'); $('creditroll').textContent = CREDITS; const pb = $('creditroll'); pb.scrollTop = 0; Audio2.motif(.5, .06); let alive = true; const roll = () => { if (!alive) return; pb.scrollTop += .6; requestAnimationFrame(roll); }; if (after) roll();
    this.back = () => { alive = false; this.hide('credits'); if (after) after(); else { this.show('title'); this.titleMenu(); } }; if (after) setTimeout(() => { if (alive && $('credits').classList.contains('on')) this.back(); }, 22000); },
  /* ---------------- HUD ---------------- */
  hud() {
    const S = Game.S; if (!S || Game.state === 'title') return; const p = Player.ch;
    const mh = Player.maxHp(); $('hpbar').firstChild.style.width = (Player.hp / mh * 100) + '%'; $('hpbar').classList.toggle('low', Player.hp < mh * .3); $('hpbar').style.width = (140 + mh * .4) + 'px';
    $('stbar').firstChild.style.width = Player.stamina + '%'; $('stbar').style.opacity = Player.stamina < 99 ? 1 : 0;
    $('salv').textContent = `⬡ ${S.salvage}` + (S.cores ? ` · ◆ ${S.cores}` : '') + (Player.lamp ? ' · ☀' : '') + (p.crouch ? ' · stealth' : '');
    const W = Player.weapon(), cap = 100 + Game.up('cooling') * 25; $('wname').textContent = W.name.toUpperCase(); $('heatbar').firstChild.style.width = Math.min(100, Player.heat / cap * 100) + '%'; $('heatbar').classList.toggle('hot', Player.overheat > 0 || Player.heat > cap * .8);
    $('weap').classList.toggle('idle', !(Player.heat > 6 || Player.overheat > 0 || Player.fireHold > 0 || Player.burstCd > 0)); $('wsub').textContent = (Player.overheat > 0 ? 'OVERHEATED' : Player.heat > cap * .7 ? `[${Input.glyph('reload')}] vent` : '') + (Game.has('burst') ? ` · burst ${Player.burstCd > 0 ? Math.ceil(Player.burstCd) + 's' : 'ready'}` : '');
    const o = Game.objective(); $('obj').innerHTML = o ? `<b>${o.q.title.toUpperCase()}</b>${o.text.replace('[scan]', '[' + Input.glyph('scan') + ']')}` : '';
    const sideQ = QUESTS.filter(q => !q.main && S.quests[q.id] !== undefined && S.quests[q.id] < q.steps.length && q.ch === S.region); $('sig').textContent = sideQ.length ? '◇ ' + (typeof sideQ[0].steps[S.quests[sideQ[0].id]].t === 'function' ? sideQ[0].steps[S.quests[sideQ[0].id]].t() : sideQ[0].steps[S.quests[sideQ[0].id]].t) : '';
    // compass
    const C = $('compass'), wC = C.clientWidth; let html = ''; const mark = (ang, txt, cls) => { const rel = angDiff(Cam.yaw, ang); if (Math.abs(rel) > Math.PI / 2) return; html += `<span class="${cls || ''}" style="left:${wC / 2 + rel / (Math.PI / 2) * wC / 2}px">${txt}</span>`; };
    mark(Math.PI, 'N'); mark(Math.PI / 2, 'E'); mark(0, 'S'); mark(-Math.PI / 2, 'W'); for (let k = 0; k < 8; k++) if (k % 2) mark(k * Math.PI / 4, '·');
    if (o && o.step && o.step.at) { const d = Math.hypot(o.step.at[0] - p.x, o.step.at[1] - p.z); mark(Math.atan2(o.step.at[0] - p.x, o.step.at[1] - p.z), '▼ ' + Math.round(d) + 'm', 'm'); }
    if (Scanner.target && Scanner.sig > .3) mark(Math.atan2(Scanner.target.x - p.x, Scanner.target.z - p.z), '◈', 's');
    for (const e of Enemies.list) if (!e.dead && e.marked > 0) mark(Math.atan2(e.x - p.x, e.z - p.z), '◆', 'e');
    C.innerHTML = html; const yawMoved = Math.abs(angDiff(this._cy ?? Cam.yaw, Cam.yaw)) > .002 || p.speed > .5; this._cy = Cam.yaw; if (yawMoved) this._cIdle = Game.time; C.classList.toggle('idle', Game.time - (this._cIdle || 0) > 3);
    // interaction prompt
    const best = this.bestInter(); const pr = $('prompt'); if (best && Game.state === 'play') { pr.style.display = 'block'; pr.innerHTML = `<kbd>${Input.glyph('interact')}</kbd>${best.label}`; } else pr.style.display = 'none'; this.inter = best;
    // reticle
    const ret = $('reticle'); ret.style.display = (Cam.rig().orbit && (Player.aiming || Player.fireHold > 0)) ? 'block' : 'none'; ret.classList.toggle('lock', !!Player.lock);
    // scanner HUD
    $('scanhud').style.display = Scanner.active || Game.scanLineT > 0 ? 'block' : 'none'; if (Scanner.active) { const cv = $('scanc'), g = cv.getContext('2d'); g.fillStyle = 'rgba(0,10,15,.6)'; g.fillRect(0, 0, 130, 24); g.fillStyle = '#6ff3ff'; for (let i = 0; i < 130; i++) g.fillRect(i, 12 - Scanner.wave[i] * 9, 1, 1); if (!Game.scanLineT || Game.scanLineT <= 0) $('scantxt').textContent = Scanner.target && Scanner.sig > .2 ? `SIGNAL ${Math.round(Scanner.sig * 100)}% · ${Scanner.target.kind === 'freq' ? 'ANOMALY' : Scanner.target.kind === 'hidden' ? 'STRUCTURE' : Scanner.target.kind.toUpperCase()}` : 'SWEEPING…'; }
    // world-space markers + damage numbers
    const M = $('markers'); let mh2 = '';
    for (const e of Enemies.list) { if (e.dead || !(e.marked > 0) || e.isBoss) continue; const s = R.toScreen(e.x, e.y + e.aimH + (e.heavy ? 2 : 1.2), e.z); if (s && s[3]) mh2 += `<div class="e" style="left:${s[0]}px;top:${s[1]}px">◆ ${e.T.name.replace('Echoed ', '')}${e.state === 'chase' ? ' !' : ''}</div>`; }
    if (o && o.step && o.step.at && Game.state === 'play') { const ty = World.hf.at(o.step.at[0], o.step.at[1]); const d = Math.hypot(o.step.at[0] - p.x, o.step.at[1] - p.z); if (d > 4) { const s = R.toScreen(o.step.at[0], ty + 3.2 + Math.sin(Game.time * 3) * .2, o.step.at[1]); if (s && s[3]) mh2 += `<div class="q" style="left:${s[0]}px;top:${s[1]}px">▼ ${Math.round(d)}m</div>`; } }
    for (let i = this.dmgNums.length - 1; i >= 0; i--) { const d = this.dmgNums[i]; d.t += Game.dt; if (d.t > .9) { this.dmgNums.splice(i, 1); continue; } const s = R.toScreen(d.x, d.y + d.t * .8, d.z); if (s && s[3]) mh2 += `<div class="${d.crit ? 'q' : ''}" style="left:${s[0]}px;top:${s[1]}px;color:${d.crit ? 'var(--amber)' : '#fff'};opacity:${1 - d.t}">${d.n}</div>`; }
    if (this.dmgNums.length > 20) this.dmgNums.splice(0, this.dmgNums.length - 20);
    M.innerHTML = mh2;
  },
  bestInter() {
    const p = Player.ch; if (!p) return null; let best = null, bs = 1e9; const f = [Math.sin(p.yaw), Math.cos(p.yaw)]; const assist = Settings.v.interactAssist ? 1.3 : 1;
    for (const t of World.inter) { if (!t.on()) continue; let x = t.x, z = t.z; if (t.npc) { const c = Companions.get(t.npc); if (c) { x = c.x; z = c.z; } } const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); const y = t.y ?? World.hf.at(x, z); if (d > t.r * assist || Math.abs(y - p.y) > 2.6) continue; const s = d - (dx * f[0] + dz * f[1]) / (d || 1) * .8; if (s < bs) { bs = s; best = t; } }
    if (!best && Companions.list.length) { for (const c of Companions.list) if (dist2(c.x, c.z, p.x, p.z) < 6.5 && !World.inter.some(t => t.npc === c.id && t.on())) return { label: 'Talk to ' + CREW[c.id].name, kind: 'npc', use: () => Game.dialogue(c.id + '_idle') }; }
    return best;
  },
};
