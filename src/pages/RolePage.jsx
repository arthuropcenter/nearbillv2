import { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogOut, Hammer, Construction, Home as HomeIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { roleMeta, roleNav, appsForRole } from '../utils/roles'
import { initials } from '../utils/format'
import PortalWidget from '../components/PortalWidget'

const BRAND_LOGO = '/icons/logo.png'

const MODULES = {
  teknisi: { app: 'teknisi', title: 'Modul Teknisi',   desc: 'Penugasan pemasangan, perbaikan, dan laporan teknis.' },
  cs:      { app: 'cs',      title: 'Modul Helpdesk',  desc: 'Layanan pelanggan, tiket keluhan, dan follow-up.' },
  gm:      { app: 'gm',      title: 'Modul Game Master', desc: 'Manajemen game, turnamen, dan konten game.' },
  my:      { app: 'my',      title: 'Akun Saya',       desc: 'Profil, langganan, dan riwayat tagihan.' }
}

export default function RolePage({ module }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const role = roleMeta(user?.user_type)
  const nav = roleNav(user?.user_type)
  const meta = MODULES[module]
  const allowed = meta && appsForRole(user?.user_type).some((a) => a.id === meta.app)
  const recommended = appsForRole(user?.user_type).filter((a) => a.id !== (meta?.app || ''))

  useEffect(() => {
    if (!allowed) navigate('/home', { replace: true })
  }, [allowed, navigate])

  const handleLogout = async (e) => {
    e.stopPropagation()
    await logout()
    navigate('/login')
  }

  if (!allowed || !meta) return null

  return (
    <div className="tg-login">
      <div className="tg-glow" />

      <header className="tg-topbar">
        <img className="tg-topbar-logo" src={BRAND_LOGO} alt="NearHome" />
        <div className="tg-user">
          <div className="avatar">{initials(user?.fullname || user?.username)}</div>
          <div className="tg-user-info">
            <b>{user?.fullname || user?.username}</b>
            <span style={{ color: role.color }}>{role.label}</span>
          </div>
          <Link className="tg-home-btn" to="/home" title="Portal Home" aria-label="Portal Home">
            <HomeIcon size={17} />
          </Link>
          <button className="tg-logout" onClick={handleLogout} title="Keluar" aria-label="Keluar">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <nav className="rp-nav" aria-label="Navigasi peran">
        {nav.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path
          return item.ready ? (
            <Link key={item.label} to={item.path} className={`rp-nav-item${active ? ' active' : ''}`} style={active ? { color: role.color } : undefined}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          ) : (
            <span key={item.label} className="rp-nav-item soon" title="Segera hadir">
              <Icon size={16} />
              <span>{item.label}</span>
            </span>
          )
        })}
      </nav>

      <div className="tg-center tg-home">
        <div className="rp-hero">
          <span className="rp-hero-icon" style={{ background: role.color + '22', color: role.color }}>
            <Construction size={26} />
          </span>
          <div>
            <h1>{meta.title}</h1>
            <p>{meta.desc}</p>
          </div>
          <span className="rp-soon">
            <Hammer size={14} /> Dalam pengembangan
          </span>
        </div>

        <PortalWidget apps={recommended} />
      </div>
    </div>
  )
}
