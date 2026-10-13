# M.world — notes for other modules

File: `js/world.js`. Pure logic (no DOM, no THREE). Implements the ARCHITECTURE.md API, plus the
additions listed below. Tests: `node tools/world_test.mjs` (511 checks, includes a fuzz test against
a reference Dijkstra and an integration pass over the real `data.js` catalog). Browser demo:
`node tools/world_check.mjs --shot out.png` (renders `tools/world_check.html`: rooms, walls,
footprints, slots, paths).

## Lifecycle / caches
- `init(state)`: attaches the state, repairs missing `lot.floors` / `lot.walls` / `objects`, builds caches.
- `rebuild()`: recompute everything. **Changes to `state.objects` are detected automatically**
  (push / splice / filter / replaced array / moved, rotated or retyped objects), but
  **in-place edits of `lot.walls[key]` or `lot.floors[i]` are not**. Use `setWall` / `setFloor`
  (they update the caches), or call `rebuild()` after editing those directly.
- `version` (getter): increments on every change; handy for render/UI cache invalidation.

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
`getWall(key)`, `setWall(key, t, c)` (t 0 removes; c omitted keeps the old wallpaper), `getFloor(x,y)`
(NEW), `setFloor(x, y, idx)` (validates against `M.data.FLOORS`), `edgeBetween`, `edgeTiles(key)` (NEW,
the two tiles beside an edge), `isValidEdge(key)` (NEW), `edgesOfRect(x1,y1,x2,y2)` (perimeter of an
inclusive tile rect, clockwise), `tilesInRect(x1,y1,x2,y2)`, `wallSegmentsForDrag(cx1,cy1,cx2,cy2)`
(**corner/vertex coords** 0..w / 0..h, floats rounded; snaps to the dominant axis; ordered from start).

## Rooms
- `roomAt(x, y)` → id for **every** connected region, outdoor ones included (−1 only off-lot);
  `rooms(minute?)` → `[{ id, tiles, indoor, area, windows, doors, score }]` (`tiles` arrays are shared
  caches — do not mutate); **NEW** `isIndoor(x, y)`, `roomBreakdown(x, y, minute?)` (score + parts
  `[{key,label,value}]` in pt-BR for a UI tooltip), `isDaytime(minute?)`.
- Regions are bounded by any wall entry (doors and windows separate rooms). A region is outdoor when
  it leaks off the lot through a border edge **without** a wall, or when grass is a strict majority of
  its floor (a fenced/unfloored enclosure). Deviation: a room walled along the lot border is indoor.
- `roomScore(x, y, minute?)`: `round(sum / max(1, tiles/12) + floorBonus + wallBonus) − 10` indoors,
  `round(sum / 30) − 15` outdoors, clamped −100..100. `sum` = per-object impact from
  `M.data.roomImpact(o, false)` (fallback: canonical table: decor 5×room rating, dirty plate −5 / spoiled −15,
  puddle −15, spoiled meal −15, broken −10, dirty plumbing −5 at `dirty >= M.data.DIRT.visible`
  (500 without data), dead plant −15) + `o.unmade` −5 + light: lit lamps at night +10 each (cap +30),
  windows on the room boundary +5 each by day (06:00–17:59), dark room at night (no lit lamp) −20
  (indoors). Constants come from `M.data.ROOM_IMPACT` when present.
  A lamp is lit unless `broken`, `lightOff`, `on === false` or `lit === false`.
  Floor/wallpaper bonus (indoor, documented addition): 2 × average quality tier of the room's floor
  tiles and 2 × average tier of its wall sides, tier = entry `room` value (0..3) from FLOORS/WALLPAPERS
  (fallback: price tier). Wood floor (+2) … marble (+6).
- Time: `minute` argument, else `M.engine.state.time.minute`, else the init state's time.
