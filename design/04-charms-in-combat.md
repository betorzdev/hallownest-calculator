# Charms in the arena: a one-by-one analysis and design

> **Status (22 September 2026):** all three deliveries implemented. The first two in
> `js/fight.js`, `test/fight.test.js` and the engine's `options.fight`; the third, Dreamshield
> (`proj`, "Blocked" and the "Dreamshield" action), stagger in hits (`stagger` in `js/enemies.js`),
> soul in two pools and the HUD for Hiveblood and Baldur Shell. The decisions the wiki doesn't
> settle are noted in `js/fight.js` and in the README.

What each of the 45 charms does **inside a fight**, which part of that the arena simulates today
(`js/app.js`, "Combat simulator") and which model is needed for everything to fit: the secondary
things too, like Thorns of Agony, which hits when you're hit, or Grubsong, which gives soul when
you take damage.

The rules come from the 45 charms' pages and from "Focus" and "Dream Nail" on `hollowknight.wiki`
(read on 21 September 2026), checked against `kb/`. The numbers already on the sheet
(`js/engine.js`) aren't repeated here: they're cited by their stat id.

---

## 0. Summary

- **Today the arena reads twelve stats from the sheet**: each attack's damage, soul per hit, the
  cost of spells and healing, how much Focus heals, the starting masks and lifeblood, total soul
  and the overcharm multiplier. Everything else from the 45 charms doesn't come in. **Of the 45,
  12 come in fully and 4 don't touch combat; the other 29 change a fight for real and in the arena
  change nothing, or come in with the wrong health** (Fury, Elegy and Joni's Blessing).
- **Finding:** the combat sheet is computed with the **panel's** health, not the fight's. `fs()`
  returns `sheet` (`js/app.js:1006`), which comes from `state.hp`, the panel's mask control; in a
  pantheon, from `hp: 0` (`js/app.js:1958`), full health. So **Fury of the Fallen never triggers
  when you're down to one mask while fighting**, and Elegy keeps firing at half health. They're
  the game's two conditional charms, and it's the first thing to fix.
- **The 45 fall into six families** according to what the simulator needs to take them into
  account: (A) already on the sheet, (B) react to an event the arena already has, (C) are an
  action of yours that doesn't exist yet, (D) need a clock, (E) are positional and only fit as a
  note, (F) don't touch combat.
- **The design**: the sheet is recomputed with the fight's health; the combat rules move out of
  the DOM handlers into a **pure reducer** (`js/fight.js`, with a test); and in a second delivery,
  a **clock** derived from the durations the sheet already has, which is the only thing that gives
  meaning to Quick Slash, Nailmaster's Glory, Quick Focus, Kingsoul, Hiveblood and the companions.
- **Chance doesn't come in**: Carefree Melody is resolved like everything else, by you deciding
  it, with the probability in view.

---

## 1. What the arena reads today (audit)

`knightMoves()` (`js/app.js:1176`) and the `hit` and `foehit` handlers (`js/app.js:2609` and
`:2654`) use these stats, and only these:

| Stat | For what |
|---|---|
| `nail.damage` | the nail swing |
| `nail.greatSlash`, `nail.dashSlash`, `nail.cyclone` | the arts (Cyclone Slash, per hit) |
| `spell.vs`, `spell.dd`, `spell.hw` | the spells (with Shaman Stone, Flukenest and Defender's Crest already inside) |
| `soul.spellCost`, `soul.focusCost` | what casting and healing cost |
| `soul.perHit` | the soul from each hit and from killing a minion |
| `heal.masksPerFocus`, `heal.canFocus` | how much Focus heals, and whether you can |
| `health.masks`, `health.lifeblood`, `soul.main`, `soul.total` | what you start with |
| `health.damageMult` | overcharm, in `foeDamage()` (`js/app.js:1168`) |

So **Strength, Shaman Stone, Spell Twister, Flukenest, Soul Catcher and Soul Eater** (with a
nuance, below), **Fragile/Unbreakable Heart, Lifeblood Heart and Core, Joni's Blessing (the health
and that you don't heal), Deep Focus (the 2 masks)** and Defender's Crest's synergies come in
fully. And nothing of what happens **when you're hit** comes in (Thorns of Agony, Grubsong, Baldur
Shell, Carefree Melody, Stalwart Shell, Hiveblood), nothing of what **you do without striking with
the nail** (Shadow Dash, Dream Nail, weaverlings), nothing of what **happens over time**
(Grimmchild, Glowing Womb, Kingsoul) and nothing of what **changes the rhythm** (Quick Slash,
Nailmaster's Glory, Quick Focus).

Three nuances about what does come in:

- **The fight's health doesn't reach the sheet.** Fury and Elegy are decided in `health()`
  (`js/engine.js:301-305`) from `st.hp`, and the fight keeps its own in `fight.masks` and the
  lifeblood piles without telling the engine.
- **Soul is a single pool.** In the game a hit gives 11 to the main meter and, when it's full, 6
  to the reserve (`soul.perHitReserve`; +2/+6 with Soul Catcher/Soul Eater). Here `fight.soul` is
  a number capped at `soul.total`, so with the reserve half-full each hit gives 11/14/19 instead of
  6/8/12. It's a known simplification, not a charm bug.
  *(Solved in delivery 3: `nailSoul` gives the reserve's figure with the main meter full, and the
  reserve refills the meter instantly, so soul can remain a single number.)*
- **With Joni's Blessing, the `lbCharm` pile mixes two lifebloods** that the game loses in order:
  first Lifeblood Heart's and Core's (they go at the end of the bar), then Joni's, which stands in
  for masks. It matters for Fury, which triggers with Joni's last one.

---

## 2. The 45 charms, one by one

Families: **A** already on the sheet and in the arena · **B** reacts to an event the arena
already has (you're hit, you focus, you strike) · **C** a new action of yours · **D** needs a
clock · **E** positional: a note · **F** no effect in combat. Under "Design", what §3 proposes.

| No. | Charm (notches) | What it does in a fight, according to the wiki | Today in the arena | Fam. | Design |
|---|---|---|---|---|---|
| 1 | Wayward Compass (1) | Nothing. | — | F | Nothing. |
| 2 | Gathering Swarm (1) | Collects geo. | — | F | Nothing. |
| 3 | Stalwart Shell (2) | Invulnerable for 1.75 s after a hit instead of 1.3, and 60% less recoil. It also triggers when Baldur Shell or Carefree Melody stop the hit. It speeds up Thorns of Agony. | Sheet: `health.iframes`, `health.recoil`. Arena: nothing. | B/D | On taking a hit, the log says how many nail swings fit in the invulnerability: 1.3 ÷ 0.41 = 3; with Stalwart Shell, 4; with Quick Slash, 4 and 6. New row `nail.hitsInIframes`. |
| 4 | Soul Catcher (2) | +3 soul per hit (+2 to the reserve). | Yes, via `soul.perHit`; see the soul nuance in §1. | A | Two pools (delivery 3). |
| 5 | Shaman Stone (3) | Spells +33 / +51 / +47 / +50%. | Yes. | A | Nothing. |
| 6 | Soul Eater (4) | +8 (+6). | Like no. 4. | A | Like no. 4. |
| 7 | Dashmaster (2) | A dash every 0.4 s and downwards; Sharp Shadow goes to ×1.5. | Sheet: `nail.sharpShadow` already carries it. Arena: nothing. | C/E | It comes in with the "Shadow Dash" action (33). |
| 8 | Sprintmaster (1) | Running +20%; weaverlings 50% faster. | Nothing. | E | Note. |
| 9 | Grubsong (1) | +15 soul on taking **real damage** (25 with Elegy). With Weaversong, 3 soul per bite, even from those who give no soul (the Collector, the Siblings). | Sheet: `soul.onHit`, `pet.weaverlingSoul`. Arena: nothing. | B | Event *you're hit with damage*: +`soul.onHit`. It doesn't sound if Carefree Melody or Baldur Shell stop the hit. |
| 10 | Grubberfly's Elegy (3) | Each nail swing fires a beam of 50% of the nail, with no soul, while the **masks** are full: lifeblood doesn't count as health and losing it doesn't switch it off. At 1 mask only with Fury (red beam: 3/6/9/12/15) and no lifeblood. With Joni's Blessing, any damage switches it off until the bench. Hiveblood brings it back when regenerating (not with Joni). It raises Grubsong to 25. A beam doesn't hit the same enemy twice. | Sheet: `nail.elegy`, but with the panel's health. Arena: it doesn't add the beam to the swing. | A+B | Sheet with the fight's health (§3.2). The nail swing adds `nail.elegy` to the same target, with no soul. An `elegyHalted` flag with Joni's Blessing. |
| 11 | Fragile / Unbreakable Heart (2) | +2 masks. The fragile one breaks on death, except against dream bosses and in Godhome. | Yes. | A | On falling in Combat against a boss out in the world, a line: "it breaks". A notice, not a state. |
| 12 | Fragile / Unbreakable Greed (2) | Geo. | — | F | Nothing. |
| 13 | Fragile / Unbreakable Strength (3) | Nail ×1.5. Not the arts, nor Sharp Shadow, Thorns of Agony or Dreamshield. | Yes. | A | Fragile: like no. 11. |
| 14 | Spell Twister (2) | Spells at 24. | Yes. | A | Nothing. |
| 15 | Steady Body (1) | No recoil when striking. | Nothing. | E | Note. |
| 16 | Heavy Blow (2) | Knockback +75% (Great Slash +33%). Staggers with one hit fewer. | Nothing. | E (+B) | Note. If stagger comes in (delivery 3), threshold −1. |
| 17 | Quick Slash (3) | A swing every 0.28 s instead of every 0.41 (hitbox −20%, cooldown −32%). It fires Elegy more often and builds up soul faster. | Sheet: `nail.cooldown`, `nail.aps`, `nail.dps`. Arena: nothing, because there's no time. | D | Clock: each swing costs `nail.cooldown`. |
| 18 | Longnail (2) | Reach +15%. | Nothing. | E | Note. |
| 19 | Mark of Pride (3) | Reach +25%; Elegy's beams 35% taller. | Nothing. | E | Note. |
| 20 | Fury of the Fallen (2) | Nail and arts ×1.75 at 1 mask (with Joni's Blessing, at her last mask). Lifeblood you gain afterwards doesn't switch it off. It doesn't touch Sharp Shadow, Thorns of Agony or Dreamshield. Hatchlings +5. | Sheet, with the panel's health; in a pantheon, with `hp: 0`: never. | A+B | Sheet with the fight's health: `masks === 1`. |
| 21 | Thorns of Agony (1) | On taking a hit, **base** nail to the nearby enemies, up to twice if they're still inside; no soul. It also triggers when Baldur Shell or Carefree Melody stop the hit. Strength, Fury and the Nail Binding don't raise it. It uses up part of the invulnerability. | Sheet: `nail.thorns`. Arena: nothing. | B | Event *you're hit* (with damage or stopped): the target takes `nail.thorns`, with no soul. One hit; the log reminds you it can be two. |
| 22 | Baldur Shell (2) | When you focus, a shell absorbs up to 4 hits; only the bench repairs it. **The hit still interrupts the heal and the soul is lost.** It gives invulnerability like a hit; it triggers Thorns of Agony and Stalwart Shell; it raises Carefree Melody's counter; it gives no Grubsong soul. | Sheet: `health.baldurBlocks`. Arena: healing is instant, so "while you focus" doesn't exist. | B | `fight.shell = 4` (the bench restores it). Focusing opens a *focusing* window that your next action closes; a hit inside it with the shell: no damage and `shell − 1`, but the heal is undone and the soul is gone. Without the shell: damage and the heal lost. |
| 23 | Flukenest (3) | Vengeful Spirit becomes flukes. | Yes. | A | Nothing. |
| 24 | Defender's Crest (1) | Clouds of ~3 (1.1 s, one every 0.75 s) wherever you are. Spores at 40; hatchlings 4 + a cloud of 5; volatile Flukenest. | Sheet: `pet.crestCloud` and the synergies. Arena: the synergies yes (they go into the damage); the cloud on its own, nothing. | E | Note: "it only damages whoever touches you". |
| 25 | Glowing Womb (2) | Every 4 s, if you have 8 soul, a hatchling is born (max. 4) that charges at the enemy and deals 9 (14 with Fury; 4 + a cloud of 5 with Defender's Crest). | Sheet: `pet.hatchling`, `pet.hatchlingCost`. Arena: nothing. | D | Clock: every 4 s, −8 soul and +`pet.hatchling` to the target. |
| 26 | Quick Focus (3) | Heals in 0.597 s per mask instead of 0.891. | Sheet: `heal.timePerFocus`. Arena: nothing. | D | Clock: Focusing costs 0.25 + `heal.timePerFocus`. |
| 27 | Deep Focus (4) | 2 masks per heal, 65% slower; spores +35% radius. | Arena: heals 2 (`heal.masksPerFocus`). | A+D | Clock for the time. With Baldur Shell's window, the interruption undoes both. |
| 28 | Lifeblood Heart (2) | +2 lifeblood on resting. | Yes. | A | Losing lifeblood doesn't switch Elegy off: it comes from the rule in no. 10. |
| 29 | Lifeblood Core (3) | +4. | Yes. | A | Like no. 28. |
| 30 | Joni's Blessing (4) | Masks ×1.4 as lifeblood; no healing. Fury with the last one; Elegy switches off with any damage until the bench; Hiveblood regenerates it in 20 s. | Sheet: yes (`health.masks` 0, `heal.canFocus` off). Arena: the `lbCharm` pile mixes Joni with Heart/Core (§1). | A+B | Its own pile `fight.lbJoni`: lost after Heart/Core and it stands in for masks for Fury, Elegy and Hiveblood. |
| 31 | Hiveblood (4) | Regenerates **the last mask lost** after 10 s without damage (20 s Joni's; never Lifeblood Heart's, Core's or the cocoon's lifeblood). A hit restarts it; an attack of 2 only gives back 1; healing with Focus cancels it; it brings Elegy back (not with Joni); Baldur Shell and Carefree Melody don't interrupt it. | Sheet: `health.hivebloodRegen`. Arena: nothing. | D | Clock: `fight.sinceHit`; on reaching `health.hivebloodRegen` with a lost mask, +1. A "Wait" action. |
| 32 | Spore Shroom (1) | When you focus, a cloud of ~26 over 4.1 s (~40 with Defender's Crest), which ignores shields. It doesn't repeat until 4.25 s have passed or until you take damage. | Sheet: `heal.spore`. Arena: nothing. | B | Event *you focus*: +`heal.spore` to the target, marked approximate (if it stays inside). Clock: the cooldown. |
| 33 | Sharp Shadow (2) | The Shadow Dash deals base nail (×1.5 with Dashmaster, rounded), with no soul; it damages those immune to the nail; Strength, Fury and the binding don't raise it; invulnerable during the dash; 1.5 s between one and the next. | Sheet: `nail.sharpShadow`. Arena: there's no dash. | C | A "Shadow Dash" action: `nail.sharpShadow` to the target, with no soul. Clock: `move.shadowCooldown`. |
| 34 | Shape of Unn (2) | Heal while walking, crouched. | Nothing. | E | Note. |
| 35 | Nailmaster's Glory (1) | The arts charge in 0.75 s instead of 1.35. | Sheet: `nail.artCharge`. Arena: nothing. | D | Clock: each art costs `nail.artCharge`. |
| 36 | Weaversong (2) | Three weaverlings at 3 per bite; with Grubsong, 3 soul per bite even from those who give no soul; +50% speed with Sprintmaster. **The wiki doesn't give their rate.** | Sheet: `pet.weaverling`, `pet.weaverlingSoul`. Arena: nothing. | C | A manual "Weaverlings" action: 3 bites × `pet.weaverling` and, with Grubsong, 3 × `pet.weaverlingSoul` of soul. No clock, because there's no documented rate. |
| 37 | Dream Wielder (1) | Dream Nail 33 → 66 soul and charge 1.75 → 1.1 s. It deals no damage; it pushes. | Sheet: `soul.dreamNail`, `soul.dreamCharge`. Arena: the Dream Nail doesn't exist. | C | A "Dream Nail" action: +`soul.dreamNail` if the entry allows it (Pure Vessel doesn't; the Hollow Knight only in phase 4). Clock: `soul.dreamCharge`. |
| 38 | Dreamshield (3) | A shield that orbits; it stops the projectiles on a specific wiki list and not the piercing ones; on touching an enemy it deals base nail and breaks for 2 s; the nail swing launches it; it spins 173% faster while healing; +15% with Dream Wielder. | Sheet: `nail.dreamshield`, `abil.blockProjectiles`. Arena: nothing, and `js/enemies.js` doesn't know which attacks are projectiles. | B+E, data | Data: `proj: 'block' \| 'pierce'` on the attacks with the wiki's list. On the attack's button, "the Dreamshield blocks it" and a second "Blocked" button (no damage, shield broken for 2 s), or "it pierces the shield". A manual "Dreamshield" action: `nail.dreamshield`, because it's positional. |
| 39 | Grimmchild (2) | A shot of 11 (phase 4) every ~1.8 s. | Sheet: `pet.grimmchild`, `pet.grimmchildDps`. Arena: nothing. | D | Clock: every 1.8 s, +`pet.grimmchild` to the target. |
| 39 | Carefree Melody (3) | Negates a hit with a probability that rises with the hits since the last block (0 → 10.1 → 20.2 → 30.3 → 50.5 → 70.7 → 80.8 → 90.9%) and goes back to 0 on blocking. The counter survives death and unequipping it. It doesn't stop scenery hazards. Thorns of Agony and Stalwart Shell trigger all the same; Grubsong doesn't; it protects Baldur Shell and doesn't cut Hiveblood short. | Sheet: `health.carefreeAvg` with the table in `parts`. Arena: nothing. | B | No chance: the HUD shows the current probability and each enemy attack carries a second "♪ negated" button (it counts as a hit for Thorns of Agony and Stalwart Shell, not for Grubsong; counter to 0). The normal hit raises the counter. `fight.melody` persists between rooms and on reset. |
| 40 | Kingsoul (5) | 4 soul every 2 s. | Sheet: `soul.passive`. Arena: nothing. | D | Clock. |
| 40 | Void Heart (0) | The Siblings, the Void Tendrils and the Shade don't attack. | Sheet: `abil.voidNeutral`. Arena: nothing. | B, data | `void: true` on the `sibling` and `void-tendrils` entries; with Void Heart, their attacks come out dimmed: "doesn't attack you". |

Count, one family per charm (the fragile and the unbreakable ones count separately):
**A** 12 (4, 5, 6, 11 ×2, 13 ×2, 14, 23, 27, 28, 29) · **B** 10 (3, 9, 10, 20, 21, 22, 30,
32, Carefree Melody, Void Heart) · **C** 5 (7, 33, 36, 37, 38) · **D** 7 (17, 25, 26, 31, 35,
Grimmchild, Kingsoul) · **E** 7 (8, 15, 16, 18, 19, 24, 34) · **F** 4 (1, 2, 12 ×2). They add up to 45.

---

## 3. The model

### 3.1 What each family needs

- **A** needs nothing: the sheet already carries it and the arena already reads it.
- **B** needs the arena to have **events with hooks**, not three handlers that touch numbers:
  *you strike*, *you're hit* (with damage, absorbed or negated), *you focus*, *you kill*. Today
  `foehit` subtracts masks and writes a line; that's where Thorns of Agony, Grubsong, Baldur
  Shell, Carefree Melody and Stalwart Shell have to hang, **in a fixed order** (§3.3).
- **C** needs **new buttons in "Your attacks"**: Shadow Dash, Dream Nail, Weaverlings,
  Dreamshield. They only appear if you wear the charm (and the Shadow Dash always, because the
  Shade Cloak is taken as owned, as the README says).
- **D** needs **time**, and today the arena doesn't have it by decision: "there's no time or
  animation, you decide the order". The proposal (§3.4) respects that: the clock decides nothing,
  it only **counts** how long your actions take with the numbers the sheet already has, and with
  that the passives have something to run on.
- **E** fits as **a line under "Your attacks"** with the `blurb` each charm already carries in
  `js/data.js`: "Steady Body: no recoil · Longnail: +15% reach". You can see that the site knows
  you wear them and that they aren't simulated here. Without inventing numbers.
- **F** doesn't appear.

### 3.2 The sheet is computed with the fight's health

`compute(build, lang, options)` already accepts `options.bindings`. Add
`options.fight = { masks, lbJoni, lbExtra, elegyHalted }`, and `health()` decides the flags with
that instead of with `st.hp`:

```
fury  = has('fury') && (joni ? lbJoni : masks) === 1
elegy = has('elegy') && !elegyHalted && (
          (joni ? lbJoni === joniMax : masks === whiteMasks)
          || (fury && lbExtra === 0))
```

`st.hp` still rules on the panel, where health reads from left to right and there's only one
number. In the arena health is **four piles**, which are lost in this order: cocoon →
Heart/Core (`lbExtra`) → Joni (`lbJoni`) → masks. With Joni's Blessing, `lbJoni` **is** your
masks: 0 white ones, and Hiveblood's regeneration and Fury look there.

`fs()` then returns a sheet computed with the current health (memoised by
`masks|lbJoni|lbExtra|elegyHalted`, which change few times per fight). It's the same call that
`fightSync()` already makes for the pantheon (`js/app.js:1259`). Immediate visible effect: when
you're down to one mask, the nail's button goes up to 37 (56 with Strength) and Elegy switches
off or turns red, as in the game.

### 3.3 A pure reducer: `js/fight.js`

Today the combat rules live inside `ACT.hit`, `ACT.foehit` and `ACT.summon`, which touch the DOM,
`toast()` and `t()`. With five more charms hanging off "you're hit" that stops being readable
and, above all, **it can't be tested**. Proposal: the same pattern as the engine.

```
HK.fight.apply(state, sheet, entry, action) → { state, events }
```

Pure: no DOM, no language, no `localStorage`. It returns the new state and a list of events with
numbers (`{ kind: 'thorns', target: 'p0', dmg: 21 }`); `js/app.js` turns them into log lines with
`t()` and into `hudEvent`. That way "the maths never depends on the language" holds here too, and
`test/fight.test.js` can assert "with Thorns of Agony, taking a hit takes 21 from the target and
gives no soul" with `node --test`, just like `engine.test.js`.

It's a **tenth classic script**. The alternative: putting it in `js/engine.js`, which already has
918 lines and is the sheet, not the fight. I recommend the separate file; it touches
`index.html`, the "nine scripts" sentence in `CLAUDE.md` and `README.md`, and nothing in
`tools/artpack.js`, which copies the whole folder.

**State**, on top of today's `fight` (`js/app.js:989`):

```
masks, lbJoni, lbExtra, lbCocoon, soul     // health in four piles, and soul
shell: 4          // Baldur Shell: hits it has left; the bench restores it
melody: 0         // Carefree Melody: hits since the last block; persists
focusing: false   // Focus window open
healed: 0         // what the last Focus healed, in case it's undone
elegyHalted       // Joni's Blessing + Elegy: off until the bench
clock, sinceHit, lostMask   // delivery 2
```

**Actions and hooks**, in the order they're applied:

| Action | What happens, and which charm hangs off it |
|---|---|
| `strike` | Closes the heal window. The target takes `nail.damage`; +`soul.perHit`. If Elegy is active, the same target also takes `nail.elegy` with no soul. |
| `art`, `spell` | As today. They close the heal window. |
| `dream` | +`soul.dreamNail`, if the entry doesn't carry `dreamNail: false`. Closes the window. |
| `dash` | The target takes `nail.sharpShadow`, with no soul. Closes the window. |
| `weavers` | 3 × `pet.weaverling` to the target; +3 × `pet.weaverlingSoul`. |
| `shield` | `nail.dreamshield` to the target; shield broken for 2 s (delivery 2). |
| `focus` | −33 soul; +`heal.masksPerFocus` (capped); `healed = n`; `focusing = true`. Spore Shroom: +`heal.spore` to the target. Hiveblood: cancels the regeneration in progress. |
| `focusDone` | Closes the window without acting ("the heal finished before the next hit"). |
| `foeHit(attack, { negated })` | 1. Radiant: everything to 0. 2. If `negated` (Carefree Melody): no damage, `melody = 0`. If not: `melody += 1`; with `focusing && shell > 0`: no damage, `shell −= 1`; otherwise: damage over the four piles, +`soul.onHit` (Grubsong), `sinceHit = 0`, `lostMask = true`, and with Joni's Blessing and Elegy, `elegyHalted = true`. 3. If `focusing`: the heal is undone (`masks −= healed`, the soul is already spent) **in all three cases**, because the Focus page says the hit interrupts even if Baldur Shell absorbs it or Carefree Melody negates it. 4. Thorns of Agony: the target takes `nail.thorns` **in all three cases**. 5. An invulnerability event with `health.iframes` and the swings that fit. 6. Falling: as today; in Combat, with a fragile charm against a boss out in the world, a "breaks" event. |
| `wait(s)` | Delivery 2. |
| `summon`, `target` | As today. |

**The heal window** is the only interaction novelty: on pressing Focus, your side of the arena
says "Focusing…" with a "Done" button. An enemy attack in that state is a hit mid-heal; any
action of yours closes it. Without Baldur Shell the window still exists, because the interruption
(the heal lost and 33 soul thrown away) is exactly what the charm buys, and it has to be visible
without it.

**Carefree Melody without chance.** The arena's log is "arithmetic you can see"; a die doesn't
fit. The HUD shows the next hit's probability (from `health.carefreeAvg.parts`, with
`fight.melody` as the index), and each enemy attack button splits into "−1" and "♪ negated". You
decide, as you decide the order. The alternative, a seeded roll with the percentage in the log,
is noted in case it's ever preferred.

### 3.4 The clock (second delivery)

A `fight.clock` counter in seconds that **only advances with your actions**, with the durations
the sheet already computes:

| Action | Takes | Source |
|---|---|---|
| Nail swing | `nail.cooldown` (0.41 · 0.28 with Quick Slash) | sheet |
| Art | `nail.artCharge` (1.35 · 0.75 with Nailmaster's Glory) | sheet |
| Spell | **no data on the wiki**: 0 s until there is, and it says so | open |
| Focus | 0.25 + `heal.timePerFocus` (0.891 · 0.597 · 1.470 · 0.985) | sheet |
| Dream Nail | `soul.dreamCharge` (1.75 · 1.1) | sheet |
| Shadow Dash | `move.shadowCooldown` (1.5) | sheet |
| Wait | 1, 2, 5 or 10 s, to choose | button |
| Enemy attack | 0: it crosses with yours | — |

With each advance `dt`, the passives run on it:

- **Kingsoul**: +4 for every 2 s (a fractional accumulator; it adds integers).
- **Grimmchild**: every 1.8 s, +`pet.grimmchild` to the target.
- **Glowing Womb**: every 4 s, if `soul ≥ 8`, −8 soul and +`pet.hatchling` to the target.
- **Hiveblood**: `sinceHit += dt`; on reaching `health.hivebloodRegen` with `lostMask`, +1 mask (or
  a Joni one), `lostMask = false`, and Elegy comes back (not with Joni).
- **Spore Shroom**: a 4.25 s cooldown. **Dreamshield**: 2 s broken.

What you see: the time in the arena's header and, at the end, "You took 800 from it in 14.2 s:
56 per second". It's the only honest way for Quick Slash, "the strongest sustained-damage charm
in the game" according to `kb/07-builds.md`, to change anything in the arena: the same sequence
of swings takes 32% less time.

**With a warning written on the page itself**: the clock counts how long your actions take, not
the fight; dodging and waiting for attacks aren't there. It's a minimum, and it says so.

### 3.5 Data missing from `js/enemies.js`

- `proj: 'block' | 'pierce'` per attack, with the two lists on the "Dreamshield" page. Among the
  arena's entries: it blocks Crystal Guardian's and Enraged Guardian's laser, Dung Defender's and
  White Defender's ball, False Knight's and Failed Champion's barrel, Grimm's and the Nightmare
  King's bats (not their fireballs), the homing orb of the Master, the Tyrant and Soul Warrior (not
  the orbiting ones), the projectiles of the Oblobbles, the Hollow Knight and the Brooding Mawlek,
  the lingering ones from Nosk, Winged Nosk and the God Tamer, Sheo's blots and the wind blades of
  the Mantis Lords, the Sisters and Traitor Lord. They pierce: Hornet's needles, the Radiance's
  sword and orbs, the Collector's jars, Broken Vessel's and Lost Kin's orbs, the Hive Knight's
  spikes, Pure Vessel's daggers, the balled-up Zotelings and everything from the Dream Warriors.
  And the common enemies with projectiles (Aspids, Gulka, Husk Miners…).
- `dreamNail: false` where the Dream Nail gives no soul: Pure Vessel (`kb/03-bosses.md`, Pure
  Vessel); the Hollow Knight only in its phase 4 (same file, the Hollow Knight). The Watcher
  Knights do, even while they roar (same file, Watcher Knights). The dream bosses and the Godhome
  ones still need going over.
- `void: true` on `sibling` and `void-tendrils`.
- For stagger (optional): `kb/data/staggers.json` already has the hits, the combo and its window
  for 20 bosses.

---

## 4. The plan, by value-to-cost ratio

### Delivery 1: the events (one day)

1. **The sheet with the fight's health** (§3.2). Engine: ~20 lines and the `lbJoni` pile; a
   memoised `fs()`; tests for Fury and Elegy with `options.fight`. It fixes the two conditionals,
   which is the visible bug.
2. **`js/fight.js` and `test/fight.test.js`** (§3.3): move what's in `hit`, `foehit` and `summon`
   without changing behaviour, with a test that False Knight, the Oblobbles and the Watcher
   Knights stay the same. Then, each hook with its test.
3. **The hooks**: Thorns of Agony, Grubsong, Baldur Shell with the heal window, a manual Carefree
   Melody with the probability in the HUD, Spore Shroom, Stalwart Shell (the invulnerability line),
   Void Heart, the fragile charms.
4. **The new actions**: Shadow Dash, Dream Nail, Weaverlings.
5. **The positional charms' line** under "Your attacks", with the `blurb`s that already exist.

With this, of the 29 that today change nothing or come in wrong, only the seven from family D and
Deep Focus's time are left out.

### Delivery 2: the clock (one day)

Durations, "Wait", the five passives, the header with the time and the ending with the damage per
second. Before that, decide the spells' time (§5).

### Delivery 3: data and optional extras

- `proj` in `js/enemies.js` and Dreamshield with its "Blocked" button.
- **Stagger**: a hit counter per bar (nail, arts, spells, Thorns of Agony, hatchlings, Sharp
  Shadow, Elegy; not Grimmchild, the weaverlings, Dreamshield, Spore Shroom or Defender's Crest);
  on reaching the threshold, "staggered" and the enemy's buttons dimmed until your next hit, which
  ends it. Heavy Blow takes off 1. It's what `kb/01-mechanics.md` calls "widely misunderstood".
- **Two soul pools**: main and reserve, with `soul.perHitReserve`; what's spent is refilled from
  the reserve. Soul Catcher and Soul Eater exact.
- **HUD**: Baldur Shell with its cracks under the orb (as in the game), Hiveblood's drop of honey on
  the returning mask, Carefree Melody's counter.

---

## 5. Pending decisions

1. **Clock, yes?** It changes the README's "there's no time" sentence to "time is counted, not
   simulated". Recommendation: yes, in delivery 2 and with §3.4's warning.
2. **Carefree Melody: manual or a roll.** Recommendation: manual, with the probability in view.
3. **Thorns of Agony: one or two hits by default.** Recommendation: one, and the note.
4. **A tenth script or inside the engine.** Recommendation: `js/fight.js`.
5. **The spells' cast time**: the wiki doesn't document it. Either it's measured in the game, or it
   goes at 0 s with a note. Without it, the clock undervalues spell builds.
6. **The weaverlings' rate**: it isn't on the wiki either; that's why they're a manual action.
7. **Carefree Melody's counter**: in the game it survives death and unequipping it.
   Recommendation: it persists between rooms and on reset, and shows in the HUD.
8. **Dream Nail per entry**: which dream bosses and Godhome bosses allow it. A pass through
   `kb/data/tactics-en.txt` is still missing.

---

## 6. Sources

`hollowknight.wiki` pages read on 21 September 2026, as raw wikitext through `/mw/api.php`: the
45 charm pages (the three fragile ones cover the unbreakable ones; "Grimmchild" covers its
phases), "Focus" (the interruption with Baldur Shell and Carefree Melody, 1.141 s for the first
mask), "Dream Nail" (33 soul, it pushes), "Desolate Dive" (invulnerability), "Combat (Hollow
Knight)" (parries and stagger). In `kb/`: `01-mechanics.md` §4, §6, §7 and §8; `02-arsenal.md`
§4; `07-builds.md`; `03-bosses.md` for the Dream Nail. No figure in this document is translated
or rounded on its own account: when the wiki says "~26", this says "~26".
