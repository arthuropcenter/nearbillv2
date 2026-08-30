import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function OltFormModal({ olt, onClose, onSaved }) {
  const isEdit = Boolean(olt)
  const { push } = useToast()

  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: olt?.name || '',
    ip_address: olt?.ip_address || '',
    port: olt?.port || 23,
    username: olt?.username || '',
    password: '',
    enabled: olt ? Number(olt.enabled) : 1
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isEdit) {
        await api(`/olts.php?id=${olt.id}&action=update`, { method: 'POST', body: form })
        push('Koneksi OLT berhasil diperbarui')
      } else {
        await api('/olts.php', { method: 'POST', body: form })
        push('Koneksi OLT berhasil ditambahkan')
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
          <h3>{isEdit ? 'Edit Koneksi OLT' : 'Tambah Koneksi OLT'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Nama OLT *</label>
            <input className="input" value={form.name} onChange={set('name')} required placeholder="cth: OLT Hioso Lantai 1" />
          </div>
          <div className="field">
            <label>Alamat IP *</label>
            <input className="input" value={form.ip_address} onChange={set('ip_address')} required placeholder="cth: 192.168.1.2" />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Port Telnet</label>
              <input className="input" type="number" min="1" max="65535" value={form.port} onChange={set('port')} />
            </div>
            <div className="field">
              <label>Status</label>
              <select className="input" value={form.enabled} onChange={set('enabled')}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Username *</label>
            <input className="input" value={form.username} onChange={set('username')} required />
          </div>
          <div className="field">
            <label>{isEdit ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} required={!isEdit} />
          </div>

          <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? <Loader2 size={18} className="spin" /> : null}
            {isEdit ? 'Simpan Perubahan' : 'Simpan Koneksi'}
          </button>
        </form>
      </div>
    </div>
  )
}
