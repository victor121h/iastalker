// In-house interactions in the starter house: drive Rita/Caio with engine queueing, step until 'do', screenshot.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'house');
  await L.dismissHelp();
  await page.evaluate(() => { const M = window.__morada.M; M.main.setSpeed(0); M.engine.setFreeWill(false); M.engine.state.money = 1e5; });
  const hideHud = ctx.args.includes('--hud') ? false : true;
  if (hideHud) await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; });
  // [label, simIndex, objType, key, minute, cam k]
  const plan = [
    ['sofa-tv', 0, 'tv_cheap', 'watch', 600, 0],
    ['sofa-tv-k1', 0, 'tv_cheap', 'watch', 600, 1],
    ['sofa-sit', 1, 'sofa_cheap', 'sit', 600, 0],
    ['read', 0, 'bookshelf', 'read', 600, 0],
    ['bed-sleep', 0, 'bed_double', 'sleep', 1350, 0],
    ['bed-sleep-k2', 1, 'bed_double', 'sleep', 1350, 2],
    ['toilet', 0, 'toilet', 'use', 600, 0],
    ['toilet-k3', 0, 'toilet', 'use', 600, 3],
    ['shower', 1, 'shower', 'shower', 600, 0],
    ['sink', 0, 'sink', 'wash', 600, 0],
    ['mirror', 0, 'mirror', 'speech', 600, 0],
    ['fridge-snack', 1, 'fridge_cheap', 'snack', 600, 0],
    ['fridge-snack-k3', 1, 'fridge_cheap', 'snack', 600, 3],
    ['cook', 0, 'fridge_cheap', 'cook', 1080, 0],
    ['phone', 1, 'phone', 'call_friend', 600, 0],
    ['chair', 0, 'chair_wood', 'sit', 600, 0],
    ['chair-k2', 0, 'chair_wood', 'sit', 600, 2],
    ['plant', 0, 'plant_small', 'water', 600, 0],
    ['lamp', 1, 'lamp_floor', 'toggle', 1320, 0],
  ];
  const only = ctx.args.indexOf('--only') >= 0 ? ctx.args[ctx.args.indexOf('--only') + 1].split(',') : null;
  const out = [];
  for (const [label, si, type, key, minute, k] of plan) {
    if (only && !only.includes(label)) continue;
    const r = await page.evaluate(([label, si, type, key, minute]) => {
      const M = window.__morada.M, E = M.engine, st = E.state;
      M.main.setSpeed(0);
      st.time.minute = minute;
      const hh = E.household();
      for (const s of hh) { s.queue.length = 0; s.asleep = false; s.seated = false; s.anim = 'idle'; s.hidden = false; s.atWork = false; s.bubble = null; for (const kk of Object.keys(s.motives)) s.motives[kk] = 10; s.motives.energy = -20; s.motives.fun = -30; s.motives.hygiene = -20; s.motives.bladder = -20; }
      // park the non-acting sim out of the way
      const sim = hh[si], other = hh[1 - si];
      other.x = 3; other.y = 16;
      sim.x = 10; sim.y = 12;
      const objs = st.objects.filter(o => o.type === type);
      if (type === 'plant_small') objs.forEach(o => { o.water = 5; });
      const o = objs[0];
      if (!o) return { label, err: 'no obj' };
      const its = E.getInteractions(sim.id, o.id);
      const it = its.find(i => i.key === key);
      if (!it || !it.enabled) return { label, err: 'n/a', its: its.map(i => i.key + (i.enabled ? '' : '(x)')) };
      E.queueInteraction(sim.id, o.id, key, 'player');
      let n = 0, phase = '';
      for (; n < 1200; n++) { E.update(0.5); const a = sim.queue[0]; phase = a ? a.interaction + ':' + a.phase + (a.stage != null ? ':' + a.stage : '') : 'none'; if (a && a.phase === 'do' && (key !== 'cook' || n > 200 && sim.anim === 'cook')) break; }
      for (let i = 0; i < 4; i++) E.update(0.5);
      E.selectSim(sim.id);
      M.render.setSelected(sim.id);
      return { label, n, phase, sim: { n: sim.name, x: +sim.x.toFixed(2), y: +sim.y.toFixed(2), f: +sim.facing.toFixed(2), anim: sim.anim, seated: sim.seated, asleep: sim.asleep } };
    }, [label, si, type, key, minute]);
    if (!r.err) {
      await page.evaluate(([k, x, y]) => { const M = window.__morada.M; M.render.setCamera({ k, x: x + 0.5, z: y + 0.5, dist: 10 }); M.main.setSpeed(1); }, [k, r.sim.x, r.sim.y]);
      await L.wait(2300);
      r.shot = await L.shot(label, { x: 340, y: 150, width: 600, height: 500 });
    }
    out.push(r);
  }
  return out;
}
