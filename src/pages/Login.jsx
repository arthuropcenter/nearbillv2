import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn, Search, X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ROLE_META, appsForRole } from '../utils/roles'
import PortalWidget from '../components/PortalWidget'

const BRAND_LOGO = '/nearbillv2/dist/icons/logo.png'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return now
}

const pad = (n) => String(n).padStart(2, '0')

export default function Login() {
  const { login } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const now = useClock()

  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(false)
  const timer = useRef(null)

  const checkRole = useCallback((value) => {
    clearTimeout(timer.current)
    const u = String(value || '').trim()
    if (u.length < 3) {
      setRole(null)
      setChecking(false)
      return
    }
    timer.current = setTimeout(() => {
      setChecking(true)
      api('/check_user.php', { params: { username: u } })
        .then((res) => setRole(res))
        .catch(() => setRole(null))
        .finally(() => setChecking(false))
    }, 450)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(username, password)
      push(`Selamat datang, ${user.fullname || user.username}`)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const showRole = username.trim().length >= 3
  const meta = role?.found ? ROLE_META[role.role] : null
  const RoleIcon = meta?.icon
  const recommended = role?.found ? appsForRole(role.role) : []

  return (
    <div className="tg-login">
      <div className="tg-glow" />

      <button className="tg-signin" onClick={() => setOpen(true)} aria-label="Buka form masuk">
        <LogIn size={17} />
        Masuk
      </button>

      <div className="tg-center">
        <img className="tg-logo" src={BRAND_LOGO} alt="NearHome" draggable={false} />
        <p className="tg-tagline">NearHome — Internet dari Tetangga</p>

        <PortalWidget public apps={recommended} />
      </div>

      <div className="tg-clock">
        <div className="tg-clock-day">{HARI[now.getDay()]}</div>
        <div className="tg-clock-num">
          {now.getDate()} {BULAN[now.getMonth()]} {now.getFullYear()} · {pad(now.getHours())}:{pad(now.getMinutes())}
        </div>
      </div>

      <div className={`tg-panel${open ? ' open' : ''}`}>
        <button className="tg-panel-close" onClick={() => setOpen(false)} aria-label="Tutup form">
          <X size={20} />
        </button>

        <div className="tg-panel-inner">
          <img className="tg-panel-logo" src={BRAND_LOGO} alt="NearHome" />
          <p className="tg-panel-title">Masuk untuk melanjutkan</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={submit}>
            <label className="tg-label" htmlFor="tg-user">Username / PPPoE</label>
            <input
              id="tg-user"
              className="tg-input"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                checkRole(e.target.value)
              }}
              placeholder="Username / PPPoE"
              autoComplete="username"
              required
            />

            {showRole && (
              <div className={`tg-role${role && role.found ? ' ok' : role && !role.found ? ' no' : ''}`}>
                {checking ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Memeriksa akun…
                  </>
                ) : role && role.found ? (
                  <>
                    {RoleIcon && <RoleIcon size={16} style={{ color: meta.color, flexShrink: 0 }} />}
                    <span>
                      <b>{meta.label}</b>
                      <span className="tg-role-sub">
                        {role.active ? (role.source === 'customer' ? 'Akun pelanggan' : meta.sub) : 'Akun tidak aktif'}
                      </span>
                    </span>
                  </>
                ) : role && !role.found ? (
                  <>
                    <Search size={14} />
                    Akun tidak ditemukan
                  </>
                ) : null}
              </div>
            )}

            <label className="tg-label" htmlFor="tg-pass">Password</label>
            <div className="tg-pass">
              <input
                id="tg-pass"
                className="tg-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="Tampilkan password">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="tg-panel-row">
              <a
                className="tg-forgot"
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault()
                  push('Hubungi admin NearHome untuk reset password')
                }}
              >
                Lupa password?
              </a>
            </div>

            <button className="tg-submit" disabled={busy}>
              {busy ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />}
              Masuk
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
