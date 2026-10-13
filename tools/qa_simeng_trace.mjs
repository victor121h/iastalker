// QA trace: run default (or given) scenario to a time window and print both sims each half-minute.
// Usage: node tools/qa_simeng_trace.mjs --seed 1 --from "8 17:00" --to "8 17:30" [--names Rita,Caio]
import { boot, fmt } from './qa_simeng_lib.mjs';
import { makeScenario } from './qa_simeng_scenarios.mjs';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const seed = +opt('seed', '1');
const parse = (s) => { const [d, hm] = s.split(' '); const [h, m] = hm.split(':').map(Number); return +d * 1440 + h * 60 + m; };
const from = parse(opt('from', '1 08:00')), to = parse(opt('to', '1 09:00'));
const names = opt('names', '').split(',').filter(Boolean);
const scen = opt('scen', '');
const ctx = scen ? makeScenario(scen, seed) : boot({ seed });
const { E, M } = ctx;
const S = () => E.state;
while (S().time.day * 1440 + S().time.minute < from) E.update(0.5);
while (S().time.day * 1440 + S().time.minute < to) {
  E.update(0.5);
  const n = S().time.day * 1440 + S().time.minute;
  const line = S().sims.filter((s) => !s.hidden && (!names.length || names.some((x) => s.name.startsWith(x)))).map((s) => {
    const a = s.queue[0];
    const q = s.queue.map((q) => (q.kind === 'social' ? 's:' : '') + (q.interaction || q.label) + (q.data && q.data.respond ? '(R)' : '') + '/' + q.phase + (q.stage ? '#' + q.stage : '') + '/p' + q.prio).join(' > ');
    return `${s.name.split(' ')[0]}@(${s.x.toFixed(2)},${s.y.toFixed(2)}) ${s.anim}${s.seated ? ' seated' : ''}${s.asleep ? ' asleep' : ''} [${q}]` + (a && a.slot ? ` slot(${a.slot.x},${a.slot.y}${a.slot.on ? ',on' : ''})` : '');
  }).join(' || ');
  console.log(fmt(E, n), line);
}
for (const n of ctx.notes.filter((n) => n.day * 1440 + n.min >= from && n.day * 1440 + n.min <= to)) console.log('  NOTE', n.day, M.util.fmtTime(n.min), n.text);
