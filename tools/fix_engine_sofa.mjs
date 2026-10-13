// Fix check (engine, SIM-4): a 3rd household member at night, both bed slots taken by sleeping housemates,
// energy low -> sleeps on the free sofa ("Dormir no sofá") instead of fainting. Also run in the daytime.
// Usage: node tools/fix_engine_sofa.mjs
import { boot } from './qa_simeng_lib.mjs';
let bad = 0;
for (const [hour, energy] of [[23, -92], [23, -60], [1, -75], [15, -92]]) {
  const ctx = boot({ seed: 12 });
  const { E, M } = ctx;
  const S = E.state;
  const bia = E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 } });
  while (S.time.day < 2 || Math.floor(S.time.minute) !== hour * 60) E.update(0.5);
  const bed = S.objects.find((o) => o.type === 'bed_double');
  // make sure both bed slots are held by the other two
  const others = S.sims.filter((s) => s !== bia && !s.visitor);
  for (const s of others) { s.motives.energy = -40; }
  for (const s of S.sims) { s.queue = []; s.asleep = false; s.seated = false; }
  bia.x = 10; bia.y = 12;
  for (const s of others) { s.x = 8; s.y = 8; E.queueInteraction(s.id, bed.id, 'sleep', 'auto', { prio: 60 }); }
  for (let i = 0; i < 20; i++) E.update(0.5);
  bia.queue = []; bia.x = 10; bia.y = 12;
  for (const m of M.data.MOTIVES) bia.motives[m] = 60;
  bia.motives.energy = energy;
  const seen = {};
  let faint = null;
  for (let i = 0; i < 240; i++) {
    E.update(0.5);
    const a = bia.queue[0];
    const k = a ? (a.interaction || a.label) : 'idle';
    seen[k] = (seen[k] || 0) + 0.5;
    if (!faint && ctx.notes.some((n) => /Bia desmaiou/.test(n.text))) faint = M.util.fmtTime(S.time.minute);
  }
  const oth = others.map((s) => s.name.split(' ')[0] + ':' + (s.queue[0] ? s.queue[0].interaction + '/' + s.queue[0].phase : 'idle')).join(' ');
  const slept = (seen.sleep_sofa || 0) + (seen.nap || 0) + (seen.sleep || 0);
  const ok = hour === 15 ? !faint : (!faint && slept >= 60);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} start ${hour}:00 energy ${energy} -> Bia minutes:`, JSON.stringify(seen), '| fainted at', faint, '| others:', oth);
}
console.log(bad ? 'FAILURES: ' + bad : 'ALL OK');
