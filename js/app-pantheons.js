/* js/app-pantheons.js — Combat's Pantheons tab: the lifeblood door, the run room by room
   with its bindings, the benches and the end, with their actions. Shares HK.app with
   js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, C = HK.codec, F = HK.foes, PN = HK.pantheons;
  const App = HK.app;
  const { t, pick, KEY, NT, esc, load, save, prefs, savePrefs, bindAllFx, brackets, pageCharms,
    renderLoadout, renderQuickCharms, fight, runRooms, runRoom, runFight, foe, fightReset, knightSide,
    fightEndHtml, fightSumHtml, wonNote, logHtml, arenaHtml, render, go, screenOf, toast, actions } = App;

  /* Godhome's lifeblood door (js/pantheons.js): the bindings you've finished each pantheon
     with. Your real game, marked by hand. From here comes how many
     germs the cocoon at the pantheon's benches gives. */
  let door = PN.normalizeDoor(null);
  const loadDoor = () => {
    try { door = PN.normalizeDoor(JSON.parse(load(KEY.door) || 'null')); } catch (e) { door = PN.normalizeDoor(null); }
  };
  const saveDoor = () => save(KEY.door, PN.doorNotches(door) ? JSON.stringify(door) : null);

  /* ── Pantheons ─────────────────────────────────────────────────────────
     A real run: health, lifeblood and soul carry from one room to the next, and the rests
     are the only thing that heals. At each rest you decide what to do and in what order,
     because the order matters: the bench wipes the Cocoon's lifeblood (and restores the
     Cocoon), so breaking it before sitting down wastes it.
     What's known about each rest comes from the wiki: the hot springs give 40 soul per
     second and refill the masks; the bench restores all health and the charms' lifeblood,
     wipes the cocoon's, puts the cocoon back and lets you change charms; the cocoon releases
     3, 4 or 5 lifeblood germs depending on the bindings completed (8, 12, 16).
     The bench doesn't restore soul. */
  const BINDS = PN.BINDS;
  const COCOONS = [0, ...PN.DOOR_STEPS.map(([, n]) => n).reverse()];   // what the cocoon can give
  const freshRest = () => ({ sat: false, cocoonTaken: false });
  const saveRun = () => save(KEY.run, App.run ? JSON.stringify(App.run) : null);
  /* Sitting on the bench: all health and the charms' lifeblood (Joni's Blessing's apart),
     Baldur Shell repaired and Grubberfly's Elegy back on under Joni's Blessing. The bench
     doesn't restore soul. */
  function runRefill() {
    const s = App.runSheet.stats, joni = App.runSheet.joniLifeblood || 0;
    App.run.masks = s['health.masks'].value; App.run.lbJoni = joni; App.run.lbCharm = s['health.lifeblood'].value - joni;
    App.run.shell = s['health.baldurBlocks'].value || 0; App.run.elegyHalted = false;
  }
  // The build changes and the caps drop: whatever's over is trimmed.
  function runClamp() {
    const s = App.runSheet.stats, joni = App.runSheet.joniLifeblood || 0;
    App.run.masks = Math.min(App.run.masks, s['health.masks'].value); App.run.lbJoni = Math.min(App.run.lbJoni || 0, joni);
    App.run.lbCharm = Math.min(App.run.lbCharm, s['health.lifeblood'].value - joni);
    App.run.shell = Math.min(App.run.shell || 0, s['health.baldurBlocks'].value || 0);
  }
  // What you take from the fight to the next room.
  function runCarry() {
    App.run.masks = fight.masks; App.run.lbJoni = fight.lbJoni; App.run.lbCharm = fight.lbCharm; App.run.lbCocoon = fight.lbCocoon;
    App.run.soul = fight.soul; App.run.shell = fight.shell; App.run.elegyHalted = fight.elegyHalted;
  }
  const runLog = (msg) => { App.run.log.unshift(msg); if (App.run.log.length > 9) App.run.log.pop(); };

  function loadRun() {
    try {
      const r = JSON.parse(load(KEY.run) || 'null');
      if (!r || !PN.PANTHEON_BY_ID[r.pantheon]) return null;
      const rooms = PN.PANTHEON_BY_ID[r.pantheon].rooms;
      if (!Number.isInteger(r.room) || r.room < 0 || r.room > rooms.length) return null;
      r.build = C.normalize(r.build || {});
      r.bindings = Object.fromEntries(BINDS.map((k) => [k, !!(r.bindings || {})[k]]));
      if (!COCOONS.includes(r.cocoon)) r.cocoon = 0;
      for (const k of ['masks', 'lbJoni', 'lbCharm', 'lbCocoon', 'soul', 'shell']) r[k] = Math.max(0, Number(r[k]) || 0);
      r.elegyHalted = !!r.elegyHalted;
      r.rest = { ...freshRest(), ...(r.rest || {}) };
      r.log = Array.isArray(r.log) ? r.log.slice(0, 9) : [];
      if (!['won', 'dead'].includes(r.over)) r.over = null;
      // The rooms really cleared. A run saved before skipping was possible didn't
      // carry them: back then they were all the rooms before the current one.
      r.cleared = Array.isArray(r.cleared)
        ? [...new Set(r.cleared.filter((i) => Number.isInteger(i) && i >= 0 && i < rooms.length))]
        : Array.from({ length: Math.min(r.room, rooms.length) }, (_, i) => i);
      return r;
    } catch (e) { return null; }
  }

  /* On entering a pantheon the masks fill and the cocoon's lifeblood is lost
     (wiki, "Pantheons"). The build is frozen with health topped up. */
  function startRun() {
    const bindings = { ...prefs.bindings };
    const build = C.normalize({ ...App.state, hp: 0 });
    App.runSheet = E.compute(build, prefs.lang, { bindings });
    const s = App.runSheet.stats;
    App.run = { pantheon: prefs.pantheon, bindings, cocoon: PN.cocoonOf(door), build, room: 0, over: null,
            masks: s['health.masks'].value, lbJoni: App.runSheet.joniLifeblood || 0,
            lbCharm: s['health.lifeblood'].value - (App.runSheet.joniLifeblood || 0), lbCocoon: 0,
            shell: s['health.baldurBlocks'].value || 0, elegyHalted: false,
            soul: Math.min(s['soul.main'].value, s['soul.total'].value), rest: freshRest(), log: [],
            cleared: [] };
    runLog(t('logEnter', { name: pick(PN.PANTHEON_BY_ID[App.run.pantheon].name) }));
    enterRoom();
  }

  function enterRoom() {
    App.run.rest = freshRest();
    if (runFight()) fightReset();
    else { fight.over = false; fight.started = false; fight.log = []; }
    saveRun();
  }

  function runNext() {
    if (runFight()) {
      if (!fight.over) return;
      runCarry();
    }
    if (!App.run.cleared.includes(App.run.room)) App.run.cleared.push(App.run.room);
    App.run.room += 1;
    if (App.run.room >= runRooms().length) { App.run.over = 'won'; App.endFresh = true; saveRun(); return; }
    enterRoom();
  }

  /* Go straight to a room by tapping its tile. You take whatever you have at that moment
     —also halfway through a fight, which is abandoned—, and what you skip does NOT count as
     cleared: the timeline marks it apart and the ending says how many rooms you skipped. */
  function runJump(i) {
    if (!App.run || App.run.over || i === App.run.room || i < 0 || i >= runRooms().length) return;
    if (runFight()) runCarry();
    runLog(t('logJump', { from: App.run.room + 1, to: i + 1 }));
    App.run.room = i;
    enterRoom();
  }

  function renderPantheon(head) {
    if (!App.run) return pantheonPickHtml(head);
    return `<div class="fight-body">${brackets}${head}${runHeadHtml()}${timelineHtml()}${App.run.over ? runEndHtml() : roomHtml()}</div>`;
  }

  let doorFx = null;                // { pid, k, all } only on the repaint after marking the door (doorBind)
  function pantheonPickHtml(head) {
    const cards = PN.PANTHEONS.map((p) => {
      const lastFoe = F.FOE_BY_ID[p.rooms[p.rooms.length - 1].foe];
      const on = prefs.pantheon === p.id;
      // Below, the bindings you've finished it with in your game: the door's notches.
      const boundDone = door.done[p.id] || [], allDone = door.all.includes(p.id), pantheonName = pick(p.name);
      // Just marked (doorFx): the binding lights up; the four at once, one after another in gold.
      const fx = doorFx && doorFx.pid === p.id ? doorFx : null;
      const bindBtns = `<div class="pdone ${allDone ? 'is-all' : ''}${fx && fx.all ? ' is-sealing' : ''}" role="group" aria-label="${esc(t('doorDoneLbl', { name: pantheonName }))}">
        ${BINDS.map((k, i) => `<button type="button" class="pdone-bind ${boundDone.includes(k) ? 'is-on' : ''}${fx && !fx.all && fx.k === k && boundDone.includes(k) ? ' is-lit' : ''}" style="--i:${i}" data-act="doorBind" data-value="${p.id}:${k}"
          aria-pressed="${boundDone.includes(k)}" title="${esc(t('bind_' + k))}"><img src="assets/pantheon/bind-${k}.png" alt="${esc(t('bind_' + k))}" width="22" height="22"></button>`).join('')}
        <button type="button" class="pdone-all ${allDone ? 'is-on' : ''}" data-act="doorBind" data-value="${p.id}:all" aria-pressed="${allDone}"
          title="${esc(t('doorAllTip'))}" aria-label="${esc(t('doorAllTip'))}">×4</button>
      </div>`;
      return `<div class="pcard-wrap${fx && fx.all ? ' is-sealed' : ''}"><button type="button" class="pcard ${on ? 'is-on' : ''}" data-act="pantheonPick" data-value="${p.id}" aria-pressed="${on}">
        <img class="pcard-art" src="${D.art('enemies', lastFoe.id)}" alt="" loading="lazy">
        <span class="pcard-body">
          <span class="pcard-name"${NT}>${esc(pick(p.name))}</span>
          <span class="pcard-motto">${esc(pick(p.motto))}</span>
          <span class="pcard-meta">${esc(roomsLine(p.rooms))} · ${esc(pick(lastFoe.name))}</span>
        </span>
      </button>${bindBtns}</div>`;
    }).join('');
    const binds = BINDS.map((k) => {
      const on = !!prefs.bindings[k];
      return `<button type="button" class="bind ${on ? 'is-on' : ''}" data-act="bindToggle" data-value="${k}" aria-pressed="${on}">
        <img class="bind-art" src="assets/pantheon/bind-${k}.png" alt="" width="40" height="40">
        <span class="bind-name">${esc(t('bind_' + k))}</span>
        <span class="bind-note">${esc(t('bindNote_' + k))}</span>
      </button>`;
    }).join('');
    // What you're about to enter, right under the choices that make it: the pantheon, its rooms and
    // the bindings on, with Enter beside it. The door and its cocoon come after: they're information.
    const chosen = PN.PANTHEON_BY_ID[prefs.pantheon] || PN.PANTHEONS[0];
    const onBinds = BINDS.filter((k) => prefs.bindings[k]).map((k) => t('bind_' + k));
    const summary = `<div class="run-go">
        <p class="run-sum"><b${NT}>${esc(pick(chosen.name))}</b><span>${esc(roomsLine(chosen.rooms))}</span>
          <span>${esc(onBinds.length ? t('bindingsLabel') + ': ' + onBinds.join(', ') : t('runSumNone'))}</span></p>
        <button type="button" class="btn btn-primary" data-act="runStart">${esc(t('runEnter'))}</button>
      </div>`;
    return `<div class="fight-body">${brackets}${head}
      <div class="block-head">${esc(t('pantheonPick'))}<span class="quick-hint">${esc(t('doorDoneHint'))}</span></div>
      <div class="pcards">${cards}</div>
      <div class="block-head">${esc(t('bindingsLabel'))}</div>
      <div class="binds ${BINDS.every((k) => prefs.bindings[k]) ? 'is-all' : ''}">${binds}</div>
      ${summary}
      ${previewHtml(chosen)}
      <div class="block-head">${esc(t('cocoonLabel'))}</div>
      ${doorHtml()}
    </div>`;
  }

  /* The lifeblood door, as in Godhome: its 20 notches (the 8, 12 and 16 ones larger), lit
     in blue according to your completed bindings; with 8, open, and the benches' cocoon
     with its lifeblood masks. */
  function doorHtml() {
    const n = PN.doorNotches(door), isOpen = PN.doorOpen(door), germs = PN.cocoonOf(door), nextStep = PN.nextStep(n);
    const majorNotches = PN.DOOR_STEPS.map(([at]) => at);
    const doorNotches = Array.from({ length: PN.DOOR_NOTCHES }, (_, i) =>
      `<i class="dn ${i < n ? 'is-lit' : ''} ${majorNotches.includes(i + 1) ? 'is-major' : ''}"></i>`).join('');
    const doorLine = isOpen ? t('doorOpenLine', { n, max: PN.DOOR_NOTCHES })
      : t(PN.DOOR_OPEN - n === 1 ? 'doorShutOne' : 'doorShut', { n, max: PN.DOOR_NOTCHES, left: PN.DOOR_OPEN - n });
    const cocoonHtml = germs ? `<div class="door-cocoon">
        <img class="door-cocoon-art" src="assets/pantheon/rest-cocoon.png" alt="" width="560" height="315">
        <div class="door-cocoon-body">
          <span class="door-seeds" aria-hidden="true">${'<img src="assets/hud/mask-lb.png" alt="">'.repeat(germs)}</span>
          <p>${esc(t('doorSeeds', { n: germs }))}${nextStep ? ' ' + esc(t('doorNext', { at: nextStep.at, n: nextStep.seeds })) : ''}</p>
        </div>
      </div>` : '';
    return `<div class="door">
        <div class="door-notches" role="img" aria-label="${esc(doorLine)}">${doorNotches}</div>
        <p class="door-state">${esc(doorLine)}</p>
        ${cocoonHtml}
        <p class="foecard-note">${esc(t('doorHelp'))}</p>
      </div>`;
  }

  /* The bosses are the fight rooms: a room with two of the same (Hallownest's two Vengefly
     Kings) is one boss fight, as the game counts the statues. Left: the fights still ahead,
     the current one included until it's won; the ones skipped behind you don't count. */
  const bossCount = (rooms) => rooms.filter((r) => r.type === 'fight').length;
  const bossesLeft = (rooms) => rooms.filter((r, i) => r.type === 'fight' && i >= App.run.room
    && !App.run.cleared.includes(i) && !(i === App.run.room && fight.over)).length;
  const roomsLine = (rooms) => t('runRooms', { n: rooms.length }) + ' · ' + t('runBosses', { n: bossCount(rooms) });

  function runHeadHtml() {
    const p = PN.PANTHEON_BY_ID[App.run.pantheon];
    const binds = BINDS.filter((k) => App.run.bindings[k]);
    return `<div class="run-head">
      <h3${NT}>${esc(pick(p.name))}</h3>
      <span class="run-stats">
        <span class="run-stat">${esc(t('runRoom', { n: Math.min(App.run.room + 1, p.rooms.length), total: p.rooms.length }))}</span>
        <span class="run-stat">${esc(t('runBossesLeft', { n: bossesLeft(p.rooms), total: bossCount(p.rooms) }))}</span>
      </span>
      ${binds.length ? `<span class="run-binds ${binds.length === BINDS.length ? 'is-all' : ''}">${binds.map((k) => `<img src="assets/pantheon/bind-${k}.png" alt="${esc(t('bind_' + k))}" title="${esc(t('bind_' + k))}" width="24" height="24">`).join('')}</span>` : ''}
      <button type="button" class="btn${App.run.over ? '' : ' is-danger'}" data-act="runQuit">${esc(App.run.over ? t('runExit') : t('runQuit'))}</button>
    </div>`;
  }

  /* The rooms as a path through Godhome: round medallions threaded on a gold line, with the
     benches (and the Godseeker's rooms) as larger marks on it that cut it into stretches, as the
     pantheon is played bench to bench. The final boss goes last, larger, in its doorway of light.
     Used inside a run (the timeline: each room's state, and a tap jumps to it) and on the picker
     (a preview of the chosen pantheon: every room lit, and a tap enters the pantheon there).
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
  const TL_TICK = '<svg class="tl-tick" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 5.2 L4.6 8.2 L10.5 1.8"/></svg>';
  function pathHtml(rooms, room, cls = '') {
    const last = rooms.length - 1;
    const tiles = rooms.map((r, i) => {
      const { img, text } = roomLabel(r, i);
      const o = room(i, text);
      // Where you are: the Knight over the room, like his pin on the game's map.
      const you = o.state === 'is-current' ? `<img class="tl-you" src="${D.art('hud', 'knight')}" alt="">` : '';
      const inner = `${you}<span class="tl-medal"><img class="tl-art" src="${img}" alt="" loading="lazy">${o.state === 'is-done' ? TL_TICK : ''}</span>
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

  function timelineHtml() {
    const clearedSet = new Set(App.run.cleared);
    const path = pathHtml(runRooms(), (i, text) => {
      const isCurrent = i === App.run.room && !App.run.over;
      // The current room wins over cleared: jumping back to a room you've beaten still marks it.
      const state = isCurrent ? 'is-current'
        : clearedSet.has(i) ? 'is-done'
        : i === App.run.room && App.run.over === 'dead' ? 'is-fail'
        : i < App.run.room || App.run.over === 'won' ? 'is-skipped' : 'is-todo';
      const sr = text + (state === 'is-skipped' ? ' · ' + t('runSkippedMark') : '');
      // You can go to any room except the one you're in, and only with the run alive.
      const jumpable = !App.run.over && !isCurrent;
      return { state, sr, act: jumpable ? 'runJump' : '', title: t('runJumpTo', { room: sr }) };
    });
    return path;
  }

  // On the picker: the chosen pantheon's rooms, all lit; a tap enters it at that room.
  function previewHtml(p) {
    return `<div class="run-path">
        <div class="block-head">${esc(t('runPathTitle'))}<span class="quick-hint">${esc(t('runPathHint'))}</span></div>
        ${pathHtml(p.rooms, (i, text) => ({ state: 'is-preview', act: 'runStartAt', title: t('runStartAtTip', { room: text }) }), ' is-preview')}
      </div>`;
  }

  function roomHtml() {
    const r = runRoom();
    if (r.type === 'rest') return restHtml();
    if (r.type === 'godseeker') return godseekerHtml(r);
    const next = fight.over
      ? fightEndHtml({ won: true, cls: 'room-done', title: t('runWonRoom'), note: wonNote(foe()), sum: fightSumHtml(),
          acts: `<button type="button" class="btn btn-primary" data-act="runNext">${esc(App.run.room + 1 >= runRooms().length ? t('runFinish') : t('runNext'))}</button>` })
      : '';
    return `${r.note ? `<p class="foecard-note is-warn">${esc(pick(r.note))}</p>` : ''}${arenaHtml(next)}`;
  }

  /* The rest: one card per station, with its corner of the room (crops of the wiki's
     screenshots) and what it would give you NOW, with the HUD icons. That way you can see
     without reading that the bench gives no soul, or that sitting down with cocoon lifeblood
     takes it away. The whole card is its action's button, because you decide the order. */
  function restHtml() {
    const rs = App.run.rest, s = App.runSheet.stats;
    const sprite = { mask: 'mask', lb: 'mask-lb', soul: 'soul' };
    const fx = (k, n, unit, loss) => `<span class="rs-fx${loss ? ' is-loss' : ''}">
        <span class="rs-ico is-${k}"><img src="${D.art('hud', sprite[k])}" alt=""></span><b>${loss ? '−' : '+'}${n}</b> ${esc(unit)}</span>`;
    const note = (text) => `<span class="rs-fx is-note">${esc(text)}</span>`;
    const station = (id, art, name, effects, rule, why) => `<button type="button" class="rest-station" data-act="${id}" ${why ? 'disabled' : ''}>
        <span class="rs-art"><img src="assets/pantheon/rest-${art}.png" alt="" width="560" height="315"></span>
        <span class="rs-body">
          <span class="rs-name">${esc(name)}</span>
          <span class="rs-fxs">${why ? note(why) : effects.filter(Boolean).join('') || note(t('restFull'))}</span>
          ${why ? '' : `<span class="rs-rule">${esc(rule)}</span>`}
        </span></button>`;
    const dMasks = s['health.masks'].value - App.run.masks;
    const dSoul = s['soul.total'].value - App.run.soul;
    const dLb = s['health.lifeblood'].value - App.run.lbCharm;
    const masks = dMasks > 0 && fx('mask', dMasks, t(dMasks === 1 ? 'maskUnitOne' : 'maskUnit'));
    const cocoonWhy = !App.run.cocoon ? t('restCocoonNone') : rs.cocoonTaken ? t('restCocoonTaken') : '';
    // The bench's grid is the page's: the same selection, the same action. A
    // charm equipped here shows as equipped on the sheet and in combat. Only the
    // Charms binding locks it, because then the pantheon doesn't let you wear any.
    const locked = App.run.bindings.charms ? t('restCharmsBound') : '';
    const ctx = { ...pageCharms(), locked,
      hint: locked || t('restCharmsHint', { screen: t('navCharms') }) };
    return `<div class="arena">
      <div class="side-knight">${knightSide(App.runSheet, App.run, false, 'run')}</div>
      <div class="side-foes rest-room">
        <div class="foes-head"><h3>${esc(t('restTitle'))}</h3><span class="foes-total">${esc(t('restHelp'))}</span></div>
        <div class="rest-stations">
          ${station('restBath', 'spring', t('restBath'),
            [masks, dSoul > 0 && fx('soul', dSoul, t('restUnitSoul'))], t('restBathNote'))}
          ${station('restSit', 'bench', t('restSit'),
            [masks, dLb > 0 && fx('lb', dLb, t('lifebloodLower')),
             App.run.lbCocoon > 0 && fx('lb', App.run.lbCocoon, t('restUnitCocoon'), true),
             App.run.cocoon && rs.cocoonTaken && note(t('restRespawn'))], t('restSitNote'))}
          ${station('restCocoon', 'cocoon', t('restCocoon'),
            [fx('lb', App.run.cocoon, t('lifebloodLower'))], t('restCocoonNote'), cocoonWhy)}
        </div>
        <div class="run-go"><button type="button" class="btn btn-primary" data-act="runNext">${esc(t('restGo'))}</button></div>
      </div>
    </div>
    <div class="sep-wrap loadout-wrap rest-charms">${renderLoadout(ctx)}${renderQuickCharms(ctx)}</div>
    ${logHtml(App.run.log)}`;
  }

  function godseekerHtml(r) {
    return `<div class="arena">
      <div class="side-knight">${knightSide(App.runSheet, App.run, false, 'run')}</div>
      <div class="side-foes">
        <div class="foecard"><div class="foecard-head">
          <img class="foecard-art" src="assets/pantheon/godseeker.png" alt="" loading="lazy">
          <span class="foecard-body"><span class="foecard-name">${esc(t('godseeker'))}${r.who ? ' · ' + esc(pick(r.who)) : ''}</span>
            <span class="foecard-note">${esc(t('godseekerNote'))}</span></span>
        </div></div>
        <div class="run-go"><button type="button" class="btn btn-primary" data-act="runNext">${esc(t('restGo'))}</button></div>
      </div>
    </div>
    ${logHtml(App.run.log)}`;
  }

  function runEndHtml() {
    const rooms = runRooms();
    const won = App.run.over === 'won';
    const r = rooms[App.run.room];
    const who = r && r.type === 'fight' ? pick(F.FOE_BY_ID[r.foe].name) : '';
    const pantheonName = pick(PN.PANTHEON_BY_ID[App.run.pantheon].name);
    // Finishing by skipping rooms isn't completing it: it says how many.
    const skipped = rooms.length - new Set(App.run.cleared).size;
    const acts = `<button type="button" class="btn btn-primary" data-act="runAgain">${esc(t('runAgain'))}</button>
        <button type="button" class="btn" data-act="runQuit">${esc(t('runExit'))}</button>`;
    const ending = !won
      ? { title: t('fightDead'), note: t('runDied', { n: App.run.room + 1, total: rooms.length, foe: who }) }
      : skipped ? { title: t('runWonSkipped'), note: t('runSkippedNote', { name: pantheonName, n: skipped }) }
      : { title: t('runWon'), note: pantheonName };
    return `${fightEndHtml({ won, cls: 'run-end', acts, ...ending })}
    ${fight.log.length ? logHtml(fight.log) : ''}`;
  }

  Object.assign(actions, {
    pantheonPick(node) { prefs.pantheon = node.dataset.value; savePrefs(); render(); },
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
      saveDoor(); render();
      doorFx = null;
    },
    runStart() { startRun(); render(); },
    /* From the picker's path: enter and go straight to that room. What's before it counts as
       skipped, as when jumping inside a run. */
    runStartAt(node) {
      const i = Number(node.dataset.value);
      startRun();
      if (i > 0) runJump(i);
      render();
    },
    runAgain() {
      // Same pantheon and same bindings as the attempt that just ended.
      prefs.pantheon = App.run.pantheon; prefs.bindings = { ...App.run.bindings };
      savePrefs(); startRun(); render();
    },
    runLockGo() {
      App.pickerOpen = false;
      // Combat is only rebuilt when switching tabs: if you were already in the room, the
      // half-done fight stays as it was.
      if (prefs.fightTab !== 'pantheon') { prefs.fightTab = 'pantheon'; fightReset(); }
      savePrefs();
      go('fight', true);
    },
    runQuit(node) {
      const name = App.run ? pick(PN.PANTHEON_BY_ID[App.run.pantheon].name) : '';
      const fromBanner = !!node.closest('#banner');
      App.run = null; App.runSheet = null; saveRun(); fightReset(); render();
      // From the notice, the button goes away with it: it says what happened and focus moves to the screen's title.
      if (fromBanner) {
        toast(t('runQuitDone', { name }));
        const h = screenOf(prefs.view).querySelector('.screen-title');
        if (h) h.focus({ preventScroll: true });
      }
    },
    runNext() { runNext(); render(); },
    runJump(node) { runJump(Number(node.dataset.value)); render(); },
    restBath() {
      const s = App.runSheet.stats;
      App.run.soul = s['soul.total'].value;
      App.run.masks = s['health.masks'].value;
      runLog(t('logBath', { soul: App.run.soul, masks: App.run.masks }));
      saveRun(); render();
    },
    restSit() {
      const lostCocoon = App.run.lbCocoon;
      runRefill();
      App.run.lbCocoon = 0;
      App.run.rest.sat = true;
      App.run.rest.cocoonTaken = false;      // the bench puts the cocoon back
      runLog(lostCocoon ? t('logSitLost', { n: lostCocoon }) : t('logSit'));
      saveRun(); render();
    },
    restCocoon() {
      if (!App.run.cocoon || App.run.rest.cocoonTaken) return;
      App.run.lbCocoon += App.run.cocoon;
      App.run.rest.cocoonTaken = true;
      runLog(t('logCocoon', { n: App.run.cocoon }));
      saveRun(); render();
    },
  });

  Object.assign(App, { loadDoor, saveRun, runRefill, runClamp, loadRun, renderPantheon });
})();
