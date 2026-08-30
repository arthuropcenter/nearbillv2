import { useEffect, useState } from 'react'
import { Zap, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { formatDate, rupiah } from '../utils/format'
import Badge from '../components/Badge'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

export default function ActiveCustomers() {
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ router: '', plan: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api('/active_customers.php', { params: { ...filters, search, page, limit: 10 } })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [filters, search, page])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="page">
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari pelanggan aktif..." />

      <div className="card" style={{ padding: 8, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select
            className="input"
            value={filters.router}
            onChange={(e) => { setFilters((f) => ({ ...f, router: e.target.value })); setPage(1) }}
          >
            <option value="">Semua Router</option>
            {data?.filters.routers.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.plan}
            onChange={(e) => { setFilters((f) => ({ ...f, plan: e.target.value })); setPage(1) }}
          >
            <option value="">Semua Paket</option>
            {data?.filters.plans.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {!data || data.data.length === 0 ? (
            <EmptyState
              icon={<Zap size={52} />}
              title="Tidak ada pelanggan aktif"
              subtitle="Pelanggan dengan masa aktif berjalan akan tampil di sini."
            />
          ) : (
            data.data.map((t) => (
              <button
                key={t.id}
                className="list-item"
                onClick={() => t.user_id ? navigate(`/customers/${t.user_id}`) : undefined}
              >
                <div className="avatar" style={{ background: 'linear-gradient(135deg,#22c55e,#0d9488)' }}>
                  <Zap size={18} />
                </div>
                <div className="item-main">
                  <div className="item-title">{t.fullname || t.username}</div>
                  <div className="item-sub">{t.plan_name} · {t.routers}</div>
                  <div className="item-sub">
                    Aktif s/d{' '}
                    <span style={{ color: t.expiration === today ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {formatDate(t.expiration)}
                    </span>
                  </div>
                </div>
                <div className="item-end">
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--success)' }}>{rupiah(t.price)}</div>
                  <div style={{ marginTop: 4 }}>
                    <Badge status={t.expiration >= today ? 'Active' : 'Expired'}>
                      {t.expiration >= today ? 'Aktif' : 'Berakhir'}
                    </Badge>
                  </div>
                  {t.user_id ? <ChevronRight size={15} color="var(--muted)" /> : null}
                </div>
              </button>
            ))
          )}

          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </>
      )}
    </div>
  )
}
