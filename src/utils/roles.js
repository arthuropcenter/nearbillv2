import {
  User,
  Wrench,
  Headset,
  Gamepad2,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Zap,
  Router,
  Gauge,
  MapPin,
  Settings,
  BarChart3,
  FileText,
  Store,
  Home,
  CreditCard,
  LifeBuoy,
  Activity,
  UserPlus,
  Wallet
} from 'lucide-react'

export const ROLE_META = {
  customer:  { label: 'Pelanggan',   sub: 'Akun pelanggan',      icon: User,      color: '#06b6d4' },
  Teknisi:   { label: 'Teknisi',     sub: 'Staf teknis',         icon: Wrench,    color: '#f59e0b' },
  AdminCS:   { label: 'Helpdesk',    sub: 'Customer service',    icon: Headset,   color: '#22c55e' },
  AdminGM:   { label: 'Game Master', sub: 'Admin utama',         icon: Gamepad2,  color: '#a855f7' },
  Report:    { label: 'Report',      sub: 'Laporan',             icon: BarChart3, color: '#64748b' },
  Agent:     { label: 'Agent',       sub: 'Agen',                icon: Store,     color: '#0ea5e9' },
  Sales:     { label: 'Sales',       sub: 'Penjualan',           icon: FileText,  color: '#0ea5e9' }
}

export function roleMeta(type) {
  return ROLE_META[type] || { label: type || 'Akun', sub: 'Akun', icon: User, color: '#64748b' }
}

const STAFF = ['AdminCS', 'Teknisi', 'AdminGM', 'Report', 'Agent', 'Sales']

export const PORTAL_APPS = [
  { id: 'dashboard',  label: 'Dashboard',        desc: 'Aplikasi utama',       icon: LayoutDashboard, path: '/dashboard',  roles: STAFF,                          ready: true },
  { id: 'customers',  label: 'Pelanggan',        desc: 'Kelola pelanggan',     icon: Users,            path: '/customers',  roles: STAFF.filter((t) => t !== 'Teknisi'), ready: true },
  { id: 'registrasi', label: 'Registrasi',       desc: 'Input pelanggan baru', icon: UserPlus,         path: '/customers/new', roles: ['AdminGM', 'AdminCS', 'Teknisi'], ready: true },
  { id: 'active',     label: 'Pelanggan Aktif',  desc: 'Yang sedang aktif',    icon: Zap,              path: '/active',     roles: STAFF,                          ready: true },
  { id: 'routers',    label: 'Router',           desc: 'Perangkat jaringan',   icon: Router,           path: '/routers',    roles: ['AdminGM', 'Teknisi'],         ready: true },
  { id: 'network-map', label: 'Peta Jaringan',   desc: 'Peta ODC/ODP & pelanggan', icon: MapPin,      path: '/network-map', roles: ['AdminGM', 'Teknisi'],         ready: true },
  { id: 'traffic',     label: 'Grafik Jaringan', desc: 'Monitor trafik interface', icon: Activity,     path: '/traffic',    roles: ['AdminGM', 'Teknisi'],         ready: true },
  { id: 'bandwidth',  label: 'Bandwidth',        desc: 'Paket & kecepatan',    icon: Gauge,            path: '/bandwidth',  roles: ['AdminGM'],                     ready: true },
  { id: 'teknisi',    label: 'Teknisi',          desc: 'Halaman teknisi',      icon: Wrench,           path: '/teknisi',    roles: ['AdminGM', 'Teknisi'],         ready: true },
  { id: 'cs',         label: 'Helpdesk',         desc: 'Tiket, pembayaran & pengumuman', icon: Headset, path: '/helpdesk', roles: ['AdminGM', 'AdminCS', 'Teknisi'], ready: true },
  { id: 'gm',         label: 'Game Master',      desc: 'Halaman game master',  icon: Gamepad2,         path: '/gm',         roles: ['AdminGM'],                     ready: true },
  { id: 'my',         label: 'Akun Saya',        desc: 'Beranda pelanggan',    icon: User,             path: '/my',         roles: ['customer'],                    ready: true },
  { id: 'my-payments', label: 'Tagihan',         desc: 'Bayar & konfirmasi',   icon: CreditCard,       path: '/my/payments', roles: ['customer'],                  ready: true },
  { id: 'my-helpdesk', label: 'Bantuan',         desc: 'Laporan & keluhan',    icon: LifeBuoy,         path: '/my/helpdesk', roles: ['customer'],                   ready: true },
  { id: 'users',      label: 'Users',            desc: 'Kelola pengguna & role', icon: ShieldCheck,   path: '/users',      roles: ['AdminGM'],                     ready: true },
  { id: 'finance',    label: 'Keuangan',         desc: 'Laba-rugi, kas & tagihan', icon: Wallet,       path: '/finance',    roles: ['AdminGM'],                     ready: true },
  { id: 'settings',   label: 'Pengaturan',       desc: 'Preferensi aplikasi',  icon: Settings,         path: '/settings',   roles: STAFF,                          ready: true }
]

export function appsForRole(type) {
  return PORTAL_APPS.filter((a) => a.roles.includes('*') || a.roles.includes(type))
}

export const ROLE_NAV = {
  customer: [
    { icon: Home,        label: 'Beranda',      path: '/home',      ready: true },
    { icon: User,        label: 'Akun Saya',    path: '/my',        ready: true },
    { icon: CreditCard,  label: 'Tagihan',      path: '/my/payments', ready: true },
    { icon: LifeBuoy,    label: 'Bantuan',      path: '/my/helpdesk', ready: true }
  ],
  Teknisi: [
    { icon: Home,        label: 'Beranda',      path: '/home',       ready: true },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', ready: true },
    { icon: Router,      label: 'Router',       path: '/routers',    ready: true },
    { icon: MapPin,      label: 'Peta',         path: '/network-map', ready: true },
    { icon: Activity,    label: 'Grafik',       path: '/traffic',     ready: true },
    { icon: Activity,    label: 'Aktif',        path: '/active',     ready: true },
    { icon: UserPlus,    label: 'Registrasi',   path: '/customers/new', ready: true },
    { icon: Headset,     label: 'Helpdesk',     path: '/helpdesk',   ready: true },
    { icon: Wrench,      label: 'Teknis',       path: '/teknisi',    ready: true },
    { icon: Settings,    label: 'Pengaturan',   path: '/settings',   ready: true }
  ],
  AdminCS: [
    { icon: Home,        label: 'Beranda',      path: '/home',       ready: true },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', ready: true },
    { icon: Users,       label: 'Pelanggan',    path: '/customers',  ready: true },
    { icon: Headset,     label: 'Helpdesk',     path: '/helpdesk',   ready: true },
    { icon: Settings,    label: 'Pengaturan',   path: '/settings',   ready: true }
  ],
  AdminGM: [
    { icon: Home,        label: 'Beranda',      path: '/home',       ready: true },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', ready: true },
    { icon: Users,       label: 'Pelanggan',    path: '/customers',  ready: true },
    { icon: Router,      label: 'Router',       path: '/routers',    ready: true },
    { icon: MapPin,      label: 'Peta',         path: '/network-map', ready: true },
    { icon: Activity,    label: 'Grafik',       path: '/traffic',     ready: true },
    { icon: Gauge,       label: 'Bandwidth',    path: '/bandwidth',  ready: true },
    { icon: Wrench,      label: 'Teknisi',      path: '/teknisi',    ready: true },
    { icon: Headset,     label: 'Helpdesk',     path: '/helpdesk',   ready: true },
    { icon: Wallet,      label: 'Keuangan',     path: '/finance',    ready: true },
    { icon: Gamepad2,    label: 'Game Master',  path: '/gm',         ready: true },
    { icon: ShieldCheck, label: 'Users',        path: '/users',      ready: true },
    { icon: Settings,    label: 'Pengaturan',   path: '/settings',   ready: true }
  ]
}

const STAFF_FALLBACK = [
  { icon: Home, label: 'Beranda', path: '/home', ready: true },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', ready: true },
  { icon: Users, label: 'Pelanggan', path: '/customers', ready: true },
  { icon: Settings, label: 'Pengaturan', path: '/settings', ready: true }
]

export function roleNav(type) {
  if (ROLE_NAV[type]) return ROLE_NAV[type]
  if (STAFF.includes(type)) return STAFF_FALLBACK
  return ROLE_NAV.customer
}

export const DEFAULT_FAVS = {
  customer: ['my', 'my-payments', 'my-helpdesk'],
  AdminCS: ['dashboard', 'customers', 'cs'],
  AdminGM: ['dashboard', 'customers', 'routers', 'cs', 'users'],
  Teknisi: ['dashboard', 'teknisi', 'routers', 'cs', 'registrasi']
}
