#!/usr/bin/env python3
"""Kok Bisa? #8 - Gambut: kok apinya menyala di bawah tanah? (2D sinematik, standar v2)

Fakta: GNFI "Mengenal Tanah Gambut, Salah Satu Faktor Risiko Kebakaran Hutan";
Wikipedia ID "Gambut"; Wikipedia EN "Smouldering", "Peat swamp forest", "2015 Southeast Asian haze".

Pakai:  python3 make_video.py                        -> gambut_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> gambut_shorts_narasi.mp4
        python3 make_video.py --preview preview.png
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

# ----------------------------------------------------------------- naskah --
SCENES = [
    ("hook", "Api ini kelihatan [padam]... tapi masih [menyala]!"),
    ("hide", "Kok bisa? Apinya bersembunyi di bawah [tanah gambut]."),
    ("layers", "Gambut itu tumpukan sisa tumbuhan yang membusuk tidak sempurna selama [ribuan tahun]."),
    ("wet", "Kalau basah, gambut menyimpan banyak [air]."),
    ("dry", "Tapi saat kemarau panjang, atau airnya dibuang lewat [kanal], gambut jadi kering."),
    ("smoulder", "Gambut kering bisa [membara] pelan, tanpa nyala api."),
    ("spread", "Baranya merambat di bawah permukaan, jadi susah dilihat dan susah [dipadamkan]."),
    ("months", "Bara gambut bisa bertahan berminggu-minggu, bahkan [berbulan-bulan]!"),
    ("haze", "Asapnya jadi [kabut asap]. Tahun 2015, lebih dari 28 juta orang di Indonesia terdampak."),
    ("rewet", "Makanya, gambut harus tetap [basah]!"),
    ("end", "Pernah kena kabut asap? Cerita di komentar, dan [subscribe] Kok Bisa Kaltim!"),
]
TITLE_CARD = ("KOK BISA API", "MENYALA DI BAWAH TANAH?")

VOICE_SPANS = None

# ----------------------------------------------------------------- warna --
NIGHT_T = hexc("#0d1028")
NIGHT_B = hexc("#3b1d1a")
PEAT_W = [hexc("#2b1a12"), hexc("#3a2416"), hexc("#2f1d12"), hexc("#45291a")]   # basah
PEAT_D = [hexc("#5a3d26"), hexc("#664630"), hexc("#553a24"), hexc("#6e4c32")]   # kering
EMBER = hexc("#ff7a1a")
EMBER_L = hexc("#ffd36b")
WATERB = hexc("#4aa8ff")
SURF = 760   # garis permukaan tanah pada irisan


# ------------------------------------------------------------------ latar --


def night_sky(ctx, t, glow=0.6, haze=0.0, day=0.0):
    g = cairo.LinearGradient(0, 0, 0, SURF + 40)
    g.add_color_stop_rgba(0, *mix(mix(NIGHT_T, hexc("#5fb7e8"), day), hexc("#8a7a66"), haze))
    g.add_color_stop_rgba(1, *mix(mix(NIGHT_B, hexc("#d9f1ff"), day), hexc("#c9a477"), haze))
    ctx.rectangle(0, 0, W, SURF + 40)
    ctx.set_source(g)
    ctx.fill()
    if day < 0.5 and haze < 0.5:
        random.seed(1)
        for i in range(60):
            x, y = random.uniform(0, W), random.uniform(0, SURF * 0.7)
            a = (0.4 + 0.4 * math.sin(t * 2 + i)) * (1 - day * 2)
            circle(ctx, x, y, random.uniform(1.5, 3.2), hexc("#ffffff", max(0.0, a)))
    if glow > 0:
        g = cairo.RadialGradient(W / 2, SURF, 50, W / 2, SURF, 900)
        g.add_color_stop_rgba(0, 1.0, 0.45, 0.1, 0.45 * glow)
        g.add_color_stop_rgba(1, 1.0, 0.45, 0.1, 0)
        ctx.rectangle(0, 0, W, SURF + 40)
        ctx.set_source(g)
        ctx.fill()


def tree_silhouette(ctx, x, base, h, col, t=0.0):
    ctx.rectangle(x - 9, base - h, 18, h)
    setc(ctx, col)
    ctx.fill()
    for i, (dx, dy, r) in enumerate([(-50, 0, 55), (50, 10, 50), (0, -40, 70), (-20, 30, 45), (30, 40, 40)]):
        circle(ctx, x + dx + 3 * math.sin(t + i), base - h + dy, r, col)


def stump(ctx, x, base, s=1.0, col=None):
    col = col or hexc("#1a1210")
    ctx.move_to(x - 22 * s, base)
    ctx.line_to(x - 16 * s, base - 70 * s)
    ctx.line_to(x - 4 * s, base - 82 * s)
    ctx.line_to(x + 10 * s, base - 66 * s)
    ctx.line_to(x + 20 * s, base)
    ctx.close_path()
    setc(ctx, col)
    ctx.fill()


def peat_section(ctx, t, wet=0.0, dry=0.0, top=SURF, water_line=None, cracks=0.0):
    """Irisan lapisan gambut. wet/dry 0..1 mengatur warna."""
    bands = 4
    h = (H - top) / bands
    for i in range(bands):
        c = mix(PEAT_W[i], PEAT_D[i], dry)
        y0 = top + i * h
        ctx.move_to(0, y0)
        for x in range(0, W + 41, 40):
            ctx.line_to(x, y0 + 10 * math.sin(x / 90 + i * 2))
        ctx.line_to(W, y0 + h + 12)
        ctx.line_to(0, y0 + h + 12)
        ctx.close_path()
        setc(ctx, c)
        ctx.fill()
    # serpihan daun & ranting di dalam gambut
    random.seed(77)
    for i in range(170):
        x = random.uniform(0, W)
        y = random.uniform(top + 20, H)
        ln = random.uniform(10, 34)
        a = random.uniform(0, math.pi)
        ctx.move_to(x, y)
        ctx.line_to(x + ln * math.cos(a), y + ln * math.sin(a))
        setc(ctx, mix(hexc("#6b4a2a", 0.7), hexc("#c9a06a", 0.7), dry))
        ctx.set_line_width(random.uniform(2, 5))
        ctx.stroke()
    # pori berisi air
    if wet > 0:
        random.seed(5)
        for i in range(90):
            x = random.uniform(0, W)
            y = random.uniform(top + 30, H)
            if water_line is not None and y < water_line:
                continue
            r = random.uniform(5, 11) * wet
            circle(ctx, x, y + 3 * math.sin(t * 2 + i), r, hexc("#4aa8ff", 0.55 * wet))
    if water_line is not None:
        ctx.move_to(0, water_line)
        ctx.line_to(W, water_line)
        ctx.set_dash([24, 16], -t * 40)
        setc(ctx, hexc("#7cc8ff", 0.9))
        ctx.set_line_width(6)
        ctx.stroke()
        ctx.set_dash([])
    if cracks > 0:
        random.seed(9)
        setc(ctx, hexc("#2a1a10", 0.8 * cracks))
        ctx.set_line_width(4)
        for i in range(9):
            x = random.uniform(60, W - 60)
            ctx.move_to(x, top)
            y = top
            for j in range(5):
                x += random.uniform(-30, 30)
                y += random.uniform(20, 50) * cracks
                ctx.line_to(x, y)
            ctx.stroke()
    # tepi permukaan
    ctx.move_to(0, top)
    for x in range(0, W + 41, 40):
        ctx.line_to(x, top + 8 * math.sin(x / 70))
    setc(ctx, mix(hexc("#3d6b2f"), hexc("#5a4630"), dry))
    ctx.set_line_width(16)
    ctx.stroke()


def embers(ctx, t, x0, x1, y0, y1, k=1.0, n=60, seed=3):
    """Bara menyala berdenyut + pendar."""
    if k <= 0:
        return
    random.seed(seed)
    for i in range(n):
        x = random.uniform(x0, x1)
        y = random.uniform(y0, y1)
        r = random.uniform(6, 16)
        fl = 0.6 + 0.4 * math.sin(t * random.uniform(3, 7) + i)
        g = cairo.RadialGradient(x, y, 1, x, y, r * 4)
        g.add_color_stop_rgba(0, 1.0, 0.6, 0.15, 0.55 * fl * k)
        g.add_color_stop_rgba(1, 1.0, 0.3, 0.05, 0)
        ctx.arc(x, y, r * 4, 0, 2 * math.pi)
        ctx.set_source(g)
        ctx.fill()
        circle(ctx, x, y, r * 0.5, (1.0, 0.85, 0.45, 0.9 * fl * k))


def sparks(ctx, t, x0, x1, ybase, k=1.0, n=24, seed=11):
    if k <= 0:
        return
    random.seed(seed)
    for i in range(n):
        ph = (t * random.uniform(0.25, 0.6) + random.uniform(0, 1)) % 1.0
        x = random.uniform(x0, x1) + 30 * math.sin(t * 2 + i)
        y = ybase - ph * 420
        circle(ctx, x, y, 4 * (1 - ph) + 1, (1.0, 0.75, 0.3, 0.9 * (1 - ph) * k))


def smoke(ctx, t, x0, x1, ybase, k=1.0, n=14, seed=21, col=(0.75, 0.72, 0.7)):
    if k <= 0:
        return
    random.seed(seed)
    for i in range(n):
        ph = (t * random.uniform(0.08, 0.16) + random.uniform(0, 1)) % 1.0
        x = random.uniform(x0, x1) + 60 * math.sin(t * 0.6 + i) * ph
        y = ybase - ph * 700
        r = 40 + 160 * ph
        g = cairo.RadialGradient(x, y, 5, x, y, r)
        g.add_color_stop_rgba(0, col[0], col[1], col[2], 0.35 * (1 - ph) * k)
        g.add_color_stop_rgba(1, col[0], col[1], col[2], 0)
        ctx.arc(x, y, r, 0, 2 * math.pi)
        ctx.set_source(g)
        ctx.fill()


def headline(ctx, s, y, size, col, k=1.0, wobble=0.0, t=0.0):
    if k <= 0:
        return
    sc = ease_out_back(k)
    ctx.save()
    ctx.translate(CAP_X, y)
    ctx.scale(sc, sc)
    ctx.rotate(wobble * math.sin(t * 6))
    while text_width(ctx, s, size) > CAP_MAXW:
        size -= 4
    text(ctx, s, 0, 0, size, col, stroke=BLACK, sw=18)
    ctx.restore()


def push(ctx, lt, d, amt=0.12, cx=W / 2, cy=900):
    z = 1 + amt * ease(lt / d)
    ctx.translate(cx, cy)
    ctx.scale(z, z)
    ctx.translate(-cx, -cy)


# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    ctx.save()
    push(ctx, lt, d, 0.18, cy=SURF)
    night_sky(ctx, t, glow=0.7)
    for i, x in enumerate((120, 320, 760, 960)):
        stump(ctx, x, SURF + 10, 1.2 + 0.2 * (i % 2))
    reveal = seg(lt, 0.6, d * 0.8)
    peat_section(ctx, t, dry=0.85, cracks=0.6)
    embers(ctx, t, 0, W, SURF + 120, H - 200, k=0.8 + 0.2 * reveal, n=80)
    sparks(ctx, t, 100, W - 100, SURF + 200, k=0.8)
    smoke(ctx, t, 100, W - 100, SURF, k=1.0)
    ctx.restore()
    headline(ctx, "MASIH MENYALA?!", 470, 120, EMBER_L, k=clamp(lt / 0.25 + 0.6), wobble=0.02, t=t)


def sc_hide(ctx, lt, d, t):
    ctx.save()
    push(ctx, lt, d, 0.25, cy=1150)
    night_sky(ctx, t, glow=0.5)
    stump(ctx, 540, SURF + 10, 1.6)
    peat_section(ctx, t, dry=0.85)
    embers(ctx, t, 150, 930, 980, 1500, k=1.0, n=55)
    sparks(ctx, t, 300, 800, 1300, k=0.6)
    ctx.restore()
    # panah ke bawah
    k = seg(lt, 0.3, 0.9)
    if k > 0:
        y = 520 + 40 * math.sin(t * 4)
        ctx.move_to(CAP_X, y)
        ctx.line_to(CAP_X, y + 220 * k)
        setc(ctx, EMBER_L)
        ctx.set_line_width(16)
        ctx.stroke()
        arrowhead(ctx, CAP_X, y + 240 * k, math.pi / 2, 40, EMBER_L)
    label_chip(ctx, "Tanah gambut", CAP_X, 420, 54, hexc("#b4501c"), k=seg(lt, 0.2, 0.6))


def sc_layers(ctx, lt, d, t):
    night_sky(ctx, t, glow=0.0, day=1.0)
    # pohon rawa gambut menjatuhkan daun yang menumpuk
    for i, x in enumerate((140, 420, 700, 960)):
        tree_silhouette(ctx, x, SURF + 10, 380 + 60 * (i % 2), hexc("#2f6b3a"), t)
    k = seg(lt, 0, d * 0.9)
    peat_section(ctx, t, wet=0.6, top=SURF + 600 * (1 - k))
    random.seed(4)
    for i in range(40):
        ph = (t * 0.4 + random.uniform(0, 1)) % 1.0
        x = random.uniform(60, W - 60) + 40 * math.sin(t + i)
        y = 380 + ph * (SURF + 600 * (1 - k) - 380)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(t * 2 + i)
        ctx.move_to(0, 0)
        ctx.curve_to(10, -10, 26, -6, 30, 0)
        ctx.curve_to(26, 6, 10, 10, 0, 0)
        setc(ctx, hexc("#7a9a3a" if i % 2 else "#a08a3a"))
        ctx.fill()
        ctx.restore()
    label_chip(ctx, "± ribuan tahun", CAP_X, 420, 56, hexc("#2f6b3a"), k=seg(lt, d * 0.5, d * 0.7))


def sc_wet(ctx, lt, d, t):
    night_sky(ctx, t, glow=0.0, day=1.0)
    for i, x in enumerate((140, 420, 700, 960)):
        tree_silhouette(ctx, x, SURF + 10, 400 + 60 * (i % 2), hexc("#2f7d3a"), t)
    peat_section(ctx, t, wet=seg(lt, 0, 1.0), water_line=SURF + 40)
    # tetes air masuk
    random.seed(6)
    for i in range(30):
        ph = (t * 0.8 + random.uniform(0, 1)) % 1.0
        x = random.uniform(80, W - 80)
        y = SURF - 200 + ph * 500
        ctx.move_to(x, y - 18)
        ctx.curve_to(x - 10, y, x + 10, y, x, y - 18)
        circle(ctx, x, y, 9, hexc("#7cc8ff", 0.8 * (1 - ph)))
    label_chip(ctx, "Seperti spons", CAP_X, 420, 56, WATERB, k=seg(lt, 0.3, 0.7))
    check(ctx, 860, 560, 60, seg(lt, d * 0.5, d * 0.65))


def sc_dry(ctx, lt, d, t):
    k = seg(lt, 0.3, d * 0.85)
    night_sky(ctx, t, glow=0.25 * k, day=1.0 - 0.3 * k)
    sun(ctx, 860, 260, 90 + 10 * math.sin(t * 4), t, glow=1.4)
    for i, x in enumerate((140, 960)):
        tree_silhouette(ctx, x, SURF + 10, 380, mix(hexc("#2f7d3a"), hexc("#6b5a2a"), k), t)
    peat_section(ctx, t, wet=1 - k, dry=k, water_line=SURF + 40 + 520 * k, cracks=k)
    # kanal di tengah: air mengalir keluar
    ctx.move_to(430, SURF)
    ctx.line_to(470, SURF + 260)
    ctx.line_to(610, SURF + 260)
    ctx.line_to(650, SURF)
    ctx.close_path()
    setc(ctx, hexc("#2b6f9a", 0.95))
    ctx.fill()
    for i in range(4):
        arrow_flow(ctx, [(440 + i * 10, SURF + 60 + i * 50), (520, SURF + 70 + i * 50), (580, SURF + 60 + i * 50), (640, SURF + 70 + i * 50)],
                   t + i * 0.3, hexc("#bfe3ff", 0.9), 8, speed=1.6, dash=30)
    label_chip(ctx, "Kanal", 540, SURF - 70, 44, hexc("#2b6f9a"), k=seg(lt, d * 0.3, d * 0.45))
    label_chip(ctx, "Kering!", CAP_X, 420, 60, hexc("#b4501c"), k=seg(lt, d * 0.7, d * 0.85))


def sc_smoulder(ctx, lt, d, t):
    ctx.save()
    push(ctx, lt, d, 0.3, cx=540, cy=1200)
    night_sky(ctx, t, glow=0.8)
    peat_section(ctx, t, dry=1.0, cracks=0.8)
    embers(ctx, t, 100, 980, 900, 1600, k=1.0, n=90, seed=8)
    sparks(ctx, t, 200, 880, 1400, k=1.0, n=30)
    # gelombang panas
    setc(ctx, hexc("#ffb35a", 0.35))
    ctx.set_line_width(5)
    for i in range(6):
        x = 180 + i * 140
        ctx.move_to(x, SURF + 10)
        for j in range(10):
            ctx.line_to(x + 14 * math.sin(j + t * 6 + i), SURF + 10 - j * 26)
        ctx.stroke()
    ctx.restore()
    label_chip(ctx, "Membara tanpa nyala", CAP_X, 420, 50, hexc("#b4501c"), k=seg(lt, 0.3, 0.7))


def sc_spread(ctx, lt, d, t):
    night_sky(ctx, t, glow=0.5)
    for i, x in enumerate((90, 300, 960)):
        stump(ctx, x, SURF + 10, 1.1)
    peat_section(ctx, t, dry=1.0)
    front = 200 + 760 * seg(lt, 0, d)
    embers(ctx, t, 60, front, 960, 1560, k=1.0, n=80, seed=12)
    # pemadam menyiram dari atas, air hanya membasahi permukaan
    fx = 760
    ctx.save()
    ctx.translate(fx, SURF)
    rrect(ctx, -26, -170, 52, 120, 20)
    setc(ctx, hexc("#e07b00"))
    ctx.fill()
    circle(ctx, 0, -195, 26, hexc("#f1c27d"))
    ctx.arc(0, -205, 30, math.pi, 2 * math.pi)
    setc(ctx, hexc("#d4af37"))
    ctx.fill()
    ctx.restore()
    random.seed(14)
    for i in range(30):
        ph = (t * 1.2 + i / 30) % 1.0
        x = fx - 30 - ph * 260
        y = SURF - 140 + 160 * ph * ph
        circle(ctx, x, y, 7, hexc("#7cc8ff", 0.9))
    ctx.rectangle(420, SURF - 6, 320, 26)
    setc(ctx, hexc("#3a6ea5", 0.6))
    ctx.fill()
    label_chip(ctx, "Air cuma basahi permukaan", CAP_X, 420, 44, hexc("#3a6ea5"), k=seg(lt, d * 0.4, d * 0.55))
    smoke(ctx, t, 60, front, SURF, k=0.8)


def sc_months(ctx, lt, d, t):
    night_sky(ctx, t, glow=0.6)
    peat_section(ctx, t, dry=1.0)
    embers(ctx, t, 60, 1020, 900, 1600, k=1.0, n=80, seed=15)
    # kalender bergulir
    flips = int(lt * 5)
    cx, cy = CAP_X, 470
    rrect(ctx, cx - 160, cy - 150, 320, 300, 30)
    setc(ctx, WHITE)
    ctx.fill()
    ctx.rectangle(cx - 160, cy - 150, 320, 80)
    setc(ctx, RED)
    ctx.fill()
    bulan = ["MINGGU 1", "MINGGU 2", "MINGGU 3", "MINGGU 4", "BULAN 2", "BULAN 3", "BULAN 4"]
    lbl = bulan[min(flips, len(bulan) - 1)]
    text(ctx, lbl, cx, cy - 110, 44, WHITE)
    text(ctx, "\U0001F525" if False else "masih", cx, cy + 10, 50, BLACK)
    text(ctx, "membara", cx, cy + 80, 50, EMBER)


def sc_haze(ctx, lt, d, t):
    hz = seg(lt, 0, 1.0)
    night_sky(ctx, t, glow=0.0, day=1.0, haze=hz)
    # matahari pucat
    circle(ctx, 820, 300, 70, hexc("#f2c27a", 0.8))
    # siluet kota
    random.seed(2)
    x = 0
    while x < W:
        w = random.uniform(70, 140)
        h = random.uniform(180, 420)
        ctx.rectangle(x, SURF + 200 - h, w - 8, h + 900)
        setc(ctx, hexc("#4a4038"))
        ctx.fill()
        for r in range(int(h / 50)):
            for c in range(int((w - 20) / 30)):
                if (r + c) % 2 == 0:
                    ctx.rectangle(x + 10 + c * 30, SURF + 220 - h + r * 50, 12, 18)
                    setc(ctx, hexc("#f2d49a", 0.5))
                    ctx.fill()
        x += w
    # kabut asap
    ctx.rectangle(0, 0, W, H)
    setc(ctx, hexc("#b59a74", 0.45 * hz))
    ctx.fill()
    smoke(ctx, t, 0, W, SURF + 400, k=1.2, n=24, seed=31, col=(0.72, 0.62, 0.5))
    n = int(28 * seg(lt, d * 0.35, d * 0.8))
    if lt > d * 0.3:
        headline(ctx, f"{n} JUTA ORANG", 470, 110, WHITE, k=seg(lt, d * 0.3, d * 0.45))
        label_chip(ctx, "Kabut asap 2015", CAP_X, 610, 44, hexc("#6b5a3a"), k=seg(lt, d * 0.4, d * 0.55))


def sc_rewet(ctx, lt, d, t):
    k = seg(lt, 0.2, d * 0.85)
    night_sky(ctx, t, glow=0.0, day=1.0)
    for i, x in enumerate((140, 420, 700, 960)):
        tree_silhouette(ctx, x, SURF + 10, 340 + 120 * k + 40 * (i % 2), mix(hexc("#6b5a2a"), hexc("#2f7d3a"), k), t)
    peat_section(ctx, t, wet=k, dry=1 - k, water_line=SURF + 560 - 520 * k)
    # sekat kanal
    ctx.rectangle(500, SURF - 40, 80, 300)
    setc(ctx, hexc("#7a5532"))
    ctx.fill()
    label_chip(ctx, "Sekat kanal", 540, SURF - 90, 42, hexc("#7a5532"), k=seg(lt, 0.2, 0.6))
    headline(ctx, "TETAP BASAH!", 430, 120, hexc("#7cc8ff"), k=seg(lt, d * 0.5, d * 0.65))
    check(ctx, 860, 560, 60, seg(lt, d * 0.6, d * 0.75))


def sc_end(ctx, lt, d, t):
    k = seg(lt, 0, d)
    night_sky(ctx, t, glow=0.0, day=1.0, haze=1 - k)
    for i, x in enumerate((140, 420, 700, 960)):
        tree_silhouette(ctx, x, SURF + 10, 440 + 40 * (i % 2), hexc("#2f7d3a"), t)
    peat_section(ctx, t, wet=1.0, water_line=SURF + 40)
    kc = seg(lt, 0.2, 0.6)
    if kc > 0:
        ctx.save()
        ctx.translate(CAP_X, 470)
        ctx.scale(ease_out_back(kc), ease_out_back(kc))
        rrect(ctx, -360, -80, 720, 160, 48)
        setc(ctx, WHITE)
        ctx.fill()
        ctx.move_to(-80, 78)
        ctx.line_to(-110, 130)
        ctx.line_to(-30, 78)
        ctx.fill()
        text(ctx, "Pernah kena kabut asap?", 0, 0, 46, BLACK)
        ctx.restore()


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items()
             if n.startswith("sc_") and callable(f) and f.__module__ == __name__}

if __name__ == "__main__":
    run(Episode(8, SCENES, SCENE_FNS, HERE / "gambut_shorts.mp4", voice_spans=VOICE_SPANS,
                music_key=-2, style="v2", title_card=TITLE_CARD))
