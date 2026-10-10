#!/usr/bin/env python3
"""tools/pad-broken.py — gives each broken fragile charm its whole charm's canvas.

The wiki's broken drawings (assets/charms/f*-broken.png, from tools/fetch-icons.js) come cropped
to the edge, while the whole ones keep a transparent margin. The drawings are the same size, but
the cells paint the canvas with object-fit: contain, so the broken one looked ~5-10 % bigger.
This centres each broken drawing on where its whole charm's drawing sits, on a canvas the same
size. Run it after `npm run icons -- --force`; running it twice changes nothing.

Usage: python3 tools/pad-broken.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

CHARMS = Path(__file__).resolve().parent.parent / 'assets' / 'charms'
SOLID = 40  # alpha above this is the drawing, below it the faint edge


def body(im):
    """The box of what's really drawn."""
    return im.getchannel('A').point(lambda a: 255 if a > SOLID else 0).getbbox()


for name in ('fheart', 'fgreed', 'fstrength'):
    whole = Image.open(CHARMS / f'{name}.png').convert('RGBA')
    path = CHARMS / f'{name}-broken.png'
    broken = Image.open(path).convert('RGBA')
    broken = broken.crop(broken.getbbox())  # undo an earlier pass
    wb, bb = body(whole), body(broken)
    x = round((wb[0] + wb[2]) / 2 - (bb[0] + bb[2]) / 2)
    y = round((wb[1] + wb[3]) / 2 - (bb[1] + bb[3]) / 2)
    out = Image.new('RGBA', whole.size, (0, 0, 0, 0))
    out.alpha_composite(broken, (max(0, x), max(0, y)))
    out.save(path, optimize=True)
    print(f'{path.name}: {broken.size} at ({x}, {y}) on {whole.size}')
