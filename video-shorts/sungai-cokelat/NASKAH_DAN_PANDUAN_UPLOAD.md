# Kok Bisa? #2 – Air Sungai Mahakam, Kok Warnanya Cokelat?

File video: `sungai_cokelat_shorts.mp4` (1080×1920, 30 fps, 78 detik, musik latar buatan sendiri, belum ada narasi)

## Teks untuk ElevenLabs (salin semua, baris kosong = jeda)

```
Air Sungai Mahakam, kok warnanya cokelat?

Padahal air hujan yang jatuh itu bening.

Bayangin kamu jadi setetes air hujan di hulu.

Kamu jatuh ke tanah, lalu mengalir menuruni bukit.

Sambil jalan, kamu bawa butiran tanah halus. Namanya lumpur.

Akar pohon biasanya memegang tanah supaya tidak terbawa.

Tapi kalau hutannya gundul, tanah gampang terkikis.

Jutaan tetes air ikut membawa lumpur ke sungai.

Arus sungai yang deras terus mengaduk lumpur itu.

Jadi lumpurnya melayang, tidak sempat turun ke dasar.

Hasilnya? Air sungai jadi cokelat!

Coba ambil segelas air sungai, lalu diamkan semalam.

Lumpurnya pelan-pelan mengendap di dasar gelas.

Airnya jadi lebih jernih! Tapi belum tentu aman diminum, ya.

Lumpur yang terbawa juga bikin tanah di tepi sungai jadi subur.

Tapi kalau terlalu banyak, sungai jadi dangkal dan gampang banjir.

Makanya, jaga hutan dan jangan buang sampah ke sungai!

Jadi air sungai cokelat itu karena lumpur yang melayang.

Mau tahu Kok Bisa lainnya? Follow ya!
```

Pakai suara yang sama dengan episode #1 (Bagas, Eleven Multilingual v2) supaya seri terasa konsisten.
Kirim MP3-nya ke Claude → video akan disesuaikan otomatis dengan narasi.

## Judul, deskripsi, tagar

**Judul:** Air Sungai Mahakam Kok Cokelat? Ini Rahasianya! 🌊 #shorts

**Deskripsi:**
Air hujan itu bening, tapi kenapa Sungai Mahakam berwarna cokelat? Jawabannya: lumpur! Hujan mengikis tanah, lumpur terbawa ke sungai, lalu arus deras membuatnya terus melayang. Coba percobaan segelas air sungai di rumah! (Ingat: air yang sudah jernih belum tentu aman diminum.)

**Tagar:** #shorts #kokbisa #sungaimahakam #kalimantantimur #sains #faktaunik #edukasi #belajarseru #jagahutan #lingkungan

## Ide percobaan untuk guru / orang tua
1. Ambil air sungai/parit ke dalam gelas bening.
2. Foto, lalu diamkan semalam tanpa digoyang.
3. Bandingkan besok paginya: lumpur mengendap di dasar.
4. Diskusikan: kenapa di sungai lumpurnya tidak mengendap? (karena arus terus mengaduk)

## Membuat ulang

```bash
pip install pycairo numpy
python3 make_video.py --preview preview.png   # cek gambar semua adegan
python3 make_video.py                          # render MP4
python3 make_video.py --voice narasi.mp3       # versi narasi (isi VOICE_SPANS dulu)
```
