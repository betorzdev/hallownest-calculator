/* js/app-knight.js — the Knight who walks the page: one sprite (css: .kn; the strips in
   assets/knight/, from tools/fetch-knight.js) that says where you are, the way his pin does on
   the game's map. He sits on the screen bar under the title of the tab you're on, on its rule,
   and when you change screens he gets up and runs along the bar to the new one; on Your game
   he sits on his bench under the area's name, and gets up when the game saves; on the Map he
   stands by your bench (js/app-map.js draws that one) and, when a save moves the bench, walks
   from the old one to the new one room by room, through the game's doors (js/rooms.js, DOORS);
   and when the footer comes into view he strolls along its top rule, its floor.
   He has one line at a time (a perch): his bench when its card is in view, else the map when
   it is, else the floor when the footer is, else the bar. He walks along a line and fades
   between lines (design/00-system.md, Motion): never a slide.
   With reduced motion he only stands or sits, wherever he is. Decorative for the page: hidden
   from screen readers and out of the tab order; the click (he focuses soul) is an easter egg.
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
  const DWELL = 1500;    // once on a line, he stays at least this long before another calls him

  let perch = '';        // the line he's on: 'bar', 'bench', 'floor', 'map' (the pin there is him), or '' (nowhere)
  let tabId = '';        // the tab he sits under, to run along the bar when it changes
  let walk = null;       // the run under way (an Animation), if any
  let seq = 0;           // the sequence playing (getting up, a stroll); a new one or a repaint cancels it
  let focusing = false, lastFocus = 0;
  let fadeTimer = 0, lastSwitch = 0, decideTimer = 0;

  const clip = (c) => { kn.classList.toggle('is-run', c === 'run'); kn.classList.toggle('is-sit', c === 'sit'); };
  const face = (dx) => { if (dx) kn.classList.toggle('is-left', dx < 0); };
  const at = () => parseFloat(kn.style.translate) || 0;
  const place = (x) => { kn.style.translate = `${Math.round(x)}px 0`; };
  function stopWalk() { if (walk) { walk.cancel(); walk = null; } clip(''); }
  const after = (t) => new Promise((r) => setTimeout(r, t));

  /* Along the line he's on, from where he is to x: the run at its steady pace (--dur-run per
     100 px), never shorter than a response; or, given a pace (ms per px), at that one. The
     style holds the destination and the animation covers the way there, so nothing jumps when
     it ends. */
  function runTo(x, perPx) {
    const from = at(), dx = x - from;
    if (!dx || still.matches) { place(x); return Promise.resolve(); }
    stopWalk();
    face(dx); clip('run'); place(x);
    const dur = Math.max(ms('--dur'), Math.abs(dx) * (perPx || ms('--dur-run') / 100));
    walk = kn.animate([{ translate: `${from}px 0` }, { translate: `${x}px 0` }], { duration: dur, easing: 'linear' });
    return new Promise((r) => { walk.onfinish = () => { walk = null; clip(''); r(); }; walk.oncancel = r; });
  }

  /* Onto a line (box), at the spot the callback sets. Already there: just the spot. From another
     line: he fades out where he is and in where he goes. Back onto his own line after a repaint
     took it from under him: silently. The first time: fading in. */
  function mount(box, where, spot) {
    if (kn.parentNode === box) { spot(); return; }
    clearTimeout(fadeTimer);
    const settle = (fade) => {
      seq++; stopWalk();
      kn.classList.toggle('is-out', fade);
      box.appendChild(kn);
      if (perch !== where) lastSwitch = performance.now();
      perch = where;
      spot();
      if (fade) { void kn.offsetWidth; kn.classList.remove('is-out'); }   // a flush in between, so the fade runs (as App's fadeIn)
    };
    if (!kn.isConnected) settle(perch !== where);
    else { kn.classList.add('is-out'); fadeTimer = setTimeout(() => settle(true), ms('--dur-slow')); }
  }
  /* Off the page (fading out), to nowhere or to the map, where his pin stands for him. */
  function unmount(where = '') {
    clearTimeout(fadeTimer);
    if (perch !== where) lastSwitch = performance.now();
    if (!kn.isConnected) { perch = where; tabId = ''; return; }
    kn.classList.add('is-out');
    fadeTimer = setTimeout(() => { seq++; stopWalk(); kn.remove(); perch = where; tabId = ''; }, ms('--dur-slow'));
  }

  /* ── The screen bar ── */
  const tabs = () => el.nav.querySelector('.nav-tabs');
  const activeTab = () => Array.from(el.nav.querySelectorAll('.nav-tabs > .nav-tab[aria-current="page"]')).find((a) => a.offsetParent !== null) || null;
  /* Under the middle of the tab's title (the word, not its number), on its rule. */
  function spotBy(tab) {
    const lbl = tab.querySelector('.nav-lbl, .nav-long') || tab;
    return lbl.offsetLeft + lbl.offsetWidth / 2 - kn.offsetWidth / 2;
  }
  // At rest on the bar he sits; anywhere else at rest, he stands.
  const rest = () => clip(perch === 'bar' ? 'sit' : '');
  function syncBar() {
    const tab = activeTab(), id = tab.dataset.value;
    mount(tabs(), 'bar', () => {
      if (focusing) return;                    // he'll take his spot once he's done focusing
      if (tabId && tabId !== id) runTo(spotBy(tab)).then(() => { if (!walk && !focusing) rest(); });
      else if (!walk) { place(spotBy(tab)); rest(); }
      tabId = id;
    });
  }

  /* The easter egg: a click and he focuses soul, as the game heals: he gets up and stands still
     while a white light swells around him and fades (css: .is-focus, --dur-flash), then sits
     or strolls on. */
  async function focus() {
    if (!kn.isConnected || still.matches || focusing || performance.now() - lastFocus < 2000) return;
    lastFocus = performance.now(); focusing = true;
    seq++; stopWalk();                       // a stroll or a getting-up under way ends; sync() starts over after
    clip(''); kn.classList.add('is-focus');
    track('knight');
    await after(ms('--dur-flash'));
    kn.classList.remove('is-focus'); focusing = false;
    rest(); sync();
  }

  /* ── His bench, on Your game (js/app-home.js, .hmC-bench) ── */
  const benchBox = () => Array.from(document.querySelectorAll('.hmC-bench')).find((n) => n.offsetParent !== null) || null;
  const seat = (box) => (box.clientWidth - kn.offsetWidth) / 2;
  let wake = null;       // what the last save was, while he still has to get up for it
  function syncBench(box) {
    mount(box, 'bench', () => {
      if (wake && !still.matches) { getUp(box); return; }
      wake = null;
      clip('sit'); face(1); place(seat(box));
    });
  }
  /* The game saved: he gets up. On a new bench, he runs off the card and comes back to this
     one, fading; on the same bench, he stretches his legs and sits again. */
  async function getUp(box) {
    const moved = wake.moved, my = ++seq;
    wake = null;
    clip(''); face(1); place(seat(box));
    await after(ms('--dur-slow'));
    if (seq !== my) return;
    if (moved) {
      const edge = box.closest('.hmC-hero') || box;
      await runTo(edge.getBoundingClientRect().right - box.getBoundingClientRect().left - kn.offsetWidth);
      if (seq !== my) return;
      kn.classList.add('is-out');
      await after(ms('--dur-slow'));
      if (seq !== my) return;
      clip('sit'); place(seat(box));
      void kn.offsetWidth; kn.classList.remove('is-out');
    } else {
      await after(ms('--dur-slow'));
      if (seq !== my) return;
      clip('sit');
    }
  }
  function onSave(was) {
    if (perch === 'bench') wake = { moved: was !== App.progress.bench };
    if (was && App.progress.bench && was !== App.progress.bench) toWalk = { from: was, to: App.progress.bench };
  }

  /* ── The footer's floor: its top rule (#colophon), where he strolls while it's in view ── */
  let strolling = 0;     // the stroll's sequence, while one runs
  function syncFloor() {
    mount(el.colophon, 'floor', () => { if (strolling !== seq && !focusing) stroll(); });
  }
  /* Stands a while, walks somewhere else on the line at a stroll (--dur-stride per 100 px),
     stands again, and now and then sits down for a bit. Random, unlike the motes: it's ambient
     and nothing measures it. A change of line, a click or a hidden tab (seq) ends it; a repaint
     of the footer only starts it over from where he is. */
  async function stroll() {
    const box = el.colophon, my = strolling = seq;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pad = ms('--page-pad'), span = () => Math.max(pad, box.clientWidth - pad - kn.offsetWidth);
    if (at() < pad || at() > span()) place(rnd(pad, span()));
    while (seq === my && perch === 'floor' && !document.hidden) {
      clip(''); await after(rnd(2000, 5000));
      if (seq !== my) break;
      await runTo(rnd(pad, span()), ms('--dur-stride') / 100);
      if (seq !== my) break;
      if (Math.random() < 0.25) { clip('sit'); await after(rnd(6000, 10000)); }
    }
  }

  /* ── The Map: by your bench, and the walk to a new one ── */
  const mapBox = () => el.pg.querySelector('.pgm-box');
  const youPin = () => el.pg.querySelector('.pgm-you');
  let walking = null;    // the walk under way, { from, to }
  let toWalk = null;     // a bench change waiting for the map to be in view
  // The bench of the save before (hollow.prev, js/saves.js), or ''.
  function prevBench() {
    try { const p = JSON.parse(load('hollow.prev') || 'null'); return p && p.snap ? CH.fromSnap(p.snap).progress.bench : ''; } catch (e) { return ''; }
  }
  function syncMap() {
    unmount('map');
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

  /* ── Which line: what's in view calls him ── */
  // How much of each line's box is in view, and whether that's enough (in at 60%, out under 10%: no flicker at the edge).
  const seen = { bench: 0, map: 0, floor: 0 }, on = { bench: false, map: false, floor: false };
  const watched = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.target.isConnected) seen[e.target.dataset.knLine] = e.intersectionRatio;
    decide();
  }, { threshold: [0, 0.1, 0.6, 1] });
  function watch(node, line) {
    if (!node || watched.has(node)) return;
    node.dataset.knLine = line; watched.add(node); io.observe(node);
  }
  let shown = '';        // a line asked for by hand (show), for captures: what's in view doesn't count
  function decide() {
    if (document.hidden) return;
    for (const k of Object.keys(seen)) on[k] = shown ? shown === k : seen[k] >= 0.6 ? true : seen[k] <= 0.1 ? false : on[k];
    const bench = on.bench ? benchBox() : null;
    const want = bench ? 'bench' : on.map && youPin() ? 'map' : on.floor && !still.matches ? 'floor' : activeTab() && !phone.matches ? 'bar' : '';
    // Settled somewhere: another line waits its turn.
    const wait = DWELL - (performance.now() - lastSwitch);
    if (want !== perch && perch && kn.isConnected && wait > 0) { clearTimeout(decideTimer); decideTimer = setTimeout(decide, wait); return; }
    if (want === 'bench') syncBench(bench); else if (want === 'map') syncMap(); else if (want === 'floor') syncFloor(); else if (want === 'bar') syncBar(); else unmount();
  }

  /* ── The whole ── */
  function sync() {
    if (document.hidden) return;             // he catches up when the tab comes back (visibilitychange)
    for (const n of watched) if (!n.isConnected) { io.unobserve(n); watched.delete(n); }
    document.querySelectorAll('.hmC-bench').forEach((n) => watch(n, 'bench'));
    watch(mapBox(), 'map');
    watch(el.colophon, 'floor');
    decide();
  }
  function start() {
    kn.addEventListener('click', focus);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { seq++; stopWalk(); } else sync(); });
    // The bar reflows (the window resized): back beside his tab, without running.
    if (window.ResizeObserver) {
      new ResizeObserver(() => { if (perch === 'bar' && !walk && !focusing) { const tab = activeTab(); if (tab) place(spotBy(tab)); } }).observe(tabs());
    }
    still.addEventListener('change', () => { stopWalk(); sync(); });
    phone.addEventListener('change', sync);
    sync();
  }

  // Where he is and what's in view, for the smoke test and the debug pages; and a line to go to
  // regardless of what's in view ('bench', 'floor'; '' to follow the page again), for captures.
  const state = () => ({ perch, tabId, seen: { ...seen }, on: { ...on }, cls: kn.className, walking });
  const show = (line) => { shown = line || ''; lastSwitch = 0; decide(); };
  App.knight = { start, sync, onSave, state, show };
})();
