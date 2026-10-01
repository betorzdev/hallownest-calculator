#!/usr/bin/env python3
"""tools/extract-hornet.py — Hornet's moves, from Silksong's own sprites: writes assets/hornet/
and js/hornet-moves.js, for the Hornet who points to the sister site (../pharloom-calculator).

Ported from the sister's tools/extract-hornet.py (which draws her stand, run and sit strips): this
one draws every move the masthead's Hornet uses, each clip in its own strip. Needs Silksong
installed and UnityPy (`python3 -m pip install UnityPy Pillow`, in a venv). Run it once per patch
that touches Hornet's animations:

    python3 tools/extract-hornet.py "<Steam>/steamapps/common/Hollow Knight Silksong"

Where they are (patch 1.0.30000, found on 28-Sep-2026 by the sister site):
  · Hornet is a tk2d sprite. Her frames are the "Knight" sprite collection in
    herocollections_assets_shared.bundle: definitions over four 4096² atlases, each with its quad
    in world units (64 texels a unit), its UVs and whether the atlas holds it turned (flipped: the
    region is the frame transposed).
  · Her animations are a tk2dSpriteAnimation in herodynamic_assets_all.bundle: each clip its fps,
    its wrap mode (1 loops from its loopStart on) and its frames as ids into that collection. Only
    frames drawn from that collection go in (a clip's separate effects don't).

Each strip is one row of equal cells, one frame per cell, facing left as the game draws her, at
SCALE of the game's size (shown at half that on the page: sharp at 2×). Every frame keeps the
game's registration, so all the strips share one anchor: her pivot, at (px, py) in each cell.
js/hornet-moves.js says, per move: its file, frames, fps, cell size, pivot and loopStart (and, for
Clawline's effects, each frame's drawn box, so the page can stretch the thread along its line); and
FLOOR, how far below the pivot her feet are when she stands (the Idle clip's lowest edge).
Team Cherry's art, shown as the rest of the site's sprites are (a fan project).
"""
import json, os, sys, warnings
import UnityPy
from PIL import Image

warnings.filterwarnings('ignore', module='UnityPy')
UnityPy.config.FALLBACK_UNITY_VERSION = '6000.0.50f1'
PPU = 64          # texels per world unit in the collection
SCALE = 1 / 3     # the strips' size against the game's: ~72 px standing, shown at ~36
PAD = 2           # transparent margin round each cell, so that resampling doesn't bleed

# The page's name for each move → the game's clip.
MOVES = {
    'idle': 'Idle',                     # standing, breathing
    'run': 'Run',
    'sprint': 'Sprint',                 # running low, faster
    'skid': 'Run To Idle',              # stopping from a run
    'turn': 'Turn',                     # turning round, through facing you
    'dash': 'Dash',
    'jump': 'Double Jump',              # the silk wings, then a somersault
    'fall': 'Fall',
    'land': 'Land',
    'hardland': 'HardLand',
    'float-open': 'Umbrella Inflate',   # her cloak opening to float (Drifter's Cloak)
    'float': 'Umbrella Float',
    'throw-antic': 'Harpoon Antic',     # Clawline: drawing the needle back
    'throw': 'Harpoon Throw',           # the throw
    'pull': 'Harpoon Dash',             # pulled along the thread
    'catch': 'Harpoon Catch',           # arriving at the needle
    'challenge': 'Challenge Strong',    # the needle swept out and pointed
    'taunt': 'Taunt',                   # a flourish with a slash
    'taunt-back': 'Taunt Back',
    'needolin-start': 'Needolin Start',
    'needolin': 'Needolin Play',
    'look-up': 'Look Up Half',
    'flourish': 'Dress Flourish',       # shaking out her cloak
    'parry': 'Parry Ready',             # spin into guard, needle ready
    'sit': 'Sit',
    'soar-antic': 'Super Jump Antic',   # Silk Soar: crouching
    'soar-throw': 'Super Jump Throw',
    'soar': 'Super Jump Loop',          # going up
    'soar-charge': 'Super Jump Antic Effect',  # the silk swirling round her as she charges (by her pivot)
    'soar-wait': 'Super Jump Throw Wait',      # looking up while the needle flies to the ceiling
    'soar-jump': 'Super Jump Jump Antic',      # crouching to go
    'leap': 'Fast Travel Leap',         # a leap up and away, curled
    'backflip': 'Sprint Backflip',
    'float-close': 'Umbrella Deflate',  # her cloak closing as she lands
    'catch-back': 'Harpoon Catch Back',
    'mantle-cling': 'Mantle Cling',     # grabbing a ledge and hoisting herself
    'mantle-vault': 'Mantle Vault',
    'mantle-land': 'Mantle Land',
    'mantle-stand': 'Mantle Land To Idle',
    # Clawline's effects, without her: drawn by the page along the line, so each frame's box goes in.
    'harpoon-needle': 'Harpoon Needle', # the needle in flight, blurred, then sharp (tip on the left)
    'harpoon-thread': 'Harpoon Thread', # the silk line: taut, then whipping slack into a curl
    'needle-hit': 'Harpoon Needle Wall Hit',  # stuck, quivering
    # Silk Soar's, likewise: the thread up to the ceiling (whipping, then taut).
    'soar-thread': 'Super Jump Thread',
}
EFFECTS = {'harpoon-needle', 'harpoon-thread', 'needle-hit', 'soar-thread'}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'hornet')


def frame(defn, textures):
    """A definition → its image, upright at the game's size, and its quad's left and top, in world
    units from her pivot."""
    tex = textures[defn['materialId']]
    W, H = tex.size
    us = [p['x'] for p in defn['uvs']]; vs = [p['y'] for p in defn['uvs']]
    im = tex.crop((round(min(us) * W), round((1 - max(vs)) * H), round(max(us) * W), round((1 - min(vs)) * H)))
    if defn['flipped']:
        im = im.transpose(Image.Transpose.TRANSVERSE)
    xs = [p['x'] for p in defn['positions']]; ys = [p['y'] for p in defn['positions']]
    size = (round((max(xs) - min(xs)) * PPU), round((max(ys) - min(ys)) * PPU))
    if im.size != size:
        # A few effect frames (the thread's first ones) are a tiny texture the quad stretches.
        if min(im.size) > 8:
            raise ValueError(f"{defn['name']}: {im.size} in the atlas, {size} on screen")
        im = im.resize((max(1, size[0]), max(1, size[1])), Image.Resampling.BILINEAR)
    return im, min(xs), max(ys)


def main(game):
    aa = os.path.join(game, 'Hollow Knight Silksong_Data', 'StreamingAssets', 'aa', 'StandaloneLinux64')
    env = UnityPy.load(os.path.join(aa, 'herocollections_assets_shared.bundle'))
    by_id = {o.path_id: o for o in env.objects}
    coll = None
    for o in env.objects:
        if o.type.name == 'MonoBehaviour':
            t = o.read_typetree()
            if t.get('spriteCollectionName') == 'Knight':
                coll, coll_id = t, o.path_id
    if not coll:
        raise SystemExit('No "Knight" sprite collection in herocollections_assets_shared.bundle')
    textures = [by_id[x['m_PathID']].read().image for x in coll['textures']]
    defs = coll['spriteDefinitions']

    # Her animation library: the one whose Run clip draws from that collection.
    lib = None
    for o in UnityPy.load(os.path.join(aa, 'herodynamic_assets_all.bundle')).objects:
        if o.type.name != 'MonoBehaviour':
            continue
        try:
            t = o.read_typetree()
        except Exception:
            continue
        clips = {c.get('name'): c for c in t.get('clips') or [] if isinstance(c, dict)}
        run = clips.get('Run')
        if run and all(f['spriteCollection']['m_PathID'] == coll_id for f in run['frames']):
            lib = clips
    if not lib:
        raise SystemExit("No animation library draws Hornet's Run from that collection")

    os.makedirs(OUT, exist_ok=True)
    moves, floor = {}, None
    for name, clip_name in MOVES.items():
        clip = lib[clip_name]
        frames = [frame(defs[f['spriteId']], textures) for f in clip['frames'] if f['spriteCollection']['m_PathID'] == coll_id]
        # The cell: every frame's quad, in world units from the pivot.
        L = min(left for _, left, _ in frames); R = max(left + im.width / PPU for im, left, _ in frames)
        T = max(top for _, _, top in frames); B = min(top - im.height / PPU for im, _, top in frames)
        px = round(-L * PPU * SCALE) + PAD; py = round(T * PPU * SCALE) + PAD
        cw = round((R - L) * PPU * SCALE) + 2 * PAD; ch = round((T - B) * PPU * SCALE) + 2 * PAD
        strip = Image.new('RGBA', (cw * len(frames), ch), (0, 0, 0, 0))
        for i, (im, left, top) in enumerate(frames):
            small = im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.Resampling.LANCZOS)
            strip.alpha_composite(small, (i * cw + px + round(left * PPU * SCALE), py - round(top * PPU * SCALE)))
        strip.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(os.path.join(OUT, name + '.png'), optimize=True)
        loop = clip['loopStart'] if clip['wrapMode'] == 1 else 0
        moves[name] = {'n': len(frames), 'fps': clip['fps'], 'w': cw, 'h': ch, 'px': px, 'py': py, 'loop': loop}
        if name in EFFECTS:
            # Each frame's drawn box in its cell [x, y, w, h] (null if empty), to stretch it along a line.
            boxes = []
            for i in range(len(frames)):
                bb = strip.crop((i * cw, 0, (i + 1) * cw, ch)).getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
                boxes.append([bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]] if bb else None)
            moves[name]['boxes'] = boxes
        if name == 'idle':
            floor = round(-B * PPU * SCALE)
        print(f'  assets/hornet/{name}.png  {len(frames)} × {cw}×{ch}  ← {clip_name} ({clip["fps"]:g} fps)')

    body = json.dumps(moves, indent=None, separators=(', ', ': '))
    body = body.replace('}, "', '},\n    "').replace('{"idle"', '{\n    "idle"')
    with open(os.path.join(ROOT, 'js', 'hornet-moves.js'), 'w') as f:
        f.write('/* Generated by tools/extract-hornet.py from Silksong\'s own sprites: do not edit by hand.\n'
                '   Each move: assets/hornet/<name>.png, n cells of w × h px (at a third of the game\'s size, shown\n'
                '   at half), fps, her pivot at (px, py) in each cell, and loopStart; FLOOR: her feet below the\n'
                '   pivot when standing. */\n'
                f'globalThis.HK = globalThis.HK || {{}};\nHK.HORNET = {{\n  FLOOR: {floor},\n  MOVES: {body[:-1]}\n  }}\n}};\n')
    print(f'  js/hornet-moves.js  {len(moves)} moves, FLOOR {floor}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
