// Sell / move the object a character is using ON its tile (bed, sofa, toilet, shower, chair while eating, computer seat)
// and check the character ends in a sane state (not asleep/seated, on a walkable tile, queue drained, no exception).
import { load } from './qa_cr_lib.mjs';
const cases = [['bed_double', 'sleep'], ['sofa_cheap', 'sit'], ['toilet', 'use'], ['shower', 'shower'], ['tv_cheap', 'watch'], ['bookshelf', 'read']];
const out = {};
for (const [type, key] of cases) for (const how of ['sell', 'move']) {
  const { M } = load({ quiet: true });
  const E = M.engine, W = M.world;
  const st = E.newGame({ seed: 4 });
  st.settings.freeWill = false;
  E.debug.throwErrors = true;
  const rita = E.household()[0];
  for (const s of E.household()) s.queue = [];
  rita.motives.energy = -40; rita.motives.bladder = -40; rita.motives.hygiene = -40; rita.motives.comfort = -40; rita.motives.fun = -40;
  const o = st.objects.find((x) => x.type === type);
  const its = E.getInteractions(rita.id, o.id);
  const it = its.find((i) => i.key === key && i.enabled) || its.find((i) => i.enabled);
  if (!it) { out[type + ' ' + how] = { skipped: its.map((i) => i.key + ':' + i.reason) }; continue; }
  E.queueInteraction(rita.id, o.id, it.key, 'player');
  let i = 0;
  while (i++ < 400 && !(rita.queue[0] && rita.queue[0].phase === 'do')) E.update(0.25);
  const during = { seated: rita.seated, asleep: rita.asleep, anim: rita.anim };
  let r;
  try { r = how === 'sell' ? E.sellObject(o.id) : E.moveObject(o.id, 2, 2, 0); } catch (e) { r = { exc: e.message }; }
  let exc = null;
  try { for (let k = 0; k < 40; k++) E.update(0.25); } catch (e) { exc = e.message; }
  const t = { x: Math.round(rita.x), y: Math.round(rita.y) };
  out[type + ' ' + how] = { interaction: it.key, during, opOk: r && r.ok, after: { seated: rita.seated, asleep: rita.asleep, anim: rita.anim, queue: rita.queue.map((a) => a.label + ':' + a.phase), onWalkable: W.isWalkable(t.x, t.y), pos: [+rita.x.toFixed(2), +rita.y.toFixed(2)] }, exc };
}
console.log(JSON.stringify(out, null, 1));
