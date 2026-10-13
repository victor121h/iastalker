// Playwright script: buys hobby/plumbing objects on the lawn and screenshots characters using them
// (pose alignment of seated/lying anims on objects the starter house does not have).
// node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_hobbies.mjs
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const dir = ctx.shotDir; fs.mkdirSync(dir, { recursive: true });
  const ev = (fn, a) => page.evaluate(fn, a);
  const out = {};
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); window.__morada.M.main.setSpeed(0); window.__morada.M.engine.state.money = 100000; window.__morada.M.engine.setFreeWill(false); });
  const plan = [
    ['computer', 'play', null],
    ['piano', 'play', null],
    ['chess', 'play', 'play'],
    ['exercise', 'workout', null],
    ['easel', 'paint', null],
    ['bathtub', 'bath', null],
    ['hot_tub', 'soak', 'soak'],
    ['armchair', 'nap', null],
    ['bed_single', 'sleep', null],
    ['stereo', 'dance', 'dance'],
    ['arcade', 'play', null],
    ['mirror', 'speech', null],
  ];
  for (const [type, key, key2] of plan) {
    const r = await ev(([type, key, key2]) => {
      const M = window.__morada.M, E = M.engine, W = M.world, st = E.state;
      // clean previous test objects
      M.main.setSpeed(0);
      for (const o of st.objects.slice()) if (o._test) E.sellObject(o.id);
      for (const s of E.household()) { s.queue.length = 0; s.asleep = false; s.seated = false; s.anim = 'idle'; s.hidden = false; s.atWork = false; }
      let res = null;
      if (type === 'mirror') {
        // on the outside of the north wall of the house? use a fresh wall on the lawn
        E.buildWall('h,3,4', 1, 0); E.buildWall('h,4,4', 1, 0);
        res = E.buyObject('mirror', 3, 4, 0);
      } else {
        for (let y = 2; y < 6 && !(res && res.ok); y++) for (let x = 2; x < 20 && !(res && res.ok); x++) if (W.canPlace(type, x, y, 0).ok) res = E.buyObject(type, x, y, 0);
      }
      if (!res || !res.ok) return { type, err: res && res.reason };
      res.obj._test = true;
      const hh = E.household();
      const its = E.getInteractions(hh[0].id, res.obj.id).map((i) => i.key + (i.enabled ? '' : '(x:' + i.reason + ')'));
      const ok1 = E.queueInteraction(hh[0].id, res.obj.id, key, 'player');
      const ok2 = key2 ? E.queueInteraction(hh[1].id, res.obj.id, key2, 'player') : null;
      const users = key2 ? hh.slice(0, 2) : hh.slice(0, 1);
      for (let i = 0; i < 300; i++) { E.update(0.5); if (users.every((s) => s.queue[0] && s.queue[0].phase === 'do')) break; }
      for (let i = 0; i < 4; i++) E.update(0.5);
      const o = res.obj;
      M.render.setCamera({ k: 0, x: o.x + 1, z: o.y + 1, dist: 8 });
      M.render.setSelected(null);
      M.main.setSpeed(1);            // render animation time only runs while the game runs (pose blends)
      return { type, at: [o.x, o.y], its, ok1, ok2, users: users.map((s) => ({ x: +s.x.toFixed(2), y: +s.y.toFixed(2), f: +s.facing.toFixed(2), anim: s.anim, seated: s.seated, asleep: s.asleep, q: s.queue[0] && s.queue[0].label + ':' + s.queue[0].phase })) };
    }, [type, key, key2]);
    await page.waitForTimeout(1000);
    const f = path.join(dir, `hob-${type}.png`);
    await page.screenshot({ path: f, clip: { x: 340, y: 120, width: 600, height: 520 } });
    r.shot = f;
    out[type] = r;
  }
  return out;
}
