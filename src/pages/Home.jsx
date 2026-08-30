import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Wrench, AlertTriangle, Info, Pencil, Check, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { roleMeta, appsForRole, DEFAULT_FAVS } from '../utils/roles'
import { initials } from '../utils/format'
import { api } from '../api/client'
import PortalWidget from '../components/PortalWidget'

const BRAND_LOGO = '/nearbillv2/dist/icons/logo.png'

const ANN_ICON = { info: Info, maintenance: Wrench, outage: AlertTriangle }
const ANN_BG = { info: 'rgba(59,130,246,.14)', maintenance: 'rgba(245,158,11,.14)', outage: 'rgba(239,68,68,.16)' }
const ANN_COLOR = { info: '#60a5fa', maintenance: '#fbbf24', outage: '#f87171' }

const FAV_PREFIX = 'nb_favs_'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const role = roleMeta(user?.user_type)
  const apps = appsForRole(user?.user_type)
  const favKey = FAV_PREFIX + user?.id

  const [anns, setAnns] = useState([])
  const [favs, setFavs] = useState([])
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (user?.user_type !== 'customer') return
    api('/announcements.php')
      .then((res) => setAnns(res.data || []))
      .catch(() => {})
  }, [user?.user_type])

  useEffect(() => {
    let list
    try {
      const saved = JSON.parse(localStorage.getItem(favKey))
      if (Array.isArray(saved) && saved.length > 0) list = saved
    } catch (e) { /* abaikan */ }
    if (!list) {
      list = DEFAULT_FAVS[user?.user_type] || apps.map((a) => a.id).slice(0, 4)
    }
    setFavs(list)
    setLoaded(true)
  }, [favKey, user?.user_type])

  const toggleFav = (id) => {
    setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const saveFavs = () => {
    localStorage.setItem(favKey, JSON.stringify(favs))
    setEditing(false)
    push('Menu favorit diperbarui')
  }

  const handleLogout = async (e) => {
    e.stopPropagation()
    await logout()
    navigate('/login')
  }

  const openApp = (app) => {
    if (!app.ready) {
      push(`Modul “${app.label}” belum tersedia — sedang dikembangkan`)
      return
    }
    navigate(app.path)
  }

  const favApps = favs.map((id) => apps.find((a) => a.id === id)).filter(Boolean)
  const favIds = new Set(favs)

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
          <button className="tg-logout" onClick={handleLogout} title="Keluar" aria-label="Keluar">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="tg-center tg-home">
        <img className="tg-logo" src={BRAND_LOGO} alt="NearHome" draggable={false} />
        <h1 className="tg-hello">Selamat datang, {user?.fullname || user?.username}</h1>
        <p className="tg-tagline">
          Peran <b style={{ color: role.color }}>{role.label}</b>
        </p>

        {anns.length > 0 && (
          <div className="tg-anns">
            {anns.slice(0, 3).map((a) => {
              const Icon = ANN_ICON[a.category] || Info
              return (
                <div key={a.id} className="tg-ann" style={{ background: ANN_BG[a.category] || ANN_BG.info }}>
                  <Icon size={17} style={{ color: ANN_COLOR[a.category] || ANN_COLOR.info, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.title}</div>
                    {a.message ? <div style={{ fontSize: 12, opacity: 0.85 }}>{a.message}</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14 }}>
            <Star size={15} style={{ color: role.color }} /> Menu Favorit
          </div>
          {editing ? (
            <button className="btn btn-sm btn-primary" onClick={saveFavs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Check size={13} /> Simpan
            </button>
          ) : (
            <button className="btn btn-sm btn-outline" onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>

        <div className="tg-apps">
          {editing ? (
            apps.map((app) => {
              const Icon = app.icon
              const on = favIds.has(app.id)
              return (
                <button
                  key={app.id}
                  className={`tg-app${on ? '' : ' soon'}`}
                  onClick={() => toggleFav(app.id)}
                  style={on ? { border: '1px solid ' + role.color } : undefined}
                >
                  <span className="tg-app-icon" style={{ background: on ? role.color + '22' : 'rgba(255,255,255,.05)', color: on ? role.color : 'var(--muted)' }}>
                    <Icon size={24} />
                  </span>
                  <span className="tg-app-name">{app.label}</span>
                  <span className="tg-app-desc">{on ? 'Favorit' : 'Tambah ke favorit'}</span>
                  <ChevronRight className="tg-app-arrow" size={15} style={{ opacity: on ? 1 : 0.4 }} />
                </button>
              )
            })
          ) : loaded && favApps.length === 0 ? (
            <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 13, width: '100%', maxWidth: 420 }}>
              Belum ada menu favorit. Tekan <b>Edit</b> untuk memilih menu yang sering dipakai.
            </div>
          ) : (
            favApps.map((app) => {
              const Icon = app.icon
              return (
                <button key={app.id} className={`tg-app${app.ready ? '' : ' soon'}`} onClick={() => openApp(app)}>
                  <span className="tg-app-icon" style={{ background: role.color + '22', color: role.color }}>
                    <Icon size={24} />
                  </span>
                  <span className="tg-app-name">{app.label}</span>
                  <span className="tg-app-desc">{app.ready ? app.desc : 'Segera hadir'}</span>
                  {app.ready && <ChevronRight className="tg-app-arrow" size={15} />}
                </button>
              )
            })
          )}
        </div>

        <PortalWidget apps={favApps} />
      </div>
    </div>
  )
}
