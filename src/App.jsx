import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import RolePage from './pages/RolePage'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import CustomerDetail from './pages/CustomerDetail'
import ActiveCustomers from './pages/ActiveCustomers'
import Routers from './pages/Routers'
import RouterForm from './pages/RouterForm'
import NetworkMap from './pages/NetworkMap'
import RouterTraffic from './pages/RouterTraffic'
import Bandwidth from './pages/Bandwidth'
import BandwidthForm from './pages/BandwidthForm'
import Settings from './pages/Settings'
import Users from './pages/Users'
import Teknisi from './pages/Teknisi'
import Profile from './pages/Profile'
import MyHome from './pages/MyHome'
import MyPayments from './pages/MyPayments'
import MyHelpdesk from './pages/MyHelpdesk'
import HelpdeskHub from './pages/HelpdeskHub'
import FinanceHub from './pages/FinanceHub'
import Spinner from './components/Spinner'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-frame">
        <div className="page">
          <Spinner />
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-frame">
        <div className="page">
          <Spinner />
        </div>
      </div>
    )
  }
  if (user) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />

      <Route
        path="/home"
        element={
          <Protected>
            <Home />
          </Protected>
        }
      />

      <Route
        path="/teknisi"
        element={
          <Protected>
            <Teknisi />
          </Protected>
        }
      />

      <Route
        path="/helpdesk"
        element={
          <Protected>
            <HelpdeskHub />
          </Protected>
        }
      />

      <Route
        path="/my"
        element={
          <Protected>
            <MyHome />
          </Protected>
        }
      />

      <Route
        path="/my/payments"
        element={
          <Protected>
            <MyPayments />
          </Protected>
        }
      />

      <Route
        path="/my/helpdesk"
        element={
          <Protected>
            <MyHelpdesk />
          </Protected>
        }
      />

      <Route
        path="/gm"
        element={
          <Protected>
            <RolePage module="gm" />
          </Protected>
        }
      />

      <Route
        path="/"
        element={
          <Protected>
            <Navigate to="/home" replace />
          </Protected>
        }
      />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerDetail />} />
        <Route path="/active" element={<ActiveCustomers />} />
        <Route path="/routers" element={<Routers />} />
        <Route path="/routers/new" element={<RouterForm />} />
        <Route path="/routers/:id/edit" element={<RouterForm />} />
        <Route path="/network-map" element={<NetworkMap />} />
        <Route path="/traffic" element={<RouterTraffic />} />
        <Route path="/bandwidth" element={<Bandwidth />} />
        <Route path="/bandwidth/new" element={<BandwidthForm />} />
        <Route path="/bandwidth/:id/edit" element={<BandwidthForm />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<Users />} />
        <Route path="/finance" element={<FinanceHub />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
