-- Four published tiers, the shape a buyer expects on a pricing page: a free tier to
-- start, then Basic / Pro / Premium monthly and yearly. Prices are the owner's own
-- commercial decision, so they live here as data the owner can edit from the console
-- (Langganan), never as numbers baked into a page.
--
-- Safe on a database that already holds these codes: it refreshes the copy and price,
-- and always leaves the owner's own rows and every subscriber's record untouched.
INSERT INTO "plan" ("id", "code", "name", "summary", "features", "price_idr", "interval", "status")
VALUES
  (md5(random()::text || clock_timestamp()::text), 'free', 'Gratis',
   'Mulai tanpa biaya: katalog, pesanan, dan laporan dasar untuk mencoba seluruh alur.',
   E'Satu pengguna\nKatalog produk digital\nPesanan dan unduhan otomatis\nRingkasan penjualan dasar',
   0, 'month', 'published'),

  (md5(random()::text || clock_timestamp()::text), 'basic', 'Basic',
   'Untuk penjual pertama yang ingin menerima pembayaran dan mengirim produk otomatis.',
   E'Satu pengguna\nKatalog dan pesanan tanpa batas\nPembayaran QRIS, transfer bank, e-wallet\nUnduhan otomatis setelah lunas\nLaporan penjualan bulanan',
   149000, 'month', 'published'),

  (md5(random()::text || clock_timestamp()::text), 'pro', 'Pro',
   'Untuk yang serius menjual: otomatisasi pemasaran, konten, dan tindak lanjut pelanggan.',
   E'Lima pengguna\nSemua di Basic\nAutopilot produk dan pemasaran\nKonten sosial terjadwal\nLangganan berulang dan tagihan otomatis\nLaporan keuangan lengkap',
   349000, 'month', 'published'),

  (md5(random()::text || clock_timestamp()::text), 'premium', 'Premium',
   'Untuk tim yang menjalankan beberapa lini pendapatan sekaligus dan butuh kendali penuh.',
   E'Pengguna tanpa batas\nSemua di Pro\nAgen AI tanpa batas\nPortal anggota dan komisi affiliate\nPrioritas dukungan lewat email\nEkspor data penuh',
   699000, 'month', 'published'),

  (md5(random()::text || clock_timestamp()::text), 'basic-tahunan', 'Basic tahunan',
   'Basic dibayar sekali untuk setahun — dua bulan lebih murah daripada bulanan.',
   E'Satu pengguna\nKatalog dan pesanan tanpa batas\nPembayaran QRIS, transfer bank, e-wallet\nUnduhan otomatis setelah lunas\nDibayar sekali setahun',
   1490000, 'year', 'published'),

  (md5(random()::text || clock_timestamp()::text), 'pro-tahunan', 'Pro tahunan',
   'Pro dibayar sekali untuk setahun — dua bulan lebih murah daripada bulanan.',
   E'Lima pengguna\nSemua di Basic\nAutopilot produk dan pemasaran\nKonten sosial terjadwal\nLangganan berulang dan tagihan otomatis\nDibayar sekali setahun',
   3490000, 'year', 'published'),

  (md5(random()::text || clock_timestamp()::text), 'premium-tahunan', 'Premium tahunan',
   'Premium dibayar sekali untuk setahun — dua bulan lebih murah daripada bulanan.',
   E'Pengguna tanpa batas\nSemua di Pro\nAgen AI tanpa batas\nPortal anggota dan komisi affiliate\nPrioritas dukungan lewat email\nDibayar sekali setahun',
   6990000, 'year', 'published')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "summary" = EXCLUDED."summary",
  "features" = EXCLUDED."features",
  "price_idr" = EXCLUDED."price_idr",
  "interval" = EXCLUDED."interval",
  "status" = 'published';

-- The two earlier sample codes are superseded by the set above. They are unpublished
-- rather than deleted, so any subscriber already attached to one keeps its row.
UPDATE "plan" SET "status" = 'draft' WHERE "code" IN ('starter', 'tahunan-starter');
