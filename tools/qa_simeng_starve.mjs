// QA: does a character with no food ever reach the hunger emergency (hunger <= -100 -> hospital)?
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 3 });
const { E } = ctx;
const S = E.state;
for (const t of ['fridge_cheap']) E.sellObject(S.objects.find((o) => o.type === t).id);
const rita = S.sims[0];
rita.motives.hunger = -90;
const t0 = S.time.day * 1440 + S.time.minute;
for (let h = 1; h <= 72; h++) {
  for (let i = 0; i < 120; i++) E.update(0.5);
  if (h % 12 === 0) console.log('after', h, 'h: hunger', rita.motives.hunger.toFixed(4), 'hidden', rita.hidden, 'hospital notes', ctx.notes.filter((n) => /emergência/.test(n.text) && /Rita/.test(n.text)).length);
}
console.log('DECAY rule: -0.063*(100+h)/h -> asymptotic, never reaches -100; CRITICAL.hospitalHunger =', ctx.M.data.CRITICAL.hospitalHunger);
