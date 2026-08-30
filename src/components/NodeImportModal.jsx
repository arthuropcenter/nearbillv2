import { useRef, useState } from 'react'
import { X, Loader2, Upload, FileUp } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function NodeImportModal({ onClose, onSaved }) {
  const { push } = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)
  const [nodeType, setNodeType] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!file) {
      push('Pilih file KML/KMZ terlebih dahulu', 'error')
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (nodeType) fd.append('node_type', nodeType)
      const res = await api('/nodes_import.php', { method: 'POST', body: fd })
      push(res.message, 'success')
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
          <h3>Import KML / KMZ</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>
            Ekspor titik dari Google Earth sebagai KML/KMZ, lalu unggah di sini. Node yang namanya sudah ada akan diperbarui
            koordinatnya. Nama yang mengandung &quot;ODC&quot;, &quot;ODP&quot;, atau &quot;Pelanggan/Customer/User&quot; akan
            otomatis dikenali tipenya.
          </p>

          <div className="field">
            <label>Tipe Node (opsional)</label>
            <select className="input" value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              <option value="">Deteksi Otomatis dari nama</option>
              <option value="ODC">Semua ODC</option>
              <option value="ODP">Semua ODP</option>
              <option value="Pelanggan">Semua Pelanggan</option>
            </select>
          </div>

          <div className="field">
            <label>File KML / KMZ *</label>
            <input ref={inputRef} className="input" type="file" accept=".kml,.kmz" onChange={(e) => setFile(e.target.files[0])} />
          </div>

          {file && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 13
              }}
            >
              <FileUp size={16} color="var(--primary)" />
              <span style={{ fontWeight: 600 }}>{file.name}</span>
              <span style={{ color: 'var(--muted)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
            Proses Import
          </button>
        </form>
      </div>
    </div>
  )
}
