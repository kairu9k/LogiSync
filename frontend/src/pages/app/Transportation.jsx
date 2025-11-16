import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
import { can } from '../../lib/permissions'
import Toast from '../../components/Toast'

export default function Transportation() {
  const [transports, setTransports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_type: '',
    registration_number: '',
    capacity: '',
    volume_capacity: '',
    safety_compliance: false
  })

  useEffect(() => {
    loadTransports()
  }, [])

  async function loadTransports() {
    try {
      const res = await apiGet('/api/transport')
      setTransports(res?.data || [])
    } catch (e) {
      console.error('Failed to load transports:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransports = transports.filter(t =>
    t.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.vehicle_type?.toLowerCase().includes(search.toLowerCase()) ||
    t.driver_name?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      vehicle_id: `VEH-${Date.now().toString().slice(-6)}`, // Auto-generate
      vehicle_type: '',
      registration_number: '',
      capacity: '',
      volume_capacity: '',
      safety_compliance: false
    })
    setShowModal(true)
  }

  const openEditModal = (transport) => {
    setEditingId(transport.id)
    setFormData({
      vehicle_id: transport.vehicle_id,
      vehicle_type: transport.vehicle_type,
      registration_number: transport.registration_number,
      capacity: transport.capacity,
      volume_capacity: transport.volume_capacity || '',
      safety_compliance: Boolean(transport.safety_compliance)
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingId) {
        await apiPatch(`/api/transport/${editingId}`, formData)
        setToast({ message: 'Vehicle updated successfully!', type: 'success' })
      } else {
        await apiPost('/api/transport', formData)
        setToast({ message: 'Vehicle created successfully!', type: 'success' })
      }

      setShowModal(false)
      await loadTransports()
    } catch (err) {
      console.error('Transport save error:', err)
      setToast({ message: err.message || 'Failed to save vehicle', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transport record? This will also remove it from associated shipments.')) return

    try {
      await apiDelete(`/api/transport/${id}`)
      setToast({ message: 'Vehicle deleted successfully!', type: 'success' })
      await loadTransports()
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete vehicle', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: 'var(--gray-500)'
      }}>
        Loading transportation...
      </div>
    )
  }

  return (
    <div>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              🚛 Transportation Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Manage your fleet vehicles and driver assignments
            </p>
          </div>
          {can.manageShipments() && (
            <button
              className="btn btn-primary"
              onClick={openCreateModal}
              style={{
                background: 'white',
                color: '#3b82f6',
                border: 'none',
                padding: '12px 24px',
                fontSize: '15px',
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
              ➕ Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Search Bar with Icon */}
      <div style={{ marginBottom: '24px' }}>
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
            placeholder="Search by registration number, vehicle type, or driver..."
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
              e.target.style.borderColor = '#3b82f6'
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Modern Card Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {filteredTransports.length === 0 ? (
          <div style={{
            padding: '80px 32px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)' }}>No transportation records found.</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>Try adjusting your search or add a new vehicle.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Vehicle ID</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Type</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Registration</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Weight Capacity</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Volume Capacity</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Driver</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Status</th>
                  {can.manageShipments() && (
                    <th style={{
                      padding: '18px 20px',
                      textAlign: 'right',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredTransports.map((transport, index) => (
                  <tr
                    key={transport.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <td style={{
                      padding: '20px',
                      fontWeight: '600',
                      color: '#3b82f6',
                      fontSize: '14px'
                    }}>{transport.vehicle_id}</td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {transport.vehicle_type === 'Truck' && '🚚'}
                        {transport.vehicle_type === 'Van' && '🚐'}
                        {transport.vehicle_type === 'Car' && '🚗'}
                        {transport.vehicle_type === 'Motorcycle' && '🏍️'}
                        {transport.vehicle_type}
                      </span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
                      }}>
                        {transport.registration_number}
                      </span>
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      {transport.capacity} kg
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      {transport.volume_capacity ? `${transport.volume_capacity} m³` : 'N/A'}
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      {transport.driver_name ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: 'rgba(255, 255, 255, 0.95)'
                        }}>
                          <span>👤</span>
                          <span>{transport.driver_name}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                          No driver assigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '20px' }}>
                      {transport.is_on_active_delivery ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                          color: '#92400e',
                          border: '2px solid #fcd34d',
                          boxShadow: '0 2px 8px rgba(252, 211, 77, 0.3)'
                        }}>
                          <span>🚚</span>
                          <span>On Delivery ({transport.active_delivery_count})</span>
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                          color: '#065f46',
                          border: '2px solid #6ee7b7',
                          boxShadow: '0 2px 8px rgba(110, 231, 183, 0.3)'
                        }}>
                          <span>✅</span>
                          <span>Available</span>
                        </span>
                      )}
                    </td>
                    {can.manageShipments() && (
                      <td style={{
                        padding: '20px',
                        textAlign: 'right',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end'
                      }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => openEditModal(transport)}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(transport.id)}
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowModal(false)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              margin: 'auto',
              width: '100%',
              maxWidth: '650px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '32px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Modal Header with Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '28px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '22px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {editingId ? '✏️ Edit Vehicle' : '➕ Add New Vehicle'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              {/* 2x3 Grid Layout (2 columns, 3 rows - vertical) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Row 1 - Column 1 */}
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Vehicle ID (Auto-generated)
                  </div>
                  <input
                    className="input"
                    value={formData.vehicle_id}
                    readOnly
                    disabled
                    style={{
                      background: 'rgba(102, 126, 234, 0.1)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '15px',
                      cursor: 'not-allowed'
                    }}
                  />
                </label>

                {/* Row 1 - Column 2 */}
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Vehicle Type *
                  </div>
                  <select
                    className="input"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px'
                    }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Select type...</option>
                    <option value="Van" style={{ background: '#1f2937', color: 'white' }}>Van</option>
                    <option value="Truck" style={{ background: '#1f2937', color: 'white' }}>Truck</option>
                    <option value="Motorcycle" style={{ background: '#1f2937', color: 'white' }}>Motorcycle</option>
                    <option value="Car" style={{ background: '#1f2937', color: 'white' }}>Car</option>
                  </select>
                </label>

                {/* Row 2 - Column 1 */}
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Registration Number *
                  </div>
                  <input
                    className="input"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="e.g. ABC-1234"
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px'
                    }}
                  />
                </label>

                {/* Row 2 - Column 2 */}
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Weight Capacity (kg) *
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g. 1500"
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '15px'
                    }}
                  />
                </label>

                {/* Row 3 - Column 1 */}
                <div>
                  <label>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#3b82f6',
                      marginBottom: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Volume Capacity (m³) *
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="input"
                      value={formData.volume_capacity}
                      onChange={(e) => setFormData({ ...formData, volume_capacity: e.target.value })}
                      placeholder="e.g. 30"
                      required
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        color: 'white',
                        fontSize: '15px'
                      }}
                    />
                  </label>
                  <div style={{
                    fontSize: '11px',
                    marginTop: '6px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontStyle: 'italic'
                  }}>
                    💡 Van: 10-15 | Truck: 25-35 | Large: 40-60
                  </div>
                </div>

                {/* Row 3 - Column 2 */}
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0)',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    userSelect: 'none'
                  }}>
                    .
                  </div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    height: '54px',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.safety_compliance}
                      onChange={(e) => setFormData({ ...formData, safety_compliance: e.target.checked })}
                      style={{
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                        accentColor: '#3b82f6'
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      ✓ Safety Compliance
                    </span>
                  </label>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 12,
                marginTop: 8,
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: submitting
                      ? 'rgba(102, 126, 234, 0.5)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: submitting ? 'none' : '0 4px 16px rgba(59, 130, 246, 0.4)'
                  }}
                  onMouseOver={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)'
                    }
                  }}
                >
                  {submitting ? '⏳ Processing...' : '✓ Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
