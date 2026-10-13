(function (M) {
  'use strict';

  // ===========================================================================
  // M.ui — the whole DOM HUD and input handling.
  //
  //  Live (Viver): portraits, action queue, needs/skills/career/relationships/
  //    personality panel, pie menu on characters/objects, walk on floor clicks,
  //    speech/thought bubbles positioned every frame.
  //  Buy (Comprar): catalog drawer, placement ghost, rotate, move/sell.
  //  Build (Construir): wall / door / window / floor / wallpaper / demolish tools.
  //  Options (Opções): saves, export/import, new family, preferences.
  // Time is paused through M.main.setPaused(reason, bool) while Buy, Build or any
  // modal is open. DOM updates are throttled (~5 Hz bars/clock, 1 Hz heavy lists);
  // only bubbles, the hover label and keyboard panning run every frame.
  // ===========================================================================

  // ------------------------------------------------------------ accessors
  const S = () => (M.engine && M.engine.state) || (M.main && M.main.state) || null;
  const D = () => M.data || {};
  const E = () => M.engine || {};
  const W = () => M.world || {};

  function rcall(name) {
    const r = M.render;
    if (!r || typeof r[name] !== 'function') return null;
    const args = Array.prototype.slice.call(arguments, 1);
    try { return r[name].apply(r, args); } catch (e) { warnOnce('render.' + name, e); return null; }
  }
  function ecall(name) {
    const en = M.engine;
    if (!en || typeof en[name] !== 'function') return null;
    const args = Array.prototype.slice.call(arguments, 1);
    try { return en[name].apply(en, args); } catch (e) { warnOnce('engine.' + name, e); return null; }
  }
  function wcall(name) {
    const w = M.world;
    if (!w || typeof w[name] !== 'function') return null;
    const args = Array.prototype.slice.call(arguments, 1);
    try { return w[name].apply(w, args); } catch (e) { warnOnce('world.' + name, e); return null; }
  }
  function mcall(name) {
    const m = M.main;
    if (!m || typeof m[name] !== 'function') return null;
    const args = Array.prototype.slice.call(arguments, 1);
    try { return m[name].apply(m, args); } catch (e) { warnOnce('main.' + name, e); return null; }
  }
  const warned = {};
  function warnOnce(key, e) {
    if (warned[key]) return;
    warned[key] = true;
    try { console.warn('[ui] ' + key + ' falhou:', e); } catch (x) { /* ignore */ }
  }

  // ------------------------------------------------------------ helpers
  function num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtMoney(n) { return M.util && M.util.fmtMoney ? M.util.fmtMoney(n) : 'M$ ' + Math.round(n); }
  function fmtSigned(n) { n = Math.round(n); return (n >= 0 ? '+' : '−') + fmtMoney(Math.abs(n)); }
  function fmtTime(m) { return M.util && M.util.fmtTime ? M.util.fmtTime(m) : String(m); }
  function firstName(s) { return String((s && s.name) || '').split(' ')[0] || 'Morador'; }
  function absMinute() { const st = S(); return st ? num(st.time.day) * 1440 + num(st.time.minute) : 0; }
  function $(id) { return document.getElementById(id); }
  function isTyping(t) {
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }
  function isCoarse() {
    try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }
  /** 'Clique' → 'Toque' on touch screens (engine texts are written for the mouse). */
  function touchText(t) {
    t = String(t == null ? '' : t);
    if (!isCoarse()) return t;
    return t.replace(/\bClique\b/g, 'Toque').replace(/\bclique\b/g, 'toque').replace(/\bClicar\b/g, 'Tocar').replace(/\bclicar\b/g, 'tocar');
  }
  /** Why the engine refused the last queue/buy/build call (CONTRACT_V2 §3), '' when unknown. */
  function engineReason() {
    try { const r = M.engine && M.engine.lastReason; return typeof r === 'string' ? r : ''; } catch (e) { return ''; }
  }
  function refusal(fallback) {
    const r = engineReason() || fallback || '';
    if (r) toast(r, 'bad', { icon: '✋', timeout: 4500 });
    return r;
  }
  function rectOf(el) {
    if (!el || el.hidden || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  function overlaps(a, b, pad) {
    pad = pad || 0;
    return !!(a && b && a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad);
  }

  /** Tiny element builder: h('div', {class, id, text, on:{click}}, children) */
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'on') { for (const ev in v) el.addEventListener(ev, v[ev]); }
        else if (k === 'hidden') el.hidden = !!v;
        else if (k === 'disabled') el.disabled = !!v;
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    if (children != null) appendKids(el, children);
    return el;
  }
  function appendKids(el, kids) {
    if (!Array.isArray(kids)) kids = [kids];
    for (const c of kids) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) appendKids(el, c);
      else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
      else el.appendChild(c);
    }
  }
  function emo(ch, extra) { return h('span', { class: 'emoji' + (extra ? ' ' + extra : ''), 'aria-hidden': 'true', text: ch }); }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function svg(path, vb) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', vb || '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    s.appendChild(p);
    return s;
  }

  // ------------------------------------------------------------ prefs (per viewer, optional)
  const PREF_KEY = 'morada.prefs';
  let prefs = {};
  function loadPrefs() {
    try { prefs = JSON.parse(window.localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { prefs = {}; }
    if (typeof prefs !== 'object') prefs = {};
  }
  function savePrefs() { try { window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------ sound (WebAudio, after a gesture)
  const sound = { ctx: null };
  function audio() {
    if (prefs.sound === false) return null;
    if (!sound.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { sound.ctx = new AC(); } catch (e) { return null; }
    }
    if (sound.ctx.state === 'suspended') { try { sound.ctx.resume(); } catch (e) { /* ignore */ } }
    return sound.ctx;
  }
  function tone(ctx, freq, t0, dur, type, vol, freqEnd) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sfx(kind) {
    if (!sound.unlocked) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    try {
      switch (kind) {
        case 'click': tone(ctx, 720, t, 0.05, 'triangle', 0.05); break;
        case 'open': tone(ctx, 520, t, 0.07, 'sine', 0.06, 780); break;
        case 'place': tone(ctx, 440, t, 0.09, 'triangle', 0.08, 330); tone(ctx, 660, t + 0.06, 0.08, 'sine', 0.05); break;
        case 'coin': tone(ctx, 1200, t, 0.07, 'square', 0.03); tone(ctx, 1600, t + 0.07, 0.12, 'square', 0.03); break;
        case 'chime': tone(ctx, 880, t, 0.16, 'sine', 0.07); tone(ctx, 1320, t + 0.12, 0.22, 'sine', 0.06); break;
        case 'error': tone(ctx, 180, t, 0.16, 'square', 0.04, 120); break;
        case 'build': tone(ctx, 300, t, 0.06, 'square', 0.04); tone(ctx, 240, t + 0.07, 0.06, 'square', 0.04); break;
        default: tone(ctx, 600, t, 0.05, 'sine', 0.04);
      }
    } catch (e) { /* ignore */ }
  }
  function unlockAudio() {
    sound.unlocked = true;
    if (prefs.sound !== false) audio();
  }

  // ------------------------------------------------------------ portraits (2D canvas faces)
  function drawFace(canvas, person, opts) {
    opts = opts || {};
    const size = opts.size || 54;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const c = (person && person.colors) || {};
    const skin = c.skin || '#c98e66', hair = c.hair || '#3b2a1e', shirt = c.shirt || '#669bbc';
    const female = person && person.gender === 'f';
    const mood = opts.mood == null ? 30 : opts.mood;
    const s = px;
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); ctx.clip();
    const bg = ctx.createRadialGradient(s * 0.5, s * 0.35, s * 0.05, s * 0.5, s * 0.5, s * 0.7);
    bg.addColorStop(0, opts.bgA || '#2a5c6b'); bg.addColorStop(1, opts.bgB || '#0e2b37');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);
    const cx = s / 2, cy = s * 0.44, r = s * 0.22;
    // long hair behind
    if (female) {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.55, r * 1.22, r * 1.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    // shoulders
    ctx.fillStyle = shirt;
    ctx.beginPath(); ctx.ellipse(cx, s * 1.04, s * 0.4, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(cx, s * 0.76, s * 0.12, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    // neck
    ctx.fillStyle = skin;
    ctx.fillRect(cx - r * 0.38, cy + r * 0.6, r * 0.76, r * 0.9);
    // head
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // ears
    ctx.beginPath(); ctx.arc(cx - r * 0.98, cy + r * 0.08, r * 0.2, 0, Math.PI * 2); ctx.arc(cx + r * 0.98, cy + r * 0.08, r * 0.2, 0, Math.PI * 2); ctx.fill();
    // hair top
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.32, r * 1.06, r * 0.78, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (female) {
      ctx.beginPath(); ctx.ellipse(cx - r * 0.86, cy + r * 0.1, r * 0.26, r * 0.8, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + r * 0.86, cy + r * 0.1, r * 0.26, r * 0.8, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.55, r * 0.7, r * 0.3, -0.35, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(cx + r * 0.15, cy - r * 0.62, r * 0.85, r * 0.3, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    // eyes
    ctx.fillStyle = '#1d1a18';
    const ey = cy + r * 0.08;
    const eyeR = r * 0.1;
    if (opts.asleep) {
      ctx.strokeStyle = '#1d1a18'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx - r * 0.38, ey, eyeR * 1.1, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + r * 0.38, ey, eyeR * 1.1, 0.15, Math.PI - 0.15); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx - r * 0.38, ey, eyeR, 0, Math.PI * 2); ctx.arc(cx + r * 0.38, ey, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(cx - r * 0.35, ey - eyeR * 0.35, eyeR * 0.35, 0, Math.PI * 2); ctx.arc(cx + r * 0.41, ey - eyeR * 0.35, eyeR * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    // mouth by mood
    ctx.strokeStyle = '#5a2a22'; ctx.lineWidth = Math.max(1.2, r * 0.09); ctx.lineCap = 'round';
    const my = cy + r * 0.48;
    ctx.beginPath();
    if (mood > 25) ctx.arc(cx, my - r * 0.14, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
    else if (mood < -25) ctx.arc(cx, my + r * 0.24, r * 0.26, 1.2 * Math.PI, 1.8 * Math.PI);
    else { ctx.moveTo(cx - r * 0.2, my); ctx.lineTo(cx + r * 0.2, my); }
    ctx.stroke();
    if (mood > 25) {
      ctx.fillStyle = 'rgba(232, 110, 110, 0.28)';
      ctx.beginPath(); ctx.arc(cx - r * 0.6, cy + r * 0.38, r * 0.16, 0, Math.PI * 2); ctx.arc(cx + r * 0.6, cy + r * 0.38, r * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function moodBucket(m) { return m > 25 ? 1 : m < -25 ? -1 : 0; }

  // ------------------------------------------------------------ colors & labels
  function needColor(v) {
    const t = clamp((num(v) + 100) / 200, 0, 1);
    const hue = t < 0.5 ? 6 + 36 * (t / 0.5) : 42 + 76 * ((t - 0.5) / 0.5);
    const light = t < 0.5 ? 52 : 52 - (t - 0.5) * 8;
    return 'hsl(' + hue.toFixed(0) + ', 72%, ' + light.toFixed(0) + '%)';
  }
  function moodLabel(m) {
    if (m >= 60) return 'Radiante';
    if (m >= 20) return 'Bem-humorado';
    if (m > -20) return 'Tranquilo';
    if (m > -60) return 'Chateado';
    return 'Péssimo';
  }
  function moodOf(sim) { const m = ecall('mood', sim); return m == null ? 0 : num(m); }
  function moodColorOf(sim) { return ecall('moodColor', sim) || needColor(moodOf(sim)); }
  function dayRange(days) {
    const names = (M.util && M.util.WEEKDAYS) || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    if (!Array.isArray(days) || !days.length) return '—';
    const d = days.slice().sort((a, b) => a - b);
    if (d.length === 7) return 'Todos os dias';
    let consecutive = true;
    for (let i = 1; i < d.length; i++) if (d[i] !== d[i - 1] + 1) consecutive = false;
    if (consecutive && d.length > 2) return names[d[0]] + '–' + names[d[d.length - 1]];
    return d.map((i) => names[i]).join(', ');
  }
  function hourStr(h) { return (h < 10 ? '0' : '') + h + 'h'; }
  const KIND_ICON = { info: 'ℹ️', good: '😊', bad: '⚠️', career: '💼', money: '💰' };
  const TYPE_EMOJI = {
    chair_wood: '🪑', chair_dining: '🪑', armchair: '💺', sofa_cheap: '🛋️', sofa_lux: '🛋️', bed_single: '🛏️', bed_double: '🛏️',
    bed_lux: '🛏️', counter: '🧱', table_dining: '🍽️', table_small: '🍽️', end_table: '🪵', fridge_cheap: '🧊', fridge_lux: '🧊',
    stove: '🔥', dishwasher: '🫧', trash_can: '🗑️', toilet: '🚽', toilet_lux: '🚽', shower: '🚿', bathtub: '🛁', sink: '🚰',
    hot_tub: '♨️', tv_cheap: '📺', tv_lux: '📺', stereo: '📻', computer: '💻', phone: '☎️', arcade: '🕹️', lamp_floor: '💡',
    lamp_fancy: '💡', plant_small: '🪴', plant_big: '🌴', painting_cheap: '🖼️', painting_lux: '🖼️', mirror: '🪞', sculpture: '🗿',
    rug: '🟫', bookshelf: '📚', easel: '🎨', chess: '♟️', exercise: '🏋️', piano: '🎹', mailbox: '📮', meal: '🍲', dirty_plate: '🍽️',
    puddle: '💧', newspaper: '📰', carpool: '🚗',
  };

  // ------------------------------------------------------------ UI state
  const ui = {
    inited: false,
    mode: 'live',
    prevMode: 'live',
    tab: 'needs',
    els: {},
    t5: 0, t1: 0, tHover: 0,
    pie: null,
    buy: { cat: 'all', placing: null, sel: null, confirm: false, hoverType: null },
    build: { tool: 'wall', floor: 1, paper: 0, roomFloor: 1, wholeRoom: false, drag: null, hoverKey: null, sel: null, confirm: false },
    pointers: new Map(),
    gesture: null,
    keys: new Set(),
    mouse: { x: -1, y: -1, over: false, type: 'mouse' },
    narrow: false,
    toasts: [],
    logOpen: false,
    unread: 0,
    modals: [],
    money: { shown: null, target: 0 },
    bubbles: new Map(),
    trend: { simId: null, at: -1, vals: null, prev: null },
    sig: { portraits: '', queue: '', tab: '', rel: '', career: '', log: '', toolbar: '', checklist: '' },
    thumbs: {},
    lastSim: null,
    shift: false,
    undo: [],                 // Buy/Build snapshots (CONTRACT_V2 §2), cleared when leaving those modes
    flashUntil: 0,            // a confirmation tip stays up until then (BB-6)
    pendingToasts: [],        // toasts requested before init()
    reframe: null,            // camera shift applied while the drawer is open (VIS-10)
    selAway: null,            // id of a selected character that left the lot (switch offer)
    catQuery: '', catSort: 'price', catAfford: false,
  };

  // ======================================================================
  // HUD construction
  // ======================================================================
  function buildHud() {
    const hud = $('hud') || document.body.appendChild(h('div', { id: 'hud' }));
    clear(hud);
    const els = ui.els = { hud };

    // ---- camera cluster (top-left / right edge on phones)
    els.wallBtn = h('button', { class: 'wall-btn', type: 'button', title: 'Modo das paredes', on: { click: cycleWallMode } },
      [svg('M3 20h18v-2H3zm2-3h3V8H5zm5 0h4V4h-4zm6 0h3v-6h-3z'), h('span', { class: 'wb-label', text: 'Paredes' })]);
    els.cam = h('div', { id: 'cam', class: 'panel', role: 'toolbar', 'aria-label': 'Câmera' }, [
      h('button', { class: 'icon-btn', type: 'button', title: 'Girar para a esquerda (Q)', 'aria-label': 'Girar câmera para a esquerda', on: { click: () => { rcall('rotate', -1); sfx('click'); } } }, emo('⟲')),
      h('button', { class: 'icon-btn', type: 'button', title: 'Girar para a direita (E)', 'aria-label': 'Girar câmera para a direita', on: { click: () => { rcall('rotate', 1); sfx('click'); } } }, emo('⟳')),
      h('span', { class: 'sep' }),
      h('button', { class: 'icon-btn', type: 'button', title: 'Aproximar (+)', 'aria-label': 'Aproximar', on: { click: () => rcall('zoom', -240) } }, emo('＋')),
      h('button', { class: 'icon-btn', type: 'button', title: 'Afastar (−)', 'aria-label': 'Afastar', on: { click: () => rcall('zoom', 240) } }, emo('－')),
      h('span', { class: 'sep' }),
      els.wallBtn,
      h('span', { class: 'sep hide-phone' }),
      h('button', { class: 'icon-btn hide-phone', type: 'button', title: 'Ajuda e controles (H)', 'aria-label': 'Ajuda', on: { click: showHelp } }, emo('❔')),
    ]);
    hud.appendChild(els.cam);

    // ---- toasts + log
    els.toasts = h('div', { id: 'toasts', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    els.logCount = h('span', { class: 'count', hidden: true, text: '0' });
    els.logBtn = h('button', { id: 'log-btn', class: 'icon-btn panel', type: 'button', title: 'Notificações', 'aria-label': 'Abrir notificações', 'aria-expanded': 'false', on: { click: toggleLog } }, [emo('🔔'), els.logCount]);
    els.logList = h('ol', { class: 'log-list' });
    els.logPanel = h('section', { id: 'log-panel', class: 'panel', hidden: true, 'aria-label': 'Notificações' }, [
      h('div', { class: 'log-head' }, [h('h2', { text: 'Notificações' }), h('button', { class: 'btn small ghost', type: 'button', text: 'Fechar', on: { click: toggleLog } })]),
      els.logList,
    ]);
    hud.appendChild(els.logBtn);
    hud.appendChild(els.logPanel);
    hud.appendChild(els.toasts);

    // ---- live dock
    els.portraits = h('div', { class: 'portraits', role: 'group', 'aria-label': 'Moradores' });
    els.needsToggleLabel = h('span', { text: 'Humor' });
    els.needsToggleIco = emo('🙂');
    els.needsToggle = h('button', { id: 'needs-toggle', class: 'btn panel', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'needs-panel', on: { click: toggleNeedsDrawer } }, [els.needsToggleIco, els.needsToggleLabel, emo('▴')]);
    els.queue = h('div', { class: 'queue', role: 'group', 'aria-label': 'Fila de ações' });
    els.needsName = h('div', { class: 'needs-name', text: '' });
    els.needsSub = h('div', { class: 'needs-sub', text: '' });
    els.moodLabel = h('div', { class: 'mood-label', text: '' });
    els.moodMeter = h('div', { class: 'mood-meter', 'aria-hidden': 'true' });
    for (let i = 0; i < 11; i++) {
      els.moodMeter.appendChild(h('i', { class: i < 5 ? 'neg' : i === 5 ? 'mid' : 'pos' }));
    }
    els.tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Informações do morador' });
    const TABS = [['needs', '🍔', 'Necessidades'], ['skills', '🎓', 'Habilidades'], ['career', '💼', 'Carreira'], ['rel', '💞', 'Relações'], ['pers', '🧩', 'Personalidade']];
    els.tabBtns = {};
    for (const [key, ico, label] of TABS) {
      const b = h('button', { class: 'tab', type: 'button', role: 'tab', id: 'tab-' + key, 'aria-selected': 'false', 'aria-controls': 'tab-body', 'aria-label': label, title: label, on: { click: () => setTab(key) } }, [emo(ico), h('span', { class: 't-label', text: label })]);
      els.tabBtns[key] = b;
      els.tabs.appendChild(b);
    }
    els.tabBody = h('div', { class: 'tab-body', id: 'tab-body', role: 'tabpanel', tabindex: '-1' });
    els.needsPanel = h('section', { id: 'needs-panel', class: 'panel needs', 'aria-label': 'Painel do morador' }, [
      h('div', { class: 'needs-head' }, [
        h('div', { style: { minWidth: '0' } }, [els.needsName, els.needsSub]),
        h('div', { class: 'mood', title: 'Humor' }, [els.moodLabel, els.moodMeter]),
      ]),
      els.tabs, els.tabBody,
    ]);
    els.dock = h('div', { id: 'dock' }, [
      h('div', { class: 'dock-row' }, [els.portraits, els.needsToggle]),
      els.queue,
      els.needsPanel,
    ]);
    hud.appendChild(els.dock);

    // ---- drawer (buy / build)
    els.drawer = h('aside', { id: 'drawer', class: 'panel', hidden: true, 'aria-label': 'Catálogo' });
    hud.appendChild(els.drawer);

    // ---- floating toolbar
    els.toolbar = h('div', { id: 'toolbar', class: 'panel', hidden: true, role: 'toolbar' });
    hud.appendChild(els.toolbar);

    // ---- bottom bar
    els.modeBtns = {};
    const MODES = [['live', '🏡', 'Viver'], ['buy', '🛒', 'Comprar'], ['build', '🔨', 'Construir'], ['options', '⚙️', 'Opções']];
    const modes = h('nav', { class: 'modes', 'aria-label': 'Modos de jogo' });
    for (const [key, ico, label] of MODES) {
      const b = h('button', { class: 'mode-btn', type: 'button', id: 'mode-' + key, 'aria-pressed': key === 'live' ? 'true' : 'false', title: label, on: { click: () => { sfx('click'); setMode(key); } } }, [emo(ico), h('span', { class: 'm-label', text: label })]);
      els.modeBtns[key] = b;
      modes.appendChild(b);
    }
    els.handH = h('i', { class: 'hand h' });
    els.handM = h('i', { class: 'hand m' });
    els.clockFace = h('div', { class: 'clock-face', 'aria-hidden': 'true' }, [els.handH, els.handM]);
    els.clockTime = h('div', { class: 'clock-time', text: '08:00' });
    els.eta = h('div', { class: 'eta-chip', hidden: true, role: 'status', text: '' });
    els.dayLong = h('span', { class: 'long', text: '' });
    els.dayShort = h('span', { class: 'short', text: '' });
    els.clockDay = h('div', { class: 'clock-day' }, [els.dayLong, els.dayShort]);
    const speeds = h('div', { class: 'speeds', role: 'group', 'aria-label': 'Velocidade do tempo' });
    els.speedBtns = [];
    const SPEED_DEFS = [
      ['Pausar (P ou Espaço)', 'M7 5h4v14H7zm6 0h4v14h-4z', 'pause'],
      ['Velocidade normal (1)', 'M8 5v14l11-7z', ''],
      ['Rápido (2)', 'M4 5v14l8-7zm8 0v14l8-7z', ''],
      ['Ultra (3)', 'M2 5v14l6.5-7zm7 0v14l6.5-7zm7 0v14L22.5 12z', ''],
    ];
    SPEED_DEFS.forEach(([label, path, cls], i) => {
      const b = h('button', { class: 'speed-btn ' + cls, type: 'button', title: label, 'aria-label': label, 'aria-pressed': 'false', on: { click: () => { sfx('click'); if (i === 0) mcall('togglePause'); else mcall('setSpeed', i); refreshClock(); } } }, svg(path));
      els.speedBtns.push(b);
      speeds.appendChild(b);
    });
    els.speedNote = h('span', { class: 'speed-note', hidden: true, text: '' });
    speeds.appendChild(els.speedNote);
    els.money = h('div', { class: 'money', text: fmtMoney(0), title: 'Saldo da família' });
    els.family = h('div', { class: 'money-family', text: '' });
    els.saveChip = h('div', { class: 'save-chip', text: '' });
    els.moneybox = h('div', { class: 'moneybox' }, [els.family, els.money, els.saveChip]);
    els.bar = h('div', { id: 'bar', class: 'panel' }, [
      modes,
      h('div', { class: 'timebox' }, [h('div', { class: 'clock' }, [els.eta, els.clockFace, h('div', { class: 'clock-text' }, [els.clockTime, els.clockDay])]), speeds]),
      els.moneybox,
    ]);
    hud.appendChild(els.bar);
    watchBarHeight();

    // ---- move-in checklist (empty lot)
    els.checklist = h('section', { id: 'checklist', class: 'panel', hidden: true, 'aria-label': 'Lista da mudança' });
    hud.appendChild(els.checklist);

    // ---- layers
    els.bubbles = h('div', { id: 'bubbles', class: 'layer', 'aria-hidden': 'true' });
    hud.appendChild(els.bubbles);
    els.tip = h('div', { id: 'tip', hidden: true });
    hud.appendChild(els.tip);
    els.hoverLabel = h('div', { id: 'hover-label', hidden: true });
    hud.appendChild(els.hoverLabel);
    // bubbles sit under panels
    hud.insertBefore(els.bubbles, hud.firstChild);
    hud.insertBefore(els.hoverLabel, els.bubbles.nextSibling);
  }

  // VIS-4: panels are positioned from --bar-h, which must be the bar's real OUTER height (it grows with fonts,
  // the save chip and the phone grid). Measured continuously.
  function watchBarHeight() {
    const bar = ui.els.bar;
    if (!bar) return;
    const apply = () => {
      const r = bar.getBoundingClientRect();
      if (!(r.height > 0)) return;
      const v = Math.ceil(r.height) + 'px';
      if (document.documentElement.style.getPropertyValue('--bar-h') !== v) document.documentElement.style.setProperty('--bar-h', v);
    };
    apply();
    if (ui._barRO) { try { ui._barRO.disconnect(); } catch (e) { /* ignore */ } }
    if (typeof ResizeObserver === 'function') {
      try { ui._barRO = new ResizeObserver(apply); ui._barRO.observe(bar); } catch (e) { /* ignore */ }
    }
    ui._barApply = apply;
  }

  // ======================================================================
  // Modes
  // ======================================================================
  function setMode(mode) {
    if (['live', 'buy', 'build', 'options'].indexOf(mode) < 0) mode = 'live';
    if (mode === 'options') { openOptions(); return; }
    if (mode === ui.mode) { applyModeDom(); return; }
    leaveMode(ui.mode);
    ui.prevMode = ui.mode;
    ui.mode = mode;
    mcall('setPaused', 'buy', mode === 'buy');
    mcall('setPaused', 'build', mode === 'build');
    if (mode === 'buy') buildBuyDrawer();
    if (mode === 'build') buildBuildDrawer();
    applyModeDom();
    refreshAll();
  }
  function leaveMode(mode) {
    closePie();
    hideTip(true);
    if (mode === 'buy') {
      stopPlacing();
      deselectObject();
    }
    if (mode === 'build') {
      cancelBuildDrag();
      rcall('hideEdgeGhost'); rcall('hideTileGhost');
      ui.build.sel = null; ui.build.confirm = false;
    }
    if (mode === 'buy' || mode === 'build') ui.undo = [];     // the undo stack lives for one Buy/Build session
    rcall('hideGhost'); rcall('hideEdgeGhost'); rcall('hideTileGhost');
    updateWallOverride();
    renderToolbar();
  }
  function applyModeDom() {
    const els = ui.els;
    if (!els || !els.modeBtns) return;
    const optionsOpen = ui.modals.some((m) => m.kind === 'options');
    for (const k in els.modeBtns) {
      const on = optionsOpen ? k === 'options' : k === ui.mode;
      els.modeBtns[k].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    els.dock.hidden = ui.mode !== 'live';
    const drawer = ui.mode === 'buy' || ui.mode === 'build';
    els.drawer.hidden = !drawer;
    els.hud.classList.toggle('drawer-open', drawer);
    els.hud.classList.toggle('drawer-collapsed', drawer && els.drawer.classList.contains('collapsed'));
    els.hud.dataset.mode = ui.mode;
    const view = $('view');
    if (view) view.style.cursor = ui.mode === 'build' ? 'crosshair' : '';
    renderToolbar();
    refreshChecklist();
    reframeForDrawer();
  }

  // VIS-10: while the catalog drawer is open the camera shifts so the lot sits in the free area beside
  // (desktop/tablet) or above (phone) the drawer; the shift is undone when the drawer closes.
  function reframeForDrawer() {
    const dr = ui.els.drawer;
    const open = !!dr && (ui.mode === 'buy' || ui.mode === 'build') && !dr.hidden;
    if (!open) {
      if (ui.reframe) {
        const rf = ui.reframe;
        ui.reframe = null;
        const cam = rcall('getCamera');
        const untouched = !cam || !rf.cam || (Math.abs(num(cam.x) - num(rf.cam.x)) < 0.05 && Math.abs(num(cam.z) - num(rf.cam.z)) < 0.05);
        if (untouched && (rf.dx || rf.dy)) { rcall('pan', -rf.dx, -rf.dy); snapCamera(); }
        rcall('setViewInsets', null);
      }
      return;
    }
    cancelAnimationFrame(ui._reframeRaf);
    ui._reframeRaf = requestAnimationFrame(() => {
      if (!(ui.mode === 'buy' || ui.mode === 'build') || dr.hidden) return;
      if (dr.classList.contains('collapsed') && ui.reframe) return;   // keep the shift of the open sheet
      const r = dr.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!(r.width > 0)) return;
      let tx = 0, ty = 0;
      const bottomSheet = r.left < vw * 0.2;          // phones: the drawer is a bottom sheet
      if (bottomSheet) ty = Math.round(Math.min(0, (r.top - vh) / 2));
      else tx = Math.round(Math.min(0, (r.left - vw) / 2));
      const prev = ui.reframe || { dx: 0, dy: 0 };
      const ddx = tx - prev.dx, ddy = ty - prev.dy;
      if (Math.abs(ddx) >= 1 || Math.abs(ddy) >= 1) { rcall('pan', ddx, ddy); snapCamera(); }
      ui.reframe = { dx: tx, dy: ty, cam: rcall('getCamera') };
      const barTop = ui.els.bar ? ui.els.bar.getBoundingClientRect().top : vh;
      rcall('setViewInsets', bottomSheet ? { top: 60, right: 56, bottom: Math.max(0, vh - r.top), left: 0 } : { top: 60, right: Math.max(0, vw - r.left), bottom: Math.max(0, vh - barTop), left: 0 });
    });
  }
  // the drawer appears at once, so the view jumps with it (no easing: taps right after opening land where aimed)
  function snapCamera() {
    const c = rcall('getCamera');
    if (c && isFinite(c.x) && isFinite(c.z)) rcall('setCamera', { x: c.x, z: c.z });
  }
  // CONTRACT_V2 §4: walls stay up while a wall-mounted item is placed or selected in Buy mode
  function updateWallOverride() {
    let on = false;
    if (ui.mode === 'buy') {
      const p = ui.buy.placing;
      const d = p ? (D().CATALOG || {})[p.type] : ui.buy.sel != null ? objDef(objById(ui.buy.sel)) : null;
      on = !!(d && d.wall);
    }
    if (on !== !!ui._wallsUp) { ui._wallsUp = on; rcall('setWallsUpOverride', on); }
  }

  // ======================================================================
  // Live dock: portraits, queue, needs panel
  // ======================================================================
  function household() {
    const r = ecall('household');
    if (Array.isArray(r)) return r;
    const st = S();
    return st ? st.sims.filter((s) => s && !s.visitor) : [];
  }
  function simById(id) {
    const r = ecall('simById', id);
    if (r) return r;
    const st = S();
    return st ? st.sims.find((s) => s.id === id) || null : null;
  }
  function objById(id) {
    const r = ecall('objectById', id);
    if (r) return r;
    const st = S();
    return st ? st.objects.find((o) => o.id === id) || null : null;
  }
  function objDef(o) { return o ? (D().CATALOG || {})[o.type] || null : null; }
  function selectedSim() {
    const st = S();
    if (!st) return null;
    let s = st.settings && st.settings.selectedSimId != null ? simById(st.settings.selectedSimId) : null;
    if (!s || s.visitor) {
      const hh = household();
      s = hh[0] || null;
      if (s && !ui._selecting) { ui._selecting = true; try { selectSim(s.id, true); } finally { ui._selecting = false; } }
    }
    return s;
  }
  function selectSim(id, quiet) {
    const st = S();
    if (!st) return;
    const s = simById(id);
    if (!s || s.visitor) return;
    if (typeof E().selectSim === 'function') ecall('selectSim', id);
    else st.settings.selectedSimId = id;
    rcall('setSelected', id);
    if (!quiet) sfx('click');
    ui.sig.queue = ''; ui.sig.tab = ''; ui.sig.rel = ''; ui.sig.career = '';
    ui.trend = { simId: null, at: -1, vals: null, prev: null };
    refreshDock(true);
  }
  function focusSim(s) {
    if (!s) return;
    if (s.hidden) { toast(firstName(s) + (s.atWork ? ' está no trabalho.' : ' não está no terreno agora.'), 'info'); return; }
    rcall('focus', s.x, s.y);
  }

  function refreshPortraits() {
    const els = ui.els;
    const hh = household();
    const st = S();
    const selId = st && st.settings ? st.settings.selectedSimId : null;
    const sig = hh.map((s) => s.id + ':' + (s.colors && (s.colors.skin + s.colors.hair + s.colors.shirt)) + ':' + s.gender + ':' + s.name).join('|');
    if (sig !== ui.sig.portraits) {
      ui.sig.portraits = sig;
      clear(els.portraits);
      for (const s of hh) {
        const cv = h('canvas', { width: '54', height: '54', 'aria-hidden': 'true' });
        const badge = h('span', { class: 'badge emoji', hidden: true });
        const dot = h('span', { class: 'mood-dot' });
        const btn = h('button', {
          class: 'portrait', type: 'button', 'data-sim': s.id, 'aria-pressed': 'false', title: s.name,
          'aria-label': 'Selecionar ' + s.name,
          on: {
            // LIVE-10: touch screens never send dblclick — a tap on the already-selected portrait (or a second
            // tap within 350 ms) centres the camera on that character
            click: () => {
              const now = performance.now();
              const st2 = S();
              const already = st2 && st2.settings && st2.settings.selectedSimId === s.id;
              const dbl = ui._portraitTap && ui._portraitTap.id === s.id && now - ui._portraitTap.t < 350;
              ui._portraitTap = { id: s.id, t: now };
              if (already || dbl) { selectSim(s.id, true); focusSim(simById(s.id)); return; }
              selectSim(s.id);
            },
            dblclick: () => { selectSim(s.id, true); focusSim(simById(s.id)); },
          },
        }, [cv, badge, dot, h('span', { class: 'portrait-name', text: firstName(s) })]);
        btn._cv = cv; btn._badge = badge; btn._dot = dot; btn._face = '';
        els.portraits.appendChild(btn);
      }
    }
    for (const btn of els.portraits.children) {
      const s = simById(+btn.getAttribute('data-sim'));
      if (!s) continue;
      const m = moodOf(s);
      const face = moodBucket(m) + ':' + (s.asleep ? 1 : 0);
      if (btn._face !== face) { btn._face = face; drawFace(btn._cv, s, { size: 54, mood: m, asleep: s.asleep }); }
      btn.setAttribute('aria-pressed', s.id === selId ? 'true' : 'false');
      btn.classList.toggle('away', !!s.hidden);
      const b = s.hidden ? (s.atWork ? '💼' : '🚗') : s.asleep ? '💤' : '';
      btn._badge.hidden = !b;
      setText(btn._badge, b);
      btn._dot.style.background = moodColorOf(s);
      const status = s.hidden ? (s.atWork ? ' — no trabalho' : ' — fora de casa') : s.asleep ? ' — dormindo' : '';
      btn.title = s.name + status;
    }
  }

  function actionDuration(sim, a) {
    if (!a) return 0;
    if (a.data && a.data.duration != null) return num(a.data.duration);
    if (a.kind === 'object') {
      const o = objById(a.objId);
      const it = o && D().interaction ? D().interaction(o.type, a.interaction) : null;
      return it && it.duration ? num(it.duration) : 0;
    }
    return 0;
  }
  function refreshQueue(sim) {
    const el = ui.els.queue;
    if (!sim) { clear(el); ui.sig.queue = ''; return; }
    const full = Array.isArray(sim.queue) ? sim.queue : [];
    // LIVE-8: at most 8 icons; with more actions the last slot becomes a '+N' chip
    const q = full.length > 8 ? full.slice(0, 7) : full.slice(0, 8);
    const more = full.length - q.length;
    const sig = sim.id + '|' + more + '|' + q.map((a) => a.id + ':' + (a.phase === 'do' ? 'd' : 'w') + (a.cancel ? 'x' : '') + a.source + (a.icon || '')).join(',');
    if (sig !== ui.sig.queue) {
      ui.sig.queue = sig;
      clear(el);
      if (!q.length) {
        el.appendChild(h('span', { class: 'queue-empty', text: sim.hidden ? (sim.atWork ? 'No trabalho' : 'Fora de casa') : (isCoarse() ? 'Sem ações na fila — toque em algo para interagir' : 'Sem ações na fila — clique em algo para interagir') }));
      }
      q.forEach((a, i) => {
        const walking = a.phase === 'route' || a.phase === 'walk';
        const cls = 'q-item' + (i === 0 ? ' current' : '') + (a.source === 'auto' ? ' auto' : '') + (walking && i === 0 ? ' walking' : '') + (a.cancel ? ' cancel' : '');
        const label = (a.label || 'Ação') + (a.source === 'auto' ? ' (vontade própria)' : '') + (a.nocancel ? '' : (isCoarse() ? ' — toque para cancelar' : ' — clique para cancelar'));
        const prog = h('span', { class: 'q-prog', hidden: true }, h('i', { style: { width: '0%' } }));
        const b = h('button', {
          class: cls, type: 'button', title: label, 'aria-label': label, 'data-act': a.id,
          on: { click: () => { const ok = ecall('cancelAction', sim.id, a.id); sfx(ok ? 'click' : 'error'); ui.sig.queue = ''; refreshQueue(simById(sim.id)); } },
        }, [emo(a.icon || '•'), prog]);
        b._prog = prog;
        el.appendChild(b);
      });
      if (more > 0) {
        const rest = full.slice(q.length).map((a) => a.label || 'Ação').join(', ');
        el.appendChild(h('span', { class: 'q-more num', title: 'Mais ' + more + ' na fila: ' + rest, 'aria-label': 'Mais ' + more + ' ações na fila', text: '+' + more }));
      }
    }
    // progress of the current action
    const first = el.querySelector('.q-item.current');
    if (first && q[0]) {
      const a = q[0];
      const dur = actionDuration(sim, a);
      if (a.phase === 'do' && dur > 0) {
        first._prog.hidden = false;
        first._prog.firstChild.style.width = clamp(num(a.elapsed) / dur * 100, 0, 100).toFixed(0) + '%';
      } else first._prog.hidden = true;
    }
  }

  function simStatus(sim) {
    if (!sim) return '';
    if (sim.hidden) {
      if (sim.atWork) return 'No trabalho' + (sim.workReturnAt ? ' · volta às ' + fmtTime(num(sim.workReturnAt) % 1440) : '');
      return 'Fora de casa';
    }
    const a = sim.queue && sim.queue[0];
    if (a) {
      const walking = a.phase === 'route' || a.phase === 'walk';
      return (walking ? 'A caminho: ' : '') + (a.label || '…');
    }
    if (sim.asleep) return 'Dormindo';
    return 'Livre';
  }

  function refreshDock(force) {
    if (ui.mode !== 'live') return;
    refreshPortraits();
    const sim = selectedSim();
    const els = ui.els;
    if (!sim) {
      setText(els.needsName, 'Nenhum morador');
      setText(els.needsSub, 'Crie uma família em Opções.');
      clear(els.tabBody);
      refreshQueue(null);
      return;
    }
    ui.lastSim = sim.id;
    setText(els.needsName, sim.name);
    setText(els.needsSub, simStatus(sim));
    const m = moodOf(sim);
    const n = Math.min(5, Math.ceil(Math.abs(m) / 20));
    const segs = els.moodMeter.children;
    for (let i = 0; i < 5; i++) segs[i].classList.toggle('on', m < 0 && (4 - i) < n);
    for (let i = 0; i < 5; i++) segs[6 + i].classList.toggle('on', m > 0 && i < n);
    setText(els.moodLabel, moodLabel(m));
    els.moodLabel.style.color = moodColorOf(sim);
    setText(els.needsToggleLabel, moodLabel(m));
    setText(els.needsToggleIco, m >= 20 ? '😊' : m > -20 ? '🙂' : m > -60 ? '😟' : '😫');
    refreshQueue(sim);
    refreshTab(sim, force);
  }

  // ---- tabs
  function setTab(key) {
    ui.tab = key;
    prefs.tab = key; savePrefs();
    for (const k in ui.els.tabBtns) ui.els.tabBtns[k].setAttribute('aria-selected', k === key ? 'true' : 'false');
    ui.sig.tab = '';
    refreshTab(selectedSim(), true);
  }
  function refreshTab(sim, force) {
    const body = ui.els.tabBody;
    const tabSig = ui.tab + ':' + (sim ? sim.id : '-');
    const rebuild = force || ui.sig.tab !== tabSig;
    if (rebuild) { ui.sig.tab = tabSig; ui.sig.rel = ''; ui.sig.career = ''; }
    switch (ui.tab) {
      case 'skills': renderSkills(body, sim, rebuild); break;
      case 'career': renderCareer(body, sim, rebuild); break;
      case 'rel': renderRelations(body, sim, rebuild); break;
      case 'pers': renderPersonality(body, sim, rebuild); break;
      default: renderNeeds(body, sim, rebuild);
    }
  }

  function sampleTrend(sim) {
    const now = absMinute();
    const t = ui.trend;
    if (t.simId !== sim.id || !t.vals) { ui.trend = { simId: sim.id, at: now, vals: Object.assign({}, sim.motives), prev: null }; return; }
    if (now - t.at >= 5) { t.prev = t.vals; t.vals = Object.assign({}, sim.motives); t.at = now; }
  }
  function renderNeeds(body, sim, rebuild) {
    const MOT = D().MOTIVES || ['hunger', 'energy', 'comfort', 'fun', 'hygiene', 'social', 'bladder', 'room'];
    const LAB = D().MOTIVE_LABELS || {};
    const ICO = D().MOTIVE_ICONS || {};
    if (rebuild || !body._needs) {
      clear(body);
      const grid = h('div', { class: 'need-grid' });
      body._needs = {};
      for (const k of MOT) {
        const val = h('b', { text: '0' });
        const trend = h('span', { class: 'n-trend', text: '' });
        const fill = h('i', { style: { width: '50%' } });
        const row = h('div', { class: 'need', title: LAB[k] || k }, [
          h('span', { class: 'n-ico emoji', 'aria-hidden': 'true', text: ICO[k] || '•' }),
          h('div', { class: 'n-label' }, [h('span', {}, [LAB[k] || k, ' ', trend]), val]),
          h('div', { class: 'bar', role: 'meter', 'aria-label': LAB[k] || k, 'aria-valuemin': '-100', 'aria-valuemax': '100' }, fill),
        ]);
        row._fill = fill; row._val = val; row._trend = trend; row._bar = row.lastChild;
        body._needs[k] = row;
        grid.appendChild(row);
      }
      body.appendChild(grid);
      body._why = h('div', { class: 'mood-why', 'aria-live': 'off' });
      body.appendChild(body._why);
      body._kind = 'needs';
    }
    if (!sim) return;
    sampleTrend(sim);
    const prev = ui.trend.prev;
    for (const k of MOT) {
      const row = body._needs[k];
      if (!row) continue;
      const v = clamp(num(sim.motives && sim.motives[k]), -100, 100);
      row._fill.style.width = ((v + 100) / 2).toFixed(1) + '%';
      row._fill.style.backgroundColor = needColor(v);
      setText(row._val, String(Math.round(v)));
      row._bar.setAttribute('aria-valuenow', String(Math.round(v)));
      row.classList.toggle('crit', v < -50 && !sim.hidden);
      let tr = '';
      if (prev && prev[k] != null && !sim.hidden) {
        const d = v - num(prev[k]);
        if (d > 1) tr = '▲'; else if (d < -6) tr = '▼▼'; else if (d < -2.5) tr = '▼';
      }
      setText(row._trend, tr);
      row._trend.style.color = tr === '▲' ? 'var(--good)' : 'var(--bad)';
      row.title = (LAB[k] || k) + ': ' + Math.round(v) + ' de 100';
    }
    if (body._why) {
      const low = MOT.map((k) => ({ k, v: num(sim.motives && sim.motives[k]) })).filter((q) => q.v < 0).sort((a, b) => a.v - b.v).slice(0, 3);
      setText(body._why, sim.hidden ? (sim.atWork ? '💼 No trabalho: as necessidades ficam em pausa.' : '🚗 Fora de casa.') :
        low.length ? '⚠️ Precisa de: ' + low.map((q) => LAB[q.k] || q.k).join(', ') : '🙂 Tudo em ordem por enquanto.');
    }
  }

  function pipRow(container, value, cls) {
    let pips = container;
    if (!pips._pips) {
      clear(pips);
      pips._pips = [];
      for (let i = 0; i < 10; i++) { const b = h('b', { style: { width: '0%' } }); pips.appendChild(h('i', {}, b)); pips._pips.push(b); }
      if (cls) pips.classList.add(cls);
    }
    for (let i = 0; i < 10; i++) {
      const f = clamp(value - i, 0, 1);
      pips._pips[i].style.width = (f * 100).toFixed(0) + '%';
    }
  }
  function renderSkills(body, sim, rebuild) {
    const SK = D().SKILLS || ['cooking', 'mechanical', 'charisma', 'body', 'logic', 'creativity'];
    const LAB = D().SKILL_LABELS || {};
    const ICO = D().SKILL_ICONS || {};
    if (rebuild || body._kind !== 'skills') {
      clear(body);
      body._rows = {};
      for (const k of SK) {
        const pips = h('div', { class: 'pips', 'aria-hidden': 'true' });
        const val = h('span', { class: 's-val', text: '0' });
        const row = h('div', { class: 'skill-row', role: 'meter', 'aria-label': LAB[k] || k, 'aria-valuemin': '0', 'aria-valuemax': '10' }, [
          h('span', { class: 's-ico emoji', 'aria-hidden': 'true', text: ICO[k] || '•' }),
          h('span', { class: 's-label', text: LAB[k] || k }), pips, val]);
        row._pips = pips; row._val = val;
        body._rows[k] = row;
        body.appendChild(row);
      }
      body.appendChild(h('p', { class: 'empty-note', text: 'Habilidades sobem praticando: estante, espelho, aparelho de musculação, xadrez, cavalete e piano. É preciso estar de bom humor para aprender.' }));
      body._kind = 'skills';
    }
    if (!sim) return;
    for (const k of SK) {
      const row = body._rows[k];
      const v = clamp(num(sim.skills && sim.skills[k]), 0, 10);
      pipRow(row._pips, v);
      setText(row._val, v.toFixed(1).replace('.', ','));
      row.setAttribute('aria-valuenow', v.toFixed(1));
    }
  }
  function centerBar(fill, v, posColor, negColor) {
    v = clamp(num(v), -100, 100);
    if (v >= 0) { fill.style.left = '50%'; fill.style.width = (v / 2).toFixed(1) + '%'; fill.style.backgroundColor = posColor || 'var(--good)'; }
    else { fill.style.left = (50 + v / 2).toFixed(1) + '%'; fill.style.width = (-v / 2).toFixed(1) + '%'; fill.style.backgroundColor = negColor || 'var(--bad)'; }
  }
  function shiftLen(lv) {
    if (D().shiftHours) { try { const v = D().shiftHours(lv); if (isFinite(v)) return v; } catch (e) { /* ignore */ } }
    const d = (num(lv.end) - num(lv.start) + 24) % 24;
    return d || 24;
  }
  function untilText(mins) {
    mins = Math.max(0, Math.round(mins));
    if (mins < 60) return mins + ' min';
    const hh = Math.floor(mins / 60), mm = mins % 60;
    return hh + 'h' + (mm ? (mm < 10 ? '0' : '') + mm : '');
  }
  function offerRows(sim, offers) {
    const ul = h('ul', { class: 'offer-list' });
    for (const o of offers) {
      ul.appendChild(h('li', {}, h('button', {
        class: 'offer-row', type: 'button', 'aria-label': 'Ver vaga: ' + o.title + ', ' + o.name + ', ' + fmtMoney(o.pay) + ' por dia',
        on: { click: () => openOfferCard(o, sim.id, null) },
      }, [emo(o.icon || '💼'), h('span', {}, [h('b', { text: o.title }), h('small', { text: o.name + ' · ' + fmtMoney(o.pay) + '/dia · ' + hourStr(o.start) + '–' + hourStr(o.end) + ' · ' + (o.source === 'jornal' ? 'jornal' : 'computador') })]),
        h('span', { class: 'o-go', text: 'Ver vaga ›' })])));
    }
    return ul;
  }
  // LIVE-14/15 + improvement: the Carreira tab is a live progress view and offers can be accepted from it
  function renderCareer(body, sim, rebuild) {
    if (!sim) { clear(body); return; }
    const info = ecall('careerInfo', sim.id);
    const SL = D().SKILL_LABELS || {};
    const offers = ecall('jobOffers') || [];
    const m = moodOf(sim);
    const now = absMinute();
    const mins = info ? (info.atWork ? num(sim.workReturnAt) - now : info.nextShift != null ? num(info.nextShift) - now : null) : null;
    const sig = JSON.stringify(info ? [info.track, info.level, Math.round(info.performance / 5), info.atWork, info.friends, info.next && info.next.met, info.daysWorked, info.missedDays] : null) +
      sim.id + ':' + (m > 0 ? 1 : 0) + ':' + (mins == null ? '-' : Math.floor(mins / 5)) + ':' + offers.map((o) => o.track + o.source).join(',');
    if (!rebuild && sig === ui.sig.career && body._kind === 'career') return;
    ui.sig.career = sig;
    body._kind = 'career';
    clear(body);
    const where = isCoarse() ? 'Toque numa vaga para ver os detalhes e aceitar.' : 'Clique numa vaga para ver os detalhes e aceitar.';
    if (!info) {
      body.appendChild(h('div', { class: 'career-card' }, [
        h('div', { class: 'career-top' }, [h('div', { class: 'career-ico emoji', text: '📰' }), h('div', {}, [h('div', { class: 'career-title', text: 'Sem emprego' }), h('div', { class: 'muted', text: firstName(sim) + ' está procurando o que fazer da vida.' })])]),
      ]));
      if (offers.length) {
        body.appendChild(h('div', { class: 'section-label', text: 'Vagas disponíveis hoje' }));
        body.appendChild(offerRows(sim, offers));
        body.appendChild(h('p', { class: 'career-hint', text: where + ' Vagas novas chegam no jornal (1 por dia, perto da caixa de correio) e em “Procurar emprego” no computador (3).' }));
      } else body.appendChild(h('p', { class: 'empty-note', text: 'Nenhuma vaga à vista hoje. O jornal chega toda manhã perto da caixa de correio (1 vaga por dia) e “Procurar emprego” no computador mostra mais 3.' }));
      return;
    }
    const perf = h('i', {});
    const perfBar = h('div', { class: 'bar center', role: 'meter', 'aria-label': 'Desempenho', 'aria-valuemin': '-100', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(info.performance)) }, perf);
    centerBar(perf, info.performance);
    let status = '—';
    if (info.atWork) status = 'No trabalho' + (sim.workReturnAt ? ' · volta às ' + fmtTime(((num(sim.workReturnAt) % 1440) + 1440) % 1440) + (mins > 0 ? ' (em ' + untilText(mins) + ')' : '') : '');
    else if (info.nextShift != null) {
      status = describeShift(info.nextShift) + (mins != null && mins > 0 ? ' (em ' + untilText(mins) + ')' : '');
    }
    const kids = [
      h('div', { class: 'career-top' }, [
        h('div', { class: 'career-ico emoji', text: info.icon || '💼' }),
        h('div', { style: { minWidth: '0' } }, [h('div', { class: 'career-title', text: info.title }), h('div', { class: 'muted', text: info.trackName + ' · nível ' + info.level + ' de 10' })]),
      ]),
      h('dl', { class: 'kv' }, [
        h('dt', { text: 'Salário' }), h('dd', { text: fmtMoney(info.pay) + ' por dia' }),
        h('dt', { text: 'Horário' }), h('dd', { text: hourStr(info.start) + '–' + hourStr(info.end) + ' (' + info.hours + ' h) · ' + dayRange(info.days) }),
        h('dt', { text: info.atWork ? 'Agora' : 'Próximo turno' }), h('dd', { text: status }),
        !info.atWork && mins != null && mins > 0 ? h('dt', { text: 'Carona' }) : null,
        !info.atWork && mins != null && mins > 0 ? h('dd', { text: mins > 60 ? 'chega em ' + untilText(mins - 60) : 'já está esperando' }) : null,
        h('dt', { text: 'Dias trabalhados' }), h('dd', { text: String(info.daysWorked) + (info.missedDays ? ' · faltas seguidas: ' + info.missedDays : '') }),
      ]),
      h('div', {}, [h('div', { class: 'section-label', text: 'Desempenho' }), perfBar]),
    ];
    if (info.next) {
      const ul = h('ul', { class: 'req-list' });
      const req = info.next.req || {};
      const met = info.next.met || { skills: {} };
      for (const k in (req.skills || {})) {
        const ok = !!(met.skills && met.skills[k]);
        const cur = Math.floor(num(sim.skills && sim.skills[k]));
        ul.appendChild(h('li', { class: ok ? 'ok' : 'no' }, [h('span', { text: (ok ? '✓ ' : '○ ') + (SL[k] || k) }), h('span', { class: 'num', text: cur + ' / ' + req.skills[k] })]));
      }
      if (num(req.friends) > 0) {
        const ok = !!met.friends;
        ul.appendChild(h('li', { class: ok ? 'ok' : 'no' }, [
          h('span', {}, [(ok ? '✓ ' : '○ ') + 'Amigos da família', ok ? null : h('span', { class: 'r-hint', text: ' — converse e ligue para vizinhos' })]),
          h('span', { class: 'num', text: info.friends + ' / ' + req.friends })]));
      }
      // LIVE-15: the promotion roll uses the mood at departure — show it live (or the departure mood at work)
      const depMood = sim.career && sim.career.moodAtDeparture != null ? num(sim.career.moodAtDeparture) : null;
      const goodMood = info.atWork && depMood != null ? depMood > 0 : m > 0;
      ul.appendChild(h('li', { class: goodMood ? 'ok' : 'no' }, [
        h('span', { text: (goodMood ? '✓ ' : '○ ') + (info.atWork ? 'Saiu de bom humor' : 'Ir trabalhar de bom humor') }),
        h('span', { class: 'r-hint', text: info.atWork ? '' : 'agora: ' + moodLabel(m).toLowerCase() })]));
      kids.push(h('div', {}, [
        h('div', { class: 'section-label', text: 'Próxima promoção: ' + info.next.title + ' · ' + fmtMoney(info.next.pay) + '/dia' }),
        ul,
      ]));
    } else {
      kids.push(h('p', { class: 'empty-note', text: 'Topo da carreira! Não há promoções acima deste cargo.' }));
    }
    body.appendChild(h('div', { class: 'career-card' }, kids));
    const others = offers.filter((o) => o.track !== info.track);
    if (others.length) {
      body.appendChild(h('div', { class: 'section-label', text: 'Outras vagas hoje (troca de emprego)' }));
      body.appendChild(offerRows(sim, others));
    }
  }
  // ---- job offer card (LIVE-2): title, career, pay, hours, days, promotion path; compare when employed
  function offerFor(track, srcObj) {
    const list = ecall('jobOffers') || [];
    const want = srcObj ? (srcObj.type === 'computer' ? 'computador' : 'jornal') : null;
    let o = list.find((q) => q.track === track && (!want || q.source === want)) || list.find((q) => q.track === track) || null;
    if (!o) {
      const c = (D().CAREERS || {})[track];
      const lv = c && c.levels && c.levels[0];
      if (lv) o = { track, source: want || 'jornal', name: c.name, icon: c.icon, title: lv.title, pay: lv.pay, start: lv.start, end: lv.end, days: (lv.days || []).slice() };
    }
    return o;
  }
  function offerSource(offer, sim) {
    const st = S();
    if (!st || !offer) return null;
    if (offer.source === 'computador') {
      const comps = st.objects.filter((o) => o.type === 'computer' && !o.broken);
      comps.sort((a, b) => Math.hypot(a.x - sim.x, a.y - sim.y) - Math.hypot(b.x - sim.x, b.y - sim.y));
      return comps[0] || null;
    }
    return st.objects.find((o) => o.type === 'newspaper' && o.offer === offer.track) || null;
  }
  function openOfferCard(offer, simId, objId) {
    const sim = simById(simId);
    if (!offer || !sim) return Promise.resolve(false);
    const c = (D().CAREERS || {})[offer.track] || {};
    const levels = Array.isArray(c.levels) ? c.levels : [];
    const lv = levels[0] || offer;
    const next = levels[1] || null;
    const cur = sim.career ? ecall('careerInfo', sim.id) : null;
    const hours = shiftLen(lv);
    const night = num(lv.start) >= 20 || num(lv.end) <= 6 || num(lv.end) < num(lv.start);
    const head = h('div', { class: 'offer-head' }, [
      h('div', { class: 'career-ico emoji', text: offer.icon || c.icon || '💼' }),
      h('div', {}, [h('b', { text: offer.title }), h('span', { text: offer.name + ' · nível 1 de ' + (levels.length || 10) + ' · vaga do ' + (offer.source === 'computador' ? 'computador' : 'jornal') })]),
    ]);
    const kids = [head];
    const hoursTxt = (l) => hourStr(num(l.start)) + '–' + hourStr(num(l.end)) + ' (' + shiftLen(l) + ' h)';
    if (cur) {
      const cmp = (a, b) => (a > b ? 'better' : a < b ? 'worse' : '');
      kids.push(h('dl', { class: 'compare' }, [
        h('span', {}), h('span', { class: 'c-h', text: 'Emprego atual' }), h('span', { class: 'c-h', text: 'Nova vaga' }),
        h('dt', { text: 'Cargo' }), h('dd', { text: cur.title }), h('dd', { text: offer.title }),
        h('dt', { text: 'Carreira' }), h('dd', { text: cur.trackName + ' · nível ' + cur.level }), h('dd', { text: offer.name + ' · nível 1' }),
        h('dt', { text: 'Salário' }), h('dd', { text: fmtMoney(cur.pay) + '/dia' }), h('dd', { class: cmp(num(offer.pay), num(cur.pay)), text: fmtMoney(offer.pay) + '/dia' }),
        h('dt', { text: 'Horário' }), h('dd', { text: hoursTxt(cur) }), h('dd', { text: hoursTxt(lv) }),
        h('dt', { text: 'Dias' }), h('dd', { text: dayRange(cur.days) }), h('dd', { text: dayRange(offer.days || lv.days) }),
      ]));
      kids.push(h('div', { class: 'warn-note bad', text: 'Ao trocar de emprego, ' + firstName(sim) + ' começa no nível 1 de ' + offer.name + ' e perde o cargo de ' + cur.title + ' (nível ' + cur.level + ') em ' + cur.trackName + ', com todo o desempenho acumulado.' }));
    } else {
      kids.push(h('dl', { class: 'kv' }, [
        h('dt', { text: 'Salário' }), h('dd', { text: fmtMoney(offer.pay) + ' por dia' }),
        h('dt', { text: 'Horário' }), h('dd', { text: hoursTxt(lv) }),
        h('dt', { text: 'Dias' }), h('dd', { text: dayRange(offer.days || lv.days) }),
        h('dt', { text: 'Carona' }), h('dd', { text: 'chega 1 h antes, às ' + hourStr((num(lv.start) + 23) % 24) }),
      ]));
    }
    if (next) kids.push(h('p', { class: 'offer-path', text: 'Próxima promoção: ' + next.title + ' · ' + fmtMoney(next.pay) + '/dia' + '.' }));
    if (night) kids.push(h('div', { class: 'warn-note', text: 'Turno da noite: ' + firstName(sim) + ' vai precisar dormir antes do trabalho.' }));
    return choice({
      title: cur ? 'Trocar de emprego?' : 'Vaga de emprego',
      body: h('div', { class: 'offer-card' }, kids),
      buttons: [{ label: 'Agora não', value: false }, { label: cur ? 'Trocar de emprego' : 'Aceitar vaga', value: true, primary: !cur, danger: !!cur }],
      cancelValue: false,
      kind: 'offer',
    }).then((yes) => {
      if (!yes) return false;
      const src = objId != null ? objById(objId) : offerSource(offer, sim);
      if (!src) { toast('Esta vaga não está mais disponível.', 'bad'); return false; }
      const ok = !!ecall('queueInteraction', sim.id, src.id, 'job:' + offer.track, 'player');
      if (ok) {
        sfx('click');
        toast(firstName(sim) + ' vai ' + (src.type === 'computer' ? 'ao computador' : 'até o jornal') + ' aceitar a vaga de ' + offer.title + '.', 'career', { icon: offer.icon || '💼', timeout: 3500 });
        ui.sig.queue = ''; refreshDock();
      } else refusal('Não foi possível aceitar a vaga agora.');
      return ok;
    });
  }
  function describeShift(absStart) {
    const st = S();
    if (!st) return '';
    const day = Math.floor(num(absStart) / 1440);
    const minute = num(absStart) % 1440;
    const today = num(st.time.day);
    const when = day === today ? 'hoje' : day === today + 1 ? 'amanhã' : (M.util ? M.util.weekdayName(day, true) : 'dia ' + day);
    return when + ' às ' + fmtTime(minute);
  }
  function renderRelations(body, sim, rebuild) {
    if (!sim) { clear(body); return; }
    const list = ecall('relationships', sim.id) || [];
    const sig = sim.id + ':' + list.map((r) => r.id + ',' + r.daily + ',' + r.lifetime + ',' + (r.friend ? 1 : 0)).join(';');
    if (!rebuild && sig === ui.sig.rel && body._kind === 'rel') return;
    ui.sig.rel = sig;
    body._kind = 'rel';
    clear(body);
    if (!list.length) {
      body.appendChild(h('p', { class: 'empty-note', text: firstName(sim) + ' ainda não conhece ninguém. Converse com os vizinhos, ligue pelo telefone ou convide alguém para visitar.' }));
      return;
    }
    for (const r of list) {
      const other = simById(r.id) || ecall('npcById', r.id) || { colors: {}, gender: 'f' };
      const cv = h('canvas', { width: '36', height: '36', 'aria-hidden': 'true' });
      drawFace(cv, other, { size: 36, mood: r.daily });
      const dFill = h('i', {}), lFill = h('i', {});
      centerBar(dFill, r.daily);
      centerBar(lFill, r.lifetime, 'var(--info)', 'var(--bad)');
      const tags = [];
      if (r.household) tags.push(h('span', { class: 'rel-tag', text: 'família' }));
      if (r.friend) tags.push(h('span', { class: 'rel-tag friend', text: '★ amigo' }));
      body.appendChild(h('div', { class: 'rel-row' }, [
        cv,
        h('div', { style: { minWidth: '0' } }, [
          h('div', { class: 'rel-name' }, [h('span', { text: r.name }), tags]),
          h('div', { class: 'rel-bars' }, [
            h('span', { text: 'Hoje' }), h('div', { class: 'bar center', title: 'Relação diária: ' + r.daily }, dFill), h('b', { text: String(r.daily) }),
            h('span', { text: 'Sempre' }), h('div', { class: 'bar center', title: 'Relação duradoura: ' + r.lifetime }, lFill), h('b', { text: String(r.lifetime) }),
          ]),
        ]),
      ]));
    }
  }
  function renderPersonality(body, sim, rebuild) {
    const P = D().PERSONALITY || ['neat', 'outgoing', 'active', 'playful', 'nice'];
    const L = D().PERSONALITY_LABELS || {};
    const O = D().PERSONALITY_OPPOSITES || {};
    if (rebuild || body._kind !== 'pers') {
      clear(body);
      body._rows = {};
      for (const k of P) {
        const pips = h('div', { class: 'pips trait', 'aria-hidden': 'true' });
        const lo = h('span', { text: O[k] || '' }), hi = h('b', { text: L[k] || k });
        const row = h('div', { class: 'trait-row', role: 'meter', 'aria-label': L[k] || k, 'aria-valuemin': '0', 'aria-valuemax': '10' }, [h('div', { class: 'trait-ends' }, [lo, hi]), pips]);
        row._pips = pips; row._lo = lo; row._hi = hi;
        body._rows[k] = row;
        body.appendChild(row);
      }
      body._kind = 'pers';
    }
    if (!sim) return;
    for (const k of P) {
      const row = body._rows[k];
      const v = clamp(num(sim.personality && sim.personality[k]), 0, 10);
      pipRow(row._pips, v, 'trait');
      row.setAttribute('aria-valuenow', String(v));
      row._hi.style.color = v >= 6 ? 'var(--ink)' : 'var(--ink-faint)';
      row._lo.style.color = v <= 4 ? 'var(--ink)' : 'var(--ink-faint)';
      row._lo.style.fontWeight = v <= 4 ? '800' : '700';
      row.title = (L[k] || k) + ': ' + v + ' de 10';
    }
  }
  function toggleNeedsDrawer(force) {
    const open = typeof force === 'boolean' ? force : !ui.els.dock.classList.contains('needs-open');
    ui.els.dock.classList.toggle('needs-open', open);
    ui.els.hud.classList.toggle('needs-open', open);
    ui.els.needsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) refreshDock(true);
  }

  // ======================================================================
  // Clock / speed / money
  // ======================================================================
  function refreshClock() {
    const st = S();
    const els = ui.els;
    if (!st) return;
    const minute = num(st.time.minute);
    setText(els.clockTime, fmtTime(minute));
    const day = num(st.time.day, 1);
    const wdL = M.util ? M.util.weekdayName(day, true) : '';
    const wdS = M.util ? M.util.weekdayName(day) : '';
    setText(els.dayLong, wdL + ' · Dia ' + day);
    setText(els.dayShort, wdS + ' · Dia ' + day);
    const hh = (minute / 60) % 12, mm = minute % 60;
    els.handH.style.transform = 'rotate(' + (hh * 30).toFixed(1) + 'deg)';
    els.handM.style.transform = 'rotate(' + (mm * 6).toFixed(1) + 'deg)';
    els.clockFace.classList.toggle('night', minute < 360 || minute >= 1140);
    const speed = M.main && typeof M.main.getSpeed === 'function' ? M.main.getSpeed() : num(st.speed, 1);
    const reasons = M.main && M.main.pauseReasons ? M.main.pauseReasons() : [];
    els.speedBtns.forEach((b, i) => b.setAttribute('aria-pressed', i === speed ? 'true' : 'false'));
    let note = '', userPause = false;
    if (reasons.indexOf('buy') >= 0 || reasons.indexOf('build') >= 0) note = 'Tempo pausado';
    else if (reasons.length) {
      // the reason label from M.main (e.g. "Pausado · Opções") when it has one
      let lab = '';
      if (M.main && typeof M.main.pauseLabel === 'function') { try { lab = M.main.pauseLabel() || ''; } catch (e) { lab = ''; } }
      note = lab && !/^paus/i.test(lab) ? 'Pausado · ' + lab : (lab || 'Pausado');
    }
    else if (speed === 0) { note = 'Pausado'; userPause = true; }      // LIVE-9: the player's own pause shows too
    else if (M.main && M.main.isUltraBoost && M.main.isUltraBoost()) note = 'Todos dormindo · 30×';
    els.speedNote.hidden = !note;
    els.speedNote.classList.toggle('user', userPause);
    setText(els.speedNote, note);
    setText(els.family, st.householdName || '');
    refreshEta();
  }
  // CONTRACT_V2 §3: pizza / service / guest arrival chip next to the clock
  const ETA_ICON = { pizza: '🍕', repair: '🔧', maid: '🧹', guest: '🏠' };
  function refreshEta() {
    const el = ui.els.eta;
    if (!el) return;
    const list = typeof E().pendingDeliveries === 'function' ? (ecall('pendingDeliveries') || []) : [];
    if (!Array.isArray(list) || !list.length) { if (!el.hidden) el.hidden = true; return; }
    const now = absMinute();
    const first = list[0];
    const when = (d) => num(d.at) <= now + 1 ? 'chegando' : 'às ' + fmtTime(((num(d.at) % 1440) + 1440) % 1440);
    const short = (d) => (ETA_ICON[d.kind] || '⏳') + ' ' + (d.kind === 'pizza' ? 'Pizza' : String(d.label || '').replace(/ a caminho$/, '')) + ' ' + when(d);
    let txt = short(first);
    if (ui.narrow) txt = (ETA_ICON[first.kind] || '⏳') + ' ' + (num(first.at) <= now + 1 ? 'chegando' : fmtTime(((num(first.at) % 1440) + 1440) % 1440));
    if (list.length > 1) txt += ' · +' + (list.length - 1);
    setText(el, txt);
    const title = list.map((d) => (d.label || d.kind) + ' — ' + when(d)).join('\n');
    if (el.title !== title) { el.title = title; el.setAttribute('aria-label', title); }
    if (el.hidden) el.hidden = false;
  }
  function refreshMoney(dt) {
    const st = S();
    if (!st) return;
    const target = Math.round(num(st.money));
    const m = ui.money;
    if (m.shown == null) m.shown = target;
    if (m.shown !== target) {
      const diff = target - m.shown;
      const step = Math.abs(diff) < 2 ? diff : diff * Math.min(1, (dt || 0.016) * 7);
      m.shown = Math.abs(diff) < 1 ? target : m.shown + step;
    }
    const txt = fmtMoney(Math.round(m.shown));
    setText(ui.els.money, txt);
    ui.els.money.classList.toggle('low', target < 100);
  }
  function moneyFloat(delta) {
    if (!delta) return;
    const el = h('div', { class: 'money-float ' + (delta > 0 ? 'pos' : 'neg'), text: fmtSigned(delta) });
    ui.els.moneybox.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1700);
  }

  // ======================================================================
  // Toasts & log
  // ======================================================================
  /**
   * toast(text, kind, opts) — CONTRACT_V2 §6. opts: { icon, timeout, sticky, focus: {x,y}|{simId}|{objId}
   * (adds a 'Ver' button), action: { label, fn }, actions: [{ label, fn, primary }], id (notification id) }.
   * The same text already on screen is bumped instead of stacked. Phones keep at most 2 toasts (LIVE-13);
   * older ones stay in the bell log.
   */
  function toast(text, kind, opts) {
    opts = opts || {};
    kind = kind || 'info';
    const els = ui.els;
    if (!els.toasts) { if (ui.pendingToasts.length < 12) ui.pendingToasts.push([text, kind, opts]); return null; }
    text = touchText(text);
    for (const n of Array.from(els.toasts.children)) {
      if (n._text === text && !n.classList.contains('leaving')) {
        n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
        if (n._timeout) { clearTimeout(n._timer); n._timer = setTimeout(() => dismissToast(n), n._timeout); }
        return n;
      }
    }
    const actions = (Array.isArray(opts.actions) ? opts.actions : []).slice();
    if (opts.action && opts.action.label && typeof opts.action.fn === 'function') actions.push(Object.assign({ primary: true }, opts.action));
    if (opts.focus && focusPoint(opts.focus)) actions.push({ label: 'Ver', primary: false, fn: () => focusTarget(opts.focus) });
    const node = h('div', { class: 'toast ' + kind, role: kind === 'bad' ? 'alert' : 'status' });
    const close = () => dismissToast(node);
    const textEl = h('div', {}, [String(text)]);
    node.appendChild(h('span', { class: 't-ico emoji', 'aria-hidden': 'true', text: opts.icon || KIND_ICON[kind] || 'ℹ️' }));
    node.appendChild(textEl);
    node.appendChild(h('button', { class: 't-close', type: 'button', 'aria-label': 'Fechar aviso', text: '×', on: { click: close } }));
    if (actions.length) {
      node.appendChild(h('div', { class: 't-actions' }, actions.map((a) => h('button', {
        class: 'btn small' + (a.primary === false ? '' : ' primary'), type: 'button', text: a.label,
        on: { click: () => { close(); try { a.fn(); } catch (e) { warnOnce('toast-action', e); } } },
      }))));
    }
    node._text = text; node._textEl = textEl; node._id = opts.id != null ? opts.id : null; node._sticky = !!opts.sticky;
    els.toasts.appendChild(node);
    const max = ui.narrow ? 2 : 4;
    while (els.toasts.children.length > max) {
      const kids = Array.from(els.toasts.children).filter((n) => n !== node);
      const victim = kids.find((n) => !n._sticky) || kids[0];
      if (!victim) break;
      dismissToast(victim, true);
    }
    const phone = ui.narrow;
    const dflt = actions.length ? 12000 : kind === 'bad' ? (phone ? 5000 : 7000) : (phone ? 4000 : 5500);
    node._timeout = opts.sticky ? 0 : (opts.timeout || dflt);
    if (node._timeout) node._timer = setTimeout(close, node._timeout);
    els.hud.classList.toggle('toasts-live', els.toasts.children.length > 0);
    return node;
  }
  /** World position for a notification focus ({simId} | {objId} | {x, y}) or null. */
  function focusPoint(f) {
    if (!f || typeof f !== 'object') return null;
    if (f.simId != null) { const s = simById(f.simId); return s && !s.hidden ? { x: num(s.x), y: num(s.y) } : null; }
    if (f.objId != null) {
      const o = objById(f.objId);
      if (!o) return null;
      const sz = wcall('rotatedSize', o.type, o.rot) || { w: 1, h: 1 };
      return { x: num(o.x) + (num(sz.w, 1) - 1) / 2, y: num(o.y) + (num(sz.h, 1) - 1) / 2 };
    }
    if (f.x != null && f.y != null && isFinite(+f.x) && isFinite(+f.y)) return { x: +f.x, y: +f.y };
    return null;
  }
  function focusTarget(f) {
    const p = focusPoint(f);
    if (!p) { toast('Isso não está mais à vista.', 'info', { timeout: 2200 }); return; }
    if (ui.mode !== 'live' && ui.mode !== 'buy' && ui.mode !== 'build') setMode('live');
    rcall('focus', p.x, p.y);
    setTimeout(() => {
      const pr = rcall('project', p.x + 0.5, 0.2, p.y + 0.5);
      if (pr && pr.visible !== false) walkPing(pr.clientX != null ? pr.clientX : pr.x, pr.clientY != null ? pr.clientY : pr.y);
    }, 650);
  }
  function dismissToast(node, now) {
    if (!node || !node.parentNode) return;
    clearTimeout(node._timer);
    const done = () => {
      if (node.parentNode) node.parentNode.removeChild(node);
      if (ui.els.hud && ui.els.toasts) ui.els.hud.classList.toggle('toasts-live', ui.els.toasts.children.length > 0);
    };
    if (now) { done(); return; }
    node.classList.add('leaving');
    setTimeout(done, 300);
  }
  function offer(text, label, fn) { return toast(text, 'info', { actions: [{ label, fn }], timeout: 15000 }); }
  function toggleLog() {
    ui.logOpen = !ui.logOpen;
    ui.els.logPanel.hidden = !ui.logOpen;
    ui.els.logBtn.setAttribute('aria-expanded', ui.logOpen ? 'true' : 'false');
    ui.els.hud.classList.toggle('log-open', ui.logOpen);
    if (ui.logOpen) { ui.unread = 0; ui.sig.log = ''; refreshLog(); }
    refreshLogCount();
  }
  function refreshLogCount() {
    ui.els.logCount.hidden = ui.unread <= 0;
    setText(ui.els.logCount, ui.unread > 9 ? '9+' : String(ui.unread));
  }
  function refreshLog() {
    if (!ui.logOpen) return;
    const st = S();
    const list = st && Array.isArray(st.notifications) ? st.notifications : [];
    const last = list.length ? list[list.length - 1] : null;
    const sig = list.length + ':' + (last ? last.id + ':' + num(last.count) : '');
    if (sig === ui.sig.log) return;
    ui.sig.log = sig;
    const ol = ui.els.logList;
    clear(ol);
    if (!list.length) { ol.appendChild(h('li', {}, [h('span', {}), h('span', { class: 'muted', text: 'Nada por aqui ainda.' })])); return; }
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i];
      if (!n) continue;
      ol.appendChild(h('li', {}, [
        h('span', { class: 'emoji', 'aria-hidden': 'true', text: KIND_ICON[n.kind] || 'ℹ️' }),
        h('div', {}, [h('time', { text: (M.util ? M.util.weekdayName(num(n.day, 1)) : '') + ', dia ' + num(n.day, 1) + ' · ' + fmtTime(num(n.minute)) }), touchText(String(n.text || '')) + (num(n.count) > 1 ? ' (×' + num(n.count) + ')' : '')]),
      ]));
    }
  }

  // ======================================================================
  // Bubbles (speech / thought) and hover label — every frame
  // ======================================================================
  // Bubbles: all screen positions are read first (simScreenPos may measure the canvas), then every bubble is
  // written in one pass with a transform (no left/top → no layout per bubble), skipping unchanged values.
  function updateBubbles() {
    const st = S();
    const layer = ui.els.bubbles;
    if (!st || !layer) return;
    const now = absMinute();
    const todo = [];
    for (const s of st.sims) {
      const b = s && s.bubble;
      if (!b || s.hidden || num(b.until) <= now) continue;
      const pos = rcall('simScreenPos', s.id);
      if (!pos || pos.visible === false) continue;
      const px = pos.clientX != null ? pos.clientX : pos.x, py = pos.clientY != null ? pos.clientY : pos.y;
      if (!isFinite(px) || !isFinite(py)) continue;
      todo.push({ s, b, px: Math.round(px), py: Math.round(py) });
    }
    const seen = new Set();
    for (const t of todo) {
      seen.add(t.s.id);
      let el = ui.bubbles.get(t.s.id);
      if (!el) {
        el = h('div', { class: 'bubble pop' });
        layer.appendChild(el);
        ui.bubbles.set(t.s.id, el);
      }
      const cls = 'bubble ' + (t.b.kind === 'talk' ? 'talk' : 'think');
      if (el._cls !== cls) { el._cls = cls; el.className = cls + ' pop'; }
      if (el._icon !== t.b.icon) { el._icon = t.b.icon; el.textContent = t.b.icon || '…'; }
      if (el._px !== t.px || el._py !== t.py) {
        el._px = t.px; el._py = t.py;
        el.style.transform = 'translate3d(' + t.px + 'px,' + t.py + 'px,0) translate(-50%, calc(-100% - 14px))';
      }
    }
    for (const [id, el] of ui.bubbles) {
      if (!seen.has(id)) { if (el.parentNode) el.parentNode.removeChild(el); ui.bubbles.delete(id); }
    }
  }
  function clearBubbles() {
    for (const [, el] of ui.bubbles) if (el.parentNode) el.parentNode.removeChild(el);
    ui.bubbles.clear();
  }
  // LIVE-1: a click on a counter/table (no interactions of its own) that holds a meal, plate or other item
  // targets that item. render.pick already prefers items; this covers ray hits on the bare surface.
  function resolveTarget(p) {
    if (!p || p.kind !== 'object') return p;
    const o = objById(p.id);
    const d = objDef(o);
    if (!o || !d || d.noBlock) return p;
    const hasOwn = interactionsFor(o.id).length > 0;
    if (hasOwn && !d.surface) return p;
    let item = null;
    if (p.x != null && p.y != null) item = wcall('itemAt', p.x, p.y);
    if (!item && d.surface) {
      const tiles = wcall('footprint', o.type, o.x, o.y, o.rot) || [];
      for (const t of tiles) { item = wcall('itemAt', t.x, t.y); if (item) break; }
    }
    if (item && item.id !== o.id && (!hasOwn || interactionsFor(item.id).length)) return { kind: 'object', id: item.id, x: item.x, y: item.y, item: true };
    return p;
  }
  // interactions of an object for the selected character, cached briefly (hover runs ~10×/s)
  function interactionsFor(objId) {
    const sim = selectedSim();
    if (!sim) return [];
    const key = sim.id + ':' + objId;
    const now = performance.now();
    const c = ui._interCache;
    if (c && c.key === key && now - c.t < 400) return c.list;
    const list = ecall('getInteractions', sim.id, objId) || [];
    ui._interCache = { key, t: now, list };
    return list;
  }
  function updateHover(now) {
    const lab = ui.els.hoverLabel;
    if (ui.mode !== 'live' || ui.pie || !ui.mouse.over || ui.mouse.type !== 'mouse' || ui.gesture || ui.modals.length) { lab.hidden = true; return; }
    if (now - ui.tHover < 90) return;
    ui.tHover = now;
    const p = resolveTarget(rcall('pick', ui.mouse.x, ui.mouse.y));
    let text = '', active = false;
    if (p && p.kind === 'sim') {
      const s = simById(p.id);
      if (s) { text = s.name + (s.visitor ? (s.role === 'walkby' ? ' · passando na rua' : s.role && s.role !== 'guest' ? ' · serviço' : ' · visita') : ''); active = true; }
    } else if (p && p.kind === 'object') {
      const o = objById(p.id);
      const d = objDef(o);
      if (d) {
        text = objLabel(o, d);
        active = interactionsFor(o.id).length > 0;     // LIVE-18: no pointer for objects with nothing to do
      }
    }
    const view = $('view');
    if (view) view.style.cursor = active ? 'pointer' : '';
    if (!text) { lab.hidden = true; return; }
    setText(lab, text);
    lab.classList.toggle('dim', !active);
    lab.style.left = ui.mouse.x + 'px';
    lab.style.top = (ui.mouse.y - 10) + 'px';
    lab.hidden = false;
  }
  function objLabel(o, d) {
    let t = d.name;
    if (o.broken) t += ' (com defeito)';
    else if (o.type === 'meal') t = o.spoiled ? 'Comida estragada' : (o.food === 'pizza' ? 'Pizza' : d.name) + (o.servings ? ' · ' + o.servings + (o.servings === 1 ? ' prato' : ' pratos') : '');
    else if (o.type === 'dirty_plate' && o.spoiled) t = 'Prato sujo (estragado)';
    else if (o.type === 'newspaper' && o.offer) t = d.name + ' · vaga de emprego';
    return t;
  }
  // LIVE-18: what to say when an object has nothing to do right now
  function idleTip(o, d) {
    const name = d ? d.name : 'Objeto';
    if (!o || !d) return 'Nada para fazer aqui agora.';
    const bills = (S() && Array.isArray(S().bills)) ? S().bills.length : 0;
    switch (o.type) {
      case 'mailbox': return bills ? 'Há contas, mas ninguém pode pagá-las agora.' : 'Nenhuma conta para pagar. Contas chegam a cada 3 dias.';
      case 'trash_can': return 'Lixeira: os moradores jogam fora pratos sujos e comida estragada aqui.';
      case 'counter': return 'Balcão vazio. Prepare uma refeição na geladeira: ela é montada aqui.';
      case 'table_dining': case 'table_small': return name + ': os moradores comem aqui quando há comida servida.';
      case 'end_table': return name + ': decoração. Deixa o cômodo mais agradável.';
      case 'newspaper': return 'Jornal de hoje já lido.';
      case 'carpool': return 'Carona do trabalho: espera o morador na hora do turno.';
      default:
    }
    if (d.cat === 'plants' || /^plant_/.test(o.type)) return o.dead ? name + ': a planta morreu. Venda e compre outra.' : name + ': a planta está regada' + (o.water != null ? ' (água ' + Math.round(num(o.water)) + '%)' : '') + '.';
    if (d.cat === 'decor' || d.wall) return name + ': decoração. Melhora o Ambiente do cômodo.';
    return name + ': nada para fazer agora.';
  }
  function walkPing(x, y) {
    const el = h('div', { class: 'walk-ping', style: { left: x + 'px', top: y + 'px' } });
    ui.els.hud.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
  }

  // ======================================================================
  // Cursor tip
  // ======================================================================
  /**
   * Cursor tip. Placed below-right of the pointer (above the finger on touch), kept inside the viewport and
   * clear of the camera cluster, the floating toolbar and the drawer (BB-11). While a confirmation flash is
   * up (flashTip), hover updates leave it alone unless `force` (BB-6).
   */
  function showTip(x, y, content, bad, force) {
    const tip = ui.els.tip;
    if (!tip) return;
    if (!force && performance.now() < ui.flashUntil) return;
    clear(tip);
    appendKids(tip, content);
    tip.classList.toggle('bad', !!bad);
    tip.hidden = false;
    tip.style.transform = 'none';
    const w = tip.offsetWidth || 120, hgt = tip.offsetHeight || 24;
    const vw = window.innerWidth, vh = window.innerHeight;
    const touch = ui.mouse.type !== 'mouse';
    const cands = touch
      ? [[x - w / 2, y - hgt - 46], [x + 24, y - hgt - 30], [x - w - 24, y - hgt - 30], [x - w / 2, y + 40]]
      : [[x + 14, y + 14], [x - w - 14, y + 14], [x + 14, y - hgt - 14], [x - w - 14, y - hgt - 14]];
    const avoid = [rectOf(ui.els.cam), rectOf(ui.els.toolbar), rectOf(ui.els.drawer), rectOf(ui.els.bar)].filter(Boolean);
    let best = null;
    for (const c of cands) {
      const lx = clamp(c[0], 4, Math.max(4, vw - w - 4)), ly = clamp(c[1], 4, Math.max(4, vh - hgt - 4));
      const r = { left: lx, top: ly, right: lx + w, bottom: ly + hgt };
      const hits = avoid.filter((a) => overlaps(r, a, 2)).length;
      if (!best || hits < best.hits) best = { lx, ly, hits };
      if (!hits) break;
    }
    tip.style.left = Math.round(best.lx) + 'px';
    tip.style.top = Math.round(best.ly) + 'px';
  }
  function hideTip(force) {
    if (!force && performance.now() < ui.flashUntil) return;
    if (ui.els.tip) ui.els.tip.hidden = true;
  }
  function flashTip(x, y, text, bad, ms) {
    ms = ms || 1800;
    ui.flashUntil = 0;
    showTip(x, y, text, bad, true);
    ui.flashUntil = performance.now() + ms;
    clearTimeout(ui._tipTimer);
    ui._tipTimer = setTimeout(() => { ui.flashUntil = 0; hideTip(true); }, ms);
  }
  function endFlash() { ui.flashUntil = 0; clearTimeout(ui._tipTimer); }

  // ======================================================================
  // Pie menu
  // ======================================================================
  function expandPhone(items, obj) {
    if (!obj || obj.type !== 'phone') return items;
    const book = ecall('phoneBook') || [];
    return items.map((it) => {
      if (!it.enabled || (it.key !== 'call_friend' && it.key !== 'invite') || !book.length) return it;
      const call = it.key === 'call_friend';
      const kids = [{ key: it.key, label: call ? 'Qualquer vizinho' : 'Quem estiver livre', icon: '🎲', enabled: true }];
      for (const n of book) {
        kids.push({
          key: (call ? 'call:' : 'invite:') + n.id, label: n.name, icon: call ? '☎️' : '🏠',
          enabled: call ? true : !n.onLot, reason: !call && n.onLot ? 'Já está aqui.' : '',
        });
      }
      return Object.assign({}, it, { label: call ? 'Ligar para…' : 'Convidar…', children: kids });
    });
  }
  const MOOD_REFUSE = 'De mau humor demais.';
  // LIVE-2/LIVE-3: job offers get a short label + sub-line in the pie; the click opens the offer card
  function decorateItem(it, sim) {
    if (!it || typeof it.key !== 'string' || it.key.indexOf('job:') !== 0) return it;
    const track = it.key.slice(4);
    const c = (D().CAREERS || {})[track];
    const lv = c && c.levels && c.levels[0];
    if (!lv) return it;
    return Object.assign({}, it, {
      label: (sim && sim.career ? 'Trocar de emprego: ' : 'Vaga: ') + lv.title,
      sub: c.name + ' · ' + fmtMoney(lv.pay) + '/dia · ' + hourStr(lv.start) + '–' + hourStr(lv.end),
      job: track,
    });
  }
  function openPie(cx, cy, target) {
    closePie();
    const sim = selectedSim();
    if (!sim) { flashTip(cx, cy, 'Selecione um morador primeiro.', true); return; }
    if (target && target.kind === 'sim' && target.id === sim.id) { openSelfPie(cx, cy, sim); return; }
    if (sim.hidden) { flashTip(cx, cy, firstName(sim) + (sim.atWork ? ' está no trabalho.' : ' não está em casa.'), true); return; }
    target = resolveTarget(target);
    let items = [], title = '', targetSim = null, obj = null;
    if (target.kind === 'object') {
      obj = objById(target.id);
      if (!obj) return;
      const d = objDef(obj);
      title = d ? objLabel(obj, d) : 'Objeto';
      items = (ecall('getInteractions', sim.id, obj.id) || []).slice();
      items = expandPhone(items, obj).map((it) => decorateItem(it, sim));
    } else if (target.kind === 'sim') {
      targetSim = simById(target.id);
      if (!targetSim) return;
      title = targetSim.name;
      items = (ecall('getSocials', sim.id, targetSim.id) || []).slice();
      if (!targetSim.visitor) items.unshift({ key: '__select', label: 'Controlar ' + firstName(targetSim), icon: '👆', enabled: true });
    }
    if (!items.length) {
      flashTip(cx, cy, targetSim && targetSim.visitor && targetSim.role && targetSim.role !== 'guest' && targetSim.role !== 'walkby'
        ? targetSim.name + ' está trabalhando.' : obj ? idleTip(obj, objDef(obj)) : 'Nada para fazer aqui agora.', false);
      return;
    }
    const lowMood = items.some((it) => !it.enabled && it.reason === MOOD_REFUSE);
    ui.pie = { x: cx, y: cy, target, simId: sim.id, title, items, stack: [], obj, targetSim, openedAt: performance.now(), lowMood, actor: firstName(sim) };
    sfx('open');
    renderPie();
  }
  // Improvement: clicking the selected character opens a menu about themselves
  function openSelfPie(cx, cy, sim) {
    const q = Array.isArray(sim.queue) ? sim.queue : [];
    const cancellable = q.filter((a) => !a.nocancel && !a.cancel).length;
    const items = [
      { key: '__cancelall', label: 'Cancelar tudo', icon: '✋', enabled: cancellable > 0, reason: 'Nada na fila para cancelar.' },
      { key: '__home', label: 'Ir para dentro de casa', icon: '🏠', enabled: !sim.hidden && typeof E().homeTile === 'function', reason: 'Indisponível agora.' },
      { key: '__needs', label: 'Ver necessidades', icon: '📊', enabled: true },
    ];
    ui.pie = { x: cx, y: cy, target: { kind: 'sim', id: sim.id }, simId: sim.id, title: sim.name, items, stack: [], obj: null, targetSim: sim, openedAt: performance.now(), self: true, actor: firstName(sim) };
    sfx('open');
    renderPie();
  }
  function closePie() {
    if (!ui.pie) return;
    const el = $('pie');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    ui.pie = null;
  }
  function renderPie() {
    const p = ui.pie;
    if (!p) return;
    let root = $('pie');
    if (root) root.parentNode.removeChild(root);
    const items = p.stack.length ? p.stack[p.stack.length - 1].children : p.items;
    const sim = simById(p.simId);
    root = h('div', { id: 'pie', role: 'menu', tabindex: '-1', 'aria-label': 'Ações: ' + p.title });
    const scrim = h('div', { class: 'pie-scrim', on: { pointerdown: (e) => { e.preventDefault(); closePie(); } } });
    scrim.style.setProperty('--px', p.x + 'px');
    scrim.style.setProperty('--py', p.y + 'px');
    root.addEventListener('contextmenu', (e) => { e.preventDefault(); closePie(); });
    root.appendChild(scrim);
    const wrap = h('div', { class: 'pie-wrap' });
    root.appendChild(wrap);
    const cv = h('canvas', { width: '72', height: '72', 'aria-hidden': 'true' });
    if (sim) drawFace(cv, sim, { size: 72, mood: moodOf(sim) });
    const center = h('button', {
      class: 'pie-center' + (p.stack.length ? ' back' : ''), type: 'button',
      'aria-label': p.stack.length ? 'Voltar' : 'Fechar menu',
      title: p.stack.length ? 'Voltar' : (p.actor ? p.actor + ' — fechar' : 'Fechar'),
      on: { click: () => { if (performance.now() - p.openedAt < 300) return; if (p.stack.length) { p.stack.pop(); p.openedAt = performance.now() - 300; renderPie(); } else closePie(); } },
    }, cv);
    wrap.appendChild(center);
    // centre label: who acts → on what (improvement: the face above the title is the actor, not the target)
    const titleText = p.stack.length ? p.stack[p.stack.length - 1].label.replace('…', '') : p.title;
    const titleEl = h('div', { class: 'pie-title' }, p.self ? [titleText] : [h('span', { class: 'pie-actor', text: (p.actor || '') + ' →' }), titleText]);
    wrap.appendChild(titleEl);
    let noteEl = null;
    if (p.lowMood && !p.stack.length) {
      noteEl = h('div', { class: 'pie-note', text: '😫 De mau humor: só cuida das necessidades' });
      wrap.appendChild(noteEl);
    }
    document.body.appendChild(root);
    const nodes = [];
    items.forEach((it, i) => {
      const dis = !it.enabled;
      const moodBlock = dis && it.reason === MOOD_REFUSE;
      const why = dis && it.reason && !moodBlock ? h('span', { class: 'p-why', text: it.reason }) : null;
      const sub = it.sub ? h('span', { class: 'p-sub', text: it.sub }) : null;
      const node = h('button', {
        class: 'pie-item' + (it.children ? ' cat' : '') + (why ? ' has-why' : '') + (p.lowMood && !dis ? ' need' : '') + (moodBlock ? ' dimmed' : ''), type: 'button', role: 'menuitem',
        'aria-disabled': dis ? 'true' : 'false', title: dis ? (it.reason || 'Indisponível agora') : it.label + (it.sub ? ' — ' + it.sub : ''),
        on: { click: (e) => onPieItem(it, e) },
      }, [emo(it.icon || '•'), h('span', { class: 'p-label-wrap' }, [h('span', { class: 'p-label', text: it.label }), sub, why])]);
      node.style.animationDelay = (i * 18) + 'ms';
      wrap.appendChild(node);
      nodes.push(node);
    });
    layoutPie(wrap, nodes, titleEl, noteEl);
    try { root.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const list = nodes.concat([center]);
        const i = list.indexOf(document.activeElement);
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        list[i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length].focus();
      }
    });
  }
  function layoutPie(wrap, nodes, titleEl, noteEl) {
    const p = ui.pie;
    const n = nodes.length;
    const vw = window.innerWidth, vh = window.innerHeight;
    const gap = 6;
    const sizes = nodes.map((el) => ({ el, w: el.offsetWidth, h: el.offsetHeight }));
    for (const q of sizes) if (q.h > 44) q.el.classList.add('multi');
    const tw = titleEl ? titleEl.offsetWidth : 90;
    const nw = noteEl ? noteEl.offsetWidth : 0;
    // VIS-9: in column layouts the title sits ABOVE the portrait and the items start at the portrait's top,
    // so the column never covers the title
    const column = (list, side) => {
      let y = -38;
      return list.map((q) => { const r = { el: q.el, x: side > 0 ? 46 : -46 - q.w, y, w: q.w, h: q.h }; y += q.h + gap; return r; });
    };
    const ring = () => {
      const R = n <= 2 ? 66 : n <= 4 ? 76 : 92;
      const rects = sizes.map((q, i) => {
        const a = (i / n) * Math.PI * 2;
        const sx = Math.sin(a), cy = -Math.cos(a);
        const ax = sx * R, ay = cy * R;
        let x;
        if (sx > 0.3) x = ax; else if (sx < -0.3) x = ax - q.w; else x = ax - q.w / 2;
        let y = ay - q.h / 2;
        if (cy < -0.85) y = ay - q.h + 8; else if (cy > 0.85) y = ay - 8;
        return { el: q.el, x, y, w: q.w, h: q.h, dx: sx, dy: cy };
      });
      // resolve overlaps (with each other and with the centre portrait + title) by pushing items outward
      const fixed = [{ x: -38, y: -38, w: 76, h: 76 }, { x: -tw / 2, y: 42, w: tw, h: 22 }];
      if (noteEl) fixed.push({ x: -nw / 2, y: 68, w: nw, h: 20 });
      const hit = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;
      for (let iter = 0; iter < 80; iter++) {
        let moved = false;
        for (let i = 0; i < rects.length; i++) {
          const a = rects[i];
          for (const f of fixed) if (hit(a, f)) { a.x += (a.dx || 0) * 4; a.y += (a.dy || 0) * 4 + (a.dy > 0.3 ? 2 : 0); moved = true; }
          for (let j = i + 1; j < rects.length; j++) {
            const b = rects[j];
            if (hit(a, b)) { for (const r of [a, b]) { r.x += (r.dx || 0) * 4; r.y += (r.dy || 0) * 4; } moved = true; }
          }
        }
        if (!moved) break;
      }
      return rects;
    };
    const bbox = (rects, colMode) => {
      let minX = Math.min(-40, -tw / 2, -nw / 2), maxX = Math.max(40, tw / 2, nw / 2);
      let minY = colMode ? (noteEl ? -90 : -66) : -40, maxY = colMode ? 40 : (noteEl ? 90 : 66);
      for (const r of rects) { minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w); minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y + r.h); }
      return { minX, maxX, minY, maxY };
    };
    let colMode = n > 8;
    let rects = colMode ? column(sizes.slice(0, Math.ceil(n / 2)), -1).concat(column(sizes.slice(Math.ceil(n / 2)), 1)) : ring();
    let bb = bbox(rects, colMode);
    if (bb.maxX - bb.minX > vw - 16 || bb.maxY - bb.minY > vh - 16) {
      // not enough room (phones): one column on the side of the tap with more space
      const side = p.x < vw / 2 ? 1 : -1;
      colMode = true;
      rects = column(sizes, side);
      bb = bbox(rects, true);
    }
    if (titleEl) titleEl.style.top = colMode ? '-64px' : '44px';
    if (noteEl) noteEl.style.top = colMode ? '-88px' : '70px';
    const m = 8;
    let cx = p.x, cy = p.y;
    if (cx + bb.minX < m) cx = m - bb.minX;
    if (cx + bb.maxX > vw - m) cx = Math.max(m - bb.minX, vw - m - bb.maxX);
    if (cy + bb.minY < m) cy = m - bb.minY;
    if (cy + bb.maxY > vh - m) cy = Math.max(m - bb.minY, vh - m - bb.maxY);
    wrap.style.left = cx + 'px';
    wrap.style.top = cy + 'px';
    for (const r of rects) {
      r.el.style.left = Math.round(r.x) + 'px';
      r.el.style.top = Math.round(r.y) + 'px';
      r.el.style.setProperty('--dx0', Math.round(-(r.x + r.w / 2) * 0.5) + 'px');
      r.el.style.setProperty('--dy0', Math.round(-(r.y + r.h / 2) * 0.5) + 'px');
    }
  }
  function onPieItem(it, e) {
    const p = ui.pie;
    if (!p) return;
    if (performance.now() - p.openedAt < 300) return;   // stray click from the gesture that opened the menu
    if (!it.enabled) {
      sfx('error');
      const r = e.currentTarget.getBoundingClientRect();
      flashTip(r.left, r.bottom, it.reason || 'Indisponível agora.', true);
      return;
    }
    if (it.children) { p.stack.push(it); sfx('click'); renderPie(); p.openedAt = performance.now() - 200; return; }
    const simId = p.simId;
    if (it.key === '__select' && p.targetSim) { selectSim(p.targetSim.id); closePie(); return; }
    if (it.key === '__cancelall') { closePie(); cancelAll(simId); return; }
    if (it.key === '__home') {
      closePie();
      const t = ecall('homeTile', simId);
      const ok = t ? !!ecall('queueWalk', simId, t.x, t.y, { append: false }) : false;
      if (ok) { sfx('click'); ui.sig.queue = ''; refreshDock(); } else { sfx('error'); refusal('Não dá para ir para dentro de casa agora.'); }
      return;
    }
    if (it.key === '__needs') { closePie(); showNeeds(); return; }
    if (it.job && p.target.kind === 'object') {
      const objId = p.target.id;
      closePie();
      openOfferCard(offerFor(it.job, objById(objId)), simId, objId);
      return;
    }
    let ok = false;
    if (p.target.kind === 'object') ok = !!ecall('queueInteraction', simId, p.target.id, it.key, 'player');
    else ok = !!ecall('queueSocial', simId, p.target.id, it.key, 'player');
    sfx(ok ? 'click' : 'error');
    closePie();
    if (!ok) refusal('Não foi possível fazer isso agora.');      // LIVE-8: say why
    ui.sig.queue = '';
    refreshDock();
  }
  function cancelAll(simId) {
    const sim = simById(simId);
    if (!sim || !Array.isArray(sim.queue)) return;
    let n = 0;
    for (const a of sim.queue.slice().reverse()) {
      if (a.nocancel || a.cancel) continue;
      if (ecall('cancelAction', sim.id, a.id) !== false) n++;
    }
    sfx(n ? 'click' : 'error');
    ui.sig.queue = '';
    refreshDock();
  }
  function showNeeds() {
    setTab('needs');
    if (ui.narrow) toggleNeedsDrawer(true);
    const panel = ui.els.needsPanel;
    if (panel && panel.animate) { try { panel.animate([{ boxShadow: '0 0 0 3px rgba(247,197,72,.8)' }, { boxShadow: '0 0 0 0 rgba(247,197,72,0)' }], { duration: 900 }); } catch (e) { /* ignore */ } }
  }

  // ======================================================================
  // Pointer & keyboard input on the 3D view
  // ======================================================================
  function bindInput() {
    const view = $('view');
    if (!view) return;
    view.addEventListener('contextmenu', (e) => e.preventDefault());
    view.addEventListener('pointerdown', onPointerDown);
    view.addEventListener('pointermove', onPointerMove);
    view.addEventListener('pointerup', onPointerUp);
    view.addEventListener('pointercancel', onPointerCancel);
    view.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { ui.mouse.over = false; ui.els.hoverLabel.hidden = true; if (!ui.gesture) onHoverLeave(); } });
    view.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ui.mouse.over = true; });
    view.addEventListener('wheel', onWheel, { passive: false });
    // A tap opens menus/toolbars under the finger: stop the browser's compatibility mouse events + click
    // from landing on them.
    view.addEventListener('touchend', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    view.addEventListener('dblclick', onDblClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { ui.keys.clear(); ui.shift = false; });
    window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
    window.addEventListener('keydown', unlockAudio, { once: true, capture: true });
    window.addEventListener('resize', onResize);
    onResize();
  }
  function onResize() {
    const narrow = window.matchMedia ? window.matchMedia('(max-width: 760px)').matches : window.innerWidth <= 760;
    if (narrow !== ui.narrow) {
      ui.narrow = narrow;
      if (!narrow) toggleNeedsDrawer(false);
      ui.sig.checklist = '';
    }
    if (ui.pie) renderPie();
    if (ui._barApply) ui._barApply();
    if (ui.mode === 'buy' || ui.mode === 'build') reframeForDrawer();
  }

  function onWheel(e) {
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 33; else if (e.deltaMode === 2) d *= 400;
    rcall('zoom', clamp(d, -400, 400));
  }
  function onDblClick(e) {
    if (ui.mode !== 'live') return;
    const p = rcall('pick', e.clientX, e.clientY);
    if (p && p.kind === 'sim') { const s = simById(p.id); if (s && !s.visitor) { closePie(); selectSim(s.id, true); rcall('focus', s.x, s.y); } }
  }

  const TAP_TOOLS = { door: true, window: true, paper: true };
  function onPointerDown(e) {
    ui.mouse.type = e.pointerType || 'mouse';
    ui.mouse.x = e.clientX; ui.mouse.y = e.clientY;
    if (ui.modals.length) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), button: e.button, type: e.pointerType });
    // two-finger gesture: pinch zoom + pan
    if (ui.pointers.size === 2) {
      cancelBuildDrag();
      const pts = Array.from(ui.pointers.values());
      ui.gesture = { kind: 'pinch', d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
      return;
    }
    if (ui.pointers.size > 2) return;
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      ui.gesture = { kind: 'pan', x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    ui.gesture = { kind: 'press', id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    // touch: with the door / window / wallpaper tools one finger pans and a tap acts (improvement)
    if (ui.mode === 'build' && !(e.pointerType !== 'mouse' && TAP_TOOLS[ui.build.tool])) buildDown(e);
    else if (ui.mode === 'buy' && ui.buy.placing && e.pointerType !== 'mouse') updateGhostAt(e.clientX, e.clientY);
  }
  function onPointerMove(e) {
    ui.mouse.type = e.pointerType || 'mouse';
    ui.mouse.x = e.clientX; ui.mouse.y = e.clientY;
    if (e.pointerType === 'mouse') ui.mouse.over = true;
    const pt = ui.pointers.get(e.pointerId);
    const g = ui.gesture;
    if (pt) { pt.px = pt.x; pt.py = pt.y; pt.x = e.clientX; pt.y = e.clientY; }
    if (g && g.kind === 'pinch' && ui.pointers.size >= 2) {
      const pts = Array.from(ui.pointers.values());
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
      if (g.d > 0 && d > 0) rcall('zoom', clamp((g.d - d) * 3, -300, 300));
      rcall('pan', mx - g.mx, my - g.my);
      g.d = d; g.mx = mx; g.my = my;
      return;
    }
    if (g && g.kind === 'pan') {
      rcall('pan', e.clientX - g.x, e.clientY - g.y);
      g.x = e.clientX; g.y = e.clientY;
      return;
    }
    if (g && g.kind === 'press' && g.id === e.pointerId) {
      const dist = Math.hypot(e.clientX - pt.sx, e.clientY - pt.sy);
      const thresh = e.pointerType === 'mouse' ? 5 : 11;
      if (dist > thresh) g.moved = true;
      if (ui.mode === 'build' && ui.build.drag) { buildMove(e); return; }
      if (ui.mode === 'buy' && ui.buy.placing) { updateGhostAt(e.clientX, e.clientY); return; }
      // drag on empty ground pans the camera (touch, or mouse left-drag)
      if (g.moved) {
        g.kind = 'drag-pan'; g.x = e.clientX; g.y = e.clientY;
        rcall('pan', e.clientX - pt.sx, e.clientY - pt.sy);
        closePie();
      }
      return;
    }
    if (g && g.kind === 'drag-pan') {
      rcall('pan', e.clientX - g.x, e.clientY - g.y);
      g.x = e.clientX; g.y = e.clientY;
      return;
    }
    // hover (mouse, no buttons)
    if (e.pointerType === 'mouse' && !e.buttons) onHover(e.clientX, e.clientY);
  }
  function onPointerUp(e) {
    const pt = ui.pointers.get(e.pointerId);
    ui.pointers.delete(e.pointerId);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    const g = ui.gesture;
    if (!g) return;
    if (g.kind === 'pinch') { if (ui.pointers.size < 2) ui.gesture = null; return; }
    if (g.kind === 'pan' || g.kind === 'drag-pan') { ui.gesture = null; return; }
    if (g.kind === 'press' && g.id === e.pointerId) {
      ui.gesture = null;
      ui.shift = e.shiftKey;
      if (ui.mode === 'build') { buildUp(e, g.moved); return; }
      if (g.moved && !(ui.mode === 'buy' && ui.buy.placing)) return;
      if (pt && performance.now() - pt.t > 900 && ui.mode === 'live') return; // long press: ignore
      handleClick(e.clientX, e.clientY, e);
    }
  }
  function onPointerCancel(e) {
    ui.pointers.delete(e.pointerId);
    if (ui.pointers.size === 0) { ui.gesture = null; cancelBuildDrag(); }
  }
  function onHover(x, y) {
    if (ui.mode === 'buy' && ui.buy.placing) updateGhostAt(x, y);
    else if (ui.mode === 'build') buildHover(x, y);
  }
  function onHoverLeave() {
    if (ui.mode === 'build' && !ui.build.drag) { rcall('hideEdgeGhost'); if (!ui.build.sel) rcall('hideTileGhost'); hideTip(); }
    if (ui.mode === 'buy' && ui.buy.placing) { hideTip(); }
  }

  function handleClick(x, y, e) {
    if (ui.mode === 'live') return liveClick(x, y, e);
    if (ui.mode === 'buy') return buyClick(x, y, e);
  }
  function liveClick(x, y, e) {
    if (ui.pie) { closePie(); return; }
    if (ui.logOpen) { toggleLog(); return; }          // LIVE-17: a click outside the log only closes it
    if (ui.narrow && ui.els.dock.classList.contains('needs-open')) toggleNeedsDrawer(false);
    const p = rcall('pick', x, y);
    if (!p) return;
    if (p.kind === 'sim' || p.kind === 'object') { openPie(x, y, p); return; }
    if (p.kind === 'tile') {
      const sim = selectedSim();
      if (!sim) return;
      if (sim.hidden) { flashTip(x, y, firstName(sim) + (sim.atWork ? ' está no trabalho.' : ' não está em casa.'), true); return; }
      // LIVE-11: a plain click redirects the current walk; Shift+click appends another stop
      const append = !!((e && e.shiftKey) || ui.shift);
      const ok = ecall('queueWalk', sim.id, p.x, p.y, { append });
      if (ok) { walkPing(x, y); sfx('click'); ui.sig.queue = ''; } else { sfx('error'); refusal('Não dá para andar até lá.'); }
    }
  }

  // ---- keyboard
  function onKeyDown(e) {
    const k = e.key;
    if (k === 'Shift') ui.shift = true;
    if (ui.modals.length) {
      if (k === 'Escape') { e.preventDefault(); closeTopModal(); }
      else if (k === 'Tab' && !e.defaultPrevented) trapTab(e);
      return;
    }
    if (isTyping(e.target)) return;
    // CONTRACT_V2 §2: Ctrl+Z / Cmd+Z undoes the last Buy/Build action of this session
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === 'z' || k === 'Z') && !e.shiftKey) {
      if (ui.mode === 'buy' || ui.mode === 'build') { e.preventDefault(); undo(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // LIVE-9: the welcome card takes Space / Enter / Esc (closing it), never the game shortcuts underneath
    const helpEl = $('help-card');
    if (helpEl && !helpEl.hidden && (k === 'Escape' || k === ' ' || k === 'Enter' || k === 'Spacebar')) { e.preventDefault(); hideHelp(); return; }
    const lower = k.length === 1 ? k.toLowerCase() : k;
    switch (lower) {
      case ' ': case 'p':
        e.preventDefault(); mcall('togglePause'); sfx('click'); refreshClock(); return;
      case '1': case '2': case '3':
        mcall('setSpeed', +lower); sfx('click'); refreshClock(); return;
      case '0':
        mcall('setSpeed', 0); refreshClock(); return;
      case 'q': rcall('rotate', -1); return;
      case 'e': rcall('rotate', 1); return;
      case 'r':
        if (ui.mode === 'buy' && ui.buy.placing) { rotatePlacing(); e.preventDefault(); }
        return;
      case '+': case '=': rcall('zoom', -240); return;
      case '-': case '_': rcall('zoom', 240); return;
      case 'h': case '?': showHelp(); return;
      case 'Escape':
        e.preventDefault(); escape(); return;
      case 'Delete': case 'Backspace':
        // BB-9: same in Buy and Build; the first press arms the confirmation, the second one sells
        if ((ui.mode === 'buy' && ui.buy.sel != null) || (ui.mode === 'build' && ui.build.sel != null)) { e.preventDefault(); sellSelected(false); }
        return;
      case 'w': case 'a': case 's': case 'd': case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
        ui.keys.add(lower); if (lower.indexOf('Arrow') === 0) e.preventDefault(); return;
      default:
    }
  }
  function onKeyUp(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Shift') ui.shift = false;
    ui.keys.delete(k);
  }
  function escape() {
    if (ui.pie) { if (ui.pie.stack.length) { ui.pie.stack.pop(); renderPie(); } else closePie(); return; }
    if (ui.logOpen) { toggleLog(); return; }
    if (ui.mode === 'buy') {
      if (ui.buy.placing) { stopPlacing(); return; }
      if (ui.buy.sel != null) { deselectObject(); return; }
      setMode('live'); return;
    }
    if (ui.mode === 'build') {
      if (ui.build.drag) { cancelBuildDrag(); return; }
      if (ui.build.sel != null) { ui.build.sel = null; ui.build.confirm = false; rcall('hideTileGhost'); renderToolbar(); return; }
      setMode('live'); return;
    }
    if (ui.narrow && ui.els.dock.classList.contains('needs-open')) toggleNeedsDrawer(false);
  }
  function keyboardPan(dt) {
    if (!ui.keys.size) return;
    const sp = 700 * Math.min(dt, 0.05);
    let dx = 0, dy = 0;
    if (ui.keys.has('w') || ui.keys.has('ArrowUp')) dy += sp;
    if (ui.keys.has('s') || ui.keys.has('ArrowDown')) dy -= sp;
    if (ui.keys.has('a') || ui.keys.has('ArrowLeft')) dx += sp;
    if (ui.keys.has('d') || ui.keys.has('ArrowRight')) dx -= sp;
    if (dx || dy) rcall('pan', dx, dy);
  }

  // ======================================================================
  // Wall mode
  // ======================================================================
  const WALL_MODES = ['cutaway', 'up', 'down'];
  const WALL_LABELS = { up: 'Paredes altas', cutaway: 'Paredes recortadas', down: 'Paredes baixas' };
  function setWallMode(mode) {
    if (WALL_MODES.indexOf(mode) < 0) mode = 'cutaway';
    const st = S();
    if (st && st.settings) st.settings.wallMode = mode;
    rcall('setWallMode', mode);
    refreshWallBtn();
  }
  function cycleWallMode() {
    const st = S();
    const cur = (st && st.settings && st.settings.wallMode) || 'cutaway';
    const order = ['up', 'cutaway', 'down'];
    setWallMode(order[(order.indexOf(cur) + 1) % order.length]);
    sfx('click');
    toast(WALL_LABELS[(S().settings || {}).wallMode] || '', 'info', { icon: '🧱', timeout: 1600 });
  }
  function refreshWallBtn() {
    const st = S();
    const cur = (st && st.settings && st.settings.wallMode) || 'cutaway';
    const lab = { up: 'Altas', cutaway: 'Recortadas', down: 'Baixas' }[cur] || 'Recortadas';
    const b = ui.els.wallBtn;
    if (!b) return;
    setText(b.querySelector('.wb-label'), 'Paredes: ' + lab);
    b.title = WALL_LABELS[cur] + ' — clique para trocar';
    b.setAttribute('aria-label', WALL_LABELS[cur] + '. Trocar modo das paredes');
  }

  // ======================================================================
  // Buy mode
  // ======================================================================
  // VIS-11: short category names that fit the chip grid (full names stay in the tooltip)
  const CAT_SHORT = { surfaces: 'Mesas', appliances: 'Cozinha', plumbing: 'Banheiro', electronics: 'Eletrônicos', lighting: 'Luzes' };
  function normText(t) {
    t = String(t == null ? '' : t).toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ignore */ }
    return t.trim();
  }
  function catLabel(key) { const c = (D().CATEGORIES || []).find((q) => q.key === key); return c ? c.label : ''; }
  function catalogItems(cat) {
    const list = Array.isArray(D().CATALOG_LIST) ? D().CATALOG_LIST : Object.values(D().CATALOG || {});
    const q = normText(ui.catQuery);
    const money = moneyNow();
    let out = list.filter((d) => d && d.buyable !== false && d.cat !== 'system' && (q || cat === 'all' || d.cat === cat));
    if (q) out = out.filter((d) => normText(d.name + ' ' + (d.desc || '') + ' ' + catLabel(d.cat) + ' ' + (CAT_SHORT[d.cat] || '')).indexOf(q) >= 0);
    if (ui.catAfford) out = out.filter((d) => num(d.price) <= money);
    const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');
    out.sort(ui.catSort === 'name' ? byName : (a, b) => num(a.price) - num(b.price) || byName(a, b));
    return out;
  }
  function undoButton() {
    return h('button', { class: 'btn small undo-btn', type: 'button', title: 'Desfazer (Ctrl+Z)', 'aria-label': 'Desfazer a última ação', disabled: !ui.undo.length, on: { click: () => undo() } }, [emo('↩'), 'Desfazer']);
  }
  function buildBuyDrawer() {
    const dr = ui.els.drawer;
    clear(dr);
    dr.setAttribute('aria-label', 'Catálogo de compras');
    const cats = [{ key: 'all', label: 'Tudo', icon: '✨' }].concat(D().CATEGORIES || []);
    if (!cats.some((c) => c.key === ui.buy.cat)) ui.buy.cat = 'all';
    const catWrap = h('div', { class: 'cats', role: 'group', 'aria-label': 'Categorias' });
    for (const c of cats) {
      catWrap.appendChild(h('button', {
        class: 'cat-btn', type: 'button', 'aria-pressed': c.key === ui.buy.cat && !ui.catQuery ? 'true' : 'false', title: c.label, 'aria-label': c.label,
        on: { click: () => { ui.buy.cat = c.key; prefs.buyCat = c.key; savePrefs(); ui.catQuery = ''; sfx('click'); buildBuyDrawer(); } },
      }, [emo(c.icon || '•'), h('span', { class: 'c-label', text: CAT_SHORT[c.key] || c.label })]));
    }
    // improvement: search, sort and an "only what I can afford" filter
    const search = h('input', { class: 'cat-search', type: 'search', id: 'cat-search', placeholder: 'Buscar no catálogo…', 'aria-label': 'Buscar no catálogo', autocomplete: 'off', value: ui.catQuery });
    search.addEventListener('input', () => {
      ui.catQuery = search.value;
      for (const b of catWrap.children) b.setAttribute('aria-pressed', !ui.catQuery && b.title === (cats.find((c) => c.key === ui.buy.cat) || {}).label ? 'true' : 'false');
      fillCatalog();
    });
    search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (search.value) { search.value = ''; ui.catQuery = ''; fillCatalog(); } else search.blur(); } });
    const sortSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Ordenar' });
    for (const [k, lab] of [['price', 'Preço'], ['name', 'Nome']]) {
      sortSeg.appendChild(h('button', { type: 'button', id: 'cat-sort-' + k, 'aria-pressed': ui.catSort === k ? 'true' : 'false', text: lab, on: { click: (e) => { ui.catSort = k; for (const c of sortSeg.children) c.setAttribute('aria-pressed', c === e.currentTarget ? 'true' : 'false'); fillCatalog(); } } }));
    }
    const afford = h('input', { type: 'checkbox', id: 'cat-afford', checked: ui.catAfford });
    afford.addEventListener('change', () => { ui.catAfford = afford.checked; fillCatalog(); });
    const tools = h('div', { class: 'cat-tools' }, [search, sortSeg, h('label', { class: 'chk', for: 'cat-afford' }, [afford, 'Só o que dá pra comprar'])]);
    ui.els.catalog = h('div', { class: 'catalog', role: 'list' });
    ui.els.detail = h('div', { class: 'detail', 'aria-live': 'polite' });
    dr.appendChild(h('button', { class: 'drawer-grip', type: 'button', 'aria-label': 'Recolher ou expandir catálogo', on: { click: () => collapseDrawer() } }));
    dr.appendChild(h('div', { class: 'drawer-head' }, [h('h2', { text: 'Comprar' }), h('div', { class: 'dh-right' }, [undoButton(), h('span', { class: 'paused-pill', text: 'Tempo pausado' })])]));
    dr.appendChild(catWrap);
    dr.appendChild(tools);
    dr.appendChild(ui.els.catalog);
    dr.appendChild(ui.els.detail);
    fillCatalog();
    showDetail(ui.buy.placing ? (D().CATALOG || {})[ui.buy.placing.type] : null);
  }
  function fillCatalog() {
    const grid = ui.els.catalog;
    if (!grid) return;
    clear(grid);
    const items = catalogItems(ui.buy.cat);
    const money = moneyNow();
    const ICO = D().MOTIVE_ICONS || {};
    for (const d of items) {
      const chips = h('div', { class: 'chips' });
      const R = d.ratings || {};
      for (const k in R) if (num(R[k]) > 0) chips.appendChild(h('span', { class: 'chip', title: (D().MOTIVE_LABELS || {})[k] + ' ' + R[k], text: (ICO[k] || k) + ' ' + R[k] }));
      for (const sk of (Array.isArray(d.skills) ? d.skills : [])) {
        chips.appendChild(h('span', { class: 'chip skill', title: (D().SKILL_LABELS || {})[sk] || sk, text: ((D().SKILL_ICONS || {})[sk] || '🎓') + ' ' + ((D().SKILL_LABELS || {})[sk] || sk) }));
      }
      const thumb = h('div', { class: 'card-thumb', 'aria-hidden': 'true' });
      setThumb(thumb, d);
      const card = h('button', {
        class: 'card' + (num(d.price) > money ? ' poor' : ''), type: 'button', role: 'listitem',
        'aria-pressed': ui.buy.placing && ui.buy.placing.type === d.type && ui.buy.placing.moveId == null ? 'true' : 'false',
        'aria-label': d.name + ', ' + fmtMoney(d.price), 'data-type': d.type,
        on: {
          click: () => { sfx('click'); startPlacing(d.type); if (ui.narrow) collapseDrawer(true); },
          mouseenter: () => showDetail(d),
          focus: () => showDetail(d),
        },
      }, [thumb, h('div', { class: 'card-name', text: d.name }), h('div', { class: 'card-price', text: fmtMoney(d.price) }), chips]);
      grid.appendChild(card);
    }
    if (!items.length) grid.appendChild(h('p', { class: 'empty-note', text: ui.catQuery ? 'Nada encontrado para “' + ui.catQuery.trim() + '”.' : ui.catAfford ? 'Nada nesta categoria cabe no orçamento agora.' : 'Nada nesta categoria.' }));
    pumpThumbs();
  }
  function collapseDrawer(force) {
    const dr = ui.els.drawer;
    const on = typeof force === 'boolean' ? force : !dr.classList.contains('collapsed');
    dr.classList.toggle('collapsed', on);
    ui.els.hud.classList.toggle('drawer-collapsed', on);
    // no camera move here: collapsing happens right before the player aims at the lot. The framing insets do
    // follow the sheet, so focus() calls ("Ver" on a toast, centring) use the area the sheet really covers.
    if (ui.mode === 'buy' || ui.mode === 'build') {
      requestAnimationFrame(() => {
        if (!(ui.mode === 'buy' || ui.mode === 'build') || dr.hidden) return;
        const r = dr.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        if (!(r.width > 0) || r.left >= vw * 0.2) return;         // bottom sheet (phones) only
        rcall('setViewInsets', { top: 60, right: 56, bottom: Math.max(0, vh - r.top), left: 0 });
      });
    }
  }
  function showDetail(d) {
    const el = ui.els.detail;
    if (!el) return;
    clear(el);
    if (!d) {
      el.appendChild(h('p', { class: 'muted', text: 'Passe o mouse sobre um item para ver os detalhes. Clique para posicionar, R para girar, Esc para cancelar, Ctrl+Z desfaz.' }));
      return;
    }
    const R = d.ratings || {};
    const LAB = D().MOTIVE_LABELS || {};
    const parts = [];
    for (const k in R) if (num(R[k]) > 0) parts.push((LAB[k] || k) + ' ' + R[k]);
    el.appendChild(h('h3', { text: d.name }));
    if (d.desc) el.appendChild(h('p', { text: d.desc }));
    el.appendChild(h('div', { class: 'd-meta' }, [
      h('span', { text: fmtMoney(d.price) }),
      h('span', { text: 'Tamanho ' + num(d.w, 1) + '×' + num(d.h, 1) }),
      parts.length ? h('span', { text: parts.join(' · ') }) : null,
      d.wall ? h('span', { text: 'Vai na parede' }) : null,
    ]));
  }

  // ---- catalog thumbnails rendered from the real 3D models (falls back to emoji). Pre-rendered in idle time
  // after boot so the grid opens with pictures (improvement).
  const thumbQ = [];
  let thumbR = null, thumbBusy = false, thumbFailed = false;
  function setThumb(el, d) {
    const cached = ui.thumbs[d.type];
    if (cached && cached !== 'fail') { el.appendChild(h('img', { src: cached, alt: '' })); return; }
    el.textContent = TYPE_EMOJI[d.type] || ((D().CATEGORIES || []).find((c) => c.key === d.cat) || {}).icon || '📦';
    if (cached !== 'fail' && !thumbFailed && canThumb()) thumbQ.push({ el, d });
  }
  function canThumb() { return !!(window.THREE && M.models && typeof M.models.build === 'function'); }
  function pumpThumbs() {
    if (thumbBusy || !thumbQ.length) return;
    thumbBusy = true;
    const step = () => {
      const job = thumbQ.shift();
      if (!job) { thumbBusy = false; return; }
      if (job.el.isConnected) {
        let url = ui.thumbs[job.d.type];
        if (!url) { url = renderThumb(job.d) || 'fail'; ui.thumbs[job.d.type] = url; }
        if (url !== 'fail') { job.el.textContent = ''; job.el.appendChild(h('img', { src: url, alt: '' })); }
      }
      setTimeout(step, 16);
    };
    setTimeout(step, 30);
  }
  function prerenderThumbs() {
    if (ui._thumbsIdle || !canThumb()) return;
    ui._thumbsIdle = true;
    const list = (Array.isArray(D().CATALOG_LIST) ? D().CATALOG_LIST : Object.values(D().CATALOG || {})).filter((d) => d && d.buyable !== false && d.cat !== 'system');
    let i = 0;
    const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn, { timeout: 1500 }) : (fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 120);
    const work = (deadline) => {
      if (thumbFailed) return;
      let n = 0;
      while (i < list.length && (n === 0 || (deadline && deadline.timeRemaining && deadline.timeRemaining() > 6))) {
        const d = list[i++];
        if (!ui.thumbs[d.type]) ui.thumbs[d.type] = renderThumb(d) || 'fail';
        n++;
      }
      if (i < list.length) idle(work);
    };
    idle(work);
  }
  function renderThumb(d) {
    const T = window.THREE;
    if (!T || thumbFailed) return null;
    try {
      if (!thumbR) {
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(160, 120, false);
        renderer.setClearColor(0x000000, 0);
        if ('outputEncoding' in renderer && T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
        const scene = new T.Scene();
        scene.add(new T.HemisphereLight(0xffffff, 0x445566, 0.9));
        const sun = new T.DirectionalLight(0xffffff, 0.8);
        sun.position.set(3, 6, 4);
        scene.add(sun);
        const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        thumbR = { renderer, scene, cam };
      }
      const obj = M.models.build(d.model || d.type, { type: d.type, def: d, obj: { type: d.type, rot: 0, on: true } });
      if (!obj) return null;
      const holder = new T.Group();
      holder.add(obj);
      thumbR.scene.add(holder);
      const box = new T.Box3().setFromObject(holder);
      const size = new T.Vector3(), center = new T.Vector3();
      box.getSize(size); box.getCenter(center);
      const radius = Math.max(0.3, size.length() / 2);
      const cam = thumbR.cam;
      const aspect = 160 / 120;
      cam.left = -radius * aspect; cam.right = radius * aspect; cam.top = radius; cam.bottom = -radius;
      cam.near = 0.01; cam.far = radius * 20;
      const dir = new T.Vector3(1, 0.85, 1.25).normalize();
      cam.position.copy(center).addScaledVector(dir, radius * 6);
      cam.lookAt(center);
      cam.updateProjectionMatrix();
      thumbR.renderer.render(thumbR.scene, cam);
      const url = thumbR.renderer.domElement.toDataURL('image/png');
      // M.models caches and shares geometries/materials with the main scene: never dispose them here.
      holder.remove(obj);
      thumbR.scene.remove(holder);
      return url;
    } catch (e) {
      warnOnce('thumb', e);
      thumbFailed = true;
      return null;
    }
  }

  // ---- undo (CONTRACT_V2 §2): a snapshot is taken before every Buy/Build change of this session
  function snapshot() { return typeof E().snapshotBuild === 'function' ? ecall('snapshotBuild') : null; }
  function pushUndo(snap) {
    if (!snap) return;
    ui.undo.push(snap);
    if (ui.undo.length > 20) ui.undo.shift();
    refreshUndoBtn();
  }
  function refreshUndoBtn() {
    const dr = ui.els.drawer;
    if (!dr) return;
    for (const b of dr.querySelectorAll('.undo-btn')) b.disabled = !ui.undo.length;
    const tb = ui.els.toolbar;
    if (tb) for (const b of tb.querySelectorAll('.undo-btn')) b.disabled = !ui.undo.length;
  }
  function undo() {
    if (!(ui.mode === 'buy' || ui.mode === 'build')) return;
    if (!ui.undo.length) { sfx('error'); flashTip(ui.mouse.x > 0 ? ui.mouse.x : window.innerWidth / 2, ui.mouse.y > 0 ? ui.mouse.y : window.innerHeight / 2, 'Nada para desfazer.', false); return; }
    const snap = ui.undo.pop();
    stopPlacing();
    deselectObject();
    cancelBuildDrag();
    if (ui.build.sel != null) { ui.build.sel = null; ui.build.confirm = false; rcall('hideTileGhost'); }
    const r = ecall('restoreBuild', snap);
    if (r && r.ok === false) { sfx('error'); toast(r.reason || 'Não foi possível desfazer.', 'bad'); }
    else { sfx('click'); toast('Desfeito.', 'info', { icon: '↩️', timeout: 1800 }); }
    refreshUndoBtn();
    renderToolbar(true);
    buildBuyDrawerMoneyState();
    refreshChecklist();
  }

  // ---- placing
  function startPlacing(type, moveId, rotOverride) {
    const d = (D().CATALOG || {})[type];
    if (!d) return;
    const prev = ui.buy.placing;
    if (prev && prev.moveId != null && prev.moveId !== moveId) rcall('hideObject', prev.moveId, false);
    deselectObject();
    const keepRot = prev ? prev.rot : (ui.buy.lastRot || 0);
    let rot = rotOverride != null ? num(rotOverride) % 4 : keepRot;
    let tx = prev ? prev.tx : null, ty = prev ? prev.ty : null;
    if (moveId != null) {
      const o = objById(moveId);
      if (o) {
        rot = num(o.rot) % 4;
        const sz = wcall('rotatedSize', o.type, o.rot) || { w: 1, h: 1 };
        tx = num(o.x) + Math.floor((num(sz.w, 1) - 1) / 2); ty = num(o.y) + Math.floor((num(sz.h, 1) - 1) / 2);
      }
      rcall('hideObject', moveId, true);            // CONTRACT_V2 §4: hide the original while it moves
    }
    ui.buy.placing = { type, rot, moveId: moveId == null ? null : moveId, x: null, y: null, tx, ty, ok: false, reason: '' };
    updateWallOverride();
    markCards();
    showDetail(d);
    renderToolbar();
    if (ui.mouse.over && ui.mouse.type === 'mouse') updateGhostAt(ui.mouse.x, ui.mouse.y);
    else if (tx != null && moveId != null) placeAtTile(tx, ty, true);
    else placeGhostAtCenter();
  }
  function placeGhostAtCenter() {
    const p = ui.buy.placing;
    if (!p) return;
    const view = $('view');
    const r = view ? view.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    let x = r.left + r.width * (ui.narrow ? 0.5 : 0.42), y = ui.narrow ? r.top + r.height * 0.3 : r.top + r.height * 0.45;
    const dr = rectOf(ui.els.drawer);
    if (dr && ui.narrow) y = Math.min(y, dr.top * 0.55);
    else if (dr) x = Math.min(x, dr.left * 0.5);
    updateGhostAt(x, y, true);
  }
  function stopPlacing() {
    if (!ui.buy.placing) return;
    const mv = ui.buy.placing.moveId;
    ui.buy.lastRot = ui.buy.placing.rot;
    ui.buy.placing = null;
    if (mv != null) rcall('hideObject', mv, false);
    rcall('hideGhost');
    if (ui.buy.sel == null) rcall('hideTileGhost');
    hideTip(true);
    updateWallOverride();
    markCards();
    renderToolbar();
  }
  function markCards() {
    const dr = ui.els.drawer;
    if (!dr) return;
    for (const c of dr.querySelectorAll('.card')) {
      const on = !!(ui.buy.placing && ui.buy.placing.moveId == null && ui.buy.placing.type === c.getAttribute('data-type'));
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  // improvement: rotation pivots around the cursor tile (the footprint is re-anchored on it)
  function rotatePlacing() {
    const p = ui.buy.placing;
    if (!p) return;
    p.rot = (p.rot + 1) % 4;
    sfx('click');
    if (p.tx != null) placeAtTile(p.tx, p.ty, ui.mouse.type !== 'mouse');
  }
  function lotSize() {
    const st = S();
    return st && st.lot ? { w: num(st.lot.w, 24), h: num(st.lot.h, 20) } : { w: 24, h: 20 };
  }
  function updateGhostAt(cx, cy, quietTip) {
    const p = ui.buy.placing;
    if (!p) return;
    const t = rcall('pickTile', cx, cy);
    if (!t) { rcall('hideGhost'); rcall('hideTileGhost'); p.x = null; hideTip(); return; }
    ui._tipAt = { x: cx, y: cy };
    placeAtTile(Math.round(t.x), Math.round(t.y), quietTip);
  }
  function placeAtTile(tx, ty, quietTip) {
    const p = ui.buy.placing;
    if (!p) return;
    p.tx = tx; p.ty = ty;
    const size = wcall('rotatedSize', p.type, p.rot) || { w: 1, h: 1 };
    const L = lotSize();
    p.x = clamp(tx - Math.floor((size.w - 1) / 2), 0, Math.max(0, L.w - size.w));
    p.y = clamp(ty - Math.floor((size.h - 1) / 2), 0, Math.max(0, L.h - size.h));
    const at = ui._tipAt || { x: ui.mouse.x, y: ui.mouse.y };
    validateAndShow(p, at.x, at.y, quietTip);
  }
  // placement preview extras (CONTRACT_V2 §2): predicted Ambiente change and non-blocking warnings
  function placementExtras(p) {
    const key = [p.type, p.x, p.y, p.rot, p.moveId, (M.world && M.world.version) || 0].join('|');
    if (ui._plx && ui._plx.key === key) return ui._plx;
    const amb = wcall('roomScoreWith', p.type, p.x, p.y, p.rot, p.moveId == null ? undefined : p.moveId);
    const warns = wcall('placementWarnings', p.type, p.x, p.y, p.rot, p.moveId == null ? undefined : p.moveId);
    ui._plx = { key, amb, warns: Array.isArray(warns) ? warns : [] };
    return ui._plx;
  }
  function ambLine(r, where) {
    if (!r || r.delta == null) return null;
    const dlt = Math.round(num(r.delta));
    if (!dlt) return null;
    return h('span', { class: 'tip-line' }, ['Ambiente ', h('span', { class: dlt > 0 ? 'amb-pos' : 'amb-neg', text: (dlt > 0 ? '+' : '−') + Math.abs(dlt) }), ' ' + (where || (r.indoor === false ? 'aqui fora' : 'neste cômodo'))]);
  }
  function warnLine(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return h('span', { class: 'tip-warn', text: '⚠ ' + list.slice(0, 2).join(' · ') });
  }
  function validateAndShow(p, cx, cy, quietTip) {
    const d = (D().CATALOG || {})[p.type];
    if (!d) return;
    let res = wcall('canPlace', p.type, p.x, p.y, p.rot, p.moveId) || { ok: false, reason: 'Posição inválida.' };
    // wall-mounted items turn to face away from the nearest wall automatically
    if (!res.ok && d.wall && (res.code === 'needWall' || res.code === 'wallTaken')) {
      for (let k = 1; k < 4; k++) {
        const r2 = (p.rot + k) % 4;
        const s2 = wcall('rotatedSize', p.type, r2) || { w: 1, h: 1 };
        const L = lotSize();
        const x2 = clamp(p.x, 0, L.w - s2.w), y2 = clamp(p.y, 0, L.h - s2.h);
        const t2 = wcall('canPlace', p.type, x2, y2, r2, p.moveId);
        if (t2 && t2.ok) { p.rot = r2; p.x = x2; p.y = y2; res = t2; break; }
      }
    }
    let ok = !!res.ok, reason = res.reason || '';
    if (ok && p.moveId == null && num(d.price) > moneyNow()) { ok = false; reason = 'Dinheiro insuficiente.'; }
    p.ok = ok; p.reason = reason;
    rcall('showGhost', p.type, p.x, p.y, p.rot, ok);
    // touch: a bold footprint cursor under the ghost (improvement / BB-11)
    if (ui.mouse.type !== 'mouse') rcall('showTileGhost', wcall('footprint', p.type, p.x, p.y, p.rot) || [{ x: p.x, y: p.y }], ok);
    if (!quietTip && cx >= 0) {
      const touch = ui.mouse.type !== 'mouse';
      if (ok) {
        const ex = placementExtras(p);
        const head = p.moveId != null ? (touch ? 'Toque em “Colocar aqui”' : 'Clique para mover para cá')
          : [h('span', { class: 'money-neg', text: fmtMoney(d.price) }), touch ? ' · toque em “Comprar aqui”' : ' · clique para comprar'];
        showTip(cx, cy, [head, ambLine(ex.amb), warnLine(ex.warns)]);
      } else showTip(cx, cy, reason || 'Não cabe aqui.', true);
    }
    renderToolbar();
  }
  function commitPlacement(fromToolbar) {
    const p = ui.buy.placing;
    if (!p || p.x == null) { if (p) flashTip(ui.mouse.x, ui.mouse.y, isCoarse() ? 'Toque no terreno para escolher o lugar.' : 'Clique no terreno para escolher o lugar.', true); return; }
    if (!p.ok) { sfx('error'); flashTip(ui.mouse.x, ui.mouse.y, p.reason || 'Não cabe aqui.', true); return; }
    const snap = snapshot();
    let r;
    if (p.moveId != null) r = ecall('moveObject', p.moveId, p.x, p.y, p.rot);
    else r = ecall('buyObject', p.type, p.x, p.y, p.rot);
    if (r && r.ok) {
      pushUndo(snap);
      sfx('place');
      const keep = p.moveId == null && ui.shift && !fromToolbar;
      ui._plx = null;
      if (keep) { validateAndShow(p, ui.mouse.x, ui.mouse.y); }
      else {
        stopPlacing();
        if (ui.narrow) collapseDrawer(false);
      }
      buildBuyDrawerMoneyState();
      refreshChecklist();
    } else {
      sfx('error');
      flashTip(ui.mouse.x, ui.mouse.y, (r && r.reason) || engineReason() || 'Não foi possível.', true);
    }
  }
  function buildBuyDrawerMoneyState() {
    const money = moneyNow();
    const dr = ui.els.drawer;
    if (!dr || ui.mode !== 'buy') return;
    if (ui.catAfford) { fillCatalog(); return; }
    for (const c of dr.querySelectorAll('.card')) {
      const d = (D().CATALOG || {})[c.getAttribute('data-type')];
      if (d) c.classList.toggle('poor', num(d.price) > money);
    }
  }
  // CR-10: system objects (puddles, plates, meals, newspaper, carpool) cannot be picked up in Buy mode;
  // the mailbox can only be moved
  function isSystemObj(o) {
    const d = objDef(o);
    return !!(d && (d.buyable === false || d.cat === 'system'));
  }
  function systemTip(o) {
    const d = objDef(o) || {};
    switch (o && o.type) {
      case 'puddle': return 'Poça: mande alguém limpar no modo Viver (ou chame a faxineira).';
      case 'dirty_plate': return 'Prato sujo: recolha no modo Viver.';
      case 'meal': return o.spoiled ? 'Comida estragada: jogue fora no modo Viver.' : 'Refeição: os moradores comem no modo Viver.';
      case 'newspaper': return 'Jornal: leia ou jogue fora no modo Viver.';
      case 'carpool': return 'A carona do trabalho não pode ser mexida.';
      default: return 'Este objeto não pode ser vendido.';
    }
  }
  function buyClick(x, y, e) {
    if (ui.buy.placing) {
      if (e && e.pointerType && e.pointerType !== 'mouse') { ui._tipAt = { x, y }; updateGhostAt(x, y); return; }
      updateGhostAt(x, y, true);
      commitPlacement(false);
      return;
    }
    let p = rcall('pick', x, y);
    // a click on the floor inside an object's footprint (beside a slim model: toilet, lamp, chair) selects it
    if (p && p.kind === 'tile' && !p.wall && p.x != null) {
      const o2 = wcall('objectAt', p.x, p.y);
      const d2 = o2 ? objDef(o2) : null;
      if (o2 && o2.id != null && d2 && !d2.wall && !isSystemObj(o2)) p = { kind: 'object', id: o2.id, x: p.x, y: p.y };
    }
    if (p && p.kind === 'object') {
      const o = objById(p.id);
      if (o && isSystemObj(o) && o.type !== 'mailbox') { sfx('error'); deselectObject(); flashTip(x, y, systemTip(o), false, 2600); return; }
      selectObject(p.id);
    } else deselectObject();
  }
  function selectObject(id) {
    const o = objById(id);
    if (!o) return;
    ui.buy.sel = id;
    ui.buy.confirm = false;
    const tiles = wcall('footprint', o.type, o.x, o.y, o.rot) || [{ x: o.x, y: o.y }];
    rcall('showTileGhost', tiles, true);
    sfx('click');
    updateWallOverride();
    renderToolbar();
  }
  function deselectObject() {
    if (ui.buy.sel == null) return;
    ui.buy.sel = null;
    ui.buy.confirm = false;
    rcall('hideTileGhost');
    updateWallOverride();
    renderToolbar();
  }
  function sellSelected(direct) {
    const id = ui.mode === 'build' ? ui.build.sel : ui.buy.sel;
    const o = objById(id);
    if (!o) return;
    if (o.type === 'mailbox' || o.type === 'carpool' || isSystemObj(o)) { sfx('error'); toast(o.type === 'mailbox' ? 'A caixa de correio não pode ser vendida (só movida).' : systemTip(o), 'bad'); return; }
    const name = (objDef(o) || {}).name || 'Objeto';
    if (!direct && !(ui.mode === 'build' ? ui.build.confirm : ui.buy.confirm)) {
      if (ui.mode === 'build') ui.build.confirm = true; else ui.buy.confirm = true;
      renderToolbar();
      return;
    }
    const snap = snapshot();
    const r = ecall('sellObject', id);
    if (r && r.ok) {
      pushUndo(snap);
      sfx('coin');
      toast((r.refund ? 'Venda: ' + name + ' por ' + fmtMoney(r.refund) : 'Removido: ' + name) + '.', 'money', { timeout: 3000 });
    } else {
      sfx('error');
      toast((r && r.reason) || engineReason() || 'Não foi possível vender.', 'bad');
    }
    if (ui.mode === 'build') { ui.build.sel = null; ui.build.confirm = false; rcall('hideTileGhost'); renderToolbar(); }
    else deselectObject();
    buildBuyDrawerMoneyState();
    refreshChecklist();
  }

  // ---- floating toolbar (placement / selection actions)
  function renderToolbar(force) {
    const tb = ui.els.toolbar;
    if (!tb) return;
    const bp = ui.buy.placing;
    const sig = [ui.mode, ui.narrow, bp ? bp.type + ':' + bp.moveId + ':' + bp.ok : '-', ui.buy.sel, ui.buy.confirm, ui.build.sel, ui.build.confirm,
      (ui.buy.sel != null || ui.build.sel != null) ? Math.round(moneyNow()) : 0, ui.undo.length].join('|');
    if (!force && sig === ui.sig.toolbar) return;
    ui.sig.toolbar = sig;
    clear(tb);
    let show = false;
    if (ui.mode === 'buy' && ui.buy.placing) {
      const p = ui.buy.placing;
      const d = (D().CATALOG || {})[p.type] || {};
      show = true;
      tb.appendChild(h('span', { class: 'tb-title', text: (p.moveId != null ? 'Movendo: ' : '') + (d.name || '') + (ui.narrow && p.moveId == null ? ' · ' + fmtMoney(d.price) : '') }));
      if (p.moveId == null) tb.appendChild(h('span', { class: 'tb-note num', text: fmtMoney(d.price) }));
      tb.appendChild(h('button', { class: 'btn', type: 'button', title: 'Girar (R)', on: { click: rotatePlacing } }, [emo('↻'), 'Girar ', h('span', { class: 'kbd', text: 'R' })]));
      tb.appendChild(h('button', { class: 'btn primary', type: 'button', disabled: !p.ok, on: { click: () => commitPlacement(true) } }, [emo('✓'), p.moveId != null ? 'Colocar aqui' : 'Comprar aqui']));
      tb.appendChild(h('button', { class: 'btn ghost', type: 'button', title: 'Cancelar (Esc)', on: { click: stopPlacing } }, [emo('✕'), 'Cancelar']));
    } else if ((ui.mode === 'buy' && ui.buy.sel != null) || (ui.mode === 'build' && ui.build.sel != null)) {
      const build = ui.mode === 'build';
      const id = build ? ui.build.sel : ui.buy.sel;
      const o = objById(id);
      if (o) {
        show = true;
        const d = objDef(o) || {};
        const value = ecall('sellValue', id) || 0;
        const fixed = o.type === 'mailbox' || o.type === 'carpool' || isSystemObj(o);
        const confirm = build ? ui.build.confirm : ui.buy.confirm;
        tb.appendChild(h('span', { class: 'tb-title', text: (d.name || 'Objeto') + (ui.narrow && !build && !fixed && !confirm ? ' · vale ' + fmtMoney(value) : '') }));
        if (confirm) {
          tb.appendChild(h('span', { class: 'tb-note', text: value ? 'Vender por ' + fmtMoney(value) + '?' : 'Remover sem reembolso?' }));
          tb.appendChild(h('button', { class: 'btn danger', type: 'button', on: { click: () => sellSelected(true) } }, [emo('💰'), 'Confirmar venda']));
          tb.appendChild(h('button', { class: 'btn ghost', type: 'button', on: { click: () => { if (build) ui.build.confirm = false; else ui.buy.confirm = false; renderToolbar(); } } }, 'Cancelar'));
        } else {
          if (!build && !fixed) {
            const R = d.ratings || {};
            const ICO = D().MOTIVE_ICONS || {};
            const chips = [];
            for (const k in R) if (num(R[k]) > 0 && chips.length < 3) chips.push(h('span', { class: 'chip', text: (ICO[k] || k) + ' ' + R[k] }));
            if (chips.length && !ui.narrow) tb.appendChild(h('span', { class: 'tb-chips' }, chips));
            tb.appendChild(h('span', { class: 'tb-note num', text: 'Vale ' + fmtMoney(value) }));
          }
          if (!build && o.type !== 'carpool' && (!isSystemObj(o) || o.type === 'mailbox')) tb.appendChild(h('button', { class: 'btn', type: 'button', on: { click: () => startPlacing(o.type, o.id) } }, [emo('✥'), 'Mover']));
          if (!build && !fixed) tb.appendChild(h('button', { class: 'btn', type: 'button', title: 'Comprar outro igual', disabled: num(d.price) > moneyNow(), on: { click: () => startPlacing(o.type, null, o.rot) } }, [emo('➕'), ui.narrow ? 'Outro' : 'Comprar outro igual']));
          if (!fixed) tb.appendChild(h('button', { class: 'btn danger', type: 'button', title: 'Vender (Delete)', on: { click: () => sellSelected(false) } }, [emo('💰'), value ? (ui.narrow ? 'Vender' : 'Vender +' + fmtMoney(value)) : 'Remover']));
          tb.appendChild(h('button', { class: 'btn ghost', type: 'button', title: 'Fechar (Esc)', 'aria-label': 'Fechar', on: { click: () => { if (build) { ui.build.sel = null; ui.build.confirm = false; rcall('hideTileGhost'); renderToolbar(); } else deselectObject(); } } }, '✕'));
        }
      }
    }
    tb.hidden = !show;
  }

  // ======================================================================
  // Build mode
  // ======================================================================
  const BUILD_TOOLS = [
    { key: 'wall', icon: '🧱', label: 'Parede' },
    { key: 'room', icon: '🏠', label: 'Cômodo' },
    { key: 'door', icon: '🚪', label: 'Porta' },
    { key: 'window', icon: '🪟', label: 'Janela' },
    { key: 'floor', icon: '🟫', label: 'Piso' },
    { key: 'paper', icon: '🎨', label: 'Papel de parede', short: 'Papel' },
    { key: 'demolish', icon: '🔨', label: 'Demolir' },
  ];
  function wallPrice(key) { const W2 = D().WALL_PRICES || { wall: 70, door: 150, window: 110 }; return num(W2[key]); }
  function paperPrice(i) { const p = (D().WALLPAPERS || [])[i]; return p ? num(p.price) : 10; }
  function buildBuildDrawer() {
    const dr = ui.els.drawer;
    clear(dr);
    dr.setAttribute('aria-label', 'Ferramentas de construção');
    const tools = h('div', { class: 'tools', role: 'group', 'aria-label': 'Ferramentas' });
    for (const t of BUILD_TOOLS) {
      tools.appendChild(h('button', {
        class: 'tool-btn', type: 'button', id: 'tool-' + t.key, 'aria-pressed': t.key === ui.build.tool ? 'true' : 'false', title: t.label, 'aria-label': t.label,
        on: { click: () => { setBuildTool(t.key); sfx('click'); } },
      }, [emo(t.icon), h('span', { class: 't-long', text: t.label }), h('span', { class: 't-short', text: t.short || t.label })]));
    }
    const opts = h('div', { class: 'tool-opts' });
    const tool = ui.build.tool;
    const touch = isCoarse();
    const tapW = touch ? 'Toque' : 'Clique';
    const help = {
      wall: [h('b', { text: 'Arraste' }), ' pelos cantos do piso para erguer paredes em linha reta. ', h('b', { text: fmtMoney(wallPrice('wall')) }), ' por trecho.'],
      room: [h('b', { text: 'Arraste' }), ' um retângulo para erguer as quatro paredes de uma vez (', h('b', { text: fmtMoney(wallPrice('wall')) }), ' por trecho), com piso opcional. Depois coloque uma porta.'],
      door: [h('b', { text: tapW }), ' numa parede existente para instalar uma porta. ', h('b', { text: fmtMoney(wallPrice('door')) }), ' (descontado metade do valor da parede).'],
      window: [h('b', { text: tapW }), ' numa parede existente para abrir uma janela. ', h('b', { text: fmtMoney(wallPrice('window')) }), '. Janelas deixam os cômodos mais agradáveis de dia.'],
      floor: [h('b', { text: tapW + ' ou arraste' }), ' um retângulo para cobrir o chão. ', touch ? '' : [h('b', { text: 'Shift+clique' }), ' cobre o cômodo inteiro. '], 'Grama remove o piso (reembolso de 50%).'],
      paper: [h('b', { text: tapW }), ' numa face da parede para pintar só aquele lado (', h('b', { text: fmtMoney(paperPrice(ui.build.paper)) }), ' por lado). ', touch ? 'Ligue “Cômodo inteiro” para pintar todas as paredes do cômodo.' : [h('b', { text: 'Shift+clique' }), ' pinta todas as paredes do cômodo.']],
      demolish: [h('b', { text: 'Arraste' }), ' sobre paredes, portas e janelas para derrubá-las (reembolso de 50%). ', h('b', { text: tapW }), ' num objeto para vendê-lo.'],
    }[tool];
    opts.appendChild(h('div', { class: 'tool-help' }, help));
    if (tool === 'floor' || tool === 'paper') {
      const sw = h('button', { class: 'switch', type: 'button', role: 'switch', id: 'opt-wholeroom', 'aria-checked': ui.build.wholeRoom ? 'true' : 'false', 'aria-label': 'Cômodo inteiro' });
      sw.addEventListener('click', () => { ui.build.wholeRoom = !ui.build.wholeRoom; sw.setAttribute('aria-checked', ui.build.wholeRoom ? 'true' : 'false'); sfx('click'); rcall('hideEdgeGhost'); rcall('hideTileGhost'); });
      opts.appendChild(h('div', { class: 'room-toggle' }, [h('div', {}, [h('b', { text: 'Cômodo inteiro' }), h('span', { text: tool === 'floor' ? 'Cobre todo o piso do cômodo fechado.' : 'Pinta o lado de dentro de todas as paredes do cômodo.' })]), sw]));
    }
    if (tool === 'floor' || tool === 'room') {
      opts.appendChild(h('div', { class: 'section-label', text: tool === 'room' ? 'Piso do cômodo' : 'Pisos' }));
      const sw = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Pisos' });
      const pick = tool === 'room' ? ui.build.roomFloor : ui.build.floor;
      if (tool === 'room') {
        sw.appendChild(h('button', {
          class: 'swatch none', type: 'button', 'aria-pressed': pick == null ? 'true' : 'false', title: 'Sem piso',
          on: { click: () => { ui.build.roomFloor = null; prefs.roomFloor = null; savePrefs(); sfx('click'); buildBuildDrawer(); } },
        }, [h('i', {}), h('span', { class: 'sw-name', text: 'Sem piso' }), h('span', { class: 'sw-price', text: 'só paredes' })]));
      }
      (D().FLOORS || []).forEach((f, i) => {
        if (tool === 'room' && i === 0) return;
        sw.appendChild(h('button', {
          class: 'swatch', type: 'button', 'aria-pressed': i === pick ? 'true' : 'false', title: f.name,
          on: { click: () => { if (tool === 'room') { ui.build.roomFloor = i; prefs.roomFloor = i; } else { ui.build.floor = i; prefs.floorIdx = i; } savePrefs(); sfx('click'); buildBuildDrawer(); } },
        }, [h('i', { style: { background: f.color } }), h('span', { class: 'sw-name', text: f.name }), h('span', { class: 'sw-price', text: i === 0 ? 'grátis' : fmtMoney(f.price) + '/piso' })]));
      });
      opts.appendChild(sw);
    }
    if (tool === 'paper' || tool === 'wall') {
      opts.appendChild(h('div', { class: 'section-label', text: tool === 'wall' ? 'Acabamento das paredes novas' : 'Papel de parede e pintura' }));
      const sw = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Acabamentos' });
      (D().WALLPAPERS || []).forEach((p, i) => {
        sw.appendChild(h('button', {
          class: 'swatch', type: 'button', 'aria-pressed': i === ui.build.paper ? 'true' : 'false', title: p.name,
          on: { click: () => { ui.build.paper = i; prefs.paperIdx = i; savePrefs(); sfx('click'); buildBuildDrawer(); } },
        }, [h('i', { style: { background: p.color } }), h('span', { class: 'sw-name', text: p.name }), h('span', { class: 'sw-price', text: tool === 'wall' ? 'incluso' : fmtMoney(p.price) + '/lado' })]));
      });
      opts.appendChild(sw);
    }
    dr.appendChild(h('button', { class: 'drawer-grip', type: 'button', 'aria-label': 'Recolher ou expandir ferramentas', on: { click: () => collapseDrawer() } }));
    dr.appendChild(h('div', { class: 'drawer-head' }, [h('h2', { text: 'Construir' }), h('div', { class: 'dh-right' }, [undoButton(), h('span', { class: 'paused-pill', text: 'Tempo pausado' })])]));
    dr.appendChild(tools);
    dr.appendChild(opts);
  }
  function setBuildTool(key) {
    if (!BUILD_TOOLS.some((t) => t.key === key)) return;
    cancelBuildDrag();
    ui.build.tool = key;
    ui.build.sel = null; ui.build.confirm = false;
    prefs.buildTool = key; savePrefs();
    rcall('hideEdgeGhost'); rcall('hideTileGhost');
    endFlash();
    hideTip(true);
    renderToolbar();
    buildBuildDrawer();
  }
  function cornerAt(cx, cy) {
    const p = rcall('pickTile', cx, cy);
    if (!p) return null;
    if (p.cx != null && p.cy != null) return { x: Math.round(p.cx), y: Math.round(p.cy) };
    const fx = p.fx != null ? num(p.fx) : num(p.x) + 0.5;
    const fy = p.fy != null ? num(p.fy) : num(p.y) + 0.5;
    const L = lotSize();
    return { x: clamp(Math.round(fx), 0, L.w), y: clamp(Math.round(fy), 0, L.h) };
  }
  function tileAt(cx, cy) {
    const p = rcall('pickTile', cx, cy);
    if (!p) return null;
    const L = lotSize();
    const x = Math.round(num(p.x)), y = Math.round(num(p.y));
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return null;
    return { x, y };
  }
  function edgeAt(cx, cy) {
    const e = rcall('pickEdge', cx, cy);
    return e && e.key ? e : null;
  }
  // VIS-2/BB-7: the face of the wall under the cursor ('A'|'B'), from pickEdge or from the picked tile
  function edgeSide(e, cx, cy) {
    if (e && (e.side === 'A' || e.side === 'B')) return e.side;
    const t = rcall('pickTile', cx, cy);
    if (t) { const sd = wcall('edgeSideFacing', e.key, Math.round(num(t.x)), Math.round(num(t.y))); if (sd === 'A' || sd === 'B') return sd; }
    return 'both';
  }
  function sideTile(key, side) {
    const t = wcall('edgeSideTile', key, side);
    if (t && isFinite(t.x)) return t;
    const p = String(key).split(','); const x = +p[1], y = +p[2];
    if (p[0] === 'h') return side === 'A' ? { x, y: y - 1 } : { x, y };
    return side === 'A' ? { x: x - 1, y } : { x, y };
  }
  function wallSideColor(key, side) {
    const c = wcall('wallColor', key, side === 'both' ? 'A' : side);
    if (c != null) return num(c);
    const w = getWall(key);
    return w ? num(side === 'A' && w.cA != null ? w.cA : side === 'B' && w.cB != null ? w.cB : w.c) : null;
  }
  function getWall(key) {
    const w = wcall('getWall', key);
    if (w !== null && w !== undefined) return w;
    const st = S();
    return st && st.lot && st.lot.walls ? st.lot.walls[key] || null : null;
  }
  function moneyNow() { return num((S() || {}).money); }
  function costTip(cost, extra) {
    if (cost === 0) return extra || 'Sem custo';
    const parts = [h('span', { class: cost < 0 ? 'money-pos' : 'money-neg', text: cost < 0 ? '+' + fmtMoney(-cost) : fmtMoney(cost) })];
    if (extra) parts.push(' · ' + extra);
    return parts;
  }
  function wholeRoom(e) { return !!(ui.build.wholeRoom || (e && e.shiftKey) || ui.shift); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function wallDragKeys(drag, demolish) {
    const raw = wcall('wallSegmentsForDrag', drag.c1.x, drag.c1.y, drag.c2.x, drag.c2.y) || [];
    const keys = [], blocked = [];
    for (const k of raw) {
      const ex = getWall(k);
      if (demolish) {
        if (!ex) continue;
        const cb = wcall('canBuildWall', k, 0);
        if (cb && cb.ok === false) blocked.push(k); else keys.push(k);
      } else {
        if (ex) continue;
        const cb = wcall('canBuildWall', k, 1);
        if (cb && cb.ok === false) blocked.push(k); else keys.push(k);
      }
    }
    return { keys, blocked };
  }
  function roomRect(dg) {
    return { x1: Math.min(dg.t1.x, dg.t2.x), y1: Math.min(dg.t1.y, dg.t2.y), x2: Math.max(dg.t1.x, dg.t2.x), y2: Math.max(dg.t1.y, dg.t2.y) };
  }
  function buildDown(e) {
    const tool = ui.build.tool;
    endFlash();
    if (tool === 'wall' || tool === 'demolish') {
      const c = cornerAt(e.clientX, e.clientY);
      if (!c) return;
      ui.build.drag = { tool, c1: c, c2: c, keys: [], blocked: [], cost: 0 };
    } else if (tool === 'room') {
      const t = tileAt(e.clientX, e.clientY);
      if (!t) return;
      ui.build.drag = { tool, t1: t, t2: t, est: null, keys: [] };
      buildMove(e);
    } else if (tool === 'floor') {
      const t = tileAt(e.clientX, e.clientY);
      if (!t) return;
      ui.build.drag = { tool, t1: t, t2: t, tiles: [t], cost: 0, whole: wholeRoom(e) };
      buildMove(e);
    } else if (tool === 'paper') {
      ui.build.drag = { tool, painted: new Set(), cost: 0, count: 0, snap: null, whole: wholeRoom(e) };
      paintEdgeAt(e.clientX, e.clientY);
    }
  }
  function buildMove(e) {
    const dg = ui.build.drag;
    if (!dg) return;
    const x = e.clientX, y = e.clientY;
    if (dg.tool === 'wall' || dg.tool === 'demolish') {
      const c = cornerAt(x, y);
      if (!c) return;
      dg.c2 = c;
      const demolish = dg.tool === 'demolish';
      const r = wallDragKeys(dg, demolish);
      dg.keys = r.keys; dg.blocked = r.blocked;
      dg.cost = r.keys.reduce((a, k) => a + num(ecall('wallCost', k, demolish ? 0 : 1)), 0);
      if (r.keys.length) rcall('showEdgeGhost', r.keys, demolish ? false : dg.cost <= moneyNow());
      else rcall('hideEdgeGhost');
      if (!r.keys.length && !r.blocked.length) { showTip(x, y, demolish ? 'Arraste sobre paredes' : 'Arraste para traçar a parede'); return; }
      const bad = !demolish && dg.cost > moneyNow();
      const extra = (r.keys.length ? plural(r.keys.length, 'trecho', 'trechos') : '') +
        (r.blocked.length ? (r.keys.length ? ' · ' : '') + plural(r.blocked.length, 'bloqueado por objeto', 'bloqueados por objetos') : '') + (bad ? ' · dinheiro insuficiente' : '');
      const warns = !demolish && r.keys.length ? wcall('wallWarnings', r.keys, 1) : null;
      showTip(x, y, [costTip(dg.cost, extra), warnLine(warns)], bad || (!r.keys.length && r.blocked.length > 0));
    } else if (dg.tool === 'room') {
      const t = tileAt(x, y);
      if (!t) return;
      dg.t2 = t;
      const R = roomRect(dg);
      const est = ecall('estimateRoom', R.x1, R.y1, R.x2, R.y2, ui.build.roomFloor) || { ok: false, cost: 0, walls: 0, tiles: 0, reason: 'Indisponível.' };
      dg.est = est;
      dg.keys = (wcall('edgesOfRect', R.x1, R.y1, R.x2, R.y2) || []).filter((k) => !getWall(k));
      const single = R.x1 === R.x2 && R.y1 === R.y2;
      if (dg.keys.length) rcall('showEdgeGhost', dg.keys, !!est.ok && !single); else rcall('hideEdgeGhost');
      rcall('showTileGhost', wcall('tilesInRect', R.x1, R.y1, R.x2, R.y2) || [t], !!est.ok && !single);
      if (single) { showTip(x, y, 'Arraste para desenhar o cômodo'); return; }
      const size = (R.x2 - R.x1 + 1) + '×' + (R.y2 - R.y1 + 1);
      const extra = size + ' · ' + plural(num(est.walls), 'parede', 'paredes') + (num(est.tiles) ? ' · ' + plural(num(est.tiles), 'piso', 'pisos') : '');
      const warns = est.ok && dg.keys.length ? wcall('wallWarnings', dg.keys, 1) : null;
      showTip(x, y, [costTip(num(est.cost), extra), est.ok ? null : h('span', { class: 'tip-line', text: est.reason || 'Não dá para construir aqui.' }), warnLine(warns)], !est.ok);
    } else if (dg.tool === 'floor') {
      const t = tileAt(x, y);
      if (!t) return;
      dg.t2 = t;
      if (dg.whole) { floorRoomPreview(x, y, t); return; }
      const tiles = wcall('tilesInRect', dg.t1.x, dg.t1.y, t.x, t.y) || [t];
      dg.tiles = tiles;
      dg.cost = tiles.reduce((a, q) => a + num(ecall('floorCost', q.x, q.y, ui.build.floor)), 0);
      const ok = dg.cost <= moneyNow();
      rcall('showTileGhost', tiles, ok);
      const f = (D().FLOORS || [])[ui.build.floor] || {};
      const amb = wcall('roomScoreWithFloor', tiles, ui.build.floor);
      showTip(x, y, [costTip(dg.cost, plural(tiles.length, 'piso', 'pisos') + ' · ' + (f.name || '') + (ok ? '' : ' · dinheiro insuficiente')), ambLine(amb)], !ok);
    } else if (dg.tool === 'paper') {
      paintEdgeAt(x, y);
    }
  }
  // whole-room floor preview (Shift / "Cômodo inteiro")
  function floorRoomPreview(x, y, t) {
    const indoor = wcall('isIndoor', t.x, t.y);
    const tiles = indoor ? (wcall('roomTiles', t.x, t.y) || [t]) : [t];
    const cost = tiles.reduce((a, q) => a + num(ecall('floorCost', q.x, q.y, ui.build.floor)), 0);
    const ok = !!indoor && cost <= moneyNow();
    rcall('showTileGhost', tiles, ok);
    const f = (D().FLOORS || [])[ui.build.floor] || {};
    if (!indoor) { showTip(x, y, 'Só dá para cobrir de uma vez um cômodo fechado', true); return; }
    showTip(x, y, [costTip(cost, 'cômodo inteiro · ' + plural(tiles.length, 'piso', 'pisos') + ' · ' + (f.name || '') + (cost > moneyNow() ? ' · dinheiro insuficiente' : '')), ambLine(wcall('roomScoreWithFloor', tiles, ui.build.floor))], !ok);
  }
  function paintEdgeAt(x, y) {
    const dg = ui.build.drag;
    const e = edgeAt(x, y);
    if (!e) return;
    const w = getWall(e.key);
    if (!w) { rcall('showEdgeGhost', [e.key], false); showTip(x, y, 'Não há parede aqui', true); return; }
    const side = edgeSide(e, x, y);
    const whole = dg ? dg.whole : wholeRoom(null);
    const idx = ui.build.paper;
    let r, tag;
    if (whole && side !== 'both') {
      const t = sideTile(e.key, side);
      const room = wcall('roomAt', t.x, t.y);
      tag = 'room:' + room;
      if (dg && dg.painted.has(tag)) return;
      if (dg && !dg.snap) dg.snap = snapshot();
      r = ecall('paintRoomWalls', t.x, t.y, idx);
      if (r && r.ok) { const edges = wcall('roomEdges', t.x, t.y) || []; rcall('showEdgeGhost', edges.map((q) => q.key), true); }
    } else {
      tag = e.key + ':' + side;
      if (dg && dg.painted.has(tag)) return;
      if (dg && !dg.snap) dg.snap = snapshot();
      r = ecall('paintWall', e.key, idx, side);
      if (r && r.ok) rcall('showEdgeGhost', [e.key], true);
    }
    if (dg) dg.painted.add(tag);
    if (r && r.ok) {
      const n = whole ? num(r.count) : (num(r.cost) ? 1 : 0);
      if (dg) { dg.cost += num(r.cost); dg.count += n; }
      if (r.cost) sfx('build');
      const total = dg ? dg.cost : num(r.cost);
      const cnt = dg ? dg.count : n;
      showTip(x, y, costTip(total, cnt ? plural(cnt, 'lado pintado', 'lados pintados') : 'Já tem este acabamento'), false, true);
    } else {
      rcall('showEdgeGhost', [e.key], false);
      showTip(x, y, (r && r.reason) || engineReason() || 'Não foi possível pintar', true, true);
    }
  }
  function buildUp(e, moved) {
    const dg = ui.build.drag;
    const tool = ui.build.tool;
    const x = e.clientX, y = e.clientY;
    if (tool === 'door' || tool === 'window') { if (!moved) placeOpening(x, y, tool === 'door' ? 2 : 3); return; }
    if (tool === 'paper' && !dg) {
      // touch tap (the drag pans on touch)
      if (moved) return;
      ui.build.drag = { tool: 'paper', painted: new Set(), cost: 0, count: 0, snap: null, whole: wholeRoom(e) };
      paintEdgeAt(x, y);
      const d2 = ui.build.drag; ui.build.drag = null;
      if (d2.count && d2.snap) pushUndo(d2.snap);
      setTimeout(() => rcall('hideEdgeGhost'), 450);
      return;
    }
    if (!dg) return;
    ui.build.drag = null;
    if (dg.tool === 'wall' || dg.tool === 'demolish') {
      rcall('hideEdgeGhost');
      if (dg.tool === 'demolish' && (!moved || (dg.c1.x === dg.c2.x && dg.c1.y === dg.c2.y))) { demolishClick(x, y); return; }
      if (!dg.keys.length) { hideTip(true); return; }
      if (dg.tool === 'wall' && dg.cost > moneyNow()) { sfx('error'); flashTip(x, y, 'Dinheiro insuficiente.', true); return; }
      const snap = snapshot();
      let done = 0, total = 0, fail = '';
      for (const k of dg.keys) {
        const r = ecall('buildWall', k, dg.tool === 'wall' ? 1 : 0, dg.tool === 'wall' ? ui.build.paper : undefined);
        if (r && r.ok) { done++; total += num(r.cost); } else if (r && r.reason) fail = r.reason;
      }
      if (done) {
        pushUndo(snap);
        sfx('build');
        flashTip(x, y, costTip(total, plural(done, dg.tool === 'wall' ? 'trecho construído' : 'trecho demolido', dg.tool === 'wall' ? 'trechos construídos' : 'trechos demolidos')));
        refreshChecklist();
      } else { sfx('error'); flashTip(x, y, fail || engineReason() || 'Nada foi alterado.', true); }
    } else if (dg.tool === 'room') {
      rcall('hideEdgeGhost'); rcall('hideTileGhost');
      const R = roomRect(dg);
      if (R.x1 === R.x2 && R.y1 === R.y2) { flashTip(x, y, 'Arraste para desenhar o cômodo (pelo menos 2 pisos).', false); return; }
      const snap = snapshot();
      const r = ecall('buildRoom', R.x1, R.y1, R.x2, R.y2, ui.build.roomFloor);
      if (r && r.ok) {
        pushUndo(snap);
        sfx('build');
        flashTip(x, y, costTip(num(r.cost), 'Cômodo ' + (R.x2 - R.x1 + 1) + '×' + (R.y2 - R.y1 + 1) + ' construído · agora coloque uma porta'), false, 2600);
        refreshChecklist();
      } else { sfx('error'); flashTip(x, y, (r && r.reason) || engineReason() || 'Não foi possível construir o cômodo.', true); }
    } else if (dg.tool === 'floor') {
      rcall('hideTileGhost');
      const snap = snapshot();
      if (dg.whole) {
        const t = dg.t2 || dg.t1;
        const r = ecall('paintRoomFloor', t.x, t.y, ui.build.floor);
        if (r && r.ok && num(r.count)) { pushUndo(snap); sfx('build'); flashTip(x, y, costTip(num(r.cost), plural(num(r.count), 'piso', 'pisos') + ' no cômodo')); }
        else if (r && r.ok) flashTip(x, y, 'O cômodo já tem este piso.', false);
        else { sfx('error'); flashTip(x, y, (r && r.reason) || engineReason() || 'Não foi possível.', true); }
        return;
      }
      if (dg.cost > moneyNow()) { sfx('error'); flashTip(x, y, 'Dinheiro insuficiente.', true); return; }
      let total = 0, n = 0;
      for (const t of dg.tiles) {
        const r = ecall('paintFloor', t.x, t.y, ui.build.floor);
        if (r && r.ok) { total += num(r.cost); if (r.cost) n++; }
      }
      if (n) { pushUndo(snap); sfx('build'); flashTip(x, y, costTip(total, plural(n, 'piso', 'pisos'))); } else hideTip(true);
    } else if (dg.tool === 'paper') {
      if (dg.count && dg.snap) pushUndo(dg.snap);
      setTimeout(() => rcall('hideEdgeGhost'), 250);
    }
  }
  function buildHover(x, y) {
    const tool = ui.build.tool;
    if (ui.build.drag) return;
    if (tool === 'door' || tool === 'window' || tool === 'paper') {
      const e = edgeAt(x, y);
      if (!e) { rcall('hideEdgeGhost'); hideTip(); return; }
      const w = getWall(e.key);
      if (tool === 'paper') {
        if (!w) { rcall('showEdgeGhost', [e.key], false); showTip(x, y, 'Não há parede aqui', true); return; }
        const p = (D().WALLPAPERS || [])[ui.build.paper] || {};
        const side = edgeSide(e, x, y);
        if (wholeRoom(null) && side !== 'both') {
          const t = sideTile(e.key, side);
          const edges = wcall('roomEdges', t.x, t.y) || [];
          const todo = edges.filter((q) => wallSideColor(q.key, q.side) !== ui.build.paper);
          rcall('showEdgeGhost', edges.map((q) => q.key), true);
          const cost = todo.length * num(p.price);
          showTip(x, y, todo.length ? [costTip(cost, 'cômodo inteiro · ' + plural(todo.length, 'lado', 'lados') + ' · ' + (p.name || '')), ambLine(wcall('roomScoreWithWallpaper', edges.map((q) => ({ key: q.key, side: q.side })), ui.build.paper))] : 'O cômodo já tem este acabamento', cost > moneyNow());
          return;
        }
        rcall('showEdgeGhost', [e.key], true);
        const same = wallSideColor(e.key, side) === ui.build.paper;
        const amb = side !== 'both' ? wcall('roomScoreWithWallpaper', [{ key: e.key, side }], ui.build.paper) : null;
        showTip(x, y, same ? 'Este lado já tem este acabamento' : [costTip(num(p.price) * (side === 'both' ? 2 : 1), (p.name || '') + (side === 'both' ? '' : ' · este lado')), ambLine(amb)]);
        return;
      }
      const t = tool === 'door' ? 2 : 3;
      let ok = !!w, reason = w ? '' : 'Precisa de uma parede', neutral = false;
      if (w && w.t === t) { ok = false; reason = t === 2 ? 'Já é uma porta' : 'Já é uma janela'; neutral = true; }   // BB-6: a state, not an error
      if (ok) { const cb = wcall('canBuildWall', e.key, t); if (cb && cb.ok === false) { ok = false; reason = cb.reason; } }
      const cost = num(ecall('wallCost', e.key, t));
      if (ok && cost > moneyNow()) { ok = false; reason = 'Dinheiro insuficiente'; }
      rcall('showEdgeGhost', [e.key], ok || neutral);
      const warns = ok && t === 3 ? wcall('wallWarnings', [e.key], 3) : null;
      if (ok) showTip(x, y, [costTip(cost, t === 2 ? 'porta' : 'janela'), warnLine(warns)]); else showTip(x, y, reason, !neutral);
    } else if (tool === 'floor') {
      const t = tileAt(x, y);
      if (!t) { if (ui.build.sel == null) rcall('hideTileGhost'); hideTip(); return; }
      if (wholeRoom(null)) { floorRoomPreview(x, y, t); return; }
      const cost = num(ecall('floorCost', t.x, t.y, ui.build.floor));
      rcall('showTileGhost', [t], cost <= moneyNow());
      const f = (D().FLOORS || [])[ui.build.floor] || {};
      showTip(x, y, costTip(cost, f.name || ''));
    } else if (tool === 'room') {
      const t = tileAt(x, y);
      if (!t) { rcall('hideTileGhost'); hideTip(); return; }
      rcall('showTileGhost', [t], true);
      showTip(x, y, 'Arraste um retângulo para fazer o cômodo');
    } else if (tool === 'wall' || tool === 'demolish') {
      hideTip();
    }
  }
  function placeOpening(x, y, t) {
    const e = edgeAt(x, y);
    if (!e) return;
    const w = getWall(e.key);
    if (!w) { sfx('error'); flashTip(x, y, 'Precisa de uma parede.', true); return; }
    if (w.t === t) { flashTip(x, y, t === 2 ? 'Já é uma porta.' : 'Já é uma janela.', false); return; }
    const snap = snapshot();
    const r = ecall('buildWall', e.key, t, num(w.c));
    if (r && r.ok) { pushUndo(snap); sfx('build'); flashTip(x, y, costTip(num(r.cost), t === 2 ? 'Porta instalada' : 'Janela instalada')); refreshChecklist(); }
    else { sfx('error'); flashTip(x, y, (r && r.reason) || engineReason() || 'Não foi possível.', true); }
    // BB-6: the re-hover only refreshes the ghost while the confirmation tip is up
    setTimeout(() => { if (ui.mode === 'build' && ui.mouse.type === 'mouse') buildHover(ui.mouse.x, ui.mouse.y); }, 30);
  }
  function demolishClick(x, y) {
    const p = rcall('pick', x, y);
    if (p && p.kind === 'object') {
      const o = objById(p.id);
      if (!o) return;
      if (isSystemObj(o) || o.type === 'mailbox') { sfx('error'); flashTip(x, y, o.type === 'mailbox' ? 'A caixa de correio não pode ser vendida.' : systemTip(o), false, 2600); return; }
      if (ui.build.sel === o.id) { ui.build.confirm = true; sellSelected(true); return; }
      ui.build.sel = o.id;
      ui.build.confirm = true;
      const tiles = wcall('footprint', o.type, o.x, o.y, o.rot) || [{ x: o.x, y: o.y }];
      rcall('showTileGhost', tiles, false);
      const value = ecall('sellValue', o.id) || 0;
      flashTip(x, y, (isCoarse() ? 'Toque' : 'Clique') + ' de novo para vender' + (value ? ' (+' + fmtMoney(value) + ')' : ''));
      renderToolbar();
      return;
    }
    // a click on a wall edge demolishes that single segment
    const e = edgeAt(x, y);
    if (e && getWall(e.key)) {
      const snap = snapshot();
      const r = ecall('buildWall', e.key, 0);
      if (r && r.ok) { pushUndo(snap); sfx('build'); flashTip(x, y, costTip(num(r.cost), 'demolido')); } else { sfx('error'); flashTip(x, y, (r && r.reason) || engineReason() || 'Não foi possível.', true); }
      return;
    }
    if (ui.build.sel != null) { ui.build.sel = null; ui.build.confirm = false; rcall('hideTileGhost'); renderToolbar(); }
  }
  function cancelBuildDrag() {
    if (!ui.build.drag) return;
    const dg = ui.build.drag;
    ui.build.drag = null;
    if (dg.tool === 'paper' && dg.count && dg.snap) pushUndo(dg.snap);
    rcall('hideEdgeGhost');
    rcall('hideTileGhost');
    hideTip(true);
  }

  // ======================================================================
  // Modals
  // ======================================================================
  function openModal(o) {
    let root = $('modal-root');
    if (!root) {
      root = h('div', { id: 'modal-root', on: { pointerdown: (e) => { if (e.target === root && ui.modals.length) { const top = ui.modals[ui.modals.length - 1]; if (top.dismissable !== false) closeTopModal(); } } } });
      // works even before init() (save.js / main.js may ask a choice during boot)
      root.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') trapTab(e);
        else if (e.key === 'Escape' && !ui.inited) { e.preventDefault(); closeTopModal(); }
      });
      document.body.appendChild(root);
    }
    root.hidden = false;
    for (const m of ui.modals) m.el.hidden = true;
    const titleId = 'modal-title-' + (ui.modals.length + 1);
    const head = h('div', { class: 'modal-head' }, [h('h2', { id: titleId, text: o.title || '' }),
      o.dismissable === false ? null : h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar', title: 'Fechar (Esc)', on: { click: () => closeModal(entry) } }, emo('✕'))]);
    const body = h('div', { class: 'modal-body' });
    const foot = h('div', { class: 'modal-foot' });
    const el = h('div', { class: 'modal panel' + (o.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [head, body, foot]);
    const entry = { el, body, foot, kind: o.kind || '', onClose: o.onClose, dismissable: o.dismissable, prevFocus: document.activeElement };
    ui.modals.push(entry);
    root.appendChild(el);
    mcall('setPaused', 'modal', true);
    setInert(true);
    closePie();
    hideTip(true);
    applyModeDom();
    return entry;
  }
  // CR-11: while a modal is open the HUD and the 3D view are inert (no focus, no clicks) and Tab cycles
  // inside the top modal
  function setInert(on) {
    for (const id of ['hud', 'view']) {
      const el = $(id);
      if (!el) continue;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
      try { el.inert = !!on; } catch (e) { /* ignore */ }
      if (on) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
    }
  }
  function focusables(root) {
    return Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null && el.getAttribute('tabindex') !== '-1');
  }
  function trapTab(e) {
    const top = ui.modals[ui.modals.length - 1];
    if (!top) return;
    const list = focusables(top.el);
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1];
    const inside = top.el.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
  }
  /**
   * choice({ title, text, body?, buttons: [{ label, value, primary?, danger? }], cancelValue?, dismissable? })
   * → Promise resolving to the chosen value (CONTRACT_V2 §6). Modal, pauses time (reason 'modal'),
   * focus-trapped; Esc / backdrop = the last button's value (or cancelValue when given).
   */
  function choice(o) {
    o = o || {};
    return new Promise((resolve) => {
      const buttons = Array.isArray(o.buttons) && o.buttons.length ? o.buttons : [{ label: 'OK', value: true, primary: true }];
      const escValue = 'cancelValue' in o ? o.cancelValue : buttons[buttons.length - 1].value;
      let done = false;
      let m = null;
      const finish = (v) => { if (done) return; done = true; if (m) closeModal(m); resolve(v); };
      m = openModal({ title: o.title || '', kind: o.kind || 'choice', wide: !!o.wide, dismissable: o.dismissable !== false,
        onClose: () => { if (!done) { done = true; resolve(escValue); } } });
      if (o.text) m.body.appendChild(h('p', { class: 'choice-text', text: String(o.text) }));
      if (o.body) appendKids(m.body, o.body);
      let primary = null;
      buttons.forEach((b, i) => {
        const btn = h('button', { class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''), type: 'button', id: 'choice-' + i, text: String(b.label == null ? '' : b.label), on: { click: () => finish(b.value) } });
        if (b.primary && !primary) primary = btn;
        m.foot.appendChild(btn);
      });
      const f = primary || m.foot.lastChild;
      if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 0);
    });
  }
  function focusFirst(entry) {
    const f = entry.el.querySelector('input, button.primary, button:not(.icon-btn), textarea, select');
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }
  function closeModal(entry) {
    const i = ui.modals.indexOf(entry);
    if (i < 0) return;
    ui.modals.splice(i, 1);
    if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
    const root = $('modal-root');
    if (ui.modals.length) ui.modals[ui.modals.length - 1].el.hidden = false;
    else if (root) root.hidden = true;
    if (!ui.modals.length) setInert(false);
    mcall('setPaused', 'modal', ui.modals.length > 0);
    try { if (entry.onClose) entry.onClose(); } catch (e) { warnOnce('modal-close', e); }
    if (entry.prevFocus && entry.prevFocus.focus && entry.prevFocus.isConnected) { try { entry.prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    applyModeDom();
  }
  function closeTopModal() {
    const top = ui.modals[ui.modals.length - 1];
    if (top && top.dismissable !== false) closeModal(top);
  }
  function closeAllModals() { while (ui.modals.length) closeModal(ui.modals[ui.modals.length - 1]); }

  // ---- options
  function openOptions() {
    if (ui.modals.some((m) => m.kind === 'options')) return;
    closePie();
    if (ui.mode === 'buy' || ui.mode === 'build') setMode('live');
    const m = openModal({ title: 'Opções', kind: 'options' });
    const st = S() || { settings: {} };
    const sv = M.save && M.save.status ? M.save.status() : { cloud: false };
    const cloudLine = sv.cloud ? 'Seus jogos são salvos na sua conta (nuvem) e neste aparelho.' : 'Salvando neste aparelho. A nuvem não está disponível agora.';

    const freeSwitch = h('button', { class: 'switch', type: 'button', role: 'switch', id: 'opt-freewill', 'aria-checked': st.settings.freeWill !== false ? 'true' : 'false', 'aria-label': 'Livre-arbítrio' });
    freeSwitch.addEventListener('click', () => {
      const on = freeSwitch.getAttribute('aria-checked') !== 'true';
      freeSwitch.setAttribute('aria-checked', on ? 'true' : 'false');
      if (typeof E().setFreeWill === 'function') ecall('setFreeWill', on); else st.settings.freeWill = on;
      sfx('click');
    });
    const soundSwitch = h('button', { class: 'switch', type: 'button', role: 'switch', id: 'opt-sound', 'aria-checked': prefs.sound !== false ? 'true' : 'false', 'aria-label': 'Sons' });
    soundSwitch.addEventListener('click', () => {
      const on = soundSwitch.getAttribute('aria-checked') !== 'true';
      soundSwitch.setAttribute('aria-checked', on ? 'true' : 'false');
      prefs.sound = on; savePrefs();
      if (on) { sound.unlocked = true; sfx('chime'); }
    });
    const wallSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Modo das paredes' });
    const curWall = (st.settings && st.settings.wallMode) || 'cutaway';
    for (const [k, lab] of [['up', 'Altas'], ['cutaway', 'Recortadas'], ['down', 'Baixas']]) {
      const b = h('button', { type: 'button', id: 'opt-wall-' + k, 'aria-pressed': k === curWall ? 'true' : 'false', text: lab });
      b.addEventListener('click', () => {
        setWallMode(k);
        for (const c of wallSeg.children) c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
        sfx('click');
      });
      wallSeg.appendChild(b);
    }
    const saveBtn = h('button', { class: 'btn primary', type: 'button', id: 'opt-save' }, [emo('💾'), 'Salvar agora']);
    saveBtn.addEventListener('click', () => doSave(saveBtn));
    appendKids(m.body, [
      h('div', { class: 'opt-section' }, [
        h('h3', { text: 'Jogo' }),
        h('p', { class: 'muted', style: { margin: '0', fontSize: '12.5px' }, text: cloudLine + ' O jogo também salva sozinho a cada novo dia.' }),
        h('div', { class: 'opt-grid' }, [
          saveBtn,
          h('button', { class: 'btn', type: 'button', id: 'opt-load', on: { click: openSlots } }, [emo('📂'), 'Jogos salvos']),
          h('button', { class: 'btn', type: 'button', id: 'opt-export', on: { click: doExport } }, [emo('📤'), 'Exportar']),
          h('button', { class: 'btn', type: 'button', id: 'opt-import', on: { click: openImport } }, [emo('📥'), 'Importar']),
        ]),
      ]),
      h('div', { class: 'opt-section' }, [
        h('h3', { text: 'Família' }),
        h('div', { class: 'opt-row' }, [
          h('div', { class: 'o-text' }, [h('b', { text: st.householdName || 'Família' }), h('span', { text: household().length + ' morador(es) · Dia ' + num(st.time && st.time.day, 1) })]),
          h('button', { class: 'btn', type: 'button', id: 'opt-newfamily', on: { click: () => openCreateFamily() } }, [emo('👪'), 'Nova família…']),
        ]),
      ]),
      h('div', { class: 'opt-section' }, [
        h('h3', { text: 'Preferências' }),
        h('div', { class: 'opt-row' }, [h('div', { class: 'o-text' }, [h('b', { text: 'Livre-arbítrio' }), h('span', { text: 'Moradores cuidam de si mesmos quando estão sem ordens.' })]), freeSwitch]),
        h('div', { class: 'opt-row' }, [h('div', { class: 'o-text' }, [h('b', { text: 'Paredes' }), h('span', { text: 'Como as paredes aparecem na tela.' })]), wallSeg]),
        h('div', { class: 'opt-row' }, [h('div', { class: 'o-text' }, [h('b', { text: 'Sons' }), h('span', { text: 'Cliques e avisos sonoros.' })]), soundSwitch]),
        h('div', { class: 'opt-row' }, [h('div', { class: 'o-text' }, [h('b', { text: 'Ajuda' }), h('span', { text: 'Rever os controles do jogo.' })]), h('button', { class: 'btn small', type: 'button', id: 'opt-help', on: { click: () => { closeModal(m); showHelp(); } } }, 'Mostrar')]),
      ]),
    ]);
    m.foot.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: () => closeModal(m) } }, 'Voltar ao jogo'));
    focusFirst(m);
  }
  function doSave(btn) {
    if (btn) { btn.disabled = true; }
    const p = mcall('saveNow');
    if (!p || typeof p.then !== 'function') { if (btn) btn.disabled = false; toast('Não foi possível salvar agora.', 'bad'); return; }
    p.then((r) => {
      if (btn) btn.disabled = false;
      if (r && r.ok) toast(r.where === 'cloud' ? 'Jogo salvo na nuvem e neste aparelho.' : 'Jogo salvo neste aparelho.', 'good', { icon: '💾', timeout: 3500 });
      else toast('Não foi possível salvar o jogo' + (r && r.error === 'local-unavailable' ? ': o navegador bloqueou o armazenamento.' : '.'), 'bad');
    });
  }

  // ---- save slots
  const SLOTS = ['slot1', 'slot2', 'slot3'];
  function openSlots() {
    const m = openModal({ title: 'Jogos salvos', kind: 'slots' });
    const list = h('div', { class: 'slot-list' }, h('p', { class: 'muted', text: 'Procurando jogos salvos…' }));
    m.body.appendChild(list);
    m.foot.appendChild(h('button', { class: 'btn', type: 'button', on: { click: () => closeModal(m) } }, 'Fechar'));
    const render = (entries) => {
      clear(list);
      const bySlot = {};
      for (const e of entries || []) bySlot[e.slot] = e;
      const all = SLOTS.concat(Object.keys(bySlot).filter((s) => SLOTS.indexOf(s) < 0));
      const cur = M.main ? M.main.slot : 'slot1';
      all.forEach((slot, idx) => {
        const e = bySlot[slot];
        const label = SLOTS.indexOf(slot) >= 0 ? 'Espaço ' + (SLOTS.indexOf(slot) + 1) : slot;
        const meta = e ? e.householdName + ' · Dia ' + e.day + ' · ' + fmtMoney(e.money) : 'Vazio';
        const when = e && e.savedAt ? new Date(e.savedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const where = e ? (e.where === 'both' || e.where === 'cloud' ? '☁️ nuvem' : '💻 este aparelho') : '';
        const actions = h('div', { class: 'sl-actions' });
        const saveB = h('button', { class: 'btn small', type: 'button', id: 'slot-save-' + idx, text: 'Salvar aqui' });
        saveB.addEventListener('click', () => {
          if (e && !saveB._armed && slot !== cur) { saveB._armed = true; saveB.textContent = 'Substituir?'; saveB.classList.add('danger'); return; }
          saveB.disabled = true;
          const p = mcall('saveNow', slot);
          if (p && p.then) p.then((r) => { toast(r && r.ok ? 'Salvo em ' + label + '.' : 'Não foi possível salvar.', r && r.ok ? 'good' : 'bad', { icon: '💾', timeout: 3000 }); refreshList(); });
        });
        actions.appendChild(saveB);
        if (e) {
          const loadB = h('button', { class: 'btn small primary', type: 'button', id: 'slot-load-' + idx, text: 'Carregar' });
          loadB.addEventListener('click', () => {
            if (!loadB._armed && M.main && M.main.dirty) { loadB._armed = true; loadB.textContent = 'Perder o progresso não salvo?'; loadB.classList.remove('primary'); loadB.classList.add('danger'); return; }
            loadB.disabled = true;
            const p = mcall('loadSlot', slot);
            if (p && p.then) p.then((r) => {
              if (r && r.ok) { closeAllModals(); }
              else { loadB.disabled = false; toast((r && r.error) || 'Não foi possível carregar este jogo.', 'bad'); }
            });
          });
          actions.appendChild(loadB);
        }
        list.appendChild(h('div', { class: 'slot' + (slot === cur ? ' current' : '') }, [
          h('div', {}, [h('div', { class: 'sl-name', text: label + (slot === cur ? ' (atual)' : '') }), h('div', { class: 'sl-meta', text: meta }), when ? h('div', { class: 'sl-meta', text: when + ' · ' + where }) : null]),
          actions,
        ]));
      });
    };
    const refreshList = () => {
      if (!M.save || typeof M.save.list !== 'function') { render([]); return; }
      M.save.list().then(render, () => render([]));
    };
    refreshList();
  }

  // ---- export / import
  function doExport() {
    const st = S();
    if (!st || !M.save) return;
    toast('Preparando o arquivo…', 'info', { icon: '📤', timeout: 1500 });
    const p = M.save.download ? M.save.download(st) : Promise.resolve({ ok: false, method: 'manual' });
    p.then((r) => {
      if (r && r.ok) { toast('Arquivo morada-save.json entregue para download.', 'good', { icon: '📤' }); return; }
      if (r && r.method === 'downloads' && r.error === 'declined') { toast('Exportação cancelada.', 'info'); return; }
      openExportText(r && r.data ? r.data : M.save.exportJSON(st));
    }).catch(() => openExportText(M.save.exportJSON(st)));
  }
  function openExportText(text) {
    const m = openModal({ title: 'Exportar jogo', kind: 'export' });
    const ta = h('textarea', { class: 'code', id: 'export-text', readonly: 'readonly', 'aria-label': 'Dados do jogo salvo', spellcheck: 'false' });
    ta.value = text;
    const status = h('div', { class: 'form-error', 'aria-live': 'polite' });
    appendKids(m.body, [
      h('p', { class: 'muted', style: { margin: '0' }, text: 'Copie o texto abaixo e guarde num arquivo (por exemplo morada-save.json). Para continuar depois, use Importar e cole o texto.' }),
      ta, status,
    ]);
    const copy = h('button', { class: 'btn primary', type: 'button', id: 'export-copy' }, [emo('📋'), 'Copiar']);
    copy.addEventListener('click', () => {
      const fallback = () => {
        ta.focus(); ta.select();
        let ok = false;
        try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
        status.style.color = ok ? 'var(--good)' : '';
        status.textContent = ok ? 'Copiado!' : 'Texto selecionado: use Ctrl+C (ou Copiar no celular).';
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => { status.style.color = 'var(--good)'; status.textContent = 'Copiado!'; }, fallback);
        } else fallback();
      } catch (e) { fallback(); }
    });
    m.foot.appendChild(h('button', { class: 'btn', type: 'button', on: { click: () => closeModal(m) } }, 'Fechar'));
    m.foot.appendChild(copy);
    setTimeout(() => { ta.focus(); ta.select(); }, 30);
  }
  function openImport() {
    const m = openModal({ title: 'Importar jogo', kind: 'import' });
    const file = h('input', { type: 'file', id: 'import-file', accept: '.json,application/json,text/plain' });
    const ta = h('textarea', { class: 'code', id: 'import-text', placeholder: 'Ou cole aqui o texto exportado…', 'aria-label': 'Texto do jogo exportado', spellcheck: 'false' });
    const err = h('div', { class: 'form-error', 'aria-live': 'assertive' });
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { err.textContent = 'Arquivo grande demais para ser um jogo salvo.'; return; }
      const rd = new FileReader();
      rd.onload = () => { ta.value = String(rd.result || ''); err.textContent = ''; };
      rd.onerror = () => { err.textContent = 'Não foi possível ler o arquivo.'; };
      rd.readAsText(f);
    });
    appendKids(m.body, [
      h('div', { class: 'field' }, [h('label', { for: 'import-file', text: 'Arquivo .json exportado' }), file]),
      ta, err,
      h('div', { class: 'warn-note', text: 'O jogo atual será substituído. Salve antes se quiser mantê-lo.' }),
    ]);
    const go = h('button', { class: 'btn primary', type: 'button', id: 'import-go' }, [emo('📥'), 'Importar']);
    go.addEventListener('click', () => {
      const st = M.save && M.save.importJSON ? M.save.importJSON(ta.value) : null;
      if (!st) { err.textContent = 'Não reconheci esse texto como um jogo salvo do Morada (ou ele veio de uma versão mais nova).'; sfx('error'); return; }
      const ok = mcall('loadState', st, { kind: 'import' });
      if (ok) { closeAllModals(); mcall('markDirty'); }
      else err.textContent = 'O jogo importado está danificado.';
    });
    m.foot.appendChild(h('button', { class: 'btn', type: 'button', on: { click: () => closeModal(m) } }, 'Cancelar'));
    m.foot.appendChild(go);
  }

  // ---- create a family
  function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randomMember(surname, gender) {
    const P = D().PALETTES || {};
    const N = D().NAMES || { f: ['Ana'], m: ['João'] };
    const g = gender || (Math.random() < 0.5 ? 'f' : 'm');
    const keys = D().PERSONALITY || ['neat', 'outgoing', 'active', 'playful', 'nice'];
    const pers = {};
    for (const k of keys) pers[k] = 0;
    let pts = D().PERSONALITY_POINTS || 25, guard = 0;
    while (pts > 0 && guard++ < 400) { const k = randomOf(keys); if (pers[k] < 10) { pers[k]++; pts--; } }
    return {
      first: randomOf(N[g] || ['Ana']), gender: g,
      colors: { skin: randomOf(P.skin || ['#c98e66']), hair: randomOf(P.hair || ['#3b2a1e']), shirt: randomOf(P.shirt || ['#669bbc']), pants: randomOf(P.pants || ['#2b2d42']) },
      personality: pers,
    };
  }
  function openCreateFamily() {
    const N = D().NAMES || { last: ['Silva'] };
    const surname = randomOf(N.last || ['Silva']);
    const draft = { householdName: 'Família ' + surname, members: [randomMember(surname, 'f'), randomMember(surname, 'm')], lot: null, step: 1 };
    const m = openModal({ title: 'Nova família', kind: 'family', wide: true });
    renderFamilyStep(m, draft);
  }
  function surnameOf(householdName) {
    const s = String(householdName || '').trim().replace(/^fam[ií]lia\s+/i, '');
    const parts = s.split(/\s+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }
  function renderFamilyStep(m, draft) {
    clear(m.body); clear(m.foot);
    const title = m.el.querySelector('.modal-head h2');
    const MAXP = D().PERSONALITY_POINTS || 25;
    const PK = D().PERSONALITY || ['neat', 'outgoing', 'active', 'playful', 'nice'];
    const PL = D().PERSONALITY_LABELS || {};
    const PAL = D().PALETTES || {};
    if (draft.step === 1) {
      if (title) title.textContent = 'Nova família · moradores';
      const nameIn = h('input', { type: 'text', id: 'cf-household', maxlength: '40', value: draft.householdName, autocomplete: 'off' });
      nameIn.addEventListener('input', () => { draft.householdName = nameIn.value; });
      m.body.appendChild(h('div', { class: 'field' }, [h('label', { for: 'cf-household', text: 'Nome da família' }), nameIn]));
      const grid = h('div', { class: 'members' });
      draft.members.forEach((mem, idx) => grid.appendChild(memberCard(m, draft, mem, idx, MAXP, PK, PL, PAL)));
      m.body.appendChild(grid);
      const err = h('div', { class: 'form-error', 'aria-live': 'polite' });
      m.body.appendChild(err);
      const add = h('button', { class: 'btn', type: 'button', id: 'cf-add', disabled: draft.members.length >= 4 }, [emo('➕'), 'Adicionar morador']);
      add.addEventListener('click', () => { if (draft.members.length < 4) { draft.members.push(randomMember(surnameOf(draft.householdName))); renderFamilyStep(m, draft); } });
      const next = h('button', { class: 'btn primary', type: 'button', id: 'cf-next' }, ['Escolher a casa ', emo('→')]);
      next.addEventListener('click', () => {
        if (!String(draft.householdName || '').trim()) { err.textContent = 'Dê um nome para a família.'; return; }
        const bad = draft.members.findIndex((x) => !String(x.first || '').trim());
        if (bad >= 0) { err.textContent = 'O morador ' + (bad + 1) + ' precisa de um nome.'; return; }
        // improvement: personality must use exactly the 25 points (DESIGN "sum 25")
        const short = draft.members.findIndex((x) => PK.reduce((a, k) => a + num(x.personality[k]), 0) !== MAXP);
        if (short >= 0) {
          const left = MAXP - PK.reduce((a, k) => a + num(draft.members[short].personality[k]), 0);
          err.textContent = String(draft.members[short].first || 'O morador ' + (short + 1)).trim() + ' ainda tem ' + left + (left === 1 ? ' ponto' : ' pontos') + ' de personalidade para distribuir (use “Distribuir o resto”).';
          return;
        }
        draft.step = 2;
        renderFamilyStep(m, draft);
      });
      m.foot.appendChild(add);
      m.foot.appendChild(h('button', { class: 'btn ghost', type: 'button', on: { click: () => closeModal(m) } }, 'Cancelar'));
      m.foot.appendChild(next);
      return;
    }
    // step 2: choose the lot
    if (title) title.textContent = 'Nova família · onde morar';
    const starterMoney = (D().MONEY && D().MONEY.startFamily) || 6500;
    const emptyMoney = (D().MONEY && D().MONEY.startEmpty) || 20000;
    const choices = h('div', { class: 'lot-choices', role: 'group', 'aria-label': 'Terreno' });
    const opts = [
      { key: 'starter', ico: '🏡', name: 'Casa inicial mobiliada', text: 'Sala, cozinha, banheiro e quarto prontos para morar, numa rua tranquila.', money: starterMoney },
      { key: 'empty', ico: '🌱', name: 'Terreno vazio', text: 'Só a grama, a calçada e a caixa de correio. Construa do seu jeito.', money: emptyMoney },
    ];
    if (!draft.lot) draft.lot = 'starter';
    for (const o of opts) {
      const b = h('button', { class: 'lot-card', type: 'button', id: 'cf-lot-' + o.key, 'aria-pressed': draft.lot === o.key ? 'true' : 'false' }, [
        h('span', { class: 'lc-ico emoji', 'aria-hidden': 'true', text: o.ico }), h('b', { text: o.name }), h('span', { text: o.text }),
        h('span', { class: 'lc-money', text: fmtMoney(o.money) + ' no banco' })]);
      b.addEventListener('click', () => { draft.lot = o.key; for (const c of choices.children) c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      choices.appendChild(b);
    }
    const names = draft.members.map((x) => String(x.first).trim()).join(', ');
    appendKids(m.body, [
      h('p', { class: 'muted', style: { margin: '0' }, text: draft.householdName.trim() + ': ' + names + '.' }),
      choices,
      h('div', { class: 'warn-note', text: 'O jogo atual será substituído. Se quiser mantê-lo, salve antes em Opções → Jogos salvos.' }),
    ]);
    const back = h('button', { class: 'btn ghost', type: 'button', id: 'cf-back' }, [emo('←'), ' Voltar']);
    back.addEventListener('click', () => { draft.step = 1; renderFamilyStep(m, draft); });
    const go = h('button', { class: 'btn primary', type: 'button', id: 'cf-go' }, [emo('🔑'), 'Mudar-se!']);
    go.addEventListener('click', () => {
      const surname = surnameOf(draft.householdName) || randomOf((D().NAMES || {}).last || ['Silva']);
      const members = draft.members.map((x) => ({
        name: String(x.first).trim().slice(0, 20) + ' ' + surname, gender: x.gender,
        colors: Object.assign({}, x.colors), personality: Object.assign({}, x.personality), skills: {},
      }));
      go.disabled = true;
      const ok = mcall('newGame', { householdName: draft.householdName.trim().slice(0, 40), members, lot: draft.lot });
      if (ok) {
        closeAllModals();
        toast('Bem-vindos à nova casa, ' + draft.householdName.trim() + '!', 'good', { icon: '🔑' });
      } else { go.disabled = false; toast('Não foi possível criar a família.', 'bad'); }
    });
    m.foot.appendChild(back);
    m.foot.appendChild(go);
  }
  function memberCard(m, draft, mem, idx, MAXP, PK, PL, PAL) {
    const cv = h('canvas', { width: '64', height: '64', 'aria-hidden': 'true' });
    const redraw = () => drawFace(cv, { colors: mem.colors, gender: mem.gender }, { size: 64, mood: 40 });
    redraw();
    const nameIn = h('input', { type: 'text', id: 'cf-name-' + idx, maxlength: '20', value: mem.first, autocomplete: 'off' });
    nameIn.addEventListener('input', () => { mem.first = nameIn.value; });
    const gSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Gênero' });
    for (const [g, lab] of [['f', 'Feminino'], ['m', 'Masculino']]) {
      const b = h('button', { type: 'button', id: 'cf-g-' + idx + '-' + g, 'aria-pressed': mem.gender === g ? 'true' : 'false', text: lab });
      b.addEventListener('click', () => { mem.gender = g; for (const c of gSeg.children) c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); redraw(); });
      gSeg.appendChild(b);
    }
    const colorRows = [];
    for (const [key, lab] of [['skin', 'Pele'], ['hair', 'Cabelo'], ['shirt', 'Blusa'], ['pants', 'Calça']]) {
      const row = h('div', { class: 'swatch-row', role: 'group', 'aria-label': lab });
      for (const col of (PAL[key] || [])) {
        const b = h('button', { class: 'cswatch', type: 'button', style: { background: col }, 'aria-label': lab + ' ' + col, 'aria-pressed': mem.colors[key] === col ? 'true' : 'false' });
        b.addEventListener('click', () => { mem.colors[key] = col; for (const c of row.children) c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); redraw(); });
        row.appendChild(b);
      }
      colorRows.push(h('div', { class: 'color-row' }, [h('span', { text: lab }), row]));
    }
    const points = h('span', { class: 'points' });
    const sliders = [];
    const updatePoints = () => {
      const used = PK.reduce((a, k) => a + num(mem.personality[k]), 0);
      const left = MAXP - used;
      points.textContent = left > 0 ? 'Pontos restantes: ' + left : 'Todos os ' + MAXP + ' pontos distribuídos';
      points.classList.toggle('zero', left <= 0);
      if (fillRef.el) fillRef.el.disabled = left <= 0;
    };
    const fillRef = { el: null };
    const traits = h('div', { class: 'traits' });
    for (const k of PK) {
      const out = h('output', { for: 'cf-p-' + idx + '-' + k, text: String(num(mem.personality[k])) });
      const inp = h('input', { type: 'range', id: 'cf-p-' + idx + '-' + k, min: '0', max: '10', step: '1', value: String(num(mem.personality[k])), 'aria-label': PL[k] || k });
      inp.addEventListener('input', () => {
        const others = PK.reduce((a, kk) => a + (kk === k ? 0 : num(mem.personality[kk])), 0);
        let v = clamp(Math.round(+inp.value), 0, 10);
        if (others + v > MAXP) v = Math.max(0, MAXP - others);
        mem.personality[k] = v;
        inp.value = String(v);
        out.textContent = String(v);
        updatePoints();
      });
      inp._out = out;
      sliders.push(inp);
      traits.appendChild(h('label', { class: 'trait-slider', for: 'cf-p-' + idx + '-' + k }, [h('span', { text: PL[k] || k }), inp, out]));
    }
    const fill = h('button', { class: 'btn small', type: 'button', id: 'cf-fill-' + idx, title: 'Distribui os pontos que faltam entre os traços' }, [emo('⚖️'), 'Distribuir o resto']);
    fill.addEventListener('click', () => {
      let left = MAXP - PK.reduce((a, k) => a + num(mem.personality[k]), 0);
      let guard = 0;
      // spread the remaining points one by one over the traits with room, lowest first (keeps the shape)
      while (left > 0 && guard++ < 200) {
        const open = PK.filter((k) => num(mem.personality[k]) < 10).sort((a, b) => num(mem.personality[a]) - num(mem.personality[b]));
        if (!open.length) break;
        mem.personality[open[0]] = num(mem.personality[open[0]]) + 1; left--;
      }
      PK.forEach((k, i) => { sliders[i].value = String(num(mem.personality[k])); sliders[i]._out.textContent = String(num(mem.personality[k])); });
      updatePoints();
      sfx('click');
    });
    fillRef.el = fill;
    updatePoints();
    const tools = h('div', { class: 'member-tools' });
    const rnd = h('button', { class: 'btn small', type: 'button', id: 'cf-rnd-' + idx }, [emo('🎲'), 'Sortear']);
    rnd.addEventListener('click', () => { const r = randomMember('', mem.gender); r.first = mem.first || r.first; draft.members[idx] = r; renderFamilyStep(m, draft); });
    tools.appendChild(rnd);
    if (draft.members.length > 1) {
      const rm = h('button', { class: 'btn small ghost', type: 'button', id: 'cf-rm-' + idx }, [emo('✕'), 'Remover']);
      rm.addEventListener('click', () => { draft.members.splice(idx, 1); renderFamilyStep(m, draft); });
      tools.appendChild(rm);
    }
    return h('div', { class: 'member' }, [
      h('div', { class: 'member-top' }, [cv, h('div', { class: 'field' }, [h('label', { for: 'cf-name-' + idx, text: 'Morador ' + (idx + 1) + ' · primeiro nome' }), nameIn, gSeg])]),
      colorRows,
      h('div', { class: 'section-label', text: 'Personalidade' }),
      h('div', { class: 'points-row' }, [points, fill]),
      traits,
      tools,
    ]);
  }

  // ---- first-run help card
  function showHelp() {
    let card = $('help-card');
    if (card) card.parentNode.removeChild(card);
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const items = touch ? [
      ['Toque num morador ou objeto', 'Abre o menu de ações.'],
      ['Toque no chão', 'Manda o morador selecionado andar até lá.'],
      ['Arraste com um dedo', 'Move a câmera. Pinça com dois dedos para aproximar.'],
      ['Retratos embaixo', 'Toque para trocar de morador; toque de novo para centralizar a câmera.'],
      ['Humor', 'O botão ao lado dos retratos abre as necessidades, habilidades e carreira.'],
      ['Comprar e Construir', 'Pausam o tempo. Toque no terreno para posicionar e confirme no botão.'],
    ] : [
      ['Clique num morador ou objeto', 'Abre o menu de ações em volta do cursor.'],
      ['Clique no chão', 'O morador selecionado anda até lá (Shift+clique adiciona uma parada).'],
      ['Câmera', 'Roda do mouse aproxima; botão direito arrasta; Q/E giram; WASD ou setas movem.'],
      ['Tempo', 'P ou Espaço pausa; 1, 2 e 3 escolhem a velocidade.'],
      ['Comprar', 'Escolha um item, R gira, clique para colocar, Esc cancela, Delete vende, Ctrl+Z desfaz.'],
      ['Construir', 'Cômodo desenha quatro paredes de uma vez; portas e janelas vão em paredes.'],
    ];
    card = h('section', { id: 'help-card', class: 'panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'help-title' }, [
      h('h2', { id: 'help-title', text: 'Bem-vindo ao Morada' }),
      h('p', { class: 'lead', text: 'Cuide das necessidades dos moradores, arrume um emprego, faça amigos e deixe a casa com a sua cara.' }),
      h('div', { class: 'help-grid' }, items.map(([b, s]) => h('div', {}, [h('b', { text: b }), h('span', { text: s })]))),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } }, [
        h('button', { class: 'btn primary', type: 'button', id: 'help-ok', on: { click: hideHelp } }, 'Entendi, vamos jogar'),
      ]),
    ]);
    ui.els.hud.appendChild(card);
    mcall('setPaused', 'help', true);
    const ok = $('help-ok');
    if (ok) { try { ok.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function hideHelp() {
    const card = $('help-card');
    if (card && card.parentNode) card.parentNode.removeChild(card);
    mcall('setPaused', 'help', false);
    if (!prefs.helpSeen) { prefs.helpSeen = true; savePrefs(); }
  }

  // ======================================================================
  // Bus wiring
  // ======================================================================
  let busBound = false;
  function bindBus() {
    if (busBound || !M.util || !M.util.bus) return;
    busBound = true;
    const B = M.util.bus;
    B.on('notify', (n) => {
      if (!n || !n.text) return;
      toast(n.text, n.kind || 'info', { focus: n.focus || null, id: n.id });
      if (!ui.logOpen) { ui.unread++; refreshLogCount(); }
      ui.sig.log = '';
      if (n.kind === 'career' || n.kind === 'good') sfx('chime');
      else if (n.kind === 'bad') sfx('error');
    });
    // repeated notifications are merged by the engine: update the toast on screen with the count
    B.on('notifyRepeat', (n) => {
      if (!n || !ui.els.toasts) return;
      const t = touchText(n.text || '');
      let node = Array.from(ui.els.toasts.children).find((x) => (n.id != null && x._id === n.id) || x._text === t);
      if (!node) node = toast(n.text, n.kind || 'info', { id: n.id });
      if (node && node._textEl) {
        let c = node._textEl.querySelector('.t-count');
        if (!c) { c = h('span', { class: 't-count' }); node._textEl.appendChild(c); }
        c.textContent = '×' + num(n.count, 2);
        node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
        if (node._timeout) { clearTimeout(node._timer); node._timer = setTimeout(() => dismissToast(node), node._timeout); }
      }
      ui.sig.log = '';
    });
    B.on('money', (m) => {
      if (!m) return;
      const d = num(m.delta);
      if (d) { moneyFloat(d); if (d > 0) sfx('coin'); }
      buildBuyDrawerMoneyState();
    });
    B.on('select', (p) => {
      if (p && p.simId != null) rcall('setSelected', p.simId);
      ui.sig.queue = ''; ui.sig.tab = '';
    });
    B.on('sims', () => { ui.sig.portraits = ''; });
    B.on('objects', () => {
      if (ui.buy.sel != null && !objById(ui.buy.sel)) deselectObject();
      if (ui.build.sel != null && !objById(ui.build.sel)) { ui.build.sel = null; ui.build.confirm = false; rcall('hideTileGhost'); renderToolbar(); }
      ui._plx = null; ui._interCache = null;
      refreshChecklist();
    });
    B.on('lot', () => { ui._plx = null; refreshChecklist(); });
    B.on('saved', (r) => {
      if (!r) return;
      let txt = r.ok ? (r.where === 'cloud' ? 'Salvo ☁️' : 'Salvo neste aparelho') : 'Falha ao salvar';
      // CONTRACT_V2 §5: the chip names the active slot ("Salvo ☁️ · Espaço 2")
      let label = r.slotLabel || '';
      if (!label && M.main && typeof M.main.slotLabel === 'function') { try { label = M.main.slotLabel(r.slot) || ''; } catch (e) { label = ''; } }
      if (label) txt += ' · ' + label;
      setText(ui.els.saveChip, txt);
      if (label) ui.els.saveChip.title = label + (S() && S().householdName ? ' · ' + S().householdName : '');
      ui.els.saveChip.style.color = r.ok ? '' : 'var(--bad)';
      clearTimeout(ui._saveTimer);
      ui._saveTimer = setTimeout(() => setText(ui.els.saveChip, ''), 4000);
    });
    B.on('speed', () => refreshClock());
    B.on('loaded', (p) => {
      if (p && p.where) toast(p.where === 'cloud' ? 'Jogo carregado da nuvem.' : 'Jogo carregado deste aparelho.', 'info', { icon: '📂', timeout: 3000 });
    });
  }

  // ======================================================================
  // Move-in checklist (improvement): after moving to an empty lot, a small card lists the essentials and
  // ticks itself as they are bought / built. Stored as state.settings.moveInChecklist (true while active).
  // ======================================================================
  const ESSENTIALS = [
    { key: 'bed', label: 'Cama', icon: '🛏️', test: (o, d) => d.cat === 'beds' },
    { key: 'fridge', label: 'Geladeira', icon: '🧊', test: (o) => /^fridge/.test(o.type) },
    { key: 'stove', label: 'Fogão', icon: '🔥', test: (o) => o.type === 'stove' },
    { key: 'counter', label: 'Balcão', icon: '🧱', test: (o) => o.type === 'counter' },
    { key: 'toilet', label: 'Vaso sanitário', icon: '🚽', test: (o) => /^toilet/.test(o.type) },
    { key: 'shower', label: 'Chuveiro ou banheira', icon: '🚿', test: (o) => o.type === 'shower' || o.type === 'bathtub' },
    { key: 'door', label: 'Porta', icon: '🚪', door: true },
  ];
  function essentialsStatus() {
    const st = S();
    if (!st) return [];
    const objs = Array.isArray(st.objects) ? st.objects : [];
    const walls = (st.lot && st.lot.walls) || {};
    let hasDoor = false;
    for (const k in walls) { const w = walls[k]; if (w && (w.t === 2 || w === 2)) { hasDoor = true; break; } }
    return ESSENTIALS.map((e) => ({ key: e.key, label: e.label, icon: e.icon, ok: e.door ? hasDoor : objs.some((o) => { const d = objDef(o); return d && e.test(o, d); }) }));
  }
  function refreshChecklist() {
    const el = ui.els.checklist;
    const st = S();
    if (!el || !st || !st.settings) return;
    const active = st.settings.moveInChecklist === true;
    if (!active || ui.mode === 'options') { if (!el.hidden) el.hidden = true; return; }
    const list = essentialsStatus();
    const done = list.filter((q) => q.ok).length;
    if (done === list.length) {
      st.settings.moveInChecklist = false;
      el.hidden = true;
      toast('Casa pronta para morar: cama, cozinha, banheiro e porta! ✓', 'good', { icon: '🏡' });
      return;
    }
    const sig = list.map((q) => (q.ok ? 1 : 0)).join('') + ':' + ui.narrow + ':' + !!ui._clMini;
    el.hidden = false;
    if (sig !== ui.sig.checklist) {
      ui.sig.checklist = sig;
      clear(el);
      const mini = ui._clMini != null ? ui._clMini : ui.narrow;
      el.classList.toggle('mini', mini);
      el.appendChild(h('h3', {}, [
        h('button', { class: 'btn small ghost', type: 'button', style: { padding: '0 4px', minHeight: '24px' }, 'aria-expanded': mini ? 'false' : 'true', title: mini ? 'Mostrar a lista' : 'Recolher', on: { click: () => { ui._clMini = !mini; ui.sig.checklist = ''; refreshChecklist(); } } },
          [emo('🏠'), ' Mudança ', h('span', { class: 'cl-prog', text: done + '/' + list.length }), mini ? ' ▾' : ' ▴']),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar a lista da mudança', title: 'Fechar', on: { click: () => { st.settings.moveInChecklist = false; el.hidden = true; } } }, '✕'),
      ]));
      el.appendChild(h('ul', {}, list.map((q) => h('li', { class: q.ok ? 'ok' : '' }, [h('span', { 'aria-hidden': 'true', text: q.ok ? '✓' : '○' }), emo(q.icon), h('span', { text: q.label })]))));
      el.appendChild(h('p', { class: 'cl-tip', text: 'Compre em Comprar; a porta e as paredes ficam em Construir (ferramenta Cômodo).' }));
    }
    // never cover the live dock: collapse when they would overlap
    if (ui.mode === 'live' && ui._clMini == null && !el.classList.contains('mini')) {
      const a = rectOf(el), b = rectOf(ui.els.needsPanel) || rectOf(ui.els.dock);
      if (overlaps(a, b, 4)) { el.classList.add('mini'); }
    }
  }
  function maybeStartChecklist() {
    const st = S();
    if (!st || !st.settings) return;
    const missing = essentialsStatus().filter((q) => !q.ok).length;
    st.settings.moveInChecklist = missing >= 3;
    ui._clMini = null; ui.sig.checklist = '';
    refreshChecklist();
  }

  // Improvement: when the selected character leaves the lot (work, hospital) offer to control someone at home
  function checkSelectedAway() {
    const sim = selectedSim();
    if (!sim) return;
    if (!sim.hidden) { ui.selAway = null; return; }
    if (ui.selAway === sim.id) return;
    ui.selAway = sim.id;
    const other = household().find((x) => x.id !== sim.id && !x.hidden);
    if (!other) return;
    toast(firstName(sim) + (sim.atWork ? ' foi trabalhar.' : ' saiu de casa.'), 'info', {
      icon: sim.atWork ? '💼' : '🚗', timeout: 10000,
      action: { label: 'Controlar ' + firstName(other), fn: () => { selectSim(other.id); focusSim(simById(other.id)); } },
    });
  }

  // ======================================================================
  // Public lifecycle
  // ======================================================================
  function refreshAll() {
    refreshClock();
    refreshMoney(1);
    refreshWallBtn();
    if (ui.mode === 'live') refreshDock(true);
  }
  function init() {
    loadPrefs();
    if (prefs.buyCat) ui.buy.cat = prefs.buyCat;
    if (prefs.buildTool && BUILD_TOOLS.some((t) => t.key === prefs.buildTool)) ui.build.tool = prefs.buildTool;
    if (prefs.floorIdx != null) ui.build.floor = clamp(num(prefs.floorIdx, 1), 0, Math.max(0, (D().FLOORS || [1]).length - 1));
    if (prefs.paperIdx != null) ui.build.paper = clamp(num(prefs.paperIdx, 0), 0, Math.max(0, (D().WALLPAPERS || [1]).length - 1));
    if ('roomFloor' in prefs) ui.build.roomFloor = prefs.roomFloor == null ? null : clamp(num(prefs.roomFloor, 1), 1, Math.max(1, (D().FLOORS || [1, 1]).length - 1));
    if (prefs.tab) ui.tab = prefs.tab;
    buildHud();
    if (!ui.inited) { bindInput(); bindBus(); }
    ui.inited = true;
    ui.mode = 'live';
    setTab(ui.tab);
    applyModeDom();
    ui.money.shown = null;
    const st = S();
    if (st && st.settings && st.settings.wallMode) rcall('setWallMode', st.settings.wallMode);
    const sel = selectedSim();
    if (sel) rcall('setSelected', sel.id);
    if (sel && sel.hidden) ui.selAway = sel.id;
    refreshAll();
    refreshChecklist();
    if (!prefs.helpSeen) setTimeout(showHelp, 350);
    // toasts requested before init (save.js / main.js during boot)
    const pend = ui.pendingToasts.splice(0);
    for (const t of pend) toast(t[0], t[1], t[2]);
    setTimeout(prerenderThumbs, 2500);
  }
  /** Called by M.main after a different state was loaded (load / import / new family). */
  function reset(info) {
    info = info || {};
    closePie();
    hideTip(true);
    clearBubbles();
    if (ui.mode !== 'live') {
      leaveMode(ui.mode);
      ui.mode = 'live';
      mcall('setPaused', 'buy', false);
      mcall('setPaused', 'build', false);
    }
    ui.buy.placing = null; ui.buy.sel = null;
    ui.build.drag = null; ui.build.sel = null;
    ui.undo = [];
    ui.selAway = null;
    ui._plx = null; ui._interCache = null;
    ui.sig = { portraits: '', queue: '', tab: '', rel: '', career: '', log: '', toolbar: '', checklist: '' };
    ui.trend = { simId: null, at: -1, vals: null, prev: null };
    ui.unread = 0; refreshLogCount();
    ui.money.shown = null;
    applyModeDom();
    const st = S();
    if (st && st.settings && st.settings.wallMode) rcall('setWallMode', st.settings.wallMode);
    const sel = selectedSim();
    if (sel) rcall('setSelected', sel.id);
    refreshAll();
    if (info.kind === 'new') maybeStartChecklist(); else { ui.sig.checklist = ''; refreshChecklist(); }
    if (info.kind === 'new' && sel) {
      // an empty lot: the family arrives at the mailbox by the street; frame the lot they are about to build on
      // (a point between them and the lot centre) instead of the road
      const L = st && st.lot;
      const hasWalls = !!(L && L.walls && Object.keys(L.walls).length);
      if (L && !hasWalls && isFinite(L.w) && isFinite(L.h)) {
        const cx = L.w / 2 - 0.5, cy = L.h / 2 - 0.5;
        rcall('focus', sel.x + (cx - sel.x) * 0.55, sel.y + (cy - sel.y) * 0.55);
      } else rcall('focus', sel.x, sel.y);
    }
    if (info.kind === 'load') toast('Jogo carregado' + (info.where === 'cloud' ? ' da nuvem.' : '.'), 'info', { icon: '📂', timeout: 3000 });
    else if (info.kind === 'import') toast('Jogo importado com sucesso.', 'good', { icon: '📥', timeout: 3500 });
  }
  /** Per-frame update from the main loop. */
  function update(dt) {
    if (!ui.inited) return;
    dt = num(dt, 0.016);
    const now = performance.now();
    keyboardPan(dt);
    updateBubbles();
    updateHover(now);
    refreshMoney(dt);
    if (now - ui.t5 >= 200) {
      ui.t5 = now;
      refreshClock();
      if (ui.mode === 'live') {
        refreshPortraits();
        const sim = selectedSim();
        if (sim) {
          setText(ui.els.needsName, sim.name);
          setText(ui.els.needsSub, simStatus(sim));
          refreshQueue(sim);
          if (ui.tab === 'needs' || ui.tab === 'skills' || ui.tab === 'pers') refreshTab(sim, false);
          const mm = moodOf(sim);
          const n = Math.min(5, Math.ceil(Math.abs(mm) / 20));
          const segs = ui.els.moodMeter.children;
          for (let i = 0; i < 5; i++) segs[i].classList.toggle('on', mm < 0 && (4 - i) < n);
          for (let i = 0; i < 5; i++) segs[6 + i].classList.toggle('on', mm > 0 && i < n);
          setText(ui.els.moodLabel, moodLabel(mm));
          ui.els.moodLabel.style.color = moodColorOf(sim);
          setText(ui.els.needsToggleLabel, moodLabel(mm));
          setText(ui.els.needsToggleIco, mm >= 20 ? '😊' : mm > -20 ? '🙂' : mm > -60 ? '😟' : '😫');
        } else refreshDock(false);
      }
    }
    if (now - ui.t1 >= 1000) {
      ui.t1 = now;
      if (ui.mode === 'live' && (ui.tab === 'career' || ui.tab === 'rel')) refreshTab(selectedSim(), false);
      refreshLog();
      if (ui.mode === 'live') checkSelectedAway();
      refreshChecklist();
    }
  }

  M.ui = {
    init, update, reset, offer, toast, choice, setMode, setTab, selectSim, showHelp, openOptions, openCreateFamily,
    get mode() { return ui.mode; },
    get ready() { return ui.inited; },
    closePie, openPie, undo, openOfferCard: (track, simId) => { const sim = simById(simId) || selectedSim(); return openOfferCard(offerFor(track, null), sim && sim.id, null); },
    // test hooks
    debug: {
      get ui() { return ui; },
      handleClick, liveClick, buyClick, startPlacing, stopPlacing, commitPlacement, rotatePlacing, setBuildTool, needColor, drawFace,
      buildDown, buildMove, buildUp, hideHelp, openSlots, openImport, doExport, selectObject, deselectObject, sellSelected,
      closeModal, refreshChecklist, maybeStartChecklist, resolveTarget, essentialsStatus, flashTip, showTip,
    },
  };
})(window.M = window.M || {});
