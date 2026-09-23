/* js/pantheons.js — Godhome's five Pantheons, room by room.
   Source: kb/data/pantheons.json (the first four) and the table in kb/05-godhome.md
   (Hallownest), with each room's type checked against the wiki in September 2026:
     fight      a fight; foe points to a js/enemies.js entry
     rest       hot springs and bench (in the game, "Resting Spot")
     godseeker  the Godseeker (in the game, "Non-combat room"): no mechanical effect

   The first four are 12 rooms with the rest in room 6 and the Godseeker in room 11.
   Hallownest is 53: 42 fights, 7 rests and 4 Godseeker rooms.

   Health: every pantheon is fought with Attuned health. Hallownest also uses Ascended's
   arenas and number of enemies, which is why some rooms carry their own variation:
     count      how many identical ones at once (room 1 is TWO Vengefly Kings)
     hp         that room's own health (Hallownest's Brooding Mawlek has 750)
     ascended   the room uses Ascended's arena and enemies: its bosses summon as on
                Ascended (the Collector, its three at 26; Soul Warrior, Follies)
     note       what changes in that room, for the timeline

   Nothing is translated by hand (a project rule): the pantheon names come from the wiki's
   Localisation block; the mottos, from the Spanish wiki; Unn, the White Lady and the Pale
   King, from their entries. The Sage's motto in kb/ was backwards («de la Riqueza y el Poder»). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  const PANTHEONS = [
    { id: 'master', name: { es: 'Panteón del Maestro', en: 'Pantheon of the Master' },
      motto: { es: 'Busca a los Dioses del Aguijón y la Coraza', en: 'Seek the Gods of Nail and Shell' },
      rooms: [
        { type: 'fight', foe: 'vengefly-king' },
        { type: 'fight', foe: 'gruz-mother' },
        { type: 'fight', foe: 'false-knight' },
        { type: 'fight', foe: 'massive-moss-charger' },
        { type: 'fight', foe: 'hornet-protector' },
        { type: 'rest' },
        { type: 'fight', foe: 'gorb' },
        { type: 'fight', foe: 'dung-defender' },
        { type: 'fight', foe: 'soul-warrior' },
        { type: 'fight', foe: 'brooding-mawlek' },
        { type: 'godseeker' },
        { type: 'fight', foe: 'oro-mato' },
      ] },
    { id: 'artist', name: { es: 'Panteón del Artista', en: 'Pantheon of the Artist' },
      motto: { es: 'Busca al Dios Inspirado', en: 'Seek the God Inspired' },
      rooms: [
        { type: 'fight', foe: 'xero' },
        { type: 'fight', foe: 'crystal-guardian' },
        { type: 'fight', foe: 'soul-master' },
        { type: 'fight', foe: 'oblobbles' },
        { type: 'fight', foe: 'mantis-lords' },
        { type: 'rest' },
        { type: 'fight', foe: 'marmu' },
        { type: 'fight', foe: 'nosk' },
        { type: 'fight', foe: 'flukemarm' },
        { type: 'fight', foe: 'broken-vessel' },
        { type: 'godseeker' },
        { type: 'fight', foe: 'sheo' },
      ] },
    { id: 'sage', name: { es: 'Panteón del Sabio', en: 'Pantheon of the Sage' },
      motto: { es: 'Busca al Dios del Poder y la Riqueza', en: 'Seek the God of Wealth and Power' },
      rooms: [
        { type: 'fight', foe: 'hive-knight' },
        { type: 'fight', foe: 'elder-hu' },
        { type: 'fight', foe: 'the-collector' },
        { type: 'fight', foe: 'god-tamer' },
        { type: 'fight', foe: 'grimm' },
        { type: 'rest' },
        { type: 'fight', foe: 'galien' },
        { type: 'fight', foe: 'grey-prince-zote', note: { es: 'nivel 3; se salta si no lo venciste en la partida', en: 'level 3; skipped if you never beat him' } },
        { type: 'fight', foe: 'uumuu' },
        { type: 'fight', foe: 'hornet-sentinel' },
        { type: 'godseeker' },
        { type: 'fight', foe: 'sly' },
      ] },
    { id: 'knight', name: { es: 'Panteón del Caballero', en: 'Pantheon of the Knight' },
      motto: { es: 'Busca al Dios Puro', en: 'Seek the Pure God' },
      rooms: [
        { type: 'fight', foe: 'enraged-guardian' },
        { type: 'fight', foe: 'lost-kin' },
        { type: 'fight', foe: 'no-eyes' },
        { type: 'fight', foe: 'traitor-lord' },
        { type: 'fight', foe: 'white-defender' },
        { type: 'rest' },
        { type: 'fight', foe: 'failed-champion' },
        { type: 'fight', foe: 'markoth' },
        { type: 'fight', foe: 'watcher-knights' },
        { type: 'fight', foe: 'soul-tyrant' },
        { type: 'godseeker' },
        { type: 'fight', foe: 'pure-vessel' },
      ] },
    { id: 'hallownest', name: { es: 'Panteón de Hallownest', en: 'Pantheon of Hallownest' },
      motto: { es: 'Busca la Luz Olvidada del Reino', en: 'Seek the Kingdom\'s Forgotten Light' },
      rooms: [
        { type: 'fight', foe: 'vengefly-king', count: 2, ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'gruz-mother', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'false-knight' },
        { type: 'fight', foe: 'massive-moss-charger' },
        { type: 'fight', foe: 'hornet-protector' },
        { type: 'godseeker' },
        { type: 'fight', foe: 'gorb', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'dung-defender' },
        { type: 'fight', foe: 'soul-warrior', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'brooding-mawlek', hp: 750, ascended: true, note: { es: 'arena de Ascendido; 750 de vida, no 1050', en: 'Ascended arena; 750 health, not 1050' } },
        { type: 'fight', foe: 'oro-mato' },
        { type: 'rest' },
        { type: 'fight', foe: 'xero', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'crystal-guardian' },
        { type: 'fight', foe: 'soul-master' },
        { type: 'fight', foe: 'oblobbles' },
        { type: 'fight', foe: 'sisters-of-battle' },
        { type: 'rest' },
        { type: 'fight', foe: 'marmu', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'flukemarm' },
        { type: 'fight', foe: 'broken-vessel' },
        { type: 'fight', foe: 'galien' },
        { type: 'fight', foe: 'sheo' },
        { type: 'rest' },
        { type: 'fight', foe: 'hive-knight', note: { es: 'empieza en la fase 3', en: 'starts in phase 3' } },
        { type: 'fight', foe: 'elder-hu' },
        { type: 'fight', foe: 'the-collector', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'god-tamer' },
        { type: 'fight', foe: 'grimm' },
        { type: 'rest' },
        { type: 'godseeker', who: { es: 'Unn', en: 'Unn' } },
        { type: 'fight', foe: 'watcher-knights' },
        { type: 'fight', foe: 'uumuu', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'winged-nosk' },
        { type: 'fight', foe: 'sly' },
        { type: 'fight', foe: 'hornet-sentinel' },
        { type: 'rest' },
        { type: 'fight', foe: 'enraged-guardian' },
        { type: 'fight', foe: 'lost-kin' },
        { type: 'fight', foe: 'no-eyes', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'traitor-lord' },
        { type: 'fight', foe: 'white-defender' },
        { type: 'rest' },
        { type: 'godseeker', who: { es: 'Dama Blanca', en: 'White Lady' } },
        { type: 'fight', foe: 'soul-tyrant' },
        { type: 'fight', foe: 'markoth', ascended: true, note: { es: 'arena de Ascendido', en: 'Ascended arena' } },
        { type: 'fight', foe: 'grey-prince-zote', note: { es: 'nivel 3', en: 'level 3' } },
        { type: 'fight', foe: 'failed-champion' },
        { type: 'fight', foe: 'nkg' },
        { type: 'rest' },
        { type: 'godseeker', who: { es: 'Rey Pálido', en: 'Pale King' } },
        { type: 'fight', foe: 'pure-vessel' },
        { type: 'fight', foe: 'absolute-radiance' },
      ] },
  ];

  const PANTHEON_BY_ID = Object.fromEntries(PANTHEONS.map((p) => [p.id, p]));

  /* ── The lifeblood door ────────────────────────────────────────────────
     Wiki ("Lifeblood Cocoon", "Godhome", "Pantheons"; checked on 23-Sep-2026): in Godhome,
     at the bottom left of the entrance to the Hall of Gods, there's a closed door surrounded by
     notches. Finishing a pantheon with bindings lights one notch for each, and each binding of
     each pantheon counts ONCE: 5 × 4 = 20. With 8 it opens and there's a lifeblood cocoon at every
     pantheon bench. (In the game, inside there's a dreamcatcher you hit with the Dream Nail to
     place them; here it's taken as done: with the door open, there's a cocoon.)
     Its germs: 3 with 8 notches, 4 with 12 and 5 with 16. All 20 also open the crack in the
     Land of Storms.
     It's your real game, marked by hand like the Hall's symbols: the simulator doesn't touch it.
     It's saved as { done: { master: ['nail', …] }, all: ['knight'] }; "all" means having
     finished it with all four at once (in the game, its marks in gold), and it counts all four. */
  const BINDS = ['nail', 'shell', 'charms', 'soul'];
  const DOOR_NOTCHES = PANTHEONS.length * BINDS.length;    // 20
  const DOOR_STEPS = [[16, 5], [12, 4], [8, 3]];             // notches → germs per cocoon
  const DOOR_OPEN = 8;

  function normalizeDoor(raw) {
    const o = raw && typeof raw === 'object' ? raw : {};
    const all = PANTHEONS.map((p) => p.id).filter((id) => Array.isArray(o.all) && o.all.includes(id));
    const done = {};
    for (const p of PANTHEONS) {
      const got = all.includes(p.id) ? BINDS
        : BINDS.filter((k) => o.done && Array.isArray(o.done[p.id]) && o.done[p.id].includes(k));
      if (got.length) done[p.id] = got.slice();
    }
    return { done, all };
  }
  const doorNotches = (door) => Object.values(normalizeDoor(door).done).reduce((n, l) => n + l.length, 0);
  const doorOpen = (door) => doorNotches(door) >= DOOR_OPEN;
  // Germs per cocoon with n notches; 0 if the door is still shut.
  const lifeseedsFor = (n) => (DOOR_STEPS.find(([min]) => n >= min) || [0, 0])[1];
  // The next step you have left: { at, seeds }, or null if you're already at 5.
  const nextStep = (n) => DOOR_STEPS.slice().reverse().map(([at, seeds]) => ({ at, seeds })).find((x) => n < x.at) || null;
  // What each bench's cocoon gives in your game (0 with the door shut).
  const cocoonOf = (door) => lifeseedsFor(doorNotches(door));

  /* Marking by hand: they return a new door. Removing a binding from a pantheon done with all
     four at once removes that too; "all four at once" marks all four, and removing it leaves
     the four marked (they're still completed, just not together). */
  function toggleBind(door, pid, k) {
    const d = normalizeDoor(door);
    if (!PANTHEON_BY_ID[pid] || !BINDS.includes(k)) return d;
    const l = d.done[pid] || [];
    d.done[pid] = l.includes(k) ? l.filter((x) => x !== k) : BINDS.filter((x) => x === k || l.includes(x));
    if (!d.done[pid].includes(k)) d.all = d.all.filter((x) => x !== pid);
    if (!d.done[pid].length) delete d.done[pid];
    return d;
  }
  function toggleAll(door, pid) {
    const d = normalizeDoor(door);
    if (!PANTHEON_BY_ID[pid]) return d;
    if (d.all.includes(pid)) d.all = d.all.filter((x) => x !== pid);
    else { d.all = PANTHEONS.map((p) => p.id).filter((id) => id === pid || d.all.includes(id)); d.done[pid] = BINDS.slice(); }
    return d;
  }

  HK.pantheons = { PANTHEONS, PANTHEON_BY_ID, BINDS, DOOR_NOTCHES, DOOR_OPEN, DOOR_STEPS,
    normalizeDoor, doorNotches, doorOpen, lifeseedsFor, nextStep, cocoonOf, toggleBind, toggleAll };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.pantheons;
})();
