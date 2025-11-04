export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer id="contact" className="footer" style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '24px 20px 16px',
      width: '100%'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '32px',
          width: '100%'
        }}>
          <div>
            <div className="brand" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px'
            }}>
              <img src="/logo_for_logisync.png" alt="LogiSync" style={{ height: '36px', width: 'auto' }} />
              <span className="brand-name" style={{
                fontSize: '1.125rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>LogiSync</span>
            </div>
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: '1.4',
              margin: 0,
              color: '#94a3b8'
            }}>
              <span style={{ fontSize: '0.9rem' }}>🇵🇭</span> Proudly serving logistics companies across the Philippines
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: '0.8125rem',
              fontWeight: '700',
              marginBottom: '10px',
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Product
            </h4>
            <div className="footer-links" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <a href="#features" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Features</a>
              <a href="#pricing" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Pricing</a>
              <a href="/#how-it-works" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >How It Works</a>
            </div>
          </div>

          <div>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              marginBottom: '10px',
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Support
            </h4>
            <div className="footer-links" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <a href="mailto:support@logisync.ph" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Contact Support</a>
              <a href="#" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Documentation</a>
              <a href="#" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >API Reference</a>
            </div>
          </div>

          <div>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              marginBottom: '10px',
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Legal
            </h4>
            <div className="footer-links" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <a href="#" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Privacy Policy</a>
              <a href="#" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Terms of Service</a>
              <a href="#" style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >Cookie Policy</a>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '12px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            margin: 0
          }}>
            © {year} LogiSync Philippines. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
