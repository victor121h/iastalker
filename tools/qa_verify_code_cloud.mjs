// qa_verify_code: independent repro of CR-1 / CR-3 (cloud save race at boot).
// Mocks window.claude (db + user) with configurable latency, seeds cloud/local saves, reloads, and checks
// whether the cloud save is loaded / offered / overwritten by the next autosave (pagehide or new sim day).
// Usage: node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/qa_verify_code_cloud.mjs
export default async function (page, ctx) {
  await page.addInitScript(() => {
    const cfg = JSON.parse(sessionStorage.getItem('qa_cfg') || '{"useDelay":0,"getDelay":0}');
    const store = (window.__cloudStore = JSON.parse(sessionStorage.getItem('qa_cloud') || '{}'));
    const persist = () => sessionStorage.setItem('qa_cloud', JSON.stringify(store));
    const writes = JSON.parse(sessionStorage.getItem('qa_writes') || '[]');
    window.__bootT0 = performance.now();
    window.__toastLog = [];
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toastLog.push({ t: Math.round(performance.now() - window.__bootT0), text: n.textContent.replace(/\s+/g, ' ').trim() }); })
        .observe(document.body, { childList: true, subtree: true });
    });
    const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
    window.claude = {
      use: async (name) => {
        await delay(cfg.useDelay || 0);
        if (name === 'user') return { id: async () => 'u1' };
        if (name === 'db') return {
          collection: (p) => ({
            doc: (id) => ({
              get: () => delay(cfg.getDelay || 0).then(() => ({ exists: !!store[p + '/' + id], data: () => store[p + '/' + id] })),
              set: async (body) => { store[p + '/' + id] = body; persist(); writes.push({ id, money: body.meta && body.meta.money, t: Math.round(performance.now() - window.__bootT0) }); sessionStorage.setItem('qa_writes', JSON.stringify(writes)); },
              delete: async () => { delete store[p + '/' + id]; persist(); },
            }),
            limit: () => ({ get: async () => ({ docs: [] }) }),
          }),
        };
        return null;
      },
    };
  });

  async function runVariant(name, cfg, seed) {
    // freeze the current game so its pagehide autosave cannot touch the seeded storage
    await page.evaluate(async () => { const M = window.__morada.M; M.main.setSpeed(0); await M.main.saveNow(); });
    await page.evaluate(({ cfg, seed }) => {
      const st = JSON.parse(JSON.stringify(window.__morada.M.engine.state));
      const mk = (money, day, savedAt) => { const s = JSON.parse(JSON.stringify(st)); s.money = money; s.time.day = day; s.speed = 1; return { v: 1, savedAt, meta: { householdName: 'Cloud ' + money, day, money, members: 2 }, json: JSON.stringify(s) }; };
      const now = Date.now();
      Object.keys(localStorage).filter((k) => k.startsWith('morada:')).forEach((k) => localStorage.removeItem(k));
      const cloud = {};
      if (seed.cloud) cloud['data/users/u1/slot1'] = mk(seed.cloud.money, seed.cloud.day, now - (seed.cloud.ageMs || 0));
      if (seed.local) localStorage.setItem('morada:slot1', JSON.stringify(mk(seed.local.money, seed.local.day, now - (seed.local.ageMs || 0))));
      sessionStorage.setItem('qa_cloud', JSON.stringify(cloud));
      sessionStorage.setItem('qa_writes', '[]');
      sessionStorage.setItem('qa_cfg', JSON.stringify(cfg));
    }, { cfg, seed });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const booted = await page.evaluate(() => ({
      money: window.__morada.state.money, day: window.__morada.state.time.day, dirty: window.__morada.M.main.dirty,
      toasts: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
    }));
    // player keeps playing without touching the toast (wait past its 15 s timeout), then the sim day rolls over
    await page.waitForTimeout(seed.waitToast ? 16000 : 2000);
    const toastsLater = await page.evaluate(() => ({ visibleNow: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent.replace(/\s+/g, ' ').trim()), log: window.__toastLog.filter((x) => /nuvem|carregado/i.test(x.text)), offerStillVisible: Array.from(document.querySelectorAll('.toast')).some((t) => /nuvem/.test(t.textContent)) }));
    await page.evaluate(() => { const M = window.__morada.M; M.main.setSpeed(3); window.__morada.state.time.minute = 1439.0; });
    await page.waitForTimeout(2500);
    // and also the player switches tab / closes the page
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => {
      const doc = window.__cloudStore['data/users/u1/slot1'];
      return { cloudMoneyNow: doc && doc.meta.money, cloudDayNow: doc && doc.meta.day, writes: JSON.parse(sessionStorage.getItem('qa_writes') || '[]'), simDay: window.__morada.state.time.day };
    });
    await page.screenshot({ path: ctx.ROOT + '/../shots/qa/verify_code/cloud_' + name + '.png' });
    return { name, cfg, seed, booted, toastsLater, after, cloudSaveDestroyed: !!seed.cloud && after.cloudMoneyNow !== seed.cloud.money };
  }

  const out = [];
  // control: fast cloud, no local -> should load the cloud game (money 2222)
  out.push(await runVariant('control_fast', { useDelay: 20, getDelay: 50 }, { cloud: { money: 2222, day: 9 } }));
  // CR-1a: no local mirror, cloud read 2.0 s (< save.js CLOUD_READ_WAIT 2.5 s, > main.js CLOUD_BOOT_WAIT 1.5 s)
  out.push(await runVariant('cr1_slowget', { useDelay: 20, getDelay: 2000 }, { cloud: { money: 2222, day: 9 } }));
  // CR-1b: no local mirror, capability handshake 1.4 s (> save.js INIT_WAIT_LOAD 1.2 s), cloud read fast
  out.push(await runVariant('cr1_slowuse', { useDelay: 1400, getDelay: 50 }, { cloud: { money: 2222, day: 9 } }));
  // CR-3: older local mirror + newer cloud, cloud read 2.0 s -> toast offer only; player ignores it
  out.push(await runVariant('cr3_slowget', { useDelay: 20, getDelay: 2000 }, { cloud: { money: 2222, day: 9 }, local: { money: 1111, day: 3, ageMs: 3600e3 }, waitToast: true }));
  // CR-3 variant: older local + newer cloud, slow handshake 1.4 s -> is there even an offer?
  out.push(await runVariant('cr3_slowuse', { useDelay: 1400, getDelay: 50 }, { cloud: { money: 2222, day: 9 }, local: { money: 1111, day: 3, ageMs: 3600e3 } }));
  return out;
}
