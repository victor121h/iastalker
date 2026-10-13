// QA debug: inspect Ana's talk action d3 07:45 in four_empty seed 7
import { makeScenario } from './qa_simeng_scenarios.mjs';
const ctx = makeScenario('four_empty', 7);
const { E, M } = ctx;
const target = 3 * 1440 + 7 * 60 + 44;
while (E.state.time.day * 1440 + E.state.time.minute < target) E.update(0.5);
for (let i = 0; i < 8; i++) {
  E.update(0.5);
  const ana = E.state.sims.find((s) => s.name.startsWith('Ana'));
  const bru = E.state.sims.find((s) => s.name.startsWith('Bruno'));
  const a = ana.queue[0];
  console.log(E.state.time.minute, 'ana', ana.x, ana.y, 'bruno', bru.x, bru.y, a && JSON.stringify({ k: a.interaction, ph: a.phase, path: a.path, slot: a.slot, data: a.data }));
}
console.log('walkable 9,11', M.world.isWalkable(9, 11), 'objects near', E.state.objects.filter((o) => Math.abs(o.x - 9) <= 1 && Math.abs(o.y - 11) <= 1).map((o) => o.type + '@' + o.x + ',' + o.y));
