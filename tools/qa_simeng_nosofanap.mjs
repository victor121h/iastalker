// QA: at night, an exhausted 3rd household member whose bed is taken never naps on the free sofa —
// napGate is -100 from 20:00 to 05:59, so even the energy override finds nothing and they faint on the floor.
import { boot } from './qa_simeng_lib.mjs';
for (const hour of [23, 15]) {
  const ctx = boot({ seed: 12 });
  const { E, M } = ctx;
  const S = E.state;
  const bia = E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 } });
  E.setFreeWill(true);
  while (S.time.day < 2 || S.time.minute < hour * 60) E.update(0.5);
  // occupy the double bed: both slots asleep
  const bed = S.objects.find((o) => o.type === 'bed_double');
  // remove the bed so only the sofa (2 nap seats, free) remains
  E.sellObject(bed.id);
  bia.queue = []; bia.x = 10; bia.y = 12;
  for (const m of M.data.MOTIVES) bia.motives[m] = 60;
  bia.motives.energy = -92;
  const seen = {};
  let faint = null;
  for (let i = 0; i < 240; i++) {
    E.update(0.5);
    const a = bia.queue[0];
    const k = a ? (a.interaction || a.label) : 'idle';
    seen[k] = (seen[k] || 0) + 0.5;
    if (!faint && ctx.notes.some((n) => /Bia desmaiou/.test(n.text))) faint = M.util.fmtTime(S.time.minute);
  }
  const others = S.sims.filter((s) => s !== bia && !s.visitor).map((s) => s.name.split(' ')[0] + ':' + (s.queue[0] ? s.queue[0].interaction + '/' + s.queue[0].phase : 'idle')).join(' ');
  console.log(`start ${hour}:00 (no bed, free sofa) -> Bia minutes by action:`, JSON.stringify(seen), '| fainted at', faint, '| others:', others);
}
