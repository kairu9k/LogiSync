import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section id="home" className="hero container" style={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
      borderRadius: '24px',
      padding: '80px 20px',
      marginTop: '20px'
    }}>
      <div className="hero-content">
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '24px'
        }}>
          Smart Logistics Management for the Philippines
        </h1>
        <p className="lead" style={{
          fontSize: '1.25rem',
          color: 'var(--muted)',
          marginBottom: '32px',
          lineHeight: '1.8'
        }}>
          LogiSync powers your delivery operations across the Philippines with
          real-time GPS tracking, intelligent routing, and customizable pricing.
        </p>
        <div className="hero-actions" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            className="btn btn-primary"
            to="/get-started"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
              border: 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)'
            }}
          >
            Get Started
          </Link>
          <Link
            className="btn btn-outline"
            to="/#features"
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '12px',
              border: '2px solid var(--primary)',
              background: 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            Learn More
          </Link>
        </div>
        <div className="hero-stats" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginTop: '48px'
        }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            textAlign: 'center'
          }}>
            <div className="stat" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>Real-Time</div>
            <div className="label" style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '8px' }}>GPS Tracking</div>
          </div>
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            textAlign: 'center'
          }}>
            <div className="stat" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8b5cf6' }}>Smart</div>
            <div className="label" style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '8px' }}>Capacity Management</div>
          </div>
          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            textAlign: 'center'
          }}>
            <div className="stat" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ec4899' }}>Custom</div>
            <div className="label" style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '8px' }}>Pricing Formula</div>
          </div>
        </div>
      </div>
      <div className="hero-media">
        <div className="glass card-lg" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="skeleton" style={{ height: '40px', borderRadius: '8px', marginBottom: '16px', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' }} />
          <div className="skeleton" style={{ height: '120px', borderRadius: '8px', marginBottom: '16px', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)' }} />
          <div className="skeleton" style={{ height: '80px', borderRadius: '8px', background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }} />
        </div>
      </div>
    </section>
  )
}
