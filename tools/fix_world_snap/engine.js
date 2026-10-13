(function (M) {
  'use strict';

  // ===========================================================================
  // M.engine — simulation for Morada (no DOM, no THREE).
  // Time, motives, mood, action queue (route → walk → enter → do → exit), autonomy
  // (faithful marginal scoring with contribution curves, distance attenuation and a
  // weighted pick among the top 4), cooking/eating, chores, skills, careers, money,
  // relationships/socials, phone, visitors and services.
  // All persistent data lives in `state` (plain JSON). Closure variables are caches.
  // ===========================================================================

  const PI = Math.PI, TWO_PI = PI * 2, HALF_PI = PI / 2;
  // work (60): the automatic walk to the carpool outranks player commands (QA SIM-2)
  const PRIO = { auto: 2, urgent: 40, player: 50, work: 60, critical: 100 };
  const MAX_PLAYER_ACTIONS = 8;
  const MSG_QUEUE_FULL = 'A fila de ações está cheia (máx. 8).';
  const NEED_MOTIVES = ['hunger', 'energy', 'bladder', 'hygiene', 'comfort'];
  const NEED_EFFECTS = {
    snack: 1, cook_meal: 1, eat_meal: 1, sleep: 1, nap: 1, sleep_sofa: 1, toilet: 1, wash_hands: 1, go_work: 1,
    order_pizza: 1, pay_bills: 1, call_repair: 1, repair: 1, mop: 1, accept_job: 1, find_job: 1, read_paper: 1,
  };
  const SLEEP_EFFECTS = { sleep: 1, nap: 1, sleep_sofa: 1 };
  function isSleepEff(e) { return !!(e && SLEEP_EFFECTS[e]); }
  // interactions a social partner should not be pulled out of (they wait instead)
  const BUSY_EFFECTS = { toilet: 1, cook_meal: 1, eat_meal: 1, go_work: 1, faint: 1, repair: 1, snack: 1 };
  const BUSY_KEYS = { shower: 1, bath: 1, use: 1 };
  const SERVICE_ROLES = { repair: 1, maid: 1, pizza: 1, collector: 1 };
  const USE_EXCLUDED_EFFECTS = {
    repair: 1, clean_object: 1, dispose: 1, make_bed: 1, water: 1, toggle_light: 1, mop: 1, clean_plate: 1,
    accept_job: 1, go_work: 1,
  };

  let S = null;                 // current state
  let objMap = new Map();       // id -> object (cache)
  let objMapRef = null, objMapLen = -1;
  let debugThrow = false;
  let lastError = null;
  let lastReason = '';          // pt-BR reason of the last refused queue*/buy*/build*/paint* call (CONTRACT_V2 §3)
  let tickNo = 0;               // engine tick counter (per-tick caches)
  let autoBudget = Infinity;    // full autonomy evaluations left in this tick (time-slicing, CR-6)
  let localVer = 0;             // bumped on every object/lot change made through the engine (cache key)

  // --------------------------------------------------------------- basics
  function D() { return M.data; }
  function WO() { return M.world; }
  function emit(evt, payload) {
    try { if (M.util && M.util.bus) M.util.bus.emit(evt, payload); } catch (e) { /* listeners must not break the sim */ }
  }
  function num(v, d) { v = +v; return isFinite(v) ? v : (d === undefined ? 0 : d); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function normRot(r) { r = Math.round(+r) || 0; return ((r % 4) + 4) % 4; }
  function normAngle(a) { a = num(a) % TWO_PI; if (a < 0) a += TWO_PI; return a; }
  function nowAbs() { return S.time.day * 1440 + S.time.minute; }
  function hourNow() { return Math.floor(num(S.time.minute) / 60) % 24; }
  function weekday(day) { return ((day - 1) % 7 + 7) % 7; }
  function nid() {
    if (M.util && M.util.nextId) return M.util.nextId(S);
    S.nextId = (S.nextId || 1) + 1; return S.nextId;
  }
  function fmtMoney(n) { return M.util && M.util.fmtMoney ? M.util.fmtMoney(n) : 'M$ ' + Math.round(n); }
  function fmtTime(m) { return M.util && M.util.fmtTime ? M.util.fmtTime(m) : String(m); }
  function firstName(s) { return String((s && s.name) || '').split(' ')[0] || 'Morador'; }
  // gendered Portuguese (QA LIVE-16): g(sim, 'o', 'a') → 'a' for a female character
  function g(s, m, f) { return s && s.gender === 'f' ? f : m; }
  function refuse(reason) { lastReason = String(reason || 'Não é possível agora.'); return false; }
  function shallow(o) { const r = {}; if (o) for (const k in o) r[k] = o[k]; return r; }

  // Seeded RNG whose state lives in the save (mulberry32 step).
  function rand() {
    let a = (S.rngState >>> 0) || 0x9E3779B9;
    a = (a + 0x6D2B79F5) >>> 0;
    S.rngState = a;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  function randRange(a, b) { return a + rand() * (b - a); }
  function pick(arr) { return arr.length ? arr[Math.floor(rand() * arr.length) % arr.length] : undefined; }

  function guard(fn, fallback) {
    try { return fn(); } catch (e) {
      lastError = e;
      if (debugThrow) throw e;
      try { console.error('[engine]', e); } catch (e2) { /* ignore */ }
      return fallback;
    }
  }

  // --------------------------------------------------------------- notifications / money / bubbles
  // notify(text, kind, focus?) — focus: { x, y } | { simId } | { objId } (CONTRACT_V2 §3, UI 'Ver' button).
  // The same text (and kind) again within 60 sim-minutes only increments `count` on the stored notification
  // and emits 'notifyRepeat' instead of a new toast (QA: faint loops / route failures spammed toasts).
  function notify(text, kind, focus) {
    if (!S) return null;
    text = String(text); kind = kind || 'info';
    const now = nowAbs();
    for (let i = S.notifications.length - 1; i >= 0; i--) {
      const p = S.notifications[i];
      if (!p) continue;
      const pt = num(p.day) * 1440 + num(p.minute);
      if (now - pt > 60) break;
      if (p.text === text && p.kind === kind) {
        p.count = num(p.count, 1) + 1;
        p.lastDay = S.time.day; p.lastMinute = Math.floor(S.time.minute);
        emit('notifyRepeat', { id: p.id, text: p.text, kind: p.kind, count: p.count });
        return p;
      }
    }
    const n = { id: nid(), day: S.time.day, minute: Math.floor(S.time.minute), text, kind };
    const fc = cleanFocus(focus);
    if (fc) n.focus = fc;
    S.notifications.push(n);
    if (S.notifications.length > 30) S.notifications.splice(0, S.notifications.length - 30);
    const payload = { text: n.text, kind: n.kind, id: n.id };
    if (fc) payload.focus = fc;
    emit('notify', payload);
    return n;
  }
  function cleanFocus(f) {
    if (!f || typeof f !== 'object') return null;
    if (f.simId != null) return { simId: f.simId };
    if (f.objId != null) return { objId: f.objId };
    if (isFinite(+f.x) && isFinite(+f.y)) return { x: +f.x, y: +f.y };
    return null;
  }
  function focusSim(s) { return s ? { simId: s.id } : null; }
  function focusObj(o) { return o ? { objId: o.id } : null; }
  function addMoney(delta, reason) {
    delta = Math.round(num(delta));
    if (!delta) return;
    S.money = Math.round(num(S.money) + delta);
    if (!S.stats) S.stats = { daysPlayed: 0 };
    if (delta > 0) S.stats.earned = num(S.stats.earned) + delta; else S.stats.spent = num(S.stats.spent) - delta;
    emit('money', { money: S.money, delta, reason: reason || '' });
  }
  function setBubble(sim, kind, icon, minutes) {
    if (!sim) return;
    sim.bubble = { kind: kind || 'think', icon: icon || '❔', until: nowAbs() + (minutes || 4) };
    emit('bubble', { simId: sim.id });
  }

  // --------------------------------------------------------------- objects
  function def(type) { return (D() && D().CATALOG && D().CATALOG[type]) || null; }
  function rebuildObjMap() {
    localVer++;
    objMap = new Map();
    for (const o of S.objects) if (o && o.id != null) objMap.set(o.id, o);
    objMapRef = S.objects; objMapLen = S.objects.length;
  }
  function objById(id) {
    if (id == null || !S) return null;
    if (objMapRef !== S.objects || objMapLen !== S.objects.length) rebuildObjMap();
    const o = objMap.get(id);
    if (o && o.id === id) return o;
    return null;
  }
  function objectsChanged() {
    rebuildObjMap();
    guard(() => WO().rebuild());
    emit('objects');
  }
  function removeObject(o, silent) {
    if (!o) return;
    const i = S.objects.indexOf(o);
    if (i >= 0) S.objects.splice(i, 1);
    if (!silent) objectsChanged(); else rebuildObjMap();
  }
  function rotSize(d, rot) { return (rot & 1) ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; }
  function footTiles(o) {
    const d = def(o.type);
    if (!d) return [{ x: o.x, y: o.y }];
    const sz = rotSize(d, normRot(o.rot));
    const out = [];
    for (let j = 0; j < sz.h; j++) for (let i = 0; i < sz.w; i++) out.push({ x: o.x + i, y: o.y + j });
    return out;
  }
  function objCenter(o) {
    const d = def(o.type);
    if (!d) return { x: o.x, y: o.y };
    const sz = rotSize(d, normRot(o.rot));
    return { x: o.x + (sz.w - 1) / 2, y: o.y + (sz.h - 1) / 2 };
  }
  // world.js rotation of a rot-0 local tile (floats allowed)
  function rotTile(dx, dy, w, h, rot) {
    switch (rot) {
      case 1: return { x: h - 1 - dy, y: dx };
      case 2: return { x: w - 1 - dx, y: h - 1 - dy };
      case 3: return { x: dy, y: w - 1 - dx };
      default: return { x: dx, y: dy };
    }
  }
  function frontDir(rot) {
    switch (normRot(rot)) { case 1: return { x: -1, y: 0 }; case 2: return { x: 0, y: -1 }; case 3: return { x: 1, y: 0 }; default: return { x: 0, y: 1 }; }
  }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < S.lot.w && y < S.lot.h; }
  function walkable(x, y, allow) { return guard(() => !!WO().isWalkable(x, y, allow), false); }
  function edgeOpen(x1, y1, x2, y2) { return guard(() => !WO().edgeBlocked(x1, y1, x2, y2), false); }
  function roomAt(x, y) { return guard(() => WO().roomAt(Math.round(x), Math.round(y)), -1); }

  // ---- per-layout caches (CR-6): slots, object rooms and tile→object maps are recomputed only when the world
  // version, the engine's own change counter or the object list changes (instead of per query).
  let cacheKey = '';
  let slotCache = new Map(), roomCache = new Map(), tileBlk = null, tileItm = null, slotTiles = null;
  function cacheCheck() {
    const W = WO();
    const wv = W && typeof W.version === 'number' ? W.version : 'x' + tickNo;
    const k = wv + '|' + localVer + '|' + (S ? S.objects.length : 0);
    if (k !== cacheKey || !S || objMapRef !== S.objects) {
      cacheKey = k;
      slotCache = new Map(); roomCache = new Map(); tileBlk = null; tileItm = null; slotTiles = null;
    }
  }
  function invalidateCaches() { localVer++; cacheKey = ''; }
  function buildTileMaps() {
    const w = S.lot.w, h = S.lot.h;
    tileBlk = new Array(w * h).fill(null);
    tileItm = new Array(w * h).fill(null);
    for (const o of S.objects) {
      const d = def(o.type);
      if (!d) continue;
      const blk = !d.noBlock;
      const itm = d.noBlock && !d.wall && o.type !== 'rug';
      if (!blk && !itm) continue;
      for (const t of footTiles(o)) {
        if (!inBounds(t.x, t.y)) continue;
        const i = t.y * w + t.x;
        if (blk && !tileBlk[i]) tileBlk[i] = o;
        if (itm && !tileItm[i]) tileItm[i] = o;
      }
    }
  }
  function itemAt(x, y) {
    cacheCheck();
    if (!tileItm) buildTileMaps();
    if (!inBounds(x, y)) return null;
    const o = tileItm[y * S.lot.w + x];
    return o && objById(o.id) === o ? o : null;
  }
  function blockerAt(x, y) {
    cacheCheck();
    if (!tileBlk) buildTileMaps();
    if (!inBounds(x, y)) return null;
    const o = tileBlk[y * S.lot.w + x];
    return o && objById(o.id) === o ? o : null;
  }
  function objRoom(o) {
    cacheCheck();
    const k = o.id;
    if (k != null && roomCache.has(k)) return roomCache.get(k);
    const c = objCenter(o);
    const r = roomAt(Math.round(c.x), Math.round(c.y));
    if (k != null) roomCache.set(k, r);
    return r;
  }

  function dataSlots(o, d) {
    cacheCheck();
    const ck = o.id != null && o.type !== '__tile' ? o.id + ':d' : null;
    if (ck && slotCache.has(ck)) return slotCache.get(ck);
    const out = dataSlotsRaw(o, d);
    if (ck) slotCache.set(ck, out);
    return out;
  }
  function dataSlotsRaw(o, d) {
    const rot = normRot(o.rot);
    const oroom = objRoom(o);
    const out = [];
    const src = d.slots || [];
    for (let i = 0; i < src.length; i++) {
      const s = src[i] || {};
      const dx = num(s.dx), dy = num(s.dy);
      const t = rotTile(dx, dy, d.w, d.h, rot);
      const p = rotTile(dx + num(s.ox), dy + num(s.oy), d.w, d.h, rot);
      const x = o.x + Math.round(t.x), y = o.y + Math.round(t.y);
      const on = !!s.on;
      let usable = true;
      if (!on) {
        usable = inBounds(x, y) && walkable(x, y);
        // never use a slot on the other side of a wall (e.g. a TV seen from outside the house)
        if (usable && oroom >= 0 && !d.noBlock) {
          const r = roomAt(x, y);
          if (r !== oroom && !adjacentOpen(o, x, y)) usable = false;
        }
      }
      const slot = { index: i, x, y, px: o.x + p.x, py: o.y + p.y, facing: normAngle(num(s.facing) - rot * HALF_PI), on, usable };
      if (num(s.penalty) > 0) slot.penalty = num(s.penalty);   // preference among slots (M.world.nearestReachable)
      out.push(slot);
    }
    return out;
  }
  function adjacentOpen(o, x, y) {
    for (const t of footTiles(o)) {
      if (Math.abs(t.x - x) + Math.abs(t.y - y) === 1 && edgeOpen(t.x, t.y, x, y)) return true;
    }
    return false;
  }
  // Tiles around a footprint (and the item's own tile when it does not block) as slots.
  // Cached per layout: callers must copy before mutating (Object.assign({}, s, ...)).
  function adjacentSlots(o, d) {
    cacheCheck();
    const ck = o.id != null && o.type !== '__tile' ? o.id + ':a' : null;
    if (ck && slotCache.has(ck)) return slotCache.get(ck);
    const out = adjacentSlotsRaw(o, d);
    if (ck) slotCache.set(ck, out);
    return out;
  }
  function adjacentSlotsRaw(o, d) {
    const tiles = footTiles(o);
    const set = new Set(tiles.map((t) => t.x + ',' + t.y));
    const out = [];
    let idx = 0;
    if (d.noBlock) {
      for (const t of tiles) {
        out.push({ index: idx++, x: t.x, y: t.y, px: t.x, py: t.y, facing: null, on: false, usable: inBounds(t.x, t.y) && walkable(t.x, t.y) });
      }
    }
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const t of tiles) {
      for (const dd of dirs) {
        const nx = t.x + dd[0], ny = t.y + dd[1];
        if (set.has(nx + ',' + ny)) continue;
        const usable = inBounds(nx, ny) && walkable(nx, ny) && edgeOpen(t.x, t.y, nx, ny);
        out.push({ index: idx++, x: nx, y: ny, px: nx, py: ny, facing: Math.atan2(t.x - nx, t.y - ny), on: false, usable });
      }
    }
    return out;
  }
  function tileAdjSlots(x, y) {
    return adjacentSlotsRaw({ x, y, rot: 0, type: '__tile' }, { w: 1, h: 1, noBlock: false });
  }
  // Tiles that are standing slots of some interactive object (social meeting spots avoid them, SIM-7).
  function isSlotTile(x, y) {
    cacheCheck();
    if (!slotTiles) {
      slotTiles = new Set();
      for (const o of S.objects) {
        const d = def(o.type);
        if (!d || !d.interactions || !d.interactions.length || d.approach === 'adjacent' || d.noBlock) continue;
        for (const sl of dataSlots(o, d)) if (!sl.on) slotTiles.add(sl.x + ',' + sl.y);
      }
    }
    return slotTiles.has(x + ',' + y);
  }

  // ---- characters standing still on a floor tile (SIM-7): 'idle' (may be asked to step aside),
  // 'busy' (using something there / fainted) or 'social' (talking or waiting for a partner).
  let standCache = { tick: -1, map: null };
  function standers() {
    if (standCache.tick === tickNo && standCache.map) return standCache.map;
    const map = new Map();
    for (const s of S.sims) {
      if (s.hidden) continue;
      const a = s.queue && s.queue[0];
      let mode = null;
      if (s.data && s.data.nudge) mode = null;
      else if (!a) mode = 'idle';
      else if (a.kind === 'walk') mode = a.phase === 'walk' ? null : 'idle';
      else if (a.phase === 'walk') mode = null;
      else if (a.phase === 'route') mode = 'idle';
      else if (a.effect === 'faint') mode = 'busy';
      else if (a.kind === 'social') mode = 'social';
      else if (a.slot && a.slot.on) mode = null;          // on the furniture, not on a floor tile
      else mode = 'busy';
      if (!mode) continue;
      const k = Math.round(num(s.x)) + ',' + Math.round(num(s.y));
      const prev = map.get(k);
      if (!prev || (prev.mode === 'idle' && mode !== 'idle')) map.set(k, { sim: s, mode });
    }
    standCache = { tick: tickNo, map };
    return map;
  }
  function standerAt(x, y, except) {
    const e = standers().get(x + ',' + y);
    if (!e || e.sim === except) {
      if (e && e.sim === except) {
        // another character may share the tile with `except`
        for (const s of S.sims) {
          if (s === except || s.hidden || Math.round(num(s.x)) !== x || Math.round(num(s.y)) !== y) continue;
          const a = s.queue && s.queue[0];
          if (a && (a.phase === 'walk' || (a.slot && a.slot.on && a.phase !== 'route'))) continue;
          return { sim: s, mode: !a || a.phase === 'route' || a.kind === 'walk' ? 'idle' : a.kind === 'social' ? 'social' : 'busy' };
        }
      }
      return null;
    }
    return e;
  }
  function objSlots(o, it) {
    const d = def(o.type);
    if (!d) return [];
    if ((it && it.approach === 'adjacent') || d.approach === 'adjacent') return adjacentSlots(o, d);
    return dataSlots(o, d);
  }
  function holdsSlot(a) {
    return !!a && a.useObjId != null && a.slotIdx != null &&
      (a.phase === 'walk' || a.phase === 'enter' || a.phase === 'do' || a.phase === 'exit');
  }
  function slotHolder(objId, idx, except) {
    for (const s of S.sims) {
      if (s === except || s.hidden) continue;
      const a = s.queue && s.queue[0];
      if (holdsSlot(a) && a.useObjId === objId && a.slotIdx === idx) return s;
    }
    return null;
  }
  function usersOf(objId, except) {
    const out = [];
    for (const s of S.sims) {
      if (s === except || s.hidden) continue;
      const a = s.queue && s.queue[0];
      if (!a || a.kind !== 'object') continue;
      if ((a.objId === objId || a.tgtId === objId || a.useObjId === objId) &&
        (a.phase === 'walk' || a.phase === 'enter' || a.phase === 'do' || a.phase === 'exit')) out.push(s);
    }
    return out;
  }
  function freeSlots(sim, o, it) {
    const out = [];
    for (const s of objSlots(o, it)) {
      if (!s.usable) continue;
      if (it && typeof it.slot === 'number' && s.index !== it.slot) continue;
      if (slotHolder(o.id, s.index, sim)) continue;
      const c = Object.assign({}, s, { objId: o.id });
      if (!s.on && sim) {
        const st = standerAt(s.x, s.y, sim);
        if (st && st.mode !== 'idle') continue;                    // someone is using / talking on that tile
        if (st) c.penalty = num(c.penalty) + 3;                    // idle: they will step aside if chosen
      }
      out.push(c);
    }
    return out;
  }
  function seatSlots(sim, target, it, maxDist) {
    const out = [];
    const tc = objCenter(target);
    const troom = objRoom(target);
    const needFacing = it && (it.key === 'watch' || it.key === 'listen');
    for (const o of S.objects) {
      const d = def(o.type);
      if (!d || !d.seat || o.broken) continue;
      const c = objCenter(o);
      if (dist(c.x, c.y, tc.x, tc.y) > (maxDist || 7)) continue;
      if (troom >= 0 && objRoom(o) !== troom) continue;
      for (const s of dataSlots(o, d)) {
        if (!s.on) continue;
        if (slotHolder(o.id, s.index, sim)) continue;
        if (needFacing) {
          const vx = tc.x - s.px, vy = tc.y - s.py, L = Math.hypot(vx, vy) || 1;
          const dot = (Math.sin(s.facing) * vx + Math.cos(s.facing) * vy) / L;
          if (dot < 0.5) continue;
        }
        out.push(Object.assign({}, s, { objId: o.id, seat: true }));
      }
    }
    return out;
  }
  function diningSeats(sim) {
    const out = [];
    for (const o of S.objects) {
      const d = def(o.type);
      if (!d || !d.dining || o.broken) continue;
      const f = frontDir(o.rot);
      const tx = o.x + f.x, ty = o.y + f.y;
      const b = blockerAt(tx, ty);
      if (!b || !def(b.type) || !def(b.type).surface) continue;
      for (const s of dataSlots(o, d)) {
        if (!s.on || slotHolder(o.id, s.index, sim)) continue;
        out.push(Object.assign({}, s, { objId: o.id, seat: true, table: { x: tx, y: ty } }));
      }
    }
    return out;
  }

  // --------------------------------------------------------------- characters
  function simById(id) {
    if (id == null || !S) return null;
    for (const s of S.sims) if (s.id === id) return s;
    return null;
  }
  function npcById(id) {
    if (id == null || !S) return null;
    for (const n of S.npcs) if (n.id === id) return n;
    return null;
  }
  function household() { return S.sims.filter((s) => !s.visitor); }
  function presentHousehold() { return S.sims.filter((s) => !s.visitor && !s.hidden); }
  function visitors() { return S.sims.filter((s) => s.visitor); }
  function isScripted(s) { return !!(s.visitor && (SERVICE_ROLES[s.role] || s.role === 'walkby')); }
  function personKey(s) { return s.visitor && s.npcId != null ? s.npcId : s.id; }
  function simTile(s) { return { x: Math.round(num(s.x)), y: Math.round(num(s.y)) }; }

  function mood(sim) {
    if (!sim || !sim.motives) return 0;
    let sum = 0;
    for (const k of D().MOTIVES) sum += num(sim.motives[k]);
    return clamp(sum / 8, -100, 100);
  }
  function moodColor(sim) {
    const m = mood(sim);
    const hue = Math.round(clamp(60 + 60 * m / 100, 0, 120));
    return 'hsl(' + hue + ', 85%, ' + (m < -50 ? 48 : 52) + '%)';
  }
  function lowestMotive(sim) {
    let best = null, bv = Infinity;
    for (const k of D().MOTIVES) {
      if (k === 'room') continue;
      const v = num(sim.motives[k]);
      if (v < bv) { bv = v; best = k; }
    }
    return { key: best, value: bv };
  }

  // --------------------------------------------------------------- relationships
  function relRaw(a, b) {
    // a's opinion of b
    if (!a || !b) return null;
    if (a.visitor) {
      if (b.visitor) return null;
      const n = npcById(a.npcId);
      if (!n) return null;
      if (!n.relationships || typeof n.relationships !== 'object') n.relationships = {};
      return { store: n.relationships, key: b.id };
    }
    if (!a.relationships || typeof a.relationships !== 'object') a.relationships = {};
    return { store: a.relationships, key: personKey(b) };
  }
  function relOf(a, b) {
    const r = relRaw(a, b);
    if (!r) return { daily: 0, lifetime: 0 };
    let e = r.store[r.key];
    if (!e || typeof e !== 'object') e = r.store[r.key] = { daily: 0, lifetime: 0 };
    e.daily = clamp(num(e.daily), -100, 100); e.lifetime = clamp(num(e.lifetime), -100, 100);
    return e;
  }
  function relPeek(a, b) {
    const r = relRaw(a, b);
    if (!r) return { daily: 0, lifetime: 0 };
    const e = r.store[r.key];
    return e && typeof e === 'object' ? { daily: num(e.daily), lifetime: num(e.lifetime) } : { daily: 0, lifetime: 0 };
  }
  function addRel(a, b, daily, lifetime) {
    const e = relOf(a, b);
    if (!e) return;
    e.daily = clamp(e.daily + num(daily), -100, 100);
    e.lifetime = clamp(e.lifetime + num(lifetime), -100, 100);
    e.last = S.time.day;
  }
  // household sim h <-> npc record n
  function npcRel(h, n, create) {
    if (!h.relationships) h.relationships = {};
    let a = h.relationships[n.id];
    if (!a && create) a = h.relationships[n.id] = { daily: 0, lifetime: 0 };
    if (!n.relationships) n.relationships = {};
    let b = n.relationships[h.id];
    if (!b && create) b = n.relationships[h.id] = { daily: 0, lifetime: 0 };
    return { hn: a || { daily: 0, lifetime: 0 }, nh: b || { daily: 0, lifetime: 0 } };
  }
  function addNpcRel(h, n, dHN, dNH) {
    const r = npcRel(h, n, true);
    r.hn.daily = clamp(num(r.hn.daily) + dHN, -100, 100); r.hn.lifetime = clamp(num(r.hn.lifetime) + Math.round(dHN / 4), -100, 100);
    r.nh.daily = clamp(num(r.nh.daily) + dNH, -100, 100); r.nh.lifetime = clamp(num(r.nh.lifetime) + Math.round(dNH / 4), -100, 100);
    r.hn.last = r.nh.last = S.time.day;
  }
  function familyFriends() {
    const fd = D().CAREER_RULES.friendDaily;
    const set = new Set();
    for (const h of household()) {
      for (const n of S.npcs) {
        const r = npcRel(h, n, false);
        if (num(r.hn.daily) >= fd && num(r.nh.daily) >= fd) set.add(n.id);
      }
    }
    return set.size;
  }

  // --------------------------------------------------------------- interactions (defs)
  function baseInter(o) {
    return Object.assign({
      key: '', label: '', icon: '•', anim: 'use', rates: {}, ads: {}, caps: null, rateVary: null,
      duration: 30, minDuration: 0, maxDuration: null, until: null, skill: null, skillRate: 0, cost: 0,
      fun: false, auto: false, visitors: false, slot: 'any', effect: null, requires: null, atten: 'medium',
      seatOk: false, seated: false,
    }, o);
  }
  const FAINT_INTER = baseInter({ key: '_faint', label: 'Desmaiado', icon: '😵', anim: 'sleep', effect: 'faint', duration: null });
  function getInter(o, key) {
    if (key === '_faint') return FAINT_INTER;
    if (!o) return null;
    const d = def(o.type);
    if (!d) return null;
    for (const it of d.interactions) if (it.key === key) return it;
    if (typeof key !== 'string') return null;
    // dynamic interactions
    if (key.indexOf('job:') === 0) {
      const track = key.slice(4);
      const c = D().CAREERS[track];
      if (!c) return null;
      const lv = c.levels[0];
      return baseInter({
        key, label: 'Aceitar vaga: ' + lv.title + ' (' + c.name + ') — ' + fmtMoney(lv.pay) + '/dia',
        icon: c.icon || '💼', anim: o.type === 'computer' ? 'computer' : 'read', effect: 'accept_job', duration: 1,
        seated: o.type === 'computer', data: { track },
      });
    }
    if (key.indexOf('call:') === 0 || key.indexOf('invite:') === 0) {
      const isCall = key.indexOf('call:') === 0;
      const base = d.interactions.find((i) => i.key === (isCall ? 'call_friend' : 'invite'));
      if (!base) return null;
      const npc = npcById(+key.split(':')[1]);
      if (!npc) return null;
      return Object.assign({}, base, {
        key, auto: false, label: (isCall ? 'Ligar para ' : 'Convidar ') + npc.name, data: { npcId: npc.id },
      });
    }
    return null;
  }
  function interListFor(o) {
    const d = def(o.type);
    if (!d) return [];
    const list = d.interactions.slice();
    if (o.type === 'newspaper' && o.offer && D().CAREERS[o.offer]) list.push(getInter(o, 'job:' + o.offer));
    if (o.type === 'computer' && S.jobs && S.jobs.computerSeen === S.time.day && Array.isArray(S.jobs.computer)) {
      for (const t of S.jobs.computer) { const it = getInter(o, 'job:' + t); if (it) list.push(it); }
    }
    return list.filter(Boolean);
  }
  function raisesMotive(it, k) {
    if (!it) return false;
    if (num(it.rates && it.rates[k]) > 0) return true;
    const a = it.ads && it.ads[k];
    return !!(a && (num(a.min) > 0 || num(a.delta) > 0 || (typeof a === 'number' && a > 0)));
  }
  // Fun and Social count as needs when they are the lowest motive or below CRITICAL.needLow (QA LIVE-6:
  // the low-mood refusal advised "Cuide de: Diversão" while refusing every fun action).
  function lowNeed(sim, k) {
    if (!sim || !sim.motives) return false;
    return num(sim.motives[k]) <= D().CRITICAL.needLow || lowestMotive(sim).key === k;
  }
  function isNeedInter(it, sim) {
    if (!it) return false;
    if (it.effect && NEED_EFFECTS[it.effect]) return true;
    for (const k of NEED_MOTIVES) if (raisesMotive(it, k)) return true;
    if (sim) for (const k of ['fun', 'social']) if (lowNeed(sim, k) && raisesMotive(it, k)) return true;
    return false;
  }
  function isNeedSocial(so, sim) {
    if (!so || !sim) return false;
    if (so.key === 'goodbye') return true;
    const ga = so.gainAccept || {};
    if (lowNeed(sim, 'social') && (num(ga.social) > 0 || raisesMotive(so, 'social'))) return true;
    if (lowNeed(sim, 'fun') && (num(ga.fun) > 0 || raisesMotive(so, 'fun'))) return true;
    return false;
  }
  function isSkillHobby(it) { return !!(it && it.skill && it.effect !== 'cook_meal' && it.effect !== 'repair'); }
  function interLabel(o, it) {
    if (it.effect === 'toggle_light') return o && o.on === false ? 'Ligar a luz' : 'Desligar a luz';
    if (it.effect === 'repair') { const d = def(o.type); return (d && d.breakLabel) || it.label; }
    return it.label;
  }

  function anyMealEdible() {
    for (const o of S.objects) if (o.type === 'meal' && !o.spoiled && num(o.servings) > 0) return o;
    return null;
  }
  function someoneCooking(except) {
    for (const s of S.sims) {
      if (s === except) continue;
      for (const a of s.queue || []) if (a.kind === 'object' && a.effect === 'cook_meal') return true;
    }
    return false;
  }
  function findNearest(sim, pred) {
    let best = null, bd = Infinity;
    for (const o of S.objects) {
      if (!pred(o)) continue;
      const c = objCenter(o);
      const dd = dist(sim.x, sim.y, c.x, c.y);
      if (dd < bd) { bd = dd; best = o; }
    }
    return best;
  }
  function anyBroken() { return S.objects.some((o) => o.broken); }

  // Requirements & availability. Returns { ok, reason }.
  function checkRequires(sim, o, it) {
    switch (it.requires) {
      case null: case undefined: case '': return null;
      case 'broken': return o.broken ? null : 'Não está quebrado.';
      case 'notBroken': return o.broken ? 'Está quebrado.' : null;
      case 'dirty': return num(o.dirty) >= D().DIRT.playerClean ? null : 'Já está limpo.';
      case 'canCook': {
        if (!S.objects.some((x) => x.type === 'stove' && !x.broken)) return 'Precisa de um fogão.';
        if (!S.objects.some((x) => def(x.type) && def(x.type).cat === 'appliances' && /^fridge/.test(x.type))) return 'Precisa de uma geladeira.';
        return null;
      }
      case 'edible': return o.spoiled ? 'A comida estragou.' : (num(o.servings) > 0 ? null : 'Acabou a comida.');
      case 'spoiled': return o.spoiled ? null : 'Ainda está boa.';
      case 'hasBills': return S.bills.length ? null : 'Nenhuma conta para pagar.';
      case 'anyBroken': return anyBroken() ? null : 'Nada está quebrado.';
      case 'employed': return sim.career ? null : 'Não está ' + g(sim, 'empregado', 'empregada') + '.';
      case 'thirsty': return o.dead ? 'A planta morreu.' : (num(o.water, 100) < D().PLANT.thirstyBelow ? null : 'Não precisa de água agora.');
      case 'dead': return o.dead ? null : 'A planta está viva.';
      case 'unmade': return o.unmade ? null : 'A cama já está arrumada.';
      case 'myCarpool': return Array.isArray(o.simIds) && o.simIds.indexOf(sim.id) >= 0 ? null : 'Esta carona não é sua.';
      default: return null;
    }
  }
  function availability(sim, o, it, auto) {
    if (!sim || !o || !it) return { ok: false, reason: 'Indisponível.' };
    if (sim.hidden) return { ok: false, reason: 'Fora de casa.' };
    if (sim.visitor && !it.visitors && !sim.role) return { ok: false, reason: 'Só para moradores.' };
    if (sim.visitor && sim.role === 'guest' && !it.visitors) return { ok: false, reason: 'Só para moradores.' };
    if (o.broken && it.effect !== 'repair' && it.effect !== 'dispose' && it.effect !== 'clean_object') {
      return { ok: false, reason: 'Está quebrado.' };
    }
    const rq = checkRequires(sim, o, it);
    if (rq) return { ok: false, reason: rq };
    if (it.cost && num(S.money) < it.cost) return { ok: false, reason: 'Dinheiro insuficiente.' };
    if (it.effect === 'cook_meal') {
      const cost = D().MONEY.foodPerServing;
      if (num(S.money) < cost) return { ok: false, reason: 'Dinheiro insuficiente para comprar comida.' };
      if (auto && (anyMealEdible() || someoneCooking(sim))) return { ok: false, reason: 'Já tem comida.' };
    }
    if (isSkillHobby(it) && mood(sim) < D().CRITICAL.skillMood) return { ok: false, reason: 'Sem disposição (humor ruim).' };
    if (it.effect === 'sleep' && !auto && num(sim.motives.energy) >= D().SLEEP.playerRefuse) return { ok: false, reason: 'Sem sono.' };
    if (it.effect === 'call_friend' || it.effect === 'invite') {
      if (!S.npcs.some((n) => n.known)) return { ok: false, reason: 'Não conhece nenhum vizinho ainda.' };
    }
    if (it.effect === 'accept_job' && it.data && sim.career && sim.career.track === it.data.track) {
      return { ok: false, reason: 'Já trabalha nesta área.' };
    }
    if (it.effect === 'accept_job' && sim.visitor) return { ok: false, reason: 'Só para moradores.' };
    if (it.effect === 'order_pizza' && pizzaPending(null)) return { ok: false, reason: 'Já tem uma pizza a caminho.' };
    return { ok: true, reason: '' };
  }
  function hasCapacity(sim, o, it) {
    const d = def(o.type);
    if (!d) return false;
    if (it.seatOk) {
      const users = usersOf(o.id, sim).filter((s) => { const a = s.queue[0]; return a && a.objId === o.id; }).length;
      if (users >= Math.max(1, d.capacity || 1)) return false;
      if (seatSlots(sim, o, it).length) return true;
    }
    return freeSlots(sim, o, it).length > 0;
  }

  // --------------------------------------------------------------- autonomy scoring
  // Circadian multiplier on sleep/nap Energy ads (design addition): characters prefer to go to bed at night.
  function circadian() {
    const h = hourNow();
    const C = D().AUTONOMY.circadian;
    return num(C[h], 1);
  }
  // Sleep context of a character for this tick: is a bed slot free for them, are they in a night-shift
  // pre-shift window (QA SIM-3) or just back from a night shift.
  function sleepCtx(sim) {
    if (!sim.data) sim.data = {};
    const c = sim.data._sleepCtx;
    if (c && c.tick === tickNo) return c;
    const out = { tick: tickNo, bedFree: false, preShift: false, postShift: false };
    for (const o of S.objects) {
      if (o.broken) continue;
      const d = def(o.type);
      if (!d || d.cat !== 'beds') continue;
      const it = getInter(o, 'sleep');
      if (it && freeSlots(sim, o, it).length) { out.bedFree = true; break; }
    }
    if (!sim.visitor && sim.career) {
      const R = D().CAREER_RULES;
      const sh = shiftWindow(sim);
      if (sh && isNightShift(sh.lv)) {
        const toGo = sh.start - nowAbs();
        if (toGo <= R.preNapHours * 60 && toGo >= R.napAlarmBefore + 20) out.preShift = true;
      }
      if (num(sim.data.lastReturn) && nowAbs() - num(sim.data.lastReturn) < 240 && sim.data.lastReturnNight) out.postShift = true;
    }
    sim.data._sleepCtx = out;
    return out;
  }
  function isNightShift(lv) {
    const R = D().CAREER_RULES;
    return !!lv && (lv.start >= R.nightShiftFrom || lv.start < R.nightShiftTo);
  }
  // Purposeful downtime: skill objects advertise a 'mood' gain when the character is in a good mood and no
  // need is low; the amount follows the personality trait of that skill and the next career level's needs.
  function purposeAd(sim, it) {
    const A = D().AUTONOMY;
    if (sim.visitor || !it.skill || it.effect === 'cook_meal' || it.effect === 'repair') return 0;
    if (mood(sim) < A.purposeMood) return 0;
    for (const k of D().MOTIVES) if (k !== 'room' && num(sim.motives[k]) < A.purposeMinMotive) return 0;
    const lvl = num(sim.skills && sim.skills[it.skill]);
    if (lvl >= 10) return 0;
    let fit = 0.25;
    const tk = D().SKILL_TRAIT[it.skill];
    if (tk) {
      const inv = tk[0] === '-';
      const tv = num(sim.personality[inv ? tk.slice(1) : tk], 5);
      fit = Math.max(fit, (inv ? 10 - tv : tv) / 10);
    } else fit = 0.45;
    let career = 0;
    if (sim.career) {
      const tr = D().CAREERS[sim.career.track];
      const next = tr && tr.levels[sim.career.level];
      const need = next && next.req && next.req.skills ? num(next.req.skills[it.skill]) : 0;
      if (need > Math.floor(lvl)) career = A.purposeCareer;
    }
    return A.purposeBase + A.purposeDelta * fit + career;
  }
  function effectiveAds(sim, o, it, opts) {
    const out = {};
    const P = sim.personality || {}, SK = sim.skills || {};
    for (const k in (it.ads || {})) {
      const v = D().adAmount(it.ads[k], P, SK);
      if (v) out[k] = v;
    }
    const eff = it.effect;
    const critical = !!(opts && opts.critical);
    if (isSleepEff(eff)) {
      const A = D().AUTONOMY, h = hourNow();
      const ctx = sleepCtx(sim);
      if (eff === 'sleep_sofa' && ctx.bedFree && !critical) return {};
      if (!critical) {
        let gate, circ = circadian();
        if (eff === 'sleep') gate = num(A.sleepGate[h], 100);
        else if (eff === 'nap') gate = num(A.napGate[h], 100);
        else gate = num(A.sofaSleepGate[h], 100);
        if (ctx.preShift) { gate = Math.max(gate, 70); circ = 1; }
        else if (ctx.postShift) { gate = Math.max(gate, 40); circ = Math.max(circ, 0.8); }
        if (num(sim.motives.energy) > gate) return {};
        if (out.energy) out.energy *= circ * (eff === 'sleep_sofa' ? num(A.sofaSleepAd, 1) : 1);
      }
    }
    if (it.purpose || (it.skill && it.effect !== 'cook_meal' && it.effect !== 'repair')) {
      const pa = purposeAd(sim, it);
      if (pa > 0) out.mood = num(out.mood) + pa;
    }
    if (eff === 'eat_meal' && o) out.hunger = Math.max(30, num(o.quality, 60));
    if (eff === 'clean_object') {
      const thr = num(sim.personality.neat) >= 7 ? D().DIRT.autoCleanNeat : D().DIRT.autoClean;
      if (num(o.dirty) < thr) return {};
    }
    if (eff === 'dispose' && o && o.type === 'meal' && !o.spoiled) return {};
    if (eff === 'dispose' && o && o.type === 'newspaper' && (!o.read || S.time.day - num(o.day, S.time.day) < 1)) return {};
    if (eff === 'pay_bills') {
      if (!S.bills.length) return {};
      const soon = S.bills.some((b) => num(b.dueDay) - S.time.day <= 1);
      out.mood = num(out.mood) + (soon ? 15 : 0);
      if (num(S.money) < totalBills()) return {};
    }
    if (eff === 'call_friend') {
      const h = hourNow();
      if (h < D().SOCIAL_RULES.callStart || h >= D().SOCIAL_RULES.callEnd) return {};
      if (num(sim.data && sim.data.lastCall, -1e9) > nowAbs() - 240) return {};
    }
    if (eff === 'read_paper' && o && o.read) return {};
    if (eff === 'snack' && num(S.money) < num(it.cost)) return {};
    return out;
  }
  function scoreAds(motives, moodVal, ads) {
    const A = D().AUTONOMY;
    let s = 0;
    for (const k in ads) {
      const amt = num(ads[k]);
      if (!amt) continue;
      const m = k === 'mood' ? moodVal : num(motives[k]);
      if (!D().CURVES[k]) continue;
      const after = clamp(m + amt / A.adDivisor, -100, 100);
      s += A.weight * (D().curve(k, after) - D().curve(k, m));
    }
    return s;
  }
  function canDeliver(sim, o, it) {
    // hide interactions whose positive motive gains are all capped already (avoids "false advertising" loops)
    const r = it.rates || {};
    let anyPos = false;
    for (const k in r) {
      if (num(r[k]) <= 0) continue;
      anyPos = true;
      const cap = it.caps && it.caps[k] != null ? num(it.caps[k]) : 100;
      if (num(sim.motives[k]) < cap - 2) return true;
    }
    if (!anyPos) return true;
    // ads on motives without rates (effect-driven) still count
    for (const k in (it.ads || {})) if (!(k in r)) return true;
    return false;
  }
  function lockKey(objId, key) { return objId + ':' + key; }
  function isLocked(sim, key, ads) {
    const until = num(sim.lockouts && sim.lockouts[key], 0);
    if (until <= nowAbs()) return false;
    if (ads) for (const k in ads) if (k !== 'mood' && num(sim.motives[k], 100) < D().AUTONOMY.lockDoneBypass) return false;
    return true;
  }
  function lock(sim, key, minutes) {
    if (!sim.lockouts || typeof sim.lockouts !== 'object') sim.lockouts = {};
    sim.lockouts[key] = nowAbs() + minutes;
  }
  function pruneLockouts(sim) {
    if (!sim.lockouts) return;
    const n = nowAbs();
    for (const k in sim.lockouts) if (num(sim.lockouts[k]) <= n) delete sim.lockouts[k];
  }
  function criticalMotive(sim) {
    const C = D().CRITICAL, m = sim.motives;
    if (num(m.bladder) <= C.overrideBladder) return 'bladder';
    if (num(m.hunger) <= C.overrideHunger) return 'hunger';
    if (num(m.energy) <= C.overrideEnergy) return 'energy';
    return null;
  }

  // per-pair social fatigue (QA SIM-1): decays exponentially, see AUTONOMY.fatigueHalfLife
  function pairFatigue(sim, t) {
    const F = sim.data && sim.data.fatigue;
    const e = F && F[t.id];
    if (!e) return 0;
    const dtm = Math.max(0, nowAbs() - num(e.t));
    return num(e.v) * Math.pow(0.5, dtm / Math.max(1, D().AUTONOMY.fatigueHalfLife));
  }
  function addFatigue(sim, t, amount) {
    if (!sim || !t) return;
    if (!sim.data) sim.data = {};
    if (!sim.data.fatigue || typeof sim.data.fatigue !== 'object') sim.data.fatigue = {};
    const v = pairFatigue(sim, t) + amount;
    sim.data.fatigue[t.id] = { v: Math.round(v * 100) / 100, t: Math.floor(nowAbs()) };
    // forget partners that are long gone
    for (const k in sim.data.fatigue) {
      const e = sim.data.fatigue[k];
      if (!e || nowAbs() - num(e.t) > 4 * 1440) delete sim.data.fatigue[k];
    }
  }
  function sameSocialCount(sim, t, key, window) {
    const log = (sim.data && sim.data.socialLog) || [];
    const since = nowAbs() - window;
    let n = 0;
    for (const e of log) if (e && e.t > since && e.target === t.id && e.key === key) n++;
    return n;
  }
  function socialCandidates(sim, restrict, att, out) {
    const SR = D().SOCIAL_RULES, A = D().AUTONOMY;
    for (const t of S.sims) {
      if (t === sim || t.hidden || t.asleep) continue;
      if (t.data && t.data.leaving) continue;
      if (sim.visitor && t.visitor) continue;
      if (t.visitor && SERVICE_ROLES[t.role]) continue;
      if (!sim.visitor && sim.role) continue;
      const ta = t.queue && t.queue[0];
      if (ta && (ta.prio >= PRIO.player || ta.kind === 'social' || busyFor(ta))) continue;
      if (!t.visitor || t.role === 'guest') { if (criticalMotive(t)) continue; }   // QA SIM-11
      const rel = relPeek(sim, t);
      const relT = relPeek(t, sim);
      const fat = pairFatigue(sim, t);
      let best = null;
      for (const key in D().SOCIALS) {
        const so = D().SOCIALS[key];
        if (!so.auto) continue;
        if (so.onlyRole && t.role !== so.onlyRole) continue;
        if (!so.onlyRole && t.role === 'walkby') continue;
        if (so.onlyRole === 'walkby' && (sim.visitor || (t.data && t.data.greeted))) continue;
        if (!socialAllowed(sim, t, so, rel)) continue;
        if (so.mean && !(num(sim.personality.nice) <= 3 || rel.daily < -20)) continue;
        // guests do not tease or insult their hosts unless they already dislike them (QA improvement)
        if (so.mean && sim.visitor && rel.daily > SR.guestMeanBelow) continue;
        if (!so.mean && rel.daily < SR.hideFriendlyBelow && so.key !== 'talk') continue;
        const ads = {};
        const P = sim.personality, SK = sim.skills;
        // check-tree style: friendly socials advertise less when a rejection is likely
        const boost = Math.min(num(A.relBoostCap, 1.5), Math.max(0, 1 + rel.daily / SR.relAdScale));
        const scale = (so.mean ? 1 : boost) * (so.mean ? 1 : acceptChance(sim, t, so));
        for (const k in (so.ads || {})) { const v = D().adAmount(so.ads[k], P, SK) * scale; if (v) ads[k] = v; }
        if (num(sim.motives.social) <= -70 && ads.social) ads.social *= 1.5;
        if (restrict && !(ads[restrict] > 0)) continue;
        const lk = 'soc:' + t.id + ':' + key;
        if (isLocked(sim, lk, ads)) continue;
        let sc = scoreAds(sim.motives, mood(sim), ads);
        if (!(sc > 0)) continue;
        if (relT.daily < -50) sc *= 0.3;
        // fatigue with this partner and repeats of the same social today
        if (so.key !== 'greet') {
          sc /= (1 + num(A.fatigueK) * fat);
          const reps = sameSocialCount(sim, t, key, num(A.repeatDayWindow, 1440));
          sc /= (1 + num(A.repeatDayK) * (so.key === 'talk' ? 0.4 : 1) * reps);
        }
        sc /= (1 + att[SR.atten] * dist(sim.x, sim.y, t.x, t.y));
        // one candidate per partner: the best social (the top-N cut then sees objects too)
        if (!best || sc > best.score) best = { kind: 'social', target: t, so, score: sc };
      }
      if (best) out.push(best);
    }
  }
  function busyFor(a) {
    if (!a) return false;
    if (a.kind === 'object') {
      if (a.effect && BUSY_EFFECTS[a.effect]) return true;
      if (BUSY_KEYS[a.interaction]) return true;
      if (isSleepEff(a.effect)) return true;
    }
    return false;
  }
  function socialAllowed(sim, t, so, rel) {
    if (so.onlyRole && t.role !== so.onlyRole) return false;
    if (rel.daily < num(so.minDaily, -100) || rel.daily > num(so.maxDaily, 100)) return false;
    if (rel.lifetime < num(so.minLifetime, -100)) return false;
    if (so.key === 'insult' && !(num(sim.personality.nice) <= 3 || rel.daily < 30)) return false;
    return true;
  }

  // Rough minutes an autonomous choice will take (used to avoid starting long things right before work).
  function estMinutes(it) {
    switch (it.effect) {
      case 'cook_meal': return 40;
      case 'eat_meal': return 25;
      case 'sleep': case 'sleep_sofa': return 480;
      case 'nap': return 60;
      case 'repair': return 90;
      default: break;
    }
    if (it.duration != null) return num(it.duration) + 3;
    return Math.max(10, num(it.minDuration)) + 3;
  }
  function minutesUntilWork(sim) {
    if (sim.visitor || !sim.career) return Infinity;
    const sh = shiftWindow(sim);
    if (!sh) return Infinity;
    return sh.start - D().CAREER_RULES.autoGoBefore - nowAbs();
  }
  function runAutonomy(sim, restrict, opts) {
    const A = D().AUTONOMY;
    const att = sim.visitor ? D().ATTENUATION_VISITOR : D().ATTENUATION;
    const md = mood(sim);
    const cands = [];
    const budget = restrict ? Infinity : minutesUntilWork(sim);
    const critOpts = (restrict || (opts && opts.critical)) ? { critical: true } : null;
    for (const o of S.objects) {
      const d = def(o.type);
      if (!d || !d.interactions || !d.interactions.length) continue;
      if (o.type === 'carpool') continue;
      for (const it of interListFor(o)) {
        if (!it || it.auto === false) continue;
        if (sim.visitor && !it.visitors) continue;
        const av = availability(sim, o, it, true);
        if (!av.ok) continue;
        const ads = effectiveAds(sim, o, it, critOpts);
        let any = false;
        for (const k in ads) if (ads[k]) { any = true; break; }
        if (!any) continue;
        if (restrict && !(ads[restrict] > 0)) continue;
        // long things are not started right before work; sleep is fine (the alarm / carpool wakes them, SIM-3)
        if (budget < 180 && estMinutes(it) > budget && !(isSleepEff(it.effect) && budget >= 40)) continue;
        if (isLocked(sim, lockKey(o.id, it.key), ads)) continue;
        if (!canDeliver(sim, o, it)) continue;
        if (!hasCapacity(sim, o, it)) continue;
        let sc;
        if (isSleepEff(it.effect) && ads.energy) {
          const press = num(D().AUTONOMY.sleepPressure[hourNow()]);
          const mm = press ? Object.assign({}, sim.motives, { energy: clamp(num(sim.motives.energy) - press, -100, 100) }) : sim.motives;
          sc = scoreAds(mm, md, ads);
        } else sc = scoreAds(sim.motives, md, ads);
        if (!(sc > 0)) continue;
        const c = objCenter(o);
        sc /= (1 + num(att[it.atten || 'medium'], 0.3) * dist(sim.x, sim.y, c.x, c.y));
        cands.push({ kind: 'object', o, it, score: sc });
      }
    }
    if (!restrict || restrict === 'social') socialCandidates(sim, restrict, att, cands);
    const minScore = sim.seated ? A.minScoreSeated : A.minScore;
    const valid = cands.filter((c) => c.score > minScore).sort((a, b) => b.score - a.score);
    const top = valid.slice(0, A.topN);
    if (!top.length) return null;
    let total = 0;
    for (const c of top) total += c.score;
    let r = rand() * total;
    for (const c of top) { r -= c.score; if (r <= 0) return c; }
    return top[top.length - 1];
  }

  // --------------------------------------------------------------- actions & queue
  function makeAction(o) {
    return Object.assign({
      id: nid(), kind: 'object', objId: null, interaction: null, targetSimId: null, x: null, y: null,
      source: 'auto', phase: 'route', path: [], progress: 0, slot: null, elapsed: 0, label: '', icon: '',
      cancel: false, prio: PRIO.auto, stage: 0, tgtId: null, useObjId: null, slotIdx: null, effect: null,
      rates: null, caps: null, data: {},
    }, o);
  }
  function started(a) { return !!a && a.phase !== 'route'; }
  function enqueue(sim, act) {
    const q = sim.queue;
    const P = num(act.prio, PRIO.auto);
    if (q.length && q[0].nocancel && P < PRIO.critical) {
      // current action cannot be interrupted: queue behind it
    }
    let idx = q.length;
    while (idx > 0 && num(q[idx - 1].prio, PRIO.auto) < P) idx--;
    if (idx === 0 && q.length) {
      const cur = q[0];
      if (cur.nocancel) idx = 1;
      else if (!started(cur) && !(cur.data && cur.data.respond)) {
        // not started yet: drop it (an autonomous filler) or push it back
        if (cur.source === 'auto') { q.shift(); cancelHooks(sim, cur); } else idx = 0;
      } else {
        cur.cancel = true;
        idx = 1;
      }
    }
    q.splice(idx, 0, act);
    if (P >= PRIO.player) {
      // TS1 queue skip: pending autonomous fillers behind a player command are dropped
      for (let i = q.length - 1; i > idx; i--) {
        if (q[i].source === 'auto' && num(q[i].prio) < PRIO.urgent) { const r = q.splice(i, 1)[0]; cancelHooks(sim, r); }
      }
    }
    return true;
  }
  function cancelHooks(sim, act) {
    if (!act) return;
    guard(() => {
      if (act.kind === 'object') {
        const eff = EFFECTS[act.effect];
        if (eff && eff.cancel) eff.cancel(sim, act);
      } else if (act.kind === 'social' && !act.data.respond) {
        const t = simById(act.targetSimId);
        if (t) dropRespond(t, act.id);
        if (t && t.role === 'walkby' && t.data && t.data.waitFor === sim.id) t.data.waitFor = null;
      }
    });
  }
  function dropRespond(t, pairId) {
    for (let i = 0; i < t.queue.length; i++) {
      const a = t.queue[i];
      if (a.kind === 'social' && a.data && a.data.respond && a.data.pairId === pairId) {
        if (i === 0) { a.phase = 'done'; } else t.queue.splice(i, 1);
        return;
      }
    }
  }
  function finishQueueHead(sim) {
    const a = sim.queue.shift();
    if (!a) return;
    if (a.source === 'auto' && a.kind === 'object' && a.objId != null && !a.failed) lock(sim, lockKey(a.objId, a.interaction), D().AUTONOMY.lockDone);
    if (a.source === 'auto' && a.kind === 'social' && !a.data.respond && !a.failed) lock(sim, 'soc:' + a.targetSimId + ':' + a.interaction, D().AUTONOMY.lockDone);
    sim.seated = false;
    if (a.effect !== 'faint') sim.asleep = false;
    if (!sim.data) sim.data = {};
    const idle = randRange(D().AUTONOMY.idleMin, D().AUTONOMY.idleMax);
    sim.data.nextAutoAt = Math.max(num(sim.data.nextAutoAt), nowAbs() + idle);
    if (a.source === 'player') sim.data.nextAutoAt = Math.max(sim.data.nextAutoAt, nowAbs() + D().AUTONOMY.playerDelay);
  }
  function failAction(sim, act, reason, lockMin) {
    if (act.kind === 'object' && act.objId != null && act.source === 'auto') lock(sim, lockKey(act.objId, act.interaction), lockMin || D().AUTONOMY.lockFail);
    if (act.kind === 'social' && act.source === 'auto') lock(sim, 'soc:' + act.targetSimId + ':' + act.interaction, lockMin || D().AUTONOMY.lockFail);
    act.failed = true;
    if (reason && act.source === 'player') {
      setBubble(sim, 'think', '🚫', 4);
      notify(firstName(sim) + ': ' + reason, 'bad', focusSim(sim));
    } else if (reason) setBubble(sim, 'think', '❔', 3);
    cancelHooks(sim, act);
    if (sim.seated || sim.asleep || isOnBlocked(sim)) { act.phase = 'exit'; act.completed = false; act.data.noFinish = true; }
    else act.phase = 'done';
  }
  function isOnBlocked(sim) { const t = simTile(sim); return !walkable(t.x, t.y); }
  // A cancelled walk/enter that left the character on (or stepping onto) furniture steps back off it first
  // instead of ending there (QA SIM-6: responders danced inside the sofa).
  function cancelToExit(sim, act) {
    if (sim.seated || sim.asleep || isOnBlocked(sim)) {
      act.phase = 'exit'; act.completed = false; act.data.noFinish = true; act.data.exitInit = false;
      act.rates = null;
    } else act.phase = 'done';
  }

  // Routing to candidate tiles (multi-goal A* through M.world.nearestReachable)
  function routeTo(sim, act, cands, noRun) {
    if (!cands || !cands.length) return false;
    let res = null;
    const W = WO();
    const st = simTile(sim);
    if (W.nearestReachable) {
      res = guard(() => W.nearestReachable(sim.x, sim.y, cands, {}), null);
    } else {
      let best = null;
      for (const c of cands) {
        const p = guard(() => W.findPath(sim.x, sim.y, c.x, c.y, c.on ? { allowObjId: c.objId } : {}), null);
        if (!p) continue;
        const cost = (p.cost != null ? p.cost : p.length) + num(c.penalty);
        if (!best || cost < best.cost) best = { candidate: c, path: p, cost };
      }
      res = best;
    }
    if (!res || !res.candidate) return false;
    const c = res.candidate;
    act.path = (res.path || []).map((p) => ({ x: p.x, y: p.y }));
    act.progress = 0;
    act.slot = {
      x: c.x, y: c.y, px: c.px != null ? c.px : c.x, py: c.py != null ? c.py : c.y,
      facing: c.facing != null ? c.facing : null, on: !!c.on,
    };
    act.slotIdx = c.index != null ? c.index : null;
    act.useObjId = c.objId != null ? c.objId : null;
    const len = res.path && res.path.cost != null ? res.path.cost : act.path.length;
    act.data.run = !noRun && len > D().WALK.runAbove;
    if (c.on) {
      const n = act.path.length;
      act.data.exit = n >= 2 ? act.path[n - 2] : (walkable(st.x, st.y) ? st : null);
    } else act.data.exit = null;
    if (c.table) act.data.table = c.table;
    if (c.seat) act.data.seatId = c.objId;
    act.phase = 'walk';
    return true;
  }
  function stepWalk(sim, act, dt) {
    const W = D().WALK;
    const speed = W.tilesPerMinute * (act.data.run ? W.runFactor : 1);
    let budget = speed * dt;
    sim.anim = 'walk';
    sim.seated = false;
    let guardN = 0;
    while (budget > 1e-9 && act.progress < act.path.length && guardN++ < 64) {
      const p = act.path[act.progress];
      const dx = p.x - sim.x, dy = p.y - sim.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1e-6) sim.facing = normAngle(Math.atan2(dx, dy));
      if (d <= budget) {
        sim.x = p.x; sim.y = p.y; budget -= d; act.progress++;
        // validate the next step (objects may have been placed in buy mode)
        if (act.progress < act.path.length) {
          const nx = act.path[act.progress];
          const last = act.progress === act.path.length - 1;
          if (!walkable(nx.x, nx.y) && !(last && act.slot && act.slot.on)) {
            act.data.reroutes = num(act.data.reroutes) + 1;
            act.phase = 'route';
            return false;
          }
        }
      } else {
        sim.x += dx / d * budget; sim.y += dy / d * budget; budget = 0;
      }
    }
    return act.progress >= act.path.length;
  }
  function stepEnter(sim, act, dt) {
    if (!act.data.enterFrom) act.data.enterFrom = { x: sim.x, y: sim.y };
    const slot = act.slot;
    const tx = slot ? num(slot.px, slot.x) : sim.x, ty = slot ? num(slot.py, slot.y) : sim.y;
    const from = act.data.enterFrom;
    const dd = dist(from.x, from.y, tx, ty);
    const dur = dd < 0.05 ? 0 : 0.5;
    act.data.enterT = num(act.data.enterT) + dt;
    const t = dur ? Math.min(1, act.data.enterT / dur) : 1;
    sim.x = from.x + (tx - from.x) * t;
    sim.y = from.y + (ty - from.y) * t;
    if (dd > 0.05 && t < 1) sim.facing = normAngle(Math.atan2(tx - from.x, ty - from.y));
    if (t >= 1) {
      if (slot && slot.facing != null) sim.facing = normAngle(slot.facing);
      return true;
    }
    return false;
  }
  function exitTarget(sim, act) {
    const t = simTile(sim);
    if (walkable(t.x, t.y) && !(act.slot && act.slot.on)) return null;
    const e = act.data.exit;
    if (e && walkable(e.x, e.y)) return { x: e.x, y: e.y };
    const nw = guard(() => WO().nearestWalkable ? WO().nearestWalkable(sim.x, sim.y) : null, null);
    if (nw) return nw;
    return walkable(t.x, t.y) ? null : null;
  }
  function stepExit(sim, act, dt) {
    if (!act.data.exitInit) {
      act.data.exitInit = true;
      act.data.exitFrom = { x: sim.x, y: sim.y };
      act.data.exitTo = exitTarget(sim, act);
      act.data.exitT = 0;
      act.data.exitDur = (act.data.exitTo || sim.seated || sim.asleep) ? 0.5 : 0;
    }
    act.data.exitT += dt;
    const dur = act.data.exitDur;
    const t = dur ? Math.min(1, act.data.exitT / dur) : 1;
    const to = act.data.exitTo;
    if (to) {
      const fr = act.data.exitFrom;
      sim.x = fr.x + (to.x - fr.x) * t;
      sim.y = fr.y + (to.y - fr.y) * t;
    }
    sim.anim = sim.asleep ? 'stretch' : (dur ? 'idle' : sim.anim);
    if (t >= 1) {
      sim.seated = false;
      sim.asleep = false;
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------- object action processing
  function actInter(act) {
    if (act.interaction === '_faint') return FAINT_INTER;
    const o = objById(act.objId);
    const t = act.data && act.data.type;
    if (o && (!t || o.type === t)) return getInter(o, act.interaction);
    if (t && def(t)) return getInter({ id: act.objId, type: t, x: 0, y: 0, rot: 0 }, act.interaction);
    return o ? getInter(o, act.interaction) : null;
  }
  function stepObjectAction(sim, act, dt) {
    const it = act.interaction === '_faint' ? FAINT_INTER : actInter(act);
    const eff = EFFECTS[act.effect] || null;
    const owner = objById(act.objId);
    if (!it || (act.objId != null && !owner && act.phase !== 'exit' && !(eff && eff.ownerOptional && eff.ownerOptional(sim, act)))) {
      failAction(sim, act, 'O objeto não existe mais.', 30);
      return;
    }
    switch (act.phase) {
      case 'route': {
        if (act.cancel) { cancelHooks(sim, act); act.phase = 'done'; return; }
        if (!act.data.began) {
          act.data.began = true;
          if (eff && eff.begin) {
            const r = eff.begin(sim, act, it);
            if (r === false) return;          // begin() already failed the action
            if (act.phase !== 'route') return;
          }
        }
        if (act.data.inPlace) { act.phase = 'enter'; act.slot = null; return; }
        let cands;
        if (eff && eff.cands) cands = eff.cands(sim, act, it);
        else {
          const tgt = objById(act.tgtId != null ? act.tgtId : act.objId);
          if (!tgt) { failAction(sim, act, 'O objeto não existe mais.', 30); return; }
          cands = freeSlots(sim, tgt, it);
          if (it.seatOk) {
            const seats = seatSlots(sim, tgt, it, it.key === 'read' || /^study/.test(it.key) ? 8 : 7);
            const users = usersOf(tgt.id, sim).filter((s) => s.queue[0] && s.queue[0].objId === tgt.id).length;
            if (users >= Math.max(1, (def(tgt.type) || {}).capacity || 1)) cands = [];
            else cands = seats.concat(cands.map((c) => Object.assign(c, { penalty: 8 })));
          }
        }
        if (!cands || !cands.length) {
          act.data.waited = num(act.data.waited) + dt;
          // a player command waits its turn when somebody is using the object (a phone call, a shower…),
          // otherwise it gives up quickly (no usable spot at all)
          const tgt0 = objById(act.tgtId != null ? act.tgtId : act.objId);
          const maxWait = tgt0 && usersOf(tgt0.id, sim).length ? 30 : 10;
          if (act.source === 'player' && act.data.waited < maxWait) { sim.anim = 'idle'; if (!sim.bubble) setBubble(sim, 'think', '⏳', 2); return; }
          failAction(sim, act, 'Não há lugar livre para isso agora.', 20);
          return;
        }
        if (!routeTo(sim, act, cands, !!act.data.noRun)) {
          failAction(sim, act, 'Não consegue chegar lá.', D().AUTONOMY.lockFail);
          return;
        }
        if (num(act.data.reroutes) > 4) { failAction(sim, act, 'Não consegue chegar lá.', D().AUTONOMY.lockFail); return; }
        return;
      }
      case 'walk': {
        if (act.cancel) { cancelHooks(sim, act); cancelToExit(sim, act); return; }
        if (act.useObjId != null && !objById(act.useObjId)) { act.phase = 'route'; return; }
        const holder = act.useObjId != null && act.slotIdx != null ? slotHolder(act.useObjId, act.slotIdx, sim) : null;
        if (holder) { act.phase = 'route'; act.data.reroutes = num(act.data.reroutes) + 1; return; }
        if (act.slot && !act.slot.on && !act.data.nudged && act.path.length - act.progress <= 2) {
          // somebody idle stands on the spot: ask them to step aside (SIM-7)
          act.data.nudged = true;
          const st = standerAt(act.slot.x, act.slot.y, sim);
          if (st && st.mode === 'idle') stepAside(st.sim, { x: act.slot.x, y: act.slot.y });
        }
        if (stepWalk(sim, act, dt)) { act.phase = 'enter'; act.data.enterFrom = null; act.data.enterT = 0; }
        return;
      }
      case 'enter': {
        if (act.cancel) { cancelHooks(sim, act); cancelToExit(sim, act); return; }
        sim.anim = 'idle';
        if (stepEnter(sim, act, dt)) startDo(sim, act, it, eff);
        return;
      }
      case 'do': {
        doPhase(sim, act, it, eff, dt);
        return;
      }
      case 'exit': {
        if (stepExit(sim, act, dt)) {
          if (!act.data.finished) {
            act.data.finished = true;
            if (!act.data.noFinish) {
              guard(() => { if (eff && eff.finish) eff.finish(sim, act, it, !!act.completed); });
              guard(() => afterUse(sim, act, it, !!act.completed));
            }
          }
          act.phase = 'done';
        }
        return;
      }
      default: act.phase = 'done';
    }
  }
  function startDo(sim, act, it, eff) {
    if (!act.data.didDo && !act.stage && it.requires) {
      const o = objById(act.objId);
      const rq = o ? checkRequires(sim, o, it) : null;
      if (rq) {
        // the chore is no longer needed (someone else did it): drop it quietly
        if (act.source === 'player') setBubble(sim, 'think', '❔', 3);
        act.failed = true;
        cancelHooks(sim, act);
        if (sim.seated || sim.asleep || isOnBlocked(sim) || (act.slot && act.slot.on)) {
          act.phase = 'exit'; act.completed = false; act.data.noFinish = true; act.data.exitInit = false;
        } else act.phase = 'done';
        return;
      }
    }
    act.phase = 'do';
    act.elapsed = 0;
    act.data.didDo = true;
    sim.seated = !!((act.slot && act.slot.on) || it.seated || act.data.seatId);
    sim.anim = it.anim || 'use';
    const rates = {}, caps = {};
    const P = sim.personality, SK = sim.skills;
    for (const k in (it.rates || {})) {
      let r = num(it.rates[k]);
      if (r > 0 && it.rateVary && it.rateVary[k]) r *= D().rateMultiplier(it.rateVary[k], P, SK);
      rates[k] = r;
      if (it.caps && it.caps[k] != null) caps[k] = num(it.caps[k]);
    }
    if (act.data.seatId != null) {
      const seat = objById(act.data.seatId);
      const sit = seat ? getInter(seat, 'sit') : null;
      if (sit) {
        if (!(num(rates.comfort) > 0)) act.data.passive = { comfort: true };   // seat comfort never ends the action
        rates.comfort = num(sit.rates.comfort);
        caps.comfort = sit.caps && sit.caps.comfort != null ? num(sit.caps.comfort) : 100;
      }
      if (it.key === 'watch' || it.key === 'listen') sim.anim = 'sit';
    }
    act.rates = rates;
    act.caps = caps;
    if (eff && eff.start) {
      const r = eff.start(sim, act, it);
      if (r === false) return;
    }
  }
  function doPhase(sim, act, it, eff, dt) {
    act.elapsed += dt;
    if (act.cancel && !act.nocancel) { endDo(sim, act, it, eff, false); return; }
    let res = null;
    if (eff && eff.tick) res = eff.tick(sim, act, it, dt);
    if (act.phase !== 'do') return;
    if (res == null) res = genericEnd(sim, act, it);
    skillTick(sim, act, it, dt / 60);
    if (isSkillHobby(it) && mood(sim) < D().CRITICAL.skillMood && act.elapsed > 1) {
      setBubble(sim, 'think', '😞', 4);
      res = 'done';
    }
    if (res == null && act.source === 'auto' && it.purpose && act.elapsed >= num(it.minDuration)) {
      const low = lowestMotive(sim);
      if (act.elapsed >= D().AUTONOMY.purposeAutoMax || low.value < D().AUTONOMY.purposeMinMotive - 10) res = 'done';
    }
    if (res === 'done') endDo(sim, act, it, eff, true);
    else if (res === 'fail') endDo(sim, act, it, eff, false);
  }
  function endDo(sim, act, it, eff, completed) {
    if (completed && eff && eff.stageDone) {
      const more = guard(() => eff.stageDone(sim, act, it), false);
      if (more) return;               // the effect set up its next stage (phase changed)
      if (act.phase !== 'do') return;
    }
    act.completed = completed;
    act.rates = null;
    act.phase = 'exit';
    act.data.exitInit = false;
  }
  function nextStage(act, stage, opts) {
    act.stage = stage;
    act.phase = (opts && opts.inPlace) ? 'enter' : 'route';
    act.elapsed = 0;
    act.rates = null; act.caps = null;
    act.path = []; act.progress = 0;
    act.useObjId = null; act.slotIdx = null;
    if (!(opts && opts.inPlace)) act.slot = null;
    act.data.enterFrom = null; act.data.enterT = 0; act.data.waited = 0; act.data.reroutes = 0;
    act.data.inPlace = !!(opts && opts.inPlace);
    if (opts && opts.tgtId !== undefined) act.tgtId = opts.tgtId;
    return true;
  }
  function genericEnd(sim, act, it) {
    const dur = act.data.duration != null ? act.data.duration : it.duration;
    if (dur != null) return act.elapsed >= dur ? 'done' : null;
    const minD = num(it.minDuration);
    if (act.elapsed < minD) return null;
    if (it.maxDuration && act.elapsed >= it.maxDuration) return 'done';
    const rates = act.rates || {}, caps = act.caps || {};
    if (it.until && it.until.length) {
      let all = true;
      for (const k of it.until) {
        const r = num(rates[k]);
        if (r <= 0) continue;
        const target = Math.min(95, (caps[k] != null ? caps[k] : 100) - 0.5);
        if (num(sim.motives[k]) < target) { all = false; break; }
      }
      if (all) return 'done';
    }
    let anyPos = false, canMore = false;
    const passive = act.data.passive || {};
    for (const k in rates) {
      if (num(rates[k]) <= 0 || passive[k]) continue;
      anyPos = true;
      const cap = caps[k] != null ? caps[k] : 100;
      if (num(sim.motives[k]) < cap - 0.5) { canMore = true; break; }
    }
    if (anyPos && !canMore) return 'done';
    return null;
  }
  function skillTick(sim, act, it, dtH) {
    const k = it.skill;
    if (!k || !it.skillRate || sim.visitor) return;
    if (it.effect === 'cook_meal' && !(act.stage === 1 || act.stage === 2)) return;
    if (mood(sim) < D().CRITICAL.skillMood) return;
    const G = D().SKILL_GAIN;
    const cur = clamp(num(sim.skills[k]), 0, 10);
    if (cur >= 10) return;
    const lvl = Math.floor(cur);
    let mult = 1;
    const tk = D().SKILL_TRAIT[k];
    if (tk) {
      const inv = tk[0] === '-';
      const tv = num(sim.personality[inv ? tk.slice(1) : tk], 5);
      const v = inv ? 10 - tv : tv;
      mult = v >= 7 ? G.traitHigh : v >= 5 ? G.traitMid : 1;
    }
    if (act.data.partner) mult *= G.partner;
    const gain = it.skillRate / (1 + G.levelK * lvl) * mult * dtH;
    const next = Math.min(10, cur + gain);
    sim.skills[k] = next;
    if (Math.floor(next) > lvl) {
      notify(firstName(sim) + ' melhorou em ' + D().SKILL_LABELS[k] + ': nível ' + Math.floor(next) + '!', 'good');
      setBubble(sim, 'think', D().SKILL_ICONS[k] || '⭐', 4);
    }
  }
  function afterUse(sim, act, it, completed) {
    const o = objById(act.objId);
    if (!o || !act.data.didDo) return;
    if (it.effect && USE_EXCLUDED_EFFECTS[it.effect]) return;
    if (sim.role && SERVICE_ROLES[sim.role]) return;
    const d = def(o.type);
    if (!d) return;
    if (act.elapsed < 0.5 && !completed) return;
    o.uses = num(o.uses) + 1;
    if (d.dirties && it.effect !== 'cook_meal') o.dirty = clamp(num(o.dirty) + d.dirties, 0, D().DIRT.max);
    if (d.breaks && !o.broken && nowAbs() >= num(o.immuneUntil) && rand() < d.breaks) breakObject(o);
  }
  function breakObject(o) {
    const d = def(o.type);
    o.broken = true;
    if (o.type === 'toilet' || o.type === 'toilet_lux') notify('O ' + d.name.toLowerCase() + ' entupiu!', 'bad');
    else notify(d.name + ' quebrou! Conserte ou chame um técnico pelo telefone.', 'bad');
    if (d.cat === 'plumbing' && o.type !== 'toilet' && o.type !== 'toilet_lux' || o.type === 'dishwasher') {
      const s = dataSlots(o, d).find((x) => x.usable && !x.on) || dataSlots(o, d)[0];
      const c = s ? { x: s.x, y: s.y } : objCenter(o);
      spawnPuddle(Math.round(c.x), Math.round(c.y), true);
    }
    objectsChanged();
  }
  function spawnPuddle(x, y, silent) {
    const spots = [{ x, y }];
    for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r) spots.push({ x: x + dx, y: y + dy });
    }
    for (const p of spots) {
      if (!inBounds(p.x, p.y) || !walkable(p.x, p.y) || itemAt(p.x, p.y)) continue;
      const o = addSystemObject('puddle', p.x, p.y, 0, {});
      if (o) { if (!silent) objectsChanged(); return o; }
    }
    return null;
  }
  function addSystemObject(type, x, y, rot, extra, force) {
    const ok = guard(() => WO().canPlace(type, x, y, rot || 0), { ok: true });
    if (!ok || (!ok.ok && !force)) return null;
    const o = Object.assign({ id: nid(), type, x, y, rot: rot || 0, dirty: 0, broken: false, boughtDay: S.time.day, price: 0, uses: 0 }, extra || {});
    S.objects.push(o);
    rebuildObjMap();
    guard(() => WO().rebuild());
    return o;
  }

  // --------------------------------------------------------------- effects
  function fridgeOf(sim, act) {
    let f = objById(act.data.fridgeId);
    if (!f) f = findNearest(sim, (o) => /^fridge/.test(o.type) && !o.broken);
    return f;
  }
  function servingTile(sim, act) {
    const stove = objById(act.data.stoveId);
    const ref = stove ? objCenter(stove) : { x: sim.x, y: sim.y };
    let best = null, bd = Infinity;
    for (const o of S.objects) {
      const d = def(o.type);
      if (!d || !d.surface || o.broken) continue;
      for (const t of footTiles(o)) {
        if (itemAt(t.x, t.y)) continue;
        if (!tileAdjSlots(t.x, t.y).some((s) => s.usable)) continue;
        const ok = guard(() => WO().canPlace('meal', t.x, t.y, 0), { ok: true });
        if (ok && !ok.ok) continue;
        const dd = dist(ref.x, ref.y, t.x, t.y) + (d.dining ? 0 : 0);
        if (dd < bd) { bd = dd; best = { x: t.x, y: t.y }; }
      }
    }
    if (best) return best;
    // floor next to the cook
    const st = simTile(sim);
    if (!itemAt(st.x, st.y) && walkable(st.x, st.y)) return { x: st.x, y: st.y, floor: true };
    return null;
  }
  function plateTile(sim, act) {
    const tb = act.data.table;
    const cands = [];
    if (tb) cands.push(tb);
    const st = simTile(sim);
    for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = st.x + dx, y = st.y + dy;
      const b = blockerAt(x, y);
      if (b && def(b.type) && def(b.type).surface) cands.push({ x, y });
    }
    for (const c of cands) {
      if (itemAt(c.x, c.y)) continue;
      const ok = guard(() => WO().canPlace('dirty_plate', c.x, c.y, 0), { ok: true });
      if (ok && ok.ok) return c;
    }
    // floor
    const e = act.data.exit && walkable(act.data.exit.x, act.data.exit.y) ? act.data.exit : st;
    const fl = [e].concat([[0, 1], [1, 0], [0, -1], [-1, 0]].map((d) => ({ x: e.x + d[0], y: e.y + d[1] })));
    for (const c of fl) {
      if (!inBounds(c.x, c.y) || !walkable(c.x, c.y) || itemAt(c.x, c.y)) continue;
      return c;
    }
    return null;
  }
  function disposalTarget(sim) {
    return findNearest(sim, (o) => o.type === 'dishwasher' && !o.broken) ||
      findNearest(sim, (o) => o.type === 'trash_can') ||
      findNearest(sim, (o) => o.type === 'sink' && !o.broken);
  }
  function itemCands(sim, o) {
    if (!o) return [];
    const d = def(o.type);
    return adjacentSlots(o, d || { w: 1, h: 1, noBlock: true }).filter((s) => s.usable && !slotHolder(o.id, s.index, sim))
      .map((s) => {
        const c = Object.assign({}, s, { objId: o.id });
        const st = s.x === Math.round(num(sim.x)) && s.y === Math.round(num(sim.y)) ? null : standerAt(s.x, s.y, sim);
        if (st && st.mode !== 'idle') c.penalty = num(c.penalty) + 6;
        else if (st) c.penalty = num(c.penalty) + 2;
        return c;
      });
  }
  function frontCands(sim, o) {
    if (!o) return [];
    return freeSlots(sim, o, null);
  }
  function mealQuality(sim, act) {
    const ME = D().MEAL;
    const fridge = objById(act.data.fridgeId);
    const fm = fridge ? num(ME.fridgeMod[fridge.type], 9) : 9;
    let q = ME.base + fm + (act.data.noCounter ? 0 : ME.counterPrep) + ME.stove + ME.perSkill * num(sim.skills.cooking);
    if (act.data.burnt) q *= 0.5;
    return Math.round(q);
  }
  function chargeOrFail(sim, act, cost, what) {
    if (num(S.money) < cost) { failAction(sim, act, 'Dinheiro insuficiente' + (what ? ' para ' + what : '') + '.', 60); return false; }
    addMoney(-cost, what || '');
    return true;
  }
  function knownNpcs() { return S.npcs.filter((n) => n.known); }
  function pickNpc(sim, preferId, notOnLot) {
    if (preferId != null) { const n = npcById(preferId); if (n) return n; }
    const list = knownNpcs().filter((n) => !notOnLot || !S.sims.some((s) => s.npcId === n.id));
    if (!list.length) return null;
    let best = null, bv = -Infinity;
    for (const n of list) {
      const r = npcRel(sim, n, false);
      const v = num(r.hn.daily) + num(r.nh.daily) + rand() * 30 - (num(n.lastCallDay) === S.time.day ? 25 : 0);
      if (v > bv) { bv = v; best = n; }
    }
    return best;
  }
  function scheduleEvent(kind, at, extra) {
    S.events.push(Object.assign({ id: nid(), kind, at }, extra || {}));
  }
  function eventPending(kind) {
    return S.events.some((e) => e.kind === kind) || S.sims.some((s) => s.visitor && s.role === kind);
  }
  // a pizza is on its way, being delivered, or already ordered by someone's queued phone call (QA LIVE-12)
  function pizzaPending(exceptAct) {
    if (S.events.some((e) => e.kind === 'pizza')) return true;
    if (S.sims.some((s) => s.visitor && s.role === 'pizza' && !(s.data && num(s.data.stage) >= 2))) return true;
    for (const s of S.sims) for (const a of s.queue || []) {
      if (a !== exceptAct && a.kind === 'object' && a.effect === 'order_pizza' && !a.cancel && !a.failed) return true;
    }
    return false;
  }

  const EFFECTS = {
    // ---- sleeping
    sleep: {
      start(sim, act) { sim.asleep = true; sim.anim = 'sleep'; act.data.sleepStart = nowAbs(); },
      tick(sim, act) {
        sim.asleep = true; sim.anim = 'sleep';
        const C = D().CRITICAL, SL = D().SLEEP, m = sim.motives;
        if (act.elapsed < 1) return 'continue';
        if (num(m.bladder) <= C.wakeBladder || num(m.hunger) <= C.wakeHunger) return 'done';
        if (act.data.alarm) return 'done';
        const h = hourNow();
        const night = h >= SL.nightStart || h < SL.nightEnd;
        if (act.elapsed < 60) return 'continue';
        if (night) return 'continue';
        if (num(m.energy) >= 95) return 'done';
        if (h >= SL.wakeHour && h < SL.wakeHour + 3 && num(m.energy) >= SL.wakeEnergy) return 'done';
        return 'continue';
      },
      finish(sim, act) {
        sim.asleep = false;
        const bed = objById(act.objId);
        if (bed && act.elapsed > 60 && def(bed.type) && def(bed.type).cat === 'beds') { bed.unmade = true; emit('objects'); }
      },
    },
    // "Dormir no sofá": sleeps like in a bed (night rules, alarm) on a sofa/armchair when no bed is free (SIM-4)
    sleep_sofa: {
      start(sim, act) { sim.asleep = true; sim.anim = 'sleep'; act.data.sleepStart = nowAbs(); },
      tick(sim, act, it, dt) { return EFFECTS.sleep.tick(sim, act, it, dt); },
      finish(sim) { sim.asleep = false; },
    },
    nap: {
      start(sim, act) { sim.asleep = true; act.data.sleepStart = nowAbs(); },
      tick(sim, act) {
        sim.asleep = true; sim.anim = 'sleep';
        const C = D().CRITICAL, m = sim.motives;
        if (num(m.bladder) <= C.wakeBladder || num(m.hunger) <= C.wakeHunger) return 'done';
        return null;
      },
      finish(sim) { sim.asleep = false; },
    },
    faint: {
      ownerOptional() { return true; },
      start(sim, act) {
        sim.asleep = true; sim.anim = 'sleep';
        act.rates = { energy: D().RATE.floorSleepEnergy, comfort: D().CRITICAL.faintComfortRate };
        act.caps = { energy: 100 };
      },
      tick(sim, act) {
        sim.asleep = true; sim.anim = 'sleep';
        const C = D().CRITICAL;
        act.rates = { energy: D().RATE.floorSleepEnergy, comfort: C.faintComfortRate };
        const e = num(sim.motives.energy);
        // wakes at about −40 (not +20: 11 h on the floor wiped whole days); a bladder at −100 causes the accident
        // in critical() while still fainted instead of ending the faint (QA SIM-5 flicker loop)
        if (e >= C.faintWake) return 'done';
        // a worker who fainted right before the shift comes to for the carpool (QA SIM-3 / improvement)
        if (e >= C.faintWorkWake && headingToCarpool(sim)) return 'done';
        return 'continue';
      },
      finish(sim) { sim.asleep = false; },
    },
    // ---- bathroom
    toilet: {
      finish(sim, act, it, completed) {
        if (!completed || sim.visitor) return;
        if (num(sim.personality.neat) >= 6) {
          const sink = findNearest(sim, (o) => o.type === 'sink' && !o.broken);
          if (sink && dist(sim.x, sim.y, sink.x, sink.y) < 8) {
            const a = buildObjectAction(sim, sink, getInter(sink, 'wash'), act.source === 'player' ? 'auto' : act.source);
            if (a) { a.prio = act.prio; sim.queue.splice(1, 0, a); }
          }
        }
      },
    },
    wash_hands: {},
    hot_tub: {
      tick(sim, act) {
        const shared = usersOf(act.objId, sim).some((s) => s.queue[0] && s.queue[0].phase === 'do');
        act.rates.social = shared ? D().RATE.hotSocial : 0;
        return null;
      },
    },
    // ---- food
    snack: {
      start(sim, act, it) {
        if (!chargeOrFail(sim, act, num(it.cost), 'o lanche')) return false;
        const f = objById(act.objId);
        act.data.value = D().MEAL.snackBase + num(D().MEAL.snackFridgeBonus[f ? f.type : ''], 0);
        act.rates = {}; act.caps = { hunger: 100 };
        sim.anim = 'use';
      },
      tick(sim, act) {
        if (act.elapsed < 3) { sim.anim = 'use'; act.rates = {}; return null; }
        sim.anim = 'eat';
        act.rates = { hunger: act.data.value / 5 * 60 };
        return null;
      },
    },
    cook_meal: {
      begin(sim, act) {
        const owner = objById(act.objId);
        const stove = findNearest(sim, (o) => o.type === 'stove' && !o.broken);
        if (!stove) { failAction(sim, act, 'Precisa de um fogão funcionando.', 120); return false; }
        act.data.stoveId = stove.id;
        const fridge = owner && /^fridge/.test(owner.type) ? owner : fridgeOf(sim, act);
        if (!fridge) { failAction(sim, act, 'Precisa de uma geladeira.', 120); return false; }
        act.data.fridgeId = fridge.id;
        act.stage = 0;
        act.tgtId = fridge.id;
        return true;
      },
      cands(sim, act) {
        switch (act.stage) {
          case 0: return frontCands(sim, objById(act.data.fridgeId));
          case 1: return frontCands(sim, objById(act.tgtId));
          case 2: return frontCands(sim, objById(act.data.stoveId));
          case 3: {
            const t = act.data.serve;
            if (!t) return [];
            if (t.floor) return [{ x: t.x, y: t.y, px: t.x, py: t.y, facing: null, on: false, index: null, objId: null }];
            return tileAdjSlots(t.x, t.y).filter((s) => s.usable).map((s) => Object.assign(s, { index: null, objId: null }));
          }
          default: return [];
        }
      },
      start(sim, act) {
        const ME = D().MEAL;
        act.rates = {};
        if (act.stage === 0) {
          sim.anim = 'use';
          // one serving for the cook and for each member at home, awake and hungry (hunger < 60), plus hungry guests
          // (QA: meals for everybody spoiled 1–5 times per 8 days)
          const hungry = (s) => num(s.motives && s.motives.hunger, 0) < 60;
          let servings = presentHousehold().filter((s) => s === sim || (!s.asleep && hungry(s))).length +
            S.sims.filter((s) => s.visitor && s.role === 'guest' && !s.hidden && !(s.data && s.data.leaving) && hungry(s)).length;
          servings = clamp(servings, 1, 8);
          const per = D().MONEY.foodPerServing;
          while (servings > 1 && num(S.money) < servings * per) servings--;
          if (!chargeOrFail(sim, act, servings * per, 'a comida')) return false;
          act.data.servings = servings;
          act.data.paid = servings * per;
          act.data.duration = ME.fridgeMinutes;
        } else if (act.stage === 1) {
          sim.anim = 'cook';
          act.data.duration = ME.prepMinutes;
        } else if (act.stage === 2) {
          sim.anim = 'cook';
          act.data.duration = ME.cookMinutes * Math.max(0.5, 1 - ME.cookSkillCut * num(sim.skills.cooking));
        } else {
          sim.anim = 'use';
          act.data.duration = 1;
        }
      },
      stageDone(sim, act) {
        const ME = D().MEAL;
        if (act.stage === 0) {
          const stove = objById(act.data.stoveId);
          const ref = stove ? objCenter(stove) : { x: sim.x, y: sim.y };
          let best = null, bd = Infinity;
          for (const o of S.objects) {
            if (o.type !== 'counter' || o.broken) continue;
            if (!freeSlots(sim, o, null).length) continue;
            const c = objCenter(o);
            const dd = dist(ref.x, ref.y, c.x, c.y);
            if (dd < bd) { bd = dd; best = o; }
          }
          act.data.duration = null;
          if (best) return nextStage(act, 1, { tgtId: best.id });
          act.data.noCounter = true;
          return nextStage(act, 2, { tgtId: act.data.stoveId });
        }
        if (act.stage === 1) { act.data.duration = null; return nextStage(act, 2, { tgtId: act.data.stoveId }); }
        if (act.stage === 2) {
          const stove = objById(act.data.stoveId);
          if (stove) stove.dirty = clamp(num(stove.dirty) + num((def('stove') || {}).dirties), 0, D().DIRT.max);
          if (rand() < ME.burnChance * (1 - num(sim.skills.cooking) / 10)) {
            act.data.burnt = true;
            notify(firstName(sim) + ' queimou a comida! A refeição ficou menos nutritiva.', 'bad');
            setBubble(sim, 'think', '🔥', 3);
          }
          act.data.serve = servingTile(sim, act);
          act.data.duration = null;
          if (!act.data.serve) { placeMeal(sim, act, simTile(sim)); return false; }
          return nextStage(act, 3, { tgtId: null });
        }
        if (act.stage === 3) {
          placeMeal(sim, act, act.data.serve);
          return false;
        }
        return false;
      },
      cancel(sim, act) {
        if (act.data.paid && num(act.stage) <= 1 && !act.data.placed) {
          addMoney(act.data.paid, 'reembolso');
          act.data.paid = 0;
        }
      },
      // meal placed in stageDone; a cook stopped before the stove refunds the groceries (QA CR-7)
      finish(sim, act, it, completed) { if (!completed) EFFECTS.cook_meal.cancel(sim, act); },
    },
    eat_meal: {
      begin(sim, act) { act.stage = 0; act.tgtId = act.objId; return true; },
      ownerOptional(sim, act) { return act.stage >= 1; },
      cands(sim, act) {
        if (act.stage === 0) {
          const meal = objById(act.objId);
          if (!meal || meal.type !== 'meal' || meal.spoiled || num(meal.servings) <= 0) return [];
          return itemCands(sim, meal);
        }
        if (act.stage === 1) return diningSeats(sim);
        return [];
      },
      start(sim, act) {
        if (act.stage === 0) { sim.anim = 'use'; act.data.duration = 1; act.rates = {}; return; }
        sim.anim = 'eat';
        act.data.duration = D().MEAL.eatMinutes;
        const q = num(act.data.quality, 50);
        act.rates = { hunger: q / D().MEAL.eatMinutes * 60 };
        act.caps = { hunger: 100 };
      },
      tick(sim, act) {
        if (act.stage !== 1) return null;
        sim.anim = 'eat';
        // eating together at the table is social
        const together = S.sims.some((s) => s !== sim && !s.hidden && s.queue[0] && s.queue[0].effect === 'eat_meal' &&
          s.queue[0].stage === 1 && s.queue[0].phase === 'do' && dist(s.x, s.y, sim.x, sim.y) < 2.6);
        act.rates.social = together ? 15 : 0;
        return null;
      },
      stageDone(sim, act) {
        if (act.stage === 0) {
          const meal = objById(act.objId);
          if (!meal || meal.spoiled || num(meal.servings) <= 0) { act.completed = false; act.data.noFinish = true; act.phase = 'exit'; return true; }
          meal.servings = num(meal.servings) - 1;
          act.data.quality = num(meal.quality, 50);
          act.data.food = meal.food || 'home';
          act.data.hasPlate = true;
          if (meal.servings <= 0) removeObject(meal);   // the last serving takes the platter along
          else emit('objects');
          act.data.duration = null;
          if (diningSeats(sim).length) return nextStage(act, 1, { tgtId: null });
          return nextStage(act, 1, { tgtId: null, inPlace: true });
        }
        return false;
      },
      finish(sim, act) {
        if (!act.data.hasPlate) return;
        act.data.hasPlate = false;
        const t = plateTile(sim, act);
        if (t) {
          addSystemObject('dirty_plate', t.x, t.y, 0, { spoilAt: nowAbs() + D().MEAL.plateSpoilHours * 60, spoiled: false }, true);
          objectsChanged();
        }
      },
      cancel(sim, act) { if (act.data.hasPlate) EFFECTS.eat_meal.finish(sim, act); },
    },
    dispose: {
      begin(sim, act) { act.stage = 0; act.tgtId = act.objId; return true; },
      ownerOptional(sim, act) { return act.stage >= 1; },
      cands(sim, act) {
        if (act.stage === 0) {
          const o = objById(act.objId);
          if (!o) return [];
          const d = def(o.type);
          return d && d.approach === 'adjacent' ? itemCands(sim, o) : frontCands(sim, o);
        }
        return frontCands(sim, objById(act.tgtId));
      },
      start(sim, act) { sim.anim = act.stage === 0 ? 'clean' : 'use'; act.data.duration = act.stage === 0 ? 2 : 1; },
      stageDone(sim, act) {
        if (act.stage === 0) {
          const o = objById(act.objId);
          if (o) { act.data.what = o.type; removeObject(o); }
          act.data.duration = null;
          const bin = findNearest(sim, (x) => x.type === 'trash_can');
          if (bin) return nextStage(act, 1, { tgtId: bin.id });
        }
        return false;
      },
    },
    clean_plate: {
      begin(sim, act) { act.stage = 0; act.tgtId = act.objId; return true; },
      ownerOptional(sim, act) { return act.stage >= 1; },
      cands(sim, act) {
        if (act.stage === 0) return itemCands(sim, objById(act.objId));
        return frontCands(sim, objById(act.tgtId));
      },
      start(sim, act) {
        if (act.stage === 0) { sim.anim = 'clean'; act.data.duration = 1; return; }
        const t = objById(act.tgtId);
        sim.anim = t && t.type === 'sink' ? 'wash' : 'use';
        act.data.duration = t && t.type === 'sink' ? 3 : 1;
        if (sim.role === 'maid') act.data.duration *= 0.5;
      },
      stageDone(sim, act) {
        if (act.stage === 0) {
          const o = objById(act.objId);
          if (o) removeObject(o);
          act.data.duration = null;
          const t = disposalTarget(sim);
          if (t) return nextStage(act, 1, { tgtId: t.id });
          return false;
        }
        if (act.stage === 1) {
          const t = objById(act.tgtId);
          if (t && t.type === 'dishwasher' && !t.broken && nowAbs() >= num(t.immuneUntil) && rand() < num((def(t.type) || {}).breaks)) breakObject(t);
        }
        return false;
      },
    },
    mop: {
      start(sim, act) { if (sim.role === 'maid') act.data.duration = 5; },
      finish(sim, act, it, completed) { if (completed) { const o = objById(act.objId); if (o) removeObject(o); } },
    },
    clean_object: {
      start(sim, act) { if (sim.role === 'maid') act.data.duration = 8; },
      finish(sim, act, it, completed) {
        const o = objById(act.objId);
        if (o && completed) { o.dirty = 0; emit('objects'); }
      },
    },
    make_bed: {
      finish(sim, act, it, completed) { const o = objById(act.objId); if (o && completed) { o.unmade = false; emit('objects'); } },
    },
    water: {
      finish(sim, act, it, completed) {
        const o = objById(act.objId);
        if (o && completed && !o.dead) { o.water = 100; o.dryHours = 0; emit('objects'); }
      },
    },
    repair: {
      start(sim, act) {
        const R = D().REPAIR;
        act.data.duration = (sim.role === 'repair') ? R.serviceMinutes : R.baseMinutes / (1 + num(sim.skills && sim.skills.mechanical));
      },
      tick(sim, act) {
        const o = objById(act.objId);
        if (!o || !o.broken) return 'done';
        return null;
      },
      finish(sim, act, it, completed) {
        const o = objById(act.objId);
        if (!o || !completed || !o.broken) return;
        const d = def(o.type);
        const R = D().REPAIR;
        if (!sim.role && d && d.cat === 'electronics') {
          const p = Math.max(0, R.shockBase - R.shockPerPoint * num(sim.skills.mechanical));
          if (rand() < p) {
            const m = sim.motives;
            m.energy = clamp(num(m.energy) - 30, -100, 100);
            m.hygiene = clamp(num(m.hygiene) - 30, -100, 100);
            m.comfort = clamp(num(m.comfort) - 20, -100, 100);
            setBubble(sim, 'think', '⚡', 5);
            notify(firstName(sim) + ' levou um choque tentando consertar: ' + d.name + '. Tente de novo ou chame um técnico.', 'bad');
            return;
          }
        }
        o.broken = false;
        o.immuneUntil = nowAbs() + R.immuneHours * 60;
        notify((sim.role === 'repair' ? g(sim, 'O técnico ', 'A técnica ') + firstName(sim.name.indexOf(' ') > 0 ? { name: sim.name.split(' ').slice(1).join(' ') } : sim) : firstName(sim)) + ' consertou: ' + (d ? d.name : 'objeto') + '.', 'good', focusObj(o));
        objectsChanged();
      },
    },
    toggle_light: {
      finish(sim, act, it, completed) { const o = objById(act.objId); if (o && completed) { o.on = o.on === false; emit('objects'); } },
    },
    // ---- jobs, mail, phone
    find_job: {
      finish(sim, act, it, completed) {
        if (!completed) return;
        ensureJobs();
        S.jobs.computerSeen = S.time.day;
        const txt = S.jobs.computer.map((t) => { const c = D().CAREERS[t]; return c ? c.levels[0].title + ' (' + c.name + ', ' + fmtMoney(c.levels[0].pay) + ')' : t; }).join('; ');
        notify('Vagas no computador hoje: ' + txt + '. Clique no computador para aceitar.', 'career');
      },
    },
    read_paper: {
      finish(sim, act, it, completed) {
        const o = objById(act.objId);
        if (!o || !completed) return;
        o.read = true;
        const c = D().CAREERS[o.offer];
        if (c) notify('Classificados: vaga de ' + c.levels[0].title + ' (' + c.name + '), ' + fmtMoney(c.levels[0].pay) + '/dia, ' + c.levels[0].start + 'h–' + c.levels[0].end + 'h. Clique no jornal para aceitar.', 'career');
      },
    },
    accept_job: {
      finish(sim, act, it, completed) { if (completed && it.data) acceptJob(sim.id, it.data.track); },
    },
    pay_bills: {
      finish(sim, act, it, completed) {
        if (!completed) return;
        if (!S.bills.length) { if (act.source === 'player') notify('As contas já estavam pagas.', 'info'); return; }   // QA CR-8
        const list = S.bills.slice().sort((a, b) => num(a.dueDay) - num(b.dueDay));
        let paid = 0, count = 0;
        for (const b of list) {
          if (num(S.money) < num(b.amount)) break;
          addMoney(-num(b.amount), 'contas');
          paid += num(b.amount); count++;
          S.bills.splice(S.bills.indexOf(b), 1);
        }
        if (count) notify(firstName(sim) + ' pagou ' + count + (count > 1 ? ' contas' : ' conta') + ' (' + fmtMoney(paid) + ').', 'money');
        else notify('Dinheiro insuficiente para pagar as contas.', 'bad', focusObj(objById(act.objId)));
      },
    },
    call_friend: {
      start(sim, act, it) {
        const SR = D().SOCIAL_RULES;
        const npc = pickNpc(sim, it.data ? it.data.npcId : act.data.npcId, false);
        act.data.ok = false;
        act.data.saved = shallow(act.rates);
        act.rates = {};
        if (!npc) { act.data.duration = 1; act.data.msg = 'none'; return; }
        act.data.npcId = npc.id;
        if (!sim.data) sim.data = {};
        sim.data.lastCall = nowAbs();
        npc.lastCallDay = S.time.day;
        const h = hourNow();
        if (h < SR.callStart || h >= SR.callEnd) { act.data.duration = 2; act.data.msg = 'late'; return; }
        if (S.sims.some((s) => s.npcId === npc.id)) { act.data.duration = 2; act.data.msg = 'here'; return; }
        if (rand() < 0.1) { act.data.duration = 2; act.data.msg = 'noanswer'; return; }
        const r = npcRel(sim, npc, true);
        const p = clamp(0.5 + num(r.nh.daily) / 200 + (num(sim.skills.charisma) - 5) * 0.02 + (mood(sim) > 0 ? 0.05 : -0.05), 0.1, 0.95);
        act.data.ok = rand() < p;
        if (act.data.ok) { act.rates = { social: D().RATE.phoneSocial }; act.caps = { social: 100 }; act.data.duration = SR.callMinutes; }
        else { act.data.duration = 4; act.data.msg = 'fail'; }
        setBubble(sim, 'talk', act.data.ok ? '😊' : '☎️', 3);
      },
      finish(sim, act, it, completed) {
        const SR = D().SOCIAL_RULES;
        const npc = npcById(act.data.npcId);
        if (act.data.msg === 'none') { notify(firstName(sim) + ' não conhece ninguém para ligar.', 'info'); return; }
        if (!npc) return;
        if (act.data.msg === 'late') { addNpcRel(sim, npc, 0, SR.callLateDaily); notify(npc.name + ' não gostou da ligação fora de hora.', 'bad'); return; }
        if (act.data.msg === 'noanswer') { notify(npc.name + ' não atendeu o telefone.', 'info'); return; }
        if (act.data.msg === 'here') { notify(npc.name + ' está aqui na sua casa!', 'info'); return; }
        if (act.data.ok) {
          const frac = completed ? 1 : clamp(act.elapsed / SR.callMinutes, 0, 1);
          addNpcRel(sim, npc, Math.round(SR.callSuccessDaily * frac), Math.round(SR.callSuccessDaily * frac));
          if (completed) notify(firstName(sim) + ' teve uma boa conversa com ' + npc.name + ' pelo telefone.', 'good');
        } else {
          addNpcRel(sim, npc, -1, SR.callFailDaily);
          sim.motives.social = clamp(num(sim.motives.social) - 5, -100, 100);
          notify(npc.name + ' não estava a fim de conversar.', 'info');
        }
      },
    },
    invite: {
      finish(sim, act, it, completed) {
        if (!completed) return;
        const SR = D().SOCIAL_RULES;
        const npc = pickNpc(sim, it.data ? it.data.npcId : null, true);
        if (!npc) { notify('Ninguém disponível para convidar agora.', 'info'); return; }
        const h = hourNow();
        if (h < SR.callStart || h >= SR.callEnd - 1) { addNpcRel(sim, npc, 0, SR.callLateDaily); notify(npc.name + ': "Agora? Está muito tarde!"', 'bad'); return; }
        if (S.sims.some((s) => s.npcId === npc.id) || S.events.some((e) => e.kind === 'guest' && e.npcId === npc.id)) {
          notify(npc.name + ' já está a caminho ou aqui.', 'info'); return;
        }
        if (visitors().length >= SR.maxVisitors) { notify('A casa já está cheia de visitas.', 'info'); return; }
        const r = npcRel(sim, npc, true);
        const p = clamp(0.4 + num(r.nh.daily) / 150, 0.05, 0.95);
        if (rand() < p) {
          scheduleEvent('guest', nowAbs() + randInt(SR.inviteArriveMin, SR.inviteArriveMax), { npcId: npc.id, host: sim.id });
          notify(npc.name + ' aceitou o convite e chega em breve!', 'good');
        } else {
          addNpcRel(sim, npc, -1, -1);
          notify(npc.name + ' recusou o convite.', 'info');
        }
      },
    },
    order_pizza: {
      start(sim, act, it) {
        if (pizzaPending(act)) { failAction(sim, act, 'Já tem uma pizza a caminho.', 30); return false; }
        if (!chargeOrFail(sim, act, num(it.cost), 'a pizza')) return false;
        act.data.paid = num(it.cost);
      },
      finish(sim, act, it, completed) {
        if (!act.data.paid) return;
        const w = serviceWorker('pizza');
        scheduleEvent('pizza', nowAbs() + D().SOCIAL_RULES.serviceArrive, w);
        notify('Pizza pedida! ' + roleTitle('pizza', w.gender) + ' ' + w.first + ' chega em cerca de 1 hora.', 'money');
        act.data.paid = 0;
      },
      cancel(sim, act) {
        // a call cut short before it was placed gives the money back
        if (act.data.paid) { addMoney(act.data.paid, 'reembolso'); act.data.paid = 0; }
      },
    },
    call_repair: {
      finish(sim, act, it, completed) {
        if (!completed) return;
        if (eventPending('repair')) { notify('Já há um serviço de conserto a caminho.', 'info'); return; }
        const w = serviceWorker('repair');
        scheduleEvent('repair', nowAbs() + D().SOCIAL_RULES.serviceArrive, w);
        notify(roleTitle('repair', w.gender) + ' ' + w.first + ' foi ' + (w.gender === 'f' ? 'chamada' : 'chamado') + ': chega em cerca de 1 hora (M$ 50 por hora).', 'info');
      },
    },
    call_maid: {
      finish(sim, act, it, completed) {
        if (!completed) return;
        if (eventPending('maid')) { notify('Já há um serviço de limpeza a caminho.', 'info'); return; }
        const w = serviceWorker('maid');
        scheduleEvent('maid', nowAbs() + D().SOCIAL_RULES.serviceArrive, w);
        notify(roleTitle('maid', w.gender) + ' ' + w.first + ' foi ' + (w.gender === 'f' ? 'chamada' : 'chamado') + ': chega em cerca de 1 hora (M$ 10 por hora).', 'info');
      },
    },
    quit_job: {
      finish(sim, act, it, completed) { if (completed) quitJob(sim.id); },
    },
    go_work: {
      start(sim, act) {
        const car = objById(act.objId);
        if (!car || !Array.isArray(car.simIds) || car.simIds.indexOf(sim.id) < 0) { failAction(sim, act, 'A carona já foi embora.', 1); return false; }
        departToWork(sim, car);
        return false;
      },
    },
    check_self: {
      finish(sim, act, it, completed) {
        if (!completed) return;
        const h = num(sim.motives.hygiene);
        setBubble(sim, 'think', h < -20 ? '🤢' : mood(sim) > 30 ? '😎' : '🙂', 3);
      },
    },
    // ---- hobbies
    paint: {
      tick(sim, act) {
        const o = objById(act.objId);
        if (!o || sim.visitor) return null;
        o.paintProgress = num(o.paintProgress) + 1 / 60 * (act.data.lastDt || 0.5);
        if (o.paintProgress >= 3) {
          o.paintProgress = 0;
          const c = num(sim.skills.creativity);
          const price = Math.round(10 + 3 * c * c);
          addMoney(price, 'pintura');
          notify(firstName(sim) + ' terminou um quadro e o vendeu por ' + fmtMoney(price) + '!', 'money');
        }
        return null;
      },
    },
    chess: {
      tick(sim, act) {
        const partner = usersOf(act.objId, sim).find((s) => s.queue[0] && s.queue[0].phase === 'do');
        act.data.partner = !!partner;
        act.rates.social = partner ? 20 : 0;
        if (partner && act.elapsed - num(act.data.relT) >= 30) {
          act.data.relT = act.elapsed;
          addRel(sim, partner, 1, 0);
        }
        return null;
      },
    },
    dance: {
      tick(sim, act) {
        const others = usersOf(act.objId, sim).filter((s) => s.queue[0] && s.queue[0].phase === 'do' && s.queue[0].interaction === 'dance');
        act.rates.social = others.length ? 20 : 0;
        return null;
      },
    },
  };
  function placeMeal(sim, act, tile) {
    if (act.data.placed) return;
    act.data.placed = true;
    const t = tile || simTile(sim);
    const quality = mealQuality(sim, act);
    const extra = {
      servings: num(act.data.servings, 1), quality, food: 'home', spoiled: false,
      spoilAt: nowAbs() + D().MEAL.spoilHours * 60, burnt: !!act.data.burnt, cook: sim.id,
    };
    let o = addSystemObject('meal', t.x, t.y, 0, extra, false);
    if (!o) {
      const st = simTile(sim);
      for (const c of [st, { x: st.x + 1, y: st.y }, { x: st.x - 1, y: st.y }, { x: st.x, y: st.y + 1 }, { x: st.x, y: st.y - 1 }]) {
        if (!inBounds(c.x, c.y) || itemAt(c.x, c.y)) continue;
        o = addSystemObject('meal', c.x, c.y, 0, extra, true);
        if (o) break;
      }
    }
    objectsChanged();
    if (!o) return;
    setBubble(sim, 'talk', '🍽️', 3);
    notify(firstName(sim) + ' preparou uma refeição (' + o.servings + (o.servings > 1 ? ' porções' : ' porção') + ').', 'good');
    if (num(sim.motives.hunger) < 85) {
      const eat = buildObjectAction(sim, o, getInter(o, 'eat'), act.source === 'player' ? 'player' : 'auto');
      if (eat) { eat.prio = act.prio; sim.queue.splice(1, 0, eat); }
    }
  }

  function buildObjectAction(sim, o, it, source) {
    if (!o || !it) return null;
    return makeAction({
      kind: 'object', objId: o.id, interaction: it.key, source: source || 'auto',
      prio: source === 'player' ? PRIO.player : PRIO.auto, effect: it.effect || null,
      label: interLabel(o, it), icon: it.icon || '•',
      data: Object.assign({ type: o.type }, it.data && it.data.npcId != null ? { npcId: it.data.npcId } : {}),
    });
  }

  // --------------------------------------------------------------- socials
  function socialAvailability(sim, t, so, player) {
    if (!sim || !t || sim === t) return { ok: false, reason: 'Indisponível.' };
    if (t.hidden || sim.hidden) return { ok: false, reason: 'Não está aqui.' };
    if (t.asleep) return { ok: false, reason: 'Está dormindo.' };
    if (t.data && t.data.leaving) return { ok: false, reason: 'Está indo embora.' };
    if (t.visitor && SERVICE_ROLES[t.role]) return { ok: false, reason: 'Está trabalhando.' };
    if (sim.visitor && t.visitor) return { ok: false, reason: 'Indisponível.' };
    if (so.onlyRole && t.role !== so.onlyRole) return { ok: false, reason: 'Indisponível.' };
    if (!so.onlyRole && t.role === 'walkby') return { ok: false, reason: 'Cumprimente primeiro.' };
    if (so.key === 'greet' && t.data && t.data.greeted) return { ok: false, reason: 'Já cumprimentou.' };
    const rel = relPeek(sim, t);
    if (rel.daily < num(so.minDaily, -100)) return { ok: false, reason: 'Ainda não são próximos o bastante.' };
    if (rel.daily > num(so.maxDaily, 100)) return { ok: false, reason: 'Já são próximos demais para isso.' };
    if (rel.lifetime < num(so.minLifetime, -100)) return { ok: false, reason: 'Precisam se conhecer melhor.' };
    if (so.key === 'insult' && !(num(sim.personality.nice) <= 3 || rel.daily < 30)) return { ok: false, reason: 'Gentil demais para isso.' };
    return { ok: true, reason: '' };
  }
  function canRespond(t, sim, act) {
    if (!t || t.hidden) return 'no';
    if (t.asleep) return 'no';
    if (t.data && t.data.leaving) return 'no';
    const a = t.queue[0];
    if (!a) return 'ok';
    if (a.kind === 'social' && a.data && a.data.respond && a.data.pairId === act.id) return 'ok';
    if (a.kind === 'social') return 'wait';
    if (a.effect === 'faint' || a.effect === 'go_work') return 'no';
    if (num(a.prio) >= PRIO.player && act.source !== 'player') return 'no';
    if (busyFor(a)) return 'wait';
    return 'ok';
  }
  function pushRespond(t, sim, act) {
    const so = D().SOCIALS[act.interaction];
    const r = makeAction({
      kind: 'social', targetSimId: sim.id, interaction: act.interaction, source: 'auto', prio: PRIO.urgent,
      phase: 'do', label: (so ? so.label : 'Conversar') + ' com ' + firstName(sim), icon: so ? so.icon : '💬',
      data: { respond: true, pairId: act.id },
    });
    enqueue(t, r);
    if (t.role === 'walkby') t.data.waitFor = sim.id;
  }
  // deterministic part of the acceptance score (no random term)
  function acceptBaseScore(sim, t, so) {
    const SR = D().SOCIAL_RULES;
    const daily = relPeek(t, sim).daily;
    const tm = mood(t);
    let bias = 0;
    for (const k in (so.traits || {})) bias += num(so.traits[k]) * (num(t.personality && t.personality[k], 5) - 5);
    const log = (sim.data && sim.data.socialLog) || [];
    const reps = log.filter((e) => e.t > nowAbs() - SR.repeatWindow && e.target === t.id && e.key === so.key).length;
    let score = 0.6 * daily + 0.4 * tm + bias - SR.repeatPenalty * reps;
    if (num(t.motives.hygiene) <= SR.stinkyHygiene || num(sim.motives.hygiene) <= SR.stinkyHygiene) score -= SR.stinkyPenalty;
    if (so.minTargetMood != null && tm < so.minTargetMood) score -= 30;
    score += num(sim.skills && sim.skills.charisma) * 0.5;
    return score;
  }
  // probability that the target accepts (uniform random term of ±randRange)
  function acceptChance(sim, t, so) {
    if (so.acceptBase <= -999) return 1;
    if (so.alwaysLands) return 1;
    const R = D().SOCIAL_RULES.randRange;
    return clamp((acceptBaseScore(sim, t, so) - so.acceptBase + R) / (2 * R), 0, 1);
  }
  function acceptRoll(sim, t, so) {
    const SR = D().SOCIAL_RULES;
    if (so.acceptBase <= -999) return true;
    if (so.alwaysLands) return false;
    return acceptBaseScore(sim, t, so) + (rand() * 2 - 1) * SR.randRange >= so.acceptBase;
  }
  function meetCands(sim, t) {
    const tx = Math.round(t.x), ty = Math.round(t.y);
    const out = [];
    const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const r of ring) {
      const x = tx + r[0], y = ty + r[1];
      if (!inBounds(x, y) || !walkable(x, y)) continue;
      if (Math.abs(r[0]) + Math.abs(r[1]) === 1 && !edgeOpen(tx, ty, x, y)) continue;
      if (Math.abs(r[0]) + Math.abs(r[1]) === 2 && (!edgeOpen(tx, ty, x, ty) || !edgeOpen(x, ty, x, y))) continue;
      if (S.sims.some((s) => s !== sim && s !== t && !s.hidden && Math.round(s.x) === x && Math.round(s.y) === y)) continue;
      out.push({ x, y, px: x, py: y, facing: Math.atan2(tx - x, ty - y), on: false, index: null, objId: null, penalty: Math.abs(r[0]) + Math.abs(r[1]) === 2 ? 0.3 : 0 });
    }
    return out;
  }
  // Integration fix: two characters that start a social while (almost) on top of each other step apart
  // first, to a free neighbouring tile centre about one tile from the partner (the social poses assume ~1 tile).
  function socialSpacing(sim, t) {
    const d = dist(sim.x, sim.y, t.x, t.y);
    if (d >= 0.75) return null;
    const ang = d > 0.05 ? Math.atan2(sim.x - t.x, sim.y - t.y) : num(sim.facing) + Math.PI;
    let best = null, bestScore = Infinity;
    for (const c of meetCands(sim, t)) {
      const cd = dist(c.x, c.y, t.x, t.y);
      if (cd < 0.75) continue;
      const st = simTile(sim);
      if (Math.abs(c.x - st.x) + Math.abs(c.y - st.y) === 1 && !edgeOpen(st.x, st.y, c.x, c.y)) continue;
      let da = Math.abs(normAngle(Math.atan2(c.x - t.x, c.y - t.y) - ang));
      if (da > Math.PI) da = 2 * Math.PI - da;
      const score = Math.abs(cd - 1) + 0.35 * da + num(c.penalty);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best ? { fx: sim.x, fy: sim.y, x: best.x, y: best.y } : null;
  }
  function stepSocial(sim, act, dt) {
    const t = simById(act.targetSimId);
    if (act.data.respond) { stepRespond(sim, act, dt, t); return; }
    const so = D().SOCIALS[act.interaction];
    if (!so || !t || t.hidden) { failAction(sim, act, 'Não está mais aqui.', 30); return; }
    switch (act.phase) {
      case 'route': {
        if (act.cancel) { cancelHooks(sim, act); act.phase = 'done'; return; }
        const av = socialAvailability(sim, t, so, act.source === 'player');
        if (!av.ok) { failAction(sim, act, av.reason, 30); return; }
        if (t.role === 'walkby' && t.data) t.data.waitFor = sim.id;
        const d0 = dist(sim.x, sim.y, t.x, t.y);
        const st = simTile(sim), tt = simTile(t);
        if (d0 <= 1.6 && (Math.abs(st.x - tt.x) + Math.abs(st.y - tt.y) <= 1 ? edgeOpen(st.x, st.y, tt.x, tt.y) : true) && !(st.x === tt.x && st.y === tt.y)) {
          act.path = []; act.slot = null; act.phase = 'enter'; act.data.enterT = 0; act.data.enterFrom = null; return;
        }
        if (num(act.data.reroutes) > 5) { failAction(sim, act, 'Não consegue alcançar.', 30); return; }
        const cands = meetCands(sim, t);
        if (!routeTo(sim, act, cands, false)) { failAction(sim, act, 'Não consegue alcançar.', 45); return; }
        act.slot.facing = null;
        act.data.meet = { x: t.x, y: t.y };
        return;
      }
      case 'walk': {
        if (act.cancel) { cancelHooks(sim, act); act.phase = 'done'; return; }
        const m = act.data.meet;
        if (m && dist(m.x, m.y, t.x, t.y) > 1.5) { act.data.reroutes = num(act.data.reroutes) + 1; act.phase = 'route'; return; }
        if (stepWalk(sim, act, dt)) { act.phase = 'enter'; act.data.enterT = 0; act.data.enterFrom = null; act.slot = null; }
        return;
      }
      case 'enter': {
        if (act.cancel) { cancelHooks(sim, act); act.phase = 'done'; return; }
        sim.anim = 'idle';
        sim.facing = normAngle(Math.atan2(t.x - sim.x, t.y - sim.y));
        if (dist(sim.x, sim.y, t.x, t.y) > 2.2) { act.data.reroutes = num(act.data.reroutes) + 1; act.phase = 'route'; return; }
        const st = canRespond(t, sim, act);
        if (st === 'no') { failAction(sim, act, firstName(t) + ' não pode agora.', 30); return; }
        if (st === 'wait') {
          act.data.waited = num(act.data.waited) + dt;
          if (act.data.waited > 10) { failAction(sim, act, firstName(t) + ' está ocupado(a).', 30); return; }
          return;
        }
        const ta = t.queue[0];
        if (!(ta && ta.kind === 'social' && ta.data && ta.data.respond && ta.data.pairId === act.id)) {
          if (!t.queue.some((a) => a.data && a.data.respond && a.data.pairId === act.id)) pushRespond(t, sim, act);
          act.data.waited = num(act.data.waited) + dt;
          if (act.data.waited > 12) { failAction(sim, act, firstName(t) + ' está ocupado(a).', 30); return; }
          return;
        }
        if (ta.phase !== 'do') return;
        // keep a natural conversation distance before starting
        if (!act.data.spaced) {
          if (act.data.spaceTo === undefined) act.data.spaceTo = socialSpacing(sim, t);
          const sp = act.data.spaceTo;
          if (sp) {
            act.data.spaceT = num(act.data.spaceT) + dt;
            const k = Math.min(1, act.data.spaceT / 0.6);
            sim.x = sp.fx + (sp.x - sp.fx) * k; sim.y = sp.fy + (sp.y - sp.fy) * k;
            sim.anim = 'walk';
            if (k < 1) { sim.facing = normAngle(Math.atan2(sp.x - sp.fx, sp.y - sp.fy)); return; }
            sim.facing = normAngle(Math.atan2(t.x - sim.x, t.y - sim.y));
          }
          act.data.spaced = true;
        }
        // start
        act.phase = 'do';
        act.elapsed = 0;
        act.data.accepted = acceptRoll(sim, t, so);
        const g = act.data.accepted ? so.gainAccept : null;
        act.rates = {};
        act.caps = {};
        if (g) {
          const dur = Math.max(1, num(so.duration, 5));
          if (num(g.social) > 0) { act.rates.social = g.social / dur * 60; act.caps.social = 100; }
          if (num(g.fun) > 0) { act.rates.fun = g.fun / dur * 60; act.caps.fun = 100; }
          ta.rates = shallow(act.rates); ta.caps = shallow(act.caps);
        }
        ta.data.anim = so.targetAnim || so.anim;
        ta.data.accepted = act.data.accepted;
        sim.anim = so.anim;
        setBubble(sim, 'talk', so.icon, Math.min(4, num(so.duration, 4)));
        if (!sim.data) sim.data = {};
        if (!Array.isArray(sim.data.socialLog)) sim.data.socialLog = [];
        sim.data.socialLog.push({ t: nowAbs(), target: t.id, key: so.key });
        if (sim.data.socialLog.length > 12) sim.data.socialLog.splice(0, sim.data.socialLog.length - 12);
        return;
      }
      case 'do': {
        act.elapsed += dt;
        sim.anim = so.anim;
        sim.facing = normAngle(Math.atan2(t.x - sim.x, t.y - sim.y));
        const ta = t.queue[0];
        if (!(ta && ta.data && ta.data.pairId === act.id)) { act.phase = 'done'; act.failed = true; return; }
        const dur = Math.max(1, num(so.duration, 5));
        if (!act.data.reacted && act.elapsed >= dur * 0.45) {
          act.data.reacted = true;
          const icon = so.key === 'insult' ? (num(t.personality.nice) >= 5 ? '😢' : '😠')
            : act.data.accepted ? (so.key === 'joke' || so.key === 'tickle' ? '😂' : so.key === 'kiss' || so.key === 'hug' ? '❤️' : '😊') : '😒';
          setBubble(t, so.key === 'goodbye' || so.key === 'greet' ? 'talk' : 'think', icon, 3);
          if (so.key === 'insult' && num(t.personality.nice) >= 5) ta.data.anim = 'cry';
          else if (so.key === 'insult') ta.data.anim = 'angry';
          else if (!act.data.accepted && so.acceptBase > -999) ta.data.anim = 'angry';
        }
        if (act.cancel || act.elapsed >= dur) {
          finishSocial(sim, t, act, so, !act.cancel);
          act.phase = 'done';
          act.rates = null;
        }
        return;
      }
      default:
        act.phase = 'done';
    }
  }
  function stepRespond(sim, act, dt, init) {
    act.elapsed += dt;
    const ia = init && init.queue[0];
    if (!init || init.hidden || !ia || ia.id !== act.data.pairId || ia.phase === 'done' || act.elapsed > 40 || act.cancel) {
      act.phase = 'done'; act.rates = null; return;
    }
    sim.seated = false;
    sim.anim = ia.phase === 'do' ? (act.data.anim || 'talk') : 'idle';
    sim.facing = normAngle(Math.atan2(init.x - sim.x, init.y - sim.y));
  }
  function finishSocial(sim, t, act, so, completed) {
    const SR = D().SOCIAL_RULES;
    if (!completed) return;
    const acc = act.data.accepted;
    const k = so.key;
    if (k === 'goodbye') { startLeaving(t); return; }
    if (k === 'greet') {
      if (t.role === 'walkby') {
        t.role = 'guest';
        t.data.greeted = true;
        t.data.waitFor = null;
        t.leaveAt = nowAbs() + randInt(120, 240);
        t.queue = [];
        const npc = npcById(t.npcId);
        if (npc && !npc.known) { npc.known = true; notify('Vocês conheceram ' + npc.name + '! Agora dá para ligar e convidar.', 'good'); }
      }
      addRel(sim, t, so.gainAccept.daily, so.gainAccept.lifetime);
      addRel(t, sim, so.gainAccept.daily, so.gainAccept.lifetime);
      sim.motives.social = clamp(num(sim.motives.social) + num(so.gainAccept.social), -100, 100);
      return;
    }
    if (k === 'insult') {
      const g = so.gainReject;
      addRel(t, sim, g.daily, g.lifetime);
      addRel(sim, t, num(g.initiatorDaily, -3), 0);
      t.motives.fun = clamp(num(t.motives.fun) + num(g.targetFun, -10), -100, 100);
      return;
    }
    if (acc) {
      const g = so.gainAccept;
      const mult = num(sim.personality.outgoing) >= 7 ? SR.outgoingBonus : 1;
      const lt = g.lifetime != null ? g.lifetime : Math.round(g.daily / SR.lifetimeDiv);
      addRel(sim, t, g.daily * mult, lt);
      addRel(t, sim, g.daily * mult, lt);
      if (g.comfort) t.motives.comfort = clamp(num(t.motives.comfort) + g.comfort, -100, 100);
      if (k === 'kiss' && relPeek(sim, t).daily >= 70) setBubble(sim, 'think', '💕', 3);
    } else {
      const g = so.gainReject;
      addRel(sim, t, g.daily, num(g.lifetime));
      addRel(t, sim, Math.round(g.daily / 2), 0);
      sim.motives.social = clamp(num(sim.motives.social) + num(g.social), -100, 100);
    }
  }

  // --------------------------------------------------------------- walk actions
  function stepWalkAction(sim, act, dt) {
    switch (act.phase) {
      case 'route': {
        if (act.cancel) { act.phase = 'done'; return; }
        const tx = Math.round(num(act.x)), ty = Math.round(num(act.y));
        let target = { x: tx, y: ty };
        if (!inBounds(tx, ty) || !walkable(tx, ty)) {
          const nw = guard(() => WO().nearestWalkable ? WO().nearestWalkable(tx, ty) : null, null);
          if (!nw) { failAction(sim, act, 'Não dá para ir até lá.', 1); return; }
          target = nw;
        }
        const cands = [{ x: target.x, y: target.y, px: target.x, py: target.y, facing: null, on: false, index: null, objId: null }];
        if (!routeTo(sim, act, cands, !!act.data.noRun)) { failAction(sim, act, 'Não dá para ir até lá.', 1); return; }
        return;
      }
      case 'walk': {
        if (act.cancel) { act.phase = 'done'; return; }
        if (stepWalk(sim, act, dt)) act.phase = 'done';
        return;
      }
      default: act.phase = 'done';
    }
  }

  function processQueue(sim, dt) {
    let n = 0;
    while (sim.queue.length && n++ < 4) {
      const act = sim.queue[0];
      if (!act || typeof act !== 'object') { sim.queue.shift(); continue; }
      act.data = act.data || {};
      act.data.lastDt = dt;
      const before = act.phase;
      if (act.kind === 'social') stepSocial(sim, act, dt);
      else if (act.kind === 'walk') stepWalkAction(sim, act, dt);
      else stepObjectAction(sim, act, dt);
      if (act.phase === 'done') {
        finishQueueHead(sim);
        if (act.data && act.data.leave && sim.visitor) { removeVisitor(sim); return; }
        continue;
      }
      // allow an immediate follow-up step for instantaneous transitions (route → walk)
      if (before === 'route' && act.phase === 'walk') continue;
      break;
    }
  }

  // --------------------------------------------------------------- queue API
  function queueInteraction(simId, objId, key, source, opts) {
    if (!S) return false;
    const sim = simById(simId);
    const o = objById(objId);
    if (!sim || !o) return false;
    source = source || 'player';
    if (source === 'player' && sim.visitor) return false;
    if (sim.hidden) return false;
    const it = getInter(o, key);
    if (!it) return false;
    const av = availability(sim, o, it, source !== 'player');
    if (!av.ok) {
      if (source === 'player') { setBubble(sim, 'think', '✋', 3); notify(firstName(sim) + ': ' + av.reason, 'bad'); }
      return false;
    }
    if (source === 'player') {
      if (mood(sim) < D().CRITICAL.refuseMood && !isNeedInter(it)) {
        const low = lowestMotive(sim);
        setBubble(sim, 'think', D().MOTIVE_ICONS[low.key] || '😞', 4);
        notify(firstName(sim) + ' está de mau humor e se recusa. Cuide de: ' + D().MOTIVE_LABELS[low.key] + '.', 'bad');
        return false;
      }
      if (sim.queue.filter((a) => a.source === 'player').length >= MAX_PLAYER_ACTIONS) return false;
    }
    const a = buildObjectAction(sim, o, it, source);
    if (opts && typeof opts === 'object') {
      if (opts.npcId != null) a.data.npcId = opts.npcId;
      if (opts.prio != null) a.prio = opts.prio;
    }
    if (it.effect === 'go_work') a.prio = Math.max(a.prio, PRIO.urgent);
    enqueue(sim, a);
    if (source === 'player') { if (!sim.data) sim.data = {}; sim.data.lastCmdAt = nowAbs(); }
    return true;
  }
  function queueSocial(simId, targetSimId, key, source) {
    if (!S) return false;
    const sim = simById(simId), t = simById(targetSimId);
    const so = D().SOCIALS[key];
    source = source || 'player';
    if (!sim || !t || !so || sim === t) return false;
    if (source === 'player' && sim.visitor) return false;
    const av = socialAvailability(sim, t, so, source === 'player');
    if (!av.ok) {
      if (source === 'player') { setBubble(sim, 'think', '✋', 3); notify(firstName(sim) + ': ' + av.reason, 'bad'); }
      return false;
    }
    if (source === 'player' && mood(sim) < D().CRITICAL.refuseMood && key !== 'goodbye') {
      const low = lowestMotive(sim);
      setBubble(sim, 'think', D().MOTIVE_ICONS[low.key] || '😞', 4);
      notify(firstName(sim) + ' está de mau humor e não quer socializar.', 'bad');
      return false;
    }
    if (source === 'player' && sim.queue.filter((a) => a.source === 'player').length >= MAX_PLAYER_ACTIONS) return false;
    const a = makeAction({
      kind: 'social', targetSimId: t.id, interaction: key, source, prio: source === 'player' ? PRIO.player : PRIO.auto,
      label: so.label + ' com ' + firstName(t), icon: so.icon,
    });
    enqueue(sim, a);
    holdWalkby(t, sim);
    if (source === 'player') { if (!sim.data) sim.data = {}; sim.data.lastCmdAt = nowAbs(); }
    return true;
  }
  function queueWalk(simId, x, y, source, opts) {
    if (!S) return false;
    const sim = simById(simId);
    if (!sim || sim.hidden) return false;
    source = source || 'player';
    if (source === 'player' && sim.visitor) return false;
    const a = makeAction({
      kind: 'walk', x: num(x), y: num(y), source, prio: source === 'player' ? PRIO.player : PRIO.auto,
      label: 'Andar até aqui', icon: '🚶',
    });
    if (opts) { if (opts.noRun) a.data.noRun = true; if (opts.leave) a.data.leave = true; if (opts.prio != null) a.prio = opts.prio; if (opts.label) a.label = opts.label; }
    enqueue(sim, a);
    if (source === 'player') { if (!sim.data) sim.data = {}; sim.data.lastCmdAt = nowAbs(); }
    return true;
  }
  function cancelAction(simId, actionId) {
    if (!S) return false;
    const sim = simById(simId);
    if (!sim) return false;
    const i = sim.queue.findIndex((a) => a.id === actionId);
    if (i < 0) return false;
    const a = sim.queue[i];
    if (a.nocancel) return false;
    if (i === 0 && started(a)) { a.cancel = true; return true; }
    sim.queue.splice(i, 1);
    cancelHooks(sim, a);
    return true;
  }

  function getInteractions(simId, objId) {
    if (!S) return [];
    const sim = simById(simId), o = objById(objId);
    if (!sim || !o || sim.visitor || sim.hidden) return [];
    const out = [];
    for (const it of interListFor(o)) {
      const av = availability(sim, o, it, false);
      if (!av.ok && it.requires && ['broken', 'dirty', 'hasBills', 'anyBroken', 'employed', 'spoiled', 'dead', 'unmade', 'thirsty', 'myCarpool'].indexOf(it.requires) >= 0) {
        // hide state-dependent entries that do not apply right now
        if (checkRequires(sim, o, it)) continue;
      }
      if (o.broken && it.effect !== 'repair' && it.effect !== 'dispose' && it.effect !== 'clean_object') continue;
      let enabled = av.ok, reason = av.reason;
      if (enabled && mood(sim) < D().CRITICAL.refuseMood && !isNeedInter(it)) { enabled = false; reason = 'De mau humor demais.'; }
      out.push({ key: it.key, label: interLabel(o, it), icon: it.icon || '•', enabled, reason: enabled ? '' : reason });
    }
    return out;
  }
  function getSocials(simId, targetSimId) {
    if (!S) return [];
    const sim = simById(simId), t = simById(targetSimId);
    if (!sim || !t || sim === t || sim.visitor || sim.hidden || t.hidden) return [];
    if (t.visitor && SERVICE_ROLES[t.role]) return [];
    const out = [];
    for (const key in D().SOCIALS) {
      const so = D().SOCIALS[key];
      if (so.onlyRole && t.role !== so.onlyRole) continue;
      if (!so.onlyRole && t.role === 'walkby') continue;
      if (so.key === 'greet' && t.data && t.data.greeted) continue;
      const rel = relPeek(sim, t);
      if (so.mean && so.key === 'insult' && !(num(sim.personality.nice) <= 3 || rel.daily < 30)) continue;
      const av = socialAvailability(sim, t, so, true);
      if (!av.ok && (rel.daily > num(so.maxDaily, 100))) continue;   // hide 'too close for this'
      let enabled = av.ok, reason = av.reason;
      if (enabled && mood(sim) < D().CRITICAL.refuseMood && key !== 'goodbye') { enabled = false; reason = 'De mau humor demais.'; }
      out.push({ key, label: so.label, icon: so.icon, enabled, reason: enabled ? '' : reason });
    }
    return out;
  }

  // --------------------------------------------------------------- motives per tick
  function decay(sim, dtH) {
    const DE = D().DECAY, m = sim.motives, P = sim.personality || {};
    const act = sim.queue[0];
    const raising = {};
    if (act && act.phase === 'do' && act.rates) for (const k in act.rates) if (num(act.rates[k]) > 0) raising[k] = true;
    const asleep = !!sim.asleep;
    let hungerDec = 0;
    if (!raising.hunger) {
      hungerDec = DE.hunger.proportional * (100 + num(m.hunger)) * dtH;
      m.hunger = num(m.hunger) - hungerDec;
    }
    if (!asleep) m.energy = num(m.energy) - DE.energy.awake * dtH;
    else if (hourNow() >= D().SLEEP.wakeHour + 1 && hourNow() < 12) m.energy = num(m.energy) - DE.energy.asleepAfterWake * dtH;
    if (!raising.bladder) m.bladder = num(m.bladder) - ((asleep ? DE.bladder.asleep : DE.bladder.awake) * dtH + DE.bladder.hungerCoupling * hungerDec);
    if (!raising.hygiene) m.hygiene = num(m.hygiene) - (asleep ? DE.hygiene.asleep : DE.hygiene.awake) * dtH;
    if (!raising.fun && !asleep) m.fun = num(m.fun) - DE.fun.awake * dtH;
    if (!raising.social) m.social = num(m.social) - (DE.social.base + DE.social.perOutgoing * clamp(num(P.outgoing, 5), 0, 10)) * dtH;
    if (!raising.comfort && !(act && act.effect === 'faint')) {
      if (!sim.seated) {
        const a = num(P.active, 5);
        const r = a >= 7 ? DE.comfort.active : a <= 3 ? DE.comfort.lazy : DE.comfort.mid;
        m.comfort = num(m.comfort) - r * dtH;
      }
    }
  }
  function applyRates(sim, dtH) {
    const act = sim.queue[0];
    if (!act || act.phase !== 'do' || !act.rates) return;
    const m = sim.motives;
    const o = act.objId != null ? objById(act.objId) : null;
    const dirtyMul = o && def(o.type) && def(o.type).dirties && num(o.dirty) >= D().DIRT.visible ? 0.8 : 1;
    for (const k in act.rates) {
      if (!(k in m)) continue;
      let r = num(act.rates[k]);
      if (!r) continue;
      if (k === 'hygiene' && r > 0) r *= dirtyMul;
      const cap = act.caps && act.caps[k] != null ? num(act.caps[k]) : 100;
      const v = num(m[k]);
      if (r > 0) { if (v < cap) m[k] = Math.min(cap, v + r * dtH); }
      else if (v > -100) m[k] = Math.max(-100, v + r * dtH);
    }
  }
  function clampMotives(sim) {
    const m = sim.motives;
    for (const k of D().MOTIVES) {
      const v = +m[k];
      m[k] = isFinite(v) ? clamp(v, -100, 100) : 0;
    }
    for (const k of D().SKILLS) { const v = +sim.skills[k]; sim.skills[k] = isFinite(v) ? clamp(v, 0, 10) : 0; }
    if (!isFinite(+sim.x) || !isFinite(+sim.y)) { const p = spawnTile(0); sim.x = p.x; sim.y = p.y; }
    if (!isFinite(+sim.facing)) sim.facing = 0;
  }
  function critical(sim) {
    const C = D().CRITICAL, m = sim.motives;
    const act = sim.queue[0];
    // passing out
    if (num(m.energy) <= C.faintEnergy && !(act && (act.effect === 'faint' || act.effect === 'sleep'))) {
      if (sim.visitor) { m.energy = -90; startLeaving(sim); return; }
      for (const a of sim.queue) cancelHooks(sim, a);
      const t = simTile(sim);
      if (!walkable(t.x, t.y)) { const nw = guard(() => WO().nearestWalkable(sim.x, sim.y), null); if (nw) { sim.x = nw.x; sim.y = nw.y; } }
      sim.queue = [makeAction({
        kind: 'object', objId: null, interaction: '_faint', effect: 'faint', source: 'auto', prio: PRIO.critical,
        phase: 'enter', label: 'Desmaiado', icon: '😵', nocancel: true,
      })];
      sim.seated = false;
      notify(firstName(sim) + ' desmaiou de cansaço!', 'bad');
      setBubble(sim, 'think', '😵', 6);
    }
    // bladder accident
    if (num(m.bladder) <= C.accidentBladder) {
      const t = simTile(sim);
      let p = t;
      if (!walkable(t.x, t.y)) p = (act && act.data && act.data.exit) || guard(() => WO().nearestWalkable(sim.x, sim.y), t) || t;
      spawnPuddle(p.x, p.y);
      m.bladder = 100;
      m.hygiene = clamp(num(m.hygiene) - C.accidentHygiene, -100, 100);
      m.fun = clamp(num(m.fun) - C.accidentFun, -100, 100);
      setBubble(sim, 'think', '😳', 5);
      notify(firstName(sim) + ' não chegou ao banheiro a tempo...', 'bad');
      if (sim.visitor) startLeaving(sim);
    }
    // starvation emergency
    if (num(m.hunger) <= C.hospitalHunger) {
      if (sim.visitor) { m.hunger = -50; startLeaving(sim); return; }
      for (const a of sim.queue) cancelHooks(sim, a);
      sim.queue = [];
      m.hunger = 0;
      sim.hidden = true; sim.asleep = false; sim.seated = false; sim.bubble = null;
      if (!sim.data) sim.data = {};
      sim.data.awayUntil = nowAbs() + C.hospitalMinutes;
      sim.data.awayReason = 'hospital';
      S.bills.push({ id: nid(), amount: D().MONEY.hospitalBill, dueDay: S.time.day + D().MONEY.billGraceDays, kind: 'hospital' });
      notify(firstName(sim) + ' desmaiou de fome e foi levado(a) para o atendimento de emergência. Conta de ' + fmtMoney(D().MONEY.hospitalBill) + '.', 'bad');
      emit('sims');
    }
  }
  function thoughtBubbles(sim) {
    if (sim.bubble || sim.hidden || sim.asleep || isScripted(sim)) return;
    if (!sim.data) sim.data = {};
    const n = nowAbs();
    if (n < num(sim.data.thinkAt)) return;
    const low = lowestMotive(sim);
    if (low.value < D().CRITICAL.thoughtBelow) {
      setBubble(sim, 'think', D().MOTIVE_ICONS[low.key] || '❔', 4);
      sim.data.thinkAt = n + randRange(25, 45);
    } else sim.data.thinkAt = n + 15;
  }
  function overrideCritical(sim) {
    const crit = criticalMotive(sim);
    if (!crit) return;
    const act = sim.queue[0];
    if (!act) return;
    if (act.nocancel || act.effect === 'faint' || act.effect === 'go_work') return;
    if (act.kind === 'object') {
      const it = actInter(act);
      if (it && ((num(it.rates && it.rates[crit]) > 0) || (it.ads && it.ads[crit]))) return;
      if (crit === 'hunger' && (act.effect === 'cook_meal' || act.effect === 'eat_meal' || act.effect === 'snack')) return;
      if (crit === 'energy' && (act.effect === 'sleep' || act.effect === 'nap')) return;
    }
    if (act.data && act.data.respond) { act.cancel = true; return; }
    if (sim.data && num(sim.data.overrideAt) > nowAbs()) return;
    if (!sim.data) sim.data = {};
    sim.data.overrideAt = nowAbs() + 20;
    if (started(act)) act.cancel = true; else { sim.queue.shift(); cancelHooks(sim, act); }
    const c = runAutonomy(sim, crit);
    if (c) queueCandidate(sim, c, PRIO.player + 5);
    setBubble(sim, 'think', D().MOTIVE_ICONS[crit], 4);
  }
  function queueCandidate(sim, c, prio) {
    if (c.kind === 'object') {
      const a = buildObjectAction(sim, c.o, c.it, 'auto');
      if (!a) return false;
      if (prio) a.prio = prio;
      enqueue(sim, a);
      return true;
    }
    const a = makeAction({
      kind: 'social', targetSimId: c.target.id, interaction: c.so.key, source: 'auto', prio: prio || PRIO.auto,
      label: c.so.label + ' com ' + firstName(c.target), icon: c.so.icon,
    });
    enqueue(sim, a);
    holdWalkby(c.target, sim);
    return true;
  }
  function holdWalkby(t, sim) {
    if (!t || t.role !== 'walkby' || !t.data || t.data.leaving) return;
    t.data.waitFor = sim.id;
    t.data.waitSince = nowAbs();
    const wa = t.queue[0];
    if (wa && wa.kind === 'walk') wa.cancel = true;
  }
  function maybeAutonomy(sim) {
    if (!sim.data) sim.data = {};
    const n = nowAbs();
    if (n < num(sim.data.nextAutoAt)) return;
    const A = D().AUTONOMY;
    if (!sim.visitor && S.settings && S.settings.freeWill === false) {
      const crit = criticalMotive(sim);
      if (crit) { const c = runAutonomy(sim, crit); if (c) queueCandidate(sim, c); }
      sim.data.nextAutoAt = n + randRange(A.retryMin, A.retryMax);
      return;
    }
    const c = runAutonomy(sim, null);
    if (c) { queueCandidate(sim, c); return; }
    sim.data.nextAutoAt = n + randRange(A.retryMin, A.retryMax);
    // nothing worth doing: wander a little so the house feels alive
    if (rand() < (sim.visitor ? 0.6 : 0.5)) wander(sim);
  }
  function wander(sim) {
    const t = simTile(sim);
    const room = roomAt(t.x, t.y);
    const far = rand() < 0.25;          // sometimes stroll to another room / the garden
    const r = far ? 6 : 3;
    for (let tries = 0; tries < 10; tries++) {
      const x = t.x + randInt(-r, r), y = t.y + randInt(-r, r);
      if ((x === t.x && y === t.y) || !inBounds(x, y) || !walkable(x, y)) continue;
      if (!far && room >= 0 && roomAt(x, y) !== room) continue;
      if (S.sims.some((o) => o !== sim && !o.hidden && Math.round(o.x) === x && Math.round(o.y) === y)) continue;
      queueWalk(sim.id, x, y, 'auto', { noRun: true, label: 'Passear' });
      return;
    }
  }

  // --------------------------------------------------------------- per-sim tick
  function tickSim(sim, dt) {
    if (sim.hidden) return;
    if (!Array.isArray(sim.queue)) sim.queue = [];
    if (!sim.data || typeof sim.data !== 'object') sim.data = {};
    const dtH = dt / 60;
    const scripted = isScripted(sim);
    if (!scripted) {
      decay(sim, dtH);
      applyRates(sim, dtH);
      const mm = Math.floor(nowAbs());
      if (sim.data.roomAt !== mm) {
        sim.data.roomAt = mm;
        const t = simTile(sim);
        sim.motives.room = clamp(num(guard(() => WO().roomScore(t.x, t.y), 0)), -100, 100);
      }
      clampMotives(sim);
      critical(sim);
      if (sim.hidden) return;
      overrideCritical(sim);
    }
    processQueue(sim, dt);
    if (!sim.queue.length) {
      sim.anim = 'idle';
      sim.asleep = false;
      if (sim.seated) sim.seated = false;
      if (isOnBlocked(sim)) {
        const nw = guard(() => WO().nearestWalkable(sim.x, sim.y), null);
        if (nw) { sim.x = nw.x; sim.y = nw.y; }
      }
      if (scripted || (sim.visitor && sim.data.leaving)) scriptThink(sim);
      else maybeAutonomy(sim);
    }
    if (!scripted) thoughtBubbles(sim);
    if (sim.bubble && nowAbs() >= num(sim.bubble.until)) { sim.bubble = null; emit('bubble', { simId: sim.id }); }
    clampMotives(sim);
  }

  // --------------------------------------------------------------- careers
  function ensureJobs() {
    const tracks = Object.keys(D().CAREERS);
    if (!S.jobs || S.jobs.day !== S.time.day || !Array.isArray(S.jobs.computer)) {
      const pool = tracks.slice();
      const pickN = [];
      while (pickN.length < Math.min(3, pool.length)) pickN.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      S.jobs = { day: S.time.day, computer: pickN, computerSeen: S.jobs && S.jobs.day === S.time.day ? S.jobs.computerSeen : -1 };
    }
    return S.jobs;
  }
  function jobOffers() {
    ensureJobs();
    const out = [];
    const paper = S.objects.find((o) => o.type === 'newspaper' && o.offer);
    const mk = (track, source) => {
      const c = D().CAREERS[track]; if (!c) return null;
      const lv = c.levels[0];
      return { track, source, name: c.name, icon: c.icon, title: lv.title, pay: lv.pay, start: lv.start, end: lv.end, days: lv.days.slice() };
    };
    if (paper) { const o = mk(paper.offer, 'jornal'); if (o) out.push(o); }
    if (S.jobs.computerSeen === S.time.day) for (const t of S.jobs.computer) { const o = mk(t, 'computador'); if (o) out.push(o); }
    return out;
  }
  function acceptJob(simId, track) {
    const sim = simById(simId);
    const c = D().CAREERS[track];
    if (!sim || sim.visitor || !c) return { ok: false, reason: 'Vaga inválida.' };
    if (sim.career && sim.career.track === track) return { ok: false, reason: 'Já trabalha nesta área.' };
    sim.career = { track, level: 1, performance: 0, daysWorked: 0, missedDays: 0, hiredAt: nowAbs(), lastShift: 0 };
    const lv = c.levels[0];
    notify(firstName(sim) + ' agora trabalha como ' + lv.title + ' (' + c.name + '): ' + fmtMoney(lv.pay) + '/dia, ' + lv.start + 'h–' + lv.end + 'h.', 'career');
    emit('sims');
    return { ok: true };
  }
  function quitJob(simId) {
    const sim = simById(simId);
    if (!sim || !sim.career) return { ok: false };
    const c = D().CAREERS[sim.career.track];
    sim.career = null;
    removeFromCarpools(sim.id);
    notify(firstName(sim) + ' pediu demissão' + (c ? ' (' + c.name + ')' : '') + '.', 'career');
    emit('sims');
    return { ok: true };
  }
  function shiftWindow(sim) {
    const c = sim.career;
    if (!c) return null;
    const lv = D().careerLevel(c.track, c.level);
    if (!lv) return null;
    const n = nowAbs();
    let best = null;
    for (let d = S.time.day - 1; d <= S.time.day + 1; d++) {
      if (lv.days.indexOf(weekday(d)) < 0) continue;
      const start = d * 1440 + lv.start * 60;
      if (start <= num(c.lastShift)) continue;
      if (start < num(c.hiredAt) + 30) continue;
      if (start < n - 2) continue;
      if (!best || start < best.start) best = { start, end: start + D().shiftHours(lv) * 60, lv };
    }
    return best;
  }
  function carpoolFor(start) { return S.objects.find((o) => o.type === 'carpool' && o.shift === start) || null; }
  function carpoolSpot() {
    const mb = S.objects.find((o) => o.type === 'mailbox');
    const y = S.lot.h - 1;
    const xs = [];
    const mx = mb ? mb.x : Math.floor(S.lot.w / 2);
    for (let r = 1; r < S.lot.w; r++) { xs.push(mx + r); xs.push(mx - r); }
    for (const x of xs) {
      if (x < 0 || x + 1 >= S.lot.w) continue;
      if (S.objects.some((o) => o.type === 'carpool' && Math.abs(o.x - x) < 2 && o.y === y)) continue;
      const ok = guard(() => WO().canPlace('carpool', x, y, 2), { ok: true });
      if (ok && ok.ok) return { x, y };
    }
    return null;
  }
  function ensureCarpool(sim, sh) {
    let car = carpoolFor(sh.start);
    if (!car) {
      const spot = carpoolSpot();
      if (!spot) return null;
      car = addSystemObject('carpool', spot.x, spot.y, 2, { shift: sh.start, simIds: [], leaveAt: sh.start, car: sh.lv.car }, true);
      if (!car) return null;
      objectsChanged();
      notify('A carona de ' + firstName(sim) + ' chegou! Sai às ' + fmtTime(sh.start % 1440) + '.', 'career');
    }
    if (!Array.isArray(car.simIds)) car.simIds = [];
    if (car.simIds.indexOf(sim.id) < 0) car.simIds.push(sim.id);
    return car;
  }
  function removeFromCarpools(simId) {
    let changed = false;
    for (const o of S.objects.slice()) {
      if (o.type !== 'carpool' || !Array.isArray(o.simIds)) continue;
      const i = o.simIds.indexOf(simId);
      if (i >= 0) { o.simIds.splice(i, 1); changed = true; }
      if (!o.simIds.length) { removeObject(o, true); changed = true; }
    }
    if (changed) objectsChanged();
  }
  function headingToCarpool(sim) {
    return sim.queue.some((a) => a.kind === 'object' && a.effect === 'go_work');
  }
  function wakeUp(sim) {
    const a = sim.queue[0];
    if (a && (a.effect === 'sleep' || a.effect === 'nap') && a.phase === 'do') { a.data.alarm = true; a.cancel = true; }
  }
  function careerTick() {
    const R = D().CAREER_RULES;
    for (const sim of S.sims) {
      if (sim.visitor || sim.hidden || !sim.career) continue;
      const sh = shiftWindow(sim);
      if (!sh) continue;
      const toGo = sh.start - nowAbs();
      const c = sim.career;
      if (toGo <= R.alarmBefore && toGo > 0 && sim.asleep && c.alarmFor !== sh.start) {
        c.alarmFor = sh.start;
        if (num(sim.motives.energy) >= R.alarmMinEnergy) {
          wakeUp(sim);
          notify('⏰ Despertador: ' + firstName(sim) + ' acordou para o trabalho.', 'career');
        }
      }
      if (toGo <= R.carpoolBefore && toGo > 0) ensureCarpool(sim, sh);
      if (toGo <= R.autoGoBefore && toGo > 0 && !headingToCarpool(sim)) {
        const car = carpoolFor(sh.start);
        if (car) {
          if (sim.asleep) wakeUp(sim);
          const it = getInter(car, 'go');
          const a = buildObjectAction(sim, car, it, 'auto');
          a.prio = PRIO.urgent;
          enqueue(sim, a);
        }
      }
      if (toGo <= 0) missedWork(sim, sh);
    }
    // carpools whose time has passed drive away
    for (const o of S.objects.slice()) {
      if (o.type === 'carpool' && nowAbs() >= num(o.leaveAt) + 0.01) { removeObject(o, true); objectsChanged(); }
    }
  }
  function missedWork(sim, sh) {
    const R = D().CAREER_RULES;
    const c = sim.career;
    c.lastShift = sh.start;
    c.missedDays = num(c.missedDays) + 1;
    c.performance = clamp(num(c.performance) + R.missedPerf, -100, 100);
    removeFromCarpools(sim.id);
    for (const a of sim.queue.slice()) if (a.effect === 'go_work') cancelAction(sim.id, a.id);
    if (c.missedDays >= R.fireAfterMisses) {
      const tr = D().CAREERS[c.track];
      sim.career = null;
      notify(firstName(sim) + ' faltou ao trabalho de novo e foi demitido(a)' + (tr ? ' (' + tr.name + ')' : '') + '.', 'bad');
      emit('sims');
    } else {
      notify(firstName(sim) + ' perdeu a carona e faltou ao trabalho. Mais uma falta e será demitido(a)!', 'bad');
    }
  }
  function departToWork(sim, car) {
    const c = sim.career;
    if (!c) return;
    const sh = { start: num(car.shift), lv: D().careerLevel(c.track, c.level) };
    const md = mood(sim);
    c.moodAtDeparture = Math.round(md);
    c.critAtDeparture = D().MOTIVES.some((k) => k !== 'room' && num(sim.motives[k]) <= -80);
    c.lastShift = sh.start;
    for (const a of sim.queue.slice(1)) cancelHooks(sim, a);
    sim.queue = [];
    sim.hidden = true; sim.atWork = true; sim.asleep = false; sim.seated = false; sim.bubble = null;
    sim.workReturnAt = sh.start + D().shiftHours(sh.lv) * 60;
    sim.data.workStart = sh.start;
    const i = car.simIds.indexOf(sim.id);
    if (i >= 0) car.simIds.splice(i, 1);
    if (!car.simIds.length) removeObject(car, true);
    objectsChanged();
    notify(firstName(sim) + ' foi para o trabalho.', 'career');
    emit('sims');
  }
  function returnFromWork(sim) {
    const c = sim.career;
    const R = D().CAREER_RULES;
    sim.hidden = false; sim.atWork = false;
    const p = arrivalTile();
    sim.x = p.x; sim.y = p.y; sim.facing = PI;
    sim.queue = [];
    sim.data.nextAutoAt = nowAbs() + 1;
    if (!c) { emit('sims'); return; }
    const tr = D().CAREERS[c.track];
    const lv = D().careerLevel(c.track, c.level);
    const hours = Math.max(0, (num(sim.workReturnAt) - num(sim.data.workStart, num(sim.workReturnAt) - D().shiftHours(lv) * 60)) / 60);
    const wd = (tr && tr.workDelta) || {};
    for (const k in wd) if (k in sim.motives) sim.motives[k] = clamp(num(sim.motives[k]) + num(wd[k]) * hours, -100, 100);
    sim.motives.bladder = Math.max(num(sim.motives.bladder), R.bladderReturn);
    sim.motives.room = 0;
    addMoney(lv.pay, 'salário');
    c.daysWorked = num(c.daysWorked) + 1;
    c.missedDays = 0;
    const md = num(c.moodAtDeparture);
    let dp = md >= 0 ? 5 + md / 10 : -5 + md / 10;
    if (c.critAtDeparture) dp -= 20;
    c.performance = clamp(Math.round(num(c.performance) + dp), -100, 100);
    let msg = firstName(sim) + ' voltou do trabalho e recebeu ' + fmtMoney(lv.pay) + '.';
    let kind = 'money';
    const next = tr && tr.levels[c.level] ? tr.levels[c.level] : null;
    if (next && md > 0 && meetsReqs(sim, next)) {
      const chance = clamp(R.promoBase + c.performance / 200, 0.05, 0.98);
      if (rand() < chance) {
        c.level += 1;
        c.performance = 0;
        msg = 'Promoção! ' + firstName(sim) + ' agora é ' + next.title + ' (' + fmtMoney(next.pay) + '/dia, ' + next.start + 'h–' + next.end + 'h). Recebeu ' + fmtMoney(lv.pay) + ' hoje.';
        kind = 'career';
      }
    } else if (c.performance <= R.demoteAt && c.level > 1) {
      c.level -= 1;
      c.performance = 0;
      msg = firstName(sim) + ' foi rebaixado(a) para ' + tr.levels[c.level - 1].title + ' por mau desempenho. Recebeu ' + fmtMoney(lv.pay) + '.';
      kind = 'bad';
    }
    notify(msg, kind);
    emit('sims');
  }
  function meetsReqs(sim, level) {
    const req = level.req || {};
    for (const k in (req.skills || {})) if (Math.floor(num(sim.skills[k])) < num(req.skills[k])) return false;
    if (num(req.friends) > familyFriends()) return false;
    return true;
  }
  function careerInfo(simId) {
    const sim = simById(simId);
    if (!sim || !sim.career) return null;
    const c = sim.career;
    const tr = D().CAREERS[c.track];
    if (!tr) return null;
    const lv = D().careerLevel(c.track, c.level);
    const next = tr.levels[c.level] || null;
    const friends = familyFriends();
    let nextInfo = null;
    if (next) {
      const met = { skills: {}, friends: friends >= num(next.req.friends) };
      for (const k in next.req.skills) met.skills[k] = Math.floor(num(sim.skills[k])) >= next.req.skills[k];
      nextInfo = { title: next.title, pay: next.pay, start: next.start, end: next.end, req: next.req, met };
    }
    const sh = shiftWindow(sim);
    return {
      track: c.track, trackName: tr.name, icon: tr.icon, level: c.level, title: lv.title, pay: lv.pay, start: lv.start,
      end: lv.end, days: lv.days.slice(), hours: D().shiftHours(lv), performance: num(c.performance),
      daysWorked: num(c.daysWorked), missedDays: num(c.missedDays), friends, next: nextInfo,
      atWork: !!sim.atWork, nextShift: sh ? sh.start : null,
    };
  }

  // --------------------------------------------------------------- visitors & services
  function spawnTile(side) {
    const y = S.lot.h - 1;
    const x = side ? S.lot.w - 1 : 0;
    if (walkable(x, y)) return { x, y };
    const nw = guard(() => WO().nearestWalkable(x, y), null);
    return nw || { x, y };
  }
  function arrivalTile() {
    const car = carpoolSpot();
    const mb = S.objects.find((o) => o.type === 'mailbox');
    if (mb) {
      const s = dataSlots(mb, def('mailbox')).find((q) => q.usable);
      if (s) return { x: s.x, y: s.y };
    }
    if (car && walkable(car.x, car.y - 1)) return { x: car.x, y: car.y - 1 };
    return spawnTile(0);
  }
  function doorstepTile() {
    // outdoor tile right outside the front door (door closest to the street)
    let best = null;
    const walls = S.lot.walls || {};
    for (const key in walls) {
      const e = walls[key];
      if (!e || e.t !== 2) continue;
      const p = key.split(',');
      const kind = p[0], x = +p[1], y = +p[2];
      const tiles = kind === 'h' ? [{ x, y: y - 1 }, { x, y }] : [{ x: x - 1, y }, { x, y }];
      for (const t of tiles) {
        if (!inBounds(t.x, t.y) || !walkable(t.x, t.y)) continue;
        const indoor = guard(() => WO().isIndoor ? WO().isIndoor(t.x, t.y) : false, false);
        if (indoor) continue;
        if (!best || t.y > best.y) best = t;
      }
    }
    return best || arrivalTile();
  }
  function makeVisitorSim(npc, role, extra) {
    const D_ = D();
    const side = rand() < 0.5 ? 0 : 1;
    const p = spawnTile(side);
    const roleNames = { repair: 'Técnico', maid: 'Faxineira', pizza: 'Entregador', collector: 'Oficial de cobrança' };
    const gender = npc ? npc.gender : (role === 'maid' ? 'f' : rand() < 0.5 ? 'm' : 'f');
    const uni = { repair: '#2b59c3', maid: '#e07aa5', pizza: '#d62828', collector: '#3a3a3a' };
    const colors = npc ? shallow(npc.colors) : {
      skin: pick(D_.PALETTES.skin), hair: pick(D_.PALETTES.hair), shirt: uni[role] || pick(D_.PALETTES.shirt), pants: '#2b2d42',
    };
    let name;
    if (npc) name = npc.name;
    else {
      const fn = pick(D_.NAMES[gender] || D_.NAMES.m);
      name = (role === 'maid' ? 'Dona ' + fn : (roleNames[role] || 'Visitante') + ' ' + fn);
    }
    const motives = {};
    for (const k of D_.MOTIVES) motives[k] = randInt(20, 80);
    motives.room = 0;
    const sim = {
      id: nid(), name, gender, colors,
      personality: npc ? shallow(npc.personality) : { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 },
      motives, skills: { cooking: 0, mechanical: role === 'repair' ? 8 : 0, charisma: 0, body: 0, logic: 0, creativity: 0 },
      career: null, relationships: {}, x: p.x, y: p.y, facing: side ? -HALF_PI : HALF_PI, queue: [], anim: 'idle', bubble: null,
      atWork: false, workReturnAt: 0, hidden: false, visitor: true, npcId: npc ? npc.id : null, role, leaveAt: 0,
      lockouts: {}, asleep: false, seated: false, data: Object.assign({ arrivedAt: nowAbs(), side, stage: 0 }, extra || {}),
    };
    S.sims.push(sim);
    emit('sims');
    return sim;
  }
  function startLeaving(sim) {
    if (!sim || !sim.visitor || (sim.data && sim.data.leaving)) return;
    if (!sim.data) sim.data = {};
    sim.data.leaving = true;
    // household members talking to the visitor finish naturally (their action sees the target leave)
    for (const a of sim.queue.slice(1)) cancelHooks(sim, a);
    if (sim.queue.length) { const cur = sim.queue[0]; sim.queue = [cur]; if (started(cur)) cur.cancel = true; else sim.queue = []; }
    if (sim.role === 'repair' || sim.role === 'maid') chargeService(sim);
    const side = sim.data.side != null ? sim.data.side : 0;
    const p = spawnTile(side);
    queueWalk(sim.id, p.x, p.y, 'auto', { leave: true, prio: PRIO.critical, label: 'Indo embora' });
  }
  function chargeService(sim) {
    if (sim.data.charged) return;
    sim.data.charged = true;
    const rate = sim.role === 'repair' ? D().MONEY.repairPerHour : D().MONEY.maidPerHour;
    const hours = Math.max(1, Math.ceil((nowAbs() - num(sim.data.arrivedAt, nowAbs())) / 60));
    const cost = rate * hours;
    const pay = Math.min(cost, Math.max(0, num(S.money)));
    if (pay > 0) addMoney(-pay, sim.role === 'repair' ? 'técnico' : 'faxineira');
    if (cost > pay) S.bills.push({ id: nid(), amount: cost - pay, dueDay: S.time.day + D().MONEY.billGraceDays, kind: 'service' });
    notify((sim.role === 'repair' ? 'O técnico' : 'A faxineira') + ' cobrou ' + fmtMoney(cost) + ' (' + hours + ' h).', 'money');
  }
  function removeVisitor(sim) {
    const i = S.sims.indexOf(sim);
    if (i < 0) return;
    S.sims.splice(i, 1);
    for (const s of S.sims) {
      for (const a of s.queue.slice()) {
        if (a.targetSimId === sim.id) {
          if (s.queue[0] === a && started(a)) a.cancel = true;
          else { const j = s.queue.indexOf(a); if (j >= 0) s.queue.splice(j, 1); }
        }
      }
    }
    if (S.settings && S.settings.selectedSimId === sim.id) S.settings.selectedSimId = null;
    emit('sims');
  }
  function visitorChecks() {
    const SR = D().SOCIAL_RULES;
    const h = hourNow();
    for (const s of S.sims.slice()) {
      if (!s.visitor || s.hidden || (s.data && s.data.leaving)) continue;
      if (s.role === 'guest') {
        let leave = false;
        if (s.leaveAt && nowAbs() >= s.leaveAt) leave = true;
        if (h >= SR.guestLeaveHour || h < 6) leave = true;
        const m = s.motives;
        if (num(m.hunger) < SR.guestLeaveMotive || num(m.energy) < SR.guestLeaveMotive || num(m.bladder) < SR.guestLeaveMotive - 20) leave = true;
        const host = household();
        if (host.length && host.every((hh) => relPeek(s, hh).daily < SR.guestLeaveRel)) leave = true;
        if (leave) {
          notify(s.name + ' foi embora.', 'info');
          startLeaving(s);
        }
      }
      if (s.role === 'walkby' && nowAbs() - num(s.data.arrivedAt) > 90) startLeaving(s);
      if (SERVICE_ROLES[s.role] && nowAbs() - num(s.data.arrivedAt) > 360) startLeaving(s);
    }
  }
  function scriptThink(sim) {
    if (sim.data.leaving) {
      if (!sim.queue.length) {
        const p = spawnTile(num(sim.data.side));
        const t = simTile(sim);
        if (t.x === p.x && t.y === p.y) { removeVisitor(sim); return; }
        if (num(sim.data.leaveTries) > 3) { removeVisitor(sim); return; }
        sim.data.leaveTries = num(sim.data.leaveTries) + 1;
        queueWalk(sim.id, p.x, p.y, 'auto', { leave: true, prio: PRIO.critical, label: 'Indo embora' });
      }
      return;
    }
    const n = nowAbs();
    switch (sim.role) {
      case 'walkby': {
        if (sim.data.waitFor) {
          const w = simById(sim.data.waitFor);
          const coming = w && w.queue.some((a) => a.kind === 'social' && a.targetSimId === sim.id);
          if (!coming || n - num(sim.data.waitSince, n) > 30) { sim.data.waitFor = null; sim.data.waitSince = null; }
          else { if (!sim.data.waitSince) sim.data.waitSince = n; sim.anim = 'idle'; return; }
        }
        if (sim.data.stage === 0) {
          sim.data.stage = 1;
          const mid = Math.floor(S.lot.w / 2) + randInt(-3, 3);
          queueWalk(sim.id, mid, S.lot.h - 1, 'auto', { noRun: true, label: 'Passeando' });
        } else if (sim.data.stage === 1) {
          sim.data.stage = 2;
          sim.data.lingerUntil = n + D().SOCIAL_RULES.walkbyLinger;
          setBubble(sim, 'think', '🙂', 3);
        } else if (sim.data.stage === 2) {
          if (n >= num(sim.data.lingerUntil)) { sim.data.stage = 3; sim.data.side = sim.data.side ? 0 : 1; startLeaving(sim); }
          else sim.anim = 'idle';
        }
        return;
      }
      case 'repair': {
        const target = S.objects.filter((o) => o.broken && !usersOf(o.id, sim).some((u) => u.queue[0] && u.queue[0].effect === 'repair'))
          .sort((a, b) => dist(sim.x, sim.y, a.x, a.y) - dist(sim.x, sim.y, b.x, b.y))[0];
        if (target && num(sim.data.fails) < 6) {
          const it = getInter(target, 'repair');
          const before = sim.queue.length;
          if (it) { const a = buildObjectAction(sim, target, it, 'auto'); enqueue(sim, a); }
          if (sim.queue.length === before) sim.data.fails = num(sim.data.fails) + 1;
          return;
        }
        if (!sim.data.thanked) { sim.data.thanked = true; setBubble(sim, 'talk', '🔧', 3); }
        startLeaving(sim);
        return;
      }
      case 'maid': {
        const jobs = [];
        for (const o of S.objects) {
          if (o.type === 'puddle') jobs.push({ o, key: 'mop' });
          else if (o.type === 'dirty_plate') jobs.push({ o, key: 'clean' });
          else if (o.type === 'meal' && o.spoiled) jobs.push({ o, key: 'dispose' });
          else if (o.type === 'newspaper' && (o.read || S.time.day - num(o.day, S.time.day) >= 1)) jobs.push({ o, key: 'dispose' });
          else if (num(o.dirty) >= D().DIRT.playerClean && getInter(o, 'clean')) jobs.push({ o, key: 'clean' });
          else if (o.unmade) jobs.push({ o, key: 'make_bed' });
          else if ((o.type === 'plant_small' || o.type === 'plant_big') && !o.dead && num(o.water, 100) < 70) jobs.push({ o, key: 'water' });
        }
        const busy = (o) => S.sims.some((s) => s !== sim && s.queue[0] && (s.queue[0].objId === o.id) && s.queue[0].phase !== 'route');
        const lockedOut = (o, k) => isLocked(sim, lockKey(o.id, k), null);
        const todo = jobs.filter((j) => !busy(j.o) && !lockedOut(j.o, j.key))
          .sort((a, b) => dist(sim.x, sim.y, a.o.x, a.o.y) - dist(sim.x, sim.y, b.o.x, b.o.y));
        for (const j of todo) {
          const it = getInter(j.o, j.key);
          if (!it) continue;
          if (it.effect === 'water' && num(j.o.water, 100) >= 70) continue;
          const a = buildObjectAction(sim, j.o, it, 'auto');
          a.data.service = true;
          enqueue(sim, a);
          lock(sim, lockKey(j.o.id, j.key), 15);
          return;
        }
        startLeaving(sim);
        return;
      }
      case 'pizza':
      case 'collector': {
        if (sim.data.stage === 0) {
          sim.data.stage = 1;
          const t = doorstepTile();
          sim.data.drop = t;
          queueWalk(sim.id, t.x, t.y, 'auto', { label: sim.role === 'pizza' ? 'Entregando pizza' : 'Cobrando dívida' });
          return;
        }
        if (sim.data.stage === 1) {
          sim.data.stage = 2;
          if (sim.role === 'pizza') deliverPizza(sim);
          else repossess(sim);
          setBubble(sim, 'talk', sim.role === 'pizza' ? '🍕' : '📋', 3);
          sim.data.waitUntil = n + 2;
          return;
        }
        if (n >= num(sim.data.waitUntil)) startLeaving(sim);
        return;
      }
      default:
        startLeaving(sim);
    }
  }
  function deliverPizza(sim) {
    const st = simTile(sim);
    const M_ = D().MONEY;
    const extra = { servings: M_.pizzaServings, quality: M_.pizzaHunger, food: 'pizza', spoiled: false, spoilAt: nowAbs() + D().MEAL.spoilHours * 60 };
    const spots = [st, { x: st.x + 1, y: st.y }, { x: st.x - 1, y: st.y }, { x: st.x, y: st.y + 1 }, { x: st.x, y: st.y - 1 }];
    let o = null;
    for (const p of spots) {
      if (!inBounds(p.x, p.y) || itemAt(p.x, p.y) || !walkable(p.x, p.y)) continue;
      o = addSystemObject('meal', p.x, p.y, 0, extra, false);
      if (o) break;
    }
    if (!o) o = addSystemObject('meal', st.x, st.y, 0, extra, true);
    objectsChanged();
    notify('🍕 A pizza chegou! Está na porta de casa.', 'good');
  }
  function repossess(sim) {
    const amount = num(sim.data.amount);
    const list = S.objects.filter((o) => { const d = def(o.type); return d && d.buyable !== false && num(o.price) > 0; })
      .map((o) => ({ o, v: D().sellRefund(o, S.time.day) }))
      .sort((a, b) => b.v - a.v);
    let taken = 0;
    const names = [];
    for (const e of list) {
      if (taken >= amount) break;
      cancelUsersOf(e.o.id);
      removeObject(e.o, true);
      taken += e.v;
      names.push((def(e.o.type) || {}).name || e.o.type);
    }
    const ids = sim.data.billIds || [];
    S.bills = S.bills.filter((b) => ids.indexOf(b.id) < 0);
    objectsChanged();
    notify('O oficial de cobrança levou: ' + (names.join(', ') || 'nada (não havia o que levar)') + '. As contas atrasadas foram quitadas.', 'bad');
  }
  function cancelUsersOf(objId) {
    for (const s of S.sims) {
      for (const a of s.queue.slice()) {
        if (a.objId === objId || a.tgtId === objId || a.useObjId === objId) {
          if (s.queue[0] === a && started(a)) { a.cancel = true; a.data.noFinish = true; if (a.phase === 'do' || a.phase === 'enter') { a.phase = 'exit'; a.data.exitInit = false; a.completed = false; } }
          else { const j = s.queue.indexOf(a); if (j >= 0) { s.queue.splice(j, 1); cancelHooks(s, a); } }
        }
      }
    }
  }

  // --------------------------------------------------------------- scheduler
  function totalBills() { return S.bills.reduce((a, b) => a + num(b.amount), 0); }
  function objectsValue() {
    let v = 0;
    for (const o of S.objects) { const d = def(o.type); if (d && d.buyable !== false) v += D().sellRefund(o, S.time.day); }
    return v;
  }
  function onMidnight() {
    if (!S.stats) S.stats = { daysPlayed: 0 };
    S.stats.daysPlayed = num(S.stats.daysPlayed) + 1;
    ensureJobs();
    // old newspapers pile up as clutter after two days: they are recycled
    for (const o of S.objects.slice()) if (o.type === 'newspaper' && S.time.day - num(o.day, S.time.day) >= 2) removeObject(o, true);
    objectsChanged();
  }
  function onMorning() {
    // newspaper next to the mailbox
    const mb = S.objects.find((o) => o.type === 'mailbox');
    if (mb) {
      const tracks = Object.keys(D().CAREERS);
      const spots = [];
      for (const t of footTiles(mb)) for (const d of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]) spots.push({ x: t.x + d[0], y: t.y + d[1] });
      for (const p of spots) {
        if (!inBounds(p.x, p.y) || !walkable(p.x, p.y) || itemAt(p.x, p.y)) continue;
        const o = addSystemObject('newspaper', p.x, p.y, 0, { offer: pick(tracks), day: S.time.day, read: false }, false);
        if (o) { objectsChanged(); break; }
      }
    }
    for (const b of S.bills) {
      if (num(b.dueDay) === S.time.day) notify('Atenção: há contas vencendo hoje (' + fmtMoney(b.amount) + '). Pague na caixa de correio ou o oficial de cobrança virá.', 'bad');
    }
    // decide today's walk-by
    if (rand() < D().SOCIAL_RULES.walkbyChance) {
      const SR = D().SOCIAL_RULES;
      S.walkbyAt = S.time.day * 1440 + randInt(SR.walkbyStart * 60, SR.walkbyEnd * 60);
    } else S.walkbyAt = null;
  }
  function billsCheck() {
    const MO = D().MONEY;
    if (S.time.day - num(S.lastBillDay, 1) < MO.billEveryDays) return;
    S.lastBillDay = S.time.day;
    const amount = Math.round(objectsValue() * MO.billPercent + MO.billBase);
    S.bills.push({ id: nid(), amount, dueDay: S.time.day + MO.billGraceDays, kind: 'bill' });
    notify('Chegou uma conta de ' + fmtMoney(amount) + ' na caixa de correio. Vence em ' + MO.billGraceDays + ' dias.', 'money');
  }
  function collectorCheck() {
    const overdue = S.bills.filter((b) => S.time.day >= num(b.dueDay));
    if (!overdue.length) return;
    if (S.sims.some((s) => s.role === 'collector')) return;
    const amount = Math.round(overdue.reduce((a, b) => a + num(b.amount), 0) * (1 + D().MONEY.collectorExtra));
    makeVisitorSim(null, 'collector', { amount, billIds: overdue.map((b) => b.id) });
    notify('O oficial de cobrança chegou para levar objetos no valor de ' + fmtMoney(amount) + '!', 'bad');
  }
  function relationshipDecay() {
    const SR = D().SOCIAL_RULES;
    const hh = household();
    const toward = (v, step) => (v > 0 ? Math.max(0, v - step) : Math.min(0, v + step));
    for (const a of hh) {
      if (!a.relationships) a.relationships = {};
      for (const key in a.relationships) {
        const r = a.relationships[key];
        if (!r || typeof r !== 'object') { delete a.relationships[key]; continue; }
        const other = simById(+key);
        if (other && !other.visitor) {
          r.daily = clamp(toward(num(r.daily), -SR.housemateDaily), -100, 100);
          r.lifetime = clamp(num(r.lifetime) + SR.housemateLifetime, -100, 100);
        } else {
          if (num(r.last) !== S.time.day) r.daily = toward(num(r.daily), SR.decayDaily);
          r.lifetime = clamp(num(r.lifetime) + clamp(num(r.daily) - num(r.lifetime), -SR.lifetimeDrift, SR.lifetimeDrift), -100, 100);
        }
      }
    }
    for (const n of S.npcs) {
      if (!n.relationships) n.relationships = {};
      for (const key in n.relationships) {
        const r = n.relationships[key];
        if (!r || typeof r !== 'object') { delete n.relationships[key]; continue; }
        if (num(r.last) !== S.time.day) r.daily = toward(num(r.daily), SR.decayDaily);
        r.lifetime = clamp(num(r.lifetime) + clamp(num(r.daily) - num(r.lifetime), -SR.lifetimeDrift, SR.lifetimeDrift), -100, 100);
      }
    }
  }
  function hourly() {
    const P = D().PLANT;
    let changed = false;
    for (const o of S.objects) {
      if (o.type !== 'plant_small' && o.type !== 'plant_big') continue;
      if (o.dead) continue;
      o.water = clamp(num(o.water, 100) - 100 / P.waterHours, 0, 100);
      if (o.water <= 0) {
        o.dryHours = num(o.dryHours) + 1;
        if (o.dryHours >= P.deadAfterHours) { o.dead = true; changed = true; notify('Uma planta morreu por falta de água.', 'bad'); }
      }
    }
    if (changed) emit('objects');
  }
  function minuteChecks() {
    const n = nowAbs();
    // scheduled events
    if (S.events.length) {
      const due = S.events.filter((e) => n >= num(e.at));
      if (due.length) {
        S.events = S.events.filter((e) => n < num(e.at));
        for (const e of due) guard(() => runEvent(e));
      }
    }
    // spoilage
    let changed = false;
    for (const o of S.objects) {
      if ((o.type === 'meal' || o.type === 'dirty_plate') && !o.spoiled && o.spoilAt && n >= num(o.spoilAt)) {
        o.spoiled = true; changed = true;
        if (o.type === 'meal') notify('Uma refeição estragou. Jogue fora antes que atraia bichos!', 'bad');
      }
    }
    if (changed) emit('objects');
    // hidden characters coming back
    for (const s of S.sims) {
      if (!s.hidden) continue;
      if (s.atWork && n >= num(s.workReturnAt)) guard(() => returnFromWork(s));
      else if (!s.atWork && s.data && s.data.awayUntil && n >= num(s.data.awayUntil)) {
        s.hidden = false; s.data.awayUntil = 0;
        const p = arrivalTile(); s.x = p.x; s.y = p.y;
        notify(firstName(s) + ' voltou para casa.', 'info');
        emit('sims');
      } else if (!s.atWork && !(s.data && s.data.awayUntil)) { s.hidden = false; emit('sims'); }
    }
    careerTick();
    visitorChecks();
    if (S.walkbyAt && n >= S.walkbyAt) { S.walkbyAt = null; guard(spawnWalkby); }
  }
  function runEvent(e) {
    const SR = D().SOCIAL_RULES;
    switch (e.kind) {
      case 'guest': {
        const npc = npcById(e.npcId);
        if (!npc || S.sims.some((s) => s.npcId === npc.id)) return;
        if (visitors().length >= SR.maxVisitors) return;
        const s = makeVisitorSim(npc, 'guest', {});
        s.leaveAt = nowAbs() + randInt(SR.guestStayMin, SR.guestStayMax);
        s.data.greeted = true;
        notify(npc.name + ' chegou para a visita!', 'good');
        return;
      }
      case 'repair':
        makeVisitorSim(null, 'repair', {});
        notify('O técnico chegou.', 'info');
        return;
      case 'maid':
        makeVisitorSim(null, 'maid', {});
        notify('A faxineira chegou.', 'info');
        return;
      case 'pizza':
        makeVisitorSim(null, 'pizza', {});
        return;
      default:
    }
  }
  function spawnWalkby() {
    if (visitors().length >= D().SOCIAL_RULES.maxVisitors) return;
    const free = S.npcs.filter((n) => !S.sims.some((s) => s.npcId === n.id));
    if (!free.length) return;
    const unknown = free.filter((n) => !n.known);
    const npc = (unknown.length && rand() < 0.65) ? pick(unknown) : pick(free);
    const s = makeVisitorSim(npc, 'walkby', {});
    s.leaveAt = nowAbs() + 90;
    notify(npc.name + ' está passeando pela calçada. Que tal cumprimentar?', 'info');
  }
  function onMinute(mod) {
    emit('time', { day: S.time.day, minute: mod });
    if (mod === 0) { guard(onMidnight); emit('day', { day: S.time.day }); }
    if (mod === 7 * 60) guard(onMorning);
    if (mod === D().MONEY.billHour * 60) guard(billsCheck);
    if (mod === 10 * 60) guard(collectorCheck);
    if (mod === D().SOCIAL_RULES.decayHour * 60) guard(relationshipDecay);
    if (mod % 60 === 0) guard(hourly);
    if (mod % 30 === 0) for (const s of S.sims) pruneLockouts(s);
    guard(minuteChecks);
  }

  // --------------------------------------------------------------- update loop
  function tick(dt) {
    const before = num(S.time.minute);
    let after = before + dt;
    const b0 = Math.floor(before);
    const a0 = Math.floor(after);
    if (after >= 1440) { after -= 1440; S.time.day += 1; }
    S.time.minute = after;
    for (const sim of S.sims.slice()) {
      if (S.sims.indexOf(sim) < 0) continue;
      guard(() => tickSim(sim, dt));
    }
    for (let m = b0 + 1; m <= a0; m++) onMinute(((m % 1440) + 1440) % 1440);
  }
  function update(dt) {
    if (!S) return;
    dt = num(dt);
    if (!(dt > 0)) return;
    if (dt > 240) dt = 240;
    while (dt > 1e-9) {
      const step = Math.min(0.5, dt);
      tick(step);
      dt -= step;
    }
  }

  // --------------------------------------------------------------- buy / sell / build
  function relocateSims() {
    for (const s of S.sims) {
      if (s.hidden) continue;
      const a = s.queue[0];
      if (a && a.slot && a.slot.on && (a.phase === 'do' || a.phase === 'enter')) continue;
      const t = simTile(s);
      if (!walkable(t.x, t.y)) {
        const nw = guard(() => WO().nearestWalkable(s.x, s.y), null);
        if (nw) { s.x = nw.x; s.y = nw.y; }
      }
      // paths may be invalid now
      if (a && a.phase === 'walk') a.phase = 'route';
    }
  }
  function buyObject(type, x, y, rot) {
    if (!S) return { ok: false, reason: 'Jogo não iniciado.' };
    const d = def(type);
    if (!d || d.buyable === false) return { ok: false, reason: 'Este objeto não está à venda.' };
    if (num(S.money) < d.price) return { ok: false, reason: 'Dinheiro insuficiente.' };
    x = Math.round(num(x)); y = Math.round(num(y)); rot = normRot(rot);
    const cp = guard(() => WO().canPlace(type, x, y, rot), { ok: false, reason: 'Posição inválida.' });
    if (!cp || !cp.ok) return { ok: false, reason: (cp && cp.reason) || 'Posição inválida.' };
    const o = { id: nid(), type, x, y, rot, dirty: 0, broken: false, boughtDay: S.time.day, price: d.price, uses: 0 };
    if (type === 'plant_small' || type === 'plant_big') { o.water = 100; o.dryHours = 0; }
    if (d.light) o.on = true;
    o.immuneUntil = nowAbs() + D().REPAIR.immuneHours * 60;
    S.objects.push(o);
    objectsChanged();
    addMoney(-d.price, 'compra');
    relocateSims();
    return { ok: true, reason: '', obj: o };
  }
  function sellValue(objId) {
    const o = objById(objId);
    if (!o) return 0;
    const d = def(o.type);
    if (!d || d.buyable === false) return 0;
    return D().sellRefund(o, S.time.day);
  }
  function sellObject(objId) {
    if (!S) return { ok: false, refund: 0 };
    const o = objById(objId);
    if (!o) return { ok: false, refund: 0, reason: 'Objeto não encontrado.' };
    if (o.type === 'mailbox' || o.type === 'carpool') return { ok: false, refund: 0, reason: 'Este objeto não pode ser vendido.' };
    const refund = sellValue(objId);
    cancelUsersOf(o.id);
    removeObject(o);
    if (refund) addMoney(refund, 'venda');
    relocateSims();
    return { ok: true, refund };
  }
  function moveObject(objId, x, y, rot) {
    if (!S) return { ok: false, reason: 'Jogo não iniciado.' };
    const o = objById(objId);
    if (!o) return { ok: false, reason: 'Objeto não encontrado.' };
    if (o.type === 'carpool') return { ok: false, reason: 'A carona não pode ser movida.' };
    x = Math.round(num(x)); y = Math.round(num(y)); rot = normRot(rot == null ? o.rot : rot);
    const cp = guard(() => WO().canPlace(o.type, x, y, rot, o.id), { ok: false, reason: 'Posição inválida.' });
    if (!cp || !cp.ok) return { ok: false, reason: (cp && cp.reason) || 'Posição inválida.' };
    cancelUsersOf(o.id);
    o.x = x; o.y = y; o.rot = rot;
    objectsChanged();
    relocateSims();
    return { ok: true, reason: '' };
  }
  function wallPrice(t) {
    const W = D().WALL_PRICES;
    return t === 2 ? W.door : t === 3 ? W.window : t === 1 ? W.wall : 0;
  }
  function wallCost(edgeKey, t) {
    const ex = guard(() => WO().getWall(edgeKey), null);
    t = Math.round(num(t));
    if (t === 0) return ex ? -Math.round(wallPrice(ex.t) * D().DEMOLISH_REFUND) : 0;
    if (ex && ex.t === t) return 0;
    return wallPrice(t) - (ex ? Math.round(wallPrice(ex.t) * D().DEMOLISH_REFUND) : 0);
  }
  function buildWall(edgeKey, t, c) {
    if (!S) return { ok: false, reason: 'Jogo não iniciado.', cost: 0 };
    t = Math.round(num(t));
    if ([0, 1, 2, 3].indexOf(t) < 0) return { ok: false, reason: 'Tipo inválido.', cost: 0 };
    const W = WO();
    if (W.isValidEdge && !W.isValidEdge(edgeKey)) return { ok: false, reason: 'Fora do terreno.', cost: 0 };
    const ex = guard(() => W.getWall(edgeKey), null);
    if (t === 0 && !ex) return { ok: false, reason: 'Não há parede aqui.', cost: 0 };
    if (ex && ex.t === t) {
      if (c != null && Math.round(num(c)) !== num(ex.c)) return Object.assign(paintWall(edgeKey, c), {});
      return { ok: false, reason: 'Já existe aqui.', cost: 0 };
    }
    if (W.canBuildWall) {
      const cb = guard(() => W.canBuildWall(edgeKey, t), { ok: true });
      if (cb && !cb.ok) return { ok: false, reason: cb.reason || 'Não é possível construir aqui.', cost: 0 };
    }
    const cost = wallCost(edgeKey, t);
    if (cost > 0 && num(S.money) < cost) return { ok: false, reason: 'Dinheiro insuficiente.', cost };
    const color = c != null ? Math.round(num(c)) : (ex ? num(ex.c) : 0);
    const ok = guard(() => W.setWall(edgeKey, t, color), false);
    if (ok === false) return { ok: false, reason: 'Não é possível construir aqui.', cost: 0 };
    if (cost) addMoney(-cost, t === 0 ? 'demolição' : 'construção');
    relocateSims();
    emit('lot');
    return { ok: true, reason: '', cost };
  }
  function floorCost(x, y, idx) {
    const F = D().FLOORS;
    const cur = num(S.lot.floors[y * S.lot.w + x]);
    if (cur === idx) return 0;
    if (idx === 0) return -Math.round(num((F[cur] || {}).price) * D().DEMOLISH_REFUND);
    return num((F[idx] || {}).price);
  }
  function paintFloor(x, y, idx) {
    if (!S) return { ok: false, cost: 0 };
    x = Math.round(num(x)); y = Math.round(num(y)); idx = Math.round(num(idx));
    const F = D().FLOORS;
    if (!inBounds(x, y) || !(idx >= 0 && idx < F.length)) return { ok: false, cost: 0, reason: 'Inválido.' };
    const cost = floorCost(x, y, idx);
    if (cost === 0 && num(S.lot.floors[y * S.lot.w + x]) === idx) return { ok: true, cost: 0 };
    if (cost > 0 && num(S.money) < cost) return { ok: false, cost, reason: 'Dinheiro insuficiente.' };
    guard(() => WO().setFloor(x, y, idx));
    if (cost) addMoney(-cost, 'piso');
    emit('lot');
    return { ok: true, cost };
  }
  function paintWall(edgeKey, idx) {
    if (!S) return { ok: false, cost: 0 };
    idx = Math.round(num(idx));
    const WP = D().WALLPAPERS;
    if (!(idx >= 0 && idx < WP.length)) return { ok: false, cost: 0, reason: 'Inválido.' };
    const ex = guard(() => WO().getWall(edgeKey), null);
    if (!ex) return { ok: false, cost: 0, reason: 'Não há parede aqui.' };
    if (num(ex.c) === idx) return { ok: true, cost: 0 };
    const cost = num(WP[idx].price);
    if (num(S.money) < cost) return { ok: false, cost, reason: 'Dinheiro insuficiente.' };
    guard(() => WO().setWall(edgeKey, ex.t, idx));
    addMoney(-cost, 'papel de parede');
    emit('lot');
    return { ok: true, cost };
  }
  function payBill(billId) {
    if (!S) return { ok: false };
    const b = S.bills.find((x) => x.id === billId);
    if (!b) return { ok: false, reason: 'Conta não encontrada.' };
    if (num(S.money) < num(b.amount)) return { ok: false, reason: 'Dinheiro insuficiente.' };
    addMoney(-num(b.amount), 'contas');
    S.bills.splice(S.bills.indexOf(b), 1);
    notify('Conta de ' + fmtMoney(b.amount) + ' paga.', 'money');
    return { ok: true };
  }
  function setFreeWill(v) { if (S) { S.settings.freeWill = !!v; } }
  function setSpeed(v) { if (S) S.speed = clamp(Math.round(num(v)), 0, 3); }
  function selectSim(id) {
    if (!S) return;
    const s = simById(id);
    S.settings.selectedSimId = s && !s.visitor ? s.id : null;
    emit('select', { simId: S.settings.selectedSimId });
  }

  // --------------------------------------------------------------- sim creation
  function normPersonality(p) {
    const out = {};
    for (const k of D().PERSONALITY) out[k] = clamp(Math.round(num(p && p[k], 5)), 0, 10);
    return out;
  }
  function randomColors() {
    const P = D().PALETTES;
    return { skin: pick(P.skin), hair: pick(P.hair), shirt: pick(P.shirt), pants: pick(P.pants) };
  }
  function randomPersonality() {
    const keys = D().PERSONALITY.slice();
    const p = {};
    for (const k of keys) p[k] = 0;
    let pts = D().PERSONALITY_POINTS;
    let guardN = 0;
    while (pts > 0 && guardN++ < 500) {
      const k = pick(keys);
      if (p[k] < 10) { p[k]++; pts--; }
    }
    return p;
  }
  function newSim(spec, pos) {
    spec = spec || {};
    const gender = spec.gender === 'm' ? 'm' : spec.gender === 'f' ? 'f' : (rand() < 0.5 ? 'f' : 'm');
    const colors = Object.assign(randomColors(), spec.colors || {});
    const motives = {};
    for (const k of D().MOTIVES) motives[k] = spec.motives && spec.motives[k] != null ? clamp(num(spec.motives[k]), -100, 100) : randInt(60, 100);
    motives.room = 0;
    const skills = {};
    for (const k of D().SKILLS) skills[k] = clamp(num(spec.skills && spec.skills[k]), 0, 10);
    const name = String(spec.name || (pick(D().NAMES[gender]) + ' ' + pick(D().NAMES.last))).slice(0, 40);
    return {
      id: nid(), name, gender, colors,
      personality: spec.personality ? normPersonality(spec.personality) : randomPersonality(),
      motives, skills, career: null, relationships: {}, x: pos ? pos.x : 0, y: pos ? pos.y : 0, facing: 0,
      queue: [], anim: 'idle', bubble: null, atWork: false, workReturnAt: 0, hidden: false,
      visitor: false, npcId: null, role: null, leaveAt: 0, lockouts: {}, asleep: false, seated: false, data: {},
    };
  }
  function addSim(spec) {
    if (!S) return null;
    const p = arrivalTile();
    const s = newSim(spec, p);
    if (spec && spec.career && D().CAREERS[spec.career.track]) {
      s.career = { track: spec.career.track, level: clamp(Math.round(num(spec.career.level, 1)), 1, 10), performance: 0, daysWorked: 0, missedDays: 0, hiredAt: nowAbs(), lastShift: 0 };
    }
    for (const h of household()) { relOf(s, h); relOf(h, s); }
    S.sims.push(s);
    emit('sims');
    return s;
  }
  function removeSim(id) {
    if (!S) return false;
    const s = simById(id);
    if (!s) return false;
    if (s.visitor) { removeVisitor(s); return true; }
    const i = S.sims.indexOf(s);
    S.sims.splice(i, 1);
    removeFromCarpools(s.id);
    for (const o of S.sims) {
      if (o.relationships) delete o.relationships[s.id];
      for (const a of o.queue.slice()) if (a.targetSimId === s.id) { if (o.queue[0] === a) a.cancel = true; else o.queue.splice(o.queue.indexOf(a), 1); }
    }
    if (S.settings.selectedSimId === s.id) S.settings.selectedSimId = household()[0] ? household()[0].id : null;
    emit('sims');
    return true;
  }

  // --------------------------------------------------------------- new game
  function baseState(seed, opts) {
    return {
      version: 1,
      householdName: opts.householdName || 'Família Alves',
      seed,
      nextId: 100,
      time: { day: 1, minute: 480 },
      speed: 1,
      money: 0,
      lot: { w: 24, h: 20, floors: new Array(24 * 20).fill(0), walls: {} },
      objects: [],
      sims: [],
      npcs: [],
      bills: [],
      lastBillDay: 1,
      notifications: [],
      settings: { freeWill: true, wallMode: 'cutaway', selectedSimId: null },
      stats: { daysPlayed: 0, earned: 0, spent: 0 },
      rngState: (seed >>> 0) || 12345,
      jobs: null,
      events: [],
      walkbyAt: null,
    };
  }
  function place(type, x, y, rot, extra) {
    const cp = guard(() => WO().canPlace(type, x, y, rot), { ok: true });
    if (cp && !cp.ok) { try { console.warn('[engine] starter placement failed', type, x, y, rot, cp.reason); } catch (e) { /* */ } return null; }
    const d = def(type);
    const o = Object.assign({ id: nid(), type, x, y, rot, dirty: 0, broken: false, boughtDay: 1, price: d ? d.price : 0, uses: 0 }, extra || {});
    if (type === 'plant_small' || type === 'plant_big') { o.water = 100; o.dryHours = 0; }
    if (d && d.light) o.on = true;
    S.objects.push(o);
    guard(() => WO().rebuild());
    return o;
  }
  function makeNpcs(n, avoidLast) {
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const gender = rand() < 0.5 ? 'f' : 'm';
      let name, tries = 0;
      do {
        let last = pick(D().NAMES.last);
        if (last === avoidLast) last = 'Silva';
        name = pick(D().NAMES[gender]) + ' ' + last;
      } while (used.has(name) && tries++ < 20);
      used.add(name);
      S.npcs.push({ id: nid(), name, gender, colors: randomColors(), personality: randomPersonality(), relationships: {}, known: false });
    }
  }
  function buildStarterHouse() {
    const W = WO();
    const F = { grass: 0, wood: 1, tile: 2, concrete: 3 };
    const fl = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) W.setFloor(x, y, f); };
    fl(7, 6, 11, 9, F.wood);       // bedroom
    fl(7, 10, 11, 13, F.wood);     // living room
    fl(12, 6, 16, 8, F.tile);      // bathroom
    fl(12, 9, 16, 13, F.tile);     // kitchen
    fl(9, 14, 9, 18, F.concrete);  // garden path
    fl(0, 19, 23, 19, F.concrete); // sidewalk
    const wall = (k, t, c) => W.setWall(k, t, c);
    const EXT = 1, LIV = 5, BATH = 9, KIT = 0, BED = 2;
    for (let x = 7; x <= 16; x++) { wall('h,' + x + ',6', 1, EXT); wall('h,' + x + ',14', 1, EXT); }
    for (let y = 6; y <= 13; y++) { wall('v,7,' + y, 1, EXT); wall('v,17,' + y, 1, EXT); }
    for (let x = 7; x <= 11; x++) wall('h,' + x + ',10', 1, BED);
    for (let y = 6; y <= 9; y++) wall('v,12,' + y, 1, BATH);
    for (let y = 10; y <= 13; y++) wall('v,12,' + y, 1, LIV);
    for (let x = 12; x <= 16; x++) wall('h,' + x + ',9', 1, KIT);
    // doors
    wall('h,9,14', 2, EXT); wall('h,9,10', 2, BED); wall('v,12,11', 2, LIV); wall('h,14,9', 2, KIT);
    // windows
    wall('h,9,6', 3, EXT); wall('v,7,8', 3, EXT); wall('h,15,6', 3, EXT); wall('v,17,11', 3, EXT);
    wall('h,15,14', 3, EXT); wall('v,7,11', 3, EXT); wall('h,11,14', 3, EXT);
    // bedroom
    place('bed_double', 7, 6, 0);
    place('end_table', 9, 6, 0);
    place('lamp_floor', 11, 6, 0);
    // bathroom
    place('toilet', 12, 6, 0);
    place('sink', 13, 6, 0);
    place('mirror', 14, 6, 0);
    place('lamp_floor', 15, 6, 0);
    place('shower', 16, 6, 0);
    // kitchen
    place('fridge_cheap', 16, 9, 1);
    place('counter', 16, 10, 1);
    place('counter', 16, 11, 1);
    place('stove', 16, 12, 1);
    place('counter', 16, 13, 1);
    place('table_dining', 13, 11, 0);
    place('chair_wood', 13, 10, 0);
    place('chair_wood', 14, 12, 2);
    place('trash_can', 12, 13, 2);
    place('lamp_floor', 12, 9, 0);
    // living room
    place('tv_cheap', 7, 10, 0);
    place('sofa_cheap', 7, 12, 2);
    place('lamp_floor', 7, 13, 3);
    place('bookshelf', 8, 10, 0);
    place('plant_small', 11, 10, 0);
    place('painting_cheap', 10, 10, 0);
    place('phone', 11, 13, 2);
    // street
    place('mailbox', 10, 18, 2);
  }
  function newGame(opts) {
    opts = opts || {};
    const seed = opts.seed != null ? (num(opts.seed) >>> 0) : ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    S = baseState(seed, opts);
    guard(() => WO().init(S));
    if (opts.empty) {
      S.money = D().MONEY.startEmpty;
      S.householdName = opts.householdName || 'Nova família';
      for (let x = 0; x < S.lot.w; x++) WO().setFloor(x, S.lot.h - 1, 3);
      place('mailbox', Math.floor(S.lot.w / 2), S.lot.h - 2, 2);
      const members = Array.isArray(opts.members) && opts.members.length ? opts.members.slice(0, 8) : [{}];
      const base = arrivalTile();
      members.forEach((m, i) => {
        const s = newSim(m, { x: clamp(base.x + i, 0, S.lot.w - 1), y: base.y });
        if (!walkable(s.x, s.y)) { s.x = base.x; s.y = base.y; }
        if (m && m.career && D().CAREERS[m.career.track]) s.career = { track: m.career.track, level: 1, performance: 0, daysWorked: 0, missedDays: 0, hiredAt: nowAbs(), lastShift: 0 };
        S.sims.push(s);
      });
      const hh = household();
      for (const a of hh) for (const b of hh) if (a !== b) { const r = relOf(a, b); r.daily = 40; r.lifetime = 50; }
      if (!opts.householdName && hh[0]) {
        const parts = hh[0].name.split(' ');
        if (parts.length > 1) S.householdName = 'Família ' + parts[parts.length - 1];
      }
      makeNpcs(8, null);
    } else {
      S.money = D().MONEY.startFamily;
      buildStarterHouse();
      const rita = newSim({
        name: 'Rita Alves', gender: 'f', personality: { neat: 6, outgoing: 5, active: 4, playful: 5, nice: 5 },
        skills: { cooking: 2, creativity: 1 }, colors: { skin: '#c98e66', hair: '#3b2a1e', shirt: '#2a9d8f', pants: '#3d405b' },
        motives: { hunger: 70, energy: 85, comfort: 70, fun: 65, hygiene: 80, social: 60, bladder: 75 },
      }, { x: 10, y: 12 });
      const caio = newSim({
        name: 'Caio Alves', gender: 'm', personality: { neat: 3, outgoing: 6, active: 6, playful: 6, nice: 4 },
        skills: { charisma: 1, mechanical: 1 }, colors: { skin: '#a86f4c', hair: '#1c1714', shirt: '#e4572e', pants: '#1d3557' },
        motives: { hunger: 65, energy: 90, comfort: 75, fun: 70, hygiene: 85, social: 65, bladder: 70 },
      }, { x: 13, y: 9 });
      S.sims.push(rita, caio);
      caio.career = { track: 'negocios', level: 1, performance: 0, daysWorked: 0, missedDays: 0, hiredAt: 0, lastShift: 0 };
      for (const [a, b] of [[rita, caio], [caio, rita]]) { const r = relOf(a, b); r.daily = 65; r.lifetime = 75; }
      makeNpcs(8, 'Alves');
      // three neighbours already know the family
      for (let i = 0; i < 3 && i < S.npcs.length; i++) {
        const n = S.npcs[i];
        n.known = true;
        for (const h of [rita, caio]) { const r = npcRel(h, n, true); r.hn.daily = randInt(15, 30); r.nh.daily = randInt(15, 30); r.hn.lifetime = 10; r.nh.lifetime = 10; }
      }
      S.settings.selectedSimId = rita.id;
    }
    if (!S.settings.selectedSimId && household()[0]) S.settings.selectedSimId = household()[0].id;
    ensureJobs();
    // morning newspaper is already at the door on the first day
    guard(onMorning);
    S.walkbyAt = S.time.day * 1440 + randInt(10 * 60, 17 * 60);
    init(S);
    return S;
  }

  // --------------------------------------------------------------- init / sanitize
  function sanitizeState(st) {
    if (!st.time || typeof st.time !== 'object') st.time = { day: 1, minute: 480 };
    st.time.day = Math.max(1, Math.round(num(st.time.day, 1)));
    st.time.minute = clamp(num(st.time.minute, 480), 0, 1439.999);
    st.money = Math.round(num(st.money, 0));
    if (!Array.isArray(st.objects)) st.objects = [];
    st.objects = st.objects.filter((o) => o && typeof o === 'object' && def(o.type));
    if (!Array.isArray(st.sims)) st.sims = [];
    if (!Array.isArray(st.npcs)) st.npcs = [];
    if (!Array.isArray(st.bills)) st.bills = [];
    st.bills = st.bills.filter((b) => b && isFinite(+b.amount));
    if (!Array.isArray(st.notifications)) st.notifications = [];
    if (!Array.isArray(st.events)) st.events = [];
    if (!st.settings || typeof st.settings !== 'object') st.settings = {};
    if (st.settings.freeWill === undefined) st.settings.freeWill = true;
    if (!st.settings.wallMode) st.settings.wallMode = 'cutaway';
    if (st.settings.selectedSimId === undefined) st.settings.selectedSimId = null;
    if (!st.stats || typeof st.stats !== 'object') st.stats = { daysPlayed: 0 };
    if (st.lastBillDay == null) st.lastBillDay = st.time.day;
    if (!(st.rngState >>> 0)) st.rngState = (num(st.seed, 12345) >>> 0) || 12345;
    if (st.speed == null) st.speed = 1;
    if (!st.householdName) st.householdName = 'Família';
    let maxId = num(st.nextId, 100);
    const see = (id) => { if (isFinite(+id) && +id > maxId) maxId = +id; };
    for (const o of st.objects) {
      if (o.id == null) o.id = ++maxId; see(o.id);
      o.x = Math.round(num(o.x)); o.y = Math.round(num(o.y)); o.rot = normRot(o.rot);
      o.dirty = clamp(num(o.dirty), 0, 1000); o.broken = !!o.broken; o.uses = num(o.uses);
      if (o.boughtDay == null) o.boughtDay = st.time.day;
      if (o.price == null) o.price = (def(o.type) || {}).price || 0;
    }
    for (const n of st.npcs) {
      if (n.id == null) n.id = ++maxId; see(n.id);
      if (!n.relationships || typeof n.relationships !== 'object') n.relationships = {};
      if (!n.personality) n.personality = { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 };
      if (!n.colors) n.colors = { skin: '#c98e66', hair: '#3b2a1e', shirt: '#669bbc', pants: '#2b2d42' };
      if (!n.name) n.name = 'Vizinho';
    }
    for (const b of st.bills) { if (b.id == null) b.id = ++maxId; see(b.id); }
    for (const n of st.notifications) see(n.id);
    for (const e of st.events) see(e.id);
    st.sims = st.sims.filter((s) => s && typeof s === 'object');
    for (const s of st.sims) {
      if (s.id == null) s.id = ++maxId; see(s.id);
      if (!s.name) s.name = 'Morador';
      if (s.gender !== 'm' && s.gender !== 'f') s.gender = 'f';
      if (!s.colors) s.colors = { skin: '#c98e66', hair: '#3b2a1e', shirt: '#669bbc', pants: '#2b2d42' };
      s.personality = normPersonality(s.personality);
      if (!s.motives || typeof s.motives !== 'object') s.motives = {};
      for (const k of D().MOTIVES) s.motives[k] = clamp(num(s.motives[k], 50), -100, 100);
      if (!s.skills || typeof s.skills !== 'object') s.skills = {};
      for (const k of D().SKILLS) s.skills[k] = clamp(num(s.skills[k]), 0, 10);
      if (s.career && (!D().CAREERS[s.career.track])) s.career = null;
      if (s.career) {
        s.career.level = clamp(Math.round(num(s.career.level, 1)), 1, D().CAREERS[s.career.track].levels.length);
        s.career.performance = clamp(num(s.career.performance), -100, 100);
        s.career.daysWorked = num(s.career.daysWorked); s.career.missedDays = num(s.career.missedDays);
        s.career.lastShift = num(s.career.lastShift); s.career.hiredAt = num(s.career.hiredAt);
      }
      if (!s.relationships || typeof s.relationships !== 'object') s.relationships = {};
      s.x = num(s.x, 0); s.y = num(s.y, 0); s.facing = num(s.facing, 0);
      if (!Array.isArray(s.queue)) s.queue = [];
      s.queue = s.queue.filter((a) => a && typeof a === 'object' && (a.kind === 'object' || a.kind === 'social' || a.kind === 'walk'));
      for (const a of s.queue) {
        if (a.id == null) a.id = ++maxId; see(a.id);
        if (!a.data || typeof a.data !== 'object') a.data = {};
        if (a.prio == null) a.prio = a.source === 'player' ? PRIO.player : PRIO.auto;
        if (!Array.isArray(a.path)) a.path = [];
        a.elapsed = num(a.elapsed); a.progress = num(a.progress);
      }
      s.anim = s.anim || 'idle';
      if (s.bubble && (typeof s.bubble !== 'object' || !isFinite(+s.bubble.until))) s.bubble = null;
      s.atWork = !!s.atWork; s.hidden = !!s.hidden; s.workReturnAt = num(s.workReturnAt);
      s.visitor = !!s.visitor; if (s.npcId === undefined) s.npcId = null; if (s.role === undefined) s.role = null; s.leaveAt = num(s.leaveAt);
      if (!s.lockouts || typeof s.lockouts !== 'object') s.lockouts = {};
      s.asleep = !!s.asleep; s.seated = !!s.seated;
      if (!s.data || typeof s.data !== 'object') s.data = {};
      if (s.hidden && !s.atWork && !num(s.data.awayUntil)) s.hidden = false;
      if (s.atWork && !s.career) { s.atWork = false; s.hidden = false; }
    }
    // visitors whose npc vanished
    st.sims = st.sims.filter((s) => !s.visitor || s.role !== 'guest' || st.npcs.some((n) => n.id === s.npcId) || s.npcId == null);
    st.nextId = Math.max(maxId, num(st.nextId, 100));
    if (!st.lot || typeof st.lot !== 'object') st.lot = { w: 24, h: 20, floors: [], walls: {} };
  }
  function init(state) {
    if (!state || typeof state !== 'object') return null;
    S = state;
    sanitizeState(S);
    objMapRef = null;
    rebuildObjMap();
    guard(() => WO().init(S));
    // characters standing inside furniture (old saves / edits) step out
    for (const s of S.sims) {
      if (s.hidden) continue;
      const a = s.queue[0];
      if (a && a.slot && a.slot.on && (a.phase === 'do' || a.phase === 'enter' || a.phase === 'exit')) continue;
      const t = simTile(s);
      if (!inBounds(t.x, t.y) || !walkable(t.x, t.y)) {
        const nw = guard(() => WO().nearestWalkable(clamp(s.x, 0, S.lot.w - 1), clamp(s.y, 0, S.lot.h - 1)), null);
        if (nw) { s.x = nw.x; s.y = nw.y; }
      }
      if (a && a.phase === 'walk') a.phase = 'route';
    }
    ensureJobs();
    emit('sims'); emit('objects'); emit('lot');
    return S;
  }

  // --------------------------------------------------------------- misc API
  function relationships(simId) {
    const sim = simById(simId);
    if (!sim) return [];
    const out = [];
    for (const key in (sim.relationships || {})) {
      const r = sim.relationships[key];
      const other = simById(+key) || npcById(+key);
      if (!other || !r) continue;
      const back = other.motives ? relPeek(other, sim) : (other.relationships && other.relationships[sim.id]) || { daily: 0 };
      out.push({
        id: other.id, name: other.name, daily: Math.round(num(r.daily)), lifetime: Math.round(num(r.lifetime)),
        friend: num(r.daily) >= 50 && num(back.daily) >= 50, household: !!(other.motives && !other.visitor), known: other.known !== false,
      });
    }
    return out.sort((a, b) => b.daily - a.daily);
  }
  function phoneBook() {
    return knownNpcs().map((n) => ({ id: n.id, name: n.name, onLot: S.sims.some((s) => s.npcId === n.id) }));
  }
  function allAsleepOrAway() {
    const hh = household();
    return hh.length > 0 && hh.every((s) => s.hidden || s.asleep);
  }
  function netWorth() { return num(S.money) + objectsValue(); }
  function slotsFor(objId) { const o = objById(objId); return o ? objSlots(o, null) : []; }

  M.engine = {
    init, newGame, update,
    get state() { return S; },
    mood, moodColor, getInteractions, getSocials, queueInteraction, queueSocial, queueWalk, cancelAction,
    buyObject, sellObject, moveObject, buildWall, paintFloor, paintWall, payBill, setFreeWill, addSim, removeSim,
    characters() { return S ? S.sims : []; },
    // additions (see notes/engine.md)
    household() { return S ? household() : []; },
    visitors() { return S ? visitors() : []; },
    simById, objectById: objById, npcById, selectSim, setSpeed, sellValue, wallCost, floorCost,
    jobOffers, acceptJob, quitJob, careerInfo, familyFriends, relationships, phoneBook, totalBills,
    netWorth, allAsleepOrAway, slotsFor,
    debug: {
      scoreAds, effectiveAds, runAutonomy, curve: (k, m) => D().curve(k, m),
      set throwErrors(v) { debugThrow = !!v; }, get throwErrors() { return debugThrow; },
      get lastError() { return lastError; },
      rand: () => rand(),
    },
  };
})(window.M = window.M || {});
