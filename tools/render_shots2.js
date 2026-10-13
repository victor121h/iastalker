const OUT = '/tmp/claude-0/-home-user-iastalker/022ed161-997d-54de-8293-6b75c8c0dc6f/scratchpad/shots/';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const st = window.__demo.state;
async function shot(name) { await wait(700); await window.__shot(OUT + name + '.png'); }
// front door from outside, walls up
M.render.setWallMode('up');
M.render.setCamera({ k: 0, dist: 10, x: 8.5, z: 13 });
await shot('door_closed');
// move the dancer next to the door so it opens
const nina = st.sims[4];
nina.x = 8; nina.y = 13.4; nina.anim = 'walk';
await wait(800); await shot('door_open');
nina.x = 7; nina.y = 15; nina.anim = 'dance';
// cutaway with selected character inside, camera k=2 (looking from north-west)
M.render.setWallMode('cutaway');
M.render.setSelected(st.sims[3].id);   // Leo at the computer
M.render.setCamera({ k: 2, dist: 16, x: 14, z: 7 });
await shot('cut_selected_k2');
M.render.setWallMode('up');
await shot('up_selected_k2');
M.render.setWallMode('cutaway');
st.time.minute = 1320;
M.render.setCamera({ k: 0, dist: 28, x: 11.5, z: 9 });
await wait(400); await shot('night2');
st.time.minute = 360; await wait(400); await shot('dawn');
st.time.minute = 600;
M.render.setCamera({ k: 3, dist: 12, x: 12, z: 6 }); await shot('bath_close');
// ghosts
M.render.showGhost('sofa_lux', 2, 10, 1, true);
M.render.showEdgeGhost(['h,2,3', 'h,3,3', 'h,4,3'], false);
M.render.showTileGhost([{ x: 18, y: 3 }, { x: 19, y: 3 }, { x: 18, y: 4 }], true);
M.render.setCamera({ k: 0, dist: 20, x: 5, z: 7 }); await shot('ghosts');
M.render.hideGhost(); M.render.hideEdgeGhost(); M.render.hideTileGhost();
// picking checks
const res = {};
const c = M.render.canvas.getBoundingClientRect();
M.render.setCamera({ k: 0, dist: 28, x: 11.5, z: 9 }); await wait(400);
const p1 = M.render.simScreenPos(st.sims[1].id);
res.pickCaio = M.render.pick(p1.clientX, p1.clientY + 40);
const pf = M.render.project(11.5, 1.0, 8.5);   // fridge body
res.pickFridge = M.render.pick(pf.clientX, pf.clientY);
const pt = M.render.project(19.5, 0, 2.5);
res.pickTile = M.render.pick(pt.clientX, pt.clientY);
res.tile = M.render.pickTile(pt.clientX, pt.clientY);
const pe = M.render.project(8.5, 0, 13.05);
res.edge = M.render.pickEdge(pe.clientX, pe.clientY);
const pe2 = M.render.project(3.0, 0, 7.4);
res.edgeGround = M.render.pickEdge(pe2.clientX, pe2.clientY);
res.stats = M.render.stats();
return res;
