/* js/app-knight.js — the Knight who walks the page: one sprite (css: .kn; the strips in
   assets/knight/, from tools/fetch-knight.js) that says where you are, the way his pin does on
   the game's map. He sits on the screen bar under the title of the tab you're on, on its bottom
   edge, and never leaves it: he is the bar's mark of the current tab (on a computer it draws no
   rule under it). When you change screens he gets up and runs along the bar to the new one, at a
   steady pace (design/00-system.md, Motion): never a slide; he only fades in on arriving, and out
   where the bar has no room for him (a phone). On the Map his pin stands by your bench
   (js/app-map.js draws that one) and, when a save moves the bench, the pin goes from the old
   one to the new one the way js/walk.js finds: on foot along the corridors the map draws, room
   to room through the game's doors, and by stag, tram or lift where the save has them and
   they're shorter, while the map is in view; and Your game's bench carries a still picture of him sitting (js/app-home.js,
   css .hmC-kn). With reduced motion he only stands or sits. Decorative for the page: hidden from screen
   readers and out of the tab order; the click (he focuses soul) is an easter egg.
   Shares HK.app (see js/app.js): App.knight.sync() after every render, App.knight.onSave()
   when the game's file changes underneath, App.knight.start() once, from js/app-boot.js. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const App = HK.app;
  const { el, track, prefs, savePrefs, load } = App;
  const CH = HK.changes, WK = HK.walk, P = HK.progress;

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // Below 900 px the bar spreads six tabs over the width: no gap for him beside a tab (css).
  const phone = matchMedia('(max-width: 899px)');

  const kn = document.createElement('button');
  kn.type = 'button'; kn.className = 'kn'; kn.tabIndex = -1;
  kn.setAttribute('aria-hidden', 'true');

  /* A duration from the tokens (css/tokens.css), in ms. */
  const ms = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

  let perch = '';        // 'bar' while he's on it, '' while he isn't (a phone's bar has no room)
  let tabId = '';        // the tab he sits under, to run along the bar when it changes
  let walk = null;       // the run under way (an Animation), if any
  let focusing = false, lastFocus = 0;
  let fadeTimer = 0;

  const clip = (c) => { kn.classList.toggle('is-run', c === 'run'); kn.classList.toggle('is-sit', c === 'sit'); };
  const face = (dx) => { if (dx) kn.classList.toggle('is-left', dx < 0); };
  // Where he is: mid-run the style already holds the destination, so the run's own frame.
  const at = () => parseFloat(walk ? getComputedStyle(kn).translate : kn.style.translate) || 0;
  const place = (x) => { kn.style.translate = `${Math.round(x)}px 0`; };
  let pending = 0;       // a run waiting for its frame (runTo)
  function stopWalk() { cancelAnimationFrame(pending); if (walk) { walk.cancel(); walk = null; } clip(''); }
  const after = (t) => new Promise((r) => setTimeout(r, t));

  /* Along the bar, from where he is to x: the run at its steady pace (--dur-run per 100 px),
     never shorter than a response from a standstill. The style holds the destination and the
     animation covers the way there, so nothing jumps when it ends. A new tab mid-run turns him
     from where he is, at the same pace. It starts on the next frame, pinned to that frame's time:
     the render a tab click sets off keeps the main thread busy while the old run goes on in the
     compositor, and a run measured before it would start behind him (he'd step back). */
  function runTo(x) {
    x = Math.round(x);                         // as place() leaves it: no sub-pixel run on the spot
    if (still.matches) { stopWalk(); place(x); return Promise.resolve(); }
    cancelAnimationFrame(pending);
    return new Promise((r) => { pending = requestAnimationFrame(() => {
      const running = !!walk, from = at(), dx = x - from;
      stopWalk(); place(x);
      if (!dx) { r(); return; }
      face(dx); clip('run');
      const pace = Math.abs(dx) * ms('--dur-run') / 100;
      walk = kn.animate([{ translate: `${from}px 0` }, { translate: `${x}px 0` }], { duration: running ? pace : Math.max(ms('--dur'), pace), easing: 'linear' });
      walk.startTime = document.timeline.currentTime;
      walk.onfinish = () => { walk = null; clip(''); r(); }; walk.oncancel = r;
    }); });
  }

  /* Onto the bar, at the spot the callback sets. Already there: just the spot (and a fade-out
     under way is called off). Otherwise, the first time or back from a phone's width: fading in. */
  function mount(box, spot) {
    clearTimeout(fadeTimer);
    if (kn.parentNode === box) { kn.classList.remove('is-out'); perch = 'bar'; spot(); return; }
    stopWalk();
    kn.classList.add('is-out');
    box.appendChild(kn);
    perch = 'bar';
    spot();
    void kn.offsetWidth; kn.classList.remove('is-out');   // a flush in between, so the fade runs (as App's fadeIn)
  }
  /* Off the bar, fading out (a phone's width). */
  function unmount() {
    clearTimeout(fadeTimer);
    if (!kn.isConnected) { perch = ''; tabId = ''; return; }
    kn.classList.add('is-out');
    fadeTimer = setTimeout(() => { stopWalk(); kn.remove(); perch = ''; tabId = ''; }, ms('--dur-slow'));
  }

  /* ── The screen bar ── */
  const tabs = () => el.nav.querySelector('.nav-tabs');
  const activeTab = () => Array.from(el.nav.querySelectorAll('.nav-tabs > .nav-tab[aria-current="page"]')).find((a) => a.offsetParent !== null) || null;
  /* Under the middle of the tab's title (the word, not its number), on the bar's bottom edge. */
  function spotBy(tab) {
    const lbl = tab.querySelector('.nav-lbl, .nav-long') || tab;
    return lbl.offsetLeft + lbl.offsetWidth / 2 - kn.offsetWidth / 2;
  }
  // Under the current tab: running there if the tab changed, sitting once he's there.
  function syncBar() {
    const tab = activeTab(), id = tab.dataset.value;
    mount(tabs(), () => {
      if (focusing) return;                    // he'll take his spot once he's done focusing
      if (tabId && tabId !== id) runTo(spotBy(tab)).then(() => { if (!walk && !focusing) clip('sit'); });
      else if (!walk) { place(spotBy(tab)); clip('sit'); }
      tabId = id;
    });
  }

  /* The easter egg: a click and he focuses soul, as the game heals: he gets up and stands still
     while a white light swells around him and fades (css: .is-focus, --dur-flash), then sits
     again. */
  async function focus() {
    if (!kn.isConnected || still.matches || focusing || performance.now() - lastFocus < 2000) return;
    lastFocus = performance.now(); focusing = true;
    stopWalk();                              // a run under way ends; sync() puts him in his place after
    clip(''); kn.classList.add('is-focus');
    track('knight');
    await after(ms('--dur-flash'));
    kn.classList.remove('is-focus'); focusing = false;
    clip('sit'); sync();
  }

  /* ── The Map: his pin by your bench, and its walk to a new one ──
     The pin is the map's own Knight (js/app-map.js, youSvg): he keeps his seat on the bar. */
  const mapBox = () => el.pg.querySelector('.pgm-box');
  const youPin = () => el.pg.querySelector('.pgm-you');
  let walking = null;    // the walk under way, { from, to }
  let toWalk = null;     // a bench change waiting for the map to be in view
  // The game saved at another bench: the pin's walk, when the map is in view.
  function onSave(was) {
    if (was && App.progress.bench && was !== App.progress.bench) toWalk = { from: was, to: App.progress.bench };
  }
  // The bench of the save before (hollow.prev, js/saves.js), or ''.
  function prevBench() {
    try { const p = JSON.parse(load('hollow.prev') || 'null'); return p && p.snap ? CH.fromSnap(p.snap).progress.bench : ''; } catch (e) { return ''; }
  }
  // The map in view: a bench change plays as the pin's walk, once.
  function syncMap() {
    if (walking || !youPin()) return;
    let w = toWalk; toWalk = null;
    // A bench change the page wasn't open for: once, from the save before.
    if (!w) { const from = prevBench(), to = App.progress.bench; if (from && to && from !== to && prefs.walked !== to) w = { from, to }; }
    if (w) mapWalk(w.from, w.to);
  }
  /* His run's frames through the pin's svg (js/app-map.js, youSvg), or standing. */
  function frame(pin, i) {
    const svg = pin.querySelector('svg'), img = svg && svg.querySelector('image');
    if (!img) return;
    const run = i >= 0;
    if (img.getAttribute('href') !== (run ? 'assets/knight/run.png' : 'assets/knight/idle.png')) {
      img.setAttribute('href', run ? 'assets/knight/run.png' : 'assets/knight/idle.png');
      img.setAttribute('width', run ? '624' : '104');
    }
    svg.setAttribute('viewBox', `${run ? i * 104 : 0} 0 104 140`);
  }
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
     second, stepping his run's frames at --dur-step and turning where the way turns; on the tram
     or the lift standing still, carried at the ride's own speed (RIDE: units a second) with a
     stop at each end; by stag, fading out at the one station and in at the other (STAG_S in
     all, and no way between: the game's ride is instant). The whole way is fitted to 2 to 8 s,
     every leg alike. The view stays as you have it (never zoomed or moved for him): out of it,
     he goes unseen. The pin is repainted with every render, so it's looked up again at every
     step; it's already painted at the new bench, where the walk ends. No way (Godhome, the White
     Palace: entered by dream), or reduced motion: he's simply there. Seen once per bench
     (prefs.walked). */
  const PACE = 4;
  const RIDE = { tram: { v: 8, stop: 0.5 }, lift: { v: 3, stop: 0.3 } };
  const STAG_S = 1.4;
  function mapWalk(from, to) {
    walking = { from, to, legs: null };
    const done = () => { walking = null; prefs.walked = to; savePrefs(); const pin = youPin(); if (pin) { frame(pin, -1); pin.style.opacity = ''; } };
    const legs = walking.legs = wayTo(from, to);
    if (!legs || still.matches) { done(); return; }
    for (const l of legs) {
      l.segs = []; l.len = 0;
      for (let i = 1; i < l.pts.length; i++) { const d = Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]); l.segs.push(d); l.len += d; }
      l.dur = Math.max(0.001, l.kind === 'walk' ? l.len / PACE : l.kind === 'stag' ? STAG_S : l.len / RIDE[l.kind].v + RIDE[l.kind].stop);
    }
    const total = legs.reduce((s, l) => s + l.dur, 0), k = (Math.min(8, Math.max(2, total)) / total) * 1000;   // ms a second of the way
    let end = 0;
    for (const l of legs) { l.t0 = end; l.ms = l.dur * k; end += l.ms; }
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
        run = Math.floor(gone / ms('--dur-step')) % 6;
      } else if (l.kind === 'stag') {
        at = l.pts[f < 0.5 ? 0 : 1];
        opacity = f < 0.3 ? 1 - f / 0.3 : f < 0.7 ? 0 : (f - 0.7) / 0.3;
      } else {
        const stop = RIDE[l.kind].stop / l.dur;            // the stop at each end, as a share of the leg
        at = lerp(l.pts[0], l.pts[1], Math.min(1, Math.max(0, (f - stop / 2) / (1 - stop))));
        if (l.kind === 'tram') dx = l.pts[1][0] - l.pts[0][0];
      }
      const pin = youPin();
      if (pin) {
        pin.style.setProperty('--px', at[0].toFixed(3) + 'px'); pin.style.setProperty('--py', (-at[1]).toFixed(3) + 'px');
        pin.style.opacity = opacity < 1 ? opacity.toFixed(2) : '';
        const art = pin.querySelector('.pgm-you-art');
        if (art && dx) art.setAttribute('transform', dx < 0 ? 'scale(-1 1)' : '');
        frame(pin, run);
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
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopWalk(); else sync(); });
    // The bar reflows (the window resized): back under his tab, without running.
    if (window.ResizeObserver) {
      new ResizeObserver(() => { if (perch === 'bar' && !walk && !focusing) { const tab = activeTab(); if (tab) place(spotBy(tab)); } }).observe(tabs());
    }
    still.addEventListener('change', () => { stopWalk(); sync(); });
    phone.addEventListener('change', sync);
    sync();
  }

  // Where he is and whether the map is in view, for the smoke test and the debug pages.
  const state = () => ({ perch, tabId, mapSeen, mapOn, cls: kn.className, walking });
  // For debug-walk.html: a walk under way called off (the pin stays where it is until a repaint), and the rides chosen by hand.
  const cancel = () => { walking = null; toWalk = null; };
  const setRides = (r) => { ridesSet = r; };
  App.knight = { start, sync, onSave, state, route, way: wayTo, cancel, setRides };
})();
