import { useEffect, useState } from 'react'
import { Loader2, Search, User, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { rupiah } from '../utils/format'

const METHODS = ['Transfer Bank', 'Cash', 'EDC', 'Lainnya']

const EMPTY = { amount: '', method: 'Cash', reference: '', note: '' }

export default function ManualPayment({ onSaved }) {
  const { push } = useToast()
  const [cust, setCust] = useState(null)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (q.trim().length < 1) {
      setOpts([])
      return
    }
    const t = setTimeout(() => {
      api('/customers.php', { params: { search: q, limit: 8 } })
        .then((d) => setOpts(d.data || []))
        .catch(() => setOpts([]))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pick = (c) => {
    setCust(c)
    setOpen(false)
    setQ('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!cust) {
      push('Pilih pelanggan terlebih dahulu', 'error')
      return
    }
    setBusy(true)
    try {
      await api('/payments.php?action=manual', {
        method: 'POST',
        body: { ...form, customer_id: cust.id }
      })
      push(`Pembayaran ${rupiah(form.amount)} dicatat untuk ${cust.fullname || cust.username}`)
      setForm(EMPTY)
      setCust(null)
      setQ('')
      onSaved?.()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="section-title" style={{ marginBottom: 10 }}>Catat Pembayaran Manual</div>
      <p className="card-sub" style={{ marginBottom: 12 }}>
        Untuk pelanggan yang membayar langsung ke kantor / kas. Saldo pelanggan langsung bertambah.
      </p>

      <div className="field">
        <label>Cari Pelanggan *</label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            placeholder="Ketik nama / username / HP..."
            value={cust ? cust.fullname || cust.username : q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setCust(null) }}
            onFocus={() => setOpen(true)}
          />
          {q.trim() && open && (
            <div className="mp-drop">
              {opts.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12.5, color: 'var(--muted)' }}>Tidak ditemukan.</div>
              ) : (
                opts.map((c) => (
                  <button key={c.id} type="button" className="mp-opt" onClick={() => pick(c)}>
                    <User size={14} style={{ flexShrink: 0, color: 'var(--muted)' }} />
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.fullname || c.username}</div>
                      <div className="card-sub">@{c.username} · {c.last_plan || 'Tanpa paket'} · Saldo {rupiah(c.balance)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {cust && (
          <div className="mp-selected">
            <div>
              <b>{cust.fullname || cust.username}</b> · @{cust.username}
              <div className="card-sub">{cust.last_plan || 'Tanpa paket'} · Saldo {rupiah(cust.balance)}</div>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setCust(null)}>Ganti</button>
          </div>
        )}
      </div>

      <form onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label>Jumlah (Rp) *</label>
            <input className="input" type="number" min="0" step="1000" value={form.amount} onChange={set('amount')} required />
          </div>
          <div className="field">
            <label>Metode *</label>
            <select className="input" value={form.method} onChange={set('method')}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Referensi / No. Kwitansi</label>
          <input className="input" value={form.reference} onChange={set('reference')} placeholder="opsional" />
        </div>
        <div className="field">
          <label>Catatan</label>
          <textarea value={form.note} onChange={set('note')} placeholder="opsional" />
        </div>

        <button className="btn btn-primary btn-block" disabled={busy || !cust} style={{ marginTop: 6 }}>
          {busy ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
          Catat Pembayaran
        </button>
      </form>
    </div>
  )
}
