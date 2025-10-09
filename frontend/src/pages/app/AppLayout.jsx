import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { apiGet } from '../../lib/api'
import { can } from '../../lib/permissions'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [overdueCount, setOverdueCount] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [warehousesOpen, setWarehousesOpen] = useState(false)
  const [transportationOpen, setTransportationOpen] = useState(false)

  // Get user info from localStorage
  const user = useMemo(() => {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        // The backend returns { user: {...}, token: ... }
        return parsed.user || parsed
      }
    } catch (e) {
      console.error('Failed to parse user data:', e)
    }
    return null
  }, [])

  const signOut = () => {
    localStorage.removeItem('auth')
    navigate('/signin')
  }

  // Breadcrumbs and title
  const { breadcrumbs, title } = useMemo(() => {
    const map = { app: 'Dashboard', quotes: 'Quotes', orders: 'Orders', shipments: 'Shipments', invoices: 'Invoices', warehouses: 'Warehouses', 'warehouses-locations': 'Warehouse Locations', 'warehouses-inventory': 'Warehouse Inventory', inventory: 'Inventory', transportation: 'Transportation', schedules: 'Schedules', tracking: 'Live Tracking', reports: 'Reports', settings: 'Settings', team: 'Team Management', budgets: 'Budget Management', subscription: 'Subscription Plan', system: 'System Settings' }
    const parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/')
    const crumbs = []
    let pathAcc = ''
    for (const p of parts) {
      pathAcc += '/' + p
      if (p === '') continue
      const label = map[p] || (p.charAt(0).toUpperCase() + p.slice(1))
      crumbs.push({ label, to: pathAcc })
    }
    const current = crumbs[crumbs.length - 1]?.label || 'Dashboard'
    return { breadcrumbs: crumbs, title: current }
  }, [location.pathname])

  useEffect(() => {
    document.title = `LogiSync — ${title}`
  }, [title])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Load overdue invoice count for navigation badge
  useEffect(() => {
    async function loadOverdueCount() {
      try {
        const res = await apiGet('/api/dashboard/invoice-metrics')
        setOverdueCount(res?.data?.overdue_count || 0)
      } catch (e) {
        console.error('Failed to load overdue count:', e)
      }
    }
    loadOverdueCount()
  }, [location.pathname]) // Refresh when navigating

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}${mobileOpen ? ' show-sidebar' : ''}`}>
      <aside
        className="app-sidebar"
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <div className="brand" style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo_for_logisync.png" alt="LogiSync" style={{ height: '32px', width: 'auto' }} />
          <span className="brand-name">LogiSync</span>
        </div>
        <nav className="navlist">
          {can.viewDashboard() && (
            <NavLink to="/app" end aria-label="Dashboard">
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </NavLink>
          )}

          {can.viewQuotes() && (
            <NavLink to="/app/quotes" aria-label="Quotes">
              <span className="nav-icon">🧾</span>
              <span className="nav-label">Quotes</span>
            </NavLink>
          )}

          {can.viewOrders() && (
            <NavLink to="/app/orders" aria-label="Orders">
              <span className="nav-icon">📦</span>
              <span className="nav-label">Orders</span>
            </NavLink>
          )}

          {can.viewShipments() && (
            <NavLink to="/app/shipments" aria-label="Shipments">
              <span className="nav-icon">🚚</span>
              <span className="nav-label">Shipments</span>
            </NavLink>
          )}

          {can.viewInvoices() && (
            <NavLink to="/app/invoices" aria-label="Invoices" style={{ position: 'relative' }}>
              <span className="nav-icon">💳</span>
              <span className="nav-label">Invoices</span>
              {overdueCount > 0 && (
                <span
                  className="badge danger"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: '10px',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  {overdueCount > 99 ? '99+' : overdueCount}
                </span>
              )}
            </NavLink>
          )}

          {/* Warehouses & Inventory Dropdown */}
          {(can.viewWarehouses() || can.viewInventory()) && (
            <div style={{ position: 'relative' }}>
              <button
                className={`nav-link${warehousesOpen ? ' active' : ''}`}
                onClick={() => setWarehousesOpen(!warehousesOpen)}
                aria-label="Warehouses"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  color: 'inherit',
                  textAlign: 'left'
                }}
              >
                <span className="nav-icon">🏪</span>
                <span className="nav-label">Warehouses</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', transition: 'transform 0.2s', transform: warehousesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>

              {warehousesOpen && (
                <div className="settings-dropdown" style={{
                  background: 'var(--surface-100)',
                  borderRadius: '8px',
                  marginTop: '4px',
                  marginLeft: '8px',
                  marginRight: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {can.viewWarehouses() && (
                    <NavLink
                      to="/app/warehouses"
                      aria-label="Warehouse Locations"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 16px',
                        fontSize: '14px',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>📍</span>
                      <span className="nav-label">Locations</span>
                    </NavLink>
                  )}

                  {can.viewInventory() && (
                    <NavLink
                      to="/app/warehouses/inventory"
                      aria-label="Warehouse Inventory"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 16px',
                        fontSize: '14px',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>📋</span>
                      <span className="nav-label">Inventory</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transportation & Schedules Dropdown */}
          {can.viewTransportation() && (
            <div style={{ position: 'relative' }}>
              <button
                className={`nav-link${transportationOpen ? ' active' : ''}`}
                onClick={() => setTransportationOpen(!transportationOpen)}
                aria-label="Transportation"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  color: 'inherit',
                  textAlign: 'left'
                }}
              >
                <span className="nav-icon">🚛</span>
                <span className="nav-label">Transportation</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', transition: 'transform 0.2s', transform: transportationOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>

              {transportationOpen && (
                <div className="settings-dropdown" style={{
                  background: 'var(--surface-100)',
                  borderRadius: '8px',
                  marginTop: '4px',
                  marginLeft: '8px',
                  marginRight: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <NavLink
                    to="/app/transportation"
                    aria-label="Vehicles"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 16px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>🚗</span>
                    <span className="nav-label">Vehicles</span>
                  </NavLink>

                  <NavLink
                    to="/app/schedules"
                    aria-label="Schedules"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 16px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>📅</span>
                    <span className="nav-label">Schedules</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {can.viewReports() && (
            <NavLink to="/app/reports" aria-label="Reports">
              <span className="nav-icon">📈</span>
              <span className="nav-label">Reports</span>
            </NavLink>
          )}
        </nav>

        {/* Settings Section at Bottom */}
        <div style={{ marginTop: 'auto', padding: '8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <button
              className={`nav-link${settingsOpen ? ' active' : ''}`}
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-label="Settings"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '12px 14px',
                color: 'inherit',
                textAlign: 'left',
                borderRadius: '10px'
              }}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', transition: 'transform 0.2s', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            {settingsOpen && (
              <div style={{
                background: 'var(--surface)',
                borderRadius: '8px',
                marginTop: '4px',
                marginLeft: '4px',
                marginRight: '4px',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}>
                {can.manageWarehouses() && (
                  <NavLink
                    to="/app/settings/budgets"
                    aria-label="Budget Management"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>💰</span>
                    <span className="nav-label">Budgets</span>
                  </NavLink>
                )}

                {can.viewTeam() && (
                  <NavLink
                    to="/app/settings/team"
                    aria-label="Team Management"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>👥</span>
                    <span className="nav-label">Team</span>
                  </NavLink>
                )}

                {can.viewSubscription() && (
                  <NavLink
                    to="/app/settings/subscription"
                    aria-label="Subscription Plan"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>💎</span>
                    <span className="nav-label">Subscription</span>
                  </NavLink>
                )}

                {can.viewSystemSettings() && (
                  <NavLink
                    to="/app/settings/system"
                    aria-label="System Settings"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>🔧</span>
                    <span className="nav-label">System</span>
                  </NavLink>
                )}

                <button
                  onClick={signOut}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: '#ef4444',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ marginRight: '8px' }}>🚪</span>
                  <span className="nav-label">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <button aria-label="Open menu" className="btn-icon only-mobile" onClick={() => setMobileOpen(true)}>
                <span className="bar"/><span className="bar"/><span className="bar"/>
              </button>
              <div style={{ flex: 1 }}>
                <nav className="breadcrumbs">
                  {breadcrumbs.map((c, i) => (
                    <span key={c.to}>
                      {i > 0 && <span className="sep">/</span>} <Link to={c.to}>{c.label}</Link>
                    </span>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </header>
        <div className="app-content container section">
          <div key={location.pathname} className="route-anim">
            <Outlet />
          </div>
        </div>
      </main>
      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
    </div>
  )
}
