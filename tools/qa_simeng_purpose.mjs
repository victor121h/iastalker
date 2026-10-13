// QA: autonomy purposefulness — with one low motive, what does runAutonomy pick (200 samples)?
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 8 });
const { E, M } = ctx;
const S = E.state;
const rita = S.sims[0], caio = S.sims[1];
// put both in the living room, idle, 14:00
while (S.time.minute < 14 * 60) E.update(0.5);
for (const s of [rita, caio]) { s.queue = []; s.hidden = false; s.atWork = false; }
rita.x = 10; rita.y = 12; caio.x = 9; caio.y = 11;
const cases = { bladder: -70, hunger: -70, hygiene: -70, energy: -75, fun: -70, social: -70, comfort: -70, none: null };
for (const k in cases) {
  for (const m of M.data.MOTIVES) rita.motives[m] = 50;
  rita.motives.room = 0;
  if (cases[k] != null) rita.motives[k] = cases[k];
  const tally = {};
  for (let i = 0; i < 200; i++) {
    const c = E.debug.runAutonomy(rita, null);
    const key = !c ? 'nothing' : c.kind === 'social' ? 'social:' + c.so.key : c.o.type + ':' + c.it.key;
    tally[key] = (tally[key] || 0) + 1;
  }
  console.log(k.padEnd(8), Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([a, b]) => a + ' ' + b).join(', '));
}
