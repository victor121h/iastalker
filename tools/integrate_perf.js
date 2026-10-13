// --eval: frame timing over 5 s of real play at speed 3, plus checks for pathological per-frame work
// (full mesh resyncs, geometry/texture leaks, DOM churn).
const M = window.__morada.M, R = M.render, E = M.engine, U = M.ui;
const b = document.getElementById('help-ok'); if (b) b.click();
M.main.setSpeed(+(window.__perfSpeed || 3));
const wrap = (obj, name, bucket) => {
  const f = obj[name];
  obj[name] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { bucket.ms += performance.now() - t; bucket.n++; } };
  return () => { obj[name] = f; };
};
const B = { render: { ms: 0, n: 0 }, engine: { ms: 0, n: 0 }, ui: { ms: 0, n: 0 }, syncObjects: { ms: 0, n: 0 }, syncLot: { ms: 0, n: 0 }, syncCharacters: { ms: 0, n: 0 } };
const un = [wrap(R, 'frame', B.render), wrap(E, 'update', B.engine), wrap(U, 'update', B.ui)];
// internal sync calls go through the module-local functions; count via the bus-driven exports where possible
const geo0 = R.stats();
let mut = 0;
const mo = new MutationObserver((l) => { mut += l.length; });
mo.observe(document.getElementById('hud') || document.body, { subtree: true, childList: true, attributes: true, characterData: true });
const frames = [];
let last = performance.now();
const t0 = last;
await new Promise((resolve) => {
  function tick(ts) {
    frames.push(ts - last); last = ts;
    if (ts - t0 < 5000) requestAnimationFrame(tick); else resolve();
  }
  requestAnimationFrame(tick);
});
mo.disconnect();
un.forEach((f) => f());
const geo1 = R.stats();
frames.shift();
frames.sort((a, b) => a - b);
const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
const per = (k) => B[k].n ? +(B[k].ms / B[k].n).toFixed(2) : 0;
return {
  frames: frames.length, avgFrameMs: +avg.toFixed(1), p50: +frames[Math.floor(frames.length / 2)].toFixed(1), p95: +frames[Math.floor(frames.length * 0.95)].toFixed(1),
  jsPerFrameMs: { render: per('render'), engineCallsPerFrame: +(B.engine.n / frames.length).toFixed(1), enginePerCall: per('engine'), ui: per('ui') },
  geometriesBefore: geo0.geometries, geometriesAfter: geo1.geometries, textures: [geo0.textures, geo1.textures],
  drawCalls: geo1.calls, triangles: geo1.triangles, domMutationsPerFrame: +(mut / frames.length).toFixed(1),
  speed: M.main.getSpeed(), factor: M.main.speedFactor(), simTime: M.util.fmtTime(E.state.time.minute),
  canvas: [R.canvas.width, R.canvas.height], dpr: window.devicePixelRatio,
};
