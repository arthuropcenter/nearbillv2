import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Wallet, TrendingUp, TrendingDown, Scale, AlertTriangle,
  Plus, Trash2, CheckCircle2, LayoutDashboard, ReceiptText,
  Banknote, Tags, FileText, Sparkles, Pencil, Loader2
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import CustomerPicker from '../components/CustomerPicker'
import { rupiah } from '../utils/format'

const TABS = [
  { key: 'summary', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'expenses', label: 'Pengeluaran', icon: TrendingDown },
  { key: 'income', label: 'Pemasukan', icon: TrendingUp },
  { key: 'bills', label: 'Tagihan', icon: FileText },
  { key: 'recommend', label: 'Rekomendasi', icon: Sparkles },
  { key: 'categories', label: 'Kategori', icon: Tags }
]

function monthLabel(m) {
  if (!m) return '-'
  const [y, mm] = m.split('-')
  const nama = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${nama[Number(mm)]} ${y}`
}

function Stat({ icon, label, value, tone = 'primary' }) {
  const bg =
    tone === 'danger' ? 'linear-gradient(135deg,#ef4444,#f97316)' :
    tone === 'success' ? 'linear-gradient(135deg,#22c55e,#0ea5e9)' :
    tone === 'warning' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' :
    'linear-gradient(135deg,#a855f7,#6366f1)'
  return (
    <div className="stat-card" style={{ flex: '1 1 180px' }}>
      <div className="stat-icon" style={{ background: bg }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function Form({ fields, onSubmit, busy, submitLabel, columns = 2 }) {
  return (
    <form
      className="card"
      style={{ padding: 16, marginBottom: 16 }}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))`, gap: 10 }}>
        {fields.map((f) => (
          <div key={f.key} className="field">
            <label>{f.label}</label>
            {f.type === 'select' ? (
              <select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea value={f.value} onChange={(e) => f.onChange(e.target.value)} />
            ) : f.type === 'custom' ? (
              f.render()
            ) : (
              <input
                className="input"
                type={f.type || 'text'}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                placeholder={f.placeholder || ''}
                required={f.required !== false}
              />
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>
        <Plus size={15} /> {submitLabel}
      </button>
    </form>
  )
}

function DataTable({ headers, rows, render }) {
  if (!rows || rows.length === 0) {
    return (
      <EmptyState icon={<Banknote size={44} />} title="Belum ada data" subtitle="Data akan tampil di sini." />
    )
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>{rows.map(render)}</tbody>
      </table>
    </div>
  )
}

export default function FinanceHub() {
  const { user } = useAuth()
  const { push } = useToast()
  const [tab, setTab] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [cats, setCats] = useState([])
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [bills, setBills] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [payBill, setPayBill] = useState(null)

  if (user?.user_type !== 'AdminGM') return <Navigate to="/home" replace />

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      api('/finance.php'),
      api('/finance.php?type=categories'),
      api('/finance.php?type=expenses'),
      api('/finance.php?type=income'),
      api('/finance.php?type=bills')
    ])
      .then(([s, c, e, i, b]) => {
        setSummary(s)
        setCats(c.data || [])
        setExpenses(e.data || [])
        setIncomes(i.data || [])
        setBills(b.data || [])
      })
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const del = async (action, id, msg) => {
    setBusy(true)
    try {
      await api(`/finance.php?action=${action}&id=${id}`, { method: 'DELETE' })
      push(msg)
      loadAll()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const post = async (action, body, msg) => {
    setBusy(true)
    try {
      await api(`/finance.php?action=${action}`, { method: 'POST', body })
      push(msg)
      loadAll()
      return true
    } catch (e) {
      push(e.message, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  /* ---- form states ---- */
  const [expForm, setExpForm] = useState({ expense_date: today, category_id: '', amount: '', description: '', method: 'Cash', paid_to: '', expense_type: 'Lainnya' })
  const [incForm, setIncForm] = useState({ pay_date: today, amount: '', method: 'Cash', customer_name: '', customer_ref: '', note: '' })
  const [billForm, setBillForm] = useState({ bill_no: '', customer_name: '', customer_ref: '', plan_ref: '', plan_name: '', period: today.slice(0, 7), amount: '', status: 'Belum Bayar', bill_date: today })
  const [catForm, setCatForm] = useState({ name: '', type: 'Lainnya' })
  const [payForm, setPayForm] = useState({ pay_date: today, amount: '', method: 'Cash', note: '' })

  const [incCust, setIncCust] = useState(null)
  const [incCustText, setIncCustText] = useState('')
  const [billCust, setBillCust] = useState(null)
  const [billCustText, setBillCustText] = useState('')

  const custRef = (c) => (c ? 'NH-C' + String(c.id).padStart(4, '0') : '')

  const makeBillNo = (period, ref) => {
    const p = period || today.slice(0, 7)
    const compact = p.replace('-', '')
    if (ref) return `INV-${compact}-${ref}`
    const pref = `INV-${compact}-NH-C`
    let seq = 0
    for (const b of bills) {
      if (b.bill_no && b.bill_no.startsWith(pref)) {
        const n = parseInt(b.bill_no.slice(pref.length), 10)
        if (Number.isFinite(n) && n > seq) seq = n
      }
    }
    return `${pref}${String(seq + 1).padStart(4, '0')}`
  }

  const pickIncCust = (c) => {
    setIncCust(c)
    setIncCustText('')
    setIncForm((f) => ({ ...f, customer_name: c ? c.fullname || c.username : '', customer_ref: custRef(c) }))
  }
  const incText = (t) => {
    setIncCustText(t)
    setIncForm((f) => ({ ...f, customer_name: t, customer_ref: '' }))
  }

  const pickBillCust = (c) => {
    setBillCust(c)
    setBillCustText('')
    setBillForm((f) => {
      const next = {
        ...f,
        customer_name: c ? c.fullname || c.username : '',
        customer_ref: custRef(c),
        plan_ref: c ? String(c.plan_id || '') : '',
        plan_name: c ? c.plan_name || c.last_plan || '' : ''
      }
      next.bill_no = makeBillNo(next.period, next.customer_ref)
      return next
    })
  }
  const billText = (t) => {
    setBillCustText(t)
    setBillForm((f) => {
      const next = { ...f, customer_name: t, customer_ref: '', plan_ref: '', plan_name: '' }
      next.bill_no = makeBillNo(next.period, '')
      return next
    })
  }

  const catOptions = cats.map((c) => ({ value: String(c.id), label: c.name }))

  /* ---- rekomendasi / generate tagihan ---- */
  const [genForm, setGenForm] = useState({ start: '2026-05', end: today.slice(0, 7) })
  const [genResult, setGenResult] = useState(null)

  const generateBills = async () => {
    if (!genForm.start || !genForm.end) return push('Pilih rentang bulan', 'error')
    if (genForm.start > genForm.end) return push('Bulan awal tidak boleh setelah bulan akhir', 'error')
    setBusy(true)
    setGenResult(null)
    try {
      const res = await api('/finance.php?action=generate_bills', { method: 'POST', body: genForm })
      setGenResult(res)
      push(`${res.generated} tagihan dibuat`, 'success')
      loadAll()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const editBillAmount = async (b) => {
    const val = window.prompt(`Ubah jumlah tagihan ${b.bill_no}? (Rp)`, b.amount)
    if (val === null) return
    const amount = Number(val)
    if (!amount || amount <= 0) return push('Jumlah tidak valid', 'error')
    try {
      await api('/finance.php?action=update_bill', { method: 'POST', body: { id: b.id, amount } })
      push('Jumlah tagihan diperbarui')
      loadAll()
    } catch (e) {
      push(e.message, 'error')
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              className={'btn btn-sm ' + (tab === t.key ? 'btn-primary' : 'btn-outline')}
              onClick={() => setTab(t.key)}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'summary' && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <Stat icon={<TrendingUp size={18} />} label="Total Pemasukan" value={rupiah(summary?.totals?.income)} tone="success" />
                <Stat icon={<TrendingDown size={18} />} label="Total Pengeluaran" value={rupiah(summary?.totals?.expense)} tone="danger" />
                <Stat icon={<Scale size={18} />} label="Laba Bersih" value={rupiah(summary?.totals?.net)} tone="primary" />
                <Stat icon={<AlertTriangle size={18} />} label="Tagihan Belum Lunas" value={rupiah(summary?.totals?.arOutstanding)} tone="warning" />
              </div>

              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Bulan Ini · {monthLabel(summary?.month?.label)}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Stat icon={<TrendingUp size={16} />} label="Pemasukan" value={rupiah(summary?.month?.income)} tone="success" />
                  <Stat icon={<TrendingDown size={16} />} label="Pengeluaran" value={rupiah(summary?.month?.expense)} tone="danger" />
                  <Stat icon={<Scale size={16} />} label="Laba" value={rupiah(summary?.month?.net)} tone="primary" />
                </div>
              </div>

              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Laba-Rugi per Bulan</div>
                <DataTable
                  headers={['Bulan', 'Pemasukan', 'Pengeluaran', 'Laba']}
                  rows={summary?.monthly}
                  render={(m) => (
                    <tr key={m.month}>
                      <td className="table-cell-name">{monthLabel(m.month)}</td>
                      <td style={{ color: 'var(--success, #22c55e)' }}>{rupiah(m.income)}</td>
                      <td style={{ color: 'var(--danger, #ef4444)' }}>{rupiah(m.expense)}</td>
                      <td style={{ fontWeight: 700, color: m.net >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>{rupiah(m.net)}</td>
                    </tr>
                  )}
                />
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Pengeluaran per Kategori</div>
                <DataTable
                  headers={['Kategori', 'Total']}
                  rows={summary?.categoryTotals}
                  render={(c) => (
                    <tr key={c.name}>
                      <td className="table-cell-name">{c.name}</td>
                      <td style={{ fontWeight: 700 }}>{rupiah(c.total)}</td>
                    </tr>
                  )}
                />
              </div>
            </>
          )}

          {tab === 'expenses' && (
            <>
              <Form
                fields={[
                  { key: 'expense_date', label: 'Tanggal', type: 'date', value: expForm.expense_date, onChange: (v) => setExpForm({ ...expForm, expense_date: v }) },
                  { key: 'category_id', label: 'Kategori', type: 'select', value: expForm.category_id, onChange: (v) => setExpForm({ ...expForm, category_id: v }), options: [{ value: '', label: 'Pilih kategori' }, ...catOptions] },
                  { key: 'amount', label: 'Jumlah (Rp)', type: 'number', value: expForm.amount, onChange: (v) => setExpForm({ ...expForm, amount: v }) },
                  { key: 'method', label: 'Metode', type: 'select', value: expForm.method, onChange: (v) => setExpForm({ ...expForm, method: v }), options: [{ value: 'Cash', label: 'Cash' }, { value: 'Transfer', label: 'Transfer' }, { value: 'EDC', label: 'EDC' }, { value: 'Lainnya', label: 'Lainnya' }] },
                  { key: 'paid_to', label: 'Dibayar Ke', value: expForm.paid_to, onChange: (v) => setExpForm({ ...expForm, paid_to: v }), required: false },
                  { key: 'expense_type', label: 'Jenis Biaya', type: 'select', value: expForm.expense_type, onChange: (v) => setExpForm({ ...expForm, expense_type: v }), options: [{ value: 'Lainnya', label: 'Lainnya' }, { value: 'Operasional', label: 'Operasional' }] },
                  { key: 'description', label: 'Keterangan', type: 'textarea', value: expForm.description, onChange: (v) => setExpForm({ ...expForm, description: v }), required: false }
                ]}
                busy={busy}
                submitLabel="Catat Pengeluaran"
                onSubmit={() => {
                  const amount = Number(expForm.amount)
                  if (!amount || amount <= 0) return push('Jumlah wajib diisi', 'error')
                  post('expense', { ...expForm, amount }, 'Pengeluaran dicatat').then((ok) => {
                    if (ok) setExpForm({ expense_date: today, category_id: '', amount: '', description: '', method: 'Cash', paid_to: '', expense_type: 'Lainnya' })
                  })
                }}
              />
              <DataTable
                headers={['Tanggal', 'Kategori', 'Keterangan', 'Dibayar Ke', 'Jumlah', '']}
                rows={expenses}
                render={(e) => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td>{e.category_name || '-'}</td>
                    <td>{e.description || '-'}</td>
                    <td>{e.paid_to || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger, #ef4444)' }}>{rupiah(e.amount)}</td>
                    <td>
                      <button className="table-icon-btn" title="Hapus" onClick={() => setConfirm({ action: 'expense', id: e.id, msg: `Hapus pengeluaran ${rupiah(e.amount)}?` })}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )}
              />
            </>
          )}

          {tab === 'income' && (
            <>
              <Form
                fields={[
                  { key: 'pay_date', label: 'Tanggal', type: 'date', value: incForm.pay_date, onChange: (v) => setIncForm({ ...incForm, pay_date: v }) },
                  { key: 'amount', label: 'Jumlah (Rp)', type: 'number', value: incForm.amount, onChange: (v) => setIncForm({ ...incForm, amount: v }) },
                  { key: 'method', label: 'Metode', type: 'select', value: incForm.method, onChange: (v) => setIncForm({ ...incForm, method: v }), options: [{ value: 'Cash', label: 'Cash' }, { value: 'Transfer', label: 'Transfer' }, { value: 'EDC', label: 'EDC' }, { value: 'Lainnya', label: 'Lainnya' }] },
                  { key: 'customer', label: 'Pelanggan / Sumber', type: 'custom', required: false, render: () => <CustomerPicker value={incCust} text={incCustText} onSelect={pickIncCust} onText={incText} /> },
                  { key: 'note', label: 'Keterangan', value: incForm.note, onChange: (v) => setIncForm({ ...incForm, note: v }), required: false }
                ]}
                busy={busy}
                submitLabel="Catat Pemasukan"
                onSubmit={() => {
                  const amount = Number(incForm.amount)
                  if (!amount || amount <= 0) return push('Jumlah wajib diisi', 'error')
                  post('income', { ...incForm, amount }, 'Pemasukan dicatat').then((ok) => {
                    if (ok) {
                      setIncForm({ pay_date: today, amount: '', method: 'Cash', customer_name: '', customer_ref: '', note: '' })
                      setIncCust(null)
                      setIncCustText('')
                    }
                  })
                }}
              />
              <DataTable
                headers={['Tanggal', 'No Bayar', 'Pelanggan', 'Metode', 'Jumlah', '']}
                rows={incomes}
                render={(i) => (
                  <tr key={i.id}>
                    <td>{i.pay_date}</td>
                    <td>{i.pay_no || '-'}</td>
                    <td>{i.customer_name || i.customer_ref || '-'}</td>
                    <td>{i.method || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success, #22c55e)' }}>{rupiah(i.amount)}</td>
                    <td>
                      <button className="table-icon-btn" title="Hapus" onClick={() => setConfirm({ action: 'income', id: i.id, msg: `Hapus pemasukan ${rupiah(i.amount)}?` })}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )}
              />
            </>
          )}

          {tab === 'bills' && (
            <>
              <Form
                fields={[
                  { key: 'bill_no', label: 'No Tagihan (otomatis)', value: billForm.bill_no, onChange: (v) => setBillForm({ ...billForm, bill_no: v }), placeholder: 'Contoh: INV-202608-NH-C0011', required: false },
                  { key: 'customer', label: 'Nama Pelanggan', type: 'custom', required: false, render: () => <CustomerPicker value={billCust} text={billCustText} onSelect={pickBillCust} onText={billText} placeholder="Ketik nama / pilih pelanggan (opsional)..." /> },
                  { key: 'period', label: 'Periode (YYYY-MM)', value: billForm.period, onChange: (v) => { const next = { ...billForm, period: v }; next.bill_no = makeBillNo(v, billForm.customer_ref); setBillForm(next) } },
                  { key: 'amount', label: 'Jumlah (Rp)', type: 'number', value: billForm.amount, onChange: (v) => setBillForm({ ...billForm, amount: v }) },
                  { key: 'status', label: 'Status', type: 'select', value: billForm.status, onChange: (v) => setBillForm({ ...billForm, status: v }), options: [{ value: 'Belum Bayar', label: 'Belum Bayar' }, { value: 'Lunas', label: 'Lunas' }, { value: 'Sebagian', label: 'Sebagian' }] },
                  { key: 'bill_date', label: 'Tanggal Dibuat', type: 'date', value: billForm.bill_date, onChange: (v) => setBillForm({ ...billForm, bill_date: v }) }
                ]}
                busy={busy}
                submitLabel="Tambah Tagihan"
                onSubmit={() => {
                  const amount = Number(billForm.amount)
                  if (!amount || amount <= 0) return push('Jumlah wajib diisi', 'error')
                  post('bill', { ...billForm, amount }, 'Tagihan ditambahkan').then((ok) => {
                    if (ok) {
                      setBillForm({ bill_no: '', customer_name: '', customer_ref: '', plan_ref: '', plan_name: '', period: today.slice(0, 7), amount: '', status: 'Belum Bayar', bill_date: today })
                      setBillCust(null)
                      setBillCustText('')
                    }
                  })
                }}
              />
              <DataTable
                headers={['No Tagihan', 'Pelanggan', 'Periode', 'Paket', 'Jumlah', 'Status', '']}
                rows={bills}
                render={(b) => (
                  <tr key={b.id}>
                    <td className="table-cell-name">{b.bill_no || '-'}</td>
                    <td>{b.customer_name || b.customer_ref || '-'}</td>
                    <td>{b.period_year && b.period_month ? monthLabel(`${b.period_year}-${String(b.period_month).padStart(2, '0')}`) : '-'}</td>
                    <td>{b.plan_name || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{rupiah(b.amount)}</td>
                    <td>
                      <span className={'badge ' + (b.status === 'Lunas' ? 'badge-success' : b.status === 'Sebagian' ? 'badge-warning' : 'badge-danger')}>{b.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="table-icon-btn" title="Ubah jumlah" onClick={() => editBillAmount(b)}>
                          <Pencil size={15} />
                        </button>
                        {b.status !== 'Lunas' && (
                          <button className="table-icon-btn" title="Catat pembayaran" onClick={() => { setPayBill(b); setPayForm({ pay_date: today, amount: b.amount, method: 'Cash', note: '' }) }}>
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        <button className="table-icon-btn" title="Hapus" onClick={() => setConfirm({ action: 'bill', id: b.id, msg: `Hapus tagihan ${b.bill_no}?` })}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </>
          )}

          {tab === 'recommend' && (
            <>
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Rekomendasi Pemasukan — Tagihan Otomatis</div>
                <p className="card-sub" style={{ marginBottom: 12 }}>
                  Buat tagihan per pelanggan aktif (status Aktif + paket aktif di menu Pelanggan) untuk tiap bulan.
                  Struktur lama dari Google Sheet diganti: nama & paket otomatis dari pelanggan, Anda cukup
                  menyesuaikan jumlahnya (tombol pensil di tabel Tagihan). Tagihan yang sudah ada akan dilewati.
                </p>
                <div className="form-row">
                  <div className="field"><label>Bulan Awal</label><input className="input" type="month" value={genForm.start} onChange={(e) => setGenForm({ ...genForm, start: e.target.value })} /></div>
                  <div className="field"><label>Bulan Akhir</label><input className="input" type="month" value={genForm.end} onChange={(e) => setGenForm({ ...genForm, end: e.target.value })} /></div>
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={generateBills}>
                  {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} Generate Tagihan
                </button>
                {genResult && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(34,197,94,.08)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{genResult.generated} tagihan dibuat · {genResult.skipped} dilewati (sudah ada)</div>
                    <div className="card-sub" style={{ marginTop: 4 }}>
                      {genResult.perMonth.map((m) => `${monthLabel(m.month)}: ${m.generated} tagihan`).join(' · ')}
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Rekomendasi Pengeluaran</div>
                <p className="card-sub" style={{ marginBottom: 10 }}>
                  Catat pengeluaran memakai kategori standar berikut (kelola di tab Kategori).
                  Total per bulan & per kategori otomatis terhitung di Ringkasan.
                </p>
                <DataTable
                  headers={['Kategori', 'Jenis Biaya']}
                  rows={cats}
                  render={(c) => (
                    <tr key={c.id}>
                      <td className="table-cell-name">{c.name}</td>
                      <td><span className={'badge ' + (c.type === 'Operasional' ? 'badge-success' : 'badge-neutral')}>{c.type}</span></td>
                    </tr>
                  )}
                />
              </div>
            </>
          )}

          {tab === 'categories' && (
            <>
              <Form
                fields={[
                  { key: 'name', label: 'Nama Kategori', value: catForm.name, onChange: (v) => setCatForm({ ...catForm, name: v }) },
                  { key: 'type', label: 'Jenis Biaya', type: 'select', value: catForm.type, onChange: (v) => setCatForm({ ...catForm, type: v }), options: [{ value: 'Lainnya', label: 'Lainnya' }, { value: 'Operasional', label: 'Operasional' }] }
                ]}
                busy={busy}
                submitLabel="Tambah Kategori"
                onSubmit={() => {
                  if (!catForm.name.trim()) return push('Nama kategori wajib diisi', 'error')
                  post('category', catForm, 'Kategori ditambahkan').then((ok) => {
                    if (ok) setCatForm({ name: '', type: 'Lainnya' })
                  })
                }}
              />
              <DataTable
                headers={['Kategori', 'Jenis Biaya', '']}
                rows={cats}
                render={(c) => (
                  <tr key={c.id}>
                    <td className="table-cell-name">{c.name}</td>
                    <td><span className={'badge ' + (c.type === 'Operasional' ? 'badge-success' : 'badge-neutral')}>{c.type}</span></td>
                    <td>
                      <button className="table-icon-btn" title="Hapus" onClick={() => setConfirm({ action: 'category', id: c.id, msg: `Hapus kategori ${c.name}?` })}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </>
      )}

      {payBill && (
        <div className="modal-backdrop" onClick={() => setPayBill(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Catat Pembayaran Tagihan</h3>
            </div>
            <div style={{ fontSize: 13, marginBottom: 12, opacity: 0.8 }}>
              {payBill.customer_name} · {rupiah(payBill.amount)}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const amount = Number(payForm.amount)
                if (!amount || amount <= 0) return push('Jumlah wajib diisi', 'error')
                post('pay', { ...payForm, amount, bill_id: payBill.id }, 'Pembayaran dicatat').then((ok) => {
                  if (ok) setPayBill(null)
                })
              }}
            >
              <div className="field"><label>Tanggal Bayar</label><input className="input" type="date" value={payForm.pay_date} onChange={(e) => setPayForm({ ...payForm, pay_date: e.target.value })} required /></div>
              <div className="field"><label>Jumlah (Rp)</label><input className="input" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
              <div className="field">
                <label>Metode</label>
                <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                  {['Cash', 'Transfer', 'EDC', 'Lainnya'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="field"><label>Keterangan</label><input className="input" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPayBill(null)}>Batal</button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy}><CheckCircle2 size={15} /> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => del(confirm.action, confirm.id, 'Data dihapus')}
        busy={busy}
        title="Hapus Data"
        message={confirm?.msg}
      />
    </div>
  )
}
