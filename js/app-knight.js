/* js/app-knight.js — the Knight who walks the page: one sprite (css: .kn; the strips in
   assets/knight/, from tools/fetch-knight.js) that says where you are, the way his pin does on
   the game's map. He sits on the screen bar under the title of the tab you're on, on its bottom
   edge, and never leaves it: he is the bar's mark of the current tab (on a computer it draws no
   rule under it). When you change screens he gets up and runs along the bar to the new one, at a
   steady pace (design/00-system.md, Motion): never a slide; he only fades in on arriving, and out
   where the bar has no room for him (a phone). On the Map his pin stands by your bench
   (js/app-map.js draws that one) and, when a save moves the bench, the pin walks from the old
   one to the new one door to door, the shortest way through the game's doors (js/rooms.js,
   DOORS), while the map is in view; and Your game's bench carries a still picture of him sitting (js/app-home.js,
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
  /* The shortest way from one bench to the other, by the map's distance, through the doors
     (js/rooms.js, DOORS; each on its room's edge, js/app-map.js): from the bench to a door of its
     room, across it (its two sides are one point, or near enough), door to door inside each room,
     and from a door of the other room to its bench. Dijkstra over the doors (under 900; a plain
     scan for the nearest is enough). A door with no point on the map (the White Palace, which the
     map doesn't draw) is never nearer than one with. → the way's points, both benches included,
     the two sides of each door as one; or null (no way, or a bench with no point). */
  function doorsRoute(from, to) {
    const pa = App.pgmBenchPoint(from), pb = App.pgmBenchPoint(to);
    if (!pa || !pb || !R.DOORS[from] || !R.DOORS[to]) return null;
    const split = (n) => { const i = n.indexOf('['); return [n.slice(0, i), n.slice(i + 1, -1)]; };
    const at = { S: pa, E: pb };                       // a node's point: 'S', 'E', or 'scene[door]'
    const point = (n) => (n in at ? at[n] : (at[n] = (([sc, d]) => App.pgmDoorPoint(sc, d, R.DOORS[sc][d][0]))(split(n))));
    const dist = (p, q) => (p && q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : Infinity);
    const next = (n) => {
      if (n === 'S') return Object.keys(R.DOORS[from]).map((d) => `${from}[${d}]`);
      if (n === 'E') return [];
      const [sc, d] = split(n), [b, e] = R.DOORS[sc][d], out = [`${b}[${e}]`];
      for (const x of Object.keys(R.DOORS[sc])) if (x !== d) out.push(`${sc}[${x}]`);
      if (sc === to) out.push('E');
      return out;
    };
    const cost = { S: 0 }, back = {}, seen = new Set(), open = ['S'];
    while (open.length) {
      let k = 0;
      for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[k]]) k = i;
      const n = open.splice(k, 1)[0];
      if (seen.has(n)) continue;
      seen.add(n);
      if (n === 'E') break;
      for (const m of next(n)) {
        if (seen.has(m)) continue;
        const c = cost[n] + dist(point(n), point(m));
        if (!(m in cost) || c < cost[m]) { cost[m] = c; back[m] = n; open.push(m); }
      }
    }
    if (!('E' in back) || cost.E === Infinity) return null;
    const pts = [];
    for (let n = 'E'; n !== undefined; n = back[n]) { const p = point(n); if (p && !(pts.length && dist(p, pts[0]) < 0.02)) pts.unshift(p); }
    return pts;
  }
  /* From the old bench to the new one along doorsRoute, at a steady pace (the whole way in 2 to
     8 s), stepping his frames at --dur-step and turning where the way turns. The view stays as
     you have it (never zoomed or moved for him): out of it, he walks unseen. The pin is repainted
     with every render, so it's looked up again at every step; it's already painted at the new
     bench, where the walk ends. No way (Godhome, the White Palace: entered by dream), or reduced
     motion: he's simply there. Seen once per bench (prefs.walked). */
  function mapWalk(from, to) {
    walking = { from, to, pts: null };
    const done = () => { walking = null; prefs.walked = to; savePrefs(); const pin = youPin(); if (pin) frame(pin, -1); };
    const pts = walking.pts = doorsRoute(from, to);
    if (!pts || pts.length < 2 || still.matches) { done(); return; }
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
