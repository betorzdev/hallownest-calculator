/* js/people.js — the characters you meet again and again across the kingdom, and where: each
   stop is the object the game puts there for that meeting (its scene, its position in the
   scene's units, as js/scene-objects.js keeps them) and the playerData bool the game sets once
   you've had it. Read by hand from the game's own scenes (each object, and the bools its FSMs
   test); the order is the story's. The Map (js/app-map.js) puts
   each stop on its room, done or still ahead; the save's bools come through js/progress.js
   (FLAGS). Names are the game's (<X>_MAIN). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  // [scene, x, y, the bool] — the game's object for that meeting in a comment. Or, for one that
  // counts its meetings, [scene, x, y, [the int, at least]].
  const PEOPLE = [
    { id: 'quirrel', es: 'Quirrel', en: 'Quirrel', stops: [   // QUIRREL_MAIN
      ['Room_temple', 30.26, 5.49, 'quirrelEggTemple'],               // Quirrel, the Black Egg Temple
      ['Room_Slug_Shrine', 26.47, 6.78, 'quirrelSlugShrine'],         // Quirrel Slug Shrine, Lake of Unn
      ['Fungus2_01', 11.97, 31.09, 'quirrelLeftStation'],             // Quirrel Station NPC, Queen's Station
      ['Fungus2_14', 119.71, 15.81, 'quirrelMantisEncountered'],      // Quirrel Mantis NPC, Mantis Village
      ['Ruins1_02', 32.78, 12.29, 'quirrelCityEncountered'],          // Quirrel Bench, City of Tears
      ['Mines_13', 17.92, 21.64, 'quirrelMinesEncountered'],          // Quirrel Mines, Crystal Peak
      ['Deepnest_30', 27.88, 4.91, 'quirrelSpaEncountered'],          // Quirrel Spa, Deepnest's hot spring
      ['Fungus3_47', 54.04, 7.59, 'quirrelArchiveEncountered'],       // Quirrel Archive Ext, outside the Teacher's Archives
      ['Fungus3_archive_02', 63.84, 81.78, 'sawWoundedQuirrel'],      // Quirrel Wounded, after Uumuu
      ['Crossroads_50', 231.71, 25.81, 'quirrelEpilogueCompleted'],   // Quirrel Lakeside, Blue Lake
    ] },
    { id: 'sly', es: 'Sly', en: 'Sly', stops: [   // SLY_MAIN
      ['Room_ruinhouse', 15.73, 7.17, 'slyRescued'],                  // Sly Dazed, lost in the Crossroads
    ] },
    { id: 'bretta', es: 'Bretta', en: 'Bretta', stops: [   // BRETTA_MAIN
      ['Fungus2_23', 65.18, 56.36, 'brettaRescued'],                  // Bretta Dazed, Fungal Wastes
    ] },
    { id: 'zote', es: 'Zote', en: 'Zote', stops: [   // ZOTE_MAIN
      ['Fungus1_20_v02', 48.11, 12.56, 'zoteRescuedBuzzer'],          // Zote, caught by the Vengefly King
      ['Ruins1_06', 70.64, 18.42, 'zoteSpokenCity'],                  // Zote Ruins, City of Tears
      ['Deepnest_33', 56.82, 16.0, 'zoteRescuedDeepnest'],            // Zote Deepnest, in the webs
      ['Room_Colosseum_02', 83.43, 41.46, 'zoteSpokenColosseum'],     // Zote Colosseum
    ] },
    { id: 'cloth', es: 'Cloth', en: 'Cloth', stops: [   // CLOTH_NC_MAIN
      ['Fungus2_09', 28.13, 11.62, 'metCloth'],                       // Cloth NPC 1, Fungal Wastes
      ['Abyss_17', 25.21, 39.62, 'clothEnteredTramRoom'],             // Cloth NPC Tramway, Ancient Basin
      ['Fungus3_34', 9.86, 12.59, 'clothEncounteredQueensGarden'],    // Cloth NPC QG Entrance
      ['Fungus3_23', 29.26, 29.34, 'clothGhostSpoken'],               // Cloth Ghost NPC, after the Traitor Lord
    ] },
    { id: 'tiso', es: 'Tiso', en: 'Tiso', stops: [   // TISO_C_MAIN
      ['Town', 179.45, 8.88, 'tisoEncounteredTown'],                  // Tiso Town NPC, Dirtmouth
      ['Crossroads_47', 31.0, 6.82, 'tisoEncounteredBench'],          // Tiso Bench NPC, the Crossroads' stag
      ['Crossroads_50', 17.15, 24.84, 'tisoEncounteredLake'],         // Tiso Lake NPC, Blue Lake
      ['Room_Colosseum_02', 107.89, 41.96, 'tisoEncounteredColosseum'], // Tiso Col NPC
      ['Deepnest_East_07', 35.15, 65.12, 'tisoDead'],                 // tiso_corpse, Kingdom's Edge
    ] },
    { id: 'hornet', es: 'Hornet', en: 'Hornet', stops: [   // HORNET_MAIN (her two fights are bosses)
      ['Ruins1_27', 25.56, 12.31, 'hornetFountainEncounter'],         // Hornet Fountain Encounter, City of Tears
      ['Fungus2_10', 47.03, 5.58, 'hornetFung'],                      // Hornet Encounter Fung, Fungal Wastes
      ['Deepnest_Spider_Town', 70.92, 152.7, 'hornetDenEncounter'],   // Hornet Beast Den NPC
      ['Abyss_06_Core', 42.62, 230.48, 'hornetAbyssEncounter'],       // Hornet Abyss NPC
    ] },
    { id: 'nailsmith', es: 'Forjaguijones', en: 'Nailsmith', stops: [   // NAILSMITH_MAIN
      ['Ruins1_04', 52.03, 36.45, 'nailsmithCliff'],                  // Nailsmith Cliff NPC, City of Tears
      ['Room_nailmaster_02', 41.37, 5.7, 'nailsmithSheo'],            // Nailsmith Painted NPC, Sheo's hut
    ] },
    { id: 'mourner', es: 'Doliente Gris', en: 'Grey Mourner', stops: [   // XUN_SUPER + XUN_MAIN
      ['Room_Mansion', 22.23, 8.38, 'metXun'],                        // Xun NPC, her house in the Resting Grounds
      ['Fungus3_49', 23.77, 9.42, 'xunFlowerGiven'],                  // Mantis Grave, the Traitors' Child's, Queen's Gardens
    ] },
    /* Mister Mushroom, in the order of the Riddle Tablet's poem. Each room's "Mr Mushroom NPC"
       stays only when mrMushroomState is its own number (its Control FSM, Init), says
       MR_MUSHROOM_<that number> and, with Spore Shroom on, adds one: met once the state is past it. */
    { id: 'mushroom', es: 'Señor Seta', en: 'Mister Mushroom', stops: [   // MR_MUSHROOM_SUPER + MR_MUSHROOM_MAIN
      ['Fungus2_18', 10.81, 36.29, ['mrMushroomState', 2]],           // Fungal Wastes
      ['Deepnest_East_01', 6.1, 41.22, ['mrMushroomState', 3]],       // Kingdom's Edge
      ['Deepnest_40', 12.73, 15.18, ['mrMushroomState', 4]],          // Deepnest, by Galien
      ['Room_nailmaster', 82.73, 5.18, ['mrMushroomState', 5]],       // Mato's hut, Howling Cliffs
      ['Abyss_21', 125.36, 221.27, ['mrMushroomState', 6]],           // Ancient Basin, by the Monarch Wings
      ['Fungus3_44', 13.39, 13.41, ['mrMushroomState', 7]],           // Fog Canyon
      ['Tutorial_01', 36.36, 12.27, ['mrMushroomState', 8]],          // Mr Mushroom NPC (1), King's Pass
    ] },
    { id: 'brumm', es: 'Brumm', en: 'Brumm', stops: [   // IGOR_MAIN (his key in the game's text; in Grimm's tent he's not a stop)
      ['Room_spider_small', 25.48, 14.58, 'gotBrummsFlame'],          // Brumm Torch NPC, Distant Village
      ['Cliffs_06', 49.42, 5.53, 'destroyedNightmareLantern'],        // Brumm Lantern NPV, the Nightmare Lantern
    ] },
  ];
  // A stop's key: its bool, or "the int>=n". Every key: what js/progress.js keeps of a save for them.
  const keyOf = (f) => (Array.isArray(f) ? f[0] + '>=' + f[1] : f);
  const FLAGS = [...new Set(PEOPLE.flatMap((p) => p.stops.map((s) => keyOf(s[3]))))];
  // The keys a save's playerData has met.
  const TESTS = new Map(PEOPLE.flatMap((p) => p.stops.map((s) => [keyOf(s[3]), s[3]])));
  const met = (pd) => FLAGS.filter((k) => {
    const f = TESTS.get(k);
    return Array.isArray(f) ? (Number(pd[f[0]]) || 0) >= f[1] : !!pd[f];
  });

  HK.people = { PEOPLE, FLAGS, keyOf, met };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.people;
})();
