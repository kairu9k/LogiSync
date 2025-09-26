import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getShipment, updateShipmentStatus } from '../../lib/api'

export default function ShipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await getShipment(id)
      setShipment(res?.data)
    } catch (e) {
      setError(e.message || 'Failed to load shipment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleStatusUpdate(newStatus, location, details = '') {
    try {
      setUpdating(true)
      await updateShipmentStatus(id, {
        status: newStatus,
        location,
        details
      })
      await load()
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'delivered': return 'badge success'
      case 'in_transit': case 'out_for_delivery': return 'badge info'
      case 'pending': return 'badge warn'
      case 'cancelled': return 'badge danger'
      default: return 'badge'
    }
  }

  if (loading) return <div className="card" style={{ padding: 16 }}>Loading…</div>
  if (error) return <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
  if (!shipment) return null

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Shipment {shipment.tracking_number}</h2>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
          <div>
            <div className="label">Tracking Number</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.1em' }}>{shipment.tracking_number}</div>
          </div>
          <div>
            <div className="label">Status</div>
            <div>
              <span className={getStatusBadgeClass(shipment.status)}>{shipment.status}</span>
            </div>
          </div>
          <div>
            <div className="label">Creation Date</div>
            <div>{new Date(shipment.creation_date).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="label">Receiver</div>
            <div>{shipment.receiver_name}</div>
          </div>
          <div>
            <div className="label">Customer</div>
            <div>{shipment.customer}</div>
          </div>
          <div>
            <div className="label">Driver</div>
            <div>{shipment.driver}</div>
          </div>
          <div>
            <div className="label">Vehicle</div>
            <div>{shipment.vehicle} ({shipment.vehicle_type})</div>
          </div>
          <div>
            <div className="label">Charges</div>
            <div>₱{shipment.charges?.toLocaleString()}</div>
          </div>
          <div>
            <div className="label">Departure Date</div>
            <div>{shipment.departure_date ? new Date(shipment.departure_date).toLocaleDateString() : 'Not set'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Addresses</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          <div>
            <div className="label">Origin</div>
            <div><strong>{shipment.origin_name}</strong></div>
            <div className="muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
              {shipment.origin_address}
            </div>
          </div>
          <div>
            <div className="label">Destination</div>
            <div><strong>{shipment.destination_name}</strong></div>
            <div className="muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
              {shipment.destination_address}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="label">Receiver Address</div>
          <div className="muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
            {shipment.receiver_address}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Update Status</h3>
        <StatusUpdateForm
          onUpdate={handleStatusUpdate}
          updating={updating}
        />
      </div>

      {shipment.tracking_history?.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Tracking History</h3>
          <div className="grid" style={{ gap: 12 }}>
            {shipment.tracking_history.map((item, index) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: 12,
                  borderLeft: `4px solid ${
                    item.status === 'delivered' ? 'var(--success-500)' :
                    item.status === 'in_transit' || item.status === 'out_for_delivery' ? 'var(--info-500)' :
                    item.status === 'pending' ? 'var(--warning-500)' : 'var(--danger-500)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span className={getStatusBadgeClass(item.status)}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <div style={{ fontWeight: 'bold', marginTop: 4 }}>{item.location}</div>
                  </div>
                  <div className="muted" style={{ fontSize: '0.875rem', textAlign: 'right' }}>
                    {new Date(item.timestamp).toLocaleDateString()}<br />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {item.details && (
                  <div className="muted" style={{ fontSize: '0.875rem' }}>
                    {item.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusUpdateForm({ onUpdate, updating }) {
  const [newStatus, setNewStatus] = useState('')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!newStatus || !location) return

    onUpdate(newStatus, location, details)
    setNewStatus('')
    setLocation('')
    setDetails('')
  }

  return (
    <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
      <div className="form-row">
        <select
          className="input"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          required
        >
          <option value="">Select new status…</option>
          <option value="pending">Pending</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          className="input"
          placeholder="Current location *"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>
      <input
        className="input"
        placeholder="Additional details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <div className="form-actions">
        <button
          className="btn btn-primary"
          type="submit"
          disabled={updating || !newStatus || !location}
        >
          {updating ? 'Updating...' : 'Update Status'}
        </button>
      </div>
    </form>
  )
}