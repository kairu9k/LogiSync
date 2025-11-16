import { useEffect, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../../lib/api'

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const [extendMonths, setExtendMonths] = useState(1)
  const [extending, setExtending] = useState(false)

  async function loadSubscriptions() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/subscriptions/all')
      setSubscriptions(res.data || [])
    } catch (e) {
      setError(e.message || 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSubscriptions() }, [])

  async function handleStatusChange(subscriptionId, newStatus) {
    if (!confirm(`Are you sure you want to change this subscription status to "${newStatus}"?`)) {
      return
    }

    try {
      await apiPatch(`/api/subscriptions/${subscriptionId}/status`, { status: newStatus })
      alert('Subscription status updated successfully')
      loadSubscriptions()
    } catch (e) {
      alert(e.message || 'Failed to update subscription status')
    }
  }

  async function handleExtend() {
    if (!selectedSubscription || extending) return

    setExtending(true)
    try {
      const res = await apiPost(`/api/subscriptions/${selectedSubscription.user_subscription_id}/extend`, {
        months: parseInt(extendMonths)
      })
      alert(`Subscription extended successfully. New end date: ${res.new_end_date}`)
      setShowExtendModal(false)
      setSelectedSubscription(null)
      setExtendMonths(1)
      loadSubscriptions()
    } catch (e) {
      alert(e.message || 'Failed to extend subscription')
    } finally {
      setExtending(false)
    }
  }

  function getStatusBadgeStyle(status) {
    switch (status) {
      case 'active':
        return { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }
      case 'expired':
        return { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }
      case 'cancelled':
        return { background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', color: 'white' }
      case 'pending':
        return { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }
      default:
        return { background: '#e5e7eb', color: '#374151' }
    }
  }

  function getDaysRemaining(endDate) {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diff
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
          Loading subscriptions...
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

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          💳 Subscription Management
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
          Manage all user subscriptions and billing
        </p>
      </div>

      {/* Subscriptions Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflowX: 'auto'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0
        }}>
          <thead>
            <tr style={{
              borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Customer</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Plan</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Price</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Start Date</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>End Date</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Days Left</th>
              <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => {
              const daysLeft = getDaysRemaining(sub.end_date)
              return (
                <tr key={sub.user_subscription_id} style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', fontSize: '14px' }}>
                      {sub.username}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '2px' }}>
                      {sub.email}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139, 92, 246, 0.3)'
                    }}>
                      {sub.plan_name}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      ...getStatusBadgeStyle(sub.status)
                    }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>
                    ₱{sub.price.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    {new Date(sub.start_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    {new Date(sub.end_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      color: daysLeft < 7 ? '#ef4444' : daysLeft < 30 ? '#f59e0b' : '#10b981',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {sub.status === 'active' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedSubscription(sub)
                              setShowExtendModal(true)
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            Extend
                          </button>
                          <button
                            onClick={() => handleStatusChange(sub.user_subscription_id, 'cancelled')}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {sub.status === 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(sub.user_subscription_id, 'active')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {subscriptions.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>No subscriptions found</div>
          </div>
        )}
      </div>

      {/* Extend Subscription Modal */}
      {showExtendModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => !extending && setShowExtendModal(false)}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 24px 0', color: 'white', fontSize: '24px', fontWeight: '700' }}>
              Extend Subscription
            </h3>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                Customer: <strong style={{ color: 'white' }}>{selectedSubscription?.username}</strong>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                Current Plan: <strong style={{ color: 'white' }}>{selectedSubscription?.plan_name}</strong>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                Current End Date: <strong style={{ color: 'white' }}>{selectedSubscription ? new Date(selectedSubscription.end_date).toLocaleDateString() : ''}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: '600' }}>
                Extend by (months)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={extendMonths}
                onChange={(e) => setExtendMonths(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => !extending && setShowExtendModal(false)}
                disabled={extending}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: extending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: extending ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={extending}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  background: extending ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: extending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  boxShadow: extending ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                {extending ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
