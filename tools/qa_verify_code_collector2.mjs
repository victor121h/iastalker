// qa_verify_code: CR-5 window sweep. Rita is ordered to "Pagar contas" at minute T before 10:00 on the due day.
// For which T does she pay AND the collector still repossess?  Usage: node tools/qa_verify_code_collector2.mjs
import { loadGame, step, stepUntil } from './qa_verify_code_lib.mjs';
const rows = [];
for (let startMin = 9 * 60 + 44; startMin <= 9 * 60 + 59; startMin += 1) {
  const { M, notes } = loadGame({ quiet: true });
  const E = M.engine;
  const st = E.newGame({ seed: 11 });
  E.setFreeWill(false);
  const rita = E.household().find((s) => /Rita/.test(s.name));
  const caio = E.household().find((s) => /Caio/.test(s.name)); if (caio) caio.career = null;
  st.time.day = 4; st.time.minute = startMin; st.lastBillDay = 4;
  st.bills = [{ id: 9001, amount: 300, dueDay: 4, kind: 'bill' }];
  const mailbox = st.objects.find((o) => o.type === 'mailbox');
  const n0 = st.objects.filter((o) => (M.data.CATALOG[o.type] || {}).buyable !== false).length, money0 = st.money;
  E.queueInteraction(rita.id, mailbox.id, 'pay_bills', 'player');
  step(M, 30);
  const n1 = st.objects.filter((o) => (M.data.CATALOG[o.type] || {}).buyable !== false).length;
  rows.push({ orderedAt: M.util.fmtTime(startMin), moneyPaid: money0 - st.money, furnitureTaken: n0 - n1, doubleCharge: (money0 - st.money) > 0 && n0 - n1 > 0,
    log: notes.filter((n) => /cobran|pagou|levou|Dinheiro/i.test(n.text)).map((n) => n.t + ' ' + n.text.slice(0, 70)) });
}
for (const r of rows) console.log(r.orderedAt, 'paid', r.moneyPaid, 'taken', r.furnitureTaken, r.doubleCharge ? 'DOUBLE' : '', '|', r.log.join(' | '));
