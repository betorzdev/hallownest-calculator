---
name: strings
description: Write or change any visible string on hallownest-calculator — every { es, en } pair comes from a source (the game's text dump, then the English wiki's ESname, then the Spanish wiki), never translated by hand. Use whenever a visible string, game name, label or tooltip is added or changed.
---

# Visible strings

Every visible string carries `{ es, en }`. **Nothing is translated by hand.** The full rules
are CLAUDE.md, "Translations"; this is the procedure.

## Game names and game labels: find the source, in order

1. **The game's text** (`kb/data/all_text.json`, patch 1.5.12620):
   `npm run text -- "Shade Cloak"` searches it, `npm run text -- --key CHARM_NAME_` lists by key.
   Copy it **as is**: capitalisation («Aguijón Onírico») and typos («Guardian Furioso») included;
   only curly quotes become straight. **Leave the key in a comment** next to the string
   (`// CHARM_TXT_EQUIPPED`): the audit reads those.
2. **The English wiki's `ESname`**, in the page's `{{Localisation}}` block
   (`https://hollowknight.wiki/w/<Page>?action=raw`), for what the game never names
   (Absolute Radiance, Godhome, Hall of Gods…). Note the source in the comment.
3. **The Spanish wiki** (`hollowknight.fandom.com/es`), only for bosses' attacks (bold under
   «Comportamiento y tácticas») and the Zotelings of «La Eterna Disputa». Same attack, same
   name across bosses; fix obvious typos.
4. **No source**: it stays in English, and the comment says so.

An element that shows only a game name carries `${NT}` (`translate="no"`, `js/app.js`).

## What the site says itself

- Only UI labels are written by the site; **content is game names, game text, numbers and
  links, never prose of mine** (no explanations or tips in content).
- Written for the context, not word for word: «Golpes hasta morir» / "Hits until you die".
- A label copying a game element uses the game's text («Equipado», «Sobrecarga», «Muescas»).
- Numbers: Spanish «50 %», «0,25 s»; English "50%", "0.25 s" (use the engine's `pct()`/`num()`).
- `{x}` placeholders identical in both languages.

## Check

`npm test` (`test/i18n.test.js`: Spanish accents or words in the English, untranslated strings,
mismatched placeholders) and `npm run text -- --audit` (a game name that doesn't say what the
game says).
