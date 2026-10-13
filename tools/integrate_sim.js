// --eval script: run the real game's engine fast for N sim hours, sample autonomy and motives,
// then let the renderer draw a few frames. Returns a summary.
const M = window.__morada.M;
const E = M.engine;
const st0 = window.__morada.state;
const okBtn = document.getElementById('help-ok'); if (okBtn) okBtn.click();
const HOURS = +(window.__simHours || 16);
const errors = [];
const origErr = console.error;
console.error = function () { errors.push(Array.from(arguments).map(String).join(' ').slice(0, 300)); return origErr.apply(console, arguments); };
const t0 = performance.now();
const startMoney = E.state.money;
const startTime = Object.assign({}, E.state.time);
const samples = {};           // simName -> { activity -> minutes }
const sleeps = {};
const minMot = {};
const timeline = {};
let nanFound = null;
const STEP = 5;
const n = Math.round(HOURS * 60 / STEP);
for (let i = 0; i < n; i++) {
  E.update(STEP);
  for (const s of E.state.sims) {
    if (s.visitor) continue;
    const a = s.queue && s.queue[0];
    const act = s.hidden ? (s.atWork ? 'TRABALHO' : 'fora') : a ? (a.label || a.interaction || a.kind) : (s.anim === 'idle' ? 'ocioso' : s.anim);
    samples[s.name] = samples[s.name] || {};
    samples[s.name][act] = (samples[s.name][act] || 0) + STEP;
    const tl = timeline[s.name] = timeline[s.name] || [];
    const last = tl[tl.length - 1];
    if (!last || last.a !== act) tl.push({ t: M.util.fmtTime(E.state.time.minute), a: act });
    const mm = minMot[s.name] = minMot[s.name] || {};
    for (const k in s.motives) {
      const v = s.motives[k];
      if (!isFinite(v)) nanFound = s.name + '.' + k;
      mm[k] = Math.min(mm[k] == null ? 999 : mm[k], Math.round(v));
    }
    if (!isFinite(s.x) || !isFinite(s.y)) nanFound = s.name + ' pos';
  }
}
const simMs = performance.now() - t0;
// let renderer draw a few frames
await new Promise((r) => setTimeout(r, 1500));
const sims = E.state.sims.map((s) => ({
  name: s.name, visitor: !!s.visitor, role: s.role, x: +s.x.toFixed(2), y: +s.y.toFixed(2), anim: s.anim, hidden: s.hidden,
  mood: Math.round(E.mood(s)), q: (s.queue || []).map((a) => a.label + ':' + a.phase).slice(0, 3),
  motives: Object.fromEntries(Object.entries(s.motives).map(([k, v]) => [k, Math.round(v)])),
  career: s.career ? s.career.track + ' L' + s.career.level : null,
}));
const top = {};
for (const k in samples) top[k] = Object.entries(samples[k]).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([a, m]) => a + ' ' + m + 'm').join(' | ');
const tl = {};
for (const k in timeline) tl[k] = timeline[k].map((e) => e.t + ' ' + e.a).join(' > ').slice(0, 2500);
return {
  hours: HOURS, simMs: Math.round(simMs), from: startTime, to: E.state.time, money: [startMoney, E.state.money],
  nanFound, errors: errors.slice(0, 10), objects: E.state.objects.length,
  notifications: (E.state.notifications || []).slice(-12).map((n) => n.text),
  activity: top, minMotives: minMot, sims, timeline: tl,
};
