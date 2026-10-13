# Integration notes

## QA fix round — integration pass (CONTRACT_V2)

The five owners changed engine/data, world, render/models, ui/index and save/main in parallel against
CONTRACT_V2.md. This pass checked every cross-module seam end to end in the real page, ran all suites, re-ran the
QA repro and verify scripts on the integrated build and fixed what still failed.

### Seams verified end to end (real input in the page)
| CONTRACT_V2 | path checked | how |
|---|---|---|
| §1 wallpaper per side | `render.pickEdge().side` → ui paper tool → `engine.paintWall(key, idx, side)` → `world.setWallColor` → render faces | `integrate_flows_v2` build.wallpaperOneSide (other side unchanged, M$ 10) |
| §1 whole room | Shift+click / "Cômodo inteiro" → `engine.paintRoomWalls` (via `world.roomEdges`) | build.wallpaperWholeRoom (14/14 inward sides) |
| §1 floor fill | Shift+click / toggle → `engine.paintRoomFloor` (via `world.roomTiles` + `isIndoor`) | build.floorFill (12/12 tiles) |
| §2 room tool | drag → `engine.estimateRoom` (tip + `world.wallWarnings`) → `engine.buildRoom` | build.roomTool (14 walls, "⚠ O cômodo fica sem porta") |
| §2 undo | `snapshotBuild` before each change → Ctrl+Z / Desfazer → `restoreBuild` | buy.undo, build.undoChain (5 steps back to the start money) |
| §2 warnings / Ambiente | `world.placementWarnings` / `roomScoreWith*` → placement, floor and wallpaper tips | buy.ambienteTip ("Ambiente +6 neste cômodo") |
| §3 lastReason | refused queue → ✋ bubble + `engine.lastReason` → ui toast | live.refusalToast ("A fila de ações está cheia (máx. 8).") |
| §3 walk redirect | floor click → `queueWalk(.., {append:false})` redirects; Shift+click appends | live.walkRedirect |
| §3 pendingDeliveries / focus | ETA chip, toast "Ver" → `render.focus` | fix_ui_test §3 |
| §3 homeTile | self menu "Ir para dentro de casa" → `engine.homeTile` → walk | live.selfMenu (indoor tile next to the bed) |
| §4 pick order | meal on a counter: `render.pick` item → ui `resolveTarget` (world.itemAt) → pie "Pegar um prato e comer" | live.foodOnCounterPie |
| §4 walls-up override | painting card → `setWallsUpOverride(true)`, off after placing; bought painting stays visible (BB-5) | buy.paintingOverride |
| §4 hideObject / markers | moving hides the original; newspaper badge / mailbox flag | fix_ui_test §2/§4, fix_render_test |
| §5/§6 saves | `M.ui.choice` from save/main (conflict, recovery), active slot in the chip | fix_save_browser (54), options.saveSlot2 ("Salvo neste aparelho · Espaço 2") |

Note: `M.world.itemAt(x, y)` returns the **object**, `M.render.itemAt(x, y)` returns its **id** (both documented).

### Fixes made in this pass (by file)
- **js/engine.js**
  - `sanitizeState` drops `null` / non-object entries of `npcs`, `notifications`, `events` (CR-4: the engine
    no longer throws when called directly with such a save; `qa_cr_sanitize` reports no throws).
  - Crash fix (found by `qa_verify_sim_11`): `isSlotTile` and `buildTileMaps` filled the shared per-layout caches
    while a nested query could run `cacheCheck()` and reset them to `null` → `TypeError: Cannot read properties of
    null (reading 'add')` inside `stepSocial`. Both now build into locals and assign at the end.
  - CR-5 follow-up: the collector at the door also waits (up to 12 sim-min) while a resident is **on the way** to
    pay (`pay_bills` head action in route/walk), and the paying wait (8 min) counts from when paying starts. The
    natural reaction to the alert (order "Pagar contas" at 10:00–10:02) now pays and nothing is taken
    (`qa_verify_code_collector`: 0/3 → 3/3 paid, 0 furniture taken).
  - Sleep ping-pong when a critical need cannot be fixed (QA `noneeds`: bed, fridge and toilet sold): the critical
    override cancelled the sofa sleep every 20 min to look for food that does not exist, and a critical
    hunger/bladder woke the sleeper after 1 min every time. Now the override looks for a fix before cancelling, and
    a wake that fixed nothing is not repeated for a while (`needWake`). Exhaustion faints 10 → 0 in 8 days; sofa
    sleeps 3 min → 2–2.5 h; the starvation emergency still happens (no food at all).
- **js/engine.js / js/render.js**: identifiers containing the forbidden trademark word were renamed
  (`relocateSims` → `relocateCharacters`, render `pick` option `includeSims` → `includeCharacters`).
- **js/render.js**: an explicit `focus()` counts as camera input for auto-frame. Before, a toast's "Ver" (or any
  programmatic focus) could be undone within a frame or two on phones: auto-frame panned back to the selected
  character because it sat outside the small clear area.
- **js/ui.js**
  - The save chip shows the slot natively ("Salvo ☁️ · Espaço 2", tooltip "Espaço 2 · Família X") from the
    `'saved'` payload's `slotLabel` (main.js's fallback append steps aside).
  - The pause chip uses `M.main.pauseLabel()` for non-mode pauses ("Pausado · Janela aberta", "Pausado · Ajuda").
  - Buy mode: a click on the floor inside an object's footprint (beside a slim model: toilet, lamp, chair) selects
    that object (`world.objectAt`, wall-mounted and system objects excluded).
  - Phones: collapsing / expanding the catalog sheet updates `render.setViewInsets` (no camera move), so `focus()`
    calls use the area the sheet really covers.
  - New family on an empty lot: the camera frames the lot (between the family at the mailbox and the lot centre);
    on phones the first view used to be mostly road and neighbour houses.
- **index.html**: on desktop/tablet (≥ 761 px) the Build drawer hugs its content (door/window/wall/demolish no longer
  show a mostly empty full-height panel); swatch lists still scroll inside `.tool-opts`.
- **tools/integrate_flows.mjs**: runs the new `tools/integrate_flows_v2.mjs` first, then reloads with cleared saves
  and UI prefs and runs the original flows (`FLOWS=v1|v2` runs one part). The paint check uses `paintWall(k, idx, 'A')`.
- **tools/integrate_flows_v2.mjs** (new): the CONTRACT_V2 flows above with real mouse/touch/keyboard input, plus
  day/night screenshots, Options (save to Espaço 2, slot list, export) and a new family on an empty lot with the
  move-in checklist. Screenshots: `$SHOTS/flow2-<desk|phone>-*.png`.

### Test results on the integrated build (final run)
- Node: engine_test, fix_engine_test (+ sofa / socwait / socials / guests), engine_scenarios all pass; world_test 629/0;
  save_test 101/0; models_test 311/311; fix_render_models_test 49/49.
- Browser (integrate_check; no page errors, 0 console errors, only cdnjs three.js + Google Fonts requested):
  integrate_flows (v2 18 + v1 24 checks) 42/42 at 1280×800 and at 390×844 touch; fix_ui_test 32/32 desktop, phone,
  768×1024; fix_render_test 18/18; fix_save_browser 54/54; integrate_scenes, _hobbies, _services, _robust, _misc,
  _reload, _days, _align, fix_engine_page, fix_world_page clean.
- QA repro + verify scripts re-run on the integrated build: outputs in `scratchpad/integ_out/{repro,repro2,verify,brepro}`.

### QA scripts that still print "fail" by design (behaviour changed on purpose)
- `qa_bb_build` / `qa_bb_build2` `paper.*`: they look for the old per-edge `c`; painting is per side now (`cA`/`cB`).
- `qa_bb_build` `window.place`: aims 0.8 above a cut stub (outside the 0.6 tolerance), where the cursor is over the
  visible back wall, which correctly gets the window. `wall.diagonal.steep`: its corners are off screen.
- `qa_bb_build*` `door.noWall`: hovering bare ground with the Door tool shows no tip (it used to flash a red
  "Precisa de uma parede"; BB-6).
- `qa_live_job` `acceptClicked: null`: the "Aceitar vaga" pie label is gone; jobs go through the offer card.
- `qa_verify_build_bb9` `buyAfterBackspace`: Backspace now arms the sale first (BB-9).
- `qa_verify_code_scale`: patches the old world.js source text ("patch point not found"); `qa_cr_scale` is the
  current measure.

## First integration pass

Integration pass over the five modules as delivered (data/engine, world, models/render, ui/save/main,
index.html). The modules already matched ARCHITECTURE.md on the important seams. Verified:
- rotation and footprint math: every rendered mesh lands on its world footprint, in all 4 rotations, for
  every buyable type
- slot poses (sit, lie, bath, hot tub, bench, desk seats)
- anim names
- the dirt scale (0..1000, visible ≥ 500)
- the `pickTile` fx/fy convention
- the bus events

The fixes below are small and local.

## Fixes (by file)

### js/render.js
- **State swap re-centre.** After `M.main.loadState` (for example "Nova família" on an empty lot), the
  camera snapped back to the lot centre and away from the family. Two causes:
  - `setState` deferred a default re-centre to the next frame, which overrode `M.ui.reset`'s `focus()` on
    the selected character.
  - The `'state'` bus event that main emits afterwards triggered a second `setState`.

  Changes:
  - An explicit `focus()` now cancels a pending default re-centre.
  - The `'state'` event is ignored when it carries the state the renderer already shows.
  - `focusDefault` centres on the household when the lot has no walls.
- **`pickEdge` prefers the wall under the cursor.** If the ray hits a standing wall before the ground,
  `pickEdge` returns that wall's edge. Before, the ground point behind the wall snapped to an empty grid
  edge, so clicking a wall with the Door, Window or Wallpaper tool reported "Precisa de uma parede". The
  ground-based nearest-edge rule still applies everywhere else.

### js/engine.js
- **Conversation distance for socials.** When a social starts with the two characters less than 0.75 tile
  apart, the initiator first glides (0.6 sim-min) to a free neighbouring tile centre about 1 tile from the
  partner (`socialSpacing`, walls checked). This happens when one of them was mid-walk, for example. Before,
  dance, hug and talk could start with the bodies inside each other.
- **Slot penalties.** `dataSlots` passes an optional slot `penalty` through to
  `M.world.nearestReachable`, which already supports it.
- **Busy objects.** A player command whose object is in use (someone else on the phone or in the shower)
  now waits its turn for up to 30 sim-min instead of 10 before failing with "Não há lugar livre para isso
  agora.". With no usable spot at all it still gives up after 10. Before, ordering a pizza while the partner
  was on a 20-minute call failed.

### js/data.js
- **Wall-mounted items** (paintings, mirror) now use `wallSlots()`:
  - The main slot is the item's own tile (directly in front of the wall).
  - The next tile out is a fallback with `penalty: 1.5`, used when furniture stands under the item.

  Before, characters admired paintings and practised speeches 1.5 tiles away from the wall.

### index.html (CSS)
- The HUD money rule `.money { white-space: nowrap; color; font-family }` also matched money toasts
  (`.toast.money`), so long money notifications ran off-screen without wrapping. It is now scoped to
  `.moneybox .money`.
- **Phone bottom bar.** At ≤ 400 px the mode buttons tighten (smaller emoji, label ellipsis as a last
  resort). At ≤ 370 px the emoji is hidden, so "Construir" no longer overflows its pill.
- Removed `.pie-item.cat .p-label::after { content: ' …' }`. The phone submenus' labels already end with
  "…", so the menu showed "Ligar para… …".

### tools/engine_scenarios.mjs (test fix)
- The collector check depended on autonomy timing: Rita can legitimately pay the bill before 10:00. Free
  will is now off during that check.

## Integration test tools (all under tools/, prefix `integrate_`)

| file | what |
|---|---|
| `integrate_check.mjs` | Like check.mjs, plus:<ul><li>`--touch`, `--nohelp`, `--clear`</li><li>`--script` (Playwright module)</li><li>logs every request that leaves 127.0.0.1, filters GL driver chatter, counts console errors</li></ul> |
| `integrate_sim.js` | `--eval`: N sim hours (default 16) of autonomy. Reports the activity budget per character, motive minima, a timeline, money and NaN checks. |
| `integrate_days.js` | `--eval`: 3 days with the renderer drawing between chunks. Reports frame exceptions, roles and anims seen, idle %, moods, careers, bills. |
| `integrate_align.js` | `--eval`: every mesh vs its world footprint (starter house plus every buyable type × 4 rotations). |
| `integrate_flows.mjs` | `--script`: real mouse/touch flows:<ul><li>pie on a character, pie on the fridge, snack</li><li>walk by click; engine-queued TV</li><li>speed buttons and keys</li><li>Buy: place, select, sell; `moveObject`</li><li>Build: wall drag, door, floor drag, wallpaper, demolish</li><li>save/load; Options save; new family on an empty lot</li></ul> |
| `integrate_services.mjs` | `--script`:<ul><li>phone pie: pizza delivery, technician</li><li>newspaper job through the pie</li><li>mailbox bills through the pie</li><li>camera keys, wheel, right-drag</li></ul> |
| `integrate_scenes.mjs` | `--script`: carpool, meal on a counter, eating seated, walk-by visitor, night, wall modes, rotations. |
| `integrate_hobbies.mjs` | `--script`: pose alignment on computer, piano, chess (2 players), bench, easel, bathtub, hot tub (2), armchair nap, single bed, stereo, arcade, mirror. |
| `integrate_robust.js` | `--eval`: raw `engine.newGame({empty})`, damaged and minimal saves through `main.loadState`, export/import. |
| `integrate_misc.js` | `--eval`: portrait selection, cancelling an action from the queue strip, the 30× rule while everyone sleeps, money toast wrap. |
| `integrate_reload.mjs` | `--script`: save via Options, reload the page, the game resumes. |
| `integrate_perf.js` | `--eval`: frame times over 5 s, JS ms per frame per module, geometry and texture counts, DOM mutations per frame. |

Example: `node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_flows.mjs --w 390 --h 844 --touch`
(screenshots go to `../shots`, or to `$SHOTS`).

Note for test authors: render animation time only advances while `state.speed > 0`, and pose changes blend
over that clock. A test that steps `M.engine.update` while the game is paused and then takes a screenshot
can catch a half-blended pose. Set speed 1 before screenshots.
