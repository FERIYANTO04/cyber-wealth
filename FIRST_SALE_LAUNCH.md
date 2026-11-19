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
3. Checkout menampilkan instruksi transfer manual jika konfigurasi rekening tersedia, atau mengarahkan pembeli ke halaman pembayaran Midtrans bila gateway sudah dikonfigurasi.
4. Pembayaran manual hanya dicatat setelah dana masuk diverifikasi dari mutasi rekening. Pembayaran Midtrans hanya dicatat setelah webhook bertanda tangan valid mengonfirmasi status dan nominal.
5. Setelah pembayaran terverifikasi, sistem mencatat pendapatan satu kali dan mencoba mengirim produk serta notifikasi.

**Batas saat ini:** kode aplikasi sudah mendukung Midtrans Snap dan webhook, tetapi integrasi itu belum aktif di TEST karena kredensial merchant Midtrans belum dikonfigurasi. Transfer bank manual tetap memerlukan pemeriksaan mutasi rekening oleh pemilik. Jangan mengarang pembayaran atau menandai pesanan lunas hanya dari screenshot/klik.

## Pembayaran otomatis Midtrans (opsional, belum aktif)

Aplikasi kini mendukung Midtrans Snap sebagai pilihan pembayaran otomatis bila `MIDTRANS_SERVER_KEY` dikonfigurasi. Mode aman default adalah sandbox (`MIDTRANS_IS_PRODUCTION=false`). Untuk mengaktifkan pembayaran nyata, owner harus memiliki akun merchant Midtrans yang disetujui, memasukkan Server Key produksi ke secret hosting, mengatur `MIDTRANS_IS_PRODUCTION=true`, dan mengatur Payment Notification URL di dashboard Midtrans ke:

`https://<domain-aplikasi>/api/payments/midtrans`

Webhook memverifikasi signature SHA-512, kode pesanan, mata uang, dan nominal sebelum pesanan dilunasi. Status `pending` tidak dihitung sebagai pendapatan. Gunakan sandbox dan uji alur checkout/webhook terlebih dahulu; jangan mengaktifkan mode produksi sebelum verifikasi selesai. Biaya transaksi mengikuti perjanjian merchant Midtrans.

## Kesiapan konfigurasi
Pemeriksaan daftar nama variabel TEST terbaru menemukan `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, dan `BANK_TRANSFER_INSTRUCTIONS`. Nilai rahasianya tidak dibaca. Keberadaan nama variabel belum membuktikan rekening benar atau pembayaran telah diuji; jalankan pemeriksaan koneksi dan verifikasi instruksi di halaman Owner.

Variabel penyimpanan TEST juga tersedia dengan nama `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, dan `STORAGE_REGION`. Kode menerima nama tersebut sebagai alias selain nama AWS standar. Koneksi penyimpanan tetap perlu diuji langsung.

Pada pemeriksaan TEST terbaru, `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, `EMAIL_API_KEY`, dan `EMAIL_FROM` belum ada dalam daftar variabel. Karena itu pembayaran otomatis dan email transaksional belum siap. Nama variabel Meta App ID dan App Secret tersedia, tetapi belum ada akun sosial yang tercatat terhubung di database TEST. Jangan menempelkan nilai rahasia ke dokumen atau chat.

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
1. Uji koneksi AI, penyimpanan, rekening, email, dan kanal Meta dari halaman Integrasi sebagai Owner.
2. Verifikasi PDF dan halaman produk di environment TEST.
3. Aktifkan Midtrans sandbox hanya setelah akun merchant dan kredensial sandbox tersedia; uji webhook tanpa membukukan pembayaran nyata.
4. Uji checkout, status pesanan, penguncian unduhan, dan pengiriman email dari awal sampai akhir.
5. Hubungkan kanal promosi yang benar-benar aktif; tinjau materi dan aturan persetujuan publikasi.
6. Siapkan backup database, pemantauan, dan prosedur pemulihan sebelum operasi produksi.
7. Setelah satu pembayaran nyata terverifikasi, cocokkan transaksi, biaya, dan pengiriman sebelum menyatakan penjualan pertama berhasil.

Tidak ada iklan berbayar, biaya pihak ketiga, kontrak, atau pemindahan dana tanpa persetujuan eksplisit owner.
