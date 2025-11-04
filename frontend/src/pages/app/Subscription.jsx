import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'

function formatMoney(amount) { return `₱${amount.toFixed(2)}` }

export default function Subscription() {
  const [plans, setPlans] = useState([])
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [plansRes, currentRes] = await Promise.all([
        apiGet('/api/subscriptions/plans'),
        apiGet('/api/subscriptions/current').catch(() => ({ data: null }))
      ])
      setPlans(plansRes.data || [])
      setCurrentSubscription(currentRes.data)
    } catch (e) {
      setError(e.message || 'Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleSubscribe(plan) {
    if (subscribing) return

    if (currentSubscription && currentSubscription.status === 'active') {
      alert('You already have an active subscription. Please cancel it first.')
      return
    }

    setSubscribing(true)
    try {
      const res = await apiPost('/api/subscriptions/subscribe', { plan_id: plan.id })

      if (!res.requires_payment) {
        // Free plan activated
        alert(res.message)
        await loadData()
      } else {
        // Paid plan - redirect to payment
        alert('Payment integration coming soon! For now, subscription is pending.')
        await loadData()
      }
    } catch (e) {
      alert(e.message || 'Failed to subscribe')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleCancel() {
    if (!currentSubscription) return
    if (!confirm('Are you sure you want to cancel your subscription?')) return

    try {
      await apiPost(`/api/subscriptions/${currentSubscription.id}/cancel`, {})
      alert('Subscription cancelled successfully')
      await loadData()
    } catch (e) {
      alert(e.message || 'Failed to cancel subscription')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="card" style={{
          borderRadius: '16px',
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Loading subscription plans...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="card" style={{
          borderRadius: '16px',
          textAlign: 'center',
          padding: '60px 20px',
          border: '2px solid var(--danger-300)',
          background: 'var(--danger-50)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--danger-600)' }}>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(236, 72, 153, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              💳 Subscription Plans
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Choose the perfect plan for your business
            </p>
          </div>
        </div>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && currentSubscription.status === 'active' && (
        <div className="card" style={{ borderRadius: '16px' }}>
          <div style={{
            background: 'var(--success-50)',
            border: '2px solid var(--success-200)',
            padding: 20,
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--success-700)',
                  marginBottom: 6,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ✓ Current Plan
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--success-900)', marginBottom: 4 }}>
                  {currentSubscription.plan_name}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--success-700)' }}>
                  {currentSubscription.expires_at
                    ? `Expires: ${new Date(currentSubscription.expires_at).toLocaleDateString()}`
                    : 'Active Subscription'}
                </div>
              </div>
              <button
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '2px solid var(--danger-500)',
                  background: 'transparent',
                  color: 'var(--danger-600)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.background = 'var(--danger-50)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {!currentSubscription || currentSubscription.status !== 'active' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p className="muted" style={{ margin: 0, fontSize: '15px' }}>Choose a plan to get started with LogiSync</p>
        </div>
      ) : null}

      {/* Plans Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24
      }}>
        {plans.map(plan => {
          const isCurrentPlan = currentSubscription?.slug === plan.slug
          const isFree = plan.price === 0

          return (
            <div
              key={plan.id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: 28,
                border: isCurrentPlan ? '3px solid #ec4899' : '2px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                transition: 'all 0.3s ease',
                boxShadow: isCurrentPlan ? '0 8px 24px rgba(236, 72, 153, 0.3)' : '0 4px 20px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                if (!isCurrentPlan) {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(236, 72, 153, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                if (!isCurrentPlan) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: '#ec4899',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)'
                }}>
                  ✓ CURRENT
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: 12,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white'
                }}>{plan.name}</h3>
                <p style={{
                  fontSize: 14,
                  marginBottom: 24,
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>{plan.description}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: isFree ? '#10b981' : '#ec4899'
                  }}>
                    {isFree ? 'Free' : formatMoney(plan.price)}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.6)' }}>
                      /month
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#ec4899',
                  marginBottom: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px'
                }}>✨ Features</div>
                {plan.features && plan.features.length > 0 ? (
                  <ul style={{
                    margin: 0,
                    paddingLeft: 0,
                    listStyle: 'none',
                    fontSize: 14,
                    lineHeight: '2'
                  }}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} style={{
                        marginBottom: 10,
                        color: 'rgba(255, 255, 255, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>No features listed</p>
                )}
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  border: 'none',
                  background: isCurrentPlan
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  color: 'white',
                  cursor: isCurrentPlan || subscribing ? 'not-allowed' : 'pointer',
                  opacity: isCurrentPlan || subscribing ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: isCurrentPlan ? 'none' : '0 4px 16px rgba(236, 72, 153, 0.3)'
                }}
                disabled={isCurrentPlan || subscribing}
                onClick={() => handleSubscribe(plan)}
                onMouseOver={(e) => {
                  if (!isCurrentPlan && !subscribing) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(236, 72, 153, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isCurrentPlan && !subscribing) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(236, 72, 153, 0.3)'
                  }
                }}
              >
                {subscribing ? '⏳ Processing...' : isCurrentPlan ? '✓ Current Plan' : isFree ? '🚀 Get Started Free' : '💳 Subscribe Now'}
              </button>
            </div>
          )
        })}
      </div>

      {plans.length === 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          textAlign: 'center',
          padding: '60px 20px',
          border: '2px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
            No subscription plans available at this time.
          </p>
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Please check back later or contact support.
          </p>
        </div>
      )}
    </div>
  )
}
