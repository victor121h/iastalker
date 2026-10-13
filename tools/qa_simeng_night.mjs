// QA: night-shift career (Vigia noturno 00-06) for 14 days: faints, performance, energy at departure/return.
import { monitor, summarize } from './qa_simeng_lib.mjs';
import { nightScenario } from './qa_simeng_scenarios.mjs';
const seed = +(process.argv[2] || 7);
const ctx = nightScenario(seed);
const { E, M } = ctx;
const dep = [];
M.util.bus.on('notify', (n) => {
  const s = E.state.sims[0];
  if (/foi para o trabalho|voltou do trabalho|rebaixad|Promo|desmaiou|faltou|perdeu/.test(n.text)) dep.push(`d${E.state.time.day} ${M.util.fmtTime(E.state.time.minute)} energy ${Math.round(s.motives.energy)} hunger ${Math.round(s.motives.hunger)} mood ${Math.round(E.mood(s))} perf ${s.career ? s.career.performance : '-'} :: ${n.text}`);
});
const R = monitor(ctx, { days: 14, label: 'night shift seguranca seed ' + seed });
console.log(dep.join('\n'));
console.log(summarize(ctx, R).split('\n').filter((l) => /motive min|Lia Souza  |careers|Ciência|Segurança|money/.test(l)).join('\n'));
