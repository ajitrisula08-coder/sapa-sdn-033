#!/usr/bin/env python3
"""Kok Bisa? #7 - Pasar Terapung, kok belanjanya di atas perahu? (gambar AI + animasi)

Gambar adegan dibuat pemilik channel di Google Flow (prompt di NASKAH_DAN_PANDUAN_UPLOAD.md),
disimpan sebagai gambar/img01.png ... img08.png (format lain diubah otomatis ke PNG).
Claude menggerakkan gambar (zoom/geser kamera), menambah subtitle, label, musik, dan narasi.

Fakta: Wikipedia ID "Pasar Terapung Lok Baintan", "Pasar Terapung Muara Kuin", "Tanggui",
"Jukung" (merujuk Radar Banjarmasin, Meratus Geopark UNESCO, sejarawan ULM).

Pakai:  python3 make_video.py                        -> pasar_terapung_shorts.mp4
        python3 make_video.py --voice narasi.mp3     -> pasar_terapung_shorts_narasi.mp4
        python3 make_video.py --preview preview.png
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from kokbisa_engine import *  # noqa: E402,F401,F403

IMG_DIR = HERE / "gambar"

# ----------------------------------------------------------------- naskah --
SCENES = [
    ("s01", "Di Kalimantan Selatan, ada pasar yang nggak punya lantai. [Kok bisa]?"),
    ("s02", "Semua pedagangnya berjualan di atas perahu kecil bernama [jukung]!"),
    ("s03", "Ini [Pasar Terapung Lok Baintan], di Sungai Martapura, Kabupaten Banjar."),
    ("s04", "Pasarnya buka pagi-pagi sekali, sekitar [setengah enam], dan bubar sekitar setengah sepuluh."),
    ("s05", "Kebanyakan pedagangnya perempuan, memakai [tanggui], topi lebar khas Banjar dari daun nipah atau pandan."),
    ("s06", "Mereka membawa sayur, buah, dan kue tradisional dari kampung-kampung di sepanjang anak sungai."),
    ("s07", "Kok di atas sungai? Karena dulu, sungai adalah [jalan raya] utama masyarakat Banjar."),
    ("s08", "Uniknya, sebagian pedagang masih [barter]: tukar hasil kebun tanpa uang!"),
    ("s09", "Pasar terapung di Muara Kuin, Banjarmasin, bahkan diperkirakan sudah ada sejak [abad ke-14]."),
    ("s10", "Sayangnya, pasar terapung makin sepi karena orang beralih ke [pasar darat]."),
    ("s11", "Kamu pernah belanja di atas perahu? Ceritakan di komentar, dan follow [Kok Bisa] Kaltim!"),
]

# adegan -> (nomor gambar, gerak kamera, label, warna label)
SHOTS = {
    "s01": (1, "in", "Pasar tanpa lantai?", "#c0392b"),
    "s02": (2, "pan_r", "Jukung", "#9b6a35"),
    "s03": (3, "out", "Lok Baintan, Kalimantan Selatan", "#3a6ea5"),
    "s04": (4, "in", "±05.30–09.30 WITA", "#e07b00"),
    "s05": (5, "in", "Tanggui", "#2f7d3a"),
    "s06": (2, "pan_l", "Sayur • Buah • Kue", "#9b6a35"),
    "s07": (3, "pan_r", "Sungai = jalan raya", "#3a6ea5"),
    "s08": (6, "in", "Barter", "#7a3fb0"),
    "s09": (7, "out", "± abad ke-14 (ilustrasi)", "#6b4a2a"),
    "s10": (8, "pan_l", "Makin sepi", "#c0392b"),
    "s11": (1, "out", "", ""),
}

VOICE_SPANS = None

# --------------------------------------------------------------- gambar --
_cache = {}


def load_img(n):
    """Muat gambar/imgNN.* sebagai cairo surface (diubah ke PNG bila perlu)."""
    if n in _cache:
        return _cache[n]
    surf = None
    cands = sorted(IMG_DIR.glob(f"img{n:02d}.*"))
    if cands:
        png = IMG_DIR / f"_img{n:02d}.png"
        if not png.exists() or png.stat().st_mtime < cands[0].stat().st_mtime:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(cands[0]), str(png)], check=True)
        surf = cairo.ImageSurface.create_from_png(str(png))
    _cache[n] = surf
    return surf


def draw_cover(ctx, surf, z, dx, dy):
    """Gambar mengisi layar (cover), dengan zoom z dan geser (dx, dy) dalam piksel."""
    iw, ih = surf.get_width(), surf.get_height()
    base = max(W / iw, H / ih)
    s = base * z
    ctx.save()
    ctx.translate(W / 2 + dx, H / 2 + dy)
    ctx.scale(s, s)
    ctx.translate(-iw / 2, -ih / 2)
    ctx.set_source_surface(surf, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    ctx.paint()
    ctx.restore()


def placeholder(ctx, n, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc("#f2a65a"))
    g.add_color_stop_rgba(1, *hexc("#8a5f30"))
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(g)
    ctx.fill()
    text(ctx, f"GAMBAR {n:02d}", W / 2, 800, 110, WHITE, stroke=BLACK, sw=12)
    text(ctx, "belum ada", W / 2, 940, 60, WHITE, stroke=BLACK, sw=8)


def make_scene(name):
    n, move, label, col = SHOTS[name]

    def fn(ctx, lt, d, t):
        p = ease(lt / d)
        surf = load_img(n)
        if surf is None:
            placeholder(ctx, n, t)
        else:
            if move == "in":
                draw_cover(ctx, surf, 1.05 + 0.12 * p, 0, -20 * p)
            elif move == "out":
                draw_cover(ctx, surf, 1.17 - 0.12 * p, 0, 0)
            elif move == "pan_r":
                draw_cover(ctx, surf, 1.18, 60 - 120 * p, 0)
            else:
                draw_cover(ctx, surf, 1.18, -60 + 120 * p, 0)
        # gradasi bawah agar subtitle terbaca
        g = cairo.LinearGradient(0, 1250, 0, H)
        g.add_color_stop_rgba(0, 0, 0, 0, 0)
        g.add_color_stop_rgba(1, 0, 0, 0, 0.55)
        ctx.rectangle(0, 1250, W, H - 1250)
        ctx.set_source(g)
        ctx.fill()
        if label:
            label_chip(ctx, label, W / 2, 330, 48, hexc(col), k=seg(lt, 0.3, 0.8))
        if name == "s11":
            kc = seg(lt, d * 0.3, d * 0.5)
            if kc > 0:
                ctx.save()
                ctx.translate(W / 2, 420)
                ctx.scale(ease_out_back(kc), ease_out_back(kc))
                rrect(ctx, -330, -70, 660, 140, 44)
                setc(ctx, WHITE)
                ctx.fill()
                ctx.move_to(-80, 68)
                ctx.line_to(-110, 120)
                ctx.line_to(-30, 68)
                ctx.fill()
                text(ctx, "Pernah belanja di perahu?", 0, 0, 40, BLACK)
                ctx.restore()
    return fn


SCENE_FNS = {name: make_scene(name) for name, _ in SCENES}

if __name__ == "__main__":
    run(Episode(7, SCENES, SCENE_FNS, HERE / "pasar_terapung_shorts.mp4", voice_spans=VOICE_SPANS, music_key=0))
