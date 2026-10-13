// --eval: multi-day run in the real page with the renderer drawing between chunks.
// Catches render-frame exceptions, records which dynamic object types / visitor roles appeared,
// motive minima and the household's day summary.
const M = window.__morada.M, E = M.engine, R = M.render;
const b = document.getElementById('help-ok'); if (b) b.click();
const DAYS = +(window.__days || 3);
M.main.setSpeed(0);
const frameErrs = [];
const consoleErrs = [];
const of = R.frame;
R.frame = function (dt) { try { return of.call(R, dt); } catch (e) { if (frameErrs.length < 8) frameErrs.push(M.util.fmtTime(E.state.time.minute) + ' d' + E.state.time.day + ': ' + e.message); throw e; } };
const oe = console.error;
console.error = function () { consoleErrs.push(Array.from(arguments).map(String).join(' ').slice(0, 240)); return oe.apply(console, arguments); };
const seenTypes = new Set(), roles = new Set(), anims = new Set();
const minMot = {};
const notes = [];
const daily = [];
let lastDay = E.state.time.day;
let idle = {}, total = {};
const t0 = performance.now();
const end = (E.state.time.day + DAYS) * 1440 + 480;
while (E.state.time.day * 1440 + E.state.time.minute < end) {
  for (let i = 0; i < 4; i++) {
    E.update(5);
    for (const s of E.state.sims) {
      if (s.visitor) { roles.add(s.role); continue; }
      anims.add(s.anim);
      if (!s.hidden) {
        total[s.name] = (total[s.name] || 0) + 5;
        if (!s.queue.length || (s.queue[0] && /Passear/.test(s.queue[0].label || ''))) idle[s.name] = (idle[s.name] || 0) + 5;
      }
      const mm = minMot[s.name] = minMot[s.name] || {};
      for (const k in s.motives) mm[k] = Math.min(mm[k] == null ? 999 : mm[k], Math.round(s.motives[k]));
    }
  }
  for (const o of E.state.objects) seenTypes.add(o.type);
  if (E.state.time.day !== lastDay) {
    daily.push({ day: lastDay, money: E.state.money, moods: E.household().map((s) => s.name.split(' ')[0] + ':' + Math.round(E.mood(s))).join(' '), idle: Object.fromEntries(Object.keys(total).map((k) => [k.split(' ')[0], Math.round(100 * (idle[k] || 0) / total[k]) + '% of ' + Math.round(total[k] / 60) + 'h on lot'])) });
    idle = {}; total = {};
    lastDay = E.state.time.day;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}
const ms = performance.now() - t0;
const hh = E.household();
return {
  days: DAYS, ms: Math.round(ms), now: E.state.time, money: E.state.money, frameErrs, consoleErrs: consoleErrs.slice(0, 8),
  roles: Array.from(roles), anims: Array.from(anims), types: Array.from(seenTypes),
  minMotives: minMot, daily,
  careers: hh.map((s) => s.name + ': ' + (s.career ? s.career.track + ' L' + s.career.level + ' perf ' + Math.round(s.career.performance) + ' missed ' + s.career.missedDays : '-')),
  skills: hh.map((s) => s.name + ': ' + Object.entries(s.skills).filter(([, v]) => v > 0.05).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', ')),
  bills: E.state.bills, notifications: E.state.notifications.slice(-15).map((n) => 'd' + n.day + ' ' + M.util.fmtTime(n.minute) + ' ' + n.text),
  stats: R.stats(),
};
