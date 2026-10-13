/*
 * Morada — M.world
 * Lot grid, walls on tile edges, floors, object placement/occupancy, rooms + room score,
 * and A* pathfinding. Pure logic: no DOM, no THREE.
 *
 * Reads M.data.CATALOG / FLOORS / WALLPAPERS / ROOM_IMPACT / DIRT and M.data.roomImpact() at call
 * time (never at load time); every one of them is optional (canonical fallbacks built in).
 * Works on `state.lot` + `state.objects` of the state passed to init(state).
 * See notes/world.md for the full API, additions and conventions.
 *
 * ---------------------------------------------------------------------------------------------
 * COORDINATES (see ARCHITECTURE.md)
 *   Tile (x, y): 0 <= x < w, 0 <= y < h. Tile (x,y) covers world X in [x,x+1], Z in [y,y+1].
 *   Character positions are float "tile coords" where (x+0.5, y+0.5) is the tile centre, so the
 *   tile a character stands on is (round(x), round(y)) and a path point {x:tx, y:ty} (integers)
 *   IS the centre of tile (tx,ty) in character coords.
 *   Edge keys: "h,x,y" = TOP edge of tile (x,y)  (between (x,y-1) and (x,y)), 0<=x<w, 0<=y<=h
 *              "v,x,y" = LEFT edge of tile (x,y) (between (x-1,y) and (x,y)), 0<=x<=w, 0<=y<h
 *   Wall entries: { t: 1 wall | 2 door | 3 window, c: wallpaper index, cA?, cB? }.
 *   Wallpaper per side (CONTRACT_V2 §1): side A of "h,x,y" faces tile (x, y-1) (north), side B
 *   faces (x, y) (south); side A of "v,x,y" faces (x-1, y) (west), side B faces (x, y) (east).
 *   A missing cA / cB falls back to c.
 *   Doors are passable for walking, walls and windows block. ANY entry (door/window included)
 *   separates rooms.
 *
 * CACHES (CR-6): every public query calls ensure(), which is O(1): it compares the identity of
 *   state.lot / lot.walls / lot.floors / state.objects and the objects' length. A full content
 *   check (objects moved/rotated/retyped in place; in-place edits of lot.walls / lot.floors every
 *   4th epoch and at every microtask boundary) runs at most once per "epoch": an epoch ends when
 *   the sim time (state.time) changes, at the next microtask (i.e. after the current event/frame
 *   handler) or after 512 queries. rebuild(),
 *   setWall(), setWallColor() and setFloor() update the caches immediately. Rooms are only
 *   recomputed when walls / floors / the floor & wallpaper tables actually changed.
 *
 * ---------------------------------------------------------------------------------------------
 * ROTATION MATH (footprints and slots)
 *   An object type has size (w, h) at rot 0, with its FRONT facing +Z (larger y).
 *   rot 1 = front faces -X, rot 2 = front faces -Z, rot 3 = front faces +X.
 *   obj.x, obj.y is ALWAYS the min corner (min x, min y) of the ROTATED footprint.
 *
 *   rotatedSize: rot 0/2 -> {w, h};  rot 1/3 -> {w: h, h: w}.
 *
 *   One rotation step maps a local direction vector (vx, vy) -> (-vy, vx)
 *   (so the rot-0 front (0,1) becomes (-1,0) = -X at rot 1, (0,-1) at rot 2, (1,0) at rot 3).
 *   Rotating the rot-0 rectangle [0,w]x[0,h] about its corner and re-normalising so the min
 *   corner is back at (0,0) gives, for a local POINT (px, py) (tile units, rot-0 frame):
 *       rot 0: ( px,      py     )
 *       rot 1: ( h - py,  px     )
 *       rot 2: ( w - px,  h - py )
 *       rot 3: ( py,      w - px )
 *   For a local TILE (dx, dy) (unit square [dx,dx+1]x[dy,dy+1], centre +0.5) this becomes:
 *       rot 0: ( dx,          dy         )
 *       rot 1: ( h - 1 - dy,  dx         )
 *       rot 2: ( w - 1 - dx,  h - 1 - dy )
 *       rot 3: ( dy,          w - 1 - dx )
 *   which also holds for tiles OUTSIDE the footprint (slot dy = h = "in front", dy = -1 = "behind").
 *   World slot tile = (obj.x, obj.y) + rotated local tile.
 *
 *   Facings are radians with dir = (sin f, cos f) in (x, y) tile space (0 = +Z), exactly like
 *   Sim.facing. A rotation step subtracts PI/2:  worldFacing = slotFacing - rot * PI/2
 *   (normalised to [0, 2PI)). Object front facing: rot0 0, rot1 3PI/2, rot2 PI, rot3 PI/2.
 *
 *   THREE mesh placement for a model built at rot 0 with origin at its min corner (M.models):
 *     mesh.rotation.y = -rot * PI/2 and mesh.position = (obj.x + ox, 0, obj.y + oz) with
 *     (ox, oz) = rot0 (0,0), rot1 (h,0), rot2 (w,h), rot3 (0,w)   [w,h = rot-0 size]
 *   -> M.world.modelTransform(obj) returns exactly that.
 * ---------------------------------------------------------------------------------------------
 */
(function (M) {
  'use strict';

  // ------------------------------------------------------------------ constants
  // Globals cached in locals: inside a Node vm context (tests, QA harness) every global lookup
  // (Math, isFinite, Object) goes through a slow interceptor; in browsers this is free.
  const mImul = Math.imul, mRound = Math.round, mAbs = Math.abs, mFloor = Math.floor, mMin = Math.min,
    mMax = Math.max, mSqrt = Math.sqrt, mAtan2 = Math.atan2, mLog2 = Math.log2;
  const isFin = isFinite;
  const hasOwn = Object.prototype.hasOwnProperty;
  const PromiseRef = typeof Promise === 'function' ? Promise : null;
  const isInt = Number.isInteger, isArr = Array.isArray, Str = String;
  const SQRT2 = Math.SQRT2;
  const HALF_PI = Math.PI / 2;
  const TWO_PI = Math.PI * 2;
  const DAY_START = 6 * 60;   // 06:00 (windows give light 06:00–17:59)
  const DAY_END = 18 * 60;    // 18:00 (lamps count / dark-room penalty 18:00–05:59)

  // 8 directions: 0 N, 1 E, 2 S, 3 W, 4 NE, 5 SE, 6 SW, 7 NW  (N = -y)
  const DX = [0, 1, 0, -1, 1, 1, -1, -1];
  const DY = [-1, 0, 1, 0, -1, 1, 1, -1];

  // object layers
  const L_BLOCK = 0;   // blocks walking (furniture)
  const L_ITEM = 1;    // noBlock small things: meal, dirty_plate, puddle, newspaper, carpool
  const L_FLOOR = 2;   // noBlock floor coverings: rugs (may sit under anything)
  const L_WALL = 3;    // noBlock wall-mounted: paintings, mirror

  // ------------------------------------------------------------------ module state
  let S = null;                 // game state
  let W = 0, H = 0, N = 0;      // lot size
  let hEdge = new Uint8Array(0), vEdge = new Uint8Array(0);     // wall type per edge
  // wallpaper index per edge SIDE (A = north/west face, B = south/east face)
  let hPapA = new Uint16Array(0), hPapB = new Uint16Array(0), vPapA = new Uint16Array(0), vPapB = new Uint16Array(0);
  let cornerOk = new Uint8Array(0);   // (W+1)*(H+1): 1 if no wall entry touches the vertex
  let pass = new Uint8Array(0);       // N: bit d set if a step in direction d is allowed by edges/bounds
  let blocked = new Uint8Array(0);    // N: 1 if a blocking object stands on the tile
  let blockAt = [], itemAt = [], floorAt = [];   // N: object refs per layer (first one wins)
  let wallAt = new Map();             // tileIdx*4 + rot -> wall-mounted object
  let byId = new Map();
  let objList = [];
  let version = 0;

  // staleness tracking (auto-rebuild when state.objects is replaced/resized/moved)
  let cLot = null, cWalls = null, cFloors = null, cObjs = null, cObjLen = -1, cObjSig = 0;
  // order-independent content hashes of lot.walls / lot.floors as last applied to the caches
  let wallsSum = 0, wallsCount = -1, floorsSum = 0;
  // epoch ("trust window") of the O(1) ensure() fast path
  const VERIFY_EVERY = 512;
  let trusted = false, trustTime = NaN, fastCalls = 0, expirePending = false;

  // A* buffers (reused)
  let gArr = new Float64Array(0), fArr = new Float64Array(0);
  let parent = new Int32Array(0), heap = new Int32Array(0), heapPos = new Int32Array(0);
  let openSt = new Uint32Array(0), closedSt = new Uint32Array(0);
  let allowSt = new Uint32Array(0), blockSt = new Uint32Array(0);
  let goalSt = new Uint32Array(0), goalEnterSt = new Uint32Array(0);
  let goalPen = new Float64Array(0), goalRef = new Int32Array(0);
  let queueBuf = new Int32Array(0);
  let xOf = new Int32Array(0), yOf = new Int32Array(0);
  let heapSize = 0;
  let sid = 0;
  let allowList = [], enterList = [];   // blocked tiles made enterable for the current search

  // connected components of naturally free tiles (orthogonal moves; diagonals never add
  // connectivity) — lets unreachable queries fail in O(1) instead of flooding the lot
  let comp = new Int32Array(0), compSt = new Uint32Array(0);
  let compsValid = false;

  // per-object room id cache (parallel to objList)
  let objRoom = new Int32Array(0);
  let objRoomValid = false;
  let roomObjs = [];   // per room id: indices into objList (valid with objRoomValid)

  // rooms
  let roomsValid = false;
  let roomGrid = new Int32Array(0);
  let roomList = [];
  let roomsFL = null, roomsWP = null;   // FLOORS / WALLPAPERS tables the room cache was built with
  let compCount = 0;

  // scratch buffers for hypothetical evaluation (placementWarnings / wallWarnings)
  let hypBlk = new Uint8Array(0), hypComp = new Int32Array(0), hypRoom = new Int32Array(0);

  // ------------------------------------------------------------------ small helpers
  function isNum(v) { return typeof v === 'number' && isFin(v); }
  function toInt(v) { const n = mRound(+v); return isFin(n) ? n : NaN; }
  function tileOf(v) { return mFloor(+v + 0.5); }
  function normRot(r) { r = mRound(+r) || 0; return ((r % 4) + 4) % 4; }
  function normAngle(a) { a = a % TWO_PI; if (a < 0) a += TWO_PI; if (a >= TWO_PI - 1e-9) a = 0; return a; }
  function inB(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function sameId(a, b) { return a === b || (a != null && b != null && Str(a) === Str(b)); }

  function catalog() { return (M.data && M.data.CATALOG) || null; }
  function defOf(type) {
    const C = catalog();
    if (!C || type == null) return null;
    const d = C[type];
    return d && typeof d === 'object' ? d : null;
  }
  function baseSize(def) {
    let w = def ? mRound(+def.w) : 1, h = def ? mRound(+def.h) : 1;
    if (!(w >= 1)) w = 1;
    if (!(h >= 1)) h = 1;
    return { w: w, h: h };
  }
  function sizeOf(def, rot) {
    const b = baseSize(def);
    return (rot & 1) ? { w: b.h, h: b.w } : b;
  }
  function layerOf(def, type) {
    if (!def) return L_BLOCK;
    if (def.layer === 'block') return L_BLOCK;
    if (def.layer === 'item') return L_ITEM;
    if (def.layer === 'floor') return L_FLOOR;
    if (def.layer === 'wall') return L_WALL;
    if (!def.noBlock) return L_BLOCK;
    if (def.wall) return L_WALL;
    if (def.rug || def.model === 'rug' || def.cat === 'decor' ||
        (typeof type === 'string' && /^(rug|carpet|tapete)/.test(type))) return L_FLOOR;
    return L_ITEM;
  }
  function isWallMounted(def) { return !!(def && (def.wall || def.layer === 'wall')); }

  function fail(code, reason) { return { ok: false, reason: reason, code: code }; }

  // ------------------------------------------------------------------ edges
  function parseKey(key) {
    if (typeof key !== 'string') return null;
    const p = key.split(',');
    if (p.length !== 3) return null;
    const kind = p[0], x = +p[1], y = +p[2];
    if ((kind !== 'h' && kind !== 'v') || !isInt(x) || !isInt(y)) return null;
    return { kind: kind, x: x, y: y };
  }
  function validEdge(kind, x, y) {
    if (kind === 'h') return x >= 0 && x < W && y >= 0 && y <= H;
    if (kind === 'v') return x >= 0 && x <= W && y >= 0 && y < H;
    return false;
  }
  function edgeIndex(kind, x, y) { return kind === 'h' ? y * W + x : y * (W + 1) + x; }
  function edgeTypeKV(kind, x, y) {
    if (!validEdge(kind, x, y)) return 0;
    return kind === 'h' ? hEdge[y * W + x] : vEdge[y * (W + 1) + x];
  }
  function keyOf(kind, x, y) { return kind + ',' + x + ',' + y; }
  // wall type between orthogonally adjacent tiles (either may be out of bounds); -1 if not adjacent
  function edgeTypeBetween(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 1) return edgeTypeKV('h', x1, y2);
    if (dx === 0 && dy === -1) return edgeTypeKV('h', x1, y1);
    if (dy === 0 && dx === 1) return edgeTypeKV('v', x2, y1);
    if (dy === 0 && dx === -1) return edgeTypeKV('v', x1, y1);
    return -1;
  }
  // same as edgeTypeBetween but on explicit edge arrays (hypothetical walls); both tiles in bounds
  function edgeTypeArr(hE, vE, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 1) return hE[y2 * W + x1];
    if (dx === 0 && dy === -1) return hE[y1 * W + x1];
    if (dy === 0 && dx === 1) return vE[y1 * (W + 1) + x2];
    if (dy === 0 && dx === -1) return vE[y1 * (W + 1) + x1];
    return -1;
  }
  // integer edge code (kind bit + index) <-> key, for compact per-room edge lists
  function codeOf(kind, x, y) { return edgeIndex(kind, x, y) * 2 + (kind === 'v' ? 1 : 0); }
  function keyOfCode(code) {
    const idx = code >> 1;
    if (code & 1) return keyOf('v', idx % (W + 1), (idx / (W + 1)) | 0);
    return keyOf('h', idx % W, (idx / W) | 0);
  }
  // 'A' | 'B' | null (both / unspecified)
  function normSide(side) {
    if (side === 'A' || side === 'a' || side === 0) return 'A';
    if (side === 'B' || side === 'b' || side === 1) return 'B';
    return null;
  }
  // tile faced by a side of an edge (may be out of bounds)
  function sideTile(kind, x, y, side) {
    if (kind === 'h') return side === 'A' ? { x: x, y: y - 1 } : { x: x, y: y };
    return side === 'A' ? { x: x - 1, y: y } : { x: x, y: y };
  }
  // valid wallpaper index (>= 0) or -1
  function colorIdx(v) {
    if (v === undefined || v === null || v === '') return -1;
    const n = mRound(+v);
    return isFin(n) && n >= 0 ? mMin(65535, n) : -1;
  }
  // effective color of each side of a wall entry
  function entryColors(e) {
    const c = mMax(0, colorIdx(e && e.c));
    const a = colorIdx(e && e.cA), b = colorIdx(e && e.cB);
    return { c: c, a: a >= 0 ? a : c, b: b >= 0 ? b : c };
  }
  // walls on the back side of a (rotated) footprint rect — for wall-mounted objects
  function backEdges(x, y, w, h, rot) {
    const out = [];
    if (rot === 0) for (let i = 0; i < w; i++) out.push({ kind: 'h', x: x + i, y: y });
    else if (rot === 1) for (let j = 0; j < h; j++) out.push({ kind: 'v', x: x + w, y: y + j });
    else if (rot === 2) for (let i = 0; i < w; i++) out.push({ kind: 'h', x: x + i, y: y + h });
    else for (let j = 0; j < h; j++) out.push({ kind: 'v', x: x, y: y + j });
    return out;
  }
  // true if any wall entry lies strictly inside the rect (requires the rect to be in bounds)
  function rectHasInternalWall(x, y, w, h) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x + 1; xx < x + w; xx++) if (vEdge[yy * (W + 1) + xx]) return true;
    }
    for (let yy = y + 1; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) if (hEdge[yy * W + xx]) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ init / rebuild
  function sanitizeState() {
    if (!S.lot || typeof S.lot !== 'object') S.lot = { w: 24, h: 20 };
    const lot = S.lot;
    let w = mRound(+lot.w), h = mRound(+lot.h);
    if (!(w >= 1 && w <= 256)) w = 24;
    if (!(h >= 1 && h <= 256)) h = 20;
    lot.w = w; lot.h = h;
    if (!isArr(lot.floors)) lot.floors = [];
    if (lot.floors.length !== w * h) {
      if (lot.floors.length > w * h) lot.floors.length = w * h;
      while (lot.floors.length < w * h) lot.floors.push(0);
    }
    if (!lot.walls || typeof lot.walls !== 'object' || isArr(lot.walls)) lot.walls = {};
    if (!isArr(S.objects)) S.objects = [];
  }

  function allocate(w, h) {
    W = w; H = h; N = w * h;
    hEdge = new Uint8Array(W * (H + 1)); vEdge = new Uint8Array((W + 1) * H);
    hPapA = new Uint16Array(W * (H + 1)); hPapB = new Uint16Array(W * (H + 1));
    vPapA = new Uint16Array((W + 1) * H); vPapB = new Uint16Array((W + 1) * H);
    cornerOk = new Uint8Array((W + 1) * (H + 1));
    pass = new Uint8Array(N); blocked = new Uint8Array(N);
    blockAt = new Array(N); itemAt = new Array(N); floorAt = new Array(N);
    gArr = new Float64Array(N); fArr = new Float64Array(N);
    parent = new Int32Array(N); heap = new Int32Array(N + 1); heapPos = new Int32Array(N);
    openSt = new Uint32Array(N); closedSt = new Uint32Array(N);
    allowSt = new Uint32Array(N); blockSt = new Uint32Array(N);
    goalSt = new Uint32Array(N); goalEnterSt = new Uint32Array(N);
    goalPen = new Float64Array(N); goalRef = new Int32Array(N);
    queueBuf = new Int32Array(N);
    roomGrid = new Int32Array(N);
    hypBlk = new Uint8Array(N); hypComp = new Int32Array(N); hypRoom = new Int32Array(N);
    comp = new Int32Array(N); compSt = new Uint32Array(N + 1);
    xOf = new Int32Array(N); yOf = new Int32Array(N);
    for (let i = 0; i < N; i++) { xOf[i] = i % W; yOf[i] = (i / W) | 0; }
    compsValid = false;
    objRoomValid = false;
    sid = 0;
  }

  function rebuildEdges() {
    hEdge.fill(0); vEdge.fill(0); hPapA.fill(0); hPapB.fill(0); vPapA.fill(0); vPapB.fill(0);
    const walls = S.lot.walls;
    let sum = 0, count = 0;
    for (const key in walls) {
      if (!hasOwn.call(walls, key)) continue;
      const e = walls[key];
      sum = (sum + wallEntryHash(key, e)) | 0; count++;
      const p = parseKey(key);
      if (!p || !validEdge(p.kind, p.x, p.y) || !e || typeof e !== 'object') continue;
      const t = mRound(+e.t);
      if (t !== 1 && t !== 2 && t !== 3) continue;
      const col = entryColors(e);
      const i = edgeIndex(p.kind, p.x, p.y);
      if (p.kind === 'h') { hEdge[i] = t; hPapA[i] = col.a; hPapB[i] = col.b; } else { vEdge[i] = t; vPapA[i] = col.a; vPapB[i] = col.b; }
    }
    wallsSum = sum; wallsCount = count;
    computePass();
  }

  // ---- content hashes (order independent sums of per-entry hashes) used to detect in-place edits
  function mix32(h) {
    h ^= h >>> 16; h = mImul(h, 0x85ebca6b);
    h ^= h >>> 13; h = mImul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h | 0;
  }
  function strHash(s) {
    let h = 0x811c9dc5 | 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = mImul(h, 0x01000193); }
    return h | 0;
  }
  function valHash(v) {
    if (v === undefined) return 0x2f1b3c4d;
    if (v === null) return 0x1a2b3c5e;
    const n = +v;
    return isFin(n) ? (mRound(n * 64) | 0) : 0x0badf00d;
  }
  function wallEntryHash(key, e) {
    if (!e || typeof e !== 'object') return mix32(strHash(key) ^ 0x5bd1e995);
    return mix32((strHash(key) + mImul(valHash(e.t), 0x27d4eb2d) + mImul(valHash(e.c), 0x165667b1) +
      mImul(valHash(e.cA), 0x9e3779b1) + mImul(valHash(e.cB), 0x85ebca77)) | 0);
  }
  function wallsHash(walls) {
    let sum = 0, count = 0;
    for (const key in walls) {
      if (!hasOwn.call(walls, key)) continue;
      sum = (sum + wallEntryHash(key, walls[key])) | 0; count++;
    }
    return { sum: sum, count: count };
  }
  function floorHash(i, v) { return mix32(mImul(i + 1, 0x9e3779b1) ^ valHash(v)); }
  function floorsHash(floors) {
    let sum = 0;
    for (let i = 0; i < floors.length; i++) sum = (sum + floorHash(i, floors[i])) | 0;
    return sum;
  }

  function computePass() {
    const W1 = W + 1;
    for (let cy = 0; cy <= H; cy++) {
      for (let cx = 0; cx <= W; cx++) {
        let ok = 1;
        if (cy > 0 && vEdge[(cy - 1) * W1 + cx]) ok = 0;
        else if (cy < H && vEdge[cy * W1 + cx]) ok = 0;
        else if (cx > 0 && hEdge[cy * W + cx - 1]) ok = 0;
        else if (cx < W && hEdge[cy * W + cx]) ok = 0;
        cornerOk[cy * W1 + cx] = ok;
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let m = 0, e;
        if (y > 0) { e = hEdge[y * W + x]; if (e === 0 || e === 2) m |= 1; }
        if (x < W - 1) { e = vEdge[y * W1 + x + 1]; if (e === 0 || e === 2) m |= 2; }
        if (y < H - 1) { e = hEdge[(y + 1) * W + x]; if (e === 0 || e === 2) m |= 4; }
        if (x > 0) { e = vEdge[y * W1 + x]; if (e === 0 || e === 2) m |= 8; }
        // diagonals: every wall entry (doors included) touching the shared corner blocks
        if (x < W - 1 && y > 0 && cornerOk[y * W1 + x + 1]) m |= 16;            // NE
        if (x < W - 1 && y < H - 1 && cornerOk[(y + 1) * W1 + x + 1]) m |= 32;  // SE
        if (x > 0 && y < H - 1 && cornerOk[(y + 1) * W1 + x]) m |= 64;          // SW
        if (x > 0 && y > 0 && cornerOk[y * W1 + x]) m |= 128;                   // NW
        pass[y * W + x] = m;
      }
    }
    compsValid = false;
  }

  function objSig(arr) {
    let h = arr.length | 0;
    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      if (!o) { h = (mImul(h, 31) + 7) | 0; continue; }
      const t = o.type;
      h = (mImul(h, 31) + (((o.id | 0) * 7) ^ ((o.x * 131) | 0) ^ ((o.y * 1031) | 0) ^ ((o.rot * 17) | 0) ^
        (typeof t === 'string' ? t.length * 4099 + t.charCodeAt(0) : 0))) | 0;
    }
    return h;
  }

  function objRect(o) {
    const def = defOf(o.type);
    const rot = normRot(o.rot);
    const sz = sizeOf(def, rot);
    return { x: mRound(+o.x), y: mRound(+o.y), w: sz.w, h: sz.h, rot: rot, def: def, layer: layerOf(def, o.type) };
  }

  function rebuildObjects() {
    objList = isArr(S.objects) ? S.objects : [];
    blocked.fill(0);
    for (let i = 0; i < N; i++) { blockAt[i] = null; itemAt[i] = null; floorAt[i] = null; }
    wallAt.clear();
    byId.clear();
    for (let k = 0; k < objList.length; k++) {
      const o = objList[k];
      if (!o || typeof o !== 'object') continue;
      if (o.id != null && !byId.has(o.id)) byId.set(o.id, o);
      const r = objRect(o);
      if (!isFin(r.x) || !isFin(r.y)) continue;
      const mounted = isWallMounted(r.def);
      for (let ty = r.y; ty < r.y + r.h; ty++) {
        for (let tx = r.x; tx < r.x + r.w; tx++) {
          if (!inB(tx, ty)) continue;
          const i = ty * W + tx;
          if (r.layer === L_BLOCK) { if (!blockAt[i]) { blockAt[i] = o; blocked[i] = 1; } }
          else if (r.layer === L_ITEM) { if (!itemAt[i]) itemAt[i] = o; }
          else if (r.layer === L_FLOOR) { if (!floorAt[i]) floorAt[i] = o; }
          if (mounted) { const key = i * 4 + r.rot; if (!wallAt.has(key)) wallAt.set(key, o); }
        }
      }
    }
    cObjs = S.objects; cObjLen = objList.length; cObjSig = objSig(objList);
    compsValid = false;
    objRoomValid = false;
  }

  /** Builds all caches from `state` (call again whenever a different state object is used). */
  function init(state) {
    S = state && typeof state === 'object' ? state : null;
    rebuild();
    return !!S;
  }

  /** Recomputes the caches after any lot/object change. Occupancy is always rebuilt; edges and
   *  rooms only when lot.walls / lot.floors actually changed (content hash), so the engine can call
   *  this after every object change cheaply. */
  function rebuild() {
    version++;
    if (!S) {
      allocate(0, 0); cLot = cWalls = cFloors = cObjs = null; objList = []; byId.clear(); wallAt.clear();
      roomsValid = false; wallsCount = -1; trusted = false;
      return;
    }
    sanitizeState();
    const lot = S.lot;
    let lotChanged = lot !== cLot || lot.walls !== cWalls || lot.floors !== cFloors;
    if (lot.w !== W || lot.h !== H || hEdge.length !== W * (H + 1)) { allocate(lot.w, lot.h); lotChanged = true; }
    if (lotChanged) {
      rebuildEdges();
      floorsSum = floorsHash(lot.floors);
      roomsValid = false;
    } else {
      const wh = wallsHash(lot.walls);
      if (wh.sum !== wallsSum || wh.count !== wallsCount) { rebuildEdges(); roomsValid = false; }
      const fh = floorsHash(lot.floors);
      if (fh !== floorsSum) { floorsSum = fh; roomsValid = false; }
    }
    rebuildObjects();
    cLot = lot; cWalls = lot.walls; cFloors = lot.floors;
    markTrusted();
  }

  // ---- O(1) staleness check (CR-6) -----------------------------------------------------------
  function timeKey() {
    const t = S.time;
    return t && typeof t === 'object' ? (+t.day || 0) * 1440 + (+t.minute || 0) : 0;
  }
  function expireTrust() { expirePending = false; trusted = false; }
  function markTrusted() {
    trusted = true; fastCalls = 0;
    trustTime = S ? timeKey() : NaN;
    if (!expirePending) {
      expirePending = true;
      try { if (PromiseRef) PromiseRef.resolve().then(expireTrust); else expirePending = false; } catch (e) { expirePending = false; }
    }
  }
  // full content check: objects moved/rotated/retyped in place (every epoch); in-place wall /
  // floor edits (every 4th epoch, and whenever the microtask boundary was crossed)
  let lotCheck = 0;
  function verify() {
    if (objSig(objList) !== cObjSig) { rebuildObjects(); version++; }
    if (!expirePending || ++lotCheck >= 4) {
      lotCheck = 0;
      const lot = S.lot;
      const wh = wallsHash(lot.walls);
      if (wh.sum !== wallsSum || wh.count !== wallsCount) { rebuildEdges(); roomsValid = false; version++; }
      const fh = floorsHash(lot.floors);
      if (fh !== floorsSum) { floorsSum = fh; roomsValid = false; version++; }
    }
    markTrusted();
  }

  // Auto-heal stale caches. Replaced lot/walls/floors/objects or a resized object list are seen
  // immediately (O(1)); in-place edits (moved/rotated objects, lot.walls[k].cA = …, floors[i] = …)
  // at the next epoch (sim time change, next microtask, or 512 queries) — see the header.
  function ensure() {
    if (!S) return false;
    const lot = S.lot;
    if (!lot || lot !== cLot || lot.w !== W || lot.h !== H || lot.walls !== cWalls || lot.floors !== cFloors ||
        lot.floors.length !== N) {
      rebuild();
      return true;
    }
    const objs = S.objects;
    if (objs !== cObjs || objs.length !== cObjLen) {
      if (!isArr(objs)) S.objects = [];
      rebuildObjects();
      version++;
      return true;
    }
    if (trusted && ++fastCalls < VERIFY_EVERY && timeKey() === trustTime) return true;
    verify();
    return true;
  }

  // ------------------------------------------------------------------ basic queries
  function inBounds(x, y) { ensure(); return isNum(x) && isNum(y) && x >= 0 && y >= 0 && x < W && y < H; }
  function size() { ensure(); return { w: W, h: H }; }

  function getWall(edgeKey) {
    if (!S) return null;
    ensure();
    const p = parseKey(edgeKey);
    if (!p || !validEdge(p.kind, p.x, p.y)) return null;
    const e = S.lot.walls[keyOf(p.kind, p.x, p.y)];
    if (!e || typeof e !== 'object') return null;
    const t = mRound(+e.t);
    return (t === 1 || t === 2 || t === 3) ? e : null;
  }

  /**
   * Sets (t 1 wall / 2 door / 3 window) or removes (t 0) the wall entry on an edge. No money.
   * Wallpaper: `c` omitted keeps the current colours (both sides). `side` 'A' | 'B' paints only
   * that side (cA / cB); side 'both' paints both sides (c, clears cA/cB). Without `side` (legacy
   * calls), a `c` different from the stored c paints both sides and the same c keeps per-side
   * colours (so `setWall(key, newType, oldC)` only changes the type).
   */
  function setWall(edgeKey, t, c, side) {
    if (!S) return false;
    ensure();
    const p = parseKey(edgeKey);
    if (!p || !validEdge(p.kind, p.x, p.y)) return false;
    const key = keyOf(p.kind, p.x, p.y);
    t = mRound(+t) || 0;
    const walls = S.lot.walls;
    const i = edgeIndex(p.kind, p.x, p.y);
    const old = hasOwn.call(walls, key) ? walls[key] : undefined;
    const oldT = p.kind === 'h' ? hEdge[i] : vEdge[i];
    const oldCol = entryColors(old);
    if (old !== undefined) wallsSum = (wallsSum - wallEntryHash(key, old)) | 0;
    let entry = null;
    if (t !== 1 && t !== 2 && t !== 3) {
      delete walls[key];
      if (old !== undefined) wallsCount--;
      if (p.kind === 'h') { hEdge[i] = 0; hPapA[i] = 0; hPapB[i] = 0; } else { vEdge[i] = 0; vPapA[i] = 0; vPapB[i] = 0; }
    } else {
      const hadEntry = !!(old && typeof old === 'object');
      const cc = colorIdx(c);
      const sd = side === 'both' ? 'both' : normSide(side);
      entry = { t: t, c: hadEntry ? oldCol.c : 0 };
      let a = hadEntry ? oldCol.a : 0, b = hadEntry ? oldCol.b : 0;
      if (cc >= 0) {
        if (sd === 'A') a = cc;
        else if (sd === 'B') b = cc;
        else if (sd === 'both' || !hadEntry || cc !== oldCol.c) { entry.c = cc; a = cc; b = cc; }
      }
      if (a === b) entry.c = a;
      else { if (a !== entry.c) entry.cA = a; if (b !== entry.c) entry.cB = b; }
      walls[key] = entry;
      if (old === undefined) wallsCount++;
      wallsSum = (wallsSum + wallEntryHash(key, entry)) | 0;
      if (p.kind === 'h') { hEdge[i] = t; hPapA[i] = a; hPapB[i] = b; } else { vEdge[i] = t; vPapA[i] = a; vPapB[i] = b; }
    }
    if (entry && oldT === t) {
      // wallpaper-only change: keep the room cache, adjust the two rooms' wall tiers in place
      if (roomsValid) {
        const nc = entryColors(entry);
        paperDelta(p.kind, p.x, p.y, 'A', oldCol.a, nc.a);
        paperDelta(p.kind, p.x, p.y, 'B', oldCol.b, nc.b);
      }
    } else {
      computePass();
      roomsValid = false;
    }
    version++;
    return true;
  }

  /** Paints one side ('A' | 'B') or both sides ('both', default) of an existing wall entry.
   *  Returns false when there is no wall/door/window on the edge. No money. */
  function setWallColor(edgeKey, idx, side) {
    const e = getWall(edgeKey);
    if (!e) return false;
    const cc = colorIdx(idx);
    if (cc < 0) return false;
    const WP = M.data && M.data.WALLPAPERS;
    if (isArr(WP) && WP.length && cc >= WP.length) return false;
    const sd = normSide(side);
    return setWall(edgeKey, mRound(+e.t), cc, sd || 'both');
  }

  /** Wallpaper index of one side of the wall entry on an edge ('A' north/west, 'B' south/east;
   *  any other side → the base colour c). null when there is no wall/door/window. */
  function wallColor(edgeKey, side) {
    const e = getWall(edgeKey);
    if (!e) return null;
    const col = entryColors(e);
    const sd = normSide(side);
    return sd === 'A' ? col.a : sd === 'B' ? col.b : col.c;
  }

  /** 'A' | 'B' for the side of the edge that faces tile (x, y); null if the tile is not beside it. */
  function edgeSideFacing(edgeKey, x, y) {
    ensure();
    const p = parseKey(edgeKey);
    if (!p || !validEdge(p.kind, p.x, p.y)) return null;
    x = toInt(x); y = toInt(y);
    const a = sideTile(p.kind, p.x, p.y, 'A'), b = sideTile(p.kind, p.x, p.y, 'B');
    if (a.x === x && a.y === y) return 'A';
    if (b.x === x && b.y === y) return 'B';
    return null;
  }

  /** Tile faced by one side of an edge: side 'A' → north/west tile, 'B' → south/east tile. */
  function edgeSideTile(edgeKey, side) {
    const p = parseKey(edgeKey);
    const sd = normSide(side);
    if (!p || !sd) return null;
    return sideTile(p.kind, p.x, p.y, sd);
  }

  // incremental wall-tier update of the room faced by one side (room cache must be valid)
  function paperDelta(kind, x, y, side, oldIdx, newIdx) {
    if (oldIdx === newIdx) return;
    const t = sideTile(kind, x, y, side);
    if (!inB(t.x, t.y)) return;
    const R = roomList[roomGrid[t.y * W + t.x]];
    if (!R) return;
    const WP = M.data && M.data.WALLPAPERS;
    R.wallTierSum += tableTier(WP, newIdx) - tableTier(WP, oldIdx);
    refreshRoomDerived(R);
  }

  function getFloor(x, y) {
    if (!S) return 0;
    ensure();
    x = toInt(x); y = toInt(y);
    if (!inB(x, y)) return 0;
    const v = mRound(+S.lot.floors[y * W + x]);
    return v >= 0 ? v : 0;
  }

  function setFloor(x, y, floorIdx) {
    if (!S) return false;
    ensure();
    x = toInt(x); y = toInt(y);
    if (!inB(x, y)) return false;
    let f = mRound(+floorIdx);
    if (!(f >= 0)) return false;
    const F = M.data && M.data.FLOORS;
    if (isArr(F) && F.length && f >= F.length) return false;
    const i = y * W + x;
    const oldRaw = S.lot.floors[i];
    const oldF = floorAtIdx(i);
    S.lot.floors[i] = f;
    floorsSum = (floorsSum - floorHash(i, oldRaw) + floorHash(i, f)) | 0;
    // incremental room update: floors never change the room grid, only grass/tier sums
    if (roomsValid && oldF !== f) {
      const R = roomList[roomGrid[i]];
      if (R) {
        R.grass += (f === 0 ? 1 : 0) - (oldF === 0 ? 1 : 0);
        R.floorTierSum += tableTier(F, f) - tableTier(F, oldF);
        refreshRoomDerived(R);
      }
    }
    version++;
    return true;
  }

  /** Wall-entry blocks walking between two adjacent tiles? (doors pass). Diagonal pairs: true if
   *  any wall entry touches the shared corner. Non-adjacent / out-of-bounds pairs: true. */
  function edgeBlocked(x1, y1, x2, y2) {
    ensure();
    x1 = toInt(x1); y1 = toInt(y1); x2 = toInt(x2); y2 = toInt(y2);
    if (x1 === x2 && y1 === y2) return false;
    if (!inB(x1, y1) || !inB(x2, y2)) return true;
    const dx = x2 - x1, dy = y2 - y1;
    if (mAbs(dx) > 1 || mAbs(dy) > 1) return true;
    const i = y1 * W + x1;
    for (let d = 0; d < 8; d++) if (DX[d] === dx && DY[d] === dy) return !(pass[i] & (1 << d));
    return true;
  }

  function rotatedSize(type, rot) { return sizeOf(defOf(type), normRot(rot)); }

  function footprint(type, x, y, rot) {
    if (type && typeof type === 'object') { x = type.x; y = type.y; rot = type.rot; type = type.type; }
    const sz = sizeOf(defOf(type), normRot(rot));
    x = toInt(x); y = toInt(y);
    const out = [];
    if (!isFin(x) || !isFin(y)) return out;
    for (let j = 0; j < sz.h; j++) for (let i = 0; i < sz.w; i++) out.push({ x: x + i, y: y + j });
    return out;
  }

  /** Rotates a rot-0 local point (tile units) into the rotated, re-normalised frame. */
  function rotatePoint(px, py, w, h, rot) {
    switch (rot) {
      case 1: return { x: h - py, y: px };
      case 2: return { x: w - px, y: h - py };
      case 3: return { x: py, y: w - px };
      default: return { x: px, y: py };
    }
  }
  /** Rotates a rot-0 local TILE (dx,dy) -> rotated local tile (see header). */
  function rotateTile(dx, dy, w, h, rot) {
    const p = rotatePoint(dx + 0.5, dy + 0.5, w, h, rot);
    return { x: p.x - 0.5, y: p.y - 0.5 };
  }
  function frontFacing(rot) { return normAngle(-normRot(rot) * HALF_PI); }

  function slotFacingRaw(s, dxLocal, dyLocal, def) {
    let f = s.facing;
    if (typeof f === 'string') {
      const b = baseSize(def);
      const cx = b.w / 2 - 0.5, cy = b.h / 2 - 0.5;   // footprint centre in tile coords
      if (f === 'front' || f === 'forward') return 0;
      if (f === 'back') return Math.PI;
      const ang = mAtan2(cx - dxLocal, cy - dyLocal);   // toward the object
      if (f === 'away') return normAngle(ang + Math.PI);
      return normAngle(ang);                                // 'toward' / anything else
    }
    if (isNum(f)) {
      if (mAbs(f) > TWO_PI + 1e-6) f = f * Math.PI / 180;   // tolerate degrees
      return f;
    }
    // default: on-object slots face the object's front; outside slots face the object
    if (s.on) return 0;
    const b = baseSize(def);
    const cx = b.w / 2 - 0.5, cy = b.h / 2 - 0.5;
    if (dxLocal === cx && dyLocal === cy) return 0;
    return normAngle(mAtan2(cx - dxLocal, cy - dyLocal));
  }

  // every tile orthogonally around the rot-0 footprint, facing it (front row first)
  function perimeterSlots(b) {
    const out = [];
    for (let i = 0; i < b.w; i++) out.push({ dx: i, dy: b.h, facing: Math.PI, on: false });
    for (let j = 0; j < b.h; j++) out.push({ dx: -1, dy: j, facing: HALF_PI, on: false });
    for (let j = 0; j < b.h; j++) out.push({ dx: b.w, dy: j, facing: 3 * HALF_PI, on: false });
    for (let i = 0; i < b.w; i++) out.push({ dx: i, dy: -1, facing: 0, on: false });
    return out;
  }
  // Slots synthesized when a def has interactions but no slots:
  //   approach 'adjacent' -> every tile around the footprint; wall-mounted -> its own tile;
  //   noBlock items -> own tile + around; blocking objects -> the front row.
  function defaultSlots(def, type) {
    if (!def || !isArr(def.interactions) || !def.interactions.length) return [];
    const layer = layerOf(def, type);
    const b = baseSize(def);
    if (def.approach === 'adjacent') return perimeterSlots(b);
    if (layer === L_WALL) {
      const out = [];
      for (let i = 0; i < b.w; i++) out.push({ dx: i, dy: 0, facing: Math.PI, on: false });
      return out;
    }
    if (layer === L_ITEM) return [{ dx: 0, dy: 0, facing: 0, on: false }].concat(perimeterSlots(b));
    if (layer === L_BLOCK) {
      const out = [];
      for (let i = 0; i < b.w; i++) out.push({ dx: i, dy: b.h, facing: Math.PI, on: false });
      return out;
    }
    return [];
  }
  function rotateVec(vx, vy, rot) {
    switch (rot) {
      case 1: return { x: -vy, y: vx };
      case 2: return { x: -vx, y: -vy };
      case 3: return { x: vy, y: -vx };
      default: return { x: vx, y: vy };
    }
  }
  // A slot is usable when its tile is on the lot and — for standing (on:false) slots — it lies in
  // the object's room and is not cut off from an adjacent footprint tile by a wall/window.
  function slotUsable(slot, x, y, sz, objRoomId) {
    const tx = mRound(slot.x), ty = mRound(slot.y);
    if (!inB(tx, ty)) return false;
    if (slot.on) return true;
    if (objRoomId >= 0 && roomGrid[ty * W + tx] !== objRoomId) return false;
    let adj = 0, open = 0;
    for (let d = 0; d < 4; d++) {
      const nx = tx + DX[d], ny = ty + DY[d];
      if (nx < x || ny < y || nx >= x + sz.w || ny >= y + sz.h) continue;
      adj++;
      const e = edgeTypeBetween(tx, ty, nx, ny);
      if (e === 0 || e === 2) open++;
    }
    return adj === 0 || open > 0;
  }

  function computeSlots(type, x, y, rot, objId) {
    const def = defOf(type);
    if (!def) return [];
    rot = normRot(rot);
    const b = baseSize(def);
    const sz = sizeOf(def, rot);
    let src = isArr(def.slots) && def.slots.length ? def.slots : defaultSlots(def, type);
    let objRoomId = -1;
    if (S && N && src.length) {
      ensureRooms();
      for (let ty = y; ty < y + sz.h && objRoomId < 0; ty++) {
        for (let tx = x; tx < x + sz.w; tx++) if (inB(tx, ty)) { objRoomId = roomGrid[ty * W + tx]; break; }
      }
    }
    const out = [];
    for (let i = 0; i < src.length; i++) {
      const s = src[i];
      if (!s || typeof s !== 'object') continue;
      const dx = isNum(+s.dx) ? +s.dx : 0, dy = isNum(+s.dy) ? +s.dy : 0;
      const r = rotateTile(dx, dy, b.w, b.h, rot);
      const f0 = slotFacingRaw(s, dx, dy, def);
      const slot = {};
      for (const k in s) if (hasOwn.call(s, k)) slot[k] = s[k];
      slot.x = x + r.x;
      slot.y = y + r.y;
      slot.facing = normAngle(f0 - rot * HALF_PI);
      slot.on = !!s.on;
      slot.index = i;
      // exact pose position (character coords): slot tile + rotated optional (ox, oy) offset
      const off = rotateVec(isNum(+s.ox) ? +s.ox : 0, isNum(+s.oy) ? +s.oy : 0, rot);
      slot.px = slot.x + off.x;
      slot.py = slot.y + off.y;
      slot.usable = slotUsable(slot, x, y, sz, objRoomId);
      if (objId !== undefined) slot.objId = objId;
      out.push(slot);
    }
    return out;
  }

  /** World-space slots of an object: [{x, y, facing, on, index, objId, dx, dy, ...}].
   *  Also accepts (type, x, y, rot) for hypothetical placements. */
  function slotsFor(obj, x, y, rot) {
    if (typeof obj === 'string') {
      const tx = toInt(x), ty = toInt(y);
      return isFin(tx) && isFin(ty) ? computeSlots(obj, tx, ty, rot) : [];
    }
    if (!obj || typeof obj !== 'object') return [];
    const ox = toInt(obj.x), oy = toInt(obj.y);
    if (!isFin(ox) || !isFin(oy)) return [];
    return computeSlots(obj.type, ox, oy, obj.rot, obj.id);
  }

  function modelTransform(type, x, y, rot) {
    if (type && typeof type === 'object') { x = type.x; y = type.y; rot = type.rot; type = type.type; }
    rot = normRot(rot);
    const b = baseSize(defOf(type));
    const off = rot === 1 ? [b.h, 0] : rot === 2 ? [b.w, b.h] : rot === 3 ? [0, b.w] : [0, 0];
    return { x: (+x || 0) + off[0], z: (+y || 0) + off[1], rotY: -rot * HALF_PI };
  }

  function wallEdgeBehind(x, y, rot) {
    const e = backEdges(toInt(x), toInt(y), 1, 1, normRot(rot))[0];
    return keyOf(e.kind, e.x, e.y);
  }

  function objectById(id) { ensure(); if (id == null) return null; return byId.get(id) || byId.get(+id) || byId.get(String(id)) || null; }

  function objectAt(x, y) {
    if (!ensure()) return null;
    x = toInt(x); y = toInt(y);
    if (!inB(x, y)) return null;
    const i = y * W + x;
    if (blockAt[i]) return blockAt[i];
    if (itemAt[i]) return itemAt[i];
    for (let r = 0; r < 4; r++) { const o = wallAt.get(i * 4 + r); if (o) return o; }
    return floorAt[i] || null;
  }

  /** Every object covering the tile, top-down: items (meal/plate…), blockers, wall-mounted, rugs. */
  function objectsAt(x, y) {
    if (!ensure()) return [];
    x = toInt(x); y = toInt(y);
    if (!inB(x, y)) return [];
    const buckets = [[], [], [], []];
    const order = { 1: 0, 0: 1, 3: 2, 2: 3 };
    for (const o of objList) {
      if (!o || typeof o !== 'object') continue;
      const r = objRect(o);
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) {
        buckets[isWallMounted(r.def) && r.layer === L_WALL ? 2 : order[r.layer]].push(o);
      }
    }
    return buckets[0].concat(buckets[1], buckets[2], buckets[3]);
  }

  function itemOn(x, y) {
    if (!ensure()) return null;
    x = toInt(x); y = toInt(y);
    return inB(x, y) ? itemAt[y * W + x] || null : null;
  }

  function isWalkable(x, y, allowObjId) {
    if (!ensure()) return false;
    x = toInt(x); y = toInt(y);
    if (!inB(x, y)) return false;
    const i = y * W + x;
    if (!blocked[i]) return true;
    if (allowObjId == null) return false;
    const o = blockAt[i];
    if (isArr(allowObjId)) { for (const a of allowObjId) if (sameId(o.id, a)) return true; return false; }
    return sameId(o.id, allowObjId);
  }

  // ------------------------------------------------------------------ placement
  function canPlace(type, x, y, rot, ignoreId) {
    if (!S) return fail('nostate', 'Terreno não carregado.');
    ensure();
    const def = defOf(type);
    if (!def) return fail('unknown', 'Objeto desconhecido.');
    x = toInt(x); y = toInt(y); rot = normRot(rot);
    if (!isFin(x) || !isFin(y)) return fail('bounds', 'Fora do terreno.');
    const sz = sizeOf(def, rot);
    if (x < 0 || y < 0 || x + sz.w > W || y + sz.h > H) return fail('bounds', 'Fora do terreno.');
    if (rectHasInternalWall(x, y, sz.w, sz.h)) return fail('wall', 'Não pode atravessar uma parede.');
    const layer = layerOf(def, type);
    const mounted = isWallMounted(def);
    if (mounted) {
      const backs = backEdges(x, y, sz.w, sz.h, rot);
      for (const e of backs) {
        if (edgeTypeKV(e.kind, e.x, e.y) !== 1) return fail('needWall', 'Precisa ficar encostado em uma parede.');
      }
    }
    // overlap rules against every other object (exact, independent of grid ordering)
    for (const o of objList) {
      if (!o || typeof o !== 'object') continue;
      if (ignoreId != null && sameId(o.id, ignoreId)) continue;
      const r = objRect(o);
      if (!isFin(r.x) || !isFin(r.y)) continue;
      if (r.x >= x + sz.w || r.x + r.w <= x || r.y >= y + sz.h || r.y + r.h <= y) continue;
      const odef = r.def;
      if (mounted && isWallMounted(odef) && r.rot === rot) return fail('wallTaken', 'Já há algo pendurado nesta parede.');
      if (layer === L_BLOCK) {
        if (r.layer === L_BLOCK) return fail('overlap', 'Já existe um objeto aqui.');
        if (r.layer === L_ITEM && !def.surface) return fail('floorItem', 'Há algo no chão aqui.');
      } else if (layer === L_ITEM) {
        if (r.layer === L_ITEM) return fail('overlap', 'Já existe algo aqui.');
        if (r.layer === L_BLOCK && !(odef && odef.surface)) return fail('surface', 'Só pode ficar no chão livre ou sobre uma bancada ou mesa.');
      } else if (layer === L_FLOOR) {
        if (r.layer === L_FLOOR) return fail('overlap', 'Já existe um tapete aqui.');
      }
    }
    if (layer === L_BLOCK && !slotsAccessible(type, x, y, rot, sz, ignoreId)) {
      return fail('access', 'Sem espaço livre para usar este objeto.');
    }
    return { ok: true, reason: '', code: 'ok' };
  }

  // "slots reachable-ish": at least one slot must be usable (or the object has no slots)
  function slotsAccessible(type, x, y, rot, sz, ignoreId) {
    const slots = computeSlots(type, x, y, rot);
    if (!slots.length) return true;
    const inRect = (tx, ty) => tx >= x && ty >= y && tx < x + sz.w && ty < y + sz.h;
    const freeTile = (tx, ty) => {
      if (!inB(tx, ty) || inRect(tx, ty)) return false;
      const b = blockAt[ty * W + tx];
      return !b || (ignoreId != null && sameId(b.id, ignoreId));
    };
    const open = (ax, ay, bx, by) => { const e = edgeTypeBetween(ax, ay, bx, by); return e === 0 || e === 2; };
    for (const s of slots) {
      const tx = mRound(s.x), ty = mRound(s.y);
      if (s.on) {
        for (let d = 0; d < 4; d++) {
          const nx = tx + DX[d], ny = ty + DY[d];
          if (freeTile(nx, ny) && open(tx, ty, nx, ny)) return true;
        }
      } else {
        if (!freeTile(tx, ty)) continue;
        let adj = 0, ok = 0;
        for (let d = 0; d < 4; d++) {
          const nx = tx + DX[d], ny = ty + DY[d];
          if (!inRect(nx, ny)) continue;
          adj++;
          if (open(tx, ty, nx, ny)) ok++;
        }
        if (adj === 0 || ok > 0) return true;
      }
    }
    return false;
  }

  /** Can a wall entry of type t (0 = demolish) be put on this edge? Walls may not cut through
   *  objects; doors/windows/demolition are refused where something hangs on the wall. */
  function canBuildWall(edgeKey, t) {
    if (!S) return fail('nostate', 'Terreno não carregado.');
    ensure();
    const p = parseKey(edgeKey);
    if (!p || !validEdge(p.kind, p.x, p.y)) return fail('bounds', 'Fora do terreno.');
    t = mRound(+t) || 0;
    if (t !== 0 && t !== 1 && t !== 2 && t !== 3) return fail('type', 'Tipo de parede inválido.');
    if (t > 0) {
      for (const o of objList) {
        if (!o || typeof o !== 'object') continue;
        const r = objRect(o);
        if (!isFin(r.x)) continue;
        let inside = false;
        if (p.kind === 'v') inside = p.x > r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
        else inside = p.y > r.y && p.y < r.y + r.h && p.x >= r.x && p.x < r.x + r.w;
        if (inside) { const res = fail('object', 'Há um objeto no caminho.'); res.objects = [o]; return res; }
      }
    }
    if (t !== 1) {
      const mounted = objectsOnEdge(edgeKey);
      if (mounted.length) {
        const res = fail('mounted', 'Há um objeto pendurado nesta parede.');
        res.objects = mounted;
        return res;
      }
    }
    return { ok: true, reason: '', code: 'ok' };
  }

  /** Wall-mounted objects hanging on this edge (from either side). */
  function objectsOnEdge(edgeKey) {
    ensure();
    const p = parseKey(edgeKey);
    if (!p) return [];
    const out = [];
    for (const o of objList) {
      if (!o || typeof o !== 'object') continue;
      const r = objRect(o);
      if (!isWallMounted(r.def) || !isFin(r.x)) continue;
      const backs = backEdges(r.x, r.y, r.w, r.h, r.rot);
      for (const e of backs) if (e.kind === p.kind && e.x === p.x && e.y === p.y) { out.push(o); break; }
    }
    return out;
  }

  // ------------------------------------------------------------------ A* pathfinding
  function newSearch() {
    sid++;
    if (sid >= 0xFFFFFFF0) {
      openSt.fill(0); closedSt.fill(0); allowSt.fill(0); blockSt.fill(0); goalSt.fill(0); goalEnterSt.fill(0);
      compSt.fill(0);
      sid = 1;
    }
    heapSize = 0;
    allowList.length = 0;
    enterList.length = 0;
    return sid;
  }

  function less(a, b) {
    const fa = fArr[a], fb = fArr[b];
    return fa < fb || (fa === fb && gArr[a] > gArr[b]);
  }
  function siftUp(p) {
    const node = heap[p];
    while (p > 0) {
      const q = (p - 1) >> 1, pn = heap[q];
      if (!less(node, pn)) break;
      heap[p] = pn; heapPos[pn] = p; p = q;
    }
    heap[p] = node; heapPos[node] = p;
  }
  function siftDown(p) {
    const node = heap[p], n = heapSize;
    for (;;) {
      let c = 2 * p + 1;
      if (c >= n) break;
      if (c + 1 < n && less(heap[c + 1], heap[c])) c++;
      if (!less(heap[c], node)) break;
      heap[p] = heap[c]; heapPos[heap[p]] = p; p = c;
    }
    heap[p] = node; heapPos[node] = p;
  }
  function heapPush(i) { heap[heapSize] = i; heapPos[i] = heapSize; heapSize++; siftUp(heapSize - 1); }
  function heapPop() {
    const top = heap[0];
    heapSize--;
    if (heapSize > 0) { heap[0] = heap[heapSize]; heapPos[heap[0]] = 0; siftDown(0); }
    return top;
  }

  function markAllowObj(id, s) {
    const o = objectById(id);
    if (!o) return;
    const r = objRect(o);
    for (let ty = r.y; ty < r.y + r.h; ty++) {
      for (let tx = r.x; tx < r.x + r.w; tx++) {
        if (!inB(tx, ty)) continue;
        const i = ty * W + tx;
        allowSt[i] = s;
        if (blocked[i]) allowList.push(i);
      }
    }
  }
  function prepareOpts(opts, s) {
    if (!opts) return;
    const a = opts.allowObjId;
    if (a != null) { if (isArr(a)) for (const id of a) markAllowObj(id, s); else markAllowObj(a, s); }
    if (isArr(opts.allowTiles)) {
      for (const t of opts.allowTiles) {
        if (!t) continue;
        const tx = tileOf(t.x), ty = tileOf(t.y);
        if (!inB(tx, ty)) continue;
        const i = ty * W + tx;
        allowSt[i] = s;
        if (blocked[i]) allowList.push(i);
      }
    }
    if (isArr(opts.blockTiles)) {
      for (const t of opts.blockTiles) {
        if (!t) continue;
        const tx = tileOf(t.x), ty = tileOf(t.y);
        if (inB(tx, ty)) blockSt[ty * W + tx] = s;
      }
    }
  }

  function ensureComps() {
    if (compsValid) return;
    comp.fill(-1);
    let next = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (blocked[s0] || comp[s0] !== -1) continue;
      let head = 0, tail = 0;
      queueBuf[tail++] = s0; comp[s0] = next;
      while (head < tail) {
        const cur = queueBuf[head++];
        const m = pass[cur];
        for (let d = 0; d < 4; d++) {
          if (!(m & (1 << d))) continue;
          const nb = cur + DX[d] + DY[d] * W;
          if (blocked[nb] || comp[nb] !== -1) continue;
          comp[nb] = next; queueBuf[tail++] = nb;
        }
      }
      next++;
    }
    compCount = next;
    compsValid = true;
  }

  /**
   * Necessary condition for reachability (exact for orthogonal connectivity, ignores blockTiles,
   * which can only remove connectivity). Goals must already be marked in goalSt. Blocked tiles
   * that are enterable (allowList / enterList) are bridged explicitly; enter-only goal tiles are
   * never walked through.
   */
  function maybeReachable(start, goals, s) {
    ensureComps();
    const seen = new Set();
    let found = false;
    const markComp = (c) => { if (c >= 0) compSt[c] = s; };
    const expand = (i) => {
      if (seen.has(i)) return;
      seen.add(i);
      if (goalSt[i] === s) found = true;
      if (i !== start && allowSt[i] !== s) return;   // enter-only goal tile
      const m = pass[i];
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const nb = i + DX[d] + DY[d] * W;
        if (!blocked[nb]) markComp(comp[nb]);
        else if (allowSt[nb] === s || goalEnterSt[nb] === s) expand(nb);
      }
    };
    if (!blocked[start]) markComp(comp[start]); else expand(start);
    const special = allowList.length || enterList.length ? allowList.concat(enterList) : null;
    if (special) {
      let changed = true;
      while (changed && !found) {
        changed = false;
        for (const t of special) {
          if (seen.has(t)) continue;
          const m = pass[t];
          for (let d = 0; d < 4; d++) {
            if (!(m & (1 << d))) continue;
            const nb = t + DX[d] + DY[d] * W;
            if (!blocked[nb] && comp[nb] >= 0 && compSt[comp[nb]] === s) { expand(t); changed = true; break; }
          }
        }
      }
    }
    if (found) return true;
    for (const g of goals) {
      if (!blocked[g] && compSt[comp[g]] === s) return true;
      if (seen.has(g)) return true;
    }
    return false;
  }

  /**
   * Core search. goals: array of tile indices (goalSt/goalEnterSt/goalPen already marked).
   * Returns the reached goal index or -1.
   */
  function runSearch(start, goals, hasPen, maxNodes, s) {
    const nG = goals.length;
    let gx0 = 0, gy0 = 0, useH = 0;   // 0: none, 1: single goal, 2: min over goals
    if (!hasPen) {
      if (nG === 1) { useH = 1; gx0 = goals[0] % W; gy0 = (goals[0] / W) | 0; }
      else if (nG <= 16) useH = 2;
    }
    const hOf = (i) => {
      if (useH === 0) return 0;
      const x = xOf[i], y = yOf[i];
      if (useH === 1) {
        const dx = mAbs(x - gx0), dy = mAbs(y - gy0);
        return dx > dy ? dx + (SQRT2 - 1) * dy : dy + (SQRT2 - 1) * dx;
      }
      let best = Infinity;
      for (let k = 0; k < nG; k++) {
        const g = goals[k];
        const dx = mAbs(x - xOf[g]), dy = mAbs(y - yOf[g]);
        const h = dx > dy ? dx + (SQRT2 - 1) * dy : dy + (SQRT2 - 1) * dx;
        if (h < best) best = h;
      }
      return best;
    };

    gArr[start] = 0; fArr[start] = hOf(start); parent[start] = -1; openSt[start] = s;
    heapPush(start);
    let expansions = 0;
    let bestGoal = -1, bestTotal = Infinity;

    while (heapSize > 0) {
      const cur = heapPop();
      closedSt[cur] = s;
      if (hasPen && gArr[cur] >= bestTotal) break;
      const curFree = blocked[cur] === 0 && blockSt[cur] !== s;
      if (goalSt[cur] === s) {
        const total = gArr[cur] + goalPen[cur];
        if (!hasPen) return cur;
        if (total < bestTotal) { bestTotal = total; bestGoal = cur; }
        // goal tiles that are only enterable as goals are never walked through
        if (!curFree && allowSt[cur] !== s) continue;
      }
      if (++expansions > maxNodes) return hasPen ? bestGoal : -1;
      const m = pass[cur];
      const g0 = gArr[cur];
      for (let d = 0; d < 8; d++) {
        if (!(m & (1 << d))) continue;
        const nb = cur + DX[d] + DY[d] * W;
        if (closedSt[nb] === s) continue;
        let cost;
        if (d < 4) {
          const free = blocked[nb] === 0 && blockSt[nb] !== s;
          if (!free && allowSt[nb] !== s && goalEnterSt[nb] !== s) continue;
          cost = 1;
        } else {
          // diagonal: source, target and both orthogonal neighbours must be naturally free
          if (!curFree) continue;
          if (blocked[nb] !== 0 || blockSt[nb] === s) continue;
          const a = cur + DX[d], b = cur + DY[d] * W;
          if (blocked[a] !== 0 || blockSt[a] === s || blocked[b] !== 0 || blockSt[b] === s) continue;
          cost = SQRT2;
        }
        const ng = g0 + cost;
        if (openSt[nb] !== s) {
          openSt[nb] = s; gArr[nb] = ng; parent[nb] = cur; fArr[nb] = ng + hOf(nb);
          heapPush(nb);
        } else if (ng < gArr[nb] - 1e-9) {
          gArr[nb] = ng; parent[nb] = cur; fArr[nb] = ng + hOf(nb);
          siftUp(heapPos[nb]);
        }
      }
    }
    return hasPen ? bestGoal : -1;
  }

  function buildPath(start, goal) {
    const out = [];
    let c = goal, guard = 0;
    while (c !== start && c >= 0 && guard++ <= N) { out.push({ x: c % W, y: (c / W) | 0 }); c = parent[c]; }
    out.reverse();
    out.cost = gArr[goal];
    return out;
  }

  function clampTile(v, max) { let t = tileOf(v); if (!isFin(t)) return -1; if (t < 0) t = 0; if (t > max - 1) t = max - 1; return t; }

  /**
   * A* from (fromX,fromY) to (toX,toY) (float character coords; tiles = round, clamped to the lot).
   * 8-directional; diagonals only when source, target and both orthogonal neighbours are free and no
   * wall entry (door included) touches the crossed corner. Start tile always allowed.
   * opts: { allowObjId: id|[ids], allowTiles: [{x,y}], blockTiles: [{x,y}], maxNodes, smooth }
   * Returns [{x,y}] tile centres excluding start, including destination ([] if already there,
   * null if unreachable). The array carries a `cost` property (path length in tiles).
   */
  function findPath(fromX, fromY, toX, toY, opts) {
    if (!ensure() || N === 0) return null;
    const sx = clampTile(fromX, W), sy = clampTile(fromY, H);
    const tx = clampTile(toX, W), ty = clampTile(toY, H);
    if (sx < 0 || sy < 0 || tx < 0 || ty < 0) return null;
    const start = sy * W + sx, goal = ty * W + tx;
    if (start === goal) { const r = []; r.cost = 0; return r; }
    const s = newSearch();
    prepareOpts(opts, s);
    const goalOk = (blocked[goal] === 0 && blockSt[goal] !== s) || allowSt[goal] === s;
    if (!goalOk) return null;
    goalSt[goal] = s; goalPen[goal] = 0;
    if (!maybeReachable(start, [goal], s)) return null;
    const maxNodes = opts && opts.maxNodes > 0 ? opts.maxNodes : N + 1;
    const reached = runSearch(start, [goal], false, maxNodes, s);
    if (reached < 0) return null;
    const path = buildPath(start, reached);
    if (opts && opts.smooth) { const sm = smoothPath(sx, sy, path); sm.cost = path.cost; return sm; }
    return path;
  }

  /**
   * Picks the reachable candidate with the shortest path (multi-goal A*).
   * candidates: [{x, y, on?, allowBlocked?, penalty?, ...}] (e.g. slotsFor(obj)).
   *   - a candidate tile must be walkable, unless cand.on / cand.allowBlocked (then it may be
   *     entered as the final, orthogonal step even though an object stands there);
   *   - cand.penalty (>= 0, tiles) is added to its path cost when comparing.
   * opts: same as findPath (allowObjId, allowTiles, blockTiles, maxNodes, smooth).
   * Returns { candidate, index, x, y, path, cost } or null.
   */
  function nearestReachable(fromX, fromY, candidates, opts) {
    if (!ensure() || N === 0 || !isArr(candidates) || !candidates.length) return null;
    const sx = clampTile(fromX, W), sy = clampTile(fromY, H);
    if (sx < 0 || sy < 0) return null;
    const start = sy * W + sx;
    const s = newSearch();
    prepareOpts(opts, s);
    const goals = [];
    let hasPen = false;
    let atStart = -1, atStartPen = Infinity;
    for (let k = 0; k < candidates.length; k++) {
      const c = candidates[k];
      if (!c || c.usable === false || !isNum(+c.x) || !isNum(+c.y)) continue;
      const cx = tileOf(c.x), cy = tileOf(c.y);
      if (!inB(cx, cy)) continue;
      const i = cy * W + cx;
      const pen = isNum(+c.penalty) && +c.penalty > 0 ? +c.penalty : 0;
      if (i === start) { if (pen < atStartPen) { atStartPen = pen; atStart = k; } continue; }
      const enter = !!(c.on || c.allowBlocked);
      const ok = (blocked[i] === 0 && blockSt[i] !== s) || allowSt[i] === s || enter;
      if (!ok) continue;
      if (goalSt[i] === s) {   // duplicate tile: keep the lowest penalty
        if (pen < goalPen[i]) { goalPen[i] = pen; goalRef[i] = k; }
        if (enter && goalEnterSt[i] !== s) { goalEnterSt[i] = s; if (blocked[i]) enterList.push(i); }
        continue;
      }
      goalSt[i] = s; goalPen[i] = pen; goalRef[i] = k;
      if (enter) { goalEnterSt[i] = s; if (blocked[i]) enterList.push(i); }
      if (pen > 0) hasPen = true;
      goals.push(i);
    }
    if (atStart >= 0 && (atStartPen === 0 || !goals.length)) {
      const p = []; p.cost = 0;
      const c = candidates[atStart];
      return { candidate: c, index: atStart, x: sx, y: sy, path: p, cost: atStartPen };
    }
    if (!goals.length) return null;
    if (atStart >= 0) {   // standing on a penalised candidate: treat as a goal with cost 0 + penalty
      hasPen = true;
    }
    const maxNodes = opts && opts.maxNodes > 0 ? opts.maxNodes : N + 1;
    const reached = maybeReachable(start, goals, s) ? runSearch(start, goals, hasPen, maxNodes, s) : -1;
    if (atStart >= 0 && (reached < 0 || gArr[reached] + goalPen[reached] >= atStartPen)) {
      const p = []; p.cost = 0;
      return { candidate: candidates[atStart], index: atStart, x: sx, y: sy, path: p, cost: atStartPen };
    }
    if (reached < 0) return null;
    let path = buildPath(start, reached);
    const cost = path.cost;
    if (opts && opts.smooth) { path = smoothPath(sx, sy, path); path.cost = cost; }
    const k = goalRef[reached];
    return { candidate: candidates[k], index: k, x: reached % W, y: (reached / W) | 0, path: path, cost: cost + goalPen[reached] };
  }

  // --- optional path smoothing (string pulling with clearance) --------------------------------
  function freeT(x, y) { return inB(x, y) && blocked[y * W + x] === 0; }
  // Traverses the grid along the world-space segment (x0,y0)->(x1,y1); fails on blocked tiles, any
  // wall entry (doors included: doors are always crossed on the grid path) and closed corners.
  function rayClear(x0, y0, x1, y1) {
    let tx = mFloor(x0), ty = mFloor(y0);
    const ex = mFloor(x1), ey = mFloor(y1);
    if (!freeT(tx, ty) || !freeT(ex, ey)) return false;
    const dx = x1 - x0, dy = y1 - y0;
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0, stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const tDX = stepX ? mAbs(1 / dx) : Infinity, tDY = stepY ? mAbs(1 / dy) : Infinity;
    let tMX = stepX > 0 ? (tx + 1 - x0) / dx : stepX < 0 ? (x0 - tx) / -dx : Infinity;
    let tMY = stepY > 0 ? (ty + 1 - y0) / dy : stepY < 0 ? (y0 - ty) / -dy : Infinity;
    let guard = 0;
    while ((tx !== ex || ty !== ey) && guard++ < 1024) {
      if (mAbs(tMX - tMY) < 1e-9) {
        if (tMX > 1) break;
        const nx = tx + stepX, ny = ty + stepY;
        const cx = tx + (stepX > 0 ? 1 : 0), cy = ty + (stepY > 0 ? 1 : 0);
        if (!inB(nx, ny) || !cornerOk[cy * (W + 1) + cx]) return false;
        if (!freeT(nx, ty) || !freeT(tx, ny) || !freeT(nx, ny)) return false;
        tx = nx; ty = ny; tMX += tDX; tMY += tDY;
      } else if (tMX < tMY) {
        if (tMX > 1) break;
        const nx = tx + stepX;
        if (!inB(nx, ty)) return false;
        if (vEdge[ty * (W + 1) + mMax(tx, nx)] !== 0) return false;
        if (!freeT(nx, ty)) return false;
        tx = nx; tMX += tDX;
      } else {
        if (tMY > 1) break;
        const ny = ty + stepY;
        if (!inB(tx, ny)) return false;
        if (hEdge[mMax(ty, ny) * W + tx] !== 0) return false;
        if (!freeT(tx, ny)) return false;
        ty = ny; tMY += tDY;
      }
    }
    return true;
  }
  const CLEAR_R = 0.3;
  function segmentClear(ax, ay, bx, by) {
    const x0 = ax + 0.5, y0 = ay + 0.5, x1 = bx + 0.5, y1 = by + 0.5;
    const dx = x1 - x0, dy = y1 - y0, len = mSqrt(dx * dx + dy * dy);
    if (len < 1e-9) return true;
    const px = -dy / len * CLEAR_R, py = dx / len * CLEAR_R;
    return rayClear(x0, y0, x1, y1) && rayClear(x0 + px, y0 + py, x1 + px, y1 + py) &&
      rayClear(x0 - px, y0 - py, x1 - px, y1 - py);
  }
  /** Removes intermediate path points where a straight walk (with ~0.3 tile clearance) is clear.
   *  Returns a subset of the input points (tile centres). Doors are always kept as grid steps. */
  function smoothPath(fromX, fromY, path) {
    if (!isArr(path)) return path;
    ensure();
    if (path.length < 2) return path.slice();
    const pts = [{ x: tileOf(fromX), y: tileOf(fromY) }].concat(path);
    const out = [];
    let anchor = 0;
    for (let i = 2; i < pts.length; i++) {
      if (!segmentClear(pts[anchor].x, pts[anchor].y, pts[i].x, pts[i].y)) { out.push(pts[i - 1]); anchor = i - 1; }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  /** Nearest tile where a character can stand, searching outward from (x,y) through open edges
   *  first (same region), then ignoring walls. Returns {x,y} or null. */
  function nearestWalkable(x, y, opts) {
    if (!ensure() || N === 0) return null;
    const sx = clampTile(x, W), sy = clampTile(y, H);
    if (sx < 0 || sy < 0) return null;
    const s = newSearch();
    prepareOpts(opts, s);
    const ok = (i) => blocked[i] === 0 && blockSt[i] !== s;
    const start = sy * W + sx;
    if (ok(start)) return { x: sx, y: sy };
    // BFS through edges (objects ignored for traversal)
    let head = 0, tail = 0;
    queueBuf[tail++] = start; closedSt[start] = s;
    while (head < tail) {
      const cur = queueBuf[head++];
      if (ok(cur)) return { x: cur % W, y: (cur / W) | 0 };
      const m = pass[cur];
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const nb = cur + DX[d] + DY[d] * W;
        if (closedSt[nb] === s) continue;
        closedSt[nb] = s; queueBuf[tail++] = nb;
      }
    }
    // fallback: rings ignoring walls
    let best = null, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      if (!ok(i)) continue;
      const ddx = (i % W) - sx, ddy = ((i / W) | 0) - sy;
      const d = ddx * ddx + ddy * ddy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best == null ? null : { x: best % W, y: (best / W) | 0 };
  }

  // ------------------------------------------------------------------ rooms
  // RoomImpact constants: M.data.ROOM_IMPACT when present, canonical defaults otherwise
  const RI_DEFAULTS = { perRating: 5, lampLit: 10, lampCap: 30, windowDay: 5, darkNight: -20,
    dirtyPlate: -5, spoiledPlate: -15, puddle: -15, broken: -10, dirtyPlumbing: -5, spoiledMeal: -15,
    deadPlant: -15, unmadeBed: -5 };
  function RI(k) {
    const t = M.data && M.data.ROOM_IMPACT;
    if (t && t[k] != null && isNum(+t[k])) return +t[k];
    return RI_DEFAULTS[k];
  }
  function dirtyThreshold() {
    const d = M.data && M.data.DIRT;
    return d && isNum(+d.visible) && d.visible != null ? +d.visible : 500;
  }

  function floorAtIdx(i) {
    const v = mRound(+S.lot.floors[i]);
    return v >= 0 ? v : 0;
  }
  // 0..3 quality tier from a price (10 -> 0, 20 -> 1, 40 -> 2, >= 80 -> 3)
  function priceTier(price) {
    price = +price;
    if (!(price > 10)) return 0;
    return mMax(0, mMin(3, mFloor(mLog2(price / 10) + 1e-9)));
  }
  // quality tier 0..3 of a floor/wallpaper entry: its `room` value when given, else from price
  function tableTier(table, idx) {
    if (!isArr(table)) return 0;
    const e = table[idx];
    if (!e || typeof e !== 'object') return 0;
    if (e.room != null && isNum(+e.room)) return mMax(0, mMin(3, +e.room));
    return priceTier(e.price);
  }

  // BB-8: a region is outdoor only when it touches the lot border: when it leaks off the lot
  // through a border edge without a wall, or (walled along the border) when grass is a strict
  // majority of its floor (a yard fenced by walls on the lot border). Any region enclosed by walls
  // away from the lot border is indoor, floored or not.
  function regionIndoor(leak, touches, grass, area) {
    if (leak) return false;
    if (touches && grass * 2 > area) return false;
    return true;
  }
  function refreshRoomDerived(R) {
    R.floorTierAvg = R.area ? R.floorTierSum / R.area : 0;
    R.indoor = regionIndoor(R.leaksOut, R.touchesBorder, R.grass, R.area);
    R.enclosed = !R.leaksOut;
    R.floorBonus = R.indoor ? 2 * R.floorTierAvg : 0;
    R.wallBonus = R.indoor && R.wallSides ? 2 * (R.wallTierSum / R.wallSides) : 0;
  }

  /**
   * Flood-fills regions separated by ANY wall entry on the given edge arrays into `grid`.
   * Returns [{ id, tiles|null, area, grass, leak, touches, floorTierSum }].
   */
  function floodRegions(hE, vE, grid, keepTiles, FL) {
    const list = [];
    grid.fill(-1);
    const W1 = W + 1;
    const floors = S.lot.floors;
    for (let s0 = 0; s0 < N; s0++) {
      if (grid[s0] !== -1) continue;
      const id = list.length;
      let head = 0, tail = 0;
      queueBuf[tail++] = s0; grid[s0] = id;
      let grass = 0, leak = false, touches = false, floorTier = 0;
      const tiles = keepTiles ? [] : null;
      while (head < tail) {
        const i = queueBuf[head++];
        const x = xOf[i], y = yOf[i];
        if (tiles) tiles.push({ x: x, y: y });
        const fr = mRound(+floors[i]);
        const f = fr >= 0 ? fr : 0;
        if (f === 0) grass++;
        floorTier += tableTier(FL, f);
        if (x === 0) { touches = true; if (vE[y * W1] === 0) leak = true; }
        if (x === W - 1) { touches = true; if (vE[y * W1 + W] === 0) leak = true; }
        if (y === 0) { touches = true; if (hE[x] === 0) leak = true; }
        if (y === H - 1) { touches = true; if (hE[H * W + x] === 0) leak = true; }
        let nb;
        if (y > 0 && hE[y * W + x] === 0) { nb = i - W; if (grid[nb] === -1) { grid[nb] = id; queueBuf[tail++] = nb; } }
        if (x < W - 1 && vE[y * W1 + x + 1] === 0) { nb = i + 1; if (grid[nb] === -1) { grid[nb] = id; queueBuf[tail++] = nb; } }
        if (y < H - 1 && hE[(y + 1) * W + x] === 0) { nb = i + W; if (grid[nb] === -1) { grid[nb] = id; queueBuf[tail++] = nb; } }
        if (x > 0 && vE[y * W1 + x] === 0) { nb = i - 1; if (grid[nb] === -1) { grid[nb] = id; queueBuf[tail++] = nb; } }
      }
      list.push({ id: id, tiles: tiles, area: tail, grass: grass, leak: leak, touches: touches, floorTierSum: floorTier });
    }
    return list;
  }

  function computeRooms() {
    roomList = [];
    objRoomValid = false;
    const FL = M.data && M.data.FLOORS, WP = M.data && M.data.WALLPAPERS;
    roomsFL = FL; roomsWP = WP;
    if (!S || N === 0) { roomsValid = true; return; }
    const W1 = W + 1;
    const regions = floodRegions(hEdge, vEdge, roomGrid, true, FL);
    for (const g of regions) {
      roomList.push({
        id: g.id, tiles: g.tiles, area: g.area, indoor: false, enclosed: !g.leak, grass: g.grass, leaksOut: g.leak,
        touchesBorder: g.touches, windows: 0, doors: 0, wallSides: 0, wallTierSum: 0, floorTierSum: g.floorTierSum,
        floorTierAvg: 0, floorBonus: 0, wallBonus: 0, edgeCodes: [], edgeSides: [],
      });
    }
    // windows / doors / wallpaper per room side: side A faces north/west, side B south/east.
    // The bonus uses the colour of the side that faces INTO each room (cA / cB).
    const addEdge = (t, code, tierA, tierB, ra, rb) => {
      if (ra >= 0) { const R = roomList[ra]; R.wallSides++; R.wallTierSum += tierA; R.edgeCodes.push(code); R.edgeSides.push(0); }
      if (rb >= 0) { const R = roomList[rb]; R.wallSides++; R.wallTierSum += tierB; R.edgeCodes.push(code); R.edgeSides.push(1); }
      if (t === 3) { if (ra >= 0) roomList[ra].windows++; if (rb >= 0 && rb !== ra) roomList[rb].windows++; }
      if (t === 2) { if (ra >= 0) roomList[ra].doors++; if (rb >= 0 && rb !== ra) roomList[rb].doors++; }
    };
    for (let y = 0; y <= H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, t = hEdge[i];
        if (!t) continue;
        addEdge(t, i * 2, tableTier(WP, hPapA[i]), tableTier(WP, hPapB[i]),
          y > 0 ? roomGrid[(y - 1) * W + x] : -1, y < H ? roomGrid[y * W + x] : -1);
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x <= W; x++) {
        const i = y * W1 + x, t = vEdge[i];
        if (!t) continue;
        addEdge(t, i * 2 + 1, tableTier(WP, vPapA[i]), tableTier(WP, vPapB[i]),
          x > 0 ? roomGrid[y * W + x - 1] : -1, x < W ? roomGrid[y * W + x] : -1);
      }
    }
    // floor/wallpaper quality bonus (score points, indoor only): up to +6 floor, +6 walls
    for (const R of roomList) refreshRoomDerived(R);
    roomsValid = true;
  }
  function ensureRooms() {
    ensure();
    const D = M.data;
    if (roomsValid && ((D && D.FLOORS) !== roomsFL || (D && D.WALLPAPERS) !== roomsWP)) roomsValid = false;
    if (!roomsValid) computeRooms();
  }

  function roomAt(x, y) {
    if (!S) return -1;
    ensureRooms();
    x = toInt(x); y = toInt(y);
    if (!inB(x, y)) return -1;
    return roomGrid[y * W + x];
  }
  function isIndoor(x, y) { const r = roomAt(x, y); return r >= 0 && !!roomList[r] && roomList[r].indoor; }

  function currentMinute() {
    try {
      const es = M.engine && M.engine.state;
      if (es && es.time && isNum(+es.time.minute)) return +es.time.minute;
    } catch (e) { /* engine not ready */ }
    if (S && S.time && isNum(+S.time.minute)) return +S.time.minute;
    return 12 * 60;
  }
  function isDaytime(minute) {
    const m = ((mFloor(isNum(+minute) ? +minute : currentMinute()) % 1440) + 1440) % 1440;
    return m >= DAY_START && m < DAY_END;
  }

  function roomRating(def) {
    if (!def) return 0;
    let r = def.ratings && isNum(+def.ratings.room) && def.ratings.room !== null ? +def.ratings.room : NaN;
    if (!isFin(r)) r = isNum(+def.room) && def.room !== null && def.room !== undefined ? +def.room : 0;
    return mMax(-10, mMin(10, r));
  }
  function isSpoiled(o) { return o.type === 'spoiled_meal' || !!o.spoiled || o.state === 'spoiled'; }
  function roomOfObject(o) {
    const r = objRect(o);
    if (!isFin(r.x) || !isFin(r.y)) return -1;
    for (let ty = r.y; ty < r.y + r.h; ty++) for (let tx = r.x; tx < r.x + r.w; tx++) if (inB(tx, ty)) return roomGrid[ty * W + tx];
    return -1;
  }

  function ensureObjRooms() {
    ensureRooms();
    if (objRoomValid && objRoom.length >= objList.length) return;
    if (objRoom.length < objList.length) objRoom = new Int32Array(mMax(16, objList.length * 2));
    roomObjs = roomList.map(() => []);
    for (let k = 0; k < objList.length; k++) {
      const o = objList[k];
      const r = o && typeof o === 'object' ? roomOfObject(o) : -1;
      objRoom[k] = r;
      if (r >= 0 && roomObjs[r]) roomObjs[r].push(k);
    }
    objRoomValid = true;
  }

  const MESS_TYPES = { dirty_plate: 1, puddle: 1, meal: 1, spoiled_meal: 1, newspaper: 1, carpool: 1 };
  function isLit(o, def) { return !!(def && def.light && !o.broken && !o.lightOff && o.on !== false && o.lit !== false); }

  // Canonical RoomImpact of one object EXCLUDING lamp light (RESEARCH.md "Canonical RoomImpact
  // table"); used when M.data.roomImpact is not available.
  function fallbackImpact(o, def) {
    const t = o.type;
    if (t === 'dirty_plate') return isSpoiled(o) ? RI('spoiledPlate') : RI('dirtyPlate');
    if (t === 'puddle') return RI('puddle');
    if (t === 'meal' || t === 'spoiled_meal') return isSpoiled(o) ? RI('spoiledMeal') : 0;
    if (t === 'newspaper' || t === 'carpool') return 0;
    if (o.dead) return RI('deadPlant');
    let v = RI('perRating') * roomRating(def);
    if (o.broken) v += RI('broken');
    if (def && (def.cat === 'plumbing' || +def.dirties > 0) && +o.dirty >= dirtyThreshold()) v += RI('dirtyPlumbing');
    return v;
  }

  function newAcc() { return { decor: 0, problems: 0, lamps: 0 }; }
  // Adds one object's RoomImpact. The per-object value comes from M.data.roomImpact(o, false)
  // (data.js is the single source of truth for object states) or the canonical fallback; lamp
  // light is counted separately (lit lamps, capped per room) and applied in finishScore.
  function accumulate(acc, o) {
    const def = defOf(o.type);
    let v;
    const D = M.data;
    if (D && typeof D.roomImpact === 'function') {
      try { v = +D.roomImpact(o, false); } catch (e) { v = NaN; }
      if (!isFin(v)) v = fallbackImpact(o, def);
    } else {
      v = fallbackImpact(o, def);
    }
    if (o.unmade) v += RI('unmadeBed');
    // split for the breakdown: catalog decor vs. problems (mess, dirt, broken, dead plants…)
    const decor = MESS_TYPES[o.type] || o.dead ? 0 : RI('perRating') * roomRating(def);
    acc.decor += decor;
    acc.problems += v - decor;
    if (isLit(o, def)) acc.lamps++;
  }
  function finishScore(R, acc, minute, wantParts) {
    const day = isDaytime(minute);
    const parts = wantParts ? [] : null;
    let sum = acc.decor + acc.problems;
    let lampPts = 0, windowPts = 0, darkPts = 0;
    if (!day) lampPts = mMin(RI('lampCap'), acc.lamps * RI('lampLit'));
    if (R.indoor) {
      if (day) windowPts = RI('windowDay') * R.windows;
      else if (acc.lamps === 0) darkPts = RI('darkNight');
    }
    sum += lampPts + windowPts + darkPts;
    let score, scale, base, bonus = 0;
    if (R.indoor) {
      scale = mMax(1, R.area / 12); base = -10; bonus = R.floorBonus + R.wallBonus;
    } else {
      scale = 30; base = -15;
    }
    score = mRound(sum / scale + bonus) + base;
    score = mMax(-100, mMin(100, score));
    if (parts) {
      const push = (key, label, value) => { if (value) parts.push({ key: key, label: label, value: value }); };
      push('decor', 'Decoração', acc.decor);
      push('lamps', 'Luminárias acesas', lampPts);
      push('windows', 'Janelas (luz do dia)', windowPts);
      push('dark', 'Cômodo escuro', darkPts);
      push('problems', 'Bagunça, sujeira e quebrados', acc.problems);
    }
    return { score: score, sum: sum, scale: scale, base: base, bonus: bonus, parts: parts };
  }

  function scoreRoomId(id, minute, wantParts) {
    const R = roomList[id];
    if (!R) return null;
    ensureObjRooms();
    const acc = newAcc();
    const ks = roomObjs[id] || [];
    for (let j = 0; j < ks.length; j++) accumulate(acc, objList[ks[j]]);
    return finishScore(R, acc, minute, wantParts);
  }

  /** Room score (-100..100) of the room containing tile (x,y); `minute` optional (default: now). */
  function roomScore(x, y, minute) {
    if (!S) return 0;
    const id = roomAt(x, y);
    if (id < 0) return 0;
    const m = isNum(+minute) && minute !== null && minute !== undefined ? +minute : currentMinute();
    const r = scoreRoomId(id, m, false);
    return r ? r.score : 0;
  }

  /** Detailed breakdown for UI/debug: {id, indoor, area, windows, score, sum, scale, base, bonus,
   *  floorBonus, wallBonus, parts:[{key,label,value}]} or null. */
  function roomBreakdown(x, y, minute) {
    if (!S) return null;
    const id = roomAt(x, y);
    if (id < 0) return null;
    const m = isNum(+minute) && minute !== null && minute !== undefined ? +minute : currentMinute();
    const R = roomList[id];
    const r = scoreRoomId(id, m, true);
    return {
      id: id, indoor: R.indoor, enclosed: R.enclosed, area: R.area, windows: R.windows, doors: R.doors, score: r.score, sum: r.sum,
      scale: r.scale, base: r.base, bonus: r.bonus, floorBonus: R.floorBonus, wallBonus: R.wallBonus,
      parts: r.parts,
    };
  }

  /** All rooms (outdoor regions included): [{id, tiles, indoor, area, windows, doors, score}]. */
  function rooms(minute) {
    if (!S) return [];
    ensureRooms();
    const m = isNum(+minute) && minute !== null && minute !== undefined ? +minute : currentMinute();
    ensureObjRooms();
    const accs = roomList.map(newAcc);
    for (let k = 0; k < objList.length; k++) {
      const id = objRoom[k];
      if (id >= 0 && accs[id]) accumulate(accs[id], objList[k]);
    }
    return roomList.map((R, i) => ({
      id: R.id, tiles: R.tiles, indoor: R.indoor, enclosed: R.enclosed, area: R.area, windows: R.windows, doors: R.doors,
      score: finishScore(R, accs[i], m, false).score,
    }));
  }

  function minuteArg(minute) {
    return isNum(+minute) && minute !== null && minute !== undefined ? +minute : currentMinute();
  }
  // RoomImpact accumulator of room `id`, optionally without one object and with a hypothetical one
  function roomAcc(id, ignoreId, extra) {
    ensureObjRooms();
    const acc = newAcc();
    const ks = roomObjs[id] || [];
    for (let j = 0; j < ks.length; j++) {
      const o = objList[ks[j]];
      if (ignoreId != null && o && sameId(o.id, ignoreId)) continue;
      accumulate(acc, o);
    }
    if (extra) accumulate(acc, extra);
    return acc;
  }

  /** Tiles of the room containing (x,y) as a fresh array of {x,y} ([] off the lot). */
  function roomTiles(x, y) {
    if (!S) return [];
    const id = roomAt(x, y);
    const R = roomList[id];
    return R ? R.tiles.map((t) => ({ x: t.x, y: t.y })) : [];
  }

  /** Every wall/door/window edge bounding the room that contains tile (x,y), with the side facing
   *  into that room: [{ key, side: 'A'|'B', t }]. A free-standing wall inside the room appears
   *  twice (both sides face the room). Outdoor regions work too (house facades). */
  function roomEdges(x, y) {
    if (!S) return [];
    const id = roomAt(x, y);
    if (id < 0 || !roomList[id]) return [];
    const R = roomList[id];
    const out = [];
    for (let k = 0; k < R.edgeCodes.length; k++) {
      const code = R.edgeCodes[k], idx = code >> 1;
      out.push({ key: keyOfCode(code), side: R.edgeSides[k] ? 'B' : 'A', t: (code & 1) ? vEdge[idx] : hEdge[idx] });
    }
    return out;
  }

  /** Predicted Ambiente of the room at (x,y,rot) if an object of `type` were placed there:
   *  { before, after, delta, room, indoor } or null (unknown type / off the lot). `ignoreId`
   *  (optional): the object being moved (left out of `after`). `minute` like roomScore. */
  function roomScoreWith(type, x, y, rot, ignoreId, minute) {
    if (!S) return null;
    ensureRooms();
    const def = defOf(type);
    if (!def) return null;
    x = toInt(x); y = toInt(y); rot = normRot(rot);
    if (!isFin(x) || !isFin(y)) return null;
    const sz = sizeOf(def, rot);
    let id = -1;
    for (let ty = y; ty < y + sz.h && id < 0; ty++) {
      for (let tx = x; tx < x + sz.w; tx++) if (inB(tx, ty)) { id = roomGrid[ty * W + tx]; break; }
    }
    const R = roomList[id];
    if (!R) return null;
    const m = minuteArg(minute);
    const hyp = { id: '__hypothetical__', type: type, x: x, y: y, rot: rot, dirty: 0, broken: false, uses: 0, price: +def.price || 0 };
    const before = finishScore(R, roomAcc(id, null, null), m, false).score;
    const after = finishScore(R, roomAcc(id, ignoreId, hyp), m, false).score;
    return { before: before, after: after, delta: after - before, room: id, indoor: R.indoor };
  }

  /** Predicted Ambiente if `tiles` ([{x,y}]) got floor `floorIdx`, for the room holding most of
   *  those tiles: { before, after, delta, room, indoor } or null. */
  function roomScoreWithFloor(tiles, floorIdx, minute) {
    if (!S || !isArr(tiles)) return null;
    ensureRooms();
    const f = mRound(+floorIdx);
    if (!(f >= 0)) return null;
    const FL = M.data && M.data.FLOORS;
    if (isArr(FL) && FL.length && f >= FL.length) return null;
    const seen = new Set(), byRoom = new Map();
    for (const t of tiles) {
      if (!t) continue;
      const tx = toInt(t.x), ty = toInt(t.y);
      if (!inB(tx, ty)) continue;
      const i = ty * W + tx;
      if (seen.has(i)) continue;
      seen.add(i);
      const r = roomGrid[i];
      if (!byRoom.has(r)) byRoom.set(r, []);
      byRoom.get(r).push(i);
    }
    let id = -1, best = 0;
    for (const [r, list] of byRoom) if (list.length > best) { best = list.length; id = r; }
    const R = roomList[id];
    if (!R) return null;
    const R2 = Object.assign({}, R);
    for (const i of byRoom.get(id)) {
      const old = floorAtIdx(i);
      R2.grass += (f === 0 ? 1 : 0) - (old === 0 ? 1 : 0);
      R2.floorTierSum += tableTier(FL, f) - tableTier(FL, old);
    }
    refreshRoomDerived(R2);
    const m = minuteArg(minute);
    const acc = roomAcc(id, null, null);
    const before = finishScore(R, acc, m, false).score, after = finishScore(R2, acc, m, false).score;
    return { before: before, after: after, delta: after - before, room: id, indoor: R2.indoor };
  }

  /** Predicted Ambiente if the given wall sides got wallpaper `idx`. `edgeSides`: [{key, side}]
   *  (as returned by roomEdges) or edge keys (both sides). Uses the room faced by most of them:
   *  { before, after, delta, room, indoor } or null. */
  function roomScoreWithWallpaper(edgeSides, idx, minute) {
    if (!S || !isArr(edgeSides)) return null;
    ensureRooms();
    const c = colorIdx(idx);
    if (c < 0) return null;
    const WP = M.data && M.data.WALLPAPERS;
    if (isArr(WP) && WP.length && c >= WP.length) return null;
    const seen = new Set(), byRoom = new Map();
    for (const es of edgeSides) {
      const key = typeof es === 'string' ? es : es && es.key;
      const p = parseKey(key);
      if (!p || !validEdge(p.kind, p.x, p.y)) continue;
      const i = edgeIndex(p.kind, p.x, p.y);
      if (!(p.kind === 'h' ? hEdge[i] : vEdge[i])) continue;
      const sd = typeof es === 'string' ? null : normSide(es.side);
      for (const side of sd ? [sd] : ['A', 'B']) {
        const tt = sideTile(p.kind, p.x, p.y, side);
        if (!inB(tt.x, tt.y)) continue;
        const code = codeOf(p.kind, p.x, p.y) * 2 + (side === 'B' ? 1 : 0);
        if (seen.has(code)) continue;
        seen.add(code);
        const cur = p.kind === 'h' ? (side === 'A' ? hPapA[i] : hPapB[i]) : (side === 'A' ? vPapA[i] : vPapB[i]);
        const r = roomGrid[tt.y * W + tt.x];
        if (!byRoom.has(r)) byRoom.set(r, []);
        byRoom.get(r).push(cur);
      }
    }
    let id = -1, best = 0;
    for (const [r, list] of byRoom) if (list.length > best) { best = list.length; id = r; }
    const R = roomList[id];
    if (!R) return null;
    const R2 = Object.assign({}, R);
    for (const cur of byRoom.get(id)) R2.wallTierSum += tableTier(WP, c) - tableTier(WP, cur);
    refreshRoomDerived(R2);
    const m = minuteArg(minute);
    const acc = roomAcc(id, null, null);
    const before = finishScore(R, acc, m, false).score, after = finishScore(R2, acc, m, false).score;
    return { before: before, after: after, delta: after - before, room: id, indoor: R2.indoor };
  }

  // ------------------------------------------------------------------ warnings (BB-3)
  // Hypothetical evaluation: a placement or a wall drag is applied to scratch copies of the
  // occupancy / edge arrays, then compared with the current state. Nothing is ever refused here;
  // the UI shows the returned pt-BR strings as an amber tip.

  // orthogonal components of free tiles on explicit arrays (walls/windows block, doors pass)
  function compsInto(hE, vE, blk, out) {
    out.fill(-1);
    const W1 = W + 1;
    let next = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (blk[s0] || out[s0] !== -1) continue;
      let head = 0, tail = 0;
      queueBuf[tail++] = s0; out[s0] = next;
      while (head < tail) {
        const i = queueBuf[head++];
        const x = xOf[i], y = yOf[i];
        let e, nb;
        if (y > 0) { e = hE[y * W + x]; if (e === 0 || e === 2) { nb = i - W; if (!blk[nb] && out[nb] === -1) { out[nb] = next; queueBuf[tail++] = nb; } } }
        if (x < W - 1) { e = vE[y * W1 + x + 1]; if (e === 0 || e === 2) { nb = i + 1; if (!blk[nb] && out[nb] === -1) { out[nb] = next; queueBuf[tail++] = nb; } } }
        if (y < H - 1) { e = hE[(y + 1) * W + x]; if (e === 0 || e === 2) { nb = i + W; if (!blk[nb] && out[nb] === -1) { out[nb] = next; queueBuf[tail++] = nb; } } }
        if (x > 0) { e = vE[y * W1 + x]; if (e === 0 || e === 2) { nb = i - 1; if (!blk[nb] && out[nb] === -1) { out[nb] = next; queueBuf[tail++] = nb; } } }
      }
      next++;
    }
    return next;
  }

  // For every "before" component, the "after" component that keeps the way out: the one reaching
  // the street (bottom lot row, open to the south), else any open lot border, else the largest.
  function mainParts(nAfter, blk, hE, vE) {
    const size = new Int32Array(nAfter), street = new Int32Array(nAfter), border = new Int32Array(nAfter);
    const W1 = W + 1;
    const open = (e) => e === 0 || e === 2;
    for (let i = 0; i < N; i++) {
      if (blk[i]) continue;
      const a = hypComp[i];
      if (a < 0) continue;
      size[a]++;
      const x = xOf[i], y = yOf[i];
      if (y === H - 1 && open(hE[H * W + x])) street[a]++;
      else if ((x === 0 && open(vE[y * W1])) || (x === W - 1 && open(vE[y * W1 + W])) || (y === 0 && open(hE[x]))) border[a]++;
    }
    const rank = (a) => (street[a] > 0 ? 2 : border[a] > 0 ? 1 : 0);
    const main = new Int32Array(mMax(1, compCount)).fill(-1);
    for (let i = 0; i < N; i++) {
      if (blk[i]) continue;
      const c = comp[i], a = hypComp[i];
      if (c < 0 || a < 0) continue;
      const b = main[c];
      if (b < 0 || rank(a) > rank(b) || (rank(a) === rank(b) && (size[a] > size[b] || (size[a] === size[b] && a < b)))) main[c] = a;
    }
    return { main: main, street: street };
  }

  // tiles from which a character can use the given slots under `env` ({ blk, hE, vE, room })
  function accessTiles(slots, r, env) {
    const out = [];
    let objRoomId = -1;
    for (let ty = r.y; ty < r.y + r.h && objRoomId < 0; ty++) {
      for (let tx = r.x; tx < r.x + r.w; tx++) if (inB(tx, ty)) { objRoomId = env.room[ty * W + tx]; break; }
    }
    const inRect = (tx, ty) => tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;
    for (const s of slots) {
      const tx = mRound(s.x), ty = mRound(s.y);
      if (!inB(tx, ty)) continue;
      if (s.on) {
        for (let d = 0; d < 4; d++) {
          const nx = tx + DX[d], ny = ty + DY[d];
          if (!inB(nx, ny) || inRect(nx, ny)) continue;
          const ni = ny * W + nx;
          if (env.blk[ni]) continue;
          const e = edgeTypeArr(env.hE, env.vE, tx, ty, nx, ny);
          if (e === 0 || e === 2) out.push(ni);
        }
      } else {
        const i = ty * W + tx;
        if (env.blk[i]) continue;
        if (objRoomId >= 0 && env.room[i] !== objRoomId) continue;
        let adj = 0, ok = 0;
        for (let d = 0; d < 4; d++) {
          const nx = tx + DX[d], ny = ty + DY[d];
          if (!inRect(nx, ny)) continue;
          adj++;
          const e = edgeTypeArr(env.hE, env.vE, tx, ty, nx, ny);
          if (e === 0 || e === 2) ok++;
        }
        if (adj && !ok) continue;
        out.push(i);
      }
    }
    return out;
  }

  function firstName(s) {
    const n = String((s && s.name) || '').trim().split(/\s+/)[0];
    return n || 'alguém';
  }
  function trappedMsg(list) {
    const allF = list.every((s) => s && s.gender === 'f');
    const names = list.slice(0, 3).map(firstName);
    if (list.length === 1) return 'Deixa ' + names[0] + (allF ? ' presa' : ' preso');
    const shown = list.length > 3 ? names.join(', ') + ' e mais ' + (list.length - 3)
      : names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
    return 'Deixa ' + shown + (allF ? ' presas' : ' presos');
  }

  /**
   * env: { blk, hE, vE, room, rooms: [{indoor, doors}], killed: [{rooms:[r1,r2]}], ignoreId,
   *        newSlots, newRect, wall } — the hypothetical state. Returns pt-BR warning strings.
   */
  function hypWarnings(env) {
    ensureComps();
    const blk = env.blk, room = env.room, rinfo = env.rooms;
    const nAfter = compsInto(env.hE, env.vE, blk, hypComp);
    const mp = mainParts(nAfter, blk, env.hE, env.vE);
    const main = mp.main, street = mp.street;
    const cut = (i) => !blk[i] && comp[i] >= 0 && hypComp[i] !== main[comp[i]];
    const out = [];
    const push = (m) => { if (out.indexOf(m) < 0) out.push(m); };
    // 1. rooms left without a way out
    const nR = rinfo.length;
    const freeCnt = new Int32Array(nR), cutCnt = new Int32Array(nR), grp = new Int32Array(nR).fill(-1);
    let indoorToStreet = false;
    for (let i = 0; i < N; i++) {
      if (blk[i]) continue;
      const r = room[i];
      if (r < 0 || r >= nR) continue;
      if (rinfo[r].indoor && hypComp[i] >= 0 && street[hypComp[i]] > 0) indoorToStreet = true;
      if (comp[i] < 0) continue;
      freeCnt[r]++;
      if (cut(i)) { cutCnt[r]++; if (grp[r] < 0) grp[r] = hypComp[i]; }
    }
    const isolated = new Uint8Array(nR);
    const groups = new Map();
    for (let r = 0; r < nR; r++) {
      if (!rinfo[r].indoor || !freeCnt[r] || cutCnt[r] !== freeCnt[r]) continue;
      isolated[r] = 1;
      if (!groups.has(grp[r])) groups.set(grp[r], []);
      groups.get(grp[r]).push(r);
    }
    for (const list of groups.values()) {
      if (list.length >= 2) {
        push(!indoorToStreet ? 'Bloqueia a única saída da casa' : 'Deixa ' + list.length + ' cômodos sem saída');
      } else {
        const r = list[0];
        if (env.killed.some((k) => k.rooms.indexOf(r) >= 0)) push('Bloqueia a única porta do cômodo');
        else if (!rinfo[r].doors) push('O cômodo fica sem porta');
        else push('Deixa um cômodo sem saída');
      }
    }
    // 2. a door is blocked / replaced without sealing anything
    if (!groups.size && env.killed.length) push(env.wall ? 'Fecha uma porta' : 'Bloqueia uma porta');
    // 3. characters sealed in
    const trapped = [];
    for (const s of (isArr(S.sims) ? S.sims : [])) {
      if (!s || typeof s !== 'object' || s.hidden) continue;
      const tx = tileOf(s.x), ty = tileOf(s.y);
      if (inB(tx, ty) && cut(ty * W + tx)) trapped.push(s);
    }
    if (trapped.length) push(trappedMsg(trapped));
    // 4. existing objects losing their last usable spot
    const env0 = { blk: blocked, hE: hEdge, vE: vEdge, room: roomGrid };
    const lost = [];
    for (const o of objList) {
      if (!o || typeof o !== 'object') continue;
      if (env.ignoreId != null && sameId(o.id, env.ignoreId)) continue;
      const def = defOf(o.type);
      if (!def || !isArr(def.interactions) || !def.interactions.length) continue;
      const r = objRect(o);
      if (!isFin(r.x) || !isFin(r.y)) continue;
      const slots = computeSlots(o.type, r.x, r.y, r.rot);
      if (!slots.length) continue;
      const before = accessTiles(slots, r, env0);
      if (!before.length) continue;
      if (accessTiles(slots, r, env).some((i) => !cut(i))) continue;
      if (before.every((i) => room[i] >= 0 && isolated[room[i]])) continue;   // covered by a room message
      const name = def.name || String(o.type);
      if (lost.indexOf(name) < 0) lost.push(name);
    }
    const shown = lost.length <= 4 ? lost.length : 3;   // never "mais 1 objeto": list it instead
    for (let k = 0; k < shown; k++) push('Bloqueia o acesso a ' + lost[k]);
    if (lost.length > shown) push('Bloqueia o acesso a mais ' + (lost.length - shown) + ' objetos');
    // 5. the placed object itself cannot be reached (and no room message already explains why)
    if (env.newSlots && env.newSlots.length) {
      const acc = accessTiles(env.newSlots, env.newRect, env);
      if (!acc.some((i) => !cut(i)) && !acc.every((i) => room[i] >= 0 && isolated[room[i]])) push('Não dá para chegar até este objeto');
    }
    return out;
  }

  /** Non-blocking warnings for placing (or moving, with ignoreId) an object: pt-BR strings such as
   *  "Bloqueia a única porta do cômodo", "Bloqueia o acesso a Geladeira simples",
   *  "Bloqueia a única saída da casa", "Deixa Rita presa". [] when nothing is affected or when
   *  canPlace refuses the spot anyway. */
  function placementWarnings(type, x, y, rot, ignoreId) {
    if (!S) return [];
    ensureRooms();
    const def = defOf(type);
    if (!def || layerOf(def, type) !== L_BLOCK) return [];
    x = toInt(x); y = toInt(y); rot = normRot(rot);
    if (!isFin(x) || !isFin(y)) return [];
    if (!canPlace(type, x, y, rot, ignoreId).ok) return [];
    const sz = sizeOf(def, rot);
    hypBlk.set(blocked);
    if (ignoreId != null) {
      const mo = objectById(ignoreId);
      const mr = mo ? objRect(mo) : null;
      if (mr && mr.layer === L_BLOCK && isFin(mr.x) && isFin(mr.y)) {
        for (let ty = mr.y; ty < mr.y + mr.h; ty++) for (let tx = mr.x; tx < mr.x + mr.w; tx++) if (inB(tx, ty)) hypBlk[ty * W + tx] = 0;
        for (const o of objList) {   // tiles another blocker also covers stay blocked
          if (!o || typeof o !== 'object' || o === mo || sameId(o.id, ignoreId)) continue;
          const r = objRect(o);
          if (r.layer !== L_BLOCK || !isFin(r.x) || !isFin(r.y)) continue;
          if (r.x >= mr.x + mr.w || r.x + r.w <= mr.x || r.y >= mr.y + mr.h || r.y + r.h <= mr.y) continue;
          for (let ty = mMax(r.y, mr.y); ty < mMin(r.y + r.h, mr.y + mr.h); ty++) {
            for (let tx = mMax(r.x, mr.x); tx < mMin(r.x + r.w, mr.x + mr.w); tx++) if (inB(tx, ty)) hypBlk[ty * W + tx] = 1;
          }
        }
      }
    }
    const killed = [];
    const inNew = (tx, ty) => tx >= x && ty >= y && tx < x + sz.w && ty < y + sz.h;
    for (let ty = y; ty < y + sz.h; ty++) {
      for (let tx = x; tx < x + sz.w; tx++) {
        const i = ty * W + tx;
        hypBlk[i] = 1;
        if (blocked[i]) continue;
        for (let d = 0; d < 4; d++) {
          const nx = tx + DX[d], ny = ty + DY[d];
          if (!inB(nx, ny) || inNew(nx, ny)) continue;
          const ni = ny * W + nx;
          if (edgeTypeBetween(tx, ty, nx, ny) === 2 && !blocked[ni]) killed.push({ rooms: [roomGrid[i], roomGrid[ni]] });
        }
      }
    }
    return hypWarnings({
      blk: hypBlk, hE: hEdge, vE: vEdge, room: roomGrid, rooms: roomList, killed: killed, ignoreId: ignoreId,
      newSlots: computeSlots(type, x, y, rot), newRect: { x: x, y: y, w: sz.w, h: sz.h }, wall: false,
    });
  }

  /** Non-blocking warnings for building walls (t 1, default) or windows (t 3) on `edgeKeys`
   *  (e.g. a wall drag): "Fecha uma porta", "Bloqueia a única porta do cômodo",
   *  "O cômodo fica sem porta", "Deixa Caio preso", "Bloqueia o acesso a …". Doors (t 2) and
   *  demolition (t 0) never block anything → []. */
  function wallWarnings(edgeKeys, t) {
    if (!S) return [];
    ensureRooms();
    t = t == null ? 1 : (mRound(+t) || 0);
    if (t !== 1 && t !== 3) return [];
    const keys = isArr(edgeKeys) ? edgeKeys : [edgeKeys];
    const hE = hEdge.slice(), vE = vEdge.slice();
    const killedEdges = [];
    let changed = 0;
    for (const k of keys) {
      const p = parseKey(k);
      if (!p || !validEdge(p.kind, p.x, p.y)) continue;
      const i = edgeIndex(p.kind, p.x, p.y);
      const arr = p.kind === 'h' ? hE : vE;
      if (arr[i] === t) continue;
      if (arr[i] === 2) killedEdges.push(p);
      arr[i] = t;
      changed++;
    }
    if (!changed) return [];
    const regions = floodRegions(hE, vE, hypRoom, false, M.data && M.data.FLOORS);
    const rinfo = regions.map((g) => ({ indoor: regionIndoor(g.leak, g.touches, g.grass, g.area), doors: 0 }));
    const countDoor = (ra, rb) => { if (ra >= 0) rinfo[ra].doors++; if (rb >= 0 && rb !== ra) rinfo[rb].doors++; };
    const W1 = W + 1;
    for (let y = 0; y <= H; y++) for (let x = 0; x < W; x++) {
      if (hE[y * W + x] === 2) countDoor(y > 0 ? hypRoom[(y - 1) * W + x] : -1, y < H ? hypRoom[y * W + x] : -1);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x <= W; x++) {
      if (vE[y * W1 + x] === 2) countDoor(x > 0 ? hypRoom[y * W + x - 1] : -1, x < W ? hypRoom[y * W + x] : -1);
    }
    const killed = killedEdges.map((p) => {
      const rooms = [];
      for (const side of ['A', 'B']) {
        const tt = sideTile(p.kind, p.x, p.y, side);
        if (inB(tt.x, tt.y)) rooms.push(hypRoom[tt.y * W + tt.x]);
      }
      return { rooms: rooms };
    });
    return hypWarnings({ blk: blocked, hE: hE, vE: vE, room: hypRoom, rooms: rinfo, killed: killed, ignoreId: null, newSlots: null, newRect: null, wall: true });
  }

  // ------------------------------------------------------------------ edge / build helpers
  function edgeBetween(x1, y1, x2, y2) {
    ensure();
    x1 = toInt(x1); y1 = toInt(y1); x2 = toInt(x2); y2 = toInt(y2);
    const dx = x2 - x1, dy = y2 - y1;
    let k = null;
    if (dx === 0 && dy === 1) k = ['h', x1, y2];
    else if (dx === 0 && dy === -1) k = ['h', x1, y1];
    else if (dy === 0 && dx === 1) k = ['v', x2, y1];
    else if (dy === 0 && dx === -1) k = ['v', x1, y1];
    if (!k || !validEdge(k[0], k[1], k[2])) return null;
    return keyOf(k[0], k[1], k[2]);
  }

  /** The two tiles on either side of an edge: [top/left, bottom/right] (may be out of bounds). */
  function edgeTiles(edgeKey) {
    const p = parseKey(edgeKey);
    if (!p) return null;
    return p.kind === 'h' ? [{ x: p.x, y: p.y - 1 }, { x: p.x, y: p.y }] : [{ x: p.x - 1, y: p.y }, { x: p.x, y: p.y }];
  }
  function isValidEdge(edgeKey) { ensure(); const p = parseKey(edgeKey); return !!p && validEdge(p.kind, p.x, p.y); }

  function rectNorm(x1, y1, x2, y2) {
    x1 = toInt(x1); y1 = toInt(y1); x2 = toInt(x2); y2 = toInt(y2);
    if (![x1, y1, x2, y2].every(isFinite)) return null;
    let x0 = mMax(0, mMin(x1, x2)), xe = mMin(W - 1, mMax(x1, x2));
    let y0 = mMax(0, mMin(y1, y2)), ye = mMin(H - 1, mMax(y1, y2));
    if (x0 > xe || y0 > ye) return null;
    return { x0: x0, y0: y0, x1: xe, y1: ye };
  }

  /** Tiles of the inclusive rectangle between two tiles (any order), clamped to the lot. */
  function tilesInRect(x1, y1, x2, y2) {
    ensure();
    const r = rectNorm(x1, y1, x2, y2);
    if (!r) return [];
    const out = [];
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) out.push({ x: x, y: y });
    return out;
  }

  /** Perimeter edge keys of the inclusive tile rectangle (clockwise: top, right, bottom, left). */
  function edgesOfRect(x1, y1, x2, y2) {
    ensure();
    const r = rectNorm(x1, y1, x2, y2);
    if (!r) return [];
    const out = [];
    for (let x = r.x0; x <= r.x1; x++) out.push(keyOf('h', x, r.y0));
    for (let y = r.y0; y <= r.y1; y++) out.push(keyOf('v', r.x1 + 1, y));
    for (let x = r.x1; x >= r.x0; x--) out.push(keyOf('h', x, r.y1 + 1));
    for (let y = r.y1; y >= r.y0; y--) out.push(keyOf('v', r.x0, y));
    return out;
  }

  /** Edge keys for a straight wall drag between two CORNER points (vertex coords 0..w, 0..h;
   *  floats are rounded to the nearest corner). Snaps to the dominant axis; ordered from start. */
  function wallSegmentsForDrag(x1, y1, x2, y2) {
    ensure();
    x1 = toInt(x1); y1 = toInt(y1); x2 = toInt(x2); y2 = toInt(y2);
    if (![x1, y1, x2, y2].every(isFinite) || N === 0) return [];
    const cl = (v, max) => mMax(0, mMin(max, v));
    x1 = cl(x1, W); x2 = cl(x2, W); y1 = cl(y1, H); y2 = cl(y2, H);
    const out = [];
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) return out;
    if (mAbs(dx) >= mAbs(dy)) {
      const st = dx > 0 ? 1 : -1;
      for (let x = x1; x !== x2; x += st) {
        const ex = st > 0 ? x : x - 1;
        if (validEdge('h', ex, y1)) out.push(keyOf('h', ex, y1));
      }
    } else {
      const st = dy > 0 ? 1 : -1;
      for (let y = y1; y !== y2; y += st) {
        const ey = st > 0 ? y : y - 1;
        if (validEdge('v', x1, ey)) out.push(keyOf('v', x1, ey));
      }
    }
    return out;
  }

  function tileOfPos(x, y) { return { x: tileOf(x), y: tileOf(y) }; }

  // ------------------------------------------------------------------ public API
  M.world = {
    init: init,
    rebuild: rebuild,
    get version() { return version; },
    size: size,
    inBounds: inBounds,
    tileOfPos: tileOfPos,
    // walls / floors
    getWall: getWall,
    setWall: setWall,
    setWallColor: setWallColor,
    wallColor: wallColor,
    edgeSideFacing: edgeSideFacing,
    edgeSideTile: edgeSideTile,
    canBuildWall: canBuildWall,
    objectsOnEdge: objectsOnEdge,
    edgeBlocked: edgeBlocked,
    edgeBetween: edgeBetween,
    edgeTiles: edgeTiles,
    isValidEdge: isValidEdge,
    edgesOfRect: edgesOfRect,
    wallSegmentsForDrag: wallSegmentsForDrag,
    tilesInRect: tilesInRect,
    getFloor: getFloor,
    setFloor: setFloor,
    // objects
    footprint: footprint,
    rotatedSize: rotatedSize,
    rotatePoint: rotatePoint,
    rotateTile: rotateTile,
    frontFacing: frontFacing,
    modelTransform: modelTransform,
    wallEdgeBehind: wallEdgeBehind,
    canPlace: canPlace,
    objectAt: objectAt,
    objectsAt: objectsAt,
    itemAt: itemOn,
    objectById: objectById,
    slotsFor: slotsFor,
    // walking
    isWalkable: isWalkable,
    findPath: findPath,
    nearestReachable: nearestReachable,
    nearestWalkable: nearestWalkable,
    smoothPath: smoothPath,
    // rooms
    roomAt: roomAt,
    rooms: rooms,
    isIndoor: isIndoor,
    roomScore: roomScore,
    roomBreakdown: roomBreakdown,
    isDaytime: isDaytime,
    roomEdges: roomEdges,
    roomTiles: roomTiles,
    roomScoreWith: roomScoreWith,
    roomScoreWithFloor: roomScoreWithFloor,
    roomScoreWithWallpaper: roomScoreWithWallpaper,
    // warnings (non-blocking)
    placementWarnings: placementWarnings,
    wallWarnings: wallWarnings,
  };
})(window.M = window.M || {});
