# Pembayaran transfer bank manual

- Pembeli membuat pesanan; status tetap `pending`.
- Website menampilkan rekening tujuan dari `BANK_NAME`, `BANK_ACCOUNT_NAME`, dan `BANK_ACCOUNT_NUMBER`.
- Pembeli mencantumkan kode pesanan pada berita transfer.
- Pemilik memeriksa mutasi rekening secara mandiri.
- Untuk produk, pemilik membuka menu Katalog produk dan menekan **Verifikasi transfer masuk** pada pesanan yang cocok.
- Untuk langganan, pemilik membuka menu Paket dan pelanggan, lalu menekan **Verifikasi transfer** pada pendaftaran yang cocok.
- Sistem baru mengaktifkan produk/langganan dan mencatat pendapatan setelah tindakan verifikasi pemilik.
- Tidak ada Xendit, virtual account, QRIS, auto-debit, saldo bank langsung, atau transfer keluar otomatis. Penarikan/refund tetap dilakukan melalui aplikasi bank sampai tersedia API resmi bank yang mendukungnya.

Jangan pernah mengonfirmasi pembayaran hanya dari screenshot pembeli. Cocokkan nominal, rekening pengirim, waktu, dan referensi pada mutasi rekening.
