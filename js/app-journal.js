/* js/app-journal.js — the Hunter's Journal screen: your game's book, its list, its page
   and the marking in bulk, with its actions and listeners. Shares HK.app with js/app.js
   (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, F = HK.foes, J = HK.journal;
  const App = HK.app;
  const { t, pick, $, el, NT, esc, load, save, prefs, brackets, chevron, screenHead, plain, jrNarrow,
    scrollToCur, stepCursor, DIFF_KEY, restoreFocus, focusDescriptor, underNav, actions } = App;

  /* ── The Hunter's Journal: your game ─────────────────────────────────
     The Journal's quest, as in the game: the 168 entries in their order, and for each one
     where you stand in your real game, marked by hand (the rules, in js/hunter.js). It isn't
     the combat Journal, which picks an enemy: this is its own screen, the fourth in the bar,
     and the simulator never touches it.
     As in the game: what hasn't been encountered is shadowed, the description appears on
     encountering it and the Hunter's notes on completing it; until then, "Defeat N more to
     decipher the Hunter's notes", and that sentence is the control itself. Everything carries
     the hj- prefix: the combat Journal (.journal, .jr-row) has global handlers that mustn't fire. */
  const HJ = HK.hunter;
  const KEY_JOURNAL = 'hollow.journal';
  const hjSec = el.hj;
  const hjNav = $('#nav-hj');
  App.hjEnter = false;              // the Journal was just entered: the entry being read, in view
  let book = {};                    // { id: defeats left }, the same thing the game saves
  App.hjCursor = null;              // the entry being read: on mount, the first one you're missing
  let hjReading = false;            // on mobile: the page shows instead of the list
  /* What the list shows, by state, with the words of each entry's control: 'unseen'
     (not encountered), 'seen' (encountered, with the notes still to decipher) and 'done'
     (completed). Only the tabs above the list choose it: the Hunter's counts are figures, not
     buttons (Albert doesn't want them clickable). */
  const HJ_STATES = ['unseen', 'seen', 'done'];
  let hjShow = new Set(HJ_STATES);
  const hjStateKey = (s) => (s.done ? 'done' : s.seen ? 'seen' : 'unseen');
  const hjShowAll = () => hjShow.size === HJ_STATES.length;
  let hjQuery = '';
  let hjTimer = 0;
  let hjBulkOpen = false;           // the "Mark in bulk" panel, open
  let hjInk = null;                 // the entry just completed: its notes ink in
  let hjWas = null;                 // the book before a change by hand, only for its repaint: what changed moves once
  let hjListFx = false;             // the list's states just changed (the tabs): it fades in
  let hjUndo = null;                // { prev, what, n, picked }: the last bulk action, to undo it
  let hjPicked = new Set();         // the ones picked with their checkbox, to mark in bulk
  let hjPickAnchor = '';            // the last checkbox touched: with Shift the range up to it is picked
  let hjShift = false;              // whether the last click inside the Journal had Shift held

  const loadJournal = () => {
    try { book = HJ.normalize(JSON.parse(load(KEY_JOURNAL) || '{}')); } catch (e) { book = {}; }
  };
  const saveJournal = () => save(KEY_JOURNAL, Object.keys(book).length ? JSON.stringify(book) : null);

  const hjState = (id) => HJ.stateOf(book, id, App.marks);  // the Idol looks at the Hall's marks
  const hjEntry = (id) => HJ.EXTRAS[id] || J.ENTRIES[id] || {};
  const hjNameOf = (r) => r.name || (HJ.EXTRAS[r.id] || F.FOE_BY_ID[r.id]).name;
  // The portrait: the entry's; the extras, their own; the Idol, its level's in the Hall; the
  // Seal of Binding has no artwork of its own and shows its medallion large.
  const hjArt = (r, s) => (r.id === HJ.IDOL ? `assets/hall/idol-${s.tier || 'at'}.png`
    : r.id === 'seal-of-binding' ? D.art('journal', r.id)
    : HJ.EXTRAS[r.id] ? D.art('hunter', r.id) : D.art('enemies', r.id));
  const hjMedal = (r, s) => `<span class="hj-medal"><img src="${D.art('journal', r.id)}" alt="" loading="lazy">${s.done
    ? `<img class="hj-frame" src="${D.art('hunter', 'frame')}" alt="">` : ''}</span>`;
  const hjStateText = (s) => t(s.done ? 'hjDone' : s.seen ? 'hjSeen' : 'hjUnseen');

  /* The list: the search removes what doesn't match, in both languages; the tabs keep the
     chosen states, but never hide the entry being read: marking it doesn't make it
     disappear under your finger. Mark in bulk uses the strict list, without that exception:
     otherwise, completing "encountered" would also complete the one you're reading. */
  const hjMatches = (r) => {
    const q = plain(hjQuery.trim()), n = hjNameOf(r);
    return !q || plain(n.es).includes(q) || plain(n.en).includes(q);
  };
  function hjVisible(strict = false) {
    return HJ.BOOK.filter((r) => hjMatches(r)
      && ((r.id === App.hjCursor && !strict) || hjShowAll() || hjShow.has(hjStateKey(hjState(r.id)))));
  }

  /* The state tabs, with how many of each there are among what matches the search.
     From "All", a tab keeps only those; with one already chosen, another adds or removes
     itself; with none, "All" comes back. That way the combinations fit: not encountered plus
     encountered is what you're missing. The labels are those of each entry's control (hjUnseen, hjSeen, hjDone). */
  const HJ_TABS = [['all', 'hjShowAll'], ['unseen', 'hjUnseen'], ['seen', 'hjSeen'], ['done', 'hjDone']];
  function hjTabsHtml() {
    const base = HJ.BOOK.filter(hjMatches);
    const n = { all: base.length, unseen: 0, seen: 0, done: 0 };
    // They count like the header: without the 4 the game doesn't count (the Hunter's Mark, the Seal, the Idol and
    // the Weathered Mask), which are still listed. That way "Completed" says the same up there and here.
    for (const r of base) if (!r.uncounted) n[hjStateKey(hjState(r.id))]++;
    return `<span class="hj-tabs" role="group" aria-label="${esc(t('hjShowLbl'))}">${HJ_TABS.map(([v, key]) => {
      const on = v === 'all' ? hjShowAll() : !hjShowAll() && hjShow.has(v);
      return `<button type="button" data-act="hjShowState" data-value="${v}" aria-pressed="${on}" ${v === 'all' ? '' : `title="${esc(t('hjShowTip'))}"`}>
        <span>${esc(t(key))}</span>${v === 'all' ? '' : `<i>${App.NF[0].format(n[v])}</i>`}</button>`;
    }).join('')}</span>`;
  }

  /* With "Mark in bulk" open, each row carries its checkbox to pick several. The
     checkbox isn't a tab stop (there would be 168): from the keyboard, Space on the row
     being read ticks it. The ones that never change (Crawlid, the Shade, the Idol) have none. */
  const hjPickable = (id) => !['start', 'idol'].includes(HJ.kindOf(id));
  const HJ_CHECK = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 5.2 L4.6 8.2 L10.5 1.8"/></svg>';
  function hjRowsHtml() {
    const visibleRows = hjVisible();
    if (!visibleRows.length) return `<li class="hj-empty" role="presentation">${esc(t('fightNoMatch'))}</li>`;
    return visibleRows.map((r) => {
      const s = hjState(r.id), cur = r.id === App.hjCursor, entryName = pick(hjNameOf(r));
      // Just encountered, its medallion lights up from the shadow; just completed, its frame.
      const was = hjWas && HJ.stateOf(hjWas, r.id, App.marks);
      const fx = !was ? '' : s.done && !was.done ? ' is-new-done' : s.seen && !was.seen ? ' is-new-seen' : '';
      const isPicked = hjBulkOpen && hjPicked.has(r.id);
      const leftBadge = s.seen && !s.done && HJ.kindOf(r.id) === 'count'
        ? `<span class="hj-left" title="${esc(t('hjLeftShort', { n: App.NF[0].format(s.left) }))}">${App.NF[0].format(s.left)}</span>` : '';
      const pickBox = !hjBulkOpen ? '' : hjPickable(r.id)
        ? `<button type="button" class="hj-pick" role="checkbox" aria-checked="${isPicked}" tabindex="-1" data-act="hjPick" data-id="${r.id}"
            aria-label="${esc(t('hjPick', { name: entryName }))}"><span class="hj-box">${isPicked ? HJ_CHECK : ''}</span></button>`
        : '<span class="hj-pick is-fixed" aria-hidden="true"></span>';
      return `<li role="presentation" class="${hjBulkOpen ? 'is-picking' : ''}">${pickBox}<button type="button" role="option" id="hj-e-${r.id}"
        class="hj-row ${cur ? 'is-cur' : ''} ${s.seen ? '' : 'is-unseen'} ${s.done ? 'is-done' : ''} ${isPicked ? 'is-picked' : ''}${fx}"
        aria-selected="${cur}" tabindex="${cur ? 0 : -1}" data-act="hjRead" data-id="${r.id}">
        ${hjMedal(r, s)}<span class="hj-name"${NT}>${esc(entryName)}</span>${leftBadge}
        <span class="sr-only"> · ${esc(hjStateText(s))}${isPicked ? ' · ' + esc(t('hjPicked')) : ''}</span></button></li>`;
    }).join('');
  }

  /* The entry's control. The counted ones carry the three states; the yes-or-no ones, two;
     the Hunter's Mark, the Hunter's button once he can give it; and the ones that aren't
     marked, nothing. No boxes: text at the foot of the page, like the Combat tabs. */
  function hjControlHtml(r, s) {
    const k = HJ.kindOf(r.id);
    if (k === 'start' || k === 'idol') return '';
    if (k === 'mark' && !s.done) {
      return HJ.markReady(book)
        ? `<button type="button" class="btn btn-primary hj-reward" data-act="hjSet" data-id="${r.id}" data-value="done">${esc(t('hjReward'))}</button>` : '';
    }
    const opts = k === 'count' ? ['none', 'seen', 'done'] : ['none', 'done'];
    const on = s.done ? 'done' : s.seen ? 'seen' : 'none';
    const lbl = { none: 'hjUnseen', seen: 'hjSeen', done: 'hjDone' };
    // With its label in view: the list's tabs use the same words, but they filter;
    // this marks your game.
    return `<span class="hj-state" role="group" aria-labelledby="hj-state-lbl"><span class="hj-state-lbl" id="hj-state-lbl">${esc(t('hjStateLbl'))}</span>${opts.map((v) =>
      `<button type="button" data-act="hjSet" data-id="${r.id}" data-value="${v}" aria-pressed="${on === v}">${esc(t(lbl[v]))}</button>`)
      .join('<span class="hj-state-sep" aria-hidden="true">·</span>')}</span>`;
  }

  /* "Defeat [−] N [+] more to decipher the Hunter's notes.": the game's sentence, and the
     number is the control. "−" is one more defeat (fewer left). */
  function hjKillsHtml(r, s) {
    const max = HJ.maxLeft(r.id);
    return `<p class="hj-kills">${esc(t('hjKill1'))}
      <span class="hj-stepper">
        <button type="button" class="hj-step" data-act="hjStep" data-id="${r.id}" data-value="-1" title="${esc(t('hjStepDown'))}" aria-label="${esc(t('hjStepDown'))}">−</button>
        <input type="number" class="hj-count${hjWas && HJ.stateOf(hjWas, r.id, App.marks).left !== s.left ? ' is-flash' : ''}" data-id="${r.id}" value="${s.left}" min="0" max="${max}" step="1" inputmode="numeric" aria-label="${esc(t('hjLeftLbl'))}">
        <button type="button" class="hj-step" data-act="hjStep" data-id="${r.id}" data-value="1" title="${esc(t('hjStepUp'))}" aria-label="${esc(t('hjStepUp'))}" ${s.left >= max ? 'disabled' : ''}>+</button>
      </span>
      ${esc(t('hjKill2'))}</p>`;
  }

  /* The page, like the game's: portrait with its light, name, the flourish, the description and
     the Hunter's notes in his handwriting. Only what the game shows, plus what's needed to
     mark it. Encountered and not completed, the notes are there but can't be read: blurred
     ink under "Defeat N more to decipher…". On completing it, the ink settles (hjInk). */
  function hjPageHtml(id = App.hjCursor) {
    const r = HJ.ROW[id];
    if (!r) return '';
    const s = hjState(r.id), k = HJ.kindOf(r.id), e = hjEntry(r.id);
    const desc = e.desc && (e.desc.at ? e.desc[s.tier || 'at'] : e.desc);   // the Idol, by level
    const aside = (key, vars) => `<p class="hj-aside">${esc(t(key, vars))}</p>`;
    let text = '';
    if (s.seen && desc) text += `<p class="hj-desc">${esc(pick(desc))}</p>`;
    if (s.done && e.notes) text += `<p class="hj-notes ${hjInk === r.id ? 'is-inking' : ''}">${esc(pick(e.notes))}</p>${e.by ? `<p class="hj-by">— ${esc(pick(e.by))}</p>` : ''}`;
    if (s.seen && !s.done && k === 'count') text += hjKillsHtml(r, s);
    if (s.seen && !s.done && e.notes) text += `<p class="hj-sealed" aria-hidden="true">${esc(pick(e.notes))}</p>`;
    if (!s.seen && k !== 'idol' && k !== 'mark') text += aside('hjNotYet');
    if (k === 'start') text += aside('hjStart');
    if (r.auto && !s.seen) text += aside('hjAuto');
    if (r.inspect && !s.done) text += aside(r.kills == null ? 'hjInspect' : 'hjInspectOr') + `<p class="hj-inspect">${esc(pick(r.inspect))}</p>`;
    if (k === 'idol') text += s.tier ? aside('hjIdolTier', { diff: t(DIFF_KEY[s.tier]) }) : aside('hjIdolFrom');
    if (k === 'mark' && !s.done && !HJ.markReady(book)) {
      const n = HJ.markLeft(book);
      text += aside(n === 1 ? 'hjMarkLockedOne' : 'hjMarkLocked', { n: App.NF[0].format(n), total: App.NF[0].format(HJ.REQUIRED) });
    }
    /* The control goes at the top, before the portrait: at the foot it sat 600 px below the edge
       of the window, and whoever came in for the first time didn't know the page can be marked. */
    const control = hjControlHtml(r, s);
    return `<button type="button" class="btn hj-back" data-act="hjBack">‹ ${esc(t('jrBack'))}</button>
      ${control ? `<div class="hj-mark">${control}</div>` : ''}
      <div class="hj-art ${s.seen ? '' : 'is-shadow'} ${r.id === 'seal-of-binding' ? 'is-medal' : ''}"><img src="${hjArt(r, s)}" alt="" onerror="this.classList.add('is-missing')"><span class="hj-folio" aria-hidden="true">${esc(t('hjFolio', { n: App.NF[0].format(r.n) }))}</span></div>
      <h3 class="hj-page-name"${NT}>${esc(pick(hjNameOf(r)))}</h3>
      <img class="hj-fleur" src="${D.art('hunter', 'fleur')}" alt="" width="237" height="37">
      <div class="hj-text">${text}</div>`;
  }

  /* The Hunter and the counts, loose on the black like the Charms sheet. He says what he'd say if you went to see him (hunterLine); the
     counts are the game's with World Sense, and they're read-only: filtering is the list
     tabs' job. */
  // The dust that rises from the Hunter on receiving his Mark: the main menu's motes, in fixed places.
  const HJ_DUST = Array.from({ length: 16 }, (_, i) => {
    const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return `<i style="--x:${(10 + r(1) * 80).toFixed(1)}%;--y:${(30 + r(2) * 60).toFixed(1)}%;--dx:${((r(3) - 0.5) * 40).toFixed(0)}px;--s:${(2 + r(4) * 2).toFixed(1)}px;--d:${(r(5) * 0.9).toFixed(2)}s;--o:${(0.45 + r(6) * 0.5).toFixed(2)}"></i>`;
  }).join('');
  function hjTopHtml() {
    const c = HJ.counts(book);
    const lineKey = HJ.hunterLine(book);
    const saysHtml = t('hjSays' + lineKey[0].toUpperCase() + lineKey.slice(1)).split(/\n\n+/).map((p) => `<p>${esc(p.trim())}</p>`).join('');
    // What moved with the last change flashes; a feat reached lights up; and receiving the Hunter's
    // Mark is its own moment: his light swells and dust rises from it (.hj-hunter.is-marked).
    const w = hjWas && HJ.counts(hjWas);
    const tally = (key, n, before) => `<li class="hj-tally${w && before !== n ? ' is-flash' : ''}">
        <span class="hj-count-num"><b>${App.NF[0].format(n)}</b><i class="u">/${App.NF[0].format(c.total)}</i></span>
        <span class="hj-count-lbl">${esc(t(key))}</span></li>`;
    const markDone = hjState(HJ.MARK).done;
    const feat = (key, textKey, n, isDone, wasDone) => `<li class="hj-feat ${isDone ? 'is-done' : ''}${w && isDone && !wasDone ? ' is-lit' : ''}" title="${esc(t(textKey))}">
      <span class="hj-feat-lbl">${esc(t(key))}</span>
      <span class="hj-feat-num"><b>${App.NF[0].format(n)}</b><i class="u">/${App.NF[0].format(c.required)}</i></span></li>`;
    const marked = w && markDone && !HJ.stateOf(hjWas, HJ.MARK).done;
    return `<div class="hj-hunter${marked ? ' is-marked' : ''}">
        <span class="hj-hunter-fig"><img class="hj-hunter-art" src="${D.art('hunter', 'hunter')}" alt="">${marked ? `<span class="hj-dust" aria-hidden="true">${HJ_DUST}</span>` : ''}</span>
        <div class="hj-hunter-body">
          <h3 class="hj-hunter-name"><small>${esc(t('hjSuper'))}</small> ${esc(t('hjMain'))}</h3>
          <blockquote class="hj-says">${saysHtml}</blockquote>
        </div>
        <div class="hj-hunter-side">
          <ul class="hj-counts" aria-label="${esc(t('hjCountsTitle'))}" title="${esc(t('hjRules'))}">${tally('hjSeen', c.encountered, w && w.encountered)}${tally('hjDone', c.completed, w && w.completed)}</ul>
          <p class="hj-total-note">${esc(t('hjTotalNote', { req: App.NF[0].format(c.required), max: App.NF[0].format(c.max) }))}</p>
          <ul class="hj-feats">${feat('hjKeen', 'hjKeenText', c.reqSeen, c.reqSeen === c.required, w && w.reqSeen === w.required)}${feat('hjTrue', 'hjTrueText', c.reqDone, markDone, hjWas && HJ.stateOf(hjWas, HJ.MARK).done)}</ul>
          <p class="hj-howto">${esc(t('hjHowTo'))}</p>
        </div>
      </div>`;
  }

  /* Mark in bulk, as in the Hall, but at the foot of the list, which is where you pick:
     collapsed, and on opening it, checkboxes on the rows and encounter, complete or unmark at
     once the ones picked; with none picked, whatever is in the list (with no filter or search, all
     168). The rules are the one-by-one ones (HJ.bulk). Each button says how many would change
     and, if none, it's dimmed. Unmarking wipes your real game: the last action can be undone
     until the next change. */
  const HJ_BULK = [['seen', 'hjBulkSeen'], ['done', 'hjBulkDone'], ['none', 'hjBulkNone']];
  const hjBulkIds = () => {
    const pickedIds = HJ.BOOK.filter((r) => hjPicked.has(r.id)).map((r) => r.id);
    return pickedIds.length ? { ids: pickedIds, picked: true } : { ids: hjVisible(true).map((r) => r.id), picked: false };
  };
  function hjBulkHtml() {
    const toggle = `<button type="button" class="text-btn hj-bulk-toggle" data-act="hjBulk" aria-expanded="${hjBulkOpen}"
      title="${esc(t('hjBulkHint'))}">${esc(t('hjBulk'))}${chevron(hjBulkOpen)}</button>`;
    if (!hjBulkOpen) return `<div class="hj-bulk-head">${toggle}</div>`;
    const { ids, picked } = hjBulkIds();
    const scopeLbl = picked
      ? (ids.length === 1 ? t('hjBulkScopePickedOne') : t('hjBulkScopePicked', { n: App.NF[0].format(ids.length) }))
      : (ids.length === 1 ? t('hjBulkScopeOne') : t('hjBulkScope', { n: App.NF[0].format(ids.length) }));
    const sep = '<span class="hj-bulk-sep" aria-hidden="true">·</span>';
    const bulkBtns = HJ_BULK.map(([v, key]) => {
      const n = HJ.changed(book, HJ.bulk(book, ids, v));
      return `<button type="button" class="hj-bulk-btn" data-act="hjBulkDo" data-value="${v}" ${n ? '' : 'disabled'}
        title="${esc(t('hjBulkCount', { n: App.NF[0].format(n) }))}">${esc(t(key))} <i>${App.NF[0].format(n)}</i></button>`;
    }).join('');
    const undoNote = hjUndo ? `<p class="hj-bulk-done"><span role="status">${esc(t(
      'hjBulkDid' + hjUndo.what[0].toUpperCase() + hjUndo.what.slice(1) + (hjUndo.n === 1 ? 'One' : ''), { n: App.NF[0].format(hjUndo.n) }))}</span>
      <button type="button" class="text-btn hj-undo" data-act="hjUndo">${esc(t('hallUndo'))}</button></p>` : '';
    const pickable = hjVisible(true).filter((r) => hjPickable(r.id));
    const pickBtns = `<span class="hj-bulk-picks">
        <button type="button" class="hj-pick-btn" data-act="hjPickAll" ${pickable.every((r) => hjPicked.has(r.id)) ? 'disabled' : ''}>${esc(t('hjPickAll'))}</button>${sep}<button
          type="button" class="hj-pick-btn" data-act="hjPickNone" ${hjPicked.size ? '' : 'disabled'}>${esc(t('hjPickNone'))}</button>
      </span>`;
    // In the DOM, the button that opens it comes first; on screen, at the very bottom (column-reverse), so
    // it doesn't move on opening and the panel grows upwards, eating as little of the list as possible.
    return `<div class="hj-bulk-head">${toggle}${pickBtns}</div>
      <div class="hj-bulk">
        <p class="hj-bulk-scope" title="${esc(t('hjBulkPickHint'))}"><span class="lbl" id="hj-bulk-scope">${esc(scopeLbl)}</span>${picked ? '' : `<span class="hj-bulk-rule">${esc(t('hjBulkPickShort'))}</span>`}</p>
        <div class="hj-bulk-acts" role="group" aria-labelledby="hj-bulk-scope">${bulkBtns}</div>
        ${undoNote}
      </div>`;
  }

  /* The screen is mounted the first time it's entered; after that its parts are repainted,
     keeping the search box (with its cursor), the list's and the page's scroll, and the notice.
     It goes like the others: the black with its corner brackets and its centred title; below,
     the Hunter, and the list and the page, which measure what's left of the window under the
     bar and scroll inside. */
  function renderHunter() {
    // It opens on the first entry you're missing that can be marked: Crawlid and the Shade
    // come complete and have no control, and opening on them hid that the Journal can be marked.
    if (!App.hjCursor) App.hjCursor = (HJ.BOOK.find((r) => hjPickable(r.id) && !hjState(r.id).done) || HJ.BOOK[0]).id;
    hjSec.innerHTML = `<div class="hj-body">${brackets}
        <div class="hj-head"></div>
        <section class="hj-top"></section>
        <div class="hj-pane">
          <div class="hj-index">
            <input type="search" class="hj-search" autocomplete="off" spellcheck="false" aria-controls="hj-list">
            <div class="hj-show"></div>
            <ul class="hj-list" id="hj-list" role="listbox"></ul>
            <div class="hj-bulkbar"></div>
          </div>
          <article class="hj-page" aria-live="polite"></article>
        </div>
      </div>
      <div class="hj-note" role="status" hidden></div>`;
    paintHunter();
  }
  function paintHunter(focusCount = false) {
    const listEl = hjSec.querySelector('.hj-list');
    if (!listEl) return;
    const page = hjSec.querySelector('.hj-page');
    const listScroll = listEl.scrollTop, pageScroll = page.scrollTop;
    const focus = focusDescriptor();
    hjSec.querySelector('.hj-head').innerHTML = screenHead(esc(t('jrTitle')));
    hjSec.querySelector('.hj-head h2').id = 'hj-title';
    hjSec.querySelector('.hj-top').innerHTML = hjTopHtml();
    const searchBox = hjSec.querySelector('.hj-search');
    searchBox.placeholder = t('jrSearch');
    searchBox.setAttribute('aria-label', t('jrSearch'));
    if (searchBox.value !== hjQuery) searchBox.value = hjQuery;
    listEl.setAttribute('aria-label', t('jrTitle'));
    listEl.innerHTML = hjRowsHtml();
    if (hjListFx) { listEl.classList.remove('is-fresh'); void listEl.offsetWidth; listEl.classList.add('is-fresh'); hjListFx = false; }
    hjSec.querySelector('.hj-show').innerHTML = hjTabsHtml();
    hjSec.querySelector('.hj-bulkbar').innerHTML = hjBulkHtml();
    App.hjPeek = null;
    page.innerHTML = hjPageHtml();
    hjInk = null;
    listEl.scrollTop = listScroll;
    page.scrollTop = pageScroll;
    hjSec.querySelector('.hj-pane').classList.toggle('is-reading', hjReading);
    hjSec.querySelector('.hj-top').classList.toggle('is-reading', hjReading);
    if (focusCount) { const n = hjSec.querySelector('.hj-count'); if (n) { n.focus({ preventScroll: true }); n.select(); } }
    else restoreFocus(focus);
    hjFit();   // the Hunter's line can change length when marking
  }

  /* The book measures what's left of the window below the Hunter, so the whole screen fits
     without scrolling: the list and the page scroll inside. It's measured on the document (not
     on the window), so it doesn't matter where the scroll is; with little room, never less than
     300 px, and then the page does scroll. On mobile the list and the page take turns and measure their own. */
  function hjFit() {
    const pane = hjSec.querySelector('.hj-pane');
    if (!pane || prefs.view !== 'journal') return;
    if (jrNarrow.matches) { pane.style.removeProperty('--hj-pane-h'); return; }
    const body = hjSec.querySelector('.hj-body');
    const padBottom = parseFloat(getComputedStyle(body).paddingBottom);
    const paneTop = pane.getBoundingClientRect().top + scrollY;
    pane.style.setProperty('--hj-pane-h', Math.max(300, Math.floor(innerHeight - paneTop - padBottom)) + 'px');
  }
  addEventListener('resize', hjFit);
  if (document.fonts) document.fonts.ready.then(hjFit);

  /* Only the page, to peek an entry on hover (or go back to the selected one when leaving the
     list) without repainting the 168 rows. */
  function hjShowPage(id) {
    const page = hjSec.querySelector('.hj-page');
    if (!page) return;
    page.innerHTML = hjPageHtml(id);
    page.scrollTop = 0;
  }

  /* The Journal's tab in the bar: its name and your completed entries over the game's total. */
  function paintHjNav() {
    const c = HJ.counts(book);
    hjNav.querySelector('.nav-lbl').textContent = t('navJournal');
    hjNav.querySelector('.nav-num').textContent = `${App.NF[0].format(c.completed)}/${App.NF[0].format(c.total)}`;
    const lbl = t('hjNav', { title: t('jrTitle'), done: App.NF[0].format(c.completed), total: App.NF[0].format(c.total) });
    hjNav.setAttribute('aria-label', lbl);
    hjNav.title = lbl;
  }

  /* The game's notice when an entry changes, with the entry's artwork, just below the bar. */
  function hjNotify(text, id) {
    const n = hjSec.querySelector('.hj-note');
    if (!n) return;
    n.innerHTML = `<img src="${D.art('journal', id)}" alt="" width="42" height="48"><span>${esc(text).replace(/\d+/g, '<b class="hj-note-num">$&</b>')}</span>`;
    n.hidden = false;
    clearTimeout(hjTimer);
    hjTimer = setTimeout(() => { n.hidden = true; }, 2400);
  }

  /* Each change: it's saved, announced like the game does and repainted. If the Hunter's Mark
     goes because the 146 are no longer all there, that's said too. */
  function hjCommit(next, id, focusCount = false) {
    const prev = book;
    book = next;
    hjUndo = null;                  // a change by hand: the bulk one can no longer be undone
    saveJournal();
    const kind = HJ.change(prev, next, id);
    if (kind === 'full') hjInk = id;
    const markLost = HJ.stateOf(prev, HJ.MARK).done && !HJ.stateOf(next, HJ.MARK).done && id !== HJ.MARK;
    hjWas = prev;
    paintHunter(focusCount);
    hjWas = null;
    paintHjNav();
    if (markLost) hjNotify(t('hjMarkDropped', { total: App.NF[0].format(HJ.REQUIRED) }), HJ.MARK);
    else if (kind) hjNotify(id === HJ.MARK ? t('hjMarkKept') : t(kind === 'full' ? 'hjUpdated' : 'hjNewEntry'), id);
  }

  /* Moves the entry being read through the list, like the combat Journal. */
  function hjMove(step, origin) {
    const matches = hjVisible();
    if (!matches.length) return;
    App.hjCursor = stepCursor(matches, App.hjCursor, step);
    paintHunter();
    hjScroll(false);
    if (origin && origin.classList.contains('hj-row')) {
      const rowEl = hjSec.querySelector('#hj-e-' + App.hjCursor);
      if (rowEl) rowEl.focus({ preventScroll: true });
    }
  }
  function hjScroll(center) {
    const listEl = hjSec.querySelector('.hj-list');
    scrollToCur(listEl, listEl && listEl.querySelector('.hj-row.is-cur'), center);
  }

  Object.assign(actions, {
    hjRead(node) {
      App.hjCursor = node.dataset.id;
      hjReading = true;
      paintHunter();
      // On mobile the page replaces the list: scroll up to it.
      if (jrNarrow.matches) {
        const pane = hjSec.querySelector('.hj-pane');
        if (pane && underNav(pane)) pane.scrollIntoView({ block: 'start' });
      }
    },
    hjBack() {
      hjReading = false;
      paintHunter();
      hjScroll(true);
      const rowEl = hjSec.querySelector('.hj-row.is-cur');
      if (rowEl) rowEl.focus({ preventScroll: true });
    },
    hjSet(node) {
      const id = node.dataset.id, v = node.dataset.value;
      const next = v === 'none' ? HJ.clear(book, id) : v === 'seen' ? HJ.encounter(book, id) : HJ.complete(book, id);
      hjCommit(next, id);
    },
    hjStep(node) { hjCommit(HJ.step(book, node.dataset.id, Number(node.dataset.value)), node.dataset.id); },
    hjShowState(node) {
      const v = node.dataset.value;
      if (v === 'all') hjShow = new Set(HJ_STATES);
      else if (!HJ_STATES.includes(v)) return;
      else if (hjShowAll()) hjShow = new Set([v]);
      else {
        if (hjShow.has(v)) hjShow.delete(v); else hjShow.add(v);
        if (!hjShow.size) hjShow = new Set(HJ_STATES);
      }
      hjListFx = true;
      paintHunter();
    },
    hjBulk() {
      hjBulkOpen = !hjBulkOpen;
      if (!hjBulkOpen) { hjPicked = new Set(); hjPickAnchor = ''; }   // collapsing drops the selection
      paintHunter();
    },
    /* One checkbox. With Shift, the range of the list from the last one touched, to the same state. */
    hjPick(node) {
      const id = node.dataset.id;
      if (!hjPickable(id)) return;
      const on = !hjPicked.has(id);
      const ids = hjVisible().map((r) => r.id);
      const a = ids.indexOf(hjPickAnchor), b = ids.indexOf(id);
      const span = hjShift && a >= 0 && b >= 0 ? ids.slice(Math.min(a, b), Math.max(a, b) + 1) : [id];
      for (const x of span.filter(hjPickable)) { if (on) hjPicked.add(x); else hjPicked.delete(x); }
      hjPickAnchor = id;
      paintHunter();
    },
    hjPickAll() {
      for (const r of hjVisible(true)) if (hjPickable(r.id)) hjPicked.add(r.id);
      paintHunter();
    },
    hjPickNone() {
      hjPicked = new Set();
      hjPickAnchor = '';
      paintHunter();
      const b = hjSec.querySelector('[data-act="hjPickAll"]');
      if (b) b.focus({ preventScroll: true });
    },
    /* In bulk, over the ones picked or the current list. Once done, the selection is dropped (it
       has served), and focus moves to "Undo", which brings it back along with what was there. No
       game notice: it isn't something that happens while playing. */
    hjBulkDo(node) {
      const what = node.dataset.value;
      if (!HJ_BULK.some(([v]) => v === what)) return;
      const next = HJ.bulk(book, hjBulkIds().ids, what);
      const n = HJ.changed(book, next);
      if (!n) return;
      hjUndo = { prev: book, what, n, picked: hjPicked };
      hjPicked = new Set();
      hjPickAnchor = '';
      hjWas = book;
      book = next;
      saveJournal();
      paintHunter();
      hjWas = null;
      paintHjNav();
      const b = hjSec.querySelector('[data-act="hjUndo"]');
      if (b) b.focus({ preventScroll: true });
    },
    hjUndo() {
      if (!hjUndo) return;
      const { prev, what, picked } = hjUndo;
      book = prev;
      hjPicked = new Set(picked);
      hjUndo = null;
      saveJournal();
      paintHunter();
      paintHjNav();
      const b = hjSec.querySelector(`[data-act="hjBulkDo"][data-value="${what}"]`);
      if (b) b.focus({ preventScroll: true });
    },
  });

  /* The number is confirmed on release (change) or with Enter, not on every key: repainting
     would take its cursor away. With Enter the focus stays on the new number, to carry on. */
  function hjCount(inp, focusCount) {
    const v = inp.value.trim();
    if (v === '' || !Number.isFinite(Number(v))) { paintHunter(focusCount); return; }
    if (Number(v) === hjState(inp.dataset.id).left) return;
    hjCommit(HJ.set(book, inp.dataset.id, Number(v)), inp.dataset.id, focusCount);
  }
  hjSec.addEventListener('change', (ev) => {
    if (ev.target.matches('.hj-count') && ev.target.isConnected) hjCount(ev.target, false);
  });
  hjSec.addEventListener('input', (ev) => {
    if (!ev.target.matches('.hj-search')) return;
    hjQuery = ev.target.value;
    const matches = hjVisible();
    if (matches.length && !matches.some((r) => r.id === App.hjCursor)) App.hjCursor = matches[0].id;
    paintHunter();
    hjSec.querySelector('.hj-list').scrollTop = 0;
  });
  // The actions don't receive the event: the click's Shift is noted earlier, in the capture phase.
  hjSec.addEventListener('click', (ev) => { hjShift = ev.shiftKey; }, true);
  hjSec.addEventListener('keydown', (ev) => {
    // With the checkboxes in view, Space on the row being read picks it (Shift+Space, the range).
    if (ev.key === ' ' && hjBulkOpen && ev.target.matches('.hj-row')) {
      ev.preventDefault();
      const b = hjSec.querySelector(`.hj-pick[data-id="${ev.target.dataset.id}"]`);
      if (b) { hjShift = ev.shiftKey; actions.hjPick(b); }
      return;
    }
    // Esc in the search box with something typed clears it.
    if (ev.key === 'Escape' && ev.target.matches('.hj-search') && hjQuery) {
      ev.preventDefault();
      hjQuery = '';
      paintHunter();
      hjScroll(true);
      return;
    }
    if (ev.key === 'Enter' && ev.target.matches('.hj-count')) { ev.preventDefault(); hjCount(ev.target, true); return; }
    if (ev.target.matches('.hj-search, .hj-row')) {
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[ev.key]
        || (ev.target.matches('.hj-row') && { Home: 'first', End: 'last' }[ev.key]);
      if (step) { ev.preventDefault(); hjMove(step, ev.target); }
    }
  });

  Object.assign(App, { hjSec, loadJournal, renderHunter, paintHunter, hjFit, hjShowPage, paintHjNav,
    hjScroll });
})();
