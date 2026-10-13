# M.save + M.main — QA fix round notes (key: save)

Files: `js/save.js` (M.save), `js/main.js` (M.main). The earlier description of both modules is in
`notes/ui.md` ("M.main" / "M.save"); everything there still works. This file lists what changed with
CONTRACT_V2 §5/§6 and the CR-1..CR-4 fixes.

Tests:
- `node tools/save_test.mjs` — 101 checks: the original 44, plus slow cloud, newer cloud doc from another
  session, fork detection on the next boot, slow handshake + `checkCloud` retry, read dedupe, `-prev` / `.bak`
  backups, corrupt / newer-version saves, quarantine, backup restore, null entries, active slot, explicit
  replace, and offline-visit forks (with no false conflict when the offline game continues the synced save).
- `node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/fix_save_browser.mjs` — 54 browser
  checks with a mocked `db` capability (A–K: CR-1 slow read / slow handshake, CR-3, fork, CR-2 slot, CR-4 newer
  version, corrupt + backup, unreadable cloud doc, periodic/day autosave, loop budget + pause reasons, engine
  cannot open a save). `ONLY=A,C` runs a subset; add `--w 390 --h 844 --touch` for phones. Modal screenshots go
  to `$SHOTS/fix_save/`.

## Save model (save.js)

Body (cloud doc and local mirror): `{ v: 1, savedAt, meta: {householdName, day, money, members}, json,
sid, base, unverified? }`. The new fields are optional (old saves load as before):
- `sid`: session id of the page that wrote it (`M.save.sid`, new per page load).
- `base`: newest cloud `savedAt` the game descends from.
- `unverified: true`: written before this session had compared with the cloud doc, or while a conflict was
  open. This covers a slow or offline visit. When the first save of a visit reaches the cloud, the local copy
  is re-written without the mark.

Per slot, the session keeps `base`, `known` savedAt values (the save loaded, docs we wrote), `verified`
(a cloud read completed in this session, or no cloud exists in this visit), `conflict` and `blocked`.

**Compare-before-write.** While a slot is unverified, its first cloud write reads the doc first (6 s budget).
A doc that is newer than `base`, not in `known`, and written by another `sid` is a **conflict**: the cloud
write is refused (`save()` resolves `{ ok: true, where: 'local', error: 'conflict', conflict }`, the local
mirror is still written), `onConflict` listeners and bus `'saveConflict'` are told, and every later cloud write
of that slot is refused until `resolveConflict(slot, 'cloud'|'keep')`. If the compare read does not answer,
the write is skipped (`error: 'unverified'`) and retried on the next save.

**Forks.** At load, if the local copy is newer than the cloud doc but carries `unverified: true` and the cloud
doc is outside its lineage, `loadEntry` returns the local entry plus `conflict` (a new game started while the
cloud was slow, then closed before the cloud answered, must not beat the real cloud game on the next boot).

**Backups.**
- Local: the previous readable mirror rolls into `morada:<slot>.bak`; an unreadable one is moved to
  `morada:<slot>.broken`.
- Cloud: before overwriting a doc written by another session (and at most every 10 minutes for our own
  docs), the doc is copied to `<slot>-prev`. Unreadable cloud docs are kept in `<slot>-broken`.
- `list()` hides `-prev` / `-broken` docs, `.bak` / `.broken` keys and `morada:activeSlot`.

**Unreadable saves.** A corrupt save, or one written by a newer version, is reported as
`{ state: null, unreadable: { where, reason: 'corrupt'|'newer', savedAt, meta, raw }, backup? }`. It is never
reported as "no save". That slot is **blocked**: `save()` → `{ ok: false, where: 'none', error: 'blocked' }`,
and nothing is written until `quarantine(slot, unreadable)` keeps the original apart.
`validateState` now drops `null` / non-object entries of `npcs`, `notifications`, `events`, `bills`, `objects`
and `sims` (CR-4: one stray null no longer makes a save unreadable).

### API (new or changed)
- `loadEntry(slot, { timeout?, peek? })` → always an object: `{ state|null, where: 'cloud'|'local'|'none',
  savedAt, meta, slot, cloudChecked, conflict?, unreadable?, backup? }`.
  - `cloudChecked` is true when the cloud doc was read within `timeout` (default 3.7 s), or when no cloud
    exists in this visit. The read keeps going in the background and is reused by `checkCloud`.
  - `load(slot)` still resolves a state or `null`.
- `checkCloud(slot, { timeout = 15000 })` → `{ checked, slot, cloud, exists, savedAt, meta, conflict, pending }`.
  This is the late check. `pending: false` means the cloud cannot answer in this visit.
- `conflictOf(slot)`, `resolveConflict(slot, 'cloud'|'keep')`, `onConflict(fn)` → unsubscribe.
  - Conflict object: `{ slot, where: 'cloud', savedAt, meta, state|null, unreadable: null|'corrupt'|'newer', raw, sid }`.
  - Bus `'saveConflict'` carries the same object plus `source: 'write'|'check'`.
- `quarantine(slot, unreadableInfo)`, `block(slot, reason, where)`, `isBlocked(slot)`.
- `rawText(slot, where)`: the stored text, for "copy the data".
- `backupEntry(slot, { primary = true, exclude?: savedAt, timeout? })` → the newest readable entry among `.bak`,
  `-prev` and (optionally) the primaries, with `where` in `'local-bak'|'cloud-prev'|'local'|'cloud'`.
- `activeSlot()` / `setActiveSlot(slot)` (localStorage `morada:activeSlot`), `slotLabel('slot2')` → 'Espaço 2'.
- `lineage(slot)` / `adopt(slot, lineage)`: carried through the live-update snapshot.
- `invalidate(slot?)`: makes the next write compare again. main calls it when the tab comes back after more
  than 30 s hidden.
- `session(slot)`, `sid`, `downloadText(text, filename)`, `debug`.
- `save(state, slot, { replace })`: `replace` = the player explicitly saves over a slot that `list()` showed.
  That doc may then be overwritten, after a `-prev` copy.
- `savedAt` is strictly increasing within a page.

## main.js

- **Active slot.** Boot reads `morada:activeSlot` (or the hot snapshot's `slot`). `saveNow(otherSlot)`,
  `loadSlot` and `setSlot` persist it and emit bus `'slot' {slot, label}`. `'saved'` payloads carry `slotLabel`.
  The save chip shows "Salvo ☁️ · Espaço 2" (see "For the UI owner").
- **Boot.**
  - `loadEntry(slot, { timeout: 1500 })`.
  - When `cloudChecked` is false (slow read or slow handshake, with or without a local save), a background
    late check runs. It retries with backoff (2 s … 60 s) until the cloud answers or is known to be absent.
  - A conflict from load, check or write opens **"Há um jogo mais recente na nuvem"** via `M.ui.choice`
    (waits until M.ui is ready and the boot overlay is gone). The modal:
    - has two cards (cloud / this game: family · day · money · members · "salvo hoje às HH:MM");
    - offers "Continuar o jogo da nuvem (Dia N, Família X, salvo hoje às HH:MM)" and "Manter este jogo";
    - has `dismissable: false` and is asked again if something closes it, so it never auto-dismisses;
    - holds pause reason `'save'`.
  - After the choice main saves at once, so local and cloud agree; the other game sits in `.bak` / `-prev`.
    An unreadable cloud doc gets "Recarregar a página" / "Manter este jogo" instead.
- **Unreadable save** (corrupt, newer version, or the engine throws in `init`). The starter house runs
  underneath, with **saves blocked for that slot**: autosave, pagehide and the snapshot write nothing. The
  recovery modal "Não foi possível abrir o jogo salvo" offers:
  - "Tentar a cópia de segurança (…)" when a readable backup exists;
  - "Recarregar a página" for newer-version saves;
  - "Mostrar os dados para copiar" (textarea + Copiar + Baixar arquivo);
  - "Começar um jogo novo" at boot, or "Voltar ao jogo atual" when the player was loading another slot.

  Backup and new game first `quarantine` the original. `loadSlot` of an unreadable slot opens the same modal.
- **Autosave.** Every 3 real minutes while dirty (`setAutosaveInterval(ms)`, `autosaveInterval`), on bus
  `'day'`, on `visibilitychange→hidden` and on `pagehide`.
- **Loop.**
  - dt is clamped to 0.1 s; at most 64 substeps of 0.5 sim-min.
  - The engine gets an **18 ms budget per frame**. Sim time that does not fit is dropped, never carried over,
    so there is no catch-up spiral after a slow frame or a background tab.
  - Engine, render and UI errors are counted separately. The fatal overlay appears after 90 consecutive
    failing frames of one of them.
  - `M.main.stats()` → `{ frames, steps, droppedSimMin, slowFrames, lastEngineMs, maxEngineMs }`.
- **Pause reasons.**
  - `setPaused(reason, on = true)` returns the reasons and emits bus `'pause' {paused, reasons, reason, on}`
    when the set changes.
  - `'speed'` now carries `{speed, factor, paused, reasons}`.
  - `PAUSE_REASONS` maps each reason to a pt-BR label: buy, build, options, modal, help, save, recovery,
    hidden, ui.
  - `pauseLabel()` gives the label of the most relevant reason.
  - main uses `'save'` (conflict modal), `'recovery'` (unreadable save) and `'hidden'` (tab in the background).
- `M.main.status()` → `{ slot, slotLabel, dirty, lastSavedAt, saveBlock, cloudCheck, conflictOpen, paused,
  reasons }`. `saveBlocked` getter.
- Hot snapshot: `{ json (null while the slot is blocked), slot, lineage }`.

## For the UI owner (ui.js)

- The save chip should show the active slot. Until ui.js does this itself, main appends " · Espaço N" to the
  chip text right after the `'saved'` handler runs (only when the text does not already mention a slot) and
  sets the chip's `title` to "Espaço N · Família X". Use `M.main.slotLabel()` / the `'slot'` event /
  `saved.slotLabel` to do it natively. The slot-list modal could also use `M.save.slotLabel`.
- Suggested: a "Continuar" entry in Opções (last slot), and the `pauseLabel()` text in the PAUSADO chip.
- `M.ui.choice` is used with `dismissable: false`, `cancelValue`, `body` (DOM nodes using the existing
  `.slot-list/.slot/.sl-name/.sl-meta`, `textarea.code`, `.btn small`, `.form-error` classes) and `wide`.
- For the engine owner: `sanitizeState` still dereferences null `npcs` / `notifications` / `events` entries
  when called directly (`tools/qa_cr_sanitize.mjs`). Saves loaded through M.save are already cleaned by
  `validateState`, so the game path is safe either way.
