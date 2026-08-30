import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Bandwidth() {
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    api('/bandwidth.php')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/bandwidth_item.php?id=${confirm.id}`, { method: 'DELETE' })
      push('Bandwidth dihapus')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <div className="page">
      {loading ? (
        <Spinner />
      ) : (
        <>
          {!data || data.data.length === 0 ? (
            <EmptyState
              icon={<Gauge size={52} />}
              title="Belum ada bandwidth"
              subtitle="Tambahkan paket bandwidth pertama kamu."
            />
          ) : (
            data.data.map((b) => (
              <div key={b.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                    <Gauge size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name_bw}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      ↓ {b.rate_down} {b.rate_down_unit} / ↑ {b.rate_up} {b.rate_up_unit}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/bandwidth/${b.id}/edit`)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setConfirm(b)}>
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      <button className="fab" onClick={() => navigate('/bandwidth/new')} aria-label="Tambah bandwidth">
        <Plus size={26} />
      </button>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        title="Hapus Bandwidth"
        message={`Yakin ingin menghapus bandwidth ${confirm?.name_bw}?`}
      />
    </div>
  )
}
