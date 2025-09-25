import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const signOut = () => {
    localStorage.removeItem('auth')
    navigate('/signin')
  }

  // Breadcrumbs and title
  const { breadcrumbs, title } = useMemo(() => {
    const map = { app: 'Dashboard', quotes: 'Quotes', orders: 'Orders', shipments: 'Shipments', invoices: 'Invoices' }
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

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}${mobileOpen ? ' show-sidebar' : ''}`}>
      <aside
        className="app-sidebar"
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <div className="brand" style={{ padding: '16px 16px 8px' }}>
          <span className="brand-mark">⟂</span>
          <span className="brand-name">LogiSync</span>
        </div>
        <nav className="navlist">
          <NavLink to="/app" end aria-label="Dashboard">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink to="/app/quotes" aria-label="Quotes">
            <span className="nav-icon">🧾</span>
            <span className="nav-label">Quotes</span>
          </NavLink>
          <NavLink to="/app/orders" aria-label="Orders">
            <span className="nav-icon">📦</span>
            <span className="nav-label">Orders</span>
          </NavLink>
          <NavLink to="/app/shipments" aria-label="Shipments">
            <span className="nav-icon">🚚</span>
            <span className="nav-label">Shipments</span>
          </NavLink>
          <NavLink to="/app/invoices" aria-label="Invoices">
            <span className="nav-icon">💳</span>
            <span className="nav-label">Invoices</span>
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: 16 }}>
          <button className="btn btn-outline" style={{ width: '100%' }} onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button aria-label="Open menu" className="btn-icon only-mobile" onClick={() => setMobileOpen(true)}>
                <span className="bar"/><span className="bar"/><span className="bar"/>
              </button>
              <div>
                <div className="page-title">{title}</div>
                <nav className="breadcrumbs">
                  {breadcrumbs.map((c, i) => (
                    <span key={c.to}>
                      {i > 0 && <span className="sep">/</span>} <Link to={c.to}>{c.label}</Link>
                    </span>
                  ))}
                </nav>
              </div>
            </div>
            <div className="muted">v1.0</div>
          </div>
        </header>
        <div className="app-content container section">
          <Outlet />
        </div>
      </main>
      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
    </div>
  )
}
