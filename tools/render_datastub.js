// Minimal M.data stand-in for render tests, used only when js/data.js did not load.
(function (M) {
  'use strict';
  if (M.data && M.data.CATALOG) return;
  const T = function (type, w, h, extra) { return Object.assign({ type: type, model: type, w: w || 1, h: h || 1, surface: false, surfaceHeight: 0, light: false, wall: false, noBlock: false, slots: [] }, extra || {}); };
  const list = [
    T('chair_wood'), T('chair_dining'), T('armchair'), T('sofa_cheap', 2), T('sofa_lux', 2),
    T('bed_single', 1, 2), T('bed_double', 2, 2), T('bed_lux', 2, 2),
    T('counter', 1, 1, { surface: true, surfaceHeight: 0.9 }), T('table_dining', 2, 1, { surface: true, surfaceHeight: 0.78 }),
    T('table_small', 1, 1, { surface: true, surfaceHeight: 0.78 }), T('end_table', 1, 1, { surface: true, surfaceHeight: 0.6 }),
    T('fridge_cheap'), T('fridge_lux'), T('stove', 1, 1, { dirties: 80 }), T('dishwasher'), T('trash_can'),
    T('toilet', 1, 1, { dirties: 100 }), T('toilet_lux', 1, 1, { dirties: 60 }), T('shower', 1, 1, { dirties: 60 }), T('bathtub', 2, 1, { dirties: 60 }),
    T('sink', 1, 1, { dirties: 20 }), T('hot_tub', 2, 2), T('tv_cheap'), T('tv_lux', 2), T('stereo'), T('computer', 2), T('phone'), T('arcade'),
    T('lamp_floor', 1, 1, { light: true }), T('lamp_fancy', 1, 1, { light: true }), T('plant_small'), T('plant_big'),
    T('painting_cheap', 1, 1, { wall: true, noBlock: true }), T('painting_lux', 1, 1, { wall: true, noBlock: true }), T('mirror', 1, 1, { wall: true, noBlock: true }),
    T('sculpture'), T('rug', 2, 2, { noBlock: true }), T('bookshelf'), T('easel'), T('chess'), T('exercise', 1, 2), T('piano', 2),
    T('mailbox'), T('meal', 1, 1, { noBlock: true }), T('dirty_plate', 1, 1, { noBlock: true }), T('puddle', 1, 1, { noBlock: true }),
    T('newspaper', 1, 1, { noBlock: true }), T('carpool', 2, 1, { noBlock: true }),
  ];
  const CATALOG = {};
  for (const d of list) CATALOG[d.type] = d;
  M.data = Object.assign(M.data || {}, {
    CATALOG: CATALOG,
    FLOORS: [
      { key: 'grass', color: '#6aa84f' }, { key: 'wood', color: '#b07d4f' }, { key: 'tile', color: '#e6e1d3' },
      { key: 'concrete', color: '#a7a39b' }, { key: 'carpet', color: '#4f6d8f' }, { key: 'checker', color: '#d9d9d9' },
      { key: 'stone', color: '#cfc6b4' }, { key: 'parquet', color: '#7a4b2a' }, { key: 'marble', color: '#f0ece6' }, { key: 'terracotta', color: '#c56b43' },
    ],
    WALLPAPERS: [
      { key: 'white', color: '#f2efe8' }, { key: 'cream', color: '#efe2c4' }, { key: 'sky', color: '#a9cbe0' }, { key: 'mint', color: '#b9dcc2' },
      { key: 'terracotta', color: '#c9805e' }, { key: 'yellow', color: '#f1cf6b' }, { key: 'stripes', color: '#e5b3b8' }, { key: 'brick', color: '#a65a3f' },
      { key: 'wood', color: '#9b6b43' }, { key: 'tile', color: '#dfeef0' }, { key: 'navy', color: '#34506e' },
    ],
    DIRT: { visible: 500 }, PLANT: { thirstyBelow: 50 },
  });
})(window.M = window.M || {});
