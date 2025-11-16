import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShipments, updateShipmentStatus, apiGet, apiPost } from '../../lib/api'
import { can } from '../../lib/permissions'
import Toast from '../../components/Toast'
import * as Ably from 'ably'

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('any')
  const navigate = useNavigate()

  // Create Shipment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [readyOrders, setReadyOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [budgets, setBudgets] = useState([])
  const [toast, setToast] = useState(null)

  // Form State
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('') // Warehouse filter
  const [selectedOrders, setSelectedOrders] = useState([]) // Multiple package selection
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')
  const [departureDate, setDepartureDate] = useState('')

  async function fetchShipments(params = {}) {
    setLoading(true)
    setError('')
    try {
      const res = await getShipments(params)
      // Sort shipments: put delivered shipments last
      const sortedData = (res?.data || []).sort((a, b) => {
        if (a.status === 'delivered' && b.status !== 'delivered') return 1
        if (a.status !== 'delivered' && b.status === 'delivered') return -1
        return 0
      })
      setShipments(sortedData)
    } catch (e) {
      setError(e.message || 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }

  async function loadCreateShipmentData() {
    try {
      // Load orders with status "fulfilled" (ready to ship) and without shipments - backend now returns all needed data!
      const ordersRes = await apiGet('/api/orders?status=fulfilled&without_shipment=true&limit=50')
      console.log('Loaded orders:', ordersRes?.data)

      // Map orders to include order_id consistently - no need for individual API calls!
      const ordersWithDetails = (ordersRes?.data || []).map(order => {
        const orderData = {
          ...order,
          order_id: order.id || order.order_id, // Ensure we have order_id consistently
          customer_name: order.customer || 'Unknown Customer',
          weight: order.weight || 0,
          dimensions: order.dimensions || 'N/A',
          delivery_zone: order.delivery_zone || 'N/A',
          package_type: order.package_type || 'Standard',
          receiver_name: order.receiver_name || '',
          receiver_contact: order.receiver_contact || '',
          receiver_email: order.receiver_email || '',
          receiver_address: order.receiver_address || '',
          warehouse: order.warehouse || null,
          warehouse_location: order.warehouse_location || null,
        }
        console.log('Order data with order_id:', orderData.order_id, orderData)
        return orderData
      })

      setReadyOrders(ordersWithDetails)

      // Load drivers (exclude those already assigned to active shipments)
      const driversRes = await apiGet('/api/drivers?exclude_assigned=true')
      console.log('Loaded drivers:', driversRes?.data)
      setDrivers(driversRes?.data || [])

      // Load vehicles (exclude those already assigned to active shipments)
      const vehiclesRes = await apiGet('/api/transport?exclude_assigned=true')
      console.log('Loaded vehicles:', vehiclesRes?.data)
      setVehicles(vehiclesRes?.data || [])

      // Load budgets
      const budgetsRes = await apiGet('/api/budgets')
      console.log('Loaded budgets:', budgetsRes?.data)
      setBudgets(budgetsRes?.data || [])
    } catch (e) {
      console.error('Failed to load data:', e)
      setToast({ message: 'Failed to load data for shipment creation', type: 'error' })
    }
  }

  // Helper function to calculate volume from dimensions (L x W x H in cm -> m³)
  function calculateVolume(dimensions) {
    if (!dimensions || dimensions === 'N/A') return 0

    let length, width, height

    // Try to parse as JSON first (format: {"L":50,"W":40,"H":30})
    try {
      const parsed = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions
      if (parsed && typeof parsed === 'object' && parsed.L && parsed.W && parsed.H) {
        length = parseFloat(parsed.L)
        width = parseFloat(parsed.W)
        height = parseFloat(parsed.H)
      }
    } catch (e) {
      // Not JSON, try string format
    }

    // If not JSON, try string format: "LxWxH" or "L x W x H" (in cm)
    if (!length || !width || !height) {
      const parts = dimensions.toString().toLowerCase().replace(/\s/g, '').split('x')
      if (parts.length !== 3) return 0

      const parsed = parts.map(p => parseFloat(p))
      if (parsed.some(isNaN)) return 0

      length = parsed[0]
      width = parsed[1]
      height = parsed[2]
    }

    if (isNaN(length) || isNaN(width) || isNaN(height)) return 0

    // Convert cm³ to m³
    return (length * width * height) / 1000000
  }

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

  async function handleCreateShipment(e) {
    e.preventDefault()

    // Validation
    if (!selectedVehicle) {
      setToast({ message: 'Please select a vehicle', type: 'warning' })
      return
    }
    if (selectedOrders.length === 0) {
      setToast({ message: 'Please select at least one package', type: 'warning' })
      return
    }
    if (!selectedDriver) {
      setToast({ message: 'Please select a driver', type: 'warning' })
      return
    }
    if (!selectedBudget) {
      setToast({ message: 'Please select a budget', type: 'warning' })
      return
    }
    if (!departureDate) {
      setToast({ message: 'Please select a departure date', type: 'warning' })
      return
    }

    // Check BOTH weight and volume capacity
    const vehicle = vehicles.find(v => v.id === parseInt(selectedVehicle))

    // Calculate total weight
    const totalWeight = selectedOrders.reduce((sum, orderId) => {
      const order = readyOrders.find(o => o.order_id === orderId)
      return sum + (parseFloat(order?.weight) || 0)
    }, 0)

    // Calculate total volume
    const totalVolume = selectedOrders.reduce((sum, orderId) => {
      const order = readyOrders.find(o => o.order_id === orderId)
      return sum + calculateVolume(order?.dimensions)
    }, 0)

    // Check weight capacity - validate against total capacity (current load + new packages)
    const usedWeightCapacity = vehicle ? (parseFloat(vehicle.capacity) - parseFloat(vehicle.available_capacity)) : 0
    const currentWeightLoad = usedWeightCapacity + totalWeight
    const weightPercentFull = vehicle ? (currentWeightLoad / parseFloat(vehicle.capacity)) * 100 : 0

    if (weightPercentFull > 100) {
      setToast({
        message: `Weight capacity exceeded! Total load would be ${currentWeightLoad.toFixed(1)}kg / ${vehicle.capacity}kg (${weightPercentFull.toFixed(1)}%). Please reduce packages or select a different vehicle.`,
        type: 'error'
      })
      return
    }

    // Check volume capacity (if vehicle has volume capacity set)
    const hasVolumeCapacity = vehicle && vehicle.volume_capacity > 0
    if (hasVolumeCapacity) {
      const usedVolumeCapacity = parseFloat(vehicle.volume_capacity) - (vehicle.available_volume_capacity || vehicle.volume_capacity)
      const currentVolumeLoad = usedVolumeCapacity + totalVolume
      const volumePercentFull = (currentVolumeLoad / parseFloat(vehicle.volume_capacity)) * 100

      if (volumePercentFull > 100) {
        setToast({
          message: `Volume capacity exceeded! Total load would be ${currentVolumeLoad.toFixed(2)}m³ / ${vehicle.volume_capacity}m³ (${volumePercentFull.toFixed(1)}%). Please reduce packages or select a different vehicle.`,
          type: 'error'
        })
        return
      }
    }

    setCreating(true)
    try {
      // Create batch shipment with all selected orders
      // Backend generates ONE master tracking number for the shipment
      // and unique tracking numbers for each customer
      const response = await apiPost('/api/shipments/batch', {
        order_ids: selectedOrders,
        driver_id: selectedDriver,
        transport_id: selectedVehicle,
        budget_id: selectedBudget,
        departure_date: departureDate
      })

      const emailsSent = response?.data?.emails_sent || 0
      const emailsFailed = response?.data?.emails_failed || 0

      let message = `${selectedOrders.length} shipment(s) created successfully!`
      if (emailsSent > 0) {
        message += ` ${emailsSent} tracking email(s) sent to customers.`
      }
      if (emailsFailed > 0) {
        message += ` ${emailsFailed} email(s) failed to send.`
      }

      setToast({ message, type: 'success' })
      setShowCreateModal(false)

      // Reset form
      setSelectedVehicle('')
      setSelectedWarehouse('')
      setSelectedOrders([])
      setSelectedDriver('')
      setSelectedBudget('')
      setDepartureDate('')

      // Refresh shipments list
      await fetchShipments({ q, status })
    } catch (e) {
      setToast({ message: e.message || 'Failed to create shipment', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchShipments({ q, status })
  }, [q, status])

  // Real-time updates via Ably
  useEffect(() => {
    // Get organization_id from auth data
    let organizationId = null
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        organizationId = parsed.user?.organization_id
      }
    } catch (e) {
      console.error('Failed to parse auth data:', e)
    }

    console.log('Setting up Ably subscription for organization:', organizationId)

    if (!organizationId) {
      console.warn('No organization_id found, skipping Ably subscription')
      return
    }

    // Connect to Ably
    const ably = new Ably.Realtime({
      key: import.meta.env.VITE_ABLY_KEY,
    })

    ably.connection.on('connected', () => {
      console.log('✅ Ably connected successfully')
    })

    ably.connection.on('failed', () => {
      console.error('❌ Ably connection failed')
    })

    // Subscribe to organization channel for shipment updates
    // Using public channel for now (TODO: implement auth for private channels)
    const channelName = `public:organization.${organizationId}`
    console.log('📡 Subscribing to channel:', channelName)
    const channel = ably.channels.get(channelName)

    channel.subscribe('shipment.status.updated', (message) => {
      console.log('Shipment status updated in real-time:', message.data)

      // Update the shipment in the list
      setShipments((prevShipments) => {
        const updated = prevShipments.map((shipment) => {
          if (shipment.id === message.data.shipment_id) {
            console.log(`✅ Updating shipment ${shipment.id} from ${shipment.status} to ${message.data.new_status}`)
            return {
              ...shipment,
              status: message.data.new_status,
            }
          }
          return shipment
        })

        // Re-sort: delivered shipments go last
        return updated.sort((a, b) => {
          if (a.status === 'delivered' && b.status !== 'delivered') return 1
          if (a.status !== 'delivered' && b.status === 'delivered') return -1
          return 0
        })
      })

      // Show a toast notification (optional)
      console.log(`📦 Shipment ${message.data.tracking_number} is now ${message.data.new_status}`)
    })

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
      ably.close()
    }
  }, [])


  function getStatusBadgeClass(status) {
    switch (status) {
      case 'delivered': return 'badge success'
      case 'picked_up': return 'badge success'
      case 'in_transit': case 'out_for_delivery': return 'badge info'
      case 'pending': return 'badge warn'
      case 'cancelled': return 'badge danger'
      default: return 'badge'
    }
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              📦 Shipment Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Track and manage all shipments in real-time
            </p>
          </div>
          {can.manageShipments() && (
            <button
              onClick={() => {
                setShowCreateModal(true)
                loadCreateShipmentData()
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
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
              ✨ Create Shipment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: 'var(--gray-400)'
          }}>🔍</span>
          <input
            className="input"
            placeholder="Search tracking # or customer..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              paddingLeft: '48px',
              width: '100%',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              fontSize: '15px',
              padding: '14px 14px 14px 48px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6'
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="any">Status: Any</option>
          <option value="pending">Pending</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Loading shipments…
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {shipments.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                backdropFilter: 'blur(12px)',
                borderRadius: '18px',
                padding: '20px',
                position: 'relative',
                opacity: s.status === 'delivered' ? 0.8 : 1,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease'
              }}
              onMouseOver={(e) => {
                if (s.status !== 'delivered') {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))'
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.35)'
                }
              }}
              onMouseOut={(e) => {
                if (s.status !== 'delivered') {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)'
                }
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: (s.status === 'delivered' ? 'linear-gradient(180deg, #10b981, #059669)' : s.status === 'out_for_delivery' ? 'linear-gradient(180deg, #f97316, #ea580c)' : s.status === 'in_transit' ? 'linear-gradient(180deg, #3b82f6, #1d4ed8)' : s.status === 'cancelled' ? 'linear-gradient(180deg, #ef4444, #dc2626)' : 'linear-gradient(180deg, #f59e0b, #d97706)') }} />
              {s.status === 'delivered' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-25deg)',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#10b981',
                  opacity: 0.3,
                  pointerEvents: 'none',
                  zIndex: 1,
                  userSelect: 'none',
                  textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                }}>
                  ✓ DELIVERED
                </div>
              )}
              <button
                onClick={() => navigate(`/app/shipments/${s.id}`)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  padding: '8px 16px',
                  fontSize: '13px',
                  zIndex: 2,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                View Details →
              </button>

              {/* Header: Shipment ID & Status */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  fontFamily: 'monospace',
                  marginBottom: '8px'
                }}>
                  📦 {s.id}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Status moved into tiles below to free space here */}
                </div>
              </div>

              {/* Shipment Info */}
              <div style={{
                paddingBottom: '12px',
                marginBottom: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {/* Driver */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>👤 Driver</div>
                    <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{s.driver_name || 'N/A'}</div>
                  </div>

                  {/* Vehicle */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🚗 Vehicle</div>
                    <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{s.vehicle_registration} <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>({s.vehicle_type})</span></div>
                  </div>

                  {/* Origin */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🏢 Origin</div>
                    <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{s.origin_name || 'N/A'}</div>
                  </div>

                  {/* Budget */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>💰 Budget</div>
                    <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                      {s.budget_name || 'N/A'}
                      {s.budget_amount && (
                        <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 800, marginTop: '4px' }}>
                          ₱{s.budget_amount}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Packages */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>📦 Packages</div>
                    <div style={{ fontWeight: 700, color: '#60a5fa' }}>{s.package_count} {s.package_count === 1 ? 'package' : 'packages'}</div>
                  </div>

                  {/* Status */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🧭 Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        fontSize: '12px',
                        fontWeight: 800,
                        background: s.status === 'delivered' ? 'rgba(16,185,129,0.2)' : s.status === 'out_for_delivery' ? 'rgba(249,115,22,0.2)' : s.status === 'in_transit' ? 'rgba(59,130,246,0.2)' : s.status === 'cancelled' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: s.status === 'delivered' ? '#10b981' : s.status === 'out_for_delivery' ? '#f97316' : s.status === 'in_transit' ? '#3b82f6' : s.status === 'cancelled' ? '#ef4444' : '#f59e0b',
                        border: `1px solid ${s.status === 'delivered' ? 'rgba(16,185,129,0.4)' : s.status === 'out_for_delivery' ? 'rgba(249,115,22,0.4)' : s.status === 'in_transit' ? 'rgba(59,130,246,0.4)' : s.status === 'cancelled' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`
                      }}>
                        {s.status === 'delivered' ? '✓ ' : s.status === 'out_for_delivery' ? '🚚 ' : s.status === 'in_transit' ? '📍 ' : s.status === 'cancelled' ? '✖ ' : '⏳ '}
                        {s.status.replace(/_/g, ' ')}
                      </span>
                      {s.status === 'pending' && (
                        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>In warehouse</span>
                      )}
                      {(s.status === 'in_transit' || s.status === 'out_for_delivery') && (
                        <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>On the road</span>
                      )}
                      {s.status === 'delivered' && (
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Delivered</span>
                      )}
                    </div>
                  </div>

                  {/* Departure (conditional) */}
                  {s.departure_date && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                        {s.status === 'pending' ? '📅 Estimated Departure' : '🚀 Departed'}
                      </div>
                      <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                        {new Date(s.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Capacity Indicators */}
              <div style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.12)',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📊 Vehicle Capacity
                </div>

                <div className="grid" style={{ gridTemplateColumns: s.vehicle_volume_capacity > 0 ? '1fr 1fr' : '1fr', gap: 12 }}>
                  {/* Weight */}
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>⚖️ Weight</div>
                      {s.vehicle_capacity > 0 && (
                        <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11px', fontWeight: 800 }}>
                          {s.total_weight}kg / {s.vehicle_capacity}kg ({Math.round((s.total_weight / s.vehicle_capacity) * 100)}%)
                        </span>
                      )}
                    </div>
                    {s.vehicle_capacity > 0 && (
                      <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((s.total_weight / s.vehicle_capacity) * 100, 100)}%`,
                          background: ((s.total_weight / s.vehicle_capacity) * 100) > 95
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                            : ((s.total_weight / s.vehicle_capacity) * 100) > 80
                            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                            : 'linear-gradient(90deg, #10b981, #059669)',
                          boxShadow: '0 0 12px rgba(16,185,129,0.4)',
                          transition: 'width 0.35s ease'
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  {s.vehicle_volume_capacity > 0 && (
                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>📦 Volume</div>
                        <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', color: '#a78bfa', fontSize: '11px', fontWeight: 800 }}>
                          {s.total_volume.toFixed(2)}m³ / {s.vehicle_volume_capacity}m³ ({Math.round((s.total_volume / s.vehicle_volume_capacity) * 100)}%)
                        </span>
                      </div>
                      <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((s.total_volume / s.vehicle_volume_capacity) * 100, 100)}%`,
                          background: ((s.total_volume / s.vehicle_volume_capacity) * 100) > 95
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                            : ((s.total_volume / s.vehicle_volume_capacity) * 100) > 80
                            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                            : 'linear-gradient(90deg, #a78bfa, #8b5cf6)',
                          boxShadow: '0 0 12px rgba(99,102,241,0.35)',
                          transition: 'width 0.35s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Last Update / Tracking Info - Only show when in transit */}
              {s.current_location && (s.status === 'in_transit' || s.status === 'out_for_delivery') && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '10px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  fontSize: '12px'
                }}>
                  <div style={{
                    fontWeight: '700',
                    color: '#a78bfa',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    📍 Last Update
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontWeight: '600',
                    marginBottom: '2px'
                  }}>
                    {s.current_location}
                  </div>
                  {s.last_update && (
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      {new Date(s.last_update).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Created: {new Date(s.creation_date).toLocaleDateString()}
              </div>

              {/* Removed status update form - admins view only */}
            </div>
          ))}

          {shipments.length === 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                No shipments found
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Try adjusting your search or filter criteria
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) {
              setShowCreateModal(false)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              margin: 'auto',
              width: '100%',
              maxWidth: '600px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '32px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '28px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '22px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                ✨ Create New Shipment
              </h3>
            </div>

            <form onSubmit={handleCreateShipment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Dual Capacity Indicator (Weight + Volume) */}
                {(() => {
                  const vehicle = selectedVehicle ? vehicles.find(v => v.id === parseInt(selectedVehicle)) : null

                  // Calculate total weight
                  const totalWeight = selectedOrders.reduce((sum, orderId) => {
                    const order = readyOrders.find(o => o.order_id === orderId)
                    return sum + (parseFloat(order?.weight) || 0)
                  }, 0)

                  // Calculate total volume
                  const totalVolume = selectedOrders.reduce((sum, orderId) => {
                    const order = readyOrders.find(o => o.order_id === orderId)
                    return sum + calculateVolume(order?.dimensions)
                  }, 0)

                  // Weight capacity calculations
                  const usedWeightCapacity = vehicle ? (parseFloat(vehicle.capacity) - parseFloat(vehicle.available_capacity)) : 0
                  const currentWeightLoad = usedWeightCapacity + totalWeight
                  const weightPercentFull = vehicle ? (currentWeightLoad / parseFloat(vehicle.capacity)) * 100 : 0

                  // Volume capacity calculations (if vehicle has volume capacity)
                  const hasVolumeCapacity = vehicle && vehicle.volume_capacity > 0
                  const usedVolumeCapacity = hasVolumeCapacity ? (parseFloat(vehicle.volume_capacity) - (vehicle.available_volume_capacity || vehicle.volume_capacity)) : 0
                  const currentVolumeLoad = usedVolumeCapacity + totalVolume
                  const volumePercentFull = hasVolumeCapacity ? (currentVolumeLoad / parseFloat(vehicle.volume_capacity)) * 100 : 0

                  // Determine limiting factor
                  const isWeightLimiting = weightPercentFull >= volumePercentFull
                  const maxPercent = Math.max(weightPercentFull, volumePercentFull)

                  return (
                    <div style={{
                      padding: '16px',
                      background: selectedVehicle
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: selectedVehicle
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px'
                    }}>
                      {/* Weight Capacity */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⚖️ Weight Capacity:
                            {hasVolumeCapacity && weightPercentFull >= volumePercentFull && weightPercentFull > 0 && (
                              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>(Limiting)</span>
                            )}
                          </span>
                          {selectedVehicle ? (
                            <span style={{ fontWeight: '700', color: weightPercentFull > 90 ? '#f59e0b' : '#10b981' }}>
                              {currentWeightLoad.toFixed(1)}kg / {vehicle?.capacity}kg ({weightPercentFull.toFixed(1)}%)
                            </span>
                          ) : (
                            <span style={{ fontWeight: '700', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {totalWeight > 0 ? `${totalWeight.toFixed(1)}kg selected` : 'No vehicle selected'}
                            </span>
                          )}
                        </div>
                        <div style={{
                          height: '8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: selectedVehicle ? `${Math.min(weightPercentFull, 100)}%` : '0%',
                            background: weightPercentFull > 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                                       weightPercentFull > 90 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                       'linear-gradient(90deg, #10b981, #059669)',
                            transition: 'all 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Volume Capacity (Always Visible) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📦 Volume Capacity:
                            {hasVolumeCapacity && volumePercentFull > weightPercentFull && volumePercentFull > 0 && (
                              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>(Limiting)</span>
                            )}
                          </span>
                          {selectedVehicle ? (
                            hasVolumeCapacity ? (
                              <span style={{ fontWeight: '700', color: volumePercentFull > 90 ? '#f59e0b' : '#10b981' }}>
                                {currentVolumeLoad.toFixed(2)}m³ / {vehicle.volume_capacity}m³ ({volumePercentFull.toFixed(1)}%)
                              </span>
                            ) : (
                              <span style={{ fontWeight: '700', color: 'rgba(255, 255, 255, 0.5)' }}>
                                N/A (Vehicle has no volume capacity)
                              </span>
                            )
                          ) : (
                            <span style={{ fontWeight: '700', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {totalVolume > 0 ? `${totalVolume.toFixed(2)}m³ selected` : 'No vehicle selected'}
                            </span>
                          )}
                        </div>
                        <div style={{
                          height: '8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: selectedVehicle && hasVolumeCapacity ? `${Math.min(volumePercentFull, 100)}%` : '0%',
                            background: volumePercentFull > 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                                       volumePercentFull > 90 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                       'linear-gradient(90deg, #a78bfa, #8b5cf6)',
                            transition: 'all 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Warning messages */}
                      {maxPercent > 100 && (
                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                          ⚠️ {isWeightLimiting ? 'Weight' : 'Volume'} capacity exceeded!
                        </div>
                      )}
                      {hasVolumeCapacity && totalVolume === 0 && selectedOrders.length > 0 && (
                        <div style={{ marginTop: '12px', fontSize: '11px', color: '#f59e0b', fontStyle: 'italic' }}>
                          ⚠️ No dimensions data for selected packages - volume cannot be calculated
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Select Vehicle */}
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    🚚 Select Vehicle *
                  </label>
                  <select
                    className="input"
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px',
                      width: '100%'
                    }}
                  >
                    <option value="">-- Select a vehicle --</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id} style={{ background: '#1f2937', color: '#f9fafb' }}>
                        {vehicle.vehicle_id} - {vehicle.vehicle_type} (Available: {vehicle.available_capacity}kg / {vehicle.capacity}kg)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Packages with Checkboxes */}
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📦 Select Packages (Ready to Ship) *
                  </label>
                  {!selectedVehicle && (
                    <div style={{
                      padding: '16px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '2px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      color: '#f59e0b',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      ⚠️ Please select a vehicle first to enable package selection
                    </div>
                  )}

                  {/* Warehouse Selector Dropdown */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '8px',
                      display: 'block'
                    }}>
                      🏢 Warehouse:
                    </label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => {
                        const newWarehouse = e.target.value
                        // If changing warehouse and orders are selected, show warning
                        if (selectedOrders.length > 0 && newWarehouse !== selectedWarehouse) {
                          setToast({
                            message: `Changing warehouse cleared your ${selectedOrders.length} package selection(s). Please select packages from ${newWarehouse}.`,
                            type: 'warning'
                          })
                        }
                        setSelectedWarehouse(newWarehouse)
                        setSelectedOrders([]) // Clear selections when warehouse changes
                      }}
                      disabled={!selectedVehicle}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        cursor: selectedVehicle ? 'pointer' : 'not-allowed',
                        opacity: selectedVehicle ? 1 : 0.5
                      }}
                    >
                      <option value="">-- Select warehouse first --</option>
                      {(() => {
                        // Get unique warehouses with package counts
                        const warehouseMap = {}
                        readyOrders.forEach(order => {
                          const warehouse = order.warehouse || 'Unknown Warehouse'
                          if (!warehouseMap[warehouse]) {
                            warehouseMap[warehouse] = 0
                          }
                          warehouseMap[warehouse]++
                        })
                        return Object.entries(warehouseMap).map(([warehouse, count]) => (
                          <option key={warehouse} value={warehouse} style={{ background: '#1f2937', color: '#f9fafb' }}>
                            {warehouse} ({count} package{count !== 1 ? 's' : ''} ready)
                          </option>
                        ))
                      })()}
                    </select>
                  </div>

                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: !selectedVehicle || !selectedWarehouse ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    border: `2px solid ${!selectedVehicle || !selectedWarehouse ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    opacity: !selectedVehicle || !selectedWarehouse ? 0.5 : 1,
                    pointerEvents: !selectedVehicle || !selectedWarehouse ? 'none' : 'auto',
                    transition: 'all 0.3s ease'
                  }}>
                    {!selectedWarehouse ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Please select a warehouse to view packages
                      </div>
                    ) : readyOrders.filter(order => order.warehouse === selectedWarehouse).length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                        No packages ready in {selectedWarehouse}
                      </div>
                    ) : (
                      <>
                        <div style={{
                          padding: '10px 12px',
                          marginBottom: '12px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#60a5fa',
                          fontWeight: '600'
                        }}>
                          ✅ Showing {readyOrders.filter(order => order.warehouse === selectedWarehouse).length} packages from {selectedWarehouse}
                        </div>
                        {readyOrders.filter(order => order.warehouse === selectedWarehouse).map(order => (
                        <label
                          key={order.order_id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '14px',
                            marginBottom: '10px',
                            background: selectedOrders.includes(order.order_id)
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(255, 255, 255, 0.03)',
                            border: `2px solid ${selectedOrders.includes(order.order_id)
                              ? 'rgba(59, 130, 246, 0.5)'
                              : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedOrders.includes(order.order_id)) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedOrders.includes(order.order_id)) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.order_id)}
                            disabled={!selectedVehicle}
                            onChange={(e) => {
                              if (!selectedVehicle) {
                                setToast({ message: 'Please select a vehicle first', type: 'warning' })
                                return
                              }
                              console.log('Checkbox clicked for order_id:', order.order_id, 'checked:', e.target.checked)
                              console.log('Current selectedOrders:', selectedOrders)
                              if (e.target.checked) {
                                const newSelected = [...selectedOrders, order.order_id]
                                console.log('New selectedOrders:', newSelected)
                                setSelectedOrders(newSelected)
                              } else {
                                const newSelected = selectedOrders.filter(id => id !== order.order_id)
                                console.log('New selectedOrders:', newSelected)
                                setSelectedOrders(newSelected)
                              }
                            }}
                            style={{
                              marginRight: '14px',
                              marginTop: '4px',
                              width: '20px',
                              height: '20px',
                              cursor: selectedVehicle ? 'pointer' : 'not-allowed',
                              flexShrink: 0,
                              opacity: selectedVehicle ? 1 : 0.4
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
                              <span style={{ fontWeight: '600' }}>{order.customer_name || 'Unknown Customer'}</span>
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
                        </label>
                      ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Select Driver */}
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    👤 Assign Driver *
                  </label>
                  <select
                    className="input"
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px',
                      width: '100%'
                    }}
                  >
                    <option value="">-- Select a driver --</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id} style={{ background: '#1f2937', color: '#f9fafb' }}>
                        {driver.name} ({driver.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Budget */}
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    💰 Assign Budget *
                  </label>
                  <select
                    className="input"
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px',
                      width: '100%'
                    }}
                  >
                    <option value="">-- Select a budget --</option>
                    {budgets.map(budget => (
                      <option key={budget.id} value={budget.id} style={{ background: '#1f2937', color: '#f9fafb' }}>
                        {budget.budget_name} (₱{budget.total_budget})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Departure Date */}
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📅 Departure Date *
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px',
                      width: '100%'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 8,
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creating}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    style={{
                      padding: '12px 32px',
                      borderRadius: '10px',
                      border: 'none',
                      background: creating
                        ? 'rgba(59, 130, 246, 0.5)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: creating ? 'none' : '0 4px 16px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    {creating ? '⏳ Processing...' : '✓ Confirm'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}
    </div>
  )
}

