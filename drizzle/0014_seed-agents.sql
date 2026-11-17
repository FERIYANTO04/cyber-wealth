-- The seven agents are the app's own team, not sample content: the console cannot
-- show, pause, or run anything until they exist. A fresh production database gets
-- them here, so a first publish comes up with a working console.
-- Idempotent by role: a database that already holds them (the preview, seeded) is
-- left untouched, and a re-run adds nothing.
INSERT INTO "agent" ("id", "name", "role", "mandate", "status", "data_source", "sort_order")
SELECT v.id, v.name, v.role, v.mandate, 'active', 'live', v.sort_order
FROM (VALUES
  ('agent-ai-ceo', 'Aurora — AI CEO', 'AI CEO',
   'Menyusun arah bisnis mingguan, membagi prioritas ke agen lain, dan menaikkan setiap keputusan strategis ke pemilik.', 1),
  ('agent-ai-market-research', 'Nusantara — Riset Pasar', 'AI Market Research',
   'Memantau pasar internasional, regulasi, dan risiko geopolitik yang berdampak pada produk dan harga.', 2),
  ('agent-ai-product-creator', 'Karya — Produk Digital', 'AI Product Creator',
   'Menyusun produk digital dan paket langganan, termasuk harga dan halaman penjualannya.', 3),
  ('agent-ai-marketing', 'Gema — Pemasaran', 'AI Marketing',
   'Menjalankan kampanye yang sudah disetujui, menulis konten, dan menguji pesan penawaran.', 4),
  ('agent-ai-sales', 'Rangkul — Tindak Lanjut', 'AI Sales',
   'Menjawab pertanyaan calon pelanggan dan mengingatkan langganan yang hampir berakhir.', 5),
  ('agent-ai-finance', 'Bendahara — Keuangan', 'AI Finance',
   'Merapikan arus kas dan mengajukan setiap pengeluaran ke pusat persetujuan. Tidak dapat memindahkan dana sendiri.', 6),
  ('agent-ai-business-intelligence', 'Cakra — Intelijen Bisnis', 'AI Business Intelligence',
   'Membaca penjualan, prospek, konten, dan langganan yang tercatat untuk menunjukkan apa yang benar-benar menghasilkan uang. Tidak pernah memperkirakan angka.', 7)
) AS v(id, name, role, mandate, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "agent" a WHERE a."role" = v.role
);
