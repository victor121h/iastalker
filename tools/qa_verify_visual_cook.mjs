// VIS-13: cook stages props (counter stage 1, stove stage 2) + landline call prop. VIS-14: admire distance / mirror speech hand.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'cook');
  await L.dismissHelp(); await L.hideHud();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(0); const s = window.__morada.state; s.money = 99999; s.time.minute = 600; s.sims[1].x = 22; s.sims[1].y = 17; s.sims[1].queue = []; for (const k in s.sims[0].motives) s.sims[0].motives[k] = 50; s.sims[0].motives.hunger = -20; });
  await L.walls('cutaway');
  const out = {};
  out.q = await L.ev(() => { const M = window.__morada.M, s = window.__morada.state; const sim = s.sims[0]; sim.queue = []; return M.engine.queueInteraction(sim.id, 109, 'cook', 'player'); });
  for (const st of [1, 2]) {
    out['stage' + st] = await L.ev(async (st) => { const M = window.__morada.M, s = window.__morada.state; const sim = s.sims[0]; let n = 0; while (n++ < 1200 && !(sim.queue[0] && sim.queue[0].stage === st && sim.queue[0].phase === 'do')) M.engine.update(0.25); M.engine.update(1); M.main.setSpeed(1); await new Promise(r => setTimeout(r, 1200)); M.main.setSpeed(0); const a = sim.queue[0]; return { n, stage: a && a.stage, phase: a && a.phase, anim: sim.anim, pos: [sim.x, sim.y], facing: sim.facing, tgt: a && a.tgtId }; }, st);
    await L.cam({ k: 2, x: 15.5, z: 11.5, dist: 5.5 }); await L.wait(400);
    out['shot' + st] = await L.shot('stage' + st);
    await L.cam({ k: 1, x: 15.5, z: 11.5, dist: 5.5 }); await L.wait(400);
    out['shot' + st + 'b'] = await L.shot('stage' + st + '-k1');
  }
  // landline call
  out.call = await L.ev(async () => { const M = window.__morada.M, s = window.__morada.state; const sim = s.sims[0]; sim.queue = []; sim.anim = 'idle'; for (const k in sim.motives) sim.motives[k] = 50; M.engine.queueInteraction(sim.id, 125, 'call_friend', 'player'); let n = 0; while (n++ < 800 && !(sim.queue[0] && sim.queue[0].phase === 'do')) M.engine.update(0.25); M.engine.update(1); M.main.setSpeed(1); await new Promise(r => setTimeout(r, 1200)); M.main.setSpeed(0); return { anim: sim.anim, pos: [sim.x, sim.y], facing: sim.facing }; });
  await L.cam({ k: 0, x: 11.5, z: 12.5, dist: 4.5 }); await L.wait(400); out.callShot = await L.shot('call-k0');
  await L.cam({ k: 3, x: 11.5, z: 12.5, dist: 4.5 }); await L.wait(400); out.callShot3 = await L.shot('call-k3');
  return out;
}
