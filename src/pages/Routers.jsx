import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Router, Plus, RefreshCw, RefreshCcw, Pencil, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Routers() {
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pingId, setPingId] = useState(null)
  const [syncId, setSyncId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    api('/routers.php')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const ping = async (id) => {
    setPingId(id)
    try {
      const res = await api('/ping.php', { method: 'POST', body: { id } })
      push(res.online ? `Router online (${res.ping_ms} ms)` : res.message, res.online ? 'success' : 'error')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setPingId(null)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/router.php?id=${confirm.id}`, { method: 'DELETE' })
      push('Router dihapus')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const sync = async (r) => {
    setSyncId(r.id)
    try {
      const res = await api('/pppoe_sync.php', {
        method: 'POST',
        body: { router_id: r.id, dry_run: false, fix_username: true, add_missing: true }
      })
      const bits = [
        res.status_updated ? `${res.status_updated} status` : null,
        res.usernames_fixed ? `${res.usernames_fixed} username` : null,
        res.plans_updated ? `${res.plans_updated} paket` : null,
        res.customers_added ? `${res.customers_added} pelanggan` : null
      ].filter(Boolean)
      const onlineInfo = res.online_count != null ? ` — ${res.online_count} online saat ini` : ''
      push(bits.length ? `Sinkron selesai: ${bits.join(', ')}${onlineInfo}` : `Data sudah sinkron${onlineInfo}`, 'success')
      load()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setSyncId(null)
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
              icon={<Router size={52} />}
              title="Belum ada router"
              subtitle="Tambahkan router MikroTik untuk monitoring."
            />
          ) : (
            data.data.map((r) => (
              <div key={r.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className="avatar"
                    style={{
                      background:
                        r.status === 'Online' ? 'linear-gradient(135deg,#22c55e,#0d9488)' : 'linear-gradient(135deg,#94a3b8,#64748b)'
                    }}
                  >
                    {r.status === 'Online' ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.ip_address}</div>
                    {r.last_seen && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                        Terakhir: {formatDateTime(r.last_seen)}
                      </div>
                    )}
                  </div>
                  <Badge status={r.status}>{r.status}</Badge>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => ping(r.id)} disabled={pingId === r.id}>
                    {pingId === r.id ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                    Ping
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => sync(r)} disabled={syncId === r.id}>
                    {syncId === r.id ? <Loader2 size={14} className="spin" /> : <RefreshCcw size={14} />}
                    Sinkronkan
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/routers/${r.id}/edit`)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setConfirm(r)}>
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      <button className="fab" onClick={() => navigate('/routers/new')} aria-label="Tambah router">
        <Plus size={26} />
      </button>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        title="Hapus Router"
        message={`Yakin ingin menghapus router ${confirm?.name}?`}
      />
    </div>
  )
}
