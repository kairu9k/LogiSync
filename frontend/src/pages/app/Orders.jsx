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
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Orders</h2>
          {can.manageOrders() && (
            <button className="btn btn-primary" onClick={() => navigate('/app/orders/new')}>New Order</button>
          )}
        </div>
        <div className="form-row">
          <input className="input" placeholder="Search orders (PO, username)" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="any">Status: Any</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 16 }}>Loading orders…</div>}
      {error && <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
          {orders.map((o) => {
            const getBadgeClass = (status) => {
              switch(status) {
                case 'fulfilled': return 'success'
                case 'processing': return 'info'
                case 'canceled': return 'danger'
                default: return 'warn'
              }
            }

            return (
              <button
                key={o.id}
                className="card link-card"
                style={{
                  padding: 16,
                  textAlign: 'left',
                  opacity: o.status === 'fulfilled' ? 0.6 : 1,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate(`/app/orders/${o.id}`)}
              >
                {o.status === 'fulfilled' && (
                  <div className="quote-watermark">Fulfilled</div>
                )}
                <div className="muted">{o.po}</div>
                <div><strong>{o.customer}</strong></div>
                <div className="muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
                  {o.order_date ? new Date(o.order_date).toLocaleDateString() : 'N/A'}
                </div>
                <div style={{ marginTop: 8 }}>Items: {o.items}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`badge ${getBadgeClass(o.status)}`}>{o.status}</span>
                  {!o.has_shipment && o.status !== 'canceled' && (
                    <span className="badge warn" style={{ fontSize: '11px' }}>⚠ No Shipment</span>
                  )}
                </div>
              </button>
            )
          })}
          {orders.length === 0 && (
            <div className="card" style={{ padding: 16 }}>
              No orders found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
