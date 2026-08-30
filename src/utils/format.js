export function rupiah(angka) {
  const n = Number(angka || 0)
  return 'Rp' + n.toLocaleString('id-ID')
}

export function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function statusColor(status) {
  const s = String(status || '').toLowerCase()
  if (['active', 'online', 'paid', 'success', 'used', 'enabled'].includes(s)) return 'success'
  if (['expired', 'banned', 'offline', 'failed', 'canceled', 'disabled'].includes(s)) return 'danger'
  if (['inactive', 'suspended', 'limited', 'unused', 'pending'].includes(s)) return 'warning'
  return 'neutral'
}

export function initials(name) {
  if (!name) return '?'
  const words = String(name).trim().split(/\s+/)
  const first = words[0]?.[0] || ''
  const second = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + second).toUpperCase()
}

export function maskPassword(pw) {
  if (!pw) return '-'
  return '••••••'
}
