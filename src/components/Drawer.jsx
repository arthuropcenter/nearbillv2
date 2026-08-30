import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  Users,
  Zap,
  Router,
  Gauge,
  MapPin,
  Activity,
  Headset,
  Settings,
  ShieldCheck,
  User,
  LogOut,
  Wallet,
  X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initials } from '../utils/format'

const BRAND_LOGO = '/nearbillv2/dist/icons/logo.png'

export default function Drawer({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!open) return null

  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/login')
  }

  const link = (to, icon, label, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => 'drawer-link' + (isActive ? ' active' : '')}
      onClick={onClose}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="drawer-brand">
            <img src={BRAND_LOGO} alt="NearHome" />
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--bg)',
            borderRadius: 14,
            padding: 12,
            marginBottom: 16
          }}
        >
          <div className="avatar">{initials(user?.fullname || user?.username)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.fullname || user?.username}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.user_type}</div>
          </div>
        </div>

        {link('/home', <Home size={19} />, 'Portal Home', true)}
        {link('/dashboard', <LayoutDashboard size={19} />, 'Dashboard', true)}
        {link('/customers', <Users size={19} />, 'Pelanggan')}
        {link('/active', <Zap size={19} />, 'Pelanggan Aktif')}
        {link('/routers', <Router size={19} />, 'Router')}
        {link('/network-map', <MapPin size={19} />, 'Peta Jaringan')}
        {link('/traffic', <Activity size={19} />, 'Grafik Jaringan')}
        {link('/bandwidth', <Gauge size={19} />, 'Bandwidth')}

        <div className="drawer-sep" />

        {link('/helpdesk', <Headset size={19} />, 'Helpdesk')}
        {user?.user_type === 'AdminGM' && link('/finance', <Wallet size={19} />, 'Keuangan')}
        {user?.user_type === 'AdminGM' && link('/users', <ShieldCheck size={19} />, 'Users')}
        {link('/profile', <User size={19} />, 'Profil')}
        {link('/settings', <Settings size={19} />, 'Pengaturan')}
        <a className="drawer-link" style={{ cursor: 'pointer' }} onClick={handleLogout}>
          <LogOut size={19} />
          <span>Keluar</span>
        </a>
      </aside>
    </>
  )
}
