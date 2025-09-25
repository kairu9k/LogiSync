import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../lib/api'

export default function OrderCreate() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const payload = {
      customer: form.get('customer') || 'demo',
      status: form.get('status') || 'pending',
    }
    try {
      setSaving(true)
      const res = await apiPost('/api/orders', payload)
      const id = res?.order_id
      if (id) navigate(`/app/orders/${id}`)
      else navigate('/app/orders')
    } catch (e) {
      setError(e.message || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create Order</h2>
        <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
          <div className="form-row">
            <label>
              <div className="label">Customer</div>
              <input name="customer" className="input" placeholder="Customer name" required />
            </label>
            <label>
              <div className="label">Status</div>
              <select name="status" className="input" defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>
          </div>
          {error && <div style={{ color: 'var(--danger-600)' }}>{error}</div>}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>Create</button>
            <button className="btn btn-outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}