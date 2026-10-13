// Cooking is paid at the fridge (stage 0). Cancelling via the queue refunds; what about selling / moving
// the fridge, counter or stove while the meal is being prepared (Buy mode)? And eating: sell the chair mid-meal.
import { load } from './qa_cr_lib.mjs';
function setup(seed) {
  const { M } = load({ quiet: true });
  const E = M.engine;
  const st = E.newGame({ seed });
  st.settings.freeWill = false;
  const rita = E.household()[0];
  for (const s of E.household()) { s.queue = []; s.motives.hunger = 50; }
  const fridge = st.objects.find((o) => o.type === 'fridge_cheap');
  E.queueInteraction(rita.id, fridge.id, 'cook', 'player');
  return { M, E, st, rita, fridge };
}
const runUntil = (E, pred, max = 600) => { for (let i = 0; i < max * 4 && !pred(); i++) E.update(0.25); return pred(); };
const out = {};
for (const [name, target, stage] of [['cancel via queue (control)', null, 1], ['sell fridge during stage 0', 'fridge', 0], ['sell counter during stage 1', 'counter', 1], ['move counter during stage 1', 'counterMove', 1]]) {
  const { E, st, rita, fridge } = setup(11);
  const m0 = st.money;
  const ok = runUntil(E, () => rita.queue[0] && rita.queue[0].effect === 'cook_meal' && rita.queue[0].stage === stage && rita.queue[0].phase === 'do');
  const paid = m0 - st.money;
  const a = rita.queue[0];
  if (target === null) E.cancelAction(rita.id, a.id);
  else if (target === 'fridge') E.sellObject(fridge.id);
  else {
    const counter = st.objects.find((o) => o.id === a.tgtId);
    if (target === 'counter') E.sellObject(counter.id);
    else E.moveObject(counter.id, 3, 3, 0);
  }
  const mAfterOp = st.money;
  runUntil(E, () => !rita.queue.some((x) => x.effect === 'cook_meal'), 120);
  const sold = target === 'fridge' ? E.sellValue ? 0 : 0 : 0;
  out[name] = { reachedStage: ok, paidForFood: paid, moneyChangeByOp: mAfterOp - (m0 - paid), refundedFood: st.money - mAfterOp, meals: st.objects.filter((o) => o.type === 'meal').length };
}
console.log(JSON.stringify(out, null, 1));
