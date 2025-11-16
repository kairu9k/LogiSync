import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch } from '../../lib/api'
import Toast from '../../components/Toast'

export default function WarehouseInventory() {
  const { id } = useParams()
  const [warehouse, setWarehouse] = useState(null)
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingLocationId, setEditingLocationId] = useState(null)
  const [newLocation, setNewLocation] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
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

  async function fetchWarehouseInventory() {
    setLoading(true)
    setError('')
    try {
      const warehouseRes = await apiGet(`/api/warehouses/${id}`)
      setWarehouse(warehouseRes?.data || null)

      const inventoryRes = await apiGet(`/api/inventory?warehouse_id=${id}&limit=200` + (search ? `&search=${search}` : ''))

      // Ensure inventoryRes.data is always an array
      let items = Array.isArray(inventoryRes?.data) ? inventoryRes.data : []

      // Client-side filtering if search is provided
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim()
        items = items.filter(item => {
          return (
            item.po?.toLowerCase().includes(searchLower) ||
            item.customer?.toLowerCase().includes(searchLower) ||
            item.location?.toLowerCase().includes(searchLower) ||
            item.order_status?.toLowerCase().includes(searchLower)
          )
        })
      }

      setInventoryItems(items)
    } catch (e) {
      setError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouseInventory()
  }, [id, search])

  const handleUpdateLocation = async (inventoryId, newLocationValue) => {
    try {
      await apiPatch(`/api/inventory/${inventoryId}`, {
        location_in_warehouse: newLocationValue
      })
      setToast({ show: true, message: 'Storage location updated successfully', type: 'success' })
      setEditingLocationId(null)
      setNewLocation('')
      await fetchWarehouseInventory()
    } catch (e) {
      setToast({ show: true, message: e.message || 'Failed to update location', type: 'error' })
    }
  }

  const startEditingLocation = (inventoryId, currentLocation) => {
    setEditingLocationId(inventoryId)
    setNewLocation(currentLocation)
  }

  const cancelEditingLocation = () => {
    setEditingLocationId(null)
    setNewLocation('')
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
            <button
              onClick={() => navigate('/app/warehouses')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              ← Back to Warehouses
            </button>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              📦 {warehouse?.name || 'Warehouse'} Inventory
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              {warehouse?.address || 'Loading warehouse details...'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '4px' }}>
              Total Items
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'white' }}>
              {Array.isArray(inventoryItems) ? inventoryItems.length : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
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
            border: '2px solid rgba(59, 130, 246, 0.3)',
            fontSize: '15px',
            padding: '14px 14px 14px 48px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
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
          {Array.isArray(inventoryItems) && inventoryItems.map((item) => (
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
              {/* Header: PO and Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: '500' }}>
                    Purchase Order
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#3b82f6',
                    fontFamily: 'monospace',
                    marginBottom: '6px'
                  }}>
                    {item.po}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    ID: {item.inventory_id}
                  </div>
                </div>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: item.order_status === 'fulfilled' ? 'rgba(16, 185, 129, 0.2)' :
                              item.order_status === 'shipped' ? 'rgba(59, 130, 246, 0.2)' :
                              item.order_status === 'processing' ? 'rgba(139, 92, 246, 0.2)' :
                              'rgba(245, 158, 11, 0.2)',
                  color: item.order_status === 'fulfilled' ? '#10b981' :
                         item.order_status === 'shipped' ? '#3b82f6' :
                         item.order_status === 'processing' ? '#8b5cf6' :
                         '#f59e0b',
                  border: `1px solid ${item.order_status === 'fulfilled' ? 'rgba(16, 185, 129, 0.3)' :
                                       item.order_status === 'shipped' ? 'rgba(59, 130, 246, 0.3)' :
                                       item.order_status === 'processing' ? 'rgba(139, 92, 246, 0.3)' :
                                       'rgba(245, 158, 11, 0.3)'}`,
                  textTransform: 'uppercase'
                }}>
                  {item.order_status === 'fulfilled' ? 'Ready to Ship' : item.order_status}
                </span>
              </div>

              {/* Customer */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: '500' }}>
                  Customer
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '15px', fontWeight: '600' }}>
                  👤 {item.customer}
                </div>
              </div>

              {/* Storage Location - Emphasized with Inline Editing */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '6px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  📍 Storage Location
                  {editingLocationId !== item.inventory_id && (
                    <span style={{
                      fontSize: '10px',
                      color: 'rgba(59, 130, 246, 0.6)',
                      fontStyle: 'italic',
                      fontWeight: '400'
                    }}>
                      (click to edit)
                    </span>
                  )}
                </div>
                {editingLocationId === item.inventory_id ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '2px solid rgba(59, 130, 246, 0.6)',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: '#3b82f6',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLocation.trim()) {
                          handleUpdateLocation(item.inventory_id, newLocation)
                        } else if (e.key === 'Escape') {
                          cancelEditingLocation()
                        }
                      }}
                    />
                    <button
                      onClick={() => handleUpdateLocation(item.inventory_id, newLocation)}
                      disabled={!newLocation.trim()}
                      style={{
                        padding: '10px 14px',
                        background: newLocation.trim() ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        color: newLocation.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '14px',
                        cursor: newLocation.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: '600'
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditingLocation}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => startEditingLocation(item.inventory_id, item.location)}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '2px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '10px',
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      color: '#3b82f6',
                      fontWeight: '700',
                      textAlign: 'center',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)'
                      const icon = e.currentTarget.querySelector('.edit-icon')
                      if (icon) icon.style.opacity = '1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
                      const icon = e.currentTarget.querySelector('.edit-icon')
                      if (icon) icon.style.opacity = '0'
                    }}
                  >
                    <span>{item.location}</span>
                    <span
                      className="edit-icon"
                      style={{
                        fontSize: '12px',
                        opacity: '0',
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      ✏️
                    </span>
                  </div>
                )}
              </div>

              {/* Package Type Badge - Critical for warehouse staff */}
              {item.package_type && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: item.package_type.toLowerCase() === 'fragile' ? 'rgba(239, 68, 68, 0.2)' :
                               item.package_type.toLowerCase() === 'hazardous' ? 'rgba(245, 158, 11, 0.2)' :
                               item.package_type.toLowerCase() === 'perishable' ? 'rgba(34, 197, 94, 0.2)' :
                               item.package_type.toLowerCase() === 'valuable' ? 'rgba(168, 85, 247, 0.2)' :
                               'rgba(59, 130, 246, 0.2)',
                    color: item.package_type.toLowerCase() === 'fragile' ? '#ef4444' :
                          item.package_type.toLowerCase() === 'hazardous' ? '#f59e0b' :
                          item.package_type.toLowerCase() === 'perishable' ? '#22c55e' :
                          item.package_type.toLowerCase() === 'valuable' ? '#a855f7' :
                          '#3b82f6',
                    border: `2px solid ${item.package_type.toLowerCase() === 'fragile' ? 'rgba(239, 68, 68, 0.4)' :
                                        item.package_type.toLowerCase() === 'hazardous' ? 'rgba(245, 158, 11, 0.4)' :
                                        item.package_type.toLowerCase() === 'perishable' ? 'rgba(34, 197, 94, 0.4)' :
                                        item.package_type.toLowerCase() === 'valuable' ? 'rgba(168, 85, 247, 0.4)' :
                                        'rgba(59, 130, 246, 0.4)'}`
                  }}>
                    {item.package_type.toLowerCase() === 'fragile' ? '⚠️ ' :
                     item.package_type.toLowerCase() === 'hazardous' ? '☢️ ' :
                     item.package_type.toLowerCase() === 'perishable' ? '❄️ ' :
                     item.package_type.toLowerCase() === 'valuable' ? '💎 ' :
                     '📦 '}
                    {item.package_type}
                  </div>
                </div>
              )}

              {/* Quick Package Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: 16,
                paddingTop: 12,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Weight</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6' }}>
                    {item.weight ? `${item.weight}kg` : 'N/A'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Dimensions</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#22c55e' }}>
                    {parseDimensions(item.dimensions)}
                  </div>
                </div>
              </div>

              {/* Order Date */}
              <div style={{
                fontSize: '12px',
                marginBottom: 16,
                color: 'rgba(255, 255, 255, 0.5)',
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                📅 {new Date(item.order_date).toLocaleDateString()}
              </div>

              {/* Action Button */}
              <button
                onClick={() => navigate(`/app/orders/${item.order_id}`)}
                style={{
                  width: '100%',
                  fontSize: '13px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#8b5cf6',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '8px',
                  fontWeight: '600',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'
                }}
              >
                📄 View Full Order Details
              </button>
            </div>
          ))}

          {(!Array.isArray(inventoryItems) || inventoryItems.length === 0) && (
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
              <h3 style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '20px' }}>No packages in this warehouse</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>Packages will appear here once they are assigned to this warehouse location.</p>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  )
}
