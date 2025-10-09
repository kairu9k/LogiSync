import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null)
  const [shipments, setShipments] = useState([])
  const [summary, setSummary] = useState(null)
  const [vehicleCapacity, setVehicleCapacity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Driver Dashboard - LogiSync'

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
      setVehicleCapacity(response?.vehicle_capacity || null)
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
    <div className="driver-container" style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>🚛 Driver Dashboard</h1>
            <p style={{ margin: 0, color: 'var(--gray-600)' }}>Welcome, {driver?.username}</p>
          </div>
          <button
            className="btn btn-outline"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-600)', marginBottom: '8px' }}>
              {summary.total || 0}
            </div>
            <div className="muted" style={{ fontSize: '14px' }}>Total Shipments</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--warning-600)', marginBottom: '8px' }}>
              {summary.pending || 0}
            </div>
            <div className="muted" style={{ fontSize: '14px' }}>Pending</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--info-600)', marginBottom: '8px' }}>
              {summary.in_transit || 0}
            </div>
            <div className="muted" style={{ fontSize: '14px' }}>In Transit</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success-600)', marginBottom: '8px' }}>
              {summary.out_for_delivery || 0}
            </div>
            <div className="muted" style={{ fontSize: '14px' }}>For Delivery</div>
          </div>
        </div>
      )}

      {/* Vehicle Capacity Indicator */}
      {vehicleCapacity && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Pie Chart */}
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {/* Background circle (available capacity - green) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke="#e5e7eb"
                  strokeWidth="3.8"
                />
                {/* Current load (colored based on utilization) */}
                {vehicleCapacity.utilization_percent > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke={vehicleCapacity.utilization_percent >= 90 ? '#ef4444' :
                           vehicleCapacity.utilization_percent >= 70 ? '#f59e0b' :
                           '#3b82f6'}
                    strokeWidth="3.8"
                    strokeDasharray={`${vehicleCapacity.utilization_percent} ${100 - vehicleCapacity.utilization_percent}`}
                  />
                )}
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--gray-800)' }}>
                  {vehicleCapacity.utilization_percent}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '2px' }}>
                  Used
                </div>
              </div>
            </div>

            {/* Vehicle Info and Capacity Details */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '4px' }}>
                  🚛 Your Vehicle: {vehicleCapacity.vehicle_id} ({vehicleCapacity.registration})
                </div>
                <div className="muted" style={{ fontSize: '14px' }}>
                  {vehicleCapacity.vehicle_type}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '2px' }}>Current Load</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: vehicleCapacity.utilization_percent >= 90 ? 'var(--danger-600)' :
                           vehicleCapacity.utilization_percent >= 70 ? 'var(--warning-600)' :
                           'var(--info-600)' }}>
                    {vehicleCapacity.current_load} kg
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '2px' }}>Available</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success-600)' }}>
                    {vehicleCapacity.available_capacity} kg
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '2px' }}>Total Capacity</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                    {vehicleCapacity.capacity} kg
                  </div>
                </div>
              </div>

              {vehicleCapacity.utilization_percent >= 90 && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: 'var(--danger-50)',
                  border: '1px solid var(--danger-200)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--danger-700)'
                }}>
                  ⚠️ <strong>Warning:</strong> Vehicle is at {vehicleCapacity.utilization_percent}% capacity. Be cautious with additional loads.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
          <p style={{ margin: 0, color: 'var(--gray-600)' }}>Loading shipments...</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--danger-600)' }}>⚠️</div>
          <p style={{ margin: '0 0 16px 0', color: 'var(--danger-700)' }}>{error}</p>
          <button
            className="btn btn-outline"
            onClick={() => loadShipments(driver?.id)}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {!loading && !error && shipments.length === 0 && (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ margin: '0 0 8px 0' }}>No Active Shipments</h3>
          <p style={{ margin: '0 0 24px 0', color: 'var(--gray-600)' }}>You have no shipments assigned for today.</p>
          <button
            className="btn btn-outline"
            onClick={() => loadShipments(driver?.id)}
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {!loading && !error && shipments.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {shipments.map((shipment) => (
            <div
              key={shipment.id}
              className="card"
              style={{
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid var(--gray-200)',
                ':hover': {
                  borderColor: 'var(--primary-300)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }}
              onClick={() => navigate(`/driver/shipment/${shipment.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="muted" style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                  {shipment.tracking_number}
                </div>
                <span className={`badge ${
                  shipment.status === 'delivered' ? 'success' :
                  shipment.status === 'out_for_delivery' ? 'warn' :
                  shipment.status === 'in_transit' ? 'info' : ''
                }`} style={{ fontSize: '12px' }}>
                  {getStatusIcon(shipment.status)} {shipment.status.replace('_', ' ')}
                </span>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                  📍 {shipment.receiver_name}
                </div>
                <div className="muted" style={{ fontSize: '14px' }}>
                  {shipment.destination_address}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="muted" style={{ fontSize: '14px' }}>
                  👤 Customer: {shipment.customer}
                </div>
                <div className="muted" style={{ fontSize: '14px', marginTop: '4px' }}>
                  🚛 Vehicle: {shipment.vehicle}
                </div>
              </div>

              <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--gray-200)' }}>
                <span className="muted" style={{ fontSize: '12px' }}>
                  👆 Tap to update status
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={() => loadShipments(driver?.id)}
            disabled={loading}
            style={{ minWidth: '200px' }}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Shipments'}
          </button>
        </div>
      )}
    </div>
  )
}