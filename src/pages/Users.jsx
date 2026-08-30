import { useEffect, useState } from 'react'
import { Users as UsersIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDateTime, initials } from '../utils/format'
import { ROLE_META } from '../utils/roles'
import Badge from '../components/Badge'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import UserFormModal from '../components/UserFormModal'

const STATUS_FILTERS = ['', 'Active', 'Inactive']

export default function Users() {
  const { user: me } = useAuth()
  const { push } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    api('/users.php', { params: { search, status, page, limit: 10 } })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search, status, page])

  const remove = async (u) => {
    if (!window.confirm(`Hapus pengguna "${u.fullname || u.username}"?`)) return
    try {
      await api(`/users.php?id=${u.id}&action=delete`, { method: 'POST' })
      push('Pengguna berhasil dihapus')
      load()
    } catch (err) {
      push(err.message, 'error')
    }
  }

  const rows = data?.data || []

  return (
    <div className="page">
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari nama, username, email..." />

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
          {rows.length === 0 ? (
            <EmptyState
              icon={<UsersIcon size={52} />}
              title="Belum ada pengguna"
              subtitle="Tambahkan akun staf dan atur rolenya."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Login Terakhir</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => {
                    const rm = ROLE_META[u.user_type] || {}
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              className="avatar"
                              style={{ width: 30, height: 30, fontSize: 11, background: `linear-gradient(135deg,${rm.color || '#64748b'},#1f5eff)` }}
                            >
                              {initials(u.fullname || u.username)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="table-cell-name">
                                {u.fullname || u.username}
                                {u.id === me?.id && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (Anda)</span>}
                              </div>
                              <div className="table-cell-sub">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ color: rm.color, background: `${rm.color}1f` }}>
                            {rm.label || u.user_type}
                          </span>
                        </td>
                        <td><Badge status={u.status}>{u.status}</Badge></td>
                        <td>
                          <div className="table-cell-sub">{u.last_login ? formatDateTime(u.last_login) : 'Belum pernah'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              className="table-icon-btn"
                              title="Edit pengguna"
                              aria-label={`Edit ${u.fullname || u.username}`}
                              onClick={() => setEditing(u)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="table-icon-btn"
                              title="Hapus pengguna"
                              aria-label={`Hapus ${u.fullname || u.username}`}
                              onClick={() => remove(u)}
                            >
                              <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </>
      )}

      <button className="fab" onClick={() => setCreating(true)} aria-label="Tambah pengguna">
        <Plus size={26} />
      </button>

      {creating && (
        <UserFormModal
          onClose={() => setCreating(false)}
          onSaved={load}
        />
      )}

      {editing && (
        <UserFormModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
