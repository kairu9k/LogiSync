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
    safety_compliance_details: '',
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
      vehicle_id: '',
      vehicle_type: '',
      registration_number: '',
      capacity: '',
      safety_compliance_details: '',
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
      safety_compliance_details: transport.safety_compliance || '',
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
    return <div>Loading transportation...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Transportation Management</h2>
        {can.manageShipments() && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add Vehicle
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="input"
          placeholder="Search by registration number, vehicle type, or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filteredTransports.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-500)' }}>
            No transportation records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Vehicle ID</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Registration</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Capacity</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Driver</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Budget</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Schedule</th>
                  {can.manageShipments() && (
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredTransports.map((transport) => (
                  <tr key={transport.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: 12 }}>{transport.vehicle_id}</td>
                    <td style={{ padding: 12 }}>{transport.vehicle_type}</td>
                    <td style={{ padding: 12 }}>
                      <span className="badge">{transport.registration_number}</span>
                    </td>
                    <td style={{ padding: 12 }}>{transport.capacity}</td>
                    <td style={{ padding: 12 }}>{transport.driver_name}</td>
                    <td style={{ padding: 12 }}>{transport.budget_name}</td>
                    <td style={{ padding: 12 }}>{transport.schedule_name}</td>
                    {can.manageShipments() && (
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button className="btn btn-sm" onClick={() => openEditModal(transport)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(transport.id)}
                          style={{ marginLeft: 8 }}
                        >
                          Delete
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
                  <div className="label">Vehicle ID *</div>
                  <input
                    className="input"
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    placeholder="e.g. VEH-001"
                    required
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                <label>
                  <div className="label">Safety Compliance</div>
                  <input
                    className="input"
                    value={formData.safety_compliance_details}
                    onChange={(e) => setFormData({ ...formData, safety_compliance_details: e.target.value })}
                    placeholder="e.g. All checks passed"
                  />
                </label>
              </div>

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
