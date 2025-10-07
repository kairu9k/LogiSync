import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import SignIn from './pages/SignIn.jsx'
import GetStarted from './pages/GetStarted.jsx'
import RequireAuth from './routes/RequireAuth.jsx'
import AppLayout from './pages/app/AppLayout.jsx'
import Dashboard from './pages/app/Dashboard.jsx'
import Quotes from './pages/app/Quotes.jsx'
import Orders from './pages/app/Orders.jsx'
import OrderDetail from './pages/app/OrderDetail.jsx'
import OrderCreate from './pages/app/OrderCreate.jsx'
import Shipments from './pages/app/Shipments.jsx'
import ShipmentDetail from './pages/app/ShipmentDetail.jsx'
import Invoices from './pages/app/Invoices.jsx'
import InvoiceDetail from './pages/app/InvoiceDetail.jsx'
import Warehouses from './pages/app/Warehouses.jsx'
import Inventory from './pages/app/Inventory.jsx'
import Reports from './pages/app/Reports.jsx'
import TeamManagement from './pages/app/TeamManagement.jsx'
import SubscriptionPlan from './pages/app/SubscriptionPlan.jsx'
import SystemSettings from './pages/app/SystemSettings.jsx'
import Transportation from './pages/app/Transportation.jsx'
import Schedules from './pages/app/Schedules.jsx'
import Budgets from './pages/app/Budgets.jsx'
import DriverLogin from './pages/DriverLogin.jsx'
import DriverDashboard from './pages/DriverDashboard.jsx'
import DriverShipment from './pages/DriverShipment.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/get-started" element={<GetStarted />} />
      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<OrderCreate />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="warehouses/inventory" element={<Inventory />} />
        <Route path="transportation" element={<Transportation />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings/budgets" element={<Budgets />} />
        <Route path="settings/team" element={<TeamManagement />} />
        <Route path="settings/subscription" element={<SubscriptionPlan />} />
        <Route path="settings/system" element={<SystemSettings />} />
      </Route>

      {/* Driver Mobile Interface Routes */}
      <Route path="/driver/login" element={<DriverLogin />} />
      <Route path="/driver/dashboard" element={<DriverDashboard />} />
      <Route path="/driver/shipment/:id" element={<DriverShipment />} />
    </Routes>
  )
}

export default App
