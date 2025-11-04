export default function Features() {
  const features = [
    {
      icon: '📍',
      title: 'Real-Time GPS Tracking',
      description: 'Track drivers live with GPS location updates every 20 seconds. View routes on interactive maps.',
      color: '#3b82f6'
    },
    {
      icon: '🚛',
      title: 'Smart Capacity Management',
      description: 'Monitor vehicle load in real-time. Prevent overloading with automatic weight-based capacity alerts.',
      color: '#ef4444'
    },
    {
      icon: '💰',
      title: 'Custom Pricing Formula',
      description: 'Set your own rates for distance, weight, fuel, and insurance. Different pricing for standard vs remote areas.',
      color: '#f59e0b'
    },
    {
      icon: '📱',
      title: 'Mobile Driver Portal',
      description: 'Drivers update shipment status on-the-go. View deliveries, contact info, and package details.',
      color: '#8b5cf6'
    },
    {
      icon: '📦',
      title: 'Warehouse Management',
      description: 'Track inventory across multiple warehouses. Assign items to orders with real-time stock updates.',
      color: '#10b981'
    },
    {
      icon: '📊',
      title: 'Quote & Order System',
      description: 'Generate instant quotes with automatic cost calculation. Convert quotes to orders seamlessly.',
      color: '#ec4899'
    }
  ]

  return (
    <section id="features" className="section container">
      <h2 className="section-title" style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        Everything you need to manage deliveries
      </h2>
      <p style={{
        textAlign: 'center',
        fontSize: '1.125rem',
        color: 'var(--muted)',
        marginBottom: '48px',
        maxWidth: '600px',
        margin: '0 auto 48px'
      }}>
        Powerful features designed for Philippine logistics operations
      </p>
      <div className="grid features" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {features.map((feature, index) => (
          <article
            key={index}
            className="card"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '32px',
              border: `1px solid rgba(${parseInt(feature.color.slice(1,3), 16)}, ${parseInt(feature.color.slice(3,5), 16)}, ${parseInt(feature.color.slice(5,7), 16)}, 0.2)`,
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = `0 12px 24px rgba(${parseInt(feature.color.slice(1,3), 16)}, ${parseInt(feature.color.slice(3,5), 16)}, ${parseInt(feature.color.slice(5,7), 16)}, 0.2)`
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div className="icon" style={{
              fontSize: '3rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              background: `linear-gradient(135deg, ${feature.color}22 0%, ${feature.color}44 100%)`,
              borderRadius: '16px',
              border: `2px solid ${feature.color}33`
            }}>
              {feature.icon}
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '12px',
              color: feature.color
            }}>
              {feature.title}
            </h3>
            <p style={{
              color: 'var(--muted)',
              lineHeight: '1.6',
              fontSize: '0.95rem'
            }}>
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
