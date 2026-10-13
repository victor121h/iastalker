// QA eval: seed 1 default family, step to d8 17:18: Rita waits (dance request) on the counter tile where Caio then cooks.
const { M } = window.__morada;
const st = M.engine.newGame({ seed: 1 });
M.main.loadState(st, { kind: 'new' });
M.main.setSpeed(0);
const target = 8 * 1440 + 17 * 60 + 18;
let guard = 0;
while (M.engine.state.time.day * 1440 + M.engine.state.time.minute < target && guard++ < 100000) M.engine.update(0.5);
const rita = M.engine.state.sims.find((s) => s.name.startsWith('Rita'));
const caio = M.engine.state.sims.find((s) => s.name.startsWith('Caio'));
M.engine.selectSim(caio.id);
M.main.setSpeed(1);
await new Promise((r) => setTimeout(r, 300));
M.render.setCamera({ x: caio.x + 0.5, z: caio.y + 0.5, dist: 10, k: 0 });
M.render.setWallMode('down');
await new Promise((r) => setTimeout(r, 1500));
M.main.setSpeed(0);
const f = (s) => ({ x: +s.x.toFixed(2), y: +s.y.toFixed(2), anim: s.anim, q: s.queue.map((a) => (a.kind === 'social' ? 's:' : '') + a.interaction + '/' + a.phase) });
return { time: M.util.fmtTime(M.engine.state.time.minute), rita: f(rita), caio: f(caio), dist: Math.hypot(rita.x - caio.x, rita.y - caio.y).toFixed(2) };
