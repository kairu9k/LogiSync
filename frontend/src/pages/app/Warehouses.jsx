import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
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

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [unassignedItems, setUnassignedItems] = useState([])
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

  async function fetchWarehouses(params = {}) {
    setLoading(true)
    setError('')
    try {
      const [warehousesRes, unassignedRes] = await Promise.all([
        apiGet('/api/warehouses' + (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '')),
        apiGet('/api/inventory/unassigned')
      ])
      setWarehouses(warehousesRes?.data || [])
      setStats(warehousesRes?.stats || {})
      setUnassignedItems(unassignedRes?.data || [])
    } catch (e) {
      setError(e.message || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouses({ search })
  }, [search])

  const handleAssignItem = async (orderId, warehouseId, location) => {
    try {
      setAssigning(true)
      await apiPost('/api/inventory/assign', {
        order_id: orderId,
        warehouse_id: warehouseId,
        location_in_warehouse: location || 'A1'
      })
      await fetchWarehouses({ search })
      setShowAssignForm(false)
      setSelectedItem(null)
    } catch (e) {
      alert(e.message || 'Failed to assign item')
    } finally {
      setAssigning(false)
    }
  }

  const handleCreateWarehouse = async (formData) => {
    try {
      setCreating(true)

      // Transform formData to match backend expectations
      const payload = {
        warehouse_name: formData.name,
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }

      await apiPost('/api/warehouses', payload)
      await fetchWarehouses({ search })
      setShowCreateForm(false)
    } catch (e) {
      alert(e.message || 'Failed to create warehouse')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteWarehouse = async (warehouseId, warehouseName) => {
    if (!confirm(`Are you sure you want to delete warehouse "${warehouseName}"?`)) return

    try {
      await apiDelete(`/api/warehouses/${warehouseId}`)
      await fetchWarehouses({ search })
    } catch (e) {
      alert(e.message || 'Failed to delete warehouse')
    }
  }

  function getUtilizationColor(percentage) {
    if (percentage >= 90) return 'var(--danger-600)'
    if (percentage >= 70) return 'var(--warning-600)'
    return 'var(--success-600)'
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
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              🏪 Warehouse & Inventory Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Monitor facilities and manage inventory storage
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
            style={{
              background: 'white',
              color: '#3b82f6',
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
            ➕ Add Warehouse
          </button>
        </div>
      </div>

      {/* Unassigned Packages Section */}
      {unassignedItems.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid rgba(59, 130, 246, 0.3)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📦 Packages Awaiting Storage Assignment
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700'
              }}>
                {unassignedItems.length}
              </span>
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
              These orders need to be assigned to a warehouse for storage
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {unassignedItems.map((item) => (
              <div
                key={item.order_id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Order ID</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{item.po}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Customer</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{item.customer}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Weight</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{item.weight} kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Dimensions</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{parseDimensions(item.dimensions)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Status</div>
                    <span className={getStatusBadgeClass(item.order_status)} style={{ fontSize: '12px' }}>
                      {item.order_status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(item)
                    setShowAssignForm(true)
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  📍 Assign Warehouse
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {stats && Object.keys(stats).length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
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
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
              {stats.total_warehouses || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Total Warehouses</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
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
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px' }}>
              {stats.total_items || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Items in Storage</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
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
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {stats.unassigned_items || unassignedItems.length || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Unassigned Items</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
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
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>
              {stats.warehouses_at_capacity || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>At Capacity</div>
          </div>
        </div>
      )}

      {/* Search */}
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
          type="text"
          placeholder="Search warehouses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 48px',
            fontSize: '15px',
            borderRadius: '12px',
            border: '2px solid var(--border)',
            background: 'var(--surface-50)',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />
      </div>

      {loading && <div className="card" style={{ padding: 24, textAlign: 'center' }}>Loading...</div>}
      {error && <div className="card" style={{ padding: 24, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && warehouses.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: 16 }}>🏪</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: 8 }}>No Warehouses Found</div>
          <div style={{ color: 'var(--muted)', marginBottom: 24 }}>
            {search ? 'Try adjusting your search' : 'Get started by creating your first warehouse'}
          </div>
          {!search && (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              ➕ Add Warehouse
            </button>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {warehouses.map((warehouse) => (
            <div key={warehouse.id}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: 8 }}>
                      🏪 {warehouse.name}
                    </h3>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: 8 }}>
                      📍 {warehouse.location}
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>Capacity</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa' }}>
                          {warehouse.capacity?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>Items Stored</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {warehouse.inventory_count || 0}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '13px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Utilization</span>
                        <span style={{ fontWeight: 'bold', color: 'white' }}>
                          {warehouse.utilization_percentage?.toFixed(1) || 0}%
                        </span>
                      </div>
                      <div style={{
                        height: 8,
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(warehouse.utilization_percentage || 0, 100)}%`,
                          background: warehouse.utilization_percentage >= 90 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' :
                                     warehouse.utilization_percentage >= 70 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                     'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    {warehouse.utilization_percentage >= 90 && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        marginBottom: 12
                      }}>
                        <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '500' }}>
                          ⚠️ Warehouse is near capacity
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 16 }}>
                    <button
                      onClick={() => navigate(`/app/warehouses/${warehouse.id}/inventory`)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '13px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      📦 View Inventory
                    </button>
                    <button
                      onClick={() => handleDeleteWarehouse(warehouse.id, warehouse.name)}
                      disabled={warehouse.inventory_count > 0}
                      title={warehouse.inventory_count > 0 ? 'Cannot delete warehouse with items' : 'Delete warehouse'}
                      style={{
                        padding: '8px 14px',
                        fontSize: '13px',
                        background: warehouse.inventory_count > 0 ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: warehouse.inventory_count > 0 ? 'rgba(255, 255, 255, 0.3)' : 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: warehouse.inventory_count > 0 ? 'not-allowed' : 'pointer',
                        boxShadow: warehouse.inventory_count > 0 ? 'none' : '0 2px 8px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (warehouse.inventory_count === 0) {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (warehouse.inventory_count === 0) {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
                        }
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Assign Item Modal */}
      {showAssignForm && selectedItem && (
        <AssignItemModal
          item={selectedItem}
          warehouses={warehouses}
          onAssign={handleAssignItem}
          onClose={() => {
            setShowAssignForm(false)
            setSelectedItem(null)
          }}
          assigning={assigning}
        />
      )}

      {/* Create Warehouse Form - keeping the existing modal */}
      {showCreateForm && (
        <CreateWarehouseForm
          onSubmit={handleCreateWarehouse}
          onClose={() => setShowCreateForm(false)}
          creating={creating}
        />
      )}

    </div>
  )
}

// Assign Item Modal Component
function AssignItemModal({ item, warehouses, onAssign, onClose, assigning }) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [location, setLocation] = useState('A1')

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
        }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>
            📍 Assign to Warehouse
          </h3>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Selected Order</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>{item.po}</div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>Customer: {item.customer}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px' }}>
              Weight: {item.weight} kg | Dimensions: {item.dimensions ? JSON.parse(item.dimensions).L : 'N/A'} × {item.dimensions ? JSON.parse(item.dimensions).W : 'N/A'} × {item.dimensions ? JSON.parse(item.dimensions).H : 'N/A'} cm
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Warehouse *
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
            >
              <option value="" style={{ background: '#1f2937', color: 'white' }}>Choose a warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} style={{ background: '#1f2937', color: 'white' }}>
                  {w.name} - {w.location} ({w.inventory_count}/{w.capacity} items)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Storage Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., A1, B2, C3"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={assigning}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: assigning ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onAssign(item.order_id, selectedWarehouse, location)}
            disabled={!selectedWarehouse || assigning}
            style={{
              padding: '12px 32px',
              borderRadius: '10px',
              border: 'none',
              background: (!selectedWarehouse || assigning)
                ? 'rgba(59, 130, 246, 0.5)'
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: (!selectedWarehouse || assigning) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: (!selectedWarehouse || assigning) ? 'none' : '0 4px 16px rgba(59, 130, 246, 0.4)'
            }}
          >
            {assigning ? '⏳ Assigning...' : '✓ Assign Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Warehouse Form Component (keeping existing implementation)
function CreateWarehouseForm({ onSubmit, onClose, creating }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '',
    latitude: '',
    longitude: ''
  })

  const [showMap, setShowMap] = useState(true) // Auto-show map for location selection
  const [mapPosition, setMapPosition] = useState([7.1907, 125.4553]) // Davao City default

  function LocationMarker() {
    useMapEvents({
      async click(e) {
        const lat = e.latlng.lat
        const lng = e.latlng.lng

        setMapPosition([lat, lng])

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          )
          const data = await response.json()

          // Use display_name or construct address from components
          const address = data.display_name ||
                         `${data.address?.city || data.address?.town || data.address?.municipality || ''}, ${data.address?.country || ''}`

          setFormData(prev => ({
            ...prev,
            location: address,
            latitude: lat.toString(),
            longitude: lng.toString()
          }))
        } catch (error) {
          console.error('Reverse geocoding failed:', error)
          // Still set coordinates even if geocoding fails
          setFormData(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString()
          }))
        }
      },
    })

    return formData.latitude && formData.longitude ? (
      <Marker position={[Number(formData.latitude), Number(formData.longitude)]} />
    ) : null
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate that location has been set
    if (!formData.location || !formData.latitude || !formData.longitude) {
      alert('Please click on the map to set warehouse location')
      return
    }

    onSubmit(formData)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
        }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>
            ➕ Create New Warehouse
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Warehouse Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Main Distribution Center"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Capacity (items) *
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
                min="1"
                placeholder="e.g., 1000"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Location * {formData.location && <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontWeight: '400', textTransform: 'none' }}>- {formData.location}</span>}
              </label>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: showMap ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  color: showMap ? '#ef4444' : '#3b82f6',
                  border: showMap ? '2px solid rgba(239, 68, 68, 0.3)' : '2px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {showMap ? '🗺️ Hide Map' : '📍 Set Coordinates'}
              </button>
            </div>

            {showMap && (
              <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(59, 130, 246, 0.3)' }}>
                <MapContainer
                  center={mapPosition}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationMarker />
                </MapContainer>
              </div>
            )}

            {formData.latitude && formData.longitude && (
              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                📍 Coordinates: {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
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
              {creating ? '⏳ Creating...' : '✓ Create Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
