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

  const parseDimensions = (dimStr) => {
    if (!dimStr) return 'N/A'
    try {
      const dims = typeof dimStr === 'string' ? JSON.parse(dimStr) : dimStr
      return `${dims.L} × ${dims.W} × ${dims.H} cm`
    } catch (e) {
      return dimStr
    }
  }

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
    <div className="grid" style={{ gap: 24 }}>
        {/* Header Section with Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                📦 Inventory Management
              </h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
                Track and manage warehouse inventory items
              </p>
            </div>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/app/warehouses')}
              style={{
                background: 'white',
                color: '#10b981',
                border: 'none',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              🏪 Manage Warehouses
            </button>
          </div>
        </div>

      {/* Filters */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
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
            placeholder="Search packages, orders, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: '48px',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              fontSize: '15px',
              padding: '14px 14px 14px 48px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981'
              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#10b981'
            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="all">Order Status: All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="shipped">Shipped</option>
        </select>
        <select
          className="input"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          style={{
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#10b981'
            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="all">Warehouse: All</option>
          {warehouses.map(warehouse => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      {/* Assign Package Form - Shown at top when there are unassigned items */}
      {unassignedItems.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ marginTop: 0, color: '#f59e0b', fontSize: '20px', marginBottom: '8px' }}>
                📋 Packages Awaiting Storage Assignment
              </h3>
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.8)' }}>
                {unassignedItems.length} package{unassignedItems.length !== 1 ? 's' : ''} need{unassignedItems.length === 1 ? 's' : ''} to be assigned to warehouse locations
              </div>
            </div>
            {!showAssignForm && (
              <button
                onClick={() => {
                  setSelectedItem(unassignedItems[0])
                  setShowAssignForm(true)
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '15px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                ✨ Assign Packages
              </button>
            )}
          </div>

          {/* Assignment Form - Shown inline at top */}
          {showAssignForm && selectedItem && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(5px)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: 20,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: 16, color: 'rgba(255, 255, 255, 0.95)', fontSize: '16px' }}>
                Assign Package to Warehouse
              </h4>

              <div style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                marginBottom: 16,
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: 4, color: 'rgba(255, 255, 255, 0.95)' }}>
                  📦 {selectedItem.po}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {selectedItem.customer} • {selectedItem.weight ? `${selectedItem.weight}kg` : 'N/A'} • {parseDimensions(selectedItem.dimensions)}
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                await handleAssignItem({
                  order_id: selectedItem.order_id,
                  warehouse_id: formData.get('warehouse_id'),
                  location_in_warehouse: formData.get('location_in_warehouse')
                })
              }} className="grid" style={{ gap: 14 }}>
                <label>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: 6, fontWeight: '600' }}>
                    Select Warehouse *
                  </div>
                  <select
                    name="warehouse_id"
                    className="input"
                    required
                    style={{
                      borderRadius: '8px',
                      border: '2px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '14px',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      transition: 'all 0.3s ease'
                    }}
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
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: 6, fontWeight: '600' }}>
                    Storage Location *
                  </div>
                  <input
                    type="text"
                    name="location_in_warehouse"
                    className="input"
                    placeholder="e.g., Section A, Shelf 1-B"
                    required
                    style={{
                      borderRadius: '8px',
                      border: '2px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '14px',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, fontStyle: 'italic' }}>
                    Specify the exact location within the warehouse (shelf, rack, bay, etc.)
                  </div>
                </label>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button
                    type="submit"
                    disabled={assigning}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      fontSize: '14px',
                      background: assigning ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s ease',
                      cursor: assigning ? 'not-allowed' : 'pointer'
                    }}
                    onMouseOver={(e) => {
                      if (!assigning) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!assigning) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }
                    }}
                  >
                    {assigning ? 'Assigning...' : '✓ Assign Package to Warehouse'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignForm(false)
                      setSelectedItem(null)
                    }}
                    disabled={assigning}
                    style={{
                      padding: '12px 20px',
                      fontSize: '14px',
                      background: 'rgba(100, 116, 139, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      cursor: assigning ? 'not-allowed' : 'pointer'
                    }}
                    onMouseOver={(e) => {
                      if (!assigning) {
                        e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!assigning) {
                        e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Unassigned Items List */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {unassignedItems.map((item) => (
              <div key={item.order_id} style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: selectedItem?.order_id === item.order_id ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                opacity: selectedItem?.order_id === item.order_id ? 1 : 0.8
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: 6, color: 'rgba(255, 255, 255, 0.95)' }}>
                    📦 {item.po}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                    {item.customer}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {item.weight ? `${item.weight}kg` : 'N/A'} • {parseDimensions(item.dimensions)}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedItem(item)
                    setShowAssignForm(true)
                  }}
                  disabled={selectedItem?.order_id === item.order_id}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    background: selectedItem?.order_id === item.order_id
                      ? 'rgba(245, 158, 11, 0.5)'
                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.2s ease',
                    cursor: selectedItem?.order_id === item.order_id ? 'default' : 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (selectedItem?.order_id !== item.order_id) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedItem?.order_id !== item.order_id) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }
                  }}
                >
                  {selectedItem?.order_id === item.order_id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
          Loading inventory…
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
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
          {inventoryItems.map((item) => (
            <div
              key={item.inventory_id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 6, color: 'rgba(255, 255, 255, 0.95)', fontSize: '18px' }}>
                    📦 {item.po}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    ID: {item.inventory_id}
                  </div>
                </div>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: item.order_status === 'fulfilled' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                              item.order_status === 'shipped' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                              item.order_status === 'processing' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                              'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}>
                  {item.order_status}
                </span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', fontWeight: '500' }}>Customer</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>👤 {item.customer}</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', fontWeight: '500' }}>Warehouse</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>🏪 {item.warehouse}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '6px', fontWeight: '500' }}>Storage Location</div>
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  📍 {item.location}
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>Weight</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                    ⚖️ {item.weight ? `${item.weight}kg` : 'N/A'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>Dimensions</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                    📏 {parseDimensions(item.dimensions)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', marginBottom: 14, color: 'rgba(255, 255, 255, 0.6)' }}>
                📅 Order Date: {new Date(item.order_date).toLocaleDateString()}
              </div>

              <button
                className="btn btn-outline"
                onClick={() => {
                  const newLocation = prompt('Enter new storage location:', item.location)
                  if (newLocation && newLocation !== item.location) {
                    handleUpdateLocation(item.inventory_id, newLocation)
                  }
                }}
                style={{
                  width: '100%',
                  fontSize: '13px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  padding: '10px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                📝 Update Location
              </button>
            </div>
          ))}

          {inventoryItems.length === 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '60px 32px',
              gridColumn: '1 / -1',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '64px', marginBottom: 20 }}>📦</div>
              <h3 style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '20px' }}>No packages in storage</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>Packages will appear here once they are assigned to warehouse locations.</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}