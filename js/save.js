(function (M) {
  'use strict';

  // ===========================================================================
  // M.save — serialize / restore the game state.
  //
  // Storage layers (both optional, the game keeps working without either):
  //  1. Cloud: the artifact `db` capability, one private document per slot under
  //     the viewer's own subtree: db.collection('data/users/' + uid).doc(slot)
  //     body { v: 1, savedAt, meta: { householdName, day, money }, json }.
  //  2. Local mirror: localStorage key 'morada:<slot>' holding the same body.
  //
  // Cloud writes are serialized per document (one write in flight; a newer save
  // requested meanwhile replaces the queued one). Nothing here ever blocks the
  // first paint: init() resolves capabilities in the background and every call
  // degrades to localStorage when the cloud is missing, slow or refuses.
  // ===========================================================================

  const PREFIX = 'morada:';
  const DEFAULT_SLOT = 'slot1';
  const FORMAT = 'morada-save';
  const VERSION = 1;
  const MAX_CLOUD_BYTES = 250 * 1024;     // db documents are limited to 256 KiB
  const INIT_WAIT_SAVE = 4000;            // ms a save waits for capabilities before going local-only
  const INIT_WAIT_LOAD = 1200;            // ms a load waits for capabilities
  const CLOUD_READ_WAIT = 2500;           // ms a cloud read may take

  const caps = {
    ready: false,          // init finished (with or without capabilities)
    db: null, user: null, downloads: null,
    uid: null,
    cloudOff: false,       // disabled for the rest of this visit (refused / revoked)
    cloudReason: '',
    lastSave: null,        // { slot, where, savedAt, error }
    lastLoad: null,        // { slot, where, savedAt }
  };
  let initPromise = null;
  const writeQueues = {};  // slot -> { busy, pending, waiters }

  // ------------------------------------------------------------------ helpers
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function withTimeout(p, ms, fallback) {
    return new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve(fallback); } }, ms);
      Promise.resolve(p).then(
        (v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } },
        () => { if (!done) { done = true; clearTimeout(t); resolve(fallback); } });
    });
  }
  function safeSlot(slot) {
    const s = String(slot == null || slot === '' ? DEFAULT_SLOT : slot).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 40);
    return s || DEFAULT_SLOT;
  }
  function errCode(e) {
    if (e && typeof e === 'object' && typeof e.code === 'string') return e.code;
    return 'unavailable';
  }
  function num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }

  function storage() {
    try { return window.localStorage || null; } catch (e) { return null; }
  }
  function lsGet(key) {
    try { const ls = storage(); return ls ? ls.getItem(key) : null; } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { const ls = storage(); if (!ls) return false; ls.setItem(key, val); return true; } catch (e) { return false; }
  }
  function lsRemove(key) {
    try { const ls = storage(); if (ls) ls.removeItem(key); } catch (e) { /* ignore */ }
  }
  function lsKeys() {
    const out = [];
    try {
      const ls = storage();
      if (!ls) return out;
      for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.indexOf(PREFIX) === 0) out.push(k); }
    } catch (e) { /* ignore */ }
    return out;
  }

  // ------------------------------------------------------------- validation
  /** Checks that a parsed object looks like a Morada state. Returns the object (normalized) or null. */
  function validateState(st) {
    if (!st || typeof st !== 'object' || Array.isArray(st)) return null;
    if (st.version != null && num(st.version, 0) > VERSION) return null;       // made by a newer version
    if (st.version != null && num(st.version, 0) < 1) return null;
    if (!st.time || typeof st.time !== 'object') return null;
    if (!isFinite(+st.time.day) || !isFinite(+st.time.minute)) return null;
    if (!st.lot || typeof st.lot !== 'object' || !(+st.lot.w > 0) || !(+st.lot.h > 0)) return null;
    if (+st.lot.w > 128 || +st.lot.h > 128) return null;
    if (!Array.isArray(st.sims) || !Array.isArray(st.objects)) return null;
    if (st.version == null) st.version = VERSION;
    if (!isFinite(+st.money)) st.money = 0;
    if (!st.settings || typeof st.settings !== 'object') st.settings = {};
    return st;
  }
  function metaOf(state) {
    const st = state || {};
    const members = Array.isArray(st.sims) ? st.sims.filter((s) => s && !s.visitor).length : 0;
    return {
      householdName: String(st.householdName || 'Família').slice(0, 60),
      day: Math.max(1, Math.round(num(st.time && st.time.day, 1))),
      money: Math.round(num(st.money, 0)),
      members,
    };
  }
  function makeBody(state, json) {
    return { v: VERSION, savedAt: Date.now(), meta: metaOf(state), json };
  }
  /** Parses a stored body (cloud doc data or local mirror). Accepts a raw state too (very old mirrors). */
  function parseBody(raw) {
    let body = raw;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return null; }
    }
    if (!body || typeof body !== 'object') return null;
    if (typeof body.json === 'string') {
      let st = null;
      try { st = JSON.parse(body.json); } catch (e) { return null; }
      st = validateState(st);
      if (!st) return null;
      return { savedAt: num(body.savedAt, 0), meta: body.meta && typeof body.meta === 'object' ? body.meta : metaOf(st), state: st };
    }
    const st = validateState(body.state && typeof body.state === 'object' ? body.state : body);
    if (!st) return null;
    return { savedAt: num(body.savedAt, 0), meta: metaOf(st), state: st };
  }
  /** Meta only, without parsing the whole state when possible (for lists). */
  function peekBody(raw) {
    let body = raw;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return null; }
    }
    if (!body || typeof body !== 'object') return null;
    if (typeof body.json === 'string' && body.meta && typeof body.meta === 'object') {
      return { savedAt: num(body.savedAt, 0), meta: body.meta };
    }
    const p = parseBody(body);
    return p ? { savedAt: p.savedAt, meta: p.meta } : null;
  }

  // ------------------------------------------------------------ capabilities
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      let cl = null;
      try { cl = window.claude; } catch (e) { cl = null; }
      if (!cl || typeof cl.use !== 'function') {
        caps.cloudReason = 'offline';
        return status();
      }
      const use = (name) => new Promise((resolve) => {
        try { Promise.resolve(cl.use(name)).then((v) => resolve(v || null), () => resolve(null)); } catch (e) { resolve(null); }
      });
      const [db, user, downloads] = await Promise.all([use('db'), use('user'), use('downloads')]);
      caps.db = db; caps.user = user; caps.downloads = downloads;
      if (user && typeof user.id === 'function') {
        try { caps.uid = (await user.id()) || null; } catch (e) { caps.uid = null; }
      }
      if (!caps.db) caps.cloudReason = 'no-db';
      else if (!caps.uid) caps.cloudReason = 'no-user';
      return status();
    })().catch(() => status()).then((s) => { caps.ready = true; return status(); });
    return initPromise;
  }
  function cloudReady() { return !!(caps.db && caps.uid && !caps.cloudOff); }
  function docRef(slot) {
    if (!cloudReady()) return null;
    try { return caps.db.collection('data/users/' + caps.uid).doc(safeSlot(slot)); } catch (e) { return null; }
  }
  function collRef() {
    if (!cloudReady()) return null;
    try { return caps.db.collection('data/users/' + caps.uid); } catch (e) { return null; }
  }
  function disableCloud(code) {
    caps.cloudOff = true;
    caps.cloudReason = code || 'refused';
  }

  function status() {
    return {
      ready: caps.ready,
      cloud: cloudReady(),
      cloudReason: caps.cloudReason,
      downloads: !!caps.downloads,
      lastSave: caps.lastSave ? Object.assign({}, caps.lastSave) : null,
      lastLoad: caps.lastLoad ? Object.assign({}, caps.lastLoad) : null,
    };
  }

  // -------------------------------------------------------------- cloud I/O
  async function setWithRetry(ref, body) {
    try {
      await ref.set(body);
    } catch (e) {
      const code = errCode(e);
      if (code === 'unavailable' || code === 'resource_exhausted' || !isKnownCode(code)) {
        await sleep(500 + Math.random() * 900);
        await ref.set(body);       // second failure propagates
        return;
      }
      throw e;
    }
  }
  function isKnownCode(c) {
    return ['invalid_argument', 'resource_exhausted', 'quota_exceeded', 'unavailable', 'revoked', 'not_granted',
      'capability_disabled', 'capability_removed', 'transform_error'].indexOf(c) >= 0;
  }
  function handleCloudError(e) {
    const code = errCode(e);
    if (['invalid_argument', 'revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error'].indexOf(code) >= 0) {
      disableCloud(code);
    }
    return code;
  }
  /** Queues a cloud write for this slot; one write in flight per document, the newest body wins. */
  function writeCloud(slot, body) {
    slot = safeSlot(slot);
    const q = writeQueues[slot] || (writeQueues[slot] = { busy: false, pending: null, waiters: [] });
    return new Promise((resolve) => {
      q.pending = body;
      q.waiters.push(resolve);
      if (!q.busy) pump(slot);
    });
  }
  async function pump(slot) {
    const q = writeQueues[slot];
    q.busy = true;
    try {
      while (q.pending) {
        const body = q.pending, waiters = q.waiters;
        q.pending = null; q.waiters = [];
        let res;
        const ref = docRef(slot);
        if (!ref) res = { ok: false, error: caps.cloudReason || 'offline' };
        else {
          try { await setWithRetry(ref, body); res = { ok: true }; } catch (e) { res = { ok: false, error: handleCloudError(e) }; }
        }
        for (const w of waiters) { try { w(res); } catch (e) { /* ignore */ } }
      }
    } finally {
      q.busy = false;
    }
  }
  async function readCloud(slot) {
    const ref = docRef(slot);
    if (!ref) return null;
    try {
      const snap = await withTimeout(ref.get(), CLOUD_READ_WAIT, null);
      if (!snap || !snap.exists) return null;
      const data = typeof snap.data === 'function' ? snap.data() : null;
      return data ? parseBody(data) : null;
    } catch (e) {
      handleCloudError(e);
      return null;
    }
  }

  // -------------------------------------------------------------- local I/O
  function readLocal(slot) {
    const raw = lsGet(PREFIX + safeSlot(slot));
    if (!raw) return null;
    return parseBody(raw);
  }
  function writeLocal(slot, body) {
    return lsSet(PREFIX + safeSlot(slot), JSON.stringify(body));
  }

  // -------------------------------------------------------------- public API
  /**
   * Saves the state to the local mirror immediately and to the cloud when available.
   * Resolves { ok, where: 'cloud'|'local'|'none', error, savedAt }.
   */
  async function save(state, slot) {
    slot = safeSlot(slot);
    if (!state || typeof state !== 'object') return { ok: false, where: 'none', error: 'Nada para salvar.' };
    let json;
    try { json = JSON.stringify(state); } catch (e) { return { ok: false, where: 'none', error: 'Estado inválido.' }; }
    const body = makeBody(state, json);
    const localOk = writeLocal(slot, body);
    let where = localOk ? 'local' : 'none';
    let error = localOk ? '' : 'local-unavailable';

    await withTimeout(init(), INIT_WAIT_SAVE, null);
    if (cloudReady()) {
      if (json.length > MAX_CLOUD_BYTES) {
        error = 'too_large';
      } else {
        const r = await writeCloud(slot, body);
        if (r.ok) { where = 'cloud'; error = ''; } else error = r.error || 'unavailable';
      }
    }
    const res = { ok: where !== 'none', where, error, savedAt: body.savedAt, slot };
    caps.lastSave = { slot, where, savedAt: body.savedAt, error };
    return res;
  }

  /** Newest of cloud / local for this slot: { state, where, savedAt, meta } or null. */
  async function loadEntry(slot) {
    slot = safeSlot(slot);
    const local = readLocal(slot);
    await withTimeout(init(), INIT_WAIT_LOAD, null);
    const cloud = cloudReady() ? await readCloud(slot) : null;
    let pick = null, where = 'none';
    if (cloud && (!local || cloud.savedAt >= local.savedAt)) { pick = cloud; where = 'cloud'; }
    else if (local) { pick = local; where = 'local'; }
    if (!pick) return null;
    caps.lastLoad = { slot, where, savedAt: pick.savedAt };
    return { state: pick.state, where, savedAt: pick.savedAt, meta: pick.meta, slot };
  }
  async function load(slot) {
    const e = await loadEntry(slot);
    return e ? e.state : null;
  }
  /** Synchronous local-only load (used when the cloud is slow at boot). */
  function loadLocal(slot) {
    const e = readLocal(slot);
    return e ? e.state : null;
  }
  function localEntry(slot) {
    const e = readLocal(slot);
    return e ? { state: e.state, where: 'local', savedAt: e.savedAt, meta: e.meta, slot: safeSlot(slot) } : null;
  }

  /** All saved slots: [{ slot, savedAt, householdName, day, money, members, where: 'cloud'|'local'|'both' }] (newest first). */
  async function list() {
    const map = {};
    for (const k of lsKeys()) {
      const slot = k.slice(PREFIX.length);
      if (!/^[A-Za-z0-9_\-]+$/.test(slot)) continue;
      const p = peekBody(lsGet(k));
      if (!p) continue;
      map[slot] = { slot, savedAt: p.savedAt, meta: p.meta, local: true, cloud: false };
    }
    await withTimeout(init(), INIT_WAIT_LOAD, null);
    const coll = collRef();
    if (coll) {
      try {
        const snap = await withTimeout(coll.limit(50).get(), CLOUD_READ_WAIT, null);
        if (snap && Array.isArray(snap.docs)) {
          for (const d of snap.docs) {
            if (!d || !d.exists) continue;
            const p = peekBody(typeof d.data === 'function' ? d.data() : null);
            if (!p) continue;
            const cur = map[d.id];
            if (cur) { cur.cloud = true; if (p.savedAt > cur.savedAt) { cur.savedAt = p.savedAt; cur.meta = p.meta; } }
            else map[d.id] = { slot: d.id, savedAt: p.savedAt, meta: p.meta, local: false, cloud: true };
          }
        }
      } catch (e) { handleCloudError(e); }
    }
    return Object.keys(map).map((k) => {
      const e = map[k];
      const m = e.meta || {};
      return {
        slot: e.slot, savedAt: e.savedAt,
        householdName: String(m.householdName || 'Família'), day: Math.max(1, Math.round(num(m.day, 1))),
        money: Math.round(num(m.money, 0)), members: Math.round(num(m.members, 0)),
        where: e.cloud && e.local ? 'both' : e.cloud ? 'cloud' : 'local',
      };
    }).sort((a, b) => b.savedAt - a.savedAt);
  }

  /** Deletes a slot locally and in the cloud. */
  async function remove(slot) {
    slot = safeSlot(slot);
    lsRemove(PREFIX + slot);
    await withTimeout(init(), INIT_WAIT_LOAD, null);
    const ref = docRef(slot);
    if (!ref) return { ok: true, where: 'local' };
    try { await ref.delete(); return { ok: true, where: 'cloud' }; } catch (e) { return { ok: false, error: handleCloudError(e) }; }
  }

  /** Portable text form of a state. */
  function exportJSON(state) {
    return JSON.stringify({ format: FORMAT, v: VERSION, exportedAt: new Date().toISOString(), meta: metaOf(state), state });
  }
  /** Parses an exported file, a stored body or a raw state JSON. Returns a fresh state or null. */
  function importJSON(str) {
    if (str == null) return null;
    let obj = str;
    if (typeof obj === 'string') {
      const s = obj.replace(/^﻿/, '').trim();
      if (!s) return null;
      try { obj = JSON.parse(s); } catch (e) { return null; }
    }
    if (!obj || typeof obj !== 'object') return null;
    try {
      if (obj.format === FORMAT) {
        if (num(obj.v, 1) > VERSION) return null;
        return validateState(JSON.parse(JSON.stringify(obj.state)));
      }
      if (typeof obj.json === 'string') {
        const p = parseBody(obj);
        return p ? p.state : null;
      }
      return validateState(JSON.parse(JSON.stringify(obj)));
    } catch (e) {
      return null;
    }
  }

  /**
   * Offers the save as a file through the `downloads` capability.
   * Resolves { ok, method: 'downloads'|'manual', error } — 'manual' means the UI should
   * show the JSON for copying instead.
   */
  async function download(state, filename) {
    let data;
    try { data = exportJSON(state); } catch (e) { return { ok: false, method: 'manual', error: 'invalid' }; }
    await withTimeout(init(), 3000, null);
    const dl = caps.downloads;
    if (!dl || typeof dl.save !== 'function') return { ok: false, method: 'manual', error: 'unavailable', data };
    try {
      const r = await dl.save({ filename: filename || 'morada-save.json', data });
      return { ok: true, method: 'downloads', status: r && r.status, data };
    } catch (e) {
      const code = errCode(e);
      if (code === 'declined' || code === 'rate_limited') return { ok: false, method: 'downloads', error: code, data };
      return { ok: false, method: 'manual', error: code, data };
    }
  }

  M.save = {
    init, save, load, loadEntry, loadLocal, localEntry, list, remove, exportJSON, importJSON, download, status,
    validateState,
    DEFAULT_SLOT,
    get cloudAvailable() { return cloudReady(); },
  };
})(window.M = window.M || {});
