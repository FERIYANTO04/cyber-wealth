PERBAIKAN ERROR DATABASE NETLIFY

Perubahan:
- Menghapus fallback localhost 127.0.0.1:5432 yang menyebabkan ECONNREFUSED.
- Aplikasi sekarang memberi pesan error yang jelas jika DATABASE_URL tidak tersedia atau formatnya salah.

PENTING:
Perubahan kode ini belum otomatis masuk ke situs Netlify yang sudah online. Untuk menerapkannya, source project harus diunggah ke repository/deployment yang terhubung ke Netlify, lalu deploy ulang.
Pastikan di Netlify Environment Variables ada:
Key: DATABASE_URL
Value: connection string Neon lengkap (postgresql://...)
Scope: Functions/All scopes (jika pilihan scope tersedia)
Jangan pernah membagikan nilai/password DATABASE_URL.
