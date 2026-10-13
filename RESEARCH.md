# Research: classic life-sim mechanics (public sources)

Internal reference only. Never copy names/trademarks into the game.


## MOTIVES

Research on the needs/motives system of The Sims (2000), to be rebuilt as original gameplay rules. Most wiki and guide sites (Wikipedia, fandom, StrategyWiki, archive.org, Northwestern, donhopkins.com) could not be fetched directly from this sandbox. WebFetch failed on DNS and curl got a 403 from the proxy, so facts from those sites come from search-engine snippets. GitHub was reachable, which gave three primary-grade sources.

(1) Will Wright's original prototype Motive.c (dated 1/23/97, published by Don Hopkins as "The Soul of The Sims"). I read the 5 scanned printout pages in github.com/alexcu/motive-simulator/original.pdf myself. The repo's motives.c transcription has errors, corrected below: it drops `Motive[mHunger] -= tem;`, gets one energy-branch sign wrong, and computes HappyWeek from HappyDay.

(2) FreeSO/Simitone's C# reimplementation of the shipped TS1 engine. VMTS1MotiveDecay.cs holds the shipped TS1 passive-decay constants, which come from the FCNS 1 constant table in global.iff. VMContext.cs holds the room-score formula. VMFindBestAction.cs and TTAB.cs hold the autonomy scoring, attenuation values and personality multipliers. VMMotiveChange.cs holds the rules for per-hour gains from interactions.

(3) A summary in Don Hopkins' moollm repo quoting Jamie Doornbos' Oct-1997 "Find Best Action" design doc: cutoffs, delta scoring and distance attenuation.

Key facts. Motives are ints from -100 to +100 (Prima: a "200-point system", green 0..100, red 0..-100). Decay runs once every 2 sim-minutes (30 ticks per sim-hour, the same tick as Wright's prototype). Personality is stored internally as 0-1000 (10 UI points = 1000), with 25 points to spend in Create-a-Sim. Only two traits directly change passive decay: Outgoing raises Social decay from 1.65/h to 5.4/h, and Active changes Comfort decay between 12, 15 and 18/h. The other traits act through advertisement multipliers (trait/1000, or 1 - trait/1000 for the inverted form).

Shipped per-hour decay rates:
- Hunger: about 0.063 x (100 + Hunger), so 12.6/h when full and 6.3/h at the midpoint.
- Energy: 11.25/h awake (180 points over 16 waking hours). A rate-1 bed restores 22/h, i.e. 180 over 8 hours.
- Bladder: 9/h awake, 4.5/h asleep, plus 0.3 x the hunger decrement.
- Hygiene: 5.1/h awake, 2.4/h asleep.
- Fun: 7.5/h awake, 0 asleep.
- Room: no decay. It is recomputed instantly as Room = clamp(sum of object RoomImpact / max(1, tiles/12) - 10, -100, 100).

FreeSO's TS1 mood is a plain average of the 8 motives. The Prima guide says mood is weighted, with Hunger, Bladder and Energy counting more than Social, Fun and Room. FreeSO notes that Hot Date and later use "HappyWeight" curves (STR#502 in global.iff), and low motives dominate through the concave "InteractionScore" curves (STR#501). The actual curve data is game data that is not public, so the curves and weights below are ESTIMATEs.

Failure consequences: passing out from energy, a puddle from bladder, and death from hunger (the fandom wiki says 18 h after Hunger empties, flagged "confirmation needed"). The 1997 prototype instead resets values on failure: starve then hunger 80, mandatory bath then hygiene 80, wet bed or soiled carpet then bladder 90, plus "lost temper".

Command refusal and work effects are only loosely documented, so those thresholds are marked ESTIMATE. Every numeric value not taken from code or scans is marked ESTIMATE. All names here are internal or technical. For the original game, rename motives and UI in Portuguese, e.g. Fome, Conforto, Higiene, Bexiga, Energia, Diversão, Social, Ambiente, and use no EA names or assets.


### Motive scale, tick rate and data representation

Each Sim has 8 visible motives: Hunger, Comfort, Hygiene, Bladder, Energy, Fun, Social, Room. Each is a signed integer from -100 (empty, red) to +100 (full, green). Prima's guide: 'Internally, the game uses a 200-point system, with positive (green) ratings between 0 and 100, and negative (red) ratings from 0 to -100.' Passive decay is evaluated once every 2 sim-minutes, i.e. 30 ticks per sim-hour (FreeSO's TS1 decay runs when floor(minutes/2) changes, and Wright's 1997 prototype says '1 tick = 2 minutes game time', DAYTICKS = 720, WEEKTICKS = 5040). Sub-integer decay is kept in a per-motive fractional accumulator in 1/1000 units. When it reaches 1000, the integer motive drops by 1. Motives are clamped to [-100, 100] every tick. New Sims start with all motives at +100. Personality traits are stored as 0..1000 internally (UI 0..10 points x 100), and skills likewise as 0..1000.

**Numbers:** Range -100..+100 (UI bar 0..100%: pct = (m+100)/2). Tick = 2 sim-minutes = 30 ticks per sim-hour = 720 ticks per sim-day. Fraction accumulator in 1/1000 units. Personality and skills stored 0..1000 (1 point = 100). Initial motives = 100.

**Implementation:** Store motives as an Int16Array(16) plus an Int16Array of fractional accumulators. Use a fixed-step sim clock and call decayTick() whenever floor(simMinutes/2) changes. Clamp after each write. Show bars as (m+100)/200 with a green-to-red gradient whose midpoint is at 0.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/alexcu/motive-simulator, https://ia600104.us.archive.org/21/items/Tekken3PrimasOfficialStrategyGuide1998/The%20Sims%20-%20Unleashed%20(Prima's%20Official%20Strategy%20Guide%20-%202004).pdf


### Motive slot layout (prototype vs shipped)

The shipped TS1 engine keeps Wright's 16-slot motive array from the 1997 prototype and repurposes some slots. Prototype enum: 0 HappyLife, 1 HappyWeek, 2 HappyDay, 3 HappyNow, 4 Physical, 5 Energy, 6 Comfort, 7 Hunger, 8 Hygiene, 9 Bladder, 10 Mental, 11 Alertness, 12 Stress, 13 Environment, 14 Social, 15 Entertained. Shipped TS1 (FreeSO VMMotive): 0 HappyLife, 1 HappyWeek, 2 HappyDay, 3 Mood (was HappyNow), 4 unused (Physical), 5 Energy, 6 Comfort, 7 Hunger, 8 Hygiene, 9 Bladder, 10 unused (Mental), 11 SleepState (was Alertness; 0 = awake, nonzero = asleep), 12 unused (Stress, removed; Hopkins notes 'there is no longer any stress motive'), 13 Room (was Environment), 14 Social, 15 Fun (was Entertained).

**Numbers:** 16 slots. Visible: 5,6,7,8,9,13,14,15. Derived: 3 (Mood); 0-2 are long-term happiness averages. 11 = SleepState flag.

**Implementation:** Use the same 16-slot array, or a named object: {hunger, comfort, hygiene, bladder, energy, fun, social, room, mood, sleepState, happyDay, happyWeek, happyLife}. Keep happyDay/Week/Life as exponential moving averages for a 'life satisfaction' stat (see the prototype entry).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMMotive.cs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf, http://www.donhopkins.com/home/images/Sims/


### Hunger passive decay

Shipped TS1 (FCNS constant 'hunger decrement ratio'): each 2-minute tick, Hunger -= 0.0021 x (100 + Hunger). Decay is proportional to fullness: a full stomach empties fastest and an empty one slowest (exponential approach to -100). Awake and asleep rates are the same. FreeSO truncates the fixed-point constant to 0.002, about 5% slower. Passive decay is skipped while an interaction is applying a motive change to Hunger (eating). Wright's prototype used the same proportional shape: Hunger -= ((Alertness+100)/200) x ((Hunger+100)/100) per tick, plus extra hunger from negative stress.

**Numbers:** Per tick dH = -0.0021*(100+H). Per sim-hour about -0.063*(100+H): H=100 gives -12.6/h, H=50 -9.45/h, H=0 -6.3/h, H=-50 -3.15/h. Time from full: to 0 = 11.0 h, to -50 = 22 h, to -80 = 36.5 h, to -95 = 58.6 h. Passive decay alone takes about 4 days to reach -100. Work shifts and activities speed it up (see the job entry).

**Implementation:** hungerFrac += Math.round(2.1*(100+hunger)) [in 1/1000 units]; while (hungerFrac >= 1000) { hunger--; hungerFrac -= 1000 }. To make starvation reachable in under ~3 days without eating, optionally add a 0.03/tick linear floor term (ESTIMATE, not in TS1).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf


### Bladder passive decay (coupled to Hunger)

Shipped TS1: each tick, Bladder -= 0.30 when awake or 0.15 when asleep, plus 0.3 x (this tick's hunger decrement). A fuller stomach fills the bladder faster, so 'food goes into the bladder'. The prototype did it differently: whenever Hunger rose (food eaten), Bladder -= deltaHunger/4, and the base rate was -0.4 awake / -0.2 asleep per tick. Coffee and drinks in TS1 also hit Bladder through their own interaction motive changes.

**Numbers:** Awake about -9/h base + 0.3*hungerDecay (+3.8/h when H=100, +1.9/h when H=0). Asleep about -4.5/h + coupling. Full to empty with no toilet: about 17.8 h awake, about 33 h asleep. Prototype: on eating, bladder -= food/4.

**Implementation:** bladderFrac += (asleep ? 150 : 300) + Math.floor(0.3*hungerFracThisTick). For a stronger 'just ate, need the toilet' feel, combine both rules: also subtract 25% of each eating gain (prototype rule).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://strategywiki.org/wiki/The_Sims/Needs


### Energy drain, sleep restoration and wake rule

Shipped TS1 constants: energy span = 180, wake hours = 16, wake hour = 7, energy drift = 0.01. Awake: Energy -= 180/(16*30) per tick, so a Sim burns 180 points (100 down to -80) over a 16-hour waking day. Asleep (SleepState != 0): no passive drain before 07:00, then a tiny 0.01/tick drift. Energy is restored by the bed's interaction motive change. In TS1, positive Energy rates from objects are multiplied by floor(180/(24-16)) = 22, so a rate-1 bed restores 22/h, which is about 180 over 8 hours of sleep (better beds use higher rates). Wake rule: if asleep and the clock hour is 7 and Energy >= 80 (180-100), set SleepState = 0 (wake up). Unlike other motives, energy passive decay is not suspended while an energy motive change is active. A special SleepState of -1 makes energy rise 1.286/tick (about 38.6/h) in FreeSO's code. Its meaning is unclear (possibly a forced or cheat sleep). Wright's prototype instead coupled Energy to an Alertness variable (see the prototype entry) and gave Energy += food/4 when eating.

**Numbers:** Awake drain 0.375/tick = 11.25/h (100 to -100 in 17.8 h). Asleep drain 0 before 07:00, 0.3/h after. Bed gain = bedRate*22 per hour (rate 1 = 22/h; ESTIMATE cheap bed rate 1.0 = 22/h, mid 1.3 = 29/h, luxury 1.6 = 35/h). Auto-wake at 07:00 if Energy >= 80. Coffee/espresso ESTIMATE: +10 Energy once, -10 Bladder.

**Implementation:** if (!asleep) energyFrac += 375; else if (hour >= 7) energyFrac += 10. Bed interaction: setMotiveChange('energy', +22*bedRate per hour, max 100). Check the wake rule once per tick. Also wake if Bladder or Hunger drops below -80 (ESTIMATE; the prototype keeps Sims awake via 'Bladder < -50 raises alertness').

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMMotiveChange.cs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf


### Comfort passive decay (Active trait)

Shipped TS1 constants: 'comfort decrement active' 0.4, 'comfort decrement lazy' 0.6, 'comfort decrement' 0.5 per tick. Active Sims lose comfort more slowly (standing doesn't bother them) and lazy Sims lose it faster. FreeSO's selector is Active > 666 for the active rate, < 666 for the lazy rate, and exactly 666 for the base rate. That is probably a porting quirk: the likely intent is three bands. Comfort decay is suspended while sitting, lying down or using a hot tub, because those interactions apply a Comfort motive change. StrategyWiki: Sims who pass out on the floor lose comfort faster. Prototype: Comfort is pulled down by negative Bladder (/10), Hygiene (/20) and Hunger (/20), and a cubic term C -= C^3/10000 pulls it toward 0.

**Numbers:** Active-band 0.4/tick = 12/h; mid 0.5/tick = 15/h; lazy 0.6/tick = 18/h (100 to -100 standing: 16.7 h / 13.3 h / 11.1 h). Recommended bands (ESTIMATE): Active >= 7 points = active, Active <= 3 = lazy, else mid. Seat gains (ESTIMATE): cheap chair +20/h, sofa +35/h, recliner +45/h, bed +50/h (max 100).

**Implementation:** comfortFrac += active>=700 ? 400 : active<=300 ? 600 : 500, skipped while the current interaction owns a comfort motive change. Optional prototype flavour: comfort -= max(0,-bladder)/10/30 per tick while bladder is red (ESTIMATE scale).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://strategywiki.org/wiki/The_Sims/Needs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf


### Hygiene and Fun passive decay

Hygiene (shipped constants): -0.17/tick awake, -0.08/tick asleep. Fun ('ent dec awake'): -0.25/tick awake, 0 asleep. Interactions that give hygiene (shower, bath, sink) or fun (TV, games, pool) suspend passive decay of that motive while they run. Prototype: hygiene -0.3 awake / -0.1 asleep; Entertained halves each tick while asleep. Fun decay is NOT modified by the Playful trait in the decay code; Playful works through advertisement multipliers instead.

**Numbers:** Hygiene: 5.1/h awake, 2.4/h asleep (100 to -100 in about 39 h awake). Fun: 7.5/h awake, 0 asleep (100 to -100 in 26.7 h awake). Gains (ESTIMATE): shower +60/h, bath +50/h (+Comfort), sink wash +20 once; TV +20 to 40/h by price, pinball/computer games +40/h, pool +50/h (-Energy 15/h).

**Implementation:** hygieneFrac += asleep ? 80 : 170; funFrac += asleep ? 0 : 250. Fun objects declare fun gain per hour and a 'varyBy' trait (see the personality entry).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf


### Social passive decay (Outgoing trait)

Shipped TS1 constants: 'social decrement base' 0.055 and 'social decrement multiplier' 0.000125 x Outgoing (raw 0..1000) per tick. Outgoing Sims' social bar drains much faster (fan wiki: 'The social bar of outgoing Sims decays rapidly, as they desire social interaction'). Social decays while asleep too. In FreeSO the multiplier truncates to 0 in fixed point (a porting bug), so use the float formula. In The Sims Online the social decay was also scaled by (100 + Social), i.e. it decays faster when full.

**Numbers:** Per hour = 1.65 + 0.375*OutgoingPoints. Outgoing 0: 1.65/h (5 days from full to empty); 3: 2.77/h; 5: 3.52/h; 7: 4.28/h; 10: 5.4/h (37 h from full to empty). Social gains (ESTIMATE): talk +15/h, joke/back-rub/hug +5..+15 per interaction scaled by relationship, phone chat +10/h.

**Implementation:** socialFrac += 55 + Math.round(0.125*outgoingRaw) every tick (awake or asleep).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMAvatarMotiveDecay.cs, https://www.thesimswiki.com/wiki/Personality, https://www.gamespot.com/articles/the-sims-walkthrough/1100-6086937/


### Interaction motive changes and decay suppression

Objects change motives with the 'Set Motive Change' primitive: (motive, perHourChange, maxValue). Every engine tick the per-hour rate is spread over the hour with a fractional accumulator. The motive moves toward maxValue but never past it. If it is already past it, nothing happens (no clamping down). A 'once' flag applies an instant delta instead. 'Clear all' removes every change when the interaction ends. While a motive change is active on a motive, that motive's passive decay is skipped, except Energy, which always decays. In TS1, positive Energy rates are multiplied by 22. Max values let objects cap gains: a cheap fridge snack may only fill Hunger to 40, a gourmet meal to 100.

**Numbers:** Rate units: motive points per sim-hour. Energy gain multiplier = floor(180/(24-16)) = 22. Example ads/rates (ESTIMATE): snack +30 Hunger instant (max 50); cooked meal +80/h for 0.5 h then eat at +60/h up to quality cap 60..100; toilet +200/h Bladder (max 100), Hygiene -5 if not Neat-washing; shower +60/h Hygiene.

**Implementation:** sim.motiveChanges[motive] = {rate, max}. In tick(): accum += rate/ticksPerHour; apply the integer part toward max. In decayTick(): if (motiveChanges[m] && m !== 'energy') skip decay for m. Clear all changes when the interaction's action routine ends.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMMotiveChange.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMSetMotiveChange.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs


### Motive drain while at work

While the Sim is away at a job, the lot simulation doesn't run the Sim. Each career level instead applies its own motive decay values (stored in work.iff, which overrides the global decay constants). The Sim comes home tired, hungry and dirty in proportions that depend on the job (e.g. physical jobs drain Energy and Hygiene more). Wright's prototype SimJob(): clock +9 h; Energy = (Energy+100)*0.3 - 100 (keeps 30% of headroom); Hunger = -60 + rand(20); Hygiene = -70 + rand(30); Bladder = -50 + rand(50); Alertness = 10 + rand(10); Stress = -50 + rand(50).

**Numbers:** Prototype: 9-hour shift; E' = 0.3*(E+100) - 100; H' in [-60,-40]; Hy' in [-70,-40]; B' in [-50,0]. Proposed per-career hourly drains at work (ESTIMATE): office: Hunger -6, Comfort -4, Hygiene -3, Bladder 0 (toilets at work), Energy -9, Fun -6, Social +2 (coworkers); labor/athletic: Energy -13, Hygiene -8, Comfort -6.

**Implementation:** When the carpool departs, hide the Sim, then on return apply shiftHours * careerLevel.drain[m] (or the prototype formulas for a simple first version). Clamp at -100.

Sources: https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://modthesims.info/showthread.php?t=689739, https://sims.fandom.com/wiki/Carpool


### Personality traits: points and effects

There are five traits: Neat (Sloppy-Neat), Outgoing (Shy-Outgoing), Active (Lazy-Active), Playful (Serious-Playful) and Nice (Grouchy-Nice). Each is 0..10 points, and Create-a-Sim gives 25 points total (you need not spend all). The displayed zodiac sign is derived from the personality vector and has no behavioral effect. Internal storage is 0..1000. (A 'Generous' trait also exists in the engine tables but is unused, a cut feature.) Effects: (1) Passive decay: only Outgoing (Social) and Active (Comfort) change decay, see those entries. (2) Advertisement multipliers: each object interaction's motive advertisement can 'vary by' a trait. The multiplier is trait/1000 (0..1), or (1 - trait/1000) for the inverted form, and 0..2 for skills (skill/1000*2). Playful scales fun on toys and pinball and inverted-Playful scales chess and books. Active scales exercise, pool and sports and inverted-Active scales TV and couch. Neat scales cleaning ads and inverted-Neat makes Sims leave mess. Outgoing scales socials. (3) Behaviours: Neat Sims wash hands after the toilet and clean autonomously, while Sloppy Sims leave dishes. Nice versus Grouchy changes how Sims react to and accept social interactions. Outgoing >= 8 makes friends more easily. One guide says Neat has no effect on skills or motives.

**Numbers:** 0..10 each, 25 points total, internal x100. Ad multiplier = trait/1000 or 1 - trait/1000; skill multiplier = 2*skill/1000. Proposed extras (ESTIMATE): Neat >= 7 gives a 1.5x mood penalty from mess objects in the room; Playful >= 7 gives +20% fun gain from playful objects; Nice <= 3 unlocks mean socials (insult, slap).

**Implementation:** sim.traits = {neat, outgoing, active, playful, nice} in 0..10. Interaction ad entries: {motive, min, delta, varyBy:'playful'|'-playful'|...}. In scoring, effectiveAd = delta * mul. Validate the sum to 25 in the creation UI and show your own original 'sign' mapping (e.g. nearest of 12 archetype vectors) purely for flavour.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://sims.fandom.com/wiki/CAS, https://www.thesimswiki.com/wiki/Personality, https://www.gamespot.com/articles/the-sims-walkthrough/1100-6086937/, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-astrology.md


### Overall mood computation

Documented pieces: (a) FreeSO's TS1 port sets Mood (slot 3) every tick to the plain integer average (Hunger+Comfort+Hygiene+Bladder+Energy+Fun+Social+Room)/8. (b) Prima's guide says each motive is weighted by how critical it is to life: Hunger, Bladder and Energy count more than Social, Fun or Room. (c) FreeSO notes that from Hot Date onward happiness is weighted by per-motive 'HappyWeight' curves (STR#502 in global.iff), where the weight itself depends on the motive value. Its reverse-engineering harness assumes mood = sum(curve_i(m_i) * w_i(m_i)) / sum(w_i(m_i)). (d) The 'interaction score' curves (STR#501) make deficits count more than surpluses. The actual curve points are game data and not public. Proposed faithful-feeling formula (ESTIMATE): weight w_i = base_i * (1 + 2*max(0,-m_i)/100), so a motive at -100 counts triple, and mood = sum(w_i*m_i)/sum(w_i). Mood UI (Prima): up to 5 green bars above the masks when positive, up to 5 red bars below when negative.

**Numbers:** Shipped port: mood = trunc(sum8/8). Proposed base weights (ESTIMATE): Hunger 1.5, Energy 1.5, Bladder 1.5, Hygiene 1.0, Comfort 1.0, Social 1.0, Fun 1.0, Room 0.6; deficit multiplier k = 2. Example: all motives at +50 except Hunger -80 gives a plain average of +33.8 but a weighted mood of about +5.9. Bars = min(5, ceil(|mood|/20)), green if mood > 0 (ESTIMATE mapping).

**Implementation:** function mood(m){let s=0,w=0;for(const k of KEYS){const wi=BASE[k]*(1+2*Math.max(0,-m[k])/100);s+=wi*m[k];w+=wi}return Math.round(s/w)} Recompute after every decay tick. Also keep happyDay/happyWeek EMAs (see the prototype entry) for long-term stats.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/WorldGlobalProvider.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://ia600104.us.archive.org/21/items/Tekken3PrimasOfficialStrategyGuide1998/The%20Sims%20-%20Unleashed%20(Prima's%20Official%20Strategy%20Guide%20-%202004).pdf, https://arxiv.org/pdf/2008.11258


### Autonomy happiness curves and interaction scoring (where 'low motives weigh more')

Doornbos' 1997 Find Best Action, as reimplemented by FreeSO. (1) Each motive is converted to an 'effective motive' by a per-motive contribution curve. The curves are steeper at low values and flat above a cutoff, so 'an interaction that provides for only one motive will have an overall score of zero if that motive is already over the cutoff point'. This stops Sims sleeping at 50% energy while letting Fun have a high cap. (2) baseHappy = average of the effective values of 9 entries: Energy, Comfort, Hunger, Hygiene, Bladder, Mood, Room, Social, Fun. (3) For each available interaction (object not occupied, use count 0, check tree passes with auto=1), add each advertisement delta (times the personality or skill multiplier) to the current motive and re-evaluate the curve. Score = newHappy - baseHappy. An ad with a nonzero 'min' is only considered when the motive is below min. (4) Distance attenuation: score / (1 + atten*distanceTiles). Atten codes: none 0, low 0.1, medium 0.3, high 0.6. Visitors use 0, 0.01, 0.02, 0.03. Floors count as 20 tiles. (5) Drop scores <= 1e-7 (1e-6 if sitting). Keep the top 4 objects not in use, pick by weighted random proportional to score (unless the interaction is flagged 'auto first'), and queue it at autonomous priority. TS1 divides ad deltas by 1000 before applying them (a quirk, not needed in a remake). Children use separate curves. Hot Date and later also apply HappyWeight curves.

**Numbers:** Attenuation 0/0.1/0.3/0.6 (visitors 0/0.01/0.02/0.03). Top-4 weighted random. Min score 1e-7 (1e-6 seated). Proposed curve (ESTIMATE): C(m) = m >= cut ? cut : (m >= 0 ? m : m*(1 + 2*(-m)/100)), giving C(-50) = -100 and C(-100) = -300. Cutoffs: Hunger 60, Energy 40, Bladder 40, Comfort 60, Hygiene 50, Fun 90, Social 70, Room 80, Mood 100.

**Implementation:** For each candidate: s = sum over ads of (C(m+ad*mul) - C(m))/9; s /= (1 + atten*dist). Sort, filter in-use, take 4, roulette-select. Re-run when the queue is empty or every ~30 sim-minutes. Cache C() as a 201-entry lookup table per motive.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/TTAB.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md, https://woobsha.com/diy-TTABTutorialMac.htm, https://modthesims.info/t/118389, https://users.cs.northwestern.edu/~forbus/c95-gd/2001/Programming%20Objects%20in%20The%20Sims.pdf


### Room motive computation

Room has no decay. Every tick it is set to the score of the room the Sim stands in. FreeSO's TS1 formula sums every object's 'RoomImpact' value over the room and its light-connected sub-rooms, divides by max(1, areaTiles/12) (outdoors: divide by 30), subtracts 10 indoors (15 outdoors), and clamps to [-100, 100]. Larger rooms therefore need proportionally more decoration, and the per-tile cap matches the fan description of 'a cap determined by the number of tiles'. RoomImpact is set by each object's own script. It is positive for decorative objects (driven by price and 'niceness'), lit lamps and windows in daylight, and negative for mess: trash, dirty plates, puddles, ash, dead plants, dead fish, unfinished walls. Lighting is computed separately (ambient from lamps, outdoor light through windows, scaled by area/100), and turning lights off always lowers the score. A window can raise a room's score. Sims never complain about red Room, but it still feeds mood.

**Numbers:** Room = clamp(round(sumImpact / max(1, tiles/12)) - 10, -100, 100); outdoors clamp(round(sumImpact/30) - 15). Proposed impacts (ESTIMATE): decor = round(price/40) capped at 40 (a §120 plant gives +3, a §1,200 painting +30); lamp lit +8 (table), +10 (floor), +12 (ceiling or wall); window in daylight +6; dark room at night (no lit lamp, hour 19-6) -25; dirty plate -8; full trash can -10; trash pile -15; puddle -15; ash pile -20; dead plant -15; broken appliance -10. Example: a 12-tile bedroom with 2 lit floor lamps (20) + a §600 painting (15) + a window at noon (6) gives 41 - 10 = +31.

**Implementation:** Flood-fill rooms on wall-grid changes and store tiles per room. Keep room.impactSum updated incrementally when objects are added, removed or change state (lamp on/off, plate dirty). Every tick: sim.room = roomScore(roomAt(sim.pos)). Optionally add per-tile light falloff for the 'localized light' feel.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMRoomMap.cs, https://sims.fandom.com/wiki/Window, https://sims.fandom.com/wiki/Light, https://sims.fandom.com/wiki/Environment, https://modthesims.info/t/188284, https://modthesims.info/d/641362/environment-motive-mod.html, https://www.thegamer.com/sims-1-all-needs-motives-keep-happy/, https://www.tsomania.net/catalogs/buy.php?c=3&p=1&o=170


### Critical Energy: passing out

When Energy reaches -100 while awake, the Sim collapses and sleeps on the floor wherever it stands. Sleep-deprived Sims are grumpy beforehand. While on the floor, Comfort drops faster (StrategyWiki). The Sim wakes once rested or when a critical need such as Bladder interrupts. Wright's prototype had no explicit pass-out; its Alertness went negative (asleep) as Energy fell.

**Numbers:** Trigger Energy <= -100 (TS1 behaviour). Floor sleep (ESTIMATE): Energy +11/h (half a rate-1 bed), Comfort -20/h (overrides normal comfort decay), wake at Energy >= 20 or if Bladder <= -95. Warning state at Energy <= -70: yawning, thought bubble with a bed icon, autonomy overrides player commands (ESTIMATE).

**Implementation:** In decayTick: if (!asleep && energy <= -100) cancel the queue and push the 'collapse' interaction (non-cancellable) with setMotiveChange(energy,+11/h) and setMotiveChange(comfort,-20/h).

Sources: https://strategywiki.org/wiki/The_Sims/Needs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf


### Critical Bladder: accident

When Bladder empties, the Sim wets itself, leaving a puddle on the floor (negative Room until mopped). Hygiene drops sharply and Bladder resets. Wright's prototype: if Bladder < -97, log 'You have wet your bed' if asleep or 'You have soiled the carpet' if awake, then Bladder = 90. StrategyWiki lists 'urinating on the floor when the Bladder meter is empty' as how the need gets 'satisfied'.

**Numbers:** Trigger Bladder <= -100 (prototype -97). Reset Bladder to 90 (prototype) or 100. Hygiene penalty ESTIMATE: set Hygiene = min(Hygiene - 40, -50). Puddle object RoomImpact -15 (ESTIMATE); asleep: bed becomes 'dirty' (-10 Room, ESTIMATE). Optional embarrassment: Social -10 if another Sim is in the room (ESTIMATE).

**Implementation:** if (bladder <= -100) { spawnPuddle(sim.tile); bladder = 90; hygiene = Math.min(hygiene-40,-50); playAnim('accident'); notify(PT-BR message) }

Sources: https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://strategywiki.org/wiki/The_Sims/Needs, https://www.gamespot.com/articles/the-sims-walkthrough/1100-6086937/


### Critical Hunger: starvation and death

In the original game, adults, children and pets can die of starvation (pets usually run away first). Death is not instant: the fandom wiki states Sims 'will only starve to death 18 hours after the motive reaches zero' (empty bar), flagged 'confirmation needed'. A 2026 deaths guide says the Sim dies if Hunger stays empty for 'some hours', and only on a residential lot. Wright's prototype: if Hunger < -99, log 'You have starved to death' and reset Hunger to 80. In TS1 the social worker only takes neglected babies; it does not take children for hunger (that is TS2).

**Numbers:** Trigger: Hunger <= -100 starts a starvation timer. Death at 18 continuous sim-hours at -100 (fandom, unconfirmed). Proposed warnings (ESTIMATE): at -70 a hunger thought bubble plus autonomous override; at -100 a 'starving' alert, then alerts at 6 h and 12 h; the timer resets if Hunger rises above -90. Prototype threshold -99.

**Implementation:** if (hunger <= -100) sim.starveTicks++; else if (hunger > -90) sim.starveTicks = 0; if (sim.starveTicks >= 18*30) killSim('starvation'). Keep the death event original (your own visuals and wording).

Sources: https://sims.fandom.com/wiki/Starvation, https://simscommunity.info/2026/07/22/the-sims-1-deaths/, https://sims.fandom.com/wiki/Social_worker, https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://strategywiki.org/wiki/The_Sims/Needs


### Critical Hygiene, Fun, Social, Comfort, Room

Shipped TS1 has no death or forced action for these. They act through mood, autonomy and social reactions. Hygiene: low hygiene gives stink visuals and other Sims react badly to social interactions. The prototype forced a 'mandatory bath' at Hygiene < -97, resetting it to 80. Fun: low fun makes Sims seek entertainment and is one of the motives that makes some interactions unavailable. Social: lonely thought bubbles and a heavy mood impact (GameSpot ranks Social and Fun right after the survival motives). Comfort: Sims autonomously seek seats. Room: 'the only need where Sims won't complain when it's red', but it still affects mood. GameSpot calls Room unimportant on its own but says it affects the other seven.

**Numbers:** Proposed (ESTIMATE): Hygiene <= -60: stink effect, social acceptance -25 percentage points, Room -5 for others in the same room; Hygiene <= -97: optional prototype-style forced wash. Fun <= -50: refuses skill/'serious' actions (see the refusal entry). Social <= -70: 'lonely' bubble, autonomy adds +50% weight to socials. Comfort <= -70: refuses to stand for long actions (e.g. cooking) unless player-forced.

**Implementation:** Implement as status flags derived from motives each tick (sim.flags.stinky etc.) that feed social acceptance, animation picks and autonomy weights.

Sources: https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://www.gamespot.com/articles/the-sims-walkthrough/1100-6086937/, https://www.thegamer.com/sims-1-all-needs-motives-keep-happy/, https://sims.fandom.com/wiki/Motive


### Refusing commands and autonomous override

When needs are too low, a Sim shows a thought bubble with the needed motive's icon, gestures, and refuses several actions. Some interactions become unavailable in a bad mood or when Hunger, Energy, Fun or Bladder is low (fan wiki). On the console version, 'too depressed to study' appears when overall mood is below 50% of the bar and requires that nothing is critical. Even with free will off, Sims whose motives drop very low take care of them autonomously if they can. They interrupt their queue to complain (a mod exists to stop this 'motive fail tantrum or whining'). Exact TS1 thresholds are not documented, so the thresholds here are ESTIMATE.

**Numbers:** Proposed (ESTIMATE): (1) Skill or 'serious' actions (study, exercise, paint, chess, practise speech) are refused if Mood < 0 or any of Hunger/Energy/Bladder/Fun < -50. (2) Any non-need player command is refused if Hunger, Energy or Bladder < -70 or Mood < -60; the Sim does a wave-off animation and shows the worst motive in a thought bubble. (3) Hard override: if any of Hunger/Energy/Bladder <= -80, the Sim cancels cancellable player-queued actions and runs Find Best Action restricted to that motive, even with free will off. (4) Social acceptance chance = clamp(50 + targetMood/4 + relationship/2 + (nice-5)*3, 5, 95)%.

**Implementation:** Give each interaction a 'category' (need/skill/fun/social/work) and a canRun(sim, byPlayer) check implementing these thresholds. On refusal, remove it from the queue, play 'refuse' and show a speech bubble with the blocking motive icon.

Sources: https://sims.fandom.com/wiki/Motive, https://www.supercheats.com/playstation2/questions/thesims/21763/my-sim-always-says-that-he-s-t.htm, https://modthesims.info/d/479163/no-motive-fail-tantrum-or-whining.html, https://db.modthesims.info/showthread.php?t=652334


### Work attendance, mood and job performance

In the original game the carpool arrives 1 hour before the shift. Missing it (asleep, busy, or not sent) is the only way to skip a day. There are no performance bars, only five hidden levels: Dismal, Poor, Average, Good, Excellent. Poor or Dismal risks demotion, and a Sim is fired only after missing 2 consecutive days. Job performance rises when a Sim goes to work in a good mood and can fall in a poor mood (documented series-wide on the fan wiki). There is no documented TS1 mechanic where Sims refuse to go to work; sleeping through the carpool is the usual failure.

**Numbers:** Carpool at shiftStart - 1 h, waits about 1 h (ESTIMATE). Fired after 2 consecutive misses. Proposed daily performance delta (ESTIMATE, performance in -100..100): perf += mood >= 0 ? 5 + mood/10 : -5 + mood/10, plus -20 if any motive is <= -80 at departure. Levels: < -60 Dismal, < -20 Poor, < 20 Average, < 60 Good, else Excellent. Promotion check needs Good+ plus skill and friend requirements. Optional refusal (not in TS1): if Mood <= -80, 50% chance the Sim stays home sulking (counts as a miss).

**Implementation:** At carpool arrival, if the Sim is awake and not in a non-interruptible action, auto-walk to the car. Record mood at departure and apply the performance delta when the shift ends. Track consecutiveMisses.

Sources: https://sims.fandom.com/wiki/Job_performance, https://sims.fandom.com/wiki/Career, https://sims.fandom.com/wiki/Carpool


### Will Wright's 1997 prototype motive simulator (Motive.c), full math

Source: Wright's prototype motive simulator (Macintosh HD:XmotiveHarness:src:Motive.c, written 1/23/97, printout dated 1/28/97, published by Don Hopkins). All values are floats in [-100,100] and SimMotives() runs once per 2-minute tick. Init: everything 0, then Energy 70, Alertness 20, Hunger -40, clock 08:00. ENERGY (A = Alertness, positive awake, negative asleep): if E>0 { A>0 ? E -= A/100 : E -= (A/100)*((100-E)/50) } else { A>0 ? E -= (A/100)*((100+E)/50) : E -= A/100 }. If Hunger rose since last tick, E += deltaHunger/4. COMFORT: if B<0 C += B/10 (max -10); if Hy<0 C += Hy/20 (max -5); if Hu<0 C += Hu/20 (max -5); then C -= C^3/10000 (cubic pull toward zero). HUNGER: tem = ((A+100)/200)*((Hu+100)/100); Hu -= tem; if Stress<0, Hu += (S/100)*((Hu+100)/100); if Hu < -99 then 'You have starved to death', Hu = 80. HYGIENE: A>0 ? Hy -= 0.3 : Hy -= 0.1; if Hy < -97 then 'mandatory bath', Hy = 80. BLADDER: A>0 ? B -= 0.4 : B -= 0.2; if Hunger rose, B -= deltaHunger/4; if B < -97 then 'wet your bed' (asleep) or 'soiled the carpet', B = 90. ALERTNESS: tem = A>0 ? (100-A)/50 : (A+100)/50; if E>0 { A>0 ? A += (E/100)*tem : A += E/100 } else { A>0 ? A += E/100 : A += (E/100)*tem }; A += (Entertained/300)*tem; if B < -50, A -= (B/100)*tem. STRESS: S += C/10 + Ent/10 + Env/15 + Social/20; if asleep S /= 3; S -= S^3/10000; if S<0 and two rolls of (SRand(30)-100) > S both pass, then 'You have lost your temper' and S += 20. ENTERTAINED: if asleep Ent /= 2. Environment and Social have empty sections (set by objects). Finally clamp all 16 to [-100,100] and copy them to oldMotive for the delta tests. Note: the GitHub motives.c transcription omits 'Motive[mHunger] -= tem;' and miswrites one energy branch. Follow the scanned PDF.

**Numbers:** Tick 2 min; DAYTICKS 720; WEEKTICKS 5040. Hygiene -0.3/-0.1 per tick awake/asleep; Bladder -0.4/-0.2; food: Energy +food/4, Bladder -food/4. Failure resets: Hunger 80, Hygiene 80, Bladder 90; thresholds -99/-97/-97. Temper: two SRand(30) rolls, +20 stress. SimJob: +9 h, E = 0.3(E+100) - 100, Hu = -60+rand20, Hy = -70+rand30, B = -50+rand50, A = 10+rand10, S = -50+rand50.

**Implementation:** Port as a pure function step(m, old, rng) over a Float32Array(16). It makes a good 'debug' or alternative simulation mode and shows the feedback-loop style of design: Alertness acts as a continuous sleep/wake variable driven by Energy, Fun and Bladder.

Sources: https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://github.com/alexcu/motive-simulator/blob/master/motives.c, http://www.donhopkins.com/home/images/Sims/, https://waxy.org/2008/02/the_soul_of_the/


### Prototype happiness aggregation (Physical/Mental curves and long-term happiness)

Wright's prototype computes happiness hierarchically. Physical = f(avg(Energy, Comfort, Hunger, Hygiene, Bladder)). Mental = f((Physical + 2*Stress + Environment + Social + Entertained)/5). The running 'tem' carries the mapped Physical value into the Mental sum, and stress counts double. f is a 'squared curve' that exaggerates deviations from 0: f(x) = x>0 ? 100 - (100-x)^2/100 : (100+x)^2/100 - 100, so f(50) = 75 and f(-50) = -75. HappyNow = (Physical+Mental)/2, which became the shipped 'Mood' slot. HappyDay = (HappyDay*719 + HappyNow)/720, a 1-day EMA. HappyWeek = (HappyWeek*5039 + HappyNow)/5040, a 1-week EMA. HappyLife = (HappyLife*9 + HappyWeek)/10 per tick. The shipped game keeps the HappyLife/Week/Day slots.

**Numbers:** f(x): +-25 maps to +-43.75, +-50 to +-75, +-75 to +-93.75. EMA windows 720 and 5040 ticks; life smoothing 0.9/0.1 per tick.

**Implementation:** Use the shipped-style weighted mood for gameplay, and keep the prototype EMAs for a 'life satisfaction' stat: happyDay += (mood - happyDay)/720 per tick, happyWeek += (mood - happyWeek)/5040. Use them for achievements, aging summaries or an original 'aspiration' score.

Sources: https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMMotive.cs


## AUTONOMY

The Sims (2000) runs autonomy through "smart objects." Behavior lives in the objects, not in the Sim. Each object has a tree table (TTAB) listing its interactions, called advertisements. Each interaction carries a per-motive advertisement made of three values: minimum, delta (range) and a personality/skill modifier. It also has a check tree, an action tree, flags, a distance-attenuation code and a joining index. When a Sim has nothing queued and free will is on, the Find Best Action primitive runs:
1. It turns each of the Sim's 9 scored motives into an "effective motive" through piecewise-linear contribution curves. The curves are steep at low values and flat above a per-motive cutoff. These curves are the documented "insistence" mechanism: a full motive contributes nothing and a starving one dominates.
2. "Happy" is the average of the effective motives. In TS1.0 the weights are all equal (1/9); Hot Date and later added happy-weight curves.
3. For every usable autonomous interaction, it computes Happy(after applying the ads) minus Happy(before).
4. It divides that by (1 + attenuation × distance in tiles).
5. It drops scores at or below 1e-7 (1e-6 if the Sim is seated).
6. It keeps the top 4 candidates whose object is not in use (unless the interaction is joinable) and picks one at random, weighted by score. The weighting is skipped when the top candidate's interaction has the AutoFirstSelect flag.
7. It queues the result at priority 2 (Autonomous). Player commands use priority 50 (UserDriven), so they always outrank and interrupt autonomy.

Interactions are behavior trees run per tick. A typical one routes to a routing slot (SLOT), animates, and starts a per-hour motive change capped at a maximum value. It then loops on "Idle for Input" until the motive is full, a time limit passes, or the Sim is notified of a cancel or a higher-priority queue item, and finally exits gracefully and clears its motive changes.

Socials use the same pipeline. Every Sim is itself an object whose TTAB holds the social interactions, advertising Social and Fun with personality modifiers. Check trees gate them by age, relationship and mood and can rewrite the ad values at runtime. The chosen social then pushes a receiving interaction onto the target Sim's queue.

Evidence comes in four tiers:
- (A) Reverse-engineered engine code from FreeSO/Simitone, which their authors calibrated against TS1.0. I read it directly from GitHub. Its comment block on VMFindBestAction.cs is the best public description of the algorithm.
- (B) Quotes from Jamie Doornbos' October 1997 Maxis "Find Best Action" design document, as reproduced in Don Hopkins' public repo SimHacker/moollm, plus Will Wright's 1996 Dollhouse demo quotes.
- (C) Community and modding documentation (TTAB editors, ModTheSims, GMTK's analysis), mostly seen through search snippets because most non-GitHub sites could not be fetched from this environment.
- (D) ESTIMATE values I propose where nothing is documented. These include the actual curve point tables, which are game data in global.iff STR# 501–504 and are not public, the advertisement magnitudes, the autonomy cadence and the lockouts.

Nothing below copies EA code or assets. It describes rules and numeric behavior so an original JS game can reproduce the feel.


### Smart objects and the interaction table (TTAB) data model

Every object, and every Sim since Sims are objects too, carries a tree table. Each entry is one interaction ('advertisement') with these fields:
- Name string.
- Action tree id: the behavior the Sim runs.
- Check tree id: an availability test that may also rewrite the ads.
- Motive advertisement entries, one per motive index (TS1 has 16 motive slots). Each entry has EffectRangeMinimum (int16), EffectRangeDelta (int16) and PersonalityModifier (uint16 index into a 'vary by' table).
- Flags.
- AttenuationCode with AttenuationValue (float, used when code = custom).
- AutonomyThreshold.
- JoiningIndex: lets a second Sim join an interaction on an occupied object.

Only interactions with at least one motive entry whose delta is non-zero are autonomy candidates (FreeSO builds 'AutoInteractions' this way). An interaction with all-zero ads can only be ordered by the player. This is why TS1 Sims never autonomously pay bills, look for jobs, exercise or try for a baby.

Flags (TS1 meaning):
- AllowVisitors (bit 0)
- Joinable (bit 1)
- RunImmediately (bit 2)
- AllowConsecutive (bit 3)
- NoChild (bit 4)
- NoDemoChild (bit 5)
- NoAdult (bit 6)
- Debug (bit 7)
- AutoFirstSelect (bit 8)
- AllowCats/AllowDogs (bits 9/10, Unleashed)
- MustRun

Will Wright (1996 Dollhouse demo): 'in the person's data structure, there's no knowledge of any objects in this environment whatsoever. The object itself contains the descriptions of how a person interacts with it, and why, what the animation sequence would be.' Also: 'the objects are all kind of advertising: If you're hungry, eat me!'

**Numbers:** Ad fields: min int16, delta int16, personality index uint16, one triple per motive slot (16 slots in TS1). Scored motives: Energy, Comfort, Hunger, Hygiene, Bladder, Mood, Room, Social, Fun. Motive range is -100..+100. Attenuation codes: 0 = custom (use the float), 1 = none, 2 = low, 3 = medium, 4 = high. TS2 community docs give the TTAB 'Autonomy' field as 100 (0x64) = not autonomous and 50 (0x32) = autonomous. Treat the TS1 meaning of AutonomyThreshold as unknown.

**Implementation:** In JS define objects as plain data. A definition looks like {id, name, interactions:[{id, label, check:fn|tree, action:tree, ads:{hunger:{min,delta,vary}, ...}, atten:'low'|'medium'|'high'|'none'|number, flags:{visitors, joinable, autoFirst, mustRun, runImmediately, noChild, noAdult}, joinIndex}], slots:[...], entry:{init, main, queueSkipped, cleanup}}. Precompute autoInteractions = interactions.filter(i => Object.values(i.ads).some(a => a.delta !== 0)). Keep an index of objects that have autonomy candidates. Sims are entities with the same shape, so socials live on the Sim definition.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/TTAB.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMObjectQueries.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-will-wright-microworlds-1996.md, https://en.wikipedia.org/wiki/The_Sims_(video_game), https://modthesims.info/wiki.php?title=TTAB, http://www.moreawesomethanyou.com/smf/index.php?topic=1575.0


### Advertised amount per motive (min / delta / personality or skill modifier)

Each motive entry promises an amount of motive gain. The personality index selects a 'vary by' variable and maps it to a multiplier p.

Vary-by indices:
- 0: none (p = 1)
- 1: Nice
- 2: Nice inverted (grouchy)
- 3: Active
- 4: Lazy
- 5: Generous (a hidden or unused trait)
- 6: Generous inverted
- 7: Playful
- 8: Serious
- 9: Outgoing
- 10: Shy
- 11: Neat
- 12: Sloppy
- 13: cleaning skill (unused)
- 14: cooking
- 15: charisma
- 16: mechanical
- 17: gardening (unused)
- 18: music (unused)
- 19: creativity
- 20: literacy (unused)
- 21: body
- 22: logic

Traits and skills are stored as 0..1000. For trait indices (1..12), odd indices give p = trait/1000 and even indices give p = 1 - trait/1000. For skills (13..22), p = 2 × skill/1000, a 0..2 range.

FreeSO's calibrated implementation:
1. If delta == 0 and min > 0, treat the ad as 0..min.
2. max = min + delta.
3. If min != 0 and the Sim's current motive > min, skip this motive entry. In other words, a non-zero minimum acts as a 'only advertise below this level' gate. FreeSO marks this as 'TODO: VERIFY'.
4. Advertised amount = max × p.

Modding docs (IFF Snooper tutorial) describe the editor fields as 'minimum' and 'range'. Their example: Social min 0, range 20 makes an object appear to satisfy Social. Setting every range to 0 removes all advertising.

Check trees can override min, delta or personality per Sim at evaluation time through the 'tree ad' variable scope. Examples: scale a TV's Fun ad by channel quality, or a social's Social ad by relationship. Doornbos 1997: the check tree's second purpose is 'to modify the motive advertisements to reflect how much the interaction can affect the particular person considering it.'

**Numbers:** Personality and skills are 0..1000 internally (UI 0..10 points × 100). p for a trait is 0..1 (inverted = 1 - x). p for a skill is 0..2. Recommended cleaner rule for our game (ESTIMATE): amount = min + delta × p, so min is the guaranteed floor and delta is the personality-scaled part.

Example ads for the original game (all ESTIMATE, in motive points on the -100..100 scale):
- Fridge 'Snack': Hunger 0+20
- Fridge 'Meal' (cook): Hunger 30+30 varying by cooking skill
- Toilet 'Use': Bladder 70
- Shower: Hygiene 40+30 varying by Neat
- Bathtub: Hygiene 40, Comfort 20
- Bed 'Sleep': Energy 80, Comfort 10
- Sofa 'Sit': Comfort = 10..40 by object quality
- TV 'Watch': Fun 10+20 varying by Playful (by TV price)
- Bookshelf 'Read': Fun 10+15 varying by Serious
- Pinball/game: Fun 20+20 varying by Playful
- 'Clean' (dirty dish or puddle): Room 10+30 varying by Neat
- Sim 'Talk': Social 10+30 varying by Outgoing
- Sim 'Joke': Social 10, Fun 0+20 varying by Playful

**Implementation:** function adAmount(sim, ad){ let p = 1; if (ad.vary) { const v = sim.traits[ad.vary.key] ?? sim.skills[ad.vary.key]; p = ad.vary.skill ? 2*v/1000 : (ad.vary.inverted ? 1 - v/1000 : v/1000); } return ad.min + ad.delta*p; }

Let check functions return either false (unavailable) or an override map, for example {social:{delta: 10 + rel/4}}. Pass auto=true to the check during autonomous evaluation (TS1 passes 1 in parameter 0) so a check can hide an interaction from autonomy while keeping it in the player's pie menu.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMMemory.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md, https://woobsha.com/diy-TTABTutorialMac.htm


### Motive contribution (attenuation/insistence) curves

Before scoring, each raw motive m (-100..100) is mapped through a per-motive 'interaction score' curve to an effective motive. In the original the curves are stored in global.iff as strings of points '(x;y) (x;y) ...', which are piecewise-linear and clamped at both ends:
- STR# 501: adult interaction-score curves, one per scored motive in the order Energy, Comfort, Hunger, Hygiene, Bladder, Mood, Room, Social, Fun.
- STR# 502: adult happy-weight curves.
- STR# 503 / 504: child versions.

FreeSO describes the shape: 'These curves generally make motive changes more evident at lower values, and cap them at a specific value. This prevents people from considering sleeping at 50% energy, but also allows other motives like fun to use a much higher cap.'

Doornbos 1997: Find Best Action 'uses a cutoff point for each motive above which additional motive value contributes nothing.' He gives the consequence: 'An interaction that provides for only one motive will have an overall score of zero if that motive is already over the cutoff point.' He also notes 'cutoff values are probably part of a person's personality (TBD).'

GMTK's analysis: for hunger, 'the fridge's score will be reduced to almost zero when the Sim is full, but will be extremely high when the Sim is starving.' Bladder, hygiene and energy get similar curves, while fun, social and comfort keep mattering as the Sim gets happier.

With FreeSO's marginal scoring (see the scoring mechanic), the curve's slope at the current motive is the insistence multiplier.

The real point tables are not public. Below is a proposed ESTIMATE set that reproduces the documented behavior.

**Numbers:** ESTIMATE adult curves in TS1 point format (y = effective motive). The slope of each segment is the insistence.
- Hunger: (-100;-255) (-70;-135) (-40;-60) (0;0) (40;30) (100;30). Slopes 4.0 / 2.5 / 1.5 / 0.75, cutoff 40.
- Energy: (-100;-235) (-70;-115) (-40;-40) (0;0) (100;0). Cutoff 0 = 50% bar, so no autonomous sleep above half energy.
- Bladder: (-100;-300) (-70;-150) (-40;-60) (0;0) (30;15) (100;15). Cutoff 30.
- Hygiene: (-100;-168) (-70;-93) (-40;-40) (0;0) (40;20) (100;20). Cutoff 40.
- Comfort: (-100;-123) (-70;-78) (-40;-40) (0;0) (60;30) (100;30). Cutoff 60.
- Social: (-100;-145) (-70;-85) (-40;-40) (0;0) (70;52) (100;52). Cutoff 70.
- Fun: (-100;-145) (-70;-85) (-40;-40) (0;0) (90;72) (100;72). Cutoff 90.
- Room: (-100;-100) (0;0) (80;40) (100;40).
- Mood: (-100;-100) (100;100), linear with no cap.

Child curves (ESTIMATE): Fun and Social slopes ×1.5, Energy cutoff +20, Hygiene cutoff -20 (kids care less about hygiene).

The curve evaluation itself is confirmed: linear interpolation between neighbouring points, clamped to the first and last y outside the range. FreeSO caches the curves as integer lookups from -100 to 100.

**Implementation:** Store each curve as a sorted array of [x,y] points. Evaluate with lerp and clamp at the ends. Precompute a 201-entry Float32Array per motive for speed (index m+100). Keep the curves in a data file so designers can tune them, and give each life stage its own curve set. A debug overlay that plots each curve with the Sim's current motive marked makes tuning much easier.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/WorldGlobalProvider.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.common/TS1/TS1Curve.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md, https://gmtk.substack.com/p/the-genius-ai-behind-the-sims


### Happiness function used for scoring (and happy weights)

Happy = Σ_i w_i × curve_i(m_i) over the 9 scored motives: Energy, Comfort, Hunger, Hygiene, Bladder, Mood, Room, Social, Fun. The weights are normalized to sum to 1. In TS1.0 all weights are equal (1/9).

From Hot Date onward, Maxis added 'happy weight' curves (STR# 502/504) that map each raw motive to a weight, so a low motive gets more weight. The formula FreeSO reconstructed in its permutation test is Happy = Σ curve_i(m_i) × W_i(m_i) / Σ W_i(m_i).

Doornbos 1997: 'A simple measure of happiness might be the average of all a person's motives. Find Best Action takes this basic approach, but also uses a cutoff point for each motive.'

Mood itself is a motive. In TS1's decay code, Mood = (Hunger + Comfort + Hygiene + Bladder + Energy + Fun + Social + Room) / 8, recomputed every 2 sim minutes.

**Numbers:** TS1.0 weights are 1/9 each. Mood = sum of 8 motives / 8. Optional Hot Date-style weight curve (ESTIMATE): W(m) = 3 at m = -100, 2 at m = -50, 1 at m >= 0, applied to physiological motives (Hunger, Energy, Bladder, Hygiene). Leave Fun, Social, Comfort and Room at a flat W = 1.

**Implementation:** function happy(m){ let s=0; for (const k of SCORED) s += W[k](m[k]) * C[k](m[k]); return s / sumW(m); } Cache baseHappy once per evaluation. When scoring an interaction, update only the advertised motives (subtract their old contribution, add the new one). If you use weight curves, the denominator also changes, so recompute it fully.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/WorldGlobalProvider.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md


### Interaction score formula

Doornbos 1997: 'The overall score of a given interaction is obtained by scoring the person twice: once with their current motive values as they are, and again with their current motive values augmented by the motive advertisements. The former is subtracted from the latter.' In formula form: raw = Happy(m + ads) - Happy(m).

FreeSO's TS1.0-calibrated version: for each advertised motive i, raw += w_i × [curve_i(m_i + amount_i/1000) - curve_i(m_i)]. FreeSO notes: 'Motive delta is divided by 1000 for some reason... it matches numbers with TS 1.0.' Because of that /1000 scaling, the score is effectively marginal utility, curve slope × ad × weight. Ads on motives sitting in a flat (above-cutoff) region score exactly 0 and are then discarded by the threshold. Ads can be negative, for example coffee lowering Bladder or exercise lowering Hygiene. A negative ad subtracts from the total, but it only matters when the motive is on a sloped part of its curve.

Final = raw / (1 + atten × distance). Candidates with final <= minScore are ignored, so negative totals are never picked.

There are two ways to implement this:
(a) Faithful mode: divide by 1000 and use the 1e-7 / 1e-6 thresholds.
(b) Design-doc mode: use the full amount, which saturates at the cutoff, and rescale the thresholds.
Mode (b) rewards whichever object fills the need most, up to the cutoff. Mode (a) is linear in ad size but steered by the slope.

**Numbers:** minScore = 1e-7 for standing Sims (visitors and family), 1e-6 when Posture > 0 (seated). Both come from global.iff constants (FCNS 2), and the higher threshold gives seated Sims inertia. In design-doc mode, use thresholds of 0.01 standing / 0.1 seated (ESTIMATE).

Worked example with the ESTIMATE curves, faithful mode: Hunger = -50 (slope 2.5), Snack ad +20, 8 tiles away, attenuation low.
- raw = (1/9) × 2.5 × 0.02 ≈ 0.00556
- final = 0.00556 / (1 + 0.1 × 8) ≈ 0.00309
The same Sim with Hunger = 60 (flat region) scores 0 and the snack is ignored.

**Implementation:** function score(sim, obj, inter, ads, mode){ let s = 0; for (const [k,a] of ads){ if (a.min && sim.m[k] > a.min && a.delta) continue; const amt = adAmount(sim,a) / (mode==='faithful' ? 1000 : 1); s += w[k] * (C[k](clamp(sim.m[k]+amt)) - C[k](sim.m[k])); } const d = dist(sim, obj); return s / (1 + atten(inter, sim) * d); }

Recommendation: implement both modes behind a flag, start with faithful mode for authenticity, and tune the curves visually.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md


### Distance attenuation

Doornbos 1997: 'Once the overall score of an interaction is known, the distance from the person to the object is used to dampen the score: attenuated_score = score / (attenuation * distance + 1).' FreeSO describes it the same way: 'Score / (1 + Attenuation × Distance), applied to the distance from base happy.'

Distance is the straight-line distance between the Sim's position and the object's position (the leader tile of multi-tile objects), measured in tiles. Each floor of height difference counts as 20 tiles (320/16 in internal units). It is not path length.

Modding tutorials describe the presets as a 'yelling range': none or low means the whole lot, medium means within the house, and high means the same room only. Visitors use a much weaker table, so guests wander the whole lot to reach the best object.

**Numbers:** Attenuation per tile, residents: none = 0, low = 0.1, medium = 0.3, high = 0.6, custom = the float value stored on the interaction. Visitors: none = 0, low = 0.01, medium = 0.02, high = 0.03. Each floor of height difference adds 20 tiles. At 10 tiles a score is divided by 2 (low), 4 (medium) or 7 (high).

**Implementation:** Use Euclidean tile distance plus 20 × |floor difference|. That is cheap and matches the original. Optionally precompute room-to-room path lengths if you want path-aware dampening (an extension, not original behavior). Assign high attenuation to 'background' objects such as decorative fun items so Sims don't cross the house for small gains, and none or low to essentials such as the toilet, fridge and bed.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/TTAB.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md, https://woobsha.com/diy-TTABTutorialMac.htm, https://modthesims.info/wiki.php?title=TTAB


### Candidate culling before scoring

For each object in the lot's 'has autonomy' list:
1. Skip it if it is outside the world, disabled, or has no tree table.
2. Evaluate a multi-tile object once, through its group leader.
3. If the object has the Occupied flag, consider only interactions that some interaction's JoiningIndex points at (joinable activities such as a second Sim watching TV or joining a hot tub).
4. Run the permission flags: visitors need AllowVisitors; age flags (NoChild / NoAdult); pets need the pet flags.
5. Run the check tree with auto = 1. It returns false to hide the interaction or true to keep it, possibly emitting several variants with their own names and ad overrides.
6. For pets, a stray (unadopted) pet only considers other Sims and only outdoors.

Doornbos 1997 also lists culling by the 'occupied flag', a 'non-zero use count', 'no tree table' and the self (with a TBD for reflexive interactions). He notes 'interactions may also need to be culled by previous failure (TBD)'.

FreeSO leaves open TODOs to lock out interactions used in the last few sim hours and for special social logic. These look like real TS1 behaviors it has not reproduced yet.

**Numbers:** Use-count rule: when building the top-N list, an object with UseCount > 0 is accepted only if the interaction is joinable. Lockout after failure or repetition (ESTIMATE for our game):
- An interaction whose route failed is not autonomously chosen again on the same object for 60 sim minutes.
- The same interaction on the same object is not re-chosen within 30 sim minutes of finishing, unless its motive is still below -50.

**Implementation:** Build candidates = [] by looping over objects with autonomy. Keep a per-Sim Map of lockouts {key: objId+':'+interId, until: tick} and skip locked keys. Run checks as pure functions over a read-only snapshot, so evaluating many candidates is side-effect free. The original runs check trees in a temporary 'check' thread for the same reason. Exclude the Sim itself unless the interaction is flagged reflexive.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md


### Selection with randomness: weighted pick among the top 4

Valid candidates are sorted by final score in descending order. The list is cut to the first 4 whose object is free (UseCount == 0) or whose interaction is joinable.

If the best candidate's interaction has the AutoFirstSelect flag, the top one is taken deterministically. Otherwise one of the up to 4 is chosen with probability score_i / Σ score (a roulette wheel using a 0..10000 random number).

The 1997 design doc described qsort followed by taking the best. Don Hopkins (who programmed on the game) explains the shipped 'find best N' dither: score all the ads, then pick randomly among the top N, so behavior looks organic and not robotic. The scores are only approximations, and dithering avoids repetitive loops. FreeSO also has a commented-out line that would add uniform jitter of ±15 to each score. It is not active.

**Numbers:** N = 4. P(pick i) = s_i / Σ_{j in top 4} s_j. Random resolution is 1/10000. Ties are broken by sort order. The ±15 jitter is NOT active in FreeSO.

**Implementation:** const top = sorted.filter(c => c.obj.useCount===0 || c.inter.joinable).slice(0,4); if (!top.length) return null; if (top[0].inter.autoFirst) return top[0]; let r = rng()*top.reduce((a,c)=>a+c.score,0); for (const c of top){ r -= c.score; if (r<=0) return c; }

Use a seeded deterministic RNG (for example mulberry32) so replays and saves stay reproducible. FreeSO uses the VM context RNG for the same reason.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/SimHacker/moollm/blob/main/designs/korz/korz-prime/examples/sims-advertisements.md, https://news.ycombinator.com/item?id=14997725, https://gmtk.substack.com/p/the-genius-ai-behind-the-sims


### Personality and skill effects on autonomy

Personality enters autonomy in three places:
(1) Ad scaling through the vary-by index: for example, a Playful Sim gets more Fun from pinball, a Neat Sim more Room from cleaning, an Outgoing Sim more Social from talking. Skill-varying ads can double the advertised amount (p up to 2): for example, a cooking-skilled Sim values cooking a meal more.
(2) Motive decay rates depend on personality (TS1 code): Social decays faster for Outgoing Sims, and Comfort decays slower for Active Sims. This changes how often those motives fall into the steep part of their curves.
(3) Check trees may branch on traits, for example only Sims above some Nice level autonomously do something kind. This is game-data dependent.

Doornbos also anticipated per-personality cutoffs (TBD in 1997).

**Numbers:** p = trait/1000 or 1 - trait/1000; skills give 2 × skill/1000.

TS1 decay coupling, per 2 sim minutes:
- Social: 0.055 + 0.000125 × Outgoing(0..1000), which is 1.65/h at Outgoing 0 and 5.4/h at 1000.
- Comfort: 0.4 if Active > 666, 0.6 if Active < 666, 0.5 if exactly 666. That is 12/h vs 18/h.

Suggested vary-by mapping for our original game (ESTIMATE):
- Fun from games/TV: Playful
- Fun from books/chess: Serious (inverted Playful)
- Room from cleaning: Neat
- Social from talk/phone: Outgoing
- Hug/compliment ads: Nice
- Exercise Fun: Active

**Implementation:** Store traits as 0..1000 internally even if the UI shows 0..10. Give each interaction's ad a 'vary' key such as {trait:'playful', inverted:false} or {skill:'cooking'}. Show the effect in a debug tooltip (for example 'Fun +18, playful 0.9') so players and designers can read why a Sim chose something.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md, https://sims.fandom.com/wiki/Personality


### When autonomy runs (free will loop and cadence)

Each Sim runs a 'main' entry-point tree forever.
1. It calls 'Idle for Input' with Allow Push, which checks every tick whether a queued interaction can start.
2. If the queue is empty, or holds nothing with priority above the current one, and free will is on, the main loop calls Find Best Action.
3. Find Best Action exits immediately if a queued item already has higher priority than the current interaction. Otherwise it scores the candidates and enqueues the winner at priority 2.
4. If nothing qualifies (every motive above its cutoff, or every score under the threshold), the Sim idles (idle animations) and retries later.

TS1's Options has a Free Will on/off switch. With it off, the player's Sims take no autonomous actions, while NPCs and visitors still do. Even with free will on, some actions are never autonomous because their interactions advertise nothing.

The main-loop timing lives in game data (the person's BHAVs) and is not documented publicly. The cadence below is ESTIMATE.

**Numbers:** Time base (confirmed): TS1 runs 30 VM ticks per sim minute, and 1 sim minute = 1 real second at normal speed. 'Idle for Input' with Allow Push re-checks the queue every tick.

ESTIMATE cadence for our game:
- Re-run autonomy when the queue is empty, after a random idle of 30–90 ticks (1–3 sim minutes).
- For the currently selected (player-controlled) Sim, wait 5 sim minutes after the last player command before free will acts. The Sims 4 uses a similar default 5-sim-minute delay.
- If no candidate is found, retry every 60 ticks.
- Free-will setting: Off (selected household never autonomous), Normal (as above), High (no 5-minute delay).

**Implementation:** Inside sim.update(tick), when queue.length===0 and tick >= sim.nextAutonomyTick and freeWillAllowed(sim): const c = findBestAction(sim); if (c) enqueue(sim, makeAction(c, PRIORITY.AUTONOMOUS)); else sim.nextAutonomyTick = tick + 60;

Throttle autonomy so only K Sims evaluate per tick (for example, round robin) to keep frame time flat. Scoring 50 objects × 5 interactions × 8 Sims is cheap, but check functions may not be.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMIdleForInput.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://en.wikipedia.org/wiki/The_Sims_(video_game), https://www.patreon.com/posts/96253463


### Action queue and priorities (player commands vs autonomous actions)

Each Sim has one ordered action queue. Each item records the target object, action tree, check tree, arguments, icon owner, flags, a unique id, a mode (Normal / ParentIdle / ParentExit / Idle) and a priority. The front item at index ActiveQueueBlock is the running one.

Insertion rules (TS1 behavior per FreeSO):
- An empty queue just appends.
- Otherwise the new item is placed after the last item whose priority >= its own. Equal-priority items therefore run first-in-first-out, and higher-priority items jump ahead of lower ones.
- In TS1, after inserting, every queued item that follows the new one is cancelled (FreeSO calls it a queue skip and says it verified this in TS1). In practice, when the player queues a command, the pending autonomous filler behind it is dropped.
- RunImmediately items are injected on top of the current interaction at once. They are used for reactions.

Autonomous items (priority 2) are compared as if they were priority 1, so a newly found autonomous action or any player command can displace a running autonomous one. A player command never yields to autonomy.

**Numbers:** Priorities: Idle = 0, Autonomous = 2, ParentExit = 30, ParentIdle = 40, UserDriven (player) = 50, Maximum = 100. 'Inherited' copies the caller's current priority, minimum 1. Queue cap: FreeSO uses MAX_USER_ACTIONS = 20. For a TS1-like UI, show up to 8 queued icons (ESTIMATE).

**Implementation:** Implement queue as an array of {id, objId, interId, priority, mode, flags, args, state:'pending'|'running'|'cancelling'}.

enqueue(item): find the insertion index from the end, skipping items with priority < item.priority; insert; then, if mimicking TS1, cancel the lower-priority pending items after it.

Keep sim.currentPriority = running?.priority ?? 0. After any queue change, set a 'queueDirty' flag and re-evaluate on the next tick, as FreeSO does with EvaluateQueuePriorities.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMQueuedAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMPushInteraction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/NetPlay/Model/Commands/VMNetInteractionCmd.cs


### Executing an interaction (route, animate, motive loop, end conditions)

When the main loop's Idle for Input (Allow Push) finds a startable item, the item's check tree is re-run. If the check fails, the item is silently dropped. Otherwise its action tree is pushed as a new stack frame tagged 'interaction'. The typical action-tree pattern in TS1 objects:
1. 'Go to Routing Slot' (or relative position) to walk to an approach slot. On failure, run the route-fail tree and return false, which ends the interaction.
2. Snap or turn, then 'Animate Sim' for the entry animation (sit down, open fridge). Animations fire events that trees react to (for example, attach the plate).
3. 'Set Motive Change' (motive, per-hour rate, max) for each motive the activity feeds. Several can run at once.
4. Loop: play a looping animation chunk, call 'Idle for Input' (Allow Push) for N ticks, then test the end conditions:
   - the target motive >= its max ('until full'),
   - elapsed time >= duration,
   - a resource runs out (food servings, hot water),
   - the Sim was notified by Idle for Input (a cancel, or a higher-priority item queued),
   - an object state change (TV broken, sim called to work).
5. Exit branch: the exit animation (stand up, put down the plate), side effects (create a dirty dish, add dirtiness to the object, skill gain), then clear the motive changes and return true.

When the tree returns, the queue item is removed. If it was the bottom interaction, the motive changes and the 'non-interruptible' flag are reset and priority returns to the next item's priority, or 0. If the target object is deleted or dies mid-interaction, the Sim is reset.

**Numbers:** End conditions are evaluated at least once per Idle for Input call. Use about 30 ticks (1 sim minute) per loop chunk (ESTIMATE).

Example durations to calibrate rates (ESTIMATE):
- toilet ~15–20 sim minutes for -100 to 100
- shower ~30 minutes
- snack ~5 minutes (+20 Hunger)
- cooked meal ~45 minutes including prep (+60 to +80 Hunger)
- sleep ~8–9 hours
- TV continues until Fun is full, interrupted, or 3 hours pass

**Implementation:** Write action trees as JS generator functions that yield one tick at a time, for example:

function* useToilet(sim, obj){ if (!(yield* routeToSlot(sim, obj, 0))) return false; yield* animate(sim,'sit'); sim.setMotiveChange('bladder', +600, 100); while (sim.m.bladder < 100 && !sim.notified) yield* idleForInput(sim, 30); sim.clearMotiveChanges(); yield* animate(sim,'stand'); obj.dirty += 5; return true; }

Generators make 'walk, animate, loop, exit' trivial. For save/load, either make the trees data-driven state machines or snapshot at interaction boundaries and restart the current interaction on load.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMIdleForInput.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMSetMotiveChange.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-simantics-vm.md


### Per-tick motive deltas (Set Motive Change) and their interaction with decay

'Set Motive Change' registers {motive, PerHourChange, MaxValue} on the Sim. Every tick the engine adds PerHourChange / 60 / 30 to a fractional accumulator and applies whole points when |fraction| >= 1. The value is clamped at MaxValue, and if the motive is already beyond MaxValue in the delta's direction, nothing happens; it is not pulled back. The change keeps running after the max is reached; it simply stops adding. A 'Once' flag adds the amount immediately. 'Clear All' removes all changes. All changes are cleared automatically when the Sim's bottom interaction ends.

In TS1, an Energy rate is scaled by EnergySpan / (24 - WakeHours) = 180/8, which is 22 with integer math. Object authors therefore write small relative sleep rates.

While any motive change is active on a motive, normal decay for that motive is suspended, except Energy.

TS1 decay runs every 2 sim minutes with 1/1000-point accumulators. Per 2 sim minutes:
- Hunger: 0.0021 × (100 + Hunger). Hungrier Sims decay slower.
- Comfort: 0.4 (Active) / 0.6 (lazy) / 0.5.
- Hygiene: 0.17 awake, 0.08 asleep.
- Bladder: 0.3 awake, 0.15 asleep, plus 0.3 × the hunger decrement.
- Energy (awake): 180 / (30 × 16).
- Fun: 0.25 awake, 0 asleep.
- Social: 0.055 + 0.000125 × Outgoing.
Sims auto-wake at 7:00 if Energy >= 80. These decay rates drive when ads cross into the steep part of their curves.

**Numbers:** Per-tick delta = PerHourChange / 1800 (30 ticks × 60 minutes). Energy rate multiplier = 22.

Decay per sim hour (×30 of the per-2-minute values):
- Hunger: 12.6 at full, 6.3 at 0
- Comfort: 12 / 18 / 15
- Hygiene: 5.1 awake, 2.4 asleep
- Bladder: 9 awake + 0.3 × hunger rate
- Energy: 11.25 awake (180 points over 16 waking hours)
- Fun: 7.5
- Social: 1.65 to 5.4

Suggested interaction rates per sim hour (ESTIMATE):
- toilet Bladder +600
- shower Hygiene +360
- bath Hygiene +240 and Comfort +60
- snack Hunger +240 for 5 minutes
- meal Hunger +120
- bed Energy +25 (scaled form ≈ 1.1 × 22) and Comfort +30
- sofa Comfort +40 to +120 by quality
- TV Fun +40 to +100 by quality
- talk Social +60 to both Sims

**Implementation:** class MotiveChange { constructor(motive, perHour, max){...} tick(sim){ this.f += this.perHour/1800; if (Math.abs(this.f) >= 1) { const v = sim.m[this.motive]; if ((this.perHour>0 && v>this.max) || (this.perHour<0 && v<this.max)) return; const step = Math.trunc(this.f); this.f -= step; sim.m[this.motive] = this.perHour>0 ? Math.min(v+step, this.max) : Math.max(v+step, this.max); } } }

In the decay step, skip a motive if sim.changes.has(motive) && motive !== 'energy'.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMMotiveChange.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMSetMotiveChange.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs


### Routing slots (walking to the object)

Objects define routing slots in a SLOT resource. Each slot has:
- a type (standing, sitting or ground)
- an offset
- MinProximity, MaxProximity and OptimalProximity (in tiles; older versions scaled by 16)
- a resolution
- an angular gradient
- a height
- a facing: face the object (-2), face away (-1), face anywhere (-3), or a fixed direction
- allowed approach directions: an 8-bit N/NE/E/SE/S/SW/W/NW mask
- flags: Absolute, IgnoreRooms, SnapToDirection, RandomScoring, AllowFailureTrees, AllowDifferentAlts, UseAverageObjectLocation
- score bonuses for standing, sitting or ground destinations

The slot parser generates candidate positions on rings between the min and max proximity in the allowed directions, inside the same room unless IgnoreRooms is set. Each candidate is scored as maxScore - |optimal - distance| - (distance from Sim)/3. RandomScoring adds a random 0..1 instead. The score is then multiplied by the standing or sitting bonus. Candidates are tried in score order.

The Sim first plans a room-to-room route through portals (doors), using A* over portals, then a tile path. If blocked by another Sim, it waits, asks the blocker to move ('shoo'), or tries the next candidate. When everything fails, the global route-fail tree runs with a fail code (no path, can't sit, can't stand, destination occupied, no room route, interrupted). It shows a thought balloon, and the interaction returns false. The Sim runs instead of walking when the target is more than 10 tiles away (FreeSO auto walk speed).

**Numbers:** MAX_RETRIES = 5. Wait timeout when blocked = 10 × 30 ticks = 300 ticks (10 sim minutes). Run if remaining distance > 10 tiles. Candidate score includes -distanceFromSim/3. Fail codes are passed to the global fail tree.

**Implementation:** Model slots as [{offset:[dx,dy], minR, maxR, optR, dirs:0xFF, facing:'toward'|'away'|'any'|deg, sit:false}]. Generate candidate tiles, filter by walkability and room, score them, then A* on the tile grid; a room/portal graph is optional for large lots. Reserve the destination tile while walking so two Sims don't race for one chair. On failure, emit a 'cantReach' event (thought balloon) and add an autonomy lockout for that object for 60 sim minutes (ESTIMATE).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/SLOT.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMSlotParser.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs


### Interrupting and cancelling

The queue head is never killed abruptly. Interruption is cooperative.

When something with a higher priority than the current one is queued, or the player cancels the running item, the engine marks the running item 'NotifyIdle' and sets the Sim's InteractionCanceled flag. For a player cancel, the running item's priority also drops to 0, which mirrors TS1 pushing an implicit 'Cancel Interaction'. The next time the action tree calls Idle for Input, that call returns true ('notified'). The tree then branches to its graceful exit (stand up, put things away) and returns. After that, Allow Push starts the next item.

Cancelling a queued item that has not started removes it at once and calls the target object's 'Queue Skipped' entry point, so the object can release reservations. Items flagged MustRun cannot be queue-skipped. They only get the cancelled flag and finish their own way.

Autonomous interactions are treated as priority 1 for comparison, so a newly selected autonomous action can also notify a running autonomous one. Player commands (50) always notify autonomous ones (2). An interaction can set a 'non-interruptible' flag during critical sections (for example, mid-flush or carrying a hot pot). That flag is reset when the interaction ends.

**Numbers:** Interrupt check granularity: every Idle for Input call (each tick when Allow Push is used). A user cancel sets priority to 0. MustRun blocks queue skip. Graceful exits should take 1–3 seconds of animation (ESTIMATE) so cancels feel responsive.

**Implementation:** Every action generator must regularly yield* idleForInput(...) and check sim.notified. Provide a helper: function* loopUntil(sim, cond, chunk=30){ while(!cond() && !sim.notified) yield* idleForInput(sim, chunk); }

cancel(id): if pending → remove and call obj.onQueueSkipped(sim); if running → item.priority = 0, sim.notified = true. The UI shows an X on the icon until the exit finishes.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMIdleForInput.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMEntity.cs


### Player command queue vs autonomy (UX rules)

Player clicks on an object open a pie menu built from the same tree table. Visible entries are those whose check tree passes with auto = 0; the player sees interactions with zero ads too. Choosing one enqueues it at UserDriven priority (50).

Consequences:
(1) A running autonomous action is notified and exits gracefully.
(2) Autonomous actions are never queued while a player item is pending, because Find Best Action bails out when a better-priority item exists.
(3) Player items run in FIFO order among themselves.
(4) In TS1 the player can cancel any icon, and free will can be turned off. Wikipedia: 'the player can override most of these autonomous actions by canceling them in the action queue.'

Community guides also report that Sims in a very bad mood may refuse some player orders and seek a mood fix instead. This is done in check and action trees, not in Find Best Action, and the thresholds are not documented.

**Numbers:** UserDriven = 50, Autonomous = 2. Mood-refusal threshold for 'fun-less' tasks such as study or exercise (ESTIMATE): Mood < -40 means the Sim refuses (waves no), unless the order targets the motive that is lowest.

**Implementation:** Build pie menus with availableInteractions(sim, obj, {auto:false}) and autonomy with {auto:true}. Same code path, different flag. Visually distinguish autonomous queue icons (for example, a faded icon) so players understand what the Sim chose itself. Optionally show the top-4 candidate scores in a debug 'thought' panel.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMQueuedAction.cs, https://en.wikipedia.org/wiki/The_Sims_(video_game), https://modthesims.info/d/showthread.php?t=683068


### Autonomous social interactions between Sims

Socials are not a separate AI. Every Sim is an object whose tree table holds the social menu (Talk, Joke, Hug, Kiss, Tickle, Back Rub, Insult, Slap and so on), so other Sims are candidates in Find Best Action like any appliance. Each social advertises Social (and often Fun) with a personality vary-by: Talk varies by Outgoing, Joke and Tickle by Playful, kind actions by Nice. Its check tree:
- gates by age, visitor status, the target's state (asleep, at work, busy with something non-interruptible), and the relationship level for intimate actions;
- rewrites the ad through tree-ad overrides, for example scaling it with relationship so friends attract more;
- hides it from autonomy when the initiator's mood or relationship makes it inappropriate.

Distance attenuation uses the target Sim's current position, so nearby Sims win. Self-interaction is culled (Doornbos: 'reflexive interactions ... TBD').

Once chosen, the initiator's action tree routes to a slot near the target and pushes a 'respond' interaction onto the target's queue with a higher priority than autonomous. FreeSO's push-interaction primitive supports Inherited, Maximum, Autonomous, UserDriven, ParentIdle, ParentExit and Idle priorities. The push interrupts the target's autonomous activity but not usually the player's commands. The two Sims then animate together, and the target decides acceptance from mood, relationship and personality.

Community guide signals: a 'drama mask' rejection means the target's mood was too low, and a 'two faces' rejection means the same interaction was repeated too often. Playful and Nice traits raise acceptance of many socials. Both Sims receive Social (and Fun) deltas and relationship changes. Relationship math belongs to the relationship topic.

**Numbers:** ESTIMATE values for our game:
- Social ad: Talk 10 + 30 × Outgoing/1000, Joke Fun 0 + 20 × Playful/1000 plus Social 10, Hug Social 30 (requires relationship >= 50), Kiss Social 40 (requires relationship >= 70 and romance flag).
- Ad multiplier from relationship: × (1 + rel/200) for rel in -100..100, and hide friendly socials when rel < -30.
- Attenuation: medium (0.3).
- The push onto the target uses priority 40 (above autonomous 2, below player 50); TS1 offers Maximum (100) and UserDriven (50) push levels.
- Acceptance: P = clamp(0.5 + targetMood/200 + rel/200 + 0.2 × (relevant trait - 0.5), 0.05, 0.95).
- Anti-repetition: the same social on the same target more than 2 times in 3 sim hours gives -0.3 acceptance (the 'two faces' refusal).

**Implementation:** Treat Sims as objects in the candidate list. Give the Sim definition a socials table with ads and check(sim, target, {auto}). After selection, run a generator: route to target; if target busy with priority >= 50 → give up; else enqueue(target, respond(sim), 40); wait for the target to arrive at its 'respond' state (with a timeout of 300 ticks); roll acceptance; play the paired animation; apply deltas to both. Keep per-pair counters {lastSocialId, count, sinceTick} for anti-repetition.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMPushInteraction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMObjectQueries.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMMemory.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md, https://modthesims.info/d/showthread.php?t=683068


### Visitors, children and pets variants

Visitors are Sims with PersonType = 1 who have not yet been greeted or allowed in. They:
- only see interactions flagged AllowVisitors;
- use the weak visitor attenuation table (0.01 to 0.03), so they roam the whole lot;
- are otherwise scored by the same algorithm.
Visitors who arrive with low motives behave accordingly. A community tip is to feed and entertain them before socializing.

Children:
- use separate interaction-score and happy-weight curves (STR# 503/504);
- are blocked from NoChild interactions, while adults are blocked from NoAdult ones.

Pets (Unleashed) use flags marking interactions for cats or dogs only, and people cannot use those. Stray pets only consider Sims, and only outdoors.

**Numbers:** Visitor attenuation: 0.01 / 0.02 / 0.03 (low / medium / high). In TS1 a child is age < 18 for the flag test. Child curves are ESTIMATE (see the curve mechanic).

**Implementation:** Parameterize findBestAction with a profile {curves, weights, attenTable, filter} chosen per Sim (adultResident, childResident, visitor, npcService). Service NPCs (maid, repairman) should mostly bypass autonomy and run scripted job trees, which the original also does through their own main loops.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/TTAB.cs, https://modthesims.info/d/showthread.php?t=683068


### SimAntics concepts to mirror in JS (trees, primitives, threads, entry points)

SimAntics is a tree-based visual language. A 'tree' (BHAV) is a flat array of nodes. Each node has:
- an opcode (uint16),
- a true pointer and a false pointer (bytes),
- an 8-byte operand.

Primitive results:
- GOTO_TRUE / GOTO_FALSE: follow a pointer now.
- *_NEXT_TICK variants: yield, then follow.
- RETURN_TRUE / RETURN_FALSE.
- CONTINUE_NEXT_TICK: re-run this node next tick, used by idles.
- CONTINUE: control changed, for example a push.
- CONTINUE_FUTURE_TICK: sleep N ticks, so the scheduler skips the entity.
- ERROR.

Special pointers: 254 = return true, 255 = return false, 253 = error / take the only available branch.

Opcodes below 256 are built-in primitives. 256–4095 call global trees, 4096–8191 call the object's private trees, and 8192 and up call semi-global trees shared by an object family. Calls push a stack frame with its own locals and up to 4 arguments.

Primitives relevant to autonomy:
- Expression (math and tests on Sim, object, global and local variables)
- Idle for Input
- Go to Routing Slot / Go to Relative Position
- Animate Sim
- Set Motive Change
- Find Best Action
- Find Best Object For Function (for example, the nearest counter to prepare food, or the dirtiest object to clean; it uses lockout counts and thresholds such as dirtiness 800 and repair state 600)
- Push Interaction
- Relationship
- Random Number
- Create/Remove Object
- Snap, Grab, Drop
- Play Sound, Show String / Dialog

Every entity (object or Sim) has a thread holding a stack and, for Sims, the action queue. Each tick the VM steps every thread, executing primitives until one yields. A loop cap (FreeSO: 500,000 primitives per tick) detects infinite loops and resets the object.

Objects expose entry points (OBJf): init (0), main (1), load (2), cleanup (3), queue skipped (4), and others up to repair (29), including prepare food, cook, eat, sit, stand, clean, wash dish and dispose. Check trees run in a throwaway thread with auto = 1 when evaluated for autonomy.

Doornbos and Hopkins stress that the person's code knows nothing about objects. All 'how and why' is in the object's trees and ads. That is what made expansion packs and user objects plug in without touching the Sim AI.

**Numbers:** Node = {opcode:uint16, t:uint8, f:uint8, operand:8 bytes}. Special pointers: 253 / 254 / 255. Tree id ranges: below 256 primitive, 256–4095 global, 4096–8191 private, 8192 and up semi-global. Max 4 arguments per call. Loop cap 500,000 primitives per tick. Clock: 30 ticks per sim minute.

**Implementation:** You do not need a bytecode VM. Recommended JS architecture:
(1) Each entity has a 'thread': {stack:[generator], queue:[...], sleepUntil}.
(2) Behaviors are generator functions composed with yield* (that is your subroutine call). Primitives are small generator helpers: idleForInput, routeToSlot, animate, setMotiveChange.
(3) The VM tick loops over entities; skips those with sleepUntil > tick; calls stack.top.next(); on done, pops the frame and passes the return value to the parent.
(4) Use a step budget per tick to catch runaway loops.
(5) Use a seeded RNG and fixed-step ticks (30 per sim minute; real-time speed 1×/2×/3× = 30/60/90 ticks per second) for determinism.
(6) Keep object definitions data-first (JSON for interactions, ads, slots, curves) with behavior code referenced by name, so content can be added without touching the AI. This mirrors the TTAB/BHAV split.
(7) Provide a debug inspector showing each Sim's queue, current tree and top-4 autonomy scores, the equivalent of Maxis' Edith tracing.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/BHAV.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMPrimitiveExitCode.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMQueuedAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMEntity.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestObjectForFunction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-simantics-vm.md, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-will-wright-microworlds-1996.md


## OBJECTS

Research summary: buy-mode objects and the economy of the 2000 original, as reference for an original Portuguese-language browser life sim. All object names below are generic. No brand names are used.

Access note: direct page fetching was blocked in this environment (DNS errors and proxy 403 for wikipedia, fandom, neoseeker, archive.org and tsomania). The data comes from web-search extracts of those pages, plus GitHub code search over the open-source FreeSO engine, which reimplements the original's object VM.

KEY FINDINGS
(1) Catalog structure.
- The original's buy mode sorts by function into Seating, Surfaces, Decorative, Electronics, Appliances, Plumbing, Lighting and Miscellaneous. It can also sort by room.
- Each object definition (OBJD) stores catalog ratings: RatingHunger, RatingComfort, RatingHygiene, RatingBladder, RatingEnergy, RatingFun and RatingRoom, plus a 7-bit RatingSkillFlags. The catalog only shows ratings that are not zero, as "Motive N" on a 0-10 scale.
- Each OBJD also stores SalePrice, InitialDepreciation, DailyDepreciation, SelfDepreciating and DepreciationLimit, and has a Repair behaviour entry point.

(2) Price ladders are well documented. Typical tiers:
- Fridges: §600 (Hunger 6), §1,200 (Hunger 7), §2,500 (Hunger 8; one source says 10).
- Stoves: §400 (Hunger 5), §1,000 (Hunger 7).
- Toilets: §300 (Bladder 8), §1,200 (Bladder 8 and Comfort 4).
- Shower §650 (Hygiene 6). Tubs: §800 (Hygiene 6, Comfort 3), §3,200 (Hygiene 10, Comfort 8). Hot tub §6,500.
- Beds: §300 to §3,000 (Energy 7 to 10).
- TVs: §85, §500, §3,500. Computers: §999, §1,800, §2,800, §6,500 (Fun 3, 5, 7, about 9).
- Bookshelves: §250, §500, §900. Lamps: §25 to §350. Decorations: §12 to §12,648 (Room 1 to 10).

(3) Depreciation is applied at midnight after purchase, so a same-day sale refunds the full price. The rates come from the official strategy guide's object table:
- Electronics: lose 25% at the first midnight, then 1% of price per day, down to a floor of 20% of price.
- Appliances: lose 20% at the first midnight, then 1% per day, down to a floor of 30%.
- Plumbing: loses 20% at the first midnight. Furniture loses 15%. Their floors are not documented; I estimate 30% and 40%.

(4) Bills arrive every 3 days. Bill = 3% of the current depreciated value of everything billable on the lot, minus 10% per child in the household. Unpaid bills escalate to the repo man.

(5) Services: maid §10/h, gardener §10/h (every 3 days, minimum charge §10), repairman §50/h.

(6) Meal hunger formula from a fan analysis: meal base + fridge modifier + prep-surface modifier + cooking-method modifier + 1.5 × cooking skill.
- Bases: snack 9, quick, full or group meal 16, pizza slice 33.
- Fridge modifiers: 9, 12, 16. Counter 16. Food processor 32. Cheap stove 32, gas range 40, toaster oven 9.
- The modifiers reproduce the worked examples exactly (34, 88.5 and 136).

(7) Room score, from FreeSO's reimplementation:
- Add up each object's dynamic RoomImpact over the room and its connected support rooms.
- Divide by max(1, tiles/12). Outdoors, divide by 30 instead.
- Subtract 10 indoors or 15 outdoors, then clamp to the range -100 to 100.
- The Sim's Room motive is the score of the room the Sim is standing in.

(8) Breakage and mess:
- Electronics, plumbing, dishwasher, trash compactor and espresso machine can break. Repairing electronics with low Mechanical skill risks electrocution.
- Toilets clog after several unflushed uses. Unclogging and repairing give Mechanical skill.
- Dirty or spoiled plates, trash piles, unmade beds and dead plants or fish attract flies and lower Room.
- Roaches spawn based on the lot's overall dirt score.
- Cooking fire chance is about 15% at cooking skill 0, 5% at skill 1 and 1% at skill 2.

Values not found in sources are marked ESTIMATE with a proposed number. Source URLs are listed per mechanic.


### Buy catalog structure and rating display

Objects are bought from a catalog sorted by function category, with an alternative room sort. Each object has a fixed definition record that mirrors the original's OBJD:
- price;
- seven catalog motive ratings: Hunger, Comfort, Hygiene, Bladder, Energy, Fun, Room;
- a skill-flags bitfield that shows skill icons;
- footprint;
- depreciation parameters;
- interaction (behaviour) entry points, including Repair.
The catalog card lists only the ratings that are not zero (for example "Comfort 6, Energy 7" or "Bladder 8") and the skill icons. Catalog ratings describe the object. The actual motive gain is coded per interaction (the original's catalog values are display-only and independent of the real behaviour). Sims choose objects by their interactions' advertisements, not by catalog numbers. Advertisements define a minimum and a range per motive, and they can 'falsely advertise'.

**Numbers:** Function categories:
- Seating (dining chairs, lounge chairs, sofas, beds, misc);
- Surfaces (counters, tables, end tables, desks);
- Decorative (paintings, sculptures, rugs, plants, other);
- Electronics (entertainment, TVs/computers, audio, small electronics);
- Appliances (cooking, refrigerators, small, large);
- Plumbing (toilets, showers/tubs, sinks, hot tubs);
- Lighting (table, floor, wall, outdoor);
- Miscellaneous (dressers, party, children, cars?, knowledge, creativity, exercise, recreation).
Room sort: Kitchen, Bathroom, Bedroom, Living Room, Outside, Miscellaneous.
Rating scale: 0-10 shown; negative values allowed (e.g. coffee Bladder -1).
Skill flags: 7 bits (Cooking, Mechanical, Charisma, Body, Logic, Creativity, Cleaning-hidden). The UI loops over 7 bits.
Prices fit a 16-bit unsigned field (max 65535; the catalog's highest decoration is §12,648).

**Implementation:** Define each object as JSON:
{ id, namePt, category, subcategory, roomSort[], price, ratings:{hunger,comfort,hygiene,bladder,energy,fun,room}, skills:[], footprint:{w,h}, deprClass, interactions:[...], breakable:{...}, roomImpact(state) }
Render the catalog card from the ratings that are not zero. Keep the advertisement values (used by the AI) separate from the catalog ratings, so you can tune behaviour without changing what the player sees.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/OBJD.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/UIQueryPanel.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMStackObjectDefinitionVariable.cs, https://thesims.neoseeker.com/wiki/The_Sims_Items, https://modthesims.info/d/663707/bed-catalog-rework-customizable-energy-comfort-and-price.html, http://www.woobsha.com/diy-TTABTutorialMac.htm, https://news.ycombinator.com/item?id=14997725


### Catalog: Seating (chairs, lounge chairs, sofas)

Chairs give Comfort while seated. They are required to eat at a table, use a desk computer, and in some layouts to play chess. Sofas and loveseats also allow napping, which restores Energy at the sofa's Energy rating. Recliners nap too. Expensive pieces add Room.
Interactions:
- Chair: Sit (used automatically by Eat, Use Computer, Play Chess).
- Lounge chair: Sit.
- Recliner: Sit, Nap.
- Loveseat and sofa: Sit, Nap. Sofas also take multiple seated Sims, so they support Talk/social while seated.
Nothing in this category breaks.

**Numbers:** Format: generic name | price | catalog motives | Room | footprint.
- Cheap dining chair | §80 | Comfort 2 | 0 | 1x1
- Deluxe dining chair | §1,200 | Comfort 6 | Room 3 | 1x1
- Wicker lounge chair | §80 | Comfort 2 | 0 | 1x1
- Country armchair | §250 | Comfort 4 | 0 | 1x1
- Modern armchair | §450 | Comfort 6 | 0 | 1x1 (a §500 variant also has Comfort 6)
- Recliner | §250 | Comfort 6, Energy 3 | 0 | 1x1
- Cheap loveseat | §150 | Comfort 3, Energy 4 | 0 | 1x2
- Used/recycled couch | §180 | Comfort 2, Energy 5 | 0 | 1x3 (footprint ESTIMATE)
- Basic sofa | §200 | Comfort 3, Energy 5 | 0 | 1x3 (footprint ESTIMATE)
- Country loveseat | §340 | Comfort 5, Energy 4 | 0 | 1x2
- Country sofa | §450 | Comfort 5, Energy 5 | 0 | 1x3
- Luxury loveseat | §875 | Comfort 8, Energy 4 | Room 2 | 1x2
- Luxury sofa | §1,100 | Comfort 8, Energy 5 | Room 3 | 1x3
Base-game seating count: 5 dining chairs, 5 lounge chairs, 12 sofas, 6 beds, 3 other (30 total).
Depreciation class: furniture (-15% at the first midnight).

**Implementation:** Seat slots: chair 1, loveseat 2, sofa 3 (ESTIMATE).
Comfort gain while seated = f(ratings.comfort); see the rate mechanic.
Nap on a sofa = sleep at the Energy rating, but Comfort is capped (ESTIMATE: cap Comfort at 60) and the Sim wakes after at most 3 hours (ESTIMATE).
Dining chairs must be orthogonally adjacent to a table tile, facing it, to enable 'Eat at table'.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_Items, https://www.tsomania.net/catalogs/buy.php?c=1&p=1&o=5, https://sims.fandom.com/wiki/Seating, https://www.thesimswiki.com/wiki/List_of_seating_(The_Sims)


### Catalog: Beds

Beds restore Energy (the main purpose) and Comfort while sleeping. Better beds restore faster, so less sleep time is needed.
Interactions:
- Sleep (autonomous when Energy is low; the Sim wakes when Energy is full or when the alarm/carpool forces it);
- Make Bed (an unmade bed is mess and can attract flies);
- Relax/Lie down (ESTIMATE).
Two Sims can share a double bed.
Beds never break. Sleeping on the floor or a sofa is the fallback.

**Numbers:** Format: generic name | price | motives | Room | footprint.
- Cheap single bed | §300 | Comfort 6, Energy 7 | 0 | 1x2 (ESTIMATE)
- Cheap double bed | §450 | Comfort 7, Energy 8 | 0 | 2x2 (ESTIMATE)
- Child/youth single bed | §450 | Comfort 7, Energy 7 | 0 | 1x2
- Mid double bed (sleigh style) | §1,000 | Comfort 8, Energy 9 | 0 | 2x2
- Deluxe double bed (mission style) | §3,000 | Comfort 9, Energy 10 | Room 3 | 2x2
Price range of the original's beds: §300 to §3,000.
A later-game TSO listing of the mid bed shows §1,875, Comfort 8, Energy 8; use the original's values above.

**Implementation:** Energy per game hour while asleep = 3 x energyRating + 5 (ESTIMATE). A rating-7 bed then gives about 26/h, so roughly 7.7 hours from -100 to +100. A rating-10 bed gives 35/h, roughly 5.7 hours.
After waking, set bed.made=false. An unmade bed has roomImpact -5 (ESTIMATE).

Sources: https://thesims.neoseeker.com/wiki/The_Sims_Items, https://www.funtrivia.com/trivia-quiz/VideoGames/The-Sims-Items---No-Expansions-218810.html, https://sims.fandom.com/wiki/Bed, https://www.tsomania.net/catalogs/buy.php?c=1&p=3&o=86, https://new.tcrf.net/The_Sims_(Windows)/Translation_Notes/Buy_Mode


### Catalog: Surfaces (counters, tables, end tables, desks)

Surfaces have no motive ratings except deluxe pieces, which add Room. Their function is slots:
- Counters are prep surfaces for cooking and hold plates and small appliances.
- Tables are eating spots with chairs.
- Desks hold computers and phones.
- End tables hold lamps and phones.
Dirty plates left on any surface become mess. Surfaces never break.
Interactions: none directly. They enable Prepare Meal (counter), Eat (table with chair), and placement of small objects. Plates on them have 'Clean'.

**Numbers:** - Cheap kitchen counter | §150 | no motives | 1x1
- Tiled counter | §250 | no motives | 1x1
- Folding card table (dining) | §95 | no motives | 1x1 or 1x2 (ESTIMATE)
- Cheap desk/table | §80 | 1x1 (ESTIMATE)
- Mid desk/table | §220 | 1x1 (ESTIMATE)
- Deluxe desk/table | §800 | Room 2 | 1x2 (ESTIMATE)
- End table | ESTIMATE §100-§150 | 1x1
In the meal formula, using a counter as the prep surface adds +16 Hunger; a food processor on it adds +32 instead.

**Implementation:** Give surfaces 'slots' (container positions).
Prepare Meal requires a free counter slot adjacent to the stove path.
Computers, phones and lamps snap only onto surfaces or end tables, except floor or wall variants.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_Items, https://www.simechoes.org/simechoes1/info/moods.html


### Catalog: Decorative (paintings, sculptures, plants, aquarium)

Decorations exist mainly to raise Room. Plants and the aquarium need upkeep:
- Plants need watering. A neglected plant wilts and dies, and a dead plant lowers Room.
- Fish need feeding. Dead fish lower Room.
Interactions:
- Plant: Water (a gardener also waters every 3 days).
- Aquarium: Feed Fish, Clean Tank, Watch (small Fun).
- Paintings and sculptures: View (ESTIMATE) or none.

**Numbers:** - Small potted plant | §120 | Room 2 | 1x1
- Medium potted plant | §160 | Room 2 | 1x1
- Aquarium | §200 | Fun 1, Room 2 | 1x1
- Lawn flamingo (cheapest decoration) | §12 | Room 1 | 1x1
- Paintings and sculptures | §12 to §12,648 | Room 1 to 10 | 1x1 wall slot, or 1x1 to 2x2 floor
- Rugs | Room 1-3 (ESTIMATE)
Plant watering interval: ESTIMATE every 3 days before wilting; dies after 3 more days.
Aquarium: ESTIMATE, feed every 2 days; fish die after 4 days without food.
Depreciation class for art: ESTIMATE -10% initial, 0.5%/day, floor 50%. In the second game some art randomly appreciates (50/50 per day); this is optional for us.

**Implementation:** roomImpact = 5 x ratings.room when healthy (ESTIMATE).
Plant states: healthy, wilting (roomImpact 0), dead (roomImpact -15).
Aquarium states: fed, hungry, dead (-15).
Expose 'Regar' and 'Alimentar peixes' as household chores the player sees on the object.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_Items, https://sims.fandom.com/wiki/Gardener, https://strategywiki.org/wiki/The_Sims_2/Buy_Mode, https://sims.fandom.com/wiki/Environment


### Catalog: Electronics (TV, stereo, computer, alarms)

TV:
- Interactions: Turn On, Watch (channel choice), Turn Off, Repair when broken.
- Channels: action, cartoons, romance. Personality affects how much Fun each channel gives.
- All TVs work much the same. Pricier ones mostly add Fun and Room.
Stereo:
- Interactions: Turn On, Dance, Join (group dance gives Social), Change Station, Turn Off.
Computer:
- Interactions: Play (Fun), Find Job (job listings), Study (children, raises school grades), Turn Off, Repair.
TVs and computers occasionally break. Repairing them risks electrocution at low Mechanical skill.
Smoke detector: automatically calls the fire service if a fire starts in the same room.
Burglar alarm: covers the whole room it is placed in and calls the police on a burglar.

**Numbers:** Format: generic name | price | motives | footprint.
- Black-and-white TV | §85 | Fun 2 | 1x1
- 27-inch colour TV | §500 | Fun 3-4 (ESTIMATE) | 1x1
- Plasma TV | §3,500 | Fun 5-8, Room 2-3 (ESTIMATE) | 2x1
- Boom box | ESTIMATE §100 | Fun 2 | 1x1
- Component hi-fi | ESTIMATE §650 | Fun 3 | 1x1
- High-end stereo | ESTIMATE §2,550 | Fun 5, Room 3 | 1x2
- Refurbished computer | §999 | Fun 3 | 1x1 on desk
- Mid computer | §1,800 | Fun 5 | 1x1
- Gaming computer | §2,800 | Fun 7 | 1x1
- Top-end computer | §6,500 | Fun 9 (ESTIMATE; the source was cut off) | 1x1
- Smoke detector | §50 | wall
- Burglar alarm | §250 | wall
On community lots, a computer charges §5-§35 per use depending on its Fun rating.
Depreciation (official guide):
- B&W TV: initial §21, daily §1, floor §17
- Colour TV: §125 / §5 / §100
- Plasma TV: §875 / §35 / §700
- So electronics lose 25% at the first midnight, then 1% of price per day, with a floor of 20% of price.

**Implementation:** TV and stereo are 'broadcast' objects: Sims within the room can join. Fun gain = 8 x funRating per hour (ESTIMATE). Add a personality multiplier per channel (x1.5 for a matching trait).
The computer's Find Job interaction refreshes 3 job offers per day.
The smoke detector triggers firefighters if fire.room == detector.room.

Sources: https://sims.fandom.com/wiki/Television/The_Sims, https://sims.fandom.com/wiki/Computer, https://www.thesimswiki.com/wiki/Computer, https://thesims.neoseeker.com/wiki/The_Sims_Items, https://www.scribd.com/document/579017052/The-Sims-Superstar-Prima-Official-EGuide, https://sims.fandom.com/wiki/Smoke_detector, https://sims.fandom.com/wiki/Burglar_alarm, https://sims.fandom.com/wiki/Electronics, https://www.tsomania.net/catalogs/buy.php?c=4&p=2&o=304


### Catalog: Appliances (fridges, stoves, dishwasher, compactor, coffee)

Fridge interactions: Have Snack, Have Quick Meal, Prepare Meal (Breakfast/Lunch/Dinner by time of day).
- Prepare Meal takes food from the fridge, prepares it on a counter (or food processor), cooks it on the stove, and serves a group platter of 6 servings.
- Other Sims then 'Get Plate', sit and eat.
The fridge's Hunger rating sets how filling its food is.
Stove: cooking quality depends on stove rating and Cooking skill. Fire risk depends on skill.
Dishwasher: lets Sims clean several plates quickly instead of at the sink.
Trash compactor: holds more trash than a basic can.
Coffee maker and espresso machine: Drink Coffee. They are always full and need no refill. The espresso machine breaks frequently.

**Numbers:** Format: generic name | price | motives | footprint.
- Cheap fridge | §600 | Hunger 6 | meal modifier +9 | 1x1
- Mid fridge | §1,200 | Hunger 7 | meal modifier +12 | 1x1
- Deluxe fridge | §2,500 | Hunger 8 (one wiki says 10) | meal modifier +16 | 1x1
- Cheap electric stove | §400 | Hunger 5 | cook modifier +32 | 1x1
- Gas range | §1,000 | Hunger 7 | cook modifier +40 | 1x1
- Toaster oven / microwave | ESTIMATE §250 | quick meals only | cook modifier +9 | counter slot
- Food processor | ESTIMATE §220 | prep modifier +32 | counter slot
- Basic dishwasher | §550 | 1x1
- Deluxe dishwasher | §950 | 1x1
- Trash compactor | §375 | 1x1
- Coffee maker | §85 | Bladder -1, Energy +1 | adults only
- Espresso machine | §450 | Bladder -2, Energy +2, Fun +1 | breaks often
Price range of the original's fridges: §600 to §2,950 including expansions.
Depreciation (official guide), cheap fridge: initial §120, daily §6, floor §180. So appliances lose 20% at the first midnight, then 1% of price per day, with a floor of 30% of price.
Advertisement in the guide's table: Have Snack at the cheap fridge = Hunger 20.

**Implementation:** Model Prepare Meal as a multi-step action: fridge, then counter, then stove, then a platter on a counter or table.
Compute servingHunger using the meal formula mechanic.
The platter object has servings=6. When servings reach 0 it becomes dirty dishes.

Sources: https://sims.fandom.com/wiki/Refrigerator, https://www.thesimswiki.com/wiki/Refrigerator, https://thesims.neoseeker.com/wiki/The_Sims_Items, https://www.thesimswiki.com/wiki/Stove, https://sims.fandom.com/wiki/List_of_appliances_(The_Sims), https://sims.fandom.com/wiki/Trash_compactor, https://sims.fandom.com/wiki/Dishwasher, https://sims.fandom.com/wiki/Coffee, https://www.scribd.com/document/579017052/The-Sims-Superstar-Prima-Official-EGuide, https://www.simechoes.org/simechoes1/info/moods.html


### Meal hunger value formula

How filling a serving is, in hunger motive points on the -100 to +100 scale:
HungerPoints = MealBase + FridgeMod + PrepSurfaceMod + CookingMethodMod + CookingSkill x 1.5
Which modifiers apply depends on the meal type:
- Candy box, fruitcake, pizza and robot food: no modifiers.
- Snack: fridge modifier only.
- Quick meal: fridge + cooking method + skill.
- Full and group meals: all modifiers.
A group meal equals a full meal with 6 servings.
The fan source's worked examples check out exactly:
- Quick meal, skill 0, cheap fridge, toaster oven: 16+9+9 = 34.
- Full meal, skill 3, mid fridge, counter, gas range: 16+12+16+40+4.5 = 88.5.
- Group meal, skill 10, top fridge (18), food processor, top oven (55): 16+18+32+55+15 = 136.

**Numbers:** Meal bases:
- Candy box 3
- Fruitcake 7
- Snack 9
- Quick meal 16
- Full meal 16
- Group meal 16 (6 servings)
- Pizza 33 per slice
- Robot food 33
Fridge modifiers: cheap 9, mid 12, deluxe 16, expansion top fridge 18.
Prep surface: counter 16, food processor 32.
Cooking method:
- Cheap stove 32 (one extract attributes 32 to the food processor instead; treat it as an ESTIMATE)
- Gas range 40
- Expansion top oven 55
- Toaster oven 9
Skill multiplier: 1.5 per Cooking point (0-10).
Cooking skill 8 or higher almost always fully satisfies hunger.

**Implementation:** mealHunger(type, fridge, prep, cook, skill) returns a number; clamp the result into the Sim's hunger motive at +100. Use these as a deluxe-kitchen incentive: cheap kitchen at skill 0 ≈ 73/serving, deluxe kitchen at skill 10 ≈ 103.

Sources: https://www.simechoes.org/simechoes1/info/moods.html, https://www.thegamer.com/the-sims-1-how-to-build-maximise-cooking-skill-guide/, https://screenrant.com/sims-1-invest-appliances-improve-hunger-tired-fun/


### Catalog: Plumbing (toilets, showers, tubs, sinks, hot tub)

Toilet: interactions Use, Flush, Unclog (when clogged), Clean (when dirty). A Sim who cannot reach a toilet in time wets themselves, leaving a puddle. The deluxe toilet auto-flushes, so it clogs less.
Shower: Take Shower (fast Hygiene), Clean, Repair.
Tub: Take Bath (slower, but adds Comfort), Clean, Repair.
Sink: Wash Hands (small Hygiene), Wash Dishes (kitchen sinks), Repair. A broken sink leaks puddles.
Hot tub: Get In and Join. Adults only, group of up to 4. Gives Comfort, Hygiene, Fun and Social.
Plumbing fixtures can break or clog, and bathrooms get dirty. The maid cleans them.

**Numbers:** Format: generic name | price | motives | footprint.
- Cheap toilet | §300 | Bladder 8 | 1x1
- Deluxe auto-flush toilet | §1,200 | Bladder 8, Comfort 4 | 1x1
- Basic shower | §650 | Hygiene 6 | 1x1
- Basic bathtub | §800 | Hygiene 6, Comfort 3 | 1x2 (ESTIMATE)
- Deluxe whirlpool tub | §3,200 | Hygiene 10, Comfort 8 | 1x2
- Kitchen sink | §250 | Hygiene 2 | 1x1
- Bathroom pedestal sink | §400 | Hygiene 2 | 1x1
- Deluxe kitchen sink | §500 | Hygiene 3 | 1x1
- Hot tub | §6,500 | Comfort 6, Hygiene 2, Fun 2 (one guide's values), Social | 2x2
Depreciation class: plumbing (-20% at the first midnight, then 1%/day; floor ESTIMATE 30%).

**Implementation:** Hygiene per hour:
- shower = 25 x hygieneRating (ESTIMATE; rating 6 gives 150/h, so about 40 minutes to fill);
- tub = 20 x hygieneRating, plus comfort = 6 x comfortRating per hour.
Toilet Use: bladder per hour = 150 x bladderRating (ESTIMATE; about 10 minutes to empty).
Each plumbing object keeps dirt (0-100): +5 to +10 per use (ESTIMATE). Above 50 it shows as 'dirty': roomImpact -5 and Hygiene gain reduced by 20%.

Sources: https://sims.fandom.com/wiki/Toilet, https://www.thesimswiki.com/wiki/Toilet, https://sims.fandom.com/wiki/List_of_plumbing_(The_Sims), https://sims.fandom.com/wiki/Bathtub, https://www.thesimswiki.com/wiki/Bathtub, https://sims.fandom.com/wiki/Hot_tub, https://www.ludo.guide/guide/the-sims/section-66, https://thesims.neoseeker.com/wiki/The_Sims_Items, https://sims.fandom.com/wiki/Maid


### Catalog: Lighting

Lamps light a room at night, and light contributes to Room. Decorative lamps also have a Room rating. Interactions: Turn On, Turn Off; Sims also toggle lights automatically when entering or leaving a room (ESTIMATE). No source documents bulb burnout in the original, so lamps do not break here (optional feature).

**Numbers:** Format: generic name | price | motives | footprint.
- Bottle table lamp | §25 | none | surface slot
- Halogen floor lamp | §50 | none | 1x1
- Lava lamp | §80 | Room 2 | surface slot
- Ceramic table lamp | §85 | none | surface slot
- Basic floor lamp | §100 | none | 1x1
- Chrome table lamp | §180 | none | surface slot
- Antique table lamp | §300 | Room 1 | surface slot
- Torch-style floor lamp | §350 | Room 1 | 1x1
- Wall lamp | ESTIMATE §50-§150 | wall
- Outdoor lamp | ESTIMATE §100-§300 | 1x1 outdoor

**Implementation:** Light contributes roomImpact while on: +10 per lit lamp, capped at +30 per room (ESTIMATE). Daylight through each window gives +5 during the day (ESTIMATE). A room with neither light nor windows gets -20 at night (ESTIMATE). Add the lamp's decor contribution of 5 x ratings.room whether the lamp is on or off.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_Items, https://strategywiki.org/wiki/The_Sims_2/Lighting/Table_Lamps


### Catalog: Miscellaneous (skill, recreation, utility, dressers)

Bookshelf interactions: Read a Book (Fun), Study Cooking, Study Mechanical (adults), Study (children raise grades). Any bookshelf works for skills.
Easel: Paint (Creativity). A finished painting can be sold (ESTIMATE: §5 x Creativity^2 per painting, max ~§500).
Chess set: Play Chess (Fun + Logic). A second Sim can Join.
Exercise bench: Work Out (Body; drains Hygiene and Energy faster). Adults only.
Mirror: Practice Speech (Charisma).
Telescope: Stargaze (Fun + Logic, at night). Small alien-abduction gag chance.
Pinball: Play (Fun).
Phone: Call friend (Social), Invite over, Services (maid, gardener, repairman), Order pizza, Emergency (police, fire).
Trash can: Empty Trash (carry to the outside can).
Dresser: Change Clothes (outfit swap).

**Numbers:** Format: generic name | price | motives / skill | footprint.
- Cheap bookshelf | §250 | Fun 1; Cooking, Mechanical | 1x1
- Mid bookshelf | §500 | Fun 2 | 1x1
- Deluxe bookshelf | §900 | Fun 3 | 1x2
- Folding easel | §250 | Creativity | 1x1
- Chess set | §500 | Fun; Logic | 1x1 (needs chairs/seats on both ends)
- Exercise bench | §700 | Body; adults only | 1x2 (ESTIMATE)
- Wall mirror | §100 | Charisma | wall
- Floor mirror | ESTIMATE §150 | Charisma | 1x1
- Backyard telescope | ESTIMATE §550 | Fun 4; Logic | 1x1 outdoor
- Pinball machine | §1,800 | Fun 5 | 1x2
- Wall phone | ESTIMATE §50 | Social via calls | wall
- Table phone | ESTIMATE §75 | surface slot
- Trash can | §30 | 1x1
- Child dresser | §300 | 1x1
- Adult dresser | ESTIMATE §250-§450 | 1x1
Advertisement values in the guide's table, Read a Book: Fun 10, 20, 30 for the three shelves.
Skill gain while studying: ESTIMATE 1 skill point per 4-6 game hours early, slowing at higher levels.

**Implementation:** skills: ['cooking','mechanical'] etc. tag the interactions that raise them.
The phone menu is a hub for economy actions: services billed hourly, pizza delivery (ESTIMATE §40, 8 slices of 33 Hunger each).
Empty Trash moves trash units from the indoor can to the outdoor can.

Sources: https://sims.fandom.com/wiki/Bookshelf, https://www.thesimswiki.com/wiki/Bookshelf, https://www.scribd.com/document/579017052/The-Sims-Superstar-Prima-Official-EGuide, https://sims.fandom.com/wiki/Easel, https://sims.fandom.com/wiki/Chess, https://thesims.neoseeker.com/wiki/The_Sims_Items, https://sims.fandom.com/wiki/Telescope, https://sims.fandom.com/wiki/Pinball_machine, https://sims.fandom.com/wiki/Garbage_can, https://www.tsomania.net/catalogs/buy.php?c=8&p=1&o=448, https://strategywiki.org/wiki/The_Sims/Skills


### Catalog rating to actual motive rate (proposed)

The original codes the real motive deltas per interaction, and they are not published. To make the 0-10 catalog ratings meaningful, use linear per-game-hour rates on the -100..+100 scale. Deluxe objects should not be strictly better on every axis; cheap objects stay usable but slower. Good values keep a cheap household viable while making upgrades clearly felt: about 30-50% faster per 2 rating points.

**Numbers:** ALL ESTIMATE, per game hour while the interaction runs:
- Comfort (sit/lie) = 6 x comfortRating
- Energy (sleep) = 3 x energyRating + 5
- Energy (nap on sofa) = 2 x energyRating
- Hygiene (shower) = 25 x hygieneRating
- Hygiene (bath) = 20 x hygieneRating
- Hygiene (sink) = 10 x hygieneRating, capped at +40 total per wash
- Bladder (toilet) = 150 x bladderRating, until empty
- Fun = 8 x funRating; personality match x1.5
- Hunger: from the meal formula
- Room: computed from the room score (not time-based)
Snack takes ~15 game min; a meal takes ~30 min to eat (ESTIMATE).

**Implementation:** Keep a single table: RATE_K = {comfort:6, energySleep:[3,5], hygieneShower:25, ...}, tunable in a dev panel. Motive decay is a separate system; balance the two together so a deluxe house wins roughly 1-2 extra free hours per day versus a starter house.

Sources: https://modthesims.info/d/663707/bed-catalog-rework-customizable-energy-comfort-and-price.html, https://giantbomb.com/wiki/Games/The_Sims, http://www.woobsha.com/diy-TTABTutorialMac.htm


### Room score formula (Room motive)

From FreeSO's reimplementation of the original's VM, function VMContext room-score refresh:
1. Add up RoomImpact over all objects in the room and in its connected support rooms. RoomImpact is a per-object dynamic variable that each object's script sets according to its state (decor value, lit lamp, dirty, broken, spoiled).
2. Scale by the total area: areaScale = max(1, areaTiles/12). Outdoors, areaScale = 30.
3. score = sum / areaScale.
4. score -= 10 indoors, or 15 outdoors.
5. Clamp to [-100, 100].
Every tick, the Sim's Room motive is set directly to the score of the room the Sim is standing in. Consequences:
- small rooms are easy to make nice;
- big rooms need proportionally more decor;
- an empty room sits at -10;
- outdoors is hard to raise.
The score is recomputed when objects change state, through the Refresh primitive's 'area contribution' mode.

**Numbers:** - areaScale = max(1, tiles/12); outdoors 30
- base offset: -10 indoor, -15 outdoor
- clamp: -100 to 100
- Catalog 'Room N' (0-10) is display-only. Suggested mapping: RoomImpact = 5 x N for decor (ESTIMATE). A 3x4 room with three Room-2 lamps/plants and one Room-9 painting: (30+45)/1 - 10 = 65.

**Implementation:** Maintain room ids via flood fill over walls and doors. On any object state change, recompute only that room.
roomScore = clamp(Σ obj.roomImpact() / max(1, tiles/12) - 10, -100, 100)
obj.roomImpact() returns decor + light - dirt - broken - spoiled. Set sim.motives.room = roomScore[roomAt(sim)] each tick.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMStackObjectVariable.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMRefresh.cs


### RoomImpact values of object states (mess, lighting, decor)

Positive and negative contributions that feed the room score:
- Positive: decoration, quality furniture (Room rating), lit lamps and daylight windows.
- Negative: dirty plates (worse when spoiled), trash piles, puddles, ashes, flies, roaches, dead plants or fish, broken objects, dirty toilets/showers/tubs, unmade beds, overflowing trash.
Flies appear over spoiled food, trash piles and similar mess, and also roam messy lots. Even unmade beds can attract them. Flies themselves lower the room score.

**Numbers:** ALL ESTIMATE, as RoomImpact units before area scaling:
- decor = +5 x RoomRating
- lit lamp = +10 (max +30 per room)
- daylight window = +5
- dark room at night = -20
- dirty plate = -5; spoiled plate (after 6 game hours) = -15 and spawns flies
- trash pile = -20
- puddle = -10
- ashes after fire = -20
- broken object = -10
- dirty plumbing (dirt > 50) = -5
- unmade bed = -5
- overflowing trash can = -15
- dead plant / dead fish = -15
- flies swarm = -10
- each roach = -5

**Implementation:** Each object computes roomImpact() from its own state flags, matching how the original lets objects set RoomImpact themselves. Mess objects (plate, trash pile, puddle, ashes) are themselves objects with a negative roomImpact and a 'Clean' interaction.

Sources: https://sims.fandom.com/wiki/Flies, https://sims.fandom.com/wiki/Cockroaches, https://screenrant.com/sims-1-get-rid-flies-bugs/, https://sims.fandom.com/wiki/Environment, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs


### Depreciation and sell-back

Selling an object in buy mode returns its current value. Objects depreciate at midnight after purchase, so selling or undoing on the same day returns 100% of the price. That allows free rearranging and mistake correction.
Each object definition has four fields: InitialDepreciation (subtracted once, at the first midnight), DailyDepreciation (subtracted every following midnight), DepreciationLimit (floor value) and SelfDepreciating (if true, the object's own script handles its value instead).
The current depreciated value also drives household net worth and bills.

**Numbers:** Official guide table (exact):
- B&W TV §85: -§21 initial, -§1/day, floor §17
- Colour TV §500: -§125, -§5/day, floor §100
- Plasma TV §3,500: -§875, -§35/day, floor §700
- Cheap fridge §600: -§120, -§6/day, floor §180
Per category:
- Electronics: initial 25%, daily 1% of price, floor 20% of price.
- Appliances: initial 20%, daily 1%, floor 30%.
- Plumbing: initial 20%, daily ~1%, floor ESTIMATE 30%.
- Furniture (seating, surfaces, beds): initial 15%, daily ~1%, floor ESTIMATE 40%.
- Decorative/art: ESTIMATE initial 10%, daily 0.5%, floor 50%; optional random appreciation of art.
The wiki's daily rule is about §1 per §100 of original price, rounded.

**Implementation:** Each object stores purchasePrice, boughtDay, value.
At midnight:
  if (day == boughtDay+1) value -= initial; else if (day > boughtDay+1) value -= daily;
  value = max(value, floor).
Sell: refund = (today == boughtDay) ? purchasePrice : value.
Show the sell value on hover in buy mode.

Sources: https://sims.fandom.com/wiki/Depreciation, https://www.scribd.com/document/579017052/The-Sims-Superstar-Prima-Official-EGuide, https://simstek.fandom.com/wiki/IFF, https://simswiki.info/wiki.php?title=4F424A44, https://www.moddb.com/mods/the-sims-object-editor, https://modthesims.info/t/76877, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/OBJD.cs


### Bills and repossession

Bills are delivered to the mailbox every 3 days. A Sim must fetch them and then pay them. The amount is a percentage of the depreciated value of nearly everything bought or built on the lot, so a lavish house costs more upkeep.
Unpaid bills age through colours: white, then yellow, then orange, then red, about 2 days per step. Red bills trigger a warning at 07:00. At 18:00 the next day the repo man comes and takes objects worth the amount owed.
Only adults can pay; a household of only children risks repossession.

**Numbers:** - Interval: every 3 days
- Bill = 3% x Σ(current depreciated value of billable objects) x (1 - 0.10 x number of children)
- Colour aging: ~2 days per colour step
- Repo: warning at 07:00 on red, repossession at 18:00 the next day
- Starting household funds in the original: §20,000 (well known; not re-verified here)
Example: a §30,000 depreciated house means a §900 bill every 3 days.

**Implementation:** Mailbox object with a bills[] list ({amount, issuedDay}).
Pay deducts funds.
Repo picks objects in descending value until their sum >= amount owed, and removes them from the lot.
Exclude walls, floors and the lot itself from billable objects (ESTIMATE; the source says 'almost all objects').

Sources: https://sims.fandom.com/wiki/Bill, https://www.thesimswiki.com/wiki/Bill, https://sims.fandom.com/wiki/Repo-man, https://sims.fandom.com/wiki/Bud_the_Repo-man


### Service NPCs and their fees

Hired from the phone. Hourly fees are deducted from household funds.
Maid: makes beds, cleans bathrooms, sprays roaches, mops puddles, washes dishes, takes out trash.
Gardener: waters indoor and outdoor plants every 3 days.
Repairman: fixes broken objects and unclogs toilets. Available 24h, arrives quickly. Comic flaw: he wastes billable time watching a TV he is repairing.

**Numbers:** - Maid: §10/hour
- Gardener: §10/hour; visits every 3 days; charges §10 even if there is nothing to do
- Repairman: §50/hour; on call any time
- Pizza delivery: ESTIMATE §40
- Firefighters and police: free

**Implementation:** Service = NPC with a task queue built from mess and broken objects on the lot. Bill per started game hour on departure.
Recurring services (maid daily, gardener every 3 days) are subscriptions cancelled from the phone.

Sources: https://sims.fandom.com/wiki/Service, https://sims.fandom.com/wiki/Maid, https://sims.fandom.com/wiki/Gardener, https://sims.fandom.com/wiki/Repairman, https://www.thesimswiki.com/wiki/Service


### Breakage and repair

Using a breakable object has a chance to break it, which interrupts the action. The broken object stops offering its interactions and lowers Room until it is fixed by a Sim (Repair) or the repairman.
Breakable objects: TVs, computers, stereos (ESTIMATE), showers, tubs, sinks (leak puddles), dishwasher (floods, ESTIMATE), trash compactor, espresso machine (breaks frequently), hot tub (ESTIMATE). Toilets clog (separate mechanic).
Repairing gives Mechanical skill, and higher Mechanical repairs faster. Repairing electronics with low Mechanical risks electrocution. Plumbing repair carries no shock risk.
Folk rule from players: cheap objects break more, deluxe ones rarely.

**Numbers:** ALL ESTIMATE:
- Break chance per use: cheap 5%, mid 2.5%, deluxe 1%; espresso machine 10%.
- Immunity window after purchase or repair: 24-72 game hours (from a later-game mod description).
- Repair duration = 120 / (1 + Mechanical) game minutes (mechanical 0 is 2h; 10 is about 11 min).
- Electrocution chance per repair attempt on electronics = max(0, 40% - 5% x Mechanical). It drains Energy and Mood heavily and is rarely fatal; a death option can stay off.
- Mechanical gain: +0.1 per repair (ESTIMATE).
- Broken plumbing spawns one puddle per game hour until fixed.

**Implementation:** obj.onUse(): if (!immune && rand() < obj.breakChance) setBroken().
A broken object advertises only 'Repair'.
The AI autonomously mops puddles, but Repair needs a player order (as players report) or an auto-repair flag for NPCs.

Sources: https://www.ludo.guide/guide/the-sims/when-an-object-is-broken, https://sims.fandom.com/wiki/Electronics, https://sims.fandom.com/wiki/Mechanical, https://strategywiki.org/wiki/The_Sims/Skills, https://sims.fandom.com/wiki/Coffee, https://modthesims.info/d/535156/stuff-breaks-far-less-easily.html, https://www.nraas.net/community/chatterbox/topic9326, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/OBJD.cs


### Toilet clogging

Toilets clog if they are not flushed after several uses. A clogged toilet cannot be used until an adult unclogs it or the repairman is called. Unclogging gives Mechanical skill points. The deluxe toilet auto-flushes, so it rarely clogs. A desperate Sim with no usable toilet wets themselves, creating a puddle and a Hygiene penalty.

**Numbers:** ESTIMATE:
- Each unflushed use adds +1 'unflushed'; Sims skip flushing with 30% chance (lazy/sloppy personalities 60%).
- Clog when unflushed >= 3, or on a 2% random chance per use (0.5% for the deluxe toilet).
- Unclog takes 30 game min, +0.1 Mechanical.

**Implementation:** toilet.state in {ok, clogged, dirty}. Flush resets the unflushed counter. The bladder-failure event spawns a puddle and sets Hygiene -= 30 (ESTIMATE).

Sources: https://sims.fandom.com/wiki/Toilet, https://strategywiki.org/wiki/The_Sims/Skills, https://strategywiki.org/wiki/The_Sims_2/Plumbing/Toilets


### Cooking fires and fire safety

Cooking on the stove can start a fire. The risk depends mainly on Cooking skill; fan sources say stove quality and mood do not matter. Fire spreads to nearby flammable objects and Sims panic.
If a smoke detector is in the same room, firefighters come automatically. Otherwise a Sim must phone them, or the fire burns.
Burned objects are destroyed and leave ash piles (mess). Sims caught in fire can die (death by fire exists in the original).

**Numbers:** Fire chance per cooking action: 15% at Cooking 0, 5% at 1, 1% at 2, ~0 at 3 or more (old forum figures repeated by a cheat site).
Alternative fan model: 6% when skill equals the recipe difficulty, 2% at +1, 1% at +2.
Smoke detector §50, same-room coverage.
Fire spread: ESTIMATE, each burning tile has a 10% chance per game minute to ignite an adjacent flammable object.

**Implementation:** In Prepare Meal's cook step: if (rand() < FIRE_BY_SKILL[min(skill,3)]) spawnFire(stove.tile).
The fire object has a spread timer. The firefighter NPC is dispatched if any smoke detector shares the room, or the phone 'Emergency: fire' is used.

Sources: https://modthesims.info/t/422773, https://www.captainpackrat.com/Misc/simcheats.htm, https://www.thegamer.com/sims-1-fire-prevention-extinguish-alarm/, https://sims.fandom.com/wiki/Cooking, https://sims.fandom.com/wiki/Smoke_detector, https://simscommunity.info/2026/07/22/the-sims-1-deaths/


### Dirty dishes and food spoilage

After eating, a plate stays where the Sim ate as a dirty dish. A group-meal platter becomes dirty when its servings run out. Uneaten food and dirty plates spoil over time; spoiled plates spawn flies and hurt Room more.
Sims, or the maid, Clean plates:
- carry them to a kitchen sink (Wash Dishes);
- or load them into a dishwasher (faster);
- or throw leftovers into the trash, adding 1 trash unit.
Neat Sims clean autonomously; sloppy Sims rarely do (personality link, ESTIMATE).

**Numbers:** ESTIMATE:
- A plate is 'dirty' immediately after eating: RoomImpact -5.
- It becomes 'spoiled' after 6 game hours: -15, and flies spawn.
- Unattended full platter: servings spoil after 8 game hours.
- Wash at sink: 10 game min per plate. Dishwasher: 3 min per plate, many plates per load.
- Throwing away leftovers = +1 trash unit.

**Implementation:** Plate object state: {clean→inUse→dirty→spoiled}, with a spoilTimer. 'Limpar' advertises to neat Sims with high weight. Dirty plates count toward the lot dirt score used for roach spawning.

Sources: https://sims.fandom.com/wiki/Flies, https://screenrant.com/sims-1-get-rid-flies-bugs/, https://thefilibusterblog.com/the-sims-1-causes-of-flies-bugs-and-effective-solutions-to-eliminate-them/, https://sims.fandom.com/wiki/Maid, https://steamcommunity.com/app/3314060/discussions/0/594013822771044023


### Trash system (cans, compactor, piles, newspapers)

Indoor trash containers hold trash units: leftovers, snack wrappers, old newspapers. When full, Sims Empty Trash, carrying a bag to the outdoor curbside can, which is cleared periodically.
If an indoor can overflows, the extra becomes a trash pile on the floor. Piles are mess objects that attract flies and lower Room until cleaned.
The trash compactor is a high-capacity version.
The daily newspaper accumulates if not thrown out. Old papers are trash to be cleaned up (the maid handles them).

**Numbers:** ESTIMATE:
- Basic trash can (§30): capacity 5 units.
- Trash compactor (§375): capacity 15 units.
- Overflow beyond capacity: spawns a trash pile (RoomImpact -20, flies after 12 h).
- Outdoor curbside can: capacity 30; emptied daily at 08:00 by an unseen pickup.
- Each day's uncollected newspaper becomes 1 trash unit / small pile after 2 days.
- A full can shows an 'overflowing' state at 100%: -15 RoomImpact.

**Implementation:** trashCan {units, capacity}. Add trash: if (units >= capacity) spawnPile(adjacentTile) else units++.
'Esvaziar lixo' is a chore with priority growing as units/capacity rises (neat Sims weight x2).

Sources: https://sims.fandom.com/wiki/Garbage_can, https://sims.fandom.com/wiki/Trash_compactor, https://sims.fandom.com/wiki/Newspaper, https://sims.fandom.com/wiki/Maid, https://strategywiki.org/wiki/The_Sims_2/Appliances/Large_Appliances


### Pests and lot dirtiness (flies, roaches, puddles)

Flies:
- appear over spoiled plates, trash piles and similar mess, and roam messy lots (even unmade beds can cause them);
- they are harmless but reduce Room where they are.
Roaches:
- spawn on dirty lots based on the lot's overall dirt score (some objects are exempt);
- they wander and further lower Room;
- they are removed by spraying (the maid sprays roaches).
Puddles come from broken plumbing, bladder accidents and showers. Sims mop them (Clean) or the maid does.

**Numbers:** ESTIMATE:
- lotDirt = Σ (dirty plates x1, spoiled x3, piles x5, puddles x2, dirty plumbing x1, unmade beds x1, overflowing cans x3).
- Roach spawn check every game hour: if lotDirt > 15, spawn chance = min(50%, (lotDirt-15) x 3%); max 8 roaches.
- Spray: 15 min, removes roaches in a 3-tile radius.
- Mop puddle: 10 min.

**Implementation:** Run a pest tick hourly. Flies are a particle effect attached to spoiled/pile objects, plus a room-level swarm object when room dirt > threshold, carrying a negative roomImpact.

Sources: https://sims.fandom.com/wiki/Flies, https://sims.fandom.com/wiki/Cockroaches, https://www.thesimswiki.com/wiki/Cockroaches, https://sims.fandom.com/wiki/Maid, https://sims.fandom.com/wiki/Cleaning


### Footprints, placement and price tiers (design guidance)

Objects occupy whole tiles on a square grid, with 4 rotations. Some need a wall (wall lamps, mirrors, phones, smoke detectors, paintings). Some are surface-slot items (table lamps, small appliances, computers). Each needs free 'use' tiles in front of it to route to.
Price ladder pattern in the original: cheap, mid, deluxe items typically cost about 1x, 2x and 4-6x, for roughly +1, +2 and +3-4 rating points, plus Room on deluxe pieces. A household starting with §20,000 must buy lot and house too, so a starter kitchen-bath-bed set must cost about §3,000-§4,000.

**Numbers:** Typical footprints:
- 1x1: chair, counter, fridge, stove, toilet, shower, sink, TV, computer, lamp, bookshelf
- 1x2: loveseat, single bed, tub, pinball, deluxe bookshelf, plasma TV (2x1)
- 1x3: sofa (ESTIMATE)
- 2x2: double bed (ESTIMATE), hot tub
Starter essentials, at cheapest catalog prices: fridge 600 + stove 400 + counter 150 + toilet 300 + shower 650 + sink 250 + single bed 300 + chair 80 + card table 95 + trash can 30 + smoke detector 50 = §2,905.

**Implementation:** footprint {w,h} plus useTiles[] relative to orientation. Validate placement for tile occupancy, wall adjacency, slot availability and a path from the use tile to the door. Show a red/green ghost. Keep the original's 1x/2x/5x price ladder for the generic cheap/mid/deluxe naming in the Portuguese UI (e.g. 'Geladeira básica', 'Geladeira média', 'Geladeira de luxo').

Sources: https://sims.fandom.com/wiki/Television/The_Sims, https://sims.fandom.com/wiki/Pinball_machine, https://www.ludo.guide/guide/the-sims/section-66, https://sims.fandom.com/wiki/Bookshelf, https://thesims.neoseeker.com/wiki/The_Sims_Items


## CAREERS

Research summary for the skills, careers, relationships and money rules of a browser life-sim based on The Sims (2000, "TS1"). Method note: WebFetch could not reach any site in this environment (every host returned a DNS failure, including wikipedia.org and fandom.com). All facts below come from WebSearch result extracts of the cited pages, plus domain knowledge. Each value is labelled DOCUMENTED (seen in a cited source extract), RECALLED (from memory of TS1 data, worth checking against the source) or ESTIMATE (a design proposal).

Skills:
- TS1 has 6 visible skills from 0 to 10: Cooking, Mechanical, Charisma, Body, Logic, Creativity.
- Cleaning is a 7th skill that is hidden in TS1 and cannot be trained. We propose making it visible and trainable, as The Sims 2 does.
- Skills come from specific objects: bookshelf, mirror, exercise machine, pool, chess, telescope, easel and piano.
- Skill-building is blocked while mood is bad (DOCUMENTED). Fun matters only indirectly: it pulls mood down while studying.
- Rate per hour is not documented. We propose a curve where each point gets slower: about 1.4 h for the 1st point, about 4.6 h for the 10th, about 30 h in total.

Careers:
- 10 levels per track. Sims work every day (TS1 has no weekends). Pay is a flat daily salary, paid when the Sim gets home.
- Promotion needs the next level's skills plus enough "family friends" (friends of anyone in the household), and the Sim must go to work in a good mood.
- Fired after missing 2 days in a row. Re-joining the same track starts again at level 1.
- The carpool arrives 1 h before the shift and leaves when the shift starts.
- Job offers: the newspaper gives 1 per day; the computer gives 3, refreshed at midnight. All offers start at level 1.
- Documented tables: Science (full), Business (levels 1-6 and 8, plus 14 friends at the top) and Military (pay, hours and friends). Law Enforcement and Politics are partial.

Relationships:
- The TS1 base game had one score per directed pair, from -100 to 100. The Hot Date expansion added a Daily score (moves fast) and a Lifetime score (moves slowly).
- Friend = Daily of at least 50 in both directions. Crush = Daily of at least 70 plus a successful romantic action. Love = Lifetime of at least 70 plus a successful romantic action.
- Daily drops 2 points per day at 16:00 for Sims who live elsewhere. For housemates, Daily drops 2 while Lifetime rises 1.
- Personality thresholds: Nice 6+ likes hugs, Nice 3 or less refuses them, Playful 6+ likes jokes. Insult and slap retaliation also depends on Nice.

Money:
- New households start with §20,000 regardless of size.
- Bills arrive every 3 days: 3% of the depreciated value of billable objects, minus 10% per child.
- Repo-man: after red bills stay unpaid for more than 2 days, a warning comes at 07:00. At 18:00 the next day he takes objects worth about the amount owed.
- Food is charged per use and the fridge never runs out: snack §5, single meal §10, group meal §20.
- Objects lose value the first midnight after purchase (electronics 25%, plumbing and appliances 20%, furniture 15%), then about 1% of the original price per day.

For the game itself, use Portuguese, original names for careers, job titles and NPCs, and no EA/Maxis names, assets or code.


### Skill system overview (scale, storage, who can learn, decay)

Six visible skills (Cooking, Mechanical, Charisma, Body, Logic, Creativity) each shown as 10 pips (0-10). Cleaning is a seventh skill, hidden in TS1. In TS1 only adults earn skill points. Skills are gained only while performing a specific interaction on a specific object. Skills do not decay in TS1 (RECALLED). Mood gate (DOCUMENTED): a Sim in a bad mood refuses to build skills and a 'not in the mood / too depressed' message appears. Fan Q&A puts the cutoff at overall mood below 50% of the bar (i.e. mood < 0 on a -100..+100 scale). A Sim in a bad mood also won't do activities that don't improve their motives (study, exercise).

**Numbers:** Display 0-10 per skill. Internal storage 0-1000 (100 internal = 1 pip) — RECALLED from TS1 modding conventions; personality traits use the same 0-1000/10-pip scale. Mood gate: skilling blocked if mood < 0 (DOCUMENTED qualitatively; numeric cutoff from fan Q&A). ESTIMATE: also block if any single motive <= -80 ('critical').

**Implementation:** Store skills as integers 0..1000 per Sim and show floor(value/100) pips. Each tick (1 game-minute) of a skill interaction: if (sim.mood < 0 || anyMotiveCritical) { cancelInteraction(); showBubble('Não estou com vontade'); } else skill += gainPerMinute. Show a small floating '+1 Lógica' toast when floor(value/100) increases.

Sources: https://sims.fandom.com/wiki/Skill, https://sims.fandom.com/wiki/Mood, https://www.supercheats.com/playstation2/questions/thesims/21763/my-sim-always-says-that-he-s-t.htm, https://strategywiki.org/wiki/The_Sims/Skills


### Skill gain rate formula (with Fun/mood and personality effects)

TS1 per-hour rates are not published. Documented qualitatively: the first ~4 points take about an hour or two each, later points take progressively longer. One player reports the 9th and 10th points take days of near-exclusive practice. Fun only acts indirectly in TS1: boring activities (bookshelf, mirror, exercise) let Fun and other motives decay, and when mood drops below 0 the Sim stops. Fun-giving skill objects (chess, piano, pool, telescope, easel) allow longer sessions. Personality boosts are not documented for TS1; The Sims 2 links Active→Body, Outgoing→Charisma, Playful→Creativity, Serious (low Playful)→Logic, Neat→Cleaning, and we propose reusing that.

**Numbers:** ESTIMATE formula: gainPerHour = baseRate(object) × levelFactor(L) × personalityMult × partnerMult, with levelFactor(L) = 1 / (1 + 0.25·L), where L = current pip (0-9). baseRate (internal points/hour), ESTIMATE: bookshelf 70, mirror 70, exercise machine 80, pool 50, chess 50, telescope 40 (night only), easel 60, piano 50. With base 70, hours per pip are 1.43, 1.79, 2.14, 2.50, 2.86, 3.21, 3.57, 3.93, 4.29, 4.64, about 30 h total from 0 to 10. personalityMult = 1.5 if the related trait is >= 7, 1.25 if it is 5-6, otherwise 1.0 (ESTIMATE). partnerMult = 1.25 for chess played against another Sim (ESTIMATE). Motive side-effects per hour (ESTIMATE): study and mirror Fun -6, Comfort per seat. Exercise Energy -15, Hygiene -20, Fun -4. Pool Fun +15, Energy -10. Chess Fun +10 (+15 for Playful 7+). Piano Fun +12. Easel Fun +8. Telescope Fun +10.

**Implementation:** Define per-object 'skillAdvert' {skill, baseRate, motiveDeltas, conditions}. In the sim tick: if the current action has a skillAdvert, apply skill += baseRate/60 * levelFactor * mults, then apply the per-minute motive deltas, then re-check the mood gate. Keep all constants in one balance JSON so they can be tuned.

Sources: https://sims.fandom.com/wiki/Skill, https://modthesims.info/t/607320, https://strategywiki.org/wiki/The_Sims_2/Skills, https://sims.fandom.com/wiki/Game_guide:Quicker_studying


### Cooking skill

Gained by 'Study Cooking' at a bookshelf (DOCUMENTED). Using a stove with less than 3 Cooking gives a high risk of fire (DOCUMENTED). Higher Cooking makes meals fill more Hunger and shortens preparation time (DOCUMENTED qualitatively). Using a microwave or making a fridge salad carries less fire risk.

**Numbers:** Fire threshold: Cooking < 3 at the stove (DOCUMENTED). ESTIMATE: fireChancePerMeal = 0.20 × (3 − cooking)/3 when cooking < 3, otherwise 0.005. Meal Hunger restore = applianceBase (fridge snack +15, microwave meal +35, stove meal +45) + 4 × cooking. Prep time = 45 min × (1 − 0.05 × cooking).

**Implementation:** 'Cozinhar' action at the stove: roll for fire at the end of the prep phase. Meal quality is stored on the plate object and used when eaten. Bookshelf action 'Estudar culinária' feeds the skill.

Sources: https://sims.fandom.com/wiki/Cooking, https://strategywiki.org/wiki/The_Sims/Skills, https://www.thegamer.com/the-sims-1-how-to-build-maximise-cooking-skill-guide/


### Mechanical skill

Gained by 'Study Mechanical' at the bookshelf. StrategyWiki also lists unclogging a toilet and repairing broken objects as sources. Higher Mechanical repairs faster and lowers the chance of electrocution when repairing electronics.

**Numbers:** ESTIMATE: repair time = 120 min × (1 − 0.08 × mech). Shock chance on electronics repair = 0.25 × (1 − mech/10). Repair action grants 40 internal pts/h (slower than the book's 70).

**Implementation:** Broken objects get a 'Consertar' action. On completion, set broken = false. A shock causes Mood -20, Hygiene -30 and a burnt hair sprite (no death unless a later water-puddle rule is added).

Sources: https://sims.fandom.com/wiki/Mechanical, https://strategywiki.org/wiki/The_Sims/Skills, https://www.thegamer.com/the-sims-mechanical-skill-improvement-guide/


### Charisma skill

Gained by 'Practice Speech' in front of a mirror (wall mirror, mirrored dresser or medicine cabinet). Mainly a career requirement in TS1.

**Numbers:** Base rate ESTIMATE 70 pts/h. Optional design bonus (ESTIMATE, not in TS1): +0.5 acceptance score per Charisma pip on friendly social interactions.

**Implementation:** Any object with tag 'mirror' advertises 'Praticar discurso'. Animation: the Sim gesturing at the mirror.

Sources: https://strategywiki.org/wiki/The_Sims/Skills


### Body skill

Gained by swimming in a pool or using an exercise machine. Higher Body makes a Sim more likely to win a fight (DOCUMENTED qualitatively). Also used by Military and Law Enforcement careers.

**Numbers:** ESTIMATE: exercise machine 80 pts/h (Energy -15/h, Hygiene -20/h); pool 50 pts/h (Fun +15/h). Fight win chance = clamp(0.5 + 0.06 × (bodyA − bodyB), 0.1, 0.9).

**Implementation:** The fight outcome is used by the 'Brigar' interaction. The loser gets Mood -15 and relationship -10 toward the winner.

Sources: https://strategywiki.org/wiki/The_Sims/Skills


### Logic skill

Gained by playing chess (alone or with another Sim, who also gains), and by stargazing with a telescope. Fan sources also mention the newspaper crossword and a potions table (expansion).

**Numbers:** ESTIMATE: chess 50 pts/h (×1.25 with a partner, Fun +10/h); telescope 40 pts/h, usable 20:00-05:00 only, Fun +10/h.

**Implementation:** Chess is a 2-slot object, so the second Sim can join via 'Jogar junto'. Both get skill and Fun, and their Daily relationship rises +1 per 30 min (ESTIMATE).

Sources: https://strategywiki.org/wiki/The_Sims/Skills, https://www.thegamer.com/sims-1-logic-skill-chess-telescope-abducted/


### Creativity skill

Gained by painting at an easel or playing piano. StrategyWiki also lists guitar and a workbench (expansion objects). Paintings can be sold.

**Numbers:** ESTIMATE: easel 60 pts/h, piano 50 pts/h (Fun +12/h). Painting finished after 3 h; sale price = §(10 + 25 × creativity), so §260 at Creativity 10 (ESTIMATE).

**Implementation:** Easel keeps a 'progress' value. On completion, spawn a painting item the player can sell or hang (hanging adds to Room score).

Sources: https://strategywiki.org/wiki/The_Sims/Skills


### Cleaning skill (hidden in TS1; proposed visible)

In TS1 Cleaning is hidden, used mostly by maids and janitors, and cannot be raised in-game. Higher Cleaning makes cleaning and mopping faster and more efficient (DOCUMENTED). In The Sims 2 it rises by tidying messes or reading. Proposal: make it the 7th visible skill, trained by cleaning actions.

**Numbers:** ESTIMATE: +30 pts per game-hour spent cleaning (mop puddle, scrub toilet/shower/tub, wash dishes, empty trash). Clean-action duration = base × (1 − 0.06 × cleaning). Neat >= 7 gives ×1.5 gain.

**Implementation:** Tag every cleaning action with skill: 'cleaning'. Add Cleaning to the skills panel.

Sources: https://sims.fandom.com/wiki/Cleaning, https://strategywiki.org/wiki/The_Sims_2/Skills


### Career system overview

Only adults work, one job at a time, 10 levels per track. TS1 has no weekdays: adults work every day and children go to school every day. Salary is a fixed daily amount, paid when the Sim returns home. Promotion requires meeting every skill requirement of the next level plus a number of 'family friends': friends of any household member, not just the worker. Design pattern (DOCUMENTED): pay and difficulty trade off. Tracks with the lowest entry pay have the highest top pay; Military has the highest pay at levels 1-6 and the lowest at 7-10. In TS1 with expansions, a level-10 Sim may get a message moving or offering them to another track.

**Numbers:** Base TS1 tracks with daily pay at level 1 → level 10. DOCUMENTED: Business §120→§1,200; Science §155→§1,000; Military §250→§650; Law Enforcement §240→§700; Politics §220→§750. RECALLED (verify): Medicine §200→§850; Entertainment §100→§1,400; Life of Crime §140→§1,100; Pro Athlete §110→§1,300; Xtreme §175→§925. Typical shift length 4-9 h.

**Implementation:** Data-driven: careers.json = [{id, namePt, levels:[{titlePt, start, end, pay, req:{cooking, mechanical, charisma, body, logic, creativity}, friends, carpoolSprite}]}]. Use original Portuguese titles, e.g. 'Negócios', 'Ciência', 'Forças Armadas', 'Polícia', 'Política'. familyFriends() = size of the set of non-household Sims X such that some household member H has daily(H→X) >= 50 and daily(X→H) >= 50.

Sources: https://www.teoalida.com/thesims/the-sims-1-career-tracks/, https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs, https://sims.fandom.com/wiki/Career, https://sims.fandom.com/wiki/Military, https://cyndersanity.github.io/sims-legacy-mod-guide/careers.html


### Career track: Business (documented)

The table gives requirements to HOLD each level, i.e. what is needed to be promoted INTO it. Neoseeker lists the same data as 'needed to advance' one row earlier; the two were reconciled by that offset and they agree. Skills used: Mechanical, Charisma, Logic, Creativity.

**Numbers:** L1 Mailroom §120, 09-15, no requirements. L2 Executive Assistant §180, 09-16, no requirements. L3 Field Sales Rep §250, 09-16, Mech 2. L4 Junior Executive §320, 09-16, Mech 2, Cha 2, 1 friend. L5 Executive §400, 09-16, Mech 2, Cha 2, Log 2, 3 friends. L6 Senior Manager §520, 09-16, Mech 2, Cha 3, Log 3, Cre 2, 6 friends. L7 Vice President §660, 09-17, ESTIMATE Mech 2, Cha 4, Log 4, Cre 2, 8 friends. L8 President §800, 09-17, Mech 2, Cha 5, Log 6, Cre 3, 10 friends. L9 CEO §950, 09-16, ESTIMATE Mech 2, Cha 6, Log 7, Cre 4, 12 friends. L10 Tycoon §1,200, hours ESTIMATE 10-15, ESTIMATE Mech 2, Cha 7, Log 9, Cre 6, 14 friends. Pay, hours of L1-L9, requirements of L1-L6 and L8, and 14 friends at the top are DOCUMENTED.

**Implementation:** Use as the reference 'easy start, rich end' track. Rename it, e.g. 'Carreira Corporativa' with titles 'Office-boy', 'Assistente', 'Vendedor externo' and so on.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs, https://sims.fandom.com/wiki/Business_(career), https://cyndersanity.github.io/sims-legacy-mod-guide/careers.html, https://www.thegamer.com/sims-1-all-job-paths-careers-salaries/


### Career track: Science (documented)

The best-documented TS1 track. Neoseeker's 'needed to advance' rows have been shifted to 'needed to hold'. A few gaps are filled by interpolation and marked ESTIMATE.

**Numbers:** L1 Test Subject §155, 09-15, no requirements. L2 Lab Assistant §230, 23-05, no requirements. L3 Field Researcher §320, 09-15, Log 2. L4 Science Teacher §375, 09-16, Cha 1, Log 3, 1 friend. L5 Project Leader §450, 10-17, Cha 2, Log 4, Cre 1, 3 friends. L6 Inventor §540, 10-19, Mech 2, Cre 3, 4 friends, plus ESTIMATE Cha 2, Log 5. L7 Scholar §640, 10-15, Mech 4, Log 6, Cre 4, 5 friends, plus ESTIMATE Cha 3. L8 Top Secret Researcher §740, 10-15, Cook 1, Mech 6, Cha 4, Log 7, 7 friends, plus ESTIMATE Cre 5. L9 Theorist §870, 10-14, Mech 7, Log 9, Cre 7, 8 friends, plus ESTIMATE Cook 1, Cha 4. L10 Mad Scientist §1,000, 10-14, Cook 2, Mech 8, Cha 5, Log 10, Cre 10, 10 friends.

**Implementation:** Shows the pattern to copy: an odd night shift early on (Lab Assistant 23-05), every skill required at the top, roughly 1 friend per level from L4.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs, https://www.teoalida.com/thesims/the-sims-1-career-tracks/, https://www.thesimswiki.com/wiki/Science_(career)?section=1


### Career track: Military (pay, hours and friends documented)

Front-loaded pay and low friend requirements. Skills used: Body, Mechanical, Charisma, Logic, and a little Cooking.

**Numbers:** L1 Recruit §250, 06-12, none. L2 Elite Forces §325, 07-13, none. L3 Drill Instructor §400, 08-14, Body 2. L4 Junior Officer §450, 09-15, ESTIMATE Mech 1, Cha 1, Body 4. L5 Counter-Intelligence §500, 09-15, ESTIMATE Mech 2, Cha 2, Body 5, Log 1, 0 friends. L6 Flight Officer §550, 09-15, 1 friend, ESTIMATE Mech 3, Cha 2, Body 6, Log 2. L7 Senior Officer §580, 09-15, 3 friends, ESTIMATE Mech 4, Cha 3, Body 7, Log 4. L8 Commander §600, 09-15, 5 friends, ESTIMATE Mech 6, Cha 4, Body 8, Log 6. L9 Astronaut §625, 09-15, 6 friends, ESTIMATE Mech 8, Cha 5, Body 9, Log 8. L10 General §650, 09-15, 8 friends, ESTIMATE Cook 2, Mech 10, Cha 7, Body 10, Log 10. Pay, hours, the L3 requirement and friends 1/3/5/6/8 are DOCUMENTED.

**Implementation:** A good 'quick money, few friends' option for solo Sims.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs, https://sims.fandom.com/wiki/Military, https://gamerant.com/the-sims-legacy-collection-best-paying-careers-jobs/


### Career track: Law Enforcement (pay and hours documented, upper requirements ESTIMATE)

Night and odd shifts at low levels. Skills used: Body, Mechanical, Logic, Charisma. As a cross-check, The Sims 2 kept many TS1 low-level wages ×1.4 (Security Guard §336 = §240 × 1.4).

**Numbers:** L1 Security Guard §240, 00-06, none. L2 Cadet §320, 09-15, none. L3 Patrol Officer §380, 17-01, Body 2. L4 Desk Sergeant §440, 09-15, Body 2, Mech 2, 1 friend. L5 Vice Squad §490, 10-16, Mech 3, Body 4, 2 friends (source wording ambiguous). L6 Detective §540, 09-15, ESTIMATE Mech 3, Body 5, Log 2, Cha 1, 3 friends. L7 Lieutenant §590, 09-15, ESTIMATE Mech 4, Body 6, Log 3, Cha 2, 4 friends. L8 SWAT Team Member §625, 09-15, ESTIMATE Mech 5, Body 7, Log 5, Cha 3, 6 friends. L9 Police Chief §650, 09-17, ESTIMATE Mech 6, Body 9, Log 7, Cha 4, 8 friends. L10 Captain Hero §700 (title RECALLED), hours ESTIMATE 10-16, ESTIMATE Mech 7, Body 10, Log 9, Cha 6, Cre 3; one source says 12 friends for the §700 level.

**Implementation:** Rename, e.g. 'Segurança noturno' through 'Herói da cidade'. Night shifts create interesting conflicts with sleep and Energy.

Sources: https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs, https://www.teoalida.com/thesims/the-sims-1-career-tracks/, https://strategywiki.org/wiki/The_Sims_2/Law_Enforcement, https://sims.fandom.com/wiki/Law_enforcement


### Career track: Politics (friends documented, skills ESTIMATE)

The most friend-hungry track: it is described as one of the hardest in TS1 and needs 17 family friends at the top. Skills used: mostly Charisma, plus Logic, Creativity and a little Body.

**Numbers:** L1 Campaign Worker §220, 09-18, 0 friends. L2 Intern §300, 09-15, 0 friends. L3 Lobbyist §360, 09-15, 0 friends. L4 Campaign Manager §430, 09-18, 2 friends. L5 City Council Member §485, 09-15, 4 friends. L6 State Assembly §540, 09-16, 6 friends. L7 Congressman §600, 10-14, 9 friends. L8 Judge §650 (RECALLED), ESTIMATE 11 friends. L9 Senator §700 (RECALLED), ESTIMATE 14 friends. L10 Mayor §750, 17 friends. Hours conflict between sources (09-18 vs 09-15 for L1). ESTIMATE skills: Cha = level − 1 (capped at 10), Log = max(0, level − 3), Cre = max(0, level − 5), Body = 2 from L7.

**Implementation:** Drives social gameplay: phone calls and parties become essential. Rename, e.g. 'Cabo eleitoral' through 'Prefeito'.

Sources: https://cyndersanity.github.io/sims-legacy-mod-guide/careers.html, https://www.teoalida.com/thesims/the-sims-1-career-tracks/, https://www.thesimswiki.com/wiki/Politics, https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs


### Job search (newspaper and computer)

A newspaper is delivered to the lot each morning with one job offer. A computer's 'Find Job' shows 3 more offers. Computer offers refresh at midnight; the newspaper offer changes only with the next day's paper. In TS1 every job taken this way starts at level 1. No skill is needed to start. Accepting a job replaces the current one. Re-joining a track you were fired from starts at level 1.

**Numbers:** Offers per day: newspaper 1, computer 3 (DOCUMENTED). Newspaper delivery time ESTIMATE 07:00. Each offer = random track (no duplicates that day), level 1. Reading the paper for jobs takes ESTIMATE 15 game-min.

**Implementation:** At 00:00 regenerate computerOffers = sample(tracks, 3). At 07:00 spawn a newspaper object with paperOffer = sample(tracks, 1). The UI is a modal listing title, pay and hours with an 'Aceitar' button. Store sim.job = {trackId, level:1, perf:0, missedStreak:0}.

Sources: https://sims.fandom.com/wiki/Career, https://www.thegamer.com/the-sims-1-how-to-get-job-agent-start-career/, https://www.thegamer.com/sims-1-all-job-paths-careers-salaries/


### Carpool and work timing

A carpool arrives exactly 1 hour before the shift starts, with a popup notification, and waits. The Sim must walk to it before the shift start time or they miss work. The Sim is off-lot for the whole shift, returns at shift end, and is paid on return. If a promotion changes the hours so that a second shift falls on the same day, missing that second carpool has no penalty. The car sprite improves with level (cosmetic).

**Numbers:** Arrival = shiftStart − 60 min (DOCUMENTED). Departure deadline = shiftStart (RECALLED/ESTIMATE). Return = shiftEnd. Pay = level.pay added on return. Autonomy ESTIMATE: at shiftStart − 60 the Sim gets a top-priority 'Ir trabalhar' advert if free will is on; it is interrupted only by critical Bladder.

**Implementation:** Scheduler event 'carpoolArrive' spawns a car at the curb. If the Sim enters before 'carpoolLeave', mark atWork = true and hide the Sim. At shiftEnd run resolveWorkday(sim): apply motive deltas, roll promotion/chance card, add pay, unhide the Sim. If the car leaves without the Sim, run missedWork(sim).

Sources: https://sims.fandom.com/wiki/Job_performance, https://www.thegamer.com/sims-1-all-job-paths-careers-salaries/, https://sims.fandom.com/wiki/Career


### Mood requirement and promotion roll

TS1 rule: the Sim must meet ALL skill and family-friend requirements of the next level AND go to work in a good mood. A bad (red) mood blocks promotion even with maxed skills. A 'platinum' (near max) mood virtually guarantees promotion when requirements are met. Promotion chance falls as the Sim rises. In TS1 a Sim can still go to work in a bad mood; mood only affects performance and promotion.

**Numbers:** ESTIMATE formula, run at shift end using M = mood when boarding the carpool (−100..+100): if (!meetsNextReqs || M < 0) pPromo = 0; else pPromo = clamp(0.2 + 0.8 × M/100, 0, 1) × (1 − 0.03 × (level − 1)). That gives 100% at M = 100 on L1 and about 79% at M = 100 on L9. On promotion: level += 1, new pay and hours apply from the next day, perf resets to 0, and a message shows the new title. ESTIMATE optional one-off bonus equal to 1 day of the new pay (not in TS1).

**Implementation:** Snapshot sim.moodAtDeparture when the Sim enters the carpool. The career panel shows each next-level requirement in green or red, a 'Amigos da família: X/Y' line and a performance bar.

Sources: https://sims.fandom.com/wiki/Career, https://sims.fandom.com/wiki/Job_performance, https://www.thegamer.com/sims-1-all-job-paths-careers-salaries/, https://gamefaqs.gamespot.com/ps2/561482-the-sims/answers/39299-how-do-i-get-promited-to-the-next-level-in-my-job


### Job performance, demotion and firing

Missing one day gives a warning but no demotion. Missing two days in a row means firing (3 days in the console game Bustin' Out). A fired Sim must restart any track at level 1. Demotion happens when job performance is poor or dismal. One mod source says an unmodded game removes 25 performance points per missed day; that source appears to describe The Sims 2, so treat it as a reference value.

**Numbers:** perf range −100..+100 (ESTIMATE). Daily update: perf += round(M/5), i.e. −20..+20. Missed day: perf −= 25, no pay, missedStreak += 1; streak 1 gives a warning letter, streak 2 means fired (DOCUMENTED rule). An attended shift resets missedStreak to 0. Demotion ESTIMATE: if perf <= −60 at shift end, then level −= 1 (minimum 1) and perf = 0. 'Sick day' option, not in TS1: none.

**Implementation:** missedWork(sim){ sim.job.missedStreak++; sim.job.perf -= 25; if (sim.job.missedStreak >= 2) { sim.job = null; notify('Você foi demitido'); } else notify('Aviso: faltou ao trabalho'); }

Sources: https://sims.fandom.com/wiki/Job_performance, https://www.thegamer.com/sims-1-all-job-paths-careers-salaries/, https://modthesims.info/d/636811/job-mods.html, https://sims.fandom.com/wiki/Career


### Motive changes during work

TS1 applies motive changes for the time away. Sims typically come home hungry, tired and dirty. Exact per-career values are not documented.

**Numbers:** ESTIMATE per hour at work: Hunger −5, Energy −5, Hygiene −4, Fun −4, Comfort −2, Social +1 (coworkers). Bladder is set to max(Bladder, +20) on return (used the toilet at work). Per-career flavor multipliers (ESTIMATE): Military/Police Energy and Hygiene ×1.5; Business/Politics Fun ×1.3; Science Comfort ×0.8.

**Implementation:** resolveWorkday applies hours × perHourDeltas × careerMultipliers, clamped to −100..100, at the moment the Sim reappears.

Sources: https://sims.fandom.com/wiki/Motive, https://strategywiki.org/wiki/The_Sims/Needs


### Chance cards / work events (concept)

In TS1 base, some jobs only had non-interactive work-related dialog boxes when the Sim got home, with no choices. Some expansion-era level-10 events move the Sim to a different track. The Sims 2 introduced two-option chance cards: a text situation, choose A, B or Ignore. Outcomes include cash bonus or fine, gaining or losing skill points, promotion, demotion or firing. Concept for our game: one optional card per workday, the outcome depending on a hidden roll weighted by the Sim's skill relevant to the chosen option.

**Numbers:** Reported for TS2: ~18% chance per workday, ~14% at top level (reference only). ESTIMATE for our game: p = 0.10 per workday. Option outcomes: good ±(0.5-3) × daily pay, ±1 skill pip, perf ±30. Rare outcomes (≤5%): instant promotion, demotion or firing. Success chance of an option = 0.4 + 0.06 × (relevant skill).

**Implementation:** cards.json with {trackId, minLevel, textPt, options:[{labelPt, skill, good:{...}, bad:{...}}]}. Show it as a modal when the Sim returns home. 'Ignorar' gives no effect.

Sources: https://sims.fandom.com/wiki/Chance_card, https://www.thesimswiki.com/wiki/Chance_card, https://sims.fandom.com/wiki/Career


### Relationship scores: Daily vs Lifetime

Each directed pair (A→B) has its own values, so A's opinion of B can differ from B's opinion of A. The TS1 base game had a single bar from −100 to +100. The Hot Date expansion replaced it with a Daily bar (moves quickly, like the old bar) and a Lifetime bar (moves slowly, tracks the long run). The Sims 2 kept this pair as short-term and long-term relationship. Sims living together see their Lifetime rise while Daily drops.

**Numbers:** Both values are integers clamped to −100..+100 (DOCUMENTED). ESTIMATE update rule: interactions change Daily by Δ and Lifetime by round(Δ/4). Nightly at 16:00, Lifetime moves toward Daily by up to 3 points (TS2-style). Housemates: every day at 16:00, Daily −2 and Lifetime +1 (DOCUMENTED, Hot Date, exact period 'every so often'). The Sims Online reference: Daily decays into Lifetime over time.

**Implementation:** rel = Map<'a|b', {daily:0, lifetime:0, lastInteractionDay:-1, flags:{crush, love}}>. The UI shows two bars per known Sim: top 'Hoje' (Daily), bottom 'Para sempre' (Lifetime).

Sources: https://sims.fandom.com/wiki/Relationship, https://en.wikipedia.org/wiki/The_Sims:_Hot_Date, https://modthesims.info/d/showthread.php?t=683068, https://www.tsomania.net/gameguides/relationship_system.php


### Friend, crush, love thresholds and family-friend count

Friend: two Sims are friends if each has Daily >= 50 toward the other (Hot Date era; the base game used the single score >= 50). Crush: an adult with Daily >= 70 toward another Sim who does a successful romantic interaction. Love: the same with Lifetime >= 70. 'Best friend' was not a formal status in TS1. The family-friend count used by careers counts friends of any household member.

**Numbers:** FRIEND: daily(A→B) >= 50 AND daily(B→A) >= 50. CRUSH: daily >= 70 + successful romantic action. LOVE: lifetime >= 70 + successful romantic action (all DOCUMENTED). ESTIMATE additions: ENEMY label when daily <= −50 in either direction (TS1 has no formal enemy; TSO used lifetime ±60). Proposal to marry: requires love both ways and lifetime >= 80.

**Implementation:** isFriend(a,b) is used by familyFriends() for careers. A friend count that drops below a level's requirement does NOT demote, it only blocks the next promotion (TS1 behavior, RECALLED).

Sources: https://sims.fandom.com/wiki/Friendship, https://sims.fandom.com/wiki/Relationship, https://modthesims.info/d/showthread.php?t=683068, https://sims.fandom.com/wiki/Career


### Relationship decay

Non-resident Sims lose 2 Daily relationship points per day at 4 pm. Players observe roughly 2 points per day, sometimes more. A friendship sitting at exactly 50 is lost after a single day without contact. A successful phone call restores more than one day's decay. Housemates: Daily −2, Lifetime +1 periodically.

**Numbers:** Non-resident: daily −2 per day at 16:00 (DOCUMENTED). ESTIMATE: skip decay for a pair if they interacted successfully that game-day. Decay moves toward 0, so negative scores also recover 2 per day. Lifetime has no decay of its own; it only drifts toward Daily (±3 per day max).

**Implementation:** Daily job at 16:00: for each rel pair: if (lastInteractionDay !== today) daily = towardZero(daily, 2); lifetime += clamp(daily − lifetime, −3, 3); if sameHousehold: daily −= 2, lifetime += 1. Then recompute friend flags and notify on a friendship lost ('Você perdeu a amizade de X').

Sources: https://sims.fandom.com/wiki/Relationship, https://screenrant.com/sims-1-how-to-make-keep-friends/, https://www.thegamer.com/sims-1-make-friends-meet-sims-interests/, https://modthesims.info/t/593848


### Social interactions list and deltas

TS1 menus show interactions depending on the current relationship. Documented fragments: Tickle and Compliment become sensible around relationship 25. Compliment disappears from the menu at relationship 40 (TS1 quirk). Nice 6+ Sims like hugs, Nice 3 or less really don't. Playful 6+ like jokes. Insult is always available to Sims with Nice 3 or less. When insulted, Nice >= 5 walks away and cries, Nice <= 4 insults back. When slapped, Nice >= 6 just stands angry, Nice <= 5 slaps back. Kisses need much higher mood and relationship; a passionate kiss needs very high both. Repeating the same interaction annoys. In Hot Date, talk only helps if the topic matches the target's interests. Success raises Social for both Sims; rejection lowers the initiator's Social and both relationships.

**Numbers:** ESTIMATE table, each entry giving: available when Daily is in range; acceptance threshold T; on success, ΔDaily to both and Social +initiator/+target; on failure, ΔDaily initiator view/target view and Social for the initiator.
• Conversar (Talk): always; T −30; success +3 (+0 if the topic is off-interest), Social +10/+8; failure −2/−1, Social −5.
• Piada (Joke): Daily > −20; T 0; success +4 (×1.5 if target Playful >= 6), Social +12/+10, Fun +5; failure −4/−2, Social −8.
• Elogiar (Compliment): Daily −10..39; T 10; success +5, Social +10/+12; failure −3/−1.
• Cócegas (Tickle): Daily >= 25; T 25; success +5, Fun +10 both; failure −6/−3.
• Massagem (Back rub): Daily >= 30; T 35; success +6, Comfort +10 target; failure −7/−4.
• Abraço (Hug): Daily >= 40; T 45; success +8, Social +15/+15; failure −8/−5, Social −12.
• Beijo (Kiss): Daily >= 60 and target mood >= 30; T 65; success +10, can set crush or love; failure −12/−6, Social −15.
• Insultar (Insult): always if initiator Nice <= 3, otherwise Daily < 30; always lands; target Daily −10, Mood −10; initiator view −3; retaliation by the Nice rule.
• Tapa (Slap): Daily < 0 (or initiator Nice <= 3 and Daily < 20); target −15, Mood −15, initiator view −5; retaliation by the Nice rule.
• Brigar (Fight): Daily <= −30; loser −10 toward winner, Mood −15; outcome by Body.

**Implementation:** interactions.json entries {id, labelPt, availableIf(rel, a, b), threshold, personalityBias, onAccept, onReject, anim, durationMin(≈5-15)}. Run both Sims' animations in sync. Show green or red plumbob-like icons over heads (use an original icon) to signal accept or reject.

Sources: https://modthesims.info/d/showthread.php?t=683068, https://modthesims.info/t/544701, https://screenrant.com/sims-1-how-to-make-keep-friends/, http://corylea.com/HowToMakeFriendsInTheSims1.html, https://sims.fandom.com/wiki/Social


### Acceptance rule (relationship + mood + personality)

TS1 acceptance depends on the target's Daily relationship toward the initiator, the target's current mood, personality (Playful and Nice mainly; Outgoing speeds relationship building), repetition, and in Hot Date the conversation topic. A bad mood can make interactions fail even with a decent relationship. This formula reproduces those documented tendencies; the weights are ESTIMATE.

**Numbers:** ESTIMATE: score = 0.6 × daily(target→init) + 0.4 × targetMood + bias − 12 × repeatsInLastHour + rand(−15, +15). bias: Joke/Tickle +6 × (Playful − 5); Compliment/Hug/Back rub +6 × (Nice − 5); Hug/Kiss/Back rub/Dance +4 × (Outgoing − 5), so shy Sims resist physical contact; Talk +10 if the topic matches an interest, −10 if the target dislikes it. Accept if score >= T (per-interaction threshold from the interactions table). Outgoing >= 7 initiator: success ΔDaily ×1.25.

**Implementation:** Pure function accept(interaction, init, target, rel) → boolean, plus a debug overlay showing the score breakdown during balancing.

Sources: https://modthesims.info/d/showthread.php?t=683068, https://screenrant.com/sims-1-how-to-make-keep-friends/, http://corylea.com/HowToMakeFriendsInTheSims1.html


### Phone (calling, inviting, services)

After meeting a Sim (talking to a walk-by), the household gets their number. Phone options: Chat, which keeps friendships alive because a successful call restores more than daily decay; Invite Over; and services. Calls fail and upset the target if they are busy or sleeping; a Sim at work can't answer. Incoming calls can wake sleeping household members.

**Numbers:** ESTIMATE: Chat lasts 30 min; on success Daily +4 both and Social +10 caller. If the target is asleep (22:00-07:00) the call fails: Daily −8 (target→caller). If the target is at work, nobody answers (no change). Invite Over succeeds if daily(target→caller) >= 0 and it is 08:00-22:00; the guest arrives 60-120 game-min later. Order pizza ESTIMATE §40, arrives in 60-90 min.

**Implementation:** Phone menu built from sim.household.knownNumbers. Each target needs a schedule (sleep window, job hours) so success can be checked.

Sources: https://www.thegamer.com/sims-1-make-friends-meet-sims-interests/, https://screenrant.com/sims-1-how-to-make-keep-friends/, https://www.thegamer.com/sims-1-all-needs-motives-keep-happy/


### Visitors, walk-bys and welcome wagon

Neighbors walk past the lot. The player can stop them and talk, and they then give their phone number. Invited guests come over. In TS1, two random Sims from other households form the welcome wagon for a new household, and visitors leave if not greeted in time. Guests leave when told (Say Goodbye / Ask to Leave), when their motives run low, or late at night. Sleepovers need an explicit 'stay over' request.

**Numbers:** ESTIMATE: 1-3 walk-bys per day between 09:00 and 18:00. A walk-by stays near the curb 20 game-min unless greeted. Welcome wagon on move-in day at 10:00 with 2 Sims (DOCUMENTED count); they leave if not greeted within 60 game-min. Guests auto-leave when any motive is below −50 or at 01:00. Maximum 8 Sims on the lot (household + guests) for performance.

**Implementation:** NPC neighbors are full Sims simulated cheaply off-lot: motives and schedule are updated hourly, not per tick. A 'Cumprimentar' interaction on a walk-by converts them to a guest and adds their number.

Sources: https://sims.fandom.com/wiki/Welcome_wagon, https://www.thegamer.com/sims-1-all-needs-motives-keep-happy/, https://modthesims.info/showthread.php?t=663416, https://thisfatfunnylife.wordpress.com/communitylotmods/


### Starting funds and lot/house purchase

Every new TS1 household starts with §20,000 regardless of size. The money buys an empty lot or a pre-built house on the neighborhood screen, and the rest goes to building and furnishing. TS1 Neighborhood 1 examples: empty lots §3,500-§10,500; a medium two-storey house at 3 Sim Lane §24,793; the base game's largest mansion at 2 Sim Lane §50,777. Net worth = cash + lot value, where lot value = land + build + depreciated objects. RECALLED: moving a family out credits the house value back to their funds.

**Numbers:** Start §20,000 (DOCUMENTED). Lots (DOCUMENTED, Neighborhood 1): 1 Sim Lane §10,500, 8 Sim Lane §7,000, 4 Sim Lane §5,500, 9 Sim Lane §3,500 (the source list may be from a different version of the neighborhood). Prebuilt §24,793 and §50,777. ESTIMATE land formula for our game: §3,000 + §6 per tile (20×20 = §5,400; 30×30 = §8,400; 40×40 = §12,600). Maximum household size 8 (RECALLED).

**Implementation:** Neighborhood screen lists lots with price = land + buildValue + Σ object value. Buying deducts from funds. Selling or moving out adds the same value back (minus nothing in TS1; optionally 10% fee).

Sources: https://sims.fandom.com/wiki/Simoleon, https://www.quora.com/In-the-computer-game-The-Sims-how-many-Simoleons-does-each-family-start-the-game-with, https://sims.fandom.com/wiki/List_of_empty_Neighborhood_1_lots, https://www.teoalida.com/thesims/the-sims-1-neighborhoods/


### Object depreciation and selling back

TS1 objects depreciate at the midnight after purchase, by a first-day percentage that depends on the object type, then slowly every day until they reach an object-specific minimum. A sale before that first midnight therefore returns the full price. That full refund is implied by the wiki's timing but contradicted by a forum post; treat it as a design choice.

**Numbers:** First midnight: electronics −25%, plumbing and appliances −20%, furniture −15% (DOCUMENTED). After that about §1 per §100 of original price per day, i.e. 1% per day (DOCUMENTED). Floor ESTIMATE 40% of catalog price (a modding example value, not a confirmed default). Same-day sell = 100% refund (design choice).

**Implementation:** obj = {catalogPrice, value, purchasedDay, category}. At 00:00 each day: if day === purchasedDay + 1, value *= (1 − firstDrop[category]); otherwise value = max(value − 0.01 × catalogPrice, 0.4 × catalogPrice). Sell price = value.

Sources: https://sims.fandom.com/wiki/Depreciation, https://modthesims.info/t/76877


### Bills

Bills arrive in the mailbox every 3 days. A Sim must collect them and pay them; only adults can pay. TS1 formula (community-documented): Bill = (sum of billable objects × 3%) × (1 − 10% × number of children in the household). Billable objects = the depreciated value of nearly all objects on the lot when the bill arrives, with some buy/build-mode exceptions. Note: the formula uses object value, not total cash or land.

**Numbers:** Interval 3 days (DOCUMENTED). Amount = round(0.03 × Σ obj.value(billable) × max(0, 1 − 0.10 × kids)) (DOCUMENTED). Example: §12,000 of furniture with 2 kids gives 0.03 × 12000 × 0.8 = §288. ESTIMATE exclusions: walls, floors, doors, windows, stairs, terrain and plants are not billable. ESTIMATE delivery time 10:00 by the mail carrier NPC.

**Implementation:** Every 3rd day at 10:00, create a bill {amount, issuedDay, state:'new'} in the mailbox. The 'Pagar contas' action is available at the mailbox, or on bills carried inside, for Sims with age === 'adult' and funds >= amount.

Sources: https://sims.fandom.com/wiki/Bill, https://www.thesimswiki.com/wiki/Bill?section=2, https://modthesims.info/showthread.php?t=513140


### Repo-man (unpaid bills)

Unpaid bills change color as they age. After red bills stay unpaid for more than 2 days, a warning appears at 7:00 AM. The red bills 'explode' at 6:00 PM the next day, and the repo-man arrives and takes household items worth roughly the amount owed. He comes only for unpaid bills. Players could dodge him by deleting the mail carrier before delivery; our game should not allow that exploit.

**Numbers:** Bill states (ESTIMATE timing): new on days 0-2, yellow on day 3, red from day 4 (DOCUMENTED that red exists). Red for more than 2 days: warning at 07:00 (DOCUMENTED); repo-man at 18:00 the following day (DOCUMENTED). Seizure: objects removed in descending order of value until the removed total is at least the amount owed (DOCUMENTED that it is 'roughly equal'; exact algorithm ESTIMATE). Excess is not refunded and the bill is cleared.

**Implementation:** Daily check at 07:00: for each bill, if state === 'red' && daysRed > 2 then post a warning and schedule repoAt = tomorrow 18:00. The repo NPC walks to each chosen object and plays a 'carry away' animation, then the bills are deleted.

Sources: https://sims.fandom.com/wiki/Bud_the_Repo-man, https://www.thesimswiki.com/wiki/Bud_the_Repo-man, https://sims.fandom.com/wiki/Repo-man, https://sims.fandom.com/wiki/Bill


### Food cost when cooking

TS1 charges each time food is taken from the fridge, not when groceries are bought. The fridge is always full unless the household cannot afford the food. Base-game meals: steak and beans, salad, or a can of beans, depending on available appliances.

**Numbers:** Snack §5, single meal §10, group meal §20 (DOCUMENTED; the group meal serves several Sims, cited as 6). If funds < cost, the action is unavailable. Pizza delivery ESTIMATE §40 (6 slices). ESTIMATE better fridges add a Hunger bonus (+5/+10) rather than cutting cost.

**Implementation:** Fridge actions: 'Lanche' (−§5, Hunger +15, 5 min), 'Preparar refeição' (−§10, leads into cooking), 'Refeição em grupo' (−§20, spawns a 6-serving platter). Deduct on start and refund if interrupted before cooking begins.

Sources: https://sims.fandom.com/wiki/Food, https://sims.fandom.com/wiki/Refrigerator, https://modthesims.info/t/347537


### Other money flows (services, income balance)

Income comes from daily salary (paid on return) and selling objects or paintings. Costs are bills, food, services and purchases. Services exist in TS1 (maid, gardener, repairman) but their rates were not found in this research. Balance check: an L1 worker earning §120 to §250 a day can cover food (about §30 per Sim per day) and bills (§50-150 per day for a modest home), leaving slow savings. This matches the TS1 feel of early poverty.

**Numbers:** ESTIMATE services: maid §10/h (auto-cleans daily at 09:00, 2 h); gardener §5/h; repairman §50/h; exterminator flat §75. ESTIMATE painting sale §(10 + 25 × Creativity). Salary values come from the career tables.

**Implementation:** Keep a ledger array [{day, type, amount, labelPt}] so a 'Finanças' panel can show income and expenses per day. This makes balancing against the bills formula easy.

Sources: https://www.teoalida.com/thesims/strategy/, https://sims.fandom.com/wiki/Simoleon


## UX-TECH

Research note on method. Two problems limited the web research. First, WebFetch failed on every domain, either with DNS errors or 403s from the egress proxy, so wikis, the EA help pages, Medium and the manual PDF could not be opened directly. Second, the run used up its shared WebSearch budget partway through. To make up for this, I read the source code of the open-source TS1 reimplementations FreeSO (github.com/riperiperi/FreeSO, commit 4c6b3e8) and Simitone (github.com/riperiperi/Simitone, commit 4906db3). Both load and run the original game data, so their constants are the best public evidence of TS1 behaviour, and where a value is really a FreeSO design choice I say so. Anything not documented is marked ESTIMATE.

Key findings, Part A (UX):
- **Clock and speeds.** The sim runs at 30 ticks per real second, with 30 ticks per sim-minute. So at normal speed 1 sim-minute is 1 real second and a sim-day takes 24 real minutes. The speeds are pause/1x/3x/10x, on the keys P (or ~), 1, 2 and 3. A blocking dialog freezes the sim until the player answers it.
- **Camera.** The view is 2:1 dimetric with exactly 3 zoom levels (a tile is 32x16, 64x32 or 128x64 px) and 4 rotations in 90° steps. Shortcuts: PageUp/PageDown change floor, Home/End step through the wall modes, +/- zoom, and comma/period rotate.
- **Wall modes.** There are 4: Walls Down, Cutaway, Walls Up and Roof. The cutaway cuts the last 3 rooms the cursor has hovered, plus a 5x5-tile rectangle around the cursor that is shifted 2 tiles toward the camera.
- **Pie menu.** The selected Sim's head sits in the centre and turns toward the cursor. Items are placed in 2, 4 or 8 directions on a 60 px radius, depending on how many there are; extra items stack above and below. Slash-separated names become submenus shown with a trailing "...", and inside a submenu its own name in the centre works as a Back button.
- **Speech and thought balloons.** These are a "headline" system with icon groups (Balloon, Conversation, Motive, Relationship, Route-failure, Progress, Money, and Algorithmic, which shows a target object's icon). A Crossed flag puts a red cross over the icon. Durations are counted in ticks.
- **Panels.** The needs panel shows 8 motives in this order: Hunger, Comfort, Hygiene, Bladder, Energy, Fun, Social, Room. Other panels: Personality (5 traits, each 0-10 from a pool of 25 points), Job (performance bar, salary, 6 skills) and Relationships.
- **Buy catalog.** 8 function categories with 4 subcategories each, plus Other and All. Items are sorted by price.
- **Build tools.** Wall, Wallpaper, Floor, Roof; Trees, Terrain, Water; Door, Window, Stairs, Fireplace. Shift-drag draws a rectangular room and Ctrl-drag deletes walls. Walls follow tile edges in 8 directions, so diagonal walls are allowed. Prices come from the game data files, not the code; FreeSO refunds 7 per deleted wall segment and 80% of a pattern's cost when it is painted over.
- **Families.** Up to 8 members and a fixed §20,000 starting budget, from which the lot price is deducted.

Part B gives a concrete Three.js r128 (UMD) architecture:
- **Simulation core.** Pure deterministic JavaScript with no THREE or DOM code, a fixed 30 Hz timestep and an accumulator, and render interpolation between ticks.
- **World data.** Walls are stored in edge arrays (one for horizontal edges, one for vertical edges, plus a diagonal-per-tile array).
- **Pathfinding.** Octile A* on a binary heap. Walls block edges, and a diagonal step is only allowed when both orthogonal sides of the corner are free.
- **Routing slots.** Modelled on TS1's SLOT resource: an offset, a facing rule, minimum/maximum/optimal distance, 8-direction flags, and score bonuses.
- **Picking.** Analytic ray-plane intersection for floor tiles and wall corners, and Raycaster hits on proxy meshes for Sims and objects.
- **Walls and cutaway.** Walls are instanced boxes; cutaway works by scaling wall instances down. FreeSO's room-cut algorithm is described in detail.
- **Lighting.** A time-of-day colour table drives a hemisphere light plus a sun.
- **Performance.** Instancing and dirty-flag rebuilds of the merged floor geometry.
- **Characters.** Procedural low-poly Sims with a walk cycle whose phase follows the distance walked. Measured walk speed is 1.5 tiles/s at 1x, and Sims run at 3x that when the path is longer than 10 tiles.
- **Saves.** Versioned JSON with typed arrays encoded as base64, gzipped and stored in IndexedDB.

Branding warning: replace Simoleon/§, the plumbob, zodiac names (optional) and all other EA names with original equivalents.


### A1. Game modes (Live / Buy / Build / Options)

Live mode is the only mode in which the simulation runs and time passes. Buy and Build freeze the simulation: the clock stops, but Sims keep their queues. Lot changes cannot be made in Live mode. In TS1 the mode icons sit in an arc on the left of the bottom Control Panel, with the active one highlighted. Scrolling the camera still works in Buy and Build. Coming back to Live restores the previous speed. Portuguese labels: Viver / Comprar / Construir / Opções.

**Numbers:** 4 modes. Hotkeys: according to the EA Legacy Collection controls page (via a search summary), F2 = Build and F3 = Buy. Proposed for us: F1 Viver, F2 Comprar, F3 Construir, F4 Opções (ESTIMATE). Entering Buy or Build sets simSpeed = 0 and stores lastSpeed.

**Implementation:** Use a UI state machine: ui.mode in {'live','buy','build','options'}. Each mode owns one active input Tool object (LiveTool, PlaceObjectTool, WallTool, FloorTool, TerrainTool...) with onPointerDown/Move/Up/Key handlers. On enter('buy'|'build'): lastSpeed = sim.speed; sim.speed = 0; show the catalog panel. On exit: sim.speed = lastSpeed. Reject entering Build while a blocking dialog is open.

Sources: https://sims.fandom.com/wiki/Live_mode, https://oldgamesdownload.com/wp-content/uploads/The_Sims_Deluxe_Edition_Manual_EN.pdf, https://help.ea.com/en/articles/the-sims/the-sims-legacy-collection/the-sims-legacy-controls/


### A2. Simulation clock and tick rate

The TS1 simulation advances in ticks. FreeSO sets Clock.TicksPerMinute = 30 for TS1, with the comment '1 minute per irl second' (The Sims Online uses 150, i.e. 5 s per minute). The VM is stepped 30 times per real second at 1x. Each tick increments MinuteFractions; when it reaches 30 the minutes counter advances, at 60 minutes the hour advances, and at 24 hours the day. The fan wiki agrees that 1 sim-minute is about 1 real second.

**Numbers:** TICKS_PER_REAL_SECOND = 30 (FreeSO TickInterval = 33 ms). TICKS_PER_SIM_MINUTE = 30. Sim-hour = 1,800 ticks; sim-day = 43,200 ticks. At 1x a sim-day lasts 24 real minutes.

**Implementation:** Keep clock = {tick, minuteFrac, minute, hour, day} inside the serializable sim state. Derive a fractional time for lighting: timeOfDay = (hour*60 + minute + minuteFrac/30)/1440. Fire scheduled events (carpool, bills, school bus) from a min-heap keyed by absolute tick.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VM.cs, https://sims.fandom.com/wiki/Live_mode


### A3. Time speeds (pause, 1x, 2x, 3x)

There are three running speeds plus pause. In Simitone's TS1 client, speed button 1 = 1x, 2 = 3x, 3 = 10x and pause = 0x, and each transition plays its own UI sound (P→1, 1→2, and so on). Keys: 1, 2 and 3 select speeds; P (or ~ in the Legacy edition) pauses. According to the Sims wiki, the game switches to the fastest speed by itself when there are no controllable Sims on the lot or all Sims are asleep. TS1 blocking dialogs force a special paused state (FreeSO uses SpeedMultiplier = -2) until the player answers, then restore the previous speed.

**Numbers:** Multipliers: 0, 1, 3, 10. Real time per sim-day: 1x = 24 min, 2nd speed = 8 min, 3rd speed = 2.4 min. Sim ticks per real second: 30 / 90 / 300. Auto-ultra while everyone is asleep (rule reported by the fan wiki).

**Implementation:** speedMul = [0,1,3,10][speedIndex]. The accumulator loop (see B3) multiplies dt by 30*speedMul. Add an autoUltra flag: each sim-minute, if allSimsAsleep or noSelectableSims then effectiveSpeed = 10, else the user's choice. The pause state used by dialogs is separate from the user's pause, so closing a dialog restores the user's speed.

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Screens/TS1GameScreen.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMDialogPrivateStrings.cs, https://help.ea.com/en/articles/the-sims/the-sims-legacy-collection/the-sims-legacy-controls/, https://sims.fandom.com/wiki/Live_mode


### A4. Clock display and day cycle

The TS1 control panel shows the time of day as a classic analog clock. Prerelease builds also show the panel becoming a horizontal bottom bar and the date display gaining a year. Days roll over at midnight, and day and night are visible through outdoor lighting. Our version: an analog clock face plus a digital HH:MM, a day-of-week label and a 'Dia N' counter, next to the speed buttons and the household funds.

**Numbers:** Proposed start: Day 1, 08:00 (ESTIMATE). Night lighting from 20:00 to 06:00 with dawn and dusk transitions of about 1.5 h each (ESTIMATE; see B9 for the colour table). The clock hand updates every sim-minute.

**Implementation:** Draw the clock as an SVG with two rotating hands (hour hand angle = (h%12 + m/60)*30°, minute hand = m*6°). Update the DOM only when the minute changes so it is not touched every frame. Use pt-BR weekday names (Seg, Ter, Qua, Qui, Sex, Sáb, Dom).

Sources: https://tcrf.net/Prerelease:The_Sims_(Windows)/1999, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs


### A5. Camera: 4 rotations, 3 zoom levels, scrolling, floors

TS1 uses a fixed-angle dimetric 2:1 view that can rotate in 4 steps of 90° (FreeSO WorldRotation: TopLeft, TopRight, BottomRight, BottomLeft) and has exactly 3 zoom levels (Far, Medium, Near). Controls: arrow keys or pushing the cursor to the screen edge scroll the view (FreeSO and Simitone also allow right-mouse-drag scrolling); the mouse wheel or +/- zoom; comma/period (< >) rotate; PageUp/PageDown change the visible floor. Simitone's 2D mode limits zoom to levels 1 to 3.

**Numbers:** Tile size on screen per zoom: Far 32x16 px, Medium 64x32 px, Near 128x64 px. In 3D the equivalent is an orthographic camera pitched 30° down (2:1 dimetric gives sin(pitch) = 0.5) with yaw 45° + k*90°. Pixels per world unit (1 tile = 1 unit): Far 22.6, Medium 45.3, Near 90.5. Floors: TS1 base game has 2 storeys (64x64 arrays per level); Simitone allows up to 5. Edge-scroll margin 12 px; scroll speed about 15 tiles/s at Medium, scaled by 1/zoom (ESTIMATE). Rotation and zoom tween about 250 ms (ESTIMATE).

**Implementation:** Use THREE.OrthographicCamera. Set top = canvasH/(2*ppu), bottom = -top, right = canvasW/(2*ppu), left = -right. Place the camera at target + R*(cos(pitch)*sin(yaw), sin(pitch), cos(pitch)*cos(yaw)) with R = 60, then call lookAt(target). Snap yaw to the 4 values and animate between them. Offer 3 discrete zooms and optionally a continuous zoom clamped to [Far, Near]. Clamp the target to the lot bounds. The visible floor sets which levels render: levels above it are hidden and the current level's walls follow the wall mode.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.world/WorldState.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.world/Model/WorldRotation.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/Desktop/UIDesktopUCP.cs, https://help.ea.com/en/articles/the-sims/the-sims-legacy-collection/the-sims-legacy-controls/, https://en.wikipedia.org/wiki/Isometric_video_game_graphics


### A6. Wall view modes (Walls Down / Cutaway / Walls Up / Roof)

There are four view modes, numbered as in FreeSO's WallsMode: 0 Walls Down (every wall drawn as a short stub), 1 Cutaway (the default; walls on the camera side of the rooms of interest are cut down), 2 Walls Up (every wall at full height), 3 Roof (full walls plus the roof). Home steps the mode up and End steps it down (Simitone). The manual says clicking the Roof icon shows the roof and selecting Walls Up, Cutaway or Walls Down hides it again. Cutaway in FreeSO keeps a list of the last 3 indoor rooms the mouse has hovered (hovering outdoors does not stick) and also cuts a 5x5-tile rectangle around the cursor, shifted 2 tiles toward the camera.

**Numbers:** Mode IDs 0-3, default 1. Cut-room memory: 3 rooms. Cursor rectangle: 5x5 tiles centred on the cursor, offset by CutCheckDir[rotation]*2, with CutCheckDir = [(-1,-1), (-1,1), (1,1), (1,-1)] per rotation. Room-cut scan: from each wall tile, step up to 5 tiles toward the camera (4 for the two side rays). Stub height when cut: about 0.12 of a storey (ESTIMATE).

**Implementation:** See B8 for rendering. Per frame in Cutaway: find the tile and room under the cursor; if indoors, push the room into an LRU list of length 3; rebuild the cut mask only when the rooms, rotation or floor change, or when the cursor rectangle touches a wall tile. Draw 4 small toggle buttons plus the Home/End keys.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/UILotControl.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMArchitectureTools.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/UICutawayPanel.cs, https://oldgamesdownload.com/wp-content/uploads/The_Sims_Deluxe_Edition_Manual_EN.pdf


### A7. Pie menu for interactions

In Live mode, clicking a Sim or an object opens a circular pie menu at the click point. Don Hopkins designed the TS1 pie menus, and his research found pie menus about 15% faster than linear menus. The centre shows the selected Sim's head, rendered live and turning to look toward the mouse cursor. The items are the interactions the target advertises and that are currently available to this Sim; if there are none, no menu appears. Interaction names containing '/' build a tree: 'Talk/Joke' becomes a category 'Talk...' with child 'Joke'. Opening a category redraws the ring with its children, and the category's own name sits in the centre as a Back button. Layout follows FreeSO: up to 2 items use 2 directions (top and bottom), up to 4 use the 4 compass directions, and up to 8 use 8 directions 45° apart starting at the top and going clockwise. Items 9 and up stack vertically, alternating above and below the ring. Top and bottom labels are centred; right-side labels are left-aligned at the anchor; left-side labels are right-aligned. Highlighted items (FreeSO ColorMod) use yellow text. Clicking an item queues the action; Esc or clicking outside cancels.

**Numbers:** Ring radius 60 px (scaled by UI scale). Directions: 2, 4 or 8. Background disc grows from 0 to 200 px diameter over 30 frames at 60 fps (0.5 s). Label colours in FreeSO: normal #A5C3D6, hover #00FFFF, highlighted yellow. Head turn: camera lerp 0.125 per frame toward the cursor.

**Implementation:** Build it as a DOM overlay (div.pie) positioned at the pointer. Compute the item positions with dir = i/n*2π; x = sin(dir)*R, y = -cos(dir)*R, then apply the left/right/top/bottom anchoring. Put a 64x64 canvas portrait of the Sim in the centre (render the head once per frame into a small second render target, or draw a 2D face whose pupils follow atan2 to the cursor). Support press-drag-release selection (pointerup over an item) as well as click-click. Build the tree by splitting names on '/'. Mark categories with '...' (Portuguese: 'Conversar...').

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/UIPieMenu.cs, https://en.wikipedia.org/wiki/Pie_menu, https://en.wikipedia.org/wiki/Don_Hopkins, https://blog.dshr.org/2018/05/pie-menus.html, https://archive.retro.co.za/CDROMs/DrDobbs/CD%20Release%2012/articles/1991/9112/9112a/9112a.htm, https://sims.fandom.com/wiki/Live_mode


### A8. Action queue

Each Sim has an action queue shown as a row of icons at the top-left of the screen: the active action first, then the pending ones. Player-chosen actions have priority UserDriven = 50; autonomous (free will) actions have 2; idle has 0; the maximum is 100. Clicking a queued icon cancels it. If it is already running, the icon greys out or gets crossed and the Sim finishes gracefully (the action's 'notify idle' flag lets the current behaviour exit cleanly) instead of stopping instantly. Player actions are inserted ahead of autonomous ones.

**Numbers:** FreeSO caps user actions at MAX_USER_ACTIONS = 20 (a FreeSO choice). Show at most 8 icons in the UI (ESTIMATE). Priorities: Maximum 100, UserDriven 50, ParentIdle 40, ParentExit 30, Autonomous 2, Idle 0.

**Implementation:** queue: [{iid, targetId, priority, autonomous, phase, phaseTick, params, cancelRequested}]. Insert by priority, keeping FIFO order within the same priority. Cancelling a pending action removes it. Cancelling the active action sets cancelRequested, and the action's state machine jumps to its 'exit' phase (stand up, put the plate down...). Show icons as 40 px squares with the object icon and a red X overlay when cancelled.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMQueuedAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/UIInteractionQueue.cs


### A9. Thought bubbles, speech balloons and floating money ('headlines')

TS1 shows icons above heads through the Set Balloon/Headline primitive. Each headline has a Group, an Index (the icon), a balloon Type (the background shape, e.g. thought cloud or speech), a Duration, and flags: Crossed (draws a red X or strike over the icon, meaning refused, can't, or dislike), Inactive, Backwards, DurationInLoops and Indexed. Groups: OldStyle, Balloon, Conversation (topic icons during talk), Motive (need icons such as a toilet for Bladder), Relationship (hearts and the like), Headline, Debug, Algorithmic (shows the icon of a specific object, e.g. the bed the Sim wants or can't reach), RouteFailure, Progress (skill progress bar, near zoom only, 'Skill: x.xx / Speed: y%'), Magic, and Money (floating +/- amount). An entity shows one headline at a time; a new one replaces the old. Algorithmic icons are hidden at Far zoom. The cheat 'showHeadlines' hides or shows every bubble and balloon.

**Numbers:** Duration is in ticks; with DurationInLoops it is multiplied by 15 ticks per loop. Proposed defaults (ESTIMATE): motive or need thought 120 ticks (4 s at 1x); conversation balloon 60-90 ticks per exchange; route-failure bubble 150 ticks; money headline rises about 0.8 tile over 60 ticks while fading out. Balloon size: 48 px at Medium, scaled 0.5x at Far and 2x at Near.

**Implementation:** Keep a pool of DOM divs (or THREE.Sprite with a CanvasTexture). Each frame, project the head position (head bone world position + 0.5 up) with vector.project(camera) to screen coordinates. Use CSS classes .thought (cloud with 3 small trailing circles), .speech (rounded box with tail), and .neg/.pos (red or green tint for disliked or liked conversation topics; ESTIMATE). Draw icons as an original SVG sprite sheet. The sim core emits {type:'headline', entityId, group, icon, crossed, ticks}; the UI renders it and counts it down in sim ticks.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMSetBalloonHeadline.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMRuntimeHeadline.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/WorldUI/UIHeadlineRenderer.cs, https://simscommunity.info/2025/01/31/essential-sims-1-and-sims-2-cheats/, https://tcrf.net/The_Sims_(Windows)/Unused_Graphics


### A10. Notifications and dialogs

TS1 messages come from object or Sim scripts as dialog boxes. Types: Message (OK), YesNo, YesNoCancel and TextEntry (e.g. naming a baby). A blocking dialog freezes the whole simulation, using a special speed separate from the user's pause, until the player answers; then the previous speed comes back. Only one blocking dialog can show at a time, and others wait (FreeSO retries them on the next tick). A dialog flagged 'Continue' is non-blocking: it shows without stopping the script or the clock. Typical events: carpool or job notices, promotions and firings, bills, visitors, fires, burglars, deaths, and relationship proposals.

**Numbers:** One active blocking dialog at a time; the others queue in FIFO order. Non-blocking toasts auto-hide after 8 real seconds (ESTIMATE). Dialog parts: icon or portrait of the caller, title, text with Sim-name substitution, 1-3 buttons.

**Implementation:** Sim core: an action calls ctx.dialog({kind:'yesno', textKey, args, blocking:true}). This sets sim.blockedBy = dialogId and moves the thread into a 'waitDialog' phase. The UI shows a modal and, on answer, calls sim.respondDialog(id, choice), which resumes the thread with branch true or false. When blocking: savedSpeed = speed; speed = 'dialogPause'. Non-blocking dialogs go to a toast stack at the top right.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMDialogPrivateStrings.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Screens/TS1GameScreen.cs


### A11. Need (motive) bars panel and mood

The Live-mode 'Mood' panel shows 8 need bars, in Simitone's order: Hunger, Comfort, Hygiene, Bladder, Energy, Fun, Social, Room (Portuguese: Fome, Conforto, Higiene, Bexiga, Energia, Diversão, Social, Ambiente). The manual says players should watch the Needs panel to see how activities change mood. Bars show good values in green and bad values in red. There is also an overall mood meter.

**Numbers:** Motive range -100 to +100 (bar centre = 0). Layout: 2 columns x 4 rows. Colour: lerp from dark red (-100) through yellow (0) to bright green (+100) (ESTIMATE). Blink when below -50 (ESTIMATE). Mood meter: 10 segments, 5 green and 5 red, showing a weighted average of the motives (weights come from the motive-system research; ESTIMATE equal weights for the UI).

**Implementation:** Use DOM divs with a width transition. Update at most 4 times per second from sim state, not every frame. Hovering a bar shows a tooltip with the exact value and the current change rate (an original addition). Clicking a portrait switches the panel to that Sim.

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/LiveSubpanels/UIMotiveSubpanel.cs, https://ia801300.us.archive.org/24/items/The_Sims/The_Sims.pdf, https://oldgamesdownload.com/wp-content/uploads/The_Sims_Deluxe_Edition_Manual_EN.pdf


### A12. Household panel, Sim selection and the other Live sub-panels

The household's Sim portraits are always visible; clicking one selects that Sim (its queue, needs and camera focus follow), and double-clicking centres the camera on it (ESTIMATE). Household funds are always visible. Live sub-panels in TS1/Simitone: Mood (needs), Personality (5 traits: Neat, Outgoing, Active, Playful, Nice, each 0-10), Job (career title, salary, Performance bar, and 6 skills: Cooking, Mechanical, Charisma, Body, Logic, Creativity), and Relationships (thumbnails of known Sims with a score and friend/romance icons; prerelease builds already had friendship and romance icons on each thumbnail). An Inventory tab exists only through expansion content.

**Numbers:** Max 8 Sims per household. Skills 0-10 (stored x100 internally, e.g. 0-1000). Relationship -100 to 100 (ESTIMATE as display range). Funds shown with a thousands separator.

**Implementation:** Left column: portrait buttons (64x64 canvas rendered from each Sim's head at creation, re-rendered when the outfit changes). Bottom panel tabs: Humor | Personalidade | Emprego | Relacionamentos. Use an original currency symbol and name instead of §/Simoleon (e.g. 'Ŝ' is too close; prefer something like '₢' or 'P$' with the name 'Patacas').

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/LiveSubpanels/UIPersonalitySubpanel.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/LiveSubpanels/UIJobSubpanel.cs, https://tcrf.net/Prerelease:The_Sims_(Windows)/1999, https://sims.fandom.com/wiki/CAS


### A13. Build mode tools and controls

Simitone's TS1 build catalog has three groups: Architecture (Wall, Wallpaper, Floor, Roof), Outdoors (Trees/Plants, Terrain, Water/Pool) and Objects (Door, Window, Staircase, Fireplace); a hand/select tool and delete are also available. Wall/fence tool: press on a tile corner and drag; the line snaps to 8 directions (45° steps) and its length is rounded to whole segments. Shift-drag draws a rectangular room. Ctrl-drag erases walls (cursor graphics change for Shift and Ctrl). The live cost is shown at the cursor as '$N', or '-$N' for a refund, and placement is refused if the cost exceeds the funds. Wallpaper: click one side of a wall; Shift fills the whole room. Floor: click or drag tiles; Shift fills the room. Terrain: raise, lower and flatten corner heights. Water: pool tool.

**Numbers:** Costs (FreeSO VMArchitecture): new walls = segments x style.Price; deleting walls refunds 7 per segment; repainting a wall or floor refunds 80% of the replaced pattern's cost (cost - cost/5); floors are counted in half-tiles because diagonal walls split a tile into two triangles; terrain costs 1 per height unit changed. Wall price ESTIMATE 10 per segment (this matches a 70% delete refund); wallpaper ESTIMATE 2-10 per wall side; floor ESTIMATE 2-20 per tile; door 80-500 and window 50-500 (ESTIMATE). The TS1 base game supports 2 storeys.

**Implementation:** Each tool produces a list of architecture commands {type:'WALL_LINE'|'WALL_RECT'|'WALL_DELETE'|'PATTERN_FILL'|'PATTERN_DOT'|'FLOOR_FILL'|'FLOOR_RECT'|'TERRAIN_RAISE'|'TERRAIN_FLATTEN', ...}. While dragging, run simulate(commands) on a cloned architecture to get the cost and a ghost preview (like FreeSO's LastTestCost). On release, commit if cost <= funds and push the inverse commands onto an undo stack (Ctrl+Z is our own addition). Snap pointers to tile corners with Math.round on world x/z.

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/LiveSubpanels/UIBuyBrowsePanel.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/LotControls/UIWallPlacer.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMArchitecture.cs, https://help.ea.com/en/articles/the-sims/the-sims-legacy-collection/the-sims-legacy-controls/


### A14. Walls on tile edges, diagonal walls, doors and windows (rules)

Walls run along tile edges, never through tile centres. In FreeSO's WallTile each tile owns two edges, the top-left and top-right ones; the other two come from neighbouring tiles. Each edge carries a style (solid, fence and so on) and a pattern per side (four pattern fields per tile). A diagonal wall (HorizontalDiag or VerticalDiag) runs corner to corner across a tile and can only be placed on a tile with no other wall segments; it splits the tile into two triangular halves for floors and rooms. Doors and windows are wall objects placed onto an existing straight wall segment. They mark the edge as occupied and can set a custom wall style (the cut-out). A door makes the edge passable (TopLeftDoor means not solid for routing); a window keeps it blocking. Doors and windows on diagonal walls are not allowed (TS1 behaviour as commonly known; ESTIMATE). Walls cannot be drawn through objects or other walls.

**Numbers:** Edge arrays per level: horizontal edges W x (H+1), vertical edges (W+1) x H, plus diag[W x H] (0 = none, 1 = '/', 2 = '\'). Door width = 1 segment. Storey height = 2.95 tile units (FreeSO places Sims at (level-1)*2.95). Wall thickness about 0.12 tile (ESTIMATE).

**Implementation:** Edge index helpers: hIdx(x,z) = z*W + x is the edge on the north side of tile (x,z); vIdx(x,z) = z*(W+1) + x is the edge on its west side. Moving east from (x,z) crosses v(x+1,z); moving south crosses h(x,z+1). Store per edge: {style, patA, patB, objId} in parallel typed arrays (Uint8 style, Uint16 patterns, Int32 objId).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.world/Model/WallTile.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMArchitectureTools.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMArchitecture.cs


### A15. Buy mode catalog UI

TS1 sorts the Buy catalog by function by default; the alternative view sorts by room (sims.fandom). The function categories and subcategories (Simitone, TS1 data): Seating (Dining chairs, Living/lounge chairs, Sofas, Beds); Surfaces (Counters, Tables, End tables, Desks); Appliances (Stoves, Refrigerators, Small, Large); Electronics (Entertainment, TV/Computers, Audio, Phones); Plumbing (Toilets, Showers/tubs, Sinks, Hot tubs); Decorative (Paintings, Sculptures, Rugs, Plants); Miscellaneous (Recreation, Knowledge, Creativity, Wardrobe/dressers, plus pets and magic from expansions); Lighting (Table, Floor, Wall, Hanging). Every category also has 'Other' and 'All'. Items are sorted by ascending price. Each catalog card shows the icon, name, price, description and the motives it satisfies. Clicking a card attaches a ghost of the object to the cursor.

**Numbers:** 8 categories x 4 subcategories + Other + All. Room view (ESTIMATE list): Kitchen, Bathroom, Bedroom, Living room, Outside, Miscellaneous. Grid of 64x64 px cards, paged or scrolled.

**Implementation:** Catalog data: [{id, nameKey, price, cat, subcatMask, roomMask, footprint, motives:{hunger:..}, descKey}]. Filter with (subcatMask & bit), then sort by price. Show a hover tooltip with motive ratings (0-10 stars). Generate icons by rendering each object's low-poly mesh once to an offscreen 64x64 render target at startup.

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/LiveSubpanels/UIBuyBrowsePanel.cs, https://sims.fandom.com/wiki/Buy_mode, https://forums.ea.com/discussions/the-sims-1-en/missing-items/11922697


### A16. Placing, moving, rotating and selling objects; depreciation

A held object snaps to the tile grid and the current floor, with a valid or invalid tint. Rotation: click-drag sets the facing from the drag vector rounded to 90°, or use the comma/period keys. The Delete key sells the held object; Esc cancels. When an object must stand against a wall, placement tries all 4 rotations automatically. Placing is blocked with a specific error: LocationOutOfBounds, LevelOutOfBounds, MustBeAgainstWall, CantBeThroughWall, CantIntersectOtherObjects, CantPlaceOnSlope, CantSupportWeight, MustBeOutside/Inside, InsufficientFunds, and so on. The hand tool picks up an already placed object (not while it is in use). Each TS1 object definition carries Price, SalePrice, InitialDepreciation, DailyDepreciation, SelfDepreciating and DepreciationLimit, so resale value falls once, then daily, down to a floor. Some art can appreciate instead.

**Numbers:** Rotations: 4. Sale value = max(limit, price - initialDep - dailyDep*daysOwned), with a full refund if the object is sold before the sim day ends and before it is used (ESTIMATE rule). Proposed defaults (ESTIMATE, modelled on a TS2 door with price 95, initial 15, daily 10, limit 40): initialDep = 15% of price, dailyDep = 10% of price, limit = 40% of price.

**Implementation:** PlaceObjectTool: ghost = mesh clone with a transparent material. Each pointermove: tile = pickFloor(); res = world.canPlace(type, tile, rot, level), returning {ok, error, autoRot}. Tint the footprint quads green or red and show the error text in a tooltip. On click with ok and funds >= price: commit, deduct the price, set obj.boughtTick = now and obj.used = false. Selling: refund sellValue(obj, now).

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/UIObjectHolder.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMPlacementError.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/OBJD.cs, https://strategywiki.org/wiki/The_Sims_2:_Nightlife/New_Build_Mode_Features


### A17. Create-a-family flow and move-in

Flow (TS1, with fields confirmed in Simitone's CAS): 1) In the neighbourhood view, choose Create New Family and enter the family surname. 2) For each member (up to 8): first name; Adult or Child; gender; skin tone (light, medium, dark); scroll through head and body choices on rotating carousels; personality, spending up to 25 points over Neat, Outgoing, Active, Playful and Nice with at most 10 each (unused points allowed), with the zodiac sign shown live from the mix (or chosen as a preset that fills in points); a free-text bio. A family needs at least one adult (ESTIMATE as an enforced rule). 3) Save the family to the 'family bin'. 4) Pick a lot: a pre-built house or an empty lot. Its price is deducted from the starting budget, and move-in is refused if funds are short; the house-select panel shows the price and the funds left. Family net worth = funds + house value.

**Numbers:** Starting funds: 20,000 for every new family regardless of size. Personality points: 25 total, 0-10 per trait (stored x100 internally). Skin tones: 3. Carousel: 18 visible slots (Simitone). Max household size: 8.

**Implementation:** Build CAS as its own screen with a THREE preview of the procedural Sim on a turntable. Store sim = {firstName, ageGroup:'adult'|'child', gender, skin:0-2, headId, bodyId, outfitColors, personality:[n,o,a,p,ni], bio}. Show the remaining points as '25 - sum' and disable '+' at 10 or when no points are left. Use original archetype names instead of zodiac if desired (e.g. 'Sonhador', 'Líder'), computed as the template vector nearest in Euclidean distance (ESTIMATE). Then show the neighbourhood lot picker with price checks.

Sources: https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/CAS/UISimCASPanel.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Screens/TS1CASScreen.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/UIHouseSelectPanel.cs, https://www.gamespot.com/articles/the-sims-walkthrough/1100-6086937/, https://sims.fandom.com/wiki/CAS, https://simple.wikipedia.com/wiki/The_Sims, https://giantbomb.com/wiki/Games/The_Sims


### A18. HUD layout recommendation (TS1-like, original look)

A bottom-left control panel as in TS1: on the left an arc or column of 4 mode buttons; next to it a camera cluster (zoom in/out, rotate left/right, floor up/down, 4 wall-mode toggles); then the context panel (Live: tabs and needs; Buy: catalog; Build: tool groups and catalog). The clock, the speed buttons (pause, 1, 2, 3) and the funds sit at the left end of the bottom bar. The action queue is at the top-left, household portraits in a column on the left edge, toasts at the top-right, and modal dialogs in the centre.

**Numbers:** Bottom bar height about 170 px on desktop, collapsing to a 2-row 120 px bar on mobile (ESTIMATE). Touch targets at least 44 px. UI scale = clamp(innerHeight/900, 0.75, 1.25) (ESTIMATE).

**Implementation:** Use plain DOM and CSS over the canvas (pointer-events: none on the container, auto on the panels). Keep every string in a pt-BR dictionary. Avoid EA visual signatures: no green diamond plumbob (use, say, a floating ring under the selected Sim's feet), no '§', no Sims fonts or sounds.

Sources: https://oldgamesdownload.com/wp-content/uploads/The_Sims_Deluxe_Edition_Manual_EN.pdf, https://tcrf.net/Prerelease:The_Sims_(Windows)/1999


### B1. Overall architecture (single page, Three.js r128 UMD)

One index.html loads three.min.js r128 from cdnjs (global THREE) plus your own scripts as IIFE namespaces, with no bundler. The code splits into four layers. 1) sim/: a pure, deterministic simulation with no THREE or DOM access: clock, RNG, world (architecture, objects, rooms), Sims (motives, queue, actions as state machines), pathfinding, autonomy. 2) render/: a THREE scene kept in sync with the sim through dirty flags and an event bus (built from sim state, never the other way round). 3) ui/: DOM panels, pie menu, dialogs, bubbles. 4) input/: pointer, keyboard and the active Tool. The main loop runs a fixed-step sim and variable-rate rendering.

**Numbers:** Scripts: three.min.js r128 (about 600 KB minified). Optional helpers from https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/BufferGeometryUtils.js (r128 still ships examples/js as non-module scripts); cdnjs has only the core build. Target 60 fps on mid-range laptops and 30+ fps on phones (ESTIMATE).

**Implementation:** <script src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'></script>. Globals: window.G = {sim, render, ui, input}. Event bus: sim.events.push({type, ...}), drained by render and UI after each frame. Every sim change goes through commands (architecture commands, buy/sell, queueAction), which also gives undo and keeps saves consistent.

Sources: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VM.cs


### B2. World coordinates and data model

1 world unit = 1 tile. x points east and z south on the ground plane, y is up, level L sits at y = (L-1)*STOREY. Tiles are addressed by integer (x,z); tile centres are at (x+0.5, z+0.5); wall corners (vertices) are at integer points. Architecture per level: floor pattern per tile (two halves where a diagonal exists), edge walls (A14), and terrain heights per vertex for level 1. Objects: {id, type, x, z, level, rot 0-3, state:{...}}, with a per-level occupancy grid Int32Array(W*H) of object IDs for footprint tiles, plus a separate wall-mount map. Rooms: a roomId per tile (or half-tile) per level, recomputed by flood fill after any wall or door change (B12).

**Numbers:** Lot size up to 64x64 (TS1 stores lots as 64x64 arrays; proposed default buildable area 30x30 to 40x40; ESTIMATE). STOREY = 2.95 units (FreeSO). Positions use 1/16-tile resolution in TS1 (LotTilePos), so floats in the sim are fine, or ints x16 for determinism. Adult Sim about 1.75 units tall (ESTIMATE).

**Implementation:** Use typed arrays everywhere: floors[level] = Uint16Array(W*H*2); hWall[level] = Uint8Array(W*(H+1)) for style; hPatA/hPatB = Uint16Array; same for v and diag. Footprint rotation: (dx,dz) maps to rot1 (-dz,dx), rot2 (-dx,-dz), rot3 (dz,-dx). A world.version counter bumps on every architecture change and is used to invalidate path and room caches.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMTS1ActivatorNew.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/SLOT.cs


### B3. Fixed-timestep simulation loop decoupled from rendering

The sim ticks at a fixed 30 Hz times the speed multiplier. Rendering runs on requestAnimationFrame and interpolates Sim positions between the previous and current tick. FreeSO does the same: it computes how many ticks fit into each 60 Hz frame and keeps a Fraction that is used for fractional avatar animation. Clamp dt so a background tab does not trigger a huge catch-up, and cap ticks per frame so ultra speed cannot freeze the page.

**Numbers:** TICK_HZ = 30. speedMul in {0,1,3,10}. dt clamp 0.25 s. MAX_TICKS_PER_FRAME = 20 (at 10x and 60 fps about 5 are needed; the cap only matters on slow devices, where ultra becomes 'as fast as possible'). Interpolation alpha = accumulator fraction (0-1).

**Implementation:** let acc=0,last=performance.now(); function frame(now){const dt=Math.min((now-last)/1000,0.25); last=now; acc+=dt*30*G.sim.effectiveSpeed(); let n=0; while(acc>=1&&n<20){G.sim.tick(); acc-=1; n++;} if(n===20)acc=Math.min(acc,1); G.render.sync(acc); G.ui.update(); renderer.render(scene,camera); requestAnimationFrame(frame);} Each Sim keeps prevPos and pos (and prevYaw and yaw), copied at the start of tick(). The renderer draws lerp(prev,pos,alpha). Use a seeded PRNG (mulberry32) stored in state; never call Math.random in sim code. Pause the sim on document.visibilitychange (hidden).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VM.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Screens/TS1GameScreen.cs


### B4. A* pathfinding with wall-edge blocking and diagonal rules

Search a grid graph of tile centres per level with 8-connectivity. Orthogonal step (x,z) to (x+1,z): allowed if the target tile has no blocking object, the crossed edge v(x+1,z) has no wall (doors count as open), and neither tile is split by a diagonal wall in a way that blocks the move. Diagonal step (x,z) to (x+1,z+1): allowed only if both orthogonal two-step routes ((x,z)→(x+1,z)→(x+1,z+1) and (x,z)→(x,z+1)→(x+1,z+1)) are fully legal, no wall touches the shared corner vertex (x+1,z+1), and no door is crossed diagonally. This rule rules out corner cutting and squeezing between wall posts. Diagonal-wall tiles are treated as two half-tile nodes, or in v1 as impassable. Stairs connect levels through their entry and exit tiles. After A*, smooth the path with string pulling, using a supercover line-of-sight test against blocked edges and tiles. FreeSO's real router is rectangle and geometry based at 1/16-tile precision with up to 5 retries, but a tile A* plus smoothing reproduces the feel.

**Numbers:** Costs: orthogonal 1.0, diagonal √2 ≈ 1.4142, door crossing +0.25 (ESTIMATE), tile next to another Sim's reserved tile +2 (ESTIMATE). Heuristic: octile h = (dx+dz) + (√2-2)*min(dx,dz). Grid up to 64x64 = 4,096 nodes per level, typically under 1 ms per search. Retries: 5 (FreeSO MAX_RETRIES), with a wait of 30-60 ticks when blocked by a moving Sim (FreeSO WalkInterrupt(30/60)).

**Implementation:** Preallocate g = Float32Array(N), parent = Int32Array(N), state = Uint8Array(N) (0 = new, 1 = open, 2 = closed), stamp-reset with a search ID. Use a binary heap of node indices. Goal set = all routing-slot tiles of the target (multi-goal A*: start from the Sim and stop at the first goal popped; h = min over goals, or 0 for many goals, i.e. Dijkstra). Cache results keyed by (start, goalSet, world.version). On failure, emit a RouteFailure headline showing the target's icon crossed.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRouteFinder.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMArchitectureTools.cs


### B5. Object footprints and routing slots

Each object type defines a footprint (list of tile offsets in local space), placement rules (againstWall, notInCorner, outsideOnly, onSurface...) and routing slots modelled on TS1's SLOT resource. A slot has a type, a local offset (x,y,z), score bonuses for standing, sitting or ground destinations, flags for the 8 allowed approach directions (N, NE, E, SE, S, SW, W, NW), Absolute (do not rotate with the object), IgnoreRooms, SnapToDirection and RandomScoring, minimum/maximum/optimal proximity, a facing rule (FaceTowardsObject, FaceAwayFromObject, FaceAnywhere, or an explicit angle) and a height class. TS1 height classes: floor 0, low table 2.5, table 4, counter 4, sitting 7, end table 4 (relative units). A Sim using an object routes to the best-scoring slot, snaps to the exact offset, turns to the facing, then plays the interaction animation (sit, lie, use). Surfaces expose container slots where other objects (plates, a TV on an end table) can be stacked.

**Numbers:** Proximity in TS1 is in 1/16-tile units (version 9 and older multiply by 16). Default slot facing = towards the object. Examples (ESTIMATE): chair: sit slot at (0,0) facing the chair's forward direction, approach tile (0,+1); fridge and stove: stand slot at (0,+1) facing the object; single bed (1x2): lie slot centred, approach from either long side; sofa (1x3): 3 sit slots; toilet: sit slot plus stand approach from the front; counter: one stand slot in front of each tile.

**Implementation:** type.slots = [{kind:'sit'|'stand'|'lie', dx, dz, facing:'toward'|'away'|'any'|angle, approachMask:0xFF, minProx:0, maxProx:0, optProx:0, bonus:{stand:1, sit:0}}]. Slot world position = obj.pos + rotate(dx,dz,rot); rotate the facing by rot*90°. To pick a slot: for each free slot (not reserved by another Sim), cost = pathCost - bonus*W. Reserve the chosen slot (obj.slotOwner[i] = simId) until the Sim leaves. The final approach from the last tile centre to the exact slot point is a short straight segment.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/SLOT.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMGotoRoutingSlot.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMPlacementError.cs


### B6. Walking movement, speed, turning and Sim-to-Sim avoidance

Measured from FreeSO's TS1 router: each path segment needs distance(1/16-tile units) x 10 'frame units'. Each tick the Sim advances by its velocity, which ramps from 0 to 8 by +1 per tick at the start and decelerates over the last 28 units (7+6+5+...). At full speed that is 20 ticks per tile. Walk-animation blend weights scale with velocity/8. If the remaining route is longer than 10 tiles the Sim runs (WalkStyle 1): move time divided by 3 and the run animation at 2x. Turning is clamped to 0.25 rad per tick. A blocked Sim waits 30-60 ticks, then re-routes, up to 5 retries, then fails with a route-failure balloon.

**Numbers:** Walk at full speed: 1.5 tiles per real second at 1x (= 1.5 tiles per sim-minute). Run: 4.5 tiles/s (3x), used when the path is over 10 tiles. Acceleration: 8 ticks to full speed. Turn rate cap: 0.25 rad per tick (7.5 rad/s at 1x). Wait when blocked: 30-60 ticks. Retries: 5.

**Implementation:** Per tick: if the next waypoint's tile is reserved by another Sim moving the opposite way, wait (counter); after 45 ticks (ESTIMATE) replan with that tile marked expensive. Reserve the next tile for each walking Sim (reservation map Int32Array). Advance along the polyline: s += speed*v/8 with speed = 1/20 tile per tick; yaw approaches atan2(dx,dz) clamped to 0.25 per tick. The animation phase follows the distance walked (B10).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/Routing/VMPathLineSegment.cs


### B7. Raycast picking (tiles, wall edges, corners, objects, Sims)

Floor tile and wall-corner picking: intersect the camera ray analytically with the plane y = levelY (no mesh raycast needed), then tile = floor(p.x), floor(p.z) and corner = round(p.x), round(p.z). Wall-edge picking for wallpaper and doors: from the fractional position inside the tile, pick the nearest of the 4 edges (fx<0.5 → west, and so on), with the side given by which tile the point lies in. When walls are up, raycast the wall InstancedMesh instead; intersection.instanceId maps to an edge index and face.normal gives the side. Objects and Sims: raycast against simple invisible proxy boxes (object footprint x height; Sims a 0.5 x 1.8 x 0.5 box) stored in a pickables array, with userData {kind:'sim'|'obj', id}. Sims take priority over objects at equal depth. Run the hover raycast at most once per frame, and only after pointer movement.

**Numbers:** Sim proxy box 0.5 x 1.8 x 0.5 units. Hover highlight: emissive 0x333333 or an outline (ESTIMATE). Raycaster works with OrthographicCamera through setFromCamera(ndc, camera) in r128.

**Implementation:** const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, cam); const o = ray.ray.origin, d = ray.ray.direction; const t = (levelY - o.y)/d.y; const p = o.clone().addScaledVector(d, t). For objects: ray.intersectObjects(G.render.pickables, false)[0]. Give proxies material.visible = false so they are not drawn (Raycaster still tests them because it checks object.visible, not material.visible). Use layers, or keep the proxies out of the shadow pass.

Sources: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/UILotControl.cs


### B8. Wall mesh construction and cutaway rendering

Geometry: each straight wall edge is two thin slabs, one per side (so each side has its own wallpaper colour or texture), each a BoxGeometry(1, STOREY, 0.06) offset ±0.03 from the edge line. Draw them with InstancedMesh, using per-instance matrices and per-instance colour (setColorAt exists in r128). Door and window edges use separate instanced piece types (two jambs plus a lintel for doors; jambs, a sill piece and a lintel for windows, with glass as a transparent quad). Corner posts fill the gaps at vertices with three or more walls (a 0.12 x STOREY x 0.12 box). Diagonal walls are slabs rotated 45° and √2 long. Cutaway, following FreeSO: (1) GenerateRoomCut: a wall tile is cut if stepping up to 5 tiles from it toward the camera (CutCheckDir by rotation; 4 steps for the two side-offset rays) reaches a tile in a cut room (the last 3 hovered indoor rooms). (2) ApplyCutRectangle: also cut every wall tile in a 5x5 rectangle around the cursor, shifted 2 tiles toward the camera. (3) A wall on a cut tile is drawn as a stub. Walls Down cuts every tile; Walls Up and Roof cut none. Only the current floor is affected; floors above are hidden.

**Numbers:** Stub height 0.12*STOREY (about 0.35 unit; ESTIMATE). Height tween 120 ms (ESTIMATE). Instance budget per level: at most W*(H+1) + (W+1)*H + W*H edges, i.e. under 12,500 for 64x64, typically 200-800. CutCheckDir per rotation: [-1,-1], [-1,1], [1,1], [1,-1].

**Implementation:** Keep wallInst[edgeIndex] → instance indices. On a cut-mask change, set matrix scale.y = cut ? 0.12 : 1 (with pivot at the base: translate y = h/2) for the affected instances, then instanceMatrix.needsUpdate = true. Recompute the mask only when cut rooms, rotation, floor or the cursor rectangle change. For the back-facing walls of cut rooms, keep full height so the room still reads as enclosed. Use a slightly darker colour on the wall-top cap of stubs.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMArchitectureTools.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/UILotControl.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.world/Components/WallComponent.cs


### B9. Day/night lighting

Drive a HemisphereLight (sky and ground colours) plus a DirectionalLight (the sun) from the sim time of day, using a colour keyframe table. FreeSO's table has 14 evenly spaced keys over 24 h: night (50,70,122)*1.25 for keys 0-1, (55,75,111)*1.25, (70,70,70)*1.25, sunrise (217,109,50) at key 4, white (255,255,255) for keys 5-9 (peak at 6-7), sunset (217,109,50) at key 10, then back to bluish night. Colours are linearly interpolated and gamma-adjusted (pow 2.2). Indoors, TS1 has windows letting in daylight and lamps lighting rooms, which feeds the Room motive. In a browser, use a few PointLights for lamps (limited count) or a per-room light level applied as a tint.

**Numbers:** Keys at t = i/13 of the day (about every 1.85 h). Sunrise at about 07:23 and sunset at about 18:28 in FreeSO's table; proposed for us sunrise 06:00 and sunset 19:30 (ESTIMATE). Sun elevation = 60°*max(0, sin(π*(h-6)/13.5)) (ESTIMATE). Night: hemisphere intensity 0.35 with sky #3F578F; day: hemisphere 0.6 with sky #FFFFFF and ground #8a7a5a, sun 0.8 (ESTIMATE). At most 6-8 active PointLights (nearest to the camera target), distance 6, decay 2 (ESTIMATE). Shadow map 2048 for the sun, ortho shadow camera ±(lot/2+4), bias -0.0005.

**Implementation:** function lightAt(t){const k=t*13,i=Math.floor(k),f=k-i; return lerpColor(KEYS[i],KEYS[Math.min(i+1,13)],f);} Update lights once per sim-minute. Enable sun.castShadow only in daylight; set renderer.shadowMap.autoUpdate = false and needsUpdate = true when the sun moves more than 2° or the architecture changes. Give Sims a cheap blob shadow (a dark radial-gradient quad) instead of real shadows. Lamps: an object with on/off state turns a pooled PointLight on or off; rooms without lamps are darker at night (also useful for the Room motive).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.common/Rendering/TimeOfDayConfig.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs


### B10. Procedural low-poly characters and walk animation

Build each Sim from a THREE.Group hierarchy of primitive meshes with pivots at the joints: root (feet) → hips → torso → neck → head; shoulders → upperArm → foreArm → hand; hips → thigh → shin → foot. Customisation from CAS: skin tone (3), shirt and pants colours, hair mesh variant and colour, body type (shoulder and hip widths), age (a child is about 0.62x the height with a 1.25x head). Walk cycle: the phase advances with the distance actually walked so feet do not slide; thighs swing ±0.55 rad, knees bend on the back-swing, arms counter-swing ±0.45 rad, and the body bobs and twists slightly. Blend from idle to walk by speed (FreeSO blends weights velocity/8). Action poses come from keyframe tables per joint (sit, lie, eat, drink, talk gestures, dance, wave), stepped by sim ticks so they are deterministic and interpolated with alpha for rendering. In r128, MeshLambertMaterial lights per vertex and has no flatShading, so for a faceted look either convert geometry with toNonIndexed() and computeVertexNormals(), or use MeshPhongMaterial({flatShading:true}).

**Numbers:** Adult proportions in tile units (ESTIMATE): height 1.75; head Icosahedron r = 0.13, detail 1; torso box 0.38 x 0.50 x 0.22 centred at y 1.30; hip box 0.34 x 0.15 x 0.20 at y 0.95; thigh 0.13 x 0.42 x 0.13 pivoting at y 0.92; shin 0.11 x 0.42 x 0.11 pivoting at y 0.48; upper arm 0.09 x 0.30 pivoting at y 1.50; forearm 0.08 x 0.28. Stride: one full cycle = 1.2 tiles (phase += dist/1.2*2π). Bob = 0.035*|sin(phase)|. Idle breathing: torso scale.y 1 + 0.01*sin(2.0*t). Sit: hips -1.57 rad, knees +1.57, root y = seat height 0.45. About 12-15 meshes and under 600 triangles per Sim.

**Implementation:** function makeSim(look){...} returns {root, joints:{hipL, kneeL, ...}}. Share one geometry per part shape across all Sims and give each Sim its own small set of materials (skin, shirt, pants, hair). Pose application: for each joint, rotation.x = sampled angle. Keep animation state {clip, t} in the sim (serializable), with only the visuals in the renderer. The head looks at targets by setting neck yaw toward a point (also used for the pie-menu head portrait). For an off-screen portrait, render the head with a second small orthographic camera into a WebGLRenderTarget, or use a 2D canvas face.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/CAS/UISimCASPanel.cs, https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js


### B11. Instancing and performance tips

Draw-call and allocation discipline for a low-poly lot. Walls: InstancedMesh per piece type (B8). Floors: one merged BufferGeometry per level (2 triangles per tile, or 4 for split tiles) with vertex colours or atlas UVs, rebuilt only when a floor or wall changes (dirty flag), with old geometry disposed. Terrain: a single PlaneGeometry(W,H,W,H) with vertex heights and colours. Objects: share geometry and material per type; when a type has more than 4 copies on the lot (chairs, counters, lamps), use an InstancedMesh for that type. Sims: individual groups (usually 12 or fewer on the lot). Static meshes: matrixAutoUpdate = false plus updateMatrix() after placement. Never allocate Vector3s or Matrix4s per frame; use module-level temporaries. Watch renderer.info.render.calls and .triangles.

**Numbers:** Budgets (ESTIMATE): ≤150 draw calls, ≤150k triangles, ≤8 ms CPU per frame. setPixelRatio(Math.min(devicePixelRatio, 2)), or 1.5 on mobile. Antialias on for desktop and off on low-end. Shadows off on mobile and at night. Rebuilding a 64x64 floor takes about 1 ms. Instance counts are fixed at creation (set mesh.count to the number actually used; reallocate by doubling when exceeded).

**Implementation:** renderer = new THREE.WebGLRenderer({antialias:!isMobile, powerPreference:'high-performance'}); renderer.outputEncoding = THREE.sRGBEncoding (the r128 API). Generate textures procedurally with a canvas (wallpaper and floor atlas 1024x1024 split into 64 cells of 128 px), using NearestFilter or mipmaps. Render on demand while paused with no camera movement (still render while Sims animate). Keep the pickables and lights arrays separate from the scene graph traversal.

Sources: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js


### B12. Room detection (flood fill)

Rooms drive cutaway, the Shift-fill of floors and wallpaper, indoor/outdoor rules (MustBeInside/Outside), lighting and the Room motive. After any wall or door edit, flood-fill each level's tile (or half-tile) graph where every wall blocks, doors included, so doors separate rooms. A component touching the lot border, or with no floor and no enclosure, is 'outside' (room 0). Store per room its tile list, area, light level and score inputs.

**Numbers:** Nodes: W*H per level (+1 for each diagonal-split tile). Recompute cost under 1 ms for 64x64 with an iterative BFS using an Int32Array queue.

**Implementation:** roomMap[level] = Uint16Array(W*H*2), indexed by tile*2 + half (half = 0 for unsplit tiles). Neighbour test reuses the same edge-blocking helpers as A*, but with doors treated as walls. Keep the old room IDs stable by matching rooms with the largest overlap after a recompute, so cutaway memory and room settings survive edits.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMArchitectureTools.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/UILotControl.cs


### B13. Save-state serialization

Save the complete sim state, never THREE objects, as versioned JSON and rebuild the scene on load. FreeSO marshals the whole VM this way (clock, entities, threads, routing frames, headlines). Contents: version; rngState; clock (tick, minute, hour, day); user speed; household (name, funds, member IDs); lot (W, H, levels, terrain Int16Array, floors, wall edge arrays, diagonal array, roof); objects (id, type, x, z, level, rot, state vars, value, boughtTick, used, slotOwners); Sims (id, names, age, gender, skin, look, personality[5], skills[6], motives[8], relationships, job, position and yaw, current action {iid, targetId, phase, phaseTick, params}, queue, animation clip state); pending dialogs; nextId. Paths are dropped and recomputed on load. Actions written as data-driven state machines can resume at their current phase.

**Numbers:** Typical save 50-200 KB of JSON, about 10-30 KB gzipped (ESTIMATE). localStorage limit is about 5 MB per origin, so use IndexedDB for slots and localStorage only for settings. Autosave on every switch to Buy or Build and every sim day at 00:00 (ESTIMATE). 3+ save slots plus export and import of a .json file.

**Implementation:** Encode typed arrays to base64: btoa(String.fromCharCode(...new Uint8Array(arr.buffer))), chunked for large arrays. Compress with new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')) when available, otherwise store plain. Wrap every storage call in try/catch (private mode can throw). Add a migrations table: while (save.version < CURRENT) save = MIGRATE[save.version++](save). Do not save while a blocking dialog is mid-script, or serialize the pending dialog too. On load: sim = Sim.fromJSON(data); render.rebuildAll(sim); ui.refresh().

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMRuntimeHeadline.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs


### B14. Build-mode command pipeline (preview, cost, commit, undo)

This mirrors FreeSO's VMArchitecture. UI tools never edit the world directly; they emit command lists. simulate(commands) runs them on a scratch copy (or with transient = true) to get the cost (negative means a refund) and the preview geometry, shown as a '$N' / '-$N' tooltip at the cursor and refused if it exceeds the funds. commit(commands) applies them, deducts the cost, bumps world.version, recomputes rooms, marks render chunks dirty and pushes the inverse commands for undo. The same pipeline serves Buy (BUY_OBJECT, MOVE_OBJECT, SELL_OBJECT), keeping costs, saves and undo consistent.

**Numbers:** Wall cost = newSegments*stylePrice; wall delete refund = 7 per segment (FreeSO); pattern replace refund = 80% of old; floor cost = halfTiles*price/2; terrain = 1 per unit changed. Undo depth 50 (ESTIMATE). Undo allowed only within the current Build/Buy session (ESTIMATE).

**Implementation:** Command types: WALL_LINE {x,z,len,dir8,style,pattern}, WALL_RECT {x,z,w,h}, WALL_DELETE, PATTERN_DOT {edge,side,pattern}, PATTERN_FILL {room,pattern}, FLOOR_RECT, FLOOR_FILL, TERRAIN_RAISE {vx,vz,delta}, TERRAIN_FLATTEN {rect,height}, plus BUY/MOVE/SELL. Validation: no wall through an object footprint, no wall on an occupied diagonal tile, no door or window on a diagonal wall, buildable-area mask.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMArchitecture.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/LotControls/UIWallPlacer.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.client/UI/Panels/LotControls/UIFloorPainter.cs


### B15. Research limitations

WebFetch could not reach any page (DNS errors and proxy 403s for wikipedia, medium, archive.org, strategywiki, help.ea.com and oldgamesdownload). The run used up its shared WebSearch budget. Facts therefore come from search-result summaries plus a direct reading of the FreeSO and Simitone sources, which run the original TS1 data. Values that are FreeSO design choices rather than confirmed TS1 behaviour: MAX_USER_ACTIONS = 20, RMB-drag scrolling, the TimeOfDay colour table (used in FreeSO's TSO mode), and the exact cutaway heuristics. Object, wall and floor prices live in the game's data files and were not verified, so they are marked ESTIMATE.

**Numbers:** n/a

**Implementation:** If more precision is needed later, read the Deluxe manual PDF and the sims.fandom Live mode, Build mode and Buy mode pages in a session with web access, and check prices against a TS1 object list.

Sources: https://github.com/riperiperi/FreeSO, https://github.com/riperiperi/Simitone


## GAP FILLS (completeness critic)

COMPLETENESS CRITIQUE. Research access this session: the shared WebSearch budget was already used up when I started, and WebFetch/curl could not resolve any fan-wiki host (fandom, thesimswiki, strategywiki, wikipedia, neoseeker, teoalida, modthesims, gamefaqs and others all failed DNS). New facts below therefore come from reading the FreeSO and Simitone source code (cloned locally from GitHub, reimplementations of the TS1 engine) plus my own recall of TS1. Each value is tagged VERIFIED-CODE (I read it in that source), DOCUMENTED (from the earlier research), RECALLED (my memory, not re-verified here) or ESTIMATE (a design proposal).

GAPS AND CONTRADICTIONS THAT WOULD BLOCK IMPLEMENTATION:
(1) Time base. "Tick" means two things: 30 decay steps per sim-hour, and 30 VM ticks per sim-minute. Game speeds, real-time mapping and day/night hours were also missing. Fixed from VMClock/VMContext and the Simitone speed code.
(2) No walking or routing speed. Derived from FreeSO's routing code.
(3) Interaction gain rates contradict each other across sections:
- toilet: +200/h vs +600/h vs 150 x rating;
- shower: +60/h vs +360/h vs 25 x rating;
- bed: 22 x bedRate vs 3r+5 vs +25;
- seats: +20..45/h vs 6 x rating;
- TV: +20..40/h vs 8 x rating vs +40..100/h.
I picked one canonical table and checked it against the decay rates with a daily time budget.
(4) Autonomy settings conflict. Two curve sets: the motives section uses C(m) with an Energy cutoff of 40, the autonomy section uses point tables with an Energy cutoff of 0. Two scoring modes: faithful (/1000) vs design-doc. Two moods: plain average vs weighted. I picked one canonical set.
(5) Room-impact mapping conflicts (price/40 vs 5 x RoomRating), as do several mess values. Unified.
(6) Dirt scale conflicts: 0-100 with "dirty" at 50 vs FreeSO's 800 threshold. Unified, using the verified chore-search rules.
(7) Rules missing entirely:
- children and school;
- babies, adoption and the social worker;
- marriage, moving in and the household cap;
- household creation;
- neighbourhood, lots and house prices;
- build-mode costs and refunds;
- how fire spreads;
- death, graves and ghosts;
- pools and drowning;
- visitors, walk-bys and greeting;
- the phone (the input was cut off mid-sentence there);
- the daily event schedule;
- burglars;
- when sleep ends and the alarm clock.
(8) Careers: five tracks had only rough pay endpoints. The off-lot work simulation was vague. FreeSO shows the per-level career record format and that motive decay is suspended while a Sim is off-lot (Hidden).
(9) Several minor numbers contradict each other: repair time, electrocution chance, fire chance, painting price, meal hunger, puddle value. Canonical picks are listed.

Every fill below names its basis. RECALLED and ESTIMATE items should be checked against the wiki URLs given (unreachable this session) before being called faithful. All names stay generic, for a Portuguese-language original game.


### Canonical time base, clocks and game speeds (resolves the 'tick' contradiction)

VERIFIED-CODE: FreeSO sets Clock.TicksPerMinute = 30 for TS1, commented '1 minute per irl second'. So at normal speed there are 30 VM ticks per real second, 1 sim-minute = 1 real second, 1 sim-hour = 1 real minute and 1 sim-day = 24 real minutes. The clock rolls 60 min, 24 h, 30-day months, 12 months.

Use three named rates:
(a) VM tick = 1/30 sim-minute. Behaviour trees, routing, animation and Set-Motive-Change accumulators run every tick (rate/1800 per tick).
(b) Decay step = every 2 sim-minutes (60 VM ticks), which is when VMTS1MotiveDecay runs. The motives research called this '30 ticks per sim-hour'. Call it 'decay step' instead.
(c) Sim-hour, the unit for every per-hour rate in this design.

Speeds (VERIFIED-CODE, Simitone): pause = 0x, speed 1 = 1x, speed 2 = 3x, speed 3 = 10x. The VM simply runs SpeedMultiplier ticks per base tick, and the tick alignment is reset when speed changes. Day/night (VERIFIED-CODE, commented in FreeSO VMClock.TimeOfDay): 06:00-17:59 is day for window light. Decay is skipped entirely while a Sim is Hidden, i.e. off-lot at work or school (VERIFIED-CODE). Build and buy modes pause the simulation (RECALLED). A new game starts at 08:00 on day 1 (ESTIMATE, matching Wright's prototype start clock of 08:00).

**Numbers:** 30 VM ticks per sim-minute (VERIFIED-CODE). Normal speed: 1 sim-min = 1 s real, 1 day = 24 real minutes. Speeds 0x/1x/3x/10x (VERIFIED-CODE, Simitone). Decay every 2 sim-min = 60 ticks. Motive-change per-tick delta = perHour/1800. Day 06:00-17:59. Month = 30 days. Start 08:00 (ESTIMATE).

**Implementation:** Main loop: acc += realDt*30*speedMul; while (acc >= 1 && budget--) { vmTick(); acc--; }. Cap at about 400 ticks per frame and drop the extra so 10x stays smooth. Call decayStep() when floor(simMinutes/2) changes and the Sim is not hidden. Pause the VM while buy/build mode is open. In 10x mode, throttle autonomy evaluation round-robin across Sims.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Screens/TS1GameScreen.cs


### Walking, running and swimming speed (routing timing)

Derived by me from FreeSO's routing code (VERIFIED-CODE). Each path segment needs TotalFrames = distance_in_1/16-tiles x 10 frames, i.e. 160 frames per tile. Each tick the Sim advances by Velocity frames. Velocity ramps up by 1 per tick to a maximum of 8 and ramps down when approaching the final waypoint or making sharp turns. Full walking speed is therefore 20 ticks per tile, which is 1.5 tiles per sim-minute (1.5 tiles per real second at 1x).

Auto-run: if the destination is more than 10 tiles away, WalkStyle switches to run and TotalFrames is divided by 3, giving about 4.5 tiles per sim-minute. Swimming Sims and pets have TotalFrames doubled (half speed). A route is retried up to 5 times (MAX_RETRIES), as the earlier research noted.

Distance metrics differ by subsystem:
- autonomy uses Euclidean tiles + 20 per floor;
- routing-frame helpers use + 10 per floor;
- object-function search uses + 30 per floor (see the chore-search entry).

**Numbers:** Walk: 20 ticks/tile at full speed, 1.5 tiles per sim-min. Acceleration: 8 ticks from 0 to full. Run: 3x faster (about 4.5 tiles/min) when target > 10 tiles. Swim and pets: 0.5x. A 15-tile walk takes about 10 sim-minutes walking or about 3.5 running.

**Implementation:** speedTilesPerTick = (1/20) * (velocity/8) * (running ? 3 : 1) * (swimming ? 0.5 : 1). Increment velocity by 1 per tick up to 8 and decrement it near the end of a path. Precompute A* on the tile grid. The ETA shown in debug = pathLen*20/(running ? 3 : 1) ticks.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/Routing/VMPathLineSegment.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs


### Canonical interaction gain-rate table (replaces the conflicting estimates)

The previous sections gave three incompatible rate sets. Use this single table (ESTIMATE, tuned against the VERIFIED decay constants). All rates are motive points per sim-hour on the -100..+100 scale, applied with Set Motive Change(rate, max), where max caps how far that object can fill the motive. Ratings are the 0-10 catalog ratings.
- Toilet: Bladder +75 x bladderRating (rating 8 gives 600/h, a full bar in 20 min, a typical 55-point trip in about 6 min). A deluxe toilet also gives Comfort +10 x comfortRating while seated.
- Shower: Hygiene +55 x rating (rating 6 gives 330/h, -100 to 100 in 36 min).
- Bathtub: Hygiene +40 x rating plus Comfort +10 x comfortRating (rating 6/3 gives 240+30; deluxe 10/8 gives 400+80).
- Sink 'wash hands': one-shot Hygiene +10 x rating, at most +40 per wash, 2 sim-min.
- Hot tub: Comfort +12 x rating, Fun +15 x rating, Hygiene +10 x rating, Social +30 if shared.
- Bed sleep: Energy +(3 x energyRating + 5) (rating 7 gives 26/h, rating 10 gives 35/h). In TS1-engine terms that is bedRate = value/22, because TS1 multiplies positive Energy rates by 22 (VERIFIED-CODE). Comfort while in bed: +6 x comfortRating, max 100.
- Sofa/recliner nap: Energy +2 x energyRating, max Energy 60. Floor collapse: Energy +11.
- Sitting: Comfort +(10 + 8 x comfortRating), max = min(100, 20 + 10 x comfortRating). A cheap chair (rating 2) gives +26/h capped at 40; a luxury sofa (rating 8) gives +74/h up to 100.
- Fun objects: Fun +(10 + 10 x funRating) x varyBy, max = min(100, 30 + 10 x funRating). varyBy = 0.5 + trait/1000 (0.5..1.5). A TV channel matching personality gives x1.5.
- Eating: each serving's Hunger value comes from the documented meal formula and is eaten over 20 sim-min (rate = 3 x serving per hour). Snack: 5 min.
- Prep times: snack 3 min, quick meal 15 min, full/group meal 45 min x (1 - 0.05 x Cooking).
- Talk: about +10 Social per 10-minute exchange (60/h). Phone chat: +40/h.
The sanity check below matches the objects research's design target that a deluxe house buys extra free hours.

**Numbers:** Daily time budget with 9 h of work, cheap house vs deluxe house:
- Sleep: 6.9 h vs 5.1 h.
- Toilet (4 trips): 0.4 h vs 0.4 h.
- Shower: 0.3 h vs 0.25 h.
- Two cooked meals: 2.2 h vs 1.4 h.
- Fun to offset about 52 points lost on the lot: 1.75 h (cheap TV, 30/h) vs 0.6 h (plasma, 90/h).
- Social: 1 h vs 1 h.
Free time is about 2.5 h for the cheap house and about 6.2 h for the deluxe house.
Deprecated, do not use: toilet 150 x rating, shower 25 x rating, toilet +200/h, shower +60/h, bed 22 x bedRate with an unspecified rate, Comfort 6 x rating while sitting, TV +20..40/h.

**Implementation:** Keep RATE = {bladderToilet:75, hygShower:55, hygTub:40, comfTub:10, sleepA:3, sleepB:5, napE:2, sitBase:10, sitK:8, sitCapBase:20, sitCapK:10, funBase:10, funK:10, funCapBase:30, funCapK:10} in a balance JSON. When an interaction starts, call sim.setMotiveChange(m, rate(obj), cap(obj)). Remember that passive decay of that motive is suspended while the change is active (VERIFIED-CODE), except Energy. Add a dev panel that simulates 24 h for a test household and prints this time budget.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMMotiveChange.cs, https://www.simechoes.org/simechoes1/info/moods.html


### Canonical autonomy curves and scoring mode (resolves Energy cutoff 40 vs 0, C(m) vs point tables, faithful vs design-doc)

Decision:
(1) Use the autonomy section's piecewise-linear point tables as the single curve set:
- Hunger cutoff 40, Energy 0, Bladder 30, Hygiene 40, Comfort 60, Social 70, Fun 90, Room 80;
- Mood linear with no cap;
- child variants as given there.
The motives section's closed-form C(m) with Energy cutoff 40 is deprecated. With Energy cutoff 0, Sims never choose sleep autonomously while the bar is at or above 50%, which matches FreeSO's note that the curves 'prevent people from considering sleeping at 50% energy' (VERIFIED-CODE comment).
(2) Scoring mode = faithful marginal (VERIFIED-CODE comment: 'Motive delta is divided by 1000 ... it matches numbers with TS 1.0'):
score = sum over ads of w_i x [C_i(m_i + amount_i/1000) - C_i(m_i)], then / (1 + atten x dist).
Effectively this is curve slope x ad size, and ads on flat (above-cutoff) segments score 0.
(3) Weights: 9 scored motives (Energy, Comfort, Hunger, Hygiene, Bladder, Mood, Room, Social, Fun), all w = 1/9, as in TS1.0 (VERIFIED-CODE: weights array all 1). Hot Date-style weight curves are an optional 'v2' flag.
(4) Thresholds: drop scores <= 1e-7, or <= 1e-6 if seated. Keep the top 4 and pick by weighted random. Attenuation: residents 0/0.1/0.3/0.6, visitors 0/0.01/0.02/0.03 (VERIFIED-CODE).
(5) Profile selection (VERIFIED-CODE): a visitor (PersonType = 1) uses the visitor attenuation table; a TS1 child uses the child interaction-score and happy-weight curves.
Design-doc (non-/1000) mode stays available as a debug toggle only.

**Numbers:** Ad divisor 1000. Min score 1e-7 standing, 1e-6 seated. Top-N = 4. Weights 1/9 each. Curves sampled to a 201-entry table per motive and per life stage.

**Implementation:** const MODE = 'faithful'; precompute CURVE[stage][motive] = Float32Array(201) and interpolate between integer samples for fractional inputs (m + amt/1000). Unit test: Hunger = 60 and snack ad 20 gives score 0; Hunger = -50 gives a positive score; Energy = 10 and bed ad 80 gives 0.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/TTAB.cs, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-find-best-action.md


### Canonical mood value and the thresholds that read it

Contradiction: the code's plain average vs the Prima guide's weighting. Decision for faithful TS1.0 behaviour: Mood (slot 3) = trunc((Hunger + Comfort + Hygiene + Bladder + Energy + Fun + Social + Room)/8), recomputed every decay step (VERIFIED-CODE). Note that Room is set every tick from the room score, before the early-out (VERIFIED-CODE). The Prima-style deficit-weighted mood becomes an optional 'Hot Date-style' setting that changes the same slot. Never show two different moods.

Every threshold that reads mood uses the same value:
- skill-building gate: mood < 0 refuses (DOCUMENTED qualitatively);
- promotion requires mood > 0 at carpool departure (DOCUMENTED);
- player-command refusal for non-need actions at mood < -60 (ESTIMATE);
- social acceptance term targetMood/4 (ESTIMATE).
Mood UI: up to 5 green or red bars, bars = min(5, ceil(|mood|/20)) (ESTIMATE, Prima describes up to 5 bars).

**Numbers:** Mood = sum8/8 (integer). Skill gate < 0. Promotion > 0 at departure. Refuse < -60. Bars = ceil(|mood|/20), max 5.

**Implementation:** computeMood(m) lives in exactly one place. A settings flag 'moodModel: "ts1" | "weighted"' switches between the plain and weighted formulas, and every gate calls computeMood.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://ia600104.us.archive.org/21/items/Tekken3PrimasOfficialStrategyGuide1998/The%20Sims%20-%20Unleashed%20(Prima's%20Official%20Strategy%20Guide%20-%202004).pdf


### Canonical RoomImpact table (resolves price/40 vs 5 x RoomRating and mess-value conflicts)

The room score formula is VERIFIED-CODE: clamp(sum(RoomImpact)/max(1, tiles/12) - 10, -100, 100) indoors; outdoors divide by 30 and subtract 15. Canonical per-object impacts (ESTIMATE):
- decor = 5 x RoomRating, where RoomRating is the object's 0-10 catalog Room value;
- objects with no designer rating get it from price: <=§100: 1, §250: 2, §500: 3, §1,000: 4, §2,000: 5, §3,500: 6, §5,000: 7, §7,500: 8, §10,000: 9, >=§12,000: 10. This anchors §12 = Room 1 and §12,648 = Room 10 from the catalog.
Light: lit lamp +10 each (room cap +30); window in daytime (06:00-17:59) +5 each; dark room at night with no lit lamp -20.
Mess (single canonical values):
- dirty plate -5; spoiled plate -15;
- puddle -15 (the -10 alternative is deprecated);
- trash pile -20; overflowing can -15;
- ash pile -20;
- dead plant -15; dead fish -15;
- broken object -10;
- dirty plumbing (DirtyLevel >= 500) -5;
- unmade bed -5;
- fly swarm -10; each roach -5.
The 'price/40' rule is deprecated.

**Numbers:** Formula VERIFIED-CODE. Example: a 12-tile bedroom with 2 lit lamps (+20), a Room-6 painting (+30) and 1 window by day (+5) gives 55 - 10 = +45. A 24-tile living room with the same objects gives 55/2 - 10 = +17.

**Implementation:** Each object has roomImpact(state, hour). Each room keeps impactSum, updated incrementally when objects change state. Each tick, sim.room = roomScore(roomAt(sim)). Show the per-room breakdown in a debug overlay.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMContext.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs


### Chore and helper-object search (Find Best Object For Function) and the dirt/wear scale

VERIFIED-CODE (FreeSO). Multi-step behaviours such as cooking, cleaning and repairing don't use Find Best Action for their sub-steps. They call 'find best object for function' with one of these functions:
- prepare food, cook food, flat surface, dispose, eat, pick up from slot, wash dish, eating surface, sit, stand, serving surface;
- clean (scored by DirtyLevel), gardening (GardeningValue), wash hands, repair (RepairState).
Each object exposes a numeric suitability value per function: PrepValue, CookValue, SurfaceValue, DisposeValue, WashDishValue, EatingSurfaceValue, ServingSurfaceValue, WashHandsValue.
Rules:
- skip objects with LockoutCount > 0, disabled or out of world, value <= 0, or value below threshold;
- thresholds: DirtyLevel 800, RepairState 600, GardeningValue 15;
- surface functions with no check tree require slot 0 to be empty;
- skip objects in use (checked last);
- score = value - distance/3, with distance in 1/16-tile units, so about 5.3 points per tile and floors counted as 30 tiles;
- the highest score wins.
This resolves the dirt-scale conflict: use DirtyLevel and RepairState on a 0..1000 scale (ESTIMATE for everything except the 800/600 thresholds).

**Numbers:** Thresholds (VERIFIED-CODE): clean >= 800, repair >= 600, water plant >= 15. Distance penalty 16/3 ≈ 5.33 points per tile; +30 tiles per floor.
Proposed accumulation (ESTIMATE): toilet +100 DirtyLevel per use, shower or tub +60, stove +80 per cooked meal, counter +40 per prep. A plumbing object visibly 'dirty' at >= 500 (RoomImpact -5, Hygiene gain x0.8). Neat Sims (>= 7) clean autonomously from 500 instead of 800.
Prep values (ESTIMATE): counter 50, food processor 100. Cook values: cheap stove 50, gas range 70, microwave 20.

**Implementation:** findBestObjectForFunction(sim, fn): filter objects by fn.valueKey > 0 && >= threshold && !inUse && check(); then maximize value - dist16/3. Cooking flow: fridge, then fn 'prepare', then fn 'cook', then fn 'serving surface' to place the platter.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestObjectForFunction.cs


### Sleep: when it starts and ends, and the alarm clock

VERIFIED-CODE wake rule: at each decay step, if the Sim is asleep, the clock hour is 7 and Energy >= 80 (energy span 180 - 100), set SleepState = 0 (wake). While asleep, Energy has no passive drain before 07:00 and a 0.01 per step drift after. A special SleepState of -1 restores +1.286 per step (about 38.6/h); its meaning is unknown, but it could serve as a 'deep/forced sleep' state.
The bed interaction itself ends when Energy reaches the bed's motive-change max of 100 (ESTIMATE, the standard Set Motive Change pattern), or when interrupted.
Wake triggers (ESTIMATE unless noted):
- the alarm clock rings 2 h before the earliest household shift, i.e. 1 h before the carpool (RECALLED, TS1 alarm behaviour); it wakes Sims in its room;
- Bladder <= -80 or Hunger <= -80;
- fire, burglar alarm, ghost scare, or a crying baby in the same room.
Autonomous sleep never starts while Energy >= 0 (canonical curve cutoff). A player-ordered sleep is refused with a 'not tired' gesture if Energy >= 80 (RECALLED behaviour, ESTIMATE threshold).

**Numbers:** Auto-wake: hour 7 with Energy >= 80 (VERIFIED-CODE). Asleep drain: 0 before 07:00, +0.3/h drift after. Alarm: shiftStart - 2 h (RECALLED). Alarm clock price §30 (ESTIMATE). Player sleep refused at Energy >= 80 (ESTIMATE).

**Implementation:** sleepInteraction generator: setMotiveChange('energy', bedRate, 100); loop until energy >= 100 || sleepState == 0 || notified || alarmRang. The decay step implements the 07:00 rule by clearing sleepState, which the loop sees.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs


### Children: capabilities and school (grades, bus, rewards, removal)

VERIFIED-CODE:
- a Sim with PersonsAge < 18 is a child;
- children use separate interaction-score and happy-weight curves;
- the TS1NoChild flag hides interactions from children and TS1NoAdult hides them from adults;
- TS1 passive decay has no age branch, so children decay exactly like adults.
RECALLED (TS1):
- children never age;
- children cannot gain skills, cook on stoves, pay bills, repair, or work;
- they go to school every day (TS1 has no weekends);
- the school bus arrives at 08:00 and the child returns at 15:00;
- the report-card grade runs F, D, C, B, A, A+;
- reaching A+ triggers a cash gift letter from the grandparents;
- a child who stays at F after a warning is sent away to military/boarding school and permanently leaves the household;
- grades improve by going to school in a good mood and by 'Study' at a bookshelf or computer.
The exact gift amount and how fast grades move are not known, so those are ESTIMATE. Design it as a career with 6 levels and no pay. TS1 stores jobs as CARR records with hours, requirements and motive deltas (VERIFIED-CODE format), so a 'school track' fits the same data model (ESTIMATE that TS1 did it this way).

**Numbers:** Bus 08:00, school 09:00-15:00 (RECALLED). Grade performance gp in -100..100 (ESTIMATE). Bands: <= -60 F, <= -20 D, < 20 C, < 60 B, < 90 A, >= 90 A+.
Daily update on return (ESTIMATE): gp += round(moodAtBus/5) + min(30, 10 x studyHoursSinceLastSchool). Missing the bus: gp -= 25.
A+ first reached: grandparents' gift §100 (amount ESTIMATE).
F: warning letter. Still F at 2 more report cards: the child leaves.
Study at bookshelf/computer gives Fun -6/h (ESTIMATE). Child motive drain at school per hour (ESTIMATE): Hunger -5, Energy -4, Hygiene -3, Fun -3, Social +2.

**Implementation:** school = {id:'escola', pay:0, start:9, end:15, busAt:8, levels:['F','D','C','B','A','A+']}. Reuse the carpool/resolveWorkday code with gp in place of job perf. Hide the child while away, so decay pauses as in the original. Then apply hours x schoolDeltas on return.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/CARR.cs, https://sims.fandom.com/wiki/School


### Babies: conception prompt, adoption, bassinet care, social worker and growing up

RECALLED (TS1 base):
- there is no pregnancy;
- after a successful romantic social (kiss/hug) between two adult housemates with a high relationship, a 'have a baby?' dialog may appear;
- answering yes spawns a bassinet with a newborn, who is named immediately;
- the phone offers adoption, and a social worker brings the baby;
- babies stay in the bassinet and need adults to Feed (bottle), Play and Sing/Rock;
- a neglected baby is taken away permanently by the social worker (TS1's social worker only takes babies, DOCUMENTED);
- after 3 days (72 sim-hours) the baby becomes a child.
VERIFIED-CODE:
- creating a new character picks a random head and body for the given skin tone (light, medium or dark) and age bucket;
- personality defaults to 500 per trait, with a 'todo: randomize' comment;
- a household cannot exceed 8 members (AddToFamily fails at 8).

**Numbers:** ESTIMATE unless noted.
Prompt: 15% chance after a successful Kiss/Hug when both are adults and housemates, Daily >= 70 both ways (or the Love flag in the dual-score model), household < 8, and no baby already present.
Growth: 72 sim-hours (RECALLED).
Baby needs (hidden): Hunger decays 10/h, Attention 8/h; the baby sleeps automatically about 12 h of every 24. Cries when Hunger < -20 or Attention < -40.
Crying effects: adults in the same room get Energy -5/h and Fun -5/h, and sleeping adults in the room wake.
Feed: 10 min, baby Hunger +60, bottle costs §5. Play: 15 min, Attention +40, caregiver Fun +10. Sing: 10 min, Attention +20, starts baby sleep.
Social worker: arrives within 1 h if baby Hunger <= -100 or the baby cries unattended for 6 continuous sim-hours. The baby is removed permanently.
Adoption: phone, single adults allowed, baby delivered within 24 h, fee §0.
Grown child's personality: average of the parents ±2 points, renormalized to 25 total; adopted children are random.
Max household 8 (VERIFIED-CODE).

**Implementation:** The baby is an entity inside the bassinet object with its own tiny motive set and a crying state. Its 'Alimentar/Brincar/Cantar' interactions advertise Social and Fun to adults so Nice/Playful caregivers volunteer. A growth timer at birthTick + 72*60*30 ticks swaps the baby for a child generated with makeNewCharacter(skinTone, age=child).

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMTS1MakeNewCharacter.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMGenericTS1Call.cs, https://sims.fandom.com/wiki/Social_worker, https://sims.fandom.com/wiki/Baby


### Marriage, moving in, leaving, and the household cap

VERIFIED-CODE (FreeSO TS1 generic calls):
- AddToFamily fails when the family already has 8 members;
- adding a neighbour removes them from their old family, and an empty family is deleted;
- CombineAssetsOfFamilyInTemp0 runs when someone moves in: Budget += otherFamily.Budget + otherFamily.ValueInArch, so the newcomer brings their household's cash plus the value of their home's architecture;
- RemoveFromFamily sets their family number to 0, and an empty family is deleted.
RECALLED (TS1): an adult can Propose to a visiting adult with a very high relationship. On acceptance the visitor moves into the proposer's lot (no wedding event) and becomes a spouse. A separate 'ask to move in' (roommate) exists. The relationship thresholds are ESTIMATE.

**Numbers:** Max household 8 (VERIFIED-CODE). Money on move-in = newcomerFamily.Budget + ValueInArch (VERIFIED-CODE).
Propose (ESTIMATE): both adults, not housemates, on the proposer's home lot, Daily >= 80 both ways or the Love flag; uses the acceptance formula with threshold 70.
Move in as roommate (ESTIMATE): Daily >= 70 both ways, threshold 60.
Refusal: Daily -10 toward the proposer, Social -15.
Spouse effects (ESTIMATE): shared-bed sleep allowed; a 'spouse' label in the relationship panel.

**Implementation:** moveIn(target): if (household.length >= 8) return fail; budget += target.family.budget + target.family.valueInArch; remove target from its old family (delete the family if empty); add to the household; set the relationship flag 'spouse' or 'roommate'.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMGenericTS1Call.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/FAMI.cs, https://sims.fandom.com/wiki/Marriage


### Household creation rules (Create-a-Sim)

Rules:
- 1 to 8 Sims per household (cap VERIFIED-CODE);
- life stages adult or child (child = age < 18, VERIFIED-CODE);
- gender male or female;
- 3 skin tones, light/medium/dark (VERIFIED-CODE asset buckets 'lgt/med/drk'), with head and body chosen from catalogs filtered by tone and stage;
- personality: 5 traits, 0-10 each, 25 points total (DOCUMENTED), stored as 0-1000;
- a derived star sign with no gameplay effect (DOCUMENTED);
- name and biography.
A household needs at least one adult (RECALLED). Starting funds are §20,000 per household regardless of size (DOCUMENTED in the careers research). The family then buys a lot or house from those funds (see the neighbourhood entry).

**Numbers:** Household 1-8 (VERIFIED-CODE). Personality 25 points (DOCUMENTED). Starting funds §20,000 (DOCUMENTED). At least 1 adult (RECALLED). Skin tones 3.

**Implementation:** The CAS screen validates sum(traits) <= 25 and has at least one adult. Store traits x100. Use an original archetype or sign table derived from the nearest personality vector, not the TS1 sign mapping.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMTS1MakeNewCharacter.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMGenericTS1Call.cs, https://sims.fandom.com/wiki/CAS


### Neighbourhood, lot purchase, moving out and the budget ledger

VERIFIED-CODE:
- each lot record stores LotValue, ObjectsValue and ArchitectureValue;
- house purchase price = LotValue + ObjectsValue + 70% x ArchitectureValue (built structure is sold at a 30% discount);
- moving in subtracts that price from the family budget;
- evicting or moving out adds the family's ValueInArch back to its budget;
- the lot record also keeps a 6-day budget history with the categories MiscIncome, JobIncome, ServiceExpense, FoodExpense, BillsExpense, MiscExpense, HouseholdExpense and ArchitectureExpense (Maxis's own comment says the budget window 'never actually came of much use').
RECALLED: the original neighbourhood had 10 residential lots, a mix of empty lots and pre-built houses. Lot prices are not known here (ESTIMATE).

**Numbers:** Purchase = Lot + Objects + 0.7 x Architecture (VERIFIED-CODE). Budget history 6 days (VERIFIED-CODE). 10 lots (RECALLED).
Lot values (ESTIMATE): small (about 20x20 buildable) §4,000; medium (about 30x30) §6,500; large (about 40x40) §9,000.
Pre-built starter house (ESTIMATE): §12,000-§18,000, so a new family keeps §2,000-§8,000.

**Implementation:** lot = {value, objects[], arch:{walls, floors, ...}}. price() = lot.value + sum(obj.currentValue) + 0.7*archValue(). archValue = sum over floor tiles, wall segments and patterns of current catalog prices, as in FreeSO GetArchValue. Keep a ring buffer of 6 daily budget records for a 'Finanças' panel.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/SIMI.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/TS1/TS1NeighbourProvider.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Screens/TS1GameScreen.cs, https://github.com/riperiperi/Simitone/blob/master/Client/Simitone/Simitone.Client/UI/Panels/UIHouseSelectPanel.cs


### Build mode costs and refunds

VERIFIED-CODE (FreeSO architecture command handler, shared engine):
- drawing walls costs (new segments) x (wall style price);
- erasing walls refunds a flat §7 per segment;
- painting a wall side or laying floor first refunds 80% of the pattern being replaced (cost - cost/5), then charges the new pattern's price;
- floors are counted in half-tiles, so price x halves/2;
- raising, lowering or flattening terrain costs §1 per height unit changed;
- painting grass costs §1 per dot;
- architecture value sums floor tiles, wall styles and wallpaper per side, and counts at 70% in house price.
Catalog prices are game data, so they are RECALLED or ESTIMATE. A §10 basic wall is consistent with the hard-coded §7 (70%) refund.

**Numbers:** VERIFIED-CODE rules: wall erase refund §7 per segment; pattern/floor replacement refunds 80% of the old price; terrain §1 per step; grass §1 per dot.
Prices (RECALLED/ESTIMATE):
- basic wall §10/segment (RECALLED); fences §10-§45/segment;
- wallpaper §2-§25 per wall side; floor §2-§30 per tile;
- doors §100-§600; windows §50-§800;
- staircase §900 (RECALLED);
- pool water §60/tile, pool ladder §100, diving board §200;
- flowers §5-§20, shrubs §30-§80, trees §60-§400.
Build/buy mode pauses time (RECALLED).

**Implementation:** Mirror the FreeSO cost function: cost = sum(newWalls)*style.price - 7*erased + sum(newPatterns*price) - 0.8*sum(replacedPatterns*price) + terrainSteps + grassDots. Show a live running total while dragging, and refuse if budget < cost.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMArchitecture.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Utils/VMArchitectureStats.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/WorldWallProvider.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/WorldFloorProvider.cs


### Fire ignition and spread

VERIFIED-CODE (FreeSO Burn primitive, TS1 path):
- Ignition: the first fire is placed on the stack object's tile or the tile in front of it, e.g. the stove front.
- Spread chance: a global FirePercent starts at 20000 on a 0..10000 roll scale (200%), so early spreads always succeed. Each successful spread lowers it by 500. It recovers by 1 per VM tick (30 per sim-minute), so it is fully restored after about 11 sim-hours without fire.
- What burns: a spread attempt flood-fills through objects on the same floor that have the 'Burns' flag and lack 'FireProof'. Every tile of a multi-tile object burns. Objects in use and ghosts are skipped.
- Pool rooms can never burn.
Ignition chance comes from cooking skill (DOCUMENTED: 15% / 5% / 1% at skill 0/1/2, about 0 at 3+). A smoke detector in the same room auto-calls firefighters (DOCUMENTED). Fire can kill Sims (DOCUMENTED). Fire duration, extinguishing and death timing are ESTIMATE.

**Numbers:** FirePercent: start 20000/10000, -500 per spread, +1 per tick (VERIFIED-CODE). The 20 spreads after the first are guaranteed, then the chance falls 5% per spread to 0 after 40.
ESTIMATE: spread attempt every 2 sim-min per burning tile. Each fire tile burns 60 sim-min, then the object becomes ash (RoomImpact -20) and is destroyed. Firefighters arrive 15 sim-min after the alarm or call and extinguish 1 tile per 2 sim-min.
Sim on or adjacent to a fire tile: 2%/sim-min chance to catch fire. A burning Sim dies after 10 sim-min unless firefighters arrive. Panicking Sims don't use the phone unless the player orders it.

**Implementation:** fireTick(): for each fire tile on its spread timer, if (rng(10000) < firePercent) { firePercent -= 500; floodFillBurnables(tile) }. Each VM tick: firePercent = min(20000, firePercent + 1). Burnable flag on object defs. Skip rooms marked pool.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMBurn.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/VMClock.cs, https://modthesims.info/t/422773, https://sims.fandom.com/wiki/Smoke_detector


### Death, graves, ghosts and grief

Causes in the base game: starvation, fire, drowning, and electrocution while repairing (DOCUMENTED and RECALLED).
On death:
- a death sequence runs (use original visuals, no reaper likeness);
- the Sim leaves the household (VERIFIED-CODE RemoveFromFamily semantics);
- a tombstone appears where the Sim died if outdoors, or an urn if indoors (RECALLED).
Ghosts:
- the engine has an IsGhost flag and a DeathTicker 'how long the sim has been dead' variable (VERIFIED-CODE);
- ghosts are exempt from catching fire (VERIFIED-CODE);
- RECALLED: ghosts rise from graves at night and wander the lot, scaring living Sims and waking sleepers.
Grief: family and friends mourn (RECALLED). Effects ESTIMATE.

**Numbers:** ESTIMATE unless noted.
Hunger death: 18 continuous sim-hours at -100 (DOCUMENTED, unconfirmed).
Grave: tombstone or urn object, Room +0, 'Lamentar' interaction.
Ghost appearance: each night, 25% chance per grave at a random time 22:00-04:00, for 60-120 sim-min.
Scare: target Comfort -20, Energy -10, Fun -10, wakes them, 30-min immunity.
Grief: housemates and friends with Daily >= 30 toward the deceased get 'luto' for 3 days: Fun decay x1.5, social acceptance -10, and 'Lamentar' at the grave gives Social +10/h.
Selling a grave removes the ghost permanently.
Electrocution: deathOnElectrocution option, default off; if on, 10% of electrocutions are fatal.

**Implementation:** killSim(cause): spawn grave(indoor ? 'urna' : 'lápide') on the death tile with ghostColorByCause; remove the Sim from the household and the active list but keep its relationships for grief. Night scheduler: rollGhosts(). The ghost is an NPC with no motives and a scare interaction.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Model/VMPersonDataVariable.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/NetPlay/Model/VMNetAvatarPersistState.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMBurn.cs, https://simscommunity.info/2026/07/22/the-sims-1-deaths/, https://sims.fandom.com/wiki/Starvation


### Pool, swimming and drowning

VERIFIED-CODE:
- pool rooms are flagged IsPool;
- swimming Sims (and pets) move at half speed;
- fire never spreads into pool rooms.
RECALLED (TS1):
- pools are built with water tiles and need a ladder to get out (a diving board is optional);
- swimming gives Fun and raises Body skill and costs Energy;
- a Sim who cannot leave the pool because there is no ladder keeps swimming until exhausted and drowns.
Body skill rate is from the careers research's ESTIMATE.

**Numbers:** ESTIMATE: Swim: Fun +40/h (x varyBy Active), Body +50 internal points/h, Energy -15/h, Hygiene +5/h. Dive: Fun +10 once.
Drowning: swimming with no reachable ladder and Energy <= -100. Tired Sims (Energy < -60) with a ladder exit autonomously.
Prices: see the build entry.

**Implementation:** poolRoom = room.isPool. Swimming state: halve routing speed. Exit requires routing to a ladder slot. If none is reachable, the 'swim' loop cannot end except by drowning, killSim('afogamento').

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMRoutingFrame.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMBurn.cs, https://sims.fandom.com/wiki/Swimming_pool


### Visitors, walk-bys and greeting

VERIFIED-CODE:
- the neighbourhood neighbour table (NBRS) stores every neighbour's person data and relationships; TS1 uses it 'to find and spawn suitable sims on ped portals as visitors, and also drive phone calls';
- a Sim with PersonType = 1 and GreetStatus < 2 (not yet greeted or invited in) may only use interactions flagged AllowVisitors;
- after greeting (GreetStatus >= 2) normal permissions apply;
- visitors always use the weak visitor attenuation table (0.01-0.03 per tile), so they roam the whole lot;
- stray pets (PersonType 1, GreetStatus 0) only consider Sims outdoors.
RECALLED: neighbours walk past on the sidewalk during the day; talking to one (greeting) brings them onto the lot as a guest; guests leave when their needs get low, when it gets late, or when asked to leave. Schedules are ESTIMATE.

**Numbers:** ESTIMATE:
- walk-by spawn attempt every 60 sim-min, 08:00-20:00, 50% chance;
- a walk-by lingers 20 sim-min on the sidewalk unless greeted, then leaves;
- after greeting, GreetStatus = 2;
- guests leave when any of Hunger/Energy/Bladder/Fun < -50, at 01:00, or when asked ('Pedir para sair', relationship -2 if Daily < 20);
- max 8 non-household Sims on the lot;
- first meeting adds the neighbour's number to the household phone book.

**Implementation:** Keep a neighbourhood table of NPC records (motives snapshot, traits, skills, relationships). Spawner picks a neighbour not on the lot, weighting known neighbours x2. On greet, set greetStatus = 2 and add to phoneBook. Autonomy profile for visitors: {attenTable: visitor, filter: greetStatus < 2 ? allowVisitors : all}.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/NBRS.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Engine/VMThread.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestAction.cs


### Phone: calls, invitations, services and call etiquette (completes the truncated section)

DOCUMENTED:
- the number is learned after meeting a Sim;
- a successful chat restores more than one day's relationship decay;
- services: maid §10/h, gardener §10/h (every 3 days, minimum §10), repairman §50/h;
- emergency calls (fire, police) are free.
RECALLED:
- calls placed very late or very early annoy the recipient and fail;
- invited guests arrive after a delay;
- pizza can be ordered;
- adoption and job hunting are separate (job hunting is newspaper/computer).
Numbers ESTIMATE.

**Numbers:** ESTIMATE:
- Call hours: OK 08:00-22:00. Outside them the call fails and target Daily toward the caller -5.
- Chat: 15-30 sim-min. Success chance = clamp(0.5 + Daily/200 + (callerCharisma-5)x0.02, 0.1, 0.95). Success: Daily +4 both ways, Social +40/h for the caller. Fail: Daily -3, Social -5.
- Invite over: accept chance 0.4 + Daily/150; guest arrives in 30-90 sim-min; not accepted 22:00-08:00.
- Pizza: §40, 8 slices of 33 Hunger, delivered in 45 sim-min.
- Repairman arrives in 30 min; maid and gardener arrive at 09:00 on their days.
- Fire and police: free.
- Adoption: baby delivered in 24 h.

**Implementation:** The phone object exposes a pie menu built from phoneBook plus services. Each call is an interaction holding the caller at the phone (Social motive change active, so Social decay pauses) and resolving on the remote NPC record without spawning them.

Sources: https://sims.fandom.com/wiki/Service, https://sims.fandom.com/wiki/Relationship, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/NBRS.cs


### Daily event schedule (consolidated timeline)

One table for every scheduled event, so the scheduler can be built in one pass.
DOCUMENTED:
- 00:00 computer job offers refresh (3);
- 07:00 red-bill repo warning;
- 16:00 relationship decay (-2 Daily for non-residents; residents -2 Daily and +1 Lifetime);
- 18:00 the day after the warning, the repo man comes;
- carpool at shiftStart - 1 h;
- bills every 3 days; gardener every 3 days.
RECALLED: newspaper each morning carrying 1 job offer; school bus 08:00 and return 15:00; alarm at shiftStart - 2 h.
ESTIMATE: exact newspaper, mail and maid times.

**Numbers:** ESTIMATE times:
- 07:00 newspaper delivered; an unread paper becomes trash after 2 days.
- 08:00 school bus (RECALLED).
- 09:00 maid (daily, about 2 h) and gardener (every 3 days).
- 10:00 mail carrier (bills on bill days).
- 15:00 children return (RECALLED).
- 16:00 relationship decay (DOCUMENTED).
- 00:00 job offers (DOCUMENTED); 00:00 depreciation step (DOCUMENTED: at midnight).
- 07:00 wake rule (VERIFIED-CODE).
- 22:00-04:00 ghost window; 00:00-05:00 burglar window.

**Implementation:** An EventScheduler with cron-like entries {hour, minute, everyNDays, handler}, evaluated on sim-minute rollover. Run all handlers deterministically in fixed order so saves and replays are reproducible.

Sources: https://sims.fandom.com/wiki/Bill, https://sims.fandom.com/wiki/Career, https://sims.fandom.com/wiki/Relationship, https://sims.fandom.com/wiki/Depreciation, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs


### Burglar, burglar alarm and police

DOCUMENTED:
- the burglar alarm (§250) covers the room it is placed in and calls the police when a burglar is detected there;
- a burglar steals objects at night (DOCUMENTED in moollm's design notes and the objects research).
The exact spawn rules are not known, so this is ESTIMATE.

**Numbers:** ESTIMATE:
- Each night, one roll at a random time 00:00-05:00. Chance 8%, plus 4% per §10,000 of household object value, capped at 20%.
- The burglar enters through the front door and targets the highest current-value object that can be carried (footprint 1x1, not built-in, not in use).
- Stealing takes 5 sim-min.
- If an alarm is in the room the burglar enters or steals from: alarm sound wakes Sims in range; police arrive in 5 sim-min; catch chance 70%, and if caught the object is restored.
- Uncaught: object removed, household loses its current value.
- Sims who witness it: Mood flag 'assustado' (Comfort -20) for 6 h.

**Implementation:** The burglar is a scripted NPC with a fixed behaviour tree (enter, path to target, steal, exit), not autonomy-driven, like other service NPCs.

Sources: https://sims.fandom.com/wiki/Burglar_alarm, https://github.com/SimHacker/moollm/blob/main/designs/sims/sims-services-economy.md


### Career level record and off-lot work simulation (resolves prototype vs per-hour drain)

VERIFIED-CODE (FreeSO CARR reader for TS1 work.iff). Each career track is a named record with N levels (the job data exposes number of levels). Each level stores:
- MinRequired[10]: friends first, then skill minimums (cooking, mechanical, charisma, body, logic, creativity, plus spare slots);
- MotiveDelta[7]: per-motive effects applied for the work shift;
- Salary, StartTime, EndTime and CarType (the cosmetic carpool vehicle);
- job title, male/female uniform meshes and uniform skin.
TS1 motive decay is skipped while the Sim is Hidden off-lot (VERIFIED-CODE). So the shipped game does NOT run hourly decay at work; the level's MotiveDelta values are what change motives for the shift.
The order of the 7 deltas probably matches the decay order (Hunger, Comfort, Hygiene, Bladder, Energy, Fun, Social), and their unit is probably per hour (both ESTIMATE). The prototype's 'set to fixed values on return' rule is deprecated in favour of this.

**Numbers:** Level record (VERIFIED-CODE): friends + skills[≤9] + 7 motive deltas + salary + start/end hour + car type.
Default deltas per hour at work (ESTIMATE): Hunger -5, Comfort -2, Hygiene -4, Bladder 0 (restrooms at work; on return Bladder = max(Bladder, 20)), Energy -5, Fun -4, Social +1.
Per-track multipliers (ESTIMATE): physical tracks (military, police, athlete, extreme) Energy and Hygiene x1.5; office tracks (business, politics) Fun x1.3; science Comfort x0.8; entertainment Social +1.
Apply shiftHours x delta at return, clamped to -100..100.

**Implementation:** careers.json level entries: {titlePt, pay, start, end, req:{friends, cooking, mechanical, charisma, body, logic, creativity}, workDelta:[h, c, hy, b, e, f, s], car}. While at work set sim.hidden = true (decay skips) and on return apply workDelta x hours. The same structure serves the school track.

Sources: https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/CARR.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.content/TS1/TS1JobProvider.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs


### Remaining career tracks: Medicine, Entertainment, Crime, Pro Athlete, Extreme (pay ladders + requirement generator)

The research had only pay endpoints for these five tracks. The full 10-level pay ladders below are RECALLED from TS1. They match the earlier endpoints exactly, but the intermediate values are not re-verified. Skill and friend requirements and hours are not reliably known, so I give a generator (ESTIMATE) that follows the documented patterns of Business, Science and Military: the top level needs about 8-10 in the primary skill, friends start around level 4, and tracks with low early pay have high top pay. Use original Portuguese titles; generic role descriptions are given for reference only.

**Numbers:** Pay L1 to L10 (RECALLED):
- Medicine: 200, 275, 340, 410, 480, 550, 625, 700, 775, 850 (technician to chief of staff).
- Entertainment: 100, 150, 200, 275, 375, 500, 650, 900, 1100, 1400 (waiter to superstar).
- Crime: 140, 200, 275, 350, 425, 530, 640, 760, 900, 1100 (pickpocket to mastermind).
- Pro Athlete: 110, 170, 230, 300, 385, 510, 680, 850, 1000, 1300 (mascot to hall-of-famer).
- Extreme: 175, 250, 325, 400, 475, 550, 625, 725, 825, 925 (daredevil to spy).
Skill focus (ESTIMATE; primary, secondary, tertiary): Medicine logic, mechanical, charisma (+body 2 from L6); Entertainment charisma, creativity, body; Crime creativity, mechanical, charisma (+logic from L6); Athlete body, charisma, (none); Extreme body, charisma, mechanical (+logic, creativity from L7).
Generator for L >= 3 (ESTIMATE): primary = round(10x(L-2)/8); secondary = round(0.6 x primary); tertiary = round(0.3 x primary).
Friends = round(Ftop x ((L-3)/7)^1.3) for L >= 4. Ftop: Medicine 7, Entertainment 15, Crime 9, Athlete 10, Extreme 10. Documented for reference: Business 14, Science 10, Military 8, Politics 17.
Hours (ESTIMATE): Medicine L1-2 23-05 then 9-16/10-16; Entertainment 9-15, rising to 10-17 and top 10-17; Crime L1-4 21-03, L5-9 17-23, L10 18-24; Athlete 9-15 to 12-18 to 13-19; Extreme 9-15 to 10-16 (L9-10 11-17).

**Implementation:** Generate the five tracks with genTrack({pay[], focus[], Ftop, hours[]}) into careers.json at build time, then hand-tune. Show requirements in the career panel. Night-shift tracks interact with the 07:00 wake rule and the alarm, which is an intended source of difficulty.

Sources: https://www.teoalida.com/thesims/the-sims-1-career-tracks/, https://thesims.neoseeker.com/wiki/The_Sims_-_Jobs, https://sims.fandom.com/wiki/Career, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.files/Formats/IFF/Chunks/CARR.cs


### Resolved minor contradictions (canonical picks)

Single values where earlier sections disagreed:
(1) Meal hunger: use the DOCUMENTED meal formula (base + fridge + prep + cook + 1.5 x Cooking). Drop the 'applianceBase + 4 x cooking' estimate.
(2) Cooking fire chance: DOCUMENTED 15% / 5% / 1% / 0 at Cooking 0 / 1 / 2 / 3+. Drop 0.20 x (3 - c)/3.
(3) Repair time: 120/(1 + Mechanical) sim-min (2 h at 0, about 11 min at 10). Drop the linear 120 x (1 - 0.08 x m).
(4) Electrocution chance on electronics repair: max(0, 0.30 - 0.04 x Mechanical), which is 0 from Mechanical 8.
(5) Painting sale price: §(10 + 3 x Creativity²): C0 §10, C5 §85, C10 §310. Drop §5 x C² and 10 + 25 x C.
(6) Puddle RoomImpact -15.
(7) Bladder accident: reset Bladder to 90 (prototype value), Hygiene = min(Hygiene - 40, -50), spawn a puddle.
(8) Starvation: 18 continuous sim-hours at -100 (DOCUMENTED, unconfirmed); no prototype-style reset.
(9) Dirt and wear use a 0-1000 scale with the verified 800/600 search thresholds.
(10) Comfort decay bands: Active >= 7 points gives 0.4 per step, <= 3 gives 0.6, otherwise 0.5. FreeSO's '666' boundary is a porting quirk.
(11) Social decay: use the float formula 0.055 + 0.000125 x Outgoing(0..1000) per step. FreeSO's fixed-point version truncates the multiplier to 0 (VERIFIED-CODE: ToFixed1000(0.000125) = 0).

**Numbers:** Fire 15/5/1/0%. Repair 120/(1+m) min. Shock 30% - 4%/point. Painting 10 + 3C². Puddle -15. Accident: Bladder 90, Hygiene <= -50. Starvation 18 h. Dirt 0-1000 (clean >= 800, repair >= 600). Comfort bands 7/3. Social decay float.

**Implementation:** Put these in the same balance JSON as the rate table, with a 'source' field per constant (VERIFIED/DOCUMENTED/RECALLED/ESTIMATE) so later tuning knows which values are free to change.

Sources: https://www.simechoes.org/simechoes1/info/moods.html, https://modthesims.info/t/422773, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Entities/VMTS1MotiveDecay.cs, https://github.com/riperiperi/FreeSO/blob/master/TSOClient/tso.simantics/Primitives/VMFindBestObjectForFunction.cs, https://github.com/alexcu/motive-simulator/blob/master/original.pdf, https://sims.fandom.com/wiki/Starvation
