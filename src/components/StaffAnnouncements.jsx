import { useEffect, useState } from 'react'
import { Megaphone, Loader2, Trash2, Power } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDate } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const CATEGORIES = [
  { key: 'info', label: 'Info' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'outage', label: 'Gangguan' }
]

const CAT_BADGE = { info: 'neutral', maintenance: 'warning', outage: 'danger' }

export default function StaffAnnouncements({ canManage }) {
  const { push } = useToast()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', category: 'info', active: 1 })

  const load = () => {
    setLoading(true)
    api('/announcements.php', { params: { all: 1 } })
      .then((res) => setData(res.data || []))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/announcements.php', { method: 'POST', body: form })
      push('Pengumuman dibuat')
      setForm({ title: '', message: '', category: 'info', active: 1 })
      load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (a) => {
    setBusy(true)
    try {
      await api(`/announcements.php?id=${a.id}&action=toggle`, { method: 'POST' })
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (a) => {
    if (!window.confirm(`Hapus pengumuman "${a.title}"?`)) return
    setBusy(true)
    try {
      await api(`/announcements.php?id=${a.id}&action=delete`, { method: 'POST' })
      push('Pengumuman dihapus')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {canManage && (
        <form onSubmit={submit} className="card" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>Judul *</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="cth: Gangguan ODP 3" />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Kategori</label>
              <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select className="input" value={form.active} onChange={(e) => setForm((f) => ({ ...f, active: Number(e.target.value) }))}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Isi Pengumuman</label>
            <textarea rows="3" className="input" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Detail informasi / estimasi selesai" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Loader2 size={18} className="spin" /> : <Megaphone size={18} />}
            Terbitkan
          </button>
        </form>
      )}

      {loading ? (
        <div className="card" style={{ padding: 24 }}><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
          <Megaphone size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
          <div>Belum ada pengumuman.</div>
        </div>
      ) : (
        data.map((a) => (
          <div key={a.id} className="card" style={{ padding: 13, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                {a.message ? <div className="card-sub" style={{ marginTop: 2 }}>{a.message}</div> : null}
                <div className="card-sub" style={{ marginTop: 6 }}>{formatDate(a.created_at)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge status={CAT_BADGE[a.category]}>{a.category}</Badge>
                <Badge status={a.active ? 'active' : 'neutral'}>{a.active ? 'Tampil' : 'Sembunyi'}</Badge>
              </div>
            </div>
            {canManage && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => toggle(a)}>
                  <Power size={13} /> {a.active ? 'Sembunyikan' : 'Tampilkan'}
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => remove(a)}>
                  <Trash2 size={13} /> Hapus
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
