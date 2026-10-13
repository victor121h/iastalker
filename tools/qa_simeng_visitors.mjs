// QA: visitors — invite a guest late afternoon, check control refusal, behaviour, and that they leave.
import { boot, fmt } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: +(process.argv[2] || 9) });
const { E, M } = ctx;
const S = E.state;
const rita = S.sims[0];
const phone = S.objects.find((o) => o.type === 'phone');
while (S.time.minute < 17 * 60) E.update(0.5);
const npc = S.npcs.find((n) => n.known);
console.log('invite queued', E.queueInteraction(rita.id, phone.id, 'invite:' + npc.id, 'player'));
let guest = null; const log = []; let lastKey = '';
for (let i = 0; i < 2 * 60 * 9; i++) {
  E.update(0.5);
  const g = S.sims.find((s) => s.visitor && s.role === 'guest');
  if (g && !guest) {
    guest = g;
    console.log('guest arrived', fmt(E, S.time.day * 1440 + S.time.minute), g.name, 'leaveAt', fmt(E, g.leaveAt));
    console.log('  selectSim ->', (E.selectSim(g.id), S.settings.selectedSimId), '| player queueWalk', E.queueWalk(g.id, 5, 5, 'player'),
      '| player queueInteraction', E.queueInteraction(g.id, phone.id, 'call_friend', 'player'), '| getInteractions', E.getInteractions(g.id, phone.id).length,
      '| queueSocial as initiator', E.queueSocial(g.id, rita.id, 'talk', 'player'));
  }
  if (g) {
    const a = g.queue[0];
    const k = a ? (a.kind === 'social' ? 's:' : '') + (a.interaction || a.label) : 'idle';
    if (k !== lastKey) { log.push(M.util.fmtTime(S.time.minute) + ' ' + k); lastKey = k; }
  }
  if (guest && !S.sims.includes(guest)) { console.log('guest left at', fmt(E, S.time.day * 1440 + S.time.minute)); guest = 'gone'; break; }
}
console.log('guest activity:', log.join(' | '));
console.log('notes:', ctx.notes.filter((n) => n.day === S.time.day || true).filter((n) => /visita|embora|aceitou|recusou|chegou para/.test(n.text)).map((n) => M.util.fmtTime(n.min) + ' ' + n.text).join(' / '));
