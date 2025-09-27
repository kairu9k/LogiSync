import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShipments, updateShipmentStatus, trackShipment } from '../../lib/api'

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('any')
  const [updating, setUpdating] = useState(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingResult, setTrackingResult] = useState(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const navigate = useNavigate()

  async function fetchShipments(params = {}) {
    setLoading(true)
    setError('')
    try {
      const res = await getShipments(params)
      // Sort shipments: put delivered shipments last
      const sortedData = (res?.data || []).sort((a, b) => {
        if (a.status === 'delivered' && b.status !== 'delivered') return 1
        if (a.status !== 'delivered' && b.status === 'delivered') return -1
        return 0
      })
      setShipments(sortedData)
    } catch (e) {
      setError(e.message || 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShipments({ q, status })
  }, [q, status])

  async function handleStatusUpdate(shipmentId, newStatus, location, details = '') {
    try {
      setUpdating(shipmentId)
      await updateShipmentStatus(shipmentId, {
        status: newStatus,
        location,
        details
      })
      await fetchShipments({ q, status })
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  async function handleTrackShipment() {
    if (!trackingNumber.trim()) return

    setTrackingLoading(true)
    try {
      const res = await trackShipment(trackingNumber.trim())
      setTrackingResult(res?.data)
    } catch (e) {
      setTrackingResult(null)
      alert(e.message || 'Tracking number not found')
    } finally {
      setTrackingLoading(false)
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

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Shipments</h2>
        <div className="form-row">
          <input
            className="input"
            placeholder="Search tracking # or customer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="any">Status: Any</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Track Shipment</h3>
        <div className="form-row">
          <input
            className="input"
            placeholder="Enter tracking number (e.g. LS2024001)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={handleTrackShipment}
            disabled={trackingLoading || !trackingNumber.trim()}
          >
            {trackingLoading ? 'Tracking...' : 'Track'}
          </button>
        </div>

        {trackingResult && (
          <div className="card" style={{ marginTop: 12, padding: 16, backgroundColor: 'var(--gray-50)' }}>
            <h4 style={{ marginTop: 0 }}>Tracking: {trackingResult.tracking_number}</h4>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              <div>
                <div className="label">Receiver</div>
                <div>{trackingResult.receiver_name}</div>
              </div>
              <div>
                <div className="label">Current Status</div>
                <div><span className={getStatusBadgeClass(trackingResult.current_status)}>{trackingResult.current_status}</span></div>
              </div>
              <div>
                <div className="label">Destination</div>
                <div>{trackingResult.destination}</div>
              </div>
              <div>
                <div className="label">Driver</div>
                <div>{trackingResult.driver}</div>
              </div>
            </div>

            {trackingResult.tracking_history?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="label">Tracking History</div>
                <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                  {trackingResult.tracking_history.map((item, index) => (
                    <div key={index} style={{ padding: 8, border: '1px solid var(--gray-200)', borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                        <span className="muted" style={{ fontSize: '0.875rem' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontWeight: 'bold', marginTop: 4 }}>{item.location}</div>
                      {item.details && <div className="muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>{item.details}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <div className="card" style={{ padding: 16 }}>Loading shipments…</div>}
      {error && <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {shipments.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                padding: 16,
                position: 'relative',
                opacity: s.status === 'delivered' ? 0.6 : 1,
                overflow: 'hidden'
              }}
            >
              {s.status === 'delivered' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-25deg)',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'var(--success-300)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  userSelect: 'none'
                }}>
                  ✓ DELIVERED
                </div>
              )}
              <button
                className="btn btn-outline"
                onClick={() => navigate(`/app/shipments/${s.id}`)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  zIndex: 2
                }}
              >
                View Details
              </button>
              <div className="muted">{s.tracking_number}</div>
              <div><strong>{s.receiver}</strong></div>
              <div>Customer: {s.customer}</div>
              <div>Driver: {s.driver}</div>
              <div>Vehicle: {s.vehicle}</div>
              <div>
                Status: <span className={getStatusBadgeClass(s.status)}>{s.status}</span>
              </div>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Created: {new Date(s.creation_date).toLocaleDateString()}
                {s.departure_date && ` • Departure: ${new Date(s.departure_date).toLocaleDateString()}`}
              </div>

              {/* Status Update Form - only show for shipments that can be updated */}
              {!['delivered', 'cancelled'].includes(s.status) ? (
                <StatusUpdateForm
                  shipment={s}
                  onUpdate={handleStatusUpdate}
                  updating={updating === s.id}
                />
              ) : (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--gray-200)',
                  textAlign: 'center'
                }}>
                  <div className={`badge ${s.status === 'delivered' ? 'success' : 'danger'}`} style={{ fontSize: '14px' }}>
                    {s.status === 'delivered' ? '✓ Shipment Completed' : '✗ Shipment Cancelled'}
                  </div>
                  <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                    No further status updates available
                  </div>
                </div>
              )}
            </div>
          ))}

          {shipments.length === 0 && (
            <div className="card" style={{ padding: 16 }}>
              No shipments found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusUpdateForm({ shipment, onUpdate, updating }) {
  const [newStatus, setNewStatus] = useState('')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!newStatus || !location) return

    onUpdate(shipment.id, newStatus, location, details)
    setNewStatus('')
    setLocation('')
    setDetails('')
  }

  // Define logical status progressions
  const getAvailableStatuses = (currentStatus) => {
    const statusOptions = []

    switch (currentStatus) {
      case 'pending':
        statusOptions.push(
          { value: 'in_transit', label: 'In Transit' },
          { value: 'cancelled', label: 'Cancel Shipment' }
        )
        break
      case 'in_transit':
        statusOptions.push(
          { value: 'out_for_delivery', label: 'Out for Delivery' },
          { value: 'delivered', label: 'Mark as Delivered' }
        )
        break
      case 'out_for_delivery':
        statusOptions.push(
          { value: 'delivered', label: 'Mark as Delivered' },
          { value: 'in_transit', label: 'Return to Transit' }
        )
        break
      default:
        // For any other status, allow all transitions
        statusOptions.push(
          { value: 'pending', label: 'Pending' },
          { value: 'in_transit', label: 'In Transit' },
          { value: 'out_for_delivery', label: 'Out for Delivery' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'cancelled', label: 'Cancelled' }
        )
    }

    return statusOptions
  }

  const availableStatuses = getAvailableStatuses(shipment.status)

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
      <div className="grid" style={{ gap: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <div className="label">Current Status:
            <span className={`badge ${
              shipment.status === 'delivered' ? 'success' :
              shipment.status === 'out_for_delivery' ? 'warn' :
              shipment.status === 'in_transit' ? 'info' : ''
            }`} style={{ marginLeft: 4 }}>
              {shipment.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="form-row">
          <select
            className="input"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            required
          >
            <option value="">Select next status…</option>
            {availableStatuses.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Current location"
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
        <button
          className="btn btn-primary"
          type="submit"
          disabled={updating || !newStatus || !location}
        >
          {updating ? 'Updating Status...' : 'Update Status'}
        </button>
      </div>
    </form>
  )
}