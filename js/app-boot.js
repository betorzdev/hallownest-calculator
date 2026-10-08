/* js/app-boot.js — startup, once every screen's script is loaded: preferences, what's
   saved, the link's language and screen, and the first render. Shares HK.app with js/app.js
   (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const C = HK.codec, I = HK.i18n;
  const App = HK.app;
  const { t, KEY, PAGE_LANG, PAGE_VIEW, load, rebuildNF, prefs, loadPrefs, splitHash, loadState, persist, recompute,
    charmLock, touchesCharms, loadMarks, loadDoor, loadRun, render, toast, loadOwned, withFixed, loadJournal, safely } = App;

  /* ── Startup ─────────────────────────────────────────────────────────── */
  // What's saved comes back part by part (safely(), js/app.js): one that fails to load doesn't
  // stop the page, which starts without it.
  loadPrefs();
  safely('run', () => { App.run = loadRun(); });   // a half-done pantheon survives a page reload
  safely('marks', loadMarks);               // and the Hall of Gods marks, anything
  safely('door', loadDoor);                 // and the lifeblood door's completed bindings
  safely('journal', loadJournal);           // and your game's Hunter's Journal
  safely('owned', loadOwned);               // and the charms you have
  safely('progress', App.loadProgress);     // and the rest of what your game has (js/progress.js)
  safely('account', App.loadAccount);       // and your account's achievements (Steam's file, or by hand)
  // The link's language; without one, the Spanish page speaks Spanish (and that counts as choosing it).
  const fromUrl = splitHash(location.hash).lang || (PAGE_LANG === 'en' ? null : PAGE_LANG);
  // The screen: the link's; without it, the page's own (a search landed you on the map, say:
  // tools/pages.js), a link with a build opens Charms, and with no link, wherever you left it.
  const urlHash = splitHash(location.hash);
  prefs.view = urlHash.view || PAGE_VIEW || (C.isEmpty(urlHash.build) ? prefs.view : 'charms');
  // A page opened on one of its screen's tabs (the achievements' page, on Progress) opens there.
  if (App.PAGE_TAB && !urlHash.view && prefs.view === PAGE_VIEW) prefs.pgShow = App.PAGE_TAB;
  App.admin = urlHash.admin;   // #…&admin=1: the Map's pins can be dragged to where they go (js/app-map.js)
  App.sisterPreview = urlHash.sister;   // #…&sister=1: the sister site's link before it's published (js/app-sister.js)
  // Godhome is Combat's tabs 'hall' and 'pantheon' shown as their own screen: the tab follows the screen.
  if ((prefs.view === 'godhome') !== (prefs.fightTab !== 'combat')) prefs.fightTab = prefs.view === 'godhome' ? (prefs.godTab === 'pantheon' ? 'pantheon' : 'hall') : 'combat';
  I.setLang(fromUrl || prefs.lang);
  prefs.lang = I.current;
  if (fromUrl) prefs.langChosen = true;   // a link with a language counts as choosing it
  rebuildNF();
  App.state = withFixed(loadState());
  // A link's build doesn't go into a save (App.saveLock): the save's rules, and it's said when the
  // link's is another one (a reload carries the save's own build in the URL).
  if (!C.isEmpty(urlHash.build) && App.saveLock() && !C.equal(withFixed(C.decode(urlHash.build)), App.state)) toast(t('saveLockUrl'));
  // The same when opening a link with a half-done pantheon: the saved charms rule.
  const storedBuild = load(KEY.build);
  if (charmLock() && storedBuild) {
    const kept = C.decode(storedBuild);
    if (touchesCharms(kept)) { App.state = C.normalize({ ...App.state, charms: kept.charms, notches: kept.notches }); toast(t('runLockUrl')); }
  }
  const storedBaseline = load(KEY.baseline);
  if (storedBaseline) App.baseline = C.decode(storedBaseline);
  if (prefs.compare === 'pinned' && !App.baseline) prefs.compare = 'base';
  persist();
  recompute();           // and with it fightSync(), which hands out combat health and soul
  render();
  safely('knight', App.knight.start);   // the Knight on the page, from now on (js/app-knight.js)
  safely('sister', App.sister.start);   // and Hornet on the sister site's link, when it shows (js/app-sister.js)
  safely('live', App.liveStart);        // the slot linked to the game's file starts following it (js/app-saves.js)
})();
