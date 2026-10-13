(function (M) {
  'use strict';

  // ===========================================================================
  // M.main — bootstrap + game loop.
  //
  // Boot: loading screen (already in the HTML) → M.save.init() in the background →
  // state from the live-update snapshot, else the newest save (cloud if it answers
  // within ~1.5 s, otherwise the local mirror), else M.engine.newGame() →
  // M.engine.init → M.render.init(#view) → M.ui.init → requestAnimationFrame loop.
  //
  // Loop: real dt (clamped to 0.1 s) × speed factor = sim minutes, stepped through
  // M.engine.update in substeps of at most 0.5 sim-minutes. Time stands still while
  // any pause reason is active (UI modes 'buy'/'build'/'options', modal dialogs...):
  //   M.main.setPaused('buy', true) ... M.main.setPaused('buy', false)
  // ===========================================================================

  const SPEED_FACTORS = [0, 1, 3, 10];     // sim minutes per real second
  const ULTRA_ASLEEP = 30;                 // ultra speed while everyone sleeps / is away
  const MAX_STEP = 0.5;                    // sim minutes per engine substep
  const MAX_DT = 0.1;                      // real seconds per frame (clamp)
  const CLOUD_BOOT_WAIT = 1500;            // ms to wait for the cloud save at boot

  let state = null;
  let container = null;
  let started = false;
  let running = false;
  let rafId = 0;
  let lastTs = 0;
  let frameErrors = 0;
  let slot = 'slot1';
  let dirty = false;
  let saving = null;           // in-flight save promise
  let lastSavedAt = 0;
  let renderReady = false;
  const pauses = new Set();
  let busBound = false;
  let lastRunSpeed = 1;

  // ---------------------------------------------------------------- helpers
  function $(id) { return document.getElementById(id); }
  function num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }
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

  // ------------------------------------------------------------- overlays
  function setLoading(text) {
    const el = $('boot');
    if (!el) return;
    el.hidden = false;
    const t = $('boot-text');
    if (t && text) t.textContent = text;
  }
  function hideLoading() {
    const el = $('boot');
    if (!el || el.hidden) return;
    el.classList.add('is-done');
    setTimeout(() => { el.hidden = true; }, 450);
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
      btnSave.hidden = !state;
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
  function setSpeed(n) {
    n = Math.max(0, Math.min(3, Math.round(num(n, 1))));
    if (!state) return;
    if (M.engine && typeof M.engine.setSpeed === 'function') M.engine.setSpeed(n); else state.speed = n;
    if (n > 0) lastRunSpeed = n;
    emit('speed', { speed: n, factor: speedFactor() });
  }
  function togglePause() {
    const s = getSpeed();
    if (s > 0) { lastRunSpeed = s; setSpeed(0); } else setSpeed(lastRunSpeed || 1);
  }
  function setPaused(reason, on) {
    reason = String(reason || 'ui');
    const before = pauses.size > 0;
    if (on) pauses.add(reason); else pauses.delete(reason);
    if (before !== (pauses.size > 0)) emit('speed', { speed: getSpeed(), factor: speedFactor() });
  }
  function isPaused() { return pauses.size > 0 || getSpeed() === 0; }
  function pauseReasons() { return Array.from(pauses); }
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
  function frame(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    let dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (!(dt > 0)) dt = 0;
    if (dt > MAX_DT) dt = MAX_DT;
    try {
      const f = speedFactor();
      if (f > 0 && dt > 0) {
        let simMin = dt * f;
        let guard = 0;
        while (simMin > 1e-9 && guard++ < 200) {
          const step = Math.min(MAX_STEP, simMin);
          M.engine.update(step);
          simMin -= step;
        }
        dirty = true;
      }
      if (renderReady) M.render.frame(dt);
      if (M.ui && typeof M.ui.update === 'function') M.ui.update(dt);
      frameErrors = 0;
    } catch (e) {
      frameErrors++;
      if (frameErrors === 1 || frameErrors % 30 === 0) { try { console.error('[Morada] frame', (e && e.stack) || e); } catch (x) { /* ignore */ } }
      if (frameErrors > 90) fatal(e, 'loop');
    }
  }
  function startLoop() {
    if (running) return;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && dirty) autosave('hidden');
      if (document.visibilityState === 'visible') lastTs = 0;
    });
    window.addEventListener('pagehide', () => { if (dirty) autosave('hidden'); });
  }

  // ------------------------------------------------------------------ saving
  function saveNow(slotArg) {
    if (!state || !M.save) return Promise.resolve({ ok: false, where: 'none', error: 'Sem jogo.' });
    const target = slotArg || slot;
    if (slotArg) slot = slotArg;
    const wasDirty = dirty;
    dirty = false;
    const p = M.save.save(state, target).then((r) => {
      if (r && r.ok) { lastSavedAt = Date.now(); emit('saved', Object.assign({ slot: target }, r)); }
      else { dirty = dirty || wasDirty; emit('saved', Object.assign({ slot: target }, r || { ok: false, where: 'none' })); }
      return r;
    }).catch((e) => {
      dirty = true;
      const r = { ok: false, where: 'none', error: String(e && e.message || e) };
      emit('saved', Object.assign({ slot: target }, r));
      return r;
    });
    saving = p;
    p.then(() => { if (saving === p) saving = null; });
    return p;
  }
  function autosave(why) {
    if (!state || !dirty) return;
    if (saving) { saving.then(() => { if (dirty) saveNow(); }); return; }
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
    const e = await M.save.loadEntry(slotName);
    if (!e || !e.state) return { ok: false, error: 'Nenhum jogo salvo neste espaço.' };
    slot = slotName || slot;
    const ok = loadState(e.state, { kind: 'load', where: e.where, slot });
    return { ok, where: e.where };
  }

  // ------------------------------------------------------------------- boot
  async function pickInitialState(data, fresh) {
    if (!fresh && data && typeof data.json === 'string' && M.save) {
      const st = M.save.importJSON(data.json);
      if (st) return { state: st, where: 'hot' };
    }
    if (!fresh && M.save) {
      const entry = await withTimeout(M.save.loadEntry(slot), CLOUD_BOOT_WAIT, undefined);
      if (entry && entry.state) return { state: entry.state, where: entry.where, savedAt: entry.savedAt };
      const local = M.save.localEntry ? M.save.localEntry(slot) : null;
      if (local && local.state) {
        if (entry === undefined) offerNewerCloud(local.savedAt);
        return { state: local.state, where: 'local', savedAt: local.savedAt };
      }
    }
    return { state: null, where: 'new' };
  }
  // When the cloud was too slow at boot, check later whether it holds a newer save.
  function offerNewerCloud(localSavedAt) {
    if (!M.save) return;
    M.save.loadEntry(slot).then((e) => {
      if (!e || e.where !== 'cloud' || !(e.savedAt > (localSavedAt || 0) + 1000)) return;
      if (M.ui && typeof M.ui.offer === 'function') {
        M.ui.offer('Há um jogo salvo mais recente na nuvem (Dia ' + ((e.meta && e.meta.day) || '?') + ').', 'Carregar', () => {
          loadState(e.state, { kind: 'load', where: 'cloud', slot });
        });
      }
    }).catch(() => { /* ignore */ });
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

      const pick = await pickInitialState(opts.data || {}, !!opts.fresh);
      let st = pick.state;
      if (st) {
        try { M.engine.init(st); st = M.engine.state || st; }
        catch (e) { console.error('[Morada] save inválido, começando um jogo novo', e); st = null; }
      }
      if (!st) { st = M.engine.newGame(); pick.where = 'new'; }
      state = st;
      bindBus();
      setLoading('Montando a casa…');
      attachRender(state);
      applySettings(state);
      if (!started) {
        M.ui.init();
        started = true;
      } else if (M.ui.reset) M.ui.reset({ kind: pick.where === 'new' ? 'new' : 'load', where: pick.where });
      lastRunSpeed = getSpeed() || 1;
      dirty = pick.where === 'new' || pick.where === 'hot';
      startLoop();
      requestAnimationFrame(() => requestAnimationFrame(hideLoading));
      if (pick.where === 'cloud' || pick.where === 'local') {
        emit('loaded', { where: pick.where, savedAt: pick.savedAt });
      }
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
      try { hot.snapshot(() => ({ json: state ? JSON.stringify(state) : null })); } catch (e) { /* ignore */ }
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
    setSlot(s) { if (s) slot = String(s); },
    // speed & pause
    getSpeed, setSpeed, togglePause, setPaused, isPaused, pauseReasons, speedFactor,
    isUltraBoost() { return getSpeed() === 3 && pauses.size === 0 && ultraBoost(); },
    // saves & games
    saveNow, autosave, loadSlot, loadState, newGame, markDirty() { dirty = true; },
    get dirty() { return dirty; },
    get lastSavedAt() { return lastSavedAt; },
    fatal,
    SPEED_FACTORS,
  };

  window.__morada = { M, get state() { return state; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.M = window.M || {});
