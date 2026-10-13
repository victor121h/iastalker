// SIM-7 visual: seed 1 default family at d8 17:20 (Rita waiting for a dance on the tile where Caio cooks).
const { M } = window.__morada;
const st = M.engine.newGame({ seed: 1 });
M.main.loadState(st, { kind: 'new' });
M.main.setSpeed(0);
const target = 8 * 1440 + 17 * 60 + 20;
let g = 0;
while (M.engine.state.time.day * 1440 + M.engine.state.time.minute < target && g++ < 100000) M.engine.update(0.5);
const S = M.engine.state;
const rita = S.sims.find((s) => s.name.startsWith('Rita'));
const caio = S.sims.find((s) => s.name.startsWith('Caio'));
M.engine.selectSim(caio.id);
M.render.setWallMode('down');
M.render.setCamera({ x: rita.x + 0.5, z: rita.y + 0.5, dist: 9, k: 0 });
await new Promise((r) => setTimeout(r, 1200));
const o = M.world.objectAt(Math.round(rita.x), Math.round(rita.y));
return { time: M.util.fmtTime(S.time.minute), day: S.time.day,
  rita: { x: rita.x, y: rita.y, anim: rita.anim, seated: rita.seated, q: rita.queue.map((a) => (a.kind === 'social' ? 's:' : '') + a.interaction + '/' + a.phase + (a.data && a.data.respond ? '(R)' : '')) },
  caio: { x: caio.x, y: caio.y, anim: caio.anim, q: caio.queue.map((a) => (a.kind === 'social' ? 's:' : '') + a.interaction + '/' + a.phase) },
  objUnderRita: o && { type: o.type, x: o.x, y: o.y, rot: o.rot } };
