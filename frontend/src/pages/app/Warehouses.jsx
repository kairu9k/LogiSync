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
    <div className="grid" style={{ gap: 16 }}>
      {/* Stats Overview */}
      {stats && Object.keys(stats).length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
              {stats.total_warehouses || 0}
            </div>
            <div className="muted">Total Warehouses</div>
          </div>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-600)' }}>
              {stats.total_items || 0}
            </div>
            <div className="muted">Items in Storage</div>
          </div>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-600)' }}>
              {Math.round(stats.average_utilization || 0)}%
            </div>
            <div className="muted">Avg Utilization</div>
          </div>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-600)' }}>
              {stats.warehouses_at_capacity || 0}
            </div>
            <div className="muted">Near Capacity</div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Warehouse Management</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/app/inventory')}
            >
              📦 View Inventory
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              + Add Warehouse
            </button>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <input
            className="input"
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 16 }}>Loading warehouses…</div>}
      {error && <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="card"
              style={{ padding: 16, position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>{warehouse.name}</h3>
                  <div className="muted" style={{ fontSize: '14px', marginBottom: 12 }}>
                    📍 {warehouse.location}
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div className="label">Items Stored</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {warehouse.inventory_count}
                      </div>
                    </div>
                    <div>
                      <div className="label">Available Space</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {warehouse.available_space}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="label">Utilization</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1,
                        height: 8,
                        backgroundColor: 'var(--gray-200)',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(warehouse.utilization_percentage, 100)}%`,
                          height: '100%',
                          backgroundColor: getUtilizationColor(warehouse.utilization_percentage),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: getUtilizationColor(warehouse.utilization_percentage)
                      }}>
                        {warehouse.utilization_percentage}%
                      </span>
                    </div>
                  </div>

                  {warehouse.status === 'near_capacity' && (
                    <div style={{
                      padding: 8,
                      backgroundColor: 'var(--warning-50)',
                      border: '1px solid var(--warning-200)',
                      borderRadius: 4,
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: '12px', color: 'var(--warning-800)' }}>
                        ⚠️ Warehouse is near capacity
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate(`/app/warehouses/${warehouse.id}`)}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    View Details
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteWarehouse(warehouse.id, warehouse.name)}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    disabled={warehouse.inventory_count > 0}
                    title={warehouse.inventory_count > 0 ? 'Cannot delete warehouse with items' : 'Delete warehouse'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          {warehouses.length === 0 && (
            <div className="card" style={{ padding: 16, gridColumn: '1 / -1', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>🏪</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No warehouses found</h3>
              <p className="muted">Create your first warehouse to start managing inventory.</p>
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