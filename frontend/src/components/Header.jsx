import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <header className="header">
      <div className="container nav">
        <Link className="brand" to="/" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo_for_logisync.png" alt="LogiSync" style={{ height: '40px', width: 'auto' }} />
          <span className="brand-name">LogiSync</span>
        </Link>

        <button
          aria-label="Toggle menu"
          className={`nav-toggle ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${mobileOpen ? 'show' : ''}`}>
          <Link to="/#features" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link to="/#pricing" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link to="/#contact" onClick={() => setMobileOpen(false)}>Contact</Link>
          <div className="nav-cta">
            <Link className="btn btn-ghost" to="/signin" onClick={() => setMobileOpen(false)}>Sign in</Link>
            <Link className="btn btn-primary" to="/get-started" onClick={() => setMobileOpen(false)}>Get Started</Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
