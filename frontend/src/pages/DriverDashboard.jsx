import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null)
  const [shipments, setShipments] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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
      loadShipments(parsedDriver.id)
    } catch (e) {
      navigate('/driver/login')
    }
  }, [navigate])

  const loadShipments = async (driverId) => {
    setLoading(true)
    setError('')

    try {
      const response = await apiGet(`/api/driver/shipments?driver_id=${driverId}`)
      setShipments(response?.data || [])
      setSummary(response?.summary || {})
    } catch (e) {
      setError(e.message || 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('driver')
    navigate('/driver/login')
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'priority-urgent'
      case 'high': return 'priority-high'
      default: return 'priority-normal'
    }
  }

  if (loading && !driver) {
    return (
      <div className="driver-container">
        <div className="driver-loading">
          <div className="loading-spinner">🔄</div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="driver-container">
      <header className="driver-header">
        <div className="driver-header-content">
          <div>
            <h1>🚛 Driver Dashboard</h1>
            <p>Welcome, {driver?.username}</p>
          </div>
          <button
            className="driver-btn driver-btn-outline"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {summary && (
        <div className="driver-summary">
          <div className="summary-card">
            <div className="summary-number">{summary.total || 0}</div>
            <div className="summary-label">Total Shipments</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">{summary.pending || 0}</div>
            <div className="summary-label">Pending</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">{summary.in_transit || 0}</div>
            <div className="summary-label">In Transit</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">{summary.out_for_delivery || 0}</div>
            <div className="summary-label">For Delivery</div>
          </div>
        </div>
      )}

      <div className="driver-content">
        {loading && (
          <div className="driver-loading">
            <div className="loading-spinner">🔄</div>
            <p>Loading shipments...</p>
          </div>
        )}

        {error && (
          <div className="driver-error">
            ⚠️ {error}
            <button
              className="driver-btn driver-btn-outline"
              onClick={() => loadShipments(driver?.id)}
              style={{ marginTop: 8 }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {!loading && !error && shipments.length === 0 && (
          <div className="driver-empty">
            <div className="empty-icon">📋</div>
            <h3>No Active Shipments</h3>
            <p>You have no shipments assigned for today.</p>
            <button
              className="driver-btn driver-btn-outline"
              onClick={() => loadShipments(driver?.id)}
            >
              🔄 Refresh
            </button>
          </div>
        )}

        {!loading && !error && shipments.length > 0 && (
          <div className="shipments-grid">
            {shipments.map((shipment) => (
              <div
                key={shipment.id}
                className={`shipment-card ${getPriorityColor(shipment.priority)}`}
                onClick={() => navigate(`/driver/shipment/${shipment.id}`)}
              >
                <div className="shipment-header">
                  <div className="shipment-tracking">
                    {shipment.tracking_number}
                  </div>
                  <div className={`shipment-status ${getStatusColor(shipment.status)}`}>
                    {getStatusIcon(shipment.status)} {shipment.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="shipment-receiver">
                  <strong>📍 {shipment.receiver_name}</strong>
                </div>

                <div className="shipment-destination">
                  {shipment.destination_name}
                </div>

                <div className="shipment-address">
                  {shipment.destination_address}
                </div>

                <div className="shipment-customer">
                  👤 Customer: {shipment.customer}
                </div>

                <div className="shipment-footer">
                  <span className="shipment-vehicle">
                    🚛 {shipment.vehicle}
                  </span>
                  <span className="tap-hint">
                    👆 Tap to update
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="driver-refresh">
        <button
          className="driver-btn driver-btn-secondary"
          onClick={() => loadShipments(driver?.id)}
          disabled={loading}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh Shipments'}
        </button>
      </div>
    </div>
  )
}