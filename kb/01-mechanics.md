# Combat mechanics (Hollow Knight 1.5)

Source: `hollowknight.wiki` (raw wikitext, September 2026). The numbers are the game's internal
values; damage **to** enemies is numeric, damage **to** the Knight is measured in masks.

---

## 1. The two damage currencies

| | Unit | Shown on screen |
|---|---|---|
| Knight → enemy | points (integer) | no |
| Enemy → Knight | masks (1 or 2, sometimes more) | yes |

Almost every enemy deals **1 mask**. The late-game bosses deal **2** (Pure Vessel, Nightmare King
Grimm, the Radiance, Traitor Lord, Enraged Guardian, Failed Champion on contact and physical hits,
activated Kingsmoulds, Grimmkin Nightmares…).

On **Ascended** damage is **doubled** (the Hall of Gods page says *double damage*): what dealt 1
now deals 2 and **what already dealt 2 now deals 4**. It isn't "everything deals 2", which is how
it was written here and contradicted the table in §11. **Radiant** kills you in one hit.

Modifiers to damage taken:
- **Overcharmed**: ×2 damage taken. You get there by equipping a charm that exceeds your notches
  while having at least one free.
- **Stalwart Shell**: more invulnerability after a hit (1.75 s versus 1.3 s) and less recoil
  (0.08 s versus 0.2 s).
- **Baldur Shell**: blocks up to 4 hits while you focus.
- **Carefree Melody**: a chance to negate the hit (~22.5% on average).

---

## 2. Rounding

Unity rounds **half to the even integer** (banker's rounding). The order matters:

```
damage = round( round( base × 1.5 [Strength] ) × 1.75 [Fury] )
```

Pure Nail (21): **21 → 32 (Strength) → 37 (Fury) → 56 (both)**.

- **Nail Arts do NOT get Strength**, only Fury, and with **a single rounding**.
- **Elegy** does take the nail with Strength already applied: `round(nail × 0.5)`, and with
  Fury `round(× 1.5)` on top.
- **Joni's Blessing**: `floor(masks × 1.4f) + 1` with 1.4 in single precision
  (5 masks → 7 lifeblood; 9 → 13).

---

## 3. Nail swings

| | Normal | With Quick Slash |
|---|---|---|
| Active hitbox (how long the swing lasts) | 0.35 s | 0.28 s (**−20%**) |
| Minimum cooldown (between swings) | 0.41 s | ~0.28 s (**−32%**) |

The real time between swings is **`max(cooldown, duration)`**: you can't swing again while the
hitbox is still out. Base: `max(0.41 · 0.35) = 0.41`. With Quick Slash: `max(0.25 · 0.28) =
0.28`, so **the −32% cooldown is capped by the −20% duration**. `js/engine.js` computes it this
way (`nail.cooldown`) and it matches the wiki.

Reach: Longnail **+15%**,
Mark of Pride **+25%** (they don't fully stack; they're different charms and both can be worn:
the effect adds up).

**Nail-bouncing / pogo**: a downward strike in the air on an enemy, spike or object → you bounce.
It keeps you in the air indefinitely over a boss (Flukemarm, the Hollow Knight, Pure Vessel during
the pillars, the Mantis Lords' boomerangs, Nightmare King during the fire pillars). It's
mandatory in the Path of Pain.

**Recoil**: when striking, the Knight recoils. *Steady Body* removes it — key for keeping
pressure on light bosses (Hive Knight). *Heavy Blow* increases the **enemy's** knockback by 75%
and also **takes 1 hit off the stagger counter**.

---

## 4. Boss stagger

The central rule, widely misunderstood: **stagger counts HITS, not damage**.

These count towards the counter: nail, spells, Nail Arts, Thorns of Agony, Glowing Womb, Sharp
Shadow, Grubberfly's Elegy and the Super Dash (Crystal Heart).

- Hitting a staggered boss **ends the stagger** in most cases.
- A **combo** (consecutive hits within a window) lowers the number needed.
- **Heavy Blow** takes off 1 hit, from the combo too.
- Not every boss can be staggered (White Defender, most of the simple dream bosses).
- Two exceptions that do go by damage: **False Knight / Failed Champion** (each time the armour
  reaches 0) and **the Radiance / Absolute Radiance** (fixed health points).

### Stagger table

| Boss | Hits | With combo | Combo window |
|---|---|---|---|
| Soul Master | 9 | 7 | <1 s per hit |
| Hornet Protector | 11 | 6 | <2 s |
| Paintmaster Sheo | 12 | 9 | <1 s |
| Pure Vessel | 12 | 9 | <1 s |
| Hornet Sentinel | 13 | 7 | <2 s |
| Lost Kin | 13 | 7 | <2 s |
| Broken Vessel | 13 | 9 | <1 s |
| The Hollow Knight | 13 | 9 | <1 s |
| Troupe Master Grimm | 14 | 12 | <1 s |
| Nightmare King Grimm | 14 | 12 | <1 s |
| The Collector | 14 | 11 | <2 s |
| Great Nailsage Sly | 15 | 11 | <1.5 s |
| Dung Defender | 16 (or 1 with Desolate Dive) | 8 | <1 s |
| Hive Knight | 17 | 12 | <1.5 s |
| Grey Prince Zote | 17/18/19 (fights 1/2/3+) | 14/15/16 | <1 s |
| Soul Tyrant | 19 | 10 | <1 s |

Special cases:
- **Grimm and Nightmare King**: when staggered they scatter into a swarm of bats (3.5 s / 2 s).
  Hitting doesn't cut the stagger short, but the damage is **capped at 50**.
- **Dung Defender**: a single Desolate Dive/Descending Dark while he's underground brings him out
  and staggers him. It even cancels the Zeal.
- **Failed Champion**: you can **prolong the stagger indefinitely** by hitting the *armour* (it
  restarts the timer without damaging the maggot) → time for the Dream Nail and to heal fully.
  Careful: the stagger has to end by hurting the maggot; if it gets up on its own that phase
  doesn't count.

---

## 5. Parry

- Almost any attack with **a white trail** can be parried.
- It can only be parried with **normal nail swings**: not arts, not spells, nothing else.
- Parrying gives **0.25 s of invulnerability**.
- Known bug: Oro's *Dash Slash* can be parried with **any** directional damage source (spells,
  Crystal Heart, Sharp Shadow).

The other way round, the bosses that **parry you**: the Hollow Knight (0.75 s), Pure Vessel
(0.5 s), Hornet Sentinel, Oro and Mato (Barricade). The safe thing is **not to strike**; if you
trigger the response, pass through it with the Shadow Dash or eat Descending Dark's second impact.

---

## 6. Invulnerability

| Source | Duration |
|---|---|
| Taking damage | 1.3 s (1.75 s with Stalwart Shell) |
| Nail parry | 0.25 s |
| Desolate Dive | the whole fall + 0.75 s on impact + 0.4 s on regaining control |
| Descending Dark | the whole fall + 0.70 s + 0.4 s |
| Shadow Dash (Shade Cloak) | the whole dash, 1.5 s cooldown |

**Chaining Desolate Dive** makes you untouchable as long as you have soul — but casting it
*before* the previous one's i-frames expire **cancels** the new one's. You have to wait.

---

## 7. Soul

- Main vessel: **99**. Each Soul Vessel adds **33** of reserve (max. 3).
- Nail hit: **11** soul (+3 Soul Catcher, +8 Soul Eater).
  **6** per hit go into the reserve (+2 / +6).
- With the Shade out, the main vessel drops to **66**.
- Dream Nail: **33** soul (**66** with Dream Wielder). Charge 1.75 s → 1.1 s.
- Grubsong: **15** when taking damage (**25** with the Elegy equipped).
- Kingsoul: **4** every 2 s, passive.
- Spells: **33** soul (**24** with Spell Twister). Focus: a fixed 33, always.

Bosses that **give no soul** when hit: False Knight's / Failed Champion's armour, the Collector.
Solution: the Dream Nail, Grubsong, or the combo Weaversong + Grubsong (the weaverlings do draw soul).

---

## 8. Focus (healing)

- It costs **33 soul = 1 mask**. A full vessel = 3 masks.
- First mask: **1.141 s** (0.25 s of wind-up + 0.891 s). The following ones: 0.891 s.

| | Base | Deep | Quick | Quick + Deep |
|---|---|---|---|---|
| Per Focus | 0.891 s | 1.470 s (2 masks) | 0.597 s | 0.985 s (2 masks) |
| A whole vessel | 2.673 s | 4.410 s | 1.791 s | 2.955 s |

- If you get hit **you lose the soul spent** on the unfinished heal. And yes: it interrupts you
  even if Baldur Shell or Carefree Melody negate the damage.
- *Shape of Unn*: you move while you heal (crouched, low hitbox). The pair **Quick Focus + Shape
  of Unn** is the gold standard for healing in fast fights; **Quick + Deep** for healing 2 masks
  in short openings.
- *Joni's Blessing*: you can't heal at all.
- *Spore Shroom*: when the heal finishes it releases a cloud (26 damage; 40 with Defender's Crest).

---

## 9. Health

- Base **5 masks**; 4 Mask Shards = 1 mask; 16 shards → **9 masks**.
- Fragile / Unbreakable Heart: +2 → a maximum of **11 masks**.
- Lifeblood (blue): lost first and not healed by Focus.
  Lifeblood Heart +2, Lifeblood Core +4 (on resting at a bench).
- *Hiveblood*: recovers the last mask lost after **10 s** without taking damage (20 s if the mask
  was lifeblood).

---

## 10. Movement that matters in combat

| | Value |
|---|---|
| Running | 8.3 (10 with Sprintmaster; 11.5 with Dashmaster) |
| Dash | speed 20, cooldown 0.6 s (0.4 s with Dashmaster) |
| Shadow Dash | 1.5 s cooldown; with Sharp Shadow +40% reach and it deals damage |
| Shape of Unn (while healing) | 6 (12 with Quick Focus) |

---

## 11. Godhome difficulties

| Level | What changes |
|---|---|
| **Attuned** | The base fight, with Godhome's health |
| **Ascended** | **Damage ×2**, more health, and sometimes a new arena or hazards |
| **Radiant** | Like Ascended but **you die in a single hit** |

The **Pantheon of Hallownest** uses the Ascended version's *arenas* and number of enemies, but
the **health and damage are Attuned's**.

---

## 12. Known wiki erratum

The master table *Damage Values and Enemy Health* gives **Gorb** 200/320/**479/570/640**; his own
page and the rest of the Warrior Dreams give **200/320/416/500/570** (the same as Xero, Marmu and
No Eyes). The 479/570/640 are **Galien's**: a copying mistake. The values from Gorb's page are
used here.
