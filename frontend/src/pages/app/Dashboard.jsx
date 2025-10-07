import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
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
  const [showFullMap, setShowFullMap] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [locationHistory, setLocationHistory] = useState([])

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

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Fulfillment Performance</h3>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Total: <strong>{dashboardData.shipments.total}</strong> shipments
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Delivered Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>Delivered</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                    {dashboardData.shipments.delivered}
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {dashboardData.shipments.total > 0
                      ? Math.round((dashboardData.shipments.delivered / dashboardData.shipments.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
              <div style={{
                height: '12px',
                background: '#f3f4f6',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                  width: `${dashboardData.shipments.total > 0
                    ? Math.round((dashboardData.shipments.delivered / dashboardData.shipments.total) * 100)
                    : 0}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* In Transit Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '20px' }}>🚚</span>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>In Transit</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                    {dashboardData.shipments.active}
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {dashboardData.shipments.total > 0
                      ? Math.round((dashboardData.shipments.active / dashboardData.shipments.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
              <div style={{
                height: '12px',
                background: '#f3f4f6',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                  width: `${dashboardData.shipments.total > 0
                    ? Math.round((dashboardData.shipments.active / dashboardData.shipments.total) * 100)
                    : 0}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Pending Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '20px' }}>⏳</span>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>Pending Dispatch</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>
                    {dashboardData.shipments.pending}
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {dashboardData.shipments.total > 0
                      ? Math.round((dashboardData.shipments.pending / dashboardData.shipments.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
              <div style={{
                height: '12px',
                background: '#f3f4f6',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
                  width: `${dashboardData.shipments.total > 0
                    ? Math.round((dashboardData.shipments.pending / dashboardData.shipments.total) * 100)
                    : 0}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        )}
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