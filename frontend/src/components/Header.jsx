import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <header className="header" style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container nav">
        <Link className="brand" to="/" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo_for_logisync.png" alt="LogiSync" style={{ height: '40px', width: 'auto' }} />
          <span className="brand-name" style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>LogiSync</span>
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
          <Link to="/#features" onClick={() => setMobileOpen(false)} style={{
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'color 0.2s ease',
            padding: '8px 12px'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
          onMouseOut={(e) => e.currentTarget.style.color = '#e2e8f0'}
          >Features</Link>
          <Link to="/#pricing" onClick={() => setMobileOpen(false)} style={{
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'color 0.2s ease',
            padding: '8px 12px'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
          onMouseOut={(e) => e.currentTarget.style.color = '#e2e8f0'}
          >Pricing</Link>
          <Link to="/#contact" onClick={() => setMobileOpen(false)} style={{
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'color 0.2s ease',
            padding: '8px 12px'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
          onMouseOut={(e) => e.currentTarget.style.color = '#e2e8f0'}
          >Contact</Link>
          <div className="nav-cta">
            <Link className="btn btn-ghost" to="/signin" onClick={() => setMobileOpen(false)} style={{
              color: '#e2e8f0',
              border: '1px solid rgba(226, 232, 240, 0.3)',
              padding: '8px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
              e.currentTarget.style.borderColor = '#3b82f6'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.3)'
            }}
            >Sign in</Link>
            <Link className="btn btn-primary" to="/get-started" onClick={() => setMobileOpen(false)} style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
            >Get Started</Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
