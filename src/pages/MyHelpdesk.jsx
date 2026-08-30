import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LifeBuoy, Loader2, MessageSquareText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDate } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import PortalShell from '../components/PortalShell'

const CATEGORIES = ['Gangguan Koneksi', 'Koneksi Lambat', 'Tagihan', 'Instalasi', 'Lainnya']

const STATUS_BADGE = {
  open: 'warning',
  in_progress: 'active',
  resolved: 'success',
  closed: 'neutral'
}

const PRIORITY_LABEL = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }

export default function MyHelpdesk() {
  const { user } = useAuth()
  const { push } = useToast()

  const [tickets, setTickets] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    category: 'Gangguan Koneksi',
    priority: 'medium',
    subject: '',
    description: ''
  })

  const load = () => {
    setLoading(true)
    api('/tickets.php')
      .then((res) => setTickets(res.data || []))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (user?.user_type !== 'customer') return <Navigate to="/home" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/tickets.php', { method: 'POST', body: form })
      push('Keluhan terkirim, kami akan segera menindaklanjuti')
      setForm({ category: 'Gangguan Koneksi', priority: 'medium', subject: '', description: '' })
      load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalShell>
      <div className="section-title">Buat Laporan / Keluhan</div>
      <form onSubmit={submit} className="card">
        <div className="field">
          <label>Kategori</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Prioritas</label>
          <select className="input" value={form.priority} onChange={set('priority')}>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi (koneksi mati total)</option>
          </select>
        </div>
        <div className="field">
          <label>Subjek *</label>
          <input className="input" value={form.subject} onChange={set('subject')} maxLength="150" placeholder="cth: Internet mati sejak pagi" required />
        </div>
        <div className="field">
          <label>Deskripsi *</label>
          <textarea value={form.description} onChange={set('description')} rows="4" placeholder="Jelaskan keluhan, sejak kapan, dan info lainnya" required />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? <Loader2 size={18} className="spin" /> : <LifeBuoy size={18} />}
          Kirim Keluhan
        </button>
      </form>

      <div className="section-title">Laporan Saya</div>
      {loading ? (
        <div className="card" style={{ padding: 24 }}><Spinner /></div>
      ) : tickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
          <MessageSquareText size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
          <div>Belum ada laporan. Jika ada gangguan, silakan kirim keluhan di atas.</div>
        </div>
      ) : (
        tickets.map((t) => (
          <div key={t.id} className="card" style={{ padding: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{t.ticket_no}</span> — {t.subject}
              </div>
              <Badge status={STATUS_BADGE[t.status]}>{t.status.replace('_', ' ')}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <Badge status="neutral">{t.category}</Badge>
              <Badge status={t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'neutral'}>
                {PRIORITY_LABEL[t.priority]}
              </Badge>
            </div>
            <div className="card-sub" style={{ marginTop: 6 }}>{t.description}</div>
            <div className="card-sub" style={{ marginTop: 6 }}>Dikirim {formatDate(t.created_at)}</div>
            {t.staff_note ? (
              <div className="card" style={{ marginTop: 8, background: 'var(--primary-light)', border: 'none', padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>Balasan admin</div>
                <div style={{ fontSize: 13 }}>{t.staff_note}</div>
              </div>
            ) : null}
          </div>
        ))
      )}
    </PortalShell>
  )
}
