import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { apiGet } from '../../lib/api'
import { can } from '../../lib/permissions'
import NotificationBell from '../../components/NotificationBell'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [overdueCount, setOverdueCount] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
            <NavLink
              to="/app"
              end
              aria-label="Dashboard"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </NavLink>
          )}

          {can.viewQuotes() && (
            <NavLink
              to="/app/quotes"
              aria-label="Quotes"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
              <span className="nav-icon">🧾</span>
              <span className="nav-label">Quotes</span>
            </NavLink>
          )}

          {can.viewOrders() && (
            <NavLink
              to="/app/orders"
              aria-label="Orders"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
              <span className="nav-icon">📦</span>
              <span className="nav-label">Orders</span>
            </NavLink>
          )}

          {can.viewShipments() && (
            <NavLink
              to="/app/shipments"
              aria-label="Shipments"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
              <span className="nav-icon">🚚</span>
              <span className="nav-label">Shipments</span>
            </NavLink>
          )}

          {can.viewInvoices() && (
            <NavLink
              to="/app/invoices"
              aria-label="Invoices"
              style={({ isActive }) => ({
                position: 'relative',
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
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

          {/* Warehouses & Inventory (Combined) */}
          {(can.viewWarehouses() || can.viewInventory()) && (
            <NavLink
              to="/app/warehouses"
              aria-label="Warehouses"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
              <span className="nav-icon">🏪</span>
              <span className="nav-label">Warehouses</span>
            </NavLink>
          )}

          {/* Transportation */}
          {can.viewTransportation() && (
            <NavLink
              to="/app/transportation"
              aria-label="Transportation"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                padding: '12px 14px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '15px',
                textDecoration: 'none'
              })}
            >
              <span className="nav-icon">🚛</span>
              <span className="nav-label">Transportation</span>
            </NavLink>
          )}

          {can.viewReports() && (
            <NavLink
              to="/app/reports"
              aria-label="Reports"
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                borderRadius: '10px',
                margin: '4px 8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              })}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-label">Reports</span>
            </NavLink>
          )}
        </nav>

        {/* Settings Section at Bottom */}
        <div style={{ marginTop: 'auto', padding: '8px', borderTop: '1px solid var(--border)' }}>
          <div
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Settings"
            role="button"
            onMouseEnter={(e) => {
              const arrow = e.currentTarget.querySelector('.dropdown-arrow')
              if (arrow) arrow.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              const arrow = e.currentTarget.querySelector('.dropdown-arrow')
              if (arrow) arrow.style.opacity = '0'
            }}
            style={{
              background: settingsOpen ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
              borderRadius: '10px',
              margin: '4px 8px',
              transition: 'all 0.3s ease',
              boxShadow: settingsOpen ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
              padding: '12px 14px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
            <span
              className="dropdown-arrow"
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                transition: 'transform 0.2s, opacity 0.3s',
                transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                opacity: 0
              }}
            >▼</span>
          </div>

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
      </aside>
      <main className="app-main">
        <header className="app-topbar" style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56, padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <button aria-label="Open menu" className="btn-icon only-mobile" onClick={() => setMobileOpen(true)} style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                <span className="bar" style={{ background: '#3b82f6', height: '2px', width: '20px', borderRadius: '2px' }}/>
                <span className="bar" style={{ background: '#3b82f6', height: '2px', width: '20px', borderRadius: '2px' }}/>
                <span className="bar" style={{ background: '#3b82f6', height: '2px', width: '20px', borderRadius: '2px' }}/>
              </button>
              <nav className="breadcrumbs" style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                {breadcrumbs.map((c, i) => (
                  <span key={c.to}>
                    {i > 0 && <span className="sep" style={{ margin: '0 6px', color: 'rgba(255, 255, 255, 0.4)' }}>/</span>}
                    <Link to={c.to} style={{
                      color: i === breadcrumbs.length - 1 ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                      textDecoration: 'none',
                      fontWeight: i === breadcrumbs.length - 1 ? '600' : '400',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                    onMouseOut={(e) => e.currentTarget.style.color = i === breadcrumbs.length - 1 ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)'}
                    >{c.label}</Link>
                  </span>
                ))}
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <NotificationBell />
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
