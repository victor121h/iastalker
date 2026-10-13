(function (M) {
  'use strict';

  // ===========================================================================
  // M.save — serialize / restore the game state.
  //
  // Storage layers (both optional, the game keeps working without either):
  //  1. Cloud: the artifact `db` capability, one private document per slot under
  //     the viewer's own subtree: db.collection('data/users/' + uid).doc(slot)
  //     body { v: 1, savedAt, meta: { householdName, day, money, members }, json,
  //            sid, base, unverified }.
  //  2. Local mirror: localStorage key 'morada:<slot>' holding the same body.
  //
  // Robustness rules (CONTRACT_V2 §5):
  //  - Every page load has a session id (`sid`). Per slot we remember the newest
  //    cloud `savedAt` that belongs to the game being played (`base`: the save we
  //    loaded, or the last doc we wrote) and whether a cloud read completed in this
  //    session (`verified`). Until then, a cloud write first reads the doc and
  //    refuses to overwrite a doc that is newer than `base` and was written by
  //    another session: the slot goes into a *conflict* (onConflict listeners /
  //    bus 'saveConflict'), cloud writes stay blocked (the local mirror keeps
  //    saving) until resolveConflict(slot, 'cloud'|'keep').
  //  - Rolling backups: before the local mirror is overwritten, the previous
  //    readable body goes to 'morada:<slot>.bak' (an unreadable one to
  //    'morada:<slot>.broken'); before a cloud doc written by another session is
  //    overwritten (and at most every 10 minutes for our own docs) it is copied
  //    to the doc '<slot>-prev'.
  //  - "No save" and "a save that cannot be read" are different answers:
  //    loadEntry() reports { unreadable } and blocks writes to that slot until
  //    quarantine() preserved the original ('.broken' / '<slot>-broken').
  //  - The active slot lives in localStorage 'morada:activeSlot'.
  //
  // Cloud writes are serialized per document (one write in flight; a newer save
  // requested meanwhile replaces the queued one). Nothing here ever blocks the
  // first paint: init() resolves capabilities in the background and every call
  // degrades to localStorage when the cloud is missing, slow or refuses.
  // ===========================================================================

  const PREFIX = 'morada:';
  const ACTIVE_KEY = 'morada:activeSlot';
  const DEFAULT_SLOT = 'slot1';
  const FORMAT = 'morada-save';
  const VERSION = 1;
  const MAX_CLOUD_BYTES = 250 * 1024;     // db documents are limited to 256 KiB
  const INIT_WAIT_SAVE = 4000;            // ms a save waits for capabilities before going local-only
  const INIT_WAIT_LOAD = 1200;            // default budget (with CLOUD_READ_WAIT) of loadEntry
  const CLOUD_READ_WAIT = 2500;           // ms a load waits for a cloud read (it keeps going in the background)
  const CLOUD_READ_MAX = 20000;           // ms after which a hanging cloud read is abandoned
  const GUARD_READ_WAIT = 6000;           // ms a guarded write waits for its compare-before-write read
  const CHECK_WAIT = 15000;               // default budget of checkCloud()
  const PREV_EVERY = 10 * 60 * 1000;      // min ms between cloud '-prev' copies of our own docs
  const SLOT_RE = /^[A-Za-z0-9_\-]{1,40}$/;

  const SID = makeSid();
  const caps = {
    ready: false,          // init finished (with or without capabilities)
    db: null, user: null, downloads: null,
    uid: null,
    cloudOff: false,       // disabled for the rest of this visit (refused / revoked)
    cloudReason: '',
    lastSave: null,        // { slot, where, savedAt, error }
    lastLoad: null,        // { slot, where, savedAt }
    lastBackupError: '',
  };
  const startedAt = Date.now();
  let initPromise = null;
  let lastStamp = 0;
  const writeQueues = {};  // slot -> { busy, pending, waiters }
  const sessions = {};     // slot -> session (see sess())
  const cloudReads = {};   // slot/doc id -> in-flight read promise
  const seenDocs = {};     // slot -> savedAt of the cloud doc last shown by list()
  const conflictListeners = [];

  // ------------------------------------------------------------------ helpers
  function makeSid() {
    let r = '';
    try {
      const c = (typeof window !== 'undefined' && window.crypto) || null;
      if (c && typeof c.getRandomValues === 'function') {
        const a = new Uint32Array(2); c.getRandomValues(a); r = a[0].toString(36) + a[1].toString(36);
      }
    } catch (e) { r = ''; }
    if (!r) r = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
    return 's' + Date.now().toString(36) + r.slice(0, 12);
  }
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
  /** Doc id of a companion document ('<slot>-prev' / '<slot>-broken'), always a valid id. */
  function sideId(slot, suffix) { return safeSlot(slot).slice(0, 40 - suffix.length - 1) + '-' + suffix; }
  function isSideId(id) { return /-(prev|broken)$/.test(String(id)); }
  function errCode(e) {
    if (e && typeof e === 'object' && typeof e.code === 'string') return e.code;
    return 'unavailable';
  }
  function num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }
  function stamp() {
    // strictly increasing save timestamps (clock jumps, two saves in one ms)
    const t = Math.max(Date.now(), lastStamp + 1);
    lastStamp = t;
    return t;
  }

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

  // ---------------------------------------------------------------- sessions
  function sess(slot) {
    slot = safeSlot(slot);
    return sessions[slot] || (sessions[slot] = {
      verified: false,     // a cloud read of this slot completed in this session (or no cloud exists)
      cloudSeen: false,    // the cloud doc was really read / written in this session (bodies say so)
      base: 0,             // newest cloud savedAt that belongs to the game being played
      known: new Set(),    // savedAt values of saves that belong to it (the one loaded, docs we wrote)
      conflict: null,      // pending choice: a newer cloud save from another session
      blocked: null,       // { reason, where } — the stored save is unreadable: never overwrite it
      lastDoc: null,       // body currently in the cloud doc, as far as we know
      lastPrevAt: startedAt,
      forcePrev: false,
    });
  }
  function isForeign(s, savedAt, sid) {
    if (sid && sid === SID) return false;               // written by this page session
    if (!isFinite(savedAt)) return true;                // unknown age: never assume it is older
    if (s.known.has(savedAt)) return false;             // the save we loaded / wrote
    return savedAt > s.base;
  }

  // ------------------------------------------------------------- validation
  const ENTRY_ARRAYS = ['npcs', 'notifications', 'events', 'bills', 'objects', 'sims'];
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
    if (!st.settings || typeof st.settings !== 'object' || Array.isArray(st.settings)) st.settings = {};
    // CR-4: a stray null / non-object entry must not make the whole save unreadable
    for (const k of ENTRY_ARRAYS) {
      if (Array.isArray(st[k])) st[k] = st[k].filter((x) => x && typeof x === 'object' && !Array.isArray(x));
    }
    return st;
  }
  /** 'newer' | 'corrupt' | null for a parsed state candidate. */
  function stateProblem(st) {
    if (st && typeof st === 'object' && st.version != null && num(st.version, 0) > VERSION) return 'newer';
    return null;
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
  function makeBody(state, json, s) {
    const body = { v: VERSION, savedAt: stamp(), meta: metaOf(state), json, sid: SID, base: s ? s.base : 0 };
    // written without having compared with the cloud (slow / offline visit, or a pending conflict)
    if (s && (!s.cloudSeen || s.conflict)) body.unverified = true;
    return body;
  }
  function cleanMeta(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      householdName: String(m.householdName || 'Família').slice(0, 60),
      day: Math.max(1, Math.round(num(m.day, 1))),
      money: Math.round(num(m.money, 0)),
      members: Math.round(num(m.members, 0)),
    };
  }
  /**
   * Inspects a stored body (cloud doc data or local mirror string; a raw state from very old mirrors works too).
   * → { status: 'absent' } | { status: 'ok', entry } | { status: 'unreadable', reason: 'corrupt'|'newer', savedAt, meta, raw }
   * entry = { state, savedAt, meta, sid, base, unverified, json }
   */
  function inspectBody(raw) {
    if (raw == null || raw === '') return { status: 'absent' };
    const rawText = typeof raw === 'string' ? raw : safeStringify(raw);
    let body = raw;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return { status: 'unreadable', reason: 'corrupt', savedAt: NaN, meta: null, raw: rawText }; }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'unreadable', reason: 'corrupt', savedAt: NaN, meta: null, raw: rawText };
    const savedAt = num(body.savedAt, 0);
    const extra = {
      sid: typeof body.sid === 'string' ? body.sid : null,
      base: isFinite(+body.base) && body.base !== null ? +body.base : null,
      unverified: body.unverified === true,
    };
    const bad = (reason, st) => ({ status: 'unreadable', reason, savedAt, meta: body.meta && body.meta.householdName ? cleanMeta(body.meta) : (st ? metaOf(st) : null), raw: rawText, sid: extra.sid });
    if (typeof body.json === 'string') {
      if (num(body.v, 1) > VERSION) return bad('newer');
      let st = null;
      try { st = JSON.parse(body.json); } catch (e) { return bad('corrupt'); }
      const prob = stateProblem(st);
      if (prob) return bad(prob, st);
      st = validateState(st);
      if (!st) return bad('corrupt');
      return { status: 'ok', entry: Object.assign({ state: st, savedAt, meta: body.meta && body.meta.householdName ? cleanMeta(body.meta) : metaOf(st), json: body.json }, extra) };
    }
    const cand = body.state && typeof body.state === 'object' ? body.state : body;
    const prob = stateProblem(cand);
    if (prob) return bad(prob, cand);
    const st = validateState(cand);
    if (!st) return bad('corrupt');
    return { status: 'ok', entry: Object.assign({ state: st, savedAt, meta: metaOf(st), json: null }, extra) };
  }
  function safeStringify(v) { try { return JSON.stringify(v); } catch (e) { return ''; } }
  /** Back-compat: parsed { savedAt, meta, state } or null. */
  function parseBody(raw) {
    const r = inspectBody(raw);
    return r.status === 'ok' ? r.entry : null;
  }
  /** Meta only, without parsing the whole state when possible (for lists). */
  function peekBody(raw) {
    let body = raw;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return null; }
    }
    if (!body || typeof body !== 'object') return null;
    if (typeof body.json === 'string' && body.meta && typeof body.meta === 'object') {
      if (num(body.v, 1) > VERSION) return null;
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
    })().catch(() => status()).then(() => { caps.ready = true; return status(); });
    return initPromise;
  }
  function cloudReady() { return !!(caps.db && caps.uid && !caps.cloudOff); }
  /** The cloud may still answer in this visit (capabilities pending, or available). */
  function cloudPossible() { return !caps.ready || cloudReady(); }
  function docRef(id) {
    if (!cloudReady()) return null;
    try { return caps.db.collection('data/users/' + caps.uid).doc(safeSlot(id)); } catch (e) { return null; }
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
      cloudPending: !caps.ready,
      cloudReason: caps.cloudReason,
      downloads: !!caps.downloads,
      sid: SID,
      lastSave: caps.lastSave ? Object.assign({}, caps.lastSave) : null,
      lastLoad: caps.lastLoad ? Object.assign({}, caps.lastLoad) : null,
      lastBackupError: caps.lastBackupError,
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
  /**
   * Reads one cloud doc (deduplicated while in flight; abandoned after CLOUD_READ_MAX).
   * → { checked, cloud, status: 'absent'|'ok'|'unreadable', entry?, savedAt?, meta?, raw?, body?, sid? }
   * checked=false: the read did not complete (timeout / transient error) — the cloud is still unknown.
   */
  function readDoc(id, waitMs) {
    id = safeSlot(id);
    let p = cloudReads[id];
    if (!p) {
      const ref = docRef(id);
      if (!ref) return Promise.resolve({ checked: !cloudPossible(), cloud: false });
      p = withTimeout(Promise.resolve().then(() => ref.get()).then((snap) => {
        if (!snap) return { checked: false, cloud: true };
        const data = snap.exists ? (typeof snap.data === 'function' ? snap.data() : null) : null;
        if (!snap.exists || data == null) return { checked: true, cloud: true, status: 'absent' };
        const r = inspectBody(data);
        r.checked = true; r.cloud = true; r.body = data;
        if (r.status === 'ok') { r.savedAt = r.entry.savedAt; r.meta = r.entry.meta; r.sid = r.entry.sid; }
        return r;
      }, (e) => {
        handleCloudError(e);
        return { checked: caps.cloudOff, cloud: false };   // refused → no cloud this visit (nothing to protect)
      }), CLOUD_READ_MAX, { checked: false, cloud: true, timeout: true });
      cloudReads[id] = p;
      p.then(() => { if (cloudReads[id] === p) delete cloudReads[id]; });
    }
    return waitMs != null ? withTimeout(p, waitMs, { checked: false, cloud: true, timeout: true }) : p;
  }
  /** Waits for capabilities, then reads the slot doc. */
  async function cloudFetch(slot, readWait) {
    await init();
    if (!cloudReady()) return { checked: true, cloud: false };
    return readDoc(slot, readWait);
  }
  function conflictInfo(slot, r) {
    const readable = r.status === 'ok';
    return {
      slot: safeSlot(slot), where: 'cloud',
      savedAt: readable ? r.entry.savedAt : r.savedAt,
      meta: readable ? r.entry.meta : r.meta,
      sid: readable ? r.entry.sid : (r.sid || null),
      state: readable ? r.entry.state : null,
      unreadable: readable ? null : (r.reason || 'corrupt'),
      raw: readable ? null : r.raw,
      body: r.body || null,
    };
  }
  function setConflict(slot, info, source) {
    const s = sess(slot);
    const same = s.conflict && s.conflict.savedAt === info.savedAt;
    s.conflict = info;
    if (same) return;
    const ev = Object.assign({ source }, info);
    for (const fn of conflictListeners.slice()) { try { fn(ev); } catch (e) { /* ignore */ } }
    try { if (M.util && M.util.bus) M.util.bus.emit('saveConflict', ev); } catch (e) { /* ignore */ }
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
        try { res = await guardedWrite(slot, body); } catch (e) { res = { ok: false, error: errCode(e) }; }
        for (const w of waiters) { try { w(res); } catch (e) { /* ignore */ } }
      }
    } finally {
      q.busy = false;
    }
  }
  /** Compare-before-write while the slot is unverified, rolling '-prev' backup, then the write. */
  async function guardedWrite(slot, body) {
    const s = sess(slot);
    if (s.blocked) return { ok: false, error: 'blocked' };
    if (s.conflict) return { ok: false, error: 'conflict', conflict: s.conflict };
    if (!docRef(slot)) return { ok: false, error: caps.cloudReason || 'offline' };
    if (!s.verified) {
      const r = await readDoc(slot, GUARD_READ_WAIT);
      if (!r.checked) return { ok: false, error: 'unverified' };
      if (!r.cloud) return { ok: false, error: caps.cloudReason || 'offline' };
      if (s.blocked) return { ok: false, error: 'blocked' };
      if (s.conflict) return { ok: false, error: 'conflict', conflict: s.conflict };
      if (r.status !== 'absent') {
        if (isForeign(s, r.savedAt, r.sid)) {
          const info = conflictInfo(slot, r);
          setConflict(slot, info, 'write');
          return { ok: false, error: 'conflict', conflict: info };
        }
        s.lastDoc = r.body;
      } else s.lastDoc = null;
      s.verified = true;
      s.cloudSeen = true;
    }
    const ref = docRef(slot);
    if (!ref) return { ok: false, error: caps.cloudReason || 'offline' };
    const prev = s.lastDoc;
    if (prev && prev !== body && (s.forcePrev || prev.sid !== SID || Date.now() - s.lastPrevAt >= PREV_EVERY)) {
      const pref = docRef(sideId(slot, 'prev'));
      if (pref) {
        try { await setWithRetry(pref, prev); s.lastPrevAt = Date.now(); s.forcePrev = false; caps.lastBackupError = ''; }
        catch (e) { caps.lastBackupError = handleCloudError(e); }
      }
    }
    try {
      await setWithRetry(ref, body);
      s.lastDoc = body;
      if (body.savedAt > s.base) s.base = body.savedAt;
      s.known.add(body.savedAt);
      s.cloudSeen = true;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: handleCloudError(e) };
    }
  }

  // -------------------------------------------------------------- local I/O
  function readLocalX(slot) {
    const r = inspectBody(lsGet(PREFIX + safeSlot(slot)));
    r.where = 'local';
    return r;
  }
  function readLocal(slot) {
    const r = readLocalX(slot);
    return r.status === 'ok' ? r.entry : null;
  }
  /** Writes the mirror; the previous readable body rolls into '.bak', an unreadable one into '.broken'. */
  function writeLocal(slot, body) {
    const key = PREFIX + safeSlot(slot);
    const prevRaw = lsGet(key);
    let prevStatus = 'absent';
    if (prevRaw) {
      prevStatus = inspectBody(prevRaw).status;
      if (prevStatus === 'unreadable') lsSet(key + '.broken', prevRaw);
    }
    const text = JSON.stringify(body);
    let ok = lsSet(key, text);
    if (!ok && lsGet(key + '.bak') != null) { lsRemove(key + '.bak'); ok = lsSet(key, text); }   // make room
    if (ok && prevStatus === 'ok' && prevRaw !== text) lsSet(key + '.bak', prevRaw);
    return ok;
  }

  function unmarkLocal(slot, body) {
    const key = PREFIX + safeSlot(slot);
    try {
      const cur = JSON.parse(lsGet(key) || 'null');
      if (!cur || cur.savedAt !== body.savedAt || cur.sid !== body.sid) return;   // a newer save is there already
      const clean = Object.assign({}, body);
      delete clean.unverified;
      lsSet(key, JSON.stringify(clean));
    } catch (e) { /* ignore */ }
  }

  // -------------------------------------------------------------- public API
  /**
   * Saves the state to the local mirror immediately and to the cloud when available.
   * opts.replace: the player explicitly chose this slot (e.g. "Salvar aqui" on a listed save): the cloud doc
   * last shown by list() may be overwritten.
   * Resolves { ok, where: 'cloud'|'local'|'none', error, savedAt, slot, conflict? }.
   * error 'conflict' = the cloud holds a newer save from another session (kept; see onConflict);
   * 'unverified' = the cloud could not be compared yet (kept; retried next save); 'blocked' = the stored save is
   * unreadable and was not quarantined yet (nothing written).
   */
  async function save(state, slot, opts) {
    slot = safeSlot(slot);
    opts = opts || {};
    const s = sess(slot);
    if (!state || typeof state !== 'object') return { ok: false, where: 'none', error: 'Nada para salvar.', slot };
    if (s.blocked) return { ok: false, where: 'none', error: 'blocked', slot, savedAt: 0 };
    if (opts.replace && seenDocs[slot] != null) { s.known.add(seenDocs[slot]); if (seenDocs[slot] > s.base) s.base = seenDocs[slot]; }
    let json;
    try { json = JSON.stringify(state); } catch (e) { return { ok: false, where: 'none', error: 'Estado inválido.', slot }; }
    const body = makeBody(state, json, s);
    const localOk = writeLocal(slot, body);
    let where = localOk ? 'local' : 'none';
    let error = localOk ? '' : 'local-unavailable';
    let conflict = null;

    await withTimeout(init(), INIT_WAIT_SAVE, null);
    if (cloudReady()) {
      if (json.length > MAX_CLOUD_BYTES) {
        error = 'too_large';
      } else {
        const r = await writeCloud(slot, body);
        if (r.ok) {
          where = 'cloud'; error = '';
          // the first save of a visit is mirrored before the cloud compare; once that body reached the
          // cloud, the local copy no longer needs its "unverified" mark (it would look like a fork later)
          if (body.unverified && localOk) unmarkLocal(slot, body);
        }
        else { error = r.error || 'unavailable'; conflict = r.conflict || null; }
      }
    }
    const res = { ok: where !== 'none', where, error, savedAt: body.savedAt, slot };
    if (conflict) res.conflict = publicConflict(conflict);
    caps.lastSave = { slot, where, savedAt: body.savedAt, error };
    return res;
  }

  function entryOut(slot, where, e) {
    return { state: e.state, where, savedAt: e.savedAt, meta: e.meta, slot, sid: e.sid || null };
  }
  function unreadableOut(r) {
    return { where: r.where, reason: r.reason || 'corrupt', savedAt: r.savedAt, meta: r.meta || null, raw: r.raw || '', body: r.body || null };
  }
  function publicConflict(c) {
    if (!c) return null;
    return { slot: c.slot, where: c.where, savedAt: c.savedAt, meta: c.meta, state: c.state, unreadable: c.unreadable, raw: c.raw, sid: c.sid };
  }

  /**
   * Newest of cloud / local for this slot.
   * opts.timeout: ms budget for the cloud part (default 3.7 s); the read keeps going in the background.
   * opts.peek: do not touch the slot's session (lineage / verified / blocked).
   * → { state|null, where: 'cloud'|'local'|'none', savedAt, meta, slot, cloudChecked,
   *     conflict?: { where:'cloud', savedAt, meta, state, unreadable } — the local save is newer but was written
   *                without knowing this cloud save (fork): ask the player (cloud writes are blocked meanwhile),
   *     unreadable?: { where, reason: 'corrupt'|'newer', savedAt, meta, raw } — the newest save exists but cannot
   *                be read; the slot is blocked (nothing is written) until quarantine(slot),
   *     backup?: entry — the other (older, readable) copy when the newest is unreadable }
   * cloudChecked is true when the cloud doc was read in time, or no cloud exists in this visit.
   * The result is truthy even when nothing is stored (state null) — `load()` still resolves null then.
   */
  async function loadEntry(slot, opts) {
    slot = safeSlot(slot);
    opts = opts || {};
    const budget = opts.timeout != null ? Math.max(0, num(opts.timeout, 0)) : INIT_WAIT_LOAD + CLOUD_READ_WAIT;
    const local = readLocalX(slot);
    const cloud = await withTimeout(cloudFetch(slot), budget, { checked: false, cloud: true, timeout: true });
    if (cloud && cloud.checked && cloud.cloud && cloud.status) cloud.where = 'cloud';
    return decide(slot, local, cloud, opts);
  }
  function rankOf(r) { return isFinite(r.savedAt) ? r.savedAt : (r.status === 'ok' && isFinite(r.entry.savedAt) ? r.entry.savedAt : -1); }
  function decide(slot, local, cloud, opts) {
    const s = opts.peek ? null : sess(slot);
    const cloudChecked = !!(cloud && cloud.checked);
    const cands = [];
    if (local.status !== 'absent') cands.push(local);
    if (cloudChecked && cloud.cloud && cloud.status && cloud.status !== 'absent') cands.push(cloud);
    for (const c of cands) if (c.status === 'ok') c.savedAt = c.entry.savedAt;
    // newest first; on a tie the cloud wins (as before), readable before unreadable
    cands.sort((a, b) => (rankOf(b) - rankOf(a)) || ((b.where === 'cloud') - (a.where === 'cloud')) || ((b.status === 'ok') - (a.status === 'ok')));
    const out = { state: null, where: 'none', savedAt: 0, meta: null, slot, cloudChecked };
    const top = cands[0] || null;
    if (s) { s.known = new Set(); s.cloudSeen = !!(cloudChecked && cloud.cloud); }
    if (!top) {
      if (s) { s.base = 0; s.verified = cloudChecked; s.conflict = null; s.blocked = null; s.lastDoc = null; }
      return out;
    }
    if (top.status !== 'ok') {
      out.unreadable = unreadableOut(top);
      const other = cands.find((c) => c.status === 'ok');
      if (other) out.backup = entryOut(slot, other.where, other.entry);
      if (s) {
        s.blocked = { reason: top.reason || 'corrupt', where: top.where };
        s.conflict = null;
        s.verified = cloudChecked;
        if (cloudChecked && cloud.body) s.lastDoc = cloud.body;
      }
      return out;
    }
    const e = top.entry;
    Object.assign(out, entryOut(slot, top.where, e));
    if (top.where === 'local' && cloudChecked && cloud.status === 'ok' && e.unverified &&
        cloud.entry.sid !== e.sid && cloud.entry.savedAt !== e.savedAt && cloud.entry.savedAt > num(e.base, 0)) {
      out.conflict = publicConflict(conflictInfo(slot, cloud));
    }
    if (s) {
      s.blocked = null;
      s.conflict = out.conflict ? conflictInfo(slot, cloud) : null;
      s.known.add(e.savedAt);
      if (top.where === 'cloud') {
        s.base = e.savedAt; s.verified = true; s.lastDoc = cloud.body || null;
      } else {
        // a local save written without knowing the cloud only vouches for its own base (fork detection)
        s.base = e.unverified ? num(e.base, 0) : Math.max(e.savedAt, num(e.base, 0));
        s.verified = cloudChecked;
        if (cloudChecked) {
          s.lastDoc = cloud.body || null;
          if (!out.conflict && cloud.status === 'ok' && cloud.entry.savedAt > s.base) s.base = cloud.entry.savedAt;
        }
      }
      caps.lastLoad = { slot, where: top.where, savedAt: e.savedAt };
    }
    return out;
  }
  async function load(slot) {
    const e = await loadEntry(slot);
    return e && e.state ? e.state : null;
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

  /**
   * Late / repeated cloud check for a slot (CONTRACT_V2 §5): waits for the capabilities, reads the doc and
   * compares it with the game being played.
   * → { checked, slot, cloud, exists, savedAt, meta, conflict, pending }
   * checked=false → the cloud did not answer within opts.timeout (default 15 s); pending tells whether it still may.
   * A newer doc from another session → conflict (also reported to onConflict listeners) and cloud writes blocked.
   */
  async function checkCloud(slot, opts) {
    slot = safeSlot(slot);
    opts = opts || {};
    const timeout = opts.timeout != null ? Math.max(0, num(opts.timeout, 0)) : CHECK_WAIT;
    const r = await withTimeout(cloudFetch(slot, opts.readWait), timeout, { checked: false, cloud: true, timeout: true });
    const s = sess(slot);
    if (!r || !r.checked) return { checked: false, slot, pending: cloudPossible() };
    if (!r.cloud) { s.verified = true; return { checked: true, slot, cloud: false, exists: false, conflict: null }; }
    s.cloudSeen = true;
    if (r.status === 'absent') { s.verified = true; s.lastDoc = null; return { checked: true, slot, cloud: true, exists: false, conflict: null }; }
    if (s.blocked) return { checked: true, slot, cloud: true, exists: true, savedAt: r.savedAt, meta: r.meta, conflict: null, blocked: true };
    if (isForeign(s, r.savedAt, r.sid)) {
      const info = conflictInfo(slot, r);
      setConflict(slot, info, 'check');
      return { checked: true, slot, cloud: true, exists: true, savedAt: info.savedAt, meta: info.meta, conflict: publicConflict(info) };
    }
    s.verified = true;
    s.lastDoc = r.body;
    if (r.savedAt > s.base && r.sid === SID) s.base = r.savedAt;
    return { checked: true, slot, cloud: true, exists: true, savedAt: r.savedAt, meta: r.meta, conflict: null };
  }
  /** Pending conflict of a slot (or null). */
  function conflictOf(slot) { return publicConflict(sess(slot).conflict); }
  /**
   * Ends a conflict: 'cloud' = the player continues the cloud save (the caller loads conflict.state);
   * 'keep' = the player keeps this game: the next write overwrites the cloud doc, after copying it to '<slot>-prev'.
   */
  function resolveConflict(slot, choice) {
    const s = sess(slot);
    const c = s.conflict;
    if (!c) return false;
    s.conflict = null;
    s.verified = true;
    s.cloudSeen = true;
    if (isFinite(c.savedAt)) { s.known.add(c.savedAt); if (c.savedAt > s.base) s.base = c.savedAt; }
    if (c.body) s.lastDoc = c.body;
    if (choice === 'keep') {
      s.forcePrev = true;
      if (c.unreadable && c.body) {   // an unreadable cloud save is also kept apart, never rolled away
        const ref = docRef(sideId(slot, 'broken'));
        if (ref) { try { Promise.resolve(ref.set(c.body)).catch(() => {}); } catch (e) { /* ignore */ } }
      }
    }
    return true;
  }
  function onConflict(fn) {
    if (typeof fn !== 'function') return () => {};
    conflictListeners.push(fn);
    return () => { const i = conflictListeners.indexOf(fn); if (i >= 0) conflictListeners.splice(i, 1); };
  }

  /**
   * Preserves an unreadable save before the slot is used again: the local raw text goes to
   * 'morada:<slot>.broken', an unreadable cloud doc to the doc '<slot>-broken'. Unblocks the slot.
   * info: the `unreadable` object from loadEntry (or { where, raw }).
   */
  async function quarantine(slot, info) {
    slot = safeSlot(slot);
    info = info || {};
    const s = sess(slot);
    const where = info.where || (s.blocked && s.blocked.where) || 'local';
    let ok = true;
    const raw = info.raw || (where === 'local' ? lsGet(PREFIX + slot) : (info.body ? safeStringify(info.body) : ''));
    if (raw) ok = lsSet(PREFIX + slot + '.broken', raw) && ok;
    if (where === 'cloud') {
      const body = info.body || (s.lastDoc && inspectBody(s.lastDoc).status !== 'ok' ? s.lastDoc : null);
      const ref = body ? docRef(sideId(slot, 'broken')) : null;
      if (ref) { try { await setWithRetry(ref, body); } catch (e) { handleCloudError(e); ok = false; } }
      if (isFinite(info.savedAt)) { s.known.add(info.savedAt); if (info.savedAt > s.base) s.base = info.savedAt; }
      s.verified = true;
    }
    s.blocked = null;
    return { ok };
  }
  /** Blocks every write to a slot (e.g. the engine could not open its save); unblock with quarantine(). */
  function block(slot, reason, where) { sess(slot).blocked = { reason: reason || 'blocked', where: where || 'local' }; }
  function isBlocked(slot) { return !!sess(slot).blocked; }
  /** Raw stored text of a slot (for "copy the data"): the local mirror, else the last cloud doc read. */
  function rawText(slot, where) {
    slot = safeSlot(slot);
    if (where !== 'cloud') { const t = lsGet(PREFIX + slot); if (t) return t; }
    const s = sess(slot);
    if (s.conflict && s.conflict.body) return safeStringify(s.conflict.body);
    if (s.lastDoc) return safeStringify(s.lastDoc);
    return where === 'cloud' ? (lsGet(PREFIX + slot) || '') : '';
  }

  /**
   * Newest readable backup of a slot: local '.bak', cloud '<slot>-prev', and (opts.primary, default true) the
   * primary copies too. opts.exclude: a savedAt to skip (the save that just failed to open).
   * → entry { state, where: 'local'|'cloud'|'local-bak'|'cloud-prev', savedAt, meta, slot } | null
   */
  async function backupEntry(slot, opts) {
    slot = safeSlot(slot);
    opts = opts || {};
    const found = [];
    const skip = opts.exclude != null && isFinite(+opts.exclude) ? +opts.exclude : null;
    const add = (r, where) => { if (r && r.status === 'ok' && r.entry.savedAt !== skip) found.push(entryOut(slot, where, r.entry)); };
    add(inspectBody(lsGet(PREFIX + slot + '.bak')), 'local-bak');
    if (opts.primary !== false) add(readLocalX(slot), 'local');
    await withTimeout(init(), opts.timeout != null ? opts.timeout : INIT_WAIT_LOAD, null);
    if (cloudReady()) {
      const wait = opts.timeout != null ? opts.timeout : CLOUD_READ_WAIT;
      const [prev, cur] = await Promise.all([readDoc(sideId(slot, 'prev'), wait), opts.primary !== false ? readDoc(slot, wait) : Promise.resolve(null)]);
      if (prev && prev.checked) add(prev, 'cloud-prev');
      if (cur && cur.checked) add(cur, 'cloud');
    }
    found.sort((a, b) => b.savedAt - a.savedAt);
    return found[0] || null;
  }

  /** Lineage of a slot (kept across a live code update via the hot snapshot). */
  function lineage(slot) { const s = sess(slot); return { slot: safeSlot(slot), base: s.base, verified: s.verified, known: Array.from(s.known).slice(-20) }; }
  function adopt(slot, lin) {
    if (!lin || typeof lin !== 'object') return;
    const s = sess(slot);
    const b = num(lin.base, 0);
    if (b > s.base) s.base = b;
    if (Array.isArray(lin.known)) for (const k of lin.known) if (isFinite(+k)) s.known.add(+k);
  }
  /** Forget what we know about the cloud docs (e.g. after the page was in the background): next writes re-check. */
  function invalidate(slot) {
    const list = slot ? [safeSlot(slot)] : Object.keys(sessions);
    for (const k of list) { const s = sess(k); if (!s.conflict && !s.blocked) s.verified = false; }
  }
  function session(slot) {
    const s = sess(slot);
    return { slot: safeSlot(slot), verified: s.verified, base: s.base, conflict: !!s.conflict, blocked: s.blocked ? Object.assign({}, s.blocked) : null };
  }

  // --------------------------------------------------------------- active slot
  /** The slot the player was using (localStorage 'morada:activeSlot'), or null. */
  function activeSlot() {
    const v = lsGet(ACTIVE_KEY);
    return v && SLOT_RE.test(v) && !isSideId(v) ? v : null;
  }
  function setActiveSlot(slot) {
    const v = safeSlot(slot);
    if (lsGet(ACTIVE_KEY) === v) return true;
    return lsSet(ACTIVE_KEY, v);
  }
  /** pt-BR label of a slot: 'slot2' → 'Espaço 2'. */
  function slotLabel(slot) {
    const s = safeSlot(slot);
    const m = /^slot(\d{1,2})$/.exec(s);
    return m ? 'Espaço ' + (+m[1]) : s;
  }

  /** All saved slots: [{ slot, savedAt, householdName, day, money, members, where: 'cloud'|'local'|'both' }] (newest first). */
  async function list() {
    const map = {};
    for (const k of lsKeys()) {
      if (k === ACTIVE_KEY) continue;
      const slot = k.slice(PREFIX.length);
      if (!SLOT_RE.test(slot) || isSideId(slot)) continue;
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
            if (!d || !d.exists || isSideId(d.id) || !SLOT_RE.test(String(d.id))) continue;
            const p = peekBody(typeof d.data === 'function' ? d.data() : null);
            if (!p) continue;
            seenDocs[d.id] = p.savedAt;
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

  /** Deletes a slot locally and in the cloud (its backups are kept). */
  async function remove(slot) {
    slot = safeSlot(slot);
    lsRemove(PREFIX + slot);
    await withTimeout(init(), INIT_WAIT_LOAD, null);
    const ref = docRef(slot);
    if (!ref) return { ok: true, where: 'local' };
    try {
      await ref.delete();
      const s = sess(slot); s.lastDoc = null; s.verified = true; s.conflict = null;
      return { ok: true, where: 'cloud' };
    } catch (e) { return { ok: false, error: handleCloudError(e) }; }
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
    return downloadText(data, filename);
  }
  /** Same as download() for an already serialized text (e.g. an unreadable save's raw data). */
  async function downloadText(data, filename) {
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
    init, save, load, loadEntry, loadLocal, localEntry, list, remove, exportJSON, importJSON, download, downloadText, status,
    validateState,
    // CONTRACT_V2 §5
    checkCloud, conflictOf, resolveConflict, onConflict, quarantine, block, isBlocked, rawText, backupEntry,
    activeSlot, setActiveSlot, slotLabel, lineage, adopt, invalidate, session,
    DEFAULT_SLOT,
    get sid() { return SID; },
    get cloudAvailable() { return cloudReady(); },
    // test hooks
    debug: { inspectBody, sessions, sideId, get caps() { return caps; } },
  };
})(window.M = window.M || {});
