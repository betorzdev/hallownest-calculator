<div align="center">

# Hallownest Calculator

**See how every charm changes the Knight's stats, in English and Spanish.**

Pick what you're wearing and the sheet shows you every value, how much it changed and which
charm changed it. Then take that build into a fight.

[**Open the calculator**](https://betorzdev.github.io/hallownest-calculator/)
&nbsp;·&nbsp; [Full guide](docs/guide.md)
&nbsp;·&nbsp; [Report a wrong number](https://github.com/betorzdev/hallownest-calculator/issues)

<br>

<img src="docs/screenshots/charms.webp" alt="The Charms screen: the Knight's HUD, nail damage 32, DPS 114.3 and the charm grid, with Shaman Stone hovered and its effect on each spell listed alongside" width="900">

</div>

## What it does

<table>
<tr>
<td width="50%" valign="top">

### Charms
All 45 charms on the game's own Inventory screen. **Hover one and see what it would change**
before you equip it: nail damage, DPS, hits until you die, soul per hit, healing time, every
spell. Overcharm and notches work as in the game.

</td>
<td width="50%" valign="top">

### Spells, Nail Arts and effects
Under the charms, what each spell and Nail Art hits for with your build, and **what your
charms do that the numbers don't show**: Weaverlings, Dreamshield, Thorns, the Elegy beams…
with the synergies between them marked.

</td>
</tr>
<tr>
<td colspan="2" valign="top">
<img src="docs/screenshots/spells-effects.webp" alt="Spells and Nail Arts with their damage, and the Effects row: Dreamshield, Weaverlings with Grubsong's synergy, Elegy's beams, Thorns, Grubsong's soul and the Void Heart">
</td>
</tr>
<tr>
<td valign="top">

### Your game
Your nail, masks, soul vessels, notches, spells and nail arts, plus the charms and abilities
you've actually found. Start from the base Knight or from everything maxed.

</td>
<td valign="top">

### Combat
Fight **180 enemies and bosses** with your build, hit by hit: phases, armour, the soul you gain,
the masks you lose. Answers the question no other site does: *how many hits does this boss
take?*

</td>
</tr>
<tr>
<td valign="top">
<img src="docs/screenshots/your-game.webp" alt="Your game screen: the five nails, masks, vessels, notches, nail arts and spell levels">
</td>
<td valign="top">
<img src="docs/screenshots/arena.webp" alt="Combat arena mid-fight against False Knight: the Knight and the enemy face to face with its title card, the scoreboard between them, and both sides' attacks below">
</td>
</tr>
<tr>
<td colspan="2" valign="top">

### Hall of Gods & Pantheons
The **44 statues** on Attuned, Ascended and Radiant, and the **five Pantheons** room by room,
with bindings, the hot springs and the Lifeblood cocoon.

</td>
</tr>
<tr>
<td valign="top">
<img src="docs/screenshots/hall-of-gods.webp" alt="Hall of Gods: the statue grid with the symbols won on each difficulty and Gruz Mother's plaque">
</td>
<td valign="top">
<img src="docs/screenshots/pantheons.webp" alt="Pantheon of the Master at room 6: the timeline of rooms and the hot spring, bench and cocoon choices">
</td>
</tr>
<tr>
<td valign="top">

### Hunter's Journal
Track your real playthrough entry by entry, from "not encountered" to "completed", with the
kills left to decipher each one. The total works like the game's: 146, growing to 164.

</td>
<td valign="top">

### In your pocket, in two languages
Works just as well on a phone. English and Spanish, with every name copied from the game's own
official translation.

</td>
</tr>
<tr>
<td valign="top">
<img src="docs/screenshots/journal.webp" alt="The Hunter's Journal: counters of encountered and completed entries and the Vengefly page">
</td>
<td valign="top" align="center">
<img src="docs/screenshots/mobile-en.webp" alt="The Charms screen on a phone, in English" width="45%">
&nbsp;
<img src="docs/screenshots/mobile-es.webp" alt="The Charms screen on a phone, in Spanish" width="45%">
</td>
</tr>
</table>

## Why trust the numbers

- **Every value comes from [hollowknight.wiki](https://hollowknight.wiki/)**, page by page, and
  is checked by the tests.
- **The game's own rounding**: Unity rounds half to the even integer, so Strength and Fury give
  the same numbers you see in-game.
- **The game's own words**: names are taken from its text files, never translated by hand.

How each number is worked out is in the [guide](docs/guide.md#where-the-numbers-come-from).

## Run it

No framework, no build, no install. Double-click `index.html`, or serve the folder:

```sh
python3 -m http.server 8000    # then http://localhost:8000
npm test                       # node --test, no dependencies
```

Your build lives in the URL, so **Share** gives you a link to exactly what you're wearing.

## Documentation

| | |
|---|---|
| [`docs/guide.md`](docs/guide.md) | Every screen in detail, the files, the URL format, the numbers and languages |
| [`design/`](design/README.md) | The design system and the research behind it |
| [`kb/`](kb/) | Combat knowledge base: bosses, enemy health, Godhome, the Colosseum, builds |
| [`CLAUDE.md`](CLAUDE.md) | The rules for working on the code and the translations |

## Credits

**Unofficial fan project**, free and non-commercial, not affiliated with or endorsed by
[Team Cherry](https://www.teamcherry.com.au/). *Hollow Knight*, its artwork, texts and names
are © Team Cherry.

Data from [hollowknight.wiki](https://hollowknight.wiki/) and the
[Spanish wiki](https://hollowknight.fandom.com/es/) (CC BY-SA 3.0); game texts from
[stradivari96/hollow-knight-translator](https://github.com/stradivari96/hollow-knight-translator);
fonts under the [SIL OFL 1.1](assets/fonts/OFL.txt). The code is [MIT](LICENSE). The details
are in the [guide](docs/guide.md#credits-and-licences).

Made by **Albert** ([@betorzdev](https://github.com/betorzdev)) ·
[betorzdev@gmail.com](mailto:betorzdev@gmail.com)
