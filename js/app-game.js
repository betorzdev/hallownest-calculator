/* js/app-game.js — the Your game screen: nail, body, arts, spells, abilities and the charms
   you've found, with their actions. Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, C = HK.codec;
  const App = HK.app;
  const { t, pick, el, SPELL_KEYS, ART_KEYS, ART_STAT, NT, esc, fmtStatRich, spellArt, badgeText, compute,
    commit, brackets, screenHead, QUICK_PER_ROW, QUICK_SLOTS, render, actions, isMaxOwned, saveOwned,
    isOwned, setOwned } = App;

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

  /* A Body step: the game item that raises it —the mask, the vessel, the notch—, its name
     and its range, and the −/+ on the right. Below, what would change with one more. */
  function stepper(key, value, min, max, label, range, icon, previewNext) {
    return `<div class="field">
      <div class="field-row">
        <span class="field-icon"><img src="${D.art('hud', icon)}" alt=""></span>
        <span class="field-text"><span class="field-name">${esc(label)}</span><span class="field-note">${esc(range)}</span></span>
        <span class="step-row">
          <button type="button" class="step" data-act="step" data-key="${key}" data-delta="-1" ${value <= min ? 'disabled' : ''} aria-label="${esc(t('less') + ': ' + label)}">−</button>
          <span class="step-num">${value}</span>
          <button type="button" class="step" data-act="step" data-key="${key}" data-delta="1" ${value >= max ? 'disabled' : ''} aria-label="${esc(t('more') + ': ' + label)}">+</button>
        </span>
      </div>
      ${value < max ? previewOf(previewNext, 'ifOneMore') : ''}
    </div>`;
  }

  /* The nail: all five in a row and upright, like the large one on the sheet, with its damage
     below. The one you carry has the arena's cold spotlight behind it; the others wait in half-light. */
  function renderNailBlock() {
    const nails = D.NAILS.map((n) => {
      const on = App.state.nail === n.level;
      return `<button type="button" class="nailpick${on ? ' is-on' : ''}" data-act="seg" data-key="nail" data-value="${n.level}" aria-pressed="${on}" aria-label="${esc(pick(n) + ', ' + n.damage)}" title="${esc(pick(n))}">
        <span class="nailpick-art"><img src="${D.art('nails', n.level)}" alt="" width="80" height="360"></span>
        <span class="nailpick-num">${n.damage}</span>
      </button>`;
    }).join('');
    return `<section class="block">
      <h3 class="block-head">${esc(t('theNail'))}<span class="block-note"${NT}>${esc(pick(D.NAILS[App.state.nail]))}</span></h3>
      <div class="nailpicks">${nails}</div>
    </section>`;
  }

  /* Arts and spells, like the sheet's plates but smaller and made to be touched: as a silhouette
     what you haven't learnt, with its light what you have, and below it what it gives. */
  function renderArtsBlock() {
    const plates = ART_KEYS.map((k) => {
      const on = !!App.state.arts[k];
      return `<button type="button" class="gplate${on ? ' is-on' : ''}" data-act="art" data-key="${k}" aria-pressed="${on}" title="${esc(D.ARTS[k].en)}">
        <span class="gplate-art"><img src="${D.art('arts', k)}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(D.ARTS[k]))}</span>
        <span class="gplate-val${on ? '' : ' is-none'}">${on ? fmtStatRich(App.sheet.stats[ART_STAT[k]]) : esc(t('notLearned'))}</span>
      </button>`;
    }).join('');
    return `<section class="block"><h3 class="block-head">${esc(t('arts'))}</h3><div class="gplates">${plates}</div></section>`;
  }

  function renderSpellsBlock() {
    const plates = SPELL_KEYS.map((k) => {
      const sp = D.SPELLS[k];
      const lvl = App.state.spells[k];
      const opts = [{ text: '—', title: t('notLearned') }, { text: 'I', title: pick(sp.levels[1]) }, { text: 'II', title: pick(sp.levels[2]) }];
      return `<div class="gplate${lvl ? ' is-on' : ''}">
        <span class="gplate-art"><img src="${spellArt(k, lvl, (id) => App.state.charms.includes(id))}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(lvl ? pick(sp.levels[lvl]) : pick(sp.slot))}</span>
        <span class="gplate-val${lvl ? '' : ' is-none'}">${lvl ? fmtStatRich(App.sheet.stats['spell.' + k]) : esc(t('notLearned'))}</span>
        <span class="seg sm" role="group" aria-label="${esc(pick(sp.slot))}">${opts.map((o, i) => `<button type="button" data-act="seg" data-key="spells.${k}" data-value="${i}" aria-pressed="${i === lvl}" title="${esc(o.title)}">${o.text}</button>`).join('')}</span>
      </div>`;
    }).join('');
    return `<section class="block"><h3 class="block-head">${esc(t('spells'))}</h3><div class="gplates">${plates}</div></section>`;
  }

  /* The abilities that change some number: the Dream Nail, the cloak and Grimmchild's phase.
     The same plates as arts and spells. */
  function renderAbilitiesBlock() {
    const segmented = (key, value, opts, label) => `<span class="seg sm" role="group" aria-label="${esc(label)}">${opts.map((o, i) => `<button type="button" data-act="seg" data-key="${key}" data-value="${i + (o.from || 0)}" aria-pressed="${i + (o.from || 0) === value}" title="${esc(o.title)}" ${o.off ? 'disabled' : ''}>${o.text}</button>`).join('')}</span>`;
    const A = D.ABILITIES;
    const dream = `<button type="button" class="gplate${App.state.dream ? ' is-on' : ''}" data-act="seg" data-key="dream" data-value="${App.state.dream ? 0 : 1}" aria-pressed="${App.state.dream}" title="${esc(A.dream.en)}">
        <span class="gplate-art"><img src="${D.art('abilities', A.dream.art)}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(A.dream))}</span>
        <span class="gplate-val${App.state.dream ? '' : ' is-none'}">${App.state.dream ? fmtStatRich(App.sheet.stats['soul.dreamNail']) : esc(t('notFound'))}</span>
      </button>`;
    const cloak = A.cloaks[App.state.cloak];
    const cloakPlate = `<div class="gplate${cloak ? ' is-on' : ''}">
        <span class="gplate-art"><img src="${D.art('abilities', (cloak || A.cloaks[1]).art)}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(cloak || A.cloaks[1]))}</span>
        <span class="gplate-val${cloak ? '' : ' is-none'}">${cloak ? fmtStatRich(App.sheet.stats['move.dashCooldown']) : esc(t('notFound'))}</span>
        ${segmented('cloak', App.state.cloak, [{ text: '—', title: t('notFound') }, { text: 'I', title: pick(A.cloaks[1]) }, { text: 'II', title: pick(A.cloaks[2]) }], t('cloakLbl'))}
      </div>`;
    // The phase belongs to the charm: without Grimmchild in your collection there's no plate (whoever banishes
    // the troupe has Carefree Melody in its place). Phase IV needs the Dream Nail.
    const gdmg = D.PETS.grimmchildByPhase[App.state.grimm];
    const grimm = !isOwned('grimmchild') ? '' : `<div class="gplate is-on">
        <span class="gplate-art"><img src="${D.art('effects', 'grimmchild')}" alt=""></span>
        <span class="gplate-name"${NT}>${esc(pick(D.CHARM_BY_ID.grimmchild))}</span>
        <span class="gplate-val${gdmg ? '' : ' is-none'}">${gdmg ? esc(String(gdmg)) : esc(t('grimmNoAttack'))}</span>
        ${segmented('grimm', App.state.grimm, ['I', 'II', 'III', 'IV'].map((text, i) => ({ text, from: 1,
          off: i === 3 && !App.state.dream, title: i === 3 && !App.state.dream ? t('grimmNeedsDream') : t('grimmPhase', { n: i + 1 }) })), pick(D.CHARM_BY_ID.grimmchild))}
      </div>`;
    return `<section class="block"><h3 class="block-head">${esc(t('abilities'))}</h3><div class="gplates">${dream}${cloakPlate}${grimm}</div></section>`;
  }

  /* The charms you've found, on the grid from the game's charm screen: the same one as on
     Charms (QUICK_SLOTS, four rows of ten with the even ones offset and the two-version slots
     split). Shadowed, the ones you don't have. A tap marks or unmarks; "All" and "None", in
     one go. */
  function renderOwnedBlock() {
    // Counts the game's slots (40): for the double ones, one of their two versions is enough.
    const n = QUICK_SLOTS.filter((sl) => sl.some((c) => isOwned(c.id))).length;
    const tile = (c, half) => {
      const on = isOwned(c.id);
      // The halves of a double slot: at most one marked; tapping the marked one removes it.
      const act = half ? `data-act="ownPick" data-value="${c.group}" data-token="${on ? '' : c.id}"` : `data-act="own" data-id="${c.id}"`;
      return `<button type="button" class="qc${half ? ' qc-half' : ''}${on ? '' : ' is-missing'}" ${act} aria-pressed="${on}" title="${esc(pick(c) + (on ? '' : ' · ' + t('notFound')))}">
        <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}" loading="lazy">
      </button>`;
    };
    const slot = (sl) => (sl.length === 1 ? tile(sl[0], false) : `<span class="qslot-pair">${sl.map((c) => tile(c, true)).join('')}</span>`);
    let rows = '';
    for (let i = 0; i < QUICK_SLOTS.length; i += QUICK_PER_ROW) {
      rows += `<div class="qrow">${QUICK_SLOTS.slice(i, i + QUICK_PER_ROW).map(slot).join('')}</div>`;
    }
    const total = QUICK_SLOTS.length;
    return `<section class="block quick quick-owned"><h3 class="block-head">${esc(t('ownedTitle'))}<span class="block-note">${n}/${total}</span>
        <span class="own-all">
          <button type="button" class="text-btn" data-act="ownAll" data-value="1" ${isMaxOwned() ? 'disabled' : ''}>${esc(t('ownAll'))}</button>
          <span class="presets-sep" aria-hidden="true">·</span>
          <button type="button" class="text-btn" data-act="ownAll" data-value="0" ${App.owned.length ? '' : 'disabled'}>${esc(t('ownNone'))}</button>
        </span></h3>
      <div class="quick-grid">${rows}</div>
    </section>`;
  }

  function renderBodyBlock() {
    return `<section class="block"><h3 class="block-head">${esc(t('body'))}</h3>
      ${stepper('masks', App.state.masks, D.HEALTH.baseMasks, D.HEALTH.maxMasks, t('masksField'), t('masksNote'), 'mask',
        App.state.masks < D.HEALTH.maxMasks ? C.set(App.state, 'masks', App.state.masks + 1) : null)}
      ${stepper('vessels', App.state.vessels, 0, D.SOUL.maxVessels, t('vesselsField'), t('vesselsNote'), 'vessel',
        App.state.vessels < D.SOUL.maxVessels ? C.set(App.state, 'vessels', App.state.vessels + 1) : null)}
      ${stepper('notches', App.state.notches, D.CHARM_NOTCHES.base, D.CHARM_NOTCHES.max, t('notchesField'), t('notchesNote'), 'notch',
        App.state.notches < D.CHARM_NOTCHES.max ? C.set(App.state, 'notches', App.state.notches + 1) : null)}
    </section>`;
  }

  /* Your game is another page of the Inventory: the same black with its corner brackets and no
     box. What you've achieved in the game —nail, body, arts, spells and abilities—, and under
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
      ${renderNailBlock()}
      ${renderBodyBlock()}
      ${renderArtsBlock()}
      ${renderSpellsBlock()}
      ${renderAbilitiesBlock()}
      ${renderOwnedBlock()}
    </div>`;
  }

  Object.assign(actions, {
    step(node) {
      const key = node.dataset.key, d = Number(node.dataset.delta);
      commit(C.set(App.state, key, App.state[key] + d));
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
      App.owned = max ? C.OWN_MAX.slice() : [];  // before commit(), so its repaint already carries it
      if (commit(next)) saveOwned(); else { App.owned = was; render(); }
    },
  });

  Object.assign(App, { renderGear });
})();
