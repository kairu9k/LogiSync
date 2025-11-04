export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: 'Free',
      period: '/month',
      description: 'Perfect for getting started with basic logistics management',
      features: [
        'Up to 10 shipments per month',
        'Basic tracking',
        '1 user account',
        'Email support'
      ],
      cta: 'Get Started Free',
      ctaLink: '/get-started',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#10b981',
      popular: false
    },
    {
      name: 'Pro',
      price: '₱499.00',
      period: '/month',
      description: 'Advanced features for growing logistics businesses in Davao',
      features: [
        'Up to 100 shipments per month',
        'Real-time GPS tracking',
        'Up to 5 user accounts',
        'Priority email support',
        'Advanced analytics',
        'Invoice generation'
      ],
      cta: 'Subscribe Now',
      ctaLink: '/get-started',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      color: '#8b5cf6',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '₱999.00',
      period: '/month',
      description: 'Full-featured solution with priority support and unlimited shipments',
      features: [
        'Unlimited shipments',
        'Real-time GPS tracking',
        'Unlimited user accounts',
        '24/7 priority support',
        'Advanced analytics & reports',
        'Invoice generation',
        'Custom integrations',
        'Dedicated account manager'
      ],
      cta: 'Subscribe Now',
      ctaLink: '/get-started',
      gradient: 'linear-gradient(135deg, #9FA2B2 0%, #7a7d8f 100%)',
      color: '#9FA2B2',
      popular: false
    }
  ]

  return (
    <section id="pricing" className="section container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <h2 className="section-title" style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        Flexible pricing for Philippine logistics
      </h2>
      <p style={{
        textAlign: 'center',
        fontSize: '1.125rem',
        color: 'var(--muted)',
        marginBottom: '56px',
        maxWidth: '600px',
        margin: '0 auto 56px'
      }}>
        Choose the plan that fits your business needs
      </p>
      <div className="grid pricing" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '32px',
        alignItems: 'stretch'
      }}>
        {plans.map((plan, index) => (
          <article
            key={index}
            className="card"
            style={{
              background: plan.popular ? `linear-gradient(135deg, ${plan.color}11 0%, ${plan.color}22 100%)` : 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '40px 32px',
              border: plan.popular ? `3px solid ${plan.color}` : '2px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = `0 20px 40px ${plan.color}33`
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: plan.gradient,
                color: 'white',
                padding: '6px 20px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: `0 4px 12px ${plan.color}44`
              }}>
                Most Popular
              </div>
            )}

            <h3 style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              marginBottom: '8px',
              color: plan.color
            }}>
              {plan.name}
            </h3>

            <p style={{
              fontSize: '0.875rem',
              color: 'var(--muted)',
              marginBottom: '24px',
              minHeight: '40px'
            }}>
              {plan.description}
            </p>

            <div style={{ marginBottom: '32px' }}>
              <p className="price" style={{
                fontSize: plan.price === 'Custom' ? '2.5rem' : '3rem',
                fontWeight: '900',
                marginBottom: '4px',
                background: plan.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {plan.price}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--muted)',
                fontWeight: '600'
              }}>
                {plan.period}
              </p>
            </div>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px 0',
              flex: 1
            }}>
              {plan.features.map((feature, i) => (
                <li key={i} style={{
                  padding: '12px 0',
                  fontSize: '0.95rem',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <span style={{
                    color: plan.color,
                    fontSize: '1.25rem',
                    fontWeight: '700'
                  }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              className="btn"
              href={plan.ctaLink}
              style={{
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: '700',
                borderRadius: '12px',
                background: plan.popular ? plan.gradient : 'transparent',
                border: plan.popular ? 'none' : `2px solid ${plan.color}`,
                color: plan.popular ? 'white' : plan.color,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                boxShadow: plan.popular ? `0 4px 16px ${plan.color}44` : 'none'
              }}
              onMouseOver={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.background = plan.gradient
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.borderColor = 'transparent'
                }
                e.currentTarget.style.boxShadow = `0 8px 24px ${plan.color}55`
              }}
              onMouseOut={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = plan.color
                  e.currentTarget.style.borderColor = plan.color
                }
                e.currentTarget.style.boxShadow = plan.popular ? `0 4px 16px ${plan.color}44` : 'none'
              }}
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
