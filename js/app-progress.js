/* js/app-progress.js — the Progress screen: your game's completion, the 112% the game counts
   (js/completion.js), drawn as a tablet (design/09-progress.md, variant C): the figure the
   game's map shows, and one row per category of the wiki's fifteen, with its things as pips and
   its points. A row opens to show its things as plates, and a tap marks one.
   A thing is marked where the site already keeps it, so no two screens disagree: a boss is its
   Hunter's Journal entry, a charm is your collection, and the rest (equipment, Dreamers,
   Colosseum…) is hollow.progress. What changes your figures (masks, vessels, the nail, spells,
   arts, the cloaks, the Dream Nail) is marked on Your game: its plate takes you there.
   Below, the same tablet for the collectibles (js/collectibles.js): a row per kind, each thing
   with the area and place it's in, or who sells or gives it; a filter by area; and the two who
   give rewards, the Grubfather and the Seer, as their ladders. They're marked in
   hollow.progress (found); a save says them itself.
   Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, HJ = HK.hunter, F = HK.foes, PN = HK.pantheons, P = HK.progress, CP = HK.completion, R = HK.rooms, CO = HK.collectibles;
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
  // Hornet's two fights are one Journal entry: each is told apart by where it happens.
  const HORNET = { 'hornet-protector': 'greenpath', 'hornet-sentinel': 'edge' };
  // The items that are a yes or no of something that isn't their own id.
  const SPECIAL = { grimmchild: ['charm', 'grimm'], 'troupe-master-grimm': ['journal', 'grimm'], nkg: ['journal', 'nkg'] };

  function meta(cat, id) {
    const b = App.state;
    if (HORNET[id]) return { name: `${pick(bookName('hornet-protector'))} · ${pick(R.AREAS[HORNET[id]])}`, art: D.art('journal', 'hornet-protector') };
    if (id === 'troupe-master-grimm') return { name: pick(bookName('grimm')), art: D.art('journal', 'grimm') };
    if (cat === 'bosses' || cat === 'dreams' || cat === 'hive' || id === 'nkg') return { name: pick(bookName(id)), art: D.art('journal', id) };
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
    if (id.startsWith('pantheon-')) return { name: pick(PN.PANTHEON_BY_ID[id.slice(9)].name), art: '' };
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
  const artHtml = (m) => (m.art ? `<img src="${m.art}" alt="" loading="lazy">` : '<i class="pg-glyph" aria-hidden="true"></i>');
  const stateOf = (it) => (it.got >= it.max ? 'is-on' : it.got > 0 ? 'is-part' : '');
  // Several steps (a spell's two levels, the nail's four upgrades…) say how many; a piece of
  // equipment is worth 2 but it's one thing.
  const STEPPED = ['spells', 'masks', 'vessels', 'nail'];

  function plate(cat, it) {
    const m = meta(cat, it.id);
    const st = stateOf(it), on = st === 'is-on';
    const where = whereOf(cat, it.id);
    const val = STEPPED.includes(cat) ? `${it.got}/${it.max}` : on ? (m.note || '') : where === 'game' ? t('pgInGame') : t('notFound');
    const body = `<span class="gplate-art">${artHtml(m)}</span>
        <span class="gplate-name"${NT}>${esc(m.name)}</span>
        <span class="gplate-val${on && !STEPPED.includes(cat) ? '' : ' is-none'}">${esc(val)}</span>`;
    // The build's things aren't marked here: the plate takes you to Your game.
    if (where === 'game') {
      return `<button type="button" class="gplate is-far${st ? ' ' + st : ''}" data-act="view" data-value="game" title="${esc(t('pgInGameHint'))}">${body}</button>`;
    }
    return `<button type="button" class="gplate${st ? ' ' + st : ''}" data-act="pgMark" data-key="${cat}" data-id="${it.id}" aria-pressed="${on}"
        title="${esc(m.name + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}">${body}</button>`;
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
      </button>
      ${open ? `<div class="pg-open"><div class="pg-plates">${c.items.map((it) => plate(c.id, it)).join('')}</div></div>` : ''}
    </li>`;
  }

  /* ── The collectibles ── */
  // A map's area is the one it draws (the room is where Cornifer sells it).
  const MAP_AREA = { mapCrossroads: 'crossroads', mapGreenpath: 'greenpath', mapFogCanyon: 'fog', mapFungalWastes: 'fungal',
    mapDeepnest: 'deepnest', mapAbyss: 'basin', mapOutskirts: 'edge', mapCity: 'city', mapWaterways: 'waterways',
    mapCliffs: 'cliffs', mapMines: 'crystal', mapRoyalGardens: 'gardens', mapRestingGrounds: 'resting' };
  const areaOfItem = (it) => (it.kind === 'map' ? MAP_AREA[it.how[1]] : R.areaOf(it.scene));
  const AREA_ORDER = Object.keys(R.AREAS);
  const ITEMS = CO.ITEMS.slice().sort((a, b) => a.kind === b.kind ? AREA_ORDER.indexOf(areaOfItem(a)) - AREA_ORDER.indexOf(areaOfItem(b)) : 0);
  const ITEM = Object.fromEntries(CO.ITEMS.map((it) => [it.id, it]));
  const found = (id) => P.hasFound(App.progress, id);
  const kindArt = (k) => D.art(...D.COLLECTIBLE_KINDS[k].art);
  // Where it is: its area and the place inside it, as the game titles them.
  function whereOf(it) {
    const a = areaOfItem(it), pl = it.kind === 'map' ? '' : R.placeOf(it.scene);
    return [a && pick(R.AREAS[a]), pl && pick(R.PLACES[pl])].filter(Boolean).join(' · ');
  }
  // Who sells or gives it, when it isn't found.
  function sourceOf(it) {
    if (!it.src) return '';
    const [k, v] = it.src;
    if (k === 'sly' || k === 'salubra') return t('pgSrcShop', { who: pick(D.GIVERS[k]), geo: num(v) });
    if (k === 'seer') return t('pgSrcSeer', { who: pick(D.GIVERS.seer), n: num(v) });
    if (k === 'grubs') return t('pgSrcGrubs', { who: pick(D.GIVERS.grubfather), n: num(v) });
    if (k === 'colosseum') return pick(D.COMPLETION_NAMES['trial-' + v]);
    return '';
  }
  function findPlate(it) {
    const on = found(it.id);
    const name = whereOf(it) || pick(D.COLLECTIBLE_KINDS[it.kind]);
    const src = sourceOf(it);
    return `<button type="button" class="gplate${on ? ' is-on' : ''}" data-act="pgFind" data-id="${it.id}" aria-pressed="${on}"
        title="${esc(pick(D.COLLECTIBLE_KINDS[it.kind]) + ' · ' + name + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}">
        <span class="gplate-art"><img src="${kindArt(it.kind)}" alt="" loading="lazy"></span>
        <span class="gplate-name">${esc(name)}</span>
        <span class="gplate-val is-none">${esc(src || (on ? '' : t('notFound')))}</span>
      </button>`;
  }
  // A row of the tablet: its head (name, pips, points) and, open, its plates.
  function tabletRow(key, name, cells, got, max) {
    const open = prefs.pgOpen === key;
    return `<li class="pg-row${open ? ' is-open' : ''}${got === max ? ' is-full' : ''}">
      <button type="button" class="pg-head" data-act="pgRow" data-value="${key}" aria-expanded="${open}"
        aria-label="${esc(t('pgOpen', { cat: name, got: num(got), max: num(max) }))}">
        <span class="pg-name"${NT}>${esc(name)}</span>
        <span class="pg-pips" aria-hidden="true">${cells.map((c) => `<span class="pg-pip${c.on ? ' is-on' : ''}"><img src="${c.art}" alt="" loading="lazy"></span>`).join('')}</span>
        <span class="pg-pts"><b>${num(got)}</b><i class="u">/${num(max)}</i></span>
      </button>
      ${open ? `<div class="pg-open"><div class="pg-plates">${cells.map((c) => c.plate()).join('')}</div></div>` : ''}
    </li>`;
  }

  /* The Grubfather's and the Seer's ladders: what each step gives, which is a collectible (i), a
     charm (c) or your game's (p); each marked where it's kept. */
  const LADDERS = {
    grubfather: [[5, 'i', 'mask-shard-5-grubs'], [10, 'c', 'grubsong'], [16, 'i', 'rancid-egg-grubs'], [23, 'i', 'hallownest-seal-grubs'],
      [31, 'i', 'pale-ore-grubs'], [38, 'i', 'kings-idol-grubs'], [46, 'c', 'elegy']],
    seer: [[100, 'i', 'hallownest-seal-seer'], [300, 'i', 'pale-ore-seer'], [500, 'c', 'wielder'], [700, 'i', 'vessel-fragment-seer'],
      [900, 'p', 'dreamgate'], [1200, 'i', 'arcane-egg-seer'], [1500, 'i', 'mask-shard-seer'], [1800, 'p', 'dream-awakened'],
      [2400, 'p', 'seer-ascended']],
  };
  function stepOf(giver, [n, t2, id]) {
    const on = t2 === 'i' ? found(id) : t2 === 'c' ? App.owned.includes(id) : P.has(App.progress, id);
    const art = t2 === 'i' ? kindArt(ITEM[id].kind) : t2 === 'c' ? `assets/charms/${id}.png`
      : id === 'dreamgate' ? D.art('items', 'dreamgate') : id === 'dream-awakened' ? D.art('abilities', D.ABILITIES.awoken.art) : D.art('items', 'essence');
    const what = t2 === 'i' ? pick(D.COLLECTIBLE_KINDS[ITEM[id].kind]) : t2 === 'c' ? pick(D.CHARM_BY_ID[id])
      : id === 'dreamgate' ? pick(D.EQUIPMENT.find((x) => x.id === 'dreamgate')) : id === 'dream-awakened' ? pick(D.ABILITIES.awoken) : pick(D.COMPLETION_NAMES.ascension);
    const at = giver === 'seer' ? t('pgSrcSeer', { who: pick(D.GIVERS.seer), n: num(n) }) : t('pgSrcGrubs', { who: pick(D.GIVERS.grubfather), n: num(n) });
    const act = t2 === 'i' ? `data-act="pgFind" data-id="${id}"` : `data-act="pgStep" data-key="${t2}" data-id="${id}"`;
    return { on, art, plate: () => `<button type="button" class="gplate${on ? ' is-on' : ''}" ${act} aria-pressed="${on}" title="${esc(what + ' · ' + at)}">
        <span class="gplate-art"><img src="${art}" alt="" loading="lazy"></span>
        <span class="gplate-name"${NT}>${esc(what)}</span>
        <span class="gplate-val is-none">${esc(at)}</span></button>` };
  }

  function renderCollectibles() {
    const area = prefs.pgArea && R.AREAS[prefs.pgArea] ? prefs.pgArea : '';
    const inArea = (it) => !area || areaOfItem(it) === area;
    const present = AREA_ORDER.filter((a) => CO.ITEMS.some((it) => areaOfItem(it) === a));
    const chip = (id, label, light) => `<button type="button" class="pg-area${area === id ? ' is-on' : ''}" data-act="pgArea" data-value="${id}" aria-pressed="${area === id}"
        ${light ? `style="--dot: var(--area-${light}-light)"` : ''}><i class="pg-dot" aria-hidden="true"></i><span${NT}>${esc(label)}</span></button>`;
    const chips = chip('', t('pgAllAreas'), '') + present.map((a) => chip(a, pick(R.AREAS[a]), R.AREAS[a].light)).join('');
    const rows = CO.KINDS.map((k) => {
      const list = ITEMS.filter((it) => it.kind === k && inArea(it));
      if (!list.length) return '';
      const cells = list.map((it) => ({ on: found(it.id), art: kindArt(k), plate: () => findPlate(it) }));
      return tabletRow('c:' + k, pick(D.COLLECTIBLE_KINDS[k]), cells, cells.filter((c) => c.on).length, cells.length);
    }).join('');
    const ladders = area ? '' : `<h4 class="pg-sub">${esc(t('pgRewards'))}</h4><ol class="pg-rows">${Object.entries(LADDERS).map(([giver, steps]) => {
      const cells = steps.map((st) => stepOf(giver, st));
      return tabletRow('l:' + giver, pick(D.GIVERS[giver]), cells, cells.filter((c) => c.on).length, cells.length);
    }).join('')}</ol>`;
    return `<section class="pg-coll">
      <h3 class="pg-title">${esc(t('pgCollectibles'))}</h3>
      <p class="pg-lead">${esc(t('pgCollLead'))}</p>
      <div class="pg-areas" role="group" aria-label="${esc(t('pgAreaFilter'))}">${chips}</div>
      <ol class="pg-rows">${rows}</ol>
      ${ladders}
    </section>`;
  }

  function renderProgress() {
    if (prefs.view !== 'progress') return;
    const r = count();
    el.pg.innerHTML = `<div class="gear-body pg-body">${brackets}
      ${screenHead(esc(t('navProgress')))}
      <div class="pg-total">
        <span class="pg-total-k">${esc(t('pgCompletion'))}</span>
        <span class="pg-total-v">${num(r.total)}<span class="u">${esc(pctSpace())} / ${num(r.max)}</span></span>
        <p class="pg-lead">${esc(t('pgLead'))}</p>
      </div>
      <ol class="pg-rows">${r.categories.map(row).join('')}</ol>
      ${renderCollectibles()}
    </div>`;
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
  Object.assign(actions, {
    pgFind(node) { setProgress(P.toggleFound(App.progress, node.dataset.id)); },
    pgStep(node) {
      const id = node.dataset.id;
      if (node.dataset.key === 'c') markCharm(id);
      else setProgress(P.toggle(App.progress, id));
    },
    pgArea(node) {
      prefs.pgArea = node.dataset.value;
      savePrefs();
      render();
    },
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

  Object.assign(App, { renderProgress, paintPgNav });
})();
