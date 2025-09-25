import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await apiGet('/api/orders')
        if (!ignore) setOrders(res?.data || [])
      } catch (e) {
        if (!ignore) setError(e.message || 'Failed to load orders')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Orders</h2>
        <div className="form-row">
          <input className="input" placeholder="Search orders (PO, customer)" />
          <input className="input" placeholder="Status: Any" />
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 16 }}>Loading orders…</div>}
      {error && <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} className="card" style={{ padding: 16 }}>
              <div className="muted">{o.po}</div>
              <div>Customer {o.customer}</div>
              <div>Items: {o.items}</div>
              <div>
                Status: <span className={`badge ${o.status === 'fulfilled' ? 'success' : 'info'}`}>{o.status}</span>
              </div>
            </div>
          ))}
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
