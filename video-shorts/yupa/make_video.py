#!/usr/bin/env python3
"""Kok Bisa? #6 - Prasasti Yupa: kok tulisan tertua di Indonesia ada di Kaltim? (versi 2D)

Fakta: Wikipedia ID "Prasasti Mulawarman" (mengutip Direktorat Pelindungan Kebudayaan 2019
dan Museum Nasional), Wikipedia EN "Mulavarman" (mengutip Vogel 1918), Antara Kaltim
"Museum Mulawarman narator hidup sejarah dan budaya Kaltim".

Pakai:  python3 make_video.py                        -> yupa_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> yupa_shorts_narasi.mp4
        python3 make_video.py --preview preview.png  -> contact sheet untuk dicek
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

# ----------------------------------------------------------------- naskah --
SCENES = [
    ("hook", "Kok bisa, prasasti tertua yang pernah ditemukan di Indonesia ada di [Kalimantan Timur]?"),
    ("place", "Namanya [prasasti Yupa]: tujuh tugu batu dari Muara Kaman, di tepi Sungai Mahakam."),
    ("script", "Tulisannya memakai huruf [Pallawa] dan bahasa [Sanskerta], dari sekitar abad keempat atau kelima Masehi."),
    ("king", "Isinya? Kisah seorang raja bernama [Mulawarman]."),
    ("tree", "Kakeknya bernama Kundungga, dan ayahnya Aswawarman."),
    ("cows", "Prasasti menyebut Mulawarman menyedekahkan [dua puluh ribu] ekor sapi kepada kaum Brahmana!"),
    ("erect", "Para Brahmana lalu mendirikan tugu batu ini untuk mengenang kebaikan sang raja."),
    ("found", "Empat yupa ditemukan tahun [1879], dan tiga lagi tahun [1940]."),
    ("museum", "Yang asli kini disimpan di [Museum Nasional], Jakarta."),
    ("replica", "Replikanya bisa kamu lihat di [Museum Mulawarman], Tenggarong."),
    ("india", "Prasasti ini bukti budaya India sudah sampai ke Kalimantan lebih dari [1.500 tahun] lalu."),
    ("end", "Pernah lihat prasasti Yupa langsung? Ceritakan di komentar, dan follow [Kok Bisa] Kaltim!"),
]

VOICE_SPANS = None

# ----------------------------------------------------------------- warna --
STONE = hexc("#a39e94")
STONE_D = hexc("#7d786f")
STONE_L = hexc("#c9c4ba")
GOLD = hexc("#f2b21b")
ROBE = hexc("#f4efe2")
SKIN2 = hexc("#c98d5e")

# ------------------------------------------------------------ elemen baru --


def yupa_stone(ctx, x, y, s=1.0, glow=0.0, carve=1.0, t=0.0):
    """Tugu batu yupa. (x, y) = dasar tugu."""
    w, h = 110 * s, 420 * s
    if glow > 0:
        for i in range(5, 0, -1):
            rrect(ctx, x - w / 2 - i * 14, y - h - i * 14, w + i * 28, h + i * 18, w / 2 + i * 14)
            setc(ctx, hexc("#ffe27a", 0.08 * glow))
            ctx.fill()
    ctx.move_to(x - w / 2, y)
    ctx.line_to(x - w / 2 + 6 * s, y - h + w / 2)
    ctx.curve_to(x - w / 2 + 6 * s, y - h - 20 * s, x + w / 2 - 6 * s, y - h - 20 * s, x + w / 2 - 6 * s, y - h + w / 2)
    ctx.line_to(x + w / 2, y)
    ctx.close_path()
    g = cairo.LinearGradient(x - w / 2, 0, x + w / 2, 0)
    g.add_color_stop_rgba(0, *STONE_D)
    g.add_color_stop_rgba(0.45, *STONE_L)
    g.add_color_stop_rgba(1, *STONE_D)
    ctx.set_source(g)
    ctx.fill()
    # pahatan aksara (ilustrasi, bukan aksara sebenarnya)
    if carve > 0:
        setc(ctx, hexc("#4f4a43", 0.75))
        ctx.set_line_width(3.2 * s)
        rows = int(9 * carve)
        random.seed(int(x))
        for r in range(rows):
            yy = y - h + 70 * s + r * 34 * s
            xx = x - w / 2 + 18 * s
            while xx < x + w / 2 - 22 * s:
                kind = random.randint(0, 3)
                if kind == 0:
                    ctx.rectangle(xx, yy - 8 * s, 10 * s, 10 * s)
                elif kind == 1:
                    ctx.move_to(xx, yy)
                    ctx.curve_to(xx + 4 * s, yy - 12 * s, xx + 10 * s, yy - 12 * s, xx + 12 * s, yy)
                elif kind == 2:
                    ctx.move_to(xx + 6 * s, yy - 12 * s)
                    ctx.line_to(xx + 6 * s, yy + 4 * s)
                    ctx.move_to(xx, yy - 12 * s)
                    ctx.line_to(xx + 12 * s, yy - 12 * s)
                else:
                    ctx.arc(xx + 6 * s, yy - 4 * s, 5 * s, 0, 2 * math.pi)
                ctx.stroke()
                xx += 17 * s


def person(ctx, x, yf, s=1.0, robe=ROBE, crown=False, t=0.0, arms_up=0.0, look=1):
    """Tokoh sederhana bergaya siluet lembut. yf = posisi kaki."""
    ctx.save()
    ctx.translate(x, yf)
    ctx.scale(s * look, s)
    # jubah
    ctx.move_to(-45, 0)
    ctx.line_to(-30, -150)
    ctx.curve_to(-25, -175, 25, -175, 30, -150)
    ctx.line_to(45, 0)
    ctx.close_path()
    setc(ctx, robe)
    ctx.fill()
    # lengan
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, SKIN2)
    ctx.set_line_width(12)
    for d in (-1, 1):
        ctx.move_to(d * 26, -150)
        ctx.line_to(d * (40 + 10 * arms_up), -100 - 70 * arms_up)
        ctx.stroke()
    circle(ctx, 0, -195, 30, SKIN2)
    circle(ctx, 8, -198, 3.5, BLACK)
    if crown:
        ctx.move_to(-28, -215)
        for i in range(5):
            ctx.line_to(-28 + i * 14, -250 if i % 2 == 0 else -228)
        ctx.line_to(28, -215)
        ctx.close_path()
        setc(ctx, GOLD)
        ctx.fill()
        circle(ctx, 0, -236, 5, RED)
    ctx.restore()


def cow(ctx, x, y, s=1.0, t=0.0):
    ctx.save()
    ctx.translate(x, y + 3 * math.sin(t * 8))
    ctx.scale(s, s)
    rrect(ctx, -60, -60, 120, 55, 26)
    setc(ctx, hexc("#e9d8c0"))
    ctx.fill()
    circle(ctx, 70, -55, 24, hexc("#e9d8c0"))
    ctx.move_to(62, -78)
    ctx.line_to(56, -98)
    ctx.move_to(80, -78)
    ctx.line_to(88, -98)
    setc(ctx, hexc("#8a7a60"))
    ctx.set_line_width(5)
    ctx.stroke()
    circle(ctx, 76, -58, 3.5, BLACK)
    setc(ctx, hexc("#b9a37f"))
    ctx.set_line_width(9)
    sw = 8 * math.sin(t * 8)
    for lx in (-40, -15, 20, 45):
        ctx.move_to(lx, -10)
        ctx.line_to(lx + (sw if lx % 2 else -sw), 22)
        ctx.stroke()
    ctx.restore()


def museum_building(ctx, x, yb, s=1.0, name="", sub=""):
    ctx.save()
    ctx.translate(x, yb)
    ctx.scale(s, s)
    ctx.rectangle(-330, -260, 660, 260)
    setc(ctx, hexc("#f3efe6"))
    ctx.fill()
    ctx.move_to(-370, -260)
    ctx.line_to(0, -400)
    ctx.line_to(370, -260)
    ctx.close_path()
    setc(ctx, hexc("#d9d2c4"))
    ctx.fill()
    for i in range(6):
        ctx.rectangle(-290 + i * 110, -250, 34, 250)
        setc(ctx, WHITE)
        ctx.fill()
    ctx.rectangle(-390, -10, 780, 24)
    setc(ctx, hexc("#bdb5a5"))
    ctx.fill()
    ctx.restore()
    if name:
        label_chip(ctx, name, x, yb - 470 * s, 50, hexc("#3a3f6b"))
    if sub:
        label_chip(ctx, sub, x, yb - 380 * s, 36, YELLOW, BLACK)


def history_world(ctx, t, warm=0.0):
    g = cairo.LinearGradient(0, 0, 0, GY)
    g.add_color_stop_rgba(0, *mix(hexc("#5fb7e8"), hexc("#f2a65a"), warm))
    g.add_color_stop_rgba(1, *mix(hexc("#d9f1ff"), hexc("#ffe1b0"), warm))
    ctx.rectangle(0, 0, W, GY + 5)
    ctx.set_source(g)
    ctx.fill()
    sun(ctx, 860, 280, 70, t)
    clouds(ctx, t)
    hills(ctx)
    for x, s in [(80, 0.9), (190, 0.7), (960, 1.0)]:
        jungle_tree(ctx, x, GY - 20, s)
    ground(ctx)


def parchment(ctx):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#f3e2bf"))
    g.add_color_stop_rgba(1, *hexc("#e2c48f"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    random.seed(12)
    for i in range(60):
        circle(ctx, random.uniform(0, W), random.uniform(0, H), random.uniform(4, 16), hexc("#c9a46a", 0.18))


# ----------------------------------------------------------------- adegan --


def sc_hook(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#1f2a44"))
    g.add_color_stop_rgba(1, *hexc("#3a2a1a"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    k = seg(lt, 0, 1.0)
    yupa_stone(ctx, W / 2, 1380, 2.0 + 0.1 * lt / d, glow=k, carve=1.0, t=t)
    for i, (x, y) in enumerate([(200, 560), (880, 520), (820, 900)]):
        qmark(ctx, x, y, 120 - i * 15, t, seg(lt, 0.6 + i * 0.25, 0.9 + i * 0.25))
    label_chip(ctx, "Prasasti tertua di Indonesia", W / 2, 360, 46, GOLD, BLACK, k=seg(lt, 0.4, 0.9))


def sc_place(ctx, lt, d, t):
    history_world(ctx, t)
    # sungai di depan
    water(ctx, GY + 140, t, 0, W)
    xs = [190, 300, 410, 540, 670, 780, 890]
    for i, x in enumerate(xs):
        k = seg(lt, 0.2 + i * 0.25, 0.5 + i * 0.25)
        if k <= 0:
            continue
        ctx.save()
        ctx.translate(0, (1 - ease_out_back(k)) * 200)
        yupa_stone(ctx, x, GY + 20, 0.48 + 0.04 * (i % 3), carve=0.7, t=t)
        ctx.restore()
    label_chip(ctx, "Muara Kaman, tepi Sungai Mahakam", W / 2, 560, 42, hexc("#9b6a35"), k=seg(lt, 0.5, 0.9))
    label_chip(ctx, "7 yupa", W / 2, 680, 56, hexc("#3a3f6b"), k=seg(lt, d * 0.6, d * 0.75))


def sc_script(ctx, lt, d, t):
    parchment(ctx)
    yupa_stone(ctx, 340, 1380, 1.9, carve=seg(lt, 0, d * 0.6), t=t)
    label_chip(ctx, "Aksara Pallawa", 760, 620, 46, hexc("#9b6a35"), k=seg(lt, 0.3, 0.7))
    label_chip(ctx, "Bahasa Sanskerta", 760, 780, 46, hexc("#3a6ea5"), k=seg(lt, d * 0.35, d * 0.5))
    label_chip(ctx, "± abad ke-4–5 M", 760, 940, 46, hexc("#2f7d3a"), k=seg(lt, d * 0.6, d * 0.75))
    text(ctx, "(gambar aksara hanya ilustrasi)", 340, 1430, 28, hexc("#6b5a3a"), bold=False)


def sc_king(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#f7c873"))
    g.add_color_stop_rgba(1, *hexc("#e0893b"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    ctx.save()
    ctx.translate(W / 2, 900)
    ctx.rotate(t * 0.15)
    for i in range(16):
        ctx.move_to(0, 0)
        ctx.arc(0, 0, 1300, i * math.pi / 8, i * math.pi / 8 + math.pi / 16)
        ctx.close_path()
        setc(ctx, hexc("#ffffff", 0.1))
        ctx.fill()
    ctx.restore()
    k = seg(lt, 0.1, 0.7)
    ctx.save()
    ctx.translate(0, (1 - ease_out_back(k)) * 400)
    person(ctx, W / 2, 1320, 3.0, robe=hexc("#c0392b"), crown=True, t=t)
    ctx.restore()
    label_chip(ctx, "Raja Mulawarman", W / 2, 420, 60, hexc("#7a1f12"), k=seg(lt, d * 0.4, d * 0.6))
    text(ctx, "(ilustrasi)", W / 2, 520, 30, hexc("#7a1f12"), bold=False)


def sc_tree(ctx, lt, d, t):
    parchment(ctx)
    nodes = [("Kundungga", "kakek", 520), ("Aswawarman", "ayah", 820), ("Mulawarman", "raja", 1120)]
    for i, (name, role, y) in enumerate(nodes):
        k = seg(lt, 0.2 + i * d * 0.25, 0.5 + i * d * 0.25)
        if k <= 0:
            continue
        sc = ease_out_back(k)
        ctx.save()
        ctx.translate(W / 2, y)
        ctx.scale(sc, sc)
        rrect(ctx, -300, -80, 600, 160, 40)
        setc(ctx, WHITE)
        ctx.fill()
        rrect(ctx, -300, -80, 600, 160, 40)
        setc(ctx, hexc("#9b6a35"))
        ctx.set_line_width(6)
        ctx.stroke()
        text(ctx, name, 0, -14, 64, hexc("#3a2a1a"))
        text(ctx, role, 0, 46, 34, hexc("#9b6a35"), bold=False)
        if i == 2:
            ctx.move_to(-28, -150)
            for j in range(5):
                ctx.line_to(-28 + j * 14, -185 if j % 2 == 0 else -163)
            ctx.line_to(28, -150)
            ctx.close_path()
            setc(ctx, GOLD)
            ctx.fill()
        ctx.restore()
        if i > 0:
            ctx.move_to(W / 2, nodes[i - 1][2] + 85)
            ctx.line_to(W / 2, y - 85 - (40 if i == 2 else 0))
            setc(ctx, hexc("#9b6a35"))
            ctx.set_line_width(8)
            ctx.stroke()


def sc_cows(ctx, lt, d, t):
    history_world(ctx, t)
    for row in range(3):
        for i in range(7):
            x = (i * 220 + row * 90 + lt * 160) % (W + 300) - 150
            cow(ctx, x, GY + 120 + row * 110, 0.8, t + i + row)
    n = int(20000 * seg(lt, 0.3, d * 0.7))
    txt = f"{n:,}".replace(",", ".")
    text(ctx, txt, W / 2, 560, 170, WHITE, stroke=BLACK, sw=18)
    label_chip(ctx, "ekor sapi", W / 2, 720, 54, hexc("#9b6a35"), k=seg(lt, 0.4, 0.8))


def sc_erect(ctx, lt, d, t):
    history_world(ctx, t, warm=0.6)
    k = seg(lt, 0.2, d * 0.7)
    ang = (1 - k) * -1.2
    ctx.save()
    ctx.translate(W / 2, GY + 20)
    ctx.rotate(ang)
    ctx.translate(-W / 2, -(GY + 20))
    yupa_stone(ctx, W / 2, GY + 20, 1.2, carve=1.0, t=t)
    ctx.restore()
    for i, x in enumerate((230, 370, 710, 850)):
        person(ctx, x, GY + 40, 1.3, robe=ROBE, t=t, arms_up=0.5 + 0.5 * math.sin(t * 3 + i), look=1 if x < W / 2 else -1)
    label_chip(ctx, "Didirikan para Brahmana", W / 2, 420, 48, hexc("#3a3f6b"), k=seg(lt, d * 0.5, d * 0.65))


def sc_found(ctx, lt, d, t):
    parchment(ctx)
    # garis waktu
    ctx.move_to(120, 1180)
    ctx.line_to(960, 1180)
    setc(ctx, hexc("#9b6a35"))
    ctx.set_line_width(10)
    ctx.stroke()
    for (x, yr, n, a, b) in [(300, "1879", 4, 0.2, 0.9), (780, "1940", 3, d * 0.45, d * 0.65)]:
        k = seg(lt, a, b)
        if k <= 0:
            continue
        circle(ctx, x, 1180, 22, hexc("#9b6a35"))
        text(ctx, yr, x, 1270, 72, hexc("#3a2a1a"))
        for j in range(n):
            ctx.save()
            ctx.translate(0, (1 - ease_out_back(k)) * 200)
            yupa_stone(ctx, x - (n - 1) * 45 + j * 90, 1120, 0.5, carve=0.6, t=t)
            ctx.restore()
        label_chip(ctx, f"{n} yupa", x, 600, 46, hexc("#3a3f6b"), k=k)


def sc_museum(ctx, lt, d, t):
    history_world(ctx, t)
    museum_building(ctx, W / 2, GY + 10, 1.15, "Museum Nasional, Jakarta", "Yupa asli")
    yupa_stone(ctx, W / 2, GY - 10, 0.55, glow=0.6 + 0.4 * math.sin(t * 2), carve=0.7, t=t)


def sc_replica(ctx, lt, d, t):
    history_world(ctx, t, warm=0.3)
    museum_building(ctx, W / 2, GY + 10, 1.15, "Museum Mulawarman, Tenggarong", "Replika yupa")
    for i, x in enumerate((420, 540, 660)):
        yupa_stone(ctx, x, GY - 10, 0.42, carve=0.6, t=t)


def sc_india(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#7fd0ff"))
    g.add_color_stop_rgba(1, *hexc("#2a7bbf"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    # pulau-pulau sederhana (bukan peta presisi)
    blobs = [("India", 250, 520, 150, 190), ("Kalimantan", 760, 980, 190, 170)]
    for name, x, y, rx, ry in blobs:
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(rx / 100, ry / 100)
        circle(ctx, 0, 0, 100, hexc("#7fb77e"))
        ctx.restore()
        label_chip(ctx, name, x, y, 40, hexc("#2f5d3a"))
    k = seg(lt, 0.2, d * 0.8)
    pts = [(330, 640), (420, 760), (580, 860), (680, 930)]
    arrow_flow(ctx, pts, t, WHITE, 10, dash=40)
    bx = pts[0][0] + (pts[3][0] - pts[0][0]) * k
    by = pts[0][1] + (pts[3][1] - pts[0][1]) * k
    ctx.save()
    ctx.translate(bx, by + 5 * math.sin(t * 3))
    ctx.move_to(-50, 0)
    ctx.line_to(50, 0)
    ctx.line_to(35, 22)
    ctx.line_to(-35, 22)
    ctx.close_path()
    setc(ctx, hexc("#7a4a24"))
    ctx.fill()
    ctx.move_to(0, 0)
    ctx.line_to(0, -70)
    ctx.line_to(40, -10)
    ctx.close_path()
    setc(ctx, WHITE)
    ctx.fill()
    ctx.restore()
    label_chip(ctx, "> 1.500 tahun lalu", W / 2, 1260, 54, GOLD, BLACK, k=seg(lt, d * 0.5, d * 0.65))


def sc_end(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#1f2a44"))
    g.add_color_stop_rgba(1, *hexc("#3a2a1a"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    for i, x in enumerate((300, 540, 780)):
        yupa_stone(ctx, x, 1300, 0.9, glow=0.4, carve=0.8, t=t)
    kc = seg(lt, d * 0.2, d * 0.4)
    if kc > 0:
        ctx.save()
        ctx.translate(W / 2, 500)
        ctx.scale(ease_out_back(kc), ease_out_back(kc))
        rrect(ctx, -280, -70, 560, 140, 44)
        setc(ctx, WHITE)
        ctx.fill()
        ctx.move_to(-80, 68)
        ctx.line_to(-110, 120)
        ctx.line_to(-30, 68)
        ctx.fill()
        text(ctx, "Pernah lihat langsung?", 0, 0, 40, BLACK)
        ctx.restore()


SCENE_FNS = {n[3:]: f for n, f in dict(globals()).items()
             if n.startswith("sc_") and callable(f) and f.__module__ == __name__}

if __name__ == "__main__":
    run(Episode(6, SCENES, SCENE_FNS, HERE / "yupa_shorts.mp4", voice_spans=VOICE_SPANS, music_key=-5))
