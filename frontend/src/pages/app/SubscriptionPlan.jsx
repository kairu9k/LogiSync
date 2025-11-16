import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { can } from '../../lib/permissions'

function formatMoney(amount) { return `₱${amount.toFixed(2)}` }

// Add CSS animation for breathing effect
const style = document.createElement('style')
style.textContent = `
  @keyframes breathingGlow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.5);
    }
  }
`
document.head.appendChild(style)

export default function SubscriptionPlan() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [paymentProcessed, setPaymentProcessed] = useState(false)


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

  useEffect(() => {
    loadData()
  }, [])

  async function handleSubscribe(plan) {
    if (subscribing) return

    if (currentSubscription && currentSubscription.status === 'active') {
      alert('You already have an active subscription. Please cancel it first.')
      return
    }

    setSubscribing(true)
    try {
      const res = await apiPost('/api/subscriptions/checkout', { plan_id: plan.id })

      if (!res.requires_payment) {
        // Free plan activated
        alert(res.message)
        await loadData()
      } else {
        // Paid plan - open PayMongo in popup and poll for completion
        if (res.checkout_url) {
          // Calculate center position
          const width = 600
          const height = 800
          const left = (window.screen.width - width) / 2
          const top = (window.screen.height - height) / 2

          // Open PayMongo in a centered popup window
          const popup = window.open(
            res.checkout_url,
            'PayMongo Checkout',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
          )

          // Poll to check if payment is complete
          const pollInterval = setInterval(async () => {
            try {
              // Check if popup is closed
              if (popup && popup.closed) {
                clearInterval(pollInterval)
                // Refresh subscription data
                await loadData()
                setSubscribing(false)
              }
            } catch (e) {
              clearInterval(pollInterval)
              setSubscribing(false)
            }
          }, 1000)

          // Timeout after 10 minutes
          setTimeout(() => {
            clearInterval(pollInterval)
            if (popup && !popup.closed) {
              popup.close()
            }
            setSubscribing(false)
          }, 600000)

        } else {
          alert('Failed to create checkout session')
          setSubscribing(false)
        }
      }
    } catch (e) {
      alert(e.message || 'Failed to subscribe')
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
        <h1 style={{ marginTop: 0 }}>Subscription & Billing</h1>
        <div className="card" style={{ padding: 16 }}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Subscription & Billing</h1>
        <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
      </div>
    )
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              💳 Subscription & Billing
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Manage your LogiSync subscription
            </p>
          </div>

          {/* Manage Subscription Button */}
          {currentSubscription && currentSubscription.status === 'active' && (
            <button
              onClick={() => navigate('/app/settings/subscription/manage')}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* No Active Subscription Warning */}
      {(!currentSubscription || currentSubscription.status !== 'active') && (
        <div className="card" style={{
          background: 'rgba(255, 171, 0, 0.1)',
          border: '2px solid rgba(255, 171, 0, 0.3)',
          padding: 20,
          borderRadius: '12px'
        }}>
          <div style={{ color: '#ffab00', fontWeight: 700, marginBottom: 6, fontSize: '15px' }}>
            ⚠️ No Active Subscription
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
            Choose a plan below to unlock all features and start managing your logistics operations
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24
      }}>
        {plans.map((plan, idx) => {
          const isCurrentPlan = currentSubscription?.slug === plan.slug
          const isFree = plan.price === 0
          const isPopular = plan.slug === 'pro'

          return (
            <div
              key={plan.id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: 28,
                border: isCurrentPlan
                  ? '3px solid #3b82f6'
                  : isPopular
                    ? '3px solid #8b5cf6'
                    : '2px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                transition: 'all 0.3s ease',
                boxShadow: isCurrentPlan
                  ? '0 8px 24px rgba(59, 130, 246, 0.4)'
                  : isPopular
                    ? '0 8px 24px rgba(139, 92, 246, 0.2)'
                    : '0 4px 20px rgba(0,0,0,0.3)',
                animation: isCurrentPlan ? 'breathingGlow 3s ease-in-out infinite' : 'none'
              }}
              onMouseOver={(e) => {
                if (!isCurrentPlan) {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = isPopular
                    ? '0 12px 32px rgba(139, 92, 246, 0.3)'
                    : '0 12px 32px rgba(59, 130, 246, 0.3)'
                  e.currentTarget.style.borderColor = isPopular ? '#8b5cf6' : 'rgba(59, 130, 246, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                if (!isCurrentPlan) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = isPopular
                    ? '0 8px 24px rgba(139, 92, 246, 0.2)'
                    : '0 4px 20px rgba(0,0,0,0.3)'
                  e.currentTarget.style.borderColor = isPopular ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)'
                }}>
                  ✓ YOUR PLAN
                </div>
              )}

              {!isCurrentPlan && isPopular && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                }}>
                  🔥 POPULAR
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
                  color: 'rgba(255, 255, 255, 0.7)',
                  minHeight: 40
                }}>
                  {plan.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: isFree ? '#10b981' : isPopular ? '#8b5cf6' : '#3b82f6'
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
                  color: isPopular ? '#8b5cf6' : '#3b82f6',
                  marginBottom: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px'
                }}>✨ WHAT'S INCLUDED</div>
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
                  <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>Basic features included</p>
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
                    : isPopular
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  cursor: isCurrentPlan || subscribing ? 'not-allowed' : 'pointer',
                  opacity: isCurrentPlan || subscribing ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: isCurrentPlan
                    ? 'none'
                    : isPopular
                      ? '0 4px 16px rgba(139, 92, 246, 0.3)'
                      : '0 4px 16px rgba(59, 130, 246, 0.4)'
                }}
                disabled={isCurrentPlan || subscribing}
                onClick={() => handleSubscribe(plan)}
                onMouseOver={(e) => {
                  if (!isCurrentPlan && !subscribing) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = isPopular
                      ? '0 8px 24px rgba(139, 92, 246, 0.5)'
                      : '0 8px 24px rgba(59, 130, 246, 0.6)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isCurrentPlan && !subscribing) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = isPopular
                      ? '0 4px 16px rgba(139, 92, 246, 0.3)'
                      : '0 4px 16px rgba(59, 130, 246, 0.4)'
                  }
                }}
              >
                {subscribing
                  ? '⏳ Processing...'
                  : isCurrentPlan
                    ? '✓ Active Plan'
                    : isFree
                      ? '🚀 Get Started Free'
                      : '💳 Subscribe Now'}
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
