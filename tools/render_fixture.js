// Hand-built state for the render demo: a small furnished house with every object category,
// walls with doors/windows, several floors and 5 characters in different animations.
(function () {
  'use strict';
  function makeState() {
    const W = 24, H = 20;
    const floors = new Array(W * H).fill(0);
    const walls = {};
    const setF = function (x0, y0, x1, y1, f) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) floors[y * W + x] = f; };
    const wall = function (k, t, c) { walls[k] = { t: t, c: c }; };
    // house: tiles x 6..16, y 5..12
    // rooms: bedroom (6..10, 5..7), bath (11..13, 5..7), office (14..16, 5..7),
    //        living (6..10, 8..12), kitchen (11..16, 8..12)
    setF(6, 5, 10, 7, 4);      // bedroom carpet
    setF(11, 5, 13, 7, 2);     // bath tile
    setF(14, 5, 16, 7, 7);     // office parquet
    setF(6, 8, 10, 12, 1);     // living wood
    setF(11, 8, 16, 12, 5);    // kitchen checker
    setF(8, 13, 8, 19, 3);     // path to the street
    setF(1, 13, 4, 17, 6);     // patio stone around the hot tub
    // exterior walls
    const ext = 1, bedP = 2, bathP = 9, offP = 5, livP = 1, kitP = 3;
    for (let x = 6; x <= 16; x++) { wall('h,' + x + ',5', 1, ext); wall('h,' + x + ',13', 1, ext); }
    for (let y = 5; y <= 12; y++) { wall('v,6,' + y, 1, ext); wall('v,17,' + y, 1, ext); }
    // windows + front door
    wall('h,8,13', 2, ext);
    for (const k of ['h,7,13', 'h,10,13', 'h,13,13', 'h,15,13', 'h,8,5', 'h,9,5', 'h,15,5', 'v,6,10', 'v,6,6', 'v,17,10', 'v,17,6']) wall(k, 3, ext);
    // interior walls
    for (let x = 6; x <= 16; x++) wall('h,' + x + ',8', 1, x <= 10 ? livP : kitP);
    wall('h,8,8', 2, livP);    // bedroom door
    wall('h,15,8', 2, kitP);   // office door
    for (let y = 5; y <= 12; y++) wall('v,11,' + y, 1, y <= 7 ? bathP : livP);
    wall('v,11,10', 2, livP);  // living <-> kitchen
    for (let y = 5; y <= 7; y++) wall('v,14,' + y, 1, offP);
    wall('v,14,6', 2, offP);   // bath door

    let id = 100;
    const objs = [];
    const O = function (type, x, y, rot, extra) { const o = Object.assign({ id: ++id, type: type, x: x, y: y, rot: rot || 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0 }, extra || {}); objs.push(o); return o; };
    // living
    const tv = O('tv_lux', 7, 8, 0);
    O('rug', 7, 9, 0);
    const sofa = O('sofa_cheap', 7, 11, 2);
    O('lamp_floor', 6, 12, 0);
    O('end_table', 9, 11, 2);
    O('plant_big', 10, 12, 0);
    O('painting_cheap', 6, 9, 3);
    O('armchair', 10, 9, 1);
    O('stereo', 6, 8, 0);
    // kitchen
    O('fridge_cheap', 11, 8, 0);
    O('counter', 12, 8, 0);
    const stove = O('stove', 13, 8, 0);
    O('counter', 14, 8, 0, { dirty: 700 });
    O('trash_can', 16, 8, 0);
    O('table_dining', 13, 11, 0);
    O('chair_wood', 13, 12, 2);
    O('chair_dining', 14, 12, 2);
    O('chair_wood', 12, 11, 3);
    O('meal', 13, 11, 0, { servings: 3 });
    O('dirty_plate', 14, 11, 0);
    O('dishwasher', 16, 10, 1);
    O('phone', 16, 12, 1);
    O('lamp_fancy', 11, 12, 0);
    O('table_small', 15, 9, 0);
    // bath
    O('toilet', 11, 5, 0);
    O('sink', 12, 5, 0);
    O('mirror', 12, 5, 0);
    O('shower', 13, 5, 0, { dirty: 800 });
    O('bathtub', 11, 7, 2);
    O('puddle', 13, 7, 0);
    // office
    const pc = O('computer', 14, 5, 0);
    O('bookshelf', 16, 5, 0);
    O('easel', 16, 7, 1);
    // bedroom
    const bed = O('bed_double', 6, 5, 0);
    O('end_table', 8, 5, 0);
    O('painting_lux', 9, 5, 0);
    O('plant_small', 10, 5, 0);
    O('lamp_floor', 10, 7, 0);
    // yard
    O('hot_tub', 1, 14, 0);
    O('exercise', 20, 9, 0);
    O('chess', 20, 4, 0);
    O('sculpture', 3, 9, 0);
    O('plant_small', 5, 13, 0, { dead: true });
    O('plant_small', 9, 13, 0);
    O('mailbox', 10, 19, 2);
    O('newspaper', 11, 18, 0);
    O('carpool', 13, 18, 2);
    O('arcade', 20, 13, 3, { broken: true });
    O('tv_cheap', 18, 16, 1);
    O('piano', 2, 6, 1);
    O('toilet_lux', 21, 17, 2);
    O('fridge_lux', 22, 17, 2);

    const sim = function (o) {
      return Object.assign({
        id: ++id, name: 'X', gender: 'f', colors: { skin: '#e2b48e', hair: '#3b2a20', shirt: '#4f80bf', pants: '#3d4a5c' },
        personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 },
        motives: { hunger: 50, comfort: 50, hygiene: 50, bladder: 50, energy: 50, fun: 50, social: 50, room: 50 },
        skills: {}, career: null, relationships: {}, x: 0, y: 0, facing: 0, queue: [], anim: 'idle', bubble: null,
        atWork: false, workReturnAt: 0, hidden: false, visitor: false, npcId: null, role: null, leaveAt: 0, lockouts: {},
        asleep: false, seated: false,
      }, o);
    };
    const sims = [
      sim({ name: 'Rita Alves', gender: 'f', colors: { skin: '#e8b98f', hair: '#4a2c1d', shirt: '#e07a5f', pants: '#34507a' },
        x: 7, y: 11, facing: Math.PI, anim: 'tv', seated: true, queue: [{ id: 1, kind: 'object', objId: tv.id, interaction: 'watch', phase: 'do' }] }),
      sim({ name: 'Caio Alves', gender: 'm', colors: { skin: '#c68e63', hair: '#1f1a17', shirt: '#3f8b88', pants: '#5a4a3a' },
        x: 13, y: 9, facing: Math.PI, anim: 'cook', queue: [{ id: 2, kind: 'object', objId: stove.id, interaction: 'cook', phase: 'do' }] }),
      sim({ name: 'Bia Souza', gender: 'f', colors: { skin: '#8d5a3b', hair: '#1a1210', shirt: '#f2c14e', pants: '#2f4a3a' },
        x: 6, y: 5.5, facing: 0, anim: 'sleep', seated: true, asleep: true, queue: [{ id: 3, kind: 'object', objId: bed.id, interaction: 'sleep', phase: 'do' }] }),
      sim({ name: 'Leo Prado', gender: 'm', colors: { skin: '#f0c9a5', hair: '#c9893f', shirt: '#6d50a0', pants: '#3a3d44' },
        x: 14, y: 6, facing: Math.PI, anim: 'computer', queue: [{ id: 4, kind: 'object', objId: pc.id, interaction: 'play', phase: 'do' }] }),
      sim({ name: 'Nina Reis', gender: 'f', visitor: true, colors: { skin: '#d9a77c', hair: '#8a3b2a', shirt: '#7fb685', pants: '#6b4f3a' },
        x: 7, y: 15, facing: 0.6, anim: 'dance' }),
    ];
    return {
      version: 1, householdName: 'Família Alves', seed: 1, nextId: id + 1,
      time: { day: 1, minute: 600 }, speed: 1, money: 6500,
      lot: { w: W, h: H, floors: floors, walls: walls },
      objects: objs, sims: sims, npcs: [], bills: [], lastBillDay: 1, notifications: [],
      settings: { freeWill: true, wallMode: 'cutaway', selectedSimId: sims[0].id }, stats: { daysPlayed: 0 },
    };
  }
  window.RENDER_FIXTURE = makeState;
})();
