# Morada — game design decisions (v1)

Read together with ARCHITECTURE.md (code contract) and RESEARCH.md (300 KB of researched mechanics;
section titles are `###` headings — grep them). When RESEARCH.md has a "Canonical ..." section in
"GAP FILLS", that section wins over earlier conflicting numbers.

Everything player-facing is in Brazilian Portuguese. Characters are called "moradores" in UI text.
No third-party names/trademarks anywhere (see ARCHITECTURE.md).

## Time
- 1 sim-minute = 1 real second at speed 1. Speeds: pause, 1×, 3×, 10× (`M.main` factors 0/1/3/10).
  When all household members are asleep or at work, 10× becomes 30×.
- Day/night: daylight 06:00–17:59 with dawn/dusk transitions 05:00–07:00 and 17:00–19:00.
- New game starts day 1 (Segunda), 08:00.
- Buy and Build modes PAUSE the simulation (time does not advance while they are open).

## Motives (8) — faithful decay (RESEARCH.md "Hunger passive decay", "Bladder…", "Energy…", etc.)
- Range −100..100, start 60..100. Decay applied continuously (rate per sim-hour × dt) — no need for
  2-minute steps, but use the per-hour rates from research:
  - Fome: −0.063 × (100 + hunger) per hour (proportional).
  - Energia: −11.25/h awake; asleep: no drain, restored by bed.
  - Bexiga: −9/h awake, −4.5/h asleep, plus 0.3 × the hunger decrement.
  - Higiene: −5.1/h awake, −2.4/h asleep.
  - Diversão: −7.5/h awake, 0 asleep.
  - Social: −1.65/h (outgoing 0) up to −5.4/h (outgoing 10), linear.
  - Conforto: −12/h (active ≤3), −15/h (4..6), −18/h (≥7) while standing/walking; 0 while seated/lying
    (sitting interactions add comfort).
  - Ambiente (room): not decayed; set every tick to the room score of the room the character stands in.
- Passive decay of a motive is suspended while the current interaction is actively raising that motive.
- Mood = average of the 8 motives (−100..100). Mood bars UI: ceil(|mood|/20) up to 5, green/red.
- Critical events:
  - Energia ≤ −100 → desmaia (sleeps on the floor where they stand, +11/h energy, ends at 20).
  - Bexiga ≤ −100 → acidente: creates a `puddle` object at their tile, bladder → 100, hygiene −40, mood
    hit; notification.
  - Fome ≤ −100 → "atendimento de emergência": character faints, hospital takes them for 2 sim-hours,
    hunger → 0, bill M$ 500 added immediately (no death in v1).
  - Mood < −60 → refuses non-need player commands (shakes head, thought bubble with the worst need).
- Thought bubbles: when a motive is < −30, periodically show the icon of the lowest motive.

## Autonomy (RESEARCH.md: "Motive contribution curves", "Interaction score formula",
"Distance attenuation", "Selection with randomness", "Canonical autonomy curves and scoring mode")
- Use the ESTIMATE piecewise curves listed in "Motive contribution (attenuation/insistence) curves".
- Score = Σ over advertised motives (1/9) × [C(m + ad/1000) − C(m)], ÷ (1 + atten × distance tiles).
  Ad amount = min + delta × p where p is the personality/skill multiplier (see "Advertised amount per motive").
- Keep top 4 (excluding objects in use unless capacity allows), pick by weighted random.
- Free will runs when a character's queue is empty, every 4–8 sim minutes; can be disabled in options.
- Lockouts: route failure → that obj+interaction locked 60 sim-min; just-finished → 30 sim-min unless
  motive < −50.
- Social autonomy: other present characters advertise socials (talk/joke/...) with Social/Fun ads
  scaled by relationship; outgoing/playful traits multiply.
- Player commands go before autonomous actions; a player command cancels the current autonomous action.

## Interactions & rates (RESEARCH.md "Canonical interaction gain-rate table")
Use that table: toilet bladder +75×rating/h, shower hygiene +55×rating/h, tub 40×rating + comfort,
bed energy +(3×rating+5)/h ×… (scale so a cheap bed restores ~180 energy in ~8 h), sitting comfort
+(10+8×rating) capped at min(100, 20+10×rating), fun +(10+10×rating)×(0.5+trait/10) capped at
min(100, 30+10×rating), eating over 20 min, talk +60/h social.
Catalog ratings (0..10) per motive are defined per object in data.js and shown in the buy catalog.

## Cooking & food
- Geladeira: "Lanche" (3 min prep + 5 min eating, hunger +20..30, cost M$ 5), "Preparar refeição"
  (sequence: fridge 2 min → nearest counter prep 10 min → stove cook 15 min × (1 − 0.05×cooking)
  → places a `meal` object (servings = number of household members present) on the nearest free
  table/counter tile or the stove front; cost M$ 15 per serving), "Pedir pizza" lives on the phone
  (arrives after 60 sim-min at the lot edge, M$ 40, becomes a `meal` with 4 servings near the door).
- Meal quality/hunger per serving = 25 + 6×cooking + fridgeBonus (cheap 0, deluxe 10) (≈ research formula).
- `meal` object: "Pegar um prato e comer" → sim takes a serving, walks to the nearest free chair at a
  table (or eats standing), eats 20 min; leaves a `dirty_plate` on that table tile/ground (room −5).
  Meal spoils after 8 sim-hours (becomes spoiled: room −15, can't be eaten, must be thrown away).
- `dirty_plate` / spoiled meal: "Limpar" → carry to trash can/dishwasher/sink (or just disappears after
  walking to nearest trash/sink), gives a little Room ad for neat characters.
- Stove fire: v1 has NO fire; low-cooking failure = "queimou a comida" (meal quality −50 %), chance
  15 % × (1 − cooking/10).

## Skills (6): cozinha, mecanica, carisma, corpo, logica, criatividade (0..10)
- Gain rates per RESEARCH.md "Skill gain rate formula"; requires mood ≥ 0 (refuse otherwise).
- Objects: estante (Estudar cozinha / Estudar mecânica, also "Ler por diversão"), espelho (Praticar
  discurso → carisma), aparelho de musculação (Malhar → corpo; hygiene −, energy −), xadrez (Jogar
  xadrez → lógica; 2 players boosts social), cavalete (Pintar → criatividade), piano (Tocar → criatividade).
- Mechanical skill speeds up "Consertar" and lowers electrocution-free failure chance (no electrocution death).

## Careers (4 tracks × 10 levels) — RESEARCH.md "Career track: Business/Science/Military/Law" etc.
Tracks (original Portuguese titles, own wording): Negócios, Ciência, Segurança Pública, Artes & Mídia.
Use research numbers for hours/pay/skill + friends requirements where documented; fill others.
- Find a job: "Ler jornal" on `newspaper` (delivered daily 07:00 near the mailbox; 1 offer/day) or
  "Procurar emprego" on computer (3 offers). Accepting replaces the current job at level 1.
- Carpool arrives 1 sim-hour before shift start at the lot edge near the mailbox and waits 60 min; the
  character autonomously goes to it (priority) if on the lot and not asleep (sleeping characters are woken
  if the player clicks the car). Missing work: performance −; 2 consecutive misses = fired.
- While at work the character is hidden; motives are suspended, then on return apply the research
  "Motive drain while at work" values; pay is credited on return with a notification.
- Promotion check on return: requirements met + mood > 0 at departure → chance 40 % + performance/2.
- Daily performance changes with mood at departure.

## Relationships & social
- daily and lifetime scores −100..100 per pair (RESEARCH.md "Relationship scores", "Relationship decay").
- Friend = daily ≥ 50 (counts toward career requirements; "amigos da família" counted per household).
- Socials (pt-BR): Conversar, Contar piada, Elogiar, Abraçar, Fazer cócegas, Massagem nas costas,
  Beijar, Dançar junto, Insultar, Discutir/Empurrar? (use "Provocar"), Despedir-se (visitor leave).
  Acceptance per research "Acceptance rule (relationship + mood + personality)".
- Neighbours (state.npcs, ~8 generated): phone "Ligar para vizinho" (+social over phone, raises
  relationship), "Convidar para visitar" (if accepted, arrives within 1 h at the lot edge as a visitor
  character; stays 3–5 h; autonomy uses visitor attenuation; leaves at 23:00 or when relationship < −20).
- Walk-bys: once per day a random neighbour may walk by; player can greet by clicking them.
- Visitors are characters in `state.sims` with `visitor: true, npcId`; they are not selectable/controllable,
  don't count as household, don't get bills/jobs.

## Money
- New game "Família Alves" (2 moradores) in the furnished starter house, M$ 6.500 in the bank.
- New family on an empty lot: M$ 20.000.
- Bills: every 3 days at 09:00 a bill arrives in the mailbox: 1.5 % of total object value + M$ 50 base
  (research "Bills"). Shown as notification and mailbox "Pagar contas". Unpaid after 3 more days →
  "oficial de cobrança": removes objects worth the bill + 20 % (pick most expensive first), notification.
- Selling objects: refund = price × (bought today ? 1.0 : max(0.6, 0.85 − 0.02 × daysOwned)).
- Build costs: wall M$ 70/segment, door M$ 150, window M$ 110, floor M$ 10/tile, wallpaper M$ 10/edge side;
  demolishing refunds 50 %.
- Services by phone: técnico (repair, M$ 50/h, arrives in 1 h), faxineira (M$ 10/h, cleans dirty objects,
  plates, puddles). They are visitor characters with `service` role that perform their task then leave.

## Objects (catalog). `type` → model key is the same string as the type unless noted.
Columns: type | name (pt-BR) | cat | price | w×h (rot 0) | notes. Engine/data define ratings & interactions;
models.js MUST provide a model for every `type` here.

| type | name | cat | price | w×h | notes |
|---|---|---|---|---|---|
| chair_wood | Cadeira de madeira | seating | 80 | 1×1 | sit (on), eat at table |
| chair_dining | Cadeira estofada | seating | 350 | 1×1 | sit (on) |
| armchair | Poltrona reclinável | seating | 450 | 1×1 | sit, nap |
| sofa_cheap | Sofá de tecido | seating | 300 | 2×1 | 2 seats, nap |
| sofa_lux | Sofá de couro | seating | 1200 | 2×1 | 2 seats, nap |
| bed_single | Cama de solteiro | beds | 300 | 1×2 | sleep, relax |
| bed_double | Cama de casal simples | beds | 450 | 2×2 | 2 sleepers |
| bed_lux | Cama de casal king | beds | 3000 | 2×2 | 2 sleepers |
| counter | Balcão de cozinha | surfaces | 150 | 1×1 | food prep surface, meal placement |
| table_dining | Mesa de jantar | surfaces | 200 | 2×1 | eating surface |
| table_small | Mesa quadrada | surfaces | 95 | 1×1 | eating surface |
| end_table | Mesinha de canto | surfaces | 60 | 1×1 | decor |
| fridge_cheap | Geladeira simples | appliances | 600 | 1×1 | snack, cook |
| fridge_lux | Geladeira duplex | appliances | 2500 | 1×1 | better food |
| stove | Fogão a gás | appliances | 400 | 1×1 | cook step |
| dishwasher | Lava-louças | appliances | 550 | 1×1 | clean plates faster |
| trash_can | Lixeira | appliances | 30 | 1×1 | dispose plates |
| toilet | Vaso sanitário | plumbing | 300 | 1×1 | bladder (on) |
| toilet_lux | Vaso sanitário conforto | plumbing | 1200 | 1×1 | bladder + comfort |
| shower | Box com chuveiro | plumbing | 650 | 1×1 | hygiene (on) |
| bathtub | Banheira | plumbing | 800 | 2×1 | hygiene + comfort (on) |
| sink | Pia de banheiro | plumbing | 200 | 1×1 | wash hands |
| hot_tub | Ofurô | plumbing | 6000 | 2×2 | comfort, fun, social, hygiene (on, 4 users) |
| tv_cheap | TV de tubo | electronics | 85 | 1×1 | watch (fun) from nearby seat or standing |
| tv_lux | TV de tela plana | electronics | 3500 | 2×1 | watch |
| stereo | Aparelho de som | electronics | 450 | 1×1 | listen, dance (fun, social) |
| computer | Computador com mesa | electronics | 1800 | 2×1 | play (fun), find job, (seated slot in front) |
| phone | Telefone | electronics | 50 | 1×1 | call, invite, services, pizza |
| arcade | Fliperama | electronics | 1500 | 1×1 | fun |
| lamp_floor | Luminária de chão | lighting | 50 | 1×1 | light |
| lamp_fancy | Luminária de design | lighting | 300 | 1×1 | light + decor |
| plant_small | Vaso de planta | decor | 40 | 1×1 | decor, water |
| plant_big | Palmeira de vaso | decor | 150 | 1×1 | decor, water |
| painting_cheap | Quadro de paisagem | decor | 100 | 1×1 | wall-mounted, noBlock |
| painting_lux | Quadro a óleo | decor | 1500 | 1×1 | wall-mounted, noBlock |
| mirror | Espelho de parede | decor | 150 | 1×1 | wall-mounted, noBlock; charisma, check self |
| sculpture | Escultura abstrata | decor | 1200 | 1×1 | decor |
| rug | Tapete | decor | 120 | 2×2 | noBlock decor |
| bookshelf | Estante de livros | hobbies | 250 | 1×1 | study cooking/mechanical, read |
| easel | Cavalete de pintura | hobbies | 500 | 1×1 | creativity |
| chess | Mesa de xadrez | hobbies | 500 | 1×1 | logic, 2 players (front and back slots) |
| exercise | Aparelho de musculação | hobbies | 700 | 1×2 | body |
| piano | Piano | hobbies | 3500 | 2×1 | creativity, fun |
| mailbox | Caixa de correio | system | 0 | 1×1 | not buyable; pay bills; newspaper spawns next to it |
| meal | Refeição servida | system | 0 | 1×1 | not buyable; noBlock; on a surface tile or floor |
| dirty_plate | Prato sujo | system | 0 | 1×1 | not buyable; noBlock |
| puddle | Poça | system | 0 | 1×1 | not buyable; noBlock; clean |
| newspaper | Jornal | system | 0 | 1×1 | not buyable; noBlock; read → job offers |
| carpool | Carona do trabalho | system | 0 | 2×1 | not buyable; noBlock; temporary at lot edge |

Placement rules:
- `wall: true` objects (paintings, mirror) need a wall on the edge BEHIND the tile: rot 0 (front +Z) →
  `"h,x,y"`; rot 1 (front −X) → `"v,x+1,y"`; rot 2 (front −Z) → `"h,x,y+1"`; rot 3 (front +X) → `"v,x,y"`.
- `noBlock: true` objects never block walking and may share a tile with one blocking object only when
  the blocking object is a `surface` (meals/plates on tables/counters). Rugs may sit under anything.
- Objects may not straddle a wall edge (a footprint may not contain an internal wall edge).
- meal/dirty_plate placed on a surface tile render on top of the surface (y = surface height 0.8).

## Starter house (Família Alves)
24×20 lot. A ~10×8 house near the middle with: entry door facing the street (street = y = h, south),
living room (sofa, TV, lamp, plant, painting), kitchen (fridge, stove, 3 counters, dining table + 2 chairs,
trash can), bathroom (toilet, shower, sink, mirror), bedroom (double bed, lamp, end table), a bookshelf,
phone. Windows on outer walls, mailbox near the street. Wood floors indoors, tile floor in kitchen/bath.
Two adults: e.g. "Rita Alves" (neat 6, outgoing 5, active 4, playful 5, nice 5) and "Caio Alves"
(neat 3, outgoing 6, active 6, playful 6, nice 4). Caio starts with a job (Negócios level 1).

## UI direction
Single-theme game UI over the 3D view. Deep teal-navy translucent panels, warm sunflower accent,
rounded chunky display face ("Baloo 2") + clean body face ("Nunito Sans"), emoji icons only as in-game
need/action glyphs. Bottom-left: portrait strip + needs panel; bottom bar: mode tabs (Viver / Comprar /
Construir / Opções), clock + day + speed buttons, money. Right side: catalog drawer in Buy/Build.
Pie (radial) menu at the click point with interaction labels. Notifications as toasts top-right, plus a
log. Action queue icons above the needs panel (click to cancel). Mood orb above the selected character.
Speech/thought bubbles as HTML overlays (emoji icons) above heads.
Must work at phone width (collapse panels; tap = click; two-finger pan/zoom optional).
