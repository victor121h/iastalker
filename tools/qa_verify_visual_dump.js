const M = window.__morada.M, s = window.__morada.state;
return { lot: [s.lot.w, s.lot.h], walls: s.lot.walls, objs: s.objects.map(o => [o.id, o.type, o.x, o.y, o.rot]), sims: s.sims.map(x => [x.id, x.name, x.x, x.y]), WP: M.data.WALLPAPERS.map((w,i)=>[i,w.key,w.name,w.color]) };
