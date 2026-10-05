/* js/app-progress.js — the Progress screen: your game's completion, the 112% the game counts
   (js/completion.js), drawn as a tablet (design/09-progress.md, variant C): the figure the
   game's map shows, and one row per category (the wiki's, regrouped: js/completion.js), with its things as pips and
   its points. A row opens to show its things as plates, and a tap marks one.
   A thing is marked where the site already keeps it, so no two screens disagree: a boss is its
   Hunter's Journal entry, a charm is your collection, and the rest (equipment, Dreamers,
   Colosseum…) is hollow.progress. What changes your figures (arts, the cloaks, the Dream Nail) is
   marked on Your game: its plate takes you there. Masks, vessels and the nail open on their pieces
   instead (design/19): the shards and fragments mark Your game's figure; the spells, each level
   on its own, and the nail's upgrades set it.
   Its second tab is the Map (js/app-map.js), with the collectibles on it; pgFind, their marking,
   is here.
   Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, HJ = HK.hunter, F = HK.foes, PN = HK.pantheons, P = HK.progress, CP = HK.completion, CO = HK.collectibles, C = HK.codec;
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
  const darkCls = App.darkCls;
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
      : on ? (m.note || '') : where === 'game' && !App.saveLock() ? t('pgInGame') : '';   // missing: its shadow says it
    const body = `<span class="gplate-art${darkCls(m.art)}">${artHtml(m)}</span>
        <span class="gplate-name"${NT}>${esc(m.name)}</span>
        <span class="gplate-val${on && !STEPPED.includes(cat) ? ' is-text' : ' is-none'}">${esc(val)}</span>`;
    // The build's things aren't marked here: the plate takes you to Your game.
    // Each with its pin to the Map, where it has a place there (js/app-map.js).
    const target = `c112:${cat}:${it.id}`;
    if (where === 'game') {
      return App.pinned(`<button type="button" class="gplate is-far${st ? ' ' + st : ''}" data-act="view" data-value="inventory" title="${esc(t('pgInGameHint'))}">${body}</button>`, target, m.name);
    }
    // In a save from the game (App.saveLock, js/app.js) the plate only says what it is: nothing marks it.
    const held = !!App.saveLock();
    return App.pinned(`<button type="button" class="gplate${st ? ' ' + st : ''}" data-act="pgMark" data-key="${cat}" data-id="${it.id}" aria-pressed="${on}" ${held ? 'disabled' : ''}
        title="${esc(held ? m.name : m.name + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}">${body}</button>`, target, m.name);
  }

  /* ── The rows that count pieces (design/19, variant A): masks, vessels and the nail ──
     The head draws what the 112% counts (4 masks, 3 vessels, 4 nails), each filling with the
     pieces Your game has; open, every piece with its place and its pin, grouped by how you get
     it, and a link to see them all on the Map. In free mode the pieces lead (pieceStep). */
  const PIECES = {
    masks: { kind: 'mask-shard', key: 'masks', base: D.HEALTH.baseMasks, max: D.HEALTH.maxMasks, loose: 'shards', per: 4, art: ['hud', 'mask'], piece: ['hud', 'mask-shard'] },
    vessels: { kind: 'vessel-fragment', key: 'vessels', base: 0, max: D.SOUL.maxVessels, loose: 'fragments', per: 3, art: ['hud', 'vessel'], piece: ['hud', 'vessel-frag'] },
  };
  const PIECE_OF = { 'mask-shard': PIECES.masks, 'vessel-fragment': PIECES.vessels };
  // The pieces Your game has: the whole ones' and the loose ones.
  const piecesHad = (pc) => (App.state[pc.key] - pc.base) * pc.per + P.count(App.progress, pc.loose);
  // The Nailsmith's prices (kb/02-arsenal.md): geo and Pale Ore for each upgrade.
  const NAIL_COST = [null, [250, 0], [800, 1], [2000, 2], [4000, 3]];
  const itemsOf = (kind) => CO.ITEMS.filter((it) => it.kind === kind);
  // A pip lit by a fraction (0 to 1): the shadowed picture, and the lit one cut from the bottom up.
  const fillPip = (src, f) => (f >= 1 ? `<span class="pg-pip is-on${darkCls(src)}"><img src="${src}" alt=""></span>`
    : f <= 0 ? `<span class="pg-pip${darkCls(src)}"><img src="${src}" alt=""></span>`
    : `<span class="pg-pip is-fill" style="--f:${f.toFixed(3)}"><img src="${src}" alt=""><img src="${src}" alt=""></span>`);
  // The spells, each level its own thing (its name, picture and pin), in the game's order.
  const SPELL_LEVELS = ['vs', 'dd', 'hw'].flatMap((k) => [[k, 1], [k, 2]]);
  const spellArt = (k, l) => D.art('spells', l === 2 ? k + '2' : k);
  function piecePips(cat) {
    if (cat === 'spells') return SPELL_LEVELS.map(([k, l]) => fillPip(spellArt(k, l), App.state.spells[k] >= l ? 1 : 0)).join('');
    if (cat === 'nail') return [1, 2, 3, 4].map((l) => fillPip(D.art('nails', l), App.state.nail >= l ? 1 : 0)).join('');
    const pc = PIECES[cat], had = piecesHad(pc);
    return Array.from({ length: pc.max - pc.base }, (_, i) => fillPip(D.art(...pc.art), Math.min(1, Math.max(0, (had - i * pc.per) / pc.per)))).join('');
  }
  // A piece: where it is, and what it asks for while you don't have it; a tap marks it.
  function piecePlate(it, art) {
    const on = P.hasFound(App.progress, it.id), name = App.placeName(it.scene) || pick(D.COLLECTIBLE_KINDS[it.kind]);
    const held = !!App.saveLock();
    const plate = `<button type="button" class="gplate${on ? ' is-on' : ''}" data-act="pgFind" data-id="${it.id}" aria-pressed="${on}" ${held ? 'disabled' : ''}
        title="${esc(held ? name : name + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}">
        <span class="gplate-art"><img src="${art}" alt="" loading="lazy"></span>
        <span class="gplate-name"${NT}>${esc(name)}</span>
        <span class="gplate-val is-none">${esc(on ? '' : App.priceOf(it))}</span></button>`;
    return App.pinned(plate, 'collect:' + it.id, name);
  }
  const group = (label, list, plates) => `<div class="pg-group"><p class="pg-sub">${esc(label)}<span>${num(list.filter((it) => P.hasFound(App.progress, it.id)).length)}/${num(list.length)}</span></p>
    <div class="pg-plates">${plates}</div></div>`;
  function piecesOpen(cat) {
    if (cat === 'spells') {
      /* A tap sets the spell's level (as Your game's picker): marking an upgrade brings the first
         level with it, as in the game; unmarking the first takes the upgrade too. */
      const held = !!App.saveLock();
      return `<div class="pg-plates">${SPELL_LEVELS.map(([k, l]) => {
        const on = App.state.spells[k] >= l, name = pick(D.SPELLS[k].levels[l]);
        return App.pinned(`<button type="button" class="gplate${on ? ' is-on' : ''}" data-act="seg" data-key="spells.${k}" data-value="${on ? l - 1 : l}" aria-pressed="${on}" ${held ? 'disabled' : ''}
          title="${esc(held ? name : name + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}"><span class="gplate-art${darkCls(spellArt(k, l))}"><img src="${spellArt(k, l)}" alt="" loading="lazy"></span>
          <span class="gplate-name"${NT}>${esc(name)}</span>
          <span class="gplate-val is-none"></span></button>`, `c112:spells:${k}${l}`, name);
      }).join('')}</div>`;
    }
    const all = (target, n) => `<p class="pg-all">${App.mapLinkHtml(target, t('pgCat_' + cat), t('pgSeeAll', { n: num(n) }))}</p>`;
    if (cat === 'nail') {
      const ores = itemsOf('pale-ore'), held = !!App.saveLock();
      const nails = [1, 2, 3, 4].map((l) => {
        const on = App.state.nail >= l, name = pick(D.NAILS[l]), [geo, ore] = NAIL_COST[l];
        return `<button type="button" class="gplate${on ? ' is-on' : ''}" data-act="seg" data-key="nail" data-value="${on ? l - 1 : l}" aria-pressed="${on}" ${held ? 'disabled' : ''}
          title="${esc(name)}"><span class="gplate-art${darkCls(D.art('nails', l))}"><img src="${D.art('nails', l)}" alt="" loading="lazy"></span>
          <span class="gplate-name"${NT}>${esc(name)}</span>
          <span class="gplate-val is-none">${esc(ore ? t('pgNailCost', { geo: num(geo), ore: num(ore) }) : `${num(geo)} geo`)}</span></button>`;
      }).join('');
      // The upgrades aren't collectibles: their group counts your nail.
      return all('c112:nail:nail', ores.length + 1)
        + `<div class="pg-group"><p class="pg-sub">${esc(t('pgUpgrades'))}<span>${num(App.state.nail)}/4</span></p><div class="pg-plates">${nails}</div></div>`
        + group(pick(D.COLLECTIBLE_KINDS['pale-ore']), ores, ores.map((it) => piecePlate(it, D.art('items', 'pale-ore'))).join(''));
    }
    const pc = PIECES[cat], list = itemsOf(pc.kind), art = D.art(...pc.piece);
    const how = (it) => (!it.src ? 'world' : it.src[0] === 'sly' ? 'sly' : 'rewards');
    const LABEL = { world: t('pgByWorld'), sly: t('pgmW_sly'), rewards: t('pgByRewards') };
    return all(`c112:${cat}:${cat}`, list.length) + ['world', 'sly', 'rewards'].map((g) => {
      const of = list.filter((it) => how(it) === g);
      return of.length ? group(LABEL[g], of, of.map((it) => piecePlate(it, art)).join('')) : '';
    }).join('');
  }
  /* The pieces lead: Your game's figure is never below the pieces marked (here or on the Map).
     Marking one past it adds a piece, the fourth loose shard making a mask; unmarking one when
     the figure was just the marks takes one away. A figure set higher on Your game (free mode
     starts with everything) stays: which pieces it counts beyond the marks isn't known. */
  const marked = (prog, pc) => itemsOf(pc.kind).filter((it) => P.hasFound(prog, it.id)).length;
  function pieceStep(prog, pc, on) {
    const top = (pc.max - pc.base) * pc.per, had = piecesHad(pc), m = marked(prog, pc);
    const n = Math.max(0, Math.min(top, on ? Math.max(had, m) : had === m + 1 ? m : had));
    const whole = pc.base + Math.floor(n / pc.per);
    return { state: whole !== App.state[pc.key] ? C.set(App.state, pc.key, whole) : null, progress: P.setCount(prog, pc.loose, n % pc.per) };
  }

  function row(c) {
    const open = prefs.pgOpen === c.id;
    const name = t('pgCat_' + c.id);
    const pieces = c.id === 'nail' || c.id === 'spells' || PIECES[c.id];
    const pips = pieces ? piecePips(c.id) : c.items.map((it) => {
      const m = meta(c.id, it.id);
      return `<span class="pg-pip ${stateOf(it)}${darkCls(m.art)}">${artHtml(m)}</span>`;
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
      ${!open ? '' : pieces ? `<div class="pg-open${App.saveLock() ? ' is-held' : ''}">${piecesOpen(c.id)}</div>`
        : `<div class="pg-open"><div class="pg-plates${App.saveLock() ? ' is-held' : ''}">${c.items.map((it) => plate(c.id, it)).join('')}</div></div>`}
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

  /* ── A row unfolding (design/20, variant B): the screen is repainted whole, so around that
     repaint the panel that opens grows from nothing while the one that closed (a stand-in at its
     height) folds away, at once: the row you tapped glides instead of jumping. Its plates fade in,
     one after another. Only on opening or closing a row; with reduced motion, nothing moves. ── */
  const FOLD_MS = 400;   // --dur-slow
  function foldBefore(id) {
    const head = el.pg.querySelector(`.pg-head[data-value="${id}"]`), open = el.pg.querySelector('.pg-row.is-open');
    return { top: head ? head.getBoundingClientRect().top : 0, was: prefs.pgOpen, h: open ? open.querySelector('.pg-open').offsetHeight : 0 };
  }
  function unfold(id, before) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const headOf = (x) => el.pg.querySelector(`.pg-head[data-value="${x}"]`);
    const panel = el.pg.querySelector('.pg-row.is-open .pg-open');
    const oldHead = before.was && before.was !== prefs.pgOpen && headOf(before.was);
    let ghost = null;
    if (oldHead && before.h) {
      ghost = document.createElement('div');
      ghost.className = 'pg-open is-folding';
      ghost.style.cssText = `height: ${before.h}px; padding: 0`;   // empty: all its height is the panel's
      oldHead.parentNode.appendChild(ghost);
    }
    let full = 0;
    if (panel) {
      panel.querySelectorAll('.gplate').forEach((g, i) => g.style.setProperty('--i', i));
      // Its whole height measured as it'll unfold (clipped, so its margins stay inside); then from
      // nothing, its padding too, or the rows under it would jump by it before it starts. The
      // transition comes after (is-folding), or it would ease the padding away instead.
      panel.style.overflow = 'hidden';
      full = panel.getBoundingClientRect().height;
      panel.style.cssText = 'height: 0; padding-block: 0; overflow: hidden';
      void panel.offsetHeight;
      panel.classList.add('is-in', 'is-folding');
      getComputedStyle(panel).height;
    }
    // The row you tapped starts where it was on screen.
    const head = headOf(id);
    if (head) window.scrollBy(0, head.getBoundingClientRect().top - before.top);
    // Both start from where they are now (the style flushed with the transition on), then go.
    void el.pg.offsetHeight;
    if (ghost) ghost.style.height = '0px';
    if (panel) panel.style.cssText = `height: ${full}px`;
    setTimeout(() => {
      if (ghost) ghost.remove();
      if (panel) { panel.style.cssText = ''; panel.classList.remove('is-folding'); }
    }, FOLD_MS + 50);
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
    pgFind(node) {
      const id = node.dataset.id, next = P.toggleFound(App.progress, id);
      const it = CO.ITEMS.find((x) => x.id === id), pc = it && PIECE_OF[it.kind];
      if (!pc || App.saveLock()) { setProgress(next); return; }
      const step = pieceStep(next, pc, P.hasFound(next, id));
      if (!step.state) { setProgress(step.progress); return; }
      // A whole one more or less: both stores, one repaint (commit's).
      App.progress = P.normalize(step.progress);
      App.saveProgress();
      App.commit(step.state);
    },
    pgRow(node) {
      const before = foldBefore(node.dataset.value);
      prefs.pgOpen = prefs.pgOpen === node.dataset.value ? '' : node.dataset.value;
      savePrefs();
      render();
      unfold(node.dataset.value, before);
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
