// Object visual states: broken, dirty, unmade, dead/thirsty plants, meals, plates, puddle, carpool cars; and wallpaper sides.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'state');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M; M.main.setSpeed(1); M.engine.setFreeWill(false); M.engine.state.money = 1e6; M.engine.state.time.minute = 660; });
  const out = {};
  // Row of objects on the lawn north of the house (y = 1..4)
  out.place = await page.evaluate(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const put = (type, x, y, rot, patch) => { const r = E.buyObject(type, x, y, rot || 0); if (!r.ok) return type + ':' + r.reason; Object.assign(r.obj, patch || {}); return r.obj.id; };
    const ids = {
      tvB: put('tv_cheap', 1, 1, 0, { broken: true }),
      showerD: put('shower', 3, 1, 0, { dirty: 900 }),
      toiletD: put('toilet', 5, 1, 0, { dirty: 900 }),
      stoveB: put('stove', 7, 1, 0, { broken: true, dirty: 900 }),
      bedU: put('bed_single', 9, 1, 0, { unmade: true }),
      plantDead: put('plant_big', 11, 1, 0, { dead: true, water: 0 }),
      plantThirsty: put('plant_small', 13, 1, 0, { water: 5 }),
      tbl: put('table_dining', 15, 1, 0),
      ctr: put('counter', 18, 1, 0),
      ctr2: put('counter', 19, 1, 0),
      ctr3: put('counter', 20, 1, 0),
      ctr4: put('counter', 21, 1, 0),
    };
    // meals and plates (system objects) pushed directly into state
    const mkSys = (type, x, y, patch) => { const o = Object.assign({ id: M.util.nextId(st), type, x, y, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0 }, patch || {}); st.objects.push(o); return o.id; };
    ids.meal1 = mkSys('meal', 15, 1, { servings: 1, quality: 60, food: 'home' });
    ids.meal4 = mkSys('meal', 16, 1, { servings: 4, quality: 60, food: 'home' });
    ids.pizza = mkSys('meal', 18, 1, { servings: 4, quality: 40, food: 'pizza' });
    ids.spoiled = mkSys('meal', 19, 1, { servings: 2, spoiled: true });
    ids.plate = mkSys('dirty_plate', 20, 1, {});
    ids.plateS = mkSys('dirty_plate', 21, 1, { spoiled: true });
    ids.puddle = mkSys('puddle', 2, 4, { variant: 1 });
    ids.paper = mkSys('newspaper', 4, 4, {});
    M.util.bus.emit('objects');
    return ids;
  });
  await L.wait(800);
  for (const [nm, cam] of [['row-a', { k: 0, x: 4, z: 2, dist: 12 }], ['row-b', { k: 0, x: 11, z: 2, dist: 12 }], ['row-c', { k: 0, x: 18.5, z: 2, dist: 10 }], ['row-c-k2', { k: 2, x: 18.5, z: 1.5, dist: 9 }], ['floor-items', { k: 0, x: 3, z: 4, dist: 8 }]]) {
    await L.cam(cam); await L.wait(900); out[nm] = await L.shot(nm);
  }
  // carpool variants at the lot edge
  const cars = ['hatch', 'sedan', 'van', 'executive', 'limo', 'police'];
  out.cars = await page.evaluate((cars) => {
    const M = window.__morada.M, st = M.engine.state;
    const res = [];
    cars.forEach((car, i) => { const o = { id: M.util.nextId(st), type: 'carpool', x: 1 + i * 3 + (i > 3 ? 1 : 0), y: st.lot.h - 1, rot: 2, car, dirty: 0, broken: false, price: 0, uses: 0, simIds: [], leaveAt: 1e9 }; st.objects.push(o); res.push(o.id); });
    M.util.bus.emit('objects');
    return res;
  }, cars);
  await L.wait(600);
  await L.cam({ k: 0, x: 8, z: 19, dist: 16 }); await L.wait(900); out.carsShot = await L.shot('cars');
  await L.cam({ k: 2, x: 8, z: 19, dist: 16 }); await L.wait(900); out.carsShot2 = await L.shot('cars-k2');
  // wallpaper on one side: paint the bathroom's exterior wall v,17,7 with pink stripes and the kitchen/living wall with tiles
  out.paint = await page.evaluate(() => {
    const M = window.__morada.M, E = M.engine, D = M.data;
    const idx = (k) => D.WALLPAPERS.findIndex(w => /rosad/i.test(w.name) ? k === 'pink' : /Azulejo/i.test(w.name) ? k === 'tile' : false);
    const pink = D.WALLPAPERS.findIndex(w => /rosad/i.test(w.name)), tile = D.WALLPAPERS.findIndex(w => /Azulejo/i.test(w.name));
    const a = E.paintWall('v,17,7', pink), b = E.paintWall('v,17,8', pink);
    return { pink, tile, a, b, walls: ['v,17,7', 'h,7,10', 'v,12,9'].map(k => [k, JSON.stringify(E.state.lot.walls[k])]), papers: D.WALLPAPERS.map(w => w.name) };
  });
  await L.wait(600);
  await L.walls('up');
  await L.cam({ k: 0, x: 16, z: 7.5, dist: 12 }); await L.wait(900); out.paintOut = await L.shot('paint-outside');
  await L.cam({ k: 2, x: 16, z: 7.5, dist: 12 }); await L.wait(900); out.paintIn = await L.shot('paint-inside');
  await L.walls('cutaway');
  return out;
}
