// Verify LIVE-12 (pizza twice) and LIVE-16 (gendered titles) at engine level, in the real page.
// node tools/integrate_check.mjs --clear --nohelp --eval tools/qa_verify_live_12.js
const M = window.__morada.M, E = M.engine, st = E.state;
M.main.setSpeed(0); E.setFreeWill(false);
const rita = E.household().find((s) => s.name.startsWith('Rita'));
for (const a of rita.queue.slice()) E.cancelAction(rita.id, a.id);
for (let i = 0; i < 6; i++) E.update(0.5);
const phone = st.objects.find((o) => o.type === 'phone');
const notes = []; M.util.bus.on('notify', (n) => notes.push(n.kind + ': ' + n.text));
const m0 = st.money;
const pizzaKey = M.data.CATALOG.phone.interactions.find((i) => i.effect === 'order_pizza').key;
const r1 = E.queueInteraction(rita.id, phone.id, pizzaKey, 'player');
for (let i = 0; i < 120 && rita.queue.length; i++) E.update(0.5);
const afterFirst = { money: st.money, events: st.events.map((e) => e.kind) };
const avail2 = E.getInteractions(rita.id, phone.id).find((i) => i.key === pizzaKey);
const r2 = E.queueInteraction(rita.id, phone.id, pizzaKey, 'player');
for (let i = 0; i < 120 && rita.queue.length; i++) E.update(0.5);
const afterSecond = { money: st.money, events: st.events.map((e) => e.kind) };
// let them arrive
const arrivals = [];
for (let i = 0; i < 2 * 90; i++) { E.update(0.5); for (const s of st.sims) if (s.visitor && s.role === 'pizza' && !arrivals.includes(s.name + '|' + s.gender)) arrivals.push(s.name + '|' + s.gender); }
// LIVE-16: role names vs gender over many arrivals, from code
const src = document.querySelector('script[src*="engine.js"]') ? 'see engine.js' : '';
return { r1, afterFirst, avail2, r2, afterSecond, arrivals, moneyStart: m0, notes: notes.filter((n) => /pizza|Entregador|Entregadora/i.test(n)) };
