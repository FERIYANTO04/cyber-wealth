const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat('id-ID')

export function money(value: number): string {
  return idr.format(value)
}

export function compactMoney(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000_000) return `Rp ${number.format(Math.round(value / 100_000_000_000) / 10)} T`
  if (abs >= 1_000_000_000) return `Rp ${number.format(Math.round(value / 100_000_000) / 10)} M`
  if (abs >= 1_000_000) return `Rp ${number.format(Math.round(value / 100_000) / 10)} jt`
  if (abs >= 1_000) return `Rp ${number.format(Math.round(value / 100) / 10)} rb`
  return money(value)
}

export function count(value: number): string {
  return number.format(value)
}

export function dateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(d)
}

export function dayLabel(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(d)
}

export function relativeTime(value: string | Date | null): string {
  if (!value) return 'belum pernah'
  const d = typeof value === 'string' ? new Date(value) : value
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return dateTime(d)
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.max(0, Math.min(100, (part / whole) * 100))
}
