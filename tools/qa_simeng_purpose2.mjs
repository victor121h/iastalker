// QA: raw autonomy scores (before availability/capacity filters) for one low motive at 14:00.
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 8 });
const { E, M } = ctx;
const S = E.state;
const rita = S.sims[0], caio = S.sims[1];
while (S.time.minute < 14 * 60) E.update(0.5);
for (const s of [rita, caio]) { s.queue = []; s.hidden = false; s.atWork = false; }
rita.x = 10; rita.y = 12; caio.x = 9; caio.y = 11;
for (const k of (process.argv[2] || 'energy,comfort,fun').split(',')) {
  for (const m of M.data.MOTIVES) rita.motives[m] = 50;
  rita.motives.room = 0; rita.motives[k] = -70;
  const rows = [];
  for (const o of S.objects) {
    const d = M.data.CATALOG[o.type];
    for (const it of d.interactions) {
      if (it.auto === false) continue;
      const ads = E.debug.effectiveAds(rita, o, it);
      if (!Object.keys(ads).length) continue;
      const raw = E.debug.scoreAds(rita.motives, E.mood(rita), ads);
      const c = { x: o.x, y: o.y };
      const att = M.data.ATTENUATION[it.atten || 'medium'];
      const sc = raw / (1 + att * Math.hypot(rita.x - c.x, rita.y - c.y));
      rows.push([o.type + ':' + it.key, JSON.stringify(ads), sc.toExponential(2)]);
    }
  }
  rows.sort((a, b) => +b[2] - +a[2]);
  console.log('--', k, '-70: top raw scores'); for (const r of rows.slice(0, 8)) console.log('  ', r.join('  '));
  // social estimate
  const so = M.data.SOCIALS.kiss;
  console.log('   minScore', M.data.AUTONOMY.minScore, 'pick sample:', [0, 1, 2, 3, 4].map(() => { const c = E.debug.runAutonomy(rita, null); return c ? (c.kind === 'social' ? 'soc:' + c.so.key + ' ' + c.score.toExponential(2) : c.o.type + ':' + c.it.key + ' ' + c.score.toExponential(2)) : 'none'; }).join(' | '));
}
