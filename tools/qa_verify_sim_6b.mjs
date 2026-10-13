// SIM-6 trace: seed 5, Rita's queue/position every half minute d4 18:18-18:25 (who cancels what).
import { load, stamp } from './qa_verify_sim_lib.mjs';
const c = load({ seed: 5 });
const { E, S } = c;
const rita = S.sims.find((s) => s.name.startsWith('Rita'));
while (S.time.day < 4 || S.time.minute < 18 * 60 + 18) E.update(0.5);
for (let i = 0; i < 16; i++) {
  E.update(0.5);
  console.log(stamp(S), S.time.minute % 1 ? '+30s' : '    ', `(${rita.x.toFixed(2)},${rita.y.toFixed(2)})`, rita.anim, rita.queue.map((a) => (a.kind === 'social' ? 's:' : '') + a.interaction + '/' + a.phase + (a.cancel ? '!c' : '') + (a.data && a.data.respond ? '(R)' : '') + (a.path ? ' p' + a.progress + '/' + a.path.length : '')).join(' > '));
}
