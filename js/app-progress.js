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
   is here. And inside the screen, two tabs (prefs.pgShow): the 112% and the game's achievements
   (js/achievements.js), as rows by group like the 112%'s, each achievement a plate with the
   game's icon and text. Two layers there, never mixed: your Steam account's record, read from
   Steam's own file (js/steam.js, hollow.steam, imported or followed here), and what this save
   fulfils (the rules). With Steam in, the account leads and the save is a figure under its headline.
   A switch over the rows, "Only what's missing" (prefs.pgMissing, both tabs), takes away the full
   rows and the plates you have; an open row's pips stay, they're its summary.
   Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, HJ = HK.hunter, F = HK.foes, PN = HK.pantheons, P = HK.progress, CP = HK.completion, CO = HK.collectibles, C = HK.codec, A = HK.achievements, ST = HK.steam, L = HK.live;
  const App = HK.app;
  const { t, pick, el, NT, esc, brackets, screenHead, render, actions, prefs, savePrefs, setProgress, setOwned, pctSpace } = App;

  const count = () => CP.count({ build: App.state, owned: App.owned, book: App.hjBook(), progress: App.progress });
  const missingOnly = () => !!prefs.pgMissing;
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
      return { name: pick(D.CHARM_BY_ID[v]), art: App.charmArt(v) };
    }
    const item = [...D.EQUIPMENT, ...D.KEY_ITEMS, ...D.MAP_ITEMS].find((x) => x.id === id);
    if (item) return { name: pick(item), art: D.art('items', id) };
    // Kingsoul's two halves, each as the Map draws it.
    if (id === 'queen-fragment' || id === 'king-fragment') return { name: pick(D.WHITE_FRAGMENT), art: D.art('items', id === 'queen-fragment' ? 'white-fragment-left' : 'white-fragment-right') };
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
    // Mister Mushroom met in his seven places: Passing of the Age's icon is his.
    if (id === 'mushroom-seven') return { name: pick(D.MISTER_MUSHROOM), art: D.art('achievements', 'passing-of-the-age') };
    // What only an achievement reads (Salubra's blessing, Zote dead, the Nailsmith's fate…):
    // the achievement it earns, by its name and icon.
    const feat = A.ACHIEVEMENTS.find((a) => a.mark && a.mark.progress === id);
    if (feat) return { name: pick(feat.name), art: D.art('achievements', feat.id), note: t('homeFeat') };
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
    masks: { kind: 'mask-shard', key: 'masks', base: D.HEALTH.baseMasks, max: D.HEALTH.maxMasks, loose: 'shards', per: 4, art: ['hud', 'mask'], piece: ['hud', 'mask-shard'], pips: 'mask-pieces' },
    vessels: { kind: 'vessel-fragment', key: 'vessels', base: 0, max: D.SOUL.maxVessels, loose: 'fragments', per: 3, art: ['hud', 'vessel'], piece: ['hud', 'vessel-frag'], pips: 'vessel-pieces' },
  };
  const PIECE_OF = { 'mask-shard': PIECES.masks, 'vessel-fragment': PIECES.vessels };
  // The pieces Your game has: the whole ones' and the loose ones.
  const piecesHad = (pc) => (App.state[pc.key] - pc.base) * pc.per + P.count(App.progress, pc.loose);
  // The Nailsmith's prices (kb/02-arsenal.md): geo and Pale Ore for each upgrade.
  const NAIL_COST = [null, [250, 0], [800, 1], [2000, 2], [4000, 3]];
  const itemsOf = (kind) => CO.ITEMS.filter((it) => it.kind === kind);
  const pip = (src, on) => `<span class="pg-pip${on ? ' is-on' : ''}${darkCls(src)}"><img src="${src}" alt=""></span>`;
  // The spells, each level its own thing (its name, picture and pin), in the game's order.
  const SPELL_LEVELS = ['vs', 'dd', 'hw'].flatMap((k) => [[k, 1], [k, 2]]);
  const spellArt = (k, l) => D.art('spells', l === 2 ? k + '2' : k);
  function piecePips(cat) {
    if (cat === 'spells') return SPELL_LEVELS.map(([k, l]) => pip(spellArt(k, l), App.state.spells[k] >= l)).join('');
    if (cat === 'nail') return [1, 2, 3, 4].map((l) => pip(D.art('nails', l), App.state.nail >= l)).join('');
    /* The masks and vessels as the game's Inventory assembles them (tools/extract-pieces.py): each
       pip the empty one and its shards or fragments laid in one by one, the game's own pictures
       of each count. They carry their light: none takes the shadow of what's missing. */
    const pc = PIECES[cat], had = piecesHad(pc);
    return Array.from({ length: pc.max - pc.base }, (_, i) => {
      const n = Math.min(pc.per, Math.max(0, had - i * pc.per));
      return `<span class="pg-pip is-on is-pieces"><img src="${D.art('hud', `${pc.pips}-${n}`)}" alt=""></span>`;
    }).join('');
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
  const group = (label, list, plates) => {
    const n = list.filter((it) => P.hasFound(App.progress, it.id)).length;
    return `<div class="pg-group${n === list.length ? ' is-full' : ''}"><p class="pg-sub">${esc(label)}<span>${num(n)}/${num(list.length)}</span></p>
    <div class="pg-plates">${plates}</div></div>`;
  };
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
        + `<div class="pg-group${App.state.nail === 4 ? ' is-full' : ''}"><p class="pg-sub">${esc(t('pgUpgrades'))}<span>${num(App.state.nail)}/4</span></p><div class="pg-plates">${nails}</div></div>`
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

  // With the switch on, a full row isn't drawn; the pref keeps it open, so switching off brings
  // it back as it was.
  function row(c) {
    const full = c.got === c.max;
    if (missingOnly() && full) return '';
    const open = prefs.pgOpen === c.id;
    const name = t('pgCat_' + c.id);
    const pieces = c.id === 'nail' || c.id === 'spells' || PIECES[c.id];
    const pips = pieces ? piecePips(c.id) : c.items.map((it) => {
      const m = meta(c.id, it.id);
      return `<span class="pg-pip ${stateOf(it)}${darkCls(m.art)}">${artHtml(m)}</span>`;
    }).join('');
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

  /* ── The achievements (js/achievements.js): the same tablet, one row per group ── */
  const feats = () => A.count({ build: App.state, owned: App.owned, book: App.hjBook(), progress: App.progress, meta: App.meta }, App.feats);
  // Your Steam account's record (hollow.steam), or null: then the save's figures lead.
  const account = () => (App.account ? A.account(App.account) : null);
  const fmtDate = (ms) => { try { return new Intl.DateTimeFormat(prefs.lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ms)); } catch (e) { return ''; } };
  // Where one is marked when it isn't by hand: the screen that keeps what it reads.
  const FAR_KEY = { inventory: 'featInInventory', map: 'featOnMap', journal: 'featInJournal', progress: 'featInCompletion' };
  function featPlate(it, acc) {
    const a = A.BY_ID[it.id], m = a.mark || {};
    const name = pick(a.name), text = pick(a.text);
    const art = `<span class="gplate-art"><img src="${D.art('achievements', a.id)}" alt="" loading="lazy"></span>`;
    // Hidden by the game until earned: here always shown, with the game's word for it.
    const tag = a.hidden ? `<span class="ach-tag" title="${esc(t('featSecretHint'))}">${esc(t('featSecret'))}</span>` : '';
    const label = name + ' · ' + text;
    // Its pin to the Map at the corner, as the 112%'s plates carry (App.pinned), where the Map has its place.
    const pin = (plate) => (a.guide && a.guide.map ? App.pinned(plate, a.guide.map, name) : plate);
    if (acc) {
      /* The account's: lit when it has it (dated, from Steam's file). By hand the plate marks
         the account; with Steam's file nothing is marked here: the file answers. */
      const on = acc.has(a.id), when = acc.time(a.id), hand = App.account.source === 'hand';
      const unlocked = on && !hand ? `<span class="ach-when">${esc(when ? t('featUnlockedOn', { date: fmtDate(when * 1000) }) : t('featUnlocked'))}</span>` : '';
      const body = `${art}<span class="gplate-name"${NT}>${esc(name)}</span>
        <span class="gplate-val is-text ach-text">${tag}<span${NT}>${esc(text)}</span>${unlocked}</span>`;
      if (hand) {
        return pin(`<button type="button" class="gplate ach${on ? ' is-on' : ''}" data-act="pgAcct" data-id="${a.id}" aria-pressed="${on}"
          title="${esc(label + ' · ' + t(on ? 'pgUnmark' : 'pgMark'))}">${body}</button>`);
      }
      return pin(`<button type="button" class="gplate ach${on ? ' is-on' : ''}" disabled data-id="${a.id}" aria-pressed="${on}" title="${esc(label)}">${body}</button>`);
    }
    const hint = it.sure ? '' : it.hint === 'likely' ? t('featLikely') : t('featByHand');
    const body = `${art}<span class="gplate-name"${NT}>${esc(name)}</span>
        <span class="gplate-val is-text ach-text">${tag}<span${NT}>${esc(text)}</span>${hint ? `<span class="ach-hint">${esc(hint)}</span>` : ''}</span>`;
    const cls = `gplate ach${it.on ? ' is-on' : ''}`;
    // The ones the save can't always tell: marked by hand, here, even in a save from the game.
    if (a.hand && !it.sure) {
      return pin(`<button type="button" class="${cls}" data-act="pgFeat" data-id="${a.id}" aria-pressed="${it.on}"
        title="${esc(label + ' · ' + t(it.on ? 'pgUnmark' : 'pgMark'))}">${body}</button>`);
    }
    // What another screen keeps (masks, grubs, the Journal's count…): marked there, not here.
    if (m.far) {
      return pin(`<button type="button" class="${cls} is-far" disabled data-id="${a.id}" aria-pressed="${it.on}" title="${esc(label + ' · ' + t(FAR_KEY[m.far]))}">${body}</button>`);
    }
    // A progress id or a Journal entry: marked here, where the site keeps it, as the 112% does.
    // In a save from the game nothing marks it; nor what the save already settled (an ending).
    const held = !!App.saveLock() || a.hand;
    return pin(`<button type="button" class="${cls}" data-act="pgAch" data-id="${a.id}" aria-pressed="${it.on}" ${held ? 'disabled' : ''}
        title="${esc(held ? label : label + ' · ' + t(it.on ? 'pgUnmark' : 'pgMark'))}">${body}</button>`);
  }
  function featRow(g, acc) {
    const key = 'f:' + g.id;
    const name = t('featGroup_' + g.id);
    // The row counts the account when Steam is in, this save when not: never both.
    const lit = (it) => (acc ? acc.has(it.id) : it.on);
    const done = g.items.filter(lit).length;
    if (missingOnly() && done === g.max) return '';
    const open = prefs.pgOpen === key;
    const pips = g.items.map((it) => `<span class="pg-pip${lit(it) ? ' is-on' : ''}"><img src="${D.art('achievements', it.id)}" alt=""></span>`).join('');
    const hand = !acc && g.items.some((it) => !it.sure);
    return `<li class="pg-row${open ? ' is-open' : ''}${done === g.max ? ' is-full' : ''}">
      <button type="button" class="pg-head" data-act="pgRow" data-value="${key}" aria-expanded="${open}"
        aria-label="${esc(t('pgOpen', { cat: name, got: num(done), max: num(g.max) }))}">
        <span class="pg-name">${esc(name)}</span>
        <span class="pg-pips" aria-hidden="true">${pips}</span>
        <span class="pg-pts"><b>${num(done)}</b><i class="u">/${num(g.max)}</i></span>
        <span class="disc-ring" aria-hidden="true">${App.chevron(open)}</span>
      </button>
      ${!open ? '' : `<div class="pg-open"><div class="pg-plates">${g.items.map((it) => featPlate(it, acc)).join('')}</div>${hand ? `<p class="ach-note">${esc(t('featHandNote'))}</p>` : ''}</div>`}
    </li>`;
  }
  // The 112% · Achievements, under the title: the same text tabs Combat has.
  function pgTabs(r, n) {
    const tab = (v, label, x) => `<button type="button" class="pg-tab${prefs.pgShow === v ? ' is-on' : ''}" data-act="pgShow" data-value="${v}" aria-pressed="${prefs.pgShow === v}">${esc(label)} <span class="pg-tab-n">${esc(x)}</span></button>`;
    return `<div class="pg-tabs">${tab('pct', t('pgCompletion'), pct(r.total))}${tab('feats', t('pgFeats'), `${num(n)}/${num(A.TOTAL)}`)}</div>`;
  }

  /* ── Your account: Steam's file, or by hand (js/steam.js, js/achievements.js) ──
     Steam keeps the account's record in appcache/stats, UserGameStats_<account>_367520.bin,
     written at each launch of the game and on each unlock. Idle, the tab shows the account's
     row empty (drop the file anywhere on the tab) with «Elegir el archivo de Steam», which opens
     the steps view (the saves screen's: the folder per system, how to paste it, which file, and the
     zone with the classic file input, which works in every folder since Chrome's picker refuses
     Program Files and ~/Library, Steam's own folders on Windows and macOS). Where the browser
     allows it, «Seguir el archivo» keeps a handle that's followed like a linked save (js/live.js
     watch, under 'steam' in IndexedDB). Or «o márcalos a mano»: the account kept by hand, each
     plate a mark, until Steam's file comes in (the marks wait for when it's removed). */
  const STEAM_SYSTEMS = {
    win: { name: 'Windows', dirs: [{ path: 'C:\\Program Files (x86)\\Steam\\appcache\\stats' }], how: 'impHowWin', keys: [] },
    mac: { name: 'macOS', dirs: [{ path: '~/Library/Application Support/Steam/appcache/stats' }], how: 'impHowMac', keys: ['⇧⌘G'] },
    linux: { name: 'Linux', dirs: [{ path: '~/.local/share/Steam/appcache/stats' }, { label: 'steamFlatpak', path: '~/.var/app/com.valvesoftware.Steam/.local/share/Steam/appcache/stats' }], how: 'impHowLinux', keys: ['Ctrl+L'] },
  };
  // view: '' or 'import' (the steps view; #…&steamview=1 opens it, for debug.html's screenshots).
  // os is picked at the first paint: js/app-saves.js, which knows the system, loads after this script.
  const steam = { view: /[#&]steamview=1(&|$)/.test(location.hash) ? 'import' : '', os: '', state: 'idle', linked: '', watch: '', watcher: null, copied: -1 };
  const steamParse = (bytes, name) => { const r = ST.read(bytes, name); return r.ok ? r : null; };
  // The record from a file read: Steam's, keeping the hand marks a hand record had.
  const steamRecord = (r, file) => ({ source: 'steam', unlocked: r.unlocked, account: r.account, name: file.name, stamp: L.stampOf(file), read: Date.now(),
    hand: App.account && App.account.source === 'hand' && Object.keys(App.account.unlocked).length ? App.account.unlocked : (App.account && App.account.hand) || null });
  const knightImg = () => `<img class="imp-figure" src="${D.art('knight', 'knight')}" alt="" width="240" height="328">`;

  // No record yet: the account's row, empty (design/33, A), with the two ways as its actions.
  // The whole tab takes a dropped file; the row says so while dragging (is-drag).
  function sceneHtml() {
    return `<div class="acct-card is-idle"><img src="${D.art('knight', 'knight')}" alt="">
        <div class="acct-main"><span class="acct-k">${esc(t('acctHand'))}</span><span class="acct-v"><span class="acct-rest">${esc(t('acctNone'))}</span><span class="acct-drag">${esc(t('steamDropHere'))}</span></span>
          <span class="acct-v is-hint">${esc(t('acctIdleHint'))}</span></div>
        <div class="acct-acts"><button type="button" class="btn btn-primary" data-act="steamOpen">${esc(t('steamChooseFile'))}</button><button type="button" class="text-btn" data-act="acctHand">${esc(t('acctHandBtn'))}</button></div>
      </div>`;
  }
  // The steps view: the saves screen's import layout, for Steam's file.
  function importHtml() {
    if (!steam.os) steam.os = App.detectOs();
    const files = `<li translate="no">${App.FILE_ICON}UserGameStats_<i>${esc(t('steamAccountId'))}</i>_367520.bin</li>`;
    const steps = App.importSteps({ systems: STEAM_SYSTEMS, os: steam.os, files, step1: 'steamStep1', step3: 'steamStep3', note: 'steamFileNote', actOs: 'steamOs', actCopy: 'steamCopy', copied: steam.copied });
    const inner = steam.state === 'error' ? `<div class="imp-still">
          <img class="imp-figure is-shade" src="${D.art('knight', 'shade')}" alt="" width="145" height="174">
          <p class="imp-err" role="alert">${esc(t('steamBad'))}</p>
          <button type="button" class="btn btn-primary" data-act="steamPick">${esc(t('steamOther'))}</button>
        </div>` : `<div class="imp-still">
          ${knightImg()}
          <p class="imp-drop-title">${esc(t(steam.state === 'reading' ? 'steamReading' : 'steamScene'))}</p>
          <p class="imp-drop-drag" aria-hidden="true">${esc(t('impDropping'))}</p>
          ${steam.state === 'reading' ? '' : `<p class="imp-or">${esc(t('impOr'))}</p><button type="button" class="btn btn-primary" data-act="steamPick">${esc(t('steamPick'))}</button>`}
        </div>`;
    const follow = L.canLive() && steam.state !== 'reading' ? `<div class="imp-follow"><button type="button" class="text-btn" data-act="steamFollow" title="${esc(t('steamFollowHint'))}">${esc(t('steamFollow'))}</button></div>` : '';
    const note = steam.state === 'blocked' ? `<p class="imp-note">${esc(t('steamFollowBlocked'))}</p>` : App.isMobile() ? `<p class="imp-note">${esc(t('impMobile'))}</p>` : '';
    return `<div class="ach-import">
      <div class="imp-bar"><button type="button" class="text-btn imp-back" data-act="steamClose">${App.BACK}${esc(t('pgFeats'))}</button></div>
      ${screenHead(esc(t('steamStepsTitle')), `<p class="saves-note">${esc(t('steamStepsLead'))}</p>`)}
      <div class="imp-grid">${steps}<div><div class="imp-drop" data-state="${steam.state}"><div class="imp-light" aria-hidden="true"></div><div class="imp-drop-in">${inner}</div><p class="imp-private">${esc(t('steamPrivate'))}</p></div>${follow}${note}</div></div>
    </div>`;
  }
  // The account card: Steam's file (followed or read once) or the marks by hand.
  function acctHtml(acc) {
    const rec = App.account;
    if (rec.source === 'hand') {
      return `<div class="acct-card"><img src="${D.art('achievements', 'charmed')}" alt="">
          <div class="acct-main"><span class="acct-k">${esc(t('acctHand'))}</span><span class="acct-v">${esc(t('acctHandLine', { n: num(acc.done) }))}</span>
            <span class="acct-v is-hint">${esc(t('acctHandHint'))}</span></div>
          <div class="acct-acts"><button type="button" class="text-btn" data-act="steamOpen">${esc(t('steamLink'))}</button><button type="button" class="text-btn" data-act="acctRemove">${esc(t('steamRemove'))}</button></div>
        </div>`;
    }
    const live = steam.linked ? `<span class="acct-dot${steam.watch === 'live' ? '' : ' is-off'}" aria-hidden="true"></span><span>${esc(t('steamFollows'))}</span>${steam.watch === 'paused' || steam.watch === 'lost' ? `<button type="button" class="text-btn" data-act="steamResume">${esc(t('liveResume'))}</button>` : ''}<span class="sep">·</span>` : '';
    return `<div class="acct-card"><img src="${D.art('achievements', 'pure-completion')}" alt="">
        <div class="acct-main"><span class="acct-k">${esc(t('acctSteam'))}</span>
          <span class="acct-v">${live}<span>${esc(rec.read ? t('steamRead', { date: fmtDate(rec.read) }) : '')}</span></span>
          ${rec.name ? `<code class="acct-file" translate="no">${esc(rec.name)}</code>` : ''}</div>
        <div class="acct-acts"><button type="button" class="text-btn" data-act="steamOpen">${esc(t('steamChange'))}</button>${steam.linked ? `<button type="button" class="text-btn" data-act="steamUnlink">${esc(t('steamUnlink'))}</button>` : ''}<button type="button" class="text-btn" data-act="acctRemove">${esc(t('steamRemove'))}</button></div>
      </div>`;
  }
  // The file picker, outside the screen (which is redrawn whole), opened from the click itself.
  const steamPicker = document.createElement('input');
  steamPicker.type = 'file';
  steamPicker.accept = '.bin';
  steamPicker.hidden = true;
  document.body.appendChild(steamPicker);
  steamPicker.addEventListener('change', () => { if (steamPicker.files && steamPicker.files[0]) readSteam(steamPicker.files[0]); });
  function readSteam(file, handle = null) {
    steam.state = 'reading'; render();
    const reader = new FileReader();
    reader.onload = async () => {
      const r = ST.read(new Uint8Array(reader.result), file.name);
      if (!r.ok) { steam.state = 'error'; steam.view = 'import'; render(); App.track('steam-bad'); return; }
      steam.state = 'idle'; steam.view = '';
      if (handle) await steamLink(handle, file);
      App.setAccount(steamRecord(r, file));
      App.toast(t('steamToast', { n: num(A.account(App.account).done), max: num(A.TOTAL) }));
      App.track('steam-read');
    };
    reader.onerror = () => { steam.state = 'error'; steam.view = 'import'; render(); };
    reader.readAsArrayBuffer(file);
  }
  /* The handle stored and asked on its stored copy, inside the click (js/app-saves.js link() says
     why), then followed. */
  async function steamLink(handle, file) {
    const stored = { handle, name: file.name, stamp: L.stampOf(file) };
    if (!(await L.links.put('steam', stored))) return;
    const rec = (await L.links.get('steam')) || stored;
    try { await rec.handle.requestPermission({ mode: 'read' }); } catch (e) { /* the watcher says paused */ }
    steamWatch(rec);
    App.track('steam-link');
  }
  function steamWatch(rec) {
    if (steam.watcher) steam.watcher.stop();
    let stamp = rec.stamp || null;
    steam.linked = rec.name || rec.handle.name;
    steam.watcher = L.watch({
      source: L.fileSource(rec.handle, (bytes) => steamParse(bytes, steam.linked)),
      since: stamp,
      async onData(r, next) {
        stamp = next;
        await L.links.put('steam', { ...rec, stamp });
        App.setAccount({ ...(App.account && App.account.source === 'steam' ? App.account : { hand: App.account ? App.account.unlocked : null }),
          source: 'steam', unlocked: r.unlocked, account: r.account, name: steam.linked, stamp, read: Date.now() });
      },
      onState(s) { steam.watch = s; if (prefs.view === 'progress') render(); },
    });
  }
  // At boot: a file followed before is followed again (paused until a click, like a slot's).
  if (L.canLive()) L.links.get('steam').then((rec) => { if (rec && rec.handle) steamWatch(rec); });
  async function steamUnlink() {
    if (steam.watcher) steam.watcher.stop();
    steam.watcher = null; steam.linked = ''; steam.watch = '';
    await L.links.drop('steam');
  }
  // Dropping Steam's file on the achievements (the scene or the steps view): read, and followed
  // when the browser gives a handle.
  let steamDrag = 0;
  const onFeats = (e) => prefs.view === 'progress' && prefs.pgShow === 'feats' && !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  const setSteamDrag = (on) => { const z = el.pg.querySelector('.imp-drop, .acct-card.is-idle'); if (z) z.classList.toggle('is-drag', on); };
  el.pg.addEventListener('dragenter', (e) => { if (!onFeats(e)) return; e.preventDefault(); steamDrag++; setSteamDrag(true); });
  el.pg.addEventListener('dragover', (e) => { if (!onFeats(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  el.pg.addEventListener('dragleave', () => { steamDrag = Math.max(0, steamDrag - 1); if (!steamDrag) setSteamDrag(false); });
  el.pg.addEventListener('drop', (e) => {
    if (!onFeats(e)) return;
    e.preventDefault();
    steamDrag = 0; setSteamDrag(false);
    const item = e.dataTransfer.items && e.dataTransfer.items[0];
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (L.canLive() && item && item.getAsFileSystemHandle) {
      item.getAsFileSystemHandle().then((h) => (h && h.kind === 'file' ? h.getFile().then((f) => readSteam(f, h)) : file && readSteam(file)), () => { if (file) readSteam(file); });
      return;
    }
    if (file) readSteam(file);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && steam.view && prefs.view === 'progress') { steam.view = ''; steam.state = 'idle'; render(); }
  });

  function renderProgress() {
    if (prefs.view !== 'progress' && prefs.view !== 'map') return;
    const r = count();
    /* Two screens in this section: the 112% (the game's figure and its fourteen categories) and
       the Map, with the collectibles on it (js/app-map.js). */
    const head = `${brackets}${screenHead(esc(t(prefs.view === 'map' ? 'navMap' : 'navProgress')))}`;
    el.pg.classList.toggle('is-big', prefs.view === 'map' && !!prefs.pgMapBig);
    el.pg.classList.toggle('is-full', prefs.view === 'map' && App.pgmIsFull());
    if (prefs.view === 'map') {
      el.pg.innerHTML = `<div class="gear-body pg-body">${head}${App.renderPgMap()}</div>`;
      App.pgMapAfterPaint();
      return;
    }
    const f = feats(), acc = account();
    // The steps view takes the tab while Steam's file is being picked.
    if (prefs.pgShow === 'feats' && steam.view === 'import') {
      el.pg.innerHTML = `<div class="gear-body pg-body">${head}${pgTabs(r, acc ? acc.done : f.done)}${importHtml()}</div>`;
      return;
    }
    // The account's figure leads when there's a record (Steam's or by hand); this save's is a
    // line under it, never summed.
    const total = acc ? `<span class="pg-total-k">${esc(t(App.account.source === 'hand' ? 'acctHandTitle' : 'steamTitle'))}</span>
          <span class="pg-total-v">${num(acc.done)}<span class="u"> / ${num(acc.total)}</span></span>
          <span class="ach-save"><img src="${D.art('hud', 'mask')}" alt="">${esc(t('steamSaveDoes', { n: num(f.done) }))}</span>`
      : `<span class="pg-total-k">${esc(t('steamSaveTitle'))}</span>
          <span class="pg-total-v">${num(f.done)}<span class="u"> / ${num(f.total)}</span></span>`;
    // Over the rows, on both tabs: only what's missing.
    const opts = `<div class="pg-opts">${App.switchHtml('pgMissing', 'missing', missingOnly(), t('pgOnlyMissing'))}</div>`;
    const rows = (list) => `<ol class="pg-rows">${list.join('') || App.emptyHtml(esc(t('pgNothingMissing')), '', { tag: 'li' })}</ol>`;
    const body = prefs.pgShow === 'feats' ? `${pgTabs(r, acc ? acc.done : f.done)}<div class="pg-total">${total}</div>
        ${acc ? acctHtml(acc) : sceneHtml()}${opts}
        ${rows(f.groups.map((g) => featRow(g, acc)))}` : `${pgTabs(r, acc ? acc.done : f.done)}<div class="pg-total${r.total >= r.max ? ' is-done' : ''}">
          <span class="pg-total-k">${esc(t('pgCompletion'))}</span>
          <span class="pg-total-v">${num(r.total)}<span class="u">${esc(pctSpace())} / ${num(r.max)}</span></span>
        </div>${opts}
        ${rows(r.categories.map(row))}`;
    el.pg.innerHTML = `<div class="gear-body pg-body${missingOnly() ? ' is-missing' : ''}">${head}${body}</div>`;
  }

  // The screen bar's tab carries the figure, as the Journal's carries its entries.
  function paintPgNav() {
    const a = document.getElementById('nav-pg');
    if (!a) return;
    const r = count(), total = pct(r.total);
    a.querySelector('.nav-lbl').textContent = t('navProgress');
    a.querySelector('.nav-num').textContent = total;
    a.querySelector('.nav-num').classList.toggle('is-done', r.total >= r.max);
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
  App.edits('pgFind', 'pgMark', 'pgAch');
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
    pgShow(node) {
      prefs.pgShow = node.dataset.value === 'feats' ? 'feats' : 'pct';
      savePrefs();
      render();
    },
    // An achievement the save can't tell, marked by hand (hollow.feats): allowed in a save too,
    // but not with Steam in: the account answers.
    pgFeat(node) { if (!App.account) App.setFeats(A.toggle(App.feats, node.dataset.id)); },
    // The account by hand: a plate marks or unmarks it (never the save's figures).
    pgAcct(node) { App.setAccount(A.toggleAccount(App.account, node.dataset.id)); },
    acctHand() { App.setAccount(A.handRecord(App.account && App.account.hand)); },
    async acctRemove() {
      const rec = App.account;
      await steamUnlink();
      // Removing Steam's file brings back the marks made by hand before it, if any.
      App.setAccount(rec && rec.source === 'steam' && rec.hand && Object.keys(rec.hand).length ? A.handRecord(rec.hand) : null);
    },
    steamOpen() { steam.view = 'import'; steam.state = 'idle'; render(); scrollTo(0, 0); },
    steamClose() { steam.view = ''; steam.state = 'idle'; render(); },
    steamOs(node) { steam.os = node.dataset.value in STEAM_SYSTEMS ? node.dataset.value : 'win'; steam.copied = -1; render(); },
    steamCopy(node) {
      const i = +node.dataset.value || 0, d = STEAM_SYSTEMS[steam.os].dirs[i];
      if (!d) return;
      App.copyText(d.path, el.pg.querySelectorAll('.imp-path code')[i], () => {
        node.textContent = t('impCopied'); node.classList.add('is-done');
        setTimeout(() => { node.textContent = t('impCopy'); node.classList.remove('is-done'); }, 2000);
      });
    },
    steamPick() { steamPicker.value = ''; steamPicker.click(); },
    /* The picker with a handle, so the file can be followed. Refused by the browser (Steam's
       folder is one it blocks) it says so; cancelled, nothing changes. */
    async steamFollow() {
      let h;
      try {
        [h] = await showOpenFilePicker({ id: 'hk-steam', multiple: false,
          types: [{ description: 'Steam', accept: { 'application/octet-stream': ['.bin'] } }] });
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        steam.state = 'blocked'; render();
        return;
      }
      let file;
      try { file = await h.getFile(); } catch (e) { steam.state = 'blocked'; render(); return; }
      readSteam(file, h);
    },
    async steamResume() { if (steam.watcher) await steam.watcher.resume(); render(); },
    async steamUnlink() { await steamUnlink(); render(); },
    pgRow(node) {
      const before = foldBefore(node.dataset.value);
      prefs.pgOpen = prefs.pgOpen === node.dataset.value ? '' : node.dataset.value;
      savePrefs();
      render();
      unfold(node.dataset.value, before);
    },
    pgMissing() { prefs.pgMissing = !prefs.pgMissing; savePrefs(); render(); },
    // From a Map card's «Logro: …»: the achievements tab, its group open, its plate in view.
    pgFeatGo(node) {
      const a = A.BY_ID[node.dataset.id];
      if (!a) return;
      Object.assign(prefs, { pgShow: 'feats', pgOpen: 'f:' + a.group });
      savePrefs();
      actions.view({ dataset: { value: 'progress' }, closest: () => null });
      const plate = document.querySelector(`.gplate.ach[data-id="${CSS.escape(a.id)}"]`);
      if (plate) { plate.scrollIntoView({ block: 'center' }); plate.focus({ preventScroll: true }); }
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
