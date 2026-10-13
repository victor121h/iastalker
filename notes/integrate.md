# Integration notes

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
