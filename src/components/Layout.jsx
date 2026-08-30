import { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from './Header'
import BottomNav from './BottomNav'
import Drawer from './Drawer'
import Sidebar from './Sidebar'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/customers': 'Pelanggan',
  '/customers/new': 'Tambah Pelanggan',
  '/active': 'Pelanggan Aktif',
  '/routers': 'Router',
  '/routers/new': 'Tambah Router',
  '/network-map': 'Peta Jaringan',
  '/traffic': 'Grafik Jaringan',
  '/bandwidth': 'Bandwidth',
  '/bandwidth/new': 'Tambah Bandwidth',
  '/settings': 'Pengaturan',
  '/users': 'Users',
  '/finance': 'Keuangan',
  '/profile': 'Profil'
}

// Rute yang menampilkan tombol kembali
const MAIN_TABS = ['/dashboard', '/customers', '/active', '/routers', '/network-map', '/traffic', '/bandwidth', '/settings', '/users', '/finance']

export default function Layout() {
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const path = location.pathname

  // Pelanggan tidak memakai shell admin (Sidebar/BottomNav staf)
  if (user?.user_type === 'customer') return <Navigate to="/my" replace />

  const isEdit = path.includes('/edit')
  let title = TITLES[path] || 'Detail'
  if (path === '/customers/new') title = 'Tambah Pelanggan'
  if (path === '/routers/new') title = 'Tambah Router'
  if (path === '/bandwidth/new') title = 'Tambah Bandwidth'
  if (/^\/customers\/\d+$/.test(path)) title = 'Detail Pelanggan'
  if (/^\/customers\/\d+\/edit$/.test(path)) title = 'Detail Pelanggan'
  if (isEdit) title = 'Edit Data'

  const showBack = !MAIN_TABS.includes(path)

  return (
    <div className="app-frame">
      <Sidebar />
      <div className="desktop-main">
        <Header title={title} onMenu={() => setDrawerOpen(true)} showBack={showBack} />
        <main className="desktop-content">
          <Outlet />
        </main>
      </div>
      <BottomNav onMenu={() => setDrawerOpen(true)} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
