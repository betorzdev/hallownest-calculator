/* js/app-map.js — the Progress screen's Map: the game's own map (js/map.js, drawn from its files by
   tools/extract-map.py) with your collectibles on it. Shares HK.app with js/app.js (see there).

   The rooms, as your game has them: whole where you've been (scenesVisited and scenesMapped), as
   Cornifer's rough drawing where you've only bought the area's map, and barely there where you
   don't know them yet. Without a save (nothing mapped), the whole map, whole: it's a reference.
   On it, each collectible where it is (the game's own pin for grubs, roots, stations and flames;
   its room's centre for the rest, several in one room spread around it), your shade and your
   Dreamgate. A tap on one opens its card, to mark it as on the list.
   It's an SVG in the map's own units (y flipped: the game's grows upwards). Dragging moves it,
   the wheel or a pinch zooms, and three buttons zoom in, out and back to the whole map; the view
   isn't saved. The pins keep their size on screen whatever the zoom (--k). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, P = HK.progress, R = HK.rooms, CO = HK.collectibles, M = HK.map;
  const App = HK.app;
  const { t, pick, el, esc, NT, actions, prefs, savePrefs, render, setProgress } = App;

  /* ── Where each collectible goes ── */
  const pinsOf = (kind) => M.PINS.filter((p) => p[0] === kind);
  const GAME_PIN = { 'grub': 'grub', 'whispering-root': 'root', 'stag': 'stag', 'grimmkin-flame': 'flame' };
  const roomPoint = (scene) => {
    const r = M.ROOMS[scene];
    return r ? [r[1], r[2]] : M.ANCHORS[scene] || M.HOSTS[scene] || null;
  };
  const POS = (() => {
    const out = {}, used = {};
    for (const it of CO.ITEMS) {
      const kind = GAME_PIN[it.kind];
      let pt = null;
      if (kind) {
        // The game's pins in that room, in order: two grubs in one room are its two pins.
        const list = pinsOf(kind).filter((p) => p[1] === it.scene);
        const k = kind + '|' + it.scene;
        const i = used[k] || 0;
        used[k] = i + 1;
        if (list[i]) pt = [list[i][2], list[i][3]];
      }
      out[it.id] = pt || roomPoint(it.scene);
    }
    // Several in the same spot (a shop, a room's centre) spread around it.
    const at = {};
    for (const [id, p] of Object.entries(out)) if (p) (at[p.join()] = at[p.join()] || []).push(id);
    for (const ids of Object.values(at)) {
      if (ids.length < 2) continue;
      ids.forEach((id, i) => {
        const a = (i / ids.length) * Math.PI * 2, r = 0.22 + 0.02 * ids.length;
        out[id] = [out[id][0] + Math.cos(a) * r, out[id][1] + Math.sin(a) * r];
      });
    }
    return out;
  })();

  /* ── The rooms, as your game has them ── */
  // The area's map from Cornifer, by the name js/map.js gives the area (Dirtmouth's comes with the game).
  const AREA_MAP = { 'Crossroads': 'crossroads-map', 'Green_Path': 'greenpath-map', 'Fog_Canyon': 'fog-canyon-map',
    'Fungal Wastes': 'fungal-wastes-map', 'Deepnest': 'deepnest-map', 'Ancient Basin': 'ancient-basin-map',
    'Kingdoms_Edge': 'kingdoms-edge-map', 'City of Tears': 'city-of-tears-map', 'Waterways': 'royal-waterways-map',
    'Cliffs': 'howling-cliffs-map', 'Crystal Peak': 'crystal-peak-map', 'Queens_Gardens': 'queens-gardens-map',
    'Resting_Grounds': 'resting-grounds-map', 'Town_Tutorial': '' };
  // A room's own scene: its drawing's alternatives ("_b", "_part_b"…) belong to it.
  const sceneOf = (name) => name.replace(/_(b|c|d|part_b|left|right)$/, '');
  function roomState(name, area, mapped) {
    if (!mapped.size) return 'full';
    if (mapped.has(name) || mapped.has(sceneOf(name))) return 'full';
    const m = AREA_MAP[M.AREAS[area]];
    return m === '' || (m && P.hasFound(App.progress, m)) ? 'rough' : 'ghost';
  }
  function roomsSvg() {
    const mapped = new Set(App.progress.mapped);
    const [aw, ah] = M.ATLAS.full, [rw, rh] = M.ATLAS.rough;
    return Object.entries(M.ROOMS).map(([name, r]) => {
      const [area, x, y, w, h, rW, rH, full, rough] = r;
      const st = roomState(name, area, mapped);
      const useFull = st !== 'rough';
      const [bw, bh] = useFull ? [w, h] : [rW, rH];
      const [sx, sy, sw, sh] = useFull ? full : rough;
      const [iw, ih] = useFull ? [aw, ah] : [rw, rh];
      return `<svg class="pgm-room is-${st}" x="${(x - bw / 2).toFixed(3)}" y="${(-y - bh / 2).toFixed(3)}" width="${bw}" height="${bh}"
        viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="none"><image href="assets/map/rooms-${useFull ? 'full' : 'rough'}.png" width="${iw}" height="${ih}"/></svg>`;
    }).join('');
  }

  /* ── The pins ── */
  const KINDS = CO.KINDS;
  const shownKinds = () => (Array.isArray(prefs.pgMapKinds) ? KINDS.filter((k) => prefs.pgMapKinds.includes(k)) : KINDS);
  let selected = '';
  function pinsSvg() {
    const kinds = new Set(shownKinds());
    const showFound = !!prefs.pgMapFound;
    const out = [];
    for (const it of CO.ITEMS) {
      const p = POS[it.id];
      if (!p || !kinds.has(it.kind)) continue;
      const on = P.hasFound(App.progress, it.id);
      if (on && !showFound && selected !== it.id) continue;
      const art = D.art(...D.COLLECTIBLE_KINDS[it.kind].art);
      const name = pick(D.COLLECTIBLE_KINDS[it.kind]);
      out.push(`<g class="pgm-pin${on ? ' is-on' : ''}${selected === it.id ? ' is-sel' : ''}" style="--px:${p[0].toFixed(3)}px;--py:${(-p[1]).toFixed(3)}px"
        data-act="pgmPick" data-id="${it.id}" role="button" tabindex="0" aria-label="${esc(name)}">
        <circle r="0.5"/><image href="${art}" x="-0.42" y="-0.42" width="0.84" height="0.84"/></g>`);
    }
    // Your shade and your Dreamgate, where the save says they are.
    const mark = (pt, art, cls, label) => (pt && pt.x !== undefined ? `<g class="pgm-pin pgm-mark ${cls}" style="--px:${pt.x}px;--py:${-pt.y}px" aria-label="${esc(label)}" role="img">
        <image href="${art}" x="-0.6" y="-0.6" width="1.2" height="1.2"/></g>` : '');
    out.push(mark(App.progress.gate, D.art('items', 'dreamgate'), 'is-gate', pick(D.EQUIPMENT.find((x) => x.id === 'dreamgate'))));
    out.push(mark(App.progress.shade, D.art('knight', 'shade'), 'is-shade', t('shadeTag')));
    return out.join('');
  }

  /* ── The view: the SVG's viewBox, kept between repaints ── */
  const [bx0, by0, bx1, by1] = M.BOUNDS;
  const PAD = 0.8;
  const FIT = { x: bx0 - PAD, y: -by1 - PAD, w: bx1 - bx0 + PAD * 2, h: by1 - by0 + PAD * 2 };
  let vb = null;   // set on the first measure (fitView)
  /* The whole map, fitted to the box: a wide box shows it all; a tall one (a phone) fills its
     height and centres it, to be slid sideways. The view keeps the box's proportions. */
  function fitView(bw, bh) {
    const ratio = bw / bh;
    if (ratio >= FIT.w / FIT.h) { const w = FIT.h * ratio; return { x: FIT.x - (w - FIT.w) / 2, y: FIT.y, w, h: FIT.h }; }
    const h = FIT.h * 0.92, w = h * ratio;
    return { x: FIT.x + (FIT.w - w) / 2, y: FIT.y + (FIT.h - h) / 2, w, h };
  }
  const box = () => el.pg.querySelector('.pgm-box');
  const svg = () => el.pg.querySelector('.pgm-svg');
  // The pins' size on screen: about 26 px, whatever the zoom.
  function applyView() {
    const s = svg();
    if (!s) return;
    const r = s.getBoundingClientRect();
    if (!r.width) return;                  // still hidden: measured once it shows (afterPaint)
    if (!vb) vb = fitView(r.width, r.height);
    // The view takes the box's proportions, so the map is never letterboxed.
    const h = vb.w * (r.height / r.width);
    if (Math.abs(h - vb.h) > 1e-6) vb = { ...vb, y: vb.y + (vb.h - h) / 2, h };
    s.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    // About 26 px on screen, 20 on a phone.
    s.style.setProperty('--k', String(Math.max(0.05, (vb.w / r.width) * (r.width < 600 ? 20 : 26))));
    paintCard();
  }
  function zoomAt(f, cx, cy) {
    const w = Math.min(FIT.w * 1.6, Math.max(2, vb.w * f));
    const h = w * (vb.h / vb.w);
    vb = { x: cx - (cx - vb.x) * (w / vb.w), y: cy - (cy - vb.y) * (h / vb.h), w, h };
    applyView();
  }
  // A point on screen → the map's units.
  function toMap(clientX, clientY) {
    const r = svg().getBoundingClientRect();
    return [vb.x + ((clientX - r.left) / r.width) * vb.w, vb.y + ((clientY - r.top) / r.height) * vb.h];
  }

  /* ── The card of the pin chosen, over the map ── */
  function cardHtml(it) {
    const on = P.hasFound(App.progress, it.id);
    const a = R.areaOf(it.scene), pl = R.placeOf(it.scene);
    const where = [a && pick(R.AREAS[a]), pl && pick(R.PLACES[pl])].filter(Boolean).join(' · ');
    return `<div class="pgm-card" role="dialog" aria-label="${esc(pick(D.COLLECTIBLE_KINDS[it.kind]))}">
      <img src="${D.art(...D.COLLECTIBLE_KINDS[it.kind].art)}" alt="">
      <span class="pgm-card-t"><b${NT}>${esc(pick(D.COLLECTIBLE_KINDS[it.kind]))}</b><span${NT}>${esc(where)}</span></span>
      <button type="button" class="text-btn" data-act="pgFind" data-id="${it.id}" aria-pressed="${on}">${esc(t(on ? 'pgUnmark' : 'pgMark'))}</button>
      <button type="button" class="banner-close pgm-card-x" data-act="pgmPick" data-id="" aria-label="${esc(t('importHintOff'))}">×</button>
    </div>`;
  }
  function paintCard() {
    const b = box();
    if (!b) return;
    let c = b.querySelector('.pgm-card-wrap');
    const it = selected && CO.ITEMS.find((x) => x.id === selected);
    if (!it || !POS[it.id]) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.className = 'pgm-card-wrap'; b.appendChild(c); }
    c.innerHTML = cardHtml(it);
    const [x, y] = POS[it.id];
    const r = svg().getBoundingClientRect(), br = b.getBoundingClientRect();
    const sx = ((x - vb.x) / vb.w) * r.width + (r.left - br.left), sy = ((-y - vb.y) / vb.h) * r.height + (r.top - br.top);
    c.style.left = Math.max(8, Math.min(br.width - 8, sx)) + 'px';
    c.style.top = sy + 'px';
    c.classList.toggle('is-below', sy < 110);
  }

  /* ── The whole view ── */
  function renderPgMap() {
    const kinds = new Set(shownKinds());
    const chips = KINDS.map((k) => `<button type="button" class="pg-area pgm-kind${kinds.has(k) ? ' is-on' : ''}" data-act="pgmKind" data-value="${k}" aria-pressed="${kinds.has(k)}">
        <img src="${D.art(...D.COLLECTIBLE_KINDS[k].art)}" alt=""><span${NT}>${esc(pick(D.COLLECTIBLE_KINDS[k]))}</span></button>`).join('');
    const reference = !App.progress.mapped.length;
    return `<div class="pgm">
      <div class="pg-areas pgm-kinds" role="group" aria-label="${esc(t('pgMapKinds'))}">${chips}</div>
      <div class="pgm-bar">
        <p class="pgm-note">${esc(t(reference ? 'pgMapReference' : 'pgMapFromSave'))}</p>
        <label class="pgm-found"><input type="checkbox" data-change="pgmFound" ${prefs.pgMapFound ? 'checked' : ''}> ${esc(t('pgMapShowFound'))}</label>
        <span class="pgm-zoom">
          <button type="button" class="step" data-act="pgmZoom" data-value="in" aria-label="${esc(t('pgZoomIn'))}" title="${esc(t('pgZoomIn'))}">+</button>
          <button type="button" class="step" data-act="pgmZoom" data-value="out" aria-label="${esc(t('pgZoomOut'))}" title="${esc(t('pgZoomOut'))}">−</button>
          <button type="button" class="step pgm-fit" data-act="pgmZoom" data-value="fit" aria-label="${esc(t('pgZoomFit'))}" title="${esc(t('pgZoomFit'))}">⤢</button>
        </span>
      </div>
      <div class="pgm-box">
        <svg class="pgm-svg" viewBox="${vb ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : `${FIT.x} ${FIT.y} ${FIT.w} ${FIT.h}`}" role="img" aria-label="${esc(t('pgTabMap'))}">
          <g class="pgm-rooms">${roomsSvg()}</g>
          <g class="pgm-pins">${pinsSvg()}</g>
        </svg>
      </div>
    </div>`;
  }
  // After the screen is painted: the view as it was, and the card on its pin.
  // (render() shows the screen after painting it, so the measuring waits for the next frame.)
  const afterPaint = () => { if (svg()) { applyView(); requestAnimationFrame(applyView); } };

  /* ── Moving around ── */
  const touches = new Map();
  let drag = null, pinch = null, moved = false, dragEnd = 0;
  el.pg.addEventListener('pointerdown', (e) => {
    const s = svg();
    if (!s || !s.contains(e.target)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    moved = false;
    if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, vb: { ...vb } };
    else if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: { ...vb }, c: toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
      drag = null;
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    const s = svg();
    if (!s) return;
    const r = s.getBoundingClientRect();
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      vb = { ...drag.vb, x: drag.vb.x - (dx / r.width) * drag.vb.w, y: drag.vb.y - (dy / r.height) * drag.vb.h };
      applyView();
    } else if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      moved = true;
      vb = { ...pinch.vb };
      zoomAt(pinch.d / d, pinch.c[0], pinch.c[1]);
    }
  });
  const end = (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.delete(e.pointerId);
    if (!touches.size) { drag = null; pinch = null; if (moved) dragEnd = performance.now(); moved = false; }
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  el.pg.addEventListener('wheel', (e) => {
    const s = svg();
    if (!s || !s.contains(e.target)) return;
    e.preventDefault();
    const [cx, cy] = toMap(e.clientX, e.clientY);
    zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy);
  }, { passive: false });
  // A drag isn't a tap: the click that comes with letting go of a drag doesn't pick the pin under it.
  el.pg.addEventListener('click', (e) => {
    if (performance.now() - dragEnd < 350 && svg() && svg().contains(e.target)) { e.stopPropagation(); dragEnd = 0; }
  }, true);
  el.pg.addEventListener('keydown', (e) => {
    const pin = e.target.closest && e.target.closest('.pgm-pin[data-id]');
    if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); actions.pgmPick(pin); }
  });
  el.pg.addEventListener('change', (e) => {
    if (e.target.closest('[data-change="pgmFound"]')) { prefs.pgMapFound = e.target.checked; savePrefs(); render(); }
  });
  window.addEventListener('resize', () => { if (prefs.view === 'progress' && prefs.pgTab === 'map') applyView(); });

  Object.assign(actions, {
    pgmPick(node) {
      selected = node.dataset.id && node.dataset.id !== selected ? node.dataset.id : '';
      render();
    },
    pgmKind(node) {
      const k = node.dataset.value;
      const now = shownKinds();
      prefs.pgMapKinds = now.includes(k) ? now.filter((x) => x !== k) : [...now, k];
      savePrefs();
      render();
    },
    pgmZoom(node) {
      const v = node.dataset.value;
      if (v === 'fit') { vb = null; applyView(); return; }
      zoomAt(v === 'in' ? 1 / 1.4 : 1.4, vb.x + vb.w / 2, vb.y + vb.h / 2);
    },
  });

  Object.assign(App, { renderPgMap, pgMapAfterPaint: afterPaint });
})();
