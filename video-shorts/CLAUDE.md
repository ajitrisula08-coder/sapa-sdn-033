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

## Standar video baru (mulai episode Gambut, hasil evaluasi 25 Nov 2026)

Dokumen lengkap: "Evaluasi Konten & Standar Baru – KOK BISA? KALTIM" (Claude Docs).
- Durasi 35–45 detik (±100–110 kata), ganti adegan tiap 2–3 detik.
- Kalimat pertama ≤ 8 kata, langsung kejutan; jangan dibuka dengan nama tempat.
- Teks hook besar sudah tampil di frame 0; objek utama close-up.
- Zona aman 1080×1920: teks di y 1.000–1.250 px, lebar maks 820 px, jauhi 180 px kanan dan 560 px terbawah; jangan taruh apa pun di 200 px teratas.
- Visual utama: gambar AI (Google Flow, dibuat pemilik) + gerak kamera tegas, kabut, kilau air; 1 klip video Flow untuk hook bila kredit cukup. 2D hanya untuk diagram.
- Penutup: frame judul besar 1 detik (untuk sampul) + kata "subscribe" + pertanyaan komentar.
- Judul YouTube pakai pola "Alasan…/Rahasia…/Kok Bisa…" + 1 emoji.
