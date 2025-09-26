import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiDelete, getShipment, createShipmentFromOrder, getTransports } from '../../lib/api'

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
  const [shipment, setShipment] = useState(null)
  const [showCreateShipment, setShowCreateShipment] = useState(false)
  const [creatingShipment, setCreatingShipment] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet(`/api/orders/${id}`)
      setOrder(res?.data)

      // Check if order has a shipment by searching shipments
      try {
        const shipmentsRes = await apiGet(`/api/shipments?q=PO-${String(id).padStart(5, '0')}&limit=1`)
        if (shipmentsRes?.data?.length > 0) {
          const shipmentDetail = await getShipment(shipmentsRes.data[0].id)
          setShipment(shipmentDetail?.data)
        }
      } catch {
        // No shipment exists, which is fine
      }
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

  async function handleCreateShipment(shipmentData) {
    try {
      setCreatingShipment(true)
      await createShipmentFromOrder(id, shipmentData)
      setShowCreateShipment(false)
      await load() // Reload to get the new shipment
    } catch (e) {
      let errorMessage = e.message || 'Failed to create shipment'

      if (errorMessage.includes('transport_id')) {
        errorMessage = 'Invalid transport/vehicle selected. Please run database seeders to populate transport data.'
      } else if (errorMessage.includes('foreign key')) {
        errorMessage = 'Database constraint error. Please ensure all required data exists in the database.'
      }

      alert(errorMessage)
      console.error('Shipment creation error:', e)
    } finally {
      setCreatingShipment(false)
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

      {/* Shipment Section */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Shipment</h3>
          {order.status === 'fulfilled' && !shipment && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateShipment(true)}
              disabled={creatingShipment}
            >
              Create Shipment
            </button>
          )}
        </div>

        {shipment ? (
          <div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
              <div>
                <div className="label">Tracking Number</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1em' }}>{shipment.tracking_number}</div>
              </div>
              <div>
                <div className="label">Status</div>
                <div>
                  <span className={`badge ${
                    shipment.status === 'delivered' ? 'success' :
                    shipment.status === 'in_transit' || shipment.status === 'out_for_delivery' ? 'info' :
                    shipment.status === 'pending' ? 'warn' : 'danger'
                  }`}>
                    {shipment.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="label">Driver</div>
                <div>{shipment.driver}</div>
              </div>
              <div>
                <div className="label">Receiver</div>
                <div>{shipment.receiver_name}</div>
              </div>
              <div>
                <div className="label">Vehicle</div>
                <div>{shipment.vehicle} ({shipment.vehicle_type})</div>
              </div>
              <div>
                <div className="label">Departure Date</div>
                <div>{shipment.departure_date ? new Date(shipment.departure_date).toLocaleDateString() : 'Not set'}</div>
              </div>
            </div>

            {shipment.tracking_history?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="label">Recent Tracking Updates</div>
                <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                  {shipment.tracking_history.slice(0, 3).map((item, index) => (
                    <div key={index} style={{
                      padding: 8,
                      border: '1px solid var(--gray-200)',
                      borderRadius: 4,
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${
                          item.status === 'delivered' ? 'success' :
                          item.status === 'in_transit' || item.status === 'out_for_delivery' ? 'info' :
                          item.status === 'pending' ? 'warn' : 'danger'
                        }`}>
                          {item.status}
                        </span>
                        <span className="muted">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ fontWeight: 'bold', marginTop: 4 }}>{item.location}</div>
                      {item.details && <div className="muted" style={{ marginTop: 2 }}>{item.details}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate('/app/shipments')}
                  >
                    View Full Tracking History
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : order.status === 'fulfilled' ? (
          <div className="muted">No shipment created yet. Click "Create Shipment" to generate shipping labels and tracking.</div>
        ) : (
          <div className="muted">Order must be fulfilled before creating a shipment.</div>
        )}

        {showCreateShipment && (
          <CreateShipmentForm
            onSubmit={handleCreateShipment}
            onCancel={() => setShowCreateShipment(false)}
            creating={creatingShipment}
          />
        )}
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
            const formEl = e.currentTarget
            const fd = new FormData(formEl)
            const product_id = parseInt(fd.get('product_id') || '0', 10)
            const quantity = parseInt(fd.get('quantity') || '0', 10)
            if (!product_id || !quantity) return
            try {
              await apiPost(`/api/orders/${id}/items`, { product_id, quantity })
              formEl.reset()
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

function CreateShipmentForm({ onSubmit, onCancel, creating }) {
  const [formData, setFormData] = useState({
    transport_id: '',
    receiver_name: '',
    receiver_address: '',
    origin_name: 'Main Warehouse',
    origin_address: 'Warehouse District, Business Park',
    destination_name: '',
    destination_address: '',
    charges: '',
    departure_date: ''
  })
  const [transports, setTransports] = useState([])
  const [loadingTransports, setLoadingTransports] = useState(true)

  useEffect(() => {
    async function loadTransports() {
      try {
        const res = await getTransports()
        setTransports(res?.data || [])
      } catch (e) {
        console.error('Failed to load transports:', e)
      } finally {
        setLoadingTransports(false)
      }
    }
    loadTransports()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.transport_id || !formData.receiver_name || !formData.charges) {
      alert('Please fill in all required fields')
      return
    }

    onSubmit({
      ...formData,
      charges: parseInt(formData.charges, 10)
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--gray-200)', borderRadius: 4 }}>
      <h4 style={{ marginTop: 0 }}>Create New Shipment</h4>
      <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
        <div className="form-row">
          <label>
            <div className="label">Select Vehicle *</div>
            {loadingTransports ? (
              <div className="input" style={{ color: 'var(--gray-500)' }}>Loading vehicles...</div>
            ) : transports.length === 0 ? (
              <div>
                <div className="input" style={{ color: 'var(--danger-600)' }}>No vehicles available</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--danger-600)', marginTop: 4 }}>
                  Please run database seeders to add transport data: <code>php artisan db:seed</code>
                </div>
              </div>
            ) : (
              <select
                className="input"
                value={formData.transport_id}
                onChange={(e) => handleInputChange('transport_id', e.target.value)}
                required
              >
                <option value="">Select a vehicle...</option>
                {transports.map(transport => (
                  <option key={transport.id} value={transport.id}>
                    {transport.label} - Driver: {transport.driver_name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label>
            <div className="label">Shipping Charges (PHP) *</div>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="e.g. 1500"
              value={formData.charges}
              onChange={(e) => handleInputChange('charges', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <div className="label">Receiver Name *</div>
            <input
              className="input"
              placeholder="e.g. Juan Dela Cruz"
              value={formData.receiver_name}
              onChange={(e) => handleInputChange('receiver_name', e.target.value)}
              required
            />
          </label>
          <label>
            <div className="label">Departure Date</div>
            <input
              className="input"
              type="date"
              value={formData.departure_date}
              onChange={(e) => handleInputChange('departure_date', e.target.value)}
            />
          </label>
        </div>

        <label>
          <div className="label">Receiver Address *</div>
          <textarea
            className="input"
            placeholder="Full delivery address"
            value={formData.receiver_address}
            onChange={(e) => handleInputChange('receiver_address', e.target.value)}
            required
            rows="2"
          />
        </label>

        <div className="form-row">
          <label>
            <div className="label">Origin Name</div>
            <input
              className="input"
              value={formData.origin_name}
              onChange={(e) => handleInputChange('origin_name', e.target.value)}
            />
          </label>
          <label>
            <div className="label">Destination Name *</div>
            <input
              className="input"
              placeholder="e.g. Manila Hub"
              value={formData.destination_name}
              onChange={(e) => handleInputChange('destination_name', e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          <div className="label">Origin Address</div>
          <textarea
            className="input"
            value={formData.origin_address}
            onChange={(e) => handleInputChange('origin_address', e.target.value)}
            rows="2"
          />
        </label>

        <label>
          <div className="label">Destination Address *</div>
          <textarea
            className="input"
            placeholder="Full destination address"
            value={formData.destination_address}
            onChange={(e) => handleInputChange('destination_address', e.target.value)}
            required
            rows="2"
          />
        </label>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={creating}
          >
            {creating ? 'Creating Shipment...' : 'Create Shipment'}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}