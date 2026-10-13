const M = window.__morada.M, E = M.engine;
const hb = document.getElementById('help-ok'); if (hb) hb.click();
const [a, b] = E.household();
M.main.setSpeed(0);
a.queue.slice().forEach((q) => E.cancelAction(a.id, q.id)); b.queue.slice().forEach((q) => E.cancelAction(b.id, q.id));
for (let i = 0; i < 6; i++) E.update(0.5);
E.queueSocial(a.id, b.id, 'talk', 'player');
for (let i = 0; i < 200; i++) { E.update(0.5); if (a.queue[0] && a.queue[0].phase === 'do') break; }
M.render.focus((a.x + b.x) / 2, (a.y + b.y) / 2, true);
M.main.setSpeed(1);
const samples = [];
for (let k = 0; k < 12; k++) {
  await new Promise(r => setTimeout(r, 500));
  const els = Array.from(document.querySelectorAll('#bubbles .bubble')).map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, c: e.className, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }; });
  let overlap = false;
  if (els.length === 2) { const [p, q] = els.map(x => x.r); overlap = p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3]; }
  samples.push({ n: els.length, overlap, els: els.map(e => e.t + ' ' + e.r.join(',')), dist: Math.hypot(a.x - b.x, a.y - b.y).toFixed(2) });
}
return samples;
