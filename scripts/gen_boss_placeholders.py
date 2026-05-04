#!/usr/bin/env python3
"""Local placeholder boss images so the Campaign UI looks right
before the OpenAI-generated portraits land. Each placeholder is a
themed gradient + boss name + chapter number, 1024x1024 PNG."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).parent.parent / "img" / "campaign"
OUT.mkdir(parents=True, exist_ok=True)

# (slug, chapter num, title, boss name, gradient top, gradient bottom, accent)
BOSSES = [
    ("ch1_skarn", 1, "THE PIT TRIALS",       "SKARN THE WHELP-EATER",   (60, 30, 20),  (90, 65, 40), (255, 180, 90)),
    ("ch2_vexora", 2, "THE BONE COLISEUM",   "VEXORA THE BONE EMPRESS", (40, 30, 60),  (15, 10, 30), (180, 130, 255)),
    ("ch3_mossback", 3, "THE VERDANT WASTES", "THORNWARDEN MOSSBACK",   (30, 50, 30),  (10, 30, 15), (130, 220, 130)),
    ("ch4_pyrrhos", 4, "THE OBSIDIAN CITADEL","INFERNO-KING PYRRHOS",   (90, 25, 15),  (30, 5, 5),   (255, 130, 60)),
    ("ch5_aetheron", 5, "THE VULCAN APEX",    "VOIDLORD AETHERON",      (20, 20, 50),  (5, 5, 15),   (220, 220, 255)),
]

W, H = 1024, 1024


def font(size, bold=True):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def gen(slug, chap_n, chap_title, boss_name, top, bot, accent):
    img = Image.new("RGB", (W, H), bot)
    px = img.load()
    # Vertical gradient
    for y in range(H):
        t = y / H
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(W):
            px[x, y] = (r, g, b)

    d = ImageDraw.Draw(img)

    # Decorative diagonal bars at the top corners
    d.polygon([(0, 0), (260, 0), (0, 260)], fill=(min(255, top[0] + 25), min(255, top[1] + 25), min(255, top[2] + 25)))
    d.polygon([(W, 0), (W - 260, 0), (W, 260)], fill=(min(255, top[0] + 25), min(255, top[1] + 25), min(255, top[2] + 25)))

    # Center seal — a circle outline + glow
    cx, cy = W // 2, H // 2 - 40
    for r in range(380, 280, -2):
        a = max(0, 30 - (380 - r) // 4)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(accent[0], accent[1], accent[2]))
    d.ellipse((cx - 240, cy - 240, cx + 240, cy + 240), outline=accent, width=4)

    # Chapter number, big roman-ish
    chap_str = ["I", "II", "III", "IV", "V"][chap_n - 1]
    cf = font(220, True)
    bbox = d.textbbox((0, 0), chap_str, font=cf)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text(((W - tw) // 2, cy - th // 2 - bbox[1]), chap_str, fill=accent, font=cf)

    # Chapter title (top)
    tf = font(38, True)
    bbox = d.textbbox((0, 0), chap_title, font=tf)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 70), chap_title, fill=(240, 230, 200), font=tf)

    # "CHAPTER" small
    sf = font(20, True)
    label = f"CHAPTER  {chap_n}"
    bbox = d.textbbox((0, 0), label, font=sf)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 35), label, fill=accent, font=sf)

    # Boss name (bottom band)
    band_h = 180
    d.rectangle([(0, H - band_h), (W, H)], fill=(0, 0, 0))
    bn_f = font(48, True)
    bbox = d.textbbox((0, 0), boss_name, font=bn_f)
    d.text(((W - (bbox[2] - bbox[0])) // 2, H - band_h + 50), boss_name, fill=accent, font=bn_f)

    bs_f = font(22, True)
    sub = "BOSS"
    bbox = d.textbbox((0, 0), sub, font=bs_f)
    d.text(((W - (bbox[2] - bbox[0])) // 2, H - band_h + 18), sub, fill=(180, 180, 180), font=bs_f)

    out = OUT / f"boss_{slug}.png"
    img.save(out, "PNG")
    print(f"  wrote {out.name}")


def main():
    print(f"Generating {len(BOSSES)} placeholder boss images...")
    for b in BOSSES:
        gen(*b)
    print("done.")


if __name__ == "__main__":
    main()
