/* js/achievements.js — the game's 63 achievements, and which of them your game has.
   Pure: no DOM and no language, like js/completion.js. The screen picks the words.

   The list is the game's own "Achievements List" (resources.assets, read by
   tools/extract-achievements.py, which also extracts each icon to assets/achievements/ and
   checks this list against the game's: the same keys, the same hidden ones). Its name and text
   are the game's, copied from kb/data/all_text.json (<KEY>_TITLE, <KEY>_TEXT). `hidden` is the
   game's "hidden until earned" (Steam shows those as secret). The order is the wiki's groups
   ("Achievements (Hollow Knight)"), and inside each one the game's.

   Whether you have one is read from what the site already keeps, the same parts the 112% reads
   (js/completion.js), plus the save's meta:
     build     masks and vessels
     owned     the charms found (base charms, any version), Void Heart
     book      the Hunter's Journal: the bosses (the game marks them with the same killed<X>)
               and its two achievements, Keen Hunter and True Hunter
     progress  the rest (js/progress.js): ids, essence, the collectibles found (grubs, the
               area maps, the stag stations)
     meta      hollow.meta, only in a save from the game: the time played, the completion and
               Steel Soul, as the game's profile shows them now
   The thresholds are the game's own code (Assembly-CSharp.dll, read on 8 October 2026): its
   CheckCharmAchievements and the checks next to it award Charmed at hasCharm, Enchanted at
   charmsOwned >= 20, Blessed at salubraBlessing, Protected at maxHealthBase > 5, Masked at
   maxHealthBase == maxHealthCap, Soulful at MPReserveMax > 0, Worldsoul at MPReserveMax ==
   MPReserveCap, Attunement at dreamOrbs >= 600, Grubfriend at grubsCollected >= 23,
   Metamorphosis at 46, Connection at stationsOpened >= 4, and Cartographer with the thirteen
   area maps (mapCrossroads … mapAbyss: not Dirtmouth).

   Some are awarded at an ending, with the time and the completion of that moment, and the save
   only keeps the ones of now; and the ending against the Hollow Knight doesn't say whether
   Hornet was there. Those are marked by hand (`hand: true`), in the slot's hollow.feats: the
   save can only rule some out, or settle some (a game finished in under 5 hours has Speedrun 2,
   since the time only grows), or point to yes ('likely'). A rule answers true, false, or
   U(hint) when it can't tell.

   All of that is what a save fulfils. The account's achievements, Steam's record, are another
   thing (js/steam.js, account()): a save never shows the account's as its own. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const HJ = HK.hunter || require('./hunter.js');
  const P = HK.progress || require('./progress.js');
  const CO = HK.collectibles || require('./collectibles.js');
  const CP = HK.completion || require('./completion.js');

  // The wiki's groups, in its order.
  const GROUPS = Object.freeze(['charms', 'masks', 'vessels', 'bosses', 'essence', 'grubs', 'stags', 'misc',
    'challenges', 'endings', 'dreams', 'grimm', 'godmaster']);

  /* Each one: its id (the English title, as its icon's file is named), the game's key, its
     group, whether the game hides it, its name and text (the game's), and `hand` when the save
     can't always tell (marked by hand). */
  const LIST = [
    // charms
    { id: 'charmed', key: 'CHARMED', group: 'charms', name: { es: 'Afortunado', en: 'Charmed' },   // CHARMED_TITLE
      text: { es: 'Adquiere tu primer amuleto', en: 'Acquire your first Charm' } },   // CHARMED_TEXT
    { id: 'enchanted', key: 'ENCHANTED', group: 'charms', name: { es: 'Encantado', en: 'Enchanted' },   // ENCHANTED_TITLE
      text: { es: 'Adquiere la mitad de los amuletos de Hallownest', en: 'Acquire half of Hallownest\'s Charms' } },   // ENCHANTED_TEXT
    { id: 'blessed', key: 'BLESSED', group: 'charms', name: { es: 'Bendecido', en: 'Blessed' },   // BLESSED_TITLE
      text: { es: 'Adquiere todos los amuletos y recibe la bendición de Salubra', en: 'Acquire all Charms and receive Salubra\'s blessing' } },   // BLESSED_TEXT
    // masks
    { id: 'protected', key: 'PROTECTED', group: 'masks', name: { es: 'Protegido', en: 'Protected' },   // PROTECTED_TITLE
      text: { es: 'Adquiere 4 fragmentos de máscara', en: 'Acquire 4 Mask Shards' } },   // PROTECTED_TEXT
    { id: 'masked', key: 'MASKED', group: 'masks', name: { es: 'Enmascarado', en: 'Masked' },   // MASKED_TITLE
      text: { es: 'Adquiere todos los fragmentos de máscara', en: 'Acquire all Mask Shards' } },   // MASKED_TEXT
    // vessels
    { id: 'soulful', key: 'SOULFUL', group: 'vessels', name: { es: 'Animoso', en: 'Soulful' },   // SOULFUL_TITLE
      text: { es: 'Adquiere 3 fragmentos de vasija', en: 'Acquire 3 Vessel Fragments' } },   // SOULFUL_TEXT
    { id: 'worldsoul', key: 'WORLDSOUL', group: 'vessels', name: { es: 'Anima mundi', en: 'Worldsoul' },   // WORLDSOUL_TITLE
      text: { es: 'Adquiere todos los fragmentos de vasija', en: 'Acquire all Vessel Fragments' } },   // WORLDSOUL_TEXT
    // bosses
    { id: 'falsehood', key: 'FK_DEFEAT', group: 'bosses', name: { es: 'Falsedad', en: 'Falsehood' },   // FK_DEFEAT_TITLE
      text: { es: 'Derrota al Falso Caballero', en: 'Defeat the False Knight' } },   // FK_DEFEAT_TEXT
    { id: 'strength', key: 'DREAM_FK', group: 'bosses', hidden: true, name: { es: 'Fortaleza', en: 'Strength' },   // DREAM_FK_TITLE
      text: { es: 'Derrota al Campeón Fracasado', en: 'Defeat the Failed Champion' } },   // DREAM_FK_TEXT
    { id: 'test-of-resolve', key: 'HORNET_1', group: 'bosses', name: { es: 'Examen de determinación', en: 'Test of Resolve' },   // HORNET_1_TITLE
      text: { es: 'Derrota a Hornet en Sendero Verde', en: 'Defeat Hornet in Greenpath' } },   // HORNET_1_TEXT
    { id: 'proof-of-resolve', key: 'HORNET_2', group: 'bosses', hidden: true, name: { es: 'Prueba de determinación', en: 'Proof of Resolve' },   // HORNET_2_TITLE
      text: { es: 'Derrota a Hornet en Límite del Reino', en: 'Defeat Hornet in Kingdom\'s Edge' } },   // HORNET_2_TEXT
    { id: 'illumination', key: 'SOUL_MASTER_DEFEAT', group: 'bosses', name: { es: 'Iluminación', en: 'Illumination' },   // SOUL_MASTER_DEFEAT_TITLE
      text: { es: 'Derrota al Maestro de Almas', en: 'Defeat the Soul Master' } },   // SOUL_MASTER_DEFEAT_TEXT
    { id: 'mortality', key: 'DREAM_SOUL_MASTER_DEFEAT', group: 'bosses', hidden: true, name: { es: 'Mortalidad', en: 'Mortality' },   // DREAM_SOUL_MASTER_DEFEAT_TITLE
      text: { es: 'Derrota al Tirano de Almas', en: 'Defeat the Soul Tyrant' } },   // DREAM_SOUL_MASTER_DEFEAT_TEXT
    { id: 'release', key: 'BROKEN_VESSEL', group: 'bosses', name: { es: 'Liberar', en: 'Release' },   // BROKEN_VESSEL_TITLE
      text: { es: 'Derrota al Receptáculo Roto', en: 'Defeat the Broken Vessel' } },   // BROKEN_VESSEL_TEXT
    { id: 'peace', key: 'DREAM_BROKEN_VESSEL', group: 'bosses', hidden: true, name: { es: 'Paz', en: 'Peace' },   // DREAM_BROKEN_VESSEL_TITLE
      text: { es: 'Derrota al Familiar Perdido', en: 'Defeat the Lost Kin' } },   // DREAM_BROKEN_VESSEL_TEXT
    { id: 'honour', key: 'DUNG_DEFENDER', group: 'bosses', name: { es: 'Honor', en: 'Honour' },   // DUNG_DEFENDER_TITLE
      text: { es: 'Derrota al Defensor del Estiércol', en: 'Defeat the Dung Defender' } },   // DUNG_DEFENDER_TEXT
    { id: 'respect', key: 'MANTIS_LORDS', group: 'bosses', name: { es: 'Respeto', en: 'Respect' },   // MANTIS_LORDS_TITLE
      text: { es: 'Derrota a los Señores mantis', en: 'Defeat the Mantis Lords' } },   // MANTIS_LORDS_TEXT
    { id: 'obsession', key: 'COLLECTOR', group: 'bosses', hidden: true, name: { es: 'Obsesión', en: 'Obsession' },   // COLLECTOR_TITLE
      text: { es: 'Derrota al Coleccionista', en: 'Defeat the Collector' } },   // COLLECTOR_TEXT
    { id: 'execution', key: 'TRAITOR_LORD', group: 'bosses', name: { es: 'Ejecución', en: 'Execution' },   // TRAITOR_LORD_TITLE
      text: { es: 'Derrota al Señor Desleal', en: 'Defeat the Traitor Lord' } },   // TRAITOR_LORD_TEXT
    { id: 'rivalry', key: 'ZOTE', group: 'bosses', hidden: true, name: { es: 'Rivalidad', en: 'Rivalry' },   // ZOTE_TITLE
      text: { es: 'Derrota a Zote en el Coliseo de los Insensatos', en: 'Defeat Zote in the Colosseum of Fools' } },   // ZOTE_TEXT
    // essence
    { id: 'attunement', key: 'ATTUNEMENT', group: 'essence', name: { es: 'Ajuste', en: 'Attunement' },   // ATTUNEMENT_TITLE
      text: { es: 'Reúne 600 de Esencia', en: 'Collect 600 Essence' } },   // ATTUNEMENT_TEXT
    { id: 'awakening', key: 'AWAKENING', group: 'essence', name: { es: 'Despertar', en: 'Awakening' },   // AWAKENING_TITLE
      text: { es: 'Reúne 1800 de Esencia y despierta el Aguijón Onírico', en: 'Collect 1800 Essence and awaken the Dream Nail' } },   // AWAKENING_TEXT
    { id: 'ascension', key: 'ASCENSION', group: 'essence', hidden: true, name: { es: 'Ascensión', en: 'Ascension' },   // ASCENSION_TITLE
      text: { es: 'Reúne 2400 Esencia y escucha las últimas palabras de la Vidente', en: 'Collect 2400 Essence and hear the Seer\'s final words' } },   // ASCENSION_TEXT
    // grubs
    { id: 'grubfriend', key: 'GRUBFRIEND', group: 'grubs', name: { es: 'Amigo de las larvas', en: 'Grubfriend' },   // GRUBFRIEND_TITLE
      text: { es: 'Rescata a la mitad de las larvas cautivas', en: 'Rescue half of the imprisoned grubs' } },   // GRUBFRIEND_TEXT
    { id: 'metamorphosis', key: 'METAMORPHOSIS', group: 'grubs', name: { es: 'Metamorfosis', en: 'Metamorphosis' },   // METAMORPHOSIS_TITLE
      text: { es: 'Rescata a todas las larvas cautivas', en: 'Rescue all of the imprisoned grubs' } },   // METAMORPHOSIS_TEXT
    // stags
    { id: 'connection', key: 'STAG_STATION_HALF', group: 'stags', name: { es: 'Conexión', en: 'Connection' },   // STAG_STATION_HALF_TITLE
      text: { es: 'Abre la mitad de las estaciones de ciervos de Hallownest', en: 'Open half of Hallownest\'s Stag Stations' } },   // STAG_STATION_HALF_TEXT
    { id: 'hope', key: 'STAG_STATION_ALL', group: 'stags', name: { es: 'Esperanza', en: 'Hope' },   // STAG_STATION_ALL_TITLE
      text: { es: 'Abre todas las estaciones de ciervos de Hallownest y descubre el Nido de Ciervos', en: 'Open all of Hallownest\'s Stag Stations and discover the Stag Nest' } },   // STAG_STATION_ALL_TEXT
    // misc: the characters and their quests, the Dreamers, the maps
    { id: 'neglect', key: 'NEGLECT', group: 'misc', name: { es: 'Abandono', en: 'Neglect' },   // NEGLECT_TITLE
      text: { es: 'Deja que Zote muera', en: 'Leave Zote to die' } },   // NEGLECT_TEXT
    { id: 'witness', key: 'QUIRREL_EPILOGUE', group: 'misc', hidden: true, name: { es: 'Testigo', en: 'Witness' },   // QUIRREL_EPILOGUE_TITLE
      text: { es: 'Pasa un último momento con Quirrel', en: 'Spend a final moment with Quirrel' } },   // QUIRREL_EPILOGUE_TEXT
    { id: 'purity', key: 'NAILSMITH_KILL', group: 'misc', hidden: true, name: { es: 'Pureza', en: 'Purity' },   // NAILSMITH_KILL_TITLE
      text: { es: 'Vence al Forjaguijones con el Aguijón puro', en: 'Slay the Nailsmith with the Pure Nail' } },   // NAILSMITH_KILL_TEXT
    { id: 'happy-couple', key: 'NAILSMITH_SPARE', group: 'misc', hidden: true, name: { es: 'Parejita feliz', en: 'Happy Couple' },   // NAILSMITH_SPARE_TITLE
      text: { es: 'Permite que el Forjaguijones encuentre una nueva vocación', en: 'Allow the Nailsmith to find a new calling' } },   // NAILSMITH_SPARE_TEXT
    { id: 'solace', key: 'MOURNER', group: 'misc', name: { es: 'Consuelo', en: 'Solace' },   // MOURNER_TITLE
      text: { es: 'Lleva la paz a la Doliente Gris', en: 'Bring peace to the Grey Mourner' } },   // MOURNER_TEXT
    { id: 'void', key: 'VOID', group: 'misc', hidden: true, name: { es: 'Vacío', en: 'Void' },   // VOID_TITLE
      text: { es: 'Recuerda el pasado y une al Abismo', en: 'Remember the past and unite the Abyss' } },   // VOID_TEXT
    { id: 'teacher', key: 'TEACHER', group: 'misc', name: { es: 'Maestra', en: 'Teacher' },   // TEACHER_TITLE
      text: { es: 'Destruye a Monomon, la Maestra', en: 'Destroy Monomon the Teacher' } },   // TEACHER_TEXT
    { id: 'watcher', key: 'WATCHER', group: 'misc', name: { es: 'Vigilante', en: 'Watcher' },   // WATCHER_TITLE
      text: { es: 'Destruye a Lurien, el Vigilante', en: 'Destroy Lurien the Watcher' } },   // WATCHER_TEXT
    { id: 'beast', key: 'BEAST', group: 'misc', name: { es: 'Bestia', en: 'Beast' },   // BEAST_TITLE
      text: { es: 'Destruye a Herrah, la Bestia', en: 'Destroy Herrah the Beast' } },   // BEAST_TEXT
    { id: 'cartographer', key: 'MAP', group: 'misc', name: { es: 'Cartógrafo', en: 'Cartographer' },   // MAP_TITLE
      text: { es: 'Adquiere un mapa de cada zona', en: 'Acquire a map of each area' } },   // MAP_TEXT
    // challenges
    { id: 'completion', key: 'COMPLETION', group: 'challenges', hand: true, name: { es: 'Finalización', en: 'Completion' },   // COMPLETION_TITLE
      text: { es: 'Consigue un porcentaje de finalización del 100 % y termina el juego', en: 'Achieve 100% game completion and finish the game' } },   // COMPLETION_TEXT
    { id: 'speed-completion', key: 'SPEED_COMPLETION', group: 'challenges', hand: true, name: { es: 'Finalización rápida', en: 'Speed Completion' },   // SPEED_COMPLETION_TITLE
      text: { es: 'Consigue un porcentaje de finalización del 100 % y termina el juego en menos de 20 horas', en: 'Achieve 100% game completion and finish the game in under 20 hours' } },   // SPEED_COMPLETION_TEXT
    { id: 'keen-hunter', key: 'HUNTER_1', group: 'challenges', name: { es: 'Cazador entusiasta', en: 'Keen Hunter' },   // HUNTER_1_TITLE
      text: { es: 'Registra todas las criaturas de Hallownest en el Diario del Cazador', en: 'Record all of Hallownest\'s creatures in the Hunter\'s Journal' } },   // HUNTER_1_TEXT
    { id: 'true-hunter', key: 'HUNTER_2', group: 'challenges', name: { es: 'Cazador auténtico', en: 'True Hunter' },   // HUNTER_2_TITLE
      text: { es: 'Recibe la Marca de cazador', en: 'Receive the Hunter\'s Mark' } },   // HUNTER_2_TEXT
    { id: 'steel-soul', key: 'STEELSOUL', group: 'challenges', hand: true, name: { es: 'Alma de Acero', en: 'Steel Soul' },   // STEELSOUL_TITLE
      text: { es: 'Termina el juego en el modo Alma de Acero', en: 'Finish the game in Steel Soul mode' } },   // STEELSOUL_TEXT
    { id: 'steel-heart', key: 'STEELSOUL_COMPLETION', group: 'challenges', hand: true, name: { es: 'Corazón de Acero', en: 'Steel Heart' },   // STEELSOUL_COMPLETION_TITLE
      text: { es: 'Consigue un porcentaje de finalización del 100 % y termina el juego en el modo Alma de acero', en: 'Achieve 100% game completion and finish the game in Steel Soul mode' } },   // STEELSOUL_COMPLETION_TEXT
    { id: 'speedrun-1', key: 'SPEEDRUN_1', group: 'challenges', hand: true, name: { es: 'Speedrun 1', en: 'Speedrun 1' },   // SPEEDRUN_1_TITLE
      text: { es: 'Completa el juego en menos de 10 horas', en: 'Complete the game in under 10 hours' } },   // SPEEDRUN_1_TEXT
    { id: 'speedrun-2', key: 'SPEEDRUN_2', group: 'challenges', hand: true, name: { es: 'Speedrun 2', en: 'Speedrun 2' },   // SPEEDRUN_2_TITLE
      text: { es: 'Completa el juego en menos de 5 horas', en: 'Complete the game in under 5 hours' } },   // SPEEDRUN_2_TEXT
    { id: 'warrior', key: 'COLOSSEUM_1', group: 'challenges', name: { es: 'Guerrero', en: 'Warrior' },   // COLOSSEUM_1_TITLE
      text: { es: 'Completa la Prueba del Guerrero', en: 'Complete the Trial of the Warrior' } },   // COLOSSEUM_1_TEXT
    { id: 'conqueror', key: 'COLOSSEUM_2', group: 'challenges', name: { es: 'Conquistador', en: 'Conqueror' },   // COLOSSEUM_2_TITLE
      text: { es: 'Completa la Prueba del Conquistador', en: 'Complete the Trial of the Conqueror' } },   // COLOSSEUM_2_TEXT
    { id: 'fool', key: 'COLOSSEUM_3', group: 'challenges', name: { es: 'Insensato', en: 'Fool' },   // COLOSSEUM_3_TITLE
      text: { es: 'Completa la Prueba de los Insensatos', en: 'Complete the Trial of the Fool' } },   // COLOSSEUM_3_TEXT
    // endings
    { id: 'the-hollow-knight', key: 'ENDING_A', group: 'endings', hidden: true, hand: true, name: { es: 'Hollow Knight', en: 'The Hollow Knight' },   // ENDING_A_TITLE
      text: { es: 'Derrota al Hollow Knight y conviértete en el Receptáculo', en: 'Defeat the Hollow Knight and become the Vessel' } },   // ENDING_A_TEXT
    { id: 'sealed-siblings', key: 'ENDING_B', group: 'endings', hidden: true, hand: true, name: { es: 'Hermanos sellados', en: 'Sealed Siblings' },   // ENDING_B_TITLE
      text: { es: 'Derrota al Hollow Knight con Hornet a tu lado', en: 'Defeat the Hollow Knight with Hornet by your side' } },   // ENDING_B_TEXT
    { id: 'dream-no-more', key: 'ENDING_C', group: 'endings', hidden: true, name: { es: 'No más sueños', en: 'Dream No More' },   // ENDING_C_TITLE
      text: { es: 'Derrota a Destello y consume la luz', en: 'Defeat Radiance and consume the light' } },   // ENDING_C_TEXT
    { id: 'passing-of-the-age', key: 'MR_MUSHROOM', group: 'endings', hidden: true, hand: true, name: { es: 'Cambio de era', en: 'Passing of the Age' },   // MR_MUSHROOM_TITLE
      text: { es: 'Ayuda al Heraldo a pasar página', en: 'Aid the Herald in moving on' } },   // MR_MUSHROOM_TEXT
    // dreams: Hidden Dreams
    { id: 'memory', key: 'WHITE_DEFENDER', group: 'dreams', hidden: true, name: { es: 'Memoria', en: 'Memory' },   // WHITE_DEFENDER_TITLE
      text: { es: 'Derrota al Defensor Blanco', en: 'Defeat White Defender' } },   // WHITE_DEFENDER_TEXT
    { id: 'dark-romance', key: 'GREY_PRINCE', group: 'dreams', hidden: true, name: { es: 'Romance Oscuro', en: 'Dark Romance' },   // GREY_PRINCE_TITLE
      text: { es: 'Derrota al Príncipe Gris Zote', en: 'Defeat Grey Prince Zote' } },   // GREY_PRINCE_TEXT
    // grimm: the Grimm Troupe
    { id: 'grand-performance', key: 'GRIMM', group: 'grimm', hidden: true, name: { es: 'Gran Actuación', en: 'Grand Performance' },   // GRIMM_TITLE
      text: { es: 'Derrota al Líder de la Compañía: Grimm', en: 'Defeat Troupe Leader Grimm' } },   // GRIMM_TEXT
    { id: 'ritual', key: 'NIGHTMARE_GRIMM', group: 'grimm', hidden: true, name: { es: 'Ritual', en: 'Ritual' },   // NIGHTMARE_GRIMM_TITLE
      text: { es: 'Derrota al Rey Pesadilla y completa el Ritual', en: 'Defeat the Nightmare King and complete the Ritual' } },   // NIGHTMARE_GRIMM_TEXT
    { id: 'banishment', key: 'BANISHMENT', group: 'grimm', hidden: true, name: { es: 'Destierro', en: 'Banishment' },   // BANISHMENT_TITLE
      text: { es: 'Destierra a la compañía de Grimm de Hallownest', en: 'Banish the Grimm Troupe from Hallownest' } },   // BANISHMENT_TEXT
    // godmaster
    { id: 'brotherhood', key: 'PANTHEON1', group: 'godmaster', hidden: true, name: { es: 'Hermandad', en: 'Brotherhood' },   // PANTHEON1_TITLE
      text: { es: 'Completa el panteón del Maestro', en: 'Complete the Pantheon of the Master' } },   // PANTHEON1_TEXT
    { id: 'inspiration', key: 'PANTHEON2', group: 'godmaster', hidden: true, name: { es: 'Inspiración', en: 'Inspiration' },   // PANTHEON2_TITLE
      text: { es: 'Completa el panteón del Artista', en: 'Complete the Pantheon of the Artist' } },   // PANTHEON2_TEXT
    { id: 'focus', key: 'PANTHEON3', group: 'godmaster', hidden: true, name: { es: 'Concentración', en: 'Focus' },   // PANTHEON3_TITLE
      text: { es: 'Completa el Panteón del Sabio', en: 'Complete the Pantheon of the Sage' } },   // PANTHEON3_TEXT
    { id: 'soul-shade', key: 'PANTHEON4', group: 'godmaster', hidden: true, name: { es: 'Alma y Sombra', en: 'Soul & Shade' },   // PANTHEON4_TITLE
      text: { es: 'Completa el Panteón del Caballero', en: 'Complete the Pantheon of the Knight' } },   // PANTHEON4_TEXT
    { id: 'embrace-the-void', key: 'ENDINGD', group: 'godmaster', hidden: true, name: { es: 'Acepta el Vacío', en: 'Embrace the Void' },   // ENDINGD_TITLE
      text: { es: 'Asciende al Panteón de Hallownest y toma tu lugar en la cima', en: 'Ascend the Pantheon of Hallownest and take your place at its peak' } },   // ENDINGD_TEXT
    { id: 'pure-completion', key: 'COMPLETIONGG', group: 'godmaster', hand: true, name: { es: 'Conclusión Pura', en: 'Pure Completion' },   // COMPLETIONGG_TITLE
      text: { es: 'Alcanza el 112% de finalización y termina el juego', en: 'Achieve 112% game completion and finish the game.' } },   // COMPLETIONGG_TEXT
  ];

  /* Where each is marked by hand, when it isn't one of the `hand` ones: the progress id or the
     Journal entry it reads (the tab marks it there, as the 112% does), or the screen that keeps
     what it counts (`far`: the plate takes you there). */
  const MARK = {
    charmed: { far: 'progress' }, enchanted: { far: 'progress' }, blessed: { progress: 'salubra-blessing' },
    protected: { far: 'inventory' }, masked: { far: 'inventory' }, soulful: { far: 'inventory' }, worldsoul: { far: 'inventory' },
    falsehood: { journal: 'false-knight' }, strength: { progress: 'failed-champion' },
    'test-of-resolve': { journal: 'hornet-protector' }, 'proof-of-resolve': { progress: 'hornet-sentinel' },
    illumination: { journal: 'soul-master' }, mortality: { progress: 'soul-tyrant' },
    release: { journal: 'broken-vessel' }, peace: { progress: 'lost-kin' },
    honour: { journal: 'dung-defender' }, respect: { journal: 'mantis-lords' }, obsession: { journal: 'the-collector' },
    execution: { journal: 'traitor-lord' }, rivalry: { journal: 'zote-the-mighty' },
    attunement: { far: 'inventory' }, awakening: { progress: 'dream-awakened' }, ascension: { progress: 'seer-ascended' },
    grubfriend: { far: 'map' }, metamorphosis: { far: 'map' }, connection: { far: 'map' }, hope: { far: 'map' },
    neglect: { progress: 'zote-dead' }, witness: { progress: 'quirrel-farewell' }, purity: { progress: 'nailsmith-slain' },
    'happy-couple': { progress: 'nailsmith-spared' }, solace: { progress: 'mourner-flower' }, void: { far: 'inventory' },
    teacher: { progress: 'monomon' }, watcher: { progress: 'lurien' }, beast: { progress: 'herrah' }, cartographer: { far: 'map' },
    'keen-hunter': { far: 'journal' }, 'true-hunter': { journal: HJ.MARK },
    warrior: { progress: 'trial-warrior' }, conqueror: { progress: 'trial-conqueror' }, fool: { progress: 'trial-fool' },
    'dream-no-more': { progress: 'ending-radiance' },
    memory: { journal: 'white-defender' }, 'dark-romance': { journal: 'grey-prince-zote' },
    'grand-performance': { journal: 'grimm' }, ritual: { journal: 'nkg' }, banishment: { progress: 'banishment' },
    brotherhood: { progress: 'pantheon-master' }, inspiration: { progress: 'pantheon-artist' }, focus: { progress: 'pantheon-sage' },
    'soul-shade': { progress: 'pantheon-knight' }, 'embrace-the-void': { progress: 'pantheon-hallownest' },
  };

  const U = (hint = '') => ({ hint });   // the save can't tell; 'likely' when it points to yes
  const HOUR = 3600;
  // The stag stations the game counts in stationsOpened: not Dirtmouth's (open from the start) nor the Nest.
  const NOT_COUNTED = ['dirtmouth-stag', 'stag-nest-stag'];

  /* id → (x) → true | false | U(hint). x: { has, seen, found, foundId, charms, owned, build, counts, book, meta, save, finished }. */
  const RULES = {
    charmed: (x) => x.charms.size >= 1,
    enchanted: (x) => x.charms.size >= 20,
    blessed: (x) => x.has('salubra-blessing'),
    protected: (x) => x.build.masks > 5,
    masked: (x) => x.build.masks >= 9,
    soulful: (x) => x.build.vessels > 0,
    worldsoul: (x) => x.build.vessels >= 3,
    attunement: (x) => (x.counts.essence || 0) >= 600 || x.has('dream-awakened'),
    grubfriend: (x) => x.found('grub') >= 23,
    metamorphosis: (x) => x.found('grub') >= 46,
    connection: (x) => x.found('stag', NOT_COUNTED) >= 4,
    hope: (x) => x.foundId('stag-nest-stag'),
    void: (x) => x.owned.includes('voidheart'),
    cartographer: (x) => x.found('map') >= 13,
    'keen-hunter': (x) => { const c = HJ.counts(x.book); return c.reqSeen >= c.required; },
    'true-hunter': (x) => HJ.stateOf(x.book, HJ.MARK).done,
    // At an ending. Without a save from the game nothing rules them out: by hand.
    'the-hollow-knight': (x) => (!x.save ? U() : !x.has('ending-vessel') ? false
      // Void Heart is never lost: without it now, the Hollow Knight fell without Hornet.
      : !x.owned.includes('voidheart') ? true : U()),
    'sealed-siblings': (x) => (!x.save ? U() : !x.has('ending-vessel') || !x.owned.includes('voidheart') ? false : U()),
    // His seventh meeting, then an ending: the cutscene and the achievement come with the credits.
    'passing-of-the-age': (x) => (!x.save ? U() : !x.has('mushroom-seven') || !x.finished ? false : U('likely')),
    // The time only grows: finished and still under the limit, the ending was under it too.
    'speedrun-1': (x) => (!x.save ? U() : !x.finished ? false : x.meta.time < 10 * HOUR ? true : U()),
    'speedrun-2': (x) => (!x.save ? U() : !x.finished ? false : x.meta.time < 5 * HOUR ? true : U()),
    // The completion of the ending isn't kept: 100% now and an ending only point to it.
    completion: (x) => (!x.save ? U() : !x.finished || x.meta.completion < 100 ? false : U('likely')),
    'speed-completion': (x) => (!x.save ? U() : !x.finished || x.meta.completion < 100 ? false
      : U(x.meta.time < 20 * HOUR ? 'likely' : '')),
    'pure-completion': (x) => (!x.save ? U() : !x.finished || x.meta.completion < 112 ? false : U('likely')),
    // Steel Soul: the save says so (permadeathMode); a save imported before it was read doesn't.
    'steel-soul': (x) => (!x.save || typeof x.meta.steel !== 'boolean' ? U() : x.meta.steel && x.finished),
    'steel-heart': (x) => (!x.save || typeof x.meta.steel !== 'boolean' ? U()
      : !x.meta.steel || !x.finished || x.meta.completion < 100 ? false : U('likely')),
  };
  // The rest read their progress id or Journal entry.
  for (const [id, m] of Object.entries(MARK)) {
    if (RULES[id]) continue;
    if (m.progress) RULES[id] = (x) => x.has(m.progress);
    else if (m.journal) RULES[id] = (x) => x.seen(m.journal);
  }

  /* Where Steam keeps each one in its stats file (js/steam.js): key → [stat, bit], from the
     schema beside it (UserGameStatsSchema_367520.bin, read 8 October 2026; tools/check-steam.js
     checks it). Stat 3 bits 1–31, stat 6 bits 0–20 and 22–31, stat 7 bit 0: the 63. */
  const STEAM = Object.freeze({
    CHARMED: [3, 1], ENCHANTED: [3, 2], BLESSED: [3, 3], PROTECTED: [3, 4], MASKED: [3, 5], SOULFUL: [3, 6], WORLDSOUL: [3, 7],
    FK_DEFEAT: [3, 8], DREAM_FK: [3, 9], HORNET_1: [3, 10], HORNET_2: [3, 11], SOUL_MASTER_DEFEAT: [3, 12],
    BROKEN_VESSEL: [3, 13], DREAM_BROKEN_VESSEL: [3, 14], DUNG_DEFENDER: [3, 15], MANTIS_LORDS: [3, 16], COLLECTOR: [3, 17],
    ZOTE: [3, 18], ATTUNEMENT: [3, 19], AWAKENING: [3, 20], ASCENSION: [3, 21], GRUBFRIEND: [3, 22], METAMORPHOSIS: [3, 23],
    NEGLECT: [3, 24], NAILSMITH_KILL: [3, 25], NAILSMITH_SPARE: [3, 26], QUIRREL_EPILOGUE: [3, 27], MOURNER: [3, 28],
    TRAITOR_LORD: [3, 29], STAG_STATION_HALF: [3, 30], STAG_STATION_ALL: [3, 31],
    TEACHER: [6, 0], WATCHER: [6, 1], BEAST: [6, 2], MAP: [6, 3], COLOSSEUM_1: [6, 4], COLOSSEUM_2: [6, 5], COLOSSEUM_3: [6, 6],
    ENDING_A: [6, 7], ENDING_B: [6, 8], ENDING_C: [6, 9], VOID: [6, 10], SPEEDRUN_1: [6, 11], SPEEDRUN_2: [6, 12],
    COMPLETION: [6, 13], SPEED_COMPLETION: [6, 14], STEELSOUL: [6, 15], STEELSOUL_COMPLETION: [6, 16], HUNTER_1: [6, 17],
    HUNTER_2: [6, 18], MR_MUSHROOM: [6, 19], DREAM_SOUL_MASTER_DEFEAT: [6, 20], WHITE_DEFENDER: [6, 22], GREY_PRINCE: [6, 23],
    GRIMM: [6, 24], NIGHTMARE_GRIMM: [6, 25], BANISHMENT: [6, 26], PANTHEON1: [6, 27], PANTHEON2: [6, 28], PANTHEON3: [6, 29],
    PANTHEON4: [6, 30], ENDINGD: [6, 31], COMPLETIONGG: [7, 0],
  });

  const ACHIEVEMENTS = Object.freeze(LIST.map((a) => Object.freeze({ hidden: false, hand: false, ...a, mark: MARK[a.id] || null })));
  const BY_ID = Object.freeze(Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])));
  const TOTAL = ACHIEVEMENTS.length;   // 63
  const HAND = Object.freeze(ACHIEVEMENTS.filter((a) => a.hand).map((a) => a.id));

  // The marks by hand: only the `hand` ones, once and in order.
  const normalize = (marks) => (Array.isArray(marks) ? HAND.filter((id) => marks.includes(id)) : []);
  function toggle(marks, id, on) {
    const n = normalize(marks);
    if (!HAND.includes(id)) return n;
    const want = on === undefined ? !n.includes(id) : !!on;
    return normalize(want ? [...n, id] : n.filter((x) => x !== id));
  }

  /* The site's parts (as the screens hold them: { build, owned, book, progress, meta }) → what
     each rule reads. meta is hollow.meta, only there with a save from the game. */
  function context({ build, owned = [], book = {}, progress = {}, meta = null }) {
    const prog = P.normalize(progress);
    const found = new Set(prog.found);
    const has = (id) => prog.ids.includes(id);
    const save = !!meta && typeof meta.time === 'number';
    return {
      build, owned, book, counts: prog.counts, has, save,
      meta: save ? { time: meta.time, completion: Number(meta.completion) || 0, steel: meta.steel } : {},
      seen: (id) => HJ.stateOf(book, id).seen,
      charms: new Set(owned.map((id) => CP.BASE[id] || id)),
      found: (kind, except = []) => CO.ITEMS.filter((it) => it.kind === kind && !except.includes(it.id) && found.has(it.id)).length,
      foundId: (id) => found.has(id),
      finished: has('ending-vessel') || has('ending-radiance') || has('pantheon-hallownest'),
    };
  }

  /* → { done, total, groups: [{ id, done, max, items: [{ id, on, sure, hint }] }] }. A sure one
     is what the rule says; one it can't tell is on if it's marked by hand. */
  function count(parts, marks = []) {
    const x = context(parts);
    const hand = normalize(marks);
    const groups = GROUPS.map((g) => {
      const items = ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
        const r = RULES[a.id](x);
        return typeof r === 'boolean' ? { id: a.id, on: r, sure: true, hint: '' }
          : { id: a.id, on: hand.includes(a.id), sure: false, hint: r.hint };
      });
      return { id: g, done: items.filter((it) => it.on).length, max: items.length, items };
    });
    return { done: groups.reduce((n, g) => n + g.done, 0), total: TOTAL, groups };
  }

  /* The account's record, from Steam's file (js/steam.js read → hollow.steam: { unlocked: { KEY:
     time } }) → { done, total, has(id), time(id) }. Separate from count() on purpose: the
     account's achievements are never a save's. */
  const BY_KEY = Object.freeze(Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a.id])));
  function account(steam) {
    const unlocked = steam && steam.unlocked && typeof steam.unlocked === 'object' ? steam.unlocked : {};
    const times = {};
    for (const [key, t] of Object.entries(unlocked)) if (BY_KEY[key]) times[BY_KEY[key]] = Math.max(0, Number(t) || 0);
    return { done: Object.keys(times).length, total: TOTAL, has: (id) => id in times, time: (id) => (id in times ? times[id] : null) };
  }

  /* The account kept by hand (no Steam file): a record of source 'hand' whose unlocked are the
     marks, with time 0. toggleAccount marks one or unmarks it, only on such a record: with
     Steam's file in, the file decides. */
  const handRecord = (hand) => ({ source: 'hand', unlocked: hand && typeof hand === 'object' ? { ...hand } : {} });
  function toggleAccount(rec, id, on) {
    if (!rec || rec.source !== 'hand' || !BY_ID[id]) return rec;
    const key = BY_ID[id].key, unlocked = { ...rec.unlocked };
    const want = on === undefined ? !(key in unlocked) : !!on;
    if (want) unlocked[key] = 0; else delete unlocked[key];
    return { ...rec, unlocked };
  }

  HK.achievements = { GROUPS, ACHIEVEMENTS, BY_ID, BY_KEY, TOTAL, HAND, RULES, STEAM, normalize, toggle, count, account, handRecord, toggleAccount };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.achievements;
})();
