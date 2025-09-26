import { useState } from 'react'
import { trackShipment } from '../lib/api'

export default function TrackingWidget() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingResult, setTrackingResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrackShipment = async (e) => {
    e.preventDefault()
    if (!trackingNumber.trim()) return

    setLoading(true)
    setError('')
    setTrackingResult(null)

    try {
      const res = await trackShipment(trackingNumber.trim())
      setTrackingResult(res?.data)
    } catch (e) {
      setError(e.message || 'Tracking number not found')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'delivered': return 'badge success'
      case 'in_transit': case 'out_for_delivery': return 'badge info'
      case 'pending': return 'badge warn'
      case 'cancelled': return 'badge danger'
      default: return 'badge'
    }
  }

  const getStatusProgress = (status) => {
    switch (status) {
      case 'pending': return 25
      case 'in_transit': return 50
      case 'out_for_delivery': return 75
      case 'delivered': return 100
      case 'cancelled': return 0
      default: return 0
    }
  }

  return (
    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center' }}>Track Your Shipment</h2>

      <form onSubmit={handleTrackShipment} style={{ marginBottom: 24 }}>
        <div className="form-row">
          <input
            className="input"
            type="text"
            placeholder="Enter tracking number (e.g. LS2024001)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !trackingNumber.trim()}
          >
            {loading ? 'Tracking...' : 'Track Package'}
          </button>
        </div>
      </form>

      {error && (
        <div className="card" style={{
          padding: 16,
          backgroundColor: 'var(--danger-50)',
          color: 'var(--danger-600)',
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {trackingResult && (
        <div>
          <div className="card" style={{
            padding: 16,
            backgroundColor: 'var(--gray-50)',
            marginBottom: 16
          }}>
            <h3 style={{ marginTop: 0 }}>Tracking: {trackingResult.tracking_number}</h3>

            {/* Progress Bar */}
            <div style={{ marginBottom: 16 }}>
              <div className="label">Delivery Progress</div>
              <div style={{
                width: '100%',
                height: 8,
                backgroundColor: 'var(--gray-200)',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getStatusProgress(trackingResult.current_status)}%`,
                  height: '100%',
                  backgroundColor: trackingResult.current_status === 'delivered' ? 'var(--success-500)' : 'var(--info-500)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <span className={getStatusBadgeClass(trackingResult.current_status)}>
                  {trackingResult.current_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              <div>
                <div className="label">Recipient</div>
                <div>{trackingResult.receiver_name}</div>
              </div>
              <div>
                <div className="label">Destination</div>
                <div>{trackingResult.destination}</div>
              </div>
              <div>
                <div className="label">Driver</div>
                <div>{trackingResult.driver}</div>
              </div>
              <div>
                <div className="label">Vehicle</div>
                <div>{trackingResult.vehicle}</div>
              </div>
            </div>
          </div>

          {trackingResult.tracking_history?.length > 0 && (
            <div>
              <h4>Tracking History</h4>
              <div className="grid" style={{ gap: 12 }}>
                {trackingResult.tracking_history.map((item, index) => (
                  <div
                    key={index}
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
      )}
    </div>
  )
}