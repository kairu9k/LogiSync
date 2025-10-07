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
      <div className="grid" style={{ gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
      </div>
    )
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Subscription</h2>

        {currentSubscription && currentSubscription.status === 'active' && (
          <div style={{
            background: 'var(--success-50)',
            border: '1px solid var(--success-200)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--success-700)', marginBottom: 4 }}>
                  Current Plan
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--success-900)' }}>
                  {currentSubscription.plan_name}
                </div>
                <div style={{ fontSize: 14, color: 'var(--success-700)', marginTop: 4 }}>
                  {currentSubscription.expires_at
                    ? `Expires: ${new Date(currentSubscription.expires_at).toLocaleDateString()}`
                    : 'Active'}
                </div>
              </div>
              <button
                className="btn btn-outline"
                onClick={handleCancel}
                style={{ borderColor: 'var(--danger-500)', color: 'var(--danger-600)' }}
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {!currentSubscription || currentSubscription.status !== 'active' ? (
          <p className="muted">Choose a plan to get started with LogiSync</p>
        ) : (
          <p className="muted">Upgrade or change your plan below</p>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {plans.map(plan => {
          const isCurrentPlan = currentSubscription?.slug === plan.slug
          const isFree = plan.price === 0

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: 24,
                border: isCurrentPlan ? '2px solid var(--primary-500)' : '1px solid var(--border)',
                position: 'relative'
              }}
            >
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'var(--primary-500)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  CURRENT
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, marginBottom: 8 }}>{plan.name}</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>{plan.description}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 700 }}>
                    {isFree ? 'Free' : formatMoney(plan.price)}
                  </span>
                  {!isFree && (
                    <span className="muted" style={{ fontSize: 14 }}>
                      /month
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="label" style={{ marginBottom: 8 }}>Features:</div>
                {plan.features && plan.features.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} style={{ marginBottom: 6, color: 'var(--gray-700)' }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No features listed</p>
                )}
              </div>

              <button
                className={isCurrentPlan ? 'btn' : 'btn btn-primary'}
                style={{ width: '100%' }}
                disabled={isCurrentPlan || subscribing}
                onClick={() => handleSubscribe(plan)}
              >
                {subscribing ? 'Processing...' : isCurrentPlan ? 'Current Plan' : isFree ? 'Get Started' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>

      {plans.length === 0 && (
        <div className="card" style={{ padding: 16 }}>
          <p className="muted">No subscription plans available at this time.</p>
        </div>
      )}
    </div>
  )
}
