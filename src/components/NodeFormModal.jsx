import { useState } from 'react'
import { X, Loader2, MapPin, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function NodeFormModal({ node, coordsHint, onClose, onSaved, onPick, onDelete }) {
  const isEdit = Boolean(node)
  const { push } = useToast()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    node_type: node?.node_type || 'ODP',
    name: node?.name || '',
    coordinates: coordsHint || node?.coordinates || '',
    address: node?.address || '',
    area: node?.area || '',
    description: node?.description || ''
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isEdit) {
        await api(`/nodes.php?id=${node.id}&action=update`, { method: 'POST', body: form })
        push('Node berhasil diperbarui')
      } else {
        await api('/nodes.php', { method: 'POST', body: form })
        push('Node berhasil ditambahkan')
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
          <h3>{isEdit ? 'Edit Node' : 'Tambah Node'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Tipe Node</label>
            <div className="segmented">
              <button
                type="button"
                className={form.node_type === 'ODC' ? 'active' : ''}
                onClick={() => set('node_type')({ target: { value: 'ODC' } })}
              >
                ODC
              </button>
              <button
                type="button"
                className={form.node_type === 'ODP' ? 'active' : ''}
                onClick={() => set('node_type')({ target: { value: 'ODP' } })}
              >
                ODP
              </button>
              <button
                type="button"
                className={form.node_type === 'Pelanggan' ? 'active' : ''}
                onClick={() => set('node_type')({ target: { value: 'Pelanggan' } })}
              >
                Pelanggan
              </button>
            </div>
          </div>

          <div className="field">
            <label>Nama Node *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="cth: ODP-01, ODC Pusat" required />
          </div>

          <div className="field">
            <label>Koordinat (lat, lng) *</label>
            <input
              className="input"
              value={form.coordinates}
              onChange={set('coordinates')}
              placeholder="cth: -6.200000, 106.816666"
              required
            />
            <div className="field-hint">Klik &quot;Pilih di Peta&quot; atau isi manual dari Google Earth.</div>
          </div>

          <button type="button" className="btn btn-outline btn-block" style={{ marginBottom: 4 }} onClick={() => onPick?.(node)}>
            <MapPin size={16} /> Pilih di Peta
          </button>

          <div className="field">
            <label>Alamat</label>
            <input className="input" value={form.address} onChange={set('address')} />
          </div>

          <div className="field">
            <label>Area / Router</label>
            <input className="input" value={form.area} onChange={set('area')} placeholder="cth: Area Timur, Router RT-01" />
          </div>

          <div className="field">
            <label>Keterangan</label>
            <textarea value={form.description} onChange={set('description')} />
          </div>

          {isEdit && (
            <button
              type="button"
              className="btn btn-danger btn-block"
              style={{ marginBottom: 10 }}
              onClick={() => onDelete?.(node)}
            >
              <Trash2 size={16} /> Hapus Node Ini
            </button>
          )}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Loader2 size={18} className="spin" /> : null}
            {isEdit ? 'Simpan Perubahan' : 'Simpan Node'}
          </button>
        </form>
      </div>
    </div>
  )
}
