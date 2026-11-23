#!/usr/bin/env python3
"""Kok Bisa? #4 - Pesut Mahakam, kok bisa hidup di sungai?

Pakai:  python3 make_video.py                        -> pesut_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> pesut_shorts_narasi.mp4
        python3 make_video.py --preview preview.png  -> contact sheet untuk dicek
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

# pakai ulang elemen sungai dari episode #2
_spec = importlib.util.spec_from_file_location("ep2", HERE.parent / "sungai-cokelat" / "make_video.py")
ep2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ep2)

# ----------------------------------------------------------------- naskah --
SCENES = [
    ("hook", "[Pesut Mahakam], kok bisa hidup di sungai?"),
    ("sea", "Biasanya kan lumba-lumba hidup di [laut]."),
    ("you", "Bayangin kamu seekor pesut, kerabat [lumba-lumba]."),
    ("home", "Rumahmu bukan laut, tapi [Sungai Mahakam] yang airnya tawar."),
    ("adapt", "Tubuhmu sudah [menyesuaikan diri] dengan air sungai."),
    ("body", "Kepalamu bulat, moncongmu pendek, dan lehermu [lentur] buat menoleh."),
    ("muddy", "Tapi air sungai kan [cokelat]. Kamu nggak bisa lihat jauh!"),
    ("sonar", "Tenang, kamu punya [sonar]!"),
    ("click", "Kamu mengeluarkan bunyi klik... dan gemanya [memantul] balik."),
    ("echo", "Dari gema itu, kamu tahu di mana [ikan] bersembunyi."),
    ("breathe", "Kamu juga harus naik ke permukaan untuk [bernapas]."),
    ("spit", "Kadang kamu malah [menyemburkan air] dari mulut!"),
    ("few", "Sayangnya, pesut Mahakam sekarang tinggal [sedikit]."),
    ("count", "Jumlahnya diperkirakan [kurang dari seratus] ekor."),
    ("threats", "Banyak yang terjerat [jaring], terganggu kapal, atau kekurangan ikan."),
    ("help", "Ayo bantu: jangan buang sampah ke sungai, dan [lapor] kalau melihat pesut terjerat!"),
    ("summary", "Jadi pesut bisa hidup di sungai karena tubuh dan [sonarnya] cocok untuk Mahakam."),
    ("cta", "Mau tahu [Kok Bisa] lainnya? Follow ya!"),
]

# Waktu bicara tiap kalimat (detik) pada narasi ElevenLabs "Bagas" (narasi_bagas.mp3),
# diukur dari jeda/hening di file audio (ffmpeg silencedetect).
VOICE_SPANS = [
    (0.12, 2.53), (2.92, 4.98), (5.53, 8.57), (9.00, 12.52), (12.92, 15.48),
    (15.85, 20.03), (20.41, 23.50), (23.88, 25.93), (26.32, 29.90), (30.23, 33.02),
    (33.37, 35.81), (36.11, 38.67), (39.16, 41.96), (42.33, 44.97), (45.30, 49.40),
    (49.80, 54.29), (54.66, 59.21), (59.60, 61.60),
]

# ----------------------------------------------------------------- warna --
PESUT = hexc("#8a9bab")
PESUT_D = hexc("#6a7b8b")
PESUT_L = hexc("#c9d3dc")
SEA = hexc("#1f8fd6")

# ------------------------------------------------------------ elemen baru --


def pesut(ctx, x, y, s=1.0, t=0.0, rot=0.0, look=1, mood="happy", beak=False, col=None, head_turn=0.0):
    """Pesut (atau lumba-lumba bila beak=True). (x, y) = pusat badan, menghadap kanan."""
    body = col or PESUT
    dark = mix(body, BLACK, 0.22)
    belly = mix(body, WHITE, 0.55)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s * look, s)
    sw = math.sin(t * 4) * 0.12
    # ekor
    ctx.save()
    ctx.translate(-190, 0)
    ctx.rotate(sw)
    ctx.move_to(0, -10)
    ctx.curve_to(-40, -20, -70, -70, -95, -60)
    ctx.curve_to(-70, -20, -70, 20, -95, 60)
    ctx.curve_to(-70, 70, -40, 20, 0, 10)
    setc(ctx, dark)
    ctx.fill()
    ctx.restore()
    # badan
    ctx.move_to(-200, 0)
    ctx.curve_to(-150, -70, 40, -95, 120, -60)
    ctx.curve_to(150, -45, 160, 20, 120, 45)
    ctx.curve_to(40, 85, -150, 50, -200, 0)
    setc(ctx, body)
    ctx.fill()
    # perut
    ctx.move_to(-150, 25)
    ctx.curve_to(-60, 60, 60, 70, 125, 38)
    ctx.curve_to(60, 50, -60, 45, -150, 25)
    setc(ctx, belly)
    ctx.fill()
    # sirip punggung kecil
    ctx.move_to(-40, -78)
    ctx.curve_to(-30, -110, -10, -120, 0, -118)
    ctx.curve_to(-10, -100, 0, -86, 10, -82)
    ctx.close_path()
    setc(ctx, dark)
    ctx.fill()
    # sirip dada
    ctx.move_to(40, 30)
    ctx.curve_to(30, 80, 0, 100, -20, 95)
    ctx.curve_to(0, 70, 10, 40, 40, 30)
    setc(ctx, dark)
    ctx.fill()
    # kepala
    ctx.save()
    ctx.translate(110, -10)
    ctx.rotate(head_turn)
    if beak:
        ctx.move_to(40, -10)
        ctx.curve_to(90, -12, 120, 0, 125, 10)
        ctx.curve_to(100, 22, 60, 24, 40, 20)
        setc(ctx, body)
        ctx.fill()
        circle(ctx, 0, -5, 62, body)
    else:
        circle(ctx, 10, -5, 75, body)   # kepala bulat (melon)
        ctx.save()
        ctx.translate(20, 30)
        ctx.scale(1.3, 0.6)
        circle(ctx, 0, 0, 40, belly)
        ctx.restore()
    # mata
    circle(ctx, 25, -12, 11, BLACK)
    circle(ctx, 28, -15, 4, WHITE)
    # mulut
    ctx.set_line_width(5)
    setc(ctx, mix(body, BLACK, 0.5))
    if mood == "happy":
        ctx.arc(45, 12, 30, 0.2, 1.3)
    else:
        ctx.arc(55, 45, 22, math.pi + 0.8, 2 * math.pi - 0.6)
    ctx.stroke()
    # lubang napas
    ctx.save()
    ctx.translate(-10, -72)
    ctx.scale(1.6, 0.6)
    circle(ctx, 0, 0, 7, mix(body, BLACK, 0.45))
    ctx.restore()
    ctx.restore()
    ctx.restore()


def fish(ctx, x, y, s=1.0, t=0.0, look=1, col="#c9d6de"):
    ctx.save()
    ctx.translate(x, y + 6 * math.sin(t * 3 + x))
    ctx.scale(s * look, s)
    ctx.move_to(-40, 0)
    ctx.line_to(-62, -18 + 4 * math.sin(t * 10))
    ctx.line_to(-62, 18 + 4 * math.sin(t * 10))
    ctx.close_path()
    setc(ctx, hexc(col))
    ctx.fill()
    ctx.save()
    ctx.scale(1, 0.5)
    circle(ctx, 0, 0, 42, hexc(col))
    ctx.restore()
    circle(ctx, 22, -4, 5, BLACK)
    ctx.restore()


def underwater(ctx, t, muddy=1.0, vis=None, fishes=True):
    """Pemandangan dalam sungai. vis = (x, y, r) area yang kelihatan."""
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *ep2.water_col(muddy * 0.8))
    g.add_color_stop_rgba(1, *mix(ep2.water_col(muddy), BLACK, 0.35))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    # cahaya dari atas
    for i in range(5):
        x = 120 + i * 220 + 30 * math.sin(t * 0.5 + i)
        ctx.move_to(x - 40, 0)
        ctx.line_to(x + 40, 0)
        ctx.line_to(x + 140, 1100)
        ctx.line_to(x + 20, 1100)
        ctx.close_path()
        setc(ctx, hexc("#ffffff", 0.06))
        ctx.fill()
    # dasar sungai
    ctx.move_to(0, 1380)
    for x in range(0, W + 41, 40):
        ctx.line_to(x, 1380 + 20 * math.sin(x / 90))
    ctx.line_to(W, H)
    ctx.line_to(0, H)
    ctx.close_path()
    setc(ctx, hexc("#6e4e2c"))
    ctx.fill()
    for i, x in enumerate((90, 300, 820, 1000)):
        # rumput air
        ctx.move_to(x, 1390)
        ctx.curve_to(x + 30 * math.sin(t + i), 1300, x - 30 * math.sin(t + i), 1220, x + 10 * math.sin(t * 1.3 + i), 1160)
        setc(ctx, hexc("#4f6b2a"))
        ctx.set_line_width(12)
        ctx.stroke()
    # partikel lumpur melayang
    random.seed(9)
    for i in range(int(110 * muddy)):
        bx, by = random.uniform(0, W), random.uniform(0, 1380)
        x = (bx + t * random.uniform(15, 40)) % W
        circle(ctx, x, by + 10 * math.sin(t + i), random.uniform(3, 7), hexc("#4a3218", 0.5))
    if fishes:
        for i, (fx, fy) in enumerate([(820, 520), (900, 640), (760, 700), (200, 1160)]):
            fish(ctx, fx + 20 * math.sin(t * 0.8 + i), fy, 0.9, t + i, look=-1 if i % 2 else 1)


def murk(ctx, x, y, r, k=1.0):
    """Gelapkan semua kecuali lingkaran di sekitar (x, y)."""
    if k <= 0:
        return
    g = cairo.RadialGradient(x, y, r * 0.6, x, y, r * 1.4)
    g.add_color_stop_rgba(0, 0.27, 0.18, 0.08, 0)
    g.add_color_stop_rgba(1, 0.27, 0.18, 0.08, 0.96 * k)
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()


def sonar_waves(ctx, x, y, t, k=1.0, reach=700, col=None, direction=0.0, spread=0.6):
    if k <= 0:
        return
    col = col or hexc("#ffffff")
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(5):
        ph = (t * 0.9 + i / 5) % 1.0
        r = 40 + reach * ph * k
        ctx.arc(x, y, r, direction - spread, direction + spread)
        setc(ctx, (col[0], col[1], col[2], 0.85 * (1 - ph)))
        ctx.set_line_width(10)
        ctx.stroke()


def click_text(ctx, x, y, t, k=1.0):
    if k <= 0:
        return
    for i in range(3):
        ph = (t * 1.5 + i / 3) % 1.0
        text(ctx, "klik!", x + 90 * ph + 30 * i, y - 70 * i, 58, hexc("#fff3a0", 1 - ph), stroke=BLACK, sw=6)


def surface_scene(ctx, t, muddy=1.0):
    """Permukaan sungai dari samping: langit atas, air bawah."""
    sky(ctx)
    sun(ctx, 860, 260, 70, t)
    clouds(ctx, t)
    hills(ctx)
    ctx.rectangle(0, 1000, W, 60)
    setc(ctx, GRASS_D)
    ctx.fill()
    for i, x in enumerate(range(40, W, 140)):
        jungle_tree(ctx, x, 1030, 0.45 + 0.1 * (i % 3))
    water(ctx, 1080, t, 0, W, alpha=0.97)
    ctx.rectangle(0, 1100, W, H - 1100)
    setc(ctx, ep2.water_col(muddy, 0.6))
    ctx.fill()


def net(ctx, x0, y0, w, h, k=1.0):
    if k <= 0:
        return
    setc(ctx, hexc("#f2f2f2", 0.8 * k))
    ctx.set_line_width(4)
    for i in range(int(w / 50) + 1):
        ctx.move_to(x0 + i * 50, y0)
        ctx.line_to(x0 + i * 50 + 20, y0 + h)
        ctx.stroke()
    for j in range(int(h / 50) + 1):
        ctx.move_to(x0, y0 + j * 50)
        ctx.line_to(x0 + w, y0 + j * 50 + 10)
        ctx.stroke()
    for i in range(int(w / 80) + 1):
        circle(ctx, x0 + i * 80, y0, 10, hexc("#ff8a3d", k))


# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    ep2.river_scene(ctx, t, muddy=1.0)
    k = seg(lt, 0.2, 1.2)
    # pesut muncul melengkung dari air
    a = -0.5 + 1.0 * clamp((lt % 2.4) / 2.4)
    pesut(ctx, 540, 1220 - 120 * math.sin(clamp((lt % 2.4) / 2.4) * math.pi) * k, 1.1, t, rot=a)
    water(ctx, 1240, t, 0, W, alpha=0.9)
    ground(ctx)
    for i, (x, y) in enumerate([(220, 760), (860, 700), (560, 560)]):
        qmark(ctx, x, y, 120 - i * 15, t, seg(lt, 0.8 + i * 0.25, 1.1 + i * 0.25))


def sc_sea(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#7fd0ff"))
    g.add_color_stop_rgba(1, *hexc("#d8f3ff"))
    ctx.rectangle(0, 0, W, 1000)
    ctx.set_source(g)
    ctx.fill()
    sun(ctx, 860, 260, 70, t)
    clouds(ctx, t)
    water(ctx, 1000, t, 0, W, alpha=1.0)
    ctx.rectangle(0, 1020, W, H - 1020)
    g = cairo.LinearGradient(0, 1000, 0, H)
    g.add_color_stop_rgba(0, *SEA)
    g.add_color_stop_rgba(1, *hexc("#0b4f86"))
    ctx.set_source(g)
    ctx.fill()
    ph = clamp((lt % 2.0) / 2.0)
    pesut(ctx, 300 + 480 * ph, 1060 - 330 * math.sin(ph * math.pi), 0.9, t, rot=-0.9 + 1.8 * ph,
          beak=True, col=hexc("#7f98b5"))
    label_chip(ctx, "Laut", 540, 560, 56, SEA, k=seg(lt, 0.3, 0.7))


def sc_you(ctx, lt, d, t):
    underwater(ctx, t, fishes=False)
    k = seg(lt, 0, d * 0.5)
    pesut(ctx, -300 + 840 * k, 800, 1.6, t)
    label_chip(ctx, "Pesut", 540, 450, 56, PESUT_D, k=seg(lt, d * 0.4, d * 0.55))
    label_chip(ctx, "kerabat lumba-lumba", 540, 560, 40, hexc("#3a6ea5"), k=seg(lt, d * 0.55, d * 0.7))


def sc_home(ctx, lt, d, t):
    ep2.river_scene(ctx, t, muddy=1.0)
    pesut(ctx, 300 + 80 * lt, 1170, 0.7, t, rot=-0.1)
    water(ctx, 1190, t, 0, W, alpha=0.85)
    ground(ctx)
    label_chip(ctx, "Sungai Mahakam", 540, 620, 54, hexc("#9b6a35"), k=seg(lt, 0.4, 0.8))
    label_chip(ctx, "air tawar", 540, 740, 44, BLUE, k=seg(lt, d * 0.5, d * 0.65))


def sc_adapt(ctx, lt, d, t):
    underwater(ctx, t)
    pesut(ctx, 540, 850, 1.7, t)
    for i in range(6):
        a = t * 1.5 + i * math.pi / 3
        r = 420
        circle(ctx, 540 + r * math.cos(a), 850 + r * 0.6 * math.sin(a), 10, hexc("#fff3a0", 0.8))
    check(ctx, 860, 480, 70, seg(lt, d * 0.5, d * 0.62))


def sc_body(ctx, lt, d, t):
    underwater(ctx, t, fishes=False)
    turn = 0.35 * math.sin(t * 2.5) * seg(lt, d * 0.6, d * 0.75)
    pesut(ctx, 470, 850, 1.9, t, head_turn=turn)
    tags = [("Kepala bulat", 760, 520, seg(lt, 0.2, 0.6)), ("Moncong pendek", 830, 1080, seg(lt, d * 0.3, d * 0.45)),
            ("Leher lentur", 280, 520, seg(lt, d * 0.6, d * 0.75))]
    for s, x, y, k in tags:
        label_chip(ctx, s, x, y, 42, hexc("#3a6ea5"), k=k)


def sc_muddy(ctx, lt, d, t):
    underwater(ctx, t, muddy=1.0)
    pesut(ctx, 360, 860, 1.1, t, mood="sad")
    murk(ctx, 400, 860, 360, seg(lt, 0, d * 0.5))
    for i, (x, y) in enumerate([(700, 700), (820, 900)]):
        qmark(ctx, x, y, 100, t, seg(lt, d * 0.5 + i * 0.3, d * 0.7 + i * 0.3))


def sc_sonar(ctx, lt, d, t):
    underwater(ctx, t, muddy=1.0)
    pesut(ctx, 360, 860, 1.1, t, mood="happy")
    murk(ctx, 400, 860, 360, 1.0)
    sonar_waves(ctx, 520, 840, t, seg(lt, 0.4, 1.0))
    label_chip(ctx, "SONAR", 540, 480, 70, hexc("#3a6ea5"), k=seg(lt, 0.3, 0.7))


def sc_click(ctx, lt, d, t):
    underwater(ctx, t, muddy=1.0)
    pesut(ctx, 300, 860, 1.0, t)
    murk(ctx, 340, 860, 340, 1.0 - 0.5 * seg(lt, d * 0.5, d))
    sonar_waves(ctx, 450, 840, t, 1.0, reach=500)
    click_text(ctx, 470, 760, t, seg(lt, 0.1, 0.4))
    # gema kembali dari ikan
    k = seg(lt, d * 0.45, d * 0.6)
    sonar_waves(ctx, 860, 640, t + 0.5, k, reach=380, col=YELLOW, direction=math.pi, spread=0.5)
    fish(ctx, 860, 640, 1.0, t, look=-1)


def sc_echo(ctx, lt, d, t):
    underwater(ctx, t, muddy=1.0)
    k = seg(lt, d * 0.4, d * 0.8)
    pesut(ctx, 300 + 380 * k, 860 - 160 * k, 1.0, t, rot=-0.3 * k)
    murk(ctx, 600, 760, 520, 0.6)
    for i, (fx, fy) in enumerate([(860, 640), (930, 720)]):
        ctx.save()
        ctx.translate(fx, fy)
        ctx.arc(0, 0, 70 + 8 * math.sin(t * 6), 0, 2 * math.pi)
        setc(ctx, YELLOW)
        ctx.set_line_width(6)
        ctx.stroke()
        ctx.restore()
    label_chip(ctx, "Ikan ketemu!", 540, 460, 54, GREEN, k=seg(lt, d * 0.55, d * 0.7))


def sc_breathe(ctx, lt, d, t):
    surface_scene(ctx, t)
    k = seg(lt, 0.2, d * 0.45)
    y = 1300 - 220 * k
    pesut(ctx, 540, y, 1.2, t, rot=-0.15)
    water(ctx, 1080, t, 0, W, alpha=0.75)
    if k >= 1:
        # semburan napas dari lubang di kepala
        sp = seg(lt, d * 0.45, d * 0.7)
        bx, by = 540 + 120 * 1.2, y - 110
        random.seed(6)
        for i in range(24):
            ph = (t * 1.2 + i / 24) % 1.0
            px = bx + random.uniform(-60, 60) * ph
            py = by - 300 * ph * sp
            circle(ctx, px, py, 16 * (1 - ph) + 6, hexc("#ffffff", 0.7 * (1 - ph) * sp))
    label_chip(ctx, "Bernapas", 540, 520, 56, BLUE, k=seg(lt, d * 0.45, d * 0.6))


def sc_spit(ctx, lt, d, t):
    surface_scene(ctx, t)
    pesut(ctx, 380, 1080, 1.1, t, rot=-0.35)
    water(ctx, 1080, t, 0, W, alpha=0.75)
    k = seg(lt, 0.3, d * 0.6)
    if k > 0:
        mx, my = 380 + 200, 1080 - 160
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for i in range(3):
            ctx.move_to(mx, my)
            ex = mx + 420 * k
            ey = my + 120 * k
            ctx.curve_to(mx + 120 * k, my - 260 * k - i * 20, mx + 300 * k, my - 220 * k, ex, ey + i * 10)
            setc(ctx, hexc("#e9f6ff", 0.9 - i * 0.2))
            ctx.set_line_width(18 - i * 4)
            ctx.stroke()
        random.seed(3)
        for i in range(12):
            circle(ctx, mx + 420 * k + random.uniform(-60, 60), my + 120 * k + random.uniform(-20, 40), 10, hexc("#e9f6ff", 0.8))
    label_chip(ctx, "Sembur!", 760, 600, 60, BLUE, k=seg(lt, d * 0.45, d * 0.6))


def sc_few(ctx, lt, d, t):
    underwater(ctx, t, fishes=False)
    k = seg(lt, 0.2, d)
    for i in range(12):
        alpha = 1.0 if i < 2 else 1.0 - k
        if alpha <= 0.02:
            continue
        x = 190 + (i % 3) * 350
        y = 640 + (i // 3) * 190
        ctx.push_group()
        pesut(ctx, x, y, 0.42, t + i)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(alpha)
    label_chip(ctx, "Makin sedikit", 540, 420, 54, RED, k=seg(lt, d * 0.4, d * 0.55))


def sc_count(ctx, lt, d, t):
    underwater(ctx, t, fishes=False)
    ctx.rectangle(0, 0, W, H)
    setc(ctx, hexc("#000000", 0.35))
    ctx.fill()
    k = seg(lt, 0.2, 0.7)
    ctx.save()
    ctx.translate(W / 2, 700)
    ctx.scale(ease_out_back(k), ease_out_back(k))
    text(ctx, "< 100", 0, 0, 230, YELLOW, stroke=BLACK, sw=20)
    ctx.restore()
    label_chip(ctx, "ekor (perkiraan)", W / 2, 900, 48, BLACK, YELLOW, k=seg(lt, 0.6, 1.0))
    label_chip(ctx, "Sangat terancam punah", W / 2, 1060, 46, RED, k=seg(lt, d * 0.5, d * 0.65))
    pesut(ctx, W / 2, 1250, 0.6, t, mood="sad")


def sc_threats(ctx, lt, d, t):
    underwater(ctx, t, fishes=False)
    k1 = seg(lt, 0.2, d * 0.35)
    k2 = seg(lt, d * 0.35, d * 0.55)
    k3 = seg(lt, d * 0.6, d * 0.8)
    pesut(ctx, 380, 760, 0.9, t, mood="sad")
    net(ctx, 160, 520, 520, 460, k1)
    if k1 > 0:
        label_chip(ctx, "Jaring", 420, 440, 44, RED, k=k1)
    if k2 > 0:
        # kapal di permukaan + gelombang bising
        ctx.rectangle(0, 0, W, 180)
        setc(ctx, hexc("#d9f1ff", 0.0))
        ctx.fill()
        ctx.save()
        ctx.translate(820, 260)
        ctx.scale(ease_out_back(k2), ease_out_back(k2))
        rrect(ctx, -200, -60, 400, 90, 20)
        setc(ctx, hexc("#3b3b3b"))
        ctx.fill()
        rrect(ctx, -60, -130, 140, 80, 12)
        setc(ctx, hexc("#e5484d"))
        ctx.fill()
        ctx.restore()
        sonar_waves(ctx, 820, 320, t, k2, reach=380, col=hexc("#ff8a3d"), direction=math.pi / 2, spread=0.9)
        label_chip(ctx, "Kapal", 820, 560, 44, hexc("#e07b00"), k=k2)
    if k3 > 0:
        for i, x in enumerate((760, 900)):
            fish(ctx, x, 1180, 0.8, t)
        check(ctx, 830, 1180, 70, k3, ok=False)
        label_chip(ctx, "Ikan berkurang", 830, 1050, 42, RED, k=k3)


def sc_help(ctx, lt, d, t):
    ep2.river_scene(ctx, t, muddy=0.8)
    pesut(ctx, 300 + 60 * lt, 1180, 0.6, t, rot=-0.1)
    water(ctx, 1200, t, 0, W, alpha=0.85)
    ground(ctx)
    kid(ctx, 780, GY + 30, 1.0, t, "happy", look=-1)
    # HP di tangan
    rrect(ctx, 830, GY - 170, 50, 90, 10)
    setc(ctx, BLACK)
    ctx.fill()
    rrect(ctx, 836, GY - 162, 38, 70, 6)
    setc(ctx, hexc("#7cc8ff"))
    ctx.fill()
    label_chip(ctx, "Jangan buang sampah", 540, 560, 46, GREEN, k=seg(lt, 0.3, 0.7))
    label_chip(ctx, "Lapor kalau ada pesut terjerat!", 540, 690, 40, RED, k=seg(lt, d * 0.5, d * 0.65))
    check(ctx, 900, 560, 50, seg(lt, 0.6, 0.9))


def sc_summary(ctx, lt, d, t):
    underwater(ctx, t)
    ctx.rectangle(0, 0, W, H)
    setc(ctx, hexc("#000000", 0.3))
    ctx.fill()
    text(ctx, "Rahasia Pesut", W / 2, 300, 84, YELLOW, stroke=BLACK, sw=12)
    items = [("Tubuh cocok di sungai", PESUT_D), ("Sonar tembus air keruh", hexc("#3a6ea5")),
             ("Napas di permukaan", BLUE)]
    for i, (s, c) in enumerate(items):
        k = seg(lt, 0.2 + i * d * 0.2, 0.6 + i * d * 0.2)
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
        ts = 54
        while text_width(ctx, s, ts) > 640:
            ts -= 2
        text(ctx, s, -270, 0, ts, BLACK, align="left")
        ctx.restore()


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items()
             if n.startswith("sc_") and callable(f) and f.__module__ == __name__}

if __name__ == "__main__":
    run(Episode(4, SCENES, SCENE_FNS, HERE / "pesut_shorts.mp4", voice_spans=VOICE_SPANS, music_key=5))
