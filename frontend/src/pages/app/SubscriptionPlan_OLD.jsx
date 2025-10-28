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

  useEffect(() => { loadData() }, [])

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
        // Paid plan - redirect to payment
        alert('✅ Payment intent created!\n\n' +
              'In production, you would be redirected to PayMongo checkout.\n\n' +
              'For demo: Your subscription is now pending payment.\n\n' +
              'Test payment will be available once you connect your UnionBank account.')
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
    <div>
      <h1 style={{ marginTop: 0 }}>Subscription & Billing</h1>
      <p className="muted">Manage your LogiSync subscription</p>

      {currentSubscription && currentSubscription.status === 'active' && (
        <div className="card" style={{
          background: 'var(--surface)',
          border: '2px solid var(--accent)',
          padding: 20,
          marginTop: 24,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--accent)', marginBottom: 4, fontWeight: 600 }}>
                ✓ Current Active Plan
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {currentSubscription.plan_name}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                {currentSubscription.expires_at
                  ? `Renews on ${new Date(currentSubscription.expires_at).toLocaleDateString()}`
                  : 'Active subscription'}
              </div>
            </div>
            <button
              className="btn btn-outline"
              onClick={handleCancel}
              style={{
                borderColor: '#ef4444',
                color: '#ef4444'
              }}
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {!currentSubscription || currentSubscription.status !== 'active' ? (
        <div className="card" style={{
          background: 'var(--surface)',
          border: '1px solid color-mix(in oklab, #ffab00, transparent 50%)',
          padding: 16,
          marginTop: 24,
          marginBottom: 24
        }}>
          <div style={{ color: '#ffab00', fontWeight: 600, marginBottom: 4 }}>
            ⚠️ No Active Subscription
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            Choose a plan below to unlock all features and start managing your logistics operations
          </div>
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
        {plans.map((plan, idx) => {
          const isCurrentPlan = currentSubscription?.slug === plan.slug
          const isFree = plan.price === 0
          const isPopular = plan.slug === 'pro'

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: 24,
                border: isCurrentPlan
                  ? '2px solid var(--primary)'
                  : isPopular
                    ? '2px solid var(--primary)'
                    : '1px solid var(--border)',
                position: 'relative',
                background: isCurrentPlan ? 'var(--surface)' : 'var(--surface)'
              }}
            >
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  right: 16,
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: '#0b1020',
                  padding: '6px 16px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Your Plan
                </div>
              )}

              {!isCurrentPlan && isPopular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  right: 16,
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: '#0b1020',
                  padding: '6px 16px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Popular
                </div>
              )}

              <div style={{ marginBottom: 20, marginTop: isCurrentPlan || isPopular ? 12 : 0 }}>
                <h3 style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{plan.name}</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 20, minHeight: 40 }}>
                  {plan.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--text)' }}>
                    {isFree ? 'Free' : formatMoney(plan.price)}
                  </span>
                  {!isFree && (
                    <span className="muted" style={{ fontSize: 16 }}>
                      /month
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div className="label" style={{ marginBottom: 12, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  What's Included
                </div>
                {plan.features && plan.features.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 14 }}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} style={{ marginBottom: 10, color: 'var(--muted)', display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--accent)', marginRight: 8, fontSize: 16 }}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Basic features included</p>
                )}
              </div>

              <button
                className={isCurrentPlan ? 'btn' : isPopular ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ width: '100%', fontWeight: 600 }}
                disabled={isCurrentPlan || subscribing}
                onClick={() => handleSubscribe(plan)}
              >
                {subscribing
                  ? 'Processing...'
                  : isCurrentPlan
                    ? '✓ Active Plan'
                    : isFree
                      ? 'Get Started Free'
                      : 'Subscribe Now'}
              </button>
            </div>
          )
        })}
      </div>

      {plans.length === 0 && (
        <div className="card" style={{ padding: 24, marginTop: 24, textAlign: 'center' }}>
          <p className="muted">No subscription plans available at this time.</p>
        </div>
      )}

      <div className="card" style={{ marginTop: 32 }}>
        <h3 style={{ marginTop: 0 }}>💳 Payment Information</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          LogiSync uses <strong style={{ color: 'var(--text)' }}>PayMongo</strong> for secure payment processing.
        </p>
        <div style={{ background: 'var(--bg-2)', padding: 16, borderRadius: 8, fontSize: 14, border: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 8, color: 'var(--text)' }}><strong>Accepted Payment Methods:</strong></div>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)' }}>
            <li>Credit/Debit Cards (Visa, Mastercard)</li>
            <li>GCash</li>
            <li>PayMaya</li>
          </ul>
          <div style={{ marginTop: 16, padding: 12, background: 'color-mix(in oklab, var(--primary), transparent 90%)', border: '1px solid color-mix(in oklab, var(--primary), transparent 70%)', borderRadius: 6 }}>
            <strong style={{ color: 'var(--text)' }}>ℹ️ Test Mode Active</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Currently in test mode. Payments will be processed when your UnionBank account is connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
