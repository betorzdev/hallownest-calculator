#!/usr/bin/env node
/* PreToolUse hook (Edit|Write|NotebookEdit): generated files aren't edited by hand.
   Reads the tool call as JSON on stdin; exits 2 with the command that regenerates the file,
   which Claude Code shows back to the model. Bash isn't guarded: the generators write these. */
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Path relative to the repo → how it's regenerated.
const FILES = {
  'js/journal.js': '`npm run journal`',
  'js/rooms.js': '`npm run rooms`',
  'js/collectibles.js': '`npm run collectibles`',
  'js/map-walk.js': '`npm run walk`',
  'js/map-fixes.js': "the Map's admin mode (`npm run admin`, then `#view=map&admin=1` and drag the pin)",
  'js/map.js': '`tools/extract-map.py` (needs the game installed)',
  'js/benches.js': '`tools/extract-benches.py` (needs the game installed)',
  'js/scene-objects.js': '`tools/extract-scenes.py` (needs the game installed)',
  'js/hornet-moves.js': '`tools/extract-hornet.py` (needs Silksong installed)',
  'sitemap.xml': '`npm run pages`',
};

// The other pages `npm run pages` writes from index.html (design/12-seo.md).
const PAGE_DIRS = ['es', 'map', 'achievements', 'godhome', 'hunters-journal', 'charm-calculator',
  'boss-damage-calculator', 'save-analyzer', '112-checklist'];

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let file;
  try {
    const call = JSON.parse(input);
    file = (call.tool_input && (call.tool_input.file_path || call.tool_input.notebook_path)) || '';
  } catch (e) {
    process.exit(0); // not ours to judge
  }
  const rel = path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');
  if (rel.startsWith('..')) process.exit(0);
  let how = FILES[rel];
  if (!how && PAGE_DIRS.includes(rel.split('/')[0])) how = '`npm run pages` (edit index.html or tools/pages-text.js instead)';
  if (!how) process.exit(0);
  process.stderr.write(rel + ' is generated and is never edited by hand: regenerate it with ' + how +
    '. Fix the source or the generator (CLAUDE.md, "Where the knowledge is").\n');
  process.exit(2);
});
