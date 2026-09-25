# Enemy health

Values in points. `—` = it can't be damaged. The enemies with 1 health don't literally have
1 HP: they're immune to tick damage (Spore Shroom) and the Old Nail kills them in one hit. Five
values separated by `/` = health by nail level 0/1/2/3/4.

To know **how many hits each thing takes**, divide by your damage from `02-arsenal.md`.
Each enemy's area is in `data/entities.json` (`location`): for the common ones, the first place
their wiki page's «Location» section names, as its region of the game's map (September 2026).
Useful thresholds:

- **The Coiled Nail (17)** one-shots almost everything the Collector summons.
- **The Channelled Nail (13)** one-shots Flukemarm's Flukefeys (13 health).
- The three toughest that aren't bosses: **Gorgeous Husk 220**, **Great Husk Sentry 170**,
  **Great Hopper 130**.
- **Primal Aspid (35)** is the most dangerous common enemy in the game: it fires three blobs
  in a 35° fan with the middle one aimed at you. Absolute priority in the Colosseum.


## Base game

| Enemy | Health |
|---|---|
| Aluba | 1 |
| Ambloom | 12 |
| Armoured Squit | 40 |
| Aspid Hatchling | 5 |
| Aspid Hunter | 15 |
| Aspid Mother | 20 |
| Baldur | 15 |
| Battle Obble | 70 |
| Belfly | 5 |
| Bluggsac | 20 |
| Boofly | 40 |
| Carver Hatcher | 35 |
| Charged Lumafly | — |
| Corpse Creeper | 18 (15 after transformation) |
| Cowardly Husk | 20 |
| Crawlid | 8 |
| Crystal Crawler | 15 |
| Crystal Hunter | 25 |
| Crystallised Husk | 35 |
| Death Loodle | 45 |
| Deephunter | 18 |
| Deepling | 15 |
| Dirtcarver | 20 |
| Duranda | 30 |
| Durandoo | 30 |
| Elder Baldur | 60 |
| Entombed Husk | 45 |
| Fluke Larva | 1 |
| Flukefey | 13 |
| Flukemon | 55 total: 25 whole 15x2 halves |
| Folly | 13 |
| Fool Eater | 16 |
| Fungified Husk | 15 |
| Fungling | 10 |
| Fungoon | 15 |
| Furious Vengefly | 40 |
| Garpede | — |
| Glimback | 35 |
| Gluttonous Husk | 30 |
| Goam | — |
| Gorgeous Husk | 220 |
| Great Hopper | 130 |
| Great Husk Sentry | 170 |
| Grub Mimic | 45 |
| Gruzzer | 8 |
| Gulka | 10 |
| Heavy Fool | 90 |
| Heavy Sentry | 35 |
| Hive Guardian | 100 |
| Hive Soldier | 65 |
| Hiveling | [Lifeblood] 18 |
| Hopper | 50 |
| Husk Bully | 15 |
| Husk Dandy | 20 |
| Husk Guard | 70 |
| Husk Hive | 60 |
| Husk Hornhead | 15 |
| Husk Miner | 25 |
| Husk Sentry | 25 / 28 / 28 / 28 / 28 |
| Husk Warrior | 15 |
| Hwurmp | 25 |
| Infected Balloon | 15 |
| Kingsmould | 170 |
| Lance Sentry | 25 |
| Leaping Husk | 15 |
| Lesser Mawlek | 60 |
| Lifeseed | 1 |
| Lightseed | 1 |
| Little Weaver | 30 |
| Loodle | 30 |
| Maggot | 1 |
| Mantis Petra | 45 |
| Mantis Traitor | 74 |
| Mantis Warrior | 20 |
| Mantis Youth | 15 |
| Maskfly | 1 |
| Mawlurk | 135 |
| Menderbug | 1 |
| Mistake | 13 |
| Moss Charger | 15 |
| Moss Knight | 50 |
| Mosscreep | 10 |
| Mossfly | 15 10 (Overgrown Mound) |
| Mosskin | 15 |
| Mossy Vagabond | 25 |
| Obble | 10 |
| Ooma | 1 |
| Pilflip | 30 |
| Primal Aspid | 35 |
| Revek | — |
| Royal Retainer | 5 |
| Shadow Creeper | 20 |
| Shardmite | 15 |
| Sharp Baldur | 65 |
| Shielded Fool | 65 |
| Shrumal Ogre | 80 |
| Shrumal Warrior | 20 |
| Shrumeling | 5 |
| Sibling | 20 |
| Slobbering Husk | 30 |
| Soul Twister | 35 |
| Spiny Husk | 44 |
| Sporg | 25 |
| Squit | 10 |
| Stalking Devout | 100 |
| Sturdy Fool | 80 |
| Tiktik | 8 |
| Uoma | 1 |
| Vengefly | 8 |
| Violent Husk | 40 |
| Void Tendrils | — |
| Volatile Gruzzer | 40 |
| Volatile Mosskin | 15 |
| Volt Twister | 80 |
| Wandering Husk | 15 |
| Winged Fool | 70 |
| Winged Sentry | 25 |
| Wingmould | — |

## Hidden Dreams

| Enemy | Health |
|---|---|
| Hopping Zoteling | 20 |
| Volatile Zoteling | 30 |
| Winged Zoteling | 20 |

## The Grimm Troupe

| Enemy | Health |
|---|---|
| Fluke Zoteling | 100 |
| Flukemunga | 150 |
| Grimmkin Master | 75 / 120 / 180 / 210 / 240 |
| Grimmkin Nightmare | 100 / 180 / 240 / 280 / 320 |
| Grimmkin Novice | 50 / 90 / 120 / 140 / 160 |
| Head of Zote | 200 |
| Heavy Zoteling | 190 |
| Hopping Zoteling | 60 |
| Lanky Zoteling | 150 |
| Pale Lurker | 200 / 240 / 290 / 340 / 400 |
| Turret Zoteling | 100 |
| Volatile Zoteling | 30 |
| Winged Zoteling | 60 |
| Zote's Curse | 100 |
| Zoteling the Mighty | 200, after first kill 120 |

## The ones that summon (or get up on dying)

Checked against the *Behaviour and Tactics* section of the wiki's 180 pages in September 2026.
The bosses are in `03-bosses.md`; here, the common enemies. What they summon comes out with
**its usual health** unless stated otherwise.

| Enemy | What it brings out | How many and when |
|---|---|---|
| Aspid Mother | Aspid Hatchling (5) | One by one, up to **15**; **2 more on death**. If it dies with 14–15 out, instead of the two hatchlings it releases Infection |
| Carver Hatcher | Dirtcarver (20) | While it flies over you, up to **5**; then it stops summoning and lunges to bite |
| Elder Baldur | Baldur (15) | Now and then, **never two at once**. Without *Vengeful Spirit* it summons none. Those Baldurs give no geo |
| Husk Hive | Hiveling (18) | One now and then and **3 on death**. With *Hiveblood* it doesn't summon, but the final 3 come out all the same |
| Wandering Husk, Husk Hornhead | Corpse Creeper (**15**, not 18) | Some of the ones in **Deepnest** get up on dying, with a 50% chance |
| Flukemon | its two halves (15 + 15) | On dying (25) the top half gets up, which flies, and then the bottom half, which runs and climbs walls. 55 in total |
| Dirtcarver | another Dirtcarver | When one dies, another comes out after 4 s, and that one does the same: **they never run out** |

They don't summon, even if it looks like it: Fungoon's, Volatile Mosskin's and Fungified
Husk's balloons, spores and clouds are attacks; the Lightseeds and the Lifeseeds come from the
scenery, not from an enemy; the Sibling sprouts from the Abyss's floor; Wingmould comes apart
and puts itself back together. The Eternal Ordeal's seven Zotelings have no page of their own
on the wiki.

**Three boss notes that were wrong in `js/enemies.js`** (here, in `03-bosses.md`, they were
right): Vengefly King calls each Vengefly with a **75% chance** (not "at 75% health") and those
Vengeflies have **8**, not 6; of the Hive Knight's 12 Hivelings, **7** come down; and Flukemarm
has **up to 6 Flukefeys at once**, not "non-stop".

## Bosses, health summary

See `03-bosses.md` for the full entry. Only the number here.

| Boss | Health (base game) |
|---|---|
| Broken Vessel | 525 |
| Brooding Mawlek | 300 |
| The Collector | 750 / 750 / 750 / 800 / 850 |
| Crystal Guardian | 280 (Crystal) 450 / 450 / 500 / 550 / 600 (Enraged) |
| Dung Defender | 700 / 750 / 800 / 850 / 900 |
| Elder Hu | 250 / 420 / 550 / 600 / 650 |
| Failed Champion | 1260 total: 360×3 (Armour) 60 + 40×3 (Head) |
| False Knight | 255 total: 65×3 (Armour) 40×4 (Head) |
| Flukemarm | 350 |
| Galien | 230 / 368 / 479 / 570 / 640 |
| God Tamer | 1050 total: 600 (Tamer) 450 (Beast) |
| Gorb | 200 / 320 / 479 / 570 / 640 |
| Gruz Mother | 90 (Forgotten Crossroads) 140 (Colosseum of Fools) |
| The Hollow Knight | 1000 +250 (If Phase 4 is reached) |
| Hornet | 225 (Protector) 700 (Sentinel) |
| Lost Kin | 1200 |
| Markoth | 250 / 400 / 520 / 624 / 705 |
| Marmu | 200 / 320 / 416 / 500 / 570 |
| Mantis Lords | 210 (Phase 1) 160 + 160 (Phase 2) |
| Massive Moss Charger | 100 |
| No Eyes | 200 / 320 / 416 / 500 / 570 |
| Nosk | 680 |
| Oblobbles | 2 x 260, +40-100 after 1 killed |
| The Radiance | Stages 1-4 respectively: 350 + 400 + 250 + 700 Total: 1700 |
| Soul Master | 385 total: 275 (Phase 1) 110 (Phase 2) |
| Soul Tyrant | 1250 total: 900 (Phase 1) 350 (Phase 2) |
| Soul Warrior | 180 (Soul Sanctum) 300 (Elegant Key Room & Colosseum of Fools) |
| Traitor Lord | 800 |
| Uumuu | 300 |
| Vengefly King | 55 (Greenpath) 100 (Colosseum of Fools) |
| Watcher Knight | 6×220 / 220 / 220 / 240 / 260 Total: 1320 / 1320 / 1320 / 1440 / 1560 |
| Xero | 200 / 320 / 416 / 500 / 570 |
| Zote The Mighty | 200 |
| Grey Prince Zote | 1200–1500 (+100 per fight for 4 fights) |
| White Defender | 1600 |
| Grimm | 800 / 800 / 800 / 930 / 1000 |
| Nightmare King Grimm | 1500 |
| Hive Knight | 800 / 800 / 800 / 850 / 920 |
| Absolute Radiance | Stages 1,2,3,4,6 respectively: 400 + 450 + 300 + 750 + 281 Total: 2181 |
| Brothers Oro & Mato | 500 (Oro, Phase 1) 600 + 1000 (Oro + Mato, Phase 2) |
| Great Nailsage Sly | 1050 |
| Paintmaster Sheo | 950 |
| Pure Vessel | 1600 |
| Sisters of Battle | 500 (Phase 1) 750 + 750 + 750 (Phase 2) |
| Winged Nosk | 750 |

> **Errata in the wiki's master table**: it gives False Knight *255* when
> 65×3 + 40×4 = **355** (his own page corrects it), and **Gorb** *200/320/479/570/640*,
> which are really **Galien's**; Gorb is 200/320/416/500/570.

