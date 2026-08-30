import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, Megaphone, ThumbsUp, Zap } from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { rupiah } from '../utils/format'

const UNIT_LABEL = { Mins: 'Menit', Hrs: 'Jam', Days: 'Hari', Months: 'Bulan', Period: 'Periode' }

export const PROMOS = [
  { tag: 'Promo', title: 'Pasang Baru Gratis', desc: 'Biaya instalasi dibebaskan untuk semua paket bulan ini.' },
  { tag: 'Hemat', title: 'Bayar 3 Bulan -10%', desc: 'Bayar di muka 3 bulan dan dapatkan potongan 10%.' },
  { tag: 'Loyal', title: 'Referensi Teman', desc: 'Ajak tetangga berlangganan, dapatkan 1 bulan gratis.' }
]

export default function PortalWidget({ public: isPublic = false, apps = [], title = 'Harga Layanan NearHome' }) {
  const navigate = useNavigate()
  const { push } = useToast()

  const [plans, setPlans] = useState(null)
  const [plansError, setPlansError] = useState(false)

  useEffect(() => {
    api(isPublic ? '/public_plans.php' : '/plans.php')
      .then((res) => setPlans(Array.isArray(res?.data) ? res.data.filter((p) => Number(p.enabled) === 1) : null))
      .catch(() => setPlansError(true))
  }, [isPublic])

  const openApp = (app) => {
    if (!app.ready) {
      push(`Modul “${app.label}” belum tersedia — sedang dikembangkan`)
      return
    }
    navigate(app.path)
  }

  const validityLabel = (p) => {
    const unit = UNIT_LABEL[p.validity_unit] || p.validity_unit
    return `${p.type || 'Paket'} · ${p.validity ? `${p.validity} ${unit}` : 'Bulanan'}`
  }

  return (
    <div className="tg-widget">
      <div className="tg-widget-head">
        <span className="tg-widget-title">
          <Tag size={15} /> {title}
        </span>
        <span className="tg-widget-badge">Update</span>
      </div>
      <div className="tg-widget-grid">
        {plans ? (
          plans.map((p) => (
            <div className="tg-wcard" key={p.id}>
              <div className="tg-wcard-top">
                <span className="tg-wcard-name">{p.name_plan}</span>
                <span className="tg-wcard-speed">
                  <Zap size={12} /> {p.rate_down} {p.rate_down_unit}
                </span>
              </div>
              <div className="tg-wcard-price">
                {rupiah(p.price)} <small>/bulan</small>
              </div>
              <div className="tg-wcard-note">{validityLabel(p)}</div>
            </div>
          ))
        ) : plansError ? (
          <div className="tg-wcard" style={{ gridColumn: '1 / -1', alignItems: 'center', justifyContent: 'center', minHeight: 92, opacity: 0.7 }}>
            Harga layanan tidak dapat dimuat.
          </div>
        ) : (
          <>
            <div className="tg-wcard skeleton" />
            <div className="tg-wcard skeleton" />
            <div className="tg-wcard skeleton" />
          </>
        )}
      </div>

      <div className="tg-widget-head" style={{ marginTop: 22 }}>
        <span className="tg-widget-title">
          <Megaphone size={15} /> Iklan & Promo
        </span>
        <span className="tg-widget-badge">Promo</span>
      </div>
      <div className="tg-promo">
        {PROMOS.map((p) => (
          <div className="tg-promo-card" key={p.tag}>
            <div className="tg-promo-tag">{p.tag}</div>
            <h4>{p.title}</h4>
            <p>{p.desc}</p>
          </div>
        ))}
      </div>

      {apps.length > 0 && (
        <>
          <div className="tg-widget-head" style={{ marginTop: 22 }}>
            <span className="tg-widget-title">
              <ThumbsUp size={15} /> Direkomendasikan untuk Anda
            </span>
          </div>
          <div className="tg-reco">
            {apps.map((app) => {
              const Icon = app.icon
              return (
                <button key={app.id} className={`tg-reco-btn${app.ready ? '' : ' soon'}`} onClick={() => openApp(app)}>
                  <Icon size={15} /> {app.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
