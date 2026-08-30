import { useEffect, useState } from 'react'
import { Loader2, User, ShieldCheck, Mail, Phone, Calendar, LogIn, KeyRound } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDate, formatDateTime, initials } from '../utils/format'
import { roleMeta } from '../utils/roles'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

export default function Profile() {
  const { user } = useAuth()
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/user.php')
      .then((res) => setData(res.user))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => setPw((f) => ({ ...f, [k]: e.target.value }))

  const submitPw = async (e) => {
    e.preventDefault()
    if (pw.new_password !== pw.confirm) {
      push('Konfirmasi password tidak cocok', 'error')
      return
    }
    setBusy(true)
    try {
      await api('/user.php?action=password', {
        method: 'POST',
        body: { current_password: pw.current_password, new_password: pw.new_password }
      })
      push('Password berhasil diubah')
      setPw({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Spinner />
      </div>
    )
  }

  const rm = roleMeta(user?.user_type)

  const rows = [
    { icon: ShieldCheck, label: 'Role', value: rm.label + (user?.user_type !== 'customer' ? ` (${user?.user_type})` : '') },
    { icon: Mail, label: 'Email', value: data?.email || '-' },
    { icon: Phone, label: 'No. HP', value: data?.phone || '-' },
    { icon: Calendar, label: 'Terdaftar', value: data?.creationdate ? formatDate(data.creationdate) : '-' },
    { icon: LogIn, label: 'Login Terakhir', value: data?.last_login ? formatDateTime(data.last_login) : 'Belum pernah' }
  ]

  return (
    <div className="page">
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          className="avatar"
          style={{ width: 54, height: 54, fontSize: 19, background: `linear-gradient(135deg,${rm.color},#1f5eff)` }}
        >
          {initials(user?.fullname || user?.username)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.fullname || user?.username}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>@{user?.username}</div>
        </div>
        <Badge status="active">{user?.user_type}</Badge>
      </div>

      <div className="section-title">Informasi Akun</div>
      <div className="card" style={{ padding: 6 }}>
        {rows.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.label} className="list-item" style={{ boxShadow: 'none', borderRadius: 10 }}>
              <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Icon size={18} />
              </div>
              <div className="item-main">
                <div className="item-title">{r.label}</div>
                <div className="item-sub">{r.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {user?.user_type !== 'customer' && (
        <>
          <div className="section-title">Ubah Password</div>
          <form className="card" onSubmit={submitPw}>
            <div className="field">
              <label>Password Lama *</label>
              <input className="input" type="password" value={pw.current_password} onChange={set('current_password')} required />
            </div>
            <div className="field">
              <label>Password Baru *</label>
              <input className="input" type="password" value={pw.new_password} onChange={set('new_password')} required />
            </div>
            <div className="field">
              <label>Konfirmasi Password Baru *</label>
              <input className="input" type="password" value={pw.confirm} onChange={set('confirm')} required />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 6 }}>
              {busy ? <Loader2 size={18} className="spin" /> : <KeyRound size={18} />}
              Simpan Password
            </button>
          </form>
        </>
      )}
    </div>
  )
}
