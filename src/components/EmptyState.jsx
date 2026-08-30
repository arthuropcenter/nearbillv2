export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state">
      {icon}
      <h4 style={{ color: 'var(--text)', marginBottom: 4 }}>{title || 'Tidak ada data'}</h4>
      {subtitle && <p style={{ fontSize: 13.5 }}>{subtitle}</p>}
    </div>
  )
}
