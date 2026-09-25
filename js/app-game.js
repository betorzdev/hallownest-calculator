/* js/app-game.js — the Your game screen: nail, body, arts, spells, abilities and the charms
   you've found, with their actions. Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, C = HK.codec;
  const App = HK.app;
  const { t, pick, el, SPELL_KEYS, ART_KEYS, ART_STAT, NT, esc, fmtStatRich, spellArt, badgeText, compute,
    commit, brackets, screenHead, QUICK_PER_ROW, QUICK_SLOTS, render, actions, isMaxOwned, saveOwned,
    isOwned, setOwned, justFound } = App;

  /* Right after a change (App.was): what you just got lights up from the dark, and what you just
     lost goes out from its light. "was" reads the value before; with nothing to compare, the current one. */
  const was = (get) => (App.was ? get(App.was.state) : get(App.state));
  const fx = (on, before) => (on && !before ? ' is-lit' : !on && before ? ' is-out' : '');

  /* ── Your game ───────────────────────────────────────────────────────── */
  /* A line with the two main changes between two sheets, with the condition in front
     ("If you raise one:"): it's what you would have, not what you have. No green:
     green is what you've gained relative to your reference, not a hypothesis. A
     drawback is flagged, though. */
  function changeLine(from, to, leadKey) {
    const ch = E.diff(from, to).slice(0, 2);
    if (!ch.length) return '<span class="preview"></span>';
    const lead = leadKey ? `<i>${esc(t(leadKey))}:</i> ` : '';
    return '<span class="preview">' + lead
      + ch.map((c) => `<b class="${c.good === false ? 'bad' : ''}">${esc(badgeText(c))}</b>`).join(', ')
      + '</span>';
  }

  /* What would change if you took the next step (the Body steppers). */
  const previewOf = (next, leadKey) => (next ? changeLine(App.sheet, compute(next), leadKey) : '');

  /* A Body row: the game's own pieces, one per step, as the HUD and the charm screen draw
     them —the masks, the soul vessels, the notches—, lit up to what you have. Tapping a dark one
     lights up to it; tapping a lit one takes it off with every one after it, so a single tap
     reaches any value, down to none. The ones every Knight starts with can't be removed. Below,
     what would change with one more. */
  function pieceRow(key, value, min, max, label, range, piece, previewNext) {
    // The ones you add light up in order from the first new one; the ones you remove, from the last.
    const had = was((st) => st[key]);
    const btns = Array.from({ length: max }, (_, i) => {
      const n = i + 1, on = n <= value, base = n <= min;
      const next = on ? n - 1 : n;
      const lit = fx(on, n <= had);
      const order = lit ? ` style="--i:${on ? n - had - 1 : had - n}"` : '';
      return `<button type="button" class="piece${on ? ' is-on' : ''}${base ? ' is-base' : ''}${lit}"${order} data-act="setv" data-key="${key}" data-value="${next}"
        ${base ? 'disabled' : ''} aria-pressed="${on}" aria-label="${esc(t('pieceOf', { what: label, n, max }))}" title="${esc(t('pieceOf', { what: label, n, max }))}">${piece(on)}</button>`;
    }).join('');
    return `<div class="field">
      <div class="field-row">
        <span class="field-text"><span class="field-name">${esc(label)}</span><span class="field-note">${esc(range)}</span></span>
        <span class="field-num">${value}<i class="u">/${max}</i></span>
      </div>
      <div class="pieces is-${key}" role="group" aria-label="${esc(label)}" style="--n:${max}">${btns}</div>
      ${value < max ? previewOf(previewNext, 'ifOneMore') : ''}
    </div>`;
  }
  const maskPiece = () => `<img src="${D.art('hud', 'mask')}" alt="">`;
  const vesselPiece = () => `<img src="${D.art('hud', 'vessel')}" alt="">`;
  const notchPiece = (on) => `<i class="notch ${on ? 'is-used' : 'is-free'}"></i>`;

  /* A level to choose under a plate: each level with its own artwork (Vengeful Spirit and Shade
     Soul, the two cloaks) and, first, the dimmed "not learnt" one. The chosen one carries the
     accent's veil, like the nail picks. */
  function levelPick(key, value, levels, label) {
    return `<span class="lvlpick" role="group" aria-label="${esc(label)}">${levels.map((l, i) => `<button type="button" class="lvl${i === value ? ' is-on' : ''}${l.art ? '' : ' is-none'}"
        data-act="seg" data-key="${key}" data-value="${i}" aria-pressed="${i === value}" title="${esc(l.title)}" aria-label="${esc(l.title)}">
        ${l.art ? `<img src="${l.art}" alt="">` : '<span aria-hidden="true">—</span>'}</button>`).join('')}</span>`;
  }

  /* The nail: all five in a row and upright, like the large one on the sheet, with its damage
     below. The one you carry has the arena's cold spotlight behind it; the others wait in half-light. */
  function renderNailBlock() {
    const nails = D.NAILS.map((n) => {
      const on = App.state.nail === n.level;
      return `<button type="button" class="nailpick${on ? ' is-on' : ''}${fx(on, was((st) => st.nail) === n.level)}" data-act="seg" data-key="nail" data-value="${n.level}" aria-pressed="${on}" aria-label="${esc(pick(n) + ', ' + n.damage)}" title="${esc(pick(n))}">
        <span class="nailpick-art"><img src="${D.art('nails', n.level)}" alt="" width="80" height="360"></span>
        <span class="nailpick-num">${n.damage}</span>
      </button>`;
    }).join('');
    return `<section class="block is-nail">
      <h3 class="block-head">${esc(t('theNail'))}<span class="block-note"${NT}>${esc(pick(D.NAILS[App.state.nail]))}</span></h3>
      <div class="nailpicks">${nails}</div>
    </section>`;
  }

  /* Arts and spells, like the sheet's plates but smaller and made to be touched: as a silhouette
     what you haven't learnt, with its light what you have, and below it what it gives. */
  function renderArtsBlock() {
    const plates = ART_KEYS.map((k) => {
      const on = !!App.state.arts[k];
      return `<button type="button" class="gplate${on ? ' is-on' : ''}${fx(on, was((st) => !!st.arts[k]))}" data-act="art" data-key="${k}" aria-pressed="${on}" title="${esc(D.ARTS[k].en)}">
        <span class="gplate-art"><img src="${D.art('arts', k)}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(D.ARTS[k]))}</span>
        <span class="gplate-val${on ? '' : ' is-none'}">${on ? fmtStatRich(App.sheet.stats[ART_STAT[k]]) : esc(t('notLearned'))}</span>
      </button>`;
    }).join('');
    return `<section class="block is-arts"><h3 class="block-head">${esc(t('arts'))}</h3><div class="gplates">${plates}</div></section>`;
  }

  function renderSpellsBlock() {
    const plates = SPELL_KEYS.map((k) => {
      const sp = D.SPELLS[k];
      const lvl = App.state.spells[k];
      const has = (id) => App.state.charms.includes(id);
      const levels = [{ title: t('notLearned') }, { art: spellArt(k, 1, has), title: pick(sp.levels[1]) }, { art: spellArt(k, 2, has), title: pick(sp.levels[2]) }];
      // A new level (Vengeful Spirit → Shade Soul) lights up too: it's another spell.
      const lvlWas = was((st) => st.spells[k]);
      const lit = lvl && lvlWas && lvl !== lvlWas ? ' is-lit' : fx(!!lvl, !!lvlWas);
      return `<div class="gplate${lvl ? ' is-on' : ''}${lit}">
        <span class="gplate-art"><img src="${spellArt(k, lvl, (id) => App.state.charms.includes(id))}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(lvl ? pick(sp.levels[lvl]) : pick(sp.slot))}</span>
        <span class="gplate-val${lvl ? '' : ' is-none'}">${lvl ? fmtStatRich(App.sheet.stats['spell.' + k]) : esc(t('notLearned'))}</span>
        ${levelPick('spells.' + k, lvl, levels, pick(sp.slot))}
      </div>`;
    }).join('');
    return `<section class="block is-spells"><h3 class="block-head">${esc(t('spells'))}</h3><div class="gplates">${plates}</div></section>`;
  }

  /* The abilities that change some number: the Dream Nail, the cloak and Grimmchild's phase.
     The same plates as arts and spells. */
  function renderAbilitiesBlock() {
    // Grimmchild's phases: four of the game's notches with their numeral, lit up to the phase.
    const phases = (key, value, opts, label) => `<span class="lvlpick is-dots" role="group" aria-label="${esc(label)}">${opts.map((o, i) => {
      const v = i + (o.from || 0);
      const had = was((st) => st[key]);
      const lit = v <= value && v > had ? ` is-lit" style="--i:${v - had - 1}` : '';
      return `<button type="button" class="sd-dot${v <= value ? '' : ' is-off'}${lit}" data-act="seg" data-key="${key}" data-value="${v}" aria-pressed="${v === value}"
        title="${esc(o.title)}" aria-label="${esc(o.title)}" ${o.off ? 'disabled' : ''}><i class="notch${v <= value ? ' is-used' : ' is-free'}"></i><small>${o.text}</small></button>`;
    }).join('')}</span>`;
    const A = D.ABILITIES;
    const dream = `<button type="button" class="gplate${App.state.dream ? ' is-on' : ''}${fx(App.state.dream, was((st) => st.dream))}" data-act="seg" data-key="dream" data-value="${App.state.dream ? 0 : 1}" aria-pressed="${App.state.dream}" title="${esc(A.dream.en)}">
        <span class="gplate-art"><img src="${D.art('abilities', A.dream.art)}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(A.dream))}</span>
        <span class="gplate-val${App.state.dream ? '' : ' is-none'}">${App.state.dream ? fmtStatRich(App.sheet.stats['soul.dreamNail']) : esc(t('notFound'))}</span>
      </button>`;
    const cloak = A.cloaks[App.state.cloak];
    const cloakWas = was((st) => st.cloak);
    const cloakPlate = `<div class="gplate${cloak ? ' is-on' : ''}${cloak && cloakWas && cloak !== A.cloaks[cloakWas] ? ' is-lit' : fx(!!cloak, !!cloakWas)}">
        <span class="gplate-art"><img src="${D.art('abilities', (cloak || A.cloaks[1]).art)}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(cloak || A.cloaks[1]))}</span>
        <span class="gplate-val${cloak ? '' : ' is-none'}">${cloak ? fmtStatRich(App.sheet.stats['move.dashCooldown']) : esc(t('notFound'))}</span>
        ${levelPick('cloak', App.state.cloak, [{ title: t('notFound') }, { art: D.art('abilities', A.cloaks[1].art), title: pick(A.cloaks[1]) },
          { art: D.art('abilities', A.cloaks[2].art), title: pick(A.cloaks[2]) }], t('cloakLbl'))}
      </div>`;
    // The phase belongs to the charm: without Grimmchild in your collection there's no plate (whoever banishes
    // the troupe has Carefree Melody in its place). Phase IV needs the Dream Nail.
    const gdmg = D.PETS.grimmchildByPhase[App.state.grimm];
    const grimm = !isOwned('grimmchild') ? '' : `<div class="gplate is-on">
        <span class="gplate-art"><img src="${D.art('effects', 'grimmchild')}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(D.CHARM_BY_ID.grimmchild))}</span>
        <span class="gplate-val${gdmg ? '' : ' is-none'}">${gdmg ? esc(String(gdmg)) : esc(t('grimmNoAttack'))}</span>
        ${phases('grimm', App.state.grimm, ['I', 'II', 'III', 'IV'].map((text, i) => ({ text, from: 1,
          off: i === 3 && !App.state.dream, title: i === 3 && !App.state.dream ? t('grimmNeedsDream') : t('grimmPhase', { n: i + 1 }) })), pick(D.CHARM_BY_ID.grimmchild))}
      </div>`;
    return `<section class="block is-abilities"><h3 class="block-head">${esc(t('abilities'))}</h3><div class="gplates">${dream}${cloakPlate}${grimm}</div></section>`;
  }

  /* The charms you've found, on the grid from the game's charm screen: the same one as on
     Charms (QUICK_SLOTS, four rows of ten with the even ones offset and the two-version slots
     split). Shadowed, the ones you don't have. A tap marks or unmarks; "All" and "None", in
     one go. */
  function renderOwnedBlock() {
    // Counts the game's slots (40): for the double ones, one of their two versions is enough.
    const n = QUICK_SLOTS.filter((sl) => sl.some((c) => isOwned(c.id))).length;
    const tile = (c) => {
      const on = isOwned(c.id);
      return `<button type="button" class="qc${on ? '' : ' is-missing'}${justFound(c.id) ? ' is-new' : ''}" data-act="own" data-id="${c.id}" aria-pressed="${on}" title="${esc(pick(c) + (on ? '' : ' · ' + t('notFound')))}">
        <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}" loading="lazy">
      </button>`;
    };
    /* A double slot is one whole slot that switches: each tap moves it on, none → first version
       → second → none, so at most one is ever marked. It shows the marked one (with none, the
       first, shadowed), and two dots under it say which of the two it is. */
    const dual = (sl) => {
      const cur = sl.find((c) => isOwned(c.id)) || null;
      const next = cur === sl[0] ? sl[1].id : cur ? '' : sl[0].id;
      const shown = cur || sl[0];
      const label = cur ? pick(cur) : `${pick(sl[0])} / ${pick(sl[1])} · ${t('notFound')}`;
      const pips = sl.map((c) => `<span class="qc-pip${c === cur ? ' is-on' : ''}"></span>`).join('');
      return `<button type="button" class="qc qc-dual${cur ? '' : ' is-missing'}${cur && justFound(cur.id) ? ' is-new' : ''}" data-act="ownPick" data-value="${shown.group}" data-token="${next}" aria-label="${esc(label)}" title="${esc(label)}">
        <img src="assets/charms/${shown.id}.png" alt="" loading="lazy">
        <span class="qc-pips" aria-hidden="true">${pips}</span>
      </button>`;
    };
    const slot = (sl) => (sl.length === 1 ? tile(sl[0]) : dual(sl));
    let rows = '';
    for (let i = 0; i < QUICK_SLOTS.length; i += QUICK_PER_ROW) {
      rows += `<div class="qrow">${QUICK_SLOTS.slice(i, i + QUICK_PER_ROW).map(slot).join('')}</div>`;
    }
    const total = QUICK_SLOTS.length;
    return `<section class="block quick quick-owned is-owned"><h3 class="block-head">${esc(t('ownedTitle'))}<span class="block-note">${n}/${total}</span>
        <span class="own-all">
          <button type="button" class="text-btn" data-act="ownAll" data-value="1" ${isMaxOwned() ? 'disabled' : ''}>${esc(t('ownAll'))}</button>
          <span class="presets-sep" aria-hidden="true">·</span>
          <button type="button" class="text-btn" data-act="ownAll" data-value="0" ${App.owned.length ? '' : 'disabled'}>${esc(t('ownNone'))}</button>
        </span></h3>
      <div class="quick-grid">${rows}</div>
    </section>`;
  }

  function renderBodyBlock() {
    return `<section class="block is-body"><h3 class="block-head">${esc(t('body'))}</h3>
      ${pieceRow('masks', App.state.masks, D.HEALTH.baseMasks, D.HEALTH.maxMasks, t('masksField'), t('masksNote'), maskPiece,
        App.state.masks < D.HEALTH.maxMasks ? C.set(App.state, 'masks', App.state.masks + 1) : null)}
      ${pieceRow('vessels', App.state.vessels, 0, D.SOUL.maxVessels, t('vesselsField'), t('vesselsNote'), vesselPiece,
        App.state.vessels < D.SOUL.maxVessels ? C.set(App.state, 'vessels', App.state.vessels + 1) : null)}
      ${pieceRow('notches', App.state.notches, D.CHARM_NOTCHES.base, D.CHARM_NOTCHES.max, t('notchesField'), t('notchesNote'), notchPiece,
        App.state.notches < D.CHARM_NOTCHES.max ? C.set(App.state, 'notches', App.state.notches + 1) : null)}
    </section>`;
  }

  /* Your game is another page of the Inventory: the same black with its corner brackets and no
     box. Two columns that don't share rows, so a tall block doesn't leave a hole beside it: on the
     left what you learn (the nail, its arts, the spells, the abilities), on the right what you
     collect (the body and the charms found). In one column they go back to the page's order. What you've achieved in the game —nail, body, arts, spells and abilities—, and under
     the title two starting points: the base Knight (which also clears the charms) and
     everything maxed out (which keeps them). */
  function renderGear() {
    const presets = `<div class="presets">
      <span class="lbl">${esc(t('presetsLbl'))}</span>
      <button type="button" class="text-btn" data-act="preset" data-value="base" title="${esc(t('presetBaseHint'))}">${esc(t('presetBase'))}</button>
      <span class="presets-sep" aria-hidden="true">·</span>
      <button type="button" class="text-btn" data-act="preset" data-value="max" title="${esc(t('presetMaxHint'))}">${esc(t('presetMax'))}</button>
    </div>`;
    el.gear.innerHTML = `<div class="gear-body">${brackets}
      ${screenHead(esc(t('navGame')), presets)}
      <div class="gear-col">${renderNailBlock()}${renderArtsBlock()}${renderSpellsBlock()}${renderAbilitiesBlock()}</div>
      <div class="gear-col">${renderBodyBlock()}${renderOwnedBlock()}</div>
    </div>`;
  }

  Object.assign(actions, {
    step(node) {
      const key = node.dataset.key, d = Number(node.dataset.delta);
      commit(C.set(App.state, key, App.state[key] + d));
    },
    setv(node) {
      const key = node.dataset.key;
      const before = App.state.charms;
      const next = C.set(App.state, key, Number(node.dataset.value));
      // With fewer notches, the last charms worn may no longer fit (C.normalize takes them off):
      // it's said, so they don't vanish from Charms without a word.
      const off = before.filter((id) => !next.charms.includes(id));
      if (commit(next) && off.length) {
        App.toast(t(off.length === 1 ? 'notchesTrimmedOne' : 'notchesTrimmed', { n: next.notches, charms: off.map((id) => pick(D.CHARM_BY_ID[id])).join(', ') }));
      }
    },
    seg(node) {
      const key = node.dataset.key;
      commit(C.set(App.state, key, Number(node.dataset.value)));
    },
    own(node) {
      const id = node.dataset.id;
      setOwned(App.owned.includes(id) ? App.owned.filter((x) => x !== id) : [...App.owned, id]);
    },
    ownPick(node) { setOwned(C.ownSet(App.owned, node.dataset.value, node.dataset.token || null)); },
    ownAll(node) { setOwned(node.dataset.value === '1' ? C.OWN_MAX : []); },
    art(node) {
      const k = node.dataset.key;
      commit(C.set(App.state, 'arts.' + k, !App.state.arts[k]));
    },
    hp(node) {
      const value = Number(node.dataset.value);
      commit(C.set(App.state, 'hp', value));
    },
    /* No notice: what each one does is said by its title, and the change shows on screen. The
       charms found go with them: a new game has none, and everything maxed out, all of
       them. */
    preset(node) {
      const max = node.dataset.value === 'max';
      const next = max ? C.normalize({ ...C.PRESETS.max, charms: App.state.charms, hp: App.state.hp }) : C.normalize(C.PRESETS.base);
      const was = App.owned;
      App.was = { state: App.state, owned: was };   // so the repaint lights up what the preset brings
      App.owned = max ? C.OWN_MAX.slice() : [];  // before commit(), so its repaint already carries it
      if (commit(next)) saveOwned(); else { App.owned = was; App.was = null; render(); }
    },
  });

  Object.assign(App, { renderGear });
})();
