import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, ReceiptText, ImageIcon } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDate, rupiah } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Lunas' },
  { key: 'rejected', label: 'Ditolak' }
]

const STATUS_BADGE = { pending: 'warning', verified: 'success', rejected: 'danger' }

export default function StaffPayments({ canManage }) {
  const { push } = useToast()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    api('/payments.php', { params: { all: 1, status: filter } })
      .then((res) => setData(res.data || []))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const verify = async (p) => {
    setBusy(true)
    try {
      await api(`/payments.php?id=${p.id}&action=verify`, { method: 'POST' })
      push(`Pembayaran ${p.id} diverifikasi, saldo ditambahkan`)
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const reject = async (p) => {
    const reason = window.prompt(`Alasan menolak pembayaran #${p.id} (${p.cust_username})?`, '')
    if (reason === null) return
    setBusy(true)
    try {
      await api(`/payments.php?id=${p.id}&action=reject`, {
        method: 'POST',
        body: { reason: reason.trim() }
      })
      push('Konfirmasi ditolak')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
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
          <ReceiptText size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
          <div>Tidak ada konfirmasi pembayaran.</div>
        </div>
      ) : (
        data.map((p) => (
          <div key={p.id} className="card" style={{ padding: 13, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{rupiah(p.amount)}</div>
                <div className="card-sub">{p.cust_fullname || p.cust_username}</div>
              </div>
              <Badge status={STATUS_BADGE[p.status]}>{p.status}</Badge>
            </div>

            <div className="card-sub" style={{ marginTop: 6 }}>
              #{p.id} · {p.method}
              {p.reference ? ` · Ref: ${p.reference}` : ''} · {formatDate(p.created_at)}
            </div>
            {p.note ? <div className="card-sub" style={{ marginTop: 2 }}>“{p.note}”</div> : null}

            {p.proof_path ? (
              <a href={'/nearbillv2/' + p.proof_path} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
                <ImageIcon size={13} /> Lihat bukti
              </a>
            ) : (
              <div className="card-sub" style={{ marginTop: 8 }}>Tanpa foto bukti</div>
            )}

            {p.reject_reason ? (
              <div className="error-box" style={{ marginTop: 8 }}>
                <b>Alasan tolak:</b> {p.reject_reason || 'Tanpa alasan'}
              </div>
            ) : null}

            {canManage && p.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => verify(p)}>
                  {busy ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />} Terima & Lunas
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => reject(p)}>
                  {busy ? <Loader2 size={13} className="spin" /> : <XCircle size={13} />} Tolak
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
