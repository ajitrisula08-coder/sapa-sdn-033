#!/usr/bin/env python3
"""Kok Bisa? #5 - Bekantan, kok hidungnya mancung banget? (versi 2D)

Fakta: rilis Kyoto University 22 Feb 2018 (Koda dkk., Science Advances 4(2): eaaq0250);
Dharma & Atmoko (2024), Penerbit BRIN. Lihat dokumen "Paket Produksi 3D: Bekantan".

Pakai:  python3 make_video.py                        -> bekantan_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> bekantan_shorts_narasi.mp4
        python3 make_video.py --preview preview.png  -> contact sheet untuk dicek
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

# ----------------------------------------------------------------- naskah --
SCENES = [
    ("hook", "Monyet ini punya julukan unik: [monyet Belanda]. Coba lihat hidungnya!"),
    ("aerial", "Namanya [bekantan], monyet berhidung panjang yang cuma ada di Pulau Kalimantan."),
    ("family", "Mereka tinggal di hutan [mangrove] dan tepi sungai."),
    ("compare", "Tapi hidung super panjang yang menggantung ini cuma dimiliki bekantan [jantan dewasa]."),
    ("why", "Kok bisa?"),
    ("size", "Peneliti dari Kyoto University menemukan, makin besar hidung si jantan, makin besar juga [tubuhnya]."),
    ("harem", "Dan makin banyak [betina] di kelompoknya!"),
    ("voice", "Hidung itu juga bikin suaranya lebih [berat] saat memanggil betina."),
    ("badge", "Jadi hidung besar itu ibarat [lencana] jantan yang kuat."),
    ("swim", "Bonusnya, bekantan jago [berenang]! Jari kakinya berselaput, dan mereka bisa menyeberangi sungai yang lebar."),
    ("threat", "Sayangnya, bekantan kini [terancam punah] karena hutan mangrove terus berkurang."),
    ("end", "Menurutmu, hidung bekantan itu lucu atau keren? Tulis di komentar, dan follow [Kok Bisa] Kaltim!"),
]

# Waktu bicara tiap kalimat (detik) pada narasi ElevenLabs "Bagas" (narasi_bagas.mp3),
# diukur dari jeda/hening di file audio (ffmpeg silencedetect).
VOICE_SPANS = [
    (0.00, 4.41), (4.81, 9.31), (9.70, 12.07), (12.44, 17.49), (17.82, 18.41), (18.77, 24.48),
    (24.75, 26.75), (27.08, 30.27), (30.58, 33.91), (34.26, 40.53), (40.88, 45.43), (45.83, 51.64),
]

# ----------------------------------------------------------------- warna --
FUR = hexc("#d9692a")
FUR_D = hexc("#b4501c")
LIMB = hexc("#b9b3aa")
LIMB_D = hexc("#8e877d")
HAND = hexc("#4a4642")
BELLY = hexc("#f0dcb8")
FACE = hexc("#f2b48a")
NOSE = hexc("#f08f7a")
NOSE_D = hexc("#d4705d")
TAIL = hexc("#f2efe6")
RIVER = hexc("#a8743a")

# ---------------------------------------------------------------- karakter --


def bekantan(ctx, x, y, s=1.0, t=0.0, male=True, look=1, mood="happy",
             nose_k=1.0, call=0.0, puff=0.0, tilt=0.0, blink=True, baby=False):
    """Bekantan duduk. (x, y) = titik duduk di dahan."""
    y -= LIFT
    s *= 1.2
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * look, s)
    breathe = 1 + 0.015 * math.sin(t * 3)
    # ekor menggantung
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.move_to(-30, -10)
    ctx.curve_to(-60, 60, -20 + 15 * math.sin(t * 1.5), 120, -45, 190)
    setc(ctx, TAIL)
    ctx.set_line_width(20)
    ctx.stroke()
    # kaki (abu-abu) ditekuk
    for d in (-1, 1):
        ctx.move_to(d * 50, -40)
        ctx.curve_to(d * 110, -30, d * 110, 20, d * 70, 25)
        setc(ctx, LIMB)
        ctx.set_line_width(42)
        ctx.stroke()
        rrect(ctx, d * 70 - 26, 10, 52, 26, 12)
        setc(ctx, HAND)
        ctx.fill()
    # badan
    ctx.save()
    ctx.translate(0, -120)
    ctx.scale((1 + puff * 0.12) * breathe, breathe)
    ctx.save()
    ctx.scale(1, 1.2)
    circle(ctx, 0, 0, 95, FUR)
    ctx.restore()
    # perut buncit
    ctx.save()
    ctx.translate(0, 35)
    ctx.scale(1.05, 1.0)
    circle(ctx, 0, 0, 72, BELLY)
    ctx.restore()
    ctx.restore()
    # lengan (abu-abu) ke dahan
    for d in (-1, 1):
        ctx.move_to(d * 78, -170)
        ctx.curve_to(d * 120, -110, d * 115, -40, d * 95, -5)
        setc(ctx, LIMB)
        ctx.set_line_width(32)
        ctx.stroke()
        circle(ctx, d * 95, -2, 20, HAND)
    # kepala
    ctx.save()
    ctx.translate(0, -265)
    ctx.rotate(tilt)
    circle(ctx, 0, 0, 78, FUR)
    for d in (-1, 1):
        circle(ctx, d * 74, 0, 16, FACE)
    # rambut puncak
    ctx.move_to(-70, -30)
    ctx.curve_to(-40, -95, 40, -95, 70, -30)
    ctx.curve_to(30, -55, -30, -55, -70, -30)
    setc(ctx, FUR_D)
    ctx.fill()
    # wajah
    ctx.save()
    ctx.scale(1, 1.1)
    circle(ctx, 0, 12, 56, FACE)
    ctx.restore()
    # mata
    closed = blink and (t * 0.8) % 3.2 < 0.12
    for d in (-1, 1):
        if closed:
            ctx.move_to(d * 22 - 12, -8)
            ctx.line_to(d * 22 + 12, -8)
            setc(ctx, BLACK)
            ctx.set_line_width(4)
            ctx.stroke()
        else:
            circle(ctx, d * 22, -8, 15, WHITE)
            circle(ctx, d * 22 + 3, -6, 8, hexc("#5a3417"))
            circle(ctx, d * 22 + 5, -9, 3, WHITE)
    # mulut
    setc(ctx, hexc("#7a3a26"))
    ctx.set_line_width(5)
    if call > 0:
        ctx.save()
        ctx.translate(0, 52)
        ctx.scale(1, 0.6 + call)
        circle(ctx, 0, 0, 14, hexc("#7a3a26"))
        ctx.restore()
    elif mood == "sad":
        ctx.arc(0, 62, 14, math.pi + 0.5, 2 * math.pi - 0.5)
        ctx.stroke()
    else:
        ctx.arc(0, 38, 18, 0.3, math.pi - 0.3)
        ctx.stroke()
    # hidung
    if male and not baby:
        L = 125 * nose_k
        wob = 4 * math.sin(t * 5) + 8 * call * math.sin(t * 40)
        ctx.save()
        ctx.translate(0, 2)
        ctx.rotate(wob * 0.01)
        ctx.move_to(-14, 0)
        ctx.curve_to(-30, L * 0.4, -38, L * 0.9, -6, L)
        ctx.curve_to(10, L + 6, 38, L * 0.9, 30, L * 0.4)
        ctx.curve_to(24, 10, 14, 0, -14, 0)
        setc(ctx, NOSE)
        ctx.fill()
        ctx.move_to(-6, L * 0.9)
        ctx.curve_to(0, L * 0.97, 8, L * 0.97, 14, L * 0.9)
        setc(ctx, NOSE_D)
        ctx.set_line_width(4)
        ctx.stroke()
        ctx.restore()
    else:
        # hidung kecil mancung ke atas
        ctx.move_to(-10, 8)
        ctx.line_to(0, 26 if not baby else 20)
        ctx.line_to(14, 12)
        ctx.curve_to(10, 0, -4, 0, -10, 8)
        setc(ctx, NOSE)
        ctx.fill()
    ctx.restore()
    ctx.restore()


def mangrove_tree(ctx, x, y_water, s=1.0, dark=0.0, t=0.0):
    """Pohon mangrove dengan akar tunjang di atas air."""
    col = mix(hexc("#6b4a2a"), hexc("#3d2b1a"), dark)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(-3, 4):
        ctx.move_to(x, y_water - 140 * s)
        ctx.curve_to(x + i * 30 * s, y_water - 120 * s, x + i * 45 * s, y_water - 40 * s, x + i * 50 * s, y_water + 10)
        setc(ctx, col)
        ctx.set_line_width(9 * s)
        ctx.stroke()
    ctx.rectangle(x - 14 * s, y_water - 330 * s, 28 * s, 200 * s)
    ctx.fill()
    c1 = mix(hexc("#2f7d3a"), hexc("#25402b"), dark)
    c2 = mix(hexc("#3e9a46"), hexc("#2e4a33"), dark)
    for dx, dy, r, c in [(-70, -340, 70, c1), (70, -345, 70, c1), (0, -400, 85, c2), (-30, -320, 60, c2), (40, -310, 55, c2)]:
        circle(ctx, x + dx * s + 3 * math.sin(t + dx), y_water + dy * s, r * s, c)


def mangrove_world(ctx, t, horizon=1000, dark=0.0, trees=True, gone=0.0, sunset=False):
    g = cairo.LinearGradient(0, 0, 0, horizon)
    if sunset:
        g.add_color_stop_rgba(0, *hexc("#f2a65a"))
        g.add_color_stop_rgba(1, *hexc("#ffe1b0"))
    else:
        g.add_color_stop_rgba(0, *mix(hexc("#5fb7e8"), hexc("#7a8590"), dark))
        g.add_color_stop_rgba(1, *mix(hexc("#d9f1ff"), hexc("#b5bcc2"), dark))
    ctx.rectangle(0, 0, W, horizon + 5)
    ctx.set_source(g)
    ctx.fill()
    if dark < 0.5:
        sun(ctx, 860, 300 if not sunset else 640, 70, t)
    clouds(ctx, t, dark)
    # hutan jauh
    random.seed(2)
    for i in range(14):
        x = i * 85 + random.uniform(-20, 20)
        circle(ctx, x, horizon - 30, random.uniform(60, 90), mix(hexc("#5f9e62"), hexc("#6a7a6c"), dark))
    # sungai cokelat
    ctx.rectangle(0, horizon, W, H - horizon)
    g = cairo.LinearGradient(0, horizon, 0, H)
    g.add_color_stop_rgba(0, *mix(RIVER, hexc("#c9a06a"), 0.3))
    g.add_color_stop_rgba(1, *mix(RIVER, BLACK, 0.25))
    ctx.set_source(g)
    ctx.fill()
    setc(ctx, hexc("#ffffff", 0.3))
    ctx.set_line_width(5)
    random.seed(8)
    for i in range(18):
        y = random.uniform(horizon + 20, H - 40)
        x = (random.uniform(0, W) + t * random.uniform(20, 50)) % (W + 100) - 50
        ctx.move_to(x, y)
        ctx.line_to(x + 60, y)
        ctx.stroke()
    if trees:
        for i, (x, s) in enumerate([(90, 1.0), (330, 0.75), (760, 0.85), (1000, 1.05)]):
            if gone > 0 and i < int(gone * 4.99):
                # tunggul
                ctx.rectangle(x - 16 * s, horizon - 60 * s, 32 * s, 70 * s)
                setc(ctx, hexc("#7a5532"))
                ctx.fill()
                continue
            mangrove_tree(ctx, x, horizon + 40, s, dark, t)


LIFT = 110  # angkat karakter & dahan agar tidak bertabrakan dengan subtitle


def branch(ctx, y, x0=-40, x1=W + 40, s=1.0):
    y -= LIFT
    ctx.move_to(x0, y + 20 * s)
    ctx.curve_to(W * 0.3, y - 10 * s, W * 0.7, y + 30 * s, x1, y)
    ctx.line_to(x1, y + 44 * s)
    ctx.curve_to(W * 0.7, y + 74 * s, W * 0.3, y + 34 * s, x0, y + 64 * s)
    ctx.close_path()
    setc(ctx, hexc("#6b4a2a"))
    ctx.fill()
    for i in range(6):
        xx = 80 + i * 180
        circle(ctx, xx, y + 30 * s, 6 * s, hexc("#4f8a3a", 0.8))


def leaves(ctx, t, k=1.0):
    """Daun di latar depan."""
    for i, (x, y, a) in enumerate([(60, 1700, -0.6), (980, 1680, 0.5), (140, 1820, -0.2), (900, 1840, 0.2)]):
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(a + 0.05 * math.sin(t * 2 + i))
        ctx.scale(k, k)
        ctx.move_to(0, 0)
        ctx.curve_to(60, -60, 160, -40, 200, 0)
        ctx.curve_to(160, 40, 60, 60, 0, 0)
        setc(ctx, hexc("#2f7d3a"))
        ctx.fill()
        ctx.restore()


def sound_rings(ctx, x, y, t, k=1.0, col=None, low=False):
    if k <= 0:
        return
    col = col or WHITE
    for i in range(4):
        ph = (t * (0.7 if low else 1.2) + i / 4) % 1.0
        r = 30 + 260 * ph * k
        ctx.arc(x, y, r, -0.7, 0.7)
        setc(ctx, (col[0], col[1], col[2], 0.9 * (1 - ph)))
        ctx.set_line_width(16 if low else 8)
        ctx.stroke()


def heart(ctx, x, y, s, a=1.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.move_to(0, 12)
    ctx.curve_to(-30, -10, -18, -34, 0, -18)
    ctx.curve_to(18, -34, 30, -10, 0, 12)
    setc(ctx, hexc("#ff5d7a", a))
    ctx.fill()
    ctx.restore()


def medal(ctx, x, y, s, t, k=1.0):
    if k <= 0:
        return
    sc = ease_out_back(k) * s
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    ctx.move_to(-30, -90)
    ctx.line_to(-10, -20)
    ctx.line_to(10, -20)
    ctx.line_to(30, -90)
    ctx.close_path()
    setc(ctx, BLUE)
    ctx.fill()
    circle(ctx, 0, 20, 56, hexc("#f2b21b"))
    circle(ctx, 0, 20, 42, YELLOW)
    ctx.save()
    ctx.translate(0, 20)
    ctx.rotate(math.sin(t * 2) * 0.1)
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        a2 = a + math.pi / 5
        if i == 0:
            ctx.move_to(28 * math.cos(a), 28 * math.sin(a))
        else:
            ctx.line_to(28 * math.cos(a), 28 * math.sin(a))
        ctx.line_to(12 * math.cos(a2), 12 * math.sin(a2))
    ctx.close_path()
    setc(ctx, hexc("#f28c1b"))
    ctx.fill()
    ctx.restore()
    ctx.restore()


# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    mangrove_world(ctx, t, sunset=True)
    branch(ctx, 1380, s=1.4)
    z = 1.9 + 0.25 * seg(lt, 0, d)
    bekantan(ctx, W / 2, 1400, z / 1.2, t, male=True, tilt=0.08 * math.sin(t * 1.5))
    leaves(ctx, t)
    label_chip(ctx, "Monyet Belanda?", W / 2, 360, 60, hexc("#b4501c"), k=seg(lt, 0.4, 0.9))


def sc_aerial(ctx, lt, d, t):
    mangrove_world(ctx, t, horizon=760)
    random.seed(4)
    for i in range(7):
        x = 100 + i * 150
        mangrove_tree(ctx, x, 900 + (i % 2) * 120, 0.55, 0, t)
        bekantan(ctx, x + 10, 900 + (i % 2) * 120 - 200, 0.22, t + i, male=(i % 3 == 0))
    label_chip(ctx, "Endemik Kalimantan", W / 2, 520, 50, GREEN, k=seg(lt, d * 0.4, d * 0.6))


def sc_family(ctx, lt, d, t):
    mangrove_world(ctx, t)
    branch(ctx, 1180)
    bekantan(ctx, 300, 1200, 0.95, t, male=True)
    bekantan(ctx, 620, 1205, 0.75, t + 1, male=False, look=-1)
    bekantan(ctx, 860, 1205, 0.72, t + 2, male=False, look=-1)
    bekantan(ctx, 520, 1100 + 6 * math.sin(t * 3), 0.38, t + 3, male=False, baby=True)
    label_chip(ctx, "Hutan mangrove", W / 2, 480, 50, hexc("#2f7d3a"), k=seg(lt, 0.4, 0.8))


def sc_compare(ctx, lt, d, t):
    mangrove_world(ctx, t)
    branch(ctx, 1260)
    bekantan(ctx, 330, 1280, 1.05, t, male=True)
    bekantan(ctx, 780, 1285, 0.85, t + 1, male=False, look=-1)
    label_chip(ctx, "Jantan dewasa", 330, 1420, 44, hexc("#b4501c"), k=seg(lt, 0.4, 0.8))
    label_chip(ctx, "Betina", 780, 1420, 44, hexc("#7a6aa0"), k=seg(lt, 0.8, 1.2))
    # panah ke hidung jantan
    k = seg(lt, d * 0.4, d * 0.6)
    if k > 0:
        arrow_flow(ctx, [(560, 620), (500, 640), (440, 680), (400, 740)], t, YELLOW, 12, dash=1000)
        arrowhead(ctx, 395, 750, 2.1, 30, YELLOW)


def sc_why(ctx, lt, d, t):
    mangrove_world(ctx, t)
    branch(ctx, 1300)
    bekantan(ctx, W / 2, 1320, 1.3, t, male=True, tilt=0.25 * math.sin(t * 3))
    for i, (x, y) in enumerate([(240, 520), (840, 470), (760, 700)]):
        qmark(ctx, x, y, 130 - i * 20, t, seg(lt, 0.1 + i * 0.15, 0.4 + i * 0.15))


def sc_size(ctx, lt, d, t):
    mangrove_world(ctx, t)
    branch(ctx, 1260)
    k = seg(lt, 0.3, d * 0.7)
    bekantan(ctx, 300, 1280, 0.75, t, male=True, nose_k=0.55)
    bekantan(ctx, 750, 1280, 0.85 + 0.35 * k, t + 1, male=True, nose_k=1.0 + 0.25 * k, look=-1)
    label_chip(ctx, "Kyoto University (2018)", W / 2, 360, 42, hexc("#3a3f6b"), k=seg(lt, 0.2, 0.6))
    # panah naik
    if k > 0:
        x = 1000
        ctx.move_to(x, 1200)
        ctx.line_to(x, 1200 - 420 * k)
        setc(ctx, GREEN)
        ctx.set_line_width(14)
        ctx.stroke()
        arrowhead(ctx, x, 1180 - 420 * k, -math.pi / 2, 34, GREEN)


def sc_harem(ctx, lt, d, t):
    mangrove_world(ctx, t)
    branch(ctx, 1260)
    bekantan(ctx, W / 2, 1280, 1.05, t, male=True)
    pos = [(160, 1285), (330, 1290), (750, 1290), (920, 1285)]
    for i, (x, y) in enumerate(pos):
        k = seg(lt, 0.2 + i * 0.3, 0.6 + i * 0.3)
        if k <= 0:
            continue
        ctx.save()
        ctx.translate(0, (1 - ease_out_back(k)) * 300)
        bekantan(ctx, x, y, 0.62, t + i, male=False, look=1 if x > W / 2 else -1)
        ctx.restore()
    for i in range(4):
        ph = (t * 0.5 + i / 4) % 1
        heart(ctx, 400 + i * 90, 640 - 200 * ph, 1.2, 1 - ph)


def sc_voice(ctx, lt, d, t):
    mangrove_world(ctx, t, dark=0.1)
    branch(ctx, 1320)
    call = 0.6 + 0.4 * abs(math.sin(t * 6))
    bekantan(ctx, 400, 1340, 1.3, t, male=True, call=call)
    sound_rings(ctx, 470, 920, t, 1.0, hexc("#ffffff"), low=True)
    # gelombang suara rendah
    k = seg(lt, d * 0.3, d * 0.5)
    if k > 0:
        ctx.move_to(620, 560)
        for i in range(60):
            x = 620 + i * 7
            ctx.line_to(x, 560 + 50 * math.sin(i / 4 - t * 4))
        setc(ctx, YELLOW)
        ctx.set_line_width(10)
        ctx.stroke()
        label_chip(ctx, "Suara lebih berat", 830, 680, 40, hexc("#3a3f6b"), k=k)


def sc_badge(ctx, lt, d, t):
    mangrove_world(ctx, t, sunset=True)
    branch(ctx, 1320)
    bekantan(ctx, W / 2, 1340, 1.35, t, male=True, puff=seg(lt, 0, 0.8))
    medal(ctx, W / 2 + 200, 760, 1.2, t, seg(lt, d * 0.3, d * 0.55))
    for i in range(4):
        a = 0.5 + 0.5 * math.sin(t * 7 + i * 2)
        ctx.save()
        ctx.translate(W / 2 + [-160, 150, -120, 190][i], [700, 640, 900, 950][i])
        ctx.rotate(math.pi / 4)
        ctx.rectangle(-4, -24 * a, 8, 48 * a)
        ctx.rectangle(-24 * a, -4, 48 * a, 8)
        setc(ctx, hexc("#fff6c2", a))
        ctx.fill()
        ctx.restore()
    label_chip(ctx, "Lencana jantan kuat", W / 2, 380, 46, hexc("#f28c1b"), k=seg(lt, d * 0.5, d * 0.65))


def sc_swim(ctx, lt, d, t):
    mangrove_world(ctx, t, horizon=760)
    k = seg(lt, 0, d)
    x = 120 + 820 * k
    bekantan(ctx, x, 1330 + LIFT + 8 * math.sin(t * 4), 0.75, t, male=True, look=1)
    water(ctx, 1150, t, 0, W, alpha=0.9)
    # cipratan
    for i in range(6):
        ph = (t * 2 + i / 6) % 1
        circle(ctx, x - 120 - 60 * ph, 1130 - 40 * math.sin(ph * math.pi), 10 * (1 - ph), hexc("#f1e6d0", 0.8))
    # sisipan: kaki berselaput
    kk = seg(lt, d * 0.35, d * 0.5)
    if kk > 0:
        cx, cy = 540, 470
        sc = ease_out_back(kk)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(sc, sc)
        circle(ctx, 0, 0, 190, WHITE)
        ctx.arc(0, 0, 190, 0, 2 * math.pi)
        setc(ctx, hexc("#3a6ea5"))
        ctx.set_line_width(10)
        ctx.stroke()
        # telapak + jari + selaput
        rrect(ctx, -60, -20, 120, 90, 30)
        setc(ctx, HAND)
        ctx.fill()
        for i in range(4):
            fx = -54 + i * 36
            rrect(ctx, fx - 10, -110, 22, 100, 10)
            ctx.fill()
        ctx.move_to(-54, -40)
        for i in range(4):
            fx = -54 + i * 36
            ctx.line_to(fx, -70)
            ctx.line_to(fx + 18, -40)
        ctx.line_to(54, -20)
        ctx.line_to(-54, -20)
        ctx.close_path()
        setc(ctx, hexc("#d9a08a", 0.9))
        ctx.fill()
        ctx.restore()
        label_chip(ctx, "Jari berselaput", cx, cy + 230, 40, hexc("#3a6ea5"), k=kk)


def sc_threat(ctx, lt, d, t):
    k = seg(lt, 0.2, d * 0.8)
    mangrove_world(ctx, t, dark=0.35, gone=k)
    branch(ctx, 1320)
    bekantan(ctx, W / 2, 1340, 1.1, t, male=True, mood="sad")
    label_chip(ctx, "Terancam punah", W / 2, 420, 58, RED, k=seg(lt, d * 0.35, d * 0.5))
    label_chip(ctx, "IUCN: Endangered", W / 2, 540, 40, hexc("#333333"), k=seg(lt, d * 0.5, d * 0.65))


def sc_end(ctx, lt, d, t):
    mangrove_world(ctx, t, sunset=True)
    branch(ctx, 1180)
    bekantan(ctx, 330, 1200, 0.9, t, male=True)
    bekantan(ctx, 640, 1205, 0.72, t + 1, male=False, look=-1)
    bekantan(ctx, 520, 1100 + 6 * math.sin(t * 3), 0.36, t + 3, male=False, baby=True)
    k1 = seg(lt, 0.3, 0.7)
    label_chip(ctx, "Lucu?", 300, 420, 64, hexc("#ff5d7a"), k=k1)
    label_chip(ctx, "Keren?", 780, 420, 64, BLUE, k=seg(lt, 0.7, 1.1))
    # ikon komentar
    kc = seg(lt, d * 0.5, d * 0.65)
    if kc > 0:
        ctx.save()
        ctx.translate(W / 2, 640)
        ctx.scale(ease_out_back(kc), ease_out_back(kc))
        rrect(ctx, -170, -60, 340, 120, 40)
        setc(ctx, WHITE)
        ctx.fill()
        ctx.move_to(-60, 58)
        ctx.line_to(-90, 110)
        ctx.line_to(-10, 58)
        ctx.fill()
        text(ctx, "Tulis di komentar", 0, 0, 34, BLACK)
        ctx.restore()


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items()
             if n.startswith("sc_") and callable(f) and f.__module__ == __name__}

if __name__ == "__main__":
    run(Episode(5, SCENES, SCENE_FNS, HERE / "bekantan_shorts.mp4", voice_spans=VOICE_SPANS, music_key=3))
