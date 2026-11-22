/** Labels shared by server pages and browser components — no database import here. */
export const SERVICE_STATUS: { value: string; label: string }[] = [
  { value: 'new', label: 'Baru' },
  { value: 'proposed', label: 'Draf penawaran' },
  { value: 'proposal_sent', label: 'Penawaran terkirim' },
  { value: 'won', label: 'Disetujui klien' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'delivered', label: 'Selesai' },
  { value: 'lost', label: 'Tidak lanjut' },
]

export type AutopilotTask = 'ceo' | 'research' | 'product' | 'marketing' | 'sales' | 'finance' | 'intelligence' | 'science' | 'patents' | 'engineering' | 'prototype' | 'academic' | 'transfer' | 'security' | 'quality' | 'legal' | 'procurement'

export const TASKS: { task: AutopilotTask; agentRole: string; label: string; description: string }[] = [
  {
    task: 'ceo',
    agentRole: 'AI CEO',
    label: 'Strategi harian',
    description: 'Menetapkan strategi, memilih agen, membagi pekerjaan, mengevaluasi hasil, dan menentukan tindak lanjut seluruh perusahaan.',
  },
  {
    task: 'research',
    agentRole: 'AI Market Research',
    label: 'Riset pasar',
    description: 'Mencari sinyal permintaan dari produk, pesanan, dan permintaan jasa yang benar-benar ada.',
  },
  {
    task: 'product',
    agentRole: 'AI Product Creator',
    label: 'Produk digital',
    description: 'Mengembangkan produk digital lengkap untuk marketplace; hasil yang belum lolos pemeriksaan tetap menjadi draf.',
  },
  {
    task: 'marketing',
    agentRole: 'AI Marketing',
    label: 'Pemasaran',
    description: 'Mengoptimalkan halaman, penawaran, dan merchandising marketplace Cyber Wealth; tidak menerbitkan konten media sosial perusahaan.',
  },
  {
    task: 'sales',
    agentRole: 'AI Sales',
    label: 'Penjualan',
    description: 'Menandai calon pelanggan dan pesanan yang belum ditindaklanjuti.',
  },
  {
    task: 'finance',
    agentRole: 'AI Finance',
    label: 'Keuangan',
    description: 'Mengelola laporan keuangan, menyusun anggaran, dan memberi AI CEO dasar untuk memutuskan alokasi serta prioritas pengeluaran.',
  },
  {
    task: 'intelligence',
    agentRole: 'AI Business Intelligence',
    label: 'Intelijen bisnis',
    description: 'Membaca penjualan, prospek, konten, dan langganan yang benar-benar tercatat, lalu menyimpulkan apa yang bekerja.',
  },
  {
    task: 'science',
    agentRole: 'AI Chief Scientific Officer',
    label: 'Riset penemuan',
    description: 'Menyusun kandidat penemuan lintas disiplin dengan hipotesis dan bukti yang masih harus diverifikasi.',
  },
  {
    task: 'patents',
    agentRole: 'AI Patent Intelligence',
    label: 'Intelijen paten',
    description: 'Menyusun peta prior-art dan daftar pemeriksaan paten; tidak mengklaim kebaruan tanpa sumber.',
  },
  {
    task: 'engineering',
    agentRole: 'AI Systems Engineering',
    label: 'Rekayasa sistem',
    description: 'Menerjemahkan kandidat penemuan menjadi arsitektur, spesifikasi, BOM awal, dan rencana verifikasi.',
  },
  {
    task: 'prototype',
    agentRole: 'AI Prototype Engineering',
    label: 'Prototipe & validasi',
    description: 'Menyusun rencana prototipe, manufaktur, pengujian, metrik, dan analisis risiko.',
  },
  {
    task: 'academic',
    agentRole: 'AI Academic Partnerships',
    label: 'Kemitraan akademik',
    description: 'Menyiapkan dossier ilmiah dan mengelola pipeline kolaborasi profesor/universitas di bawah mandat AI CEO.',
  },
  {
    task: 'transfer',
    agentRole: 'AI Technology Transfer',
    label: 'Komersialisasi teknologi',
    description: 'Mengkaji kesiapan teknologi, lisensi, perlindungan IP, dan calon pengguna institusional.',
  },
  { task: 'security', agentRole: 'AI Security & Compliance', label: 'Keamanan & kepatuhan', description: 'Audit keamanan aplikasi, privasi, akses, backup, dan kepatuhan.' },
  { task: 'quality', agentRole: 'AI Quality & Reliability', label: 'Kualitas & keandalan', description: 'Menguji checkout, pembayaran, file delivery, UX, bug, dan mutu produk.' },
  { task: 'legal', agentRole: 'AI Legal & IP Counsel', label: 'Hukum & kekayaan intelektual', description: 'Memetakan risiko kontrak, merek, hak cipta, paten, privasi, dan kebutuhan ahli hukum.' },
  { task: 'procurement', agentRole: 'AI Procurement Intelligence', label: 'Pengadaan & vendor', description: 'Membandingkan vendor, alat, komponen, harga, dan risiko pemasok.' },
]

 // ── Social studio vocabulary ──────────────────────────────────────────────
// Client-safe: components show channel names and limits without importing the
// database module.
export type ChannelKey = 'x' | 'linkedin' | 'tiktok' | 'youtube'

export const CHANNELS: { key: ChannelKey; label: string; limit: number; note: string }[] = [
  { key: 'x', label: 'X (Twitter)', limit: 280, note: 'Paling ringkas — satu gagasan per kiriman.' },
  { key: 'linkedin', label: 'LinkedIn', limit: 3000, note: 'Untuk pembeli perusahaan dan profesional.' },
  { key: 'tiktok', label: 'TikTok', limit: 2200, note: 'Naskah video pendek, kalimat pembuka yang menahan.' },
  { key: 'youtube', label: 'YouTube', limit: 5000, note: 'Judul, deskripsi, tautan produk, dan metadata video YouTube.' },
]

export function channelLabel(key: string): string {
  return CHANNELS.find((channel) => channel.key === key)?.label ?? key
}

export function channelLimit(key: string): number {
  return CHANNELS.find((channel) => channel.key === key)?.limit ?? 500
}

/** A short label per channel for dense rows. */
export function channelShort(key: string): string {
  return CHANNELS.find((channel) => channel.key === key)?.label.replace(' (Twitter)', '').replace(' Page', '').replace(' Bisnis', '') ?? key
}

export const MARKETS = [
  { key: 'Indonesia', label: 'Indonesia', language: 'Bahasa Indonesia' },
  { key: 'International', label: 'Internasional', language: 'English' },
] as const

export const MARKET_CHANNELS: Record<string, ChannelKey[]> = {
  Indonesia: ['tiktok', 'youtube'],
  International: ['linkedin', 'x', 'youtube'],
}
