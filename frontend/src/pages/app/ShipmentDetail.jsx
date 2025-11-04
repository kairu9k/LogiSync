import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getShipment, apiGet } from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default marker icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom truck icon
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

export default function ShipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gpsLocation, setGpsLocation] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await getShipment(id)
      setShipment(res?.data)
    } catch (e) {
      setError(e.message || 'Failed to load shipment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadGPSLocation()
  }, [id])

  // Refresh GPS location every 15 seconds for active shipments
  useEffect(() => {
    if (shipment && (shipment.status === 'in_transit' || shipment.status === 'out_for_delivery')) {
      const interval = setInterval(loadGPSLocation, 15000)
      return () => clearInterval(interval)
    }
  }, [shipment?.status])

  async function loadGPSLocation() {
    try {
      setGpsLoading(true)
      const response = await apiGet(`/api/shipments/${id}/location`)
      setGpsLocation(response?.location || null)
    } catch (e) {
      console.error('Failed to load GPS location:', e)
      setGpsLocation(null)
    } finally {
      setGpsLoading(false)
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'delivered': return 'badge success'
      case 'in_transit': case 'out_for_delivery': return 'badge info'
      case 'pending': return 'badge warn'
      case 'cancelled': return 'badge danger'
      default: return 'badge'
    }
  }

  if (loading) return <div className="card" style={{ padding: 16 }}>Loading…</div>
  if (error) return <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
  if (!shipment) return null

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(249, 115, 22, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              📦 Shipment Details
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontFamily: 'monospace' }}>
              {shipment.tracking_number}
            </p>
          </div>
          <button
            className="btn"
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Shipment Information Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '28px',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: 'white' }}>
          📋 Shipment Information
        </h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tracking Number
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>
              {shipment.tracking_number}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </div>
            <div>
              <span className={getStatusBadgeClass(shipment.status)} style={{ fontSize: '13px', padding: '6px 12px' }}>
                {shipment.status}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Creation Date
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
              {new Date(shipment.creation_date).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Customer
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
              {shipment.customer}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contact Number
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'monospace' }}>
              📞 {shipment.receiver_contact || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Driver
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
              {shipment.driver}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vehicle
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
              {shipment.vehicle} ({shipment.vehicle_type})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Charges
            </div>
            <div style={{ fontSize: '18px', color: '#10b981', fontWeight: '700' }}>
              ₱{shipment.charges?.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Departure Date
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
              {shipment.departure_date ? new Date(shipment.departure_date).toLocaleDateString() : 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Addresses Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '28px',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: 'white' }}>
          📍 Addresses
        </h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div style={{
            background: 'rgba(249, 115, 22, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid rgba(249, 115, 22, 0.3)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📤 Origin
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
              {shipment.origin_name}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
              {shipment.origin_address}
            </div>
          </div>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#10b981', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📥 Receiver Address
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
              {shipment.receiver_name}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
              {shipment.receiver_address}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Live Location Map */}
      {gpsLocation && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '28px',
          border: '2px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>📍 Live GPS Location</h3>
            {gpsLoading && <span style={{ fontSize: '14px', color: '#f97316', fontWeight: '600' }}>Updating...</span>}
          </div>

          <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', marginBottom: 12 }}>
            <MapContainer
              center={[gpsLocation.latitude, gpsLocation.longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker
                position={[gpsLocation.latitude, gpsLocation.longitude]}
                icon={truckIcon}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <strong>{shipment.tracking_number}</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div>🚚 Driver: {shipment.driver}</div>
                      <div>🚛 Vehicle: {shipment.vehicle}</div>
                      <div>⏰ {new Date(gpsLocation.recorded_at).toLocaleString()}</div>
                      {gpsLocation.speed > 0 && (
                        <div>🚀 Speed: {gpsLocation.speed.toFixed(1)} km/h</div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase' }}>
                Latitude
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {gpsLocation.latitude.toFixed(6)}
              </div>
            </div>
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase' }}>
                Longitude
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {gpsLocation.longitude.toFixed(6)}
              </div>
            </div>
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase' }}>
                Accuracy
              </div>
              <div style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {gpsLocation.accuracy.toFixed(0)}m
              </div>
            </div>
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginBottom: '8px', textTransform: 'uppercase' }}>
                Last Update
              </div>
              <div style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {new Date(gpsLocation.recorded_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no GPS data for active shipment */}
      {!gpsLocation && (shipment.status === 'in_transit' || shipment.status === 'out_for_delivery') && (
        <div style={{
          background: 'rgba(255, 171, 0, 0.1)',
          border: '2px solid rgba(255, 171, 0, 0.3)',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
          <div style={{ color: '#ffab00', fontWeight: '600', fontSize: '15px' }}>
            No GPS data available yet. The driver needs to start GPS tracking from their mobile app.
          </div>
        </div>
      )}

      {shipment.tracking_history?.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '28px',
          border: '2px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: 'white' }}>
            📜 Tracking History
          </h3>
          <div className="grid" style={{ gap: 16 }}>
            {shipment.tracking_history.map((item, index) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '20px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${
                    item.status === 'delivered' ? '#10b981' :
                    item.status === 'in_transit' || item.status === 'out_for_delivery' ? '#3b82f6' :
                    item.status === 'pending' ? '#f59e0b' : '#ef4444'
                  }`,
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span className={getStatusBadgeClass(item.status)} style={{ fontSize: '12px', padding: '6px 12px', fontWeight: '700' }}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <div style={{ fontWeight: '700', marginTop: 8, fontSize: '15px', color: 'white' }}>{item.location}</div>
                  </div>
                  <div style={{ fontSize: '13px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {new Date(item.timestamp).toLocaleDateString()}<br />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {item.details && (
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                    {item.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}