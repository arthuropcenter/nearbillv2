import { statusColor } from '../utils/format'

export default function Badge({ children, status }) {
  const tone = status ? statusColor(status) : 'neutral'
  return <span className={`badge badge-${tone}`}>{children}</span>
}
