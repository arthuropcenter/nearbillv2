import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Users, Zap, Router as RouterIcon, CheckCircle2, Search, MessageSquareText, UserPlus, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PortalShell from '../components/PortalShell'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const ROLES = ['AdminGM', 'Teknisi']

export default function Teknisi() {
  const { user } = useAuth()
  const { push } = useToast()
  const role = user?.user_type
  if (!ROLES.includes(role)) return <Navigate to="/home" replace />

  const [stats, setStats] = useState(null)
  const [olts, setOlts] = useState([])
  const [onts, setOnts] = useState([])
  const [ontTotal, setOntTotal] = useState(0)
  const [tickets, setTickets] = useState([])
  const [checking, setChecking] = useState({})
  const [results, setResults] = useState({})

  useEffect(() => {
    api('/customers.php', { params: { limit: 1 } })
      .then((d) => {
        const total = d.total
        return api('/customers.php', { params: { status: 'Active', limit: 1 } })
          .then((d2) => setStats({ total, active: d2.total }))
          .catch(() => setStats({ total, active: 0 }))
      })
      .catch(() => setStats({ total: 0, active: 0 }))

    api('/olts.php')
      .then((d) => setOlts(d.data || []))
      .catch(() => {})

    api('/customers.php', { params: { ont: 1, limit: 50 } })
      .then((d) => {
        setOnts(d.data || [])
        setOntTotal(d.total || 0)
      })
      .catch(() => {})

    api('/tickets.php', { params: { all: 1, status: 'open' } })
      .then((d) => setTickets((d.data || []).slice(0, 5)))
      .catch(() => {})
  }, [])

  const check = async (c) => {
    setChecking((s) => ({ ...s, [c.id]: true }))
    try {
      const r = await api(`/ont_status.php?customer_id=${c.id}`)
      setResults((s) => ({ ...s, [c.id]: r }))
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setChecking((s) => ({ ...s, [c.id]: false }))
    }
  }

  const enabledOlts = olts.filter((o) => Number(o.enabled) === 1)
  const primaryOlt = enabledOlts[0]

  const cards = [
    { label: 'Total Pelanggan', value: stats?.total ?? '-', icon: Users, color: '#3b82f6' },
    { label: 'Pelanggan Aktif', value: stats?.active ?? '-', icon: Zap, color: '#22c55e' },
    { label: 'ONT Terkonfigurasi', value: ontTotal, icon: RouterIcon, color: '#06b6d4' },
    { label: 'OLT Aktif', value: enabledOlts.length, icon: CheckCircle2, color: '#f59e0b' }
  ]

  return (
    <PortalShell wide>
      <div className="rp-hero" style={{ marginBottom: 14 }}>
        <span className="rp-hero-icon" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
          <RouterIcon size={24} />
        </span>
        <div>
          <h1>Dashboard Teknisi</h1>
          <p>
            Ringkasan jaringan &amp; pemantauan ONT.
            {primaryOlt ? ` OLT utama: ${primaryOlt.name} (${primaryOlt.ip_address})` : ' OLT belum dikonfigurasi di Pengaturan.'}
          </p>
        </div>
        <Link to="/customers/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={16} /> Registrasi Pelanggan
        </Link>
      </div>

      <div className="tk-stats">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="card" style={{ padding: 14, flex: 1, minWidth: 130 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.color }}>
                <Icon size={18} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
            </div>
          )
        })}
      </div>

      <div className="section-title">Status ONT Pelanggan</div>
      {onts.length === 0 ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
          Belum ada pelanggan dengan data PON/ONU. Isi di menu Pelanggan.
        </div>
      ) : (
        <div className="card" style={{ padding: 6 }}>
          {onts.map((c) => {
            const r = results[c.id]
            const online = r && r.configured && r.online
            const checkingId = checking[c.id]
            return (
              <div key={c.id} style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.fullname || c.username}</div>
                  <div className="card-sub">@{c.username} · PON {c.ont_pon} / ONU {c.ont_onu}</div>
                </div>
                {r ? (
                  <Badge status={online ? 'active' : r.configured === false ? 'neutral' : 'expired'}>
                    {online ? 'Online' : r.configured === false ? 'Belum dikonfigurasi' : 'Offline'}
                  </Badge>
                ) : null}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => check(c)}
                  disabled={checkingId}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {checkingId ? <Spinner /> : <Search size={13} />}
                  Periksa
                </button>
                {c.pppoe_ip && (
                  <a
                    className="btn btn-sm btn-primary"
                    href={`http://${c.pppoe_ip}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Buka manajemen ONT ${c.pppoe_ip} (login: admin/admin)`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <ExternalLink size={13} /> ONT
                  </a>
                )}
                {r && r.message ? (
                  <div style={{ width: '100%', fontSize: 12, color: 'var(--muted)' }}>{r.message}</div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div className="section-title">Tiket Terbuka</div>
      {tickets.length === 0 ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
          Tidak ada tiket dengan status terbuka.
        </div>
      ) : (
        <div className="card" style={{ padding: 6 }}>
          {tickets.map((t) => (
            <div key={t.id} style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.subject}</div>
                <Badge status={t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'neutral'}>
                  {t.priority}
                </Badge>
              </div>
              <div className="card-sub">
                {t.ticket_no} · {t.category} · {t.cust_fullname || t.cust_username}
              </div>
            </div>
          ))}
          <Link to="/helpdesk" className="btn btn-sm btn-primary" style={{ margin: 8 }}>
            <MessageSquareText size={13} /> Buka Helpdesk
          </Link>
        </div>
      )}
    </PortalShell>
  )
}
