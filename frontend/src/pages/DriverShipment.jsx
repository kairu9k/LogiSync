import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../lib/api'

export default function DriverShipment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Shipment Details - LogiSync'

    // Check if driver is logged in
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      navigate('/driver/login')
      return
    }

    try {
      const parsedDriver = JSON.parse(driverData)
      setDriver(parsedDriver)
      loadShipment(parsedDriver.id)
    } catch (e) {
      navigate('/driver/login')
    }
  }, [navigate, id])

  const loadShipment = async (driverId) => {
    setLoading(true)
    setError('')

    try {
      const response = await apiGet(`/api/driver/shipments/${id}?driver_id=${driverId}`)
      setShipment(response?.data)
    } catch (e) {
      setError(e.message || 'Failed to load shipment details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'in_transit': return 'status-transit'
      case 'out_for_delivery': return 'status-delivery'
      case 'delivered': return 'status-delivered'
      default: return 'status-default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '📦'
      case 'in_transit': return '🚛'
      case 'out_for_delivery': return '🚚'
      case 'delivered': return '✅'
      default: return '📋'
    }
  }


  if (loading) {
    return (
      <div className="driver-container">
        <div className="driver-loading">
          <div className="loading-spinner">🔄</div>
          <p>Loading shipment...</p>
        </div>
      </div>
    )
  }

  if (error || !shipment) {
    return (
      <div className="driver-container">
        <div className="driver-error">
          ⚠️ {error || 'Shipment not found'}
          <div className="driver-actions">
            <button
              className="driver-btn driver-btn-outline"
              onClick={() => navigate('/driver/dashboard')}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="driver-container">
      <header className="driver-header">
        <div className="driver-header-content">
          <button
            className="driver-btn driver-btn-outline"
            onClick={() => navigate('/driver/dashboard')}
          >
            ← Back
          </button>
          <div>
            <h1>Shipment Details</h1>
            <p>{shipment.tracking_number}</p>
          </div>
        </div>
      </header>

      <div className="driver-content">
        <div className="shipment-detail-card">
          <div className="detail-header">
            <div className={`detail-status ${getStatusColor(shipment.status)}`}>
              {getStatusIcon(shipment.status)} {shipment.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <div className="detail-section">
            <h3>📦 Shipment Details</h3>
            <div className="detail-info">
              <div className="info-row">
                <span className="info-label">Customer:</span>
                <span className="info-value">{shipment.customer}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Departure Date:</span>
                <span className="info-value">{new Date(shipment.departure_date).toLocaleDateString()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Vehicle:</span>
                <span className="info-value">{shipment.vehicle}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>📍 Pickup & Delivery</h3>
            <div className="detail-info">
              <div className="info-row">
                <span className="info-label">Pickup From:</span>
                <span className="info-value">{shipment.origin_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Pickup Address:</span>
                <span className="info-value">{shipment.origin_address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Deliver To:</span>
                <span className="info-value">{shipment.receiver_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Contact Number:</span>
                <span className="info-value">
                  {shipment.receiver_contact !== 'N/A' ? (
                    <a href={`tel:${shipment.receiver_contact}`} style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>
                      📞 {shipment.receiver_contact}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Delivery Address:</span>
                <span className="info-value">{shipment.destination_address}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>📦 Package Information</h3>
            <div className="detail-info">
              <div className="info-row">
                <span className="info-label">Weight:</span>
                <span className="info-value">{shipment.weight}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Dimensions:</span>
                <span className="info-value">{shipment.dimensions}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Distance:</span>
                <span className="info-value">{shipment.distance}</span>
              </div>
            </div>
          </div>

          {shipment.recent_updates && shipment.recent_updates.length > 0 && (
            <div className="detail-section">
              <h3>📋 Recent Updates</h3>
              <div className="updates-list">
                {shipment.recent_updates.slice(0, 3).map((update, index) => (
                  <div key={index} className="update-item">
                    <div className="update-time">
                      {new Date(update.timestamp).toLocaleString()}
                    </div>
                    <div className="update-location">{update.location}</div>
                    <div className="update-details">{update.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}