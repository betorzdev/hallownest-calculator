---
name: merge-prs
description: Review and merge the open PRs against dev one at a time - bring dev into each branch, resolve conflicts, check it, open the site on the screen it changes, explain it to Albert, and squash-merge only on his green light. Use when asked to merge, review or go through the pending PRs ("vamos a mergear las PRs").
---

# Merging the pending PRs

Brought from pharloom-calculator's skill and fitted to this repo. Albert reviews each PR in the
browser and says "luz verde" or what to change. Nothing is merged without his green light for
that PR. Asking for this skill is his leave to commit the merges and push them (the exception
to "never commit" in `finish`); nothing else gets committed.

## Order

`gh pr list --state open --base dev` first (he may have merged some). Those that touch nothing
shared go first; those that touch the same files (the Map's: `js/app-map.js`, `css/app.css`;
`index.html` and the pages `npm run pages` writes from it) go in the order that leaves the least
to rebase, the deepest change first. Say the order once, at the start.

## Where to work

The main tree often carries Albert's own uncommitted work: never stash or overwrite it. If
`git status --short` isn't clean, work each PR in a worktree (`git worktree list`: the PR may
already have one, `../hollownest-calculator-<name>`; else `git worktree add ../hollownest-calculator-pr<N> <branch>`).
A new worktree lacks the git-ignored `kb/data/all_text.json`, which tests and `npm run text`
need: symlink it from the main tree.

## Each PR

1. **Switch**: `git checkout <branch> && git pull` (in its worktree). Read the PR's body and
   files (`gh pr view N --json body,files`).
2. **Bring dev in**: if `git merge-tree --write-tree origin/dev HEAD` reports a conflict, or the
   branch is behind what was just merged, `git merge --no-edit origin/dev`, so what Albert sees is
   what will land. Resolve each conflict by keeping both sides' intent: when one side moved code
   into a function and the other changed the old copy, port the change into the function.
   Generated files aren't resolved by hand: take either side and rerun their generator
   (`npm run pages` for `index.html`'s `?v=` and the pages; `npm run journal|rooms|collectibles|walk`;
   `tools/extract-*.py` with the game installed). Look for what merges clean but breaks: a name,
   string key or helper the other PR removed (`node --check`, grep).
3. **Check** (the `finish` table): `npm test`; `npm run text -- --audit` if strings or game names
   changed; `npm run pages` and an empty diff after it if `index.html`, `js/` or `css/` changed;
   `npm run check-pack -- ~/Downloads/112_GM_qofom` if `js/savefile.js`, `js/completion.js` or
   `js/progress.js` changed; a generator rerun with an empty diff if a generator changed. The
   changed screens loaded headless (the `look` skill: `debug.html?view=<v>`, a real save with
   `&ls=`), and the smoke test when a screen's behaviour changed (its known FAILs are in `look`).
   Commit the merge (`--no-edit`) and push.
4. **Show it**: open the screen it changes, `xdg-open "file://$PWD/index.html#view=<v>"`
   (`home` Your game, `inventory`, `progress`, `map`, `journal`, `godhome`, `charms`, `fight`,
   `saves`; `#view=map&admin=1` for the Map's admin). `debug-*.html` pages when the PR is about
   what one of them checks (`debug-marks.html` for where the Map's marks go).
5. **Explain it in Spanish**: what it changes in plain words (not the code's terms: a "layer" is a
   kind of mark on the map), the conflicts resolved and how, what was checked and what wasn't, and
   where to look. End with "¿Luz verde o cambio algo?".
6. **On his answer**:
   - green light: `gh pr merge N --squash --delete-branch`, then `git worktree remove` its
     worktree if there was one, `git fetch` and the next PR;
   - a bug he points at: find its cause (it may be older than the PR), fix it on the PR's
     branch with a test that fails without the fix, push, show it again;
   - "doesn't read" or a design doubt: ask what part with AskUserQuestion, then a design page
     (`design/NN-*.html`, opened for him) and the options in plan mode; the result goes into the
     same PR.

At the end, `gh pr list --state open --base dev` should be empty; update or delete any memory
that tracked the pending PRs. Moving dev into main is Albert's own PR ("Dev"): not this skill's.
