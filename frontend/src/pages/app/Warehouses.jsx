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
  const navigate = useNavigate()

  async function fetchWarehouses(params = {}) {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/warehouses' +
        (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''))
      setWarehouses(res?.data || [])
      setStats(res?.stats || {})
    } catch (e) {
      setError(e.message || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouses({ search })
  }, [search])

  const handleCreateWarehouse = async (formData) => {
    try {
      setCreating(true)
      await apiPost('/api/warehouses', formData)
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

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              🏪 Warehouse Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Monitor and manage your warehouse facilities
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/app/inventory')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '10px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              📦 View Inventory
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
              style={{
                background: 'white',
                color: '#2563eb',
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
      </div>

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
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
              {Math.round(stats.average_utilization || 0)}%
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Avg Utilization</div>
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
              {stats.warehouses_at_capacity || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Near Capacity</div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '500px' }}>
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
          className="input"
          placeholder="Search warehouses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            e.target.style.borderColor = '#4facfe'
            e.target.style.boxShadow = '0 0 0 3px rgba(79, 172, 254, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        />
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
          Loading warehouses…
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
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 8, color: 'rgba(255, 255, 255, 0.95)', fontSize: '20px' }}>
                    🏪 {warehouse.name}
                  </h3>
                  <div style={{ fontSize: '14px', marginBottom: 16, color: 'rgba(255, 255, 255, 0.6)' }}>
                    📍 {warehouse.location}
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', fontWeight: '500' }}>Items Stored</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#3b82f6' }}>
                        📦 {warehouse.inventory_count}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', fontWeight: '500' }}>Available Space</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#60a5fa' }}>
                        📐 {warehouse.available_space}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: '500' }}>Utilization</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1,
                        height: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(warehouse.utilization_percentage, 100)}%`,
                          height: '100%',
                          background: warehouse.utilization_percentage >= 90 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' :
                                     warehouse.utilization_percentage >= 70 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                     'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: warehouse.utilization_percentage >= 90 ? '#ef4444' :
                               warehouse.utilization_percentage >= 70 ? '#f59e0b' : '#10b981',
                        minWidth: '45px',
                        textAlign: 'right'
                      }}>
                        {warehouse.utilization_percentage}%
                      </span>
                    </div>
                  </div>

                  {warehouse.status === 'near_capacity' && (
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500' }}>
                        ⚠️ Warehouse is near capacity
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 16 }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate(`/app/warehouses/${warehouse.id}`)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
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
                    👁️ View
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteWarehouse(warehouse.id, warehouse.name)}
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
                    disabled={warehouse.inventory_count > 0}
                    title={warehouse.inventory_count > 0 ? 'Cannot delete warehouse with items' : 'Delete warehouse'}
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
          ))}

          {warehouses.length === 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '60px 32px',
              gridColumn: '1 / -1',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '64px', marginBottom: 20 }}>🏪</div>
              <h3 style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '20px' }}>No warehouses found</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>Create your first warehouse to start managing inventory.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Warehouse Form */}
      {showCreateForm && (
        <CreateWarehouseForm
          onSubmit={handleCreateWarehouse}
          onCancel={() => setShowCreateForm(false)}
          creating={creating}
        />
      )}
    </div>
  )
}

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })
  return position ? <Marker position={position} /> : null
}

function CreateWarehouseForm({ onSubmit, onCancel, creating }) {
  const [formData, setFormData] = useState({
    warehouse_name: '',
    location: ''
  })
  // Default to Davao City, Philippines
  const [mapPosition, setMapPosition] = useState([7.1907, 125.4553])
  const [addressLoading, setAddressLoading] = useState(false)

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoords = async (lat, lng) => {
    setAddressLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      )
      const data = await response.json()
      if (data.display_name) {
        setFormData(prev => ({ ...prev, location: data.display_name }))
      }
    } catch (error) {
      console.error('Error fetching address:', error)
    } finally {
      setAddressLoading(false)
    }
  }

  // Update address when map position changes
  useEffect(() => {
    if (mapPosition) {
      getAddressFromCoords(mapPosition[0], mapPosition[1])
    }
  }, [mapPosition])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.warehouse_name.trim() || !formData.location.trim()) return

    // Include coordinates in the submission
    const dataWithCoords = {
      ...formData,
      latitude: mapPosition[0],
      longitude: mapPosition[1]
    }
    onSubmit(dataWithCoords)
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Create New Warehouse</h3>
      <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
        <label>
          <div className="label">Warehouse Name *</div>
          <input
            type="text"
            className="input"
            placeholder="e.g., Main Distribution Center"
            value={formData.warehouse_name}
            onChange={(e) => setFormData(prev => ({ ...prev, warehouse_name: e.target.value }))}
            required
          />
        </label>

        <div>
          <div className="label">Location * (Click on map to set location)</div>
          <div style={{
            height: '400px',
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--gray-200)',
            marginBottom: '8px'
          }}>
            <MapContainer
              center={mapPosition}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker position={mapPosition} setPosition={setMapPosition} />
            </MapContainer>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
            📍 Coordinates: {mapPosition[0].toFixed(6)}, {mapPosition[1].toFixed(6)}
          </div>
        </div>

        <label>
          <div className="label">Address {addressLoading && '(Loading...)'}</div>
          <textarea
            className="input"
            placeholder="Address will be auto-filled from map location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            rows="3"
            required
          />
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '4px' }}>
            💡 Tip: You can edit the address manually if needed
          </div>
        </label>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Warehouse'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}