// QA fuzz: random player commands, socials, walks, cancels, buy/sell/move and walls during 7 days, with throwErrors.
import { boot, monitor, summarize } from './qa_simeng_lib.mjs';
const seed = +(process.argv[2] || 1);
const ctx = boot({ seed });
const { E, M } = ctx;
let r = seed * 7919 >>> 0;
const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const counts = { cmd: 0, cmdOk: 0, soc: 0, walk: 0, cancel: 0, buy: 0, sell: 0, move: 0, wall: 0 };
const buyables = M.data.CATALOG_LIST.filter((d) => d.buyable !== false).map((d) => d.type);
const R = monitor(ctx, { days: 7, label: 'fuzz seed ' + seed, onStep: (c, i) => {
  if (i % 37 !== 0) return;
  const S = E.state;
  const hh = S.sims.filter((s) => !s.visitor && !s.hidden);
  if (!hh.length) return;
  const sim = pick(hh);
  const x = rnd();
  if (x < 0.45) {
    const o = pick(S.objects);
    const its = E.getInteractions(sim.id, o.id).filter((it) => it.enabled);
    if (its.length) { counts.cmd++; if (E.queueInteraction(sim.id, o.id, pick(its).key, 'player')) counts.cmdOk++; }
  } else if (x < 0.6) {
    const t = pick(S.sims.filter((s) => s !== sim && !s.hidden));
    if (t) { const so = E.getSocials(sim.id, t.id).filter((q) => q.enabled); if (so.length) { counts.soc++; E.queueSocial(sim.id, t.id, pick(so).key, 'player'); } }
  } else if (x < 0.7) { counts.walk++; E.queueWalk(sim.id, Math.floor(rnd() * S.lot.w), Math.floor(rnd() * S.lot.h)); }
  else if (x < 0.8) { const a = pick(sim.queue); if (a) { counts.cancel++; E.cancelAction(sim.id, a.id); } }
  else if (x < 0.87) { const t = pick(buyables); const res = E.buyObject(t, Math.floor(rnd() * S.lot.w), Math.floor(rnd() * S.lot.h), Math.floor(rnd() * 4)); if (res.ok) counts.buy++; }
  else if (x < 0.92) { const o = pick(S.objects); if (o && E.sellObject(o.id).ok) counts.sell++; }
  else if (x < 0.97) { const o = pick(S.objects); if (o && E.moveObject(o.id, Math.floor(rnd() * S.lot.w), Math.floor(rnd() * S.lot.h), Math.floor(rnd() * 4)).ok) counts.move++; }
  else { const k = (rnd() < 0.5 ? 'h,' : 'v,') + Math.floor(rnd() * S.lot.w) + ',' + Math.floor(rnd() * S.lot.h); if (E.buildWall(k, 1 + Math.floor(rnd() * 3), 0).ok) counts.wall++; }
} });
console.log(JSON.stringify(counts));
if (process.argv.includes('--bad')) { const g = {}; for (const n of ctx.notes.filter((n) => n.kind === 'bad')) { const k = n.text.replace(/[0-9.]+/g, '#'); g[k] = (g[k] || 0) + 1; } console.log('BADNOTES', JSON.stringify(Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 15), null, 1)); }
console.log(summarize(ctx, R).split('\n').filter((l) => /####|EXC|NaN|anomalies|money|     \{/.test(l)).slice(0, 30).join('\n'));
