// QA: player-directed study — how long it lasts, why it ends, and skill gain per hour.
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 4 });
const { E, M } = ctx;
const S = E.state;
E.setFreeWill(false);
const rita = S.sims[0];
for (const k of M.data.MOTIVES) rita.motives[k] = 90;
const shelf = S.objects.find((o) => o.type === 'bookshelf');
const mirror = S.objects.find((o) => o.type === 'mirror');
for (const [o, key, sk] of [[shelf, 'study_cooking', 'cooking'], [mirror, 'speech', 'charisma']]) {
  rita.queue = [];
  const s0 = rita.skills[sk];
  const t0 = S.time.day * 1440 + S.time.minute;
  E.queueInteraction(rita.id, o.id, key, 'player');
  let doStart = null, lastHead = null;
  for (let i = 0; i < 400; i++) {
    E.update(0.5);
    const a = rita.queue[0];
    if (a && a.phase === 'do' && doStart == null) doStart = S.time.day * 1440 + S.time.minute;
    if (!a) { lastHead = 'ended'; break; }
  }
  const t1 = S.time.day * 1440 + S.time.minute;
  console.log(key, 'do minutes', doStart ? (t1 - doStart).toFixed(1) : '-', 'skill', s0.toFixed(2), '->', rita.skills[sk].toFixed(2), 'mood', E.mood(rita).toFixed(0), 'fun', rita.motives.fun.toFixed(0), lastHead, 'seated', rita.seated);
}
