import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section id="get-started" className="cta" style={{
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      padding: '100px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />
      <div className="container cta-inner" style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '32px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '900',
            color: 'white',
            marginBottom: '20px',
            lineHeight: '1.2'
          }}>
            Transform your delivery operations today
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: 'rgba(255, 255, 255, 0.95)',
            lineHeight: '1.8',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Join logistics companies across the Philippines using LogiSync. Start your 14-day free trial—no credit card required.
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <Link
            className="btn btn-invert"
            to="/get-started"
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '12px',
              backgroundColor: 'white',
              color: '#3b82f6',
              border: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.3)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)'
            }}
          >
            Start Free Trial
          </Link>
          <Link
            className="btn btn-ghost-invert"
            to="/#features"
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              color: 'white',
              border: '2px solid white',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            See a Demo
          </Link>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginTop: '24px',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '0.875rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>✓</span> No credit card required
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>✓</span> 14-day free trial
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>✓</span> Cancel anytime
          </span>
        </div>
      </div>
    </section>
  )
}
