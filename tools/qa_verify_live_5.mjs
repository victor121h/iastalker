// Verify LIVE-5: wall-mounted objects (paintings / mirror) on interior walls in cutaway mode.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_verify_live_5.mjs
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l5');
  const out = { objs: null, matrix: {} };
  await V.speed(0);
  out.objs = await V.ev(() => {
    const M = window.__morada.M, E = M.engine;
    return E.state.objects.filter((o) => (M.data.CATALOG[o.type] || {}).wall).map((o) => {
      const edge = o.rot === 0 ? 'h,' + o.x + ',' + o.y : o.rot === 1 ? 'v,' + (o.x + 1) + ',' + o.y : o.rot === 2 ? 'h,' + o.x + ',' + (o.y + 1) : 'v,' + o.x + ',' + o.y;
      const tiles = M.world.edgeTiles ? M.world.edgeTiles(edge) : null;
      const indoorBoth = tiles ? tiles.every((t) => M.world.isIndoor(t.x, t.y)) : null;
      return { id: o.id, type: o.type, x: o.x, y: o.y, rot: o.rot, edge, interiorWall: indoorBoth };
    });
  });
  for (const mode of ['cutaway', 'up']) {
    for (const k of [0, 1, 2, 3]) {
      await V.ev(([mode, k]) => { const M = window.__morada.M; M.render.setWallMode(mode); M.render.setCamera({ k, dist: 26 }); }, [mode, k]);
      for (const o of out.objs) {
        await V.ev(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [o.x, o.y]);
        await V.speed(1); await V.wait(700); await V.speed(0);
        const vis = await V.ev((id) => {
          const M = window.__morada.M; let vis = null;
          M.render.scene.traverse((n) => { if (vis === null && n.userData && n.userData.objId === id) { let p = n, v = true; while (p) { if (p.visible === false) v = false; p = p.parent; } vis = v; } });
          return vis;
        }, o.id);
        const pt = await V.objFind(o.id);
        out.matrix[o.type + '#' + o.id + ' ' + mode + '/k' + k] = (vis ? 'visible' : 'HIDDEN') + ', ' + (pt ? 'clickable' : 'NOT clickable');
        if (k === 0 && o.type.startsWith('painting')) await V.shot(o.type + '-' + mode + '-k' + k);
      }
    }
  }
  // real click on the painting in cutaway k0 (tile front of it) -> what pie opens?
  const p = out.objs.find((o) => o.type.startsWith('painting'));
  if (p) {
    await V.ev(() => { const M = window.__morada.M; M.render.setWallMode('cutaway'); M.render.setCamera({ k: 0, dist: 26 }); });
    await V.ev(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [p.x, p.y]);
    await V.speed(1); await V.wait(700); await V.speed(0);
    const sp = await V.ev(([x, y]) => { const M = window.__morada.M; const q = M.render.project(x + 0.5, 0.3, y + 0.5); const pk = M.render.pick(q.clientX, q.clientY); return { x: q.clientX, y: q.clientY, pick: pk && (pk.kind === 'object' ? M.engine.objectById(pk.id).type : pk.kind) }; }, [p.x, p.y]);
    out.cutawayPaintingTilePick = sp;
  }
  return out;
}
