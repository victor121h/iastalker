// qa_verify_code: CR-5. A bill is due today. At 10:00 the collector spawns ("chegou para levar objetos") and walks to
// the door. The player reacts to the red alert by ordering Rita to "Pagar contas" at the mailbox right away.
// Does the collector still take furniture after the bill was paid?  Usage: node tools/qa_verify_code_collector.mjs
import { loadGame, step, stepUntil } from './qa_verify_code_lib.mjs';

const out = [];
for (const reactDelay of [0, 1, 2]) {
  const { M, notes } = loadGame({ quiet: true });
  const E = M.engine;
  const st = E.newGame({ seed: 11 });
  E.setFreeWill(false);
  // Caio away at work for this test; Rita at home near the front door
  const rita = E.household().find((s) => /Rita/.test(s.name));
  const caio = E.household().find((s) => /Caio/.test(s.name));
  if (caio) caio.career = null;
  st.time.day = 4; st.time.minute = 9 * 60 + 58; st.lastBillDay = 4;
  st.bills = [{ id: 9001, amount: 300, dueDay: 4, kind: 'bill' }];
  const mailbox = st.objects.find((o) => o.type === 'mailbox');
  const objCount0 = st.objects.filter((o) => (M.data.CATALOG[o.type] || {}).buyable !== false).length;
  const money0 = st.money;
  // wait for the collector to spawn at 10:00
  stepUntil(M, () => st.sims.some((s) => s.role === 'collector'), 10);
  const col = st.sims.find((s) => s.role === 'collector');
  step(M, reactDelay);
  const queued = E.queueInteraction(rita.id, mailbox.id, 'pay_bills', 'player');
  let paidAt = null, takenAt = null;
  stepUntil(M, () => {
    if (paidAt == null && st.bills.length === 0 && st.money < money0) paidAt = M.util.fmtTime(st.time.minute);
    if (takenAt == null && notes.some((n) => /levou/.test(n.text))) takenAt = M.util.fmtTime(st.time.minute);
    return paidAt && takenAt;
  }, 60);
  step(M, 5);
  const objCount1 = st.objects.filter((o) => (M.data.CATALOG[o.type] || {}).buyable !== false).length;
  out.push({
    reactDelayMin: reactDelay, collectorSpawned: !!col, queued, paidAt, takenAt,
    moneyPaid: money0 - st.money, furnitureTaken: objCount0 - objCount1,
    log: notes.filter((n) => /cobran|pagou|conta|levou|Dinheiro/i.test(n.text)).map((n) => n.t + ' ' + n.kind + ': ' + n.text),
  });
}
console.log(JSON.stringify(out, null, 1));
