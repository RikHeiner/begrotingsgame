import sys
from PIL import Image, ImageDraw, ImageFont
N = '/tmp/claude-0/-home-user-begrotingsgame/4d27a988-6c08-5dbf-9c0b-730d6915427e/scratchpad/nov11/src/word/media/'
T = Image.open(N + 'image2.jpg').convert('RGB')   # sjabloon: Financieel overzicht (03)
C1 = Image.open(N + 'image1.jpg').convert('RGB')
C5 = Image.open(N + 'image5.jpg').convert('RGB')
W, H = T.size
DARK = (10, 44, 204); LIGHT = (35, 66, 209)
import subprocess
def font(bold, size):
    name = 'Inter:style=Bold' if bold else 'Inter:style=Regular'
    path = subprocess.run(['fc-match', '-f', '%{file}', name], capture_output=True, text=True).stdout
    return ImageFont.truetype(path, size)

def isblue(p):
    return any(abs(p[0]-c[0]) < 14 and abs(p[1]-c[1]) < 14 and abs(p[2]-c[2]) < 14 for c in (DARK, LIGHT, (34, 65, 208)))

def erase(img, box, keep_x0=None):
    """Tekst in box wegwerken: per pixel de schoonste achtergrond uit de drie voorbladen."""
    x0, y0, x1, y1 = box
    out = img.load(); srcs = (T.load(), C1.load(), C5.load())
    REF = (DARK, LIGHT, (34, 65, 208))
    def dist(p):
        return min(max(abs(p[0]-c[0]), abs(p[1]-c[1]), abs(p[2]-c[2])) for c in REF)
    for y in range(y0, y1):
        for x in range(x0, x1):
            best = min((dist(s_[x, y]), s_[x, y]) for s_ in srcs)
            if best[0] <= 5:
                out[x, y] = best[1]
            else:
                out[x, y] = srcs[0][x, 1702]

def orange_color():
    px = T.load(); best = None
    for y in range(1319, 1343):
        for x in range(119, 154):
            p = px[x, y]
            if p[0] > 200 and (best is None or p[0] - p[2] > best[0] - best[2]): best = p
    return best

ORANJE = orange_color()

def tekst(img, nummer, titel, kern, sub, extra=0):
    erase(img, (112, 1310, 175, 1350))          # nummer
    erase(img, (205, 1385, W, 1495))            # titel (pijl blijft staan)
    erase(img, (112, 1595, 1150, 1700))         # kerncijfer
    erase(img, (112, 1712, 1150, 1760))         # onderregel
    d = ImageDraw.Draw(img)
    def put(txt, f, x, top, color):
        bb = d.textbbox((0, 0), txt, font=f)
        d.text((x - bb[0], top - bb[1]), txt, font=f, fill=color)
    put(nummer, font(True, 33), 119, 1319, ORANJE)
    regels = titel if isinstance(titel, list) else [titel]
    for i, r in enumerate(regels):
        put(r, font(True, TITEL_SIZE), 230, 1396 + i * 130, (255, 255, 255))
    extra = (len(regels) - 1) * 130
    if kern:
        put(kern, font(True, KERN_SIZE), 118, 1605 + extra, (255, 255, 255))
    if sub:
        put(sub, font(False, SUB_SIZE), 118, 1721 + extra, (255, 255, 255))

# lettergroottes kalibreren op het sjabloon
def kalibreer(txt, bold, breedte):
    lo, hi = 10, 200
    d = ImageDraw.Draw(T)
    while lo < hi:
        m = (lo + hi + 1) // 2
        bb = d.textbbox((0, 0), txt, font=font(bold, m))
        if bb[2] - bb[0] <= breedte: lo = m
        else: hi = m - 1
    return lo
TITEL_SIZE = kalibreer('Financieel overzicht.', True, 1291 - 230)
KERN_SIZE = kalibreer('€ 162,8 miljoen', True, 757 - 118)
SUB_SIZE = kalibreer('cumulatief saldo 2027–2030, naar de reserves van de gemeente.', False, 1059 - 118)
print('maten', TITEL_SIZE, KERN_SIZE, SUB_SIZE, ORANJE)

# 1. Financieel overzicht: 03 -> 04 (alleen het nummer)
fo = T.copy()
erase(fo, (112, 1310, 175, 1350))
d = ImageDraw.Draw(fo)
bb = d.textbbox((0, 0), '04', font=font(True, 33)); d.text((119 - bb[0], 1319 - bb[1]), '04', font=font(True, 33), fill=ORANJE)
fo.save(sys.argv[1] + '/financieel_04.jpg', quality=92)

# 2. nieuw voorblad: foto Korenbeurs boven de oranje streep
nw = T.copy(); px = T.load()
def isoranje(p): return p[0] > 200 and 60 < p[1] < 150 and p[2] < 90
grens = []
for x in range(W):
    y = 900
    while y < 1300 and not isoranje(px[x, y]): y += 1
    grens.append(y)
pts = [(x, g) for x, g in enumerate(grens) if 100 <= x <= W - 100 and g < 1300]
n = len(pts); sx = sum(p[0] for p in pts); sy = sum(p[1] for p in pts)
sxx = sum(p[0] ** 2 for p in pts); sxy = sum(p[0] * p[1] for p in pts)
a_ = (n * sxy - sx * sy) / (n * sxx - sx * sx); b_ = (sy - a_ * sx) / n
grens = [int(a_ * x + b_) for x in range(W)]
print('streep', grens[0], grens[-1])
hmax = max(grens)
foto = Image.open(sys.argv[2]).convert('RGB')
schaal = max(W / foto.width, hmax / foto.height)
foto = foto.resize((round(foto.width * schaal), round(foto.height * schaal)), Image.LANCZOS)
ox = (foto.width - W) // 2 + int(sys.argv[3]) if len(sys.argv) > 3 else (foto.width - W) // 2
ox = max(0, min(ox, foto.width - W))
oy = max(0, foto.height - hmax)
fp = foto.load(); npx = nw.load()
for x in range(W):
    for y in range(grens[x]):
        npx[x, y] = fp[x + ox, y + oy]
tekst(nw, '03', ['Een financieel', 'gezonde gemeente.'], '111%',
      'reëel weerstandsvermogen, met de risico’s eerlijk meegenomen.')
nw.save(sys.argv[1] + '/financieel_gezond_03.jpg', quality=92)
