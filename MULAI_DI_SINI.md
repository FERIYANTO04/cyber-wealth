# Mulai di sini — versi transfer bank tanpa Xendit

## Yang sudah ada di kode
- Checkout produk menggunakan instruksi transfer bank manual.
- Pesanan tetap `pending` sampai owner mencocokkan mutasi rekening dan menekan verifikasi.
- Schema pesanan memakai default `manual_transfer`; migrasi 0021 juga mengubah default database lama.
- Tidak ada paket atau pemanggilan API Xendit pada kode aplikasi saat ini. Referensi `xendit` yang tersisa di migrasi lama adalah riwayat schema; migrasi 0021 mengganti default akhirnya tanpa mengedit riwayat.
- Dashboard owner `/owner` hanya menampilkan ringkasan transaksi tercatat, produk, dan profil owner.

## Yang tetap wajib disiapkan oleh pemilik akun
1. Hosting server-side untuk Next.js (bukan static hosting).
2. PostgreSQL `DATABASE_URL` dan `JWT_SECRET` acak minimal 32 karakter.
3. `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER` dan `BANK_TRANSFER_INSTRUCTIONS`.
4. `GROQ_API_KEY` untuk fitur AI.
5. `META_APP_ID` dan `META_APP_SECRET`, persetujuan OAuth dan izin Meta untuk Facebook/Instagram.
6. `CRON_SECRET` dan scheduler HTTPS POST untuk autopilot terjadwal.
7. `EMAIL_API_KEY` dan `EMAIL_FROM` untuk email transaksi; `STORAGE_URL` dan `STORAGE_KEY` untuk penyimpanan file.

## Batas yang tidak bisa dihilangkan oleh kode saja
- Tanpa API bank resmi, website tidak dapat membaca saldo rekening atau mengirim penarikan otomatis. Transfer harus dilakukan melalui aplikasi bank dan dicocokkan secara manual.
- AI dan akun sosial tidak bisa aktif tanpa key, persetujuan dan akun pemilik yang sah.
- Saldo website adalah pembukuan aplikasi, bukan bukti saldo bank. Jangan menganggap target Rp500 miliar sebagai aset aktual.

## Pemeriksaan sebelum tayang
Jalankan `npm ci`, `npm run check`, `npm run build`, lalu `npm run db:migrate` pada database baru/backup yang sudah dipastikan benar. Setelah deploy, periksa `/api/health/ready`, login owner, buat pesanan uji, dan verifikasi hanya setelah transfer uji benar-benar masuk.
