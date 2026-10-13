// Engine dataSlots (via M.engine.slotsFor) vs M.world.slotsFor for every catalog type x 4 rotations,
// plus footprint vs modelTransform corner math (rotation of the rot-0 rect lands exactly on the footprint).
import { load } from './qa_cr_lib.mjs';
const { M } = load({ quiet: true });
const E = M.engine, W = M.world, D = M.data;
const st = E.newGame({ empty: true, members: [{ name: 'Ana Teste' }], seed: 7 });
let bad = 0, checked = 0;
const types = Object.keys(D.CATALOG);
for (const type of types) {
  const d = D.CATALOG[type];
  for (let rot = 0; rot < 4; rot++) {
    // modelTransform: rotate rot-0 corners [0,w]x[0,h] by rotY around origin then translate -> must equal footprint rect
    const mt = W.modelTransform(type, 5, 5, rot);
    const c = Math.cos(mt.rotY), s = Math.sin(mt.rotY);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [px, pz] of [[0, 0], [d.w, 0], [0, d.h], [d.w, d.h]]) {
      // THREE rotation.y: x' = x cos + z sin ; z' = -x sin + z cos
      const X = px * c + pz * s + mt.x, Z = -px * s + pz * c + mt.z;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); z0 = Math.min(z0, Z); z1 = Math.max(z1, Z);
    }
    const fp = W.footprint(type, 5, 5, rot);
    const fx0 = Math.min(...fp.map(t => t.x)), fx1 = Math.max(...fp.map(t => t.x)) + 1;
    const fz0 = Math.min(...fp.map(t => t.y)), fz1 = Math.max(...fp.map(t => t.y)) + 1;
    if ([x0 - fx0, x1 - fx1, z0 - fz0, z1 - fz1].some(v => Math.abs(v) > 1e-9)) { bad++; console.log('MODEL/FOOTPRINT MISMATCH', type, rot, { x0, x1, z0, z1 }, { fx0, fx1, fz0, fz1 }); }
    if (!d.slots || !d.slots.length) continue;
    const o = { id: 900000 + checked * 10 + rot + types.indexOf(type) * 1000, type, x: 8, y: 8, rot };
    const keep = st.objects; st.objects = keep.concat([o]);
    const es = E.slotsFor(o.id);
    const ws = W.slotsFor(o);
    st.objects = keep;
    for (let i = 0; i < d.slots.length; i++) {
      checked++;
      const a = es[i], b = ws[i];
      if (!a || !b) { bad++; console.log('missing slot', type, rot, i); continue; }
      const da = Math.abs(((a.facing - b.facing) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (a.x !== b.x || a.y !== b.y || Math.abs(a.px - b.px) > 1e-9 || Math.abs(a.py - b.py) > 1e-9 || da > 1e-6) {
        bad++; console.log('SLOT MISMATCH', type, 'rot', rot, 'slot', i, { eng: [a.x, a.y, a.px, a.py, a.facing], world: [b.x, b.y, b.px, b.py, b.facing] });
      }
    }
  }
}
console.log(JSON.stringify({ types: types.length, slotsChecked: checked, mismatches: bad }));
