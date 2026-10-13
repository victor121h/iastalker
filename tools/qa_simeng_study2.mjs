// QA: "Estudar culinária" length depends on comfort when done from a seat: it ends as soon as comfort reaches the
// seat's cap (after the 30-min minimum), instead of running to maxDuration (180) like the mirror speech.
import { boot } from './qa_simeng_lib.mjs';
for (const [label, comfort, sellSofa] of [['comfort 90, sofa available', 90, false], ['comfort 0, sofa available', 0, false], ['comfort 90, no sofa (standing)', 90, true]]) {
  const ctx = boot({ seed: 4 });
  const { E, M } = ctx;
  const S = E.state;
  E.setFreeWill(false);
  const rita = S.sims[0];
  if (sellSofa) E.sellObject(S.objects.find((o) => o.type === 'sofa_cheap').id);
  for (const k of M.data.MOTIVES) rita.motives[k] = 90;
  rita.motives.comfort = comfort;
  rita.queue = [];
  const shelf = S.objects.find((o) => o.type === 'bookshelf');
  E.queueInteraction(rita.id, shelf.id, 'study_cooking', 'player');
  let doMin = 0, seat = null; const s0 = rita.skills.cooking;
  for (let i = 0; i < 500; i++) { E.update(0.5); const a = rita.queue[0]; if (!a) break; if (a.phase === 'do') { doMin += 0.5; seat = a.data.seatId != null ? (E.objectById(a.data.seatId) || {}).type : 'standing'; } }
  console.log(label.padEnd(32), '-> studied', doMin, 'min at', seat, '| cooking', s0.toFixed(2), '->', rita.skills.cooking.toFixed(2), '| comfort end', rita.motives.comfort.toFixed(0));
}
