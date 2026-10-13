// QA: one low motive at 14:00 — picks with the housemate nearby vs. away (hidden). 300 samples each.
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 8 });
const { E, M } = ctx;
const S = E.state;
const rita = S.sims[0], caio = S.sims[1];
while (S.time.minute < 14 * 60) E.update(0.5);
for (const s of [rita, caio]) { s.queue = []; s.hidden = false; s.atWork = false; s.asleep = false; }
rita.x = 10; rita.y = 12; caio.x = 9; caio.y = 11;
for (const away of [false, true]) {
  caio.hidden = away;
  console.log(away ? '== Caio away ==' : '== Caio nearby (1.4 tiles) ==');
  for (const [k, v] of [['energy', -75], ['energy', -88], ['comfort', -70], ['comfort', -85], ['fun', -70], ['fun', -85]]) {
    for (const m of M.data.MOTIVES) rita.motives[m] = 50;
    rita.motives.room = 0; rita.motives[k] = v;
    const tally = {};
    for (let i = 0; i < 300; i++) {
      const c = E.debug.runAutonomy(rita, null);
      const key = !c ? 'nothing' : c.kind === 'social' ? 'social' : c.o.type + ':' + c.it.key;
      tally[key] = (tally[key] || 0) + 1;
    }
    console.log(`  ${k} ${v}:`.padEnd(16), Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([a, b]) => a + ' ' + Math.round(b / 3) + '%').join(', '));
  }
}
