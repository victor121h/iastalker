# index.html + M.ui + M.save + M.main — notes for other modules

Files: `index.html` (shell, all HUD CSS, boot + fatal overlays, script tags), `js/ui.js` (M.ui),
`js/save.js` (M.save), `js/main.js` (M.main).
Tests: `node tools/save_test.mjs` (44 checks: offline/local, throwing storage, cloud db mock with write
serialization, retries, refusals, import/export). Browser: `node tools/ui_check.mjs [--stub] [--nohelp]
[--clear] [--touch --w 390 --h 844] [--script tools/ui_scenario.mjs] [--shot out.png]` — it regenerates
`tools/ui_demo.html` from index.html with `tools/ui_stubs.js` injected (fakes only for missing modules;
`--stub` forces the 2D stub renderer). `tools/ui_scenario.mjs` walks pie menus, walk, tabs, buy/sell,
wall drag, floor, options, new family and saves screenshots to `$UI_SHOTS`.

## M.main (bootstrap + loop)
- `start(data)`, `boot()`, `restart({fresh, data})`.
- `state` (getter), `container` (#view), `slot` / `setSlot(s)` (current save slot, default `'slot1'`).
- Speed: `getSpeed()`, `setSpeed(0..3)` (calls `M.engine.setSpeed`), `togglePause()`,
  `speedFactor()` → sim-min per real second (0/1/3/10; **30 at speed 3 when `M.engine.allAsleepOrAway()`**),
  `isUltraBoost()`.
- **Pause reasons** (time stops while any is active, the user's speed is kept):
  `setPaused(reason, bool)`, `isPaused()`, `pauseReasons()`. UI uses `'buy'`, `'build'`, `'modal'`, `'help'`.
- Saves: `saveNow(slot?)` → Promise<{ok, where, error}>, `autosave(why)`, `loadSlot(slot)`,
  `loadState(state, info)` (swap the running game: engine.init → render re-init → `M.ui.reset(info)`),
  `newGame({householdName, members:[spec], lot:'starter'|'empty', seed})`, `markDirty()`, `dirty`, `lastSavedAt`.
  Autosave: on bus `'day'`, on `visibilitychange→hidden` / `pagehide` when something changed since the last save.
- Bus events emitted by main: `'speed' {speed, factor}`, `'saved' {ok, where, slot, error}`,
  `'loaded' {where, savedAt}` (boot only), `'state' {state, info}` (after loadState).
- Loop: dt clamped to 0.1 s; engine stepped in ≤ 0.5 sim-minute substeps; then `M.render.frame(dt)`, `M.ui.update(dt)`.
  Main does **not** call `M.render.sync*` — render subscribes to the bus itself.
- State swap relies on `M.render.init(container, state)` being idempotent (it is) or an optional `M.render.setState(st)`.
- Boot order: loading overlay (static HTML) → `M.save.init()` (background) → state from `claude.hot.data.json`, else
  `M.save.loadEntry('slot1')` raced against 1.5 s, else local mirror (and if the cloud answers later with a newer save
  a toast offers to load it), else `M.engine.newGame()` → `M.engine.init` → `M.render.init(#view, state)` → `M.ui.init()`.
  Any boot error shows `#fatal` (pt-BR, with "Recarregar", "Começar um jogo novo", "Tentar salvar").
- Live update: `window.claude.hot.snapshot(() => ({ json }))`, boots through `hot.ready(start)` (2.5 s safety net).
- `window.__morada = { M, get state() }`.
- **"Casa inicial mobiliada" with a custom family**: the engine's starter house always spawns Rita + Caio, so
  `newGame({lot:'starter', members})` calls `E.newGame()` then `E.addSim(spec)` for each member, `E.removeSim()` for
  the default pair, sets household relationships to daily 40 / lifetime 50 and clears the neighbours' links to the
  removed pair. A first-class engine option would be welcome but is not required.

## M.save
`init()`, `save(state, slot='slot1')` → {ok, where:'cloud'|'local'|'none', error, savedAt}, `load(slot)`,
`loadEntry(slot)` → {state, where, savedAt, meta} (newest of cloud/local), `loadLocal(slot)` (sync),
`localEntry(slot)`, `list()` → [{slot, savedAt, householdName, day, money, members, where:'cloud'|'local'|'both'}],
`remove(slot)`, `exportJSON(state)` (wrapper `{format:'morada-save', v:1, exportedAt, meta, state}`),
`importJSON(str)` (accepts the wrapper, a stored body or a raw state; rejects newer versions; returns a fresh object),
`download(state)` → {ok, method:'downloads'|'manual', error, data} (`downloads.save({filename:'morada-save.json'})`),
`status()` → {ready, cloud, cloudReason, downloads, lastSave, lastLoad}, `validateState(st)`.
Cloud doc `db.collection('data/users/' + uid).doc(slot)` = `{v:1, savedAt, meta:{householdName, day, money, members}, json}`;
one write in flight per doc (newer saves coalesce), `unavailable` retried once, refusals (`invalid_argument`,
`revoked`, lifecycle codes) disable the cloud for the visit, `quota_exceeded` is reported. Local mirror key `morada:<slot>`.
UI prefs live under `morada.prefs` (not a save slot).

## M.ui
`init()`, `update(dt)`, `reset(info)` (after loadState; `info.kind` 'new'|'load'|'import'), `offer(text, label, fn)`
(toast with an action), `toast(text, kind, {icon, actions, timeout})`, `setMode('live'|'buy'|'build'|'options')`,
`mode`, `setTab(key)`, `selectSim(id)`, `showHelp()`, `openOptions()`, `openCreateFamily()`, `openPie(x, y, target)`,
`closePie()`, `debug` (test hooks).
Render calls used: `pick`, `pickTile` (**fx/fy = world X/Z**, corners = `Math.round(fx)`), `pickEdge`, `zoom(±px)`
(wheel deltaY; buttons ±240), `pan(dx, dy)` (drag semantics: content follows the pointer), `rotate(±1)` (Q = −1),
`focus(x, y)`, `setWallMode`, `setSelected`, `showGhost/hideGhost`, `showEdgeGhost/hideEdgeGhost` (demolition preview
uses `valid=false` = red), `showTileGhost/hideTileGhost` (also used to highlight the selected object's footprint in
Buy/Build), `simScreenPos` (uses `clientX/clientY` when present), `project`.
Catalog thumbnails are rendered once per type with `M.models.build(def.model || type, {...})` on a small offscreen
WebGLRenderer (emoji fallback on any failure).
Engine calls used beyond the contract: `household`, `simById`, `objectById`, `npcById`, `selectSim`, `sellValue`,
`wallCost`, `floorCost`, `careerInfo`, `jobOffers`, `relationships`, `phoneBook` (phone pie submenus use the dynamic
`call:<npcId>` / `invite:<npcId>` keys), `setFreeWill`, `setSpeed` (via main). All are guarded; missing ones degrade.
Keyboard: P/Space pause, 1/2/3 speed, 0 pause, Q/E rotate, WASD/arrows pan, +/− zoom, R rotate placement,
Esc cancel/close/back, Delete/Backspace sell selected (Buy), H or ? help.

## Issues found in other modules (for their owners)
- **render.js**: right after the game state is swapped from the starter house to an empty-lot state, one
  `M.render.frame()` throws `TypeError: Cannot read properties of null (reading 'isInterleavedBufferAttribute')`
  inside `renderer.render` (render.js frame → WebGLRenderer.renderBufferDirect). Repro in the console:
  `M.engine.newGame({ empty: true, members: [{ name: 'Ana B' }] })` and let a frame run. It happens once, then
  rendering continues; M.main's loop tolerates transient frame errors (fatal overlay only after 90 consecutive).
- Touch: a tap that opens an HTML menu under the finger is followed by the browser's compatibility `click`;
  M.ui cancels `touchend` on #view (passive:false) and ignores pie clicks for 300 ms after opening. Any other module
  that adds tap-opened HTML over the canvas should do the same.

## QA fix round (CONTRACT_V2) — ui.js / index.html
Tests: `node tools/integrate_check.mjs --clear --nohelp --script tools/fix_ui_test.mjs` (also `--touch --w 390 --h 844`
and `--w 768 --h 1024`): one check per finding/improvement with real mouse/touch/keyboard input, prints
`{pass, fail, failed, results}` (`ONLY=LIVE-1,BB-9` runs a subset). Screenshot tour: `tools/fix_ui_shots.mjs`
(`SHOTS=dir TAG=name`). While other modules are mid-edit, `sh tools/fix_ui_mirror.sh [dir-with-good-render.js]`
copies the game to `../ui_fix/mirror` for testing.

### New / changed public API (old calls keep working)
- **`M.ui.choice({ title, text, body?, buttons: [{label, value, primary?, danger?}], cancelValue?, dismissable?, wide? })`**
  → Promise of the chosen `value` (CONTRACT_V2 §6). Modal (pause reason `'modal'`), focus-trapped, HUD inert;
  Esc / backdrop resolve the last button's value (or `cancelValue`). Works before `init()` (the modal root is created
  on demand and handles Tab/Esc itself).
- **`M.ui.toast(text, kind, opts)`** — opts `{ icon, timeout, sticky, focus: {x,y}|{simId}|{objId}, action: {label, fn},
  actions: [{label, fn, primary}], id }`. `focus` adds a "Ver" button (camera → `M.render.focus`). A toast with the same
  text already on screen is bumped (timer restarted) instead of stacked. Phones keep ≤ 2 toasts (older ones only in the
  bell log), desktop ≤ 4. Toast bodies are `pointer-events: none` (only the buttons catch clicks). Toasts requested
  before `init()` are queued and shown at init. 'Clique' → 'Toque' on coarse pointers.
- `M.ui.ready` (getter: init done), `M.ui.undo()`, `M.ui.openOfferCard(track, simId)`.
- Bus: `'notify'` payload `focus`/`id` are used; **`'notifyRepeat' {id, text, kind, count}`** updates the toast on screen
  with a `×N` badge (log entries show `(×N)` from `notification.count`).
- `state.settings.moveInChecklist` (bool, UI-owned): the move-in checklist card is shown while true (set by
  `M.ui.reset({kind:'new'})` when ≥ 3 essentials are missing; cleared when all are ticked or the card is closed).

### Render / engine / world calls used (all feature-detected)
- render: `setWallsUpOverride(bool)` (placing/selecting a wall item in Buy), `hideObject(id, bool)` (moving),
  `setViewInsets({top,right,bottom,left}|null)` (drawer open/closed, so focus/autoFrame avoid it), `getCamera()`
  (restore the drawer re-frame only if the player did not move the camera), `pickEdge().side`.
- engine: `lastReason` (refusal toasts), `queueWalk(simId, x, y, {append})`, `pendingDeliveries()` (ETA chip),
  `homeTile(simId)` (self menu), `estimateRoom/buildRoom` (Cômodo tool), `snapshotBuild/restoreBuild` (undo),
  `paintWall(key, idx, side)`, `paintRoomWalls`, `paintRoomFloor`, `jobOffers/careerInfo` (offer card, Carreira tab).
- world: `itemAt` (food on a counter), `placementWarnings`, `wallWarnings`, `roomScoreWith`, `roomScoreWithFloor`,
  `roomScoreWithWallpaper`, `edgeSideFacing`, `edgeSideTile`, `wallColor`, `roomEdges`, `roomTiles`, `isIndoor`,
  `edgesOfRect`, `tilesInRect`.

### Behaviour (by finding)
- LIVE-1: a pick on a surface (counter/table) or an object with no interactions resolves to the item lying on that
  tile (`M.world.itemAt`, then any tile of the surface) for the pie and the hover label.
- LIVE-2/3/14: `job:<track>` pie items show "Vaga: <título>" (or "Trocar de emprego: …") + a sub-line
  (carreira · salário · horário); clicking opens the offer card (`choice`) with salary, hours, days, carpool time and
  next promotion; when employed it compares the current job and warns about losing level and performance, with a red
  "Trocar de emprego" button. The Carreira tab lists today's offers as buttons that open the same card and queue
  `job:<track>` on the source object (newspaper or nearest computer). Pie labels wrap to 2 lines (no ellipsis).
- LIVE-4: only portraits, queue icons, the needs toggle and the panel catch clicks in the dock.
- LIVE-8: every refused queue*/buy/build/paint call toasts `M.engine.lastReason`; the queue strip shows 7 icons + "+N".
- LIVE-9: Space/Enter/Esc close the help card (never the game shortcuts); "PAUSADO" chip (red) whenever speed is 0.
- LIVE-10: tap the selected portrait (or a second tap within 350 ms) → camera centres on that character.
- LIVE-11: plain floor click → `queueWalk(..., {append:false})` (engine redirects the current walk); Shift+click appends.
- LIVE-13: phones ≤ 2 compact toasts, the stack ends 52 px before the right edge (camera cluster).
- LIVE-15/Carreira: promotion checklist ticks "Ir trabalhar de bom humor" live (departure mood while at work),
  shift countdown "(em 2h15)", carpool ETA, friend count with a hint.
- LIVE-17: a world click with the log open only closes the log.
- LIVE-18: objects without interactions get no pointer cursor (dim hover label); clicking them shows a status tip
  (mailbox: "Nenhuma conta para pagar…", plants: water, decor: Ambiente…).
- VIS-4: `--bar-h` is the bar's measured outer height (ResizeObserver); the bar sizes from `--bar-min`.
- VIS-5: 761–960 px: icon-only wall button, compact camera cluster. VIS-9: column pies put the title above the portrait.
- VIS-10: opening the drawer pans the camera so the lot sits beside/above it (+ `setViewInsets`); closing undoes it.
- VIS-11: short category names (Mesas, Cozinha, Banheiro, Luzes) + 2-line labels; swatch names 2 lines.
- VIS-16: the needs panel hugs its content and ends with a one-line "Precisa de: …" summary.
- BB-6: `flashTip` locks the tip for its duration; hover only refreshes ghosts; "Já é uma porta" is neutral.
- BB-9: Delete/Backspace in Buy *and* Build: first press arms "Vender por …?", second press sells.
- BB-11: the cursor tip avoids #cam, #toolbar, #drawer and #bar (above the finger on touch); drawer ends a gap above
  the bar; touch placement shows the footprint tile ghost under the model.
- CR-10: buyable:false objects (puddle, plates, meals, newspaper, carpool) cannot be selected/sold in Buy or
  demolished in Build (tip explains the chore); the mailbox can only be moved.
- CR-11: modals make #hud and #view `inert` + `aria-hidden`, Tab cycles inside the top modal; tabs have aria-labels.
- VIS-2/BB-7 (ui side): the wallpaper tool paints the face under the cursor (`pickEdge().side`, fallback
  `edgeSideFacing`); Shift+click or the "Cômodo inteiro" switch → `paintRoomWalls`; the floor tool's Shift/switch →
  `paintRoomFloor` (preview of the room tiles and cost).
- §2: Build tool **Cômodo** (drag a tile rectangle; preview = perimeter edge ghost + tile ghost + `estimateRoom` cost +
  `wallWarnings`; release → `buildRoom` with the chosen floor or "Sem piso"). Undo stack (max 20 snapshots, taken
  before each Buy/Build change, cleared when leaving those modes): Ctrl/Cmd+Z and the "Desfazer" button in the
  drawer head. Placement tip: price + "Ambiente +N neste cômodo" + amber warnings; floor/wallpaper tips show the
  Ambiente change too.
- Improvements: self menu on the selected character (Cancelar tudo / Ir para dentro de casa / Ver necessidades);
  low-mood pies highlight the allowed need actions (green ring) with one note instead of a wall of reasons; when the
  selected character leaves the lot a toast offers "Controlar <nome>"; move-in checklist card (cama, geladeira, fogão,
  balcão, vaso, chuveiro/banheira, porta) that ticks itself; catalog search, sort (Preço/Nome) and "Só o que dá pra
  comprar"; selection toolbar with rating chips + "Comprar outro igual"; pie title "Rita → <alvo>"; rotation pivots
  on the cursor tile; touch: one-finger pan with door/window/wallpaper tools (tap acts); Create-family requires all
  25 points ("Distribuir o resto" button); catalog thumbnails pre-rendered in idle time 2.5 s after boot; bubbles
  positioned with one read pass then transform writes (no left/top).

### Test status (end of the UI fix round, against the other modules' current files)
- `tools/fix_ui_test.mjs`: 32/32 at 1280×800, 32/32 at 390×844 touch, 32/32 at 768×1024.
- `integrate_flows.mjs` desktop and 390×844 touch: 0 failures; `integrate_services.mjs`: 0 failures;
  `integrate_misc.js` OK; `ui_check.mjs --script ui_scenario.mjs`: same results as before the round.
- Test updates (behaviour changed on purpose): `integrate_services.mjs` accepts the job in the new offer card;
  `ui_scenario.mjs` aims at a visible free tile / yard corners because the camera now re-frames beside the drawer.
- QA repro reruns (`sh tools/fix_ui_qa_rerun.sh`): qa_live_dead 0 px blocking (desktop and phone), qa_live_helpkeys
  speed stays 1 after Space, qa_live_meal centre click opens "Pegar um prato e comer" / "Recolher prato",
  qa_live_social job label not clipped, qa_live_layout phone 2 toasts clear of #cam + "Toque numa vaga" + mood ✓,
  qa_vis_hud no clipped/overlapping HUD elements at 1280×800, qa_vis_widths no #cam overlap at 761/768,
  qa_bb_misc Delete only arms the sale. Two QA metrics cannot see the fixes: qa_cr_a11y emulates Tab order in DOM
  order and ignores `inert` (real Tab presses stay in the modal — fix_ui_test CR-11), and qa_bb_misc2 samples the
  door tip from Node with wall-clock waits that are longer than the 1.8 s flash in software GL (fix_ui_test BB-6
  records every tip change with a MutationObserver: success tip held 1800 ms, then the neutral "Já é uma porta").
- Software-GL note: frames take ~1 s in this container, so the camera eases slowly; the drawer re-frame therefore
  snaps the camera (`setCamera` after `pan`) so taps right after opening Buy/Build land where aimed.

### Integration pass (after the fix round)
- Save chip: shows the slot from the `'saved'` payload (`slotLabel`, or `M.main.slotLabel()`), e.g. "Salvo ☁️ · Espaço 2";
  tooltip "Espaço 2 · Família X". main.js's fallback append no longer fires.
- Pause chip: non-mode pause reasons use `M.main.pauseLabel()` ("Pausado · Janela aberta").
- Buy mode: a floor click inside a (non-wall, non-system) object's footprint selects it (`M.world.objectAt`).
- Phones: collapsing/expanding the catalog sheet refreshes `M.render.setViewInsets` (no camera move).
- index.html: ≥ 761 px, the Build drawer height hugs its content (`#hud[data-mode="build"] #drawer { bottom: auto }`).
- New family on an empty lot (`reset({kind:'new'})` with no walls): the camera frames a point 55 % of the way from the
  selected character (at the mailbox) to the lot centre, so the phone view shows the lot instead of the road.
