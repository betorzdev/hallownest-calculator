/* js/app-sister.js — the way to the sister site, the Silksong one (../pharloom-calculator, «Calculadora
   de Telalejana»), and the Hornet who points it out. Chosen on 1 Oct 2026 in
   design/28-sister-hornet-clawline.html (C, after design/26 and design/27).
   The link is a loose word in the masthead's brand row, «Silksong ↗», left of the title: the other
   game on one side, your save on the other (js/app.js, renderMasthead, asks linkHtml); on a phone,
   in the strip under the title, on the left. A silk thread underlines it, under the masthead's
   letters, for as long as it's there.
   Hornet comes once per visit (sessionStorage) until the link is clicked (localStorage: never again):
   she floats down on her Drifter's Cloak onto the word, closes it, sweeps her needle, and the thread
   weaves through the letters and cinches into that underline. Then she stays on it: now and then (15–25
   s, only with the masthead in view) she shakes out her cloak, looks up, plays the Needolin or sits;
   she watches the mouse, and spins into guard while it's on the link. On the click she leaves on Silk
   Soar, up and out on her thread. Her moves are the game's own (js/hornet-moves.js, assets/hornet/,
   by tools/extract-hornet.py). With reduced motion she only stands on the link, and fades on the click.
   Decorative: hidden from screen readers and never in the way of a click; the link is the control.
   Shown since the sister site went public (SISTER below; false hides it again, and #…&sister=1 still
   shows it then: App.sisterPreview).
   Shares HK.app (see js/app.js): App.sister.on() and linkHtml() for the masthead, App.sister.sync()
   after every render, App.sister.start() once, from js/app-boot.js. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const App = HK.app;
  const { el, t, esc, NT, track, prefs } = App;
  const H = HK.HORNET, M = H.MOVES;

  const SISTER = true;           // ../pharloom-calculator is published
  const HOME = 'https://betorzdev.github.io/pharloom-calculator/';
  const SHOWN = 'hollow.sisterShown', SEEN = 'hollow.sisterSeen';
  const K = 0.5;                 // the strips are at a third of the game's size; she's shown at half that
  const FLOOR = H.FLOOR * K;     // her feet below her pivot, standing

  const on = () => SISTER || !!App.sisterPreview;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* no memory: she comes again */ } } };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k) { try { localStorage.setItem(k, '1'); } catch (e) { /* no memory */ } } };

  /* The link, for the masthead: in the brand row, or the strip's copy for a phone (`strip`); the
     CSS shows one of the two. The sister's page in your language. */
  function linkHtml(strip) {
    return `<a class="mh-sister${strip ? ' is-strip' : ''}" href="${HOME}${prefs.lang === 'es' ? 'es/' : ''}" target="_blank" rel="noopener" title="${esc(t('sisterHint'))}"><span${NT}>${esc(t('sister'))}</span> <span class="mh-sister-arr" aria-hidden="true">↗</span></a>`;
  }

  /* ── The clock: one-shot clips and tweens step on animation frames, only while there are any ── */
  const tasks = new Set();
  let ticking = false;
  function tick(t) {
    for (const f of [...tasks]) f(t);
    ticking = tasks.size > 0;
    if (ticking) requestAnimationFrame(tick);
  }
  const addTask = (f) => { tasks.add(f); if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOut = (p) => 1 - (1 - p) * (1 - p), easeIn = (p) => p * p, easeInOut = (p) => p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
  function tween(ms, fn, ease = (p) => p) {
    return new Promise((res) => {
      const t0 = performance.now();
      const f = (t) => { const p = Math.min(1, Math.max(0, (t - t0) / ms)); fn(ease(p)); if (p >= 1) { tasks.delete(f); res(); } };
      fn(0); addTask(f);
    });
  }

  /* ── The layers, in .page: under the masthead's letters the thread, over them Hornet ── */
  let back = null, front = null, svg = null;
  const box = (node) => {
    const r = node.getBoundingClientRect(), p = el.page.getBoundingClientRect();
    return { l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top, w: r.width, h: r.height, cx: r.left - p.left + r.width / 2, cy: r.top - p.top + r.height / 2 };
  };
  function layers() {
    if (back) return;
    back = Object.assign(document.createElement('div'), { className: 'sis-lay is-back' });
    front = Object.assign(document.createElement('div'), { className: 'sis-lay is-front' });
    back.setAttribute('aria-hidden', 'true'); front.setAttribute('aria-hidden', 'true');
    back.innerHTML = '<svg class="sis-silk"><path class="sis-thread"/></svg>';
    svg = back.querySelector('path');
    el.page.prepend(back); el.page.append(front);
  }

  /* ── Hornet: one element, her move's strip as its background; placed by her pivot ── */
  const hx = {
    el: null, x: 0, y: 0, dir: -1, name: '', i: 0, anim: null, done: null, state: '',
    make() {
      this.el = Object.assign(document.createElement('div'), { className: 'sis-hornet' });
      front.append(this.el);
    },
    at(x, y) { this.x = x; this.y = y; this.place(); },
    feet(x, f) { this.at(x, f - FLOOR); },
    face(d) { this.dir = d; this.place(); },
    place() {
      const m = M[this.name]; if (!m || !this.el) return;
      this.el.style.transform = `translate(${this.x - m.px * K}px, ${this.y - m.py * K}px)` + (this.dir > 0 ? ' scaleX(-1)' : '');
      this.el.style.transformOrigin = `${m.px * K}px ${m.py * K}px`;
    },
    show(name, i) {
      const m = M[name], s = this.el.style;
      if (name !== this.name) {
        this.name = name;
        Object.assign(s, { width: m.w * K + 'px', height: m.h * K + 'px', backgroundImage: `url(assets/hornet/${name}.png)`, backgroundSize: `${m.w * K * m.n}px ${m.h * K}px` });
        s.setProperty('--cell', m.w * K + 'px'); s.setProperty('--n', m.n);
        this.place();
      }
      this.i = i; s.backgroundPosition = `${-i * m.w * K}px 0`;
    },
    stop() {
      if (this.anim) { tasks.delete(this.anim); this.anim = null; }
      if (this.done) { const d = this.done; this.done = null; d(); }
      this.el.classList.remove('is-loop', 'is-calm'); this.el.style.animationDuration = '';
    },
    /* A clip once, held on its last frame; resolves there. */
    play(name, { from = 0, speed = 1 } = {}) {
      this.stop();
      const m = M[name];
      this.show(name, from);
      if (still()) return Promise.resolve();
      return new Promise((res) => {
        const t0 = performance.now();
        const f = (t) => {
          let i = from + Math.floor((t - t0) / 1000 * m.fps * speed);
          if (i >= m.n - 1) { i = m.n - 1; tasks.delete(f); this.anim = null; this.done = null; res(); }
          if (i !== this.i || name !== this.name) this.show(name, i);
        };
        this.anim = f; this.done = res; addTask(f);
      });
    },
    /* A clip over and over: a CSS animation (css: .sis-hornet.is-loop), no frames to step. `calm`:
       at a third of its speed, there and back (.is-calm), a breath rather than a step. */
    loop(name, calm = false) {
      this.stop();
      this.show(name, 0);
      if (still()) return;
      this.el.style.animationDuration = M[name].n / M[name].fps * (calm ? 3 : 1) + 's';
      this.el.classList.toggle('is-calm', calm);
      this.el.classList.add('is-loop');
    },
    /* Standing: the game's Idle is 12 frames a second, a fidget at her size here; slowed, she breathes. */
    idle() { this.state = 'idle'; this.loop('idle', true); },
    go(x, y, ms, ease) {
      const x0 = this.x, y0 = this.y;
      return tween(ms, (p) => this.at(x0 + (x - x0) * p, y0 + (y - y0) * p), ease);
    },
  };

  /* ── The link she stands on, and its thread ── */
  const link = () => [...el.masthead.querySelectorAll('.mh-sister')].find((a) => a.offsetParent) || null;
  const spot = (L) => ({ x: L.cx, f: L.t + 1 });
  /* The thread through the word: woven from its right end to its left as p goes 0 → 1, then cinched
     (c 0 → 1) into a straight line under it. */
  function thread(p, c) {
    const a = link(); if (!a || !svg) return;
    const L = box(a), x0 = L.r - 2, x1 = L.l + 1, mid = L.cy + 1, amp = 5 * (1 - c), m = mid + (L.b + 1 - mid) * c;
    const xe = x0 + (x1 - x0) * p;
    let d = `M${x0.toFixed(1)},${m.toFixed(1)}`;
    for (let x = x0; x >= xe; x -= 2) d += ` L${x.toFixed(1)},${(m + amp * Math.sin((x0 - x) / 7)).toFixed(1)}`;
    svg.setAttribute('d', d);
  }
  let woven = false;     // the underline is there (drawn again whenever the link moves)

  function dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      const d = Object.assign(document.createElement('span'), { className: 'sis-dust' });
      d.style.left = x + 'px'; d.style.top = y + 'px'; front.append(d);
      const a = Math.PI * (1 + Math.random()), r = 8 + Math.random() * 18;
      d.animate([{ transform: 'translate(-50%, -50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r * 0.5}px)) scale(0.4)`, opacity: 0 }],
        { duration: 500 + Math.random() * 400, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' }).onfinish = () => d.remove();
    }
  }
  function note(x, y) {
    const n = Object.assign(document.createElement('span'), { className: 'sis-note', textContent: '♪' });
    n.style.left = x + 'px'; n.style.top = y + 'px'; front.append(n);
    n.animate([{ transform: 'translate(-50%, 0) scale(0.8)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -30px)', opacity: 0 }],
      { duration: 1600, easing: 'ease-out', fill: 'forwards' }).onfinish = () => n.remove();
  }
  /* An effect of hers, by her pivot (the silk round her as Silk Soar charges): once, then gone. */
  function aura(name) {
    const m = M[name], e = Object.assign(document.createElement('div'), { className: 'sis-hornet' });
    Object.assign(e.style, { width: m.w * K + 'px', height: m.h * K + 'px', backgroundImage: `url(assets/hornet/${name}.png)`, backgroundSize: `${m.w * K * m.n}px ${m.h * K}px`,
      transform: `translate(${hx.x - m.px * K}px, ${hx.y - m.py * K}px)` + (hx.dir > 0 ? ' scaleX(-1)' : ''), transformOrigin: `${m.px * K}px ${m.py * K}px` });
    front.append(e);
    return tween(m.n / m.fps * 1000, (p) => { e.style.backgroundPosition = `${-Math.min(m.n - 1, Math.floor(p * m.n)) * m.w * K}px 0`; }).then(() => e.remove());
  }
  /* A frame of an effect strip by its drawn box (js/hornet-moves.js, boxes): the needle turned to
     point up with its tip at (x, y); a thread stood upright from y down, `len` long. */
  function piece() {
    const e = Object.assign(document.createElement('div'), { className: 'sis-fx' });
    front.append(e);
    const paint = (name, i, w, h, sx, sy) => {
      const m = M[name], b = m.boxes[i];
      Object.assign(e.style, { width: w + 'px', height: h + 'px', backgroundImage: `url(assets/hornet/${name}.png)`,
        backgroundSize: `${m.n * m.w * K * sx}px ${m.h * K * sy}px`, backgroundPosition: `${-(i * m.w + b[0]) * K * sx}px ${-b[1] * K * sy}px` });
      return b;
    };
    return {
      needleUp(i, x, y) {
        // The thrown needle's sprite is a little longer than the one in her hand (its motion streak):
        // scaled to the held one's length (64 of 72 px in the strips), so it reads as the same needle.
        const b = M['harpoon-needle'].boxes[i], k = 0.89;
        paint('harpoon-needle', i, b[2] * K * k, b[3] * K * k, k, k);
        e.style.transformOrigin = `0 50%`;
        e.style.transform = `translate(${x}px, ${y - b[3] * K * k / 2}px) rotate(90deg)`;
        return b[2] * K * k;
      },
      upright(name, i, x, y, len) {
        const b = M[name].boxes[i];
        if (!b || len <= 0) { e.style.display = 'none'; return; }
        e.style.display = '';
        const sy = len / (b[3] * K);
        paint(name, i, b[2] * K, len, 1, sy);
        e.style.transformOrigin = ''; e.style.transform = `translate(${x - b[2] * K / 2}px, ${y}px)`;
      },
      remove() { e.remove(); },
    };
  }
  function called() {
    const a = link(); if (!a) return;
    a.classList.add('is-called');
    setTimeout(() => { const b = link(); if (b) b.classList.remove('is-called'); }, 5000);
  }

  /* ── Her arrival: down on her cloak onto the word, and the thread ── */
  async function arrive() {
    const a = link(); if (!a) return;
    const s = spot(box(a));
    hx.state = 'arriving'; hx.face(-1);
    hx.at(s.x, -70);
    await hx.play('float-open');
    hx.loop('float');
    await tween(2000, (p) => { const t = spot(box(link() || a)); hx.at(t.x + Math.sin(p * Math.PI * 3) * 8 * (1 - p), -70 + (t.f - FLOOR + 70) * p); }, easeOut);
    dust(hx.x, hx.y + FLOOR, 5);
    await hx.play('float-close');
    await hx.play('land', { from: 6 });
    hx.loop('idle', true); await wait(250);
    // Challenge Strong sweeps the needle out on the side she isn't drawn facing.
    const sweep = hx.play('challenge');
    await wait(200);
    const l = link(); if (l) { l.classList.add('is-struck'); setTimeout(() => l.classList.remove('is-struck'), 500); }
    await tween(420, (p) => thread(p, 0), easeOut);
    await tween(380, (c) => thread(1, c), easeInOut);
    woven = true; back.classList.add('is-glint'); called();
    await sweep;
    await hx.play('challenge', { from: 7 });
    hx.idle(); life();
  }

  /* ── While she waits ── */
  const LIFE = [
    () => hx.play('flourish'),
    async () => { await hx.play('look-up'); await wait(700); },
    async () => {
      await hx.play('needolin-start'); hx.loop('needolin');
      for (let i = 0; i < 5; i++) { note(hx.x + hx.dir * 8 + (Math.random() * 10 - 5), hx.y - 20); await wait(600); }
    },
    async () => { await hx.play('sit'); await wait(4000); },
  ];
  let lifeTimer = 0, inView = true;
  function life() {
    clearTimeout(lifeTimer);
    if (still() || hx.state === 'gone') return;
    lifeTimer = setTimeout(async () => {
      if (hx.state !== 'idle' || !inView || document.hidden) return life();
      hx.state = 'busy';
      await LIFE[Math.floor(Math.random() * LIFE.length)]();
      if (hx.state === 'busy') hx.idle();
      life();
    }, 15000 + Math.random() * 10000);
  }

  /* ── The click: she leaves on Silk Soar, as the game does it (the wiki: charge, the needle thrown
     to the ceiling, and she shoots up to it); here the ceiling is the top of the window. The link and
     its thread stay. ── */
  async function leave() {
    hx.state = 'gone'; clearTimeout(lifeTimer);
    if (still()) { hx.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => hx.el.remove(); return; }
    const ceil = -el.page.getBoundingClientRect().top + 2;
    // Charging: she crouches, the needle up, and the silk swirls round her.
    hx.play('soar-antic');
    await aura('soar-charge');
    // The throw: the needle flies up on its thread while she watches it go.
    hx.play('soar-throw');
    await wait(170);
    const needle = piece(), line = piece();
    const x = hx.x, hand = hx.y - 26 * K / 0.5;
    let ny = hand, t0 = performance.now();
    const threadFrame = () => Math.min(15, 2 + Math.floor((performance.now() - t0) / 1000 * M['soar-thread'].fps));
    hx.loop('soar-wait');
    await tween(Math.max(160, (hand - ceil) / 2.4), (p) => {
      ny = hand + (ceil - hand) * p;
      const len = needle.needleUp(p < 0.7 ? 0 : 2, x, ny);
      line.upright('soar-thread', threadFrame(), x, ny + len * 0.8, hand - ny - len * 0.8);
    }, easeOut);
    // Stuck at the top; she crouches and goes, the thread pulling her up and shortening above her.
    // (No speed lines: drawn under her, they streaked down through the word.)
    const len = needle.needleUp(2, x, ceil);
    await hx.play('soar-jump');
    hx.loop('soar');
    const y0 = hx.y, top = ceil + len * 0.8;
    await tween(Math.max(220, (y0 - ceil) / 1.6), (p) => {
      hx.at(x, y0 + (ceil - 40 - y0) * p);
      line.upright('soar-thread', threadFrame(), x, top, hx.y - 20 - top);
    }, easeIn);
    hx.el.remove(); line.remove(); needle.remove();
  }

  /* ── Wiring ── */
  let started = false;
  function start() {
    if (!on() || started) return;
    started = true;
    layers();
    // The masthead in view: her arrival waits for it, and her life pauses without it.
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; }).observe(el.masthead);
    addEventListener('resize', () => sync());
    el.masthead.addEventListener('click', (e) => {
      if (!e.target.closest('.mh-sister')) return;
      track('sister');
      ls.set(SEEN);
      if (hx.el && hx.state !== 'gone' && hx.state !== 'arriving') leave();
    });
    el.masthead.addEventListener('mousemove', (e) => {
      if (hx.state !== 'idle' && hx.state !== 'guard') return;
      const x = e.clientX - el.page.getBoundingClientRect().left;
      if (Math.abs(x - hx.x) > 12) hx.face(x > hx.x ? 1 : -1);
    });
    el.masthead.addEventListener('mouseover', (e) => {
      if (!e.target.closest('.mh-sister') || hx.state !== 'idle' || still()) return;
      hx.state = 'guard'; hx.play('parry');
    });
    el.masthead.addEventListener('mouseout', (e) => {
      if (!e.target.closest('.mh-sister') || (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.mh-sister'))) return;
      if (hx.state === 'guard') hx.idle();
    });

    const seen = !!ls.get(SEEN);
    if (seen || still()) { woven = true; thread(1, 1); }
    if (seen) return;                       // clicked once: only the link and its thread
    hx.make();
    const a = link(), go = !ss.get(SHOWN) && !still();
    if (!go) {                              // already came this visit, or no motion: she's just there
      woven = true; thread(1, 1);
      if (a) { const s = spot(box(a)); hx.show('idle', 0); hx.feet(s.x, s.f); }
      hx.idle(); life();
      return;
    }
    ss.set(SHOWN);
    hx.show('float-open', 0); hx.at(-200, -200);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(async () => {
      // Not while the masthead is out of view: she comes when you're there to see it.
      while (!inView) await wait(500);
      await wait(400);
      arrive();
    });
  }

  /* After every render the masthead is new: her place and the thread follow the link. */
  function sync() {
    if (!started) return;
    const a = link();
    if (!a) { if (svg) svg.setAttribute('d', ''); if (hx.el) hx.el.hidden = true; return; }
    if (hx.el) hx.el.hidden = false;
    if (woven) thread(1, 1);
    if (hx.el && hx.state !== 'arriving' && hx.state !== 'gone') { const s = spot(box(a)); hx.feet(s.x, s.f); }
  }

  App.sister = { on, start, sync, linkHtml };
})();
