/* js/data.js — Hollow: game data (Hollow Knight 1.5).
   Facts only: tables, names and stat definitions. No rule lives here;
   the rules (how charms and upgrades combine) are in js/engine.js.
   Source of the numbers: hollowknight.wiki (each charm's, spell's and art's page).
   Spanish names: the game's official translation. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  /* ── Nail ────────────────────────────────────────────────────────────── */
  const NAILS = [
    { level: 0, es: 'Aguijón antiguo',      en: 'Old Nail',        damage: 5 },
    { level: 1, es: 'Aguijón afilado',    en: 'Sharpened Nail',  damage: 9 },
    { level: 2, es: 'Aguijón estilizado', en: 'Channelled Nail', damage: 13 },
    { level: 3, es: 'Aguijón en espiral',  en: 'Coiled Nail',     damage: 17 },
    { level: 4, es: 'Aguijón puro',       en: 'Pure Nail',       damage: 21 },
  ];

  const NAIL = {
    attackDuration: 0.35, attackDurationQuick: 0.28,   // active hitbox
    attackCooldown: 0.41, attackCooldownQuick: 0.25,   // minimum between swings
    strengthMult: 1.5, furyMult: 1.75,
    rangeLongnail: 0.15, rangePride: 0.25,
    artCharge: 1.35, artChargeGlory: 0.75,
    greatSlashMult: 2.5, dashSlashMult: 2.5, cycloneMult: 1.25,
    cycloneHits: 3, cycloneHitsMax: 6,
    elegyMult: 0.5, elegyFuryMult: 1.5,
    sharpShadowDashmasterMult: 1.5,
    heavyBlowKnockback: 1.75,
  };

  const ARTS = {
    cyclone: { es: 'Corte ciclón',     en: 'Cyclone Slash' },
    dash:    { es: 'Corte veloz', en: 'Dash Slash' },
    great:   { es: 'Gran corte',          en: 'Great Slash' },
  };

  /* ── Abilities ────────────────────────────────────────────────────────
     The ones that change some number: the Dream Nail (soul and Essence), and the cloak (the dash,
     Dash Slash, Sharp Shadow and Dashmaster). Names from the game's inventory
     (INV_NAME_DREAMNAIL_A, INV_NAME_DASH, INV_NAME_SHADOWDASH). */
  const ABILITIES = {
    dream: { es: 'Aguijón Onírico', en: 'Dream Nail', art: 'dream1' },
    awoken: { es: 'Aguijón Onírico despierto', en: 'Awoken Dream Nail', art: 'awoken' },   // INV_NAME_DREAMNAIL_B
    cloaks: [null,
      { es: 'Capa de ala de polilla', en: 'Mothwing Cloak', art: 'cloak1' },
      { es: 'Capa sombría',           en: 'Shade Cloak',    art: 'cloak2' },
    ],
  };

  /* ── What your game has beyond the numbers (js/progress.js) ─────────────
     The equipment and key items of the game's Inventory, and what you carry: each with its
     name as the game writes it (INV_NAME_*, the key alongside) and its artwork (ART.items).
     None changes a figure: they're your game's record, and part of the 112%. */
  const EQUIPMENT = [
    { id: 'mantis-claw', es: 'Garra de mantis', en: 'Mantis Claw' },              // INV_NAME_WALLJUMP
    { id: 'monarch-wings', es: 'Alas de monarca', en: 'Monarch Wings' },          // INV_NAME_DOUBLEJUMP
    { id: 'crystal-heart', es: 'Corazón de cristal', en: 'Crystal Heart' },       // INV_NAME_SUPERDASH
    { id: 'isma-tear', es: 'Lágrima de Isma', en: "Isma's Tear" },                // INV_NAME_ACIDARMOUR
    { id: 'dreamgate', es: 'Portal Onírico', en: 'Dreamgate' },                   // INV_NAME_DREAMGATE
  ];
  const KEY_ITEMS = [
    { id: 'kings-brand', es: 'Marca del rey', en: "King's Brand" },               // INV_NAME_KINGSBRAND
    { id: 'lumafly-lantern', es: 'Linterna de lumélula', en: 'Lumafly Lantern' }, // INV_NAME_LANTERN
    { id: 'city-crest', es: 'Emblema de la ciudad', en: 'City Crest' },           // INV_NAME_CITYKEY
    { id: 'shopkeepers-key', es: 'Llave del comerciante', en: "Shopkeeper's Key" }, // INV_NAME_STOREKEY
    { id: 'elegant-key', es: 'Llave elegante', en: 'Elegant Key' },               // INV_NAME_WHITEKEY
    { id: 'love-key', es: 'Llave del amor', en: 'Love Key' },                     // INV_NAME_LOVEKEY
    { id: 'tram-pass', es: 'Pase para el tranvía', en: 'Tram Pass' },             // INV_NAME_TRAM_PASS
    { id: 'godtuner', es: 'Afinador de Dioses', en: 'Godtuner' },                 // INV_NAME_GODFINDER
  ];
  /* What you carry, in the Inventory's order: max is the most there can be (js/progress.js),
     sell what Relic Seeker Lemm pays for one (wiki, each relic's page). */
  const CARRIED = [
    { id: 'geo', es: 'Geo', en: 'Geo' },                                          // INV_NAME_GEO
    { id: 'essence', es: 'Esencia', en: 'Essence' },                              // INV_NAME_DREAMCORE
    { id: 'pale-ore', es: 'Mineral Pálido', en: 'Pale Ore' },                     // INV_NAME_ORE
    { id: 'simple-key', es: 'Llave simple', en: 'Simple Key' },                   // INV_NAME_SIMPLEKEY
    { id: 'rancid-egg', es: 'Huevo podrido', en: 'Rancid Egg' },                  // INV_NAME_RANCIDEGG
    { id: 'wanderers-journal', es: 'Diario del errante', en: "Wanderer's Journal", sell: 200 },  // INV_NAME_TRINKET1
    { id: 'hallownest-seal', es: 'Sello de Hallownest', en: 'Hallownest Seal', sell: 450 },      // INV_NAME_TRINKET2
    { id: 'kings-idol', es: 'Ídolo del rey', en: "King's Idol", sell: 800 },                     // INV_NAME_TRINKET3
    { id: 'arcane-egg', es: 'Huevo arcano', en: 'Arcane Egg', sell: 1200 },                      // INV_NAME_TRINKET4
  ];
  /* The 112%'s things that have no name elsewhere on the site (js/completion.js, the Progress
     screen): the Dreamers as the Resting Grounds' inscription names them, the Colosseum's trials
     as its achievements do, and the Seer. */
  const COMPLETION_NAMES = {
    monomon: { es: 'Monomon, la Maestra', en: 'Monomon the Teacher' },          // DREAMERS_INSPECT_RG2
    lurien: { es: 'Lurien, el Vigilante', en: 'Lurien the Watcher' },           // DREAMERS_INSPECT_RG3
    herrah: { es: 'Herrah, la Bestia', en: 'Herrah the Beast' },                // DREAMERS_INSPECT_RG4
    'trial-warrior': { es: 'Prueba del Guerrero', en: 'Trial of the Warrior' },        // COLOSSEUM_1_TEXT
    'trial-conqueror': { es: 'Prueba del Conquistador', en: 'Trial of the Conqueror' }, // COLOSSEUM_2_TEXT
    'trial-fool': { es: 'Prueba de los Insensatos', en: 'Trial of the Fool' },         // COLOSSEUM_3_TEXT
    'seer-ascended': { es: 'Vidente', en: 'Seer' },                             // DREAM_MOTH_MAIN
  };
  /* The collectibles' kinds (js/collectibles.js), each with its name as the game writes it (the
     Inventory's, or the map's legend, KEY_*) and its picture. The flames have no name of their
     own in the game: "Grimmkin" is its name for their bearers (NAME_FLAMEBEARER_*). */
  const COLLECTIBLE_KINDS = {
    'grub': { es: 'Larva cautiva', en: 'Captive Grub', art: ['effects', 'grub'] },                    // KEY_GRUB
    'mask-shard': { es: 'Fragmento de máscara', en: 'Mask Shard', art: ['hud', 'mask-shard'] },       // INV_NAME_HEARTPIECE_1
    'vessel-fragment': { es: 'Fragmento de vasija', en: 'Vessel Fragment', art: ['hud', 'vessel-frag'] }, // INV_NAME_SOULORBS_1
    'pale-ore': { es: 'Mineral Pálido', en: 'Pale Ore', art: ['items', 'pale-ore'] },                // INV_NAME_ORE
    'charm-notch': { es: 'Muesca de amuletos', en: 'Charm Notch', art: ['hud', 'notch'] },            // INV_NAME_NOTCH
    'simple-key': { es: 'Llave simple', en: 'Simple Key', art: ['items', 'simple-key'] },             // INV_NAME_SIMPLEKEY
    'rancid-egg': { es: 'Huevo podrido', en: 'Rancid Egg', art: ['items', 'rancid-egg'] },            // INV_NAME_RANCIDEGG
    'wanderers-journal': { es: 'Diario del errante', en: "Wanderer's Journal", art: ['items', 'wanderers-journal'] }, // INV_NAME_TRINKET1
    'hallownest-seal': { es: 'Sello de Hallownest', en: 'Hallownest Seal', art: ['items', 'hallownest-seal'] },     // INV_NAME_TRINKET2
    'kings-idol': { es: 'Ídolo del rey', en: "King's Idol", art: ['items', 'kings-idol'] },           // INV_NAME_TRINKET3
    'arcane-egg': { es: 'Huevo arcano', en: 'Arcane Egg', art: ['items', 'arcane-egg'] },             // INV_NAME_TRINKET4
    'whispering-root': { es: 'Raíz susurrante', en: 'Whispering Root', art: ['items', 'whispering-root'] }, // KEY_DREAMPLANT
    'grimmkin-flame': { es: 'Llama de los Grimarios', en: 'Grimmkin Flame', art: ['items', 'grimmkin-flame'] },
    'map': { es: 'Mapa', en: 'Map', art: ['effects', 'map'] },                                         // INV_NAME_MAP
    'stag': { es: 'Estación de ciervos', en: 'Stag Station', art: ['items', 'stag'] },                // KEY_STAG
  };
  const SHARDS = { es: 'Fragmentos de máscara', en: 'Mask Shards' };             // INV_NAME_HEARTPIECE_0
  const FRAGMENTS = { es: 'Fragmentos de vasija', en: 'Vessel Fragments' };     // INV_NAME_SOULORBS_0

  /* ── Spells ───────────────────────────────────────────────────────────── */
  const SPELL_COST = 33;
  const SPELL_COST_TWISTER = 24;

  const SPELLS = {
    vs: {
      key: 'vs', slot: { es: 'Espíritu vengativo', en: 'Vengeful Spirit' },
      levels: [null,
        { es: 'Espíritu vengativo', en: 'Vengeful Spirit', total: 15, shaman: 20 },
        { es: 'Alma sombría',       en: 'Shade Soul',      total: 30, shaman: 40 },
      ],
      // Flukenest replaces the spell with flukes; with Defender's Crest, with a volatile one.
      flukes: [null, 9, 16], flukeDamage: 4, flukeDamageShaman: 5,
      volatile: { impact: 3, cloud: 23, cloudShaman: 29, duration: 2.2 },
    },
    dd: {
      key: 'dd', slot: { es: 'Salto desolador', en: 'Desolate Dive' },
      levels: [null,
        { es: 'Salto desolador',    en: 'Desolate Dive',
          parts: [{ es: 'Caída', en: 'Dive', v: 15 }, { es: 'Onda expansiva', en: 'Shockwave', v: 20 }],
          shaman: [23, 30] },
        { es: 'Oscuridad descendente', en: 'Descending Dark',
          parts: [{ es: 'Caída', en: 'Dive', v: 15 }, { es: 'Primera explosión', en: 'First burst', v: 35, right: 30 }, { es: 'Segunda explosión', en: 'Second burst', v: 15 }],
          shaman: [23, 50, 15],
          note: { es: 'La primera explosión hace 35 a la izquierda y 30 a la derecha (60–65 en total).',
                  en: 'The first burst deals 35 to the left and 30 to the right (60–65 in total).' } },
      ],
    },
    hw: {
      key: 'hw', slot: { es: 'Espectros aulladores', en: 'Howling Wraiths' },
      levels: [null,
        { es: 'Espectros aulladores', en: 'Howling Wraiths', hits: 3, perHit: 13, shamanPerHit: 20 },
        { es: 'Chillido del Abismo',  en: 'Abyss Shriek',    hits: 4, perHit: 20, shamanPerHit: 30 },
      ],
    },
  };

  /* ── Soul, health, healing ────────────────────────────────────────────── */
  const SOUL = {
    main: 99,
    // In the game each vessel is 3 fragments; here they're added as whole ones.
    vesselSize: 33, maxVessels: 3,
    perHit: 11, catcherBonus: 3, eaterBonus: 8,
    reservePerHit: 6, catcherReserveBonus: 2, eaterReserveBonus: 6,
    dreamNail: 33, dreamNailWielder: 66,
    dreamCharge: 1.75, dreamChargeWielder: 1.1,
    grubsong: 15, grubsongElegy: 25,
    weaverlingGrubsong: 3,
    kingsoulAmount: 4, kingsoulEvery: 2,
    hatchlingCost: 8,
  };

  const HEALTH = {
    // In the game the 4 extra masks are 16 shards; here they're added as whole ones.
    baseMasks: 5, maxMasks: 9,
    heartBonus: 2,
    joniMult: 1.4,
    lifebloodHeart: 2, lifebloodCore: 4,
    iframes: 1.3, iframesStalwart: 1.75,
    recoil: 0.2, recoilStalwart: 0.08,
    overcharmMult: 2,
    baldurHits: 4,
    hivebloodSeconds: 10, hivebloodSecondsJoni: 20,
    carefreeChances: [0, 10.1, 20.2, 30.3, 50.5, 70.7, 80.8, 90.9],
    carefreeAverage: 22.46,
  };

  const FOCUS = {
    cost: 33, startup: 0.25,
    perMask: 0.891, perMaskQuick: 0.597,
    deep: { masks: 2, time: 1.470 },
    deepQuick: { masks: 2, time: 0.985 },
    sporeDamage: 26, sporeDamageCrest: 40, sporeDuration: 4.1, sporeRadiusDeep: 1.35,
    sporeCooldown: 4.25,   // doesn't repeat for 4.25 s, or until you take damage (wiki, "Spore Shroom")
  };

  /* ── Movement ─────────────────────────────────────────────────────────── */
  const MOVE = {
    run: 8.3, runSprint: 10, runSprintDash: 11.5,
    dashCooldown: 0.6, dashCooldownDashmaster: 0.4,
    shadowCooldown: 1.5,
    dashSpeed: 20, shadowSpeedSharp: 28,
    unnSpeed: 6, unnSpeedQuick: 12,
    weaverlingSprintMult: 1.5,
  };

  /* ── Companions ───────────────────────────────────────────────────────── */
  const PETS = {
    weaverlings: 3, weaverlingDamage: 3,
    hatchlingDamage: 9, hatchlingFuryBonus: 5, hatchlingMax: 4, hatchlingEvery: 4,
    hatchlingCrestDamage: 4, hatchlingCrestCloud: 5,
    // Grimmchild hits according to its phase (wiki, "Grimmchild"): in phase 1 it doesn't attack; 5, 8 and 11.
    grimmchildByPhase: [0, 0, 5, 8, 11], grimmchildEvery: 1.8,
    crestCloudDamage: 3, crestCloudDuration: 1.1,
    dreamshieldWielderSize: 1.15,
    dreamshieldBreak: 2,   // on hitting an enemy or stopping a projectile it comes back after 2 s
  };

  const CHARM_NOTCHES = { base: 3, max: 11 };

  /* ── Permanent upgrades (names for the Knight panel) ─────────────────── */
  /* ── Game artwork ─────────────────────────────────────────────────────
     Each group is a folder in assets/ and each key the name of the file saved
     there; the value is the source file on the wiki.
     tools/fetch-icons.js downloads from here; the interface paints with art().
     Charms aren't in this table: their file goes in CHARMS[].wikiFile. */
  const ART = {
    nails: {
      0: 'Nail_1_Old_Nail.png',
      1: 'Nail_2_Sharpened_Nail.png',
      2: 'Nail_3_Channelled_Nail.png',
      3: 'Nail_4_Coiled_Nail.png',
      4: 'Nail_5_Pure_Nail.png',
    },
    spells: {
      vs:  'Icon_HK_Vengeful_Spirit_Art.png',
      vs2: 'Icon_HK_Shade_Soul_Art.png',
      dd:  'Icon_HK_Desolate_Dive_Art.png',
      dd2: 'Icon_HK_Descending_Dark_Art.png',
      hw:  'Icon_HK_Howling_Wraiths_Art.png',
      hw2: 'Icon_HK_Abyss_Shriek_Art.png',
      // With Flukenest, Vengeful Spirit becomes flukes: they change with the level and with Defender's Crest
      // ("Flukenest" page, Trivia).
      fluke:        'Flukeling.png',
      fluke2:       'Flukeling_shade.png',
      'fluke-dung': 'Flukeling_dung.png',
    },
    arts: {
      cyclone: 'Icon_HK_Cyclone_Slash_Art.png',
      dash:    'Icon_HK_Dash_Slash_Art.png',
      great:   'Icon_HK_Great_Slash_Art.png',
    },
    abilities: {
      cloak1: 'Icon_HK_Mothwing_Cloak_Art.png',
      cloak2: 'Icon_HK_Shade_Cloak_Art.png',
      dream1: 'Icon_HK_Dream_Nail_Art.png',
      dream2: 'Icon_HK_Dream_Nail_Art_2.png',
      awoken: 'Icon_HK_Awoken_Dream_Nail.png',
      focus:  'Icon_HK_Focus_Art.png',
    },
    // The Inventory's equipment, key items and what you carry (EQUIPMENT, KEY_ITEMS, CARRIED).
    items: {
      'mantis-claw':       'Icon_HK_Mantis_Claw_Art.png',
      'monarch-wings':     'Icon_HK_Monarch_Wings_Art.png',
      'crystal-heart':     'Icon_HK_Crystal_Heart_Art.png',
      'isma-tear':         "Icon_HK_Isma's_Tear_Art.png",
      'dreamgate':         'Icon_HK_Dreamgate_Art.png',
      'kings-brand':       "King's_Brand.png",
      'lumafly-lantern':   'Lumafly_Lantern.png',
      'city-crest':        'City_Crest.png',
      'shopkeepers-key':   "Shopkeeper's_Key.png",
      'elegant-key':       'Elegant_Key.png',
      'love-key':          'Love_Key.png',
      'tram-pass':         'Tram_Pass.png',
      'godtuner':          'Godtuner.png',
      'geo':               'Geo.png',
      'essence':           'Essence.png',
      'pale-ore':          'Pale_Ore.png',
      'simple-key':        'Simple_Key.png',
      'rancid-egg':        'Rancid_Egg.png',
      'wanderers-journal': "Wanderer's_Journal.png",
      'hallownest-seal':   'Hallownest_Seal.png',
      'kings-idol':        "King's_Idol.png",
      'arcane-egg':        'Arcane_Egg.png',
      // The collectibles' kinds that have no inventory icon (COLLECTIBLE_KINDS).
      'whispering-root':   'Whispering_Root.png',
      'grimmkin-flame':    'FlameConsumed.png',
      'stag':              'Stag_Circle.png',
    },
    hud: {
      'mask':        'HK_Mask.png',
      'mask-lb':     'HK_Mask_Lifeblood.png',
      'mask-shard':  'Mask_Shard.png',
      'soul-meter':  'Soul_Meter.png',    // the HUD's meter: it fills with soul and the eyes appear
      'soul':        'Soul.png',           // the interface's soul: the reserves' white disc
      'vessel':      'Soul_Vessel.png',    // the item you pick up, not the HUD's circle
      'vessel-frag': 'Vessel_Fragment.png',
      'notch':       'Charm_Notch.png',      // the item you pick up, eye-shaped
      'notch-ui':    'HK_Notch.png',          // the glowing dot from the charm screen
      // Hiveblood: the mask that regenerates, with its drop of honey (wiki, "Hiveblood"), and Joni's Blessing's.
      'hiveblood':      'Hiveblood_Mask.png',
      'hiveblood-joni': 'Hiveblood_Jonis_Blessing_Mask.png',
      // Baldur Shell's blue shell. The wiki doesn't have the small HUD icon: it's the
      // only picture of it there is, and the arena places it scaled down under the orb.
      'baldur':         'Baldur_Shell_Trigger.png',
    },
    // What you see of some charms in the game: their creatures, their thorns, the map, the geo.
    // They are the "Effects" plates on the sheet (CHARM_EFFECTS, below).
    effects: {
      weaverling: 'Weaverling.png',
      grimmchild: 'GrimmchildFamiliar4.png',   // Grimmchild fully grown (phase 4)
      hatchling:  'Hatchling.png',
      thorns:     'Thorns-of-Agony-Effect.png',
      map:        'Map_(Hollow_Knight).png',
      geo:        'Geo.png',
      grub:       'Grub.png',
    },
  };

  /* An artwork's path: art('hud', 'mask') → assets/hud/mask.png. The copy published as an
     Artifact doesn't fit in its 255 files and carries portraits and medallions packed into
     js/artpack.js (`npm run artpack`); locally that script isn't loaded and the file is used. */
  const art = (group, key) => (HK.artpack && HK.artpack[`${group}/${key}`]) || `assets/${group}/${key}.png`;

  /* ── Charms (in the game's inventory order) ───────────────────────────
     The order and numbering of the slots come from the wiki's list:
     https://hollowknight.fandom.com/es/wiki/Categoría:Amuletos
     id: stable slug (also used in the URL and in assets/charms/<id>.png)
     num: inventory slot; the variants share a slot
     group: charms in the same group exclude each other
     needs: prerequisite for it to have an effect (the interface shows it)
     situational: the health at which it switches on ('hp:one' or 'hp:full'), which the badge
       shows even when you aren't at it
     blurb: short summary of the effect (our own text, not the game's) */
  const CHARMS = [
    { id: 'compass',      num: 1,  es: 'Brújula caprichosa',       en: 'Wayward Compass',      notches: 1, wikiFile: 'Wayward_Compass.png',
      cat: 'utility',
      blurb: { es: 'Muestra tu posición al abrir el mapa.', en: 'Shows your position when you open the map.' } },
    { id: 'swarm',        num: 2,  es: 'Enjambre recolector',      en: 'Gathering Swarm',      notches: 1, wikiFile: 'Gathering_Swarm.png',
      cat: 'utility',
      blurb: { es: 'Un enjambre recoge por ti el geo suelto.', en: 'A swarm picks up loose geo for you.' } },
    { id: 'stalwart',     num: 3,  es: 'Coraza robusta',           en: 'Stalwart Shell',       notches: 2, wikiFile: 'Stalwart_Shell.png',
      cat: 'vitality',
      blurb: { es: 'Más tiempo invulnerable y menos aturdimiento tras un golpe.', en: 'Longer invulnerability and less stun after a hit.' } },
    { id: 'catcher',      num: 4,  es: 'Atrapaalmas',              en: 'Soul Catcher',         notches: 2, wikiFile: 'Soul_Catcher.png',
      cat: 'spell',
      blurb: { es: '+3 de alma por golpe (+2 a la reserva).', en: '+3 soul per hit (+2 to the reserve).' } },
    { id: 'shaman',       num: 5,  es: 'Piedra de chamán',         en: 'Shaman Stone',         notches: 3, wikiFile: 'Shaman_Stone.png',
      needs: 'spell:any', cat: 'spell',
      blurb: { es: 'Los hechizos hacen entre un 33 % y un 50 % más de daño y son más grandes.', en: 'Spells deal between 33% and 50% more damage and are larger.' } },
    { id: 'eater',        num: 6,  es: 'Devoraalmas',              en: 'Soul Eater',           notches: 4, wikiFile: 'Soul_Eater.png',
      cat: 'spell',
      blurb: { es: '+8 de alma por golpe (+6 a la reserva).', en: '+8 soul per hit (+6 to the reserve).' } },
    { id: 'dashmaster',   num: 7,  es: 'Maestro de las embestidas', en: 'Dashmaster',          notches: 2, wikiFile: 'Dashmaster.png',
      needs: 'cloak:1', cat: 'utility',
      blurb: { es: 'Avanzas rápidamente más a menudo y también hacia abajo.', en: 'You dash more often and downwards as well.' } },
    { id: 'sprintmaster', num: 8,  es: 'Maestro de Sprints',       en: 'Sprintmaster',         notches: 1, wikiFile: 'Sprintmaster.png',
      cat: 'utility',
      blurb: { es: 'Corres un 20 % más rápido (39 % con Maestro de las embestidas).', en: 'You run 20% faster (39% with Dashmaster).' } },
    { id: 'grubsong',     num: 9,  es: 'Canción de larvas',        en: 'Grubsong',             notches: 1, wikiFile: 'Grubsong.png',
      cat: 'spell',
      blurb: { es: 'Ganas 15 de alma al recibir daño (25 con la Elegía).', en: 'You gain 15 soul when damaged (25 with the Elegy).' } },
    { id: 'elegy',        num: 10, es: 'Elegía de la Larvamosca',  en: "Grubberfly's Elegy",   notches: 3, wikiFile: "Grubberfly's_Elegy.png",
      situational: 'hp:full', cat: 'combat',
      blurb: { es: 'Con la vida completa, el aguijón dispara rayos.', en: 'At full health, the nail fires beams.' } },
    { id: 'fheart',       num: 11, es: 'Corazón frágil',           en: 'Fragile Heart',        notches: 2, wikiFile: 'Fragile_Heart.png',
      group: 'heart', fragile: true, cat: 'vitality',
      blurb: { es: '+2 máscaras. Se rompe al morir.', en: '+2 masks. Breaks on death.' } },
    { id: 'uheart',       num: 11, es: 'Corazón irrompible',       en: 'Unbreakable Heart',    notches: 2, wikiFile: 'Unbreakable_Heart.png',
      group: 'heart', cat: 'vitality',
      blurb: { es: '+2 máscaras.', en: '+2 masks.' } },
    { id: 'fgreed',       num: 12, es: 'Codicia frágil',           en: 'Fragile Greed',        notches: 2, wikiFile: 'Fragile_Greed.png',
      group: 'greed', fragile: true, cat: 'utility',
      blurb: { es: 'Los enemigos sueltan un 20 % más de geo. Se rompe al morir.', en: 'Enemies drop 20% more geo. Breaks on death.' } },
    { id: 'ugreed',       num: 12, es: 'Codicia irrompible',       en: 'Unbreakable Greed',    notches: 2, wikiFile: 'Unbreakable_Greed.png',
      group: 'greed', cat: 'utility',
      blurb: { es: 'Los enemigos sueltan un 20 % más de geo.', en: 'Enemies drop 20% more geo.' } },
    { id: 'fstrength',    num: 13, es: 'Fuerza frágil',            en: 'Fragile Strength',     notches: 3, wikiFile: 'Fragile_Strength.png',
      group: 'strength', fragile: true, cat: 'combat',
      blurb: { es: 'Daño del aguijón +50 %. Se rompe al morir.', en: 'Nail damage +50%. Breaks on death.' } },
    { id: 'ustrength',    num: 13, es: 'Fuerza irrompible',        en: 'Unbreakable Strength', notches: 3, wikiFile: 'Unbreakable_Strength.png',
      group: 'strength', cat: 'combat',
      blurb: { es: 'Daño del aguijón +50 %.', en: 'Nail damage +50%.' } },
    { id: 'twister',      num: 14, es: 'Tuercehechizos',           en: 'Spell Twister',        notches: 2, wikiFile: 'Spell_Twister.png',
      needs: 'spell:any', cat: 'spell',
      blurb: { es: 'Los hechizos cuestan 24 de alma en vez de 33.', en: 'Spells cost 24 soul instead of 33.' } },
    { id: 'steady',       num: 15, es: 'Cuerpo firme',             en: 'Steady Body',          notches: 1, wikiFile: 'Steady_Body.png',
      cat: 'combat',
      blurb: { es: 'No retrocedes al golpear con el aguijón.', en: 'You no longer recoil when you hit with the nail.' } },
    { id: 'heavy',        num: 16, es: 'Duro golpe',               en: 'Heavy Blow',           notches: 2, wikiFile: 'Heavy_Blow.png',
      cat: 'combat',
      blurb: { es: 'Los enemigos salen despedidos un 75 % más lejos.', en: 'Enemies are knocked back 75% further.' } },
    { id: 'quickslash',   num: 17, es: 'Corte rápido',             en: 'Quick Slash',          notches: 3, wikiFile: 'Quick_Slash.png',
      cat: 'combat',
      blurb: { es: 'Golpeas con el aguijón mucho más rápido.', en: 'You swing the nail much faster.' } },
    { id: 'longnail',     num: 18, es: 'Largoaguijón',             en: 'Longnail',             notches: 2, wikiFile: 'Longnail.png',
      cat: 'combat',
      blurb: { es: 'Alcance del aguijón +15 %.', en: 'Nail range +15%.' } },
    { id: 'pride',        num: 19, es: 'Marca de orgullo',         en: 'Mark of Pride',        notches: 3, wikiFile: 'Mark_of_Pride.png',
      cat: 'combat',
      blurb: { es: 'Alcance del aguijón +25 %.', en: 'Nail range +25%.' } },
    { id: 'fury',         num: 20, es: 'Furia de los caídos',      en: 'Fury of the Fallen',   notches: 2, wikiFile: 'Fury_of_the_Fallen.png',
      situational: 'hp:one', cat: 'combat',
      blurb: { es: 'Con 1 máscara, el aguijón y las artes hacen un 75 % más de daño.', en: 'At 1 mask, nail and Nail Arts deal 75% more damage.' } },
    { id: 'thorns',       num: 21, es: 'Espinas de agonía',        en: 'Thorns of Agony',      notches: 1, wikiFile: 'Thorns_of_Agony.png',
      cat: 'combat',
      blurb: { es: 'Al recibir daño brotan espinas que golpean con el daño base del aguijón.', en: 'Taking damage sprouts thorns that hit for the base nail damage.' } },
    { id: 'baldur',       num: 22, es: 'Coraza de baldur',         en: 'Baldur Shell',         notches: 2, wikiFile: 'Baldur_Shell.png',
      cat: 'combat',
      blurb: { es: 'Una coraza bloquea hasta 4 golpes mientras te concentras; se repara al descansar.', en: 'A shell blocks up to 4 hits while you focus; it repairs when you rest.' } },
    { id: 'flukenest',    num: 23, es: 'Tremanido',                en: 'Flukenest',            notches: 3, wikiFile: 'Flukenest.png',
      needs: 'spell:vs', cat: 'spell',
      blurb: { es: 'Espíritu vengativo se convierte en una horda de trematodos.', en: 'Vengeful Spirit becomes a horde of flukes.' } },
    { id: 'crest',        num: 24, es: 'Blasón del defensor',      en: "Defender's Crest",     notches: 1, wikiFile: "Defender's_Crest.png",
      cat: 'spell',
      blurb: { es: 'Dejas nubes tóxicas; transforma Tremanido, Útero brillante y Hongo con esporas. Descuento de Comepiernas.', en: 'You leave toxic clouds; it transforms Flukenest, Glowing Womb and Spore Shroom. Leg Eater discount.' } },
    { id: 'womb',         num: 25, es: 'Útero brillante',          en: 'Glowing Womb',         notches: 2, wikiFile: 'Glowing_Womb.png',
      cat: 'utility',
      blurb: { es: 'Gasta 8 de alma en crías que cargan contra los enemigos.', en: 'Spends 8 soul on hatchlings that charge at enemies.' } },
    { id: 'quickfocus',   num: 26, es: 'Concentración rápida',     en: 'Quick Focus',          notches: 3, wikiFile: 'Quick_Focus.png',
      cat: 'spell',
      blurb: { es: 'Te curas un 33 % más rápido.', en: 'You heal 33% faster.' } },
    { id: 'deepfocus',    num: 27, es: 'Concentración profunda',   en: 'Deep Focus',           notches: 4, wikiFile: 'Deep_Focus.png',
      cat: 'spell',
      blurb: { es: 'Cada Concentración cura 2 máscaras, pero tarda un 65 % más.', en: 'Each Focus heals 2 masks, but takes 65% longer.' } },
    { id: 'lbheart',      num: 28, es: 'Corazón de saviavida',     en: 'Lifeblood Heart',      notches: 2, wikiFile: 'Lifeblood_Heart.png',
      cat: 'vitality',
      blurb: { es: 'Al descansar ganas 2 máscaras de saviavida.', en: 'Resting grants you 2 Lifeblood masks.' } },
    { id: 'lbcore',       num: 29, es: 'Núcleo de saviavida',      en: 'Lifeblood Core',       notches: 3, wikiFile: 'Lifeblood_Core.png',
      cat: 'vitality',
      blurb: { es: 'Al descansar ganas 4 máscaras de saviavida.', en: 'Resting grants you 4 Lifeblood masks.' } },
    { id: 'joni',         num: 30, es: 'Bendición de Joni',        en: "Joni's Blessing",      notches: 4, wikiFile: "Joni's_Blessing.png",
      cat: 'vitality',
      blurb: { es: 'Toda tu salud pasa a ser saviavida, un 40 % más, pero no puedes curarte.', en: 'All your health becomes Lifeblood, 40% more of it, but you cannot heal.' } },
    { id: 'hiveblood',    num: 31, es: 'Sangrecolmena',            en: 'Hiveblood',            notches: 4, wikiFile: 'Hiveblood.png',
      cat: 'vitality',
      blurb: { es: 'Recuperas la última máscara perdida tras 10 s sin recibir daño.', en: 'The last mask you lost comes back after 10 s without damage.' } },
    { id: 'spore',        num: 32, es: 'Hongo con esporas',        en: 'Spore Shroom',         notches: 1, wikiFile: 'Spore_Shroom.png',
      cat: 'spell',
      blurb: { es: 'Al concentrarte sueltas una nube de esporas que daña.', en: 'Focusing releases a spore cloud that damages enemies.' } },
    { id: 'sharpshadow',  num: 33, es: 'Sombra afilada',           en: 'Sharp Shadow',         notches: 2, wikiFile: 'Sharp_Shadow.png',
      needs: 'cloak:2', cat: 'combat',
      blurb: { es: 'El avance rápido sombrío daña y llega un 40 % más lejos.', en: 'The Shadow Dash damages enemies and reaches 40% further.' } },
    { id: 'unn',          num: 34, es: 'Forma de Unn',             en: 'Shape of Unn',         notches: 2, wikiFile: 'Shape_of_Unn.png',
      cat: 'spell',
      blurb: { es: 'Puedes moverte mientras te concentras.', en: 'You can move while focusing.' } },
    { id: 'glory',        num: 35, es: 'Gloria del Maestro de aguijones', en: "Nailmaster's Glory", notches: 1, wikiFile: "Nailmaster's_Glory.png",
      needs: 'art:any', cat: 'combat',
      blurb: { es: 'Las artes del aguijón se cargan en 0,75 s en vez de 1,35 s.', en: 'Nail Arts charge in 0.75 s instead of 1.35 s.' } },
    { id: 'weaversong',   num: 36, es: 'Canción de Tejedora',      en: 'Weaversong',           notches: 2, wikiFile: 'Weaversong.png',
      cat: 'utility',
      blurb: { es: 'Tres tejedoras te acompañan y atacan por 3 de daño.', en: 'Three Weaverlings follow you and attack for 3 damage.' } },
    { id: 'wielder',      num: 37, es: 'Portador onírico',         en: 'Dream Wielder',        notches: 1, wikiFile: 'Dream_Wielder.png',
      needs: 'dream', cat: 'combat',
      blurb: { es: 'El Aguijón Onírico carga más rápido y da 66 de alma; más Esencia.', en: 'The Dream Nail charges faster and gives 66 soul; more Essence.' } },
    { id: 'dreamshield',  num: 38, es: 'Escudo Onírico',           en: 'Dreamshield',          notches: 3, wikiFile: 'Dreamshield.png',
      cat: 'combat',
      blurb: { es: 'Un escudo orbita a tu alrededor: bloquea proyectiles y golpea con el daño base del aguijón.', en: 'A shield orbits around you: it blocks projectiles and hits for the base nail damage.' } },
    { id: 'grimmchild',   num: 39, es: 'Niño de Grimm',            en: 'Grimmchild',           notches: 2, wikiFile: 'Grimmchild.png',
      group: 'grimm', cat: 'utility',
      blurb: { es: 'Un compañero que dispara bolas de fuego; sube de fase con las llamas.', en: 'A companion that shoots fireballs; it levels up with the flames.' } },
    { id: 'melody',       num: 39, es: 'Melodía Despreocupada',    en: 'Carefree Melody',      notches: 3, wikiFile: 'Carefree_Melody.png',
      group: 'grimm', cat: 'utility',
      blurb: { es: 'A veces bloquea el daño; la probabilidad crece con cada golpe recibido.', en: 'Sometimes blocks damage; the chance grows with every hit you take.' } },
    { id: 'kingsoul',     num: 40, es: 'Alma del Monarca',         en: 'Kingsoul',             notches: 5, wikiFile: 'Kingsoul.png',
      group: 'king', cat: 'vitality',
      blurb: { es: 'Generas 4 de alma cada 2 segundos.', en: 'You generate 4 soul every 2 seconds.' } },
    { id: 'voidheart',    num: 40, es: 'Corazón del Vacío',        en: 'Void Heart',           notches: 0, wikiFile: 'Void_Heart.png',
      group: 'king', cat: 'vitality',
      blurb: { es: 'Une el Vacío bajo tu voluntad: las criaturas del Vacío dejan de atacarte. No se puede desequipar.', en: 'It binds the Void to your will: Void creatures stop attacking you. It cannot be unequipped.' } },
  ];

  const CHARM_BY_ID = Object.fromEntries(CHARMS.map((c) => [c.id, c]));

  /* ── Effects: what charms do that doesn't show in the sheet's figures ──
     The plates that go below the charm band: seeing your position on the map, thorns when
     taking damage, the companions… What's already read above (damage, reach, soul per hit,
     healing, spells) isn't repeated here. They're sorted by the moment they trigger.
     charm: the charm that gives it (or several, if it doesn't matter which: the two Greeds)
     when: the moment, from EFFECT_WHEN
     art: [group, key] from ART; without it, the charm's icon. artWith: another picture if you wear
       that charm (Hiveblood's blue mask with Joni's Blessing)
     stat: where the figure comes from; without it, the plate carries no figure
     show: 'plus' adds the sign (+15); 'pctOver' reads a multiplier as a percentage (×1.75 → +75%)
     hp: the health the figure is computed at (Fury, at 1 mask)
     extra: a second figure, if its stat gives something (the weaverlings' soul with Grubsong)
     bad: it's a drawback
     line: the full sentence, with {v} where the figure goes; note: the plate's short note */
  const EFFECT_WHEN = [
    { id: 'side',    es: 'Siempre contigo',        en: 'Always with you' },
    { id: 'strike',  es: 'Al golpear',             en: 'When you strike' },
    { id: 'hit',     es: 'Al recibir daño',        en: 'When you take damage' },
    { id: 'focus',   es: 'Al concentrarte',        en: 'When you focus' },
    { id: 'move',    es: 'Al moverte',             en: 'On the move' },
    { id: 'dream',   es: 'Con el Aguijón Onírico', en: 'With the Dream Nail' },
    { id: 'explore', es: 'Explorando',             en: 'Exploring' },
    { id: 'fall',    es: 'Si caes',                en: 'If you fall' },
  ];

  const CHARM_EFFECTS = [
    // Always with you
    { charm: 'dreamshield', when: 'side', stat: 'nail.dreamshield',
      title: { es: 'Escudo Onírico', en: 'Dreamshield' },
      line: { es: 'Un escudo gira a tu alrededor: {v} por choque, y detiene proyectiles', en: 'A shield circles you: {v} per contact, and it stops projectiles' },
      note: { es: 'gira a tu alrededor', en: 'circles around you' } },
    { charm: 'weaversong', when: 'side', art: ['effects', 'weaverling'], stat: 'pet.weaverling',
      title: { es: 'Tejedoras', en: 'Weaverlings' },
      line: { es: 'Tres tejedoras atacan por {v} cada una', en: 'Three Weaverlings attack for {v} each' },
      note: { es: 'tres, cada una', en: 'three, each' },
      extra: { stat: 'pet.weaverlingSoul', show: 'plus',
               line: { es: ', y cada golpe te da {v} de alma', en: ', and each hit gives you {v} soul' },
               note: { es: '{v} de alma por golpe', en: '{v} soul per hit' } } },
    { charm: 'grimmchild', when: 'side', art: ['effects', 'grimmchild'], stat: 'pet.grimmchild',
      title: { es: 'Niño de Grimm', en: 'Grimmchild' },
      line: { es: 'Dispara bolas de fuego de {v} cada 1,8 s', en: 'It shoots fireballs that deal {v}, every 1.8 s' },
      note: { es: 'cada 1,8 s', en: 'every 1.8 s' } },
    { charm: 'womb', when: 'side', art: ['effects', 'hatchling'], stat: 'pet.hatchling',
      title: { es: 'Crías', en: 'Hatchlings' },
      line: { es: 'Crías que se lanzan por {v}; cada una cuesta 8 de alma', en: 'Hatchlings that charge for {v}; each costs 8 soul' },
      note: { es: '8 de alma cada una', en: '8 soul each' } },
    { charm: 'crest', when: 'side', stat: 'pet.crestCloud',
      title: { es: 'Nube tóxica', en: 'Toxic cloud' },
      line: { es: 'Dejas nubes tóxicas de {v} de daño', en: 'You leave toxic clouds that deal {v}' },
      note: { es: 'a tu paso', en: 'in your wake' } },
    { charm: 'kingsoul', when: 'side', stat: 'soul.passive', show: 'plus',
      title: { es: 'Alma', en: 'Soul' },
      line: { es: 'Generas {v} de alma por segundo: 4 cada 2 s', en: 'You generate {v} soul per second: 4 every 2 s' },
      note: { es: 'por segundo', en: 'per second' } },
    // On hitting
    { charm: 'elegy', when: 'strike', stat: 'nail.elegy',
      title: { es: 'Rayos', en: 'Beams' },
      line: { es: 'Con la vida completa, el aguijón dispara rayos de {v}', en: 'At full health, your nail fires beams that deal {v}' },
      note: { es: 'con la vida completa', en: 'at full health' } },
    { charm: 'fury', when: 'strike', stat: 'nail.damage', hp: 1,
      title: { es: 'Con 1 máscara', en: 'At 1 mask' },
      line: { es: 'Con 1 máscara, el aguijón pega {v}', en: 'At 1 mask, your nail hits for {v}' },
      note: { es: 'daño del aguijón', en: 'nail damage' } },
    { charm: 'glory', when: 'strike', art: ['arts', 'great'], stat: 'nail.artCharge',
      title: { es: 'Carga de artes', en: 'Art charge' },
      line: { es: 'Las artes del aguijón se cargan en {v}', en: 'Nail Arts charge in {v}' },
      note: { es: '1,35 s sin él', en: '1.35 s without it' } },
    { charm: 'heavy', when: 'strike', stat: 'nail.knockback', show: 'pctOver',
      title: { es: 'Empuje', en: 'Knockback' },
      line: { es: 'Los enemigos salen despedidos un {v} más lejos', en: 'Enemies are knocked back {v} further' },
      note: { es: 'más lejos', en: 'further' } },
    { charm: 'steady', when: 'strike',
      title: { es: 'Sin retroceso', en: 'No recoil' },
      line: { es: 'No retrocedes al golpear con el aguijón', en: 'You no longer recoil when your nail hits' },
      note: { es: 'al golpear', en: 'when you hit' } },
    // On taking damage
    { charm: 'thorns', when: 'hit', art: ['effects', 'thorns'], stat: 'nail.thorns',
      title: { es: 'Espinas', en: 'Thorns' },
      line: { es: 'Brotan espinas: {v} de daño a tu alrededor', en: 'Thorns burst out: {v} damage around you' },
      note: { es: 'hasta 2 golpes', en: 'up to 2 hits' } },
    { charm: 'grubsong', when: 'hit', art: ['effects', 'grub'], stat: 'soul.onHit', show: 'plus',
      title: { es: 'Alma', en: 'Soul' },
      line: { es: 'Ganas {v} de alma', en: 'You gain {v} soul' },
      note: { es: 'al recibir daño', en: 'when damaged' } },
    { charm: 'stalwart', when: 'hit', stat: 'health.iframes',
      title: { es: 'Invulnerable', en: 'Invulnerable' },
      line: { es: 'Eres invulnerable {v} (1,3 s sin ella) y retrocedes menos', en: 'You stay invulnerable for {v} (1.3 s without it) and recoil less' },
      note: { es: '1,3 s sin ella', en: '1.3 s without it' } },
    { charm: 'melody', when: 'hit', stat: 'health.carefreeAvg',
      title: { es: 'Bloqueo', en: 'Block' },
      line: { es: 'Bloquea el golpe un {v} de las veces, y más cuantos más recibes', en: 'Blocks the hit {v} of the time, and more the more you are hit' },
      note: { es: 'de media', en: 'on average' } },
    { charm: 'hiveblood', when: 'hit', art: ['hud', 'hiveblood'], artWith: { joni: ['hud', 'hiveblood-joni'] }, stat: 'health.hivebloodRegen',
      title: { es: 'Regeneración', en: 'Regeneration' },
      line: { es: 'Recuperas la última máscara tras {v} sin recibir daño', en: 'Your last lost mask comes back after {v} without damage' },
      note: { es: 'sin recibir daño', en: 'without damage' } },
    // On focusing
    { charm: 'spore', when: 'focus', stat: 'heal.spore',
      title: { es: 'Esporas', en: 'Spores' },
      line: { es: 'Sueltas una nube de esporas: {v} de daño', en: 'You release a spore cloud: {v} damage' },
      note: { es: 'durante 4,1 s', en: 'over 4.1 s' } },
    { charm: 'baldur', when: 'focus', art: ['hud', 'baldur'], stat: 'health.baldurBlocks',
      title: { es: 'Coraza', en: 'Shell' },
      line: { es: 'Una coraza para {v} golpes; se repara al descansar', en: 'A shell blocks {v} hits; it repairs when you rest' },
      note: { es: 'golpes bloqueados', en: 'hits blocked' } },
    { charm: 'unn', when: 'focus', stat: 'move.unnSpeed',
      title: { es: 'Forma de babosa', en: 'Slug form' },
      line: { es: 'Te mueves mientras te curas, a {v}', en: 'You move while you heal, at {v}' },
      note: { es: 'mientras te curas', en: 'while healing' } },
    { charm: 'joni', when: 'focus', art: ['abilities', 'focus'], bad: true,
      title: { es: 'Sin curación', en: 'No healing' },
      line: { es: 'No puedes curarte con Concentración', en: 'You cannot heal with Focus' },
      note: { es: 'Bendición de Joni', en: "Joni's Blessing" } },
    // On moving
    { charm: 'dashmaster', when: 'move', art: ['abilities', 'cloak1'], stat: 'move.dashCooldown',
      title: { es: 'Avance rápido', en: 'Dash' },
      line: { es: 'Avanzas rápidamente cada {v}, también hacia abajo', en: 'You dash every {v}, downwards too' },
      note: { es: 'también hacia abajo', en: 'downwards too' } },
    { charm: 'sprintmaster', when: 'move', stat: 'move.run',
      title: { es: 'Carrera', en: 'Running' },
      line: { es: 'Corres a {v} (8,3 sin él)', en: 'You run at {v} (8.3 without it)' },
      note: { es: '8,3 u/s sin él', en: '8.3 u/s without it' } },
    { charm: 'sharpshadow', when: 'move', art: ['abilities', 'cloak2'], stat: 'nail.sharpShadow',
      title: { es: 'Avance rápido sombrío', en: 'Shadow Dash' },
      line: { es: 'El avance rápido sombrío corta por {v} y llega un 40 % más lejos', en: 'Your Shadow Dash cuts for {v} and reaches 40% further' },
      note: { es: 'y llega más lejos', en: 'and reaches further' } },
    // With the Dream Nail
    { charm: 'wielder', when: 'dream', art: ['abilities', 'dream1'], stat: 'soul.dreamNail',
      title: { es: 'Alma onírica', en: 'Dream soul' },
      line: { es: 'Cada golpe da {v} de alma y carga en 1,1 s; más Esencia', en: 'Each hit gives {v} soul and it charges in 1.1 s; more Essence' },
      note: { es: 'carga en 1,1 s', en: 'charges in 1.1 s' } },
    // Exploring
    { charm: 'compass', when: 'explore', art: ['effects', 'map'],
      title: { es: 'Tu posición', en: 'Your position' },
      line: { es: 'Ves dónde estás al abrir el mapa', en: 'You see where you are when you open the map' },
      note: { es: 'en el mapa', en: 'on the map' } },
    { charm: 'swarm', when: 'explore', art: ['effects', 'geo'],
      title: { es: 'Geo automático', en: 'Auto geo' },
      line: { es: 'Un enjambre te recoge el geo suelto', en: 'A swarm picks up loose geo for you' },
      note: { es: 'el geo suelto', en: 'loose geo' } },
    { charm: ['fgreed', 'ugreed'], when: 'explore', art: ['effects', 'geo'], stat: 'abil.geoBonus', show: 'pctOver',
      title: { es: 'Más geo', en: 'More geo' },
      line: { es: 'Los enemigos sueltan un {v} más de geo', en: 'Enemies drop {v} more geo' },
      note: { es: 'de los enemigos', en: 'from enemies' } },
    { charm: 'crest', when: 'explore', stat: 'abil.legEater',
      title: { es: 'Descuento', en: 'Discount' },
      line: { es: 'Comepiernas te rebaja un {v}', en: 'Leg Eater takes {v} off' },
      note: { es: 'en Comepiernas', en: 'at Leg Eater' } },
    { charm: 'voidheart', when: 'explore',
      title: { es: 'El Vacío, en paz', en: 'The Void at peace' },
      line: { es: 'Las criaturas del Vacío dejan de atacarte', en: 'Void creatures stop attacking you' },
      note: { es: 'criaturas del Vacío', en: 'Void creatures' } },
  ];
  // The fragile ones ("If you fall") don't go here: they come out together, on one plate, from CHARMS[].fragile.

  /* ── Definition of the sheet's stats ─────────────────────────────────
     fmt: int | dec1 | dec2 | dec3 | sec | pct | mult | speed | flag
     better: up | down | none  (to colour the deltas; for flag: on | off)
     short: short label for the impact badges */
  const GROUPS = [
    { id: 'health', es: 'Salud',                   en: 'Health' },
    { id: 'soul',   es: 'Alma',                    en: 'Soul' },
    { id: 'nail',   es: 'Aguijón',                 en: 'Nail' },
    { id: 'spell',  es: 'Hechizos',                en: 'Spells' },
    { id: 'heal',   es: 'Curación',                en: 'Healing' },
    { id: 'move',   es: 'Movimiento',              en: 'Movement' },
    { id: 'pet',    es: 'Compañeros',              en: 'Companions' },
    { id: 'abil',   es: 'Habilidades y efectos',   en: 'Abilities and effects' },
  ];

  const STAT_DEFS = [
    // Health
    { id: 'health.masks', group: 'health', fmt: 'int', better: 'up', weight: 9,
      label: { es: 'Máscaras', en: 'Masks' }, short: { es: 'máscaras', en: 'masks' } },
    { id: 'health.lifeblood', group: 'health', fmt: 'int', better: 'up', weight: 8,
      label: { es: 'Máscaras de saviavida', en: 'Lifeblood masks' }, short: { es: 'saviavida', en: 'lifeblood' } },
    { id: 'health.total', group: 'health', fmt: 'int', better: 'up', weight: 7,
      label: { es: 'Salud total', en: 'Total health' }, short: { es: 'salud', en: 'health' } },
    { id: 'health.damageMult', group: 'health', fmt: 'mult', better: 'down', weight: 9,
      label: { es: 'Daño recibido por golpe', en: 'Damage taken per hit' }, short: { es: 'daño recibido', en: 'damage taken' } },
    { id: 'health.hitsToDie', group: 'health', fmt: 'int', better: 'up', weight: 6,
      // It's ceil(health ÷ damage per hit): the hit that kills you, not the last one you survive.
      label: { es: 'Golpes hasta morir', en: 'Hits until you die' }, short: { es: 'golpes hasta morir', en: 'hits until you die' } },
    { id: 'health.iframes', group: 'health', fmt: 'sec', better: 'up', weight: 5,
      label: { es: 'Invulnerabilidad tras un golpe', en: 'Invulnerability after a hit' }, short: { es: 'invulnerabilidad', en: 'invulnerability' } },
    { id: 'health.recoil', group: 'health', fmt: 'sec', better: 'down', weight: 3,
      label: { es: 'Aturdimiento tras un golpe', en: 'Stun after a hit' }, short: { es: 'aturdimiento', en: 'stun' } },
    { id: 'health.hivebloodRegen', group: 'health', fmt: 'sec', better: 'down', weight: 6,
      label: { es: 'Regeneración pasiva de 1 máscara', en: 'Passive regeneration of 1 mask' }, short: { es: 'regeneración', en: 'regeneration' } },
    { id: 'health.carefreeAvg', group: 'health', fmt: 'pct', better: 'up', weight: 6,
      label: { es: 'Probabilidad media de bloquear un golpe', en: 'Average chance to block a hit' }, short: { es: 'bloqueo', en: 'block' } },
    { id: 'health.baldurBlocks', group: 'health', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Golpes bloqueados al concentrarte', en: 'Hits blocked while focusing' }, short: { es: 'coraza', en: 'shell' } },
    // Soul
    { id: 'soul.main', group: 'soul', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Alma del medidor principal', en: 'Main soul meter' }, short: { es: 'alma máx.', en: 'max soul' } },
    { id: 'soul.reserve', group: 'soul', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Alma de reserva', en: 'Reserve soul' }, short: { es: 'reserva', en: 'reserve' } },
    { id: 'soul.total', group: 'soul', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Alma total', en: 'Total soul' }, short: { es: 'alma total', en: 'total soul' } },
    { id: 'soul.perHit', group: 'soul', fmt: 'int', better: 'up', weight: 8,
      label: { es: 'Alma por golpe de aguijón', en: 'Soul per nail hit' }, short: { es: 'alma/golpe', en: 'soul per hit' } },
    { id: 'soul.perHitReserve', group: 'soul', fmt: 'int', better: 'up', weight: 3,
      label: { es: 'Alma a la reserva por golpe', en: 'Reserve soul per hit' }, short: { es: 'reserva/golpe', en: 'reserve per hit' } },
    { id: 'soul.dreamNail', group: 'soul', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Alma por golpe de Aguijón Onírico', en: 'Soul per Dream Nail hit' }, short: { es: 'alma onírica', en: 'dream soul' } },
    { id: 'soul.dreamCharge', group: 'soul', fmt: 'sec', better: 'down', weight: 4,
      label: { es: 'Tiempo de carga del Aguijón Onírico', en: 'Dream Nail charge time' }, short: { es: 'carga onírica', en: 'dream charge' } },
    { id: 'soul.onHit', group: 'soul', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Alma al recibir daño', en: 'Soul when damaged' }, short: { es: 'alma al ser golpeado', en: 'soul when hit' } },
    { id: 'soul.passive', group: 'soul', fmt: 'dec1', better: 'up', weight: 6,
      label: { es: 'Alma pasiva por segundo', en: 'Passive soul per second' }, short: { es: 'alma pasiva', en: 'passive soul' } },
    { id: 'soul.spellCost', group: 'soul', fmt: 'int', better: 'down', weight: 8,
      label: { es: 'Coste de un hechizo', en: 'Spell cost' }, short: { es: 'coste hechizo', en: 'spell cost' } },
    { id: 'soul.focusCost', group: 'soul', fmt: 'int', better: 'down', weight: 2,
      label: { es: 'Coste de Concentración', en: 'Focus cost' }, short: { es: 'coste curación', en: 'heal cost' } },
    { id: 'soul.hitsPerFocus', group: 'soul', fmt: 'int', better: 'down', weight: 5,
      label: { es: 'Golpes para una Concentración', en: 'Hits for one Focus' }, short: { es: 'golpes/curación', en: 'hits per heal' } },
    { id: 'soul.hitsPerSpell', group: 'soul', fmt: 'int', better: 'down', weight: 5,
      label: { es: 'Golpes para un hechizo', en: 'Hits for one spell' }, short: { es: 'golpes/hechizo', en: 'hits per spell' } },
    { id: 'soul.castsPerFull', group: 'soul', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Hechizos con el alma llena', en: 'Casts on a full soul' }, short: { es: 'hechizos seguidos', en: 'casts in a row' } },
    // Nail
    { id: 'nail.damage', group: 'nail', fmt: 'int', better: 'up', weight: 10,
      label: { es: 'Daño del aguijón', en: 'Nail damage' }, short: { es: 'daño', en: 'damage' } },
    { id: 'nail.cooldown', group: 'nail', fmt: 'sec', better: 'down', weight: 6,
      label: { es: 'Tiempo entre golpes', en: 'Time between hits' }, short: { es: 'entre golpes', en: 'between hits' } },
    { id: 'nail.aps', group: 'nail', fmt: 'dec2', better: 'up', weight: 5,
      label: { es: 'Golpes por segundo', en: 'Hits per second' }, short: { es: 'golpes/s', en: 'hits/s' } },
    { id: 'nail.dps', group: 'nail', fmt: 'dec1', better: 'up', weight: 8,
      label: { es: 'Daño por segundo con el aguijón', en: 'Nail damage per second' }, short: { es: 'DPS', en: 'DPS' } },
    { id: 'nail.hitsInIframes', group: 'nail', fmt: 'int', better: 'up', weight: 4,
      label: { es: 'Golpes que caben en la invulnerabilidad', en: 'Hits that fit in the invulnerability' }, short: { es: 'golpes invulnerable', en: 'hits while invulnerable' } },
    { id: 'nail.range', group: 'nail', fmt: 'mult', better: 'up', weight: 7,
      label: { es: 'Alcance del aguijón', en: 'Nail range' }, short: { es: 'alcance', en: 'range' } },
    { id: 'nail.artCharge', group: 'nail', fmt: 'sec', better: 'down', weight: 6,
      label: { es: 'Carga de las artes del aguijón', en: 'Nail Art charge' }, short: { es: 'carga de artes', en: 'art charge' } },
    { id: 'nail.greatSlash', group: 'nail', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Gran corte', en: 'Great Slash' }, short: { es: 'Gran corte', en: 'Great Slash' } },
    { id: 'nail.dashSlash', group: 'nail', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Corte veloz', en: 'Dash Slash' }, short: { es: 'Corte veloz', en: 'Dash Slash' } },
    { id: 'nail.cyclone', group: 'nail', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Corte ciclón (por golpe)', en: 'Cyclone Slash (per hit)' }, short: { es: 'Corte ciclón', en: 'Cyclone Slash' } },
    { id: 'nail.bestBurst', group: 'nail', fmt: 'int', better: 'up', weight: 8,
      label: { es: 'Golpe más fuerte', en: 'Strongest attack' }, short: { es: 'golpe más fuerte', en: 'strongest attack' } },
    { id: 'nail.sharpShadow', group: 'nail', fmt: 'int', better: 'up', weight: 7,
      label: { es: 'Daño del avance rápido sombrío', en: 'Shadow Dash damage' }, short: { es: 'avance rápido sombrío', en: 'shadow dash' } },
    { id: 'nail.elegy', group: 'nail', fmt: 'int', better: 'up', weight: 7,
      label: { es: 'Rayo de la Elegía', en: 'Elegy beam' }, short: { es: 'rayo', en: 'beam' } },
    { id: 'nail.thorns', group: 'nail', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Espinas al recibir daño', en: 'Thorns when damaged' }, short: { es: 'espinas', en: 'thorns' } },
    { id: 'nail.dreamshield', group: 'nail', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Daño del Escudo Onírico', en: 'Dreamshield damage' }, short: { es: 'escudo', en: 'shield' } },
    { id: 'nail.knockback', group: 'nail', fmt: 'mult', better: 'up', weight: 4,
      label: { es: 'Empuje al enemigo', en: 'Enemy knockback' }, short: { es: 'empuje', en: 'knockback' } },
    // Spells
    { id: 'spell.vs', group: 'spell', fmt: 'int', better: 'up', weight: 8, short: null,
      label: { es: 'Espíritu vengativo', en: 'Vengeful Spirit' } },
    { id: 'spell.dd', group: 'spell', fmt: 'int', better: 'up', weight: 8, short: null,
      label: { es: 'Salto desolador', en: 'Desolate Dive' } },
    { id: 'spell.hw', group: 'spell', fmt: 'int', better: 'up', weight: 8, short: null,
      label: { es: 'Espectros aulladores', en: 'Howling Wraiths' } },
    { id: 'spell.vsPerSoul', group: 'spell', fmt: 'dec2', better: 'up', weight: 3,
      label: { es: 'Daño por alma (Espíritu vengativo)', en: 'Damage per soul (Vengeful Spirit)' }, short: { es: 'daño/alma', en: 'damage per soul' } },
    { id: 'spell.ddPerSoul', group: 'spell', fmt: 'dec2', better: 'up', weight: 3,
      label: { es: 'Daño por alma (Salto desolador)', en: 'Damage per soul (Desolate Dive)' }, short: { es: 'daño/alma', en: 'damage per soul' } },
    { id: 'spell.hwPerSoul', group: 'spell', fmt: 'dec2', better: 'up', weight: 3,
      label: { es: 'Daño por alma (Espectros aulladores)', en: 'Damage per soul (Howling Wraiths)' }, short: { es: 'daño/alma', en: 'damage per soul' } },
    // Healing
    { id: 'heal.canFocus', group: 'heal', fmt: 'flag', better: 'on', weight: 9,
      label: { es: 'Puedes curarte con Concentración', en: 'You can heal with Focus' }, short: { es: 'curarte', en: 'can heal' } },
    { id: 'heal.masksPerFocus', group: 'heal', fmt: 'int', better: 'up', weight: 8,
      label: { es: 'Máscaras por Concentración', en: 'Masks per Focus' }, short: { es: 'máscaras/curación', en: 'masks per heal' } },
    { id: 'heal.timePerFocus', group: 'heal', fmt: 'sec', better: 'down', weight: 7,
      label: { es: 'Tiempo de una Concentración', en: 'Time for one Focus' }, short: { es: 'tiempo de curación', en: 'heal time' } },
    { id: 'heal.timePerMask', group: 'heal', fmt: 'sec', better: 'down', weight: 6,
      label: { es: 'Tiempo por máscara curada', en: 'Time per mask healed' }, short: { es: 'tiempo/máscara', en: 'time per mask' } },
    { id: 'heal.soulPerMask', group: 'heal', fmt: 'dec1', better: 'down', weight: 5,
      label: { es: 'Alma por máscara curada', en: 'Soul per mask healed' }, short: { es: 'alma/máscara', en: 'soul per mask' } },
    { id: 'heal.fullHeal', group: 'heal', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Máscaras curables con el alma llena', en: 'Masks healable on a full soul' }, short: { es: 'curación total', en: 'total healing' } },
    { id: 'heal.spore', group: 'heal', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Nube de esporas al concentrarte', en: 'Spore cloud when focusing' }, short: { es: 'esporas', en: 'spores' } },
    { id: 'heal.sporeRadius', group: 'heal', fmt: 'mult', better: 'up', weight: 3,
      label: { es: 'Radio de la nube de esporas', en: 'Spore cloud radius' }, short: { es: 'radio esporas', en: 'spore radius' } },
    { id: 'heal.moveWhileFocus', group: 'heal', fmt: 'flag', better: 'on', weight: 6,
      label: { es: 'Moverte mientras te concentras', en: 'Move while focusing' }, short: { es: 'moverte al curar', en: 'move while healing' } },
    // Movement
    { id: 'move.run', group: 'move', fmt: 'speed', better: 'up', weight: 7,
      label: { es: 'Velocidad de carrera', en: 'Running speed' }, short: { es: 'velocidad', en: 'speed' } },
    { id: 'move.dashCooldown', group: 'move', fmt: 'sec', better: 'down', weight: 6,
      label: { es: 'Tiempo entre avances rápidos', en: 'Time between dashes' }, short: { es: 'entre avances rápidos', en: 'between dashes' } },
    { id: 'move.dashDown', group: 'move', fmt: 'flag', better: 'on', weight: 5,
      label: { es: 'Avance rápido hacia abajo', en: 'Downward dash' }, short: { es: 'avanzar rápidamente abajo', en: 'dash down' } },
    { id: 'move.shadowCooldown', group: 'move', fmt: 'sec', better: 'down', weight: 3,
      label: { es: 'Tiempo entre avances rápidos sombríos', en: 'Time between Shadow Dashes' }, short: { es: 'entre avances rápidos sombríos', en: 'between shadow dashes' } },
    { id: 'move.shadowSpeed', group: 'move', fmt: 'speed', better: 'up', weight: 5,
      label: { es: 'Velocidad del avance rápido sombrío', en: 'Shadow Dash speed' }, short: { es: 'avance rápido sombrío', en: 'shadow dash' } },
    { id: 'move.unnSpeed', group: 'move', fmt: 'speed', better: 'up', weight: 4,
      label: { es: 'Velocidad mientras te concentras', en: 'Speed while focusing' }, short: { es: 'velocidad al curar', en: 'speed while healing' } },
    // Companions
    { id: 'pet.weaverling', group: 'pet', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Tejedoras: daño por golpe', en: 'Weaverlings: damage per hit' }, short: { es: 'tejedoras', en: 'weaverlings' } },
    { id: 'pet.weaverlingSoul', group: 'pet', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Alma por golpe de tejedora', en: 'Soul per Weaverling hit' }, short: { es: 'alma de tejedoras', en: 'weaverling soul' } },
    { id: 'pet.weaverlingSpeed', group: 'pet', fmt: 'mult', better: 'up', weight: 3,
      label: { es: 'Velocidad de las tejedoras', en: 'Weaverling speed' }, short: { es: 'tejedoras', en: 'weaverlings' } },
    { id: 'pet.hatchling', group: 'pet', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Crías: daño de contacto', en: 'Hatchlings: contact damage' }, short: { es: 'crías', en: 'hatchlings' } },
    { id: 'pet.hatchlingCloud', group: 'pet', fmt: 'int', better: 'up', weight: 4,
      label: { es: 'Crías: nube al explotar', en: 'Hatchlings: cloud on burst' }, short: { es: 'nube de crías', en: 'hatchling cloud' } },
    { id: 'pet.hatchlingCost', group: 'pet', fmt: 'int', better: 'down', weight: 3,
      label: { es: 'Alma por cría', en: 'Soul per hatchling' }, short: { es: 'coste de cría', en: 'hatchling cost' } },
    { id: 'pet.grimmchild', group: 'pet', fmt: 'int', better: 'up', weight: 6,
      label: { es: 'Niño de Grimm: daño por disparo', en: 'Grimmchild: damage per shot' }, short: { es: 'Niño de Grimm', en: 'Grimmchild' } },
    { id: 'pet.grimmchildDps', group: 'pet', fmt: 'dec1', better: 'up', weight: 5,
      label: { es: 'Niño de Grimm: daño por segundo', en: 'Grimmchild: damage per second' }, short: { es: 'DPS de Grimm', en: 'Grimmchild DPS' } },
    { id: 'pet.crestCloud', group: 'pet', fmt: 'int', better: 'up', weight: 5,
      label: { es: 'Nube tóxica del Blasón', en: "Defender's Crest cloud" }, short: { es: 'nube tóxica', en: 'toxic cloud' } },
    { id: 'pet.dreamshieldSize', group: 'pet', fmt: 'mult', better: 'up', weight: 3,
      label: { es: 'Tamaño del Escudo Onírico', en: 'Dreamshield size' }, short: { es: 'escudo', en: 'shield' } },
    // Abilities and effects
    { id: 'abil.overcharmed', group: 'abil', fmt: 'flag', better: 'off', weight: 9,
      label: { es: 'Sobrecarga', en: 'Overcharmed' }, short: { es: 'sobrecargado', en: 'overcharmed' } },
    { id: 'abil.noRecoil', group: 'abil', fmt: 'flag', better: 'on', weight: 6,
      label: { es: 'Sin retroceso al golpear', en: 'No recoil when hitting' }, short: { es: 'sin retroceso', en: 'no recoil' } },
    { id: 'abil.geoPickup', group: 'abil', fmt: 'flag', better: 'on', weight: 6,
      label: { es: 'Recoges el geo automáticamente', en: 'Geo is picked up automatically' }, short: { es: 'geo automático', en: 'auto geo' } },
    { id: 'abil.mapPosition', group: 'abil', fmt: 'flag', better: 'on', weight: 6,
      label: { es: 'Ves tu posición en el mapa', en: 'You see your position on the map' }, short: { es: 'posición en el mapa', en: 'map position' } },
    { id: 'abil.geoBonus', group: 'abil', fmt: 'mult', better: 'up', weight: 6,
      label: { es: 'Geo que sueltan los enemigos', en: 'Geo dropped by enemies' }, short: { es: 'geo', en: 'geo' } },
    { id: 'abil.blockProjectiles', group: 'abil', fmt: 'flag', better: 'on', weight: 5,
      label: { es: 'Un escudo bloquea proyectiles', en: 'A shield blocks projectiles' }, short: { es: 'bloquea proyectiles', en: 'blocks projectiles' } },
    { id: 'abil.legEater', group: 'abil', fmt: 'pct', better: 'up', weight: 3,
      label: { es: 'Descuento de Comepiernas', en: 'Leg Eater discount' }, short: { es: 'descuento', en: 'discount' } },
    { id: 'abil.essence', group: 'abil', fmt: 'mult', better: 'up', weight: 3,
      label: { es: 'Probabilidad de Esencia al matar', en: 'Essence chance on kill' }, short: { es: 'esencia', en: 'essence' } },
    { id: 'abil.fragile', group: 'abil', fmt: 'int', better: 'down', weight: 4,
      label: { es: 'Amuletos que se rompen al morir', en: 'Charms that break on death' }, short: { es: 'frágiles', en: 'fragile' } },
    { id: 'abil.voidNeutral', group: 'abil', fmt: 'flag', better: 'on', weight: 5,
      label: { es: 'Las criaturas del Vacío no te atacan', en: "Void creatures don't attack you" }, short: { es: 'Vacío neutral', en: 'void neutral' } },
  ];

  const STAT_BY_ID = Object.fromEntries(STAT_DEFS.map((d) => [d.id, d]));

  HK.data = {
    NAILS, NAIL, ARTS, ABILITIES, EQUIPMENT, KEY_ITEMS, CARRIED, SHARDS, FRAGMENTS, COMPLETION_NAMES, COLLECTIBLE_KINDS, SPELLS, SPELL_COST, SPELL_COST_TWISTER,
    SOUL, HEALTH, FOCUS, MOVE, PETS, CHARM_NOTCHES,
    CHARMS, CHARM_BY_ID, EFFECT_WHEN, CHARM_EFFECTS, GROUPS, STAT_DEFS, STAT_BY_ID, ART, art,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.data;
})();
