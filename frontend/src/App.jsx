import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import SignIn from './pages/SignIn.jsx'
import GetStarted from './pages/GetStarted.jsx'
import RequireAuth from './routes/RequireAuth.jsx'
import AppLayout from './pages/app/AppLayout.jsx'
import Dashboard from './pages/app/Dashboard.jsx'
import Quotes from './pages/app/Quotes.jsx'
import Orders from './pages/app/Orders.jsx'
import Shipments from './pages/app/Shipments.jsx'
import Invoices from './pages/app/Invoices.jsx'

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
        <Route path="shipments" element={<Shipments />} />
        <Route path="invoices" element={<Invoices />} />
      </Route>
    </Routes>
  )
}

export default App
