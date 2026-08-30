import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Home as HomeIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { roleMeta, roleNav } from '../utils/roles'
import { initials } from '../utils/format'

const BRAND_LOGO = '/nearbillv2/dist/icons/logo.png'

export default function PortalShell({ wide = false, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const role = roleMeta(user?.user_type)
  const nav = roleNav(user?.user_type)
  const isCustomer = user?.user_type === 'customer'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="tg-login has-nav">
      <div className="tg-glow" />

      <header className="tg-topbar">
        <img className="tg-topbar-logo" src={BRAND_LOGO} alt="NearHome" />
        <div className="tg-user">
          <div className="avatar">{initials(user?.fullname || user?.username)}</div>
          <div className="tg-user-info">
            <b>{user?.fullname || user?.username}</b>
            <span style={{ color: role.color }}>{role.label}</span>
          </div>
          <NavLink className="tg-home-btn" to="/home" title="Portal Home" aria-label="Portal Home">
            <HomeIcon size={17} />
          </NavLink>
          <button className="tg-logout" onClick={handleLogout} title="Keluar" aria-label="Keluar">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <nav className={'rp-nav' + (isCustomer ? ' bottom' : '')} aria-label="Navigasi">
        {nav.map((item) => {
          const Icon = item.icon
          return item.ready ? (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/my'}
              className={({ isActive }) => 'rp-nav-item' + (isActive ? ' active' : '')}
              style={({ isActive }) => (isActive ? { color: role.color } : undefined)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <span key={item.label} className="rp-nav-item soon" title="Segera hadir">
              <Icon size={16} />
              <span>{item.label}</span>
            </span>
          )
        })}
      </nav>

      <div className={wide ? 'ps-body wide' : 'ps-body' + (isCustomer ? ' has-bottom-nav' : '')}>{children}</div>
    </div>
  )
}
