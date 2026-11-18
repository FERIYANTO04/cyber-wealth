# Cyber Wealth — Growth Engine & Owner Wealth Separation

## Tujuan
Membangun Cyber Wealth sebagai perusahaan dengan beberapa sumber pendapatan yang dapat berkembang, bukan hanya bergantung pada jam kerja karyawan atau satu produk. Sistem harus membedakan keuangan perusahaan dari kekayaan pribadi owner.

## Dua target yang terpisah

### 1. Kekayaan pribadi owner
- Target aspiratif: Rp500.000.000.000.
- Ditampilkan hanya pada ruang privat owner.
- Dihitung dari aset pribadi yang benar-benar dimiliki dikurangi kewajiban pribadi.
- Tidak boleh mengambil saldo, omzet, valuasi, atau aset perusahaan sebagai kekayaan pribadi owner kecuali ada transaksi distribusi/pembayaran yang sah dan tercatat.
- Target bukan saldo aktual dan tidak boleh diperlakukan sebagai uang yang tersedia.

### 2. Pertumbuhan perusahaan Cyber Wealth
- Tidak memakai plafon target Rp500 miliar.
- Ukur dengan metrik terpisah: kas perusahaan terverifikasi, pendapatan, biaya, laba/rugi, arus kas, kewajiban, aset perusahaan, pelanggan aktif, pendapatan berulang, dan kinerja tiap unit bisnis.
- Valuasi perusahaan, proyeksi, pipeline, dan target harus diberi label estimasi/proyeksi; jangan dicampur dengan kas atau aset aktual.

## Mesin pertumbuhan

1. **Business Discovery** — riset masalah pelanggan, pasar, kompetitor, ukuran peluang, biaya awal, risiko, dan bukti permintaan.
2. **Business Builder** — merancang penawaran, MVP, harga, proses layanan, dan eksperimen pasar berbiaya rendah.
3. **Revenue Engine** — kanal akuisisi pelanggan, penjualan, pembayaran, layanan pelanggan, retensi, dan langganan.
4. **Business Operations** — SOP, kualitas, kapasitas, otomatisasi, dan pemantauan kinerja.
5. **Capital & Investment Management** — menyusun anggaran, menjaga cadangan kas, menilai risiko, dan mengusulkan investasi.
6. **Expansion** — memperbesar unit bisnis yang sudah menunjukkan permintaan, margin, retensi, dan arus kas sehat; hentikan atau perbaiki eksperimen yang gagal.

## Struktur peran AI
- **AI CEO:** menyusun strategi, menetapkan prioritas, mengoordinasikan unit, dan menyampaikan rekomendasi kepada owner.
- **AI CFO:** pembukuan, arus kas, anggaran, proyeksi, pemisahan dana, dan kontrol risiko.
- **AI CMO:** riset pasar, positioning, pemasaran, eksperimen akuisisi, dan analisis konversi.
- **AI COO:** SOP, operasi, kapasitas, kualitas, dan produktivitas.
- **AI CTO:** teknologi, keamanan, integrasi, otomatisasi, dan reliabilitas.

Peran AI adalah sistem pendukung keputusan dan otomasi. Jangan menyatakan AI telah melakukan pekerjaan eksternal atau menghasilkan pendapatan tanpa bukti sistem/transaksi.

## Kebijakan uang dan persetujuan
- Rekening dan aset owner harus terpisah dari rekening dan aset perusahaan.
- Transfer antara owner dan perusahaan harus dicatat sebagai transaksi yang sesuai (misalnya setoran modal, pinjaman, penggantian biaya, gaji, dividen/distribusi) dan didukung bukti.
- AI boleh menganalisis dan mengusulkan alokasi anggaran; AI tidak boleh memindahkan uang, melakukan investasi, menarik dana, membayar pihak ketiga, atau membuat komitmen keuangan tanpa otorisasi eksplisit sesuai batas yang ditetapkan owner.
- Pengeluaran berulang, pembelian aset, investasi, pinjaman, dan transaksi di atas ambang persetujuan wajib menunggu persetujuan owner.
- Simpan audit trail: siapa mengusulkan, siapa menyetujui, jumlah, tujuan, waktu, status, dan bukti transaksi.
- Tetapkan dana cadangan operasional dan batas risiko sebelum menjalankan investasi.

## Standar kebenaran data
Setiap angka harus diberi status:
- **Terverifikasi:** didukung bukti transaksi atau rekonsiliasi sumber eksternal.
- **Tercatat:** dimasukkan ke pembukuan tetapi belum direkonsiliasi.
- **Proyeksi:** estimasi atau rencana masa depan.
- **Menunggu persetujuan:** proposal yang belum disetujui.
- **Gagal/dibatalkan:** tidak boleh dihitung sebagai pendapatan atau aset.

Jangan membuat saldo, omzet, laba, pelanggan, investasi, atau valuasi fiktif. Website adalah sistem pencatatan dan pengendalian; tampilan saldo bank hanya boleh disebut saldo bank jika terhubung dan berhasil direkonsiliasi dengan sumber bank.

## Urutan implementasi yang disarankan
1. Audit model data, otorisasi, dan halaman owner yang sudah ada.
2. Terapkan pemisahan ledger owner dan ledger perusahaan tanpa menghapus histori transaksi.
3. Tambahkan dashboard target owner Rp500 miliar sebagai target progres, bukan saldo.
4. Tambahkan dashboard pertumbuhan perusahaan dengan metrik aktual dan proyeksi terpisah.
5. Bangun Business Discovery sebagai ruang proposal peluang usaha.
6. Bangun Business Builder sebagai pipeline eksperimen/MVP dengan status dan biaya.
7. Hubungkan persetujuan owner untuk komitmen dana dan tindakan berisiko.
8. Uji di lingkungan non-production, validasi migrasi dan akses, baru rencanakan rilis production setelah hasil tes dan persetujuan.

## Batasan rilis
Dokumen ini adalah spesifikasi arah produk, bukan bukti bahwa fitur telah dibangun. Jangan mengubah data keuangan live, menjalankan migrasi production, atau mengaktifkan transfer/investasi otomatis hanya berdasarkan dokumen ini.
