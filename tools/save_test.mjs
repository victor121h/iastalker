// Node unit tests for js/save.js (M.save). Run: node tools/save_test.mjs
// Loads util/data/world/engine/save into a vm context with a fake localStorage and a fake
// `window.claude.use()` (db + user + downloads), then checks save/load/list/export/import,
// write serialization per document, cloud failure fallbacks and offline behaviour; plus the QA fix round
// (CONTRACT_V2 §5): compare-before-write conflicts, forks, rolling backups, unreadable saves, active slot.
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
  const log = { sets: 0, gets: 0, maxConcurrent: 0, inflight: 0, failNext: opts.failNext || 0, failCode: opts.failCode || 'unavailable', getDelay: opts.getDelay != null ? opts.getDelay : 5 };
  const doc = (p) => ({
    id: p.split('/').pop(), path: p,
    async get() { log.gets++; await new Promise((r) => setTimeout(r, log.getDelay)); return { id: p.split('/').pop(), exists: docs.has(p), data: () => docs.has(p) ? JSON.parse(JSON.stringify(docs.get(p))) : undefined, metadata: {} }; },
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

// =====================================================================================================
// QA fix round (CONTRACT_V2 §5): conflicts, backups, unreadable saves, active slot.
// =====================================================================================================
const DOC1 = 'data/users/u_test123/slot1';
const sleepT = (ms) => new Promise((r) => setTimeout(r, ms));
function claudeFor(F, useDelay = 0) {
  return {
    use: async (name) => {
      if (useDelay) await sleepT(useDelay);
      if (name === 'db') return F.db;
      if (name === 'user') return { id: async () => 'u_test123' };
      return null;
    },
  };
}
function bodyFor(M, over, savedAt, extra) {
  const st = M.engine.newGame({ seed: 21 });
  const s = JSON.parse(JSON.stringify(st));
  Object.assign(s, over);
  return Object.assign({ v: 1, savedAt, meta: { householdName: s.householdName, day: s.time.day, money: s.money, members: 2 }, json: JSON.stringify(s) }, extra || {});
}

// ------------------------------------------------------------- slow cloud + newer cloud doc from another session (CR-3)
{
  const F = fakeDb({ getDelay: 400 });
  const storage = fakeStorage();
  const ctx = makeCtx({ claude: claudeFor(F), storage });
  const M = ctx.M;
  const now = Date.now();
  storage.setItem('morada:slot1', JSON.stringify(bodyFor(M, { money: 1111 }, now - 3600e3)));
  F.docs.set(DOC1, bodyFor(M, { money: 2222 }, now - 60e3, { sid: 'other-device' }));
  const conflicts = [];
  M.save.onConflict((c) => conflicts.push(c));
  const e = await M.save.loadEntry('slot1', { timeout: 100 });
  ok(e && e.where === 'local' && e.state.money === 1111 && e.cloudChecked === false, 'slow cloud: local entry with cloudChecked=false: ' + JSON.stringify(e && { w: e.where, c: e.cloudChecked }));
  const st = e.state; st.money = 1116;
  const r = await M.save.save(st, 'slot1');
  ok(r.ok && r.where === 'local' && r.error === 'conflict', 'guarded write refuses the newer cloud doc: ' + JSON.stringify({ w: r.where, e: r.error }));
  ok(JSON.parse(F.docs.get(DOC1).json).money === 2222, 'newer cloud doc NOT overwritten');
  ok(conflicts.length === 1 && conflicts[0].meta.money === 2222 && conflicts[0].state && conflicts[0].state.money === 2222 && conflicts[0].source === 'write', 'onConflict listener got the cloud save (meta + state)');
  ok(JSON.parse(storage.getItem('morada:slot1')).meta.money === 1116, 'local mirror still saved');
  ok(JSON.parse(storage.getItem('morada:slot1')).unverified === true, 'local body marked unverified while the conflict is open');
  const r2 = await M.save.save(st, 'slot1');
  ok(r2.error === 'conflict' && conflicts.length === 1 && F.log.sets === 0, 'cloud writes stay blocked (no duplicate notification)');
  ok(M.save.conflictOf('slot1') && M.save.conflictOf('slot1').savedAt === now - 60e3, 'conflictOf reports the pending conflict');
  ok(M.save.resolveConflict('slot1', 'keep') === true && !M.save.conflictOf('slot1'), 'resolveConflict keep');
  const r3 = await M.save.save(st, 'slot1');
  ok(r3.where === 'cloud' && JSON.parse(F.docs.get(DOC1).json).money === 1116, 'after "keep" the cloud doc is replaced');
  ok(F.docs.has(DOC1 + '-prev') && JSON.parse(F.docs.get(DOC1 + '-prev').json).money === 2222, 'replaced cloud save copied to slot1-prev');
  const L = await M.save.list();
  ok(L.length === 1 && L[0].slot === 'slot1', 'list hides -prev docs and backup keys: ' + JSON.stringify(L.map((x) => x.slot)));
}

// ------------------------------------------------------------- no local save + slow cloud (CR-1), then a "next boot" with a fast cloud (fork)
{
  const F = fakeDb({ getDelay: 300 });
  const storage = fakeStorage();
  let ctx = makeCtx({ claude: claudeFor(F), storage });
  let M = ctx.M;
  const now = Date.now();
  F.docs.set(DOC1, bodyFor(M, { money: 2222 }, now - 60e3, { sid: 'other-device' }));
  const e = await M.save.loadEntry('slot1', { timeout: 50 });
  ok(e && e.state === null && e.cloudChecked === false && !e.unreadable, 'no local + slow cloud: no state, cloudChecked=false');
  const fresh = M.engine.newGame({ seed: 4 });
  const r = await M.save.save(fresh, 'slot1');
  ok(r.where === 'local' && r.error === 'conflict' && JSON.parse(F.docs.get(DOC1).json).money === 2222, 'a new game never overwrites an unseen cloud save');
  // next page load: the cloud now answers fast; the local starter save is newer but was written without knowing the cloud
  F.log.getDelay = 5;
  ctx = makeCtx({ claude: claudeFor(F), storage });
  M = ctx.M;
  const e2 = await M.save.loadEntry('slot1');
  ok(e2 && e2.where === 'local' && e2.cloudChecked === true && e2.conflict && e2.conflict.meta.money === 2222 && e2.conflict.state.money === 2222, 'fork detected at load (conflict reported): ' + JSON.stringify(e2 && e2.conflict && e2.conflict.meta));
  const r2 = await M.save.save(e2.state, 'slot1');
  ok(r2.error === 'conflict' && JSON.parse(F.docs.get(DOC1).json).money === 2222, 'fork: cloud write blocked until the player chooses');
  M.save.resolveConflict('slot1', 'cloud');
  const r3 = await M.save.save(e2.conflict.state, 'slot1');
  ok(r3.where === 'cloud' && JSON.parse(F.docs.get(DOC1).json).money === 2222 && JSON.parse(storage.getItem('morada:slot1')).meta.money === 2222, 'after choosing the cloud, both copies hold the cloud game');
  ok(JSON.parse(storage.getItem('morada:slot1.bak')).meta.money === fresh.money, 'the discarded local game is kept in .bak');
}

// ------------------------------------------------------------- slow capability handshake; checkCloud retried later
{
  const F = fakeDb({ getDelay: 5 });
  const ctx = makeCtx({ claude: claudeFor(F, 300) });
  const M = ctx.M;
  F.docs.set(DOC1, bodyFor(M, { money: 2222 }, Date.now() - 1000, { sid: 'other-device' }));
  const e = await M.save.loadEntry('slot1', { timeout: 50 });
  ok(e.cloudChecked === false && e.state === null, 'slow handshake → cloudChecked=false');
  const c1 = await M.save.checkCloud('slot1', { timeout: 50 });
  ok(c1.checked === false && c1.pending === true, 'checkCloud times out while the handshake is pending');
  const seen = [];
  M.save.onConflict((c) => seen.push(c.source));
  const c2 = await M.save.checkCloud('slot1');
  ok(c2.checked === true && c2.exists && c2.conflict && c2.conflict.meta.money === 2222 && seen[0] === 'check', 'checkCloud later reports the newer cloud save as a conflict');
}

// ------------------------------------------------------------- fast cloud, newer doc from another session → loaded; overwrite rolls -prev
{
  const F = fakeDb();
  const storage = fakeStorage();
  const ctx = makeCtx({ claude: claudeFor(F), storage });
  const M = ctx.M;
  const now = Date.now();
  storage.setItem('morada:slot1', JSON.stringify(bodyFor(M, { money: 1111 }, now - 3600e3)));
  F.docs.set(DOC1, bodyFor(M, { money: 2222 }, now - 60e3, { sid: 'other-device' }));
  const e = await M.save.loadEntry('slot1');
  ok(e.where === 'cloud' && e.cloudChecked === true && e.state.money === 2222 && !e.conflict, 'fast cloud: newer cloud save loaded, no conflict');
  e.state.money = 2300;
  const gets = F.log.gets;
  const r = await M.save.save(e.state, 'slot1');
  ok(r.where === 'cloud' && F.log.gets === gets, 'verified slot: no extra read before writing');
  ok(JSON.parse(F.docs.get(DOC1 + '-prev').json).money === 2222, 'first overwrite of another session\'s doc copies it to -prev');
  ok(JSON.parse(storage.getItem('morada:slot1.bak')).meta.money === 1111, 'local .bak holds the previous local body');
  const sets = F.log.sets;
  await M.save.save(e.state, 'slot1');
  ok(F.log.sets === sets + 1, 'own docs are not re-copied to -prev on every save');
  // a doc written by this session is never treated as foreign
  M.save.invalidate('slot1');
  const r2 = await M.save.save(e.state, 'slot1');
  ok(r2.where === 'cloud', 'after invalidate(), our own latest doc passes the re-check');
  // another device writes meanwhile → re-check after invalidate catches it
  F.docs.set(DOC1, bodyFor(M, { money: 5555 }, Date.now() + 1000, { sid: 'other-device' }));
  M.save.invalidate();
  const r3 = await M.save.save(e.state, 'slot1');
  ok(r3.error === 'conflict' && JSON.parse(F.docs.get(DOC1).json).money === 5555, 'invalidate() + foreign newer doc → conflict, doc kept');
}

// ------------------------------------------------------------- read dedupe: a slow boot read is reused by checkCloud
{
  const F = fakeDb({ getDelay: 200 });
  const ctx = makeCtx({ claude: claudeFor(F) });
  const M = ctx.M;
  await M.save.init();
  const e = await M.save.loadEntry('slot1', { timeout: 20 });
  const c = await M.save.checkCloud('slot1');
  ok(e.cloudChecked === false && c.checked === true && c.exists === false && F.log.gets === 1, 'in-flight cloud read reused (gets=' + F.log.gets + ')');
}

// ------------------------------------------------------------- corrupt local save (CR-4): unreadable, blocked, quarantine, backup
{
  const storage = fakeStorage();
  const ctx = makeCtx({ storage });
  const M = ctx.M;
  const good = bodyFor(M, { money: 3333 }, Date.now() - 600e3);
  storage.setItem('morada:slot1', '{"v":1,"savedAt":5,"json":"{quebrado');
  storage.setItem('morada:slot1.bak', JSON.stringify(good));
  const e = await M.save.loadEntry('slot1');
  ok(e && e.state === null && e.unreadable && e.unreadable.reason === 'corrupt' && e.unreadable.where === 'local' && /quebrado/.test(e.unreadable.raw), 'corrupt save reported as unreadable (not "no save")');
  ok((await M.save.load('slot1')) === null, 'load() still resolves null for an unreadable save');
  ok(M.save.isBlocked('slot1'), 'unreadable slot is blocked');
  const st = M.engine.newGame({ seed: 9 });
  const r = await M.save.save(st, 'slot1');
  ok(!r.ok && r.error === 'blocked' && /quebrado/.test(storage.getItem('morada:slot1')), 'save() never replaces an unreadable save before quarantine');
  const b = await M.save.backupEntry('slot1');
  ok(b && b.where === 'local-bak' && b.state.money === 3333, 'backupEntry finds the .bak copy');
  ok(/quebrado/.test(M.save.rawText('slot1', 'local')), 'rawText returns the stored text');
  const q = await M.save.quarantine('slot1', e.unreadable);
  ok(q.ok && /quebrado/.test(storage.getItem('morada:slot1.broken')) && !M.save.isBlocked('slot1'), 'quarantine keeps the original in .broken and unblocks');
  const r2 = await M.save.save(b.state, 'slot1');
  ok(r2.ok && JSON.parse(storage.getItem('morada:slot1')).meta.money === 3333, 'backup restored into the slot');
}

// ------------------------------------------------------------- newer version / null entries
{
  const storage = fakeStorage();
  const ctx = makeCtx({ storage });
  const M = ctx.M;
  storage.setItem('morada:slot1', JSON.stringify(bodyFor(M, { money: 4321, version: 2 }, Date.now())));
  const e = await M.save.loadEntry('slot1');
  ok(e.unreadable && e.unreadable.reason === 'newer' && e.unreadable.meta.money === 4321, 'save from a newer version → unreadable "newer" with its meta');
  const st = JSON.parse(JSON.stringify(M.engine.newGame({ seed: 2 })));
  st.npcs.push(null); st.notifications.push(null); st.events = (st.events || []).concat([null, 7]);
  storage.setItem('morada:slot2', JSON.stringify({ v: 1, savedAt: Date.now(), meta: {}, json: JSON.stringify(st) }));
  const e2 = await M.save.loadEntry('slot2');
  ok(e2.state && e2.state.npcs.every((n) => n && typeof n === 'object') && e2.state.notifications.indexOf(null) < 0 && e2.state.events.every((x) => x && typeof x === 'object'), 'null / non-object entries stripped');
  let initOk = false; try { M.engine.init(e2.state); initOk = true; } catch (x) { initOk = false; }
  ok(initOk, 'engine.init accepts the cleaned save');
}

// ------------------------------------------------------------- unreadable cloud doc newer than the local copy
{
  const F = fakeDb();
  const storage = fakeStorage();
  const ctx = makeCtx({ claude: claudeFor(F), storage });
  const M = ctx.M;
  storage.setItem('morada:slot1', JSON.stringify(bodyFor(M, { money: 1111 }, Date.now() - 3600e3)));
  F.docs.set(DOC1, bodyFor(M, { money: 7777, version: 2 }, Date.now() - 1000, { sid: 'other-device' }));
  const e = await M.save.loadEntry('slot1');
  ok(e.unreadable && e.unreadable.where === 'cloud' && e.unreadable.reason === 'newer' && e.backup && e.backup.state.money === 1111, 'unreadable newer cloud doc → recovery with the local copy as backup');
  const r = await M.save.save(e.backup.state, 'slot1');
  ok(r.error === 'blocked' && JSON.parse(F.docs.get(DOC1).json).version === 2, 'cloud doc untouched while blocked');
  await M.save.quarantine('slot1', e.unreadable);
  ok(F.docs.has(DOC1 + '-broken') && JSON.parse(F.docs.get(DOC1 + '-broken').json).version === 2, 'quarantine copies the cloud doc to slot1-broken');
  const r2 = await M.save.save(e.backup.state, 'slot1');
  ok(r2.where === 'cloud' && JSON.parse(F.docs.get(DOC1).json).money === 1111, 'after quarantine the slot saves normally');
}

// ------------------------------------------------------------- active slot, labels, timestamps, explicit replace
{
  const F = fakeDb();
  const storage = fakeStorage();
  const ctx = makeCtx({ claude: claudeFor(F), storage });
  const M = ctx.M;
  ok(M.save.activeSlot() === null, 'no active slot stored yet');
  M.save.setActiveSlot('slot2');
  ok(storage.getItem('morada:activeSlot') === 'slot2' && M.save.activeSlot() === 'slot2', 'active slot persisted in morada:activeSlot');
  storage.setItem('morada:activeSlot', '../evil');
  ok(M.save.activeSlot() === null, 'invalid active slot ignored');
  ok(M.save.slotLabel('slot3') === 'Espaço 3' && M.save.slotLabel('meu') === 'meu', 'slotLabel');
  const st = M.engine.newGame({ seed: 1 });
  const a = await M.save.save(st, 'slot1'), b = await M.save.save(st, 'slot1');
  ok(b.savedAt > a.savedAt, 'savedAt strictly increasing');
  ok((await M.save.list()).every((x) => x.slot !== 'activeSlot'), 'list ignores morada:activeSlot');
  // explicit "Salvar aqui" over a cloud save that the list showed
  F.docs.set('data/users/u_test123/slot3', bodyFor(M, { money: 9999 }, Date.now() - 5000, { sid: 'other-device' }));
  await M.save.list();
  const r = await M.save.save(st, 'slot3', { replace: true });
  ok(r.where === 'cloud' && JSON.parse(F.docs.get('data/users/u_test123/slot3').json).money === st.money, 'replace: a listed cloud save can be overwritten on purpose');
  ok(JSON.parse(F.docs.get('data/users/u_test123/slot3-prev').json).money === 9999, 'replace: the overwritten save goes to slot3-prev');
  const lin = M.save.lineage('slot1');
  ok(lin.base === b.savedAt && Array.isArray(lin.known), 'lineage() exposes base/known for the hot snapshot');
}

// ------------------------------------------------------------- offline visit forks from a cloud game advanced elsewhere
{
  const F = fakeDb();
  const storage = fakeStorage();
  // visit 1: online, loads + saves (synced)
  let M = makeCtx({ claude: claudeFor(F), storage }).M;
  const st = M.engine.newGame({ seed: 30 });
  const s1 = await M.save.save(st, 'slot1');
  ok(s1.where === 'cloud' && !JSON.parse(storage.getItem('morada:slot1')).unverified, 'online save → body not marked unverified');
  // visit 2: offline (no capability), the game goes on locally
  M = makeCtx({ storage }).M;
  const e = await M.save.loadEntry('slot1');
  e.state.money = 4444;
  await M.save.save(e.state, 'slot1');
  ok(JSON.parse(storage.getItem('morada:slot1')).unverified === true, 'offline save → body marked unverified');
  // meanwhile another device advanced the cloud game
  F.docs.set(DOC1, bodyFor(M, { money: 8888 }, Date.now() - 10, { sid: 'other-device', base: s1.savedAt }));
  // the local copy is newer but forked → ask
  await sleepT(20);
  M = makeCtx({ claude: claudeFor(F), storage }).M;
  const st2 = M.engine.newGame({ seed: 30 }); st2.money = 4500;
  storage.setItem('morada:slot1', JSON.stringify(Object.assign(JSON.parse(storage.getItem('morada:slot1')), { savedAt: Date.now() })));
  const e2 = await M.save.loadEntry('slot1');
  ok(e2.where === 'local' && e2.conflict && e2.conflict.meta.money === 8888, 'offline fork vs newer cloud progress → conflict at load');
  // no fork: the cloud doc is the one the local game came from
  F.docs.set(DOC1, JSON.parse(JSON.stringify(F.docs.get(DOC1))));
  const F2 = fakeDb();
  const storage2 = fakeStorage();
  let M2 = makeCtx({ claude: claudeFor(F2), storage: storage2 }).M;
  const a = await M2.save.save(M2.engine.newGame({ seed: 31 }), 'slot1');
  M2 = makeCtx({ storage: storage2 }).M;
  const e3 = await M2.save.loadEntry('slot1');
  await M2.save.save(e3.state, 'slot1');
  M2 = makeCtx({ claude: claudeFor(F2), storage: storage2 }).M;
  const e4 = await M2.save.loadEntry('slot1');
  ok(e4.where === 'local' && !e4.conflict && a.where === 'cloud', 'offline progress on top of the synced cloud save → no false conflict');
}

console.log(`save_test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
