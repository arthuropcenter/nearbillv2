import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { Activity, ArrowDown, ArrowUp, ChevronDown, ChevronUp, Pause, Play, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'

const GRID = 'rgba(255, 255, 255, 0.1)'
const TICK = 'rgba(255, 255, 255, 0.55)'
const RX = '#22d3ee'
const TX = '#4ade80'
const TOOLTIP = { borderRadius: 12, background: '#16224f', border: '1px solid rgba(255,255,255,0.16)', fontSize: 12.5, color: '#fff' }

function fmtBps(bps) {
  const v = Number(bps) || 0
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' Gbps'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + ' Mbps'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + ' Kbps'
  return v + ' bps'
}

export default function RouterTraffic() {
  const [routers, setRouters] = useState([])
  const [routerId, setRouterId] = useState(null)
  const [live, setLive] = useState(null)
  const [hist, setHist] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [paused, setPaused] = useState(false)
  const [lastTs, setLastTs] = useState('')

  useEffect(() => {
    api('/routers.php')
      .then((res) => {
        const list = (res.data || []).filter((r) => Number(r.enabled) === 1)
        setRouters(list)
        if (list.length) {
          const desktop = list.find((r) => String(r.name).toLowerCase().includes('desktop'))
          setRouterId(desktop ? desktop.id : list[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!routerId || paused) return

    const poll = async () => {
      try {
        const res = await api('/router_traffic.php', { params: { action: 'poll', id: routerId } })
        setLive(res)
        if (res.ts) setLastTs(res.ts)
      } catch {
        setLive(null)
      }
    }

    const histLoad = async () => {
      try {
        const res = await api('/router_traffic.php', { params: { action: 'history', id: routerId, minutes: 30 } })
        const grouped = {}
        ;(res.history || []).forEach((s) => {
          if (!grouped[s.interface]) grouped[s.interface] = []
          grouped[s.interface].push(s)
        })
        setHist(grouped)
      } catch {}
    }

    poll()
    histLoad()
    const t1 = setInterval(poll, 5000)
    const t2 = setInterval(histLoad, 60000)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
    }
  }, [routerId, paused])

  const online = live?.online === true
  const interfaces = (live?.interfaces || []).slice().sort((a, b) => a.name.localeCompare(b.name))

  const buildData = (name) =>
    (hist[name] || []).map((s) => ({
      t: String(s.created_at).slice(11, 19),
      rx: Number(s.rx_bps) / 1e6,
      tx: Number(s.tx_bps) / 1e6
    }))

  if (loading) {
    return (
      <div className="page" style={{ paddingTop: 20 }}>
        <Spinner />
      </div>
    )
  }

  if (routers.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Activity size={52} />}
          title="Belum ada router"
          subtitle="Tambahkan router MikroTik di menu Router untuk memonitor trafik."
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card" style={{ padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" style={{ flex: 1 }} value={routerId || ''} onChange={(e) => { setRouterId(Number(e.target.value)); setExpanded(null) }}>
            {routers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            className="btn btn-ghost"
            style={{ padding: '10px 14px' }}
            onClick={() => setPaused((p) => !p)}
            title={paused ? 'Lanjutkan pemantauan' : 'Jeda pemantauan'}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 12.5, color: 'var(--muted)' }}>
          <Badge status={online ? 'Online' : 'Offline'}>{online ? 'Online' : 'Offline'}</Badge>
          <span>
            {paused ? 'Dijeda' : lastTs ? `Update ${String(lastTs).slice(11, 19)}` : 'Menyambung...'}
            {online ? ` • ${interfaces.length} interface` : ''}
          </span>
        </div>
      </div>

      {!online ? (
        <div className="error-box">Router tidak dapat dijangkau. Periksa koneksi atau kredensial router.</div>
      ) : interfaces.length === 0 ? (
        <EmptyState
          icon={<Activity size={52} />}
          title="Tidak ada interface berjalan"
          subtitle="Belum ada interface yang statusnya running di router ini."
        />
      ) : (
        <div className="traffic-grid">
          {interfaces.map((it, i) => {
            const data = buildData(it.name)
            const open = expanded === it.name
            return (
              <div
                key={it.name}
                className="card traffic-card"
                onClick={() => setExpanded(open ? null : it.name)}
              >
                <div className="traffic-head">
                  <span className="traffic-dot" />
                  <div className="traffic-title">
                    <div className="table-cell-name" style={{ fontWeight: 700, fontSize: 13.5 }}>{it.name}</div>
                    <div className="table-cell-sub">{it.type}</div>
                  </div>
                  {open ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
                </div>

                <div className="traffic-speeds">
                  <span style={{ color: RX }}>
                    <ArrowDown size={14} /> {fmtBps(it.rx_bps)}
                  </span>
                  <span style={{ color: TX }}>
                    <ArrowUp size={14} /> {fmtBps(it.tx_bps)}
                  </span>
                </div>

                <div className="traffic-chart">
                  <ResponsiveContainer width="100%" height={54}>
                    <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`t-rx-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={RX} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={RX} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={`t-tx-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={TX} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={TX} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="rx" stroke={RX} fill={`url(#t-rx-${i})`} strokeWidth={1.5} isAnimationActive={false} dot={false} />
                      <Area type="monotone" dataKey="tx" stroke={TX} fill={`url(#t-tx-${i})`} strokeWidth={1.5} isAnimationActive={false} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {open && (
                  <div className="traffic-expanded">
                    <div className="traffic-speeds" style={{ fontSize: 12.5 }}>
                      <span style={{ color: RX }}>RX {fmtBps(it.rx_bps)}</span>
                      <span style={{ color: TX }}>TX {fmtBps(it.tx_bps)}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={170}>
                      <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                        <XAxis dataKey="t" tick={{ fill: TICK, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                        <YAxis tick={{ fill: TICK, fontSize: 10 }} tickLine={false} axisLine={false} width={46} tickFormatter={(v) => v + 'M'} />
                        <Tooltip
                          contentStyle={TOOLTIP}
                          labelStyle={{ color: '#fff' }}
                          formatter={(v) => `${v} Mbps`}
                        />
                        <Area type="monotone" dataKey="rx" name="RX" stroke={RX} fill={`url(#t-rx-${i})`} strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="tx" name="TX" stroke={TX} fill={`url(#t-tx-${i})`} strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    {data.length < 2 && (
                      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                        <Loader2 size={13} className="spin" /> Mengumpulkan sampel data...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
