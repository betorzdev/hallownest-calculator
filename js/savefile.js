/* js/savefile.js — a real game, imported: the game's save file turned into a slot.
   Pure: bytes in, a slot's snapshot out (the same keys js/saves.js copies), no DOM and no
   language. The interface picks the error's words.

   The file. On PC the game saves each profile as user1.dat … user4.dat: a .NET BinaryFormatter
   header (22 bytes), the string's length (7 bits per byte), the string in base64, and a last
   byte 0x0B. The base64 is the save's JSON encrypted with AES-256 in ECB mode and PKCS7
   padding, with a fixed key. The steps and the key come from the community's readers
   (KayDeeTee's Hollow-Knight-SaveManager, bloodorca's "hollow" editor and ReznoRMichael's
   hollow-knight-completion-check, checked on 25-Sep-2026). AES is written here, not taken
   from crypto.subtle: that one doesn't do ECB and isn't there over file://. A save that is
   already JSON (the Switch's, or one decrypted with an editor) is read as it is.

   The JSON is { playerData, sceneData }. From playerData (field names from LiveSplit.HollowKnight's
   dump of PlayerData, patch 1.5.68) the site takes what it keeps of a game:
     build     nailSmithUpgrades, maxHealthBase, MPReserveMax (33 per vessel), charmSlots,
               fireballLevel / quakeLevel / screamLevel, the three nail arts, hasDreamNail,
               hasDash / hasShadowDash, grimmChildLevel and equippedCharms, in the order worn.
               Health comes full: the game saves on a bench.
     owned     gotCharm_1 … 40; the three fragile ones by fragile*_unbreakable, the 36th by
               royalCharmState (1–2 White Fragment, 3 Kingsoul, 4 Void Heart) and the 40th by
               grimmChildLevel (5: the troupe banished, Carefree Melody).
     journal   killed<X> (encountered) and kills<X> (defeats left), as js/hunter.js keeps them.
     hall      statueState<X>.completedTier1 … 3 → Attuned, Ascended, Radiant.
     bindings  bossDoorStateTier1 … 5: boundNail … boundSoul and allBindings.
     progress  everything else a game has: equipment and key items, what you carry, the rest of
               the 112%, your bench and your shade (js/progress.js says which field is which).
   The pantheon in progress and the pinned build aren't in a real save: they're left empty. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const C = HK.codec || require('./codec.js');
  const HJ = HK.hunter || require('./hunter.js');
  const HG = HK.hall || require('./hall.js');
  const PN = HK.pantheons || require('./pantheons.js');
  const P = HK.progress || require('./progress.js');

  const KEY = 'UKu52ePUBwetZ9wNX88o54dnfKRu0T1l';
  const HEADER = [0, 1, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0];

  /* The game's charm number (CHARM_NAME_<n> in its text) → the site's charm. The five with two
     versions are resolved from playerData (versionOf). */
  const CHARM_OF_NUM = {
    1: 'swarm', 2: 'compass', 3: 'grubsong', 4: 'stalwart', 5: 'baldur', 6: 'fury', 7: 'quickfocus',
    8: 'lbheart', 9: 'lbcore', 10: 'crest', 11: 'flukenest', 12: 'thorns', 13: 'pride', 14: 'steady',
    15: 'heavy', 16: 'sharpshadow', 17: 'spore', 18: 'longnail', 19: 'shaman', 20: 'catcher',
    21: 'eater', 22: 'womb', 23: 'heart', 24: 'greed', 25: 'strength', 26: 'glory', 27: 'joni',
    28: 'unn', 29: 'hiveblood', 30: 'wielder', 31: 'dashmaster', 32: 'quickslash', 33: 'twister',
    34: 'deepfocus', 35: 'elegy', 36: 'king', 37: 'sprintmaster', 38: 'dreamshield', 39: 'weaversong',
    40: 'grimm',
  };
  const FRAGILE = { heart: 'fragileHealth', greed: 'fragileGreed', strength: 'fragileStrength' };

  // The Hunter's Journal entry → its playerData suffix: killed<X>, kills<X>.
  const JOURNAL_PD = {
    'vengefly': 'Buzzer', 'vengefly-king': 'BigBuzzer', 'gruzzer': 'Bouncer', 'gruz-mother': 'BigFly',
    'tiktik': 'Climber', 'aspid-hunter': 'Spitter', 'aspid-mother': 'Hatcher', 'aspid-hatchling': 'Hatchling',
    'goam': 'Worm', 'wandering-husk': 'ZombieRunner', 'husk-hornhead': 'ZombieHornhead',
    'leaping-husk': 'ZombieLeaper', 'husk-bully': 'ZombieBarger', 'husk-warrior': 'ZombieShield',
    'husk-guard': 'ZombieGuard', 'entombed-husk': 'Mummy', 'false-knight': 'FalseKnight',
    'maggot': 'PrayerSlug', 'menderbug': 'MenderBug', 'lifeseed': 'HealthScuttler', 'baldur': 'Roller',
    'elder-baldur': 'Blocker', 'mosscreep': 'MossWalker', 'mossfly': 'MossFlyer', 'mosskin': 'MossmanRunner',
    'volatile-mosskin': 'MossmanShaker', 'fool-eater': 'SnapperTrap', 'squit': 'Mosquito', 'obble': 'BlobFlyer',
    'gulka': 'PlantShooter', 'maskfly': 'Pigeon', 'moss-charger': 'MossCharger',
    'massive-moss-charger': 'MegaMossCharger', 'moss-knight': 'MossKnight', 'mossy-vagabond': 'MossKnightFat',
    'durandoo': 'AcidWalker', 'duranda': 'AcidFlyer', 'aluba': 'LazyFlyer', 'charged-lumafly': 'ZapBug',
    'uoma': 'JellyCrawler', 'ooma': 'Jellyfish', 'uumuu': 'MegaJellyfish', 'ambloom': 'FungCrawler',
    'fungling': 'FungoonBaby', 'fungoon': 'FungusFlyer', 'sporg': 'MushroomTurret',
    'fungified-husk': 'FungifiedZombie', 'shrumeling': 'MushroomBaby', 'shrumal-warrior': 'MushroomRoller',
    'shrumal-ogre': 'MushroomBrawler', 'mantis-youth': 'MantisFlyerChild', 'mantis-warrior': 'Mantis',
    'mantis-lords': 'MantisLord', 'husk-sentry': 'Sentry', 'heavy-sentry': 'SentryFat',
    'winged-sentry': 'FlyingSentrySword', 'lance-sentry': 'FlyingSentryJavelin', 'mistake': 'MageBlob',
    'folly': 'MageBalloon', 'soul-twister': 'Mage', 'soul-warrior': 'MageKnight', 'soul-master': 'MageLord',
    'husk-dandy': 'RoyalDandy', 'cowardly-husk': 'RoyalCoward', 'gluttonous-husk': 'RoyalPlumper',
    'gorgeous-husk': 'GorgeousHusk', 'great-husk-sentry': 'GreatShieldZombie', 'watcher-knights': 'BlackKnight',
    'the-collector': 'JarCollector', 'belfly': 'CeilingDropper', 'pilflip': 'FlipHopper', 'hwurmp': 'Inflater',
    'bluggsac': 'EggSac', 'dung-defender': 'DungDefender', 'white-defender': 'WhiteDefender',
    'flukefey': 'Flukefly', 'flukemon': 'Flukeman', 'flukemunga': 'FatFluke', 'flukemarm': 'FlukeMother',
    'shardmite': 'MinesCrawler', 'glimback': 'CrystalCrawler', 'crystal-hunter': 'CrystalFlyer',
    'crystal-crawler': 'LaserBug', 'husk-miner': 'ZombieMiner', 'crystallised-husk': 'BeamMiner',
    'crystal-guardian': 'MegaBeamMiner', 'furious-vengefly': 'AngryBuzzer', 'volatile-gruzzer': 'BurstingBouncer',
    'violent-husk': 'BurstingZombie', 'slobbering-husk': 'SpittingZombie', 'dirtcarver': 'BabyCentipede',
    'carver-hatcher': 'CentipedeHatcher', 'garpede': 'BigCentipede', 'corpse-creeper': 'SpiderCorpse',
    'deepling': 'MiniSpider', 'deephunter': 'ShootSpider', 'little-weaver': 'SpiderFlyer',
    'stalking-devout': 'SlashSpider', 'nosk': 'MimicSpider', 'shadow-creeper': 'AbyssCrawler',
    'lesser-mawlek': 'LesserMawlek', 'mawlurk': 'MawlekTurret', 'brooding-mawlek': 'Mawlek',
    'lightseed': 'OrangeScuttler', 'infected-balloon': 'OrangeBalloon', 'broken-vessel': 'InfectedKnight',
    'boofly': 'BlowFly', 'primal-aspid': 'SuperSpitter', 'hopper': 'Hopper', 'great-hopper': 'GiantHopper',
    'grub-mimic': 'GrubMimic', 'hiveling': 'BeeHatchling', 'hive-soldier': 'BeeStinger', 'hive-guardian': 'BigBee',
    'husk-hive': 'ZombieHive', 'hive-knight': 'HiveKnight', 'spiny-husk': 'GardenZombie', 'loodle': 'GrassHopper',
    'mantis-petra': 'MantisHeavyFlyer', 'mantis-traitor': 'HeavyMantis', 'traitor-lord': 'TraitorLord',
    'sharp-baldur': 'ColRoller', 'armoured-squit': 'ColMosquito', 'battle-obble': 'Blobble',
    'oblobbles': 'Oblobble', 'shielded-fool': 'ColShield', 'sturdy-fool': 'ColMiner',
    'winged-fool': 'ColFlyingSentry', 'heavy-fool': 'ColWorm', 'death-loodle': 'ColHopper',
    'volt-twister': 'ElectricMage', 'god-tamer': 'LobsterLancer', 'pale-lurker': 'PaleLurker',
    'zote-the-mighty': 'Zote', 'grey-prince-zote': 'GreyPrince', 'winged-zoteling': 'ZotelingBuzzer',
    'hopping-zoteling': 'ZotelingHopper', 'volatile-zoteling': 'ZotelingBalloon', 'xero': 'GhostXero',
    'gorb': 'GhostAladar', 'elder-hu': 'GhostHu', 'marmu': 'GhostMarmu', 'no-eyes': 'GhostNoEyes',
    'galien': 'GhostGalien', 'markoth': 'GhostMarkoth', 'grimmkin-novice': 'FlameBearerSmall',
    'grimmkin-master': 'FlameBearerMed', 'grimmkin-nightmare': 'FlameBearerLarge', 'grimm': 'Grimm',
    'nkg': 'NightmareGrimm', 'oro-mato': 'NailBros', 'sheo': 'Paintmaster', 'sly': 'Nailsage',
    'wingmould': 'PalaceFly', 'royal-retainer': 'WhiteRoyal', 'kingsmould': 'RoyalGuard', 'sibling': 'Sibling',
    'void-tendrils': 'AbyssTendril', 'hornet-protector': 'Hornet', 'hollow-knight': 'HollowKnight',
    'pure-vessel': 'HollowKnightPrime', 'the-radiance': 'FinalBoss', 'hunters-mark': 'HunterMark',
    'seal-of-binding': 'BindingSeal', 'weathered-mask': 'GodseekerMask',
  };

  // The Hall of Gods' fight → its statueState<X>. The dreamcatcher ones have their own.
  const HALL_PD = {
    'gruz-mother': 'GruzMother', 'vengefly-king': 'Vengefly', 'brooding-mawlek': 'BroodingMawlek',
    'false-knight': 'FalseKnight', 'failed-champion': 'FailedChampion', 'hornet-protector': 'Hornet1',
    'hornet-sentinel': 'Hornet2', 'massive-moss-charger': 'MegaMossCharger', 'flukemarm': 'Flukemarm',
    'mantis-lords': 'MantisLords', 'sisters-of-battle': 'MantisLordsExtra', 'oblobbles': 'Oblobbles',
    'hive-knight': 'HiveKnight', 'broken-vessel': 'BrokenVessel', 'lost-kin': 'LostKin', 'nosk': 'Nosk',
    'winged-nosk': 'NoskHornet', 'the-collector': 'Collector', 'god-tamer': 'GodTamer',
    'crystal-guardian': 'CrystalGuardian1', 'enraged-guardian': 'CrystalGuardian2', 'uumuu': 'Uumuu',
    'traitor-lord': 'TraitorLord', 'grey-prince-zote': 'GreyPrince', 'soul-warrior': 'MageKnight',
    'soul-master': 'SoulMaster', 'soul-tyrant': 'SoulTyrant', 'dung-defender': 'DungDefender',
    'white-defender': 'WhiteDefender', 'watcher-knights': 'WatcherKnights', 'no-eyes': 'NoEyes',
    'marmu': 'Marmu', 'xero': 'Xero', 'markoth': 'Markoth', 'galien': 'Galien', 'gorb': 'Gorb',
    'elder-hu': 'ElderHu', 'oro-mato': 'Nailmasters', 'sheo': 'Paintmaster', 'sly': 'Sly',
    'pure-vessel': 'HollowKnight', 'grimm': 'Grimm', 'nkg': 'NightmareGrimm', 'absolute-radiance': 'Radiance',
  };
  const TIERS = { at: 'completedTier1', asra: 'completedTier2', radiant: 'completedTier3' };
  const DOOR_PD = { master: 1, artist: 2, sage: 3, knight: 4, hallownest: 5 };
  const BIND_PD = { nail: 'boundNail', shell: 'boundShell', charms: 'boundCharms', soul: 'boundSoul' };

  /* ── AES-256, decryption only (FIPS-197) ─────────────────────────────── */
  const SBOX = new Uint8Array(256), INV = new Uint8Array(256);
  const xt = (a) => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff;
  const mul = (a, b) => { let r = 0; for (; b; b >>= 1, a = xt(a)) if (b & 1) r ^= a; return r; };
  (() => {
    // The S-box from the multiplicative inverse in GF(2^8) and the affine transform.
    for (let i = 0; i < 256; i++) {
      let inv = 0;
      if (i) for (let j = 1; j < 256; j++) if (mul(i, j) === 1) { inv = j; break; }
      let s = inv;
      for (let k = 1; k < 5; k++) s ^= ((inv << k) | (inv >> (8 - k))) & 0xff;
      SBOX[i] = s ^ 0x63;
      INV[SBOX[i]] = i;
    }
  })();
  const M9 = new Uint8Array(256), M11 = new Uint8Array(256), M13 = new Uint8Array(256), M14 = new Uint8Array(256);
  for (let i = 0; i < 256; i++) { M9[i] = mul(i, 9); M11[i] = mul(i, 11); M13[i] = mul(i, 13); M14[i] = mul(i, 14); }

  // The 15 round keys of a 32-byte key, as 240 bytes.
  function expandKey(key) {
    const w = new Uint8Array(240);
    w.set(key);
    let rcon = 1;
    for (let i = 32; i < 240; i += 4) {
      let t = w.slice(i - 4, i);
      if (i % 32 === 0) {
        t = [SBOX[t[1]] ^ rcon, SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]];
        rcon = xt(rcon);
      } else if (i % 32 === 16) t = t.map((b) => SBOX[b]);
      for (let j = 0; j < 4; j++) w[i + j] = w[i - 32 + j] ^ t[j];
    }
    return w;
  }

  function decryptBlock(rk, src, off, out) {
    const s = src.slice(off, off + 16);
    const add = (r) => { for (let i = 0; i < 16; i++) s[i] ^= rk[r * 16 + i]; };
    const invShiftSub = () => {
      const t = s.slice();
      // Column-major state: row r of column c is s[4c + r]; row r moves r columns to the right.
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[4 * ((c + r) % 4) + r] = INV[t[4 * c + r]];
    };
    add(14);
    for (let r = 13; r >= 1; r--) {
      invShiftSub();
      add(r);
      for (let c = 0; c < 16; c += 4) {
        const a = s[c], b = s[c + 1], d = s[c + 2], e = s[c + 3];
        s[c] = M14[a] ^ M11[b] ^ M13[d] ^ M9[e];
        s[c + 1] = M9[a] ^ M14[b] ^ M11[d] ^ M13[e];
        s[c + 2] = M13[a] ^ M9[b] ^ M14[d] ^ M11[e];
        s[c + 3] = M11[a] ^ M13[b] ^ M9[d] ^ M14[e];
      }
    }
    invShiftSub();
    add(0);
    out.set(s, off);
  }

  const bytesOf = (str) => Uint8Array.from(str, (ch) => ch.charCodeAt(0) & 0xff);
  const ROUND_KEYS = expandKey(bytesOf(KEY));

  // AES-256-ECB and PKCS7 → the plain bytes, or null if the padding doesn't check out.
  function decrypt(bytes) {
    if (!bytes.length || bytes.length % 16) return null;
    const out = new Uint8Array(bytes.length);
    for (let off = 0; off < bytes.length; off += 16) decryptBlock(ROUND_KEYS, bytes, off, out);
    const pad = out[out.length - 1];
    if (pad < 1 || pad > 16) return null;
    for (let i = out.length - pad; i < out.length; i++) if (out[i] !== pad) return null;
    return out.subarray(0, out.length - pad);
  }

  function base64(str) {
    const clean = str.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
    try { return bytesOf(atob(clean)); } catch (e) { return null; }
  }

  const utf8 = (bytes) => new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');

  /* The file's bytes → its JSON text, or null. First as the PC's .dat; if the header isn't
     there, as JSON as it is. */
  function unwrap(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (HEADER.every((x, i) => b[i] === x)) {
      let len = 0, shift = 0, i = HEADER.length;
      for (; i < b.length && i < HEADER.length + 5; i++, shift += 7) {
        len |= (b[i] & 0x7f) << shift;
        if (!(b[i] & 0x80)) { i++; break; }
      }
      const raw = base64(utf8(b.subarray(i, i + len)));
      const plain = raw && decrypt(raw);
      return plain ? utf8(plain) : null;
    }
    const text = utf8(b).trim();
    return text.startsWith('{') ? text : null;
  }

  /* The file → { ok: true, pd, mods } or { ok: false, error }, error being 'unreadable' (not a save
     from the game: it can't be decrypted or isn't JSON) or 'notSave' (JSON, but without a
     playerData that looks like the Knight's). */
  function read(bytes) {
    const text = unwrap(bytes);
    let json = null;
    try { json = text && JSON.parse(text); } catch (e) { json = null; }
    if (!json || typeof json !== 'object') return { ok: false, error: 'unreadable' };
    const pd = json.playerData;
    if (!pd || typeof pd !== 'object' || typeof pd.charmSlots !== 'number' || typeof pd.maxHealthBase !== 'number') {
      return { ok: false, error: 'notSave' };
    }
    // The mods loaded when it was saved (the Modding API writes their names beside playerData).
    const lm = json.LoadedMods;
    const mods = lm && Array.isArray(lm.keys) ? lm.keys.filter((k) => typeof k === 'string' && k).slice(0, 20) : [];
    return { ok: true, pd, mods };
  }

  /* ── playerData → the site's keys ───────────────────────────────────── */
  const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);

  // The version of a charm the game has in that number, or null.
  function versionOf(pd, n) {
    const id = CHARM_OF_NUM[n];
    if (FRAGILE[id]) return pd[FRAGILE[id] + '_unbreakable'] ? 'u' + id : 'f' + id;
    if (id === 'king') return int(pd.royalCharmState) === 4 ? 'voidheart' : int(pd.royalCharmState) === 3 ? 'kingsoul' : null;
    if (id === 'grimm') return int(pd.grimmChildLevel) === 5 ? 'melody' : 'grimmchild';
    return id || null;
  }

  function owned(pd) {
    const list = [];
    for (let n = 1; n <= 40; n++) {
      const v = pd['gotCharm_' + n] ? versionOf(pd, n) : null;
      if (v) list.push(v);
    }
    return C.ownNormalize(list);
  }

  /* The charms worn, in the order the game keeps (equippedCharms); an older save without that
     list, by the equippedCharm_<n> flags. A charm it doesn't have isn't worn. */
  function equipped(pd, have) {
    const nums = Array.isArray(pd.equippedCharms) ? pd.equippedCharms
      : Object.keys(CHARM_OF_NUM).map(Number).filter((n) => pd['equippedCharm_' + n]);
    return nums.map((n) => versionOf(pd, int(n))).filter((id) => id && have.includes(id));
  }

  function build(pd, have) {
    const grimm = int(pd.grimmChildLevel);
    return C.normalize({
      nail: int(pd.nailSmithUpgrades),
      masks: int(pd.maxHealthBase),
      vessels: Math.floor(int(pd.MPReserveMax) / 33),
      notches: int(pd.charmSlots),
      spells: { vs: int(pd.fireballLevel), dd: int(pd.quakeLevel), hw: int(pd.screamLevel) },
      // The game swaps two names: hasDashSlash is Great Slash and hasUpwardSlash, Dash Slash.
      arts: { cyclone: !!pd.hasCyclone, dash: !!pd.hasUpwardSlash, great: !!pd.hasDashSlash },
      charms: equipped(pd, have),
      hp: 0,
      dream: !!pd.hasDreamNail,
      cloak: pd.hasShadowDash ? 2 : pd.hasDash ? 1 : 0,
      // Carefree Melody (5) ends Grimmchild at the phase it was banished in, the third.
      grimm: grimm >= 5 ? 3 : Math.max(1, grimm),
    });
  }

  function journal(pd) {
    const raw = {};
    for (const [id, x] of Object.entries(JOURNAL_PD)) if (pd['killed' + x]) raw[id] = int(pd['kills' + x]);
    return HJ.normalize(raw);
  }

  function hall(pd) {
    const raw = {};
    for (const [id, x] of Object.entries(HALL_PD)) {
      const st = pd['statueState' + x];
      if (st && typeof st === 'object') raw[id] = Object.keys(TIERS).filter((d) => st[TIERS[d]]);
    }
    return HG.normalizeMarks(raw);
  }

  function door(pd) {
    const raw = { done: {}, all: [] };
    for (const [id, n] of Object.entries(DOOR_PD)) {
      const st = pd['bossDoorStateTier' + n];
      if (!st || typeof st !== 'object') continue;
      raw.done[id] = Object.keys(BIND_PD).filter((k) => st[BIND_PD[k]]);
      if (st.allBindings) raw.all.push(id);
    }
    return PN.normalizeDoor(raw);
  }

  /* playerData → a slot's snapshot, the keys written as the screens write them (an empty
     Journal, Hall or door isn't written; the charms found always are: with no list, the site
     would take them all as found). */
  function toSnapshot(pd) {
    const have = owned(pd);
    const snap = { 'hollow.build': C.encode(build(pd, have)), 'hollow.owned': JSON.stringify(have) };
    const book = journal(pd), marks = hall(pd), d = door(pd);
    if (Object.keys(book).length) snap['hollow.journal'] = JSON.stringify(book);
    if (Object.keys(marks).length) snap['hollow.hall'] = JSON.stringify(marks);
    if (PN.doorNotches(d)) snap['hollow.bindings'] = JSON.stringify(d);
    const prog = P.fromSave(pd);
    if (!P.isEmpty(prog)) snap['hollow.progress'] = JSON.stringify(prog);
    return snap;
  }

  /* What the game's own profile screen shows of a save and the site doesn't keep: the time
     played (playTime, in seconds), the completion (completionPercentage), the geo and whether
     it's Steel Soul (permadeathMode 1, or 2 once the Knight has died in it); and the pantheons
     completed (bossDoorStateTier<n>.completed), which the site keeps only as their bindings;
     and the version of the game that wrote it. Only for the preview before importing. */
  const meta = (pd) => ({
    // The game's version when it saved (1.5.78.11833…): a save from before 1.5 counts some things otherwise.
    version: typeof pd.version === 'string' && /^[0-9.]{1,24}$/.test(pd.version) ? pd.version : '',
    time: Math.max(0, Number(pd.playTime) || 0),
    completion: Math.max(0, Number(pd.completionPercentage) || 0),
    geo: Math.max(0, int(pd.geo)),
    steel: int(pd.permadeathMode) > 0,
    pantheons: Object.keys(DOOR_PD).filter((id) => {
      const st = pd['bossDoorStateTier' + DOOR_PD[id]];
      return !!st && typeof st === 'object' && !!st.completed;
    }),
  });

  HK.savefile = { CHARM_OF_NUM, JOURNAL_PD, HALL_PD, decrypt, unwrap, read, owned, build, journal, hall, door, toSnapshot, meta };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.savefile;
})();
