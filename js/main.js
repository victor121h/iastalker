(function (M) {
  'use strict';

  // ===========================================================================
  // M.main — bootstrap + game loop.
  //
  // Boot: loading screen (already in the HTML) → M.save.init() in the background →
  // active slot (localStorage 'morada:activeSlot', default 'slot1') → state from the
  // live-update snapshot, else M.save.loadEntry(slot) with a ~1.5 s cloud budget
  // (local mirror otherwise), else M.engine.newGame() → M.engine.init →
  // M.render.init(#view) → M.ui.init → requestAnimationFrame loop.
  // After boot (CONTRACT_V2 §5):
  //  - when the cloud was not read in time, a late cloud check keeps retrying in the
  //    background; a newer cloud save from another session opens a modal choice
  //    ("Continuar o jogo da nuvem" / "Manter este jogo") — M.save blocks cloud
  //    writes for that slot until the player chooses, so nothing is overwritten;
  //  - an unreadable save opens a recovery modal (backup / copy the data / new game)
  //    and nothing is written to that slot until the player picks one.
  // Autosave: every 3 real minutes while something changed, on a new sim day and when
  // the page is hidden / closed.
  //
  // Loop: real dt (clamped to 0.1 s) × speed factor = sim minutes, stepped through
  // M.engine.update in substeps of at most 0.5 sim-minutes, within a per-frame engine
  // budget (whatever does not fit is dropped, never carried over: no catch-up spiral
  // after a slow frame or a background tab). Time stands still while any pause reason
  // is active (UI modes 'buy'/'build', modal dialogs, the help card, a hidden tab...):
  //   M.main.setPaused('buy', true) ... M.main.setPaused('buy', false)
  // ===========================================================================

  const SPEED_FACTORS = [0, 1, 3, 10];     // sim minutes per real second
  const ULTRA_ASLEEP = 30;                 // ultra speed while everyone sleeps / is away
  const MAX_STEP = 0.5;                    // sim minutes per engine substep
  const MAX_DT = 0.1;                      // real seconds per frame (clamp)
  const MAX_SUBSTEPS = 64;                 // hard cap of engine substeps per frame
  const ENGINE_BUDGET_MS = 18;             // engine time per frame; the rest of the frame's sim time is dropped
  const CLOUD_BOOT_WAIT = 1500;            // ms to wait for the cloud save at boot
  const AUTOSAVE_MS = 3 * 60 * 1000;       // periodic autosave while dirty
  const RESUME_RECHECK_MS = 30 * 1000;     // hidden longer than this → re-check the cloud on return
  const DISMISSED = '__dismissed__';
  /** Known pause reasons (any string works; these are the ones the game uses) → pt-BR label. */
  const PAUSE_REASONS = {
    buy: 'Modo Comprar', build: 'Modo Construir', options: 'Opções', modal: 'Janela aberta', help: 'Ajuda',
    save: 'Escolha do jogo salvo', recovery: 'Recuperação do jogo salvo', hidden: 'Jogo em segundo plano', ui: 'Pausado',
  };

  let state = null;
  let container = null;
  let started = false;
  let running = false;
  let rafId = 0;
  let lastTs = 0;
  let slot = 'slot1';
  let dirty = false;
  let saving = null;           // in-flight save promise
  let lastSavedAt = 0;
  let renderReady = false;
  const pauses = new Set();
  let busBound = false;
  let lastRunSpeed = 1;
  let saveBlock = null;        // { slot, reason } — writes suspended until the player decides (unreadable save)
  let autosaveTimer = 0;
  let autosaveEvery = AUTOSAVE_MS;
  let hiddenAt = 0;
  const cloudCheck = { token: 0, running: false, slot: null, lastResult: null };
  const shownConflicts = {};
  const conflictQueue = [];
  let conflictBusy = false;
  let conflictUnsub = null;
  const errs = { engine: 0, render: 0, ui: 0 };
  const stats = { frames: 0, steps: 0, droppedSimMin: 0, slowFrames: 0, lastEngineMs: 0, maxEngineMs: 0 };

  // ---------------------------------------------------------------- helpers
  function $(id) { return document.getElementById(id); }
  function num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
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
  function bus() { return M.util && M.util.bus; }
  function emit(evt, payload) { try { if (bus()) bus().emit(evt, payload); } catch (e) { /* ignore */ } }
  function hasSave(fn) { return !!(M.save && typeof M.save[fn] === 'function'); }
  function slotLabel(s) {
    s = s == null ? slot : s;
    if (hasSave('slotLabel')) { try { return M.save.slotLabel(s); } catch (e) { /* ignore */ } }
    const m = /^slot(\d+)$/.exec(String(s));
    return m ? 'Espaço ' + m[1] : String(s);
  }
  function fmtMoney(n) { return M.util && M.util.fmtMoney ? M.util.fmtMoney(n) : 'M$ ' + Math.round(num(n, 0)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /** 'hoje às 14:05' / 'ontem às 14:05' / 'em 12/10/2026 às 14:05' */
  function fmtWhen(ts) {
    ts = num(ts, 0);
    if (!(ts > 0)) return '';
    const d = new Date(ts), t = new Date();
    const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    const day0 = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day0(t) - day0(d)) / 86400000);
    if (diff === 0) return 'hoje às ' + hm;
    if (diff === 1) return 'ontem às ' + hm;
    return 'em ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' às ' + hm;
  }
  function metaOfState(st) {
    st = st || {};
    const sims = Array.isArray(st.sims) ? st.sims.filter((s) => s && !s.visitor) : [];
    return { householdName: String(st.householdName || 'Família'), day: Math.max(1, Math.round(num(st.time && st.time.day, 1))), money: Math.round(num(st.money, 0)), members: sims.length };
  }
  function cleanMeta(m, st) {
    const base = st ? metaOfState(st) : { householdName: 'Família', day: 1, money: 0, members: 0 };
    if (!m || typeof m !== 'object') return base;
    return {
      householdName: String(m.householdName || base.householdName),
      day: Math.max(1, Math.round(num(m.day, base.day))),
      money: Math.round(num(m.money, base.money)),
      members: Math.round(num(m.members, base.members)),
    };
  }
  /** Short description for a button: 'Dia 9, Família Alves, salvo hoje às 14:05'. */
  function shortDesc(meta, savedAt) {
    const m = cleanMeta(meta);
    const w = fmtWhen(savedAt);
    return 'Dia ' + m.day + ', ' + m.householdName + (w ? ', salvo ' + w : '');
  }

  // ------------------------------------------------------------- overlays
  function setLoading(text) {
    const el = $('boot');
    if (!el) return;
    el.hidden = false;
    el.classList.remove('is-done');
    const t = $('boot-text');
    if (t && text) t.textContent = text;
  }
  function hideLoading() {
    const el = $('boot');
    if (!el || el.hidden) return;
    el.classList.add('is-done');
    setTimeout(() => { el.hidden = true; }, 450);
  }
  function bootCovering() {
    const el = $('boot');
    return !!(el && !el.hidden && !el.classList.contains('is-done'));
  }
  function friendlyMessage(err) {
    const msg = String((err && err.message) || err || '');
    if (/THREE|WebGL|webgl|context/i.test(msg)) {
      return 'Não foi possível iniciar o desenho 3D. Verifique se o seu navegador permite WebGL e se a conexão carregou a biblioteca gráfica.';
    }
    if (/m[oó]dulo|faltando|missing/i.test(msg)) {
      return 'Alguns arquivos do jogo não carregaram. Recarregue a página para tentar de novo.';
    }
    return 'Algo deu errado ao preparar a sua casa.';
  }
  /** Friendly pt-BR error overlay instead of a blank page. */
  function fatal(err, where) {
    try { console.error('[Morada]', where || '', err); } catch (e) { /* ignore */ }
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    const box = $('fatal');
    const bootEl = $('boot');
    if (bootEl) bootEl.hidden = true;
    if (!box) return;
    const msgEl = $('fatal-msg'), detEl = $('fatal-detail');
    if (msgEl) msgEl.textContent = friendlyMessage(err);
    if (detEl) detEl.textContent = (where ? '[' + where + '] ' : '') + String((err && (err.stack || err.message)) || err || 'erro desconhecido').slice(0, 1500);
    const btnReload = $('fatal-reload'), btnNew = $('fatal-new'), btnSave = $('fatal-save');
    if (btnReload) btnReload.onclick = () => { try { location.reload(); } catch (e) { /* ignore */ } };
    if (btnNew) btnNew.onclick = () => {
      box.hidden = true;
      restart({ fresh: true });
    };
    if (btnSave) {
      btnSave.hidden = !state || !!(saveBlock && saveBlock.slot === slot);
      btnSave.onclick = () => {
        btnSave.disabled = true;
        btnSave.textContent = 'Salvando…';
        saveNow().then((r) => {
          btnSave.textContent = r && r.ok ? 'Salvo!' : 'Não foi possível salvar';
        });
      };
    }
    box.hidden = false;
  }

  function missingModules() {
    const need = ['util', 'data', 'world', 'engine', 'render', 'save', 'ui'];
    const miss = need.filter((k) => !M[k]);
    if (typeof window.THREE === 'undefined' && miss.indexOf('render') < 0 && !(M.render && M.render.noThree)) miss.push('THREE');
    return miss;
  }

  // ---------------------------------------------------------------- speed
  function getSpeed() { return state ? Math.max(0, Math.min(3, Math.round(num(state.speed, 1)))) : 0; }
  function speedPayload() { return { speed: getSpeed(), factor: speedFactor(), paused: isPaused(), reasons: pauseReasons() }; }
  function setSpeed(n) {
    n = Math.max(0, Math.min(3, Math.round(num(n, 1))));
    if (!state) return;
    if (M.engine && typeof M.engine.setSpeed === 'function') M.engine.setSpeed(n); else state.speed = n;
    if (n > 0) lastRunSpeed = n;
    emit('speed', speedPayload());
  }
  function togglePause() {
    const s = getSpeed();
    if (s > 0) { lastRunSpeed = s; setSpeed(0); } else setSpeed(lastRunSpeed || 1);
  }
  /**
   * Adds / removes a pause reason (time stands still while any is active; the player's speed is kept).
   * on defaults to true. Emits 'pause' {paused, reasons} whenever the set changes and 'speed' when the
   * effective state flips. Returns the current reasons.
   */
  function setPaused(reason, on) {
    reason = String(reason || 'ui');
    on = on === undefined ? true : !!on;
    const before = pauses.size > 0;
    const had = pauses.has(reason);
    if (on) pauses.add(reason); else pauses.delete(reason);
    if (had !== on) emit('pause', { paused: pauses.size > 0, reasons: pauseReasons(), reason, on });
    if (before !== (pauses.size > 0)) emit('speed', speedPayload());
    return pauseReasons();
  }
  function isPaused() { return pauses.size > 0 || getSpeed() === 0; }
  function pauseReasons() { return Array.from(pauses); }
  /** pt-BR label of the most relevant active pause reason ('' when running; 'Pausado' for the player's own pause). */
  function pauseLabel() {
    for (const k of ['recovery', 'save', 'modal', 'build', 'buy', 'options', 'help', 'hidden']) if (pauses.has(k)) return PAUSE_REASONS[k];
    if (pauses.size) return PAUSE_REASONS[Array.from(pauses)[0]] || 'Pausado';
    return getSpeed() === 0 && state ? 'Pausado' : '';
  }
  function ultraBoost() {
    try { return !!(M.engine && typeof M.engine.allAsleepOrAway === 'function' && M.engine.allAsleepOrAway()); } catch (e) { return false; }
  }
  /** Effective sim minutes per real second right now. */
  function speedFactor() {
    if (!state || pauses.size > 0) return 0;
    const s = getSpeed();
    if (s === 3 && ultraBoost()) return ULTRA_ASLEEP;
    return SPEED_FACTORS[s] || 0;
  }

  // ------------------------------------------------------------------ loop
  function logErr(kind, e) {
    const n = errs[kind];
    if (n === 1 || n % 30 === 0) { try { console.error('[Morada] ' + kind, (e && e.stack) || e); } catch (x) { /* ignore */ } }
    if (n > 90) fatal(e, kind === 'engine' ? 'loop' : kind);
  }
  function stepEngine(dt) {
    const f = speedFactor();
    if (!(f > 0) || !(dt > 0)) { stats.lastEngineMs = 0; return; }
    let simMin = dt * f;
    let n = 0;
    const t0 = now();
    while (simMin > 1e-9 && n < MAX_SUBSTEPS) {
      const step = Math.min(MAX_STEP, simMin);
      M.engine.update(step);
      simMin -= step;
      n++;
      // over budget: drop the rest of this frame's sim time (never carried over to later frames)
      if (simMin > 1e-9 && now() - t0 > ENGINE_BUDGET_MS) break;
    }
    if (simMin > 1e-9) { stats.droppedSimMin += simMin; stats.slowFrames++; }
    stats.steps += n;
    stats.lastEngineMs = now() - t0;
    if (stats.lastEngineMs > stats.maxEngineMs) stats.maxEngineMs = stats.lastEngineMs;
    dirty = true;
  }
  function frame(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    let dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (!(dt > 0)) dt = 0;          // also NaN / clock going backwards
    if (dt > MAX_DT) dt = MAX_DT;   // a long gap (background tab, debugger, hitch) never turns into a burst
    stats.frames++;
    try { stepEngine(dt); errs.engine = 0; } catch (e) { errs.engine++; logErr('engine', e); }
    if (!running) return;
    if (renderReady) { try { M.render.frame(dt); errs.render = 0; } catch (e) { errs.render++; logErr('render', e); } }
    if (!running) return;
    if (M.ui && typeof M.ui.update === 'function') { try { M.ui.update(dt); errs.ui = 0; } catch (e) { errs.ui++; logErr('ui', e); } }
  }
  function startLoop() {
    if (running) return;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      setPaused('hidden', true);
      if (dirty) autosave('hidden');
    } else {
      lastTs = 0;
      setPaused('hidden', false);
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      // another device may have saved meanwhile: compare again before the next cloud write
      if (away > RESUME_RECHECK_MS && hasSave('invalidate')) {
        try { M.save.invalidate(); } catch (e) { /* ignore */ }
        scheduleCloudCheck('resume');
      }
    }
  }
  function bindBus() {
    if (busBound || !bus()) return;
    busBound = true;
    const B = bus();
    // M.render subscribes to 'lot'/'objects'/'sims' itself; here they only mark the game as changed.
    B.on('lot', () => { dirty = true; });
    B.on('objects', () => { dirty = true; });
    B.on('sims', () => { dirty = true; });
    B.on('money', () => { dirty = true; });
    // a new sim day: autosave right after the current frame (never mid engine step)
    B.on('day', () => { setTimeout(() => autosave('day'), 0); });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => { if (dirty) autosave('hidden'); });
    window.addEventListener('pageshow', () => { lastTs = 0; });
    if (hasSave('onConflict') && !conflictUnsub) conflictUnsub = M.save.onConflict((c) => handleConflict(c));
  }

  // ------------------------------------------------------------------ autosave
  function startAutosave() {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(() => { if (dirty) autosave('periodic'); }, Math.max(1000, autosaveEvery));
  }
  function setAutosaveInterval(ms) {
    autosaveEvery = Math.max(1000, num(ms, AUTOSAVE_MS));
    if (autosaveTimer) startAutosave();
    return autosaveEvery;
  }

  // ------------------------------------------------------------------ slots
  /** Makes `s` the active slot (persisted in localStorage 'morada:activeSlot'). */
  function setSlot(s) {
    if (!s) return slot;
    s = String(s);
    const changed = s !== slot;
    slot = s;
    if (hasSave('setActiveSlot')) { try { M.save.setActiveSlot(s); } catch (e) { /* ignore */ } }
    if (changed) emit('slot', { slot, label: slotLabel(slot) });
    return slot;
  }
  function initialSlot(data) {
    if (data && typeof data.slot === 'string' && /^[A-Za-z0-9_\-]{1,40}$/.test(data.slot)) return data.slot;
    if (hasSave('activeSlot')) { try { const s = M.save.activeSlot(); if (s) return s; } catch (e) { /* ignore */ } }
    return slot || 'slot1';
  }
  /**
   * CONTRACT_V2 §5: the save chip names the active slot. The chip belongs to M.ui; when its 'saved'
   * text does not mention the slot yet, append it (M.ui clears the chip itself a few seconds later).
   */
  function labelSaveChip(r) {
    try {
      const chip = document.querySelector('.save-chip');
      if (!chip) return;
      const label = slotLabel(r && r.slot);
      chip.title = label + (state ? ' · ' + (state.householdName || '') : '');
      const t = chip.textContent || '';
      if (t && !/Espaço|slot/i.test(t)) chip.textContent = t + ' · ' + label;
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ saving
  function blockedSlot(s) { return !!(saveBlock && saveBlock.slot === s); }
  function emitSaved(target, r) {
    const p = Object.assign({ slot: target, slotLabel: slotLabel(target) }, r || { ok: false, where: 'none' });
    p.slot = target;
    emit('saved', p);
    labelSaveChip(p);
  }
  function saveNow(slotArg) {
    if (!state || !M.save) return Promise.resolve({ ok: false, where: 'none', error: 'Sem jogo.' });
    const target = slotArg ? String(slotArg) : slot;
    const switching = !!slotArg && target !== slot;
    if (blockedSlot(target)) return Promise.resolve({ ok: false, where: 'none', error: 'blocked', slot: target });
    if (switching) setSlot(target);
    const wasDirty = dirty;
    dirty = false;
    const st = state;
    const run = async () => {
      // the player explicitly saves over a slot whose stored game could not be read: keep that one apart first
      if (switching && hasSave('isBlocked') && M.save.isBlocked(target) && hasSave('quarantine')) await M.save.quarantine(target);
      return M.save.save(st, target, switching ? { replace: true } : undefined);
    };
    const p = run().then((r) => {
      if (r && r.ok) { lastSavedAt = Date.now(); emitSaved(target, r); }
      else { dirty = dirty || wasDirty; emitSaved(target, r); }
      if (r && r.conflict) handleConflict(Object.assign({ slot: target }, r.conflict));
      return r;
    }).catch((e) => {
      dirty = true;
      const r = { ok: false, where: 'none', error: String(e && e.message || e) };
      emitSaved(target, r);
      return r;
    });
    saving = p;
    p.then(() => { if (saving === p) saving = null; });
    return p;
  }
  function autosave(why) {
    if (!state || !dirty || blockedSlot(slot)) return;
    if (saving) { saving.then(() => { if (dirty && !blockedSlot(slot)) saveNow(); }); return; }
    saveNow().then((r) => { if (r) r.auto = why; });
  }

  // ------------------------------------------------------------- state swap
  /** Starts a fresh game. opts: { householdName, members:[spec], lot: 'starter'|'empty', seed } */
  function buildNewGame(opts) {
    opts = opts || {};
    const E = M.engine;
    const members = Array.isArray(opts.members) ? opts.members.filter(Boolean).slice(0, 8) : [];
    if (opts.lot === 'empty') {
      return E.newGame({ empty: true, members: members.length ? members : [{}], householdName: opts.householdName, seed: opts.seed });
    }
    const st = E.newGame({ seed: opts.seed, householdName: opts.householdName });
    if (!members.length) return st;
    // Furnished starter house with a custom household: replace the default family.
    const defaults = E.household ? E.household().slice() : st.sims.filter((s) => !s.visitor);
    const added = [];
    for (const spec of members) { const s = E.addSim(spec); if (s) added.push(s); }
    if (!added.length) return st;
    for (const s of defaults) E.removeSim(s.id);
    for (const a of added) for (const b of added) {
      if (a === b) continue;
      if (!a.relationships) a.relationships = {};
      a.relationships[b.id] = { daily: 40, lifetime: 50 };
    }
    // neighbours forget the previous family
    for (const n of (st.npcs || [])) {
      if (!n || !n.relationships) continue;
      for (const s of defaults) delete n.relationships[s.id];
    }
    if (opts.householdName) st.householdName = String(opts.householdName).slice(0, 40);
    if (E.selectSim) E.selectSim(added[0].id); else st.settings.selectedSimId = added[0].id;
    if (Array.isArray(st.notifications)) st.notifications.length = 0;
    E.init(st);
    return st;
  }

  function attachRender(st) {
    const R = M.render;
    if (!renderReady) {
      R.init(container, st);
      renderReady = true;
      return;
    }
    // M.render.init is idempotent (re-reads the state and rebuilds); prefer setState when offered.
    if (typeof R.setState === 'function') R.setState(st);
    else R.init(container, st);
  }

  function applySettings(st) {
    try {
      const wm = st.settings && st.settings.wallMode;
      if (wm && M.render.setWallMode) M.render.setWallMode(wm);
      const sel = st.settings && st.settings.selectedSimId;
      if (sel != null && M.render.setSelected) M.render.setSelected(sel);
    } catch (e) { /* ignore */ }
  }

  /** Replaces the running game with another state (load, import, new family). */
  function loadState(st, info) {
    if (!st || typeof st !== 'object') return false;
    const prev = state;
    try {
      M.engine.init(st);
      state = M.engine.state || st;
      attachRender(state);
      applySettings(state);
      if (M.ui && typeof M.ui.reset === 'function') M.ui.reset(info || {});
      dirty = false;
      lastRunSpeed = getSpeed() || 1;
      emit('state', { state, info: info || {} });
      return true;
    } catch (e) {
      try { console.error('[Morada] loadState', e); } catch (x) { /* ignore */ }
      if (prev && prev !== st) {
        try { M.engine.init(prev); state = prev; attachRender(prev); if (M.ui && M.ui.reset) M.ui.reset({}); } catch (x) { fatal(e, 'loadState'); }
      } else fatal(e, 'loadState');
      return false;
    }
  }
  function newGame(opts) {
    const st = buildNewGame(opts || {});
    const ok = loadState(st, { kind: 'new' });
    if (ok) { dirty = true; saveNow(); }
    return ok;
  }
  async function loadSlot(slotName) {
    if (!M.save) return { ok: false };
    const target = slotName ? String(slotName) : slot;
    const e = await M.save.loadEntry(target);
    if (e && e.unreadable) {
      recover(target, e.unreadable, { context: 'load', backup: e.backup || null });
      return { ok: false, unreadable: true, error: 'Este jogo salvo não pôde ser aberto.' };
    }
    if (!e || !e.state) return { ok: false, error: 'Nenhum jogo salvo neste espaço.' };
    const prevSlot = slot;
    if (target !== slot) setSlot(target);
    const ok = loadState(e.state, { kind: 'load', where: e.where, slot: target });
    if (!ok) {
      if (prevSlot !== target) setSlot(prevSlot);
      return { ok: false, error: 'Este jogo salvo está danificado.' };
    }
    if (e.conflict) handleConflict(Object.assign({ slot: target }, e.conflict));
    else if (e.cloudChecked === false) scheduleCloudCheck('load');
    return { ok, where: e.where };
  }

  // ------------------------------------------------------------- modals (via M.ui)
  /** Resolves once M.ui can show a modal above the game (boot overlay gone). */
  function whenUiReady() {
    return new Promise((resolve) => {
      const tick = () => {
        const uiOk = M.ui && (M.ui.ready === undefined ? started : M.ui.ready);
        if (uiOk && !bootCovering()) { resolve(); return; }
        setTimeout(tick, 100);
      };
      tick();
    });
  }
  function toastUi(text, kind, opts) {
    try { if (M.ui && typeof M.ui.toast === 'function') M.ui.toast(text, kind || 'info', opts || {}); } catch (e) { /* ignore */ }
  }
  /**
   * Modal choice through M.ui.choice (CONTRACT_V2 §6); re-asked if something else closes it, so it never
   * goes away without an answer. Falls back to a sticky toast with buttons on an older UI.
   */
  async function ask(o) {
    await whenUiReady();
    if (M.ui && typeof M.ui.choice === 'function') {
      for (let i = 0; i < 1000; i++) {
        let v;
        try { v = await M.ui.choice(Object.assign({ dismissable: false, cancelValue: DISMISSED }, o)); } catch (e) { v = DISMISSED; }
        if (v !== DISMISSED && v !== undefined) return v;
        await sleep(300);
      }
      return o.buttons[o.buttons.length - 1].value;
    }
    return new Promise((resolve) => {
      const text = (o.title ? o.title + ' — ' : '') + (o.text || '');
      if (M.ui && typeof M.ui.toast === 'function') {
        M.ui.toast(text, 'info', { sticky: true, timeout: 0, actions: o.buttons.map((b) => ({ label: b.label, primary: !!b.primary, fn: () => resolve(b.value) })) });
      } else if (M.ui && typeof M.ui.offer === 'function') {
        M.ui.offer(text, o.buttons[0].label, () => resolve(o.buttons[0].value));
      }
      // no UI at all: stay unresolved — the conflict / block stays in place, so nothing is overwritten
    });
  }
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = String(v);
      else if (k === 'class') n.className = v;
      else if (k === 'on') { for (const ev in v) n.addEventListener(ev, v[ev]); }
      else if (k === 'value') n.value = v;
      else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of [].concat(kids || [])) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return n;
  }
  function saveCard(icon, title, meta, savedAtText, id) {
    const m = cleanMeta(meta);
    return el('div', { class: 'slot', id }, [
      el('div', {}, [
        el('div', { class: 'sl-name', text: icon + ' ' + title }),
        el('div', { class: 'sl-meta', text: m.householdName + ' · Dia ' + m.day + ' · ' + fmtMoney(m.money) + (m.members ? ' · ' + m.members + (m.members === 1 ? ' morador' : ' moradores') : '') }),
        el('div', { class: 'sl-meta', text: savedAtText }),
      ]),
    ]);
  }

  // ---- newer cloud save (conflict)
  function handleConflict(info) {
    if (!info || !info.slot) return;
    const key = info.slot + ':' + info.savedAt;
    if (shownConflicts[key]) return;
    shownConflicts[key] = true;
    conflictQueue.push(info);
    pumpConflicts();
  }
  async function pumpConflicts() {
    if (conflictBusy) return;
    conflictBusy = true;
    try {
      while (conflictQueue.length) {
        const info = conflictQueue.shift();
        if (hasSave('conflictOf') && !M.save.conflictOf(info.slot)) continue;   // resolved meanwhile
        if (info.slot !== slot) continue;   // the player moved to another slot: nothing writes there now
        try { await askCloudChoice(info); } catch (e) { try { console.error('[Morada] conflito', e); } catch (x) { /* ignore */ } }
      }
    } finally {
      conflictBusy = false;
    }
  }
  async function askCloudChoice(info) {
    await whenUiReady();
    setPaused('save', true);
    try {
      const cm = cleanMeta(info.meta, info.state);
      const when = fmtWhen(info.savedAt);
      const hereMeta = metaOfState(state);
      const hereWhen = lastSavedAt ? 'Salvo neste aparelho ' + fmtWhen(lastSavedAt) : 'Aberto agora neste aparelho';
      const where = slotLabel(info.slot);
      if (info.unreadable || !info.state) {
        const v = await ask({
          title: 'Jogo da nuvem que não abre aqui',
          text: 'O ' + where + ' na nuvem tem um jogo salvo ' + (when || '') + ' que esta versão do Morada não consegue abrir' +
            (info.unreadable === 'newer' ? ' (ele foi salvo por uma versão mais nova).' : '.') +
            ' Recarregue a página para atualizar o jogo, ou mantenha o jogo deste aparelho: o da nuvem fica guardado como cópia de segurança.',
          body: [el('div', { class: 'slot-list' }, [
            saveCard('☁️', 'Nuvem', info.meta, when ? 'Salvo ' + when : '', 'conflict-cloud'),
            saveCard('💻', 'Este jogo', hereMeta, hereWhen, 'conflict-here')])],
          buttons: [{ label: 'Recarregar a página', value: 'reload', primary: true }, { label: 'Manter este jogo', value: 'keep' }],
        });
        if (v === 'reload') { try { location.reload(); } catch (e) { /* ignore */ } return; }
        if (hasSave('resolveConflict')) M.save.resolveConflict(info.slot, 'keep');
        dirty = true; saveNow();
        toastUi('Este jogo foi mantido. O jogo da nuvem ficou guardado como cópia de segurança.', 'info', { icon: '💾' });
        return;
      }
      const v = await ask({
        title: 'Há um jogo mais recente na nuvem',
        text: 'Outro aparelho (ou outra aba) salvou o ' + where + ' na nuvem depois do jogo que está aberto aqui. Qual você quer continuar? ' +
          'O outro jogo não se perde: ele fica guardado como cópia de segurança.',
        body: [el('div', { class: 'slot-list' }, [
          saveCard('☁️', 'Jogo da nuvem', cm, when ? 'Salvo ' + when : '', 'conflict-cloud'),
          saveCard('💻', 'Este jogo', hereMeta, hereWhen, 'conflict-here')])],
        buttons: [
          { label: 'Continuar o jogo da nuvem (' + shortDesc(cm, info.savedAt) + ')', value: 'cloud', primary: true },
          { label: 'Manter este jogo', value: 'keep' },
        ],
      });
      if (v === 'cloud') {
        if (hasSave('resolveConflict')) M.save.resolveConflict(info.slot, 'cloud');
        if (info.slot !== slot) setSlot(info.slot);
        const ok = loadState(info.state, { kind: 'load', where: 'cloud', slot: info.slot });
        if (ok) {
          // the local mirror now follows the cloud game (this device's game rolls into the backup)
          dirty = true; saveNow();
          toastUi('Jogo da nuvem carregado. O jogo que estava aberto ficou guardado como cópia de segurança.', 'good', { icon: '☁️' });
        } else {
          toastUi('Não foi possível abrir o jogo da nuvem. Este jogo continua aberto.', 'bad');
          dirty = true; saveNow();
        }
      } else {
        if (hasSave('resolveConflict')) M.save.resolveConflict(info.slot, 'keep');
        dirty = true; saveNow();
        toastUi('Este jogo foi mantido. O jogo da nuvem ficou guardado como cópia de segurança.', 'info', { icon: '💾' });
      }
    } finally {
      setPaused('save', false);
    }
  }

  // ---- late cloud check
  /** Keeps trying to read the active slot's cloud doc until it answers (or no cloud exists in this visit). */
  function scheduleCloudCheck(why) {
    if (!hasSave('checkCloud')) return;
    const token = ++cloudCheck.token;
    cloudCheck.running = true;
    cloudCheck.why = why || '';
    (async () => {
      let delay = 0;
      for (let attempt = 0; attempt < 500; attempt++) {
        if (delay) await sleep(delay);
        if (token !== cloudCheck.token) return;
        const target = slot;
        cloudCheck.slot = target;
        if (blockedSlot(target)) { delay = 3000; continue; }      // recovery first
        let r = null;
        try { r = await M.save.checkCloud(target, { timeout: 20000 }); } catch (e) { r = null; }
        if (token !== cloudCheck.token) return;
        cloudCheck.lastResult = r;
        if (r && r.checked) {
          cloudCheck.running = false;
          if (r.conflict) handleConflict(Object.assign({ slot: target }, r.conflict));
          return;
        }
        if (r && r.pending === false) { cloudCheck.running = false; return; }
        delay = Math.min(60000, delay ? delay * 2 : 2000);
      }
      cloudCheck.running = false;
    })();
  }

  // ---- unreadable save (recovery)
  function reasonText(info) {
    if (info.reason === 'newer') return 'foi salvo por uma versão mais nova do Morada, que este navegador ainda não tem. Recarregar a página costuma resolver.';
    if (info.reason === 'engine') return 'tem dados que o jogo não conseguiu carregar.';
    return 'está danificado e não pôde ser lido.';
  }
  async function showRaw(slotName, info) {
    const raw = info.raw || (hasSave('rawText') ? M.save.rawText(slotName, info.where) : '') || '';
    const ta = el('textarea', { class: 'code', id: 'recovery-raw', readonly: true, spellcheck: 'false', 'aria-label': 'Dados do jogo salvo' });
    ta.value = raw;
    const status = el('div', { class: 'form-error', 'aria-live': 'polite' });
    const copy = el('button', { class: 'btn small primary', type: 'button', id: 'recovery-copy', text: 'Copiar' });
    copy.addEventListener('click', () => {
      const done = (ok) => { status.style.color = ok ? 'var(--good)' : ''; status.textContent = ok ? 'Copiado!' : 'Texto selecionado: use Ctrl+C (ou Copiar no celular).'; };
      const fallback = () => { let ok = false; try { ta.focus(); ta.select(); ok = !!(document.execCommand && document.execCommand('copy')); } catch (e) { ok = false; } done(ok); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(raw).then(() => done(true), fallback);
        else fallback();
      } catch (e) { fallback(); }
    });
    const kids = [copy];
    if (hasSave('downloadText')) {
      const dl = el('button', { class: 'btn small', type: 'button', id: 'recovery-download', text: 'Baixar arquivo' });
      dl.addEventListener('click', () => {
        M.save.downloadText(raw, 'morada-' + slotName + '-original.json').then((r) => {
          status.style.color = r && r.ok ? 'var(--good)' : '';
          status.textContent = r && r.ok ? 'Arquivo entregue para download.' : 'Não foi possível baixar: copie o texto.';
        }, () => { status.textContent = 'Não foi possível baixar: copie o texto.'; });
      });
      kids.push(dl);
    }
    setTimeout(() => { try { ta.focus(); ta.select(); } catch (e) { /* ignore */ } }, 60);
    await ask({
      title: 'Dados do jogo salvo',
      text: raw ? 'Guarde este texto num arquivo (por exemplo morada-save.json). Uma versão mais nova do jogo pode conseguir abri-lo depois, em Opções › Importar.' : 'Não há dados para mostrar.',
      body: [ta, el('div', { class: 'opt-grid', style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px' }, kids), status],
      buttons: [{ label: 'Voltar', value: 'back', primary: true }],
      dismissable: true, cancelValue: 'back',
      wide: true,
    });
  }
  /**
   * The stored game of `slotName` cannot be read. Nothing is written to that slot until the player chooses:
   * try a backup, copy the raw data, start a new game (boot) or go back to the current game (load).
   */
  async function recover(slotName, info, ctx) {
    ctx = ctx || {};
    info = info || {};
    const boot = ctx.context !== 'load';
    if (boot) saveBlock = { slot: slotName, reason: info.reason || 'corrupt' };
    setPaused('recovery', true);
    try {
      let backup = ctx.backup || null;
      if (!backup && hasSave('backupEntry')) {
        // never offer the very save that failed to open as its own backup
        const exclude = info.reason === 'engine' && info.savedAt > 0 ? info.savedAt : null;
        backup = await withTimeout(M.save.backupEntry(slotName, { exclude }), 7000, null);
      }
      const meta = info.meta ? cleanMeta(info.meta) : null;
      const label = slotLabel(slotName);
      const desc = meta ? ' (' + shortDesc(meta, info.savedAt) + ')' : (info.savedAt > 0 ? ' (salvo ' + fmtWhen(info.savedAt) + ')' : '');
      for (let i = 0; i < 200; i++) {
        const buttons = [];
        if (backup) buttons.push({ label: 'Tentar a cópia de segurança (' + shortDesc(backup.meta, backup.savedAt) + ')', value: 'backup', primary: true });
        if (info.reason === 'newer') buttons.push({ label: 'Recarregar a página', value: 'reload', primary: !backup });
        buttons.push({ label: 'Mostrar os dados para copiar', value: 'raw' });
        if (boot) buttons.push({ label: 'Começar um jogo novo', value: 'new' });
        else buttons.push({ label: 'Voltar ao jogo atual', value: 'cancel' });
        const v = await ask({
          title: 'Não foi possível abrir o jogo salvo',
          text: 'O jogo do ' + label + desc + ' ' + reasonText(info) + '\nNada foi apagado: o arquivo original fica guardado' +
            (boot ? ' e este espaço não será salvo até você escolher.' : '.'),
          buttons,
        });
        if (v === 'raw') { await showRaw(slotName, info); continue; }
        if (v === 'reload') { try { location.reload(); } catch (e) { /* ignore */ } return; }
        if (v === 'cancel') return;
        if (v === 'backup' && backup) {
          if (hasSave('quarantine')) await M.save.quarantine(slotName, info);
          if (blockedSlot(slotName)) saveBlock = null;
          const prevSlot = slot;
          if (slotName !== slot) setSlot(slotName);
          const ok = loadState(backup.state, { kind: 'load', where: backup.where, slot: slotName });
          if (ok) {
            dirty = true; saveNow();
            toastUi('Cópia de segurança carregada. O jogo que não abriu ficou guardado à parte.', 'good', { icon: '💾' });
            if (hasSave('checkCloud')) scheduleCloudCheck('recovery');
            return;
          }
          if (prevSlot !== slotName) setSlot(prevSlot);
          if (hasSave('block') && boot) M.save.block(slotName, 'engine', info.where);
          if (boot) saveBlock = { slot: slotName, reason: info.reason || 'corrupt' };
          backup = null;
          continue;
        }
        if (v === 'new') {
          if (hasSave('quarantine')) await M.save.quarantine(slotName, info);
          if (blockedSlot(slotName)) saveBlock = null;
          dirty = true; saveNow();
          toastUi('Jogo novo começado. O jogo que não abriu ficou guardado à parte.', 'info', { icon: '🏠' });
          if (hasSave('checkCloud')) scheduleCloudCheck('recovery');
          return;
        }
      }
    } finally {
      setPaused('recovery', false);
    }
  }

  // ------------------------------------------------------------------- boot
  async function pickInitialState(data, fresh) {
    if (!fresh && data && typeof data.json === 'string' && M.save) {
      const st = M.save.importJSON(data.json);
      if (st) {
        if (data.lineage && hasSave('adopt')) { try { M.save.adopt(slot, data.lineage); } catch (e) { /* ignore */ } }
        return { state: st, where: 'hot', cloudChecked: false };
      }
    }
    if (!fresh && M.save) {
      const entry = await withTimeout(M.save.loadEntry(slot, { timeout: CLOUD_BOOT_WAIT }), CLOUD_BOOT_WAIT + 2500, null);
      if (entry && entry.state) {
        return { state: entry.state, where: entry.where, savedAt: entry.savedAt, meta: entry.meta, cloudChecked: entry.cloudChecked === true, conflict: entry.conflict || null };
      }
      if (entry && entry.unreadable) {
        return { state: null, where: 'unreadable', unreadable: entry.unreadable, backup: entry.backup || null, cloudChecked: entry.cloudChecked === true };
      }
      if (!entry) {   // loadEntry itself did not answer: local mirror only
        const local = M.save.localEntry ? M.save.localEntry(slot) : null;
        if (local && local.state) return { state: local.state, where: 'local', savedAt: local.savedAt, meta: local.meta, cloudChecked: false };
      }
      return { state: null, where: 'new', cloudChecked: !!(entry && entry.cloudChecked === true) };
    }
    return { state: null, where: 'new', cloudChecked: false };
  }

  async function restart(opts) {
    opts = opts || {};
    try {
      setLoading(opts.fresh ? 'Preparando uma casa nova…' : 'Carregando a vizinhança…');
      const miss = missingModules();
      if (miss.length) throw new Error('Módulos faltando: ' + miss.join(', '));
      container = $('view');
      if (!container) throw new Error('Elemento #view não encontrado');
      try { M.save.init().catch(() => {}); } catch (e) { /* non-blocking */ }
      if (!started && !opts.fresh) slot = initialSlot(opts.data || {});
      bindBus();

      const pick = await pickInitialState(opts.data || {}, !!opts.fresh);
      let st = pick.state;
      if (st) {
        // keep the original text: if the engine cannot open this save, the player can still copy it
        let rawCopy = '';
        try { rawCopy = JSON.stringify(st); } catch (e) { rawCopy = ''; }
        try { M.engine.init(st); st = M.engine.state || st; }
        catch (e) {
          try { console.warn('[Morada] o jogo salvo não pôde ser aberto', e); } catch (x) { /* ignore */ }
          if (pick.where === 'hot') { pick.where = 'new'; }
          else {
            const stored = hasSave('rawText') ? M.save.rawText(slot, pick.where) : '';
            pick.unreadable = { where: pick.where, reason: 'engine', savedAt: pick.savedAt || 0, meta: pick.meta || null, raw: stored || rawCopy };
            if (hasSave('block')) M.save.block(slot, 'engine', pick.where);
            pick.where = 'unreadable';
          }
          st = null;
        }
      }
      if (!st) {
        st = M.engine.newGame();
        if (pick.where !== 'unreadable') pick.where = 'new';
      }
      if (pick.unreadable) saveBlock = { slot, reason: pick.unreadable.reason || 'corrupt' };
      state = st;
      setLoading('Montando a casa…');
      attachRender(state);
      applySettings(state);
      if (!started) {
        M.ui.init();
        started = true;
      } else if (M.ui.reset) M.ui.reset({ kind: pick.where === 'cloud' || pick.where === 'local' ? 'load' : 'new', where: pick.where });
      lastRunSpeed = getSpeed() || 1;
      dirty = pick.where === 'new' || pick.where === 'hot';
      if (hasSave('setActiveSlot')) { try { M.save.setActiveSlot(slot); } catch (e) { /* ignore */ } }
      startLoop();
      startAutosave();
      requestAnimationFrame(() => requestAnimationFrame(hideLoading));
      if (pick.where === 'cloud' || pick.where === 'local') {
        emit('loaded', { where: pick.where, savedAt: pick.savedAt, slot, slotLabel: slotLabel(slot) });
      }
      emit('slot', { slot, label: slotLabel(slot) });
      if (pick.unreadable) recover(slot, pick.unreadable, { context: 'boot', backup: pick.backup || null });
      else if (pick.conflict) handleConflict(Object.assign({ slot }, pick.conflict));
      if (!pick.cloudChecked && !pick.unreadable) scheduleCloudCheck('boot');
    } catch (e) {
      fatal(e, 'boot');
    }
  }

  function start(data) {
    if (started || start._called) return;
    start._called = true;
    restart({ data: data || {} });
  }

  function boot() {
    let hot = null;
    try { hot = window.claude && window.claude.hot; } catch (e) { hot = null; }
    if (hot && typeof hot.snapshot === 'function') {
      try {
        hot.snapshot(() => ({
          json: state && !blockedSlot(slot) ? JSON.stringify(state) : null,
          slot,
          lineage: hasSave('lineage') ? M.save.lineage(slot) : null,
        }));
      } catch (e) { /* ignore */ }
    }
    if (hot && typeof hot.ready === 'function') {
      try { hot.ready(start); } catch (e) { start((hot && hot.data) || {}); }
      // safety net: if the host never calls back, boot anyway
      setTimeout(() => { if (!start._called) start((hot && hot.data) || {}); }, 2500);
    } else {
      start((hot && hot.data) || {});
    }
  }

  window.addEventListener('error', (ev) => {
    if (!started && !start._called) return;
    if (!state && ev && ev.error) fatal(ev.error, 'script');
  });

  M.main = {
    start, boot, restart,
    get state() { return state; },
    get container() { return container; },
    get slot() { return slot; },
    setSlot, slotLabel,
    // speed & pause
    getSpeed, setSpeed, togglePause, setPaused, isPaused, pauseReasons, pauseLabel, speedFactor,
    PAUSE_REASONS,
    isUltraBoost() { return getSpeed() === 3 && pauses.size === 0 && ultraBoost(); },
    // saves & games
    saveNow, autosave, loadSlot, loadState, newGame, markDirty() { dirty = true; },
    setAutosaveInterval,
    get autosaveInterval() { return autosaveEvery; },
    get dirty() { return dirty; },
    get lastSavedAt() { return lastSavedAt; },
    get saveBlocked() { return saveBlock ? Object.assign({}, saveBlock) : null; },
    status() {
      return {
        slot, slotLabel: slotLabel(slot), dirty, lastSavedAt, saveBlock: saveBlock ? Object.assign({}, saveBlock) : null,
        cloudCheck: { running: cloudCheck.running, slot: cloudCheck.slot, why: cloudCheck.why || '', checked: !!(cloudCheck.lastResult && cloudCheck.lastResult.checked) },
        conflictOpen: conflictBusy, paused: isPaused(), reasons: pauseReasons(),
      };
    },
    stats() { return Object.assign({}, stats); },
    fatal,
    SPEED_FACTORS,
  };

  window.__morada = { M, get state() { return state; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.M = window.M || {});
