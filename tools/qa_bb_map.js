const M = window.__morada.M, st = M.engine.state, W = M.world;
const rows = [];
for (let y = 0; y < st.lot.h; y++) {
  let r = '';
  for (let x = 0; x < st.lot.w; x++) {
    const o = W.objectAt(x, y);
    const f = st.lot.floors[y * st.lot.w + x];
    r += o ? (o.type[0].toUpperCase()) : (f ? '.' : ' ');
  }
  rows.push(String(y).padStart(2) + '|' + r + '|');
}
const walls = Object.keys(st.lot.walls);
const xs = [], ys = [];
for (const k of walls) { const [kind, x, y] = k.split(','); xs.push(+x); ys.push(+y); }
return { rows, wallsBounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], nWalls: walls.length, objs: st.objects.map(o => o.type + '@' + o.x + ',' + o.y + 'r' + o.rot).join(' '), rooms: W.rooms().map(r => ({ id: r.id, area: r.area, indoor: r.indoor, score: r.score })) };
