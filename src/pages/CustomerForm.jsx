import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'

export default function CustomerForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { push } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    username: '',
    password: '',
    fullname: '',
    email: '',
    phonenumber: '',
    pppoe_username: '',
    pppoe_password: '',
    pppoe_ip: '',
    address: '',
    city: '',
    district: '',
    state: '',
    zip: '',
    coordinates: '',
    account_type: 'Personal',
    service_type: 'Hotspot',
    balance: 0,
    auto_renewal: 1,
    status: 'Active'
  })

  useEffect(() => {
    if (!isEdit) return
    api(`/customer.php?id=${id}`)
      .then((res) => {
        const c = res.customer
        setForm({
          username: c.username,
          password: '',
          fullname: c.fullname,
          email: c.email,
          phonenumber: c.phonenumber,
          pppoe_username: c.pppoe_username,
          pppoe_password: c.pppoe_password,
          pppoe_ip: c.pppoe_ip,
          address: c.address || '',
          city: c.city || '',
          district: c.district || '',
          state: c.state || '',
          zip: c.zip || '',
          coordinates: c.coordinates || '',
          account_type: c.account_type || 'Personal',
          service_type: c.service_type || 'Hotspot',
          balance: c.balance,
          auto_renewal: c.auto_renewal,
          status: c.status || 'Active'
        })
      })
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isEdit) {
        await api(`/customer.php?id=${id}&action=update`, {
          method: 'POST',
          body: { ...form, new_password: form.password }
        })
        push('Pelanggan berhasil diperbarui')
        navigate(`/customers/${id}`)
      } else {
        await api('/customers.php', { method: 'POST', body: form })
        push('Pelanggan berhasil ditambahkan')
        navigate('/customers')
      }
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><Spinner /></div>

  return (
    <form className="page page-narrow" onSubmit={submit}>
      <div className="section-title">Akun</div>
      <div className="card">
        <div className="field">
          <label>Username *</label>
          <input className="input" value={form.username} onChange={set('username')} required />
        </div>
        <div className="field">
          <label>{isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
          <input className="input" type="text" value={form.password} onChange={set('password')} required={!isEdit} />
        </div>
        <div className="field">
          <label>Nama Lengkap</label>
          <input className="input" value={form.fullname} onChange={set('fullname')} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label>No. HP</label>
            <input className="input" type="tel" value={form.phonenumber} onChange={set('phonenumber')} />
          </div>
        </div>
      </div>

      <div className="section-title">Data PPPoE</div>
      <div className="card">
        <div className="field">
          <label>Username PPPoE</label>
          <input className="input" value={form.pppoe_username} onChange={set('pppoe_username')} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Password PPPoE</label>
            <input className="input" value={form.pppoe_password} onChange={set('pppoe_password')} />
          </div>
          <div className="field">
            <label>IP PPPoE</label>
            <input className="input" value={form.pppoe_ip} onChange={set('pppoe_ip')} />
          </div>
        </div>
      </div>

      <div className="section-title">Alamat</div>
      <div className="card">
        <div className="field">
          <label>Alamat</label>
          <textarea value={form.address} onChange={set('address')} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Kota</label>
            <input className="input" value={form.city} onChange={set('city')} />
          </div>
          <div className="field">
            <label>Kecamatan</label>
            <input className="input" value={form.district} onChange={set('district')} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Provinsi</label>
            <input className="input" value={form.state} onChange={set('state')} />
          </div>
          <div className="field">
            <label>Kode Pos</label>
            <input className="input" value={form.zip} onChange={set('zip')} />
          </div>
        </div>
        <div className="field">
          <label>Koordinat (lat, lng)</label>
          <input className="input" value={form.coordinates} onChange={set('coordinates')} placeholder="cth: -6.200000, 106.816666" />
        </div>
      </div>

      <div className="section-title">Pengaturan Layanan</div>
      <div className="card">
        <div className="field">
          <label>Tipe Akun</label>
          <div className="segmented">
            <button type="button" className={form.account_type === 'Personal' ? 'active' : ''} onClick={() => set('account_type')({ target: { value: 'Personal' } })}>
              Personal
            </button>
            <button type="button" className={form.account_type === 'Business' ? 'active' : ''} onClick={() => set('account_type')({ target: { value: 'Business' } })}>
              Business
            </button>
          </div>
        </div>

        <div className="field">
          <label>Tipe Layanan</label>
          <select className="input" value={form.service_type} onChange={set('service_type')}>
            <option>Hotspot</option>
            <option>PPPoE</option>
            <option>VPN</option>
            <option>Others</option>
          </select>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Saldo</label>
            <input className="input" type="number" min="0" step="0.01" value={form.balance} onChange={set('balance')} />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Suspended</option>
              <option>Limited</option>
              <option>Banned</option>
              <option>Disabled</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={Number(form.auto_renewal) === 1}
              onChange={(e) => set('auto_renewal')({ target: { value: e.target.checked ? 1 : 0 } })}
              style={{ marginRight: 8, transform: 'scale(1.2)' }}
            />
            Auto renewal menggunakan saldo
          </label>
        </div>
      </div>

      <div className="fab-save">
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          {isEdit ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
        </button>
      </div>
    </form>
  )
}
