import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'

export default function Dashboard() {
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