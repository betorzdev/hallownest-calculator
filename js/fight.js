/* js/fight.js — Hollow: the arena's combat rules.
   apply(state, action, ctx) → events. Pure: no DOM, no language, no storage. It mutates
   the state it receives (the `fight` of js/app-arena.js) and returns a list of events with
   numbers; js/app-arena.js turns them into log lines with t(). The phases, the Watcher
   Knights' queue, the frenzy and the summons stay in js/app-arena.js: here health is only
   taken from ctx.target, and app-arena.js settles the deaths afterwards.

   What each charm does and why, one by one: design/04-charms-in-combat.md (§3.3 the
   hooks, in the order they're applied here; §3.4 the clock). The rules come from the
   charms' pages and from "Focus" on hollowknight.wiki (September 2026):
     · Thorns of Agony deals base nail damage also when Baldur Shell absorbs the hit or
       Carefree Melody negates it, and never gives soul.
     · Grubsong only sounds with real damage.
     · A hit in the middle of Focus loses the heal and the soul EVEN IF Baldur Shell
       absorbs it or Carefree Melody negates it: the shell prevents the damage, not the interruption.
     · Carefree Melody doesn't roll dice: whoever presses decides it, with the probability in
       view, and its counter survives death and unequipping it (prefs keeps it, not the fight).
     · The clock only counts how long your actions take; enemy attacks consume no time
       and spells take 0 s because the wiki doesn't document their cast time.
     · Stagger counts hits, not damage ("Combat (Hollow Knight)"): nail, spells, arts, Thorns
       of Agony, Glowing Womb's hatchlings, Sharp Shadow and Elegy; not Grimmchild, the
       weaverlings, Dreamshield, Spore Shroom or Defender's Crest. Consecutive hits within the
       entry's window need fewer (combo), and Heavy Blow takes one off both thresholds.
     · Soul has two pools: with the main meter full, a nail hit gives the reserve's figure
       (6, not 11). The reserve refills the meter instantly, because the wiki says "after a
       short delay" without giving the figure; that way soul stays a single number.
   Loadable from the browser (global HK) and from Node (tests). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const D = HK.data || require('./data.js');

  const ART_STAT = { cyclone: 'nail.cyclone', dash: 'nail.dashSlash', great: 'nail.greatSlash' };
  const EPS = 1e-9;

  /* ── Your side's state ──────────────────────────────────────────────────
     Health comes in four piles, which a hit empties in this order: the cocoon, Lifeblood
     Heart's and Lifeblood Core's lifeblood, Joni's Blessing's and finally the masks. With Joni's
     Blessing there are no white masks: lbJoni stands in for the masks for Fury, Elegy and Hiveblood.
       shell        hits Baldur Shell has left; only the bench restores it
       melody       hits taken since Carefree Melody's last block
       focusing     window open after Focusing: the next hit interrupts it
       healed       what that Focus healed, in case it's undone
       elegyHalted  Joni's Blessing + Elegy: off until the bench
       clock        seconds your actions have taken up (§3.4)
       sinceHit     seconds since the last damage, for Hiveblood
       lostMask     there's a lost mask that Hiveblood could give back
       sporeAt      instant on the clock when Spore Shroom is ready again
       shieldAt     instant on the clock when Dreamshield is whole again
       acc          accumulators for the passives that run with the clock
       taken        health the enemy's hits took away (masks and lifeblood), for the summary
       soulSpent    soul paid for spells, Focus and Glowing Womb's hatchlings
       focuses      times you Focused */
  function reset(f, sheet, carry) {
    const s = sheet.stats;
    const joni = sheet.joniLifeblood || 0;
    if (carry) {
      f.masks = carry.masks; f.lbJoni = carry.lbJoni || 0; f.lbCharm = carry.lbCharm; f.lbCocoon = carry.lbCocoon;
      f.soul = carry.soul; f.shell = carry.shell || 0; f.elegyHalted = !!carry.elegyHalted;
    } else {
      f.masks = s['health.masks'].value;
      f.lbJoni = joni;
      f.lbCharm = s['health.lifeblood'].value - joni;
      f.lbCocoon = 0;
      f.soul = Math.min(s['soul.main'].value, s['soul.total'].value);
      f.shell = s['health.baldurBlocks'].value || 0;
      f.elegyHalted = false;
    }
    f.focusing = false; f.healed = 0;
    f.clock = 0; f.sinceHit = 0; f.lostMask = false; f.sporeAt = 0; f.shieldAt = 0;
    f.acc = { kingsoul: 0, grimm: 0, womb: 0 };
    f.dealt = 0; f.hits = 0; f.taken = 0; f.soulSpent = 0; f.focuses = 0;
    if (typeof f.melody !== 'number') f.melody = 0;
    return f;
  }

  /* The build changes in the middle of everything and the caps move: whatever's over is trimmed. */
  function clamp(f, sheet) {
    const s = sheet.stats;
    const joni = sheet.joniLifeblood || 0;
    f.masks = Math.min(f.masks, s['health.masks'].value);
    f.lbJoni = Math.min(f.lbJoni || 0, joni);
    f.lbCharm = Math.min(f.lbCharm, s['health.lifeblood'].value - joni);
    f.soul = Math.min(f.soul, s['soul.total'].value);
    f.shell = Math.min(f.shell || 0, s['health.baldurBlocks'].value || 0);
    return f;
  }

  /* What the engine needs to switch on Fury and Elegy (options.fight). */
  const health = (f) => ({ masks: f.masks, lbJoni: f.lbJoni || 0, lbExtra: f.lbCharm, lbCocoon: f.lbCocoon, elegyHalted: !!f.elegyHalted });
  const total = (f) => f.masks + (f.lbJoni || 0) + f.lbCharm + f.lbCocoon;
  const alive = (f) => total(f) > 0;
  /* Probability of Carefree Melody's next block, by the hits since the last one. */
  const melodyChance = (f) => D.HEALTH.carefreeChances[Math.min(f.melody || 0, D.HEALTH.carefreeChances.length - 1)];
  /* Dreamshield breaks on contact or when it stops something, and comes back 2 s later on the clock. */
  const shieldReady = (f) => (f.shieldAt || 0) <= (f.clock || 0) + EPS;

  /* The first thing that will happen if you let the clock run, among the charms that work with
     it: {s, charm}. It's what the "Wait" button waits for, which only exists when there's
     something to wait for; that way no number has to be chosen and you can see what it's for. null if nothing. */
  function nextTick(f, ctx) {
    const s = ctx.stats, has = ctx.has;
    const canHit = ctx.target && ctx.target.hp > 0;
    const left = (acc, every) => { const r = every - acc; return r <= EPS ? every : r; };
    const opts = [];
    if (has('kingsoul')) opts.push({ s: left(f.acc.kingsoul, D.SOUL.kingsoulEvery), charm: 'kingsoul' });
    if (has('grimmchild') && s['pet.grimmchild'].applies && canHit) opts.push({ s: left(f.acc.grimm, D.PETS.grimmchildEvery), charm: 'grimmchild' });
    if (has('womb') && canHit && f.soul >= D.SOUL.hatchlingCost) opts.push({ s: left(f.acc.womb, D.PETS.hatchlingEvery), charm: 'womb' });
    if (has('hiveblood') && f.lostMask) {
      const k = has('joni') ? 'lbJoni' : 'masks';
      const max = has('joni') ? (ctx.joniMax || 0) : s['health.masks'].value;
      if (f[k] < max) opts.push({ s: Math.max(EPS, s['health.hivebloodRegen'].value - f.sinceHit), charm: 'hiveblood' });
    }
    if (has('spore') && f.sporeAt > f.clock + EPS) opts.push({ s: f.sporeAt - f.clock, charm: 'spore' });
    if (has('dreamshield') && (f.shieldAt || 0) > f.clock + EPS) opts.push({ s: f.shieldAt - f.clock, charm: 'dreamshield' });
    // Grimm and the Nightmare King as bats: they come back on their own after their seconds pass.
    for (const p of partsOf(ctx)) if (p.stag && p.stag.until > f.clock + EPS) opts.push({ s: p.stag.until - f.clock, charm: null, bats: true });
    if (!opts.length) return null;
    return opts.reduce((a, b) => (b.s < a.s - EPS ? b : a));
  }

  /* ── Clock: how long each action takes, with the sheet's numbers ────────
     Spells take 0: the wiki doesn't document their cast time. */
  function duration(stats, id, n) {
    switch (id) {
      case 'strike': return stats['nail.cooldown'].value;
      case 'art': return stats['nail.artCharge'].applies ? stats['nail.artCharge'].value : 0;
      case 'spell': return 0;
      case 'focus': return D.FOCUS.startup + stats['heal.timePerFocus'].value;
      case 'dream': return stats['soul.dreamCharge'].value;
      case 'dash': return D.MOVE.shadowCooldown;
      case 'wait': return n || 0;
      default: return 0;
    }
  }

  const gainSoul = (f, ctx, n) => { f.soul = Math.min(ctx.stats['soul.total'].value, f.soul + n); };
  /* What a nail hit gives: the main meter's figure while it isn't full, and the reserve's
     once it is (wiki, "Soul Catcher" and "Soul Eater": 11 and 6, +3/+2, +8/+6). What
     overflows the main meter goes to the reserve, which means adding it to the same number. */
  const nailSoul = (f, stats) => (f.soul < stats['soul.main'].value ? stats['soul.perHit'].value : stats['soul.perHitReserve'].value);
  /* Some enemies give no soul when hit with the nail (noSoul in js/enemies.js): the whole fight
     against the Collector, Failed Champion and one Sibling, and False Knight's armour, not its
     maggot. A minion carries its own. The Dream Nail, the weaverlings with Grubsong and
     Grubsong when taking damage do give soul: they aren't nail hits. */
  const soulless = (ctx) => !!(ctx.target && (ctx.target.noSoul || (!ctx.targetIsMinion && ctx.foe && ctx.foe.noSoul)));
  // What the next hit would really gain, with the cap already applied: what the button shows.
  const soulGain = (f, stats, none) => (none ? 0 : Math.max(0, Math.min(nailSoul(f, stats), stats['soul.total'].value - f.soul)));

  /* ── Stagger ─────────────────────────────────────────────────────────────
     The state lives on the bar (tg.stag), so a new phase starts from zero. ctx.stagger is
     the entry already resolved by js/app-arena.js ({ hits, combo, window, bats, cap }, with Godhome's
     Zote); without it, the bar doesn't stagger. */
  const partsOf = (ctx) => (ctx.parts || [ctx.target]).filter(Boolean);
  /* An enemy's stagger entry: null if it isn't staggered by hits. godhome: in the Hall and in
     the pantheons Zote fights as on his third time (19 and 16), not as on the first (17 and 14). */
  function staggerOf(foe, godhome) {
    const s = foe && foe.stagger;
    if (!s) return null;
    return godhome && s.godhome ? { ...s, ...s.godhome } : s;
  }
  const stagOf = (tg) => tg.stag || (tg.stag = { n: 0, combo: 0, lastAt: null, down: false, until: 0, capLeft: 0 });
  function lift(st) { st.down = false; st.until = 0; st.capLeft = 0; st.n = 0; st.combo = 0; st.lastAt = null; }

  /* Counts an action's hits. A staggered boss gets up with the first hit that counts, and
     that hit doesn't count towards the next stagger; the ones after it in the same action
     (Abyss Shriek is four) do. As bats nothing counts or gets them up: they come back on their own. */
  function countHits(f, ctx, st, hits, events, at, name) {
    const cfg = ctx.stagger;
    const hb = ctx.has('heavy') ? 1 : 0;
    let left = hits;
    if (st.down) {
      if (st.until) return;
      lift(st);
      events.push({ kind: 'staggerEnd' });
      left -= 1;
    }
    for (; left > 0; left--) {
      st.combo = st.lastAt !== null && at - st.lastAt <= cfg.window + EPS ? st.combo + 1 : 1;
      st.lastAt = at;
      st.n += 1;
      const byHits = st.n >= cfg.hits - hb, byCombo = st.combo >= cfg.combo - hb;
      if (byHits || byCombo) {
        const n = st.n;
        lift(st);
        st.down = true;
        if (cfg.bats) { st.until = at + cfg.bats; st.capLeft = cfg.cap; }
        events.push({ kind: cfg.bats ? 'bats' : 'stagger', name, combo: !byHits, n, s: cfg.bats || 0, cap: cfg.cap || 0 });
        return;
      }
    }
  }

  /* Take health from the target. Returns what was taken. Killing a minion gives soul: that's
     the reason to let them out; that line replaces the hit's, as it always has. hits: how many
     hits it counts towards stagger (0 for what doesn't count, like Grimmchild); at, the
     instant on the clock when the hit lands, which for an art is on release, after the charge. */
  function hurt(f, ctx, n, ev, events, hits = 0, at = f.clock) {
    const tg = ctx.target;
    if (!tg || tg.hp <= 0 || n <= 0) return 0;
    const st = !ctx.targetIsMinion && ctx.stagger ? stagOf(tg) : null;
    // As bats, cap at most across all hits (wiki, "Troupe Master Grimm").
    const bats = !!(st && st.down && st.until);
    const want = bats ? Math.min(n, st.capLeft) : n;
    // of: which hit it was (the nail, Elegy…), so the log names it.
    if (bats && want <= 0) { events.push({ ...ev, of: ev.kind, kind: 'batsCap', n: 0, left: 0 }); return 0; }
    const taken = Math.min(want, tg.hp);
    tg.hp -= taken;
    if (bats) st.capLeft -= taken;
    if (!ctx.targetIsMinion) f.dealt += taken;
    if (ctx.targetIsMinion && tg.hp <= 0) {
      const soul = soulless(ctx) ? 0 : nailSoul(f, ctx.stats);
      gainSoul(f, ctx, soul);
      events.push({ kind: 'minion', name: tg.name, soul });
    } else {
      events.push({ ...ev, n: taken, left: Math.max(0, tg.hp) });
      if (bats && want < n) events.push({ ...ev, of: ev.kind, kind: 'batsCap', n: taken, left: st.capLeft });
    }
    if (st && hits > 0 && tg.hp > 0) countHits(f, ctx, st, hits, events, at, tg.name);
    return taken;
  }

  /* How many of an impact land: what's been chosen and, if nothing, all of them. Flukenest's against a
     noFlukes entry (the Hollow Knight, Pure Vessel) start at none: they only hit it in the air. */
  function impactCount(im, sel, ctx) {
    if (sel && typeof sel[im.id] === 'number') return sel[im.id];
    return im.nest && ctx && ctx.foe && ctx.foe.noFlukes && !ctx.targetIsMinion ? 0 : im.count;
  }

  /* What a spell does according to the impacts that land (the sheet describes them in `impacts`). The
     wiki warns that not all of them always land: the bursts depending on movement and the hitbox, the
     flukes depending on distance, the dive only if you're on top. sel = { [id]: how many land,
     side: 'right' } and whatever's missing comes from impactCount. Vengeful Spirit hits twice only
     entries with spellTwice (the ones that recoil, and Xero), and never a minion. Each impact that
     lands is a hit for stagger, except the volatile one's cloud. Returns { dmg, hits, landed, of, twice }. */
  function spellOutcome(stat, sel, ctx) {
    const list = (stat && stat.impacts) || [{ id: 'all', v: stat ? stat.value : 0, count: 1 }];
    const twiceOk = !!(ctx && ctx.foe && ctx.foe.spellTwice && !ctx.targetIsMinion);
    const out = { dmg: 0, hits: 0, landed: 0, of: 0, twice: false };
    for (const im of list) {
      const max = im.twice && twiceOk ? 2 : im.count;
      const n = Math.max(0, Math.min(max, impactCount(im, sel, ctx)));
      const v = im.alt && sel && sel.side === 'right' ? im.alt : im.v;
      out.dmg += n * v;
      if (im.stagger !== false) out.hits += n;
      out.landed += n;
      out.of += im.count;
      if (n > im.count) out.twice = true;
    }
    return out;
  }

  /* The Dream Nail draws soul from any living enemy, except where the entry denies it
     (Pure Vessel) or until a certain phase (the Hollow Knight, only in the last one). */
  function dreamOk(ctx) {
    const d = ctx.foe && ctx.foe.dreamNail;
    if (d === false) return false;
    if (d && typeof d === 'object' && (ctx.phase || 0) < d.fromPhase) return false;
    return true;
  }

  /* ── What happens when you get hit (§3.3, in this order) ─────────────── */
  function foeHit(f, a, ctx, events) {
    const s = ctx.stats, has = ctx.has;
    // Dreamshield stops a projectile on its list (wiki, "Dreamshield") and breaks for 2 s. Nothing
    // touches you: the heal isn't interrupted, Thorns of Agony doesn't fire, it doesn't count for Carefree Melody; and
    // not on Radiant either, where the hit that doesn't land doesn't kill. Broken, "blocked" is a normal hit.
    if (a.blocked && has('dreamshield') && shieldReady(f)) {
      f.shieldAt = f.clock + D.PETS.dreamshieldBreak;
      events.push({ kind: 'blocked', label: a.label, n: a.dmg });
      return;
    }
    if (ctx.radiant) {
      f.taken = (f.taken || 0) + total(f);
      f.masks = 0; f.lbJoni = 0; f.lbCharm = 0; f.lbCocoon = 0;
      f.focusing = false; f.healed = 0;
      events.push({ kind: 'radiant', label: a.label });
      return;
    }
    // The half-done heal is lost in all three cases (wiki, "Focus"): the soul is already spent.
    const lost = f.focusing ? f.healed : 0;
    if (f.focusing) { f.masks = Math.max(0, f.masks - f.healed); f.focusing = false; f.healed = 0; }

    if (a.negated && has('melody')) {
      f.melody = 0;
      events.push({ kind: 'negated', label: a.label, n: a.dmg });
    } else {
      if (has('melody')) f.melody += 1;
      // Baldur Shell only covers while you Focus: it absorbs the hit, not the interruption.
      if (lost > 0 && f.shell > 0) {
        f.shell -= 1;
        events.push({ kind: 'shell', label: a.label, n: a.dmg, left: f.shell });
      } else {
        const before = total(f);
        let d = a.dmg;
        for (const k of ['lbCocoon', 'lbCharm', 'lbJoni']) { const x = Math.min(f[k] || 0, d); f[k] -= x; d -= x; }
        f.masks = Math.max(0, f.masks - d);
        f.taken = (f.taken || 0) + before - total(f);
        f.sinceHit = 0; f.lostMask = true; f.sporeAt = 0;
        if (has('joni') && has('elegy')) f.elegyHalted = true;
        const left = total(f);
        events.push(left > 0 ? { kind: 'take', label: a.label, n: a.dmg, left } : { kind: 'down' });
        if (left > 0 && s['soul.onHit'].applies) {
          gainSoul(f, ctx, s['soul.onHit'].value);
          events.push({ kind: 'grubsong', soul: s['soul.onHit'].value });
        }
      }
    }
    if (lost > 0) events.push({ kind: 'focusLost', n: lost, soul: s['soul.focusCost'].value });
    if (!alive(f)) {
      // Fragile charms break on death, except against dream bosses and in Godhome.
      if (ctx.tab === 'combat' && !(ctx.foe && ctx.foe.dream) && ctx.fragile && ctx.fragile.length) {
        events.push({ kind: 'fragile', ids: ctx.fragile.slice() });
      }
      return;
    }
    // Thorns of Agony: also when the shell or Carefree Melody stop the hit. One hit; it can be two.
    if (s['nail.thorns'].applies) hurt(f, ctx, s['nail.thorns'].value, { kind: 'thorns' }, events, 1);
    // Invulnerable for a while, and how many nail swings fit in it (with Stalwart Shell).
    if (has('stalwart')) {
      const sec = s['health.iframes'].value;
      events.push({ kind: 'iframes', s: sec, hits: Math.floor(sec / s['nail.cooldown'].value + EPS) });
    }
  }

  /* ── The passives run over the time your actions take up (§3.4) ─────── */
  function advance(f, dt, ctx, events) {
    const s = ctx.stats, has = ctx.has;
    f.clock += dt; f.sinceHit += dt;
    const ticks = (k, every) => { f.acc[k] += dt; let n = 0; while (f.acc[k] >= every - EPS) { f.acc[k] -= every; n += 1; } return n; };
    const canHit = ctx.target && ctx.target.hp > 0;
    if (has('kingsoul')) {
      const n = ticks('kingsoul', D.SOUL.kingsoulEvery);
      if (n) { gainSoul(f, ctx, n * D.SOUL.kingsoulAmount); events.push({ kind: 'kingsoul', soul: n * D.SOUL.kingsoulAmount, ticks: n }); }
    }
    if (has('grimmchild') && s['pet.grimmchild'].applies) {
      const n = ticks('grimm', D.PETS.grimmchildEvery);
      if (n && canHit) hurt(f, ctx, n * s['pet.grimmchild'].value, { kind: 'grimmchild', ticks: n }, events);
    }
    if (has('womb')) {
      const n = ticks('womb', D.PETS.hatchlingEvery);
      let born = 0;
      for (let i = 0; i < n && canHit && f.soul >= D.SOUL.hatchlingCost; i++) { f.soul -= D.SOUL.hatchlingCost; f.soulSpent = (f.soulSpent || 0) + D.SOUL.hatchlingCost; born += 1; }
      if (born) hurt(f, ctx, born * s['pet.hatchling'].value, { kind: 'womb', ticks: born, soul: born * D.SOUL.hatchlingCost }, events, born);
    }
    // The bats gather and it's Grimm again.
    for (const p of partsOf(ctx)) {
      if (p.stag && p.stag.until && f.clock >= p.stag.until - EPS) { lift(p.stag); events.push({ kind: 'batsEnd' }); }
    }
    if (has('hiveblood') && f.lostMask && f.sinceHit >= s['health.hivebloodRegen'].value - EPS) {
      // Gives back the last mask lost (Joni's, with Joni's Blessing); never any other lifeblood.
      const joni = has('joni');
      const k = joni ? 'lbJoni' : 'masks';
      const max = joni ? (ctx.joniMax || 0) : s['health.masks'].value;
      if (f[k] < max) { f[k] += 1; events.push({ kind: 'hiveblood', left: f[k] }); }
      f.lostMask = false;
    }
  }

  /* ── apply ───────────────────────────────────────────────────────────────
     ctx = { stats, has(id), target, targetIsMinion, radiant, foe, phase, tab, joniMax, fragile,
             stagger, parts }: stagger, the stagger entry already resolved; parts, the boss's
             bars (for the bats).
     The checks that speak up (no soul, full health, no target) are done by app-arena.js beforehand. */
  function apply(f, action, ctx) {
    const s = ctx.stats, has = ctx.has;
    const events = [];
    const own = () => { f.focusing = false; f.healed = 0; };   // your next action closes the heal window
    let dt = 0;
    switch (action.type) {
      case 'strike': {
        own(); f.hits += 1;
        // With the main meter full, the reserve's figure; nothing against whoever gives no soul. It's decided
        // before the hit: the one that breaks False Knight's armour doesn't draw soul from the maggot.
        const soul = soulless(ctx) ? 0 : nailSoul(f, s);
        hurt(f, ctx, s['nail.damage'].value, { kind: 'hit', move: 'nail' }, events, 1);
        gainSoul(f, ctx, soul);
        // Elegy: one beam per swing, at the same enemy, no soul. It also counts towards stagger.
        if (s['nail.elegy'].applies) hurt(f, ctx, s['nail.elegy'].value, { kind: 'elegy' }, events, 1);
        dt = duration(s, 'strike');
        break;
      }
      case 'art': {
        own(); f.hits += 1;
        // The art charges before release: its hit lands at the end of the charge, and it's that wait
        // that breaks a combo under 1 s (with Nailmaster's Glory, 0.75 s, not always).
        dt = duration(s, 'art');
        hurt(f, ctx, s[ART_STAT[action.key]].value, { kind: 'hit', move: 'art:' + action.key }, events, 1, f.clock + dt);
        break;
      }
      case 'spell': {
        own(); f.hits += 1;
        f.soul -= s['soul.spellCost'].value;
        f.soulSpent = (f.soulSpent || 0) + s['soul.spellCost'].value;
        // Zero impacts is a miss: the soul is already paid.
        const r = spellOutcome(s['spell.' + action.key], action.sel, ctx);
        const ev = { kind: 'hit', move: 'spell:' + action.key, landed: r.landed, of: r.of, twice: r.twice };
        if (r.dmg > 0) hurt(f, ctx, r.dmg, ev, events, r.hits);
        else events.push({ kind: 'spellMiss', move: 'spell:' + action.key });
        dt = duration(s, 'spell');
        break;
      }
      case 'focus': {
        f.soul -= s['soul.focusCost'].value;
        f.soulSpent = (f.soulSpent || 0) + s['soul.focusCost'].value;
        f.focuses = (f.focuses || 0) + 1;
        const gained = Math.max(0, Math.min(s['heal.masksPerFocus'].value, s['health.masks'].value - f.masks));
        f.masks += gained; f.healed = gained; f.focusing = true;
        f.lostMask = false;   // healing with Focus cancels Hiveblood's regeneration
        events.push({ kind: 'focus', n: gained, left: f.masks });
        if (has('spore') && f.clock >= f.sporeAt - EPS) {
          hurt(f, ctx, s['heal.spore'].value, { kind: 'spore' }, events);
          f.sporeAt = f.clock + D.FOCUS.sporeCooldown;
        }
        dt = duration(s, 'focus');
        break;
      }
      case 'focusDone': own(); break;
      case 'dream': {
        own();
        if (dreamOk(ctx)) { gainSoul(f, ctx, s['soul.dreamNail'].value); events.push({ kind: 'dream', soul: s['soul.dreamNail'].value }); }
        else events.push({ kind: 'dreamNo' });
        dt = duration(s, 'dream');
        break;
      }
      case 'dash': {
        own();
        hurt(f, ctx, s['nail.sharpShadow'].value, { kind: 'dash' }, events, 1);   // no soul
        dt = duration(s, 'dash');
        break;
      }
      case 'shield': {
        // Positional, so by hand: base nail with no soul, and the shield breaks on contact.
        own();
        hurt(f, ctx, s['nail.dreamshield'].value, { kind: 'shield' }, events);
        f.shieldAt = f.clock + D.PETS.dreamshieldBreak;
        break;
      }
      case 'weavers': {
        own();
        const bites = D.PETS.weaverlings;
        const done = hurt(f, ctx, bites * s['pet.weaverling'].value, { kind: 'weavers', bites }, events);
        const soul = bites * s['pet.weaverlingSoul'].value;   // with Grubsong, even from whoever gives no soul
        if (done && soul) { gainSoul(f, ctx, soul); events.push({ kind: 'weaversSoul', soul }); }
        break;
      }
      case 'wait': {
        own();
        dt = duration(s, 'wait', action.s);
        events.push({ kind: 'wait', s: action.s });
        // Waiting lets a staggered boss get up; Focusing or the Dream Nail don't:
        // that's the healing window the stagger gives. The bats go by their own clock.
        for (const p of partsOf(ctx)) if (p.stag && p.stag.down && !p.stag.until) { lift(p.stag); events.push({ kind: 'staggerEnd', wait: true }); }
        break;
      }
      case 'foeHit': foeHit(f, action, ctx, events); break;
      default: throw new Error('Unknown action: ' + action.type);
    }
    if (dt > 0) advance(f, dt, ctx, events);
    return events;
  }

  HK.fight = { reset, clamp, health, total, alive, melodyChance, shieldReady, duration, nextTick, apply, nailSoul, soulGain, soulless, impactCount, spellOutcome, staggerOf, ART_STAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.fight;
})();
