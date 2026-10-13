// VIS-4 fix probe (in-page only, nothing saved): border-box on #bar, then measure bar/dock gap.
document.getElementById('help-ok') && document.getElementById('help-ok').click();
await new Promise(r => setTimeout(r, 300));
const b = document.getElementById('bar'), d = document.getElementById('dock');
const m = () => { const br = b.getBoundingClientRect(), dr = d.getBoundingClientRect(); return { barH: Math.round(br.height), gapDockToBar: Math.round(br.top - dr.bottom) }; };
const before = m();
b.style.boxSizing = 'border-box'; await new Promise(r => setTimeout(r, 50));
const borderBox = m();
const outer = Math.ceil(b.getBoundingClientRect().height);
document.documentElement.style.setProperty('--bar-h', outer + 'px'); await new Promise(r => setTimeout(r, 50));
const measured = m();
return { before, borderBox, withMeasuredVar: Object.assign(measured, { var: outer }) };
