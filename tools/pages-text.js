/* tools/pages-text.js — what each of the site's pages says to search engines and to whoever lands
   on it: one page per search intent (design/12-seo.md), each in both languages. tools/pages.js
   builds the pages from index.html and this; the site itself never loads it.

   Every page is the whole site, opened on one screen (`view`, index.html's data-view); the root
   has no view and opens where you left it. `title` leads with what people search and gets the
   brand after it; `h1` is the About block's heading (the title, unless it says otherwise);
   `body` are its paragraphs and `faq` its questions (also FAQPage in the JSON-LD); `link` is the
   page's name in the other pages' links. The text may carry <code> and <strong>, nothing else.
   Game names as the game says them (npm run text): Divine stays Divine in Spanish (DIVINE_MAIN),
   the Seer is la Vidente (DREAM_MOTH_MAIN), Attuned is Armonía (CHALLENGE_UI_LEVEL1), the Hall of
   Gods is el Salón de los Dioses (GG_SUMMARY_TITLE), the Godtuner el Afinador de Dioses
   (INV_NAME_GODFINDER), the Hive Knight el Caballero Colmena (NAME_HIVE_KNIGHT), Grimmchild el
   Niño de Grimm (CHARM_NAME_40); the Grubfather has no game text (Padre Larva, the Spanish wiki's). */
'use strict';

const BRAND = { es: 'Calculadora de Hallownest', en: 'Hallownest Calculator' };

/* The About block's fixed labels. */
const LABELS = {
  faq:   { es: 'Preguntas frecuentes', en: 'Questions' },
  more:  { es: 'Más en el sitio', en: 'More on the site' },
  about: { es: 'Sobre esta página', en: 'About this page' },
};

/* The preview card's image (assets/site/og.jpg) is the same on every page; its description. */
const OG_ALT = {
  es: 'La pantalla Partida: descansas en Ciudad de Lágrimas, la finalización, el tiempo jugado y lo encontrado desde el último banco',
  en: 'The Your game screen: resting at City of Tears, the completion, the time played, and what was found since the last bench',
};

const PAGES = [
  {
    id: 'home', view: null, slug: { es: '', en: '' },
    link: { es: 'Inicio', en: 'Home' },
    title: { es: 'Tu partida de Hollow Knight en vivo, el 112 % y los amuletos', en: 'Hollow Knight save tracker, 112% checklist and charms' },
    description: {
      es: 'Importa tu partida de Hollow Knight y mira qué te falta para el 112 %, el mapa del juego con lo que queda y el Diario del Cazador, al día en cada banco. Y una calculadora de amuletos.',
      en: 'Import your Hollow Knight save and see what\'s missing for 112%, the game\'s map with what\'s left and the Hunter\'s Journal, up to date at every bench. Plus a charm calculator.',
    },
    h1: { es: 'Tu partida de Hollow Knight, en vivo', en: 'Your Hollow Knight game, live' },
    body: [
      { es: 'La Calculadora de Hallownest lee el archivo de tu partida de Hollow Knight y te enseña lo que el juego no te dice: qué te falta para el 112 % cosa por cosa, dónde está cada larva, fragmento de máscara y fragmento de vasija que no tienes, en el mapa del propio juego, y cuántas entradas del Diario del Cazador te quedan. En Chrome y Edge sigue el archivo mientras juegas y se pone al día cada vez que descansas en un banco.',
        en: 'Hallownest Calculator reads your Hollow Knight save file and shows what the game doesn\'t tell you: what\'s missing for 112%, item by item, where every grub, Mask Shard and Vessel Fragment you don\'t have yet is, on the game\'s own map, and how many Hunter\'s Journal entries are left. In Chrome and Edge it follows the file while you play, and catches up every time you rest at a bench.' },
      { es: 'Y sin partida también sirve: la calculadora de amuletos te dice cómo cambia cada estadística del Caballero con cada amuleto (daño del aguijón, golpes por jefe, alma, curación, hechizos), y el simulador de combate lleva tu build contra 180 enemigos y jefes, el Hogar de Dioses incluido. Todos los números salen de la wiki, con el redondeo del juego, y todos los nombres, de su traducción oficial.',
        en: 'It works without a save too: the charm calculator tells you how each of the Knight\'s stats changes with each charm (nail damage, hits per boss, soul, healing, spells), and the combat simulator takes your build against 180 enemies and bosses, Godhome included. Every number comes from the wiki, with the game\'s rounding, and every name from its official translation.' },
    ],
    faq: [
      { q: { es: '¿Es gratis? ¿Hace falta cuenta?', en: 'Is it free? Do I need an account?' },
        a: { es: 'Es gratis, sin cuenta y sin anuncios. Tu partida no sale de tu navegador: se lee ahí y se guarda ahí.', en: 'Free, no account and no ads. Your save never leaves your browser: it\'s read there and kept there.' } },
      { q: { es: '¿Funciona con la versión de consola?', en: 'Does it work with the console version?' },
        a: { es: 'Leer la partida necesita el archivo, y solo el juego de ordenador (Windows, macOS, Linux) lo deja a mano. En consola puedes marcar tu progreso a mano.', en: 'Reading the save needs the file, and only the computer version (Windows, macOS, Linux) keeps it where you can reach it. On console you can tick your progress by hand.' } },
    ],
  },
  {
    id: 'analyzer', view: 'home', slug: { es: 'analizador-de-partida', en: 'save-analyzer' },
    link: { es: 'Analizador de partida', en: 'Save analyzer' },
    title: { es: 'Analiza tu partida de Hollow Knight: qué te falta para el 112 %', en: 'Hollow Knight save analyzer: what\'s missing for 112%' },
    description: {
      es: 'Suelta tu archivo de Hollow Knight y mira qué te falta para el 112 %: cada larva, máscara, vasija, amuleto y jefe, en el mapa del juego. Dónde está el archivo en Windows, macOS y Linux.',
      en: 'Drop your Hollow Knight save and see what\'s missing for 112%: every grub, mask, vessel, charm and boss, on the game\'s map. Where the save file is on Windows, macOS and Linux.',
    },
    body: [
      { es: '¿Atascado en el 111 %? Suelta aquí tu archivo de partida (<code>user1.dat</code> a <code>user4.dat</code>, uno por ranura) y el analizador te dice qué cuenta y qué no: los amuletos, los jefes, los guerreros de los sueños, las pruebas del Coliseo de los Insensatos, el equipo, los hechizos, las máscaras, las vasijas, el aguijón, los Soñadores, la compañía de Grimm y los panteones. Y fuera del 112 %, cada larva, fragmento de máscara, fragmento de vasija, Mineral Pálido y muesca que te queda, en el mapa del juego.',
        en: 'Stuck at 111%? Drop your save file here (<code>user1.dat</code> to <code>user4.dat</code>, one per slot) and the analyzer tells you what counts and what doesn\'t: charms, bosses, warrior dreams, the Colosseum of Fools\' trials, equipment, spells, masks, vessels, the nail, the Dreamers, the Grimm Troupe and the pantheons. And beyond the 112%, every grub, Mask Shard, Vessel Fragment, Pale Ore and charm notch you have left, on the game\'s map.' },
      { es: 'El archivo está en <strong>Windows</strong>: <code>%USERPROFILE%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight</code>; en <strong>macOS</strong>: <code>~/Library/Application Support/unity.Team Cherry.Hollow Knight</code>; en <strong>Linux</strong>: <code>~/.config/unity3d/Team Cherry/Hollow Knight</code>. Con Steam Cloud esa carpeta ya tiene la copia sincronizada. En Chrome y Edge el sitio puede seguir el archivo: cada vez que el juego guarda (al descansar en un banco o al salir), la página se pone al día sola.',
        en: 'The file is on <strong>Windows</strong>: <code>%USERPROFILE%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight</code>; on <strong>macOS</strong>: <code>~/Library/Application Support/unity.Team Cherry.Hollow Knight</code>; on <strong>Linux</strong>: <code>~/.config/unity3d/Team Cherry/Hollow Knight</code>. With Steam Cloud that folder already holds the synced copy. In Chrome and Edge the site can follow the file: every time the game saves (resting at a bench or quitting), the page catches up on its own.' },
    ],
    faq: [
      { q: { es: '¿Por qué me quedo en el 111 %?', en: 'Why am I stuck at 111%?' },
        a: { es: 'Casi siempre es una sola cosa: un amuleto frágil que le dejaste a Divine, un fragmento de vasija, un guerrero de los sueños o el último panteón. El analizador te dice cuál.', en: 'It\'s almost always one thing: a fragile charm left with the Divine, a Vessel Fragment, a warrior dream or the last pantheon. The analyzer tells you which.' } },
      { q: { es: '¿Cambia mi partida?', en: 'Does it change my save?' },
        a: { es: 'No. La lee y nada más: no escribe en el archivo y no lo sube a ningún sitio.', en: 'No. It only reads it: it never writes to the file and never uploads it anywhere.' } },
      { q: { es: '¿Y en consola?', en: 'What about consoles?' },
        a: { es: 'Las consolas no dejan sacar el archivo. Puedes marcar tu progreso a mano en la checklist del 112 %.', en: 'Consoles don\'t let you take the file out. You can tick your progress by hand on the 112% checklist.' } },
    ],
  },
  {
    id: 'checklist', view: 'progress', slug: { es: 'checklist-112', en: '112-checklist' },
    link: { es: 'Checklist del 112 %', en: '112% checklist' },
    title: { es: 'Checklist del 112 % de Hollow Knight, marcada con tu partida', en: 'Hollow Knight 112% checklist, ticked from your save' },
    description: {
      es: 'Todo lo que cuenta para el 112 % de Hollow Knight, categoría por categoría, con lo que vale cada cosa. Márcalo a mano o deja que tu partida lo marque sola.',
      en: 'Everything that counts for Hollow Knight\'s 112%, category by category, with what each thing is worth. Tick it by hand or let your save tick it for you.',
    },
    body: [
      { es: 'El 112 % de Hollow Knight son quince categorías: 14 jefes, 7 guerreros de los sueños, las 3 pruebas del Coliseo, 36 amuletos del juego base, 7 piezas de equipo a 2 % cada una, 3 hechizos a 1 % por nivel, 3 artes del aguijón, 4 máscaras, 3 vasijas de alma, 4 mejoras del aguijón, el Aguijón Onírico con su despertar y la Vidente, los 3 Soñadores, la compañía de Grimm, el Caballero Colmena y el Hogar de Dioses. La checklist las lleva todas con lo que vale cada una.',
        en: 'Hollow Knight\'s 112% is fifteen categories: 14 bosses, 7 warrior dreams, the 3 Colosseum trials, 36 base-game charms, 7 pieces of equipment at 2% each, 3 spells at 1% per level, 3 nail arts, 4 masks, 3 soul vessels, 4 nail upgrades, the Dream Nail with its awakening and the Seer, the 3 Dreamers, the Grimm Troupe, the Hive Knight and Godhome. The checklist keeps all of them, with what each one is worth.' },
      { es: 'Puedes marcarla a mano, o importar tu partida y que se marque sola; si sigues el archivo, se pone al día en cada banco. Los coleccionables que no suman porcentaje pero sí vida y alma (46 larvas, 16 fragmentos de máscara, 9 fragmentos de vasija, 6 de Mineral Pálido y 8 muescas de amuletos) están en el Mapa, cada uno en su sala.',
        en: 'Tick it by hand, or import your save and let it tick itself; if you follow the file, it catches up at every bench. The collectibles that add no percentage but do add health and soul (46 grubs, 16 Mask Shards, 9 Vessel Fragments, 6 Pale Ore and 8 charm notches) are on the Map, each one in its room.' },
    ],
    faq: [
      { q: { es: '¿Qué diferencia hay entre el 106 % y el 112 %?', en: 'What\'s the difference between 106% and 112%?' },
        a: { es: 'Seis puntos de las dos últimas expansiones: el Caballero Colmena (Saviavida) y los cinco del Hogar de Dioses (Buscador de Dioses): el Afinador de Dioses y los cuatro primeros panteones.', en: 'Six points from the last two updates: the Hive Knight (Lifeblood) and Godhome\'s five (Godmaster): the Godtuner and the first four pantheons.' } },
      { q: { es: '¿Las larvas cuentan para el 112 %?', en: 'Do grubs count for 112%?' },
        a: { es: 'No: ni las larvas, ni el Diario del Cazador, ni los mapas. Sí cuentan los amuletos que te da el Padre Larva.', en: 'No: neither grubs, the Hunter\'s Journal nor the maps do. The charms the Grubfather gives you do.' } },
      { q: { es: '¿Se puede perder algo para siempre?', en: 'Can anything be missed for good?' },
        a: { es: 'Casi nada. Lo delicado es la compañía de Grimm: el Rey Pesadilla y el destierro cuentan igual, pero hay que elegir uno.', en: 'Almost nothing. The delicate one is the Grimm Troupe: the Nightmare King and the banishment count the same, but you pick one.' } },
    ],
  },
  {
    id: 'charms', view: 'charms', slug: { es: 'calculadora-de-amuletos', en: 'charm-calculator' },
    link: { es: 'Calculadora de amuletos', en: 'Charm calculator' },
    title: { es: 'Calculadora de amuletos de Hollow Knight: daño, golpes y muescas', en: 'Hollow Knight charm calculator: damage, hits and notches' },
    description: {
      es: 'Equipa los amuletos de Hollow Knight y mira cómo cambia cada estadística del Caballero: daño del aguijón, golpes por jefe, alma, curación y hechizos, con las sinergias.',
      en: 'Equip Hollow Knight\'s charms and see how each of the Knight\'s stats changes: nail damage, hits per boss, soul, healing and spells, synergies included.',
    },
    body: [
      { es: 'Los 45 amuletos de Hollow Knight con sus números, no con prosa. Pasa el ratón por uno que no llevas y ves qué cambiaría antes de equiparlo: el daño del aguijón, los golpes por segundo, cuántos golpes aguantas, el alma por golpe, el tiempo de curación y cada hechizo con sus variantes. Las muescas se cuentan como en el juego, con la sobrecarga incluida, y las sinergias (Sombra afilada con Maestro de las embestidas, Hongo con esporas con Blasón del defensor, Canción de larvas con Elegía de la Larvamosca…) se detectan solas.',
        en: 'Hollow Knight\'s 45 charms with their numbers, not prose. Hover one you don\'t wear and see what it would change before you equip it: nail damage, hits per second, how many hits you can take, soul per hit, healing time and every spell with its variants. Notches count as in the game, overcharming included, and synergies (Sharp Shadow with Dashmaster, Spore Shroom with Defender\'s Crest, Grubsong with Grubberfly\'s Elegy…) are detected on their own.' },
      { es: 'Un ejemplo: el Rey Pesadilla Grimm tiene 1500 de vida. Con el Aguijón puro (21) son 72 golpes; con Fuerza frágil (21 × 1,5 = 32) son 47. Cada número enseña su cuenta, y el enlace de compartir lleva tu build entera para pegarla en Discord.',
        en: 'An example: Nightmare King Grimm has 1500 health. With the Pure Nail (21) that\'s 72 hits; with Fragile Strength (21 × 1.5 = 32), 47. Every number shows its sum, and the share link carries your whole build to paste on Discord.' },
    ],
    faq: [
      { q: { es: '¿Cuántas muescas de amuletos hay?', en: 'How many charm notches are there?' },
        a: { es: 'Empiezas con 3 y puedes llegar a 11. Y con una muesca libre puedes equipar un amuleto de más y quedar sobrecargado: recibes el doble de daño.', en: 'You start with 3 and can reach 11. And with any free notch you can equip one charm too many and be overcharmed: you take double damage.' } },
      { q: { es: '¿Cuáles son los mejores amuletos?', en: 'Which are the best charms?' },
        a: { es: 'Depende del jefe. La calculadora ordena el cambio de golpes por muesca contra el enemigo que elijas, así que la respuesta es la de tu pelea.', en: 'It depends on the boss. The calculator ranks the change in hits per notch against the enemy you choose, so the answer is the one for your fight.' } },
    ],
  },
  {
    id: 'map', view: 'map', slug: { es: 'mapa', en: 'map' },
    link: { es: 'Mapa', en: 'Map' },
    title: { es: 'Mapa de Hollow Knight con lo que te falta', en: 'Hollow Knight map with what you\'re missing' },
    description: {
      es: 'El mapa de Hallownest del propio juego con cada larva, máscara, vasija, Mineral Pálido, muesca y banco, y lo que te falta marcado a partir de tu partida.',
      en: 'Hallownest\'s map from the game itself, with every grub, mask, vessel, Pale Ore, notch and bench, and what you\'re missing marked from your save.',
    },
    body: [
      { es: 'Este no es un mapa redibujado: es el del juego, sacado de sus archivos, con cada sala en su sitio. Encima, los 202 coleccionables del reino (46 larvas, 16 fragmentos de máscara, 9 fragmentos de vasija, 6 de Mineral Pálido, las muescas, las llaves, los huevos podridos, las reliquias, las raíces susurrantes, las llamas de los Grimarios, los mapas de Cornifer y las estaciones de ciervos).',
        en: 'This isn\'t a redrawn map: it\'s the game\'s, taken from its files, with every room in its place. On top, the kingdom\'s 202 collectibles (46 grubs, 16 Mask Shards, 9 Vessel Fragments, 6 Pale Ore, the notches, keys, rancid eggs, relics, whispering roots, Grimmkin flames, Cornifer\'s maps and the stag stations).' },
      { es: 'Con tu partida importada, el mapa separa lo que ya tienes de lo que te falta, con tu último banco y dónde espera tu sombra. Sin partida, puedes marcarlos a mano.',
        en: 'With your save imported, the map tells what you have from what you\'re missing, with your last bench and where your shade waits. Without a save, you can mark them by hand.' },
    ],
    faq: [
      { q: { es: '¿Cómo sé qué larvas me faltan?', en: 'How do I know which grubs I\'m missing?' },
        a: { es: 'Importa tu partida: el mapa marca cada larva que no has liberado en su sala.', en: 'Import your save: the map marks every grub you haven\'t freed, in its room.' } },
      { q: { es: '¿Y los fragmentos de máscara?', en: 'And the Mask Shards?' },
        a: { es: 'Igual: cada uno de los 16 fragmentos de máscara y de los 9 fragmentos de vasija sale en su sala mientras te falte, y si quieres, también los que ya tienes.', en: 'The same: each of the 16 Mask Shards and 9 Vessel Fragments shows in its room while you\'re missing it, and, if you like, the ones you have too.' } },
    ],
  },
  {
    id: 'journal', view: 'journal', slug: { es: 'diario-del-cazador', en: 'hunters-journal' },
    link: { es: 'Diario del Cazador', en: 'Hunter\'s Journal' },   // INV_NAME_JOURNAL
    title: { es: 'Diario del Cazador de Hollow Knight: lo que te falta', en: 'Hollow Knight Hunter\'s Journal tracker' },
    description: {
      es: 'Cada entrada del Diario del Cazador de Hollow Knight, con las derrotas que te quedan para descifrarla y lo que falta para la Marca de cazador, leído de tu partida.',
      en: 'Every entry of Hollow Knight\'s Hunter\'s Journal, with the kills left to decipher it and what\'s missing for the Hunter\'s Mark, read from your save.',
    },
    body: [
      { es: 'El Diario del Cazador no cuenta para el 112 %, pero tiene su propio logro. Aquí está entrada a entrada, de «no encontrado» a «completado», con las derrotas que te quedan para descifrar cada una, igual que las cuenta el juego.',
        en: 'The Hunter\'s Journal doesn\'t count for 112%, but it has its own achievement. Here it is entry by entry, from "not encountered" to "completed", with the kills you have left to decipher each one, just as the game counts them.' },
      { es: 'El total del juego no es 164: empieza en las 146 que pide la Marca de cazador y sube con cada entrada opcional que encuentras. Importa tu partida y el Diario se rellena solo.',
        en: 'The game\'s total isn\'t 164: it starts at the 146 the Hunter\'s Mark requires and goes up with each optional entry you find. Import your save and the Journal fills itself in.' },
    ],
    faq: [
      { q: { es: '¿Cuántas entradas pide la Marca de cazador?', en: 'How many entries does the Hunter\'s Mark need?' },
        a: { es: '146 completadas. Las otras 18 son opcionales.', en: '146 completed. The other 18 are optional.' } },
      { q: { es: '¿Cuándo aparece una entrada?', en: 'When does an entry appear?' },
        a: { es: 'Con la primera derrota, no al ver al enemigo.', en: 'With the first kill, not on seeing the enemy.' } },
    ],
  },
  {
    id: 'godhome', view: 'godhome', slug: { es: 'hogar-de-dioses', en: 'godhome' },
    link: { es: 'Hogar de Dioses', en: 'Godhome' },   // GODHOME_MAIN
    title: { es: 'Hogar de Dioses de Hollow Knight: panteones y Salón de los Dioses', en: 'Hollow Knight Godhome: Pantheons and Hall of Gods' },
    description: {
      es: 'Las 44 estatuas del Salón de los Dioses en Armonía, Ascendido y Radiante, y los cinco panteones sala a sala, con las ataduras, las fuentes termales y el capullo de saviavida.',
      en: 'The 44 statues of the Hall of Gods on Attuned, Ascended and Radiant, and the five Pantheons room by room, with the bindings, the hot springs and the lifeblood cocoon.',
    },
    body: [
      { es: 'El Salón de los Dioses con sus 44 estatuas, la vida de cada jefe en Armonía y Ascendido, y tus símbolos marcados. Y los cinco panteones sala a sala: qué jefe viene, cuánta vida tiene, dónde están los bancos y las fuentes termales, y cuántos golpes necesitas con tu build.',
        en: 'The Hall of Gods with its 44 statues, each boss\'s health on Attuned and Ascended, and your symbols marked. And the five Pantheons room by room: which boss comes next, how much health it has, where the benches and hot springs are, and how many hits you need with your build.' },
      { es: 'Las ataduras de la puerta de saviavida cuentan con sus números: el aguijón atado se queda en 13, la concha en 4 máscaras, el alma en 33 y los amuletos se desactivan. Puedes jugar un panteón en el simulador golpe a golpe.',
        en: 'The lifeblood door\'s bindings come with their numbers: the bound nail stays at 13, the shell at 4 masks, soul at 33, and charms are disabled. You can play a pantheon in the simulator, hit by hit.' },
    ],
    faq: [
      { q: { es: '¿Qué panteones cuentan para el 112 %?', en: 'Which pantheons count for 112%?' },
        a: { es: 'Los cuatro primeros, 1 % cada uno, más el Afinador de Dioses. El quinto, el Panteón de Hallownest, no suma.', en: 'The first four, 1% each, plus the Godtuner. The fifth, the Pantheon of Hallownest, adds nothing.' } },
    ],
  },
  {
    id: 'combat', view: 'fight', slug: { es: 'calculadora-de-danio', en: 'boss-damage-calculator' },
    link: { es: 'Calculadora de daño', en: 'Boss damage calculator' },
    title: { es: 'Calculadora de daño de Hollow Knight: golpes por jefe', en: 'Hollow Knight boss damage calculator: hits to kill' },
    description: {
      es: '¿Cuántos golpes necesita cada jefe de Hollow Knight? Lleva tu build contra 180 enemigos y jefes, golpe a golpe, con fases, armadura, alma y las máscaras que pierdes.',
      en: 'How many hits does each Hollow Knight boss take? Take your build against 180 enemies and bosses, hit by hit, with phases, armour, soul and the masks you lose.',
    },
    body: [
      { es: 'Elige un jefe y tu build y el simulador responde: cuántos golpes de aguijón, cuántos hechizos, cuántos golpes suyos aguantas. Son 180 entradas, todos los jefes y los enemigos del Diario, con su vida, sus fases y el daño de cada ataque.',
        en: 'Pick a boss and your build and the simulator answers: how many nail hits, how many spells, how many of its hits you can take. There are 180 entries, every boss and the Journal\'s enemies, with their health, their phases and each attack\'s damage.' },
      { es: 'Puedes pelear golpe a golpe: el alma que ganas, las máscaras que pierdes, el aturdimiento, los amuletos que actúan en combate (Escudo Onírico, Canción de Tejedora, Niño de Grimm…) y deshacer cuando te equivocas.',
        en: 'You can fight hit by hit: the soul you gain, the masks you lose, stagger, the charms that act in combat (Dreamshield, Weaversong, Grimmchild…) and undo when you get it wrong.' },
    ],
    faq: [
      { q: { es: '¿Cuánta vida tiene el Rey Pesadilla Grimm?', en: 'How much health does Nightmare King Grimm have?' },
        a: { es: '1500 en la partida, 1250 en Armonía y 1650 en Ascendido: 72 golpes con el Aguijón puro.', en: '1500 in the main game, 1250 on Attuned and 1650 on Ascended: 72 hits with the Pure Nail.' } },
    ],
  },
];

module.exports = { BRAND, LABELS, PAGES, OG_ALT };
