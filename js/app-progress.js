/* js/app-progress.js — the Progress screen: your game's completion, the 112% the game counts
   (js/completion.js), drawn as a tablet (design/09-progress.md, variant C): the figure the
   game's map shows, and one row per category (the wiki's, regrouped: js/completion.js), with its things as pips and
   its points. A row opens to show its things as plates, and a tap marks one.
   A thing is marked where the site already keeps it, so no two screens disagree: a boss is its
   Hunter's Journal entry, a charm is your collection, and the rest (equipment, Dreamers,
   Colosseum…) is hollow.progress. What changes your figures (masks, vessels, the nail, spells,
   arts, the cloaks, the Dream Nail) is marked on Your game: its plate takes you there.
   Its second tab is the Map (js/app-map.js), with the collectibles on it; pgFind, their marking,
   is here.
   Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, HJ = HK.hunter, F = HK.foes, PN = HK.pantheons, P = HK.progress, CP = HK.completion;
  const App = HK.app;
  const { t, pick, el, NT, esc, brackets, screenHead, render, actions, prefs, savePrefs, setProgress, setOwned, pctSpace } = App;

  const count = () => CP.count({ build: App.state, owned: App.owned, book: App.hjBook(), progress: App.progress });
  const num = (n) => App.NF[0].format(n);
  const pct = (n) => num(n) + pctSpace();

  /* ── What each thing is: its name, its picture and where it's marked ── */
  // The charms with two versions: the one you have, or the first.
  const VERSIONS = { heart: ['fheart', 'uheart'], greed: ['fgreed', 'ugreed'], strength: ['fstrength', 'ustrength'],
    king: ['kingsoul', 'voidheart'], grimm: ['grimmchild', 'melody'] };
  const versionOf = (base) => (VERSIONS[base] ? VERSIONS[base].find((v) => App.owned.includes(v)) || VERSIONS[base][0] : base);
  const bookName = (id) => { const r = HJ.ROW[id]; return (r && r.name) || (HJ.EXTRAS[id] || F.FOE_BY_ID[id] || {}).name; };
  // Hornet's two fights are one Journal entry (its picture): each by its title (D.COMPLETION_NAMES).
  const HORNET = { 'hornet-protector': 1, 'hornet-sentinel': 1 };
  // The items that are a yes or no of something that isn't their own id.
  const SPECIAL = { grimmchild: ['charm', 'grimm'], 'troupe-master-grimm': ['journal', 'grimm'], nkg: ['journal', 'nkg'] };

  function meta(cat, id) {
    const b = App.state;
    if (HORNET[id]) return { name: pick(D.COMPLETION_NAMES[id]), art: D.art('journal', 'hornet-protector') };
    if (id === 'troupe-master-grimm') return { name: pick(D.COMPLETION_NAMES[id]), art: D.art('journal', 'grimm') };
    // The Nightmare King's point is also the Troupe banished: the plate says so when that's how.
    if (id === 'nkg') return { name: pick(D.COMPLETION_NAMES.nkg), art: D.art('journal', 'nkg'), note: P.has(App.progress, 'banishment') ? t('pgBanished') : '' };
    if (cat === 'bosses' || cat === 'dreams' || id === 'nkg') return { name: pick(bookName(id)), art: D.art('journal', id) };
    if (cat === 'charms' || ['dreamshield', 'sprintmaster', 'weaversong', 'grimmchild'].includes(id)) {
      const v = versionOf(id === 'grimmchild' ? 'grimm' : id);
      return { name: pick(D.CHARM_BY_ID[v]), art: `assets/charms/${v}.png` };
    }
    const item = [...D.EQUIPMENT, ...D.KEY_ITEMS].find((x) => x.id === id);
    if (item) return { name: pick(item), art: D.art('items', id) };
    if (id === 'mothwing-cloak' || id === 'shade-cloak') {
      const c = id === 'mothwing-cloak' ? 1 : 2;
      return { name: pick(D.ABILITIES.cloaks[c]), art: D.art('abilities', 'cloak' + c) };
    }
    if (cat === 'spells') {
      const lvl = b.spells[id];
      return { name: pick(D.SPELLS[id].levels[Math.max(1, lvl)]), art: D.art('spells', lvl === 2 ? id + '2' : id) };
    }
    if (cat === 'arts') return { name: pick(D.ARTS[id]), art: D.art('arts', id) };
    if (id === 'masks') return { name: t('masksField'), art: D.art('hud', 'mask') };
    if (id === 'vessels') return { name: t('vesselsField'), art: D.art('hud', 'vessel') };
    if (id === 'nail') return { name: pick(D.NAILS[b.nail]), art: D.art('nails', b.nail) };
    if (id === 'dream-nail') return { name: pick(D.ABILITIES.dream), art: D.art('abilities', D.ABILITIES.dream.art) };
    if (id === 'dream-awakened') return { name: pick(D.ABILITIES.awoken), art: D.art('abilities', D.ABILITIES.awoken.art) };
    if (id === 'seer-ascended') return { name: pick(D.COMPLETION_NAMES[id]), art: D.art('items', 'essence'), note: t('pgSeerNote') };
    // A pantheon: the statue of its last fight, in the Hall of Gods.
    if (id.startsWith('pantheon-')) {
      const p = PN.PANTHEON_BY_ID[id.slice(9)], last = p.rooms.filter((r) => r.type === 'fight').pop();
      return { name: pick(p.name), art: last ? D.art('hall', last.foe) : '' };
    }
    // The Dreamers and the Colosseum's trials: the game's own pins for them on its map.
    if (cat === 'dreamers') return { name: pick(D.COMPLETION_NAMES[id]), art: '', pin: 'dreamer-' + id };
    if (cat === 'colosseum') return { name: pick(D.COMPLETION_NAMES[id]), art: '', pin: 'colosseum' };
    return { name: pick(D.COMPLETION_NAMES[id]) || id, art: '' };
  }

  // Where a tap marks it: 'journal' | 'charm' | 'progress', or 'game' (it's the build's: Your game).
  function whereOf(cat, id) {
    if (SPECIAL[id]) return SPECIAL[id][0];
    const it = CP.CATEGORIES.find((c) => c.id === cat).items.find((x) => x[0] === id);
    return typeof it[1] === 'function' ? 'game' : it[1];
  }

  /* ── The tablet ── */
  // A thing's picture, or the rule's diamond where there's none (the Dreamers, the trials, the pantheons).
  const artHtml = (m) => (m.art ? `<img src="${m.art}" alt="" loading="lazy">` : m.pin && App.pinArtHtml ? App.pinArtHtml(m.pin) : '<i class="pg-glyph" aria-hidden="true"></i>');
  const stateOf = (it) => (it.got >= it.max ? 'is-on' : it.got > 0 ? 'is-part' : '');
  // Several steps (a spell's two levels, the nail's four upgrades…) say how many; a piece of
  // equipment is worth 2 but it's one thing.
  const STEPPED = ['spells', 'masks', 'vessels', 'nail'];

  function plate(cat, it) {
    const m = meta(cat, it.id);
    const st = stateOf(it), on = st === 'is-on';
    const where = whereOf(cat, it.id);
    // The masks as you have them (5 to 9): their points are the ones past the first five.
    // What's marked on the Inventory says so, unless the save is the game's (nothing's marked by hand).
    const val = cat === 'masks' ? `${App.state.masks}/${D.HEALTH.maxMasks}` : STEPPED.includes(cat) ? `${it.got}/${it.max}`
      : on ? (m.note || '') : where === 'game' && !App.saveLock() ? t('pgInGame') : t('notFound');
    const body = `<span class="gplate-art">${artHtml(m)}</span>
        <span class="gplate-name"${NT}>${esc(m.name)}</span>
        <span class="gplate-val${on && !STEPPED.includes(cat) ? ' is-text' : ' is-none'}">${esc(val)}</span>`;
    // The build's things aren't marked here: the plate takes you to Your game.
    // Each with its pin to the Map, where it has a place there (js/app-map.js).
    const target = `c112:${cat}:${it.id}`;
    if (where === 'game') {
      return App.pinned(`<button type="button" class="gplate is-far${st ? ' ' + st : ''}" data-act="view" data-value="game" title="${esc(t('pgInGameHint'))}">${body}</button>`, target, m.name);
    }
    // In a save from the game (App.saveLock, js/app.js) the plate only says what it is: nothing marks it.
    const held = !!App.saveLock();
    return App.pinned(`<button type="button" class="gplate${st ? ' ' + st : ''}" data-act="pgMark" data-key="${cat}" data-id="${it.id}" aria-pressed="${on}" ${held ? 'disabled' : ''}
        title="${esc(held ? m.name : m.name + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}">${body}</button>`, target, m.name);
  }

  function row(c) {
    const open = prefs.pgOpen === c.id;
    const name = t('pgCat_' + c.id);
    const pips = c.items.map((it) => {
      const m = meta(c.id, it.id);
      return `<span class="pg-pip ${stateOf(it)}">${artHtml(m)}</span>`;
    }).join('');
    const full = c.got === c.max;
    return `<li class="pg-row${open ? ' is-open' : ''}${full ? ' is-full' : ''}">
      <button type="button" class="pg-head" data-act="pgRow" data-value="${c.id}" aria-expanded="${open}"
        aria-label="${esc(t('pgOpen', { cat: name, got: num(c.got), max: num(c.max) }))}">
        <span class="pg-name">${esc(name)}</span>
        <span class="pg-pips" aria-hidden="true">${pips}</span>
        <span class="pg-pts"><b>${num(c.got)}</b><i class="u">/${num(c.max)}</i></span>
        <span class="disc-ring" aria-hidden="true">${App.chevron(open)}</span>
      </button>
      ${open ? `<div class="pg-open"><div class="pg-plates${App.saveLock() ? ' is-held' : ''}">${c.items.map((it) => plate(c.id, it)).join('')}</div></div>` : ''}
    </li>`;
  }

  function renderProgress() {
    if (prefs.view !== 'progress' && prefs.view !== 'map') return;
    const r = count();
    /* Two screens in this section: the 112% (the game's figure and its fourteen categories) and
       the Map, with the collectibles on it (js/app-map.js). */
    const head = `${brackets}${screenHead(esc(t(prefs.view === 'map' ? 'navMap' : 'navProgress')))}`;
    el.pg.classList.toggle('is-big', prefs.view === 'map' && !!prefs.pgMapBig);
    if (prefs.view === 'map') {
      el.pg.innerHTML = `<div class="gear-body pg-body">${head}${App.renderPgMap()}</div>`;
      App.pgMapAfterPaint();
      return;
    }
    const body = `<div class="pg-total">
          <span class="pg-total-k">${esc(t('pgCompletion'))}</span>
          <span class="pg-total-v">${num(r.total)}<span class="u">${esc(pctSpace())} / ${num(r.max)}</span></span>
        </div>
        <ol class="pg-rows">${r.categories.map(row).join('')}</ol>`;
    el.pg.innerHTML = `<div class="gear-body pg-body">${head}${body}</div>`;
  }

  // The screen bar's tab carries the figure, as the Journal's carries its entries.
  function paintPgNav() {
    const a = document.getElementById('nav-pg');
    if (!a) return;
    const total = pct(count().total);
    a.querySelector('.nav-lbl').textContent = t('navProgress');
    a.querySelector('.nav-num').textContent = total;
    const lbl = t('pgNavHint', { pct: total });
    a.setAttribute('aria-label', lbl);
    a.title = lbl;
  }

  /* ── Marking ── */
  function markCharm(base) {
    const vs = VERSIONS[base] || [base];
    const has = vs.some((v) => App.owned.includes(v));
    setOwned(has ? App.owned.filter((x) => !vs.includes(x)) : [...App.owned, vs[0]]);
  }
  // What writes your game's record: refused in a save from the game (App.saveLock, js/app.js).
  App.edits('pgFind', 'pgMark');
  Object.assign(actions, {
    pgFind(node) { setProgress(P.toggleFound(App.progress, node.dataset.id)); },
    pgRow(node) {
      prefs.pgOpen = prefs.pgOpen === node.dataset.value ? '' : node.dataset.value;
      savePrefs();
      render();
    },
    pgMark(node) {
      const cat = node.dataset.key, id = node.dataset.id;
      const it = count().categories.find((c) => c.id === cat).items.find((x) => x.id === id);
      const on = it.got >= it.max;
      const [where, key] = SPECIAL[id] || [whereOf(cat, id), id];
      if (where === 'progress') { setProgress(P.toggle(App.progress, key, !on)); return; }
      if (where === 'charm') { markCharm(key); return; }
      // Nightmare King or the banishment: unmarking takes both away.
      if (id === 'nkg' && on && P.has(App.progress, 'banishment')) App.progress = P.toggle(App.progress, 'banishment', false);
      App.hjMark(key, !on);
      if (id === 'nkg') App.saveProgress();
      render();
    },
  });

  // The Map (js/app-map.js) shows the 112%'s things too: it reads them as the tablet does.
  Object.assign(App, { renderProgress, paintPgNav, pgCount: count, pgMeta: meta, pgWhereOf: whereOf });
})();
