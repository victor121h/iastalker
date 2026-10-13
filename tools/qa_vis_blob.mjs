import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'blob');
  await L.dismissHelp();
  const res = [];
  for (const [type, key] of [['computer', 'play'], ['piano', 'play'], ['chess', 'play'], ['bed_single', 'sleep'], ['bathtub', 'bath']]) {
    await page.evaluate(([type, key]) => {
      const M = window.__morada.M, E = M.engine, st = E.state; M.main.setSpeed(0); E.setFreeWill(false); st.money = 1e6; st.time.minute = 600;
      for (const o of st.objects.slice()) if (o._qa) E.sellObject(o.id);
      const r = E.buyObject(type, 3, 2, 0); r.obj._qa = true;
      const s = E.household()[0]; s.queue.length = 0; s.x = 3; s.y = 4; s.motives.energy = -20; s.motives.hygiene = -20; s.motives.fun = -30;
      E.queueInteraction(s.id, r.obj.id, key, 'player');
      for (let i = 0; i < 200; i++) { E.update(0.5); if (s.queue[0] && s.queue[0].phase === 'do') break; }
      M.main.setSpeed(1);
      M.render.setCamera({ k: 0, x: 3.5, z: 3, dist: 9 });
    }, [type, key]);
    await L.wait(1500);
    const m = await page.evaluate(() => {
      const M = window.__morada.M; const chars = M.render.scene.getObjectByName('chars');
      const s = M.engine.household()[0];
      const blobs = chars.children.filter(c => c.geometry && c.geometry.type === 'CircleGeometry');
      const roots = chars.children.filter(c => c.userData && c.userData.simId === s.id);
      const root = roots[0]; const v = new THREE.Vector3();
      let hips = null; root.traverse(o => { if (!hips && /hip/i.test(o.name || '')) hips = o; });
      const hp = new THREE.Vector3(); (hips || root.children[0] || root).getWorldPosition(hp);
      const b = blobs.map(bl => bl.position).sort((a, c) => a.distanceTo(root.position) - c.distanceTo(root.position))[0];
      // body centre: average world position of all meshes in the rig
      const box = new THREE.Box3().setFromObject(root); const ctr = box.getCenter(new THREE.Vector3());
      return { anim: s.anim, root: [root.position.x.toFixed(2), root.position.z.toFixed(2)], blob: [b.x.toFixed(2), b.z.toFixed(2)], bodyCentre: [ctr.x.toFixed(2), ctr.z.toFixed(2)], offset: Math.hypot(ctr.x - b.x, ctr.z - b.z).toFixed(2) };
    });
    m.type = type;
    m.shot = await L.shot(type, { x: 390, y: 150, width: 500, height: 500 });
    res.push(m);
  }
  return res;
}
