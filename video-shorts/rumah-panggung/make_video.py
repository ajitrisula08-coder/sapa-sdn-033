#!/usr/bin/env python3
"""Kok Bisa? #1 - Rumah Panggung di Kalimantan.

Pakai:  python3 make_video.py                        -> rumah_panggung_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> rumah_panggung_shorts_narasi.mp4
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
    ("hook", "Rumah di [Kalimantan], kok kakinya tinggi banget?"),
    ("river", "Bayangin kamu tinggal di pinggir [Sungai Mahakam]."),
    ("build", "Kamu bangun rumah langsung di atas tanah."),
    ("rain", "Tapi pas musim hujan, air sungai naik..."),
    ("flood_in", "dan masuk ke rumahmu! Kasur basah, barang hanyut."),
    ("lift", "Jadi kamu tinggikan rumahmu pakai [tiang kayu]."),
    ("flood_ok", "Banjir datang lagi... tapi airnya lewat di bawah. [Aman!]"),
    ("damp1", "Tanah di sini juga selalu [lembap]."),
    ("damp2", "Lantai yang nempel tanah ikut lembap dan [berjamur]. Lantai panggung tetap [kering]."),
    ("hot", "Siang hari? Panas dan gerah, bisa [34 derajat]!"),
    ("wind1", "Tapi angin bisa mengalir lewat [kolong rumah]..."),
    ("wind2", "dan celah lantai papan. Rumah jadi lebih [adem]."),
    ("animals", "Di pinggir sungai ada ular, biawak, bahkan [buaya]!"),
    ("ladder", "Rumah tinggi bikin hewan liar [susah masuk]."),
    ("storage", "Kolongnya juga berguna: simpan perahu, kayu bakar, sampai kandang ayam."),
    ("ulin", "Tiangnya biasanya dari [kayu ulin], si kayu besi Kalimantan."),
    ("ulin2", "Tahan air, tahan rayap, awet [puluhan tahun]!"),
    ("summary", "Jadi rumah panggung bukan cuma tinggi... tapi [cerdas]!"),
    ("cta", "Mau tahu [Kok Bisa] lainnya? Follow ya!"),
]

# Waktu bicara tiap kalimat (detik) pada narasi ElevenLabs "Bagas",
# diukur dari jeda/hening di file audio (ffmpeg silencedetect).
VOICE_SPANS = [
    (0.00, 2.82), (3.37, 6.02), (6.39, 8.54), (8.88, 11.63), (11.96, 15.54),
    (15.91, 18.48), (18.85, 23.04), (23.40, 25.11), (25.45, 29.93), (30.32, 34.01),
    (34.36, 36.93), (37.15, 40.05), (40.39, 43.93), (44.23, 46.44), (46.79, 51.28),
    (51.56, 54.99), (55.28, 58.31), (58.61, 61.84), (62.14, 64.36),
]

# ----------------------------------------------------------------- adegan --

HX = 660  # posisi rumah


def sc_hook(ctx, lt, d, t):
    world(ctx, t)
    house(ctx, HX, GY, stilt=260, s=1.0, t=t)
    water(ctx, GY + 40, t, 0, 300)
    k = seg(lt, 0.4, 1.0)
    # penanda tinggi kolong
    if k > 0:
        x = HX + 300
        ctx.set_line_width(8)
        setc(ctx, YELLOW)
        ctx.move_to(x, GY)
        ctx.line_to(x, GY - 260 * k)
        ctx.stroke()
        arrowhead(ctx, x, GY - 260 * k, -math.pi / 2, 24, YELLOW)
        arrowhead(ctx, x, GY, math.pi / 2, 24, YELLOW)
    for i, (x, y) in enumerate([(430, 980), (900, 900), (560, 760)]):
        qmark(ctx, x, y, 120 - i * 20, t, seg(lt, 0.8 + i * 0.25, 1.1 + i * 0.25))


def sc_river(ctx, lt, d, t):
    world(ctx, t)
    k = seg(lt, 0, d * 0.7)
    kid(ctx, 1150 - 500 * k, GY + 4, 1.0, t, "happy", walk=1 - seg(lt, d * 0.65, d * 0.75), look=-1)
    if lt > 1.0:
        label_chip(ctx, "Sungai Mahakam", 180, GY - 140, 42, hexc("#3a6ea5"), k=seg(lt, 1.0, 1.4))


def sc_build(ctx, lt, d, t):
    world(ctx, t)
    walls = seg(lt, 0.2, d * 0.55)
    roof = clamp((lt - d * 0.55) / (d * 0.3))
    house(ctx, HX - 40, GY, stilt=0, walls=walls, roof=roof, t=t)
    kid(ctx, 960, GY + 4, 0.8, t, "happy", look=-1)
    if walls < 1:
        # debu konstruksi
        for i in range(5):
            circle(ctx, HX - 240 + i * 110, GY - 10 - 20 * math.sin(t * 8 + i), 20, hexc("#d9c4a0", 0.6))


def sc_rain(ctx, lt, d, t):
    r = seg(lt, 0, 1.0)
    world(ctx, t, rain=r)
    house(ctx, HX - 40, GY, stilt=0, t=t)
    level = GY + 40 - 140 * seg(lt, 0.8, d)
    water(ctx, level, t, 0, W, alpha=0.88)
    rain_drops(ctx, t, r)


def sc_flood_in(ctx, lt, d, t):
    world(ctx, t, rain=1.0)
    fy = house(ctx, HX - 40, GY, stilt=0, cutaway=True, t=t)
    level = GY - 100 - 140 * seg(lt, 0, d * 0.6)
    # isi rumah
    bob = lambda p: 8 * math.sin(t * 3 + p)
    bed(ctx, HX - 240, min(fy, level + 30) + bob(0) * (level < fy))
    kid(ctx, HX + 120, fy + bob(1) * 0, 0.85, t, "worried", look=-1)
    # barang hanyut
    for i, (bx, col) in enumerate([(HX - 60, "#ff8a3d"), (HX + 40, "#3aa0ff"), (HX - 150, "#e5484d")]):
        if level < fy - 20:
            xx = bx + 40 * math.sin(t * 1.2 + i)
            rrect(ctx, xx, level - 18 + bob(i), 46, 30, 6)
            setc(ctx, hexc(col))
            ctx.fill()
    water(ctx, level, t, 0, W, alpha=0.78)
    rain_drops(ctx, t, 1.0)


def sc_lift(ctx, lt, d, t):
    world(ctx, t)
    st = 250 * seg(lt, 0.5, d * 0.8)
    house(ctx, HX - 40, GY, stilt=st, t=t)
    kid(ctx, 960, GY + 4, 0.8, t, "happy", look=-1)
    if lt > d * 0.6:
        label_chip(ctx, "Tiang kayu", 960, GY - 300, 44, ULIN, k=seg(lt, d * 0.6, d * 0.75))


def sc_flood_ok(ctx, lt, d, t):
    r = seg(lt, 0, 0.8) * (1 - seg(lt, d * 0.8, d))
    world(ctx, t, rain=r)
    house(ctx, HX - 40, GY, stilt=250, t=t, window_face=lambda c, x, y, s: kid(c, x, y + 160 * s, 0.55 * s, t, "happy"))
    level = GY + 40 - 170 * seg(lt, 0.5, d * 0.55)
    water(ctx, level, t, 0, W, alpha=0.85)
    rain_drops(ctx, t, r)
    check(ctx, 880, 600, 90, seg(lt, d * 0.72, d * 0.82))


def split_damp(ctx, lt, d, t, phase):
    sky(ctx)
    sun(ctx, 900, 220, 60, t)
    hills(ctx)
    ground(ctx)
    # lapisan tanah (irisan)
    random.seed(5)
    for i in range(40):
        x = random.uniform(0, W)
        y = random.uniform(GY + 60, H)
        circle(ctx, x, y, random.uniform(6, 16), hexc("#7a4f2a", 0.5))
    # pemisah
    ctx.rectangle(W / 2 - 5, 380, 10, H)
    setc(ctx, WHITE)
    ctx.fill()
    mold = seg(lt, d * 0.3, d * 0.8) if phase == 2 else 0
    house(ctx, 270, GY, stilt=0, s=0.5, t=t, mold=mold)
    house(ctx, 810, GY, stilt=170, s=0.5, t=t)
    # uap lembap naik dari tanah
    for side, top in ((270, GY - 140), (810, GY + 5)):
        for i in range(9):
            ph = (t * 0.6 + i / 9) % 1.0
            x = side - 200 + i * 50 + 10 * math.sin(t * 2 + i)
            y = H - 80 - ph * (H - 80 - top)
            a = 0.8 * (1 - ph) if side == 810 else 0.8
            circle(ctx, x, y, 12, hexc("#7cc8ff", a))
    if phase == 2:
        check(ctx, 270, 560, 70, seg(lt, d * 0.35, d * 0.45), ok=False)
        label_chip(ctx, "Berjamur", 270, 700, 40, RED, k=seg(lt, d * 0.35, d * 0.5))
        check(ctx, 810, 560, 70, seg(lt, d * 0.65, d * 0.75), ok=True)
        label_chip(ctx, "Kering", 810, 700, 40, GREEN, k=seg(lt, d * 0.65, d * 0.8))
    else:
        label_chip(ctx, "Tanah lembap", W / 2, 480, 46, hexc("#3a6ea5"), k=seg(lt, 0.6, 1.0))


def sc_damp1(ctx, lt, d, t):
    split_damp(ctx, lt, d, t, 1)


def sc_damp2(ctx, lt, d, t):
    split_damp(ctx, lt, d, t, 2)


def sc_hot(ctx, lt, d, t):
    world(ctx, t, sun_on=False)
    # filter panas
    ctx.rectangle(0, 0, W, H)
    setc(ctx, hexc("#ff7a1a", 0.18))
    ctx.fill()
    sun(ctx, 760, 420, 120 + 8 * math.sin(t * 5), t, glow=1.6)
    house(ctx, HX - 40, GY, stilt=250, t=t)
    kid(ctx, 950, GY + 4, 0.85, t, "hot", look=-1)
    thermometer(ctx, 170, 1000, 360, 0.3 + 0.6 * seg(lt, 0.3, d * 0.8), "34°C")
    # gelombang panas
    ctx.set_line_width(6)
    for i in range(3):
        x = 380 + i * 90
        ctx.move_to(x, 760)
        for k in range(8):
            ctx.line_to(x + 14 * math.sin(k + t * 6), 760 - k * 22)
        setc(ctx, hexc("#ff9b3d", 0.6))
        ctx.stroke()


def wind_scene(ctx, lt, d, t, phase):
    world(ctx, t)
    cool = seg(lt, d * 0.4, d) if phase == 2 else 0
    glow = mix(hexc("#f3c58f"), hexc("#bfe3ff"), cool)
    fy = house(ctx, HX - 40, GY, stilt=250, t=t, cutaway=True, glow=glow)
    kid(ctx, HX + 60, fy, 0.75, t, "happy" if phase == 2 else "normal", look=-1)
    col = hexc("#ffffff", 0.9)
    for i, y in enumerate((GY - 200, GY - 130, GY - 60)):
        arrow_flow(ctx, [(-50, y), (300, y - 30), (700, y + 30), (1130, y)], t + i * 0.3, col, 14)
    if phase == 2:
        for i, x in enumerate((HX - 220, HX - 100, HX + 20, HX + 140)):
            arrow_flow(ctx, [(x, GY - 150), (x + 20, GY - 260), (x - 20, GY - 380), (x, GY - 470)], t + i * 0.2,
                       hexc("#bfe3ff", 0.95), 12, speed=0.8, dash=40)
        thermometer(ctx, 140, 980, 320, 0.85 - 0.45 * cool, None, hot=cool < 0.5)
        label_chip(ctx, "Lebih adem", 160, 560, 40, BLUE, k=seg(lt, d * 0.6, d * 0.75))
    else:
        label_chip(ctx, "Angin", 120, GY - 260, 44, hexc("#3a6ea5"), k=seg(lt, 0.4, 0.8))


def sc_wind1(ctx, lt, d, t):
    wind_scene(ctx, lt, d, t, 1)


def sc_wind2(ctx, lt, d, t):
    wind_scene(ctx, lt, d, t, 2)


def animals_scene(ctx, lt, d, t, ladder_up):
    world(ctx, t)
    house(ctx, HX - 40, GY, stilt=250, t=t, ladder_up=ladder_up,
          window_face=lambda c, x, y, s: kid(c, x, y + 160 * s, 0.55 * s, t, "happy"))
    k = seg(lt, 0, 1.6) if ladder_up == 0 else 1.0
    snake(ctx, -200 + 520 * k, GY + 30, 1.0, t)
    lizard(ctx, -380 + 700 * k, GY + 150, 0.8, t, "#7d7a45")
    lizard(ctx, -500 + 640 * k, GY + 270, 1.1, t, "#4f6b3a", length=1.1, croc=True)
    if ladder_up > 0:
        for i, x in enumerate((200, 420, 300)):
            qmark(ctx, x, GY - 60 - i * 40, 80, t, seg(ladder_up, 0.5, 1.0))


def sc_animals(ctx, lt, d, t):
    animals_scene(ctx, lt, d, t, 0)


def sc_ladder(ctx, lt, d, t):
    animals_scene(ctx, lt, d, t, seg(lt, 0.3, d * 0.6))
    check(ctx, 900, 560, 80, seg(lt, d * 0.65, d * 0.75))


def sc_storage(ctx, lt, d, t):
    world(ctx, t)
    house(ctx, HX - 40, GY, stilt=250, t=t, ladder=False)
    items = [(boat, HX - 160, "Perahu"), (firewood, HX + 30, "Kayu bakar"), (coop, HX + 230, "Kandang ayam")]
    for i, (fn, x, name) in enumerate(items):
        k = seg(lt, 0.4 + i * d * 0.22, 0.7 + i * d * 0.22)
        if k <= 0:
            continue
        sc = ease_out_back(k)
        ctx.save()
        ctx.translate(x, GY + 10)
        ctx.scale(sc, sc)
        if fn is boat:
            boat(ctx, 0, 0, 0.55)
        elif fn is firewood:
            firewood(ctx, -60, 0, 0.8)
        else:
            coop(ctx, -60, 0, 0.6, t)
        ctx.restore()
        label_chip(ctx, name, [250, 540, 840][i], GY + 80, 38, hexc("#3a6ea5"), k=k)


def sc_ulin(ctx, lt, d, t):
    world(ctx, t)
    k = seg(lt, 0, d * 0.5)
    z = 1 + 1.6 * k
    px, py = 412, GY - 110   # tiang paling kiri
    ctx.save()
    ctx.translate(px + (330 - px) * k, py + (1050 - py) * k)
    ctx.scale(z, z)
    ctx.translate(-px, -py)
    house(ctx, HX - 40, GY, stilt=250, t=t, ladder=False)
    ctx.restore()
    label_chip(ctx, "KAYU ULIN", 760, 640, 64, ULIN, k=seg(lt, d * 0.45, d * 0.6))
    label_chip(ctx, "si kayu besi", 760, 780, 46, YELLOW, BLACK, k=seg(lt, d * 0.6, d * 0.75))
    # kilau
    for i in range(3):
        a = 0.5 + 0.5 * math.sin(t * 6 + i * 2)
        x, y = 360 + i * 70, 1000 + i * 60
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(math.pi / 4)
        ctx.rectangle(-4, -26 * a, 8, 52 * a)
        ctx.rectangle(-26 * a, -4, 52 * a, 8)
        setc(ctx, hexc("#fff6c2", a))
        ctx.fill()
        ctx.restore()


def sc_ulin2(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#5a3a28"))
    g.add_color_stop_rgba(1, *hexc("#2e1d14"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    # serat kayu
    ctx.set_line_width(3)
    setc(ctx, hexc("#7a5238", 0.5))
    for i in range(16):
        ctx.move_to(0, 100 + i * 120)
        for x in range(0, W + 41, 40):
            ctx.line_to(x, 100 + i * 120 + 20 * math.sin(x / 120 + i))
        ctx.stroke()
    text(ctx, "KAYU ULIN", W / 2, 300, 100, YELLOW, stroke=BLACK, sw=14)
    for i, (title, kind) in enumerate([("Tahan air", "air"), ("Tahan rayap", "rayap"), ("Awet puluhan tahun", "awet")]):
        icon_card(ctx, W / 2 + 10, 560 + i * 270, title, kind, seg(lt, 0.2 + i * d * 0.25, 0.6 + i * d * 0.25), t)


def sc_summary(ctx, lt, d, t):
    world(ctx, t)
    house(ctx, HX - 120, GY, stilt=250, s=0.9, t=t)
    badges = [("Anti banjir", 270, 420, BLUE), ("Lantai kering", 800, 420, GREEN),
              ("Lebih adem", 270, 560, hexc("#00a3c4")), ("Aman dari hewan", 780, 560, hexc("#e07b00"))]
    for i, (s, x, y, c) in enumerate(badges):
        label_chip(ctx, "✓ " + s, x, y, 42, c, k=seg(lt, 0.3 + i * 0.45, 0.7 + i * 0.45))




SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items() if n.startswith("sc_") and callable(f)}

if __name__ == "__main__":
    run(Episode(1, SCENES, SCENE_FNS, HERE / "rumah_panggung_shorts.mp4", voice_spans=VOICE_SPANS))
