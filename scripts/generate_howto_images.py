"""Generate 5 illustrative images for the How It Works page.
Fantasy epic, consistent style — matches species heraldic icons already on the site.
"""
import json, pathlib, urllib.request, urllib.error, base64, concurrent.futures

SECRETS = pathlib.Path.home() / ".openclaw" / "secrets.json"
KEY = json.loads(SECRETS.read_text())["OPENAI_API_KEY"]
ROOT = pathlib.Path(__file__).parent.parent
OUT = ROOT / "howto"
OUT.mkdir(exist_ok=True)

STYLE = (
    "epic fantasy illustration, warm gold and ember orange palette, "
    "dark moody background, dramatic cinematic lighting, ornate heraldic framing, "
    "centered composition, painterly oil-painting feel, "
    "no text, no watermarks, crisp detail, trailer key-art quality"
)

IMAGES = [
    ("01_adopt",  "A glowing golden egg hatching on a stone altar, tiny baby champion silhouette visible inside the cracking shell, ember sparks rising, fantasy adoption ceremony moment"),
    ("02_quest",  "A heroic champion silhouette running across a fantasy realm with scattered treasure chests glowing in the distance, magical portals, quest banners, adventurous atmosphere showing the ecosystem of games"),
    ("03_feed",   "A glowing magical potion bottle tipping and pouring luminous liquid towards a young fantasy champion, energy swirling, stats rising visually as particles, ornate alchemy feel"),
    ("04_evolve", "A champion transformation moment — younger form on the left, older more powerful armored form on the right, both silhouetted against a bright burst of golden light in the middle, dramatic metamorphosis, runic circle beneath their feet"),
    ("05_ascend", "A legendary fully-evolved fantasy champion in ornate armor standing on a pedestal, bathed in divine golden light with magical runes orbiting around them, wings or aura of magic, the ultimate animated NFT form, one-of-a-kind masterpiece"),
]

def gen(name, subject):
    print(f"[{name}] requesting...")
    prompt = f"{subject}. Style: {STYLE}."
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "size": "1536x1024",
        "n": 1,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body, method="POST",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.loads(r.read().decode())
        b64 = data["data"][0]["b64_json"]
        out = OUT / f"{name}.png"
        out.write_bytes(base64.b64decode(b64))
        print(f"[{name}] -> {out} ({out.stat().st_size} bytes)")
        return True
    except Exception as e:
        print(f"[{name}] FAIL: {e}")
        return False

if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        list(ex.map(lambda p: gen(*p), IMAGES))
    print("done. howto images in", OUT)
