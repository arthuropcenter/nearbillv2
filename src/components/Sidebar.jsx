import { NavLink, useNavigate, Link } from 'react-router-dom'
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
  LogOut,
  ShieldCheck,
  Wallet
} from 'lucide-react'

const BRAND_LOGO = '/nearbillv2/dist/icons/logo.png'
import { useAuth } from '../context/AuthContext'
import { initials } from '../utils/format'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const link = (to, icon, label, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
      {icon}
      <span>{label}</span>
    </NavLink>
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={BRAND_LOGO} alt="NearHome" className="sidebar-logo-img" />
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-group-label">Utama</div>
        {link('/home', <Home size={18} />, 'Portal Home', true)}
        {link('/dashboard', <LayoutDashboard size={18} />, 'Dashboard', true)}
        {link('/customers', <Users size={18} />, 'Pelanggan')}
        {link('/active', <Zap size={18} />, 'Pelanggan Aktif')}

        <div className="sidebar-group-label">Jaringan</div>
        {link('/routers', <Router size={18} />, 'Router')}
        {link('/network-map', <MapPin size={18} />, 'Peta Jaringan')}
        {link('/traffic', <Activity size={18} />, 'Grafik Jaringan')}
        {link('/bandwidth', <Gauge size={18} />, 'Bandwidth')}

        <div className="sidebar-group-label">Lainnya</div>
        {link('/helpdesk', <Headset size={18} />, 'Helpdesk')}
        {user?.user_type === 'AdminGM' && link('/finance', <Wallet size={18} />, 'Keuangan')}
        {user?.user_type === 'AdminGM' &&
          link('/users', <ShieldCheck size={18} />, 'Users')}
        {link('/settings', <Settings size={18} />, 'Pengaturan')}
      </nav>

      <div className="sidebar-footer">
        <Link to="/profile" className="sidebar-user" title="Profil" style={{ flex: 1 }}>
          <div className="avatar">{initials(user?.fullname || user?.username)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.fullname || user?.username}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{user?.user_type}</div>
          </div>
        </Link>
        <button className="sidebar-logout" onClick={handleLogout} title="Keluar">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}
