import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editProductId, setEditProductId] = useState('')
  const [editQuantity, setEditQuantity] = useState('1')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet(`/api/orders/${id}`)
      setOrder(res?.data)
    } catch (e) {
      setError(e.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function setStatus(status) {
    try {
      setUpdating(true)
      await apiPatch(`/api/orders/${id}/status`, { status })
      await load()
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="card" style={{ padding: 16 }}>Loading…</div>
  if (error) return <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
  if (!order) return null

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>{order.po}</h2>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
          <div>
            <div className="label">Customer</div>
            <div>{order.customer}</div>
          </div>
          <div>
            <div className="label">Status</div>
            <div><span className={`badge ${order.status === 'fulfilled' ? 'success' : 'info'}`}>{order.status}</span></div>
          </div>
          <div>
            <div className="label">Order Date</div>
            <div>{String(order.order_date).replace('T', ' ').replace('Z','')}</div>
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="btn" disabled={updating} onClick={() => setStatus('pending')}>Mark Pending</button>
          <button className="btn btn-outline" disabled={updating} onClick={() => setStatus('processing')}>Mark Processing</button>
          <button className="btn btn-success" disabled={updating} onClick={() => setStatus('fulfilled')}>Mark Fulfilled</button>
          <button className="btn btn-danger" disabled={updating} onClick={() => setStatus('canceled')}>Cancel</button>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Items</h3>
        {order.details?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {order.details.map((d) => (
              <li key={d.order_details_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingId === d.order_details_id ? (
                  <>
                    <input className="input" style={{ maxWidth: 120 }} type="number" min="1" value={editProductId} onChange={(e) => setEditProductId(e.target.value)} />
                    <input className="input" style={{ maxWidth: 120 }} type="number" min="1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                    <button className="btn btn-primary" type="button" onClick={async () => {
                      try {
                        await apiPatch(`/api/orders/${id}/items/${d.order_details_id}`, { product_id: Number(editProductId), quantity: Number(editQuantity) })
                        setEditingId(null)
                        await load()
                      } catch (err) {
                        alert(err.message || 'Failed to update item')
                      }
                    }}>Save</button>
                    <button className="btn btn-outline" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span>Product {d.product_id} — Qty {d.quantity}</span>
                    <button className="btn" type="button" onClick={() => { setEditingId(d.order_details_id); setEditProductId(String(d.product_id)); setEditQuantity(String(d.quantity)); }}>Edit</button>
                    <button className="btn btn-danger" type="button" onClick={async () => {
                      if (!confirm('Delete this item?')) return
                      try {
                        await apiDelete(`/api/orders/${id}/items/${d.order_details_id}`)
                        await load()
                      } catch (err) {
                        alert(err.message || 'Failed to delete item')
                      }
                    }}>Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">No items on this order.</div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const product_id = parseInt(fd.get('product_id') || '0', 10)
            const quantity = parseInt(fd.get('quantity') || '0', 10)
            if (!product_id || !quantity) return
            try {
              await apiPost(`/api/orders/${id}/items`, { product_id, quantity })
              e.currentTarget.reset()
              await load()
            } catch (err) {
              alert(err.message || 'Failed to add item')
            }
          }}
          className="grid"
          style={{ gap: 12, marginTop: 12 }}
        >
          <div className="form-row">
            <label>
              <div className="label">Product ID</div>
              <input name="product_id" className="input" type="number" min="1" placeholder="e.g. 101" required />
            </label>
            <label>
              <div className="label">Quantity</div>
              <input name="quantity" className="input" type="number" min="1" defaultValue="1" required />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  )
}