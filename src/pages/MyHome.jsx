import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Wifi, CreditCard, LifeBuoy, Router, RefreshCw,
  Wrench, AlertTriangle, Info, ChevronRight, User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { formatDate, rupiah } from '../utils/format'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import PortalShell from '../components/PortalShell'

const ANN_META = {
  info: { icon: Info, color: 'var(--primary)', bg: 'rgba(59,130,246,.14)' },
  maintenance: { icon: Wrench, color: '#f59e0b', bg: 'rgba(245,158,11,.14)' },
  outage: { icon: AlertTriangle, color: 'var(--danger)', bg: 'rgba(239,68,68,.16)' }
}

export default function MyHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [anns, setAnns] = useState([])
  const [ont, setOnt] = useState(null)
  const [ontLoading, setOntLoading] = useState(false)

  const id = user?.id

  useEffect(() => {
    api('/portal.php')
      .then(setData)
      .catch((e) => push(e.message, 'error'))
    api('/announcements.php')
      .then((res) => setAnns(res.data || []))
      .catch(() => {})
  }, [id])

  const loadOnt = () => {
    setOntLoading(true)
    api(`/ont_status.php?customer_id=${id}`)
      .then(setOnt)
      .catch((e) => setOnt({ error: e.message }))
      .finally(() => setOntLoading(false))
  }

  useEffect(loadOnt, [id])

  if (user?.user_type !== 'customer') return <Navigate to="/home" replace />

  if (!data) {
    return (
      <PortalShell>
        <div className="card" style={{ padding: 24 }}><Spinner /></div>
      </PortalShell>
    )
  }

  const c = data.customer
  const plan = data.plan
  const speed = plan && (plan.rate_down || plan.rate_down === 0)
    ? `${plan.rate_down} ${plan.rate_down_unit || 'Mbps'}`
    : null

  const daysLeft = data.days_left
  const daysBadge = daysLeft === null || daysLeft === undefined
    ? { label: 'Belum ada pembayaran', tone: 'neutral' }
    : daysLeft < 0
      ? { label: 'Masa aktif berakhir', tone: 'danger' }
      : daysLeft === 0
        ? { label: 'Berakhir hari ini', tone: 'danger' }
        : daysLeft <= 3
          ? { label: `Sisa ${daysLeft} hari`, tone: 'warning' }
          : { label: `Sisa ${daysLeft} hari`, tone: 'success' }

  const row = (dt, dd) => (
    <div className="detail-row">
      <div className="dt">{dt}</div>
      <div className="dd">{dd}</div>
    </div>
  )

  return (
    <PortalShell>
      {/* Profil singkat */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, background: 'linear-gradient(135deg,#06b6d4,#1f5eff)' }}>
          {(c.fullname || c.username || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.fullname || c.username}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <User size={12} /> {c.pppoe_username}
          </div>
        </div>
        <Badge status={c.status}>{c.status}</Badge>
      </div>

      {/* Status layanan */}
      <div className="section-title">Status Layanan</div>
      <div className="card">
        {row(
          'Paket',
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Wifi size={14} color="var(--primary)" />
            {plan?.name_plan || data.last?.plan_name || '-'}
            {speed ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>({speed})</span> : null}
          </span>
        )}
        {row('Berakhir pada', data.active_until ? formatDate(data.active_until) : '-')}
        {row('Masa aktif', <Badge status={daysBadge.tone}>{daysBadge.label}</Badge>)}
        {row('Saldo', rupiah(c.balance))}
        {row('Auto Renewal', Number(c.auto_renewal) === 1 ? 'Ya (pakai saldo)' : 'Tidak')}
        {row('IP PPPoE', c.pppoe_ip || '-')}
      </div>

      {/* Aksi cepat */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/my/payments')}>
          <CreditCard size={16} /> Bayar
        </button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/my/helpdesk')}>
          <LifeBuoy size={16} /> Bantuan
        </button>
      </div>

      {/* Pengumuman */}
      {anns.length > 0 && (
        <>
          <div className="section-title">Pengumuman</div>
          {anns.map((a) => {
            const M = ANN_META[a.category] || ANN_META.info
            const Icon = M.icon
            return (
              <div key={a.id} className="card" style={{ padding: 13, background: M.bg, border: 'none' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>
                    <Icon size={18} style={{ color: M.color }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                    {a.message ? <div className="card-sub" style={{ marginTop: 2 }}>{a.message}</div> : null}
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
                      {formatDate(a.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Modem ONT */}
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Router size={15} /> Modem (ONT)
        </span>
        <button className="btn btn-outline btn-sm" onClick={loadOnt} disabled={ontLoading}>
          <RefreshCw size={13} className={ontLoading ? 'spin' : ''} /> Periksa
        </button>
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
              <span className="card-sub">{ont.olt?.name} ({ont.olt?.ip_address})</span>
            </div>
            {ont.online ? (
              <>
                {row('PON / ONU', `${ont.customer.pon}/${ont.customer.onu}`)}
                {row('MAC', ont.mac)}
                {row('Jarak', ont.distance ? `${ont.distance} m` : '-')}
                {row('Uptime', ont.uptime || '-')}
                {ont.ddm ? row('Rx Power', ont.ddm.rx_power) : null}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 6 }}>
                ONU tidak ditemukan di OLT.
              </div>
            )}
          </>
        )}
      </div>

      {/* Info akun */}
      <div className="section-title">Informasi Akun</div>
      <div className="card">
        {row('Nama', c.fullname || '-')}
        {row('No. HP', c.phonenumber && c.phonenumber !== '0' ? c.phonenumber : '-')}
        {row('Email', c.email || '-')}
        {row('Alamat', [c.address, c.city].filter(Boolean).join(', ') || '-')}
        {row('Terdaftar', formatDate(c.created_at))}
      </div>

      <Link to="/my/payments" className="list-item" style={{ marginTop: 4, boxShadow: 'none' }}>
        <div className="item-main">
          <div className="item-title">Lihat tagihan & riwayat pembayaran</div>
        </div>
        <ChevronRight size={18} color="var(--muted)" />
      </Link>
    </PortalShell>
  )
}
