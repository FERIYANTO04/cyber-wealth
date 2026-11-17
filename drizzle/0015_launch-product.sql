-- The one product that ships with a real deliverable: a 12-page PDF bundled in the
-- app at public/downloads/, served only to a paid order through /api/orders/download.
-- Safe to run on a database that already holds the row: it updates the copy and the
-- price, and never touches orders, customers or anything a visitor created.
UPDATE "product"
SET status = 'draft'
WHERE slug = 'template-laporan-keuangan-umkm';

INSERT INTO "product" (
  id, slug, name, summary, description, category, price_idr, status,
  deliverable_note, data_source
)
VALUES (
  md5(random()::text || clock_timestamp()::text),
  'panduan-konten-media-sosial',
  'Panduan konten media sosial',
  'Kalender konten 30 hari untuk usaha kecil, lengkap dengan contoh caption dan ide visual.',
  'Panduan PDF 12 halaman berisi kalender konten 30 hari, pilar konten, template caption, checklist unggahan, dan lembar evaluasi sederhana.',
  'ebook',
  99000,
  'published',
  'PDF Panduan Konten Media Sosial 30 Hari. Unduhan tersedia setelah pembayaran terkonfirmasi.',
  'live'
)
ON CONFLICT (slug) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_idr = EXCLUDED.price_idr,
  status = 'published',
  deliverable_note = EXCLUDED.deliverable_note,
  data_source = 'live';
