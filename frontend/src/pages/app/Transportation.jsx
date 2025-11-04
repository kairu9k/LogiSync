import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
import { can } from '../../lib/permissions'

export default function Transportation() {
  const [transports, setTransports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Dropdown data
  const [drivers, setDrivers] = useState([])
  const [budgets, setBudgets] = useState([])
  const [schedules, setSchedules] = useState([])

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_type: '',
    registration_number: '',
    capacity: '',
    safety_compliance: false,
    driver_id: '',
    budget_id: '',
    schedule_id: ''
  })

  useEffect(() => {
    loadTransports()
    loadHelperData()
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

  async function loadHelperData() {
    try {
      const [driversRes, budgetsRes, schedulesRes] = await Promise.all([
        apiGet('/api/transport/helpers/drivers'),
        apiGet('/api/transport/helpers/budgets'),
        apiGet('/api/transport/helpers/schedules')
      ])
      console.log('Loaded drivers:', driversRes?.data)
      console.log('Loaded budgets:', budgetsRes?.data)
      console.log('Loaded schedules:', schedulesRes?.data)
      setDrivers(driversRes?.data || [])
      setBudgets(budgetsRes?.data || [])
      setSchedules(schedulesRes?.data || [])
    } catch (e) {
      console.error('Failed to load helper data:', e)
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
      safety_compliance: false,
      driver_id: '',
      budget_id: '',
      schedule_id: ''
    })
    console.log('Opening create modal. Drivers available:', drivers.length, 'Budgets available:', budgets.length, 'Schedules available:', schedules.length)
    setShowModal(true)
  }

  const openEditModal = (transport) => {
    setEditingId(transport.id)
    setFormData({
      vehicle_id: transport.vehicle_id,
      vehicle_type: transport.vehicle_type,
      registration_number: transport.registration_number,
      capacity: transport.capacity,
      safety_compliance: Boolean(transport.safety_compliance),
      driver_id: String(transport.driver_id),
      budget_id: String(transport.budget_id || ''),
      schedule_id: String(transport.schedule_id || '')
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    console.log('handleSubmit called!')
    e.preventDefault()
    console.log('Form data before submit:', formData)
    setSubmitting(true)

    try {
      const payload = {
        ...formData,
        driver_id: parseInt(formData.driver_id),
        budget_id: parseInt(formData.budget_id),
        schedule_id: parseInt(formData.schedule_id)
      }

      console.log('Submitting transport payload:', payload)

      if (editingId) {
        const result = await apiPatch(`/api/transport/${editingId}`, payload)
        console.log('Update result:', result)
      } else {
        const result = await apiPost('/api/transport', payload)
        console.log('Create result:', result)
      }

      setShowModal(false)
      await loadTransports()
    } catch (err) {
      console.error('Transport save error:', err)
      alert(err.message || 'Failed to save transport')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transport record? This will also remove it from associated shipments.')) return

    try {
      await apiDelete(`/api/transport/${id}`)
      await loadTransports()
    } catch (err) {
      alert(err.message || 'Failed to delete transport')
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.2)'
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
                color: '#667eea',
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
              e.target.style.borderColor = '#667eea'
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
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
                  }}>Capacity</th>
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
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Budget</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Schedule</th>
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
                      color: '#667eea',
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
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)'
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
                      {transport.capacity}
                    </td>
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
                        👤 {transport.driver_name}
                      </span>
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
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {transport.budget_name}
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {transport.schedule_name}
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
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto', margin: 'auto', width: '100%', maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div className="label">Vehicle ID (Auto-generated)</div>
                  <input
                    className="input"
                    value={formData.vehicle_id}
                    readOnly
                    disabled
                    style={{ backgroundColor: 'var(--gray-100)', cursor: 'not-allowed' }}
                  />
                </label>
                <label>
                  <div className="label">Vehicle Type *</div>
                  <select
                    className="input"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    required
                  >
                    <option value="">Select type...</option>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Car">Car</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div className="label">Registration Number *</div>
                  <input
                    className="input"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="e.g. ABC-1234"
                    required
                  />
                </label>
                <label>
                  <div className="label">Capacity *</div>
                  <input
                    className="input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g. 1500 kg"
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div className="label">Driver *</div>
                  <select
                    className="input"
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    required
                  >
                    <option value="">Select driver...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.username} ({d.email})</option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="label">Budget *</div>
                  <select
                    className="input"
                    value={formData.budget_id}
                    onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                    required
                  >
                    <option value="">Select budget...</option>
                    {budgets.map(b => (
                      <option key={b.id} value={b.id}>{b.budget_name} (₱{b.total_budget.toLocaleString()})</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <div className="label">Schedule *</div>
                <select
                  className="input"
                  value={formData.schedule_id}
                  onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
                  required
                >
                  <option value="">Select schedule...</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.schedule_name} ({new Date(s.start_time).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.safety_compliance}
                  onChange={(e) => setFormData({ ...formData, safety_compliance: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span className="label" style={{ marginBottom: 0 }}>Safety Compliance Verified</span>
              </label>

              <div className="form-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={(e) => {
                    console.log('Button clicked directly!');
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
