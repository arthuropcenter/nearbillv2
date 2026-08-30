import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, MessageSquareText, Loader2, Phone, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'Diproses' },
  { key: 'resolved', label: 'Selesai' }
]

const STATUS_BADGE = {
  open: 'warning',
  in_progress: 'active',
  resolved: 'success',
  closed: 'neutral'
}

const PRIORITY_LABEL = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }

export default function StaffTickets({ canManage }) {
  const { push } = useToast()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api('/tickets.php', { params: { all: 1, status: filter } })
      .then((res) => setData(res.data || []))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const save = async (t, status) => {
    setSaving(true)
    try {
      await api(`/tickets.php?id=${t.id}&action=update`, {
        method: 'POST',
        body: { status, staff_note: note[t.id] || '' }
      })
      push('Tiket diperbarui')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={'btn btn-sm ' + (filter === f.key ? 'btn-primary' : 'btn-outline')}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24 }}><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
          <MessageSquareText size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
          <div>Tidak ada tiket.</div>
        </div>
      ) : (
        data.map((t) => {
          const expanded = open === t.id
          return (
            <div key={t.id} className="card" style={{ padding: 13, marginBottom: 10 }}>
              <button
                className="list-item"
                style={{ boxShadow: 'none', borderRadius: 10, padding: '2px 4px', width: '100%', textAlign: 'left' }}
                onClick={() => setOpen(expanded ? null : t.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{t.ticket_no}</span> — {t.subject}
                  </div>
                  <div className="card-sub" style={{ marginTop: 2 }}>
                    {t.cust_fullname || t.cust_username} · {formatDateTime(t.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge status={STATUS_BADGE[t.status]}>{t.status.replace('_', ' ')}</Badge>
                  {expanded ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
                </div>
              </button>

              {expanded && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <Badge status="neutral">{t.category}</Badge>
                    <Badge status={t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'neutral'}>
                      Prioritas {PRIORITY_LABEL[t.priority]}
                    </Badge>
                    {t.cust_phone && t.cust_phone !== '0' ? (
                      <Badge status="neutral"><Phone size={11} style={{ marginRight: 3 }} />{t.cust_phone}</Badge>
                    ) : null}
                  </div>

                  <div className="card-sub" style={{ marginBottom: 8 }}>{t.description}</div>

                  {t.customer_id ? (
                    <Link
                      to={`/customers/${t.customer_id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8 }}
                    >
                      <ExternalLink size={13} /> Detail Pelanggan
                    </Link>
                  ) : null}

                  {t.staff_note ? (
                    <div className="card" style={{ background: 'var(--primary-light)', border: 'none', padding: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>Catatan staf</div>
                      <div style={{ fontSize: 13 }}>{t.staff_note}</div>
                    </div>
                  ) : null}

                  {canManage && (
                    <>
                      <div className="field" style={{ marginBottom: 8 }}>
                        <label>Catatan / balasan</label>
                        <textarea
                          rows="2"
                          className="input"
                          value={note[t.id] || ''}
                          onChange={(e) => setNote((n) => ({ ...n, [t.id]: e.target.value }))}
                          placeholder="Catatan untuk pelanggan / tim"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline btn-sm" disabled={saving} onClick={() => save(t, 'in_progress')}>
                          {saving ? <Loader2 size={13} className="spin" /> : null} Mulai Proses
                        </button>
                        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save(t, 'resolved')}>
                          {saving ? <Loader2 size={13} className="spin" /> : null} Tandai Selesai
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => save(t, 'closed')}>
                          Tutup
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
