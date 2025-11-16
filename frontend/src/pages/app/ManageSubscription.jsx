import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'

export default function ManageSubscription() {
  const navigate = useNavigate()
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/subscriptions/current')
      setCurrentSubscription(res.data)
    } catch (e) {
      setError(e.message || 'Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleCancel() {
    if (!currentSubscription) return
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to all premium features at the end of your billing period.')) return

    try {
      await apiPost(`/api/subscriptions/${currentSubscription.id}/cancel`, {})
      alert('Subscription cancelled successfully. You will have access until the end of your billing period.')
      navigate('/app/settings/subscription')
    } catch (e) {
      alert(e.message || 'Failed to cancel subscription')
    }
  }

  if (loading) {
    return (
      <div className="grid" style={{ gap: 24 }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Loading subscription details...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid" style={{ gap: 24 }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {error}
        </div>
      </div>
    )
  }

  if (!currentSubscription || currentSubscription.status !== 'active') {
    return (
      <div className="grid" style={{ gap: 24 }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
        }}>
          <button
            onClick={() => navigate('/app/settings/subscription')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            ← Back to Subscription
          </button>
          <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Manage Subscription
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
            No active subscription found
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 171, 0, 0.1)',
          border: '2px solid rgba(255, 171, 0, 0.3)',
          padding: 32,
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#ffab00', fontWeight: 700, marginBottom: 16, fontSize: '18px' }}>
            ⚠️ No Active Subscription
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 15, marginBottom: 20 }}>
            You need an active subscription to access management features.
          </p>
          <button
            onClick={() => navigate('/app/settings/subscription')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            View Plans
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <button
          onClick={() => navigate('/app/settings/subscription')}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '12px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          ← Back to Subscription
        </button>
        <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Manage Subscription
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
          Update your subscription settings
        </p>
      </div>

      {/* Subscription Details */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 24px 0', color: 'white', fontSize: '20px', fontWeight: '700' }}>
          Subscription Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Current Plan
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'white' }}>
              {currentSubscription.plan_name}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ✓ Active
              </span>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Next Billing Date
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
              {currentSubscription.expires_at ? new Date(currentSubscription.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: '1.6'
        }}>
          💡 <strong>Auto-Renewal:</strong> Your subscription will automatically renew on {currentSubscription.expires_at ? new Date(currentSubscription.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the renewal date'}. You'll be charged for the next billing cycle unless you cancel before this date.
        </div>
      </div>

      {/* Cancel Subscription */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#ef4444', fontSize: '20px', fontWeight: '700' }}>
          Cancel Subscription
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
          If you cancel your subscription, you'll continue to have access to all features until the end of your current billing period on {currentSubscription.expires_at ? new Date(currentSubscription.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the end of the period'}. After that, your account will revert to the free plan.
        </p>

        <div style={{
          background: 'rgba(255, 171, 0, 0.1)',
          border: '1px solid rgba(255, 171, 0, 0.3)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ color: '#ffab00', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            ⚠️ What happens when you cancel:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.8' }}>
            <li>Access to premium features until {currentSubscription.expires_at ? new Date(currentSubscription.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'end of period'}</li>
            <li>No more automatic renewals or charges</li>
            <li>Your data will be preserved</li>
            <li>You can reactivate anytime</li>
          </ul>
        </div>

        <button
          onClick={handleCancel}
          style={{
            padding: '14px 32px',
            borderRadius: '10px',
            border: 'none',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          Cancel My Subscription
        </button>
      </div>
    </div>
  )
}
