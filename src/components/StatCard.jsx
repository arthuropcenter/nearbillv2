export default function StatCard({ icon, label, value, delta, deltaTone = 'success', color = 'primary' }) {
  const palettes = {
    primary: { bg: 'var(--primary-light)', color: 'var(--primary)' },
    success: { bg: 'var(--success-bg)', color: 'var(--success)' },
    danger: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    info: { bg: 'var(--info-bg)', color: 'var(--info)' },
    purple: { bg: 'rgba(167, 139, 250, 0.2)', color: '#c4b5fd' }
  }
  const pal = palettes[color] || palettes.primary

  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: pal.bg, color: pal.color }}>
        {icon}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta !== undefined && (
        <div className="stat-delta" style={{ color: deltaTone === 'danger' ? 'var(--danger)' : 'var(--success)' }}>
          {delta}
        </div>
      )}
    </div>
  )
}
