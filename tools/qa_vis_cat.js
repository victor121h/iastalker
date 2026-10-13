const D = window.__morada.M.data;
return Object.values(D.CATALOG).map(d => [d.type, d.buyable !== false ? 'B' : '-', d.w + 'x' + d.h, d.model, (d.interactions||[]).map(i => i.key + ':' + i.anim + (i.requires ? '?' + i.requires : '')).join(' ')]);
