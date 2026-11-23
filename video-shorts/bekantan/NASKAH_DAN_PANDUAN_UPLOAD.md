# Kok Bisa? #5 – Bekantan, Kok Hidungnya Mancung Banget? (versi 2D)

File video: `bekantan_shorts.mp4` (1080×1920, 30 fps, ±61 detik, musik latar buatan sendiri, belum ada narasi).
Versi 3D (Google Flow) dan semua prompt-nya ada di dokumen "Paket Produksi 3D: Bekantan".

## Teks untuk ElevenLabs (salin semua, baris kosong = jeda)

```
Monyet ini punya julukan unik: monyet Belanda. Coba lihat hidungnya!

Namanya bekantan, monyet berhidung panjang yang cuma ada di Pulau Kalimantan.

Mereka tinggal di hutan mangrove dan tepi sungai.

Tapi hidung super panjang yang menggantung ini cuma dimiliki bekantan jantan dewasa.

Kok bisa?

Peneliti dari Kyoto University menemukan, makin besar hidung si jantan, makin besar juga tubuhnya.

Dan makin banyak betina di kelompoknya!

Hidung itu juga bikin suaranya lebih berat saat memanggil betina.

Jadi hidung besar itu ibarat lencana jantan yang kuat.

Bonusnya, bekantan jago berenang! Jari kakinya berselaput, dan mereka bisa menyeberangi sungai yang lebar.

Sayangnya, bekantan kini terancam punah karena hutan mangrove terus berkurang.

Menurutmu, hidung bekantan itu lucu atau keren? Tulis di komentar, dan follow Kok Bisa Kaltim!
```

Pengaturan: Voice Bagas – Deep & Relaxed, Eleven Multilingual v2, Stability 50%, Similarity 75%.
Kirim MP3-nya ke Claude → video disesuaikan otomatis dengan narasi (12 kalimat; jangan digabung).

## Judul, deskripsi, tagar

**Judul:** Bekantan, Kok Hidungnya Mancung Banget? Ternyata Ini Rahasianya! #shorts

**Deskripsi:**
Bekantan alias "monyet Belanda" cuma ada di Pulau Kalimantan. Tapi kenapa hanya jantan dewasa yang punya hidung super panjang?

Penelitian Kyoto University (Koda dkk., Science Advances 2018) menemukan: makin besar hidung bekantan jantan, makin besar tubuhnya dan makin banyak betina di kelompoknya. Hidungnya juga membuat suaranya lebih berat saat memanggil betina. Bonus: bekantan jago berenang berkat selaput di jari kakinya!

Sayangnya, bekantan berstatus terancam punah karena hutan mangrove terus berkurang. Yuk jaga mangrove Kalimantan.

Sumber: Kyoto University (2018); Dharma & Atmoko, Penerbit BRIN (2024).

👉 Subscribe: https://www.youtube.com/@kokbisakaltim?sub_confirmation=1

#shorts #kokbisa #bekantan #kalimantan #faunaendemik #satwaliar #mangrove #faktaunik #edukasi

## Membuat ulang

```bash
python3 make_video.py --preview preview.png
python3 make_video.py
python3 make_video.py --voice narasi.mp3   # isi VOICE_SPANS dulu
```
