#!/usr/bin/env python3
"""Kok Bisa? #9 - Kayu ulin: kok bisa tenggelam di air? (2D sinematik, standar v2)

Fakta: Wikipedia ID "Ulin" (berat jenis 1,04; kelas kuat I & awet I; tahan rayap & air laut;
sukar dipaku, mudah dibelah; ulin Sangkima TN Kutai), Wikipedia EN "Eusideroxylon" (laju tumbuh
radial 0,058 cm/tahun; bisa hidup >1000 tahun; IUCN Vulnerable), GNFI "Mengenal Pohon Ulin".

Pakai:  python3 make_video.py | --voice narasi.mp3 | --preview preview.png
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

SCENES = [
    ("hook", "Kayu ini [tenggelam] di air!"),
    ("name", "Kok bisa? Namanya [kayu ulin], si kayu besi dari Kalimantan."),
    ("dense", "Kayunya sangat padat. Berat jenisnya sekitar [1,04], lebih berat dari air."),
    ("class", "Ulin masuk [kelas kuat satu] dan kelas awet satu, kelas tertinggi kayu Indonesia."),
    ("tough", "Ulin terkenal tahan [rayap], tahan air, bahkan tahan air laut."),
    ("uses", "Makanya ulin dipakai untuk tiang rumah panggung, jembatan, dermaga, sampai [kapal]."),
    ("nail", "Saking kerasnya, ulin sukar dipaku, tapi justru mudah dibelah jadi atap [sirap]."),
    ("slow", "Tapi ulin tumbuh sangat [lambat]. Batangnya cuma melebar sekitar satu milimeter per tahun!"),
    ("giant", "Di Taman Nasional Kutai, ada ulin raksasa yang diperkirakan berumur [seribu tahun]!"),
    ("threat", "Sayangnya, karena terus ditebang, ulin kini berstatus [rentan]."),
    ("end", "Rumahmu pakai kayu ulin? Cerita di komentar, dan [subscribe] Kok Bisa Kaltim!"),
]
TITLE_CARD = ("KOK BISA KAYU INI", "TENGGELAM DI AIR?")
# Waktu bicara tiap kalimat (detik) pada narasi ElevenLabs "Bagas" (narasi_bagas.mp3),
# diukur dari jeda/hening di file audio (ffmpeg silencedetect).
VOICE_SPANS = [
    (0.00, 1.64), (1.99, 6.55), (6.96, 12.61), (13.00, 17.78), (18.21, 22.24), (22.59, 28.13),
    (28.50, 33.47), (33.88, 39.82), (40.19, 45.26), (45.63, 49.59), (50.10, 54.54),
]

ULIN_C = hexc("#3b2418")
ULIN_L = hexc("#5a3a26")
PINE = hexc("#e0b47a")
PINE_D = hexc("#b98a52")


# ---------------------------------------------------------------- elemen --


def sky_grad(ctx, top, bot, h=H):
    g = cairo.LinearGradient(0, 0, 0, h)
    g.add_color_stop_rgba(0, *top)
    g.add_color_stop_rgba(1, *bot)
    ctx.rectangle(0, 0, W, h)
    ctx.set_source(g)
    ctx.fill()


def light_rays(ctx, x, y, t, k=1.0, col=(1.0, 0.93, 0.7)):
    ctx.save()
    ctx.translate(x, y)
    for i in range(8):
        a = 1.05 + i * 0.16 + 0.04 * math.sin(t * 0.6 + i)
        al = (0.05 + 0.03 * math.sin(t * 1.4 + i)) * k
        ctx.move_to(0, 0)
        ctx.line_to(2400 * math.cos(a - 0.035), 2400 * math.sin(a - 0.035))
        ctx.line_to(2400 * math.cos(a + 0.035), 2400 * math.sin(a + 0.035))
        ctx.close_path()
        setc(ctx, (col[0], col[1], col[2], max(0.0, al)))
        ctx.fill()
    ctx.restore()


def plank(ctx, x, y, w, h, col, col_d, rot=0.0, grain=True):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    rrect(ctx, -w / 2, -h / 2, w, h, min(18, h / 3))
    setc(ctx, col)
    ctx.fill()
    if grain:
        ctx.set_line_width(3)
        setc(ctx, col_d)
        for i in range(5):
            yy = -h / 2 + (i + 1) * h / 6
            ctx.move_to(-w / 2 + 10, yy)
            ctx.curve_to(-w / 6, yy - 8, w / 6, yy + 8, w / 2 - 10, yy)
            ctx.stroke()
    ctx.restore()


def bubbles(ctx, t, x, y0, y1, k=1.0, n=16, seed=3):
    random.seed(seed)
    for i in range(n):
        ph = (t * random.uniform(0.4, 0.8) + random.uniform(0, 1)) % 1.0
        bx = x + random.uniform(-80, 80) + 10 * math.sin(t * 3 + i)
        by = y0 - ph * (y0 - y1)
        ctx.arc(bx, by, random.uniform(5, 12), 0, 2 * math.pi)
        setc(ctx, hexc("#e9f6ff", 0.8 * (1 - ph) * k))
        ctx.set_line_width(3)
        ctx.stroke()


def big_tree(ctx, x, base, h, s=1.0, t=0.0, col=None):
    col = col or hexc("#2f6b3a")
    tw = 70 * s
    ctx.move_to(x - tw * 1.6, base)
    ctx.curve_to(x - tw * 0.8, base - 60 * s, x - tw * 0.55, base - 120 * s, x - tw * 0.5, base - h)
    ctx.line_to(x + tw * 0.5, base - h)
    ctx.curve_to(x + tw * 0.55, base - 120 * s, x + tw * 0.8, base - 60 * s, x + tw * 1.6, base)
    ctx.close_path()
    g = cairo.LinearGradient(x - tw, 0, x + tw, 0)
    g.add_color_stop_rgba(0, *hexc("#3d2a1c"))
    g.add_color_stop_rgba(0.5, *hexc("#6b4a30"))
    g.add_color_stop_rgba(1, *hexc("#2e2016"))
    ctx.set_source(g)
    ctx.fill()
    for i, (dx, dy, r) in enumerate([(-160, 30, 150), (160, 40, 140), (0, -60, 190), (-90, -120, 130), (100, -110, 130), (0, 60, 150)]):
        circle(ctx, x + dx * s + 4 * math.sin(t + i), base - h + dy * s, r * s, mix(col, BLACK, 0.12 * (i % 2)))


def termite(ctx, x, y, s, t, rot=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s, s)
    setc(ctx, hexc("#f2e6c8"))
    for i, (dx, r) in enumerate([(-28, 14), (-4, 16), (24, 18)]):
        circle(ctx, dx, 0, r, hexc("#f2e6c8"))
    circle(ctx, 40, -2, 11, hexc("#b5652a"))
    ctx.set_line_width(4)
    setc(ctx, hexc("#7a5a3a"))
    for dx in (-20, 0, 20):
        for dd in (-1, 1):
            ctx.move_to(dx, 0)
            ctx.line_to(dx + 6 * math.sin(t * 12 + dx), dd * 26)
            ctx.stroke()
    ctx.restore()


def headline(ctx, s, y, size, col, k=1.0, t=0.0):
    if k <= 0:
        return
    sc = ease_out_back(k)
    ctx.save()
    ctx.translate(CAP_X, y)
    ctx.scale(sc, sc)
    while text_width(ctx, s, size) > CAP_MAXW:
        size -= 4
    text(ctx, s, 0, 0, size, col, stroke=BLACK, sw=18)
    ctx.restore()


def push(ctx, lt, d, amt=0.12, cx=W / 2, cy=900):
    z = 1 + amt * ease(lt / d)
    ctx.translate(cx, cy)
    ctx.scale(z, z)
    ctx.translate(-cx, -cy)


def forest_bg(ctx, t, warm=0.0):
    sky_grad(ctx, mix(hexc("#1f4a3a"), hexc("#f2a65a"), warm), mix(hexc("#9fd8b0"), hexc("#ffe1b0"), warm), 1000)
    light_rays(ctx, 820, -40, t, 1.0)
    random.seed(2)
    for layer in range(3):
        c = mix(hexc("#1e4a2e"), hexc("#3e7a4a"), layer / 2)
        for i in range(8):
            x = random.uniform(-50, W + 50)
            tree_h = random.uniform(300, 520) - layer * 60
            circle(ctx, x, 1000 - tree_h + layer * 60, random.uniform(90, 150), c)
            ctx.rectangle(x - 10, 1000 - tree_h + layer * 60, 20, tree_h)
            setc(ctx, hexc("#2a1d14"))
            ctx.fill()
    ctx.rectangle(0, 990, W, H - 990)
    g = cairo.LinearGradient(0, 990, 0, H)
    g.add_color_stop_rgba(0, *hexc("#3b5a2a"))
    g.add_color_stop_rgba(1, *hexc("#1e2a14"))
    ctx.set_source(g)
    ctx.fill()


# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    ctx.save()
    push(ctx, lt, d, 0.15, cy=900)
    # tangki air dari samping
    sky_grad(ctx, hexc("#0e2a44"), hexc("#1d5a7a"))
    surf = 620
    ctx.rectangle(0, surf, W, H - surf)
    g = cairo.LinearGradient(0, surf, 0, H)
    g.add_color_stop_rgba(0, *hexc("#2a8ac4", 0.95))
    g.add_color_stop_rgba(1, *hexc("#0b2f52", 1.0))
    ctx.set_source(g)
    ctx.fill()
    light_rays(ctx, 540, surf - 200, t, 0.8, (0.8, 0.95, 1.0))
    # kayu biasa mengapung
    plank(ctx, 270, surf + 10 + 6 * math.sin(t * 2), 300, 70, PINE, PINE_D, 0.05 * math.sin(t * 1.5))
    label_chip(ctx, "Kayu biasa", 270, surf - 80, 40, hexc("#b98a52"))
    # ulin tenggelam
    k = seg(lt, 0.0, d * 0.9)
    y = surf + 10 + (1500 - surf) * ease(k)
    plank(ctx, 790, y, 300, 70, ULIN_C, ULIN_L, 0.25 * k)
    bubbles(ctx, t, 790, y, surf, k=1.0, n=22)
    label_chip(ctx, "Kayu ulin", 790, min(y + 110, 1700), 40, hexc("#5a3a26"))
    water(ctx, surf, t, 0, W, alpha=0.25)
    ctx.restore()
    headline(ctx, "TENGGELAM?!", 380, 130, YELLOW, k=clamp(lt / 0.25 + 0.6), t=t)


def sc_name(ctx, lt, d, t):
    ctx.save()
    push(ctx, lt, d, 0.12, cy=700)
    forest_bg(ctx, t)
    big_tree(ctx, 540, 1000, 820, 1.2, t)
    ctx.restore()
    label_chip(ctx, "Kayu ulin", CAP_X, 330, 60, hexc("#5a3a26"), k=seg(lt, 0.2, 0.6))
    label_chip(ctx, "si kayu besi", CAP_X, 450, 46, YELLOW, BLACK, k=seg(lt, d * 0.5, d * 0.65))


def sc_dense(ctx, lt, d, t):
    sky_grad(ctx, hexc("#2b1d14"), hexc("#5a3a26"))
    # timbangan
    k = seg(lt, 0.3, d * 0.6)
    tilt = -0.18 * ease_out_back(k)
    cx, cy = 540, 820
    ctx.rectangle(cx - 14, cy, 28, 420)
    setc(ctx, hexc("#d9b36a"))
    ctx.fill()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(tilt)
    ctx.rectangle(-380, -10, 760, 20)
    setc(ctx, hexc("#f2d08a"))
    ctx.fill()
    for side, col, lbl in ((-1, ULIN_C, "Ulin"), (1, hexc("#2a8ac4"), "Air")):
        ctx.save()
        ctx.translate(side * 330, 0)
        ctx.rotate(-tilt)
        ctx.move_to(-110, 140)
        ctx.line_to(110, 140)
        ctx.line_to(0, 0)
        ctx.close_path()
        setc(ctx, hexc("#f2d08a", 0.0))
        ctx.fill()
        ctx.move_to(0, 0)
        ctx.line_to(-110, 140)
        ctx.move_to(0, 0)
        ctx.line_to(110, 140)
        setc(ctx, hexc("#f2d08a"))
        ctx.set_line_width(4)
        ctx.stroke()
        rrect(ctx, -120, 140, 240, 24, 10)
        ctx.fill()
        rrect(ctx, -90, 40, 180, 100, 14)
        setc(ctx, col)
        ctx.fill()
        text(ctx, lbl, 0, 90, 40, WHITE)
        ctx.restore()
    ctx.restore()
    headline(ctx, "1,04 > 1,00", 400, 120, YELLOW, k=seg(lt, d * 0.45, d * 0.6), t=t)


def medal_badge(ctx, x, y, k, title, t):
    if k <= 0:
        return
    sc = ease_out_back(k)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    ctx.move_to(-40, -170)
    ctx.line_to(-15, -60)
    ctx.line_to(15, -60)
    ctx.line_to(40, -170)
    ctx.close_path()
    setc(ctx, RED)
    ctx.fill()
    circle(ctx, 0, 30, 120, hexc("#f2b21b"))
    circle(ctx, 0, 30, 96, YELLOW)
    text(ctx, "I", 0, 30, 120, hexc("#a86c00"))
    rrect(ctx, -200, 170, 400, 80, 40)
    setc(ctx, hexc("#000000", 0.6))
    ctx.fill()
    text(ctx, title, 0, 210, 44, WHITE)
    ctx.restore()


def sc_class(ctx, lt, d, t):
    sky_grad(ctx, hexc("#1a1f3a"), hexc("#3a2a1a"))
    light_rays(ctx, 540, -100, t, 1.4, (1.0, 0.85, 0.4))
    medal_badge(ctx, 290, 700, seg(lt, 0.1, 0.6), "KELAS KUAT", t)
    medal_badge(ctx, 790, 700, seg(lt, d * 0.35, d * 0.55), "KELAS AWET", t)
    label_chip(ctx, "Tertinggi di Indonesia", CAP_X, 330, 48, GREEN, k=seg(lt, d * 0.6, d * 0.75))


def sc_tough(ctx, lt, d, t):
    sky_grad(ctx, hexc("#2b1d14"), hexc("#4a3020"))
    plank(ctx, 540, 860, 820, 200, ULIN_C, ULIN_L)
    k = seg(lt, 0, d * 0.35)
    for i in range(4):
        x = 160 + i * 240
        ph = (t * 1.3 + i * 0.3) % 1.0
        bounce = 60 * abs(math.sin(ph * math.pi))
        termite(ctx, x, 720 - bounce, 1.0, t + i, rot=0.3 * math.sin(t * 5 + i))
    check(ctx, 880, 560, 60, seg(lt, d * 0.2, d * 0.35), ok=False)
    # cipratan air laut
    k2 = seg(lt, d * 0.45, d * 0.7)
    if k2 > 0:
        water(ctx, 1000 - 40 * k2, t, 0, W, alpha=0.75)
        for i in range(18):
            ph = (t * 1.5 + i / 18) % 1.0
            circle(ctx, 100 + i * 50, 960 - 160 * math.sin(ph * math.pi) * k2, 9, hexc("#d9f1ff", 0.8))
    label_chip(ctx, "Tahan rayap", 300, 400, 44, hexc("#b5652a"), k=seg(lt, 0.2, 0.5))
    label_chip(ctx, "Tahan air laut", 780, 400, 44, hexc("#2a8ac4"), k=seg(lt, d * 0.55, d * 0.7))


def sc_uses(ctx, lt, d, t):
    beats = ["Tiang rumah panggung", "Jembatan", "Dermaga", "Kapal"]
    f = lt / d
    i = 0 if f < 0.6 else 1 if f < 0.72 else 2 if f < 0.83 else 3  # ikut urutan kata di narasi
    sky_grad(ctx, hexc("#5fb7e8"), hexc("#ffe1b0"), 1100)
    sun(ctx, 860, 260, 70, t)
    ctx.rectangle(0, 1100, W, H - 1100)
    g = cairo.LinearGradient(0, 1100, 0, H)
    g.add_color_stop_rgba(0, *hexc("#a8743a"))
    g.add_color_stop_rgba(1, *hexc("#6b4a24"))
    ctx.set_source(g)
    ctx.fill()
    if i == 0:
        ctx.save()
        ctx.translate(540, 1100)
        ctx.scale(1.3, 1.3)
        ctx.translate(-540, -1100)
        house(ctx, 540, 1100, stilt=260, t=t)
        ctx.restore()
    elif i == 1:
        ctx.rectangle(-20, 760, W + 40, 50)
        setc(ctx, ULIN_L)
        ctx.fill()
        for x in range(60, W, 150):
            ctx.rectangle(x - 16, 800, 32, 420)
            setc(ctx, ULIN_C)
            ctx.fill()
        for x in range(0, W, 60):
            ctx.rectangle(x, 700, 8, 60)
            setc(ctx, ULIN_L)
            ctx.fill()
        ctx.rectangle(0, 690, W, 14)
        ctx.fill()
    elif i == 2:
        ctx.rectangle(0, 900, 760, 40)
        setc(ctx, ULIN_L)
        ctx.fill()
        for x in range(40, 760, 120):
            ctx.rectangle(x, 930, 30, 330)
            setc(ctx, ULIN_C)
            ctx.fill()
        boat(ctx, 880, 1110 + 8 * math.sin(t * 2), 0.9)
    else:
        bob = 8 * math.sin(t * 2)
        ctx.save()
        ctx.translate(540, 1080 + bob)
        ctx.move_to(-380, -60)
        ctx.line_to(380, -60)
        ctx.curve_to(300, 80, -300, 80, -380, -60)
        setc(ctx, ULIN_C)
        ctx.fill()
        for x in (-150, 120):
            ctx.rectangle(x - 8, -520, 16, 460)
            setc(ctx, hexc("#3b2418"))
            ctx.fill()
            ctx.move_to(x + 10, -500)
            ctx.line_to(x + 230, -200)
            ctx.line_to(x + 10, -120)
            ctx.close_path()
            setc(ctx, hexc("#f4efe2"))
            ctx.fill()
        ctx.restore()
    water(ctx, 1110, t, 0, W, alpha=0.5)
    label_chip(ctx, beats[i], CAP_X, 360, 54, hexc("#5a3a26"))


def sc_nail(ctx, lt, d, t):
    sky_grad(ctx, hexc("#2b1d14"), hexc("#5a3a26"))
    half = d * 0.5
    if lt < half:
        p = lt / half
        plank(ctx, 540, 1000, 820, 200, ULIN_C, ULIN_L)
        # paku bengkok
        bend = seg(p, 0.35, 0.6)
        ctx.save()
        ctx.translate(540, 900)
        ctx.move_to(0, 0)
        ctx.line_to(0, -120 + 40 * bend)
        ctx.line_to(80 * bend, -200 + 60 * bend)
        setc(ctx, hexc("#c9c9c9"))
        ctx.set_line_width(14)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.stroke()
        ctx.restore()
        hy = 560 + 200 * abs(math.sin(p * math.pi * 3))
        ctx.save()
        ctx.translate(560, hy)
        ctx.rotate(-0.4)
        rrect(ctx, -110, -40, 220, 80, 16)
        setc(ctx, hexc("#555555"))
        ctx.fill()
        ctx.rectangle(-14, 40, 28, 260)
        setc(ctx, hexc("#8a5a33"))
        ctx.fill()
        ctx.restore()
        label_chip(ctx, "Sukar dipaku", CAP_X, 380, 50, RED, k=seg(p, 0.5, 0.8))
    else:
        p = (lt - half) / (d - half)
        # balok dibelah jadi sirap
        light_rays(ctx, 540, -60, t, 1.2, (1.0, 0.85, 0.5))
        for i in range(6):
            off = (i - 2.5) * 80 * ease_out_back(clamp(p * 1.5))
            plank(ctx, 540 + off, 640, 64, 300, hexc("#7a5236"), hexc("#5a3a26"), rot=off * 0.002)
        # atap sirap
        ka = seg(p, 0.4, 0.9)
        if ka > 0:
            for r in range(4):
                for c in range(9):
                    x = 160 + c * 90 + (r % 2) * 45
                    y = 980 - r * 40
                    if abs(x + 40 - 540) > 420 - r * 90:
                        continue
                    rrect(ctx, x, y - 50 * ka, 84, 60, 8)
                    setc(ctx, mix(hexc("#7a5236"), hexc("#a8784a"), (c + r) % 2 * 0.6))
                    ctx.fill()
        label_chip(ctx, "Mudah dibelah → sirap", CAP_X, 380, 46, GREEN, k=seg(p, 0.2, 0.5))


def sc_slow(ctx, lt, d, t):
    sky_grad(ctx, hexc("#3a2a1a"), hexc("#1e140c"))
    # irisan batang dengan lingkaran tahun
    cx, cy = 540, 640
    rings = 26
    for i in range(rings, 0, -1):
        r = 30 + i * 12
        circle(ctx, cx, cy, r, mix(hexc("#7a5532"), hexc("#a8784a"), (i % 2) * 0.6))
    circle(ctx, cx, cy, 26, hexc("#4a3020"))
    # penggaris
    ctx.rectangle(cx - 360, cy + 340, 720, 70)
    setc(ctx, hexc("#f2d08a"))
    ctx.fill()
    for i in range(37):
        h = 30 if i % 5 == 0 else 16
        ctx.move_to(cx - 360 + i * 20, cy + 340)
        ctx.line_to(cx - 360 + i * 20, cy + 340 + h)
        setc(ctx, BLACK)
        ctx.set_line_width(3)
        ctx.stroke()
    # siput lambat
    sx = 120 + 400 * seg(lt, 0, d)
    ctx.save()
    ctx.translate(sx, cy + 320)
    circle(ctx, 30, -40, 40, hexc("#d98a3a"))
    ctx.arc(30, -40, 26, 0, 5)
    setc(ctx, hexc("#a8562a"))
    ctx.set_line_width(6)
    ctx.stroke()
    rrect(ctx, -40, -18, 130, 26, 13)
    setc(ctx, hexc("#9fbf6a"))
    ctx.fill()
    ctx.restore()
    headline(ctx, "±1 mm / TAHUN", 280, 110, YELLOW, k=seg(lt, d * 0.45, d * 0.6), t=t)


def sc_giant(ctx, lt, d, t):
    ctx.save()
    z = 1.35 - 0.35 * ease(lt / d)
    ctx.translate(540, 1000)
    ctx.scale(z, z)
    ctx.translate(-540, -1000)
    forest_bg(ctx, t, warm=0.4)
    big_tree(ctx, 540, 1000, 900, 1.6, t)
    # manusia kecil untuk skala
    kid(ctx, 820, 1005, 0.45, t, "happy", look=-1)
    ctx.restore()
    headline(ctx, "± 1.000 TAHUN", 330, 110, YELLOW, k=seg(lt, d * 0.4, d * 0.55), t=t)
    label_chip(ctx, "Sangkima, TN Kutai", CAP_X, 450, 42, hexc("#2f6b3a"), k=seg(lt, 0.2, 0.6))


def sc_threat(ctx, lt, d, t):
    k = seg(lt, 0, d * 0.8)
    forest_bg(ctx, t, warm=0.7)
    ctx.rectangle(0, 0, W, H)
    setc(ctx, hexc("#3a0e0e", 0.35 * k))
    ctx.fill()
    random.seed(5)
    for i in range(7):
        x = 90 + i * 150
        ctx.save()
        ctx.translate(x, 1000)
        rrect(ctx, -40, -80, 80, 90, 10)
        setc(ctx, hexc("#5a3a26"))
        ctx.fill()
        ctx.save()
        ctx.translate(0, -80)
        ctx.scale(1, 0.3)
        circle(ctx, 0, 0, 40, hexc("#c99a5a"))
        ctx.restore()
        ctx.restore()
    label_chip(ctx, "IUCN: Rentan (Vulnerable)", CAP_X, 400, 46, RED, k=seg(lt, d * 0.35, d * 0.5))


def sc_end(ctx, lt, d, t):
    sky_grad(ctx, hexc("#f2a65a"), hexc("#ffe1b0"), 1100)
    sun(ctx, 860, 300, 70, t)
    ctx.rectangle(0, 1100, W, H - 1100)
    setc(ctx, hexc("#7a5532"))
    ctx.fill()
    ctx.save()
    ctx.translate(540, 1100)
    ctx.scale(1.1, 1.1)
    ctx.translate(-540, -1100)
    house(ctx, 540, 1100, stilt=240, t=t)
    ctx.restore()
    kc = seg(lt, 0.2, 0.6)
    if kc > 0:
        ctx.save()
        ctx.translate(CAP_X, 380)
        ctx.scale(ease_out_back(kc), ease_out_back(kc))
        rrect(ctx, -360, -80, 720, 160, 48)
        setc(ctx, WHITE)
        ctx.fill()
        ctx.move_to(-80, 78)
        ctx.line_to(-110, 130)
        ctx.line_to(-30, 78)
        ctx.fill()
        text(ctx, "Rumahmu pakai ulin?", 0, 0, 48, BLACK)
        ctx.restore()


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items()
             if n.startswith("sc_") and callable(f) and f.__module__ == __name__}

if __name__ == "__main__":
    run(Episode(9, SCENES, SCENE_FNS, HERE / "ulin_shorts.mp4", voice_spans=VOICE_SPANS,
                music_key=4, style="v2", title_card=TITLE_CARD))
