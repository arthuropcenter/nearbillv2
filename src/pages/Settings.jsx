import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Smartphone, Info, Network, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../api/client'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import ConfirmDialog from '../components/ConfirmDialog'
import OltFormModal from '../components/OltFormModal'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [olts, setOlts] = useState([])
  const [oltLoading, setOltLoading] = useState(true)
  const [oltModal, setOltModal] = useState(null)
  const [confirmOlt, setConfirmOlt] = useState(null)
  const [busyOlt, setBusyOlt] = useState(false)

  const loadOlts = () => {
    setOltLoading(true)
    api('/olts.php')
      .then((res) => setOlts(res.data || []))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setOltLoading(false))
  }

  useEffect(loadOlts, [])

  const removeOlt = async () => {
    setBusyOlt(true)
    try {
      await api(`/olts.php?id=${confirmOlt.id}`, { method: 'DELETE' })
      push('Koneksi OLT dihapus')
      loadOlts()
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setBusyOlt(false)
      setConfirmOlt(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="page">
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="avatar" style={{ width: 54, height: 54, fontSize: 19 }}>
          {(user?.fullname || user?.username || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.fullname || user?.username}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>@{user?.username}</div>
        </div>
        <Badge status="active">{user?.user_type}</Badge>
      </div>

      {user?.user_type !== 'customer' && (
        <>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Integrasi OLT</span>
            <button className="btn btn-outline btn-sm" onClick={() => setOltModal({ olt: null })}>
              <Plus size={14} /> Tambah
            </button>
          </div>
          {oltLoading ? (
            <div className="card" style={{ padding: 24 }}><Spinner /></div>
          ) : olts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
              <Network size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
              <div>Belum ada koneksi OLT. Tambahkan OLT Hioso untuk memantau status modem pelanggan.</div>
            </div>
          ) : (
            olts.map((o) => (
              <div key={o.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <Network size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                    <div className="card-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o.ip_address}:{o.port} · {o.username}
                    </div>
                  </div>
                  <Badge status={o.enabled ? 'Active' : 'Disabled'}>{o.enabled ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setOltModal({ olt: o })}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setConfirmOlt(o)}>
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      <div className="section-title">Akun</div>
      <div className="card" style={{ padding: 6 }}>
        <button className="list-item" style={{ boxShadow: 'none', borderRadius: 10 }} onClick={() => navigate('/profile')}>
          <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <User size={18} />
          </div>
          <div className="item-main">
            <div className="item-title">Profil</div>
            <div className="item-sub">Lihat informasi akun & ganti password</div>
          </div>
        </button>
        <button className="list-item" style={{ boxShadow: 'none', borderRadius: 10 }} onClick={handleLogout}>
          <div className="avatar" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <LogOut size={18} />
          </div>
          <div className="item-main">
            <div className="item-title">Keluar</div>
            <div className="item-sub">Akhiri sesi login</div>
          </div>
        </button>
      </div>

      <div className="section-title">Tentang Aplikasi</div>
      <div className="card">
        <div className="detail-row">
          <div className="dt">Aplikasi</div>
          <div className="dd">NearBill v2.0</div>
        </div>
        <div className="detail-row">
          <div className="dt">Platform</div>
          <div className="dd" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Smartphone size={13} /> PWA Mobile
          </div>
        </div>
        <div className="detail-row">
          <div className="dt">Lisensi</div>
          <div className="dd">NearHome ISP</div>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--primary-light)', border: 'none' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
            <b>Tips instalasi:</b> Buka menu browser lalu pilih <b>“Tambahkan ke Layar Utama”</b> (Android) atau <b>“Add to Home Screen”</b> (iOS) agar NearBill bisa dipakai seperti aplikasi.
          </div>
        </div>
      </div>

      {oltModal && (
        <OltFormModal
          olt={oltModal.olt}
          onClose={() => setOltModal(null)}
          onSaved={loadOlts}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmOlt)}
        onClose={() => setConfirmOlt(null)}
        onConfirm={removeOlt}
        busy={busyOlt}
        title="Hapus Koneksi OLT"
        message={`Yakin ingin menghapus koneksi OLT "${confirmOlt?.name}"? Pelanggan yang memakainya tidak akan bisa dicek status modemnya.`}
      />
    </div>
  )
}
