const st = window.__morada.state;
const out = {};
for (const k of ['v,7,8','v,7,7','v,7,9','v,7,11','h,12,6','h,13,14','v,17,7','h,9,14','h,10,14','h,11,14']) out[k] = st.lot.walls[k] || null;
const all = Object.entries(st.lot.walls).filter(([k,v]) => v.t !== 1).map(([k,v]) => k + ':' + v.t);
const fps = await new Promise((res) => { let n = 0; const t0 = performance.now(); function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); } requestAnimationFrame(f); });
return { out, openings: all, fps };
