// QA: a single resident on an empty lot (no known neighbours) with a DAY job: social sits at -100, which counts as a
// "critical motive at departure" (-20 performance) every shift regardless of a good mood -> performance spiral.
import { boot } from './qa_simeng_lib.mjs';
import { buildStudio } from './qa_simeng_scenarios.mjs';
const ctx = boot({ seed: 7, empty: true, members: [{ name: 'Lia Souza', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 }, career: { track: 'negocios' } }] });
const { E, M } = ctx;
buildStudio(E, M, { extras: true });
const lia = E.state.sims[0];
M.util.bus.on('notify', (n) => {
  if (/foi para o trabalho/.test(n.text)) { const c = lia.career; console.log(`d${E.state.time.day} depart: mood ${c.moodAtDeparture}, critAtDeparture ${c.critAtDeparture}, social ${Math.round(lia.motives.social)}, perf before ${c.performance}`); }
  if (/voltou do trabalho|Promo|rebaix/.test(n.text)) console.log(`   return: perf after ${lia.career && lia.career.performance} :: ${n.text}`);
});
for (let i = 0; i < 12 * 1440 * 2; i++) E.update(0.5);
console.log('known neighbours:', E.state.npcs.filter((n) => n.known).length);
