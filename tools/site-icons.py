"""tools/site-icons.py — the site's icons, from Void Heart (assets/charms/voidheart.png, the game's
own charm) on the page's background (--bg in css/tokens.css): icon-48 and icon-192 (the <link
rel="icon">s), apple-touch-icon (180) and favicon.ico at the root (16, 32 and 48, for whatever
asks for /favicon.ico without reading the page: a search engine's result among them). Opaque,
on the background: a transparent icon is drawn on whatever the result's page has. The charm
fills FILL of the square: a phone's home screen and a search result's circle show it small.
Brought from pharloom-calculator's. Needs Pillow.

    python3 tools/site-icons.py         (npm run site-icons)
"""
import os, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FILL = 0.8  # the charm's larger side over the square's (it's round: the circle crops the corners)


def background():
    tokens = open(os.path.join(ROOT, "css", "tokens.css"), encoding="utf-8").read()
    hexa = re.search(r"--bg:\s*#([0-9a-fA-F]{6})", tokens).group(1)
    return tuple(int(hexa[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def icon(art, size, bg):
    art = art.crop(art.getbbox())
    k = size * FILL / max(art.size)
    w, h = max(1, round(art.width * k)), max(1, round(art.height * k))
    art = art.resize((w, h), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), bg)
    out.alpha_composite(art, ((size - w) // 2, (size - h) // 2))
    return out.convert("RGB")


def main():
    art = Image.open(os.path.join(ROOT, "assets", "charms", "voidheart.png")).convert("RGBA")
    bg = background()
    site = os.path.join(ROOT, "assets", "site")
    for name, size in (("icon-48", 48), ("icon-192", 192), ("apple-touch-icon", 180)):
        icon(art, size, bg).save(os.path.join(site, name + ".png"), optimize=True)
    # Each size drawn on its own, not the 48 shrunk: the ICO keeps every frame it's given.
    sizes = (16, 32, 48)
    icon(art, 48, bg).save(os.path.join(ROOT, "favicon.ico"), sizes=[(s, s) for s in sizes],
                           append_images=[icon(art, s, bg) for s in sizes[:-1]])
    print("icon-48, icon-192, apple-touch-icon and favicon.ico written")


if __name__ == "__main__":
    main()
