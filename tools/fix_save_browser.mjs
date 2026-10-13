// Browser checks for the save / main fixes (CR-1..CR-4, CONTRACT_V2 §5, loop robustness).
// Usage: node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/fix_save_browser.mjs
//        (ONLY=A,C runs a subset; SHOTS=dir for the modal screenshots; add --w 390 --h 844 --touch for phones)
// A mocked artifact `db` capability (configurable latency, persisted in sessionStorage across reloads)
// stands in for the cloud.
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const want = (k) => !only.length || only.includes(k);
  const shotDir = path.join(ctx.shotDir || path.join(ctx.ROOT, '../shots'), 'fix_save');
  fs.mkdirSync(shotDir, { recursive: true });
  const tag = ctx.touch ? 'phone' : 'desk';
  const results = [];
  const expect = (name, cond, detail) => { results.push({ name, ok: !!cond, detail: cond ? undefined : detail }); };
  const ev = (fn, a) => page.evaluate(fn, a);
  const wait = (ms) => page.waitForTimeout(ms);

  await page.addInitScript(() => {
    const cfg = JSON.parse(sessionStorage.getItem('fx_cfg') || '{}');
    if (cfg.off) return;
    const store = (window.__cloudStore = JSON.parse(sessionStorage.getItem('fx_cloud') || '{}'));
    const persist = () => sessionStorage.setItem('fx_cloud', JSON.stringify(store));
    const writes = JSON.parse(sessionStorage.getItem('fx_writes') || '[]');
    window.__cloudWrites = writes;
    const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
    window.claude = {
      use: async (name) => {
        await delay(cfg.useDelay || 0);
        if (name === 'user') return { id: async () => 'u1' };
        if (name === 'db') return {
          collection: (p) => ({
            doc: (id) => ({
              get: () => delay(cfg.getDelay || 0).then(() => ({ id, exists: !!store[p + '/' + id], data: () => store[p + '/' + id] && JSON.parse(JSON.stringify(store[p + '/' + id])) })),
              set: async (body) => {
                await delay(cfg.setDelay || 0);
                store[p + '/' + id] = JSON.parse(JSON.stringify(body)); persist();
                writes.push({ id, money: body.meta && body.meta.money, at: Date.now() });
                sessionStorage.setItem('fx_writes', JSON.stringify(writes));
              },
              delete: async () => { delete store[p + '/' + id]; persist(); },
            }),
            limit: () => ({ get: async () => ({ docs: Object.keys(store).filter((k) => k.startsWith(p + '/')).map((k) => ({ id: k.split('/').pop(), exists: true, data: () => store[k] })) }) }),
          }),
        };
        return null;
      },
    };
  });

  // K: make engine.init throw for one specific family (a save that passes validation but cannot be opened)
  await page.addInitScript(() => {
    const M = (window.M = window.M || {});
    let eng;
    Object.defineProperty(M, 'engine', {
      configurable: true, enumerable: true,
      get() { return eng; },
      set(v) {
        if (v && !v.__fxWrapped) {
          const o = v.init;
          v.init = function (st) { if (st && st.householdName === 'Família Quebrada') throw new Error('teste: init falhou'); return o.apply(this, arguments); };
          v.__fxWrapped = true;
        }
        eng = v;
      },
    });
  });

  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  const base = await ev(() => JSON.parse(JSON.stringify(window.__morada.M.engine.state)));
  const DOC = 'data/users/u1/slot1';
  const mkState = (o) => {
    const s = JSON.parse(JSON.stringify(base));
    s.money = o.money; s.householdName = o.name || s.householdName; s.time.day = o.day || 1; s.speed = 1;
    if (o.version) s.version = o.version;
    return s;
  };
  const mk = (o, savedAt, extra) => {
    const s = mkState(o);
    return Object.assign({ v: 1, savedAt, meta: { householdName: s.householdName, day: s.time.day, money: s.money, members: 2 }, json: JSON.stringify(s) }, extra || {});
  };
  const now = Date.now();

  async function seedAndReload({ cfg = {}, cloud = {}, local = {}, active = null, waitMs = 3500 }) {
    // freeze the running page so its pagehide autosave cannot touch the seeded storage
    await ev(() => {
      const M = window.__morada && window.__morada.M;
      if (!M) return;
      M.save.save = async () => ({ ok: false, where: 'none', error: 'test-frozen' });
      try { M.main.setSpeed(0); } catch (e) { /* ignore */ }
    });
    await ev(({ cfg, cloud, local, active }) => {
      Object.keys(localStorage).filter((k) => k.startsWith('morada:')).forEach((k) => localStorage.removeItem(k));
      for (const k in local) localStorage.setItem(k, local[k]);
      if (active) localStorage.setItem('morada:activeSlot', active);
      sessionStorage.setItem('fx_cloud', JSON.stringify(cloud));
      sessionStorage.setItem('fx_writes', '[]');
      sessionStorage.setItem('fx_cfg', JSON.stringify(cfg));
    }, { cfg, cloud, local, active });
    await page.reload({ waitUntil: 'load' });
    await wait(waitMs);
    await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  }
  const modal = () => ev(() => {
    const root = document.getElementById('modal-root');
    if (!root || root.hidden) return null;
    const m = Array.from(root.querySelectorAll('.modal')).filter((x) => !x.hidden).pop();
    if (!m) return null;
    return {
      title: (m.querySelector('h2') || {}).textContent || '',
      text: (m.querySelector('.modal-body') || {}).innerText || '',
      buttons: Array.from(m.querySelectorAll('.modal-foot button')).map((b) => b.textContent),
      hasClose: !!m.querySelector('.modal-head .icon-btn'),
    };
  });
  const clickChoice = async (re) => {
    const idx = await ev((src) => {
      const re = new RegExp(src);
      const root = document.getElementById('modal-root');
      const m = Array.from(root.querySelectorAll('.modal')).filter((x) => !x.hidden).pop();
      const bs = Array.from(m.querySelectorAll('.modal-foot button'));
      const i = bs.findIndex((b) => re.test(b.textContent));
      if (i >= 0) bs[i].click();
      return i;
    }, re.source);
    await wait(400);
    return idx;
  };
  const info = () => ev(() => {
    const M = window.__morada.M, st = window.__morada.state;
    const doc = window.__cloudStore && window.__cloudStore['data/users/u1/slot1'];
    const prev = window.__cloudStore && window.__cloudStore['data/users/u1/slot1-prev'];
    const loc = localStorage.getItem('morada:slot1');
    let lm = null; try { lm = JSON.parse(loc).meta; } catch (e) { lm = null; }
    return {
      money: st.money, day: st.time.day, name: st.householdName, slot: M.main.slot,
      cloudMoney: doc && doc.meta && doc.meta.money, prevMoney: prev && prev.meta && prev.meta.money,
      localMeta: lm, writes: (window.__cloudWrites || []).filter((w) => w.id === 'slot1').length,
      reasons: M.main.pauseReasons(), status: M.main.status(),
      keys: Object.keys(localStorage).filter((k) => k.startsWith('morada')).sort(),
    };
  });
  const forceAutosave = async () => {
    await ev(() => { const M = window.__morada.M; M.main.markDirty(); M.main.autosave('hidden'); window.dispatchEvent(new Event('pagehide')); });
    await wait(1500);
  };

  // ------------------------------------------------------------------ A: CR-1 slow cloud read, no local save
  if (want('A')) {
    await seedAndReload({ cfg: { useDelay: 20, getDelay: 2500 }, cloud: { [DOC]: mk({ money: 2222, day: 9, name: 'Família Nuvem' }, now - 60e3) }, waitMs: 4500 });
    const m = await modal();
    const i0 = await info();
    expect('A.modal shown', m && /mais recente na nuvem/.test(m.title), m);
    expect('A.modal has family/day/money/time', m && /Família Nuvem/.test(m.text) && /Dia 9/.test(m.text) && /M\$ 2\.222/.test(m.text) && /salvo hoje às \d\d:\d\d/i.test(m.text), m && m.text);
    expect('A.button label (contract wording)', m && /^Continuar o jogo da nuvem \(Dia 9, Família Nuvem, salvo hoje às \d\d:\d\d\)$/.test(m.buttons[0]) && m.buttons[1] === 'Manter este jogo', m && m.buttons);
    expect('A.not dismissable (no close button)', m && !m.hasClose, m);
    expect('A.time paused while asking', i0.reasons.includes('save') || i0.reasons.includes('modal'), i0.reasons);
    await page.screenshot({ path: path.join(shotDir, 'A_conflict_' + tag + '.png') });
    await page.keyboard.press('Escape'); await wait(300);
    await forceAutosave();
    const i1 = await info();
    expect('A.Esc does not dismiss', !!(await modal()), null);
    expect('A.no cloud write before the choice', i1.writes === 0 && i1.cloudMoney === 2222, i1);
    await wait(16000);   // the old toast vanished after 15 s; the modal must stay
    expect('A.modal never auto-dismisses (16 s later)', !!(await modal()), null);
    await clickChoice(/^Continuar o jogo da nuvem/);
    await wait(1500);
    const i2 = await info();
    expect('A.cloud game loaded', i2.money === 2222 && i2.day === 9 && i2.name === 'Família Nuvem', i2);
    expect('A.local mirror follows the cloud game', i2.localMeta && i2.localMeta.money === 2222, i2.localMeta);
    expect('A.modal closed + unpaused', !(await modal()) && !i2.reasons.includes('save') && !i2.reasons.includes('modal'), i2.reasons);
  }

  // ------------------------------------------------------------------ B: CR-1 slow capability handshake, keep this game
  if (want('B')) {
    await seedAndReload({ cfg: { useDelay: 3000, getDelay: 50 }, cloud: { [DOC]: mk({ money: 2222, day: 9, name: 'Família Nuvem' }, now - 60e3) }, waitMs: 2500 });
    const i0 = await info();
    expect('B.boots a new game while the handshake is slow', i0.money !== 2222, i0);
    await forceAutosave();   // tab hidden before the cloud answered
    await wait(2500);
    const m = await modal();
    const i1 = await info();
    expect('B.modal after the late cloud check', m && /mais recente na nuvem/.test(m.title), m);
    expect('B.no cloud overwrite', i1.cloudMoney === 2222 && i1.writes === 0, i1);
    await clickChoice(/^Manter este jogo$/);
    await wait(2000);
    const i2 = await info();
    expect('B.keep → cloud doc replaced by this game', i2.cloudMoney === i0.money, i2);
    expect('B.keep → previous cloud save copied to slot1-prev', i2.prevMoney === 2222, i2);
  }

  // ------------------------------------------------------------------ C: CR-3 older local + newer cloud (slow)
  if (want('C')) {
    await seedAndReload({
      cfg: { useDelay: 20, getDelay: 2500 },
      cloud: { [DOC]: mk({ money: 2222, day: 9, name: 'Família Nuvem' }, now - 60e3) },
      local: { 'morada:slot1': JSON.stringify(mk({ money: 1111, day: 3, name: 'Família Local' }, now - 3600e3)) },
      waitMs: 4500,
    });
    const m = await modal();
    const i0 = await info();
    expect('C.local game loaded first', i0.money === 1111, i0);
    expect('C.modal compares both saves', m && /Família Nuvem/.test(m.text) && /Família Local/.test(m.text) && /M\$ 1\.111/.test(m.text), m && m.text);
    await page.screenshot({ path: path.join(shotDir, 'C_conflict_' + tag + '.png') });
    await ev(() => { window.__morada.state.money += 5; });
    await forceAutosave();
    await ev(() => window.__morada.M.main.autosave('day'));
    await wait(1200);
    const i1 = await info();
    expect('C.newer cloud save not overwritten by autosaves', i1.cloudMoney === 2222 && i1.writes === 0, i1);
    expect('C.local mirror keeps saving this game', i1.localMeta && i1.localMeta.money === 1116, i1.localMeta);
    await clickChoice(/^Continuar o jogo da nuvem/);
    await wait(1500);
    const i2 = await info();
    expect('C.cloud chosen → cloud game running', i2.money === 2222, i2);
    expect('C.this device\'s game kept in morada:slot1.bak', await ev(() => { try { return JSON.parse(localStorage.getItem('morada:slot1.bak')).meta.money; } catch (e) { return null; } }) === 1116, null);
  }

  // ------------------------------------------------------------------ D: fork detected on the next boot (fast cloud)
  if (want('D')) {
    await seedAndReload({ cfg: { useDelay: 20, getDelay: 2500 }, cloud: { [DOC]: mk({ money: 2222, day: 9, name: 'Família Nuvem' }, now - 60e3) }, waitMs: 1800 });
    await forceAutosave();   // a new game is written locally before the cloud answered; then the tab is closed
    await ev(() => sessionStorage.setItem('fx_cfg', JSON.stringify({ useDelay: 20, getDelay: 50 })));
    await ev(() => { window.__morada.M.save.save = async () => ({ ok: false, where: 'none' }); });
    await page.reload({ waitUntil: 'load' });
    await wait(3500);
    const m = await modal();
    const i = await info();
    expect('D.fork → choice instead of silently using the newer local starter game', m && /mais recente na nuvem/.test(m.title), { m, i });
    expect('D.cloud intact', i.cloudMoney === 2222, i);
    await clickChoice(/^Continuar o jogo da nuvem/);
    await wait(1200);
    expect('D.cloud game loaded', (await info()).money === 2222, null);
  }

  // ------------------------------------------------------------------ E: CR-2 active slot persisted + shown
  if (want('E')) {
    await seedAndReload({ cfg: { off: true }, waitMs: 3000 });
    await ev(async () => { const M = window.__morada.M; M.main.setSpeed(0); await M.main.saveNow(); });
    await ev(async () => { const M = window.__morada.M; window.__morada.state.money = 4242; await M.main.saveNow('slot2'); });
    const chip = await ev(() => (document.querySelector('.save-chip') || {}).textContent || '');
    const active = await ev(() => localStorage.getItem('morada:activeSlot'));
    expect('E.activeSlot persisted', active === 'slot2', active);
    expect('E.save chip names the slot', /Espaço 2/.test(chip), chip);
    await ev(() => { window.__morada.state.money = 4343; window.__morada.M.main.markDirty(); });
    await ev(() => window.dispatchEvent(new Event('pagehide')));
    await wait(800);
    await page.reload({ waitUntil: 'load' });
    await wait(3500);
    const i = await info();
    expect('E.reload resumes slot 2', i.slot === 'slot2' && i.money === 4343, i);
  }

  // ------------------------------------------------------------------ F: CR-4 save from a newer version → recovery
  if (want('F')) {
    const raw = JSON.stringify(mk({ money: 98765, day: 12, name: 'Família Preciosa', version: 2 }, now - 5000));
    await seedAndReload({ cfg: { off: true }, local: { 'morada:slot1': raw }, waitMs: 3500 });
    const m = await modal();
    expect('F.recovery modal', m && /Não foi possível abrir o jogo salvo/.test(m.title) && /versão mais nova/.test(m.text), m);
    expect('F.recovery buttons', m && m.buttons.includes('Recarregar a página') && m.buttons.includes('Mostrar os dados para copiar') && m.buttons.includes('Começar um jogo novo'), m && m.buttons);
    await page.screenshot({ path: path.join(shotDir, 'F_recovery_' + tag + '.png') });
    await forceAutosave();
    expect('F.unreadable save untouched by autosaves', await ev(() => localStorage.getItem('morada:slot1')) === raw, null);
    await clickChoice(/^Mostrar os dados/);
    await wait(300);
    const shown = await ev(() => { const t = document.getElementById('recovery-raw'); return t ? t.value : null; });
    expect('F.raw JSON shown for copying', shown === raw, shown && shown.slice(0, 80));
    await page.screenshot({ path: path.join(shotDir, 'F_raw_' + tag + '.png') });
    await clickChoice(/^Voltar$/);
    const m2 = await modal();
    expect('F.back to the recovery modal', m2 && /Não foi possível abrir/.test(m2.title), m2);
    await clickChoice(/^Começar um jogo novo$/);
    await wait(1500);
    const i = await info();
    expect('F.original preserved in .broken', await ev(() => localStorage.getItem('morada:slot1.broken')) === raw, i.keys);
    expect('F.new game saved, saves resumed', i.localMeta && i.localMeta.householdName !== 'Família Preciosa' && !i.status.saveBlock, i);
  }

  // ------------------------------------------------------------------ G: corrupt save + backup restore
  if (want('G')) {
    const bak = JSON.stringify(mk({ money: 3333, day: 5, name: 'Família Reserva' }, now - 600e3));
    await seedAndReload({ cfg: { off: true }, local: { 'morada:slot1': '{"v":1,"savedAt":1,"json":"{quebrado', 'morada:slot1.bak': bak }, waitMs: 3500 });
    const m = await modal();
    expect('G.recovery offers the backup', m && /^Tentar a cópia de segurança \(Dia 5, Família Reserva/.test(m.buttons[0]), m && m.buttons);
    await clickChoice(/^Tentar a cópia de segurança/);
    await wait(1500);
    const i = await info();
    expect('G.backup loaded', i.money === 3333 && i.name === 'Família Reserva', i);
    expect('G.corrupt original kept in .broken', /quebrado/.test(await ev(() => localStorage.getItem('morada:slot1.broken')) || ''), i.keys);
    expect('G.primary rewritten from the backup', i.localMeta && i.localMeta.money === 3333, i.localMeta);
  }

  // ------------------------------------------------------------------ H: unreadable (newer) cloud save, older local copy
  if (want('H')) {
    await seedAndReload({
      cfg: { useDelay: 20, getDelay: 50 },
      cloud: { [DOC]: mk({ money: 7777, day: 20, name: 'Família Futura', version: 2 }, now - 60e3) },
      local: { 'morada:slot1': JSON.stringify(mk({ money: 1111, day: 3, name: 'Família Local' }, now - 3600e3)) },
      waitMs: 3500,
    });
    const m = await modal();
    expect('H.recovery for the newer cloud save, local copy offered', m && /Não foi possível abrir/.test(m.title) && /Família Local/.test(m.buttons[0] || ''), m);
    await forceAutosave();
    expect('H.cloud doc untouched while asking', (await info()).cloudMoney === 7777, null);
    await clickChoice(/^Tentar a cópia de segurança/);
    await wait(2000);
    const i = await info();
    const broken = await ev(() => { const d = window.__cloudStore['data/users/u1/slot1-broken']; return d && d.meta && d.meta.money; });
    expect('H.local copy loaded', i.money === 1111, i);
    expect('H.unreadable cloud save kept in slot1-broken', broken === 7777, broken);
  }

  // ------------------------------------------------------------------ I: periodic autosave + day autosave
  if (want('I')) {
    await seedAndReload({ cfg: { off: true }, waitMs: 3000 });
    const t0 = await ev(() => { const M = window.__morada.M; M.main.setAutosaveInterval(1200); M.main.markDirty(); return M.main.lastSavedAt; });
    await wait(2500);
    const t1 = await ev(() => window.__morada.M.main.lastSavedAt);
    expect('I.periodic autosave while dirty', t1 > t0, { t0, t1 });
    await ev(() => window.__morada.M.main.setAutosaveInterval(180000));
    expect('I.default interval is 3 minutes', (await ev(() => window.__morada.M.main.autosaveInterval)) === 180000, null);
    const d0 = await ev(() => { const M = window.__morada.M; const st = window.__morada.state; st.time.minute = 1439.6; M.main.setSpeed(1); return M.main.lastSavedAt; });
    await wait(2500);
    const d1 = await ev(() => ({ saved: window.__morada.M.main.lastSavedAt, day: window.__morada.state.time.day }));
    expect('I.autosave on a new sim day', d1.saved > d0 && d1.day >= 2, d1);
  }

  // ------------------------------------------------------------------ J: loop robustness + pause reasons
  if (want('J')) {
    const r = await ev(async () => {
      const M = window.__morada.M;
      const orig = M.engine.update;
      M.engine.update = function (dt) { const t = performance.now(); while (performance.now() - t < 20) { /* slow engine (20 ms per substep) */ } return orig.call(this, dt); };
      const s0 = M.main.stats();
      M.main.setSpeed(3);
      await new Promise((r) => setTimeout(r, 1500));
      const s1 = M.main.stats();
      M.engine.update = orig;
      M.main.setSpeed(1);
      // pause reasons: hidden tab
      const evs = [];
      const on = (p) => evs.push(p);
      M.util.bus.on('pause', on);
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      const hidden = M.main.pauseReasons().slice();
      const lbl = M.main.pauseLabel();
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      const visible = M.main.pauseReasons().slice();
      M.util.bus.off('pause', on);
      delete document.visibilityState;
      return { maxEngineMs: s1.maxEngineMs, dropped: s1.droppedSimMin - s0.droppedSimMin, slow: s1.slowFrames - s0.slowFrames, hidden, visible, lbl, evs };
    });
    expect('J.engine time per frame stays bounded with a slow engine', r.maxEngineMs < 45, r);
    expect('J.excess sim time dropped, not carried over', r.dropped > 0 && r.slow > 0, r);
    expect('J.hidden tab is a pause reason', r.hidden.includes('hidden') && !r.visible.includes('hidden') && r.lbl === 'Jogo em segundo plano', r);
    expect('J.pause events carry the reasons', r.evs.length === 2 && r.evs[0].paused === true && Array.isArray(r.evs[0].reasons), r.evs);
  }

  // ------------------------------------------------------------------ K: readable save the engine cannot open
  if (want('K')) {
    const bad = JSON.stringify(mk({ money: 5150, day: 7, name: 'Família Quebrada' }, now - 1000));
    const bak = JSON.stringify(mk({ money: 3030, day: 6, name: 'Família Reserva' }, now - 300e3));
    await seedAndReload({ cfg: { off: true }, local: { 'morada:slot1': bad, 'morada:slot1.bak': bak }, waitMs: 4000 });
    const m = await modal();
    expect('K.recovery when the engine cannot open the save', m && /Não foi possível abrir/.test(m.title) && /não conseguiu carregar/.test(m.text), m);
    expect('K.backup offered is not the failing save', m && /Família Reserva/.test(m.buttons[0] || '') && !m.buttons.some((b) => /Quebrada/.test(b)), m && m.buttons);
    await forceAutosave();
    expect('K.failing save untouched', await ev(() => localStorage.getItem('morada:slot1')) === bad, null);
    await clickChoice(/^Tentar a cópia de segurança/);
    await wait(1500);
    const i = await info();
    expect('K.backup loaded + original kept in .broken', i.money === 3030 && /Família Quebrada/.test(await ev(() => localStorage.getItem('morada:slot1.broken')) || ''), i);
  }

  const fail = results.filter((x) => !x.ok);
  return { pass: results.length - fail.length, fail: fail.length, failed: fail, names: results.map((x) => (x.ok ? 'ok ' : 'FAIL ') + x.name) };
}
