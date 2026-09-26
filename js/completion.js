/* js/completion.js — your game's completion: the 112% the game counts, and what it's made of.
   Pure: no DOM and no language, like js/hunter.js. The names come with the screen.

   The rules are the wiki's ("Completion (Hollow Knight)"), fifteen categories that add up to
   112, and they were checked against the game's own figure (playerData.completionPercentage)
   in 51 real saves from 1% to 107%: all 51 match. And against the game's own code (26 September
   2026): PlayerData.CountGameCompletion and CountCharms, read from Assembly-CSharp.dll (patch
   1.5, Unity 6), read exactly these fields with these weights: the charms by gotCharm_1…35 and
   37…40 plus royalCharmState > 2 (a broken fragile charm still counts: it isn't looked at), the
   fourteen bosses (Hornet by hornet1Defeated and hornetOutskirtsDefeated), the Hive Knight, the
   three trials, the seven warrior dreams, the spells' levels, the three arts, 2 per piece of
   equipment, the Dreamers, the Dream Nail with its awakening and mothDeparted, the nail
   upgrades, maxHealthBase − 5, 1–3 for MPReserveMax 33/66/99, Grimm, Nightmare King or the
   lantern destroyed, the Godtuner and the first four pantheons' doors completed. Most of it the site already keeps, and it's
   read from there, not copied:
     build     masks (maxHealthBase − 5), vessels, nail, spells, nail arts, Dream Nail, the cloaks
     owned     the charms: numbers 1–36 for the base game (Kingsoul only once whole: the site
               only has it from royalCharmState 3), 37–40 in the Grimm Troupe's
     journal   the bosses, the warrior dreams, Grimm, Nightmare King and the Hive Knight: the game
               marks them with the same killed<X> the Hunter's Journal reads
   The rest is in the slot's hollow.progress (js/progress.js): the equipment, the Dreamers, the
   Colosseum, Hornet Sentinel (the Journal has one Hornet for both fights), the pantheons
   cleared… A fragile charm eaten by the Divine doesn't count until it comes back (divine-*). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const HJ = HK.hunter || require('./hunter.js');
  const P = HK.progress || require('./progress.js');

  /* The categories, in the wiki's order, and what each one is out of. Each item is
     [id, where it's read, points]: 'journal' (the entry of that id encountered), 'progress',
     'charm' (the site's charm id, any version), or a function (build, { book, has, charm }). */
  const seen = (book, id) => HJ.stateOf(book, id).seen;
  const CATEGORIES = Object.freeze([
    { id: 'bosses', items: ['broken-vessel', 'brooding-mawlek', 'the-collector', 'dung-defender', 'false-knight',
      'gruz-mother', 'hornet-protector', 'mantis-lords', 'nosk', 'soul-master', 'traitor-lord', 'uumuu',
      'watcher-knights'].map((id) => [id, 'journal', 1]).concat([['hornet-sentinel', 'progress', 1]]) },
    { id: 'dreams', items: ['elder-hu', 'galien', 'gorb', 'markoth', 'marmu', 'no-eyes', 'xero'].map((id) => [id, 'journal', 1]) },
    { id: 'colosseum', items: ['trial-warrior', 'trial-conqueror', 'trial-fool'].map((id) => [id, 'progress', 1]) },
    { id: 'charms', items: ['compass', 'swarm', 'stalwart', 'catcher', 'shaman', 'eater', 'dashmaster', 'thorns',
      'fury', 'heart', 'greed', 'strength', 'twister', 'steady', 'heavy', 'quickslash', 'longnail', 'pride',
      'baldur', 'flukenest', 'crest', 'womb', 'quickfocus', 'deepfocus', 'lbheart', 'lbcore', 'joni', 'grubsong',
      'elegy', 'hiveblood', 'spore', 'sharpshadow', 'unn', 'glory', 'wielder', 'king'].map((id) => [id, 'charm', 1]) },
    { id: 'equipment', items: [['crystal-heart', 'progress', 2], ['isma-tear', 'progress', 2], ['kings-brand', 'progress', 2],
      ['mantis-claw', 'progress', 2], ['monarch-wings', 'progress', 2],
      ['mothwing-cloak', (b) => (b.cloak >= 1 ? 2 : 0), 2], ['shade-cloak', (b) => (b.cloak >= 2 ? 2 : 0), 2]] },
    { id: 'spells', items: [['vs', (b) => b.spells.vs, 2], ['dd', (b) => b.spells.dd, 2], ['hw', (b) => b.spells.hw, 2]] },
    { id: 'arts', items: [['cyclone', (b) => +!!b.arts.cyclone, 1], ['dash', (b) => +!!b.arts.dash, 1], ['great', (b) => +!!b.arts.great, 1]] },
    { id: 'masks', items: [['masks', (b) => b.masks - 5, 4]] },
    { id: 'vessels', items: [['vessels', (b) => b.vessels, 3]] },
    { id: 'nail', items: [['nail', (b) => b.nail, 4]] },
    { id: 'dreamNail', items: [['dream-nail', (b) => +!!b.dream, 1], ['dream-awakened', 'progress', 1], ['seer-ascended', 'progress', 1]] },
    { id: 'dreamers', items: ['monomon', 'lurien', 'herrah'].map((id) => [id, 'progress', 1]) },
    { id: 'grimm', items: [['dreamshield', 'charm', 1], ['grimmchild', (b, x) => +x.charm('grimm'), 1],
      ['sprintmaster', 'charm', 1], ['weaversong', 'charm', 1], ['troupe-master-grimm', (b, x) => +seen(x.book, 'grimm'), 1],
      ['nkg', (b, x) => +(seen(x.book, 'nkg') || x.has('banishment')), 1]] },
    { id: 'hive', items: [['hive-knight', 'journal', 1]] },
    { id: 'godmaster', items: [['godtuner', 'progress', 1], ['pantheon-master', 'progress', 1],
      ['pantheon-artist', 'progress', 1], ['pantheon-sage', 'progress', 1], ['pantheon-knight', 'progress', 1]] },
  ]);
  const TOTAL = CATEGORIES.reduce((n, c) => n + c.items.reduce((m, it) => m + it[2], 0), 0);   // 112

  // The site's charm id → the charm it is, whatever the version.
  const BASE = { fheart: 'heart', uheart: 'heart', fgreed: 'greed', ugreed: 'greed', fstrength: 'strength',
    ustrength: 'strength', kingsoul: 'king', voidheart: 'king', grimmchild: 'grimm', melody: 'grimm' };
  const DIVINE = { heart: 'divine-heart', greed: 'divine-greed', strength: 'divine-strength' };

  /* The game's parts, read from the site: { build, owned, book, progress } (decoded, as the
     screens hold them) → { total, max: 112, categories: [{ id, got, max, items: [{ id, got, max }] }] }. */
  function count({ build, owned = [], book = {}, progress = {} }) {
    const ids = P.normalize(progress).ids;
    const has = (id) => ids.includes(id);
    const charms = new Set(owned.map((id) => BASE[id] || id).filter((id) => !(DIVINE[id] && has(DIVINE[id]))));
    const x = { book, has, charm: (id) => charms.has(id) };
    const categories = CATEGORIES.map((c) => {
      const items = c.items.map(([id, from, max]) => {
        // A yes or no is worth the whole item; a function counts its points itself.
        const v = from === 'journal' ? max * seen(book, id) : from === 'progress' ? max * has(id)
          : from === 'charm' ? max * charms.has(id) : from(build, x);
        return { id, got: Math.max(0, Math.min(max, v)), max };
      });
      return { id: c.id, got: items.reduce((n, it) => n + it.got, 0), max: items.reduce((n, it) => n + it.max, 0), items };
    });
    return { total: categories.reduce((n, c) => n + c.got, 0), max: TOTAL, categories };
  }

  HK.completion = { CATEGORIES, TOTAL, count };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.completion;
})();
