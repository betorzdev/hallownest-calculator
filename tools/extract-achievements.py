#!/usr/bin/env python3
"""tools/extract-achievements.py — the game's achievements, read from its files: writes
assets/achievements/ and checks js/achievements.js against the game's own list.

Needs the game installed and UnityPy, like tools/extract-map.py (run once per game patch):

    python3 tools/extract-achievements.py [path/to/hollow_knight_Data]

What it reads: the "Achievements List" object in resources.assets (a MonoBehaviour UnityPy
can't type, so it's read from its raw data). After the object's name, a count and then one
record per achievement, in the game's order:
    key (string), type (int: 0 shown, 1 hidden until earned), earned icon (PPtr),
    unearned icon (PPtr), text key (string), title key (string)
Strings are an int length, the UTF-8 bytes, and padding to 4; a PPtr is an int file id and a
long path id. The earned icon is a Sprite of the same file (most in the "Achievement_icons"
atlas, the Grimm Troupe's in its own), saved here as assets/achievements/<id>.png at 80×80,
the game's size for most, in a palette of 256 colours. <id> is the English title (kb/data/all_text.json), in lowercase
and joined by dashes: "Soul & Shade" → soul-shade.

The check: every key in js/achievements.js (`key: 'FK_DEFEAT'`) has to be in the game's list,
with the same hidden flag, and no achievement of the list can be missing there. It stops if
they differ, so a patch that changes the list doesn't go unnoticed.
"""
import json, os, re, struct, sys
import UnityPy
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/.local/share/Steam/steamapps/common/Hollow Knight/hollow_knight_Data')
OUT_DIR = os.path.join(ROOT, 'assets', 'achievements')
MODULE = os.path.join(ROOT, 'js', 'achievements.js')
TEXT = os.path.join(ROOT, 'kb', 'data', 'all_text.json')
SIZE = 80
LIST_NAME = 'Achievements List'

def slug(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower().replace('&', '')).strip('-')

def read_list(raw):
    """The records of the Achievements List, from its raw data."""
    p = 28   # the MonoBehaviour's header: game object, enabled, script (PPtrs)
    def string():
        nonlocal p
        n = struct.unpack_from('<i', raw, p)[0]
        v = raw[p + 4:p + 4 + n].decode('utf-8')
        p = (p + 4 + n + 3) // 4 * 4
        return v
    def i32():
        nonlocal p
        v = struct.unpack_from('<i', raw, p)[0]
        p += 4
        return v
    def pptr():
        nonlocal p
        _, path_id = struct.unpack_from('<iq', raw, p)
        p += 12
        return path_id
    name = string()
    if name != LIST_NAME:
        raise SystemExit(f'not the achievements list: {name!r}')
    out = []
    for _ in range(i32()):
        key, kind, icon, _locked, text, title = string(), i32(), pptr(), pptr(), string(), string()
        out.append({'key': key, 'hidden': kind == 1, 'icon': icon, 'text': text, 'title': title})
    if p != len(raw):
        raise SystemExit(f'the list ended at {p}, its data at {len(raw)}: its shape changed')
    return out

def main():
    env = UnityPy.load(os.path.join(DATA, 'resources.assets'))
    sprites, lst = {}, None
    for o in env.objects:
        if o.type.name == 'Sprite':
            sprites[o.path_id] = o
        elif o.type.name == 'MonoBehaviour' and lst is None:
            raw = o.get_raw_data()
            if LIST_NAME.encode() in raw[:64]:
                lst = read_list(raw)
    if not lst:
        raise SystemExit('no Achievements List in resources.assets')
    en = json.load(open(TEXT, encoding='utf-8'))['EN']

    os.makedirs(OUT_DIR, exist_ok=True)
    for a in lst:
        a['id'] = slug(en[a['title']])
        img = sprites[a['icon']].read().image.convert('RGBA')
        if img.size != (SIZE, SIZE):
            img = img.resize((SIZE, SIZE), Image.LANCZOS)
        # A palette of 256, as the Journal's pictures: a fifth of the weight, and it looks the same.
        img = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        img.save(os.path.join(OUT_DIR, a['id'] + '.png'), optimize=True)
        print(a['key'], a['id'], 'hidden' if a['hidden'] else '')
    ids = [a['id'] for a in lst]
    if len(set(ids)) != len(ids):
        raise SystemExit('two achievements share an id')

    # The check against the site's module.
    src = open(MODULE, encoding='utf-8').read()
    # One achievement per line: its key and, if it's hidden, `hidden: true` on the same line.
    site = {m.group(1): 'hidden: true' in line for line in src.splitlines()
            for m in [re.search(r"key: '([A-Z0-9_]+)'", line)] if m}
    game = {a['key']: a['hidden'] for a in lst}
    wrong = [k for k in game if k not in site] + [k for k in site if k not in game] \
        + [k for k in game if k in site and site[k] != game[k]]
    if wrong:
        raise SystemExit('js/achievements.js differs from the game: ' + ', '.join(wrong))
    print(len(lst), 'achievements,', sum(a['hidden'] for a in lst), 'hidden')

if __name__ == '__main__':
    main()
