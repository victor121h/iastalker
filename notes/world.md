# M.world — notes for other modules

File: `js/world.js`. Pure logic (no DOM, no THREE). Implements the ARCHITECTURE.md API, plus the
additions listed below. Tests: `node tools/world_test.mjs` (629 checks, includes a fuzz test against
a reference Dijkstra, an incremental-vs-full room cache fuzz and an integration pass over the real
`data.js` catalog). QA repro re-check: `node tools/fix_world_repro.mjs`. Perf (CR-6, old vs new
world.js on the same engine): `node tools/fix_world_perf.mjs [--scenario big|starter]`. In-page:
`node tools/integrate_check.mjs --clear --nohelp --eval tools/fix_world_page.js`. Browser demo:
`node tools/world_check.mjs --shot out.png` (renders `tools/world_check.html`).

## QA round 2 (CONTRACT_V2) — what changed
- **§1 wallpaper per side** (VIS-2 / BB-7): wall entries are `{ t, c, cA?, cB? }`; new functions
  `wallColor`, `edgeSideFacing`, `edgeSideTile`, `roomEdges`, `roomTiles`, `setWallColor`, and a
  `side` argument on `setWall`. Room scores use the side facing into each room.
- **§2**: `placementWarnings`, `wallWarnings` (BB-3), `roomScoreWith`, `roomScoreWithFloor`,
  `roomScoreWithWallpaper` (all implemented, none returns null for valid input).
- **BB-8**: an enclosed region is indoor even without a floor (see Rooms). `rooms()` /
  `roomBreakdown()` expose `enclosed` (no open lot-border edge) — render can cut away walls of
  enclosed regions (`M.world.isIndoor(x, y)` or `rooms()[id].enclosed`).
- **CR-6**: every query is O(1) again (no per-call object hashing); `rebuild()` after object changes
  no longer recomputes edges/rooms; `roomScore` only visits the room's objects. Numbers below.

## Lifecycle / caches (CR-6)
- `init(state)`: attaches the state, repairs missing `lot.floors` / `lot.walls` / `objects`, builds caches.
- `rebuild()`: always rebuilds occupancy; recomputes edges/rooms **only if `lot.walls` / `lot.floors`
  actually changed** (order-independent content hash) — call it freely after every object change.
- Staleness detection (`ensure()`, run by every query, O(1)):
  - immediately: replaced `state.lot` / `lot.walls` / `lot.floors` / `state.objects`, a resized
    objects array (push / splice / filter), lot size change;
  - at the next **epoch**: objects moved / rotated / retyped **in place**, in-place edits of
    `lot.walls[key]` (incl. `cA`/`cB`) or `lot.floors[i]`. An epoch ends when the sim time
    (`state.time`) changes (every engine step), at the next microtask (end of the current event /
    frame handler), or after 512 queries; wall/floor content is checked every 4th epoch and at
    every microtask boundary. **Need it now? call `rebuild()`** (or use `setWall` / `setWallColor`
    / `setFloor`, which update the caches immediately and incrementally).
- `version` (getter): increments on every change; handy for render/UI cache invalidation.
- Measured (Node vm, `tools/fix_world_perf.mjs`, same engine snapshot):
  | scenario | world | isWalkable | roomAt | rebuild | rebuild + rooms | engine ms / sim-day | worst step |
  |---|---|---|---|---|---|---|---|
  | 48×48, 20 rooms, 154 objects, 4 residents | old | 12.3 µs | 13.0 µs | 0.55 ms | 1.87 ms | 652 | 23.7 ms |
  | | new | 0.09–0.21 µs | 0.07–0.17 µs | 0.10 ms | 0.09 ms | 314–432 | 7–12 ms |
  | QA starter + 150 objects (180), 4 residents | old | 14.4 µs | 14.7 µs | 0.18 ms | 0.44 ms | 1752 | 39.1 ms |
  | | new | 0.08 µs | 0.07 µs | 0.04 ms | 0.04 ms | ~1115 | 15.6 ms |
  The rest of the engine time is in engine.js (autonomy/slots); world.js is < 10 % of the profile.
  QA script `tools/qa_cr_scale.mjs` on the live files (this world.js + the current engine.js):
  182 objects 7699 → 1180 ms / sim-day (worst step 31.8 → 14.8 ms); 239 objects 14080 → 1704 ms
  (61.9 → 18.6 ms).
  Note for module authors running in a Node `vm` context: every global lookup (`Math.x`,
  `isFinite`, `Object`…) goes through a slow interceptor there; world.js caches them in locals.

## Conventions
- Path points and slot `x,y` are **tile centres in character coords**: world position = `(x + 0.5, 0, y + 0.5)`.
  The tile under a character at float `(x, y)` is `(round(x), round(y))` (`tileOfPos(x, y)`).
- Rotation (exact math in the header of world.js): one step maps a direction `(vx, vy) -> (-vy, vx)`;
  a local tile `(dx,dy)` of a rot-0 `w×h` type maps to rot1 `(h-1-dy, dx)`, rot2 `(w-1-dx, h-1-dy)`,
  rot3 `(dy, w-1-dx)`, plus `(obj.x, obj.y)`. Facing: `world = slotFacing - rot·π/2`.
  Object front facing: `frontFacing(rot)` = 0, 3π/2, π, π/2.
- **Render**: `modelTransform(obj)` → `{ x, z, rotY }`. Put the rot-0 model (origin at its min corner)
  at `mesh.position.set(x, 0, z)` and `mesh.rotation.y = rotY` (= −rot·π/2). It lands exactly on the
  footprint (verified against THREE's rotation convention in the tests).
- Wall-mounted objects (`wall: true`) hang on the edge behind their tile: `wallEdgeBehind(x, y, rot)`
  → rot0 `h,x,y`, rot1 `v,x+1,y`, rot2 `h,x,y+1`, rot3 `v,x,y` (only solid walls `t=1` qualify).

## Slots — `slotsFor(obj)` or `slotsFor(type, x, y, rot)`
Returns one entry per catalog slot, **same order/index as `def.slots`** (never filtered), each a copy of
the slot def plus:
`{ x, y` (routing tile, world), `facing` (world radians), `on, index, objId,`
`px, py` (exact pose position = tile + rotated `ox/oy` offset — snap the character here after arriving),
`usable }` (false if the tile is off the lot, or for a standing slot: in another room than the object,
or cut off from the adjacent footprint tile by a wall/window).
Defs with interactions but no slots get synthesized slots: `approach: 'adjacent'` → every tile
orthogonally around the footprint (front row first); wall objects → their own tile; noBlock items →
own tile + around; blockers → front row.

## Pathfinding
- `findPath(fromX, fromY, toX, toY, opts)` → `[{x,y}]` (excl. start, incl. destination; `[]` if already
  there; `null` if unreachable). The array has a `.cost` property (tiles; diagonal = √2).
  `opts`: `allowObjId` (id or array — that object's tiles may be entered/crossed), `allowTiles: [{x,y}]`,
  `blockTiles: [{x,y}]` (e.g. tiles of other characters), `maxNodes`, `smooth: true` (string-pulled
  subset of the points, see `smoothPath`). Coordinates are rounded and clamped to the lot.
- Rules: 8 directions; doors pass, walls/windows block; a diagonal step needs the source, target and
  both orthogonal neighbours to be free of blocking objects **and no wall entry at all (doors included)
  touching the crossed corner** (no corner cutting, doors always crossed straight). Tiles that are only
  enterable thanks to `allowObjId` / `allowTiles` / `on` candidates are entered and left orthogonally.
  The start tile is always allowed (getting up from a chair/bed). Unreachable targets fail in O(1)
  (connected-component precheck).
- **NEW** `nearestReachable(fromX, fromY, candidates, opts)` → `{ candidate, index, x, y, path, cost }`
  or `null`. Multi-goal A* returning the candidate with the cheapest path. Typical use:
  `nearestReachable(sim.x, sim.y, M.world.slotsFor(obj).filter(s => !reserved(s)))`.
  Candidates with `on: true` (or `allowBlocked: true`) may be entered even though their object blocks
  the tile (as the final, orthogonal step; never walked through). Candidates with `usable === false`
  are skipped. Optional `candidate.penalty` (tiles) is added to the cost when comparing.
  If the character already stands on a candidate it is returned with `path: []`.
- **NEW** `nearestWalkable(x, y, opts)` → nearest free `{x,y}` (same region first) — use it to push a
  character out of a tile that became blocked (object placed on them, wall built).
- **NEW** `smoothPath(fromX, fromY, path)` → subset of the points where straight walking (0.3 tile
  clearance) is clear; never smooths across doors.
- `isWalkable(x, y, allowObjId)`, `edgeBlocked(x1,y1,x2,y2)` (adjacent tiles; diagonal pairs use the
  corner rule; non-adjacent/out-of-bounds → true).
- Speed (Node, 64×64 lot with 64 walled rooms + 850 objects): avg 0.1 ms, p95 0.3 ms per path;
  24×20 corner to corner ≈ 0.06 ms.

## Placement — `canPlace(type, x, y, rot, ignoreId)` → `{ ok, reason, code }`
`reason` is pt-BR text for the UI; `code` ∈ `ok | bounds | wall | needWall | wallTaken | overlap |
floorItem | surface | access | unknown | nostate`.
Layers: blockers (furniture); **items** (noBlock non-wall: meal, dirty_plate, puddle, newspaper,
carpool) — at most one per tile, only on free floor or on a `surface` blocker; **floor** (noBlock
decor = rugs) — under anything, not over another rug; **wall** (wall:true + noBlock) — need the solid wall
behind, one per tile side, may hang over furniture. Footprints may not contain an internal wall edge.
`access`: a blocking object with slots needs at least one slot that is usable (on-slot with a free,
wall-free neighbour outside the footprint; standing slot free, on the lot and not behind a wall).
Note: objects on the south lot edge must face north (rot 2), otherwise their front slots fall off the
lot (relevant for mailbox/carpool placement).
- **NEW** `canBuildWall(edgeKey, t)` → `{ ok, reason, code: ok|bounds|type|object|mounted, objects? }`:
  walls may not cut through a footprint; doors/windows/demolition refused where something hangs.
- **NEW** `objectsOnEdge(edgeKey)` → wall-mounted objects on that edge (either side).
- `objectAt(x, y)` → blocker first, then item, wall-mounted, rug. **NEW** `objectsAt(x, y)` → all, top-down
  (item, blocker, wall-mounted, rug). **NEW** `itemAt(x, y)` → the meal/plate/puddle on that tile.
  **NEW** `objectById(id)`.

## Walls, floors, build helpers
`getWall(key)` (the live entry `{t, c, cA?, cB?}` or null), `getFloor(x,y)`, `setFloor(x, y, idx)`
(validates against `M.data.FLOORS`), `edgeBetween`, `edgeTiles(key)` (the two tiles beside an edge:
`[side A tile, side B tile]`), `isValidEdge(key)`, `edgesOfRect(x1,y1,x2,y2)` (perimeter of an
inclusive tile rect, clockwise), `tilesInRect(x1,y1,x2,y2)`, `wallSegmentsForDrag(cx1,cy1,cx2,cy2)`
(**corner/vertex coords** 0..w / 0..h, floats rounded; snaps to the dominant axis; ordered from start).

### Wallpaper per wall side (CONTRACT_V2 §1)
- Entry `{ t, c, cA?, cB? }`. **Side A** of `"h,x,y"` faces tile `(x, y-1)` (north), side B faces
  `(x, y)` (south); side A of `"v,x,y"` faces `(x-1, y)` (west), side B faces `(x, y)` (east).
  Missing `cA`/`cB` fall back to `c` (old saves work unchanged). world.js keeps entries normalised:
  a side equal to `c` is not stored, and `cA === cB` collapses into `c`.
- `wallColor(key, side)` → wallpaper index of that side (`'A'`/`'B'`; anything else → `c`); `null`
  when the edge has no wall/door/window. Reads the live entry.
- `edgeSideFacing(key, x, y)` → `'A' | 'B' | null` — the side that faces tile (x,y) (null if the
  tile is not beside the edge). `edgeSideTile(key, side)` → `{x, y}` faced by that side.
- `setWall(key, t, c, side)` — t 1/2/3 sets, 0 removes. Colours: `c` omitted keeps both sides;
  `side 'A'|'B'` paints only that side; `side 'both'` paints both (clears cA/cB). **Legacy 3-argument
  calls**: a `c` different from the stored `c` repaints both sides, the same `c` keeps the per-side
  colours (so `setWall(key, newType, oldC)` — what `buildWall` does when converting a wall into a
  door — never loses a side's paint). New walls store `c` only.
- **`setWallColor(key, idx, side = 'both')`** → bool: paints one side / both sides of an existing
  entry (validates `idx` against `M.data.WALLPAPERS`), no money. **Engine**: use it in
  `paintWall(edgeKey, idx, side)`; charge per side whose `wallColor(key, side)` differs.
- `roomEdges(x, y)` → `[{ key, side, t }]` for every wall/door/window edge bounding the room that
  contains (x,y), `side` = the face looking INTO that room. A free-standing wall inside a room is
  listed twice (both faces). Works for outdoor regions too (= the house facades seen from the yard).
  **Engine** `paintRoomWalls(x, y, idx)`: `for (const e of roomEdges(x, y)) setWallColor(e.key, idx, e.side)`.
- `roomTiles(x, y)` → fresh `[{x,y}]` of the room containing (x,y) (for `paintRoomFloor`, together
  with `isIndoor(x, y)`).

## Rooms
- `roomAt(x, y)` → id for **every** connected region, outdoor ones included (−1 only off-lot);
  `rooms(minute?)` → `[{ id, tiles, indoor, area, windows, doors, score }]` (`tiles` arrays are shared
  caches — do not mutate); **NEW** `isIndoor(x, y)`, `roomBreakdown(x, y, minute?)` (score + parts
  `[{key,label,value}]` in pt-BR for a UI tooltip), `isDaytime(minute?)`.
- Regions are bounded by any wall entry (doors and windows separate rooms). **Indoor rule (BB-8)**:
  a region is outdoor only when it touches the lot border — when it leaks off the lot through a
  border edge **without** a wall, or when it is walled along the lot border and grass is a strict
  majority of its floor (a yard fenced with walls on the lot border). Any region enclosed by walls
  away from the lot border is **indoor, floored or not** (a freshly walled room counts immediately).
  A floored room walled along the lot border is indoor. `enclosed` = no open lot-border edge.
- `roomScore(x, y, minute?)`: `round(sum / max(1, tiles/12) + floorBonus + wallBonus) − 10` indoors,
  `round(sum / 30) − 15` outdoors, clamped −100..100. `sum` = per-object impact from
  `M.data.roomImpact(o, false)` (fallback: canonical table: decor 5×room rating, dirty plate −5 / spoiled −15,
  puddle −15, spoiled meal −15, broken −10, dirty plumbing −5 at `dirty >= M.data.DIRT.visible`
  (500 without data), dead plant −15) + `o.unmade` −5 + light: lit lamps at night +10 each (cap +30),
  windows on the room boundary +5 each by day (06:00–17:59), dark room at night (no lit lamp) −20
  (indoors). Constants come from `M.data.ROOM_IMPACT` when present.
  A lamp is lit unless `broken`, `lightOff`, `on === false` or `lit === false`.
  Floor/wallpaper bonus (indoor, documented addition): 2 × average quality tier of the room's floor
  tiles and 2 × average tier of its wall sides **facing into the room** (`cA`/`cB`), tier = entry
  `room` value (0..3) from FLOORS/WALLPAPERS (fallback: price tier). Wood floor (+2) … marble (+6).
  Painting the outside or the neighbour's side of a wall never changes this room's score.
- `rooms()` entries: `{ id, tiles, indoor, enclosed, area, windows, doors, score }`;
  `roomBreakdown()` also has `enclosed` and `doors`. Room tile arrays now survive object-only
  changes (same array identity until walls/floors change) — still do not mutate them.

## Ambiente previews (CONTRACT_V2 §2) — for the placement / paint tips
All return `{ before, after, delta, room, indoor }` (scores like `roomScore`, time of day included:
`minute` optional, default = now) or `null` for invalid input.
- `roomScoreWith(type, x, y, rot, ignoreId?, minute?)` — the room under the footprint with a
  hypothetical object added (`ignoreId`: the object being moved is left out). UI:
  "Ambiente +N neste cômodo" with `N = delta`.
- `roomScoreWithFloor(tiles, floorIdx, minute?)` — `tiles` `[{x,y}]` (a drag or `roomTiles`); uses
  the room holding most of them; `indoor` reports a walled border yard turning indoor when floored.
- `roomScoreWithWallpaper(edgeSides, idx, minute?)` — `edgeSides` `[{key, side}]` (e.g.
  `roomEdges(x, y)` or one clicked face) or plain keys (= both sides); uses the room faced by most.

## Warnings (BB-3, CONTRACT_V2 §2) — non-blocking, pt-BR, most important first
- `placementWarnings(type, x, y, rot, ignoreId?)` → `string[]`. Only blocking furniture can warn;
  `[]` for rugs / wall items / small items and when `canPlace` refuses the spot anyway.
- `wallWarnings(edgeKeys, t = 1)` → `string[]` for building walls (t 1) or windows (t 3) on those
  edges (a drag, a room rectangle). Doors (t 2) and demolition (t 0) → `[]`.
- Method: the change is applied to scratch copies of occupancy/edges; connectivity is compared with
  the current state. The "way out" of each region is the part that still reaches the street (the
  bottom lot row, open to the south), else any open lot border, else the largest part.
- Messages (deduplicated, in this order):
  - `Bloqueia a única saída da casa` — no indoor room reaches the street any more (≥ 2 rooms cut off);
    `Deixa N cômodos sem saída` — several rooms cut off, others still reach the street;
  - `Bloqueia a única porta do cômodo` — one room cut off because its only usable door got blocked
    (furniture on a door tile, or a wall/window replacing the door);
    `O cômodo fica sem porta` — a newly closed room without any door (room tool / wall drag);
    `Deixa um cômodo sem saída` — a room cut off otherwise (e.g. the corridor to its door blocked);
  - `Bloqueia uma porta` (placement) / `Fecha uma porta` (walls) — a door blocked/replaced while
    everything stays reachable;
  - `Deixa Rita presa`, `Deixa Caio preso`, `Deixa Rita e Caio presos`, `Deixa Rita e Lia presas`,
    `Deixa Rita, Lia, Ana e mais 2 presos` — visible characters (`!hidden`) left without a way out
    (gender agreement from `sim.gender`);
  - `Bloqueia o acesso a Geladeira simples` — an existing object (with interactions) loses its last
    usable slot (slot tile blocked, cut by a wall, or cut off from the way out); up to 4 names, then
    `Bloqueia o acesso a mais N objetos`; objects inside a room already reported are not repeated;
  - `Não dá para chegar até este objeto` — the placed object's own slots end up cut off.
- Cost: ~0.2 ms on the 24×20 starter lot, < 1 ms on 64×64 with 300 objects (per call).
- Time: `minute` argument, else `M.engine.state.time.minute`, else the init state's time.

## Integration hints for the other modules (round 2)
- engine: `paintWall(key, idx, side)` → `setWallColor(key, idx, side)` (charge per side whose
  `wallColor` differs; `'both'` = 2 sides). `paintRoomWalls(x, y, idx)` → `roomEdges(x, y)` +
  `setWallColor(e.key, idx, e.side)`. `paintRoomFloor(x, y, idx)` → `isIndoor(x, y)` +
  `roomTiles(x, y)` + `setFloor`. `buildRoom` → `edgesOfRect` + `canBuildWall` per edge (skip edges
  where `getWall` is set). `restoreBuild(snap)` → assign the cloned `lot` / `objects` and call
  `M.world.rebuild()` (new identities are detected anyway). Old 3-argument `setWall` calls keep
  working (both sides).
- render: per-face colour = `M.world.wallColor(key, 'A')` for the north/west face and `'B'` for the
  south/east face (or read `e.cA ?? e.c` / `e.cB ?? e.c` from `lot.walls`). For cutaway (BB-8) use
  `M.world.isIndoor(x, y)` (enclosed rooms count even unfloored) or `rooms()[id].enclosed`.
- ui: show `placementWarnings(...)` / `wallWarnings(keys, t)` as an amber line in the tip (the
  first one or two strings); `roomScoreWith(...).delta` → "Ambiente +N neste cômodo";
  `edgeSideFacing(key, pickedTileX, pickedTileY)` gives the clicked face if `pickEdge` has no `side`.
- Nothing in world.js depends on the other modules' new APIs; `M.data.WALLPAPERS` / `FLOORS` /
  `CATALOG` are still read at call time and optional.
