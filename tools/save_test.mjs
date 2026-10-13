// Node unit tests for js/save.js (M.save). Run: node tools/save_test.mjs
// Loads util/data/world/engine/save into a vm context with a fake localStorage and a fake
// `window.claude.use()` (db + user + downloads), then checks save/load/list/export/import,
// write serialization per document, cloud failure fallbacks and offline behaviour.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL:', msg); } };

function fakeStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    _m: m,
  };
}
function fakeDb(opts = {}) {
  const docs = new Map();
  const log = { sets: 0, maxConcurrent: 0, inflight: 0, failNext: opts.failNext || 0, failCode: opts.failCode || 'unavailable' };
  const doc = (p) => ({
    id: p.split('/').pop(), path: p,
    async get() { await new Promise((r) => setTimeout(r, 5)); return { id: p.split('/').pop(), exists: docs.has(p), data: () => docs.get(p), metadata: {} }; },
    async set(body) {
      log.inflight++; log.maxConcurrent = Math.max(log.maxConcurrent, log.inflight);
      await new Promise((r) => setTimeout(r, 15));
      log.inflight--;
      if (log.failNext > 0) { log.failNext--; throw { code: log.failCode, message: 'x' }; }
      log.sets++; docs.set(p, JSON.parse(JSON.stringify(body)));
    },
    async delete() { docs.delete(p); },
  });
  const collection = (c) => ({
    path: c,
    doc: (id) => doc(c + '/' + id),
    limit() { return this; },
    async get() {
      const out = [];
      for (const [k, v] of docs) if (k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1) out.push({ id: k.split('/').pop(), exists: true, data: () => v });
      return { docs: out, size: out.length, empty: !out.length };
    },
  });
  return { db: { collection, doc }, docs, log };
}

function makeCtx({ claude, storage } = {}) {
  const ctx = { console, setTimeout, clearTimeout, Promise, JSON, Math, Date };
  ctx.window = ctx;
  ctx.localStorage = storage || fakeStorage();
  if (claude) ctx.claude = claude;
  vm.createContext(ctx);
  for (const f of ['util', 'data', 'world', 'engine', 'save']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  }
  return ctx;
}

// ------------------------------------------------------------- offline (no window.claude)
{
  const ctx = makeCtx();
  const M = ctx.M;
  const st = M.engine.newGame({ seed: 7 });
  const s0 = await M.save.init();
  ok(s0 && s0.cloud === false, 'offline: no cloud');
  const r = await M.save.save(st);
  ok(r.ok && r.where === 'local', 'offline save goes local: ' + JSON.stringify(r));
  const raw = ctx.localStorage.getItem('morada:slot1');
  ok(raw && JSON.parse(raw).v === 1 && typeof JSON.parse(raw).json === 'string', 'local mirror body shape');
  ok(JSON.parse(raw).meta.householdName === 'Família Alves' && JSON.parse(raw).meta.day === 1, 'meta fields');
  const back = await M.save.load('slot1');
  ok(back && back.householdName === st.householdName && back.sims.length === st.sims.length, 'load round trip');
  ok(back !== st, 'load returns a fresh object');
  ok(M.save.loadLocal('slot1').money === st.money, 'loadLocal');
  ok((await M.save.load('nada')) === null, 'missing slot → null');
  const list = await M.save.list();
  ok(list.length === 1 && list[0].slot === 'slot1' && list[0].where === 'local', 'list local');
  // export / import
  const txt = M.save.exportJSON(st);
  ok(JSON.parse(txt).format === 'morada-save', 'export wrapper');
  const imp = M.save.importJSON(txt);
  ok(imp && imp.sims.length === st.sims.length && imp !== st, 'import exported');
  ok(M.save.importJSON(JSON.stringify(st)).householdName === st.householdName, 'import raw state');
  ok(M.save.importJSON(raw) && M.save.importJSON(raw).money === st.money, 'import stored body');
  ok(M.save.importJSON('lixo') === null, 'import garbage');
  ok(M.save.importJSON('{"a":1}') === null, 'import wrong object');
  ok(M.save.importJSON(JSON.stringify(Object.assign({}, st, { version: 99 }))) === null, 'import newer version refused');
  ok(M.save.importJSON('') === null && M.save.importJSON(null) === null, 'import empty');
  const dl = await M.save.download(st);
  ok(dl.method === 'manual' && typeof dl.data === 'string', 'download falls back to manual text');
  // corrupted local mirror
  ctx.localStorage.setItem('morada:slot2', '{broken');
  ok((await M.save.load('slot2')) === null, 'corrupt mirror ignored');
  ok((await M.save.list()).length === 1, 'corrupt mirror not listed');
  // remove
  await M.save.remove('slot1');
  ok(ctx.localStorage.getItem('morada:slot1') === null, 'remove local');
  // the engine accepts what save restores
  const again = M.save.importJSON(txt);
  ok(M.engine.init(again) && M.engine.state.sims.length === st.sims.length, 'engine.init on imported state');
}

// ------------------------------------------------------------- localStorage throwing
{
  const bad = { get length() { throw new Error('denied'); }, key() { throw new Error('denied'); }, getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const ctx = makeCtx({ storage: bad });
  const M = ctx.M;
  const st = M.engine.newGame({ seed: 3 });
  const r = await M.save.save(st);
  ok(!r.ok && r.where === 'none', 'no storage at all → where none');
  ok((await M.save.load()) === null, 'load with throwing storage → null');
  ok(Array.isArray(await M.save.list()), 'list with throwing storage');
}

// ------------------------------------------------------------- cloud available
{
  const F = fakeDb();
  let dlCalls = 0;
  const claude = {
    use: async (name) => {
      if (name === 'db') return F.db;
      if (name === 'user') return { id: async () => 'u_test123' };
      if (name === 'downloads') return { save: async (req) => { dlCalls++; if (!req.filename.endsWith('.json') || !req.data) throw { code: 'bad_request' }; return { status: 'saved' }; } };
      return null;
    },
  };
  const ctx = makeCtx({ claude });
  const M = ctx.M;
  const st = M.engine.newGame({ seed: 11 });
  const s = await M.save.init();
  ok(s.cloud === true && s.downloads === true, 'cloud + downloads available');
  const r = await M.save.save(st);
  ok(r.ok && r.where === 'cloud', 'cloud save: ' + JSON.stringify(r));
  ok(F.docs.has('data/users/u_test123/slot1'), 'doc path data/users/<uid>/slot1');
  const body = F.docs.get('data/users/u_test123/slot1');
  ok(body.v === 1 && body.meta && body.meta.money === st.money && typeof body.json === 'string' && body.savedAt > 0, 'cloud body shape');
  ok(ctx.localStorage.getItem('morada:slot1'), 'local mirror also written');
  // serialization: burst of saves → never two writes in flight; newest wins
  st.money = 111; const p1 = M.save.save(st);
  st.money = 222; const p2 = M.save.save(st);
  st.money = 333; const p3 = M.save.save(st);
  await Promise.all([p1, p2, p3]);
  ok(F.log.maxConcurrent === 1, 'one write at a time per doc (max concurrent ' + F.log.maxConcurrent + ')');
  ok(JSON.parse(F.docs.get('data/users/u_test123/slot1').json).money === 333, 'newest body wins');
  ok(F.log.sets <= 3, 'coalesced writes (' + F.log.sets + ' sets for 4 saves)');
  // cloud newer than local → load picks cloud
  const cloudState = JSON.parse(JSON.stringify(st)); cloudState.money = 999;
  F.docs.set('data/users/u_test123/slot1', { v: 1, savedAt: Date.now() + 5000, meta: { householdName: 'X', day: 4, money: 999 }, json: JSON.stringify(cloudState) });
  const e = await M.save.loadEntry('slot1');
  ok(e && e.where === 'cloud' && e.state.money === 999, 'newest (cloud) wins on load');
  // local newer → local
  const localBody = JSON.parse(ctx.localStorage.getItem('morada:slot1'));
  localBody.savedAt = Date.now() + 99999; ctx.localStorage.setItem('morada:slot1', JSON.stringify(localBody));
  const e2 = await M.save.loadEntry('slot1');
  ok(e2 && e2.where === 'local', 'newest (local) wins on load');
  // list merges
  await M.save.save(st, 'slot2');
  const L = await M.save.list();
  ok(L.length === 2 && L.every((x) => x.where === 'both'), 'list merges cloud+local: ' + JSON.stringify(L.map((x) => x.where)));
  // downloads
  const d = await M.save.download(st);
  ok(d.ok && d.method === 'downloads' && dlCalls === 1, 'downloads.save used');
  // transient failure is retried once
  F.log.failNext = 1; F.log.failCode = 'unavailable';
  const r2 = await M.save.save(st);
  ok(r2.where === 'cloud', 'unavailable retried once');
  // quota: reported, cloud stays on
  F.log.failNext = 1; F.log.failCode = 'quota_exceeded';
  const r3 = await M.save.save(st);
  ok(r3.where === 'local' && r3.error === 'quota_exceeded' && M.save.status().cloud, 'quota → local + error, cloud kept');
  // refused write disables cloud for the visit
  F.log.failNext = 1; F.log.failCode = 'invalid_argument';
  const r4 = await M.save.save(st);
  ok(r4.where === 'local' && !M.save.status().cloud, 'invalid_argument disables cloud');
  const r5 = await M.save.save(st);
  ok(r5.ok && r5.where === 'local', 'keeps saving locally after cloud is disabled');
}

// ------------------------------------------------------------- claude.use resolving null / throwing
{
  const ctx = makeCtx({ claude: { use: async () => null } });
  const M = ctx.M;
  const st = M.engine.newGame({ seed: 5 });
  const r = await M.save.save(st);
  ok(r.where === 'local', 'use() → null falls back to local');
  const ctx2 = makeCtx({ claude: { use: () => { throw new Error('boom'); } } });
  const r2 = await ctx2.M.save.save(ctx2.M.engine.newGame({ seed: 5 }));
  ok(r2.where === 'local', 'use() throwing falls back to local');
  const ctx3 = makeCtx({ claude: { use: (n) => n === 'db' ? Promise.resolve(fakeDb().db) : Promise.resolve({ id: async () => null }) } });
  const r3 = await ctx3.M.save.save(ctx3.M.engine.newGame({ seed: 5 }));
  ok(r3.where === 'local' && !ctx3.M.save.status().cloud, 'no user id → local only');
}

console.log(`save_test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
