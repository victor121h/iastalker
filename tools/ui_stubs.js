// UI test stubs for Morada.
// Loaded by tools/ui_demo.html after the real module scripts and before save.js/ui.js/main.js.
// Each fake is installed ONLY when the real module is missing (or when forced with
// window.MORADA_FORCE_STUB_RENDER = true for the renderer), so the UI can be exercised
// before render.js/models.js exist.
//  - M.render: a 2D top-down canvas renderer implementing the ARCHITECTURE.md contract
//    (pick/pickTile/pickEdge/ghosts/project/simScreenPos/rotate/zoom/pan/focus...).
//  - M.data / M.world / M.engine: minimal contract-compatible fakes (2 characters, a few objects).
(function (M) {
  'use strict';

  // ------------------------------------------------------------------ fake data
  if (!M.data) {
    const I = (key, label, icon, extra) => Object.assign({ key, label, icon, anim: 'use', rates: {}, ads: {}, duration: 30 }, extra || {});
    const CATALOG_LIST = [
      { type: 'chair_wood', name: 'Cadeira de madeira', cat: 'seating', price: 80, w: 1, h: 1, ratings: { comfort: 2 }, interactions: [I('sit', 'Sentar', '🪑')] },
      { type: 'sofa_cheap', name: 'Sofá de tecido', cat: 'seating', price: 300, w: 2, h: 1, ratings: { comfort: 3, energy: 5 }, interactions: [I('sit', 'Sentar', '🛋️'), I('nap', 'Cochilar', '😴')] },
      { type: 'bed_double', name: 'Cama de casal simples', cat: 'beds', price: 450, w: 2, h: 2, ratings: { comfort: 7, energy: 8 }, interactions: [I('sleep', 'Dormir', '😴')] },
      { type: 'fridge_cheap', name: 'Geladeira simples', cat: 'appliances', price: 600, w: 1, h: 1, ratings: { hunger: 4 }, interactions: [I('snack', 'Lanche', '🥪'), I('cook', 'Preparar refeição', '🍳')] },
      { type: 'toilet', name: 'Vaso sanitário', cat: 'plumbing', price: 300, w: 1, h: 1, ratings: { bladder: 5 }, interactions: [I('use', 'Usar', '🚽')] },
      { type: 'tv_cheap', name: 'TV de tubo', cat: 'electronics', price: 85, w: 1, h: 1, ratings: { fun: 2 }, interactions: [I('watch', 'Assistir TV', '📺')] },
      { type: 'painting_cheap', name: 'Quadro de paisagem', cat: 'decor', price: 100, w: 1, h: 1, wall: true, noBlock: true, ratings: { room: 2 }, interactions: [] },
      { type: 'mailbox', name: 'Caixa de correio', cat: 'system', price: 0, w: 1, h: 1, buyable: false, interactions: [] },
    ];
    const CATALOG = {};
    for (const d of CATALOG_LIST) CATALOG[d.type] = d;
    M.data = {
      MOTIVES: ['hunger', 'energy', 'comfort', 'fun', 'hygiene', 'social', 'bladder', 'room'],
      MOTIVE_LABELS: { hunger: 'Fome', energy: 'Energia', comfort: 'Conforto', fun: 'Diversão', hygiene: 'Higiene', social: 'Social', bladder: 'Bexiga', room: 'Ambiente' },
      MOTIVE_ICONS: { hunger: '🍔', energy: '⚡', comfort: '🛋️', fun: '🎉', hygiene: '🧼', social: '💬', bladder: '🚽', room: '🏠' },
      SKILLS: ['cooking', 'mechanical', 'charisma', 'body', 'logic', 'creativity'],
      SKILL_LABELS: { cooking: 'Culinária', mechanical: 'Mecânica', charisma: 'Carisma', body: 'Corpo', logic: 'Lógica', creativity: 'Criatividade' },
      SKILL_ICONS: { cooking: '🍳', mechanical: '🔧', charisma: '🗣️', body: '💪', logic: '🧠', creativity: '🎨' },
      PERSONALITY: ['neat', 'outgoing', 'active', 'playful', 'nice'],
      PERSONALITY_LABELS: { neat: 'Organizado', outgoing: 'Extrovertido', active: 'Ativo', playful: 'Brincalhão', nice: 'Gentil' },
      PERSONALITY_OPPOSITES: { neat: 'Desleixado', outgoing: 'Tímido', active: 'Preguiçoso', playful: 'Sério', nice: 'Rabugento' },
      PERSONALITY_POINTS: 25,
      FLOORS: [{ key: 'grass', name: 'Grama', color: '#6aa84f', price: 0 }, { key: 'wood', name: 'Taco de madeira', color: '#b07d4f', price: 10 }, { key: 'tile', name: 'Cerâmica clara', color: '#e6e1d3', price: 10 }],
      WALLPAPERS: [{ key: 'white', name: 'Tinta branca', color: '#f2efe8', price: 10 }, { key: 'sky', name: 'Azul-céu', color: '#a9cbe0', price: 10 }],
      WALL_PRICES: { wall: 70, door: 150, window: 110 },
      CATEGORIES: [{ key: 'seating', label: 'Assentos', icon: '🛋️' }, { key: 'beds', label: 'Camas', icon: '🛏️' }, { key: 'appliances', label: 'Eletrodomésticos', icon: '🍳' }, { key: 'plumbing', label: 'Hidráulica', icon: '🚿' }, { key: 'electronics', label: 'Eletrônicos', icon: '📺' }, { key: 'decor', label: 'Decoração', icon: '🪴' }],
      CATALOG, CATALOG_LIST,
      CAREERS: {}, SOCIALS: {},
      NAMES: { f: ['Ana', 'Rita', 'Luana'], m: ['Caio', 'João', 'Davi'], last: ['Silva', 'Alves', 'Souza'] },
      PALETTES: { skin: ['#f6d7c3', '#c98e66', '#6b3f28'], hair: ['#1c1714', '#8a5a33', '#d8b26a'], shirt: ['#e4572e', '#2a9d8f', '#3a86ff'], pants: ['#1d3557', '#3d405b'] },
      MONEY: { startFamily: 6500, startEmpty: 20000 },
      interaction(type, key) { const d = CATALOG[type]; return d ? d.interactions.find((i) => i.key === key) || null : null; },
      def(type) { return CATALOG[type] || null; },
    };
  }

  // ------------------------------------------------------------------ fake world
  if (!M.world) {
    let S = null;
    const fp = (type, x, y, rot) => {
      const d = M.data.CATALOG[type] || { w: 1, h: 1 };
      const w = rot % 2 ? d.h : d.w, h = rot % 2 ? d.w : d.h;
      const out = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push({ x: x + i, y: y + j });
      return out;
    };
    M.world = {
      init(st) { S = st; },
      rebuild() {},
      inBounds: (x, y) => S && x >= 0 && y >= 0 && x < S.lot.w && y < S.lot.h,
      getWall: (k) => (S && S.lot.walls[k]) || null,
      setWall(k, t, c) { if (!t) delete S.lot.walls[k]; else S.lot.walls[k] = { t, c: c || 0 }; return true; },
      canBuildWall: () => ({ ok: true }),
      footprint: fp,
      rotatedSize(type, rot) { const d = M.data.CATALOG[type] || { w: 1, h: 1 }; return rot % 2 ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; },
      canPlace(type, x, y, rot, ignoreId) {
        for (const t of fp(type, x, y, rot)) {
          if (!M.world.inBounds(t.x, t.y)) return { ok: false, reason: 'Fora do terreno.', code: 'bounds' };
          const o = M.world.objectAt(t.x, t.y);
          if (o && o.id !== ignoreId) return { ok: false, reason: 'Já tem um objeto aqui.', code: 'overlap' };
        }
        return { ok: true, reason: '', code: 'ok' };
      },
      objectAt(x, y) { if (!S) return null; for (const o of S.objects) for (const t of fp(o.type, o.x, o.y, o.rot)) if (t.x === x && t.y === y) return o; return null; },
      wallSegmentsForDrag(x1, y1, x2, y2) {
        const out = [];
        if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) { const s = x2 > x1 ? 1 : -1; for (let x = x1; x !== x2; x += s) out.push('h,' + (s > 0 ? x : x - 1) + ',' + y1); }
        else { const s = y2 > y1 ? 1 : -1; for (let y = y1; y !== y2; y += s) out.push('v,' + x1 + ',' + (s > 0 ? y : y - 1)); }
        return out;
      },
      tilesInRect(x1, y1, x2, y2) { const out = []; for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push({ x, y }); return out; },
      setFloor(x, y, i) { S.lot.floors[y * S.lot.w + x] = i; },
    };
  }

  // ------------------------------------------------------------------ fake engine
  if (!M.engine) {
    let S = null;
    const emit = (e, p) => M.util.bus.emit(e, p);
    const mkSim = (id, name, g, colors, x, y) => ({
      id, name, gender: g, colors, personality: { neat: 6, outgoing: 5, active: 4, playful: 5, nice: 5 },
      motives: { hunger: 40, energy: 70, comfort: 10, fun: -20, hygiene: 60, social: -55, bladder: 80, room: 20 },
      skills: { cooking: 2.4, mechanical: 0, charisma: 1, body: 0, logic: 3.6, creativity: 0 }, career: null, relationships: {},
      x, y, facing: 0, queue: [], anim: 'idle', bubble: null, atWork: false, workReturnAt: 0, hidden: false, visitor: false,
      npcId: null, role: null, leaveAt: 0, lockouts: {}, asleep: false, seated: false,
    });
    function newGame() {
      S = {
        version: 1, householdName: 'Família Teste', seed: 1, nextId: 100, time: { day: 1, minute: 480 }, speed: 1, money: 6500,
        lot: { w: 24, h: 20, floors: new Array(480).fill(0), walls: {} },
        objects: [
          { id: 10, type: 'fridge_cheap', x: 8, y: 6, rot: 0, price: 600, boughtDay: 1 },
          { id: 11, type: 'sofa_cheap', x: 12, y: 9, rot: 0, price: 300, boughtDay: 1 },
          { id: 12, type: 'tv_cheap', x: 12, y: 6, rot: 0, price: 85, boughtDay: 1 },
          { id: 13, type: 'mailbox', x: 11, y: 18, rot: 2, price: 0, boughtDay: 1 },
        ],
        sims: [mkSim(1, 'Rita Teste', 'f', { skin: '#c98e66', hair: '#3b2a1e', shirt: '#2a9d8f', pants: '#3d405b' }, 10, 10),
          mkSim(2, 'Caio Teste', 'm', { skin: '#a86f4c', hair: '#1c1714', shirt: '#e4572e', pants: '#1d3557' }, 14, 11)],
        npcs: [], bills: [], lastBillDay: 1, notifications: [], settings: { freeWill: true, wallMode: 'cutaway', selectedSimId: 1 }, stats: { daysPlayed: 0 },
      };
      for (let y = 5; y < 13; y++) for (let x = 7; x < 17; x++) S.lot.floors[y * 24 + x] = 1;
      for (let x = 7; x < 17; x++) { S.lot.walls['h,' + x + ',5'] = { t: 1, c: 0 }; S.lot.walls['h,' + x + ',13'] = { t: x === 11 ? 2 : 1, c: 0 }; }
      for (let y = 5; y < 13; y++) { S.lot.walls['v,7,' + y] = { t: y === 8 ? 3 : 1, c: 0 }; S.lot.walls['v,17,' + y] = { t: 1, c: 0 }; }
      S.sims[0].relationships[2] = { daily: 65, lifetime: 75 };
      S.sims[1].relationships[1] = { daily: 60, lifetime: 70 };
      S.sims[0].queue.push({ id: 900, kind: 'object', objId: 12, interaction: 'watch', label: 'Assistir TV', icon: '📺', phase: 'do', source: 'player', elapsed: 10, data: { duration: 30 } });
      S.sims[0].bubble = { kind: 'think', icon: '💬', until: 1440 + 600 };
      M.world.init(S);
      return S;
    }
    const byId = (id) => S && S.sims.find((s) => s.id === id);
    const objById = (id) => S && S.objects.find((o) => o.id === id);
    M.engine = {
      init(st) { S = st; M.world.init(st); emit('sims'); emit('objects'); emit('lot'); return S; },
      newGame, get state() { return S; },
      update(dt) {
        if (!S) return;
        const before = Math.floor(S.time.minute);
        S.time.minute += dt;
        if (S.time.minute >= 1440) { S.time.minute -= 1440; S.time.day++; emit('day', { day: S.time.day }); }
        if (Math.floor(S.time.minute) !== before) emit('time', S.time);
        for (const s of S.sims) for (const k in s.motives) if (k !== 'room') s.motives[k] = Math.max(-100, s.motives[k] - dt * 0.05);
      },
      mood(s) { const v = Object.values(s.motives); return v.reduce((a, b) => a + b, 0) / v.length; },
      moodColor(s) { const m = M.engine.mood(s); return m > 20 ? '#64cf74' : m > -20 ? '#f2b33d' : '#e65a43'; },
      getInteractions(simId, objId) { const o = objById(objId); const d = o && M.data.CATALOG[o.type]; return d ? d.interactions.map((i, n) => ({ key: i.key, label: i.label, icon: i.icon, enabled: n !== 1, reason: n === 1 ? 'Precisa de mais habilidade.' : '' })) : []; },
      getSocials() { return [{ key: 'talk', label: 'Conversar', icon: '💬', enabled: true }, { key: 'joke', label: 'Contar piada', icon: '😂', enabled: true }, { key: 'hug', label: 'Abraçar', icon: '🤗', enabled: false, reason: 'Relação muito baixa.' }]; },
      queueInteraction(simId, objId, key) { const s = byId(simId); if (!s) return false; s.queue.push({ id: ++S.nextId, kind: 'object', objId, interaction: key, label: key, icon: '✨', phase: 'route', source: 'player' }); return true; },
      queueSocial(simId, t, key) { const s = byId(simId); if (!s) return false; s.queue.push({ id: ++S.nextId, kind: 'social', label: key, icon: '💬', phase: 'route', source: 'player' }); return true; },
      queueWalk(simId, x, y) { const s = byId(simId); if (!s) return false; s.queue.push({ id: ++S.nextId, kind: 'walk', x, y, label: 'Andar até aqui', icon: '🚶', phase: 'walk', source: 'player' }); return true; },
      cancelAction(simId, aid) { const s = byId(simId); if (!s) return false; const i = s.queue.findIndex((a) => a.id === aid); if (i < 0) return false; s.queue.splice(i, 1); return true; },
      buyObject(type, x, y, rot) { const d = M.data.CATALOG[type]; if (S.money < d.price) return { ok: false, reason: 'Dinheiro insuficiente.' }; const o = { id: ++S.nextId, type, x, y, rot, price: d.price, boughtDay: S.time.day }; S.objects.push(o); S.money -= d.price; emit('money', { money: S.money, delta: -d.price }); emit('objects'); return { ok: true, obj: o }; },
      sellObject(id) { const o = objById(id); if (!o) return { ok: false, refund: 0 }; S.objects.splice(S.objects.indexOf(o), 1); const r = Math.round(o.price * 0.85); S.money += r; emit('money', { money: S.money, delta: r }); emit('objects'); return { ok: true, refund: r }; },
      moveObject(id, x, y, rot) { const o = objById(id); if (!o) return { ok: false }; o.x = x; o.y = y; o.rot = rot; emit('objects'); return { ok: true }; },
      buildWall(k, t, c) { M.world.setWall(k, t, c); const cost = t ? 70 : -35; S.money -= cost; emit('money', { money: S.money, delta: -cost }); emit('lot'); return { ok: true, cost }; },
      paintFloor(x, y, i) { M.world.setFloor(x, y, i); emit('lot'); return { ok: true, cost: 10 }; },
      paintWall(k, i) { const w = S.lot.walls[k]; if (!w) return { ok: false, cost: 0 }; w.c = i; emit('lot'); return { ok: true, cost: 10 }; },
      payBill() { return { ok: true }; }, setFreeWill(v) { S.settings.freeWill = !!v; },
      addSim(spec) { const s = mkSim(++S.nextId, spec.name || 'Novo', spec.gender || 'f', spec.colors || {}, 11, 17); S.sims.push(s); emit('sims'); return s; },
      removeSim(id) { const i = S.sims.findIndex((s) => s.id === id); if (i >= 0) S.sims.splice(i, 1); emit('sims'); return true; },
      characters() { return S.sims; }, household() { return S.sims.filter((s) => !s.visitor); }, simById: byId, objectById: objById,
      selectSim(id) { S.settings.selectedSimId = id; emit('select', { simId: id }); }, setSpeed(v) { S.speed = v; },
      allAsleepOrAway() { return false; }, sellValue(id) { const o = objById(id); return o ? Math.round(o.price * 0.85) : 0; },
      wallCost(k, t) { return t ? 70 : -35; }, floorCost() { return 10; }, careerInfo() { return null; }, jobOffers() { return []; },
      relationships(simId) { const s = byId(simId); return s ? Object.keys(s.relationships).map((k) => ({ id: +k, name: (byId(+k) || {}).name || '?', daily: s.relationships[k].daily, lifetime: s.relationships[k].lifetime, friend: s.relationships[k].daily >= 50, household: true })) : []; },
      phoneBook() { return []; },
    };
  }

  // ------------------------------------------------------------------ fake renderer (2D)
  if (!M.render || window.MORADA_FORCE_STUB_RENDER) {
    const R = {};
    let canvas = null, ctx = null, st = null, container = null;
    const cam = { x: 12, y: 10, z: 30, rot: 0, rotAnim: 0 };
    let wallMode = 'cutaway', selected = null;
    let ghost = null, edgeGhost = null, tileGhost = null;
    const ST = () => (M.engine && M.engine.state) || st;
    function size() { return { w: canvas ? canvas.clientWidth : 800, h: canvas ? canvas.clientHeight : 600 }; }
    function w2s(wx, wz) {
      const a = cam.rotAnim * Math.PI / 2;
      const x = wx - cam.x, y = wz - cam.y;
      const xr = x * Math.cos(a) - y * Math.sin(a), yr = x * Math.sin(a) + y * Math.cos(a);
      const s = size();
      return { x: s.w / 2 + xr * cam.z, y: s.h / 2 + yr * cam.z };
    }
    function s2w(sx, sy) {
      const r = canvas.getBoundingClientRect();
      const s = size();
      const xr = (sx - r.left - s.w / 2) / cam.z, yr = (sy - r.top - s.h / 2) / cam.z;
      const a = -cam.rotAnim * Math.PI / 2;
      return { x: xr * Math.cos(a) - yr * Math.sin(a) + cam.x, y: xr * Math.sin(a) + yr * Math.cos(a) + cam.y };
    }
    function resize() {
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    R.init = function (cont, state) {
      container = cont; st = state;
      canvas = document.createElement('canvas');
      canvas.style.width = '100%'; canvas.style.height = '100%';
      cont.appendChild(canvas);
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
      if (state && state.lot) { cam.x = state.lot.w / 2; cam.y = state.lot.h / 2; }
    };
    R.dispose = function () { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); window.removeEventListener('resize', resize); canvas = null; };
    R.syncAll = R.syncObjects = R.syncLot = function () {};
    R.setWallMode = (m) => { wallMode = m; };
    R.rotate = (d) => { cam.rot = (cam.rot + (d > 0 ? 1 : -1) + 4) % 4; };
    R.zoom = (d) => { cam.z = Math.max(12, Math.min(90, cam.z * Math.exp(-d * 0.0015))); };
    R.pan = (dx, dy) => {
      const a = -cam.rotAnim * Math.PI / 2;
      const x = -dx / cam.z, y = -dy / cam.z;
      cam.x += x * Math.cos(a) - y * Math.sin(a); cam.y += x * Math.sin(a) + y * Math.cos(a);
    };
    R.focus = (x, y) => { cam.x = x + 0.5; cam.y = y + 0.5; };
    R.showGhost = (type, x, y, rot, valid) => { ghost = { type, x, y, rot, valid }; };
    R.hideGhost = () => { ghost = null; };
    R.showEdgeGhost = (keys, valid) => { edgeGhost = { keys: keys.slice(), valid }; };
    R.hideEdgeGhost = () => { edgeGhost = null; };
    R.showTileGhost = (tiles, valid) => { tileGhost = { tiles: tiles.slice(), valid }; };
    R.hideTileGhost = () => { tileGhost = null; };
    R.setSelected = (id) => { selected = id; };
    R.project = (wx, wy, wz) => { const p = w2s(wx, wz); const r = canvas.getBoundingClientRect(); return { x: p.x + r.left, y: p.y + r.top - wy * cam.z * 0.6, visible: true }; };
    R.simScreenPos = (id) => {
      const s = ST() && ST().sims.find((q) => q.id === id);
      if (!s || s.hidden) return { x: 0, y: 0, visible: false };
      return R.project(s.x + 0.5, 1.9, s.y + 0.5);
    };
    R.pickTile = (cx, cy) => {
      const S = ST(); if (!canvas || !S) return null;
      const w = s2w(cx, cy);
      const x = Math.floor(w.x), y = Math.floor(w.y);
      if (x < 0 || y < 0 || x >= S.lot.w || y >= S.lot.h) return null;
      return { x, y, fx: w.x, fy: w.y };
    };
    R.pick = (cx, cy) => {
      const S = ST(); if (!canvas || !S) return null;
      const w = s2w(cx, cy);
      let best = null, bd = 0.5;
      for (const s of S.sims) { if (s.hidden) continue; const d = Math.hypot(s.x + 0.5 - w.x, s.y + 0.5 - w.y); if (d < bd) { bd = d; best = s; } }
      if (best) return { kind: 'sim', id: best.id };
      const t = R.pickTile(cx, cy);
      if (!t) return null;
      const o = M.world.objectAt(t.x, t.y);
      if (o) return { kind: 'object', id: o.id };
      return { kind: 'tile', x: t.x, y: t.y };
    };
    R.pickEdge = (cx, cy) => {
      const S = ST(); if (!canvas || !S) return null;
      const w = s2w(cx, cy);
      const fx = w.x - Math.floor(w.x), fy = w.y - Math.floor(w.y);
      const x = Math.floor(w.x), y = Math.floor(w.y);
      const c = [[fy, 'h', x, y], [1 - fy, 'h', x, y + 1], [fx, 'v', x, y], [1 - fx, 'v', x + 1, y]].sort((a, b) => a[0] - b[0])[0];
      if (c[0] > 0.4) return null;
      return { key: c[1] + ',' + c[2] + ',' + c[3], x: c[2], y: c[3] };
    };
    function edgePts(key) {
      const p = key.split(','); const x = +p[1], y = +p[2];
      return p[0] === 'h' ? [w2s(x, y), w2s(x + 1, y)] : [w2s(x, y), w2s(x, y + 1)];
    }
    function poly(pts, fill, stroke) {
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }
    function rect(x, y, w, h, fill, stroke) { poly([w2s(x, y), w2s(x + w, y), w2s(x + w, y + h), w2s(x, y + h)], fill, stroke); }
    const EMO = { fridge_cheap: '🧊', sofa_cheap: '🛋️', tv_cheap: '📺', mailbox: '📮', bed_double: '🛏️', toilet: '🚽', chair_wood: '🪑' };
    R.frame = function (dt) {
      if (!canvas) return;
      const S = ST(); if (!S) return;
      const d = cam.rot - cam.rotAnim;
      cam.rotAnim += Math.abs(d) < 0.01 ? d : d * Math.min(1, dt * 10);
      if (Math.abs(cam.rot - cam.rotAnim) > 2) cam.rotAnim = cam.rot;
      const s = size();
      const m = S.time.minute;
      const night = m < 360 || m > 1140;
      ctx.fillStyle = night ? '#0f1f2c' : '#2c4a3a';
      ctx.fillRect(0, 0, s.w, s.h);
      const F = (M.data.FLOORS || []);
      for (let y = 0; y < S.lot.h; y++) for (let x = 0; x < S.lot.w; x++) {
        const f = F[S.lot.floors[y * S.lot.w + x] || 0] || { color: '#6aa84f' };
        rect(x, y, 1, 1, f.color, 'rgba(0,0,0,0.08)');
      }
      if (tileGhost) for (const t of tileGhost.tiles) rect(t.x, t.y, 1, 1, tileGhost.valid ? 'rgba(120,230,140,0.45)' : 'rgba(240,90,70,0.45)');
      for (const o of S.objects) {
        const fp = M.world.footprint(o.type, o.x, o.y, o.rot) || [];
        for (const t of fp) rect(t.x + 0.06, t.y + 0.06, 0.88, 0.88, '#d9cbb0', '#7a6a50');
        const c = fp.reduce((a, t) => ({ x: a.x + t.x + 0.5, y: a.y + t.y + 0.5 }), { x: 0, y: 0 });
        const p = w2s(c.x / fp.length, c.y / fp.length);
        ctx.font = Math.round(cam.z * 0.6) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(EMO[o.type] || '📦', p.x, p.y);
      }
      ctx.lineCap = 'round';
      for (const k in S.lot.walls) {
        const wv = S.lot.walls[k]; const [a, b] = edgePts(k);
        ctx.lineWidth = wallMode === 'down' ? 3 : 6;
        ctx.strokeStyle = wv.t === 2 ? '#8a5a33' : wv.t === 3 ? '#9fd3ea' : '#f2efe8';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      if (edgeGhost) for (const k of edgeGhost.keys) {
        const [a, b] = edgePts(k);
        ctx.lineWidth = 7; ctx.strokeStyle = edgeGhost.valid ? 'rgba(120,230,140,0.9)' : 'rgba(240,90,70,0.9)';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      if (ghost) for (const t of M.world.footprint(ghost.type, ghost.x, ghost.y, ghost.rot) || []) rect(t.x, t.y, 1, 1, ghost.valid ? 'rgba(120,230,140,0.55)' : 'rgba(240,90,70,0.55)', '#fff');
      for (const sim of S.sims) {
        if (sim.hidden) continue;
        const p = w2s(sim.x + 0.5, sim.y + 0.5);
        if (sim.id === selected) { ctx.strokeStyle = '#f7c548'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, cam.z * 0.42, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = (sim.colors && sim.colors.shirt) || '#888';
        ctx.beginPath(); ctx.arc(p.x, p.y, cam.z * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (sim.colors && sim.colors.skin) || '#c98e66';
        ctx.beginPath(); ctx.arc(p.x, p.y - cam.z * 0.1, cam.z * 0.15, 0, Math.PI * 2); ctx.fill();
        if (sim.id === selected && M.engine.moodColor) {
          ctx.fillStyle = M.engine.moodColor(sim);
          ctx.beginPath(); ctx.arc(p.x, p.y - cam.z * 0.75, cam.z * 0.12, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
    R.isStub = true;
    R.noThree = true;
    M.render = R;
  }
})(window.M = window.M || {});
