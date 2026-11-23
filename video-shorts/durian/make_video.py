#!/usr/bin/env python3
"""Kok Bisa? #3 - Durian, kok baunya nyengat banget?

Pakai:  python3 make_video.py                        -> durian_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> durian_shorts_narasi.mp4
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
    ("hook", "[Durian], kok baunya nyengat banget?"),
    ("tree", "Bayangin kamu sebatang [pohon durian] di hutan Kalimantan."),
    ("seed", "Kamu punya biji, dan biji itu harus pergi [jauh]..."),
    ("grow", "supaya bisa tumbuh jadi pohon baru."),
    ("stuck", "Tapi kamu kan pohon. Kamu [nggak bisa jalan]!"),
    ("need", "Jadi kamu butuh bantuan [hewan hutan]."),
    ("dark", "Masalahnya, hutan itu lebat dan gelap."),
    ("hidden", "Buah yang cuma diam di atas pohon, gampang [nggak ketemu]."),
    ("smell", "Jadi kamu bikin buah dengan bau yang [super kuat]!"),
    ("wind", "Baunya terbawa angin sampai jauh ke dalam hutan."),
    ("animals", "[Orangutan] sampai [beruang madu] datang mencari sumber bau."),
    ("spikes", "Durinya yang tajam melindungi buah sebelum matang."),
    ("fall", "Pas matang, buahnya jatuh dan [terbelah]."),
    ("eat", "Hewan makan dagingnya, lalu bijinya terbawa ke tempat lain."),
    ("new", "Tumbuh deh [pohon durian baru]!"),
    ("chem", "Baunya campuran zat beraroma buah dan zat [belerang], mirip bawang."),
    ("ban", "Saking kuatnya, durian [dilarang] dibawa ke pesawat dan hotel tertentu!"),
    ("summary", "Jadi bau durian bukan kebetulan... tapi [strategi] biar bijinya tersebar!"),
    ("cta", "Mau tahu [Kok Bisa] lainnya? Follow ya!"),
]

# Diisi setelah ada file narasi; None = belum ada narasi.
VOICE_SPANS = None

# ----------------------------------------------------------------- warna --
DUR_G = hexc("#8aa832")
DUR_D = hexc("#5f7a1f")
FLESH = hexc("#ffd85a")
SEED = hexc("#7a4a24")
SMELL = hexc("#c6e04a")
FOREST_D = hexc("#1f4d2a")
ORANG = hexc("#d9692a")

# ------------------------------------------------------------ elemen baru --


def durian(ctx, x, y, s=1.0, open_k=0.0, rot=0.0):
    """Buah durian. (x, y) = pusat."""
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s, s)
    rx, ry = 70, 85
    # duri
    setc(ctx, DUR_D)
    n = 22
    for i in range(n):
        a = i * 2 * math.pi / n
        bx, by = rx * math.cos(a), ry * math.sin(a)
        nx, ny = math.cos(a), math.sin(a)
        ctx.move_to(bx - ny * 12, by + nx * 12)
        ctx.line_to(bx + nx * 26, by + ny * 26)
        ctx.line_to(bx + ny * 12, by - nx * 12)
        ctx.fill()
    ctx.save()
    ctx.scale(1, ry / rx)
    circle(ctx, 0, 0, rx, DUR_G)
    ctx.restore()
    # duri kecil di permukaan
    random.seed(31)
    for i in range(26):
        a = random.uniform(0, 2 * math.pi)
        r = random.uniform(0, 0.8)
        px, py = rx * r * math.cos(a), ry * r * math.sin(a)
        ctx.move_to(px - 7, py + 5)
        ctx.line_to(px, py - 9)
        ctx.line_to(px + 7, py + 5)
        setc(ctx, hexc("#6f8f25"))
        ctx.fill()
    # tangkai
    ctx.rectangle(-6, -ry - 40, 12, 40)
    setc(ctx, hexc("#6b4a2a"))
    ctx.fill()
    if open_k > 0:
        # celah terbelah dengan daging kuning
        w = 34 * open_k
        ctx.move_to(0, -ry + 10)
        ctx.curve_to(w, -30, w, 30, 0, ry - 10)
        ctx.curve_to(-w, 30, -w, -30, 0, -ry + 10)
        setc(ctx, FLESH)
        ctx.fill()
        for yy in (-35, 0, 35):
            circle(ctx, 0, yy, 13 * open_k, hexc("#f2b83a"))
    ctx.restore()


def seed(ctx, x, y, s=1.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s * 0.75)
    circle(ctx, 0, 0, 30, SEED)
    circle(ctx, -9, -9, 9, hexc("#b07a48", 0.8))
    ctx.restore()


def durian_tree(ctx, x, base, s=1.0, t=0.0, face="happy", fruits=True, dark=0.0, h=720):
    """Pohon durian tinggi dengan wajah di batang."""
    top = base - h * s
    ctx.move_to(x - 62 * s, base)
    ctx.line_to(x - 40 * s, top + 60 * s)
    ctx.line_to(x + 40 * s, top + 60 * s)
    ctx.line_to(x + 62 * s, base)
    ctx.close_path()
    setc(ctx, mix(hexc("#7a5532"), hexc("#3d2b1a"), dark))
    ctx.fill()
    # cabang
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, mix(hexc("#6b4a2a"), hexc("#3d2b1a"), dark))
    ctx.set_line_width(16 * s)
    for d, yy in ((-1, 0.32), (1, 0.45), (-1, 0.55)):
        ctx.move_to(x, top + h * s * yy)
        ctx.line_to(x + d * 170 * s, top + h * s * yy - 70 * s)
        ctx.stroke()
    # tajuk
    c1 = mix(hexc("#2f7d3a"), FOREST_D, dark)
    c2 = mix(hexc("#3e9a46"), FOREST_D, dark * 0.8)
    for dx, dy, r, c in [(-170, 60, 120, c1), (170, 70, 120, c1), (0, -10, 150, c2),
                         (-90, -60, 110, c2), (100, -50, 110, c2), (0, 110, 120, c1)]:
        circle(ctx, x + dx * s, top + dy * s, r * s, c)
    if fruits:
        for fx, fy in ((-150, 230), (160, 200), (-40, 260), (70, 300)):
            ctx.move_to(x + fx * s, top + (fy - 70) * s)
            ctx.line_to(x + fx * s, top + (fy - 30) * s)
            setc(ctx, hexc("#4a3020"))
            ctx.set_line_width(5 * s)
            ctx.stroke()
            durian(ctx, x + fx * s + 4 * math.sin(t * 2 + fx) * s, top + fy * s, 0.42 * s)
    if face:
        fy = base - h * s * 0.30
        for d in (-1, 1):
            circle(ctx, x + d * 22 * s, fy, 15 * s, WHITE)
            circle(ctx, x + d * 22 * s, fy + 2 * s, 9 * s, BLACK)
        ctx.set_line_width(7 * s)
        setc(ctx, BLACK)
        if face == "happy":
            ctx.arc(x, fy + 30 * s, 18 * s, 0.2, math.pi - 0.2)
        elif face == "sad":
            ctx.arc(x, fy + 52 * s, 16 * s, math.pi + 0.4, 2 * math.pi - 0.4)
        else:  # kaget
            ctx.arc(x, fy + 40 * s, 11 * s, 0, 2 * math.pi)
        ctx.stroke()


def forest(ctx, t, dark=0.0, rain=0.0):
    sky(ctx, rain)
    ctx.rectangle(0, 0, W, GY)
    setc(ctx, hexc("#0b2414", 0.75 * dark))
    ctx.fill()
    if dark < 0.4:
        sun(ctx, 880, 260, 70, t)
    clouds(ctx, t, max(rain, dark * 0.5))
    random.seed(41)
    for layer in range(3):
        for i in range(9):
            x = random.uniform(-40, W + 40)
            s = 0.9 + layer * 0.35 + random.uniform(0, 0.3)
            jungle_tree(ctx, x, GY - 60 + layer * 40, s, rain=max(rain, dark))
    ground(ctx, rain=rain)
    if dark > 0:
        ctx.rectangle(0, 0, W, H)
        setc(ctx, hexc("#06140b", 0.45 * dark))
        ctx.fill()


def smell_waves(ctx, x, y, t, k=1.0, length=500, direction=-math.pi / 2, n=3, width=12):
    """Garis bau bergelombang."""
    if k <= 0:
        return
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for j in range(n):
        off = (j - (n - 1) / 2) * 50
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(direction + math.pi / 2)
        ctx.move_to(off, 0)
        L = length * k
        for i in range(1, 30):
            yy = -L * i / 29
            ctx.line_to(off + 22 * math.sin(i / 3 - t * 6 + j), yy)
        setc(ctx, hexc("#c6e04a", 0.85))
        ctx.set_line_width(width)
        ctx.stroke()
        ctx.restore()


def orangutan(ctx, x, y, s=1.0, t=0.0, look=1):
    """(x, y) = posisi kaki."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * look, s)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, ORANG)
    ctx.set_line_width(30)
    sw = math.sin(t * 4) * 0.2
    for d in (-1, 1):
        ctx.move_to(d * 40, -150)
        ctx.line_to(d * (110 + 20 * sw * d), -40)
        ctx.stroke()
        ctx.move_to(d * 25, -60)
        ctx.line_to(d * 35, 0)
        ctx.stroke()
    ctx.save()
    ctx.scale(1, 1.15)
    circle(ctx, 0, -110, 70, ORANG)
    ctx.restore()
    circle(ctx, 0, -215, 52, ORANG)
    ctx.save()
    ctx.translate(8, -205)
    ctx.scale(1.25, 1)
    circle(ctx, 0, 0, 34, hexc("#f0b48a"))
    ctx.restore()
    for d in (-1, 1):
        circle(ctx, 8 + d * 15, -218, 6, BLACK)
    ctx.arc(10, -196, 10, 0.2, math.pi - 0.2)
    setc(ctx, hexc("#7a3a1a"))
    ctx.set_line_width(4)
    ctx.stroke()
    ctx.restore()


def sunbear(ctx, x, y, s=1.0, t=0.0, look=1):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * look, s)
    black = hexc("#222222")
    for d in (-1, 1):
        rrect(ctx, d * 55 - 20, -70, 40, 70, 18)
        setc(ctx, black)
        ctx.fill()
    ctx.save()
    ctx.scale(1.3, 1)
    circle(ctx, 0, -110, 75, black)
    ctx.restore()
    # bulan sabit kuning di dada
    ctx.arc(-40, -140, 40, 0.2, math.pi - 0.2)
    setc(ctx, hexc("#f2c94c"))
    ctx.set_line_width(14)
    ctx.stroke()
    circle(ctx, -95, -190, 50, black)
    for d in (-1, 1):
        circle(ctx, -95 + d * 35, -232, 16, black)
    ctx.save()
    ctx.translate(-120, -180)
    ctx.scale(1.2, 0.9)
    circle(ctx, 0, 0, 24, hexc("#c9a36a"))
    ctx.restore()
    circle(ctx, -134, -186, 8, BLACK)
    circle(ctx, -90, -205, 6, WHITE)
    circle(ctx, -90, -205, 3, BLACK)
    ctx.restore()


def no_sign(ctx, x, y, r, k=1.0):
    if k <= 0:
        return
    ctx.save()
    ctx.translate(x, y)
    sc = ease_out_back(k)
    ctx.scale(sc, sc)
    ctx.arc(0, 0, r, 0, 2 * math.pi)
    setc(ctx, RED)
    ctx.set_line_width(r * 0.16)
    ctx.stroke()
    ctx.move_to(-r * 0.7, -r * 0.7)
    ctx.line_to(r * 0.7, r * 0.7)
    ctx.stroke()
    ctx.restore()


def plane(ctx, x, y, s):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    setc(ctx, hexc("#3a6ea5"))
    rrect(ctx, -150, -22, 300, 44, 22)
    ctx.fill()
    ctx.move_to(-20, -10)
    ctx.line_to(40, -110)
    ctx.line_to(70, -110)
    ctx.line_to(50, -10)
    ctx.close_path()
    ctx.fill()
    ctx.move_to(-20, 10)
    ctx.line_to(40, 110)
    ctx.line_to(70, 110)
    ctx.line_to(50, 10)
    ctx.close_path()
    ctx.fill()
    ctx.move_to(-150, 0)
    ctx.line_to(-170, -70)
    ctx.line_to(-130, -70)
    ctx.line_to(-110, -10)
    ctx.close_path()
    ctx.fill()
    ctx.restore()


def hotel(ctx, x, y, s):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.rectangle(-110, -260, 220, 260)
    setc(ctx, hexc("#7a8fb0"))
    ctx.fill()
    setc(ctx, hexc("#ffe9a8"))
    for r in range(4):
        for c in range(3):
            ctx.rectangle(-85 + c * 65, -235 + r * 55, 40, 35)
            ctx.fill()
    rrect(ctx, -120, -320, 240, 56, 14)
    setc(ctx, RED)
    ctx.fill()
    text(ctx, "HOTEL", 0, -292, 40, WHITE)
    ctx.restore()


def molecule(ctx, x, y, s, col, t):
    ctx.save()
    ctx.translate(x, y + 10 * math.sin(t * 2 + x))
    ctx.rotate(t * 0.5 + x)
    ctx.scale(s, s)
    pts = [(0, 0), (60, -30), (-55, -35), (10, 65)]
    setc(ctx, hexc("#ffffff", 0.8))
    ctx.set_line_width(10)
    for p in pts[1:]:
        ctx.move_to(0, 0)
        ctx.line_to(*p)
        ctx.stroke()
    for i, p in enumerate(pts):
        circle(ctx, p[0], p[1], 30 if i == 0 else 20, col if i == 0 else hexc("#dddddd"))
    ctx.restore()


TX = 540  # posisi pohon utama

# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    forest(ctx, t)
    durian(ctx, W / 2, 900, 2.6, open_k=seg(lt, 0.5, 1.4))
    smell_waves(ctx, W / 2, 620, t, seg(lt, 0.3, 1.3), length=380)
    kid(ctx, 900, GY + 10, 1.0, t, "worried", look=-1)
    # tangan menutup hidung
    for i, (x, y) in enumerate([(200, 700), (850, 620)]):
        qmark(ctx, x, y, 110, t, seg(lt, 0.8 + i * 0.3, 1.1 + i * 0.3))


def sc_tree(ctx, lt, d, t):
    forest(ctx, t)
    k = seg(lt, 0, d * 0.6)
    ctx.save()
    ctx.translate(TX, GY)
    ctx.scale(0.4 + 0.6 * ease_out_back(k), 0.4 + 0.6 * ease_out_back(k))
    ctx.translate(-TX, -GY)
    durian_tree(ctx, TX, GY + 10, 1.0, t)
    ctx.restore()
    label_chip(ctx, "Pohon durian", TX, 420, 48, hexc("#2f7d3a"), k=seg(lt, d * 0.5, d * 0.65))


def sc_seed(ctx, lt, d, t):
    forest(ctx, t)
    durian_tree(ctx, TX, GY + 10, 1.0, t)
    k = seg(lt, 0.3, d * 0.8)
    seed(ctx, TX + 60 + 300 * k, 1150 - 120 * math.sin(k * math.pi), 2.0)
    arrow_flow(ctx, [(TX + 120, 1250), (TX + 260, 1250), (TX + 380, 1250), (TX + 470, 1250)], t, WHITE, 12)
    arrowhead(ctx, TX + 490, 1250, 0, 30, WHITE)
    label_chip(ctx, "Biji", TX + 60 + 300 * k, 980, 44, SEED, k=seg(lt, 0.4, 0.8))


def sc_grow(ctx, lt, d, t):
    forest(ctx, t)
    durian_tree(ctx, 230, GY + 10, 0.8, t)
    seed(ctx, 780, GY + 20, 1.5)
    k = seg(lt, 0.2, d * 0.9)
    if k > 0:
        h = 40 + 320 * k
        ctx.move_to(780, GY + 10)
        ctx.line_to(780, GY - h)
        setc(ctx, hexc("#3f9a3a"))
        ctx.set_line_width(14)
        ctx.stroke()
        for i in range(int(1 + 4 * k)):
            yy = GY - 40 - i * 70
            for dd in (-1, 1):
                ctx.save()
                ctx.translate(780, yy)
                ctx.scale(dd, 1)
                ctx.move_to(0, 0)
                ctx.curve_to(40, -40, 90, -20, 100, 0)
                ctx.curve_to(80, 20, 30, 20, 0, 0)
                setc(ctx, hexc("#4fb84a"))
                ctx.fill()
                ctx.restore()


def sc_stuck(ctx, lt, d, t):
    forest(ctx, t)
    wob = math.sin(t * 10) * 0.03 * seg(lt, 0.3, 0.6)
    ctx.save()
    ctx.translate(TX, GY)
    ctx.rotate(wob)
    ctx.translate(-TX, -GY)
    durian_tree(ctx, TX, GY + 10, 1.0, t, face="sad")
    ctx.restore()
    # akar tertancap
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(6):
        a = math.pi * (0.15 + i * 0.14)
        ctx.move_to(TX, GY + 10)
        ctx.line_to(TX + 150 * math.cos(a), GY + 10 + 120 * math.sin(a))
        setc(ctx, hexc("#6b4a2a"))
        ctx.set_line_width(14)
        ctx.stroke()
    check(ctx, TX + 260, 900, 70, seg(lt, d * 0.5, d * 0.62), ok=False)


def sc_need(ctx, lt, d, t):
    forest(ctx, t)
    durian_tree(ctx, 300, GY + 10, 0.85, t, face="happy")
    k = seg(lt, 0.3, d * 0.9)
    orangutan(ctx, 1200 - 380 * k, GY + 10, 0.9, t, look=-1)
    label_chip(ctx, "Tolong ya!", 300, 520, 46, hexc("#2f7d3a"), k=seg(lt, 0.3, 0.6))


def sc_dark(ctx, lt, d, t):
    forest(ctx, t, dark=seg(lt, 0, d * 0.7))
    durian_tree(ctx, TX, GY + 10, 1.0, t, face="sad", dark=seg(lt, 0, d * 0.7))


def sc_hidden(ctx, lt, d, t):
    forest(ctx, t, dark=1.0)
    durian_tree(ctx, 300, GY + 10, 0.9, t, face="sad", dark=1.0)
    orangutan(ctx, 820, GY + 10, 0.9, t, look=1)
    for i, (x, y) in enumerate([(820, 860), (900, 800)]):
        qmark(ctx, x, y, 90, t, seg(lt, 0.5 + i * 0.3, 0.8 + i * 0.3))


def sc_smell(ctx, lt, d, t):
    forest(ctx, t, dark=0.6)
    durian_tree(ctx, TX, GY + 10, 1.0, t, face="happy", dark=0.4)
    k = seg(lt, 0.3, d * 0.9)
    for fx, fy in ((-150, 230), (160, 200), (-40, 260), (70, 300)):
        smell_waves(ctx, TX + fx, GY + 10 - 720 + fy - 40, t, k, length=260, n=1, width=10)
    label_chip(ctx, "BAU KUAT!", TX, 400, 64, hexc("#7a8f1f"), k=seg(lt, d * 0.5, d * 0.65))


def sc_wind(ctx, lt, d, t):
    forest(ctx, t, dark=0.4)
    durian_tree(ctx, 200, GY + 10, 0.8, t, face="happy", dark=0.3)
    k = seg(lt, 0, d * 0.8)
    for i, y in enumerate((700, 860, 1020)):
        smell_waves(ctx, 260, y, t + i, k, length=900, direction=0, n=1, width=14)
    for i, y in enumerate((620, 780, 940)):
        arrow_flow(ctx, [(300, y), (500, y - 30), (800, y + 30), (1100, y)], t + i * 0.3, hexc("#ffffff", 0.7), 8)
    label_chip(ctx, "Terbawa angin", 640, 460, 46, hexc("#3a6ea5"), k=seg(lt, 0.4, 0.8))


def sc_animals(ctx, lt, d, t):
    forest(ctx, t, dark=0.2)
    durian_tree(ctx, TX, GY + 10, 1.0, t, face="happy")
    k = seg(lt, 0.1, d * 0.7)
    orangutan(ctx, -150 + 400 * k, GY + 10, 0.85, t, look=1)
    sunbear(ctx, 1250 - 330 * k, GY + 10, 0.85, t, look=1)
    label_chip(ctx, "Orangutan", -150 + 400 * k, GY + 90, 38, ORANG, k=seg(lt, d * 0.5, d * 0.65))
    label_chip(ctx, "Beruang madu", 1250 - 330 * k - 60, GY + 90, 38, hexc("#333333"), k=seg(lt, d * 0.6, d * 0.75))


def sc_spikes(ctx, lt, d, t):
    forest(ctx, t)
    z = 1 + 0.15 * math.sin(lt * 2)
    durian(ctx, W / 2, 880, 3.2 * z)
    # kilau di ujung duri
    for i in range(5):
        a = i * 1.3 + t
        x = W / 2 + 270 * math.cos(a)
        y = 880 + 320 * math.sin(a)
        circle(ctx, x, y, 9 + 5 * math.sin(t * 8 + i), hexc("#ffffff", 0.9))
    label_chip(ctx, "Pelindung!", W / 2, 420, 52, hexc("#5f7a1f"), k=seg(lt, 0.4, 0.8))


def sc_fall(ctx, lt, d, t):
    forest(ctx, t)
    durian_tree(ctx, 300, GY + 10, 0.9, t, face="happy", fruits=False)
    k = seg(lt, 0.2, d * 0.45)
    y = 760 + (GY - 60 - 760) * k * k
    durian(ctx, 640, y, 1.5, open_k=seg(lt, d * 0.5, d * 0.75), rot=0.3 * k)
    if k >= 1:
        for i in range(6):
            a = -math.pi * (0.1 + i * 0.16)
            r = 120 * seg(lt, d * 0.45, d * 0.6)
            circle(ctx, 640 + r * math.cos(a) * 1.6, GY - 30 + r * math.sin(a) * 0.5, 8, hexc("#d9c4a0", 0.8))


def sc_eat(ctx, lt, d, t):
    forest(ctx, t)
    durian(ctx, 420, GY - 60, 1.5, open_k=1.0)
    k = seg(lt, d * 0.4, d)
    orangutan(ctx, 600 + 400 * k, GY + 10, 0.85, t, look=1)
    seed(ctx, 640 + 400 * k, 1040, 1.0)
    if k > 0.9:
        seed(ctx, 980, GY + 20, 1.2)


def sc_new(ctx, lt, d, t):
    forest(ctx, t)
    durian_tree(ctx, 230, GY + 10, 0.7, t, face="happy")
    k = seg(lt, 0, d * 0.8)
    ctx.save()
    ctx.translate(780, GY + 10)
    ctx.scale(0.15 + 0.6 * k, 0.15 + 0.6 * k)
    ctx.translate(-780, -(GY + 10))
    durian_tree(ctx, 780, GY + 10, 1.0, t, face="happy", fruits=k > 0.8)
    ctx.restore()
    check(ctx, 780, 520, 70, seg(lt, d * 0.75, d * 0.88))


def sc_chem(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#2b3a55"))
    g.add_color_stop_rgba(1, *hexc("#1a2233"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    durian(ctx, W / 2, 1150, 1.6, open_k=1.0)
    smell_waves(ctx, W / 2, 1000, t, 1.0, length=200)
    k1 = seg(lt, 0.2, 0.6)
    k2 = seg(lt, d * 0.45, d * 0.6)
    if k1 > 0:
        for i, (x, y) in enumerate([(220, 560), (330, 800)]):
            molecule(ctx, x, y, ease_out_back(k1), hexc("#ff8a3d"), t + i)
        label_chip(ctx, "Aroma buah", 270, 380, 44, hexc("#ff8a3d"), k=k1)
    if k2 > 0:
        for i, (x, y) in enumerate([(850, 560), (760, 800)]):
            molecule(ctx, x, y, ease_out_back(k2), hexc("#f2d21b"), t + i)
        label_chip(ctx, "Belerang", 820, 380, 44, hexc("#b59a00"), k=k2)
    text(ctx, "+", W / 2, 640, 120, WHITE)


def sc_ban(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#9fd8ff"))
    g.add_color_stop_rgba(1, *hexc("#e9f7ff"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    k1 = seg(lt, 0.2, 0.7)
    k2 = seg(lt, d * 0.4, d * 0.55)
    ctx.save()
    ctx.translate(290, 620)
    plane(ctx, 0, 0, 0.9 * ease_out_back(k1))
    ctx.restore()
    durian(ctx, 290, 900, 0.8)
    no_sign(ctx, 290, 900, 110, seg(lt, 0.6, 1.0))
    if k2 > 0:
        hotel(ctx, 790, 820, 0.9 * ease_out_back(k2))
    durian(ctx, 790, 1000, 0.8)
    no_sign(ctx, 790, 1000, 110, seg(lt, d * 0.5, d * 0.65))
    label_chip(ctx, "Dilarang bawa durian", W / 2, 1220, 48, RED, k=seg(lt, d * 0.6, d * 0.75))


def sc_summary(ctx, lt, d, t):
    forest(ctx, t)
    ctx.rectangle(0, 0, W, H)
    setc(ctx, hexc("#000000", 0.35))
    ctx.fill()
    text(ctx, "Strategi Durian", W / 2, 300, 84, YELLOW, stroke=BLACK, sw=12)
    items = [("Bau kuat menyebar", hexc("#7a8f1f")), ("Hewan datang & makan", ORANG),
             ("Biji tersebar jauh", SEED)]
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


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items() if n.startswith("sc_") and callable(f)}

if __name__ == "__main__":
    run(Episode(3, SCENES, SCENE_FNS, HERE / "durian_shorts.mp4", voice_spans=VOICE_SPANS, music_key=-3))
