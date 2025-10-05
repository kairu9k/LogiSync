import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../lib/api'

export default function DriverShipment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)

  // GPS Tracking state
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const trackingIntervalRef = useRef(null)
  const watchIdRef = useRef(null)

  useEffect(() => {
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

  const handleStatusUpdate = async (status, location, notes) => {
    if (!driver || !shipment) return

    setUpdating(true)

    try {
      await apiPatch(`/api/driver/shipments/${id}/status`, {
        status,
        location,
        notes,
        driver_id: driver.id
      })

      // Reload shipment data
      await loadShipment(driver.id)
      setShowStatusUpdate(false)
    } catch (e) {
      alert('Failed to update status: ' + (e.message || 'Unknown error'))
    } finally {
      setUpdating(false)
    }
  }

  // GPS Tracking Functions
  const sendGPSLocation = async (position) => {
    if (!driver || !shipment) return

    const { latitude, longitude, speed, accuracy } = position.coords

    try {
      await apiPost(`/api/shipments/${id}/location`, {
        latitude,
        longitude,
        speed: speed || 0,
        accuracy: accuracy || 0,
        driver_id: driver.id
      })

      setCurrentLocation({
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toLocaleTimeString()
      })

      console.log('GPS location sent:', { latitude, longitude })
    } catch (e) {
      console.error('Failed to send GPS location:', e)
      setGpsError('Failed to update location')
    }
  }

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      return
    }

    setGpsError('')
    setIsTracking(true)

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendGPSLocation(position)
      },
      (error) => {
        setGpsError('Failed to get GPS location: ' + error.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // Watch position continuously and send every 20 seconds
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toLocaleTimeString()
        })
      },
      (error) => {
        setGpsError('GPS tracking error: ' + error.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // Send location every 20 seconds
    trackingIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendGPSLocation,
        (error) => console.error('GPS error:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }, 20000)
  }

  const stopGPSTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }

    setIsTracking(false)
    setCurrentLocation(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGPSTracking()
    }
  }, [])

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
            <h3>📍 Delivery Information</h3>
            <div className="detail-info">
              <div className="info-row">
                <span className="info-label">Receiver:</span>
                <span className="info-value">{shipment.receiver_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Destination:</span>
                <span className="info-value">{shipment.destination_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address:</span>
                <span className="info-value">{shipment.destination_address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Customer:</span>
                <span className="info-value">{shipment.customer}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>🚛 Vehicle Information</h3>
            <div className="detail-info">
              <div className="info-row">
                <span className="info-label">Vehicle:</span>
                <span className="info-value">{shipment.vehicle}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Tracking:</span>
                <span className="info-value">{shipment.tracking_number}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Charges:</span>
                <span className="info-value">₱{shipment.charges?.toLocaleString()}</span>
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

        {/* GPS Tracking Card */}
        <div className="shipment-detail-card">
          <div className="detail-header">
            <h3>📍 GPS Tracking</h3>
          </div>

          <div className="detail-section">
            {gpsError && (
              <div className="driver-error" style={{ marginBottom: '1rem' }}>
                ⚠️ {gpsError}
              </div>
            )}

            {currentLocation && (
              <div className="detail-info">
                <div className="info-row">
                  <span className="info-label">Latitude:</span>
                  <span className="info-value">{currentLocation.latitude.toFixed(6)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Longitude:</span>
                  <span className="info-value">{currentLocation.longitude.toFixed(6)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Accuracy:</span>
                  <span className="info-value">{currentLocation.accuracy.toFixed(0)}m</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Update:</span>
                  <span className="info-value">{currentLocation.timestamp}</span>
                </div>
              </div>
            )}

            {!isTracking && !currentLocation && (
              <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
                Start GPS tracking to share your real-time location
              </p>
            )}
          </div>

          <div className="driver-actions">
            {!isTracking ? (
              <button
                className="driver-btn driver-btn-primary driver-btn-large"
                onClick={startGPSTracking}
                disabled={shipment.status === 'delivered'}
              >
                📍 Start GPS Tracking
              </button>
            ) : (
              <button
                className="driver-btn driver-btn-outline driver-btn-large"
                onClick={stopGPSTracking}
              >
                ⏹️ Stop GPS Tracking
              </button>
            )}
          </div>
        </div>

        <div className="driver-actions">
          <button
            className="driver-btn driver-btn-primary driver-btn-large"
            onClick={() => setShowStatusUpdate(true)}
            disabled={updating || shipment.status === 'delivered'}
          >
            📝 Update Status
          </button>
        </div>
      </div>

      {showStatusUpdate && (
        <StatusUpdateModal
          onUpdate={handleStatusUpdate}
          onClose={() => setShowStatusUpdate(false)}
          updating={updating}
          currentStatus={shipment.status}
        />
      )}
    </div>
  )
}

function StatusUpdateModal({ onUpdate, onClose, updating, currentStatus }) {
  const [selectedStatus, setSelectedStatus] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const statusOptions = [
    { value: 'picked_up', label: '📦 Picked Up', icon: '📦' },
    { value: 'in_transit', label: '🚛 In Transit', icon: '🚛' },
    { value: 'out_for_delivery', label: '🚚 Out for Delivery', icon: '🚚' },
    { value: 'delivered', label: '✅ Delivered', icon: '✅' },
    { value: 'delivery_attempted', label: '🔄 Delivery Attempted', icon: '🔄' },
    { value: 'exception', label: '⚠️ Exception/Problem', icon: '⚠️' }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedStatus || !location.trim()) {
      alert('Please select a status and enter location')
      return
    }
    onUpdate(selectedStatus, location.trim(), notes.trim())
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📝 Update Status</h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={updating}
          >
            ✖️
          </button>
        </div>

        <form onSubmit={handleSubmit} className="status-form">
          <div className="status-options">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`status-option ${selectedStatus === option.value ? 'selected' : ''}`}
                onClick={() => setSelectedStatus(option.value)}
                disabled={updating}
              >
                <span className="status-icon">{option.icon}</span>
                <span className="status-text">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="driver-field">
            <label>📍 Current Location *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Manila Hub, Customer Location"
              disabled={updating}
              required
            />
          </div>

          <div className="driver-field">
            <label>📝 Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or details..."
              disabled={updating}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="driver-btn driver-btn-outline"
              onClick={onClose}
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="driver-btn driver-btn-primary"
              disabled={updating || !selectedStatus || !location.trim()}
            >
              {updating ? '🔄 Updating...' : '✅ Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}