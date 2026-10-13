import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'band2');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(1); M.engine.state.time.minute = 1350; });
  await L.cam({ k: 0, x: 6.5, z: 12.5, dist: 10 });
  await L.wait(1200);
  const clip = { x: 340, y: 150, width: 600, height: 500 };
  const out = {};
  out.base = await L.shot('base', clip);
  out.info = await page.evaluate(() => { const R = window.__morada.M.render; const r = R.renderer; return { tm: r.toneMapping, enc: r.outputEncoding, phys: r.physicallyCorrectLights, dpr: r.getPixelRatio(), ctxAttr: r.getContext().getContextAttributes() }; });
  await page.evaluate(() => { const r = window.__morada.M.render.renderer; r.shadowMap.enabled = false; r.getContext(); window.__morada.M.render.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } }); });
  await L.wait(800);
  out.noshadow = await L.shot('noshadow', clip);
  await page.evaluate(() => { const r = window.__morada.M.render.renderer; r.shadowMap.enabled = true; r.toneMapping = THREE.NoToneMapping; window.__morada.M.render.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } }); });
  await L.wait(800);
  out.notone = await L.shot('notone', clip);
  await page.evaluate(() => { const r = window.__morada.M.render.renderer; r.toneMapping = THREE.ACESFilmicToneMapping; const lights = window.__morada.M.render.scene.getObjectByName('lights').children; lights.forEach((l, i) => { if (i !== 3) l.visible = false; }); window.__morada.M.render.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } }); });
  await L.wait(800);
  out.onelight = await L.shot('onelight', clip);
  return out;
}
