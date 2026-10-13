// --eval for render_check.mjs --page tools/render_gallery.html : close-ups of every object row and anim row
const OUT = '/tmp/claude-0/-home-user-iastalker/022ed161-997d-54de-8293-6b75c8c0dc6f/scratchpad/shots/';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const G = window.__gallery;
async function shot(name) { await wait(600); await window.__shot(OUT + name + '.png'); }
const rows = Math.ceil(G.types.length / 10);
const only = window.__ONLY || null;
for (let r = 0; r < rows; r++) {
  for (let half = 0; half < 2; half++) {
    if (only && only.indexOf('obj') < 0) continue;
    M.render.setCamera({ k: 0, dist: 15, x: 2 + half * 5 * G.SX + 2 * G.SX + 1, z: 2 + r * G.SY + 1 });
    await shot('gal_obj_r' + r + '_' + half);
  }
}
if (!only || only.indexOf('var') >= 0) { M.render.setCamera({ k: 0, dist: 16, x: 2 + 3.5 * G.SX, z: G.vy + 1 }); await shot('gal_variants'); }
const arows = Math.ceil(G.anims.length / 10);
for (let r = 0; r < arows; r++) {
  for (let q = 0; q < 3; q++) {
    if (only && only.indexOf('anim') < 0) continue;
    M.render.setCamera({ k: 0, dist: 11, x: 2 + q * 3.4 * G.SX + 1.2 * G.SX + 0.5, z: G.AY0 + r * 5 + 1 });
    await shot('gal_anim_r' + r + '_' + q);
  }
}
return M.render.stats();
