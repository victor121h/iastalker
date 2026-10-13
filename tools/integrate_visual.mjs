// Playwright script: close-up screenshots of characters using furniture in the real game.
// node tools/integrate_visual.mjs is not standalone — run via:
//   node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_visual.mjs
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const dir = ctx.shotDir; fs.mkdirSync(dir, { recursive: true });
  const tag = ctx.W < 600 ? 'phone' : 'desk';
  const out = {};
  const shot = async (name) => { const f = path.join(dir, `vis-${tag}-${name}.png`); await page.screenshot({ path: f }); return f; };
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  // Interactions to force: [simIndex, objType, interactionKey]
  const plan = (process.env.VIS_PLAN || 'sofa_cheap:sit,toilet:use|bed_double:sleep,shower:shower|fridge_cheap:snack,tv_cheap:watch').split('|');
  let i = 0;
  for (const step of plan) {
    const pairs = step.split(',').map((s) => s.split(':'));
    const res = await ev((pairs) => {
      const M = window.__morada.M, E = M.engine, st = E.state;
      const hh = E.household();
      const info = [];
      pairs.forEach(([type, key], idx) => {
        const s = hh[idx % hh.length];
        if (!s) return;
        // bring them home if away
        const o = st.objects.find((q) => q.type === type);
        if (!o) { info.push('no ' + type); return; }
        const its = E.getInteractions(s.id, o.id) || [];
        const it = its.find((q) => q.key === key) || its.find((q) => q.enabled);
        if (!it) { info.push('no interaction on ' + type + ': ' + its.map((q) => q.key).join('/')); return; }
        E.cancelAction(s.id, s.queue[0] && s.queue[0].id);
        s.queue.length = 0;
        const ok = E.queueInteraction(s.id, o.id, it.key, 'player');
        info.push(s.name + ' ' + type + ':' + it.key + ' ' + ok);
      });
      // run until both are in 'do' or 90 min pass
      for (let t = 0; t < 180; t++) {
        E.update(0.5);
        const all = hh.slice(0, pairs.length).every((s) => s.queue[0] && s.queue[0].phase === 'do');
        if (all && t > 6) break;
      }
      E.update(0.5);
      return { info, sims: hh.map((s) => ({ n: s.name, x: s.x, y: s.y, f: +(s.facing || 0).toFixed(2), anim: s.anim, seated: s.seated, asleep: s.asleep, q: s.queue[0] && (s.queue[0].label + ':' + s.queue[0].phase) })) };
    }, pairs);
    out['plan' + i] = res;
    for (let k = 0; k < Math.min(2, res.sims.length); k++) {
      const s = res.sims[k];
      for (const rot of [0, 2]) {
        await ev(([s, rot]) => { const M = window.__morada.M; M.render.setCamera({ k: rot, x: s.x + 0.5, z: s.y + 0.5, dist: 9 }); M.render.setSelected(M.engine.household()[0].id); }, [s, rot]);
        await page.waitForTimeout(700);
        out['plan' + i + '_' + k + '_' + rot] = await shot(`p${i}-s${k}-k${rot}`);
      }
    }
    i++;
  }
  return out;
}
