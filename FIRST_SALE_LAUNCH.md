# Peluncuran Penjualan Pertama Cyber Wealth

## Sasaran
Mendapatkan satu pesanan berbayar dari pelanggan sungguhan, mengonfirmasi pembayaran berdasarkan bukti dari penyedia pembayaran atau mutasi rekening, mengirimkan produk, dan mencatat pendapatan tepat satu kali.

Pesanan dibuat, klik, kunjungan halaman, dan invoice belum dihitung sebagai pendapatan.

## Produk awal yang sudah tersedia
- Produk: Panduan Konten Media Sosial
- Isi yang dijanjikan: kalender konten 30 hari, pilar konten, contoh caption, checklist unggahan, dan lembar evaluasi.
- Harga katalog: Rp99.000.
- Halaman katalog: `/toko`
- Halaman produk: `/toko/panduan-konten-media-sosial`
- File unduhan dibatasi untuk pesanan berstatus lunas.

Sebelum promosi, pastikan file PDF benar-benar bisa dibaca, sesuai deskripsi, dan bukan file contoh.

## Alur transaksi saat ini
1. Pembeli membuka halaman produk dan mengisi nama serta email.
2. Website membuat pesanan berstatus `pending`.
3. Pembeli menerima instruksi transfer dan kode pesanan.
4. Pembayaran hanya dicatat sebagai pendapatan setelah dana benar-benar masuk dan diverifikasi.
5. Sistem mencatat transaksi, mengirim produk, dan memberi notifikasi.

**Batas saat ini:** implementasi checkout memakai transfer bank manual. Belum ada integrasi payment gateway otomatis pada kode aplikasi. Untuk operasi tanpa verifikasi manual per pesanan, perusahaan harus memiliki akun merchant payment gateway, kredensial API, dan webhook yang sudah diuji. Jangan mengarang pembayaran atau menandai pesanan lunas hanya dari screenshot/klik.

## Pembayaran otomatis Midtrans (opsional, belum aktif)

Aplikasi kini mendukung Midtrans Snap sebagai pilihan pembayaran otomatis bila `MIDTRANS_SERVER_KEY` dikonfigurasi. Mode aman default adalah sandbox (`MIDTRANS_IS_PRODUCTION=false`). Untuk mengaktifkan pembayaran nyata, owner harus memiliki akun merchant Midtrans yang disetujui, memasukkan Server Key produksi ke secret hosting, mengatur `MIDTRANS_IS_PRODUCTION=true`, dan mengatur Payment Notification URL di dashboard Midtrans ke:

`https://<domain-aplikasi>/api/payments/midtrans`

Webhook memverifikasi signature SHA-512, kode pesanan, mata uang, dan nominal sebelum pesanan dilunasi. Status `pending` tidak dihitung sebagai pendapatan. Gunakan sandbox dan uji alur checkout/webhook terlebih dahulu; jangan mengaktifkan mode produksi sebelum verifikasi selesai. Biaya transaksi mengikuti perjanjian merchant Midtrans.

## Kesiapan konfigurasi
Nama variabel rekening bank terpisah (`BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`) belum tampak pada daftar variabel layanan Railway saat diperiksa. Variabel `BANK_TRANSFER_INSTRUCTIONS` tersedia, tetapi isi rahasianya tidak dibaca. Aplikasi telah diperbaiki agar blok instruksi khusus yang benar-benar memuat nama bank/rekening dan nomor rekening dapat dipakai sebagai instruksi lengkap.

Penyimpanan objek pada environment uji memakai nama variabel `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, dan `STORAGE_REGION`. Kode penyimpanan kini menerima nama tersebut sebagai alias selain nama AWS standar. Status integrasi juga memeriksa nama variabel yang benar.

## Materi promosi organik — draf, belum dipublikasikan

### Draf 1
Punya usaha tapi sering bingung mau posting apa hari ini?

Panduan Konten Media Sosial ini berisi kalender ide konten 30 hari, contoh caption, pilar konten, checklist unggahan, dan lembar evaluasi sederhana. Dirancang agar pemilik usaha kecil punya arah saat membuat konten.

Lihat detail dan isi panduannya: `/toko/panduan-konten-media-sosial`

### Draf 2
Konsisten membuat konten bukan berarti harus memikirkan ide dari nol setiap hari.

Mulai dengan rencana 30 hari: tentukan pilar konten, siapkan caption, lalu evaluasi hasil unggahan. Semua dirangkum dalam satu panduan PDF untuk usaha kecil.

Detail produk: `/toko/panduan-konten-media-sosial`

### Draf 3
Checklist sederhana sebelum mengunggah konten:
- Apakah konten ini membantu calon pelanggan?
- Apakah pesannya jelas?
- Apakah visual dan caption sesuai?
- Apakah ada ajakan bertindak?
- Apakah hasilnya akan dievaluasi?

Panduan Konten Media Sosial menyediakan kalender 30 hari dan alat bantu tersebut dalam satu PDF.

Lihat produk: `/toko/panduan-konten-media-sosial`

## Ukuran keberhasilan penjualan pertama
- Pengunjung unik ke halaman produk.
- Klik menuju checkout.
- Pesanan dibuat.
- Pesanan dibayar dan terverifikasi.
- Produk berhasil dikirim.
- Pendapatan bersih dihitung setelah biaya pembayaran dan biaya terkait.

Target pertama adalah satu penjualan terverifikasi, bukan angka omzet yang diproyeksikan.

## Langkah berikutnya
1. Verifikasi PDF dan halaman produk di environment uji.
2. Pastikan instruksi pembayaran benar atau pilih payment gateway yang disetujui dan aktif.
3. Uji checkout dari awal sampai pengiriman dengan transaksi uji yang tidak masuk pembukuan pendapatan.
4. Hubungkan kanal promosi yang benar-benar aktif; konten publik harus ditinjau sebelum diterbitkan.
5. Jalankan promosi organik, ukur funnel, dan perbaiki halaman berdasarkan data.
6. Setelah satu pembayaran nyata terverifikasi, cocokkan transaksi, biaya, dan pengiriman sebelum menyatakan penjualan pertama berhasil.

Tidak ada iklan berbayar, biaya pihak ketiga, kontrak, atau pemindahan dana tanpa persetujuan eksplisit owner.
