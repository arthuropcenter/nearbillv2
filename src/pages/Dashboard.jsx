import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import {
  Wallet,
  CalendarRange,
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Loader2
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { rupiah } from '../utils/format'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'

const PIE_COLORS = ['#4f7dff', '#a78bfa', '#22d3ee', '#fbbf24', '#4ade80', '#f87171']
const GRID = 'rgba(255, 255, 255, 0.12)'
const TICK = 'rgba(255, 255, 255, 0.55)'
const TOOLTIP = { borderRadius: 12, background: '#16224f', border: '1px solid rgba(255,255,255,0.16)', fontSize: 12.5, color: '#fff' }

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const hideFinance = ['AdminCS', 'Teknisi'].includes(user?.user_type)

  useEffect(() => {
    api('/dashboard.php')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page" style={{ paddingTop: 20 }}>
        <Spinner />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <div className="error-box">Gagal memuat data dashboard.</div>
      </div>
    )
  }

  const incomeChartData = data.income7days.labels.map((l, i) => ({
    label: l,
    nilai: data.income7days.values[i]
  }))

  const customersChartData = data.customersByMonth.labels.map((l, i) => ({
    label: l,
    total: data.customersByMonth.values[i]
  }))

  const orderChartData = data.planStats.plans.map((p, i) => ({
    name: p,
    value: data.planStats.values[i]
  }))

  const monitoring = data.userMonitoring
  const monitoringTotal = monitoring.active + monitoring.expired + monitoring.inactive + monitoring.banned + monitoring.limited
  const activePct = monitoringTotal > 0 ? Math.round((monitoring.active / monitoringTotal) * 100) : 0

  const deltaIconToday =
    data.incomeTodayPercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />
  const deltaIconMonth =
    data.monthIncomePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />

  return (
    <div className="page">
      {/* Sambutan */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1f5eff 0%, #0d3fd1 60%, #4c1d95 130%)',
          color: '#fff',
          border: 'none'
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.85 }}>Halo, selamat datang kembali 👋</div>
        <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4 }}>
          {user?.fullname || user?.username || 'Admin'}
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
          Berikut ringkasan kinerja bisnismu hari ini.
        </div>
      </div>

      {/* Statistik utama */}
      <div className="stat-grid">
        {!hideFinance && (
          <>
            <StatCard
              icon={<Wallet size={20} />}
              label="Pemasukan Hari Ini"
              value={rupiah(data.incomeToday)}
              delta={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {deltaIconToday} {Math.abs(data.incomeTodayPercent).toLocaleString('id-ID')}%
                </span>
              }
              deltaTone={data.incomeTodayPercent >= 0 ? 'success' : 'danger'}
              color="primary"
            />
            <StatCard
              icon={<CalendarRange size={20} />}
              label="Pemasukan Bulan Ini"
              value={rupiah(data.monthIncome)}
              delta={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {deltaIconMonth} {Math.abs(data.monthIncomePercent).toLocaleString('id-ID')}%
                </span>
              }
              deltaTone={data.monthIncomePercent >= 0 ? 'success' : 'danger'}
              color="purple"
            />
          </>
        )}
        <StatCard
          icon={<UserCheck size={20} />}
          label="Pelanggan Aktif"
          value={data.activeCustomers.toLocaleString('id-ID')}
          delta={<span>{data.inactiveCustomers} tidak aktif</span>}
          deltaTone={data.inactiveCustomers > 0 ? 'danger' : 'success'}
          color="success"
        />
        <StatCard
          icon={<Users size={20} />}
          label="Total Pelanggan"
          value={data.totalCustomers.toLocaleString('id-ID')}
          color="info"
        />
      </div>

      {/* Grafik pemasukan 7 hari */}
      {!hideFinance && (
        <div className="card">
          <div className="card-title">Pemasukan 7 Hari Terakhir</div>
          <div className="card-sub">Periode seminggu ke belakang</div>
          <div style={{ height: 210, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeChartData} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f5eff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1f5eff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [rupiah(v), 'Pemasukan']}
                  contentStyle={TOOLTIP}
                />
                <Area type="monotone" dataKey="nilai" stroke="#1f5eff" strokeWidth={2.5} fill="url(#gIncome)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pertumbuhan & monitoring */}
      {!hideFinance && (
        <div className="card">
          <div className="card-title">Pertumbuhan Perusahaan</div>
          <div className="card-sub">
            {data.revenueByYear.currentYear} vs {data.revenueByYear.previousYear}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div className="stat-card" style={{ flex: 1 }}>
              <div className="stat-label">Tahun {data.revenueByYear.currentYear}</div>
              <div className="stat-value" style={{ fontSize: 16 }}>
                {rupiah(data.revenueByYear.current)}
              </div>
            </div>
            <div className="stat-card" style={{ flex: 1 }}>
              <div className="stat-label">Tahun {data.revenueByYear.previousYear}</div>
              <div className="stat-value" style={{ fontSize: 16 }}>
                {rupiah(data.revenueByYear.previous)}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span className="badge badge-primary">
              <TrendingUp size={13} /> {data.revenueByYear.growth.toLocaleString('id-ID')}% growth
            </span>
          </div>
        </div>
      )}

      {/* Customer per bulan */}
      <div className="card">
        <div className="card-title">Pelanggan Terdaftar per Bulan</div>
        <div className="card-sub">Berdasarkan bulan pendaftaran</div>
        <div style={{ height: 190, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customersChartData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`${v} pelanggan`, 'Terdaftar']}
                contentStyle={TOOLTIP}
              />
              <Bar dataKey="total" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pelanggan per paket */}
      <div className="card">
        <div className="card-title">Pelanggan per Paket</div>
        <div className="card-sub">{data.planStats.total.toLocaleString('id-ID')} pelanggan berlangganan</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{ height: 170, width: '45%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {orderChartData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [`${v} pelanggan`, n]}
                  contentStyle={TOOLTIP}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1 }}>
            {orderChartData.map((o, i) => (
              <div key={o.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{o.value}</span>
              </div>
            ))}
            {orderChartData.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada pelanggan berpaket.</div>
            )}
          </div>
        </div>
      </div>

      {/* Monitoring pelanggan */}
      <div className="card">
        <div className="card-title">Status Pelanggan</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{ height: 150, width: '42%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Aktif', value: monitoring.active },
                    { name: 'Kadaluarsa', value: monitoring.expired },
                    { name: 'Nonaktif', value: monitoring.inactive },
                    { name: 'Lainnya', value: monitoring.banned + monitoring.limited }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={62}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Pelanggan aktif</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{monitoring.active} ({activePct}%)</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Kadaluarsa</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{monitoring.expired}</div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nonaktif</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{monitoring.inactive}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
