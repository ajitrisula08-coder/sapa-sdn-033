# Kok Bisa? #1 – Rumah Panggung di Kalimantan

File video: `rumah_panggung_shorts.mp4` (1080×1920, 30 fps, 76 detik, ada musik latar buatan sendiri)

## Naskah (untuk rekam suara narasi, opsional)

Bacalah dengan santai, seperti bercerita ke teman. Waktu di kiri = kapan kalimat mulai muncul di video.

| Waktu | Kalimat |
|---|---|
| 0:00 | Rumah di Kalimantan, kok kakinya tinggi banget? |
| 0:03.7 | Bayangin kamu tinggal di pinggir Sungai Mahakam. |
| 0:07.4 | Kamu bangun rumah langsung di atas tanah. |
| 0:11.1 | Tapi pas musim hujan, air sungai naik... |
| 0:14.8 | dan masuk ke rumahmu! Kasur basah, barang hanyut. |
| 0:18.9 | Jadi kamu tinggikan rumahmu pakai tiang kayu. |
| 0:22.6 | Banjir datang lagi... tapi airnya lewat di bawah. Aman! |
| 0:27.1 | Tanah di sini juga selalu lembap. |
| 0:30.4 | Lantai yang nempel tanah ikut lembap dan berjamur. Lantai panggung tetap kering. |
| 0:36.1 | Siang hari? Panas dan gerah, bisa 34 derajat! |
| 0:40.2 | Tapi angin bisa mengalir lewat kolong rumah... |
| 0:43.9 | dan celah lantai papan. Rumah jadi lebih adem. |
| 0:48.0 | Di pinggir sungai ada ular, biawak, bahkan buaya! |
| 0:52.1 | Rumah tinggi bikin hewan liar susah masuk. |
| 0:55.8 | Kolongnya juga berguna: simpan perahu, kayu bakar, sampai kandang ayam. |
| 1:00.7 | Tiangnya biasanya dari kayu ulin, si kayu besi Kalimantan. |
| 1:05.2 | Tahan air, tahan rayap, awet puluhan tahun! |
| 1:08.9 | Jadi rumah panggung bukan cuma tinggi... tapi cerdas! |
| 1:13.0 | Mau tahu Kok Bisa lainnya? Follow ya! |

Cara menambah suara: buka video di CapCut (gratis) → Audio → Rekam → bacakan naskah sambil melihat subtitle. Kecilkan volume musik ke ±20%.

## Judul, deskripsi, tagar

**Judul:** Rumah di Kalimantan Kok Kakinya Tinggi Banget? 🏠 #shorts

**Deskripsi:**
Kenapa rumah tradisional di pinggir Sungai Mahakam dibuat panggung? Ternyata ada 4 alasan cerdas: anti banjir, lantai tetap kering, lebih adem, dan aman dari hewan liar. Tiangnya pun dari kayu ulin, si kayu besi Kalimantan!

**Tagar:** #shorts #kokbisa #rumahpanggung #kalimantan #kalimantantimur #sungaimahakam #kayuulin #faktaunik #edukasi #belajarseru

## Tips upload & monetisasi

- **YouTube:** unggah dari aplikasi YouTube → tombol + → Shorts / Upload video. Video vertikal ≤ 3 menit otomatis jadi Shorts.
- **Facebook:** unggah sebagai **Reels** dari Halaman/Profil dengan Mode Profesional aktif.
- Pasang thumbnail/cover dari detik ke-1 (rumah panggung + tanda tanya).
- Unggah rutin (3–5 video/minggu) dengan seri "Kok Bisa?" agar penonton berlangganan.
- Video, gambar, dan musik dibuat sendiri dengan kode (`make_video.py`), jadi aman dari klaim hak cipta.
- Kalau ingin musik lain, matikan musik bawaan dan pilih dari Audio Library YouTube / Sound Collection Facebook.

## Membuat ulang / mengubah video

```bash
pip install pycairo numpy
python3 make_video.py --preview preview.png   # cek gambar semua adegan
python3 make_video.py                          # render MP4 (±1 menit)
```
Ubah teks naskah di daftar `SCENES` dalam `make_video.py`. Kata di dalam `[kurung siku]` tampil berwarna kuning.
