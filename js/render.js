/*
 * Morada — M.render
 * THREE scene for the lot: camera rig (4 yaw steps, zoom, pan), ground + street + neighbourhood,
 * floors, walls (doors/windows, cutaway), objects, characters, day/night lighting, lamp lights,
 * picking, placement ghosts and screen projection for HTML overlays.
 *
 * Reads the game state (M.engine.state if available, else the state given to init) and the
 * static tables in M.data at call time. Never mutates the state.
 * See notes/render.md for additions to the ARCHITECTURE.md API.
 */
(function (M) {
  'use strict';

  const PI = Math.PI, HP = PI / 2, TAU = PI * 2;
  const WALL_H = 2.6, WALL_T = 0.1, HT = WALL_T / 2, CUT_H = 0.4, CAP_T = 0.025;
  const FLOOR_Y = 0.004;
  const MAX_LAMPS = 8;
  const DEFAULT_FLOORS = [
    { key: 'grass', color: '#6aa84f' }, { key: 'wood', color: '#b07d4f' }, { key: 'tile', color: '#e6e1d3' },
    { key: 'concrete', color: '#a7a39b' }, { key: 'carpet', color: '#4f6d8f' },
  ];
  const DEFAULT_WALLPAPERS = [{ key: 'white', color: '#f2efe8' }];
  // anims during which the character rests ON the object under it
  const ON_ANIMS = { sit: 1, sleep: 1, toilet: 1, shower: 1, bath: 1, exercise: 1 };

  const S = {
    inited: false, container: null, state: null, renderer: null, scene: null, camera: null,
    groups: {}, dirty: { lot: true, objects: true, sims: true }, time: 0, animT: 0, checkT: 0,
    cam: { tx: 12, tz: 10, gx: 12, gz: 10, yaw: PI / 4, yawGoal: PI / 4, k: 0, pitch: 50 * PI / 180, dist: 30, distGoal: 30 },
    wallMode: 'cutaway', selectedId: null, lotW: 0, lotH: 0,
    walls: null, objs: new Map(), chars: new Map(), tileBlock: [], tileSurface: [],
    lampPool: [], minute: 480, minuteInit: false, night: 0, cutSig: '', lotSig: '', objSig: '', regions: null,
    ghost: null, edgeGhost: null, tileGhost: null, size: { w: 800, h: 600 }, ro: null, unsub: [],
    tileItem: [], hiddenObjs: new Set(), wallsUpOverride: false, carsReady: false, departing: [],
    insets: null, userCamT: -1e9, frameT: 0,
  };

  // ------------------------------------------------------------------ helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // real time in seconds (camera idle detection must not depend on the frame rate)
  function nowS() { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; }
  function st() {
    const e = M.engine;
    let s = null;
    try { s = e && e.state; } catch (err) { s = null; }
    return s || S.state;
  }
  function data() { return M.data || {}; }
  function catalog() { return data().CATALOG || {}; }
  function defOf(type) { const c = catalog(); return (c && c[type]) || null; }
  function floorsTable() { const f = data().FLOORS; return Array.isArray(f) && f.length ? f : DEFAULT_FLOORS; }
  function wallpapers() { const w = data().WALLPAPERS; return Array.isArray(w) && w.length ? w : DEFAULT_WALLPAPERS; }
  function col(hex) { return M.models && M.models.color ? M.models.color(hex) : new THREE.Color(hex).convertSRGBToLinear(); }
  function lotSize() {
    const s = st();
    const w = s && s.lot && s.lot.w > 0 ? s.lot.w | 0 : 24;
    const h = s && s.lot && s.lot.h > 0 ? s.lot.h | 0 : 20;
    return { w: w, h: h };
  }
  function wallAt(walls, key) {
    const e = walls && walls[key];
    if (e == null) return null;
    if (typeof e === 'number') return e > 0 ? { t: e | 0, c: 0 } : null;
    if (typeof e === 'object' && e.t > 0) return e;
    return null;
  }
  function baseSize(type) {
    const d = defOf(type);
    return { w: Math.max(1, (d && d.w) | 0 || 1), h: Math.max(1, (d && d.h) | 0 || 1) };
  }
  function normRot(r) { r = (r | 0) % 4; return r < 0 ? r + 4 : r; }
  // identical to M.world.modelTransform (ARCHITECTURE rotation math)
  function modelTransform(type, x, y, rot) {
    rot = normRot(rot);
    const b = baseSize(type);
    const off = rot === 1 ? [b.h, 0] : rot === 2 ? [b.w, b.h] : rot === 3 ? [0, b.w] : [0, 0];
    return { x: (+x || 0) + off[0], z: (+y || 0) + off[1], rotY: -rot * HP };
  }
  function rotatedSize(type, rot) {
    const b = baseSize(type);
    return normRot(rot) % 2 ? { w: b.h, h: b.w } : b;
  }
  function wallEdgeBehind(x, y, rot) {
    rot = normRot(rot);
    return rot === 0 ? 'h,' + x + ',' + y : rot === 1 ? 'v,' + (x + 1) + ',' + y : rot === 2 ? 'h,' + x + ',' + (y + 1) : 'v,' + x + ',' + y;
  }
  function seeded(seed) {
    if (M.util && M.util.rng) return M.util.rng(seed);
    let a = seed >>> 0 || 1;
    return function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  }
  function angleLerp(a, b, k) {
    let d = (b - a) % TAU;
    if (d > PI) d -= TAU; else if (d < -PI) d += TAU;
    return a + d * k;
  }

  // r128 culls an InstancedMesh by its base geometry's bounding sphere (at the origin), not by its instances:
  // every instanced mesh here spans the lot, so culling is off
  function newInst(geo, mat, n) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false;
    return m;
  }

  // ------------------------------------------------------------------ canvas textures
  const texCache = {};
  function canvasTex(key, size, draw, repeat) {
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    draw(g, size);
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = S.renderer ? Math.min(8, S.renderer.capabilities.getMaxAnisotropy()) : 1;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    texCache[key] = t;
    return t;
  }
  function mixHexR(a, b, t) { const c = new THREE.Color(a); c.lerp(new THREE.Color(b), t); return '#' + c.getHexString(); }
  function shade(hex, f) {
    const c = new THREE.Color(hex);
    if (f >= 0) c.lerp(new THREE.Color('#ffffff'), f); else c.lerp(new THREE.Color('#000000'), -f);
    return '#' + c.getHexString();
  }
  function noise(g, s, base, n, amp, sizeMin, sizeMax, seed) {
    const r = seeded(seed || 7);
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      const f = (r() - 0.5) * 2 * amp;
      g.fillStyle = shade(base, f);
      const w = sizeMin + r() * (sizeMax - sizeMin);
      g.globalAlpha = 0.35 + r() * 0.4;
      g.fillRect(r() * s, r() * s, w, w);
    }
    g.globalAlpha = 1;
  }
  function floorTexture(idx) {
    const F = floorsTable()[idx] || floorsTable()[1] || { key: 'wood', color: '#b07d4f' };
    const base = F.color || '#b07d4f';
    const key = 'floor:' + (F.key || idx) + ':' + base;
    return canvasTex(key, 128, function (g, s) {
      const r = seeded(idx * 97 + 13);
      switch (F.key) {
        case 'wood': case 'parquet_light': {
          const rows = 4;
          for (let i = 0; i < rows; i++) {
            const y = i * s / rows;
            const off = (i % 2) * s * 0.5;
            for (let j = -1; j < 2; j++) {
              g.fillStyle = shade(base, (r() - 0.5) * 0.16);
              g.fillRect(off + j * s, y, s, s / rows);
              g.fillStyle = shade(base, -0.28);
              g.fillRect(off + j * s, y, 2, s / rows);
            }
            for (let k = 0; k < 6; k++) {
              g.strokeStyle = shade(base, -0.1 - r() * 0.08); g.globalAlpha = 0.35; g.lineWidth = 1;
              g.beginPath(); const yy = y + 3 + r() * (s / rows - 6); g.moveTo(0, yy); g.lineTo(s, yy + (r() - 0.5) * 3); g.stroke();
            }
            g.globalAlpha = 1;
            g.fillStyle = shade(base, -0.32); g.fillRect(0, y, s, 1.5);
          }
          break;
        }
        case 'parquet': {
          const n = 4, c = s / n;
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const horiz = (i + j) % 2 === 0;
            for (let k = 0; k < 3; k++) {
              g.fillStyle = shade(base, (r() - 0.5) * 0.22);
              if (horiz) g.fillRect(i * c, j * c + k * c / 3, c, c / 3); else g.fillRect(i * c + k * c / 3, j * c, c / 3, c);
              g.fillStyle = shade(base, -0.35);
              if (horiz) g.fillRect(i * c, j * c + k * c / 3, c, 1); else g.fillRect(i * c + k * c / 3, j * c, 1, c);
            }
          }
          break;
        }
        case 'tile': case 'terracotta': {
          const n = 2, c = s / n;
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            g.fillStyle = shade(base, (r() - 0.5) * (F.key === 'terracotta' ? 0.18 : 0.06));
            g.fillRect(i * c, j * c, c, c);
          }
          g.fillStyle = F.key === 'terracotta' ? shade(base, 0.25) : shade(mixHexR(base, '#8a7a66', 0.35), -0.3);
          for (let i = 0; i <= n; i++) { g.fillRect(i * c - 1.5, 0, 3, s); g.fillRect(0, i * c - 1.5, s, 3); }
          if (F.key === 'tile') { g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g.fillRect(i * c + 4, j * c + 4, c * 0.35, 2); }
          break;
        }
        case 'checker': {
          const n = 2, c = s / n;
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            g.fillStyle = (i + j) % 2 ? '#585d68' : shade(base, 0.3);
            g.fillRect(i * c, j * c, c, c);
          }
          break;
        }
        case 'carpet': noise(g, s, base, 2500, 0.12, 1, 2, idx + 3); break;
        case 'concrete': {
          noise(g, s, base, 900, 0.1, 1, 3, idx + 5);
          g.fillStyle = shade(base, -0.2); g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
          break;
        }
        case 'stone': {
          g.fillStyle = shade(base, -0.3); g.fillRect(0, 0, s, s);
          for (let i = 0; i < 60; i++) {
            g.fillStyle = shade(base, (r() - 0.5) * 0.2);
            const x = r() * s, y = r() * s, w = 10 + r() * 14, h = 8 + r() * 12;
            g.beginPath();
            g.ellipse(x, y, w / 2, h / 2, r() * PI, 0, TAU); g.fill();
            g.beginPath(); g.ellipse((x + s / 2) % s, y, w / 2, h / 2, r() * PI, 0, TAU); g.fill();
          }
          break;
        }
        case 'marble': {
          g.fillStyle = base; g.fillRect(0, 0, s, s);
          for (let i = 0; i < 7; i++) {
            g.strokeStyle = shade(base, -0.18 - r() * 0.15); g.globalAlpha = 0.5; g.lineWidth = 0.6 + r() * 1.2;
            g.beginPath(); let x = r() * s, y = 0; g.moveTo(x, y);
            while (y < s) { x += (r() - 0.5) * 18; y += 6 + r() * 10; g.lineTo(x, y); }
            g.stroke();
          }
          g.globalAlpha = 1;
          g.fillStyle = shade(base, -0.12); g.fillRect(0, 0, s, 1.5); g.fillRect(0, 0, 1.5, s);
          break;
        }
        default: noise(g, s, base, 600, 0.08, 1, 3, idx + 11);
      }
    });
  }
  // the catalog grass colour, toned down (less saturated, slightly olive) for the lawn
  function lawnBase() {
    const F = floorsTable()[0];
    const c = new THREE.Color((F && F.color) || '#6aa84f');
    const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h - 0.025, hsl.s * 0.62, hsl.l * 0.98);
    return '#' + c.getHexString();
  }
  function grassTexture() {
    const base = lawnBase();
    return canvasTex('grass:' + base, 256, function (g, s) {
      const r = seeded(4242);
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = shade(base, (r() - 0.45) * 0.3);
        g.globalAlpha = 0.25 + r() * 0.35;
        const x = r() * s, y = r() * s;
        g.fillRect(x, y, 1 + r() * 2, 2 + r() * 4);
      }
      g.globalAlpha = 0.07;
      for (let i = 0; i < 40; i++) {
        g.fillStyle = shade(base, (r() - 0.5) * 0.3);
        g.beginPath(); g.arc(r() * s, r() * s, 6 + r() * 16, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }, true);
  }
  function asphaltTexture() {
    return canvasTex('asphalt', 128, function (g, s) { noise(g, s, '#4a4c52', 1800, 0.18, 1, 2, 99); }, true);
  }
  function sidewalkTexture() {
    return canvasTex('sidewalk', 128, function (g, s) {
      noise(g, s, '#c9c4ba', 700, 0.06, 1, 3, 55);
      g.fillStyle = '#a9a398'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
    }, true);
  }
  function blobTexture() {
    return canvasTex('blob', 64, function (g, s) {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }

  // ------------------------------------------------------------------ init
  function init(container, state) {
    if (state) S.state = state;
    if (S.inited) {
      if (container && container !== S.container) attachTo(container);
      S.dirty.lot = S.dirty.objects = S.dirty.sims = true;
      syncAll();
      return;
    }
    if (typeof THREE === 'undefined') { console.error('[render] THREE not loaded'); return; }
    S.container = container || document.body;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.12;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.style.display = 'block';
    r.domElement.style.width = '100%';
    r.domElement.style.height = '100%';
    r.domElement.style.touchAction = 'none';
    r.domElement.className = 'morada-canvas';
    S.renderer = r;
    attachTo(S.container);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#a8d6f2');
    scene.fog = new THREE.Fog(new THREE.Color('#a8d6f2'), 70, 170);
    S.scene = scene;
    S.camera = new THREE.PerspectiveCamera(30, S.size.w / S.size.h, 0.5, 400);

    const names = ['ground', 'env', 'dress', 'floors', 'walls', 'objects', 'chars', 'fx', 'ghost', 'lights'];
    for (const n of names) { const g = new THREE.Group(); g.name = n; scene.add(g); S.groups[n] = g; }

    // lights
    S.hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 0.8);
    scene.add(S.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);
    S.sun = sun;
    for (let i = 0; i < MAX_LAMPS; i++) {
      const pl = new THREE.PointLight(0xffc98a, 0, 4.3, 2);
      pl.castShadow = false;
      pl.position.set(-100, -100, -100);
      S.groups.lights.add(pl);
      S.lampPool.push(pl);
    }

    S.raycaster = new THREE.Raycaster();
    S.tmpV = new THREE.Vector3(); S.tmpV2 = new THREE.Vector3(); S.tmpV3 = new THREE.Vector3(); S.ndc = new THREE.Vector2();

    const s0 = st();
    if (s0 && s0.settings) {
      if (s0.settings.wallMode === 'up' || s0.settings.wallMode === 'down' || s0.settings.wallMode === 'cutaway') S.wallMode = s0.settings.wallMode;
      if (s0.settings.selectedSimId != null) S.selectedId = s0.settings.selectedSimId;
    }

    // bus
    const bus = M.util && M.util.bus;
    if (bus && bus.on) {
      const on = function (evt, fn) { bus.on(evt, fn); S.unsub.push(function () { bus.off(evt, fn); }); };
      on('objects', function () { S.dirty.objects = true; });
      on('lot', function () { S.dirty.lot = true; S.dirty.objects = true; });
      on('sims', function () { S.dirty.sims = true; });
      on('select', function (p) { if (p && 'simId' in p) setSelected(p.simId); });
      // main calls setState()/init() itself before emitting 'state'; only react to a state we do not show yet
      on('state', function (p) { if (p && p.state && p.state !== S.state) setState(p.state); });
    }

    S.inited = true;
    syncAll();
    focusDefault(true);
    resize();
  }

  function attachTo(container) {
    S.container = container;
    container.appendChild(S.renderer.domElement);
    if (S.ro) { try { S.ro.disconnect(); } catch (e) { /* ignore */ } }
    if (typeof ResizeObserver !== 'undefined') {
      S.ro = new ResizeObserver(function () { resize(); });
      S.ro.observe(container);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();
  }

  function resize() {
    if (!S.renderer || !S.container) return;
    const rect = S.container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || S.container.clientWidth || window.innerWidth || 800));
    const h = Math.max(1, Math.round(rect.height || S.container.clientHeight || window.innerHeight || 600));
    if (w === S.size.w && h === S.size.h && S._sized) return;
    S._sized = true;
    S.size.w = w; S.size.h = h;
    S.renderer.setSize(w, h, false);
    // narrow (portrait) screens: pull the camera back so the horizontal coverage stays similar
    S.aspectK = clamp(1.25 / (w / h), 1, 2.4);
    if (S.camera) { S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); }
    // phones start a bit closer (the house fills the width instead of floating in the lawn)
    if (!S.camZoomTouched && !S.camPhoneInit && w / h < 0.8) {
      S.camPhoneInit = true;
      S.cam.dist = S.cam.distGoal = 23;
    }
  }

  function focusDefault(snap) {
    const s = st();
    const L = lotSize();
    let cx = L.w / 2, cz = L.h / 2;
    const walls = s && s.lot && s.lot.walls;
    if (walls) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const k in walls) {
        if (!wallAt(walls, k)) continue;
        const p = k.split(',');
        const x = +p[1], y = +p[2];
        x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); z0 = Math.min(z0, y); z1 = Math.max(z1, y + 1);
      }
      if (x0 < x1) { cx = (x0 + x1) / 2; cz = (z0 + z1) / 2; }
      else {
        // no house yet (empty lot): look at the household instead of the empty lot centre
        const hh = ((s && s.sims) || []).filter(function (q) { return q && !q.visitor && !q.hidden && isFinite(+q.x) && isFinite(+q.y); });
        if (hh.length) {
          cx = 0; cz = 0;
          for (const q of hh) { cx += +q.x + 0.5; cz += +q.y + 0.5; }
          cx /= hh.length; cz /= hh.length;
        }
      }
    }
    S.cam.gx = cx; S.cam.gz = cz;
    if (snap) { S.cam.tx = cx; S.cam.tz = cz; }
  }

  // ------------------------------------------------------------------ sync
  // swap the state the renderer reads when there is no engine (M.engine.state still wins when present)
  function setState(state) {
    if (state) S.state = state;
    S.hiddenObjs.clear();
    S.wallsUpOverride = false;
    S.dirty.lot = S.dirty.objects = S.dirty.sims = true;
    S.minuteInit = false;
    S.refocus = true;
  }
  function syncAll() {
    if (!S.inited) return;
    syncLot();
    syncObjects();
    syncCharacters();
  }

  function lotSignature(s) {
    if (!s || !s.lot) return '';
    const L = lotSize();
    let h = 0;
    const f = s.lot.floors || [];
    for (let i = 0; i < f.length; i++) h = (Math.imul(h, 31) + ((f[i] | 0) + 1)) | 0;
    const w = s.lot.walls || {};
    let n = 0;
    for (const k in w) {
      const e = wallAt(w, k); if (!e) continue;
      n++;
      for (let i = 0; i < k.length; i++) h = (Math.imul(h, 31) + k.charCodeAt(i)) | 0;
      h = (Math.imul(h, 31) + e.t * 13 + ((e.c | 0) + 1) * 7 + (e.cA != null ? ((e.cA | 0) + 3) * 101 : 0) + (e.cB != null ? ((e.cB | 0) + 5) * 197 : 0)) | 0;
    }
    return L.w + 'x' + L.h + ':' + f.length + ':' + n + ':' + h;
  }

  function syncLot() {
    S.dirty.lot = false;
    const s = st();
    if (!S.inited) return;
    const L = lotSize();
    if (L.w !== S.lotW || L.h !== S.lotH) {
      S.lotW = L.w; S.lotH = L.h;
      buildGround();
      buildEnvironment();
      updateShadowCamera();
    }
    S.lotSig = lotSignature(s);
    buildFloors();
    computeRegions();
    buildWalls();
    buildLotDressing();
    S.cutSig = '';
    patchScene();
  }

  // ------------------------------------------------------------------ ground / street / environment
  function disposeGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse(function (o) {
        if (o.isMesh || o.isInstancedMesh) {
          if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose();
          if (o.userData.ownMat && o.material) {
            if (o.material.map && o.material.map.__own) o.material.map.dispose();
            o.material.dispose();
          }
        }
      });
    }
  }
  // large-scale lawn tone (0..1 noise) shared by the coarse outer ground and the finer lot ground
  function lawnNoise(x, z) {
    const n1 = Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2.1) * Math.cos(z * 0.09 - Math.cos(x * 0.05) * 1.7);
    const n2 = Math.sin(x * 0.27 + z * 0.19 + Math.sin(z * 0.31) * 1.3);
    return clamp(0.5 + 0.38 * n1 + 0.14 * n2, 0, 1);
  }
  function lawnColor(x, z, out) {
    const n = lawnNoise(x, z);
    const v = 0.9 + 0.16 * n;
    // dry (warm) vs lush (cool) patches
    const warm = clamp((n - 0.55) * 2.2, 0, 1), cool = clamp((0.45 - n) * 2.2, 0, 1);
    out[0] = v * (1 + 0.07 * warm - 0.05 * cool); out[1] = v * (1 + 0.01 * warm); out[2] = v * (1 - 0.12 * warm + 0.03 * cool);
    return out;
  }
  // one ground grid with variable spacing: coarse far away, 1 tile across the lot (so the vertex colours can
  // carry soft mowing stripes and the large-scale tonal variation), no overlapping planes / overdraw
  function steps(a, b, st) { const out = []; for (let v = a; v < b - 1e-6; v += st) out.push(v); return out; }
  function groundGrid(L, margin) {
    const xs = steps(-margin, -14, 3).concat(steps(-14, 0, 2), steps(0, L.w, 1), steps(L.w, L.w + 14, 2), steps(L.w + 14, L.w + margin, 3), [L.w + margin]);
    const zs = steps(-margin, -14, 3).concat(steps(-14, 0, 2), steps(0, L.h, 2), steps(L.h, L.h + 14, 2), steps(L.h + 14, L.h + margin, 3), [L.h + margin]);
    const nx = xs.length, nz = zs.length;
    const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), colr = new Float32Array(nx * nz * 3);
    const c3 = [0, 0, 0];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = xs[i], z = zs[j];
      pos[k * 3] = x; pos[k * 3 + 1] = 0; pos[k * 3 + 2] = z;
      nor[k * 3 + 1] = 1;
      uv[k * 2] = x / 3; uv[k * 2 + 1] = -z / 3;
      lawnColor(x, z, c3);
      // mowing stripes: alternating 2-tile bands along x on the lot (vertex colours, soft edges)
      if (x >= 0 && x <= L.w && z >= 0 && z <= L.h) {
        const band = Math.floor(x / 2) % 2 === 0 ? 1.04 : 0.975;
        c3[0] *= band; c3[1] *= band; c3[2] *= band;
      }
      colr[k * 3] = c3[0]; colr[k * 3 + 1] = c3[1]; colr[k * 3 + 2] = c3[2];
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }
  function buildGround() {
    const g = S.groups.ground;
    disposeGroup(g);
    const L = { w: S.lotW, h: S.lotH };
    const margin = 60;
    const tex = grassTexture().clone();
    tex.needsUpdate = true; tex.__own = true;
    tex.repeat.set(1, 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(groundGrid(L, margin), mat);
    ground.receiveShadow = true; ground.userData.ownMat = true;
    ground.name = 'groundPlane';
    g.add(ground);
    S.groundMesh = ground;
    const one = new THREE.Vector3(1, 1, 1);

    // street along the south edge (z = h)
    const ext = 90;
    const x0 = L.w / 2 - ext, len = ext * 2;
    const swTex = sidewalkTexture().clone(); swTex.needsUpdate = true; swTex.__own = true; swTex.repeat.set(len / 1.5, 1);
    const sideMat = new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.9 });
    sideMat.userData = {};
    const sw = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 1.5), sideMat);
    sw.position.set(x0 + len / 2, 0.025 - 0.02, L.h + 0.75); sw.receiveShadow = true; sw.userData.ownMat = true;
    g.add(sw);
    const curbMat = new THREE.MeshStandardMaterial({ color: col('#bdb7ab'), roughness: 0.85 });
    const curb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.18), curbMat);
    curb.position.set(x0 + len / 2, 0.03, L.h + 1.59); curb.receiveShadow = true; curb.castShadow = true;
    g.add(curb);
    const asTex = asphaltTexture().clone(); asTex.needsUpdate = true; asTex.__own = true; asTex.repeat.set(len / 3, 6.4 / 3);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(len, 6.4), new THREE.MeshStandardMaterial({ map: asTex, roughness: 0.92 }));
    road.rotation.x = -HP; road.position.set(x0 + len / 2, 0.006, L.h + 1.68 + 3.2); road.receiveShadow = true; road.userData.ownMat = true;
    g.add(road);
    // dashed centre line + edge lines
    const dashMat = new THREE.MeshBasicMaterial({ color: col('#e9cb6a') });
    const dashGeo = new THREE.PlaneGeometry(1.2, 0.1);
    const nd = Math.floor(len / 3);
    const dashes = newInst(dashGeo, dashMat, nd);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-HP, 0, 0));
    for (let i = 0; i < nd; i++) dashes.setMatrixAt(i, m4.compose(new THREE.Vector3(x0 + i * 3 + 1, 0.009, L.h + 1.68 + 3.2), q, one));
    dashes.instanceMatrix.needsUpdate = true;
    g.add(dashes);
    const edgeMat = new THREE.MeshBasicMaterial({ color: col('#e9e6dc'), transparent: true, opacity: 0.7 });
    for (const z of [L.h + 1.9, L.h + 7.86]) {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.07), edgeMat);
      e.rotation.x = -HP; e.position.set(x0 + len / 2, 0.008, z);
      g.add(e);
    }
    // crosswalk at the lot's west corner
    const zebra = new THREE.MeshBasicMaterial({ color: col('#e6e3da'), transparent: true, opacity: 0.85 });
    for (let i = 0; i < 7; i++) {
      const zb = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42), zebra);
      zb.rotation.x = -HP; zb.position.set(-4.2, 0.009, L.h + 2.3 + i * 0.85);
      g.add(zb);
    }
    const curb2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.18), curbMat);
    curb2.position.set(x0 + len / 2, 0.03, L.h + 8.17); curb2.receiveShadow = true;
    g.add(curb2);
    const sw2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 1.6), sideMat);
    sw2.position.set(x0 + len / 2, 0.005, L.h + 9.06); sw2.receiveShadow = true;
    g.add(sw2);
    // driveway / front path: lot dressing (buildLotDressing), rebuilt with the walls
  }

  function buildEnvironment() {
    const g = S.groups.env;
    disposeGroup(g);
    if (!M.models || !M.models.build) return;
    const L = { w: S.lotW, h: S.lotH };
    const r = seeded(L.w * 131 + L.h * 7 + 3);
    // all environment pieces are merged into one mesh per material (static, ~3 draw calls)
    const staging = new THREE.Group();
    const add = function (key, x, z, rot, variant, scale, opts) {
      const m = M.models.build(key, Object.assign({ variant: variant }, opts || {}));
      m.position.set(x, 0, z);
      m.rotation.y = rot || 0;
      if (scale) m.scale.setScalar(scale);
      staging.add(m);
      return m;
    };
    // trees around the lot (outside), never on the street side
    const spots = [];
    for (let x = -3; x <= L.w + 3; x += 3.2) { spots.push([x + (r() - 0.5) * 1.2, -2.2 - r() * 2.5]); if (r() < 0.6) spots.push([x + (r() - 0.5) * 2, -6 - r() * 4]); }
    for (let z = 0; z <= L.h - 1; z += 3.0) {
      spots.push([-2.2 - r() * 2, z + (r() - 0.5)]); spots.push([L.w + 2.2 + r() * 2, z + (r() - 0.5)]);
      if (r() < 0.5) spots.push([-6.5 - r() * 3, z]); if (r() < 0.5) spots.push([L.w + 6.5 + r() * 3, z]);
    }
    spots.forEach(function (p, i) {
      const k = r();
      add(k < 0.25 ? 'env_pine' : k < 0.75 ? 'env_tree' : 'env_bush', p[0], p[1], r() * TAU, i, 0.9 + r() * 0.35);
    });
    // low hedge along the lot boundary (back and sides, just outside the lot so it never meets furniture)
    const hasHedge = M.models.has && M.models.has('env_hedge');
    if (hasHedge) {
      for (let x = 0; x < L.w; x++) add('env_hedge', x, -0.2, 0, x);
      for (let z = 0; z < L.h; z++) { add('env_hedge', -0.2, z + 1, HP, z + 40); add('env_hedge', L.w + 0.2, z, -HP, z + 80); }
    }
    // hedge row along the near sidewalk (both sides of the lot front, leaving the lot open)
    for (let x = -10; x < -1; x += 1.4) add('env_bush', x, L.h + 0.2 + r() * 0.2, r() * TAU, (x * 3) | 0, 0.85);
    for (let x = L.w + 1.5; x < L.w + 10; x += 1.4) add('env_bush', x, L.h + 0.2 + r() * 0.2, r() * TAU, (x * 5) | 0, 0.85);
    // street furniture: hydrant, manholes, drains, a parked car or two across the street
    const lamps = [];
    if (M.models.has && M.models.has('env_hydrant')) add('env_hydrant', L.w + 0.9, L.h + 1.2, 0, 1);
    if (M.models.has && M.models.has('env_manhole')) { add('env_manhole', L.w * 0.3, L.h + 4.4, 0, 1); add('env_manhole', L.w * 0.85, L.h + 5.6, 0, 2); }
    if (M.models.has && M.models.has('env_drain')) { add('env_drain', L.w * 0.15, L.h + 1.82, 0, 1); add('env_drain', L.w * 0.7, L.h + 1.82, 0, 2); add('env_drain', L.w * 0.45, L.h + 7.95, PI, 3); }
    add('carpool', L.w * 0.62, L.h + 7.55, PI, 0, 1, { car: 'sedan' });
    add('carpool', -9, L.h + 7.55, PI, 0, 1, { car: 'van' });
    // far side of the street: lamps, trees, houses
    for (let x = L.w / 2 - 36; x < L.w / 2 + 36; x += 9) { add('env_streetlamp', x, L.h + 8.7, PI, 0); lamps.push([x, L.h + 8.7 - 0.56]); }
    for (let x = L.w / 2 - 40; x < L.w / 2 + 40; x += 6.5) add('env_tree', x + 3 + (r() - 0.5), L.h + 10.6 + r() * 0.6, r() * TAU, (x | 0) + 50, 1.0 + r() * 0.2);
    let hv = 0;
    for (let x = L.w / 2 - 34; x < L.w / 2 + 34; x += 11) add('env_house', x + (r() - 0.5) * 2, L.h + 15.5, PI, hv++, 1);
    // neighbouring houses beside and behind the lot (silhouettes beyond the trees)
    add('env_house', -15, L.h - 3.5, 0, hv++, 1);
    add('env_house', -16, L.h - 15, 0, hv++, 1);
    add('env_house', L.w + 15, L.h - 3.5, 0, hv++, 1);
    add('env_house', L.w + 16, L.h - 15, 0, hv++, 1);
    for (let x = -6; x < L.w + 8; x += 12) add('env_house', x + (r() - 0.5) * 3, -17 - r() * 3, PI, hv++, 1);
    staging.updateMatrixWorld(true);
    const buckets = new Map();
    staging.traverse(function (o) {
      if (!o.isMesh) return;
      const k = o.userData.kind || 'solid';
      if (!buckets.has(k)) buckets.set(k, { mat: o.material, list: [] });
      buckets.get(k).list.push(o);
    });
    S.envLamps = [];
    buckets.forEach(function (b, kind) {
      const geo = mergeWorld(b.list);
      if (!geo) return;
      const mesh = new THREE.Mesh(geo, b.mat);
      mesh.userData.kind = kind;
      mesh.castShadow = kind === 'solid'; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      g.add(mesh);
      if (kind === 'glow') S.envLamps.push(mesh);
    });
    // light pools under the street lamps (night only)
    if (!S.poolMat) S.poolMat = lightDecalMat(poolTexture());
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-HP);
    const pm = newInst(pg, S.poolMat, lamps.length);
    const t = mtx();
    lamps.forEach(function (p, i) { t.p.set(p[0], 0.04, p[1]); t.q.set(0, 0, 0, 1); t.s.set(5.4, 1, 5.4); pm.setMatrixAt(i, t.m.compose(t.p, t.q, t.s)); });
    pm.instanceMatrix.needsUpdate = true;
    pm.renderOrder = 2; pm.visible = false; pm.name = 'lampPools';
    g.add(pm);
    S.poolMesh = pm;
  }

  // ------------------------------------------------------------------ lot dressing
  // a front path from the street to the main door and a driveway, drawn on outdoor grass tiles only
  // (real floor tiles always draw on top); rebuilt with the walls
  function concreteTex() {
    return canvasTex('drive', 128, function (g, s) {
      noise(g, s, '#bdb6a8', 900, 0.07, 1, 3, 77);
      g.fillStyle = 'rgba(90,80,70,0.35)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
    }, true);
  }
  function paverTex() {
    return canvasTex('pavers', 128, function (g, s) {
      g.clearRect(0, 0, s, s);
      const r = seeded(31);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const x = i * s / 2 + 6, y = j * s / 2 + 6, w = s / 2 - 12;
        g.fillStyle = shade('#c9bfae', (r() - 0.5) * 0.12);
        g.beginPath();
        if (g.roundRect) g.roundRect(x, y, w, w, 8); else g.rect(x, y, w, w);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 4, y + 4, w - 8, 3);
      }
    }, true);
  }
  function buildLotDressing() {
    const g = S.groups.dress;
    if (!g) return;
    disposeGroup(g);
    const s = st();
    const L = lotSize();
    const walls = (s && s.lot && s.lot.walls) || {};
    // outdoor tiles may carry the dressing; a real floor tile (player-made path) simply draws on top of it
    const free = function (x, y) { return x >= 0 && y >= 0 && x < L.w && y < L.h && lightIdAt(x, y) === 0; };
    // main door: an exterior door, preferring one that faces the street with a clear way to it
    let best = null;
    for (const k in walls) {
      const w = wallAt(walls, k);
      if (!w || (w.t | 0) !== 2) continue;
      const p = k.split(','); const kind = p[0], x = +p[1], y = +p[2];
      const A = kind === 'h' ? { x: x, y: y - 1 } : { x: x - 1, y: y }, B = { x: x, y: y };
      const outA = lightIdAt(A.x, A.y) === 0, outB = lightIdAt(B.x, B.y) === 0;
      if (outA === outB) continue;
      const o = outA ? A : B;
      if (o.x < 0 || o.y < 0 || o.x >= L.w || o.y >= L.h) continue;
      const score = o.y * 2 + (kind === 'h' && outB ? 6 : 0);
      if (!best || score > best.score) best = { kind: kind, o: o, score: score, side: outB ? 1 : -1 };
    }
    const pathTiles = [];
    if (best) {
      let x = best.o.x, y = best.o.y;
      if (best.kind === 'v') {
        // one step out of a side door, then toward the street
        if (free(x, y)) pathTiles.push({ x: x, y: y });
        x += best.side; if (!free(x, y)) x -= best.side;
      }
      let guard = 0;
      while (y < L.h && guard++ < 60) {
        if (!free(x, y) && !(pathTiles.length === 0 && x === best.o.x && y === best.o.y)) break;
        if (free(x, y)) pathTiles.push({ x: x, y: y });
        y++;
      }
      if (y < L.h) pathTiles.length = 0;          // blocked before reaching the street
    }
    const quad = new THREE.PlaneGeometry(1, 1); quad.rotateX(-HP);
    const t = mtx();
    if (pathTiles.length) {
      const pm = new THREE.MeshStandardMaterial({ map: paverTex(), transparent: true, roughness: 0.9, depthWrite: false });
      const im = newInst(quad.clone(), pm, pathTiles.length);
      im.userData.ownMat = true;
      pathTiles.forEach(function (tl, i) { t.p.set(tl.x + 0.5, 0.0025, tl.y + 0.5); t.q.set(0, 0, 0, 1); t.s.set(0.86, 1, 0.98); im.setMatrixAt(i, t.m.compose(t.p, t.q, t.s)); });
      im.instanceMatrix.needsUpdate = true; im.receiveShadow = true; im.renderOrder = 1; im.name = 'frontPath';
      g.add(im);
    }
    // driveway: 2 tiles wide, 6 deep, beside the house on outdoor grass, plus the apron across the sidewalk
    let hx0 = Infinity, hx1 = -Infinity;
    for (const k in walls) { if (!wallAt(walls, k)) continue; const p = k.split(','); hx0 = Math.min(hx0, +p[1]); hx1 = Math.max(hx1, +p[1]); }
    const pathX = pathTiles.length ? pathTiles[pathTiles.length - 1].x : -99;
    const cands = isFinite(hx0) ? [hx1 + 1, hx1 + 2, hx0 - 3, hx0 - 4] : [L.w - 5, 3];
    const depth = Math.min(6, L.h - 2);
    let dx = null;
    for (const c0 of cands) {
      if (c0 < 1 || c0 + 2 > L.w - 1) continue;
      if (Math.abs(c0 - pathX) < 2 || Math.abs(c0 + 1 - pathX) < 2) continue;
      let ok = true;
      for (let y = L.h - depth; y < L.h && ok; y++) for (let x = c0; x < c0 + 2; x++) if (!free(x, y)) ok = false;
      if (ok) { dx = c0; break; }
    }
    if (dx != null) {
      const dm = new THREE.MeshStandardMaterial({ map: concreteTex().clone(), roughness: 0.92 });
      dm.map.needsUpdate = true; dm.map.__own = true; dm.map.repeat.set(2, depth);
      const dmesh = new THREE.Mesh(quad.clone(), dm);
      dmesh.scale.set(2, 1, depth); dmesh.position.set(dx + 1, 0.0028, L.h - depth / 2);
      dmesh.receiveShadow = true; dmesh.userData.ownMat = true; dmesh.name = 'driveway';
      g.add(dmesh);
      const ap = new THREE.Mesh(quad.clone(), dm);
      ap.scale.set(2.3, 1, 1.5); ap.position.set(dx + 1, 0.034, L.h + 0.75);
      ap.receiveShadow = true; ap.name = 'drivewayApron';
      g.add(ap);
    }
    quad.dispose();
    S.dress = { path: pathTiles, driveX: dx };
  }

  // merge meshes (position/normal/color attributes) applying their world matrices
  function mergeWorld(meshes) {
    let n = 0;
    for (const m of meshes) n += m.geometry.attributes.position.count;
    if (!n) return null;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), colr = new Float32Array(n * 3);
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    let o = 0;
    for (const m of meshes) {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color;
      nm.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
        pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z; }
        if (C) { colr[o * 3] = C.getX(i); colr[o * 3 + 1] = C.getY(i); colr[o * 3 + 2] = C.getZ(i); }
        else { colr[o * 3] = colr[o * 3 + 1] = colr[o * 3 + 2] = 1; }
        o++;
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    out.computeBoundingSphere();
    return out;
  }

  function updateShadowCamera() {
    const sun = S.sun;
    const L = { w: S.lotW, h: S.lotH };
    const half = Math.max(L.w, L.h) / 2 + 5;
    const c = sun.shadow.camera;
    c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = 160;
    c.updateProjectionMatrix();
    sun.target.position.set(L.w / 2, 0, L.h / 2 + 1);
  }

  // ------------------------------------------------------------------ floors
  function buildFloors() {
    const g = S.groups.floors;
    disposeGroup(g);
    const s = st();
    const L = lotSize();
    const floors = (s && s.lot && Array.isArray(s.lot.floors)) ? s.lot.floors : [];
    const F = floorsTable();
    const byType = {};
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      let f = floors[y * L.w + x] | 0;
      if (f <= 0 || f >= F.length) continue;
      (byType[f] = byType[f] || []).push(x, y);
    }
    for (const k in byType) {
      const tiles = byType[k];
      const n = tiles.length / 2;
      const pos = new Float32Array(n * 18), uv = new Float32Array(n * 12), nor = new Float32Array(n * 18);
      for (let i = 0; i < n; i++) {
        const x = tiles[i * 2], z = tiles[i * 2 + 1];
        const v = [x, z, x, z + 1, x + 1, z + 1, x, z, x + 1, z + 1, x + 1, z];
        const t = [0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1];
        for (let j = 0; j < 6; j++) {
          pos[i * 18 + j * 3] = v[j * 2]; pos[i * 18 + j * 3 + 1] = FLOOR_Y; pos[i * 18 + j * 3 + 2] = v[j * 2 + 1];
          nor[i * 18 + j * 3 + 1] = 1;
          uv[i * 12 + j * 2] = t[j * 2]; uv[i * 12 + j * 2 + 1] = t[j * 2 + 1];
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const key = (F[k] && F[k].key) || '';
      const rough = key === 'marble' || key === 'tile' || key === 'checker' ? 0.45 : key === 'carpet' ? 1 : 0.8;
      const mat = new THREE.MeshStandardMaterial({ map: floorTexture(+k), roughness: rough, metalness: 0 });
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true;
      m.userData.ownMat = true;
      m.name = 'floor:' + key;
      g.add(m);
    }
  }

  // ------------------------------------------------------------------ regions (indoor detection)
  function computeRegions() {
    const s = st();
    const L = lotSize();
    const W = L.w, H = L.h, N = W * H;
    const walls = (s && s.lot && s.lot.walls) || {};
    const floors = (s && s.lot && s.lot.floors) || [];
    const reg = new Int32Array(N).fill(-1);
    const blocked = function (kind, x, y) { return !!wallAt(walls, kind + ',' + x + ',' + y); };
    const info = [];
    const q = new Int32Array(N);
    let lightId = 0;
    for (let start = 0; start < N; start++) {
      if (reg[start] >= 0) continue;
      const id = info.length;
      let qh = 0, qt = 0, leaks = false, grass = 0, count = 0, touches = false;
      q[qt++] = start; reg[start] = id;
      while (qh < qt) {
        const i = q[qh++];
        const x = i % W, y = (i / W) | 0;
        count++;
        if (!((floors[i] | 0) > 0)) grass++;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touches = true;
        // N
        if (!blocked('h', x, y)) { if (y === 0) leaks = true; else { const j = i - W; if (reg[j] < 0) { reg[j] = id; q[qt++] = j; } } }
        if (!blocked('h', x, y + 1)) { if (y === H - 1) leaks = true; else { const j = i + W; if (reg[j] < 0) { reg[j] = id; q[qt++] = j; } } }
        if (!blocked('v', x, y)) { if (x === 0) leaks = true; else { const j = i - 1; if (reg[j] < 0) { reg[j] = id; q[qt++] = j; } } }
        if (!blocked('v', x + 1, y)) { if (x === W - 1) leaks = true; else { const j = i + 1; if (reg[j] < 0) { reg[j] = id; q[qt++] = j; } } }
      }
      // BB-8 (mirrors M.world): any region enclosed by walls counts as a room (floored or not), except a
      // grassy yard walled along the lot border. `enclosed` drives the cutaway; `light` is the id used by
      // the lamp region mask (0 = outdoors).
      const enclosed = !leaks;
      const indoor = enclosed && !(touches && grass * 2 > count);
      info.push({ id: id, indoor: indoor, enclosed: enclosed, count: count, light: enclosed ? ++lightId : 0 });
    }
    S.regions = { reg: reg, info: info, W: W, H: H, lightCount: lightId };
    S.regionStamp = (S.regionStamp || 0) + 1;
    updateRegionTexture(true);
  }
  function isEnclosed(x, y) {
    const R = S.regions;
    if (!R || x < 0 || y < 0 || x >= R.W || y >= R.H) return false;
    const r = R.reg[y * R.W + x];
    return r >= 0 && R.info[r].enclosed;
  }
  function lightIdAt(x, y) {
    const R = S.regions;
    if (!R || x < 0 || y < 0 || x >= R.W || y >= R.H) return 0;
    const r = R.reg[y * R.W + x];
    return r >= 0 ? R.info[r].light : 0;
  }

  // ------------------------------------------------------------------ lamp light region mask (VIS-1)
  // three r128 has no per-light layers, so every lit material gets a small shader patch: a per-tile
  // DataTexture holds the room ("light region") of each tile (0 = outdoors) and the room's night fill
  // level. Each pooled lamp light carries its room id; a fragment only receives a lamp whose room id
  // matches its own tile's room, so lamps never light the lawn, exterior wall faces or the next room
  // through a wall. Lit rooms also get a soft warm ambient fill (morFill) so the far side of a room is
  // not black at night.
  const LM = { u: null, data: null, tex: null, W: 0, H: 0, fill: null, fillSig: '' };
  function lmUniforms() {
    if (LM.u) return LM.u;
    LM.u = {
      morRegionMap: { value: null },
      morLot: { value: new THREE.Vector2(1, 1) },
      morLampReg: { value: new Float32Array(MAX_LAMPS).fill(-1) },
      morFillColor: { value: col('#ffcf9c').clone() },
      morFill: { value: 0 },
    };
    return LM.u;
  }
  function updateRegionTexture(force) {
    const R = S.regions;
    if (!R || typeof THREE === 'undefined') return;
    const u = lmUniforms();
    if (!LM.tex || LM.W !== R.W || LM.H !== R.H) {
      if (LM.tex) LM.tex.dispose();
      LM.W = R.W; LM.H = R.H;
      LM.data = new Uint8Array(R.W * R.H * 4);
      LM.tex = new THREE.DataTexture(LM.data, R.W, R.H, THREE.RGBAFormat, THREE.UnsignedByteType);
      LM.tex.magFilter = LM.tex.minFilter = THREE.NearestFilter;
      LM.tex.generateMipmaps = false;
      LM.tex.flipY = false;
      u.morRegionMap.value = LM.tex;
      u.morLot.value.set(R.W, R.H);
      force = true;
    }
    const fill = LM.fill || {};
    let sig = R.lightCount + '|' + R.W + 'x' + R.H + '|' + (S.regionStamp || 0);
    for (const k in fill) sig += k + ':' + fill[k] + ';';
    if (!force && sig === LM.fillSig) return;
    LM.fillSig = sig;
    const D = LM.data;
    for (let i = 0; i < R.W * R.H; i++) {
      const r = R.reg[i];
      const id = r >= 0 ? R.info[r].light : 0;
      D[i * 4] = id & 255; D[i * 4 + 1] = (id >> 8) & 255;
      D[i * 4 + 2] = Math.round(clamp(fill[id] || 0, 0, 1) * 255);
      D[i * 4 + 3] = 255;
    }
    LM.tex.needsUpdate = true;
  }
  const LM_VERT_HEAD = '#include <common>\nvarying vec3 vMorWorld;\n';
  const LM_VERT_BODY = '#include <project_vertex>\n{ vec4 morW = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\nmorW = instanceMatrix * morW;\n#endif\nvMorWorld = ( modelMatrix * morW ).xyz; }\n';
  const LM_FRAG_HEAD = '#include <common>\nvarying vec3 vMorWorld;\nuniform sampler2D morRegionMap;\nuniform vec2 morLot;\nuniform float morLampReg[ ' + MAX_LAMPS + ' ];\nuniform vec3 morFillColor;\nuniform float morFill;\n' +
    'vec2 morRegion( vec3 nView ) {\n  vec3 wn = ( vec4( nView, 0.0 ) * viewMatrix ).xyz;\n  vec2 t = floor( vMorWorld.xz + wn.xz * 0.03 );\n  if ( t.x < 0.0 || t.y < 0.0 || t.x >= morLot.x || t.y >= morLot.y ) return vec2( 0.0 );\n' +
    '  vec4 s = texture2D( morRegionMap, ( t + 0.5 ) / morLot );\n  return vec2( floor( s.r * 255.0 + 0.5 ) + 256.0 * floor( s.g * 255.0 + 0.5 ), s.b );\n}\n';
  function lmFragBegin() {
    let c = THREE.ShaderChunk.lights_fragment_begin;
    c = c.replace('getPointDirectLightIrradiance( pointLight, geometry, directLight );',
      'getPointDirectLightIrradiance( pointLight, geometry, directLight );\n\t\tdirectLight.color *= ( abs( morLampReg[ i ] - morReg.x ) < 0.5 ? 1.0 : 0.0 );');
    return 'vec2 morReg = morRegion( normal );\n' + c;
  }
  function lmOnBeforeCompile(shader) {
    const u = lmUniforms();
    for (const k in u) shader.uniforms[k] = u[k];
    shader.vertexShader = shader.vertexShader.replace('#include <common>', LM_VERT_HEAD).replace('#include <project_vertex>', LM_VERT_BODY);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', LM_FRAG_HEAD)
      .replace('#include <lights_fragment_begin>', lmFragBegin())
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += material.diffuseColor * morFillColor * ( morFill * morReg.y );');
  }
  function patchMaterial(m) {
    if (!m || m.userData.morLM || !(m.isMeshStandardMaterial)) return;
    m.userData.morLM = true;
    m.onBeforeCompile = lmOnBeforeCompile;
    m.needsUpdate = true;
  }
  function patchScene() {
    if (!S.scene) return;
    S.scene.traverse(function (o) {
      if (!o.isMesh) return;
      const mm = o.material;
      if (Array.isArray(mm)) mm.forEach(patchMaterial); else patchMaterial(mm);
    });
    const mats = M.models && M.models.materials;
    if (mats) for (const k in mats) patchMaterial(mats[k]);
  }
  function regionAt(x, y) {
    const R = S.regions;
    if (!R || x < 0 || y < 0 || x >= R.W || y >= R.H) return -1;
    return R.reg[y * R.W + x];
  }

  // ------------------------------------------------------------------ walls
  let wallMats = null;
  function getWallMats() {
    if (wallMats) return wallMats;
    wallMats = {
      body: new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }),
      cap: new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, vertexColors: true }),
      glass: new THREE.MeshStandardMaterial({ color: col('#bfe3f2'), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.3, depthWrite: false }),
      glassLit: new THREE.MeshBasicMaterial({ color: col('#ffd98f'), transparent: true, opacity: 0.0, depthWrite: false }),
      door: new THREE.MeshStandardMaterial({ color: col('#a8744a'), roughness: 0.7, flatShading: true }),
      doorPanel: new THREE.MeshStandardMaterial({ color: col('#93623b'), roughness: 0.7, flatShading: true }),
      knob: new THREE.MeshStandardMaterial({ color: col('#d4b25a'), roughness: 0.35, metalness: 0.6 }),
      ao: new THREE.MeshBasicMaterial({ map: aoStripTexture(), transparent: true, depthWrite: false, opacity: 0.55,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    };
    return wallMats;
  }
  const TRIM = '#f7f4ec', CAP = '#8f857b', BASE = '#ede7dc', THRESH = '#8a6a4a';
  // soft dark strip along wall bases (contact shadow), dark at v=1 (the wall), clear at v=0
  function aoStripTexture() {
    return canvasTex('aostrip', 64, function (g, s) {
      const gr = g.createLinearGradient(0, 0, 0, s);
      gr.addColorStop(0, 'rgba(30,22,16,0.62)'); gr.addColorStop(0.35, 'rgba(30,22,16,0.25)'); gr.addColorStop(1, 'rgba(30,22,16,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  // unit box whose top face is white and side faces darker (instance colour × vertex colour = two-tone cap)
  let _capGeo = null;
  function capBoxGeo() {
    if (_capGeo) return _capGeo;
    const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const N = g.attributes.normal.array, n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = N[i * 3 + 1] > 0.5 ? 1 : 0.62; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    _capGeo = g;
    return g;
  }
  function wallpaperColor(WP, idx) { const wp = WP[idx | 0] || WP[0] || { color: '#efe9dc' }; return wp.color || '#efe9dc'; }

  function buildWalls() {
    const g = S.groups.walls;
    disposeGroup(g);
    const s = st();
    const walls = (s && s.lot && s.lot.walls) || {};
    const L = lotSize();
    const WP = wallpapers();
    const edges = [];
    const pieces = [];   // { e, x0,x1,z0,z1,y0,y1, color, cap, kind:'body'|'trim', inst, capInst }
    const glass = [];
    const vertex = new Map();
    const ekeys = Object.keys(walls).sort();
    for (const key of ekeys) {
      const w = wallAt(walls, key);
      if (!w) continue;
      const p = key.split(',');
      const kind = p[0], x = +p[1], y = +p[2];
      if ((kind !== 'h' && kind !== 'v') || !isFinite(x) || !isFinite(y) || x !== Math.floor(x) || y !== Math.floor(y)) continue;
      if (kind === 'h' && (x < 0 || x >= L.w || y < 0 || y > L.h)) continue;
      if (kind === 'v' && (x < 0 || x > L.w || y < 0 || y >= L.h)) continue;
      // CONTRACT_V2 §1: side A (north / west) and side B (south / east) may carry different wallpapers
      const c = w.c | 0;
      const cA = w.cA != null && isFinite(+w.cA) ? (w.cA | 0) : c, cB = w.cB != null && isFinite(+w.cB) ? (w.cB | 0) : c;
      const e = { key: key, kind: kind, x: x, y: y, t: w.t | 0, c: c, cA: cA, cB: cB, color: wallpaperColor(WP, c),
        colorA: wallpaperColor(WP, cA), colorB: wallpaperColor(WP, cB),
        pieces: [], glass: [], h: WALL_H, target: WALL_H, door: null, adjA: 0, adjB: 0 };
      edges.push(e);
      const ends = kind === 'h' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
      ends.forEach(function (v, i) {
        const vk = v[0] + ',' + v[1];
        let rec = vertex.get(vk);
        if (!rec) { rec = { x: v[0], y: v[1], h: [], v: [] }; vertex.set(vk, rec); }
        rec[kind].push({ e: e, end: i });
      });
    }
    // corner ownership: extend (+HT) / exact (0) / shorten (-HT) each slab end so corners close
    // without overlapping coplanar faces (no posts, no seams)
    vertex.forEach(function (v) {
      const nh = v.h.length, nv = v.v.length;
      const set = function (list, a) { for (const it of list) { if (it.end === 0) it.e.adjA = a; else it.e.adjB = a; } };
      if (nh + nv === 1) { set(v.h, HT); set(v.v, HT); }
      else if (nv === 0 || nh === 0) { set(v.h, 0); set(v.v, 0); }
      else if (nh === 1 && nv === 1) { set(v.h, HT); set(v.v, -HT); }
      else if (nh === 2) { set(v.h, 0); set(v.v, -HT); }
      else { set(v.v, 0); set(v.h, -HT); }
      // perpendicular walls at this vertex cover the end of a shortened slab
      for (const it of v.h) { const perp = v.v.map(function (o) { return o.e; }); if (it.end === 0) it.e.perpA = perp; else it.e.perpB = perp; }
      for (const it of v.v) { const perp = v.h.map(function (o) { return o.e; }); if (it.end === 0) it.e.perpA = perp; else it.e.perpB = perp; }
    });
    for (const e of edges) {
      const kind = e.kind, x = e.x, y = e.y;
      const box = function (u0, u1, n0, n1, y0, y1, color, cap, pk, cutH) {
        let bx0, bx1, bz0, bz1;
        if (kind === 'h') { bx0 = x + u0; bx1 = x + u1; bz0 = y + n0; bz1 = y + n1; }
        else { bx0 = x + n0; bx1 = x + n1; bz0 = y + u0; bz1 = y + u1; }
        const pc = { e: e, x0: bx0, x1: bx1, z0: bz0, z1: bz1, y0: y0, y1: y1, color: color, cap: !!cap, kind: pk || 'body', cutH: cutH };
        if (pk === 'glass') { e.glass.push(pc); glass.push(pc); } else { e.pieces.push(pc); pieces.push(pc); }
        return pc;
      };
      // colour of an end face: an extended corner end continues the perpendicular wall's coplanar face
      const endCols = function (atU1) {
        const adj = atU1 ? e.adjB : e.adjA, perp = atU1 ? e.perpB : e.perpA;
        if (adj > 0 && perp && perp.length) { const pe = perp[0]; const c = atU1 ? pe.colorB : pe.colorA; return [c, c]; }
        return [e.colorA, e.colorB];
      };
      const body = function (u0, u1, y0, y1, cap) {
        const a0 = u0 === 0 ? -e.adjA : u0, a1 = u1 === 1 ? 1 + e.adjB : u1;
        const pc = box(a0, a1, -HT, HT, y0, y1, e.color, cap, 'body');
        pc.colorA = e.colorA; pc.colorB = e.colorB;
        pc.end0 = u0 === 0 ? endCols(false) : [e.colorA, e.colorB];
        pc.end1 = u1 === 1 ? endCols(true) : [e.colorA, e.colorB];
        pc.line = kind + ':' + (kind === 'h' ? y : x);
        pc.U0 = (kind === 'h' ? x : y) + a0; pc.U1 = (kind === 'h' ? x : y) + a1;
        pc.perp0 = u0 === 0 && e.adjA < 0 ? (e.perpA || []) : null;
        pc.perp1 = u1 === 1 && e.adjB < 0 ? (e.perpB || []) : null;
        if (y0 === 0) {
          const t0 = u0 === 0 ? -(HT + 0.012) : u0, t1 = u1 === 1 ? 1 + HT + 0.012 : u1;
          box(t0, t1, -HT - 0.012, HT + 0.012, 0, 0.09, BASE, false, 'trim');
        }
      };
      if (e.t === 2) {
        body(0, 0.15, 0, WALL_H, true);
        body(0.85, 1, 0, WALL_H, true);
        body(0.15, 0.85, 2.1, WALL_H, true);
        // door frame: full jambs when standing; when the wall is cut down only a short trim stays (no white stubs)
        box(0.12, 0.16, -HT - 0.014, HT + 0.014, 0, 2.15, TRIM, false, 'trim', 0.1);
        box(0.84, 0.88, -HT - 0.014, HT + 0.014, 0, 2.15, TRIM, false, 'trim', 0.1);
        box(0.12, 0.88, -HT - 0.014, HT + 0.014, 2.1, 2.18, TRIM, false, 'trim');
        box(0.15, 0.85, -HT - 0.01, HT + 0.01, 0, 0.016, THRESH, false, 'trim');
        e.door = { open: 0, side: 1 };
      } else if (e.t === 3) {
        body(0, 0.2, 0, WALL_H, true);
        body(0.8, 1, 0, WALL_H, true);
        body(0.2, 0.8, 0, 0.9, true);
        body(0.2, 0.8, 2.0, WALL_H, true);
        box(0.18, 0.22, -HT - 0.012, HT + 0.012, 0.88, 2.02, TRIM, false, 'trim');
        box(0.78, 0.82, -HT - 0.012, HT + 0.012, 0.88, 2.02, TRIM, false, 'trim');
        box(0.18, 0.82, -HT - 0.012, HT + 0.012, 1.98, 2.04, TRIM, false, 'trim');
        box(0.15, 0.85, -HT - 0.07, HT + 0.07, 0.85, 0.91, TRIM, false, 'trim');
        box(0.49, 0.51, -0.012, 0.012, 0.9, 2.0, TRIM, false, 'trim');
        box(0.2, 0.8, -0.012, 0.012, 1.44, 1.47, TRIM, false, 'trim');
        box(0.2, 0.8, -0.006, 0.006, 0.9, 2.0, '#cfeaf5', false, 'glass');
      } else {
        body(0, 1, 0, WALL_H, true);
      }
    }
    // instance allocation. Wall bodies are split lengthwise into two half-thickness slabs (side A / side B,
    // each with its own wallpaper colour), boxes WITHOUT their end faces (one mesh per edge orientation)
    // so abutting slabs never show depth-tie hairlines; exposed ends get explicit end-cap quads.
    // Caps (two-tone) and trims are ordinary boxes.
    const mats = getWallMats();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodies = { h: [], v: [] }, trims = [], caps = [];
    for (const p of pieces) {
      if (p.kind === 'body') bodies[p.e.kind].push(p); else trims.push(p);
      if (p.cap) caps.push({ capOf: p });
    }
    const c = new THREE.Color();
    const meshes = [];
    const mk = function (geo, list, name, mat, per) {
      if (!list.length) return null;     // never create an InstancedMesh without instances/instanceColor
      per = per || 1;
      const m = newInst(geo, mat || mats.body, list.length * per);
      m.count = list.length * per; m.castShadow = true; m.receiveShadow = true; m.name = name;
      if (geo !== boxGeo) m.userData.sharedGeo = true;
      m.userData.instEdge = new Array(list.length * per);
      list.forEach(function (p, i) {
        if (p.capOf) { p.capOf.capInst = i; p.capOf.capMesh = m; m.setColorAt(i, c.copy(col(CAP))); m.userData.instEdge[i] = p.capOf.e.key; }
        else if (per === 2) {
          p.inst = i * 2; p.instB = i * 2 + 1; p.mesh = m;
          m.setColorAt(i * 2, c.copy(col(p.colorA || p.color))); m.setColorAt(i * 2 + 1, c.copy(col(p.colorB || p.color)));
          m.userData.instEdge[i * 2] = m.userData.instEdge[i * 2 + 1] = p.e.key;
        } else { p.inst = i; p.mesh = m; m.setColorAt(i, c.copy(col(p.color))); m.userData.instEdge[i] = p.e.key; }
      });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      g.add(m); meshes.push(m);
      return m;
    };
    mk(noEndBoxGeo('x'), bodies.h, 'wallsH', mats.body, 2);
    mk(noEndBoxGeo('z'), bodies.v, 'wallsV', mats.body, 2);
    mk(boxGeo, trims, 'wallTrims');
    mk(capBoxGeo(), caps, 'wallCaps', mats.cap);
    // end caps: 2 height intervals × 2 ends × 2 halves per body
    const allBodies = bodies.h.concat(bodies.v);
    const endMesh = allBodies.length ? newInst(endQuadGeo(), mats.body, allBodies.length * 8) : null;
    if (endMesh) {
      endMesh.count = allBodies.length * 8; endMesh.castShadow = true; endMesh.receiveShadow = true; endMesh.name = 'wallEnds';
      endMesh.userData.sharedGeo = true;
      endMesh.userData.instEdge = new Array(endMesh.count);
      allBodies.forEach(function (p, i) {
        p.endInst = i * 8;
        // layout: [end0 iv0 A, end0 iv0 B, end0 iv1 A, end0 iv1 B, end1 iv0 A, end1 iv0 B, end1 iv1 A, end1 iv1 B]
        for (let k = 0; k < 8; k++) {
          const cols = k < 4 ? p.end0 : p.end1;
          endMesh.setColorAt(i * 8 + k, c.copy(col(cols[k % 2])));
          endMesh.userData.instEdge[i * 8 + k] = p.e.key;
        }
      });
      if (endMesh.instanceColor) endMesh.instanceColor.needsUpdate = true;
      g.add(endMesh); meshes.push(endMesh);
    }
    // collinear neighbours at each body end
    const ends = new Map();
    const ek = function (line, U) { return line + '|' + Math.round(U * 1000); };
    for (const p of allBodies) {
      const a = ek(p.line, p.U0), b = ek(p.line, p.U1);
      if (!ends.has(a)) ends.set(a, { starts: [], stops: [] });
      if (!ends.has(b)) ends.set(b, { starts: [], stops: [] });
      ends.get(a).starts.push(p); ends.get(b).stops.push(p);
    }
    for (const p of allBodies) {
      p.nb0 = ends.get(ek(p.line, p.U0)).stops.filter(function (q) { return q !== p; });
      p.nb1 = ends.get(ek(p.line, p.U1)).starts.filter(function (q) { return q !== p; });
    }
    // glass
    let gm = null, gl = null;
    if (glass.length) {
      gm = newInst(boxGeo, mats.glass, glass.length);
      gl = newInst(boxGeo, mats.glassLit, glass.length);
      gm.renderOrder = 3; gl.renderOrder = 4;
      glass.forEach(function (p, i) { p.inst = i; });
      g.add(gm); g.add(gl);
    }
    // door leaves
    const doors = [];
    for (const e of edges) {
      if (!e.door) continue;
      const pivot = new THREE.Group();
      if (e.kind === 'h') { pivot.position.set(e.x + 0.155, 0, e.y); pivot.userData.base = 0; }
      else { pivot.position.set(e.x, 0, e.y + 0.155); pivot.userData.base = -HP; }
      pivot.rotation.y = pivot.userData.base;
      const leafGeo = doorGeo();
      const leaf = new THREE.Mesh(leafGeo.leaf, mats.door); leaf.position.set(0.345, 1.03, 0); leaf.castShadow = true;
      const pan = new THREE.Mesh(leafGeo.panel, mats.doorPanel); pan.position.set(0.345, 1.03, 0); pan.castShadow = false;
      const k1 = new THREE.Mesh(leafGeo.knob, mats.knob); k1.position.set(0.6, 1.0, 0.035);
      const k2 = new THREE.Mesh(leafGeo.knob, mats.knob); k2.position.set(0.6, 1.0, -0.035);
      for (const m of [leaf, pan, k1, k2]) { m.userData.sharedGeo = true; m.userData.edgeKey = e.key; pivot.add(m); }
      g.add(pivot);
      e.door.pivot = pivot;
      doors.push(e);
    }
    // contact shadows along wall bases (both sides; door openings skipped)
    const strips = [];
    for (const e of edges) {
      const spans = e.t === 2 ? [[0, 0.15], [0.85, 1]] : [[0, 1]];
      for (const sp of spans) for (const sd of [-1, 1]) strips.push({ e: e, u0: sp[0], u1: sp[1], sd: sd });
    }
    if (strips.length) {
      const sg = aoStripGeo();
      const am = newInst(sg, mats.ao, strips.length);
      am.userData.sharedGeo = true; am.name = 'wallAO'; am.renderOrder = 1;
      const t = mtx(), Y = _yAxis || (_yAxis = new THREE.Vector3(0, 1, 0));
      const depth = 0.34;
      strips.forEach(function (st, i) {
        const e = st.e, len = st.u1 - st.u0, mid = (st.u0 + st.u1) / 2;
        // strip local: x along the wall, z away from the face; the texture is darkest at the face
        let cx, cz, ry;
        if (e.kind === 'h') { cx = e.x + mid; cz = e.y + st.sd * (HT + depth / 2); ry = st.sd > 0 ? 0 : PI; }
        else { cz = e.y + mid; cx = e.x + st.sd * (HT + depth / 2); ry = st.sd > 0 ? HP : -HP; }
        t.p.set(cx, 0.0062, cz); t.q.setFromAxisAngle(Y, ry); t.s.set(len, 1, depth);
        am.setMatrixAt(i, t.m.compose(t.p, t.q, t.s));
      });
      am.instanceMatrix.needsUpdate = true;
      g.add(am);
    }
    S.walls = { edges: edges, byKey: new Map(edges.map(function (e) { return [e.key, e]; })), pieces: pieces, bodies: allBodies,
      glass: glass, meshes: meshes, endMesh: endMesh, glassMesh: gm, glassLit: gl, doors: doors, vertex: vertex };
    // initial heights = current targets, no animation on rebuild
    computeCut(true);
    for (const e of edges) e.h = e.target;
    writeAllWallMatrices();
    updateWindowGlow();
  }
  let _aoGeo = null;
  // horizontal unit quad, v = 1 at local z = -0.5 (the wall face side)
  function aoStripGeo() {
    if (_aoGeo) return _aoGeo;
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-HP);
    _aoGeo = g;
    return g;
  }
  let _noEnd = {}, _endQuad = null;
  // unit box without the two faces perpendicular to `axis` ('x' or 'z')
  function noEndBoxGeo(axis) {
    if (_noEnd[axis]) return _noEnd[axis];
    const src = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const P = src.attributes.position.array, N = src.attributes.normal.array;
    const pos = [], nor = [];
    const ai = axis === 'x' ? 0 : 2;
    for (let i = 0; i < P.length; i += 9) {
      if (Math.abs(N[i + ai]) > 0.5) continue;
      for (let k = 0; k < 9; k++) { pos.push(P[i + k]); nor.push(N[i + k]); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    _noEnd[axis] = g;
    return g;
  }
  function endQuadGeo() { return _endQuad || (_endQuad = new THREE.PlaneGeometry(1, 1)); }
  let _doorGeo = null;
  function doorGeo() {
    if (_doorGeo) return _doorGeo;
    const panel = new THREE.BoxGeometry(0.5, 0.6, 0.056);
    const p2 = panel.clone(); p2.translate(0, -0.42, 0);
    panel.translate(0, 0.42, 0);
    const merged = mergeSimple([panel, p2]);
    _doorGeo = { leaf: new THREE.BoxGeometry(0.69, 2.06, 0.04), panel: merged, knob: new THREE.SphereGeometry(0.03, 8, 6) };
    return _doorGeo;
  }
  function mergeSimple(geos) {
    const parts = geos.map(function (g) { return g.index ? g.toNonIndexed() : g; });
    let n = 0; for (const g of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere();
    return out;
  }

  let MTX = null;
  function mtx() {
    if (!MTX) MTX = { m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), zero: new THREE.Matrix4().makeScale(0, 0, 0) };
    return MTX;
  }
  function setBox(mesh, i, x0, y0, z0, x1, y1, z1) {
    const t = mtx();
    if (y1 - y0 < 0.002) { mesh.setMatrixAt(i, t.zero); return; }
    t.p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    t.s.set(Math.max(1e-4, x1 - x0), y1 - y0, Math.max(1e-4, z1 - z0));
    t.q.set(0, 0, 0, 1);
    mesh.setMatrixAt(i, t.m.compose(t.p, t.q, t.s));
  }
  function visTop(p) {
    // trims with a cut height (door jambs) shrink to a short trim as soon as their wall is lowered
    if (p.cutH != null && p.e.h < p.y1 - 0.05) return Math.min(p.cutH, p.e.h);
    return Math.min(p.y1, p.e.h);
  }
  // body piece = two half-thickness slabs (A: north/west half, B: south/east half)
  function setBodyHalves(p, y0, y1) {
    if (p.e.kind === 'h') {
      const zm = (p.z0 + p.z1) / 2;
      setBox(p.mesh, p.inst, p.x0, y0, p.z0, p.x1, y1, zm);
      setBox(p.mesh, p.instB, p.x0, y0, zm, p.x1, y1, p.z1);
    } else {
      const xm = (p.x0 + p.x1) / 2;
      setBox(p.mesh, p.inst, p.x0, y0, p.z0, xm, y1, p.z1);
      setBox(p.mesh, p.instB, xm, y0, p.z0, p.x1, y1, p.z1);
    }
  }
  function writePiece(p) {
    const top = visTop(p);
    if (top <= p.y0 + 0.004) {
      setBodyHalves(p, 0, 0);
      if (p.cap) setBox(p.capMesh, p.capInst, 0, 0, 0, 0, 0, 0);
      return;
    }
    const capped = p.cap && (top < p.y1 - 0.001 || p.y1 >= WALL_H - 0.001);
    const bodyTop = capped ? Math.max(p.y0, top - CAP_T) : top;
    setBodyHalves(p, p.y0, bodyTop);
    if (p.cap) {
      if (capped) setBox(p.capMesh, p.capInst, p.x0 - 0.006, bodyTop, p.z0 - 0.006, p.x1 + 0.006, top, p.z1 + 0.006);
      else setBox(p.capMesh, p.capInst, 0, 0, 0, 0, 0, 0);
    }
  }
  // exposed height intervals of one body end: [y0, top] minus what the neighbours cover
  function exposedIntervals(p, nbs, perp) {
    let ivs = [[p.y0, visTop(p)]];
    const sub = function (a, b) {
      const out = [];
      for (const iv of ivs) {
        if (b <= iv[0] || a >= iv[1]) { out.push(iv); continue; }
        if (a > iv[0]) out.push([iv[0], a]);
        if (b < iv[1]) out.push([b, iv[1]]);
      }
      ivs = out;
    };
    for (const q of nbs) { const t = visTop(q); if (t > q.y0) sub(q.y0, t); }
    if (perp) for (const e of perp) sub(0, e.h);
    return ivs.filter(function (iv) { return iv[1] - iv[0] > 0.004; });
  }
  // one half (0 = side A, 1 = side B) of a body end face
  function setEnd(mesh, idx, p, atU1, ya, yb, half) {
    const t = mtx();
    if (yb - ya < 0.004) { mesh.setMatrixAt(idx, t.zero); return; }
    const U = atU1 ? p.U1 : p.U0;
    const h = p.e.kind === 'h';
    if (h) {
      const zm = (p.z0 + p.z1) / 2, za = half ? zm : p.z0, zb = half ? p.z1 : zm;
      t.p.set(U, (ya + yb) / 2, (za + zb) / 2); t.s.set(zb - za, yb - ya, 1);
    } else {
      const xm = (p.x0 + p.x1) / 2, xa = half ? xm : p.x0, xb = half ? p.x1 : xm;
      t.p.set((xa + xb) / 2, (ya + yb) / 2, U); t.s.set(xb - xa, yb - ya, 1);
    }
    const ry = h ? (atU1 ? HP : -HP) : (atU1 ? 0 : PI);
    t.q.setFromAxisAngle(_yAxis || (_yAxis = new THREE.Vector3(0, 1, 0)), ry);
    mesh.setMatrixAt(idx, t.m.compose(t.p, t.q, t.s));
  }
  let _yAxis = null;
  function writeAllWallMatrices() {
    const W = S.walls;
    if (!W) return;
    for (const p of W.pieces) {
      if (p.kind === 'body') writePiece(p);
      else {
        const top = visTop(p);
        if (top <= p.y0 + 0.002) setBox(p.mesh, p.inst, 0, 0, 0, 0, 0, 0);
        else setBox(p.mesh, p.inst, p.x0, p.y0, p.z0, p.x1, top, p.z1);
      }
    }
    for (const p of W.bodies) {
      if (!W.endMesh) break;
      const e0 = exposedIntervals(p, p.nb0, p.perp0), e1 = exposedIntervals(p, p.nb1, p.perp1);
      for (let k = 0; k < 2; k++) {
        const a = e0[k], b = e1[k];
        for (let hf = 0; hf < 2; hf++) {
          if (a) setEnd(W.endMesh, p.endInst + k * 2 + hf, p, false, a[0], a[1], hf); else setEnd(W.endMesh, p.endInst + k * 2 + hf, p, false, 0, 0, hf);
          if (b) setEnd(W.endMesh, p.endInst + 4 + k * 2 + hf, p, true, b[0], b[1], hf); else setEnd(W.endMesh, p.endInst + 4 + k * 2 + hf, p, true, 0, 0, hf);
        }
      }
    }
    for (const m of W.meshes) m.instanceMatrix.needsUpdate = true;
    if (W.glassMesh) {
      for (const p of W.glass) {
        const top = Math.min(p.y1, p.e.h);
        setBox(W.glassMesh, p.inst, p.x0, p.y0, p.z0, p.x1, top, p.z1);
        setBox(W.glassLit, p.inst, p.x0 - 0.002, p.y0, p.z0 - 0.002, p.x1 + 0.002, p.e.litWin ? top : p.y0, p.z1 + 0.002);
      }
      W.glassMesh.instanceMatrix.needsUpdate = true;
      W.glassLit.instanceMatrix.needsUpdate = true;
    }
    for (const e of W.doors) e.door.pivot.visible = e.h >= 2.08;
  }

  // camera horizontal direction (target -> camera)
  function camDir() { return { x: Math.sin(S.cam.yaw), z: Math.cos(S.cam.yaw) }; }

  function computeCut(force) {
    const W = S.walls;
    if (!W) return;
    const d = camDir();
    const sx = d.x >= 0 ? 1 : -1, sz = d.z >= 0 ? 1 : -1;
    let simKey = '';
    let simPos = null;
    if (S.wallMode === 'cutaway' && S.selectedId != null) {
      const rec = S.chars.get(S.selectedId);
      if (rec && rec.rig.root.visible) {
        simPos = { x: rec.px, z: rec.pz };
        simKey = Math.round(rec.px * 2) + ',' + Math.round(rec.pz * 2);
      }
    }
    const mode = S.wallsUpOverride ? 'up' : S.wallMode;
    const decor = decorEdges(d);
    const sig = mode + '|' + sx + '|' + sz + '|' + simKey + '|' + W.edges.length + '|' + decor.sig;
    if (!force && sig === S.cutSig) return;
    S.cutSig = sig;
    const cut = new Set();
    if (mode === 'cutaway') {
      const simCut = new Set();
      if (simPos) {
        const perp = { x: -d.z, z: d.x };
        for (const off of [-0.32, 0, 0.32]) {
          traceEdges(simPos.x + perp.x * off, simPos.z + perp.z * off, d.x, d.z, 3.2, simCut);
        }
      }
      for (const e of W.edges) {
        let fx, fy;
        if (e.kind === 'h') { fx = e.x; fy = sz > 0 ? e.y - 1 : e.y; }
        else { fx = sx > 0 ? e.x - 1 : e.x; fy = e.y; }
        // BB-8: any enclosed region counts (floored or not). LIVE-5 / VIS-3 / BB-5: a wall whose
        // camera-facing side carries decor (painting, mirror) stays up unless it hides the selected character.
        if (isEnclosed(fx, fy) && (!decor.set.has(e.key) || simCut.has(e.key))) cut.add(e.key);
      }
      simCut.forEach(function (k) { cut.add(k); });
    }
    for (const e of W.edges) {
      e.target = mode === 'up' ? WALL_H : mode === 'down' ? CUT_H : (cut.has(e.key) ? CUT_H : WALL_H);
    }
  }
  // edges carrying a visible wall-mounted object whose front faces the camera half-space
  function decorEdges(d) {
    const key = S.objSig + '|' + (d.x >= 0 ? 1 : 0) + (d.z >= 0 ? 1 : 0) + '|' + S.hiddenObjs.size + '|' + S.objs.size;
    if (S._decorCache && S._decorCache.key === key) return S._decorCache.val;
    const val = decorEdgesCompute(d);
    S._decorCache = { key: key, val: val };
    return val;
  }
  function decorEdgesCompute(d) {
    const set = new Set();
    let sig = '';
    S.objs.forEach(function (rec) {
      if (!rec.wallEdge || S.hiddenObjs.has(rec.id)) return;
      const r = normRot(rec.o.rot);
      const fx = r === 1 ? -1 : r === 3 ? 1 : 0, fz = r === 0 ? 1 : r === 2 ? -1 : 0;
      if (fx * d.x + fz * d.z > 0.05) { set.add(rec.wallEdge); sig += rec.wallEdge + ';'; }
    });
    return { set: set, sig: sig };
  }
  // grid DDA: collect wall edges crossed by the segment from (x,z) along (dx,dz) for `len` units
  function traceEdges(x, z, dx, dz, len, out) {
    let tx = Math.floor(x), tz = Math.floor(z);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const adx = Math.abs(dx) < 1e-6 ? 1e-6 : Math.abs(dx), adz = Math.abs(dz) < 1e-6 ? 1e-6 : Math.abs(dz);
    let tMaxX = ((stepX > 0 ? tx + 1 : tx) - x) / (dx || 1e-6);
    let tMaxZ = ((stepZ > 0 ? tz + 1 : tz) - z) / (dz || 1e-6);
    const tDX = 1 / adx, tDZ = 1 / adz;
    let t = 0, guard = 0;
    while (t < len && guard++ < 64) {
      if (tMaxX < tMaxZ) {
        t = tMaxX; if (t > len) break;
        const ex = stepX > 0 ? tx + 1 : tx;
        out.add('v,' + ex + ',' + tz);
        tx += stepX; tMaxX += tDX;
      } else {
        t = tMaxZ; if (t > len) break;
        const ez = stepZ > 0 ? tz + 1 : tz;
        out.add('h,' + tx + ',' + ez);
        tz += stepZ; tMaxZ += tDZ;
      }
    }
  }
  function animateWalls(dt) {
    const W = S.walls;
    if (!W) return;
    let changed = false;
    const sp = 11 * dt;
    for (const e of W.edges) {
      if (e.h !== e.target) {
        const d = e.target - e.h;
        e.h = Math.abs(d) <= sp ? e.target : e.h + Math.sign(d) * sp;
        changed = true;
      }
    }
    if (changed) writeAllWallMatrices();
  }
  function edgeHeight(key) {
    const W = S.walls;
    if (!W) return WALL_H;
    const e = W.byKey.get(key);
    return e ? e.h : null;
  }

  function updateDoors(dt) {
    const W = S.walls;
    if (!W || !W.doors.length) return;
    const k = 1 - Math.exp(-dt * 9);
    for (const e of W.doors) {
      const cx = e.kind === 'h' ? e.x + 0.5 : e.x, cz = e.kind === 'h' ? e.y : e.y + 0.5;
      let best = 99, side = e.door.side;
      S.chars.forEach(function (rec) {
        if (!rec.rig.root.visible) return;
        const dx = rec.px - cx, dz = rec.pz - cz;
        const dd = dx * dx + dz * dz;
        if (dd < best) { best = dd; side = e.kind === 'h' ? (dz >= 0 ? 1 : -1) : (dx >= 0 ? 1 : -1); }
      });
      const want = best < 0.95 * 0.95 ? 1 : 0;
      if (want && e.door.open < 0.05) e.door.side = side;
      e.door.open += (want - e.door.open) * k;
      if (Math.abs(want - e.door.open) < 0.001) e.door.open = want;
      const a = e.door.open * 1.55 * (e.kind === 'h' ? e.door.side : -e.door.side);
      e.door.pivot.rotation.y = e.door.pivot.userData.base + a;
    }
  }

  function updateWindowGlow() {
    const W = S.walls;
    if (!W) return;
    const lit = new Set();
    S.objs.forEach(function (rec) {
      if (rec.lit && !S.hiddenObjs.has(rec.id)) {
        const id = lightIdAt(rec.o.x | 0, rec.o.y | 0);
        if (id > 0) lit.add(id);
      }
    });
    if (W.glass.length) {
      for (const e of W.edges) {
        if (e.t !== 3) continue;
        const a = e.kind === 'h' ? lightIdAt(e.x, e.y - 1) : lightIdAt(e.x - 1, e.y);
        const b = lightIdAt(e.x, e.y);
        e.litWin = lit.has(a) || lit.has(b);
      }
      writeAllWallMatrices();
    }
    updateWindowShafts(lit);
  }

  // ------------------------------------------------------------------ objects
  const BACKSPLASH_MODELS = { counter: 1, dishwasher: 1 };
  function hasWallBehind(o) {
    const s = st();
    const w = s && s.lot && wallAt(s.lot.walls, wallEdgeBehind(o.x | 0, o.y | 0, o.rot));
    return !!(w && (w.t | 0) === 1);
  }
  function objVariant(o) {
    const D = data();
    const thirstyBelow = (D.PLANT && D.PLANT.thirstyBelow) || 50;
    const def = defOf(o.type);
    const model = (def && def.model) || o.type;
    return {
      unmade: !!o.unmade,
      dead: !!o.dead,
      wilting: !o.dead && ((o.water != null && o.water < thirstyBelow / 2) || !!o.wilting),
      spoiled: !!o.spoiled || o.state === 'spoiled' || o.type === 'spoiled_meal',
      servings: o.servings != null ? o.servings : (o.portions != null ? o.portions : null),
      food: o.food || null,
      burnt: !!o.burnt,
      car: o.car || null,
      progress: o.paintProgress != null && isFinite(+o.paintProgress) ? Math.min(3, Math.floor(((+o.paintProgress) % 3) / 0.75)) : null,
      variant: typeof o.id === 'number' ? o.id : (parseInt(String(o.id).replace(/\D/g, ''), 10) || 0),
      backsplash: BACKSPLASH_MODELS[model] ? hasWallBehind(o) : false,
    };
  }
  function objGeomSig(o) {
    const v = objVariant(o);
    return o.type + '|' + (o.x | 0) + '|' + (o.y | 0) + '|' + normRot(o.rot) + '|' + (v.unmade ? 1 : 0) + (v.dead ? 1 : 0) + (v.wilting ? 1 : 0) + (v.spoiled ? 1 : 0) + (v.burnt ? 1 : 0) + (v.backsplash ? 1 : 0) + '|' + (v.servings == null ? '' : v.servings) + '|' + (v.food || '') + '|' + (v.car || '') + '|' + (v.progress == null ? '' : v.progress);
  }
  function isDirtyVisible(o, def) {
    const D = data();
    const vis = (D.DIRT && D.DIRT.visible) || 500;
    return !!(def && def.dirties && (o.dirty || 0) >= vis);
  }
  function isLit(o, def, meta) {
    return !!(((def && def.light) || (meta && meta.light)) && !o.broken && !o.lightOff && o.on !== false && o.lit !== false);
  }
  // small items picked before the surface they lie on (CONTRACT_V2 §4)
  function isPickItem(o, def, meta) {
    if (o.type === 'carpool' || (def && def.model === 'carpool')) return false;
    if (def) return !!(def.noBlock && !def.wall && (!meta.floor || meta.item));
    return !!meta.item;
  }

  function syncObjects() {
    S.dirty.objects = false;
    if (!S.inited) return;
    const s = st();
    const list = (s && Array.isArray(s.objects)) ? s.objects : [];
    const L = lotSize();
    // tile maps: blocking object per tile, surface per tile, small item per tile
    const N = L.w * L.h;
    const block = new Array(N), surf = new Array(N), item = new Array(N);
    for (const o of list) {
      if (!o || o.type == null) continue;
      const d = defOf(o.type);
      if (d && d.noBlock) {
        if (!d.wall && o.type !== 'carpool' && d.model !== 'carpool') {
          const x = o.x | 0, y = o.y | 0;
          if (x >= 0 && y >= 0 && x < L.w && y < L.h && !item[y * L.w + x]) item[y * L.w + x] = o;
        }
        continue;
      }
      const sz = rotatedSize(o.type, o.rot);
      for (let dy = 0; dy < sz.h; dy++) for (let dx = 0; dx < sz.w; dx++) {
        const x = (o.x | 0) + dx, y = (o.y | 0) + dy;
        if (x < 0 || y < 0 || x >= L.w || y >= L.h) continue;
        block[y * L.w + x] = o;
        if (d && d.surface) surf[y * L.w + x] = o;
      }
    }
    S.tileBlock = block; S.tileSurface = surf; S.tileItem = item;
    const seen = new Set();
    for (const o of list) {
      if (!o || o.id == null || o.type == null) continue;
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      const sig = objGeomSig(o);
      let rec = S.objs.get(o.id);
      if (rec && rec.sig !== sig) { removeObj(rec, true); rec = null; }
      if (!rec) rec = createObj(o, sig);
      rec.o = o;
      placeObj(rec);
      applyObjState(rec);
    }
    S.objs.forEach(function (rec, id) { if (!seen.has(id)) removeObj(rec); });
    // only items whose rec is live remain pickable
    for (let i = 0; i < N; i++) if (item[i] && S.objs.get(item[i].id) && S.objs.get(item[i].id).pickItem === false) item[i] = null;
    S.objSig = objectsSignature(s);
    updateWindowGlow();
    buildContactShadows();
    patchScene();
  }

  function createObj(o, sig) {
    const def = defOf(o.type);
    const key = (def && def.model) || o.type;
    const v = objVariant(o);
    const b = baseSize(o.type);
    const group = M.models.build(key, Object.assign({ w: b.w, h: b.h }, v));
    group.userData.objId = o.id;
    group.traverse(function (m) { if (m.isMesh) { m.userData.objId = o.id; m.userData.sharedGeo = true; } });
    const meta = group.userData.meta || {};
    const rec = { id: o.id, o: o, sig: sig, def: def, key: key, group: group, meta: meta, fx: null, flies: null, marker: null,
      solidMeshes: [], glassMeshes: [], glowMeshes: [], screenMeshes: [], useHideMeshes: [], flagMeshes: [], splashMeshes: [], lit: false, lightWorld: null,
      wallEdge: null, isItem: !!(def ? def.noBlock && !def.wall && !meta.floor : meta.item), pickItem: isPickItem(o, def, meta),
      born: S.time };
    group.children.forEach(function (m) {
      const k = m.userData.kind;
      if (k === 'solid') rec.solidMeshes.push(m);
      else if (k === 'glass') rec.glassMeshes.push(m);
      else if (k === 'glow') rec.glowMeshes.push(m);
      else if (k === 'screen') rec.screenMeshes.push(m);
      else if (k === 'useHide') rec.useHideMeshes.push(m);
      else if (k === 'flag') { rec.flagMeshes.push(m); rec.solidMeshes.push(m); }
      else if (k === 'splash') { rec.splashMeshes.push(m); rec.solidMeshes.push(m); }
    });
    S.groups.objects.add(group);
    S.objs.set(o.id, rec);
    return rec;
  }
  // cheap contact shadows: a soft dark patch under every piece of furniture (model footprint, not tile)
  let _csTex = null;
  function contactTexture() {
    if (_csTex) return _csTex;
    _csTex = canvasTex('contact', 64, function (g, s) {
      const img = g.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const u = Math.abs((x + 0.5) / s * 2 - 1), v = Math.abs((y + 0.5) / s * 2 - 1);
        const d = Math.pow(Math.pow(u, 4) + Math.pow(v, 4), 0.25);          // rounded square
        const a = clamp((1 - d) / 0.42, 0, 1);
        const i = (y * s + x) * 4;
        img.data[i] = 24; img.data[i + 1] = 18; img.data[i + 2] = 14; img.data[i + 3] = Math.round(a * a * (3 - 2 * a) * 255);
      }
      g.putImageData(img, 0, 0);
    });
    return _csTex;
  }
  function buildContactShadows() {
    const list = [];
    const bb = new THREE.Box3(), tmpB = new THREE.Box3();
    S.objs.forEach(function (rec) {
      const d = rec.def;
      if (S.hiddenObjs.has(rec.id) || rec.wallEdge || rec.key === 'carpool') return;
      if (d ? d.noBlock : (rec.meta.item || rec.meta.floor)) return;
      bb.makeEmpty();
      for (const m of rec.solidMeshes) { if (m.geometry && m.geometry.boundingBox) { tmpB.copy(m.geometry.boundingBox); bb.union(tmpB); } }
      if (bb.isEmpty()) return;
      list.push({ rec: rec, x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z });
    });
    const sig = list.map(function (it) { return it.rec.id + ':' + it.rec.sig; }).join('|');
    if (sig === S.shadowSig && S.csMesh) return;
    S.shadowSig = sig;
    if (!S.csMat) S.csMat = new THREE.MeshBasicMaterial({ map: contactTexture(), transparent: true, opacity: 0.5, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    if (!S.csMesh || S.csMesh.userData.cap < list.length) {
      if (S.csMesh) { S.groups.fx.remove(S.csMesh); S.csMesh.dispose(); }
      const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-HP);
      const cap = Math.max(32, list.length + 16);
      S.csMesh = newInst(geo, S.csMat, cap);
      S.csMesh.userData.cap = cap; S.csMesh.renderOrder = 1; S.csMesh.name = 'contactShadows';
      S.groups.fx.add(S.csMesh);
    }
    const t = mtx(), loc = new THREE.Matrix4();
    let i = 0;
    for (const it of list) {
      const w = it.x1 - it.x0, dpt = it.z1 - it.z0;
      // local rectangle (model space) grown a little so the soft edge peeks out, then the object's matrix
      loc.compose(t.p.set((it.x0 + it.x1) / 2, 0.0068 - (it.rec.group.position.y || 0), (it.z0 + it.z1) / 2), t.q.set(0, 0, 0, 1), t.s.set(w * 1.12 + 0.08, 1, dpt * 1.12 + 0.08));
      S.csMesh.setMatrixAt(i++, t.m.copy(it.rec.baseMatrix || it.rec.group.matrix).multiply(loc));
    }
    S.csMesh.count = i;
    S.csMesh.instanceMatrix.needsUpdate = true;
  }
  // VIS-8: the carpool stands in the near road lane (the engine keeps its slot at the lot edge)
  const CAR_LANE_Z = 2.75, CAR_TRAVEL = 16, CAR_TWEEN = 2.6;
  function placeObj(rec) {
    const o = rec.o;
    const tr = modelTransform(o.type, o.x, o.y, o.rot);
    let y = 0;
    if (rec.isItem) {
      const L = lotSize();
      const x = o.x | 0, yy = o.y | 0;
      const s = (x >= 0 && yy >= 0 && x < L.w && yy < L.h) ? S.tileSurface[yy * L.w + x] : null;
      if (s && s.id !== o.id) {
        const sd = defOf(s.type);
        y = (sd && sd.surfaceHeight) || (M.models.meta((sd && sd.model) || s.type).surfaceH) || 0.78;
      }
    }
    const g = rec.group;
    const sz = rotatedSize(o.type, o.rot);
    if (rec.key === 'carpool') {
      const L = lotSize();
      const cz = (o.y | 0) + sz.h / 2;
      tr.z += (L.h + CAR_LANE_Z) - cz;
      rec.carBase = { x: tr.x, z: tr.z, rotY: tr.rotY };
      if (rec.carT == null) rec.carT = S.carsReady ? 0 : 1;     // drive in (not on the first sync after load)
      const k = carEase(rec.carT);
      g.position.set(tr.x + carDirX(rec) * -CAR_TRAVEL * (1 - k), 0, tr.z);
    } else g.position.set(tr.x, y, tr.z);
    g.rotation.set(0, tr.rotY, 0);
    g.updateMatrix();
    g.matrixAutoUpdate = false;
    g.updateMatrixWorld(true);
    rec.baseMatrix = g.matrix.clone();
    rec.decorKey = null;
    const def = rec.def;
    rec.wallEdge = (def && def.wall) || rec.meta.wall ? wallEdgeBehind(o.x | 0, o.y | 0, o.rot) : null;
    if (rec.meta.lightPos) {
      const lp = rec.meta.lightPos;
      rec.lightWorld = new THREE.Vector3(lp[0], lp[1], lp[2]).applyMatrix4(g.matrix);
    }
    // centre of the footprint (world), used for support offsets and fx
    rec.cx = (o.x | 0) + sz.w / 2; rec.cz = (o.y | 0) + sz.h / 2;
    rec.tx = o.x | 0; rec.ty = o.y | 0;
  }
  function carEase(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  // the car's nose (+X in model space) direction along world X
  function carDirX(rec) { return Math.cos(rec.carBase ? rec.carBase.rotY : 0) >= 0 ? 1 : -1; }
  function updateCars(dt) {
    S.objs.forEach(function (rec) {
      if (rec.key !== 'carpool' || rec.carT == null || rec.carT >= 1 || !rec.carBase) return;
      rec.carT = Math.min(1, rec.carT + dt / CAR_TWEEN);
      const k = carEase(rec.carT);
      rec.group.matrix.makeRotationY(rec.carBase.rotY).setPosition(rec.carBase.x + carDirX(rec) * -CAR_TRAVEL * (1 - k), 0, rec.carBase.z);
      rec.group.matrixWorldNeedsUpdate = true;
      rec.baseMatrix = rec.group.matrix.clone();
    });
    // departing cars drive on and fade out of the lot
    if (S.departing && S.departing.length) {
      for (let i = S.departing.length - 1; i >= 0; i--) {
        const c = S.departing[i];
        c.t += dt / CAR_TWEEN;
        const k = c.t * c.t;
        c.group.matrix.makeRotationY(c.base.rotY).setPosition(c.base.x + c.dir * CAR_TRAVEL * k, 0, c.base.z);
        c.group.matrixWorldNeedsUpdate = true;
        if (c.t >= 1) { S.groups.fx.remove(c.group); S.departing.splice(i, 1); }
      }
    }
  }
  function applyObjState(rec) {
    const o = rec.o, def = rec.def;
    const m = M.models.materials;
    const dirty = isDirtyVisible(o, def);
    const mat = dirty ? m.solidDirty : m.solid;
    for (const sm of rec.solidMeshes) if (sm.material !== mat) sm.material = mat;
    const gmat = dirty && m.glassDirty ? m.glassDirty : m.glass;
    for (const gm of rec.glassMeshes) if (gm.material !== gmat) gm.material = gmat;
    rec.lit = isLit(o, def, rec.meta);
    // broken fx
    if (o.broken && !rec.fx) rec.fx = makeSmoke(rec);
    else if (!o.broken && rec.fx) { removeFx(rec.fx); rec.fx = null; }
    // dirty: a few flies buzzing around
    if (dirty && !rec.flies) rec.flies = makeFlies(rec);
    else if (!dirty && rec.flies) { S.groups.fx.remove(rec.flies.group); rec.flies = null; }
  }
  function removeObj(rec, rebuild) {
    S.groups.objects.remove(rec.group);
    if (rec.fx) { removeFx(rec.fx); rec.fx = null; }
    if (rec.flies) { S.groups.fx.remove(rec.flies.group); rec.flies = null; }
    if (rec.marker) { S.groups.fx.remove(rec.marker); rec.marker.material.dispose(); rec.marker = null; }
    if (rec.key === 'carpool' && !rebuild && rec.carBase && S.carsReady) {
      // drive away instead of vanishing
      if (!S.departing) S.departing = [];
      S.groups.fx.add(rec.group);
      S.departing.push({ group: rec.group, base: rec.carBase, dir: carDirX(rec), t: 0 });
    }
    S.objs.delete(rec.id);
  }
  function objectsSignature(s) {
    const list = (s && s.objects) || [];
    let h = list.length;
    for (const o of list) {
      if (!o) continue;
      const str = objGeomSig(o) + (o.broken ? 'b' : '') + (isDirtyVisible(o, defOf(o.type)) ? 'd' : '') + (o.lightOff || o.on === false || o.lit === false ? 'o' : '') + o.id;
      for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  // smoke + sparks for broken objects
  let smokeGeo = null, sparkGeo = null, sparkMat = null;
  function makeSmoke(rec) {
    if (!smokeGeo) { smokeGeo = new THREE.IcosahedronGeometry(1, 1); sparkGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035); sparkMat = new THREE.MeshBasicMaterial({ color: col('#ffe066') }); }
    const g = new THREE.Group();
    const top = rec.meta.smoke ? null : (rec.meta.top || 1);
    let p;
    if (rec.meta.smoke) p = new THREE.Vector3(rec.meta.smoke[0], rec.meta.smoke[1], rec.meta.smoke[2]).applyMatrix4(rec.group.matrix);
    else p = new THREE.Vector3(rec.cx, top + rec.group.position.y, rec.cz);
    g.position.copy(p);
    const puffs = [], sparks = [];
    for (let i = 0; i < 8; i++) {
      const mm = new THREE.MeshLambertMaterial({ color: col(i % 3 ? '#57524f' : '#7a7470'), transparent: true, opacity: 0.5, depthWrite: false });
      const m = new THREE.Mesh(smokeGeo, mm);
      m.userData.ownMat = true; m.userData.sharedGeo = true;
      g.add(m); puffs.push(m);
    }
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(sparkGeo, sparkMat); m.userData.sharedGeo = true; g.add(m); sparks.push(m); }
    const flash = new THREE.Sprite(flashMat());
    flash.scale.setScalar(0.42); flash.visible = false;
    g.add(flash);
    S.groups.fx.add(g);
    return { group: g, puffs: puffs, sparks: sparks, flash: flash, seed: Math.random() * 10 };
  }
  let _flashMat = null, _flyGeo = null, _flyMat = null;
  function flashMat() {
    if (_flashMat) return _flashMat;
    const tex = M.models && M.models.glowTexture ? M.models.glowTexture() : null;
    _flashMat = new THREE.SpriteMaterial({ map: tex, color: col('#ffd75e'), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    return _flashMat;
  }
  function removeFx(fx) {
    S.groups.fx.remove(fx.group);
    for (const p of fx.puffs) p.material.dispose();
  }
  // dirty objects: a few flies circling above them
  function makeFlies(rec) {
    if (!_flyGeo) { _flyGeo = new THREE.SphereGeometry(0.022, 6, 4); _flyMat = new THREE.MeshBasicMaterial({ color: col('#1c1b1e') }); }
    const g = new THREE.Group();
    const top = Math.min(1.6, (rec.meta.top || 0.8)) + (rec.group.position.y || 0);
    g.position.set(rec.cx, top + 0.18, rec.cz);
    const flies = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(_flyGeo, _flyMat); m.userData.sharedGeo = true; m.scale.set(1, 0.7, 1.3); g.add(m); flies.push(m); }
    S.groups.fx.add(g);
    return { group: g, flies: flies, seed: Math.random() * 10 };
  }
  function updateFx(t) {
    S.objs.forEach(function (rec) {
      const fx = rec.fx;
      if (fx) {
        fx.puffs.forEach(function (m, i) {
          const ph = (t * 0.38 + i / fx.puffs.length + fx.seed) % 1;
          m.position.set(Math.sin(t * 1.3 + i * 2.1) * 0.12 * ph, ph * 1.05, Math.cos(t * 1.1 + i) * 0.12 * ph);
          const sc = 0.08 + ph * 0.22;
          m.scale.setScalar(sc);
          m.rotation.set(t * 0.5 + i, t * 0.3, 0);
          m.material.opacity = 0.72 * (1 - ph) * Math.min(1, ph * 6);
        });
        let anyOn = false;
        fx.sparks.forEach(function (m, i) {
          const on = Math.sin(t * 17 + i * 2.7 + fx.seed) > 0.72;
          m.visible = on;
          if (on) { anyOn = true; m.position.set(Math.sin(t * 31 + i * 5) * 0.22, 0.04 + Math.abs(Math.sin(t * 23 + i)) * 0.26, Math.cos(t * 29 + i * 3) * 0.22); }
        });
        fx.flash.visible = anyOn && Math.sin(t * 9 + fx.seed) > 0.2;
      }
      const fl = rec.flies;
      if (fl) {
        fl.flies.forEach(function (m, i) {
          const a = t * (2.6 + i * 0.7) + i * 1.7 + fl.seed;
          const r = 0.18 + 0.08 * Math.sin(t * 1.3 + i);
          m.position.set(Math.cos(a) * r, 0.08 * Math.sin(t * 5 + i * 2) + i * 0.03, Math.sin(a * 1.3) * r);
        });
      }
    });
  }

  // ------------------------------------------------------------------ markers (CONTRACT_V2 §4)
  // newspaper holding a job offer: a gently floating badge; mailbox: red flag raised while bills are unpaid
  let _markerTex = {};
  function markerTexture(kind) {
    if (_markerTex[kind]) return _markerTex[kind];
    const t = canvasTex('marker:' + kind, 128, function (g, s) {
      g.clearRect(0, 0, s, s);
      const c = s / 2;
      const glow = g.createRadialGradient(c, c, s * 0.2, c, c, s * 0.5);
      glow.addColorStop(0, kind === 'bill' ? 'rgba(255,110,90,0.55)' : 'rgba(255,214,90,0.6)'); glow.addColorStop(1, 'rgba(255,214,90,0)');
      g.fillStyle = glow; g.fillRect(0, 0, s, s);
      g.beginPath(); g.arc(c, c, s * 0.3, 0, TAU);
      g.fillStyle = kind === 'bill' ? '#e85a48' : '#f6c445'; g.fill();
      g.lineWidth = s * 0.04; g.strokeStyle = '#ffffff'; g.stroke();
      g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff';
      if (kind === 'bill') {          // envelope
        g.fillRect(c - s * 0.15, c - s * 0.1, s * 0.3, s * 0.2);
        g.strokeStyle = kind === 'bill' ? '#e85a48' : '#f6c445'; g.lineWidth = s * 0.025;
        g.beginPath(); g.moveTo(c - s * 0.15, c - s * 0.1); g.lineTo(c, c + s * 0.02); g.lineTo(c + s * 0.15, c - s * 0.1); g.stroke();
      } else {                          // briefcase
        g.fillRect(c - s * 0.16, c - s * 0.07, s * 0.32, s * 0.2);
        g.lineWidth = s * 0.035; g.strokeRect(c - s * 0.06, c - s * 0.13, s * 0.12, s * 0.07);
        g.fillStyle = '#f6c445'; g.fillRect(c - s * 0.16, c + s * 0.0, s * 0.32, s * 0.025);
      }
    });
    t.encoding = THREE.sRGBEncoding;
    _markerTex[kind] = t;
    return t;
  }
  function makeMarker(kind) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(kind), transparent: true, depthWrite: false }));
    sp.scale.setScalar(0.5);
    sp.renderOrder = 8;
    sp.userData.kind = kind;
    S.groups.fx.add(sp);
    return sp;
  }
  function updateMarkers(t) {
    const s = st();
    const bills = s && Array.isArray(s.bills) ? s.bills : [];
    const day = s && s.time ? (+s.time.day || 1) : 1;
    const careers = data().CAREERS || {};
    if (!S.markerRecs || S.markerSig !== S.objSig) {
      S.markerSig = S.objSig;
      S.markerRecs = [];
      S.objs.forEach(function (rec) { if (rec.key === 'newspaper' || rec.key === 'mailbox') S.markerRecs.push(rec); });
    }
    S.markerRecs.forEach(function (rec) {
      if (!S.objs.has(rec.id)) return;
      const o = rec.o;
      let want = null, y = 0.8, scale = 0.5;
      if (rec.key === 'newspaper') {
        if (o.offer && (!Object.keys(careers).length || careers[o.offer])) { want = 'job'; if (o.read) scale = 0.34; }
        y = (rec.group.position.y || 0) + 0.75;
      } else if (rec.key === 'mailbox') {
        const hasBills = bills.length > 0;
        // raised flag while bills are unpaid, lowered otherwise
        const ang = hasBills ? 0 : HP;
        if (rec.flagMeshes.length && rec.flagAng !== ang && rec.meta.flagPivot) {
          rec.flagAng = ang;
          const pv = rec.meta.flagPivot;
          const m4 = new THREE.Matrix4().makeTranslation(pv[0], pv[1], pv[2])
            .multiply(new THREE.Matrix4().makeRotationX(ang)).multiply(new THREE.Matrix4().makeTranslation(-pv[0], -pv[1], -pv[2]));
          for (const fm of rec.flagMeshes) { fm.matrixAutoUpdate = false; fm.matrix.copy(m4); fm.matrixWorldNeedsUpdate = true; }
        }
        if (hasBills && bills.some(function (b) { return (+b.dueDay || 0) - day <= 1; })) want = 'bill';
        y = 1.75; scale = 0.42;
      }
      if (want && !rec.marker) rec.marker = makeMarker(want);
      if (rec.marker && (!want || rec.marker.userData.kind !== want)) { S.groups.fx.remove(rec.marker); rec.marker.material.dispose(); rec.marker = null; if (want) rec.marker = makeMarker(want); }
      if (rec.marker) {
        rec.marker.visible = rec.group.visible !== false;
        rec.marker.position.set(rec.cx, y + 0.07 * Math.sin(t * 2.2 + rec.cx), rec.cz);
        const p = scale * (1 + 0.06 * Math.sin(t * 3.1));
        rec.marker.scale.set(p, p, p);
      }
    });
  }

  // which objects are being used right now (screens on, handsets taken…)
  function usedObjects() {
    const s = st();
    const used = new Map();
    const sims = (s && Array.isArray(s.sims)) ? s.sims : [];
    for (const sim of sims) {
      if (!sim || sim.hidden) continue;
      const a = sim.queue && sim.queue[0];
      if (a && a.objId != null && (a.phase === 'do' || a.phase === 'enter')) used.set(a.objId, sim.anim || 'use');
    }
    return used;
  }
  function updateObjectsDynamic() {
    const used = usedObjects();
    const m = M.models.materials;
    const glowOn = S.night > 0.12;
    S.objs.forEach(function (rec) {
      const u = used.has(rec.id) || used.has(String(rec.id)) || used.has(+rec.id);
      for (const sm of rec.screenMeshes) { const want = u ? m.screenOn : m.screen; if (sm.material !== want) sm.material = want; }
      for (const hm of rec.useHideMeshes) hm.visible = !u;
      const gm = rec.lit && glowOn ? m.glowOn : m.glow;
      for (const g of rec.glowMeshes) if (g.material !== gm) g.material = gm;
      if (S.hiddenObjs.has(rec.id)) { rec.group.visible = false; return; }
      // backsplash panels only while the wall behind the counter stands (they would hide the top otherwise)
      if (rec.splashMeshes.length) {
        const hb = edgeHeight(wallEdgeBehind(rec.tx, rec.ty, rec.o.rot));
        const sv = hb == null || hb >= 1.2;
        for (const sm of rec.splashMeshes) if (sm.visible !== sv) sm.visible = sv;
      }
      if (rec.wallEdge) updateDecor(rec);
      else if (!rec.group.visible) rec.group.visible = true;
    });
    if (S.envLamps) {
      const gm = S.night > 0.25 ? m.glowOn : m.glow;
      for (const g of S.envLamps) if (g.material !== gm) g.material = gm;
    }
  }

  // wall decor: full size on a standing wall; on a cut-down wall a camera-facing item is drawn as a small
  // framed plaque standing on the wall cap (still visible and clickable); an item facing away is hidden.
  function updateDecor(rec) {
    const h = edgeHeight(rec.wallEdge);
    const g = rec.group;
    let mode = 'full';
    if (h != null && h < 1.95) {
      const d = camDir();
      const r = normRot(rec.o.rot);
      const fx = r === 1 ? -1 : r === 3 ? 1 : 0, fz = r === 0 ? 1 : r === 2 ? -1 : 0;
      mode = fx * d.x + fz * d.z > 0.05 ? 'plaque' : 'hidden';
    }
    const key = mode === 'plaque' ? 'p' + h.toFixed(2) : mode;
    if (rec.decorKey === key) return;
    rec.decorKey = key;
    g.visible = mode !== 'hidden';
    if (!rec.baseMatrix) return;
    if (mode === 'plaque') {
      if (rec.decorBottom == null) {
        let lo = Infinity;
        for (const m of g.children) { const bb = m.geometry && m.geometry.boundingBox; if (bb) lo = Math.min(lo, bb.min.y); }
        rec.decorBottom = isFinite(lo) ? lo : 1.0;
      }
      const s = 0.45;
      const loc = new THREE.Matrix4().makeTranslation(0.5, h + 0.015, HT)
        .multiply(new THREE.Matrix4().makeScale(s, s, s))
        .multiply(new THREE.Matrix4().makeTranslation(-0.5, -rec.decorBottom, -HT));
      g.matrix.copy(rec.baseMatrix).multiply(loc);
    } else g.matrix.copy(rec.baseMatrix);
    g.matrixWorldNeedsUpdate = true;
    g.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ lamps
  const LAMP_RANGE = 5.2, LAMP_I = 1.7, FILL_K = 0.5;
  function updateLamps() {
    const pool = S.lampPool;
    const nf = S.night;
    const lit = [];
    const u = lmUniforms();
    const fill = {};
    if (nf > 0.01) {
      // a faint base fill in every room so unlit rooms read at night (not pitch black)
      const R = S.regions;
      if (R) for (const inf of R.info) if (inf.light > 0) fill[inf.light] = 0.14;
      S.objs.forEach(function (rec) {
        if (!rec.lit || !rec.lightWorld || rec.group.visible === false) return;
        lit.push(rec);
        rec.lightReg = lightIdAt(rec.tx, rec.ty);
        if (rec.lightReg > 0) fill[rec.lightReg] = Math.min(1, Math.max(0.45, fill[rec.lightReg] || 0) + 0.25);
      });
      const tx = S.cam.tx, tz = S.cam.tz;
      lit.sort(function (a, b) {
        const da = (a.lightWorld.x - tx) ** 2 + (a.lightWorld.z - tz) ** 2;
        const db = (b.lightWorld.x - tx) ** 2 + (b.lightWorld.z - tz) ** 2;
        return da - db;
      });
    }
    for (let i = 0; i < pool.length; i++) {
      const pl = pool[i];
      const rec = lit[i];
      if (rec) {
        pl.position.copy(rec.lightWorld);
        pl.intensity = LAMP_I * nf;
        pl.distance = LAMP_RANGE;
        u.morLampReg.value[i] = rec.lightReg || 0;
      } else {
        if (pl.intensity !== 0) pl.intensity = 0;
        u.morLampReg.value[i] = -1;
      }
    }
    u.morFill.value = FILL_K * nf;
    LM.fill = fill;
    updateRegionTexture(false);
  }

  // street lamp light pools and window light on the lawn (additive decals, faded in at night)
  let _poolTex = null;
  function poolTexture() {
    if (_poolTex) return _poolTex;
    _poolTex = canvasTex('lightpool', 128, function (g, s) {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,214,150,0.9)'); gr.addColorStop(0.45, 'rgba(255,200,130,0.38)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
    return _poolTex;
  }
  let _shaftTex = null;
  function shaftTexture() {
    if (_shaftTex) return _shaftTex;
    _shaftTex = canvasTex('windowshaft', 64, function (g, s) {
      // near edge (y=0) bright, fading outward; soft sides
      const img = g.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const fy = 1 - y / (s - 1), fx = Math.sin(Math.PI * (x + 0.5) / s);
        const a = Math.pow(fy, 1.6) * Math.pow(fx, 0.8);
        const i = (y * s + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 206; img.data[i + 2] = 140; img.data[i + 3] = Math.round(a * 255);
      }
      g.putImageData(img, 0, 0);
    });
    return _shaftTex;
  }
  function lightDecalMat(tex) {
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  function updateNightDecals() {
    const nf = S.night;
    if (S.poolMat) { S.poolMat.opacity = 0.75 * clamp((nf - 0.15) / 0.6, 0, 1); S.poolMesh.visible = S.poolMat.opacity > 0.01; }
    if (S.shaftMesh && S.shaftMat) { S.shaftMat.opacity = 0.5 * clamp((nf - 0.2) / 0.6, 0, 1); S.shaftMesh.visible = S.shaftMat.opacity > 0.01 && S.shaftMesh.count > 0; }
  }
  // window light patches on the outdoor side of windows of lit rooms
  function updateWindowShafts(litLightIds) {
    const W = S.walls;
    if (!W) return;
    if (!S.shaftMat) S.shaftMat = lightDecalMat(shaftTexture());
    const wins = [];
    for (const e of W.edges) {
      if (e.t !== 3) continue;
      const a = e.kind === 'h' ? { x: e.x, y: e.y - 1 } : { x: e.x - 1, y: e.y };
      const b = { x: e.x, y: e.y };
      const la = lightIdAt(a.x, a.y), lb = lightIdAt(b.x, b.y);
      if (la > 0 && lb === 0 && litLightIds.has(la)) wins.push({ e: e, out: 'B' });
      else if (lb > 0 && la === 0 && litLightIds.has(lb)) wins.push({ e: e, out: 'A' });
    }
    const n = wins.length;
    if (!S.shaftMesh || S.shaftMesh.userData.cap < n) {
      if (S.shaftMesh) { S.groups.fx.remove(S.shaftMesh); S.shaftMesh.dispose(); }
      const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-HP);
      S.shaftMesh = newInst(geo, S.shaftMat, Math.max(8, n * 2));
      S.shaftMesh.userData.cap = Math.max(8, n * 2);
      S.shaftMesh.renderOrder = 1;
      S.groups.fx.add(S.shaftMesh);
    }
    const t = mtx();
    let i = 0;
    const depth = 1.5;
    for (const w of wins) {
      const e = w.e;
      // plane local: x across the window, z outward (texture v=0 at the wall)
      let cx, cz, ry;
      if (e.kind === 'h') { cx = e.x + 0.5; cz = e.y + (w.out === 'B' ? depth / 2 + HT : -depth / 2 - HT); ry = w.out === 'B' ? 0 : PI; }
      else { cz = e.y + 0.5; cx = e.x + (w.out === 'B' ? depth / 2 + HT : -depth / 2 - HT); ry = w.out === 'B' ? HP : -HP; }
      t.p.set(cx, 0.008, cz);
      t.q.setFromAxisAngle(_yAxis || (_yAxis = new THREE.Vector3(0, 1, 0)), ry);
      t.s.set(0.9, 1, depth);
      S.shaftMesh.setMatrixAt(i++, t.m.compose(t.p, t.q, t.s));
    }
    S.shaftMesh.count = i;
    S.shaftMesh.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ characters
  function syncCharacters() {
    S.dirty.sims = false;
    if (!S.inited) return;
    const s = st();
    const sims = (s && Array.isArray(s.sims)) ? s.sims : [];
    const seen = new Set();
    for (const sim of sims) {
      if (!sim || sim.id == null) continue;
      seen.add(sim.id);
      let rec = S.chars.get(sim.id);
      const female = sim.gender === 'f';
      if (rec && (rec.female !== female || rec.name !== sim.name)) { removeChar(rec); rec = null; }
      if (!rec) rec = createChar(sim);
      const ck = JSON.stringify(normColorsKey(sim.colors));
      if (ck !== rec.colorsKey) { rec.rig.setColors(sim.colors); rec.colorsKey = ck; }
    }
    S.chars.forEach(function (rec, id) { if (!seen.has(id)) removeChar(rec); });
    patchScene();
  }
  function normColorsKey(c) { c = c || {}; return [c.skin, c.hair, c.shirt, c.pants]; }
  function createChar(sim) {
    const rig = M.models.character(sim);
    const root = rig.root;
    root.userData.simId = sim.id;
    const blob = new THREE.Mesh(blobGeo(), blobMat());
    blob.rotation.x = -HP; blob.position.y = 0.012; blob.renderOrder = 1;
    blob.userData.sharedGeo = true;
    S.groups.chars.add(blob);
    S.groups.chars.add(root);
    const rec = { id: sim.id, rig: rig, blob: blob, female: sim.gender === 'f', name: sim.name,
      colorsKey: JSON.stringify(normColorsKey(sim.colors)), px: 0, pz: 0, facing: 0, phase: 0, init: false, speed: 0 };
    S.chars.set(sim.id, rec);
    return rec;
  }
  function removeChar(rec) {
    S.groups.chars.remove(rec.rig.root);
    S.groups.chars.remove(rec.blob);
    if (rec.rig.dispose) rec.rig.dispose();
    S.chars.delete(rec.id);
  }
  let _blobGeo = null, _blobMat = null;
  function blobGeo() { return _blobGeo || (_blobGeo = new THREE.CircleGeometry(0.34, 20)); }
  function blobMat() { return _blobMat || (_blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.9 })); }

  function supportFor(sim, rec) {
    const L = lotSize();
    const tx = Math.round(+sim.x || 0), ty = Math.round(+sim.y || 0);
    if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) return null;
    const o = S.tileBlock[ty * L.w + tx];
    if (!o) return null;
    const orec = S.objs.get(o.id);
    if (!orec || !orec.meta.support) return null;
    // vector to the footprint centre in character-local axes
    const dx = orec.cx - rec.px, dz = orec.cz - rec.pz;
    const f = rec.facing;
    const c = Math.cos(f), s = Math.sin(f);
    return { support: orec.meta.support, seatH: orec.meta.seatH, blanket: orec.meta.blanket, recline: !!orec.meta.recline,
      off: { x: dx * c - dz * s, z: dx * s + dz * c } };
  }
  // object rec on the tile the character faces (one tile ahead)
  function objectInFront(sim) {
    const L = lotSize();
    const f = +sim.facing || 0;
    const tx = Math.round((+sim.x || 0) + Math.sin(f)), ty = Math.round((+sim.y || 0) + Math.cos(f));
    if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) return null;
    const o = S.tileBlock[ty * L.w + tx];
    return o ? S.objs.get(o.id) || null : null;
  }
  const SOCIAL_PAIR = { hug: 1, kiss: 1, talk: 1, dance: 1, joke: 1, laugh: 1, angry: 1 };
  // the other character of a two-person social (for hug/kiss spacing), or null
  function partnerOf(sim, sims) {
    const a = sim.queue && sim.queue[0];
    let pid = a && a.targetSimId != null ? a.targetSimId : null;
    if (pid == null) {
      for (const o of sims) {
        if (!o || o === sim || o.hidden) continue;
        const b = o.queue && o.queue[0];
        if (b && b.targetSimId != null && String(b.targetSimId) === String(sim.id)) { pid = o.id; break; }
      }
    }
    let prec = pid != null ? (S.chars.get(pid) || null) : null;
    if (!prec && pid != null) S.chars.forEach(function (r) { if (!prec && String(r.id) === String(pid)) prec = r; });
    return prec && prec.rig.root.visible ? prec : null;
  }

  function updateCharacters(dt) {
    const s = st();
    const sims = (s && Array.isArray(s.sims)) ? s.sims : [];
    const kPos = 1 - Math.exp(-dt * 20), kRot = 1 - Math.exp(-dt * 12);
    const hp = S.tmpHP || (S.tmpHP = new THREE.Vector3());
    for (const sim of sims) {
      if (!sim || sim.id == null) continue;
      const rec = S.chars.get(sim.id);
      if (!rec) continue;
      const root = rec.rig.root;
      const hidden = !!sim.hidden || !isFinite(+sim.x) || !isFinite(+sim.y);
      root.visible = !hidden; rec.blob.visible = !hidden;
      if (hidden) { rec.init = false; continue; }
      const tx = +sim.x + 0.5, tz = +sim.y + 0.5;
      const tf = +sim.facing || 0;
      if (!rec.init || Math.abs(tx - rec.px) + Math.abs(tz - rec.pz) > 3) {
        rec.px = tx; rec.pz = tz; rec.facing = tf; rec.init = true; rec.speed = 0;
      } else {
        const ox = rec.px, oz = rec.pz;
        rec.px += (tx - ox) * kPos; rec.pz += (tz - oz) * kPos;
        const moved = Math.hypot(rec.px - ox, rec.pz - oz);
        rec.phase += moved / 1.25 * TAU;
        rec.speed = dt > 0 ? rec.speed * 0.8 + 0.2 * (moved / dt) : rec.speed;
        rec.facing = angleLerp(rec.facing, tf, kRot);
      }
      root.position.set(rec.px, 0, rec.pz);
      root.rotation.y = rec.facing;
      let anim = sim.anim || 'idle';
      if (anim === 'idle' && rec.speed > 0.35) anim = 'walk';
      const ctx = { seated: !!sim.seated, phase: rec.phase, awake: !sim.asleep };
      let sup = null;
      if (ON_ANIMS[anim] || sim.seated) {
        sup = supportFor(sim, rec);
        if (sup) { ctx.support = sup.support; ctx.seatH = sup.seatH; ctx.off = sup.off; ctx.recline = sup.recline; }
        // VIS-12: the blanket only covers a character who is actually asleep (not "Deitar e relaxar")
        rec.rig.setBlanket(sup && sup.support === 'bed' && anim === 'sleep' && sim.asleep ? sup.blanket : null);
      } else rec.rig.setBlanket(null);
      // VIS-7: two-person socials know how far the partner stands
      if (SOCIAL_PAIR[anim]) {
        const prec = partnerOf(sim, sims);
        if (prec) ctx.partnerDist = Math.hypot(prec.px - rec.px, prec.pz - rec.pz);
      }
      // VIS-13: props that depend on the object being used / faced (the meal action keeps the fridge as its
      // object through every stage, so the counter vs stove stage is told apart by the object in front)
      if (anim === 'phone' || anim === 'cook') {
        const act = sim.queue && sim.queue[0];
        const orec = act && act.objId != null ? (S.objs.get(act.objId) || S.objs.get(+act.objId) || S.objs.get(String(act.objId))) : null;
        if (anim === 'phone' && orec && orec.key === 'phone') ctx.prop = 'handset';
        if (anim === 'cook') {
          const front = objectInFront(sim);
          if (front ? front.key !== 'stove' : (orec && orec.key !== 'stove')) ctx.prep = true;
        }
      }
      M.models.animate(rec.rig, anim, S.animT + rec.rig.seed * 17, ctx);
      // VIS-6: the ground shadow follows the body (hips), smaller when the character rests on furniture
      rec.rig.parts.hips.getWorldPosition(hp);
      rec.blob.position.set(hp.x, 0.012, hp.z);
      const onFurniture = !!(sup || ((anim === 'computer' || anim === 'piano' || anim === 'chess') && !sup));
      const lying = sup && (sup.support === 'bed' || sup.support === 'tub' || sup.support === 'hottub');
      rec.blob.visible = !lying;
      const bs = onFurniture ? 0.7 : 1;
      rec.blob.scale.set(bs, bs, bs);
    }
  }

  // selection ring + orb
  function ensureSelectionVisuals() {
    if (S.ring) return;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.46, 40), new THREE.MeshBasicMaterial({ color: col('#ffcf4a'), transparent: true,
      opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -HP; ring.renderOrder = 2;
    S.groups.fx.add(ring);
    S.ring = ring;
    const orb = M.models.orb();
    S.groups.fx.add(orb);
    S.orb = orb;
  }
  function updateSelection(t) {
    ensureSelectionVisuals();
    let rec = S.selectedId != null ? S.chars.get(S.selectedId) : null;
    if (!rec && S.selectedId != null) {           // tolerate '12' vs 12 ids from the UI
      S.chars.forEach(function (r) { if (!rec && String(r.id) === String(S.selectedId)) rec = r; });
    }
    const s = st();
    const sim = rec && s && Array.isArray(s.sims) ? s.sims.find(function (x) { return x && x.id === rec.id; }) : null;
    const show = !!(rec && sim && rec.rig.root.visible);
    S.ring.visible = show; S.orb.visible = show;
    if (!show) return;
    rec.rig.parts.hips.getWorldPosition(S.tmpV);
    S.ring.position.set(S.tmpV.x, 0.02, S.tmpV.z);
    const pulse = 1 + 0.05 * Math.sin(t * 4);
    S.ring.scale.set(pulse, pulse, 1);
    S.ring.material.color.copy(col(sim.visitor ? '#8fd8ff' : '#ffcf4a'));
    const head = rec.rig.parts.head;
    head.getWorldPosition(S.tmpV);
    S.orb.position.set(S.tmpV.x, S.tmpV.y + 0.52 + 0.04 * Math.sin(t * 2.2), S.tmpV.z);
    S.orb.rotation.y = t * 0.8;
    let c = '#7bd36b';
    try { if (M.engine && M.engine.moodColor) c = M.engine.moodColor(sim) || c; } catch (e) { /* ignore */ }
    if (c !== S.orbColor) { S.orb.userData.setColor(c); S.orbColor = c; }
  }

  // ------------------------------------------------------------------ time of day
  // [hour, sky(bg), hemiSky, hemiGround, hemiI, sunColor, sunI]
  const SKY = [
    [0, '#141c35', '#3c5288', '#141a28', 0.42, '#8098d8', 0.16],
    [4.6, '#141c35', '#3c5288', '#141a28', 0.42, '#8098d8', 0.16],
    [5.5, '#5d6292', '#8d89b4', '#3b3542', 0.55, '#caa4bb', 0.25],
    [6.3, '#f0b597', '#f7cdb4', '#6d5a4c', 0.72, '#ffb47e', 0.65],
    [7.6, '#bfe1f3', '#f6f1ea', '#7d6a50', 0.76, '#ffe2bf', 1.02],
    [12, '#a6d5f2', '#fbf4e8', '#8a7354', 0.76, '#ffeacb', 1.22],
    [16, '#b0d7ee', '#fbf1e2', '#8a7354', 0.76, '#ffe6c4', 1.1],
    [17.4, '#f2c68f', '#ffe3bf', '#7d6447', 0.74, '#ffc47e', 0.9],
    [18.4, '#e08b72', '#e9a9a2', '#5a4642', 0.66, '#ff9364', 0.55],
    [19.3, '#4c5088', '#6e70a2', '#2c2b3b', 0.55, '#9d97cb', 0.25],
    [20.5, '#18213f', '#3c5288', '#141a28', 0.42, '#8098d8', 0.16],
    [24, '#141c35', '#3c5288', '#141a28', 0.42, '#8098d8', 0.16],
  ];
  const _c1 = { a: null, b: null };
  function lerpHex(a, b, t, out) {
    if (!_c1.a) { _c1.a = new THREE.Color(); _c1.b = new THREE.Color(); }
    _c1.a.set(a); _c1.b.set(b);
    out.copy(_c1.a).lerp(_c1.b, t);
    return out;
  }
  function skyAt(hour) {
    let i = 0;
    while (i < SKY.length - 2 && hour >= SKY[i + 1][0]) i++;
    const A = SKY[i], B = SKY[i + 1];
    const t = clamp((hour - A[0]) / Math.max(1e-6, B[0] - A[0]), 0, 1);
    const k = t * t * (3 - 2 * t);
    return { A: A, B: B, k: k };
  }
  const _sky = { bg: null, hs: null, hg: null, sc: null, dir: null };
  function updateLighting(dt) {
    const s = st();
    const target = s && s.time ? (+s.time.minute || 0) : 720;
    if (!S.minuteInit) { S.minute = target; S.minuteInit = true; }
    else {
      let d = target - S.minute;
      if (d < -720) d += 1440; else if (d > 720) d -= 1440;
      if (Math.abs(d) > 90) S.minute = target;
      else S.minute += d * (1 - Math.exp(-dt * 6));
      S.minute = (S.minute + 1440) % 1440;
    }
    const hour = S.minute / 60;
    if (!_sky.bg) { _sky.bg = new THREE.Color(); _sky.hs = new THREE.Color(); _sky.hg = new THREE.Color(); _sky.sc = new THREE.Color(); _sky.dir = new THREE.Vector3(); }
    const f = skyAt(hour);
    lerpHex(f.A[1], f.B[1], f.k, _sky.bg);
    lerpHex(f.A[2], f.B[2], f.k, _sky.hs);
    lerpHex(f.A[3], f.B[3], f.k, _sky.hg);
    lerpHex(f.A[5], f.B[5], f.k, _sky.sc);
    const hemiI = f.A[4] + (f.B[4] - f.A[4]) * f.k;
    const sunI = f.A[6] + (f.B[6] - f.A[6]) * f.k;
    S.scene.background.copy(_sky.bg);
    S.scene.fog.color.copy(_sky.bg);
    S.hemi.color.copy(_sky.hs).convertSRGBToLinear();
    S.hemi.groundColor.copy(_sky.hg).convertSRGBToLinear();
    S.hemi.intensity = hemiI;
    S.sun.color.copy(_sky.sc).convertSRGBToLinear();
    S.sun.intensity = sunI;
    // sun / moon direction
    const sunDir = function (h) {
      const a = clamp((h - 6) / 12.5, 0, 1) * PI;
      const el = (14 + 40 * Math.sin(a)) * PI / 180;
      return new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), (0.35 + Math.sin(a) * 0.65) * Math.cos(el)).normalize();
    };
    const moon = new THREE.Vector3(-0.45, 0.78, 0.45).normalize();
    let dir;
    if (hour >= 6.2 && hour <= 18.3) dir = sunDir(hour);
    else if (hour > 18.3 && hour < 18.9) dir = sunDir(18.3).lerp(moon, (hour - 18.3) / 0.6).normalize();
    else if (hour > 5.6 && hour < 6.2) dir = moon.clone().lerp(sunDir(6.2), (hour - 5.6) / 0.6).normalize();
    else dir = moon;
    const L = { w: S.lotW || 24, h: S.lotH || 20 };
    S.sun.position.set(L.w / 2 + dir.x * 60, dir.y * 60, L.h / 2 + 1 + dir.z * 60);
    // night factor for lamps (1 at night, 0 by day)
    let nf;
    if (hour < 5) nf = 1; else if (hour < 7) nf = 1 - (hour - 5) / 2; else if (hour < 17.3) nf = 0; else if (hour < 19.3) nf = (hour - 17.3) / 2; else nf = 1;
    S.night = clamp(nf, 0, 1);
    getWallMats().glassLit.opacity = 0.55 * S.night;
  }

  // ------------------------------------------------------------------ camera
  function updateCamera(dt) {
    const c = S.cam;
    const k = 1 - Math.exp(-dt * 10);
    c.tx += (c.gx - c.tx) * k; c.tz += (c.gz - c.tz) * k;
    c.dist += (c.distGoal - c.dist) * k;
    c.yaw += (c.yawGoal - c.yaw) * (1 - Math.exp(-dt * 9));
    if (Math.abs(c.yawGoal - c.yaw) < 1e-4) c.yaw = c.yawGoal;
    const cp = Math.cos(c.pitch);
    const d = c.dist * (S.aspectK || 1);
    S.camera.position.set(c.tx + d * cp * Math.sin(c.yaw), d * Math.sin(c.pitch), c.tz + d * cp * Math.cos(c.yaw));
    S.camera.lookAt(c.tx, 0.6, c.tz);
    S.camera.updateMatrixWorld();
  }
  function clampTarget() {
    const L = lotSize();
    S.cam.gx = clamp(S.cam.gx, -2, L.w + 2);
    S.cam.gz = clamp(S.cam.gz, -2, L.h + 5);
  }
  function rotate(dir) {
    dir = dir < 0 ? -1 : 1;
    S.cam.k = ((S.cam.k + dir) % 4 + 4) % 4;
    S.cam.yawGoal += dir * HP;
    S.userCamT = nowS();
  }
  function zoom(delta) {
    const d = +delta || 0;
    S.cam.distGoal = clamp(S.cam.distGoal * Math.exp(clamp(d, -500, 500) * 0.0012), 9, 70);
    S.userCamT = nowS(); S.camZoomTouched = true;
  }
  function pan(dx, dy) {
    S.userCamT = nowS();
    panView(dx, dy);
  }
  function panView(dx, dy) {
    const c = S.cam;
    const h = S.size.h || 600;
    const upp = 2 * c.dist * (S.aspectK || 1) * Math.tan((S.camera.fov * PI / 180) / 2) / h;
    const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);       // screen right on the ground
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);      // screen up (away from camera) on the ground
    const sy = 1 / Math.max(0.3, Math.sin(c.pitch));
    c.gx += (-dx * rx + dy * fx * sy) * upp;
    c.gz += (-dx * rz + dy * fz * sy) * upp;
    clampTarget();
  }
  function focus(x, y, snap) {
    S.refocus = false;            // an explicit focus wins over a pending default re-centre
    // an explicit focus (toast "Ver", portrait tap, tests) counts as a camera move: auto-frame must not pull the
    // view straight back to the selected character
    S.userCamT = nowS();
    S.cam.gx = (+x || 0) + 0.5; S.cam.gz = (+y || 0) + 0.5;
    // on phones (or when the UI reported its panels) centre the point in the area clear of the HUD
    const ins = framingInsets();
    if (ins) panView((ins.left - ins.right) / 2, (ins.top - ins.bottom) / 2);
    clampTarget();
    if (snap) { S.cam.tx = S.cam.gx; S.cam.tz = S.cam.gz; }
  }
  // HUD areas (px) the selected character should stay clear of. The UI may report them with
  // setViewInsets({ top, right, bottom, left }); otherwise portrait screens use a default.
  function setViewInsets(o) {
    if (!o) { S.insets = null; return; }
    S.insets = { top: Math.max(0, +o.top || 0), right: Math.max(0, +o.right || 0), bottom: Math.max(0, +o.bottom || 0), left: Math.max(0, +o.left || 0) };
  }
  function framingInsets() {
    if (S.insets) return S.insets;
    const w = S.size.w, h = S.size.h;
    if (w / h < 0.8) return { top: 70, right: 62, bottom: Math.round(h * 0.24), left: 10 };
    return null;
  }
  // keep the selected character clear of the HUD: when it is on screen but under a panel / at the edge
  // (and the player has not moved the camera for a few seconds) the view eases to bring it back
  // Auto-frame (keep the selected character clear of the HUD). It only follows a character that walks
  // under a HUD panel / off the edge by itself: once the player moves the camera so the character sits
  // outside the clear area, it stays disarmed until the character is back inside. Selecting a character
  // that is on screen but under a panel frames it once.
  function autoFrame(dt) {
    S.frameT += dt;
    if (S.frameT < 0.35 && !S.autoFrameKick) return;
    S.frameT = 0;
    const kick = S.autoFrameKick; S.autoFrameKick = false;
    if (S.selectedId == null) return;
    const um = uiMode();
    if (um === 'buy' || um === 'build') return;           // furniture work: the camera stays where it is
    const rec = S.chars.get(S.selectedId) || null;
    if (!rec || !rec.rig.root.visible) return;
    const w = S.size.w, h = S.size.h;
    const ins = framingInsets() || { top: 60, right: 0, bottom: 96, left: 0 };
    rec.rig.parts.head.getWorldPosition(S.tmpV2);
    const head = project(S.tmpV2.x, S.tmpV2.y + 0.3, S.tmpV2.z), feet = project(rec.px, 0, rec.pz);
    const m = 24;
    const x0 = ins.left + m, x1 = w - ins.right - m, y0 = ins.top + m, y1 = h - ins.bottom - m;
    if (x1 - x0 < 60 || y1 - y0 < 80) return;
    const inside = feet.x >= x0 && feet.x <= x1 && head.y >= y0 && feet.y <= y1;
    const onScreen = (head.visible || feet.visible) && feet.x > -20 && feet.x < w + 20 && head.y > -20 && feet.y < h + 20;
    const camMoved = S.userCamT !== S.afCamStamp;
    S.afCamStamp = S.userCamT;
    if (S.afSel !== S.selectedId) { S.afSel = S.selectedId; S.afArmed = inside; }
    if (inside) { S.afArmed = true; return; }
    if (camMoved && !kick) { S.afArmed = false; return; }  // the player put it there: leave the view alone
    if (!onScreen) return;
    if (nowS() - S.userCamT < 1.5) return;                  // never during a camera gesture
    if (!S.afArmed && !kick) return;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const px = feet.x, py = (head.y + feet.y) / 2;
    panView(cx - px, cy - py);
  }

  // test/debug helper: set camera state directly
  function setCamera(o) {
    o = o || {};
    if (o.k != null) { const k = ((o.k | 0) % 4 + 4) % 4; S.cam.k = k; S.cam.yawGoal = S.cam.yaw = PI / 4 + k * HP; }
    if (o.dist != null) S.cam.distGoal = S.cam.dist = clamp(+o.dist, 5, 120);
    if (o.x != null) { S.cam.gx = S.cam.tx = +o.x; }
    if (o.z != null) { S.cam.gz = S.cam.tz = +o.z; }
    if (o.pitch != null) S.cam.pitch = clamp(+o.pitch, 0.3, 1.45);
    S.cutSig = '';
    S.userCamT = nowS();
  }
  function getCamera() {
    const c = S.cam;
    return { x: c.gx, z: c.gz, dist: c.distGoal, k: c.k, yaw: c.yawGoal, pitch: c.pitch };
  }

  // ------------------------------------------------------------------ wall mode / selection
  function setWallMode(mode) {
    if (mode !== 'up' && mode !== 'down' && mode !== 'cutaway') return;
    S.wallMode = mode;
    S.cutSig = '';
  }
  function setSelected(simId) {
    const changed = String(S.selectedId) !== String(simId);
    S.selectedId = simId == null ? null : simId;
    S.cutSig = '';
    if (changed && simId != null) S.autoFrameKick = true;
  }
  // CONTRACT_V2 §4: the UI raises every wall while a wall-mounted item is placed / selected in Buy mode
  function setWallsUpOverride(on) {
    on = !!on;
    if (on === S.wallsUpOverride) return;
    S.wallsUpOverride = on;
    S.cutSig = '';
  }
  // CONTRACT_V2 §4: hide an object (the original while it is being moved); hidden objects are not picked
  function hideObject(objId, hide) {
    if (objId == null) return;
    const rec = S.objs.get(objId) || S.objs.get(+objId) || S.objs.get(String(objId));
    const id = rec ? rec.id : objId;
    if (hide === false) S.hiddenObjs.delete(id); else S.hiddenObjs.add(id);
    if (rec) { rec.group.visible = !S.hiddenObjs.has(id); rec.decorKey = null; }
    S.cutSig = '';
    S.shadowSig = '';
  }

  // ------------------------------------------------------------------ frame
  function frame(dtReal) {
    if (!S.inited) return;
    const dt = clamp(+dtReal || 0.016, 0, 0.1);
    S.time += dt;
    const s = st();
    if (s !== S.lastState) { S.lastState = s; S.dirty.lot = S.dirty.objects = S.dirty.sims = true; S.minuteInit = false; S.carsReady = false; }
    const speed = s ? (s.speed | 0) : 1;
    S.animT += dt * (speed <= 0 ? 0 : speed === 1 ? 1 : speed === 2 ? 1.6 : 2.2);
    if (S.dirty.lot) syncLot();
    if (S.dirty.objects) syncObjects();
    if (S.dirty.sims) syncCharacters();
    if (S.refocus) { S.refocus = false; focusDefault(true); }
    S.checkT += dt;
    if (S.checkT > 0.4) {
      S.checkT = 0;
      if (lotSignature(s) !== S.lotSig) { syncLot(); syncObjects(); }
      else if (objectsSignature(s) !== S.objSig) syncObjects();
      const sims = (s && s.sims) || [];
      if (sims.length !== S.chars.size || sims.some(function (x) { return x && !S.chars.has(x.id); })) syncCharacters();
      else for (const sim of sims) { const r = sim && S.chars.get(sim.id); if (r && JSON.stringify(normColorsKey(sim.colors)) !== r.colorsKey) { r.rig.setColors(sim.colors); r.colorsKey = JSON.stringify(normColorsKey(sim.colors)); } }
    }
    S.carsReady = true;
    updateCamera(dt);
    updateLighting(dt);
    updateCharacters(dt);
    autoFrame(dt);
    computeCut(false);
    animateWalls(dt);
    updateDoors(dt);
    updateObjectsDynamic();
    updateCars(dt);
    updateFx(S.time);
    updateMarkers(S.time);
    updateLamps();
    updateNightDecals();
    updateSelection(S.time);
    updateGhostPulse(S.time);
    S.renderer.render(S.scene, S.camera);
  }

  // ------------------------------------------------------------------ picking
  function setRay(clientX, clientY) {
    const rect = S.renderer.domElement.getBoundingClientRect();
    const w = rect.width || S.size.w, h = rect.height || S.size.h;
    S.ndc.set(((clientX - rect.left) / w) * 2 - 1, -((clientY - rect.top) / h) * 2 + 1);
    S.raycaster.setFromCamera(S.ndc, S.camera);
    return S.raycaster.ray;
  }
  function groundPoint(ray, y) {
    y = y || 0;
    if (Math.abs(ray.direction.y) < 1e-6) return null;
    const t = (y - ray.origin.y) / ray.direction.y;
    if (t < 0) return null;
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t, t: t };
  }
  function visibleChain(o) {
    while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  }
  // distance between a ray and a segment AB; returns { d, t } (t = distance along the ray)
  function raySegment(ray, A, B) {
    const o = ray.origin, d = ray.direction;
    const ux = B.x - A.x, uy = B.y - A.y, uz = B.z - A.z;
    const wx = o.x - A.x, wy = o.y - A.y, wz = o.z - A.z;
    const a = d.x * d.x + d.y * d.y + d.z * d.z;
    const b = d.x * ux + d.y * uy + d.z * uz;
    const c = ux * ux + uy * uy + uz * uz;
    const dd = d.x * wx + d.y * wy + d.z * wz;
    const e = ux * wx + uy * wy + uz * wz;
    const den = a * c - b * b;
    let sc, tc;
    if (den < 1e-8) { sc = 0; tc = c > 0 ? e / c : 0; }
    else { sc = (b * e - c * dd) / den; tc = (a * e - b * dd) / den; }
    tc = clamp(tc, 0, 1);
    sc = (b * tc - dd) / a;
    if (sc < 0) sc = 0;
    const px = o.x + d.x * sc - (A.x + ux * tc), py = o.y + d.y * sc - (A.y + uy * tc), pz = o.z + d.z * sc - (A.z + uz * tc);
    return { d: Math.sqrt(px * px + py * py + pz * pz), t: sc };
  }
  // world units per screen pixel at distance `t` from the camera (perspective)
  function worldPerPixel(t) {
    const h = S.size.h || 600;
    return 2 * Math.max(0.1, t) * Math.tan((S.camera.fov * PI / 180) / 2) / h;
  }
  function coarsePointer() {
    if (S._coarse == null) {
      try { S._coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { S._coarse = false; }
    }
    return S._coarse;
  }
  // characters under the ray: enlarged capsule (wider while walking) plus a screen-space snap radius
  // (18 px, 24 px on touch). Body hits beat snap hits; body hits sort by depth, snap hits by distance.
  function pickSimCandidates(ray, opts) {
    const out = [];
    const A = S.tmpPA || (S.tmpPA = new THREE.Vector3()), B = S.tmpPB || (S.tmpPB = new THREE.Vector3()), K = S.tmpPK || (S.tmpPK = new THREE.Vector3());
    const snapPx = opts && opts.snapPx != null ? +opts.snapPx : (coarsePointer() ? 24 : 18);
    S.chars.forEach(function (rec) {
      if (!rec.rig.root.visible) return;
      rec.rig.root.updateMatrixWorld(true);
      rec.rig.parts.head.getWorldPosition(A); A.y += 0.14;
      rec.rig.parts.footL.getWorldPosition(B); rec.rig.parts.footR.getWorldPosition(K);
      B.add(K).multiplyScalar(0.5);
      const r = raySegment(ray, A, B);
      const bodyR = rec.speed > 0.35 ? 0.42 : 0.31;
      const R = Math.max(bodyR, snapPx * worldPerPixel(r.t));
      if (r.d < R) out.push({ id: rec.id, t: r.t, d: r.d, body: r.d < bodyR });
    });
    out.sort(function (a, b) {
      if (a.body !== b.body) return a.body ? -1 : 1;
      return a.body ? a.t - b.t : a.d - b.d;
    });
    return out;
  }
  // small items (meal, plates, newspaper, puddle…) lying on a tile
  function itemOnTile(x, y) {
    const L = lotSize();
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return null;
    const o = S.tileItem && S.tileItem[y * L.w + x];
    if (!o) return null;
    const rec = S.objs.get(o.id);
    if (!rec || !visibleChain(rec.group)) return null;
    return o;
  }
  function uiMode() {
    try { return M.ui && typeof M.ui.mode === 'string' ? M.ui.mode : null; } catch (e) { return null; }
  }
  /**
   * pick(clientX, clientY, opts?) — CONTRACT_V2 §4 order: characters (enlarged capsule + snap radius),
   * small items on the tile the hit lands on, other objects, ground. Visible walls occlude characters
   * and objects behind them. opts: { objectsOnly } (skip characters; default true in Buy/Build mode),
   * { includeCharacters } (force characters even in Buy/Build), { preferItems } (default: Live mode only),
   * { snapPx }.
   */
  function pick(clientX, clientY, opts) {
    if (!S.inited) return null;
    opts = opts || {};
    const ray = setRay(clientX, clientY);
    const gp = groundPoint(ray, 0);
    const L = lotSize();
    const tileOf = function (p) {
      if (!p) return null;
      const x = Math.floor(p.x), y = Math.floor(p.z);
      return (x >= 0 && y >= 0 && x < L.w && y < L.h) ? { x: x, y: y } : null;
    };
    const mode = uiMode();
    const buildish = mode === 'buy' || mode === 'build';
    const objectsOnly = opts.objectsOnly != null ? !!opts.objectsOnly : (!opts.includeCharacters && buildish);
    // the "item on this tile" preference is for Live mode; in Buy/Build the furniture under it is what the
    // player wants to move or sell (an item is still picked when the ray hits the item itself)
    const preferItems = opts.preferItems != null ? !!opts.preferItems : !buildish;
    const wallHit = raycastWalls();
    const hits = S.raycaster.intersectObjects(S.groups.objects.children, true);
    let objHit = null;
    for (const h of hits) { if (visibleChain(h.object) && h.object.userData.objId != null) { objHit = h; break; } }
    if (!objectsOnly) {
      const wallT = wallHit ? wallHit.distance + 0.12 : Infinity;
      const cands = pickSimCandidates(ray, opts);
      for (const c of cands) {
        if (c.t > wallT) continue;                                            // behind a visible wall (BB-2)
        if (!c.body && objHit && objHit.distance < c.t - 0.45) continue;      // snap only: an object is clearly in front
        return { kind: 'sim', id: c.id };
      }
    }
    const asObject = function (o, x, y, extra) {
      const rec = S.objs.get(o.id);
      const res = { kind: 'object', id: o.id, x: x, y: y };
      if (rec && rec.meta.floor) res.floor = true;
      if (extra) Object.assign(res, extra);
      return res;
    };
    if (objHit && (!wallHit || objHit.distance <= wallHit.distance + 0.02)) {
      const t = { x: Math.floor(objHit.point.x), y: Math.floor(objHit.point.z) };
      const rec = S.objs.get(objHit.object.userData.objId);
      // an item lying on the tile the hit lands on wins over its counter/table (LIVE-1)
      if (rec && !rec.pickItem && preferItems) {
        const it = itemOnTile(t.x, t.y);
        if (it) return asObject(it, t.x, t.y, { item: true });
      }
      const res = { kind: 'object', id: objHit.object.userData.objId, x: t.x, y: t.y };
      if (rec && rec.meta.floor) res.floor = true;
      if (rec && rec.pickItem) res.item = true;
      return res;
    }
    if (wallHit) {
      // the tile in front of the wall face the user clicked
      const p = wallHit.point.clone().addScaledVector(ray.direction, -0.08);
      const t = tileOf({ x: p.x, z: p.z });
      if (t) return { kind: 'tile', x: t.x, y: t.y, wall: wallHit.edgeKey || null };
    }
    const t = tileOf(gp);
    if (t && preferItems) {
      const it = itemOnTile(t.x, t.y);
      if (it) return asObject(it, t.x, t.y, { item: true });
    }
    return t ? { kind: 'tile', x: t.x, y: t.y } : null;
  }
  // nearest wall hit (any wall mesh) for the current ray, with its edge key
  function raycastWalls() {
    if (!S.walls || !S.walls.meshes) return null;
    const hits = S.raycaster.intersectObjects(S.walls.meshes, false);
    for (const h of hits) {
      const key = h.object.userData.instEdge && h.object.userData.instEdge[h.instanceId];
      if (key) { h.edgeKey = key; return h; }
    }
    return null;
  }
  function pickTile(clientX, clientY) {
    if (!S.inited) return null;
    const gp = groundPoint(setRay(clientX, clientY), 0);
    if (!gp) return null;
    const L = lotSize();
    const x = Math.floor(gp.x), y = Math.floor(gp.z);
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return null;
    return { x: x, y: y, fx: gp.x, fy: gp.z };
  }
  function pickGround(clientX, clientY) {
    if (!S.inited) return null;
    const gp = groundPoint(setRay(clientX, clientY), 0);
    return gp ? { fx: gp.x, fy: gp.z } : null;
  }
  function validEdge(kind, x, y) {
    const L = lotSize();
    if (kind === 'h') return x >= 0 && x < L.w && y >= 0 && y <= L.h;
    return x >= 0 && x <= L.w && y >= 0 && y < L.h;
  }
  // ray vs axis-aligned box: entry distance and the axis of the entry face (0 x, 1 y, 2 z), or null
  function rayBox(ray, x0, y0, z0, x1, y1, z1) {
    const o = ray.origin, d = ray.direction;
    let tmin = -Infinity, tmax = Infinity, axis = -1;
    const lo = [x0, y0, z0], hi = [x1, y1, z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(dd[i]) < 1e-9) { if (oo[i] < lo[i] || oo[i] > hi[i]) return null; continue; }
      let ta = (lo[i] - oo[i]) / dd[i], tb = (hi[i] - oo[i]) / dd[i];
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > tmin) { tmin = ta; axis = i; }
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return null;
    }
    if (tmax < 0) return null;
    return { t: Math.max(0, tmin), axis: axis };
  }
  function edgeResult(key, side, how) {
    const p = String(key).split(',');
    return { key: key, kind: p[0], x: +p[1], y: +p[2], side: side, wall: !!wallAt((st() && st().lot && st().lot.walls) || {}, key), how: how };
  }
  // side of an edge the ground point (fx, fz) lies on
  function sideOfPoint(kind, x, y, fx, fz) {
    return kind === 'h' ? (fz < y ? 'A' : 'B') : (fx < x ? 'A' : 'B');
  }
  /**
   * pickEdge(clientX, clientY, opts?) → { key, kind, x, y, side: 'A'|'B', wall: bool } | null
   * Tools that need an existing wall (door, window, wallpaper, demolish) hit the FULL-HEIGHT volume of
   * every wall (the same slab the edge ghost draws), so aiming at a cut-down stub or just above it
   * targets that wall (BB-1). Resolution order:
   *  1. the nearest wall whose volume the ray enters at or below its visible height (+0.6 above a cut
   *     stub) — what the player sees under the cursor;
   *  2. a wall edge within 0.6 tile of the ground point;
   *  3. the wall whose full-height ghost slab contains the cursor with the smallest overshoot;
   *  4. (unless opts.wallsOnly) the nearest grid edge within 0.35 tile of the ground point, wall or not.
   * `side` (CONTRACT_V2 §1) is the face under the cursor: the face the ray enters on a standing wall,
   * the far (room) side when aiming over a cut stub, or the ground point's side for ground picks.
   */
  function pickEdge(clientX, clientY, opts) {
    if (!S.inited) return null;
    opts = opts || {};
    const ray = setRay(clientX, clientY);
    const gp = groundPoint(ray, 0);
    const d = ray.direction;
    const W = S.walls;
    const pad = HT + 0.05;
    const hits = [];
    if (W) {
      for (const e of W.edges) {
        let r;
        if (e.kind === 'h') r = rayBox(ray, e.x, 0, e.y - pad, e.x + 1, WALL_H, e.y + pad);
        else r = rayBox(ray, e.x - pad, 0, e.y, e.x + pad, WALL_H, e.y + 1);
        if (!r) continue;
        if (gp && r.t > gp.t + 0.01) continue;                     // entry below ground
        const y = ray.origin.y + d.y * r.t;
        hits.push({ e: e, t: r.t, y: y, excess: y - e.h, axis: r.axis });
      }
      hits.sort(function (a, b) { return a.t - b.t; });
      for (const h of hits) {
        const margin = h.e.h < WALL_H - 0.05 ? 0.6 : 0.001;
        if (h.excess <= margin) {
          let side;
          if (h.excess > 0.02) side = h.e.kind === 'h' ? (d.z > 0 ? 'B' : 'A') : (d.x > 0 ? 'B' : 'A');   // over the stub: far side
          else side = h.e.kind === 'h' ? (d.z > 0 ? 'A' : 'B') : (d.x > 0 ? 'A' : 'B');                  // face the ray enters
          return edgeResult(h.e.key, side, 'wall');
        }
      }
    }
    if (gp && W) {
      // existing walls near the ground point
      let best = null;
      const fx = gp.x, fz = gp.z;
      for (const e of W.edges) {
        let dist;
        if (e.kind === 'h') { const cx = clamp(fx, e.x, e.x + 1); dist = Math.hypot(fx - cx, fz - e.y); }
        else { const cz = clamp(fz, e.y, e.y + 1); dist = Math.hypot(fx - e.x, fz - cz); }
        if (dist <= 0.6 && (!best || dist < best.dist)) best = { e: e, dist: dist };
      }
      if (best) return edgeResult(best.e.key, sideOfPoint(best.e.kind, best.e.x, best.e.y, fx, fz), 'near');
    }
    if (hits.length) {
      let best = null;
      for (const h of hits) if (!best || h.excess < best.excess) best = h;
      const side = best.e.kind === 'h' ? (d.z > 0 ? 'B' : 'A') : (d.x > 0 ? 'B' : 'A');
      return edgeResult(best.e.key, side, 'slab');
    }
    if (gp && !opts.wallsOnly) {
      const fx = gp.x, fz = gp.z;
      const hy = Math.round(fz), hx = Math.floor(fx), dh = Math.abs(fz - hy);
      const vx = Math.round(fx), vy = Math.floor(fz), dv = Math.abs(fx - vx);
      const cands = [];
      if (dh <= 0.35 && validEdge('h', hx, hy)) cands.push({ key: 'h,' + hx + ',' + hy, kind: 'h', x: hx, y: hy, d: dh });
      if (dv <= 0.35 && validEdge('v', vx, vy)) cands.push({ key: 'v,' + vx + ',' + vy, kind: 'v', x: vx, y: vy, d: dv });
      if (cands.length) {
        cands.sort(function (a, b) { return a.d - b.d; });
        const c = cands[0];
        return edgeResult(c.key, sideOfPoint(c.kind, c.x, c.y, fx, fz), 'grid');
      }
    }
    return null;
  }

  // which side ('A'|'B') of an edge faces the camera right now
  function edgeSideAt(key) {
    const p = String(key || '').split(',');
    const d = camDir();
    return p[0] === 'h' ? (d.z < 0 ? 'A' : 'B') : (d.x < 0 ? 'A' : 'B');
  }

  // ------------------------------------------------------------------ ghosts
  let ghostTileGeo = null;
  function tileQuadGeo() {
    if (!ghostTileGeo) { ghostTileGeo = new THREE.PlaneGeometry(0.96, 0.96); ghostTileGeo.rotateX(-HP); }
    return ghostTileGeo;
  }
  function ghostTileMat(valid) {
    const key = valid ? '_gtOk' : '_gtBad';
    if (!S[key]) S[key] = new THREE.MeshBasicMaterial({ color: col(valid ? '#62e08d' : '#ff6457'), transparent: true, opacity: 0.45, depthWrite: false });
    return S[key];
  }
  // footprint outline: always drawn on top (visible over walls and furniture)
  function ghostLineMat(valid) {
    const key = valid ? '_glOk' : '_glBad';
    if (!S[key]) S[key] = new THREE.MeshBasicMaterial({ color: col(valid ? '#8dffb4' : '#ff8a7a'), transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    return S[key];
  }
  // x-ray copy of the ghost model, only where it is hidden behind something (depthFunc GreaterDepth)
  function ghostXrayMat(valid) {
    const key = valid ? '_gxOk' : '_gxBad';
    if (!S[key]) S[key] = new THREE.MeshBasicMaterial({ color: col(valid ? '#59e38a' : '#ff6a5c'), transparent: true, opacity: 0.3, depthWrite: false, depthFunc: THREE.GreaterDepth });
    return S[key];
  }
  let _boxUnit = null;
  function boxUnitGeo() { return _boxUnit || (_boxUnit = new THREE.BoxGeometry(1, 1, 1)); }
  function ensureGhostShared() {
    if (S.ghostTiles) return;
    // one footprint tile mesh and one outline mesh, reused for every catalog item (CR-9: no leak per switch)
    S.ghostTiles = newInst(tileQuadGeo(), ghostTileMat(true), 16);
    S.ghostTiles.renderOrder = 5; S.ghostTiles.count = 0; S.ghostTiles.visible = false;
    S.ghostTiles.userData.sharedGeo = true;
    S.ghostLine = newInst(boxUnitGeo(), ghostLineMat(true), 4);
    S.ghostLine.renderOrder = 12; S.ghostLine.visible = false; S.ghostLine.userData.sharedGeo = true;
    S.groups.ghost.add(S.ghostTiles);
    S.groups.ghost.add(S.ghostLine);
  }
  function showGhost(type, x, y, rot, valid) {
    if (!S.inited || type == null) return;
    const def = defOf(type);
    const key = (def && def.model) || type;
    const m = M.models.materials;
    ensureGhostShared();
    if (!S.ghost || S.ghost.type !== type) {
      if (S.ghost) { S.groups.ghost.remove(S.ghost.group); S.groups.ghost.remove(S.ghost.xray); }
      const b = baseSize(type);
      const model = M.models.build(key, { w: b.w, h: b.h, servings: 4 });
      const group = new THREE.Group();
      group.add(model);
      model.traverse(function (o) { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 6; } });
      const xray = new THREE.Group();
      model.children.forEach(function (ch) {
        if (!ch.isMesh) return;
        const xm = new THREE.Mesh(ch.geometry, ghostXrayMat(true));
        xm.renderOrder = 7; xm.userData.sharedGeo = true;
        xray.add(xm);
      });
      S.groups.ghost.add(group);
      S.groups.ghost.add(xray);
      S.ghost = { type: type, group: group, model: model, xray: xray, tiles: S.ghostTiles, valid: null };
    }
    const G = S.ghost;
    G.group.visible = true; G.xray.visible = true; S.ghostTiles.visible = true; S.ghostLine.visible = true;
    if (G.valid !== !!valid) {
      G.valid = !!valid;
      const gm = valid ? m.ghostOk : m.ghostBad;
      G.model.traverse(function (o) { if (o.isMesh) o.material = gm; });
      const xm = ghostXrayMat(!!valid);
      G.xray.children.forEach(function (o) { o.material = xm; });
    }
    S.ghostTiles.material = ghostTileMat(!!valid);
    S.ghostLine.material = ghostLineMat(!!valid);
    const tr = modelTransform(type, x, y, rot);
    let yOff = 0;
    if (def && def.noBlock && !def.wall) {
      const L = lotSize();
      const sfc = (x >= 0 && y >= 0 && x < L.w && y < L.h) ? S.tileSurface[(y | 0) * L.w + (x | 0)] : null;
      if (sfc) { const sd = defOf(sfc.type); yOff = (sd && sd.surfaceHeight) || 0.78; }
    }
    G.model.position.set(tr.x, yOff + 0.01, tr.z);
    G.model.rotation.set(0, tr.rotY, 0);
    G.xray.position.copy(G.model.position); G.xray.rotation.copy(G.model.rotation);
    const sz = rotatedSize(type, rot);
    const t = mtx();
    let i = 0;
    for (let dy = 0; dy < sz.h; dy++) for (let dx = 0; dx < sz.w; dx++) {
      if (i >= 16) break;
      t.p.set((x | 0) + dx + 0.5, 0.02, (y | 0) + dy + 0.5); t.q.set(0, 0, 0, 1); t.s.set(1, 1, 1);
      S.ghostTiles.setMatrixAt(i++, t.m.compose(t.p, t.q, t.s));
    }
    S.ghostTiles.count = i;
    S.ghostTiles.instanceMatrix.needsUpdate = true;
    // outline of the footprint rectangle (4 thin strips)
    const x0 = x | 0, z0 = y | 0, x1 = x0 + sz.w, z1 = z0 + sz.h, lw = 0.06, yy = 0.03;
    setBox(S.ghostLine, 0, x0, yy, z0 - lw / 2, x1, yy + 0.01, z0 + lw / 2);
    setBox(S.ghostLine, 1, x0, yy, z1 - lw / 2, x1, yy + 0.01, z1 + lw / 2);
    setBox(S.ghostLine, 2, x0 - lw / 2, yy, z0, x0 + lw / 2, yy + 0.01, z1);
    setBox(S.ghostLine, 3, x1 - lw / 2, yy, z0, x1 + lw / 2, yy + 0.01, z1);
    S.ghostLine.instanceMatrix.needsUpdate = true;
    patchScene();
  }
  function hideGhost() {
    if (S.ghost) { S.ghost.group.visible = false; S.ghost.xray.visible = false; }
    if (S.ghostTiles) { S.ghostTiles.visible = false; S.ghostLine.visible = false; }
  }
  function updateGhostPulse(t) {
    const m = M.models && M.models.materials;
    if (!m) return;
    const k = 0.5 + 0.5 * Math.sin(t * 4.5);
    const o = 0.55 + 0.17 * k;
    m.ghostOk.opacity = o; m.ghostBad.opacity = o;
    if (m.ghostOk.emissiveIntensity != null) { m.ghostOk.emissiveIntensity = 0.7 + 0.6 * k; m.ghostBad.emissiveIntensity = 0.7 + 0.6 * k; }
    if (S._gtOk) S._gtOk.opacity = 0.32 + 0.18 * k;
    if (S._gtBad) S._gtBad.opacity = 0.32 + 0.18 * k;
    if (S._glOk) S._glOk.opacity = 0.7 + 0.3 * k;
    if (S._glBad) S._glBad.opacity = 0.7 + 0.3 * k;
  }

  function ensureInstanced(slot, geo, mat, n) {
    let im = S[slot];
    if (!im || im.userData.cap < n) {
      if (im) { S.groups.ghost.remove(im); if (im.dispose) im.dispose(); }
      const cap = Math.max(16, n * 2);
      im = newInst(geo, mat, cap);
      im.userData.cap = cap;
      im.userData.sharedGeo = true;
      im.renderOrder = 6;
      S.groups.ghost.add(im);
      S[slot] = im;
    }
    im.material = mat;
    return im;
  }
  function showEdgeGhost(keys, valid) {
    if (!S.inited) return;
    keys = Array.isArray(keys) ? keys : [];
    if (!S._edgeGeo) S._edgeGeo = new THREE.BoxGeometry(1, 1, 1);
    const key = valid ? '_egOk' : '_egBad';
    if (!S[key]) S[key] = new THREE.MeshBasicMaterial({ color: col(valid ? '#62e08d' : '#ff6457'), transparent: true, opacity: 0.42, depthWrite: false });
    const im = ensureInstanced('edgeGhost', S._edgeGeo, S[key], keys.length);
    let i = 0;
    for (const k of keys) {
      // a key may name one side: 'h,3,4,A' or { key: 'h,3,4', side: 'A' } (wallpaper on one face)
      const ks = k && typeof k === 'object' ? String(k.key) + (k.side ? ',' + k.side : '') : String(k);
      const p = ks.split(',');
      const kind = p[0], x = +p[1], y = +p[2], side = p[3] === 'A' || p[3] === 'B' ? p[3] : null;
      if (!isFinite(x) || !isFinite(y)) continue;
      const lo = side === 'A' ? -HT - 0.035 : side === 'B' ? HT - 0.005 : -0.07;
      const hi = side === 'A' ? -HT + 0.005 : side === 'B' ? HT + 0.035 : 0.07;
      if (kind === 'h') setBox(im, i++, x, 0, y + lo, x + 1, WALL_H, y + hi);
      else if (kind === 'v') setBox(im, i++, x + lo, 0, y, x + hi, WALL_H, y + 1);
    }
    im.count = i;
    im.instanceMatrix.needsUpdate = true;
    im.visible = i > 0;
  }
  function hideEdgeGhost() { if (S.edgeGhost) S.edgeGhost.visible = false; }
  function showTileGhost(tiles, valid) {
    if (!S.inited) return;
    tiles = Array.isArray(tiles) ? tiles : [];
    const im = ensureInstanced('tileGhost', tileQuadGeo(), ghostTileMat(!!valid), tiles.length);
    const t = mtx();
    let i = 0;
    for (const tl of tiles) {
      if (!tl) continue;
      const x = +tl.x, y = +tl.y;
      if (!isFinite(x) || !isFinite(y)) continue;
      t.p.set(x + 0.5, 0.03, y + 0.5); t.q.set(0, 0, 0, 1); t.s.set(1, 1, 1);
      im.setMatrixAt(i++, t.m.compose(t.p, t.q, t.s));
    }
    im.count = i;
    im.instanceMatrix.needsUpdate = true;
    im.visible = i > 0;
  }
  function hideTileGhost() { if (S.tileGhost) S.tileGhost.visible = false; }

  // ------------------------------------------------------------------ projection
  function project(wx, wy, wz) {
    if (!S.inited) return { x: 0, y: 0, visible: false };
    const v = S.tmpV3.set(+wx || 0, +wy || 0, +wz || 0).project(S.camera);
    const w = S.size.w, h = S.size.h;
    const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
    const visible = v.z > -1 && v.z < 1 && x >= -50 && y >= -50 && x <= w + 50 && y <= h + 50;
    const rect = S.renderer.domElement.getBoundingClientRect();
    return { x: x, y: y, visible: visible, clientX: rect.left + x, clientY: rect.top + y };
  }
  function simScreenPos(simId) {
    let rec = S.chars.get(simId);
    if (!rec && simId != null) S.chars.forEach(function (r) { if (!rec && String(r.id) === String(simId)) rec = r; });
    if (!rec || !rec.rig.root.visible) return { x: 0, y: 0, visible: false };
    rec.rig.root.updateMatrixWorld(true);
    rec.rig.parts.head.getWorldPosition(S.tmpV2);
    return project(S.tmpV2.x, S.tmpV2.y + 0.82, S.tmpV2.z);
  }

  function stats() {
    if (!S.inited) return null;
    const i = S.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures,
      objects: S.objs.size, characters: S.chars.size, walls: S.walls ? S.walls.edges.length : 0 };
  }

  M.render = {
    init: init,
    frame: frame,
    syncAll: syncAll,
    syncObjects: syncObjects,
    syncLot: syncLot,
    syncCharacters: syncCharacters,
    setState: setState,
    pick: pick,
    pickEdge: pickEdge,
    pickTile: pickTile,
    pickGround: pickGround,
    setWallMode: setWallMode,
    get wallMode() { return S.wallMode; },
    rotate: rotate,
    zoom: zoom,
    pan: pan,
    focus: focus,
    setCamera: setCamera,
    getCamera: getCamera,
    showGhost: showGhost,
    hideGhost: hideGhost,
    showEdgeGhost: showEdgeGhost,
    hideEdgeGhost: hideEdgeGhost,
    showTileGhost: showTileGhost,
    hideTileGhost: hideTileGhost,
    setSelected: setSelected,
    get selectedId() { return S.selectedId; },
    setWallsUpOverride: setWallsUpOverride,
    get wallsUpOverride() { return S.wallsUpOverride; },
    hideObject: hideObject,
    setViewInsets: setViewInsets,
    itemAt: function (x, y) { const o = itemOnTile(x | 0, y | 0); return o ? o.id : null; },
    edgeSideAt: edgeSideAt,
    project: project,
    simScreenPos: simScreenPos,
    resize: resize,
    stats: stats,
    get canvas() { return S.renderer ? S.renderer.domElement : null; },
    get scene() { return S.scene; },
    get camera() { return S.camera; },
    get renderer() { return S.renderer; },
  };
})(window.M = window.M || {});
