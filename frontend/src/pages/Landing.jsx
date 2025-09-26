import { Header, Hero, Features, Pricing, CTA, Footer } from '../components'
import TrackingWidget from '../components/TrackingWidget'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

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
        padding: '40px 20px',
        backgroundColor: 'var(--primary-600)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>
            🚛 Are you a Driver?
          </h2>
          <p style={{
            fontSize: '18px',
            marginBottom: 24,
            opacity: 0.9
          }}>
            Access your mobile dashboard to view deliveries and update shipment status on the go.
          </p>
          <button
            className="btn btn-light"
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: 'white',
              color: 'var(--primary-600)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => navigate('/driver/login')}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            📱 Driver Portal Login
          </button>
          <div style={{
            marginTop: 16,
            fontSize: '14px',
            opacity: 0.7
          }}>
            Mobile-optimized • Works on any smartphone
          </div>
        </div>
      </section>

      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
