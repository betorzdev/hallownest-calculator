#!/usr/bin/env python3
"""tools/extract-pieces.py — the Inventory's mask and vessel as the game assembles them, piece by
piece: writes assets/hud/mask-pieces-<n>.png (n = 0 to 4 shards) and vessel-pieces-<n>.png (0 to 3
fragments), the pictures Progress lights its pips with (js/app-progress.js).

Needs the game installed and UnityPy, like tools/extract-map.py (run once per game patch):

    uv run --with UnityPy --with pillow python tools/extract-pieces.py [path/to/hollow_knight_Data]

What it reads: the Inventory's prefab in resources.assets, _GameCameras/HudCamera/Inventory/Inv/
Inv_Items. "Heart Pieces" draws the empty mask (its own sprite, Inv_0030_inv_health_backboard) and
has a child per count, "Pieces 1" to "Pieces 4" (HP_UI_010007 … HP_UI_040004, the last frame of
each one's animation): each child is the whole mask, dark, with that many shards in place, so the
empty one is the backboard laid over the mask's own outline (its FSM "Set Pieces" activates the
child "Pieces " + heartPieces, and "Pieces 4" once heartPieceMax). "Soul Orb" isn't drawn by its
prefab's sprites: its InvVesselFragments sets them on enabling (read from Assembly-CSharp's IL,
patch 1.5.12620): the backboard alone with no fragment; the backboard and, on "Piece 1", the single
piece; the backboard and, on "Piece 2", the double piece (which already carries the first: the
first renderer is emptied); and with every vessel, no backboard and the full one on "Piece All".
Its fields after the MonoBehaviour's header are PPtrs, in order: self, piece1, piece2, full
(renderers), backboardSprite, singlePieceSprite, doublePieceSprite, fullSprite, emptySprite.
Each set shares one canvas, so the pieces don't move from picture to picture, cropped to what
they all cover and 64 px tall.
"""
import os, struct, sys
import UnityPy
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/.local/share/Steam/steamapps/common/Hollow Knight/hollow_knight_Data')
OUT_DIR = os.path.join(ROOT, 'assets', 'hud')
ITEMS = '_GameCameras/HudCamera/Inventory/Inv/Inv_Items/'
HEIGHT = 64
PX = 200   # pixels per unit of the canvas the pieces are laid on

def objects():
    """Every GameObject of the Inventory's items, by its path: (its transform, its sprite or None)."""
    env = UnityPy.load(os.path.join(DATA, 'resources.assets'))
    out = {}
    for o in env.objects:
        if o.type.name != 'GameObject':
            continue
        go = o.read()
        tr = next((c.read() for c in go.m_Components if c.type.name == 'Transform'), None)
        if tr is None:
            continue
        names, t = [], tr
        while t:
            names.append(t.m_GameObject.read().m_Name)
            t = t.m_Father.read() if t.m_Father.path_id else None
        path = '/'.join(reversed(names))
        if not path.startswith(ITEMS):
            continue
        sprite = None
        for c in go.m_Components:
            if c.type.name == 'SpriteRenderer':
                r = c.read()
                sprite = r.m_Sprite.read() if r.m_Sprite.path_id else None
        out[path[len(ITEMS):]] = (tr, sprite)
        if path == ITEMS + 'Soul Orb':
            out['vessel sprites'] = vessel_sprites(go)
    return out

def vessel_sprites(go):
    """InvVesselFragments' four sprites (backboard, single, double, full), from its raw data: the
    MonoBehaviour whose fields are nine PPtrs (the other three on Soul Orb hold a bool's name)."""
    for c in go.m_Components:
        if c.type.name != 'MonoBehaviour':
            continue
        o = c.deref()
        raw = o.get_raw_data()
        if len(raw) != 32 + 9 * 12:
            continue
        ids = [struct.unpack_from('<iq', raw, 32 + 12 * i)[1] for i in range(9)]
        return [o.assets_file.objects[i].read() for i in ids[4:8]]
    raise SystemExit('no InvVesselFragments on Soul Orb: its shape changed')

def drawn(tr, sprite, root=False):
    """The sprite at its size in the canvas, and its centre's place: the parent's transform is
    the canvas's origin, a child's local position and scale are read from the prefab."""
    s = 1 if root else tr.m_LocalScale.x
    w = sprite.m_Rect.width / sprite.m_PixelsToUnits * s * PX
    h = sprite.m_Rect.height / sprite.m_PixelsToUnits * s * PX
    x, y = (0, 0) if root else (tr.m_LocalPosition.x * PX, -tr.m_LocalPosition.y * PX)
    return sprite.image.convert('RGBA').resize((round(w), round(h)), Image.LANCZOS), x, y

def canvas(layers):
    """The layers on one canvas, big enough for the mask (4.4 units tall): Pillow would crop
    what spills past an edge without a word, so that fails instead."""
    size = 8 * PX
    c = Image.new('RGBA', (size, size))
    for im, x, y in layers:
        left, top = round(size / 2 + x - im.width / 2), round(size / 2 + y - im.height / 2)
        if min(left, top) < 0 or max(left + im.width, top + im.height) > size:
            raise SystemExit(f'a {im.width}x{im.height} piece spills past the {size} px canvas')
        c.alpha_composite(im, (left, top))
    return c

def save(stem, images):
    box = images[0].getbbox()
    for im in images[1:]:
        b = im.getbbox()
        box = (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    for n, im in enumerate(images):
        im = im.crop(box)
        im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
        im.save(os.path.join(OUT_DIR, f'{stem}-{n}.png'), optimize=True)
        print(f'assets/hud/{stem}-{n}.png {im.width}x{im.height}')

def main():
    objs = objects()
    # The mask: each count is the whole mask; the empty one, the backboard over its outline.
    board = drawn(*objs['Heart Pieces'], root=True)[0]
    full = [canvas([drawn(*objs[f'Heart Pieces/Pieces {n}'])]) for n in range(1, 5)]
    b = full[-1].getbbox()
    empty = Image.new('RGBA', full[-1].size)
    empty.alpha_composite(board.crop(board.getbbox()).resize((b[2] - b[0], b[3] - b[1]), Image.LANCZOS), (b[0], b[1]))
    save('mask-pieces', [empty] + full)
    # The vessel: the backboard, and on it each count's piece; whole, the full one alone.
    board, single, double, full = objs['vessel sprites']
    at = lambda name, sprite: drawn(objs['Soul Orb/' + name][0], sprite)
    back = drawn(objs['Soul Orb'][0], board, root=True)
    save('vessel-pieces', [canvas([back]), canvas([back, at('Piece 1', single)]),
                           canvas([back, at('Piece 2', double)]), canvas([at('Piece All', full)])])

if __name__ == '__main__':
    main()
