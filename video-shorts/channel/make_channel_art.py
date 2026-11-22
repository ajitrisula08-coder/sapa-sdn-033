#!/usr/bin/env python3
"""Membuat foto profil (800x800) dan banner (2560x1440) channel @kokbisakaltim."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent / "sungai-cokelat"))
from kokbisa_engine import *  # noqa: E402,F401,F403
from make_video import drop_char  # noqa: E402

NAME = "KOK BISA? KALTIM"
HANDLE = "@kokbisakaltim"


def profile(path):
    S = 800
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, S, S)
    ctx = cairo.Context(surf)
    g = cairo.RadialGradient(S / 2, S / 2, 50, S / 2, S / 2, S * 0.7)
    g.add_color_stop_rgba(0, *hexc("#ffe066"))
    g.add_color_stop_rgba(1, *hexc("#ffb800"))
    ctx.rectangle(0, 0, S, S)
    ctx.set_source(g)
    ctx.fill()
    # sinar
    ctx.save()
    ctx.translate(S / 2, S / 2)
    for i in range(16):
        ctx.move_to(0, 0)
        ctx.arc(0, 0, S, i * math.pi / 8, i * math.pi / 8 + math.pi / 16)
        ctx.close_path()
        setc(ctx, hexc("#ffffff", 0.12))
        ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.translate(S / 2, 690)
    ctx.scale(0.36, 0.36)
    ctx.translate(-W / 2, -GY)
    house(ctx, W / 2, GY, stilt=180, t=0, ladder=False)
    ctx.restore()
    text(ctx, "KOK", S / 2, 190, 170, BLACK, stroke=WHITE, sw=16)
    text(ctx, "BISA?", S / 2, 345, 170, RED, stroke=WHITE, sw=16)
    surf.write_to_png(str(path))


def banner(path):
    BW, BH = 2560, 1440
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, BW, BH)
    ctx = cairo.Context(surf)
    horizon = 1000
    g = cairo.LinearGradient(0, 0, 0, horizon)
    g.add_color_stop_rgba(0, *hexc("#4fb0e8"))
    g.add_color_stop_rgba(1, *hexc("#d9f1ff"))
    ctx.rectangle(0, 0, BW, BH)
    ctx.set_source(g)
    ctx.fill()
    sun(ctx, 2250, 300, 110, 0.4)
    for x, y, s in [(150, 250, 1.3), (700, 160, 0.9), (1700, 200, 1.1), (2350, 560, 0.8), (380, 560, 0.8)]:
        cloud(ctx, x, y, s, hexc("#ffffff", 0.95))
    # bukit
    ctx.move_to(0, horizon)
    for x in range(0, BW + 41, 40):
        ctx.line_to(x, horizon - 170 - 70 * math.sin(x / 260) - 40 * math.sin(x / 90))
    ctx.line_to(BW, horizon)
    ctx.close_path()
    setc(ctx, hexc("#7fb77e"))
    ctx.fill()
    for i, x in enumerate(range(30, BW, 110)):
        jungle_tree(ctx, x, horizon + 10, 0.5 + 0.12 * (i % 3))
    # sungai Mahakam
    ctx.rectangle(0, horizon, BW, BH - horizon)
    g = cairo.LinearGradient(0, horizon, 0, BH)
    g.add_color_stop_rgba(0, *hexc("#b8874e"))
    g.add_color_stop_rgba(1, *hexc("#8a5f30"))
    ctx.set_source(g)
    ctx.fill()
    setc(ctx, hexc("#ffffff", 0.3))
    ctx.set_line_width(6)
    random.seed(1)
    for i in range(40):
        x, y = random.uniform(0, BW), random.uniform(horizon + 30, BH - 20)
        ctx.move_to(x, y)
        ctx.line_to(x + random.uniform(50, 110), y)
        ctx.stroke()
    # rumah panggung kiri, tetes air kanan (di luar area aman teks)
    ctx.save()
    ctx.translate(330, 1130)
    ctx.scale(0.62, 0.62)
    ctx.translate(-W / 2, -GY)
    house(ctx, W / 2, GY, stilt=260, t=0)
    ctx.restore()
    drop_char(ctx, 2230, 1000, 1.5, 1.0)
    # panel teks di area aman (1546x423 di tengah)
    cx, cy = BW / 2, BH / 2
    rrect(ctx, cx - 760 + 10, cy - 205 + 14, 1520, 410, 60)
    setc(ctx, hexc("#000000", 0.25))
    ctx.fill()
    rrect(ctx, cx - 760, cy - 205, 1520, 410, 60)
    setc(ctx, hexc("#ffd23f"))
    ctx.fill()
    rrect(ctx, cx - 760, cy - 205, 1520, 410, 60)
    setc(ctx, BLACK)
    ctx.set_line_width(10)
    ctx.stroke()
    x = cx - text_width(ctx, "KOK BISA? KALTIM", 150) / 2
    x += text(ctx, "KOK BISA? ", x, cy - 85, 150, BLACK, align="left")
    text(ctx, "KALTIM", x, cy - 85, 150, RED, align="left")
    text(ctx, "Fakta unik & sains seru Kalimantan dalam 1 menit", cx, cy + 45, 58, hexc("#3a2a10"))
    chip = HANDLE + "  •  Video baru tiap minggu"
    cw = text_width(ctx, chip, 46) + 60
    rrect(ctx, cx - cw / 2, cy + 140 - 38, cw, 76, 38)
    setc(ctx, BLACK)
    ctx.fill()
    text(ctx, chip, cx, cy + 140, 46, YELLOW)
    surf.write_to_png(str(path))


if __name__ == "__main__":
    profile(HERE / "foto_profil_800.png")
    banner(HERE / "banner_2560x1440.png")
    print("ok")
