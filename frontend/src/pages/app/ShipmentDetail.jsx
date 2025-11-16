import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getShipment, apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Toast from '../../components/Toast'

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

// Helper function to format dimensions nicely
function formatDimensions(dimensions) {
  if (!dimensions || dimensions === 'N/A') return 'N/A'

  // Try to parse JSON format first (e.g., {"L":50,"W":40,"H":30})
  try {
    const parsed = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions
    if (parsed && parsed.L && parsed.W && parsed.H) {
      return `${parsed.L}×${parsed.W}×${parsed.H}cm`
    }
  } catch (e) {
    // Not JSON, try string format
  }

  // Handle string format "50x40x30" or "50 x 40 x 30"
  const parts = dimensions.toString().toLowerCase().replace(/\s/g, '').split('x')
  if (parts.length === 3) {
    return `${parts[0]}×${parts[1]}×${parts[2]}cm`
  }

  return dimensions
}

export default function ShipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gpsLocation, setGpsLocation] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [showAddPackageModal, setShowAddPackageModal] = useState(false)
  const [availableOrders, setAvailableOrders] = useState([])
  const [selectedOrderToAdd, setSelectedOrderToAdd] = useState(null)
  const [removingPackage, setRemovingPackage] = useState(null)
  const [editingDriver, setEditingDriver] = useState(false)
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [updatingDriver, setUpdatingDriver] = useState(false)
  const [selectedOrdersToAdd, setSelectedOrdersToAdd] = useState([])
  const [editingBudget, setEditingBudget] = useState(false)
  const [availableBudgets, setAvailableBudgets] = useState([])
  const [selectedBudget, setSelectedBudget] = useState(null)
  const [updatingBudget, setUpdatingBudget] = useState(false)

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

  async function loadAvailableOrders() {
    try {
      // Get warehouse name from shipment origin
      const warehouseName = shipment.origin_name

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime()
      const response = await apiGet(`/api/orders?status=fulfilled&without_shipment=true&_t=${timestamp}`)
      let orders = response?.data || []

      console.log('Available orders (without shipment):', orders)

      // Normalize the data to ensure order_id field exists consistently
      orders = orders.map(order => ({
        ...order,
        order_id: order.id || order.order_id // API returns 'id', but we use 'order_id' consistently
      }))

      // Filter orders to only show those from the same warehouse
      if (warehouseName) {
        orders = orders.filter(order => order.warehouse === warehouseName)
        console.log(`Filtered orders for warehouse "${warehouseName}":`, orders)
      }

      setAvailableOrders(orders)
    } catch (e) {
      console.error('Failed to load available orders:', e)
      setToast({ show: true, message: 'Failed to load available orders', type: 'error' })
    }
  }

  async function handleAddPackage() {
    setShowAddPackageModal(true)
    await loadAvailableOrders()
  }

  async function handleConfirmAddPackage() {
    console.log('handleConfirmAddPackage called')
    console.log('selectedOrdersToAdd:', selectedOrdersToAdd)

    if (selectedOrdersToAdd.length === 0) {
      setToast({ show: true, message: 'Please select at least one order to add', type: 'warning' })
      return
    }

    console.log('Adding packages:', selectedOrdersToAdd)

    try {
      let successCount = 0
      let failedOrders = []

      for (const orderId of selectedOrdersToAdd) {
        try {
          console.log(`Adding package with order_id: ${orderId}`)
          await apiPost(`/api/shipments/${id}/packages`, { order_id: orderId })
          successCount++
        } catch (err) {
          console.error(`Failed to add order ${orderId}:`, err)
          failedOrders.push({ orderId, error: err.message })
        }
      }

      if (successCount > 0) {
        setToast({ show: true, message: `${successCount} package(s) added successfully`, type: 'success' })
        setShowAddPackageModal(false)
        setSelectedOrdersToAdd([])
        await load()
      }

      if (failedOrders.length > 0) {
        const errorMsg = failedOrders.map(f => `Order ${f.orderId}: ${f.error}`).join('; ')
        setToast({ show: true, message: `Failed to add some packages: ${errorMsg}`, type: 'error' })
      }
    } catch (e) {
      console.error('Error in handleConfirmAddPackage:', e)
      setToast({ show: true, message: e.message || 'Failed to add package', type: 'error' })
    }
  }

  async function handleRemovePackage(orderId) {
    // Check if this is the last package
    if (shipment.packages.length <= 1) {
      setToast({ show: true, message: 'Cannot remove the last package from a shipment', type: 'error' })
      return
    }

    if (!confirm('Are you sure you want to remove this package from the shipment?')) {
      return
    }

    setRemovingPackage(orderId)
    try {
      const response = await apiDelete(`/api/shipments/${id}/packages/${orderId}`)
      setToast({ show: true, message: 'Package removed successfully', type: 'success' })

      // If the current shipment_id was deleted and we got a new one, redirect to it
      if (response?.data?.redirect_to_shipment_id && response.data.redirect_to_shipment_id !== parseInt(id)) {
        navigate(`/app/shipments/${response.data.redirect_to_shipment_id}`)
      } else {
        await load() // Reload shipment data
      }
    } catch (e) {
      setToast({ show: true, message: e.message || 'Failed to remove package', type: 'error' })
    } finally {
      setRemovingPackage(null)
    }
  }

  async function loadDrivers() {
    try {
      const response = await apiGet('/api/users?role=driver')
      setAvailableDrivers(response?.data || [])
    } catch (e) {
      console.error('Failed to load drivers:', e)
      setToast({ show: true, message: 'Failed to load drivers', type: 'error' })
    }
  }

  async function handleEditDriver() {
    setEditingDriver(true)
    setSelectedDriver(shipment.driver_id)
    await loadDrivers()
  }

  async function handleSaveDriver() {
    if (selectedDriver === shipment.driver_id) {
      setEditingDriver(false)
      return
    }

    setUpdatingDriver(true)
    try {
      await apiPatch(`/api/shipments/${id}`, { driver_id: selectedDriver })
      setToast({ show: true, message: 'Driver updated successfully', type: 'success' })
      setEditingDriver(false)
      await load()
    } catch (e) {
      setToast({ show: true, message: e.message || 'Failed to update driver', type: 'error' })
    } finally {
      setUpdatingDriver(false)
    }
  }

  function handleCancelEdit() {
    setEditingDriver(false)
    setSelectedDriver(null)
  }

  async function loadBudgets() {
    try {
      const response = await apiGet('/api/budgets')
      setAvailableBudgets(response?.data || [])
    } catch (e) {
      console.error('Failed to load budgets:', e)
      setToast({ show: true, message: 'Failed to load budgets', type: 'error' })
    }
  }

  async function handleEditBudget() {
    setEditingBudget(true)
    setSelectedBudget(shipment.budget_id)
    await loadBudgets()
  }

  async function handleSaveBudget() {
    if (selectedBudget === shipment.budget_id) {
      setEditingBudget(false)
      return
    }

    setUpdatingBudget(true)
    try {
      await apiPatch(`/api/shipments/${id}`, { budget_id: selectedBudget })
      setToast({ show: true, message: 'Budget updated successfully', type: 'success' })
      setEditingBudget(false)
      await load()
    } catch (e) {
      setToast({ show: true, message: e.message || 'Failed to update budget', type: 'error' })
    } finally {
      setUpdatingBudget(false)
    }
  }

  function handleCancelBudgetEdit() {
    setEditingBudget(false)
    setSelectedBudget(null)
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
        background: 'linear-gradient(135deg, #3b82f6 0%, #ea580c 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              📦 Shipment Details
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontFamily: 'monospace' }}>
              {shipment.id}
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
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {/* Status */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🧭 Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '6px 10px',
                borderRadius: 999,
                fontSize: '12px',
                fontWeight: 800,
                background: shipment.status === 'delivered' ? 'rgba(16,185,129,0.2)' : shipment.status === 'out_for_delivery' ? 'rgba(249,115,22,0.2)' : shipment.status === 'in_transit' ? 'rgba(59,130,246,0.2)' : shipment.status === 'cancelled' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                color: shipment.status === 'delivered' ? '#10b981' : shipment.status === 'out_for_delivery' ? '#f97316' : shipment.status === 'in_transit' ? '#3b82f6' : shipment.status === 'cancelled' ? '#ef4444' : '#f59e0b',
                border: `1px solid ${shipment.status === 'delivered' ? 'rgba(16,185,129,0.4)' : shipment.status === 'out_for_delivery' ? 'rgba(249,115,22,0.4)' : shipment.status === 'in_transit' ? 'rgba(59,130,246,0.4)' : shipment.status === 'cancelled' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`
              }}>
                {shipment.status === 'delivered' ? '✓ ' : shipment.status === 'out_for_delivery' ? '🚚 ' : shipment.status === 'in_transit' ? '📍 ' : shipment.status === 'cancelled' ? '✖ ' : '⏳ '}
                {shipment.status.replace(/_/g, ' ')}
              </span>
              {shipment.status === 'pending' && (
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>In warehouse</span>
              )}
              {(shipment.status === 'in_transit' || shipment.status === 'out_for_delivery') && (
                <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>On the road</span>
              )}
              {shipment.status === 'delivered' && (
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Delivered</span>
              )}
            </div>
          </div>

          {/* Driver (editable) */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 Driver
              {!editingDriver && (
                <button onClick={handleEditDriver} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '14px', padding: 0 }}>✏️</button>
              )}
            </div>
            {editingDriver ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={selectedDriver || ''}
                  onChange={(e) => setSelectedDriver(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={updatingDriver}
                  style={{ padding: '8px', fontSize: '14px', background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                  {availableDrivers.map((driver) => (
                    <option key={driver.user_id} value={driver.user_id} style={{ background: '#1a1a1a', color: 'white' }}>
                      {driver.username}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSaveDriver} disabled={updatingDriver} style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', color: '#10b981', cursor: updatingDriver ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    {updatingDriver ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEdit} disabled={updatingDriver} style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#ef4444', cursor: updatingDriver ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 700 }}>{shipment.driver || 'N/A'}</div>
            )}
          </div>

          {/* Budget (editable) */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              💰 Budget
              {!editingBudget && (
                <button onClick={handleEditBudget} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '14px', padding: 0 }}>✏️</button>
              )}
            </div>
            {editingBudget ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={selectedBudget || ''}
                  onChange={(e) => setSelectedBudget(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={updatingBudget}
                  style={{ padding: '8px', fontSize: '14px', background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                  {availableBudgets.map((budget) => (
                    <option key={budget.id} value={budget.id} style={{ background: '#1a1a1a', color: 'white' }}>
                      {budget.budget_name}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSaveBudget} disabled={updatingBudget} style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', color: '#10b981', cursor: updatingBudget ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    {updatingBudget ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelBudgetEdit} disabled={updatingBudget} style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#ef4444', cursor: updatingBudget ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 700 }}>
                {shipment.budget_name || 'N/A'}
                {shipment.total_budget && (
                  <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 800, marginTop: '4px' }}>
                    ₱{parseFloat(shipment.total_budget).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vehicle */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🚗 Vehicle</div>
            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{shipment.vehicle || shipment.registration_number || 'N/A'} <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>({shipment.vehicle_type || 'N/A'})</span></div>
          </div>

          {/* Origin */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🏢 Origin</div>
            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{shipment.origin_name || 'N/A'}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{shipment.origin_address || '—'}</div>
          </div>

          {/* Dates */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🗓 Dates</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Created</div>
            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 6 }}>{new Date(shipment.creation_date).toLocaleDateString()}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{shipment.status === 'pending' ? 'Estimated departure' : 'Departure'}</div>
            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{shipment.departure_date ? new Date(shipment.departure_date).toLocaleString() : 'Not set'}</div>
          </div>
        </div>
      </div>

      {/* Packages List */}
      {shipment.packages && shipment.packages.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '28px',
          border: '2px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>
              📦 Packages in This Shipment ({shipment.packages.length})
            </h3>
            <button
              onClick={handleAddPackage}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                color: '#10b981',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              + Add Package
            </button>
          </div>
          <div className="grid" style={{ gap: 16 }}>
            {shipment.packages.map((pkg) => {
              const getPackageIcon = (type) => {
                switch(type?.toLowerCase()) {
                  case 'document': return '📄'
                  case 'perishable': return '🧊'
                  case 'fragile': return '📦'
                  case 'hazardous': return '⚠️'
                  default: return '📦'
                }
              }

              return (
                <div
                  key={pkg.order_id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                >
                  <button
                    onClick={() => handleRemovePackage(pkg.order_id)}
                    disabled={removingPackage === pkg.order_id || shipment.packages.length <= 1}
                    title={shipment.packages.length <= 1 ? 'Cannot remove the last package from a shipment' : 'Remove package'}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '6px',
                      fontSize: '14px',
                      background: shipment.packages.length <= 1 ? 'rgba(100, 116, 139, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: shipment.packages.length <= 1 ? '1px solid rgba(100, 116, 139, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '6px',
                      color: shipment.packages.length <= 1 ? '#64748b' : '#ef4444',
                      cursor: (removingPackage === pkg.order_id || shipment.packages.length <= 1) ? 'not-allowed' : 'pointer',
                      fontWeight: '700',
                      opacity: (removingPackage === pkg.order_id || shipment.packages.length <= 1) ? 0.5 : 1
                    }}
                  >
                    ✕
                  </button>

                  {/* Tracking Number & Customer Name with Package Type Watermark */}
                  <div style={{ marginBottom: '16px', paddingRight: '32px', position: 'relative', minHeight: '50px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px', fontFamily: 'monospace' }}>
                      {pkg.tracking_number || 'No Tracking #'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '4px', position: 'relative', zIndex: 2 }}>
                      {pkg.customer_name}
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      right: '-10px',
                      fontSize: '48px',
                      fontWeight: '900',
                      color: 'rgba(59, 130, 246, 0.12)',
                      textTransform: 'uppercase',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      letterSpacing: '2px',
                      lineHeight: '1',
                      zIndex: 1,
                      whiteSpace: 'nowrap'
                    }}>
                      {pkg.package_type || 'Standard'}
                    </div>
                  </div>

                  {/* Receiver Details */}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Receiver Name
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {pkg.receiver_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Contact Number
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {pkg.receiver_contact || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Receiver Address
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {pkg.receiver_address || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Delivery Zone
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {pkg.delivery_zone || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Shipping Cost
                      </div>
                      <div style={{ fontSize: '18px', color: '#10b981', fontWeight: '800' }}>
                        ₱{pkg.actual_price || pkg.shipping_fee || '0.00'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
            {gpsLoading && <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '600' }}>Updating...</span>}
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
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>
                Latitude
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {gpsLocation.latitude.toFixed(6)}
              </div>
            </div>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>
                Longitude
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {gpsLocation.longitude.toFixed(6)}
              </div>
            </div>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>
                Accuracy
              </div>
              <div style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>
                {gpsLocation.accuracy.toFixed(0)}m
              </div>
            </div>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>
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

      {/* Smart Consolidated Tracking History */}
      {(() => {
        // Consolidate all tracking events from master and packages
        const allEvents = []

        // Add master tracking events
        if (shipment.master_tracking) {
          shipment.master_tracking.forEach(event => {
            allEvents.push({
              ...event,
              type: 'master',
              packages: []
            })
          })
        }

        // Add package tracking events and group by timestamp + status
        if (shipment.package_tracking && shipment.packages) {
          const packageEventGroups = {}

          shipment.packages.forEach(pkg => {
            const pkgHistory = shipment.package_tracking[pkg.tracking_id] || []
            pkgHistory.forEach(event => {
              // Create a grouping key based on timestamp (rounded to minute) and status
              const eventTime = new Date(event.timestamp)
              const groupKey = `${eventTime.getFullYear()}-${eventTime.getMonth()}-${eventTime.getDate()}-${eventTime.getHours()}-${eventTime.getMinutes()}-${event.status}-${event.location}`

              if (!packageEventGroups[groupKey]) {
                packageEventGroups[groupKey] = {
                  ...event,
                  type: 'package',
                  packages: []
                }
              }

              packageEventGroups[groupKey].packages.push({
                tracking_id: pkg.tracking_id,
                customer_name: pkg.customer_name,
                receiver_name: pkg.receiver_name,
                status: pkg.status
              })
            })
          })

          Object.values(packageEventGroups).forEach(group => allEvents.push(group))
        }

        // Sort by timestamp descending
        allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

        return allEvents.length > 0 ? (
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
              {allEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '20px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${
                      event.status === 'delivered' ? '#10b981' :
                      event.status === 'in_transit' || event.status === 'out_for_delivery' ? '#3b82f6' :
                      event.status === 'picked_up' ? '#10b981' :
                      event.status === 'pending' ? '#f59e0b' : '#ef4444'
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
                  {/* Header with status and timestamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span className={getStatusBadgeClass(event.status)} style={{ fontSize: '12px', padding: '6px 12px', fontWeight: '700' }}>
                          {event.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {event.packages.length > 0 && (
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            borderRadius: '6px',
                            fontWeight: '600',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                          }}>
                            {event.packages.length} package{event.packages.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'white', marginBottom: '4px' }}>
                        {event.location}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {new Date(event.timestamp).toLocaleDateString()}<br />
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Details */}
                  {event.details && (
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6', marginBottom: event.packages.length > 0 ? '12px' : '0' }}>
                      {event.details}
                    </div>
                  )}

                  {/* Package list if this is a grouped package event */}
                  {event.packages.length > 0 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#60a5fa',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        📦 Packages Affected:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {event.packages.map((pkg, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '13px',
                              color: 'rgba(255, 255, 255, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '6px'
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#60a5fa' }}>
                              {pkg.tracking_id}
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
                            <span style={{ fontWeight: '600' }}>{pkg.receiver_name}</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                              ({pkg.customer_name})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null
      })()}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Add Package Modal */}
      {showAddPackageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(26, 26, 26, 0.98)',
            borderRadius: '16px',
            padding: '0',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '85vh',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '2px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: 'white' }}>
                Add Packages to Shipment
              </h3>
              {shipment.origin_name && (
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  📦 Showing packages from <span style={{ color: '#3b82f6', fontWeight: '600' }}>{shipment.origin_name}</span>
                </p>
              )}
            </div>

            {/* Vehicle Capacity - Real-time calculation */}
            {(() => {
              // Calculate weight of selected packages to add
              const selectedWeight = selectedOrdersToAdd.reduce((sum, orderId) => {
                const order = availableOrders.find(o => o.order_id === orderId)
                return sum + (parseFloat(order?.weight) || 0)
              }, 0)

              // Calculate volume of selected packages to add
              const calculateVolume = (dimensions) => {
                if (!dimensions || dimensions === 'N/A') return 0
                const parts = dimensions.split('x').map(p => parseFloat(p.trim()))
                if (parts.length === 3 && parts.every(p => !isNaN(p))) {
                  return (parts[0] * parts[1] * parts[2]) / 1000000 // Convert cm³ to m³
                }
                return 0
              }

              const selectedVolume = selectedOrdersToAdd.reduce((sum, orderId) => {
                const order = availableOrders.find(o => o.order_id === orderId)
                return sum + calculateVolume(order?.dimensions)
              }, 0)

              // Calculate new totals (current + selected)
              const currentWeight = parseFloat(shipment.total_weight) || 0
              const currentVolume = parseFloat(shipment.total_volume) || 0
              const newTotalWeight = currentWeight + selectedWeight
              const newTotalVolume = currentVolume + selectedVolume

              // Calculate percentages
              const newWeightPercent = shipment.vehicle_capacity > 0 ? (newTotalWeight / shipment.vehicle_capacity) * 100 : 0
              const newVolumePercent = shipment.vehicle_volume_capacity > 0 ? (newTotalVolume / shipment.vehicle_volume_capacity) * 100 : 0

              return (
                <div style={{ padding: '20px 32px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                    📊 Vehicle Capacity Preview
                  </h4>
                  <div className="grid" style={{ gridTemplateColumns: (shipment.vehicle_volume_capacity > 0 ? '1fr 1fr' : '1fr'), gap: 12 }}>
                    {/* Weight */}
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>⚖️ Weight</div>
                        {shipment.vehicle_capacity > 0 && (
                          <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11px', fontWeight: 800 }}>
                            {newTotalWeight.toFixed(1)}kg / {shipment.vehicle_capacity}kg ({Math.round(newWeightPercent)}%)
                          </span>
                        )}
                      </div>
                      {shipment.vehicle_capacity > 0 && (
                        <>
                          <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(newWeightPercent, 100)}%`,
                              background: newWeightPercent > 95
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : newWeightPercent > 80
                                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                : 'linear-gradient(90deg, #10b981, #059669)',
                              boxShadow: '0 0 12px rgba(16,185,129,0.4)',
                              transition: 'width 0.35s ease'
                            }} />
                          </div>
                          {selectedWeight > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                              Current: {currentWeight.toFixed(1)}kg → New: {newTotalWeight.toFixed(1)}kg (+{selectedWeight.toFixed(1)}kg)
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Volume */}
                    {shipment.vehicle_volume_capacity > 0 && (
                      <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>📦 Volume</div>
                          <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', color: '#a78bfa', fontSize: '11px', fontWeight: 800 }}>
                            {newTotalVolume.toFixed(2)}m³ / {shipment.vehicle_volume_capacity}m³ ({Math.round(newVolumePercent)}%)
                          </span>
                        </div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(newVolumePercent, 100)}%`,
                            background: newVolumePercent > 95
                              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                              : newVolumePercent > 80
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                              : 'linear-gradient(90deg, #a78bfa, #8b5cf6)',
                            boxShadow: '0 0 12px rgba(99,102,241,0.35)',
                            transition: 'width 0.35s ease'
                          }} />
                        </div>
                        {selectedVolume > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                            Current: {currentVolume.toFixed(2)}m³ → New: {newTotalVolume.toFixed(2)}m³ (+{selectedVolume.toFixed(2)}m³)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#3b82f6', marginBottom: '16px' }}>
                Select Orders ({selectedOrdersToAdd.length} selected)
              </label>

              {availableOrders.length === 0 ? (
                <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#f59e0b', fontSize: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                  No available packages found from this warehouse.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {availableOrders.map((order) => (
                    <div
                      key={order.order_id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '16px',
                        background: selectedOrdersToAdd.includes(order.order_id)
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: `2px solid ${selectedOrdersToAdd.includes(order.order_id)
                          ? 'rgba(59, 130, 246, 0.5)'
                          : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        console.log('Package card clicked, order_id:', order.order_id)
                        console.log('Current selectedOrdersToAdd:', selectedOrdersToAdd)
                        if (selectedOrdersToAdd.includes(order.order_id)) {
                          const newSelected = selectedOrdersToAdd.filter(id => id !== order.order_id)
                          console.log('Removing order_id, new selection:', newSelected)
                          setSelectedOrdersToAdd(newSelected)
                        } else {
                          const newSelected = [...selectedOrdersToAdd, order.order_id]
                          console.log('Adding order_id, new selection:', newSelected)
                          setSelectedOrdersToAdd(newSelected)
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedOrdersToAdd.includes(order.order_id)) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedOrdersToAdd.includes(order.order_id)) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrdersToAdd.includes(order.order_id)}
                        onChange={() => {}}
                        style={{
                          width: '20px',
                          height: '20px',
                          marginRight: '14px',
                          marginTop: '2px',
                          cursor: 'pointer',
                          accentColor: '#3b82f6',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Order Number & Customer */}
                        <div style={{
                          fontWeight: '700',
                          color: 'rgba(255, 255, 255, 0.95)',
                          marginBottom: '8px',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ color: '#60a5fa' }}>{order.order_number || order.po}</span>
                          <span style={{
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontWeight: '400',
                            fontSize: '12px'
                          }}>•</span>
                          <span style={{ fontWeight: '600' }}>{order.customer_name || order.customer || 'Unknown Customer'}</span>
                        </div>

                        {/* Package Details Grid (2x2) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px',
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginBottom: '8px'
                        }}>
                          {/* Items Count */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}>
                            <span>📦</span>
                            <span style={{ fontWeight: '600', color: '#a78bfa' }}>
                              {order.items || 0} item{order.items !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Dimensions */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            borderRadius: '6px',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                          }}>
                            <span>📐</span>
                            <span style={{ fontWeight: '600', color: '#4ade80' }}>
                              {order.dimensions && order.dimensions !== 'N/A' ? formatDimensions(order.dimensions) : 'N/A'}
                            </span>
                          </div>

                          {/* Delivery Zone */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            background: 'rgba(249, 115, 22, 0.2)',
                            borderRadius: '6px',
                            border: '1px solid rgba(249, 115, 22, 0.3)'
                          }}>
                            <span>📍</span>
                            <span style={{ fontWeight: '600', color: '#fb923c', textTransform: 'capitalize' }}>
                              {order.delivery_zone && order.delivery_zone !== 'N/A' ? order.delivery_zone.replace(/_/g, ' ') : 'N/A'}
                            </span>
                          </div>

                          {/* Package Type */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            background: order.package_type?.toLowerCase() === 'fragile' ? 'rgba(239, 68, 68, 0.2)' :
                                       order.package_type?.toLowerCase() === 'hazardous' ? 'rgba(249, 115, 22, 0.2)' :
                                       order.package_type?.toLowerCase() === 'keep upright' ? 'rgba(234, 179, 8, 0.2)' :
                                       'rgba(100, 116, 139, 0.2)',
                            borderRadius: '6px',
                            border: `1px solid ${order.package_type?.toLowerCase() === 'fragile' ? 'rgba(239, 68, 68, 0.4)' :
                                                  order.package_type?.toLowerCase() === 'hazardous' ? 'rgba(249, 115, 22, 0.4)' :
                                                  order.package_type?.toLowerCase() === 'keep upright' ? 'rgba(234, 179, 8, 0.4)' :
                                                  'rgba(100, 116, 139, 0.4)'}`,
                            fontSize: '11px',
                            fontWeight: '700',
                            color: order.package_type?.toLowerCase() === 'fragile' ? '#ef4444' :
                                   order.package_type?.toLowerCase() === 'hazardous' ? '#f97316' :
                                   order.package_type?.toLowerCase() === 'keep upright' ? '#eab308' :
                                   '#94a3b8'
                          }}>
                            <span>{order.package_type?.toLowerCase() === 'fragile' ? '⚠️' :
                                   order.package_type?.toLowerCase() === 'hazardous' ? '☢️' :
                                   order.package_type?.toLowerCase() === 'keep upright' ? '⬆️' : '📦'}</span>
                            <span>{order.package_type || 'Standard'}</span>
                          </div>
                        </div>

                        {/* Warehouse Location */}
                        {order.warehouse && (
                          <div style={{
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>🏢</span>
                            <span style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' }}>
                              {order.warehouse}
                            </span>
                            {order.warehouse_location && (
                              <>
                                <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
                                <span>{order.warehouse_location}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Receiver Information */}
                        {order.receiver_name && (
                          <div style={{
                            marginTop: '8px',
                            padding: '10px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                          }}>
                            <div style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              color: '#60a5fa',
                              marginBottom: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              📍 Delivery To
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: 'rgba(255, 255, 255, 0.9)',
                              lineHeight: '1.5'
                            }}>
                              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '13px' }}>
                                👤 {order.receiver_name}
                              </div>
                              {order.receiver_contact && (
                                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px', marginBottom: '3px' }}>
                                  📞 {order.receiver_contact}
                                </div>
                              )}
                              {order.receiver_address && (
                                <div style={{
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  fontSize: '11px',
                                  marginTop: '4px',
                                  lineHeight: '1.4'
                                }}>
                                  📍 {order.receiver_address}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Weight Badge (Right Side) */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: 'rgba(59, 130, 246, 0.25)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        flexShrink: 0,
                        marginLeft: '12px'
                      }}>
                        <span style={{ fontSize: '16px' }}>⚖️</span>
                        <span>{order.weight ? `${parseFloat(order.weight).toFixed(1)}kg` : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 32px', borderTop: '2px solid rgba(59, 130, 246, 0.2)', background: 'rgba(0, 0, 0, 0.3)' }}>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddPackageModal(false)
                    setSelectedOrdersToAdd([])
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddPackage}
                  disabled={selectedOrdersToAdd.length === 0}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: selectedOrdersToAdd.length > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    color: selectedOrdersToAdd.length > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.3)',
                    cursor: selectedOrdersToAdd.length > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: '600'
                  }}
                >
                  Add {selectedOrdersToAdd.length > 0 ? `${selectedOrdersToAdd.length} ` : ''}Package{selectedOrdersToAdd.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}