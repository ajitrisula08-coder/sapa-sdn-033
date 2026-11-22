#!/usr/bin/env python3
"""Mesin video Shorts seri "Kok Bisa?" (1080x1920, 30 fps).

Semua gambar digambar dengan kode (pycairo) dan musik disintesis sendiri (numpy),
jadi tidak ada aset berhak cipta pihak lain. Tiap episode punya file sendiri
yang berisi naskah (SCENES) + fungsi adegan, lalu memanggil run(...).
"""
import math
import random
import subprocess
import sys
import wave
from pathlib import Path

import cairo
import numpy as np

W, H, FPS = 1080, 1920, 30
GY = 1330  # garis tanah
FONT = "Inter"


def tokens(line):
    out = []
    hl = False
    for raw in line.split():
        w = raw
        start = w.startswith("[")
        if start:
            w = w[1:]
            hl = True
        end = "]" in w
        w = w.replace("]", "")
        out.append((w, hl))
        if end:
            hl = False
    return out


def scene_duration(line):
    n = len(tokens(line))
    return max(3.2, n / 2.5 + 0.9)


def chunk_words(toks):
    chunks, cur = [], []
    for w, hl in toks:
        cur.append((w, hl))
        text = " ".join(x for x, _ in cur)
        if len(cur) >= 3 or len(text) >= 13 or w[-1] in ",.!?":
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


# ---------------------------------------------------------------- helpers --


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out_back(x):
    x = clamp(x)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def seg(t, a, b):
    return ease((t - a) / (b - a)) if b > a else float(t >= a)


def hexc(h, a=1.0):
    h = h.lstrip("#")
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)


def mix(c1, c2, k):
    return tuple(c1[i] + (c2[i] - c1[i]) * k for i in range(4))


def setc(ctx, c):
    ctx.set_source_rgba(*c)


def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    ctx.close_path()


def circle(ctx, x, y, r, c):
    ctx.arc(x, y, r, 0, 2 * math.pi)
    setc(ctx, c)
    ctx.fill()


def text(ctx, s, x, y, size, color, align="center", stroke=None, sw=0, bold=True):
    ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL,
                         cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    ext = ctx.text_extents(s)
    if align == "center":
        tx = x - ext.width / 2 - ext.x_bearing
    elif align == "left":
        tx = x
    else:
        tx = x - ext.x_advance
    ty = y - ext.height / 2 - ext.y_bearing
    ctx.move_to(tx, ty)
    ctx.text_path(s)
    if stroke:
        setc(ctx, stroke)
        ctx.set_line_width(sw)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.stroke_preserve()
    setc(ctx, color)
    ctx.fill()
    return ext.x_advance


def text_width(ctx, s, size):
    ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(size)
    return ctx.text_extents(s).x_advance


# ----------------------------------------------------------------- palette --
SKY_TOP = hexc("#5fb7e8")
SKY_BOT = hexc("#d9f1ff")
RAIN_TOP = hexc("#5d6b7a")
RAIN_BOT = hexc("#a9b6c2")
GRASS = hexc("#6cb33f")
GRASS_D = hexc("#4f8f2b")
SOIL = hexc("#9a6a3c")
SOIL_D = hexc("#7a4f2a")
WATER = hexc("#8a7a52", 0.92)    # air sungai kecokelatan
WATER_TOP = hexc("#b7a676", 0.95)
WOOD = hexc("#c98b4b")
WOOD_D = hexc("#9b6330")
WOOD_L = hexc("#e0a96a")
ULIN = hexc("#4b3022")
ROOF = hexc("#7a3b2a")
ROOF_D = hexc("#5c2a1e")
WHITE = hexc("#ffffff")
BLACK = hexc("#141414")
YELLOW = hexc("#ffd23f")
RED = hexc("#e5484d")
GREEN = hexc("#2fb463")
BLUE = hexc("#3aa0ff")
SKIN = hexc("#f1c27d")
SHIRT = hexc("#1f9e9a")

# ------------------------------------------------------------ backgrounds --


def sky(ctx, rain=0.0, night=0.0):
    g = cairo.LinearGradient(0, 0, 0, GY)
    top = mix(SKY_TOP, RAIN_TOP, rain)
    bot = mix(SKY_BOT, RAIN_BOT, rain)
    g.add_color_stop_rgba(0, *top)
    g.add_color_stop_rgba(1, *bot)
    ctx.rectangle(0, 0, W, GY + 5)
    ctx.set_source(g)
    ctx.fill()


def sun(ctx, x, y, r, t, glow=1.0):
    for i in range(4, 0, -1):
        circle(ctx, x, y, r + i * 26 * glow, hexc("#ffe27a", 0.10))
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 0.3)
    setc(ctx, hexc("#ffcf3a"))
    for i in range(12):
        ctx.save()
        ctx.rotate(i * math.pi / 6)
        ctx.move_to(r + 12, -10)
        ctx.line_to(r + 46 + 8 * math.sin(t * 4 + i), 0)
        ctx.line_to(r + 12, 10)
        ctx.fill()
        ctx.restore()
    ctx.restore()
    circle(ctx, x, y, r, hexc("#ffd84d"))
    circle(ctx, x - r * 0.25, y - r * 0.25, r * 0.55, hexc("#ffe98f", 0.6))


def cloud(ctx, x, y, s, c):
    for dx, dy, r in [(0, 0, 60), (65, -25, 70), (135, 0, 58), (60, 20, 60), (-50, 15, 45), (185, 18, 42)]:
        circle(ctx, x + dx * s, y + dy * s, r * s, c)


def clouds(ctx, t, rain=0.0):
    c = mix(hexc("#ffffff", 0.95), hexc("#6f7c88", 0.97), rain)
    for i, (bx, y, s, sp) in enumerate([(100, 260, 1.0, 14), (620, 380, 0.8, 9), (900, 180, 0.7, 11), (330, 520, 0.6, 7)]):
        x = (bx + t * sp) % (W + 500) - 250
        cloud(ctx, x, y, s * (1 + 0.4 * rain), c)
    if rain > 0:
        for i, (bx, y, s) in enumerate([(0, 120, 1.6), (450, 80, 1.8), (850, 150, 1.5), (250, 300, 1.2)]):
            cloud(ctx, bx + 10 * math.sin(t + i), y, s, hexc("#55616d", 0.9 * rain))


def hills(ctx, rain=0.0):
    c = mix(hexc("#7fb77e"), hexc("#6b8577"), rain)
    ctx.move_to(0, GY)
    for x in range(0, W + 41, 40):
        ctx.line_to(x, GY - 150 - 60 * math.sin(x / 170) - 30 * math.sin(x / 61))
    ctx.line_to(W, GY)
    ctx.close_path()
    setc(ctx, c)
    ctx.fill()


def jungle_tree(ctx, x, y, s, rain=0.0):
    ctx.rectangle(x - 10 * s, y - 170 * s, 20 * s, 170 * s)
    setc(ctx, hexc("#6b4428"))
    ctx.fill()
    c1 = mix(hexc("#2f7d3a"), hexc("#3f6b4a"), rain)
    c2 = mix(hexc("#3e9a46"), hexc("#4f7a58"), rain)
    for dx, dy, r, c in [(-45, -190, 55, c1), (45, -195, 55, c1), (0, -240, 65, c2), (-20, -175, 45, c2), (30, -170, 45, c2)]:
        circle(ctx, x + dx * s, y + dy * s, r * s, c)


def palm(ctx, x, y, s, t):
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.move_to(x, y)
    ctx.curve_to(x + 10 * s, y - 120 * s, x - 15 * s, y - 220 * s, x + 5 * s, y - 300 * s)
    setc(ctx, hexc("#7a5532"))
    ctx.set_line_width(16 * s)
    ctx.stroke()
    tx, ty = x + 5 * s, y - 300 * s
    sw = math.sin(t * 1.5) * 0.06
    for i in range(7):
        a = -math.pi + i * math.pi / 6 + sw
        ex, ey = tx + math.cos(a) * 130 * s, ty + math.sin(a) * 70 * s + 50 * s
        ctx.move_to(tx, ty)
        ctx.curve_to(tx + math.cos(a) * 60 * s, ty - 40 * s, ex, ey - 30 * s, ex, ey)
        setc(ctx, hexc("#2f8f3a"))
        ctx.set_line_width(18 * s)
        ctx.stroke()


def ground(ctx, river_w=0, rain=0.0):
    # tanah
    ctx.rectangle(0, GY, W, H - GY)
    g = cairo.LinearGradient(0, GY, 0, H)
    g.add_color_stop_rgba(0, *SOIL)
    g.add_color_stop_rgba(1, *SOIL_D)
    ctx.set_source(g)
    ctx.fill()
    # rumput
    ctx.rectangle(0, GY - 6, W, 34)
    setc(ctx, mix(GRASS, hexc("#5f8a4a"), rain))
    ctx.fill()
    random.seed(7)
    setc(ctx, mix(GRASS_D, hexc("#4c6f3c"), rain))
    for i in range(90):
        x = random.uniform(0, W)
        ctx.move_to(x, GY + 10)
        ctx.line_to(x + 6, GY - 22 - random.uniform(0, 14))
        ctx.line_to(x + 12, GY + 10)
        ctx.fill()
    if river_w:
        # sungai di kiri: tebing + air
        ctx.move_to(0, GY - 6)
        ctx.line_to(river_w, GY - 6)
        ctx.curve_to(river_w - 40, GY + 60, river_w - 80, GY + 120, river_w - 140, GY + 150)
        ctx.line_to(0, GY + 150)
        ctx.close_path()
        setc(ctx, hexc("#6e4a2a"))
        ctx.fill()


def water(ctx, level, t, x0=0, x1=W, alpha=0.9):
    """Air banjir/sungai dengan permukaan bergelombang. level = y permukaan."""
    ctx.move_to(x0, H)
    xs = range(int(x0), int(x1) + 21, 20)
    for x in xs:
        ctx.line_to(x, level + 7 * math.sin(x / 45 + t * 3) + 4 * math.sin(x / 19 - t * 2))
    ctx.line_to(x1, H)
    ctx.close_path()
    g = cairo.LinearGradient(0, level, 0, level + 500)
    g.add_color_stop_rgba(0, *hexc("#a89664", alpha))
    g.add_color_stop_rgba(1, *hexc("#6c5d3a", alpha))
    ctx.set_source(g)
    ctx.fill()
    # kilau
    ctx.set_line_width(5)
    setc(ctx, hexc("#e8dcb0", 0.7 * alpha))
    for i in range(int(x0) + 30, int(x1), 150):
        xx = i + 30 * math.sin(t + i)
        ctx.move_to(xx, level + 22)
        ctx.line_to(xx + 50, level + 22)
        ctx.stroke()


def rain_drops(ctx, t, amount=1.0):
    random.seed(3)
    ctx.set_line_width(4)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, hexc("#dbe7f2", 0.6 * amount))
    for i in range(int(160 * amount)):
        x0 = random.uniform(-100, W + 100)
        sp = random.uniform(1400, 2000)
        ph = random.uniform(0, H)
        y = (ph + t * sp) % (H + 200) - 100
        x = x0 - (y * 0.15)
        ctx.move_to(x, y)
        ctx.line_to(x - 9, y + 55)
        ctx.stroke()


# ------------------------------------------------------------------ house --


def house(ctx, cx, gy, stilt=0.0, s=1.0, walls=1.0, roof=1.0, ladder=True,
          ladder_up=0.0, cutaway=False, interior_water=None, t=0.0, glow=None,
          mold=0.0, window_face=None):
    """Rumah kayu tampak depan. gy = posisi tanah, stilt = tinggi kolong (px)."""
    hw = 460 * s
    wall_h = 290 * s
    floor_y = gy - stilt
    x0 = cx - hw / 2
    # tiang ulin
    if stilt > 0:
        for i in range(5):
            px = x0 + 22 * s + i * (hw - 44 * s) / 4
            ctx.rectangle(px - 13 * s, floor_y - 6, 26 * s, stilt + 18 * s)
            setc(ctx, ULIN)
            ctx.fill()
            setc(ctx, hexc("#6a4532"))
            ctx.rectangle(px - 13 * s, floor_y - 6, 7 * s, stilt + 18 * s)
            ctx.fill()
            # batu alas
            rrect(ctx, px - 22 * s, gy + 4 * s, 44 * s, 16 * s, 6 * s)
            setc(ctx, hexc("#8d8d8d"))
            ctx.fill()
        # balok silang
        if stilt > 80 * s:
            setc(ctx, hexc("#5a3a28"))
            ctx.set_line_width(8 * s)
            for i in range(4):
                ax = x0 + 22 * s + i * (hw - 44 * s) / 4
                bx = x0 + 22 * s + (i + 1) * (hw - 44 * s) / 4
                ctx.move_to(ax, floor_y + 10 * s)
                ctx.line_to(bx, floor_y + stilt * 0.75)
                ctx.stroke()
    # lantai (balok)
    ctx.rectangle(x0 - 20 * s, floor_y - 22 * s, hw + 40 * s, 26 * s)
    setc(ctx, WOOD_D)
    ctx.fill()
    # dinding
    wh = wall_h * walls
    if wh > 1:
        top = floor_y - 22 * s - wh
        ctx.rectangle(x0, top, hw, wh)
        if cutaway:
            col = glow if glow else hexc("#f3d9b1")
            setc(ctx, col)
            ctx.fill()
            # papan dinding belakang
            setc(ctx, hexc("#d8b88a"))
            ctx.set_line_width(3)
            for i in range(1, 12):
                ctx.move_to(x0 + i * hw / 12, top)
                ctx.line_to(x0 + i * hw / 12, floor_y - 22 * s)
                ctx.stroke()
            # rangka tepi
            ctx.rectangle(x0, top, hw, wh)
            setc(ctx, WOOD_D)
            ctx.set_line_width(14 * s)
            ctx.stroke()
        else:
            setc(ctx, glow if glow else WOOD)
            ctx.fill()
            setc(ctx, WOOD_D)
            ctx.set_line_width(3 * s)
            n = int(wh / (24 * s))
            for i in range(1, n + 1):
                yy = floor_y - 22 * s - i * 24 * s
                ctx.move_to(x0, yy)
                ctx.line_to(x0 + hw, yy)
                ctx.stroke()
            if walls > 0.95:
                # pintu & jendela
                dw, dh = 90 * s, 190 * s
                ctx.rectangle(cx - dw / 2, floor_y - 22 * s - dh, dw, dh)
                setc(ctx, hexc("#6b3f22"))
                ctx.fill()
                circle(ctx, cx + dw / 2 - 16 * s, floor_y - 22 * s - dh / 2, 6 * s, YELLOW)
                for wx in (x0 + 60 * s, x0 + hw - 150 * s):
                    wy = floor_y - 22 * s - 210 * s
                    ctx.rectangle(wx, wy, 90 * s, 100 * s)
                    setc(ctx, hexc("#2b2b33"))
                    ctx.fill()
                    if window_face and wx > cx:
                        window_face(ctx, wx + 45 * s, wy + 60 * s, s)
                    setc(ctx, WOOD_L)
                    ctx.set_line_width(8 * s)
                    ctx.rectangle(wx, wy, 90 * s, 100 * s)
                    ctx.stroke()
                    ctx.move_to(wx + 45 * s, wy)
                    ctx.line_to(wx + 45 * s, wy + 100 * s)
                    ctx.stroke()
        if mold > 0:
            random.seed(11)
            for i in range(26):
                mx = random.uniform(x0 + 10, x0 + hw - 10)
                my = floor_y - 22 * s - random.uniform(0, 110 * s)
                circle(ctx, mx, my, random.uniform(8, 20) * s * mold, hexc("#3d6b3a", 0.75))
    # atap
    if roof > 0:
        rtop = floor_y - 22 * s - wall_h
        drop = (1 - ease_out_back(roof)) * 400
        ctx.save()
        ctx.translate(0, -drop)
        ctx.move_to(x0 - 60 * s, rtop + 10 * s)
        ctx.line_to(cx, rtop - 200 * s)
        ctx.line_to(x0 + hw + 60 * s, rtop + 10 * s)
        ctx.close_path()
        setc(ctx, ROOF)
        ctx.fill()
        ctx.move_to(x0 - 60 * s, rtop + 10 * s)
        ctx.line_to(cx, rtop - 200 * s)
        ctx.line_to(x0 + hw + 60 * s, rtop + 10 * s)
        setc(ctx, ROOF_D)
        ctx.set_line_width(14 * s)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.stroke()
        # ornamen puncak (tanduk khas rumah adat)
        ctx.move_to(cx, rtop - 200 * s)
        ctx.line_to(cx - 40 * s, rtop - 250 * s)
        ctx.move_to(cx, rtop - 200 * s)
        ctx.line_to(cx + 40 * s, rtop - 250 * s)
        ctx.stroke()
        # segitiga dalam
        ctx.move_to(cx - 90 * s, rtop + 2 * s)
        ctx.line_to(cx, rtop - 120 * s)
        ctx.line_to(cx + 90 * s, rtop + 2 * s)
        ctx.close_path()
        setc(ctx, WOOD_L)
        ctx.fill()
        ctx.restore()
    # tangga
    if ladder and stilt > 40 * s:
        lx = cx - 45 * s
        lift = ladder_up * stilt * 0.9
        ctx.save()
        ctx.translate(0, -lift)
        lb = gy + 4 - lift * 0
        for side in (lx, lx + 90 * s):
            ctx.move_to(side, floor_y - 18 * s)
            ctx.line_to(side - 30 * s * (1 - ladder_up), gy)
            setc(ctx, WOOD_D)
            ctx.set_line_width(10 * s)
            ctx.stroke()
        n = max(2, int(stilt / (36 * s)))
        for i in range(1, n):
            k = i / n
            yy = floor_y - 18 * s + (gy - floor_y + 18 * s) * k
            ctx.move_to(lx - 30 * s * (1 - ladder_up) * k, yy)
            ctx.line_to(lx + 90 * s - 30 * s * (1 - ladder_up) * k, yy)
            ctx.set_line_width(8 * s)
            ctx.stroke()
        ctx.restore()
    return floor_y - 22 * s  # y lantai dalam


def bed(ctx, x, y, s=1.0):
    rrect(ctx, x, y - 50 * s, 170 * s, 50 * s, 10 * s)
    setc(ctx, hexc("#e9e2ff"))
    ctx.fill()
    rrect(ctx, x + 10 * s, y - 70 * s, 50 * s, 28 * s, 10 * s)
    setc(ctx, WHITE)
    ctx.fill()
    ctx.rectangle(x, y - 30 * s, 170 * s, 30 * s)
    setc(ctx, hexc("#5b6bd6"))
    ctx.fill()


# -------------------------------------------------------------- characters --


def kid(ctx, x, yf, s=1.0, t=0.0, mood="normal", walk=0.0, look=1):
    """Tokoh 'kamu'. yf = posisi kaki."""
    sw = math.sin(t * 10) * 18 * walk
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, hexc("#2d3a4a"))
    ctx.set_line_width(18 * s)
    for d in (-1, 1):
        ctx.move_to(x + d * 12 * s, yf - 70 * s)
        ctx.line_to(x + d * 12 * s + d * sw * s * 0.6, yf - 4 * s)
        ctx.stroke()
    # badan
    rrect(ctx, x - 38 * s, yf - 160 * s, 76 * s, 95 * s, 26 * s)
    setc(ctx, SHIRT)
    ctx.fill()
    # tangan
    setc(ctx, SKIN)
    ctx.set_line_width(15 * s)
    if mood == "hot":
        fan = math.sin(t * 14) * 0.5
        ctx.move_to(x + 34 * s, yf - 140 * s)
        ctx.line_to(x + 62 * s, yf - 185 * s)
        ctx.stroke()
        ctx.save()
        ctx.translate(x + 66 * s, yf - 200 * s)
        ctx.rotate(fan)
        ctx.move_to(0, 0)
        ctx.arc(0, 0, 42 * s, -2.2, -0.9)
        ctx.close_path()
        setc(ctx, hexc("#ff8a3d"))
        ctx.fill()
        ctx.restore()
        setc(ctx, SKIN)
        ctx.move_to(x - 34 * s, yf - 140 * s)
        ctx.line_to(x - 46 * s, yf - 90 * s)
        ctx.stroke()
    else:
        for d in (-1, 1):
            ctx.move_to(x + d * 34 * s, yf - 140 * s)
            ctx.line_to(x + d * 46 * s - d * sw * 0.5 * s, yf - 88 * s)
            ctx.stroke()
    # kepala
    hy = yf - 205 * s
    circle(ctx, x, hy, 48 * s, SKIN)
    # rambut / peci
    ctx.arc(x, hy - 4 * s, 50 * s, math.pi * 1.05, math.pi * 1.95)
    ctx.close_path()
    setc(ctx, hexc("#2a1d16"))
    ctx.fill()
    # mata
    ex = 14 * s * look
    for d in (-1, 1):
        circle(ctx, x + ex + d * 16 * s, hy + 4 * s, 6 * s, BLACK)
    # mulut
    ctx.set_line_width(5 * s)
    setc(ctx, hexc("#7a2e1e"))
    if mood in ("happy", "normal"):
        ctx.arc(x + ex, hy + 18 * s, 14 * s, 0.2, math.pi - 0.2)
        ctx.stroke()
    elif mood in ("worried", "hot"):
        ctx.arc(x + ex, hy + 32 * s, 12 * s, math.pi + 0.4, 2 * math.pi - 0.4)
        ctx.stroke()
        # tetes keringat
        dy = (t * 60) % 30
        ctx.move_to(x - 44 * s, hy - 20 * s + dy * s)
        ctx.curve_to(x - 56 * s, hy - 2 * s + dy * s, x - 32 * s, hy - 2 * s + dy * s, x - 44 * s, hy - 20 * s + dy * s)
        setc(ctx, hexc("#7cc8ff"))
        ctx.fill()


def snake(ctx, x, y, s, t):
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.move_to(x, y)
    for i in range(1, 30):
        ctx.line_to(x + i * 7 * s, y + math.sin(i / 3 + t * 6) * 14 * s)
    setc(ctx, hexc("#3f8f2f"))
    ctx.set_line_width(22 * s)
    ctx.stroke()
    circle(ctx, x - 6 * s, y, 18 * s, hexc("#3f8f2f"))
    circle(ctx, x - 10 * s, y - 6 * s, 4 * s, BLACK)
    ctx.move_to(x - 22 * s, y + 4 * s)
    ctx.line_to(x - 40 * s, y + 2 * s + 4 * math.sin(t * 20))
    setc(ctx, RED)
    ctx.set_line_width(4 * s)
    ctx.stroke()


def lizard(ctx, x, y, s, t, col="#6b6b3a", length=1.0, croc=False):
    c = hexc(col)
    L = 230 * s * length
    rrect(ctx, x, y - 40 * s, L, 44 * s, 22 * s)
    setc(ctx, c)
    ctx.fill()
    # ekor
    ctx.move_to(x + L - 10 * s, y - 34 * s)
    ctx.curve_to(x + L + 80 * s, y - 30 * s + 10 * math.sin(t * 5), x + L + 140 * s, y - 10 * s, x + L + 170 * s * length, y - 6 * s)
    ctx.line_to(x + L - 10 * s, y)
    ctx.close_path()
    ctx.fill()
    # kepala / moncong
    if croc:
        rrect(ctx, x - 120 * s, y - 34 * s, 140 * s, 32 * s, 12 * s)
        ctx.fill()
        setc(ctx, WHITE)
        for i in range(6):
            ctx.move_to(x - 110 * s + i * 20 * s, y - 4 * s)
            ctx.line_to(x - 100 * s + i * 20 * s, y + 8 * s)
            ctx.line_to(x - 90 * s + i * 20 * s, y - 4 * s)
            ctx.fill()
        circle(ctx, x - 2 * s, y - 44 * s, 14 * s, c)
        circle(ctx, x - 2 * s, y - 46 * s, 6 * s, BLACK)
        # sisik
        setc(ctx, mix(c, BLACK, 0.3))
        for i in range(8):
            ctx.move_to(x + 20 * s + i * 26 * s, y - 40 * s)
            ctx.line_to(x + 32 * s + i * 26 * s, y - 56 * s)
            ctx.line_to(x + 44 * s + i * 26 * s, y - 40 * s)
            ctx.fill()
    else:
        ctx.move_to(x + 10 * s, y - 36 * s)
        ctx.curve_to(x - 40 * s, y - 44 * s, x - 70 * s, y - 24 * s, x - 70 * s, y - 20 * s)
        ctx.curve_to(x - 60 * s, y - 6 * s, x - 20 * s, y, x + 10 * s, y - 4 * s)
        ctx.fill()
        circle(ctx, x - 34 * s, y - 28 * s, 5 * s, BLACK)
    # kaki
    setc(ctx, mix(c, BLACK, 0.2))
    ctx.set_line_width(14 * s)
    for i, lx in enumerate((x + 30 * s, x + L - 40 * s)):
        st = math.sin(t * 8 + i * 2) * 10 * s
        ctx.move_to(lx, y - 6 * s)
        ctx.line_to(lx - 18 * s + st, y + 22 * s)
        ctx.stroke()


def boat(ctx, x, y, s):
    ctx.move_to(x - 150 * s, y - 50 * s)
    ctx.line_to(x + 150 * s, y - 50 * s)
    ctx.curve_to(x + 110 * s, y, x - 110 * s, y, x - 150 * s, y - 50 * s)
    setc(ctx, hexc("#3d7fc1"))
    ctx.fill()
    ctx.rectangle(x - 150 * s, y - 56 * s, 300 * s, 10 * s)
    setc(ctx, hexc("#f2f2f2"))
    ctx.fill()
    ctx.move_to(x + 60 * s, y - 50 * s)
    ctx.line_to(x + 160 * s, y - 120 * s)
    setc(ctx, WOOD_D)
    ctx.set_line_width(8 * s)
    ctx.stroke()


def firewood(ctx, x, y, s):
    for row in range(3):
        for i in range(4 - row):
            cx = x + (i + row * 0.5) * 42 * s
            cy = y - 20 * s - row * 38 * s
            circle(ctx, cx, cy, 20 * s, hexc("#8a5a33"))
            circle(ctx, cx, cy, 12 * s, hexc("#d9a866"))


def coop(ctx, x, y, s, t):
    ctx.rectangle(x, y - 110 * s, 160 * s, 110 * s)
    setc(ctx, hexc("#b5823f"))
    ctx.fill()
    setc(ctx, hexc("#7a5524"))
    ctx.set_line_width(5 * s)
    for i in range(1, 6):
        ctx.move_to(x + i * 160 * s / 6, y - 110 * s)
        ctx.line_to(x + i * 160 * s / 6, y)
        ctx.stroke()
    # ayam
    hx = x + 210 * s + 8 * math.sin(t * 3) * s
    circle(ctx, hx, y - 40 * s, 34 * s, WHITE)
    circle(ctx, hx + 26 * s, y - 76 * s, 20 * s, WHITE)
    circle(ctx, hx + 30 * s, y - 80 * s, 4 * s, BLACK)
    ctx.move_to(hx + 44 * s, y - 78 * s)
    ctx.line_to(hx + 60 * s, y - 72 * s)
    ctx.line_to(hx + 44 * s, y - 68 * s)
    setc(ctx, hexc("#ffb02e"))
    ctx.fill()
    circle(ctx, hx + 22 * s, y - 98 * s, 9 * s, RED)


# ------------------------------------------------------------------ icons --


def check(ctx, x, y, r, k=1.0, ok=True):
    if k <= 0:
        return
    sc = ease_out_back(k)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    circle(ctx, 0, 0, r, GREEN if ok else RED)
    ctx.set_line_width(r * 0.22)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    setc(ctx, WHITE)
    if ok:
        ctx.move_to(-r * 0.45, 0)
        ctx.line_to(-r * 0.1, r * 0.35)
        ctx.line_to(r * 0.5, -r * 0.35)
    else:
        ctx.move_to(-r * 0.4, -r * 0.4)
        ctx.line_to(r * 0.4, r * 0.4)
        ctx.move_to(r * 0.4, -r * 0.4)
        ctx.line_to(-r * 0.4, r * 0.4)
    ctx.stroke()
    ctx.restore()


def thermometer(ctx, x, y, h, frac, label=None, hot=True):
    rrect(ctx, x - 28, y - h, 56, h, 28)
    setc(ctx, WHITE)
    ctx.fill()
    rrect(ctx, x - 28, y - h, 56, h, 28)
    setc(ctx, hexc("#333333"))
    ctx.set_line_width(5)
    ctx.stroke()
    col = RED if hot else BLUE
    circle(ctx, x, y, 48, col)
    fh = (h - 30) * clamp(frac)
    rrect(ctx, x - 14, y - fh, 28, fh, 14)
    setc(ctx, col)
    ctx.fill()
    for i in range(1, 6):
        yy = y - 40 - i * (h - 60) / 6
        ctx.move_to(x + 28, yy)
        ctx.line_to(x + 44, yy)
        setc(ctx, hexc("#333333"))
        ctx.set_line_width(4)
        ctx.stroke()
    if label:
        text(ctx, label, x, y - h - 50, 64, col, stroke=WHITE, sw=12)


def arrow_flow(ctx, pts, t, col, width=14, speed=1.0, dash=60):
    ctx.move_to(*pts[0])
    if len(pts) == 4:
        ctx.curve_to(*pts[1], *pts[2], *pts[3])
    else:
        for p in pts[1:]:
            ctx.line_to(*p)
    ctx.set_dash([dash, dash * 0.6], -t * 260 * speed)
    ctx.set_line_width(width)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, col)
    ctx.stroke()
    ctx.set_dash([])


def arrowhead(ctx, x, y, ang, size, col):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    ctx.move_to(size, 0)
    ctx.line_to(-size * 0.6, -size * 0.7)
    ctx.line_to(-size * 0.6, size * 0.7)
    ctx.close_path()
    setc(ctx, col)
    ctx.fill()
    ctx.restore()


def label_chip(ctx, s, x, y, size, bg, fg=WHITE, k=1.0):
    if k <= 0:
        return
    sc = ease_out_back(k)
    w = text_width(ctx, s, size) + size * 1.1
    h = size * 1.6
    x = clamp(x, w / 2 + 24, W - w / 2 - 24)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    rrect(ctx, -w / 2 + 6, -h / 2 + 8, w, h, h / 2)
    setc(ctx, hexc("#000000", 0.25))
    ctx.fill()
    rrect(ctx, -w / 2, -h / 2, w, h, h / 2)
    setc(ctx, bg)
    ctx.fill()
    text(ctx, s, 0, 0, size, fg)
    ctx.restore()


def qmark(ctx, x, y, size, t, k=1.0):
    if k <= 0:
        return
    ctx.save()
    ctx.translate(x, y + 10 * math.sin(t * 4 + x))
    ctx.scale(ease_out_back(k), ease_out_back(k))
    text(ctx, "?", 0, 0, size, YELLOW, stroke=BLACK, sw=10)
    ctx.restore()


# ---------------------------------------------------------- scene helpers --


def world(ctx, t, rain=0.0, river=True, sun_on=True):
    sky(ctx, rain)
    if sun_on and rain < 0.5:
        sun(ctx, 880, 300, 80, t)
    clouds(ctx, t, rain)
    hills(ctx, rain)
    for x, s in [(80, 0.9), (190, 0.7), (960, 1.0), (1040, 0.8)]:
        jungle_tree(ctx, x, GY - 20, s, rain)
    palm(ctx, 300, GY - 10, 0.8, t)
    ground(ctx, river_w=360 if river else 0, rain=rain)
    if river:
        water(ctx, GY + 40, t, 0, 300)


def icon_card(ctx, x, y, title, kind, k, t):
    if k <= 0:
        return
    sc = ease_out_back(k)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    rrect(ctx, -440, -110, 880, 220, 40)
    setc(ctx, hexc("#000000", 0.2))
    ctx.fill()
    rrect(ctx, -450, -120, 880, 220, 40)
    setc(ctx, WHITE)
    ctx.fill()
    ix = -330
    if kind == "air":
        ctx.move_to(ix, -70)
        ctx.curve_to(ix - 60, 10, ix - 40, 60, ix, 60)
        ctx.curve_to(ix + 40, 60, ix + 60, 10, ix, -70)
        setc(ctx, BLUE)
        ctx.fill()
    elif kind == "rayap":
        circle(ctx, ix, 0, 34, hexc("#a0522d"))
        circle(ctx, ix - 44, 0, 22, hexc("#a0522d"))
        ctx.set_line_width(6)
        for dd in (-20, 0, 20):
            ctx.move_to(ix + dd, -30)
            ctx.line_to(ix + dd - 10, -60)
            ctx.move_to(ix + dd, 30)
            ctx.line_to(ix + dd - 10, 60)
        ctx.stroke()
        ctx.arc(ix - 10, 0, 74, 0, 2 * math.pi)
        setc(ctx, RED)
        ctx.set_line_width(12)
        ctx.stroke()
        ctx.move_to(ix - 62, -52)
        ctx.line_to(ix + 42, 52)
        ctx.stroke()
    else:
        ctx.arc(ix, 0, 62, 0, 2 * math.pi)
        setc(ctx, hexc("#ff8a3d"))
        ctx.fill()
        ctx.set_line_width(10)
        setc(ctx, WHITE)
        ctx.move_to(ix, 0)
        ctx.line_to(ix, -40)
        ctx.move_to(ix, 0)
        a = t * 3
        ctx.line_to(ix + 30 * math.cos(a), 30 * math.sin(a))
        ctx.stroke()
    ts = 64
    while text_width(ctx, title, ts) > 500:
        ts -= 2
    text(ctx, title, -230, -10, ts, BLACK, align="left")
    check(ctx, 340, -10, 50, clamp((k - 0.3) / 0.7))
    ctx.restore()


def sc_cta(ctx, lt, d, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#ffb347"))
    g.add_color_stop_rgba(1, *hexc("#ff6a3d"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    # sinar berputar
    ctx.save()
    ctx.translate(W / 2, 760)
    ctx.rotate(t * 0.2)
    for i in range(16):
        ctx.move_to(0, 0)
        ctx.arc(0, 0, 1400, i * math.pi / 8, i * math.pi / 8 + math.pi / 16)
        ctx.close_path()
        setc(ctx, hexc("#ffffff", 0.08))
        ctx.fill()
    ctx.restore()
    k = seg(lt, 0, 0.5)
    ctx.save()
    ctx.translate(W / 2, 520)
    sc = ease_out_back(k)
    ctx.scale(sc, sc)
    ctx.rotate(-0.05)
    text(ctx, "KOK BISA?", 0, 0, 150, WHITE, stroke=BLACK, sw=18)
    ctx.restore()
    ctx.save()
    ctx.translate(W / 2, 1000)
    ctx.scale(0.55, 0.55)
    ctx.translate(-W / 2, -GY)
    house(ctx, W / 2, GY, stilt=250, t=t)
    ctx.restore()
    # tombol follow
    kb = seg(lt, 0.8, 1.3)
    if kb > 0:
        pulse = 1 + 0.05 * math.sin(t * 8)
        ctx.save()
        ctx.translate(W / 2, 1240)
        ctx.scale(ease_out_back(kb) * pulse, ease_out_back(kb) * pulse)
        rrect(ctx, -250, -70, 500, 140, 70)
        setc(ctx, RED)
        ctx.fill()
        text(ctx, "FOLLOW", 0, 0, 72, WHITE)
        ctx.restore()
        # tangan menekan
        tap = abs(math.sin(t * 4)) * 20
        ctx.save()
        ctx.translate(W / 2 + 180, 1300 + tap)
        circle(ctx, 0, 30, 46, SKIN)
        rrect(ctx, -14, -60, 28, 90, 14)
        setc(ctx, SKIN)
        ctx.fill()
        ctx.restore()


# ---------------------------------------------------------------- episode --


class Episode:
    def __init__(self, number, scenes, scene_fns, out, voice_spans=None, music_key=0):
        self.number = number
        self.scenes = scenes
        self.fns = dict(scene_fns)
        self.fns.setdefault("cta", sc_cta)
        self.out = Path(out)
        self.voice_spans = voice_spans
        self.music_key = music_key
        self.timeline = []
        t = 0.0
        for name, line in scenes:
            d = scene_duration(line)
            ch = chunk_words(tokens(line))
            weights = [sum(len(w) + 2 for w, _ in c) + 4 for c in ch]
            avail = d - 0.55
            times, acc = [], 0.15
            for wgt in weights:
                times.append(acc)
                acc += avail * wgt / sum(weights)
            self.timeline.append(dict(name=name, line=line, start=t, dur=d, chunks=ch, ctimes=times))
            t += d
        self.total = t

    def retime_to_voice(self, spans):
        """Samakan durasi adegan & munculnya subtitle dengan narasi.
        spans = [(mulai_bicara, selesai_bicara), ...] per kalimat, dalam detik."""
        assert len(spans) == len(self.timeline), "jumlah VOICE_SPANS harus sama dengan jumlah kalimat"
        starts = [0.0] + [max(0.0, sp[0] - 0.2) for sp in spans[1:]]
        for i, sc in enumerate(self.timeline):
            s0, e0 = spans[i]
            sc["start"] = starts[i]
            sc["dur"] = (starts[i + 1] if i + 1 < len(starts) else e0 + 2.6) - starts[i]
            lens = [sum(len(w) + 1 for w, _ in c) for c in sc["chunks"]]
            tot = sum(lens)
            acc, times = 0, []
            for ln in lens:
                times.append(max(0.0, s0 + (e0 - s0) * acc / tot - starts[i] - 0.05))
                acc += ln
            sc["ctimes"] = times
        self.total = self.timeline[-1]["start"] + self.timeline[-1]["dur"]


# ---------------------------------------------------------------- overlay --


def draw_caption(ctx, sc, lt):
    idx = -1
    for i, ct in enumerate(sc["ctimes"]):
        if lt >= ct:
            idx = i
    if idx < 0:
        return
    chunk = sc["chunks"][idx]
    age = lt - sc["ctimes"][idx]
    pop = 0.82 + 0.18 * ease_out_back(clamp(age / 0.16))
    size = 92
    words = [w for w, _ in chunk]
    total = sum(text_width(ctx, w, size) for w in words) + text_width(ctx, " ", size) * (len(words) - 1)
    if total > W - 100:  # kecilkan bila terlalu lebar
        pop *= (W - 100) / total
    ctx.save()
    ctx.translate(W / 2, 1520)
    ctx.scale(pop, pop)
    x = -total / 2
    sp = text_width(ctx, " ", size)
    for w, hl in chunk:
        wd = text_width(ctx, w, size)
        text(ctx, w, x + 5, 7, size, hexc("#000000", 0.45), align="left")
        text(ctx, w, x, 0, size, YELLOW if hl else WHITE, align="left", stroke=BLACK, sw=14)
        x += wd + sp
    ctx.restore()


def draw_badge(ctx, ep, gt):
    rrect(ctx, 40, 150, 330, 76, 38)
    setc(ctx, hexc("#000000", 0.45))
    ctx.fill()
    text(ctx, "KOK BISA?", 70, 188, 40, YELLOW, align="left")
    text(ctx, f"#{ep.number}", 300, 188, 40, WHITE, align="left")
    ctx.rectangle(0, 0, W * gt / ep.total, 12)
    setc(ctx, YELLOW)
    ctx.fill()


def render_frame(ctx, ep, gt):
    for i, sc in enumerate(ep.timeline):
        if gt < sc["start"] + sc["dur"] or i == len(ep.timeline) - 1:
            break
    lt = gt - sc["start"]
    d = sc["dur"]
    ctx.save()
    z = 1.0 + 0.04 * ease(lt / d) + 0.07 * (1 - ease(lt / 0.3))
    ctx.translate(W / 2, 1100)
    ctx.scale(z, z)
    ctx.translate(-W / 2, -1100)
    ep.fns[sc["name"]](ctx, lt, d, gt)
    ctx.restore()
    if lt < 0.12 and sc["start"] > 0:
        ctx.rectangle(0, 0, W, H)
        setc(ctx, hexc("#ffffff", 0.35 * (1 - lt / 0.12)))
        ctx.fill()
    draw_caption(ctx, sc, lt)
    if sc["name"] != "cta":
        draw_badge(ctx, ep, gt)


# ------------------------------------------------------------------ audio --
SR = 44100


def synth_music(path, ep):
    n = int(SR * (ep.total + 0.5))
    out = np.zeros(n)
    bpm = 104
    beat = 60 / bpm
    key = ep.music_key
    progressions = [
        [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],   # I-V-vi-IV
        [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],   # vi-IV-I-V
    ]
    chords = [[m + key for m in c] for c in progressions[ep.number % 2]]
    mel_pattern = [0, 2, 1, 2, 0, 2, 1, 2] if ep.number % 2 else [0, 1, 2, 1, 2, 1, 0, 2]

    def f(m):
        return 440 * 2 ** ((m - 69) / 12)

    def pluck(freq, dur, amp):
        tt = np.arange(int(SR * dur)) / SR
        env = np.exp(-tt * 5.5) * np.minimum(1, tt * 200)
        w = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt) + 0.12 * np.sin(6 * np.pi * freq * tt)
        return amp * env * w

    def add(sig, start):
        i = int(start * SR)
        j = min(n, i + len(sig))
        if 0 <= i < n:
            out[i:j] += sig[: j - i]

    t = 0.0
    bar = 0
    while t < ep.total:
        ch = chords[bar % 4]
        for b in range(4):
            add(pluck(f(ch[0] - 24), beat * 0.9, 0.22), t + b * beat)
        for e in range(8):
            note = ch[mel_pattern[e]] + 12
            add(pluck(f(note), beat * 0.8, 0.10 if e % 2 else 0.13), t + e * beat / 2)
        for e in range(8):
            noise = np.random.default_rng(bar * 8 + e).standard_normal(int(SR * 0.05))
            env = np.exp(-np.arange(len(noise)) / SR * 70)
            add(noise * env * (0.03 if e % 2 else 0.015), t + e * beat / 2)
        t += 4 * beat
        bar += 1
    rng = np.random.default_rng(1)
    for sc in ep.timeline[1:]:
        L = int(SR * 0.25)
        noise = rng.standard_normal(L)
        noise = np.convolve(noise, np.ones(12) / 12, mode="same")
        env = np.sin(np.linspace(0, np.pi, L)) ** 2
        add(noise * env * 0.12, sc["start"] - 0.1)
    fo = int(SR * 1.5)
    out[-fo:] *= np.linspace(1, 0, fo)
    out = out / max(1e-9, np.max(np.abs(out))) * 0.6
    data = (np.stack([out, out], axis=1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(data.tobytes())


# ------------------------------------------------------------------- main --


def run(ep, argv=None):
    """python3 epX.py                       -> video tanpa narasi
       python3 epX.py --voice narasi.mp3    -> video dengan narasi (butuh VOICE_SPANS)
       python3 epX.py --preview out.png     -> contact sheet semua adegan"""
    argv = sys.argv[1:] if argv is None else argv
    voice = None
    out = ep.out
    if "--voice" in argv:
        voice = Path(argv[argv.index("--voice") + 1])
        if not ep.voice_spans:
            sys.exit("VOICE_SPANS belum diisi untuk narasi ini.")
        ep.retime_to_voice(ep.voice_spans)
        out = out.with_name(out.stem + "_narasi.mp4")
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surface)

    if "--preview" in argv:
        nxt = argv.index("--preview") + 1
        dest = Path(argv[nxt]) if nxt < len(argv) else ep.out.with_name("preview.png")
        thumbs = []
        for sc in ep.timeline:
            render_frame(ctx, ep, sc["start"] + sc["dur"] * 0.85)
            surface.flush()
            arr = np.ndarray((H, W, 4), np.uint8, surface.get_data()).copy()
            thumbs.append(arr[::4, ::4, [2, 1, 0]])
        cols = 5
        rows = math.ceil(len(thumbs) / cols)
        sheet = np.zeros((rows * H // 4, cols * W // 4, 3), np.uint8)
        for i, th in enumerate(thumbs):
            r, c = divmod(i, cols)
            sheet[r * H // 4:(r + 1) * H // 4, c * W // 4:(c + 1) * W // 4] = th
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s",
                        f"{sheet.shape[1]}x{sheet.shape[0]}", "-i", "-", str(dest)], input=sheet.tobytes(), check=True)
        print("preview:", dest)
        return

    audio = out.with_name("_music.wav")
    synth_music(audio, ep)
    frames = int(ep.total * FPS)
    print(f"durasi {ep.total:.1f}s, {frames} frame")
    cmd = ["ffmpeg", "-y", "-v", "error",
           "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", str(audio)]
    if voice:
        cmd += ["-i", str(voice), "-filter_complex",
                "[2:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.6,apad,asplit=2[v][sc];"
                "[1:a]volume=0.45[m];[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];"
                "[duck][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]",
                "-map", "0:v", "-map", "[aout]"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fr in range(frames):
        render_frame(ctx, ep, fr / FPS)
        surface.flush()
        proc.stdin.write(bytes(surface.get_data()))
        if fr % 300 == 0:
            print(f"  frame {fr}/{frames}", flush=True)
    proc.stdin.close()
    proc.wait()
    audio.unlink(missing_ok=True)
    print("selesai:", out)
