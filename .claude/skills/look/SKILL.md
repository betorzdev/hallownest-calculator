---
name: look
description: Look at the hallownest-calculator page with headless Chrome — the smoke test, screenshots at any width, the mouse path, animations, the debug-*.html harnesses — with the quirks of this machine that otherwise look like app bugs. Use to verify any visible change, run the smoke test, or take screenshots.
---

# Looking at the page headless

`google-chrome` is at `/usr/bin/google-chrome`. Every harness lives in the project folder and
needs `--allow-file-access-from-files` (without it the first `f.contentDocument` throws and the
harness dies silently, leaving its placeholder). Screenshots go to the scratchpad; read the PNG
to actually look at it.

## Smoke test

```
google-chrome --headless --allow-file-access-from-files --virtual-time-budget=90000 \
  --dump-dom "file://$PWD/debug-smoke.html"
```

With a smaller budget the output never arrives. **Known FAILs at HEAD, not regressions:** the
3 `[held]` checks (Inventory inert, Progress lead, Journal howto) and «the Knight moved along
the bar…» / «the Knight is on the bar…» (flaky, about 1 run in 3). Anything else that fails is
yours: compare with `git stash` if unsure.

## Screenshots

`debug.html` sets the prefs and opens the site in an iframe of the asked width; its header
comment lists the parameters (`w`, `h`, `top`, `lang`, `view`, `tab`, `foe`, `hash`, `ls`…).

```
google-chrome --headless --hide-scrollbars --allow-file-access-from-files \
  --virtual-time-budget=6000 --window-size=1440,988 --screenshot=<scratchpad>/x.png \
  "file://$PWD/debug.html?w=1440&h=900&view=..."
```

- **The bottom ~88 px of `--window-size` are always black**: add 88 to the height you need.
- **Below 500 px wide** the capture crops instead of reflowing: only through `debug.html?w=390`, never `--window-size=390,…`.
- **Tall iframes (≳2500 px) go black past the fold**: shift with `top=` (negative `marginTop`), `scrollTo` doesn't repaint.
- The README builds and their parameters: memory `readme-screenshots`.

## Mouse vs touch

Headless reports a coarse pointer, so the site takes its touch path. For hover, add
`--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4`
(needed by `debug-hover.html` and `debug.html?hover=`).

## Animations

Under `--virtual-time-budget` neither `requestAnimationFrame` nor CSS/Web Animations advance;
`setTimeout` does. To check an animation (the Knight's walk, a transition) drive Chrome in real
time over CDP (`--remote-debugging-port`, Node's WebSocket), modelled on `tools/trailer/render.js`.

## Other harnesses

`debug-overflow.html` (what spills past the width), `debug-benches.html` (`?seat=1`),
`debug-since.html`, `debug-walk.html`, `debug-map.html` (lock/sketch/unlock rooms),
`debug-hover.html` (with the mouse flags). See CLAUDE.md, "When you finish".

## Writing a harness

- Stub `prompt` in the iframe (`w.prompt = () => null`): it hangs `--dump-dom` forever.
- No top-level `const top`, `name`, `status`, `parent`, `self`, `length`: they collide with `window` and kill the script silently.
- Keep it inside the project folder: from outside, errors arrive as opaque «Script error.».
