import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom truck icon for driver
const truckIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTA3OGZmIj48cGF0aCBkPSJNMTggMThoLTJ2LTFoMnYxem0tNSAwSDl2LTFoNHYxem0tNy01VjdoN3Y2SDZ6bTEzLTFoLTN2LTRoMi4zTDE5IDEwem0tMiA3Yy0xLjEgMC0yLS45LTItMnMyIC0uOSAyLTItMiAuOS0yIDIgLjkgMiAyIDJ6bTAgMmMtMi4yIDAtNC0xLjgtNC00czEuOC00IDQtNCA0IDEuOCA0IDQtMS44IDQtNCA0em0tNiAwYy0yLjIgMC00LTEuOC00LTRzMS44LTQgNC00IDQgMS44IDQgNC0xLjggNC00IDR6Ii8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

// Component to auto-center map on driver location
function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  return null
}

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null)
  const [shipments, setShipments] = useState([])
  const [summary, setSummary] = useState(null)
  const [vehicleCapacity, setVehicleCapacity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Global GPS Tracking State
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  const trackingIntervalRef = useRef(null)
  const watchIdRef = useRef(null)

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
    stopGPSTracking() // Stop tracking before logout
    localStorage.removeItem('driver')
    navigate('/driver/login')
  }

  // GPS Tracking Functions
  const sendGPSLocationToAllShipments = async (position) => {
    if (!driver || !shipments || shipments.length === 0) return

    const { latitude, longitude, speed, accuracy } = position.coords

    // Get all active shipments (not delivered or cancelled)
    const activeShipments = shipments.filter(s =>
      s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending'
    )

    if (activeShipments.length === 0) {
      console.log('No active shipments to update')
      return
    }

    // Update location for all active shipments
    const updatePromises = activeShipments.map(shipment =>
      apiPost(`/api/shipments/${shipment.id}/location`, {
        latitude,
        longitude,
        speed: speed || 0,
        accuracy: accuracy || 0,
        driver_id: driver.id
      }).catch(err => {
        console.error(`Failed to update location for shipment ${shipment.id}:`, err)
        return null
      })
    )

    try {
      await Promise.all(updatePromises)

      setCurrentLocation({
        latitude,
        longitude,
        accuracy,
        timestamp: new Date()
      })
      setLastUpdateTime(new Date())

      console.log(`GPS location sent to ${activeShipments.length} active shipments`)
    } catch (e) {
      console.error('Failed to send GPS location:', e)
      setGpsError('Failed to update location for some shipments')
    }
  }

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      return
    }

    // Check if there are active shipments
    const activeShipments = shipments.filter(s =>
      s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending'
    )

    if (activeShipments.length === 0) {
      setGpsError('No active shipments to track')
      return
    }

    setGpsError('')
    setIsTracking(true)

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ GPS location obtained:', position.coords)
        sendGPSLocationToAllShipments(position)
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        }
        setCurrentLocation(location)
        console.log('✅ Map should now be visible with location:', location)
        setGpsError('')
      },
      (error) => {
        console.error('Initial GPS error:', error)
        if (error.code === 1) {
          setGpsError('Location permission denied. Please enable location access.')
          stopGPSTracking()
        } else if (error.code === 2) {
          setGpsError('Location unavailable. GPS may not work on localhost.')
        } else {
          setGpsError('Getting location... (this may take a moment)')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        })
        setGpsError('')
      },
      (error) => {
        console.error('GPS tracking error:', error)
        if (error.code === 1) {
          setGpsError('Location permission denied')
          stopGPSTracking()
        } else if (error.code === 2) {
          setGpsError('Location unavailable')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )

    // Send location every 30 seconds
    trackingIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendGPSLocationToAllShipments,
        (error) => {
          console.error('GPS send error:', error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
    }, 30000) // Update every 30 seconds
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
    setGpsError('')
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

      {/* Global GPS Tracking Card */}
      <div className="card" style={{
        padding: '20px',
        marginBottom: '16px',
        background: isTracking
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>
                {isTracking ? '📡' : '📍'}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  {isTracking ? 'GPS Tracking Active' : 'Global GPS Tracking'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {isTracking
                    ? `Tracking ${shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending').length} active shipments`
                    : 'Start tracking to update all shipments automatically'
                  }
                </p>
              </div>
            </div>

            {isTracking && currentLocation && (
              <>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9, marginBottom: '8px' }}>
                    CURRENT LOCATION
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                    <div>
                      <div style={{ opacity: 0.8 }}>Latitude:</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                        {currentLocation.latitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.8 }}>Longitude:</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                        {currentLocation.longitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.8 }}>Accuracy:</div>
                      <div style={{ fontWeight: '500' }}>±{currentLocation.accuracy.toFixed(0)}m</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.8 }}>Last Update:</div>
                      <div style={{ fontWeight: '500' }}>
                        {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini Map */}
                <div style={{
                  marginTop: '12px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  height: '200px',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}>
                  <MapContainer
                    center={[currentLocation.latitude, currentLocation.longitude]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[currentLocation.latitude, currentLocation.longitude]}
                      icon={truckIcon}
                    >
                      <Popup>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🚛 Your Location</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Tracking {shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending').length} shipments
                          </div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                            Accuracy: ±{currentLocation.accuracy.toFixed(0)}m
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    <MapUpdater center={[currentLocation.latitude, currentLocation.longitude]} />
                  </MapContainer>
                </div>
              </>
            )}

            {gpsError && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
            {!isTracking ? (
              <button
                className="btn"
                onClick={startGPSTracking}
                disabled={shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending').length === 0}
                style={{
                  background: 'white',
                  color: '#3b82f6',
                  border: 'none',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <span style={{ fontSize: '20px' }}>🚀</span>
                <span>Start Tracking</span>
              </button>
            ) : (
              <>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚡</div>
                  <div>Updating every 30s</div>
                </div>
                <button
                  className="btn"
                  onClick={stopGPSTracking}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.5)',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>⏹️</span>
                  <span>Stop Tracking</span>
                </button>
              </>
            )}
          </div>
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