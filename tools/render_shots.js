// --eval script for tools/render_check.mjs: camera/wall-mode/time sweeps with screenshots.
const OUT = window.__SHOT_DIR || '/tmp/claude-0/-home-user-iastalker/022ed161-997d-54de-8293-6b75c8c0dc6f/scratchpad/shots/';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const st = window.__demo.state;
const errs = [];
async function shot(name) { await wait(700); await window.__shot(OUT + name + '.png'); }
M.render.setCamera({ k: 0, dist: 30 });
await shot('day_k0_cut');
M.render.setCamera({ k: 1 }); await shot('day_k1_cut');
M.render.setCamera({ k: 2 }); await shot('day_k2_cut');
M.render.setCamera({ k: 3 }); await shot('day_k3_cut');
M.render.setCamera({ k: 0 });
M.render.setWallMode('up'); await shot('day_k0_up');
M.render.setWallMode('down'); await shot('day_k0_down');
M.render.setWallMode('cutaway');
st.time.minute = 1320; await wait(300); await shot('night_k0_cut');
M.render.setCamera({ k: 1 }); await shot('night_k1_cut');
st.time.minute = 1110; M.render.setCamera({ k: 0 }); await wait(300); await shot('dusk_k0_cut');
st.time.minute = 600;
M.render.setCamera({ k: 0, dist: 12, x: 9, z: 9 }); await wait(300); await shot('close_living');
M.render.setCamera({ k: 0, dist: 12, x: 14, z: 7 }); await shot('close_kitchen');
M.render.setCamera({ k: 3, dist: 11, x: 8, z: 6 }); await shot('close_bedroom');
return { stats: M.render.stats(), errs };
