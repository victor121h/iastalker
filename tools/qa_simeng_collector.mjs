// QA: bill collector edge cases — (a) nothing to take: debt is wiped anyway; (b) overshoot: takes the fridge for a small remainder.
import { boot } from './qa_simeng_lib.mjs';
{
  const ctx = boot({ seed: 5, empty: true, members: [{ name: 'Teo Reis', gender: 'm' }] });
  const { E } = ctx; const S = E.state;
  E.setFreeWill(false);
  S.money = 0;
  S.bills.push({ id: 90001, amount: 900, dueDay: S.time.day, kind: 'hospital' });
  while (S.time.minute < 10 * 60 + 30) E.update(0.5);
  console.log('(a) empty lot, M$ 0, M$ 900 overdue -> bills left:', S.bills.length, '| money', S.money, '|', ctx.notes.filter((n) => /cobrança/.test(n.text)).map((n) => n.text).join(' / '));
}
{
  const ctx = boot({ seed: 5 });
  const { E, M } = ctx; const S = E.state;
  E.setFreeWill(false);
  const val = (t) => M.data.sellRefund(S.objects.find((o) => o.type === t), S.time.day);
  // overdue bill a little above the most valuable object
  const top = S.objects.filter((o) => M.data.CATALOG[o.type].buyable !== false).map((o) => ({ t: o.type, v: M.data.sellRefund(o, S.time.day) })).sort((a, b) => b.v - a.v).slice(0, 3);
  const amt = Math.round((top[0].v + 20) / 1.2);
  S.bills.push({ id: 90002, amount: amt, dueDay: S.time.day, kind: 'bill' });
  while (S.time.minute < 10 * 60 + 30) E.update(0.5);
  console.log('(b) bank M$', S.money, '| bill', amt, '(+20% =', Math.round(amt * 1.2) + ') | top objects', JSON.stringify(top), '|', ctx.notes.filter((n) => /levou/.test(n.text)).map((n) => n.text).join(' / '));
}
