import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { MessageSquareText, ReceiptText, Megaphone, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PortalShell from '../components/PortalShell'
import StaffTickets from '../components/StaffTickets'
import StaffPayments from '../components/StaffPayments'
import StaffAnnouncements from '../components/StaffAnnouncements'
import ManualPayment from '../components/ManualPayment'

const ALLOW = ['AdminGM', 'AdminCS', 'Teknisi']
const FINANCE = ['AdminGM', 'AdminCS']

const TABS = [
  { key: 'tickets', label: 'Tiket', icon: MessageSquareText },
  { key: 'payments', label: 'Pembayaran', icon: ReceiptText, manageOnly: true },
  { key: 'manual', label: 'Input Pembayaran', icon: Wallet, manageOnly: true },
  { key: 'announcements', label: 'Pengumuman', icon: Megaphone, manageOnly: true }
]

export default function HelpdeskHub() {
  const { user } = useAuth()
  const [tab, setTab] = useState('tickets')

  const role = user?.user_type
  if (!ALLOW.includes(role)) return <Navigate to="/home" replace />

  const isFinance = FINANCE.includes(role)
  const tabs = TABS.filter((t) => !t.manageOnly || isFinance)

  return (
    <PortalShell wide>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              className={'btn btn-sm ' + (active ? 'btn-primary' : 'btn-outline')}
              onClick={() => setTab(t.key)}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'tickets' && <StaffTickets canManage />}
      {tab === 'payments' && <StaffPayments canManage={isFinance} />}
      {tab === 'manual' && <ManualPayment />}
      {tab === 'announcements' && <StaffAnnouncements canManage={isFinance} />}
    </PortalShell>
  )
}
