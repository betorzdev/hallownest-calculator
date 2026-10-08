#!/usr/bin/env python3
"""tools/extract-knight.py — the Knight's moves, from the game's own sprites: writes assets/knight/
(one strip per move) and js/knight-moves.js, for the Knight who walks the page (js/app-knight.js).

The sister's tools/extract-hornet.py, for Hollow Knight: the same tk2d format, in the game's
resources.assets rather than a bundle. Needs the game installed and UnityPy with its typetree
generator (`uv run --with UnityPy --with Pillow --with TypeTreeGeneratorAPI python3 -I
tools/extract-knight.py`, or a venv with those three); run once per game patch:

    python3 tools/extract-knight.py [path/to/hollow_knight_Data] [--all --out DIR]

With --all it draws every clip listed (MORE as well), into DIR with its knight-moves.js: the
design page's set (design/34/).

Where they are (patch 1.5.12620, found on 8-Oct-2026):
  · The Knight is a tk2d sprite. His frames are the "Knight" sprite collection in
    resources.assets: 891 definitions over one 4096² atlas, each with its quad in world units
    (64 texels a unit: halfTargetHeight × invOrthoSize), its UVs and whether the atlas holds it
    turned (flipped: the region is the frame transposed).
  · His animations are the tk2dSpriteAnimation in the same file whose Run clip draws from that
    collection: 214 clips, each its fps, its wrap mode (0 loops whole, 1 loops from loopStart on,
    2 plays once, 6 is a single frame) and its frames as ids into a collection: his, or a second
    one of his (Sprint's frames sit in "Knight Dream Gate Cln"); every frame's quad is in units
    from the same pivot, so they bake alike. A clip drawn from an effects collection (the wings)
    isn't him and isn't listed.

Each strip is one row of equal cells, one frame per cell, facing right (the game draws him facing
left and turns the hero round to face right; every frame is mirrored here, pivot and all), at
the game's own size (he stands 130 px; the page shows him at 26 on the bar, at up to 96 on his
bench). Every frame keeps the game's registration, so all the strips share one anchor: his pivot,
at (px, py) in each cell. js/knight-moves.js says, per move: its file, frames, fps, cell size, pivot
and loopStart (-1: plays once); and FLOOR, how far below the pivot his feet are when he stands
(the Idle clip's lowest edge). Team Cherry's art, shown as the rest of the site's sprites are (a
fan project).
"""
import json, os, sys, warnings
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
from PIL import Image

warnings.filterwarnings('ignore', module='UnityPy')
SCALE = 1         # the strips' size against the game's
PAD = 2           # transparent margin round each cell, so that resampling doesn't bleed
LOOP, LOOP_SECTION, ONCE, SINGLE = 0, 1, 2, 6   # tk2d's wrap modes

# The page's name for each move → the game's clip: what js/app-knight.js plays (MOVES), and the rest
# of what the game holds for him (MORE), drawn with --all for design/34-knight-moves.html.
MOVES = {
    'idle': 'Idle',                     # standing, the cloak settling
    'turn': 'Turn',                     # turning round
    'run': 'Run',                       # six frames of start, then loops from loopStart
    'run-stop': 'Run To Idle',          # skidding to a stop
    'sit': 'Sit',                       # sitting down
    'sit-idle': 'Sit Idle',
    'sit-lean': 'Sit Lean',
    'doze': 'Sit Fall Asleep',
    'asleep': 'Sitting Asleep',
    'wake-sit': 'Wake To Sit',          # waking up on the bench
    'get-off': 'Get Off',               # off the bench
    'map-open': 'Sit Map Open',         # opening the map, seated
    'map-close': 'Sit Map Close',
    'focus': 'Focus',                   # healing: gathering soul (loops from loopStart)
    'focus-get': 'Focus Get',           # the mask coming back
    'focus-end': 'Focus End',
    # Shape of Unn: the slug (B: with Baldur Shell, S: with Spore Shroom's cloud, BS: both)
    'slug-up': 'Slug Up',
    'slug-idle': 'Slug Idle',
    'slug-idle-shell': 'Slug Idle B',
    'slug-idle-spore': 'Slug Idle S',
    'slug-idle-both': 'Slug Idle BS',
    'slug-down': 'Slug Down',
}
MORE = {
    # standing
    'idle-wind': 'Idle Wind',           # a gust in the cloak
    'look-up': 'LookUp',
    'look-up-end': 'LookUpEnd',
    'look-down': 'LookDown',
    'look-down-end': 'LookDownEnd',
    'turn-idle': 'TurnToIdle',          # settling after the turn
    'stun': 'Stun',
    'recoil': 'Recoil',                 # taking a hit
    'idle-hurt': 'Idle Hurt',
    # moving
    'walk': 'Walk',
    'sprint': 'Sprint',                 # Sprintmaster
    'dash': 'Dash',
    'dash-stop': 'Dash To Idle',
    'shadow-dash': 'Shadow Dash',       # Shade Cloak
    'shadow-dash-sharp': 'Shadow Dash Sharp',  # with Sharp Shadow
    'airborne': 'Airborne',
    'fall': 'Fall',
    'land': 'Land',
    'hard-land': 'HardLand',
    'double-jump': 'Double Jump',       # Monarch Wings (the wings are another collection: not here)
    # the bench
    'wake': 'Wake',                     # a game's start: waking and getting up
    # the map, standing
    'map-idle': 'Map Idle',
    'map-walk': 'Map Walk',
    'map-update': 'Map Update',         # the quill: drawing what he's seen
    'map-away': 'Map Away',
    # the slug
    'slug-walk': 'Slug Walk',
    'slug-walk-shell': 'Slug Walk B',
    # finding something
    'collect-1': 'Collect Normal 1',    # raising a find
    'collect-2': 'Collect Normal 2',
    'collect-3': 'Collect Normal 3',    # and putting it away
    'collect-magical-1': 'Collect Magical 1',  # an ability, with the light
    'collect-magical-2': 'Collect Magical 2',
    'collect-magical-3': 'Collect Magical 3',
    'collect-heart': 'Collect Heart Piece',
    'collect-heart-end': 'Collect Heart Piece End',
    # Godhome and the Colosseum
    'challenge-start': 'Challenge Start',  # the nail raised before a challenge
    'challenge-end': 'Challenge End',
    'prostrate': 'Prostrate',           # kneeling
    'prostrate-rise': 'Prostrate Rise',
    # the Dream Nail
    'dn-charge': 'DN Charge',
    'dn-slash': 'DN Slash',
    'dn-cancel': 'DN Cancel',
    # doors and the lantern
    'enter': 'Enter',
    'exit': 'Exit',
    'lantern-idle': 'Lantern Idle',
    'lantern-run': 'Lantern Run',
    # death
    'death': 'Death',
    'hazard-respawn': 'Hazard Respawn',
    'respawn-wake': 'Respawn Wake',
}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_DEFAULT = os.path.expanduser('~/.local/share/Steam/steamapps/common/Hollow Knight/hollow_knight_Data')


def frame(defn, textures, ppu):
    """A definition → its image, upright at the game's size and facing right, and its quad's left
    and top, in world units from his pivot."""
    tex = textures[defn['materialId']]
    W, H = tex.size
    us = [p['x'] for p in defn['uvs']]; vs = [p['y'] for p in defn['uvs']]
    im = tex.crop((round(min(us) * W), round((1 - max(vs)) * H), round(max(us) * W), round((1 - min(vs)) * H)))
    if defn['flipped']:
        im = im.transpose(Image.Transpose.TRANSVERSE)
    xs = [p['x'] for p in defn['positions']]; ys = [p['y'] for p in defn['positions']]
    size = (round((max(xs) - min(xs)) * ppu), round((max(ys) - min(ys)) * ppu))
    if abs(im.size[0] - size[0]) > 1 or abs(im.size[1] - size[1]) > 1:
        raise ValueError(f"{defn['name']}: {im.size} in the atlas, {size} on screen")
    # Mirrored to face right: the quad's left becomes the old right's mirror image about the pivot.
    return im.transpose(Image.Transpose.FLIP_LEFT_RIGHT), -max(xs), max(ys)


def main(data, out_dir, out_js, moves):
    env = UnityPy.load(os.path.join(data, 'resources.assets'))
    gen = TypeTreeGenerator(env.objects[0].assets_file.unity_version)
    gen.load_local_game(os.path.dirname(data))
    env.typetree_generator = gen
    by_id = {o.path_id: o for o in env.objects}
    coll = coll_id = None
    for o in env.objects:
        if o.type.name != 'MonoBehaviour':
            continue
        try:
            t = o.read_typetree()
        except Exception:
            continue
        if t.get('spriteCollectionName') == 'Knight' and t.get('spriteDefinitions'):
            coll, coll_id = t, o.path_id
            break
    if not coll:
        raise SystemExit('No "Knight" sprite collection in resources.assets')
    # A collection's definitions, atlases and texels a unit, read once; his, and any other a clip draws from.
    colls = {}
    def collection(pid):
        if pid not in colls:
            t = by_id[pid].read_typetree()
            colls[pid] = (t['spriteCollectionName'], t['spriteDefinitions'],
                          [by_id[x['m_PathID']].read().image.convert('RGBA') for x in t['textures']],
                          t['halfTargetHeight'] * t['invOrthoSize'])
        return colls[pid]
    ppu = collection(coll_id)[3]

    # His animation library: the one whose Run clip draws from that collection.
    lib = None
    for o in env.objects:
        if o.type.name != 'MonoBehaviour':
            continue
        try:
            t = o.read_typetree()
        except Exception:
            continue
        clips = {c.get('name'): c for c in t.get('clips') or [] if isinstance(c, dict)}
        run = clips.get('Run')
        if run and run['frames'] and all(f['spriteCollection']['m_PathID'] == coll_id for f in run['frames']):
            lib = clips
            break
    if not lib:
        raise SystemExit("No animation library draws the Knight's Run from that collection")

    os.makedirs(out_dir, exist_ok=True)
    made, floor, total = {}, None, 0
    for name, clip_name in moves.items():
        clip = lib[clip_name]
        frames, others = [], set()
        for f in clip['frames']:
            cname, defs, textures, cppu = collection(f['spriteCollection']['m_PathID'])
            if cppu != ppu:
                raise SystemExit(f'{clip_name}: {cname} draws at {cppu} texels a unit, his collection at {ppu}')
            if f['spriteCollection']['m_PathID'] != coll_id:
                others.add(cname)
            frames.append(frame(defs[f['spriteId']], textures, ppu))
        # The cell: every frame's quad, in world units from the pivot.
        L = min(left for _, left, _ in frames); R = max(left + im.width / ppu for im, left, _ in frames)
        T = max(top for _, _, top in frames); B = min(top - im.height / ppu for im, _, top in frames)
        px = round(-L * ppu * SCALE) + PAD; py = round(T * ppu * SCALE) + PAD
        cw = round((R - L) * ppu * SCALE) + 2 * PAD; ch = round((T - B) * ppu * SCALE) + 2 * PAD
        strip = Image.new('RGBA', (cw * len(frames), ch), (0, 0, 0, 0))
        for i, (im, left, top) in enumerate(frames):
            small = im if SCALE == 1 else im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.Resampling.LANCZOS)
            strip.alpha_composite(small, (i * cw + px + round(left * ppu * SCALE), py - round(top * ppu * SCALE)))
        path = os.path.join(out_dir, name + '.png')
        strip.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)
        total += os.path.getsize(path)
        wrap = clip['wrapMode']
        loop = clip['loopStart'] if wrap == LOOP_SECTION else 0 if wrap == LOOP else -1
        made[name] = {'n': len(frames), 'fps': round(clip['fps'], 3), 'w': cw, 'h': ch, 'px': px, 'py': py, 'loop': loop}
        if name == 'idle':
            floor = round(-B * ppu * SCALE)
        src = f' in {", ".join(sorted(others))}' if others else ''
        print(f'  {os.path.relpath(path, ROOT)}  {len(frames)} × {cw}×{ch}  ← {clip_name}{src} ({clip["fps"]:g} fps, {"once" if loop < 0 else "loop from " + str(loop)})')

    body = json.dumps(made, indent=None, separators=(', ', ': '))
    body = body.replace('}, "', '},\n    "').replace('{"idle"', '{\n    "idle"')
    with open(out_js, 'w') as f:
        f.write("/* Generated by tools/extract-knight.py from the game's own sprites: do not edit by hand.\n"
                '   Each move: assets/knight/<name>.png, n cells of w × h px (the game\'s size, 64 px a unit),\n'
                '   fps, his pivot at (px, py) in each cell, and loopStart (-1: plays once); FLOOR: his feet\n'
                '   below the pivot when standing. */\n'
                f'globalThis.HK = globalThis.HK || {{}};\nHK.KNIGHT = {{\n  FLOOR: {floor},\n  MOVES: {body[:-1]}\n  }}\n}};\n')
    print(f'  {os.path.relpath(out_js, ROOT)}  {len(made)} moves, FLOOR {floor}, strips {total / 1024:.0f} KB')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:]]
    out, every = None, False
    if '--all' in args:
        args.remove('--all'); every = True
    if '--out' in args:
        i = args.index('--out'); out = args[i + 1]; del args[i:i + 2]
    data = args[0] if args else DATA_DEFAULT
    moves = {**MOVES, **MORE} if every else MOVES
    if out:
        main(data, out, os.path.join(out, 'knight-moves.js'), moves)
    else:
        main(data, os.path.join(ROOT, 'assets', 'knight'), os.path.join(ROOT, 'js', 'knight-moves.js'), moves)
