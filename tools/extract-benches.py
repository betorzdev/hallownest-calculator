#!/usr/bin/env python3
"""tools/extract-benches.py — each bench of the game, read from its files: writes js/benches.js and
assets/benches/.

Needs the game installed and UnityPy, like tools/extract-map.py (run once per game patch):

    python3 tools/extract-benches.py [path/to/hollow_knight_Data]

What it reads: every scene with an object carrying the game's RestBench script (the bench you
sit on; the save's respawnScene names the scene). Its SpriteRenderer is the bench, and some are
drawn in more than one piece, kept here by name (EXTRA): the Nailmasters' back and the toll
bench's front, Godhome's backs, the Kingdom's Edge camp. The pieces are laid in the scene's own
positions, scale and depth (the farther z behind), at the game's 64 pixels per unit, and the
whole cropped. A bench the scene flips (x scale below 0) is drawn unflipped: the same bench on
both sides of the Kingdom is one picture. Identical pictures are kept once, named by the bench's
sprite.

Where the Knight sits: the game stands you on the bench's floor (the bottom of its collider)
and, to sit, raises you by its Bench Control FSM's "Adjust Vector", which is each bench's own
(0.1 on most town benches, 0.55 on the Mantis Village's and Godhome's, 1.0 on the Nailmasters').
So the Knight's point is SEAT + that over the floor. (The bench's origin isn't: on the toll
benches and the White Palace's it's drawn from higher up.) It's kept per scene, as the same
picture has different heights in different rooms.
"""
import hashlib, json, os, re, struct, sys
import UnityPy
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/.local/share/Steam/steamapps/common/Hollow Knight/hollow_knight_Data')
OUT_JS = os.path.join(ROOT, 'js', 'benches.js')
OUT_DIR = os.path.join(ROOT, 'assets', 'benches')
PPU = 64
SEAT = 0.7   # the bench's origin over its floor on the town bench, in units

# The other pieces of a bench, by their object's name, near it (4 units across, 1 below, 4 above).
# Where the bench's own object draws nothing (Queen's Gardens, the camp), these are the bench.
EXTRA = re.compile(r'^(nailmaster_benches_|GG_bench_|pay_bench_front$|guardian_bench$|rest_bench$|'
                   r'outskirts__000[34]_camp$)')

def comps(go):
    return [c.component if hasattr(c, 'component') else c for c in go.m_Components]

def whole(sprite):
    """The sprite's whole picture, as big as its rect (tools/extract-map.py)."""
    im = sprite.image.convert('RGBA')
    rw, rh = round(sprite.m_Rect.width), round(sprite.m_Rect.height)
    if im.size == (rw, rh):
        return im
    off = sprite.m_RD.textureRectOffset
    canvas = Image.new('RGBA', (rw, rh), (0, 0, 0, 0))
    canvas.paste(im, (round(off.x), rh - round(off.y) - im.size[1]))
    return canvas

def tinted(img, c):
    if (c.r, c.g, c.b, c.a) == (1, 1, 1, 1):
        return img
    r, g, b, a = img.split()
    return Image.merge('RGBA', (r.point(lambda v: int(v * c.r)), g.point(lambda v: int(v * c.g)),
                                b.point(lambda v: int(v * c.b)), a.point(lambda v: int(v * c.a))))

def fsm_vector(raw, name):
    """A Vector3 variable of a PlayMakerFSM, by its name, from the component's raw data (UnityPy
    can't read PlayMaker's types): its name, an empty tooltip, two bools, then x, y, z."""
    key = name.encode()
    i = raw.find(struct.pack('<i', len(key)) + key)
    if i < 0:
        return None
    e = i + 4 + len(key)
    e += -e % 4
    return struct.unpack_from('<3f', raw, e + 12)

def scene_bench(env):
    """The bench of a scene: (the bench, its pieces), each (name, (x, y, z, sx, sy),
    SpriteRenderer), the bench's own first if it draws; or None. The bench also carries its
    collider and how much the game raises you to sit (its "Adjust Vector")."""
    trs = {o.path_id: o.read() for o in env.objects if o.type.name in ('Transform', 'RectTransform')}
    def world(t):
        chain = []
        while t is not None:
            chain.append(t)
            t = trs.get(t.m_Father.path_id) if t.m_Father.path_id else None
        x = y = z = 0.0; sx = sy = 1.0
        for u in reversed(chain):
            q = u.m_LocalPosition
            x, y, z = x + q.x * sx, y + q.y * sy, z + q.z
            sx, sy = sx * u.m_LocalScale.x, sy * u.m_LocalScale.y
        return x, y, z, sx, sy
    bench, parts = None, []
    for o in env.objects:
        if o.type.name != 'GameObject':
            continue
        g = o.read()
        if not g.m_IsActive:
            continue
        cs = comps(g)
        t = next((c for c in cs if c.type.name in ('Transform', 'RectTransform')), None)
        if t is None:
            continue
        is_bench, sr, box, adjust = False, None, None, None
        for c in cs:
            if c.type.name == 'MonoBehaviour':
                try:
                    is_bench |= c.read().m_Script.read().m_ClassName == 'RestBench'
                except Exception:
                    pass
                adjust = adjust or fsm_vector(c.deref().get_raw_data(), 'Adjust Vector')
            elif c.type.name == 'SpriteRenderer':
                r = c.read()
                if r.m_Sprite.path_id and r.m_Enabled:
                    sr = r
            elif c.type.name == 'BoxCollider2D':
                box = c.read()
        w = world(trs.get(t.path_id) or t.read())
        if is_bench:
            bench = (g.m_Name, w, sr, box, adjust)
        elif sr and EXTRA.match(g.m_Name):
            parts.append((g.m_Name, w, sr))
    if bench is None:
        return None
    bx, by = bench[1][0], bench[1][1]
    near = [p for p in parts if abs(p[1][0] - bx) < 4 and -1 < p[1][1] - by < 4]
    return bench, ([bench] if bench[2] else []) + near

def draw(bench, pieces):
    """The pieces laid as in the scene → (picture, x, y): where the Knight sits, in its pixels
    from the top-left, unflipped."""
    bx, by = bench[1][0], bench[1][1]
    layers = []
    for name, (x, y, z, sx, sy), sr, *_ in pieces:
        # Scaled by a hair (Hive, Godhome's workshop): the same picture as the others.
        sx, sy = [(1 if v > 0 else -1) if abs(abs(v) - 1) < 0.04 else v for v in (sx, sy)]
        sp = sr.m_Sprite.read()
        im = tinted(whole(sp), sr.m_Color)
        k = PPU / sp.m_PixelsToUnits
        if sr.m_FlipX:
            sx = -sx
        w, h = max(1, round(im.size[0] * abs(sx) * k)), max(1, round(im.size[1] * abs(sy) * k))
        if (w, h) != im.size:
            im = im.resize((w, h), Image.LANCZOS)
        if sx < 0:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        piv = sp.m_Pivot
        left = (x - bx) * PPU - (piv.x if sx >= 0 else 1 - piv.x) * w
        bottom = (y - by) * PPU - piv.y * h
        layers.append((z, left, bottom, im))
    layers.sort(key=lambda l: -l[0])
    x0 = min(l[1] for l in layers); y0 = min(l[2] for l in layers)
    x1 = max(l[1] + l[3].size[0] for l in layers); y1 = max(l[2] + l[3].size[1] for l in layers)
    W, H = round(x1 - x0), round(y1 - y0)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for _, left, bottom, im in layers:
        canvas.alpha_composite(im, (round(left - x0), round(H - (bottom - y0) - im.size[1])))
    crop = canvas.getbbox()
    canvas = canvas.crop(crop)
    ox, oy = -x0 - crop[0], H + y0 - crop[1]
    # Where he sits: SEAT and the bench's Adjust Vector over its floor (from the origin: the
    # collider's bottom, in the bench's scale).
    box, adjust = bench[3], bench[4] or (0, 0, 0)
    floor = (box.m_Offset.y - box.m_Size.y / 2) * abs(bench[1][4]) + SEAT if box is not None else 0
    oy -= (floor + adjust[1]) * PPU
    # The bench's own object flipped: its picture unflipped (the origin mirrored with it).
    if bench[1][3] < 0:
        canvas = canvas.transpose(Image.FLIP_LEFT_RIGHT)
        ox = canvas.size[0] - ox
    return canvas, round(ox), round(oy)

def main():
    gg = UnityPy.load(os.path.join(DATA, 'globalgamemanagers'))
    bs = next(o.read() for o in gg.objects if o.type.name == 'BuildSettings')
    os.makedirs(OUT_DIR, exist_ok=True)
    for f in os.listdir(OUT_DIR):
        os.remove(os.path.join(OUT_DIR, f))
    arts, scenes, by_hash = {}, {}, {}
    for i, path in enumerate(bs.scenes):
        scene = os.path.splitext(os.path.basename(path))[0]
        found = scene_bench(UnityPy.load(os.path.join(DATA, 'level%d' % i)))
        if not found or not found[1]:
            continue
        bench, pieces = found
        im, ox, oy = draw(bench, pieces)
        digest = hashlib.sha1(im.tobytes() + bytes(str(im.size), 'ascii')).hexdigest()
        if digest not in by_hash:
            base = re.sub(r'[^a-z0-9]+', '-', pieces[0][2].m_Sprite.read().m_Name.lower()).strip('-')
            key, n = base, 2
            while key in arts:
                key, n = '%s-%d' % (base, n), n + 1
            im.save(os.path.join(OUT_DIR, key + '.png'), optimize=True)
            arts[key] = [im.size[0], im.size[1], ox]
            by_hash[digest] = key
        scenes[scene] = [by_hash[digest], oy]
        print(scene, by_hash[digest], oy)
    lines = ['/* js/benches.js — GENERATED by tools/extract-benches.py from the game\'s files: don\'t edit by hand.',
             '   The bench you rest at on Your game (js/app-home.js), as the game draws it.',
             '     ART     key: [width, height, x] of assets/benches/<key>.png, in the game\'s pixels;',
             '             x: where the Knight sits, from the left',
             '     SCENES  the scene of each bench (the save\'s respawnScene) → [its ART key, y]; y: where',
             '             the Knight sits, from the top (the game raises him more on some benches) */',
             '(function () {',
             "  'use strict';",
             '  const HK = globalThis.HK || (globalThis.HK = {});',
             '  const ART = {']
    lines += ['    %s: %s,' % (json.dumps(k), json.dumps(v)) for k, v in sorted(arts.items())]
    lines += ['  };', '  const SCENES = {']
    lines += ['    %s: %s,' % (json.dumps(k), json.dumps(v)) for k, v in sorted(scenes.items())]
    lines += ['  };',
              '  HK.benches = { ART, SCENES };',
              "  if (typeof module !== 'undefined' && module.exports) module.exports = HK.benches;",
              '})();', '']
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(len(scenes), 'benches,', len(arts), 'pictures')

if __name__ == '__main__':
    main()
