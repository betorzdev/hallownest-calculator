/* js/app-pantheons.js — Godhome's Pantheons tab: your game (each pantheon's state, the bindings
   it was finished with and the lifeblood door) and, from an open row's «Simulate», a look at the
   pantheon room by room, each fight tried on its own, with their actions. Shares HK.app with
   js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, F = HK.foes, PN = HK.pantheons, P = HK.progress;
  const App = HK.app;
  const { t, pick, KEY, NT, esc, load, save, prefs, savePrefs, bindAllFx, brackets,
    fight, runRooms, runRoom, runFight, foe, fightReset, fightEndHtml, fightSumHtml, wonNote, arenaHtml, render, navTo, actions } = App;

  /* Godhome's lifeblood door (js/pantheons.js): the bindings you've finished each pantheon
     with. Your real game, marked by hand. From here comes how many
     germs the cocoon at the pantheon's benches gives. */
  let door = PN.normalizeDoor(null);
  const loadDoor = () => {
    try { door = PN.normalizeDoor(JSON.parse(load(KEY.door) || 'null')); } catch (e) { door = PN.normalizeDoor(null); }
  };
  const saveDoor = () => save(KEY.door, !PN.doorEmpty(door) ? JSON.stringify(door) : null);

  /* ── Looking at a pantheon, room by room ──────────────────────────────
     Not a run: a way to see its fights and try them. The path of rooms, and the one you're in
     is fought at full health with the pantheon's bindings (Attuned, as the pantheons are), like a
     Hall statue; nothing carries from one room to the next. The rests and the Godseeker are
     only shown. Saved in hollow.run, so a reload stays in the room. */
  const BINDS = PN.BINDS;
  const saveRun = () => save(KEY.run, App.run ? JSON.stringify(App.run) : null);
  // Only { pantheon, room, bindings }: what an older run carried (health, rests, the log) is dropped.
  function loadRun() {
    try {
      const r = JSON.parse(load(KEY.run) || 'null');
      if (!r || !PN.PANTHEON_BY_ID[r.pantheon]) return null;
      const rooms = PN.PANTHEON_BY_ID[r.pantheon].rooms;
      const room = Number.isInteger(r.room) && r.room >= 0 && r.room < rooms.length ? r.room : 0;
      return { pantheon: r.pantheon, room, bindings: Object.fromEntries(BINDS.map((k) => [k, !!(r.bindings || {})[k]])) };
    } catch (e) { return null; }
  }

  function startRun(room = 0) {
    const bindings = { ...prefs.bindings };
    App.run = { pantheon: prefs.pantheon, room, bindings };
    App.runSheet = E.compute(App.state, prefs.lang, { bindings });
    enterRoom();
  }
  function enterRoom() {
    if (runFight()) fightReset();
    else { fight.over = false; fight.started = false; fight.log = []; }
    saveRun();
  }
  function leaveRun() { App.run = null; App.runSheet = null; saveRun(); fightReset(); }
  /* Being in a pantheon is a place: the browser's Back from it returns to your game, and Forward
     goes back in (at its first room; the rooms themselves aren't places). */
  App.navParts.pantheon = {
    get: () => (App.run ? App.run.pantheon : ''),
    set(v) {
      if (!v) { if (App.run) leaveRun(); return; }
      if (PN.PANTHEON_BY_ID[v] && (!App.run || App.run.pantheon !== v)) { prefs.pantheon = v; startRun(); }
    },
  };
  function goRoom(i) {
    if (!App.run || i < 0 || i >= runRooms().length) return;
    App.run.room = i;
    enterRoom();
  }

  /* ── Your game ─────────────────────────────────────────────────────────
     The tab opens here: one row per pantheon with what the game keeps of it (bossDoorStateTier<n>,
     js/savefile.js): completed (the 112%'s, js/progress.js), the bindings it was finished with, all
     four at once (gold). Completed is marked by hand on Progress, or by marking a binding. Locked: the save's
     door (unlocked) when there is one, else the rules (PN.lockOf). A row opens on its rooms, with the
     bosses still to beat in the kingdom dimmed, and the bindings and Simulate, which enters the run. */
  const isDone = (id) => P.has(App.progress, 'pantheon-' + id) || !!door.done[id];
  const doneIds = () => PN.PANTHEONS.map((p) => p.id).filter(isDone);
  // → null when open, else { bosses, pantheons, voidHeart } (maybe all empty: the save says shut, no rule says why).
  function lockOfRow(id) {
    if (isDone(id)) return null;
    const why = PN.lockOf(id, { completed: doneIds(), statues: App.progress.statues, voidHeart: App.isOwned('voidheart') });
    if (door.unlocked) return door.unlocked.includes(id) ? null : (why || { godhome: false, bosses: [], pantheons: [], voidHeart: false });
    return why;
  }
  const foeName = (id) => pick(F.FOE_BY_ID[id].name);
  // What's missing, on the row: up to three bosses by name, more as a count (the open row names them).
  const lockLine = (w) => [...(w.godhome ? [t('navGodhome')] : []), ...w.pantheons.map((id) => pick(PN.PANTHEON_BY_ID[id].name)),
    ...(w.voidHeart ? [pick(D.CHARM_BY_ID.voidheart)] : []),
    ...(w.bosses.length > 3 ? [t('runBosses', { n: w.bosses.length })] : w.bosses.map(foeName))].join(', ');

  function trackerHtml(head) {
    const held = !!App.saveLock();
    const dis = held ? 'disabled' : '';
    const n = PN.doorNotches(door), germs = PN.cocoonOf(door), done = doneIds();
    const sum = `<div class="pt-sum">
        <div class="pt-stat"><b>${done.length}/${PN.PANTHEONS.length}</b><span>${esc(t('fightTabPantheon'))}</span></div>
        <div class="pt-stat"><b>${n}/${PN.DOOR_NOTCHES}</b><span>${esc(t('bindingsLabel'))}</span></div>
        <div class="pt-stat"><span class="door-seeds">${germs ? '<img src="assets/hud/mask-lb.png" alt="">'.repeat(germs) : '<b>0</b>'}</span><span>${esc(t('ptCocoon'))}</span></div>
      </div>`;
    const cols = `<div class="pl-row pl-head" aria-hidden="true"><span>${esc(t('pantheonPick'))}</span>
        ${BINDS.map((k) => `<span><img src="assets/pantheon/bind-${k}.png" alt="" title="${esc(t('bind_' + k))}" width="18" height="18"></span>`).join('')}
        <span>×4</span></div>`;
    const rows = PN.PANTHEONS.map((p) => {
      const id = p.id, name = pick(p.name), lastFoe = F.FOE_BY_ID[p.rooms[p.rooms.length - 1].foe];
      const got = door.done[id] || [], all = door.all.includes(id);
      const fin = isDone(id), lock = lockOfRow(id), open = prefs.pantheonOpen === id;
      const state = fin ? 'done' : lock ? 'locked' : 'ready';
      const stateTxt = t(fin ? 'runWon' : lock ? 'ptLocked' : 'ptOpen') + (lock && lockLine(lock) ? ' · ' + t('ptNeeds', { list: lockLine(lock) }) : '');
      // Just marked (doorFx): the binding lights up; the four at once, one after another in gold.
      const fx = doorFx && doorFx.pid === id ? doorFx : null;
      const cell = (k, i) => `<button type="button" class="pl-cell pl-bind ${got.includes(k) ? 'is-on' : ''}${fx && !fx.all && fx.k === k && got.includes(k) ? ' is-lit' : ''}${App.darkCls(`assets/pantheon/bind-${k}.png`)}" style="--i:${i}" data-act="doorBind" data-value="${id}:${k}"
          aria-pressed="${got.includes(k)}" title="${esc(t('bind_' + k))}" ${dis}><img src="assets/pantheon/bind-${k}.png" alt="${esc(t('bind_' + k))}" width="26" height="26"></button>`;
      const row = `<div class="pl-row is-${state}${all ? ' is-all' : ''}${fx && fx.all ? ' is-sealing' : ''}${open ? ' is-expanded' : ''}" role="group" aria-label="${esc(name)}">
          <button type="button" class="pl-open-btn" data-act="pantheonOpen" data-value="${id}" aria-expanded="${open}">
            <img class="pl-art" src="${D.art('enemies', lastFoe.id)}" alt="" loading="lazy">
            <span class="pl-name"><b${NT}>${esc(name)}</b><span class="pl-state">${esc(stateTxt)}</span></span>
          </button>
          ${BINDS.map(cell).join('')}
          <button type="button" class="pl-cell pl-x4 ${all ? 'is-on' : ''}" data-act="doorBind" data-value="${id}:all" aria-pressed="${all}" title="${esc(t('doorAllTip'))}" ${dis}>×4</button>
        </div>`;
      return open ? row + openHtml(p, lock) : row;
    }).join('');
    return `<div class="fight-body">${brackets}${head}
      <div class="block-head">${esc(t('pgmG_mine'))}<span class="quick-hint">${esc(t(held ? 'ptHeld' : 'ptHint'))}</span></div>
      ${sum}
      <div class="pl">${cols}${rows}</div>
      <div class="block-head">${esc(t('cocoonLabel'))}</div>
      ${doorHtml()}
    </div>`;
  }

  /* An open row: its rooms (the bosses not beaten in the kingdom dimmed; a tap enters the simulator
     straight into that room) and, small at its foot because it's secondary, the bindings to go in with
     and, to their right, Simulate, which enters it. */
  function openHtml(p, lock) {
    const miss = new Set(lock ? lock.bosses : []);
    const path = pathHtml(p.rooms, (i, text) => ({ state: p.rooms[i].type === 'fight' && miss.has(p.rooms[i].foe) ? 'is-locked' : 'is-preview',
      act: 'runStartAt', title: t('runStartAtTip', { room: text }) }), ' is-preview');
    const binds = BINDS.map((k) => {
      const on = !!prefs.bindings[k];
      return `<button type="button" class="bind ${on ? 'is-on' : ''}" data-act="bindToggle" data-value="${k}" aria-pressed="${on}" title="${esc(t('bindNote_' + k))}">
        <img class="bind-art" src="assets/pantheon/bind-${k}.png" alt="" width="40" height="40">
        <span class="bind-name">${esc(t('bind_' + k))}</span>
      </button>`;
    }).join('');
    return `<div class="pl-open">${path}
        <div class="pl-open-foot">
          <div class="pl-sim">
            <div class="binds pl-binds ${BINDS.every((k) => prefs.bindings[k]) ? 'is-all' : ''}" role="group" aria-label="${esc(t('bindingsLabel'))}">${binds}</div>
            <button type="button" class="btn" data-act="runStart" data-value="${p.id}">${esc(t('ptSimulate'))}</button>
          </div>
          <span class="pl-state">${esc(roomsLine(p.rooms))}${miss.size ? ' · ' + esc(t('ptNotBeaten', { list: [...miss].map(foeName).join(', ') })) : ''}</span>
        </div>
      </div>`;
  }

  function renderPantheon(head) {
    if (!App.run) return trackerHtml(head);
    return `<div class="fight-body">${brackets}${head}${runHeadHtml()}${timelineHtml()}${roomHtml()}</div>`;
  }

  let doorFx = null;                // { pid, k, all } only on the repaint after marking the door (doorBind)
  /* The lifeblood door (design/38, A): one track of its 20 notches, lit in lifeblood blue by your
     completed bindings, and over the 8th, 12th and 16th the lifeblood masks each bench's cocoon
     gives from there, lit once reached; n/20 at the end. No sentences: what it means is in the
     title, and the state, said, in the aria-label. */
  function doorHtml() {
    const n = PN.doorNotches(door), max = PN.DOOR_NOTCHES, germs = PN.cocoonOf(door);
    const line = PN.doorOpen(door) ? t('doorOpenLine', { n, max })
      : t(PN.DOOR_OPEN - n === 1 ? 'doorShutOne' : 'doorShut', { n, max, left: PN.DOOR_OPEN - n });
    const said = line + (germs ? ' ' + t('doorSeeds', { n: germs }) : '');
    const mask = '<img src="assets/hud/mask-lb.png" alt="">';
    // Each step over its notch: the grid's column for that notch.
    const steps = PN.DOOR_STEPS.map(([at, seeds]) => `<span class="door-step${n >= at ? ' is-on' : ''}" style="grid-column:${at}">${mask.repeat(seeds)}</span>`).join('');
    const dots = Array.from({ length: max }, (_, i) => `<i class="dn${i < n ? ' is-lit' : ''}${PN.DOOR_STEPS.some(([at]) => at === i + 1) ? ' is-major' : ''}" style="grid-column:${i + 1}"></i>`).join('');
    return `<div class="door" role="img" aria-label="${esc(said)}" title="${esc(t('doorHelp'))}">
        <div class="door-track">${steps}${dots}</div>
        <span class="door-n"><b>${n}</b>/${max}</span>
      </div>`;
  }

  /* The bosses are the fight rooms: a room with two of the same (Hallownest's two Vengefly
     Kings) is one boss fight, as the game counts the statues. */
  const bossCount = (rooms) => rooms.filter((r) => r.type === 'fight').length;
  const roomsLine = (rooms) => t('runRooms', { n: rooms.length }) + ' · ' + t('runBosses', { n: bossCount(rooms) });

  function runHeadHtml() {
    const p = PN.PANTHEON_BY_ID[App.run.pantheon];
    const binds = BINDS.filter((k) => App.run.bindings[k]);
    return `<div class="run-head">
      <h3${NT}>${esc(pick(p.name))}</h3>
      <span class="run-stats">
        <span class="run-stat">${esc(t('runRoom', { n: App.run.room + 1, total: p.rooms.length }))}</span>
      </span>
      ${binds.length ? `<span class="run-binds ${binds.length === BINDS.length ? 'is-all' : ''}">${binds.map((k) => `<img src="assets/pantheon/bind-${k}.png" alt="${esc(t('bind_' + k))}" title="${esc(t('bind_' + k))}" width="24" height="24">`).join('')}</span>` : ''}
      <button type="button" class="btn" data-act="runExit">${esc(t('runExit'))}</button>
    </div>`;
  }

  /* The rooms as a path through Godhome: round medallions threaded on a gold line, with the
     benches (and the Godseeker's rooms) as larger marks on it that cut it into stretches, as the
     pantheon is played bench to bench. The final boss goes last, larger, in its doorway of light.
     Used when looking at a pantheon (the room you're in marked, a tap goes to another) and on an
     open row of your game (every room lit, and a tap enters the pantheon there).
     room(i) returns { state, act, title } for each room. */
  function roomLabel(r, i) {
    let img, name;
    if (r.type === 'fight') {
      const f = F.FOE_BY_ID[r.foe];
      img = D.art('enemies', f.id);
      name = pick(f.name) + (r.count ? ' ×' + r.count : '');
    } else if (r.type === 'rest') {
      img = 'assets/pantheon/bench.png'; name = t('restTitle');
    } else {
      img = 'assets/pantheon/godseeker.png'; name = t('godseeker') + (r.who ? ' (' + pick(r.who) + ')' : '');
    }
    return { img, text: (i + 1) + '. ' + name + (r.note ? ' · ' + pick(r.note) : '') };
  }
  function pathHtml(rooms, room, cls = '') {
    const last = rooms.length - 1;
    const tiles = rooms.map((r, i) => {
      const { img, text } = roomLabel(r, i);
      const o = room(i, text);
      // Where you are: the Knight over the room, like his pin on the game's map.
      const you = o.state === 'is-current' ? `<img class="tl-you" src="${D.art('hud', 'knight')}" alt="">` : '';
      const inner = `${you}<span class="tl-medal"><img class="tl-art" src="${img}" alt="" loading="lazy"></span>
        <span class="tl-n">${i + 1}</span>
        ${r.count ? `<span class="tl-count">×${r.count}</span>` : ''}
        <span class="sr-only">${esc(o.sr || text)}</span>`;
      return `<li class="tl tl-${r.type} ${o.state}${i === last ? ' is-final' : ''}" ${o.state === 'is-current' ? 'aria-current="step"' : ''}>
        <span class="tl-thread" aria-hidden="true"></span>
        ${o.act
          ? `<button type="button" class="tl-go" data-act="${o.act}" data-value="${i}" title="${esc(o.title)}">${inner}</button>`
          : `<span class="tl-go" title="${esc(text)}">${inner}</span>`}
      </li>`;
    }).join('');
    return `<ol class="timeline${cls}" aria-label="${esc(t('runTimeline'))}">${tiles}</ol>`;
  }

  // The room you're in, marked; any other is a tap away.
  function timelineHtml() {
    return pathHtml(runRooms(), (i, text) => (i === App.run.room
      ? { state: 'is-current', act: '', title: text }
      : { state: 'is-preview', act: 'runJump', title: t('runJumpTo', { room: text }) }));
  }

  /* The room: a fight is the arena, and once won it offers the next room; a rest or the
     Godseeker is only shown, with the way on. */
  function roomHtml() {
    const r = runRoom(), last = App.run.room + 1 >= runRooms().length;
    const nextBtn = last ? '' : `<button type="button" class="btn btn-primary" data-act="runNext">${esc(t(r.type === 'fight' ? 'runNext' : 'restGo'))}</button>`;
    if (r.type !== 'fight') {
      const rest = r.type === 'rest';
      const name = rest ? t('restTitle') : t('godseeker') + (r.who ? ' · ' + pick(r.who) : '');
      return `<div class="pt-room">
          <img class="pt-room-art" src="assets/pantheon/${rest ? 'bench' : 'godseeker'}.png" alt="" loading="lazy">
          <span class="pt-room-name">${esc(name)}</span>
          ${nextBtn}
        </div>`;
    }
    const next = fight.over && nextBtn
      ? fightEndHtml({ won: true, cls: 'room-done', title: t('runWonRoom'), note: wonNote(foe()), sum: fightSumHtml(), acts: nextBtn })
      : '';
    return `${r.note ? `<p class="foecard-note is-warn">${esc(pick(r.note))}</p>` : ''}${arenaHtml(next)}`;
  }

  // What writes your game's record: refused in a save from the game (App.saveLock, js/app.js).
  App.edits('doorBind');
  // A binding is only won finishing it: marking one marks it completed too.
  const markDone = (pid) => {
    if (!P.has(App.progress, 'pantheon-' + pid)) { App.progress = P.toggle(App.progress, 'pantheon-' + pid, true); App.saveProgress(); }
  };
  Object.assign(actions, {
    bindToggle(node) {
      const k = node.dataset.value;
      prefs.bindings[k] = !prefs.bindings[k];
      savePrefs(); render();
      if (prefs.bindings[k] && BINDS.every((x) => prefs.bindings[x])) bindAllFx();
    },
    // Your game: the bindings you finished each pantheon with.
    doorBind(node) {
      const [pid, k] = node.dataset.value.split(':');
      const wasAll = door.all.includes(pid);
      door = k === 'all' ? PN.toggleAll(door, pid) : PN.toggleBind(door, pid, k);
      doorFx = { pid, k, all: !wasAll && door.all.includes(pid) };
      if (door.done[pid]) markDone(pid);
      saveDoor(); render();
      doorFx = null;
    },
    pantheonOpen(node) {
      const pid = node.dataset.value;
      prefs.pantheonOpen = prefs.pantheonOpen === pid ? '' : pid;
      if (prefs.pantheonOpen) prefs.pantheon = pid;   // the one Simulate and its rooms enter
      savePrefs(); render();
    },
    runStart(node) {
      if (node.dataset.value && PN.PANTHEON_BY_ID[node.dataset.value]) { prefs.pantheon = node.dataset.value; savePrefs(); }
      startRun(); App.track('pantheon-run', { pantheon: prefs.pantheon }); render(); navTo(false);
    },
    // From an open row's rooms: enter the pantheon in that room.
    runStartAt(node) { startRun(Number(node.dataset.value) || 0); App.track('pantheon-run', { pantheon: prefs.pantheon }); render(); navTo(false); },
    runExit() { leaveRun(); render(); navTo(true); },
    runNext() { goRoom(App.run.room + 1); render(); },
    runJump(node) { goRoom(Number(node.dataset.value)); render(); },
  });

  Object.assign(App, { loadDoor, saveRun, loadRun, renderPantheon });
})();
