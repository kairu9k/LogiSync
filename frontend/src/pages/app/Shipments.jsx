import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShipments, updateShipmentStatus } from '../../lib/api'

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('any')
  const [updating, setUpdating] = useState(null)
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
              <div><strong>Customer: {s.receiver}</strong></div>
              <div>Prepared by: {s.customer}</div>
              <div>Driver: {s.driver}</div>
              <div>Vehicle: {s.vehicle}</div>
              <div>
                Status: <span className={getStatusBadgeClass(s.status)}>{s.status}</span>
              </div>
              {s.status === 'pending' && s.origin_name && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface-100)',
                  borderRadius: '6px',
                  borderLeft: '3px solid var(--warn-500)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--warn-700)', marginBottom: '4px' }}>
                    📍 Current Location (Warehouse Origin)
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{s.origin_name}</div>
                  {s.origin_address && (
                    <div className="muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>{s.origin_address}</div>
                  )}
                </div>
              )}
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
  // Pre-fill location with origin for pending shipments
  const [location, setLocation] = useState(
    shipment.status === 'pending' && shipment.origin_name
      ? shipment.origin_name
      : ''
  )
  const [details, setDetails] = useState('')
  const [showSignatureInput, setShowSignatureInput] = useState(false)
  const [signatureName, setSignatureName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!newStatus || !location) return

    onUpdate(shipment.id, newStatus, location, details)
    setNewStatus('')
    setLocation('')
    setDetails('')
    setShowSignatureInput(false)
    setSignatureName('')
  }

  // Get smart suggestions based on selected next status
  const getSmartSuggestions = (statusValue) => {
    switch (statusValue) {
      case 'in_transit':
        return [
          { label: '✓ On schedule', value: 'On schedule' },
          { label: '⏱️ Minor delay', value: 'Minor delay (10-30 mins)' },
          { label: '🚗 Traffic delay', value: 'Traffic delay' },
          { label: '🌧️ Weather delay', value: 'Weather delay' }
        ]
      case 'out_for_delivery':
        return [
          { label: '📍 First attempt', value: 'First delivery attempt' },
          { label: '📞 Customer called ahead', value: 'Customer notified, delivering now' },
          { label: '🚚 Delivering now', value: 'Out for delivery' }
        ]
      case 'delivered':
        return [
          { label: '🚪 Left at door', value: 'Left at door' },
          { label: '🤝 Handed to customer', value: 'Handed to customer' },
          { label: '🏢 Left with security', value: 'Left with security/reception' },
          { label: '✍️ Signed by...', value: 'signature', special: true }
        ]
      case 'cancelled':
        return [
          { label: '👤 Customer request', value: 'Cancelled by customer request' },
          { label: '📍 Address invalid', value: 'Invalid or incomplete address' },
          { label: '💳 Payment issue', value: 'Payment issue' },
          { label: '📦 Item unavailable', value: 'Item unavailable' }
        ]
      default:
        return []
    }
  }

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.special && suggestion.value === 'signature') {
      setShowSignatureInput(true)
      setDetails('')
    } else {
      setDetails(suggestion.value)
      setShowSignatureInput(false)
    }
  }

  const handleSignatureSubmit = () => {
    if (signatureName.trim()) {
      setDetails(`Signed by: ${signatureName.trim()}`)
      setShowSignatureInput(false)
    }
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
  const smartSuggestions = newStatus ? getSmartSuggestions(newStatus) : []

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

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <label className="label" style={{ fontSize: '0.875rem', marginBottom: 6, display: 'block' }}>
              Quick details:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {smartSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="btn btn-outline"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.813rem',
                    backgroundColor: details === suggestion.value ? 'var(--primary-100)' : 'transparent',
                    borderColor: details === suggestion.value ? 'var(--primary-500)' : 'var(--border)',
                    color: details === suggestion.value ? 'var(--primary-700)' : 'inherit'
                  }}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Signature Input */}
        {showSignatureInput && (
          <div style={{ marginTop: 8, padding: 12, backgroundColor: 'var(--surface-100)', borderRadius: 8 }}>
            <label className="label" style={{ fontSize: '0.875rem', marginBottom: 6 }}>
              Enter recipient name:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Full name"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSignatureSubmit}
                disabled={!signatureName.trim()}
              >
                Set
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowSignatureInput(false)
                  setSignatureName('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Manual Details Input */}
        <input
          className="input"
          placeholder="Additional details (optional, or use quick buttons above)"
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