import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShipments, updateShipmentStatus } from '../../lib/api'
import * as Ably from 'ably'

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

  // Real-time updates via Ably
  useEffect(() => {
    // Get organization_id from auth data
    let organizationId = null
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        organizationId = parsed.user?.organization_id
      }
    } catch (e) {
      console.error('Failed to parse auth data:', e)
    }

    console.log('Setting up Ably subscription for organization:', organizationId)

    if (!organizationId) {
      console.warn('No organization_id found, skipping Ably subscription')
      return
    }

    // Connect to Ably
    const ably = new Ably.Realtime({
      key: import.meta.env.VITE_ABLY_KEY,
    })

    ably.connection.on('connected', () => {
      console.log('✅ Ably connected successfully')
    })

    ably.connection.on('failed', () => {
      console.error('❌ Ably connection failed')
    })

    // Subscribe to organization channel for shipment updates
    // Using public channel for now (TODO: implement auth for private channels)
    const channelName = `public:organization.${organizationId}`
    console.log('📡 Subscribing to channel:', channelName)
    const channel = ably.channels.get(channelName)

    channel.subscribe('shipment.status.updated', (message) => {
      console.log('Shipment status updated in real-time:', message.data)

      // Update the shipment in the list
      setShipments((prevShipments) => {
        const updated = prevShipments.map((shipment) => {
          if (shipment.id === message.data.shipment_id) {
            console.log(`✅ Updating shipment ${shipment.id} from ${shipment.status} to ${message.data.new_status}`)
            return {
              ...shipment,
              status: message.data.new_status,
            }
          }
          return shipment
        })

        // Re-sort: delivered shipments go last
        return updated.sort((a, b) => {
          if (a.status === 'delivered' && b.status !== 'delivered') return 1
          if (a.status !== 'delivered' && b.status === 'delivered') return -1
          return 0
        })
      })

      // Show a toast notification (optional)
      console.log(`📦 Shipment ${message.data.tracking_number} is now ${message.data.new_status}`)
    })

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
      ably.close()
    }
  }, [])

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
      case 'picked_up': return 'badge success'
      case 'in_transit': case 'out_for_delivery': return 'badge info'
      case 'pending': return 'badge warn'
      case 'cancelled': return 'badge danger'
      default: return 'badge'
    }
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(249, 115, 22, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              📦 Shipment Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Track and manage all shipments in real-time
            </p>
          </div>
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
            placeholder="Search tracking # or customer..."
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
              e.target.style.borderColor = '#f97316'
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'
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
            e.target.style.borderColor = '#f97316'
            e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="any">Status: Any</option>
          <option value="pending">Pending</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
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
          Loading shipments…
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
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {shipments.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '20px',
                position: 'relative',
                opacity: s.status === 'delivered' ? 0.7 : 1,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (s.status !== 'delivered') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                }
              }}
              onMouseOut={(e) => {
                if (s.status !== 'delivered') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {s.status === 'delivered' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-25deg)',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#10b981',
                  opacity: 0.3,
                  pointerEvents: 'none',
                  zIndex: 1,
                  userSelect: 'none',
                  textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                }}>
                  ✓ DELIVERED
                </div>
              )}
              <button
                onClick={() => navigate(`/app/shipments/${s.id}`)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  padding: '8px 16px',
                  fontSize: '13px',
                  zIndex: 2,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                View Details →
              </button>

              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '4px',
                  fontWeight: '500'
                }}>
                  Tracking Number
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#f97316',
                  fontFamily: 'monospace'
                }}>
                  {s.tracking_number}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Receiver: </span>
                  <span style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px' }}>{s.receiver}</span>
                </div>
                {s.customer && s.customer !== s.receiver && (
                  <div>
                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Ordered by: </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px' }}>{s.customer}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Driver: </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px' }}>{s.driver}</span>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Vehicle: </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px' }}>{s.vehicle}</span>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginRight: '8px' }}>Status:</span>
                <span className={getStatusBadgeClass(s.status)} style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {s.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {s.status === 'pending' && s.origin_name && (
                <div style={{
                  marginTop: 12,
                  padding: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#f59e0b',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    📍 Current Location (Warehouse Origin)
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.95)'
                  }}>
                    {s.origin_name}
                  </div>
                  {s.origin_address && (
                    <div style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      {s.origin_address}
                    </div>
                  )}
                </div>
              )}

              <div style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
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
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'inline-block',
                    background: s.status === 'delivered'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white'
                  }}>
                    {s.status === 'delivered' ? '✓ Shipment Completed' : '✗ Shipment Cancelled'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    marginTop: '8px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    No further status updates available
                  </div>
                </div>
              )}
            </div>
          ))}

          {shipments.length === 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                No shipments found
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
          { value: 'picked_up', label: 'Picked Up' },
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
    <form onSubmit={handleSubmit} style={{
      marginTop: 16,
      paddingTop: 16,
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div className="grid" style={{ gap: 12 }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '6px',
            fontWeight: '500'
          }}>
            Current Status:
            <span style={{
              marginLeft: 8,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              background: shipment.status === 'delivered' || shipment.status === 'picked_up'
                ? 'rgba(16, 185, 129, 0.2)'
                : shipment.status === 'out_for_delivery' || shipment.status === 'in_transit'
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(245, 158, 11, 0.2)',
              color: shipment.status === 'delivered' || shipment.status === 'picked_up'
                ? '#10b981'
                : shipment.status === 'out_for_delivery' || shipment.status === 'in_transit'
                ? '#3b82f6'
                : '#f59e0b'
            }}>
              {shipment.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <select
            className="input"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            required
            style={{
              borderRadius: '10px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '13px',
              padding: '10px 12px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f97316'
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              e.target.style.boxShadow = 'none'
            }}
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
            style={{
              borderRadius: '10px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '13px',
              padding: '10px 12px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f97316'
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <label style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 8,
              display: 'block',
              fontWeight: '500'
            }}>
              Quick details:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {smartSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: details === suggestion.value ? '#f97316' : 'rgba(255, 255, 255, 0.2)',
                    background: details === suggestion.value ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: details === suggestion.value ? '#f97316' : 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    if (details !== suggestion.value) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (details !== suggestion.value) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    }
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
          <div style={{
            marginTop: 8,
            padding: 14,
            background: 'rgba(249, 115, 22, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 10,
            border: '1px solid rgba(249, 115, 22, 0.3)'
          }}>
            <label style={{
              fontSize: '12px',
              color: '#f97316',
              marginBottom: 8,
              display: 'block',
              fontWeight: '600'
            }}>
              Enter recipient name:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Full name"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '13px',
                  padding: '8px 12px'
                }}
              />
              <button
                type="button"
                onClick={handleSignatureSubmit}
                disabled={!signatureName.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: !signatureName.trim() ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: !signatureName.trim() ? 'not-allowed' : 'pointer',
                  opacity: !signatureName.trim() ? 0.5 : 1
                }}
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignatureInput(false)
                  setSignatureName('')
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
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
          style={{
            borderRadius: '10px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '13px',
            padding: '10px 12px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#f97316'
            e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            e.target.style.boxShadow = 'none'
          }}
        />

        <button
          type="submit"
          disabled={updating || !newStatus || !location}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: (updating || !newStatus || !location)
              ? 'rgba(255, 255, 255, 0.1)'
              : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: (updating || !newStatus || !location) ? 'not-allowed' : 'pointer',
            opacity: (updating || !newStatus || !location) ? 0.5 : 1,
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            if (!updating && newStatus && location) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.4)'
            }
          }}
          onMouseOut={(e) => {
            if (!updating && newStatus && location) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          {updating ? 'Updating Status...' : '📤 Update Status'}
        </button>
      </div>
    </form>
  )
}