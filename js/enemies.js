/* js/enemies.js — Hollow Knight's enemies and bosses, for the simulator.
   Source: kb/ (which in turn comes from hollowknight.wiki in September 2026):
     · health and area        kb/data/hp.json and kb/data/entities.json
     · Godhome health         kb/03-bosses.md ("At" Attuned, "AsRa" Ascended/Radiant)
     · attacks in Spanish     the Spanish wiki, each boss's «Comportamiento y tácticas»
     · attacks in English     kb/data/tactics-en.txt
     · who deals 2 masks      kb/01-mechanics.md §1

   How to read each entry:
     hp / at / asra   an integer, or five values = health by your nail level (0..4).
                      null = it can't be damaged. at/asra missing = it isn't in Godhome.
     dmg              masks it takes from you per hit. 1 unless the wiki says otherwise;
                      a specific attack can carry its own dmg.
     attacks          bosses only. A common enemy only deals contact damage.
                      warn = why hitting there is no use (immunity or damage cap).
                      by = who does it, in a boss with several characters: the English name
                      of its part (the Jump is the Tamer's; the Roll, the Beast's). With no
                      by, all of them do it. A part none of them belong to doesn't attack:
                      False Knight's maggot is its stagger.
                      proj = whether it's a projectile: 'block' if Dreamshield stops it,
                      'pierce' if it passes through (the two lists on the "Dreamshield" page).
     spellTwice       Vengeful Spirit or Shade Soul can hit it twice: because it recoils from
                      the hit (the wiki says so of Broken Vessel and Failed Champion; kb/03-bosses.md,
                      of Lost Kin) or because it moves with the projectile (Xero, on the wiki).
     noSoul           hitting it with the nail gives no soul: on the entry, the whole fight (the Collector,
                      Failed Champion, the Sibling); on a bar, only that bar (False Knight's
                      armour). The Dream Nail and the weaverlings with Grubsong do draw it.
     stagger          the stagger, in hits (kb/data/staggers.json, the wiki's {{Stagger}}
                      template): hits consecutive or not, combo if each one lands within window
                      seconds of the previous. godhome = Zote's in Godhome, where he fights as on his
                      third time. bats/cap: Grimm and the Nightmare King scatter into bats for
                      those seconds, hitting them doesn't get them up and at most cap is taken
                      from them. False Knight, Failed Champion and the two Radiances are staggered
                      by health: those are already phases.
     phases           the bosses that are NOT a single bar: each phase brings the bars that
                      are alive at the same time. When all of them fall, the next one comes in.
                      An entry without phases is one phase with one bar, and the engine synthesises it.
                      A bar with art carries its own picture in the arena
                      (assets/enemies/<art>.png): the one that is another character (the Tamer
                      and the Beast, Oro and Mato) or the same one in another state (False
                      Knight's maggot). Without art, the entry's portrait (tools/fetch-enemies.js).
                      A phase with note explains it on entry (False Knight breaks the
                      floor before the last maggot).
                      phasesAt / phasesAsra when the structure is different in Godhome (False
                      Knight and Failed Champion lose the maggot there).
     pool / active    Watcher Knights: there are 6 but only 2 standing; when one falls the next comes in.
     onDeath          Oblobbles: when one dies, the other raises its cap and heals.
     decisive         Tamer: if the Beast falls, the fight is over.
     summons          what it summons during the fight. The id points to another entry here, so
                      it reuses its name and portrait; hp overrides it when the boss changes it
                      (the Infected Balloon is worth 1 with Broken Vessel, not 15).
                      diffs = the difficulties it appears on; without diffs, all of them. The
                      Collector changes repertoire on Ascended, Gruz Mother doesn't release
                      Gruzzers in Godhome and Uumuu only summons Oomas there. Common enemies
                      summon too: Aspid Mother, Carver Hatcher, Elder Baldur, Husk Hive and the
                      husks that rise as Corpse Creepers (review of the wiki's 180 pages,
                      September 2026).
     notes            notices for the whole entry.
     dream            dream boss: losing doesn't kill you, so fragile charms don't break.
     dreamNail        false if the Dream Nail draws no soul from it; { fromPhase } if only from that phase.
     void             with Void Heart it doesn't attack (the Siblings and the Void Tendrils).
     noFlukes         Flukenest doesn't damage it except in the air ("Flukenest" page: the Hollow
                      Knight and Pure Vessel). In the arena, its flukes start with none landing.

   Three summon notes were wrong and have been corrected against the wiki and kb/03-bosses.md:
   Vengefly King calls each Vengefly with a 75% chance (not "at 75% health") and its
   Vengeflies have 8 health, not 6; of the 12 Hivelings the Hive Knight spits, 7 come down;
   and Flukemarm's Flukefeys go up to 6 at once, not "non-stop".

   Two wiki errata are corrected, as in kb/README.md: False Knight adds up to
   355 (65×3 + 40×4), not 255; and Gorb carries his own values, not Galien's.

   Nothing is translated by hand. The Spanish names (bosses, enemies, areas, summons) are
   the game's text: the `{{Localisation|ESname = …}}` of each page of hollowknight.wiki,
   checked against hollowknight.fandom.com/es. The attacks have no name in the game: they
   come from the «Comportamiento y tácticas» section of each boss's Spanish page, and the
   ones that page doesn't name stay as they were (September 2026 audit). The simulator's
   search looks in both languages, so the English name still finds each one. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  const FOES = [
  { id: 'gruz-mother', kind: 'boss', name: { es: 'Madre Gruz', en: 'Gruz Mother' },
    zone: { es: 'Cruces Olvidados', en: 'Forgotten Crossroads' }, hp: 90, at: 650, asra: 945, dmg: 1,
    summons: [
      { id: 'gruzzer', diffs: ['base'], note: { es: 'al morir, 7–8; en el Coliseo no', en: 'on death, 7–8; not in the Colosseum' } }
    ],
    attacks: [
      { es: 'Embestida', en: 'Charge' },
      { es: 'Golpe', en: 'Wild Slam' },
      { es: 'Vuelo', en: 'Fly' }
    ] },
  { id: 'vengefly-king', kind: 'boss', name: { es: 'Rey vengamosca', en: 'Vengefly King' },
    zone: { es: 'Sendero Verde', en: 'Greenpath' }, hp: 55, at: 450, asra: 1165, dmg: 1,
    // On Ascended a second king appears on the opposite side: 735 the left one, 430 the right one.
    phasesAt: [{ parts: [{ name: { es: 'Rey vengamosca', en: 'Vengefly King' }, hp: 450 }] }],
    phasesAsra: [{ parts: [
      { name: { es: 'Rey vengamosca', en: 'Vengefly King' }, hp: 735 },
      { name: { es: 'Rey vengamosca', en: 'Vengefly King' }, hp: 430 }] }],
    summons: [
      { id: 'vengefly', diffs: ['base'], note: { es: '2 por grito, un 75 % cada una; hasta 10 gritos', en: '2 per scream, 75% chance each; up to 10 screams' } },
      { id: 'vengefly', diffs: ['at', 'asra', 'radiant'], note: { es: '2 por grito, un 75 % cada una; hasta 15 gritos y 5 a la vez', en: '2 per scream, 75% chance each; up to 15 screams, 5 at once' } }
    ],
    attacks: [
      { es: 'Barrido', en: 'Swoop' },
      { es: 'Grito invocador', en: 'Summoning Scream' }
    ] },
  { id: 'brooding-mawlek', kind: 'boss', name: { es: 'Mawlek Incubador', en: 'Brooding Mawlek' },
    zone: { es: 'Cruces Olvidados', en: 'Forgotten Crossroads' }, hp: 300, at: 1050, asra: 1050, dmg: 1,
    attacks: [
      { es: 'Corte', en: 'Slash' },
      { es: 'Escupitajo', en: 'Spit', proj: 'block' },
      { es: 'Salto', en: 'Leap' },
      { es: 'Vómito', en: 'Vomit', proj: 'block' }
    ] },
  { id: 'false-knight', kind: 'boss', name: { es: 'Falso Caballero', en: 'False Knight' },
    zone: { es: 'Cruces Olvidados', en: 'Forgotten Crossroads' }, hp: 355, at: 780, asra: 1680, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 65, noSoul: true }] },
        { parts: [{ name: { es: 'Gusano', en: 'Maggot' }, hp: 40, art: 'false-knight-maggot' }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 65, noSoul: true }] },
        { parts: [{ name: { es: 'Gusano', en: 'Maggot' }, hp: 40, art: 'false-knight-maggot' }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 65, noSoul: true }] },
        { parts: [{ name: { es: 'Gusano', en: 'Maggot' }, hp: 40, art: 'false-knight-maggot' }] },
        // The finishing blow: the wiki, "4 head stages (40x4)", and the game has it scripted to die
        // right after 3 armour and 4 maggot stages.
        { parts: [{ name: { es: 'Gusano', en: 'Maggot' }, hp: 40, art: 'false-knight-maggot' }],
          note: { es: 'Tras la última Furia rompe el suelo y cae: bajas y rematas al gusano.', en: 'After one last Rage he breaks the floor and falls: drop down and finish off the Maggot.' } }
      ],
    phasesAt: [
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 260, noSoul: true }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 260, noSoul: true }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 260, noSoul: true }] }
      ],
    phasesAsra: [
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 560, noSoul: true }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 560, noSoul: true }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 560, noSoul: true }] }
      ],
    notes: [{ es: 'La armadura no da alma; solo el gusano', en: 'The armour gives no soul; only the Maggot' }],
    attacks: [
      { es: 'Salto', en: 'Leap', by: 'Armour' },
      { es: 'Carga', en: 'Charge', by: 'Armour' },
      { es: 'Mazazo', en: 'Slam', by: 'Armour', dmg: 2 },
      { es: 'Mazazo saltando', en: 'Leaping Bludgeon', by: 'Armour' },
      { es: 'Furia', en: 'Rage', by: 'Armour', proj: 'block' }
    ] },
  { id: 'hornet-protector', kind: 'boss', name: { es: 'Protectora Hornet', en: 'Hornet Protector' },
    stagger: { hits: 11, combo: 6, window: 2 },
    zone: { es: 'Sendero Verde', en: 'Greenpath' }, hp: 225, at: 900, asra: 1250, dmg: 1,
    attacks: [
      { es: 'Estocada', en: 'Lunge' },
      { es: 'Estocada aérea', en: 'Aerial Lunge' },
      { es: 'Tormenta de telaraña', en: 'Thread Storm' },
      { es: 'Lanzamiento', en: 'Needle Throw', proj: 'pierce' }
    ] },
  { id: 'mantis-lords', kind: 'boss', name: { es: 'Señores mantis', en: 'Mantis Lords' },
    zone: { es: 'Páramos Fúngicos', en: 'Fungal Wastes' }, hp: 530, at: 1100, asra: 1700, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Mantis', en: 'Mantis Lord' }, hp: 210, at: 400, asra: 500, art: 'mantis-lord' }] },
        { parts: [
          { name: { es: 'Mantis', en: 'Mantis Lord' }, hp: 160, at: 350, asra: 600, art: 'mantis-lord' },
          { name: { es: 'Mantis', en: 'Mantis Lord' }, hp: 160, at: 350, asra: 600, art: 'mantis-lord' }] }
      ],
    attacks: [
      { es: 'Embestida de lanza', en: 'Lance Dash' },
      { es: 'Caída de lanza', en: 'Lance Drop' },
      { es: 'Bumerán de hoja', en: 'Blade Boomerang', proj: 'block' }
    ] },
  { id: 'soul-warrior', kind: 'boss', name: { es: 'Guerrero del alma', en: 'Soul Warrior' },
    zone: { es: 'Ciudad de Lágrimas', en: 'City of Tears' }, hp: 180, at: 750, asra: 1000, dmg: 1,
    summons: [
      { id: 'folly', diffs: ['base'], note: { es: 'solo tras la Llave elegante (hasta 24) y en el Coliseo (hasta 9)', en: 'only behind the Elegant Key (up to 24) and in the Colosseum (up to 9)' } },
      { id: 'folly', diffs: ['asra', 'radiant'], note: { es: 'hasta 36', en: 'up to 36' } }
    ],
    attacks: [
      { es: 'Corte descendente', en: 'Dive-Slash' },
      { es: 'Corte veloz', en: 'Dash-Slash' },
      { es: 'Conjurar orbe', en: 'Conjure Orb', proj: 'block' },
      { es: 'Invocación', en: 'Summon' }
    ] },
  { id: 'soul-master', kind: 'boss', name: { es: 'Maestro de Almas', en: 'Soul Master' },
    stagger: { hits: 9, combo: 7, window: 1 },
    zone: { es: 'Santuario de Almas', en: 'Soul Sanctum' }, hp: 385, at: 950, asra: 1500, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Maestro de Almas', en: 'Soul Master' }, hp: 275, at: 600, asra: 900 }] },
        { parts: [{ name: { es: 'Maestro de Almas', en: 'Soul Master' }, hp: 110, at: 350, asra: 600 }] }
      ],
    attacks: [
      { es: 'Embestida', en: 'Dash' },
      { es: 'Orbe', en: 'Orb', proj: 'block' },
      { es: 'Reloj', en: 'Clock' },
      { es: 'Impacto', en: 'Slam' },
      { es: 'Impacto falso', en: 'Fake Out Slam' },
      { es: 'Impactos alterados', en: 'Altered Slams' },
      { es: 'Orbes alterados', en: 'Altered Orb', proj: 'block' }
    ] },
  { id: 'dung-defender', kind: 'boss', name: { es: 'Defensor del Estiércol', en: 'Dung Defender' },
    stagger: { hits: 16, combo: 8, window: 1 },
    notes: [{ es: 'Un Salto desolador o una Oscuridad descendente mientras está bajo tierra lo aturde de un golpe. Aquí no hay posición: no se simula',
              en: 'A Desolate Dive or Descending Dark while he is underground staggers him in one hit. There is no position here: it is not simulated' }],
    zone: { es: 'Canales Reales', en: 'Royal Waterways' }, hp: [700, 750, 800, 850, 900], at: 800, asra: 1100, dmg: 1,
    attacks: [
      { es: 'Lanzamiento', en: 'Dung Toss', proj: 'block' },
      { es: 'Estallido', en: 'Burst', proj: 'block' },
      { es: 'Combo de lanzamiento', en: 'Toss Combo', proj: 'block' },
      { es: 'Buceo', en: 'Dive' },
      { es: 'Entusiasmo', en: 'Zeal', proj: 'block' },
      { es: 'Evadir', en: 'Evade' }
    ] },
  { id: 'crystal-guardian', kind: 'boss', name: { es: 'Guardián de cristal', en: 'Crystal Guardian' },
    zone: { es: 'Cumbre de Cristal', en: 'Crystal Peak' }, hp: 280, at: 650, asra: 900, dmg: 1,
    attacks: [
      { es: 'Rayo láser', en: 'Laser Beam', proj: 'block' },
      { es: 'Rayo de cielo', en: 'Sky Beams', proj: 'block' },
      { es: 'Salto', en: 'Hop' }
    ] },
  { id: 'enraged-guardian', kind: 'boss', name: { es: 'Guardian Furioso', en: 'Enraged Guardian' },
    zone: { es: 'Cumbre de Cristal', en: 'Crystal Peak' }, hp: [450, 450, 500, 550, 600], at: 650, asra: 1250, dmg: 2,
    attacks: [
      { es: 'Rayo láser', en: 'Laser Beam', proj: 'block' },
      { es: 'Rayo de cielo', en: 'Sky Beams', proj: 'block' },
      { es: 'Salto', en: 'Hop' }
    ] },
  { id: 'watcher-knights', kind: 'boss', name: { es: 'Caballeros Vigía', en: 'Watcher Knights' },
    zone: { es: 'Ciudad de Lágrimas', en: 'City of Tears' }, hp: [1320, 1320, 1320, 1440, 1560], at: 2100, asra: 3600, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Caballero vigía', en: 'Watcher Knight' }, hp: [220, 220, 220, 240, 260], at: 350, asra: 600 }] }
      ],
    pool: 6, active: 2,
    notes: [{ es: 'Son 6, pero nunca más de 2 a la vez', en: 'Six of them, but never more than 2 at once' }],
    attacks: [
      { es: 'Doble corte', en: 'Double Slash' },
      { es: 'Rodar', en: 'Roll', warn: { es: 'inmune al aguijón, no a los hechizos', en: 'immune to the nail, not to spells' } },
      { es: 'Salto enrollado', en: 'Bouncing Roll' },
      { es: 'Rodada atrás', en: 'Back Roll' }
    ] },
  { id: 'uumuu', kind: 'boss', name: { es: 'Uumuu', en: 'Uumuu' },
    zone: { es: 'Cañón Nublado', en: 'Fog Canyon' }, hp: 300, at: 350, asra: 700, dmg: 1,
    summons: [
      { id: 'ooma', diffs: ['at', 'asra', 'radiant'], note: { es: '2 por chillido; su núcleo le rompe la membrana', en: '2 per screech; their core bursts its membrane' } }
    ],
    notes: [{ es: 'No se le puede dañar hasta que le revientan la membrana', en: 'Cannot be damaged until its membrane is burst' }],
    attacks: [
      { es: 'Descarga', en: 'Burst' },
      { es: 'Persecución', en: 'Chase' },
      { es: 'Invocación de Oomas', en: 'Summon' }
    ] },
  { id: 'nosk', kind: 'boss', name: { es: 'Nosk', en: 'Nosk' },
    zone: { es: 'Nido Profundo', en: 'Deepnest' }, hp: 680, at: 680, asra: 980, dmg: 1,
    attacks: [
      { es: 'Carga', en: 'Charge' },
      { es: 'Salto', en: 'Leap' },
      { es: 'Erupción', en: 'Eruption', proj: 'block' },
      { es: 'Lluvia', en: 'Rain', proj: 'block' }
    ] },
  { id: 'broken-vessel', kind: 'boss', spellTwice: true, name: { es: 'Receptáculo Roto', en: 'Broken Vessel' },
    stagger: { hits: 13, combo: 9, window: 1 },
    zone: { es: 'Cuenca Antigua', en: 'Ancient Basin' }, hp: 525, at: 700, asra: 1000, dmg: 1,
    summons: [
      { id: 'infected-balloon', hp: 1, note: { es: 'uno cada 4–5 s desde 420 de vida, máximo 3', en: 'one every 4–5 s from 420 health, max 3' } }
    ],
    attacks: [
      { es: 'Corte', en: 'Slash' },
      { es: 'Corte aéreo', en: 'Aerial Slash' },
      { es: 'Paso atrás', en: 'Backstep' },
      { es: 'Salto', en: 'Leap' },
      { es: 'Azotar', en: 'Flail' },
      { es: 'Golpe', en: 'Slam' },
      { es: 'Cascada', en: 'Cascade', proj: 'pierce' },
      { es: 'Globo', en: 'Balloon' }
    ] },
  { id: 'the-collector', kind: 'boss', noSoul: true, name: { es: 'Coleccionista', en: 'The Collector' },
    stagger: { hits: 14, combo: 11, window: 2 },
    zone: { es: 'Torre del Amor', en: 'Tower of Love' }, hp: [750, 750, 750, 800, 850], at: 900, asra: 1200, dmg: 1,
    summons: [
      { id: 'vengefly', diffs: ['base', 'at'], note: { es: 'de las jarras', en: 'from the jars' } },
      { id: 'baldur', diffs: ['base', 'at'], note: { es: 'de las jarras', en: 'from the jars' } },
      { id: 'aspid-hunter', diffs: ['base', 'at'], note: { es: 'de las jarras', en: 'from the jars' } },
      { id: 'primal-aspid', hp: 26, diffs: ['asra', 'radiant'], note: { es: 'de las jarras', en: 'from the jars' } },
      { id: 'sharp-baldur', hp: 26, diffs: ['asra', 'radiant'], note: { es: 'de las jarras', en: 'from the jars' } },
      { id: 'armoured-squit', hp: 26, diffs: ['asra', 'radiant'], note: { es: 'de las jarras', en: 'from the jars' } }
    ],
    notes: [{ es: 'No da alma salvo con el Aguijón Onírico', en: 'Gives no soul except with the Dream Nail' }],
    attacks: [
      { es: 'Jarras', en: 'Jar', proj: 'pierce' },
      { es: 'Agarre', en: 'Grab' },
      { es: 'Salto', en: 'Hop' }
    ] },
  { id: 'hornet-sentinel', kind: 'boss', name: { es: 'Centinela Hornet', en: 'Hornet Sentinel' },
    stagger: { hits: 13, combo: 7, window: 2 },
    zone: { es: 'Límite del Reino', en: 'Kingdom’s Edge' }, hp: 700, at: 800, asra: 1200, dmg: 1,
    attacks: [
      { es: 'Estocada', en: 'Lunge' },
      { es: 'Estocada aérea', en: 'Aerial Lunge' },
      { es: 'Tormenta de telaraña', en: 'Thread Storm' },
      { es: 'Lanzamiento', en: 'Needle Throw', proj: 'pierce' },
      { es: 'Parada', en: 'Parry', warn: { es: 'golpear aquí no le hace daño', en: 'hitting here deals no damage' } },
      { es: 'Trampas de púas', en: 'Spike Traps', proj: 'pierce' }
    ] },
  { id: 'traitor-lord', kind: 'boss', name: { es: 'Señor desleal', en: 'Traitor Lord' },
    zone: { es: 'Jardines de la Reina', en: 'Queen’s Gardens' }, hp: 800, at: 800, asra: 1300, dmg: 2,
    attacks: [
      { es: 'Picado', en: 'Dive' },
      { es: 'Avance', en: 'Dash' },
      { es: 'Guadañas bailarinas', en: 'Dancing Glaive', proj: 'block' },
      { es: 'Triturador de tierra', en: 'Ground Pound' }
    ] },
  { id: 'hollow-knight', kind: 'boss', dreamNail: { fromPhase: 3 }, noFlukes: true, name: { es: 'Hollow Knight', en: 'The Hollow Knight' },
    stagger: { hits: 13, combo: 9, window: 1 },
    zone: { es: 'Templo del Huevo Negro', en: 'Temple of the Black Egg' }, hp: 1000, at: null, asra: null, dmg: 1,
    notes: [{ es: 'El Tremanido no le hace daño salvo en el aire',
              en: 'Flukenest does not damage him unless he is in the air' }],
    phases: [
        { parts: [{ name: { es: 'Fase 1', en: 'Phase 1' }, hp: 250 }] },
        { parts: [{ name: { es: 'Fase 2', en: 'Phase 2' }, hp: 350 }] },
        { parts: [{ name: { es: 'Fase 3', en: 'Phase 3' }, hp: 400 }] },
        { parts: [{ name: { es: 'Fase 4', en: 'Phase 4' }, hp: 250 }] }
      ],
    attacks: [
      { es: 'Triple corte', en: 'Triple Slash' },
      { es: 'Estocada', en: 'Lunge' },
      { es: 'Parada', en: 'Parry', warn: { es: 'golpear aquí no le hace daño', en: 'hitting here deals no damage' } },
      { es: 'Pilar llameante en picada', en: 'Diving Flame Pillar' },
      { es: 'Bombardeo', en: 'Barrage', proj: 'block' },
      { es: 'Brote', en: 'Outbreak' },
      { es: 'Globo rebotador', en: 'Bouncing Balloon' },
      { es: 'Arrepentimiento', en: 'Self Stab', warn: { es: 'mientras dura, todo tu daño baja a 1', en: 'while it lasts, all your damage drops to 1' } }
    ] },
  { id: 'the-radiance', kind: 'boss', name: { es: 'El Destello', en: 'The Radiance' },
    zone: { es: 'No más sueños', en: 'Dream No More' }, hp: 1700, at: null, asra: null, dmg: 2,
    phases: [
        { parts: [{ name: { es: 'Fase 1', en: 'Phase 1' }, hp: 350 }] },
        { parts: [{ name: { es: 'Fase 2', en: 'Phase 2' }, hp: 400 }] },
        { parts: [{ name: { es: 'Fase 3', en: 'Phase 3' }, hp: 250 }] },
        { parts: [{ name: { es: 'Fase 4', en: 'Phase 4' }, hp: 700 }] }
      ],
    attacks: [
      { es: 'Explosión de luz', en: 'Beam Burst' },
      { es: 'Explosión de espadas', en: 'Sword Burst', proj: 'pierce' },
      { es: 'Lluvia de espadas', en: 'Sword Rain', proj: 'pierce' },
      { es: 'Pared de espadas', en: 'Sword Wall', proj: 'pierce' },
      { es: 'Pared de luz', en: 'Wall of Light' },
      { es: 'Orbe', en: 'Orb', proj: 'pierce' },
      { es: 'Suelo espinoso', en: 'Spike Floor' },
      { es: 'Gran haz', en: 'Big Beam' }
    ] },
  { id: 'massive-moss-charger', kind: 'boss', name: { es: 'Musgoagresor gigante', en: 'Massive Moss Charger' },
    zone: { es: 'Sendero Verde', en: 'Greenpath' }, hp: 100, at: 480, asra: 850, dmg: 1,
    attacks: [
      { es: 'Carga', en: 'Charge' },
      { es: 'Panzazo', en: 'Belly-flop' }
    ] },
  { id: 'flukemarm', kind: 'boss', name: { es: 'Tremarmita', en: 'Flukemarm' },
    zone: { es: 'Canales Reales', en: 'Royal Waterways' }, hp: 350, at: 500, asra: 900, dmg: 1,
    summons: [
      { id: 'flukefey', diffs: ['base', 'at'], note: { es: '2 por ataque, hasta 6 a la vez', en: '2 per attack, up to 6 at once' } },
      { id: 'flukefey', hp: 35, diffs: ['asra', 'radiant'], note: { es: 'los 6 primeros; 2 por ataque, hasta 6 a la vez', en: 'the first 6; 2 per attack, up to 6 at once' } },
      { id: 'flukefey', diffs: ['asra', 'radiant'], note: { es: 'a partir del 7.º', en: 'from the 7th on' } }
    ],
    attacks: [
      { es: 'Invocación', en: 'Spawn' }
    ] },
  { id: 'oblobbles', kind: 'boss', name: { es: 'Oblobbles', en: 'Oblobbles' },
    zone: { es: 'Coliseo de los Insensatos', en: 'Colosseum of Fools' }, hp: 520, at: 900, asra: 1500, dmg: 1,
    phases: [
        { parts: [
          { name: { es: 'Oblobble', en: 'Oblobble' }, hp: 260, at: 450, asra: 750 },
          { name: { es: 'Oblobble', en: 'Oblobble' }, hp: 260, at: 450, asra: 750 }] }
      ],
    onDeath: { survivorHp: 300, survivorHeal: 100, atHp: 650, atHeal: 200, asraHp: 750, asraHeal: 200 },
    attacks: [
      { es: 'Cañonada ácida', en: 'Acid Cannonade', proj: 'block' },
      { es: 'Vuelo', en: 'Fly' },
      { es: 'Frenesí', en: 'Frenzy' }
    ] },
  { id: 'hive-knight', kind: 'boss', name: { es: 'Caballero Colmena', en: 'Hive Knight' },
    stagger: { hits: 17, combo: 12, window: 1.5 },
    zone: { es: 'La Colmena', en: 'The Hive' }, hp: [800, 800, 800, 850, 920], at: 850, asra: 1300, dmg: 1,
    summons: [
      { id: 'hiveling', note: { es: '7 al empezar y 7 por Cañón de abejas; el aguijón no las daña', en: '7 at the start and 7 per Swarm Release; the nail does not hurt them' } }
    ],
    attacks: [
      { es: 'Estocada', en: 'Lunge' },
      { es: 'Salto', en: 'Leap' },
      { es: 'Cañón de abejas', en: 'Swarm Release' },
      { es: 'Teletransporte', en: 'Surprise Slash' },
      { es: 'Granada abeja', en: 'Honey Spikes', proj: 'pierce' }
    ] },
  { id: 'winged-nosk', kind: 'boss', name: { es: 'Nosk alado', en: 'Winged Nosk' },
    zone: { es: 'Panteón de Hallownest', en: 'Pantheon of Hallownest' }, hp: 750, at: 750, asra: 1050, dmg: 1,
    summons: [
      { id: 'infected-balloon', note: { es: '2 por grito, máximo 6', en: '2 per screech, max 6' } }
    ],
    attacks: [
      { es: 'Descenso en picado', en: 'Swoop' },
      { es: 'Grito de invocación', en: 'Summoning Screech' },
      { es: 'Brote', en: 'Outbreak', proj: 'block' },
      { es: 'Aguacero', en: 'Downpour', proj: 'block' }
    ] },
  { id: 'god-tamer', kind: 'boss', name: { es: 'Domador de Dioses', en: 'God Tamer' },
    zone: { es: 'Coliseo de los Insensatos', en: 'Colosseum of Fools' }, hp: 1050, at: 1500, asra: 2000, dmg: 1,
    phases: [
        { parts: [
          { name: { es: 'Domador', en: 'Tamer' }, hp: 600, at: 750, asra: 1000, art: 'god-tamer-tamer' },
          { name: { es: 'Bestia', en: 'Beast' }, hp: 450, at: 750, asra: 1000, decisive: true, art: 'god-tamer-beast' }] }
      ],
    notes: [{ es: 'Si cae la Bestia, el Domador deja de pelear', en: 'If the Beast falls, the Tamer stops fighting' }],
    attacks: [
      { es: 'Salto', en: 'Leap', by: 'Tamer' },
      { es: 'Desenrollar', en: 'Roll', by: 'Beast', warn: { es: 'inmune al aguijón, no a los hechizos', en: 'immune to the nail, not to spells' } },
      { es: 'Arrojar', en: 'Spew', by: 'Beast', proj: 'block' }
    ] },
  { id: 'grimmkin-novice', kind: 'boss', name: { es: 'Grimario Novato', en: 'Grimmkin Novice' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: [50, 90, 120, 140, 160], at: null, asra: null, dmg: 1,
    attacks: [
      { es: 'Carga', en: 'Charge' },
      { es: 'Rociada de llamas', en: 'Flame Spray', proj: 'pierce' },
      { es: 'Espiral de llamas', en: 'Flame Spiral', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'grimmkin-master', kind: 'boss', name: { es: 'Grimario Maestro', en: 'Grimmkin Master' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: [75, 120, 180, 210, 240], at: null, asra: null, dmg: 1,
    attacks: [
      { es: 'Carga', en: 'Charge' },
      { es: 'Rociada de llamas', en: 'Flame Spray', proj: 'pierce' },
      { es: 'Espiral de llamas', en: 'Flame Spiral', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'grimmkin-nightmare', kind: 'boss', name: { es: 'Grimario Pesadilla', en: 'Grimmkin Nightmare' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: [100, 180, 240, 280, 320], at: null, asra: null, dmg: 2,
    attacks: [
      { es: 'Carga', en: 'Charge' },
      { es: 'Rociada de llamas', en: 'Flame Spray', proj: 'pierce' },
      { es: 'Espiral de llamas', en: 'Flame Spiral', proj: 'pierce' },
      { es: 'Pilares de llamas', en: 'Flame Pillars' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'pale-lurker', kind: 'boss', name: { es: 'Acechador Pálido', en: 'Pale Lurker' },
    zone: { es: 'Coliseo de los Insensatos', en: 'Colosseum of Fools' }, hp: [200, 240, 290, 340, 400], at: null, asra: null, dmg: 1,
    attacks: [] },
  { id: 'zote-the-mighty', kind: 'boss', name: { es: 'Zote el Todopoderoso', en: 'Zote the Mighty' },
    zone: { es: 'Coliseo de los Insensatos', en: 'Colosseum of Fools' }, hp: 200, at: null, asra: null, dmg: 1,
    attacks: [] },
  { id: 'grimm', kind: 'boss', name: { es: 'Maestro de la Compañía Grimm', en: 'Troupe Master Grimm' },
    stagger: { hits: 14, combo: 12, window: 1, bats: 3.5, cap: 50 },
    zone: { es: 'Bocasucia', en: 'Dirtmouth' }, hp: [800, 800, 800, 930, 1000], at: 1000, asra: 1300, dmg: 1,
    attacks: [
      { es: 'Murciélagos de fuego', en: 'Fire Bats', proj: 'block' },
      { es: 'Avance en picado', en: 'Dive Dash' },
      { es: 'Avance uppercut', en: 'Dash Uppercut' },
      { es: 'Espinas de capa', en: 'Cloak Spikes' },
      { es: 'Pez globo', en: 'Pufferfish', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  // In Godhome it's WEAKER than in its original fight: 1250, not 1500 (kb/05-godhome.md §3).
  { id: 'nkg', kind: 'boss', dream: true, name: { es: 'Rey Pesadilla Grimm', en: 'Nightmare King Grimm' },
    stagger: { hits: 14, combo: 12, window: 1, bats: 2, cap: 50 },
    zone: { es: 'Bocasucia', en: 'Dirtmouth' }, hp: 1500, at: 1250, asra: 1650, dmg: 2,
    attacks: [
      { es: 'Murciélagos de fuego', en: 'Fire Bats', proj: 'block' },
      { es: 'Avance en picado', en: 'Dive Dash' },
      { es: 'Avance uppercut', en: 'Dash Uppercut' },
      { es: 'Espinas de capa', en: 'Cloak Spikes' },
      { es: 'Pilares de llamas', en: 'Flame Pillars' },
      { es: 'Pez globo', en: 'Pufferfish', proj: 'pierce' }
    ] },
  { id: 'xero', kind: 'boss', dream: true, spellTwice: true, name: { es: 'Xero', en: 'Xero' },
    zone: { es: 'Tierras de Reposo', en: 'Resting Grounds' }, hp: [200, 320, 416, 500, 570], at: 650, asra: 900, dmg: 1,
    notes: [{ es: 'Rebota: puede no recibir todas las ráfagas de los Espectros aulladores ni del Chillido del Abismo',
              en: 'He bounces around: he may not take every burst of Howling Wraiths or Abyss Shriek' }],
    attacks: [
      { es: 'Invocar aguijones', en: 'Nail Cast', proj: 'pierce' }
    ] },
  { id: 'gorb', kind: 'boss', dream: true, name: { es: 'Gorb', en: 'Gorb' },
    zone: { es: 'Acantilados Aulladores', en: 'Howling Cliffs' }, hp: [200, 320, 416, 500, 570], at: 650, asra: 1000, dmg: 1,
    attacks: [
      { es: 'Invocar lanzas', en: 'Spear Cast', proj: 'pierce' },
      { es: 'Lanza dirigida', en: 'Directed Spear', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'elder-hu', kind: 'boss', dream: true, name: { es: 'Anciano Hu', en: 'Elder Hu' },
    zone: { es: 'Páramos Fúngicos', en: 'Fungal Wastes' }, hp: [250, 420, 550, 600, 650], at: 600, asra: 800, dmg: 1,
    attacks: [
      { es: 'Golpe de anillos', en: 'Ring Slam', proj: 'pierce' },
      { es: 'Cortina de anillos', en: 'Ring Curtain', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'marmu', kind: 'boss', dream: true, name: { es: 'Marmu', en: 'Marmu' },
    zone: { es: 'Jardines de la Reina', en: 'Queen’s Gardens' }, hp: [200, 320, 416, 500, 570], at: 416, asra: 600, dmg: 1,
    attacks: [
      { es: 'Lanzamiento', en: 'Hurl', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'no-eyes', kind: 'boss', dream: true, name: { es: 'Sin Ojos', en: 'No Eyes' },
    zone: { es: 'Sendero Verde', en: 'Greenpath' }, hp: [200, 320, 416, 500, 570], at: 570, asra: 800, dmg: 1,
    attacks: [
      { es: 'Invocación de espíritus', en: 'Spirit Summon', proj: 'pierce' },
      { es: 'Teletransporte', en: 'Teleport' }
    ] },
  { id: 'galien', kind: 'boss', dream: true, name: { es: 'Galien', en: 'Galien' },
    zone: { es: 'Nido Profundo', en: 'Deepnest' }, hp: [230, 368, 479, 570, 640], at: 650, asra: 1000, dmg: 1,
    attacks: [
      { es: 'Guadaña giratoria', en: 'Spinning Scythe', proj: 'pierce' },
      { es: 'Guadañas de alma', en: 'Dream Scythes', proj: 'pierce' }
    ] },
  { id: 'markoth', kind: 'boss', dream: true, name: { es: 'Markoth', en: 'Markoth' },
    zone: { es: 'Límite del Reino', en: 'Kingdom’s Edge' }, hp: [250, 400, 520, 624, 705], at: 650, asra: 950, dmg: 1,
    attacks: [
      { es: 'Invocar Escudo Onírico', en: 'Dreamshield Summon', warn: { es: 'bloquea tus ataques', en: 'blocks your attacks' } },
      { es: 'Bombardeo de aguijones', en: 'Nail Barrage', proj: 'pierce' },
      { es: 'Ciclón de escudos', en: 'Shield Cyclone', proj: 'pierce' }
    ] },
  { id: 'failed-champion', kind: 'boss', dream: true, noSoul: true, spellTwice: true, name: { es: 'Campeón Fallido', en: 'Failed Champion' },
    zone: { es: 'Cruces Olvidados', en: 'Forgotten Crossroads' }, hp: 1260, at: 1080, asra: 1800, dmg: 2,
    // Like False Knight: armour and head alternate, and a finishing blow after breaking the floor.
    // The first head is worth 60 and the others 40 ("40 (Maggot), 60 first stagger" on the wiki).
    phases: [
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 360 }] },
        { parts: [{ name: { es: 'Gusano', en: 'Head' }, hp: 60, art: 'failed-champion-head' }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 360 }] },
        { parts: [{ name: { es: 'Gusano', en: 'Head' }, hp: 40, art: 'failed-champion-head' }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 360 }] },
        { parts: [{ name: { es: 'Gusano', en: 'Head' }, hp: 40, art: 'failed-champion-head' }] },
        { parts: [{ name: { es: 'Gusano', en: 'Head' }, hp: 40, art: 'failed-champion-head' }],
          note: { es: 'Tras la última Furia rompe el suelo y cae: bajas y rematas al gusano.', en: 'After one last Rage he breaks the floor and falls: drop down and finish off the Maggot.' } }
      ],
    phasesAt: [
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 360 }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 360 }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 360 }] }
      ],
    phasesAsra: [
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 600 }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 600 }] },
        { parts: [{ name: { es: 'Armadura', en: 'Armour' }, hp: 600 }] }
      ],
    notes: [{ es: 'No da alma', en: 'Gives no soul' }],
    attacks: [
      { es: 'Salto', en: 'Leap', by: 'Armour' },
      { es: 'Mazazo', en: 'Slam', by: 'Armour', dmg: 2 },
      { es: 'Mazazo saltando', en: 'Leaping Bludgeon', by: 'Armour' }
    ] },
  { id: 'soul-tyrant', kind: 'boss', dream: true, name: { es: 'Tirano de Almas', en: 'Soul Tyrant' },
    stagger: { hits: 19, combo: 10, window: 1 },
    zone: { es: 'Santuario de Almas', en: 'Soul Sanctum' }, hp: 1250, at: 1250, asra: 1850, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Tirano de Almas', en: 'Soul Tyrant' }, hp: 900, at: 900, asra: 1200 }] },
        { parts: [{ name: { es: 'Tirano de Almas', en: 'Soul Tyrant' }, hp: 350, at: 350, asra: 650 }] }
      ],
    attacks: [
      { es: 'Reloj', en: 'Clock' },
      { es: 'Impacto', en: 'Slam' },
      { es: 'Impacto alterado', en: 'Altered Slam' }
    ] },
  { id: 'lost-kin', kind: 'boss', dream: true, spellTwice: true, name: { es: 'Familiar Perdido', en: 'Lost Kin' },
    stagger: { hits: 13, combo: 7, window: 2 },
    zone: { es: 'Cuenca Antigua', en: 'Ancient Basin' }, hp: 1200, at: 1200, asra: 1650, dmg: 1,
    summons: [
      { id: 'infected-balloon', hp: 1, note: { es: 'cada 2–3 s desde 1150 de vida, hasta 6 vivos', en: 'every 2–3 s from 1150 health, up to 6 alive' } }
    ],
    attacks: [
      { es: 'Corte aéreo', en: 'Aerial Slash' },
      { es: 'Salto', en: 'Leap' },
      { es: 'Golpe', en: 'Slam' },
      { es: 'Globo', en: 'Balloon' }
    ] },
  { id: 'white-defender', kind: 'boss', dream: true, name: { es: 'Defensor Blanco', en: 'White Defender' },
    zone: { es: 'Canales Reales', en: 'Royal Waterways' }, hp: 1600, at: 1600, asra: 1600, dmg: 1,
    notes: [{ es: 'No se aturde', en: 'Cannot be staggered' }],
    attacks: [
      { es: 'Lanzamiento', en: 'Dung Toss', proj: 'block' },
      { es: 'Buceo', en: 'Dive' },
      { es: 'Estallido', en: 'Burst', proj: 'block' },
      { es: 'Golpe de picas', en: 'Spike Slam' },
      { es: 'Júbilo del Defensor', en: 'Defender Jubilee', proj: 'block' },
      { es: 'Entusiasmo', en: 'Zeal', proj: 'block' },
      { es: 'Evadir', en: 'Evade' }
    ] },
  { id: 'grey-prince-zote', kind: 'boss', dream: true, name: { es: 'Príncipe Gris Zote', en: 'Grey Prince Zote' },
    stagger: { hits: 17, combo: 14, window: 1, godhome: { hits: 19, combo: 16 } },
    zone: { es: 'Bocasucia', en: 'Dirtmouth' }, hp: 1500, at: 1400, asra: 1400, dmg: 1,
    summons: [
      { id: 'winged-zoteling', note: { es: '1–3 por escupitajo', en: '1–3 per spit' } },
      { id: 'hopping-zoteling', note: { es: 'desde la 2.ª pelea', en: 'from the 2nd fight on' } },
      { id: 'volatile-zoteling', note: { es: '3–4 bombas, desde la 3.ª pelea', en: '3–4 bombs, from the 3rd fight on' } }
    ],
    notes: [{ es: '1200 la primera pelea, +100 cada una hasta 1500; en Hogar de Dioses, 1400 fijo', en: '1200 on the first fight, +100 each up to 1500; a flat 1400 in Godhome' }],
    attacks: [
      { es: 'Molinete', en: 'Flail' },
      { es: 'Escupir Zotitos', en: 'Zoteling Spit', proj: 'pierce' },
      { es: 'Machaque sombrío', en: 'Shadow Slam' },
      { es: 'Machaque de aguijón', en: 'Nail Slam' },
      { es: 'Salto', en: 'Leap' },
      { es: 'Bombas', en: 'Summon Bombs' }
    ] },
  { id: 'oro-mato', kind: 'boss', name: { es: 'Hermanos Oro y Mato', en: 'Brothers Oro & Mato' },
    // Mato is worth 1000 on Ascended too: "Hall of Gods" and the AsRa_Health on his page
    // agree; the ~1600 kb/ had carried had no source.
    zone: { es: 'Hogar de Dioses', en: 'Godhome' }, hp: 2100, at: 2100, asra: 2800, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Oro', en: 'Oro' }, hp: 500, at: 500, asra: 800, art: 'oro-mato-oro' }] },
        { parts: [
          { name: { es: 'Oro', en: 'Oro' }, hp: 600, at: 600, asra: 1000, art: 'oro-mato-oro' },
          { name: { es: 'Mato', en: 'Mato' }, hp: 1000, at: 1000, asra: 1000, art: 'oro-mato-mato' }] }
      ],
    attacks: [
      { es: 'Doble corte', en: 'Double Slash' },
      { es: 'Corte con salto', en: 'Jump Slash' },
      { es: 'Corte veloz', en: 'Dash Slash', by: 'Oro' },
      { es: 'Retroceso', en: 'Roll Back' },
      { es: 'Salto y retroceso', en: 'Jump Back' },
      { es: 'Alternar golpes', en: 'Alternating Strikes' },
      { es: 'Combo gemelo', en: 'Twin Combo Attack' },
      { es: 'Barricada', en: 'Barricade', warn: { es: 'golpear aquí no le hace daño', en: 'hitting here deals no damage' } },
      { es: 'Corte ciclón', en: 'Cyclone Slash', by: 'Mato' }
    ] },
  { id: 'sheo', kind: 'boss', name: { es: 'Maestro de Pinturas Sheo', en: 'Paintmaster Sheo' },
    stagger: { hits: 12, combo: 9, window: 1 },
    zone: { es: 'Hogar de Dioses', en: 'Godhome' }, hp: 950, at: 950, asra: 1450, dmg: 1,
    attacks: [
      { es: 'Gran corte', en: 'Great Slash' },
      { es: 'Lanza de pintura', en: 'Paint Spear' },
      { es: 'Pisotón de pintura', en: 'Paint Stomp', proj: 'block' },
      { es: 'Salpicadura de pintura', en: 'Paint Splash', proj: 'block' },
      { es: 'Giro', en: 'Roll' },
      { es: 'Salto', en: 'Leap' }
    ] },
  { id: 'sly', kind: 'boss', name: { es: 'Gran Sabio del Aguijón Sly', en: 'Great Nailsage Sly' },
    stagger: { hits: 15, combo: 11, window: 1.5 },
    zone: { es: 'Hogar de Dioses', en: 'Godhome' }, hp: 1050, at: 1050, asra: 1800, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Sly', en: 'Sly' }, hp: 800, at: 800, asra: 1200 }] },
        { parts: [{ name: { es: 'Sly', en: 'Sly' }, hp: 250, at: 250, asra: 600 }] }
      ],
    attacks: [
      { es: 'Combo de cortes', en: 'Slash Combo' },
      { es: 'Golpe de aguijón', en: 'Nail Slam' },
      { es: 'Gran corte', en: 'Great Slash', dmg: 2 },
      { es: 'Corte veloz', en: 'Dash Slash' },
      { es: 'Corte ciclón', en: 'Cyclone Slash' },
      { es: 'Avance', en: 'Sprint' }
    ] },
  { id: 'pure-vessel', kind: 'boss', dreamNail: false, noFlukes: true, name: { es: 'Vasija Pura', en: 'Pure Vessel' },
    stagger: { hits: 12, combo: 9, window: 1 },
    zone: { es: 'Hogar de Dioses', en: 'Godhome' }, hp: 1600, at: 1600, asra: 1850, dmg: 2,
    notes: [{ es: 'El Tremanido no le hace daño salvo en el aire',
              en: 'Flukenest does not damage it unless it is in the air' }],
    attacks: [
      { es: 'Dagas de alma', en: 'Soul Daggers', proj: 'pierce' },
      { es: 'Triple corte', en: 'Triple Slash' },
      { es: 'Pilares de alma', en: 'Soul Pillars' },
      { es: 'Estocada', en: 'Lunge' },
      { es: 'Parada', en: 'Parry', warn: { es: 'golpear aquí no le hace daño', en: 'hitting here deals no damage' } },
      { es: 'Salto', en: 'Jump' },
      { es: 'Teletransporte', en: 'Teleport' },
      { es: 'Retroceso', en: 'Backstep' },
      { es: 'Concentración', en: 'Focus' },
      { es: 'Zarzas de Vacío', en: 'Void Tendrils' }
    ] },
  { id: 'sisters-of-battle', kind: 'boss', name: { es: 'Hermanas de Batalla', en: 'Sisters of Battle' },
    zone: { es: 'Hogar de Dioses', en: 'Godhome' }, hp: 2750, at: 2750, asra: 3450, dmg: 1,
    phases: [
        { parts: [{ name: { es: 'Hermana', en: 'Sister' }, hp: 500, at: 500, asra: 600, art: 'mantis-lord' }] },
        { parts: [
          { name: { es: 'Hermana', en: 'Sister' }, hp: 750, at: 750, asra: 950, art: 'mantis-lord' },
          { name: { es: 'Hermana', en: 'Sister' }, hp: 750, at: 750, asra: 950, art: 'mantis-lord' },
          { name: { es: 'Hermana', en: 'Sister' }, hp: 750, at: 750, asra: 950, art: 'mantis-lord' }] }
      ],
    attacks: [
      { es: 'Embestida y caída', en: 'Dash & Drop' },
      { es: 'Bumerán', en: 'Boomerang', proj: 'block' }
    ] },
  // It has a statue in the Hall of Gods and the same health on all three difficulties:
  // only the damage changes (kb/05-godhome.md §3).
  { id: 'absolute-radiance', kind: 'boss', name: { es: 'Absoluto Destello', en: 'Absolute Radiance' },
    zone: { es: 'Hogar de Dioses', en: 'Godhome' }, hp: 2181, at: 2181, asra: 2181, dmg: 2,
    phases: [
        { parts: [{ name: { es: 'Fase 1', en: 'Phase 1' }, hp: 400 }] },
        { parts: [{ name: { es: 'Fase 2', en: 'Phase 2' }, hp: 450 }] },
        { parts: [{ name: { es: 'Fase 3', en: 'Phase 3' }, hp: 300 }] },
        { parts: [{ name: { es: 'Fase 4', en: 'Phase 4' }, hp: 750 }] },
        { parts: [{ name: { es: 'Fase 6', en: 'Phase 6' }, hp: 281 }] }
      ],
    attacks: [
      { es: 'Explosión de luz', en: 'Beam Burst' },
      { es: 'Explosión de espadas', en: 'Sword Burst', proj: 'pierce' },
      { es: 'Lluvia de espadas', en: 'Sword Rain', proj: 'pierce' },
      { es: 'Pared de espadas', en: 'Sword Wall', proj: 'pierce' },
      { es: 'Pared de luz', en: 'Wall of Light' },
      { es: 'Orbe', en: 'Orb', proj: 'pierce' },
      { es: 'Suelo espinoso', en: 'Spike Floor' },
      { es: 'Gran haz', en: 'Big Beam' },
      { es: 'Bombardeo de orbes', en: 'Orb Barrage', proj: 'pierce' }
    ] },
  { id: 'aluba', kind: 'enemy', name: { es: 'Aluba', en: 'Aluba' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'ambloom', kind: 'enemy', name: { es: 'Ambloom', en: 'Ambloom' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 12, dmg: 1 },
  { id: 'armoured-squit', kind: 'enemy', name: { es: 'Mosquito blindado', en: 'Armoured Squit' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 40, dmg: 1 },
  { id: 'aspid-hatchling', kind: 'enemy', name: { es: 'Cría aspid', en: 'Aspid Hatchling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 5, dmg: 1 },
  { id: 'aspid-hunter', kind: 'enemy', name: { es: 'Cazador aspid', en: 'Aspid Hunter' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'aspid-mother', kind: 'enemy', name: { es: 'Madre aspid', en: 'Aspid Mother' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1,
    summons: [
      { id: 'aspid-hatchling', note: { es: 'una a una, hasta 15; 2 más al morir', en: 'one at a time, up to 15; 2 more on death' } }
    ] },
  { id: 'baldur', kind: 'enemy', name: { es: 'Baldur', en: 'Baldur' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'battle-obble', kind: 'enemy', name: { es: 'Obble de guerra', en: 'Battle Obble' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 70, dmg: 1 },
  { id: 'belfly', kind: 'enemy', name: { es: 'Barrílula', en: 'Belfly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 5, dmg: 1 },
  { id: 'bluggsac', kind: 'enemy', name: { es: 'Saco viscoso', en: 'Bluggsac' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'boofly', kind: 'enemy', name: { es: 'Bubélula', en: 'Boofly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 40, dmg: 1 },
  { id: 'carver-hatcher', kind: 'enemy', name: { es: 'Eclosionador cavador', en: 'Carver Hatcher' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 35, dmg: 1,
    summons: [
      { id: 'dirtcarver', note: { es: 'hasta 5; luego se lanza a morder', en: 'up to 5; then it swoops in to bite' } }
    ] },
  { id: 'charged-lumafly', kind: 'enemy', name: { es: 'Lumélula eléctrica', en: 'Charged Lumafly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: null, dmg: 1 },
  { id: 'corpse-creeper', kind: 'enemy', name: { es: 'Trepacadáveres', en: 'Corpse Creeper' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 18, dmg: 1 },
  { id: 'cowardly-husk', kind: 'enemy', name: { es: 'Cáscara cobarde', en: 'Cowardly Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'crawlid', kind: 'enemy', name: { es: 'Reptacillo', en: 'Crawlid' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 8, dmg: 1 },
  { id: 'crystal-crawler', kind: 'enemy', name: { es: 'Reptador de cristal', en: 'Crystal Crawler' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'crystal-hunter', kind: 'enemy', name: { es: 'Cazador de cristal', en: 'Crystal Hunter' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'crystallised-husk', kind: 'enemy', name: { es: 'Cáscara cristalizada', en: 'Crystallised Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 35, dmg: 1 },
  { id: 'death-loodle', kind: 'enemy', name: { es: 'Loodle letal', en: 'Death Loodle' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 45, dmg: 1 },
  { id: 'deephunter', kind: 'enemy', name: { es: 'Necrocazador', en: 'Deephunter' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 18, dmg: 1 },
  { id: 'deepling', kind: 'enemy', name: { es: 'Necrocría', en: 'Deepling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'dirtcarver', kind: 'enemy', name: { es: 'Cavasuelos', en: 'Dirtcarver' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1,
    notes: [{ es: 'Al morir uno, sale otro a los 4 s: no se acaban', en: 'When one dies, another comes out 4 s later: they never run out' }] },
  { id: 'duranda', kind: 'enemy', name: { es: 'Duranda', en: 'Duranda' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'durandoo', kind: 'enemy', name: { es: 'Durandoo', en: 'Durandoo' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'elder-baldur', kind: 'enemy', name: { es: 'Baldur anciano', en: 'Elder Baldur' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 60, dmg: 1,
    summons: [
      { id: 'baldur', note: { es: 'de uno en uno; ninguno si aún no tienes Espíritu vengativo', en: 'one at a time; none before you have Vengeful Spirit' } }
    ] },
  { id: 'entombed-husk', kind: 'enemy', name: { es: 'Restos sepultados', en: 'Entombed Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 45, dmg: 1 },
  { id: 'fluke-larva', kind: 'enemy', name: { es: 'Fluke Larva', en: 'Fluke Larva' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'flukefey', kind: 'enemy', name: { es: 'Tremacría', en: 'Flukefey' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 13, dmg: 1 },
  { id: 'flukemon', kind: 'enemy', name: { es: 'Tremadora', en: 'Flukemon' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 55, dmg: 1,
    // When it dies its two halves get up: the top one flies and the bottom one runs.
    phases: [
        { parts: [{ name: { es: 'Tremadora', en: 'Flukemon' }, hp: 25 }] },
        { parts: [
          { name: { es: 'Mitad de arriba', en: 'Top half' }, hp: 15, art: 'flukemon-top' },
          { name: { es: 'Mitad de abajo', en: 'Bottom half' }, hp: 15, art: 'flukemon-bottom' }] }
      ] },
  { id: 'folly', kind: 'enemy', name: { es: 'Folly', en: 'Folly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 13, dmg: 1 },
  { id: 'fool-eater', kind: 'enemy', name: { es: 'Engulletontos', en: 'Fool Eater' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 16, dmg: 1 },
  { id: 'fungified-husk', kind: 'enemy', name: { es: 'Restos fungificados', en: 'Fungified Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'fungling', kind: 'enemy', name: { es: 'Fungicría', en: 'Fungling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 10, dmg: 1 },
  { id: 'fungoon', kind: 'enemy', name: { es: 'Funglobo', en: 'Fungoon' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'furious-vengefly', kind: 'enemy', name: { es: 'Vengamosca colérica', en: 'Furious Vengefly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 40, dmg: 1 },
  { id: 'garpede', kind: 'enemy', name: { es: 'Garpiés', en: 'Garpede' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: null, dmg: 1 },
  { id: 'glimback', kind: 'enemy', name: { es: 'Brillomo', en: 'Glimback' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 35, dmg: 1 },
  { id: 'gluttonous-husk', kind: 'enemy', name: { es: 'Cáscara glotona', en: 'Gluttonous Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'gorgeous-husk', kind: 'enemy', name: { es: 'Restos brillantes', en: 'Gorgeous Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 220, dmg: 1 },
  { id: 'goam', kind: 'enemy', name: { es: 'Goam', en: 'Goam' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: null, dmg: 1 },
  { id: 'great-hopper', kind: 'enemy', name: { es: 'Gran saltamontes', en: 'Great Hopper' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 130, dmg: 1 },
  { id: 'great-husk-sentry', kind: 'enemy', name: { es: 'Gran cáscara centinela', en: 'Great Husk Sentry' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 170, dmg: 1 },
  { id: 'grub-mimic', kind: 'enemy', name: { es: 'Mímico larva', en: 'Grub Mimic' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 45, dmg: 1 },
  { id: 'gruzzer', kind: 'enemy', name: { es: 'Gruzzer', en: 'Gruzzer' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 8, dmg: 1 },
  { id: 'gulka', kind: 'enemy', name: { es: 'Gulka', en: 'Gulka' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 10, dmg: 1 },
  { id: 'heavy-fool', kind: 'enemy', name: { es: 'Insensato pesado', en: 'Heavy Fool' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 90, dmg: 1 },
  { id: 'heavy-sentry', kind: 'enemy', name: { es: 'Centinela pesado', en: 'Heavy Sentry' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 35, dmg: 1 },
  { id: 'hive-guardian', kind: 'enemy', name: { es: 'Guardián de la Colmena', en: 'Hive Guardian' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 100, dmg: 1 },
  { id: 'hive-soldier', kind: 'enemy', name: { es: 'Soldado de la Colmena', en: 'Hive Soldier' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 65, dmg: 1 },
  { id: 'hiveling', kind: 'enemy', name: { es: 'Cría de la Colmena', en: 'Hiveling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 18, dmg: 1 },
  { id: 'hopper', kind: 'enemy', name: { es: 'Saltamontes', en: 'Hopper' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 50, dmg: 1 },
  { id: 'husk-bully', kind: 'enemy', name: { es: 'Cáscara matona', en: 'Husk Bully' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'husk-dandy', kind: 'enemy', name: { es: 'Cáscara dandy', en: 'Husk Dandy' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'husk-guard', kind: 'enemy', name: { es: 'Cáscara guardiana', en: 'Husk Guard' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 70, dmg: 1 },
  { id: 'husk-hive', kind: 'enemy', name: { es: 'Cáscara de colmena', en: 'Husk Hive' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 60, dmg: 1,
    summons: [
      { id: 'hiveling', note: { es: 'una de vez en cuando; 3 al morir', en: 'one now and then; 3 on death' } }
    ] },
  { id: 'husk-hornhead', kind: 'enemy', name: { es: 'Cáscara cabezacuerno', en: 'Husk Hornhead' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1,
    summons: [
      { id: 'corpse-creeper', hp: 15, note: { es: 'algunas del Nido Profundo, al morir (50 %)', en: 'some in Deepnest, on death (50%)' } }
    ] },
  { id: 'husk-miner', kind: 'enemy', name: { es: 'Cáscara minera', en: 'Husk Miner' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'husk-sentry', kind: 'enemy', name: { es: 'Cáscara centinela', en: 'Husk Sentry' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: [25, 28, 28, 28, 28], dmg: 1 },
  { id: 'husk-warrior', kind: 'enemy', name: { es: 'Cáscara guerrera', en: 'Husk Warrior' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'hwurmp', kind: 'enemy', name: { es: 'Hwurmp', en: 'Hwurmp' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'infected-balloon', kind: 'enemy', name: { es: 'Globo infectado', en: 'Infected Balloon' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'kingsmould', kind: 'enemy', name: { es: 'Carcasa real', en: 'Kingsmould' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 170, dmg: 2 },
  { id: 'lance-sentry', kind: 'enemy', name: { es: 'Centinela lancero', en: 'Lance Sentry' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'leaping-husk', kind: 'enemy', name: { es: 'Cáscara saltarina', en: 'Leaping Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'lesser-mawlek', kind: 'enemy', name: { es: 'Mawlek inferior', en: 'Lesser Mawlek' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 60, dmg: 1 },
  { id: 'lifeseed', kind: 'enemy', name: { es: 'Germen de vida', en: 'Lifeseed' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'lightseed', kind: 'enemy', name: { es: 'Germen de luz', en: 'Lightseed' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'little-weaver', kind: 'enemy', name: { es: 'Minitejedora', en: 'Little Weaver' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'loodle', kind: 'enemy', name: { es: 'Loodle', en: 'Loodle' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'maggot', kind: 'enemy', name: { es: 'Gusano', en: 'Maggot' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'mantis-petra', kind: 'enemy', name: { es: 'Petramantis', en: 'Mantis Petra' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 45, dmg: 1 },
  { id: 'mantis-traitor', kind: 'enemy', name: { es: 'Traidor mantis', en: 'Mantis Traitor' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 74, dmg: 1 },
  { id: 'mantis-warrior', kind: 'enemy', name: { es: 'Guerrero mantis', en: 'Mantis Warrior' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'mantis-youth', kind: 'enemy', name: { es: 'Joven mantis', en: 'Mantis Youth' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'maskfly', kind: 'enemy', name: { es: 'Libemáscara', en: 'Maskfly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'mawlurk', kind: 'enemy', name: { es: 'Mawlurk', en: 'Mawlurk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 135, dmg: 1 },
  { id: 'menderbug', kind: 'enemy', name: { es: 'Insecto reparador', en: 'Menderbug' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'mistake', kind: 'enemy', name: { es: 'Error', en: 'Mistake' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 13, dmg: 1 },
  { id: 'moss-charger', kind: 'enemy', name: { es: 'Musgoagresor', en: 'Moss Charger' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'moss-knight', kind: 'enemy', name: { es: 'Musgocaballero', en: 'Moss Knight' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 50, dmg: 1 },
  { id: 'mosscreep', kind: 'enemy', name: { es: 'Trepamusgo', en: 'Mosscreep' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 10, dmg: 1 },
  { id: 'mossfly', kind: 'enemy', name: { es: 'Musgólula', en: 'Mossfly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'mosskin', kind: 'enemy', name: { es: 'Musgoso', en: 'Mosskin' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'mossy-vagabond', kind: 'enemy', name: { es: 'Vagabundo musgoso', en: 'Mossy Vagabond' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'obble', kind: 'enemy', name: { es: 'Obble', en: 'Obble' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 10, dmg: 1 },
  { id: 'ooma', kind: 'enemy', name: { es: 'Ooma', en: 'Ooma' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'pilflip', kind: 'enemy', name: { es: 'Pilflip', en: 'Pilflip' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'primal-aspid', kind: 'enemy', name: { es: 'Aspid primigenio', en: 'Primal Aspid' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 35, dmg: 1 },
  { id: 'revek', kind: 'enemy', name: { es: 'Revek', en: 'Revek' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: null, dmg: 1 },
  { id: 'royal-retainer', kind: 'enemy', name: { es: 'Criado real', en: 'Royal Retainer' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 5, dmg: 1 },
  { id: 'shadow-creeper', kind: 'enemy', name: { es: 'Trepasombras', en: 'Shadow Creeper' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'shardmite', kind: 'enemy', name: { es: 'Fragmentita', en: 'Shardmite' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'sharp-baldur', kind: 'enemy', name: { es: 'Baldur espinado', en: 'Sharp Baldur' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 65, dmg: 1 },
  { id: 'shielded-fool', kind: 'enemy', name: { es: 'Insensato escudado', en: 'Shielded Fool' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 65, dmg: 1 },
  { id: 'shrumal-ogre', kind: 'enemy', name: { es: 'Fungiogro', en: 'Shrumal Ogre' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 80, dmg: 1 },
  { id: 'shrumal-warrior', kind: 'enemy', name: { es: 'Fungiguerrero', en: 'Shrumal Warrior' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'shrumeling', kind: 'enemy', name: { es: 'Seticría', en: 'Shrumeling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 5, dmg: 1 },
  { id: 'sibling', kind: 'enemy', void: true, noSoul: true, name: { es: 'Hermano', en: 'Sibling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1,
    notes: [{ es: 'No da alma', en: 'Gives no soul' }] },
  { id: 'slobbering-husk', kind: 'enemy', name: { es: 'Cáscara babeante', en: 'Slobbering Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'soul-twister', kind: 'enemy', name: { es: 'Tuercealmas', en: 'Soul Twister' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 35, dmg: 1 },
  { id: 'spiny-husk', kind: 'enemy', name: { es: 'Cáscara espinosa', en: 'Spiny Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 44, dmg: 1 },
  { id: 'sporg', kind: 'enemy', name: { es: 'Sporg', en: 'Sporg' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'squit', kind: 'enemy', name: { es: 'Mosquito', en: 'Squit' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 10, dmg: 1 },
  { id: 'stalking-devout', kind: 'enemy', name: { es: 'Devoto acechador', en: 'Stalking Devout' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 100, dmg: 1 },
  { id: 'sturdy-fool', kind: 'enemy', name: { es: 'Insensato fornido', en: 'Sturdy Fool' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 80, dmg: 1 },
  { id: 'tiktik', kind: 'enemy', name: { es: 'Tiktik', en: 'Tiktik' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 8, dmg: 1 },
  { id: 'uoma', kind: 'enemy', name: { es: 'Uoma', en: 'Uoma' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 1, dmg: 1 },
  { id: 'vengefly', kind: 'enemy', name: { es: 'Vengamosca', en: 'Vengefly' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 8, dmg: 1 },
  { id: 'violent-husk', kind: 'enemy', name: { es: 'Cáscara violenta', en: 'Violent Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 40, dmg: 1 },
  { id: 'void-tendrils', kind: 'enemy', void: true, name: { es: 'Tentáculos del vacío', en: 'Void Tendrils' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: null, dmg: 2 },
  { id: 'volatile-gruzzer', kind: 'enemy', name: { es: 'Gruzzer volátil', en: 'Volatile Gruzzer' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 40, dmg: 1 },
  { id: 'volatile-mosskin', kind: 'enemy', name: { es: 'Musgoso volátil', en: 'Volatile Mosskin' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1 },
  { id: 'volt-twister', kind: 'enemy', name: { es: 'Tuercerrayos', en: 'Volt Twister' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 80, dmg: 1 },
  { id: 'wandering-husk', kind: 'enemy', name: { es: 'Cáscara errante', en: 'Wandering Husk' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 15, dmg: 1,
    summons: [
      { id: 'corpse-creeper', hp: 15, note: { es: 'algunas del Nido Profundo, al morir (50 %)', en: 'some in Deepnest, on death (50%)' } }
    ] },
  { id: 'winged-fool', kind: 'enemy', name: { es: 'Insensato alado', en: 'Winged Fool' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 70, dmg: 1 },
  { id: 'winged-sentry', kind: 'enemy', name: { es: 'Centinela alado', en: 'Winged Sentry' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 25, dmg: 1 },
  { id: 'wingmould', kind: 'enemy', name: { es: 'Carcasa alada', en: 'Wingmould' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: null, dmg: 1 },
  { id: 'winged-zoteling', kind: 'enemy', name: { es: 'Zotito Alado', en: 'Winged Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'hopping-zoteling', kind: 'enemy', name: { es: 'Zotito Saltarín', en: 'Hopping Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 20, dmg: 1 },
  { id: 'volatile-zoteling', kind: 'enemy', name: { es: 'Zotito Volátil', en: 'Volatile Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 30, dmg: 1 },
  { id: 'flukemunga', kind: 'enemy', name: { es: 'Tremaenorme', en: 'Flukemunga' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 150, dmg: 1 },
  { id: 'zoteling-the-mighty', kind: 'enemy', name: { es: 'Zote el Todopoderoso', en: 'Zoteling the Mighty' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 200, dmg: 1 },
  { id: 'heavy-zoteling', kind: 'enemy', name: { es: 'Zotito Pesado', en: 'Heavy Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 190, dmg: 1 },
  { id: 'turret-zoteling', kind: 'enemy', name: { es: 'Zotito torreta', en: 'Turret Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 100, dmg: 1 },
  { id: 'lanky-zoteling', kind: 'enemy', name: { es: 'Zotito Larguirucho', en: 'Lanky Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 150, dmg: 1 },
  { id: 'zote-s-curse', kind: 'enemy', name: { es: 'Maldición de Zote', en: 'Zote\'s Curse' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 100, dmg: 1 },
  { id: 'head-of-zote', kind: 'enemy', name: { es: 'Cabeza de Zote', en: 'Head of Zote' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 200, dmg: 1 },
  { id: 'fluke-zoteling', kind: 'enemy', name: { es: 'Tremazote', en: 'Fluke Zoteling' },
    zone: { es: 'Hallownest', en: 'Hallownest' }, hp: 100, dmg: 1 },
  ];

  const FOE_BY_ID = Object.fromEntries(FOES.map((f) => [f.id, f]));

  /* The title card the game shows when a boss fight starts: a small line on top (sup), the
     big name (main) and, in some, a small line below (sub). From the game's text
     (kb/data/all_text.json, <KEY>_SUPER, _MAIN and _SUB), copied as is: in Spanish the words
     fall in another order («Madre» big and «Gruz» below) and some lines are missing. The key
     goes in each row's comment; Godhome's own fights use the _NC variant, without the
     artist's credit. Bosses without a title card in the game (the Grimmkin, the Pale Lurker,
     Winged Nosk…) aren't here: the arena shows their name. */
  const TITLES = {
    'gruz-mother': { main: { es: 'Madre', en: 'Gruz' }, sub: { es: 'Gruz', en: 'Mother' } },   // BIGFLY
    'vengefly-king': { sup: { es: 'Vengamosca', en: 'Vengefly' }, main: { es: 'Rey', en: 'King' } },   // VENGEFLY
    'brooding-mawlek': { sup: { es: 'Mawlek', en: 'Brooding' }, main: { es: 'Incubador', en: 'Mawlek' } },   // MAWLEK
    'false-knight': { main: { es: 'Falso Caballero', en: 'False Knight' } },   // FALSE_KNIGHT
    'hornet-protector': { main: { es: 'Hornet', en: 'Hornet' } },   // HORNET
    'mantis-lords': { sup: { es: 'Señores', en: 'Mantis' }, main: { es: 'de las Mantis', en: 'Lords' } },   // MANTIS_LORDS
    'soul-warrior': { sup: { es: '', en: 'Soul' }, main: { es: 'Guerrero del Alma', en: 'Warrior' } },   // MAGE_KNIGHT
    'soul-master': { sup: { es: 'Maestro', en: 'Soul' }, main: { es: 'de Almas', en: 'Master' } },   // MAGE_LORD
    'dung-defender': { main: { es: 'Defensor', en: 'Dung' }, sub: { es: 'del Estiércol', en: 'Defender' } },   // DUNG_DEFENDER
    'crystal-guardian': { main: { es: 'Guardián', en: 'Crystal' }, sub: { es: 'de Cristal', en: 'Guardian' } },   // CRYSTAL_GUARDIAN
    'enraged-guardian': { sup: { es: 'Furioso', en: 'Enraged' }, main: { es: 'Guardián', en: 'Guardian' } },   // ENRAGED_GUARDIAN
    'watcher-knights': { sup: { es: 'Caballero', en: 'Watcher' }, main: { es: 'Vigía', en: 'Knight' } },   // BLACK_KNIGHT
    'uumuu': { main: { es: 'Uumuu', en: 'Uumuu' } },   // MEGA_JELLY
    'nosk': { main: { es: 'Nosk', en: 'Nosk' } },   // MIMIC_SPIDER
    'broken-vessel': { sup: { es: 'Receptáculo', en: 'Broken' }, main: { es: 'Roto', en: 'Vessel' } },   // INFECTED_KNIGHT
    'the-collector': { sup: { es: '', en: 'The' }, main: { es: 'Coleccionista', en: 'Collector' } },   // COLLECTOR
    'hornet-sentinel': { main: { es: 'Hornet', en: 'Hornet' } },   // HORNET
    'traitor-lord': { main: { es: 'Señor', en: 'Traitor' }, sub: { es: 'Desleal', en: 'Lord' } },   // TRAITOR_LORD
    'hollow-knight': { main: { es: 'Hollow Knight', en: 'Hollow Knight' } },   // HOLLOW_KNIGHT
    'the-radiance': { sup: { es: 'El', en: 'The' }, main: { es: 'Destello', en: 'Radiance' } },   // FINAL_BOSS
    'massive-moss-charger': { sup: { es: 'Masiva', en: 'Massive' }, main: { es: 'Cargador del Musgo', en: 'Moss Charger' } },   // MEGA_MOSS
    'flukemarm': { main: { es: 'Tremarmita', en: 'Flukemarm' } },   // FLUKEMARM
    'oblobbles': { main: { es: 'Oblobbles', en: 'Oblobbles' } },   // OBLOBBLES
    'hive-knight': { main: { es: 'Caballero', en: 'Hive' }, sub: { es: 'Colmena', en: 'Knight' } },   // HIVE_KNIGHT
    'god-tamer': { sup: { es: 'Domador', en: 'God' }, main: { es: 'de Dioses', en: 'Tamer' } },   // LOBSTER_LANCER_C
    'zote-the-mighty': { main: { es: 'Zote', en: 'Zote' }, sub: { es: 'el Todopoderoso', en: 'The Mighty' } },   // ZOTE
    'grimm': { sup: { es: 'Maestro de la Compañía', en: 'Troupe Master' }, main: { es: 'Grimm', en: 'Grimm' } },   // GRIMM
    'nkg': { sup: { es: 'Rey Pesadilla', en: 'Nightmare King' }, main: { es: 'Grimm', en: 'Grimm' } },   // NIGHTMARE_GRIMM
    'xero': { main: { es: 'Xero', en: 'Xero' } },   // GH_XERO_NC
    'gorb': { main: { es: 'Gorb', en: 'Gorb' } },   // GH_ALADAR_NC
    'elder-hu': { main: { es: 'Anciano Hu', en: 'Elder Hu' } },   // GH_HU_NC
    'marmu': { main: { es: 'Marmu', en: 'Marmu' } },   // GH_MUMCAT_NC
    'no-eyes': { main: { es: 'Sin Ojos', en: 'No Eyes' } },   // GH_NOEYES_NC
    'galien': { main: { es: 'Galien', en: 'Galien' } },   // GH_GALIEN_NC
    'markoth': { main: { es: 'Markoth', en: 'Markoth' } },   // GH_MARKOTH_NC
    'failed-champion': { main: { es: 'Campeón', en: 'Failed' }, sub: { es: 'Fallido', en: 'Champion' } },   // FALSE_KNIGHT_DREAM
    'soul-tyrant': { sup: { es: 'Tirano', en: 'Soul' }, main: { es: 'de las Almas', en: 'Tyrant' } },   // MAGE_LORD_DREAM
    'lost-kin': { sup: { es: 'Familiar', en: 'Lost' }, main: { es: 'Perdido', en: 'Kin' } },   // INFECTED_KNIGHT_DREAM
    'white-defender': { main: { es: 'Defensor', en: 'White' }, sub: { es: 'Blanco', en: 'Defender' } },   // WHITE_DEFENDER
    'grey-prince-zote': { sup: { es: 'Príncipe Gris', en: 'Grey Prince' }, main: { es: 'Zote', en: 'Zote' } },   // GREY_PRINCE (ZOTE_MAIN)
    'oro-mato': { sup: { es: 'Hermanos', en: 'Brothers' }, main: { es: 'Oro y Mato', en: 'Oro & Mato' } },   // TEMP_NM
    'sheo': { sup: { es: 'Maestro de Pintura', en: 'Paintmaster' }, main: { es: 'Sheo', en: 'Sheo' } },   // PAINTMASTER
    'sly': { sup: { es: 'Gran Sabio del Aguijón', en: 'Great Nailsage' }, main: { es: 'Sly', en: 'Sly' } },   // SLY_BOSS
    'pure-vessel': { main: { es: 'Vasija Pura', en: 'Pure Vessel' } },   // HK_PRIME
    'sisters-of-battle': { main: { es: 'Hermanas', en: 'Sisters' }, sub: { es: 'de Batalla', en: 'Of Battle' } },   // SISTERS
    'absolute-radiance': { sup: { es: 'ABSOLUTO', en: 'ABSOLUTE' }, main: { es: 'DESTELLO', en: 'RADIANCE' } },   // ABSOLUTE_RADIANCE
  };

  HK.foes = { FOES, FOE_BY_ID, TITLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.foes;
})();
