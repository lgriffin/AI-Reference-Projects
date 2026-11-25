#!/usr/bin/env python3
"""Make a square title card PNG in the Tutors Ladder style.

Usage:
  python3 tutors/scripts/make-card.py "Title" "Subtitle" path/to/out.png [--rung LABEL] [--size 600]

  --rung   a short label for the badge in the top right, such as 1, 7, L3 or Summit
           (default: none). The ladder on the right lights up to that rung when it is
           a number from 1 to 7, or fully for "Summit".
  --size   width and height in pixels (default 600; Tutors shows cards small, and the
           validator warns over 2 MB).

Needs Python 3 and Pillow. Uses the Inter font when installed, then DejaVu Sans, then
Pillow's default font. Every card in the course comes from this script, so the course
keeps one visual style.
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFont

BG = (24, 36, 61)          # deep navy
PANEL = (32, 48, 80)
RAIL = (94, 122, 168)
RUNG_ON = (46, 196, 182)   # teal
RUNG_OFF = (60, 80, 118)
TITLE = (255, 255, 255)
SUBTITLE = (200, 214, 235)
BRAND = (46, 196, 182)

FONT_DIRS = [
    "/usr/share/fonts/opentype/inter",
    "/usr/share/fonts/truetype/inter",
    "/usr/share/fonts/truetype/dejavu",
    "/Library/Fonts",
    "C:/Windows/Fonts",
]


def font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def bold(size):
    return font(["Inter-Bold.otf", "Inter-Bold.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"], size)


def regular(size):
    return font(["Inter-Regular.otf", "Inter-Regular.ttf", "DejaVuSans.ttf", "Arial.ttf"], size)


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def lit_rungs(label):
    if label is None:
        return 0
    if label.lower() == "summit":
        return 7
    try:
        n = int(label)
        return max(0, min(7, n))
    except ValueError:
        return 0


def make_card(title, subtitle, out, rung=None, size=600):
    s = size / 600.0
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)

    # Ladder on the right: two rails, seven rungs, lit from the bottom up.
    x1, x2 = int(468 * s), int(552 * s)
    top, bottom = int(70 * s), int(560 * s)
    d.rounded_rectangle([x1 - 22 * s, top - 22 * s, x2 + 22 * s, bottom + 22 * s], radius=int(18 * s), fill=PANEL)
    rail_w = max(2, int(7 * s))
    d.rectangle([x1 - rail_w // 2, top, x1 + rail_w // 2, bottom], fill=RAIL)
    d.rectangle([x2 - rail_w // 2, top, x2 + rail_w // 2, bottom], fill=RAIL)
    lit = lit_rungs(rung)
    step = (bottom - top) / 8.0
    for i in range(7):
        y = int(bottom - step * (i + 1))
        colour = RUNG_ON if i < lit else RUNG_OFF
        d.rounded_rectangle([x1, y - int(6 * s), x2, y + int(6 * s)], radius=int(5 * s), fill=colour)

    # Brand line and optional badge.
    d.text((int(40 * s), int(44 * s)), "TUTORS LADDER", font=bold(int(22 * s)), fill=BRAND)
    if rung:
        label = rung if not rung.isdigit() else f"Rung {rung}"
        bf = bold(int(20 * s))
        w = d.textlength(label, font=bf)
        bx, by = int(40 * s), int(84 * s)
        d.rounded_rectangle([bx, by, bx + w + 24 * s, by + 36 * s], radius=int(18 * s), fill=RUNG_ON)
        d.text((bx + 12 * s, by + 6 * s), label, font=bf, fill=BG)

    # Title and subtitle, wrapped into the left column.
    col = int(390 * s)
    tsize = 56 if len(title) <= 24 else 46 if len(title) <= 40 else 38
    tf = bold(int(tsize * s))
    lines = wrap(d, title, tf, col)
    y = int(170 * s)
    for ln in lines[:5]:
        d.text((int(40 * s), y), ln, font=tf, fill=TITLE)
        y += int(tsize * 1.18 * s)
    if subtitle:
        y += int(14 * s)
        d.rectangle([int(40 * s), y, int(110 * s), y + max(2, int(5 * s))], fill=BRAND)
        y += int(26 * s)
        sf = regular(int(25 * s))
        for ln in wrap(d, subtitle, sf, col)[:6]:
            d.text((int(40 * s), y), ln, font=sf, fill=SUBTITLE)
            y += int(34 * s)

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, "PNG", optimize=True)


def main(argv):
    p = argparse.ArgumentParser(description="Make a Tutors Ladder title card PNG.")
    p.add_argument("title")
    p.add_argument("subtitle")
    p.add_argument("output")
    p.add_argument("--rung", default=None)
    p.add_argument("--size", type=int, default=600)
    a = p.parse_args(argv)
    make_card(a.title, a.subtitle, a.output, a.rung, a.size)


if __name__ == "__main__":
    main(sys.argv[1:])
