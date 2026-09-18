#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract a usable colour palette from a reference image (e.g. a brand / cover slide).

Outputs:
  - a ranked list of dominant colours with coverage share
  - role suggestions (background / ink / primary / secondary / neutral)
  - optionally a JSON token file consumable by build_slide.py --palette

Usage:
    python3 extract_palette.py cover.png
    python3 extract_palette.py cover.png --colors 8 --out palette.json
    python3 extract_palette.py cover.png --ignore-top 0.06   # crop away a header band
"""
from __future__ import annotations

import argparse
import colorsys
import json

from PIL import Image


def rgb_to_hex(rgb) -> str:
    return "%02X%02X%02X" % tuple(int(v) for v in rgb[:3])


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb) -> float:
    r, g, b = [c / 255.0 for c in rgb[:3]]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def saturation(rgb) -> float:
    h, s, v = colorsys.rgb_to_hsv(*[c / 255.0 for c in rgb[:3]])
    return s


def is_near(a, b, tol=26) -> bool:
    return all(abs(x - y) <= tol for x, y in zip(a[:3], b[:3]))


def dominant_colors(img: Image.Image, k: int = 10):
    img = img.convert("RGB")
    # Downscale for speed; quantize is O(pixels).
    w, h = img.size
    scale = max(1, int(max(w, h) / 600))
    if scale > 1:
        img = img.resize((w // scale, h // scale), Image.LANCZOS)

    q = img.quantize(colors=k, method=Image.MEDIANCUT, dither=Image.NONE)
    palette = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)

    out = []
    for count, idx in counts:
        rgb = tuple(palette[idx * 3: idx * 3 + 3])
        out.append({
            "hex": rgb_to_hex(rgb),
            "rgb": list(rgb),
            "share": round(count / total, 4),
        })
    return out


def dedupe(items, tol=26):
    kept = []
    for it in items:
        rgb = hex_to_rgb(it["hex"])
        if any(is_near(rgb, hex_to_rgb(k["hex"]), tol) for k in kept):
            # merge share into the existing entry
            for k in kept:
                if is_near(rgb, hex_to_rgb(k["hex"]), tol):
                    k["share"] = round(k["share"] + it["share"], 4)
            continue
        kept.append(dict(it))
    kept.sort(key=lambda x: -x["share"])
    return kept


def suggest_roles(items):
    """Heuristic role assignment for a slide palette."""
    light = [c for c in items if luminance(c["rgb"]) > 0.80]
    dark = [c for c in items if luminance(c["rgb"]) < 0.25]
    mid = [c for c in items if 0.25 <= luminance(c["rgb"]) <= 0.80]

    chromatic = sorted(
        [c for c in items if saturation(c["rgb"]) > 0.18],
        key=lambda c: -c["share"])

    roles = {}
    if light:
        roles["background"] = max(light, key=lambda c: c["share"])["hex"]
    if dark:
        roles["ink"] = max(dark, key=lambda c: c["share"])["hex"]
    if chromatic:
        roles["primary"] = chromatic[0]["hex"]
    if len(chromatic) > 1:
        # pick a secondary with a clearly different hue
        h1 = colorsys.rgb_to_hsv(*[c / 255.0 for c in hex_to_rgb(chromatic[0]["hex"])])[0]
        for c in chromatic[1:]:
            h2 = colorsys.rgb_to_hsv(*[c / 255.0 for c in hex_to_rgb(c["hex"])])[0]
            if min(abs(h1 - h2), 1 - abs(h1 - h2)) > 0.12:
                roles["secondary"] = c["hex"]
                break
        if "secondary" not in roles and len(chromatic) > 1:
            roles["secondary"] = chromatic[1]["hex"]
    if mid:
        neutrals = [c for c in mid if saturation(c["rgb"]) <= 0.18]
        if neutrals:
            roles["neutral"] = max(neutrals, key=lambda c: c["share"])["hex"]
    return roles


def to_tokens(roles, items):
    """Emit palette tokens compatible with build_slide.py --palette."""
    tokens = {}
    mapping = {
        "background": "bg",
        "ink": "ink",
        "primary": "green",
        "secondary": "blue",
        "neutral": "slate_light",
    }
    for role, token in mapping.items():
        if role in roles:
            tokens[token] = roles[role]
    return tokens


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--colors", type=int, default=10)
    ap.add_argument("--ignore-top", type=float, default=0.0,
                    help="crop this fraction off the top before sampling")
    ap.add_argument("--ignore-bottom", type=float, default=0.0,
                    help="crop this fraction off the bottom before sampling")
    ap.add_argument("--out", help="write palette tokens as JSON")
    args = ap.parse_args()

    img = Image.open(args.image).convert("RGB")
    w, h = img.size
    if args.ignore_top or args.ignore_bottom:
        img = img.crop((0, int(h * args.ignore_top), w, int(h * (1 - args.ignore_bottom))))

    items = dedupe(dominant_colors(img, args.colors))
    roles = suggest_roles(items)

    print(f"image: {args.image}  ({w}x{h})")
    print(f"{'hex':<9}{'share':>8}  {'lum':>5}  {'sat':>5}")
    for it in items:
        rgb = hex_to_rgb(it["hex"])
        print(f"#{it['hex']:<8}{it['share'] * 100:>7.1f}%  "
              f"{luminance(rgb):>5.2f}  {saturation(rgb):>5.2f}")

    print("\nsuggested roles:")
    for role, hx_ in roles.items():
        print(f"  {role:<11} #{hx_}")

    if args.out:
        tokens = to_tokens(roles, items)
        payload = {"tokens": tokens, "dominant": items, "roles": roles}
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        print(f"\nwrote {args.out}")
        print("hint: python3 build_slide.py --palette " + args.out)


if __name__ == "__main__":
    main()
