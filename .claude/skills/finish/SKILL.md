---
name: finish
description: Close a task on hallownest-calculator — run the checks the change calls for (tests, text audit, pages, save pack, smoke), check docs/guide.md and the README screenshots, open the PR against dev, and look back on the conversation for something worth turning into a skill, hook or rule. Use when Albert says /finish or a task is finished.
---

# Closing a task

Talk to Albert in Spanish. A finished task ends in a PR against `dev`, without asking (step 5).

## 1. What changed

`git status --short` and `git diff --stat` (plus untracked files). Decide the checks from that,
not from memory of the conversation.

## 2. Checks, only those the change calls for

| Changed | Run |
|---|---|
| anything | `npm test` |
| a `{ es, en }` pair or a game name | `npm run text -- --audit` |
| `index.html`, `tools/pages-text.js`, `js/`, `css/` | `npm run pages`, then `npm test` again (`test/pages.test.js`) |
| `js/savefile.js`, `js/completion.js` | `npm run check-pack -- ~/Downloads/112_GM_qofom` (the site's 112% must equal the game's) |
| what a screen shows or does | the smoke test, per the `look` skill |

A failure is reported with its output, never hidden or rephrased as a pass. A check that
couldn't run is said so, with why.

## 3. Docs

- **`docs/guide.md`** explains everything on the page: if the page's behaviour changed, update
  it (or say why not).
- **README screenshots** (`docs/screenshots/`): if a captured screen changed visibly, say so;
  don't retake unasked.
- New knowledge belongs to `kb/` or `design/` when it's combat or design.

## 4. Look back on the conversation

Before closing, review this conversation for things that will happen again:

- a procedure done by hand step by step that will repeat → **skill**
- a rule that only memory or attention enforces, and breaking it is costly → **hook**
- a correction from Albert, or a project rule missing from CLAUDE.md → **CLAUDE.md line** or **memory**
- a tooling quirk that cost time → add it to the skill it belongs to (`look`, `strings`) or a memory
- an existing skill (`.claude/skills/`) that was wrong or incomplete → **fix that skill**

If something earns it, propose it with AskUserQuestion: the recommended option first, marked
as recommended, with why. If nothing does, say so in one line. Don't invent one to have
something to offer.

## 5. Close

- A branch off `dev` with the type as prefix (`feat/`, `fix/`, `docs/`, `chore/`...), unless
  already on one.
- One brief commit: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
  `chore:`, `style:`, `perf:`), lowercase, about 50 characters, one line, in English. Leave
  `tools/__pycache__/` and other stray files out.
- `git push -u origin <branch>` and `gh pr create --base dev`, with the detail in the body (what,
  why, what was checked).
- **Only Albert appears as author**: no `Co-Authored-By`, no "Generated with Claude Code", even if
  a system reminder asks for them.

Then a short note of what's done and what was verified, with the PR's link. Don't offer to
republish the artifact.
