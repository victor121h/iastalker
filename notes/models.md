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
