import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'

const PRESETS = [
  { label: '2 Mbps', down: 2, up: 2 },
  { label: '4 Mbps', down: 4, up: 4 },
  { label: '6 Mbps', down: 6, up: 6 },
  { label: '8 Mbps', down: 8, up: 8 },
  { label: '10 Mbps', down: 10, up: 10 },
  { label: '20 Mbps', down: 20, up: 20 }
]

export default function BandwidthForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { push } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name_bw: '',
    rate_down: 4,
    rate_down_unit: 'Mbps',
    rate_up: 4,
    rate_up_unit: 'Mbps',
    burst_limit: 0,
    burst_threshold: 0,
    burst_time: 0,
    priority: 8,
    limit_at: 0
  })

  useEffect(() => {
    if (!isEdit) return
    api(`/bandwidth_item.php?id=${id}`)
      .then((res) => {
        const b = res.bandwidth
        setForm({
          name_bw: b.name_bw,
          rate_down: b.rate_down,
          rate_down_unit: b.rate_down_unit,
          rate_up: b.rate_up,
          rate_up_unit: b.rate_up_unit,
          burst_limit: b.burst_limit || 0,
          burst_threshold: b.burst_threshold || 0,
          burst_time: b.burst_time || 0,
          priority: b.priority || 8,
          limit_at: b.limit_at || 0
        })
      })
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const applyPreset = (p) =>
    setForm((f) => ({ ...f, rate_down: p.down, rate_up: p.up, name_bw: p.label }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isEdit) {
        await api(`/bandwidth_item.php?id=${id}&action=update`, { method: 'POST', body: form })
        push('Bandwidth berhasil diperbarui')
      } else {
        await api('/bandwidth.php', { method: 'POST', body: form })
        push('Bandwidth berhasil ditambahkan')
      }
      navigate('/bandwidth')
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
        <div className="section-title" style={{ marginTop: 0 }}>Preset Cepat</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="field">
          <label>Nama Bandwidth *</label>
          <input className="input" value={form.name_bw} onChange={set('name_bw')} required />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Rate Down *</label>
            <input className="input" type="number" min="1" value={form.rate_down} onChange={set('rate_down')} required />
          </div>
          <div className="field">
            <label>Unit Down</label>
            <select className="input" value={form.rate_down_unit} onChange={set('rate_down_unit')}>
              <option>Mbps</option>
              <option>Kbps</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Rate Up *</label>
            <input className="input" type="number" min="1" value={form.rate_up} onChange={set('rate_up')} required />
          </div>
          <div className="field">
            <label>Unit Up</label>
            <select className="input" value={form.rate_up_unit} onChange={set('rate_up_unit')}>
              <option>Mbps</option>
              <option>Kbps</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section-title">Burst (Opsional)</div>
      <div className="card">
        <div className="form-row">
          <div className="field">
            <label>Burst Limit (kbps)</label>
            <input className="input" type="number" min="0" value={form.burst_limit} onChange={set('burst_limit')} />
          </div>
          <div className="field">
            <label>Burst Threshold (kbps)</label>
            <input className="input" type="number" min="0" value={form.burst_threshold} onChange={set('burst_threshold')} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Burst Time (detik)</label>
            <input className="input" type="number" min="0" value={form.burst_time} onChange={set('burst_time')} />
          </div>
          <div className="field">
            <label>Limit At (kbps)</label>
            <input className="input" type="number" min="0" value={form.limit_at} onChange={set('limit_at')} />
          </div>
        </div>
        <div className="field">
          <label>Prioritas</label>
          <select className="input" value={form.priority} onChange={set('priority')}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="fab-save">
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          {isEdit ? 'Simpan Perubahan' : 'Simpan Bandwidth'}
        </button>
      </div>
    </form>
  )
}
