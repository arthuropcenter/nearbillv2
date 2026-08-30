import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CreditCard, Loader2, Upload, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDate, rupiah } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import PortalShell from '../components/PortalShell'

const METHODS = ['Transfer Bank', 'QRIS', 'E-Wallet', 'Tunai', 'Lainnya']

const PAY_BADGE = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger'
}

export default function MyPayments() {
  const { user } = useAuth()
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    method: 'Transfer Bank',
    reference: '',
    note: ''
  })
  const [file, setFile] = useState(null)

  const load = () => {
    setLoading(true)
    api('/payments.php')
      .then(setData)
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (user?.user_type !== 'customer') return <Navigate to="/home" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      push('Masukkan jumlah pembayaran', 'error')
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('amount', form.amount)
      fd.append('method', form.method)
      fd.append('reference', form.reference)
      fd.append('note', form.note)
      if (file) fd.append('proof', file)
      await api('/payments.php', { method: 'POST', body: fd })
      push('Konfirmasi pembayaran terkirim')
      setForm({ amount: data?.plan_price || '', method: 'Transfer Bank', reference: '', note: '' })
      setFile(null)
      load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !data) {
    return (
      <PortalShell>
        <div className="card" style={{ padding: 24 }}><Spinner /></div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Saldo Anda</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{rupiah(data.balance)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Tagihan bulanan</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {data.plan_price != null ? rupiah(data.plan_price) : '—'}
            </div>
            {data.plan_name ? <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{data.plan_name}</div> : null}
          </div>
        </div>
      </div>

      <div className="section-title">Konfirmasi Pembayaran</div>
      <div className="card" style={{ padding: 6, marginBottom: 8 }}>
        <p className="card-sub" style={{ padding: '4px 8px', lineHeight: 1.5 }}>
          Sudah transfer? Silakan isi formulir di bawah agar admin NearHome bisa memverifikasi. Saldo otomatis ditambahkan setelah pembayaran disetujui.
        </p>
      </div>

      <form onSubmit={submit} className="card">
        <div className="field">
          <label>Jumlah (Rp) *</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder={data.plan_price ? String(data.plan_price) : 'cth: 150000'} required />
        </div>
        <div className="field">
          <label>Metode</label>
          <select className="input" value={form.method} onChange={set('method')}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label>No. Referensi / Bukti Transfer</label>
          <input className="input" value={form.reference} onChange={set('reference')} placeholder="cth: TRX-12345 / nama pengirim" />
        </div>
        <div className="field">
          <label>Catatan (opsional)</label>
          <input className="input" value={form.note} onChange={set('note')} placeholder="cth: Bayar untuk bulan Agustus" />
        </div>
        <div className="field">
          <label>Foto Bukti (opsional)</label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {file && <div className="card-sub" style={{ marginTop: 6 }}>{file.name}</div>}
        </div>
        <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? <Loader2 size={18} className="spin" /> : <CreditCard size={18} />}
          Kirim Konfirmasi
        </button>
      </form>

      <div className="section-title">Riwayat Konfirmasi</div>
      {data.payments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Belum ada konfirmasi pembayaran.
        </div>
      ) : (
        data.payments.map((p) => (
          <div key={p.id} className="card" style={{ padding: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{rupiah(p.amount)}</div>
              <Badge status={PAY_BADGE[p.status]}>{p.status}</Badge>
            </div>
            <div className="card-sub" style={{ marginTop: 4 }}>
              {p.method}{p.reference ? ` · Ref: ${p.reference}` : ''}
            </div>
            <div className="card-sub">
              {formatDate(p.created_at)}
              {p.verified_at ? ` · Diproses ${formatDate(p.verified_at)}` : ''}
            </div>
            {p.note ? <div className="card-sub" style={{ marginTop: 4 }}>“{p.note}”</div> : null}
            {p.reject_reason ? (
              <div className="error-box" style={{ marginTop: 8 }}>
                <b>Tolak:</b> {p.reject_reason || 'Tanpa alasan'}
              </div>
            ) : null}
            {p.proof_path ? (
              <a href={'/nearbillv2/' + p.proof_path} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
                <Upload size={13} /> Lihat bukti
              </a>
            ) : null}
          </div>
        ))
      )}

      <div className="section-title">Status</div>
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--muted)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} color="var(--warning)" /> Pending — menunggu verifikasi
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={13} color="var(--success)" /> Lunas — saldo bertambah
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <XCircle size={13} color="var(--danger)" /> Ditolak — cek alasan & ajukan ulang
            </span>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
