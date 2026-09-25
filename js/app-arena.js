/* js/app-arena.js — Combat: the simulator (the fight, the Knight's moves and the enemy's,
   the log and its explanations), the combat Hunter's Journal to pick an enemy and the arena
   that paints both sides. The Hall of Gods and the Pantheons fight here. Shares HK.app with
   js/app.js (see there). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, F = HK.foes, PN = HK.pantheons, J = HK.journal, HG = HK.hall, FT = HK.fight;
  const App = HK.app;
  const { t, pick, el, hoverable, SPELL_KEYS, ART_KEYS, ART_STAT, POSITIONAL, NT, esc, pctSpace, spellArt,
    prefs, savePrefs, brackets, chevron, rule, hudHtml, render, toast, actions } = App;

  /* ── Combat simulator ──────────────────────────────────────────────────
     An exchange of blows by hand: you decide the order. Each button applies its number
     and writes it to the log, so what you see is arithmetic, not an animation. The
     Knight's damage comes from the sheet (js/engine.js) and therefore from your build;
     the enemy's health, phases and attacks, from js/enemies.js.

     An enemy is NOT a health bar. Some bosses are several at once (the three Mantis
     Lords, the three Sisters of Battle, Oro and Mato), some chain phases with their own
     health (False Knight alternates armour and maggot seven times) and some summon
     minions with health of their own. So the combat state is phases with parts, not a
     number:

       fight.parts     the bars alive NOW, from the current phase
       fight.queue     the ones waiting their turn (Watcher Knights: 6, never more than 2 standing)
       fight.minions   what it has summoned, killable and with its soul
       fight.target    who you're hitting, because with several bars you have to choose

     Godhome rules (kb/01-mechanics.md §1): Attuned and Ascended change health; Ascended
     also DOUBLES damage; on Radiant a single hit kills you. Being overcharmed multiplies
     the damage taken, and that already comes in health.damageMult.

     Health comes in three piles, because the Pantheons' rests treat them differently: the
     masks (Focus heals them), the charms' lifeblood (the bench restores it) and the
     Lifeblood Cocoon's (the bench wipes it). A hit takes lifeblood first —the cocoon's
     before the rest, since it's the one added on top— and then the masks. */
  const fight = { phase: 0, parts: [], queue: 0, minions: [], target: 'p0',
                  // Your side is handled by js/fight.js: four health piles, the shell, Carefree Melody,
                  // the heal window and the clock (design/04-charms-in-combat.md §3.3-3.4).
                  masks: 0, lbJoni: 0, lbCharm: 0, lbCocoon: 0, soul: 0,
                  shell: 0, melody: 0, focusing: false, healed: 0, elegyHalted: false,
                  clock: 0, sinceHit: 0, lostMask: false, sporeAt: 0, shieldAt: 0, acc: { kingsoul: 0, grimm: 0, womb: 0 },
                  // Which impacts of each spell land: { hw: { burst: 3 }, dd: { dive: 0, side: 'right' } }.
                  // Empty means "all", and it goes back to empty on reset or when the enemy changes.
                  spellSel: {},
                  dealt: 0, hits: 0, log: [], started: false, over: false, mark: '' };
  // The arena explanations that are open, by id ('spell:dd', 'focus', 'foe'…): see
  // helpBtn. They aren't saved (they're opened to read), but they survive each hit's repaint.
  const helpOpen = new Set();

  /* ── Standalone combat, Hall statue or pantheon room ───────────────────
     The same arena serves all three tabs. Combat is the fight out in the world, on
     Normal. In the Hall of Gods the statue sets the enemy and the difficulty, and you go
     in at full health, as in the game. In a pantheon room four things change: the room
     sets the enemy, the difficulty is Attuned, the build is the one you had on entry
     (frozen, with its bindings) and health and soul carry over from the previous
     room. */
  App.run = null;          // pantheon run in progress, or null
  App.runSheet = null;     // its frozen build's sheet, with the bindings applied
  const inRun = () => prefs.fightTab === 'pantheon' && !!App.run && !App.run.over;
  const runRooms = () => (App.run ? PN.PANTHEON_BY_ID[App.run.pantheon].rooms : []);
  const runRoom = () => (App.run ? runRooms()[App.run.room] || null : null);
  const runFight = () => inRun() && !!runRoom() && runRoom().type === 'fight';
  /* The combat sheet: the build's (with the bindings in a pantheon) computed with the fight's
     health (options.fight), which is what switches on Fury of the Fallen and Grubberfly's
     Elegy. The base one, without health, gives full health at the start and the caps. */
  let fightSheet = null;
  const baseSheet = () => (runFight() ? App.runSheet : App.sheet);
  const fs = () => fightSheet || baseSheet();
  function syncFightSheet() {
    fightSheet = App.sheet ? E.compute(fst(), prefs.lang, { bindings: runFight() ? App.run.bindings : null, fight: FT.health(fight) }) : null;
  }
  /* The pantheon build: nail, masks, vessels, spells and arts freeze on entry, as in the
     game; CHARMS don't, they're a single selection across the whole site —the sheet,
     combat and the benches—, and with them the notches, which decide what fits:
     otherwise the page and the pantheon could disagree on whether you're overcharmed.
     Whatever run.build stores for charms and notches is not used. */
  const runBuild = () => ({ ...App.run.build, charms: App.state.charms.slice(), notches: App.state.notches });
  const fst = () => (runFight() ? runBuild() : App.state);  // combat build

  /* While a pantheon lasts, charms can't be touched from ANYWHERE on the site —the grid,
     the equipped ones, the presets or a link— except at its benches: the
     game only lets you change them sitting on one, and here the benches are the rest
     rooms. The notches go with them, since they decide what fits. With the Charms
     binding, not even at the bench. It also holds from the Combat tab: the run is still
     half-done. Returns the reason, or '' if they can be changed. */
  function charmLock() {
    if (!App.run || App.run.over) return '';
    const name = pick(PN.PANTHEON_BY_ID[App.run.pantheon].name);
    if (App.run.bindings.charms) return t('runLockBound', { name });
    return runRoom() && runRoom().type === 'rest' ? '' : t('runLock', { name });
  }
  const touchesCharms = (next) => next.notches !== App.state.notches
    || next.charms.length !== App.state.charms.length || next.charms.some((id, i) => id !== App.state.charms[i]);
  const alive = () => FT.alive(fight);

  /* Fighting at a statue: with a difficulty chosen. Without one, the Hall shows. */
  const hallFight = () => prefs.fightTab === 'hall' && HG.DIFFS.includes(prefs.hallDiff) && !!HG.STATUE_BY_ID[prefs.hallId];

  const foe = () => (runFight() ? F.FOE_BY_ID[runRoom().foe]
    : prefs.fightTab === 'pantheon' ? null
    : prefs.fightTab === 'hall' ? (hallFight() ? F.FOE_BY_ID[prefs.hallId] : null)
    : F.FOE_BY_ID[prefs.foeId] || null);
  const foeName = (f) => pick(f.name);

  /* Health by difficulty and —for bosses that scale— your nail level. */
  function foeMaxHp(f, diff) {
    const raw = diff === 'base' ? f.hp : diff === 'at' ? f.at : f.asra;
    if (raw === null || raw === undefined) return null;
    return Array.isArray(raw) ? raw[Math.min(fst().nail, raw.length - 1)] : raw;
  }
  // All Pantheons are fought with Attuned health (Hallownest's too: what it
  // takes from Ascended is the arenas and the number of enemies, which go in the room).
  // Combat is always the fight out in the world; difficulty is the statues' business.
  const diffOf = () => (runFight() ? 'at' : hallFight() ? prefs.hallDiff : 'base');

  /* A standalone bar's health. Radiant shares health with Ascended. */
  function partHp(part, diff) {
    const raw = diff === 'base' ? part.hp : diff === 'at' ? part.at : part.asra;
    const v = raw === null || raw === undefined ? part.hp : raw;
    return Array.isArray(v) ? v[Math.min(fst().nail, v.length - 1)] : v;
  }

  // The phases as they come on the entry, with Godhome's own if it has them.
  const rawPhases = (f, d = diffOf()) =>
    (d === 'at' ? f.phasesAt : (d === 'asra' || d === 'radiant') ? f.phasesAsra : null) || f.phases;
  // The current phase's note, if it has one.
  const phaseNote = (f) => { const ph = (rawPhases(f) || [])[fight.phase]; return ph && ph.note ? pick(ph.note) : ''; };

  /* The phases of any entry, already resolved. An entry without `phases` is one phase
     with one bar: that way the render and the engine don't have two paths. A pantheon room
     can bring its own variation: `hp` (Hallownest's Brooding Mawlek has 750) and `count`
     (Hallownest's room 1 is TWO Vengefly Kings). */
  function phasesOf(f, d = diffOf()) {
    const base = rawPhases(f, d);
    let phaseList = base
      ? base.map((ph) => ph.parts.map((x) => ({ name: x.name, hp: partHp(x, d), decisive: !!x.decisive, noSoul: !!x.noSoul, art: x.art })))
      : [[{ name: f.name, hp: foeMaxHp(f, d) }]];
    const room = runFight() ? runRoom() : null;
    if (room && room.hp) phaseList = phaseList.map((ph) => ph.map((x) => ({ ...x, hp: room.hp })));
    if (room && room.count) phaseList = phaseList.map((ph) => Array.from({ length: room.count }, () => ph.map((x) => ({ ...x }))).flat());
    return phaseList;
  }

  /* Health for the whole fight, for the "N in total" and the hits needed. The Journal asks
     for it for entries that aren't the enemy yet, which is why a difficulty can come in. */
  function totalHp(f, d = diffOf()) {
    if (!f) return null;
    const phaseList = phasesOf(f, d);
    if (phaseList.length === 1 && phaseList[0].length === 1 && phaseList[0][0].hp === null) return null;
    let n = 0;
    for (const ph of phaseList) for (const part of ph) n += part.hp || 0;
    // Watcher Knights: the bar is a template repeated as many times as there are.
    if (f.pool) n = (phaseList[0][0].hp || 0) * f.pool;
    return n;
  }

  const newPart = (x) => ({ name: x.name, hp: x.hp, max: x.hp, decisive: x.decisive, noSoul: !!x.noSoul, art: x.art });

  function enterPhase(i) {
    const f = foe();
    const phaseList = phasesOf(f);
    fight.phase = i;
    const ph = phaseList[i] || [];
    const standing = f.pool ? Math.min(f.active || 1, f.pool) : ph.length;
    fight.parts = f.pool ? Array.from({ length: standing }, () => newPart(ph[0])) : ph.map(newPart);
    fight.queue = f.pool ? f.pool - standing : 0;
    fight.target = 'p' + fight.parts.findIndex((x) => x.hp > 0);
  }

  /* How much the surviving Oblobble gains and heals, by difficulty. */
  function frenzyOf(f) {
    const d = diffOf(), o = f.onDeath;
    if (d === 'at') return { hp: o.atHp, heal: o.atHeal };
    if (d === 'asra' || d === 'radiant') return { hp: o.asraHp, heal: o.asraHeal };
    return { hp: o.survivorHp, heal: o.survivorHeal };
  }

  /* The fight ends with the enemy on the ground. At a statue it leaves no symbol: the Hall's
     are those of your real game, and they're marked by hand on the plaque. */
  function winFight() {
    fight.over = true;
    App.endFresh = true;
  }

  /* What happens when a bar reaches zero. */
  function afterPartDeath(idx) {
    const f = foe(), p = fight.parts[idx];
    if (p.decisive) {
      winFight();
      logLine(t('logDecisive', { name: pick(p.name) }));
      return;
    }
    if (fight.queue > 0) {                       // Watcher Knights: the next one comes in
      fight.queue -= 1;
      fight.parts[idx] = newPart(phasesOf(f)[fight.phase][0]);
      logLine(t('logNextIn', { left: fight.queue }));
      return;
    }
    if (f.onDeath) {                             // Oblobbles: the other one goes berserk
      const survivor = fight.parts.find((x) => x.hp > 0);
      if (survivor) {
        const fr = frenzyOf(f);
        survivor.max = fr.hp;
        survivor.hp = Math.min(fr.hp, survivor.hp + fr.heal);
        logLine(t('logFrenzy', { n: App.NF[0].format(fr.hp) }));
      }
    }
    if (fight.parts.some((x) => x.hp > 0)) return;
    const phaseList = phasesOf(f);
    if (fight.phase + 1 < phaseList.length) {
      const endedPhase = fight.phase + 1;
      enterPhase(fight.phase + 1);
      logLine(t('logPhase', { n: endedPhase, next: fight.phase + 1 }));
      if (phaseNote(f)) logLine(phaseNote(f));
    } else {
      winFight();
      logLine(t('logKill', { foe: foeName(f), hits: fight.hits }));
    }
  }

  /* Masks one of their attacks takes from you, with overcharm already applied.
     Ascended is damage ×2, not "everything deals 2": the Hall of Gods page says
     "double damage", so Pure Vessel's Soul Daggers go from 2 to 4. */
  function foeDamage(f, atk, d = diffOf()) {
    const base = (atk && atk.dmg) || f.dmg || 1;
    const asc = d === 'asra' ? base * 2 : base;
    return Math.round(asc * fs().stats['health.damageMult'].value);
  }

  /* Your attacks: only what you've learnt, with your build's damage (in a pantheon, the
     one you had on entry, with its bindings). */
  function knightMoves() {
    const s = fs().stats, b = fst();
    // The soul it will really give: 11 while the main meter isn't full, 6 when it
    // is and it goes to the vessels, 0 with everything full (js/fight.js, nailSoul).
    // Against whoever gives no soul (the Collector, False Knight's armour…), "no soul".
    const ctx = fightCtx();
    const none = FT.soulless(ctx);
    const out = [{ id: 'nail', label: pick(D.NAILS[b.nail]), dmg: s['nail.damage'].value,
                   gain: FT.soulGain(fight, s, none), note: none ? t('noSoulNote') : '', art: D.art('nails', b.nail) }];
    for (const k of ART_KEYS) {
      if (!b.arts[k] || !s[ART_STAT[k]].applies) continue;   // Dash Slash, without a cloak, doesn't show
      out.push({ id: 'art:' + k, label: pick(D.ARTS[k]), dmg: s[ART_STAT[k]].value,
                 note: k === 'cyclone' ? t('perHitNote') : '', art: D.art('arts', k) });
    }
    for (const k of SPELL_KEYS) {
      if (!b.spells[k]) continue;
      // The damage of the impacts that land as chosen (js/fight.js, spellOutcome). The name
      // is the sheet's: with Flukenest it carries the charm, which is what sets the damage.
      out.push({ id: 'spell:' + k, label: s['spell.' + k].label, spell: k,
                 dmg: FT.spellOutcome(s['spell.' + k], fight.spellSel[k], ctx).dmg, cost: s['soul.spellCost'].value,
                 art: spellArt(k, b.spells[k], fightHas) });
    }
    if (s['heal.canFocus'].value) {
      out.push({ id: 'focus', label: t('focusMove'), heal: s['heal.masksPerFocus'].value,
                 cost: s['soul.focusCost'].value, art: D.art('abilities', 'focus') });
    }
    // What isn't hitting with the nail (design/04 §3.3, family C): the Shadow Dash
    // only if it deals damage (Sharp Shadow); the Dream Nail, always; the weaverlings, with their
    // charm; and "Wait", only when you wear a charm that works with the clock (§3.4):
    // it jumps straight to the first thing that will happen and says which charm it belongs to.
    if (s['nail.sharpShadow'].applies) {
      out.push({ id: 'dash', label: t('moveDash'), dmg: s['nail.sharpShadow'].value, note: t('noSoulNote'), art: D.art('charms', 'sharpshadow'), charm: true });
    }
    if (s['soul.dreamNail'].applies) out.push({ id: 'dream', label: t('moveDream'), gain: s['soul.dreamNail'].value, needsFoe: true, art: D.art('abilities', 'dream2') });
    if (s['pet.weaverling'].applies) {
      const per = s['pet.weaverling'].value, soul = s['pet.weaverlingSoul'].value * D.PETS.weaverlings;
      out.push({ id: 'weavers', label: t('moveWeavers'), dmg: per * D.PETS.weaverlings, note: D.PETS.weaverlings + ' × ' + per,
                 gain: soul || undefined, art: D.art('charms', 'weaversong'), charm: true });
    }
    // Dreamshield is positional, so it's done by hand: base nail with no soul, and it breaks for 2 s
    // on contact (design/04 §3.5). Broken, the button dims and says so.
    if (s['nail.dreamshield'].applies) {
      const ok = FT.shieldReady(fight);
      out.push({ id: 'shield', label: t('moveShield'), dmg: s['nail.dreamshield'].value, broken: !ok,
                 note: t(ok ? 'shieldNote' : 'shieldBroken'), art: D.art('charms', 'dreamshield'), charm: true });
    }
    const tick = FT.nextTick(fight, fightCtx());
    if (tick) out.push({ id: 'wait', label: t('moveWait', { s: App.NF[1].format(tick.s) }), wait: tick.s,
                         note: tick.bats ? t('waitBats') : t('waitFor', { charm: pick(D.CHARM_BY_ID[tick.charm]) }) });
    return out;
  }

  /* What the reducer needs to know about this fight. `has` honours the Charms binding. */
  const fightHas = (id) => !(runFight() && App.run.bindings.charms) && fst().charms.includes(id);
  function fightCtx() {
    const sh = fs();
    return { stats: sh.stats, has: fightHas, target: targetOf(), targetIsMinion: fight.target[0] === 'm',
             radiant: diffOf() === 'radiant', foe: foe(), phase: fight.phase, tab: prefs.fightTab,
             joniMax: sh.joniLifeblood || 0,
             fragile: fst().charms.filter((id) => D.CHARM_BY_ID[id] && D.CHARM_BY_ID[id].fragile),
             // The boss's stagger; in the Hall and the pantheons, Godhome's (Zote).
             stagger: staggerCfg(), parts: fight.parts };
  }
  const staggerCfg = () => FT.staggerOf(foe(), diffOf() !== 'base');

  /* What it summons, with the difficulty's rules: on Ascended the Collector changes its
     repertoire and in Godhome Gruz Mother no longer releases Gruzzers. In a pantheon the
     room rules: Hallownest's "Ascended arena" rooms summon as on Ascended even though
     they're fought with Attuned health. The index from the entry is kept, since that's
     what the button carries. */
  const summonDiff = () => (runFight() ? (runRoom().ascended ? 'asra' : 'at') : diffOf());
  const summonsOf = (f) => (f.summons || []).map((x, k) => ({ ...x, k }))
    .filter((x) => !x.diffs || x.diffs.includes(summonDiff()));

  const foeMoves = (f) => ((f.attacks && f.attacks.length)
    ? f.attacks.map((a, i) => ({ id: 'a' + i, label: pick(a), dmg: foeDamage(f, a), warn: a.warn ? pick(a.warn) : '', proj: a.proj || '', by: a.by || '' }))
    : [{ id: 'contact', label: t('contact'), dmg: foeDamage(f, null) }]);

  /* The bar you're hitting: "p0" a part, "m0" a minion. */
  function targetOf() {
    const [kind, i] = [fight.target[0], Number(fight.target.slice(1))];
    const pool = kind === 'm' ? fight.minions : fight.parts;
    return pool[i] && pool[i].hp > 0 ? pool[i] : null;
  }
  function retarget() {
    const i = fight.parts.findIndex((x) => x.hp > 0);
    const m = fight.minions.findIndex((x) => x.hp > 0);
    fight.target = i >= 0 ? 'p' + i : m >= 0 ? 'm' + m : 'p0';
  }

  function fightReset() {
    const f = foe();
    // In a pantheon you don't start topped up: you arrive with what you brought from the previous room.
    FT.reset(fight, baseSheet(), runFight() ? App.run : null);
    fight.melody = prefs.melody;   // Carefree Melody's counter survives the fight, as in the game
    fight.started = false;
    fight.over = false;
    fight.minions = [];
    fight.log = [];
    fight.spellSel = {};
    syncFightSheet();
    if (!f) { fight.parts = []; fight.queue = 0; fight.phase = 0; return; }
    enterPhase(0);
    const total = totalHp(f);
    if (total !== null) fight.log.push(t('logStart', { foe: foeName(f), hp: App.NF[0].format(total) }));
  }

  const logLine = (msg) => { fight.log.unshift(msg); if (fight.log.length > 9) fight.log.pop(); };

  /* The reducer's events (js/fight.js), turned into log lines: this is where the language comes in. */
  const moveLabel = (id) => { const m = knightMoves().find((x) => x.id === id); return m ? m.label : id; };

  /* Which impacts of a spell land, with the game's notches (design/05-spell-variants.html,
     variant B, chosen on 22 September 2026): one dot per impact, lit if it lands and a
     ring if not, with its figure below. The gesture is the health masks': tapping a dot
     lights up to it, and tapping the last lit one turns it off (that's how you get to zero,
     which is missing).
     The distinct parts (the dive, the Dark, the volatile one) light up or go out one by one; the
     Dark's side goes in text; Vengeful Spirit, against whoever takes it twice (spellTwice), carries a second dot
     "×2". The flukes, sixteen, go in small dots with their count. By default, all of them. */
  function spellSelHtml(key, label) {
    const st = fs().stats['spell.' + key];
    if (!st || !st.applies || !st.impacts) return '';
    const ctx = fightCtx();
    const sel = fight.spellSel[key] || {};
    const twiceOk = !!(ctx.foe && ctx.foe.spellTwice && !ctx.targetIsMinion);
    const multi = st.impacts.length > 1;
    const dot = (op, on, text, title) => `<button type="button" class="sd-dot${on ? '' : ' is-off'}" data-act="spellSel" data-id="${key}:${op}"
      aria-pressed="${on}" title="${esc(title)}" aria-label="${esc(title)}"><i class="notch${on ? '' : ' is-free'}"></i>${text ? `<small>${esc(text)}</small>` : ''}</button>`;
    const dots = [];
    let small = false, count = '', side = '';
    for (const im of st.impacts) {
      const n = FT.impactCount(im, sel, ctx);
      const v = im.alt && sel.side === 'right' ? im.alt : im.v;
      if (im.count > 1) {
        small = im.count > 8;
        for (let i = 0; i < im.count; i++) {
          dots.push(dot(`${im.id}:set:${i + 1}`, i < n, small ? '' : App.NF[0].format(v), t('selCount', { n: i + 1, max: im.count })));
        }
        if (small) count = `<span class="sd-count">${esc(t('selCount', { n, max: im.count }))}</span>`;
      } else if (im.twice) {
        if (!twiceOk) continue;
        dots.push(dot(`${im.id}:set:1`, true, App.NF[0].format(v), im.label));
        dots.push(dot(`${im.id}:twice`, n === 2, '×2', t('selTwice', { n: App.NF[0].format(2 * v) })));
      } else if (multi) {
        dots.push(dot(`${im.id}:toggle`, n > 0, (im.approx ? '~' : '') + App.NF[0].format(v), `${im.label} ${v}`));
        if (im.alt) {
          // "left" on its own doesn't say of what: the title and the group say it's where you have the enemy.
          side = `<span class="sd-side" role="group" aria-label="${esc(t('selSideGroup'))}">${['left', 'right'].map((k) => {
            const hint = esc(t(k === 'right' ? 'selRightHint' : 'selLeftHint', { n: App.NF[0].format(k === 'right' ? im.alt : im.v) }));
            return `<button type="button" data-act="spellSel" data-id="${key}:${im.id}:${k}" title="${hint}" aria-label="${hint}"
            aria-pressed="${(sel.side === 'right') === (k === 'right')}">${esc(t(k === 'right' ? 'selRight' : 'selLeft'))}</button>`;
          }).join('<i>·</i>')}</span>`;
        }
      }
    }
    // In front, a word that acts as a legend: "land". It says what lit means without the "?"
    // (for the screen reader the group already says it, so it's hidden from it).
    return dots.length ? `<div class="spell-dots${small ? ' is-small' : ''}" role="group" aria-label="${esc(t('selHint', { spell: label }))}"><span class="sd-lbl" aria-hidden="true">${esc(t('selLands'))}</span>${dots.join('')}${side}${count}</div>` : '';
  }

  /* ── The arena's explanations ────────────────────────────────────────────
     What a player without many hours can't read, explained where it is and only on request.
     There are few, the ones the game doesn't tell and that here change what you decide: each
     spell's notches (which impact each one is and why they don't always land), Cyclone Slash
     (its figure is one spin's, not the whole art's), Focus (the window in which a hit takes
     your heal away) and the Dream Nail (it doesn't hit: it draws soul). On the enemy's side, a
     single legend with what's on their cards: what pressing one of their attacks means, the
     stagger, "♪ Negated", "Blocked", "☠" and who you're hitting. The rest is already said by its
     note (the Shadow Dash's "no soul", Dreamshield, the weaverlings, "Wait… until the next…")
     or is what it looks like: explaining it would be noise.
     The gesture is a "?" that is a real button (aria-expanded, aria-controls), at the end of the
     row it explains, and it opens one to three lines below it that push what's underneath, like
     the Journal: no layers on top and no mouse as the only way, since on mobile it doesn't
     exist (title stays as a complement). The figures are the sheet's and the entry's, the same
     ones the arena uses, and the sum is shown (design/00 §5.14): "3 × 26 = 78". */
  const helpDom = (id) => 'help-' + id.replace(/[^a-z0-9]+/gi, '-');
  const helpBtn = (id, hint) => `<button type="button" class="help-q" data-act="help" data-id="${id}" aria-expanded="${helpOpen.has(id)}"
      aria-controls="${helpDom(id)}" title="${esc(hint)}" aria-label="${esc(hint)}"><span aria-hidden="true">?</span></button>`;
  const helpBox = (id, lines, cls = '') => `<div class="arena-help ${cls}" id="${helpDom(id)}"${helpOpen.has(id) ? '' : ' hidden'}>${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
  /* A line already in HTML: the text is escaped, the figures (nums) go in bone, and so does what
     the dictionary wraps in asterisks, which is the term as it appears on screen.
     words goes in as is (charm or impact names, from js/data.js and the engine). */
  const th = (key, nums = {}, words) => esc(t(key, words))
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/\{(\w+)\}/g, (m, k) => (k in nums ? `<b>${esc(nums[k])}</b>` : m));

  /* What each spell says, according to the impacts the sheet describes (js/engine.js, impacts):
     the same figures that come out under its notches, and in their order. Without notches there's nothing to explain. */
  function spellHelp(key) {
    const st = fs().stats['spell.' + key];
    if (!st || !st.impacts) return null;
    const n0 = (x) => App.NF[0].format(x);
    const ims = st.impacts;
    const by = (id) => ims.find((x) => x.id === id);
    const lines = [];
    if (by('fluke')) {
      const im = by('fluke');
      lines.push(th('helpFlukes', { n: n0(im.count), v: n0(im.v), total: n0(im.count * im.v) }, { label: im.label }));
    } else if (by('cloud')) {
      lines.push(th('helpVolatile', { a: n0(by('impact').v), b: '~' + n0(by('cloud').v), s: App.NF[1].format(D.SPELLS.vs.volatile.duration) }));
    } else if (by('bolt')) {
      // The "×2" only shows against whoever recoils (spellTwice); the projectile alone has no notches.
      return [th('helpTwice', { v: n0(by('bolt').v), n: n0(2 * by('bolt').v) })];
    } else if (key === 'hw') {
      const im = ims[0];
      lines.push(th('helpBursts', { n: n0(im.count), v: n0(im.v), total: n0(im.count * im.v) }));
    } else {
      // The dive and the Dark: one line per part, in the notches' order.
      for (const im of ims) {
        const k = im.id === 'dive' ? 'helpImDive' : im.alt ? 'helpImSide' : im.id === 'wave' || im.id === 'burst1' ? 'helpImBoth' : 'helpImPlain';
        lines.push(th(k, { v: n0(im.v), alt: n0(im.alt || 0) }, { label: im.label }));
      }
    }
    lines.push(th('helpNotches'));
    return lines;
  }

  /* Your attacks that carry an explanation (null, those that don't). */
  function moveHelp(m) {
    const s = fs().stats;
    const n0 = (x) => App.NF[0].format(x);
    if (m.spell) return spellHelp(m.spell);
    if (m.id === 'art:cyclone') {
      const a = D.NAIL.cycloneHits, b = D.NAIL.cycloneHitsMax;
      return [th('helpCyclone', { v: n0(m.dmg), a: n0(a), b: n0(b), ta: n0(a * m.dmg), tb: n0(b * m.dmg) })];
    }
    if (m.id === 'focus') {
      // What it really takes: the wind-up plus the heal (js/fight.js, duration), which is what the clock counts.
      const a = D.FOCUS.startup, b = s['heal.timePerFocus'].value, n = s['heal.masksPerFocus'].value;
      const lines = [th('helpFocus', { n: n0(n), t: App.NF[3].format(a + b), a: App.NF[3].format(a), b: App.NF[3].format(b), soul: n0(s['soul.focusCost'].value) },
        { unit: n === 1 ? t('maskUnitOne') : t('maskUnit'), done: t('fightFocusDone') })];
      if (fightHas('baldur')) lines.push(th('helpFocusBaldur', {}, { charm: pick(D.CHARM_BY_ID.baldur) }));
      return lines;
    }
    if (m.id === 'dream') return [th('helpDream', { soul: n0(s['soul.dreamNail'].value), s: App.NF[2].format(s['soul.dreamCharge'].value) })];
    return null;
  }

  /* The legend on the enemy's side: only what's on their cards right now. */
  function foeHelp(f) {
    const n0 = (x) => App.NF[0].format(x), n1 = (x) => App.NF[1].format(x);
    const radiant = diffOf() === 'radiant';
    const lines = [radiant ? th('helpFoeRadiant', {}, { diff: t('diffRa') }) : th('helpFoeAttacks')];
    // The stagger, with the figures from their card (Heavy Blow already subtracted, as there).
    const stg = staggerCfg();
    if (stg && !radiant) {
      const hb = fightHas('heavy') ? 1 : 0;
      lines.push(th(stg.bats ? 'helpStaggerBats' : 'helpStagger',
        { hits: n0(stg.hits - hb), max: n0(stg.combo - hb), w: n1(stg.window), s: n1(stg.bats || 0), cap: n0(stg.cap || 0) })
        + (hb ? ' ' + th('helpStaggerHeavy', {}, { charm: pick(D.CHARM_BY_ID.heavy) }) : ''));
    }
    if (fightHas('melody') && !radiant) {
      const steps = D.HEALTH.carefreeChances.map((x) => n1(x)).join(' → ') + pctSpace().replace(' ', '\u00a0');
      lines.push(th('helpMelody', { steps }, { neg: t('moveNegate'), charm: pick(D.CHARM_BY_ID.melody) }));
    }
    if (fightHas('dreamshield') && foeMoves(f).some((m) => m.proj === 'block')) {
      lines.push(th('helpBlock', { s: n0(D.PETS.dreamshieldBreak) }, { blocked: t('moveBlock'), charm: pick(D.CHARM_BY_ID.dreamshield) }));
    }
    const aliveCount = fight.parts.filter((x) => x.hp > 0).length + fight.minions.filter((x) => x.hp > 0).length;
    if (aliveCount > 1) lines.push(th('helpTarget'));
    return lines;
  }
  // Which hit it was, for the bats' notice: the nail or an art by its button; the rest,
  // by the charm or the action that gives it.
  const EV_CHARM = { elegy: 'elegy', thorns: 'thorns', womb: 'womb', spore: 'spore', grimmchild: 'grimmchild' };
  const evMove = (e) => (e.of === 'hit' ? moveLabel(e.move) : EV_CHARM[e.of] ? pick(D.CHARM_BY_ID[EV_CHARM[e.of]])
    : e.of === 'dash' ? t('moveDash') : e.of === 'weavers' ? t('moveWeavers') : e.of === 'shield' ? t('moveShield') : e.of);
  function logEvents(evs) {
    const f = foe();
    const n = (x) => App.NF[0].format(x);
    for (const e of evs) {
      switch (e.kind) {
        case 'hit':
          // A spell says how many of its impacts landed, if not all of them (or if more did).
          if (e.twice) logLine(t('logSpellTwice', { move: moveLabel(e.move), n: n(e.n), left: n(e.left) }));
          else if (e.of && e.landed < e.of) logLine(t('logSpellPartial', { move: moveLabel(e.move), k: e.landed, of: e.of, n: n(e.n), left: n(e.left) }));
          else logLine(t('logHit', { move: moveLabel(e.move), n: n(e.n), left: n(e.left) }));
          break;
        case 'spellMiss': logLine(t('logSpellMiss', { move: moveLabel(e.move) })); break;
        case 'minion': logLine(e.soul ? t('logMinion', { name: pick(e.name), soul: e.soul }) : t('logMinionNoSoul', { name: pick(e.name) })); break;
        case 'focus': logLine(t('logFocus', { n: e.n, left: e.left })); break;
        case 'take': logLine(t('logTake', { move: e.label, n: e.n, left: e.left })); break;
        case 'down': logLine(t('logDown', dealtOf(f))); break;
        case 'radiant': logLine(t('logRadiant', { move: e.label })); break;
        case 'elegy': logLine(t('logElegy', { n: n(e.n), left: n(e.left) })); break;
        case 'thorns': logLine(t('logThorns', { n: n(e.n), left: n(e.left) })); break;
        case 'grubsong': logLine(t('logGrubsong', { soul: e.soul })); break;
        case 'negated': logLine(t('logNegated', { move: e.label, n: e.n })); break;
        case 'shell': logLine(t('logShell', { move: e.label, left: e.left })); break;
        case 'focusLost': logLine(t('logFocusLost', { n: e.n, soul: e.soul })); break;
        case 'iframes': logLine(t('logIframes', { s: App.NF[2].format(e.s), hits: e.hits })); break;
        case 'fragile': logLine(t('logFragile', { charms: e.ids.map((id) => pick(D.CHARM_BY_ID[id])).join(', ') })); break;
        case 'spore': logLine(t('logSpore', { n: n(e.n), left: n(e.left) })); break;
        case 'dash': logLine(t('logDash', { n: n(e.n), left: n(e.left) })); break;
        case 'dream': logLine(t('logDream', { soul: e.soul })); break;
        case 'dreamNo': logLine(t('logDreamNo')); break;
        case 'weavers': logLine(t('logWeavers', { n: n(e.n), left: n(e.left) })); break;
        case 'weaversSoul': logLine(t('logWeaversSoul', { soul: e.soul })); break;
        case 'wait': logLine(t('logWait', { s: e.s })); break;
        case 'kingsoul': logLine(t('logKingsoul', { soul: e.soul })); break;
        case 'grimmchild': logLine(t('logGrimm', { n: n(e.n), shots: e.ticks, left: n(e.left) })); break;
        case 'womb': logLine(t('logWomb', { n: n(e.n), soul: e.soul, left: n(e.left) })); break;
        case 'hiveblood': logLine(t('logHiveblood', { left: e.left })); break;
        case 'blocked': logLine(t('logBlocked', { move: e.label, n: e.n })); break;
        case 'shield': logLine(t('logShield', { n: n(e.n), left: n(e.left) })); break;
        case 'stagger': logLine(t(e.combo ? 'logStaggerCombo' : 'logStagger', { name: pick(e.name), n: e.n })); break;
        case 'staggerEnd': logLine(t(e.wait ? 'logStaggerWait' : 'logStaggerEnd')); break;
        case 'bats': logLine(t('logBats', { name: pick(e.name), s: App.NF[1].format(e.s), cap: e.cap })); break;
        case 'batsEnd': logLine(t('logBatsEnd')); break;
        case 'batsCap': logLine(e.n ? t('logBatsCap', { move: evMove(e), n: n(e.n) }) : t('logBatsNone', { move: evMove(e) })); break;
        default: break;
      }
    }
  }

  /* After each action: settle the bars that have fallen (phases, Watcher Knights' queue,
     frenzy), log it, save Carefree Melody's counter and recompute the sheet with the new health. */
  function settle() {
    for (let i = 0; i < fight.parts.length; i++) {
      const p = fight.parts[i];
      if (p.hp <= 0 && !p.settled) { p.settled = true; afterPartDeath(i); }
    }
  }
  function afterAction(evs) {
    fight.started = true;
    logEvents(evs);
    settle();
    if (!targetOf()) retarget();
    if (prefs.melody !== fight.melody) { prefs.melody = fight.melody; savePrefs(); }
    syncFightSheet();
    render();
  }

  /* One of their attacks: "p0:2" = part 0 with its attack 2; "m1:0" = minion 1 with its own.
     negated: Carefree Melody negates it, and you decide that (design/04 §3.3). */
  function foeHitAct(node, negated, blocked) {
    const f = foe(); if (!f) return;
    if (fight.over || !alive()) return;
    const [who, j] = node.dataset.id.split(':');
    const foeData = who[0] === 'm' ? (F.FOE_BY_ID[(fight.minions[Number(who.slice(1))] || {}).id] || f) : f;
    const m = foeMoves(foeData)[Number(j)];
    if (!m) return;
    const part = who[0] === 'p' ? fight.parts[Number(who.slice(1))] : null;
    if (part && part.stag && part.stag.down) { toast(t('fightStaggeredToast')); return; }
    const evs = FT.apply(fight, { type: 'foeHit', dmg: m.dmg, label: m.label, negated: negated && fightHas('melody'),
                                  blocked: !!blocked && fightHas('dreamshield') && m.proj === 'block' }, fightCtx());
    hudEvent = 'hit';
    if (!alive()) App.endFresh = true;
    // In a pantheon, falling ends the run.
    if (!alive() && runFight()) { App.run.over = 'dead'; App.saveRun(); }
    afterAction(evs);
  }

  /* The build can change in the middle of everything, and then the caps move: some bosses'
     health grows with your nail, and removing a mask lowers your maximum. If the fight
     hasn't started it's rebuilt from scratch, so the numbers follow the build; if you've
     already landed a hit, what's been fought isn't touched, only what went over the cap is trimmed. */
  function fightSync() {
    const f = foe();
    if (!App.sheet) return;
    if (App.run) {
      // The pantheon's charms are the page's: if they change anywhere,
      // its caps change. Sitting on a bench also leaves you at full health.
      App.runSheet = E.compute(runBuild(), prefs.lang, { bindings: App.run.bindings });
      const seated = !App.run.over && runRoom() && runRoom().type === 'rest' && App.run.rest.sat;
      if (seated) App.runRefill(); else App.runClamp();
      App.run.soul = Math.min(App.run.soul, App.runSheet.stats['soul.total'].value);
      App.saveRun();
    }
    if (!f || !fight.started) { fightReset(); return; }
    for (const p of fight.parts) p.hp = Math.min(p.hp, p.max);
    for (const m of fight.minions) m.hp = Math.min(m.hp, m.max);
    FT.clamp(fight, baseSheet());
    syncFightSheet();
  }

  /* Search without accents or capitals: "campeon" has to find "Campeón fallido". */
  const plain = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ── The Hunter's Journal: the enemy picker ──────────────────────────────
     The list follows the game's Journal order (js/journal.js), which is roughly the order
     in which you run into them, and each row carries its medallion and the nail hits it
     takes with your build. Tapping a row only opens it on the facing page, like moving the
     cursor in the Journal; fighting is another gesture (the page's button, Enter or a double
     click). That way an entry can be read without throwing away a fight you're halfway through. */
  const JR_POS = Object.fromEntries(J.ORDER.map((id, i) => [id, i]));
  const JR_FOES = [...F.FOES].sort((a, b) => JR_POS[a.id] - JR_POS[b.id]);
  const JR_KINDS = [['all', 'jrAll'], ['boss', 'fightBosses'], ['enemy', 'fightEnemies']];
  const jrNarrow = matchMedia('(max-width: 699px)');   // the Journal switches to list or page

  /* The search runs in both languages at once: the community names bosses in English even
     when reading the site in Spanish, so "false knight" finds «Falso Caballero». */
  function foeMatches(kind) {
    const q = plain(App.pickerQuery.trim());
    return JR_FOES.filter((x) => (kind === 'all' || x.kind === kind)
      && (!q || plain(x.name.es).includes(q) || plain(x.name.en).includes(q)));
  }

  /* Nail hits an entry takes, with your build. The Journal is the fight out in the world,
     on Normal; the Hall asks for it at each difficulty. */
  function jrHits(x, d = 'base') {
    const total = totalHp(x, d);
    const nail = fs().stats['nail.damage'].value;
    return total && nail ? Math.ceil(total / nail) : null;
  }

  /* How many of their hits you survive at full health: those of their strongest attack, which
     on Ascended hits for double. On Radiant, one. */
  function enduranceOf(x, d) {
    const worstHit = Math.max(...(x.attacks && x.attacks.length ? x.attacks : [null]).map((a) => foeDamage(x, a, d)));
    return { worstHit, n: d === 'radiant' ? 1 : Math.ceil(fs().stats['health.total'].value / worstHit) };
  }

  /* An entry figure: label, value (already in HTML) and a note below. */
  const factHtml = (lbl, val, note) => `<div class="jr-fact"><dt>${esc(lbl)}</dt><dd>${val}</dd>${note ? `<small>${esc(note)}</small>` : ''}</div>`;

  /* The medallion in the Journal list. Entries without their own Journal entry (the dreams,
     Godhome) have none: they carry their portrait in a round well of the same size. */
  const jrMedal = (x) => (J.ENTRIES[x.id] && !J.ENTRIES[x.id].of
    ? `<img class="jr-medal" src="${D.art('journal', x.id)}" alt="" loading="lazy">`
    : `<span class="jr-medal is-art"><img src="${D.art('enemies', x.id)}" alt="" loading="lazy"></span>`);

  function jrRows() {
    const matches = foeMatches(prefs.foeKind);
    if (!matches.length) {
      const otherKind = prefs.foeKind === 'all' ? null : prefs.foeKind === 'boss' ? 'enemy' : 'boss';
      const anyOther = otherKind && foeMatches(otherKind).length;
      return `<li class="jr-empty" role="presentation">${esc(anyOther ? t('jrOtherKind', { kind: t(otherKind === 'boss' ? 'fightBosses' : 'fightEnemies') }) : t('fightNoMatch'))}</li>`;
    }
    return matches.map((x) => {
      const n = jrHits(x), cur = x.id === App.jrCursor;
      return `<li role="presentation"><button type="button" role="option" id="jr-${x.id}" class="jr-row ${cur ? 'is-cur' : ''} ${x.id === prefs.foeId ? 'is-on' : ''}"
        aria-selected="${cur}" tabindex="${cur ? 0 : -1}" data-act="foe" data-id="${x.id}">
        ${jrMedal(x)}<span class="jr-name"${NT}>${esc(pick(x.name))}</span>
        <span class="jr-hits" title="${esc(n === null ? t('fightInvuln') : t('hitsToKill', { n }))}">${n === null ? '—' : App.NF[0].format(n)}</span>
      </button></li>`;
    }).join('');
  }

  /* The page: the portrait on black, the name in small caps, the Journal text and what the
     calculator adds, which is what the game doesn't say: how much it costs you. It's read by
     hovering the row (or with the arrows); picking is tapping the row (or Enter), so the
     page is read-only: no fight button, no go-to-its-statue button. */
  function jrPage(x) {
    if (!x) return `<p class="jr-blank">${esc(t('jrBlank'))}</p>`;
    const e = J.ENTRIES[x.id];
    const entry = e && e.of ? J.ENTRIES[e.of] : e;   // the ones that complete another show that one's
    const s = fs().stats;
    const total = totalHp(x, 'base');
    const nail = s['nail.damage'].value;
    const phaseCount = x.pool ? 1 : phasesOf(x, 'base').length;
    const { worstHit, n: endurance } = enduranceOf(x, 'base');
    const hpNote = phaseCount > 1 ? t('jrPhases', { n: phaseCount }) : '';
    const place = x.zone && x.zone.en !== 'Hallownest' ? ' · ' + pick(x.zone) : '';
    const text = entry && entry.desc
      ? `<p class="jr-desc">${esc(pick(entry.desc))}</p>
         ${entry.notes ? `<p class="jr-notes">${esc(pick(entry.notes))}</p>` : ''}
         ${entry.by ? `<p class="jr-by">— ${esc(pick(entry.by))}</p>` : ''}
         ${e.of ? `<p class="jr-aside">${esc(t('jrShared', { name: pick(F.FOE_BY_ID[e.of].name) }))}</p>` : ''}`
      : `<p class="jr-aside">${esc(t('jrNoEntry'))}</p>`;
    const fact = factHtml;
    return `${brackets}
      ${entry && entry.n ? `<span class="jr-num">${esc(t('jrNum', { n: entry.n }))}</span>` : ''}
      <div class="jr-art"><img src="${D.art('enemies', x.id)}" alt="" onerror="this.classList.add('is-missing')"></div>
      <h3 class="jr-title"${NT}>${esc(pick(x.name))}</h3>
      ${rule}
      <p class="jr-kind">${esc(t(x.kind === 'boss' ? 'jrBoss' : 'jrEnemy'))}${esc(place)}</p>
      <div class="jr-text">${text}</div>
      <div class="jr-foot">
        <dl class="jr-facts">
          ${fact(t('jrHp'), total === null ? '<i class="na">—</i>' : App.NF[0].format(total), hpNote)}
          ${fact(t('jrNailHits'), total === null ? '<i class="na">—</i>' : App.NF[0].format(Math.ceil(total / nail)), t('jrNailNote', { n: App.NF[0].format(nail) }))}
          ${fact(t('hitsToDie'), App.NF[0].format(endurance), t(worstHit === 1 ? 'jrHitOfOne' : 'jrHitOf', { n: worstHit }))}
        </dl>

      </div>`;
  }

  /* When typing, changing filter or moving the cursor, ONLY the Journal is repainted: a
     full render would lose the cursor inside the search box and the list's scroll. */
  function paintJournal() {
    const box = el.fight.querySelector('.journal');
    if (!box) return;
    box.querySelector('.jr-list').innerHTML = jrRows();
    for (const n of box.querySelectorAll('[data-count]')) n.textContent = foeMatches(n.dataset.count).length;
    for (const b of box.querySelectorAll('[data-act="foeKind"]')) b.setAttribute('aria-pressed', String(prefs.foeKind === b.dataset.value));
    paintPage();
  }
  function paintPage() {
    const box = el.fight.querySelector('.journal');
    if (!box) return;
    App.jrPeek = null;
    box.querySelector('.jr-page').innerHTML = jrPage(F.FOE_BY_ID[App.jrCursor]);
    for (const r of box.querySelectorAll('.jr-row')) {
      const cur = r.dataset.id === App.jrCursor;
      r.classList.toggle('is-cur', cur);
      r.setAttribute('aria-selected', String(cur));
      r.tabIndex = cur ? 0 : -1;
    }
    const inp = box.querySelector('.jr-search');
    if (inp) inp.setAttribute('aria-activedescendant', App.jrCursor && box.querySelector('#jr-' + App.jrCursor) ? 'jr-' + App.jrCursor : '');
  }

  /* Brings the row being read into view by moving only the list's scroll: scrollIntoView
     would drag the page along too. */
  /* The two lists with a cursor (the enemy picker and the Hunter's Journal) move the same way:
     the row being read is centred on entry and, when moving, the list scrolls down or up just enough to show it. */
  function scrollToCur(listEl, rowEl, center) {
    if (!listEl || !rowEl) return;
    const rowTop = rowEl.offsetTop, rowBottom = rowTop + rowEl.offsetHeight;
    if (center) listEl.scrollTop = rowTop - (listEl.clientHeight - rowEl.offsetHeight) / 2;
    else if (rowTop < listEl.scrollTop) listEl.scrollTop = rowTop;
    else if (rowBottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = rowBottom - listEl.clientHeight;
  }
  // The cursor's step: ±n, 'first' or 'last', without leaving the list. Returns the new id.
  function stepCursor(items, cur, step) {
    const i = items.findIndex((x) => x.id === cur);
    const j = step === 'first' ? 0 : step === 'last' ? items.length - 1
      : Math.max(0, Math.min(items.length - 1, (i < 0 ? 0 : i) + step));
    return items[j].id;
  }
  function jrScroll(center) {
    const listEl = el.fight.querySelector('.jr-list');
    scrollToCur(listEl, listEl && listEl.querySelector('.jr-row.is-cur'), center);
  }

  /* If the entry being read is no longer in the list (filter, search), the first one is read. */
  function jrKeepCursor() {
    const matches = foeMatches(prefs.foeKind);
    if (!matches.some((x) => x.id === App.jrCursor)) App.jrCursor = matches.length ? matches[0].id : '';
  }

  function openJournal() {
    App.pickerOpen = true;
    App.jrCursor = prefs.foeId || App.jrCursor;
    // The filter can't hide whoever is in front of you: if it would, all of them show.
    if (prefs.foeId && prefs.foeKind !== 'all' && F.FOE_BY_ID[prefs.foeId].kind !== prefs.foeKind) prefs.foeKind = 'all';
    jrKeepCursor();
  }

  function jrMove(step, origin) {
    const matches = foeMatches(prefs.foeKind);
    if (!matches.length) return;
    App.jrCursor = stepCursor(matches, App.jrCursor, step);
    paintPage();
    jrScroll(false);
    // In the list, focus follows the cursor; in the search box it stays where it is.
    if (origin && origin.classList.contains('jr-row')) {
      const rowEl = el.fight.querySelector('#jr-' + App.jrCursor);
      if (rowEl) rowEl.focus();
    }
  }

  /* ── Header: COMBAT | HALL OF GODS | PANTHEONS ────────────────────────── */
  /* The combat header: the screen's title is its three tabs —the arena, the Hall of Gods and
     the Pantheons—, centred and with the rule below, like the other screens. */
  function fightHead() {
    // "Hall of Gods" doesn't fit on mobile: there that tab carries its short label.
    const tab = (id, key, short) => `<button type="button" role="tab" class="tab ${prefs.fightTab === id ? 'is-on' : ''}"
      data-act="fightTab" data-value="${id}" aria-selected="${prefs.fightTab === id}" ${short ? `aria-label="${esc(t(key))}"` : ''}>${short
        ? `<span class="tab-long" aria-hidden="true">${esc(t(key))}</span><span class="tab-short" aria-hidden="true">${esc(t(short))}</span>` : esc(t(key))}</button>`;
    const sep = '<span class="tab-sep" aria-hidden="true"></span>';
    return `<header class="inv-head fight-head">
      <h2 class="sr-only screen-title" tabindex="-1">${esc(t('navFight'))}</h2>
      <div class="tabs" role="tablist" aria-label="${esc(t('navFight'))}">
        ${tab('combat', 'fightTabCombat')}${sep}${tab('hall', 'fightTabHall', 'fightTabHallShort')}${sep}${tab('pantheon', 'fightTabPantheon')}
      </div>${rule}
    </header>`;
  }

  /* ── Your side of the arena: a scene from the game ────────────────────
     Top left, the HUD as the game paints it: the orb that fills with soul up to what you
     carry, the frame's tail with the masks on it and, below, the reserve vessels. At the
     bottom, the Knight on the ground as a black silhouette. The scene is decoration
     (aria-hidden): the figures are written in the header, like the enemy's opposite.

     The HUD is the same as the sheet's (hudHtml, below), with its fit measured alongside the
     panel's masks (.pip-mask). The orb fills from the bottom: the disc takes up 6.2% to 92.2% of
     soul-meter.png's height (7.75 and 115.25 out of 125 px), and the clip runs between those two.

     What changes with the last action is animated by comparing it with the last thing painted
     (hudPrev): the mask that breaks, the one that comes back and the soul that rises or falls.
     Lifeblood that goes simply disappears, as in the game: it leaves no gap, and painting it
     one more time to fade it out kept its place and separated the tail from the masks.
     What happens to the Knight —the hit's flicker, Focus's glow— isn't deduced from the
     numbers but from the action (hudEvent): sitting on the bench also takes away the
     cocoon's lifeblood, and that isn't a hit.
     And three states from the game: with a single mask the Knight gives off black smoke (as
     in Knight_One_Mask.gif on the wiki), on falling its Shade remains, and when overcharmed
     the HUD carries its purple aura behind the masks (Overcharm.png). */
  let hudPrev = null;
  let hudSeen = false;
  let hudEvent = '';          // 'hit' | 'focus': what the action just did
  App.endFresh = false;       // the action just ended the fight: its title fades in
  /* The game's foreground: pure black silhouette, no inner detail. The ground is a 900 × 44
     strip centred under the Knight that the SVG itself crops to the scene's width (slice),
     so it doesn't distort at any width; the rocks are pinned to the edges, framing it. */
  const sceneFloor = `<svg class="kfloor" viewBox="0 0 900 44" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 44V22C40 18 80 24 120 20C160 16 200 22 250 19C300 16 340 20 380 17L520 17C560 19 600 15 650 18C700 21 750 16 800 20C840 23 870 18 900 20V44Z
    M296 19Q297 11 292 5Q300 11 302 19ZM303 19Q306 12 311 9Q306 14 307 19Z
    M402 18Q403 10 398 4Q406 10 408 18ZM408 18Q411 11 417 8Q412 13 413 18Z
    M491 18Q493 9 497 3Q496 11 497 18ZM497 18Q501 12 507 11Q502 14 502 18Z
    M560 18C562 12 574 11 578 18ZM646 19Q649 10 646 4Q653 11 652 19ZM653 19Q657 13 663 12Q658 15 658 19Z"/></svg>
    <svg class="krock is-left" viewBox="0 0 100 110" aria-hidden="true"><path d="M0 110V30C6 24 14 26 18 34C24 44 30 52 40 60C52 70 60 80 74 88C84 94 92 100 100 110Z
    M17 33Q15 21 9 13Q19 21 21 37ZM26 46Q28 36 35 30Q30 40 30 50ZM48 66Q52 58 60 55Q54 62 53 70Z"/></svg>
    <svg class="krock is-right" viewBox="0 0 120 130" aria-hidden="true"><path d="M120 130V12C112 18 106 30 104 44C100 64 90 80 78 92C66 104 50 114 30 122C18 126 8 128 0 130Z
    M104 44Q98 34 99 22Q104 34 107 40ZM91 76Q82 70 78 60Q86 68 94 72ZM60 105Q53 99 51 91Q57 98 64 102Z"/></svg>`;
  const WISPS = 6;

  function knightSideHtml(o) {
    // Only compared with the same health: standalone combat's isn't the pantheon's.
    const prev = hudPrev && hudPrev.key === o.key ? hudPrev : null;
    hudPrev = { key: o.key, masks: o.masks, lb: o.lb, soul: o.soul, down: o.down };
    hudSeen = true;
    const hp = o.masks + o.lb;
    const hit = !!prev && hudEvent === 'hit' && hp < prev.masks + prev.lb;
    const healed = !!prev && hudEvent === 'focus' && !o.down && o.masks > prev.masks;
    const dying = !!prev && o.down && !prev.down;
    const low = !o.down && hp === 1;
    const cls = [o.down && 'is-down', dying && 'is-dying', hit && !o.down && 'is-hit', healed && 'is-focus',
      low && 'is-low', o.over && 'is-over'].filter(Boolean).join(' ');
    const unit = o.maxMasks === 1 ? t('maskUnitOne') : t('maskUnit');
    return `<div class="kside-head">
        <h3>${esc(t('knight'))}</h3>
        <span class="kside-read"><b class="kside-masks">${o.masks}</b>/${o.maxMasks} ${esc(unit)}${o.lb ? ` · <span class="kside-lb">+<b>${o.lb}</b> ${esc(t('lifebloodLower'))}</span>` : ''} · ${esc(t('soul'))} <b class="kside-soul">${o.soul}</b>/${o.maxSoul}${o.shell != null ? ` · <span class="kside-shell">${esc(t('fightShell', { n: o.shell, max: o.shellMax }))}</span>` : ''}${o.melody != null ? ` · <span class="kside-melody">${esc(t('fightMelody', { pct: App.NF[1].format(o.melody) + pctSpace() }))}</span>` : ''}${o.clock ? ` · <span class="kside-clock">${esc(t('fightClock', { s: App.NF[1].format(o.clock) }))}</span>` : ''}${o.shield ? ` · <span class="kside-shield">${esc(t(o.shield === 'on' ? 'fightShieldOn' : 'fightShieldOff'))}</span>` : ''}</span>
      </div>
      ${o.focusing ? `<div class="kside-focus"><span>${esc(t('fightFocusing'))}</span><button type="button" class="btn" data-act="focusDone" title="${esc(t('fightFocusDoneHint'))}">${esc(t('fightFocusDone'))}</button></div>` : ''}
      <div class="kscene ${cls}" aria-hidden="true">
        ${hudHtml(o, prev)}
        <div class="kstage">
          <img class="kstage-art" src="assets/knight/${o.down ? 'shade' : 'knight'}.png" alt="">
          ${low ? '<span class="wisp"></span>'.repeat(WISPS) : ''}
        </div>
        ${sceneFloor}
      </div>`;
  }
  /* The scene from a sheet and a health state: standalone combat ('fight') or the
     pantheon run ('run'), which is a single life from room to room. */
  const sheetHas = (sh, id) => !(sh.bindings && sh.bindings.charms) && (sh.state.charms || []).includes(id);
  const knightSide = (sh, v, down, key) => knightSideHtml({
    key, masks: v.masks, lb: (v.lbJoni || 0) + v.lbCharm + v.lbCocoon, soul: v.soul, down,
    // What the charms add (design/04 §3.3): the shell, Carefree Melody, the open heal and the clock.
    shell: sheetHas(sh, 'baldur') ? (v.shell || 0) : null, shellMax: sh.stats['health.baldurBlocks'].value || 0,
    melody: sheetHas(sh, 'melody') ? FT.melodyChance(v) : null,
    focusing: !!v.focusing, clock: typeof v.clock === 'number' ? v.clock : 0,
    shield: sheetHas(sh, 'dreamshield') && typeof v.clock === 'number' ? (FT.shieldReady(v) ? 'on' : 'off') : null,
    // Hiveblood with a mask to come back: how much it has left, from 0 to 1 (only in a fight, which has a clock).
    joni: sheetHas(sh, 'joni'), lbJoni: v.lbJoni || 0, hive: sheetHas(sh, 'hiveblood'),
    regen: sheetHas(sh, 'hiveblood') && v.lostMask && typeof v.sinceHit === 'number'
      && (sheetHas(sh, 'joni') ? (v.lbJoni || 0) < (sh.joniLifeblood || 0) : v.masks < sh.stats['health.masks'].value)
      ? Math.min(1, v.sinceHit / sh.stats['health.hivebloodRegen'].value) : null,
    maxMasks: sh.stats['health.masks'].value, maxSoul: sh.stats['soul.total'].value,
    mainMax: sh.stats['soul.main'].value,
    vessels: Math.round(sh.stats['soul.reserve'].value / D.SOUL.vesselSize),
    over: !!(sh.notches && sh.notches.overcharmed),
  });

  /* The end of a fight, titled the way the game titles an area on entry: the word in
     spaced-out small caps, the flourish from the page title below and a line of text.
     No box and no traffic-light colour: the scene already tells it (the enemy dimmed, your Shade).
     Shared by combat, the Hall and the pantheons; in the Hall the symbol won takes the
     centre of the flourish. It fades in only when the action causes it (endFresh):
     repainting for anything else doesn't repeat it. */
  const endDiamond = `<svg viewBox="0 0 14 12" width="14" height="12"><path d="M7 1L13 6L7 11L1 6Z"/></svg>`;
  const fightEndHtml = (o) => `<div class="fight-end ${o.won ? 'is-won' : 'is-dead'} ${App.endFresh ? 'is-fresh' : ''} ${o.cls || ''}" role="status">
      <p class="fight-end-title">${esc(o.title)}</p>
      <span class="fight-end-rule" aria-hidden="true"><i></i>${o.badge || endDiamond}<i></i></span>
      ${o.note ? `<p class="fight-end-note">${esc(o.note)}</p>` : ''}
      ${o.acts ? `<div class="fight-end-acts">${o.acts}</div>` : ''}
    </div>`;
  // What it says below the title: how much it cost, or how far you got.
  const wonNote = (f) => t(fight.hits === 1 ? 'fightWonNoteOne' : 'fightWonNote', { foe: foeName(f), n: App.NF[0].format(fight.hits) })
    + (fight.clock > 0 ? ' ' + t('fightWonTime', { s: App.NF[1].format(fight.clock), dps: App.NF[0].format(fight.dealt / fight.clock) }) : '');
  const dealtOf = (f) => ({ done: App.NF[0].format(fight.dealt), total: App.NF[0].format(totalHp(f) || 0) });

  const logHtml = (lines) => `<div class="fight-log"><div class="block-head">${esc(t('fightLog'))}</div>
    <ol>${lines.map((l, i) => `<li ${i ? '' : 'class="is-last"'}>${esc(l)}</li>`).join('')}</ol></div>`;

  /* The arena: your sheet and your attacks facing one card per entity, and the log.
     Shared by the three tabs; in a pantheon, the room sets the enemy. The Hall and
     the pantheons title the ending in their own way (end); without it, standalone combat's. */
  function arenaHtml(end) {
    const f = foe();
    const s = fs().stats;
    const total = f ? totalHp(f) : null;
    const maxMasks = s['health.masks'].value;
    const dead = !alive();
    const won = !!f && fight.over;
    const nailDmg = s['nail.damage'].value;
    const toKill = total && nailDmg ? Math.ceil(total / nailDmg) : 0;

    /* Each entity is a card with its own buttons: the boss a normal one, each minion a
       small one. Doing it this way and not with a list of bars is what lets an Infected
       Balloon attack on its own and lets you choose who to hit. */
    function foeCardHtml(kind, i, foeData, part, isMinion) {
      const id = kind + i;
      const isTarget = fight.target === id;
      const isDead = part.hp <= 0;
      const pct = part.max ? Math.max(0, Math.min(100, part.hp / part.max * 100)) : 0;
      const calm = !!foeData.void && fightHas('voidheart');   // Void Heart: the Siblings don't attack
      // The stagger, in hits (js/fight.js): while it lasts, their attacks go dim.
      const stg = !isMinion && !isDead ? staggerCfg() : null;
      const st = stg && part.stag;
      const down = !!(st && st.down);
      const offFoe = dead || won || isDead || calm || down;
      let staggerLine = '';
      if (stg && diffOf() !== 'radiant') {
        const hb = fightHas('heavy') ? 1 : 0;
        const staggerLive = st && st.lastAt !== null && fight.clock - st.lastAt <= stg.window + 1e-9;
        staggerLine = !down
          ? `<span class="foecard-stagger">${esc(t('fightStaggerCount', { n: st ? st.n : 0, hits: stg.hits - hb, combo: staggerLive ? st.combo : 0, max: stg.combo - hb }))}</span>`
          : st.until
            ? `<span class="foecard-stagger is-down">${esc(t('fightBatsNow', { s: App.NF[1].format(Math.max(0, st.until - fight.clock)), cap: st.capLeft }))}</span>`
            : `<span class="foecard-stagger is-down">${esc(t('fightStaggered'))}</span>`;
      }
      const melody = fightHas('melody') && diffOf() !== 'radiant';
      // Dreamshield for the projectiles on its list (wiki, "Dreamshield"): the attack's
      // button says whether it blocks it or passes through, and the blockable ones carry a second "Blocked" button
      // while the shield is whole. Also on Radiant: the hit that doesn't land doesn't kill.
      const shield = fightHas('dreamshield'), shieldOk = FT.shieldReady(fight);
      // Each character, its attacks: the ones carrying by only show on that part's card.
      // The index j is the whole entry's, which is what foeHitAct resolves.
      const ownMove = (m) => !m.by || m.by === part.name.en;
      const moves = foeMoves(foeData).map((m, j) => {
        if (!ownMove(m)) return '';
        const proj = shield && m.proj ? `<span class="move-cost is-proj">${esc(t(m.proj === 'block' ? 'projBlock' : 'projPierce'))}</span>` : '';
        // The unit isn't written under the figure (every button would repeat it): it goes in the
        // title, for the mouse, and read after the figure, for the screen reader.
        const unit = diffOf() === 'radiant' ? '' : m.dmg === 1 ? t('maskUnitOne') : t('maskUnit');
        const btn = `<button type="button" class="move move-foe" data-act="foehit" data-id="${id}:${j}" ${offFoe ? 'disabled' : ''}${unit ? ` title="${esc('−' + m.dmg + ' ' + unit)}"` : ''}>
          <span class="move-name"${NT}>${esc(m.label)}</span>
          <span class="move-num">${diffOf() === 'radiant' ? '☠' : '−' + m.dmg}${unit ? `<span class="sr-only"> ${esc(unit)}</span>` : ''}</span>
          ${m.warn ? `<span class="move-cost is-warn">${esc(m.warn)}</span>` : ''}${proj}
        </button>`;
        const block = shield && m.proj === 'block'
          ? `<button type="button" class="move move-block" data-act="foeblock" data-id="${id}:${j}" ${offFoe || !shieldOk ? 'disabled' : ''} title="${esc(t(shieldOk ? 'projBlock' : 'shieldBroken'))}">
          <span class="move-name">${esc(t(shieldOk ? 'moveBlock' : 'fightShieldOff'))}</span>
          <span class="move-num">0</span>
        </button>` : '';
        // Carefree Melody doesn't roll dice: you decide it, with the probability in view.
        const negate = melody ? `<button type="button" class="move move-negate" data-act="foenegate" data-id="${id}:${j}" ${offFoe ? 'disabled' : ''}
          title="${esc(t('negateHint', { charm: pick(D.CHARM_BY_ID.melody) }))}">
          <span class="move-name">${esc(t('moveNegate'))}</span>
          <span class="move-num">${App.NF[1].format(FT.melodyChance(fight))}${esc(pctSpace())}</span>
        </button>` : '';
        return block || negate ? `<div class="move-pair">${btn}${block}${negate}</div>` : btn;
      }).join('') + (calm ? `<p class="foecard-note">${esc(t('fightVoidCalm'))}</p>` : '')
        + (foeMoves(foeData).some(ownMove) ? '' : `<p class="foecard-note">${esc(t('fightNoMoves'))}</p>`);
      const summonBtns = !isMinion
        ? summonsOf(foeData).map((x) => {
            const sub = F.FOE_BY_ID[x.id];
            if (!sub) return '';
            const hp = x.hp !== undefined ? x.hp : foeMaxHp(sub, 'base');
            return `<button type="button" class="move move-summon" data-act="summon" data-id="${x.k}" ${dead || won || isDead ? 'disabled' : ''}>
              <span class="move-name">${esc(t('fightSummonOne', { name: pick(sub.name) }))}</span>
              <span class="move-num">${App.NF[0].format(hp)}</span>
              <span class="move-cost">${esc(pick(x.note))}</span>
            </button>`;
          }).join('')
        : '';
      // The whole card picks who you hit, not just the header: the space next to the attacks
      // belongs to it too. An attack carries its own data-act, which wins by being further in;
      // the keyboard gets there through the header button.
      return `<div class="foecard ${isMinion ? 'is-minion' : ''} ${isTarget ? 'is-on' : ''} ${isDead ? 'is-down' : ''} ${down ? 'is-staggered' : ''}" ${isDead ? '' : `data-act="target" data-id="${id}"`}>
        <button type="button" class="foecard-head" data-act="target" data-id="${id}" ${isDead ? 'disabled' : ''} aria-pressed="${isTarget}">
          <img class="foecard-art" src="${D.art('enemies', part.art || foeData.id)}" alt="" loading="lazy" onerror="this.classList.add('is-missing')">
          <span class="foecard-body">
            <span class="foecard-name"${NT}>${esc(pick(part.name))}</span>
            <span class="fbar ${pct <= 25 ? 'is-low' : ''}"><span style="width:${pct}%"></span></span>
            ${staggerLine}
          </span>
          <span class="foecard-num">${App.NF[0].format(Math.max(0, part.hp))}<i class="u">/${App.NF[0].format(part.max)}</i></span>
        </button>
        <div class="foecard-moves">${moves}${summonBtns}</div>
      </div>`;
    }

    let foeSide;
    if (!f) {
      foeSide = `<div class="foecard is-empty">
        <div class="foecard-head">
          <span class="foecard-body"><span class="foecard-name">${esc(t('fightPick'))}</span>
            <span class="foecard-note">${esc(t('fightNone'))}</span></span>
          <span class="foecard-num"><i class="na">—</i></span>
        </div>
        <div class="foecard-moves"><p class="moveset-empty">${esc(t('fightNoFoe'))}</p></div>
      </div>`;
    } else if (total === null) {
      foeSide = `<div class="foecard">
        <div class="foecard-head">
          <img class="foecard-art" src="${D.art('enemies', f.id)}" alt="" loading="lazy" onerror="this.classList.add('is-missing')">
          <span class="foecard-body"><span class="foecard-name"${NT}>${esc(foeName(f))}</span>
            <span class="foecard-note">${esc(t('fightInvuln'))}</span></span>
        </div>
        <div class="foecard-moves">${foeMoves(f).map((m, j) => `<button type="button" class="move move-foe" data-act="foehit" data-id="p0:${j}" ${dead ? 'disabled' : ''}>
            <span class="move-name"${NT}>${esc(m.label)}</span><span class="move-num">−${m.dmg}</span>
          </button>`).join('')}</div>
      </div>`;
    } else {
      const phaseList = phasesOf(f);
      const standing = fight.parts.filter((x) => x.hp > 0).length;
      const countLbl = f.pool
        ? t('fightStanding', { n: standing, total: standing + fight.queue })
        : phaseList.length > 1 ? t('fightPhase', { n: fight.phase + 1, total: phaseList.length }) : '';
      foeSide = `<div class="foes-head">
          <h3${NT}>${esc(foeName(f))}</h3>
          ${countLbl ? `<span class="fighter-phase">${esc(countLbl)}</span>` : ''}
          <span class="foes-total">${esc(t('fightTotal', { n: App.NF[0].format(total) }))} · ${esc(t('hitsToKill', { n: toKill }))} · ${esc(pick(f.zone))}</span>
          ${helpBtn('foe', t('helpFoe'))}
        </div>
        ${helpBox('foe', foeHelp(f), 'is-foe')}
        ${(f.notes || []).map((n) => `<p class="foecard-note is-warn">${esc(pick(n))}</p>`).join('')}
        ${phaseNote(f) ? `<p class="foecard-note">${esc(phaseNote(f))}</p>` : ''}
        ${fight.parts.map((x, i) => foeCardHtml('p', i, f, x, false)).join('')}
        ${fight.minions.map((m, i) => foeCardHtml('m', i, F.FOE_BY_ID[m.id] || f, m, true)).join('')}`;
    }

    const yours = knightMoves().map((m) => {
      const noSoul = m.cost && fight.soul < m.cost;
      const full = m.heal && fight.masks >= maxMasks;
      const needsFoe = m.dmg !== undefined || m.needsFoe;
      const off = !f || dead || won || noSoul || full || m.broken || (needsFoe && (total === null || !targetOf()));
      const why = !f ? t('fightNoTarget') : noSoul ? t('noSoulFor') : full ? t('fullHealth') : m.broken ? t('shieldBroken') : '';
      const num = m.heal ? '+' + m.heal + ' ' + esc(t('maskUnitOne')) : m.wait ? App.NF[1].format(m.wait) + ' s' : m.dmg !== undefined ? App.NF[0].format(m.dmg) : '+' + m.gain;
      const sub = m.cost ? `−${m.cost} ${esc(t('soulLower'))}` : m.gain && m.dmg !== undefined ? `+${m.gain} ${esc(t('soulLower'))}`
        : m.gain ? esc(t('soulLower')) : m.note ? esc(m.note) : '';
      const btn = `<button type="button" class="move ${m.art ? 'has-art' : ''}" data-act="hit" data-id="${m.id}" ${off ? 'disabled' : ''} ${why ? `title="${esc(why)}"` : ''}>
        ${m.art ? `<span class="move-art ${m.id === 'nail' ? 'is-nail' : ''}${m.charm ? ' is-charm' : ''}"><img src="${m.art}" alt=""></span>` : ''}
        <span class="move-name"${/^(nail|art:|spell:)/.test(m.id) ? NT : ''}>${esc(m.label)}</span>
        <span class="move-num">${num}</span>
        ${sub ? `<span class="move-cost">${sub}</span>` : ''}
      </button>`;
      // With notches or an explanation, the button and its parts go in one block (a button can't
      // hold others inside): the "?" to the right of the figure, and below it the notches and what it opens.
      // A spell without notches (plain Shade Soul) has nothing to explain.
      const dots = m.spell ? spellSelHtml(m.spell, m.label) : '';
      const help = !m.spell || dots ? moveHelp(m) : null;
      if (!dots && !help) return btn;
      return `<div class="move-card${dots ? ' spell-card' : ''}">${btn}${help ? helpBtn(m.id, t('helpOf', { name: m.label })) : ''}${dots}${help ? helpBox(m.id, help) : ''}</div>`;
    }).join('');
    // The positional ones, named with their blurb: you can see you wear them and that they aren't simulated here.
    const notes = POSITIONAL.filter(fightHas).map((id) => `<li><b${NT}>${esc(pick(D.CHARM_BY_ID[id]))}</b>: ${esc(pick(D.CHARM_BY_ID[id].blurb))}</li>`);
    const notesHtml = notes.length ? `<ul class="moveset-notes" aria-label="${esc(t('fightNotes'))}">${notes.join('')}</ul>` : '';

    const endHtml = end !== undefined ? end
      : won ? fightEndHtml({ won: true, title: t('fightWon'), note: wonNote(f) })
      : dead ? fightEndHtml({ won: false, title: t('fightDead'), note: total === null ? '' : t('fightDeadNote', dealtOf(f)) })
      : '';

    return `${endHtml}
      <div class="arena">
        <div class="side-knight">
          ${knightSide(fs(), fight, dead, runFight() ? 'run' : 'fight')}
          <div class="moveset"><div class="block-head">${esc(t('yourMoves'))}</div>${yours}${notesHtml}</div>
        </div>
        <div class="side-foes">${foeSide}
          ${logHtml(fight.log)}${fight.clock > 0 ? `<p class="fight-clock-note">${esc(t('fightClockNote'))}</p>` : ''}
        </div>
      </div>`;
  }

  /* If your side of the arena wasn't painted this time (on another tab or outside a
     room), the next thing painted continues nothing: with no previous state, it doesn't animate. */
  function renderFight() {
    hudSeen = false;
    paintFight();
    if (!hudSeen) hudPrev = null;
    hudEvent = '';
    App.endFresh = false;
  }

  /* Reset, in the arena: text with its circled arrow, like the screen's other text buttons,
     level with the enemy's line. */
  const RESET_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.8-4.1"/><path d="M12.2 1.2v3.2H9"/></svg>';
  function paintFight() {
    const head = fightHead();
    // The Hall and the Pantheons are in Godhome: the section takes its tint (css: .fight.is-godhome).
    el.fight.classList.toggle('is-godhome', prefs.fightTab !== 'combat');
    if (prefs.fightTab === 'pantheon') { el.fight.innerHTML = App.renderPantheon(head); return; }
    if (prefs.fightTab === 'hall') { el.fight.innerHTML = App.renderHall(head); return; }

    const f = foe();
    const picker = `<div class="fight-pick">
      <span class="lbl" id="foe-lbl">${esc(t('fightPickLabel'))}</span>
      <button type="button" class="jr-toggle" data-act="picker" aria-expanded="${App.pickerOpen}" aria-controls="journal"
              aria-labelledby="foe-lbl jr-val">
        ${f ? jrMedal(f) : ''}
        <span class="jr-val ${f ? '' : 'is-empty'}" id="jr-val"${f ? NT : ''}>${esc(f ? foeName(f) : t('fightPick'))}</span>
        <span class="jr-toggle-act">${esc(t(App.pickerOpen ? 'jrClose' : 'jrOpen'))}</span>${chevron(App.pickerOpen)}
      </button></div>`;
    const journal = App.pickerOpen ? `<div class="journal" id="journal">
        <div class="jr-index">
          <input type="search" class="jr-search" data-act="foeSearch" value="${esc(App.pickerQuery)}"
                 placeholder="${esc(t('jrSearch'))}" aria-label="${esc(t('jrSearch'))}"
                 role="combobox" aria-expanded="true" aria-controls="jr-list" aria-autocomplete="list"
                 aria-activedescendant="${App.jrCursor ? 'jr-' + App.jrCursor : ''}" autocomplete="off" spellcheck="false">
          <span class="seg sm jr-kinds">${JR_KINDS.map(([k, key]) => `<button type="button" data-act="foeKind" data-value="${k}" aria-pressed="${prefs.foeKind === k}">${esc(t(key))} <i data-count="${k}">${foeMatches(k).length}</i></button>`).join('')}</span>
          <div class="jr-head" aria-hidden="true"><span>${esc(t('jrEntry'))}</span><span>${esc(t('jrHitsHead'))}</span></div>
          <ul class="jr-list" id="jr-list" role="listbox" aria-label="${esc(t('jrTitle'))}">${jrRows()}</ul>
          ${f ? `<button type="button" class="jr-none" data-act="foeClear">${esc(t('fightClear'))}</button>` : ''}
        </div>
        <article class="jr-page" aria-live="polite">${jrPage(F.FOE_BY_ID[App.jrCursor])}</article>
      </div>` : '';

    el.fight.innerHTML = `<div class="fight-body">${brackets}${head}
      <div class="fight-tools">${picker}
        <button type="button" class="text-btn fight-reset" data-act="fightReset" title="${esc(t('fightResetHint'))}">${RESET_ICON}${esc(t('fightReset'))}</button></div>
      ${journal}
      ${arenaHtml()}
    </div>`;

    // When the Journal opens, the entry being read may be a hundred rows further down.
    if (App.pickerOpen) jrScroll(true);
  }

  Object.assign(actions, {
    /* With no enemy the Journal stays open: it's the only place to pick another. */
    foeClear() {
      prefs.foeId = '';
      App.pickerQuery = '';
      savePrefs();
      fightReset();
      openJournal();
      render();
      const b = el.fight.querySelector('.jr-toggle');
      if (b) b.focus();
    },
    picker() {
      if (App.pickerOpen) { App.pickerOpen = false; App.pickerQuery = ''; } else openJournal();
      render();
      // Not with a finger: opening the keyboard would cover half the list before it's read.
      if (App.pickerOpen && hoverable.matches) {
        const inp = el.fight.querySelector('.jr-search');
        if (inp) inp.focus();
      }
    },
    /* Fight the row tapped (or the one being read, with Enter). If it already was the enemy, the
       Journal just closes: picking it again has no reason to throw away a half-done fight. */
    foe(node) {
      const id = node.dataset.id;
      const isNewFoe = id !== prefs.foeId;
      prefs.foeId = id;
      App.pickerOpen = false;
      App.pickerQuery = '';
      savePrefs();
      if (isNewFoe) fightReset();
      render();
      const b = el.fight.querySelector('.jr-toggle');   // focus goes back to the button, it isn't lost
      if (b) b.focus();
    },
    /* The filter only changes what shows: the chosen enemy stays chosen. */
    foeKind(node) {
      const kind = node.dataset.value;
      if (prefs.foeKind === kind) return;
      prefs.foeKind = kind;
      savePrefs();
      jrKeepCursor();
      paintJournal();
      jrScroll(true);
    },
    fightReset() { fightReset(); render(); },
    fightTab(node) {
      prefs.fightTab = node.dataset.value;
      App.pickerOpen = false;
      App.hallTablet = false;
      if (prefs.fightTab === 'combat' && !prefs.foeId) openJournal();
      savePrefs();
      fightReset();
      render();
    },
    target(node) { fight.target = node.dataset.id; render(); },
    summon(node) {
      const f = foe(); if (!f) return;
      const x = summonsOf(f).find((y) => y.k === Number(node.dataset.id));
      const sub = x && F.FOE_BY_ID[x.id];
      if (!sub) return;
      const hp = x.hp !== undefined ? x.hp : foeMaxHp(sub, 'base');
      fight.minions.push({ id: sub.id, name: sub.name, hp, max: hp, noSoul: !!sub.noSoul });
      logLine(t('logSummon', { name: pick(sub.name), n: App.NF[0].format(hp) }));
      fight.started = true;
      render();
    },
    hit(node) {
      const f = foe(); if (!f) return;
      // A finished fight doesn't carry on: neither the Hall mark nor the log is touched.
      if (fight.over || !alive()) return;
      const m = knightMoves().find((x) => x.id === node.dataset.id);
      if (!m) return;
      if (m.cost && fight.soul < m.cost) { toast(t('noSoulFor')); return; }
      if (m.heal && fight.masks >= fs().stats['health.masks'].value) { toast(t('fullHealth')); return; }
      if (m.broken) { toast(t('shieldBroken')); return; }
      if ((m.dmg !== undefined || m.needsFoe) && !targetOf()) { toast(t('fightInvuln')); return; }
      // The numbers and the rules are in js/fight.js; here the button is only translated into an action.
      const [type, key] = m.id.split(':');
      const action = type === 'nail' ? { type: 'strike' } : type === 'wait' ? { type: 'wait', s: m.wait }
        : type === 'spell' ? { type, key, sel: fight.spellSel[key] } : { type, key };
      const evs = FT.apply(fight, action, fightCtx());
      if (m.heal) hudEvent = 'focus';
      afterAction(evs);
    },
    foehit(node) { foeHitAct(node, false); },
    foenegate(node) { foeHitAct(node, true); },
    // Up to which notch they land, a part yes or no, the side or Vengeful Spirit's double (spellSelHtml).
    spellSel(node) {
      const [key, id, op, arg] = node.dataset.id.split(':');
      const st = fs().stats['spell.' + key];
      const im = st && st.impacts && st.impacts.find((x) => x.id === id);
      if (!im) return;
      const sel = fight.spellSel[key] || (fight.spellSel[key] = {});
      const cur = FT.impactCount(im, sel, fightCtx());
      if (op === 'left' || op === 'right') sel.side = op;
      else if (op === 'toggle') sel[id] = cur > 0 ? 0 : im.count;
      else if (op === 'twice') sel[id] = cur === 2 ? 1 : 2;
      else if (op === 'set') {
        // Like the health masks: lights up to the dot tapped; the last lit one goes out.
        const k = Math.max(0, Math.min(im.twice ? 1 : im.count, Number(arg)));
        sel[id] = k === cur && !im.twice ? k - 1 : k;
      }
      render();
    },
    // The "?" of an attack or of the enemy's side: opens or closes its explanation (helpBtn). Focus
    // comes back to it on repaint, so with the keyboard it opens and closes without losing your place.
    help(node) {
      const id = node.dataset.id;
      if (helpOpen.has(id)) helpOpen.delete(id); else helpOpen.add(id);
      render();
    },
    foeblock(node) { foeHitAct(node, false, true); },   // "Blocked": Dreamshield swallows it
    // "Done": the heal finished before the next hit (closes the window without acting).
    focusDone() {
      if (!fight.focusing) return;
      afterAction(FT.apply(fight, { type: 'focusDone' }, fightCtx()));
    },
  });

  /* When typing, the cursor jumps to the first match, as in any search box. */
  document.addEventListener('input', (ev) => {
    if (!ev.target.matches('.jr-search')) return;
    App.pickerQuery = ev.target.value;
    const matches = foeMatches(prefs.foeKind);
    App.jrCursor = matches.length ? matches[0].id : '';
    paintJournal();
    const l = el.fight.querySelector('.jr-list');
    if (l) l.scrollTop = 0;
  });

  Object.assign(App, { fight, runRooms, runRoom, runFight, baseSheet, fs, fst, charmLock, touchesCharms,
    alive, hallFight, foe, phasesOf, totalHp, targetOf, fightReset, fightSync, plain, jrNarrow, enduranceOf,
    jrPage, paintJournal, paintPage, scrollToCur, stepCursor, jrScroll, jrKeepCursor, openJournal, jrMove,
    sheetHas, knightSide, fightEndHtml, wonNote, dealtOf, logHtml, arenaHtml, renderFight });
})();
