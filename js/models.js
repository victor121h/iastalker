/*
 * Morada — M.models
 * Procedural low-poly "toy dollhouse" meshes for every catalog object, a stylised character rig with
 * procedural animation, and the mood orb. THREE only, no game logic.
 *
 * Conventions (ARCHITECTURE.md):
 *   - build(key) returns a Group whose origin is the footprint MIN corner; the model spans
 *     x in [0, w], z in [0, h] at rot 0 and its FRONT faces +Z. 1 unit = 1 tile, Y up.
 *   - Colors are authored as sRGB hex and converted to linear (the renderer outputs sRGB).
 *   - Each model is merged into ONE geometry per material kind (vertex colors), cached per
 *     model key + variant, so 20 chairs cost 20 cheap meshes sharing one geometry.
 *
 * Mesh kinds inside a built Group (child.userData.kind):
 *   solid   – opaque furniture (shared vertex-color material)
 *   glass   – transparent panes
 *   water   – translucent water (tub, puddle…)
 *   glow    – lamp shades / bulbs; swap to M.models.materials.glowOn at night
 *   screen  – TV/computer screens; swap to materials.screenOn while in use
 *   lit     – always-bright accents (arcade lights, LEDs)
 *   useHide – a part the character "takes" while using the object (phone handset, barbell)
 *
 * Character rig: see character(sim) / animate(rig, anim, t, ctx) below.
 */
(function (M) {
  'use strict';

  // ------------------------------------------------------------------ palette (sRGB hex)
  const C = {
    oak: '#d6a56b', oakDark: '#b7834f', pine: '#e6c08a', walnut: '#7d5437', walnutDark: '#5a3b26',
    white: '#f4f1ea', offwhite: '#e9e3d6', cream: '#f3e6cc', porcelain: '#f6f5f1', paper: '#faf7ef',
    steel: '#b9c0c7', steelDark: '#7f878f', chrome: '#dde2e6', black: '#2a2b30', charcoal: '#3a3d44',
    gray: '#8c9097', grayLight: '#c5c8cc', brass: '#c9a14b', gold: '#d8b143',
    teal: '#3f8b88', tealDark: '#2d6866', mustard: '#e1a53b', coral: '#e57b5f', terracotta: '#c4683f',
    navy: '#34507a', sage: '#8fae86', sageDark: '#6f8f68', plum: '#7f4f74', rose: '#e6a3a2', sky: '#8fc4e2',
    mint: '#a7d8bf', cognac: '#a25a32', cognacDark: '#7b4024', red: '#cc4b3f', yellow: '#f3c64f',
    green: '#5f9e57', leaf: '#4e8f46', leafLight: '#79b864', leafDark: '#3a7037', soil: '#5a3c2a',
    blue: '#4f80bf', purple: '#6d50a0', pink: '#ea90b2', orange: '#f08a3c', brown: '#8a5a3a',
    linen: '#efe8da', blanketBlue: '#5d86b5', blanketTerra: '#d0784e', velvet: '#2f4a6e',
    rubber: '#2b2b2e', asphalt: '#3d3f45',
  };

  const PI = Math.PI;
  const HP = Math.PI / 2;

  // ------------------------------------------------------------------ small utils
  function srand(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    s = String(s == null ? '' : s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  const colorCache = {};
  // sRGB css color -> linear THREE.Color (cached; do not mutate the result)
  function col(hex) {
    const key = typeof hex === 'number' ? hex : String(hex || '#ff00ff');
    let c = colorCache[key];
    if (!c) {
      c = new THREE.Color();
      try { c.set(key); } catch (e) { c.set('#ff00ff'); }
      c.convertSRGBToLinear();
      colorCache[key] = c;
    }
    return c;
  }
  function mixHex(a, b, t) {
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    ca.lerp(cb, t);
    return '#' + ca.getHexString();
  }
  function safeHex(v, def) {
    if (typeof v !== 'string' || !/^#?[0-9a-fA-F]{3,8}$|^rgb|^hsl/.test(v)) return def;
    return v[0] === '#' || /^rgb|^hsl/.test(v) ? v : '#' + v;
  }

  // ------------------------------------------------------------------ primitives (non-indexed)
  const PRIM = {};
  function nonIndexed(g) {
    const n = g.index ? g.toNonIndexed() : g;
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  }
  function triPrismGeo() {
    // triangle in XY (apex up, base y=-0.5..apex 0.5, x -0.5..0.5), extruded z -0.5..0.5
    const v = [
      [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0, 0.5, 0.5],
      [0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [0, 0.5, -0.5],
    ];
    const tris = [[0, 1, 2], [3, 4, 5], [0, 2, 5], [0, 5, 4], [1, 3, 5], [1, 5, 2], [0, 4, 3], [0, 3, 1]];
    const pos = [];
    for (const t of tris) for (const i of t) pos.push(v[i][0], v[i][1], v[i][2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  function frustumBoxGeo(bw, bd, tw, td, h, y0, tzOff) {
    // box whose bottom is bw×bd at y0 and top tw×td at y0+h (centered in x/z; top shifted by tzOff in z)
    tzOff = tzOff || 0;
    const b = [[-bw / 2, y0, -bd / 2], [bw / 2, y0, -bd / 2], [bw / 2, y0, bd / 2], [-bw / 2, y0, bd / 2]];
    const t = [[-tw / 2, y0 + h, -td / 2 + tzOff], [tw / 2, y0 + h, -td / 2 + tzOff], [tw / 2, y0 + h, td / 2 + tzOff], [-tw / 2, y0 + h, td / 2 + tzOff]];
    const quads = [
      [b[3], b[2], t[2], t[3]], // front +z
      [b[1], b[0], t[0], t[1]], // back
      [b[2], b[1], t[1], t[2]], // right +x
      [b[0], b[3], t[3], t[0]], // left
      [t[3], t[2], t[1], t[0]], // top
      [b[0], b[1], b[2], b[3]], // bottom
    ];
    const pos = [];
    for (const q of quads) {
      pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  function prim(key) {
    let g = PRIM[key];
    if (g) return g;
    const p = key.split(':');
    switch (p[0]) {
      case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;
      case 'cyl': g = new THREE.CylinderGeometry(+p[2], 1, 1, +p[1], 1); break;          // radius 1 bottom, ratio top
      case 'sph': g = new THREE.SphereGeometry(1, +p[1], +p[2]); break;
      case 'hemi': g = new THREE.SphereGeometry(1, +p[1], +p[2], 0, PI * 2, 0, PI / 2); break;
      case 'tri': g = triPrismGeo(); break;
      case 'quad': g = new THREE.PlaneGeometry(1, 1); g.rotateX(-HP); break;               // horizontal, facing +Y
      case 'vquad': g = new THREE.PlaneGeometry(1, 1); break;                               // vertical, facing +Z
      case 'torus': g = new THREE.TorusGeometry(1, +p[1], +p[2], +p[3]); g.rotateX(HP); break; // horizontal ring
      case 'ico': g = new THREE.IcosahedronGeometry(1, +p[1]); break;
      case 'oct': g = new THREE.OctahedronGeometry(1, 0); break;
      case 'circle': g = new THREE.CircleGeometry(1, +p[1]); g.rotateX(-HP); break;
      case 'wedge': g = new THREE.CylinderGeometry(1, 1, 1, +p[2], 1, false, 0, +p[1]); break;   // pie slice
      default: g = new THREE.BoxGeometry(1, 1, 1);
    }
    g = nonIndexed(g);
    PRIM[key] = g;
    return g;
  }

  // ------------------------------------------------------------------ builder
  const _p = { v: null, q: null, s: null, e: null, nm: null, tv: null };
  function tmp() {
    if (!_p.v) {
      _p.v = new THREE.Vector3(); _p.q = new THREE.Quaternion(); _p.s = new THREE.Vector3();
      _p.e = new THREE.Euler(); _p.nm = new THREE.Matrix3(); _p.tv = new THREE.Vector3();
    }
    return _p;
  }
  function localMatrix(px, py, pz, rx, ry, rz, sx, sy, sz) {
    const t = tmp();
    t.v.set(px || 0, py || 0, pz || 0);
    t.e.set(rx || 0, ry || 0, rz || 0);
    t.q.setFromEuler(t.e);
    t.s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return new THREE.Matrix4().compose(t.v, t.q, t.s);
  }

  function Builder() {
    this.parts = [];
    this.stack = [new THREE.Matrix4()];
  }
  Builder.prototype.push = function (px, py, pz, rx, ry, rz, sx, sy, sz) {
    const m = this.stack[this.stack.length - 1].clone().multiply(localMatrix(px, py, pz, rx, ry, rz, sx, sy, sz));
    this.stack.push(m);
    return this;
  };
  Builder.prototype.pop = function () { if (this.stack.length > 1) this.stack.pop(); return this; };
  Builder.prototype.add = function (geo, px, py, pz, sx, sy, sz, rx, ry, rz, color, kind) {
    const m = this.stack[this.stack.length - 1].clone().multiply(localMatrix(px, py, pz, rx, ry, rz, sx, sy, sz));
    this.parts.push({ geo: typeof geo === 'string' ? prim(geo) : geo, m: m, color: col(color), kind: kind || 'solid' });
    return this;
  };
  // axis-aligned box from min/max corners
  Builder.prototype.box = function (x0, y0, z0, x1, y1, z1, color, kind) {
    return this.add('box', (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2,
      Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 0, 0, 0, color, kind);
  };
  // centered box with optional rotation
  Builder.prototype.bx = function (cx, cy, cz, sx, sy, sz, color, kind, rx, ry, rz) {
    return this.add('box', cx, cy, cz, sx, sy, sz, rx, ry, rz, color, kind);
  };
  // vertical cylinder standing on y0
  Builder.prototype.cyl = function (cx, y0, cz, r, h, color, o) {
    o = o || {};
    const seg = o.seg || 12, top = o.top == null ? 1 : o.top;
    return this.add('cyl:' + seg + ':' + top, cx, y0 + h / 2, cz, r * (o.sx || 1), h, r * (o.sz || 1),
      o.rx, o.ry, o.rz, color, o.kind);
  };
  // cylinder centered at (cx,cy,cz), axis along X (len) — r radius
  Builder.prototype.cylX = function (cx, cy, cz, len, r, color, o) {
    o = o || {};
    return this.add('cyl:' + (o.seg || 10) + ':' + (o.top == null ? 1 : o.top), cx, cy, cz, r, len, r, 0, 0, HP, color, o.kind);
  };
  Builder.prototype.cylZ = function (cx, cy, cz, len, r, color, o) {
    o = o || {};
    return this.add('cyl:' + (o.seg || 10) + ':' + (o.top == null ? 1 : o.top), cx, cy, cz, r, len, r, HP, 0, 0, color, o.kind);
  };
  // generic cylinder between two points
  Builder.prototype.rod = function (ax, ay, az, bx, by, bz, r, color, o) {
    o = o || {};
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
    const t = tmp();
    t.tv.set(dx / len, dy / len, dz / len);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.tv);
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add('cyl:' + (o.seg || 8) + ':' + (o.top == null ? 1 : o.top), (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2,
      r, len, r, e.x, e.y, e.z, color, o.kind);
  };
  Builder.prototype.sph = function (cx, cy, cz, r, color, o) {
    o = o || {};
    const key = (o.hemi ? 'hemi:' : 'sph:') + (o.w || 10) + ':' + (o.h || 7);
    return this.add(key, cx, cy, cz, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o.rx, o.ry, o.rz, color, o.kind);
  };
  Builder.prototype.ico = function (cx, cy, cz, r, color, o) {
    o = o || {};
    return this.add('ico:' + (o.detail || 0), cx, cy, cz, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o.rx, o.ry, o.rz, color, o.kind);
  };
  Builder.prototype.tri = function (cx, cy, cz, sx, sy, sz, color, kind, rx, ry, rz) {
    return this.add('tri', cx, cy, cz, sx, sy, sz, rx, ry, rz, color, kind);
  };
  Builder.prototype.quad = function (x0, z0, x1, z1, y, color, kind) {
    return this.add('quad', (x0 + x1) / 2, y, (z0 + z1) / 2, Math.abs(x1 - x0), 1, Math.abs(z1 - z0), 0, 0, 0, color, kind);
  };
  // vertical quad facing +Z at plane z
  Builder.prototype.vquad = function (x0, y0, x1, y1, z, color, kind) {
    return this.add('vquad', (x0 + x1) / 2, (y0 + y1) / 2, z, Math.abs(x1 - x0), Math.abs(y1 - y0), 1, 0, 0, 0, color, kind);
  };
  Builder.prototype.ring = function (cx, cy, cz, R, tube, color, o) {
    o = o || {};
    const key = 'torus:' + tube + ':' + (o.rs || 5) + ':' + (o.ts || 16);
    return this.add(key, cx, cy, cz, R * (o.sx || 1), R * (o.sy || 1), R * (o.sz || 1), o.rx, o.ry, o.rz, color, o.kind);
  };
  Builder.prototype.geo = function (geometry, color, kind) {
    return this.add(nonIndexed(geometry), 0, 0, 0, 1, 1, 1, 0, 0, 0, color, kind);
  };
  // merge everything into one BufferGeometry per kind
  Builder.prototype.finish = function () {
    const t = tmp();
    const byKind = {};
    for (const p of this.parts) (byKind[p.kind] = byKind[p.kind] || []).push(p);
    const out = [];
    for (const kind of Object.keys(byKind)) {
      const list = byKind[kind];
      let n = 0;
      for (const p of list) n += p.geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), colr = new Float32Array(n * 3);
      let o = 0;
      for (const p of list) {
        const P = p.geo.attributes.position.array, N = p.geo.attributes.normal.array;
        const e = p.m.elements;
        t.nm.getNormalMatrix(p.m);
        const ne = t.nm.elements;
        const cr = p.color.r, cg = p.color.g, cb = p.color.b;
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i], y = P[i + 1], z = P[i + 2];
          pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
          pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          const nx = N[i], ny = N[i + 1], nz = N[i + 2];
          let ax = ne[0] * nx + ne[3] * ny + ne[6] * nz;
          let ay = ne[1] * nx + ne[4] * ny + ne[7] * nz;
          let az = ne[2] * nx + ne[5] * ny + ne[8] * nz;
          const l = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
          nor[o] = ax / l; nor[o + 1] = ay / l; nor[o + 2] = az / l;
          colr[o] = cr; colr[o + 1] = cg; colr[o + 2] = cb;
          o += 3;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      out.push({ kind: kind, geometry: g });
    }
    return out;
  };

  // ------------------------------------------------------------------ shared materials
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, flatShading: true });
    MATS = {
      solid: solid,
      useHide: solid,
      glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, transparent: true,
        opacity: 0.32, depthWrite: false }),
      water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.0, transparent: true,
        opacity: 0.78, depthWrite: false, flatShading: true }),
      glow: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }),
      glowOn: new THREE.MeshBasicMaterial({ vertexColors: true, color: col('#fff1c9') }),
      screen: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.2, color: col('#2a3036') }),
      screenOn: new THREE.MeshBasicMaterial({ vertexColors: true }),
      lit: new THREE.MeshBasicMaterial({ vertexColors: true }),
      // tinted variants used by the renderer
      solidDirty: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true,
        color: col('#c4cf9c') }),
      solidBroken: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true,
        color: col('#a7a29c') }),
    };
    MATS.ghostOk = new THREE.MeshStandardMaterial({ color: col('#59e38a'), emissive: col('#1f8f4a'), transparent: true,
      opacity: 0.55, depthWrite: false, roughness: 0.6, flatShading: true });
    MATS.ghostBad = new THREE.MeshStandardMaterial({ color: col('#ff6a5c'), emissive: col('#a3241a'), transparent: true,
      opacity: 0.55, depthWrite: false, roughness: 0.6, flatShading: true });
    return MATS;
  }

  // ------------------------------------------------------------------ object models
  // Each model: function (b: Builder, o: opts, def) -> meta
  // meta: { support, seatH, surfaceH, lightPos:[x,y,z], blanket, top, smoke:[x,y,z], wall }
  const MODELS = {};

  function legs4(b, x0, z0, x1, z1, h, s, color) {
    b.box(x0, 0, z0, x0 + s, h, z0 + s, color);
    b.box(x1 - s, 0, z0, x1, h, z0 + s, color);
    b.box(x0, 0, z1 - s, x0 + s, h, z1, color);
    b.box(x1 - s, 0, z1 - s, x1, h, z1, color);
  }
  function knob(b, x, y, z, color) { b.sph(x, y, z, 0.018, color || C.brass, { w: 6, h: 4 }); }

  // ---------------- seating
  MODELS.chair_wood = function (b) {
    const w = C.oak, wd = C.oakDark;
    b.box(0.29, 0, 0.66, 0.335, 0.42, 0.705, wd);
    b.box(0.665, 0, 0.66, 0.71, 0.42, 0.705, wd);
    b.box(0.29, 0, 0.27, 0.335, 1.02, 0.315, wd);         // back legs become posts
    b.box(0.665, 0, 0.27, 0.71, 1.02, 0.315, wd);
    b.box(0.27, 0.41, 0.26, 0.73, 0.455, 0.73, w);         // seat
    b.box(0.3, 0.6, 0.278, 0.7, 0.65, 0.31, w);             // slats
    b.box(0.3, 0.74, 0.278, 0.7, 0.79, 0.31, w);
    b.box(0.27, 0.9, 0.265, 0.73, 1.0, 0.322, w);           // top rail
    b.box(0.31, 0.13, 0.67, 0.69, 0.16, 0.695, wd);         // stretchers
    b.box(0.305, 0.13, 0.31, 0.32, 0.16, 0.67, wd);
    b.box(0.68, 0.13, 0.31, 0.695, 0.16, 0.67, wd);
    return { support: 'chair', seatH: 0.455, top: 1.02 };
  };
  MODELS.chair_dining = function (b) {
    const wd = C.walnut, fab = C.teal, fabL = '#4d9d99';
    b.box(0.28, 0, 0.67, 0.325, 0.4, 0.715, wd);
    b.box(0.675, 0, 0.67, 0.72, 0.4, 0.715, wd);
    b.box(0.28, 0, 0.27, 0.325, 0.4, 0.315, wd);
    b.box(0.675, 0, 0.27, 0.72, 0.4, 0.315, wd);
    b.box(0.27, 0.38, 0.26, 0.73, 0.41, 0.73, wd);          // seat frame
    b.box(0.28, 0.41, 0.28, 0.72, 0.465, 0.725, fab);       // cushion
    b.push(0.5, 0.45, 0.29, -0.1, 0, 0);                    // slightly reclined padded back
    b.box(-0.22, 0, -0.035, 0.22, 0.58, 0.02, wd);
    b.box(-0.2, 0.06, 0.02, 0.2, 0.54, 0.05, fabL);
    b.pop();
    return { support: 'chair', seatH: 0.465, top: 1.03 };
  };
  MODELS.armchair = function (b) {
    const f = C.mustard, fd = '#c98d2c', wd = C.walnutDark;
    for (const [x, z] of [[0.14, 0.15], [0.82, 0.15], [0.14, 0.85], [0.82, 0.85]]) b.cyl(x + 0.02, 0, z, 0.03, 0.1, wd, { seg: 6, top: 0.7 });
    b.box(0.1, 0.1, 0.12, 0.9, 0.36, 0.92, fd);             // base
    b.box(0.23, 0.36, 0.3, 0.77, 0.46, 0.92, f);            // seat cushion
    b.box(0.08, 0.1, 0.12, 0.24, 0.62, 0.92, f);            // arms
    b.box(0.76, 0.1, 0.12, 0.92, 0.62, 0.92, f);
    b.box(0.07, 0.6, 0.12, 0.25, 0.66, 0.93, fd);           // arm tops
    b.box(0.75, 0.6, 0.12, 0.93, 0.66, 0.93, fd);
    b.push(0.5, 0.3, 0.2, -0.16, 0, 0);                     // reclined back
    b.box(-0.4, 0, -0.1, 0.4, 0.72, 0.08, fd);
    b.box(-0.27, 0.12, 0.06, 0.27, 0.66, 0.16, f);           // back cushion
    b.pop();
    b.sph(0.5, 0.56, 0.36, 0.13, C.cream, { sx: 1.3, sy: 0.75, sz: 0.45, w: 8, h: 6, rx: -0.2 }); // small pillow
    return { support: 'chair', seatH: 0.46, top: 1.0 };
  };
  function sofa(b, f, fd, cush, legC, lux) {
    for (const [x, z] of [[0.1, 0.16], [1.9, 0.16], [0.1, 0.86], [1.9, 0.86]]) {
      if (lux) b.cyl(x, 0, z, 0.025, 0.12, C.chrome, { seg: 6 });
      else b.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.1, z + 0.03, legC);
    }
    const y0 = lux ? 0.12 : 0.1;
    b.box(0.05, y0, 0.1, 1.95, 0.36, 0.92, fd);              // base
    b.box(0.2, 0.36, 0.32, 0.985, 0.45, 0.92, cush);         // seat cushions
    b.box(1.015, 0.36, 0.32, 1.8, 0.45, 0.92, cush);
    b.box(0.05, y0, 0.1, 1.95, lux ? 0.86 : 0.9, 0.32, fd);  // back
    b.box(0.03, y0, 0.1, 0.2, lux ? 0.58 : 0.62, 0.93, f);   // arms
    b.box(1.8, y0, 0.1, 1.97, lux ? 0.58 : 0.62, 0.93, f);
    if (lux) {
      // tufted back with buttons
      b.box(0.2, 0.45, 0.3, 1.8, 0.84, 0.36, f);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) b.sph(0.33 + i * 0.27, 0.56 + j * 0.17, 0.362, 0.014, C.cognacDark, { w: 5, h: 4 });
      b.box(0.03, 0.56, 0.1, 0.2, 0.6, 0.93, fd);
      b.box(1.8, 0.56, 0.1, 1.97, 0.6, 0.93, fd);
      b.sph(0.4, 0.58, 0.42, 0.14, C.mustard, { sx: 1.2, sy: 1, sz: 0.4, w: 8, h: 6, rx: -0.25, rz: 0.15 });
      b.sph(1.62, 0.58, 0.42, 0.14, C.teal, { sx: 1.2, sy: 1, sz: 0.4, w: 8, h: 6, rx: -0.25, rz: -0.15 });
    } else {
      b.box(0.21, 0.45, 0.3, 0.985, 0.83, 0.42, cush);       // back cushions
      b.box(1.015, 0.45, 0.3, 1.79, 0.83, 0.42, cush);
      b.sph(0.36, 0.58, 0.47, 0.13, C.coral, { sx: 1.2, sy: 1, sz: 0.4, w: 8, h: 6, rx: -0.25, rz: 0.2 });
    }
  }
  MODELS.sofa_cheap = function (b) {
    sofa(b, C.sage, C.sageDark, '#9dbb94', C.walnutDark, false);
    return { support: 'sofa', seatH: 0.45, top: 0.9 };
  };
  MODELS.sofa_lux = function (b) {
    sofa(b, C.cognac, C.cognacDark, '#b0653a', C.chrome, true);
    return { support: 'sofa', seatH: 0.45, top: 0.86 };
  };

  // ---------------- beds
  function bed(b, W, o, st) {
    // W = width in tiles (1 or 2); st = style { frame, head, blanket, fold, pillows:[colors], lux }
    const L = 2, x0 = 0.04, x1 = W - 0.04;
    const fr = st.frame;
    // frame + legs
    for (const [x, z] of [[x0 + 0.03, 0.06], [x1 - 0.03, 0.06], [x0 + 0.03, L - 0.06], [x1 - 0.03, L - 0.06]]) {
      b.box(x - 0.035, 0, z - 0.035, x + 0.035, 0.18, z + 0.035, st.leg || fr);
    }
    b.box(x0, 0.14, 0.08, x1, 0.32, L - 0.04, fr);           // side rails/box
    // headboard
    if (st.lux) {
      b.box(x0 - 0.02, 0, 0.02, x1 + 0.02, 1.25, 0.1, fr);
      b.box(x0 + 0.06, 0.45, 0.095, x1 - 0.06, 1.18, 0.15, st.head);
      const n = Math.round((x1 - x0) / 0.24);
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) b.sph(x0 + 0.18 + i * ((x1 - x0 - 0.36) / Math.max(1, n - 1)), 0.68 + j * 0.25, 0.152, 0.015, '#22344f', { w: 5, h: 4 });
    } else {
      b.box(x0, 0, 0.02, x1, 0.95, 0.09, fr);
      b.box(x0 + 0.07, 0.55, 0.085, x1 - 0.07, 0.86, 0.1, st.head);
    }
    // footboard
    b.box(x0, 0, L - 0.08, x1, st.lux ? 0.5 : 0.56, L - 0.02, fr);
    // mattress
    b.box(x0 + 0.03, 0.32, 0.1, x1 - 0.03, 0.5, L - 0.08, C.white);
    // pillows
    const pw = W === 1 ? 1 : 2;
    for (let i = 0; i < pw; i++) {
      const cx = W === 1 ? 0.5 : 0.5 + i;
      const skew = o.unmade ? (i ? 0.35 : -0.25) : 0;
      b.sph(cx + (o.unmade ? 0.06 : 0), 0.56, 0.27 + (o.unmade ? 0.05 : 0), 0.3, st.pillows[0], { sx: 1, sy: 0.24, sz: 0.48, w: 10, h: 6, ry: skew });
      if (st.lux) b.sph(cx, 0.66, 0.2, 0.25, st.pillows[1] || st.pillows[0], { sx: 1, sy: 0.4, sz: 0.2, w: 10, h: 6, rx: -0.5 });
    }
    // blanket
    const bl = st.blanket, fold = st.fold;
    if (!o.unmade) {
      b.box(x0 + 0.01, 0.3, 0.68, x1 - 0.01, 0.535, L - 0.06, bl);
      b.box(x0 + 0.005, 0.31, 0.6, x1 - 0.005, 0.548, 0.74, fold);   // folded sheet band
      if (st.lux) b.box(x0 + 0.005, 0.31, 1.55, x1 - 0.005, 0.552, 1.8, st.runner || C.gold);
    } else {
      b.box(x0 + 0.01, 0.3, 1.3, x1 - 0.01, 0.53, L - 0.06, bl);
      b.push(W / 2, 0.55, 1.12, 0.25, 0.15, 0.05);
      b.box(-(W / 2 - 0.12), -0.06, -0.22, W / 2 - 0.16, 0.05, 0.2, bl);
      b.pop();
      b.push(W / 2 - 0.1, 0.52, 0.85, -0.1, -0.3, 0.08);
      b.box(-(W / 2 - 0.25), -0.02, -0.15, W / 2 - 0.3, 0.035, 0.18, fold);
      b.pop();
    }
    return { support: 'bed', seatH: 0.5, blanket: bl, top: st.lux ? 1.25 : 0.95 };
  }
  MODELS.bed_single = function (b, o) {
    return bed(b, 1, o, { frame: C.oak, head: C.oakDark, blanket: C.blanketBlue, fold: C.white, pillows: [C.white] });
  };
  MODELS.bed_double = function (b, o) {
    return bed(b, 2, o, { frame: C.walnut, head: C.walnutDark, blanket: C.blanketTerra, fold: C.cream, pillows: [C.white] });
  };
  MODELS.bed_lux = function (b, o) {
    return bed(b, 2, o, { frame: C.walnutDark, head: C.velvet, blanket: '#f2efe8', fold: '#ffffff', runner: C.mustard,
      pillows: [C.white, C.mustard], lux: true, leg: C.brass });
  };

  // ---------------- surfaces
  function cabinet(b, x0, x1, opts) {
    // kitchen cabinet base unit, back at z=0.06, front at z=0.95, top surface 0.9
    opts = opts || {};
    const body = opts.body || '#e8e1d3', door = opts.door || '#f3eee3', top = opts.top || '#5e636b';
    b.box(x0 + 0.02, 0.0, 0.1, x1 - 0.02, 0.08, 0.9, C.charcoal);    // toe kick
    b.box(x0, 0.08, 0.06, x1, 0.86, 0.95, body);
    b.box(x0, 0.86, 0.05, x1, 0.9, 1.0, top);                        // countertop (overhang)
    if (opts.noDoors) return;
    const mid = (x0 + x1) / 2;
    b.box(x0 + 0.02, 0.1, 0.948, x1 - 0.02, 0.845, 0.952, opts.gap || '#b9b0a0');   // shadow gaps behind the fronts
    b.box(x0 + 0.03, 0.66, 0.95, x1 - 0.03, 0.83, 0.965, door);      // drawer
    b.box(mid - 0.08, 0.735, 0.965, mid + 0.08, 0.755, 0.98, C.steel);
    b.box(x0 + 0.03, 0.11, 0.95, mid - 0.01, 0.63, 0.965, door);     // doors
    b.box(mid + 0.01, 0.11, 0.95, x1 - 0.03, 0.63, 0.965, door);
    b.box(mid - 0.05, 0.5, 0.965, mid - 0.035, 0.6, 0.98, C.steel);
    b.box(mid + 0.035, 0.5, 0.965, mid + 0.05, 0.6, 0.98, C.steel);
  }
  MODELS.counter = function (b) {
    cabinet(b, 0, 1);
    // tiny detail: a cutting board corner
    b.box(0.62, 0.9, 0.15, 0.9, 0.915, 0.36, C.oak);
    return { surfaceH: 0.9, top: 0.92 };
  };
  MODELS.table_dining = function (b) {
    const w = C.oak, wd = C.oakDark;
    legs4(b, 0.1, 0.13, 1.9, 0.87, 0.74, 0.06, wd);
    b.box(0.12, 0.66, 0.15, 1.88, 0.74, 0.85, wd);           // apron
    b.box(0.05, 0.74, 0.08, 1.95, 0.78, 0.92, w);            // top
    // centerpiece: small vase with flowers between the two tiles
    b.cyl(1.0, 0.78, 0.5, 0.045, 0.12, C.teal, { seg: 8, top: 0.7 });
    b.sph(0.985, 0.94, 0.49, 0.03, C.coral, { w: 6, h: 4 });
    b.sph(1.02, 0.93, 0.515, 0.026, C.yellow, { w: 6, h: 4 });
    b.sph(1.005, 0.955, 0.525, 0.024, C.pink, { w: 6, h: 4 });
    return { surfaceH: 0.78, top: 0.8 };
  };
  MODELS.table_small = function (b) {
    const w = C.pine, wd = C.oakDark;
    legs4(b, 0.15, 0.15, 0.85, 0.85, 0.74, 0.05, wd);
    b.box(0.17, 0.67, 0.17, 0.83, 0.74, 0.83, wd);
    b.box(0.1, 0.74, 0.1, 0.9, 0.78, 0.9, w);
    return { surfaceH: 0.78, top: 0.8 };
  };
  MODELS.end_table = function (b) {
    const w = C.walnut, wd = C.walnutDark;
    legs4(b, 0.24, 0.24, 0.76, 0.76, 0.56, 0.04, wd);
    b.box(0.25, 0.4, 0.25, 0.75, 0.56, 0.75, w);
    b.box(0.29, 0.43, 0.75, 0.71, 0.53, 0.765, '#93653f');   // drawer front
    knob(b, 0.5, 0.48, 0.775);
    b.box(0.22, 0.56, 0.22, 0.78, 0.6, 0.78, w);
    b.box(0.25, 0.08, 0.25, 0.75, 0.1, 0.75, w);              // lower shelf
    // a couple of books at the corner
    b.box(0.6, 0.6, 0.28, 0.75, 0.625, 0.45, C.navy);
    b.box(0.61, 0.625, 0.3, 0.74, 0.645, 0.44, C.coral);
    return { surfaceH: 0.6, top: 0.65 };
  };

  // ---------------- appliances
  MODELS.fridge_cheap = function (b) {
    const body = '#f2efe8';
    b.box(0.13, 0, 0.1, 0.87, 0.06, 0.82, C.charcoal);
    b.box(0.11, 0.06, 0.08, 0.89, 1.8, 0.84, body);
    b.box(0.115, 1.265, 0.84, 0.885, 1.29, 0.848, '#9f9a90');   // freezer split
    b.box(0.11, 1.78, 0.08, 0.89, 1.81, 0.845, '#dcd7cc');
    b.box(0.17, 1.66, 0.84, 0.3, 1.69, 0.848, C.steelDark);
    b.box(0.79, 1.36, 0.85, 0.82, 1.62, 0.885, C.steel);         // handles
    b.box(0.79, 0.75, 0.85, 0.82, 1.18, 0.885, C.steel);
    // magnets + a note
    b.box(0.3, 1.0, 0.84, 0.36, 1.05, 0.852, C.red);
    b.box(0.42, 0.95, 0.84, 0.47, 1.0, 0.852, C.yellow);
    b.box(0.26, 0.82, 0.84, 0.42, 0.98, 0.848, C.paper);
    b.box(0.5, 1.45, 0.84, 0.55, 1.5, 0.852, C.teal);
    return { top: 1.8, smoke: [0.5, 1.85, 0.5] };
  };
  MODELS.fridge_lux = function (b) {
    const st = '#c9ced3', st2 = '#b5bbc1';
    b.box(0.07, 0, 0.09, 0.93, 0.06, 0.85, C.charcoal);
    b.box(0.05, 0.06, 0.06, 0.95, 1.86, 0.86, st);
    b.box(0.495, 0.08, 0.86, 0.505, 1.84, 0.866, C.steelDark);   // door split
    b.box(0.44, 0.7, 0.866, 0.465, 1.55, 0.9, C.chrome);         // handles
    b.box(0.535, 0.7, 0.866, 0.56, 1.55, 0.9, C.chrome);
    b.box(0.15, 1.05, 0.862, 0.38, 1.4, 0.872, '#3a4048');       // dispenser
    b.box(0.2, 1.31, 0.872, 0.33, 1.36, 0.876, '#7fd4ff', 'lit');
    b.box(0.22, 1.12, 0.872, 0.31, 1.2, 0.885, C.steelDark);
    b.box(0.06, 1.86, 0.06, 0.94, 1.88, 0.84, st2);
    return { top: 1.88, smoke: [0.5, 1.95, 0.5] };
  };
  MODELS.stove = function (b) {
    const en = '#f1ece2';
    b.box(0.06, 0, 0.1, 0.94, 0.08, 0.9, C.charcoal);
    b.box(0.04, 0.08, 0.06, 0.96, 0.86, 0.94, en);
    b.box(0.03, 0.86, 0.05, 0.97, 0.9, 0.97, C.black);            // cooktop
    for (const [x, z] of [[0.28, 0.3], [0.72, 0.3], [0.28, 0.7], [0.72, 0.7]]) {
      b.cyl(x, 0.9, z, 0.11, 0.008, '#4a4d54', { seg: 12 });
      b.cyl(x, 0.905, z, 0.05, 0.012, '#1d1e22', { seg: 10 });
      b.box(x - 0.12, 0.905, z - 0.008, x + 0.12, 0.925, z + 0.008, '#25262b');
      b.box(x - 0.008, 0.905, z - 0.12, x + 0.008, 0.925, z + 0.12, '#25262b');
    }
    b.box(0.04, 0.9, 0.05, 0.96, 1.08, 0.11, en);                  // backguard
    b.box(0.1, 0.96, 0.11, 0.9, 1.03, 0.115, '#d8d2c6');
    // oven door with window + handle
    b.box(0.1, 0.14, 0.94, 0.9, 0.7, 0.955, '#e6e0d4');
    b.box(0.22, 0.28, 0.955, 0.78, 0.56, 0.96, '#2e2a28');
    b.box(0.18, 0.62, 0.97, 0.82, 0.645, 0.995, C.steel);
    // knobs
    for (let i = 0; i < 4; i++) b.cylZ(0.2 + i * 0.2, 0.78, 0.955, 0.03, 0.028, C.charcoal, { seg: 8 });
    // a pot on the back-left burner
    b.cyl(0.28, 0.925, 0.3, 0.1, 0.12, '#c75b3a', { seg: 12 });
    b.cyl(0.28, 1.045, 0.3, 0.104, 0.015, '#a84a2e', { seg: 12 });
    b.sph(0.28, 1.07, 0.3, 0.02, C.charcoal, { w: 6, h: 4 });
    b.box(0.37, 0.98, 0.29, 0.46, 0.995, 0.31, C.charcoal);
    return { top: 1.1, smoke: [0.5, 1.0, 0.5] };
  };
  MODELS.dishwasher = function (b) {
    cabinet(b, 0, 1, { noDoors: true });
    b.box(0.03, 0.1, 0.95, 0.97, 0.84, 0.965, '#c9ced3');           // stainless front
    b.box(0.03, 0.74, 0.965, 0.97, 0.84, 0.968, '#aeb4ba');
    b.box(0.2, 0.67, 0.965, 0.8, 0.69, 0.99, C.chrome);             // handle bar
    b.box(0.08, 0.77, 0.967, 0.2, 0.8, 0.972, '#4adf8a', 'lit');    // status led strip
    b.box(0.7, 0.775, 0.967, 0.74, 0.795, 0.972, '#ffcb57', 'lit');
    return { surfaceH: 0.9, top: 0.92, smoke: [0.5, 0.95, 0.6] };
  };
  MODELS.trash_can = function (b) {
    b.cyl(0.5, 0, 0.5, 0.17, 0.5, '#5c8f6a', { seg: 14, top: 1.08 });
    b.cyl(0.5, 0.5, 0.5, 0.19, 0.04, '#4b7a58', { seg: 14 });
    b.cyl(0.5, 0.54, 0.5, 0.15, 0.02, '#4b7a58', { seg: 14, top: 0.6 });
    b.box(0.46, 0.0, 0.66, 0.54, 0.035, 0.74, C.charcoal);          // pedal
    b.box(0.42, 0.25, 0.67, 0.58, 0.29, 0.69, '#e8e4da');            // label band
    return { top: 0.58 };
  };

  // ---------------- plumbing
  MODELS.toilet = function (b) {
    const p = C.porcelain, p2 = '#e7e6e1';
    b.box(0.28, 0.42, 0.08, 0.72, 0.82, 0.27, p);                    // tank
    b.box(0.26, 0.82, 0.07, 0.74, 0.86, 0.28, p2);
    b.cyl(0.5, 0.86, 0.17, 0.03, 0.015, C.chrome, { seg: 8 });
    b.cyl(0.5, 0, 0.5, 0.13, 0.3, p, { seg: 14, top: 1.25, sz: 1.3 });   // pedestal + bowl
    b.cyl(0.5, 0.3, 0.52, 0.19, 0.1, p, { seg: 16, sz: 1.25 });
    b.ring(0.5, 0.41, 0.53, 0.165, 0.18, '#ffffff', { sz: 1.25, rs: 5, ts: 18 });   // seat
    b.cyl(0.5, 0.395, 0.53, 0.14, 0.02, '#8fc3dd', { seg: 14, sz: 1.25 });          // water
    b.push(0.5, 0.43, 0.29, -0.2, 0, 0);                              // lid open against tank
    b.cyl(0, 0.0, 0.0, 0.18, 0.025, '#fafafa', { seg: 14, sx: 1, sz: 1.2, rx: HP });
    b.pop();
    return { support: 'toilet', seatH: 0.43, top: 0.86, smoke: [0.5, 0.95, 0.3] };
  };
  MODELS.toilet_lux = function (b) {
    const p = '#fbfbf8', acc = '#3c4a5c';
    b.box(0.22, 0.0, 0.06, 0.78, 0.95, 0.24, acc);                     // wall unit
    b.box(0.38, 0.72, 0.24, 0.62, 0.86, 0.255, C.gold);                // flush plate
    b.box(0.43, 0.76, 0.255, 0.49, 0.82, 0.262, '#fff6d8');
    b.box(0.51, 0.76, 0.255, 0.57, 0.82, 0.262, '#fff6d8');
    b.cyl(0.5, 0.1, 0.5, 0.12, 0.22, p, { seg: 14, top: 1.5, sz: 1.4 });
    b.cyl(0.5, 0.31, 0.52, 0.2, 0.1, p, { seg: 18, sz: 1.3 });
    b.ring(0.5, 0.415, 0.53, 0.17, 0.2, '#e9d9bd', { sz: 1.3, rs: 5, ts: 18 });     // heated seat (warm tone)
    b.cyl(0.5, 0.4, 0.53, 0.145, 0.022, '#8fc3dd', { seg: 14, sz: 1.3 });
    // side control panel
    b.box(0.74, 0.3, 0.42, 0.79, 0.44, 0.66, '#d9dde2');
    b.box(0.79, 0.36, 0.46, 0.795, 0.4, 0.5, '#59d0ff', 'lit');
    b.box(0.79, 0.36, 0.54, 0.795, 0.4, 0.58, '#7cf09a', 'lit');
    b.push(0.5, 0.44, 0.27, -0.18, 0, 0);
    b.cyl(0, 0, 0, 0.19, 0.03, '#f4f4f0', { seg: 16, sz: 1.25, rx: HP });
    b.pop();
    return { support: 'toilet', seatH: 0.44, top: 0.95, smoke: [0.5, 1.0, 0.3] };
  };
  MODELS.shower = function (b) {
    const tile = '#cfe6ea', tileD = '#b6d4da';
    b.box(0.03, 0, 0.05, 0.97, 0.09, 0.97, '#f5f5f2');                // tray
    b.box(0.12, 0.09, 0.14, 0.88, 0.092, 0.88, '#e3e8ea');
    b.cyl(0.5, 0.092, 0.5, 0.04, 0.004, C.steelDark, { seg: 8 });
    b.box(0.03, 0.09, 0.05, 0.97, 2.1, 0.11, tile);                   // tiled back panel
    for (let i = 1; i < 7; i++) b.box(0.03, 0.09 + i * 0.29, 0.11, 0.97, 0.1 + i * 0.29, 0.112, tileD);
    for (let i = 1; i < 4; i++) b.box(0.03 + i * 0.235, 0.09, 0.11, 0.04 + i * 0.235, 2.1, 0.112, tileD);
    // frame posts + top rails (chrome)
    for (const [x, z] of [[0.04, 0.95], [0.96, 0.95], [0.04, 0.1], [0.96, 0.1]]) b.box(x - 0.015, 0.09, z - 0.015, x + 0.015, 2.0, z + 0.015, C.chrome);
    b.box(0.03, 1.99, 0.935, 0.97, 2.02, 0.965, C.chrome);
    b.box(0.025, 1.99, 0.1, 0.055, 2.02, 0.96, C.chrome);
    b.box(0.945, 1.99, 0.1, 0.975, 2.02, 0.96, C.chrome);
    // glass
    b.box(0.05, 0.1, 0.945, 0.95, 1.98, 0.955, '#cfeaf5', 'glass');
    b.box(0.035, 0.1, 0.11, 0.045, 1.98, 0.94, '#cfeaf5', 'glass');
    b.box(0.955, 0.1, 0.11, 0.965, 1.98, 0.94, '#cfeaf5', 'glass');
    b.box(0.47, 0.9, 0.96, 0.49, 1.25, 0.985, C.chrome);               // door handle
    // shower head + pipe + taps
    b.box(0.48, 1.4, 0.11, 0.52, 2.06, 0.14, C.chrome);
    b.box(0.48, 2.03, 0.11, 0.52, 2.06, 0.32, C.chrome);
    b.cyl(0.5, 1.99, 0.33, 0.07, 0.05, C.chrome, { seg: 12, top: 0.6 });
    b.cylZ(0.42, 1.1, 0.13, 0.04, 0.025, C.chrome, { seg: 8 });
    b.cylZ(0.58, 1.1, 0.13, 0.04, 0.025, C.chrome, { seg: 8 });
    // shelf with bottles
    b.box(0.72, 1.25, 0.11, 0.92, 1.27, 0.2, C.chrome);
    b.cyl(0.77, 1.27, 0.155, 0.025, 0.12, C.coral, { seg: 8 });
    b.cyl(0.84, 1.27, 0.155, 0.022, 0.09, C.mint, { seg: 8 });
    return { support: 'shower', seatH: 0.09, top: 2.1, smoke: [0.5, 2.15, 0.5] };
  };
  MODELS.bathtub = function (b) {
    const p = C.porcelain, p2 = '#e9e8e3';
    // claw feet
    for (const [x, z] of [[0.18, 0.2], [1.82, 0.2], [0.18, 0.82], [1.82, 0.82]]) b.sph(x, 0.05, z, 0.06, C.gold, { w: 8, h: 6 });
    b.box(0.06, 0.06, 0.1, 1.94, 0.18, 0.92, p);                      // bottom
    b.box(0.04, 0.06, 0.08, 1.96, 0.55, 0.2, p);                      // walls
    b.box(0.04, 0.06, 0.82, 1.96, 0.55, 0.94, p);
    b.box(0.04, 0.06, 0.2, 0.18, 0.55, 0.82, p);
    b.box(1.82, 0.06, 0.2, 1.96, 0.55, 0.82, p);
    b.box(0.02, 0.55, 0.06, 1.98, 0.58, 0.2, p2);                     // rim (frame)
    b.box(0.02, 0.55, 0.82, 1.98, 0.58, 0.96, p2);
    b.box(0.02, 0.55, 0.2, 0.18, 0.58, 0.82, p2);
    b.box(1.82, 0.55, 0.2, 1.98, 0.58, 0.82, p2);
    b.box(0.18, 0.18, 0.2, 1.82, 0.181, 0.82, '#b9cfd8');
    b.box(0.18, 0.4, 0.2, 1.82, 0.41, 0.82, '#62b0d8', 'water');      // water surface
    for (let i = 0; i < 6; i++) b.sph(0.5 + i * 0.2, 0.41, 0.3 + (i % 3) * 0.2, 0.05, '#ffffff', { w: 6, h: 3, sy: 0.35, kind: 'water' });   // foam
    // faucet at the +x end
    b.box(1.86, 0.58, 0.47, 1.9, 0.72, 0.53, C.chrome);
    b.box(1.76, 0.69, 0.475, 1.9, 0.72, 0.525, C.chrome);
    b.cylZ(1.88, 0.62, 0.42, 0.03, 0.02, C.chrome, { seg: 8 });
    b.cylZ(1.88, 0.62, 0.58, 0.03, 0.02, C.chrome, { seg: 8 });
    // rubber duck on the rim
    b.sph(0.12, 0.62, 0.86, 0.04, C.yellow, { w: 8, h: 6, sx: 1.2 });
    b.sph(0.1, 0.68, 0.87, 0.025, C.yellow, { w: 8, h: 6 });
    b.box(0.065, 0.67, 0.86, 0.085, 0.68, 0.88, C.orange);
    return { support: 'tub', seatH: 0.18, top: 0.72, smoke: [1.0, 0.8, 0.5] };
  };
  MODELS.sink = function (b) {
    const cab = '#ffffff', wd = C.oak;
    b.box(0.17, 0, 0.12, 0.83, 0.06, 0.82, C.charcoal);
    b.box(0.15, 0.06, 0.08, 0.85, 0.8, 0.85, wd);                     // vanity cabinet
    b.box(0.19, 0.1, 0.85, 0.495, 0.76, 0.865, C.oakDark);
    b.box(0.505, 0.1, 0.85, 0.81, 0.76, 0.865, C.oakDark);
    knob(b, 0.46, 0.62, 0.875, C.chrome); knob(b, 0.54, 0.62, 0.875, C.chrome);
    b.box(0.13, 0.8, 0.06, 0.87, 0.86, 0.9, cab);                     // basin top
    b.cyl(0.5, 0.835, 0.52, 0.2, 0.03, '#e2e6e8', { seg: 16, sz: 0.8 });
    b.cyl(0.5, 0.825, 0.52, 0.035, 0.012, C.steelDark, { seg: 8 });
    // faucet
    b.cyl(0.5, 0.86, 0.17, 0.025, 0.14, C.chrome, { seg: 8 });
    b.box(0.485, 0.98, 0.17, 0.515, 1.0, 0.3, C.chrome);
    b.cyl(0.41, 0.86, 0.17, 0.02, 0.05, C.chrome, { seg: 8 });
    b.cyl(0.59, 0.86, 0.17, 0.02, 0.05, C.chrome, { seg: 8 });
    // soap
    b.box(0.68, 0.86, 0.14, 0.78, 0.89, 0.22, C.rose);
    return { top: 1.0, smoke: [0.5, 1.05, 0.5] };
  };
  MODELS.hot_tub = function (b) {
    const wood = '#9a6440', woodD = '#7d4f31', cap = '#d9c7a6';
    b.box(0.02, 0, 0.02, 1.98, 0.6, 1.98, wood);
    for (let i = 1; i < 8; i++) {
      const y = i * 0.075;
      b.box(0.015, y, 0.015, 1.985, y + 0.008, 1.985, woodD);
    }
    b.box(0.0, 0.6, 0.0, 2.0, 0.66, 0.16, cap);                      // rim cap
    b.box(0.0, 0.6, 1.84, 2.0, 0.66, 2.0, cap);
    b.box(0.0, 0.6, 0.16, 0.16, 0.66, 1.84, cap);
    b.box(1.84, 0.6, 0.16, 2.0, 0.66, 1.84, cap);
    b.box(0.16, 0.6, 0.16, 1.84, 0.605, 1.84, '#4d8f98');            // inner basin (dark teal)
    b.box(0.16, 0.54, 0.16, 1.84, 0.55, 1.84, '#5fc8cf', 'water');
    // bubbles
    const r = srand(77);
    for (let i = 0; i < 14; i++) b.sph(0.35 + r() * 1.3, 0.555, 0.35 + r() * 1.3, 0.02 + r() * 0.025, '#f3fdff', { w: 6, h: 4, sy: 0.5 });
    // step
    b.box(0.5, 0, 1.98, 1.5, 0.22, 2.0, woodD);
    // little lights on the rim (lit)
    for (const [x, z] of [[0.08, 0.08], [1.92, 0.08], [0.08, 1.92], [1.92, 1.92]]) b.cyl(x, 0.66, z, 0.025, 0.012, '#9ff3ff', { seg: 8, kind: 'lit' });
    return { support: 'hottub', seatH: 0.22, top: 0.66, smoke: [1, 0.8, 1] };
  };

  // ---------------- electronics
  MODELS.tv_cheap = function (b) {
    const wd = C.walnut, pl = '#b9ab95', pl2 = '#a79983';
    // stand
    b.box(0.17, 0, 0.22, 0.83, 0.42, 0.78, wd);
    b.box(0.2, 0.06, 0.78, 0.8, 0.38, 0.79, '#6a462e');
    b.box(0.24, 0.19, 0.79, 0.76, 0.21, 0.8, C.walnutDark);
    // CRT body
    b.box(0.2, 0.42, 0.28, 0.8, 0.92, 0.74, pl);
    b.box(0.28, 0.48, 0.12, 0.72, 0.86, 0.28, pl2);                  // tube back
    b.box(0.22, 0.46, 0.74, 0.66, 0.9, 0.75, '#3a3530');              // bezel
    b.box(0.26, 0.5, 0.75, 0.62, 0.86, 0.758, '#7ec4e6', 'screen');   // screen content
    b.box(0.26, 0.5, 0.758, 0.62, 0.62, 0.762, '#7bc46a', 'screen');
    b.box(0.5, 0.74, 0.758, 0.56, 0.8, 0.762, C.yellow, 'screen');
    b.box(0.33, 0.62, 0.758, 0.42, 0.7, 0.762, C.coral, 'screen');
    b.cylZ(0.72, 0.8, 0.75, 0.02, 0.025, C.charcoal, { seg: 8 });    // knobs
    b.cylZ(0.72, 0.7, 0.75, 0.02, 0.025, C.charcoal, { seg: 8 });
    b.box(0.69, 0.5, 0.745, 0.76, 0.6, 0.752, '#5b554d');             // speaker grille
    // rabbit ears
    b.sph(0.5, 0.94, 0.5, 0.05, C.charcoal, { w: 8, h: 5, hemi: true });
    b.rod(0.5, 0.95, 0.5, 0.3, 1.32, 0.45, 0.008, C.chrome);
    b.rod(0.5, 0.95, 0.5, 0.72, 1.3, 0.5, 0.008, C.chrome);
    return { top: 1.3, smoke: [0.5, 1.0, 0.5] };
  };
  MODELS.tv_lux = function (b) {
    const wd = C.walnut;
    // media console
    b.box(0.12, 0.08, 0.2, 1.88, 0.46, 0.68, wd);
    for (const x of [0.18, 1.82]) for (const z of [0.26, 0.62]) b.cyl(x, 0, z, 0.02, 0.08, C.black, { seg: 6, top: 0.6 });
    b.box(0.16, 0.12, 0.68, 0.98, 0.42, 0.69, '#8e6342');
    b.box(1.02, 0.12, 0.68, 1.84, 0.42, 0.69, '#8e6342');
    b.box(0.93, 0.25, 0.69, 0.95, 0.31, 0.7, C.brass);
    b.box(1.05, 0.25, 0.69, 1.07, 0.31, 0.7, C.brass);
    // TV stand + panel
    b.box(0.85, 0.46, 0.36, 1.15, 0.48, 0.52, C.black);
    b.box(0.96, 0.48, 0.42, 1.04, 0.6, 0.46, C.black);
    b.box(0.22, 0.58, 0.4, 1.78, 1.45, 0.45, '#1c1d21');
    b.box(0.25, 0.61, 0.45, 1.75, 1.42, 0.455, '#64b5e8', 'screen');
    b.box(0.25, 0.61, 0.455, 1.75, 0.9, 0.458, '#5bb06a', 'screen');
    b.box(0.55, 0.9, 0.455, 1.05, 1.1, 0.458, '#e6efe9', 'screen');
    b.box(1.3, 1.15, 0.455, 1.45, 1.3, 0.458, C.yellow, 'screen');
    b.box(0.8, 0.85, 0.458, 1.25, 1.0, 0.461, '#d9744f', 'screen');
    // soundbar + small speaker/plant on console
    b.box(0.6, 0.48, 0.5, 1.4, 0.55, 0.6, C.charcoal);
    b.cyl(0.3, 0.46, 0.4, 0.06, 0.12, C.white, { seg: 10, top: 1.15 });
    b.sph(0.3, 0.65, 0.4, 0.09, C.leaf, { w: 8, h: 6, sy: 0.8 });
    b.box(1.55, 0.46, 0.32, 1.75, 0.5, 0.5, C.navy);
    b.box(1.56, 0.5, 0.33, 1.73, 0.53, 0.48, C.mustard);
    return { top: 1.45, smoke: [1, 1.2, 0.4] };
  };
  MODELS.stereo = function (b) {
    const sp = '#3b3530', cone = '#1f1c1a';
    // low stand
    b.box(0.08, 0, 0.25, 0.92, 0.12, 0.75, C.walnut);
    for (const x of [0.12, 0.66]) {
      b.box(x, 0.12, 0.3, x + 0.22, 0.86, 0.7, sp);
      b.cylZ(x + 0.11, 0.66, 0.705, 0.012, 0.07, cone, { seg: 12 });
      b.cylZ(x + 0.11, 0.36, 0.705, 0.012, 0.09, cone, { seg: 12 });
      b.cylZ(x + 0.11, 0.36, 0.712, 0.012, 0.03, '#5a524c', { seg: 10 });
    }
    // central unit (three stacked components)
    b.box(0.36, 0.12, 0.33, 0.64, 0.3, 0.68, C.charcoal);
    b.box(0.36, 0.3, 0.33, 0.64, 0.44, 0.68, '#c9ccd0');
    b.box(0.36, 0.44, 0.33, 0.64, 0.6, 0.68, C.charcoal);
    b.box(0.39, 0.5, 0.68, 0.55, 0.56, 0.684, '#58e6ff', 'lit');      // display
    b.box(0.39, 0.2, 0.68, 0.61, 0.23, 0.684, '#ff7a52', 'lit');      // eq leds
    b.cylZ(0.59, 0.53, 0.68, 0.02, 0.025, C.chrome, { seg: 10 });
    b.box(0.39, 0.34, 0.68, 0.61, 0.4, 0.684, '#9da2a8');             // tape door
    return { top: 0.86, smoke: [0.5, 0.75, 0.5] };
  };
  MODELS.computer = function (b) {
    const top = C.oak, leg = C.charcoal;
    // desk
    b.box(0.04, 0.72, 0.06, 1.96, 0.76, 0.64, top);
    b.box(0.07, 0, 0.1, 0.11, 0.72, 0.6, leg);
    b.box(0.07, 0.04, 0.33, 1.4, 0.07, 0.37, leg);
    b.box(1.38, 0, 0.08, 1.92, 0.72, 0.62, '#e4ddcf');               // drawer pedestal
    for (let i = 0; i < 3; i++) {
      b.box(1.41, 0.06 + i * 0.22, 0.62, 1.89, 0.26 + i * 0.22, 0.635, '#f0eadf');
      b.box(1.6, 0.18 + i * 0.22, 0.635, 1.7, 0.2 + i * 0.22, 0.65, C.steel);
    }
    // monitor (left half, in front of the seat)
    b.box(0.43, 0.76, 0.16, 0.57, 0.775, 0.28, C.charcoal);
    b.box(0.48, 0.775, 0.18, 0.52, 0.9, 0.21, C.charcoal);
    b.box(0.18, 0.86, 0.17, 0.82, 1.24, 0.22, '#1d1f24');
    b.box(0.2, 0.88, 0.22, 0.8, 1.22, 0.224, '#4d7fd6', 'screen');
    b.box(0.2, 0.88, 0.224, 0.8, 0.92, 0.227, '#2b3550', 'screen');
    b.box(0.25, 1.0, 0.224, 0.5, 1.17, 0.227, '#f1f4f8', 'screen');
    b.box(0.55, 1.05, 0.224, 0.75, 1.17, 0.227, '#ffd36b', 'screen');
    // keyboard + mouse + mug
    b.box(0.3, 0.76, 0.36, 0.7, 0.78, 0.5, '#d9dcdf');
    b.box(0.32, 0.78, 0.38, 0.68, 0.785, 0.48, '#b6bbc0');
    b.sph(0.82, 0.775, 0.45, 0.03, '#d9dcdf', { w: 8, h: 4, sy: 0.5, sz: 1.4 });
    b.cyl(1.2, 0.76, 0.3, 0.04, 0.09, C.coral, { seg: 10 });
    // PC tower under desk (right of the knees)
    b.box(0.95, 0, 0.15, 1.18, 0.5, 0.6, '#2c2f36');
    b.box(1.0, 0.4, 0.6, 1.13, 0.42, 0.605, '#5ad1ff', 'lit');
    // office chair at the front edge (seat center z 0.84)
    const ch = '#3e4a5e';
    b.cyl(0.5, 0.06, 0.82, 0.025, 0.36, C.steelDark, { seg: 8 });
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * PI * 2;
      b.bx(0.5 + Math.sin(a) * 0.085, 0.05, 0.82 + Math.cos(a) * 0.085, 0.035, 0.03, 0.17, C.charcoal, null, 0, a, 0);
      b.sph(0.5 + Math.sin(a) * 0.16, 0.025, 0.82 + Math.cos(a) * 0.16, 0.022, C.black, { w: 6, h: 4 });
    }
    b.box(0.3, 0.42, 0.66, 0.7, 0.48, 0.98, ch);
    b.box(0.47, 0.42, 0.94, 0.53, 0.62, 0.97, C.steelDark);
    b.push(0.5, 0.6, 0.955, 0.06, 0, 0);
    b.box(-0.19, 0, -0.02, 0.19, 0.42, 0.03, ch);
    b.pop();
    return { top: 1.24, smoke: [0.5, 1.3, 0.25] };
  };
  MODELS.phone = function (b) {
    const wd = C.walnut;
    // telephone table
    b.cyl(0.5, 0, 0.5, 0.14, 0.03, C.walnutDark, { seg: 12 });
    b.cyl(0.5, 0.03, 0.5, 0.035, 0.66, wd, { seg: 8 });
    b.cyl(0.5, 0.69, 0.5, 0.2, 0.04, wd, { seg: 14 });
    // phone body
    b.box(0.39, 0.73, 0.4, 0.61, 0.8, 0.62, C.red);
    b.box(0.41, 0.8, 0.43, 0.59, 0.82, 0.6, '#b23f35');
    b.cyl(0.5, 0.8, 0.54, 0.055, 0.012, C.cream, { seg: 12 });
    b.cyl(0.5, 0.812, 0.54, 0.02, 0.004, C.red, { seg: 8 });
    // handset (taken while calling)
    b.box(0.37, 0.825, 0.43, 0.63, 0.85, 0.47, '#b23f35', 'useHide');
    b.box(0.37, 0.81, 0.42, 0.42, 0.86, 0.49, C.red, 'useHide');
    b.box(0.58, 0.81, 0.42, 0.63, 0.86, 0.49, C.red, 'useHide');
    // cord
    b.rod(0.39, 0.77, 0.45, 0.33, 0.74, 0.5, 0.006, C.charcoal);
    return { top: 0.86 };
  };
  MODELS.arcade = function (b) {
    const side = '#5b3a8c', sideD = '#43296a', trim = '#f2c14e';
    b.box(0.2, 0, 0.18, 0.8, 1.78, 0.62, sideD);                       // body
    b.box(0.17, 0, 0.16, 0.21, 1.8, 0.78, side);                      // side panels
    b.box(0.79, 0, 0.16, 0.83, 1.8, 0.78, side);
    b.box(0.165, 0.3, 0.3, 0.215, 1.6, 0.36, trim);                   // stripes
    b.box(0.785, 0.3, 0.3, 0.835, 1.6, 0.36, trim);
    b.box(0.21, 0, 0.62, 0.79, 0.9, 0.76, sideD);                      // lower front
    b.box(0.3, 0.3, 0.76, 0.7, 0.42, 0.765, '#2a1d40');                // coin door
    b.box(0.36, 0.34, 0.765, 0.4, 0.38, 0.768, '#ff5b5b', 'lit');
    b.box(0.6, 0.34, 0.765, 0.64, 0.38, 0.768, '#ff5b5b', 'lit');
    b.push(0.5, 0.95, 0.74, 0.35, 0, 0);                               // control panel (tilted)
    b.box(-0.3, -0.05, -0.12, 0.3, 0.03, 0.12, '#2b2b33');
    b.cyl(-0.12, 0.03, 0, 0.012, 0.09, C.charcoal, { seg: 6 });
    b.sph(-0.12, 0.13, 0, 0.03, C.red, { w: 8, h: 6 });
    b.cyl(0.05, 0.03, 0.02, 0.025, 0.012, '#ffe066', { seg: 8, kind: 'lit' });
    b.cyl(0.13, 0.03, -0.02, 0.025, 0.012, '#5ce1ff', { seg: 8, kind: 'lit' });
    b.cyl(0.21, 0.03, 0.02, 0.025, 0.012, '#ff6bd5', { seg: 8, kind: 'lit' });
    b.pop();
    b.push(0.5, 1.28, 0.58, -0.2, 0, 0);                               // screen (tilted back)
    b.box(-0.27, -0.25, -0.02, 0.27, 0.25, 0.0, '#15121c');
    b.box(-0.24, -0.22, 0.0, 0.24, 0.22, 0.004, '#1b2a5c', 'lit');
    b.box(-0.2, -0.16, 0.004, -0.12, -0.08, 0.008, '#ffe066', 'lit');
    b.box(0.05, 0.02, 0.004, 0.13, 0.1, 0.008, '#ff5b8a', 'lit');
    b.box(-0.05, -0.18, 0.004, 0.2, -0.16, 0.008, '#5cffb0', 'lit');
    b.box(-0.18, 0.12, 0.004, -0.02, 0.15, 0.008, '#5ce1ff', 'lit');
    b.pop();
    b.box(0.21, 1.56, 0.62, 0.79, 1.74, 0.66, '#ff8a3d', 'lit');      // marquee
    b.box(0.26, 1.61, 0.66, 0.74, 1.69, 0.664, '#fff2a8', 'lit');
    b.box(0.2, 1.74, 0.16, 0.8, 1.8, 0.7, side);
    return { top: 1.8, smoke: [0.5, 1.85, 0.4] };
  };

  // ---------------- lighting
  MODELS.lamp_floor = function (b) {
    b.cyl(0.5, 0, 0.5, 0.15, 0.04, C.charcoal, { seg: 14, top: 0.85 });
    b.cyl(0.5, 0.04, 0.5, 0.016, 1.34, C.brass, { seg: 8 });
    b.cyl(0.5, 1.38, 0.5, 0.05, 0.05, C.brass, { seg: 8 });
    b.sph(0.5, 1.47, 0.5, 0.05, '#fff6d6', { w: 8, h: 6, kind: 'glow' });
    b.cyl(0.5, 1.32, 0.5, 0.21, 0.32, C.cream, { seg: 14, top: 0.6, kind: 'glow' });
    return { light: true, lightPos: [0.5, 1.45, 0.5], top: 1.64 };
  };
  MODELS.lamp_fancy = function (b) {
    b.cyl(0.5, 0, 0.25, 0.16, 0.09, '#f2f0ec', { seg: 16 });           // marble base
    b.cyl(0.5, 0.09, 0.25, 0.04, 0.03, C.brass, { seg: 8 });
    // arc of brass segments from the base up and over toward the front
    let px = 0.5, py = 0.1, pz = 0.25;
    const N = 9;
    for (let i = 1; i <= N; i++) {
      const a = (i / N) * PI * 0.56;
      const nx = 0.5, ny = 0.1 + Math.sin(a) * 1.55, nz = 0.25 + (1 - Math.cos(a)) * 0.4;
      b.rod(px, py, pz, nx, ny, nz, 0.018, C.brass);
      px = nx; py = ny; pz = nz;
    }
    // dome shade hanging at the end
    b.sph(px, py - 0.02, pz, 0.18, C.charcoal, { hemi: true, w: 14, h: 6, sy: 0.75 });
    b.cyl(px, py - 0.06, pz, 0.155, 0.03, '#fff3c4', { seg: 14, kind: 'glow' });
    b.sph(px, py - 0.07, pz, 0.055, '#fffbe8', { w: 8, h: 6, kind: 'glow' });
    return { light: true, lightPos: [px, py - 0.15, pz], top: py + 0.15 };
  };

  // ---------------- decor
  function pot(b, cx, cz, r, h, color, rim) {
    b.cyl(cx, 0, cz, r * 0.78, h, color, { seg: 12, top: 1.28 });
    b.cyl(cx, h - 0.02, cz, r * 1.05, 0.05, rim || color, { seg: 12 });
    b.cyl(cx, h + 0.01, cz, r * 0.92, 0.015, C.soil, { seg: 12 });
  }
  MODELS.plant_small = function (b, o) {
    pot(b, 0.5, 0.5, 0.15, 0.28, C.terracotta, '#b25a35');
    const dead = !!o.dead, thirsty = !!o.wilting && !dead;
    const cols = dead ? ['#8a6a3c', '#7a5a32', '#9a7a48'] : thirsty ? ['#9ab24f', '#a8b85a', '#8aa448'] : [C.leaf, C.leafLight, C.leafDark];
    const r = srand(11);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + r() * 0.4;
      const tilt = (dead ? 1.25 : thirsty ? 0.95 : 0.55) + r() * 0.25;
      const len = 0.2 + r() * 0.08;
      b.push(0.5, 0.3, 0.5, 0, a, 0);
      b.push(0, 0, 0, tilt, 0, 0);
      b.sph(0, len * 0.9, 0, len, cols[i % 3], { sx: 0.38, sy: 1, sz: 0.12, w: 6, h: 5 });
      b.pop(); b.pop();
    }
    if (!dead) b.sph(0.5, 0.55, 0.5, 0.07, cols[1], { w: 6, h: 5, sy: 1.4 });
    return { top: 0.75 };
  };
  MODELS.plant_big = function (b, o) {
    pot(b, 0.5, 0.5, 0.2, 0.42, '#f1ede4', '#ddd6c8');
    b.cyl(0.5, 0.42, 0.5, 0.21, 0.04, '#3f6f8a', { seg: 12 });          // pot band
    const dead = !!o.dead, thirsty = !!o.wilting && !dead;
    const trunk = '#9b7a52';
    for (let i = 0; i < 5; i++) b.cyl(0.5, 0.44 + i * 0.22, 0.5, 0.045 - i * 0.004, 0.23, i % 2 ? trunk : '#8a6a45', { seg: 7, top: 0.85 });
    const topY = 1.5;
    const cols = dead ? ['#8f6b3a', '#7a5a32'] : thirsty ? ['#9fb550', '#8ea446'] : [C.leaf, C.leafLight];
    const r = srand(23);
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + r() * 0.3;
      const up = i % 3 === 0 ? 0.25 : 0.6;
      const droop = dead ? 1.9 : thirsty ? 1.45 : 0.95 + r() * 0.3;
      b.push(0.5, topY, 0.5, 0, a, 0);
      b.push(0, 0, 0, up, 0, 0);
      b.sph(0, 0.2, 0, 0.22, cols[i % 2], { sx: 0.32, sy: 1, sz: 0.05, w: 6, h: 5 });
      b.push(0, 0.38, 0, droop - up, 0, 0);
      b.sph(0, 0.16, 0, 0.18, cols[(i + 1) % 2], { sx: 0.3, sy: 1, sz: 0.05, w: 6, h: 5 });
      b.pop(); b.pop(); b.pop();
    }
    if (!dead) b.ico(0.5, topY + 0.05, 0.5, 0.08, cols[0], { detail: 0 });
    return { top: 2.0 };
  };
  function frame(b, cx, cy, w, h, fw, color, depth) {
    // picture frame on the wall plane, back at z=0.055
    const z0 = 0.055, z1 = 0.055 + (depth || 0.04);
    b.box(cx - w / 2, cy + h / 2 - fw, z0, cx + w / 2, cy + h / 2, z1, color);
    b.box(cx - w / 2, cy - h / 2, z0, cx + w / 2, cy - h / 2 + fw, z1, color);
    b.box(cx - w / 2, cy - h / 2 + fw, z0, cx - w / 2 + fw, cy + h / 2 - fw, z1, color);
    b.box(cx + w / 2 - fw, cy - h / 2 + fw, z0, cx + w / 2, cy + h / 2 - fw, z1, color);
    return z0 + 0.012;
  }
  MODELS.painting_cheap = function (b) {
    const cx = 0.5, cy = 1.5, w = 0.74, h = 0.52;
    const z = frame(b, cx, cy, w, h, 0.045, C.oak);
    const x0 = cx - w / 2 + 0.045, x1 = cx + w / 2 - 0.045, y0 = cy - h / 2 + 0.045, y1 = cy + h / 2 - 0.045;
    b.box(x0, y0, 0.055, x1, y1, z, '#9fd2ee');                              // sky
    b.box(x0, y0 + (y1 - y0) * 0.55, z, x1, y1, z + 0.002, '#f6c9a0');       // sunset band
    b.box(x0, y1 - 0.06, z + 0.002, x1, y1, z + 0.003, '#a9d8ef');
    b.cylZ(x1 - 0.17, y0 + (y1 - y0) * 0.6, z + 0.004, 0.004, 0.04, '#ffd75a', { seg: 12 });   // sun
    // mountains (triangles)
    b.tri(x0 + 0.17, y0 + 0.17, z + 0.006, 0.34, 0.2, 0.004, '#7c8fb5');
    b.tri(x0 + 0.38, y0 + 0.19, z + 0.007, 0.36, 0.24, 0.004, '#6a7ea5');
    b.tri(x0 + 0.38, y0 + 0.28, z + 0.008, 0.08, 0.06, 0.004, '#f4f6f8');
    b.box(x0, y0, z + 0.009, x1, y0 + 0.1, z + 0.011, '#79b65e');           // meadow
    b.box(x0 + 0.1, y0, z + 0.011, x0 + 0.2, y0 + 0.1, z + 0.013, '#5aa3d6'); // river
    return { wall: true, top: 1.8 };
  };
  MODELS.painting_lux = function (b) {
    const cx = 0.5, cy = 1.5, w = 0.72, h = 0.92;
    frame(b, cx, cy, w, h, 0.08, C.gold, 0.06);
    frame(b, cx, cy, w - 0.12, h - 0.12, 0.02, '#9c7a24', 0.07);
    const x0 = cx - w / 2 + 0.08, x1 = cx + w / 2 - 0.08, y0 = cy - h / 2 + 0.08, y1 = cy + h / 2 - 0.08;
    const z = 0.075;
    b.box(x0, y0, 0.055, x1, y1, z, '#24423f');                              // dark teal background
    b.box(x0, y0, z, x1, y0 + 0.2, z + 0.003, '#8a5a2e');                    // table
    // vase + sunflowers
    b.cylZ(cx, y0 + 0.3, z + 0.006, 0.006, 0.08, '#d9d1b8', { seg: 12 });
    b.box(cx - 0.05, y0 + 0.2, z + 0.004, cx + 0.05, y0 + 0.3, z + 0.006, '#cfc6aa');
    const fl = [[-0.12, 0.52], [0.0, 0.6], [0.12, 0.5], [-0.05, 0.42], [0.08, 0.4]];
    for (const [dx, dy] of fl) {
      b.cylZ(cx + dx, y0 + dy, z + 0.008, 0.004, 0.06, '#e9b52e', { seg: 10 });
      b.cylZ(cx + dx, y0 + dy, z + 0.011, 0.003, 0.025, '#6b3f1d', { seg: 8 });
    }
    b.box(cx - 0.004, y0 + 0.3, z + 0.006, cx + 0.004, y0 + 0.52, z + 0.007, '#4f7d3a');
    return { wall: true, top: 2.0 };
  };
  MODELS.mirror = function (b) {
    const cx = 0.5, cy = 1.42, w = 0.5, h = 0.82;
    frame(b, cx, cy, w, h, 0.045, C.brass, 0.035);
    const x0 = cx - w / 2 + 0.045, x1 = cx + w / 2 - 0.045, y0 = cy - h / 2 + 0.045, y1 = cy + h / 2 - 0.045;
    b.box(x0, y0, 0.055, x1, y1, 0.07, '#a9c4d3');
    b.push(cx, cy, 0.071, 0, 0, 0.7);
    b.box(-0.02, -0.25, 0, 0.02, 0.25, 0.002, '#f4fbff');
    b.box(0.05, -0.15, 0, 0.065, 0.15, 0.002, '#eef7fb');
    b.pop();
    b.box(cx - 0.18, cy - h / 2 - 0.06, 0.055, cx + 0.18, cy - h / 2 - 0.035, 0.15, C.oak);   // small shelf
    b.cyl(cx + 0.1, cy - h / 2 - 0.035, 0.11, 0.02, 0.07, C.mint, { seg: 8 });
    return { wall: true, top: 1.85 };
  };
  MODELS.sculpture = function (b) {
    b.box(0.3, 0, 0.3, 0.7, 0.08, 0.7, '#e7e3dc');                          // plinth
    b.box(0.33, 0.08, 0.33, 0.67, 0.85, 0.67, '#f2efe9');
    b.box(0.31, 0.85, 0.31, 0.69, 0.89, 0.69, '#e7e3dc');
    b.ring(0.5, 1.12, 0.5, 0.15, 0.3, '#c58a3d', { rx: HP * 0.8, ry: 0.4, rs: 6, ts: 16 });
    b.sph(0.5, 1.12, 0.5, 0.08, C.teal, { w: 10, h: 7 });
    b.bx(0.5, 0.97, 0.5, 0.06, 0.16, 0.06, '#b07a35', null, 0.2, 0.5, 0.3);
    b.ico(0.55, 1.36, 0.46, 0.07, C.coral, { detail: 0 });
    return { top: 1.45 };
  };
  MODELS.rug = function (b, o) {
    const base = '#b9583f', border = '#f1e2c4', inner = '#2f4a6e', accent = C.mustard;
    b.box(0.08, 0.008, 0.08, 1.92, 0.024, 1.92, base);
    // border band
    b.box(0.16, 0.024, 0.16, 1.84, 0.029, 0.24, border);
    b.box(0.16, 0.024, 1.76, 1.84, 0.029, 1.84, border);
    b.box(0.16, 0.024, 0.24, 0.24, 0.029, 1.76, border);
    b.box(1.76, 0.024, 0.24, 1.84, 0.029, 1.76, border);
    // center diamond medallion
    b.bx(1, 0.0265, 1, 0.9, 0.006, 0.9, inner, null, 0, PI / 4, 0);
    b.bx(1, 0.0295, 1, 0.5, 0.006, 0.5, accent, null, 0, PI / 4, 0);
    b.bx(1, 0.0325, 1, 0.2, 0.006, 0.2, border, null, 0, PI / 4, 0);
    // corner dots
    for (const [x, z] of [[0.45, 0.45], [1.55, 0.45], [0.45, 1.55], [1.55, 1.55]]) b.bx(x, 0.027, z, 0.14, 0.006, 0.14, inner, null, 0, PI / 4, 0);
    // fringe on the short ends
    for (let i = 0; i < 14; i++) {
      const x = 0.15 + i * 0.13;
      b.box(x, 0.008, 0.02, x + 0.025, 0.014, 0.08, border);
      b.box(x, 0.008, 1.92, x + 0.025, 0.014, 1.98, border);
    }
    return { floor: true, top: 0.035 };
  };

  // ---------------- hobbies
  MODELS.bookshelf = function (b) {
    const wd = C.walnut, wdd = C.walnutDark;
    b.box(0.07, 0, 0.06, 0.93, 1.92, 0.1, wdd);                    // back
    b.box(0.07, 0, 0.06, 0.11, 1.92, 0.5, wd);                     // sides
    b.box(0.89, 0, 0.06, 0.93, 1.92, 0.5, wd);
    b.box(0.05, 1.92, 0.04, 0.95, 1.96, 0.52, wd);                 // top
    b.box(0.11, 0, 0.1, 0.89, 0.08, 0.5, wdd);                     // plinth
    const shelves = [0.08, 0.5, 0.94, 1.38];
    for (const y of shelves) b.box(0.11, y, 0.1, 0.89, y + 0.03, 0.49, wd);
    const r = srand(5);
    const pal = [C.red, C.navy, C.mustard, C.teal, C.cream, C.plum, C.sage, C.coral, '#3b3b44', '#d9cfbd'];
    shelves.forEach(function (y, si) {
      let x = 0.13;
      const top = (si < 3 ? shelves[si + 1] : 1.92) - 0.04;
      while (x < 0.85) {
        const bw = 0.03 + r() * 0.035;
        if (x + bw > 0.87) break;
        if (si === 3 && x > 0.55) {               // top shelf: a globe + box instead of books
          b.cyl(0.72, y + 0.03, 0.3, 0.05, 0.03, C.brass, { seg: 8 });
          b.sph(0.72, y + 0.17, 0.3, 0.1, '#5d9fc9', { w: 10, h: 8 });
          b.sph(0.74, y + 0.2, 0.36, 0.045, '#79b864', { w: 6, h: 4, sz: 0.5 });
          break;
        }
        const bh = Math.min(top - y - 0.03, 0.24 + r() * 0.12);
        const lean = r() < 0.08 ? 0.18 : 0;
        b.bx(x + bw / 2, y + 0.03 + bh / 2, 0.3, bw, bh, 0.3 + r() * 0.06, pal[Math.floor(r() * pal.length)], null, 0, 0, lean);
        x += bw + 0.004 + (lean ? 0.04 : 0);
      }
    });
    return { top: 1.96 };
  };
  MODELS.easel = function (b, o) {
    const wd = C.pine;
    // A-frame legs: two front legs + one back leg
    b.rod(0.3, 0, 0.62, 0.47, 1.7, 0.5, 0.022, wd, { seg: 6 });
    b.rod(0.7, 0, 0.62, 0.53, 1.7, 0.5, 0.022, wd, { seg: 6 });
    b.rod(0.5, 0, 0.18, 0.5, 1.6, 0.47, 0.02, wd, { seg: 6 });
    b.box(0.26, 0.74, 0.58, 0.74, 0.78, 0.68, wd);                 // ledge
    // canvas leaning on the frame
    const prog = o.progress == null ? 3 : clamp(o.progress | 0, 0, 3);
    b.push(0.5, 1.12, 0.6, -0.1, 0, 0);
    b.box(-0.27, -0.36, -0.015, 0.27, 0.36, 0.015, '#f8f5ee');
    if (prog >= 1) b.box(-0.22, 0.05, 0.015, 0.1, 0.25, 0.018, '#8cc6e8');
    if (prog >= 2) b.box(-0.2, -0.25, 0.015, 0.22, -0.05, 0.018, '#8fc173');
    if (prog >= 3) { b.box(0.0, -0.02, 0.018, 0.16, 0.14, 0.021, C.coral); b.box(-0.1, -0.16, 0.018, 0.05, -0.08, 0.021, C.yellow); }
    b.pop();
    // paint box on the floor
    b.box(0.68, 0, 0.72, 0.92, 0.08, 0.92, C.walnut);
    for (let i = 0; i < 4; i++) b.cyl(0.72 + i * 0.055, 0.08, 0.82, 0.018, 0.04, [C.red, C.blue, C.yellow, C.green][i], { seg: 6 });
    return { top: 1.7 };
  };
  MODELS.chess = function (b) {
    const wd = C.walnut;
    // table
    b.cyl(0.5, 0, 0.5, 0.17, 0.04, C.walnutDark, { seg: 12 });
    b.cyl(0.5, 0.04, 0.5, 0.045, 0.62, wd, { seg: 8 });
    b.box(0.22, 0.66, 0.22, 0.78, 0.7, 0.78, wd);
    // 8x8 board
    const s = 0.05, x0 = 0.3, z0 = 0.3;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) b.quad(x0 + i * s, z0 + j * s, x0 + (i + 1) * s, z0 + (j + 1) * s, 0.701, (i + j) % 2 ? '#3b2a20' : '#efe2c6');
    // pieces
    const pcs = [[0, 0, 0.05], [3, 1, 0.04], [5, 0, 0.06], [6, 1, 0.04], [1, 7, 0.05], [4, 6, 0.04], [3, 7, 0.065], [6, 6, 0.04]];
    pcs.forEach(function (p, i) {
      const c = i < 4 ? '#f6f1e4' : '#26221f';
      const px = x0 + (p[0] + 0.5) * s, pz = z0 + (p[1] + 0.5) * s;
      b.cyl(px, 0.701, pz, 0.016, p[2], c, { seg: 8, top: 0.6 });
      b.sph(px, 0.701 + p[2] + 0.008, pz, 0.014, c, { w: 6, h: 4 });
    });
    // two stools (front and back edge of the tile)
    for (const z of [0.9, 0.1]) {
      b.cyl(0.5, 0, z, 0.12, 0.03, C.walnutDark, { seg: 10 });
      b.cyl(0.5, 0.03, z, 0.03, 0.38, wd, { seg: 8 });
      b.cyl(0.5, 0.41, z, 0.13, 0.05, '#7a3f3a', { seg: 12 });
    }
    return { top: 0.75 };
  };
  MODELS.exercise = function (b) {
    const fr = C.charcoal, pad = '#b8383a';
    // bench frame
    b.box(0.46, 0, 0.4, 0.54, 0.05, 1.8, fr);
    b.box(0.3, 0, 1.7, 0.7, 0.05, 1.78, fr);
    b.box(0.3, 0, 0.42, 0.7, 0.05, 0.5, fr);
    b.box(0.47, 0.05, 0.45, 0.53, 0.42, 0.51, fr);
    b.box(0.47, 0.05, 1.68, 0.53, 0.42, 1.74, fr);
    b.box(0.34, 0.42, 0.38, 0.66, 0.5, 1.78, pad);               // pad
    // rack uprights at the head end
    for (const x of [0.12, 0.88]) {
      b.box(x - 0.025, 0, 0.18, x + 0.025, 1.08, 0.23, C.steelDark);
      b.box(x - 0.08, 0, 0.12, x + 0.08, 0.04, 0.32, fr);
      b.box(x - 0.025, 0.98, 0.23, x + 0.025, 1.0, 0.3, C.steelDark);   // hook
    }
    // barbell resting on the hooks (taken while exercising)
    b.cylX(0.5, 1.03, 0.27, 1.0, 0.016, C.chrome, { seg: 8, kind: 'useHide' });
    for (const x of [0.02, 0.98]) b.cylX(x, 1.03, 0.27, 0.05, 0.11, '#26272b', { seg: 12, kind: 'useHide' });
    // dumbbells on the floor
    for (const z of [1.1, 1.3]) {
      b.cylX(0.85, 0.05, z, 0.16, 0.01, C.chrome, { seg: 6 });
      b.cylX(0.78, 0.05, z, 0.04, 0.05, '#26272b', { seg: 8 });
      b.cylX(0.92, 0.05, z, 0.04, 0.05, '#26272b', { seg: 8 });
    }
    return { support: 'bench', seatH: 0.5, top: 1.08 };
  };
  MODELS.piano = function (b) {
    const bd = '#2a1f1c', bdl = '#3a2b26', key = '#f7f3ea';
    b.box(0.12, 0, 0.06, 1.88, 1.28, 0.52, bd);                     // body
    b.box(0.1, 1.28, 0.04, 1.9, 1.33, 0.54, bdl);                   // lid
    b.box(0.12, 0.7, 0.52, 1.88, 0.76, 0.76, bd);                   // keybed
    b.box(0.18, 0.76, 0.54, 1.82, 0.785, 0.72, key);                 // white keys
    for (let i = 0; i < 36; i++) {
      if ([2, 6].indexOf(i % 7) >= 0) continue;
      const x = 0.21 + i * 0.045;
      if (x > 1.79) break;
      b.box(x, 0.785, 0.54, x + 0.022, 0.81, 0.64, '#1b1817');
    }
    b.box(0.12, 0.785, 0.52, 1.88, 0.95, 0.56, bdl);                 // fallboard/back of keys
    b.box(0.5, 0.95, 0.5, 1.5, 1.2, 0.54, bdl);                      // music desk
    b.push(1.0, 1.08, 0.56, -0.2, 0, 0);
    b.box(-0.18, -0.12, 0, 0.18, 0.12, 0.01, C.paper);               // sheet music
    b.box(-0.15, 0.04, 0.01, 0.15, 0.05, 0.012, '#9a958b');
    b.box(-0.15, -0.02, 0.01, 0.15, -0.01, 0.012, '#9a958b');
    b.box(-0.15, -0.08, 0.01, 0.15, -0.07, 0.012, '#9a958b');
    b.pop();
    b.box(0.14, 0, 0.62, 0.2, 0.7, 0.7, bd);                         // front legs
    b.box(1.8, 0, 0.62, 1.86, 0.7, 0.7, bd);
    b.box(0.85, 0.06, 0.52, 1.15, 0.1, 0.56, C.brass);               // pedals
    // candle holders
    b.cyl(0.25, 1.33, 0.3, 0.04, 0.02, C.brass, { seg: 8 });
    b.cyl(0.25, 1.35, 0.3, 0.02, 0.12, C.cream, { seg: 8 });
    // bench (seat center z 0.88)
    legs4(b, 0.66, 0.79, 1.34, 0.97, 0.44, 0.04, bd);
    b.box(0.64, 0.44, 0.77, 1.36, 0.5, 0.99, '#3a2b26');
    b.box(0.66, 0.5, 0.79, 1.34, 0.52, 0.97, '#7a3f3a');
    return { top: 1.35 };
  };

  // ---------------- system objects
  MODELS.mailbox = function (b) {
    b.box(0.46, 0, 0.46, 0.54, 1.0, 0.54, C.walnut);                 // post
    b.box(0.42, 0.94, 0.3, 0.58, 0.98, 0.7, C.walnut);
    b.box(0.39, 0.98, 0.3, 0.61, 1.12, 0.72, '#3d6fb0');             // box
    b.cylZ(0.5, 1.12, 0.51, 0.42, 0.11, '#3d6fb0', { seg: 12 });
    b.box(0.385, 0.98, 0.72, 0.615, 1.2, 0.735, '#335f98');           // door
    b.box(0.48, 1.08, 0.735, 0.52, 1.1, 0.75, C.chrome);
    b.box(0.61, 1.05, 0.38, 0.63, 1.32, 0.41, C.red);                 // flag
    b.box(0.61, 1.24, 0.41, 0.63, 1.32, 0.52, C.red);
    // house number plaque
    b.box(0.455, 0.6, 0.54, 0.545, 0.7, 0.545, C.cream);
    return { top: 1.32 };
  };
  function plateFood(b, x, z, r, spoiled, kind, burnt) {
    b.cyl(x, 0, z, r, 0.018, '#fbfbf8', { seg: 14, top: 1.12 });
    b.cyl(x, 0.018, z, r * 0.8, 0.004, '#e9eef0', { seg: 14 });
    const food = spoiled ? ['#8d9a5f', '#6f7a46', '#a3a37a'] : burnt ? ['#5a4a3a', '#3a2a22', '#4a5a32'] : ['#f3efe4', '#9a5b34', '#6db35a'];
    b.sph(x - r * 0.25, 0.03, z - r * 0.1, r * 0.5, food[0], { w: 7, h: 4, sy: 0.45 });      // rice
    b.sph(x + r * 0.3, 0.035, z - r * 0.05, r * 0.4, food[1], { w: 6, h: 4, sy: 0.55 });      // meat
    b.sph(x + r * 0.05, 0.03, z + r * 0.42, r * 0.32, food[2], { w: 6, h: 4, sy: 0.6 });      // greens
    if (kind === 'fork') b.box(x + r + 0.01, 0.002, z - 0.07, x + r + 0.03, 0.008, z + 0.08, C.steel);
  }
  function pizzaBox(b, n, spoiled) {
    // open cardboard box with n servings (2 slices each) left
    const card = '#c99a5b', cardD = '#b0844a';
    b.box(0.22, 0.0, 0.25, 0.78, 0.035, 0.8, card);
    b.box(0.22, 0.035, 0.25, 0.78, 0.05, 0.27, cardD); b.box(0.22, 0.035, 0.78, 0.78, 0.05, 0.8, cardD);
    b.box(0.22, 0.035, 0.27, 0.24, 0.05, 0.78, cardD); b.box(0.76, 0.035, 0.27, 0.78, 0.05, 0.78, cardD);
    b.push(0.5, 0.035, 0.25, -0.32, 0, 0);                    // lid standing open at the back
    b.box(-0.28, 0, -0.012, 0.28, 0.55, 0.005, card);
    b.box(-0.12, 0.2, 0.005, 0.12, 0.34, 0.009, '#d9473b');
    b.pop();
    const slices = clamp(n * 2, 0, 8);
    const sauce = spoiled ? '#8a8a55' : '#e7b04a', crust = spoiled ? '#9a8a5a' : '#d79a4e';
    for (let i = 0; i < slices; i++) {
      const a = i * PI / 4;
      b.add('wedge:' + (PI / 4 - 0.04).toFixed(3) + ':4', 0.5, 0.06, 0.525, 0.22, 0.02, 0.22, 0, a, 0, crust);
      b.add('wedge:' + (PI / 4 - 0.08).toFixed(3) + ':4', 0.5, 0.072, 0.525, 0.19, 0.008, 0.19, 0, a + 0.02, 0, sauce);
      const ca = a + PI / 8;
      b.cyl(0.5 + Math.sin(ca) * 0.12, 0.075, 0.525 + Math.cos(ca) * 0.12, 0.022, 0.006, spoiled ? '#5a6a3a' : '#b33a2a', { seg: 8 });
    }
  }
  MODELS.meal = function (b, o) {
    const n = clamp(o.servings == null ? 4 : Math.round(o.servings), 1, 4);
    const spoiled = !!o.spoiled;
    if (o.food === 'pizza') {
      pizzaBox(b, n, spoiled);
      if (spoiled) for (let i = 0; i < 4; i++) b.sph(0.4 + i * 0.07, 0.2 + (i % 2) * 0.06, 0.45 + (i % 3) * 0.05, 0.012, C.black, { w: 4, h: 3 });
      return { item: true, top: 0.6 };
    }
    // serving tray/pot in the middle-back + plates
    const spots = [[0.32, 0.36], [0.68, 0.36], [0.32, 0.7], [0.68, 0.7]];
    for (let i = 0; i < n; i++) plateFood(b, spots[i][0], spots[i][1], 0.12, spoiled, null, !!o.burnt);
    if (o.burnt && !spoiled) for (let i = 0; i < 3; i++) b.sph(0.45 + i * 0.05, 0.16 + i * 0.05, 0.5, 0.03, '#6b6b6b', { w: 5, h: 4, kind: 'water' });   // smoke wisps
    if (spoiled) {
      for (let i = 0; i < 4; i++) b.sph(0.4 + i * 0.07, 0.2 + (i % 2) * 0.06, 0.45 + (i % 3) * 0.05, 0.012, C.black, { w: 4, h: 3 });
    }
    return { item: true, top: 0.1 };
  };
  MODELS.spoiled_meal = function (b, o) { return MODELS.meal(b, Object.assign({}, o, { spoiled: true })); };
  MODELS.dirty_plate = function (b, o) {
    const x = 0.5, z = 0.5, r = 0.12;
    b.cyl(x, 0, z, r, 0.018, '#f2f0ea', { seg: 14, top: 1.12 });
    b.cyl(x, 0.018, z, r * 0.8, 0.004, '#e2e3dc', { seg: 14 });
    const smear = o.spoiled ? '#7f8a4c' : '#b0703f';
    b.sph(x - 0.03, 0.022, z + 0.02, 0.05, smear, { w: 6, h: 3, sy: 0.12, sz: 0.6 });
    b.sph(x + 0.04, 0.023, z - 0.03, 0.018, '#e9e2c7', { w: 5, h: 3 });
    b.sph(x + 0.01, 0.023, z - 0.05, 0.012, '#6db35a', { w: 5, h: 3 });
    b.box(x + 0.02, 0.022, z - 0.02, x + 0.11, 0.028, z + 0.0, C.steel, null);   // fork across
    b.push(x + 0.06, 0.025, z + 0.05, 0, 0.6, 0);
    b.box(-0.06, 0, -0.008, 0.06, 0.006, 0.008, C.steel);
    b.pop();
    if (o.spoiled) for (let i = 0; i < 3; i++) b.sph(0.45 + i * 0.05, 0.15 + i * 0.03, 0.5, 0.01, C.black, { w: 4, h: 3 });
    return { item: true, top: 0.05 };
  };
  MODELS.puddle = function (b, o) {
    const r = srand(1000 + ((o.variant | 0) % 4) * 17);
    const shape = new THREE.Shape();
    const N = 18;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * PI * 2;
      const rr = 0.3 + r() * 0.12 + Math.sin(a * 3 + r()) * 0.04;
      pts.push([0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr * 0.85]);
    }
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < N; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(HP);           // shape XY -> XZ (y -> z); normal now -Y, so flip below
    // rotateX(+90deg) maps (x, y, 0) -> (x, 0, y) with normal facing -Y; flip winding by mirroring y
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, 0.014);
    const ni = g.toNonIndexed();
    const pa = ni.attributes.position.array;
    for (let i = 0; i < pa.length; i += 9) {        // swap 2nd/3rd vertex so faces point up
      for (let k = 0; k < 3; k++) { const t = pa[i + 3 + k]; pa[i + 3 + k] = pa[i + 6 + k]; pa[i + 6 + k] = t; }
    }
    ni.computeVertexNormals();
    b.geo(ni, '#7fbde0', 'water');
    b.sph(0.38 + r() * 0.2, 0.016, 0.42 + r() * 0.15, 0.06, '#eaf7ff', { w: 6, h: 3, sy: 0.05, kind: 'water' });
    return { item: true, floor: true, top: 0.02 };
  };
  MODELS.newspaper = function (b) {
    b.push(0.5, 0, 0.5, 0, 0.35, 0);
    b.box(-0.17, 0.0, -0.12, 0.17, 0.022, 0.12, '#f0ece2');
    b.box(-0.165, 0.022, -0.115, 0.165, 0.026, -0.06, '#2f2f33');     // masthead
    for (let i = 0; i < 4; i++) b.box(-0.15, 0.022, -0.04 + i * 0.035, 0.0, 0.025, -0.03 + i * 0.035, '#a9a69e');
    b.box(0.03, 0.022, -0.04, 0.15, 0.025, 0.09, '#8fa6b8');           // photo
    b.box(-0.17, 0.005, -0.02, 0.17, 0.024, 0.0, '#d9473b');           // rubber band
    b.pop();
    return { item: true, top: 0.03 };
  };
  const CAR_STYLES = {
    hatch: { body: '#f2b53a', bodyD: '#d99a26', stripe: '#3a7bd5', cab: [0.45, 1.45], roof: 0.98, sign: '#3a7bd5' },
    sedan: { body: '#4f86c6', bodyD: '#3d6ea8', stripe: '#e9eef3', cab: [0.55, 1.4], roof: 0.92, trunk: true },
    van: { body: '#f1f0ea', bodyD: '#d5d3cb', stripe: '#e07a5f', cab: [0.18, 1.6], roof: 1.12 },
    executive: { body: '#2a2d33', bodyD: '#1d1f24', stripe: '#c9ced3', cab: [0.5, 1.42], roof: 0.92, trunk: true },
    limo: { body: '#1f2126', bodyD: '#15161a', stripe: '#c9a14b', cab: [0.28, 1.62], roof: 0.9, long: true },
    police: { body: '#f4f4f0', bodyD: '#d9dbe0', stripe: '#2f5fb3', cab: [0.5, 1.42], roof: 0.95, lights: true, trunk: true },
  };
  MODELS.carpool = function (b, o) {
    const st = CAR_STYLES[o.car] || CAR_STYLES.hatch;
    const body = st.body, bodyD = st.bodyD, glass = '#9fd0ea', tire = C.rubber;
    // wheels
    for (const x of [0.42, 1.58]) for (const z of [0.16, 0.84]) {
      b.cylZ(x, 0.16, z, 0.1, 0.16, tire, { seg: 12 });
      b.cylZ(x, 0.16, z + (z < 0.5 ? -0.051 : 0.051), 0.004, 0.08, C.grayLight, { seg: 10 });
    }
    b.box(0.1, 0.16, 0.14, 1.9, 0.6, 0.86, body);                     // lower body
    b.box(0.08, 0.14, 0.12, 1.92, 0.26, 0.88, bodyD);                 // bumper line
    const c0 = st.cab[0], c1 = st.cab[1], rt = st.roof;
    b.box(c0, 0.6, 0.18, c1, rt, 0.82, body);                         // cabin
    b.box(c0 - 0.02, rt, 0.17, c1 + 0.02, rt + 0.03, 0.83, bodyD);
    // side windows split into panes
    const panes = st.long ? 4 : st.cab[1] - st.cab[0] > 1.2 ? 3 : 2;
    const pw = (c1 - c0 - 0.1) / panes;
    for (let i = 0; i < panes; i++) {
      const x0 = c0 + 0.05 + i * pw + 0.02, x1 = c0 + 0.05 + (i + 1) * pw - 0.02;
      b.box(x0, 0.64, 0.82, x1, rt - 0.04, 0.825, glass, 'glass');
      b.box(x0, 0.64, 0.175, x1, rt - 0.04, 0.18, glass, 'glass');
      if (i > 0) { b.box(x0 - 0.04, 0.6, 0.815, x0, rt, 0.83, bodyD); b.box(x0 - 0.04, 0.6, 0.17, x0, rt, 0.185, bodyD); }
    }
    b.box(c1 - 0.005, 0.64, 0.24, c1, rt - 0.04, 0.76, glass, 'glass');    // windscreen (front = +x)
    b.box(c0, 0.64, 0.24, c0 + 0.005, rt - 0.04, 0.76, glass, 'glass');
    // lights
    b.box(1.9, 0.38, 0.2, 1.92, 0.48, 0.34, '#fff6c8', 'lit');
    b.box(1.9, 0.38, 0.66, 1.92, 0.48, 0.8, '#fff6c8', 'lit');
    b.box(0.08, 0.38, 0.2, 0.1, 0.48, 0.32, '#ff5a4a', 'lit');
    b.box(0.08, 0.38, 0.68, 0.1, 0.48, 0.8, '#ff5a4a', 'lit');
    // side stripe + handles
    b.box(0.1, 0.4, 0.86, 1.9, 0.45, 0.865, st.stripe);
    b.box(0.1, 0.4, 0.135, 1.9, 0.45, 0.14, st.stripe);
    b.box(0.82, 0.52, 0.86, 0.9, 0.54, 0.875, C.charcoal);
    b.box(1.3, 0.52, 0.86, 1.38, 0.54, 0.875, C.charcoal);
    if (st.sign) {                                                     // carpool roof sign
      b.box(0.8, rt + 0.03, 0.38, 1.1, rt + 0.14, 0.62, st.sign);
      b.box(0.81, rt + 0.05, 0.375, 1.09, rt + 0.12, 0.38, '#ffffff', 'lit');
      b.box(0.81, rt + 0.05, 0.62, 1.09, rt + 0.12, 0.625, '#ffffff', 'lit');
    }
    if (st.lights) {                                                   // police light bar
      b.box(0.85, rt + 0.03, 0.3, 1.15, rt + 0.06, 0.7, C.charcoal);
      b.box(0.88, rt + 0.06, 0.32, 1.12, rt + 0.13, 0.49, '#ff3b3b', 'lit');
      b.box(0.88, rt + 0.06, 0.51, 1.12, rt + 0.13, 0.68, '#3b7bff', 'lit');
      b.box(0.55, 0.3, 0.865, 1.3, 0.38, 0.87, st.stripe); b.box(0.55, 0.3, 0.13, 1.3, 0.38, 0.135, st.stripe);
    }
    if (st.long) b.box(0.3, rt + 0.03, 0.45, 0.5, rt + 0.04, 0.55, C.gold);
    return { top: rt + 0.15 };
  };

  // ---------------- environment (non-catalog; used by the renderer for the neighbourhood)
  MODELS.env_tree = function (b, o) {
    const r = srand(300 + ((o.variant | 0) % 6) * 13);
    const h = 1.6 + r() * 0.8;
    b.cyl(0, 0, 0, 0.11, h, '#7a5636', { seg: 7, top: 0.7 });
    const greens = ['#5d9a4e', '#4f8a45', '#6eaa58', '#467d3e'];
    const n = 3 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const s = 0.75 - i * 0.12 + r() * 0.1;
      b.ico((r() - 0.5) * 0.35, h + i * 0.42 - 0.1, (r() - 0.5) * 0.35, s, greens[Math.floor(r() * greens.length)], { detail: 0, sy: 0.85 });
    }
    return { top: h + n * 0.42 + 0.5 };
  };
  MODELS.env_pine = function (b, o) {
    const r = srand(500 + ((o.variant | 0) % 6) * 7);
    b.cyl(0, 0, 0, 0.1, 0.6, '#6e4c30', { seg: 6 });
    const n = 3;
    for (let i = 0; i < n; i++) b.cyl(0, 0.45 + i * 0.6, 0, 0.85 - i * 0.22 + r() * 0.08, 1.0, i % 2 ? '#3f7a4a' : '#356d40', { seg: 8, top: 0.02 });
    return { top: 2.6 };
  };
  MODELS.env_bush = function (b, o) {
    const r = srand(700 + ((o.variant | 0) % 6) * 5);
    for (let i = 0; i < 3; i++) b.ico((r() - 0.5) * 0.5, 0.25 + r() * 0.1, (r() - 0.5) * 0.4, 0.3 + r() * 0.15, i % 2 ? '#5f9a4f' : '#4d8642', { detail: 0, sy: 0.8 });
    if (r() < 0.5) for (let i = 0; i < 4; i++) b.sph((r() - 0.5) * 0.6, 0.45 + r() * 0.15, (r() - 0.5) * 0.5, 0.04, r() < 0.5 ? '#f3a6c4' : '#fff1a8', { w: 5, h: 3 });
    return { top: 0.7 };
  };
  MODELS.env_streetlamp = function (b) {
    b.cyl(0, 0, 0, 0.09, 0.12, C.charcoal, { seg: 8 });
    b.cyl(0, 0.12, 0, 0.04, 3.0, '#3b4048', { seg: 8, top: 0.8 });
    b.box(-0.03, 3.05, -0.03, 0.03, 3.1, 0.55, '#3b4048');
    b.box(-0.12, 2.95, 0.42, 0.12, 3.05, 0.7, '#3b4048');
    b.box(-0.1, 2.93, 0.44, 0.1, 2.95, 0.68, '#fff2c2', 'glow');
    return { light: true, lightPos: [0, 2.85, 0.56], top: 3.1 };
  };
  MODELS.env_house = function (b, o) {
    const r = srand(900 + ((o.variant | 0) % 6) * 31);
    const walls = ['#e9d8b8', '#cfe0e6', '#f0cdbd', '#dfe8cf', '#efe6d6', '#d9d2e9'][(o.variant | 0) % 6];
    const roof = ['#a8513c', '#5c6b7a', '#8a4e3a', '#6d7f5c', '#7a5a8a', '#9c6a3e'][((o.variant | 0) + 2) % 6];
    const W = 6 + Math.floor(r() * 3), D = 5, H = 2.7;
    b.box(-W / 2, 0, -D / 2, W / 2, H, D / 2, walls);
    b.tri(0, H + 1.1, 0, W + 0.4, 2.2, D + 0.6, roof, null, 0, HP, 0);   // gable roof along x
    b.box(-0.45, 0, D / 2, 0.45, 2.1, D / 2 + 0.05, '#7b5236');           // door (front +z)
    for (const x of [-W / 2 + 1.2, W / 2 - 1.2]) {
      b.box(x - 0.5, 1.0, D / 2, x + 0.5, 2.0, D / 2 + 0.04, '#f6f3ea');
      b.box(x - 0.42, 1.08, D / 2 + 0.04, x + 0.42, 1.92, D / 2 + 0.05, '#9fc8de', 'glow');
    }
    b.box(-0.5, H + 0.3, 0.6, 0, H + 1.6, 1.0, '#8a8580');                // chimney
    return { top: H + 2.2 };
  };

  // fallback: a neutral crate sized to the footprint
  function fallbackModel(b, o) {
    const w = Math.max(1, o.w | 0 || 1), h = Math.max(1, o.h | 0 || 1);
    b.box(0.1, 0, 0.1, w - 0.1, 0.6, h - 0.1, '#c9a77c');
    b.box(0.08, 0.6, 0.08, w - 0.08, 0.66, h - 0.08, '#b08d62');
    b.box(0.1, 0.25, h - 0.1, w - 0.1, 0.32, h - 0.09, '#9c7a52');
    return { top: 0.66 };
  }

  // ------------------------------------------------------------------ build() + caches
  const modelCache = {};
  function variantKey(key, o) {
    if (!o) return '';
    let k = '';
    if (o.unmade) k += 'u';
    if (o.dead) k += 'd';
    else if (o.wilting) k += 'w';
    if (o.spoiled) k += 's';
    if (o.servings != null && (key === 'meal' || key === 'spoiled_meal')) k += 'n' + clamp(Math.round(o.servings), 1, 4);
    if ((key === 'meal' || key === 'spoiled_meal') && o.food === 'pizza') k += 'P';
    if ((key === 'meal' || key === 'spoiled_meal') && o.burnt) k += 'B';
    if (key === 'carpool' && o.car && CAR_STYLES[o.car]) k += 'c' + o.car;
    if (key === 'easel' && o.progress != null) k += 'p' + clamp(o.progress | 0, 0, 3);
    if (o.variant != null && /^(puddle|env_)/.test(key)) k += 'v' + ((o.variant | 0) % 6);
    if (!MODELS[key]) k += 'f' + (o.w | 0) + 'x' + (o.h | 0);
    return k;
  }
  function entryFor(key, opts) {
    opts = opts || {};
    const ck = key + '|' + variantKey(key, opts);
    let e = modelCache[ck];
    if (e) return e;
    const b = new Builder();
    let meta;
    try {
      const fn = MODELS[key] || fallbackModel;
      if (!MODELS[key] && opts.w == null) {
        const def = M.data && M.data.CATALOG && Object.values(M.data.CATALOG).find(function (d) { return d && (d.model === key || d.type === key); });
        if (def) opts = Object.assign({}, opts, { w: def.w, h: def.h });
      }
      meta = fn(b, opts) || {};
    } catch (err) {
      console.error('[models] failed to build', key, err);
      b.parts.length = 0;
      meta = fallbackModel(b, opts);
    }
    e = { parts: b.finish(), meta: meta, key: key };
    modelCache[ck] = e;
    return e;
  }
  function build(key, opts) {
    const m = mats();
    const e = entryFor(key, opts);
    const g = new THREE.Group();
    g.name = 'model:' + key;
    for (const p of e.parts) {
      const mesh = new THREE.Mesh(p.geometry, m[p.kind] || m.solid);
      mesh.userData.kind = p.kind;
      const opaque = p.kind !== 'glass' && p.kind !== 'water';
      mesh.castShadow = opaque && !e.meta.floor && !e.meta.item;
      mesh.receiveShadow = true;
      if (!opaque) mesh.renderOrder = 2;
      g.add(mesh);
    }
    g.userData.meta = e.meta;
    g.userData.modelKey = key;
    return g;
  }
  function meta(key, opts) { return entryFor(key, opts).meta; }
  function has(key) { return !!MODELS[key]; }
  function list() { return Object.keys(MODELS).filter(function (k) { return k.indexOf('env_') !== 0; }); }

  // ==================================================================================
  // CHARACTER RIG
  // ==================================================================================
  // Hierarchy (local +Z = facing, origin at the feet):
  //   root ─ pose (whole-body offset/rotation) ─ hips (y = hip height)
  //            hips ─ pelvis, legL/legR (─ knee ─ shin, foot), spine (─ chest, neck ─ head, shoulderL/R ─ elbow ─ hand)
  // animate() writes joint angles each frame; pose transitions blend over ~0.3 s.
  const HIP_Y = 0.87;
  const charGeo = {};
  function cg(key, make) { return charGeo[key] || (charGeo[key] = make()); }
  function limbGeo(rt, rb, len, seg) {
    return cg('limb:' + rt + ':' + rb + ':' + len + ':' + seg, function () {
      const g = new THREE.CylinderGeometry(rt, rb, len, seg || 8, 1);
      g.translate(0, -len / 2, 0);
      return g;
    });
  }
  function sphGeo(r, w, h) { return cg('sph:' + r + ':' + w + ':' + h, function () { return new THREE.SphereGeometry(r, w, h); }); }
  function boxGeo(x, y, z) { return cg('box:' + x + ':' + y + ':' + z, function () { return new THREE.BoxGeometry(x, y, z); }); }
  function capGeo(r, tl, tilt) {
    return cg('cap:' + r + ':' + tl + ':' + tilt, function () {
      const g = new THREE.SphereGeometry(r, 16, 8, 0, PI * 2, 0, tl);
      g.rotateX(tilt);
      return g;
    });
  }
  function charMat(hex, rough) {
    return new THREE.MeshStandardMaterial({ color: col(hex).clone(), roughness: rough == null ? 0.72 : rough, metalness: 0 });
  }
  let SHARED_CHAR = null;
  function sharedCharMats() {
    if (SHARED_CHAR) return SHARED_CHAR;
    SHARED_CHAR = {
      shoe: charMat('#3a2f2a', 0.6),
      eye: new THREE.MeshBasicMaterial({ color: col('#1d1a1a') }),
      mouth: charMat('#9a4a45', 0.6),
      white: charMat('#ffffff', 0.6),
      book: charMat('#c44b3c'), pages: charMat('#f5f0e1'),
      phone: charMat('#26272b', 0.4), steel: charMat('#c8ced3', 0.35),
      plate: charMat('#fbfbf8', 0.5), food: charMat('#c97b3d'), greens: charMat('#6db35a'),
      bread: charMat('#e0b36e'), sponge: charMat('#f2d15a'), wood: charMat('#c9955e'),
      palette: charMat('#d8b98a'), paint1: charMat('#d9473b'), paint2: charMat('#3f7fd0'), paint3: charMat('#f2c43c'),
      remote: charMat('#2b2c31', 0.5),
      water: new THREE.MeshStandardMaterial({ color: col('#bfe6ff'), transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }),
      sheet: charMat('#ffffff', 0.85),
      plateBlack: charMat('#26272b', 0.5),
    };
    return SHARED_CHAR;
  }
  function mesh(geo, mat, x, y, z, shadow) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = shadow !== false;
    m.receiveShadow = false;
    return m;
  }
  function grp(x, y, z, name) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (name) g.name = name; return g; }

  function normColors(c) {
    c = c || {};
    return {
      skin: safeHex(c.skin, '#e2b48e'), hair: safeHex(c.hair, '#3b2a20'),
      shirt: safeHex(c.shirt, '#4f80bf'), pants: safeHex(c.pants, '#3d4a5c'),
    };
  }

  // vertex-colour roles of character geometry (recoloured by setColors without new materials)
  const R_SKIN = 0, R_HAIR = 1, R_SHIRT = 2, R_PANTS = 3, R_SHOE = 4, R_BLUSH = 5, R_EYE = 6, R_MOUTH = 7;
  function roleColors(n) {
    return [col(n.skin), col(n.hair), col(n.shirt), col(n.pants), col('#3a2f2a'), col(mixHex(n.skin, '#ff7f7f', 0.35)), col('#1d1a1a'), col('#9a4a45')];
  }
  let CHAR_MAT = null;
  function charBodyMat() {
    return CHAR_MAT || (CHAR_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 }));
  }
  // one rigid character part = several template geometries merged, each vertex tagged with a colour role
  function PartBuilder() { this.items = []; }
  PartBuilder.prototype.add = function (geo, x, y, z, role, rx, ry, rz, sx, sy, sz) {
    this.items.push({ geo: nonIndexed(geo), m: localMatrix(x, y, z, rx, ry, rz, sx, sy, sz), role: role });
    return this;
  };
  PartBuilder.prototype.build = function (cols) {
    let n = 0;
    for (const it of this.items) n += it.geo.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), colr = new Float32Array(n * 3), roles = new Uint8Array(n);
    const t = tmp();
    let o = 0;
    for (const it of this.items) {
      const P = it.geo.attributes.position.array, N = it.geo.attributes.normal.array, e = it.m.elements;
      t.nm.getNormalMatrix(it.m);
      const ne = t.nm.elements;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2];
        pos[o * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
        pos[o * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        pos[o * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        const nx = N[i], ny = N[i + 1], nz = N[i + 2];
        const ax = ne[0] * nx + ne[3] * ny + ne[6] * nz, ay = ne[1] * nx + ne[4] * ny + ne[7] * nz, az = ne[2] * nx + ne[5] * ny + ne[8] * nz;
        const l = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
        nor[o * 3] = ax / l; nor[o * 3 + 1] = ay / l; nor[o * 3 + 2] = az / l;
        roles[o] = it.role;
        o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    g.userData.roles = roles;
    recolor(g, cols);
    g.computeBoundingSphere();
    return g;
  };
  function recolor(g, cols) {
    const roles = g.userData.roles, c = g.attributes.color.array;
    for (let i = 0; i < roles.length; i++) {
      const cc = cols[roles[i]];
      c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b;
    }
    g.attributes.color.needsUpdate = true;
  }

  function character(sim) {
    sim = sim || {};
    const sh = sharedCharMats();
    const colors = normColors(sim.colors);
    const female = sim.gender === 'f';
    const h = hashStr((sim.id != null ? sim.id : '') + '|' + (sim.name || ''));
    const style = female ? h % 4 : h % 3;
    const longSleeves = ((h >>> 4) % 3) === 0;
    let cols = roleColors(colors);
    const bodyMat = charBodyMat();
    const geos = [];
    const blanketMat = charMat('#5d86b5', 0.9);
    function part(pb, parent, x, y, z, shadow) {
      const g = pb.build(cols);
      geos.push(g);
      const m = new THREE.Mesh(g, bodyMat);
      m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = shadow !== false;
      m.receiveShadow = false;
      parent.add(m);
      return m;
    }

    const root = new THREE.Group(); root.name = 'character';
    const pose = grp(0, 0, 0, 'pose'); root.add(pose);
    const hips = grp(0, HIP_Y, 0, 'hips'); pose.add(hips);

    // pelvis
    const pw = female ? 0.31 : 0.3;
    part(new PartBuilder().add(cg('pelvis:' + pw, function () { return frustumBoxGeo(pw * 0.92, 0.2, pw, 0.21, 0.17, -0.1); }), 0, 0, 0, R_PANTS), hips);

    // legs
    function leg(side) {
      const g = grp(side * 0.085, -0.03, 0, side > 0 ? 'legL' : 'legR');
      part(new PartBuilder().add(limbGeo(0.074, 0.06, 0.42, 8), 0, 0, 0, R_PANTS), g);
      const knee = grp(0, -0.42, 0, 'knee'); g.add(knee);
      part(new PartBuilder().add(limbGeo(0.058, 0.047, 0.36, 8), 0, 0, 0, R_PANTS), knee);
      const foot = part(new PartBuilder().add(boxGeo(0.105, 0.07, 0.22), 0, 0, 0, R_SHOE), knee, 0, -0.385, 0.045);
      hips.add(g);
      return { g: g, knee: knee, foot: foot };
    }
    const legL = leg(1), legR = leg(-1);

    // spine: chest + collar
    const spine = grp(0, 0.06, 0, 'spine'); hips.add(spine);
    const chestGeo = female
      ? cg('chestF', function () { return frustumBoxGeo(0.27, 0.185, 0.33, 0.2, 0.45, 0, 0.0); })
      : cg('chestM', function () { return frustumBoxGeo(0.3, 0.2, 0.4, 0.22, 0.45, 0, 0.0); });
    const chest = part(new PartBuilder().add(chestGeo, 0, 0, 0, R_SHIRT).add(limbGeo(0.075, 0.09, 0.04, 10), 0, 0.47, 0, R_SHIRT), spine);

    // neck + head
    const neck = grp(0, 0.44, 0, 'neck'); spine.add(neck);
    part(new PartBuilder().add(limbGeo(0.048, 0.052, 0.09, 8), 0, 0.09, 0, R_SKIN), neck);
    const head = grp(0, 0.06, 0, 'head'); neck.add(head);
    const HC = 0.13;   // head centre above the head pivot
    const R = 0.155;
    const hb = new PartBuilder();
    hb.add(sphGeo(R, 16, 12), 0, HC, 0, R_SKIN);
    const earG = cg('ear', function () { const g = new THREE.SphereGeometry(0.035, 8, 6); g.scale(0.5, 1, 0.8); return g; });
    hb.add(earG, R * 0.97, HC - 0.01, -0.005, R_SKIN).add(earG, -R * 0.97, HC - 0.01, -0.005, R_SKIN);
    hb.add(sphGeo(0.024, 8, 6), 0, HC - 0.022, R * 0.98, R_SKIN);
    if (female) {
      const blushGeo = cg('blush', function () { const g = new THREE.SphereGeometry(0.024, 8, 5); g.scale(1.2, 0.7, 0.3); return g; });
      hb.add(blushGeo, 0.088, HC - 0.035, R * 0.86, R_BLUSH).add(blushGeo, -0.088, HC - 0.035, R * 0.86, R_BLUSH);
    }
    // hair (in head space, centred on the head centre)
    const H0 = HC;
    if (!female) {
      hb.add(capGeo(R * 1.05, 1.5, -0.55), 0, H0, 0, R_HAIR);
      hb.add(boxGeo(0.2, 0.06, 0.07), 0.0, H0 + 0.1, 0.105, R_HAIR, -0.75);
      hb.add(boxGeo(0.035, 0.07, 0.07), R * 0.99, H0, 0.02, R_HAIR).add(boxGeo(0.035, 0.07, 0.07), -R * 0.99, H0, 0.02, R_HAIR);
      if (style === 1) hb.add(boxGeo(0.2, 0.07, 0.1), 0, H0 + 0.13, 0.075, R_HAIR, -0.35);
      else if (style === 2) {
        hb.add(cg('beard', function () { return new THREE.SphereGeometry(0.12, 10, 6, 0, PI * 2, PI * 0.55, PI * 0.35); }), 0, H0 + 0.005, 0.03, R_HAIR);
        hb.add(boxGeo(0.16, 0.05, 0.08), 0, H0 + 0.14, 0.05, R_HAIR, -0.2);
      } else hb.add(boxGeo(0.12, 0.05, 0.12), 0.03, H0 + 0.15, 0.02, R_HAIR, 0, 0, 0.25);
    } else {
      hb.add(capGeo(R * 1.08, 1.55, -0.32), 0, H0, 0, R_HAIR);
      if (style === 0) {          // long straight
        hb.add(boxGeo(0.31, 0.36, 0.1), 0, H0 - 0.1, -0.1, R_HAIR);
        hb.add(boxGeo(0.06, 0.28, 0.12), R * 0.96, H0 - 0.06, -0.01, R_HAIR).add(boxGeo(0.06, 0.28, 0.12), -R * 0.96, H0 - 0.06, -0.01, R_HAIR);
      } else if (style === 1) {   // ponytail
        hb.add(sphGeo(0.06, 8, 6), 0, H0 + 0.05, -0.16, R_HAIR);
        hb.add(limbGeo(0.05, 0.02, 0.26, 8), 0, H0 + 0.04, -0.2, R_HAIR, 0.35);
      } else if (style === 2) {   // bun
        hb.add(sphGeo(0.085, 10, 8), 0, H0 + 0.13, -0.09, R_HAIR);
      } else {                    // bob
        hb.add(boxGeo(0.33, 0.2, 0.14), 0, H0 - 0.04, -0.07, R_HAIR);
        hb.add(boxGeo(0.06, 0.18, 0.15), R * 0.95, H0 - 0.04, 0.0, R_HAIR).add(boxGeo(0.06, 0.18, 0.15), -R * 0.95, H0 - 0.04, 0.0, R_HAIR);
        hb.add(boxGeo(0.24, 0.05, 0.05), 0, H0 + 0.1, 0.12, R_HAIR, -0.5);
      }
    }
    const headMesh = part(hb, head);
    // eyes (one mesh, origin at eye height so scale.y blinks both), brows, mouth
    const eyeGeo = cg('eye', function () { const g = new THREE.SphereGeometry(0.021, 8, 6); g.scale(0.85, 1.1, 0.5); return g; });
    const eyes = part(new PartBuilder().add(eyeGeo, 0.056, 0, 0, R_EYE).add(eyeGeo, -0.056, 0, 0, R_EYE), head, 0, HC + 0.012, R * 0.93, false);
    const browGeo = boxGeo(0.052, 0.013, 0.014);
    const brows = part(new PartBuilder().add(browGeo, 0.056, 0, 0, R_HAIR).add(browGeo, -0.056, 0, 0, R_HAIR), head, 0, HC + 0.058, R * 0.93, false);
    const mouth = part(new PartBuilder().add(boxGeo(0.055, 0.014, 0.012), 0, 0, 0, R_MOUTH), head, 0, HC - 0.068, R * 0.94, false);

    // arms
    const SW = female ? 0.178 : 0.2;
    function arm(side) {
      const g = grp(side * SW, 0.4, 0, side > 0 ? 'armL' : 'armR');
      part(new PartBuilder().add(sphGeo(female ? 0.058 : 0.064, 8, 6), 0, 0, 0, R_SHIRT)
        .add(limbGeo(female ? 0.05 : 0.056, female ? 0.043 : 0.048, 0.27, 8), 0, 0, 0, R_SHIRT), g);
      const elbow = grp(0, -0.27, 0, 'elbow'); g.add(elbow);
      const handGeo = cg('hand', function () { const g2 = new THREE.SphereGeometry(0.047, 8, 6); g2.scale(0.75, 1.1, 0.95); return g2; });
      part(new PartBuilder().add(limbGeo(0.044, 0.037, 0.22, 8), 0, 0, 0, longSleeves ? R_SHIRT : R_SKIN)
        .add(handGeo, 0, -0.235, 0, R_SKIN), elbow);
      const hand = grp(0, -0.235, 0, 'hand'); elbow.add(hand);
      spine.add(g);
      return { g: g, elbow: elbow, hand: hand };
    }
    const armL = arm(1), armR = arm(-1);

    // ---------------- props (hidden until an anim needs them)
    const props = {};
    function prop(name, parent, obj) { obj.visible = false; obj.name = 'prop:' + name; parent.add(obj); props[name] = obj; return obj; }
    // book in front of the chest (spine frame)
    const book = new THREE.Group();
    book.add(mesh(boxGeo(0.2, 0.15, 0.03), sh.book, 0, 0, 0));
    book.add(mesh(boxGeo(0.19, 0.14, 0.032), sh.pages, 0, 0, 0.004));
    book.position.set(0, 0.2, 0.27); book.rotation.x = -0.9;
    prop('book', spine, book);
    // phone in right hand
    const phone = mesh(boxGeo(0.05, 0.16, 0.035), sh.phone, -0.01, -0.04, 0.03);
    prop('phone', armR.hand, phone);
    // spoon (cook)
    const spoon = new THREE.Group();
    spoon.add(mesh(limbGeo(0.008, 0.008, 0.26, 5), sh.wood, 0, 0.02, 0.0));
    spoon.add(mesh(sphGeo(0.025, 6, 4), sh.wood, 0, -0.25, 0));
    spoon.rotation.x = 0.6;
    prop('spoon', armR.hand, spoon);
    // plate + food (eat seated) in front of the chest
    const plate = new THREE.Group();
    plate.add(mesh(limbGeo(0.12, 0.1, 0.02, 14), sh.plate, 0, 0.01, 0));
    plate.add(mesh(sphGeo(0.05, 7, 4), sh.food, 0.03, 0.02, 0.01));
    plate.add(mesh(sphGeo(0.035, 6, 4), sh.greens, -0.04, 0.02, -0.02));
    plate.position.set(0, 0.02, 0.3); plate.scale.setScalar(1.25);
    prop('plate', spine, plate);
    // fork (right hand)
    const fork = mesh(boxGeo(0.012, 0.16, 0.012), sh.steel, 0, -0.06, 0.03);
    prop('fork', armR.hand, fork);
    // sandwich (eat standing)
    const sandwich = new THREE.Group();
    sandwich.add(mesh(boxGeo(0.11, 0.035, 0.08), sh.bread, 0, 0, 0));
    sandwich.add(mesh(boxGeo(0.115, 0.012, 0.085), sh.greens, 0, 0.02, 0));
    sandwich.add(mesh(boxGeo(0.11, 0.03, 0.08), sh.bread, 0, 0.04, 0));
    sandwich.position.set(0, -0.06, 0.05); sandwich.rotation.x = HP;
    prop('sandwich', armR.hand, sandwich);
    // brush + palette (paint)
    const brush = new THREE.Group();
    brush.add(mesh(limbGeo(0.007, 0.006, 0.2, 5), sh.wood, 0, 0.06, 0));
    brush.add(mesh(sphGeo(0.014, 5, 4), sh.paint2, 0, -0.15, 0));
    brush.rotation.x = 1.2;
    prop('brush', armR.hand, brush);
    const palette = new THREE.Group();
    palette.add(mesh(limbGeo(0.11, 0.11, 0.012, 12), sh.palette, 0, 0, 0));
    palette.add(mesh(sphGeo(0.018, 5, 3), sh.paint1, 0.05, 0.01, 0.03));
    palette.add(mesh(sphGeo(0.018, 5, 3), sh.paint2, 0.0, 0.01, 0.06));
    palette.add(mesh(sphGeo(0.018, 5, 3), sh.paint3, -0.05, 0.01, 0.03));
    palette.position.set(0.04, -0.05, 0.06); palette.rotation.z = HP; palette.rotation.y = 0.3;
    prop('palette', armL.hand, palette);
    // sponge (clean)
    prop('sponge', armR.hand, mesh(boxGeo(0.1, 0.05, 0.07), sh.sponge, 0, -0.05, 0.02));
    // remote (tv)
    prop('remote', armR.hand, mesh(boxGeo(0.04, 0.13, 0.02), sh.remote, 0, -0.05, 0.03));
    // barbell (exercise) — spans from the right hand toward the left hand along local +X
    const barbell = new THREE.Group();
    const bar = mesh(limbGeo(0.016, 0.016, 1.0, 8), sh.steel, 0, 0, 0); bar.rotation.z = HP; bar.position.x = -0.5 + 0.2;
    barbell.add(bar);
    const plateG = limbGeo(0.11, 0.11, 0.05, 12);
    const p1 = mesh(plateG, sh.plateBlack, -0.27, 0, 0); p1.rotation.z = HP; p1.position.x = -0.27 + 0.025; barbell.add(p1);
    const p2 = mesh(plateG, sh.plateBlack, 0.67, 0, 0); p2.rotation.z = HP; p2.position.x = 0.67 + 0.025; barbell.add(p2);
    barbell.position.set(0.0, -0.05, 0.0);
    prop('barbell', armR.hand, barbell);
    // shower water streaks above the head (pose frame)
    const water = new THREE.Group();
    const wr = srand(h);
    for (let i = 0; i < 9; i++) {
      const s = mesh(limbGeo(0.006, 0.006, 0.5, 4), sh.water, (wr() - 0.5) * 0.3, 2.0 - wr() * 1.5, (wr() - 0.5) * 0.3, false);
      s.userData.base = s.position.y; s.userData.speed = 1.6 + wr() * 1.2;
      water.add(s);
    }
    prop('water', pose, water);
    // blanket (lying in bed), pose frame
    const blanket = new THREE.Group();
    const lumpGeo = cg('lump', function () { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1); g.rotateX(HP); return g; });
    const bmain = mesh(lumpGeo, blanketMat, 0, 0, 0, true);
    const bfold = mesh(lumpGeo, sh.sheet, 0, 0, 0, true);
    blanket.add(bmain); blanket.add(bfold);
    blanket.userData.main = bmain; blanket.userData.fold = bfold;
    prop('blanket', pose, blanket);

    const rig = {
      root: root,
      parts: {
        head: head, body: spine, armL: armL.g, armR: armR.g, legL: legL.g, legR: legR.g,
        pose: pose, hips: hips, spine: spine, neck: neck, chest: chest, headMesh: headMesh,
        elbowL: armL.elbow, elbowR: armR.elbow, handL: armL.hand, handR: armR.hand,
        kneeL: legL.knee, kneeR: legR.knee, footL: legL.foot, footR: legR.foot,
        eyes: eyes, brows: brows, mouth: mouth,
      },
      props: props,
      female: female,
      style: style,
      seed: (h % 1000) / 1000,
      colorsKey: JSON.stringify(colors),
      _pose: null, _from: null, _blend: 1, _sig: '', _lastT: null,
      setColors: function (c) {
        const n = normColors(c);
        cols = roleColors(n);
        for (const g of geos) recolor(g, cols);
        rig.colorsKey = JSON.stringify(n);
      },
      setBlanket: function (hex) {
        if (hex) blanketMat.color.copy(col(safeHex(hex, '#5d86b5')));
        rig._blanketOn = !!hex;
      },
      dispose: function () {
        for (const g of geos) g.dispose();
        blanketMat.dispose();
      },
    };
    root.userData.rig = rig;
    root.traverse(function (o) { if (o.isMesh) o.userData.charPart = true; });
    animate(rig, 'idle', 0);
    return rig;
  }

  // ---------------------------------------------------------------- pose channels
  const KEYS = ['px', 'py', 'pz', 'prx', 'pry', 'prz', 'hy', 'hrx', 'hry', 'hrz', 'srx', 'sry', 'srz',
    'nrx', 'nry', 'nrz', 'lsx', 'lsy', 'lsz', 'lex', 'rsx', 'rsy', 'rsz', 'rex', 'lwx', 'rwx',
    'llx', 'lly', 'llz', 'lkx', 'rlx', 'rly', 'rlz', 'rkx', 'lfx', 'rfx', 'br', 'eye', 'mw', 'mh', 'brow'];
  function restPose(P) {
    for (const k of KEYS) P[k] = 0;
    P.hy = HIP_Y; P.br = 1; P.eye = 1; P.mw = 1; P.mh = 1;
    P.lsz = 0.07; P.rsz = -0.07; P.lex = -0.12; P.rex = -0.12;
    return P;
  }
  function newPose() { return restPose({}); }

  // seat-height helper: thigh angle so the feet reach the floor
  function sitLegs(P, seatH) {
    const hip = seatH + 0.075;
    P.hy = hip;
    const j = hip - 0.03;            // hip joint height
    const c = (j - 0.42) / 0.42;     // cos of thigh angle from vertical
    if (c > 0.02) {
      const a = Math.acos(clamp(c, 0, 1));
      P.llx = P.rlx = -a; P.lkx = P.rkx = a;
    } else {
      P.llx = P.rlx = -1.5; P.lkx = P.rkx = 0.75;   // low seat: legs stretched forward
    }
    P.llz = 0.06; P.rlz = -0.06;
  }
  function handsOnLap(P) {
    P.lsx = P.rsx = -0.12; P.lex = P.rex = -1.0; P.lsz = -0.1; P.rsz = 0.1;
  }
  function blink(P, t, r) {
    const cyc = 3.2 + r * 2.5;
    const ph = (t + r * 10) % cyc;
    if (ph < 0.12) P.eye = 0.12;
  }
  function wave01(t, f) { return 0.5 + 0.5 * Math.sin(t * f); }

  const SEATED_OK = { idle: 1, sit: 1, eat: 1, read: 1, tv: 1, talk: 1, phone: 1, cry: 1, wave: 1, joke: 1, laugh: 1, angry: 1, use: 1 };

  function standIdle(P, t, r) {
    P.hrz = 0.025 * Math.sin(t * 0.55 + r * 6);
    P.llz = 0.02; P.rlz = -0.02;
    P.srx = 0.02;
    P.br = 1 + 0.012 * Math.sin(t * 2.0 + r * 3);
    P.lsz = 0.08 + 0.01 * Math.sin(t * 2 + r); P.rsz = -0.08 - 0.01 * Math.sin(t * 2 + r);
  }
  function lookAround(P, t, r, amt) {
    const s = Math.sin(t * 0.37 + r * 12) * Math.sin(t * 0.13 + r * 4);
    P.nry += (amt == null ? 0.35 : amt) * s;
  }

  // ctx: { seated, support, seatH, off:{x,z}, phase, speed }
  const ANIM = {
    idle: function (P, t, c) {
      if (c.seated) { sitLegs(P, c.seatH); handsOnLap(P); P.br = 1 + 0.012 * Math.sin(t * 2); }
      else standIdle(P, t, c.r);
      lookAround(P, t, c.r);
    },
    walk: function (P, t, c) {
      const ph = c.phase != null ? c.phase : t * 7;
      const s = Math.sin(ph), co = Math.cos(ph);
      P.llx = -0.5 * s; P.rlx = 0.5 * s;
      P.lkx = 0.1 + 0.62 * Math.max(0, co); P.rkx = 0.1 + 0.62 * Math.max(0, -co);
      P.lfx = -0.15 * Math.max(0, co); P.rfx = -0.15 * Math.max(0, -co);
      P.lsx = 0.42 * s; P.rsx = -0.42 * s; P.lex = P.rex = -0.32;
      P.hy = HIP_Y - 0.025 + 0.03 * Math.abs(co);
      P.hry = 0.07 * s; P.sry = -0.1 * s;
      P.srx = 0.05; P.nrx = -0.03;
    },
    sit: function (P, t, c) {
      sitLegs(P, c.seatH); handsOnLap(P);
      P.br = 1 + 0.012 * Math.sin(t * 2);
      lookAround(P, t, c.r, 0.3);
      // occasional leg swing
      P.lkx += 0.08 * Math.max(0, Math.sin(t * 0.7 + c.r * 9)) * Math.sin(t * 3);
    },
    sleep: function (P, t, c) {
      const breath = Math.sin(t * 1.6 + c.r * 3);
      P.eye = 0.1; P.br = 1 + 0.035 * breath; P.mw = 0.7;
      const sup = c.support;
      if (sup === 'bed' || sup === 'bench') {
        P.hy = c.seatH + 0.1 + 0.004 * breath;
        P.pz = c.off ? clamp(c.off.z, -0.6, 0.6) : 0;
        P.hrx = -HP;
        P.srx = 0.08; P.nrx = 0.3; P.nry = 0.25 * Math.sin(t * 0.05 + c.r * 5);
        P.lsx = 0.05; P.lsz = 0.04; P.lex = -0.2;
        P.rsx = 0.05; P.rsz = -0.04; P.rex = -0.28;
        P.llx = -0.04; P.rlx = 0.02; P.lkx = 0.1; P.rkx = 0.14; P.llz = 0.03; P.rlz = -0.02;
        P.lfx = 1.5; P.rfx = 1.5;
        c.blanket = sup === 'bed';
      } else if (sup === 'sofa') {
        P.hy = c.seatH + 0.1 + 0.004 * breath;
        P.px = c.off ? clamp(c.off.x, -0.6, 0.6) : 0;
        P.pz = (c.off ? clamp(c.off.z, -0.3, 0.3) : 0) + 0.06;
        P.pry = HP; P.hrx = -HP;
        P.srx = 0.15; P.nrx = 0.45; P.nrz = 0.1;
        P.lsx = -0.6; P.lsz = -0.35; P.lex = -1.5; P.rsx = -0.6; P.rsz = 0.35; P.rex = -1.5;   // arms folded
        P.llx = -0.45; P.rlx = -0.35; P.lkx = 0.8; P.rkx = 0.6;
      } else if (sup === 'chair' || sup === 'toilet') {
        sitLegs(P, c.seatH); handsOnLap(P);
        P.srx = -0.3; P.nrx = 0.25; P.nrz = 0.4 + 0.03 * breath;
        P.llz = 0.14; P.rlz = -0.14;
      } else {
        // fainted / floor
        P.hy = 0.12 + 0.004 * breath; P.hrx = -HP;
        P.nrx = 0.1; P.nry = 0.5;
        P.lsz = 0.5; P.lex = -0.5; P.rsz = -0.9; P.rex = -0.8;
        P.llx = -0.15; P.lkx = 0.4; P.rkx = 0.05; P.llz = 0.1; P.rlz = -0.08;
        P.lfx = 1.0; P.rfx = 0.8;
      }
    },
    eat: function (P, t, c) {
      const cyc = (t * 0.45 + c.r) % 1;     // ~2.2 s per bite
      const lift = cyc < 0.35 ? cyc / 0.35 : cyc < 0.55 ? 1 : Math.max(0, 1 - (cyc - 0.55) / 0.3);
      const e = lift * lift * (3 - 2 * lift);
      if (c.seated) {
        sitLegs(P, c.seatH);
        P.lsx = -0.55; P.lex = -1.05; P.lsz = -0.1;          // left hand supports plate
        P.rsx = -0.55 - 0.45 * e; P.rex = -1.0 - 1.15 * e; P.rsz = -0.05 + 0.25 * e;
        P.srx = 0.12 - 0.06 * e; P.nrx = 0.25 - 0.3 * e;
        c.props.plate = 1; c.props.fork = 1;
      } else {
        standIdle(P, t, c.r);
        P.rsx = -0.5 - 0.4 * e; P.rex = -1.0 - 1.2 * e; P.rsz = -0.05 + 0.3 * e;
        P.lsz = 0.1; P.nrx = 0.1 - 0.15 * e;
        c.props.sandwich = 1;
      }
      P.mh = 1 + 0.8 * Math.max(0, Math.sin(t * 9)) * (1 - e);
    },
    cook: function (P, t, c) {
      standIdle(P, t, c.r);
      P.pz = 0.18;
      P.srx = 0.14; P.nrx = 0.35;
      P.lsx = -0.75; P.lex = -0.55; P.lsz = 0.12;
      P.rsx = -0.95 + 0.14 * Math.sin(t * 3.2); P.rsz = -0.12 + 0.16 * Math.cos(t * 3.2); P.rex = -0.85;
      P.rwx = 0.2;
      P.hrz = 0.03 * Math.sin(t * 1.6);
      c.props.spoon = 1;
    },
    shower: function (P, t, c) {
      P.py = c.support === 'shower' ? c.seatH : 0;
      standIdle(P, t, c.r);
      const a = Math.sin(t * 5), b2 = Math.sin(t * 5 + 1.7);
      P.lsx = -2.5 + 0.2 * a; P.lsz = 0.4; P.lex = -1.7 + 0.25 * b2;
      P.rsx = -2.5 + 0.2 * b2; P.rsz = -0.4; P.rex = -1.7 + 0.25 * a;
      P.nrx = -0.25; P.pry = 0.35 * Math.sin(t * 0.4);
      P.eye = 0.15;
      c.props.water = 1;
    },
    bath: function (P, t, c) {
      const breath = Math.sin(t * 1.4);
      P.br = 1 + 0.02 * breath;
      if (c.support === 'hottub') {
        sitLegs(P, c.seatH);
        P.lsz = 1.0; P.lex = -0.3; P.lsx = -0.15; P.rsz = -1.0; P.rex = -0.3; P.rsx = -0.15;
        P.srx = -0.2; P.nrx = -0.1 + 0.05 * breath; lookAround(P, t, c.r, 0.5);
      } else {
        // recline along the tub (local X), back against the -X end
        P.pry = HP;
        P.px = (c.off ? clamp(c.off.x, -0.6, 0.6) : 0) - 0.42;
        P.pz = c.off ? clamp(c.off.z, -0.3, 0.3) : 0;
        P.hy = (c.seatH || 0.18) + 0.08;
        P.hrx = -0.85;
        P.llx = -1.15; P.rlx = -1.05; P.lkx = 1.45; P.rkx = 1.3; P.llz = 0.1; P.rlz = -0.1;
        P.lsz = 0.62; P.rsz = -0.62; P.lsx = -0.2; P.rsx = -0.2; P.lex = -0.6; P.rex = -0.6;
        P.nrx = 0.55; P.nrz = 0.12 * Math.sin(t * 0.3);
        P.eye = 0.35 + 0.65 * (Math.sin(t * 0.25 + c.r) > 0.6 ? 1 : 0);
      }
    },
    toilet: function (P, t, c) {
      sitLegs(P, c.support === 'toilet' ? c.seatH : 0.43);
      P.srx = 0.32; P.nrx = 0.15;
      P.lsx = -0.45; P.lex = -1.3; P.lsz = -0.1; P.rsx = -0.45; P.rex = -1.3; P.rsz = 0.1;
      P.lkx += 0.06 * Math.max(0, Math.sin(t * 6)) * (Math.sin(t * 0.5) > 0 ? 1 : 0);   // foot tapping
      lookAround(P, t, c.r, 0.25);
    },
    wash: function (P, t, c) {
      standIdle(P, t, c.r);
      P.pz = 0.22; P.srx = 0.3; P.nrx = 0.35;
      const s = Math.sin(t * 9);
      P.lsx = -0.85; P.rsx = -0.85; P.lex = -0.75; P.rex = -0.75;
      P.lsz = -0.18 + 0.06 * s; P.rsz = 0.18 + 0.06 * s;
    },
    read: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else standIdle(P, t, c.r);
      P.lsx = -0.6; P.rsx = -0.6; P.lex = -1.35; P.rex = -1.35; P.lsz = -0.12; P.rsz = 0.12;
      P.nrx = 0.42; P.srx = 0.06;
      const turn = (t * 0.15 + c.r) % 1;
      if (turn > 0.9) { const k = Math.sin((turn - 0.9) / 0.1 * PI); P.rsx -= 0.2 * k; P.rsz += 0.25 * k; }
      P.nry = 0.08 * Math.sin(t * 0.8);
      c.props.book = 1;
    },
    tv: function (P, t, c) {
      const laugh = Math.max(0, Math.sin(t * 0.35 + c.r * 7) - 0.85) * 6.6;   // brief laughs
      if (c.seated) {
        sitLegs(P, c.seatH); handsOnLap(P);
        P.srx = -0.14; P.nrx = 0.05;
        P.rsx = -0.75; P.rex = -0.9; c.props.remote = 1;
      } else {
        standIdle(P, t, c.r);
        P.lsx = -0.55; P.rsx = -0.55; P.lex = -1.75; P.rex = -1.75; P.lsz = -0.35; P.rsz = 0.35;   // arms crossed
      }
      P.srx -= 0.12 * laugh; P.nrx -= 0.25 * laugh;
      P.hy += 0.012 * laugh * Math.sin(t * 22);
      P.mh = 1 + 1.6 * laugh; P.mw = 1 + 0.3 * laugh;
    },
    computer: function (P, t, c) {
      sitLegs(P, 0.48);
      P.pz = 0.66;
      P.srx = 0.14; P.nrx = 0.02;
      const a = Math.sin(t * 13), b2 = Math.sin(t * 11 + 1.3);
      P.lsx = -0.75; P.rsx = -0.75; P.lex = -1.05 + 0.06 * a; P.rex = -1.05 + 0.06 * b2;
      P.lsz = -0.06; P.rsz = 0.06;
      P.nry = 0.06 * Math.sin(t * 0.6);
    },
    talk: function (P, t, c) {
      if (c.seated) { sitLegs(P, c.seatH); handsOnLap(P); } else standIdle(P, t, c.r);
      const a = Math.sin(t * 2.3 + c.r * 5), b2 = Math.sin(t * 1.7 + c.r * 3 + 1);
      P.rsx = -0.55 - 0.35 * Math.max(0, a); P.rex = -1.0 - 0.5 * Math.max(0, a); P.rsz = -0.15 - 0.2 * Math.max(0, a);
      P.lsx = -0.3 - 0.4 * Math.max(0, b2); P.lex = -0.6 - 0.7 * Math.max(0, b2); P.lsz = 0.12 + 0.2 * Math.max(0, b2);
      P.nrx = 0.06 * Math.sin(t * 3.1); P.nrz = 0.1 * Math.sin(t * 1.3 + c.r);
      P.mh = 1 + 1.2 * Math.max(0, Math.sin(t * 11));
    },
    dance: function (P, t, c) {
      const beat = t * 2.2 * PI;
      const bounce = Math.abs(Math.sin(beat));
      P.hy = HIP_Y - 0.06 * bounce;
      P.lkx = P.rkx = 0.22 * bounce; P.llx = P.rlx = -0.12 * bounce;
      P.hrz = 0.12 * Math.sin(beat * 0.5);
      P.srz = -0.1 * Math.sin(beat * 0.5); P.sry = 0.2 * Math.sin(beat * 0.25);
      const up = Math.sin(beat * 0.5);
      P.lsx = -2.4 + 0.5 * up; P.lsz = 0.5; P.lex = -0.6;
      P.rsx = -0.8 - 0.6 * up; P.rsz = -0.6; P.rex = -1.0;
      P.nrz = 0.15 * Math.sin(beat * 0.5); P.nrx = 0.08 * Math.sin(beat);
      P.pry = (t % 9 < 1.2) ? ((t % 9) / 1.2) * PI * 2 : 0;    // a little spin every few seconds
      P.mw = 1.3; P.mh = 1.4;
    },
    exercise: function (P, t, c) {
      if (c.support === 'bench') {
        const k = 0.5 - 0.5 * Math.cos(t * 2.4);    // press cycle
        P.hy = c.seatH + 0.1; P.hrx = -HP;
        P.pz = c.off ? clamp(c.off.z, -0.6, 0.6) : 0;
        P.nrx = 0.2;
        P.lsx = P.rsx = -1.45; P.lsz = 0.0; P.rsz = 0.0;
        P.lex = P.rex = -1.9 + 1.75 * k;
        P.llx = P.rlx = 0.45; P.lkx = P.rkx = 1.45; P.llz = 0.25; P.rlz = -0.25;
        P.lfx = P.rfx = -0.2;
        P.mw = 0.7; P.mh = 0.7 + 0.6 * k; P.brow = -0.25;
        c.props.barbell = 1;
      } else {
        // jumping jacks
        const k = 0.5 - 0.5 * Math.cos(t * 6);
        P.hy = HIP_Y + 0.06 * Math.abs(Math.sin(t * 6));
        P.lsz = 0.2 + 2.5 * k; P.rsz = -0.2 - 2.5 * k; P.lex = P.rex = -0.2;
        P.llz = 0.05 + 0.3 * k; P.rlz = -0.05 - 0.3 * k;
      }
    },
    paint: function (P, t, c) {
      standIdle(P, t, c.r);
      P.pz = 0.2;
      P.lsx = -0.55; P.lsz = 0.4; P.lex = -1.25;
      P.rsx = -1.35 + 0.18 * Math.sin(t * 2.4); P.rsz = -0.12 + 0.15 * Math.sin(t * 1.7); P.rex = -0.45 + 0.1 * Math.sin(t * 2.4);
      P.nrz = 0.12 * Math.sin(t * 0.4); P.nrx = 0.05;
      const step = (t * 0.12 + c.r) % 1;         // occasionally step back to admire
      if (step > 0.85) { const k = Math.sin((step - 0.85) / 0.15 * PI); P.pz -= 0.18 * k; P.rsx += 0.8 * k; P.nrz += 0.2 * k; }
      c.props.brush = 1; c.props.palette = 1;
    },
    chess: function (P, t, c) {
      sitLegs(P, 0.46);
      P.pz = 0.6;
      P.srx = 0.22; P.nrx = 0.4;
      const move = (t * 0.18 + c.r) % 1;
      P.lsx = -0.95; P.lex = -2.15; P.lsz = -0.1;          // chin on hand
      if (move > 0.82) {
        const k = Math.sin((move - 0.82) / 0.18 * PI);
        P.rsx = -0.7 - 0.6 * k; P.rex = -0.8 + 0.4 * k; P.rsz = 0.1;
      } else { P.rsx = -0.7; P.rex = -0.9; P.rsz = 0.1; }
    },
    clean: function (P, t, c) {
      standIdle(P, t, c.r);
      P.pz = 0.15;
      P.srx = 0.75; P.nrx = 0.1;
      P.lkx = P.rkx = 0.25; P.llx = P.rlx = -0.15;
      P.rsx = -0.9 + 0.22 * Math.sin(t * 5); P.rsz = -0.15 + 0.22 * Math.cos(t * 5); P.rex = -0.3;
      P.lsx = -0.6; P.lex = -0.7; P.lsz = 0.2;
      c.props.sponge = 1;
    },
    phone: function (P, t, c) {
      if (c.seated) { sitLegs(P, c.seatH); handsOnLap(P); } else standIdle(P, t, c.r);
      P.rsx = -0.35; P.rsz = -0.62; P.rsy = 0.0; P.rex = -2.35; P.rwx = 0.0;
      P.nrz = -0.12; P.nry = 0.15 * Math.sin(t * 0.5);
      const g = Math.max(0, Math.sin(t * 1.3 + c.r * 4));
      P.lsx = -0.3 - 0.5 * g; P.lex = -0.5 - 0.8 * g; P.lsz = 0.1 + 0.2 * g;
      P.mh = 1 + 1.0 * Math.max(0, Math.sin(t * 10)) * (Math.sin(t * 0.7) > 0 ? 1 : 0);
      c.props.phone = 1;
    },
    piano: function (P, t, c) {
      sitLegs(P, 0.5);
      P.pz = 0.62;
      P.srx = 0.08;
      const a = Math.sin(t * 7), b2 = Math.sin(t * 5.3 + 1);
      P.lsx = P.rsx = -0.72; P.lex = -1.0 + 0.08 * a; P.rex = -1.0 + 0.08 * b2;
      P.lsz = 0.05 + 0.12 * Math.sin(t * 1.1); P.rsz = -0.05 - 0.12 * Math.sin(t * 0.9 + 2);
      P.hrz = 0.05 * Math.sin(t * 1.4); P.nrz = 0.12 * Math.sin(t * 1.4 + 0.5); P.nrx = 0.15;
      P.eye = Math.sin(t * 0.5) > 0.7 ? 0.15 : 1;
    },
    cry: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else standIdle(P, t, c.r);
      const sob = Math.sin(t * 9) * (Math.sin(t * 1.2) > -0.3 ? 1 : 0.3);
      P.srx = 0.25 + 0.03 * sob; P.nrx = 0.45;
      P.lsx = P.rsx = -1.25; P.lex = P.rex = -2.25; P.lsz = -0.25; P.rsz = 0.25;
      P.hy += c.seated ? 0 : 0.006 * sob;
      P.eye = 0.2; P.brow = 0.35; P.mw = 0.7; P.mh = 1.6;
    },
    wave: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else standIdle(P, t, c.r);
      P.rsz = -2.55; P.rsx = -0.25; P.rex = -0.25 - 0.45 * wave01(t, 9);
      P.nrz = 0.1; P.mw = 1.35;
    },
    joke: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else standIdle(P, t, c.r);
      const ph = (t * 0.4 + c.r) % 1;
      if (ph < 0.75) {
        const a = Math.sin(t * 3.4);
        P.srx = 0.15; P.rsx = -0.7 - 0.3 * a; P.rex = -1.2; P.rsz = -0.2;
        P.lsx = -0.5 + 0.3 * a; P.lex = -1.0; P.lsz = 0.2;
        P.nrz = 0.12 * Math.sin(t * 2); P.mh = 1 + Math.max(0, Math.sin(t * 12));
      } else {                                  // punchline: arms out
        const k = Math.sin((ph - 0.75) / 0.25 * PI);
        P.lsz = 0.2 + 1.0 * k; P.rsz = -0.2 - 1.0 * k; P.lex = P.rex = -0.4; P.lsx = P.rsx = -0.5;
        P.srx = -0.1 * k; P.mw = 1.4; P.mh = 1.8;
      }
    },
    hug: function (P, t, c) {
      standIdle(P, t, c.r);
      P.pz = 0.3; P.srx = 0.12;
      P.lsx = P.rsx = -1.35; P.lsz = -0.35; P.rsz = 0.35; P.lex = P.rex = -1.15;
      P.hrz = 0.05 * Math.sin(t * 2); P.nrz = 0.3; P.nry = 0.2;
      P.eye = 0.2; P.mw = 1.2;
    },
    kiss: function (P, t, c) {
      standIdle(P, t, c.r);
      P.pz = 0.33; P.srx = 0.16; P.nrx = 0.12; P.nrz = 0.28;
      P.lsx = P.rsx = -0.95; P.lsz = -0.25; P.rsz = 0.25; P.lex = P.rex = -1.0;
      P.eye = 0.12; P.mw = 0.6; P.mh = 1.2;
      P.hy += 0.012 * Math.sin(t * 1.5);
    },
    angry: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else standIdle(P, t, c.r);
      const pump = Math.sin(t * 10);
      P.srx = 0.18; P.nrx = -0.05; P.nry = 0.2 * Math.sin(t * 6);
      P.lsx = -0.65 + 0.2 * pump; P.rsx = -0.65 - 0.2 * pump; P.lex = P.rex = -1.7; P.lsz = 0.3; P.rsz = -0.3;
      if (!c.seated) {
        const st = Math.sin(t * 4);
        if (st > 0.6) { P.llx = -0.4 * (st - 0.6) / 0.4; P.lkx = 0.6 * (st - 0.6) / 0.4; }
      }
      P.brow = -0.45; P.mw = 1.3; P.mh = 0.6;
    },
    laugh: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else standIdle(P, t, c.r);
      const sh2 = Math.sin(t * 14);
      P.srx = -0.22 + 0.04 * sh2; P.nrx = -0.3;
      P.lsx = P.rsx = -0.45; P.lsz = -0.18; P.rsz = 0.18; P.lex = P.rex = -1.45;
      P.hy += c.seated ? 0 : 0.01 * sh2;
      P.eye = 0.25; P.mw = 1.4; P.mh = 2.2;
    },
    stretch: function (P, t, c) {
      standIdle(P, t, c.r);
      const s = Math.sin(t * 0.9);
      P.lsx = P.rsx = -2.95; P.lsz = 0.25; P.rsz = -0.25; P.lex = P.rex = -0.15;
      P.srz = 0.22 * s; P.hrz = -0.05 * s; P.nrx = -0.2;
      P.hy = HIP_Y + 0.02 + 0.015 * Math.abs(s);
      P.lfx = P.rfx = 0.3;
      P.eye = 0.2; P.mh = 1.8;
    },
    use: function (P, t, c) {
      if (c.seated) sitLegs(P, c.seatH); else { standIdle(P, t, c.r); P.pz = 0.15; }
      P.srx = 0.1; P.nrx = 0.25;
      const a = Math.sin(t * 6), b2 = Math.sin(t * 4.3 + 2);
      P.lsx = -1.0 + 0.08 * b2; P.lex = -0.6; P.lsz = -0.05;
      P.rsx = -1.1 + 0.12 * a; P.rex = -0.55 + 0.1 * a; P.rsz = 0.05;
    },
  };
  ANIM.lie = ANIM.sleep;
  ANIM.relax = ANIM.sleep;

  const _blendTmp = {};
  function applyPose(rig, P) {
    const p = rig.parts;
    p.pose.position.set(P.px, P.py, P.pz);
    p.pose.rotation.set(P.prx, P.pry, P.prz);
    p.hips.position.y = P.hy;
    p.hips.rotation.set(P.hrx, P.hry, P.hrz);
    p.spine.rotation.set(P.srx, P.sry, P.srz);
    p.head.rotation.set(P.nrx, P.nry, P.nrz);
    p.armL.rotation.set(P.lsx, P.lsy, P.lsz);
    p.armR.rotation.set(P.rsx, P.rsy, P.rsz);
    p.elbowL.rotation.x = P.lex; p.elbowR.rotation.x = P.rex;
    p.handL.rotation.x = P.lwx; p.handR.rotation.x = P.rwx;
    p.legL.rotation.set(P.llx, P.lly, P.llz);
    p.legR.rotation.set(P.rlx, P.rly, P.rlz);
    p.kneeL.rotation.x = P.lkx; p.kneeR.rotation.x = P.rkx;
    p.footL.rotation.x = P.lfx; p.footR.rotation.x = P.rfx;
    p.chest.scale.set(1, 1 + (P.br - 1) * 0.4, P.br);
    p.eyes.scale.y = clamp(P.eye, 0.08, 1.2);
    p.mouth.scale.set(clamp(P.mw, 0.3, 2), clamp(P.mh, 0.5, 3.2), 1);
    p.brows.position.y = 0.188 + 0.025 * P.brow;
    p.brows.scale.x = 1 - 0.15 * Math.abs(P.brow);
  }

  /**
   * animate(rig, anim, t, ctx?)
   *   anim: any Sim.anim name (unknown -> idle). t: seconds (monotonic).
   *   ctx (optional, supplied by the renderer):
   *     seated  – sim.seated (sit variants of upper-body anims)
   *     support – meta.support of the object under the character ('chair','sofa','bed','toilet',
   *               'shower','tub','hottub','bench') or null
   *     seatH   – height of that support's seat/mattress top
   *     off     – {x,z}: vector from the character to the support's centre, in character-local axes
   *     phase   – walk-cycle phase (radians, advanced by distance walked)
   */
  function animate(rig, anim, t, ctx) {
    if (!rig || !rig.parts) return;
    ctx = ctx || {};
    t = +t || 0;
    const name = ANIM[anim] ? anim : 'idle';
    const seated = !!ctx.seated && (SEATED_OK[name] === 1);
    const fin = function (v, d) { v = +v; return isFinite(v) ? v : d; };
    const c = {
      seated: seated, support: typeof ctx.support === 'string' ? ctx.support : null,
      seatH: ctx.seatH != null && isFinite(+ctx.seatH) ? clamp(+ctx.seatH, 0, 1.5) : 0.45,
      off: ctx.off ? { x: fin(ctx.off.x, 0), z: fin(ctx.off.z, 0) } : null,
      phase: ctx.phase != null && isFinite(+ctx.phase) ? +ctx.phase : undefined, r: rig.seed, props: {}, blanket: false,
    };
    if (name === 'sit' && c.support == null && ctx.seatH == null) c.seatH = 0.45;
    const P = rig._pose || (rig._pose = newPose());
    restPose(P);
    ANIM[name](P, t, c);
    if (name !== 'sleep' && name !== 'bath' && name !== 'toilet' && name !== 'shower') blink(P, t, rig.seed);

    // transition blending when the pose family changes
    const sig = name + (seated ? ':s' : '') + ':' + (c.support || '');
    let dt = rig._lastT == null ? 0 : clamp(t - rig._lastT, 0, 0.1);
    if (rig._lastT != null && t < rig._lastT) dt = 0.016;
    rig._lastT = t;
    for (const key of KEYS) if (!isFinite(P[key])) P[key] = 0;   // never let bad input reach the scene graph
    if (!isFinite(P.hy) || P.hy === 0) P.hy = P.hy || HIP_Y;
    if (sig !== rig._sig) {
      if (rig._sig && rig._applied) {
        rig._from = Object.assign({}, rig._applied);
        rig._blend = 0;
      } else rig._blend = 1;
      rig._sig = sig;
    }
    let out = P;
    if (rig._blend < 1 && rig._from) {
      rig._blend = Math.min(1, rig._blend + (dt > 0 ? dt : 0.016) / 0.32);
      const k = rig._blend * rig._blend * (3 - 2 * rig._blend);
      for (const key of KEYS) {
        let a = rig._from[key], b = P[key];
        if (key === 'pry' || key === 'prx' || key === 'prz') {        // shortest angular path
          while (b - a > PI) a += PI * 2;
          while (a - b > PI) a -= PI * 2;
        }
        _blendTmp[key] = a + (b - a) * k;
      }
      out = _blendTmp;
    }
    applyPose(rig, out);
    rig._applied = rig._applied || {};
    for (const key of KEYS) rig._applied[key] = out[key];

    // props
    const pr = rig.props;
    for (const k in pr) {
      const want = k === 'blanket' ? !!(c.blanket && rig._blanketOn) : !!c.props[k];
      if (pr[k].visible !== want) pr[k].visible = want;
    }
    if (pr.water.visible) {
      for (const s of pr.water.children) {
        const span = 1.6;
        const y = s.userData.base - ((t * s.userData.speed) % span);
        s.position.y = y < 0.35 ? y + span : y;
      }
    }
    if (pr.blanket.visible) {
      // a soft lump over the body: flattened cylinder centred on the mattress-top blanket level
      const bl = pr.blanket;
      const base = (c.seatH || 0.5) + 0.03;
      const z0 = -0.4, z1 = 0.97;
      const rise = (P.hy + 0.15 - base) * (1 + (P.br - 1) * 0.6);
      bl.userData.main.scale.set(0.86, rise * 2, z1 - z0);
      bl.userData.main.position.set(0, base, (z0 + z1) / 2);
      bl.userData.fold.scale.set(0.875, rise * 2 + 0.02, 0.13);
      bl.userData.fold.position.set(0, base, z0 + 0.06);
    }
  }

  // ------------------------------------------------------------------ mood orb
  let glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    if (typeof document === 'undefined' || !document.createElement) return null;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(cv);
    return glowTex;
  }
  function orb() {
    const g = new THREE.Group();
    g.name = 'moodOrb';
    const core = new THREE.Mesh(sphGeo(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: col('#7bd36b').clone() }));
    const shell = new THREE.Mesh(sphGeo(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: col('#7bd36b').clone(), transparent: true,
      opacity: 0.35, depthWrite: false }));
    const hl = new THREE.Mesh(sphGeo(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    hl.position.set(-0.03, 0.035, 0.05);
    const tex = glowTexture();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col('#7bd36b').clone(), transparent: true,
      opacity: tex ? 0.85 : 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sprite.scale.set(0.55, 0.55, 0.55);
    g.add(sprite); g.add(shell); g.add(core); g.add(hl);
    g.renderOrder = 5;
    g.traverse(function (o) { o.renderOrder = 5; });
    g.userData.setColor = function (css) {
      const cc = col(safeHex(css, '#7bd36b'));
      core.material.color.copy(cc);
      shell.material.color.copy(cc);
      sprite.material.color.copy(cc);
    };
    g.userData.dispose = function () { core.material.dispose(); shell.material.dispose(); hl.material.dispose(); sprite.material.dispose(); };
    return g;
  }

  M.models = {
    build: build,
    meta: meta,
    has: has,
    list: list,
    character: character,
    animate: animate,
    orb: orb,
    color: col,
    glowTexture: glowTexture,
    get materials() { return mats(); },
    ANIMS: Object.keys(ANIM),
    PALETTE: C,
  };
})(window.M = window.M || {});
