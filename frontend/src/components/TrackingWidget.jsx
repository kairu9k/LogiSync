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
      case 'picked_up': return 'badge success'
      case 'pending': return 'badge warn'
      case 'exception': case 'delivery_attempted': return 'badge danger'
      case 'cancelled': return 'badge danger'
      default: return 'badge'
    }
  }

  const getStatusProgress = (status) => {
    switch (status) {
      case 'pending': return 20
      case 'picked_up': return 40
      case 'in_transit': return 60
      case 'out_for_delivery': return 80
      case 'delivered': return 100
      case 'exception': return 50
      case 'delivery_attempted': return 75
      case 'cancelled': return 0
      default: return 0
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return '#10b981'
      case 'out_for_delivery': return '#8b5cf6'
      case 'in_transit': return '#3b82f6'
      case 'picked_up': return '#10b981'
      case 'pending': return '#f59e0b'
      case 'exception': case 'delivery_attempted': return '#ef4444'
      case 'cancelled': return '#ef4444'
      default: return '#9ca3af'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return '✅'
      case 'out_for_delivery': return '🚚'
      case 'in_transit': return '🚛'
      case 'picked_up': return '📦'
      case 'pending': return '⏳'
      case 'exception': return '⚠️'
      case 'delivery_attempted': return '🔄'
      case 'cancelled': return '❌'
      default: return '📍'
    }
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '40px',
      maxWidth: '800px',
      margin: '0 auto',
      border: '2px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '32px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Track Your Package
        </h2>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
          Enter your tracking number to see real-time updates
        </p>
      </div>

      <form onSubmit={handleTrackShipment} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Enter tracking number (e.g. TRK-123456)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            style={{
              flex: 1,
              padding: '16px 20px',
              fontSize: '16px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: 'monospace',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#60a5fa'
              e.target.style.boxShadow = '0 0 0 4px rgba(96, 165, 250, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading || !trackingNumber.trim()}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              borderRadius: '12px',
              background: loading || !trackingNumber.trim() ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              cursor: loading || !trackingNumber.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading || !trackingNumber.trim() ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={(e) => {
              if (!loading && trackingNumber.trim()) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              if (!loading && trackingNumber.trim()) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
              }
            }}
          >
            {loading ? '🔍 Tracking...' : '🔍 Track'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          padding: '20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#ef4444',
          fontSize: '15px',
          fontWeight: '600',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>❌</span>
          <span>{error}</span>
        </div>
      )}

      {trackingResult && (
        <div>
          {/* Status Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tracking Number
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: 'white' }}>
                {trackingResult.tracking_id}
              </div>
            </div>

            {/* Current Status Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '12px',
              background: `${getStatusColor(trackingResult.current_status)}15`,
              border: `2px solid ${getStatusColor(trackingResult.current_status)}40`,
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '20px' }}>{getStatusIcon(trackingResult.current_status)}</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '800',
                color: getStatusColor(trackingResult.current_status),
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {trackingResult.current_status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#e5e7eb',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getStatusProgress(trackingResult.current_status)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getStatusColor(trackingResult.current_status)}, ${getStatusColor(trackingResult.current_status)}dd)`,
                  borderRadius: '999px',
                  transition: 'width 0.5s ease',
                  boxShadow: `0 0 12px ${getStatusColor(trackingResult.current_status)}60`
                }} />
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                {getStatusProgress(trackingResult.current_status)}% Complete
              </div>
            </div>

            {/* Package Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>
                  👤 Recipient
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  {trackingResult.receiver_name}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>
                  📍 Destination
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  {trackingResult.destination}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>
                  🚛 Driver
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  {trackingResult.driver}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>
                  🚗 Vehicle
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  {trackingResult.vehicle}
                </div>
              </div>
            </div>
          </div>

          {/* Tracking History Timeline */}
          {trackingResult.tracking_history?.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: '20px',
                fontWeight: '800',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📜</span>
                <span>Tracking History</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trackingResult.tracking_history.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderLeft: `4px solid ${getStatusColor(item.status)}`,
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>{getStatusIcon(item.status)}</span>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            color: getStatusColor(item.status),
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            {item.status.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>
                            {item.location}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textAlign: 'right',
                        fontWeight: '600'
                      }}>
                        <div>{new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    {item.details && (
                      <div style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: '1.6',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        marginTop: '8px'
                      }}>
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
