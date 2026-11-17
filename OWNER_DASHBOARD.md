# Dashboard Owner Privat

- Buka `/owner` setelah login owner.
- Login tanpa parameter `next` diarahkan ke `/owner`.
- Halaman hanya menampilkan pendapatan dan pengeluaran yang tercatat pada tabel transaksi live, daftar produk, serta nama/email/tanggal pembuatan akun owner.
- Halaman memakai pemeriksaan sesi owner di server dan header `Cache-Control: private, no-store`.
- Halaman tidak menyediakan kontrol operasional bisnis, agen, kampanye, pelanggan, atau pengaturan usaha.
- Angka keuangan adalah catatan aplikasi; bukan saldo bank yang diverifikasi otomatis.
