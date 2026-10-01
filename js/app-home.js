/* js/app-home.js — Your game, the start screen (design/10-restructure.md, variant C · the bench):
   your real game at a glance. On top, the game's area title card for where you rest ("Resting
   at" over the area's name, on the area's own light), the state of the link to the game's file
   and the figures the game's profile screen shows (completion, time, geo) with the Journal's.
   Under it, three columns: what you got since the last save (js/changes.js, over the game as it
   was before the last sync, hollow.prev), what you carry (the charms worn and what they give) and
   what's missing in the area of your bench; your shade, a line under the area's map. The Inventory (js/app-game.js) is its own screen, next in the bar.
   In free mode (nobody's game) the screen is an invitation instead: an example game, connect
   yours (a button, or dropping the file on the screen), or just try builds.
   Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, C = HK.codec, M = HK.map, HJ = HK.hunter, F = HK.foes, R = HK.rooms, CO = HK.collectibles, CP = HK.completion, CH = HK.changes, L = HK.live, I = HK.i18n, BE = HK.benches;
  const App = HK.app;
  const { t, pick, el, NT, esc, load, brackets, screenHead, actions, prefs, pctSpace } = App;

  const num = (n) => App.NF[0].format(n);
  const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const json = (k) => { try { return JSON.parse(load(k) || 'null'); } catch (e) { return null; } };

  /* ── What the game was at the save before (hollow.prev) and what changed since ────────────
     Worked out once per pair of saves: the render asks for it on every repaint. */
  let gainedMemo = { key: null, list: [], saved: null };
  function gained() {
    const prev = load('hollow.prev');
    const key = prev + '|' + App.progress.found.length + '|' + App.owned.length + '|' + JSON.stringify(App.hjBook()) + '|' + JSON.stringify(App.state) + '|' + JSON.stringify(App.marks);
    if (key === gainedMemo.key) return gainedMemo;
    let p = null;
    try { p = JSON.parse(prev || 'null'); } catch (e) { p = null; }
    const now = { build: App.state, owned: App.owned, book: App.hjBook(), hall: App.marks, progress: App.progress };
    const list = p && p.snap ? CH.diff(CH.fromSnap(p.snap), now) : [];
    gainedMemo = { key, list, saved: p && p.saved };
    return gainedMemo;
  }

  /* ── Each change, named and drawn ── */
  const ITEM = Object.fromEntries(CO.ITEMS.map((it) => [it.id, it]));
  const placeName = (scene) => pick(R.PLACES[R.placeOf(scene)]) || pick(R.AREAS[R.areaOf(scene)]);
  const bookName = (id) => { const r = HJ.ROW[id]; return (r && r.name) || (HJ.EXTRAS[id] || F.FOE_BY_ID[id] || {}).name; };
  const catOf = (id) => (CP.CATEGORIES.find((c) => c.items.some((x) => x[0] === id)) || {}).id;
  const DIFF_KEY = { at: 'diffAt', asra: 'diffAs', radiant: 'diffRa' };
  function describe(c) {
    switch (c.kind) {
      case 'journal': return { name: pick(bookName(c.id)), note: t(c.done ? 'homeJournalDone' : 'homeJournalSeen'), art: D.art('journal', c.id) };
      case 'charm': return { name: pick(D.CHARM_BY_ID[c.id]), note: t('homeCharm'), art: `assets/charms/${c.id}.png` };
      case 'item': {
        const cat = catOf(c.id);
        const m = cat ? App.pgMeta(cat, c.id) : null;
        // The Dreamers have no picture of their own: their pins on the game's map.
        return { name: m ? m.name : c.id, note: '', art: m ? m.art : '', pin: cat === 'dreamers' ? 'dreamer-' + c.id : '' };
      }
      case 'upgrade':
        if (c.id === 'nail') return { name: pick(D.NAILS[c.to]), note: '', art: D.art('nails', c.to) };
        return { name: t(c.id + 'Field'), note: '', value: num(c.to), art: D.art('hud', c.id === 'masks' ? 'mask' : c.id === 'vessels' ? 'vessel' : 'notch') };
      case 'spell': return { name: pick(D.SPELLS[c.id].levels[c.to]), note: '', art: D.art('spells', c.to === 2 ? c.id + '2' : c.id) };
      case 'art': return { name: pick(D.ARTS[c.id]), note: '', art: D.art('arts', c.id) };
      case 'cloak': return { name: pick(D.ABILITIES.cloaks[c.to]), note: '', art: D.art('abilities', 'cloak' + c.to) };
      case 'dream': return { name: pick(D.ABILITIES.dream), note: '', art: D.art('abilities', D.ABILITIES.dream.art) };
      case 'found': {
        const it = ITEM[c.id], k = D.COLLECTIBLE_KINDS[it.kind];
        return { name: pick(k), sub: placeName(it.scene), note: '', art: D.art(k.art[0], k.art[1]) };
      }
      case 'statue': return { name: pick((F.FOE_BY_ID[c.id] || {}).name), note: t(DIFF_KEY[c.diff]), art: D.art('journal', c.id) };
      default: return null;
    }
  }

  /* The live notice when the game saves (js/app-saves.js): the area of the bench and what you got,
     three at most by name. */
  function gainedLine() {
    const list = gained().list;
    if (!list.length) return '';
    const named = list.filter((c) => c.kind !== 'pct').map((c) => describe(c).name).filter(Boolean);
    const pct = list.find((c) => c.kind === 'pct');
    const parts = named.slice(0, 3);
    if (named.length > 3) parts.push(t('homeMore', { n: num(named.length - 3) }));
    if (pct) parts.push('+' + num(pct.to - pct.from) + pctSpace());
    const area = pick(R.AREAS[R.areaOf(App.progress.bench)]);
    return (area ? t('homeToastAt', { area }) + ' ' : '') + parts.join(', ');
  }

  /* ── Pieces ── */
  /* The bench under the area's name, with the Knight sitting on it (css .hmC-kn, the sit strip):
     a picture of him resting there, still; the Knight who moves, and marks the tab you're on,
     stays on the screen bar (js/app-knight.js). The bench is the one you rest at, as the game
     draws it (js/benches.js, from its files), at the Knight's scale and where the game sits him.
     With no bench known (a slot with no save's bench), the town bench, the most common one. */
  function benchHtml(scene) {
    const [key, y] = BE.SCENES[scene] || BE.SCENES.Crossroads_30;
    const [w, h, x] = BE.ART[key];
    return `<div class="hmC-bench" aria-hidden="true" style="--bw: ${w}; --bh: ${h}; --bx: ${x}; --by: ${y};">
      <img class="hmC-seat" src="assets/benches/${key}.png" alt="" width="${w}" height="${h}"><span class="hmC-kn"></span></div>`;
  }
  const fig = (k, v, big) => `<div class="hm-fig${big ? ' is-big' : ''}"><span class="hm-fig-k">${esc(k)}</span><span class="hm-fig-v">${v}</span></div>`;
  const played = (s) => (s >= 3600 ? `${num(Math.floor(s / 3600))}<span class="u">h</span> ` : '') + `${num(Math.floor(s / 60) % 60)}<span class="u">min</span>`;
  function ago(ms) {
    if (!ms) return '';
    const m = Math.round((ms - Date.now()) / 60000);
    try {
      const rtf = new Intl.RelativeTimeFormat(I.current, { numeric: 'auto' });
      return Math.abs(m) < 60 ? rtf.format(m, 'minute') : Math.abs(m) < 60 * 24 ? rtf.format(Math.round(m / 60), 'hour') : rtf.format(Math.round(m / 1440), 'day');
    } catch (e) { return ''; }
  }
  const areaVars = (a) => { const lt = (R.AREAS[a] || {}).light || 'crossroads';
    return `--area-l: var(--area-${lt}-light); --area-m: var(--area-${lt}-mid); --area-d: var(--area-${lt}-deep);`; };

  /* The link to the game's file: live, paused (a click to go on), the file gone, or none: imported
     and not following it (the game's all the same: it isn't changed here, App.saveLock). */
  function linkLine(n) {
    const lv = App.liveInfo();
    if (lv) {
      const btn = lv.state === 'paused' ? 'liveResume' : lv.state === 'lost' ? 'liveRelink' : '';
      return `<span class="hm-live is-${lv.state}"><i class="nav-live is-${lv.state}"></i>${esc(t('liveState_' + lv.state))}</span>
        ${btn ? `<button type="button" class="btn btn-primary" data-act="${btn}">${esc(t(btn))}</button>` : ''}`;
    }
    return `<span class="hm-live">${esc(t('homeImported'))}</span>
      ${L.canLive() ? `<button type="button" class="text-btn" data-act="liveFollow" data-value="${n}">${esc(t('liveFollow'))}</button>` : ''}`;
  }

  /* Where a change is on the Map (js/app-map.js, mapTargets): its target, or '' (a statue: Godhome). */
  function targetOf(c) {
    switch (c.kind) {
      case 'journal': return 'foe:' + c.id;
      case 'charm': return 'c112:charms:' + c.id;
      case 'item': { const cat = catOf(c.id); return cat ? `c112:${cat}:${c.id}` : ''; }
      case 'upgrade': return c.id === 'nail' ? 'c112:nail:nail' : 'collect:' + ({ masks: 'mask-shard', vessels: 'vessel-fragment', notches: 'charm-notch' }[c.id] || '');
      case 'spell': return 'c112:spells:' + c.id;
      case 'art': return 'c112:arts:' + c.id;
      case 'cloak': return 'cloak';
      case 'dream': return 'c112:dreamNail:dream-nail';
      case 'found': return 'collect:' + c.id;
      default: return '';
    }
  }
  function changesBlock() {
    const g = gained();
    const rows = g.list.map((c, i) => {
      if (c.kind === 'pct') return `<li class="hm-item" style="--i: ${i}"><span class="hm-item-art"></span><span class="hm-item-name">${esc(t('pgCompletion'))}</span>
        <span class="hm-item-v">${num(c.from)} → ${num(c.to)}${esc(pctSpace())}</span></li>`;
      const m = describe(c);
      return `<li class="hm-item" style="--i: ${i}"><span class="hm-item-art">${m.art ? `<img src="${m.art}" alt="" loading="lazy">` : m.pin ? App.pinArtHtml(m.pin) : ''}</span>
        <span class="hm-item-name"${NT}>${esc(m.name)}${m.sub ? `<small>${esc(m.sub)}</small>` : ''}</span>
        ${m.value ? `<span class="hm-item-v">${esc(m.value)}</span>` : m.note ? `<span class="tag hm-item-k">${esc(m.note)}</span>` : ''}${targetOf(c) ? App.mapPinHtml(targetOf(c), m.name) : ''}</li>`;
    }).join('');
    const when = g.saved && g.list.length ? `<span class="block-note">${esc(t('homeSinceNote', { when: ago(g.saved) }))}</span>` : '';
    return `<section class="hm-block"><h3 class="block-head">${esc(t('homeSince'))}${when}</h3>
      ${rows ? `<ul class="hm-list">${rows}</ul>` : App.emptyHtml(esc(t('homeSinceNone')))}</section>`;
  }

  /* What you carry (design/23, A; it took your shade's place on 1 Oct 2026, now a line under the
     area's map): the charms worn and the two figures they move most, the nail's damage per second
     and the hits until you die, to the Charms screen. */
  function buildBlock() {
    const b = App.state, s = App.sheet.stats, n = b.charms.length;
    const note = t(n === 1 ? 'homeBuildNoteOne' : 'homeBuildNote', { n: num(n), used: num(C.notchesUsed(b.charms)), max: num(b.notches) });
    const worn = n ? `<div class="hm-worn">${b.charms.map((id) => `<img src="assets/charms/${id}.png" alt="${esc(pick(D.CHARM_BY_ID[id]))}" title="${esc(pick(D.CHARM_BY_ID[id]))}" loading="lazy">`).join('')}</div>`
      : App.emptyHtml(esc(t('homeBuildNone')));
    const fig = (label, v, sub) => `<div><dt>${esc(label)}</dt><dd>${esc(v)}<small>${esc(sub)}</small></dd></div>`;
    return `<section class="hm-block"><h3 class="block-head">${esc(t('homeBuild'))}<span class="block-note">${esc(note)}</span></h3>
      ${worn}
      <dl class="hm-build">
        ${fig(t('dps'), App.fmtStat(s['nail.dps']), t('homeBuildNail', { nail: pick(D.NAILS[b.nail]), n: App.fmtStat(s['nail.damage']) }))}
        ${fig(t('hitsToDie'), App.fmtStat(s['health.hitsToDie']), t('homeBuildBody', { masks: num(b.masks), soul: App.fmtStat(s['soul.total']) }))}
      </dl>
      <button type="button" class="text-btn" data-act="view" data-value="charms">${esc(t('homeToCharms'))}</button></section>`;
  }

  // What you're missing in the area of your bench: the list under "Missing nearby" and the map's pins.
  const NEAR_MAX = 12;
  function nearLeft(area) {
    const found = new Set(App.progress.found);
    return CO.ITEMS.filter((it) => R.areaOf(it.scene) === area && !found.has(it.id));
  }
  function nearBlock() {
    const area = R.areaOf(App.progress.bench);
    if (!area) return `<section class="hm-block"><h3 class="block-head">${esc(t('homeNear'))}</h3>${App.emptyHtml(esc(t('homeNearUnknown')))}</section>`;
    const left = nearLeft(area);
    const cells = left.slice(0, NEAR_MAX).map((it) => {
      const k = D.COLLECTIBLE_KINDS[it.kind];
      // Each takes you to it on the Map; hovered, it lights its pin on the area's map (data-near).
      return `<button type="button" class="hm-near-cell" data-near="${it.id}" data-act="toMap" data-target="collect:${it.id}" data-name="${esc(pick(k))}" title="${esc(pick(k) + ' · ' + t('seeOnMap'))}"><img src="${D.art(k.art[0], k.art[1])}" alt="${esc(pick(k))}" loading="lazy">${esc(placeName(it.scene))}</button>`;
    }).join('');
    return `<section class="hm-block"><h3 class="block-head">${esc(t('homeNear'))}<span class="block-note"${NT}>${esc(pick(R.AREAS[area]))} · ${num(left.length)}</span></h3>
      ${left.length ? `<div class="hm-near">${cells}</div>` : App.emptyHtml(esc(t('homeNearNone')))}
      <button type="button" class="text-btn" data-act="view" data-value="map">${esc(t('homeOnMap'))}</button></section>`;
  }

  /* ── The area's map (design/17-home-alive.html, B) ──
     The game's own drawing of the area you rest in, as the Map screen draws it (js/app-map.js: the
     rooms you've mapped whole, the rest sketched or a ghost), with your bench and the Knight on it,
     your shade, and what you're missing there, each a way to it on the Map. An area the game's map
     doesn't draw (the Hive, Godhome, the White Palace…): none, and the title card stays centred. */
  const AREA_BOX = {};
  function areaBox(i) {
    if (AREA_BOX[i] !== undefined) return AREA_BOX[i];
    const rs = Object.values(M.ROOMS).filter((r) => r[0] === i);
    if (!rs.length) return (AREA_BOX[i] = null);
    const x0 = Math.min(...rs.map((r) => r[1] - r[3] / 2)), x1 = Math.max(...rs.map((r) => r[1] + r[3] / 2));
    const y0 = Math.min(...rs.map((r) => r[2] - r[4] / 2)), y1 = Math.max(...rs.map((r) => r[2] + r[4] / 2));
    return (AREA_BOX[i] = [x0, y0, x1 - x0, y1 - y0]);
  }
  // Your shade, where it waits and with how much: a line under the area's map (its pin is on it when it's there).
  function shadeLine() {
    const sh = App.progress.shade, area = sh && R.AREAS[R.areaOf(sh.scene)];
    return sh ? `<span class="hmB-shade">${esc(t('homeShadeLine', { area: area ? pick(area) : '?', geo: num(sh.geo) }))}</span>` : '';
  }
  function areaMapHtml(area, benchScene) {
    const i = M.AREA_IDS.indexOf(area), box = i >= 0 && areaBox(i);
    if (!box || !App.pgmRoomsSvg) return '';
    const [x, y, w, h] = box, pad = 0.4;
    const at = (p, body, cls = '', attrs = '') => `<g class="hmB-pin${cls}"${attrs} transform="translate(${p[0].toFixed(3)} ${(-p[1]).toFixed(3)})">${body}</g>`;
    const pr = App.progress, bench = benchScene && App.pgmBenchPoint(benchScene);
    // Only the kinds the Map's filter shows; the pin and its cell under Missing nearby share data-near.
    const left = nearLeft(area).filter((it) => App.pgmKindShown(it.kind));
    const near = left.slice(0, NEAR_MAX).map((it) => {
      const p = App.pgmItemPoint(it.id), k = D.COLLECTIBLE_KINDS[it.kind];
      return p ? at(p, `<image href="${D.art(k.art[0], k.art[1])}" x="-0.3" y="-0.3" width="0.6" height="0.6"/>`, '', ` data-near="${it.id}" data-act="toMap" data-target="collect:${it.id}" data-name="${esc(pick(k))}"`) : '';
    }).join('');
    const shade = pr.shade && pr.shade.x !== undefined && R.areaOf(pr.shade.scene) === area ? at([pr.shade.x, pr.shade.y], App.pgmAtlasSvg('shade', 0.8)) : '';
    const here = bench ? at(bench, `<circle class="hmB-ring" r="0.4"/>${App.pgmAtlasSvg('bench', 0.8)}<image href="${D.art('hud', 'knight')}" x="-0.3" y="-1.25" width="0.6" height="0.7"/>`, ' is-here') : '';
    return `<figure class="hmB-map">
      <svg class="hmB-svg" viewBox="${(x - pad).toFixed(3)} ${(-y - h - pad).toFixed(3)} ${(w + 2 * pad).toFixed(3)} ${(h + 2 * pad).toFixed(3)}" role="img" aria-label="${esc(t('homeMapLabel', { area: pick(R.AREAS[area]) }))}">
        <g>${App.pgmRoomsSvg(i)}</g>${near}${shade}${here}</svg>
      <figcaption class="hmB-cap"${NT}>${esc(pick(R.AREAS[area]))} · ${esc(t('homeMapLeft', { n: num(left.length) }))}${shadeLine()}</figcaption></figure>`;
  }

  /* ── The arrival (design/17-home-alive.html, C) ──
     What you had at the save before (hollow.prev), for the figures to count up from it and the
     bar to light what you just gained. The geo isn't kept there: it only shows. */
  function before() {
    let p = null;
    try { p = JSON.parse(load('hollow.prev') || 'null'); } catch (e) { p = null; }
    if (!p || !p.snap) return null;
    const g = CH.fromSnap(p.snap);
    return { pct: CP.count({ build: g.build, owned: g.owned, book: g.book, progress: g.progress }).total, journal: HJ.counts(g.book).completed };
  }

  /* The pieces of the area alive (design/17-home-alive.html), shared by your game and the
     invitation's example: the scene with its particles' canvas, the game's title ornament, and the
     bar out of 112 (what you had, what you just gained). */
  const SCENE = '<div class="hmA-scene" aria-hidden="true"><canvas class="hmA-fx"></canvas></div>';
  const orn = (cls) => `<img class="hmA-orn${cls}" src="${D.art('hunter', 'fleur')}" alt="" width="237" height="37">`;
  const pctBar = (had, now, max) => {
    const w = (v) => (v / max * 100).toFixed(2);
    return `<div class="hmC-bar" aria-hidden="true"><i class="is-had" style="width: ${w(had)}%"></i><i class="is-new" style="width: ${w(now - had)}%"></i></div>`;
  };

  /* ── The screen ── */
  function gameHtml(n, enter) {
    const meta = json('hollow.meta') || {};
    const area = R.areaOf(App.progress.bench);
    const r = CP.count({ build: App.state, owned: App.owned, book: App.hjBook(), progress: App.progress });
    const hj = HJ.counts(App.hjBook());
    const was = enter && before();
    const from = (k, v) => (was && was[k] < v ? was[k] : v);
    const pctFrom = was && was.pct < r.total ? was.pct : r.total;
    const slot = t('saveSlot', { n });
    const when = meta.saved ? ` · <span class="hm-ago" data-at="${meta.saved}">${esc(ago(meta.saved))}</span>` : '';
    const title = area
      ? `${orn(' is-top')}<span class="hmC-sup">${esc(t('homeRestingAt'))}</span><h3 class="hmC-area"${NT}>${esc(pick(R.AREAS[area]))}</h3>${orn('')}`
      : `<h3 class="hmC-area">${esc(slot)}</h3>`;
    // A figure that counts up from the save before (data-from → its own value): App's arrive().
    const up = (k, v) => `<b class="hm-up" data-from="${from(k, v)}" data-to="${v}">${num(enter ? from(k, v) : v)}</b>`;
    const map = areaMapHtml(area, App.progress.bench);
    const card = `<div class="hmC-card">
        ${title}
        ${benchHtml(App.progress.bench)}
        <div class="hm-link-row">${linkLine(n)}</div>
        ${area ? `<span class="hm-when">${esc(slot)}${when}</span>` : ''}
        <div class="hm-figs hmC-figs">
          ${fig(t('pgCompletion'), `${up('pct', r.total)}<span class="u">${esc(pctSpace())} / ${num(r.max)}</span>`, true)}
          ${meta.time ? fig(t('homeTime'), played(meta.time)) : ''}
          ${meta.geo != null && meta.time ? fig('Geo', num(meta.geo)) : ''}
          ${fig(t('navJournal'), `${up('journal', hj.completed)}<span class="u">/ ${num(hj.total)}</span>`)}
        </div>
        ${pctBar(pctFrom, r.total, r.max)}
      </div>`;
    return `<div class="hmC-hero${map ? ' has-map' : ''}">
        ${area ? SCENE : ''}
        ${card}${map}
      </div>
      <div class="hmC-cols">${changesBlock()}${buildBlock()}${nearBlock()}</div>`;
  }

  /* Nobody's game: the invitation shows what a game looks like here (an example bench, its
     figures and what it got last time, all from the site's own pieces) and asks for yours. Then
     what the site keeps of it, each opening its screen, and the other way in: just trying builds
     (a save is never made by hand: it's the game's, read here). The steps (the folder, the file)
     are the import sheet's: js/app-saves.js. */
  const DEMO = { area: 'city', bench: 'Ruins1_29', pct: 87, gainedPct: 2, time: 41 * 3600 + 12 * 60, geo: 2350, journal: [131, 146],
    gained: [{ kind: 'spell', id: 'dd', to: 1 }, { kind: 'charm', id: 'twister' }, { kind: 'journal', id: 'soul-master', done: true }] };
  const FEATS = [
    { view: 'progress', title: 'navProgress', text: 'homeFeatPct', art: D.art('effects', 'grub') },
    { view: 'map', title: 'navMap', text: 'homeFeatMap', art: D.art('effects', 'map') },
    { view: 'map', title: 'shadeTag', text: 'homeFeatShade', art: D.art('knight', 'shade') },
    { view: 'journal', title: 'navJournal', text: 'homeFeatJournal', art: D.art('hunter', 'book') },
  ];
  function inviteHtml() {
    const desk = App.isDesktop();
    const gained = DEMO.gained.map((c) => {
      const m = describe(c);
      return `<li class="hm-item"><span class="hm-item-art"><img src="${m.art}" alt=""></span>
        <span class="hm-item-name"${NT}>${esc(m.name)}</span>${m.note ? `<span class="tag hm-item-k">${esc(m.note)}</span>` : ''}</li>`;
    }).join('');
    const feats = FEATS.map((f) => `<button type="button" class="hmI-feat" data-act="view" data-value="${f.view}">
        <img src="${f.art}" alt=""><b>${esc(t(f.title))}</b><span>${esc(t(f.text))}</span></button>`).join('');
    // The call first, as the screen's title card; then the example, as your game will look; then
    // what the site keeps, and the other way in (design/18-connect-variants.html, A).
    const map = areaMapHtml(DEMO.area, DEMO.bench);
    return `<div class="hmI">
      <div class="hmI-cta">
        ${orn(' is-top')}
        <h3>${esc(t('homeConnect'))}</h3>
        <p>${esc(t(L.canLive() ? 'homeConnectLine' : 'homeConnectLineFile'))}</p>
        <button type="button" class="btn btn-primary btn-lg" data-act="homeImport">${esc(t('saveImport'))}</button>
        ${desk ? `<span class="hmI-drop">${esc(t('homeDrop'))}</span>` : ''}
      </div>
      <div class="hmI-demo" aria-hidden="true" inert>
        <div class="hmC-hero${map ? ' has-map' : ''}" style="${areaVars(DEMO.area)}">
          ${SCENE}
          <span class="tag hmI-tag">${esc(t('homeExample'))}</span>
          <div class="hmC-card">
            ${orn(' is-top')}<span class="hmC-sup">${esc(t('homeRestingAt'))}</span><h3 class="hmC-area"${NT}>${esc(pick(R.AREAS[DEMO.area]))}</h3>${orn('')}
            ${benchHtml(DEMO.bench)}
            <div class="hm-figs hmC-figs">
              ${fig(t('pgCompletion'), `${num(DEMO.pct)}<span class="u">${esc(pctSpace())} / ${num(112)}</span>`, true)}
              ${fig(t('homeTime'), played(DEMO.time))}
              ${fig('Geo', num(DEMO.geo))}
              ${fig(t('navJournal'), `${num(DEMO.journal[0])}<span class="u">/ ${num(DEMO.journal[1])}</span>`)}
            </div>
            ${pctBar(DEMO.pct - DEMO.gainedPct, DEMO.pct, 112)}
          </div>
          ${map}
          <div class="hmI-since"><span class="block-head">${esc(t('homeSince'))}</span><ul class="hm-list">${gained}</ul></div>
        </div>
      </div>
      <div class="hmI-feats">${feats}</div>
      <div class="hmI-or">
        <button type="button" class="hmI-way" data-act="view" data-value="charms"><img src="assets/charms/quickslash.png" alt="">
          <b>${esc(t('homeBuildsTitle'))}</b><span>${esc(t('homeBuildsText'))}</span></button>
      </div>
    </div>`;
  }

  /* The arrival plays when the screen opens, and again when the game saves something new while
     it's open (hollow.prev changes); not on every repaint. */
  let shownKey = null;
  function renderHome() {
    if (prefs.view !== 'home') { shownKey = null; stopAmbience(); return; }
    const n = App.activeSlot();
    const key = n + '|' + load('hollow.prev');
    const enter = !!n && key !== shownKey;
    shownKey = key;
    /* With a game, the screen's light is the area of your bench (css: .hm.has-area): one light, the
       frame's, where the title card used to paint its own over the section's. */
    const area = R.areaOf(App.progress.bench);
    const lit = n ? ` has-area${enter ? ' is-enter' : ''}" style="${areaVars(area)}` : '';
    el.home.innerHTML = `<div class="gear-body hm${lit}">${brackets}${screenHead(esc(t('navHome')))}${n ? gameHtml(n, enter) : inviteHtml()}</div>`;
    // The particles: your bench's area, or the example's in the invitation.
    const cv = el.home.querySelector('.hmA-fx');
    if (cv) ambience(cv, n ? area : DEMO.area); else stopAmbience();
    if (enter) countUp();
  }

  /* The figures count up from the save before (.hm-up: data-from → data-to), after the title card. */
  function countUp() {
    const figs = [...el.home.querySelectorAll('.hm-up')].filter((b) => b.dataset.from !== b.dataset.to);
    if (!figs.length || calm()) { for (const b of figs) b.textContent = num(Number(b.dataset.to)); return; }
    const t0 = performance.now() + COUNT_DELAY;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / COUNT_MS)), e = 1 - Math.pow(1 - p, 3);
      for (const b of figs) { if (!b.isConnected) return; const a = Number(b.dataset.from), z = Number(b.dataset.to); b.textContent = num(Math.round(a + (z - a) * e)); }
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const COUNT_DELAY = 1000, COUNT_MS = 1100;

  /* ── The area's ambience (design/17-home-alive.html, A) ──
     Each area's own particles over its scene, soft: the City's rain, the Peaks' glints, Greenpath's
     leaves, the Wastes' spores… Their colour is the area's light (--area-l) and, for the few that
     glow, soul's white (--ink-strong), read from the tokens. One loop, stopped when the screen
     goes, the tab hides or the motion is reduced (then one still frame). Kept across repaints
     while the area is the same, so a repaint doesn't make them jump. */
  const FX = {
    city: { n: 70, kind: 'rain' }, waterways: { n: 22, kind: 'bubble' }, crossroads: { n: 26, kind: 'mote' },
    dirtmouth: { n: 30, kind: 'wind' }, cliffs: { n: 40, kind: 'wind' }, greenpath: { n: 20, kind: 'leaf' },
    gardens: { n: 20, kind: 'leaf' }, fungal: { n: 30, kind: 'spore' }, fog: { n: 16, kind: 'bubble' },
    crystal: { n: 36, kind: 'glint' }, resting: { n: 30, kind: 'spore', glow: true }, deepnest: { n: 26, kind: 'dust' },
    basin: { n: 26, kind: 'dust' }, abyss: { n: 26, kind: 'dust' }, edge: { n: 70, kind: 'ash' },
    hive: { n: 22, kind: 'spore' }, colosseum: { n: 26, kind: 'mote' }, palace: { n: 26, kind: 'spore', glow: true },
    godhome: { n: 26, kind: 'spore', glow: true },
  };
  let fx = null;   // { area, ps, cv, raf }
  function stopAmbience() { if (fx && fx.raf) cancelAnimationFrame(fx.raf); if (fx) fx.raf = 0; }
  function ambience(cv, area) {
    stopAmbience();
    const cfg = FX[area] || FX.crossroads, box = cv.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1), W = box.width, H = box.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d');
    if (!g) return;
    g.scale(dpr, dpr);
    const css = getComputedStyle(cv), light = css.getPropertyValue('--area-l').trim(), white = css.getPropertyValue('--ink-strong').trim();
    const rnd = Math.random;
    const ps = fx && fx.area === area && fx.ps.length === cfg.n ? fx.ps
      : Array.from({ length: cfg.n }, () => ({ x: rnd() * W, y: rnd() * H, s: rnd(), a: rnd() * Math.PI * 2, v: 0.4 + rnd() * 0.8 }));
    fx = { area, ps, cv, raf: 0 };
    const still = calm();
    const draw = (now) => {
      if (!cv.isConnected) { stopAmbience(); return; }
      g.clearRect(0, 0, W, H);
      for (const p of ps) {
        if (!still) move(p, cfg.kind, now);
        paint(g, p, cfg, now, light, white);
        if (p.y > H + 20) { p.y = -20; p.x = rnd() * W; } else if (p.y < -20) { p.y = H + 20; p.x = rnd() * W; }
        if (p.x > W + 20) p.x = -20; else if (p.x < -20) p.x = W + 20;
      }
      g.globalAlpha = 1;
      fx.raf = still || document.hidden ? 0 : requestAnimationFrame(draw);
    };
    fx.draw = draw;
    fx.raf = requestAnimationFrame(draw);
  }
  function move(p, kind, now) {
    switch (kind) {
      case 'rain': p.y += 7 * p.v; p.x -= 1.2 * p.v; break;
      case 'ash': p.y += 0.9 * p.v; p.x += 0.8 + Math.sin(now / 900 + p.a) * 0.6; break;
      case 'wind': p.x += 3 * p.v; p.y += Math.sin(now / 700 + p.a) * 0.3; break;
      case 'leaf': p.y += 0.6 * p.v; p.x += Math.sin(now / 800 + p.a) * 0.9; break;
      case 'mote': p.y -= 0.15 * p.v; p.x += Math.sin(now / 1200 + p.a) * 0.35; break;
      case 'spore': case 'bubble': p.y -= 0.45 * p.v; p.x += Math.sin(now / 1200 + p.a) * 0.35; break;
      case 'dust': p.y += 0.25 * p.v; p.x += Math.sin(now / 1500 + p.a) * 0.2; break;
      default: break;
    }
  }
  function paint(g, p, cfg, now, light, white) {
    g.globalAlpha = 0.2 + p.s * 0.45;
    g.fillStyle = light; g.strokeStyle = light; g.lineWidth = 1;
    switch (cfg.kind) {
      case 'rain': g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 2.4, p.y - 14 * p.v); g.stroke(); break;
      case 'wind': g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 18 * p.v, p.y); g.stroke(); break;
      case 'ash': g.fillStyle = white; g.fillRect(p.x, p.y, 1 + p.s * 2, 1 + p.s * 2); break;
      case 'dust': g.fillRect(p.x, p.y, 1.5, 1.5); break;
      case 'leaf':
        g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(now / 600 + p.a));
        g.beginPath(); g.ellipse(0, 0, 4 + p.s * 3, 1.6 + p.s, 0, 0, Math.PI * 2); g.fill(); g.restore(); break;
      case 'glint': {
        const k = (Math.sin(now / 500 * p.v + p.a) + 1) / 2, r = 1 + k * 2.5;
        g.globalAlpha = k * 0.8; g.fillStyle = white; g.shadowColor = light; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(p.x, p.y - r * 2); g.lineTo(p.x + r * 0.5, p.y); g.lineTo(p.x, p.y + r * 2); g.lineTo(p.x - r * 0.5, p.y); g.fill();
        g.shadowBlur = 0; break;
      }
      default: {   // mote, spore, bubble
        const r = cfg.kind === 'bubble' ? 2 + p.s * 4 : 1 + p.s * 1.8;
        if (cfg.glow || cfg.kind === 'spore') { g.shadowColor = light; g.shadowBlur = 8; }
        if (cfg.glow) g.fillStyle = white;
        g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (cfg.kind === 'bubble') g.stroke(); else g.fill();
        g.shadowBlur = 0;
      }
    }
  }
  // Hidden, the loop stops (fx.raf is left at 0); back, it goes on where it was.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && fx && !fx.raf && fx.cv.isConnected && prefs.view === 'home' && !calm()) fx.raf = requestAnimationFrame(fx.draw);
  });

  /* A place under "Missing nearby" and its pin on the area's map light each other. */
  function lightNear(e) {
    const on = e.type === 'pointerover' || e.type === 'focusin' ? e.target.closest('[data-near]') : null;
    for (const x of el.home.querySelectorAll('[data-near].is-lit')) x.classList.remove('is-lit');
    if (on) for (const x of el.home.querySelectorAll(`[data-near="${on.dataset.near}"]`)) x.classList.add('is-lit');
  }
  for (const ev of ['pointerover', 'pointerout', 'focusin', 'focusout']) el.home.addEventListener(ev, lightNear);


  /* The bar's tab: its name alone. The link's state isn't here (it was, as a diamond, and it
     drew the eye on every screen): the header's save selector carries it, and Your game itself. */
  function paintHomeNav() {
    const a = document.getElementById('nav-home');
    if (!a) return;
    a.querySelector('.nav-lbl').textContent = t('navHome');
    a.querySelector('.nav-num').innerHTML = '';
    a.removeAttribute('aria-label');
    a.removeAttribute('title');
  }

  // "12 minutes ago" goes on counting while the screen is open.
  setInterval(() => {
    if (prefs.view !== 'home') return;
    for (const s of el.home.querySelectorAll('.hm-ago')) s.textContent = ago(Number(s.dataset.at));
  }, 60000);

  Object.assign(actions, {
    homeImport() { App.importFirstEmpty(); },
  });

  Object.assign(App, { renderHome, paintHomeNav, gainedLine });
})();
