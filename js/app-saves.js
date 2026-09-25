/* js/app-saves.js — the Saves screen: free mode, and the four slots like the game's profile
   screen, with what each game carries and the game's own buttons: New Game on an empty one,
   Clear Save with its confirmation on a full one. Any slot can also take a game imported from the
   real one: its Import button opens the import view in place of the list, which explains how to
   find the game's file (by system, with the folder to copy), takes it by drag and drop or with the
   picker, and shows what it read before anything is written (js/savefile.js reads it). The rules
   (what goes in a slot, switching, clearing) are in js/saves.js. Where the browser can (js/live.js),
   the picker keeps a handle to the file and the slot can stay linked to it: it catches up each time
   the game saves. Shares HK.app with js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, C = HK.codec, S = HK.saves, HJ = HK.hunter, HG = HK.hall, F = HK.savefile, PN = HK.pantheons, L = HK.live;
  const P = HK.progress, R = HK.rooms;
  const App = HK.app;
  const { t, pick, el, NT, esc, FLEURS, prefs, savePrefs, brackets, screenHead, render, actions, here, PAGE_LANG, toast, track, pctSpace } = App;

  let store = null;
  try { store = localStorage; } catch (e) { store = null; }
  // The slot whose Clear Save is asking for confirmation, or 0.
  let clearing = 0;
  /* The slot just cleared, whose New Game comes in fading, or 0. After clearing the game you
     were in the page reloads, so it's handed over in sessionStorage (the preferences aren't the
     place: it's a one-off), with the row's height and where it was on the screen: the new page
     puts it back in the same place and lets it shrink as it does without a reload (landing). */
  const CLEARED_KEY = 'hollow.cleared';
  let justCleared = 0, landing = null;
  try {
    const h = JSON.parse(sessionStorage.getItem(CLEARED_KEY) || 'null');
    sessionStorage.removeItem(CLEARED_KEY);
    if (h && typeof h === 'object' && Number(h.n)) { justCleared = Number(h.n); landing = h; }
  } catch (e) { justCleared = 0; landing = null; }
  // The browser's own scroll restoration was switched off for the reload: it's back for what follows.
  if (landing) { try { history.scrollRestoration = 'auto'; } catch (e) { /* nothing to put back */ } }
  /* The page came in veiled (index.html). If it doesn't land on the row (another screen, no row),
     the veil goes all the same. */
  const unveil = () => document.documentElement.classList.remove('is-landing');
  if (document.documentElement.classList.contains('is-landing')) setTimeout(unveil, 2000);
  /* Entering a game (leave) veils the page too: the new one comes in with a fade once the boot's
     first render is painted, like the game's loading screen lifting. */
  const ENTERED_KEY = 'hollow.entered';
  try {
    if (sessionStorage.getItem(ENTERED_KEY)) {
      sessionStorage.removeItem(ENTERED_KEY);
      requestAnimationFrame(() => requestAnimationFrame(unveil));
    }
  } catch (e) { /* it came in unveiled */ }
  if (justCleared) setTimeout(() => { justCleared = 0; }, 1000);
  /* The import view: the slot it's for (0: the list shows), the system whose steps it shows,
     and the file: 'idle' (none yet), 'reading', 'ready' (read: { name, snap, meta }) or 'error'.
     fresh: the view has just opened, and its steps come in one after another. */
  const imp = { n: 0, os: 'win', state: 'idle', file: null, fresh: false, copied: 0, sync: true };
  /* The link with the game (js/live.js): the linked slots ({ n: file name }, read once at boot),
     and the active slot's watcher and what it says: '' (not linked), 'live', 'paused' or 'lost'. */
  const live = { links: {}, ready: false, n: 0, name: '', state: '', watcher: null };
  // The picker for the game's save, the import's and Follow's: it remembers the folder (id).
  const pickSave = () => showOpenFilePicker({ id: 'hk-save', multiple: false,
    types: [{ description: 'Hollow Knight', accept: { 'application/octet-stream': ['.dat'], 'application/json': ['.json'] } }] });

  const parse = (s, def) => { try { const v = JSON.parse(s); return v == null ? def : v; } catch (e) { return def; } };
  /* What a slot's card shows, read from its copy with the same defaults as the loaders: with no
     build, everything maxed (App.loadState); with no charms saved, all of them (App.loadOwned). */
  function summary(snap) {
    const st = snap['hollow.build'] ? C.decode(snap['hollow.build']) : C.normalize(C.PRESETS.max);
    const owned = snap['hollow.owned'] != null ? C.ownNormalize(parse(snap['hollow.owned'], [])) : C.OWN_MAX;
    const book = HJ.normalize(parse(snap['hollow.journal'], {}));
    const marks = HG.normalizeMarks(parse(snap['hollow.hall'], {}));
    const prog = P.normalize(parse(snap['hollow.progress'], {}));
    return {
      st, charms: owned.length,
      journal: HJ.counts(book),
      hall: HG.STATUES.filter((s) => (marks[s.id] || []).length).length,
      where: R.areaOf(prog.bench), shade: prog.shade,
    };
  }
  // An area's name and the light it takes (js/rooms.js), for a card or a notice.
  const areaName = (id) => (R.AREAS[id] ? pick(R.AREAS[id]) : '');
  const areaLight = (id) => (R.AREAS[id] && R.AREAS[id].light ? ` style="--where: var(--area-${R.AREAS[id].light}-deep)"` : '');

  const num = (n) => App.NF[0].format(n);
  function card(slot) {
    const n = slot.n, free = n === S.FREE;
    const label = free ? t('freeMode') : t('saveSlot', { n });
    if (!slot.snap) {
      return `<li class="save is-empty${justCleared === n ? ' is-cleared' : ''}" data-slot="${n}">
        <button type="button" class="save-main" data-act="saveNew" data-value="${n}" aria-label="${esc(label + ': ' + t('saveNew'))}">
          <span class="save-n">${n}</span>
          <span class="save-new">${FLEURS}${esc(t('saveNew'))}</span>
        </button>
        <span class="save-foot">${importBtn(n)}</span>
      </li>`;
    }
    const s = summary(slot.snap);
    // --r: its place counting from the right, so that on clearing they break as health is lost.
    const masks = Array.from({ length: s.st.masks }, (_, i) => `<img src="${D.art('hud', 'mask')}" alt="" style="--r:${s.st.masks - 1 - i}">`).join('');
    const vessels = Array.from({ length: s.st.vessels }, (_, i) => `<img src="${D.art('hud', 'soul')}" alt="" style="--r:${s.st.vessels - 1 - i}">`).join('');
    // The charms and the Journal: the Hall of Gods is secondary, and it's in the import's preview.
    const facts = [
      [t('navCharms'), s.charms, C.OWN_MAX.length],
      [t('navJournal'), s.journal.completed, s.journal.total],
    ].map(([k, v, max]) => `<span class="save-fact"><span class="save-k">${esc(k)}</span><b>${num(v)}</b><i class="u">/${num(max)}</i></span>`).join('');
    // Linked to the game's file: which one and, on the one you're in, how the link is.
    const linked = !free && live.links[n] != null ? `<span class="save-link${slot.active && live.state ? ' is-' + live.state : ''}">
        <span class="save-link-t">${esc(t('liveFollows', { file: live.links[n] }))}${slot.active && live.state ? ` · <b>${esc(t('liveState_' + live.state))}</b>` : ''}</span>
        <button type="button" class="text-btn" data-act="liveUnlink" data-value="${n}">${esc(t('liveUnlink'))}</button>
      </span>` : '';
    const confirm = clearing === n ? ask('saveClearAsk', 'saveClear', n)
      : `${linked ? '' : followBtn(n)}${importBtn(n)}<button type="button" class="save-act is-clear" data-act="saveClear" data-value="${n}">
          ${FLEURS}${ICON_CLEAR}
          <span class="save-act-t">${esc(t('saveClear'))}</span></button>`;
    // You're here: at the head of the card, over the masks (beside the name, in free mode).
    const here = slot.active ? `<span class="save-tag">${esc(t('saveCurrent'))}</span>` : '';
    /* Where you'd wake up, as the game's profile screen says it: the area of your last bench,
       whose light tints the card. And where your shade waits, if it does. */
    const where = s.where ? `<span class="save-where"${NT}>${esc(areaName(s.where))}</span>` : '';
    const shade = s.shade ? `<span class="save-shade">${esc(t('shadeCard', { area: areaName(R.areaOf(s.shade.scene)) || '?', geo: num(s.shade.geo) }))}</span>` : '';
    return `<li class="save${slot.active ? ' is-active' : ''}${free ? ' is-free' : ''}${s.where ? ' is-where' : ''}" data-slot="${n}"${areaLight(s.where)}>
      <button type="button" class="save-main" data-act="savePick" data-value="${n}"${slot.active ? ' aria-current="true"' : ''}
        aria-label="${esc(label + (slot.active ? ', ' + t('saveCurrent') : ''))}" title="${esc(slot.active ? t('saveContinue') : t('saveLoad'))}">
        <span class="save-n">${free ? `<img src="${D.art('hud', 'knight')}" alt="">` : n}</span>
        ${free ? `<span class="save-name"><b>${esc(label)}</b>${here}</span>` : here}
        <span class="save-hud">
          <span class="save-masks">${masks}</span>
          ${vessels ? `<span class="save-vessels">${vessels}</span>` : ''}
        </span>
        <span class="save-nail"><img src="${D.art('nails', s.st.nail)}" alt="" width="80" height="360"><span${NT}>${esc(pick(D.NAILS[s.st.nail]))}</span></span>
        <span class="save-facts">${where}${facts}${shade}</span>
      </button>
      ${free ? `<span class="save-foot save-note">${esc(t('freeModeNote'))}</span>` : `<span class="save-foot">${linked}${confirm}</span>`}
    </li>`;
  }

  /* A slot's buttons are the game's menu items (and so is New Game, on an empty one): its capitals, and on hover or focus the menu's
     pointers on either side of the one you're on (drawn: the wiki doesn't have the sprite; the
     game's interface arrows are abstracted stone pinnacles, design/02 §5). Their icons are the
     usual ones, drawn with the site's line: a tray with an arrow coming in (which dips when
     you're on it) and a bin (whose lid lifts). */
  const ICON_IMPORT = '<svg class="save-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12.5 V16.5 H17 V12.5"/><g class="save-ico-arrow"><path d="M10 2.5 V11.5"/><path d="M6.2 8 L10 11.8 L13.8 8"/></g></svg>';
  const ICON_CLEAR = '<svg class="save-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="save-ico-lid"><path d="M3 5.5 H17"/><path d="M7.8 5.5 V3.5 H12.2 V5.5"/></g><path d="M4.8 5.5 L5.8 17.5 H14.2 L15.2 5.5"/><path d="M8.3 8.8 V14.2"/><path d="M11.7 8.8 V14.2"/></svg>';
  /* A full slot that follows no file can start following one (where the browser can): the same
     menu item, with two arrows chasing each other round, which turn on hover. Hidden until the
     links are read, so that a linked slot doesn't flash it. */
  const ICON_FOLLOW = '<svg class="save-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="save-ico-turn"><path d="M16 8.5 A6.2 6.2 0 0 0 4.6 6.4"/><path d="M4.2 3.2 V6.8 H7.8"/><path d="M4 11.5 A6.2 6.2 0 0 0 15.4 13.6"/><path d="M15.8 16.8 V13.2 H12.2"/></g></svg>';
  const followBtn = (n) => (live.ready && L.canLive() ? `<button type="button" class="save-act is-follow" data-act="liveFollow" data-value="${n}"
    aria-label="${esc(t('saveSlot', { n }) + ': ' + t('liveFollow'))}" title="${esc(t('liveFollowHint'))}">${FLEURS}${ICON_FOLLOW}<span class="save-act-t"><span class="save-act-long">${esc(t('liveFollow'))}</span><span class="save-act-short">${esc(t('liveFollowShort'))}</span></span></button>` : '');
  const importBtn = (n) => `<button type="button" class="save-act is-import" data-act="saveImport" data-value="${n}"
    aria-label="${esc(t('saveSlot', { n }) + ': ' + t('saveImport'))}">${FLEURS}${ICON_IMPORT}<span class="save-act-t"><span class="save-act-long">${esc(t('saveImport'))}</span><span class="save-act-short">${esc(t('saveImportShort'))}</span></span></button>`;
  // The question a slot's foot asks before clearing it: yes, no.
  const ask = (q, act, n) => `<span class="save-ask" role="group" aria-label="${esc(t(q))}">
      <span class="save-ask-q">${esc(t(q))}</span>
      <span class="save-ask-yn"><button type="button" class="save-act" data-act="${act}Yes" data-value="${n}">${FLEURS}<span class="save-act-t">${esc(t('yes'))}</span></button>
      <button type="button" class="save-act" data-act="${act}No" data-value="${n}">${FLEURS}<span class="save-act-t">${esc(t('no'))}</span></button></span>
    </span>`;

  /* ── The import view ──────────────────────────────────────────────────
     Where each system keeps the game's saves, and how its file picker takes a pasted folder:
     Windows expands %USERPROFILE% in the name box, macOS opens "Go to folder" with ⇧⌘G and
     GTK/KDE the location bar with Ctrl+L. Folders and keys aren't translated: they're what's on
     the disk and on the keyboard (Enter is, in Spanish: «Intro»). */
  const SYSTEMS = {
    win:   { name: 'Windows', dir: '%USERPROFILE%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight', how: 'impHowWin', keys: [] },
    mac:   { name: 'macOS', dir: '~/Library/Application Support/unity.Team Cherry.Hollow Knight', how: 'impHowMac', keys: ['⇧⌘G'] },
    linux: { name: 'Linux', dir: '~/.config/unity3d/Team Cherry/Hollow Knight', how: 'impHowLinux', keys: ['Ctrl+L'] },
  };
  // The system this browser runs on, for the first tab; a phone gets Windows and a note.
  const ua = () => { try { return ((navigator.userAgentData && navigator.userAgentData.platform) || '') + ' ' + navigator.userAgent; } catch (e) { return ''; } };
  const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(ua());
  const detectOs = () => { const u = ua(); return /Mac/i.test(u) && !isMobile() ? 'mac' : /Linux|X11|CrOS/i.test(u) && !isMobile() ? 'linux' : 'win'; };
  // A computer: not a phone, nor an iPad asking for the desktop site (it says Mac, but it's touch).
  const isDesktop = () => { try { return !isMobile() && !(/Mac/i.test(ua()) && navigator.maxTouchPoints > 1); } catch (e) { return false; } };

  /* The notice for whoever's new, above the screen (js/app.js, renderBanner): on a computer, the
     one the game's saves are on, it says they can be imported. Only while nobody has chosen a
     save (free mode, the four empty), and until it's closed or the import view is opened. */
  const CLOSE = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10"/></svg>';
  App.importHint = () => {
    if (prefs.importHintOff || prefs.view === 'saves' || !store || !isDesktop()) return '';
    const saves = S.read(store);
    if (saves.active !== S.FREE || S.SLOT_IDS.some((n) => saves.slots[n])) return '';
    return `<div class="banner is-run is-hint">
      <span class="banner-tag">${esc(t('importHintTag'))}</span>
      <span class="banner-text">${esc(t('importHint'))}</span>
      <button type="button" class="btn btn-primary" data-act="importHintGo">${esc(t('saveImport'))}</button>
      <button type="button" class="banner-close" data-act="importHintOff" aria-label="${esc(t('importHintOff'))}" title="${esc(t('importHintOff'))}">${CLOSE}</button>
    </div>`;
  };
  const hintOff = () => { if (!prefs.importHintOff) { prefs.importHintOff = true; savePrefs(); } };

  const kbd = (k) => `<kbd translate="no">${esc(k)}</kbd>`;
  const FILE_ICON = '<svg class="imp-ficon" width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true"><path d="M1 1 H9 L13 5 V17 H1 Z"/><path d="M9 1 V5 H13"/></svg>';
  const BACK = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 L3.5 6 L8 10.5"/></svg>';

  function steps() {
    const sys = SYSTEMS[imp.os];
    const keys = sys.keys.map(kbd);
    const how = esc(t(sys.how, { k1: '\u0001', k2: '\u0002' }))
      .replace('\u0001', keys[0] || kbd(t('impEnter'))).replace('\u0002', kbd(t('impEnter')));
    const tabs = Object.entries(SYSTEMS).map(([id, x]) =>
      `<button type="button" data-act="importOs" data-value="${id}" aria-pressed="${id === imp.os}">${x.name}</button>`).join('');
    const files = [1, 2, 3, 4].map((k) => `<li translate="no">${FILE_ICON}user${k}.dat</li>`).join('')
      + `<li class="is-bak" translate="no">${FILE_ICON}user1.dat.bak1</li>`;
    return `<ol class="imp-steps">
      <li class="imp-step" style="--i:0">
        <span class="imp-num" aria-hidden="true">1</span>
        <div class="imp-step-body">
          <h3 class="imp-step-title">${esc(t('impStep1'))}</h3>
          <div class="seg sm imp-os" role="group" aria-label="${esc(t('impOs'))}">${tabs}</div>
          <div class="imp-path">
            <code translate="no">${esc(sys.dir)}</code>
            <button type="button" class="text-btn imp-copy${imp.copied ? ' is-done' : ''}" data-act="importCopy">${esc(t(imp.copied ? 'impCopied' : 'impCopy'))}</button>
          </div>
        </div>
      </li>
      <li class="imp-step" style="--i:1">
        <span class="imp-num" aria-hidden="true">2</span>
        <div class="imp-step-body">
          <h3 class="imp-step-title">${esc(t('impStep2'))}</h3>
          <p class="imp-text">${how}</p>
        </div>
      </li>
      <li class="imp-step" style="--i:2">
        <span class="imp-num" aria-hidden="true">3</span>
        <div class="imp-step-body">
          <h3 class="imp-step-title">${esc(t('impStep3'))}</h3>
          <ul class="imp-files" aria-hidden="true">${files}</ul>
          <p class="imp-text">${esc(t('impFiles'))}</p>
        </div>
      </li>
    </ol>`;
  }

  // What the drop zone holds in each state. The file's contents go in the preview, as a slot card would show them.
  function dropInner() {
    const choose = (key, primary) => `<button type="button" class="btn${primary ? ' btn-primary' : ''}" data-act="importPick">${esc(t(key))}</button>`;
    if (imp.state === 'ready') {
      const f = imp.file, s = summary(f.snap), m = f.meta;
      const img = (src, i) => `<img src="${src}" alt="" style="--i:${i}">`;
      const masks = Array.from({ length: s.st.masks }, (_, i) => img(D.art('hud', 'mask'), i)).join('');
      const vessels = Array.from({ length: s.st.vessels }, (_, i) => img(D.art('hud', 'soul'), s.st.masks + i)).join('');
      const h = Math.floor(m.time / 3600), min = Math.floor((m.time % 3600) / 60);
      const metaBits = [
        `<span>${esc(t('impTime', { h: num(h), m: num(min) }))}</span>`,
        `<span><span class="save-k">${esc(t('impCompletion'))}</span> <b>${num(Math.floor(m.completion))}${pctSpace()}</b></span>`,
        `<span><span class="save-k">${esc(t('impGeo'))}</span> <b>${num(m.geo)}</b></span>`,
      ].join('');
      // The game's version and the mods it had, quiet at the end of the line: they explain a figure
      // that counts differently (a save from before 1.5).
      const verText = [m.version ? t('impVersion', { v: m.version }) : '', m.mods.length ? t('impMods', { mods: m.mods.join(', ') }) : ''].filter(Boolean).join(' · ');
      const ver = verText ? `<span class="imp-ver" translate="no">${esc(verText)}</span>` : '';
      const facts = [
        [t('navCharms'), s.charms, C.OWN_MAX.length],
        [t('navJournal'), s.journal.completed, s.journal.total],
        [t('fightTabHall'), s.hall, HG.STATUES.length],
      ].map(([k, v, max]) => `<span class="save-fact"><span class="save-k">${esc(k)}</span><b>${num(v)}</b><i class="u">/${num(max)}</i></span>`).join('');
      // The five pantheons in order, each a diamond lit if it's been completed (the rule's diamond).
      // A screen reader hears the names of the ones completed; the empty diamonds are only drawing.
      const pans = PN.PANTHEONS.map((p, i) => {
        const done = m.pantheons.includes(p.id);
        return `<li class="imp-pan${done ? ' is-done' : ''}" style="--p:${i}" title="${esc(pick(p.name))}"${done ? '' : ' aria-hidden="true"'}>${done ? `<span class="sr-only">${esc(pick(p.name))}</span>` : ''}</li>`;
      }).join('');
      const pantheons = `<div class="imp-pans"><span class="save-k">${esc(t('fightTabPantheon'))}</span>
          <ol class="imp-pan-row" aria-label="${esc(t('fightTabPantheon'))}">${pans}</ol>
          <b>${num(m.pantheons.length)}</b><i class="u">/${num(PN.PANTHEONS.length)}</i></div>`;
      const full = store && S.list(store)[imp.n].snap;
      return `<div class="imp-found" role="status">
          <p class="imp-fname" translate="no">${FILE_ICON}${esc(f.name)}${m.steel ? `<span class="imp-steel"${NT}>${esc(t('impSteel'))}</span>` : ''}</p>
          <div class="imp-hud"><span class="save-masks">${masks}</span>${vessels ? `<span class="save-vessels">${vessels}</span>` : ''}</div>
          <div class="imp-nail"><img src="${D.art('nails', s.st.nail)}" alt="" width="80" height="360"><span${NT}>${esc(pick(D.NAILS[s.st.nail]))}</span></div>
          <p class="imp-meta">${metaBits}${ver}</p>
          <p class="save-facts imp-facts">${facts}</p>
          ${pantheons}
          ${full ? `<p class="imp-warn">${esc(t('impReplace', { n: imp.n }))}</p>` : ''}
          ${f.handle ? syncOpt() : ''}
          <div class="imp-actions">
            <button type="button" class="btn btn-primary" data-act="importDo">${esc(t('impTitle', { n: imp.n }))}</button>
            <button type="button" class="text-btn" data-act="importPick">${esc(t('impOther'))}</button>
          </div>
        </div>`;
    }
    if (imp.state === 'error') {
      return `<div class="imp-still">
          <img class="imp-figure is-shade" src="${D.art('knight', 'shade')}" alt="" width="145" height="174">
          <p class="imp-err" role="alert">${esc(t('saveImportBad'))}</p>
          ${choose('impOther', true)}
        </div>`;
    }
    return `<div class="imp-still">
        <img class="imp-figure" src="${D.art('knight', 'knight')}" alt="" width="240" height="328">
        <p class="imp-drop-title">${esc(t(imp.state === 'reading' ? 'impReading' : 'impDrop'))}</p>
        <p class="imp-drop-drag" aria-hidden="true">${esc(t('impDropping'))}</p>
        ${imp.state === 'reading' ? '' : `<p class="imp-or">${esc(t('impOr'))}</p>${choose('impChoose', true)}`}
      </div>`;
  }
  /* Following the game, as a row of the game's options menu: what it is, and its value
     (Activado / Desactivado) on one of the site's buttons, so that it reads as something to
     press, with the rule's diamond lit or hollow for the state. A press switches it. */
  const syncOpt = () => `<div class="imp-sync">
      <span class="imp-sync-k" id="imp-sync-k">${esc(t('impSync'))}</span>
      <button type="button" class="btn imp-sync-v" role="switch" aria-checked="${imp.sync}" aria-labelledby="imp-sync-k"
        data-act="importSync"><span class="imp-sync-dot" aria-hidden="true"></span><span class="imp-sync-t">${esc(t(imp.sync ? 'impSyncOn' : 'impSyncOff'))}</span></button>
      <p class="imp-sync-note">${esc(t('impSyncNote'))}</p>
    </div>`;
  const drop = () => `<div class="imp-drop" data-state="${imp.state}">
      <div class="imp-light" aria-hidden="true"></div>
      <div class="imp-drop-in">${dropInner()}</div>
      <p class="imp-private">${esc(t('impPrivate'))}</p>
    </div>`;
  // Only the drop zone changes with the file: the steps (and where you were in them) stay put.
  function paintDrop() {
    const z = el.saves.querySelector('.imp-drop');
    if (!z) { render(); return; }
    z.dataset.state = imp.state;
    z.querySelector('.imp-drop-in').innerHTML = dropInner();
  }

  function importView() {
    const fresh = imp.fresh;
    imp.fresh = false;
    return `<div class="saves-body imp${fresh ? ' is-fresh' : ''}">${brackets}
      <div class="imp-bar"><button type="button" class="imp-back" data-act="importClose">${BACK}${esc(t('savesTitle'))}</button></div>
      ${screenHead(esc(t('impTitle', { n: imp.n })), `<p class="saves-note">${esc(t('impLead'))}</p>`)}
      ${isMobile() ? `<p class="imp-mobile">${esc(t('impMobile'))}</p>` : ''}
      <div class="imp-grid">${steps()}${drop()}</div>
    </div>`;
  }

  function renderSaves() {
    if (prefs.view !== 'saves') { imp.n = 0; return; }
    if (imp.n) { el.saves.innerHTML = importView(); return; }
    const [free, ...slots] = store ? S.list(store) : [{ n: S.FREE, active: true, snap: {} }];
    el.saves.innerHTML = `<div class="saves-body">${brackets}
      ${screenHead(esc(t('savesTitle')), `<p class="saves-note">${esc(t('savesNote'))}</p>`)}
      <div class="saves-lists">
        <ul class="saves-list is-free">${card(free)}</ul>
        ${slots.length ? `<ol class="saves-list">${slots.map(card).join('')}</ol>` : ''}
      </div>
    </div>`;
    // After the render that's under way (the screen is still hidden until it ends), before anything is painted.
    if (landing) { const h = landing; landing = null; queueMicrotask(() => land(h)); }
  }

  /* Back from the reload after clearing the game you were in. The page is still veiled: the row
     keeps the height it had and the page is scrolled so that it's where it was when you cleared
     it (whatever changed above it: free mode now says you're in it). Once the fonts are in (they
     move things) it's put back once more and the veil lifts; then the row shrinks to New Game's. */
  function land(h) {
    const li = el.saves.querySelector(`.save[data-slot="${h.n}"]`);
    if (!li) { unveil(); return; }
    const from = Number(h.from) || 0, to = li.offsetHeight, shrinks = from > 0 && from !== to;
    if (shrinks) { li.style.height = from + 'px'; li.style.overflow = 'hidden'; }
    const at = () => { if (Number.isFinite(h.top)) window.scrollBy({ top: li.getBoundingClientRect().top - h.top, behavior: 'instant' }); };
    at();
    let fonts = Promise.resolve();
    try { if (document.fonts) fonts = document.fonts.ready; } catch (e) { /* no wait */ }
    Promise.race([fonts, new Promise((ok) => setTimeout(ok, 800))]).then(() => {
      at();
      unveil();
      if (shrinks) setTimeout(() => shrink(li, to), 400);
    });
  }

  /* Entering another game reloads the page, like the game's own loading screen: every screen
     reads its keys again from scratch, and nothing of the game you leave (an undo, the fight
     in progress, the Journal's page) is left over in the one you enter. It lands on Charms
     (or on Saves, after clearing the game you were in), with no build in the link so the
     slot's one is read. */
  function enter(view = 'charms', swap = null) {
    prefs.view = view;
    savePrefs();
    const hash = [prefs.lang !== PAGE_LANG ? 'lang=' + prefs.lang : '', view !== 'charms' ? 'view=' + view : '']
      .filter(Boolean).map((x, i) => (i ? '&' : '#') + x).join('');
    try { history.replaceState(null, '', here(hash)); } catch (e) { location.hash = hash; }
    if (!swap) { location.reload(); return; }
    // In place: the game swapped under the veil, and the veil lifts once it's painted.
    swap();
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('is-leaving')));
  }

  /* Into the game without reloading the page, after an import that follows the file: the read
     permission the picker has just given lasts as long as this page, and after a reload the
     browser would ask for it again (the paused notice). So what the boot reads per game
     (js/app-boot.js) is read again here. */
  function enterHere() {
    imp.n = 0;
    stopLive();
    App.run = App.loadRun();
    App.runSheet = null;
    const pinned = App.load(App.KEY.baseline);
    App.baseline = pinned ? C.decode(pinned) : null;
    if (prefs.compare === 'pinned' && !App.baseline) { prefs.compare = 'base'; savePrefs(); }
    App.loadMarks();
    App.loadDoor();
    App.loadJournal();
    App.loadOwned();
    App.loadProgress();
    App.state = App.withFixed(App.loadState());
    App.persist();
    App.recompute();
    App.fightReset();
    scrollTo(0, 0);
    App.go('charms', true);
    liveStart();
  }

  /* Going into a game, seen: a full slot's nail catches the light and its masks glow; an empty
     one (New Game) shows the base Knight's masks appearing one by one, as a new game's HUD does.
     Then the page fades to black and reloads (enter), and the next one fades in. Without motion, at once. */
  function leave(n, swap = null) {
    let still = false;
    try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { still = false; }
    if (still) { enter('charms', swap); return; }
    if (!swap) try { sessionStorage.setItem(ENTERED_KEY, '1'); } catch (e) { /* it comes in without fading */ }
    const li = n ? el.saves.querySelector(`.save[data-slot="${n}"]`) : null;
    let wait = 0;
    if (li && li.classList.contains('is-empty')) {
      const base = D.HEALTH.baseMasks;
      const masks = Array.from({ length: base }, (_, i) => `<img src="${D.art('hud', 'mask')}" alt="" style="--i:${i}">`).join('');
      li.querySelector('.save-main').insertAdjacentHTML('beforeend', `<span class="save-hud save-born" aria-hidden="true"><span class="save-masks">${masks}</span></span>`);
      li.classList.add('is-starting');
      wait = base * 70 + 550;
    } else if (li) {
      li.classList.add('is-loading');
      wait = 350;
    }
    if (li) li.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      document.documentElement.classList.add('is-leaving');
      setTimeout(() => enter('charms', swap), 250);
    }, wait);
  }

  Object.assign(actions, {
    savePick(node) {
      const n = Number(node.dataset.value);
      if (!store) { toast(t('savesNoStorage')); return; }
      if (S.read(store).active === n) { App.go('charms', true); return; }
      if (S.select(store, n)) leave(n);
    },
    saveNew(node) { actions.savePick(node); },
    saveImport(node) {
      if (!store) { toast(t('savesNoStorage')); return; }
      hintOff();   // whoever opens it has found it: the notice isn't needed any more
      Object.assign(imp, { n: Number(node.dataset.value), state: 'idle', file: null, fresh: true, copied: 0 });
      if (!imp.chosen) imp.os = detectOs();
      clearing = 0;
      render();
      // The view is taller than the list: if the sheet's top is out of sight, it's brought back.
      if (el.saves.getBoundingClientRect().top < 0) el.saves.scrollIntoView({ block: 'start' });
      focusIn('.screen-title');
    },
    // The notice's button: the four are empty, so it goes to the first.
    importHintGo() {
      App.go('saves');
      actions.saveImport({ dataset: { value: String(S.SLOT_IDS[0]) } });
      track('import-hint');
    },
    importHintOff() {
      hintOff();
      render();
      // The button is gone: focus goes to the screen's title, below where the notice was.
      const h = document.querySelector('.screens > section:not([hidden]) .screen-title');
      if (h) h.focus({ preventScroll: true });
    },
    importClose() {
      const n = imp.n;
      imp.n = 0;
      render();
      focusIn(`[data-act="saveImport"][data-value="${n}"]`);
    },
    importOs(node) {
      imp.os = node.dataset.value; imp.chosen = true; imp.copied = 0;
      render();
      focusIn(`[data-act="importOs"][data-value="${imp.os}"]`);
    },
    importCopy() { copyPath(); },
    /* With a handle where the browser gives one (the slot can then follow the file), with the
       hidden input where it doesn't. Cancelling the picker leaves things as they were. */
    async importPick() {
      if (!L.canLive()) { picker.value = ''; picker.click(); return; }
      let h;
      try { [h] = await pickSave(); } catch (e) {
        if (!e || e.name !== 'AbortError') { picker.value = ''; picker.click(); }
        return;
      }
      readHandle(h);
    },
    // Only the option changes: the rest of the preview (and its entrance) stays put.
    importSync(node) {
      imp.sync = !imp.sync;
      node.setAttribute('aria-checked', String(imp.sync));
      node.querySelector('.imp-sync-t').textContent = t(imp.sync ? 'impSyncOn' : 'impSyncOff');
    },
    async importDo() {
      const n = imp.n, f = imp.file;
      if (!f || !store) return;
      S.importTo(store, n, f.snap);
      track('save-import');
      // Linked, it's entered in place (enterHere); if not, the page reloads, and the link goes first.
      let linked = false;
      if (f.handle && imp.sync) {
        linked = await L.links.put(n, { handle: f.handle, name: f.name, stamp: f.stamp });
        if (linked) { live.links[n] = f.name; track('save-link'); }
      } else if (live.links[n] != null) { await L.links.drop(n); delete live.links[n]; }
      // It goes straight into the imported game, as picking the slot would.
      if (S.read(store).active !== n) S.select(store, n);
      leave(0, linked ? enterHere : null);
    },
    /* Following a slot that follows nothing: the file is picked, the slot takes it in at once (the
       game wins, as on every save after) and from then on it follows it. */
    async liveFollow(node) {
      const n = Number(node.dataset.value);
      if (!store) return;
      let h, file, r;
      try { [h] = await pickSave(); } catch (e) { return; }
      try { file = await h.getFile(); r = F.read(new Uint8Array(await file.arrayBuffer())); } catch (e) { r = null; }
      if (!r || !r.ok) { toast(t('saveImportBad')); return; }
      S.sync(store, n, F.toSnapshot(r.pd));
      if (!(await L.links.put(n, { handle: h, name: file.name, stamp: L.stampOf(file) }))) { toast(t('liveFollowNo')); return; }
      live.links[n] = file.name;
      track('save-link');
      if (n === activeSlot()) { stopLive(); App.reloadGame(); await liveStart(); } else render();
      toast(t('liveFollowing', { n, file: file.name }));
      focusIn(`.save[data-slot="${n}"] [data-act="liveUnlink"]`);
    },
    async liveUnlink(node) {
      const n = Number(node.dataset.value);
      await L.links.drop(n);
      delete live.links[n];
      if (n === live.n) stopLive();
      render();
      focusIn(`.save[data-slot="${n}"] .save-main`);
    },
    // The banner's button: a click, which is what the browser needs to ask for permission again.
    async liveResume() {
      if (!live.watcher) return;
      if (!(await live.watcher.resume())) toast(t('liveResumeNo'));
    },
    // The file is gone: the import view for the slot, to pick it again.
    liveRelink() {
      App.go('saves');
      actions.saveImport({ dataset: { value: String(live.n) } });
    },
    saveClear(node) { clearing = Number(node.dataset.value); render(); focusIn('[data-act="saveClearNo"]'); },
    saveClearNo(node) { const n = clearing; clearing = 0; render(); focusIn(`[data-act="saveClear"][data-value="${n || node.dataset.value}"]`); },
    saveClearYes(node) {
      const n = Number(node.dataset.value);
      clearing = 0;
      if (!store || !S.list(store)[n].snap) { render(); return; }
      shatter(n, () => {
        const wasActive = S.read(store).active === n;
        if (!S.clear(store, n)) { render(); return; }
        // A cleared slot follows no file.
        if (live.links[n] != null) { L.links.drop(n); delete live.links[n]; if (n === live.n) stopLive(); }
        justCleared = n;
        const was = el.saves.querySelector(`.save[data-slot="${n}"]`);
        const from = was ? was.offsetHeight : 0;
        /* Clearing the game you're in drops you into free mode: the page reloads, but stays here,
           with the row where it was (land). The browser doesn't restore the scroll on its own:
           it would do it late, over a page whose rows have changed. */
        if (wasActive) {
          try {
            sessionStorage.setItem(CLEARED_KEY, JSON.stringify({ n, from, top: was ? was.getBoundingClientRect().top : null }));
            history.scrollRestoration = 'manual';
          } catch (e) { /* it comes in without fading, and wherever the browser puts it */ }
          // The page fades to black first (css/app.css, html.is-leaving), and then reloads.
          document.documentElement.classList.add('is-leaving');
          setTimeout(() => enter('saves'), 250);
          return;
        }
        render();
        settle(n, from);
        focusIn(`[data-act="saveNew"][data-value="${n}"]`);
        setTimeout(() => { justCleared = 0; }, 1000);
      });
    },
  });
  /* Clearing, seen: the masks break one by one from the right, as health is lost on the HUD,
     and the rest of the slot fades away as dust rising, the main menu's motes. Only then is
     it cleared, and New Game fades in its place (css/app.css, .save.is-clearing). Without
     motion, it's cleared at once. */
  function shatter(n, done) {
    const li = el.saves.querySelector(`.save[data-slot="${n}"]`);
    let still = false;
    try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { still = false; }
    if (!li || still) { done(); return; }
    const masks = li.querySelectorAll('.save-masks img').length;
    li.style.setProperty('--masks', masks);
    const dust = Array.from({ length: 18 }, () => {
      const r = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
      return `<i style="--x:${r(4, 96)}%;--y:${r(15, 85)}%;--dx:${r(-24, 24)}px;--s:${r(2, 4)}px;--d:${r(0.35, 0.8)}s;--o:${r(0.4, 0.9)}"></i>`;
    }).join('');
    li.insertAdjacentHTML('beforeend', `<span class="save-dust" aria-hidden="true">${dust}</span>`);
    li.classList.add('is-clearing');
    li.setAttribute('aria-busy', 'true');
    // The masks, 70 ms apart, then the slot's fade (150 ms later, 700 ms long; css/app.css).
    setTimeout(done, masks * 70 + 900);
  }

  /* The emptied slot is shorter than the full one: rather than the list jumping up, the row
     shrinks from the height it had to its own. */
  function settle(n, from) {
    const li = el.saves.querySelector(`.save[data-slot="${n}"]`);
    if (!li || !from) return;
    const to = li.offsetHeight;
    if (to === from) return;
    li.style.height = from + 'px';
    li.style.overflow = 'hidden';
    shrink(li, to);
  }
  // From the height the row is held at down to its own.
  function shrink(li, to) {
    void li.offsetHeight;
    li.style.transition = 'height var(--dur-slow) var(--ease)';
    li.style.height = to + 'px';
    const end = () => { li.style.height = li.style.overflow = li.style.transition = ''; };
    li.addEventListener('transitionend', end, { once: true });
    setTimeout(end, 600);
  }

  /* The file picker lives outside the screen (which is redrawn whole) and is opened from the click
     itself, as browsers require. The file is read in the browser: it isn't sent anywhere. */
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.dat,.json';
  picker.hidden = true;
  document.body.appendChild(picker);
  picker.addEventListener('change', () => { if (picker.files && picker.files[0]) readFile(picker.files[0]); });

  /* A file from a handle (the picker or a drop, where the browser gives one): read the same, and
     the handle goes with it so that the slot can stay linked. */
  async function readHandle(h) {
    if (!imp.n || !h || h.kind !== 'file') return;
    let file;
    try { file = await h.getFile(); } catch (e) { imp.state = 'error'; imp.file = null; paintDrop(); return; }
    readFile(file, h);
  }
  function readFile(file, handle = null) {
    if (!imp.n) return;
    imp.state = 'reading'; imp.file = null; imp.sync = true;
    paintDrop();
    const reader = new FileReader();
    reader.onload = () => {
      const r = F.read(new Uint8Array(reader.result));
      if (!r.ok) { imp.state = 'error'; paintDrop(); return; }
      imp.file = { name: file.name, snap: F.toSnapshot(r.pd), meta: { ...F.meta(r.pd), mods: r.mods }, handle, stamp: L.stampOf(file) };
      imp.state = 'ready';
      paintDrop();
      focusIn('[data-act="importDo"]');
    };
    reader.onerror = () => { imp.state = 'error'; paintDrop(); };
    reader.readAsArrayBuffer(file);
  }

  /* Dragging a file anywhere over the import view lights the zone up, and letting go anywhere
     there reads it (not only on the zone: the browser would open the file in the tab instead).
     dragenter and dragleave come for every child crossed, hence the count. */
  let dragDepth = 0;
  const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  const setDrag = (on) => { const z = el.saves.querySelector('.imp-drop'); if (z) z.classList.toggle('is-drag', on); };
  el.saves.addEventListener('dragenter', (e) => { if (!imp.n || !hasFiles(e)) return; e.preventDefault(); dragDepth++; setDrag(true); });
  el.saves.addEventListener('dragover', (e) => { if (!imp.n || !hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  el.saves.addEventListener('dragleave', () => { if (!imp.n) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) setDrag(false); });
  el.saves.addEventListener('drop', (e) => {
    if (!imp.n || !hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0; setDrag(false);
    // The handle has to be asked for now, during the event: afterwards the items are gone.
    const item = e.dataTransfer.items && e.dataTransfer.items[0];
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (L.canLive() && item && item.getAsFileSystemHandle) {
      item.getAsFileSystemHandle().then(readHandle, () => { if (file) readFile(file); });
      return;
    }
    if (file) readFile(file);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imp.n && prefs.view === 'saves') actions.importClose();
  });

  /* Copy the folder. The clipboard API where there is one; if not (or it's refused), selecting
     the text and the old copy command. The button says it's done for a moment. */
  function copyPath() {
    const text = SYSTEMS[imp.os].dir;
    const done = () => {
      imp.copied++;
      const k = imp.copied, b = el.saves.querySelector('.imp-copy');
      if (b) { b.textContent = t('impCopied'); b.classList.add('is-done'); }
      setTimeout(() => {
        if (imp.copied !== k) return;
        imp.copied = 0;
        const x = el.saves.querySelector('.imp-copy');
        if (x) { x.textContent = t('impCopy'); x.classList.remove('is-done'); }
      }, 2000);
    };
    const fallback = () => {
      const code = el.saves.querySelector('.imp-path code');
      try {
        const range = document.createRange(); range.selectNodeContents(code);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        if (document.execCommand('copy')) done();
      } catch (e) { /* the text stays selected: it can be copied by hand */ }
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }
  const focusIn = (sel) => { const b = el.saves.querySelector(sel); if (b) b.focus(); };

  // The slot you're playing, or 0 (S.FREE) in free mode.
  const activeSlot = () => (store ? S.read(store).active : S.FREE);

  /* ── Following the game ───────────────────────────────────────────────
     Only the slot you're in watches its file; another linked one catches up on entering it
     (entering reloads the page, and this runs again). When the game saves, the slot takes the
     file in (the game wins over what was changed here since) and every screen repaints. The
     stamp is kept with the link, so that a reload doesn't take in again a file already taken
     in, over what you've changed since. */
  const parseSave = (bytes) => { const r = F.read(bytes); return r.ok ? r.pd : null; };
  function stopLive() {
    if (live.watcher) live.watcher.stop();
    Object.assign(live, { n: 0, name: '', state: '', watcher: null });
  }
  async function liveStart() {
    if (!store || !L.canLive()) return;
    live.links = await L.links.all();
    live.ready = true;
    const n = activeSlot();
    const rec = n !== S.FREE ? await L.links.get(n) : null;
    if (!rec || !rec.handle) { if (prefs.view === 'saves') render(); return; }
    let stamp = rec.stamp || null;
    Object.assign(live, { n, name: rec.name || rec.handle.name, state: '' });
    live.watcher = L.watch({
      source: L.fileSource(rec.handle, parseSave),
      since: stamp,
      async onData(pd, next) {
        stamp = next;
        const changed = S.sync(store, n, F.toSnapshot(pd));
        await L.links.put(n, { ...rec, stamp });
        if (!changed || activeSlot() !== n) return;
        App.reloadGame();
        toast(t('liveUpdated'));
        track('save-sync');
      },
      onState(s) { live.state = s; render(); },
    });
  }
  /* The notice above the screen when the link needs you: paused (a click to go on) or the file gone.
     Nothing's wrong with the game, so it's drawn as the import notice's line, not as a warning box. */
  App.liveBanner = () => {
    if (live.state !== 'paused' && live.state !== 'lost') return '';
    const paused = live.state === 'paused';
    return `<div class="banner is-run is-hint" role="status">
      <span class="banner-tag">${esc(t('importHintTag'))}</span>
      <span class="banner-text">${esc(t(paused ? 'livePaused' : 'liveLost', { file: live.name }))}</span>
      <button type="button" class="btn btn-primary" data-act="${paused ? 'liveResume' : 'liveRelink'}">${esc(t(paused ? 'liveResume' : 'liveRelink'))}</button>
    </div>`;
  };
  /* Your shade, above the screen, as long as it waits (only a save says so: js/progress.js):
     where and with how much geo. The ✕ hides it until the shade is another one. */
  const shadeKey = (sh) => sh.scene + ':' + sh.geo;
  App.shadeBanner = () => {
    const sh = App.progress.shade;
    if (!sh || prefs.shadeOff === shadeKey(sh) || prefs.view === 'saves') return '';
    const area = R.areaOf(sh.scene);
    return `<div class="banner is-run is-hint">
      <span class="banner-tag">${esc(t('shadeTag'))}</span>
      <span class="banner-text">${esc(t('shadeBanner', { area: areaName(area) || '?', geo: num(sh.geo) }))}</span>
      <button type="button" class="banner-close" data-act="shadeOff" aria-label="${esc(t('shadeOff'))}" title="${esc(t('shadeOff'))}">${CLOSE}</button>
    </div>`;
  };
  actions.shadeOff = () => { if (App.progress.shade) { prefs.shadeOff = shadeKey(App.progress.shade); savePrefs(); render(); } };

  // The link of the save you're in, for the header: { state, name }, or null if it follows no file.
  App.liveInfo = () => (live.watcher && live.state ? { state: live.state, name: live.name } : null);
  Object.assign(App, { renderSaves, activeSlot, liveStart });
})();
