#!/usr/bin/env python3
"""tools/extract-map.py — the game's own map, read from its files: writes js/map.js and assets/map/.

Needs the game installed (Steam: `.../steamapps/common/Hollow Knight/hollow_knight_Data`) and
UnityPy (`python3 -m pip install UnityPy`, in a venv). It's run once per game patch:

    python3 tools/extract-map.py [path/to/hollow_knight_Data]

What it reads: the `Game_Map` object in resources.assets, the map the game shows in its
inventory. Its children are the areas and, inside each, one object per room, named by its scene,
with its position and a SpriteRenderer. Each room has two drawings, as in the game:
  · the rough one, Cornifer's (the SpriteRenderer's sprite, "<scene>_Cornifer"), shown once you
    buy the area's map;
  · the full one (the first field of the room's script, a sprite named as the scene), drawn by
    the Quill once you've been there (playerData.scenesMapped).
Both are baked with the room's tint (its SpriteRenderer's colour: the area's, the game's own) and
packed into two atlases, assets/map/rooms-full.png and rooms-rough.png. The rooms' pins (benches,
stag stations, whispering roots, lifeblood cocoons, trams, hot springs, vendors, the grubs) keep
their position, and their pictures go into assets/map/pins.png.

Coordinates are the map's own units, in Game_Map's frame: an area's position plus its room's.
The save's shadeMapPos and dreamgateMapPos are in that same frame. y grows upwards, as in Unity.
"""
import json, os, re, struct, sys, urllib.request
from collections import deque
import UnityPy
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/.local/share/Steam/steamapps/common/Hollow Knight/hollow_knight_Data')
OUT_JS = os.path.join(ROOT, 'js', 'map.js')
OUT_DIR = os.path.join(ROOT, 'assets', 'map')

# The pins kept, by the name of the room's child (the game's own), and the site's id for each.
PINS = {
    'pin_bench': 'bench', 'pin_stag_station': 'stag', 'pin_dream_tree': 'root', 'pin_blue_health': 'cocoon',
    'pin_tram': 'tram', 'pin_spa': 'spa', 'pin_sly': 'vendor', 'pin_charm_slug': 'vendor', 'pin_grub_king': 'grubfather',
    'pin_colosseum': 'colosseum', 'Pin_Black_Egg': 'blackegg',
    # The warrior dreams' graves: "backer ghosts" in the game's files (backers designed them).
    'Pin_Backer Ghost': 'grave',
}
# The map's own titles: an area's (its "Area Name", named here by the site's area, js/rooms.js)
# and a place's ("Sub Area Name", hung on the room it names, with its text key).
AREA_ID = {'Crossroads': 'crossroads', 'Waterways': 'waterways', 'Cliffs': 'cliffs', 'Kingdoms_Edge': 'edge',
           'Green_Path': 'greenpath', 'Fog_Canyon': 'fog', 'Fungal Wastes': 'fungal', 'Queens_Gardens': 'gardens',
           'Deepnest': 'deepnest', 'Town_Tutorial': 'dirtmouth', 'Resting_Grounds': 'resting', 'Crystal Peak': 'crystal',
           'Ancient Basin': 'basin', 'City of Tears': 'city'}
TEXT = os.path.join(ROOT, 'kb', 'data', 'all_text.json')

# The rooms the map doesn't draw (shops, houses, the Colosseum's arenas…) are placed on the one
# you enter them from: the nearest drawn room through the game's doors, from the community
# randomizer's transitions.json (pinned, like tools/fetch-rooms.js). Two are placed on the game's
# own pin for them instead.
TRANSITIONS = ('https://raw.githubusercontent.com/homothetyhk/RandomizerMod/'
               'cad3d5a7b73ed3ddf4af43795b20c23ced14bb4c/RandomizerMod/Resources/Data/transitions.json')
# The community's ItemChanger (LGPL-2.1), the same pinned commit as tools/fetch-collectibles.js:
# its locations.json names each place's scene and the object in it (or its coordinates there).
IC_LOCATIONS = ('https://raw.githubusercontent.com/homothetyhk/HollowKnight.ItemChanger/'
                'e57bc4e37bf7297f39b51b17af93f80c1ef8ce9e/ItemChanger/Resources/locations.json')
HOST_PIN = {'Room_Colosseum_Bronze': 'colosseum', 'Room_Colosseum_Silver': 'colosseum', 'Room_Colosseum_Gold': 'colosseum',
            'Deepnest_Spider_Town': ('dreamer', 'herrah')}

# Top-level children of Game_Map that aren't areas. Some are pins placed in the map's frame, named
# by their room (the flames) or by who they are (the Dreamers); the rest only lend their picture:
# the shade, the Dreamgate, the compass (you) and the markers you place (Blue, Red, Yellow, White).
GROUP_PINS = {'Flame Pins': 'flame', 'Dreamer Pins': 'dreamer'}
DREAMERS = {'Pin_Watcher': 'lurien', 'Pin_Teacher': 'monomon', 'Pin_Beast': 'herrah'}
ICONS = {'Shade Pos': ('shade', 'Map_shade_head'), 'Dream_Gate_Pin': ('dreamgate', 'glow'), 'Compass Icon': ('compass', None),
         'Map Markers': None}

def comps(go):
    return [c.component if hasattr(c, 'component') else c for c in go.m_Components]

def of_type(go, *names):
    return [c for c in comps(go) if c.type.name in names]

def transform(go):
    return of_type(go, 'Transform', 'RectTransform')[0].read()

def children(go):
    return [ch.read().m_GameObject.read() for ch in transform(go).m_Children]

def tinted(img, color):
    """The sprite multiplied by its renderer's colour, as the game draws it."""
    img = img.convert('RGBA')
    r, g, b, a = img.split()
    r = r.point(lambda v: int(v * color.r)); g = g.point(lambda v: int(v * color.g))
    b = b.point(lambda v: int(v * color.b)); a = a.point(lambda v: int(v * color.a))
    return Image.merge('RGBA', (r, g, b, a))

def whole(sprite):
    """The sprite's whole picture, as big as its rect: the game's files keep only the part with
    something drawn (textureRect, placed at textureRectOffset from the rect's bottom-left), and
    the pivot, the room's position, is the middle of the whole rect, not of that part."""
    im = sprite.image.convert('RGBA')
    rw, rh = round(sprite.m_Rect.width), round(sprite.m_Rect.height)
    if im.size == (rw, rh):
        return im
    off = sprite.m_RD.textureRectOffset
    canvas = Image.new('RGBA', (rw, rh), (0, 0, 0, 0))
    canvas.paste(im, (round(off.x), rh - round(off.y) - im.size[1]))
    return canvas

class Scenes:
    """The game's scenes (level<N>, their order is BuildSettings'), read one at a time: each
    one's tile map size (its tk2dTileMap's width and height, in tiles = world units) and its
    objects' world positions, by name and by path ("Parent\\Child")."""
    def __init__(self):
        gg = UnityPy.load(os.path.join(DATA, 'globalgamemanagers'))
        bs = next(o.read() for o in gg.objects if o.type.name == 'BuildSettings')
        self.index = {os.path.splitext(os.path.basename(sc))[0]: i for i, sc in enumerate(bs.scenes)}
        self.cache = {}

    def get(self, scene):
        if scene in self.cache:
            return self.cache[scene]
        out = None
        if scene in self.index:
            env = UnityPy.load(os.path.join(DATA, 'level%d' % self.index[scene]))
            trs = {o.path_id: o.read() for o in env.objects if o.type.name in ('Transform', 'RectTransform')}
            size, objs = None, []
            def world(t):
                chain = []
                while t is not None:
                    chain.append(t)
                    t = trs.get(t.m_Father.path_id) if t.m_Father.path_id else None
                x = y = 0.0; sx = sy = 1.0; path = []
                for u in reversed(chain):
                    q = u.m_LocalPosition
                    x, y = x + q.x * sx, y + q.y * sy
                    sx, sy = sx * u.m_LocalScale.x, sy * u.m_LocalScale.y
                    path.append(u.m_GameObject.read().m_Name)
                return x, y, '\\'.join(path)
            for o in env.objects:
                if o.type.name != 'GameObject':
                    continue
                g = o.read()
                t = next((c for c in comps(g) if c.type.name in ('Transform', 'RectTransform')), None)
                if t is None:
                    continue
                x, y, path = world(trs.get(t.path_id) or t.read())
                objs.append((g.m_Name, path, x, y))
                if size is None and (g.m_Name == 'TileMap' or g.m_Name.endswith('-TileMap')):
                    # tk2dTileMap: width, height, then its partition size (32, 32).
                    for c in of_type(g, 'MonoBehaviour'):
                        raw = c.deref().get_raw_data()
                        ints = struct.unpack_from('<%di' % (min(len(raw), 2400) // 4), raw)
                        for i in range(len(ints) - 3):
                            if ints[i + 2] == ints[i + 3] == 32 and 4 <= ints[i] <= 3000 and 4 <= ints[i + 1] <= 3000:
                                size = (ints[i], ints[i + 1]); break
                        if size: break
            out = (size, objs)
        self.cache[scene] = out
        return out

    def find(self, scene, name):
        """An object's world position: by its path's end ("Folder\\Heart Piece") or its name."""
        got = self.get(scene)
        if not got or not name:
            return None
        for n, path, x, y in got[1]:
            if (path.endswith(name) if '\\' in name else n == name):
                return x, y
        return None

def pack(images, width=2048, pad=2):
    """A simple shelf packing: (name → image) into one atlas; returns it and each rect."""
    items = sorted(images.items(), key=lambda kv: -kv[1].size[1])
    x = y = shelf = 0
    rects = {}
    for name, im in items:
        w, h = im.size
        if x + w + pad > width:
            x, y, shelf = 0, y + shelf + pad, 0
        rects[name] = (x, y, w, h)
        x += w + pad
        shelf = max(shelf, h)
    atlas = Image.new('RGBA', (width, y + shelf), (0, 0, 0, 0))
    for name, im in items:
        rx, ry, _, _ = rects[name]
        atlas.paste(im, (rx, ry))
    return atlas, rects

def main():
    env = UnityPy.load(os.path.join(DATA, 'resources.assets'))
    sprites = {o.path_id: o for o in env.objects if o.type.name == 'Sprite'}
    root = next(o.read() for o in env.objects if o.type.name == 'GameObject' and o.read().m_Name == 'Game_Map')

    rooms, full_imgs, rough_imgs, pins, pin_imgs, areas, anchors = {}, {}, {}, [], {}, [], {}

    def sprite_of(go):
        srs = of_type(go, 'SpriteRenderer')
        if not srs:
            return None
        sr = srs[0].read()
        return sr.m_Sprite.read().image.convert('RGBA') if sr.m_Sprite.path_id else None

    text = json.load(open(TEXT, encoding='utf-8'))
    subs = []
    def label_key(go):
        # The label's text key: the upper-case word in its script's data that the game's text has.
        for mb in of_type(go, 'MonoBehaviour'):
            for w in re.findall(rb'[A-Z][A-Z0-9_]{3,40}', mb.deref().get_raw_data()):
                w = w.decode()
                if w in text['EN'] and w in text['ES']:
                    return w
        return ''

    for top in children(root):
        name = top.m_Name
        if name in GROUP_PINS:
            kind = GROUP_PINS[name]
            for pin in children(top):
                pt = transform(pin)
                pins.append({'kind': kind, 'scene': DREAMERS.get(pin.m_Name, pin.m_Name),
                             'x': round(pt.m_LocalPosition.x, 3), 'y': round(pt.m_LocalPosition.y, 3)})
                key = kind if kind != 'dreamer' else 'dreamer-' + DREAMERS.get(pin.m_Name, pin.m_Name)
                if key not in pin_imgs:
                    im = sprite_of(pin)
                    if im: pin_imgs[key] = im
            continue
        if name in ICONS:
            if name == 'Map Markers':
                for pin in children(top):
                    key = 'marker-' + pin.m_Name[0].lower()
                    if key not in pin_imgs:
                        im = sprite_of(pin)
                        if im: pin_imgs[key] = im
            else:
                key, child = ICONS[name]
                src = next((c for c in children(top) if c.m_Name == child), None) if child else top
                im = sprite_of(src) if src else None
                if im: pin_imgs[key] = im
            continue
        area = top
        at = transform(area)
        ax, ay = at.m_LocalPosition.x, at.m_LocalPosition.y
        room_count = 0
        for g in children(area):
            t = transform(g)
            gx, gy = ax + t.m_LocalPosition.x, ay + t.m_LocalPosition.y
            if g.m_Name.startswith('Sub Area Name'):
                key = label_key(g)
                if key == 'KINGS_PASS': subs.append({'scene': 'Tutorial_01', 'key': key})
                continue
            if g.m_Name == 'Grub Pins':
                for pin in children(g):
                    pt = transform(pin)
                    pins.append({'kind': 'grub', 'scene': pin.m_Name.split(' ')[0],
                                 'x': round(gx + pt.m_LocalPosition.x, 3), 'y': round(gy + pt.m_LocalPosition.y, 3)})
                continue
            srs = of_type(g, 'SpriteRenderer')
            sr = srs[0].read() if srs else None
            if not sr or not sr.m_Sprite.path_id:
                # A room the map draws inside another (the Ancestral Mound…): only its position.
                if not g.m_Name.startswith(('Area Name', 'Sub Area', 'Next Area')):
                    anchors[g.m_Name] = [round(gx, 3), round(gy, 3)]
                continue
            rough = sr.m_Sprite.read()
            # The full drawing: the first field of the room's script (a PPtr to a Sprite).
            full = rough
            for mb in of_type(g, 'MonoBehaviour'):
                raw = mb.deref().get_raw_data()
                if len(raw) >= 44:
                    fid, pid = struct.unpack_from('<iq', raw, 32)
                    if fid == 0 and pid in sprites:
                        full = sprites[pid].read()
                        break
            ppu = rough.m_PixelsToUnits
            scale = (t.m_LocalScale.x, t.m_LocalScale.y)
            name = g.m_Name
            full_img = tinted(whole(full), sr.m_Color)
            rough_img = tinted(whole(rough), sr.m_Color)
            fppu = full.m_PixelsToUnits
            # The room's box in map units, centred on its position (the sprites' pivot is the middle).
            w = full_img.size[0] / fppu * scale[0]
            h = full_img.size[1] / fppu * scale[1]
            rw = rough_img.size[0] / ppu * scale[0]
            rh = rough_img.size[1] / ppu * scale[1]
            rooms[name] = {'area': len(areas), 'x': round(gx, 3), 'y': round(gy, 3),
                           'w': round(w, 3), 'h': round(h, 3), 'rw': round(rw, 3), 'rh': round(rh, 3)}
            full_imgs[name] = full_img
            rough_imgs[name] = rough_img
            # A second drawing the game swaps in when something changes in the world (its FSM
            # "map_altsprite": Dirtmouth's lift to Crystal Peak, a wall broken in Deepnest…).
            # Kept when it's a real drawing of the same size (Abyss_03_c's is an empty dot).
            for mb in of_type(g, 'MonoBehaviour'):
                raw = mb.deref().get_raw_data()
                if b'map_altsprite' not in raw:
                    continue
                for off in range(28, len(raw) - 11, 4):
                    fid, pid = struct.unpack_from('<iq', raw, off)
                    if fid == 0 and pid in sprites:
                        alt = tinted(whole(sprites[pid].read()), sr.m_Color)
                        if alt.size == full_img.size:
                            full_imgs[name + '#alt'] = alt
                        break
            room_count += 1
            for pin in children(g):
                if pin.m_Name.startswith('Sub Area Name'):
                    key = label_key(pin)
                    if key: subs.append({'scene': name, 'key': key})
                    continue
                kind = PINS.get(pin.m_Name.split(' (')[0])
                # The characters' own pins (Jiji, Iselda, Lemm, the Nailsmith…): "pin_<who>".
                if not kind and pin.m_Name.startswith('pin_') and of_type(pin, 'SpriteRenderer'):
                    who = pin.m_Name[4:].replace(' ', '_')
                    pt = transform(pin)
                    pins.append({'kind': 'npc', 'scene': who, 'x': round(gx + pt.m_LocalPosition.x * scale[0], 3),
                                 'y': round(gy + pt.m_LocalPosition.y * scale[1], 3)})
                    s_ = of_type(pin, 'SpriteRenderer')[0].read()
                    if s_.m_Sprite.path_id:
                        pin_imgs['npc-' + who] = s_.m_Sprite.read().image.convert('RGBA')
                    continue
                if not kind:
                    continue
                pt = transform(pin)
                # Its place inside the room, stretched as the room is (some rooms are scaled).
                px, py = gx + pt.m_LocalPosition.x * scale[0], gy + pt.m_LocalPosition.y * scale[1]
                # A pin far outside its own room (the Hive's root, 18 units away in the game's
                # files) goes to the room's centre.
                if abs(px - gx) > w / 2 + 3 or abs(py - gy) > h / 2 + 3:
                    print(f'  {kind} pin of {name} is outside its room: placed at its centre')
                    px, py = gx, gy
                pins.append({'kind': kind, 'scene': name, 'x': round(px, 3), 'y': round(py, 3)})
                psr = of_type(pin, 'SpriteRenderer')
                if kind not in pin_imgs and psr:
                    s = psr[0].read()
                    if s.m_Sprite.path_id:
                        pin_imgs[kind] = s.m_Sprite.read().image.convert('RGBA')
        areas.append({'name': area.m_Name, 'x': round(ax, 3), 'y': round(ay, 3), 'rooms': room_count})

    os.makedirs(OUT_DIR, exist_ok=True)
    full_atlas, full_rects = pack(full_imgs)
    rough_atlas, rough_rects = pack(rough_imgs)
    pin_atlas, pin_rects = pack(pin_imgs, width=512)
    full_atlas.save(os.path.join(OUT_DIR, 'rooms-full.png'), optimize=True)
    rough_atlas.save(os.path.join(OUT_DIR, 'rooms-rough.png'), optimize=True)
    pin_atlas.save(os.path.join(OUT_DIR, 'pins.png'), optimize=True)

    for name, r in rooms.items():
        r['full'] = list(full_rects[name])
        r['rough'] = list(rough_rects[name])
        if name + '#alt' in full_rects:
            r['alt'] = list(full_rects[name + '#alt'])
    # Where things are, exactly: the game's own formula for a point in a room (GameMap.
    # PositionCompass): the room drawing's left edge plus (x / the scene's width) of the drawing's
    # width, the same upwards. The scene's width is its tile map's (Scenes).
    scenes_ = Scenes()
    def in_room(scene, x, y):
        r = rooms[scene]
        got = scenes_.get(scene)
        if not got or not got[0]:
            return None
        W, H = got[0]
        fx, fy = min(1, max(0, x / W)), min(1, max(0, y / H))
        return [round(r['x'] - r['rw'] / 2 + fx * r['rw'], 3), round(r['y'] - r['rh'] / 2 + fy * r['rh'], 3)]

    # What's in a room the map doesn't draw goes on the door you enter it by, in the nearest drawn
    # room through the game's doors (the community randomizer's transitions.json, pinned).
    with urllib.request.urlopen(TRANSITIONS) as res:
        trans = json.load(res).values()
    edges = {}
    for tr in trans:
        a, door = tr['SceneName'], tr.get('DoorName')
        tgt = tr.get('VanillaTarget') or ''
        b, bdoor = tgt.split('[')[0], tgt[tgt.find('[') + 1:-1] if '[' in tgt else ''
        if b:
            edges.setdefault(a, []).append((b, door)); edges.setdefault(b, []).append((a, bdoor))
    ic = json.load(urllib.request.urlopen(IC_LOCATIONS))
    wanted = {loc.get('sceneName') for loc in ic.values() if loc.get('sceneName')}
    wanted |= set(re.findall(r"scene: '([^']+)'", open(os.path.join(ROOT, 'js', 'collectibles.js'), encoding='utf-8').read()))
    hosts = {}
    for sc in sorted(wanted | set(edges)):
        if sc in rooms or sc in anchors:
            continue
        hp = HOST_PIN.get(sc)
        if hp:
            kind, who = hp if isinstance(hp, tuple) else (hp, None)
            p = next(p for p in pins if p['kind'] == kind and (who is None or p['scene'] == who))
            hosts[sc] = [p['x'], p['y']]
            continue
        # Breadth first to a drawn room (or one drawn inside another), keeping the door there.
        seen, queue = {sc}, deque([(sc, None)])
        while queue:
            cur, came = queue.popleft()
            if cur in anchors:
                hosts[sc] = anchors[cur]; break
            if cur in rooms:
                door = next((d for (n, d) in edges.get(cur, []) if n == came), None)
                q = scenes_.find(cur, door)
                hosts[sc] = (q and in_room(cur, *q)) or [rooms[cur]['x'], rooms[cur]['y']]
                break
            for n, _ in sorted(edges.get(cur, ()), key=lambda e: e[0]):
                if n not in seen:
                    seen.add(n); queue.append((n, cur))
        if sc not in hosts and sc in wanted:
            print('  no place for', sc)

    def point(scene):
        if scene in rooms: return [rooms[scene]['x'], rooms[scene]['y']]
        return anchors.get(scene) or hosts.get(scene)
    # Each of ItemChanger's places, where it is: its object in its scene (or its coordinates,
    # or the object whose script gives it); in an undrawn room, that room's door. → [x, y, scene]
    spots, missed = {}, []
    # The special places ItemChanger gives no object for: the object that stands for them.
    SPECIAL_OBJ = {'WhisperingRootLocation': 'Dream Plant', 'ShadeCloakLocation': 'Dish Plat',
                   'ShadeSoulLocation': 'Shaman Sprite', 'AbyssShriekLocation': 'Scream 2 Get',
                   'TukDefendersCrestLocation': 'Tuk NPC'}
    def locate(loc):
        for k in ('trueLocation', 'chestLocation', 'falseLocation'):
            if loc.get(k): return locate(loc[k])
        scene = loc.get('sceneName')
        if not scene: return None
        if scene not in rooms:
            q = point(scene)
            return q and [q[0], q[1], scene]
        if 'x' in loc and 'y' in loc:
            q = in_room(scene, loc['x'], loc['y'])
        else:
            kind = loc.get('$type', '').split(',')[0].split('.')[-1]
            obj = loc.get('objectName') or ''
            w = (scenes_.find(scene, obj) or scenes_.find(scene, obj.replace('_', ' '))
                 or scenes_.find(scene, loc.get('fsmParent')) or scenes_.find(scene, SPECIAL_OBJ.get(kind)))
            q = w and in_room(scene, *w)
        if not q:
            missed.append(loc.get('name')); q = point(scene)
        return q and [q[0], q[1], scene]
    for name, loc in ic.items():
        q = locate(loc)
        if q: spots[name] = q
    print(f'  {len(spots)} places located ({len(missed)} at their room\'s centre: {", ".join(missed[:12])}…)')

    xs = [r['x'] - r['w'] / 2 for r in rooms.values()] + [r['x'] + r['w'] / 2 for r in rooms.values()]
    ys = [r['y'] - r['h'] / 2 for r in rooms.values()] + [r['y'] + r['h'] / 2 for r in rooms.values()]
    bounds = [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)]

    def js(o):
        return json.dumps(o, separators=(',', ':'), ensure_ascii=False)
    norm = lambda x: x.replace('\u2019', "'").replace('\u2018', "'").strip()
    sub_lines = [f"    [{json.dumps(sb['scene'])}, {js({'es': norm(text['ES'][sb['key']]), 'en': norm(text['EN'][sb['key']])})}],   // {sb['key']}"
                 for sb in subs if sb['scene'] in rooms or sb['scene'] in anchors]
    area_ids = [AREA_ID.get(a['name'], '') for a in areas]

    def js(o):
        return json.dumps(o, separators=(',', ':'), ensure_ascii=False)
    room_lines = [f"    {json.dumps(n)}: {js([r['area'], r['x'], r['y'], r['w'], r['h'], r['rw'], r['rh'], r['full'], r['rough']] + ([r['alt']] if 'alt' in r else []))}," for n, r in rooms.items()]
    pin_lines = [f"    {js([p['kind'], p['scene'], p['x'], p['y']])}," for p in pins]
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join([
            "/* js/map.js — GENERATED by tools/extract-map.py from the game's files: don't edit by hand.",
            "   The game's own map (its Game_Map object), in its own units, y upwards:",
            "     ROOMS   scene → [area, x, y, w, h, roughW, roughH, full, rough]: the room's centre and",
            "             size, and where its two drawings are in assets/map/rooms-full.png and",
            "             rooms-rough.png ([x, y, w, h] in pixels), each already in its area's tint;",
            "             a tenth item, alt, is the full drawing the game swaps in once the world",
            "             changes there (js/progress.js, ALTS, says when)",
            "     PINS    [kind, scene, x, y]: the game's own pins (bench, stag, root, cocoon, tram, spa,",
            "             vendor, grubfather, colosseum, blackegg, grub, flame, grave; dreamer and npc, whose",
            "             'scene' is who)",
            "     PLACE_LABELS [scene, name]: the map's own titles of the places inside the areas",
            "     PIN_ART their pictures in assets/map/pins.png, and the shade's, the Dreamgate's, the",
            "             compass's and the markers' (marker-b|r|y|w) [x, y, w, h]",
            "     BOUNDS  [minX, minY, maxX, maxY] of the rooms",
            "     ANCHORS scene → [x, y]: rooms the map draws inside another, only their place",
            "     HOSTS   scene → [x, y]: where an undrawn room goes: its door in the drawn room you enter",
            "             it from, through the game's doors (the Colosseum's and Beast's Den's: their pins)",
            "     SPOTS   ItemChanger's place → [x, y, scene]: its object in its room, by the game's own",
            "             formula (GameMap.PositionCompass: the room's drawing ∝ the scene's tile map)",
            "   The save's shadeMapPos and dreamgateMapPos are in this same frame. */",
            '(() => {',
            "  'use strict';",
            '  const HK = globalThis.HK || (globalThis.HK = {});',
            f"  const AREAS = {js([a['name'] for a in areas])};",
            f"  // The site's area (js/rooms.js) of each of AREAS, for its name on the map.",
            f"  const AREA_IDS = {js(area_ids)};",
            '  // The map\'s place titles, each on the room it names (the game\'s text, its key alongside; \\n is its own line break).',
            '  const PLACE_LABELS = [',
            *sub_lines,
            '  ];',
            '  const ROOMS = {',
            *room_lines,
            '  };',
            '  const PINS = [',
            *pin_lines,
            '  ];',
            f"  const PIN_ART = {js({k: list(v) for k, v in pin_rects.items()})};",
            f"  const ATLAS = {js({'full': list(full_atlas.size), 'rough': list(rough_atlas.size), 'pins': list(pin_atlas.size)})};",
            f"  const BOUNDS = {js(bounds)};",
            f"  const ANCHORS = {js(anchors)};",
            f"  const HOSTS = {js(hosts)};",
            '  // ItemChanger\'s places (its locations.json, by name), each where it is: [x, y, scene].',
            f"  const SPOTS = {js(spots)};",
            '  HK.map = { AREAS, AREA_IDS, PLACE_LABELS, ROOMS, ANCHORS, HOSTS, SPOTS, PINS, PIN_ART, ATLAS, BOUNDS };',
            "  if (typeof module !== 'undefined' && module.exports) module.exports = HK.map;",
            '})();',
            '',
        ]))
    print(f"js/map.js: {len(rooms)} rooms in {len(areas)} areas, {len(pins)} pins; "
          f"atlases {full_atlas.size} / {rough_atlas.size}; bounds {bounds}")
    for a in areas:
        print(f"  {a['name']:<18} {a['rooms']:>3} rooms at ({a['x']}, {a['y']})")

if __name__ == '__main__':
    main()
