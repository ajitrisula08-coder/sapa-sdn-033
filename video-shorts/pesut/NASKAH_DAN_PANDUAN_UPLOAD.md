# Kok Bisa? #4 – Pesut Mahakam, Kok Bisa Hidup di Sungai?

File video: `pesut_shorts.mp4` (1080×1920, 30 fps, 74 detik, musik latar buatan sendiri, belum ada narasi)

## Teks untuk ElevenLabs (salin semua, baris kosong = jeda)

```
Pesut Mahakam, kok bisa hidup di sungai?

Biasanya kan lumba-lumba hidup di laut.

Bayangin kamu seekor pesut, kerabat lumba-lumba.

Rumahmu bukan laut, tapi Sungai Mahakam yang airnya tawar.

Tubuhmu sudah menyesuaikan diri dengan air sungai.

Kepalamu bulat, moncongmu pendek, dan lehermu lentur buat menoleh.

Tapi air sungai kan cokelat. Kamu nggak bisa lihat jauh!

Tenang, kamu punya sonar!

Kamu mengeluarkan bunyi klik... dan gemanya memantul balik.

Dari gema itu, kamu tahu di mana ikan bersembunyi.

Kamu juga harus naik ke permukaan untuk bernapas.

Kadang kamu malah menyemburkan air dari mulut!

Sayangnya, pesut Mahakam sekarang tinggal sedikit.

Jumlahnya diperkirakan kurang dari seratus ekor.

Banyak yang terjerat jaring, terganggu kapal, atau kekurangan ikan.

Ayo bantu: jangan buang sampah ke sungai, dan lapor kalau melihat pesut terjerat!

Jadi pesut bisa hidup di sungai karena tubuh dan sonarnya cocok untuk Mahakam.

Mau tahu Kok Bisa lainnya? Follow ya!
```

Pakai suara yang sama (Bagas, Eleven Multilingual v2). Kirim MP3-nya ke Claude → video disesuaikan otomatis dengan narasi.

## Judul, deskripsi, tagar

**Judul:** Pesut Mahakam, Lumba-lumba yang Hidup di Sungai! Kok Bisa? 🐬 #shorts

**Deskripsi:**
Lumba-lumba biasanya di laut, tapi pesut Mahakam hidup di sungai air tawar Kalimantan Timur! Tubuhnya cocok untuk sungai, dan di air yang keruh ia "melihat" pakai sonar (gema bunyi klik). Sayangnya jumlahnya diperkirakan tinggal kurang dari 100 ekor. Yuk bantu jaga Sungai Mahakam!

**Tagar:** #shorts #kokbisa #pesutmahakam #pesut #sungaimahakam #kalimantantimur #satwaliar #konservasi #faktaunik #edukasi

## Catatan fakta
- Pesut Mahakam adalah populasi air tawar dari lumba-lumba Irrawaddy (*Orcaella brevirostris*), fauna identitas Kalimantan Timur.
- Ciri: kepala bulat tanpa moncong panjang, sirip punggung kecil, leher lentur sehingga bisa menoleh.
- Menggunakan ekolokasi (sonar) untuk mencari ikan di air keruh; bernapas lewat lubang di atas kepala; dikenal bisa menyemburkan air dari mulut.
- Status: sangat terancam punah. Survei konservasi beberapa tahun terakhir memperkirakan jumlahnya di kisaran 60–an hingga kurang dari 100 ekor. Ancaman utama: terjerat jaring, lalu lintas kapal, berkurangnya ikan, dan pencemaran.
- Jika menemukan pesut terjerat/terdampar, laporkan ke BKSDA Kalimantan Timur atau lembaga konservasi setempat.

## Membuat ulang

```bash
pip install pycairo numpy
python3 make_video.py --preview preview.png
python3 make_video.py
python3 make_video.py --voice narasi.mp3   # isi VOICE_SPANS dulu
```
