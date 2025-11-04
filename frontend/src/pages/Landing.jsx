import { useEffect } from 'react'
import { Header, Hero, Features, HowItWorks, Pricing, CTA, Footer } from '../components'
import TrackingWidget from '../components/TrackingWidget'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'LogiSync - Logistics Management System'
  }, [])

  return (
    <div className="page">
      <Header />
      <Hero />
      <section style={{ padding: '60px 20px', backgroundColor: 'var(--gray-50)' }}>
        <div className="container">
          <TrackingWidget />
        </div>
      </section>

      {/* Driver Access Section */}
      <section style={{
        padding: '80px 20px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        <div className="container" style={{ maxWidth: 700, position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '16px'
          }}>
            🚛
          </div>
          <h2 style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: '2.5rem',
            fontWeight: '800'
          }}>
            Are you a Driver?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            marginBottom: 32,
            opacity: 0.95,
            lineHeight: '1.8'
          }}>
            Access your mobile dashboard to view deliveries and update shipment status on the go.
          </p>
          <button
            className="btn btn-light"
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '12px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: 'white',
              color: '#3b82f6',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onClick={() => navigate('/driver/login')}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-4px)'
              e.target.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.3)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)'
            }}
          >
            📱 Driver Portal Login
          </button>
          <div style={{
            marginTop: 24,
            fontSize: '0.875rem',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <span>Mobile-optimized</span>
            <span>•</span>
            <span>Works on any smartphone</span>
          </div>
        </div>
      </section>

      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
