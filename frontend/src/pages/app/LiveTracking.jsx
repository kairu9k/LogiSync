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
      <div className="page-container">
        <div className="page-header">
          <h1>🗺️ Live Tracking</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner">🔄</div>
          <p>Loading active shipments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🗺️ Live Tracking</h1>
        </div>
        <div className="error-message">⚠️ {error}</div>
      </div>
    )
  }

  const mapPositions = shipments
    .filter(s => s.location)
    .map(s => [s.location.latitude, s.location.longitude])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🗺️ Live Tracking</h1>
        <div className="page-subtitle">
          {shipments.length} active shipment{shipments.length !== 1 ? 's' : ''} with GPS
        </div>
      </div>

      <div className="tracking-layout">
        <div className="tracking-sidebar">
          <h3>Active Shipments</h3>
          {shipments.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
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
          background: white;
          border-radius: 8px;
          padding: 1rem;
          overflow-y: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tracking-sidebar h3 {
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .shipment-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .shipment-card {
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .shipment-card:hover {
          border-color: #2563eb;
          background: #f9fafb;
        }

        .shipment-card.selected {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .shipment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .shipment-info {
          font-size: 0.875rem;
          color: #666;
          line-height: 1.6;
        }

        .location-info {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #666;
        }

        .tracking-map {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
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
