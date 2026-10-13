// Drive Rita (and Caio for 2-user objects) into every interaction of every buyable object placed on the lawn;
// screenshot mid-action at speed 1 from two camera angles. Writes act-<type>-<key>-k<k>.png
import path from 'node:path';
import { mk, SHOTDIR } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'act');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M; M.main.setSpeed(0); M.engine.state.money = 1e6; M.engine.setFreeWill(false); M.engine.state.time.minute = 600; });
  const onlyArg = ctx.args.indexOf('--types') >= 0 ? ctx.args[ctx.args.indexOf('--types') + 1].split(',') : null;
  const types = await page.evaluate(() => Object.values(window.__morada.M.data.CATALOG).filter(d => d.buyable !== false && (d.interactions || []).length).map(d => d.type));
  const PAIR = { sofa_cheap: 'sit', sofa_lux: 'sit', bed_double: 'sleep', bed_lux: 'sleep', chess: 'play', hot_tub: 'soak', stereo: 'dance' };
  const results = [];
  for (const type of types) {
    if (onlyArg && !onlyArg.includes(type)) continue;
    const keys = await page.evaluate((type) => (window.__morada.M.data.CATALOG[type].interactions || []).filter(i => !i.requires || i.requires === 'thirsty' && false).map(i => i.key), type);
    for (const key of keys) {
      const r = await page.evaluate(([type, key, pair]) => {
        const M = window.__morada.M, E = M.engine, W = M.world, st = E.state;
        M.main.setSpeed(0);
        st.time.minute = 600;
        for (const o of st.objects.slice()) if (o._qa) E.sellObject(o.id);
        const hh = E.household();
        for (const s of hh) { s.queue.length = 0; s.asleep = false; s.seated = false; s.anim = 'idle'; s.hidden = false; s.atWork = false; s.bubble = null; for (const k of Object.keys(s.motives)) s.motives[k] = 20; s.motives.energy = 10; s.motives.hygiene = 10; s.motives.bladder = 0; s.motives.fun = -20; s.motives.comfort = -10; }
        let res = null;
        const def = M.data.CATALOG[type];
        if (def.wall) {
          E.buildWall('h,3,3', 1, 0); E.buildWall('h,4,3', 1, 0); E.buildWall('h,5,3', 1, 0);
          res = E.buyObject(type, 4, 3, 0);
        } else {
          for (let y = 2; y < 5 && !(res && res.ok); y++) for (let x = 2; x < 20 && !(res && res.ok); x++) if (W.canPlace(type, x, y, 0).ok) res = E.buyObject(type, x, y, 0);
        }
        if (!res || !res.ok) return { type, key, err: 'place: ' + (res && res.reason) };
        const o = res.obj; o._qa = true;
        const sz = W.rotatedSize(type, 0);
        // teleport both near the object front
        const fx = o.x, fy = o.y + sz.h;
        hh[0].x = fx; hh[0].y = fy; hh[1].x = fx + sz.w; hh[1].y = fy + 1;
        const its = E.getInteractions(hh[0].id, o.id);
        const it = its.find(i => i.key === key);
        if (!it) return { type, key, err: 'not offered', offered: its.map(i => i.key) };
        if (!it.enabled) return { type, key, err: 'disabled: ' + it.reason };
        const ok1 = E.queueInteraction(hh[0].id, o.id, key, 'player');
        const ok2 = pair === key ? E.queueInteraction(hh[1].id, o.id, key, 'player') : null;
        const users = pair === key ? hh.slice(0, 2) : hh.slice(0, 1);
        let n = 0;
        for (; n < 400; n++) { E.update(0.5); if (users.every((s) => s.queue[0] && s.queue[0].phase === 'do')) break; }
        for (let i = 0; i < 6; i++) E.update(0.5);
        M.render.setSelected(null);
        M.render.setCamera({ k: 0, x: o.x + sz.w / 2 - 0.5, z: o.y + sz.h / 2 - 0.2, dist: 8 });
        M.main.setSpeed(1);
        return { type, key, ok1, ok2, steps: n, obj: [o.x, o.y], users: users.map((s) => ({ n: s.name.split(' ')[0], x: +s.x.toFixed(2), y: +s.y.toFixed(2), f: +(s.facing % 6.283).toFixed(2), anim: s.anim, seated: s.seated, asleep: s.asleep, q: s.queue[0] ? s.queue[0].interaction + ':' + s.queue[0].phase : 'none' })) };
      }, [type, key, PAIR[type]]);
      if (!r.err) {
        await L.wait(2200);
        const clip = { x: 400, y: 160, width: 480, height: 480 };
        r.k0 = await L.shot(`${type}-${key}-k0`, clip);
        await page.evaluate(() => { const M = window.__morada.M; const c = M.render.getCamera(); M.render.setCamera({ k: 2, x: c.x, z: c.z, dist: 8 }); });
        await L.wait(500);
        r.k2 = await L.shot(`${type}-${key}-k2`, clip);
        r.after = await page.evaluate(() => window.__morada.M.engine.household().map(s => s.anim + (s.queue[0] ? ':' + s.queue[0].phase : '')));
      }
      results.push(r);
    }
  }
  return results;
}
