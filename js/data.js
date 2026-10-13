(function (M) {
  'use strict';

  // ===========================================================================
  // M.data — static tables for Morada (pure data + tiny pure helpers).
  // All player-facing strings are Brazilian Portuguese. Money is shown as "M$".
  // Numbers follow RESEARCH.md (canonical "GAP FILLS" sections win) unless a
  // DESIGN.md decision overrides them. ESTIMATE values are tuned for play.
  // ===========================================================================

  const PI = Math.PI;

  // ---------------------------------------------------------------- motives
  const MOTIVES = ['hunger', 'energy', 'comfort', 'fun', 'hygiene', 'social', 'bladder', 'room'];
  const MOTIVE_LABELS = {
    hunger: 'Fome', energy: 'Energia', comfort: 'Conforto', fun: 'Diversão',
    hygiene: 'Higiene', social: 'Social', bladder: 'Bexiga', room: 'Ambiente',
  };
  const MOTIVE_ICONS = {
    hunger: '🍔', energy: '⚡', comfort: '🛋️', fun: '🎉',
    hygiene: '🧼', social: '💬', bladder: '🚽', room: '🏠', mood: '🙂',
  };
  // Scored motives for autonomy (9 entries, TS1.0 weights 1/9 each).
  const SCORED = ['energy', 'comfort', 'hunger', 'hygiene', 'bladder', 'mood', 'room', 'social', 'fun'];

  // Passive decay, motive points per SIM-HOUR (RESEARCH "Per-tick motive deltas").
  const DECAY = {
    hunger: { proportional: 0.063 },                 // −0.063 × (100 + hunger) per hour, awake and asleep
    energy: { awake: 11.25, asleep: 0, asleepAfterWake: 0.3 },
    bladder: { awake: 9, asleep: 4.5, hungerCoupling: 0.3 },   // + 0.3 × this tick's hunger decrement
    hygiene: { awake: 5.1, asleep: 2.4 },
    fun: { awake: 7.5, asleep: 0 },
    social: { base: 1.65, perOutgoing: 0.375 },      // 1.65/h (outgoing 0) .. 5.4/h (outgoing 10)
    comfort: { active: 12, mid: 15, lazy: 18, floor: 20 }, // active ≥ 7: 12, ≤ 3: 18, else 15; floor-sleep 20
    room: null,                                       // not decayed: set to the room score every tick
  };

  // Canonical interaction gain-rate constants (RESEARCH "Canonical interaction gain-rate table").
  const RATE = {
    bladderToilet: 75, comfToilet: 10, hygShower: 55, hygTub: 40, comfTub: 10,
    sinkK: 10, sinkMax: 40,
    sleepA: 3, sleepB: 5, bedComfK: 6, napE: 2, floorSleepEnergy: 11,
    sitBase: 10, sitK: 8, sitCapBase: 20, sitCapK: 10,
    funBase: 10, funK: 10, funCapBase: 30, funCapK: 10,
    hotComf: 12, hotFun: 15, hotHyg: 10, hotSocial: 30,
    talkSocial: 60, phoneSocial: 40,
  };
  function sitRate(c) { return RATE.sitBase + RATE.sitK * c; }
  function sitCap(c) { return Math.min(100, RATE.sitCapBase + RATE.sitCapK * c); }
  function funRate(f) { return RATE.funBase + RATE.funK * f; }
  function funCap(f) { return Math.min(100, RATE.funCapBase + RATE.funCapK * f); }
  function sleepRate(e) { return RATE.sleepA * e + RATE.sleepB; }

  // ----------------------------------------------------------------- skills
  const SKILLS = ['cooking', 'mechanical', 'charisma', 'body', 'logic', 'creativity'];
  const SKILL_LABELS = {
    cooking: 'Culinária', mechanical: 'Mecânica', charisma: 'Carisma',
    body: 'Corpo', logic: 'Lógica', creativity: 'Criatividade',
  };
  const SKILL_ICONS = {
    cooking: '🍳', mechanical: '🔧', charisma: '🗣️', body: '💪', logic: '🧠', creativity: '🎨',
  };
  // Personality trait that speeds learning (×1.5 if ≥ 7, ×1.25 if 5–6). '-playful' = serious.
  const SKILL_TRAIT = {
    cooking: 'neat', mechanical: null, charisma: 'outgoing', body: 'active',
    logic: '-playful', creativity: 'playful',
  };

  // ------------------------------------------------------------ personality
  const PERSONALITY = ['neat', 'outgoing', 'active', 'playful', 'nice'];
  const PERSONALITY_LABELS = {
    neat: 'Organizado', outgoing: 'Extrovertido', active: 'Ativo', playful: 'Brincalhão', nice: 'Gentil',
  };
  const PERSONALITY_OPPOSITES = {
    neat: 'Desleixado', outgoing: 'Tímido', active: 'Preguiçoso', playful: 'Sério', nice: 'Rabugento',
  };
  const PERSONALITY_POINTS = 25;

  // ------------------------------------------------------------ build mode
  // Floors: index 0 = grass (outdoor, free). `room` is an optional small bonus a room scorer may use.
  const FLOORS = [
    { key: 'grass', name: 'Grama', color: '#6aa84f', price: 0, room: 0 },
    { key: 'wood', name: 'Taco de madeira', color: '#b07d4f', price: 10, room: 1 },
    { key: 'tile', name: 'Cerâmica clara', color: '#e6e1d3', price: 10, room: 1 },
    { key: 'concrete', name: 'Cimento (calçada)', color: '#a7a39b', price: 5, room: 0 },
    { key: 'carpet', name: 'Carpete azul', color: '#4f6d8f', price: 12, room: 1 },
    { key: 'checker', name: 'Piso xadrez', color: '#d9d9d9', price: 15, room: 1 },
    { key: 'stone', name: 'Pedra portuguesa', color: '#cfc6b4', price: 18, room: 2 },
    { key: 'parquet', name: 'Parquê escuro', color: '#7a4b2a', price: 20, room: 2 },
    { key: 'marble', name: 'Mármore', color: '#f0ece6', price: 30, room: 3 },
    { key: 'terracotta', name: 'Lajota de barro', color: '#c56b43', price: 12, room: 1 },
  ];
  const WALLPAPERS = [
    { key: 'white', name: 'Tinta branca', color: '#f2efe8', price: 10, room: 0 },
    { key: 'cream', name: 'Tinta creme', color: '#efe2c4', price: 10, room: 0 },
    { key: 'sky', name: 'Azul-céu', color: '#a9cbe0', price: 10, room: 0 },
    { key: 'mint', name: 'Verde-menta', color: '#b9dcc2', price: 10, room: 0 },
    { key: 'terracotta', name: 'Terracota', color: '#c9805e', price: 10, room: 0 },
    { key: 'yellow', name: 'Amarelo-girassol', color: '#f1cf6b', price: 10, room: 0 },
    { key: 'stripes', name: 'Listras rosadas', color: '#e5b3b8', price: 15, room: 1 },
    { key: 'brick', name: 'Tijolinho aparente', color: '#a65a3f', price: 15, room: 1 },
    { key: 'wood', name: 'Lambri de madeira', color: '#9b6b43', price: 20, room: 1 },
    { key: 'tile', name: 'Azulejo de banheiro', color: '#dfeef0', price: 15, room: 1 },
    { key: 'navy', name: 'Azul-marinho', color: '#34506e', price: 10, room: 0 },
  ];
  const WALL_PRICES = { wall: 70, door: 150, window: 110 };   // per edge
  const WALL_TYPE_KEYS = { 1: 'wall', 2: 'door', 3: 'window' };
  const DEMOLISH_REFUND = 0.5;

  // ------------------------------------------------------------- categories
  const CATEGORIES = [
    { key: 'seating', label: 'Assentos', icon: '🛋️' },
    { key: 'beds', label: 'Camas', icon: '🛏️' },
    { key: 'surfaces', label: 'Mesas e balcões', icon: '🍽️' },
    { key: 'appliances', label: 'Eletrodomésticos', icon: '🍳' },
    { key: 'plumbing', label: 'Hidráulica', icon: '🚿' },
    { key: 'electronics', label: 'Eletrônicos', icon: '📺' },
    { key: 'lighting', label: 'Iluminação', icon: '💡' },
    { key: 'decor', label: 'Decoração', icon: '🪴' },
    { key: 'hobbies', label: 'Hobbies', icon: '🎨' },
  ];

  // Attenuation presets per tile of distance (RESEARCH "Distance attenuation").
  const ATTENUATION = { none: 0, low: 0.1, medium: 0.3, high: 0.6 };
  const ATTENUATION_VISITOR = { none: 0, low: 0.01, medium: 0.02, high: 0.03 };

  // Autonomy contribution curves (RESEARCH "Motive contribution curves", canonical set).
  const CURVES = {
    hunger: [[-100, -255], [-70, -135], [-40, -60], [0, 0], [40, 30], [100, 30]],
    energy: [[-100, -235], [-70, -115], [-40, -40], [0, 0], [100, 0]],
    bladder: [[-100, -300], [-70, -150], [-40, -60], [0, 0], [30, 15], [100, 15]],
    hygiene: [[-100, -168], [-70, -93], [-40, -40], [0, 0], [40, 20], [100, 20]],
    comfort: [[-100, -123], [-70, -78], [-40, -40], [0, 0], [60, 30], [100, 30]],
    social: [[-100, -145], [-70, -85], [-40, -40], [0, 0], [70, 52], [100, 52]],
    fun: [[-100, -145], [-70, -85], [-40, -40], [0, 0], [90, 72], [100, 72]],
    room: [[-100, -100], [0, 0], [80, 40], [100, 40]],
    mood: [[-100, -100], [100, 100]],
  };
  // Piecewise-linear evaluation, clamped to the first/last y outside the range.
  function curve(motive, m) {
    const pts = CURVES[motive];
    if (!pts) return 0;
    if (!(m > pts[0][0])) return pts[0][1];
    const last = pts[pts.length - 1];
    if (m >= last[0]) return last[1];
    for (let i = 1; i < pts.length; i++) {
      const b = pts[i];
      if (m <= b[0]) {
        const a = pts[i - 1];
        return a[1] + (b[1] - a[1]) * (m - a[0]) / (b[0] - a[0]);
      }
    }
    return last[1];
  }

  const AUTONOMY = {
    adDivisor: 1000,           // faithful marginal scoring
    weight: 1 / 9,
    minScore: 1e-7, minScoreSeated: 1e-6,
    topN: 4,
    idleMin: 1, idleMax: 2,    // sim-minutes after an action ends before free will looks again
    retryMin: 4, retryMax: 8,  // DESIGN: free will runs every 4–8 sim minutes while idle
    playerDelay: 5,            // minutes after a player command before free will acts
    lockFail: 60, lockDone: 30, lockDoneBypass: -50,
    // circadian multiplier on sleep/nap Energy ads by clock hour (design addition, ESTIMATE)
    circadian: [1, 1, 1, 1, 1, 1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.06,
      0.08, 0.35, 1, 1],
    // night 'sleep pressure': energy points subtracted from the Energy value used to score sleep (by hour)
    sleepPressure: [60, 60, 60, 60, 60, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 30, 50],
    // energy must be at or below this (by hour) for beds / sofas to advertise sleep at all (ad gate, ESTIMATE)
    sleepGate: [100, 100, 100, 100, 100, 100, -50, -50, -50, -50, -50, -50, -50, -50, -50, -50, -50, -50, -55, -60,
      -60, -25, 100, 100],
    napGate: [-100, -100, -100, -100, -100, -100, -30, -30, -30, -30, -30, -30, -30, -30, -30, -30, -30, -30, -45, -55,
      -100, -100, -100, -100],
  };

  // ------------------------------------------------------- economy & rules
  const MONEY = {
    startFamily: 6500, startEmpty: 20000,
    billEveryDays: 3, billHour: 9, billPercent: 0.015, billBase: 50, billGraceDays: 3, collectorExtra: 0.2,
    hospitalBill: 500,
    foodPerServing: 15, snackCost: 5, pizzaCost: 40, pizzaServings: 4, pizzaHunger: 40,
    repairPerHour: 50, maidPerHour: 10,
    floorPrice: 10, wallpaperPrice: 10,
    sellToday: 1.0, sellStart: 0.85, sellPerDay: 0.02, sellMin: 0.6,
  };
  // Meal hunger per serving (RESEARCH "Meal hunger value formula"):
  //   base 16 + fridge (9 cheap / 16 deluxe) + counter prep 16 + stove 32 + 1.5 × cooking
  const MEAL = {
    base: 16, counterPrep: 16, stove: 32, perSkill: 1.5,
    fridgeMod: { fridge_cheap: 9, fridge_lux: 16 },
    snackBase: 20, snackFridgeBonus: { fridge_cheap: 0, fridge_lux: 10 },
    fridgeMinutes: 2, prepMinutes: 10, cookMinutes: 15, cookSkillCut: 0.05,
    eatMinutes: 20, spoilHours: 8, plateSpoilHours: 6,
    burnChance: 0.15,          // × (1 − cooking/10); burnt meals give 50 %
  };
  const CRITICAL = {
    faintEnergy: -100, faintWake: 20, faintComfortRate: -20,
    accidentBladder: -100, accidentHygiene: 40, accidentFun: 15,
    hospitalHunger: -100, hospitalMinutes: 120,
    refuseMood: -60, skillMood: 0, thoughtBelow: -30,
    overrideHunger: -85, overrideBladder: -85, overrideEnergy: -90,
    wakeBladder: -80, wakeHunger: -80,
  };
  const SLEEP = { wakeHour: 6, wakeEnergy: 80, nightStart: 21, nightEnd: 6, playerRefuse: 90 };
  const WALK = { tilesPerMinute: 1.5, runFactor: 3, runAbove: 10 };
  const SKILL_GAIN = { levelK: 0.25, traitHigh: 1.5, traitMid: 1.25, partner: 1.25 };
  const PLANT = { waterHours: 72, thirstyBelow: 50, deadAfterHours: 72 };
  const DIRT = { max: 1000, visible: 500, autoClean: 800, autoCleanNeat: 500, playerClean: 200 }; // 0..1000 scale
  const REPAIR = { baseMinutes: 120, shockBase: 0.30, shockPerPoint: 0.04, immuneHours: 24, serviceMinutes: 30 };

  // Canonical per-object RoomImpact (RESEARCH "Canonical RoomImpact table").
  const ROOM_IMPACT = {
    perRating: 5, lampLit: 10, lampCap: 30, windowDay: 5, darkNight: -20,
    dirtyPlate: -5, spoiledPlate: -15, puddle: -15, broken: -10, dirtyPlumbing: -5,
    spoiledMeal: -15, deadPlant: -15, wiltingPlant: 0, unmadeBed: -5,
  };

  // ------------------------------------------------------- object catalog
  // Slot facing is in RADIANS at rot 0 using the character convention
  // (0 = looking +Z/south, PI = looking −Z/north, dir = (sin f, cos f)).
  // World-space facing = facing − rot × PI/2. Optional ox/oy = exact local offset
  // (tile units) applied by the engine for the final pose (tile dx,dy is used for routing).
  const FRONT = { dx: 0, dy: 1, facing: PI, on: false };
  function front(dx) { return { dx: dx || 0, dy: 1, facing: PI, on: false }; }
  // wall-mounted items (paintings, mirror): the wall is on the top edge of the item's own tile, so the
  // natural spot is that tile itself (right in front of the wall); one tile further is a fallback for
  // when furniture stands under the item. (Integration fix: front() alone left characters 1.5 tiles away.)
  function wallSlots() { return [{ dx: 0, dy: 0, facing: PI, on: false }, { dx: 0, dy: 1, facing: PI, on: false, penalty: 1.5 }]; }
  function onSlot(dx, dy, facing, ox, oy) {
    const s = { dx, dy, facing: facing || 0, on: true };
    if (ox) s.ox = ox;   // exact pose offset (may be negative)
    if (oy) s.oy = oy;
    return s;
  }

  // Interaction builders ------------------------------------------------------
  function I(o) {
    // defaults for an InteractionDef
    return Object.assign({
      key: '', label: '', icon: '•', anim: 'use', rates: {}, ads: {}, caps: null, rateVary: null,
      duration: 30, minDuration: 0, maxDuration: null, until: null, skill: null, skillRate: 0,
      cost: 0, fun: false, auto: true, visitors: false, slot: 'any', effect: null, requires: null,
      atten: 'medium', seatOk: false, seated: false,
    }, o);
  }
  function sitInter(c) {
    return I({
      key: 'sit', label: 'Sentar', icon: '🪑', anim: 'sit', seated: true,
      rates: { comfort: sitRate(c) }, caps: { comfort: sitCap(c) },
      ads: { comfort: { min: 10 + 3 * c, delta: 0 } },
      duration: null, minDuration: 10, maxDuration: 90, until: ['comfort'], visitors: true, atten: 'medium',
    });
  }
  function napInter(c, e) {
    return I({
      key: 'nap', label: 'Cochilar', icon: '😴', anim: 'sleep', effect: 'nap', seated: true,
      rates: { energy: RATE.napE * e, comfort: Math.round(sitRate(c) * 0.5) },
      caps: { energy: 60, comfort: sitCap(c) },
      ads: { energy: { min: 5 * e, delta: 0 } },
      duration: null, minDuration: 30, maxDuration: 120, until: ['energy'], atten: 'medium',
    });
  }
  function sleepInter(c, e, ad) {
    return I({
      key: 'sleep', label: 'Dormir', icon: '💤', anim: 'sleep', effect: 'sleep', seated: true,
      rates: { energy: sleepRate(e), comfort: RATE.bedComfK * c }, caps: { energy: 100, comfort: 100 },
      ads: { energy: { min: ad, delta: 0 } },   // energy only: a comfort ad would make characters 'sleep' just to lie down
      duration: null, minDuration: 60, until: ['energy'], atten: 'low',
    });
  }
  function relaxInter(c, e) {
    return I({
      key: 'relax', label: 'Deitar e relaxar', icon: '🛌', anim: 'sleep', seated: true,
      rates: { comfort: RATE.bedComfK * c + 10, energy: e }, caps: { comfort: 100, energy: 100 },
      ads: { comfort: { min: 12, delta: 0 } },
      duration: null, minDuration: 15, maxDuration: 45, until: ['comfort'], atten: 'medium',
    });
  }
  function makeBedInter() {
    return I({
      key: 'make_bed', label: 'Arrumar a cama', icon: '🛏️', anim: 'clean', effect: 'make_bed', requires: 'unmade',
      approach: 'adjacent', duration: 3, ads: { room: { min: 2, delta: 15, vary: 'neat' } }, atten: 'medium',
    });
  }
  function cleanInter() {
    return I({
      key: 'clean', label: 'Limpar', icon: '🧽', anim: 'clean', effect: 'clean_object', requires: 'dirty',
      approach: 'adjacent', duration: 15, ads: { room: { min: 0, delta: 20, vary: 'neat' } }, atten: 'medium',
    });
  }
  function repairInter(label) {
    return I({
      key: 'repair', label: label || 'Consertar', icon: '🔧', anim: 'use', effect: 'repair', requires: 'broken',
      approach: 'adjacent', duration: null, minDuration: 0, skill: 'mechanical', skillRate: 0.4,
      ads: { mood: { min: 8, delta: 20, vary: 'mechanical' } }, atten: 'low',
    });
  }
  function funInter(o) {
    // o: { key, label, icon, anim, f, vary, adMin, adDelta, extra, seatOk, visitors, maxDuration }
    const rates = Object.assign({ fun: funRate(o.f) }, o.extraRates || {});
    const caps = Object.assign({ fun: funCap(o.f) }, o.extraCaps || {});
    return I({
      key: o.key, label: o.label, icon: o.icon, anim: o.anim, fun: true, seatOk: !!o.seatOk, seated: !!o.seated,
      rates, caps, rateVary: { fun: o.vary || null },
      ads: Object.assign({ fun: { min: o.adMin, delta: o.adDelta, vary: o.vary || null } }, o.extraAds || {}),
      duration: null, minDuration: o.minDuration || 15, maxDuration: o.maxDuration || 120, until: ['fun'],
      visitors: o.visitors !== false, atten: o.atten || 'medium', skill: o.skill || null, skillRate: o.skillRate || 0,
      effect: o.effect || null, slot: o.slot != null ? o.slot : 'any', auto: o.auto !== false,
    });
  }
  function admireInter(roomRating) {
    return I({
      key: 'admire', label: 'Admirar', icon: '🖼️', anim: 'idle', fun: true,
      rates: { fun: 20 }, caps: { fun: Math.min(70, 30 + 5 * roomRating) },
      ads: { fun: { min: 1 + roomRating, delta: 4, vary: '-playful' } },
      duration: 5, visitors: true, atten: 'high',
    });
  }
  function disposeInter(requires, label) {
    return I({
      key: 'dispose', label: label || 'Jogar fora', icon: '🗑️', anim: 'clean', effect: 'dispose',
      requires: requires || null, duration: 2, ads: { room: { min: 5, delta: 20, vary: 'neat' } }, atten: 'medium',
    });
  }

  // Object definitions --------------------------------------------------------
  function obj(o) {
    return Object.assign({
      type: '', name: '', cat: 'decor', price: 0, desc: '', w: 1, h: 1, model: '', room: 0, light: false,
      wall: false, surface: false, slots: [], interactions: [], ratings: {}, buyable: true, noBlock: false,
      surfaceHeight: 0, breaks: 0, dirties: 0, capacity: 1, approach: null, skills: [], dining: false,
      seat: false, breakLabel: null,
    }, o, { model: o.model || o.type });
  }

  const CATALOG_LIST = [
    // ------------------------------------------------------------- seating
    obj({
      type: 'chair_wood', name: 'Cadeira de madeira', cat: 'seating', price: 80,
      desc: 'Simples e resistente. Perfeita para comer à mesa.', seat: true, dining: true,
      slots: [onSlot(0, 0, 0)], ratings: { comfort: 2 }, interactions: [sitInter(2)],
    }),
    obj({
      type: 'chair_dining', name: 'Cadeira estofada', cat: 'seating', price: 350, room: 1,
      desc: 'Assento acolchoado para jantares longos e conversas boas.', seat: true, dining: true,
      slots: [onSlot(0, 0, 0)], ratings: { comfort: 5, room: 1 }, interactions: [sitInter(5)],
    }),
    obj({
      type: 'armchair', name: 'Poltrona reclinável', cat: 'seating', price: 450,
      desc: 'Reclina até quase deitar. Ótima para um cochilo depois do almoço.', seat: true,
      slots: [onSlot(0, 0, 0)], ratings: { comfort: 6, energy: 3 }, interactions: [sitInter(6), napInter(6, 3)],
    }),
    obj({
      type: 'sofa_cheap', name: 'Sofá de tecido', cat: 'seating', price: 300, w: 2, h: 1, capacity: 2,
      desc: 'Dois lugares, almofadas meio cansadas, muito amor.', seat: true,
      slots: [onSlot(0, 0, 0), onSlot(1, 0, 0)], ratings: { comfort: 3, energy: 5 },
      interactions: [sitInter(3), napInter(3, 5)],
    }),
    obj({
      type: 'sofa_lux', name: 'Sofá de couro', cat: 'seating', price: 1200, w: 2, h: 1, capacity: 2, room: 3,
      desc: 'Couro macio e costura impecável. A sala agradece.', seat: true,
      slots: [onSlot(0, 0, 0), onSlot(1, 0, 0)], ratings: { comfort: 8, energy: 5, room: 3 },
      interactions: [sitInter(8), napInter(8, 5)],
    }),
    // ---------------------------------------------------------------- beds
    obj({
      type: 'bed_single', name: 'Cama de solteiro', cat: 'beds', price: 300, w: 1, h: 2,
      desc: 'Colchão firme e lençol estampado. Cabe em qualquer quarto.',
      slots: [onSlot(0, 1, 0, 0, -0.5)], ratings: { comfort: 6, energy: 7 },
      interactions: [sleepInter(6, 7, 80), relaxInter(6, 7), makeBedInter()],
    }),
    obj({
      type: 'bed_double', name: 'Cama de casal simples', cat: 'beds', price: 450, w: 2, h: 2, capacity: 2,
      desc: 'Espaço para dois e um edredom quentinho.',
      slots: [onSlot(0, 1, 0, 0, -0.5), onSlot(1, 1, 0, 0, -0.5)], ratings: { comfort: 7, energy: 8 },
      interactions: [sleepInter(7, 8, 84), relaxInter(7, 8), makeBedInter()],
    }),
    obj({
      type: 'bed_lux', name: 'Cama de casal king', cat: 'beds', price: 3000, w: 2, h: 2, capacity: 2, room: 3,
      desc: 'Colchão de molas ensacadas e cabeceira estofada. Sono de rei.',
      slots: [onSlot(0, 1, 0, 0, -0.5), onSlot(1, 1, 0, 0, -0.5)], ratings: { comfort: 9, energy: 10, room: 3 },
      interactions: [sleepInter(9, 10, 90), relaxInter(9, 10), makeBedInter()],
    }),
    // ------------------------------------------------------------ surfaces
    obj({
      type: 'counter', name: 'Balcão de cozinha', cat: 'surfaces', price: 150, surface: true, surfaceHeight: 0.9,
      desc: 'Tampo de granito para preparar refeições. Também serve pratos.', slots: [front()],
    }),
    obj({
      type: 'table_dining', name: 'Mesa de jantar', cat: 'surfaces', price: 200, w: 2, h: 1, surface: true,
      surfaceHeight: 0.78, desc: 'Mesa para quatro. Coloque cadeiras viradas para ela.',
    }),
    obj({
      type: 'table_small', name: 'Mesa quadrada', cat: 'surfaces', price: 95, surface: true, surfaceHeight: 0.78,
      desc: 'Mesinha dobrável para refeições rápidas.',
    }),
    obj({
      type: 'end_table', name: 'Mesinha de canto', cat: 'surfaces', price: 60, surface: true, surfaceHeight: 0.6,
      desc: 'Apoio para abajur, controle remoto e copo d’água.',
    }),
    // ---------------------------------------------------------- appliances
    obj({
      type: 'fridge_cheap', name: 'Geladeira simples', cat: 'appliances', price: 600,
      desc: 'Gela o suficiente. O lanche da tarde mora aqui.', slots: [front()], ratings: { hunger: 6 },
      interactions: [
        I({ key: 'snack', label: 'Fazer um lanche', icon: '🍎', anim: 'eat', effect: 'snack', duration: 8,
          cost: MONEY.snackCost, ads: { hunger: { min: 20, delta: 0 } }, atten: 'low' }),
        I({ key: 'cook', label: 'Preparar refeição', icon: '🍳', anim: 'cook', effect: 'cook_meal', duration: null,
          ads: { hunger: { min: 30, delta: 30, vary: 'cooking' } }, requires: 'canCook', atten: 'low',
          skill: 'cooking', skillRate: 0.25 }),
      ],
    }),
    obj({
      type: 'fridge_lux', name: 'Geladeira duplex', cat: 'appliances', price: 2500, room: 1,
      desc: 'Duas portas, gaveta de frios e ingredientes fresquinhos: comida bem mais nutritiva.',
      slots: [front()], ratings: { hunger: 8, room: 1 },
      interactions: [
        I({ key: 'snack', label: 'Fazer um lanche', icon: '🍎', anim: 'eat', effect: 'snack', duration: 8,
          cost: MONEY.snackCost, ads: { hunger: { min: 30, delta: 0 } }, atten: 'low' }),
        I({ key: 'cook', label: 'Preparar refeição', icon: '🍳', anim: 'cook', effect: 'cook_meal', duration: null,
          ads: { hunger: { min: 35, delta: 30, vary: 'cooking' } }, requires: 'canCook', atten: 'low',
          skill: 'cooking', skillRate: 0.25 }),
      ],
    }),
    obj({
      type: 'stove', name: 'Fogão a gás', cat: 'appliances', price: 400, dirties: 80,
      desc: 'Quatro bocas e forno. Cozinheiros inexperientes às vezes queimam a comida.',
      slots: [front()], ratings: { hunger: 5 }, skills: ['cooking'],
      interactions: [
        I({ key: 'cook', label: 'Preparar refeição', icon: '🍳', anim: 'cook', effect: 'cook_meal', duration: null,
          ads: {}, auto: false, requires: 'canCook', skill: 'cooking', skillRate: 0.25 }),
        cleanInter(),
      ],
    }),
    obj({
      type: 'dishwasher', name: 'Lava-louças', cat: 'appliances', price: 550, breaks: 0.02,
      desc: 'Pratos sujos somem num instante.', slots: [front()],
      interactions: [repairInter()],
    }),
    obj({
      type: 'trash_can', name: 'Lixeira', cat: 'appliances', price: 30,
      desc: 'Para restos de comida e jornais velhos.', slots: [front()],
    }),
    // ------------------------------------------------------------ plumbing
    obj({
      type: 'toilet', name: 'Vaso sanitário', cat: 'plumbing', price: 300, dirties: 100, breaks: 0.01,
      breakLabel: 'Desentupir', desc: 'Faz o que promete. Às vezes entope.',
      slots: [onSlot(0, 0, 0)], ratings: { bladder: 8 },
      interactions: [
        I({ key: 'use', label: 'Usar o vaso', icon: '🚽', anim: 'toilet', effect: 'toilet', seated: true,
          rates: { bladder: RATE.bladderToilet * 8 }, caps: { bladder: 100 }, ads: { bladder: { min: 70, delta: 0 } },
          duration: null, minDuration: 3, maxDuration: 30, until: ['bladder'], visitors: true, atten: 'low' }),
        cleanInter(), repairInter('Desentupir'),
      ],
    }),
    obj({
      type: 'toilet_lux', name: 'Vaso sanitário conforto', cat: 'plumbing', price: 1200, dirties: 60, breaks: 0.003,
      breakLabel: 'Desentupir', room: 1, desc: 'Assento aquecido e descarga automática. Quase um trono.',
      slots: [onSlot(0, 0, 0)], ratings: { bladder: 8, comfort: 4, room: 1 },
      interactions: [
        I({ key: 'use', label: 'Usar o vaso', icon: '🚽', anim: 'toilet', effect: 'toilet', seated: true,
          rates: { bladder: RATE.bladderToilet * 8, comfort: RATE.comfToilet * 4 }, caps: { bladder: 100, comfort: 60 },
          ads: { bladder: { min: 75, delta: 0 }, comfort: { min: 10, delta: 0 } },
          duration: null, minDuration: 3, maxDuration: 30, until: ['bladder'], visitors: true, atten: 'low' }),
        cleanInter(), repairInter('Desentupir'),
      ],
    }),
    obj({
      type: 'shower', name: 'Box com chuveiro', cat: 'plumbing', price: 650, dirties: 60, breaks: 0.02,
      desc: 'Água quente e pressão boa. Banho rápido e eficiente.',
      slots: [onSlot(0, 0, 0)], ratings: { hygiene: 6 },
      interactions: [
        I({ key: 'shower', label: 'Tomar banho', icon: '🚿', anim: 'shower', rates: { hygiene: RATE.hygShower * 6 },
          caps: { hygiene: 100 }, ads: { hygiene: { min: 40, delta: 30, vary: 'neat' } },
          duration: null, minDuration: 5, maxDuration: 60, until: ['hygiene'], atten: 'low' }),
        cleanInter(), repairInter(),
      ],
    }),
    obj({
      type: 'bathtub', name: 'Banheira', cat: 'plumbing', price: 800, w: 2, h: 1, dirties: 60, breaks: 0.015,
      desc: 'Banho de imersão: mais lento que o chuveiro, mas relaxa.',
      slots: [onSlot(0, 0, 0, 0.5, 0)], ratings: { hygiene: 6, comfort: 3 },
      interactions: [
        I({ key: 'bath', label: 'Banho de banheira', icon: '🛁', anim: 'bath', seated: true,
          rates: { hygiene: RATE.hygTub * 6, comfort: RATE.comfTub * 3 }, caps: { hygiene: 100, comfort: 100 },
          ads: { hygiene: { min: 40, delta: 0 }, comfort: { min: 20, delta: 0 } },
          duration: null, minDuration: 10, maxDuration: 90, until: ['hygiene'], atten: 'low' }),
        cleanInter(), repairInter(),
      ],
    }),
    obj({
      type: 'sink', name: 'Pia de banheiro', cat: 'plumbing', price: 200, dirties: 20, breaks: 0.01,
      desc: 'Lave as mãos! Os organizados fazem isso sempre.', slots: [front()], ratings: { hygiene: 2 },
      interactions: [
        I({ key: 'wash', label: 'Lavar as mãos', icon: '🧼', anim: 'wash', effect: 'wash_hands',
          rates: { hygiene: 600 }, caps: { hygiene: 100 }, ads: { hygiene: { min: 10, delta: 0 } },
          duration: 2, visitors: true, atten: 'medium' }),
        cleanInter(), repairInter(),
      ],
    }),
    obj({
      type: 'hot_tub', name: 'Ofurô', cat: 'plumbing', price: 6000, w: 2, h: 2, capacity: 4, room: 3, dirties: 40,
      breaks: 0.01, desc: 'Água quentinha e borbulhante para até quatro pessoas.',
      slots: [onSlot(0, 0, PI / 4), onSlot(1, 0, -PI / 4), onSlot(0, 1, 3 * PI / 4), onSlot(1, 1, -3 * PI / 4)],
      ratings: { comfort: 8, fun: 6, hygiene: 2, social: 4, room: 3 },
      interactions: [
        I({ key: 'soak', label: 'Relaxar no ofurô', icon: '♨️', anim: 'bath', effect: 'hot_tub', fun: true, seated: true,
          rates: { comfort: RATE.hotComf * 8, fun: RATE.hotFun * 6, hygiene: RATE.hotHyg * 2 },
          caps: { comfort: 100, fun: 100, hygiene: 80 }, rateVary: { fun: 'playful' },
          ads: { comfort: { min: 30, delta: 0 }, fun: { min: 15, delta: 20, vary: 'playful' },
            social: { min: 5, delta: 15, vary: 'outgoing' }, hygiene: { min: 5, delta: 0 } },
          duration: null, minDuration: 20, maxDuration: 120, until: ['comfort', 'fun'], visitors: true, atten: 'medium' }),
        cleanInter(), repairInter(),
      ],
    }),
    // --------------------------------------------------------- electronics
    obj({
      type: 'tv_cheap', name: 'TV de tubo', cat: 'electronics', price: 85, breaks: 0.015,
      desc: 'Imagem chuviscada, desenhos animados garantidos. Assista sentado num sofá por perto.',
      slots: [{ dx: 0, dy: 2, facing: PI, on: false }, { dx: -1, dy: 2, facing: PI, on: false },
        { dx: 1, dy: 2, facing: PI, on: false }],
      capacity: 6, ratings: { fun: 2 },
      interactions: [
        funInter({ key: 'watch', label: 'Assistir TV', icon: '📺', anim: 'tv', f: 2, vary: 'playful', adMin: 10,
          adDelta: 20, seatOk: true, maxDuration: 180 }),
        repairInter(),
      ],
    }),
    obj({
      type: 'tv_lux', name: 'TV de tela plana', cat: 'electronics', price: 3500, w: 2, h: 1, breaks: 0.01, room: 3,
      desc: 'Tela enorme, som envolvente. Diversão de primeira e a sala fica linda.',
      slots: [{ dx: 0, dy: 2, facing: PI, on: false }, { dx: 1, dy: 2, facing: PI, on: false },
        { dx: -1, dy: 2, facing: PI, on: false }, { dx: 2, dy: 2, facing: PI, on: false }],
      capacity: 8, ratings: { fun: 7, room: 3 },
      interactions: [
        funInter({ key: 'watch', label: 'Assistir TV', icon: '📺', anim: 'tv', f: 7, vary: 'playful', adMin: 20,
          adDelta: 30, seatOk: true, maxDuration: 180 }),
        repairInter(),
      ],
    }),
    obj({
      type: 'stereo', name: 'Aparelho de som', cat: 'electronics', price: 450, breaks: 0.02, capacity: 4,
      desc: 'Ligue o som e chame todo mundo para dançar.',
      slots: [front(0), { dx: -1, dy: 1, facing: PI * 0.75, on: false }, { dx: 1, dy: 1, facing: -PI * 0.75, on: false },
        { dx: 0, dy: 2, facing: PI, on: false }],
      ratings: { fun: 3, social: 2 },
      interactions: [
        funInter({ key: 'dance', label: 'Dançar', icon: '💃', anim: 'dance', f: 3, vary: 'active', adMin: 10,
          adDelta: 20, effect: 'dance', maxDuration: 90,
          extraRates: { energy: -6 }, extraAds: { social: { min: 0, delta: 10, vary: 'outgoing' } } }),
        funInter({ key: 'listen', label: 'Ouvir música', icon: '🎶', anim: 'idle', f: 2, vary: 'playful', adMin: 8,
          adDelta: 12, seatOk: true, maxDuration: 90 }),
        repairInter(),
      ],
    }),
    obj({
      type: 'computer', name: 'Computador com mesa', cat: 'electronics', price: 1800, w: 2, h: 1, breaks: 0.02,
      desc: 'Jogos, internet e classificados de emprego. A cadeira vem junto.',
      slots: [front(0)], ratings: { fun: 5 },
      interactions: [
        funInter({ key: 'play', label: 'Jogar no computador', icon: '🎮', anim: 'computer', f: 5, vary: 'playful',
          adMin: 15, adDelta: 25, seated: true, extraRates: { comfort: sitRate(2) }, extraCaps: { comfort: sitCap(2) },
          maxDuration: 180, minDuration: 20 }),
        I({ key: 'surf', label: 'Navegar na internet', icon: '🌐', anim: 'computer', seated: true, fun: true,
          rates: { fun: 30, social: 20, comfort: sitRate(2) }, caps: { fun: 60, social: 60, comfort: sitCap(2) },
          ads: { fun: { min: 5, delta: 10, vary: 'playful' }, social: { min: 5, delta: 15, vary: 'outgoing' } },
          duration: null, minDuration: 15, maxDuration: 90, until: ['fun', 'social'], visitors: false }),
        I({ key: 'find_job', label: 'Procurar emprego', icon: '💼', anim: 'computer', effect: 'find_job', seated: true,
          duration: 15, auto: false }),
        repairInter(),
      ],
    }),
    obj({
      type: 'phone', name: 'Telefone', cat: 'electronics', price: 50,
      desc: 'Ligue para os vizinhos, convide amigos, peça pizza ou chame um técnico.',
      slots: [front()], ratings: { social: 2 },
      interactions: [
        I({ key: 'call_friend', label: 'Ligar para um vizinho', icon: '☎️', anim: 'phone', effect: 'call_friend',
          rates: { social: RATE.phoneSocial }, caps: { social: 100 }, duration: 20,
          ads: { social: { min: 0, delta: 20, vary: 'outgoing' } }, atten: 'medium' }),
        I({ key: 'invite', label: 'Convidar alguém para visitar', icon: '🏠', anim: 'phone', effect: 'invite',
          duration: 8, auto: false }),
        I({ key: 'order_pizza', label: 'Pedir pizza (M$ 40)', icon: '🍕', anim: 'phone', effect: 'order_pizza',
          duration: 3, auto: false, cost: MONEY.pizzaCost }),
        I({ key: 'call_repair', label: 'Chamar técnico (M$ 50/h)', icon: '🧰', anim: 'phone', effect: 'call_repair',
          duration: 3, auto: false, requires: 'anyBroken' }),
        I({ key: 'call_maid', label: 'Chamar faxineira (M$ 10/h)', icon: '🧹', anim: 'phone', effect: 'call_maid',
          duration: 3, auto: false }),
        I({ key: 'quit_job', label: 'Pedir demissão', icon: '📄', anim: 'phone', effect: 'quit_job',
          duration: 3, auto: false, requires: 'employed' }),
      ],
    }),
    obj({
      type: 'arcade', name: 'Fliperama', cat: 'electronics', price: 1500, breaks: 0.02,
      desc: 'Luzes piscando, recordes para bater. Os brincalhões adoram.', slots: [front()], ratings: { fun: 5 },
      interactions: [
        funInter({ key: 'play', label: 'Jogar fliperama', icon: '🕹️', anim: 'use', f: 5, vary: 'playful', adMin: 20,
          adDelta: 20, maxDuration: 120 }),
        repairInter(),
      ],
    }),
    // ------------------------------------------------------------ lighting
    obj({
      type: 'lamp_floor', name: 'Luminária de chão', cat: 'lighting', price: 50, light: true,
      desc: 'Luz quente para as noites. Ambientes iluminados ficam mais agradáveis.', slots: [front()],
      interactions: [I({ key: 'toggle', label: 'Desligar a luz', icon: '💡', anim: 'use', effect: 'toggle_light',
        duration: 0.5, auto: false })],
    }),
    obj({
      type: 'lamp_fancy', name: 'Luminária de design', cat: 'lighting', price: 300, light: true, room: 2,
      desc: 'Peça assinada que ilumina e decora.', slots: [front()], ratings: { room: 2 },
      interactions: [I({ key: 'toggle', label: 'Desligar a luz', icon: '💡', anim: 'use', effect: 'toggle_light',
        duration: 0.5, auto: false })],
    }),
    // --------------------------------------------------------------- decor
    obj({
      type: 'plant_small', name: 'Vaso de planta', cat: 'decor', price: 40, room: 1, approach: 'adjacent', capacity: 1,
      desc: 'Um verdinho para alegrar o canto. Precisa de água a cada poucos dias.', ratings: { room: 1 },
      interactions: [
        I({ key: 'water', label: 'Regar', icon: '💧', anim: 'use', effect: 'water', requires: 'thirsty', duration: 5,
          ads: { room: { min: 5, delta: 15, vary: 'neat' } }, atten: 'medium' }),
        disposeInter('dead', 'Jogar fora a planta seca'),
      ],
    }),
    obj({
      type: 'plant_big', name: 'Palmeira de vaso', cat: 'decor', price: 150, room: 2, approach: 'adjacent', capacity: 1,
      desc: 'Clima tropical dentro de casa. Regue com frequência.', ratings: { room: 2 },
      interactions: [
        I({ key: 'water', label: 'Regar', icon: '💧', anim: 'use', effect: 'water', requires: 'thirsty', duration: 5,
          ads: { room: { min: 5, delta: 15, vary: 'neat' } }, atten: 'medium' }),
        disposeInter('dead', 'Jogar fora a planta seca'),
      ],
    }),
    obj({
      type: 'painting_cheap', name: 'Quadro de paisagem', cat: 'decor', price: 100, room: 1, wall: true, noBlock: true,
      desc: 'Montanhas, um rio e um pôr do sol. Pendure numa parede.', slots: wallSlots(), ratings: { room: 1 },
      interactions: [admireInter(1)],
    }),
    obj({
      type: 'painting_lux', name: 'Quadro a óleo', cat: 'decor', price: 1500, room: 5, wall: true, noBlock: true,
      desc: 'Pinceladas de mestre. Valoriza qualquer ambiente.', slots: wallSlots(), ratings: { room: 5 },
      interactions: [admireInter(5)],
    }),
    obj({
      type: 'mirror', name: 'Espelho de parede', cat: 'decor', price: 150, room: 1, wall: true, noBlock: true,
      desc: 'Treine discursos para ganhar carisma. Pendure numa parede.', slots: wallSlots(), ratings: { room: 1 },
      skills: ['charisma'],
      interactions: [
        I({ key: 'speech', label: 'Praticar discurso', icon: '🗣️', anim: 'talk', skill: 'charisma', skillRate: 0.7,
          rates: { fun: -6 }, duration: null, minDuration: 30, maxDuration: 180, auto: false }),
        I({ key: 'look', label: 'Olhar-se no espelho', icon: '🪞', anim: 'idle', effect: 'check_self', duration: 2,
          auto: false }),
      ],
    }),
    obj({
      type: 'sculpture', name: 'Escultura abstrata', cat: 'decor', price: 1200, room: 4, approach: 'adjacent',
      capacity: 2, desc: 'Ninguém sabe o que é, mas todos acham chique.', ratings: { room: 4 },
      interactions: [admireInter(4)],
    }),
    obj({
      type: 'rug', name: 'Tapete', cat: 'decor', price: 120, w: 2, h: 2, room: 1, noBlock: true,
      desc: 'Tapete felpudo 2×2. Pode ficar embaixo dos móveis.', ratings: { room: 1 },
    }),
    // ------------------------------------------------------------- hobbies
    obj({
      type: 'bookshelf', name: 'Estante de livros', cat: 'hobbies', price: 250, slots: [front()],
      desc: 'Livros de culinária, mecânica e romances. Leia sentado no sofá.', ratings: { fun: 1 },
      skills: ['cooking', 'mechanical'],
      interactions: [
        funInter({ key: 'read', label: 'Ler um livro', icon: '📖', anim: 'read', f: 1, vary: '-playful', adMin: 10,
          adDelta: 15, seatOk: true, maxDuration: 120 }),
        I({ key: 'study_cooking', label: 'Estudar culinária', icon: '📚', anim: 'read', skill: 'cooking', skillRate: 0.7,
          rates: { fun: -6 }, duration: null, minDuration: 30, maxDuration: 180, auto: false, seatOk: true }),
        I({ key: 'study_mechanical', label: 'Estudar mecânica', icon: '🔩', anim: 'read', skill: 'mechanical',
          skillRate: 0.7, rates: { fun: -6 }, duration: null, minDuration: 30, maxDuration: 180, auto: false,
          seatOk: true }),
      ],
    }),
    obj({
      type: 'easel', name: 'Cavalete de pintura', cat: 'hobbies', price: 500, slots: [front()],
      desc: 'Pinte telas e venda as melhores. Desenvolve criatividade.', ratings: { fun: 2 }, skills: ['creativity'],
      interactions: [
        funInter({ key: 'paint', label: 'Pintar um quadro', icon: '🎨', anim: 'paint', f: 2, vary: 'playful', adMin: 5,
          adDelta: 15, effect: 'paint', skill: 'creativity', skillRate: 0.6, maxDuration: 180, minDuration: 30,
          visitors: false }),
      ],
    }),
    obj({
      type: 'chess', name: 'Mesa de xadrez', cat: 'hobbies', price: 500, capacity: 2,
      desc: 'Desafie alguém (ou a si mesmo). Desenvolve lógica.', ratings: { fun: 3 }, skills: ['logic'],
      slots: [{ dx: 0, dy: 1, facing: PI, on: false }, { dx: 0, dy: -1, facing: 0, on: false }],
      interactions: [
        funInter({ key: 'play', label: 'Jogar xadrez', icon: '♟️', anim: 'chess', f: 2, vary: '-playful', adMin: 10,
          adDelta: 20, effect: 'chess', skill: 'logic', skillRate: 0.5, seated: true, maxDuration: 120,
          minDuration: 20, extraRates: { comfort: sitRate(1) }, extraCaps: { comfort: sitCap(1) } }),
      ],
    }),
    obj({
      type: 'exercise', name: 'Aparelho de musculação', cat: 'hobbies', price: 700, w: 1, h: 2,
      desc: 'Malhe para ganhar corpo. Cansa e dá suor.', ratings: { fun: 1 }, skills: ['body'],
      slots: [onSlot(0, 1, 0, 0, -0.5)],
      interactions: [
        I({ key: 'workout', label: 'Malhar', icon: '🏋️', anim: 'exercise', skill: 'body', skillRate: 0.8, fun: true,
          rates: { fun: 15, hygiene: -20, energy: -15 }, rateVary: { fun: 'active' }, caps: { fun: 80 },
          ads: { fun: { min: 0, delta: 20, vary: 'active' } }, duration: null, minDuration: 20, maxDuration: 120,
          until: ['fun'], atten: 'medium' }),
      ],
    }),
    obj({
      type: 'piano', name: 'Piano', cat: 'hobbies', price: 3500, w: 2, h: 1, room: 3,
      desc: 'Um clássico de parede. Desenvolve criatividade e encanta visitas.',
      slots: [{ dx: 0, dy: 1, facing: PI, on: false, ox: 0.5 }], ratings: { fun: 4, room: 3 }, skills: ['creativity'],
      interactions: [
        funInter({ key: 'play', label: 'Tocar piano', icon: '🎹', anim: 'piano', f: 4, vary: 'playful', adMin: 10,
          adDelta: 25, skill: 'creativity', skillRate: 0.5, seated: true, maxDuration: 120, minDuration: 20 }),
      ],
    }),
    // -------------------------------------------------------------- system
    obj({
      type: 'mailbox', name: 'Caixa de correio', cat: 'system', price: 0, buyable: false, slots: [front()],
      desc: 'Contas chegam aqui a cada 3 dias. O jornal é entregue ao lado.',
      interactions: [
        I({ key: 'pay_bills', label: 'Pagar contas', icon: '💸', anim: 'use', effect: 'pay_bills', requires: 'hasBills',
          duration: 3, ads: { mood: { min: 0, delta: 25, vary: 'neat' } }, atten: 'low' }),
      ],
    }),
    obj({
      type: 'meal', name: 'Refeição servida', cat: 'system', price: 0, buyable: false, noBlock: true,
      approach: 'adjacent', capacity: 4, desc: 'Sirva-se enquanto está quente!',
      interactions: [
        I({ key: 'eat', label: 'Pegar um prato e comer', icon: '🍽️', anim: 'eat', effect: 'eat_meal', requires: 'edible',
          duration: null, ads: { hunger: { min: 70, delta: 0 } }, visitors: true, atten: 'low' }),
        disposeInter(null, 'Jogar fora'),
      ],
    }),
    obj({
      type: 'dirty_plate', name: 'Prato sujo', cat: 'system', price: 0, buyable: false, noBlock: true, room: -1,
      approach: 'adjacent', desc: 'Alguém precisa lavar isso.',
      interactions: [
        I({ key: 'clean', label: 'Recolher prato', icon: '🧽', anim: 'clean', effect: 'clean_plate', duration: null,
          ads: { room: { min: 5, delta: 25, vary: 'neat' } }, atten: 'medium' }),
      ],
    }),
    obj({
      type: 'puddle', name: 'Poça', cat: 'system', price: 0, buyable: false, noBlock: true, room: -3,
      approach: 'adjacent', desc: 'Escorregadia e nojenta. Passe o pano!',
      interactions: [
        I({ key: 'mop', label: 'Limpar a poça', icon: '🧹', anim: 'clean', effect: 'mop', duration: 10,
          ads: { room: { min: 5, delta: 25, vary: 'neat' } }, atten: 'medium' }),
      ],
    }),
    obj({
      type: 'newspaper', name: 'Jornal', cat: 'system', price: 0, buyable: false, noBlock: true,
      approach: 'adjacent', desc: 'Notícias do bairro e uma vaga de emprego por dia.',
      interactions: [
        I({ key: 'read', label: 'Ler jornal', icon: '📰', anim: 'read', effect: 'read_paper', duration: 15,
          rates: { fun: 10 }, caps: { fun: 60 }, ads: { fun: { min: 3, delta: 4, vary: 'neat' } }, atten: 'medium' }),
        disposeInter(null, 'Jogar fora'),
      ],
    }),
    obj({
      type: 'carpool', name: 'Carona do trabalho', cat: 'system', price: 0, buyable: false, noBlock: true, w: 2, h: 1,
      capacity: 2, desc: 'Sai no horário do expediente. Não se atrase!',
      slots: [front(0), front(1)],
      interactions: [
        I({ key: 'go', label: 'Ir para o trabalho', icon: '🚗', anim: 'wave', effect: 'go_work', requires: 'myCarpool',
          duration: 0.5, auto: false }),
      ],
    }),
  ];

  const CATALOG = {};
  for (const d of CATALOG_LIST) {
    d.interactions.forEach((it) => { if (!it.label) it.label = it.key; });
    if (!d.capacity || d.capacity < 1) d.capacity = Math.max(1, d.slots.length);
    CATALOG[d.type] = d;
  }

  // --------------------------------------------------------------- careers
  // Hours are integer clock hours; end < start means the shift crosses midnight.
  // days = weekdays worked (0 = Segunda … 6 = Domingo). req = requirements to HOLD the level.
  const WEEK = [0, 1, 2, 3, 4];
  function lvl(title, pay, start, end, req, friends, car, days) {
    return { title, pay, start, end, days: days || WEEK, car, req: { skills: req || {}, friends: friends || 0 } };
  }
  const CAREERS = {
    negocios: {
      name: 'Negócios', icon: '💼', desc: 'Começa no correio interno e termina no topo da empresa.',
      workDelta: { hunger: -5, comfort: -2, hygiene: -4, energy: -5, fun: -5.2, social: 1 },
      levels: [
        lvl('Auxiliar de escritório', 120, 9, 15, {}, 0, 'hatch'),
        lvl('Assistente executivo', 180, 9, 16, {}, 0, 'hatch'),
        lvl('Representante de vendas', 250, 9, 16, { mechanical: 2 }, 0, 'hatch'),
        lvl('Executivo júnior', 320, 9, 16, { mechanical: 2, charisma: 2 }, 1, 'sedan'),
        lvl('Executivo', 400, 9, 16, { mechanical: 2, charisma: 2, logic: 2 }, 3, 'sedan'),
        lvl('Gerente sênior', 520, 9, 16, { mechanical: 2, charisma: 3, logic: 3, creativity: 2 }, 6, 'sedan'),
        lvl('Vice-presidente', 660, 9, 17, { mechanical: 2, charisma: 4, logic: 4, creativity: 2 }, 8, 'executive'),
        lvl('Presidente', 800, 9, 17, { mechanical: 2, charisma: 5, logic: 6, creativity: 3 }, 10, 'executive'),
        lvl('Diretor-geral', 950, 9, 16, { mechanical: 2, charisma: 6, logic: 7, creativity: 4 }, 12, 'executive'),
        lvl('Magnata', 1200, 10, 15, { mechanical: 2, charisma: 7, logic: 9, creativity: 6 }, 14, 'limo'),
      ],
    },
    ciencia: {
      name: 'Ciência', icon: '🔬', desc: 'Do tubo de ensaio ao prêmio internacional. Exige muita lógica.',
      workDelta: { hunger: -5, comfort: -1.6, hygiene: -4, energy: -5, fun: -4, social: 1 },
      levels: [
        lvl('Voluntário de testes', 155, 9, 15, {}, 0, 'hatch'),
        lvl('Assistente de laboratório', 230, 23, 5, {}, 0, 'hatch'),
        lvl('Pesquisador de campo', 320, 9, 15, { logic: 2 }, 0, 'van'),
        lvl('Professor de ciências', 375, 9, 16, { charisma: 1, logic: 3 }, 1, 'van'),
        lvl('Líder de projeto', 450, 10, 17, { charisma: 2, logic: 4, creativity: 1 }, 3, 'sedan'),
        lvl('Inventor', 540, 10, 19, { mechanical: 2, charisma: 2, logic: 5, creativity: 3 }, 4, 'sedan'),
        lvl('Acadêmico', 640, 10, 15, { mechanical: 4, charisma: 3, logic: 6, creativity: 4 }, 5, 'sedan'),
        lvl('Pesquisador sigiloso', 740, 10, 15, { cooking: 1, mechanical: 6, charisma: 4, logic: 7, creativity: 5 }, 7, 'executive'),
        lvl('Teórico renomado', 870, 10, 14, { cooking: 1, mechanical: 7, charisma: 4, logic: 9, creativity: 7 }, 8, 'executive'),
        lvl('Gênio da ciência', 1000, 10, 14, { cooking: 2, mechanical: 8, charisma: 5, logic: 10, creativity: 10 }, 10, 'limo'),
      ],
    },
    seguranca: {
      name: 'Segurança Pública', icon: '🚓', desc: 'Plantões noturnos no começo, corpo em forma sempre.',
      workDelta: { hunger: -5, comfort: -2, hygiene: -6, energy: -7.5, fun: -4, social: 1 },
      levels: [
        lvl('Vigia noturno', 240, 0, 6, {}, 0, 'police', [2, 3, 4, 5, 6]),
        lvl('Cadete', 320, 9, 15, {}, 0, 'police'),
        lvl('Patrulheiro', 380, 17, 1, { body: 2 }, 0, 'police', [2, 3, 4, 5, 6]),
        lvl('Sargento de plantão', 440, 9, 15, { body: 2, mechanical: 2 }, 1, 'police'),
        lvl('Investigador', 490, 10, 16, { mechanical: 3, body: 4 }, 2, 'police'),
        lvl('Detetive', 540, 9, 15, { mechanical: 3, body: 5, logic: 2, charisma: 1 }, 3, 'sedan'),
        lvl('Tenente', 590, 9, 15, { mechanical: 4, body: 6, logic: 3, charisma: 2 }, 4, 'sedan'),
        lvl('Agente tático', 625, 9, 15, { mechanical: 5, body: 7, logic: 5, charisma: 3 }, 6, 'van'),
        lvl('Delegado-chefe', 650, 9, 17, { mechanical: 6, body: 9, logic: 7, charisma: 4 }, 8, 'executive'),
        lvl('Herói da cidade', 700, 10, 16, { mechanical: 7, body: 10, logic: 9, charisma: 6, creativity: 3 }, 10, 'limo'),
      ],
    },
    artes: {
      name: 'Artes & Mídia', icon: '🎬', desc: 'Salário baixo no início, fama e fortuna no fim. Muitos amigos!',
      workDelta: { hunger: -5, comfort: -2, hygiene: -4, energy: -5, fun: -3, social: 2 },
      levels: [
        lvl('Garçom de bufê', 100, 9, 15, {}, 0, 'hatch', [1, 2, 3, 4, 5]),
        lvl('Figurante', 150, 9, 15, {}, 0, 'hatch', [1, 2, 3, 4, 5]),
        lvl('Dublê', 200, 9, 15, { charisma: 1 }, 0, 'van', [1, 2, 3, 4, 5]),
        lvl('Ator de comercial', 275, 9, 15, { charisma: 3, creativity: 2, body: 1 }, 1, 'van', [1, 2, 3, 4, 5]),
        lvl('Ator de novela', 375, 10, 16, { charisma: 4, creativity: 2, body: 1 }, 3, 'sedan', [1, 2, 3, 4, 5]),
        lvl('Apresentador de TV', 500, 10, 16, { charisma: 5, creativity: 3, body: 2 }, 5, 'sedan', [1, 2, 3, 4, 5]),
        lvl('Ator de cinema', 650, 10, 17, { charisma: 6, creativity: 4, body: 2 }, 7, 'executive', [1, 2, 3, 4, 5]),
        lvl('Diretor de cinema', 900, 10, 17, { charisma: 8, creativity: 5, body: 2 }, 10, 'executive', [1, 2, 3, 4, 5]),
        lvl('Estrela de cinema', 1100, 10, 17, { charisma: 9, creativity: 5, body: 3 }, 12, 'limo', [1, 2, 3, 4, 5]),
        lvl('Celebridade internacional', 1400, 10, 17, { charisma: 10, creativity: 6, body: 3 }, 15, 'limo', [1, 2, 3, 4, 5]),
      ],
    },
  };
  const CAREER_RULES = {
    carpoolBefore: 60, autoGoBefore: 25, alarmBefore: 120, alarmMinEnergy: 30,
    missedPerf: -25, fireAfterMisses: 2, promoBase: 0.4, demoteAt: -60, bladderReturn: 20,
    friendDaily: 50,
  };

  // --------------------------------------------------------------- socials
  // acceptBase = threshold T; score = 0.6·daily(target→init) + 0.4·targetMood + Σ traits[k]·(target[k]−5)
  //   − 12·repeats in the last hour + rand(−15, 15); accept if score ≥ T.
  const SOCIALS = {
    talk: {
      key: 'talk', label: 'Conversar', icon: '💬', anim: 'talk', minDaily: -100, maxDaily: 100, minLifetime: -100,
      acceptBase: -30, gainAccept: { daily: 3, lifetime: 1, social: 10, fun: 0 },
      gainReject: { daily: -2, lifetime: 0, social: -5, fun: 0 }, traits: { outgoing: 3 },
      ads: { social: { min: 10, delta: 30, vary: 'outgoing' } }, duration: 10, auto: true,
    },
    joke: {
      key: 'joke', label: 'Contar piada', icon: '😂', anim: 'joke', targetAnim: 'laugh', minDaily: -20, maxDaily: 100,
      minLifetime: -100, acceptBase: 0, gainAccept: { daily: 4, lifetime: 1, social: 12, fun: 8 },
      gainReject: { daily: -4, lifetime: -1, social: -5, fun: 0 }, traits: { playful: 6 },
      ads: { social: { min: 10, delta: 0 }, fun: { min: 0, delta: 20, vary: 'playful' } }, duration: 6, auto: true,
    },
    compliment: {
      key: 'compliment', label: 'Elogiar', icon: '🌹', anim: 'talk', minDaily: -10, maxDaily: 49, minLifetime: -100,
      acceptBase: 10, gainAccept: { daily: 5, lifetime: 1, social: 10, fun: 0 },
      gainReject: { daily: -3, lifetime: 0, social: -3, fun: 0 }, traits: { nice: 6 },
      ads: { social: { min: 10, delta: 10, vary: 'nice' } }, duration: 5, auto: true,
    },
    tickle: {
      key: 'tickle', label: 'Fazer cócegas', icon: '🤭', anim: 'laugh', targetAnim: 'laugh', minDaily: 25,
      maxDaily: 100, minLifetime: -100, acceptBase: 25, gainAccept: { daily: 5, lifetime: 1, social: 8, fun: 12 },
      gainReject: { daily: -6, lifetime: -1, social: -4, fun: 0 }, traits: { playful: 6 },
      ads: { social: { min: 5, delta: 0 }, fun: { min: 5, delta: 15, vary: 'playful' } }, duration: 5, auto: true,
    },
    backrub: {
      key: 'backrub', label: 'Massagem nas costas', icon: '💆', anim: 'hug', targetAnim: 'stretch', minDaily: 30,
      maxDaily: 100, minLifetime: -100, acceptBase: 35, gainAccept: { daily: 6, lifetime: 2, social: 10, fun: 0, comfort: 15 },
      gainReject: { daily: -7, lifetime: -1, social: -5, fun: 0 }, traits: { nice: 5, outgoing: 4 },
      ads: { social: { min: 10, delta: 10, vary: 'nice' } }, duration: 8, auto: true,
    },
    hug: {
      key: 'hug', label: 'Abraçar', icon: '🤗', anim: 'hug', minDaily: 40, maxDaily: 100, minLifetime: -100,
      acceptBase: 45, gainAccept: { daily: 8, lifetime: 2, social: 15, fun: 0 },
      gainReject: { daily: -8, lifetime: -2, social: -6, fun: 0 }, traits: { nice: 6, outgoing: 4 },
      ads: { social: { min: 15, delta: 15, vary: 'nice' } }, duration: 4, auto: true,
    },
    kiss: {
      key: 'kiss', label: 'Beijar', icon: '💋', anim: 'kiss', minDaily: 60, maxDaily: 100, minLifetime: 20,
      minTargetMood: 30, acceptBase: 65, gainAccept: { daily: 10, lifetime: 4, social: 18, fun: 5 },
      gainReject: { daily: -12, lifetime: -3, social: -8, fun: 0 }, traits: { outgoing: 4, nice: 2 },
      ads: { social: { min: 20, delta: 20, vary: 'outgoing' } }, duration: 4, auto: true,
    },
    dance: {
      key: 'dance', label: 'Dançar junto', icon: '💃', anim: 'dance', minDaily: 20, maxDaily: 100, minLifetime: -100,
      acceptBase: 20, gainAccept: { daily: 5, lifetime: 1, social: 10, fun: 15 },
      gainReject: { daily: -5, lifetime: -1, social: -5, fun: 0 }, traits: { playful: 4, outgoing: 4, active: 3 },
      ads: { social: { min: 5, delta: 10, vary: 'outgoing' }, fun: { min: 5, delta: 15, vary: 'active' } },
      duration: 15, auto: true,
    },
    tease: {
      key: 'tease', label: 'Provocar', icon: '😜', anim: 'joke', targetAnim: 'angry', minDaily: -100, maxDaily: 19,
      minLifetime: -100, acceptBase: 15, mean: true, gainAccept: { daily: 1, lifetime: 0, social: 5, fun: 6 },
      gainReject: { daily: -8, lifetime: -2, social: -6, fun: 0 }, traits: { playful: 5, nice: -3 },
      ads: { fun: { min: 0, delta: 15, vary: '-nice' } }, duration: 4, auto: true,
    },
    insult: {
      key: 'insult', label: 'Insultar', icon: '😠', anim: 'angry', targetAnim: 'cry', minDaily: -100, maxDaily: 29,
      minLifetime: -100, acceptBase: 999, mean: true, alwaysLands: true,
      gainAccept: { daily: -10, lifetime: -3, social: 0, fun: 0 },
      gainReject: { daily: -10, lifetime: -3, social: 0, fun: 0, targetFun: -10, initiatorDaily: -3 },
      traits: {}, ads: { fun: { min: 0, delta: 10, vary: '-nice' } }, duration: 4, auto: true,
    },
    goodbye: {
      key: 'goodbye', label: 'Despedir-se', icon: '👋', anim: 'wave', targetAnim: 'wave', minDaily: -100, maxDaily: 100,
      minLifetime: -100, acceptBase: -999, onlyRole: 'guest', gainAccept: { daily: 0, lifetime: 0, social: 0, fun: 0 },
      gainReject: { daily: 0, lifetime: 0, social: 0, fun: 0 }, traits: {}, ads: {}, duration: 2, auto: false,
    },
    greet: {
      key: 'greet', label: 'Cumprimentar', icon: '👋', anim: 'wave', targetAnim: 'wave', minDaily: -100, maxDaily: 100,
      minLifetime: -100, acceptBase: -999, onlyRole: 'walkby', gainAccept: { daily: 3, lifetime: 1, social: 6, fun: 0 },
      gainReject: { daily: 0, lifetime: 0, social: 0, fun: 0 }, traits: {}, ads: { social: { min: 5, delta: 15, vary: 'outgoing' } },
      duration: 3, auto: true,
    },
  };
  const SOCIAL_RULES = {
    atten: 'medium', relAdScale: 200, hideFriendlyBelow: -30, repeatWindow: 60, repeatPenalty: 12,
    randRange: 15, stinkyHygiene: -60, stinkyPenalty: 25, outgoingBonus: 1.25, lifetimeDiv: 4,
    decayHour: 16, decayDaily: 2, lifetimeDrift: 3, housemateDaily: -2, housemateLifetime: 1,
    callStart: 8, callEnd: 22, callMinutes: 20, callSuccessDaily: 4, callFailDaily: -3, callLateDaily: -5,
    inviteArriveMin: 30, inviteArriveMax: 60, guestStayMin: 180, guestStayMax: 300, guestLeaveHour: 23,
    guestLeaveRel: -20, guestLeaveMotive: -50, maxVisitors: 6,
    walkbyStart: 9, walkbyEnd: 18, walkbyChance: 0.6, walkbyLinger: 25,
    serviceArrive: 60,
  };

  // ---------------------------------------------------------------- names
  const NAMES = {
    f: ['Ana', 'Beatriz', 'Camila', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana',
      'Larissa', 'Mariana', 'Natália', 'Patrícia', 'Rafaela', 'Sofia', 'Tatiana', 'Vitória', 'Luana', 'Bianca',
      'Carla', 'Débora', 'Letícia', 'Priscila', 'Renata', 'Aline', 'Jéssica', 'Lívia', 'Manuela', 'Yasmin',
      'Rita', 'Cláudia', 'Simone', 'Vanessa', 'Joana', 'Lúcia', 'Marta', 'Teresa', 'Adriana', 'Elaine'],
    m: ['André', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'Igor', 'João',
      'Lucas', 'Marcelo', 'Nicolas', 'Otávio', 'Pedro', 'Rafael', 'Thiago', 'Vinícius', 'Gustavo', 'Leonardo',
      'Mateus', 'Rodrigo', 'Samuel', 'Fábio', 'Daniel', 'Caio', 'Renato', 'Sérgio', 'Paulo', 'Ricardo',
      'Antônio', 'Fernando', 'Júlio', 'Márcio', 'Wagner', 'Roberto', 'Davi', 'Enzo', 'Heitor', 'Murilo'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida',
      'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Rocha', 'Dias', 'Moreira',
      'Cardoso', 'Teixeira', 'Correia', 'Mendes', 'Freitas', 'Pinto', 'Monteiro', 'Cavalcanti', 'Moura', 'Batista',
      'Campos', 'Vieira', 'Machado', 'Nogueira', 'Ramos', 'Farias', 'Azevedo', 'Lopes', 'Brito', 'Duarte'],
  };

  // -------------------------------------------------------------- palettes
  const PALETTES = {
    skin: ['#f6d7c3', '#efc3a4', '#e0ac85', '#c98e66', '#a86f4c', '#8a5537', '#6b3f28', '#4e2c1c'],
    hair: ['#1c1714', '#3b2a1e', '#5a3d27', '#8a5a33', '#b07a45', '#d8b26a', '#e9d39b', '#a33c22', '#7d7d7d', '#d9d9d9'],
    shirt: ['#e4572e', '#f3a712', '#29335c', '#669bbc', '#2a9d8f', '#e9c46a', '#8338ec', '#ef476f', '#06d6a0',
      '#f1faee', '#3a86ff', '#bc4749', '#ffb4a2', '#6a994e'],
    pants: ['#1d3557', '#283618', '#3d405b', '#6d6875', '#2b2d42', '#5e503f', '#8d99ae', '#432818', '#14213d', '#a68a64'],
  };

  // ------------------------------------------------------- pure helpers
  function def(type) { return CATALOG[type] || null; }
  function interaction(type, key) {
    const d = CATALOG[type];
    if (!d) return null;
    for (const it of d.interactions) if (it.key === key) return it;
    return null;
  }
  // Trait/skill multiplier p for an ad's vary key ('neat', '-playful', 'cooking', ...).
  // Traits 0..10 → p = t/10 (inverted 1 − t/10); skills 0..10 → p = 2·s/10.
  function varyMultiplier(vary, personality, skills) {
    if (!vary) return 1;
    let inv = false, k = vary;
    if (k[0] === '-') { inv = true; k = k.slice(1); }
    if (personality && personality[k] != null) {
      const t = Math.max(0, Math.min(10, +personality[k] || 0)) / 10;
      return inv ? 1 - t : t;
    }
    if (skills && SKILLS.indexOf(k) >= 0) {
      const s = Math.max(0, Math.min(10, +((skills || {})[k]) || 0));
      return inv ? 2 - 2 * s / 10 : 2 * s / 10;
    }
    return 1;
  }
  // Fun-rate personality scaling 0.5 + trait/10 (0.5 .. 1.5).
  function rateMultiplier(vary, personality, skills) {
    if (!vary) return 1;
    return 0.5 + varyMultiplier(vary, personality, skills) * (SKILLS.indexOf(vary.replace('-', '')) >= 0 ? 0.5 : 1);
  }
  function adAmount(ad, personality, skills) {
    if (ad == null) return 0;
    if (typeof ad === 'number') return ad;
    return (+ad.min || 0) + (+ad.delta || 0) * varyMultiplier(ad.vary, personality, skills);
  }
  // Room-score rating fallback from price (RESEARCH canonical table).
  function roomRatingFromPrice(price) {
    const steps = [[100, 1], [250, 2], [500, 3], [1000, 4], [2000, 5], [3500, 6], [5000, 7], [7500, 8], [10000, 9]];
    for (const [p, r] of steps) if (price <= p) return r;
    return 10;
  }
  // Canonical RoomImpact for one object in its current state (before area scaling).
  // isNight: lamps count as lit (+10) unless obj.on === false (M.world passes false and counts light itself).
  // Windows, dark-room penalty and unmade beds are the room scorer's job.
  function roomImpact(o, isNight) {
    const d = CATALOG[o && o.type];
    if (!d) return 0;
    let v = 0;
    switch (o.type) {
      case 'dirty_plate': return o.spoiled ? ROOM_IMPACT.spoiledPlate : ROOM_IMPACT.dirtyPlate;
      case 'puddle': return ROOM_IMPACT.puddle;
      case 'meal': return o.spoiled ? ROOM_IMPACT.spoiledMeal : 0;
      case 'newspaper': case 'carpool': return 0;
      default: break;
    }
    if ((o.type === 'plant_small' || o.type === 'plant_big')) {
      if (o.dead) return ROOM_IMPACT.deadPlant;
      if (o.water != null && o.water < PLANT.thirstyBelow / 2) return ROOM_IMPACT.wiltingPlant;
    }
    v += ROOM_IMPACT.perRating * (d.room || 0);
    if (d.light && isNight && o.on !== false && !o.broken) v += ROOM_IMPACT.lampLit;
    // note: the unmade-bed penalty (ROOM_IMPACT.unmadeBed) is applied by the room scorer (M.world)
    if (o.broken) v += ROOM_IMPACT.broken;
    if (d.dirties && (o.dirty || 0) >= DIRT.visible) v += ROOM_IMPACT.dirtyPlumbing;
    return v;
  }
  // Sell refund for an object owned since boughtDay (DESIGN rule).
  function sellRefund(o, day) {
    const price = +(o && o.price) || 0;
    if (!price) return 0;
    const owned = Math.max(0, (day || 1) - (o.boughtDay || day || 1));
    if (owned === 0) return Math.round(price * MONEY.sellToday);
    return Math.round(price * Math.max(MONEY.sellMin, MONEY.sellStart - MONEY.sellPerDay * owned));
  }
  // Shift helpers: shift length in hours (handles midnight crossing).
  function shiftHours(level) {
    if (!level) return 0;
    const len = ((level.end - level.start) % 24 + 24) % 24;
    return len === 0 ? 24 : len;
  }
  function careerLevel(track, level) {
    const c = CAREERS[track];
    if (!c) return null;
    const i = Math.max(1, Math.min(c.levels.length, level | 0)) - 1;
    return c.levels[i];
  }

  M.data = {
    MOTIVES, MOTIVE_LABELS, MOTIVE_ICONS, SCORED, DECAY, RATE,
    SKILLS, SKILL_LABELS, SKILL_ICONS, SKILL_TRAIT, SKILL_GAIN,
    PERSONALITY, PERSONALITY_LABELS, PERSONALITY_OPPOSITES, PERSONALITY_POINTS,
    FLOORS, WALLPAPERS, WALL_PRICES, WALL_TYPE_KEYS, DEMOLISH_REFUND,
    CATEGORIES, CATALOG, CATALOG_LIST,
    CAREERS, CAREER_RULES, SOCIALS, SOCIAL_RULES, NAMES, PALETTES,
    CURVES, ATTENUATION, ATTENUATION_VISITOR, AUTONOMY,
    MONEY, MEAL, CRITICAL, SLEEP, WALK, PLANT, DIRT, REPAIR, ROOM_IMPACT,
    // helpers
    curve, def, interaction, varyMultiplier, rateMultiplier, adAmount, roomRatingFromPrice, roomImpact,
    sellRefund, shiftHours, careerLevel, sitRate, sitCap, funRate, funCap, sleepRate,
  };
})(window.M = window.M || {});
