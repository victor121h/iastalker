// Rita starts paying the overdue bill at the mailbox shortly before 10:00 and finishes just after the collector
// spawned. The collector carries billIds/amount from spawn time: does he still repossess after the bill is paid?
import { load } from './qa_cr_lib.mjs';
const res = [];
for (const startAt of [596, 597, 598, 599]) {
  const { M } = load({ quiet: true });
  const E = M.engine;
  const st = E.newGame({ seed: 21 });
  st.settings.freeWill = false;
  st.money = 5000;
  st.bills.push({ id: 777001, amount: 300, dueDay: 1, kind: 'bill' });
  while (st.time.minute < startAt) E.update(0.5);
  const rita = E.household()[0];
  const mailbox = st.objects.find((o) => o.type === 'mailbox');
  const slot = E.slotsFor(mailbox.id)[0];
  for (const s of E.household()) s.queue = [];
  rita.x = slot.x; rita.y = slot.y;
  E.queueInteraction(rita.id, mailbox.id, 'pay_bills', 'player');
  const m0 = st.money, f0 = st.objects.filter((o) => o.price > 0).length;
  let paidAt = null, spawned = null;
  for (let i = 0; i < 120 * 2; i++) {
    E.update(0.5);
    if (paidAt == null && !st.bills.length) paidAt = M.util.fmtTime(st.time.minute);
    if (!spawned && st.sims.some((s) => s.role === 'collector')) spawned = M.util.fmtTime(st.time.minute);
  }
  res.push({ startAt: M.util.fmtTime(startAt), paidAt, collectorSpawned: spawned, moneyPaid: m0 - st.money, furnitureTaken: f0 - st.objects.filter((o) => o.price > 0).length,
    log: st.notifications.filter((n) => /cobran|pagou|conta/i.test(n.text)).map((n) => M.util.fmtTime(n.minute) + ' ' + n.text) });
}
console.log(JSON.stringify(res, null, 1));
