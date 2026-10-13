// SIM-10 verify: 'Estudar culinária' (player) duration and skill gain, seated vs standing, by starting comfort.
import { load } from './qa_verify_sim_lib.mjs';

for (const [comfort, removeSeats] of [[90, false], [60, false], [20, false], [-40, false], [90, true]]) {
  const c = load({ seed: 6 });
  const { E, S, D } = c;
  const caio = S.sims.find((s) => s.name.startsWith('Caio'));
  E.removeSim(caio.id);
  const rita = S.sims[0];
  while (S.time.minute < 10 * 60) E.update(0.5);
  if (removeSeats) for (const o of S.objects.filter((o) => D.CATALOG[o.type] && D.CATALOG[o.type].seat)) E.sellObject(o.id);
  rita.queue = [];
  Object.assign(rita.motives, { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90, comfort });
  const shelf = S.objects.find((o) => o.type === 'bookshelf');
  const sk0 = rita.skills.cooking;
  E.queueInteraction(rita.id, shelf.id, 'study_cooking', 'player');
  let doMin = 0, seatType = null, endComfort = null, endFun = null;
  for (let i = 0; i < 240 * 2; i++) {
    E.update(0.5);
    const a = rita.queue[0];
    if (a && a.interaction === 'study_cooking' && a.phase === 'do') { doMin += 0.5; if (a.data.seatId != null) seatType = (E.objectById(a.data.seatId) || {}).type; endComfort = rita.motives.comfort; endFun = rita.motives.fun; }
    if (doMin > 0 && !(a && a.interaction === 'study_cooking')) break;
  }
  console.log(`comfort ${String(comfort).padStart(3)} ${removeSeats ? 'no seats ' : 'seats ok '}: studied ${doMin} min at ${seatType || 'standing'}; cooking ${sk0.toFixed(2)} -> ${rita.skills.cooking.toFixed(2)}; comfort at end ${Math.round(endComfort)}, fun ${Math.round(endFun)}`);
}
