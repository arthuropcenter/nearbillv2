import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { api } from '../api/client'
import { rupiah } from '../utils/format'

export default function CustomerPicker({ onSelect, onText, value, text, placeholder = 'Ketik nama / username / HP...' }) {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState([])
  const [open, setOpen] = useState(false)

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

  const pick = (c) => {
    onSelect(c)
    onText('')
    setQ('')
    setOpen(false)
  }

  const clear = () => {
    onSelect(null)
    onText('')
    setQ('')
    setOpen(false)
  }

  const shown = value ? value.fullname || value.username : text || q

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder={placeholder}
        value={shown}
        onChange={(e) => {
          setQ(e.target.value)
          onSelect(null)
          onText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {q.trim() && open && (
        <div className="mp-drop">
          {opts.length === 0 ? (
            <div style={{ padding: 10, fontSize: 12.5, color: 'var(--muted)' }}>Tidak ditemukan.</div>
          ) : (
            opts.map((c) => (
              <button key={c.id} type="button" className="mp-opt" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>
                <User size={14} style={{ flexShrink: 0, color: 'var(--muted)' }} />
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.fullname || c.username}</div>
                  <div className="card-sub">@{c.username} · {c.plan_name || c.last_plan || 'Tanpa paket'} · Saldo {rupiah(c.balance)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {value && (
        <div className="mp-selected">
          <div>
            <b>{value.fullname || value.username}</b> · @{value.username}
            <div className="card-sub">{value.plan_name || value.last_plan || 'Tanpa paket'} · Saldo {rupiah(value.balance)}</div>
          </div>
          <button type="button" className="btn btn-sm btn-outline" onClick={clear}>Ganti</button>
        </div>
      )}
    </div>
  )
}
