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
