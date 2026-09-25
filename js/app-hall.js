/* js/app-hall.js — Combat's Hall of Gods tab: your game's marks, the grid of statues, the
   plaque, the tablet and the statue fight, with their actions. Shares HK.app with js/app.js
   (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const F = HK.foes, HG = HK.hall;
  const App = HK.app;
  const { t, pick, KEY, el, NT, esc, load, save, prefs, savePrefs, brackets, chevron, rule, fight, fs, alive,
    hallFight, foe, phasesOf, totalHp, fightReset, jrNarrow, enduranceOf, fightEndHtml, fightSumHtml, wonNote, dealtOf,
    arenaHtml, render, underNav, actions } = App;

  /* The Hall of Gods marks: { id: ['at', 'asra', 'radiant'] }. They are your real game's,
     marked by hand on the plaque (HG.toggleMark), and saved apart from the build. The
     simulator doesn't touch them: it only shows how your build performs. */
  App.marks = {};
  const loadMarks = () => {
    try { App.marks = HG.normalizeMarks(JSON.parse(load(KEY.hall) || '{}')); } catch (e) { App.marks = {}; }
  };
  const saveMarks = () => save(KEY.hall, Object.keys(App.marks).length ? JSON.stringify(App.marks) : null);

  /* ── Hall of Gods ──────────────────────────────────────────────────────
     One statue per boss, and each is challenged at three difficulties (wiki, "Hall of Gods"):
     Attuned is the fight as in Hallownest with Godhome's health; Ascended, damage ×2, more
     health and sometimes a new arena; Radiant, Ascended and one hit kills you. Entering heals
     you fully and falling sends you back to the statue, so nothing carries over here.

     There are 44 fights on 35 pedestals: the lever ones and the dreamcatcher ones carry two
     bosses, and here that pedestal splits into two halves. The symbols are your real game's: they're marked by hand on the plaque, each
     one on its own, and with all 44 beaten the Void Idol changes. Winning here marks
     nothing: the simulator only shows how your build performs. All three difficulties are always
     open.

     On mobile the plaque replaces the grid, like the Journal's page replaces its list. */
  const DIFF_KEY = { at: 'diffAt', asra: 'diffAs', radiant: 'diffRa' };
  let hallReading = false;          // on mobile: the plaque shows instead of the grid
  App.hallTablet = false;           // the tablet is read in place of the grid and the plaque
  let hallFilter = '';              // 'at' | 'asra' | 'radiant': dims the ones already beaten there
  let hallBulk = false;             // the "Mark in bulk" panel, open
  let hallUndo = null;              // { prev, d, on, n }: the last bulk action, to undo it
  // Those who only fight in Godhome: their "usual" arena is the Pantheon's.
  const godhomeOnly = (x) => ['Godhome', 'Pantheon of Hallownest'].includes(x.zone && x.zone.en);
  // The glyph for a double pedestal's lever (the wiki has no sprite): base, rod and knob.
  const LEVER_SVG = `<svg class="ped-lever" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M3 15h12M9 15L5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5" cy="5" r="1.9" fill="currentColor"/></svg>`;
  const hasMark = (id, d) => (App.marks[id] || []).includes(d);
  /* Only on the repaint after a change, so what changed moves once and the next repaint is still:
     markFx { id, d, on, tier } after marking on the plaque; filterWas, the filter before the new
     one; tabletFx, 'open' or 'close'. */
  let markFx = null, filterWas = null, tabletFx = '';
  // The symbol just marked inks in; just removed, its light goes out.
  const inkOf = (id, d) => (markFx && markFx.id === id && markFx.d === d ? (markFx.on ? ' is-inking' : ' is-out') : '');
  const hallBadge = (d, on, fx = '') => `<img class="hall-badge m-${d} ${on ? 'is-on' : ''}${fx}" src="assets/hall/badge-${d}.png" alt="" width="20" height="20">`;
  const statueName = (s) => pick(F.FOE_BY_ID[s.id].name);
  // A double pedestal's partner, both ways, and how to switch to it.
  const partnerOf = (s) => (s.of ? HG.STATUE_BY_ID[s.of] : HG.STATUES.find((y) => y.of === s.id) || null);

  function renderHall(head) {
    return `<div class="fight-body hall">${brackets}${head}${hallFight() ? hallFightHtml() : hallBoardHtml()}</div>`;
  }

  function hallBoardHtml() {
    const total = HG.STATUES.length;
    const tier = HG.idolTier(App.marks);
    const won = Object.fromEntries(HG.DIFFS.map((d) => [d, HG.STATUES.filter((s) => hasMark(s.id, d)).length]));
    /* Each count is a filter: tapping it dims on the grid the ones already beaten at that
       difficulty and leaves lit the ones still to go. Tapping the active one turns it off. */
    const counts = HG.DIFFS.map((d) => {
      const n = won[d], on = hallFilter === d;
      return `<li class="hall-count${markFx && markFx.d === d ? ' is-flash' : ''}"><button type="button" class="hall-count-btn ${on ? 'is-on' : ''}" data-act="hallFilter" data-value="${d}"
        aria-pressed="${on}" title="${esc(t('hallFilterBtn', { diff: t(DIFF_KEY[d]) }))}">${hallBadge(d, n > 0)}
        <span class="hall-count-num"><b>${App.NF[0].format(n)}</b><i class="u">/${total}</i></span>
        <span class="hall-count-lbl">${esc(t(DIFF_KEY[d]))}</span></button></li>`;
    }).join('');
    const filterNote = hallFilter ? `<p class="hall-filter-note" role="status">${esc(t(
      won[hallFilter] === 0 ? 'hallFilterNone' : won[hallFilter] === 1 ? 'hallFilterOnOne' : 'hallFilterOn',
      { won: App.NF[0].format(won[hallFilter]), diff: t(DIFF_KEY[hallFilter]), left: App.NF[0].format(total - won[hallFilter]) }))}</p>` : '';
    /* Mark in bulk: one symbol on all 44 at once, by difficulty. It's rarely used, so it
       goes collapsed, and whatever wouldn't change anything is dimmed. Removing wipes your real
       game: the last action can be undone until the next change of marks. The lit badge
       marks and the dimmed one removes. */
    const rowEl = (on) => {
      const lbl = 'hall-bulk-' + (on ? 'set' : 'unset');
      return `<div class="hall-go-row" role="group" aria-labelledby="${lbl}">
        <span class="lbl" id="${lbl}">${esc(on ? t('hallBulkSet', { n: total }) : t('hallBulkUnset'))}</span>
        ${HG.DIFFS.map((d) => `<button type="button" class="btn hall-bulk-btn" data-act="hallMarkAll" data-value="${d}" data-on="${on ? 1 : 0}"
          ${(on ? won[d] < total : won[d] > 0) ? '' : 'disabled'}>${hallBadge(d, on)}${esc(t(DIFF_KEY[d]))}</button>`).join('')}
      </div>`;
    };
    const undoNote = hallUndo ? `<p class="hall-bulk-done"><span role="status">${esc(t(
      (hallUndo.on ? 'hallBulkDoneSet' : 'hallBulkDoneUnset') + (hallUndo.n === 1 ? 'One' : ''),
      { diff: t(DIFF_KEY[hallUndo.d]), n: App.NF[0].format(hallUndo.n) }))}</span>
      <button type="button" class="btn hall-undo" data-act="hallUndo">${esc(t('hallUndo'))}</button></p>` : '';
    const bulk = `<button type="button" class="btn hall-bulk-toggle" data-act="hallBulk" aria-expanded="${hallBulk}"
        title="${esc(t('hallBulkHint', { n: total }))}">${esc(t('hallBulk'))}${chevron(hallBulk)}</button>`;
    // Open, the panel goes on a row of its own under the Idol and the tablet: neither moves.
    const bulkPanel = hallBulk ? `<div class="hall-bulk">${rowEl(true)}${rowEl(false)}
        <p class="hall-bulk-rule">${esc(t('hallBulkRule'))}</p>${undoNote}</div>` : '';
    // The Idol changing tier (all 44 at a difficulty) lights up like what you get on Your game.
    const idolFx = markFx && markFx.tier !== tier ? (tier ? ' is-lit' : ' is-out') : '';
    const idol = `<div class="hall-idol ${tier ? '' : 'is-off'} ${hallBulk ? 'is-bulk' : ''}${idolFx}">
      <span class="hall-idol-art"><img src="assets/hall/idol-${tier || 'at'}.png" alt=""></span>
      <div class="hall-idol-body">
        <h3>${esc(t('hallIdol'))}</h3>
        <p class="hall-idol-note">${esc(tier ? t('hallIdolOn', { n: total, diff: t(DIFF_KEY[tier]) }) : t('hallIdolOff', { n: total }))}</p>
        <ul class="hall-counts" aria-label="${esc(t('hallCountTitle'))}">${counts}</ul>
        ${filterNote}
        <p class="hall-rules">${esc(t('hallRules'))}</p>
        ${bulk}
      </div>
      ${tabletMini()}
      ${bulkPanel}
    </div>`;

    const tile = (s) => {
      const on = s.id === prefs.hallId;
      const got = HG.DIFFS.filter((d) => hasMark(s.id, d)).map((d) => t(DIFF_KEY[d]));
      const title = statueName(s) + ' · ' + (got.length ? got.join(', ') : t('hallNoMarks'));
      // With a filter, the one already beaten at that difficulty dims: the ones still to go stay lit.
      const dim = !!hallFilter && hasMark(s.id, hallFilter);
      // Changing the filter, the light fades out on the ones that dim and back on the ones that wake.
      const dimWas = filterWas !== null && !!filterWas && hasMark(s.id, filterWas);
      const dimFx = filterWas === null || dim === dimWas ? '' : dim ? 'is-dimming' : 'is-waking';
      const marked = markFx && markFx.id === s.id && markFx.on ? 'is-marked' : '';
      // A double pedestal's second fight carries its glyph: the Dream Nail or the lever.
      const via = s.via === 'dream' ? '<img class="ped-dream" src="assets/abilities/dream1.png" alt="">' : s.via === 'lever' ? LEVER_SVG : '';
      // A single tab stop in the grid: the chosen one; the arrows move (hallMove).
      return `<button type="button" class="ped-btn ${s.via === 'dream' ? 'is-dream' : ''} ${on ? 'is-on' : ''} ${dim ? 'is-dim' : ''} ${dimFx} ${marked}"
        data-act="hallPick" data-id="${s.id}" aria-pressed="${on}" tabindex="${on ? 0 : -1}" title="${esc(title)}">
        <span class="ped-niche"><img src="assets/hall/${HG.artOf(s)}.png" alt="" loading="lazy">${via}</span>
        <span class="ped-name"${NT}>${esc(s.short ? pick(s.short) : statueName(s))}</span>
        <span class="ped-marks" aria-hidden="true">${HG.DIFFS.map((d) => hallBadge(d, hasMark(s.id, d), inkOf(s.id, d))).join('')}</span>
        <span class="sr-only">${esc(got.length ? got.join(', ') : t('hallNoMarks'))}${s.via ? ' · ' + esc(t(s.via === 'dream' ? 'hallViaDream' : 'hallViaLever')) : ''}</span>
      </button>`;
    };
    /* The last double pedestal (Grimm) goes as two single ones: no single statue comes after
       it to fill the gap it leaves when it doesn't fit at the end of a row ("dense", in the
       CSS), and split, Troupe Master Grimm fills it himself. Nightmare King keeps his glyph. */
    const lastPair = HG.PEDESTALS.findLast((ped) => ped.length === 2);
    const grid = HG.PEDESTALS.map((ped) => (ped.length === 1 || ped === lastPair
      ? ped.map((s) => `<div class="ped">${tile(s)}</div>`).join('')
      : `<div class="ped ped-pair" title="${esc(t(ped[1].via === 'dream' ? 'hallViaDream' : 'hallViaLever'))}">${ped.map(tile).join('')}</div>`)).join('');

    // The tablet, when open, takes the place of the grid and the plaque; the Idol stays on top.
    return `${idol}
      ${App.hallTablet ? tabletHtml() : `<div class="hall-room ${hallReading ? 'is-reading' : ''}${tabletFx === 'close' ? ' is-fresh' : ''}">
        <div class="hall-grid" role="group" aria-label="${esc(t('fightTabHall'))}">${grid}</div>
        <article class="hall-plaque jr-page" aria-live="polite">${hallPlaqueHtml()}</article>
      </div>`}`;
  }

  /* The statue's plaque: who it is, its title on the pedestal and, difficulty by
     difficulty, what it costs you with your build. It's the sum the game doesn't show. */
  function hallPlaqueHtml() {
    const s = HG.STATUE_BY_ID[prefs.hallId];
    const x = F.FOE_BY_ID[s.id];
    const partner = partnerOf(s);
    const via = s.via || (partner && partner.via);
    const nail = fs().stats['nail.damage'].value;
    /* A table and not three cards: what matters is comparing the three difficulties. */
    const perDiff = Object.fromEntries(HG.DIFFS.map((d) => [d, { total: totalHp(x, d), ...enduranceOf(x, d) }]));
    /* Each difficulty is a button: it marks or removes your real game's symbol. */
    const diffRows = HG.DIFFS.map((d) => {
      const c = perDiff[d], won = hasMark(s.id, d);
      return `<tr class="${won ? 'is-won' : ''}">
        <th scope="row"><button type="button" class="hall-mark" data-act="hallMark" data-value="${d}" aria-pressed="${won}"
          title="${esc(t(won ? 'hallMarkUnset' : 'hallMarkSet', { diff: t(DIFF_KEY[d]) }))}">${hallBadge(d, won, inkOf(s.id, d))}${esc(t(DIFF_KEY[d]))}</button></th>
        <td>${App.NF[0].format(c.total)}</td>
        <td>${App.NF[0].format(Math.ceil(c.total / nail))}</td>
        <td>${App.NF[0].format(c.n)}</td>
      </tr>`;
    }).join('');
    const phaseCount = x.pool ? 1 : phasesOf(x, 'at').length;
    const worstHitAt = perDiff.at.worstHit, worstHitAsra = perDiff.asra.worstHit;
    const hallNotes = [
      phaseCount > 1 ? t('hallNotePhases', { n: phaseCount }) : '',
      t('hallNoteHits', { n: App.NF[0].format(nail) }),
      t(worstHitAt === 1 ? 'hallNoteSurviveOne' : 'hallNoteSurvive', { at: worstHitAt, asra: worstHitAsra }),
    ].filter(Boolean).join(' ');
    const tableHtml = `<table class="hall-table">
        <thead><tr>
          <th scope="col"><span class="sr-only">${esc(t('hallColDiff'))}</span></th>
          <th scope="col">${esc(t('jrHp'))}</th>
          <th scope="col">${esc(t('hallColHits'))}</th>
          <th scope="col">${esc(t('hallColSurvive'))}</th>
        </tr></thead>
        <tbody>${diffRows}</tbody>
      </table>
      <p class="hall-mark-hint">${esc(t('hallMarkHint'))}</p>
      <p class="hall-notes">${esc(hallNotes)}</p>
      <p class="hall-arena"><b>${esc(t('hallArena'))}</b> ${esc(s.arena ? pick(s.arena) : t(godhomeOnly(x) ? 'hallArenaPantheon' : 'hallArenaSame'))}</p>
      <div class="hall-go-row" role="group" aria-labelledby="hall-go-lbl">
        <span class="lbl" id="hall-go-lbl">${esc(t('hallFightLbl'))}</span>
        ${HG.DIFFS.map((d) => `<button type="button" class="btn btn-primary hall-go" data-act="hallFight" data-value="${d}">${esc(t(DIFF_KEY[d]))}</button>`).join('')}
      </div>`;
    return `${brackets}
      <button type="button" class="btn jr-back" data-act="hallList">‹ ${esc(t('fightTabHall'))}</button>
      <div class="hall-art${markFx && markFx.id === s.id && markFx.on ? ' is-marked' : ''}"><img src="assets/hall/${HG.artOf(s)}.png" alt=""></div>
      <h3 class="jr-title"${NT}>${esc(pick(x.name))}</h3>
      <p class="hall-title"${NT}>${esc(pick(s.title))}</p>
      ${rule}
      ${partner ? `<button type="button" class="btn hall-other" data-act="hallPick" data-id="${partner.id}">${esc(t(via === 'dream' ? 'hallDream' : 'hallLever', { name: statueName(partner) }))}</button>` : ''}
      ${tableHtml}`;
  }

  /* The arrows across the grid: left and right, the statue before and after; up and down,
     the one in the neighbouring row with the closest centre (the double pedestals and the
     "dense" packing make the columns not line up). They pick the statue without opening the
     plaque: on mobile, the arrows mustn't hide the grid. */
  function hallMove(key, origin) {
    const tiles = [...el.fight.querySelectorAll('.ped-btn')];
    const i = tiles.indexOf(origin);
    if (i < 0) return;
    let j = i;
    if (key === 'Home') j = 0;
    else if (key === 'End') j = tiles.length - 1;
    else if (key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (key === 'ArrowRight') j = Math.min(tiles.length - 1, i + 1);
    else {
      const boxes = tiles.map((b) => b.getBoundingClientRect());
      const mine = boxes[i], cx = (mine.left + mine.right) / 2;
      const rowTops = [...new Set(boxes.map((c) => Math.round(c.top)))].sort((a, b) => a - b);
      const k = rowTops.indexOf(Math.round(mine.top)) + (key === 'ArrowUp' ? -1 : 1);
      if (k < 0 || k >= rowTops.length) return;
      let bestDist = Infinity;
      boxes.forEach((c, n) => {
        if (Math.round(c.top) !== rowTops[k]) return;
        const dist = Math.abs((c.left + c.right) / 2 - cx);
        if (dist < bestDist) { bestDist = dist; j = n; }
      });
    }
    if (j === i) return;
    prefs.hallId = tiles[j].dataset.id;
    savePrefs();
    render();
    const b = el.fight.querySelector(`.ped-btn[data-id="${prefs.hallId}"]`);
    if (b) b.focus();
  }

  /* The entrance tablet, traced from its screen in the game: the two Godmaster ornaments,
     the title and the 44 in four columns of eleven, in the tablet's order (HG.TABLET),
     each with its statue name and the highest symbol you have in front of it
     (HG.tabletMark). As there, it's read-only. It doesn't cover the site: it's read inside the
     Hall, in place of the grid and the plaque, like the Journal's page in place of its list on
     mobile, and you go back to the statues with "‹ Statues", with Esc or with its own button.
     It has no box: the frame's black is already its screen's. */
  // The arrow of "‹ Statues", drawn like the cross of "Close": the serif's "‹" comes out tiny.
  const TABLET_BACK = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 L3.5 6 L8 10.5"/></svg>';
  /* The tablet in miniature, on the Idol's row: the same shape as the full one —its two ornaments
     and the 44 in four columns of eleven, each with its highest symbol and its name—, small, and
     the names in the dense cells' sans (Cinzel doesn't read at this size). At a glance, how much of
     the Hall you have and at what difficulty; tapping it reads the full tablet, and while that's
     open the miniature stays lit. */
  function tabletMini() {
    const marks = HG.TABLET.map((id) => {
      const d = HG.tabletMark(App.marks, id), s = HG.STATUE_BY_ID[id];
      const name = (s.tablet ? pick(s.tablet) : statueName(s)) + ' · ' + (d ? t(DIFF_KEY[d]) : t('hallNoMarks'));
      const label = s.tablet ? pick(s.tablet) : statueName(s);
      const mark = d ? `<img class="mini-mark m-${d}" src="assets/hall/badge-${d}.png" alt="">` : '<span class="mini-mark is-empty"></span>';
      return `<span class="mini-row" title="${esc(name)}">${mark}<span class="mini-name"${NT}>${esc(label)}</span></span>`;
    }).join('');
    return `<button type="button" class="hall-tablet-btn hall-mini" data-act="tablet" aria-pressed="${App.hallTablet}"
        aria-label="${esc(t('hallTablet'))}" title="${esc(t('hallTabletHint'))}">
        <img class="mini-orn" src="assets/hall/tablet-hdr.png" alt="" width="862" height="111">
        <span class="mini-grid" aria-hidden="true">${marks}</span>
        <img class="mini-orn is-ftr" src="assets/hall/tablet-ftr.png" alt="" width="520" height="70">
        <span class="mini-lbl">${esc(t('hallTablet'))}</span>
      </button>`;
  }
  function tabletHtml() {
    const rowEl = (id, i) => {
      const s = HG.STATUE_BY_ID[id], d = HG.tabletMark(App.marks, id);
      const markIcon = d ? `<img class="tablet-mark m-${d}" src="assets/hall/badge-${d}.png" alt="" width="36" height="36">` : '<span class="tablet-mark is-empty"></span>';
      return `<li class="tablet-row" style="--i:${i}">${markIcon}<span class="tablet-name"${NT}>${esc(s.tablet ? pick(s.tablet) : statueName(s))}</span>`
        + `<span class="sr-only"> · ${esc(d ? t(DIFF_KEY[d]) : t('hallNoMarks'))}</span></li>`;
    };
    return `<section class="tablet${tabletFx === 'open' ? ' is-fresh' : ''}" aria-labelledby="tablet-title">
      <div class="tablet-bar"><button type="button" class="tablet-back" data-act="tabletClose">${TABLET_BACK}${esc(t('hallStatues'))}</button></div>
      <div class="tablet-page">
        <img class="tablet-hdr" src="assets/hall/tablet-hdr.png" alt="" width="862" height="111">
        <h3 class="tablet-title" id="tablet-title" tabindex="-1">${esc(t('fightTabHall'))}</h3>
        <ol class="tablet-list">${HG.TABLET.map(rowEl).join('')}</ol>
        <img class="tablet-ftr" src="assets/hall/tablet-ftr.png" alt="" width="520" height="70">
      </div>
    </section>`;
  }

  /* In front of the statue: the usual arena, with the chosen difficulty. On winning it says
     whether the symbol is new; on falling, as in the game, you go back to the statue. */
  function hallFightHtml() {
    const s = HG.STATUE_BY_ID[prefs.hallId], d = prefs.hallDiff;
    const acts = `<button type="button" class="btn btn-primary" data-act="fightReset">${esc(t('runAgain'))}</button>
      <button type="button" class="btn" data-act="hallBack">‹ ${esc(t('hallBack'))}</button>`;
    // Winning leaves no symbol: the Hall's are your real game's, and they're marked on the plaque.
    const ending = fight.over && alive()
      ? fightEndHtml({ won: true, cls: 'hall-done', title: t('fightWon'), acts, note: wonNote(foe()), sum: fightSumHtml() })
      : !alive() ? fightEndHtml({ won: false, cls: 'hall-done', title: t('fightDead'), note: t('hallDied', dealtOf(foe())), sum: fightSumHtml(), acts }) : '';
    return `<div class="run-head hall-head">
        <h3>${esc(statueName(s))}</h3>
        <span class="fighter-phase hall-diff">${hallBadge(d, hasMark(s.id, d))}${esc(t(DIFF_KEY[d]))}</span>
        <span class="hall-head-acts">
          <button type="button" class="btn" data-act="fightReset" title="${esc(t('fightResetHint'))}">${esc(t('fightReset'))}</button>
          <button type="button" class="btn" data-act="hallBack">‹ ${esc(t('hallBack'))}</button>
        </span>
      </div>
      ${arenaHtml(ending)}`;
  }

  Object.assign(actions, {
    /* Hall of Gods. Choosing a statue only reads it on the plaque; fighting is each difficulty's
       button. On mobile the plaque replaces the grid, and the page scrolls up to it. */
    hallPick(node) {
      const id = node.dataset.id;
      if (!HG.STATUE_BY_ID[id]) return;
      prefs.hallId = id;
      hallReading = true;
      App.hallTablet = false;
      savePrefs();
      render();
      const plaque = el.fight.querySelector('.hall-plaque');
      if (jrNarrow.matches) {
        if (plaque && underNav(plaque)) plaque.scrollIntoView({ block: 'start' });
      } else {
        const b = el.fight.querySelector(`.ped-btn[data-id="${id}"]`);
        if (b) b.focus();
      }
    },
    hallList() {
      hallReading = false;
      render();
      const b = el.fight.querySelector(`.ped-btn[data-id="${prefs.hallId}"]`);
      if (b) { b.scrollIntoView({ block: 'nearest' }); b.focus(); }
    },
    hallFight(node) {
      const d = node.dataset.value;
      if (!HG.DIFFS.includes(d)) return;
      prefs.hallDiff = d;
      App.hallTablet = false;           // on returning from the fight, to the plaque
      savePrefs();
      fightReset();
      render();
      if (underNav(el.fight)) el.fight.scrollIntoView({ block: 'start' });
      const b = el.fight.querySelector('.hall-head [data-act="hallBack"]');
      if (b) b.focus({ preventScroll: true });
    },
    /* Mark or remove a difficulty's symbol by hand: it's your real game, not the simulator. */
    hallMark(node) {
      const d = node.dataset.value;
      const tier = HG.idolTier(App.marks);
      App.marks = HG.toggleMark(App.marks, prefs.hallId, d);
      hallUndo = null;
      saveMarks();
      markFx = { id: prefs.hallId, d, on: hasMark(prefs.hallId, d), tier };
      render();
      markFx = null;
      const b = el.fight.querySelector(`.hall-mark[data-value="${d}"]`);
      if (b) b.focus({ preventScroll: true });
    },
    hallBulk() {
      hallBulk = !hallBulk;
      render();
      const b = el.fight.querySelector('[data-act="hallBulk"]');
      if (b) b.focus({ preventScroll: true });
    },
    /* One symbol on all 44 at once. The pressed button dims (it would no longer change anything), so
       focus moves to "Undo". */
    hallMarkAll(node) {
      const d = node.dataset.value, on = node.dataset.on === '1';
      if (!HG.DIFFS.includes(d)) return;
      const n = HG.STATUES.filter((s) => hasMark(s.id, d) !== on).length;
      if (!n) return;
      hallUndo = { prev: App.marks, d, on, n };
      App.marks = HG.markAll(App.marks, d, on);
      saveMarks();
      render();
      const b = el.fight.querySelector('[data-act="hallUndo"]');
      if (b) b.focus({ preventScroll: true });
    },
    hallUndo() {
      if (!hallUndo) return;
      const { prev, d, on } = hallUndo;
      App.marks = prev;
      hallUndo = null;
      saveMarks();
      render();
      const b = el.fight.querySelector(`[data-act="hallMarkAll"][data-value="${d}"][data-on="${on ? 1 : 0}"]`);
      if (b) b.focus({ preventScroll: true });
    },
    /* The entrance tablet, in place of the grid and the plaque. Its button, next to the Idol,
       opens and closes it; inside, "‹ Statues" (or Esc) goes back to the grid. */
    tablet() { if (App.hallTablet) actions.tabletClose(); else actions.tabletOpen(); },
    tabletOpen() {
      App.hallTablet = true;
      hallReading = false;              // back to the grid: on mobile, not to the plaque that was being read
      tabletFx = 'open';
      render();
      tabletFx = '';
      const tab = el.fight.querySelector('.tablet'), h = el.fight.querySelector('.tablet-title');
      if (!tab) return;
      /* Make it visible: if it isn't already fully in view, scroll up to it. If it fits under the bar
         (the four columns), whole; if not (two columns or one), from its top. */
      const r = tab.getBoundingClientRect();
      const fitsBelow = r.height <= innerHeight - el.nav.offsetHeight;
      if (underNav(tab) || r.bottom > innerHeight) tab.scrollIntoView({ block: fitsBelow ? 'nearest' : 'start' });
      // Focus goes to its title and not to "‹ Statues": it's read from the top and not left by accident.
      h.focus({ preventScroll: true });
    },
    tabletClose() {
      App.hallTablet = false;
      tabletFx = 'close';
      render();
      tabletFx = '';
      const b = el.fight.querySelector('.hall-tablet-btn');
      if (b) b.focus();
    },
    /* A difficulty's count filters the grid; tapping the active one turns it off. With the
       tablet open, it goes back to the grid: that's where the filter shows. */
    hallFilter(node) {
      const d = node.dataset.value;
      filterWas = App.hallTablet ? null : hallFilter;   // from the tablet the grid is new: nothing to fade
      hallFilter = hallFilter === d || !HG.DIFFS.includes(d) ? '' : d;
      App.hallTablet = false;
      render();
      filterWas = null;
      const b = el.fight.querySelector(`.hall-count-btn[data-value="${d}"]`);
      if (b) b.focus({ preventScroll: true });
    },
    /* Back to the statue: the fight is left, the plaque stays on the one it was on. */
    hallBack() {
      prefs.hallDiff = '';
      savePrefs();
      fightReset();
      render();
      const plaque = el.fight.querySelector('.hall-plaque');
      if (plaque && underNav(plaque)) plaque.scrollIntoView({ block: 'start' });
    },
  });

  Object.assign(App, { loadMarks, DIFF_KEY, renderHall, hallMove });
})();
