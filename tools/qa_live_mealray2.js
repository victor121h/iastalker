const M = window.__morada.M;
const g = M.models.build('meal', { servings: 3 });
const out = [];
g.traverse((m) => { if (m.isMesh) { const geo = m.geometry; out.push({ kind: m.userData.kind, side: m.material && m.material.side, idx: !!geo.index, count: geo.attributes.position.count, bs: geo.boundingSphere && { c: geo.boundingSphere.center.toArray().map(v=>+v.toFixed(2)), r: +geo.boundingSphere.radius.toFixed(2) }, bb: geo.boundingBox && [geo.boundingBox.min.toArray().map(v=>+v.toFixed(2)), geo.boundingBox.max.toArray().map(v=>+v.toFixed(2))], drawRange: geo.drawRange, groups: geo.groups.length }); } });
// raycast straight down onto a standalone meal
const scene = new THREE.Scene(); scene.add(g); g.updateMatrixWorld(true);
const rc = new THREE.Raycaster(new THREE.Vector3(0.5, 5, 0.5), new THREE.Vector3(0, -1, 0));
const hits = rc.intersectObject(g, true);
const rc2 = new THREE.Raycaster(new THREE.Vector3(0.5, 5, 3), new THREE.Vector3(0, -1, -0.5).normalize());
return { out, hitsDown: hits.map(h => [h.object.userData.kind, +h.point.y.toFixed(3)]), hitsAngled: rc2.intersectObject(g, true).map(h => [h.object.userData.kind, +h.point.y.toFixed(3)]) };
