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
        const poNumber = `PO-${String(id).padStart(5, '0')}`
        const shipmentsRes = await apiGet(`/api/shipments?q=${poNumber}&limit=1`)
        if (shipmentsRes?.data?.length > 0) {
          const shipmentDetail = await getShipment(shipmentsRes.data[0].id)
          setShipment(shipmentDetail?.data)
        } else {
          setShipment(null)
        }
      } catch (e) {
        setShipment(null)
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
      // Small delay to ensure shipment is created before reloading
      await new Promise(resolve => setTimeout(resolve, 500))
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
            <div>
              <span className={`badge ${
                order.status === 'fulfilled' ? 'success' :
                order.status === 'processing' ? 'info' :
                order.status === 'canceled' ? 'danger' :
                'warn'
              }`}>
                {order.status === 'fulfilled' ? 'Ready to Ship' : order.status}
              </span>
            </div>
          </div>
          <div>
            <div className="label">Order Date</div>
            <div>{String(order.order_date).replace('T', ' ').replace('Z','')}</div>
          </div>
        </div>

        {/* Workflow Guide */}
        {order.status !== 'canceled' && !shipment && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 8
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8 }}>📋 Order Workflow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: order.status === 'pending' ? 'var(--primary-600)' : 'var(--gray-500)'
              }}>
                {order.status === 'pending' ? '🔵' : '✅'} Pending
              </div>
              <div>→</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: order.status === 'processing' ? 'var(--primary-600)' : order.status === 'fulfilled' ? 'var(--gray-500)' : 'var(--gray-400)'
              }}>
                {order.status === 'processing' ? '🔵' : order.status === 'fulfilled' ? '✅' : '⚪'} Processing
              </div>
              <div>→</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: order.status === 'fulfilled' ? 'var(--primary-600)' : 'var(--gray-400)'
              }}>
                {order.status === 'fulfilled' ? '🔵' : '⚪'} Ready to Ship
              </div>
              <div>→</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: shipment ? 'var(--success-600)' : 'var(--gray-400)'
              }}>
                {shipment ? '✅' : '⚪'} Shipment
              </div>
            </div>

            {/* Status-specific instructions */}
            {order.status === 'pending' && (
              <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                💡 <strong>Next:</strong> Click "Start Processing" when items arrive at warehouse
              </div>
            )}
            {order.status === 'processing' && (
              <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                💡 <strong>Next:</strong> Go to Inventory page → Assign items to warehouse shelves → Return here and click "Ready to Ship"
              </div>
            )}
            {order.status === 'fulfilled' && !shipment && (
              <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                💡 <strong>Next:</strong> Items are packed and ready! Click "Create Shipment" below to assign driver and vehicle
              </div>
            )}
          </div>
        )}

        {/* Context-Aware Action Buttons */}
        <div className="form-actions" style={{ marginTop: 12 }}>
          {order.status === 'pending' && (
            <>
              <button className="btn btn-primary" disabled={updating} onClick={() => setStatus('processing')}>
                📦 Start Processing
              </button>
              <button className="btn btn-danger" disabled={updating} onClick={() => setStatus('canceled')}>
                Cancel Order
              </button>
            </>
          )}

          {order.status === 'processing' && (
            <>
              <button className="btn btn-success" disabled={updating} onClick={() => setStatus('fulfilled')}>
                ✅ Ready to Ship
              </button>
              <button className="btn btn-outline" disabled={updating} onClick={() => setStatus('pending')}>
                ⏮️ Back to Pending
              </button>
              <button className="btn btn-danger" disabled={updating} onClick={() => setStatus('canceled')}>
                Cancel Order
              </button>
            </>
          )}

          {order.status === 'fulfilled' && !shipment && (
            <>
              <button className="btn btn-outline" disabled={updating} onClick={() => setStatus('processing')}>
                ⏮️ Back to Processing
              </button>
              <button className="btn btn-danger" disabled={updating} onClick={() => setStatus('canceled')}>
                Cancel Order
              </button>
            </>
          )}

          {order.status === 'canceled' && (
            <button className="btn" disabled={updating} onClick={() => setStatus('pending')}>
              🔄 Restore Order
            </button>
          )}
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
            order={order}
            onSubmit={handleCreateShipment}
            onCancel={() => setShowCreateShipment(false)}
            creating={creatingShipment}
          />
        )}
      </div>

      {/* Package Summary */}
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>📦 Package Information</h3>

        {order.quote_id ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
            <div>
              <div className="label">Weight</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                {order.weight ? `${order.weight} kg` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="label">Dimensions</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                {order.dimensions || 'N/A'}
              </div>
            </div>

            <div>
              <div className="label">Distance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                {order.distance ? `${order.distance} km` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="label">Shipping Cost</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--primary-600)' }}>
                {order.estimated_cost ? `₱${(order.estimated_cost / 100).toFixed(2)}` : 'N/A'}
              </div>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ padding: 16, background: 'var(--gray-50)', borderRadius: 8 }}>
            ℹ️ Package information not available. This order was not created from a quote.
          </div>
        )}

        {order.quote_id && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
            <div className="muted" style={{ fontSize: '0.875rem' }}>
              📋 Source: Quote Q-{String(order.quote_id).padStart(5, '0')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateShipmentForm({ order, onSubmit, onCancel, creating }) {
  const [formData, setFormData] = useState({
    transport_id: '',
    receiver_name: order.customer || '',
    receiver_contact: '',
    receiver_address: '', // Will be same as destination_address
    origin_name: '',
    origin_address: '',
    destination_name: '',
    destination_address: '',
    charges: order.estimated_cost ? Math.round(order.estimated_cost / 100) : '',
    departure_date: ''
  })
  const [transports, setTransports] = useState([])
  const [loadingTransports, setLoadingTransports] = useState(true)
  const [inventory, setInventory] = useState(null)

  useEffect(() => {
    async function loadData() {
      const orderId = order?.id || order?.order_id
      if (!orderId) return

      try {
        // Load transports
        const res = await getTransports()
        setTransports(res?.data || [])

        // Load inventory to get warehouse info
        try {
          const poNumber = `PO-${String(orderId).padStart(5, '0')}`
          const invRes = await apiGet(`/api/inventory?search=${poNumber}`)

          if (invRes?.data?.length > 0) {
            const inv = invRes.data[0]
            setInventory(inv)

            // Auto-populate origin from warehouse
            const newOriginName = inv.warehouse || ''
            const newOriginAddress = inv.warehouse && inv.location ? `${inv.warehouse} - ${inv.location}` : ''

            setFormData(prev => ({
              ...prev,
              origin_name: newOriginName,
              origin_address: newOriginAddress
            }))
          }
        } catch (e) {
          console.error('Failed to load inventory:', e)
        }
      } catch (e) {
        console.error('Failed to load transports:', e)
      } finally {
        setLoadingTransports(false)
      }
    }
    loadData()
  }, [order?.id, order?.order_id])

  const handleSubmit = (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.transport_id || !formData.receiver_name || !formData.charges || !formData.destination_address) {
      alert('Please fill in all required fields')
      return
    }

    // Capacity validation
    const selectedTransport = transports.find(t => t.id === parseInt(formData.transport_id))
    const packageWeight = order.weight || 0

    if (selectedTransport && packageWeight > 0) {
      const newLoad = selectedTransport.current_load + packageWeight
      const utilAfter = Math.round((newLoad / selectedTransport.capacity) * 100)

      // Block if would exceed capacity
      if (packageWeight > selectedTransport.available_capacity) {
        alert(`Cannot create shipment: Package weight (${packageWeight}kg) exceeds available vehicle capacity (${selectedTransport.available_capacity}kg).\n\nVehicle: ${selectedTransport.vehicle_id}\nCurrent load: ${selectedTransport.current_load}kg / ${selectedTransport.capacity}kg`)
        return
      }

      // Warn if would be over 90% capacity
      if (utilAfter >= 90) {
        if (!confirm(`Warning: This will load the vehicle to ${utilAfter}% capacity.\n\nVehicle: ${selectedTransport.vehicle_id}\nCurrent: ${selectedTransport.current_load}kg → After: ${newLoad}kg\nCapacity: ${selectedTransport.capacity}kg\n\nContinue anyway?`)) {
          return
        }
      }
    }

    // Validate departure date is not in the past
    if (formData.departure_date) {
      const selectedDate = new Date(formData.departure_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        alert('Departure date cannot be in the past')
        return
      }
    }

    // Warn if charges differ significantly from estimated cost
    if (order.estimated_cost) {
      const estimatedCharges = Math.round(order.estimated_cost / 100)
      const actualCharges = parseInt(formData.charges, 10)
      const difference = Math.abs(actualCharges - estimatedCharges)
      const percentDiff = (difference / estimatedCharges) * 100

      if (percentDiff > 20) {
        if (!confirm(`Warning: Shipping charges (₱${actualCharges}) differ significantly from estimated cost (₱${estimatedCharges}). Continue anyway?`)) {
          return
        }
      }
    }

    // Set receiver_address same as destination_address (they're the same thing)
    // Extract destination name from address (first line or "Delivery Address")
    const destinationName = formData.destination_address.split('\n')[0].split(',')[0] || 'Delivery Address'

    onSubmit({
      ...formData,
      receiver_address: formData.destination_address,
      destination_name: destinationName,
      charges: parseInt(formData.charges, 10)
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)' }}>
      <h4 style={{ marginTop: 0 }}>Create New Shipment</h4>

      <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
        {/* Section 1: Transport & Timing */}
        <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 6, border: '1px solid var(--gray-200)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
            🚚 Transport & Schedule
          </div>
          <div className="form-row">
            <label>
              <div className="label">Select Vehicle & Driver *</div>
              {loadingTransports ? (
                <div className="input" style={{ color: 'var(--gray-500)' }}>Loading vehicles...</div>
              ) : transports.length === 0 ? (
                <div>
                  <div className="input" style={{ color: 'var(--danger-600)' }}>No vehicles available</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--danger-600)', marginTop: 4 }}>
                    Please run database seeders: <code>php artisan db:seed</code>
                  </div>
                </div>
              ) : (
                <>
                  <select
                    className="input"
                    value={formData.transport_id}
                    onChange={(e) => handleInputChange('transport_id', e.target.value)}
                    required
                  >
                    <option value="">Select a vehicle...</option>
                    {transports
                      .sort((a, b) => (b.available_capacity || 0) - (a.available_capacity || 0))
                      .map(transport => {
                        const packageWeight = order.weight || 0
                        const wouldExceed = packageWeight > (transport.available_capacity || 0)
                        const utilAfterAdd = transport.capacity > 0
                          ? Math.round(((transport.current_load + packageWeight) / transport.capacity) * 100)
                          : 0

                        return (
                          <option
                            key={transport.id}
                            value={transport.id}
                            disabled={wouldExceed}
                          >
                            {transport.vehicle_id} ({transport.registration_number}) - {transport.driver_name} |
                            {transport.current_load}kg / {transport.capacity}kg ({transport.utilization_percent}%)
                            {wouldExceed ? ' - OVERLOAD!' : ` → ${utilAfterAdd}% after`}
                          </option>
                        )
                      })}
                  </select>
                  {formData.transport_id && (
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                      {(() => {
                        const selected = transports.find(t => t.id === parseInt(formData.transport_id))
                        if (!selected) return null
                        const packageWeight = order.weight || 0
                        const utilAfter = selected.capacity > 0
                          ? Math.round(((selected.current_load + packageWeight) / selected.capacity) * 100)
                          : 0
                        const color = utilAfter >= 90 ? 'var(--danger-600)' :
                                     utilAfter >= 70 ? 'var(--warning-600)' :
                                     'var(--success-600)'
                        return (
                          <div style={{ color }}>
                            📊 Vehicle will be at {utilAfter}% capacity after adding this package ({packageWeight}kg)
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </>
              )}
            </label>
            <label>
              <div className="label">Departure Date</div>
              <input
                className="input"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.departure_date}
                onChange={(e) => handleInputChange('departure_date', e.target.value)}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: 4 }}>
                📅 Earliest: Today
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Delivery Details */}
        <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 6, border: '1px solid var(--gray-200)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
            📍 Delivery Details
          </div>

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

          <label style={{ marginTop: 12 }}>
            <div className="label">Contact Number *</div>
            <input
              className="input"
              type="tel"
              placeholder="e.g. +63 912 345 6789"
              value={formData.receiver_contact}
              onChange={(e) => handleInputChange('receiver_contact', e.target.value)}
              required
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: 4 }}>
              📞 Driver will use this to contact receiver for delivery
            </div>
          </label>

          <label style={{ marginTop: 12 }}>
            <div className="label">Origin (Pickup Location)</div>
            <input
              className="input"
              value={formData.origin_name}
              onChange={(e) => handleInputChange('origin_name', e.target.value)}
              placeholder="Warehouse name"
            />
            {inventory && (
              <div style={{ fontSize: '0.75rem', color: 'var(--success-600)', marginTop: 4 }}>
                📦 Package stored at: {inventory.warehouse}
              </div>
            )}
          </label>

          <label style={{ marginTop: 12 }}>
            <div className="label">Destination Address *</div>
            <textarea
              className="input"
              placeholder="Full delivery address (street, city, postal code)"
              value={formData.destination_address}
              onChange={(e) => handleInputChange('destination_address', e.target.value)}
              required
              rows="3"
            />
          </label>
        </div>

        {/* Section 3: Pricing */}
        <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 6, border: '1px solid var(--gray-200)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
            💰 Shipping Charges
          </div>
          <label>
            <div className="label">Charges (PHP) *</div>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="e.g. 1500"
              value={formData.charges}
              onChange={(e) => handleInputChange('charges', e.target.value)}
              required
            />
            {order.estimated_cost && (
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: 4 }}>
                💡 Estimated from quote: ₱{Math.round(order.estimated_cost / 100)}
              </div>
            )}
          </label>
        </div>

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