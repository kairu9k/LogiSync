import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import { can } from '../../lib/permissions'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('any')
  const navigate = useNavigate()

  async function fetchOrders(params = {}) {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.status && params.status !== 'any') qs.set('status', params.status)
    const url = '/api/orders' + (qs.toString() ? `?${qs.toString()}` : '')
    const res = await apiGet(url)
    return res?.data || []
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchOrders({ q, status })
        // Sort orders: put fulfilled orders last
        const sortedData = data.sort((a, b) => {
          if (a.status === 'fulfilled' && b.status !== 'fulfilled') return 1
          if (a.status !== 'fulfilled' && b.status === 'fulfilled') return -1
          return 0
        })
        if (!ignore) setOrders(sortedData)
      } catch (e) {
        if (!ignore) setError(e.message || 'Failed to load orders')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [q, status])

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(6, 182, 212, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              🛒 Order Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Manage and track all customer orders
            </p>
          </div>
          {can.manageOrders() && (
            <button
              onClick={() => navigate('/app/orders/new')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'white',
                color: '#0891b2',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              + New Order
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: 'var(--gray-400)'
          }}>🔍</span>
          <input
            className="input"
            placeholder="Search orders (PO, username)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              paddingLeft: '48px',
              width: '100%',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              fontSize: '15px',
              padding: '14px 14px 14px 48px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#06b6d4'
              e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#06b6d4'
            e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="any">Status: Any</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {loading && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Loading orders…
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
          {orders.map((o) => {
            const getStatusColors = (status) => {
              switch(status) {
                case 'fulfilled':
                  return { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
                case 'processing':
                  return { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }
                case 'canceled':
                  return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
                default:
                  return { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }
              }
            }

            const statusColors = getStatusColors(o.status)

            return (
              <button
                key={o.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'left',
                  opacity: o.status === 'fulfilled' ? 0.7 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/app/orders/${o.id}`)}
                onMouseOver={(e) => {
                  if (o.status !== 'fulfilled') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  if (o.status !== 'fulfilled') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                {o.status === 'fulfilled' && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-25deg)',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    opacity: 0.3,
                    pointerEvents: 'none',
                    zIndex: 1,
                    userSelect: 'none',
                    textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                  }}>
                    ✓ FULFILLED
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Purchase Order
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#06b6d4',
                    fontFamily: 'monospace'
                  }}>
                    {o.po}
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.95)',
                    marginBottom: '4px'
                  }}>
                    {o.customer}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    {o.order_date ? new Date(o.order_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '12px'
                }}>
                  📦 Items: <span style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.95)' }}>{o.items}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: statusColors.bg,
                    color: statusColors.color,
                    textTransform: 'uppercase'
                  }}>
                    {o.status}
                  </span>
                  {!o.has_shipment && o.status !== 'canceled' && (
                    <span style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ⚠ No Shipment
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          {orders.length === 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🛒</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                No orders found
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Try adjusting your search or filter criteria
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
