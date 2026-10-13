// QA: exhausted character with a critical bladder (toilet broken) -> faint ends immediately (bladder <= -95)
// and critical() faints again next tick: notification spam + flicker.
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 3 });
const { E } = ctx;
const S = E.state;
E.setFreeWill(false);
S.objects.find((o) => o.type === 'toilet').broken = true;   // toilet clogged
const rita = S.sims[0];
rita.queue = [];
rita.motives.energy = -99.9; rita.motives.bladder = -94; rita.motives.hunger = 50;
const anims = [];
for (let i = 0; i < 60; i++) { E.update(0.5); anims.push(rita.anim[0] + (rita.queue[0] ? rita.queue[0].phase[0] : '-')); }
const faints = ctx.notes.filter((n) => /Rita desmaiou/.test(n.text));
console.log('faint notifications in 30 sim-min:', faints.length, faints.slice(0, 3).map((n) => n.min));
console.log('anim/phase per tick:', anims.join(' '));
console.log('accident:', ctx.notes.filter((n) => /banheiro a tempo/.test(n.text)).length, 'bladder now', rita.motives.bladder.toFixed(1), 'energy', rita.motives.energy.toFixed(1));
