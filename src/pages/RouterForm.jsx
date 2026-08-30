import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'

export default function RouterForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { push } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    ip_address: '',
    username: '',
    password: '',
    description: '',
    enabled: 1
  })

  useEffect(() => {
    if (!isEdit) return
    api(`/router.php?id=${id}`)
      .then((res) => {
        const r = res.router
        setForm({
          name: r.name,
          ip_address: r.ip_address,
          username: r.username,
          password: '',
          description: r.description || '',
          enabled: r.enabled
        })
      })
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isEdit) {
        await api(`/router.php?id=${id}&action=update`, { method: 'POST', body: form })
        push('Router berhasil diperbarui')
      } else {
        await api('/routers.php', { method: 'POST', body: form })
        push('Router berhasil ditambahkan')
      }
      navigate('/routers')
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><Spinner /></div>

  return (
    <form className="page page-narrow" onSubmit={submit}>
      <div className="card">
        <div className="field">
          <label>Nama Router *</label>
          <input className="input" value={form.name} onChange={set('name')} required />
        </div>
        <div className="field">
          <label>IP Address * (bisa disertai port, cth: 192.168.1.1:8728)</label>
          <input className="input" value={form.ip_address} onChange={set('ip_address')} placeholder="192.168.1.1:8728" required />
        </div>
        <div className="field">
          <label>Username *</label>
          <input className="input" value={form.username} onChange={set('username')} required />
        </div>
        <div className="field">
          <label>{isEdit ? 'Password (kosongkan jika tidak diubah)' : 'Password'}</label>
          <input className="input" type="text" value={form.password} onChange={set('password')} />
        </div>
        <div className="field">
          <label>Deskripsi</label>
          <textarea value={form.description} onChange={set('description')} />
        </div>
        <div className="field">
          <label>Status</label>
          <div className="segmented">
            <button
              type="button"
              className={Number(form.enabled) === 1 ? 'active' : ''}
              onClick={() => set('enabled')({ target: { value: 1 } })}
            >
              Enabled
            </button>
            <button
              type="button"
              className={Number(form.enabled) === 0 ? 'active' : ''}
              onClick={() => set('enabled')({ target: { value: 0 } })}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>

      <div className="fab-save">
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          {isEdit ? 'Simpan Perubahan' : 'Simpan Router'}
        </button>
      </div>
    </form>
  )
}
