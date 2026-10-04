#!/usr/bin/env python3
"""tools/extract-scenes.py — what each room of the game holds, read from its files: writes
js/scene-objects.js, for the Map (js/app-map.js) and the save (js/progress.js).

Needs the game installed and UnityPy, like tools/extract-map.py (run once per game patch; it
reads every scene, some minutes):

    python3 tools/extract-scenes.py [path/to/hollow_knight_Data]

What it reads, per scene (level<N>, in BuildSettings' order):
  · its tile map's size (as tools/extract-map.py's Scenes): a point in the scene goes on the map
    with the game's formula for it (GameMap.PositionCompass), done in js/app-map.js;
  · its enemies: every object with the game's EnemyDeathEffects, and its playerDataName, the
    Hunter's Journal entry it counts for (killed<X>); read with UnityPy's TypeTreeGenerator over
    the game's own Managed/ assemblies. Grouped per entry: how many, and their middle;
  · what breaks and stays broken, by the name the save keeps it under (sceneData's
    persistentBoolItems: the object's name): breakable walls, floors you break or that give way,
    one-way walls, and the masks over hidden places (they lift once you've found them);
  · its geo rocks (sceneData's geoRocks, by name);
  · and, placed by the community's ItemChanger (its locations.json, the same pinned commit as
    tools/fetch-collectibles.js), the geo chests, the soul totems and the lore tablets, whose
    text key is the one their inspect FSM carries (kb/data/all_text.json names it).
And the Map's pictures the game draws for them (assets/world/): a soul totem and a lore tablet
from their scenes' sprites, and the geo chest from its tk2d sprite collection (TK2D_ART).
`--art` writes only the tk2d ones, without the scenes' pass (js/scene-objects.js untouched):

    python3 tools/extract-scenes.py --art [path/to/hollow_knight_Data]
"""
import json, os, re, struct, sys, urllib.request
from collections import defaultdict
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DATA = ARGS[0] if ARGS else os.path.expanduser(
    '~/.local/share/Steam/steamapps/common/Hollow Knight/hollow_knight_Data')
GAME = os.path.dirname(DATA)
OUT_JS = os.path.join(ROOT, 'js', 'scene-objects.js')
OUT_ART = os.path.join(ROOT, 'assets', 'world')
# The Map's pictures for them that the game draws with a plain sprite: a soul totem, lit, and a
# lore tablet (Greenpath's), by their scene and sprite; 128 px tall at most.
ART = {'totem': ('Abyss_04', 'Mini_totems_0002_5'), 'tablet': ('Fungus1_30', 'green_path_lore_tabs_0002_2')}
# The ones drawn with tk2d (a sprite collection over an atlas, as most of the game's animated
# things): the geo chest, closed (design/25-map-secret-icons.html), by its file, collection and sprite.
TK2D_ART = {'chest': ('sharedassets6.assets', 'Chest', 'chest0000')}
TEXT = os.path.join(ROOT, 'kb', 'data', 'all_text.json')
IC_LOCATIONS = ('https://raw.githubusercontent.com/homothetyhk/HollowKnight.ItemChanger/'
                'e57bc4e37bf7297f39b51b17af93f80c1ef8ce9e/ItemChanger/Resources/locations.json')

# What breaks and stays broken, by the start of the object's name (a copy's " (2)" aside).
SECRET = [
    ('wall', re.compile(r'^(Breakable Wall|Break Wall|Hive Break Wall|Zote_Break_wall|break_wall_masks|Breakable Grate)', re.I)),
    ('floor', re.compile(r'^(Quake Floor|mine_1_quake_floor|Break Floor|Fungus Break Floor|Collapser)', re.I)),
    ('oneway', re.compile(r'^One Way Wall', re.I)),
    ('hidden', re.compile(r'^Secret Mask', re.I)),
]

# Grimm's four fights carry an EnemyDeathEffects whose playerDataName the game ships as "Hornet"
# (the raw component in level392/393/443/444 holds 06 00 00 00 "Hornet": not a misread typetree).
# It never fires: their HealthManager has hasSpecialDeath, and HealthManager.Die returns through
# NonFatalHit before EnemyDeathEffects.RecieveDeathEvent, which records the Journal kill. The game
# marks them otherwise: Grimm_Main_Tent's "Defeated NPC" FSM sets killedGrimm, and Grimm_Nightmare's
# "Grimm Control" FSM calls EnemyDeathEffects.RecordKillForJournal("NightmareGrimm") (checked on
# patch 1.5.12620). So the entry they count for is named by their scene.
JOURNAL_BY_SCENE = {'Grimm_Main_Tent_boss': 'Grimm', 'GG_Grimm': 'Grimm',
                    'Grimm_Nightmare': 'NightmareGrimm', 'GG_Grimm_Nightmare': 'NightmareGrimm'}

def comps(go):
    return [c.component if hasattr(c, 'component') else c for c in go.m_Components]

def tilemap_size(o):
    """A tk2dTileMap's width and height, in tiles (= units): the pair before its partition size
    (32, 32), as tools/extract-map.py reads it."""
    raw = o.get_raw_data()
    ints = struct.unpack_from('<%di' % (min(len(raw), 2400) // 4), raw)
    for i in range(len(ints) - 3):
        if ints[i + 2] == ints[i + 3] == 32 and 4 <= ints[i] <= 3000 and 4 <= ints[i + 1] <= 3000:
            return [ints[i], ints[i + 1]]
    return None

def tk2d_art():
    """TK2D_ART's pictures: the sprite's rectangle of its collection's atlas (its UVs; turned back
    upright when tk2d stored it flipped), trimmed, 128 px at most."""
    for key, (file, coll, name) in TK2D_ART.items():
        env = UnityPy.load(os.path.join(DATA, file))
        gen = TypeTreeGenerator(env.objects[0].assets_file.unity_version)
        gen.load_local_game(GAME)
        env.typetree_generator = gen
        objs = {o.path_id: o for o in env.objects}
        data = None
        for o in env.objects:
            if o.type.name != 'MonoBehaviour':
                continue
            try:
                d = o.read_typetree()
            except Exception:
                continue
            if d.get('spriteCollectionName') == coll and d.get('spriteDefinitions'):
                data = d
                break
        sd = next(x for x in data['spriteDefinitions'] if x.get('name') == name)
        tex = objs[data['textures'][sd.get('materialId', 0)]['m_PathID']].read().image.convert('RGBA')
        w, h = tex.size
        us, vs = [u['x'] for u in sd['uvs']], [u['y'] for u in sd['uvs']]
        im = tex.crop((round(min(us) * w), round((1 - max(vs)) * h), round(max(us) * w), round((1 - min(vs)) * h)))
        if sd.get('flipped'):
            im = im.rotate(90, expand=True)
        im = im.crop(im.getbbox())
        im.thumbnail((128, 128))
        os.makedirs(OUT_ART, exist_ok=True)
        im.save(os.path.join(OUT_ART, key + '.png'), optimize=True)
        print('assets/world/%s.png %dx%d' % ((key,) + im.size))

def main():
    tk2d_art()
    if '--art' in sys.argv:
        return
    all_text = json.load(open(TEXT, encoding='utf-8'))
    text = set(all_text['EN'])
    # A text of the game's, as the site writes it: its pages as paragraphs, its line breaks kept,
    # curly quotes straight (CLAUDE.md).
    def clean(v):
        v = re.sub(r'<br\s*/?>', '\n', v or '')
        v = '\n\n'.join(x.strip() for x in re.split(r'<page>', v) if x.strip())
        return v.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    ic = json.load(urllib.request.urlopen(IC_LOCATIONS))
    by_scene = defaultdict(list)          # scene → [(kind, ItemChanger location)]
    for loc in ic.values():
        for kind, pre in (('chest', 'Geo_Chest-'), ('totem', 'Soul_Totem-'), ('tablet', 'Lore_Tablet-')):
            if loc['name'].startswith(pre) and loc.get('sceneName'):
                by_scene[loc['sceneName']].append((kind, loc))

    gg = UnityPy.load(os.path.join(DATA, 'globalgamemanagers'))
    bs = next(o.read() for o in gg.objects if o.type.name == 'BuildSettings')
    gen = None
    sizes, enemies, secrets, rocks, chests, totems, tablets = {}, {}, {}, {}, {}, {}, {}
    for i, path in enumerate(bs.scenes):
        scene = os.path.splitext(os.path.basename(path))[0]
        env = UnityPy.load(os.path.join(DATA, 'level%d' % i))
        trs = {}
        for o in env.objects:
            if o.type.name in ('Transform', 'RectTransform'):
                try:
                    trs[o.path_id] = o.read()
                except Exception:
                    pass
        def world(t):
            chain = []
            while t is not None:
                chain.append(t)
                t = trs.get(t.m_Father.path_id) if t.m_Father.path_id else None
            x = y = 0.0; sx = sy = 1.0
            for u in reversed(chain):
                q = u.m_LocalPosition
                x, y = x + q.x * sx, y + q.y * sy
                sx, sy = sx * u.m_LocalScale.x, sy * u.m_LocalScale.y
            return [round(x, 2), round(y, 2)]
        def where(go):
            t = next((c for c in comps(go) if c.type.name in ('Transform', 'RectTransform')), None)
            return world(trs.get(t.path_id) or t.read()) if t else None
        # Every object's position by name (the first of that name), for ItemChanger's places.
        named = {}
        for o in env.objects:
            if o.type.name == 'GameObject':
                try:
                    g = o.read()
                except Exception:
                    continue
                if g.m_Name not in named:
                    named[g.m_Name] = g
        size, foes, inspect = None, [], []
        seen_secret, seen_rock = set(), set()
        for o in env.objects:
            if o.type.name != 'MonoBehaviour':
                continue
            try:
                mb = o.read(check_read=False)
                cls = mb.m_Script.read().m_ClassName
            except Exception:
                continue
            if cls == 'tk2dTileMap' and size is None:
                size = tilemap_size(o)
                continue
            if cls not in ('PersistentBoolItem', 'GeoRock', 'PlayMakerFSM') and not cls.startswith('EnemyDeathEffects'):
                continue
            try:
                g = mb.m_GameObject.read()
            except Exception:
                continue
            name = g.m_Name
            if cls.startswith('EnemyDeathEffects'):
                foes.append((o, g))
            elif cls == 'GeoRock' and name not in seen_rock:
                seen_rock.add(name)
                rocks.setdefault(scene, []).append([name, *where(g)])
            elif cls == 'PersistentBoolItem' and name not in seen_secret:
                base = re.sub(r' ?\(\d+\)$', '', name)
                kind = next((k for k, rx in SECRET if rx.match(base)), None)
                if kind:
                    seen_secret.add(name)
                    secrets.setdefault(scene, []).append([kind, name, *where(g)])
            elif cls == 'PlayMakerFSM' and re.search(r'inspect|tablet', name, re.I):
                # Its text: a key of the game's text (with an underscore: the bare ones are the
                # FSM's events, ENTER, INSPECT…).
                keys = {k for k in (m.decode() for m in re.findall(rb'[A-Z][A-Z0-9_]{3,40}', o.get_raw_data())) if '_' in k} & text
                if keys:
                    inspect.append((where(g), sorted(keys)))
        if size:
            sizes[scene] = size
        for key, (sc, sprite) in ART.items():
            if sc != scene:
                continue
            # Its SpriteRenderer's sprite (kept in the game's shared assets, not the scene's).
            for o in env.objects:
                if o.type.name != 'SpriteRenderer':
                    continue
                r = o.read()
                sp = r.m_Sprite.read() if r.m_Sprite.path_id else None
                if sp and sp.m_Name == sprite:
                    im = sp.image.convert('RGBA')
                    im.thumbnail((128, 128))
                    os.makedirs(OUT_ART, exist_ok=True)
                    im.save(os.path.join(OUT_ART, key + '.png'), optimize=True)
                    break
        # The enemies: their Journal entry (playerDataName), grouped, at their middle.
        if foes:
            if gen is None:
                gen = TypeTreeGenerator(env.objects[0].assets_file.unity_version)
                gen.load_local_game(GAME)
            env.typetree_generator = gen
            group = defaultdict(list)
            for o, g in foes:
                try:
                    pd = o.read_typetree().get('playerDataName')
                except Exception:
                    pd = None
                if pd == 'Hornet' and scene in JOURNAL_BY_SCENE:
                    pd = JOURNAL_BY_SCENE[scene]
                if pd:
                    group[pd].append(where(g))
            if group:
                enemies[scene] = [[pd, len(ps), round(sum(p[0] for p in ps) / len(ps), 2), round(sum(p[1] for p in ps) / len(ps), 2)]
                                  for pd, ps in sorted(group.items())]
        # ItemChanger's places in this scene.
        for kind, loc in by_scene.get(scene, ()):
            name = loc.get('objectName')
            if kind == 'tablet':
                # The tablet's own picture (its tag's objectPath), and the inspect region nearest it.
                tag = next((t for t in (loc.get('tags') or []) if t.get('objectPath')), None)
                spot = tag and named.get(tag['objectPath'].split('/')[-1])
                p = where(spot) if spot else None
                if not inspect:
                    print('  no text for', loc['name']); continue
                best = min(inspect, key=lambda r: (r[0][0] - p[0]) ** 2 + (r[0][1] - p[1]) ** 2) if p else inspect[0]
                key = best[1][0]
                tablets.setdefault(scene, []).append([loc['name'].split('-', 1)[1], key, *(p or best[0]),
                                                      {'es': clean(all_text['ES'].get(key)), 'en': clean(all_text['EN'].get(key))}])
                continue
            g = named.get(name)
            if not g:
                print('  not found:', loc['name'], name); continue
            (chests if kind == 'chest' else totems).setdefault(scene, []).append([name, *where(g)])
        print(i, scene, len(enemies.get(scene, [])), len(secrets.get(scene, [])), flush=True)

    def block(name, obj, note):
        rows = ['    %s: %s,' % (json.dumps(k), json.dumps(v, separators=(',', ':'), ensure_ascii=False)) for k, v in sorted(obj.items())]
        return ['  // ' + note, '  const %s = {' % name, *rows, '  };']
    count = lambda d: sum(len(v) for v in d.values())
    lines = [
        "/* js/scene-objects.js — GENERATED by tools/extract-scenes.py from the game's files: don't edit by hand.",
        "   What each room holds, in its scene's own units (x rightwards, y upwards from its bottom-left):",
        "     SIZES    scene → [width, height] of its tile map (a point → the map: js/app-map.js)",
        "     ENEMIES  scene → [[playerDataName, how many, x, y]]: the Hunter's Journal entry (killed<X>), at their middle",
        "     SECRETS  scene → [[kind, name, x, y]]: wall, floor, oneway, hidden (a hidden place's mask); by the",
        "              name the save keeps it under (sceneData.persistentBoolItems)",
        "     ROCKS    scene → [[name, x, y]]: geo rocks (sceneData.geoRocks)",
        "     CHESTS, TOTEMS  scene → [[name, x, y]]: ItemChanger's geo chests and soul totems",
        "     TABLETS  scene → [[ItemChanger's name, text key, x, y, { es, en }]]: the lore tablets and their text",
        "              (kb/data/all_text.json, the game's own)",
        "   %d enemies' groups, %d secrets, %d rocks, %d chests, %d totems, %d tablets. */" % (
            count(enemies), count(secrets), count(rocks), count(chests), count(totems), count(tablets)),
        '(function () {',
        "  'use strict';",
        '  const HK = globalThis.HK || (globalThis.HK = {});',
        *block('SIZES', sizes, "Each scene's tile map."),
        *block('ENEMIES', enemies, 'The enemies, per Journal entry.'),
        *block('SECRETS', secrets, 'What breaks and stays broken.'),
        *block('ROCKS', rocks, 'Geo rocks.'),
        *block('CHESTS', chests, 'Geo chests.'),
        *block('TOTEMS', totems, 'Soul totems.'),
        *block('TABLETS', tablets, 'Lore tablets.'),
        '  HK.sceneObjects = { SIZES, ENEMIES, SECRETS, ROCKS, CHESTS, TOTEMS, TABLETS };',
        "  if (typeof module !== 'undefined' && module.exports) module.exports = HK.sceneObjects;",
        '})();', '']
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(next(l for l in lines if 'enemies\' groups' in l))

if __name__ == '__main__':
    main()
