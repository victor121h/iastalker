// Two residents both queue "Pagar contas" for the same single bill (player clicks it for both, or both pick it
// autonomously). The second one arrives after the first paid. What does the game tell the player?
import { load } from './qa_cr_lib.mjs';
const { M } = load({ quiet: true });
const E = M.engine;
const st = E.newGame({ seed: 8 });
st.settings.freeWill = false;
st.time.minute = 18 * 60; // evening: both at home
for (const s of E.household()) { s.hidden = false; s.atWork = false; s.queue = []; }
st.money = 5000;
st.bills.push({ id: 880001, amount: 120, dueDay: 3, kind: 'bill' });
const mb = st.objects.find((o) => o.type === 'mailbox');
const [a, b] = E.household();
console.log('queued', E.queueInteraction(a.id, mb.id, 'pay_bills', 'player'), E.queueInteraction(b.id, mb.id, 'pay_bills', 'player'));
const n0 = st.notifications.length;
for (let i = 0; i < 120 * 4; i++) E.update(0.25);
console.log(JSON.stringify({ money: st.money, bills: st.bills.length, newNotifications: st.notifications.slice(n0).map((n) => n.kind + ': ' + n.text) }, null, 1));
