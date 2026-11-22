// ==UserScript==
// @name         Typing Sparks
// @namespace    typing-sparks
// @version      0.1.0
// @description  Sparks fly from the caret while you type in any text box or the Claude message box.
// @match        https://claude.ai/*
// @match        file:///*
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  if (window.__typingSparks) return;
  window.__typingSparks = true;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647';
  const ctx = canvas.getContext('2d');
  const sparks = [];
  let raf = 0;

  function resize() {
    const d = window.devicePixelRatio || 1;
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', resize);
  resize();
  (document.body || document.documentElement).appendChild(canvas);

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const t = el.tagName;
    return t === 'TEXTAREA' || (t === 'INPUT' && /^(text|search|email|url|tel|password|)$/.test(el.type));
  }

  // Caret position: from the selection range, else the element's bottom-left.
  function caretPoint(el) {
    const sel = getSelection();
    if (sel && sel.rangeCount && el.isContentEditable) {
      const r = sel.getRangeAt(0).cloneRange();
      r.collapse(false);
      let rect = r.getClientRects()[0] || r.getBoundingClientRect();
      if (rect && (rect.width || rect.height || rect.x || rect.y)) return { x: rect.right, y: rect.top + rect.height / 2 };
    }
    const b = el.getBoundingClientRect();
    return { x: b.left + Math.min(b.width - 8, 24 + (el.value ? el.value.length * 7 : 0) % Math.max(b.width - 32, 40)), y: b.bottom - 14 };
  }

  const COLORS = ['#ffd24a', '#ff9f43', '#fff3b0', '#ff6b35', '#ffe97f'];
  function burst(x, y) {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = 1.5 + Math.random() * 3;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, size: 1.5 + Math.random() * 2.5, c: COLORS[(Math.random() * COLORS.length) | 0] });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.vx *= 0.98; s.life -= 0.035;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.size * 1.6); ctx.lineTo(s.x + s.size * .5, s.y);
      ctx.lineTo(s.x, s.y + s.size * 1.6); ctx.lineTo(s.x - s.size * .5, s.y);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = sparks.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  addEventListener('input', e => {
    const el = e.target;
    if (!isEditable(el)) return;
    if (e.inputType && e.inputType.startsWith('delete')) return;
    const p = caretPoint(el);
    burst(p.x, p.y);
  }, true);
})();
