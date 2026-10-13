// Overdue bill: the collector spawns at 10:00 with a fixed amount. The player pays the bill at the mailbox
// (the in-game "Pagar contas" interaction) before the collector reaches the door. Does he still take furniture?
import { load } from './qa_cr_lib.mjs';
const { M } = load({ quiet: true });
const E = M.engine;
const st = E.newGame({ seed: 21 });
st.settings.freeWill = false;
st.money = 5000;
st.bills.push({ id: 777001, amount: 300, dueDay: 1, kind: 'bill' });
// jump to 09:59 on day 1
while (st.time.minute < 599) E.update(0.5);
const objsBefore = st.objects.filter((o) => o.price > 0).length;
let collectorSeenAt = null, paidAt = null, collectorReachedDoor = null;
const rita = E.household()[0];
const mailbox = st.objects.find((o) => o.type === 'mailbox');
for (let i = 0; i < 240 * 2; i++) {
  E.update(0.5);
  const col = st.sims.find((s) => s.role === 'collector');
  if (col && collectorSeenAt == null) {
    collectorSeenAt = M.util.fmtTime(st.time.minute);
    // the player reacts immediately: Rita pays at the mailbox (same path as the pie menu "Pagar contas")
    for (const s of E.household()) s.queue = [];
    rita.x = mailbox.x; rita.y = mailbox.y - 1;
    E.queueInteraction(rita.id, mailbox.id, 'pay_bills', 'player');
  }
  if (paidAt == null && collectorSeenAt && !st.bills.length) paidAt = M.util.fmtTime(st.time.minute);
  if (col && col.data.stage === 2 && collectorReachedDoor == null) collectorReachedDoor = M.util.fmtTime(st.time.minute);
  if (collectorSeenAt && !col) break;
}
const objsAfter = st.objects.filter((o) => o.price > 0).length;
const log = st.notifications.slice(-8).map((n) => M.util.fmtTime(n.minute) + ' ' + n.text);
console.log(JSON.stringify({ collectorSeenAt, paidAt, collectorReachedDoor, moneyAfter: st.money, furnitureBefore: objsBefore, furnitureAfter: objsAfter, log }, null, 1));
