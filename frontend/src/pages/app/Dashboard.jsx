import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import * as Ably from 'ably'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState({
    orders: { total: 0, fulfilled: 0, processing: 0, pending: 0 },
    shipments: { total: 0, delivered: 0, outForDelivery: 0, inTransit: 0, pending: 0, failed: 0, active: 0 },
    quotes: { total: 0, converted: 0, approved: 0, pending: 0 },
    invoices: { total: 0, paid: 0, pending: 0, overdue: 0, total_unpaid: 0, formatted_total_unpaid: '₱0.00' },
    warehouse: { total_warehouses: 0, total_items: 0, unassigned_items: 0, warehouses_at_capacity: 0 },
    recent_orders: [],
    recent_invoices: [],
    notifications: []
  })
  const [loading, setLoading] = useState(true)
  const [activeShipments, setActiveShipments] = useState([])
  const [gpsLoading, setGpsLoading] = useState(true)
  const [showFullMap, setShowFullMap] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [locationHistory, setLocationHistory] = useState([])

  // Get user info from localStorage
  const user = (() => {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        // The backend returns { user: {...}, token: ... }
        return parsed.user || parsed
      }
    } catch (e) {
      console.error('Failed to parse user data:', e)
    }
    return null
  })()

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Load data from multiple endpoints
        const [ordersRes, shipmentsRes, quotesRes, invoicesRes, warehouseRes] = await Promise.all([
          apiGet('/api/orders').catch(() => ({ data: [] })),
          apiGet('/api/shipments').catch(() => ({ data: [] })),
          apiGet('/api/quotes').catch(() => ({ data: [] })),
          apiGet('/api/invoices').catch(() => ({ data: [], summary: {} })),
          apiGet('/api/dashboard/warehouse-metrics').catch(() => ({ data: {} }))
        ])

        const orders = ordersRes.data || []
        const shipments = shipmentsRes.data || []
        const quotes = quotesRes.data || []
        const invoices = invoicesRes.data || []
        const invoiceSummary = invoicesRes.summary || {}
        const warehouseMetrics = warehouseRes.data || {}

        // Calculate metrics
        const ordersMetrics = {
          total: orders.length,
          fulfilled: orders.filter(o => o.status === 'fulfilled').length,
          processing: orders.filter(o => o.status === 'processing').length,
          pending: orders.filter(o => o.status === 'pending').length
        }

        const shipmentsMetrics = {
          total: shipments.length,
          delivered: shipments.filter(s => s.status === 'delivered').length,
          outForDelivery: shipments.filter(s => s.status === 'out_for_delivery').length,
          inTransit: shipments.filter(s => s.status === 'in_transit').length,
          pending: shipments.filter(s => s.status === 'pending').length,
          failed: shipments.filter(s => ['failed', 'returned', 'cancelled'].includes(s.status)).length,
          active: shipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length
        }

        const quotesMetrics = {
          total: quotes.length,
          converted: quotes.filter(q => q.status === 'converted').length,
          approved: quotes.filter(q => q.status === 'approved').length,
          pending: quotes.filter(q => q.status === 'pending').length
        }

        const invoicesMetrics = {
          total: invoices.length,
          paid: invoices.filter(i => i.status === 'paid').length,
          pending: invoices.filter(i => i.status === 'pending').length,
          overdue: invoices.filter(i => i.is_overdue || i.status === 'overdue').length,
          total_unpaid: invoiceSummary.total_unpaid || 0,
          formatted_total_unpaid: invoiceSummary.total_unpaid ?
            '₱' + (invoiceSummary.total_unpaid / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) :
            '₱0.00'
        }

        // Get recent data
        const recentOrders = orders.slice(0, 5).map(o => ({
          id: o.id,
          po: o.po,
          customer: o.customer,
          status: o.status,
          date: o.order_date
        }))

        const recentInvoices = invoices.slice(0, 5).map(i => ({
          id: i.id,
          invoice_number: i.invoice_number,
          formatted_amount: i.formatted_amount,
          status: i.status,
          tracking_number: i.tracking_number
        }))

        // Generate notifications with metadata
        const notifications = []
        if (shipmentsMetrics.pending > 0) {
          notifications.push({
            icon: '📦',
            type: 'warning',
            message: `${shipmentsMetrics.pending} shipment${shipmentsMetrics.pending > 1 ? 's' : ''} pending dispatch`,
            link: '/app/shipments?status=pending',
            priority: 'medium'
          })
        }
        if (invoicesMetrics.overdue > 0) {
          notifications.push({
            icon: '🚨',
            type: 'critical',
            message: `${invoicesMetrics.overdue} invoice${invoicesMetrics.overdue > 1 ? 's' : ''} overdue - follow up required`,
            link: '/app/invoices?status=overdue',
            priority: 'high'
          })
        }
        if (quotesMetrics.pending > 0) {
          notifications.push({
            icon: '📋',
            type: 'info',
            message: `${quotesMetrics.pending} quote request${quotesMetrics.pending > 1 ? 's' : ''} awaiting approval`,
            link: '/app/quotes?status=pending',
            priority: 'medium'
          })
        }
        if (warehouseMetrics.unassigned_items > 0) {
          notifications.push({
            icon: '⚠️',
            type: 'warning',
            message: `${warehouseMetrics.unassigned_items} item${warehouseMetrics.unassigned_items > 1 ? 's' : ''} awaiting warehouse assignment`,
            link: '/app/warehouse',
            priority: 'medium'
          })
        }
        if (warehouseMetrics.warehouses_at_capacity > 0) {
          notifications.push({
            icon: '📊',
            type: 'warning',
            message: `${warehouseMetrics.warehouses_at_capacity} warehouse${warehouseMetrics.warehouses_at_capacity > 1 ? 's' : ''} near capacity`,
            link: '/app/warehouse',
            priority: 'low'
          })
        }
        if (notifications.length === 0) {
          notifications.push({
            icon: '✅',
            type: 'success',
            message: 'All systems running smoothly',
            link: null,
            priority: 'low'
          })
        }

        setDashboardData({
          orders: ordersMetrics,
          shipments: shipmentsMetrics,
          quotes: quotesMetrics,
          invoices: invoicesMetrics,
          warehouse: warehouseMetrics,
          recent_orders: recentOrders,
          recent_invoices: recentInvoices,
          notifications
        })
      } catch (e) {
        console.error('Failed to load dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  // Real-time updates via Ably for order status changes
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

    console.log('[Dashboard] Setting up Ably subscription for organization:', organizationId)

    if (!organizationId) {
      console.warn('[Dashboard] No organization_id found, skipping Ably subscription')
      return
    }

    // Connect to Ably
    const ably = new Ably.Realtime({
      key: import.meta.env.VITE_ABLY_KEY,
    })

    ably.connection.on('connected', () => {
      console.log('[Dashboard] ✅ Ably connected successfully')
    })

    ably.connection.on('failed', () => {
      console.error('[Dashboard] ❌ Ably connection failed')
    })

    // Subscribe to organization channel for order updates
    const channelName = `public:organization.${organizationId}`
    console.log('[Dashboard] 📡 Subscribing to channel:', channelName)
    const channel = ably.channels.get(channelName)

    channel.subscribe('order.status.updated', (message) => {
      console.log('[Dashboard] Order status updated in real-time:', message.data)

      // Update the recent orders list and recalculate metrics
      setDashboardData((prevData) => {
        const updatedRecentOrders = prevData.recent_orders.map((order) => {
          if (order.id === message.data.order_id) {
            console.log(`[Dashboard] ✅ Updating order ${order.id} from ${order.status} to ${message.data.new_status}`)
            return {
              ...order,
              status: message.data.new_status,
            }
          }
          return order
        })

        // Recalculate order metrics
        const updatedOrderMetrics = {
          ...prevData.orders,
          fulfilled: updatedRecentOrders.filter(o => o.status === 'fulfilled').length,
          processing: updatedRecentOrders.filter(o => o.status === 'processing').length,
          pending: updatedRecentOrders.filter(o => o.status === 'pending').length
        }

        // Regenerate notifications with updated data
        const notifications = []
        if (prevData.shipments.pending > 0) {
          notifications.push({
            icon: '📦',
            type: 'warning',
            message: `${prevData.shipments.pending} shipment${prevData.shipments.pending > 1 ? 's' : ''} pending dispatch`,
            link: '/app/shipments?status=pending',
            priority: 'medium'
          })
        }
        if (prevData.invoices.overdue > 0) {
          notifications.push({
            icon: '🚨',
            type: 'critical',
            message: `${prevData.invoices.overdue} invoice${prevData.invoices.overdue > 1 ? 's' : ''} overdue - follow up required`,
            link: '/app/invoices?status=overdue',
            priority: 'high'
          })
        }
        if (prevData.quotes.pending > 0) {
          notifications.push({
            icon: '📋',
            type: 'info',
            message: `${prevData.quotes.pending} quote request${prevData.quotes.pending > 1 ? 's' : ''} awaiting approval`,
            link: '/app/quotes?status=pending',
            priority: 'medium'
          })
        }
        if (prevData.warehouse.unassigned_items > 0) {
          notifications.push({
            icon: '⚠️',
            type: 'warning',
            message: `${prevData.warehouse.unassigned_items} item${prevData.warehouse.unassigned_items > 1 ? 's' : ''} awaiting warehouse assignment`,
            link: '/app/warehouse',
            priority: 'medium'
          })
        }
        if (prevData.warehouse.warehouses_at_capacity > 0) {
          notifications.push({
            icon: '📊',
            type: 'warning',
            message: `${prevData.warehouse.warehouses_at_capacity} warehouse${prevData.warehouse.warehouses_at_capacity > 1 ? 's' : ''} near capacity`,
            link: '/app/warehouse',
            priority: 'low'
          })
        }
        if (notifications.length === 0) {
          notifications.push({
            icon: '✅',
            type: 'success',
            message: 'All systems running smoothly',
            link: null,
            priority: 'low'
          })
        }

        return {
          ...prevData,
          orders: updatedOrderMetrics,
          recent_orders: updatedRecentOrders,
          notifications
        }
      })

      console.log(`[Dashboard] 📦 Order ${message.data.po} is now ${message.data.new_status}`)
    })

    // Subscribe to shipment status updates
    channel.subscribe('shipment.status.updated', (message) => {
      console.log('[Dashboard] Shipment status updated in real-time:', message.data)

      // Update shipment metrics and regenerate notifications
      setDashboardData((prevData) => {
        const oldStatus = message.data.old_status
        const newStatus = message.data.new_status

        // Update shipment metrics
        const updatedShipmentMetrics = { ...prevData.shipments }

        // Decrement old status count
        if (oldStatus === 'delivered') updatedShipmentMetrics.delivered--
        else if (['in_transit', 'out_for_delivery'].includes(oldStatus)) updatedShipmentMetrics.active--
        else if (oldStatus === 'pending') updatedShipmentMetrics.pending--

        // Increment new status count
        if (newStatus === 'delivered') updatedShipmentMetrics.delivered++
        else if (['in_transit', 'out_for_delivery'].includes(newStatus)) updatedShipmentMetrics.active++
        else if (newStatus === 'pending') updatedShipmentMetrics.pending++

        // Regenerate notifications
        const notifications = []
        if (updatedShipmentMetrics.pending > 0) {
          notifications.push({
            icon: '📦',
            type: 'warning',
            message: `${updatedShipmentMetrics.pending} shipment${updatedShipmentMetrics.pending > 1 ? 's' : ''} pending dispatch`,
            link: '/app/shipments?status=pending',
            priority: 'medium'
          })
        }
        if (prevData.invoices.overdue > 0) {
          notifications.push({
            icon: '🚨',
            type: 'critical',
            message: `${prevData.invoices.overdue} invoice${prevData.invoices.overdue > 1 ? 's' : ''} overdue - follow up required`,
            link: '/app/invoices?status=overdue',
            priority: 'high'
          })
        }
        if (prevData.quotes.pending > 0) {
          notifications.push({
            icon: '📋',
            type: 'info',
            message: `${prevData.quotes.pending} quote request${prevData.quotes.pending > 1 ? 's' : ''} awaiting approval`,
            link: '/app/quotes?status=pending',
            priority: 'medium'
          })
        }
        if (prevData.warehouse.unassigned_items > 0) {
          notifications.push({
            icon: '⚠️',
            type: 'warning',
            message: `${prevData.warehouse.unassigned_items} item${prevData.warehouse.unassigned_items > 1 ? 's' : ''} awaiting warehouse assignment`,
            link: '/app/warehouse',
            priority: 'medium'
          })
        }
        if (prevData.warehouse.warehouses_at_capacity > 0) {
          notifications.push({
            icon: '📊',
            type: 'warning',
            message: `${prevData.warehouse.warehouses_at_capacity} warehouse${prevData.warehouse.warehouses_at_capacity > 1 ? 's' : ''} near capacity`,
            link: '/app/warehouse',
            priority: 'low'
          })
        }
        if (notifications.length === 0) {
          notifications.push({
            icon: '✅',
            type: 'success',
            message: 'All systems running smoothly',
            link: null,
            priority: 'low'
          })
        }

        return {
          ...prevData,
          shipments: updatedShipmentMetrics,
          notifications
        }
      })

      console.log(`[Dashboard] 🚚 Shipment ${message.data.tracking_number} is now ${message.data.new_status}`)
    })

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
      ably.close()
    }
  }, [])

  // Load active shipments with GPS tracking
  useEffect(() => {
    loadActiveShipments()
    // Refresh every 20 seconds
    const interval = setInterval(loadActiveShipments, 20000)
    return () => clearInterval(interval)
  }, [])

  const loadActiveShipments = async () => {
    try {
      setGpsLoading(true)
      // Get all in-transit and out-for-delivery shipments
      const response1 = await apiGet('/api/shipments?status=in_transit')
      const shipments1 = response1?.data || []

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
      setActiveShipments(tracked)
    } catch (e) {
      console.error('Failed to load active shipments:', e)
    } finally {
      setGpsLoading(false)
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
    loadLocationHistory(shipment.id)
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Welcome Card */}
      {user && (
        <div className="card" style={{
          padding: '24px',
          background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))',
          border: '1px solid var(--primary-200)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: 'var(--text)' }}>
                Welcome back, {user.username || user.email}!
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Your Role:</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '16px',
                  background: user.role === 'admin' ? 'var(--primary-600)' :
                              user.role === 'booking_manager' ? 'var(--success-600)' :
                              user.role === 'warehouse_manager' ? 'var(--warning-600)' : 'var(--gray-600)',
                  color: 'white'
                }}>
                  {user.role === 'admin' ? '👑 Administrator' :
                   user.role === 'booking_manager' ? '📋 Booking Manager' :
                   user.role === 'warehouse_manager' ? '📦 Warehouse Manager' : user.role}
                </span>
              </div>
              <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {user.role === 'admin' && (
                  <>
                    <strong style={{ color: 'var(--text)' }}>Full System Access:</strong> Manage users, configure pricing, view all reports, and control system settings.
                  </>
                )}
                {user.role === 'booking_manager' && (
                  <>
                    <strong style={{ color: 'var(--text)' }}>Booking Operations:</strong> Create quotes, manage orders, assign shipments, and track deliveries.
                  </>
                )}
                {user.role === 'warehouse_manager' && (
                  <>
                    <strong style={{ color: 'var(--text)' }}>Warehouse Operations:</strong> Manage inventory, track stock levels, and coordinate with booking team.
                  </>
                )}
              </div>
            </div>
            <div style={{ fontSize: '64px', opacity: 0.8 }}>
              {user.role === 'admin' ? '👑' :
               user.role === 'booking_manager' ? '📋' :
               user.role === 'warehouse_manager' ? '📦' : '👤'}
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 16 }}>
        <article className="card">
          <div className="label">Total Orders</div>
          <div className="stat">{loading ? '...' : dashboardData.orders.total}</div>
          {!loading && dashboardData.orders.fulfilled > 0 && (
            <div className="muted" style={{ fontSize: '12px', color: 'var(--success-600)' }}>
              {dashboardData.orders.fulfilled} fulfilled
            </div>
          )}
        </article>
        <article className="card">
          <div className="label">Active Shipments</div>
          <div className="stat">{loading ? '...' : dashboardData.shipments.active}</div>
          {!loading && dashboardData.shipments.delivered > 0 && (
            <div className="muted" style={{ fontSize: '12px', color: 'var(--success-600)' }}>
              {dashboardData.shipments.delivered} delivered
            </div>
          )}
        </article>
        <article className="card">
          <div className="label">Quote Requests</div>
          <div className="stat">{loading ? '...' : dashboardData.quotes.pending}</div>
          {!loading && dashboardData.quotes.approved > 0 && (
            <div className="muted" style={{ fontSize: '12px', color: 'var(--info-600)' }}>
              {dashboardData.quotes.approved} approved
            </div>
          )}
        </article>
        <article className="card">
          <div className="label">Warehouse Items</div>
          <div className="stat">{loading ? '...' : dashboardData.warehouse.total_items || 0}</div>
          {!loading && dashboardData.warehouse.unassigned_items > 0 && (
            <div className="muted" style={{ fontSize: '12px', color: 'var(--warning-600)' }}>
              {dashboardData.warehouse.unassigned_items} unassigned
            </div>
          )}
        </article>
        <article className="card">
          <div className="label">Unpaid Invoices</div>
          <div className="stat">
            {loading ? '...' : dashboardData.invoices.formatted_total_unpaid}
          </div>
          {!loading && dashboardData.invoices.overdue > 0 && (
            <div className="muted" style={{ fontSize: '12px', color: 'var(--danger-600)' }}>
              {dashboardData.invoices.overdue} overdue
            </div>
          )}
        </article>
      </div>

      {/* Live Tracking Widget */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>🗺️ Active Shipments - Live Tracking</h3>
            <div style={{ fontSize: '14px', color: '#666', marginTop: 4 }}>
              {gpsLoading ? 'Loading...' : `${activeShipments.length} shipment${activeShipments.length !== 1 ? 's' : ''} with GPS tracking`}
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => setShowFullMap(true)}
            style={{ fontSize: '14px' }}
          >
            View Full Map →
          </button>
        </div>

        {activeShipments.length > 0 ? (
          <div style={{ height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer
              center={[activeShipments[0].location.latitude, activeShipments[0].location.longitude]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
              />

              {activeShipments.map(shipment => {
                if (!shipment.location) return null

                const position = [shipment.location.latitude, shipment.location.longitude]

                return (
                  <Marker
                    key={shipment.id}
                    position={position}
                    icon={truckIcon}
                    eventHandlers={{
                      click: () => navigate(`/app/shipments/${shipment.id}`)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <strong>{shipment.tracking_number}</strong>
                        <div style={{ marginTop: '0.5rem', fontSize: '14px' }}>
                          <div>🚚 Driver: {shipment.driver}</div>
                          <div>🚛 Vehicle: {shipment.vehicle}</div>
                          <div>📍 Receiver: {shipment.receiver}</div>
                          <div>⏰ {new Date(shipment.location.recorded_at).toLocaleString()}</div>
                          {shipment.location.speed > 0 && (
                            <div>🚀 Speed: {shipment.location.speed.toFixed(1)} km/h</div>
                          )}
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/app/shipments/${shipment.id}`)}
                          style={{ marginTop: '0.5rem', width: '100%', fontSize: '12px' }}
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
        ) : (
          <div style={{
            height: '350px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-2)',
            borderRadius: '8px',
            color: 'var(--muted)',
            textAlign: 'center',
            padding: '2rem',
            border: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🗺️</div>
              <div style={{ fontSize: '16px', marginBottom: '0.5rem', color: 'var(--text)' }}>No active shipments with GPS tracking</div>
              <div style={{ fontSize: '14px' }}>Shipments will appear here once drivers start GPS tracking</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Shipment Status Overview</h3>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontWeight: '500'
            }}>
              Total: {dashboardData.shipments.total} shipments
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Track your delivery performance across all statuses</p>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 280 }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '20px'
          }}>
            {[
              {
                label: 'Delivered',
                value: dashboardData.shipments.delivered,
                icon: '✅',
                color: '#10b981',
                lightColor: '#d1fae5'
              },
              {
                label: 'Out for Delivery',
                value: dashboardData.shipments.outForDelivery,
                icon: '🚛',
                color: '#8b5cf6',
                lightColor: '#ede9fe'
              },
              {
                label: 'In Transit',
                value: dashboardData.shipments.inTransit,
                icon: '🚚',
                color: '#3b82f6',
                lightColor: '#dbeafe'
              },
              {
                label: 'Pending',
                value: dashboardData.shipments.pending,
                icon: '⏳',
                color: '#f59e0b',
                lightColor: '#fef3c7'
              },
              {
                label: 'Issues',
                value: dashboardData.shipments.failed,
                icon: '❌',
                color: '#ef4444',
                lightColor: '#fee2e2'
              }
            ].map((item, idx) => {
              const maxValue = Math.max(
                dashboardData.shipments.delivered,
                dashboardData.shipments.outForDelivery,
                dashboardData.shipments.inTransit,
                dashboardData.shipments.pending,
                dashboardData.shipments.failed,
                1
              )
              const heightPercent = (item.value / maxValue) * 100
              const percentage = dashboardData.shipments.total > 0
                ? Math.round((item.value / dashboardData.shipments.total) * 100)
                : 0

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 12px 24px -8px ${item.color}40`
                    e.currentTarget.style.borderColor = item.color
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: item.lightColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {item.icon}
                  </div>

                  {/* Label */}
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    lineHeight: 1.2
                  }}>
                    {item.label}
                  </div>

                  {/* Value */}
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: 'var(--text)',
                    lineHeight: 1,
                    marginTop: 'auto'
                  }}>
                    {item.value}
                  </div>

                  {/* Bar and Percentage */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: item.color
                      }}>
                        {percentage}%
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                      }}>
                        of total
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: item.lightColor,
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${heightPercent}%`,
                        background: item.color,
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>


      {/* Fullscreen Map Modal */}
      {showFullMap && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: '12px',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-2)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text)' }}>🗺️ Live Fleet Tracking</h2>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: 4 }}>
                  {activeShipments.length} active shipment{activeShipments.length !== 1 ? 's' : ''} with GPS tracking
                </div>
              </div>
              <button
                onClick={() => {
                  setShowFullMap(false)
                  setSelectedShipment(null)
                  setLocationHistory([])
                }}
                className="btn btn-ghost"
                style={{
                  fontSize: '24px',
                  padding: '8px',
                  lineHeight: 1,
                  color: 'var(--text)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Map Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Sidebar */}
              <div style={{
                width: '320px',
                borderRight: '1px solid var(--border)',
                overflowY: 'auto',
                padding: '16px',
                background: 'var(--bg-2)'
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text)' }}>Active Shipments</h3>
                {activeShipments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    No active shipments with GPS data
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeShipments.map(shipment => (
                      <div
                        key={shipment.id}
                        onClick={() => handleShipmentClick(shipment)}
                        style={{
                          padding: '12px',
                          border: `2px solid ${selectedShipment?.id === shipment.id ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedShipment?.id === shipment.id ? 'var(--surface)' : 'var(--surface)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text)' }}>
                          {shipment.tracking_number}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                          <div>🚚 {shipment.driver}</div>
                          <div>🚛 {shipment.vehicle}</div>
                          <div>📍 {shipment.receiver}</div>
                        </div>
                        {shipment.location && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                            Last update: {new Date(shipment.location.recorded_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Map */}
              <div style={{ flex: 1 }}>
                {activeShipments.length > 0 ? (
                  <MapContainer
                    center={[activeShipments[0].location.latitude, activeShipments[0].location.longitude]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
                    />

                    {activeShipments.map(shipment => {
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
                              <button
                                className="btn btn-primary"
                                onClick={() => navigate(`/app/shipments/${shipment.id}`)}
                                style={{ marginTop: '0.5rem', width: '100%', fontSize: '12px' }}
                              >
                                View Details
                              </button>
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
                ) : (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f9fafb',
                    color: '#666'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🗺️</div>
                      <div style={{ fontSize: '18px' }}>No active shipments with GPS tracking</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}