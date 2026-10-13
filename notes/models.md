# M.models — notes for other modules

File: `js/models.js`. THREE only, no game logic. Implements ARCHITECTURE.md `build`, `character`,
`animate`, `orb`.

## build(modelKey, opts) → THREE.Group
- Origin = footprint min corner, extent `w × h` at rot 0, front facing +Z (place with the
  `M.world.modelTransform` math). Models exist for every catalog type in DESIGN.md plus `spoiled_meal`
  and environment props `env_tree`, `env_pine`, `env_bush`, `env_streetlamp`, `env_house` (renderer only).
  Unknown keys get a neutral crate sized from `opts.w/opts.h` or the catalog entry.
- `opts` (all optional): `unmade` (beds), `dead`, `wilting` (plants), `servings` 1..4 and `spoiled` (meal),
  `spoiled` (dirty_plate), `variant` (puddle/env shape seed), `w`, `h` (fallback size).
- Each Group holds one mesh per material kind (`child.userData.kind`): `solid`, `glass`, `water`, `glow`
  (lamp shades; swap to `M.models.materials.glowOn`), `screen` (swap to `materials.screenOn` while used),
  `lit` (always bright), `useHide` (the part a character takes while using the object). Geometry is cached
  per key+variant and shared — never dispose a built model's geometry/materials.
- `group.userData.meta`: `{ support, seatH, surfaceH, light, lightPos:[x,y,z], blanket, top, smoke:[x,y,z],
  wall, floor, item }` (local coordinates). Surface heights match `M.data`: counter 0.9, dining/small table
  0.78, end table 0.6. Seats ≈ 0.45, beds 0.5 (mattress top), toilets 0.43, shower tray 0.09.
- **NEW** `meta(key, opts)`, `has(key)`, `list()`, `color(hex)` (sRGB→linear cached `THREE.Color`),
  `materials` (shared materials incl. `ghostOk`, `ghostBad`, `solidDirty`), `PALETTE`, `ANIMS`.

## character(sim) → rig
`{ root, parts:{head, body, armL, armR, legL, legR, pose, hips, spine, neck, chest, elbowL/R, handL/R,
kneeL/R, footL/R, eyes, brows, mouth}, props, setColors(colors), setBlanket(hex|null), dispose() }`.
- Height ≈ 1.72. Hair style varies by gender and by a hash of `id+name` (4 female, 3 male styles);
  some characters get long sleeves. Colors from `sim.colors` (invalid values fall back to defaults).
- All rigid parts are merged vertex-colored geometries with ONE shared material, so `setColors` just
  rewrites vertex colors (cheap; call it whenever `sim.colors` changes). `dispose()` frees the rig's own
  geometries.
- Root origin = feet; `root.rotation.y = facing` matches `Sim.facing` (0 = +Z).

## animate(rig, anim, t, ctx?)
Every `Sim.anim` name has its own pose/motion (idle walk sit sleep eat cook shower bath toilet wash read tv
computer talk dance exercise paint chess clean phone piano cry wave joke hug kiss angry laugh stretch use);
unknown names fall back to idle. `t` = seconds. Pose changes blend over ~0.3 s.
**Addition — optional `ctx`** (the renderer fills it; without it everything still works standing):
- `seated`: upper-body anims (idle, eat, read, tv, talk, phone, cry, wave, joke, laugh, angry, use) switch
  to their sitting variant.
- `support` / `seatH` / `off:{x,z}`: object under the character (`chair`, `sofa`, `bed`, `toilet`,
  `shower`, `tub`, `hottub`, `bench`), its seat/mattress height and the vector to its centre in
  character-local axes. Used for: sleeping along a bed with a blanket lump (or along a sofa, reclined in an
  armchair, on the floor without support), reclining in a tub, sitting low in the hot tub, bench press on
  the exercise bench, standing on the shower tray.
- `phase`: walk-cycle phase (radians) advanced by distance walked (no foot sliding).
- Poses that interact with a facing object step ~0.15–0.2 tile forward (cook, wash, use, paint, clean);
  hug/kiss step 0.3 toward the partner; computer/piano/chess sit ~0.6 forward on the model's built-in seat.
- Props appear automatically: book (read), phone (phone), spoon (cook), plate+fork (eat seated),
  sandwich (eat standing), brush+palette (paint), sponge (clean), remote (tv seated), barbell (exercise on
  bench), water streaks (shower), blanket (sleep on a bed, color via `setBlanket`).

## orb()
Glowing sphere + additive halo sprite; `orb.userData.setColor(css)`, `orb.userData.dispose()`.

## QA round 2 — what changed (render key)
- **New mesh kinds** in built groups (all use the shared `solid` material unless noted):
  - `flag`: the mailbox flag. It is built raised; `meta.flagPivot` is its hinge (local) and the renderer
    rotates it down while there are no bills.
  - `splash`: a counter/dishwasher backsplash, built when `opts.backsplash` is set; the renderer hides
    it while the wall behind is cut.
  - `puddle`: the puddle body. It uses the new `materials.puddle` (glossy, bluish, slight emissive) and
    has a bright rim and reflection streaks.
- **Model changes**:
  - `counter` props vary by `opts.variant` (object id % 5): none, cutting board with vegetables, jars,
    fruit bowl, utensil crock with kettle. `opts.backsplash` adds a tiled backsplash.
  - The variant key includes `v<n>` and `k` for `counter`, and `k` for `dishwasher`.
  - `armchair` meta gains `recline: true`.
  - `stove`: the pot is on the front burner on the cook's right-hand side, and a kettle is at the back.
  - New environment models: `env_hedge` (1-unit segment along +X, centred on z=0), `env_hydrant`,
    `env_manhole`, `env_drain`.
- **Materials**:
  - `solidDirty` has a stronger grime tint.
  - New `glassDirty`: the renderer swaps glass to it on dirty objects such as the shower.
  - New `puddle`.
  - Ghost materials are brighter, with stronger emissive.
- **Character**:
  - Hair is built from rounded volumes (no boxes). Male: tousled, quiff, crop + beard. Female: long,
    ponytail, bun, bob.
  - Torso and pelvis are rounded frustums (superellipse cross-section).
  - New props: `handset` (red corded landline handset), `knife` (right hand), `board` (cutting board
    with vegetables, pose frame at counter height).
- **New `animate()` ctx fields** (all optional):
  - `awake`: `sleep` on a bed or bench with `awake` is "Deitar e relaxar": on top of the covers, eyes
    open, hands behind the head, one knee up, no blanket.
  - `recline`: `sleep` on a `chair` support with `recline` is a nap in the recliner: body tipped back,
    legs out, head to one side.
  - `partnerDist`: hug/kiss step `pz` toward the partner from this distance. Hug: torsos ~0.46 apart.
    Kiss: head centres ~0.29 apart. Without it, 1 tile is assumed.
  - `prep`: `cook` becomes chopping with knife and board (the counter stage) instead of stirring.
  - `prop: 'handset'`: `phone` shows the landline handset instead of the mobile.
- **Idle fidgets**: standing `idle` adds a fidget every ~6–10 s for ~2.6 s, eased in and out: shift
  weight, glance at the watch, scratch the head, hands on hips, or look around.
- Tests: `node tools/models_test.mjs` (unchanged, 311 checks) and `node tools/fix_render_models_test.mjs`
  (49 checks for the round-2 additions).
