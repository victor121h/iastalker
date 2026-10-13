# Morada — architecture contract

Original browser life-sim (Portuguese UI). Gameplay inspired by classic life-sims; NO third-party
names, trademarks, art, sounds or code. Never use the words "Sims", "Simoleon", "plumbob", "Maxis",
"EA" anywhere in code, UI or comments. Money symbol: `$` displayed as `M$` ("moedas").
Mood indicator above the selected character: a floating glowing ORB (sphere), never a diamond.

## Files (all plain scripts, NO ES modules, loaded in this order by index.html)

```
index.html          shell: <title>, <style>, HUD markup, <script> tags
vendor: three.js r128 UMD from https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js (global THREE)
js/util.js          M.util   – helpers, seeded RNG, event bus, clamp/lerp, ids, formatting
js/data.js          M.data   – constants, motives, catalog of objects + interactions, careers, skills, socials, palettes
js/world.js         M.world  – lot grid, walls on edges, floors, placement/occupancy, rooms, A* pathfinding
js/engine.js        M.engine – simulation (time, motives, mood, actions, autonomy, careers, money, relationships)
js/models.js        M.models – procedural low-poly THREE meshes for every object `model` key + character rig
js/render.js        M.render – THREE scene, camera rig, lot/walls/objects/characters sync, lighting, picking, ghost
js/save.js          M.save   – serialize/restore; artifact `db` capability with localStorage fallback
js/ui.js            M.ui     – all DOM HUD + input handling for Live / Buy / Build modes, pie menu, modals
js/main.js          M.main   – bootstrap + game loop
```

Every file is wrapped as:
```js
(function (M) {
  'use strict';
  // ...
  M.world = { /* public API */ };
})(window.M = window.M || {});
```
Modules only reference each other through `M.xxx` at call time (never at load time), so load order
only matters for index.html/main.js. No module touches another module's private state.
No `alert/confirm/prompt` (they do not work in the host frame) – build confirmations into the UI.

## Coordinates

- Lot: `w` × `h` tiles (default 24 × 20). Tile `(x, y)`, `0 <= x < w`, `0 <= y < h`.
- 3D: tile (x,y) occupies world X ∈ [x, x+1], world Z ∈ [y, y+1]; ground at Y = 0; 1 tile = 1 unit;
  wall height 2.6 units; character height ≈ 1.7 units.
- A character position is float tile coords `{x, y}` where `(x+0.5, y+0.5)` is a tile center.
  World position = `(x + 0.5, 0, y + 0.5)`.
- Facing / rotation: `rot` ∈ {0,1,2,3}. rot 0 = object front faces +Z (south, toward larger y);
  rot 1 = front faces -X (west); rot 2 = front faces -Z (north); rot 3 = front faces +X (east).
  Character `facing` is radians around Y, 0 = looking toward +Z, increasing counter-clockwise when
  viewed from above, i.e. `dir = (sin(facing), cos(facing))` in (x, y) tile space.
- Edges (walls): key strings
  - `"h,x,y"` = horizontal edge on the TOP side of tile (x,y) (between (x,y-1) and (x,y)); 0<=x<w, 0<=y<=h
  - `"v,x,y"` = vertical edge on the LEFT side of tile (x,y) (between (x-1,y) and (x,y)); 0<=x<=w, 0<=y<h

## Game state (plain JSON — this exact object is what save.js stores)

```js
state = {
  version: 1,
  householdName: 'Família Alves',
  seed: 12345,
  nextId: 100,                       // M.util.nextId(state) increments
  time: { day: 1, minute: 480 },     // minute of day 0..1439; day counts from 1; weekday = (day-1)%7 (0=Seg)
  speed: 1,                          // 0 pause, 1 normal, 2 fast, 3 ultra
  money: 20000,
  lot: {
    w: 24, h: 20,
    floors: [/* w*h ints, index into M.data.FLOORS; 0 = grass */],
    walls: { /* edgeKey: { t: 1|2|3, c: <wallpaper index> } ; t 1 wall, 2 door, 3 window */ },
  },
  objects: [ { id, type, x, y, rot, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0 } ],
  // x,y = footprint origin tile (min x, min y of the rotated footprint)
  sims: [ /* Sim, see below */ ],
  npcs: [ { id, name, gender, colors, personality, relationships:{} } ], // neighbours known by phone/visits
  bills: [ { id, amount, dueDay } ],
  lastBillDay: 1,
  notifications: [ { id, day, minute, text, kind: 'info'|'good'|'bad'|'career'|'money' } ], // keep last 30
  settings: { freeWill: true, wallMode: 'cutaway', selectedSimId: null },
  stats: { daysPlayed: 0 },
}

Sim = {
  id, name, gender: 'f'|'m', colors: { skin, hair, shirt, pants },   // css hex strings
  personality: { neat, outgoing, active, playful, nice },             // ints 0..10, sum 25
  motives: { hunger, comfort, hygiene, bladder, energy, fun, social, room }, // floats -100..100
  skills: { cooking, mechanical, charisma, body, logic, creativity },      // floats 0..10
  career: null | { track, level, performance: 0, daysWorked: 0, missedDays: 0 },
  relationships: { [otherId]: { daily: 0, lifetime: 0 } },              // -100..100
  x, y, facing,                     // float tile position + radians
  queue: [ /* Action */ ],          // queue[0] is the current action
  anim: 'idle',                     // idle|walk|sit|sleep|eat|cook|shower|bath|toilet|wash|read|tv|computer|talk|dance|exercise|paint|chess|clean|phone|piano|cry|wave|joke|hug|kiss|angry|laugh|stretch|use
  bubble: null | { kind: 'think'|'talk', icon: '<emoji>', until: <absolute sim minute> },
  atWork: false, workReturnAt: 0,   // absolute sim minutes (day*1440+minute)
  hidden: false,                    // off-lot (work, hospital) – not rendered, not simulated
  visitor: false, npcId: null, role: null, leaveAt: 0,   // visitors/services: role 'guest'|'repair'|'maid'|'pizza'
  lockouts: { /* 'objId:interaction' : untilAbsMinute */ },
  asleep: false, seated: false,
}

Action = {
  id, kind: 'object'|'social'|'walk'|'work',
  objId: null|id, interaction: '<key>', targetSimId: null|id,
  x: null, y: null,                 // for walk
  source: 'player'|'auto',
  phase: 'route'|'walk'|'enter'|'do'|'exit'|'done',
  path: [ {x,y} ], progress: 0, slot: null|{ x, y, facing, on: bool },
  elapsed: 0,                       // sim minutes in 'do'
  label: '<pt-BR text shown in queue>', icon: '<emoji>',
  cancel: false,
}
```
Absolute sim minute: `abs = (state.time.day * 1440) + state.time.minute` (helper `M.util.absMinute(state)`).

## M.data (static tables; pure data + tiny pure helpers)

```js
M.data.MOTIVES = ['hunger','energy','comfort','fun','hygiene','social','bladder','room']
M.data.MOTIVE_LABELS = { hunger:'Fome', energy:'Energia', comfort:'Conforto', fun:'Diversão',
  hygiene:'Higiene', social:'Social', bladder:'Bexiga', room:'Ambiente' }
M.data.DECAY       // per sim-hour, awake and asleep, per motive (+ personality modifiers)
M.data.SKILLS, M.data.SKILL_LABELS
M.data.PERSONALITY, M.data.PERSONALITY_LABELS   // neat: 'Organizado', outgoing: 'Extrovertido', active:'Ativo', playful:'Brincalhão', nice:'Gentil'
M.data.FLOORS  = [ { key, name, color, price } ]       // index 0 = grass (outdoor, free)
M.data.WALLPAPERS = [ { key, name, color, price } ]
M.data.WALL_PRICES = { wall: 70, door: 150, window: 110 }   // per edge (ESTIMATE ok)
M.data.CATALOG = { [type]: ObjectDef }
M.data.CATEGORIES = [ { key, label, icon } ]
M.data.CAREERS = { [track]: { name, icon, levels: [ { title, pay, start, end, days:[0..6], car, req: { skills:{...}, friends } } ] } }
M.data.SOCIALS = { [key]: SocialDef }
M.data.NAMES = { f:[...], m:[...], last:[...] }
M.data.PALETTES = { skin:[...], hair:[...], shirt:[...], pants:[...] }

ObjectDef = {
  type, name, cat, price, desc,
  w, h,                 // footprint at rot 0 (tiles)
  model: '<key in M.models>',
  room: 0..10,          // decorative/room contribution (negative for ugly/dirty things)
  light: false,         // lamps count as room light
  wall: false,          // must be placed against a wall (e.g. mirror, painting) – optional
  surface: false,       // counters/tables: can hold things (not required)
  slots: [ { dx, dy, facing, on } ], // at rot 0, relative to footprint origin. on:true = sim stands ON
                        // the object tile (sit/lie/shower). on:false = sim stands on (dx,dy) which is
                        // OUTSIDE the footprint (usually dy = h, in front).
  interactions: [ InteractionDef ],
  ratings: { hunger, energy, comfort, fun, hygiene, social, bladder, room },  // 0..10 shown in catalog (omit zeros)
  buyable: true,        // false for system objects (mailbox, meal, dirty_plate, puddle, newspaper, carpool)
  noBlock: false,       // true: never blocks walking (rug, paintings, plates, puddles, newspaper, carpool)
  surfaceHeight: 0,     // for surfaces: world Y where meals/plates render (e.g. 0.8)
  breaks: 0,            // chance per use (0..1) to break; needs repair
  dirties: 0,           // dirt added per use
  capacity: 1,          // simultaneous users (bed/sofa may be 2)
}
InteractionDef = {
  key, label, icon,                     // label pt-BR, e.g. 'Tomar banho'
  anim,                                 // character anim while doing it
  rates: { hunger: +x, ... },           // motive change PER SIM-HOUR while doing it
  ads:   { hunger: n, ... },            // advertised value used by autonomy (0..100-ish)
  duration: 30 | null,                  // sim minutes; null = until the advertised motives are full
  minDuration: 10,                      // for null-duration actions
  until: ['energy'],                    // which motives end the action when >= 95 (with duration null)
  skill: null | 'cooking',              // skill gained
  skillRate: 0,                         // skill points per sim-hour
  cost: 0,                              // money cost when started (e.g. groceries for cooking)
  fun: false,                           // counts as entertainment
  auto: true,                           // allowed for autonomy
  slot: 'any'|index,                    // which slot to use
  effect: null | '<string key the engine knows>', // special: 'cook_meal','find_job','repair','clean','sleep','call_friend','read_paper','pay_bills'
  requires: null | '<string key>',      // e.g. 'broken', 'dirty', 'hasJobOffer', 'notBroken'
}
SocialDef = { key, label, icon, anim, minDaily, minLifetime, gainAccept:{daily,lifetime,social,fun}, gainReject:{...}, acceptBase, traits: { playful: +w, nice: +w, outgoing: +w } }
```

## M.util
```js
rng(seed) -> () => float in [0,1)            // mulberry32
clamp(v,a,b), lerp(a,b,t), dist(ax,ay,bx,by)
nextId(state) -> int
absMinute(state) -> int
fmtTime(minute) -> '08:00', fmtMoney(n) -> 'M$ 20.000', weekdayName(d) -> 'Seg'
emitter() -> { on(evt, fn), off(evt, fn), emit(evt, payload) }
M.util.bus = emitter()        // global event bus (see events)
deepClone(o)
```

## M.world (pure functions over `state.lot` + `state.objects`; no rendering)
```js
init(state)                              // builds caches (occupancy grid) from state
rebuild()                                // recompute caches after any lot/object change
inBounds(x,y)
getWall(edgeKey) -> null|{t,c}
setWall(edgeKey, t|0, c)                 // 0 removes; does not charge money
edgeBlocked(x1,y1,x2,y2) -> bool         // walls between orthogonally adjacent tiles (doors pass)
footprint(type, x, y, rot) -> [{x,y}]
rotatedSize(type, rot) -> {w,h}
canPlace(type, x, y, rot, ignoreId) -> { ok, reason }   // in bounds, no overlap, not crossing walls, slots reachable-ish
objectAt(x,y) -> obj|null
slotsFor(obj) -> [ { x, y, facing, on } ]   // world-space slots after rotation
isWalkable(x,y, allowObjId) -> bool
findPath(fromX, fromY, toX, toY, opts) -> [{x,y}] | null  // A*, 8-dir, no corner cutting through walls/objects
roomAt(x,y) -> roomId|-1 ; rooms() -> [{ id, tiles:[...], indoor: bool, score: -100..100 }]
roomScore(x,y) -> -100..100            // based on floor, wallpaper, decor `room` values, lights, windows, dirt, size
setFloor(x,y,floorIdx)
```

## M.engine (simulation; no DOM, no THREE)
```js
init(state)                           // attaches state; calls M.world.init
newGame(opts) -> state                // starter lot with furnished house + 2 characters (Família Alves)
update(dtSimMinutes)                  // advance; main loop calls with fixed steps of <= 0.5 sim minutes
state                                  // getter to current state
mood(sim) -> -100..100
moodColor(sim) -> css color
getInteractions(simId, objId) -> [ { key, label, icon, enabled, reason } ]
getSocials(simId, targetSimId) -> [ { key, label, icon, enabled, reason } ]
queueInteraction(simId, objId, key, source='player') -> bool
queueSocial(simId, targetSimId, key, source='player') -> bool
queueWalk(simId, x, y) -> bool
cancelAction(simId, actionId)
buyObject(type, x, y, rot) -> { ok, reason, obj }
sellObject(objId) -> { ok, refund }
moveObject(objId, x, y, rot) -> { ok, reason }
buildWall(edgeKey, t, c) -> { ok, reason, cost }   // t 1 wall, 2 door, 3 window, 0 demolish (refund 50%)
paintFloor(x, y, floorIdx) -> { ok, cost }
paintWall(edgeKey, wallpaperIdx) -> { ok, cost }
payBill(billId) -> { ok }
setFreeWill(bool)
addSim(simSpec) ; removeSim(id)
characters() -> state.sims
```
Events emitted on `M.util.bus`:
`'notify' {text, kind}`, `'money' {money, delta}`, `'objects'` (objects changed), `'lot'` (walls/floors changed),
`'sims'` (sim added/removed or atWork changed), `'time' {day, minute}` (every sim minute), `'day' {day}`,
`'bubble' {simId}`, `'select' {simId}`.

## M.models (THREE only; no game logic)
```js
build(modelKey, opts) -> THREE.Object3D        // object meshes; origin at footprint corner (min x, min z),
                                               // extent (w, h) tiles at rot 0, front facing +Z
character(sim) -> rig { root: Object3D, parts: {head, body, armL, armR, legL, legR}, setColors(colors) }
animate(rig, anim, t)                         // pose the rig procedurally for anim name at time t (seconds)
orb() -> Object3D                              // mood orb (sphere + glow), recolorable via .userData.setColor(css)
```

## M.render
```js
init(container, state)          // creates renderer/canvas/camera/lights, builds scene from state
frame(dtReal)                   // called every animation frame: sync characters, animate, render
syncAll() ; syncObjects() ; syncLot()   // rebuild from state (called on bus events 'objects'/'lot'/'sims')
pick(clientX, clientY) -> { kind: 'sim', id } | { kind: 'object', id } | { kind: 'tile', x, y } | null
pickEdge(clientX, clientY) -> { key, x, y } | null   // nearest wall edge under cursor (build mode)
pickTile(clientX, clientY) -> { x, y, fx, fy } | null  // fx,fy = float position on ground
setWallMode('up'|'cutaway'|'down')
rotate(dir)        // ±1 → 90° steps (animated)
zoom(delta)        // wheel
pan(dxPixels, dyPixels)
focus(x, y)        // center camera on tile
showGhost(type, x, y, rot, valid) ; hideGhost()
showEdgeGhost(keys[], valid) ; hideEdgeGhost()
showTileGhost(tiles[], valid) ; hideTileGhost()
setSelected(simId)
project(worldX, worldY, worldZ) -> { x, y, visible }   // screen px, for HTML overlays
simScreenPos(simId) -> { x, y, visible }               // head position for bubbles
```
Rendering details: perspective camera with low FOV (~30°) looking down ~45°, 4 rotation steps
(45°, 135°, 225°, 315° yaw), smooth zoom/pan; ACES or default tone; soft shadows from a sun
directional light; ambient hemi light; day/night lighting from `state.time.minute`; lamp objects
emit point lights at night (limit active point lights to ~8 nearest the camera target).
Wall cutaway: in 'cutaway' mode, walls whose outward normal faces the camera are drawn at
0.4 height; 'down' all walls short; 'up' full height.

## M.save
```js
init() -> Promise         // resolves db/user capabilities (may be null) – never blocks first paint
save(state, slot='slot1') -> Promise<{ ok, where: 'cloud'|'local'|'none', error }>
load(slot='slot1') -> Promise<state|null>
list() -> Promise<[ {slot, savedAt, householdName, day, money, where} ]>
exportJSON(state) -> string ; importJSON(str) -> state|null (validates version)
```
Cloud = artifact `db` capability, per-viewer private doc: `db.collection('data/users/' + uid).doc(slot)`
with body `{ v: 1, savedAt, meta: {householdName, day, money}, json: JSON.stringify(state) }`.
Always also mirror to localStorage key `morada:<slot>` inside try/catch.

## M.ui
```js
init()                   // builds/binds DOM, input handlers on the render canvas
update(dtReal)           // per frame; throttle heavy DOM work to ~5 Hz
```
Modes: 'live' (Viver), 'buy' (Comprar), 'build' (Construir). Keyboard: 1/2/3 modes? No — use
P/Space pause, 1 2 3 speeds, Q/E rotate camera, WASD/arrows pan, wheel zoom, Esc cancel tool,
R rotate object while placing, Delete sell selected object.

## M.main
Bootstrap order: `M.save.init()` (async, non-blocking) → load last save or `M.engine.newGame()` →
`M.engine.init(state)` → `M.render.init(...)` → `M.ui.init()` → requestAnimationFrame loop.
Loop: real dt (clamped ≤ 0.1 s) × speed factor → sim minutes; step engine in ≤ 0.5 sim-minute
substeps; then `M.render.frame(dt)` and `M.ui.update(dt)`.
Speed factors (sim minutes per real second): pause 0, normal 1.0, fast 3.0, ultra 10.0;
when every character is asleep or at work, ultra may be 30.
Expose `window.__morada = { M, get state() }` for automated tests.
