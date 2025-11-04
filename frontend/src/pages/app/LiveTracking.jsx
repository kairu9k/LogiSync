import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { apiGet } from '../../lib/api'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default marker icon issue with Leaflet + Webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom truck icon for driver location
const truckIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/>
      <text x="20" y="28" font-size="20" text-anchor="middle" fill="white">🚛</text>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
})

// Component to auto-center map on markers
function AutoCenter({ positions }) {
  const map = useMap()

  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [positions, map])

  return null
}

export default function LiveTracking() {
  const [shipments, setShipments] = useState([])
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [locationHistory, setLocationHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Default center (Philippines)
  const defaultCenter = [12.8797, 121.7740]

  useEffect(() => {
    loadActiveShipments()

    // Refresh every 15 seconds
    const interval = setInterval(loadActiveShipments, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedShipment) {
      loadLocationHistory(selectedShipment.id)

      // Refresh selected shipment location every 10 seconds
      const interval = setInterval(() => loadLocationHistory(selectedShipment.id), 10000)
      return () => clearInterval(interval)
    }
  }, [selectedShipment])

  const loadActiveShipments = async () => {
    try {
      // Get all in-transit and out-for-delivery shipments
      const response = await apiGet('/api/shipments?status=in_transit')
      const shipments1 = response?.data || []

      const response2 = await apiGet('/api/shipments?status=out_for_delivery')
      const shipments2 = response2?.data || []

      const allShipments = [...shipments1, ...shipments2]

      // Get latest location for each shipment
      const shipmentsWithLocation = await Promise.all(
        allShipments.map(async (shipment) => {
          try {
            const locResponse = await apiGet(`/api/shipments/${shipment.id}/location`)
            return {
              ...shipment,
              location: locResponse?.location || null
            }
          } catch (e) {
            return { ...shipment, location: null }
          }
        })
      )

      // Filter out shipments without GPS data
      const tracked = shipmentsWithLocation.filter(s => s.location !== null)
      setShipments(tracked)
      setLoading(false)
    } catch (e) {
      setError(e.message || 'Failed to load shipments')
      setLoading(false)
    }
  }

  const loadLocationHistory = async (shipmentId) => {
    try {
      const response = await apiGet(`/api/shipments/${shipmentId}/location/history`)
      setLocationHistory(response?.history || [])
    } catch (e) {
      console.error('Failed to load location history:', e)
    }
  }

  const handleShipmentClick = (shipment) => {
    setSelectedShipment(shipment)
  }

  if (loading) {
    return (
      <div>
        <h1 style={{
          marginTop: 0,
          marginBottom: '24px',
          fontSize: '28px',
          fontWeight: '700'
        }}>🗺️ Live Tracking</h1>
        <div className="card" style={{
          borderRadius: '16px',
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Loading active shipments...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 style={{
          marginTop: 0,
          marginBottom: '24px',
          fontSize: '28px',
          fontWeight: '700'
        }}>🗺️ Live Tracking</h1>
        <div className="card" style={{
          borderRadius: '16px',
          textAlign: 'center',
          padding: '60px 20px',
          border: '2px solid var(--danger-300)',
          background: 'var(--danger-50)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--danger-600)' }}>{error}</div>
        </div>
      </div>
    )
  }

  const mapPositions = shipments
    .filter(s => s.location)
    .map(s => [s.location.latitude, s.location.longitude])

  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          marginTop: 0,
          marginBottom: '8px',
          fontSize: '28px',
          fontWeight: '700'
        }}>🗺️ Live Tracking</h1>
        <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
          {shipments.length} active shipment{shipments.length !== 1 ? 's' : ''} with GPS tracking
        </p>
      </div>

      <div className="tracking-layout">
        <div className="tracking-sidebar">
          <h3 style={{
            margin: 0,
            marginBottom: '16px',
            paddingBottom: '12px',
            fontSize: '18px',
            fontWeight: '700',
            borderBottom: '2px solid var(--border)'
          }}>📍 Active Shipments</h3>
          {shipments.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
              No active shipments with GPS data
            </div>
          ) : (
            <div className="shipment-list">
              {shipments.map(shipment => (
                <div
                  key={shipment.id}
                  className={`shipment-card ${selectedShipment?.id === shipment.id ? 'selected' : ''}`}
                  onClick={() => handleShipmentClick(shipment)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="shipment-header">
                    <strong>{shipment.tracking_number}</strong>
                    <span className={`badge badge-${shipment.status}`}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="shipment-info">
                    <div>🚚 {shipment.driver}</div>
                    <div>🚛 {shipment.vehicle}</div>
                    <div>📍 {shipment.receiver}</div>
                  </div>
                  {shipment.location && (
                    <div className="location-info">
                      <small>
                        Last update: {new Date(shipment.location.recorded_at).toLocaleTimeString()}
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tracking-map">
          <MapContainer
            center={mapPositions.length > 0 ? mapPositions[0] : defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {mapPositions.length > 0 && <AutoCenter positions={mapPositions} />}

            {shipments.map(shipment => {
              if (!shipment.location) return null

              const position = [shipment.location.latitude, shipment.location.longitude]

              return (
                <Marker
                  key={shipment.id}
                  position={position}
                  icon={truckIcon}
                  eventHandlers={{
                    click: () => handleShipmentClick(shipment)
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <strong>{shipment.tracking_number}</strong>
                      <div style={{ marginTop: '0.5rem' }}>
                        <div>🚚 Driver: {shipment.driver}</div>
                        <div>🚛 Vehicle: {shipment.vehicle}</div>
                        <div>📍 Receiver: {shipment.receiver}</div>
                        <div>⏰ {new Date(shipment.location.recorded_at).toLocaleString()}</div>
                        {shipment.location.speed > 0 && (
                          <div>🚀 Speed: {shipment.location.speed.toFixed(1)} km/h</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Show route history for selected shipment */}
            {selectedShipment && locationHistory.length > 1 && (
              <Polyline
                positions={locationHistory.map(loc => [loc.latitude, loc.longitude])}
                color="#2563eb"
                weight={3}
                opacity={0.6}
              />
            )}
          </MapContainer>
        </div>
      </div>

      <style jsx>{`
        .tracking-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1rem;
          height: calc(100vh - 200px);
          min-height: 600px;
        }

        .tracking-sidebar {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .shipment-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .shipment-card {
          padding: 16px;
          border: 2px solid var(--border);
          border-radius: 12px;
          transition: all 0.3s ease;
          background: var(--surface-50);
        }

        .shipment-card:hover {
          border-color: var(--primary-500);
          background: var(--primary-50);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .shipment-card.selected {
          border-color: var(--primary-500);
          background: var(--primary-50);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .shipment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .shipment-header strong {
          font-size: 15px;
          font-weight: 700;
        }

        .shipment-info {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.8;
        }

        .location-info {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--text-muted);
        }

        .tracking-map {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .badge {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-in_transit {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge-out_for_delivery {
          background: #fef3c7;
          color: #92400e;
        }

        @media (max-width: 768px) {
          .tracking-layout {
            grid-template-columns: 1fr;
            grid-template-rows: 300px 1fr;
          }
        }
      `}</style>
    </div>
  )
}
