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

export type AutopilotTask = 'ceo' | 'research' | 'product' | 'marketing' | 'sales' | 'finance' | 'intelligence'

export const TASKS: { task: AutopilotTask; agentRole: string; label: string; description: string }[] = [
  {
    task: 'ceo',
    agentRole: 'AI CEO',
    label: 'Strategi harian',
    description: 'Menyusun ringkasan kondisi bisnis dan prioritas hari ini dari data nyata.',
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
    description: 'Menyiapkan draf produk baru dengan model AI, siap Anda tinjau sebelum terbit.',
  },
  {
    task: 'marketing',
    agentRole: 'AI Marketing',
    label: 'Pemasaran',
    description: 'Membuat draf konten promosi dan draf konten sosial untuk produk yang sudah terbit.',
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
    description: 'Merangkum pemasukan yang sudah terkonfirmasi dan pengeluaran tercatat.',
  },
  {
    task: 'intelligence',
    agentRole: 'AI Business Intelligence',
    label: 'Intelijen bisnis',
    description: 'Membaca penjualan, prospek, konten, dan langganan yang benar-benar tercatat, lalu menyimpulkan apa yang bekerja.',
  },
]

// ── Social studio vocabulary ──────────────────────────────────────────────
// Client-safe: components show channel names and limits without importing the
// database module.
export type ChannelKey = 'telegram' | 'x' | 'linkedin' | 'tiktok'

export const CHANNELS: { key: ChannelKey; label: string; limit: number; note: string }[] = [
  { key: 'telegram', label: 'Telegram Channel', limit: 4000, note: 'Distribusi langsung ke kanal Telegram milik bisnis.' },
  { key: 'x', label: 'X (Twitter)', limit: 280, note: 'Paling ringkas — satu gagasan per kiriman.' },
  { key: 'linkedin', label: 'LinkedIn', limit: 3000, note: 'Untuk pembeli perusahaan dan profesional.' },
  { key: 'tiktok', label: 'TikTok', limit: 2200, note: 'Naskah video pendek, kalimat pembuka yang menahan.' },
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
  Indonesia: ['telegram', 'tiktok'],
  International: ['linkedin', 'x'],
}
