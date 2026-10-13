// QA: a worker taken to hospital across the shift start: is the shift counted (missed / worked / paid)?
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 3 });
const { E } = ctx;
const S = E.state;
const caio = S.sims.find((s) => s.name.startsWith('Caio'));
while (S.time.day < 2 || S.time.minute < 7 * 60 + 50) E.update(0.5);
caio.motives.hunger = -100;
const before = JSON.stringify({ missed: caio.career.missedDays, worked: caio.career.daysWorked, perf: caio.career.performance, money: S.money });
while (S.time.minute < 17 * 60) E.update(0.5);
console.log('before', before, 'after', JSON.stringify({ missed: caio.career.missedDays, worked: caio.career.daysWorked, perf: caio.career.performance, lastShift: caio.career.lastShift }));
console.log(ctx.notes.filter((n) => n.day === 2 && /Caio/.test(n.text)).map((n) => n.min + ' ' + n.text).join('\n'));
