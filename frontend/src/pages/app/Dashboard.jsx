import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/api'
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState({
    orders: { total: 0, fulfilled: 0, processing: 0, pending: 0 },
    shipments: { total: 0, delivered: 0, active: 0, pending: 0 },
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
          active: shipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length,
          pending: shipments.filter(s => s.status === 'pending').length
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

        // Generate notifications
        const notifications = []
        if (shipmentsMetrics.pending > 0) {
          notifications.push(`${shipmentsMetrics.pending} shipment${shipmentsMetrics.pending > 1 ? 's' : ''} pending dispatch.`)
        }
        if (invoicesMetrics.overdue > 0) {
          notifications.push(`${invoicesMetrics.overdue} invoice${invoicesMetrics.overdue > 1 ? 's' : ''} overdue - follow up required.`)
        }
        if (quotesMetrics.pending > 0) {
          notifications.push(`${quotesMetrics.pending} quote request${quotesMetrics.pending > 1 ? 's' : ''} awaiting approval.`)
        }
        if (warehouseMetrics.unassigned_items > 0) {
          notifications.push(`${warehouseMetrics.unassigned_items} item${warehouseMetrics.unassigned_items > 1 ? 's' : ''} awaiting warehouse assignment.`)
        }
        if (warehouseMetrics.warehouses_at_capacity > 0) {
          notifications.push(`${warehouseMetrics.warehouses_at_capacity} warehouse${warehouseMetrics.warehouses_at_capacity > 1 ? 's' : ''} near capacity.`)
        }
        if (notifications.length === 0) {
          notifications.push('All systems running smoothly.')
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
  return (
    <div className="grid" style={{ gap: 16 }}>
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
            onClick={() => navigate('/app/tracking')}
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
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
            background: '#f9fafb',
            borderRadius: '8px',
            color: '#666',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🗺️</div>
              <div style={{ fontSize: '16px', marginBottom: '0.5rem' }}>No active shipments with GPS tracking</div>
              <div style={{ fontSize: '14px' }}>Shipments will appear here once drivers start GPS tracking</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ minHeight: 260 }}>
        <div className="label">Fulfillment performance (last 30 days)</div>
        <div className="skeleton" style={{ height: 180, marginTop: 12 }} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recent Orders</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {dashboardData.recent_orders.length > 0 ? (
                dashboardData.recent_orders.map((order) => (
                  <li key={order.id} style={{ marginBottom: 8 }}>
                    {order.po} • {order.customer} •
                    <span className={`badge ${
                      order.status === 'fulfilled' ? 'success' :
                      order.status === 'processing' ? 'info' :
                      order.status === 'pending' ? 'warn' : ''
                    }`} style={{ marginLeft: 4 }}>
                      {order.status}
                    </span>
                  </li>
                ))
              ) : (
                <li>No recent orders</li>
              )}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notifications</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {loading ? (
              <li>Loading...</li>
            ) : (
              dashboardData.notifications.map((notification, index) => (
                <li key={index} style={{
                  color: notification.includes('overdue') ? 'var(--danger-600)' :
                         notification.includes('pending') ? 'var(--warning-600)' : 'inherit',
                  marginBottom: 4
                }}>
                  {notification}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}