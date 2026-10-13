// QA eval: seed 5 default family, step to d4 18:24 where Rita responds to a dance while standing inside the sofa.
const { M } = window.__morada;
const st = M.engine.newGame({ seed: 5 });
M.main.loadState(st, { kind: 'new' });
M.main.setSpeed(0);
const target = 4 * 1440 + 18 * 60 + 24;
let guard = 0;
while (M.engine.state.time.day * 1440 + M.engine.state.time.minute < target && guard++ < 100000) M.engine.update(0.5);
const rita = M.engine.state.sims.find((s) => s.name.startsWith('Rita'));
const caio = M.engine.state.sims.find((s) => s.name.startsWith('Caio'));
M.engine.selectSim(rita.id);
M.main.setSpeed(1);
await new Promise((r) => setTimeout(r, 300));
M.render.setCamera({ x: rita.x + 0.5, z: rita.y + 0.5, dist: 11, k: 0 });
M.render.setWallMode('down');
await new Promise((r) => setTimeout(r, 1500));
M.main.setSpeed(0);
const r2 = M.engine.state.sims.find((s) => s.name.startsWith('Rita'));
return { time: M.util.fmtTime(M.engine.state.time.minute), rita: { x: r2.x, y: r2.y, anim: r2.anim, q: r2.queue.map((a) => a.interaction + '/' + a.phase) }, caio: { x: caio.x, y: caio.y, anim: caio.anim }, objAtRita: (M.world.objectAt(Math.round(r2.x), Math.round(r2.y)) || {}).type };
