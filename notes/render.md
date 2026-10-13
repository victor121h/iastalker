# M.render — notes for other modules

File: `js/render.js`. Implements every ARCHITECTURE.md `M.render` function. Reads the game state through
`M.engine.state` when the engine has one, otherwise the state passed to `init` (so a state swap after
loading a save is picked up automatically on the next frame). Never mutates the state.

## QA round 2 (CONTRACT_V2) — what changed
- **§4 picking** — `pick(cx, cy, opts?)` order: characters → small items on the tile the hit lands on →
  other objects → ground.
  - Characters use an enlarged capsule: radius 0.31, or 0.42 while walking. A screen-space snap radius
    (18 px, 24 px on a coarse pointer) applies on top. Body hits win over snap hits.
  - Visible walls occlude characters and objects (BB-2).
  - `opts.objectsOnly` skips characters. It defaults to true while `M.ui.mode` is `'buy'` or `'build'`.
    `opts.includeCharacters` forces characters back on. `opts.snapPx` overrides the snap radius.
  - Item results carry `item: true` (meal, dirty plate, spoiled meal, newspaper, puddle; LIVE-1). The
    preference for an item lying on the hit tile applies only outside Buy/Build (`opts.preferItems`
    overrides this); in Buy/Build, a click on the counter selects the counter.
    **NEW** `itemAt(x, y)` → id of the item lying on that tile, or null.
- **§1 / BB-1 `pickEdge(cx, cy, opts?)`** → `{ key, kind, x, y, side: 'A'|'B', wall, how }`. The ray is
  tested against the FULL-HEIGHT volume of every wall, the same slab the edge ghost draws. Aiming at a
  cut-down stub, or up to 0.6 above it, targets that wall. Resolution order:
  1. A wall the ray enters at or below its visible height (`how: 'wall'`).
  2. A wall edge within 0.6 tile of the ground point (`'near'`).
  3. The full-height slab with the smallest overshoot (`'slab'`).
  4. Unless `opts.wallsOnly`: the nearest grid edge within 0.35 tile, wall or not (`'grid'`).

  `side` is the face under the cursor:
  - on a standing wall, the face the ray enters;
  - when aiming over a cut stub, the far (room) side;
  - for ground picks, the side the ground point lies on.

  **NEW** `edgeSideAt(key)` → the side currently facing the camera.
- **§1 per-side wallpaper**: each wall body is two half-thickness slabs. Side A (north/west half) uses
  `cA`, side B (south/east half) uses `cB`; a missing value falls back to `c`. The colour of an end face
  is chosen as follows:
  - An extended corner end takes the colour of the perpendicular wall's coplanar face.
  - A free end is split A/B.

  `showEdgeGhost(keys, valid)` also accepts `'h,3,4,A'` or `{ key, side }`, which draws a thin slab on
  that face only.
- **§4 `setWallsUpOverride(bool)`** (getter `wallsUpOverride`): while on, every wall is drawn full height,
  whatever the wall mode. `setState` clears it.
- **§4 `hideObject(objId, hide = true)`**: hides an object, for example the original while it is being
  moved. While hidden, the object is not picked and casts no light, contact shadow or decor rule.
  `hideObject(id, false)` restores it. `setState` clears every hidden object.
- **§4 markers**:
  - A newspaper whose `offer` is a valid career gets a floating yellow briefcase badge (smaller once
    `read`).
  - The mailbox's red flag (model mesh kind `flag`) is raised while `state.bills` is not empty and
    lowered otherwise.
  - A red envelope badge floats over the mailbox while any bill is due within a day.
- **LIVE-5 / VIS-3 / BB-5 cutaway rule**: a wall whose camera-facing side carries a visible wall-mounted
  object stays full height, unless it hides the selected character (the selected-character trace still
  cuts it).
  - On a lowered wall (`'down'` mode, or the trace case), camera-facing decor is drawn as a small framed
    plaque standing on the cap. It stays visible and clickable.
  - Decor facing away from the camera hides while its wall is lowered.
- **BB-8**: cutaway uses `enclosed` regions (any region that does not leak off the lot), so a walled room
  without a floor cuts like a room. `indoor` mirrors M.world: an enclosed region is indoor unless it is a
  grassy yard walled along the lot border.
- **VIS-1 lamp light region mask**: lamps no longer light the lawn or the next room through a wall.
  - Every lit `MeshStandardMaterial` gets a shader patch via `onBeforeCompile`. A per-tile DataTexture
    holds each tile's "light room" id (0 = outdoors). Each pooled lamp light carries the room id of its
    lamp, and a fragment only receives the lamps of its own room. The lookup is offset 3 cm along the
    world normal, so faces lying on a tile border (wall faces) resolve to the room they face.
  - Lit rooms also get a soft warm ambient fill (`FILL_K`) at night, so the far side of a room is not
    black.
  - Lamp range is now 5.2 (it can be larger because the mask stops leaks).
- **Night dressing**:
  - Warm light patches on the lawn outside the windows of lit rooms (additive decals).
  - Light pools under the street lamps.
  - Neighbour house windows glow (env `glow` meshes).
- **Contact shadows**:
  - A soft dark rounded patch under every piece of furniture, sized from the model's bounding box.
  - A soft strip along both sides of every wall base; door openings are skipped.
- **Lot dressing**:
  - Ground: desaturated lawn, large-scale tonal variation and soft mowing stripes. It is one ground grid
    with variable spacing: fine on the lot, coarse far away.
  - A low hedge along the back and side lot boundary, just outside the lot.
  - A paver front path from the main exterior door to the street, and a 2×6 concrete driveway with an
    apron across the sidewalk. Both are drawn under real floor tiles and rebuilt with the walls.
  - Street details: crosswalk, manholes, drains, hydrant, two parked cars.
  - More neighbour houses beside and behind the lot.
- **Walls**:
  - Cut door openings keep only the threshold and a 0.1-high jamb trim (no white stubs).
  - Caps are two-tone (light top, darker sides).
  - Counters and dishwashers with a solid wall behind them get a tiled backsplash. It is model mesh kind
    `splash` and is hidden while that wall is cut.
- **Buy ghost**:
  - Stronger tint and emissive pulse.
  - Pulsing footprint tiles plus a bright footprint outline drawn over everything.
  - An x-ray copy (depthFunc GreaterDepth) shows the parts hidden behind walls or furniture.
  - CR-9: one shared tile mesh and one outline mesh are reused for every catalog item, and the replaced
    `ensureInstanced` meshes are disposed.
- **VIS-8 carpool**: the car is drawn in the near road lane (z ≈ h + 2.75). It drives in when created and
  drives off when removed. Its interaction slot stays at the lot edge.
- **Characters**:
  - VIS-6: the blob shadow follows the hips. It is smaller on furniture and hidden while lying in a bed,
    tub or hot tub.
  - VIS-12: the blanket only covers a sleeper with `sim.asleep`. The renderer passes `awake`, `recline`
    (armchair meta), `partnerDist` (VIS-7, hug/kiss spacing), `prop: 'handset'` (landline) and `prep`
    (counter stage of cooking: the object in front of the character is not a stove) to
    `M.models.animate`.
- **Camera**:
  - Portrait phones start closer (`dist` 23 instead of 30).
  - `focus()` centres the point in the area clear of the HUD on portrait screens, or when the UI reports
    insets. **NEW** `setViewInsets({ top, right, bottom, left })` takes px.
  - Auto-frame: when the selected character walks under a HUD panel or off the edge by itself while
    still on screen, the view eases to bring it back into the clear area. It is off in Buy/Build.
    - It never fights the player: if a pan, zoom or rotate leaves the character outside the clear area,
      auto-frame stays disarmed until the character is back inside. It never acts within 1.5 s of
      camera input.
    - Selecting a character that is on screen but under a panel frames it once.
    - A character that is fully off screen is left alone.
- **Perf**: every InstancedMesh created here has `frustumCulled = false`. r128 culls an InstancedMesh by
  its base geometry at the origin, which hid instances whenever the lot corner was off screen. On the
  starter house in SwiftShader, the render JS cost is ~0.17 ms per frame without GL work, and the whole
  frame costs about the same as before the changes.

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
- `pickEdge(cx, cy, opts?)` → `{key, kind, x, y, side, wall, how}`: see "QA round 2" above (full-height
  wall volumes first, then walls near the ground point, then any grid edge within 0.35 tile).
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
- Round 2 (render key `fix_render_*`):
  - `node tools/fix_render_models_test.mjs` (pure Node, 49 checks) covers the new model and animate
    features: flag/splash/puddle kinds, counter variants, relax/recliner poses, hug/kiss spacing,
    prep/handset props and idle fidgets.
  - `node tools/integrate_check.mjs --clear --nohelp --script tools/fix_render_test.mjs` (also with
    `--w 390 --h 844 --touch`) runs 18 functional checks. They cover:
    - decor in every rotation, the plaque, BB-5, the override, hideObject;
    - BB-1 heights, the pickEdge side, BB-2 occlusion and objectsOnly;
    - LIVE-1 meal on a counter, the LIVE-7 snap, per-side colours, BB-8, CR-9, the VIS-8 carpool,
      markers;
    - VIS-1: lawn pixels next to lit lamps at night.
  - Screenshot tools write to `../shots/fix_render/`:
    - `fix_render_shots.mjs` (`TAG=before|after`): default view day and night, wide, rotated, Buy ghost.
    - `fix_render_states.mjs`: dirty and broken states, puddle, cut door, handset, per-side wallpaper,
      night street.
    - `fix_render_chars.mjs`: hair and idle fidgets.
    - `fix_render_close.mjs`: ad-hoc close-ups through `CLOSE='[...]'`.
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

## Integration pass (after the fix round)
- `focus(x, y, snap)` now counts as camera input for auto-frame (`userCamT`): after an explicit focus (toast "Ver",
  the empty-lot framing, tests) auto-frame no longer pulls the view straight back to the selected character when
  that character sits outside the clear area; it re-arms once the character is inside it again.
- `pick` option `includeSims` was renamed `includeCharacters` (identifier hygiene; nothing called it).
