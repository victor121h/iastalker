// SIM-13 verify: bill collector (a) with nothing to take, (b) overshoot on the default house.
import { load, stamp } from './qa_verify_sim_lib.mjs';
function runTo10(E, S) { const d = S.time.day; while (!(S.time.day === d + 1 && S.time.minute >= 10 * 60 + 30)) E.update(0.5); }
// (a) empty lot, nothing bought, money 0, overdue bill M$ 900
{
  const c = load({ seed: 3, empty: true, members: [{ name: 'Lia Souza', gender: 'f' }] });
  const { E, S, notes } = c;
  S.money = 0;
  S.bills = [{ id: 9001, amount: 900, dueDay: S.time.day + 1, kind: 'bill' }];
  runTo10(E, S);
  console.log('(a) bills left:', S.bills.length, '| money', S.money, '|', notes.filter((n) => /cobrança/.test(n.text)).map((n) => n.t + ' ' + n.text).join(' / '));
}
// (b) default house, money 0, overdue bills of various sizes
for (const amt of [300, 558, 1500]) {
  const c = load({ seed: 3 });
  const { E, S, D, notes } = c;
  S.money = 0;
  S.bills = [{ id: 9002, amount: amt, dueDay: S.time.day + 1, kind: 'bill' }];
  const before = new Map(S.objects.map((o) => [o.id, o]));
  runTo10(E, S);
  const gone = [...before.values()].filter((o) => !S.objects.includes(o) && D.CATALOG[o.type].buyable !== false);
  const val = gone.reduce((a, o) => a + D.sellRefund(o, S.time.day), 0);
  console.log(`(b) bill ${amt} -> owed ${Math.round(amt * 1.2)}; taken ${gone.map((o) => o.type + ' ' + D.sellRefund(o, S.time.day)).join(', ')} = ${val}; bills left ${S.bills.length}`);
}
