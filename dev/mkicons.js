const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const draw = (size, pad) => p.evaluate(([S, pad]) => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#1c1230'); bg.addColorStop(.6, '#3a1c2c'); bg.addColorStop(1, '#07080c'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2, u = S * (1 - pad * 2) / 2;
    g.imageSmoothingEnabled = false; // pixel look: draw on a 64 grid then scale
    const N = 64, t = document.createElement('canvas'); t.width = t.height = N; const q = t.getContext('2d'); q.fillStyle = 'rgba(0,0,0,0)';
    const px = (x, y, col) => { q.fillStyle = col; q.fillRect(x | 0, y | 0, 1, 1); };
    for (let r = 26; r > 6; r -= 6) for (let a = 0; a < 720; a++) { const an = a / 720 * Math.PI * 2; const col = r > 20 ? '#ffb547' : r > 14 ? '#ffd590' : '#6ff3ff'; if ((Math.floor(a / 6) + r) % 3) px(32 + Math.cos(an) * r, 32 + Math.sin(an) * r, col); }
    for (let x = 6; x < 58; x++) { const y = 32 + Math.sin((x - 6) / 52 * Math.PI * 6) * 9 * Math.sin((x - 6) / 52 * Math.PI); px(x, y, '#fff3d6'); px(x, y + 1, '#fff3d6'); }
    for (let i = 0; i < 6; i++) px(32 + i - 3, 32, '#fff'); 
    g.drawImage(t, cx - u, cy - u, u * 2, u * 2); return c.toDataURL('image/png').split(',')[1]; }, [size, pad]);
  await p.goto('about:blank');
  fs.writeFileSync('pwa/icon-192.png', Buffer.from(await draw(192, .08), 'base64'));
  fs.writeFileSync('pwa/icon-512.png', Buffer.from(await draw(512, .08), 'base64'));
  fs.writeFileSync('pwa/icon-maskable-512.png', Buffer.from(await draw(512, .2), 'base64'));
  await b.close(); console.log('icons ok');
})();
