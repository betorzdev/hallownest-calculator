/* js/app-charms.js — the Charms screen: the sheet's HUD, the charm band with its detail and
   the notch preview, the spell and art plates, the hidden effects and the full sheet, with
   their actions. Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, C = HK.codec, I = HK.i18n, E = HK.engine;
  const App = HK.app;
  const { t, pick, KEY, el, hoverable, SPELL_KEYS, ART_KEYS, ART_STAT, NEED_KEY, NT, namedSrc, esc, save,
    pctSpace, fmtValue, fmtStat, fmtStatRich, sign, masksText, notchText, spellArt, shortOf, goodClass,
    deltaChip, changeChip, justWorn, justFound, prefs, savePrefs, compareLabel, compute, impact, recompute, commit, brackets,
    chevron, cross, screenHead, hudHtml, render, underNav, toast, actions, isOwned, isFixed, setOwned } = App;

  /* ── Sheet panel: figures, meters, spells and arts ───────────────────── */
  // The flash class: only on the repaint that follows a change (flashIds, in commit()).
  const flashCls = (id) => (App.flashIds && App.flashIds.has(id) ? ' is-flash' : '');

  /* A figure in the status block. Its preview (paintPreview) takes the note's place, on top of
     it: that way it doesn't change the height or push the grid below. */
  function metric(id, label, opts = {}) {
    const s = App.sheet.stats[id];
    const value = opts.value !== undefined ? esc(opts.value) : fmtStatRich(s);
    const note = opts.note !== undefined ? opts.note : '';
    return `<button type="button" class="metric${flashCls(id)}" data-act="kpi" data-id="${id}" title="${esc(t('goTo', { label: s ? s.label : label }))}">
      <span class="lbl">${esc(label)}</span>
      <span class="val"><span>${value}</span>${changeChip(id)}</span>
      <span class="note"><span class="note-t">${note}</span><span class="pv" data-pv="${id}"></span></span>
    </button>`;
  }

  // What is giving you the reach you have: the charms that lengthen it, or "base reach".
  function rangeNote() {
    const names = App.sheet.stats['nail.range'].contribs
      .filter((c) => c.active !== false && c.source.startsWith('charm:'))
      .map((c) => c.label);
    return names.length ? names.join(' + ') : t('rangeBase');
  }

  // Almost everything that kills in the late game hits for 2 masks, so the figure for
  // hits until you die carries its equivalent at 2 alongside.
  function twoMaskNote() {
    const s = App.sheet.stats;
    if (!s['health.hitsToDie'].applies) return '';
    return t('twoMaskHits', { n: Math.ceil(s['health.total'].value / (2 * s['health.damageMult'].value)) });
  }

  function heroNote() {
    const s = App.sheet.stats;
    const beam = s['nail.elegy'];
    if (beam.applies && beam.value) return t('hitElegy', { nail: fmtStat(s['nail.damage']), beam: fmtStat(beam) });
    if (App.sheet.flags.fury) return t('hitFury');
    if (App.sheet.flags.strength) return t('hitStrength', { charm: pick(D.CHARM_BY_ID[App.sheet.flags.strength]) });
    return t('hitNoBonus');
  }

  /* The status block: the game's HUD (the same one as the arena, larger) with health and soul
     as figures below it, with no other text; the nail damage in large type with the nail next
     to it, and the six figures in one row. Everything that matters, above the charm grid.
     The masks are the health control: press the third and you're left with three, press the
     last and you're back to full health. Lifeblood is spent first, just as in the game, so
     what you have left fills the white ones first; a spent one leaves its slot dark so you can
     go back up. With health lost, the figure reads "6/9".
     Soul can also be spent by hand, even though no figure changes: it's there to see. It works
     as in the game: it's a single number, the orb fills first and the rest goes to the vessels,
     in order, so there's never a full vessel with the orb half-full, nor the second one full
     with the first empty. Each tap on the orb casts a spell from your build (33, or 24 with
     Spell Twister); if the vessels hold soul, the orb drops and they refill it right away
     (SOUL_REFILL_MS: the wiki says "after a short delay" without giving the figure). When
     there's not enough for another, the next tap fills everything. A full vessel, when
     tapped, empties along with the ones to its right; an empty one fills, and with it
     everything before it: the orb and the earlier vessels. It isn't saved: on reload, soul is
     full. How the masks and the orb are used is told by their title, not by a note. */
  let panelHudPrev = null;          // the last thing the sheet's HUD painted, to animate the change
  let soulSpent = 0;                // soul spent by hand, below what fits
  let soulDrain = null;             // while the vessels refill the orb: the level it has dropped to
  let soulTimer = 0;
  const SOUL_REFILL_MS = 500;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  // If the vessels were refilling the orb, it finishes now: the next tap starts from there.
  function settleSoul() {
    if (!soulTimer) return;
    clearTimeout(soulTimer);
    soulTimer = 0;
    soulDrain = null;
  }
  const soulLevels = () => {
    const s = App.sheet.stats, total = s['soul.total'].value;
    soulSpent = Math.max(0, Math.min(soulSpent, total));
    return { total, mainMax: s['soul.main'].value, cost: s['soul.spellCost'].value, now: total - soulSpent };
  };
  function renderStatus() {
    const s = App.sheet.stats;
    const masks = s['health.masks'].value, lb = s['health.lifeblood'].value;
    const maxHp = masks + lb, hp = App.sheet.currentHealth;
    const white = Math.min(hp, masks), lbOn = Math.max(0, hp - masks);
    const main = s['soul.main'].value;
    const vessels = Math.round(s['soul.reserve'].value / D.SOUL.vesselSize);
    // What's been spent never exceeds what fits: if you change build, it gets trimmed.
    const { total, now: soulNow, cost } = soulLevels();
    const mainNow = soulDrain != null ? soulDrain : Math.min(soulNow, main);
    const orbFull = soulNow >= main;
    const orbTitle = soulNow >= cost ? t('soulCastTitle', { n: cost }) : t('soulRefillTitle');
    const hud = hudHtml({
      masks: white, maxMasks: masks, lb: lbOn, lbSlots: lb, soul: soulNow, main: mainNow, mainMax: main, vessels,
      // What a tap on the orb would leave: a spell's cost less, or everything refilled if there isn't enough.
      castSoul: soulNow >= cost ? soulNow - cost : total, ready: mainNow >= cost,
      hive: App.sheetHas(App.sheet, 'hiveblood'), lbJoni: App.sheet.joniLifeblood || 0,
      over: !!App.sheet.notches.overcharmed,
      orbAttrs: ` data-act="soulOrb" title="${esc(orbTitle)}" aria-label="${esc(orbTitle)}"`,
      vesselAttrs: (i, full) => {
        const title = full ? t('vesselEmptyTitle') : orbFull ? t('vesselFillTitle') : t('vesselFillAllTitle');
        return ` data-act="soulVessel" data-value="${i}" aria-pressed="${full}" title="${esc(title)}" aria-label="${esc(title)}"`;
      },
      slot: (g, cls, inner, on) => {
        const to = g + 1 === maxHp ? 0 : g + 1;
        return `<button type="button" class="${cls} pip-mask" data-act="hp" data-value="${to}" aria-pressed="${on}"
          title="${esc(to ? t('hpSetTitle', { n: to }) : t('hpFullTitle'))}">${inner}</button>`;
      },
    }, panelHudPrev);
    panelHudPrev = { masks: white, lb: lbOn, soul: soulNow, main: mainNow };

    // Health and soul, as figures only; with health lost or soul spent, over the maximum.
    const of = (n, max) => (n < max ? `${App.NF[0].format(n)}<i class="of">/${App.NF[0].format(max)}</i>` : App.NF[0].format(max));
    const readout = (cls, id, label, html) => `<div class="rd ${cls}${flashCls(id)}">
        <span class="lbl">${esc(label)}</span>
        <span class="v"><span>${html}</span>${changeChip(id)}<span class="pv" data-pv="${id}"></span></span>
      </div>`;
    const heal = s['heal.timePerMask'];
    const burst = s['nail.bestBurst'];
    return `<div class="inv-status">
      <div class="inv-hud">
        ${hud}
        <div class="inv-read">
          ${readout('rd-hp', 'health.total', t('health'), of(hp, maxHp))}
          ${readout('rd-soul', 'soul.total', t('soul'), of(soulNow, total))}
        </div>
      </div>
      <div class="inv-lead">
        <div class="inv-nail"><img class="hero-nail" src="${D.art('nails', App.state.nail)}" alt="" width="80" height="360"></div>
        <button type="button" class="hero${flashCls('nail.damage')}" data-act="kpi" data-id="nail.damage" title="${esc(t('goTo', { label: s['nail.damage'].label }))}">
          <span class="lbl">${esc(t('heroLabel'))}</span>
          <span class="hero-row">
            <span class="hero-num">${fmtStatRich(s['nail.damage'])}</span>
            ${changeChip('nail.damage')}<span class="pv" data-pv="nail.damage"></span>
          </span>
          <span class="hero-note">${esc(heroNote())}</span>
        </button>
      </div>
      <div class="inv-stats">
        ${metric('nail.dps', t('dps'), { note: esc(t('apsNote', { aps: fmtStat(s['nail.aps']) })) })}
        ${metric('nail.range', t('range'), { note: esc(rangeNote()) })}
        ${metric('nail.bestBurst', t('bestHit'), { note: esc(burst.applies ? burst.note : t('noBurstYet')) })}
        ${metric('health.hitsToDie', t('hitsToDie'), { note: esc(twoMaskNote()) })}
        ${metric('soul.perHit', t('soulPerHit'), { note: esc(t('hitsToHeal', { n: fmtStat(s['soul.hitsPerFocus']) })) })}
        ${metric('heal.timePerMask', t('healing'), { note: esc(heal.applies ? t('healNote', { masks: masksText(s['heal.masksPerFocus'].value) }) : t('noFocus')) })}
      </div>
    </div>`;
  }

  // "Clear": each charm fades as dust (css: .eq-row.is-clearing), one every CLEAR_STEP_MS.
  const CLEAR_MS = 320, CLEAR_STEP_MS = 50;
  let clearing = false;

  /* ── Equipped and notches: the pair of blocks from the game's screen ──
     In Hollow Knight, under "Equipped" go the charms you wear, and below them the row
     of "Notches": a lit white dot per notch used, a dark ring per free notch. When you
     overcharm, the notches of the charm that took you over the line come out in magenta
     and the row grows beyond your maximum. */
  /* What the equipped charms, the notches and the charm grid paint, and how they respond. The
     selection is always the page's; a pantheon's bench changes the lock and the help text.
     "locked" carries the reason when they can't be touched: the slots still receive the
     click, so the notice shows when you try. The equipped charms remove directly, like the
     grid (act: 'quick').
     "info" is the cheap part —whether you wear it and what would happen if you touched it—:
     the full impact is only requested by the detail, one charm at a time. The sheet adds its
     own to the context (charmBand): the detail's charm, "Clear" and the overcharm notice. */
  const pageCharms = () => {
    const locked = App.charmLock();
    return {
      st: App.state, notches: App.sheet.notches, act: 'quick', locked,
      info: (id) => ({ equipped: App.state.charms.includes(id), action: C.charmAction(App.state, id) }),
      // While some are missing, the hint also says they can be unlocked there (the grid carries no mark at rest).
      hint: locked ? t('runLockShort') : (hoverable.matches ? t('quickHintHover') : t('quickHintTouch'))
        + (D.CHARMS.some((c) => !isOwned(c.id) && !C.OWN_SLOT_OF[c.id]) || C.OWN_SLOTS.some((sl) => !C.ownState(App.owned, sl.id))
          ? '; ' + t('quickHintUnlock') : ''),
    };
  };

  function overcharmSplit(ctx = pageCharms()) {
    const n = ctx.notches;
    if (!n.overcharmed) return { white: n.used, over: 0 };
    // You can only overcharm with a charm starting from a legal build: the last one
    // you equipped. If the overcharm comes from lowering your maximum (something the game
    // doesn't allow), only the leftover notches are marked.
    const last = ctx.st.charms[ctx.st.charms.length - 1];
    const cost = last ? D.CHARM_BY_ID[last].notches : 0;
    const over = cost > 0 && n.used - cost <= n.max ? cost : n.used - n.max;
    return { white: n.used - over, over };
  }

  /* The row of notches and its label. Separate, because the grid's preview repaints them
     without redoing the sheet (paintNotchPreview). */
  function notchDots(ctx) {
    const n = ctx.notches;
    const { white, over } = overcharmSplit(ctx);
    const slots = Math.max(n.max, n.used);
    /* Right after a change (App.was), the notches the charm takes fill one by one from the left,
       and the ones it gives back empty from the right. */
    const had = App.was ? C.notchesUsed(App.was.state.charms) : n.used;
    let dots = '';
    for (let i = 0; i < slots; i++) {
      const cls = i < white ? 'is-used' : i < white + over ? 'is-over' : 'is-free';
      const fx = i < n.used && i >= had ? ` is-filling" style="--i:${i - had}`
        : i >= n.used && i < had ? ` is-draining" style="--i:${had - 1 - i}` : '';
      dots += `<i class="notch ${cls}${fx}"></i>`;
    }
    return dots;
  }
  const notchFreeText = (n) => (n.overcharmed ? t('overcharmed') : n.free === 1 ? t('notchesFreeOne') : t('notchesFree', { n: n.free }));

  /* The two blocks separately: a pantheon's bench joins them (renderLoadout) and the sheet
     spreads them over its two columns (charmBand). */
  function loadoutBlocks(ctx = pageCharms()) {
    const n = ctx.notches;
    const dots = notchDots(ctx);
    const worn = ctx.st.charms.map((id) => D.CHARM_BY_ID[id]).filter(Boolean);
    const tiles = worn.map((c) => `<button type="button" class="eq${justWorn(c.id) ? ' is-new' : ''}" data-act="${ctx.act}" data-id="${c.id}" ${ctx.locked ? 'aria-disabled="true"' : ''} title="${esc(ctx.locked || (isFixed(c.id) ? pick(c) + ' · ' + t('inspFixed') : t('unequipTitle', { charm: pick(c) })))}">
      <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}">
    </button>`).join('');
    // The game leaves a dark dot marking the next slot while something still fits.
    const slot = !n.overcharmed && n.free > 0 ? '<span class="eq-slot" aria-hidden="true"></span>' : '';
    // "Clear", on the sheet: text in the screen's ink, unboxed, like the tablet's "Close".
    const clear = ctx.clear ? `<button type="button" class="eq-clear" data-act="clear" title="${esc(ctx.locked || t('clearCharmsHint'))}" ${worn.some((c) => !isFixed(c.id)) && !ctx.locked ? '' : 'disabled'}>${cross}${esc(t('clearCharms'))}</button>` : '';
    // And the overcharm notice, below the notches: at the top it wouldn't be seen while you touch the grid.
    const overNote = ctx.over && n.overcharmed ? `<div class="banner is-band" role="status"><span class="banner-tag">${esc(t('overcharmed'))}</span><span class="banner-text">${esc(t('overcharmBanner'))}</span></div>` : '';
    return {
      equipped: `<div class="loadout-block is-eq">
        <div class="block-head">${esc(t('equipped'))}${clear}</div>
        <div class="eq-row">${tiles}${slot}${worn.length ? '' : `<span class="sr-only">${esc(t('noCharmsYet'))}</span>`}</div>
      </div>`,
      notches: `<div class="loadout-block is-notches">
        <div class="block-head">${esc(t('notches'))}<span class="notch-free ${n.overcharmed ? 'is-over' : ''}">${esc(notchFreeText(n))}</span></div>
        <div class="notches">${dots}</div>
        ${overNote}
      </div>`,
    };
  }
  function renderLoadout(ctx = pageCharms()) {
    const b = loadoutBlocks(ctx);
    return `<div class="loadout">${b.equipped}${b.notches}</div>`;
  }

  /* ── Quick access to the charms ────────────────────────────────────────
     The grid from the game's charm screen: four rows of ten slots, numbered 1 to 40, with
     the even rows offset by half a slot. The proportions come from measuring an official
     screenshot (186 px pitch between slots, 103 px offset, 180 px between rows), hence the
     factors in css/app.css.
     Five slots change version in the game —the three fragile ones for their unbreakable
     versions, Kingsoul for Void Heart and Grimmchild for Carefree Melody—; if you have one
     (Charms found), the slot shows only that one, as the game does; if not, it splits into
     two shadowed halves (quickSlot). Only the artwork, no data: a click equips or removes, and what
     each charm does is read in the detail, alongside (charmDetail). */
  const QUICK_PER_ROW = 10;
  const QUICK_SLOTS = D.CHARMS.reduce((slots, c) => {
    const last = slots[slots.length - 1];
    if (last && last[0].num === c.num) last.push(c); else slots.push([c]);
    return slots;
  }, []);

  function quickTile(c, half, ctx) {
    const imp = ctx.info(c.id);
    const a = imp.action;
    const cls = ['qc'];
    if (half) cls.push('qc-half');
    if (imp.equipped) cls.push('is-on');
    // What was just equipped or found lights up once.
    if (justWorn(c.id) || justFound(c.id)) cls.push('is-new');
    if (a.action === 'blocked') cls.push('is-locked');
    if (!imp.equipped && a.overcharm && isOwned(c.id)) cls.push('is-over');
    if (ctx.sel === c.id) cls.push('is-sel');
    // One you don't have in your game is shadowed: it can be looked at, but not equipped.
    const missing = !imp.equipped && !isOwned(c.id);
    if (!isOwned(c.id)) cls.push('is-missing');
    const title = missing ? pick(c) + ' · ' + t('inspMissing')
      : a.action === 'blocked' ? pick(a.reason)
      : isFixed(c.id) ? pick(c) + ' · ' + t('inspFixed')
      : imp.equipped ? t('unequipTitle', { charm: pick(c) })
      : a.action === 'swap' ? t('swapTitle', { old: pick(D.CHARM_BY_ID[a.partner]), new: pick(c) })
      : t('equipTitle', { charm: pick(c) });
    return `<button type="button" class="${cls.join(' ')}" data-act="${ctx.act}" data-id="${c.id}" aria-pressed="${imp.equipped}" title="${esc(ctx.locked || title)}" ${ctx.locked || missing || a.action === 'blocked' ? 'aria-disabled="true"' : ''}>
      <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}" loading="lazy">
    </button>`;
  }

  /* The five two-version slots: if you have one, only that one shows, whole, as in the game;
     if you have neither, the two shadowed halves. */
  function quickSlot(slot, ctx) {
    if (slot.length === 1) return quickTile(slot[0], false, ctx);
    const tk = C.ownState(App.owned, slot[0].group);
    if (tk) return quickTile(D.CHARM_BY_ID[tk], false, ctx);
    return `<span class="qslot-pair">${slot.map((c) => quickTile(c, true, ctx)).join('')}</span>`;
  }

  function renderQuickCharms(ctx = pageCharms()) {
    let rows = '';
    for (let i = 0; i < QUICK_SLOTS.length; i += QUICK_PER_ROW) {
      rows += `<div class="qrow">${QUICK_SLOTS.slice(i, i + QUICK_PER_ROW).map((s) => quickSlot(s, ctx)).join('')}</div>`;
    }
    return `<div class="quick ${ctx.locked ? 'is-locked' : ''}">
      <div class="block-head">${esc(t('charmsTitle'))}<span class="quick-hint">${esc(ctx.hint)}</span></div>
      <div class="quick-grid">${rows}</div>
    </div>`;
  }

  /* ── The charm's detail, next to the grid ──────────────────────────────
     The game's charm screen describes the chosen charm next to the grid. Here: the name with
     its cost in notch points (in magenta if it would overcharm you), its line, a status line
     and what changes in your build, before → after. It shows the charm under the mouse and,
     if there's none, the last one touched, pressed or focused. It's read-only: equipping and
     removing happen in the grid and in Equipped (a button here repeated the same thing). With
     a finger, a tap equips, as always, and the detail tells what changed.
     It always has the same size (css: .charm-detail), so the band doesn't grow or shrink when
     going from one charm to another: the line takes two lines at most (whole in its title),
     the status one, each change one (the synergies at the end, trimmed) and the list is
     DETAIL_ROWS; if there are more —only Joni's Blessing and Shaman Stone—, the last one says
     how many remain and opens the full sheet at them. */
  const DETAIL_ROWS = 6;
  const detailId = () => App.detailHover || App.detailSel;

  /* With no charm in the detail, what the equipped ones add up to: your sheet against the same
     build with only the fixed charms (Void Heart), in the same rows as a charm's changes, and the
     hint at the foot. Without charms of your own, the hint alone. Memoised by the build, since
     the detail repaints at every slot the mouse crosses. */
  let sumMemo = { key: '', changes: [] };
  function wornSum() {
    const key = prefs.lang + JSON.stringify(App.state);
    if (sumMemo.key !== key) {
      const bare = compute({ ...App.state, charms: App.state.charms.filter(isFixed) });
      sumMemo = { key, changes: E.diff(bare, App.sheet) };
    }
    return sumMemo.changes;
  }
  function sumDetail() {
    const hint = `<p class="detail-hint">${esc(hoverable.matches ? t('detailHintHover') : t('detailHintTouch'))}</p>`;
    if (!App.state.charms.some((id) => !isFixed(id))) return hint;
    const changes = wornSum();
    if (!changes.length) return hint;
    const many = changes.length > DETAIL_ROWS;
    const shown = many ? changes.slice(0, DETAIL_ROWS - 1) : changes;
    const row = (ch) => {
      const from = ch.kind === 'gain' ? '' : ch.before.applies ? fmtStat(ch.before) : '—';
      const to = ch.kind === 'loss' ? '—' : fmtStat(ch.after);
      return `<li title="${esc(ch.label)}"><span class="lbl">${esc(ch.label)}</span><span class="vals">${from ? `<span class="from">${esc(from)}</span><span class="arrow">→</span>` : ''}<span class="to ${goodClass(ch.good)}">${esc(to)}</span></span></li>`;
    };
    const more = many && !prefs.detailOpen
      ? `<li class="insp-more"><button type="button" data-act="detail">${esc(t('detailMore', { n: changes.length - shown.length }))}</button></li>` : '';
    return `<div class="detail-sum">
        <h3>${esc(t('detailSumTitle'))}</h3>
        <ul class="insp-list">${shown.map(row).join('')}${more}</ul>
      </div>${hint}`;
  }

  function charmDetail() {
    const id = detailId();
    const c = D.CHARM_BY_ID[id];
    if (!c) return sumDetail();
    const imp = impact(id), a = imp.action;
    // A single status line, the weightiest one. "Equipped" is already said by the list's title.
    // A charm not found has its own (ownRow, below).
    const states = [];
    if (!imp.equipped && !isOwned(id)) { /* ownRow */ }
    else if (isFixed(id)) states.push(['', t('inspFixed')]);
    else if (a.action === 'blocked' && !imp.equipped) states.push(['bad', t('inspBlocked', { reason: pick(a.reason) })]);
    else if (a.action === 'swap') states.push(['', t('inspSwap', { charm: pick(D.CHARM_BY_ID[a.partner]) }) + (a.overcharm ? t('inspSwapOver') : '')]);
    else if (a.overcharm && !imp.equipped) states.push(['over', t('inspOver')]);
    if (imp.unmet) states.push(['bad', t('inspNeeds', { what: t(NEED_KEY[c.needs]) })]);
    if (imp.cond) states.push(['cond', t('inspCond', { cond: imp.cond })]);
    const state = states.length ? `<p class="insp-state ${states[0][0]}" title="${esc(states.map((x) => x[1]).join(' · '))}">${esc(states.map((x) => x[1]).join(' · '))}</p>` : '';
    /* A charm you don't have is marked found right here, where you've just read what it does,
       without going to Your game. Under the mouse it only says how ("click to unlock it"); chosen
       (clicked or tapped, which pins it: see hoverHold below) it carries a real button. The grid only
       shows one version of each two-version slot (the one you have, or the first), so it's never
       switching one for the other: that stays on Your game. Equipping is still tapping the grid. */
    const missing = !imp.equipped && !isOwned(id);
    const pinned = missing && App.detailHover !== id;
    const ownRow = !missing ? ''
      : pinned ? `<p class="insp-state bad">${esc(t('notFound'))}</p>
          <div class="insp-own"><button type="button" class="btn btn-primary" data-act="ownHere" data-id="${id}" title="${esc(t('ownHereHint'))}">${esc(t('ownHere'))}</button></div>`
      : `<p class="insp-state bad">${esc(t('inspMissing'))}</p>`;
    const row = (ch) => {
      const after = imp.withSheet.stats[ch.id];
      const others = after.contribs.filter((k) => k.active && ((k.source.startsWith('charm:') && k.source !== 'charm:' + id) || k.source.startsWith('synergy:'))).map((k) => k.label);
      const from = ch.kind === 'gain' ? '' : ch.before.applies ? fmtStat(ch.before) : '—';
      const to = ch.kind === 'loss' ? '—' : fmtStat(ch.after);
      const notes = [];
      if (ch.transfer === 'out') notes.push(t('becomesShort', { what: shortOf(ch.into) }));
      if (others.length) notes.push(t('withCharms', { charms: [...new Set(others)].join(', ') }));
      const with_ = notes.length ? ' · ' + notes.join(' · ') : '';
      return `<li title="${esc(ch.label + with_)}"><span class="lbl">${esc(ch.label)}${with_ ? `<i class="with">${esc(with_)}</i>` : ''}</span><span class="vals">${from ? `<span class="from">${esc(from)}</span><span class="arrow">→</span>` : ''}<span class="to ${goodClass(ch.good)}">${esc(to)}</span></span></li>`;
    };
    // The button takes two rows' room, so the fixed-height detail doesn't grow.
    const rows = pinned ? DETAIL_ROWS - 2 : DETAIL_ROWS;
    const many = imp.changes.length > rows;
    const shown = many ? imp.changes.slice(0, rows - 1) : imp.changes;
    const more = many ? `<li class="insp-more"><button type="button" data-act="detailMore" data-id="${id}">${esc(t('detailMore', { n: imp.changes.length - shown.length }))}</button></li>` : '';
    const lock = App.charmLock();
    const over = imp.equipped ? App.sheet.notches.overcharmed : a.overcharm;
    const cost = c.notches
      ? `<span class="detail-cost" role="img" aria-label="${esc(notchText(c.notches))}" title="${esc(notchText(c.notches))}">${`<i class="notch ${over ? 'is-over' : 'is-used'}"></i>`.repeat(c.notches)}</span>`
      : `<span>${esc(t('notchFree'))}</span>`;
    return `<div class="insp-head">
        <span class="medal"><img src="assets/charms/${c.id}.png" alt=""></span>
        <div class="insp-id">
          <div class="insp-name"${NT}>${esc(pick(c))}</div>
          <div class="insp-notch"><span class="insp-en">${esc(I.current === 'en' ? c.es : c.en)}</span>${cost}${c.fragile ? `<span>${esc(t('breaksOnDeath'))}</span>` : ''}</div>
        </div>
      </div>
      <p class="insp-blurb" title="${esc(pick(c.blurb))}">${esc(pick(c.blurb))}</p>
      ${lock ? `<p class="insp-state cond" title="${esc(lock)}">${esc(lock)}</p>` : ownRow || state}
      <h3>${esc(imp.equipped ? t('inspEffectIn') : t('inspEffectIf'))}${imp.cond ? ' (' + esc(imp.cond.toLowerCase()) + ')' : ''}</h3>
      ${imp.changes.length ? `<ul class="insp-list">${shown.map(row).join('')}${more}</ul>` : `<p class="insp-empty">${esc(t('inspEmpty'))}</p>`}`;
  }

  /* Repaints only the detail and the preview, not the sheet: repainting it rebuilds the grid under
     the pointer. With the mouse over it, the full sheet's rows it would change light up. */
  let detailShown = '';             // the charm the detail painted last, to fade only when it changes
  function paintDetail(live = true) {
    const box = el.panel.querySelector('#charm-detail');
    if (!box) return;
    // The screen reader is only told what's tapped or focused: moving the mouse across the
    // grid repaints it at every slot and it would read it all out each time.
    box.setAttribute('aria-live', live ? 'polite' : 'off');
    box.innerHTML = charmDetail();
    const id = detailId();
    // Another charm: the detail fades into it, so the change of charm reads as such.
    if (id !== detailShown) { box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap'); }
    detailShown = id;
    for (const n of el.panel.querySelectorAll('.quick-grid .qc')) n.classList.toggle('is-sel', n.dataset.id === id);
    if (App.detailHover) highlightRows(App.detailHover); else clearHits();
    paintPreview();
  }

  /* The preview, on the status block's own figures: with the mouse over a charm, each figure a
     click would change carries "→ what it would become" alongside (if you already wear it, what it
     would become on removing it). No green: a hypothesis isn't a gain; what gets worse, in red. It
     goes out on clicking (then the figure flashes with its chip) until the pointer moves to another
     charm. If the charm can't be touched or its effect depends on health (Fury, Elegy), a click
     wouldn't change those figures right now: there's no preview. */
  App.previewId = '';
  function paintPreview() {
    let next = null;
    if (App.previewId && !App.charmLock() && C.charmAction(App.state, App.previewId).action !== 'blocked') {
      const imp = impact(App.previewId);
      if (!imp.cond) {
        next = new Map(imp.changes.map((ch) => {
          const v = imp.equipped ? ch.before : ch.after;
          const worse = imp.equipped ? ch.good === true : ch.good === false;
          return [ch.id, { text: '→ ' + (v && v.applies ? fmtStat(v) : '—'), worse }];
        }));
      }
    }
    for (const slot of el.panel.querySelectorAll('.pv[data-pv]')) {
      const p = next && next.get(slot.dataset.pv);
      slot.textContent = p ? p.text : '';
      slot.classList.toggle('bad', !!(p && p.worse));
    }
    paintNotchPreview();
  }

  /* And on the notches: with the mouse over a charm, the row shows the ones it would take before
     equipping it. Two states beyond the game's, in the same 23 px slot, so that no dot moves:
     - The one it would take (is-pending) is a lit ring with a half-tone centre: halfway between
       the free one's dark ring and the spent one's full dot, and it breathes slowly, because it's
       a hypothesis and not something you already have. If it would overcharm you it goes in
       magenta and the row grows past your maximum, as in the game.
     - The one it would leave (is-leaving) is the dot you already have, going out: no halo and
       almost dark. It's what shows over a charm you wear, and what a partner lets go when swapped.
     A swap between partners (Fragile ↔ Unbreakable Heart, Grimmchild ↔ Carefree Melody,
     Kingsoul ↔ Void Heart) asks for no new notches: the partner's pass to the new one. They go in
     their place as pending; if the new one costs less, the spare ones go out behind, and if it
     costs more, the missing ones stay pending. That way the row only grows if you really would
     be overcharmed.
     Everything comes from the state it would leave (C.toggleCharm): what stays already carries
     its colour from after —if removing a charm takes you out of overcharm, the magenta turns
     back to white— and what goes, today's. No preview if the charm is blocked (the detail says
     why) or moves no notch (Void Heart without Kingsoul). */
  function notchPreview(id) {
    if (!id || App.charmLock()) return null;
    if (!App.state.charms.includes(id) && !isOwned(id)) return null;  // it can't be equipped
    const a = C.charmAction(App.state, id);
    const next = C.toggleCharm(App.state, id);
    if (!next) return null;
    const cost = D.CHARM_BY_ID[id].notches;
    const take = a.action === 'unequip' ? 0 : cost;
    const give = a.action === 'unequip' ? cost : a.partner ? D.CHARM_BY_ID[a.partner].notches : 0;
    if (!take && !give) return null;
    const now = App.sheet.notches;
    const used = C.notchesUsed(next.charms);
    const after = { used, max: now.max, free: Math.max(0, now.max - used), overcharmed: used > now.max };
    const was = overcharmSplit({ st: App.state, notches: now });
    const will = overcharmSplit({ st: next, notches: after });
    const kept = used - take;                // today's minus the ones it lets go: kept + give = now.used
    const slots = Math.max(now.max, now.used, used);
    let dots = '';
    for (let i = 0; i < slots; i++) {
      const cls = i < kept ? (i < will.white ? 'is-used' : 'is-over')
        : i < kept + take ? (i < will.white ? 'is-used' : 'is-over') + ' is-pending'
        : i < now.used ? (i < was.white ? 'is-used' : 'is-over') + ' is-leaving'
        : 'is-free';
      dots += `<i class="notch ${cls}"></i>`;
    }
    // The label, "2 free → 0": after the arrow the figure is enough, unless there were none before (overcharmed).
    const same = now.overcharmed ? after.overcharmed : !after.overcharmed && after.free === now.free;
    const to = after.overcharmed ? t('overcharmedTo') : now.overcharmed ? notchFreeText(after) : String(after.free);
    const label = esc(notchFreeText(now)) + (same ? '' : `<span class="nf-to${after.overcharmed ? ' is-over' : ''}"> → ${esc(to)}</span>`);
    return { dots, label };
  }

  /* Repaints only the row and its label, never the sheet: the grid stays under the pointer. On
     entering, the row's height is noted (--row-h): in one column, where it sits above the grid,
     the preview doesn't exceed that height (css: .notches.is-preview), because if it pushed
     the grid, the mouse would land on another slot. */
  function paintNotchPreview() {
    const box = el.panel.querySelector('.inv-band .is-notches');
    const row = box && box.querySelector('.notches');
    if (!row || !row.offsetParent) return;   // with Charms hidden there's nothing to measure: it's repainted on return
    const p = notchPreview(App.previewId);
    const on = row.classList.contains('is-preview');
    if (!p && !on) return;
    const lbl = box.querySelector('.notch-free');
    if (p) {
      if (!on) row.style.setProperty('--row-h', row.offsetHeight + 'px');
      row.innerHTML = p.dots;
      lbl.innerHTML = p.label;
    } else {
      const ctx = pageCharms();
      row.innerHTML = notchDots(ctx);
      lbl.textContent = notchFreeText(ctx.notches);
      row.style.removeProperty('--row-h');
    }
    row.classList.toggle('is-preview', !!p);
  }

  /* The sheet's band, in two columns that don't touch: Equipped and the grid on the left,
     Notches and the detail on the right. If the notches grow (when overcharming, more dots and
     the notice come out), their column grows, but the grid stays attached to Equipped. */
  function charmBand() {
    const ctx = { ...pageCharms(), sel: detailId(), clear: true, over: true };
    detailShown = detailId();
    const b = loadoutBlocks(ctx);
    return `<div class="inv-band">
      <div class="band-col">${b.equipped}${renderQuickCharms(ctx)}</div>
      <div class="band-col">${b.notches}<div class="charm-detail" id="charm-detail" aria-live="polite">${charmDetail()}</div></div>
    </div>`;
  }

  function highlightRows(id) {
    clearHits();
    const imp = impact(id);
    for (const ch of imp.changes) {
      const row = el.panel.querySelector(`.stat[data-id="${ch.id}"]`);
      if (row) row.classList.add('is-hit');
    }
  }
  function clearHits() {
    for (const node of el.panel.querySelectorAll('.stat.is-hit')) node.classList.remove('is-hit');
  }

  /* Spells and arts, as plates: the game's artwork on black, frameless, with its light behind
     it. What you haven't learnt comes out as a silhouette and unlit, like a dimmed statue in the
     Hall, instead of a box with a dash. */
  function renderSpellPlates() {
    return SPELL_KEYS.map((k) => {
      const sp = D.SPELLS[k];
      const lvl = App.state.spells[k];
      const stat = App.sheet.stats['spell.' + k];
      const icon = spellArt(k, lvl, (id) => App.state.charms.includes(id));
      const name = lvl ? pick(sp.levels[lvl]) : pick(sp.slot);
      const note = lvl ? t('soulCost', { n: fmtStat(App.sheet.stats['soul.spellCost']) }) : t('notLearned');
      return `<button type="button" class="plate${lvl ? ' is-on' : ''}${flashCls('spell.' + k)}" data-act="kpi" data-id="spell.${k}" title="${esc(t('goTo', { label: name }))}">
        <span class="plate-art"><img src="${icon}" alt=""></span>
        <span class="plate-name"${NT}>${esc(name)}</span>
        ${lvl ? `<span class="plate-val">${fmtStatRich(stat)}</span>` : ''}
        <span class="plate-note">${esc(note)}</span>
      </button>`;
    }).join('');
  }

  function renderArtPlates() {
    return ART_KEYS.map((k) => {
      const on = !!App.state.arts[k];
      const stat = App.sheet.stats[ART_STAT[k]];
      const name = pick(D.ARTS[k]);
      // With the art learnt, the note is the formula ("2.5 × base nail"), not the name again.
      const formula = (stat.contribs.find((c) => c.op === 'set' && c.text) || {}).text || '';
      const note = !on ? t('notLearned') : stat.applies ? formula : (stat.reason || '');
      return `<button type="button" class="plate${on ? ' is-on' : ''}${flashCls(ART_STAT[k])}" data-act="kpi" data-id="${ART_STAT[k]}" title="${esc(t('goTo', { label: name }))}">
        <span class="plate-art"><img src="${D.art('arts', k)}" alt=""></span>
        <span class="plate-name"${NT}>${esc(name)}</span>
        ${on ? `<span class="plate-val">${fmtStatRich(stat)}</span>` : ''}
        <span class="plate-note">${esc(note)}</span>
      </button>`;
    }).join('');
  }

  /* ── Effects: what charms do that doesn't show in the figures ──────────
     Below the spell and art plates, one plate per effect in D.CHARM_EFFECTS, like the spell
     ones: the effect's artwork with its light (or the charm's), the figure and when it
     triggers. The charm's medal sits in the corner; if the figure comes from a synergy, both. */
  const pctOver = (m) => '+' + App.NF[0].format((m - 1) * 100) + pctSpace();

  function effectValue(s, show) {
    if (show === 'plus') return '+' + fmtStatRich(s);
    if (show === 'pctOver') return esc(pctOver(s.value));
    return fmtStatRich(s);
  }

  function effectsList() {
    const has = (id) => App.state.charms.includes(id);
    // The synergy that moves a figure, if there is one: its two charms show in the corner.
    const synergy = (s, charm) => s && s.contribs.find((c) => c.active && c.source.startsWith('synergy:') && c.charms && c.charms.includes(charm));
    const list = [];
    for (const fx of D.CHARM_EFFECTS) {
      const charm = [].concat(fx.charm).find(has);
      if (!charm) continue;
      const s = fx.stat ? (fx.hp ? compute({ ...App.state, hp: fx.hp }) : App.sheet).stats[fx.stat] : null;
      const ex = fx.extra && App.sheet.stats[fx.extra.stat];
      const extra = ex && ex.applies && ex.value ? { ...fx.extra, v: effectValue(ex, fx.extra.show) } : null;
      const syn = synergy(s, charm) || (extra && synergy(ex, charm));
      const withArt = Object.keys(fx.artWith || {}).find(has);
      const art = withArt ? fx.artWith[withArt] : fx.art;
      list.push({
        fx, when: fx.when, charms: syn ? [charm, ...syn.charms.filter((x) => x !== charm)] : [charm],
        art: art ? D.art(art[0], art[1]) : null, stat: s ? fx.stat : null,
        na: !!s && !s.applies, reason: s && !s.applies ? s.reason || '' : '',
        v: s && s.applies ? effectValue(s, fx.show) : '', extra,
      });
    }
    // If you fall: the fragile ones, all on one plate.
    const fragile = App.state.charms.filter((id) => D.CHARM_BY_ID[id] && D.CHARM_BY_ID[id].fragile);
    if (fragile.length) {
      const names = new Intl.ListFormat(prefs.lang, { type: 'conjunction' }).format(fragile.map((id) => pick(D.CHARM_BY_ID[id])));
      const one = fragile.length === 1;
      list.push({
        fx: { bad: true, title: t(one ? 'fragileTitleOne' : 'fragileTitle'), line: t(one ? 'fragileLineOne' : 'fragileLine', { charms: names }), note: names },
        when: 'fall', charms: fragile, art: D.art('knight', 'shade'), stat: null, na: false, reason: '', v: '', extra: null,
      });
    }
    const order = D.EFFECT_WHEN.map((w) => w.id);
    return list.sort((a, b) => order.indexOf(a.when) - order.indexOf(b.when));
  }

  function renderEffects() {
    if (!App.state.charms.length) return '';
    const list = effectsList();
    const withV = (text, v) => esc(pick(text)).replace('{v}', v);
    const plates = list.map((e) => {
      const { fx } = e;
      const src = `<span class="plate-src">${e.charms.map((id) => `<img src="assets/charms/${id}.png" alt="">`).join('')}</span>`;
      // The full sentence, for the title: already escaped, with no tags and the figure as text.
      const line = (e.na ? esc(`${pick(fx.title)}: ${e.reason}`) : withV(fx.line, e.v) + (e.extra ? withV(e.extra.line, e.extra.v) : '')).replace(/<[^>]+>/g, '');
      const note = e.na ? esc(e.reason) : e.extra ? withV(e.extra.note, `<b>${e.extra.v}</b>`) : esc(pick(fx.note));
      const when = D.EFFECT_WHEN.find((w) => w.id === e.when);
      const body = `<span class="plate-art"><img src="${e.art || `assets/charms/${e.charms[0]}.png`}" alt="">${e.art || e.charms.length > 1 ? src : ''}</span>
        <span class="plate-name">${esc(pick(fx.title))}</span>
        ${e.v ? `<span class="plate-val">${e.v}</span>` : ''}
        <span class="plate-note${e.na ? ' is-na' : ''}">${note}</span>
        <span class="plate-when">${esc(pick(when))}</span>`;
      const cls = `plate is-on${fx.bad ? ' is-bad' : ''}`;
      // With a figure, like the spell plates: it leads to its row in the full sheet and flashes on change.
      return e.stat && !fx.hp
        ? `<button type="button" class="${cls}${flashCls(e.stat)}" data-act="kpi" data-id="${e.stat}" title="${line}">${body}</button>`
        : `<div class="${cls}" title="${line}">${body}</div>`;
    }).join('');
    return `<div class="inv-effects">
      <div class="block-head">${esc(t('effectsTitle'))}<span class="quick-hint">${esc(t('effectsHint'))}</span></div>
      ${plates ? `<div class="eff-plates">${plates}</div>` : `<p class="muted-p">${esc(t('effectsNone'))}</p>`}
    </div>`;
  }

  function renderCharmEffects() {
    const equipped = App.state.charms.map((id) => D.CHARM_BY_ID[id]).filter(Boolean);
    const body = equipped.length
      ? `<div class="fx">${equipped.map((c) => `<div class="fx-item" data-charm="${c.id}">
          <span class="medal sm"><img src="assets/charms/${c.id}.png" alt=""></span>
          <span><span class="fx-name"${NT}>${esc(pick(c))}</span><span class="fx-note">${esc(pick(c.blurb))}</span></span>
        </div>`).join('')}</div>`
      : `<p class="muted-p">${esc(t('noCharmsYet'))}</p>`;
    return `<div class="block-head">${esc(t('charmEffects'))}</div>${body}`;
  }

  /* The Charms screen is the game's Inventory: black, the corner brackets, the title with its
     diamond, the status block (the HUD, health and soul, nail damage and the six figures) and,
     below, the charms on a black band —Equipped and Notches, and the grid with the detail
     alongside, as on the game's charm screen—; then spells and arts as plates. Nothing sits
     behind a figure. */
  function renderPanel() {
    el.panel.innerHTML = `${brackets}
      ${screenHead(esc(t('navCharms')))}
      ${renderStatus()}
      ${charmBand()}

      <div class="inv-plates">
        <div class="plate-group"><div class="block-head">${esc(t('spells'))}</div><div class="plates">${renderSpellPlates()}</div></div>
        <div class="plate-group"><div class="block-head">${esc(t('arts'))}</div><div class="plates">${renderArtPlates()}</div></div>
      </div>

      ${renderEffects()}
      ${sheetToggle('top')}
      ${prefs.detailOpen ? `<div class="detail" id="sheet-detail">${renderSheetHead()}${renderGroups()}<div class="fx-wrap">${renderCharmEffects()}</div></div>
      ${sheetToggle('bottom')}` : ''}`;
  }

  /* The full sheet's button stays where you pressed it and the sheet opens below; when open, it
     carries an identical one at the end to close it without going back up. data-value tells
     them apart for focus. */
  const sheetToggle = (where) => `<button type="button" class="toggle-all" data-act="detail" data-value="${where}" aria-expanded="${prefs.detailOpen}" aria-controls="sheet-detail">
      <span>${esc(prefs.detailOpen ? t('hideAll') : t('seeAll'))}</span>${chevron(prefs.detailOpen)}
    </button>`;

  /* ── Full sheet ──────────────────────────────────────────────────────── */
  function renderSheetHead() {
    const cmpOpts = [
      ['base', t('cmpBase'), t('cmpBaseHint')],
      ['nocharms', t('cmpNoCharms'), t('cmpNoCharmsHint')],
      ['pinned', t('cmpPinned'), App.baseline ? t('cmpPinnedHint') : t('cmpPinFirst')],
    ];
    return `<div class="sheet-head">
      <div class="sheet-title"><h2>${esc(t('sheetTitle'))}</h2><span class="hint">${esc(t('rowHint'))}</span></div>
      <div class="compare">
        <span class="lbl">${esc(t('compareWith'))}</span>
        <span class="seg">${cmpOpts.map(([v, label, tip]) => `<button type="button" data-act="compare" data-value="${v}" aria-pressed="${prefs.compare === v}" title="${esc(tip)}" ${v === 'pinned' && !App.baseline ? 'disabled' : ''}>${esc(label)}</button>`).join('')}</span>
        <button type="button" class="btn" data-act="pin" title="${esc(t('pinHint'))}">${esc(t('pin'))}</button>
        ${App.baseline ? `<button type="button" class="btn" data-act="unpin">${esc(t('unpin'))}</button>` : ''}
      </div>
    </div>`;
  }

  function chipFor(c, stat) {
    const isCharm = c.source.startsWith('charm:');
    const isSyn = c.source.startsWith('synergy:');
    const charmAttr = isCharm ? ` data-charm="${c.source.slice(6)}"` : isSyn && c.charms ? ` data-charm="${c.charms.join(' ')}"` : '';
    let val = c.text;
    if (!val) {
      if (c.op === 'add') val = sign(c.value) + fmtValue(Math.abs(c.value), stat.fmt === 'mult' ? 'dec2' : stat.fmt, false);
      else if (c.op === 'mul') val = '×' + App.NF[2].format(c.value);
      else if (c.op === 'set' || c.op === 'replace') val = fmtValue(c.value, stat.fmt, false);
      else if (c.op === 'on') val = t('yes').toLowerCase();
      else if (c.op === 'off') val = t('no').toLowerCase();
      else val = '';
    }
    if (!c.active) val = c.cond || val;
    const cls = ['chip', isCharm ? 'chip-charm' : '', isSyn ? 'syn' : '', c.active ? '' : 'off'].filter(Boolean).join(' ');
    return `<span class="${cls}"${charmAttr}>${namedSrc(c.source) ? `<span${NT}>${esc(c.label)}</span>` : esc(c.label)}${val ? ' <b>' + esc(val) + '</b>' : ''}${c.active && c.cond ? ' <i>· ' + esc(c.cond) + '</i>' : ''}</span>`;
  }
  const contribText = (c, s) => c.text || (c.op === 'add' ? sign(c.value) + fmtValue(Math.abs(c.value), s.fmt === 'mult' ? 'dec2' : s.fmt, false) : c.op === 'mul' ? '×' + App.NF[2].format(c.value) : (c.op === 'set' || c.op === 'replace') ? fmtValue(c.value, s.fmt, false) : c.op === 'on' ? t('yes') : c.op === 'off' ? t('no') : '');

  function renderStat(s) {
    const cmp = App.cmpSheet.stats[s.id];
    const open = prefs.open.includes(s.id);
    const flash = App.flashIds && App.flashIds.has(s.id);
    const delta = deltaChip(s, cmp, compareLabel());
    // The row only shows charms and synergies; upgrades go in the detail.
    const shown = s.contribs.filter((c) => c.source.startsWith('charm:') || c.source.startsWith('synergy:'));
    const chips = shown.slice(0, 3).map((c) => chipFor(c, s)).join('') + (shown.length > 3 ? `<span class="chip more">${esc(t('andMore', { n: shown.length - 3 }))}</span>` : '');
    const detail = `<div class="stat-detail">
      ${s.contribs.length ? `<h4>${esc(t('howCalc'))}</h4><ul>` + s.contribs.map((c) => `<li class="${c.active ? '' : 'off'}"><span class="k">${namedSrc(c.source) ? `<span${NT}>${esc(c.label)}</span>` : esc(c.label)}${c.cond ? ' · ' + esc(c.cond) : ''}</span><span class="v">${esc(contribText(c, s))}</span></li>`).join('') + '</ul>' : ''}
      ${s.parts ? `<h4>${esc(t('breakdown'))}</h4><ul>` + s.parts.map((p) => `<li><span class="k">${esc(p.label)}</span><span class="v">${(p.approx ? '~' : '') + (p.fmt === 'pct' ? App.NF[1].format(p.v) + pctSpace() : App.NF[2].format(p.v))}${p.unit ? ' ' + esc(p.unit) : ''}</span></li>`).join('') + '</ul>' : ''}
      ${cmp && cmp.applies ? `<div class="note">${esc(compareLabel())}: ${esc(fmtStat(cmp))}</div>` : ''}
      ${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}
    </div>`;
    return `<div class="stat ${s.applies ? '' : 'is-na'} ${open ? 'is-open' : ''} ${flash ? 'is-flash' : ''}" data-act="row" data-id="${s.id}" role="button" tabindex="0" aria-expanded="${open}">
      <div class="stat-row">
        <span class="stat-label">${esc(s.label)}</span>
        <span class="stat-value">${delta}<span>${fmtStatRich(s)}</span></span>
        ${s.applies ? '' : `<span class="stat-reason">${esc(s.reason || '')}</span>`}
        ${chips ? `<span class="chips">${chips}</span>` : ''}
      </div>
      ${detail}
    </div>`;
  }

  function renderGroups() {
    return `<div class="groups">${App.sheet.groups.map((g) => {
      const rows = g.stats.filter((s) => !s.hidden);
      if (!rows.length) return '';
      return `<section class="group"><h3>${esc(g.label)}</h3>${rows.map(renderStat).join('')}</section>`;
    }).join('')}</div>`;
  }

  /* ── Actions ─────────────────────────────────────────────────────────── */
  // Returns whether it was applied: if not, the reason shows in a notice.
  function doCharm(id) {
    const lock = App.charmLock();
    if (lock) { toast(lock); return false; }
    const a = C.charmAction(App.state, id);
    // One you haven't found can be looked at but not equipped: the detail says why. Removing it, yes.
    if (a.action !== 'unequip' && !isOwned(id)) return false;
    if (a.action === 'unequip' && isFixed(id)) return false;      // Void Heart: the detail says so
    if (a.action === 'blocked') { toast(pick(a.reason)); return false; }
    const done = commit(C.toggleCharm(App.state, id));
    if (done && a.overcharm && a.action !== 'unequip') toast(t('toastOvercharm'));
    return done;
  }

  Object.assign(actions, {
    /* The grid and the equipped ones equip or remove directly, with mouse and finger: that's what
       they're for. On the sheet, what's touched goes to the detail, which tells what changed or,
       if it couldn't, why. */
    quick(node) {
      const id = node.dataset.id;
      if (node.closest('#panel')) {
        App.detailSel = id;
        // Pinned: the detail stays on it while the pointer crosses the grid (hoverHold).
        if (hoverable.matches) { hoverHold = true; clearTimeout(holdTimer); App.detailHover = ''; }
      }
      App.previewId = '';                  // once clicked, the figure flashes: the preview isn't needed
      if (!doCharm(id)) paintDetail();
    },
    // "and N more in the full sheet": opens it at the rows that don't fit in the detail.
    detailMore(node) {
      const imp = impact(node.dataset.id);
      if (!prefs.detailOpen) { prefs.detailOpen = true; savePrefs(); render(); }
      highlightRows(node.dataset.id);
      const first = imp.changes[DETAIL_ROWS - 1];
      const row = first && el.panel.querySelector(`.stat[data-id="${first.id}"]`);
      if (row) row.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'center' });
    },
    // "I have it" in the detail: marked found (in a two-version slot, as that slot's version) and still read there.
    ownHere(node) {
      const id = node.dataset.id;
      const slot = C.OWN_SLOT_OF[id];
      App.detailSel = id;
      setOwned(slot ? C.ownSet(App.owned, slot, id) : [...App.owned, id]);
    },
    /* The equipped ones leave one after another, from the last, as dust; then the notches empty.
       The fixed one (Void Heart) stays. Without motion, at once. */
    clear() {
      if (!App.state.charms.length || clearing) return;
      const lock = App.charmLock();
      if (lock) { toast(lock); return; }
      // From the state when it's applied, not when pressed: whatever changed meanwhile stays.
      const empty = () => commit(C.normalize({ ...App.state, charms: [] }));
      const tiles = [...el.panel.querySelectorAll('.inv-band .eq-row .eq')].filter((n) => !isFixed(n.dataset.id));
      if (calm.matches || !tiles.length) { empty(); return; }
      tiles.reverse().forEach((n, i) => n.style.setProperty('--i', i));
      el.panel.querySelector('.inv-band .eq-row').classList.add('is-clearing');
      clearing = true;
      setTimeout(() => { clearing = false; empty(); }, CLEAR_STEP_MS * (tiles.length - 1) + CLEAR_MS);
    },
    detail(node) {
      prefs.detailOpen = !prefs.detailOpen;
      savePrefs();
      render();
      // Closed from below, the sheet shrinks above you: back to its button, the one that remains.
      if (!prefs.detailOpen && node.dataset.value === 'bottom') {
        const b = el.panel.querySelector('[data-act="detail"]');
        if (!b) return;
        b.focus({ preventScroll: true });
        const r = b.getBoundingClientRect();
        if (underNav(b) || r.bottom > innerHeight) b.scrollIntoView({ block: 'center' });
      }
    },
    kpi(node) {
      const id = node.dataset.id;
      if (!prefs.detailOpen) { prefs.detailOpen = true; savePrefs(); render(); }
      const row = el.panel.querySelector(`.stat[data-id="${id}"]`);
      if (!row) return;
      if (!prefs.open.includes(id)) { prefs.open.push(id); savePrefs(); row.classList.add('is-open'); row.setAttribute('aria-expanded', 'true'); }
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
    },
    // The sheet's soul: it's only for show, it changes no figure (renderStatus).
    soulOrb() {
      settleSoul();
      const { total, mainMax, cost, now } = soulLevels();
      if (now < cost) { soulSpent = 0; render(); return; }      // not enough for another: it fills
      soulSpent = total - (now - cost);
      // With soul in the vessels, the orb drops and they refill it right away, as in the game.
      if (now > mainMax && !calm.matches) {
        soulDrain = mainMax - cost;
        soulTimer = setTimeout(() => { soulTimer = 0; soulDrain = null; render(); }, SOUL_REFILL_MS);
      }
      render();
    },
    soulVessel(node) {
      settleSoul();
      const { total, mainMax, now } = soulLevels();
      const i = Number(node.dataset.value), size = D.SOUL.vesselSize;
      const full = now - mainMax - size * i >= size;
      // Full: it empties along with the ones to its right. Empty or half-full: it fills, and with it everything before.
      soulSpent = total - Math.min(total, mainMax + size * (full ? i : i + 1));
      render();
    },
    compare(node) { prefs.compare = node.dataset.value; savePrefs(); recompute(); render(); },
    pin() { App.baseline = C.normalize(App.state); save(KEY.baseline, C.encode(App.baseline)); prefs.compare = 'pinned'; savePrefs(); recompute(); render(); toast(t('toastPinned')); },
    unpin() { App.baseline = null; save(KEY.baseline, null); if (prefs.compare === 'pinned') prefs.compare = 'base'; savePrefs(); recompute(); render(); },
    row(node) {
      const id = node.dataset.id;
      const i = prefs.open.indexOf(id);
      if (i >= 0) prefs.open.splice(i, 1); else prefs.open.push(id);
      savePrefs();
      node.classList.toggle('is-open', i < 0);
      node.setAttribute('aria-expanded', i < 0);
    },
  });

  /* With a mouse, the detail follows the pointer across the grid and the equipped ones, and on
     leaving them goes back to the chosen one; between slots the last one stays, so it doesn't
     flicker. With the keyboard, the focused charm is the chosen one. And hovering a chip in the
     full sheet lights up on the grid the charm that moves it. */
  const charmTile = (n) => (n && n.closest ? n.closest('.quick-grid .qc, .eq-row .eq') : null);
  /* A click pins the charm (hoverHold): on the way from it to the detail —to press "Mark as found",
     say— the pointer crosses other charms, and passing over them must not take its place. While
     pinned, a charm only takes over if the pointer rests on it (HOLD_MS); leaving the grid ends the pin. */
  const HOLD_MS = 400;
  let hoverHold = false, holdTimer = 0;
  function hoverTo(id) {
    App.detailHover = App.previewId = id;
    paintDetail(false);
  }
  el.panel.addEventListener('mouseover', (ev) => {
    const chip = ev.target.closest('[data-charm]');
    if (chip) for (const id of chip.dataset.charm.split(' ')) {
      const tile = el.panel.querySelector(`.quick-grid .qc[data-id="${id}"]`);
      if (tile) tile.classList.add('is-hot');
    }
    if (!hoverable.matches) return;
    const tile = charmTile(ev.target);
    if (!tile || tile.dataset.id === App.detailHover) return;
    clearTimeout(holdTimer);
    if (hoverHold) {
      if (tile.dataset.id === App.detailSel) return;
      holdTimer = setTimeout(() => { hoverHold = false; hoverTo(tile.dataset.id); }, HOLD_MS);
      return;
    }
    hoverTo(tile.dataset.id);
  });
  el.panel.addEventListener('mouseout', (ev) => {
    if (ev.target.closest('[data-charm]')) for (const tile of el.panel.querySelectorAll('.qc.is-hot')) tile.classList.remove('is-hot');
    if (!charmTile(ev.target)) return;
    clearTimeout(holdTimer);
    const to = ev.relatedTarget;
    if (to && to.closest && to.closest('.quick-grid, .eq-row')) return;
    hoverHold = false;
    if (!App.detailHover) return;
    App.detailHover = App.previewId = '';
    paintDetail(false);
  });
  el.panel.addEventListener('focusin', (ev) => {
    const tile = charmTile(ev.target);
    if (App.refocusing || !tile || tile.dataset.id === App.detailSel) return;
    App.detailSel = tile.dataset.id;
    paintDetail();
  });

  Object.assign(App, { flashCls, pageCharms, renderLoadout, QUICK_PER_ROW, QUICK_SLOTS, renderQuickCharms,
    paintPreview, highlightRows, renderPanel });
})();
