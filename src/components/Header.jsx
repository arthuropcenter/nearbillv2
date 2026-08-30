import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { initials } from '../utils/format'

const BRAND_LOGO = '/nearbillv2/dist/icons/logo.png'

export default function Header({ title, onMenu, showBack = false, onBack }) {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      {showBack ? (
        <button className="icon-btn" onClick={() => (onBack ? onBack() : navigate(-1))} aria-label="Kembali">
          <ArrowLeft size={19} />
        </button>
      ) : (
        <div className="brand only-mobile">
          <img src={BRAND_LOGO} alt="NearHome" className="brand-logo" />
        </div>
      )}
      <div className="header-title">{title}</div>
      <button className="icon-btn only-mobile" onClick={onMenu} aria-label="Menu">
        <MoreVertical size={19} />
      </button>
    </header>
  )
}

export function HeaderProfile() {
  return <div className="avatar">{initials('Admin')}</div>
}
