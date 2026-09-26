/* js/app-home.js — Your game, the start screen (design/10-restructure.md, variant C · the bench):
   your real game at a glance. On top, the game's area title card for where you rest ("Resting
   at" over the area's name, on the area's own light), the state of the link to the game's file
   and the figures the game's profile screen shows (completion, time, geo) with the Journal's.
   Under it, three columns: what you got since the last save (js/changes.js, over the game as it
   was before the last sync, hollow.prev), your shade and what's missing in the area of your
   bench. The Inventory (js/app-game.js) is its own screen, next in the bar.
   In free mode (nobody's game) the screen is an invitation instead: an example game, connect
   yours (a button, or dropping the file on the screen), keep one by hand, or just try builds.
   Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, HJ = HK.hunter, F = HK.foes, R = HK.rooms, CO = HK.collectibles, CP = HK.completion, CH = HK.changes, L = HK.live, I = HK.i18n;
  const App = HK.app;
  const { t, pick, el, NT, esc, load, brackets, screenHead, actions, prefs, pctSpace } = App;

  const num = (n) => App.NF[0].format(n);
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
        return { name: m ? m.name : c.id, note: '', art: m ? m.art : '' };
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

  // The link to the game's file: live, paused (a click to go on), the file gone, or none (kept by hand).
  function linkLine(n) {
    const lv = App.liveInfo();
    if (lv) {
      const btn = lv.state === 'paused' ? 'liveResume' : lv.state === 'lost' ? 'liveRelink' : '';
      return `<span class="hm-live is-${lv.state}"><i class="nav-live is-${lv.state}"></i>${esc(t('liveState_' + lv.state))}</span>
        ${btn ? `<button type="button" class="btn btn-primary" data-act="${btn}">${esc(t(btn))}</button>` : ''}`;
    }
    return `<span class="hm-live">${esc(t('homeByHand'))}</span>
      ${L.canLive() ? `<button type="button" class="text-btn" data-act="liveFollow" data-value="${n}">${esc(t('liveFollow'))}</button>` : ''}`;
  }

  function changesBlock() {
    const g = gained();
    const rows = g.list.map((c) => {
      if (c.kind === 'pct') return `<li class="hm-item"><span class="hm-item-art"></span><span class="hm-item-name">${esc(t('pgCompletion'))}</span>
        <span class="hm-item-v">${num(c.from)} → ${num(c.to)}${esc(pctSpace())}</span></li>`;
      const m = describe(c);
      return `<li class="hm-item"><span class="hm-item-art">${m.art ? `<img src="${m.art}" alt="" loading="lazy">` : ''}</span>
        <span class="hm-item-name"${NT}>${esc(m.name)}${m.sub ? `<small>${esc(m.sub)}</small>` : ''}</span>
        ${m.value ? `<span class="hm-item-v">${esc(m.value)}</span>` : m.note ? `<span class="hm-item-k">${esc(m.note)}</span>` : ''}</li>`;
    }).join('');
    const when = g.saved && g.list.length ? `<span class="block-note">${esc(t('homeSinceNote', { when: ago(g.saved) }))}</span>` : '';
    return `<section class="hm-block"><h3 class="block-head">${esc(t('homeSince'))}${when}</h3>
      ${rows ? `<ul class="hm-list">${rows}</ul>` : `<p class="hm-empty">${esc(t('homeSinceNone'))}</p>`}</section>`;
  }

  function shadeBlock() {
    const sh = App.progress.shade;
    const area = sh && pick(R.AREAS[R.areaOf(sh.scene)]);
    return `<section class="hm-block"><h3 class="block-head">${esc(t('shadeTag'))}</h3>
      ${sh ? `<div class="hm-shade"><img src="${D.art('hud', 'knight')}" alt=""><p>${esc(t('shadeBanner', { area: area || '?', geo: num(sh.geo) }))}</p></div>
        <button type="button" class="text-btn" data-act="view" data-value="map">${esc(t('homeOnMap'))}</button>`
        : `<p class="hm-empty">${esc(t(App.progress.bench ? 'homeNoShade' : 'homeShadeUnknown'))}</p>`}</section>`;
  }

  function nearBlock() {
    const area = R.areaOf(App.progress.bench);
    if (!area) return `<section class="hm-block"><h3 class="block-head">${esc(t('homeNear'))}</h3><p class="hm-empty">${esc(t('homeNearUnknown'))}</p></section>`;
    const found = new Set(App.progress.found);
    const left = CO.ITEMS.filter((it) => R.areaOf(it.scene) === area && !found.has(it.id));
    const cells = left.slice(0, 12).map((it) => {
      const k = D.COLLECTIBLE_KINDS[it.kind];
      return `<span title="${esc(pick(k))}"><img src="${D.art(k.art[0], k.art[1])}" alt="${esc(pick(k))}" loading="lazy">${esc(placeName(it.scene))}</span>`;
    }).join('');
    return `<section class="hm-block"><h3 class="block-head">${esc(t('homeNear'))}<span class="block-note"${NT}>${esc(pick(R.AREAS[area]))} · ${num(left.length)}</span></h3>
      ${left.length ? `<div class="hm-near">${cells}</div>` : `<p class="hm-empty">${esc(t('homeNearNone'))}</p>`}
      <button type="button" class="text-btn" data-act="view" data-value="map">${esc(t('homeOnMap'))}</button></section>`;
  }

  /* ── The screen ── */
  function gameHtml(n) {
    const meta = json('hollow.meta') || {};
    const area = R.areaOf(App.progress.bench);
    const r = CP.count({ build: App.state, owned: App.owned, book: App.hjBook(), progress: App.progress });
    const hj = HJ.counts(App.hjBook());
    const slot = t('saveSlot', { n });
    const when = meta.saved ? ` · <span class="hm-ago" data-at="${meta.saved}">${esc(ago(meta.saved))}</span>` : '';
    const title = area
      ? `<span class="hmC-sup">${esc(t('homeRestingAt'))}</span><h3 class="hmC-area"${NT}>${esc(pick(R.AREAS[area]))}</h3>`
      : `<h3 class="hmC-area">${esc(slot)}</h3>`;
    return `<div class="hmC-hero" style="${areaVars(area)}">
        ${title}
        <img class="hmC-knight" src="${D.art('hud', 'knight')}" alt="">
        <div class="hm-link-row">${linkLine(n)}</div>
        ${area ? `<span class="hm-when">${esc(slot)}${when}</span>` : ''}
        <div class="hm-figs hmC-figs">
          ${fig(t('pgCompletion'), `${num(r.total)}<span class="u">${esc(pctSpace())} / ${num(r.max)}</span>`, true)}
          ${meta.time ? fig(t('homeTime'), played(meta.time)) : ''}
          ${meta.geo != null && meta.time ? fig('Geo', num(meta.geo)) : ''}
          ${fig(t('navJournal'), `${num(hj.completed)}<span class="u">/ ${num(hj.total)}</span>`)}
        </div>
      </div>
      <div class="hmC-cols">${changesBlock()}${shadeBlock()}${nearBlock()}</div>`;
  }

  /* Nobody's game: the invitation shows what a game looks like here (an example bench, its
     figures and what it got last time, all from the site's own pieces) and asks for yours. Then
     what the site keeps of it, each opening its screen, and the other two ways in: by hand, or
     just trying builds. The steps (the folder, the file) are the import sheet's: js/app-saves.js. */
  const DEMO = { area: 'city', pct: 87, time: 41 * 3600 + 12 * 60, geo: 2350, journal: [131, 146],
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
        <span class="hm-item-name"${NT}>${esc(m.name)}</span>${m.note ? `<span class="hm-item-k">${esc(m.note)}</span>` : ''}</li>`;
    }).join('');
    const feats = FEATS.map((f) => `<button type="button" class="hmI-feat" data-act="view" data-value="${f.view}">
        <img src="${f.art}" alt=""><b>${esc(t(f.title))}</b><span>${esc(t(f.text))}</span></button>`).join('');
    return `<div class="hmI">
      <div class="hmI-demo" aria-hidden="true" inert>
        <div class="hmC-hero" style="${areaVars(DEMO.area)}">
          <span class="hmI-tag">${esc(t('homeExample'))}</span>
          <span class="hmC-sup">${esc(t('homeRestingAt'))}</span><h3 class="hmC-area"${NT}>${esc(pick(R.AREAS[DEMO.area]))}</h3>
          <img class="hmC-knight" src="${D.art('hud', 'knight')}" alt="">
          <div class="hm-figs hmC-figs">
            ${fig(t('pgCompletion'), `${num(DEMO.pct)}<span class="u">${esc(pctSpace())} / ${num(112)}</span>`, true)}
            ${fig(t('homeTime'), played(DEMO.time))}
            ${fig('Geo', num(DEMO.geo))}
            ${fig(t('navJournal'), `${num(DEMO.journal[0])}<span class="u">/ ${num(DEMO.journal[1])}</span>`)}
          </div>
          <div class="hmI-since"><span class="block-head">${esc(t('homeSince'))}</span><ul class="hm-list">${gained}</ul></div>
        </div>
      </div>
      <div class="hmI-cta">
        <h3>${esc(t('homeConnect'))}</h3>
        <p>${esc(t(L.canLive() ? 'homeConnectLine' : 'homeConnectLineFile'))}</p>
        <button type="button" class="btn btn-primary" data-act="homeImport">${esc(t('saveImport'))}</button>
        ${desk ? `<span class="hmI-drop">${esc(t('homeDrop'))}</span>` : ''}
      </div>
      <div class="hmI-feats">${feats}</div>
      <div class="hmI-or">
        <button type="button" class="hmI-way" data-act="homeNew"><img src="${D.art('items', 'wanderers-journal')}" alt="">
          <b>${esc(t('homeByHandTitle'))}</b><span>${esc(t('homeByHandText'))}</span></button>
        <button type="button" class="hmI-way" data-act="view" data-value="charms"><img src="assets/charms/quickslash.png" alt="">
          <b>${esc(t('homeBuildsTitle'))}</b><span>${esc(t('homeBuildsText'))}</span></button>
      </div>
    </div>`;
  }

  function renderHome() {
    if (prefs.view !== 'home') return;
    const n = App.activeSlot();
    el.home.innerHTML = `<div class="gear-body hm">${brackets}${screenHead(esc(t('navHome')))}${n ? gameHtml(n) : inviteHtml()}</div>`;
  }

  /* The bar's tab carries the link's state, as the Journal's carries its entries: the diamond lit
     while it follows the game, hollow when it's paused or the file is gone. */
  function paintHomeNav() {
    const a = document.getElementById('nav-home');
    if (!a) return;
    const lv = App.liveInfo();
    a.querySelector('.nav-lbl').textContent = t('navHome');
    a.querySelector('.nav-num').innerHTML = lv ? `<i class="nav-live is-${lv.state}"></i>` : '';
    const lbl = lv ? `${t('navHome')} · ${t('liveState_' + lv.state)}` : t('navHome');
    a.setAttribute('aria-label', lbl);
    a.title = lbl;
  }

  // "12 minutes ago" goes on counting while the screen is open.
  setInterval(() => {
    if (prefs.view !== 'home') return;
    for (const s of el.home.querySelectorAll('.hm-ago')) s.textContent = ago(Number(s.dataset.at));
  }, 60000);

  Object.assign(actions, {
    homeImport() { App.importFirstEmpty(); },
    homeNew() { App.newInFirstEmpty(); },
  });

  Object.assign(App, { renderHome, paintHomeNav, gainedLine });
})();
