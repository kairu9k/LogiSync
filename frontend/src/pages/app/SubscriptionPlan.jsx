import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'

function formatMoney(amount) { return `₱${amount.toFixed(2)}` }

export default function SubscriptionPlan() {
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

  useEffect(() => {
    loadData()

    // Check if returning from PayMongo
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get("payment")
    const subscriptionId = urlParams.get("subscription_id")

    if (paymentStatus === "success" && subscriptionId) {
      apiPost("/api/subscriptions/payment-success", { subscription_id: subscriptionId })
        .then(() => {
          alert("✅ Payment successful! Your subscription is now active.")
          window.history.replaceState({}, "", window.location.pathname)
          loadData()
        })
        .catch(() => alert("Payment done but activation failed. Contact support."))
    } else if (paymentStatus === "cancelled") {
      alert("❌ Payment cancelled.")
      window.history.replaceState({}, "", window.location.pathname)
    }
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
        // Paid plan - redirect to PayMongo checkout
        if (res.checkout_url) {
          window.open(res.checkout_url, '_blank')
          alert('✅ PayMongo checkout opened in new window!\n\n📝 Test Card:\nCard: 4343 4343 4343 4343\nExpiry: 12/25 | CVC: 123\n\nComplete payment and click OK to refresh.')
          await loadData()
        } else {
          alert('Failed to create checkout session')
        }
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
        background: 'linear-gradient(135deg, #9FA2B2 0%, #7a7d8f 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(159, 162, 178, 0.2)'
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

          {/* Current Active Plan on the right side */}
          {currentSubscription && currentSubscription.status === 'active' && (
            <div style={{
              padding: '16px 20px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              minWidth: '280px'
            }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ✓ CURRENT ACTIVE PLAN
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                  {currentSubscription.plan_name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  {currentSubscription.expires_at
                    ? `Renews on ${new Date(currentSubscription.expires_at).toLocaleDateString()}`
                    : 'Active subscription'}
                </div>
              </div>
              <button
                onClick={handleCancel}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      </div>

      {!currentSubscription || currentSubscription.status !== 'active' ? (
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
      ) : null}

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
                  ? '3px solid #9FA2B2'
                  : isPopular
                    ? '3px solid #8b5cf6'
                    : '2px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                transition: 'all 0.3s ease',
                boxShadow: isCurrentPlan
                  ? '0 8px 24px rgba(159, 162, 178, 0.3)'
                  : isPopular
                    ? '0 8px 24px rgba(139, 92, 246, 0.2)'
                    : '0 4px 20px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                if (!isCurrentPlan) {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = isPopular
                    ? '0 12px 32px rgba(139, 92, 246, 0.3)'
                    : '0 12px 32px rgba(159, 162, 178, 0.2)'
                  e.currentTarget.style.borderColor = isPopular ? '#8b5cf6' : 'rgba(159, 162, 178, 0.5)'
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
                  background: '#9FA2B2',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  boxShadow: '0 4px 12px rgba(159, 162, 178, 0.4)'
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
                    color: isFree ? '#10b981' : isPopular ? '#8b5cf6' : '#9FA2B2'
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
                  color: isPopular ? '#8b5cf6' : '#9FA2B2',
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
                      : 'linear-gradient(135deg, #9FA2B2 0%, #7a7d8f 100%)',
                  color: 'white',
                  cursor: isCurrentPlan || subscribing ? 'not-allowed' : 'pointer',
                  opacity: isCurrentPlan || subscribing ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: isCurrentPlan
                    ? 'none'
                    : isPopular
                      ? '0 4px 16px rgba(139, 92, 246, 0.3)'
                      : '0 4px 16px rgba(159, 162, 178, 0.3)'
                }}
                disabled={isCurrentPlan || subscribing}
                onClick={() => handleSubscribe(plan)}
                onMouseOver={(e) => {
                  if (!isCurrentPlan && !subscribing) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = isPopular
                      ? '0 8px 24px rgba(139, 92, 246, 0.5)'
                      : '0 8px 24px rgba(159, 162, 178, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isCurrentPlan && !subscribing) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = isPopular
                      ? '0 4px 16px rgba(139, 92, 246, 0.3)'
                      : '0 4px 16px rgba(159, 162, 178, 0.3)'
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
