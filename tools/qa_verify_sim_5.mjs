// SIM-5 verify: faint ending because bladder <= -95 while energy is still ~-100 -> re-faint loop.
// A: default house, Rita energy -99.9 bladder -94 at 14:00, toilet working, free will ON.
// B: same with the toilet sold.
// C: natural: 3-member starter household (beds short), 6 days, 3 seeds: count clustered faint toasts.
import { load, stamp, head } from './qa_verify_sim_lib.mjs';

function controlled(sellToilet) {
  const c = load({ seed: 9 });
  const { E, S, notes } = c;
  while (S.time.minute < 14 * 60) E.update(0.5);
  const rita = S.sims[0];
  if (sellToilet) { const t = S.objects.find((o) => o.type === 'toilet'); E.sellObject(t.id); }
  rita.queue = []; rita.motives.energy = -99.9; rita.motives.bladder = -94; rita.x = 10; rita.y = 12;
  const n0 = notes.length;
  const trace = [];
  for (let i = 0; i < 60 * 2; i++) {
    E.update(0.5);
    if (i % 2 === 0) trace.push((rita.queue[0] ? (rita.queue[0].effect || rita.queue[0].interaction) + ':' + rita.queue[0].phase : 'idle') + '@' + Math.round(rita.motives.energy) + '/' + Math.round(rita.motives.bladder));
  }
  const nf = notes.slice(n0).filter((n) => /desmaiou/.test(n.text));
  const acc = notes.slice(n0).filter((n) => /banheiro a tempo/.test(n.text));
  console.log(`${sellToilet ? 'toilet SOLD' : 'toilet ok'}: faint toasts in 60 min: ${nf.length} (${nf.map((n) => n.t.slice(3)).join(' ')}) accident toasts: ${acc.length}`);
  console.log('   per-minute head@energy/bladder:', trace.slice(0, 40).join(' '));
}
function natural(seed) {
  const c = load({ seed });
  const { E, S, notes } = c;
  E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 4, outgoing: 5, active: 5, playful: 6, nice: 5 } });
  for (let i = 0; i < 6 * 1440 * 2; i++) E.update(0.5);
  const f = notes.filter((n) => /desmaiou de cansaço/.test(n.text));
  // clusters: same name within 15 min
  let clusters = 0, maxRun = 1, run = 1;
  for (let i = 1; i < f.length; i++) {
    const p = f[i - 1], q = f[i];
    const toMin = (t) => { const [d, hm] = t.slice(1).split(' '); const [h, m] = hm.split(':'); return +d * 1440 + +h * 60 + +m; };
    if (p.text === q.text && toMin(q.t) - toMin(p.t) <= 15) { run++; if (run === 2) clusters++; maxRun = Math.max(maxRun, run); } else run = 1;
  }
  console.log(`natural 3-member seed ${seed}: faint toasts ${f.length}, repeated-faint clusters ${clusters}, longest burst ${maxRun}`);
}
controlled(false);
controlled(true);
for (const s of [1, 2, 3, 4]) natural(s);
