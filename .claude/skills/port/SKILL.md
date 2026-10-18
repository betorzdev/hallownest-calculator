---
name: port
description: Carry a fix or feature between this repo and its sibling pharloom-calculator (../pharloom-calculator/), in either direction, adapting it to each site's rules. Use when asked to port, bring over, copy from or match the sibling / the Silksong site.
---

# Porting between the sibling sites

The two repos started from the same skeleton and diverge freely; a port is a hand adaptation,
never a blind copy.

1. **Find the change** in the source repo: `git -C <repo> log`, `git -C <repo> show <sha>`, or
   the code by grep. Read the target repo's equivalent code before touching it: the structure may
   have drifted. A decision Albert already took there (its design doc says so) is carried over,
   not reopened.
2. **Adapt it:**
   - Storage: `hollow.*` keys here, `pharloom.*` keys and the `pharloom-live` IndexedDB there.
     Never read or write the other site's keys (they share the origin).
   - Strings: each `{ es, en }` comes from its own game's sources (here, the `strings` skill and
     `npm run text`); never carry a Silksong name or translation into Hollow Knight.
   - Game rules differ (damage model, completion, Journal): check `design/00-system.md` here,
     `design/00-study.md` there.
   - The target's own tokens and visual language, not the source's values. Where the source leans
     on something this site hasn't got (a rule, a class, a token), build the piece with what's
     here and say so in the PR.
3. **Footworn parity.** `track()` events are the same set in both sites: grep `track(` in both
   `js/` folders. A new event goes in both or neither, with the same name and props, and is listed
   in `docs/guide.md` with the others.
4. **Note the origin** in the commit summary or PR body (the source repo, sha and PR).
5. Close with `/finish` in the repo that changed.
