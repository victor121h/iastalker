// --eval: ultra-speed 30x rule, portrait selection, queue cancel from the action strip, toast styling.
const M = window.__morada.M, E = M.engine;
const b = document.getElementById('help-ok'); if (b) b.click();
const out = {};
M.main.setSpeed(0);
// portrait click selects the other member
const ports = Array.from(document.querySelectorAll('.portraits button, .portraits .portrait'));
const other = E.household().find((s) => s.id !== E.state.settings.selectedSimId);
const p2 = ports.find((p) => (p.title || p.getAttribute('aria-label') || '').includes(other.name.split(' ')[0]));
if (p2) p2.click();
await new Promise((r) => setTimeout(r, 300));
out.portraitSelect = { ok: E.state.settings.selectedSimId === other.id, renderSel: M.render.selectedId === other.id, n: ports.length };
// queue two player actions and cancel the second from the strip
const sel = E.simById(E.state.settings.selectedSimId);
const fr = E.state.objects.find((o) => /^fridge/.test(o.type));
const sh = E.state.objects.find((o) => o.type === 'shower');
E.queueInteraction(sel.id, fr.id, 'snack', 'player');
E.queueInteraction(sel.id, sh.id, 'shower', 'player');
await new Promise((r) => setTimeout(r, 500));
const items = Array.from(document.querySelectorAll('.queue .q-item'));
const before = sel.queue.map((a) => a.label);
const last = items[items.length - 1];
if (last) last.click();
await new Promise((r) => setTimeout(r, 400));
E.update(0.5);
out.queueCancel = { before, after: sel.queue.map((a) => a.label + (a.cancel ? '(x)' : '')), strip: items.map((i) => i.title) };
// 30x when everyone sleeps
let g = 0;
while (!E.allAsleepOrAway() && g++ < 3000) E.update(1);
M.main.setSpeed(3);
out.ultra = { t: M.util.fmtTime(E.state.time.minute), allAsleep: E.allAsleepOrAway(), factor: M.main.speedFactor(), boost: M.main.isUltraBoost(), note: (document.querySelector('.speed-note') || {}).textContent };
await new Promise((r) => setTimeout(r, 400));
out.ultra.note = (document.querySelector('.speed-note') || {}).textContent;
M.main.setSpeed(1);
// toast styling: money toast wraps
M.util.bus.emit('notify', { text: 'Pizza pedida! O entregador chega em cerca de 1 hora.', kind: 'money' });
await new Promise((r) => setTimeout(r, 400));
const t = Array.from(document.querySelectorAll('.toast.money')).pop();
out.moneyToast = t ? { ws: getComputedStyle(t.children[1]).whiteSpace, fits: t.children[1].getBoundingClientRect().right <= t.getBoundingClientRect().right + 1 } : null;
return out;
