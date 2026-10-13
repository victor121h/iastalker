// SIM-1 verify: do socials crowd out object candidates when a housemate is near?
// Part A: static picks with realistic mixed motives at 19:00 (evening) for several social levels.
// Part B: natural 7-day runs (3 seeds): hours/day of fun objects vs socials, and what autonomy picked
//         when comfort/fun was <= -60 while a housemate was within 4 tiles.
import { load, head } from './qa_verify_sim_lib.mjs';

function partA() {
  const c = load({ seed: 3 });
  const { E, M, S } = c;
  const rita = S.sims[0], caio = S.sims[1];
  // go to 19:00 day 1 (Caio back from work)
  while (S.time.minute < 19 * 60) E.update(0.5);
  for (const s of [rita, caio]) { s.queue = []; s.hidden = false; s.atWork = false; s.asleep = false; s.seated = false; }
  rita.x = 10; rita.y = 12; caio.x = 9; caio.y = 11;
  console.log('rel Rita->Caio', JSON.stringify(rita.relationships[caio.id]), 'objects:', S.objects.map((o) => o.type).join(','));
  const base = { hunger: 30, energy: 20, comfort: 10, fun: 10, hygiene: 30, social: 20, bladder: 30, room: 10 };
  const cases = [
    ['comfort -70 social 20', { comfort: -70 }],
    ['comfort -70 social 60', { comfort: -70, social: 60 }],
    ['comfort -70 social 90', { comfort: -70, social: 90 }],
    ['fun -70 social 20', { fun: -70 }],
    ['fun -70 social 60', { fun: -70, social: 60 }],
    ['fun -70 social 90', { fun: -70, social: 90 }],
    ['energy -60 social 20 (19h)', { energy: -60 }],
    ['hygiene -70 social 20', { hygiene: -70 }],
    ['hunger -60 social 20', { hunger: -60 }],
    ['bladder -60 social 20', { bladder: -60 }],
  ];
  for (const away of [false, true]) {
    caio.hidden = away;
    console.log(away ? '-- Caio away --' : '-- Caio 1.4 tiles away --');
    for (const [label, over] of cases) {
      Object.assign(rita.motives, base, over);
      const tally = {};
      for (let i = 0; i < 400; i++) {
        const r = E.debug.runAutonomy(rita, null);
        const k = !r ? 'nothing' : r.kind === 'social' ? 'social' : r.o.type + ':' + r.it.key;
        tally[k] = (tally[k] || 0) + 1;
      }
      console.log('  ' + label.padEnd(28), Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([a, b]) => a + ' ' + Math.round(b / 4) + '%').join(', '));
    }
  }
}

function partB(seed) {
  const c = load({ seed });
  const { E, M, S, D } = c;
  const days = 7;
  const tally = {}; // name -> {funObj, social, ...} minutes
  const lowPicks = {}; // name -> {social, object}
  const prevHead = new Map();
  for (let i = 0; i < days * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of S.sims) {
      if (s.visitor || s.hidden) continue;
      const t = tally[s.name] = tally[s.name] || { funObj: 0, social: 0, sit: 0, sleep: 0, idle: 0 };
      const a = s.queue[0];
      if (!a) t.idle += 0.5;
      else if (a.kind === 'social') t.social += 0.5;
      else if (a.phase === 'do') {
        const o = E.objectById(a.objId);
        const it = o && D.CATALOG[o.type] && D.CATALOG[o.type].interactions.find((x) => x.key === a.interaction);
        if (it && (it.fun || (it.rates && it.rates.fun > 0)) && !it.skill) t.funObj += 0.5;
        if (a.interaction === 'sit') t.sit += 0.5;
        if (a.effect === 'sleep') t.sleep += 0.5;
      }
      // new auto action started: record pick when comfort or fun is low and another household member is near
      if (a && prevHead.get(s.id) !== a.id) {
        prevHead.set(s.id, a.id);
        if (a.source === 'auto' && !(a.data && a.data.respond) && a.kind !== 'walk') {
          const near = S.sims.some((o) => o !== s && !o.hidden && !o.visitor && Math.hypot(o.x - s.x, o.y - s.y) < 4);
          const low = s.motives.fun <= -60 ? 'fun' : s.motives.comfort <= -60 ? 'comfort' : null;
          if (low && near) {
            const lp = lowPicks[s.name] = lowPicks[s.name] || {};
            const k = low + ':' + (a.kind === 'social' ? 'social' : a.interaction);
            lp[k] = (lp[k] || 0) + 1;
          }
        }
      }
    }
  }
  console.log('seed', seed);
  for (const n in tally) {
    const t = tally[n];
    console.log('  ' + n.padEnd(12), 'per day: funObj', (t.funObj / 60 / days).toFixed(2), 'h; social', (t.social / 60 / days).toFixed(2), 'h; sit', (t.sit / 60 / days).toFixed(2), 'h; sleep', (t.sleep / 60 / days).toFixed(2), 'h; idle', (t.idle / 60 / days).toFixed(2), 'h');
    console.log('     picks with fun/comfort<=-60 & housemate <4 tiles:', JSON.stringify(lowPicks[n] || {}));
  }
}

partA();
for (const seed of [1, 2, 3]) partB(seed);
