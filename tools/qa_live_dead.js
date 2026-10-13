const hb = document.getElementById('help-ok'); if (hb) hb.click();
await new Promise(r => setTimeout(r, 300));
const res = {};
const probe = (x, y) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + (e.className && e.className.baseVal == null ? e.className : '') + (e.id ? '#' + e.id : '') : null; };
const W = innerWidth, H = innerHeight;
const rect = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
res.rects = { dock: rect('#dock'), dockRow: rect('#dock .dock-row'), portraits: rect('#dock .portraits'), queue: rect('#dock .queue'), needsToggle: rect('#needs-toggle'), bar: rect('#bar'), cam: rect('#cam') };
const q = res.rects.queue, p = res.rects.portraits, d = res.rects.dockRow;
res.probes = {};
if (q) res.probes['queueRight'] = probe(q[2] - 20, (q[1] + q[3]) / 2);
if (p) res.probes['portraitsRight'] = probe(p[2] - 20, (p[1] + p[3]) / 2);
if (d && d[2] > d[0]) res.probes['dockRowMid'] = probe((d[0] + d[2]) / 2, (d[1] + d[3]) / 2);
let blocked = 0, total = 0;
for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) { total++; const e = document.elementFromPoint(x, y); if (e && (e.classList.contains('queue') || e.classList.contains('portraits') || e.classList.contains('dock-row'))) blocked++; }
res.invisibleBlockingPx = Math.round(blocked * 64);
return res;
