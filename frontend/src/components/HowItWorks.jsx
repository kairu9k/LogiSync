export default function HowItWorks() {
  return (
    <section className="section container" style={{ background: 'var(--gray-50)', padding: '80px 20px', marginTop: '60px', borderRadius: '16px' }}>
      <h2 className="section-title">How LogiSync Works</h2>
      <p className="muted" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px' }}>
        Get your delivery operations running in three simple steps
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
        <article className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
          }}>
            1
          </div>
          <h3 style={{ marginBottom: '12px', fontSize: '20px' }}>📋 Create Quote</h3>
          <p className="muted" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Enter package details—weight, dimensions, and destination. Get instant pricing with our custom formula for standard or remote areas.
          </p>
        </article>

        <article className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)'
          }}>
            2
          </div>
          <h3 style={{ marginBottom: '12px', fontSize: '20px' }}>🚛 Assign & Track</h3>
          <p className="muted" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Convert quotes to orders, assign to drivers and vehicles. Monitor capacity in real-time and track GPS location every 20 seconds.
          </p>
        </article>

        <article className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)'
          }}>
            3
          </div>
          <h3 style={{ marginBottom: '12px', fontSize: '20px' }}>📱 Driver Updates</h3>
          <p className="muted" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Drivers use the mobile portal to update status on-the-go. Customers get real-time notifications from pickup to delivery.
          </p>
        </article>
      </div>

      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <a href="#get-started" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
          Start Your Free Trial
        </a>
      </div>
    </section>
  )
}
