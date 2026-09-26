/* js/app-knight.js — the Knight who walks the page: one sprite (css: .kn; the strips in
   assets/knight/, from tools/fetch-knight.js) that says where you are, the way his pin does on
   the game's map. He sits on the screen bar under the title of the tab you're on, on its bottom
   edge, and never leaves it: he is the bar's mark of the current tab (on a computer it draws no
   rule under it). When you change screens he gets up and runs along the bar to the new one, at a
   steady pace (design/00-system.md, Motion): never a slide; he only fades in on arriving, and out
   where the bar has no room for him (a phone). On the Map his pin stands by your bench
   (js/app-map.js draws that one) and, when a save moves the bench, the pin walks from the old
   one to the new one room by room, through the game's doors (js/rooms.js, DOORS), while the map
   is in view; and Your game's bench carries a still picture of him sitting (js/app-home.js,
   css .hmC-kn). With reduced motion he only stands or sits. Decorative for the page: hidden from screen
   readers and out of the tab order; the click (he focuses soul) is an easter egg.
   Shares HK.app (see js/app.js): App.knight.sync() after every render, App.knight.onSave()
   when the game's file changes underneath, App.knight.start() once, from js/app-boot.js. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const App = HK.app;
  const { el, track, prefs, savePrefs, load } = App;
  const R = HK.rooms, CH = HK.changes;

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
  const at = () => parseFloat(kn.style.translate) || 0;
  const place = (x) => { kn.style.translate = `${Math.round(x)}px 0`; };
  function stopWalk() { if (walk) { walk.cancel(); walk = null; } clip(''); }
  const after = (t) => new Promise((r) => setTimeout(r, t));

  /* Along the bar, from where he is to x: the run at its steady pace (--dur-run per 100 px),
     never shorter than a response. The style holds the destination and the animation covers the
     way there, so nothing jumps when it ends. */
  function runTo(x) {
    const from = at(), dx = x - from;
    if (!dx || still.matches) { place(x); return Promise.resolve(); }
    stopWalk();
    face(dx); clip('run'); place(x);
    const dur = Math.max(ms('--dur'), Math.abs(dx) * ms('--dur-run') / 100);
    walk = kn.animate([{ translate: `${from}px 0` }, { translate: `${x}px 0` }], { duration: dur, easing: 'linear' });
    return new Promise((r) => { walk.onfinish = () => { walk = null; clip(''); r(); }; walk.oncancel = r; });
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
  // The fewest rooms from one to the other through the doors, both ends included; or null.
  function doorsPath(from, to) {
    const back = { [from]: null }, queue = [from];
    while (queue.length) {
      const sc = queue.shift();
      if (sc === to) { const path = []; for (let c = to; c !== null; c = back[c]) path.unshift(c); return path; }
      for (const n of R.DOORS[sc] || []) if (!(n in back)) { back[n] = sc; queue.push(n); }
    }
    return null;
  }
  /* From the old bench to the new one, room by room: the bench's point, the rooms' centres, the
     other bench's point, at a steady pace (the whole way in 2 to 8 s), stepping his frames at
     --dur-step and turning where the way turns. The whole map first if either end is out of
     view. The pin is repainted with every render, so it's looked up again at every step; it's
     already painted at the new bench, where the walk ends. No path (Godhome, the White Palace:
     entered by dream), or reduced motion: he's simply there. Seen once per bench (prefs.walked). */
  function mapWalk(from, to) {
    walking = { from, to };
    const done = () => { walking = null; prefs.walked = to; savePrefs(); const pin = youPin(); if (pin) frame(pin, -1); };
    const path = doorsPath(from, to);
    const pts = path ? path.map((sc, i) => (i === 0 ? App.pgmBenchPoint(from) : i === path.length - 1 ? App.pgmBenchPoint(to) : App.pgmRoomPoint(sc))).filter(Boolean) : null;
    if (!pts || pts.length < 2 || still.matches) { done(); return; }
    if (!App.pgmSees(pts[0]) || !App.pgmSees(pts[pts.length - 1])) App.pgmFit();
    const segs = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); len += d; }
    const dur = Math.min(8000, Math.max(2000, (len / 4) * 1000)), t0 = performance.now();
    const step = (now) => {
      if (!walking || walking.to !== to) return;          // a newer walk took over
      const gone = Math.max(0, now - t0);                  // a frame's time can precede the walk's start
      const u = Math.min(1, gone / dur);
      let dist = u * len, i = 0;
      while (i < segs.length - 1 && dist > segs[i]) { dist -= segs[i]; i++; }
      const f = segs[i] ? Math.min(1, dist / segs[i]) : 1;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      const pin = youPin();
      if (pin) {
        pin.style.setProperty('--px', x.toFixed(3) + 'px'); pin.style.setProperty('--py', (-y).toFixed(3) + 'px');
        const art = pin.querySelector('.pgm-you-art');
        if (art) art.setAttribute('transform', pts[i + 1][0] < pts[i][0] ? 'scale(-1 1)' : '');
        frame(pin, Math.floor(gone / ms('--dur-step')) % 6);
      }
      if (u < 1 && !document.hidden) requestAnimationFrame(step); else done();
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
  App.knight = { start, sync, onSave, state };
})();
