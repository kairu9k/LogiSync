import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Component to auto-fit map bounds
function MapBounds({ positions }) {
  const map = useMap()

  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [positions, map])

  return null
}

export default function RouteNavigator({ shipment, packages, onPackageDelivered, onClose }) {
  const [optimizedRoute, setOptimizedRoute] = useState([])
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [driverLocation, setDriverLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)

  // Get driver's real-time location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        setLocationError(null)
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError(error.message)
        // Set default location (Manila) if GPS fails
        setDriverLocation({ lat: 14.5995, lng: 120.9842, accuracy: 0 })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (point1, point2) => {
    const R = 6371 // Earth radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180
    const dLon = (point2.lng - point1.lng) * Math.PI / 180

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) *
              Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in km
  }

  // Nearest neighbor route optimization
  const optimizeRoute = (start, pkgs) => {
    // Filter out packages without coordinates
    const validPackages = pkgs.filter(pkg => pkg.receiver_lat && pkg.receiver_lng)

    if (validPackages.length === 0) {
      return []
    }

    const optimized = []
    const unvisited = [...validPackages]
    let current = start

    while (unvisited.length > 0) {
      let nearestIndex = 0
      let minDistance = Infinity

      unvisited.forEach((pkg, index) => {
        const distance = calculateDistance(current, {
          lat: parseFloat(pkg.receiver_lat),
          lng: parseFloat(pkg.receiver_lng)
        })

        if (distance < minDistance) {
          minDistance = distance
          nearestIndex = index
        }
      })

      const nearest = unvisited.splice(nearestIndex, 1)[0]
      optimized.push({
        ...nearest,
        stop_number: optimized.length + 1,
        distance_km: minDistance.toFixed(2),
        estimated_mins: Math.ceil(minDistance * 3) // Rough estimate: 20km/h avg in city
      })

      current = {
        lat: parseFloat(nearest.receiver_lat),
        lng: parseFloat(nearest.receiver_lng)
      }
    }

    return optimized
  }

  // Optimize route when driver location is available
  useEffect(() => {
    if (driverLocation && packages && packages.length > 0) {
      const optimized = optimizeRoute(driverLocation, packages)
      setOptimizedRoute(optimized)
    }
  }, [driverLocation, packages])

  // Create route line for map
  const routeLine = []
  if (driverLocation) {
    routeLine.push([driverLocation.lat, driverLocation.lng])
  }
  optimizedRoute.forEach(stop => {
    if (stop.receiver_lat && stop.receiver_lng) {
      routeLine.push([parseFloat(stop.receiver_lat), parseFloat(stop.receiver_lng)])
    }
  })

  const currentStop = optimizedRoute[currentStopIndex]

  // Custom driver marker icon
  const driverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })

  // Custom numbered marker
  const createNumberedIcon = (number, isActive = false) => {
    const color = isActive ? '#3b82f6' : '#9ca3af'
    return new L.DivIcon({
      html: `<div style="
        background: ${color};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 14px;
      ">${number}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
  }

  const handleMarkDelivered = async () => {
    if (!currentStop) return

    try {
      // Call the parent callback to update status
      await onPackageDelivered(currentStop.tracking_id, currentStop)

      // Move to next stop
      if (currentStopIndex < optimizedRoute.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1)
      } else {
        // All delivered!
        alert('🎉 All packages delivered successfully!')
        onClose && onClose()
      }
    } catch (error) {
      console.error('Failed to mark as delivered:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  // Open in external maps app
  const openInMapsApp = () => {
    if (!currentStop) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentStop.receiver_lat},${currentStop.receiver_lng}`
    window.open(url, '_blank')
  }

  // Loading state
  if (!driverLocation) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text)',
        padding: '20px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px', animation: 'pulse 2s infinite' }}>📍</div>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>Getting your location...</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
          {locationError ? `Error: ${locationError}` : 'Please allow location access to continue'}
        </p>
        {locationError && (
          <button
            onClick={onClose}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: 'var(--danger-500)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Go Back
          </button>
        )}
      </div>
    )
  }

  // No packages with coordinates
  if (optimizedRoute.length === 0) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text)',
        padding: '20px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>No delivery locations available</h2>
        <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
          Packages don't have GPS coordinates. Please add delivery locations first.
        </p>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--surface)',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
            🧭 Navigation - {shipment.shipment_id}
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Stop {currentStopIndex + 1} of {optimizedRoute.length}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          ✖ Close
        </button>
      </div>

      {/* Map View - 55% */}
      <div style={{ height: '55vh', position: 'relative' }}>
        <MapContainer
          center={[driverLocation.lat, driverLocation.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <MapBounds positions={routeLine} />

          {/* Driver marker */}
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>
              <strong>📍 You are here</strong><br/>
              Accuracy: ±{Math.round(driverLocation.accuracy)}m
            </Popup>
          </Marker>

          {/* Route markers */}
          {optimizedRoute.map((stop, index) => (
            <Marker
              key={stop.order_id}
              position={[parseFloat(stop.receiver_lat), parseFloat(stop.receiver_lng)]}
              icon={createNumberedIcon(index + 1, index === currentStopIndex)}
            >
              <Popup>
                <strong>Stop {index + 1}</strong><br/>
                {stop.receiver_name}<br/>
                <small>{stop.receiver_address}</small>
              </Popup>
            </Marker>
          ))}

          {/* Route line */}
          {routeLine.length > 1 && (
            <Polyline
              positions={routeLine}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
        </MapContainer>

        {/* GPS Accuracy Indicator */}
        {driverLocation.accuracy > 50 && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            zIndex: 1000
          }}>
            ⚠️ Low GPS accuracy (±{Math.round(driverLocation.accuracy)}m)
          </div>
        )}
      </div>

      {/* Delivery Info - 45% */}
      <div style={{
        height: '45vh',
        background: 'var(--surface)',
        padding: '20px',
        overflowY: 'auto',
        borderTop: '2px solid var(--border)'
      }}>
        {currentStop ? (
          <>
            {/* Current Stop Info */}
            <div style={{
              marginBottom: '20px',
              padding: '20px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Next Delivery
                  </div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--text)' }}>
                    {currentStop.receiver_name}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#60a5fa', fontFamily: 'monospace', fontWeight: '600' }}>
                    {currentStop.tracking_id}
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#60a5fa'
                }}>
                  Stop {currentStopIndex + 1}/{optimizedRoute.length}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  📍 Delivery Address
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text)', lineHeight: '1.5' }}>
                  {currentStop.receiver_address}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  📞 Contact Number
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text)' }}>
                  {currentStop.receiver_contact || 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Distance</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#60a5fa' }}>
                    {currentStop.distance_km} km
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Est. Time</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#60a5fa' }}>
                    ~{currentStop.estimated_mins} mins
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={openInMapsApp}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🗺️ Open in Maps App
              </button>
              <button
                onClick={() => window.open(`tel:${currentStop.receiver_contact}`)}
                style={{
                  padding: '16px 24px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📞
              </button>
            </div>

            <button
              onClick={handleMarkDelivered}
              style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              ✅ Mark as Delivered
            </button>

            {/* Upcoming Stops */}
            {currentStopIndex < optimizedRoute.length - 1 && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Upcoming Stops
                </h4>
                {optimizedRoute.slice(currentStopIndex + 1, currentStopIndex + 3).map((stop, index) => (
                  <div
                    key={stop.order_id}
                    style={{
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      marginBottom: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
                        {currentStopIndex + index + 2}. {stop.receiver_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '600' }}>
                        {stop.distance_km} km
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {stop.receiver_address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--text)' }}>
              All Deliveries Completed!
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Great job! All {optimizedRoute.length} packages have been delivered.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
