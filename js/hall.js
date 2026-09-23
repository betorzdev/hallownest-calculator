/* js/hall.js — the Hall of Gods: its statues' 44 fights.
   Source: kb/data/hall_of_gods.json and kb/05-godhome.md §3, checked against the
   "Hall of Gods" page on hollowknight.wiki and «Salón de los Dioses» on the Spanish wiki
   (September 2026):
     id      the js/enemies.js entry; its Attuned and Ascended health comes from there (at, asra)
     title   the statue's title. In English, the English wiki's; in Spanish, the Spanish
             wiki's. Both are the game's text: nothing is translated by hand
     arena   what changes about the fight in the Hall. It's the site's text, not the game's (like
             the notes in js/pantheons.js): the English version comes from the "arena" field of
             the Godmaster template on each boss's wiki page, and the Spanish one from kb/,
             rewritten so they say the same. With no arena, the wiki says "same arena, no
             difficulty differences", and the plaque writes that ("As in the base game")
     short   the name for the grid tile when the full one doesn't fit on two lines
             (Grimm, Sly). The plaque and the tile's title keep the full one
     tablet  the name on the entrance tablet, only where it isn't the entry's: the tablet
             uses the statue's (the "name" field of the Godmaster template on each page of
             the English wiki; "Nightmare King", not "Nightmare King Grimm"). In Spanish,
             that page's ESname or the statue's title on the Spanish wiki
     of      the second fight of a double pedestal: it points to the first, which comes just before
     via     how you switch from one to the other in the game: 'lever' (a lever you hit with
             the nail) or 'dream' (the pedestal's dreamcatcher, with the Dream Nail)

   44 fights on 35 pedestals: 4 with a lever (Hornet, Crystal Guardian, Mantis Lords, Nosk)
   and 5 with a dreamcatcher (False Knight, Broken Vessel, Soul Master, Dung Defender,
   Grimm). The lever ones each have their own statue; the dreamcatcher ones share their
   partner's.

   The two wikis don't always give the same health: where they disagree, the English one
   and kb/ rule (Oblobble phase 2 = 650, not 600; Absolute Radiance = 2181, not 2200). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  const ASC = (es, en) => ({ es: 'En Ascendido ' + es, en: 'On Ascended ' + en });

  const STATUES = [
    { id: 'gruz-mother',
      title: { es: 'Somnoliento dios de la fertilidad', en: 'Slumbering god of fertility' },
      arena: ASC('el suelo se cambia por 3 plataformas pequeñas y 4 fosos de pinchos.', 'the floor becomes 3 small platforms and 4 spike pits.') },
    { id: 'vengefly-king',
      title: { es: 'Despiadado dios de los territorios', en: 'Vicious god of territories' },
      arena: ASC('sale un segundo rey en el lado opuesto: 735 de vida el izquierdo y 430 el derecho.', 'a second king spawns on the opposite side: 735 health the left one, 430 the right one.') },
    { id: 'brooding-mawlek',
      title: { es: 'Dios solitario del nido', en: 'Lonely god of the nest' },
      arena: ASC('desaparece la plataforma central.', 'the middle platform disappears.') },
    { id: 'false-knight',
      title: { es: 'Dios furioso de los oprimidos', en: 'Angry god of the downtrodden' },
      arena: { es: 'Arena más grande que en la partida, y sin el gusano: tres armaduras seguidas. No rompe el suelo antes de caer.',
               en: 'A larger arena than in the base game, and no Maggot: three armour bars in a row. It does not fall through the floor before its defeat.' } },
    { id: 'failed-champion', of: 'false-knight', via: 'dream',
      title: { es: 'Funesto dios de los remordimientos', en: 'Baleful god of regrets' },
      arena: { es: 'Sin el gusano: tres armaduras seguidas. No rompe el suelo antes de caer.',
               en: 'No Maggot: three armour bars in a row. It does not fall through the floor before its defeat.' } },
    { id: 'hornet-protector',
      title: { es: 'Dios protector de una tierra que se desvanece', en: 'God protector of a fading land' } },
    { id: 'hornet-sentinel', of: 'hornet-protector', via: 'lever',
      title: { es: 'Dios protector de una tierra que se desvanece', en: 'God protector of a fading land' } },
    { id: 'massive-moss-charger',
      title: { es: 'Incansable dios de los que trabajan juntos', en: 'Restless god of those who band together' },
      arena: ASC('la arena es más ancha.', 'the arena is wider.') },
    { id: 'flukemarm',
      title: { es: 'Seductor dios de la maternidad', en: 'Alluring God of motherhood' },
      arena: { es: 'Falta la plataforma de arriba a la izquierda. En Ascendido, las 6 primeras Tremacrías tienen más vida.',
               en: 'The top-left platform is missing. On Ascended the first 6 Flukefeys have more health.' } },
    { id: 'mantis-lords',
      title: { es: 'Nobles hermanas diosas del combate', en: 'Noble sister gods of combat' } },
    { id: 'sisters-of-battle', of: 'mantis-lords', via: 'lever',
      title: { es: 'Dioses venerados de una orgullosa tribu', en: 'Revered gods of a proud tribe' },
      arena: { es: 'La arena de los Señores mantis; en la fase 2 pelean las tres a la vez.',
               en: 'The Mantis Lords\' arena; in phase 2 all three fight at once.' } },
    { id: 'oblobbles', tablet: { es: 'Oblobble', en: 'Oblobble' },
      title: { es: 'Amantes dioses de la fe y la devoción', en: 'Lover gods of faith and devotion' } },
    { id: 'hive-knight',
      title: { es: 'Dios vigilante del deber', en: 'Watchful god of duty' },
      arena: { es: 'No abre con el Cañón de abejas. En Ascendido empieza en su fase 3, con todos sus ataques.',
               en: 'It does not open with Swarm Release. On Ascended it starts in its phase 3, with all its attacks.' } },
    { id: 'broken-vessel',
      title: { es: 'Cáscara rota de un dios vacío', en: 'Broken shell of an empty god' } },
    { id: 'lost-kin', of: 'broken-vessel', via: 'dream',
      title: { es: 'Dios perdido del Abismo', en: 'Lost god of the Abyss' } },
    { id: 'nosk',
      title: { es: 'Siempre cambiante dios de los sin rostro', en: 'Everchanging god of the faceless' },
      arena: ASC('desaparece la plataforma central.', 'the middle platform disappears.') },
    { id: 'winged-nosk', of: 'nosk', via: 'lever',
      title: { es: 'Dios engañoso tomando la forma de un protector', en: 'Deceptive god assuming a protector\'s form' } },
    { id: 'the-collector',
      title: { es: 'Dios alegre de la protección', en: 'Joyful god of protection' },
      arena: ASC('sus jarras cambian de repertorio (Aspid primigenio, Baldur espinado y Mosquito blindado, todos de 26 de vida) y en la fase 1 cae una sola jarra a la vez.',
                 'its jars change roster (Primal Aspid, Sharp Baldur and Armoured Squit, all at 26 health) and in phase 1 only one jar drops at a time.') },
    { id: 'god-tamer',
      title: { es: 'Galante dios de la arena', en: 'Gallant god of the arena' } },
    { id: 'crystal-guardian',
      title: { es: 'Brillante dios de la avaricia', en: 'Shining god of greed' },
      arena: { es: 'Arena mucho más grande, con pinchos en la mitad de arriba de las dos paredes; abre con un ataque al azar.',
               en: 'A much larger arena, with spikes on the top half of both walls; it opens with a random attack.' } },
    { id: 'enraged-guardian', of: 'crystal-guardian', via: 'lever',
      title: { es: 'Brillante dios de la avaricia', en: 'Shining god of greed' },
      arena: { es: 'Arena más pequeña, con pinchos en la mitad de arriba de las dos paredes; abre con el Rayo láser y luego uno al azar.',
               en: 'A smaller arena, with spikes on the top half of both walls; it opens with Laser Beam and then a random attack.' } },
    { id: 'uumuu',
      title: { es: 'Extraño dios del conocimiento', en: 'Uncanny god of knowledge' },
      arena: { es: 'Sin Quirrel: le revientan la membrana los Ooma que invoca. En Ascendido, una niebla verde que hace daño cubre el fondo.',
               en: 'No Quirrel: the Oomas it summons are what burst its membrane. On Ascended a damaging green fog covers the bottom.' } },
    { id: 'traitor-lord',
      title: { es: 'Traicionero dios de la ira', en: 'Treacherous god of anger' },
      arena: { es: 'Arena mucho más grande que en la partida, y sin Traidores mantis antes de la pelea.',
               en: 'A much larger arena than in the base game, and no Mantis Traitors before the fight.' } },
    { id: 'grey-prince-zote',
      title: { es: 'Dios falso conjurado por los solitarios', en: 'False god conjured by the lonely' },
      arena: { es: 'Arena más ancha que en la partida. Pelea como en su tercera vez, pero los Zotitos Volátiles quitan 2 máscaras al explotar.',
               en: 'A wider arena than in the base game. It fights as in its third bout, but Volatile Zotelings deal 2 masks when they explode.' } },
    { id: 'soul-warrior',
      title: { es: 'Atormentado dios del Santuario', en: 'Haunted god of the sanctum' },
      arena: ASC('invoca Folly, hasta 36.', 'it summons Follies, up to 36.') },
    { id: 'soul-master',
      title: { es: 'Codicioso dios del alma', en: 'Covetous god of soul' },
      arena: { es: 'No rompe el suelo a mitad de pelea.', en: 'It does not smash through the ground mid-fight.' } },
    { id: 'soul-tyrant', of: 'soul-master', via: 'dream',
      title: { es: 'Frenético dios de la mortalidad', en: 'Frenzied god of mortality' },
      arena: { es: 'No rompe el suelo a mitad de pelea.', en: 'It does not smash through the ground mid-fight.' } },
    { id: 'dung-defender',
      title: { es: 'Bondadoso dios de la valentía y el honor', en: 'Kindly god of bravery and honour' } },
    { id: 'white-defender', of: 'dung-defender', via: 'dream',
      title: { es: 'Bondadoso dios de la valentía y el honor', en: 'Kindly god of bravery and honour' } },
    { id: 'watcher-knights', tablet: { es: 'Caballero vigía', en: 'Watcher Knight' },
      title: { es: 'Dioses centinelas de la torre', en: 'Sentinel gods of the spire' },
      arena: { es: 'Son seis: no se pueden reducir a cinco.', en: 'Their number cannot be reduced to five.' } },
    { id: 'no-eyes',
      title: { es: 'Dios onírico del miedo y el alivio', en: 'Dreamborn god of fear and relief' },
      arena: ASC('se recolocan las plataformas y la arena se llena de espinas.', 'the platforms are rearranged and thorns fill the arena.') },
    { id: 'marmu',
      title: { es: 'Dios onírico de los jardines', en: 'Dreamborn god of gardens' },
      arena: ASC('la arena se encoge y se cierra con espinas por tres lados.', 'the arena shrinks and is boxed in by thorns on three sides.') },
    { id: 'xero',
      title: { es: 'Dios onírico de la fe y la traición', en: 'Dreamborn god of faith and betrayal' },
      arena: ASC('el suelo pasa a ser tres plataformas separadas.', 'the floor becomes three separate platforms.') },
    { id: 'markoth',
      title: { es: 'Dios onírico de la meditación y la soledad', en: 'Dreamborn god of meditation and isolation' },
      arena: ASC('desaparece el suelo y se recolocan las plataformas.', 'the floor disappears and the platforms are rearranged.') },
    { id: 'galien',
      title: { es: 'Dios onírico de los corazones heroicos', en: 'Dreamborn god of heroic hearts' } },
    { id: 'gorb',
      title: { es: 'Dios onírico del más allá', en: 'Dreamborn god of the beyond' },
      arena: ASC('el suelo pasa a ser tres plataformas.', 'the floor becomes three platforms.') },
    { id: 'elder-hu',
      title: { es: 'Dios onírico de los sabios y los viajeros', en: 'Dreamborn god of travellers and sages' } },
    /* Oro & Mato, Nailsage Sly and Radiance: the English tablet shortens the name, but there's
       no source for how the Spanish one shortens it. The statue's name on the Spanish wiki,
       which is the entry's, is kept, without inventing the cut. */
    { id: 'oro-mato', tablet: { es: 'Oro y Mato', en: 'Oro & Mato' },
      title: { es: 'Leales dioses hermanos del aguijón', en: 'Loyal brother gods of the nail' } },
    { id: 'sheo',
      title: { es: 'Talentoso dios de artistas y creadores', en: 'Talented god of artists and creators' } },
    { id: 'sly', short: { es: 'Sly', en: 'Nailsage Sly' }, tablet: { es: 'Sabio del Aguijón Sly', en: 'Nailsage Sly' },
      title: { es: 'Dios astuto de la oportunidad', en: 'Cunning god of opportunity' } },
    { id: 'pure-vessel',
      title: { es: 'Poderoso dios de la nada', en: 'Mighty god of nothingness' } },
    { id: 'grimm', short: { es: 'Grimm', en: 'Troupe Master Grimm' }, tablet: { es: 'Grimm', en: 'Grimm' },
      title: { es: 'Dios viajero de la compañía', en: 'Travelling god of the troupe' } },
    { id: 'nkg', of: 'grimm', via: 'dream', tablet: { es: 'Rey Pesadilla', en: 'Nightmare King' },
      title: { es: 'Dios de las pesadillas', en: 'God of nightmares' },
      arena: { es: 'La arena es una sola plataforma, sin paredes.', en: 'The arena is a single platform, with its walls cut off.' } },
    { id: 'absolute-radiance', tablet: { es: 'Destello', en: 'Radiance' },
      title: { es: 'Dios olvidado de la luz', en: 'Forgotten god of light' },
      arena: { es: 'La arena del Panteón, que se amplía para su última fase.', en: 'The Pantheon arena, which expands for the final phase.' } },
  ];

  const STATUE_BY_ID = Object.fromEntries(STATUES.map((s) => [s.id, s]));

  /* The pedestals, in the Hall's order: one or two bosses each. */
  const PEDESTALS = STATUES.reduce((out, s) => {
    if (s.of) out[out.length - 1].push(s); else out.push([s]);
    return out;
  }, []);

  const DIFFS = ['at', 'asra', 'radiant'];

  /* The entrance tablet: in the game it's read and shows the 44 in four columns of eleven,
     each with its symbol in front, under the title "Hall of Gods" (GG_SUMMARY_TITLE, the
     only place in the game where that name appears). The order is that of the wiki's
     screenshot ("Screenshot HK Hall of Gods 03"), which is that of the list on the Spanish
     wiki: Galien comes before Markoth and Xero. The English one, which STATUES follows, puts him after. */
  const TABLET = [
    'gruz-mother', 'vengefly-king', 'brooding-mawlek', 'false-knight', 'failed-champion', 'hornet-protector',
    'hornet-sentinel', 'massive-moss-charger', 'flukemarm', 'mantis-lords', 'sisters-of-battle',
    'oblobbles', 'hive-knight', 'broken-vessel', 'lost-kin', 'nosk', 'winged-nosk',
    'the-collector', 'god-tamer', 'crystal-guardian', 'enraged-guardian', 'uumuu',
    'traitor-lord', 'grey-prince-zote', 'soul-warrior', 'soul-master', 'soul-tyrant', 'dung-defender',
    'white-defender', 'watcher-knights', 'no-eyes', 'marmu', 'galien',
    'markoth', 'xero', 'gorb', 'elder-hu', 'oro-mato', 'sheo',
    'sly', 'pure-vessel', 'grimm', 'nkg', 'absolute-radiance',
  ];

  /* The symbol it carries in front on the tablet: the highest you have, or none. In the
     screenshot all 44 are on Radiant; how the game paints a row without one isn't in any
     source, and the highest is what its statue's plaque shows. */
  const tabletMark = (marks, id) => [...DIFFS].reverse().find((d) => ((marks && marks[id]) || []).includes(d)) || null;

  /* The wiki: the Hollow Knight and the Radiance have no statue; in the Hall their stronger
     versions replace them. From their Journal page, "See their statue" leads to those. */
  const STATUE_OF = { 'hollow-knight': 'pure-vessel', 'the-radiance': 'absolute-radiance' };
  const statueFor = (id) => (STATUE_BY_ID[id] ? id : STATUE_OF[id] || null);

  /* The two fights of a dreamcatcher pedestal share a statue. */
  const artOf = (s) => (s.via === 'dream' ? s.of : s.id);

  /* The saved marks: { id: ['at', 'asra', 'radiant'] }, each symbol on its own
     (in the game, winning on Ascended doesn't give you the Attuned one). Whatever comes
     broken or stale is cleaned: ids that no longer exist, odd difficulties, repeats. */
  function normalizeMarks(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [id, list] of Object.entries(raw)) {
      if (!STATUE_BY_ID[id] || !Array.isArray(list)) continue;
      const got = DIFFS.filter((d) => list.includes(d));
      if (got.length) out[id] = got;
    }
    return out;
  }

  /* Mark or remove a symbol by hand: returns new marks, without touching the given ones. They're
     your real game's, not the simulator's. As in the game, Radiant only exists after beating
     Ascended: switching it on switches on Ascended, and switching off Ascended switches off Radiant.
     Attuned goes on its own (beating Ascended doesn't give it). */
  function toggleMark(marks, id, d) {
    const m = normalizeMarks(marks);
    if (!STATUE_BY_ID[id] || !DIFFS.includes(d)) return m;
    const got = new Set(m[id] || []);
    if (got.has(d)) {
      got.delete(d);
      if (d === 'asra') got.delete('radiant');
    } else {
      got.add(d);
      if (d === 'radiant') got.add('asra');
    }
    const list = DIFFS.filter((x) => got.has(x));
    if (list.length) m[id] = list; else delete m[id];
    return m;
  }

  /* Mark or remove a symbol on all 44 at once. It's toggleMark on the ones that don't already
     have it as requested, so it follows its rules: marking Radiant marks Ascended, and removing
     Ascended removes Radiant. */
  const markAll = (marks, d, on) => STATUES.reduce(
    (m, s) => ((m[s.id] || []).includes(d) === on ? m : toggleMark(m, s.id, d)), normalizeMarks(marks));

  /* The Void Idol: the highest difficulty at which all 44 are won, or null.
     The wiki: it appears on beating all of them "in at least one difficulty", and changes on
     beating all of them on Ascended and then on Radiant. So a level counts with that mark or with
     a higher one. */
  function idolTier(marks) {
    const m = normalizeMarks(marks);
    const hasAtLeast = (id, d) => (m[id] || []).some((x) => DIFFS.indexOf(x) >= DIFFS.indexOf(d));
    for (const d of [...DIFFS].reverse()) {
      if (STATUES.every((s) => hasAtLeast(s.id, d))) return d;
    }
    return null;
  }

  HK.hall = { STATUES, STATUE_BY_ID, PEDESTALS, DIFFS, TABLET, tabletMark, STATUE_OF, statueFor, artOf, normalizeMarks, toggleMark, markAll, idolTier };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.hall;
})();
