// qa_verify_code: CR-8 (two residents both ordered to pay one bill) and CR-10 (Buy-mode sellObject on system objects).
// Usage: node tools/qa_verify_code_paysell.mjs
import { loadGame, step } from './qa_verify_code_lib.mjs';
const out = {};
{ // CR-8
  const { M, notes } = loadGame({ quiet: true });
  const E = M.engine; const st = E.newGame({ seed: 3 }); E.setFreeWill(false);
  const [a, b] = E.household(); if (b.career) b.career = null;
  st.time.minute = 11 * 60;
  st.bills = [{ id: 9101, amount: 120, dueDay: st.time.day + 2, kind: 'bill' }];
  const mb = st.objects.find((o) => o.type === 'mailbox');
  out.cr8 = { qa: E.queueInteraction(a.id, mb.id, 'pay_bills', 'player'), qb: E.queueInteraction(b.id, mb.id, 'pay_bills', 'player') };
  step(M, 40);
  out.cr8.money = st.money; out.cr8.bills = st.bills.length;
  out.cr8.notes = notes.filter((n) => /conta|Dinheiro/.test(n.text)).map((n) => n.kind + ': ' + n.text);
}
{ // CR-10
  const { M } = loadGame({ quiet: true });
  const E = M.engine; const st = E.newGame({ seed: 3 });
  const free = [];
  for (let y = 2; y < st.lot.h - 2 && free.length < 6; y++) for (let x = 1; x < 6 && free.length < 6; x++) if (M.world.isWalkable(x, y) && !M.world.objectAt(x, y)) free.push({ x, y });
  const mk = (type, extra) => { const p = free.shift(); const o = Object.assign({ id: M.util.nextId(st), type, x: p.x, y: p.y, rot: 0, dirty: 0, broken: false, boughtDay: st.time.day, price: 0, uses: 0 }, extra || {}); st.objects.push(o); return o; };
  const items = [mk('puddle'), mk('dirty_plate', { spoiled: true }), mk('meal', { servings: 2, spoiled: true, quality: 50 }), mk('newspaper', { offer: 'business', day: st.time.day, read: false })];
  M.world.rebuild();
  const money0 = st.money;
  out.cr10 = items.map((o) => { const r = E.sellObject(o.id); return { type: o.type, buyable: (M.data.CATALOG[o.type] || {}).buyable, sell: r }; });
  out.cr10.push({ moneyDelta: st.money - money0, mailbox: E.sellObject(st.objects.find((o) => o.type === 'mailbox').id) });
}
console.log(JSON.stringify(out, null, 1));
