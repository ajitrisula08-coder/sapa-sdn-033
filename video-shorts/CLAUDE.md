# Panduan kerja: channel KOK BISA? KALTIM (@kokbisakaltim)

Folder ini berisi generator video Shorts seri "Kok Bisa?" (mesin bersama: `kokbisa_engine.py`, satu folder per episode).

## Aturan dari pemilik channel

- **Setiap video selesai, selalu berikan di chat**: judul YouTube, deskripsi lengkap (siap salin), dan hashtag. Deskripsi memuat ringkasan fakta, sumber, link subscribe `https://www.youtube.com/@kokbisakaltim?sub_confirmation=1`, dan hashtag (3 pertama: `#shorts #kokbisa #<topik>`).
- Bahasa: Indonesia santai dan mudah dipahami.
- Jangan membuat ulang topik yang sudah ada (rumah panggung, Sungai Mahakam cokelat, durian, pesut, bekantan).
- Topik budaya Dayak: jangan pakai kata "seram", "mengerikan", "mistis", "angker"; gunakan "unik", "penuh makna", "sakral". Sebut kelompok Dayak yang relevan; jangan campur atribut antarkelompok. Tari Hudoq ditunda sampai ada persetujuan narasumber Dayak Bahau/Modang.
- Akurasi: riset dan baca sumber penuh sebelum menulis naskah; bedakan fakta, legenda, dan versi yang berbeda; jangan klaim yang belum terverifikasi.
- Buat daftar ide dan minta persetujuan sebelum memproduksi episode baru.
- Narasi ElevenLabs paket Free tidak boleh dipakai untuk video yang dimonetisasi; ingatkan pemilik.

## Alur produksi

1. Riset (sumber dibaca penuh) → naskah 45–60 detik → video 2D (`python3 make_video.py`).
2. Pemilik membuat narasi (ElevenLabs, suara "Bagas", Multilingual v2) → kirim MP3.
3. Ukur jeda kalimat (`ffmpeg -af silencedetect=noise=-35dB:d=0.12`), isi `VOICE_SPANS`, render `--voice narasi_bagas.mp3`.
4. Kirim video + judul/deskripsi/hashtag di chat, commit, push.
