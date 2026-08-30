import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ROLE_META } from '../utils/roles'
import Spinner from '../components/Spinner'

const ROLE_OPTIONS = ['AdminGM', 'AdminCS', 'Teknisi', 'Report', 'Agent', 'Sales']

const EMPTY = {
  username: '',
  fullname: '',
  password: '',
  phone: '',
  email: '',
  user_type: 'AdminCS',
  status: 'Active'
}

export default function UserFormModal({ user, onClose, onSaved }) {
  const isEdit = Boolean(user)
  const { user: me } = useAuth()
  const { push } = useToast()
  const isSelf = isEdit && user.id === me?.id

  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    setForm({
      username: user.username,
      fullname: user.fullname,
      password: '',
      phone: user.phone || '',
      email: user.email || '',
      user_type: user.user_type,
      status: user.status || 'Active'
    })
    setLoading(false)
  }, [user])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isEdit) {
        await api(`/users.php?id=${user.id}&action=update`, {
          method: 'POST',
          body: { ...form, new_password: form.password }
        })
        push('Pengguna berhasil diperbarui')
      } else {
        await api('/users.php', { method: 'POST', body: form })
        push('Pengguna berhasil ditambahkan')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop centered" onClick={onClose}>
      <div className="modal centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Username *</label>
              <input className="input" value={form.username} onChange={set('username')} required disabled={isEdit} />
              {isEdit && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Username tidak dapat diubah.
                </div>
              )}
            </div>
            <div className="field">
              <label>Nama Lengkap *</label>
              <input className="input" value={form.fullname} onChange={set('fullname')} required />
            </div>
            <div className="field">
              <label>{isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
              <input className="input" type="text" value={form.password} onChange={set('password')} required={!isEdit} />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="field">
                <label>No. HP</label>
                <input className="input" type="tel" value={form.phone} onChange={set('phone')} />
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Role</label>
                <select className="input" value={form.user_type} onChange={set('user_type')} disabled={isSelf}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_META[r]?.label || r}
                    </option>
                  ))}
                </select>
                {isSelf && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Role akun sendiri tidak dapat diubah.
                  </div>
                )}
              </div>
              <div className="field">
                <label>Status</label>
                <select className="input" value={form.status} onChange={set('status')} disabled={isSelf}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                {isSelf && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Akun sendiri tidak dapat dinonaktifkan.
                  </div>
                )}
              </div>
            </div>

            <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? <Loader2 size={18} className="spin" /> : null}
              {isEdit ? 'Simpan Perubahan' : 'Simpan Pengguna'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
