import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState([])
  const [unassignedItems, setUnassignedItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const navigate = useNavigate()

  async function fetchInventory(params = {}) {
    setLoading(true)
    setError('')
    try {
      const [inventoryRes, unassignedRes, warehousesRes] = await Promise.all([
        apiGet('/api/inventory' + (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '')),
        apiGet('/api/inventory/unassigned'),
        apiGet('/api/warehouses')
      ])

      setInventoryItems(inventoryRes?.data || [])
      setUnassignedItems(unassignedRes?.data || [])
      setWarehouses(warehousesRes?.data || [])
    } catch (e) {
      setError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (warehouseFilter !== 'all') params.warehouse_id = warehouseFilter

    fetchInventory(params)
  }, [search, statusFilter, warehouseFilter])

  const handleAssignItem = async (formData) => {
    try {
      setAssigning(true)
      await apiPost('/api/inventory/assign', formData)
      await fetchInventory()
      setShowAssignForm(false)
      setSelectedItem(null)
    } catch (e) {
      alert(e.message || 'Failed to assign item')
    } finally {
      setAssigning(false)
    }
  }

  const handleUpdateLocation = async (inventoryId, newLocation) => {
    try {
      await apiPatch(`/api/inventory/${inventoryId}`, {
        location_in_warehouse: newLocation
      })
      await fetchInventory()
    } catch (e) {
      alert(e.message || 'Failed to update location')
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'pending': return 'badge warn'
      case 'processing': return 'badge info'
      case 'fulfilled': return 'badge success'
      case 'shipped': return 'badge'
      default: return 'badge'
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Inventory Management</h2>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/app/warehouses')}
          >
            🏪 Manage Warehouses
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 16 }}>
          <input
            className="input"
            placeholder="Search packages, orders, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Order Status: All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="shipped">Shipped</option>
          </select>
          <select className="input" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
            <option value="all">Warehouse: All</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unassigned Items Alert */}
      {unassignedItems.length > 0 && (
        <div className="card" style={{
          padding: 16,
          background: 'var(--warning-50)',
          border: '1px solid var(--warning-200)'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--warning-800)' }}>
            📋 Packages Awaiting Storage Assignment
          </h3>
          <div style={{ fontSize: '16px', color: 'var(--warning-700)', marginBottom: 12 }}>
            {unassignedItems.length} package{unassignedItems.length !== 1 ? 's' : ''} need{unassignedItems.length === 1 ? 's' : ''} to be assigned to warehouse locations
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {unassignedItems.slice(0, 3).map((item) => (
              <div key={item.order_id} style={{
                padding: 12,
                background: 'var(--gray-50)',
                borderRadius: 6,
                border: '1px solid var(--warning-400)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: 4 }}>{item.po}</div>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    {item.customer}
                  </div>
                  <div className="muted" style={{ fontSize: '11px', marginTop: 2 }}>
                    {item.weight ? `${item.weight}kg` : 'N/A'} • {item.dimensions || 'No dims'}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedItem(item)
                    setShowAssignForm(true)
                  }}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Assign
                </button>
              </div>
            ))}
          </div>

          {unassignedItems.length > 3 && (
            <div className="muted" style={{ marginTop: 8, fontSize: '12px' }}>
              ...and {unassignedItems.length - 3} more packages awaiting assignment
            </div>
          )}
        </div>
      )}

      {loading && <div className="card" style={{ padding: 16 }}>Loading inventory…</div>}
      {error && <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 12 }}>
          {inventoryItems.map((item) => (
            <div
              key={item.inventory_id}
              className="card"
              style={{ padding: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 4 }}>{item.po}</h4>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    Inventory ID: {item.inventory_id}
                  </div>
                </div>
                <span className={getStatusBadgeClass(item.order_status)}>
                  {item.order_status}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="label">Customer</div>
                <div>{item.customer}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="label">Warehouse</div>
                <div>{item.warehouse}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="label">Storage Location</div>
                <div style={{
                  padding: 8,
                  background: 'var(--gray-50)',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  📍 {item.location}
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
                <div>
                  <div className="label">Weight</div>
                  <div style={{ fontSize: '14px' }}>{item.weight ? `${item.weight}kg` : 'N/A'}</div>
                </div>
                <div>
                  <div className="label">Dimensions</div>
                  <div style={{ fontSize: '14px' }}>{item.dimensions || 'N/A'}</div>
                </div>
                <div>
                  <div className="label">Distance</div>
                  <div style={{ fontSize: '14px' }}>{item.distance ? `${item.distance}km` : 'N/A'}</div>
                </div>
              </div>

              <div className="muted" style={{ fontSize: '12px', marginBottom: 12 }}>
                Order Date: {new Date(item.order_date).toLocaleDateString()}
              </div>

              <button
                className="btn btn-outline"
                onClick={() => {
                  const newLocation = prompt('Enter new storage location:', item.location)
                  if (newLocation && newLocation !== item.location) {
                    handleUpdateLocation(item.inventory_id, newLocation)
                  }
                }}
                style={{ width: '100%', fontSize: '12px' }}
              >
                📝 Update Location
              </button>
            </div>
          ))}

          {inventoryItems.length === 0 && (
            <div className="card" style={{ padding: 16, gridColumn: '1 / -1', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>📦</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No packages in storage</h3>
              <p className="muted">Packages will appear here once they are assigned to warehouse locations.</p>
            </div>
          )}
        </div>
      )}

      {/* Assign Item Form */}
      {showAssignForm && selectedItem && (
        <AssignItemForm
          item={selectedItem}
          warehouses={warehouses}
          onSubmit={handleAssignItem}
          onCancel={() => {
            setShowAssignForm(false)
            setSelectedItem(null)
          }}
          assigning={assigning}
        />
      )}
    </div>
  )
}

function AssignItemForm({ item, warehouses, onSubmit, onCancel, assigning }) {
  const [formData, setFormData] = useState({
    order_id: item.order_id,
    warehouse_id: '',
    location_in_warehouse: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.warehouse_id || !formData.location_in_warehouse.trim()) return
    onSubmit(formData)
  }

  return (
    <div className="card" style={{ padding: 16, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '90%', maxWidth: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginTop: 0 }}>Assign Package to Warehouse</h3>

      <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 4, marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold' }}>{item.po}</div>
        <div className="muted" style={{ fontSize: '12px' }}>
          {item.customer} • {item.weight ? `${item.weight}kg` : 'N/A'} • {item.dimensions || 'No dimensions'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
        <label>
          <div className="label">Select Warehouse *</div>
          <select
            className="input"
            value={formData.warehouse_id}
            onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: e.target.value }))}
            required
          >
            <option value="">Choose warehouse...</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.inventory_count} items)
              </option>
            ))}
          </select>
        </label>

        <label>
          <div className="label">Storage Location *</div>
          <input
            type="text"
            className="input"
            placeholder="e.g., Section A, Shelf 1-B"
            value={formData.location_in_warehouse}
            onChange={(e) => setFormData(prev => ({ ...prev, location_in_warehouse: e.target.value }))}
            required
          />
          <div className="muted" style={{ fontSize: '12px', marginTop: 4 }}>
            Specify the exact location within the warehouse (shelf, rack, bay, etc.)
          </div>
        </label>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={assigning}
          >
            {assigning ? 'Assigning...' : 'Assign Package to Warehouse'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={assigning}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}