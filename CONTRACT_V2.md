# Contract v2 — cross-module additions for the QA fix round

These extend ARCHITECTURE.md (and the existing notes/*.md APIs). Every module owner implements its
side exactly as written so the four fixers, working in parallel, stay compatible. Keep all existing
APIs working (old saves too).

## 1. Wallpaper per wall side (fixes VIS-2 / BB-7)
- Wall entry becomes `{ t, c, cA?, cB? }`. Side A / side B of an edge:
  - `"h,x,y"` (top edge of tile x,y): side A faces tile (x, y-1) (north), side B faces tile (x, y) (south).
  - `"v,x,y"` (left edge of tile x,y): side A faces tile (x-1, y) (west), side B faces tile (x, y) (east).
  - Missing `cA`/`cB` fall back to `c`. New walls set `c` only (both sides same) unless specified.
- world: `M.world.wallColor(edgeKey, side)` → wallpaper index for that side; `M.world.edgeSideFacing(edgeKey, x, y)`
  → 'A'|'B'|null for the side that faces tile (x,y); `M.world.roomEdges(x, y)` → [{ key, side }] for every
  wall/door/window edge bounding the room containing tile (x,y), with the side facing into that room.
- engine: `paintWall(edgeKey, wallpaperIdx, side = 'both')` charges per side painted (M$ 10 each);
  `paintRoomWalls(x, y, wallpaperIdx)` paints the inward side of all edges of that room →
  `{ ok, cost, count, reason }`; `paintRoomFloor(x, y, floorIdx)` → `{ ok, cost, count, reason }`
  (only for indoor rooms; outdoor → reason). Bus 'lot' after changes.
- render: each wall face uses its own side's color. `pickEdge()` result gains `side: 'A'|'B'` = the side of
  the wall that the cursor ray hits / the camera sees (the face under the cursor).
- ui: wallpaper tool paints only the clicked side; Shift+click (and a "Cômodo inteiro" toggle on touch)
  calls paintRoomWalls for the room on that side. Floor tool: Shift+click / toggle → paintRoomFloor.

## 2. Room tool, undo, previews
- engine: `estimateRoom(x1, y1, x2, y2, floorIdx|null)` → `{ ok, cost, walls, tiles, reason }` and
  `buildRoom(x1, y1, x2, y2, floorIdx|null)` → `{ ok, cost, reason }` (perimeter walls along the rectangle
  of tiles x1..x2, y1..y2 inclusive, skipping edges that already have walls/doors/windows; optional floor
  on the inside tiles; refuses if any segment is blocked by an object or the money is short).
- engine: undo support for Buy/Build (time is paused there): `snapshotBuild()` → deep clone of
  `{ lot, objects, money, nextId }`; `restoreBuild(snap)` → replaces those fields, rebuilds world caches,
  sanitizes every character's queue/position (drop actions whose objects vanished, move characters standing
  inside a now-blocked tile to the nearest walkable tile), emits 'lot', 'objects', 'money'. UI keeps a stack
  (max 20) of snapshots taken before each Buy/Build action of the current mode session; Ctrl+Z and a
  toolbar "Desfazer" button pop it. The stack is cleared when leaving Buy/Build mode.
- world: `placementWarnings(type, x, y, rot, ignoreId)` → array of pt-BR warning strings (non-blocking) such
  as "Bloqueia a única porta do cômodo", "Bloqueia o acesso a Geladeira simples"; `wallWarnings(edgeKeys)` →
  same for wall drags (e.g. the wall would block a door or seal a character in). Placement still allowed.
- world: `roomScoreWith(type, x, y, rot)` → `{ before, after }` predicted Ambiente of the room at that spot
  with the hypothetical object added (time of day taken into account like roomScore). UI shows
  "Ambiente +N neste cômodo" in the placement tip. `roomScoreWithFloor(tiles, floorIdx)` and
  `roomScoreWithWallpaper(edgeSides, idx)` likewise when cheap to compute (optional; return null if not).

## 3. Engine feedback for the UI
- `M.engine.lastReason` — pt-BR string set whenever a queue*/buy*/build*/paint* call refuses (false or
  ok:false), e.g. "A fila de ações está cheia (máx. 8).". UI shows it as a toast.
- Queue cap: at most 8 actions per character (current included). `queueWalk(simId, x, y, opts)`:
  if the current action is a player walk and `!opts.append`, redirect it to the new target instead of
  appending; with `opts.append` (UI: Shift+click) append.
- `M.engine.pendingDeliveries()` → `[ { kind: 'pizza'|'repair'|'maid'|'guest', label, at } ]`
  (`at` = absolute sim minute of arrival) for the clock-area chip. Refuse a second pizza order while one is
  pending (lastReason "Já tem uma pizza a caminho.").
- Notifications gain optional location info: bus 'notify' payload `{ text, kind, focus?: { x, y } | { simId } | { objId } }`
  and the stored notification keeps `focus`. UI toasts with focus get a "Ver" button → M.render.focus.
- `M.engine.homeTile(simId)` → an indoor walkable tile near the household's beds/door (for the self menu).
- Gendered Portuguese everywhere in engine texts (`sim.gender`): "demitida/demitido", "levada/levado",
  "Entregadora Rafaela", "Técnica Ana" etc. No "(a)" forms.

## 4. Render picking & markers
- `pick()` prefers, in this order: characters (enlarged hit capsule + 18 px screen-space snap radius),
  small items lying on a surface/floor tile (meal, dirty_plate, spoiled meal, newspaper, puddle) when the
  hit lands on that tile, then other objects, then ground. Walls occlude characters/objects behind them
  (a click on a visible wall never selects a hidden character behind it).
- Markers: a gentle floating marker above the newspaper when it holds a job offer, and a raised red flag
  on the mailbox while unpaid bills exist (render reads `state.bills` / newspaper objects).
- `M.render.setWallsUpOverride(bool)` — UI turns it on while a wall-mounted catalog item is being placed or
  a wall item is selected in Buy mode, so paintings/mirrors are always visible while placing.
- `M.render.hideObject(objId, bool)` — UI hides the original while an object is being moved.

## 5. Save robustness (UI owner: save.js / main.js)
- Never overwrite a newer cloud save with an older/new game: `M.save.loadEntry()` reports
  `cloudChecked: boolean`. Until a cloud read has completed in this session, cloud writes first read the
  doc and refuse to overwrite a newer `savedAt` from a different session (keep the local copy, show a modal
  choice "Continuar o jogo da nuvem (Dia N, Família X, salvo às HH:MM)" vs "Manter este jogo").
- Rolling backups: before overwriting, copy the previous save to `<slot>.bak` (local) / `<slot>-prev` (cloud).
- Persist the active slot (localStorage `morada:activeSlot`), show it in the save chip.
- Periodic autosave every 3 real minutes while dirty, plus day change and page hide.
- An unreadable save is never silently replaced: show a recovery modal (try backup / export raw JSON / new game).

## 6. UI helpers used by save.js / main.js
- `M.ui.choice({ title, text, buttons: [ { label, value, primary?, danger? } ] })` → Promise resolving to the
  chosen `value` (modal, pauses time with reason 'modal', focus-trapped, Esc = last button's value).
- `M.ui.toast(text, kind, { focus?, action?: { label, fn }, sticky? })`.
- main.js/save.js must work if `M.ui` is not initialised yet (fall back to waiting until it is).
