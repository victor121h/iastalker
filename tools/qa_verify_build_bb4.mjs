// BB-4: move/sell an object in use while Buy mode is open (time paused). Also BB-2 cutaway variant (sim behind north wall).
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb4'); await v.help();
  const R = {};
  // cutaway default: Caio outdoors behind the north wall
  await v.ev(() => {
    const M = window.__morada.M; M.main.setSpeed(0);
    const caio = M.engine.household().find((s) => /Caio/.test(s.name));
    caio.queue.length = 0; caio.x = 12; caio.y = 5; caio.anim = 'idle';
  });
  await v.wait(1200);
  R.cutawayNorth = await v.ev(() => { const M = window.__morada.M; const out = []; for (const h of [0.6, 1.0, 1.4]) { const p = M.render.project(12.5, h, 5.5); out.push({ h, pick: M.render.pick(p.clientX, p.clientY) }); } return out; });
  R.shotNorth = await v.shot('0-caio-behind-north-wall-cutaway');
  // Rita sits on the sofa
  await v.ev(() => {
    const M = window.__morada.M;
    const caio = M.engine.household().find((s) => /Caio/.test(s.name)); caio.x = 14; caio.y = 8;
    const rita = M.engine.household().find((s) => /Rita/.test(s.name));
    const sofa = M.engine.state.objects.find((o) => o.type === 'sofa_cheap');
    rita.queue.length = 0; rita.x = 9; rita.y = 11;
    M.engine.queueInteraction(rita.id, sofa.id, 'sit', 'player');
    for (let i = 0; i < 200 && !(rita.anim === 'sit' && rita.queue[0] && rita.queue[0].phase === 'do'); i++) M.engine.update(0.5);
  });
  R.before = await v.ev(() => { const M = window.__morada.M; const r = M.engine.household().find((s) => /Rita/.test(s.name)); const so = M.engine.state.objects.find((o) => o.type === 'sofa_cheap'); return { rita: [r.x, r.y, r.anim, r.seated, r.queue.map((a) => a.label + ':' + a.phase).join('|')], sofa: [so.x, so.y, so.rot] }; });
  await v.ev(() => window.__morada.M.main.setSpeed(1)); await v.wait(300);
  await v.mode('buy'); await v.wait(500);
  // Move the sofa via the engine (same call the UI's Mover makes)
  R.move = await v.ev(() => { const M = window.__morada.M; const so = M.engine.state.objects.find((o) => o.type === 'sofa_cheap'); return M.engine.moveObject(so.id, 19, 16, 2); });
  await v.wait(800);
  R.afterMove = await v.ev(() => { const M = window.__morada.M; const r = M.engine.household().find((s) => /Rita/.test(s.name)); const so = M.engine.state.objects.find((o) => o.type === 'sofa_cheap'); return { rita: [r.x, r.y, r.anim, r.seated, r.queue.map((a) => a.label + ':' + a.phase).join('|')], sofa: [so.x, so.y, so.rot], paused: M.main.isPaused(), reasons: M.main.pauseReasons() }; });
  R.shotMoved = await v.shot('1-sofa-moved-rita-sitting-air');
  // stay 3 s real time in buy mode: still sitting?
  await v.wait(3000);
  R.after3s = await v.ev(() => { const r = window.__morada.M.engine.household().find((s) => /Rita/.test(s.name)); return [r.x, r.y, r.anim, r.seated]; });
  // back to live and let it run
  await v.mode('live'); await v.wait(2500);
  R.afterLive = await v.ev(() => { const r = window.__morada.M.engine.household().find((s) => /Rita/.test(s.name)); return [Math.round(r.x * 100) / 100, Math.round(r.y * 100) / 100, r.anim, r.seated, r.queue.map((a) => a.label + ':' + a.phase).join('|')]; });
  R.shotLive = await v.shot('2-after-live');
  return R;
}
