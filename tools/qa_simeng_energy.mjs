// QA: print energy of the single_job character around the d11->d12 night shift
import { makeScenario } from './qa_simeng_scenarios.mjs';
const ctx = makeScenario('single_job', 7);
const { E } = ctx;
let lastHidden = false;
while (E.state.time.day < 12 || E.state.time.minute < 17 * 60) {
  E.update(0.5);
  const s = E.state.sims[0];
  const n = E.state.time.day * 1440 + E.state.time.minute;
  if (n >= 11 * 1440 + 14 * 60 && (Math.round(E.state.time.minute * 2) % 60 === 0 || s.hidden !== lastHidden)) console.log('d' + E.state.time.day, (E.state.time.minute / 60).toFixed(2), 'hidden', s.hidden, 'energy', s.motives.energy.toFixed(1), 'mood', E.mood(s).toFixed(0), 'q', s.queue.map((a) => a.interaction + '/' + a.phase).join(','));
  lastHidden = s.hidden;
}
