/* js/app-saves.js — the Saves screen: free mode, and the four slots like the game's profile
   screen, with what each game carries and the game's own buttons: New Game on an empty one,
   Clear Save with its confirmation on a full one. The rules (what goes in a slot, switching, clearing)
   are in js/saves.js. Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, C = HK.codec, S = HK.saves, HJ = HK.hunter, HG = HK.hall;
  const App = HK.app;
  const { t, pick, el, NT, esc, prefs, savePrefs, brackets, screenHead, render, actions, here, PAGE_LANG, toast } = App;

  let store = null;
  try { store = localStorage; } catch (e) { store = null; }
  // The slot whose Clear Save is asking for confirmation, or 0.
  let clearing = 0;

  const parse = (s, def) => { try { const v = JSON.parse(s); return v == null ? def : v; } catch (e) { return def; } };
  /* What a slot's card shows, read from its copy with the same defaults as the loaders: with no
     build, everything maxed (App.loadState); with no charms saved, all of them (App.loadOwned). */
  function summary(snap) {
    const st = snap['hollow.build'] ? C.decode(snap['hollow.build']) : C.normalize(C.PRESETS.max);
    const owned = snap['hollow.owned'] != null ? C.ownNormalize(parse(snap['hollow.owned'], [])) : C.OWN_MAX;
    const book = HJ.normalize(parse(snap['hollow.journal'], {}));
    const marks = HG.normalizeMarks(parse(snap['hollow.hall'], {}));
    return {
      st, charms: owned.length,
      journal: HJ.counts(book),
      hall: HG.STATUES.filter((s) => (marks[s.id] || []).length).length,
    };
  }

  const num = (n) => App.NF[0].format(n);
  function card(slot) {
    const n = slot.n, free = n === S.FREE;
    const label = free ? t('freeMode') : t('saveSlot', { n });
    if (!slot.snap) {
      return `<li class="save is-empty">
        <button type="button" class="save-main" data-act="saveNew" data-value="${n}" aria-label="${esc(label + ': ' + t('saveNew'))}">
          <span class="save-n">${n}</span>
          <span class="save-new">${esc(t('saveNew'))}</span>
        </button>
      </li>`;
    }
    const s = summary(slot.snap);
    const masks = Array.from({ length: s.st.masks }, () => `<img src="${D.art('hud', 'mask')}" alt="">`).join('');
    const vessels = Array.from({ length: s.st.vessels }, () => `<img src="${D.art('hud', 'soul')}" alt="">`).join('');
    const facts = [
      [t('navCharms'), s.charms, C.OWN_MAX.length],
      [t('navJournal'), s.journal.completed, s.journal.total],
      [t('fightTabHall'), s.hall, HG.STATUES.length],
    ].map(([k, v, max]) => `<span class="save-fact"><span class="save-k">${esc(k)}</span><b>${num(v)}</b><i class="u">/${num(max)}</i></span>`).join('');
    const confirm = clearing === n
      ? `<span class="save-ask" role="group" aria-label="${esc(t('saveClearAsk'))}">
          <span class="save-ask-q">${esc(t('saveClearAsk'))}</span>
          <button type="button" class="text-btn" data-act="saveClearYes" data-value="${n}">${esc(t('yes'))}</button>
          <button type="button" class="text-btn" data-act="saveClearNo" data-value="${n}">${esc(t('no'))}</button>
        </span>`
      : `<button type="button" class="text-btn save-clear" data-act="saveClear" data-value="${n}">${esc(t('saveClear'))}</button>`;
    return `<li class="save${slot.active ? ' is-active' : ''}${free ? ' is-free' : ''}">
      <button type="button" class="save-main" data-act="savePick" data-value="${n}"${slot.active ? ' aria-current="true"' : ''}
        aria-label="${esc(label + (slot.active ? ', ' + t('saveCurrent') : ''))}" title="${esc(slot.active ? t('saveContinue') : t('saveLoad'))}">
        <span class="save-n">${free ? `<img src="${D.art('hud', 'knight')}" alt="">` : n}</span>
        ${free ? `<span class="save-name"><b>${esc(label)}</b><span class="save-name-note">${esc(t('freeModeNote'))}</span></span>` : ''}
        <span class="save-hud">
          <span class="save-masks">${masks}</span>
          ${vessels ? `<span class="save-vessels">${vessels}</span>` : ''}
          ${slot.active ? `<span class="save-tag">${esc(t('saveCurrent'))}</span>` : ''}
        </span>
        <span class="save-nail"><img src="${D.art('nails', s.st.nail)}" alt="" width="80" height="360"><span${NT}>${esc(pick(D.NAILS[s.st.nail]))}</span></span>
        <span class="save-facts">${facts}</span>
      </button>
      ${free ? '' : `<span class="save-foot">${confirm}</span>`}
    </li>`;
  }

  function renderSaves() {
    if (prefs.view !== 'saves') return;
    const [free, ...slots] = store ? S.list(store) : [{ n: S.FREE, active: true, snap: {} }];
    el.saves.innerHTML = `<div class="saves-body">${brackets}
      ${screenHead(esc(t('savesTitle')), `<p class="saves-note">${esc(t('savesNote'))}</p>`)}
      <ul class="saves-list is-free">${card(free)}</ul>
      ${slots.length ? `<ol class="saves-list">${slots.map(card).join('')}</ol>` : ''}
    </div>`;
  }

  /* Entering another game reloads the page, like the game's own loading screen: every screen
     reads its keys again from scratch, and nothing of the game you leave (an undo, the fight
     in progress, the Journal's page) is left over in the one you enter. It lands on Charms,
     with no build in the link so the slot's one is read. */
  function enter() {
    prefs.view = 'charms';
    savePrefs();
    const hash = prefs.lang !== PAGE_LANG ? '#lang=' + prefs.lang : '';
    try { history.replaceState(null, '', here(hash)); } catch (e) { location.hash = hash; }
    location.reload();
  }

  Object.assign(actions, {
    savePick(node) {
      const n = Number(node.dataset.value);
      if (!store) { toast(t('savesNoStorage')); return; }
      if (S.read(store).active === n) { App.go('charms', true); return; }
      if (S.select(store, n)) enter();
    },
    saveNew(node) { actions.savePick(node); },
    saveClear(node) { clearing = Number(node.dataset.value); render(); focusIn('[data-act="saveClearNo"]'); },
    saveClearNo(node) { const n = clearing; clearing = 0; render(); focusIn(`[data-act="saveClear"][data-value="${n || node.dataset.value}"]`); },
    saveClearYes(node) {
      const n = Number(node.dataset.value);
      clearing = 0;
      if (!store || !S.clear(store, n)) { render(); return; }
      if (S.read(store).active === n) enter();
      else { render(); focusIn(`[data-act="saveNew"][data-value="${n}"]`); }
    },
  });
  const focusIn = (sel) => { const b = el.saves.querySelector(sel); if (b) b.focus(); };

  // The slot you're playing, or 0 (S.FREE) in free mode.
  const activeSlot = () => (store ? S.read(store).active : S.FREE);
  Object.assign(App, { renderSaves, activeSlot });
})();
