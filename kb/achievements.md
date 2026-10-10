# Achievements — what each one needs, and what its detail could show

The study behind "tap an achievement for its info" (Progress → Achievements). One entry per
achievement, the 63 of `js/achievements.js`, in its groups and order. It isn't part of the site.

## Sources and rules

- **No source has a per-achievement guide.** The EN wiki's list (`Achievements (Hollow Knight)`,
  data in `Module:Achievements/Data`) and the ES fandom's (`Logros (Hollow Knight)`) carry only
  the game's own title and text, gamerscore and secret flag, with links. The how-to lives on each
  **subject page** (the boss, the NPC, the quest, Endings…); those are listed per entry.
  EN: `https://hollowknight.wiki/w/<Page>` · ES: `https://hollowknight.fandom.com/es/wiki/<Página>`.
  Read 8 October 2026.
- **Decided (8-oct): data, no prose.** The detail carries facts (what it needs, where, your
  figure, what's missing, warnings), built from the game's names (`kb/data/all_text.json`, key
  noted) and short site phrases, plus the subject's wiki page in each language. No guide text is
  copied or translated.
- Names: English as the game says it; the Spanish in italics is the game's (`npm run text`). The
  thresholds are the game's code, already in `js/achievements.js`'s header.

**Fields** of each entry:
- **Needs** — the condition and what has to come before it (from the subject page).
- **Where** — the place, and the Map target the site already has (`js/app-map.js` `mapTargets`:
  `c:<id>` the 112%'s things, `d:<id>` dream bosses, `collect:<kind>`, `npc:<id>`, `key:<id>`).
- **Figure** — the progress the site can show from what it reads (`A.count`'s parts).
- **Watch out** — missable, or exclusive with another one in the same save.
- **Pages** — EN · ES.

---

## Charms

### Charmed · *Afortunado* — `CHARMED`
- **Needs** any charm.
- **Figure** charms found (`owned`, base charms) ≥ 1. Already a jump to the 112% (`far: progress`).
- **Pages** Charms · Categoría:Amuletos

### Enchanted · *Encantado* — `ENCHANTED`
- **Needs** 20 charms (game: `charmsOwned >= 20`; "half of Hallownest's").
- **Figure** n/20, and the missing charms (each with its Map pin, `c:<charm>`).
- **Watch out** a Fragile charm held by Divine, and Grimmchild after Banishment, don't count
  until replaced (Salubra's Blessing page).
- **Pages** Charms · Categoría:Amuletos

### Blessed · *Bendecido* — `BLESSED`
- **Needs** 40 charms + every notch Salubra sells, then buy the blessing from Salubra
  (*Salubra*, `CHARM_SLUG_MAIN`) in the Forgotten Crossroads (*Cruces Olvidados*) for 800 geo.
- **Figure** charms n/40; the blessing (`progress: salubra-blessing`).
- **Watch out** same counting as Enchanted (Divine, Banishment → Carefree Melody returns it).
- **Pages** Salubra's Blessing · Bendición de Salubra

## Masks and vessels

### Protected · *Protegido* — `PROTECTED` / Masked · *Enmascarado* — `MASKED`
- **Needs** 4 Mask Shards (one whole mask) / all 16.
- **Figure** shards n/16 (masks 5→9); missing shards on the Map (`collect:mask-shard`).
- **Pages** Mask Shard (Hollow Knight) · Fragmento de máscara

### Soulful · *Animoso* — `SOULFUL` / Worldsoul · *Anima mundi* — `WORLDSOUL`
- **Needs** 3 Vessel Fragments (one vessel) / all 9.
- **Figure** fragments n/9; missing ones on the Map (`collect:vessel-fragment`).
- **Pages** Vessel Fragment · Fragmento de vasija

## Bosses

All read a Journal entry or a progress id. **Figure**: beaten or not. Each has a Map target
(`c:<boss>` for the 112%'s bosses, `d:<boss>` for dream bosses) and a Combat simulator entry
(`js/enemies.js`) — a "fight it" link is possible for all of them.

| Achievement | Needs (subject page) | Where | Pages EN · ES |
|---|---|---|---|
| Falsehood · *Falsedad* | False Knight | centre of the Forgotten Crossroads | False Knight · Falso Caballero |
| Strength · *Fortaleza* (secret) | Dream Nail on False Knight's body, behind a breakable wall above his arena | Forgotten Crossroads | Failed Champion · Campeón Fallido |
| Test of Resolve · *Examen de determinación* | Hornet, drops Mothwing Cloak | Greenpath (*Sendero Verde*) | Hornet Protector · Hornet |
| Proof of Resolve · *Prueba de determinación* (secret) | Hornet, drops King's Brand | Kingdom's Edge (*Límite del Reino*) | Hornet Sentinel · Hornet |
| Illumination · *Iluminación* | Soul Master, drops Desolate Dive | upper Soul Sanctum (*Santuario de Almas*) | Soul Master · Maestro de Almas |
| Mortality · *Mortalidad* (secret) | Dream Nail on Soul Master's corpse | Soul Sanctum | Soul Tyrant · Tirano de Almas |
| Release · *Liberar* | Broken Vessel; **Crystal Heart** (*Corazón de cristal*) to cross to it | far west of the Ancient Basin (*Cuenca Antigua*) | Broken Vessel · Receptáculo Roto |
| Peace · *Paz* (secret) | Dream Nail on Broken Vessel's body | Ancient Basin | Lost Kin · Familiar Perdido |
| Honour · *Honor* | Dung Defender | east Royal Waterways (*Canales Reales*) | Dung Defender · Defensor del Estiércol |
| Respect · *Respeto* | Mantis Claw (*Garra de mantis*) + the lever in the village's northeast | Mantis Village (*Aldea Mantis*) | Mantis Lords · Señores mantis |
| Obsession · *Obsesión* (secret) | Love Key (*Llave del amor*, Queen's Gardens); the tower is entered from the lift shaft between Kingdom's Edge and the City of Tears | Tower of Love (*Torre del Amor*) | The Collector · El Coleccionista |
| Execution · *Ejecución* | beyond a Shade Gate → Shade Cloak (*Capa sombría*) | upper Queen's Gardens (*Jardines de la Reina*) | Traitor Lord · Señor desleal |
| Rivalry · *Rivalidad* (secret) | save Zote twice (Greenpath, then Deepnest's webs); he's the last fight of the Trial of the Warrior | Colosseum of Fools (*Coliseo de los Insensatos*) | Zote the Mighty · Zote el Todopoderoso |

- **Watch out — Rivalry vs Neglect**: letting Zote die (Neglect) means he's never in the
  Colosseum. Exclusive in one save (Zote the Mighty page).

## Dream Nail essence

### Attunement · *Ajuste* — `ATTUNEMENT`
- **Needs** 600 Essence (*Esencia*, `INV_NAME_DREAMCORE`).
- **Figure** essence n/600 (`progress.counts.essence`), already a jump to the Inventory.
- **Where** every source with a place (`sources:essence`), the same for the three. From the
  Dream Nail page's *Essence Sources*: 15 Whispering Roots (*Raíz susurrante*) 482 in all; the 7
  Warrior Dreams 1100 (Xero, Gorb, Elder Hu 100, Marmu 150, No Eyes, Galien 200, Markoth 250);
  the 5 dream bosses 1600 (Failed Champion, Soul Tyrant, White Defender, Grey Prince Zote 300,
  Lost Kin 400); Dream Nail on a spirit, 1 each, 26 in all; and, with no place, enemies at
  random (1/300, 1/200 with Dream Wielder; 1/60 and 1/40 while Dreamgate warps outspend those
  drops). 3208 from one-time sources. The roots alone don't reach 600.
- **Pages** Dream Nail · Aguijón Onírico

### Awakening · *Despertar* — `AWAKENING`
- **Needs** 1800 Essence, then return to the Seer (*Vidente*, `DREAM_MOTH_MAIN`) in the Resting
  Grounds (*Tierras de Reposo*): the Dream Nail awakens.
- **Figure** n/1800; the Map, the Seer (where it's claimed) and the Essence's sources.
- **Pages** Seer · Vidente

### Ascension · *Ascensión* — `ASCENSION` (secret)
- **Needs** 2400 Essence, then return to the Seer: she says her last words.
- **Figure** n/2400; the Map, the Seer and the Essence's sources, as Awakening.
- **Pages** Seer · Vidente

## Grubs

### Grubfriend · *Amigo de las larvas* — `GRUBFRIEND` / Metamorphosis · *Metamorfosis* — `METAMORPHOSIS`
- **Needs** 23 / all 46 grubs freed.
- **Figure** n/23, n/46; the missing ones on the Map (`collect:grub`). The Collector's Map
  (Tower of Love) marks all of them in the game.
- **Pages** Grub · Larvas (fandom's page is *Padre Larva*)

## Stag stations

### Connection · *Conexión* — `STAG_STATION_HALF`
- **Needs** 4 stations opened (game: `stationsOpened >= 4`; Dirtmouth's and the Nest's don't count).
- **Figure** n/4; the closed ones on the Map (`collect:stag`).
- **Pages** Fast Travel (Hollow Knight) · Estación de ciervos

### Hope · *Esperanza* — `STAG_STATION_ALL` (secret)
- **Needs** every station opened; the Stag then reaches the Stag Nest (*Nido de Ciervos*) in the
  Howling Cliffs (*Acantilados Aulladores*).
- **Figure** stations n/10 (all but the Nest), then the Nest.
- **Open**: the Nest can also be reached by bouncing on a Vengefly with Monarch Wings (Howling
  Cliffs page); whether that alone grants Hope isn't said. The site reads the Nest's station.
- **Pages** Howling Cliffs · Acantilados Aulladores

## Miscellaneous

### Neglect · *Abandono* — `NEGLECT`
- **Needs** don't free Zote from the Vengefly King in Greenpath; he dies once you get the Mantis
  Claw, enter the rooms between Lemm and Cornifer in the City of Tears, or Deepnest's hot spring
  room. Then hit his shell there.
- **Watch out** exclusive with Rivalry and Dark Romance in one save.
- **Where** Greenpath, Vengefly King's room (`npc:zote`).
- **Pages** Zote the Mighty · Zote el Todopoderoso

### Witness · *Testigo* — `QUIRREL_EPILOGUE`
- **Needs** after Monomon is gone, Quirrel (*Quirrel*) at the Blue Lake (*Lago Azul*): talk to him.
- **Where** `npc:quirrel` (his last place).
- **Pages** Quirrel · Quirrel

### Purity · *Pureza* — `NAILSMITH_KILL` (secret) / Happy Couple · *Parejita feliz* — `NAILSMITH_SPARE` (secret)
- **Needs** the Pure Nail (*Aguijón puro*, all 4 upgrades). The Nailsmith (*Forjaguijones*) then
  asks you to cut him down: **strike** (Purity) or **leave**. Spared, he moves to Sheo's hut in
  Greenpath — only once you have Great Slash (*Gran corte*) and rest or ride a stag — and
  listening to him there gives Happy Couple.
- **Figure** nail upgrades n/4 (the site has them), Pale Ore.
- **Watch out** exclusive: the game saves right after the strike.
- **Where** `npc:nailsmith` (City of Tears, then Sheo's).
- **Pages** Nailsmith · Forjaguijones

### Solace · *Consuelo* — `MOURNER`
- **Needs** the Grey Mourner (*Doliente Gris*) in the east Resting Grounds, behind breakable
  walls (Desolate Dive). Carry her Delicate Flower (*Flor delicada*) to the Traitors' Child's
  grave in the Queen's Gardens: it breaks on any damage, a stag ride or the Dreamgate. The
  gardens need Isma's Tear (*Lágrima de Isma*) or Shade Cloak. Another flower is given if it breaks.
- **Where** `npc:mourner`, her two places (js/people.js, read from the game's scenes): `Xun NPC` in
  `Room_Mansion` (bool `metXun`) and `Mantis Grave` in `Fungus3_49`, the room above the gardens'
  Stag Station (bool `xunFlowerGiven`). The save also keeps `hasXunFlower`, `xunFlowerBroken`,
  `xunFlowerBrokeTimes` and `xunRewardGiven` (the reward, Solace's mark).
- **Pages** Delicate Flower (Quest), Grey Mourner · Doliente Gris, Flor delicada

### Void · *Vacío* — `VOID` (secret)
- **Needs** Kingsoul (*Alma del Monarca*) whole and equipped; at the bottom of the Abyss
  (*El Abismo*), west, a path opens (the Birthplace); Dream Nail the egg → Void Heart
  (*Corazón del Vacío*).
- **Figure** Kingsoul's two halves (the site has them, `c:queen-fragment`, `c:king-fragment`).
- **Where** `sources:void`: the two halves and the egg, `c:voidheart`. Read from the game's
  scenes: the egg you Dream Nail is `Dream Enter Abyss` (144.9, 12.58) in `Abyss_15`, the
  Birthplace, beside `black_egg`; its only door is `Abyss_06_Core`'s `bot1`, the floor that opens
  with Kingsoul. The game's map doesn't draw `Abyss_15`, so the pin sits on that door. Done when
  the save's `royalCharmState` is 4.
- **Watch out** having Void Heart closes The Hollow Knight ending in that save.
- **Pages** Void Heart · Corazón del Vacío; The Abyss (Hollow Knight)

### Teacher · *Maestra* — `TEACHER` / Watcher · *Vigilante* — `WATCHER` / Beast · *Bestia* — `BEAST`
- **Needs** the Dream Nail, then each Dreamer's body:
  - Monomon: Teacher's Archives (*Archivos de la maestra*) in Fog Canyon (*Cañón Nublado*), past
    Uumuu; Quirrel lifts her last protection.
  - Lurien: Watcher's Spire (*Torre del Vigía*), City of Tears, past the Watcher Knights.
  - Herrah: Beast's Den (*Guarida de las Bestias*), Deepnest.
- **Figure** Dreamers n/3 (the 112% doesn't have them; progress ids `monomon`, `lurien`, `herrah`).
- **Where** the 112%'s/Map's dreamer pins if present (to check: `c:monomon` …).
- **Pages** Monomon the Teacher · Monomon la Maestra; Lurien the Watcher · Soñadores;
  Herrah the Beast · Soñadores

### Cartographer · *Cartógrafo* — `MAP`
- **Needs** the 13 area maps (not Dirtmouth), from Cornifer in each area or Iselda in Dirtmouth;
  the Resting Grounds' only from Iselda.
- **Figure** n/13; missing ones on the Map (`collect:map`).
- **Pages** Map and Quill (Hollow Knight) · Mapa y pluma

## Challenges

### Completion · *Finalización* — `COMPLETION` / Speed Completion · *Finalización rápida* — `SPEED_COMPLETION`
- **Needs** 100% and an ending / same, under 20 hours.
- **Figure** the site's % (`js/completion.js`) and the save's time; why it's by hand (the
  ending's % and time aren't kept).
- **Pages** Completion (Hollow Knight) · Porcentajes de finalización

### Keen Hunter · *Cazador entusiasta* — `HUNTER_1`
- **Needs** the 146 required Journal entries.
- **Figure** n/146 (`HJ.counts`); jump to the Journal.
- **Pages** Hunter's Journal (Hollow Knight) · El Cazador

### True Hunter · *Cazador auténtico* — `HUNTER_2`
- **Needs** every required entry *complete* (enough kills for its notes), then talk to the Hunter
  in Greenpath: Hunter's Mark (*Marca de cazador*).
- **Figure** entries complete n/146; the ones short of kills (the Journal has them).
- **Pages** Hunter's Mark · El Cazador

### Steel Soul · *Alma de Acero* — `STEELSOUL` / Steel Heart · *Corazón de Acero* — `STEELSOUL_COMPLETION`
- **Needs** finish in Steel Soul mode (one life; unlocked after the first ending) / same at 100%.
- **Figure** whether the save is Steel Soul (`meta.steel`), %.
- **Pages** Steel Soul Mode (Hollow Knight) · Modo Alma de Acero

### Speedrun 1 / Speedrun 2 — `SPEEDRUN_1` / `SPEEDRUN_2`
- **Needs** an ending under 10 h / under 5 h (game time).
- **Figure** the save's time; settled yes when finished and still under the limit.
- **Pages** (no subject page; the achievement list)

### Warrior · *Guerrero* / Conqueror · *Conquistador* / Fool · *Insensato* — `COLOSSEUM_1..3`
- **Needs** pay Little Fool to open each Trial: 100 geo; 450 + Warrior done; 800 + Conqueror done.
- **Rewards** (for context) notch / Pale Ore / geo.
- **Where** Colosseum of Fools, Kingdom's Edge. Waves in `kb/06-colosseum.md`.
- **Names** the achievement says *Prueba del Guerrero* (`COLOSSEUM_1_TEXT`), the board
  *Prueba de los Guerreros* (`TRIAL_BOARD_BRONZE`): use the achievement's.
- **Pages** Trial of the Warrior / Conqueror / Fool · Coliseo de los Insensatos

## Endings

### The Hollow Knight · *Hollow Knight* — `ENDING_A` (secret)
- **Needs** defeat the Hollow Knight in the Black Egg Temple (*Templo del Huevo Negro*)
  **without** Void Heart (the three Dreamers first).
- **Watch out** once you have Void Heart, never in that save.
- **Pages** Endings (Hollow Knight) · Finales

### Sealed Siblings · *Hermanos sellados* — `ENDING_B` (secret)
- **Needs** the same fight **with** Void Heart; Hornet comes in — don't use the Dream Nail on him.

### Dream No More · *No más sueños* — `ENDING_C` (secret)
- **Needs** Void Heart and the Awoken Dream Nail; while Hornet holds him, Dream Nail the Hollow
  Knight and defeat the Radiance.
- **Figure** Void Heart, essence n/1800.

### Passing of the Age · *Cambio de era* — `MR_MUSHROOM` (secret)
- **Needs** after the three Dreamers, find Mister Mushroom (*Señor Seta*) in his 7 places in the
  order the Riddle Tablet's poem gives (Kingdom's Edge), with Spore Shroom (*Hongo con esporas*)
  equipped; then finish the game.
- **Figure** the site keeps only the last meeting (`mushroom-seven`: `mrMushroomState >= 8`); the save's
  state would give n/7, but `js/progress.js` doesn't keep it.
- **Where** `sources:mushroom`: his 7 meetings (`npc:mushroom`, js/people.js) and the Riddle Tablet
  (`tb:Deepnest_East_17:0`, `MR_MUSH_RIDDLE_TAB_NORMAL`). Read from the game's scenes, `Mr Mushroom
  NPC` in the poem's order: `Fungus2_18` (10.81, 36.29), `Deepnest_East_01` (6.1, 41.22),
  `Deepnest_40` (12.73, 15.18), `Room_nailmaster` (82.73, 5.18, Mato's hut), `Abyss_21`
  (125.36, 221.27), `Fungus3_44` (13.39, 13.41), `Tutorial_01` (36.36, 12.27). Each room's
  Control FSM keeps him only while `mrMushroomState` equals its number (1…7); his Conversation
  Control says `MR_MUSHROOM_<state>` and, with Spore Shroom (`equippedCharm_17`), increments it.
  So meeting k is met at `mrMushroomState >= k + 1`. (A save can hold 1 before the Dreamers: the
  a 43% game of ours does; the gate on the Dreamers is elsewhere.)
- **Pages** Mister Mushroom (Hollow Knight) · Señor Seta

## Hidden Dreams

### Memory · *Memoria* — `WHITE_DEFENDER`
- **Needs** Dung Defender beaten; Desolate Dive the floor at the far right of his room, under the
  platform; Dream Nail the sleeping Dung Defender.
- **Where** `d:white-defender`.
- **Pages** White Defender · Defensor Blanco

### Dark Romance · *Romance Oscuro* — `GREY_PRINCE`
- **Needs** Bretta and Zote saved, Zote beaten in the Colosseum (Rivalry), Monarch Wings for the
  basement; Dream Nail the statue in Bretta's basement, Dirtmouth.
- **Watch out** impossible after Neglect.
- **Where** `d:grey-prince-zote`.
- **Pages** Grey Prince Zote · Príncipe Gris Zote

## The Grimm Troupe

### Grand Performance · *Gran Actuación* — `GRIMM`
- **Needs** start the Ritual: in the Howling Cliffs, Dream Nail the large bug's corpse, then
  strike the brazier. Grimm in Dirtmouth gives Grimmchild (*Niño de Grimm*); with it equipped,
  3 Novice flames → Grimm → 3 Master flames → Grimm, and defeat him.
- **Figure** flames (`collect:grimmkin-flame`, 10 on the Map); Grimmchild's level.
- **Pages** Grimm Troupe (Quest) · Grimm

### Ritual · *Ritual* — `NIGHTMARE_GRIMM` (secret) / Banishment · *Destierro* — `BANISHMENT` (secret)
- **Needs** after Grand Performance, the Nightmare flames. Ritual: three of them, then Dream Nail
  the sleeping Grimm → Nightmare King (*Rey Pesadilla*). Banishment: Brumm (*Brumm*) in Deepnest
  asks to meet at the lantern in the Howling Cliffs; help him break it → Carefree Melody
  (*Melodía Despreocupada*) from Nymm in Dirtmouth.
- **Watch out** exclusive in one save. Leaving the lantern's room after talking to Brumm, before
  breaking it, loses Banishment forever. Banishing makes any Unbreakable charm not yet bought
  unobtainable, and takes Grimmchild (one charm fewer until Carefree Melody).
- **Where** Banishment: `npc:brumm`, his two stops (js/people.js, read from the game's scenes):
  `Brumm Torch NPC` (25.48, 14.58) in `Room_spider_small`, the Distant Village (bool
  `gotBrummsFlame`; the game's map doesn't draw the room, so the pin sits on its host, with his
  flame), and `Brumm Lantern NPV` (49.42, 5.53) in `Cliffs_06`, by the brazier (bool
  `destroyedNightmareLantern`, Banishment's mark; `brummBrokeBrazier` comes with it).
- **Pages** Grimm Troupe (Quest), Nightmare King Grimm · Grimm, Rey Pesadilla

## Godmaster

All need Godhome (*Hogar de Dioses*): a Simple Key (*Llave simple*) on the Godseeker's cocoon
in the Junk Pit (*Pila de Basura*), Deepnest, and the Godtuner (*Afinador de Dioses*). Boss order
and unlock exceptions in `kb/05-godhome.md`; the site has the Pantheons (`js/pantheons.js`) and a
Godhome screen to link to. The Map doesn't draw Godhome, but its way in is on it: the five
Pantheons' pin is the Godseeker (`people:godseeker`), in the Junk Pit (`GG_Waterways`), on the
game's own pin for her room (a vendor's); Dream Nailing her takes you in.

| Achievement | Needs | Watch out |
|---|---|---|
| Brotherhood · *Hermandad* | Pantheon of the Master (its bosses beaten) | — |
| Inspiration · *Inspiración* | Pantheon of the Artist | — |
| Focus · *Concentración* | Pantheon of the Sage | GPZ isn't required |
| Soul & Shade · *Alma y Sombra* | Pantheon of the Knight: the three before | — |
| Embrace the Void · *Acepta el Vacío* | Pantheon of Hallownest: the four before + Void Heart | the Delicate Flower to the Godseeker changes the ending, same achievement |
| Pure Completion · *Conclusión Pura* | 112% and an ending | by hand, like Completion |

## Open points

1. Hope by the Vengefly bounce (see Hope).
2. Mister Mushroom's n/7 needs `mrMushroomState` kept from the save (only with a save).
3. Dreamers' and NPCs' Map targets: confirm each (`mapTargets` returns nothing for a target with
   no place; the detail just leaves the pin out).
4. The achievements' Spanish titles here are copied from `js/achievements.js` (the game's,
   already audited); the site takes them from there, never from this file.

## What the site shows (decided 8 Oct 2026)

No detail and no sentences (Albert: nothing written by us). Each plate carries its Map pin where
the Map has a place, and in red, with the game's names, what it rules out (Excluye), closes (Cierra
/ Lo cierra) or loses (Se pierde): `GUIDE` in `js/achievements.js`. The rest of this file (what each
needs, the Zote rooms, Brumm's room, the unbought Unbreakable charms, the flower) stays here as
the study; it isn't on the site. The kinds below were the options studied.

## What this suggested

- **Counters** (charms, masks, vessels, essence, grubs, stags, maps, Journal): the figure n/N and
  the missing ones with their Map pins — the most useful part, all from data the site has.
- **Bosses**: where + what opens the way + "on the Map" + "fight it" (Combat).
- **Quests and choices** (Zote, Nailsmith, Grimm, endings, Void Heart): the steps and the
  **exclusive/missable warning** — the only place a player can lose something.
- **Challenges by hand** (time, %, Steel Soul): the condition and your numbers, why the save can't tell.
- **Godhome**: the Pantheon and its unlock state, link to the Godhome screen.
