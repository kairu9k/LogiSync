import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../../lib/api'
import Toast from '../../components/Toast'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showReceiverForm, setShowReceiverForm] = useState(false)
  const [receiverInfo, setReceiverInfo] = useState({
    receiver_name: '',
    receiver_contact: '',
    receiver_email: '',
    receiver_address: ''
  })
  const [savingReceiver, setSavingReceiver] = useState(false)
  const [toast, setToast] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [showWarehouseWidget, setShowWarehouseWidget] = useState(false)
  const [assigningWarehouse, setAssigningWarehouse] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [warehouseLocation, setWarehouseLocation] = useState('')
  const [packageLocation, setPackageLocation] = useState(null)
  const [showAddressMap, setShowAddressMap] = useState(false)
  const [mapPosition, setMapPosition] = useState([7.1907, 125.4553]) // Davao City default
  const [addressCoordinates, setAddressCoordinates] = useState({ lat: null, lng: null })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet(`/api/orders/${id}`)
      setOrder(res?.data)

      // Populate receiver info if exists
      if (res?.data) {
        const hasReceiverInfo = res.data.receiver_name && res.data.receiver_contact && res.data.receiver_address
        setReceiverInfo({
          receiver_name: res.data.receiver_name || '',
          receiver_contact: res.data.receiver_contact || '',
          receiver_email: res.data.receiver_email || '',
          receiver_address: res.data.receiver_address || ''
        })

        // Load existing coordinates if available
        if (res.data.receiver_lat && res.data.receiver_lng) {
          setAddressCoordinates({
            lat: parseFloat(res.data.receiver_lat),
            lng: parseFloat(res.data.receiver_lng)
          })
          setMapPosition([parseFloat(res.data.receiver_lat), parseFloat(res.data.receiver_lng)])
        }

        // Show form if receiver info is incomplete
        setShowReceiverForm(!hasReceiverInfo)
      }

      // Load warehouse location for this order
      try {
        const inventoryRes = await apiGet(`/api/inventory?limit=200`)
        const orderInventory = inventoryRes?.data?.find(item => item.order_id === parseInt(id))
        if (orderInventory) {
          setPackageLocation({
            warehouse: orderInventory.warehouse || 'N/A',
            location: orderInventory.location || 'N/A'
          })
          // Hide warehouse widget if package is already assigned
          setShowWarehouseWidget(false)
        } else {
          setPackageLocation(null)
          // Show warehouse widget if package is not assigned (for processing status)
          setShowWarehouseWidget(true)
        }
      } catch (e) {
        console.error('Failed to load warehouse location:', e)
        setPackageLocation(null)
        setShowWarehouseWidget(true)
      }

    } catch (e) {
      setError(e.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadWarehouses()
  }, [id])

  async function loadWarehouses() {
    try {
      const res = await apiGet('/api/warehouses')
      setWarehouses(res?.data || [])
    } catch (e) {
      console.error('Failed to load warehouses:', e)
    }
  }

  async function assignToWarehouse() {
    if (!selectedWarehouse) {
      setToast({ message: 'Please select a warehouse', type: 'warning' })
      return
    }
    if (!warehouseLocation.trim()) {
      setToast({ message: 'Please enter warehouse location', type: 'warning' })
      return
    }

    try {
      setAssigningWarehouse(true)
      await apiPost('/api/inventory/assign', {
        order_id: parseInt(id),
        warehouse_id: parseInt(selectedWarehouse),
        location_in_warehouse: warehouseLocation.trim()
      })
      setShowWarehouseWidget(false)
      setSelectedWarehouse('')
      setWarehouseLocation('')
      setToast({ message: 'Package assigned to warehouse successfully!', type: 'success' })
      await load()
    } catch (e) {
      setToast({ message: e.message || 'Failed to assign to warehouse', type: 'error' })
    } finally {
      setAssigningWarehouse(false)
    }
  }

  async function saveReceiverInfo() {
    // Validation
    if (!receiverInfo.receiver_name.trim()) {
      alert('Please enter receiver name')
      return
    }
    if (!receiverInfo.receiver_contact.trim()) {
      alert('Please enter receiver contact')
      return
    }
    if (!receiverInfo.receiver_address.trim()) {
      alert('Please enter receiver address')
      return
    }

    try {
      setSavingReceiver(true)

      // Include coordinates if they were captured from map
      const payload = {
        ...receiverInfo,
        receiver_lat: addressCoordinates.lat,
        receiver_lng: addressCoordinates.lng
      }

      await apiPatch(`/api/orders/${id}/receiver`, payload)
      setShowReceiverForm(false)
      await load()
      setToast({ message: 'Receiver information saved successfully!', type: 'success' })
    } catch (e) {
      setToast({ message: e.message || 'Failed to save receiver information', type: 'error' })
    } finally {
      setSavingReceiver(false)
    }
  }

  async function setStatus(status) {
    // Validate: Can't mark as "fulfilled" (Ready to Ship) if items not assigned to warehouse
    if (status === 'fulfilled') {
      try {
        const inventoryRes = await apiGet(`/api/inventory?limit=200`)
        // Filter for this specific order
        const orderInventory = inventoryRes?.data?.filter(item => item.order_id === parseInt(id)) || []

        if (orderInventory.length === 0) {
          alert('❌ Cannot mark as Ready to Ship!\n\nPackages must be assigned to a warehouse first.\n\n💡 Go to Inventory page → Assign items to warehouse shelves → Then return here.')
          return
        }
      } catch (e) {
        console.error('Failed to check inventory:', e)
        alert('⚠️ Unable to verify warehouse assignment. Please ensure packages are assigned to warehouse first.')
        return
      }
    }

    try {
      setUpdating(true)
      await apiPatch(`/api/orders/${id}/status`, { status })
      await load()
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }


  if (loading) return <div className="card" style={{ padding: 16 }}>Loading…</div>
  if (error) return <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
  if (!order) return null

  // Parse dimensions from JSON string
  const parseDimensions = (dimStr) => {
    if (!dimStr) return 'N/A'
    try {
      const dims = typeof dimStr === 'string' ? JSON.parse(dimStr) : dimStr
      return `${dims.L} × ${dims.W} × ${dims.H} cm`
    } catch (e) {
      return dimStr
    }
  }

  // Map click handler component
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        setAddressCoordinates({ lat, lng })
        setMapPosition([lat, lng])

        // Reverse geocoding to get address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              setReceiverInfo({
                ...receiverInfo,
                receiver_address: data.display_name
              })
            }
          })
          .catch(err => {
            console.error('Geocoding error:', err)
            // Still allow manual input if geocoding fails
          })
      }
    })
    return addressCoordinates.lat && addressCoordinates.lng ? (
      <Marker position={[addressCoordinates.lat, addressCoordinates.lng]} />
    ) : null
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Order ID
              </div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700' }}>
                {order.po}
              </h2>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </div>
              <div>
                <span className={`badge ${
                  order.status === 'fulfilled' ? 'success' :
                  order.status === 'processing' ? 'info' :
                  order.status === 'canceled' ? 'danger' :
                  'warn'
                }`} style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {order.status === 'fulfilled' ? 'Ready to Ship' : order.status}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Order Date
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>
                {String(order.order_date).replace('T', ' ').replace('Z','')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {order.status !== 'canceled' && (
              <button
                disabled={updating}
                onClick={() => setStatus('canceled')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '2px solid rgba(239, 68, 68, 0.5)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: updating ? 0.6 : 1
                }}
                onMouseOver={(e) => {
                  if (!updating) {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!updating) {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                Cancel Order
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>

        {/* Workflow Guide */}
        {order.status !== 'canceled' && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 8
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8 }}>📋 Order Workflow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: order.status === 'pending' ? 'var(--primary-600)' : 'var(--gray-500)'
              }}>
                {order.status === 'pending' ? '🔵' : '✅'} Pending
              </div>
              <div>→</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: order.status === 'processing' ? 'var(--primary-600)' : order.status === 'fulfilled' ? 'var(--gray-500)' : 'var(--gray-400)'
              }}>
                {order.status === 'processing' ? '🔵' : order.status === 'fulfilled' ? '✅' : '⚪'} Processing
              </div>
              <div>→</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: order.status === 'fulfilled' ? 'var(--primary-600)' : 'var(--gray-400)'
              }}>
                {order.status === 'fulfilled' ? '🔵' : '⚪'} Ready for Shipment
              </div>
            </div>

            {/* Status-specific instructions */}
            {order.status === 'pending' && (
              <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                💡 <strong>Next:</strong> {receiverInfo.receiver_name ? 'Click "Start Processing" when items arrive at warehouse' : 'Fill receiver information below to proceed'}
              </div>
            )}
            {order.status === 'processing' && (
              <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                💡 <strong>Next:</strong> Use the Quick Warehouse Assignment below OR go to Inventory page → Assign items to warehouse shelves
              </div>
            )}
            {order.status === 'fulfilled' && (
              <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                💡 <strong>Next:</strong> Items are packed and ready! Go to Shipments page to create shipment and assign driver and vehicle
              </div>
            )}
          </div>
        )}

        {/* Inline Receiver Information Form (Pending Status) */}
        {order.status === 'pending' && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: showReceiverForm ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `2px solid ${showReceiverForm ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 12
          }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 12, color: showReceiverForm ? 'var(--primary-600)' : 'var(--success-600)' }}>
              {showReceiverForm ? '📝 Fill Receiver Information' : '✅ Receiver Information'}
            </div>

            {!showReceiverForm ? (
              // Display saved receiver info
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{receiverInfo.receiver_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{receiverInfo.receiver_contact || 'N/A'}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{receiverInfo.receiver_email || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{receiverInfo.receiver_address || 'N/A'}</div>
                </div>
                <button
                  onClick={() => setShowReceiverForm(true)}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(100, 116, 139, 0.2)',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit Information
                </button>
              </div>
            ) : (
              // Receiver info form
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Receiver Name *
                  </label>
                  <input
                    type="text"
                    value={receiverInfo.receiver_name}
                    onChange={(e) => setReceiverInfo({...receiverInfo, receiver_name: e.target.value})}
                    placeholder="Enter receiver name"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={receiverInfo.receiver_contact}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setReceiverInfo({...receiverInfo, receiver_contact: value})
                    }}
                    placeholder="Enter contact number"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={receiverInfo.receiver_email}
                    onChange={(e) => setReceiverInfo({...receiverInfo, receiver_email: e.target.value})}
                    placeholder="Enter email address (optional)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Delivery Address *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddressMap(!showAddressMap)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: showAddressMap ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: showAddressMap ? '#ef4444' : '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {showAddressMap ? '🗺️ Hide Map' : '📍 Pin on Map'}
                    </button>
                  </div>
                  <textarea
                    value={receiverInfo.receiver_address}
                    onChange={(e) => setReceiverInfo({...receiverInfo, receiver_address: e.target.value})}
                    placeholder="Enter address or click map to pin location"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      marginBottom: showAddressMap ? '12px' : '0'
                    }}
                  />
                  {showAddressMap && (
                    <div style={{ marginTop: 12 }}>
                      <MapContainer
                        center={mapPosition}
                        zoom={13}
                        style={{ height: '300px', width: '100%', borderRadius: '8px', border: '1px solid var(--gray-200)' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <MapClickHandler />
                      </MapContainer>
                      {addressCoordinates.lat && addressCoordinates.lng && (
                        <div style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: '#3b82f6'
                        }}>
                          📍 Coordinates: {addressCoordinates.lat.toFixed(6)}, {addressCoordinates.lng.toFixed(6)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={saveReceiverInfo}
                    disabled={savingReceiver}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: savingReceiver ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: savingReceiver ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingReceiver ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReceiverForm(false)
                      // Reload to restore original values if user cancels
                      load()
                    }}
                    disabled={savingReceiver}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(100, 116, 139, 0.2)',
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: savingReceiver ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inline Warehouse Assignment Widget (Processing Status) */}
        {order.status === 'processing' && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: showWarehouseWidget ? 'rgba(249, 115, 22, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `2px solid ${showWarehouseWidget ? 'rgba(249, 115, 22, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 12
          }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 12, color: showWarehouseWidget ? 'var(--warning-600)' : 'var(--success-600)' }}>
              {showWarehouseWidget ? '📦 Quick Warehouse Assignment' : '✅ Warehouse Assignment'}
            </div>

            {!showWarehouseWidget ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Warehouse</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{packageLocation?.warehouse || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{packageLocation?.location || 'N/A'}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarehouseWidget(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(100, 116, 139, 0.2)',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit Assignment
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Select Warehouse *
                  </label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Choose warehouse...</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} - {wh.location} (Capacity: {wh.current_capacity}/{wh.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Location in Warehouse *
                  </label>
                  <input
                    type="text"
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    placeholder="e.g., Aisle 3, Shelf B2"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={assignToWarehouse}
                    disabled={assigningWarehouse}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: assigningWarehouse ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: assigningWarehouse ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {assigningWarehouse ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWarehouseWidget(false)
                      setSelectedWarehouse('')
                      setWarehouseLocation('')
                    }}
                    disabled={assigningWarehouse}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(100, 116, 139, 0.2)',
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: assigningWarehouse ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Context-Aware Action Buttons */}
        <div className="form-actions" style={{ marginTop: 12, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {order.status === 'pending' && (
            <button
              disabled={updating || !receiverInfo.receiver_name}
              onClick={() => setStatus('processing')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: updating ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: updating ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}
              onMouseOver={(e) => {
                if (!updating) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                if (!updating) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
                }
              }}
            >
              📦 Start Processing
            </button>
          )}

          {order.status === 'processing' && (
            <>
              <button
                disabled={updating}
                onClick={() => setStatus('fulfilled')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: updating ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (!updating) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!updating) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)'
                  }
                }}
              >
                ✅ Ready to Ship
              </button>
              <button
                disabled={updating}
                onClick={() => setStatus('pending')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: updating ? 'rgba(100, 116, 139, 0.5)' : 'rgba(100, 116, 139, 0.2)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!updating) {
                    e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!updating) {
                    e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                ⏮️ Back to Pending
              </button>
            </>
          )}

          {order.status === 'fulfilled' && (
            <button
              disabled={updating}
              onClick={() => setStatus('processing')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: updating ? 'rgba(100, 116, 139, 0.5)' : 'rgba(100, 116, 139, 0.2)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: updating ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (!updating) {
                  e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseOut={(e) => {
                if (!updating) {
                  e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              ⏮️ Back to Processing
            </button>
          )}

          {order.status === 'canceled' && (
            <button
              disabled={updating}
              onClick={() => setStatus('pending')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: updating ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: updating ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
              }}
              onMouseOver={(e) => {
                if (!updating) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                if (!updating) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'
                }
              }}
            >
              🔄 Restore Order
            </button>
          )}
        </div>
      </div>


      {/* Package Summary - Only show when order is Ready to Ship (fulfilled) */}
      {order.status === 'fulfilled' && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📦 Package Information
          </h3>

          {order.quote_id ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                👤 Customer Name
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                {order.customer || 'N/A'}
              </div>
            </div>

            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚖️ Weight
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                {order.weight ? `${order.weight} kg` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 Total Items Inside
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                {order.items ? `${order.items} items` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📏 Dimensions
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                Length × Width × Height
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                {parseDimensions(order.dimensions)}
              </div>
            </div>

            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📍 Delivery Zone
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', textTransform: 'capitalize' }}>
                {order.delivery_zone ? order.delivery_zone.replace(/_/g, ' ') : 'N/A'}
              </div>
            </div>

            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 Package Type
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                {order.package_type || 'Standard'}
              </div>
            </div>

            <div>
              <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💵 Shipping Cost
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-600)' }}>
                {order.estimated_cost ? `₱${(order.estimated_cost / 100).toFixed(2)}` : 'N/A'}
              </div>
            </div>

            {/* Warehouse Location Column - Only shown if package is assigned */}
            {packageLocation && (
              <>
                <div>
                  <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏢 Warehouse
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    {packageLocation.warehouse}
                  </div>
                </div>

                <div>
                  <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📍 Shelf Location
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    {packageLocation.location}
                  </div>
                </div>
              </>
            )}

            {/* Receiver Information Column - Only shown if receiver info exists */}
            {receiverInfo.receiver_name && (
              <>
                <div style={{ gridColumn: '1 / -1', marginTop: 12, marginBottom: 4 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--primary-600)',
                    borderBottom: '2px solid var(--primary-200)',
                    paddingBottom: 8
                  }}>
                    📋 Receiver Information
                  </div>
                </div>

                <div>
                  <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👤 Receiver Name
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    {receiverInfo.receiver_name || 'N/A'}
                  </div>
                </div>

                <div>
                  <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📞 Contact Number
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    {receiverInfo.receiver_contact || 'N/A'}
                  </div>
                </div>

                <div>
                  <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📧 Email Address
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    {receiverInfo.receiver_email || 'N/A'}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📍 Delivery Address
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    {receiverInfo.receiver_address || 'N/A'}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="muted" style={{ padding: 16, background: 'var(--gray-50)', borderRadius: 8 }}>
            ℹ️ Package information not available. This order was not created from a quote.
          </div>
        )}

          {order.quote_id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                📋 Source: Quote Q-{String(order.quote_id).padStart(5, '0')}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}