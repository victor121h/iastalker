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
