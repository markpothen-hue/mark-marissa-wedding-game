"""Build every in-game sprite at ONE pixel density so the art reads as a single style.

Painted art (characters, items sheet) is re-pixelated to a small grid, and hand-drawn
ASCII sprites use the same grid. Everything is then upscaled by SCALE with nearest
neighbour. Output: public/assets/px/*.png (strips are horizontal frame sheets).

Run: python3 tools/build_sprites.py
"""
import math
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(SRC, 'px')
SCALE = 2
os.makedirs(OUT, exist_ok=True)


def save(img, name):
    img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST).save(os.path.join(OUT, name + '.png'))


def pixelate(im, h):
    im = im.convert('RGBA')
    bb = im.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    im = im.crop(bb)
    w = max(1, round(im.width * h / im.height))
    sm = im.resize((w, h), Image.BOX)
    px = sm.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255 if a > 110 else 0)
    return sm


# ── Characters: the still (menus) + a pose strip [run0..run3, jump, duck] for gameplay ──
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_cycle import pose_frames  # noqa: E402

WAIST = {'mark': 23, 'marissa': 28}   # art-pixel row where the legs start
for who in ('mark', 'marissa'):
    still = pixelate(Image.open(os.path.join(SRC, 'char-%s.png' % who)), 40)
    save(still, who)
    frames = pose_frames(still, WAIST[who])
    fw, fh = frames[0].size
    sheet_ = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet_.paste(f, (i * fw, 0))
    save(sheet_, who + '-poses')
    print(who + '-poses frame', fw * SCALE, fh * SCALE)

# ── Items sheet: 4 cols x 2 rows ──
sheet = Image.open(os.path.join(SRC, 'obstacles.png'))
cw, ch = sheet.width // 4, sheet.height // 2
items = [
    ('heart', 0, 0, 13), ('dumpling', 1, 0, 15), ('cookie', 2, 0, 13), ('apple', 3, 0, 14),
    ('boulder', 0, 1, 17), ('cart', 1, 1, 26), ('squirrel', 2, 1, 18), ('raccoon', 3, 1, 18),
]
for name, cx, cy, h in items:
    cell = sheet.crop((cx * cw, cy * ch, (cx + 1) * cw, (cy + 1) * ch))
    save(pixelate(cell, h), name)

# ── ASCII sprites ──
PAL = {
    '.': None,
    'k': (26, 22, 30), 'K': (60, 52, 60), 'g': (150, 150, 160), 'G': (205, 205, 215), 'w': (250, 248, 240),
    'r': (200, 40, 50), 'R': (240, 90, 80), 'm': (139, 26, 43), 'M': (176, 48, 70),
    'y': (218, 165, 32), 'Y': (255, 215, 90), 'o': (230, 120, 40), 'O': (250, 170, 70),
    'b': (110, 70, 35), 'B': (150, 100, 50), 'd': (75, 45, 25), 'n': (190, 140, 80),
    'u': (40, 100, 200), 'U': (90, 160, 240), 'c': (120, 200, 255), 'p': (240, 120, 180), 'P': (255, 180, 215),
    's': (120, 115, 110), 'S': (165, 160, 150), 't': (90, 85, 85), 'e': (60, 130, 60), 'E': (100, 180, 80),
    'v': (140, 90, 200), 'V': (190, 150, 240),
}


def ascii_img(rows):
    w = max(len(r) for r in rows)
    img = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch_ in enumerate(row):
            c = PAL.get(ch_)
            if c:
                img.putpixel((x, y), c + (255,))
    return img


def strip(frames):
    w, h = frames[0].width, frames[0].height
    out = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w, 0))
    return out


SPRITES = {
    'lantern': [
        '.....kk.....',
        '.....kk.....',
        '...YYYYYY...',
        '..yyyyyyyy..',
        '.rRRRRRRRRr.',
        'rRRwRRRRRRRr',
        'rRwRRYYRRRRr',
        'rRRRRYYRRRRr',
        'rrrrrrrrrrrr',
        'rRRRRYYRRRRr',
        'rRRRRYYRRRRr',
        'rRRRRRRRRRrr',
        '.rRRRRRRRRr.',
        '..yyyyyyyy..',
        '...YYYYYY...',
        '.....yy.....',
        '....y..y....',
        '....y..y....',
    ],
    'bench': [
        'nnnnnnnnnnnnnnnnnn',
        'BBBBBBBBBBBBBBBBBB',
        'dddddddddddddddddd',
        '..k............k..',
        'nnnnnnnnnnnnnnnnnn',
        'BBBBBBBBBBBBBBBBBB',
        '.kk............kk.',
        '.k..............k.',
        '.k..............k.',
        'kk..............kk',
    ],
    'puddle': [
        '...uuuuuuuuu...',
        '.uUUccUUUUUUuu.',
        'uUUUUUUUccUUUUu',
        '.uuuuuuuuuuuuu.',
    ],
    'pinecone': [
        '...e...',
        '..eE...',
        '.bBnBb.',
        'bBdBdBb',
        'bdBnBdb',
        'BnbdbnB',
        'bdBnBdb',
        'bBdBdBb',
        '.bdBdb.',
        '..bdb..',
        '...b...',
    ],
    'leaf': [
        '......oo.',
        '....oOOo.',
        '..oOOoOOo',
        '.oOooOOo.',
        'oOoOOOo..',
        '.oOOoo...',
        'b.oo.....',
    ],
    'ring': [
        '...cwc...',
        '..cwUwc..',
        '...cwc...',
        '..YyyyY..',
        '.Y.....Y.',
        'Y.......y',
        'Y.......y',
        '.Y.....y.',
        '..yyyyy..',
    ],
    'bullet': [
        '.PP.PP.',
        'PpppppP',
        'Ppppppp',
        '.ppppp.',
        '..ppp..',
        '...p...',
    ],
    'pebble': [
        '..e....',
        '.dddd..',
        'dnnnnd.',
        'bBBBBb.',
        'bBBnBb.',
        '.bBBb..',
        '..bb...',
    ],
    'flag': [
        'GY.................',
        'GYrrrrrrrrrrrrr....',
        'G.rRRRRRRRRRRRRrr..',
        'G.rRRwwRRRRwwRRRRr.',
        'G.rRwwwwRRwwwwRRRRr',
        'G.rRwwwwwwwwwwRRRr.',
        'G.rRRwwwwwwwwRRrr..',
        'G.rRRRwwwwwwRRr....',
        'G.rRRRRwwwwRRRr....',
        'G.rrrrrrwwrrrrr....',
        'G..................',
    ] + ['G' + '.' * 18] * 30 + ['sSSSs' + '.' * 14, 'tsssst' + '.' * 13],
    'checkpoint': [
        'GY........',
        'GyYYYYY...',
        'G.yYwYYYY.',
        'G.yYYYYy..',
        'G.yyyy....',
        'G.........',
    ] + ['G' + '.' * 9] * 18 + ['sSs.......'],
}
for name, rows in SPRITES.items():
    save(ascii_img(rows), name)

# Park bench (32x18) and puddle (26x7)
W = 32
bench_rows = ['.' * 2 + 'k' + '.' * 26 + 'k' + '..'] * 0
bench_rows += ['nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'dddddddddddddddddddddddddddddddd',
               '..k..........................k..',
               'nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'dddddddddddddddddddddddddddddddd',
               '..k..........................k..',
               'KnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnK', 'KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK', 'Kddddddddddddddddddddddddddddddk',
               '.kk..........................kk.', '.k............................k.', '.k............................k.',
               '.k............................k.', '.k............................k.', 'kkk..........................kkk']
save(ascii_img(bench_rows), 'bench')
pud = Image.new('RGBA', (26, 7), (0, 0, 0, 0))
for y in range(7):
    for x in range(26):
        d = ((x - 12.5) / 12.5) ** 2 + ((y - 3) / 3.2) ** 2
        if d <= 1:
            c = 'c' if (y == 2 and 6 < x < 11) or (y == 4 and 15 < x < 19) else 'U' if d < 0.6 else 'u'
            pud.putpixel((x, y), PAL[c] + (255,))
save(pud, 'puddle')

# Crate (18x18)
crate = Image.new('RGBA', (18, 18), (0, 0, 0, 0))
for y in range(18):
    for x in range(18):
        edge = x in (0, 17) or y in (0, 17)
        frame = x in (1, 16) or y in (1, 16)
        diag = abs(x - y) <= 0 or abs(x - (17 - y)) <= 0
        c = 'd' if edge else 'n' if frame else 'n' if diag else ('b' if (y // 4) % 2 else 'B')
        crate.putpixel((x, y), PAL[c] + (255,))
save(crate, 'crate')

# Platform ledge tile (16x8) — brownstone ledge matching the city wall
save(ascii_img([
    'SGGGGGGGSGGGGGGG',
    'SSSSSSSSSSSSSSSS',
    'BnBBBBBdBnBBBBBd',
    'BBBBBBBdBBBBBBBd',
    'dddddddddddddddd',
    'BBBdBnBBBBBdBnBB',
    'BBBdBBBBBBBdBBBB',
    'dddddddddddddddd',
]), 'ledge')

# Ground tile (16x24): sidewalk slab on brick
ground = [
    'GGGGGGGGGGGGGGGG',
    'SSSSSSSSSSSSSSSt',
    'SSSSSSSSSSSSSSSt',
    'SSSSSSSSSSSSSSSt',
    'sssssssssssssssk',
    'kkkkkkkkkkkkkkkk',
]
brick_a = 'BnBBBBBdBnBBBBBd'
brick_b = 'BBBdBnBBBBBdBnBB'
mortar = 'dddddddddddddddd'
for i in range(12):
    b = brick_a if i % 2 == 0 else brick_b
    ground += [b, b.replace('n', 'B'), mortar]
save(ascii_img(ground), 'ground')

# Chinatown street tile (16x8)
save(ascii_img([
    'GSSSSSSSGSSSSSSS',
    'SsssssssSsssssss',
    'tttttttttttttttt',
    'KKKKKKKKKKKKKKKK',
    'KtKKKKKKKKKtKKKK',
    'KKKKKKKKKKKKKKKK',
    'KKKKKKtKKKKKKKKK',
    'KKKKKKKKKKKKKKKK',
]), 'street')

# Dirt path tile (park)
save(ascii_img([
    'EeEEeEEEeEEEEeEE',
    'eeeeeeeeeeeeeeee',
    'nnnnnnnnnnnnnnnn',
    'nBnnnnnnnnBnnnnn',
    'nnnnnBnnnnnnnnnn',
    'nnnnnnnnnnnnnBnn',
    'BBBBBBBBBBBBBBBB',
    'bbbbbbbbbbbbbbbb',
]), 'path')


# ── Generated animation strips ──
def wheel_frames(n=4, size=17):
    frames = []
    c = (size - 1) / 2
    for f in range(n):
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        for y in range(size):
            for x in range(size):
                dx, dy = x - c, y - c
                d = math.hypot(dx, dy)
                if 6.9 <= d <= 8.4:
                    img.putpixel((x, y), PAL['k'] + (255,))
                elif 6.0 <= d < 6.9:
                    img.putpixel((x, y), PAL['K'] + (255,))
                elif d < 1.6:
                    img.putpixel((x, y), PAL['G'] + (255,))
                elif d < 6.0:
                    a = math.atan2(dy, dx) - f * (math.pi / 2) / n
                    if abs(math.sin(2 * a)) < 0.22 or abs(math.cos(2 * a)) < 0.0:
                        img.putpixel((x, y), PAL['g'] + (255,))
        frames.append(img)
    return frames


save(strip(wheel_frames()), 'wheel')

def line(img, a, b, col):
    (x0, y0), (x1, y1) = a, b
    n = max(1, abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1):
        img.putpixel((round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)), col + (255,))


bike = Image.new('RGBA', (41, 17), (0, 0, 0, 0))
R, BB, S, H, F = (8, 16), (19, 16), (15, 5), (30, 5), (32, 16)
for a, b in [(R, BB), (R, S), (S, BB), (S, H), (H, BB), (H, F)]:
    line(bike, a, b, PAL['u'])
for a, b in [((S[0] + 1, S[1]), (H[0] - 1, H[1]))]:
    line(bike, (a[0], a[1] + 1), (b[0], b[1] + 1), PAL['U'])
line(bike, (12, 3), (18, 3), PAL['k'])
line(bike, (15, 4), (15, 4), PAL['K'])
line(bike, (H[0], H[1]), (28, 1), PAL['g'])
line(bike, (27, 1), (31, 1), PAL['k'])
line(bike, (BB[0] - 2, BB[1]), (BB[0] + 2, BB[1]), PAL['K'])
save(bike, 'bikeframe')


def carpet_frames(n=4, w=34, h=7):
    rows = [
        'y' * w,
        'm' + 'MyM' * 10 + 'MMm',
        'm' + 'yMm' * 10 + 'MMm',
        'm' + 'MyM' * 10 + 'MMm',
        'y' * w,
    ]
    frames = []
    for f in range(n):
        img = Image.new('RGBA', (w + 4, h + 3), (0, 0, 0, 0))
        for x in range(w):
            off = round(1.4 * math.sin((x / w) * math.pi * 2 + f * math.pi / 2))
            for y, row in enumerate(rows):
                c = PAL[row[x] if x < len(row) else 'm']
                img.putpixel((x + 2, y + 2 + off), c + (255,))
        # tassels
        for y in (2, 4, 6):
            lo = round(1.4 * math.sin(f * math.pi / 2))
            img.putpixel((0, y + lo), PAL['Y'] + (255,))
            img.putpixel((1, y + lo), PAL['y'] + (255,))
        frames.append(img)
    return frames


save(strip(carpet_frames()), 'carpet')


def puff_frames():
    out = []
    for r in (1.5, 2.6, 3.4):
        img = Image.new('RGBA', (9, 9), (0, 0, 0, 0))
        for y in range(9):
            for x in range(9):
                d = math.hypot(x - 4, y - 4)
                if d <= r and not (r > 3 and d < r - 1.3):
                    img.putpixel((x, y), (240, 235, 225, 255))
        out.append(img)
    return out


save(strip(puff_frames()), 'puff')

spark = []
for s in range(3):
    img = Image.new('RGBA', (7, 7), (0, 0, 0, 0))
    L = [1, 2, 3][s]
    for i in range(-L, L + 1):
        img.putpixel((3 + i, 3), PAL['Y'] + (255,))
        img.putpixel((3, 3 + i), PAL['Y'] + (255,))
    img.putpixel((3, 3), PAL['w'] + (255,))
    spark.append(img)
save(strip(spark), 'spark')

# 1-art-pixel square for particles
save(ascii_img(['w']), 'dot')

# Full heart / empty heart HUD icons
hud = [
    '.rr.rr.',
    'rRRrRRr',
    'rRwRRRr',
    'rRRRRRr',
    '.rRRRr.',
    '..rRr..',
    '...r...',
]
save(ascii_img(hud), 'hud-heart')
save(ascii_img([r.replace('R', 'K').replace('w', 'K').replace('r', 'k') for r in hud]), 'hud-heart-empty')
print('sprites written to', OUT)
