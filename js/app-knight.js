/* js/app-knight.js — the Knight who walks the page: one sprite (css: .kn; the game's own clips,
   js/knight-moves.js and the strips in assets/knight/, from tools/extract-knight.py) that says where
   you are, the way his pin does on the game's map. He sits on the screen bar under the title of
   the tab you're on, on its bottom edge, and never leaves it: he is the bar's mark of the current
   tab (on a computer it draws no rule under it). When you change screens he gets off the bench,
   turns if he has to, runs along the bar to the new one at a steady pace (design/00-system.md,
   Motion; never a slide), skids to a stop, and sits again; he only fades in on arriving, and out
   where the bar has no room for him (a phone). While he rests he lives a little, as the game's
   Knight does on a bench: now and then he leans forward and back, or dozes off and sleeps until
   something happens (a tab change, a click, a save arriving), and on the Map tab he opens his map
   for a look. On the Map his pin stands by your bench (js/app-map.js draws that one) and, when a
   save moves the bench, the pin goes from the old one to the new one the way js/walk.js finds:
   on foot along the corridors the map draws, room to room through the game's doors, and by stag,
   tram or lift where the save has them and they're shorter, while the map is in view; and Your
   game's bench carries a still picture of him sitting (js/app-home.js, css .hmC-kn). With reduced
   motion he only sits or stands. Decorative for the page: hidden from screen readers and out of the
   tab order; the click (he focuses soul) is an easter egg, and it lasts what the build's Focus
   lasts: he gets up, gathers soul in the Focus's white light for heal.timePerFocus (the engine's:
   Quick Focus, Deep Focus; with Joni's Blessing nothing comes back), the mask comes back, and he sits
   again; with Shape of Unn he becomes the slug for that time (with Baldur Shell's shell and Spore
   Shroom's cloud, as the game draws them).
   Shares HK.app (see js/app.js): App.knight.sync() after every render, App.knight.onSave()
   when the game's file changes underneath, App.knight.start() once, from js/app-boot.js. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const App = HK.app;
  const { el, track, prefs, savePrefs, load } = App;
  const CH = HK.changes, WK = HK.walk, P = HK.progress, M = HK.KNIGHT.MOVES;

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // Below 900 px the bar is one line that slides (css): he isn't on it.
  const phone = matchMedia('(max-width: 899px)');

  const kn = document.createElement('button');
  kn.type = 'button'; kn.className = 'kn'; kn.tabIndex = -1;
  kn.setAttribute('aria-hidden', 'true');

  /* A duration or length from the tokens (css/tokens.css), as a number. */
  const ms = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  const after = (t) => new Promise((r) => setTimeout(r, t));

  /* ── Drawing: the game's clips ──
     Each move is a strip of equal cells (js/knight-moves.js: n, fps, w × h, his pivot at px, py, and
     where it loops from). He's drawn at --kn-bar for his standing height of STAND (the game's own
     pixels, 130 standing). Each cell's lowest pixel rests on the bar's bottom edge (its PAD of
     transparent margin below it), and his pivot's x is the spot under the tab's title: the
     transform-origin, so a mirror (.is-left) turns him on the spot and a change of clip keeps him
     there. A clip plays once (play, held on its last frame) or over and over (loop, from the clip's
     own loopStart on). */
  const STAND = 130, PAD = 2;
  let k = 0;             // page px per game px
  let move = '';         // the clip shown
  let x = 0;             // the spot: his pivot's x along the bar
  function show(name, i = 0) {
    const m = M[name];
    if (name !== move) {
      move = name;
      Object.assign(kn.style, { width: m.w * k + 'px', height: m.h * k + 'px', backgroundImage: `url(assets/knight/${name}.png)`,
        backgroundSize: `${m.n * m.w * k}px ${m.h * k}px`, bottom: -PAD * k + 'px', transformOrigin: `${m.px * k}px 50%` });
      place(x);
    }
    kn.style.backgroundPosition = `${-i * m.w * k}px 0`;
  }
  const place = (px) => { x = px; kn.style.translate = `${Math.round(px - (M[move] || M.idle).px * k)}px 0`; };
  // Where he is: mid-run the style already holds the destination, so the run's own frame.
  const at = () => (parseFloat(walk ? getComputedStyle(kn).translate : kn.style.translate) || 0) + (M[move] || M.idle).px * k;
  const face = (dx) => { if (dx) kn.classList.toggle('is-left', dx < 0); };
  const left = () => kn.classList.contains('is-left');
  /* The frames step as a Web Animation over background-position-x, steps(n, jump-none) from the
     first cell to the last (so the last is held, never an empty cell past it), one frame a 1/fps:
     like the run along the bar, it plays in the compositor. Its end is also taken on a timer of the
     same length (whichever comes first): under a headless browser's virtual time (the smoke test)
     the animations don't advance and nothing would ever finish. */
  let clip = null, clipRes = null;   // the clip's animation under way, and the play() waiting on it
  const stepping = (m, from, to, iterations, reverse) => kn.animate(
    [{ backgroundPositionX: `${-from * m.w * k}px` }, { backgroundPositionX: `${-to * m.w * k}px` }],
    { duration: (to - from + 1) / m.fps * 1000, easing: `steps(${to - from + 1}, jump-none)`, iterations, direction: reverse ? 'reverse' : 'normal', fill: 'forwards' });
  // When the animation ends, or its duration has passed: fn, once.
  const whenOver = (a, fn) => { const t = setTimeout(() => { if (clip === a) fn(); }, a.effect.getTiming().duration + 80); a.onfinish = () => { clearTimeout(t); if (clip === a) fn(); }; };
  function stopClip() {
    if (clip) { clip.onfinish = null; clip.cancel(); clip = null; }
    if (clipRes) { const r = clipRes; clipRes = null; r(); }
  }
  /* A clip once, held on its last frame (reverse: backwards, held on its first); resolves there, or
     at once when another clip takes over. */
  function play(name, reverse = false) {
    stopClip();
    const m = M[name], last = reverse ? 0 : m.n - 1;
    if (still.matches || m.n === 1) { show(name, last); return Promise.resolve(); }
    show(name, reverse ? m.n - 1 : 0);
    return new Promise((res) => {
      clipRes = res;
      const a = clip = stepping(m, 0, m.n - 1, 1, reverse);
      whenOver(a, () => { show(name, last); a.cancel(); clip = null; clipRes = null; res(); });
    });
  }
  /* A clip over and over, from its loopStart on after the first pass. */
  function loop(name) {
    stopClip();
    const m = M[name];
    show(name, 0);
    if (still.matches || m.n === 1) return;
    const section = () => { if (m.n - m.loop > 1) clip = stepping(m, m.loop, m.n - 1, Infinity, false); else { clip = null; show(name, m.loop); } };
    if (!m.loop) { section(); return; }
    const a = clip = stepping(m, 0, m.n - 1, 1, false);
    whenOver(a, () => { a.cancel(); section(); });
  }

  /* ── What he's doing ──
     pose: 'sit' (on the bench, sit-idle), 'asleep', 'map' (his map open) or 'stand'. A sequence
     (travel, life, focus) is a chain of clips; a new one cancels the old (gen), which lets go at
     its next step, and takes over from the pose the old one had reached (set before the clip that
     leaves a pose, so a half-played one is still undone). The state classes (.is-sit, .is-run,
     .is-focus, .is-left) say what he's at, for the smoke test and the css. */
  let pose = 'sit', gen = 0, busy = false;
  let perch = '';        // 'bar' while he's on it, '' while he isn't (a phone's bar has no room)
  let tabId = '';        // the tab he sits under, to run along the bar when it changes
  let walk = null;       // the run under way (an Animation), if any
  let focusing = false, lastFocus = 0;
  let fadeTimer = 0, lifeTimer = 0;
  const seat = () => { show('sit-idle'); pose = 'sit'; kn.classList.add('is-sit'); kn.classList.remove('is-run'); };
  // A sequence starts: the old one is let go of, and a run under way stops where he is.
  const begin = () => { const g = ++gen; busy = true; halt(); return () => g === gen && kn.isConnected; };
  // A sequence is over: his life goes on.
  const end = (ok) => { if (ok()) { busy = false; schedule(); } };
  /* Up from whatever he's at (asleep: waking first; the map: putting it away), standing. */
  async function rise(ok) {
    kn.classList.remove('is-sit');
    if (pose === 'asleep') { await play('wake-sit'); if (!ok()) return false; pose = 'sit'; }
    if (pose === 'map') { await play('map-close'); if (!ok()) return false; pose = 'sit'; }
    if (pose === 'sit') { await play('get-off'); if (!ok()) return false; }
    pose = 'stand';
    return true;
  }
  /* Down onto the bench, resting. Caught away from his tab (a click mid-run): he goes there
     instead, and sits down at the end of that. */
  async function settle(ok) {
    const tab = activeTab();
    if (tab && Math.abs(spotBy(tab) - x) > 1) { busy = false; travel(spotBy(tab)); return false; }
    await play('sit'); if (!ok()) return false;
    seat(); return true;
  }

  function stopWalk() { if (walk) { walk.cancel(); walk = null; } }
  function halt() { if (walk) { const p = at(); stopWalk(); place(p); } }
  /* Along the bar, from where he is to the spot: the run at its steady pace (--dur-run per 100 px),
     never shorter than a response from a standstill. The style holds the destination and the
     animation covers the way there, so nothing jumps when it ends. A new spot mid-run turns him
     from where he is, at the same pace. It's measured after the render a tab click sets off (sync
     comes after every render) and pinned to the timeline's time, so it never starts behind him. */
  function runTo(spot) {
    spot = Math.round(spot);
    return new Promise((r) => {
      const running = !!walk, from = at(), dx = spot - from;
      if (walk) { walk.cancel(); walk = null; }
      if (move !== 'run') loop('run');
      place(spot);
      if (!dx) { r(); return; }
      face(dx);
      const off = M.run.px * k, pace = Math.abs(dx) * ms('--dur-run') / 100;
      const w = walk = kn.animate([{ translate: `${from - off}px 0` }, { translate: `${spot - off}px 0` }], { duration: running ? pace : Math.max(ms('--dur'), pace), easing: 'linear' });
      w.startTime = document.timeline.currentTime;
      // Arrived, or its time has passed (a headless browser's virtual time: see whenOver).
      const over = () => { if (walk === w) { walk = null; w.cancel(); } r(); };
      const t = setTimeout(over, w.effect.getTiming().duration + 80);
      w.onfinish = () => { clearTimeout(t); over(); }; w.oncancel = () => { clearTimeout(t); r(); };
    });
  }
  /* The whole way to a new tab: up, turned, the run, the stop (a hop too short for one skips it),
     and down again. */
  async function travel(spot) {
    const ok = begin();
    if (still.matches) { stopClip(); place(spot); seat(); busy = false; return; }
    const dx = spot - at();
    kn.classList.add('is-run');              // on his way, until he sits (seat)
    const turning = dx && (dx < 0) !== left();
    if (pose !== 'stand') {
      face(dx);                              // seated, he turns towards where he's going before getting up
      if (!await rise(ok)) return;
    } else if (turning) {
      // Mid-run: the game turns the hero first and its Turn clip draws the swing, facing the new way.
      face(dx); await play('turn'); if (!ok()) return;
    }
    await runTo(spot); if (!ok()) return;
    if (Math.abs(dx) >= 40) { await play('run-stop'); if (!ok()) return; }
    if (!await settle(ok)) return;
    end(ok);
  }

  /* ── His life on the bench ──
     Every 15 to 25 s, with the page in view and no reduced motion: he leans forward for a look and
     sits back, or dozes off and sleeps until something happens, or on the Map tab opens his map,
     reads it, and puts it away. */
  function schedule() { clearTimeout(lifeTimer); lifeTimer = setTimeout(life, 15000 + Math.random() * 10000); }
  async function life() {
    if (document.hidden || still.matches || busy || pose !== 'sit' || perch !== 'bar') { if (pose === 'sit') schedule(); return; }
    const ok = begin();
    const r = Math.random();
    if (tabId === 'map' && r < 0.5) {
      pose = 'map';
      await play('map-open'); if (!ok()) return;
      await after(2500); if (!ok()) return;
      await play('map-close'); if (!ok()) return;
      seat();
    } else if (r < 0.7) {
      await play('sit-lean'); if (!ok()) return;
      await after(1800); if (!ok()) return;
      await play('sit-lean', true); if (!ok()) return;
      seat();
    } else {
      pose = 'asleep';
      await play('doze'); if (!ok()) return;
      show('asleep');
      busy = false;                        // asleep until something happens: no life scheduled
      return;
    }
    end(ok);
  }
  /* Something happened (a save arrived): asleep, he wakes. */
  async function wake() {
    if (pose !== 'asleep' || busy || still.matches) return;
    const ok = begin();
    await play('wake-sit'); if (!ok()) return;
    seat();
    end(ok);
  }

  /* ── Onto and off the bar ── */
  /* Onto the bar, at the spot the callback sets. Already there: just the spot (and a fade-out
     under way is called off). Otherwise, the first time or back from a phone's width: fading in. */
  function mount(box, spot) {
    clearTimeout(fadeTimer);
    if (kn.parentNode === box) { kn.classList.remove('is-out'); perch = 'bar'; spot(); return; }
    k = ms('--kn-bar') / STAND;
    gen++; busy = false; stopWalk(); stopClip();
    kn.classList.add('is-out');
    box.appendChild(kn);
    perch = 'bar';
    seat();
    spot();
    void kn.offsetWidth; kn.classList.remove('is-out');   // a flush in between, so the fade runs (as App's fadeIn)
    schedule();
  }
  /* Off the bar, fading out (a phone's width). */
  function unmount() {
    clearTimeout(fadeTimer); clearTimeout(lifeTimer);
    if (!kn.isConnected) { perch = ''; tabId = ''; return; }
    kn.classList.add('is-out');
    fadeTimer = setTimeout(() => { gen++; busy = false; stopWalk(); stopClip(); kn.remove(); perch = ''; tabId = ''; move = ''; }, ms('--dur-slow'));
  }

  /* ── The screen bar ── */
  const tabs = () => el.nav.querySelector('.nav-tabs');
  const activeTab = () => Array.from(el.nav.querySelectorAll('.nav-tabs > .nav-tab[aria-current="page"]')).find((a) => a.offsetParent !== null) || null;
  /* Under the middle of the tab's title (the word, not its number). */
  function spotBy(tab) {
    const lbl = tab.querySelector('.nav-lbl, .nav-long') || tab;
    return lbl.offsetLeft + lbl.offsetWidth / 2;
  }
  // Under the current tab: travelling there if the tab changed; otherwise left to what he's doing.
  function syncBar() {
    const tab = activeTab(), id = tab.dataset.value;
    mount(tabs(), () => {
      if (tabId && tabId !== id) travel(spotBy(tab));
      else if (!busy) place(spotBy(tab));
      tabId = id;
    });
  }

  /* The easter egg: a click and he focuses soul, as the game heals, for the build's own time. */
  async function focus() {
    if (!kn.isConnected || still.matches || focusing || performance.now() - lastFocus < 2000) return;
    lastFocus = performance.now(); focusing = true;
    track('knight');
    const ok = begin();
    kn.classList.add('is-focus'); kn.classList.remove('is-sit', 'is-run');
    try {
      if (!await rise(ok)) return;
      const st = App.sheet && App.sheet.stats;
      const can = !st || st['heal.canFocus'].value !== false;
      const secs = can && st ? st['heal.timePerFocus'].value : 0.4;
      const charms = App.state.charms || [];
      if (charms.includes('unn')) {
        await play('slug-up'); if (!ok()) return;
        loop('slug-idle' + (charms.includes('baldur') && charms.includes('spore') ? '-both' : charms.includes('baldur') ? '-shell' : charms.includes('spore') ? '-spore' : ''));
        await after(secs * 1000); if (!ok()) return;
        await play('slug-down'); if (!ok()) return;
      } else {
        loop('focus');
        await after(secs * 1000); if (!ok()) return;
        if (can) { await play('focus-get'); if (!ok()) return; }
        await play('focus-end'); if (!ok()) return;
      }
      kn.classList.remove('is-focus');
      if (!await settle(ok)) return;
      end(ok);
    } finally {
      kn.classList.remove('is-focus'); focusing = false;
    }
  }

  /* ── The Map: his pin by your bench, and its walk to a new one ──
     The pin is the map's own Knight (js/app-map.js, youSvg): he keeps his seat on the bar. */
  const mapBox = () => el.pg.querySelector('.pgm-box');
  const youPin = () => el.pg.querySelector('.pgm-you');
  let walking = null;    // the walk under way, { from, to, legs, at (where it has him) }
  let toWalk = null;     // a bench change waiting for the map to be in view
  let waits = null;      // the walk that waits, with its way: asked at every render, found once
  // The game saved at another bench: the pin's walk, when the map is in view. And he wakes, if asleep.
  function onSave(was) {
    waits = null;
    if (was && App.progress.bench && was !== App.progress.bench) toWalk = { from: was, to: App.progress.bench };
    wake();
  }
  // The bench of the save before (hollow.prev, js/saves.js), or ''.
  function prevBench() {
    try { const p = JSON.parse(load('hollow.prev') || 'null'); return p && p.snap ? CH.fromSnap(p.snap).progress.bench : ''; } catch (e) { return ''; }
  }
  // The walk that waits for the map to be in view, { from, to, legs (null: no way) }, or null.
  function waiting() {
    let w = toWalk;
    // A bench change the page wasn't open for: once, from the save before.
    if (!w) { const from = prevBench(), to = App.progress.bench; if (from && to && from !== to && prefs.walked !== to) w = { from, to }; }
    if (!w) return (waits = null);
    if (!waits || waits.from !== w.from || waits.to !== w.to) waits = { from: w.from, to: w.to, legs: wayTo(w.from, w.to) };
    return waits;
  }
  // The map in view: a bench change plays as the pin's walk, once.
  function syncMap() {
    if (walking || !youPin()) return;
    const w = waiting(); toWalk = waits = null;
    if (w) mapWalk(w.from, w.to, w.legs);
  }
  /* Where the map paints his pin while he isn't at your bench (js/app-map.js, youSvg): where the
     walk has him, or at the old bench while a walk waits for the map to be in view (painted at
     the new one, he'd be seen there before setting off). null: at your bench. */
  function pinAt() {
    if (walking) return walking.at;
    if (still.matches) return null;
    const w = waiting();
    return w && w.legs ? w.legs[0].pts[0] : null;
  }
  /* The pin's svg (js/app-map.js, youSvg): a clip's cell at UNIT px a map unit, his feet (the cell's
     lowest pixel) on the point and his pivot's x over it; standing (idle's first frame) or a frame
     of his run. */
  const UNIT = 100;
  function pinSvg(name, i) {
    const m = M[name];
    return `<svg class="pgm-atlas" x="${-m.px / UNIT}" y="${-(m.h - PAD) / UNIT}" width="${m.w / UNIT}" height="${m.h / UNIT}" viewBox="${i * m.w} 0 ${m.w} ${m.h}"><image href="assets/knight/${name}.png" width="${m.n * m.w}" height="${m.h}"/></svg>`;
  }
  function frame(pin, name, i) {
    const svg = pin.querySelector('svg'), img = svg && svg.querySelector('image');
    if (!img) return;
    const m = M[name];
    if (img.getAttribute('href') !== `assets/knight/${name}.png`) {
      img.setAttribute('href', `assets/knight/${name}.png`); img.setAttribute('width', m.n * m.w); img.setAttribute('height', m.h);
      svg.setAttribute('x', -m.px / UNIT); svg.setAttribute('y', -(m.h - PAD) / UNIT); svg.setAttribute('width', m.w / UNIT); svg.setAttribute('height', m.h / UNIT);
    }
    svg.setAttribute('viewBox', `${i * m.w} 0 ${m.w} ${m.h}`);
  }
  // The run's frame at a moment of it: its start, then the loop.
  const runFrame = (t) => { const m = M.run, i = Math.floor(t / 1000 * m.fps); return i < m.n ? i : m.loop + (i - m.loop) % (m.n - m.loop); };
  /* The way from one bench to the other: js/walk.js (find), on the ground the map draws, through
     the game's doors, and by the rides the save has: the stag stations it has opened (the Stag
     Nest's and the Hidden Station's the site doesn't follow: only with no save), the tram lines
     it has ridden (with the Tram Pass) and the City's two lifts, always; with no save (free
     mode, everything open) every ride. The Map's "How to get there" (js/app-map.js) asks for the
     way to a point in a room (end), not a bench, as one line of points (route). */
  const STAG_ID = { Town: 'dirtmouth-stag', Crossroads_47: 'crossroads-stag', Fungus1_16_alt: 'greenpath-stag', Fungus2_02: 'queens-station-stag',
    Fungus3_40: 'queens-gardens-stag', Ruins1_29: 'city-storerooms-stag', Ruins2_08: 'kings-station-stag', RestingGrounds_09: 'resting-grounds-stag',
    Deepnest_09: 'distant-village-stag' };
  let ridesSet = null;   // debug-walk.html picks the rides by hand (setRides); null, the save's
  function rides() {
    if (ridesSet) return ridesSet;
    const free = !App.activeSlot(), pr = App.progress;
    const stags = WK.RIDES.stag.stops.filter((pin) => free || (STAG_ID[pin] && P.hasFound(pr, STAG_ID[pin])));
    const trams = Object.entries(WK.RIDES.tram.lines).filter(([line]) => free || P.has(pr, 'tram-' + line)).map(([, stops]) => stops);
    return { stags, trams, lifts: Object.values(WK.RIDES.lift.lines) };
  }
  const wayTo = (from, to, end) => WK.find(from, to, { point: App.pgmBenchPoint, end, ...rides() });
  const route = (from, to, end) => { const legs = wayTo(from, to, end); return legs ? legs.flatMap((l) => l.pts) : null; };
  /* From the old bench to the new one along the way, leg by leg: on foot at PACE map units a
     second, stepping his run's frames at the clip's own pace and turning where the way turns; on
     the tram or the lift standing still, carried at the ride's own speed (RIDE: units a second)
     with a stop at each end; by stag, fading out at the one station and in at the other (STAG_S in
     all, and no way between: the game's ride is instant). The whole way is fitted to 2 to 8 s,
     every leg alike. The view stays as you have it (never zoomed or moved for him): out of it,
     he goes unseen. The pin is repainted with every render, so it's looked up again at every
     step, and every render paints it where the walk has him (pinAt). No way (Godhome, the White
     Palace: entered by dream), or reduced motion: he's simply there. Seen once per bench
     (prefs.walked). */
  const PACE = 4;
  const RIDE = { tram: { v: 8, stop: 0.5 }, lift: { v: 3, stop: 0.3 } };
  const STAG_S = 1.4;
  function mapWalk(from, to, legs) {
    walking = { from, to, legs, at: null };
    const done = () => { walking = null; prefs.walked = to; savePrefs(); const pin = youPin(); if (pin) { frame(pin, 'idle', 0); pin.style.opacity = ''; } };
    if (!legs || still.matches) { done(); return; }
    walking.at = legs[0].pts[0];
    for (const l of legs) {
      l.segs = []; l.len = 0;
      for (let i = 1; i < l.pts.length; i++) { const d = Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]); l.segs.push(d); l.len += d; }
      l.dur = Math.max(0.001, l.kind === 'walk' ? l.len / PACE : l.kind === 'stag' ? STAG_S : l.len / RIDE[l.kind].v + RIDE[l.kind].stop);
    }
    const total = legs.reduce((s, l) => s + l.dur, 0), kf = (Math.min(8, Math.max(2, total)) / total) * 1000;   // ms a second of the way
    let end = 0;
    for (const l of legs) { l.t0 = end; l.ms = l.dur * kf; end += l.ms; }
    const t0 = performance.now();
    const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const step = (now) => {
      if (!walking || walking.to !== to) return;          // a newer walk took over
      const gone = Math.max(0, now - t0);                  // a frame's time can precede the walk's start
      const l = legs.find((x) => gone < x.t0 + x.ms) || legs[legs.length - 1];
      const f = Math.min(1, (gone - l.t0) / l.ms);         // how far along the leg
      let at, dx = 0, run = -1, opacity = 1;
      if (l.kind === 'walk') {
        let d = f * l.len, i = 0;
        while (i < l.segs.length - 1 && d > l.segs[i]) { d -= l.segs[i]; i++; }
        at = lerp(l.pts[i], l.pts[i + 1], l.segs[i] ? Math.min(1, d / l.segs[i]) : 1);
        dx = l.pts[i + 1][0] - l.pts[i][0];
        run = runFrame(gone);
      } else if (l.kind === 'stag') {
        at = l.pts[f < 0.5 ? 0 : 1];
        opacity = f < 0.3 ? 1 - f / 0.3 : f < 0.7 ? 0 : (f - 0.7) / 0.3;
      } else {
        const stop = RIDE[l.kind].stop / l.dur;            // the stop at each end, as a share of the leg
        at = lerp(l.pts[0], l.pts[1], Math.min(1, Math.max(0, (f - stop / 2) / (1 - stop))));
        if (l.kind === 'tram') dx = l.pts[1][0] - l.pts[0][0];
      }
      walking.at = at;
      const pin = youPin();
      if (pin) {
        pin.style.setProperty('--px', at[0].toFixed(3) + 'px'); pin.style.setProperty('--py', (-at[1]).toFixed(3) + 'px');
        pin.style.opacity = opacity < 1 ? opacity.toFixed(2) : '';
        const art = pin.querySelector('.pgm-you-art');
        if (art && dx) art.setAttribute('transform', dx < 0 ? 'scale(-1 1)' : '');
        if (run >= 0) frame(pin, 'run', run); else frame(pin, 'idle', 0);
      }
      if (gone < end && !document.hidden) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  }

  /* ── What's in view: the map, whose pin's walk waits for it ──
     How much of the map's box is in view, and whether that's enough (in at 60%, out under 10%:
     no flicker at the edge). The box is repainted with its screen, so it's looked up again (sync). */
  let mapNode = null, mapSeen = 0, mapOn = false;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.target === mapNode) mapSeen = e.intersectionRatio;
    decide();
  }, { threshold: [0, 0.1, 0.6, 1] });
  function watchMap() {
    const node = mapBox();
    if (node === mapNode) return;
    if (mapNode) io.unobserve(mapNode);
    mapNode = node; mapSeen = 0;
    if (node) io.observe(node);
  }
  function decide() {
    if (document.hidden) return;
    mapOn = mapSeen >= 0.6 ? true : mapSeen <= 0.1 ? false : mapOn;
    if (mapOn) syncMap();                    // the map in view: the pin's walk, if one waits
    if (activeTab() && !phone.matches) syncBar(); else unmount();
  }

  /* ── The whole ── */
  function sync() {
    if (document.hidden) return;             // he catches up when the tab comes back (visibilitychange)
    watchMap();
    decide();
  }
  function start() {
    kn.addEventListener('click', focus);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { stopWalk(); clearTimeout(lifeTimer); } else { sync(); if (pose === 'sit') schedule(); } });
    // The bar reflows (the window resized): back under his tab, where he is.
    if (window.ResizeObserver) {
      new ResizeObserver(() => { if (perch === 'bar' && !walk && !busy) { const tab = activeTab(); if (tab) place(spotBy(tab)); } }).observe(tabs());
    }
    still.addEventListener('change', () => { gen++; busy = false; stopWalk(); stopClip(); if (perch === 'bar') { seat(); const tab = activeTab(); if (tab) place(spotBy(tab)); } sync(); });
    phone.addEventListener('change', sync);
    sync();
  }

  // Where he is and whether the map is in view, for the smoke test and the debug pages.
  const state = () => ({ perch, tabId, pose, move, busy, mapSeen, mapOn, cls: kn.className, walking });
  // For debug-walk.html: a walk under way called off (the pin stays where it is until a repaint), and the rides chosen by hand.
  const cancel = () => { walking = null; toWalk = waits = null; };
  const setRides = (r) => { ridesSet = r; };
  App.knight = { start, sync, onSave, pinAt, pinSvg, state, route, way: wayTo, cancel, setRides };
})();
