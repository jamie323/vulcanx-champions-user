"""Generate 8 heraldic species icons via OpenAI images API.

Each icon = a shield-framed emblem for one species. Transparent-friendly dark
background, gold rim, single hero motif (orc skull, elf leaf, dragon head, etc.)
so they sit well in a landing-page species grid.
"""
import json, pathlib, urllib.request, urllib.error, base64, sys, concurrent.futures

SECRETS = pathlib.Path.home() / ".openclaw" / "secrets.json"
KEY = json.loads(SECRETS.read_text())["OPENAI_API_KEY"]
ROOT = pathlib.Path(__file__).parent.parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)

SPECIES = [
    ("orc",        "A fierce orc warrior skull with curved tusks, battle-worn, green-tinged bone"),
    ("elf",        "An elegant elf silhouette crown with ornate leaf motifs and a bright moon behind"),
    ("goblin",     "A snarling goblin head in profile with jagged teeth and hooded cloak"),
    ("hellknight", "A menacing horned demon-knight helmet with glowing ember eyes, black and red"),
    ("drakkin",    "A coiled dragon head breathing a single ember, reptilian scales"),
    ("dwarf",      "A stout bearded dwarf face with a forged iron helm and hammer crossed behind"),
    ("beastkin",   "A savage bear-wolf hybrid head roaring, wild fur and fangs"),
    ("wraith",     "A ghostly hooded spectre face with glowing white hollow eyes and wispy smoke"),
]

STYLE = (
    "heraldic emblem inside a gold-rimmed shield, epic fantasy game icon, "
    "dark smoky background, dramatic lighting, game-crest style, crisp edges, "
    "no text, centered, symmetrical, trailer quality"
)

def gen(name, subject):
    print(f"[{name}] requesting...")
    prompt = f"{subject}. Style: {STYLE}."
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "size": "1024x1024",
        "n": 1,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body, method="POST",
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.loads(r.read().decode())
        b64 = data["data"][0]["b64_json"]
        out = OUT / f"{name}.png"
        out.write_bytes(base64.b64decode(b64))
        print(f"[{name}] -> {out} ({out.stat().st_size} bytes)")
        return True
    except urllib.error.HTTPError as e:
        print(f"[{name}] FAIL {e.code}: {e.read().decode()[:400]}")
        return False
    except Exception as e:
        print(f"[{name}] FAIL: {e}")
        return False

if __name__ == "__main__":
    # parallel — OpenAI images allows moderate concurrency
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(lambda p: gen(*p), SPECIES))
    print("done. icons in", OUT)
