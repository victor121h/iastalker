const M = window.__morada.M, s = window.__morada.state;
const walls = Object.entries(s.lot.walls).map(([k,v]) => k+':'+v.t).join(' ');
return { objs: s.objects.map(o => [o.id, o.type, o.x, o.y, o.rot]), sims: s.sims.map(x => [x.id, x.name, x.x, x.y, x.anim]), walls, time: s.time, lot: [s.lot.w, s.lot.h] };
