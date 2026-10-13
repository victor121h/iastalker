const M = window.__morada.M; const b = document.getElementById('help-ok'); if (b) b.click();
M.ui.setMode('buy');
const t0 = performance.now();
let n = 0;
while (performance.now() - t0 < 30000) { await new Promise(r => setTimeout(r, 500)); const cards = Array.from(document.querySelectorAll('#drawer .card')); n = cards.filter(c => !c.querySelector('.card-thumb img')).length; if (!n) break; }
const cards = Array.from(document.querySelectorAll('#drawer .card'));
return { ms: Math.round(performance.now() - t0), total: cards.length, fallback: cards.filter(c => !c.querySelector('.card-thumb img')).map(c => c.querySelector('.card-name').textContent), thumbs: Object.entries(M.ui.debug.ui.thumbs).filter(([k, v]) => v === 'fail').map(([k]) => k) };
