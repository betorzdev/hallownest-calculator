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
}

# The rooms the map doesn't draw (shops, houses, the Colosseum's arenas…) are placed on the one
# you enter them from: the nearest drawn room through the game's doors, from the community
# randomizer's transitions.json (pinned, like tools/fetch-rooms.js). Two are placed on the game's
# own pin for them instead.
TRANSITIONS = ('https://raw.githubusercontent.com/homothetyhk/RandomizerMod/'
               'cad3d5a7b73ed3ddf4af43795b20c23ced14bb4c/RandomizerMod/Resources/Data/transitions.json')
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
            full_img = tinted(full.image, sr.m_Color)
            rough_img = tinted(rough.image, sr.m_Color)
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
            room_count += 1
            for pin in children(g):
                kind = PINS.get(pin.m_Name.split(' (')[0])
                if not kind:
                    continue
                pt = transform(pin)
                px, py = gx + pt.m_LocalPosition.x, gy + pt.m_LocalPosition.y
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
    # Where to place the collectibles whose room the map doesn't draw (js/collectibles.js).
    scenes = set(re.findall(r"scene: '([^']+)'", open(os.path.join(ROOT, 'js', 'collectibles.js'), encoding='utf-8').read()))
    with urllib.request.urlopen(TRANSITIONS) as res:
        trans = json.load(res).values()
    adj = {}
    for tr in trans:
        a, b = tr['SceneName'], (tr.get('VanillaTarget') or '').split('[')[0]
        if b:
            adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
    hosts = {}
    for sc in sorted(scenes):
        if sc in rooms or sc in anchors:
            continue
        hp = HOST_PIN.get(sc)
        if hp:
            kind, who = hp if isinstance(hp, tuple) else (hp, None)
            p = next(p for p in pins if p['kind'] == kind and (who is None or p['scene'] == who))
            hosts[sc] = [p['x'], p['y']]
            continue
        seen, queue = {sc}, deque([sc])
        while queue:
            cur = queue.popleft()
            if cur in rooms:
                hosts[sc] = [rooms[cur]['x'], rooms[cur]['y']]
                break
            for n in sorted(adj.get(cur, ())):
                if n not in seen:
                    seen.add(n); queue.append(n)
        if sc not in hosts:
            print('  no place for', sc)

    xs = [r['x'] - r['w'] / 2 for r in rooms.values()] + [r['x'] + r['w'] / 2 for r in rooms.values()]
    ys = [r['y'] - r['h'] / 2 for r in rooms.values()] + [r['y'] + r['h'] / 2 for r in rooms.values()]
    bounds = [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)]

    def js(o):
        return json.dumps(o, separators=(',', ':'), ensure_ascii=False)
    room_lines = [f"    {json.dumps(n)}: {js([r['area'], r['x'], r['y'], r['w'], r['h'], r['rw'], r['rh'], r['full'], r['rough']])}," for n, r in rooms.items()]
    pin_lines = [f"    {js([p['kind'], p['scene'], p['x'], p['y']])}," for p in pins]
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join([
            "/* js/map.js — GENERATED by tools/extract-map.py from the game's files: don't edit by hand.",
            "   The game's own map (its Game_Map object), in its own units, y upwards:",
            "     ROOMS   scene → [area, x, y, w, h, roughW, roughH, full, rough]: the room's centre and",
            "             size, and where its two drawings are in assets/map/rooms-full.png and",
            "             rooms-rough.png ([x, y, w, h] in pixels), each already in its area's tint",
            "     PINS    [kind, scene, x, y]: the game's own pins (bench, stag, root, cocoon, tram, spa,",
            "             vendor, grubfather, colosseum, blackegg, grub, flame; dreamer, whose 'scene' is who)",
            "     PIN_ART their pictures in assets/map/pins.png, and the shade's, the Dreamgate's, the",
            "             compass's and the markers' (marker-b|r|y|w) [x, y, w, h]",
            "     BOUNDS  [minX, minY, maxX, maxY] of the rooms",
            "     ANCHORS scene → [x, y]: rooms the map draws inside another, only their place",
            "     HOSTS   scene → [x, y]: where a collectible's undrawn room goes (the room you enter it",
            "             from, through the game's doors; the Colosseum's and Beast's Den's pins)",
            "   The save's shadeMapPos and dreamgateMapPos are in this same frame. */",
            '(() => {',
            "  'use strict';",
            '  const HK = globalThis.HK || (globalThis.HK = {});',
            f"  const AREAS = {js([a['name'] for a in areas])};",
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
            '  HK.map = { AREAS, ROOMS, ANCHORS, HOSTS, PINS, PIN_ART, ATLAS, BOUNDS };',
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
