import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Pencil, ChevronRight, Router } from 'lucide-react'
import { api } from '../api/client'
import { formatDate, initials } from '../utils/format'
import Badge from '../components/Badge'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import CustomerFormModal from '../components/CustomerFormModal'

const STATUS_FILTERS = ['', 'Active', 'Inactive', 'Expired', 'Banned', 'Limited', 'Suspended', 'Disabled']

export default function Customers() {
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editId, setEditId] = useState(null)

  const load = () => {
    setLoading(true)
    api('/customers.php', { params: { search, status, page, limit: 10 } })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search, status, page])

  const contact = (c) => {
    if (c.phonenumber && c.phonenumber !== '0') return c.phonenumber
    return c.email || '-'
  }

  return (
    <div className="page">
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari nama, username, HP..." />

      <div className="card" style={{ padding: 8, marginBottom: 12 }}>
        <select
          className="input"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === '' ? 'Semua Status' : s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {(!data || data.data.length === 0) ? (
            <EmptyState
              icon={<Users size={52} />}
              title="Belum ada pelanggan"
              subtitle="Tambahkan pelanggan pertama kamu."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Kontak</th>
                    <th>Paket</th>
                    <th>Status</th>
                    <th style={{ width: 76 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: 'linear-gradient(135deg,#06b6d4,#1f5eff)' }}>
                            {initials(c.fullname || c.username)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="table-cell-name">{c.fullname || c.username}</div>
                            <div className="table-cell-sub">@{c.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-name" style={{ fontWeight: 600, fontSize: 12.5 }}>{contact(c)}</div>
                      </td>
                      <td>
                        {c.last_plan ? (
                          <>
                            <div className="table-cell-name" style={{ fontWeight: 600, fontSize: 12.5 }}>{c.last_plan}</div>
                            {c.last_expiration && (
                              <div className="table-cell-sub">s/d {formatDate(c.last_expiration)}</div>
                            )}
                          </>
                        ) : (
                          <div className="table-cell-sub">-</div>
                        )}
                      </td>
                      <td><Badge status={c.status}>{c.status}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.pppoe_ip && (
                            <a
                              className="table-icon-btn"
                              title={`Manajemen ONT ${c.pppoe_ip} (login: admin/admin)`}
                              aria-label={`Manajemen ONT ${c.fullname || c.username}`}
                              href={`http://${c.pppoe_ip}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Router size={15} />
                            </a>
                          )}
                          <button
                            className="table-icon-btn"
                            title="Edit pelanggan"
                            aria-label={`Edit ${c.fullname || c.username}`}
                            onClick={(e) => { e.stopPropagation(); setEditId(c.id) }}
                          >
                            <Pencil size={15} />
                          </button>
                          <ChevronRight size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </>
      )}

      <button className="fab" onClick={() => navigate('/customers/new')} aria-label="Tambah pelanggan">
        <Plus size={26} />
      </button>

      {editId && (
        <CustomerFormModal
          id={editId}
          onClose={() => setEditId(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
