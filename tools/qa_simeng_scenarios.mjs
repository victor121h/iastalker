// QA scenario builders (simulation correctness).
import { boot } from './qa_simeng_lib.mjs';
function must(r, what) { if (!r || !r.ok) { console.log('SETUP FAIL', what, r && r.reason); } return r; }

// Minimal studio house on the empty lot, built through the engine API.
export function buildStudio(E, M, { x0 = 8, y0 = 6, x1 = 15, y1 = 12, door = 'h,14,13', extras = true } = {}) {
  const W = M.world;
  for (const k of W.edgesOfRect(x0, y0, x1, y1)) must(E.buildWall(k, 1, 0), 'wall ' + k);
  must(E.buildWall(door, 2, 0), 'door');
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) E.paintFloor(x, y, 1);
  const buys = [
    ['bed_single', x0, y0, 0], ['toilet', x1, y0, 0], ['shower', x1 - 1, y0, 0],
    ['fridge_cheap', x0, y1, 2], ['counter', x0 + 1, y1, 2], ['stove', x0 + 2, y1, 2], ['counter', x0 + 3, y1, 2],
    ['table_small', x0 + 4, y0 + 3, 0], ['chair_wood', x0 + 4, y0 + 2, 0],
  ];
  if (extras) buys.push(['lamp_floor', x0 + 2, y0, 0], ['trash_can', x1, y1, 2], ['tv_cheap', x1, y0 + 3, 1], ['sofa_cheap', x1 - 3, y0 + 2, 3]);
  for (const b of buys) must(E.buyObject(...b), 'buy ' + b.join(','));
}

export function makeScenario(scen, seed) {
  switch (scen) {
    case 'single':
    case 'single_job': {
      const members = [{ name: 'Lia Souza', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 } }];
      if (scen === 'single_job') members[0].career = { track: 'ciencia' };
      const ctx = boot({ seed, empty: true, members });
      buildStudio(ctx.E, ctx.M, { extras: true });
      return ctx;
    }
    case 'single_bare': {
      const ctx = boot({ seed, empty: true, members: [{ name: 'Lia Souza', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 } }] });
      buildStudio(ctx.E, ctx.M, { extras: false });
      return ctx;
    }
    case 'four_empty': {
      const ctx = boot({ seed, empty: true, members: [
        { name: 'Ana Lima', gender: 'f', career: { track: 'negocios' } }, { name: 'Bruno Lima', gender: 'm', career: { track: 'artes' } },
        { name: 'Clara Lima', gender: 'f' }, { name: 'Davi Lima', gender: 'm' }] });
      const { E, M } = ctx;
      // bigger open-plan house 14x9 with two bedrooms worth of beds
      const W = M.world;
      for (const k of W.edgesOfRect(4, 4, 17, 12)) must(E.buildWall(k, 1, 0), 'wall');
      must(E.buildWall('h,10,13', 2, 0), 'door');
      for (let y = 4; y <= 12; y++) for (let x = 4; x <= 17; x++) E.paintFloor(x, y, 1);
      const buys = [
        ['bed_double', 4, 4, 0], ['bed_double', 7, 4, 0], ['lamp_floor', 6, 4, 0],
        ['toilet', 15, 4, 0], ['toilet', 17, 4, 0], ['shower', 16, 4, 0], ['sink', 14, 4, 0],
        ['fridge_cheap', 4, 12, 2], ['counter', 5, 12, 2], ['stove', 6, 12, 2], ['counter', 7, 12, 2], ['counter', 8, 12, 2],
        ['table_dining', 6, 9, 0], ['chair_wood', 6, 8, 0], ['chair_wood', 7, 8, 0], ['chair_wood', 6, 10, 2], ['chair_wood', 7, 10, 2],
        ['trash_can', 9, 12, 2], ['tv_cheap', 15, 8, 1], ['sofa_cheap', 12, 8, 3], ['bookshelf', 17, 12, 2], ['phone', 16, 12, 2],
        ['lamp_floor', 12, 12, 2], ['lamp_floor', 13, 4, 0],
      ];
      for (const b of buys) must(E.buyObject(...b), 'buy ' + b.join(','));
      return ctx;
    }
    case 'four_starter': {
      const ctx = boot({ seed });
      ctx.E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 4, outgoing: 6, active: 5, playful: 6, nice: 4 } });
      ctx.E.addSim({ name: 'Leo Alves', gender: 'm', personality: { neat: 2, outgoing: 4, active: 7, playful: 8, nice: 4 } });
      return ctx;
    }
    case 'nofreewill': {
      const ctx = boot({ seed });
      ctx.E.setFreeWill(false);
      return ctx;
    }
    case 'noneeds':
    case 'nobed':
    case 'nofridge':
    case 'notoilet': {
      const ctx = boot({ seed });
      const S = ctx.E.state;
      const kill = scen === 'noneeds' ? ['bed_double', 'fridge_cheap', 'toilet'] : scen === 'nobed' ? ['bed_double'] : scen === 'nofridge' ? ['fridge_cheap'] : ['toilet'];
      for (const t of kill) { const o = S.objects.find((x) => x.type === t); must(ctx.E.sellObject(o.id), 'sell ' + t); }
      return ctx;
    }
    default: throw new Error('unknown scenario ' + scen);
  }
}

// Night-shift starter job (Segurança Pública L1 "Vigia noturno", 00:00–06:00 Qua–Dom) for a single resident.
export function nightScenario(seed, track = 'seguranca') {
  const ctx = boot({ seed, empty: true, members: [{ name: 'Lia Souza', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 }, career: { track } }] });
  buildStudio(ctx.E, ctx.M, { extras: true });
  return ctx;
}
