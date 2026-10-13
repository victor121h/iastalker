# M.render — notes for other modules

File: `js/render.js`. Implements every ARCHITECTURE.md `M.render` function. Reads the game state through
`M.engine.state` when the engine has one, otherwise the state passed to `init` (so a state swap after
loading a save is picked up automatically on the next frame). Never mutates the state.

## Lifecycle
- `init(container, state)`: creates the canvas inside `container` (canvas fills it: `width/height:100%`,
  `touch-action:none`, class `morada-canvas`). A `ResizeObserver` on the container keeps the size in sync.
  Calling `init` again is safe: it re-attaches to a new container if given and resyncs everything.
- **NEW** `setState(state)`: swap the state the renderer reads (only matters without an engine — when
  `M.engine.state` exists it always wins), resync and re-centre the camera on the house. The bus event
  `'state' {state}` (emitted by main after a load) does the same.
- `frame(dtReal)`: call once per animation frame (main loop). Processes pending bus resyncs (debounced to
  one per frame), animates camera/walls/doors/characters, renders.
- Animation time follows `state.speed` (paused → characters freeze; 2/3 → faster).
- Bus: listens to `'objects'`, `'lot'`, `'sims'` (resync next frame) and `'select' {simId}`
  (= `setSelected`). As a safety net it also re-checks cheap signatures of objects/walls/floors/sims every
  0.4 s, so a missed event only delays an update.

## Object state the renderer reads (all optional)
`broken` → smoke + sparks; `dirty >= M.data.DIRT.visible` on objects with `def.dirties` → greenish tint;
lamps (`def.light`) are lit unless `broken`, `lightOff`, `on === false` or `lit === false`;
`unmade` (beds), `dead` / `water < PLANT.thirstyBelow/2` / `wilting` (plants), `servings` (meal, 1..4,
also `portions`), `spoiled` / `state === 'spoiled'` / type `spoiled_meal` → model variants.
Objects in use (a visible sim whose `queue[0]` has `objId` and phase `'do'` or `'enter'`) turn their
screens on and hide the part the character holds (phone handset, barbell).
noBlock items (meal, dirty_plate, newspaper…) on a tile with a `surface` object render at that
object's `surfaceHeight`. Wall-mounted objects hide while the wall behind them is cut down.

## Characters
- One rig per sim; position eases toward `(x+0.5, y+0.5)` (snaps if it jumps > 3 tiles); facing eases.
- `sim.anim` is passed to `M.models.animate` with a context: `seated` (= `sim.seated`), and when the
  anim rests on an object (`sit, sleep, toilet, shower, bath, exercise` or `seated`) the object under the
  character's tile (its model `support` kind, seat height and centre offset). So the engine only has to put
  the character on the slot (`px,py`, slot facing) — the pose lines up with chairs, sofas, beds (blanket
  drawn over sleepers), tubs, the hot tub, the bench. `computer`, `piano`, `chess` poses sit on the seat
  built into those models (the character stands on the slot tile in front, pose shifts forward).
- An `idle` sim that is moving is drawn walking.
- Selected sim: ring on the ground (yellow; light blue for visitors) + mood orb colored with
  `M.engine.moodColor(sim)` (fallback green).

## Picking / projection
- `pick(cx, cy)` → `{kind:'sim', id}` | `{kind:'object', id, x, y, floor?}` | `{kind:'tile', x, y, wall?}` | null.
  - Characters first (capsule head→feet), then the nearest of objects / walls. Objects report `x, y` = the
    tile of the clicked point; `floor: true` for flat floor objects (rugs, puddles) so Live mode can treat
    a rug click as a walk-to-tile if it wants.
  - Clicking a standing wall returns the tile in front of the clicked face, with `wall: <edgeKey>`.
- `pickTile(cx, cy)` → `{x, y, fx, fy}` (fx, fy = ground point in tile units, i.e. world X/Z; null off-lot).
- **NEW** `pickGround(cx, cy)` → `{fx, fy}` unclamped (use for wall drags: corners are `Math.round(fx/fy)`).
- `pickEdge(cx, cy)` → `{key, kind, x, y}`: nearest edge to the ground point within 0.35 tile; if none and
  the cursor is on a standing wall, that wall's edge.
- `project(wx, wy, wz)` → `{x, y, visible, clientX, clientY}`; `x, y` are CSS px relative to the canvas
  (= container) top-left, `clientX/clientY` are viewport coordinates (for `position:fixed` overlays).
- `simScreenPos(id)` → same shape, a point above the head (above the mood orb), meant as the bottom-centre
  anchor of a thought/speech bubble. `visible:false` for hidden/unknown sims.

## Camera
- Yaw steps: `rotate(±1)` animates 90°; start yaw 45° (camera at south-east, looking north-west, street at
  the bottom-left). Pitch 50°, fov 30°. On narrow/portrait screens the effective distance is scaled by
  up to 2.4× so the horizontal coverage stays similar to a landscape screen.
- `zoom(delta)`: wheel `deltaY` semantics (positive = zoom out); distance clamped 9..70.
- `pan(dx, dy)`: moves the view as if the ground were dragged by (dx, dy) screen pixels (so for keyboard
  panning to the right call `pan(-step, 0)`). Target clamped to the lot (+2 tiles, +5 toward the street).
- `focus(x, y, snap?)`: centre on tile/character coords (`snap` = no easing).
- **NEW** `setCamera({k, dist, x, z, pitch})` / `getCamera()` (tests, restoring a saved view).

## Walls
- Height 2.6, thickness 0.1. Cutaway (default) lowers to 0.4: every wall whose far side (away from the
  camera) is an indoor tile, plus every wall crossed by short rays from the selected character toward the
  camera. Recomputed when the view quadrant, the walls, the mode or the selected sim's tile change; heights
  animate. `'up'`/`'down'` = all full / all low. **NEW** getter `M.render.wallMode`.
- Doors swing open automatically when a character is within ~1 tile (away from that character).
- Window glass glows warm at night when a lit lamp is in an adjacent indoor room.
- Indoor = region enclosed by wall entries (doors/windows included) that does not leak off-lot and is not
  mostly grass (same idea as M.world, computed locally so rendering never depends on world caches).

## Ghosts
`showGhost(type, x, y, rot, valid)` (model + footprint tiles; items on surfaces are lifted),
`showEdgeGhost(keys, valid)` (translucent full-height slabs), `showTileGhost(tiles, valid)`; each has a
`hide*`. Calling them every frame is fine (no allocation once the type is cached).

## Other additions
`syncCharacters()` (= the contract's character resync), `resize()`, `stats()` (draw calls, triangles, counts), getters `canvas`, `scene`, `camera`,
`renderer`, `selectedId`.

## Performance
Furnished 24×20 house, 52 objects, 5 characters: ~200 draw calls, ~45k triangles, ~0.06 ms JS per frame
(excluding GPU). Walls are 4 instanced meshes + glass; the neighbourhood is merged into 2 meshes;
character parts share one vertex-colored material; object models share cached geometry. Only the sun
casts shadows; lamps use a pool of 8 point lights (intensity 0 when unused, so no shader recompiles).

## Tests
- `node tools/models_test.mjs` — pure Node (311 checks): every catalog model + variants builds without
  falling back, fits its footprint, surface/light/wall metadata, every character style × every anim × many
  contexts gives finite transforms, seat/bed pose geometry, props, orb.
- `node tools/render_check.mjs --eval tools/render_shots.js` (default page `tools/render_demo.html` =
  hand-built house `tools/render_fixture.js`): 4 rotations, up/cutaway/down, day/dusk/night, close-ups.
  `--eval tools/render_shots2.js`: door swing, cutaway around a selected character, ghosts, picking.
  `--eval tools/render_robust.js`: malformed/legacy data (unknown types, numeric wall entries, bad keys,
  NaN floors, sims without colors/position, lot resize, missing time, engine state swap, re-init, container
  resize) must not throw.
- Contact sheets (one viewport per model / animation): `node tools/models_sheet_shots.mjs objects|anims|variants`
  (page `tools/models_sheet.html?set=…&page=N`). In-engine gallery: `tools/render_gallery.html`.
