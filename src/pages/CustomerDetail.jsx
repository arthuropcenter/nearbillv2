import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, Phone, Mail, MapPin, Wifi, RefreshCw, Router, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDate, rupiah, initials } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import ConfirmDialog from '../components/ConfirmDialog'
import CustomerFormModal from '../components/CustomerFormModal'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const [ont, setOnt] = useState(null)
  const [ontLoading, setOntLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api(`/customer.php?id=${id}`)
      .then((res) => setCustomer(res.customer))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const loadOnt = () => {
    setOntLoading(true)
    api(`/ont_status.php?customer_id=${id}`)
      .then((res) => setOnt(res))
      .catch((e) => setOnt({ error: e.message }))
      .finally(() => setOntLoading(false))
  }

  useEffect(load, [id])
  useEffect(loadOnt, [id])

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/customer.php?id=${id}`, { method: 'DELETE' })
      push('Pelanggan dihapus')
      navigate('/customers')
    } catch (e) {
      push(e.message, 'error')
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!customer) return <div className="page"><div className="error-box">Pelanggan tidak ditemukan.</div></div>

  const row = (dt, dd) => (
    <div className="detail-row">
      <div className="dt">{dt}</div>
      <div className="dd">{dd}</div>
    </div>
  )

  return (
    <div className="page">
      {/* Profil */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="avatar" style={{ width: 58, height: 58, fontSize: 20, background: 'linear-gradient(135deg,#06b6d4,#1f5eff)' }}>
          {initials(customer.fullname || customer.username)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {customer.fullname || customer.username}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>@{customer.username}</div>
          <Badge status={customer.status}>{customer.status}</Badge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} /> Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </div>

      {/* Info kontak */}
      <div className="section-title">Kontak</div>
      <div className="card">
        {row('Tipe Akun', customer.account_type || '-')}
        {row('Tipe Layanan', customer.service_type || '-')}
        {row(
          'No. HP',
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Phone size={13} /> {customer.phonenumber && customer.phonenumber !== '0' ? customer.phonenumber : '-'}
          </span>
        )}
        {row(
          'Email',
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Mail size={13} /> {customer.email || '-'}
          </span>
        )}
        {row(
          'Alamat',
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={13} /> {[customer.address, customer.city].filter(Boolean).join(', ') || '-'}
          </span>
        )}
        {customer.coordinates ? row('Koordinat', customer.coordinates) : null}
      </div>

      {/* Info layanan */}
      <div className="section-title">Layanan</div>
      <div className="card">
        {row('Username PPPoE', customer.pppoe_username || '-')}
        {row('Password PPPoE', customer.pppoe_password || '-')}
        {row('IP PPPoE', customer.pppoe_ip || '-')}
        {customer.pppoe_ip
          ? row(
              'Login ONT',
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: 'monospace' }}>admin / admin</span>
              </span>
            )
          : null}
        {row('Saldo', rupiah(customer.balance))}
        {row('Auto Renewal', Number(customer.auto_renewal) === 1 ? 'Ya' : 'Tidak')}
        {row('Terdaftar', formatDate(customer.created_at))}
      </div>

      {/* Modem (ONT) */}
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Router size={15} /> Modem (ONT)
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {customer.pppoe_ip && (
            <a
              className="btn btn-primary btn-sm"
              href={`http://${customer.pppoe_ip}`}
              target="_blank"
              rel="noreferrer"
              title="Buka halaman manajemen ONT (login: admin/admin)"
            >
              <ExternalLink size={13} /> Manajemen ONT
            </a>
          )}
          <button className="btn btn-outline btn-sm" onClick={loadOnt} disabled={ontLoading}>
            <RefreshCw size={13} className={ontLoading ? 'spin' : ''} /> Periksa
          </button>
        </div>
      </div>
      <div className="card">
        {ontLoading ? (
          <Spinner />
        ) : !ont ? null : ont.error ? (
          <div className="error-box">{ont.error}</div>
        ) : !ont.configured ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 6 }}>
            <Router size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
            <div>{ont.message}</div>
          </div>
        ) : ont.online === false && ont.message ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 6 }}>{ont.message}</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Badge status={ont.online ? 'Active' : 'Inactive'}>{ont.online ? 'Online' : 'Offline'}</Badge>
              <span className="card-sub">
                {ont.olt?.name} ({ont.olt?.ip_address})
              </span>
            </div>
            {ont.online ? (
              <>
                {row('PON / ONU', `${ont.customer.pon}/${ont.customer.onu}`)}
                {row('ID ONU', ont.onu_id)}
                {row('MAC', ont.mac)}
                {row('Port', ont.ports)}
                {row('Jarak', ont.distance ? `${ont.distance} m` : '-')}
                {row('Uptime', ont.uptime || '-')}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 6 }}>
                ONU tidak ditemukan di OLT. Periksa nomor PON / ONU pada data pelanggan.
              </div>
            )}
            {ont.ddm ? (
              <>
                <div className="card-sub" style={{ margin: '10px 0 4px' }}>Optical DDM</div>
                {row('Temperatur', ont.ddm.temperature)}
                {row('Tegangan', ont.ddm.voltage)}
                {row('Arus', ont.ddm.current)}
                {row('Tx Power', ont.ddm.tx_power)}
                {row('Rx Power', ont.ddm.rx_power)}
              </>
            ) : null}
          </>
        )}
      </div>

      {/* Transaksi */}
      <div className="section-title">Riwayat Transaksi</div>
      {customer.transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Belum ada transaksi.
        </div>
      ) : (
        customer.transactions.map((t) => (
          <div key={t.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                <Wifi size={16} color="var(--primary)" /> {t.plan_name}
              </div>
              <Badge status={t.expiration >= new Date().toISOString().slice(0, 10) ? 'Active' : 'Expired'}>
                {t.expiration >= new Date().toISOString().slice(0, 10) ? 'Aktif' : 'Berakhir'}
              </Badge>
            </div>
            <div className="card-sub">
              {formatDate(t.recharged_on)} — s/d {formatDate(t.expiration)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                {t.routers} · {t.method || t.type}
              </span>
              <span style={{ fontWeight: 800, color: 'var(--success)' }}>{rupiah(t.price)}</span>
            </div>
          </div>
        ))
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        busy={busy}
        title="Hapus Pelanggan"
        message={`Yakin ingin menghapus ${customer.fullname || customer.username}? Tindakan ini tidak dapat dibatalkan.`}
      />

      {editOpen && (
        <CustomerFormModal
          id={Number(id)}
          onClose={() => setEditOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
