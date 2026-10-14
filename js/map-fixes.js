/* js/map-fixes.js — WRITTEN by the Map's admin mode (#…&admin=1 on the Map, saved by `npm run admin`,
   tools/admin.js): don't edit by hand. Where a pin really goes when the data's place is off: a
   thing's id (as js/app-map.js's allThings names it) → [x, y] in the map's own units (js/map.js's
   frame, y upwards). js/app-map.js applies them last of all, over whatever the data and its
   formulas say. Keys sorted, one per line, three decimals (a pin is 0.5 units across). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const FIXES = {
  };
  HK.mapFixes = { FIXES };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.mapFixes;
})();
