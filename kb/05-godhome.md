# Godhome: Pantheons, Bindings and the Hall of Gods

---

## 1. Bindings

Optional challenges activated per Pantheon. They can be combined however you like; with all
four at once, the marks glow in radiant yellow. They're needed to unlock the extra lifeblood
cocoons in the hot-spring rooms and the Land of Storms.

| Binding | Exact effect |
|---|---|
| **Nail** | Nail damage drops to **80%**, and if it still exceeds 13 it's fixed at **13**. By level 0/1/2/3/4 → **4/7/10/13/13**. The arts' damage is computed on that value. Coiled and Pure give the same. It **doesn't affect** the charms that copy the nail's damage (Sharp Shadow, Thorns of Agony, Dreamshield). *Fragile/Unbreakable Strength* compensates very well: it goes up to **6/10/15/20/20**. |
| **Shell** | A maximum of **4 masks**. It does **not** affect lifeblood masks or Fragile/Unbreakable Heart's. With *Joni's Blessing* the wiki gives **7** (and **10** with the Heart): one more than `floor(n × 1.4f) + 1`, and that's how `js/engine.js` computes it. |
| **Charms** | Unequips every charm and doesn't let you equip any. |
| **Soul** | You can only store **33 soul** and the Soul Vessels are disabled: **one** Focus or **one** spell per charge. |

Practical consequence: with the Nail Binding, the Coiled Nail is already the cap → in a
bindings run, **Strength** is worth more than ever and **Quick Slash** is still the best
multiplier. With the Soul Binding, the generation charms (*Soul Catcher*, *Soul Eater*,
*Kingsoul*) lose almost all their value; *Spell Twister* only gains if the rest of the build
suits you.

---

## 2. Pantheons

| Pantheon | Motto | Final boss | Requirement |
|---|---|---|---|
| **of the Master** | *Seek the Gods of Nail and Shell* | Brothers Oro & Mato | Early bosses |
| **of the Artist** | *Seek the God Inspired* | Paintmaster Sheo | Mid-game bosses |
| **of the Sage** | *Seek the God of Wealth and Power* | Great Nailsage Sly | Mid-to-late bosses |
| **of the Knight** | *Seek the Pure God* | **Pure Vessel** | Completing the previous three |
| **of Hallownest** | *Seek the Kingdom's Forgotten Light* | **Absolute Radiance** | The previous four + **Void Heart** |

Completing the first three unlocks **Godseeker Mode**.

Exceptions to unlocking:
- **God Tamer** is unlocked even if you've never fought her.
- **Vengefly King** is always unlocked.
- **False Knight** counts even if you skipped him by breaking the left wall.
- **Lost Kin, Soul Tyrant, Failed Champion and White Defender** unlock by themselves when you
  kill their real-world version.
- **Grey Prince Zote** is skipped (and doesn't count as a requirement for the third Pantheon) if
  you didn't beat him in the base game, including if you let Zote die.
- **Nightmare King Grimm** appears whether you've fought him or not.

In the first four, room 6 is a **rest** (hot springs and bench) and room 11 the **Godseeker**
(no effect). This used to say "Godseeker" in the Master's room 6: the wiki gives it as a
*Resting Spot*, just like in the other three.

### Pantheon of the Master
1 Vengefly King · 2 Gruz Mother · 3 False Knight · 4 Massive Moss Charger ·
5 Hornet Protector · *6 bench* · 7 Gorb · 8 Dung Defender · 9 Soul Warrior ·
10 Brooding Mawlek · *11 Godseeker* · **12 Brothers Oro & Mato**

### Pantheon of the Artist
1 Xero · 2 Crystal Guardian · 3 Soul Master · 4 Oblobbles ×2 · 5 Mantis Lords ·
*6 bench* · 7 Marmu · 8 Nosk · 9 Flukemarm · 10 Broken Vessel · *11 Godseeker* ·
**12 Paintmaster Sheo**

### Pantheon of the Sage
1 Hive Knight · 2 Elder Hu · 3 The Collector · 4 God Tamer · 5 Troupe Master Grimm ·
*6 bench* · 7 Galien · 8 Grey Prince Zote (level 3; skipped if it doesn't apply) · 9 Uumuu ·
10 Hornet Sentinel · *11 Godseeker* · **12 Great Nailsage Sly**

### Pantheon of the Knight
1 Enraged Guardian · 2 Lost Kin · 3 No Eyes · 4 Traitor Lord · 5 White Defender ·
*6 bench* · 7 Failed Champion · 8 Markoth · 9 Watcher Knight ×6 · 10 Soul Tyrant ·
*11 Godseeker* · **12 Pure Vessel**

### Pantheon of Hallownest — 42 fights, 53 rooms
Health and damage **from Attuned**; arenas and number of enemies **from Ascended**.
Not in it: Nosk, the Hollow Knight, the Radiance, the Mantis Lords or Zote — their stronger
versions replace them.

| # | Room | | # | Room |
|---|---|---|---|---|
| 1 | **2 ×** Vengefly King (Asc. arena) | | 28 | God Tamer |
| 2 | Gruz Mother (Asc. arena) | | 29 | Troupe Master Grimm |
| 3 | False Knight | | 30 | *hot springs + bench* |
| 4 | Massive Moss Charger | | 31 | *Godseeker (Unn)* |
| 5 | Hornet Protector | | 32 | Watcher Knight ×6 |
| 6 | *Godseeker* | | 33 | Uumuu (Asc. arena) |
| 7 | Gorb (Asc. arena) | | 34 | **Winged Nosk** |
| 8 | Dung Defender | | 35 | Great Nailsage Sly |
| 9 | Soul Warrior (Asc. arena) | | 36 | Hornet Sentinel |
| 10 | Brooding Mawlek (Asc. arena) | | 37 | *hot springs + bench* |
| 11 | Brothers Oro & Mato | | 38 | Enraged Guardian |
| 12 | *hot springs + bench* | | 39 | Lost Kin |
| 13 | Xero (Asc. arena) | | 40 | No Eyes (Asc. arena) |
| 14 | Crystal Guardian | | 41 | Traitor Lord |
| 15 | Soul Master | | 42 | White Defender |
| 16 | Oblobble ×2 | | 43 | *hot springs + bench* |
| 17 | **Sisters of Battle** | | 44 | *Godseeker (White Lady)* |
| 18 | *hot springs + bench* | | 45 | Soul Tyrant |
| 19 | Marmu (Asc. arena) | | 46 | Markoth (Asc. arena) |
| 20 | Flukemarm | | 47 | Grey Prince Zote (level 3) |
| 21 | Broken Vessel | | 48 | Failed Champion |
| 22 | Galien | | 49 | **Nightmare King Grimm** |
| 23 | Paintmaster Sheo | | 50 | *hot springs + bench* |
| 24 | *hot springs + bench* | | 51 | *Godseeker (Pale King)* |
| 25 | Hive Knight (**starts in phase 3**) | | 52 | **Pure Vessel** |
| 26 | Elder Hu | | 53 | **Absolute Radiance** |
| 27 | The Collector (Asc. arena) | | | |

The points where most attempts break: **17 Sisters of Battle**, **32 Watcher Knights** (2 at
once, 350 health each), **35 Sly**, **42 White Defender** (1600 and not staggered), **49
Nightmare King** and **52 Pure Vessel**. Reach the bench in room 50 with health and soul; rooms
51–53 have no further rest.

---

## 3. Hall of Gods

Three difficulties per statue: **Attuned**, **Ascended** (damage ×2, more health, sometimes new
hazards) and **Radiant** (Ascended + you die in one hit).

The bosses with variants — **Hornet, Crystal Guardian, the Mantis Lords and Nosk** — have a
lever next to the pedestal: hit it with the nail to switch version. Soul Warrior doesn't need
it: his second fight is directly his Ascended version.

| Boss | Health Att. / Asc.-Rad. | What changes |
|---|---|---|
| Gruz Mother | 650 / 945 | On Ascended the floor is replaced by 3 small platforms and 4 spike pits |
| Vengefly King | 450 / 735 (left) and 430 (right) | On Ascended **a second** Vengefly King appears on the opposite side |
| Brooding Mawlek | 1050 / 1050 (**Pantheon of Hallownest: 750**) | On Ascended the middle platform disappears |
| False Knight | 260×3 / 560×3 | A bigger arena; he does **not** break the floor before dying |
| Failed Champion | 360×3 / 600×3 | A similar arena; he doesn't break the floor either |
| Hornet Protector | 900 / 1250 | No changes |
| Hornet Sentinel | 800 / 1200 | No changes |
| Massive Moss Charger | 480 / 850 | A wider arena on Ascended |
| Flukemarm | 500 / 900 | The top-left platform is missing; on Ascended the first 6 Flukefeys have more health |
| Mantis Lords | 400 (350 in phase 2) / 500 (600 in phase 2) | No changes |
| Sisters of Battle | 500 (750 phase 2) / 600 (950 phase 2) | The same arena as the Lords; in phase 2 all three come out |
| Oblobble | 450 (650 phase 2) / 750 (750 phase 2) | No changes |
| Hive Knight | 850 / 1300 | It doesn't start with the Swarm Release; **on Ascended it uses all its attacks from the start** |
| Broken Vessel | 700 / 1000 | No changes |
| Lost Kin | 1200 / 1650 | No changes |
| Nosk | 680 / 980 | On Ascended **the central platform disappears** (goodbye safe spots) |
| Winged Nosk | 750 / 1050 | No changes |
| The Collector | 900 / 1200 | On Ascended it summons Primal Aspids, Sharp Baldurs and Armoured Squits (26 health) and only 1 jar at a time in phase 1 |
| God Tamer | 750 (each) / 1000 (each) | No changes |
| Crystal Guardian | 650 / 900 | A much bigger arena, spikes on the upper half of both walls; it opens with a random attack |
| Enraged Guardian | 650 / 1250 | A **smaller** arena with spikes at the top of both walls; it opens with the Laser Beam and then a random one |
| Uumuu | 350 / 700 | **No Quirrel**: it summons Oomas whose explosion breaks its membrane. On Ascended, a harmful green mist at the bottom |
| Traitor Lord | 800 / 1300 | A much bigger arena; no Mantis Traitors come out beforehand |
| Grey Prince Zote | 1400 / 1400 | A wider arena; he behaves as in his third fight |
| Soul Warrior | 750 / 1000 | On Ascended he summons up to **36 Follies** |
| Soul Master | 600 (350 phase 2) / 900 (600 phase 2) | He doesn't break the floor mid-fight |
| Soul Tyrant | 900 (350 phase 2) / 1200 (650 phase 2) | He doesn't break the floor either |
| Dung Defender | 800 / 1100 | No changes |
| White Defender | 1600 / 1600 | No changes |
| Watcher Knight | 350 (each) / 600 (each) | **They can't be reduced to five** with the chandelier |
| No Eyes | 570 / 800 | On Ascended the platforms are rearranged and the arena fills with thorns |
| Marmu | 416 / 600 | On Ascended the arena shrinks and is closed with thorns on three sides |
| Xero | 650 / 900 | On Ascended the floor becomes three separate platforms (small, large, medium) |
| Markoth | 650 / 950 | On Ascended **the floor disappears** and the platforms are rearranged |
| Galien | 650 / 1000 | No changes |
| Gorb | 650 / 1000 | On Ascended the floor becomes three platforms |
| Elder Hu | 600 / 800 | No changes |
| Oro & Mato | Oro 500/600 + Mato 1000 / Oro 800/1000 + Mato 1000 | No changes |
| Paintmaster Sheo | 950 / 1450 | No changes |
| Nailsage Sly | 800 / 250 → 1200 / 600 | No changes |
| Pure Vessel | 1600 / 1850 | No changes |
| Grimm | 1000 / 1300 | No changes |
| Nightmare King | 1250 / 1650 | The arena becomes **a single platform with no walls** |
| Radiance (Absolute) | 2181 / 2181 | No changes |

Observations:
- **In Godhome many bosses have quite a lot more health than in the base game**: Crystal
  Guardian goes from 280 to 650, Uumuu from 300 to 350 (and 700 on Ascended), Soul Warrior from
  180 to 750. Don't extrapolate the difficulty from the real world.
- **Nightmare King Grimm is weaker in Godhome** (1250) than in his original fight (1500).
- **Grey Prince Zote, White Defender and Absolute Radiance don't change health** between
  Attuned, Ascended and Radiant: only the damage they deal changes.
