// qa_verify_code: CR-7. Rita starts "Preparar refeição" (paid at the fridge, stage 0), then the action is cancelled
// in different ways while she is in stage 0 or 1 (before anything is on the stove). Is the food money refunded?
// Usage: node tools/qa_verify_code_cook.mjs
import { loadGame, step, stepUntil } from './qa_verify_code_lib.mjs';

function scenario(name, stageWanted, how) {
  const { M, notes } = loadGame({ quiet: true });
  const E = M.engine;
  const st = E.newGame({ seed: 5 });
  E.setFreeWill(false);
  const rita = E.household().find((s) => /Rita/.test(s.name));
  const fridge = st.objects.find((o) => /^fridge/.test(o.type));
  const money0 = st.money;
  E.queueInteraction(rita.id, fridge.id, 'cook', 'player');
  const act = rita.queue[0];
  const t = stepUntil(M, () => act.stage === stageWanted && act.phase === 'do', 60);
  const paid = money0 - st.money;
  const info = { stage: act.stage, phase: act.phase, elapsed: +act.elapsed.toFixed(1) };
  if (how === 'cancelAction') E.cancelAction(rita.id, act.id);
  if (how === 'sellFridge') E.sellObject(fridge.id);
  if (how === 'sellCounter') { const c = M.engine.objectById(act.tgtId); E.sellObject(c.id); }
  if (how === 'none') { /* control: let it finish */ }
  const before = st.money;
  step(M, how === 'none' ? 40 : 10);
  const sellRefund = (how === 'sellFridge' || how === 'sellCounter') ? 'n/a' : 0;
  const meals = st.objects.filter((o) => o.type === 'meal').length;
  return { name, reachedAtMin: t, atCancel: info, paidForFood: paid, moneyDeltaAfterCancel: st.money - before, meals, queueLeft: rita.queue.map((a) => a.interaction),
    note: (how === 'sellFridge' || how === 'sellCounter') ? 'delta includes the furniture sell refund' : '' };
}
const res = [
  scenario('control: no cancel', 0, 'none'),
  scenario('cancel from queue strip at stage 0 (fridge, do)', 0, 'cancelAction'),
  scenario('cancel from queue strip at stage 1 (counter, do)', 1, 'cancelAction'),
  scenario('sell fridge during stage 0', 0, 'sellFridge'),
  scenario('sell counter during stage 1', 1, 'sellCounter'),
];
console.log(JSON.stringify(res, null, 1));
