# M.data + M.engine — notes for other modules

Files: `js/data.js` (M.data), `js/engine.js` (M.engine). Tests (Node): `node tools/engine_test.mjs`
(scoring unit tests, API tests, 4-day autonomous run with time budget, save round-trip) and
`node tools/engine_scenarios.mjs` (phone/services, guests, walk-bys, jobs, collector, night shift, firing,
neglect, 6 seeds, empty lot with 4 members, damaged saves). Trace tool: `node tools/engine_trace.mjs --days 2 --sim Rita`.
Browser demo (2D top-down, no THREE): `node tools/engine_check.mjs --query "ff=600&speed=30" --shot out.png`.

## M.engine public API (contract + additions)
Contract: `init(state)`, `newGame(opts)`, `update(dtSimMinutes)`, `state` (getter), `mood(sim)`, `moodColor(sim)`,
`getInteractions(simId, objId)`, `getSocials(simId, targetSimId)`, `queueInteraction(simId, objId, key, source='player', opts?)`,
`queueSocial(simId, targetSimId, key, source='player')`, `queueWalk(simId, x, y)`, `cancelAction(simId, actionId)`,
`buyObject(type, x, y, rot)`, `sellObject(objId)`, `moveObject(objId, x, y, rot)`, `buildWall(edgeKey, t, c)`,
`paintFloor(x, y, idx)`, `paintWall(edgeKey, idx)`, `payBill(billId)`, `setFreeWill(bool)`, `addSim(spec)`, `removeSim(id)`,
`characters()`.

Additions:
- `household()`, `visitors()`, `simById(id)`, `objectById(id)`, `npcById(id)`
- `selectSim(id)` → sets `state.settings.selectedSimId` (household only) and emits `'select' {simId}`.
- `setSpeed(0..3)` (just stores `state.speed`; M.main owns real speed).
- `allAsleepOrAway()` → true when every household member is asleep or off-lot (for the 30× ultra speed rule).
- `sellValue(objId)` (refund preview), `wallCost(edgeKey, t)` (negative = refund), `floorCost(x, y, idx)`.
- Jobs: `jobOffers()` → `[{track, source:'jornal'|'computador', name, icon, title, pay, start, end, days}]`,
  `acceptJob(simId, track)` → `{ok, reason}`, `quitJob(simId)`.
- `careerInfo(simId)` → `{track, trackName, icon, level, title, pay, start, end, days, hours, performance,
  daysWorked, missedDays, friends, atWork, nextShift, next: {title, pay, start, end, req:{skills, friends}, met:{skills:{k:bool}, friends:bool}} | null}` or null.
- `familyFriends()` (career friend count), `relationships(simId)` → `[{id, name, daily, lifetime, friend, household, known}]`,
  `phoneBook()` → `[{id, name, onLot}]`, `totalBills()`, `netWorth()`, `slotsFor(objId)` (engine-computed slots).
- `debug`: `scoreAds(motives, mood, ads)`, `effectiveAds`, `runAutonomy`, `curve(k, m)`, `throwErrors` (set true in tests:
  exceptions propagate instead of being logged), `lastError`.

`newGame(opts)`: `{seed}` optional (deterministic). Default = Família Alves starter house, M$ 6.500, Rita + Caio
(Caio: Negócios L1 09–15, Seg–Sex; carpool at 08:00 on day 1), 8 neighbours (3 already known). `{empty: true,
members: [{name, gender, colors, personality, skills, career?}], householdName}` → empty lot (mailbox + sidewalk
only), M$ 20.000. newGame calls `init()` itself; calling `init(state)` again is harmless.

`update(dt)`: any dt (internally split into ≤ 0.5 sim-minute steps; capped at 240 per call).

Events on `M.util.bus`: `'notify' {text, kind, id}`, `'money' {money, delta, reason}`, `'objects'`, `'lot'`, `'sims'`,
`'time' {day, minute}` (every sim minute), `'day' {day}`, `'bubble' {simId}`, `'select' {simId}`.
Notification kinds: info | good | bad | career | money.

## Interactions in pie menus (UI)
`getInteractions` returns `{key, label, icon, enabled, reason}`; state-dependent entries that do not apply are hidden
(Consertar only when broken, Limpar only when dirty, Pagar contas only with bills…). Broken objects only show repair.
**Dynamic keys** (just pass them back to `queueInteraction`):
- `job:<track>` on the newspaper (the day's offer) and on the computer (3 offers, after "Procurar emprego" that day).
- `call:<npcId>` / `invite:<npcId>` on the phone (the menu itself only lists the generic "Ligar para um vizinho" /
  "Convidar alguém"; a UI can build a submenu from `phoneBook()`).
Player commands are refused (bubble ✋ + 'bad' notification) when unavailable, and non-need commands are refused when
mood < −60. Queue: max 8 player actions; `action.label/icon/phase/source` drive the queue strip (`phase !== 'do'` =
walking there; `source === 'auto'` = free will, draw faded). `cancelAction` on the running action makes it exit
gracefully (stand up first).

## State additions (all JSON)
`state.rngState` (seeded RNG, survives saves), `state.jobs = {day, computer:[track×3], computerSeen}`,
`state.events = [{id, kind:'guest'|'repair'|'maid'|'pizza', at, npcId?}]`, `state.walkbyAt`,
`state.stats.{earned, spent}`. NPC: `known`, `lastCallDay`. Bills: optional `kind: 'bill'|'hospital'|'service'`.
Career: `{track, level, performance, daysWorked, missedDays (consecutive), hiredAt, lastShift, alarmFor, moodAtDeparture, critAtDeparture}`.
Sim: `data` = engine-private bag (nextAutoAt, socialLog, awayUntil, leaving, …) — read-only for others.
Roles: contract roles `guest | repair | maid | pizza` plus **`walkby`** (neighbour on the sidewalk; only "Cumprimentar"
is offered; greeting turns them into a `guest`) and **`collector`** (bill collector).
Relationships of household members toward neighbours are keyed by **npc id** (`sim.relationships[npc.id]`); a guest on
the lot is a visitor character with `npcId` pointing at that record.
Action extra fields: `prio` (2 auto, 40 urgent/carpool/social reply, 50 player, 100 critical), `stage`, `tgtId`,
`useObjId` + `slotIdx` (reserved slot — may be a nearby seat for TV/books), `effect`, `rates`, `caps`, `data`
(`data.run` = running, 3× speed; `data.respond` = the partner side of a social).

## Object state fields (render/models may read)
- `broken`, `dirty` (**0..1000**, visibly dirty ≥ 500 = `M.data.DIRT.visible`), `uses`, `immuneUntil`.
- Lamps: `on === false` = switched off (interaction "Desligar/Ligar a luz").
- Beds: `unmade` (after sleeping; "Arrumar a cama").
- Plants: `water` 0..100, `dryHours`, `dead`.
- `meal`: `servings`, `quality` (hunger per serving), `food: 'home'|'pizza'`, `spoiled`, `spoilAt`, `burnt`, `cook`.
- `dirty_plate`: `spoiled`, `spoilAt`. `newspaper`: `offer` (track), `read`, `day`.
- `carpool`: `car` (cosmetic: `hatch | sedan | van | executive | limo | police`), `shift`, `simIds`, `leaveAt`.
  Placed on the last row (y = h−1) with rot 2, front (doors) facing the house.
- Easel: `paintProgress` (hours, a painting sells every 3 h of painting).

## Characters (render)
`anim` uses only the ARCHITECTURE list. `seated` is true for on-slot use and for desk/table/piano/chess/TV-from-seat;
`asleep` true while sleeping/napping/fainted (fainting = `anim 'sleep'` on the floor, not on a bed). Exact pose
positions come from slot `ox/oy` offsets (beds: the routing tile is the foot row, the pose is the bed centre;
bathtub/piano: centred on the 2-wide object). Watching TV from a sofa uses `anim 'sit'`; reading on a sofa uses
`'read'` with `seated: true`; eating at a table uses `'eat'` with `seated: true`.

## M.data additions
Tables: `MOTIVE_ICONS`, `SCORED`, `RATE`, `SKILL_ICONS`, `SKILL_TRAIT`, `SKILL_GAIN`, `PERSONALITY_OPPOSITES`,
`PERSONALITY_POINTS`, `WALL_TYPE_KEYS`, `DEMOLISH_REFUND`, `CATALOG_LIST`, `CAREER_RULES`, `SOCIAL_RULES`, `CURVES`,
`ATTENUATION`, `ATTENUATION_VISITOR`, `AUTONOMY`, `MONEY`, `MEAL`, `CRITICAL`, `SLEEP`, `WALK`, `PLANT`, `DIRT`,
`REPAIR`, `ROOM_IMPACT`. Helpers: `curve(motive, m)`, `def(type)`, `interaction(type, key)`, `varyMultiplier`,
`rateMultiplier`, `adAmount(ad, personality, skills)`, `roomRatingFromPrice`, `roomImpact(obj, isNight)` (used by
M.world; excludes unmade beds, windows and — with isNight false — lamp light), `sellRefund(obj, day)`,
`shiftHours(level)`, `careerLevel(track, level)`, `sitRate/sitCap/funRate/funCap/sleepRate`.
FLOORS/WALLPAPERS entries have an extra `room` (0..3) quality value (M.world uses it).
ObjectDef extras: `ratings` (catalog display, omit zeros), `skills` (skill icons for the catalog card), `seat`,
`dining`, `approach: 'adjacent'`, `breakLabel`, `capacity`. Slot extras: `ox, oy` (pose offset, may be negative).
Slot `facing` is radians at rot 0 in the character convention (world = facing − rot·π/2).
InteractionDef extras: `caps` (max value per motive, Set-Motive-Change style), `rateVary` (fun rate × 0.5..1.5 by trait),
`maxDuration`, `seatOk` (may be done from a nearby seat), `seated`, `atten` ('none'|'low'|'medium'|'high'),
`visitors` (guests may use it), `approach` (override), `data`. Ads are `{min, delta, vary}` (vary: trait, '-trait' for
the inverted trait, or a skill); amount = min + delta·p (DESIGN rule). Ads may target `mood` (used for chores like
paying bills and repairing).

## Deviations / design decisions (documented)
- **Meal hunger** uses RESEARCH's documented formula (16 + fridge 9/16 + counter 16 + stove 32 + 1.5×cooking ≈ 73 at
  skill 0) instead of DESIGN's 25 + 6×cooking, which made meals far too small to sustain a day. Snack = 20 (+10 deluxe
  fridge) as in DESIGN. Pizza = 4 servings × 40 hunger. The last serving takes the platter (no extra plate).
- **Sleep**: wake rule at 06:00 if energy ≥ 80 (TS1: 07:00) so 09:00 workers have a morning; while it is night
  (21:00–05:59) a sleeper keeps sleeping even with full energy (prevents 3 a.m. wake-ups); daytime sleep ends at 95.
  Autonomy multiplies sleep/nap Energy ads by a circadian table, applies a night "sleep pressure" to the Energy value
  used for scoring, and gates beds by hour (`AUTONOMY.circadian / sleepPressure / sleepGate / napGate`). Result: bed
  ~21:00–22:30, up at 06:00, ~8–10 h in bed.
- Employed characters get an implicit **alarm** 2 h before the shift (if energy ≥ 30) and walk to the carpool
  automatically 25 min before the shift (even with free will off). Autonomy avoids starting long actions that would
  not finish before that.
- **Social autonomy** scales friendly social ads by the predicted acceptance chance (check-tree style), so characters
  rarely try kisses that will be rejected; rejection Social penalties were halved.
- Free will cadence: 2–4 sim-min pause after an action, then retries every 4–8 sim-min while idle (DESIGN 4–8);
  5 min after a player command. Idle characters sometimes take a short stroll in their room.
- Hard override: Bladder/Hunger ≤ −85 or Energy ≤ −90 interrupts any non-critical action (even player ones) and runs
  autonomy restricted to that motive.
- Dirt uses the canonical 0..1000 scale (M.world reads ≥ 500 as dirty); repairs and cleaning approach from any
  free adjacent tile (`approach: 'adjacent'`).
- Mood = plain average of the 8 motives (canonical TS1.0).
- Bills: 1.5 % of current object value + M$ 50 every 3 days at 09:00; due after 3 days; collector at 10:00 on the due
  day takes objects worth amount + 20 %. Hospital (M$ 500) and unpaid service fees become bills.
- Paying bills is autonomous (a Mood ad scaled by Neat, stronger when a bill is due within a day, only when the money
  covers all bills); neat characters (≥ 6) wash hands after the toilet and clean more eagerly; anyone may repair
  broken things autonomously (slowly; mechanical skill makes it likelier and faster). Cooking makes one serving per
  household member at home and awake, plus guests.

## For M.main
Bootstrap: `state = loaded || M.engine.newGame()`, `M.engine.init(state)`; loop: `M.engine.update(simMinutes)` (any
size), Buy/Build modes simply stop calling update. Use `M.engine.allAsleepOrAway()` for the 30× rule.

## QA fix round (CONTRACT_V2) — engine side, what changed for other modules
Tests: `node tools/fix_engine_test.mjs` (all fixes + contract API), `node tools/fix_engine_sofa.mjs`,
`fix_engine_socwait.mjs`, `fix_engine_socials.mjs`, `fix_engine_guests.mjs` (Node); in-page smoke test:
`node tools/integrate_check.mjs --clear --nohelp --eval tools/fix_engine_page.js`.

### New / changed API (all old calls keep working)
- **`M.engine.lastReason`** (getter, pt-BR) — set whenever a *player* `queueInteraction / queueSocial / queueWalk`,
  or any `buyObject / sellObject / moveObject / buildWall / buildRoom / paintFloor / paintWall / paintRoomWalls /
  paintRoomFloor / payBill` call refuses (returns false / ok:false); reset to `''` at the start of each such call.
  Internal autonomous calls never touch it. **Refused player commands no longer emit a 'notify'** (they still show a ✋
  thought bubble): the UI toasts `lastReason` (CONTRACT_V2 §3). Failures that happen later (route failed, slot taken)
  still notify.
- Queue cap: at most 8 actions per character (player commands + urgent/critical ones, cancelled head excluded) →
  `lastReason = 'A fila de ações está cheia (máx. 8).'`. Walks count too.
- `queueWalk(simId, x, y, opts)` (also the old `queueWalk(simId, x, y, source, opts)`): a player click while the current
  action is a player walk **redirects** it (same action id, new x/y, re-routed from where the character is); if the last
  queued action is a pending player walk it is retargeted instead. `opts.append` (Shift+click) appends.
- `pendingDeliveries()` → `[{ kind: 'pizza'|'repair'|'maid'|'guest', label, at }]` (scheduled events + a pizza courier
  walking to the door). A second pizza order is refused while one is pending/queued (`'Já tem uma pizza a caminho.'`;
  the pie entry is disabled with that reason).
- `homeTile(simId)` → `{x, y}` indoor walkable tile next to the nearest bed (else inside the front door).
- **Notifications**: bus `'notify' { text, kind, id, focus? }`, `focus` = `{simId}` | `{objId}` | `{x, y}`; the stored
  notification keeps `focus`. The same text+kind within 60 sim-min is merged: the stored entry gets `count` (2, 3…) and
  `lastDay/lastMinute`, and the bus emits **`'notifyRepeat' { id, text, kind, count }`** instead of a new 'notify'.
- `paintWall(edgeKey, idx, side = 'both')` — side `'A'|'B'|'both'`, charges the wallpaper price **per side changed**
  (default 'both' = 2 sides). Wall entries get `cA`/`cB` (normalized back to `c` when both sides match). After in-place
  edits the engine calls `M.world.rebuild()`. `buildWall` keeps `cA/cB` when a wall becomes a door/window.
- `paintRoomWalls(x, y, idx)` → `{ ok, cost, count, reason }` (inward side of every wall/door/window of the region at
  x,y; uses `M.world.roomEdges` when present, else computes it). `paintRoomFloor(x, y, idx)` → same shape, indoor rooms
  only (outdoor → reason). Both all-or-nothing on money.
- `estimateRoom(x1, y1, x2, y2, floorIdx|null)` → `{ ok, cost, walls, tiles, reason }`; `buildRoom(...)` → `{ ok, cost,
  reason, walls, tiles }`. Perimeter of the inclusive tile rect (via `M.world.edgesOfRect`), existing wall entries are
  skipped, segments refused by `M.world.canBuildWall` (objects in the way) make it fail; optional floor inside.
- `snapshotBuild()` → deep clone `{ lot, objects, money, nextId }`; `restoreBuild(snap)` → `{ ok }`: replaces lot,
  objects, money (`nextId` = max of both so ids are never reused), re-inits world caches, drops queued actions whose
  objects vanished, moves characters out of newly blocked tiles, emits 'lot', 'objects', 'money'.
- `debug.candidates(simId, restrict?)` → sorted autonomy candidates (for tuning/tests).

### Behaviour changes worth knowing (render/UI)
- New interaction **`sleep_sofa` "Dormir no sofá"** on `sofa_cheap`, `sofa_lux`, `armchair` (effect `sleep_sofa`,
  anim `'sleep'`, `asleep: true`, seated on the slot like the nap). Autonomy only uses it when no bed slot is free.
- Faint (`_faint`) now ends at energy ≈ −40 (was +20) and never ends because of the bladder (the accident happens while
  fainted); one notification per episode. A worker who faints right before the shift comes to for the carpool.
- The automatic walk to the carpool has priority 60 (> player 50): a running player action is interrupted
  ("… parou o que estava fazendo para pegar a carona.").
- Night shifts: pre-shift sleep window (7 h before; alarm 50 min before the shift for a sleep started inside the alarm
  window), post-shift sleep allowed; work drain on return never pushes a motive below −80; no promotion roll for 3
  shifts after a demotion; promotion text warns about night shifts.
- Moving/selling/repossessing an object in use ends the user's action **immediately** (idle, not seated, moved to the
  exit/nearest walkable tile) — no update needed while Buy/Build is paused. Cancel hooks run (cooking refunds).
- Characters never stand inside each other on purpose: idle characters step aside (`sim.data.nudge` = short lerp, anim
  'walk'), slots under busy/talking characters are skipped, social meeting spots avoid object slots and tiles another
  character is heading to, exits avoid occupied tiles. A responder left on furniture steps off before the social.
- Socials: one candidate per partner (the best) before the top-4 cut, per-pair fatigue (`sim.data.fatigue`), same-social
  repeat penalties over 24 h (`sim.data.socialLog`, now 30 entries); guests use mean socials only when they already
  dislike the host (daily ≤ −10); social waits for a busy partner end after 1.5–2 min (player: 10–12 min).
- Purposeful downtime: in a good mood with no low need, skill objects advertise a 'mood' gain by personality fit and
  next-career-level requirements, fading with practice already done today (`sim.data.practice`); `study_*` and mirror
  `speech` are now autonomous (auto sessions end after 90 min or when a need gets low).
- Requirements are re-checked when a queued action starts: chores no longer needed are dropped quietly (no 'bad'
  toast; player commands get a ❔ bubble). "Pagar contas" with no bills → info 'As contas já estavam pagas.'.
- Cooking makes servings for the cook plus members/guests at home, awake and with hunger < 60; the meal object keeps
  `diners: [simId]` and those people are called to eat as soon as they are free (an autonomous pastime is interrupted;
  player commands, socials and the bathroom are not). Nobody snacks while dinner is on the stove (unless hunger ≤ −60).
  Without a free table seat, a diner steps 1–2 tiles away from the serving spot to eat standing. Someone waiting for
  the only free spot by a meal waits up to 6 min instead of giving up. (Spoiled meals, default family, 10 seeds × 8 days:
  2.2 → 0.6.)
- Bill collector re-checks what is owed at the door, waits while someone is paying at the mailbox, takes objects worth
  at most owed + 20 % and keeps any uncovered rest as a new bill (`debt: true`, due next day) — no silent forgiveness.
- Gendered texts everywhere (Técnica/Técnico, Entregadora/Entregador, Faxineira/Faxineiro, "A/O oficial de cobrança",
  demitida/demitido, levada/levado, rebaixada/rebaixado, ocupada/ocupado). Service events carry `gender` and `first`.
- Starter furniture has `boughtDay: 0, starter: true` (depreciated resale from day 1).
- Empty-lot households start knowing 2 neighbours; a walk-by while nobody is home is postponed until someone returns
  (until 20:00).
- Performance: slots, object rooms and tile→object maps are cached per layout (key: `M.world.version` + engine change
  counter + object count); at most 2 full autonomy evaluations per tick (others retry next tick). 239 objects,
  4 residents: 14.4 s → 2.3 s CPU per sim-day, p99 step 41.6 → 6.3 ms (`node tools/fix_engine_perf.mjs`, CPU time).
  The rest of the cost is `M.world` queries (world.js `ensure()` hashing every object per query — world owner's side).

### M.data changes
- `CRITICAL`: `faintWake −40`, `faintWorkWake −95`, `faintRenotify 120`, `hospitalHunger −99.5`, `wakeBladder/wakeHunger
  −85` (= overrides), `workFloor −80`, `needLow −50`. `DECAY.hunger.constant 0.4`/h.
- `AUTONOMY`: `sofaSleepGate`, `sofaSleepAd`, `purpose*`, `fatigueHalfLife/fatigueK/repeatDayWindow/repeatDayK/
  repeatAnyK/relBoostCap`, `perTick`. `CAREER_RULES`: `preNapHours, napAlarmBefore, nightShiftFrom/To, promoCooldown,
  critMotives` (hunger, energy, bladder, hygiene). `SOCIAL_RULES`: `waitBusy, waitRespond, guestMeanBelow,
  knownAtStartEmpty, walkbyLatest`.
- Economy: career pay = research pay × 1.6 + 100 (Negócios L1 M$ 290 … L10 M$ 2.020), `foodPerServing` 10. Default
  family ≈ +M$ 200/day over 10 days (was ≈ +M$ 10/day).
- Ads: `tv_cheap` watch 16+24, bookshelf read 15+18, phone call 8+22, greet 15+20, dance/tickle toned down.
- `sellRefund` treats `boughtDay: 0` correctly (owned days counted from day 0).

### Integration pass (after the fix round)
- `sanitizeState` also drops `null` / non-object entries of `npcs`, `notifications`, `events` (CR-4, direct calls).
- Per-layout caches: `isSlotTile` / `buildTileMaps` build into locals first (a nested query could reset the shared
  caches mid-build and crash `stepSocial`, seen in `qa_verify_sim_11`).
- Bill collector at the door: waits up to 12 sim-min while a resident's head action is `pay_bills` in route/walk
  (on the way to the mailbox), and up to 8 sim-min from when paying starts (enter/do/exit).
- Critical-need override (`overrideCritical`): it now looks for a fix **before** cancelling the current action. When
  nothing can address the critical motive (no food / toilet in reach), the current action goes on (sleep re-checks
  only every 90 sim-min) instead of being cut every 20 min; `sleep_sofa` counts as sleep for a critical energy.
- Sleep / nap wake on a critical bladder or hunger (`needWake`): if the previous such wake fixed nothing (same motive,
  still within +10 of the value it woke at, < 180 min ago) the character sleeps on. In the QA `noneeds` scenario
  (bed, fridge and toilet sold) the 3-minute sofa-sleep ping-pong is gone: exhaustion faints 10 → 0 in 8 days.
