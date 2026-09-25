/* js/app-boot.js — startup, once every screen's script is loaded: preferences, what's
   saved, the link's language and screen, and the first render. Shares HK.app with js/app.js
   (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const C = HK.codec, I = HK.i18n;
  const App = HK.app;
  const { t, KEY, PAGE_LANG, load, rebuildNF, prefs, loadPrefs, splitHash, loadState, persist, recompute,
    charmLock, touchesCharms, loadMarks, loadDoor, loadRun, render, toast, loadOwned, withFixed, loadJournal } = App;

  /* ── Startup ─────────────────────────────────────────────────────────── */
  loadPrefs();
  App.run = loadRun();     // a half-done pantheon survives a page reload
  loadMarks();             // and the Hall of Gods marks, anything
  loadDoor();              // and the lifeblood door's completed bindings
  loadJournal();           // and your game's Hunter's Journal
  loadOwned();             // and the charms you have
  // The link's language; without one, the Spanish page speaks Spanish (and that counts as choosing it).
  const fromUrl = splitHash(location.hash).lang || (PAGE_LANG === 'en' ? null : PAGE_LANG);
  // The screen: the link's; without it, a link with a build opens Charms, and with no link, wherever you left it.
  const urlHash = splitHash(location.hash);
  prefs.view = urlHash.view || (C.isEmpty(urlHash.build) ? prefs.view : 'charms');
  I.setLang(fromUrl || prefs.lang);
  prefs.lang = I.current;
  if (fromUrl) prefs.langChosen = true;   // a link with a language counts as choosing it
  rebuildNF();
  App.state = withFixed(loadState());
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
  App.liveStart();       // the slot linked to the game's file starts following it (js/app-saves.js)
})();
