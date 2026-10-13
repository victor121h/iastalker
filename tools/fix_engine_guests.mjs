// Fix check (engine, guest improvement): a mean-spirited guest (nice 1) who likes the hosts does not tease or
// insult them; a guest who already dislikes them still may. Usage: node tools/fix_engine_guests.mjs
import { boot } from './qa_simeng_lib.mjs';
let bad = 0;
for (const [label, rel] of [['likes hosts', 10], ['dislikes hosts', -15]]) {
  let mean = 0, socials = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const { E, S } = boot({ seed });
    const rita = S.sims[0];
    const phone = S.objects.find((o) => o.type === 'phone');
    while (S.time.minute < 14 * 60) E.update(0.5);
    const npc = S.npcs.find((n) => n.known);
    npc.personality = { neat: 3, outgoing: 8, active: 5, playful: 8, nice: 1 };
    for (const h of S.sims) {
      npc.relationships[h.id] = { daily: rel, lifetime: rel };
      h.relationships[npc.id] = { daily: Math.max(rel, 40), lifetime: 30 };   // hosts like the guest enough to invite
    }
    rita.queue = [];
    E.queueInteraction(rita.id, phone.id, 'invite:' + npc.id);
    const seen = new Set();
    for (let i = 0; i < 2 * 60 * 5; i++) {
      E.update(0.5);
      const g = S.sims.find((s) => s.npcId === npc.id);
      if (!g) continue;
      g.leaveAt = 1e9;   // keep the guest around for the measurement
      const a = g.queue[0];
      if (a && a.kind === 'social' && !(a.data && a.data.respond) && a.phase === 'do' && !seen.has(a.id)) {
        seen.add(a.id); socials++;
        if (a.interaction === 'tease' || a.interaction === 'insult') mean++;
      }
    }
  }
  console.log(label.padEnd(15), 'guest socials', socials, 'mean', mean);
  if (rel > 0 && mean > 0) bad++;
  if (rel > 0 && socials < 3) bad++;
}
console.log(bad ? 'FAILURES: ' + bad : 'ALL OK');
