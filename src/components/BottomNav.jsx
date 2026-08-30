import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Zap, Router, Menu } from 'lucide-react'

export default function BottomNav({ onMenu }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" end>
        <LayoutDashboard size={22} />
        Beranda
      </NavLink>
      <NavLink to="/customers">
        <Users size={22} />
        Pelanggan
      </NavLink>
      <NavLink to="/active">
        <Zap size={22} />
        Aktif
      </NavLink>
      <NavLink to="/routers">
        <Router size={22} />
        Jaringan
      </NavLink>
      <button type="button" style={{ color: 'var(--muted)' }} onClick={onMenu}>
        <Menu size={22} />
        Menu
      </button>
    </nav>
  )
}
