#!/usr/bin/env python3
"""Kok Bisa? #2 - Air Sungai Mahakam, kok warnanya cokelat?

Pakai:  python3 make_video.py                        -> sungai_cokelat_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> sungai_cokelat_shorts_narasi.mp4
        python3 make_video.py --preview preview.png  -> contact sheet untuk dicek
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

# ----------------------------------------------------------------- naskah --
# Kata di dalam [kurung siku] diberi warna kuning (kata kunci).
SCENES = [
    ("hook", "Air [Sungai Mahakam], kok warnanya cokelat?"),
    ("clear_rain", "Padahal air hujan yang jatuh itu [bening]."),
    ("drop_fall", "Bayangin kamu jadi setetes air hujan di [hulu]."),
    ("drop_slide", "Kamu jatuh ke tanah, lalu mengalir menuruni bukit."),
    ("drop_mud", "Sambil jalan, kamu bawa butiran tanah halus. Namanya [lumpur]."),
    ("roots", "Akar pohon biasanya [memegang tanah] supaya tidak terbawa."),
    ("bare", "Tapi kalau hutannya gundul, tanah gampang [terkikis]."),
    ("many", "Jutaan tetes air ikut membawa lumpur ke sungai."),
    ("stir", "Arus sungai yang deras terus [mengaduk] lumpur itu."),
    ("float", "Jadi lumpurnya melayang, tidak sempat turun ke dasar."),
    ("result", "Hasilnya? Air sungai jadi [cokelat]!"),
    ("glass1", "Coba ambil segelas air sungai, lalu diamkan semalam."),
    ("glass2", "Lumpurnya pelan-pelan [mengendap] di dasar gelas."),
    ("glass3", "Airnya jadi lebih jernih! Tapi belum tentu [aman diminum], ya."),
    ("fertile", "Lumpur yang terbawa juga bikin tanah di tepi sungai jadi [subur]."),
    ("shallow", "Tapi kalau terlalu banyak, sungai jadi [dangkal] dan gampang banjir."),
    ("care", "Makanya, [jaga hutan] dan jangan buang sampah ke sungai!"),
    ("summary", "Jadi air sungai cokelat itu karena [lumpur] yang melayang."),
    ("cta", "Mau tahu [Kok Bisa] lainnya? Follow ya!"),
]

# Diisi setelah ada file narasi (lihat panduan); None = belum ada narasi.
VOICE_SPANS = None

# ----------------------------------------------------------------- warna --
CLEAR = hexc("#4aa8d8")
MUDDY = hexc("#a8743a")
SED = hexc("#c9a46a")
DROP = hexc("#5cc2ff")


def water_col(m, a=0.95):
    c = mix(CLEAR, MUDDY, clamp(m))
    return (c[0], c[1], c[2], a)


# ------------------------------------------------------------ elemen baru --


def drop_char(ctx, x, y, s=1.0, t=0.0, mud=0.0, mood="happy", squash=0.0):
    """Tokoh tetes air. (x, y) = pusat bagian bulat."""
    c = mix(DROP, MUDDY, clamp(mud))
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * (1 + squash * 0.25), s * (1 - squash * 0.25))
    ctx.move_to(0, -120)
    ctx.curve_to(20, -70, 62, -30, 62, 10)
    ctx.arc(0, 10, 62, 0, math.pi)
    ctx.curve_to(-62, -30, -20, -70, 0, -120)
    ctx.close_path()
    setc(ctx, c)
    ctx.fill_preserve()
    setc(ctx, mix(c, BLACK, 0.25))
    ctx.set_line_width(5)
    ctx.stroke()
    # kilau
    ctx.move_to(-34, -10)
    ctx.curve_to(-40, 10, -30, 30, -20, 36)
    setc(ctx, hexc("#ffffff", 0.7))
    ctx.set_line_width(9)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()
    # wajah
    blink = 1.0 if (t * 0.7) % 3 > 0.12 else 0.2
    for d in (-1, 1):
        ctx.save()
        ctx.translate(d * 20, 8)
        ctx.scale(1, blink)
        circle(ctx, 0, 0, 9, BLACK)
        circle(ctx, 3, -3, 3, WHITE)
        ctx.restore()
    ctx.set_line_width(5)
    setc(ctx, BLACK)
    if mood == "happy":
        ctx.arc(0, 26, 13, 0.2, math.pi - 0.2)
    else:
        ctx.arc(0, 40, 11, math.pi + 0.4, 2 * math.pi - 0.4)
    ctx.stroke()
    # butiran lumpur menempel
    if mud > 0.05:
        random.seed(21)
        for i in range(int(14 * mud)):
            a = random.uniform(0, 2 * math.pi)
            r = random.uniform(30, 55)
            circle(ctx, r * math.cos(a), 12 + r * math.sin(a) * 0.9, random.uniform(5, 9), hexc("#6b4a2a"))
    ctx.restore()


def slope_y(x):
    """Permukaan bukit: tinggi di kiri, turun ke sungai di kanan."""
    return 720 + (1230 - 720) * ease(x / W)


def stump(ctx, x, y, s=1.0):
    ctx.rectangle(x - 16 * s, y - 40 * s, 32 * s, 46 * s)
    setc(ctx, hexc("#7a5532"))
    ctx.fill()
    ctx.save()
    ctx.translate(x, y - 40 * s)
    ctx.scale(1, 0.35)
    circle(ctx, 0, 0, 16 * s, hexc("#d9a866"))
    ctx.restore()


TREE_X = [90, 250, 420, 560]


def hillside(ctx, t, rain=0.0, bare=0.0, muddy=0.0, roots=0.0, river=True):
    sky(ctx, rain)
    if rain < 0.5:
        sun(ctx, 900, 260, 70, t)
    clouds(ctx, t, rain)
    # gunung jauh
    ctx.move_to(0, 900)
    for x in range(0, W + 41, 40):
        ctx.line_to(x, 560 + 120 * math.sin(x / 210) + 40 * math.sin(x / 70))
    ctx.line_to(W, 900)
    ctx.close_path()
    setc(ctx, mix(hexc("#86b98c"), hexc("#6b8577"), rain))
    ctx.fill()
    # sungai di kanan bawah
    if river:
        ctx.rectangle(700, 1180, W - 700, 200)
        setc(ctx, water_col(muddy))
        ctx.fill()
        setc(ctx, hexc("#ffffff", 0.35))
        ctx.set_line_width(4)
        for i in range(5):
            xx = 720 + ((i * 90 + t * 80) % 360)
            ctx.move_to(xx, 1215 + i * 18)
            ctx.line_to(xx + 40, 1215 + i * 18)
            ctx.stroke()
    # badan bukit (tanah) + rumput
    ctx.move_to(0, H)
    for x in range(0, W + 1, 20):
        ctx.line_to(x, slope_y(x))
    ctx.line_to(W, H)
    ctx.close_path()
    g = cairo.LinearGradient(0, 700, 0, H)
    g.add_color_stop_rgba(0, *SOIL)
    g.add_color_stop_rgba(1, *SOIL_D)
    ctx.set_source(g)
    ctx.fill()
    ctx.move_to(0, slope_y(0))
    for x in range(0, W + 1, 20):
        ctx.line_to(x, slope_y(x))
    gc = mix(mix(GRASS, hexc("#a88a5a"), bare), hexc("#5f8a4a"), rain * (1 - bare))
    setc(ctx, gc)
    ctx.set_line_width(26)
    ctx.stroke()
    # butiran tanah di dalam irisan bukit
    random.seed(5)
    for i in range(60):
        x = random.uniform(0, W)
        y = random.uniform(slope_y(x) + 40, H)
        circle(ctx, x, y, random.uniform(5, 12), hexc("#6e4524", 0.5))
    # akar
    if roots > 0:
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for tx in TREE_X:
            ty = slope_y(tx)
            random.seed(int(tx))
            for k in range(7):
                ang = math.pi / 2 + random.uniform(-1.1, 1.1)
                ln = random.uniform(140, 300) * roots
                ctx.move_to(tx, ty)
                mx = tx + math.cos(ang) * ln * 0.5 + random.uniform(-30, 30)
                my = ty + math.sin(ang) * ln * 0.5
                ctx.curve_to(mx, my, mx, my, tx + math.cos(ang) * ln, ty + math.sin(ang) * ln)
                setc(ctx, hexc("#5a3a22"))
                ctx.set_line_width(10 - k * 0.8)
                ctx.stroke()
    # pohon / tunggul
    for i, tx in enumerate(TREE_X):
        ty = slope_y(tx) + 6
        if bare > 0.5:
            stump(ctx, tx, ty, 1.2)
        else:
            jungle_tree(ctx, tx, ty, 0.9 + 0.1 * (i % 2), rain)


def channel(ctx, t, muddy=1.0, bed=0.0, level=0.0, particles=1.0, mode="stir", rain=0.0):
    """Irisan melintang sungai. bed: 0..1 tebal endapan, level: 0..1 naik air."""
    sky(ctx, rain)
    if rain < 0.5:
        sun(ctx, 900, 230, 70, t)
    clouds(ctx, t, rain)
    surf = 760 - 200 * level
    bank = 660
    # air dulu (di belakang tebing)
    ctx.rectangle(0, surf, W, H - surf)
    setc(ctx, water_col(muddy, 0.97))
    ctx.fill()
    # permukaan bergelombang
    ctx.move_to(0, surf)
    for x in range(0, W + 21, 20):
        ctx.line_to(x, surf + 6 * math.sin(x / 40 + t * 3))
    setc(ctx, hexc("#ffffff", 0.5))
    ctx.set_line_width(5)
    ctx.stroke()
    # partikel lumpur
    if particles > 0:
        random.seed(9)
        bed_top = 1380 - 330 * bed
        for i in range(int(170 * particles)):
            bx = random.uniform(0, W)
            by = random.uniform(surf + 40, bed_top - 30)
            sp = random.uniform(60, 160)
            r = random.uniform(5, 11)
            if mode == "stir":
                x = (bx + t * sp) % (W + 40) - 20
                y = by + 40 * math.sin(t * 2 + i) + 20 * math.cos(t * 3.1 + i * 0.7)
            else:
                x = (bx + t * sp * 0.6) % (W + 40) - 20
                y = by + 14 * math.sin(t * 1.5 + i)
            circle(ctx, x, y, r, hexc("#5e3f20", 0.85))
    # dasar sungai berupa saluran trapesium
    ctx.move_to(0, bank)
    ctx.line_to(170, bank)
    ctx.curve_to(260, 1000, 300, 1380, 420, 1400)
    ctx.line_to(660, 1400)
    ctx.curve_to(780, 1380, 820, 1000, 910, bank)
    ctx.line_to(W, bank)
    ctx.line_to(W, H)
    ctx.line_to(0, H)
    ctx.close_path()
    g = cairo.LinearGradient(0, bank, 0, H)
    g.add_color_stop_rgba(0, *SOIL)
    g.add_color_stop_rgba(1, *SOIL_D)
    ctx.set_source(g)
    ctx.fill()
    # rumput tepi
    for x0, x1 in ((0, 170), (910, W)):
        ctx.rectangle(x0, bank - 10, x1 - x0, 24)
        setc(ctx, GRASS)
        ctx.fill()
    jungle_tree(ctx, 70, bank, 0.8)
    jungle_tree(ctx, 1010, bank, 0.8)
    # endapan
    if bed > 0:
        top = 1400 - 330 * bed
        ctx.save()
        ctx.move_to(0, bank)
        ctx.line_to(170, bank)
        ctx.curve_to(260, 1000, 300, 1380, 420, 1400)
        ctx.line_to(660, 1400)
        ctx.curve_to(780, 1380, 820, 1000, 910, bank)
        ctx.line_to(910, H)
        ctx.line_to(170, H)
        ctx.close_path()
        ctx.rectangle(0, top, W, H - top)
        ctx.restore()
        # isi bagian saluran di bawah 'top' dengan warna endapan
        ctx.save()
        ctx.rectangle(0, top, W, 1400 - top + 2)
        ctx.clip()
        ctx.move_to(170, bank)
        ctx.curve_to(260, 1000, 300, 1380, 420, 1400)
        ctx.line_to(660, 1400)
        ctx.curve_to(780, 1380, 820, 1000, 910, bank)
        ctx.close_path()
        setc(ctx, SED)
        ctx.fill()
        ctx.restore()
        ctx.move_to(200, top)
        ctx.line_to(880, top)
        setc(ctx, hexc("#a8844f"))
        ctx.set_line_width(5)
        ctx.stroke()
    # air meluap ke daratan
    if surf < bank:
        for x0, x1 in ((0, 170), (910, W)):
            ctx.rectangle(x0, surf, x1 - x0, bank - surf)
            setc(ctx, water_col(muddy, 0.9))
            ctx.fill()
    return surf


def glass(ctx, cx, base, settle=0.0, t=0.0, muddy=1.0, s=1.0):
    """Gelas berisi air sungai. settle 0..1 = lumpur mengendap."""
    w_top, w_bot, h = 300 * s, 240 * s, 420 * s
    wl = base - h * 0.85
    path = lambda: (ctx.move_to(cx - w_top / 2, base - h), ctx.line_to(cx - w_bot / 2, base),
                    ctx.line_to(cx + w_bot / 2, base), ctx.line_to(cx + w_top / 2, base - h))
    # air
    ctx.save()
    path()
    ctx.close_path()
    ctx.clip()
    clear_k = clamp(settle * 1.2)
    ctx.rectangle(cx - w_top, wl, w_top * 2, base - wl)
    setc(ctx, mix(water_col(muddy, 0.9), hexc("#bfe6ff", 0.85), clear_k))
    ctx.fill()
    # endapan di dasar
    layer = 60 * s * settle
    ctx.rectangle(cx - w_top, base - layer, w_top * 2, layer + 2)
    setc(ctx, hexc("#7a5530"))
    ctx.fill()
    # partikel
    random.seed(4)
    for i in range(90):
        px = cx + random.uniform(-w_bot / 2 + 12, w_bot / 2 - 12)
        py0 = random.uniform(wl + 20, base - 20)
        delay = random.uniform(0, 0.6)
        k = clamp((settle - delay) / 0.4)
        py = py0 + (base - layer - 6 - py0) * ease(k) + 4 * math.sin(t * 2 + i) * (1 - k)
        if k < 1:
            circle(ctx, px, py, random.uniform(4, 7) * s, hexc("#5e3f20", 0.85 * (1 - 0.6 * k)))
    ctx.restore()
    # kaca
    path()
    setc(ctx, hexc("#ffffff", 0.9))
    ctx.set_line_width(8 * s)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.stroke()
    ctx.move_to(cx - w_top / 2 + 30 * s, base - h + 30 * s)
    ctx.line_to(cx - w_bot / 2 + 30 * s, base - 40 * s)
    setc(ctx, hexc("#ffffff", 0.45))
    ctx.set_line_width(12 * s)
    ctx.stroke()


def table(ctx, y):
    ctx.rectangle(80, y, W - 160, 40)
    setc(ctx, WOOD)
    ctx.fill()
    ctx.rectangle(80, y + 40, W - 160, 14)
    setc(ctx, WOOD_D)
    ctx.fill()
    for x in (140, W - 180):
        ctx.rectangle(x, y + 54, 40, H - y)
        setc(ctx, WOOD_D)
        ctx.fill()


def room_bg(ctx, night=0.0, t=0.0):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *mix(hexc("#fff1d6"), hexc("#2c3550"), night))
    g.add_color_stop_rgba(1, *mix(hexc("#f3d3a6"), hexc("#1d2338"), night))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    # jendela dengan langit
    wx, wy, ww, wh = 600, 330, 360, 420
    ctx.rectangle(wx, wy, ww, wh)
    setc(ctx, mix(hexc("#8fd3f4"), hexc("#0f1a3a"), night))
    ctx.fill()
    ctx.save()
    ctx.rectangle(wx, wy, ww, wh)
    ctx.clip()
    if night < 0.5:
        circle(ctx, wx + 260, wy + 120 + 200 * night * 2, 50, hexc("#ffd84d"))
    else:
        circle(ctx, wx + 110, wy + 130 + 160 * (1 - night) * 2, 44, hexc("#f4f1d0"))
        circle(ctx, wx + 128, wy + 118 + 160 * (1 - night) * 2, 40, mix(hexc("#8fd3f4"), hexc("#0f1a3a"), night))
        random.seed(2)
        for i in range(14):
            circle(ctx, wx + random.uniform(10, ww - 10), wy + random.uniform(10, wh - 10), 3,
                   hexc("#ffffff", (night - 0.5) * 2))
    ctx.restore()
    ctx.rectangle(wx, wy, ww, wh)
    setc(ctx, WOOD_D)
    ctx.set_line_width(16)
    ctx.stroke()
    ctx.move_to(wx + ww / 2, wy)
    ctx.line_to(wx + ww / 2, wy + wh)
    ctx.move_to(wx, wy + wh / 2)
    ctx.line_to(wx + ww, wy + wh / 2)
    ctx.set_line_width(10)
    ctx.stroke()


def river_scene(ctx, t, muddy=1.0, rain=0.0):
    """Pemandangan sungai lebar dari tepi."""
    sky(ctx, rain)
    if rain < 0.5:
        sun(ctx, 880, 280, 75, t)
    clouds(ctx, t, rain)
    hills(ctx, rain)
    # tepi seberang
    ctx.rectangle(0, 1000, W, 60)
    setc(ctx, GRASS_D)
    ctx.fill()
    for i, x in enumerate(range(40, W, 120)):
        jungle_tree(ctx, x, 1030, 0.45 + 0.1 * (i % 3), rain)
    # sungai
    ctx.rectangle(0, 1050, W, GY - 1050)
    g = cairo.LinearGradient(0, 1050, 0, GY)
    g.add_color_stop_rgba(0, *water_col(muddy * 0.95))
    g.add_color_stop_rgba(1, *water_col(muddy))
    ctx.set_source(g)
    ctx.fill()
    setc(ctx, hexc("#ffffff", 0.35))
    ctx.set_line_width(5)
    random.seed(8)
    for i in range(14):
        y = random.uniform(1070, GY - 30)
        x = (random.uniform(0, W) + t * random.uniform(40, 90)) % (W + 100) - 50
        ctx.move_to(x, y)
        ctx.line_to(x + 60, y)
        ctx.stroke()
    ground(ctx, rain=rain)


def ketinting(ctx, x, y, t):
    """Perahu kecil khas sungai (tampak samping)."""
    bob = 5 * math.sin(t * 2.5)
    ctx.save()
    ctx.translate(x, y + bob)
    ctx.move_to(-170, -30)
    ctx.line_to(170, -40)
    ctx.curve_to(130, 20, -130, 20, -170, -30)
    setc(ctx, hexc("#3d7fc1"))
    ctx.fill()
    ctx.rectangle(-60, -100, 120, 64)
    setc(ctx, hexc("#e9e2d0"))
    ctx.fill()
    ctx.rectangle(-75, -112, 150, 16)
    setc(ctx, RED)
    ctx.fill()
    ctx.restore()


# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    river_scene(ctx, t, muddy=1.0)
    ketinting(ctx, 300 + 30 * lt, 1180, t)
    for i, (x, y) in enumerate([(780, 820), (230, 760), (560, 640)]):
        qmark(ctx, x, y, 130 - i * 20, t, seg(lt, 0.6 + i * 0.25, 0.9 + i * 0.25))


def sc_clear_rain(ctx, lt, d, t):
    river_scene(ctx, t, muddy=1.0, rain=0.6)
    rain_drops(ctx, t, 0.7)
    # tetes besar yang bening
    y = 300 + 340 * seg(lt, 0, d * 0.5)
    drop_char(ctx, W / 2, y, 1.3, t)
    for i in range(4):
        a = 0.5 + 0.5 * math.sin(t * 7 + i * 1.7)
        ctx.save()
        ctx.translate(W / 2 + [-130, 120, -90, 150][i], y + [-80, -40, 90, 60][i])
        ctx.rotate(math.pi / 4)
        ctx.rectangle(-4, -22 * a, 8, 44 * a)
        ctx.rectangle(-22 * a, -4, 44 * a, 8)
        setc(ctx, hexc("#ffffff", a))
        ctx.fill()
        ctx.restore()
    label_chip(ctx, "Bening", W / 2, y + 190, 50, BLUE, k=seg(lt, d * 0.5, d * 0.65))


def sc_drop_fall(ctx, lt, d, t):
    hillside(ctx, t, rain=0.3)
    cloud(ctx, 120, 300, 1.2, hexc("#8d99a6"))
    k = seg(lt, 0.3, d * 0.75)
    x = 220
    y = 420 + (slope_y(x) - 90 - 420) * k
    drop_char(ctx, x, y, 0.8, t, squash=0.6 * seg(lt, d * 0.72, d * 0.8) * (1 - seg(lt, d * 0.8, d)))
    label_chip(ctx, "Hulu sungai", 300, 560, 46, hexc("#3a6ea5"), k=seg(lt, 0.4, 0.8))


def sc_drop_slide(ctx, lt, d, t):
    hillside(ctx, t, rain=0.2)
    k = seg(lt, 0.2, d * 0.9)
    x = 220 + (760 - 220) * k
    y = slope_y(x) - 85
    # garis kecepatan
    ctx.set_line_width(6)
    setc(ctx, hexc("#ffffff", 0.7))
    for i in range(3):
        ctx.move_to(x - 90 - i * 10, y - 20 + i * 25 - 30)
        ctx.line_to(x - 170 - i * 25, slope_y(x - 170) - 120 + i * 25)
        ctx.stroke()
    drop_char(ctx, x, y, 0.8, t)


def sc_drop_mud(ctx, lt, d, t):
    k = seg(lt, 0, d)
    x = 380 + 200 * k
    y = slope_y(x) - 85
    z = 1.8
    ctx.save()
    ctx.translate(W / 2, 1000)
    ctx.scale(z, z)
    ctx.translate(-x, -(y + 20))
    hillside(ctx, t, rain=0.2)
    # butiran tanah terlepas & ikut
    random.seed(13)
    for i in range(16):
        ph = (t * 0.9 + i / 16) % 1.0
        px = x - 160 + 140 * ph + random.uniform(-10, 10)
        circle(ctx, px, slope_y(px) - 8 - 30 * ph, 6, hexc("#6b4a2a"))
    drop_char(ctx, x, y, 0.8, t, mud=seg(lt, 0.3, d * 0.8))
    ctx.restore()
    label_chip(ctx, "Lumpur", 760, 640, 56, hexc("#7a5530"), k=seg(lt, d * 0.65, d * 0.8))


def sc_roots(ctx, lt, d, t):
    hillside(ctx, t, rain=0.4, roots=seg(lt, 0, d * 0.6), muddy=0.2)
    rain_drops(ctx, t, 0.5)
    check(ctx, 860, 640, 80, seg(lt, d * 0.6, d * 0.72))
    label_chip(ctx, "Akar menahan tanah", 540, 520, 46, GREEN, k=seg(lt, d * 0.65, d * 0.8))


def sc_bare(ctx, lt, d, t):
    hillside(ctx, t, rain=0.8, bare=1.0, muddy=0.3 + 0.5 * seg(lt, 0, d))
    rain_drops(ctx, t, 0.9)
    # aliran tanah longsor kecil di permukaan
    random.seed(17)
    for i in range(70):
        ph = (t * 0.5 + random.uniform(0, 1)) % 1.0
        px = random.uniform(0, 200) + ph * 760
        circle(ctx, px, slope_y(px) - random.uniform(0, 26), random.uniform(5, 10), hexc("#6b4a2a"))
    check(ctx, 860, 640, 80, seg(lt, d * 0.5, d * 0.62), ok=False)
    label_chip(ctx, "Hutan gundul", 500, 520, 48, RED, k=seg(lt, 0.3, 0.7))


def sc_many(ctx, lt, d, t):
    hillside(ctx, t, rain=0.6, bare=1.0, muddy=0.6 + 0.4 * seg(lt, 0, d))
    rain_drops(ctx, t, 0.6)
    random.seed(19)
    for i in range(14):
        ph = (t * 0.35 + i / 14) % 1.0
        x = 60 + ph * 760 + random.uniform(-40, 40)
        drop_char(ctx, x, slope_y(x) - 40, 0.32, t + i, mud=0.9)
    # aliran masuk sungai
    arrow_flow(ctx, [(640, 1120), (720, 1170), (800, 1200), (900, 1230)], t, hexc("#6b4a2a", 0.9), 16)


def sc_stir(ctx, lt, d, t):
    channel(ctx, t, muddy=1.0, mode="stir")
    for i, y in enumerate((900, 1080, 1240)):
        arrow_flow(ctx, [(-40, y), (300, y - 50), (700, y + 50), (1120, y)], t + i * 0.4, hexc("#ffffff", 0.8), 12)
    label_chip(ctx, "Arus deras", 540, 520, 50, hexc("#3a6ea5"), k=seg(lt, 0.4, 0.8))


def sc_float(ctx, lt, d, t):
    channel(ctx, t, muddy=1.0, mode="float")
    # panah ke bawah dicoret
    x, y = 540, 1060
    ctx.move_to(x, y - 140)
    ctx.line_to(x, y + 40)
    setc(ctx, WHITE)
    ctx.set_line_width(14)
    ctx.stroke()
    arrowhead(ctx, x, y + 60, math.pi / 2, 34, WHITE)
    check(ctx, x + 120, y - 40, 60, seg(lt, d * 0.4, d * 0.55), ok=False)
    label_chip(ctx, "Melayang", 540, 520, 50, hexc("#7a5530"), k=seg(lt, 0.3, 0.7))


def sc_result(ctx, lt, d, t):
    river_scene(ctx, t, muddy=1.0)
    ketinting(ctx, 700 - 40 * lt, 1190, t)
    k = seg(lt, d * 0.35, d * 0.6)
    if k > 0:
        ctx.save()
        ctx.translate(W / 2, 640)
        ctx.scale(ease_out_back(k), ease_out_back(k))
        ctx.rotate(-0.04)
        text(ctx, "COKELAT!", 0, 0, 150, hexc("#9b6a35"), stroke=WHITE, sw=20)
        ctx.restore()


def sc_glass1(ctx, lt, d, t):
    night = seg(lt, d * 0.5, d)
    room_bg(ctx, night, t)
    table(ctx, 1260)
    glass(ctx, 380, 1260, 0.0, t)
    kid(ctx, 820, 1262, 1.0, t, "normal", look=-1)
    # jam
    cx, cy = 300, 540
    circle(ctx, cx, cy, 100, WHITE)
    ctx.arc(cx, cy, 100, 0, 2 * math.pi)
    setc(ctx, BLACK)
    ctx.set_line_width(8)
    ctx.stroke()
    a = -math.pi / 2 + night * 4 * math.pi
    ctx.move_to(cx, cy)
    ctx.line_to(cx + 70 * math.cos(a), cy + 70 * math.sin(a))
    ctx.move_to(cx, cy)
    ctx.line_to(cx + 45 * math.cos(a / 12 - 1), cy + 45 * math.sin(a / 12 - 1))
    ctx.set_line_width(10)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()
    label_chip(ctx, "Diamkan semalam", 300, 700, 42, hexc("#3a3f6b"), k=seg(lt, d * 0.5, d * 0.65))


def sc_glass2(ctx, lt, d, t):
    room_bg(ctx, 1.0 - seg(lt, d * 0.6, d), t)
    table(ctx, 1260)
    glass(ctx, W / 2, 1260, seg(lt, 0.1, d * 0.95), t, s=1.5)
    label_chip(ctx, "Mengendap", W / 2, 480, 54, hexc("#7a5530"), k=seg(lt, d * 0.5, d * 0.65))


def sc_glass3(ctx, lt, d, t):
    room_bg(ctx, 0.0, t)
    table(ctx, 1260)
    glass(ctx, W / 2, 1260, 1.0, t, s=1.5)
    check(ctx, W / 2 + 300, 760, 70, seg(lt, 0.2, 0.5))
    label_chip(ctx, "Lebih jernih", W / 2, 400, 52, GREEN, k=seg(lt, 0.2, 0.5))
    k = seg(lt, d * 0.45, d * 0.6)
    if k > 0:
        label_chip(ctx, "Jangan langsung diminum!", W / 2, 540, 46, RED, k=k)


def sc_fertile(ctx, lt, d, t):
    river_scene(ctx, t, muddy=0.9)
    # lapisan lumpur subur di tepi dekat
    ctx.rectangle(0, GY - 8, W, 44)
    setc(ctx, hexc("#5b3b1f"))
    ctx.fill()
    for i, x in enumerate(range(60, W, 70)):
        k = seg(lt, 0.3 + i * 0.12, 0.9 + i * 0.12)
        if k <= 0:
            continue
        h = 160 * ease_out_back(k)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for j, dx in enumerate((-14, 0, 14)):
            ctx.move_to(x, GY)
            ctx.curve_to(x + dx, GY - h * 0.5, x + dx * 2, GY - h * 0.8, x + dx * 2.5 + 4 * math.sin(t * 2 + i), GY - h)
            setc(ctx, hexc("#3f9a3a"))
            ctx.set_line_width(8)
            ctx.stroke()
        circle(ctx, x + 35 + 4 * math.sin(t * 2 + i), GY - h - 6, 10 * k, hexc("#f2c94c"))
    label_chip(ctx, "Tanah subur", W / 2, 760, 52, GREEN, k=seg(lt, d * 0.55, d * 0.7))


def sc_shallow(ctx, lt, d, t):
    bed = 0.15 + 0.85 * seg(lt, 0, d * 0.55)
    level = 0.65 * seg(lt, d * 0.45, d * 0.85)
    surf = channel(ctx, t, muddy=1.0, bed=bed, level=level, particles=0.6, mode="float",
                   rain=seg(lt, d * 0.4, d * 0.7))
    rain_drops(ctx, t, seg(lt, d * 0.4, d * 0.7))
    label_chip(ctx, "Dangkal", 540, 1120, 50, hexc("#7a5530"), k=seg(lt, d * 0.3, d * 0.45))
    if surf < 660:
        label_chip(ctx, "Banjir!", 540, 420, 64, RED, k=seg(lt, d * 0.7, d * 0.85))
        for x, ang in ((120, math.pi), (960, 0)):
            arrowhead(ctx, x, surf + 30, ang, 30, WHITE)


def sc_care(ctx, lt, d, t):
    river_scene(ctx, t, muddy=0.5 - 0.3 * seg(lt, 0, d))
    # bibit pohon tumbuh
    k = seg(lt, 0.2, d * 0.6)
    if k > 0:
        ctx.save()
        ctx.translate(330, GY + 10)
        ctx.scale(ease_out_back(k), ease_out_back(k))
        jungle_tree(ctx, 0, 0, 0.8)
        ctx.restore()
    kid(ctx, 150, GY + 20, 0.9, t, "happy")
    # tempat sampah
    bx = 820
    rrect(ctx, bx - 70, GY - 170, 140, 180, 16)
    setc(ctx, GREEN)
    ctx.fill()
    rrect(ctx, bx - 85, GY - 195, 170, 34, 12)
    setc(ctx, hexc("#1f7f47"))
    ctx.fill()
    ctx.set_line_width(10)
    setc(ctx, hexc("#ffffff", 0.8))
    for dx in (-30, 0, 30):
        ctx.move_to(bx + dx, GY - 140)
        ctx.line_to(bx + dx, GY - 20)
    ctx.stroke()
    check(ctx, 330, 700, 60, seg(lt, d * 0.4, d * 0.5))
    check(ctx, 820, 900, 60, seg(lt, d * 0.65, d * 0.75))
    label_chip(ctx, "Tanam pohon", 330, 590, 42, GREEN, k=seg(lt, d * 0.4, d * 0.55))
    label_chip(ctx, "Sampah di tempatnya", 760, 790, 40, GREEN, k=seg(lt, d * 0.65, d * 0.8))


def sc_summary(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#b08a58"))
    g.add_color_stop_rgba(1, *hexc("#5e4024"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    random.seed(3)
    for i in range(80):
        x = (random.uniform(0, W) + t * random.uniform(20, 60)) % W
        y = random.uniform(0, H) + 10 * math.sin(t + i)
        circle(ctx, x, y, random.uniform(4, 10), hexc("#3d2814", 0.5))
    text(ctx, "Kenapa cokelat?", W / 2, 300, 84, WHITE, stroke=BLACK, sw=12)
    items = [("Hujan mengikis tanah", BLUE), ("Lumpur masuk ke sungai", hexc("#a0522d")),
             ("Arus bikin lumpur melayang", hexc("#3a6ea5"))]
    for i, (s, c) in enumerate(items):
        k = seg(lt, 0.2 + i * d * 0.22, 0.6 + i * d * 0.22)
        if k <= 0:
            continue
        sc = ease_out_back(k)
        ctx.save()
        ctx.translate(W / 2, 520 + i * 230)
        ctx.scale(sc, sc)
        rrect(ctx, -440, -90, 880, 180, 36)
        setc(ctx, WHITE)
        ctx.fill()
        circle(ctx, -350, 0, 56, c)
        text(ctx, str(i + 1), -350, 0, 64, WHITE)
        ts = 52
        while text_width(ctx, s, ts) > 640:
            ts -= 2
        text(ctx, s, -270, 0, ts, BLACK, align="left")
        ctx.restore()


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items() if n.startswith("sc_") and callable(f)}

if __name__ == "__main__":
    run(Episode(2, SCENES, SCENE_FNS, HERE / "sungai_cokelat_shorts.mp4", voice_spans=VOICE_SPANS, music_key=2))
