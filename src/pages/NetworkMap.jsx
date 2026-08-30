import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Plus, Upload, Download, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import Badge from '../components/Badge'
import MapView from '../components/MapView'
import NodeFormModal from '../components/NodeFormModal'
import NodeImportModal from '../components/NodeImportModal'

const DEFAULT_CENTER = [-6.2, 106.816]

export default function NetworkMap() {
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [layers, setLayers] = useState({ ODC: true, ODP: true, Pelanggan: true, customer: true })
  const [modal, setModal] = useState(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const mapRef = useRef(null)

  const load = () => {
    setLoading(true)
    api('/nodes.php')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const nodes = data?.nodes || []
  const customers = data?.customers || []
  const filtered = filter ? nodes.filter((n) => n.node_type === filter) : nodes
  const visibleNodes = nodes.filter((n) => layers[n.node_type])
  const visibleCustomers = layers.customer ? customers : []

  const counts = {
    all: nodes.length,
    ODC: nodes.filter((n) => n.node_type === 'ODC').length,
    ODP: nodes.filter((n) => n.node_type === 'ODP').length,
    Pelanggan: nodes.filter((n) => n.node_type === 'Pelanggan').length,
    customer: customers.length
  }

  const toggleLayer = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }))

  const center = useMemo(() => {
    const first = nodes.find((n) => n.coordinates && n.coordinates.includes(','))
    if (first) {
      const [lat, lng] = first.coordinates.split(',').map(Number)
      if (isFinite(lat) && isFinite(lng)) return [lat, lng]
    }
    return DEFAULT_CENTER
  }, [nodes])

  const startPick = (node) => {
    setEditDraft(node)
    setPicked(null)
    setModal(null)
    setPicking(true)
  }

  const handlePick = (latlng) => {
    const coords = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
    setPicking(false)
    setPicked([latlng.lat, latlng.lng])
    setModal({ node: editDraft, coordsHint: coords })
    setEditDraft(null)
  }

  const cancelPick = () => {
    setPicking(false)
    setPicked(null)
    setEditDraft(null)
  }

  const focusNode = (n) => {
    if (!mapRef.current || !n.coordinates) return
    const [lat, lng] = n.coordinates.split(',').map(Number)
    if (isFinite(lat) && isFinite(lng)) mapRef.current.flyTo([lat, lng], 16)
  }

  const exportKml = () => {
    const a = document.createElement('a')
    a.href = `/nearbillv2/api/nodes_export.php${filter ? `?type=${filter}` : ''}`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/nodes.php?id=${confirm.id}`, { method: 'DELETE' })
      push('Node berhasil dihapus')
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
      <div className="card" style={{ padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto' }}>
          <button className={'btn btn-sm ' + (filter === '' ? 'btn-primary' : 'btn-outline')} onClick={() => setFilter('')}>
            Semua ({counts.all})
          </button>
          <button className={'btn btn-sm ' + (filter === 'ODC' ? 'btn-primary' : 'btn-outline')} onClick={() => setFilter('ODC')}>
            ODC ({counts.ODC})
          </button>
          <button className={'btn btn-sm ' + (filter === 'ODP' ? 'btn-primary' : 'btn-outline')} onClick={() => setFilter('ODP')}>
            ODP ({counts.ODP})
          </button>
          <button className={'btn btn-sm ' + (filter === 'Pelanggan' ? 'btn-primary' : 'btn-outline')} onClick={() => setFilter('Pelanggan')}>
            Pelanggan ({counts.Pelanggan})
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import KML
          </button>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={exportKml}>
            <Download size={14} /> Export KML
          </button>
        </div>
      </div>

      <div className="nm-map-wrap">
        <MapView
          nodes={visibleNodes}
          customers={visibleCustomers}
          picking={picking}
          picked={picked}
          center={center}
          onPick={handlePick}
          onReady={(m) => (mapRef.current = m)}
        />
        {picking && (
          <div className="nm-pick-banner">
            <span>Klik pada peta untuk memilih lokasi</span>
            <button className="btn btn-ghost btn-sm" onClick={cancelPick}>
              <X size={14} /> Batal
            </button>
          </div>
        )}
      </div>

      <div className="nm-summary">
        <button className={`chip ${layers.ODC ? '' : 'dim'}`} onClick={() => toggleLayer('ODC')}>
          <span className="dot" style={{ background: '#8b5cf6' }} /> ODC {counts.ODC}
        </button>
        <button className={`chip ${layers.ODP ? '' : 'dim'}`} onClick={() => toggleLayer('ODP')}>
          <span className="dot" style={{ background: '#f59e0b' }} /> ODP {counts.ODP}
        </button>
        <button className={`chip ${layers.Pelanggan ? '' : 'dim'}`} onClick={() => toggleLayer('Pelanggan')}>
          <span className="dot" style={{ background: '#22c55e' }} /> Pelanggan {counts.Pelanggan}
        </button>
        <button className={`chip ${layers.customer ? '' : 'dim'}`} onClick={() => toggleLayer('customer')}>
          <span className="dot" style={{ background: '#06b6d4' }} /> Pelanggan Aktif {counts.customer}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin size={52} />}
          title="Belum ada node"
          subtitle="Import dari Google Earth (KML/KMZ) atau tambahkan manual."
        />
      ) : (
        filtered.map((n) => (
          <div key={n.id} className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => focusNode(n)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className="avatar"
                style={{
                  background:
                    n.node_type === 'ODC'
                      ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)'
                      : n.node_type === 'Pelanggan'
                        ? 'linear-gradient(135deg,#22c55e,#15803d)'
                        : 'linear-gradient(135deg,#f59e0b,#d97706)'
                }}
              >
                <MapPin size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {n.name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {n.coordinates}
                  {n.area ? ` • ${n.area}` : ''}
                  {n.address ? ` • ${n.address}` : ''}
                </div>
              </div>
              <Badge status={n.node_type}>{n.node_type}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ flex: 1 }}
                onClick={() => setModal({ node: n, coordsHint: n.coordinates })}
              >
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setConfirm(n)}>
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        ))
      )}

      <button
        className="fab"
        onClick={() => { setPicked(null); setModal({ node: null, coordsHint: null }) }}
        aria-label="Tambah node"
      >
        <Plus size={26} />
      </button>

      {modal && (
        <NodeFormModal
          node={modal.node}
          coordsHint={modal.coordsHint}
          onClose={() => { setModal(null); setPicked(null) }}
          onSaved={load}
          onPick={startPick}
          onDelete={(n) => setConfirm(n)}
        />
      )}

      {importOpen && <NodeImportModal onClose={() => setImportOpen(false)} onSaved={load} />}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        title="Hapus Node"
        message={`Yakin ingin menghapus ${confirm?.name}?`}
      />
    </div>
  )
}
