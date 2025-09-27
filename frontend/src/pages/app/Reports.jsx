import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({})
  const [error, setError] = useState('')

  const tabs = [
    { id: 'overview', label: '📊 Overview', endpoint: '/api/analytics/overview' },
    { id: 'revenue', label: '💰 Revenue', endpoint: '/api/analytics/revenue' },
    { id: 'operational', label: '🚚 Operations', endpoint: '/api/analytics/operational' },
    { id: 'customers', label: '👥 Customers', endpoint: '/api/analytics/customers' },
    { id: 'inventory', label: '📦 Inventory', endpoint: '/api/analytics/inventory' }
  ]

  async function fetchData(tabId = activeTab) {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    setLoading(true)
    setError('')
    try {
      const params = tabId === 'inventory' ? {} : dateRange
      const res = await apiGet(tab.endpoint + '?' + new URLSearchParams(params).toString())
      setData(prev => ({ ...prev, [tabId]: res?.data }))
    } catch (e) {
      setError(e.message || `Failed to load ${tabId} data`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, dateRange])

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const downloadReport = async (type) => {
    try {
      const params = new URLSearchParams({
        type: type,
        ...dateRange
      })
      const res = await apiGet(`/api/analytics/reports?${params}`)

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${type}_report_${dateRange.date_from}_to_${dateRange.date_to}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.message || 'Failed to download report')
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Reports & Analytics</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => downloadReport(activeTab)}
              disabled={loading}
            >
              📥 Export {tabs.find(t => t.id === activeTab)?.label.replace(/📊|💰|🚚|👥|📦/g, '').trim()}
            </button>
          </div>
        </div>

        {/* Date Range Controls */}
        {activeTab !== 'inventory' && (
          <div className="form-row" style={{ marginTop: 16 }}>
            <label>
              <div className="label">From Date</div>
              <input
                type="date"
                className="input"
                value={dateRange.date_from}
                onChange={(e) => handleDateChange('date_from', e.target.value)}
              />
            </label>
            <label>
              <div className="label">To Date</div>
              <input
                type="date"
                className="input"
                value={dateRange.date_to}
                onChange={(e) => handleDateChange('date_to', e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--gray-200)', paddingBottom: 16 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ minWidth: '120px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ marginTop: 16 }}>
          {loading && <div>Loading {activeTab} data...</div>}
          {error && <div style={{ color: 'var(--danger-600)' }}>{error}</div>}

          {!loading && !error && data[activeTab] && (
            <div>
              {activeTab === 'overview' && <OverviewReport data={data[activeTab]} />}
              {activeTab === 'revenue' && <RevenueReport data={data[activeTab]} />}
              {activeTab === 'operational' && <OperationalReport data={data[activeTab]} />}
              {activeTab === 'customers' && <CustomersReport data={data[activeTab]} />}
              {activeTab === 'inventory' && <InventoryReport data={data[activeTab]} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OverviewReport({ data }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Key Metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
            {data.formatted_revenue}
          </div>
          <div className="muted">Total Revenue</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-600)' }}>
            {data.total_orders}
          </div>
          <div className="muted">Total Orders</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-600)' }}>
            {data.fulfillment_rate}%
          </div>
          <div className="muted">Fulfillment Rate</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-600)' }}>
            {data.avg_delivery_days}
          </div>
          <div className="muted">Avg Delivery Days</div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Order Performance</h4>
          <div className="grid" style={{ gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Orders:</span>
              <span style={{ fontWeight: 'bold' }}>{data.total_orders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Completed:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--success-600)' }}>{data.completed_orders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Fulfillment Rate:</span>
              <span style={{ fontWeight: 'bold' }}>{data.fulfillment_rate}%</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Delivery Performance</h4>
          <div className="grid" style={{ gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Shipments:</span>
              <span style={{ fontWeight: 'bold' }}>{data.total_shipments}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivered:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--success-600)' }}>{data.delivered_shipments}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Rate:</span>
              <span style={{ fontWeight: 'bold' }}>{data.delivery_rate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RevenueReport({ data }) {
  if (!Array.isArray(data)) return <div>No revenue data available</div>

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const totalInvoices = data.reduce((sum, item) => sum + item.invoice_count, 0)

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-600)' }}>
            ₱{(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="muted">Total Revenue</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
            {totalInvoices}
          </div>
          <div className="muted">Total Invoices</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-600)' }}>
            ₱{totalInvoices > 0 ? ((totalRevenue / totalInvoices) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="muted">Avg Invoice Value</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Revenue by Period</h4>
        <div className="grid" style={{ gap: 8 }}>
          {data.map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 8,
              background: 'var(--gray-50)',
              borderRadius: 4
            }}>
              <span style={{ fontWeight: 'bold' }}>{item.period}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--success-600)' }}>
                  {item.formatted_revenue}
                </div>
                <div className="muted" style={{ fontSize: '12px' }}>
                  {item.invoice_count} invoices
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OperationalReport({ data }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Delivery Status Breakdown */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Delivery Status Breakdown</h4>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {data.delivery_status_breakdown?.map((status, index) => (
            <div key={index} style={{
              padding: 12,
              textAlign: 'center',
              background: 'var(--gray-50)',
              borderRadius: 4
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{status.count}</div>
              <div className="muted" style={{ textTransform: 'capitalize' }}>
                {status.status.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Routes */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Top Shipping Routes</h4>
        <div className="grid" style={{ gap: 8 }}>
          {data.top_routes?.slice(0, 5).map((route, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 8,
              background: 'var(--gray-50)',
              borderRadius: 4
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{route.route}</div>
                <div className="muted" style={{ fontSize: '12px' }}>
                  Avg Cost: {route.avg_cost}
                </div>
              </div>
              <div style={{
                background: 'var(--primary-600)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {route.shipment_count} shipments
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver Performance */}
      {data.driver_performance?.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Driver Performance</h4>
          <div className="grid" style={{ gap: 8 }}>
            {data.driver_performance.slice(0, 5).map((driver, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 8,
                background: 'var(--gray-50)',
                borderRadius: 4
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{driver.driver_name}</div>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    {driver.completed_deliveries}/{driver.total_deliveries} completed
                  </div>
                </div>
                <div style={{
                  background: driver.completion_rate >= 90 ? 'var(--success-600)' :
                           driver.completion_rate >= 70 ? 'var(--warning-600)' : 'var(--danger-600)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {driver.completion_rate}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomersReport({ data }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Customers */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Top Customers by Revenue</h4>
        <div className="grid" style={{ gap: 8 }}>
          {data.top_customers?.slice(0, 10).map((customer, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              background: 'var(--gray-50)',
              borderRadius: 4
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{customer.customer_name}</div>
                <div className="muted" style={{ fontSize: '12px' }}>
                  {customer.total_invoices} invoices • Avg: {customer.avg_order_value}
                </div>
              </div>
              <div style={{
                textAlign: 'right'
              }}>
                <div style={{ fontWeight: 'bold', color: 'var(--success-600)' }}>
                  {customer.formatted_revenue}
                </div>
                <div style={{
                  background: 'var(--primary-600)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginTop: 4
                }}>
                  #{index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Trends */}
      {data.customer_trends?.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Customer Activity Trends</h4>
          <div className="grid" style={{ gap: 8 }}>
            {data.customer_trends.map((trend, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 8,
                background: 'var(--gray-50)',
                borderRadius: 4
              }}>
                <span style={{ fontWeight: 'bold' }}>{trend.month}</span>
                <span style={{
                  background: 'var(--info-600)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {trend.unique_customers} active customers
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InventoryReport({ data }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Storage Metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
            {data.storage_metrics?.total_warehouses || 0}
          </div>
          <div className="muted">Total Warehouses</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-600)' }}>
            {data.storage_metrics?.total_inventory_items || 0}
          </div>
          <div className="muted">Items in Storage</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-600)' }}>
            {data.storage_metrics?.unassigned_items || 0}
          </div>
          <div className="muted">Unassigned Items</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-600)' }}>
            {data.storage_metrics?.avg_items_per_warehouse || 0}
          </div>
          <div className="muted">Avg Items/Warehouse</div>
        </div>
      </div>

      {/* Warehouse Utilization */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Warehouse Utilization</h4>
        <div className="grid" style={{ gap: 8 }}>
          {data.warehouse_utilization?.map((warehouse, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              background: 'var(--gray-50)',
              borderRadius: 4
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{warehouse.warehouse_name}</div>
                <div className="muted" style={{ fontSize: '12px' }}>
                  {warehouse.location}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold' }}>{warehouse.item_count} items</div>
                <div style={{
                  background: warehouse.status === 'critical' ? 'var(--danger-600)' :
                           warehouse.status === 'warning' ? 'var(--warning-600)' : 'var(--success-600)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginTop: 4
                }}>
                  {warehouse.utilization_percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Movement */}
      {data.product_movement?.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Top Product Movement</h4>
          <div className="grid" style={{ gap: 8 }}>
            {data.product_movement.slice(0, 10).map((product, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 8,
                background: 'var(--gray-50)',
                borderRadius: 4
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{product.product_id}</div>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    Status: {product.status}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{product.total_quantity} units</div>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    {product.movement_count} movements
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}